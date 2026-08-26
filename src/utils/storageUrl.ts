import { apiOrigin } from './apiBase';

export function storageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  return `${apiOrigin()}/storage/${String(path).replace(/^\/+/, '')}`;
}
