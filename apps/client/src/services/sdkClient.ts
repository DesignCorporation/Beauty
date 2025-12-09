import { BeautyApiClient } from '@beauty-platform/client-sdk';

// Force relative path in production
const API_URL = import.meta.env.PROD 
  ? '/api' 
  : ((import.meta.env.VITE_API_URL as string | undefined) || (typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api'));

const WS_URL =
  (import.meta.env.VITE_NOTIFICATION_WS_URL as string | undefined) ||
  (typeof window !== 'undefined' ? `${window.location.origin}` : '');

const WS_PATH =
  (import.meta.env.VITE_NOTIFICATION_WS_PATH as string | undefined) || '/api/socket.io';

export const sdkClient = new BeautyApiClient({
  apiUrl: API_URL.replace(/\/$/, ''),
  wsUrl: WS_URL.replace(/\/$/, ''),
  wsPath: WS_PATH,
  getTenantId: () => localStorage.getItem('tenantId') || undefined
});

export type BookingSdkClient = typeof sdkClient;
