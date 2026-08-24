export function cropLabel(crop?: string | null): string {
  if (!crop) return '—';
  if (crop === 'Both') return 'Rice and Corn';
  return crop;
}
