import { useState, useEffect, useRef } from "react";
import {
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronDown,
  Building2,
  User,
  X,
  AlertTriangle,
  AlertOctagon,
  Shield,
  RefreshCw,
} from "lucide-react";
import type {
  SwiftMessage,
  BlacklistEntry,
  NameCheckResult,
  Owner,
} from "../types";
import { OfacChecker } from "../utils/ofacChecker";
import { BlacklistChecker } from "../utils/blacklistChecker";
import { transliterate as transliterateText } from "transliteration";

interface MessageDetailsModalProps {
  message: SwiftMessage;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (id: string, status: SwiftMessage["status"]) => void;
  onNotesChange?: (id: string, notes: string) => void;
  savedChecks?: Record<string, NameCheckResult>;
  onStoreChecks?: (checks: Record<string, NameCheckResult>) => void;
  blacklist?: BlacklistEntry[];
}

interface OwnershipNodeState {
  [key: string]: boolean;
}

export function MessageDetailsModal({
  message,
  isOpen,
  onClose,
  onStatusChange,
  onNotesChange,
  savedChecks,
  onStoreChecks,
  blacklist,
}: MessageDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [expandedNodes, setExpandedNodes] = useState<OwnershipNodeState>({});
  const [notes, setNotes] = useState(message.notes || "");
  const [currentStatus, setStatus] = useState<SwiftMessage["status"]>(
    message.status,
  );
  const [nameChecks, setNameChecks] = useState<Record<string, NameCheckResult>>(
    {},
  );
  const [isChecking, setIsChecking] = useState(false);
  const [isManualOverride, setIsManualOverride] = useState(
    message.manuallyUpdated || false,
  );
  const [hasChecked, setHasChecked] = useState(false);

  const checkAllFields = async (message: SwiftMessage): Promise<Record<string, NameCheckResult>> => {
    const results: Record<string, NameCheckResult> = {};

    // Check sender fields
    if (message.sender.name) {
      const checkResult = await OfacChecker.checkName(message.sender.name);
      results['sender_name'] = { ...checkResult, name: message.sender.name };
    }

    // Check CEO in sender's company details
    if (message.sender.company_details?.CEO) {
      const checkResult = await OfacChecker.checkName(message.sender.company_details.CEO);
      results['sender_ceo'] = { ...checkResult, name: message.sender.company_details.CEO };
    }

    // Check Founders in sender's company details
    if (message.sender.company_details?.Founders) {
      await Promise.all(
        message.sender.company_details.Founders.map(async (founder, index) => {
          if (founder.owner) {
            const checkResult = await OfacChecker.checkName(founder.owner);
            results[`sender_founder_${index + 1}`] = { ...checkResult, name: founder.owner };
          }
        })
      );
    }

    // Check receiver fields
    if (message.receiver.name) {
      const checkResult = await OfacChecker.checkName(message.receiver.name);
      results['receiver_name'] = { ...checkResult, name: message.receiver.name };
    }

    // Check CEO in receiver's company details
    if (message.receiver.CEO) {
      const checkResult = await OfacChecker.checkName(message.receiver.CEO);
      results['receiver_ceo'] = { ...checkResult, name: message.receiver.CEO };
    }

    // Check Founders in receiver's company details
    if (message.receiver.Founders) {
      await Promise.all(
        message.receiver.Founders.map(async (founder, index) => {
          if (founder.owner) {
            const checkResult = await OfacChecker.checkName(founder.owner);
            results[`receiver_founder_${index + 1}`] = { ...checkResult, name: founder.owner };
          }
        })
      );
    }

    // Check receiver bank name
    if (message.receiver.bankName) {
      const checkResult = await OfacChecker.checkName(message.receiver.bankName);
      results['receiver_bank'] = { ...checkResult, name: message.receiver.bankName };
    }

    return results;
  };

  useEffect(() => {
    if (isOpen && !hasChecked) {
      const performChecks = async () => {
        try {
          setIsChecking(true);
          await OfacChecker.initialize();

          const results: Record<string, NameCheckResult> = {};
          const namesToCheck = new Set<string>();
          const blacklistMatches = [];

          // Collect all names to check
          collectNames(message.sender, namesToCheck);
          collectNames(message.sender.company_details, namesToCheck);
          collectNames(message.receiver, namesToCheck);

          // Run OFAC checks
          for (const name of namesToCheck) {
            const checkResult = await OfacChecker.checkName(name);
            results[name] = { ...checkResult, name };

            // Run blacklist check
            if (blacklist) {
              const blacklistMatch = BlacklistChecker.checkName(name, blacklist);
              if (blacklistMatch) {
                blacklistMatches.push(blacklistMatch);
              }
            }
          }

          // Store results
          setNameChecks(results);

          // Determine and update status if not manually overridden
          if (!isManualOverride) {
            const newStatus = determineStatus(results, blacklistMatches);
            setStatus(newStatus);
            onStatusChange?.(message.id, newStatus);
          }

          setHasChecked(true);
          message.nameChecks = results;
          onStoreChecks?.(results);
        } catch (error) {
          console.error("Error during checks:", error);
        } finally {
          setIsChecking(false);
        }
      };

      performChecks();
    }
  }, [isOpen, hasChecked, message, blacklist, onStatusChange, onStoreChecks, isManualOverride]);

  const handleStatusChange = (newStatus: SwiftMessage["status"]) => {
    setStatus(newStatus);
    setIsManualOverride(true);
    if (onStatusChange) {
      onStatusChange(message.id, newStatus);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  const renderNameCheckIcon = (name: string, isInnCheck = false) => {
    if (!name) return null;

    const ofacCheck = nameChecks[name];
    const blacklistMatch = blacklist
      ? BlacklistChecker.checkName(name, blacklist)
      : null;

    return (
      <div className="flex items-center space-x-1">
        <div className="group relative">
          {ofacCheck ? (
            ofacCheck.matchScore === 1 ? (
              <XCircle className="w-5 h-5 text-red-500 cursor-help" />
            ) : ofacCheck.isMatch ? (
              <AlertTriangle className="w-5 h-5 text-yellow-500 cursor-help" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500 cursor-help" />
            )
          ) : (
            <AlertOctagon className="w-5 h-5 text-gray-400 cursor-help" />
          )}
          <div className="invisible group-hover:visible absolute z-50 w-80 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg text-sm left-6 top-0">
            {ofacCheck ? (
              <div className="text-xs">
                <p className="font-semibold">
                  {ofacCheck.matchScore === 1
                    ? "100% match"
                    : ofacCheck.isMatch
                      ? `${(ofacCheck.matchScore * 100).toFixed(1)}% match`
                      : "No OFAC match"}
                </p>
                {ofacCheck.matchedName && (
                  <p>Matched with: {ofacCheck.matchedName}</p>
                )}
                {ofacCheck.details && (
                  <>
                    {ofacCheck.details.type && (
                      <p>Type: {ofacCheck.details.type}</p>
                    )}
                    {ofacCheck.details.programs &&
                      ofacCheck.details.programs.length > 0 && (
                        <p>Programs: {ofacCheck.details.programs.join(", ")}</p>
                      )}
                    {ofacCheck.details.remarks && (
                      <p>Remarks: {ofacCheck.details.remarks}</p>
                    )}
                  </>
                )}
              </div>
            ) : (
              <p className="text-xs">OFAC check pending...</p>
            )}
          </div>
        </div>

        {blacklistMatch && (
          <div className="group relative">
            <Shield className="w-5 h-5 text-red-500 cursor-help" />
            <div className="invisible group-hover:visible absolute z-50 w-80 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg text-sm left-6 top-0">
              <div className="text-xs">
                <p className="font-semibold text-red-600 dark:text-red-400">
                  ⚠ Blacklisted Entity {isInnCheck ? "(Matched by INN)" : ""}
                </p>
                <p>Matched with: {blacklistMatch.matchedName}</p>
                <p>Match type: {blacklistMatch.matchType}</p>
                <p>Language: {blacklistMatch.language.toUpperCase()}</p>
                {blacklistMatch.entry.notes && (
                  <div className="mt-1">
                    <p className="font-medium">Notes:</p>
                    <p>{blacklistMatch.entry.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const determineStatus = (checks: Record<string, NameCheckResult>, blacklistMatches: any[]): SwiftMessage['status'] => {
    // Check for 100% OFAC matches or any blacklist matches
    const hasFullMatch = Object.values(checks).some(check => check.matchScore === 1);
    if (hasFullMatch || blacklistMatches.length > 0) {
      return 'flagged';
    }

    // Check for partial matches
    const hasPartialMatch = Object.values(checks).some(check => 
      check.isMatch && check.matchScore < 1
    );
    if (hasPartialMatch) {
      return 'processing';
    }

    // If no matches found
    return 'clear';
  };

  const renderOwnershipTree = (owners?: any[], depth = 0, parentId = "") => {
    if (!owners || owners.length === 0) return null;

    return (
      <ul className={`space-y-1 ${depth > 0 ? "ml-4 mt-1" : ""}`}>
        {owners.map((owner, idx) => {
          const nodeId = `${parentId}_${idx}`;
          const hasDetails = owner.isCompany && owner.companyDetails;
          const isExpanded = expandedNodes[nodeId];

          return (
            <li key={idx} className="text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                {hasDetails && (
                  <button
                    onClick={() => toggleNode(nodeId)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                )}
                {owner.isCompany ? (
                  <Building2 className="w-4 h-4 text-gray-400" />
                ) : (
                  <User className="w-4 h-4 text-gray-400" />
                )}
                <span>{owner.owner}</span>
                {renderNameCheckIcon(owner.owner)}
                {owner.percentage && <span>({owner.percentage}%)</span>}
              </div>
              {hasDetails && isExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-2">
                  {owner.companyDetails.inn && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                      <span>INN: {owner.companyDetails.inn}</span>
                      {renderNameCheckIcon(owner.companyDetails.inn)}
                    </div>
                  )}
                  {owner.companyDetails.CEO && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                      <span>CEO: {owner.companyDetails.CEO}</span>
                      {renderNameCheckIcon(owner.companyDetails.CEO)}
                    </div>
                  )}
                  {renderOwnershipTree(
                    owner.companyDetails.Founders,
                    depth + 1,
                    nodeId,
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  const renderEntityInfo = (name: string, ceo?: string, founders?: any[]) => {
    return (
      <div className="flex items-start space-x-2">
        <div className="flex-grow">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-900 dark:text-gray-100">
              {name}
            </span>
            {renderNameCheckIcon(name)}
          </div>
          {ceo && (
            <div className="mt-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                CEO:
              </span>
              <div className="ml-4 text-xs text-gray-600 dark:text-gray-400 flex items-center space-x-2">
                <span>{ceo}</span>
                {renderNameCheckIcon(ceo)}
              </div>
            </div>
          )}
          {founders && founders.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Ownership Structure:
              </p>
              {renderOwnershipTree(founders)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const collectNames = (entity: any, namesToCheck: Set<string>) => {
    if (entity.name) {
      const latinName = transliterateText(entity.name);
      namesToCheck.add(latinName);
    }
    if (entity.CEO) {
      namesToCheck.add(entity.CEO);
    }
    if (entity.Founders) {
      entity.Founders.forEach((founder: Owner) => {
        namesToCheck.add(founder.owner);
        if (founder.isCompany && founder.companyDetails) {
          collectNames(founder.companyDetails, namesToCheck);
        }
      });
    }
    if (entity.inn) {
      namesToCheck.add(entity.inn);
    }
  };

  const handleRecheck = async () => {
    setIsChecking(true);
    try {
      // Rerun OFAC checks
      const newChecks = await checkAllFields(message);
      
      // Run blacklist checks
      const blacklistMatches = [];
      const namesToCheck = Object.values(newChecks).map(check => check.name);
      
      for (const name of namesToCheck) {
        const blacklistMatch = blacklist ? BlacklistChecker.checkName(name, blacklist) : null;
        if (blacklistMatch) {
          blacklistMatches.push(blacklistMatch);
        }
      }

      // Determine new status
      const newStatus = determineStatus(newChecks, blacklistMatches);

      // Update message status
      if (onStatusChange) {
        onStatusChange(message.id, newStatus);
      }

      // Store new checks
      setNameChecks(newChecks);
      if (onStoreChecks) {
        onStoreChecks(newChecks);
      }

      setHasChecked(true);
    } catch (error) {
      console.error('Error during rechecking:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes);
    onNotesChange?.(message.id, newNotes);
  };

  useEffect(() => {
    if (savedChecks && message.id in savedChecks) {
      setNotes((savedChecks[message.id] as { notes?: string }).notes || "");
    }
  }, [savedChecks, message.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Transaction Details
            </h2>
            <button
              onClick={handleRecheck}
              className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
              Transaction Information
            </h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Reference
                </dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {message.transactionRef}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Type
                </dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {message.type}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Date
                </dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {message.date}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Amount
                </dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {message.currency}{" "}
                  {new Intl.NumberFormat("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(parseFloat(message.amount))}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Fees
                </dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {message.fees}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Status
                </dt>
                <dd className="text-sm">
                  <div className="flex items-center space-x-2">
                    <select
                      value={currentStatus}
                      onChange={(e) => handleStatusChange(e.target.value as SwiftMessage["status"])}
                      className={`mt-1 block w-full pl-3 pr-10 py-2 text-base 
                        border border-gray-300 dark:border-gray-600 rounded-md 
                        focus:outline-none focus:ring-[#008766] focus:border-transparent 
                        bg-white dark:bg-gray-700 
                        text-gray-900 dark:text-white
                        ${isChecking ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={isChecking}
                    >
                      <option value="processing" className="flex items-center">
                        ⚠️ Needs Review
                      </option>
                      <option value="clear" className="flex items-center">
                        ✅ Clear
                      </option>
                      <option value="flagged" className="flex items-center">
                        🚫 Flagged
                      </option>
                    </select>
                    <button
                      onClick={handleRecheck}
                      disabled={isChecking}
                      className={`ml-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 
                        ${isChecking ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title="Recheck compliance"
                    >
                      <RefreshCw className={`w-5 h-5 ${isChecking ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {currentStatus === "flagged"
                      ? "⚠️ This transaction has been flagged for review"
                      : currentStatus === "processing"
                      ? "⏳ This transaction needs review"
                      : "✅ This transaction is clear"}
                    {isManualOverride && (
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 italic">
                        (Manually set)
                      </span>
                    )}
                  </p>
                </dd>
              </div>
            </dl>

            <h3 className="text-lg font-medium mt-6 mb-4 text-gray-900 dark:text-white">
              Purpose
            </h3>
            <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
              {message.purpose}
            </p>

            <h3 className="text-lg font-medium mt-6 mb-4 text-gray-900 dark:text-white">
              Notes
            </h3>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add notes..."
              className="mt-4 w-full px-3 py-2 text-base 
                border border-gray-300 dark:border-gray-600 rounded-md 
                focus:outline-none focus:ring-[#008766] focus:border-transparent 
                bg-white dark:bg-gray-700 
                text-gray-900 dark:text-white"
              rows={4}
            />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
              Sender Information
            </h3>
            <dl className="space-y-2 mb-6">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Name
                </dt>
                <dd>
                  {renderEntityInfo(
                    message.sender.name,
                    message.sender.company_details?.CEO,
                    message.sender.company_details?.Founders,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Account
                </dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {message.sender.account}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  INN
                </dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {message.sender.inn || "N/A"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Bank Code
                </dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {message.sender.bankCode || "N/A"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Address
                </dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {message.sender.address}
                </dd>
              </div>
            </dl>

            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
              Receiver Information
            </h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Name
                </dt>
                <dd>
                  {renderEntityInfo(
                    message.receiver.name,
                    message.receiver.CEO,
                    message.receiver.Founders,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Account
                </dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {message.receiver.account}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Transit Account
                </dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {message.receiver.transitAccount}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Bank Name
                </dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {message.receiver.bankName}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Bank Code
                </dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {message.receiver.bankCode}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  INN
                </dt>
                <dd className="text-sm text-gray-900 dark:text-white flex items-center space-x-1">
                  <span>{message.receiver.inn}</span>
                  {renderNameCheckIcon(message.receiver.inn)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  KPP
                </dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {message.receiver.kpp}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
