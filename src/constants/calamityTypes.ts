/** Canonical calamity types — Title Case, must match backend CalamityTypes.php */
export const CALAMITY_TYPES = [
  'Typhoon',
  'Earthquake',
  'Flood',
  'Drought',
  'Pest Outbreak',
  'Hail',
  'Fire',
  'Other',
] as const;

export type CalamityType = (typeof CALAMITY_TYPES)[number];

export const CALAMITY_TYPE_OTHER: CalamityType = 'Other';

export function buildCalamityName(
  type: string,
  eventName?: string,
  otherDetail?: string,
): string {
  if (type === CALAMITY_TYPE_OTHER) {
    return (otherDetail || '').trim();
  }
  const name = (eventName || '').trim();
  return name || type;
}
