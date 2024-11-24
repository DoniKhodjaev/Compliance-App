import { useRef, useEffect } from 'react';
import { X, AlertTriangle } from "lucide-react";
import type { BlacklistEntry } from "../types";
import { useTranslateAndTransliterate } from '../hooks/useTranslateAndTransliterate';

interface BlacklistDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  entry: BlacklistEntry;
}

export function BlacklistDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  entry,
}: BlacklistDeleteModalProps) {
  const { t } = useTranslateAndTransliterate();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full shadow-xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('confirmRemoval')}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
              {t('removeConfirmation')}
            </p>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500 dark:text-gray-400">
                  {t('englishNames')}:
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {entry.names.fullNameEn}
                </div>

                <div className="text-gray-500 dark:text-gray-400">
                  {t('russianNames')}:
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {entry.names.fullNameRu}
                </div>

                {entry.inn && (
                  <>
                    <div className="text-gray-500 dark:text-gray-400">INN:</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {entry.inn}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              {t('cancel')}
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 dark:hover:bg-red-500"
            >
              {t('removeEntry')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
