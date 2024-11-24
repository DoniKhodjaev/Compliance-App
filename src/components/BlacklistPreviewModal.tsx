import { useRef, useEffect, useState } from 'react';
import { X, Download, Upload, RefreshCw } from 'lucide-react';
import { transliterate } from 'transliteration';
import type { BlacklistEntry } from '../types';

interface BlacklistPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  previewData: Omit<BlacklistEntry, 'id' | 'dateAdded'>[];
  isProcessing: boolean;
  onDownloadSample: () => void;
  onImport: (selectedRows: number[]) => Promise<void>;
  onConfirmImport: () => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function BlacklistPreviewModal({
  isOpen,
  onClose,
  data,
  previewData,
  isProcessing,
  onDownloadSample,
  onImport,
  onConfirmImport,
  onFileSelect
}: BlacklistPreviewModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);

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

  useEffect(() => {
    if (selectAll) {
      setSelectedRows(data.map((_, index) => index));
    } else {
      setSelectedRows([]);
    }
  }, [selectAll, data]);

  const toggleRow = (index: number) => {
    setSelectedRows(prev => 
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleRowClick = (index: number) => {
    toggleRow(index);
  };

  const handleFileButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const renderPreviewData = (entry: Omit<BlacklistEntry, 'id' | 'dateAdded'>) => (
    <div key={entry.names.fullNameEn} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            English Names
          </h4>
          <div className="space-y-2">
            <p className="text-sm text-gray-900 dark:text-white">
              <span className="font-medium">Full Name:</span> {entry.names.fullNameEn}
            </p>
            {entry.names.shortNameEn && (
              <p className="text-sm text-gray-900 dark:text-white">
                <span className="font-medium">Short Name:</span> {entry.names.shortNameEn}
              </p>
            )}
            {entry.names.abbreviationEn && (
              <p className="text-sm text-gray-900 dark:text-white">
                <span className="font-medium">Abbreviation:</span> {entry.names.abbreviationEn}
              </p>
            )}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Russian Names
          </h4>
          <div className="space-y-2">
            <p className="text-sm text-gray-900 dark:text-white">
              <span className="font-medium">Full Name:</span> {entry.names.fullNameRu}
            </p>
            {entry.names.shortNameRu && (
              <p className="text-sm text-gray-900 dark:text-white">
                <span className="font-medium">Short Name:</span> {entry.names.shortNameRu}
              </p>
            )}
            {entry.names.abbreviationRu && (
              <p className="text-sm text-gray-900 dark:text-white">
                <span className="font-medium">Abbreviation:</span> {entry.names.abbreviationRu}
              </p>
            )}
          </div>
        </div>
      </div>
      {entry.inn && (
        <div className="mt-3 text-sm text-gray-900 dark:text-white">
          <span className="font-medium">INN:</span> {entry.inn}
        </div>
      )}
      {entry.notes && (
        <div className="mt-3 text-sm text-gray-900 dark:text-white">
          <span className="font-medium">Notes:</span> {entry.notes}
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Import Blacklist Entries
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-4 flex justify-between items-center">
          <div className="flex flex-col space-y-1">
            <div className="relative">
              <button
                onClick={handleFileButtonClick}
                className="flex items-center px-4 py-2 bg-[#008766] text-white rounded-md hover:bg-[#007055] cursor-pointer"
              >
                <Upload className="w-4 h-4 mr-2" />
                Select CSV File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={onFileSelect}
                className="hidden"
              />
            </div>
            <button
              onClick={onDownloadSample}
              className="flex items-center px-4 py-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
            >
              <Download className="w-4 h-4 mr-1" />
              Download Sample Template
            </button>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {selectedRows.length} rows selected
          </span>
        </div>

        {previewData.length > 0 ? (
          <div className="max-h-[60vh] overflow-y-auto space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Preview Data
            </h3>
            {previewData.map(renderPreviewData)}
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={() => setSelectAll(!selectAll)}
                      className="rounded border-gray-300 dark:border-gray-600 text-[#008766] focus:ring-[#008766] focus:ring-offset-0 bg-white dark:bg-gray-700"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Full Name (EN)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Full Name (RU)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    INN
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {data.map((row, index) => (
                  <tr 
                    key={index}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer
                      ${selectedRows.includes(index) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                    onClick={() => handleRowClick(index)}
                  >
                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(index)}
                        onChange={() => toggleRow(index)}
                        className="rounded border-gray-300 dark:border-gray-600 text-[#008766] focus:ring-[#008766] focus:ring-offset-0 bg-white dark:bg-gray-700"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {row.fullNameEn}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {row.fullNameRu}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {row.inn || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Cancel
          </button>
          {previewData.length > 0 ? (
            <button
              onClick={onConfirmImport}
              disabled={isProcessing}
              className="px-4 py-2 bg-[#008766] text-white rounded-lg hover:bg-[#007055]"
            >
              Confirm Import
            </button>
          ) : (
            <button
              onClick={() => onImport(selectedRows)}
              disabled={selectedRows.length === 0 || isProcessing}
              className={`flex items-center px-4 py-2 rounded-lg text-white
                ${selectedRows.length === 0 || isProcessing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#008766] hover:bg-[#007055]'}`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Preview Selected'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 