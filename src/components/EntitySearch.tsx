import { useState } from "react";
import axios from "axios";
import {
  ChevronDown,
  ChevronRight,
  User,
  Shield,
  CheckCircle,
  AlertTriangle,
  Building2,
  Plus,
} from "lucide-react";
import { OfacChecker } from "../utils/ofacChecker";
import { BlacklistChecker } from "../utils/blacklistChecker";
import { transliterate } from "../utils/translit";
import { useTranslation } from '../contexts/TranslationContext';
import type { CommonEntity } from '../types';
import { toast } from 'react-hot-toast';

interface EntitySearchProps {
  onAddToCommonEntities: (entity: Omit<CommonEntity, 'id'>) => void;
  existingEntities: CommonEntity[];
}

export function EntitySearch({ onAddToCommonEntities, existingEntities }: EntitySearchProps) {
  const [orgInfoSearch, setOrgInfoSearch] = useState("");
  const [orgInfoResult, setOrgInfoResult] = useState<any>(null);
  const [egrulSearch, setEgrulSearch] = useState("");
  const [egrulResult, setEgrulResult] = useState<any>(null);
  const [expandedNodes, setExpandedNodes] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [loadingOrgInfo, setLoadingOrgInfo] = useState(false);
  const [loadingEgrul, setLoadingEgrul] = useState(false);
  const [complianceResults, setComplianceResults] = useState<
    Record<string, { ofacMatch: boolean; blacklistMatch: boolean }>
  >({});

  const checkCompliance = async (data: any) => {
    try {
      const results: Record<string, { ofacMatch: boolean; blacklistMatch: boolean }> = {};

      const checkEntity = async (name: string) => {
        const transliteratedName = transliterate(name);
        const ofacResult = await OfacChecker.checkName(transliteratedName);
        const blacklistResult = BlacklistChecker.checkName(transliteratedName, []);

        results[transliteratedName] = {
          ofacMatch: ofacResult.isMatch,
          blacklistMatch: !!blacklistResult,
        };
      };

      const checkCompanyStructure = async (companyData: any) => {
        if (companyData.name) await checkEntity(companyData.name);
        if (companyData.CEO) await checkEntity(companyData.CEO);
        
        if (companyData.Founders) {
          for (const founder of companyData.Founders) {
            await checkEntity(founder.owner);
            if (founder.isCompany && founder.companyDetails) {
              await checkCompanyStructure(founder.companyDetails);
            }
          }
        }
      };

      await checkCompanyStructure(data);
      setComplianceResults((prev) => ({ ...prev, ...results }));
    } catch (error) {
      console.error("Error during compliance check:", error);
      toast.error('Failed to perform compliance check. Please try again.', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#ef4444',
          color: '#fff',
          borderRadius: '8px',
        },
      });
    }
  };

  const handleOrgInfoSearch = async () => {
    if (!orgInfoSearch.trim()) {
      toast.error('Please enter a company name to search', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#ef4444',
          color: '#fff',
          borderRadius: '8px',
        },
      });
      return;
    }

    setLoadingOrgInfo(true);
    try {
      const response = await axios.get(
        import.meta.env.VITE_BACKEND_URL2+`/api/search-orginfo?company_name=${orgInfoSearch}`
      );
      
      if (!response.data || Object.keys(response.data).length === 0) {
        toast.error('No results found for this company name', {
          duration: 4000,
          position: 'top-right',
          style: {
            background: '#ef4444',
            color: '#fff',
            borderRadius: '8px',
          },
        });
        setOrgInfoResult(null);
      } else {
        setOrgInfoResult(response.data);
        await checkCompliance(response.data);
      }
    } catch (error) {
      console.error("Error fetching OrgInfo data:", error);
      toast.error('Failed to fetch organization data. Please try again.', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#ef4444',
          color: '#fff',
          borderRadius: '8px',
        },
      });
      setOrgInfoResult(null);
    } finally {
      setLoadingOrgInfo(false);
    }
  };

  const handleEgrulSearch = async () => {
    if (!egrulSearch.trim()) {
      toast.error('Please enter an INN to search', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#ef4444',
          color: '#fff',
          borderRadius: '8px',
        },
      });
      return;
    }

    setLoadingEgrul(true);
    try {
      const response = await axios.get(
        import.meta.env.VITE_BACKEND_URL2+`/api/search-egrul?inn=${egrulSearch}`
      );
      
      if (!response.data || 
          Object.keys(response.data).length === 0 || 
          response.data.error || 
          !response.data.name) {
        toast.error('No results found for this INN', {
          duration: 4000,
          position: 'top-right',
          style: {
            background: '#ef4444',
            color: '#fff',
            borderRadius: '8px',
          },
        });
        setEgrulResult(null);
      } else {
        setEgrulResult(response.data);
        await checkCompliance(response.data);
      }
    } catch (error: any) {
      console.error("Error fetching EGRUL data:", error);
      const errorMessage = error.response?.data?.message || 'Failed to fetch EGRUL data. Please try again.';
      toast.error(errorMessage, {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#ef4444',
          color: '#fff',
          borderRadius: '8px',
        },
      });
      setEgrulResult(null);
    } finally {
      setLoadingEgrul(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const renderComplianceIcon = (key: string) => {
    const result = complianceResults[key];
    if (!result) return null;

    if (result.blacklistMatch) {
      return (
        <span title="Blacklisted">
          <Shield className="w-4 h-4 text-red-500" />
        </span>
      );
    } else if (result.ofacMatch) {
      return (
        <span title="OFAC Match">
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
        </span>
      );
    } else {
      return (
        <span title="Clear">
          <CheckCircle className="w-4 h-4 text-green-500" />
        </span>
      );
    }
  };

  const renderOwnershipTree = (owners: any[], parentId = "") => (
    <ul className="space-y-0.5 ml-4 mt-1">
      {owners.map((owner, index) => {
        const nodeId = `${parentId}_${index}`;
        const isExpanded = expandedNodes[nodeId];
        const hasCompanyDetails = owner.isCompany && owner.companyDetails;

        return (
          <li key={nodeId} className="flex flex-col space-y-0.5">
            <div className="flex items-center py-1">
              {hasCompanyDetails && (
                <button onClick={() => toggleNode(nodeId)} className="p-0.5">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              )}
              {owner.isCompany ? (
                <Building2 className="w-4 h-4 text-gray-400 ml-1" />
              ) : (
                <User className="w-4 h-4 text-gray-400 ml-1" />
              )}
              <div className="flex items-center ml-2 flex-grow">
                <span>{transliterate(owner.owner)}</span>
                {owner.inn && (
                  <span className="ml-2 text-sm text-gray-500">
                    (INN: {owner.inn})
                  </span>
                )}
                {renderComplianceIcon(transliterate(owner.owner))}
              </div>
            </div>
            {isExpanded && owner.companyDetails && (
              <div className="ml-6 pl-2 border-l border-gray-300 dark:border-gray-600">
                {owner.companyDetails.CEO && (
                  <div className="flex items-center py-1">
                    <span className="text-sm text-gray-500">CEO:</span>
                    <span className="ml-2">{transliterate(owner.companyDetails.CEO)}</span>
                    {renderComplianceIcon(transliterate(owner.companyDetails.CEO))}
                  </div>
                )}
                {owner.companyDetails.Founders?.length > 0 && renderOwnershipTree(owner.companyDetails.Founders, nodeId)}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  const isEntityInCommonEntities = (entityName: string): boolean => {
    const transliteratedName = transliterate(entityName).toLowerCase();
    return existingEntities.some(
      (existingEntity: CommonEntity) => transliterate(existingEntity.name).toLowerCase() === transliteratedName
    );
  };

  const handleAddToCommonEntities = (entityData: any) => {
    try {
      const newEntity: Omit<CommonEntity, 'id'> = {
        name: entityData.name,
        inn: entityData.inn || '',
        source: entityData.inn ? 'egrul' : 'orginfo',
        CEO: entityData.CEO || '',
        Founders: entityData.Founders || [],
        status: 'clean',
        lastChecked: new Date().toISOString(),
        notes: ''
      };
      
      onAddToCommonEntities(newEntity);
      
      toast.success(`${entityData.name} has been added to Common Entities`, {
        duration: 3000,
        position: 'top-right',
        style: {
          background: '#008766',
          color: '#fff',
          borderRadius: '8px',
        },
      });
    } catch (error) {
      console.error("Error adding entity:", error);
      toast.error('Failed to add entity. Please try again.', {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#ef4444',
          color: '#fff',
          borderRadius: '8px',
        },
      });
    }
  };

  const handleOrgInfoKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleOrgInfoSearch();
    }
  };

  const handleEgrulKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleEgrulSearch();
    }
  };

  const handleEgrulInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setEgrulSearch(value);
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
        Entity Search
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* OrgInfo Section */}
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
            Search OrgInfo
          </h3>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Enter company name"
              value={orgInfoSearch}
              onChange={(e) => setOrgInfoSearch(e.target.value)}
              onKeyPress={handleOrgInfoKeyPress}
              className="flex-grow px-3 py-2 border rounded-md dark:bg-gray-600 dark:text-gray-100"
            />
            <button
              onClick={handleOrgInfoSearch}
              className="bg-[#008766] text-white px-4 py-2 rounded-md hover:bg-[#007055] whitespace-nowrap"
              disabled={loadingOrgInfo}
            >
              {loadingOrgInfo ? "Searching..." : "Search"}
            </button>
            {orgInfoResult && (
              <button
                onClick={() => handleAddToCommonEntities(orgInfoResult)}
                disabled={isEntityInCommonEntities(orgInfoResult.name)}
                className={`flex items-center px-4 py-2 bg-blue-500 text-white rounded-md 
                  ${isEntityInCommonEntities(orgInfoResult.name) 
                    ? 'opacity-50 cursor-not-allowed bg-gray-400' 
                    : 'hover:bg-blue-600'}`}
                title={isEntityInCommonEntities(orgInfoResult.name) 
                  ? 'Entity already exists in Common Entities' 
                  : 'Add to Common Entities'}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add
              </button>
            )}
          </div>

          {orgInfoResult && (
            <div className="mt-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">Results:</h4>
              {orgInfoResult.error ? (
                <p className="text-red-500">{orgInfoResult.error}</p>
              ) : (
                <div className="mt-4 bg-gray-200 dark:bg-gray-900 p-4 rounded-md">
                  <p>
                    <strong>Company Name:</strong> {transliterate(orgInfoResult.name)}{" "}
                    {renderComplianceIcon(transliterate(orgInfoResult.name))}
                  </p>
                  <p>
                    <strong>CEO:</strong> {transliterate(orgInfoResult.CEO)}{" "}
                    {renderComplianceIcon(transliterate(orgInfoResult.CEO))}
                  </p>
                  <p>
                    <strong>Address:</strong> {orgInfoResult.address}
                  </p>
                  {orgInfoResult.Founders && (
                    <div className="mt-4">
                      <strong>Founders:</strong>
                      {renderOwnershipTree(orgInfoResult.Founders)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* EGRUL Section */}
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
            Search EGRUL
          </h3>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Enter INN"
              value={egrulSearch}
              onChange={handleEgrulInputChange}
              onKeyPress={handleEgrulKeyPress}
              className="flex-grow px-3 py-2 border rounded-md dark:bg-gray-600 dark:text-gray-100"
            />
            <button
              onClick={handleEgrulSearch}
              className="bg-[#008766] text-white px-4 py-2 rounded-md hover:bg-[#007055] whitespace-nowrap"
              disabled={loadingEgrul}
            >
              {loadingEgrul ? "Searching..." : "Search"}
            </button>
            {egrulResult && (
              <button
                onClick={() => handleAddToCommonEntities(egrulResult)}
                disabled={isEntityInCommonEntities(egrulResult.name)}
                className={`flex items-center px-4 py-2 bg-blue-500 text-white rounded-md 
                  ${isEntityInCommonEntities(egrulResult.name) 
                    ? 'opacity-50 cursor-not-allowed bg-gray-400' 
                    : 'hover:bg-blue-600'}`}
                title={isEntityInCommonEntities(egrulResult.name) 
                  ? 'Entity already exists in Common Entities' 
                  : 'Add to Common Entities'}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add
              </button>
            )}
          </div>

          {egrulResult && (
            <div className="mt-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                Results:
              </h4>
              {egrulResult.error ? (
                <p className="text-red-500">{egrulResult.error}</p>
              ) : (
                <div className="mt-4 bg-gray-200 dark:bg-gray-900 p-4 rounded-md">
                  <p>
                    <strong>Company Name:</strong> {transliterate(egrulResult.name)}{" "}
                    {renderComplianceIcon(transliterate(egrulResult.name))}
                  </p>
                  <p>
                    <strong>CEO:</strong> {transliterate(egrulResult.CEO)}{" "}
                    {renderComplianceIcon(transliterate(egrulResult.CEO))}
                  </p>
                  <p>
                    <strong>Address:</strong> {egrulResult.address}
                  </p>
                  {egrulResult.Founders && (
                    <div className="mt-4">
                      <strong>Founders:</strong>
                      {renderOwnershipTree(egrulResult.Founders)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EntitySearch;
