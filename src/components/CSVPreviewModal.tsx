import { useRef, useEffect, useState } from 'react';
import { X, Download, Upload, RefreshCw } from 'lucide-react';
import { transliterate } from 'transliteration';
import type { PreviewData } from '../types';

interface CSVPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  previewData: PreviewData[];
  isProcessing: boolean;
  onDownloadSample: () => void;
  onImport: (selectedRows: number[]) => Promise<void>;
  onConfirmImport: () => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CSVPreviewModal({
  isOpen,
  onClose,
  data,
  previewData,
  isProcessing,
  onDownloadSample,
  onImport,
  onConfirmImport,
  onFileSelect
}: CSVPreviewModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);

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

  const renderPreviewData = (entity: PreviewData) => (
    <div key={entity.name} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white">
            {transliterate(entity.name)}
          </h4>
          {entity.inn && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              INN: {entity.inn}
            </p>
          )}
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full 
          ${entity.source === 'orginfo' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'}`}
        >
          {entity.source.toUpperCase()}
        </span>
      </div>

      {entity.CEO && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          CEO: {transliterate(entity.CEO)}
        </p>
      )}

      {entity.Founders && entity.Founders.length > 0 && (
        <div className="mt-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Founders:
          </p>
          <ul className="ml-4 mt-1 space-y-1">
            {entity.Founders.map((founder, index) => (
              <li key={index} className="text-sm text-gray-600 dark:text-gray-400">
                {transliterate(founder.owner)}
              </li>
            ))}
          </ul>
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
            Import Common Entities
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={onDownloadSample}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm flex items-center"
            >
              <Download className="w-4 h-4 mr-1" />
              Download Sample Template
            </button>
            <label className="flex items-center px-4 py-2 bg-[#008766] text-white rounded-md hover:bg-[#007055] cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              Select CSV File
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={onFileSelect}
              />
            </label>
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
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    INN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Source
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
                      {transliterate(row.name)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {row.inn || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full 
                        ${row.source === 'orginfo' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'}`}
                      >
                        {row.source.toUpperCase()}
                      </span>
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