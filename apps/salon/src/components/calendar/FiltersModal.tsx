import React from 'react';
import { X } from 'lucide-react';
import { CalendarFilters } from './CalendarFilters';
import type { AppointmentFilters } from '../../types/calendar';

interface FiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: AppointmentFilters;
  onFiltersChange: (filters: AppointmentFilters) => void;
  salonId: string;
  token: string;
}

export const FiltersModal: React.FC<FiltersModalProps> = ({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  salonId,
  token
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-card rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">
              Filtry kalendáře
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
          
          {/* Filters Content */}
          <div className="overflow-y-auto max-h-[60vh]">
            <CalendarFilters
              filters={filters}
              onFiltersChange={onFiltersChange}
              salonId={salonId}
              token={token}
            />
          </div>
          
          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-border">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Zamknij
            </button>
            <button
              onClick={() => {
                // Reset filters to default
                onFiltersChange({
                  staffIds: [],
                  statuses: ['PENDING', 'CONFIRMED', 'COMPLETED']
                });
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Resetuj filtry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};