const LOCAL_API_URL = 'http://127.0.0.1:8000/api';
const PRODUCTION_API_URL = 'https://agri-akap-backend-production.up.railway.app/api';
const configuredApiUrl = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const useLocalDevelopmentApi =
  import.meta.env.DEV && (!configuredApiUrl || configuredApiUrl === PRODUCTION_API_URL);

const API = useLocalDevelopmentApi
  ? LOCAL_API_URL
  : configuredApiUrl || PRODUCTION_API_URL;

function originOf(apiUrl: string): string {
  return apiUrl.replace(/\/api\/?$/, '');
}

/** API root including `/api` (local by default in development, Railway in production). */
export function apiBaseUrl(): string {
  return API;
}

export function apiOrigin(): string {
  return originOf(apiBaseUrl());
}

/** Kept so login can pin axios to the resolved host before posting. */
export async function ensureApiBaseUrl(): Promise<string> {
  return apiBaseUrl();
}
