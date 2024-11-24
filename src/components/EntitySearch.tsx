  import { useState } from "react";
  import axios from "axios";
  import {
    ChevronDown,
    ChevronRight,
    User,
    XCircle,
    CheckCircle,
    AlertTriangle,
    Building2,
    Plus,
  } from "lucide-react";
  import { BlacklistChecker } from "../utils/blacklistChecker";
  import { transliterate } from "../utils/translit";
  import type { CommonEntity } from '../types';
  import { toast } from 'react-hot-toast';

  interface EntitySearchProps {
    onAddToCommonEntities: (entity: Omit<CommonEntity, 'id'>) => void;
    existingEntities: CommonEntity[];
  }

  interface ComplianceResult {
    ofacMatch: boolean;
    blacklistMatch: boolean;
    matchScore: number;
  }

  interface CheckResult {
    matchScore: number;
  }

  interface ComplianceResults {
    [key: string]: {
      ofacMatch: boolean;
      blacklistMatch: boolean;
      matchScore: number;
    };
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
    const [complianceResults, setComplianceResults] = useState<ComplianceResults>({});
    const [checkResults, setCheckResults] = useState<Record<string, CheckResult>>({});

    const checkCompliance = async (data: any) => {
      try {
        const results: Record<string, ComplianceResult> = {};
        const checkedINNs = new Set<string>();

        const checkEntity = async (name: string, inn?: string) => {
          try {
            // Transliterate the name before searching
            const transliteratedName = transliterate(name);
            
            // Use the transliterated name for search
            const response = await fetch(`http://127.0.0.1:5000/api/search-sdn?query=${encodeURIComponent(transliteratedName)}`);
            if (!response.ok) {
              throw new Error('Failed to search SDN list');
            }
            const searchResults = await response.json();
            const averageMatchScore = searchResults.average_match_score || 0;

            // Store name results
            results[transliteratedName] = {
              ofacMatch: averageMatchScore >= 0.7,
              blacklistMatch: !!BlacklistChecker.checkName(transliteratedName, []),
              matchScore: averageMatchScore
            };

            // Check INN only if provided and not already checked
            if (inn && !checkedINNs.has(inn)) {
              checkedINNs.add(inn);
              const innResponse = await fetch(`http://127.0.0.1:5000/api/search-sdn?query=${encodeURIComponent(inn)}`);
              if (innResponse.ok) {
                const innResults = await innResponse.json();
                const innMatchScore = innResults.average_match_score || 0;
                
                results[inn] = {
                  ofacMatch: innMatchScore >= 0.7,
                  blacklistMatch: false,
                  matchScore: innMatchScore
                };
              }
            }
          } catch (error) {
            console.error(`Error checking entity ${name}:`, error);
            toast.error('Failed to check entity against SDN list');
          }
        };

        // Check main entity
        const mainINN = data.inn || data.TIN;
        await checkEntity(data.name, mainINN);
        if (data.CEO) await checkEntity(data.CEO);

        // Check founders recursively
        const checkFounders = async (founders: any[]) => {
          for (const founder of founders) {
            await checkEntity(founder.owner, founder.inn);
            if (founder.isCompany && founder.companyDetails) {
              if (founder.companyDetails.CEO) {
                await checkEntity(founder.companyDetails.CEO);
              }
              if (founder.companyDetails.Founders?.length > 0) {
                await checkFounders(founder.companyDetails.Founders);
              }
            }
          }
        };

        if (data.Founders?.length > 0) {
          await checkFounders(data.Founders);
        }

        console.log('Compliance Results:', results);
        setComplianceResults(results);
      } catch (error) {
        console.error("Error during compliance check:", error);
        toast.error('Failed to perform compliance check. Please try again.');
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
          `http://127.0.0.1:3001/api/search-orginfo?company_name=${orgInfoSearch}`
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
          `http://127.0.0.1:3001/api/search-egrul?inn=${egrulSearch}`
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

    const renderComplianceIcon = (result: ComplianceResult | undefined) => {
      console.log('Rendering compliance icon for result:', result);
      
      if (!result) {
        console.log('No result provided to renderComplianceIcon');
        return null;
      }

      const { matchScore, ofacMatch, blacklistMatch } = result;
      console.log(`Match score: ${matchScore}, OFAC: ${ofacMatch}, Blacklist: ${blacklistMatch}`);

      if (matchScore >= 1.0 || ofacMatch) {
        return (
          <span title="100% OFAC Match" className="flex items-center">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="ml-1 text-xs text-red-500">100% match</span>
          </span>
        );
      } else if (matchScore >= 0.85) {
        return (
          <span title={`${Math.round(matchScore * 100)}% OFAC Match`} className="flex items-center">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span className="ml-1 text-xs text-yellow-500">{Math.round(matchScore * 100)}% match</span>
          </span>
        );
      } else {
        return (
          <span title="No matches found" className="flex items-center">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="ml-1 text-xs text-green-500">Clear</span>
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
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center">
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
                  <span className="ml-2">{transliterate(owner.owner)}</span>
                  {owner.inn && <span className="ml-2 text-sm text-gray-500">(INN: {owner.inn})</span>}
                </div>
                <div className="flex items-center space-x-2">
                  {owner.inn && renderComplianceIcon(complianceResults[owner.inn])}
                  {renderComplianceIcon(complianceResults[transliterate(owner.owner)])}
                </div>
              </div>

              {isExpanded && owner.companyDetails && (
                <div className="ml-6 pl-2 border-l border-gray-300 dark:border-gray-600">
                  {owner.companyDetails.inn && (
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">INN:</span>
                        <span>{owner.companyDetails.inn}</span>
                      </div>
                      {renderComplianceIcon(complianceResults[owner.companyDetails.inn])}
                    </div>
                  )}
                  
                  {owner.companyDetails.CEO && (
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">CEO:</span>
                        <span>{transliterate(owner.companyDetails.CEO)}</span>
                      </div>
                      {renderComplianceIcon(complianceResults[transliterate(owner.companyDetails.CEO)])}
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

    const renderEntityInfo = (entityData: any) => (
      <div className="mt-4 bg-gray-200 dark:bg-gray-900 p-4 rounded-md">
        {/* Company Name and INN */}
        <div className="flex flex-col space-y-2">
          {/* Company Name with Status Icon */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-semibold">Company Name:</span>
              <span>{transliterate(entityData.name)}</span>
            </div>
            {renderComplianceIcon(complianceResults[transliterate(entityData.name)])}
          </div>

          {/* INN Section - Now directly under company name */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-semibold">INN:</span>
              <span>{entityData.inn || entityData.TIN || '-'}</span>
            </div>
            {(entityData.inn || entityData.TIN) && 
              renderComplianceIcon(complianceResults[entityData.inn || entityData.TIN])}
          </div>

          {/* CEO Section */}
          {entityData.CEO && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-semibold">CEO:</span>
                <span>{transliterate(entityData.CEO)}</span>
              </div>
              {renderComplianceIcon(complianceResults[transliterate(entityData.CEO)])}
            </div>
          )}

          {/* Address Section */}
          {entityData.address && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-semibold">Address:</span>
                <span>{entityData.address}</span>
              </div>
            </div>
          )}
        </div>

        {/* Founders Section */}
        {entityData.Founders && entityData.Founders.length > 0 && (
          <div className="mt-4">
            <span className="font-semibold">Founders:</span>
            {renderOwnershipTree(entityData.Founders)}
          </div>
        )}
      </div>
    );

    const handleAddToCommonEntities = (entityData: any) => {
      try {
        const newEntity: Omit<CommonEntity, 'id'> = {
          name: entityData.name,
          inn: entityData.TIN || '',
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
                className="flex-grow px-3 py-2 border rounded-md 
                  border-gray-300 dark:border-gray-600 
                  bg-white dark:bg-gray-600 
                  text-gray-900 dark:text-gray-100
                  placeholder-gray-500 dark:placeholder-gray-400
                  focus:outline-none focus:ring-[#008766] focus:border-transparent"
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
                  renderEntityInfo(orgInfoResult)
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
                className="flex-grow px-3 py-2 border rounded-md 
                  border-gray-300 dark:border-gray-600 
                  bg-white dark:bg-gray-600 
                  text-gray-900 dark:text-gray-100
                  placeholder-gray-500 dark:placeholder-gray-400
                  focus:outline-none focus:ring-[#008766] focus:border-transparent"
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
                  renderEntityInfo(egrulResult)
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  export default EntitySearch;
