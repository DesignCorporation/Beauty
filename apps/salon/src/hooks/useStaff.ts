import { useState, useEffect } from 'react';
import { CRMApiService } from '../services/crmApiNew';
import { useAuthContext } from '../contexts/AuthContext';
import { debugLog, debugWarn } from '../utils/debug';

export interface StaffServiceCapability {
  id: string;
  serviceId: string;
  service?: {
    id?: string;
    name?: string;
    duration?: number;
  };
}

type RawStaffService = {
  id?: unknown;
  serviceId?: unknown;
  service?: {
    id?: unknown;
    name?: string;
    duration?: number;
  } | null;
};

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string | null;
  avatarUrl?: string | null;
  role: string;
  color?: string;
  status: string;
  createdAt: string;
  // New fields from UserSalonAccess
  salonAccessId?: string;
  isOwner?: boolean;
  isActive?: boolean;
  isBookable?: boolean;
  priority?: number;
  permissions?: string[];
  canSeeFinances?: boolean;
  lastActiveAt?: string;
  // Tenant info
  tenantId?: string;
  // Issue #82: specialization and languages
  specialization?: string | null;
  languages?: string[];
  specializations?: string[];
  servicesAvailable?: StaffServiceCapability[];
  serviceIds?: string[];
}

type UseStaffOptions = {
  bookableOnly?: boolean;
  role?: string;
  specialization?: string;
  serviceId?: string;
  languages?: string[];
};

export const useStaff = (options?: UseStaffOptions): {
  staff: StaffMember[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} => {
  const { user: authUser } = useAuthContext();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStaff = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      debugLog('🚀 useStaff: Начинаем загрузку мастеров...');

      const result = await CRMApiService.getStaff({
        bookableOnly: options?.bookableOnly !== false,
        role: options?.role,
        specialization: options?.specialization,
        serviceId: options?.serviceId,
        languages: options?.languages,
      });

      debugLog('🗃️ useStaff: Получены данные из API:', {
        success: result.success,
        dataLength: result.staff.length
      });

      if (!result.success) {
        throw new Error('Failed to fetch staff');
      }

      const resolveAssetUrl = (value?: string | null): string | null => {
        if (!value) return null;
        if (value.startsWith('http://') || value.startsWith('https://')) return value;
        if (value.startsWith('/')) return value;
        return `/${value}`;
      };

      const storedUser = (() => {
        if (typeof window === 'undefined') return null;
        try {
          const raw = window.localStorage.getItem('user');
          return raw ? JSON.parse(raw) as Record<string, unknown> : null;
        } catch (storageError) {
          debugWarn('useStaff: failed to parse stored user', storageError);
          return null;
        }
      })();

      const staffList = Array.isArray(result.staff) ? result.staff : []
      const normalizedStaff: StaffMember[] = (staffList as unknown[]).map((value) => {
        const member = (value ?? {}) as Record<string, unknown>
        const rawAvatar = (member.avatar ?? member.avatarUrl ?? null) as string | null;

        let fallbackAvatar: string | null = null;
        if (authUser && member.id === authUser.id) {
          fallbackAvatar = (authUser.avatar ?? null) as string | null;
        } else if (storedUser && member.id === (storedUser.id ?? null)) {
          fallbackAvatar = (storedUser.avatar ?? null) as string | null;
        }

        const avatar = rawAvatar ?? fallbackAvatar;
        const avatarUrl = resolveAssetUrl(avatar);

        const specializations = Array.isArray(member.specializations)
          ? (member.specializations as string[])
          : []

        const normalizedLanguages = Array.isArray(member.languages)
          ? (member.languages as string[]).map((lang) =>
              typeof lang === 'string' ? lang.toLowerCase() : lang
            )
          : []

        const servicesAvailableRaw: RawStaffService[] = Array.isArray(member.servicesAvailable)
          ? (member.servicesAvailable as RawStaffService[])
          : []

        const normalizedServices: StaffServiceCapability[] = servicesAvailableRaw
          .map((value) => {
            const serviceId =
              typeof value.serviceId === 'string'
                ? value.serviceId
                : typeof value.service?.id === 'string'
                  ? value.service.id
                  : null

            if (!serviceId) {
              return null
            }

            return {
              id: typeof value.id === 'string' ? value.id : `${member.id}-${serviceId}`,
              serviceId,
              service: (value.service && typeof value.service === 'object'
                ? {
                    id: typeof value.service.id === 'string' ? value.service.id : undefined,
                    name: typeof value.service.name === 'string' ? value.service.name : undefined,
                    duration:
                      typeof value.service.duration === 'number' ? value.service.duration : undefined
                  }
                : undefined)
            }
          })
          .filter(Boolean) as StaffServiceCapability[]

        const serviceIds = normalizedServices.map((service) => service.serviceId)

        return {
          ...member,
          avatar,
          avatarUrl,
          isOwner: member.role === 'SALON_OWNER',
          specialization: specializations[0] ?? null,
          specializations,
          languages: normalizedLanguages,
          servicesAvailable: normalizedServices,
          serviceIds,
        } as StaffMember;
      });

      // Guarantee owner visible in team list
      if (authUser?.role === 'SALON_OWNER') {
        const exists = normalizedStaff.some((m) => m.id === authUser.id);
        if (!exists) {
          normalizedStaff.unshift({
            id: authUser.id,
            firstName: authUser.firstName ?? '',
            lastName: authUser.lastName ?? '',
            email: authUser.email ?? '',
            role: 'SALON_OWNER',
            status: 'ACTIVE',
            avatar: authUser.avatar ?? null,
            avatarUrl: resolveAssetUrl(authUser.avatar ?? null),
            isOwner: true,
            createdAt: new Date().toISOString(),
            phone: authUser.phone ?? undefined,
            isActive: true,
            isBookable: false
          });
        }
      }

      setStaff(normalizedStaff);
    } catch (err) {
      console.error('Error fetching staff:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch staff');
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.bookableOnly, options?.role, options?.specialization, options?.serviceId, JSON.stringify(options?.languages || [])]);

  return {
    staff,
    loading,
    error,
    refetch: fetchStaff
  };
};
