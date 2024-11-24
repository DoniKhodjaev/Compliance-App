import { useState } from 'react';
import { Download, Upload, RefreshCw, Trash2, Edit2, CheckCircle, AlertTriangle, Shield } from 'lucide-react';
import type { CommonEntity } from '../types';
import { transliterate } from 'transliteration';
import { CSVPreviewModal } from './CSVPreviewModal';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { OfacChecker } from '../utils/ofacChecker';

interface CommonEntitiesManagerProps {
  entities: CommonEntity[];
  onDeleteEntity: (id: string) => void;
  isChecking: boolean;
  onCheckSelected: (entities: CommonEntity[]) => void;
  onEditEntity: (entity: CommonEntity) => void;
  onAddEntity: (entity: Omit<CommonEntity, 'id'>) => void;
}

interface PreviewData {
  name: string;
  inn: string;
  source: 'egrul' | 'orginfo';
  CEO: string;
  Founders: Array<{
    owner: string;
    isCompany: boolean;
    companyDetails?: {
      name: string;
      CEO?: string;
      Founders?: Array<any>;
    };
  }>;
  status: 'clean' | 'needs_review' | 'flagged';
  lastChecked: string;
  notes: string;
  originalData: {
    name: string;
    inn: string;
    source: 'egrul' | 'orginfo';
  };
}

