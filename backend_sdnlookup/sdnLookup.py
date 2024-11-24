from flask import Flask, jsonify, request
from flask_cors import CORS
import xml.etree.ElementTree as ET
import json
import os
import requests
from typing import Dict, List, Optional, Any
import logging
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
XML_FILE_PATH = os.path.abspath('./public/data/sdn.xml')
CACHE_FILE_PATH = os.path.abspath('./public/data/sdn_cache.json')
SDN_URL = 'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.XML'
CACHE_EXPIRY_HOURS = 24

class SDNDataManager:
    @staticmethod
    def calculate_similarity(str1: str, str2: str) -> float:
        """Calculate similarity between two strings."""
        if not str1 or not str2:
            return 0.0
        
        # Convert to lowercase and split into words
        words1 = set(str1.lower().split())
        words2 = set(str2.lower().split())
        
        # Calculate intersection and union
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union) if union else 0.0

    @staticmethod
    def is_cache_valid() -> bool:
        """Check if the cache file is valid and not expired."""
        if not os.path.exists(CACHE_FILE_PATH):
            return False
            
        cache_mtime = datetime.fromtimestamp(os.path.getmtime(CACHE_FILE_PATH))
        age_hours = (datetime.now() - cache_mtime).total_seconds() / 3600
        
        return age_hours < CACHE_EXPIRY_HOURS

    @staticmethod
    def download_sdn_file() -> Dict[str, Any]:
        """Download the SDN XML file with error handling and validation."""
        try:
            logger.info("Downloading SDN file...")
            response = requests.get(SDN_URL, timeout=10)
            response.raise_for_status()

            # Validate XML content
            if not response.content.strip().startswith(b'<?xml'):
                raise ValueError("Downloaded content is not valid XML")

            # Save the file
            os.makedirs(os.path.dirname(XML_FILE_PATH), exist_ok=True)
            with open(XML_FILE_PATH, 'wb') as file:
                file.write(response.content)
            logger.info("SDN file downloaded successfully")

            # Clear cache
            if os.path.exists(CACHE_FILE_PATH):
                os.remove(CACHE_FILE_PATH)
                logger.info("Cache cleared")

            return {"status": "success", "message": "SDN list updated successfully"}
        except requests.Timeout:
            logger.error("Download timeout")
            return {"status": "error", "message": "Download request timed out"}
        except requests.RequestException as e:
            logger.error(f"Download error: {str(e)}")
            return {"status": "error", "message": f"Failed to download: {str(e)}"}
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return {"status": "error", "message": f"Unexpected error: {str(e)}"}

    @staticmethod
    def parse_xml_to_json() -> List[Dict[str, Any]]:
        """Parse XML file to JSON with improved error handling and validation."""
        try:
            logger.info("Parsing XML file...")
            
            if not os.path.exists(XML_FILE_PATH):
                raise FileNotFoundError("SDN XML file not found")

            tree = ET.parse(XML_FILE_PATH)
            root = tree.getroot()

            namespace = ''
            if '}' in root.tag:
                namespace = root.tag.split('}')[0] + '}'

            sdn_entries = []
            for entry in root.findall(f".//{namespace}sdnEntry"):
                sdn_entry = SDNDataManager._parse_entry(entry, namespace)
                if sdn_entry:  # Only add valid entries
                    sdn_entries.append(sdn_entry)

            # Cache the results
            os.makedirs(os.path.dirname(CACHE_FILE_PATH), exist_ok=True)
            with open(CACHE_FILE_PATH, 'w', encoding='utf-8') as cache_file:
                json.dump(sdn_entries, cache_file, ensure_ascii=False, indent=2)
            
            logger.info(f"Successfully parsed {len(sdn_entries)} entries")
            return sdn_entries
        except Exception as e:
            logger.error(f"Error parsing XML: {str(e)}")
            return []

    @staticmethod
    def _parse_entry(entry: ET.Element, namespace: str) -> Optional[Dict[str, Any]]:
        """Parse individual SDN entry with validation."""
        try:
            sdn_entry = {}
            
            # Required fields
            uid = entry.find(f"{namespace}uid")
            if uid is None or not uid.text:
                return None
            sdn_entry['uid'] = uid.text

            # Name fields
            name_parts = []
            for part in ['firstName', 'middleName', 'lastName']:
                elem = entry.find(f"{namespace}{part}")
                if elem is not None and elem.text:
                    name_parts.append(elem.text)
            
            if not name_parts:  # Skip entries without any name parts
                return None
            
            sdn_entry['name'] = " ".join(name_parts).strip()
            
            # Optional fields
            SDNDataManager._add_optional_field(entry, namespace, 'sdnType', sdn_entry, 'type')
            SDNDataManager._parse_aka_list(entry, namespace, sdn_entry)
            SDNDataManager._parse_address_list(entry, namespace, sdn_entry)
            SDNDataManager._parse_id_list(entry, namespace, sdn_entry)
            SDNDataManager._parse_program_list(entry, namespace, sdn_entry)
            SDNDataManager._add_optional_field(entry, namespace, 'remarks', sdn_entry, 'remarks')

            return sdn_entry
        except Exception as e:
            logger.error(f"Error parsing entry: {str(e)}")
            return None

    @staticmethod
    def _add_optional_field(entry: ET.Element, namespace: str, xml_field: str, 
                          sdn_entry: Dict[str, Any], json_field: str) -> None:
        """Add optional field to SDN entry if it exists."""
        elem = entry.find(f"{namespace}{xml_field}")
        if elem is not None and elem.text:
            sdn_entry[json_field] = elem.text.strip()

    @staticmethod
    def _parse_aka_list(entry: ET.Element, namespace: str, sdn_entry: Dict[str, Any]) -> None:
        """Parse AKA names list."""
        aka_list = entry.find(f"{namespace}akaList")
        if aka_list is not None:
            sdn_entry['aka_names'] = [
                aka.find(f"{namespace}lastName").text.strip()
                for aka in aka_list.findall(f"{namespace}aka")
                if aka.find(f"{namespace}lastName") is not None 
                and aka.find(f"{namespace}lastName").text
            ]

    @staticmethod
    def _parse_address_list(entry: ET.Element, namespace: str, sdn_entry: Dict[str, Any]) -> None:
        """Parse address list."""
        address_list = entry.find(f"{namespace}addressList")
        if address_list is not None:
            addresses = []
            for address in address_list.findall(f"{namespace}address"):
                city = address.find(f"{namespace}city")
                country = address.find(f"{namespace}country")
                if city is not None and country is not None:
                    addresses.append({
                        "city": city.text.strip() if city.text else "",
                        "country": country.text.strip() if country.text else ""
                    })
            if addresses:
                sdn_entry['addresses'] = addresses

    @staticmethod
    def _parse_id_list(entry: ET.Element, namespace: str, sdn_entry: Dict[str, Any]) -> None:
        """Parse ID list."""
        id_list = entry.find(f"{namespace}idList")
        if id_list is not None:
            ids = []
            for id_entry in id_list.findall(f"{namespace}id"):
                id_type = id_entry.find(f"{namespace}idType")
                id_number = id_entry.find(f"{namespace}idNumber")
                if id_type is not None and id_number is not None:
                    ids.append({
                        "id_type": id_type.text.strip() if id_type.text else "",
                        "id_number": id_number.text.strip() if id_number.text else ""
                    })
            if ids:
                sdn_entry['ids'] = ids

    @staticmethod
    def _parse_program_list(entry: ET.Element, namespace: str, sdn_entry: Dict[str, Any]) -> None:
        """Parse program list."""
        program_list = entry.find(f"{namespace}programList")
        if program_list is not None:
            programs = [
                program.text.strip()
                for program in program_list.findall(f"{namespace}program")
                if program.text
            ]
            if programs:
                sdn_entry['programs'] = programs

