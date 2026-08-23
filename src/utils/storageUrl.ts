export function storageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  const api = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
  const origin = String(api).replace(/\/api\/?$/, '');
  return `${origin}/storage/${String(path).replace(/^\/+/, '')}`;
}
