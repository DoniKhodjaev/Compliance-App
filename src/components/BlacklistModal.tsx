import { useRef, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { BlacklistEntry } from '../types';

interface BlacklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<BlacklistEntry, 'id' | 'dateAdded'>) => void;
  entry?: BlacklistEntry | null;
}

export function BlacklistModal({
  isOpen,
  onClose,
  onSave,
  entry
}: BlacklistModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    inn: '',
    names: {
      fullNameEn: '',
      fullNameRu: '',
      shortNameEn: '',
      shortNameRu: '',
      abbreviationEn: '',
      abbreviationRu: ''
    },
    notes: ''
  });

  useEffect(() => {
    if (entry) {
      setFormData({
        inn: entry.inn || '',
        names: entry.names,
        notes: entry.notes || ''
      });
    }
  }, [entry]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {entry ? 'Edit Blacklist Entry' : 'Add to Blacklist'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* INN Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              INN (Optional)
            </label>
            <input
              type="text"
              value={formData.inn}
              onChange={(e) => setFormData(prev => ({ ...prev, inn: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                focus:outline-none focus:ring-[#008766] focus:border-transparent 
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter INN"
            />
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="grid grid-cols-2 gap-6">
              {/* English Names */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  English Names
                </h4>
                <input
                  type="text"
                  value={formData.names.fullNameEn}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    names: { ...prev.names, fullNameEn: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                    focus:outline-none focus:ring-[#008766] focus:border-transparent 
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Full Name"
                  required
                />
                <input
                  type="text"
                  value={formData.names.shortNameEn}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    names: { ...prev.names, shortNameEn: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                    focus:outline-none focus:ring-[#008766] focus:border-transparent 
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Short Name"
                />
                <input
                  type="text"
                  value={formData.names.abbreviationEn}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    names: { ...prev.names, abbreviationEn: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                    focus:outline-none focus:ring-[#008766] focus:border-transparent 
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Abbreviation"
                />
              </div>

              {/* Russian Names */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Russian Names
                </h4>
                <input
                  type="text"
                  value={formData.names.fullNameRu}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    names: { ...prev.names, fullNameRu: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                    focus:outline-none focus:ring-[#008766] focus:border-transparent 
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Полное название"
                  required
                />
                <input
                  type="text"
                  value={formData.names.shortNameRu}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    names: { ...prev.names, shortNameRu: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                    focus:outline-none focus:ring-[#008766] focus:border-transparent 
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Краткое название"
                />
                <input
                  type="text"
                  value={formData.names.abbreviationRu}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    names: { ...prev.names, abbreviationRu: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                    focus:outline-none focus:ring-[#008766] focus:border-transparent 
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Аббревиатура"
                />
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                focus:outline-none focus:ring-[#008766] focus:border-transparent 
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
              placeholder="Add notes about this entity..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#008766] text-white rounded-lg hover:bg-[#007055]"
            >
              {entry ? 'Save Changes' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
