import React, { useState, useEffect } from 'react';
import { Filter, Users, CheckCircle } from 'lucide-react';
import _api from '../../utils/api-client';
import type { AppointmentFilters, AppointmentStatus } from '../../types/calendar';

interface CalendarFiltersProps {
  filters: AppointmentFilters;
  onFiltersChange: (filters: AppointmentFilters) => void;
  salonId: string;
  token: string;
}

interface Staff {
  id: string;
  name: string;
  color?: string;
}

const statusOptions: { value: AppointmentStatus; label: string; color: string }[] = [
  { value: 'PENDING', label: 'Oczekująca', color: 'bg-warning/10 border border-warning/20 text-warning-foreground' },
  { value: 'CONFIRMED', label: 'Potwierdzona', color: 'bg-info/10 border border-info/20 text-info-foreground' },
  { value: 'COMPLETED', label: 'Zakończona', color: 'bg-success/10 border border-success/20 text-success' },
  { value: 'CANCELED', label: 'Anulowana', color: 'bg-error/10 border border-error/20 text-error-foreground' }
];

export const CalendarFilters: React.FC<CalendarFiltersProps> = ({
  filters,
  onFiltersChange,
  salonId,
  token
}) => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStaff = async () => {
      if (!salonId || !token) return;
      
      setLoading(true);
      try {
        // Подключение к нашему Staff API через nginx proxy
        const response = await fetch('/api/crm/staff', {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success && data.data) {
          // Преобразуем формат данных для календаря
          const staffForCalendar = data.data
            .filter((member: any) => member.role === 'STAFF_MEMBER')
            .map((member: any) => ({
              id: member.id,
              name: `${member.firstName} ${member.lastName}`,
              color: member.color || '#6366f1'
            }));
          setStaff(staffForCalendar);
        }
      } catch (error) {
        console.error('Failed to fetch staff:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchStaff();
  }, [salonId, token]);

  const toggleStaff = (staffId: string) => {
    const newStaffIds = filters.staffIds.includes(staffId)
      ? filters.staffIds.filter(id => id !== staffId)
      : [...filters.staffIds, staffId];
    
    onFiltersChange({ ...filters, staffIds: newStaffIds });
  };

  const toggleStatus = (status: AppointmentStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    
    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  const selectAllStaff = () => {
    onFiltersChange({ ...filters, staffIds: (staff || []).map(s => s.id) });
  };

  const clearAllStaff = () => {
    onFiltersChange({ ...filters, staffIds: [] });
  };

  const selectAllStatuses = () => {
    onFiltersChange({ ...filters, statuses: statusOptions.map(s => s.value) });
  };

  const clearAllStatuses = () => {
    onFiltersChange({ ...filters, statuses: [] });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Filter className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-medium text-foreground">Filtry</h3>
      </div>

      {/* Staff Filters */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium text-foreground">Pracownicy</h4>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={selectAllStaff}
              className="text-xs text-info hover:text-info/80"
            >
              Wszyscy
            </button>
            <button
              onClick={clearAllStaff}
              className="text-xs text-muted-foreground hover:text-muted-foreground"
            >
              Wyczyść
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {(staff || []).map((member) => (
              <label key={member.id} className="flex items-center space-x-3 cursor-pointer hover:bg-muted p-2 rounded">
                <input
                  type="checkbox"
                  checked={filters.staffIds.includes(member.id)}
                  onChange={() => toggleStaff(member.id)}
                  className="rounded border-border text-info focus:ring-info"
                />
                <div className="flex items-center space-x-2">
                  {member.color && (
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: member.color }}
                    />
                  )}
                  <span className="text-sm text-foreground">{member.name}</span>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Status Filters */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium text-foreground">Statusy</h4>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={selectAllStatuses}
              className="text-xs text-info hover:text-info/80"
            >
              Wszystkie
            </button>
            <button
              onClick={clearAllStatuses}
              className="text-xs text-muted-foreground hover:text-muted-foreground"
            >
              Wyczyść
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {statusOptions.map((status) => (
            <label key={status.value} className="flex items-center space-x-3 cursor-pointer hover:bg-muted p-2 rounded">
              <input
                type="checkbox"
                checked={filters.statuses.includes(status.value)}
                onChange={() => toggleStatus(status.value)}
                className="rounded border-border text-info focus:ring-info"
              />
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                {status.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Active Filters Summary */}
      {(filters.staffIds.length > 0 || filters.statuses.length < statusOptions.length) && (
        <div className="pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground mb-2">Aktywne filtry:</div>
          <div className="space-y-1 text-xs">
            {filters.staffIds.length > 0 && (
              <div>Pracownicy: {filters.staffIds.length}</div>
            )}
            {filters.statuses.length < statusOptions.length && (
              <div>Statusy: {filters.statuses.length}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
