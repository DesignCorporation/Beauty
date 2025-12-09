import { Card, CardContent, CardHeader, CardTitle, Badge } from '@beauty-platform/ui';
import { Users, Check, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Specialization labels mapping (Issue #82)
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

// Language flags for display (Issue #82)
const languageFlags: Record<string, string> = {
  pl: '🇵🇱',
  en: '🇬🇧',
  ru: '🇷🇺',
  ua: '🇺🇦',
};

interface Staff {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role?: string;
  avatar?: string;
  avatarUrl?: string;
  rating?: number;
  reviewCount?: number;
  color?: string;
  active?: boolean;
  status?: string;
  specialization?: string | null;
  languages?: string[];
  serviceIds?: string[];
  servicesAvailable?: Array<{
    id?: string;
    serviceId: string;
    service?: { id?: string; name?: string };
  }>;
  matchingServiceNames?: string[];
  isCompatible?: boolean;
  incompatibleReason?: string;
}

interface StaffCardProps {
  editable: boolean;
  staff: Staff | null;
  staffMembers?: Staff[];
  allStaff?: Staff[];
  selectedStaffIds?: string[];
  onChange?: (staffId: string) => void;
}

export function StaffCard({
  editable,
  staff,
  staffMembers = [],
  allStaff = [],
  selectedStaffIds = [],
  onChange
}: StaffCardProps) {
  const { t } = useTranslation();

  const roleLabel = (role?: string) => {
    if (!role) return '';
    const key = `roles.${role}`;
    const translated = t(key, { defaultValue: '' }) as string;
    if (translated && translated !== key && translated.trim().length > 0) return translated;
    const fallback: Record<string, string> = {
      SALON_OWNER: 'Владелец',
      MANAGER: 'Менеджер',
      STAFF_MEMBER: 'Мастер',
      RECEPTIONIST: 'Администратор'
    };
    return fallback[role] ?? role;
  };

  const staffName = staff
    ? staff.name || `${staff.firstName || ''} ${staff.lastName || ''}`.trim()
    : t('appointmentForm.sections.staff');

  const renderViewMode = () => {
    if (staffMembers && staffMembers.length > 0) {
      return (
        <div className="space-y-3">
          {staffMembers.map(member => {
            const memberName = member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || t('appointmentForm.sections.staff');
            return (
              <div key={member.id} className="flex items-start gap-4">
                <div className="flex-shrink-0 relative">
                  {member.avatar || member.avatarUrl ? (
                    <img
                      src={member.avatar || member.avatarUrl}
                      alt={memberName}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <Users className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  {member.color && (
                    <div
                      className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background"
                      style={{ backgroundColor: member.color }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-base">{memberName}</p>
                  {member.role && (
                    <p className="text-xs text-muted-foreground">
                      {roleLabel(member.role)}
                    </p>
                  )}

                  {/* Specialization badge (Issue #82) */}
                  {member.specialization && (
                    <div className="mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {specializationLabels[member.specialization] || member.specialization}
                      </Badge>
                    </div>
                  )}

                  {/* Languages with flags (Issue #82) */}
                  {member.languages && member.languages.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {member.languages.slice(0, 3).map((lang) => (
                        <Badge key={lang} variant="outline" className="text-xs px-2 py-0.5">
                          {languageFlags[lang.toLowerCase()] || lang.toUpperCase()}
                        </Badge>
                      ))}
                      {member.languages.length > 3 && (
                        <Badge variant="outline" className="text-xs px-2 py-0.5">
                          +{member.languages.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {member.rating !== undefined && member.rating > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      <Star className="h-3.5 w-3.5 text-amber-500 inline-block mr-1" />
                    {member.rating.toFixed(1)} ({member.reviewCount || 0} reviews)
                  </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (!staff) {
      return <p className="text-sm text-muted-foreground">{t('common.noData')}</p>;
    }

    return (
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 relative">
          {staff.avatar || staff.avatarUrl ? (
            <img
              src={staff.avatar || staff.avatarUrl}
              alt={staffName}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
          {staff.color && (
            <div
              className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-background"
              style={{ backgroundColor: staff.color }}
              title={`Staff color: ${staff.color}`}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-base">{staffName}</p>
          {staff.role && (
            <p className="text-xs text-muted-foreground">
              {staff.role}
            </p>
          )}

          {/* Specialization badge (Issue #82) */}
          {staff.specialization && (
            <div className="mt-1">
              <Badge variant="secondary" className="text-xs">
                {specializationLabels[staff.specialization] || staff.specialization}
              </Badge>
            </div>
          )}

          {/* Languages with flags (Issue #82) */}
          {staff.languages && staff.languages.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {staff.languages.slice(0, 3).map((lang) => (
                <Badge key={lang} variant="outline" className="text-xs px-2 py-0.5">
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

          {staff.rating !== undefined && staff.rating > 0 && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              <span>
                {staff.rating.toFixed(1)} ({staff.reviewCount || 0} reviews)
              </span>
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderEditMode = () => (
    <div className="space-y-3">
      {allStaff.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t('appointmentForm.noStaffAvailable')}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-0 max-h-64 overflow-y-auto">
          {allStaff.map((member) => {
            const isSelected = selectedStaffIds.includes(member.id);
            const memberName = member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim();
            const isActive = member.active !== false && member.status !== 'INACTIVE';
            const meetsFilter = member.isCompatible !== false;
            const isEnabled = isActive && meetsFilter;

            return (
              <button
                key={member.id}
                type="button"
                onClick={() => onChange?.(member.id)}
                disabled={!isEnabled}
                className={`text-left px-0 py-3 border-0 border-b border-border/60 transition-colors ${
                  !isEnabled
                    ? 'opacity-50 cursor-not-allowed'
                    : isSelected
                    ? 'text-primary bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    {member.avatar || member.avatarUrl ? (
                      <img
                        src={member.avatar || member.avatarUrl}
                        alt={memberName}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <Users className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    {member.color && (
                      <div
                        className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background"
                        style={{ backgroundColor: member.color }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{memberName}</p>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    {member.role && (
                      <p className="text-xs text-muted-foreground">{roleLabel(member.role)}</p>
                    )}

                    {/* Specialization badge (Issue #82) */}
                    {member.specialization && (
                      <div className="mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {specializationLabels[member.specialization] || member.specialization}
                        </Badge>
                      </div>
                    )}

                    {/* Languages with flags (Issue #82) */}
                    {member.languages && member.languages.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {member.languages.slice(0, 3).map((lang) => (
                          <Badge key={lang} variant="outline" className="text-xs px-2 py-0.5">
                            {languageFlags[lang.toLowerCase()] || lang.toUpperCase()}
                          </Badge>
                        ))}
                        {member.languages.length > 3 && (
                          <Badge variant="outline" className="text-xs px-2 py-0.5">
                            +{member.languages.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {member.matchingServiceNames && member.matchingServiceNames.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('appointmentForm.staff.supportsServicesLabel', {
                          services: member.matchingServiceNames.join(', ')
                        })}
                      </p>
                    )}

                    {member.isCompatible === false && (
                      <p className="text-xs text-destructive mt-1">
                        {member.incompatibleReason || t('appointmentForm.staff.notAvailableForSelected')}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <Card className="border-0 border-t border-border/70 bg-transparent shadow-none rounded-none">
      <CardHeader className="px-4 pt-4 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Users className="w-5 h-5" />
          {t('appointmentForm.sections.staff')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-4">
        {editable ? renderEditMode() : renderViewMode()}
      </CardContent>
    </Card>
  );
}
