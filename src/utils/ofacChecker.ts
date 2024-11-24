import { transliterate } from 'transliteration';

export interface SdnEntry {
  uid: string;
  name: string;
  name_variations?: string[];
  type: string;
  date_of_birth?: string;
  id_number?: string;
  addresses?: { city: string; country: string }[];
  programs?: string[];
  remarks?: string;
  aka_names?: string[];
  ids?: { id_type: string; id_number: string }[];
}

export interface NameCheckResult {
  name: string;
  isMatch: boolean;
  matchScore: number;
  matchedName?: string;
  details?: {
    type?: string;
    programs?: string[];
    remarks?: string;
  };
}

class OfacCheckerClass {
  private initialized = false;
  private sdnEntries: SdnEntry[] = [];
  private baseUrl = 'http://127.0.0.1:5000'; // Local Flask server URL

  async initialize(): Promise<void> {
    try {
      // Use the Flask backend endpoint
      const response = await fetch(`${this.baseUrl}/api/sdn-list`);
      if (!response.ok) {
        throw new Error('Failed to fetch SDN list');
      }
      this.sdnEntries = await response.json();
      this.initialized = true;
      console.log('Successfully initialized OFAC checker with local SDN list');
    } catch (error) {
      console.error('Failed to initialize OFAC checker:', error);
      throw error;
    }
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = this.normalizeString(str1);
    const s2 = this.normalizeString(str2);
    
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    // Split into words and check if all words from one string exist in the other
    const words1 = new Set(s1.split(' '));
    const words2 = new Set(s2.split(' '));
    
    // Check if all words from the shorter set exist in the longer set
    const [shorterSet, longerSet] = words1.size < words2.size ? [words1, words2] : [words2, words1];
    const matchingWords = [...shorterSet].filter(word => 
      [...longerSet].some(w => w.includes(word) || word.includes(w))
    );

    return matchingWords.length / shorterSet.size;
  }

  private normalizeString(str: string): string {
    return str.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
      .trim();
  }

  async checkName(name: string): Promise<NameCheckResult> {
    if (!this.initialized) {
      throw new Error('OFAC Checker not initialized');
    }

    const transliteratedName = transliterate(name).toLowerCase();
    let bestMatch: { score: number; entry: SdnEntry | null } = { score: 0, entry: null };

    try {
      // Use the Flask backend search endpoint
      const response = await fetch(
        `${this.baseUrl}/api/search-sdn?query=${encodeURIComponent(transliteratedName)}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to search SDN list');
      }

      const searchResults = await response.json();

      // Process search results
      for (const entry of searchResults) {
        // Check primary name
        const primaryScore = this.calculateSimilarity(transliteratedName, transliterate(entry.name));
        if (primaryScore > bestMatch.score) {
          bestMatch = { score: primaryScore, entry };
        }

        // Check AKA names
        if (entry.aka_names) {
          for (const akaName of entry.aka_names) {
            const akaScore = this.calculateSimilarity(transliteratedName, transliterate(akaName));
            if (akaScore > bestMatch.score) {
              bestMatch = { score: akaScore, entry };
            }
          }
        }

        // Check ID numbers (exact match only)
        if (entry.ids) {
          const hasExactIdMatch = entry.ids.some((id: { id_type: string; id_number: string }) => {
            const normalizedInput = this.normalizeString(transliteratedName);
            const normalizedId = this.normalizeString(id.id_number);
            return normalizedInput === normalizedId;
          });
          if (hasExactIdMatch) {
            bestMatch = { score: 1, entry };
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error searching SDN list:', error);
      throw error;
    }

    // Determine match status based on score thresholds
    const isMatch = bestMatch.score >= 0.90; // 85% threshold for potential matches
    
    return {
      name,
      isMatch,
      matchScore: bestMatch.score,
      matchedName: bestMatch.entry?.name,
      details: bestMatch.entry ? {
        type: bestMatch.entry.type,
        programs: bestMatch.entry.programs,
        remarks: bestMatch.entry.remarks
      } : undefined
    };
  }

  // Method to manually update the SDN list
  async updateSdnList(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/update-sdn-list`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to update SDN list');
      }

      const result = await response.json();
      console.log('SDN list update result:', result);

      // Reinitialize with new data
      await this.initialize();
    } catch (error) {
      console.error('Error updating SDN list:', error);
      throw error;
    }
  }
}

export const OfacChecker = new OfacCheckerClass();
