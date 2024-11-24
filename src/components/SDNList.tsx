import { useState, useEffect, useRef } from 'react';
import { Search, Download, RefreshCw, Shield, AlertTriangle, CheckCircle, X, ChevronDown, ChevronRight } from 'lucide-react';
import { transliterate } from 'transliteration';
import { toast } from 'react-hot-toast';

interface SDNEntry {
  uid: string;
  name: string;
  type: string;
  date_of_birth?: string;
  ids?: { id_type: string; id_number: string }[];
  programs?: string[];
  remarks?: string;
  aka_names?: string[];
  addresses?: { city: string; country: string }[];
}

const ITEMS_PER_PAGE = 10;

const getProgramColor = (program: string): string => {
  const programLower = program.toLowerCase();
  
  if (programLower.includes('cyber')) {
    return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
  }
  if (programLower.includes('ukraine')) {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  }
  if (programLower.includes('russia')) {
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  }
  if (programLower.includes('iran')) {
    return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
  }
  if (programLower.includes('syria')) {
    return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400';
  }
  if (programLower.includes('dprk') || programLower.includes('korea')) {
    return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
  }
  if (programLower.includes('venezuela')) {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
  }
  if (programLower.includes('terror')) {
    return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400';
  }
  
  // Default color for other programs
  return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
};

const renderProgramBadges = (programs: string[] = []) => {
  return programs.map((program, index) => (
    <span
      key={index}
      className={`px-2 py-1 text-xs font-medium rounded-full ${getProgramColor(program)}`}
    >
      {program}
    </span>
  ));
};

