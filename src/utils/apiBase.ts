const API = String(
  import.meta.env.VITE_API_URL || 'https://agri-akap-backend-production.up.railway.app/api',
).replace(/\/$/, '');

function originOf(apiUrl: string): string {
  return apiUrl.replace(/\/api\/?$/, '');
}

/** API root including `/api` (Railway in production, or VITE_API_URL override). */
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
