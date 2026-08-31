import { apiOrigin } from './apiBase';

function isLocalHostname(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1';
}

/**
 * Build a browser-reachable photo URL.
 * Relative paths and localhost/http API URLs are rewritten to the current API origin
 * so Vercel never tries to load http://localhost:8000/storage/...
 */
export function storageUrl(path?: string | null): string | null {
  if (!path) return null;
  const raw = String(path).trim();
  if (!raw) return null;
  if (raw.startsWith('data:')) return raw;

  const origin = apiOrigin();

  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      const local = isLocalHostname(parsed.hostname);
      if (parsed.protocol === 'https:' && !local) {
        return raw;
      }
      const relative = parsed.pathname.replace(/^\/storage\/?/i, '').replace(/^\/+/, '');
      if (!relative) return `${origin}${parsed.pathname}`;
      return `${origin}/storage/${relative}${parsed.search}`;
    } catch {
      return raw;
    }
  }

  const relative = raw.replace(/^\/+/, '').replace(/^storage\//i, '');
  if (!relative) return null;
  return `${origin}/storage/${relative}`;
}
