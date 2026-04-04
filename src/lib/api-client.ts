// Central API client for frontend
const BASE = '/api';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('crm_token') || '';
}

export class ApiError extends Error {
  status?: number;
  isNetworkError: boolean;
  
  constructor(message: string, status?: number, isNetworkError = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  let res: Response;
  
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (err: any) {
    // Network errors (DNS, offline, connection refused, etc.)
    const isNetwork = err.name === 'TypeError' && (err.message === 'Failed to fetch' || err.message.includes('NetworkError'));
    throw new ApiError(isNetwork ? 'Network connection failed' : err.message, undefined, isNetwork);
  }

  let data: any;
  try {
    data = await res.json();
  } catch (err) {
    if (!res.ok) throw new ApiError(`Request failed with status ${res.status}`, res.status);
    throw new ApiError('Invalid response from server');
  }

  if (!res.ok) {
    throw new ApiError(data.message || 'Request failed', res.status);
  }
  
  return data.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  isNetworkError: (err: any): boolean => err instanceof ApiError && err.isNetworkError,
};