@app.route('/api/sdn-list', methods=['GET'])
def get_sdn_list():
    """Get SDN list with optional search parameters."""
    try:
        # Get search parameters
        query = request.args.get('query', '').lower()
        id_number = request.args.get('id_number', '').lower()
        program = request.args.get('program', '').lower()

        # Get SDN data
        if SDNDataManager.is_cache_valid():
            with open(CACHE_FILE_PATH, 'r', encoding='utf-8') as cache_file:
                sdn_entries = json.load(cache_file)
        else:
            sdn_entries = SDNDataManager.parse_xml_to_json()

        # Apply filters if any search parameters are provided
        if query or id_number or program:
            filtered_entries = []
            for entry in sdn_entries:
                if SDNDataManager._matches_search_criteria(entry, query, id_number, program):
                    filtered_entries.append(entry)
            return jsonify(filtered_entries)

        return jsonify(sdn_entries)
    except Exception as e:
        logger.error(f"Error in get_sdn_list: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/update-sdn-list', methods=['POST'])
def update_sdn_list():
    """Update SDN list from source."""
    try:
        download_result = SDNDataManager.download_sdn_file()
        if download_result["status"] == "error":
            return jsonify(download_result), 500
        
        sdn_entries = SDNDataManager.parse_xml_to_json()
        return jsonify({
            "status": "success",
            "message": "SDN list updated successfully",
            "entries_count": len(sdn_entries)
        })
    except Exception as e:
        logger.error(f"Error in update_sdn_list: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/search-sdn', methods=['GET'])
def search_sdn():
    """Search SDN list with specific criteria."""
    try:
        query = request.args.get('query', '').lower()
        if not query:
            return jsonify([])

        if SDNDataManager.is_cache_valid():
            with open(CACHE_FILE_PATH, 'r', encoding='utf-8') as cache_file:
                sdn_entries = json.load(cache_file)
        else:
            sdn_entries = SDNDataManager.parse_xml_to_json()

        results = []
        for entry in sdn_entries:
            similarity = SDNDataManager.calculate_similarity(query, entry['name'].lower())
            if similarity >= 0.85:  # Threshold for similarity
                results.append({
                    **entry,
                    'similarity_score': similarity
                })

        # Sort by similarity score
        results.sort(key=lambda x: x['similarity_score'], reverse=True)
        return jsonify(results)

    except Exception as e:
        logger.error(f"Error in search_sdn: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)