export function SDNList() {
  const [entries, setEntries] = useState<SDNEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<SDNEntry | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const modalRef = useRef<HTMLDivElement>(null);
  const [expandedAkas, setExpandedAkas] = useState<Set<string>>(new Set());
  const [expandedModalAkas, setExpandedModalAkas] = useState(false);

  useEffect(() => {
    loadSDNList();
  }, []);

  const loadSDNList = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://127.0.0.1:5000/api/sdn-list');
      if (!response.ok) {
        throw new Error(`Failed to fetch SDN list: ${response.statusText}`);
      }
      const data = await response.json();
      setEntries(data);
      toast.success('SDN List loaded successfully');
    } catch (error) {
      console.error('Error loading SDN list:', error);
      toast.error('Failed to load SDN list');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSDNList = async () => {
    try {
      setIsUpdating(true);
      const response = await fetch('http://127.0.0.1:5000/api/update-sdn-list', {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('Failed to update SDN list');
      }
      await loadSDNList();
      toast.success('SDN List updated successfully');
    } catch (error) {
      console.error('Error updating SDN list:', error);
      toast.error('Failed to update SDN list');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExport = () => {
    try {
      // Only export filtered entries that are currently shown
      const csvContent = [
        // Updated headers to include ID numbers
        [
          'UID',
          'Name',
          'Type',
          'Date of Birth',
          'Programs',
          'Remarks',
          'AKA Names',
          'ID Numbers (Type: Number)',  // Updated header for ID numbers
          'Addresses'
        ].join(','),
        // Map filtered entries to CSV rows with ID numbers
        ...filteredEntries.map(entry => [
          entry.uid,
          `"${entry.name || ''}"`,
          `"${entry.type || ''}"`,
          `"${entry.date_of_birth || ''}"`,
          `"${entry.programs?.join('; ') || ''}"`,
          `"${entry.remarks?.replace(/"/g, '""') || ''}"`,  // Escape quotes in remarks
          `"${entry.aka_names?.join('; ') || ''}"`,
          `"${entry.ids?.map(id => `${id.id_type}: ${id.id_number}`).join('; ') || ''}"`,  // Format ID numbers
          `"${entry.addresses?.map(addr => `${addr.city}, ${addr.country}`).join('; ') || ''}"`,
        ].join(','))
      ].join('\n');

      // Add BOM for UTF-8 encoding
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      
      // Add timestamp and search term to filename if filtering is active
      const timestamp = new Date().toISOString().split('T')[0];
      const searchSuffix = searchTerm ? `_search_${searchTerm.replace(/[^a-z0-9]/gi, '_')}` : '';
      link.download = `sdn_list${searchSuffix}_${timestamp}.csv`;
      
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success(`Successfully exported ${filteredEntries.length} entries`);
    } catch (error) {
      console.error('Error exporting SDN list:', error);
      toast.error('Failed to export SDN list');
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
      setSelectedEntry(null);
    }
  };

  useEffect(() => {
    if (selectedEntry) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedEntry]);

  const calculateSimilarity = (str1: string, str2: string): number => {
    const words1 = new Set(normalizeString(str1).split(' '));
    const words2 = new Set(normalizeString(str2).split(' '));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  };

  const normalizeString = (str: string): string => {
    return str.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
      .trim();
  };

  const filteredEntries = entries.filter(entry => {
    if (!searchTerm) return true;
    
    const searchNormalized = normalizeString(searchTerm);
    const searchWords = searchNormalized.split(' ');

    // Check main name with fuzzy matching
    const nameMatch = calculateSimilarity(entry.name, searchTerm) > 0.3;
    
    // Check AKA names with fuzzy matching
    const akaMatch = entry.aka_names?.some(aka => 
      calculateSimilarity(aka, searchTerm) > 0.3
    );

    // Check ID numbers
    const idMatch = entry.ids?.some(id => {
      const idString = `${id.id_type} ${id.id_number}`.toLowerCase();
      return idString.includes(searchNormalized) ||
             id.id_number.toLowerCase().includes(searchNormalized);
    });

    // Check if all search words are present in any order
    const allWordsMatch = searchWords.every(word => {
      const wordMatch = 
        entry.name.toLowerCase().includes(word) ||
        entry.aka_names?.some(aka => aka.toLowerCase().includes(word)) ||
        entry.programs?.some(program => program.toLowerCase().includes(word)) ||
        entry.ids?.some(id => 
          id.id_number.toLowerCase().includes(word) ||
          id.id_type.toLowerCase().includes(word)
        );
      return wordMatch;
    });

    return nameMatch || akaMatch || idMatch || allWordsMatch;
  });

  // Get visible page numbers
  const getVisiblePages = () => {
    const totalPages = Math.ceil(filteredEntries.length / ITEMS_PER_PAGE);
    const current = currentPage;
    const pages: (number | string)[] = [];
    
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Always show first page
    pages.push(1);

    if (current > 3) {
      pages.push('...');
    }

    // Show pages around current page
    for (let i = Math.max(2, current - 1); i <= Math.min(current + 1, totalPages - 1); i++) {
      pages.push(i);
    }

    if (current < totalPages - 2) {
      pages.push('...');
    }

    // Always show last page
    pages.push(totalPages);

    return pages;
  };

  // Pagination
  const totalPages = Math.ceil(filteredEntries.length / ITEMS_PER_PAGE);
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const toggleAkaExpansion = (uid: string) => {
    setExpandedAkas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(uid)) {
        newSet.delete(uid);
      } else {
        newSet.add(uid);
      }
      return newSet;
    });
  };

  const renderDetailsModal = () => {
    if (!selectedEntry) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
          {/* Fixed Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                SDN Entry Details
              </h3>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Basic Information - Always Visible */}
            <div className="mt-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Basic Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-900 dark:text-white">
                    <span className="font-medium">Name:</span> {selectedEntry.name}
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    <span className="font-medium">Type:</span> {selectedEntry.type}
                  </p>
                  {selectedEntry.date_of_birth && (
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">Date of Birth:</span> {selectedEntry.date_of_birth}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  {selectedEntry.programs && selectedEntry.programs.length > 0 && (
                    <div>
                      <span className="font-medium text-sm text-gray-900 dark:text-white">Programs:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {renderProgramBadges(selectedEntry.programs)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 overflow-y-auto flex-grow">
            <div className="space-y-6">
              {/* AKA Names */}
              {selectedEntry.aka_names && selectedEntry.aka_names.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Also Known As
                    </h4>
                    <button
                      onClick={() => setExpandedModalAkas(!expandedModalAkas)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                    >
                      {expandedModalAkas ? (
                        <ChevronDown className="w-3 h-3 mr-1" />
                      ) : (
                        <ChevronRight className="w-3 h-3 mr-1" />
                      )}
                      {selectedEntry.aka_names.length} AKA{selectedEntry.aka_names.length > 1 ? 's' : ''}
                    </button>
                  </div>
                  {expandedModalAkas && (
                    <ul className="space-y-1 mt-2">
                      {selectedEntry.aka_names.map((name, index) => (
                        <li key={index} className="text-sm text-gray-900 dark:text-white pl-4">
                          • {name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* IDs */}
              {selectedEntry.ids && selectedEntry.ids.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Identification Documents
                  </h4>
                  <div className="space-y-2">
                    {selectedEntry.ids.map((id, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-600"
                      >
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {id.id_type}
                        </span>
                        <span className="text-sm text-gray-900 dark:text-gray-100 font-mono">
                          {id.id_number}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Addresses */}
              {selectedEntry.addresses && selectedEntry.addresses.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Addresses
                  </h4>
                  <div className="space-y-2">
                    {selectedEntry.addresses.map((address, index) => (
                      <div 
                        key={index} 
                        className="p-2 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-600"
                      >
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {address.city && `${address.city}, `}{address.country}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Remarks */}
              {selectedEntry.remarks && (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Remarks
                  </h4>
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                    {selectedEntry.remarks}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            OFAC SDN List
          </h2>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            <button
              onClick={updateSDNList}
              disabled={isUpdating}
              className="flex items-center px-4 py-2 bg-[#008766] text-white rounded-md hover:bg-[#007055] disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
              {isUpdating ? 'Updating...' : 'Update List'}
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, UID, ID numbers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                focus:outline-none focus:ring-[#008766] focus:border-transparent 
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  UID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Programs
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Remarks
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : paginatedEntries.length > 0 ? (
                paginatedEntries.map((entry) => (
                  <tr
                    key={entry.uid}
                    onClick={() => setSelectedEntry(entry)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                      {entry.uid}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                      <div>
                        <div className="font-medium">{entry.name}</div>
                        {entry.aka_names && entry.aka_names.length > 0 && (
                          <div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAkaExpansion(entry.uid);
                              }}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 flex items-center"
                            >
                              {expandedAkas.has(entry.uid) ? (
                                <ChevronDown className="w-3 h-3 mr-1" />
                              ) : (
                                <ChevronRight className="w-3 h-3 mr-1" />
                              )}
                              {entry.aka_names.length} AKA{entry.aka_names.length > 1 ? 's' : ''}
                            </button>
                            {expandedAkas.has(entry.uid) && (
                              <div className="ml-4 mt-1 space-y-1">
                                {entry.aka_names.map((aka, index) => (
                                  <div
                                    key={index}
                                    className="text-xs text-gray-600 dark:text-gray-400"
                                  >
                                    • {aka}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                      {entry.type}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {renderProgramBadges(entry.programs)}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                      {entry.remarks || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No entries found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Updated Pagination */}
        {filteredEntries.length > ITEMS_PER_PAGE && (
          <div className="mt-4 flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-3 rounded-lg">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <span>
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredEntries.length)} of {filteredEntries.length} entries
              </span>
            </div>
            <div className="flex items-center space-x-1">
              {getVisiblePages().map((page, index) => (
                <button
                  key={index}
                  onClick={() => typeof page === 'number' && handlePageChange(page)}
                  className={`px-3 py-1 text-sm font-medium rounded-md 
                    ${page === currentPage
                      ? 'bg-[#008766] text-white'
                      : page === '...'
                      ? 'bg-transparent text-gray-500 dark:text-gray-400 cursor-default'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  disabled={page === '...'}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {renderDetailsModal()}
    </div>
  );
}

export default SDNList;
