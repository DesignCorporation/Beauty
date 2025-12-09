import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StaffCard } from '../StaffCard';

interface StaffMember {
  id: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  avatar?: string;
  rating?: number;
  reviewCount?: number;
}

interface StaffSelectionCardProps {
  staff: StaffMember[];
  selectedStaffIds: string[];
  onChange: (staffId: string) => void;
}

export function StaffSelectionCard({
  staff,
  selectedStaffIds,
  onChange
}: StaffSelectionCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-lg">
          <User className="w-6 h-6 mr-3" />
          {t('appointmentForm.sections.staff')} *
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {staff.length > 0 ? (
            staff.map((member) => (
              <StaffCard
                key={member.id}
                staff={member as any}
                selected={selectedStaffIds.includes(member.id)}
                onClick={() => onChange(member.id)}
                className="w-24"
              />
            ))
          ) : (
            <div className="text-muted-foreground text-center py-8">
              {t('appointmentForm.messages.noStaff')}
            </div>
          )}
        </div>
        {selectedStaffIds.length === 0 && (
          <div className="text-error text-sm mt-2">
            {t('appointmentForm.validation.selectStaff')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
