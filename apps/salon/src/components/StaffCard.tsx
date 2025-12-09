import React from 'react';
import { Badge } from '@beauty-platform/ui';
import { Star } from 'lucide-react';

// Language flags for display
const languageFlags: Record<string, string> = {
  pl: '🇵🇱',
  en: '🇬🇧',
  ru: '🇷🇺',
  ua: '🇺🇦',
};

// Specialization labels
const specializationLabels: Record<string, string> = {
  BARBER: 'Барбер',
  STYLIST: 'Стилист',
  NAIL_MASTER: 'Мастер маникюра',
  COLORIST: 'Колорист',
  GROOMER: 'Груммер',
  MAKEUP_ARTIST: 'Визажист',
  MASSAGE_THERAPIST: 'Массажист',
  AESTHETIC_SPECIALIST: 'Эстетолог',
  PIERCER: 'Пирсер',
  TATTOO_ARTIST: 'Татуировщик',
};

interface StaffCardProps {
  staff: {
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    role: string;
    active?: boolean;
    color?: string;
    status?: string;
    avatarUrl?: string;
    specialization?: string | null;
    languages?: string[];
    servicesCount?: number;
    rating?: number;
  };
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

  const getStaffColorValue = () => {
    if (staff.color) return staff.color;
    const hash = staff.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return palette[hash % palette.length];
  };

  const initials = getInitials(staff.name);

  const isActive = staff.active !== false && staff.status === 'ACTIVE';

  return (
    <div className={`flex-shrink-0 ${className}`}>
      <button
        onClick={onClick}
        disabled={disabled}
        title={`${staff.name}\n${staff.role}`}
        className={`
          w-full cursor-pointer transition-all duration-200 p-1 rounded-lg relative group
          ${disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : ''
          }
        `}
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
              alt={staff.name}
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
          {isActive && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-white" />
          )}
        </div>

        {/* Name below avatar */}
        <div className="mt-2 text-center">
          <div
            className={`text-sm font-medium transition-colors ${
              selected ? 'text-info' : 'text-muted-foreground'
            }`}
          >
            {staff.firstName || staff.name.split(' ')[0]}
          </div>
          <div className="text-xs text-muted-foreground">
            {staff.role === 'STAFF_MEMBER' ? 'Мастер' : staff.role}
          </div>

          {/* Specialization Badge */}
          {staff.specialization && (
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs">
                {specializationLabels[staff.specialization] || staff.specialization}
              </Badge>
            </div>
          )}

          {/* Languages with flags */}
          {staff.languages && staff.languages.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1 justify-center">
              {staff.languages.slice(0, 3).map((lang) => (
                <Badge
                  key={lang}
                  variant="outline"
                  className="text-xs px-2 py-0.5"
                >
                  {languageFlags[lang.toLowerCase()] || lang.toUpperCase()}
                </Badge>
              ))}
              {staff.languages.length > 3 && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  +{staff.languages.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Metrics */}
          {(staff.servicesCount !== undefined || staff.rating !== undefined) && (
            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              {staff.servicesCount !== undefined && (
                <span>{staff.servicesCount} услуг</span>
              )}
              {staff.rating !== undefined && staff.rating > 0 && (
                <div className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 fill-current text-yellow-500" />
                  <span>{staff.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
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
          <div className="font-semibold text-white text-sm">{staff.name}</div>
          <div className="text-white opacity-90 text-xs mt-0.5">
            {staff.role === 'STAFF_MEMBER' ? 'Мастер' : staff.role}
          </div>
          <div className="text-white opacity-80 text-xs">
            {isActive ? 'Активен' : 'Не активен'}
          </div>
        </div>
      </button>
    </div>
  );
};
