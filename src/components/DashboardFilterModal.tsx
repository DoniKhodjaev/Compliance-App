import { useRef, useEffect } from 'react';

interface DashboardFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: DashboardFilters) => void;
}

interface DashboardFilters {
  dateFrom?: string;
  dateTo?: string;
  amountFrom?: string;
  amountTo?: string;
  status?: string;
  senderName?: string;
  receiverName?: string;
  bankName?: string;
  reference?: string;
}

export function DashboardFilterModal({ 
  isOpen, 
  onClose, 
  onApplyFilters 
}: DashboardFilterModalProps) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Add your filter logic here and call onApplyFilters with the filter values
    const filters: DashboardFilters = {
      // Add your filter values here
    };
    onApplyFilters(filters);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6">
        <form onSubmit={handleSubmit}>
          {/* Add your filter form fields here */}
          <div className="flex justify-end mt-6 space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Apply Filters
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 