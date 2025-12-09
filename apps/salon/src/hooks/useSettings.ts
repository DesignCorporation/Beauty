import { useState, useCallback, useEffect } from 'react';
import { sdkClient } from '../services/sdkClient';

export interface SalonSettings {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  postalCode?: string | null;
  currency: string;
  language: string;
  timezone: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const useSettings = (): {
  settings: SalonSettings | null;
  loading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateSettings: (updates: Partial<SalonSettings>) => Promise<{ success: boolean; settings?: SalonSettings; error?: string }>;
} => {
  const [settings, setSettings] = useState<SalonSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const data = await sdkClient.get<{ success: boolean; settings: SalonSettings; error?: string }>('/crm/settings');
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch settings');
      }
      setSettings(data.settings);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch settings';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (updates: Partial<SalonSettings>): Promise<{ success: boolean; settings?: SalonSettings; error?: string }> => {
    setLoading(true);
    setError(null);

    try {
      const data = await sdkClient.patch<{ success: boolean; settings: SalonSettings; error?: string }>('/crm/settings', updates);
      if (!data.success) {
        throw new Error(data.error || 'Failed to update settings');
      }
      setSettings(prev => prev ? { ...prev, ...(data.settings as Partial<SalonSettings>) } : data.settings);
      return { success: true, settings: data.settings };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update settings';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch при монтировании
  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSettings
  };
};
