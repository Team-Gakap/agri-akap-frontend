import { describe, expect, it, vi } from 'vitest';
import { storageUrl } from './storageUrl';

vi.mock('./apiBase', () => ({
  apiOrigin: () => 'https://agri-akap-backend-production.up.railway.app',
}));

describe('storageUrl', () => {
  it('prefixes relative paths with the API origin', () => {
    expect(storageUrl('farmer-photos/a.jpg')).toBe(
      'https://agri-akap-backend-production.up.railway.app/storage/farmer-photos/a.jpg',
    );
  });

  it('rewrites localhost asset URLs onto the API origin', () => {
    expect(storageUrl('http://localhost:8000/storage/subsidy-claims/b.jpg')).toBe(
      'https://agri-akap-backend-production.up.railway.app/storage/subsidy-claims/b.jpg',
    );
  });

  it('keeps https production URLs', () => {
    const src = 'https://agri-akap-backend-production.up.railway.app/storage/x.jpg';
    expect(storageUrl(src)).toBe(src);
  });

  it('passes through data URLs', () => {
    expect(storageUrl('data:image/jpeg;base64,abc')).toBe('data:image/jpeg;base64,abc');
  });
});
