import { BeautyApiClient } from '@beauty-platform/client-sdk';
import { ENVIRONMENT } from '../config/environment';

const API_URL = ENVIRONMENT.getApiUrl();
export const WS_PATH = '/api/socket.io';

const resolveWsUrl = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  const envUrl = import.meta.env.VITE_WS_URL as string | undefined;
  if (envUrl) return envUrl;
  // Используем тот же origin, чтобы избежать CORS проблем
  return window.location.origin;
};

// Get tenant ID from localStorage if available
// In the future, this might come from a context or state manager
const getTenantId = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.tenantId || undefined;
    }
  } catch (e) {
    // ignore json parse error
  }
  return undefined;
};

export const sdkClient = new BeautyApiClient({
  apiUrl: API_URL.replace(/\/$/, ''),
  wsPath: WS_PATH,
  wsUrl: resolveWsUrl(),
  getTenantId
});

// Export type for usage in other files
export type SalonSdkClient = typeof sdkClient;
export { resolveWsUrl };
