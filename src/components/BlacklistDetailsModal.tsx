import { useRef, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { BlacklistEntry } from '../types';
import { transliterate } from 'transliteration';

interface BlacklistDetailsModalProps {
  entry: BlacklistEntry;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<BlacklistEntry>) => void;
}

export function BlacklistDetailsModal({
  entry,
  isOpen,
  onClose,
  onSave
}: BlacklistDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState(entry.notes || '');

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
    onSave({ notes });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Blacklist Entry Details
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* English Names Section */}
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              English Names
            </h4>
            <div className="space-y-2">
              <p className="text-sm text-gray-900 dark:text-white">
                <span className="font-medium">Full Name:</span> {transliterate(entry.names.fullNameEn)}
              </p>
              {entry.names.shortNameEn && (
                <p className="text-sm text-gray-900 dark:text-white">
                  <span className="font-medium">Short Name:</span> {transliterate(entry.names.shortNameEn)}
                </p>
              )}
              {entry.names.abbreviationEn && (
                <p className="text-sm text-gray-900 dark:text-white">
                  <span className="font-medium">Abbreviation:</span> {entry.names.abbreviationEn}
                </p>
              )}
            </div>
          </div>

          {/* Russian Names Section */}
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
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

          {/* INN Section */}
          {entry.inn && (
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                INN
              </h4>
              <p className="text-sm text-gray-900 dark:text-white">
                {entry.inn}
              </p>
            </div>
          )}

          {/* Notes Section */}
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

          {/* Date Added */}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Added: {new Date(entry.dateAdded).toLocaleString()}
          </div>

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