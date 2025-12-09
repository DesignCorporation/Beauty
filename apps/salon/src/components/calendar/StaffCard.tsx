import React from 'react';
import type { StaffMember } from '../../hooks/useStaff';

type StaffCardMember = StaffMember & {
  name?: string;
  active?: boolean;
  spokenLocales?: string[];
  availableServices?: string[];
};

interface StaffCardProps {
  staff: StaffCardMember;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export const StaffCard: React.FC<StaffCardProps> = ({
  staff,
  selected,
  onClick,
  disabled = false,
  className = ''
}) => {
  // Generate initials from name
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  // Generate color based on staff member's name for consistency
  const palette = [
    '#3b82f6',
    '#10b981',
    '#8b5cf6',
    '#ec4899',
    '#6366f1',
    '#ef4444',
    '#eab308',
    '#14b8a6',
  ];
  const displayName = staff.name || `${staff.firstName} ${staff.lastName}`.trim();
  const initials = getInitials(displayName);

  // Get staff color as CSS color value
  const getStaffColorValue = () => {
    if (staff.color) return staff.color;
    const hash = Array.from(displayName).reduce<number>((acc, char) => acc + char.charCodeAt(0), 0);
    return palette[hash % palette.length];
  };


  return (
    <div className={`flex-shrink-0 ${className}`}>
      <button
        onClick={onClick}
        disabled={disabled}
        title={`${displayName}\n${staff.role}${staff.spokenLocales?.length ? '\nLanguages: ' + staff.spokenLocales.join(', ') : ''}${staff.availableServices?.length ? '\nServices: ' + staff.availableServices.length + ' available' : ''}`}
        className={`
          w-full cursor-pointer transition-all duration-200 p-1 rounded-lg relative group
          ${selected 
            ? '' 
            : ''
          }
          ${disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : ''
          }
        `}
        style={{
          backgroundColor: selected || !disabled ? 'transparent' : 'transparent'
        }}
        onMouseEnter={(e) => {
          if (!disabled && !selected) {
            const avatar = e.currentTarget.querySelector('.avatar-container') as HTMLElement;
            const img = avatar?.querySelector('img') as HTMLImageElement;
            if (avatar) {
              avatar.style.boxShadow = `0 6px 16px ${getStaffColorValue()}30`;
            }
            if (img) {
              img.style.filter = 'grayscale(50%)';
              img.style.opacity = '0.9';
            }
          }
        }}
        onMouseLeave={(e) => {
          if (!selected) {
            const avatar = e.currentTarget.querySelector('.avatar-container') as HTMLElement;
            const img = avatar?.querySelector('img') as HTMLImageElement;
            if (avatar) {
              avatar.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }
            if (img) {
              img.style.filter = 'grayscale(100%)';
              img.style.opacity = '0.8';
            }
          }
        }}
      >
        {/* Avatar Circle - 90px + 6px обводка для лучшего качества */}
        <div 
          className="avatar-container rounded-full mx-auto relative flex items-center justify-center shadow-md transition-all duration-200"
          style={{ 
            width: '90px',
            height: '90px',
            border: selected 
              ? `6px solid ${getStaffColorValue()}` 
              : '6px solid rgba(0,0,0,0.1)',
            boxShadow: selected 
              ? `0 4px 12px ${getStaffColorValue()}40` 
              : '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          {staff.avatarUrl ? (
            <img 
              src={staff.avatarUrl} 
              alt={displayName}
              className="rounded-full object-cover w-full h-full transition-all duration-300"
              style={{
                filter: selected ? 'none' : 'grayscale(100%)',
                opacity: selected ? 1 : 0.8
              }}
            />
          ) : (
            <div 
              className="rounded-full flex items-center justify-center text-white font-semibold text-xl w-full h-full"
              style={{ 
                backgroundColor: getStaffColorValue(),
                border: 'none'
              }}
            >
              {initials}
            </div>
          )}
          
          {/* Online status indicator (if available) */}
          {staff.active && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-white" />
          )}
        </div>

        {/* Tooltip on hover - стильная подсказка в цвет мастера */}
        <div 
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-3 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50"
          style={{ 
            backgroundColor: getStaffColorValue(),
            boxShadow: `0 8px 25px ${getStaffColorValue()}40`
          }}
        >
          <div className="font-semibold text-white text-sm">{displayName}</div>
          <div className="text-white opacity-90 text-xs mt-0.5">{staff.role}</div>
          {staff.spokenLocales?.length && (
            <div className="text-white opacity-80 text-xs mt-1">
              🌍 {staff.spokenLocales.join(', ')}
            </div>
          )}
          {staff.availableServices?.length && (
            <div className="text-white opacity-80 text-xs">
              ⚡ {staff.availableServices.length} услуг
            </div>
          )}
        </div>
      </button>
    </div>
  );
};
