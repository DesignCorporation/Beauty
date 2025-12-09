import { BeautyApiClient } from '@beauty-platform/client-sdk';

const rawEnv = ((import.meta as any)?.env || {}) as Record<string, string | boolean | undefined>
const isProduction = (rawEnv.PROD as boolean | undefined) ?? false
const envApiUrl = (rawEnv.VITE_API_URL as string | undefined)?.trim()

// Приоритет: VITE_API_URL > дефолт
const defaultApiUrl = isProduction ? 'https://api.beauty.designcorp.eu/api' : 'https://dev-api.beauty.designcorp.eu/api'
const API_URL = (envApiUrl && /^https?:\/\//.test(envApiUrl) ? envApiUrl : defaultApiUrl)
    .replace(/\/$/, '');

export const sdkClient = new BeautyApiClient({
  apiUrl: API_URL,
  getTenantId: () => localStorage.getItem('tenantId') || undefined
});

export type AdminSdkClient = typeof sdkClient;
