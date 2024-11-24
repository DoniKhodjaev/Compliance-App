import { useRef, useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, Shield, Building2, User, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import type { CommonEntity } from '../types';
import { transliterate } from 'transliteration';
import { OfacChecker } from '../utils/ofacChecker';
import { toast } from 'react-hot-toast';

interface CommonEntityDetailsModalProps {
  entity: CommonEntity;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<CommonEntity>) => void;
}

export function CommonEntityDetailsModal({ 
  entity,
  isOpen,
  onClose,
  onSave 
}: CommonEntityDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [isChecking, setIsChecking] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(entity.status);
  const [notes, setNotes] = useState(entity.notes || '');
  const [checkResults, setCheckResults] = useState<Record<string, { isMatch: boolean; matchScore: number }>>({});
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSave = () => {
    onSave({
      status: currentStatus,
      notes: notes
    });
    onClose();
  };

  const handleRecheck = async () => {
    setIsChecking(true);
    try {
      await OfacChecker.initialize();
      const results: Record<string, { isMatch: boolean; matchScore: number }> = {};

      // Check entity name
      const nameResult = await OfacChecker.checkName(entity.name);
      results[entity.name] = { isMatch: nameResult.isMatch, matchScore: nameResult.matchScore };

      // Check CEO if exists
      if (entity.CEO) {
        const ceoResult = await OfacChecker.checkName(entity.CEO);
        results[entity.CEO] = { isMatch: ceoResult.isMatch, matchScore: ceoResult.matchScore };
      }

      // Check Founders recursively
      const checkFounders = async (founders: CommonEntity['Founders'] = []) => {
        for (const founder of founders) {
          const founderResult = await OfacChecker.checkName(founder.owner);
          results[founder.owner] = { isMatch: founderResult.isMatch, matchScore: founderResult.matchScore };

          if (founder.isCompany && founder.companyDetails) {
            if (founder.companyDetails.CEO) {
              const companyCeoResult = await OfacChecker.checkName(founder.companyDetails.CEO);
              results[founder.companyDetails.CEO] = { 
                isMatch: companyCeoResult.isMatch, 
                matchScore: companyCeoResult.matchScore 
              };
            }
            if (founder.companyDetails.Founders) {
              await checkFounders(founder.companyDetails.Founders);
            }
          }
        }
      };

      if (entity.Founders) {
        await checkFounders(entity.Founders);
      }

      setCheckResults(results);

      // Determine new status
      let newStatus: CommonEntity['status'] = 'clean';
      const hasFullMatch = Object.values(results).some(r => r.matchScore === 1);
      const hasPartialMatch = Object.values(results).some(r => r.matchScore >= 0.85);

      if (hasFullMatch) {
        newStatus = 'flagged';
      } else if (hasPartialMatch) {
        newStatus = 'needs_review';
      }

      setCurrentStatus(newStatus);
      onSave({
        status: newStatus,
        lastChecked: new Date().toISOString()
      });

      toast.success('OFAC check completed successfully');
    } catch (error) {
      console.error('Error during OFAC check:', error);
      toast.error('Failed to complete OFAC check');
    } finally {
      setIsChecking(false);
    }
  };

  const renderStatusIcon = (name: string) => {
    const result = checkResults[name];
    if (!result) return null;

    if (result.matchScore === 1) {
      return (
        <div className="flex items-center">
          <Shield className="w-4 h-4 text-red-500" />
          <span className="ml-1 text-xs text-red-500">100% match</span>
        </div>
      );
    } else if (result.matchScore >= 0.85) {
      return (
        <div className="flex items-center">
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
          <span className="ml-1 text-xs text-yellow-500">{Math.round(result.matchScore * 100)}% match</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="ml-1 text-xs text-green-500">Clear</span>
        </div>
      );
    }
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const renderFounders = (founders: CommonEntity['Founders'] = [], parentId = '') => {
    if (!founders.length) return null;

    return (
      <div className="ml-4 space-y-2">
        {founders.map((founder, index) => {
          const nodeId = `${parentId}_${index}`;
          const isExpanded = expandedNodes[nodeId];

          return (
            <div key={nodeId} className="space-y-1">
              <div className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center">
                  {founder.isCompany && founder.companyDetails && (
                    <button
                      onClick={() => toggleNode(nodeId)}
                      className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  {founder.isCompany ? (
                    <Building2 className="w-4 h-4 text-blue-500 ml-1" />
                  ) : (
                    <User className="w-4 h-4 text-green-500 ml-1" />
                  )}
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {transliterate(founder.owner)}
                  </span>
                </div>
                {renderStatusIcon(founder.owner)}
              </div>

              {isExpanded && founder.companyDetails && (
                <div className="ml-6 pl-2 border-l-2 border-gray-200 dark:border-gray-600">
                  {founder.companyDetails.CEO && (
                    <div className="flex items-center justify-between p-2">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-blue-500 mr-2" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          CEO: {transliterate(founder.companyDetails.CEO)}
                        </span>
                      </div>
                      {renderStatusIcon(founder.companyDetails.CEO)}
                    </div>
                  )}
                  {founder.companyDetails.Founders && renderFounders(founder.companyDetails.Founders, nodeId)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Entity Details
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Status Section with Recheck Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <select
                value={currentStatus}
                onChange={(e) => setCurrentStatus(e.target.value as CommonEntity['status'])}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                  focus:outline-none focus:ring-[#008766] focus:border-transparent 
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="clean">Clean</option>
                <option value="needs_review">Needs Review</option>
                <option value="flagged">Flagged</option>
              </select>
              <button
                onClick={handleRecheck}
                disabled={isChecking}
                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
                Recheck OFAC
              </button>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Source: {entity.source.toUpperCase()}
            </span>
          </div>

          {/* Entity Information with Status Icons */}
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                {entity.name}
              </h4>
              {renderStatusIcon(entity.name)}
            </div>
            
            {entity.inn && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">INN:</span> {entity.inn}
              </div>
            )}

            {entity.CEO && (
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <span className="font-medium">CEO:</span> {entity.CEO}
                </div>
                {renderStatusIcon(entity.CEO)}
              </div>
            )}
          </div>

          {/* Ownership Structure */}
          {entity.Founders && entity.Founders.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Ownership Structure
              </h4>
              {renderFounders(entity.Founders)}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                focus:outline-none focus:ring-[#008766] focus:border-transparent 
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={4}
              placeholder="Add notes about this entity..."
            />
          </div>

          {/* Last Checked */}
          {entity.lastChecked && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Last checked: {new Date(entity.lastChecked).toLocaleString()}
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[#008766] text-white rounded-lg hover:bg-[#007055]"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 