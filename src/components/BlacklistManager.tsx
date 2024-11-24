import { useState } from 'react';
import { Trash2, Search, Edit2, Download, Upload, Plus } from 'lucide-react';
import type { BlacklistEntry } from '../types';
import { BlacklistModal } from './BlacklistModal';
import { BlacklistDeleteModal } from './BlacklistDeleteModal';
import { useTranslateAndTransliterate } from '../hooks/useTranslateAndTransliterate';
import { transliterate } from 'transliteration';
import { toast } from 'react-hot-toast';

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
  const { t } = useTranslateAndTransliterate();

  const filteredEntries = entries.filter(entry => {
    const searchLower = searchTerm.toLowerCase();
    return (
      entry.inn?.toLowerCase().includes(searchLower) ||
      Object.values(entry.names).some(name => 
        name.toLowerCase().includes(searchLower)
      ) ||
      entry.notes?.toLowerCase().includes(searchLower)
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

  const downloadSampleCSV = () => {
    const headers = "INN,Full Name (EN),Full Name (RU),Short Name (EN),Short Name (RU),Abbreviation (EN),Abbreviation (RU),Notes\n";
    const sampleData = "123456789,Example Company Ltd,Пример Компания ООО,Example Co,Пример Ко,ECL,ПКО,Sample notes\n";
    const csvContent = headers + sampleData;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "blacklist_template.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleRowClick = (entry: BlacklistEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
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
            onClick={downloadSampleCSV}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <label className="flex items-center px-4 py-2 bg-[#008766] text-white rounded-md hover:bg-[#007055] cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            Import
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // Add CSV import logic here
                }
              }}
            />
          </label>
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

      <BlacklistDeleteModal
        entry={entryToDelete}
        isOpen={!!entryToDelete}
        onClose={() => setEntryToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}