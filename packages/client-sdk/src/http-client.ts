import { fetch as defaultFetch } from './polyfills';

export interface BeautyApiClientOptions {
  apiUrl?: string;
  wsUrl?: string;
  wsPath?: string;
  tenantId?: string;
  fetchImpl?: typeof fetch;
  getTenantId?: () => string | undefined;
}

export interface RequestOptions {
  method?: string;
  data?: unknown;
  headers?: Record<string, string>;
  retry?: number;
  skipCsrf?: boolean;
}

const DEFAULT_API_URL = '/api';
const DEFAULT_RETRY = 1;

export class BeautyApiClient {
  private apiUrl: string;
  private tenantId?: string;
  private csrfTokenCache: string | null = null;
  private fetchImpl: typeof fetch;
  private tenantResolver?: () => string | undefined;

  constructor(options: BeautyApiClientOptions = {}) {
    this.apiUrl = options.apiUrl || DEFAULT_API_URL;
    this.tenantId = options.tenantId;
    this.fetchImpl = options.fetchImpl || defaultFetch;
    this.tenantResolver = options.getTenantId;
    if (process.env.NODE_ENV === 'development') {
      console.log('[BeautyApiClient] init', {
        apiUrl: this.apiUrl,
        tenantId: this.tenantId ? '<provided>' : this.tenantResolver ? '<resolver>' : undefined
      });
    }
  }

  setTenantId(tenantId: string | undefined): void {
    this.tenantId = tenantId;
  }

  clearCsrfCache(): void {
    this.csrfTokenCache = null;
  }

  private async getCsrfToken(): Promise<string> {
    if (this.csrfTokenCache) return this.csrfTokenCache;

    const resp = await this.fetchImpl(`${this.apiUrl}/auth/csrf-token`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json'
      }
    });

    if (!resp.ok) {
      throw new Error(`CSRF token request failed (${resp.status})`);
    }

    const body = await resp.json().catch(() => ({}));
    const token = body?.csrfToken || body?.token;
    if (!token) {
      throw new Error('CSRF token missing in response');
    }

    this.csrfTokenCache = token;
    return token;
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = (options.method || 'GET').toUpperCase();
    const needCsrf = !options.skipCsrf && !['GET', 'HEAD', 'OPTIONS'].includes(method);
    const isFormData = typeof FormData !== 'undefined' && options.data instanceof FormData;
    const isBlob = typeof Blob !== 'undefined' && options.data instanceof Blob;
    const isBuffer = options.data instanceof ArrayBuffer || ArrayBuffer.isView(options.data as ArrayBufferView);

    let headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.headers || {})
    };

    if (!isFormData && !isBlob && !isBuffer && options.data !== undefined && typeof options.data !== 'string') {
      headers['Content-Type'] = 'application/json';
    }

    const resolvedTenantId = this.tenantId || this.tenantResolver?.();
    if (resolvedTenantId) {
      headers['X-Tenant-Id'] = resolvedTenantId;
    }

    if (needCsrf) {
      const token = await this.getCsrfToken();
      headers['X-CSRF-Token'] = token;
    }

    const targetUrl = path.startsWith('http://') || path.startsWith('https://') ? path : `${this.apiUrl}${path}`;

    const doFetch = async (): Promise<Response> => {
      const body =
        options.data === undefined || method === 'GET'
          ? undefined
          : isFormData || isBlob || isBuffer || typeof options.data === 'string'
            ? (options.data as BodyInit)
            : JSON.stringify(options.data);

      return this.fetchImpl(targetUrl, {
        method,
        credentials: 'include',
        headers,
        body
      });
    };

    let response = await doFetch();

    if (response.status === 403 && needCsrf) {
      // CSRF токен мог протухнуть, обновим и повторим
      this.clearCsrfCache();
      const token = await this.getCsrfToken();
      headers['X-CSRF-Token'] = token;
      response = await doFetch();
    }

    const retries = options.retry ?? DEFAULT_RETRY;
    let attempt = 0;
    while (!response.ok && attempt < retries) {
      attempt += 1;
      response = await doFetch();
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message = body?.message || body?.error || `HTTP ${response.status}`;
      throw new Error(message);
    }

    return response.json() as Promise<T>;
  }

  async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  async post<T>(path: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', data });
  }

  async put<T>(path: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PUT', data });
  }

  async patch<T>(path: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PATCH', data });
  }

  async delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}