export function CommonEntitiesManager({
  entities,
  onDeleteEntity,
  isChecking,
  onCheckSelected,
  onEditEntity,
  onAddEntity
}: CommonEntitiesManagerProps) {
  const [selectedEntities, setSelectedEntities] = useState<CommonEntity[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData[]>([]);

  const handleSelectEntity = (entity: CommonEntity) => {
    setSelectedEntities(prev => 
      prev.some(e => e.id === entity.id)
        ? prev.filter(e => e.id !== entity.id)
        : [...prev, entity]
    );
  };

  const handleSelectAll = () => {
    setSelectedEntities(selectedEntities.length === entities.length ? [] : entities);
  };

  const filteredEntities = entities.filter(entity =>
    entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entity.inn?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderStatus = (status: CommonEntity['status']) => {
    switch (status) {
      case 'flagged':
        return (
          <span className="flex items-center text-red-600 dark:text-red-400" title="100% OFAC match">
            <Shield className="w-4 h-4 mr-1" />
            Flagged
          </span>
        );
      case 'needs_review':
        return (
          <span className="flex items-center text-yellow-600 dark:text-yellow-400" title="Potential OFAC match">
            <AlertTriangle className="w-4 h-4 mr-1" />
            Needs Review
          </span>
        );
      case 'clean':
        return (
          <span className="flex items-center text-green-600 dark:text-green-400" title="No OFAC match">
            <CheckCircle className="w-4 h-4 mr-1" />
            Clean
          </span>
        );
      default:
        return null;
    }
  };

  const renderSourceBadge = (source: 'orginfo' | 'egrul') => {
    switch (source) {
      case 'orginfo':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full 
            bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            ORGINFO
          </span>
        );
      case 'egrul':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full 
            bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            EGRUL
          </span>
        );
      default:
        return null;
    }
  };

  const downloadSampleCSV = () => {
    const headers = "Name,INN,Source\n";
    const sampleData = "Example Company,1234567890,EGRUL\nTest Organization,,ORGINFO\n";
    const csvContent = headers + sampleData;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "common_entities_template.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExport = () => {
    const csvContent = [
      ["Name", "INN", "Source", "CEO", "Status", "Notes", "Last Checked"],
      ...entities.map(entity => [
        entity.name,
        entity.inn || '',
        entity.source,
        entity.CEO || '',
        entity.status,
        entity.notes || '',
        entity.lastChecked || ''
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `common_entities_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleImportClick = () => {
    setIsImportModalOpen(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const rows = text.split('\n');
      const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
      
      const data = rows.slice(1)
        .filter(row => row.trim())
        .map(row => {
          const values = row.split(',');
          const rowData: Record<string, string> = {};
          headers.forEach((header, index) => {
            rowData[header] = values[index]?.trim() || '';
          });
          return {
            name: rowData['name'],
            inn: rowData['inn'],
            source: (rowData['source'] || '').toLowerCase() as 'egrul' | 'orginfo'
          };
        })
        .filter(row => row.name && row.source && ['egrul', 'orginfo'].includes(row.source));

      setImportData(data);
    };
    reader.readAsText(file);

    // Reset the input
    event.target.value = '';
  };

  const handlePreviewData = async (selectedRows: number[]) => {
    setIsProcessing(true);
    try {
      const results = await Promise.all(
        selectedRows.map(async (index) => {
          const row = importData[index];
          let entityData;
  
          if (row.source === 'egrul' && row.inn) {
            const response = await axios.get(
              `${import.meta.env.VITE_BACKEND_URL2}/api/search-egrul`,
              {
                params: { inn: row.inn },
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json',
                },
              }
            );
            entityData = response.data;
          } else if (row.source === 'orginfo' && row.name) {
            const response = await axios.get(
              `${import.meta.env.VITE_BACKEND_URL2}/api/search-orginfo`,
              {
                params: { company_name: row.name },
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json',
                },
              }
            );
            entityData = response.data;
          }
  
          if (entityData && !entityData.error) {
            // Initialize OFAC checker
            await OfacChecker.initialize();

            // Check entity name
            const nameResult = await OfacChecker.checkName(entityData.name || row.name);
            
            // Check CEO if exists
            let ceoResult = null;
            if (entityData.CEO) {
              ceoResult = await OfacChecker.checkName(entityData.CEO);
            }

            // Determine status based on OFAC check results
            let status: CommonEntity['status'] = 'clean';
            
            // If any check has a 100% match, mark as flagged
            if (nameResult.matchScore === 1 || (ceoResult && ceoResult.matchScore === 1)) {
              status = 'flagged';
            }
            // If any check has a high match (>= 85%), mark as needs review
            else if (nameResult.matchScore >= 0.85 || (ceoResult && ceoResult.matchScore >= 0.85)) {
              status = 'needs_review';
            }

            return {
              name: entityData.name || row.name,
              inn: entityData.inn || row.inn || '',
              source: row.source as 'egrul' | 'orginfo',
              CEO: entityData.CEO || '',
              Founders: entityData.Founders || [],
              status,  // Use the determined status
              lastChecked: new Date().toISOString(),
              notes: '',
              originalData: {
                name: row.name,
                inn: row.inn || '',
                source: row.source,
              },
            };
          }
          return null;
        })
      );
  
      const validResults = results.filter((result): result is PreviewData => 
        result !== null
      );
  
      setPreviewData(validResults);
    } catch (error) {
      console.error('Error processing preview:', error);
      toast.error('Failed to fetch entity details');
    } finally {
      setIsProcessing(false);
    }
  };
  

  const handleConfirmImport = () => {
    try {
      // Process each preview data item
      previewData.forEach(data => {
        const newEntity: Omit<CommonEntity, 'id'> = {
          name: data.name,
          inn: data.inn || '',
          source: data.source,
          CEO: data.CEO || '',
          Founders: data.Founders || [],
          status: 'clean',
          lastChecked: new Date().toISOString(),
          notes: ''
        };
        
        console.log('Adding entity:', newEntity); // Debug log
        onAddEntity(newEntity);
      });

      // Show success message
      toast.success(`Successfully imported ${previewData.length} entities`, {
        duration: 3000,
        position: 'top-right',
        style: {
          background: '#008766',
          color: '#fff',
          borderRadius: '8px',
        },
      });

      // Clear the preview data and close the modal
      setPreviewData([]);
      setImportData([]);
      setIsImportModalOpen(false);
    } catch (error) {
      console.error('Error during import:', error);
      toast.error('Failed to import entities', {
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Common Entities
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
            onClick={handleImportClick}
            className="flex items-center px-4 py-2 bg-[#008766] text-white rounded-md hover:bg-[#007055]"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </button>
          <button 
            onClick={() => onCheckSelected(selectedEntities)}
            disabled={isChecking || selectedEntities.length === 0}
            className={`flex items-center px-4 py-2 rounded-md text-white
              ${isChecking || selectedEntities.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-[#008766] hover:bg-[#007055]'}`}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
            Check Selected ({selectedEntities.length})
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or INN..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
            focus:outline-none focus:ring-[#008766] focus:border-transparent
            bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedEntities.length === entities.length}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-[#008766] 
                    focus:ring-[#008766] focus:ring-offset-0 
                    bg-white dark:bg-gray-700 
                    border-gray-300 dark:border-gray-600
                    checked:bg-[#008766] dark:checked:bg-[#008766]
                    hover:bg-gray-100 dark:hover:bg-gray-600
                    checked:hover:bg-[#008766] dark:checked:hover:bg-[#008766]
                    accent-[#008766]"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                INN
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Notes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Last Checked
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredEntities.map(entity => (
              <tr 
                key={entity.id} 
                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => onEditEntity(entity)}
              >
                <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedEntities.some(e => e.id === entity.id)}
                    onChange={() => handleSelectEntity(entity)}
                    className="w-4 h-4 rounded border-gray-300 text-[#008766] 
                      focus:ring-[#008766] focus:ring-offset-0 
                      bg-white dark:bg-gray-700 
                      border-gray-300 dark:border-gray-600
                      checked:bg-[#008766] dark:checked:bg-[#008766]
                      hover:bg-gray-100 dark:hover:bg-gray-600
                      checked:hover:bg-[#008766] dark:checked:hover:bg-[#008766]
                      accent-[#008766]"
                  />
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  {transliterate(entity.name)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  {entity.inn || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  {renderSourceBadge(entity.source)}
                </td>
                <td className="px-6 py-4 text-sm">
                  {renderStatus(entity.status)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  {entity.notes ? (
                    <span className="truncate max-w-xs block" title={entity.notes}>
                      {entity.notes}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500 italic">
                      No notes
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  {entity.lastChecked 
                    ? new Date(entity.lastChecked).toLocaleString()
                    : 'Never'}
                </td>
                <td className="px-6 py-4 text-sm" onClick={e => e.stopPropagation()}>
                  <div className="flex space-x-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditEntity(entity);
                      }}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteEntity(entity.id);
                      }}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CSVPreviewModal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setPreviewData([]);
          setImportData([]);
        }}
        data={importData}
        previewData={previewData}
        isProcessing={isProcessing}
        onDownloadSample={downloadSampleCSV}
        onImport={handlePreviewData}
        onConfirmImport={handleConfirmImport}
        onFileSelect={handleFileUpload}
      />
    </div>
  );
} 