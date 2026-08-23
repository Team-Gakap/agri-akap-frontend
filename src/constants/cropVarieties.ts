export const OTHER_VARIETY = 'Other';

export const RICE_VARIETIES = [
  'NSIC Rc 222',
  'NSIC Rc 216',
  'NSIC Rc 160',
  'NSIC Rc 218',
  'NSIC Rc 480',
  'NSIC Rc 402',
  'NSIC Rc 438',
  'PSB Rc 18',
  'PSB Rc 82',
  'Hybrid Rice',
] as const;

export const CORN_VARIETIES = [
  'Hybrid Yellow',
  'Hybrid White',
  'Open-Pollinated Variety (OPV)',
  'NK 6410',
  'Pioneer Hybrid',
  'Dekalb Hybrid',
] as const;

export function varietiesForCrop(crop?: string | null): string[] {
  const key = (crop || '').trim().toLowerCase();
  if (key.includes('corn')) return [...CORN_VARIETIES, OTHER_VARIETY];
  if (key.includes('rice')) return [...RICE_VARIETIES, OTHER_VARIETY];
  return [OTHER_VARIETY];
}

export function isKnownVariety(crop: string | null | undefined, value: string): boolean {
  if (!value) return false;
  return varietiesForCrop(crop).filter((v) => v !== OTHER_VARIETY).includes(value);
}

export function damageSeverityFromPct(pct: number): 'Low' | 'Moderate' | 'Severe' {
  if (pct >= 100) return 'Severe';
  if (pct >= 50) return 'Moderate';
  return 'Low';
}
