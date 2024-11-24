import { useState } from 'react';
import { Trash2, Edit2, Download, Upload, Plus } from 'lucide-react';
import type { BlacklistEntry } from '../types';
import { BlacklistModal } from './BlacklistModal';
import { BlacklistDeleteModal } from './BlacklistDeleteModal';
import { transliterate } from 'transliteration';
import { toast } from 'react-hot-toast';
import { BlacklistPreviewModal } from './BlacklistPreviewModal';
import Papa from 'papaparse';

interface BlacklistManagerProps {
  entries: BlacklistEntry[];
  onAddEntry: (entry: Omit<BlacklistEntry, 'id' | 'dateAdded'>) => void;
  onUpdateEntry: (id: string, entry: Omit<BlacklistEntry, 'id' | 'dateAdded'>) => void;
  onDeleteEntry: (id: string) => void;
}

export function BlacklistManager({ entries, onAddEntry, onUpdateEntry, onDeleteEntry }: BlacklistManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingEntry, setEditingEntry] = useState<BlacklistEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<BlacklistEntry | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<Omit<BlacklistEntry, 'id' | 'dateAdded'>[]>([]);

  const filteredEntries = entries.filter(entry => {
    const searchLower = searchTerm.toLowerCase();
    const searchTranslit = transliterate(searchLower);

    return (
      // Check INN
      entry.inn?.toLowerCase().includes(searchLower) ||
      
      // Check all name variations in both original and transliterated forms
      Object.values(entry.names).some(name => {
        const nameLower = name.toLowerCase();
        const nameTranslit = transliterate(nameLower);
        return nameLower.includes(searchLower) || 
               nameTranslit.includes(searchLower) ||
               nameLower.includes(searchTranslit) ||
               nameTranslit.includes(searchTranslit);
      }) ||
      
      // Check notes in both original and transliterated forms
      (entry.notes?.toLowerCase().includes(searchLower) ||
       transliterate(entry.notes || '').toLowerCase().includes(searchTranslit))
    );
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
  };

  const handleSave = (formData: Omit<BlacklistEntry, 'id' | 'dateAdded'>) => {
    if (editingEntry) {
      onUpdateEntry(editingEntry.id, formData);
      toast.success('Entry updated successfully', {
        duration: 3000,
        position: 'top-right',
        style: {
          background: '#008766',
          color: '#fff',
          borderRadius: '8px',
        },
      });
    } else {
      onAddEntry(formData);
      toast.success('Entry added successfully', {
        duration: 3000,
        position: 'top-right',
        style: {
          background: '#008766',
          color: '#fff',
          borderRadius: '8px',
        },
      });
    }
    handleCloseModal();
  };

  const handleEdit = (entry: BlacklistEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (entry: BlacklistEntry) => {
    setEntryToDelete(entry);
  };

  const handleConfirmDelete = () => {
    if (entryToDelete) {
      onDeleteEntry(entryToDelete.id);
      setEntryToDelete(null);
      toast.success('Entry deleted successfully', {
        duration: 3000,
        position: 'top-right',
        style: {
          background: '#008766',
          color: '#fff',
          borderRadius: '8px',
        },
      });
    }
  };

  const handleExport = () => {
    const headers = "INN,Full Name (EN),Full Name (RU),Short Name (EN),Short Name (RU),Abbreviation (EN),Abbreviation (RU),Notes,Date Added\n";
    const rows = entries.map(entry => [
      entry.inn || '',
      `"${entry.names.fullNameEn}"`,  // Add quotes to handle commas in names
      `"${entry.names.fullNameRu}"`,
      `"${entry.names.shortNameEn || ''}"`,
      `"${entry.names.shortNameRu || ''}"`,
      `"${entry.names.abbreviationEn || ''}"`,
      `"${entry.names.abbreviationRu || ''}"`,
      `"${entry.notes || ''}"`,
      new Date(entry.dateAdded).toISOString()
    ].join(','));
    
    // Add BOM for UTF-8 encoding
    const csvContent = '\ufeff' + headers + rows.join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `blacklist_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleRowClick = (entry: BlacklistEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: (results) => {
          const data = results.data.map((row: any) => {
            // Map CSV columns to expected format
            return {
              fullNameEn: row['Full Name (EN)'] || row['full_name_en'] || '',
              fullNameRu: row['Full Name (RU)'] || row['full_name_ru'] || '',
              shortNameEn: row['Short Name (EN)'] || row['short_name_en'] || '',
              shortNameRu: row['Short Name (RU)'] || row['short_name_ru'] || '',
              abbreviationEn: row['Abbreviation (EN)'] || row['abbreviation_en'] || '',
              abbreviationRu: row['Abbreviation (RU)'] || row['abbreviation_ru'] || '',
              inn: row['INN'] || row['inn'] || '',
              notes: row['Notes'] || row['notes'] || ''
            };
          }).filter(row => row.fullNameEn || row.fullNameRu);
          
          setImportData(data);
        },
        error: (error: Error) => {
          console.error('Error parsing CSV:', error);
          toast.error('Failed to parse CSV file');
        }
      });
    };

    reader.onerror = () => {
      console.error('Error reading file');
      toast.error('Failed to read CSV file');
    };

    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
  };

  const handleImport = async (selectedRows: number[]) => {
    setIsProcessing(true);
    try {
      const selectedData = selectedRows.map(index => importData[index]);
      const processedData = selectedData.map(row => ({
        names: {
          fullNameEn: row.fullNameEn,
          fullNameRu: row.fullNameRu,
          shortNameEn: row.shortNameEn,
          shortNameRu: row.shortNameRu,
          abbreviationEn: row.abbreviationEn,
          abbreviationRu: row.abbreviationRu,
        },
        inn: row.inn,
        notes: row.notes
      }));

      console.log('Processed data:', processedData); // Debug log
      setPreviewData(processedData);
    } catch (error) {
      console.error('Error processing data:', error);
      toast.error('Failed to process import data');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = () => {
    previewData.forEach(data => {
      onAddEntry(data);
    });

    toast.success(`Successfully imported ${previewData.length} entries`, {
      duration: 3000,
      position: 'top-right',
      style: {
        background: '#008766',
        color: '#fff',
        borderRadius: '8px',
      },
    });

    setPreviewData([]);
    setImportData([]);
    setIsImportModalOpen(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Internal Blacklist
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
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center px-4 py-2 bg-[#008766] text-white rounded-md hover:bg-[#007055]"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-[#008766] text-white rounded-md hover:bg-[#007055]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Entry
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, INN..."
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Name (EN)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Name (RU)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                INN
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Notes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Date Added
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredEntries.map(entry => (
              <tr 
                key={entry.id} 
                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => handleRowClick(entry)}
              >
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  {transliterate(entry.names.fullNameEn)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  {entry.names.fullNameRu}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  {entry.inn || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  {entry.notes || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  {new Date(entry.dateAdded).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm" onClick={e => e.stopPropagation()}>
                  <div className="flex space-x-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(entry);
                      }}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(entry);
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

      {/* Modals */}
      <BlacklistModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEntry(null);
        }}
        onSave={handleSave}
        entry={editingEntry}
      />

      {entryToDelete && (
        <BlacklistDeleteModal
          entry={entryToDelete}
          isOpen={!!entryToDelete}
          onClose={() => setEntryToDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      <BlacklistPreviewModal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setPreviewData([]);
          setImportData([]);
        }}
        data={importData}
        previewData={previewData}
        isProcessing={isProcessing}
        onDownloadSample={handleExport}
        onImport={handleImport}
        onConfirmImport={handleConfirmImport}
        onFileSelect={handleFileUpload}
      />
    </div>
  );
}