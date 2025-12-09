import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import { Users, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StaffInfo {
  id?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  avatar?: string;
  rating?: number;
  reviewCount?: number;
  color?: string;
}

interface StaffViewCardProps {
  staff: StaffInfo;
  staffName: string;
}

export function StaffViewCard({ staff, staffName }: StaffViewCardProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5" />
          {t('appointmentForm.detailsPage.staffCard', 'Master')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 relative">
            {staff.avatar ? (
              <img
                src={staff.avatar}
                alt={staffName}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
            {/* Color indicator */}
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
      </CardContent>
    </Card>
  );
}
