export const OTHER_VARIETY = 'Other';

export interface VarietyGroup {
  label: string;
  varieties: string[];
}

/** PhilRice / DA-BPI rice classes, plus local inbred names already in use. */
export const RICE_VARIETY_GROUPS: VarietyGroup[] = [
  {
    label: 'Early Inbred',
    varieties: ['PSB Rc 10', 'NSIC Rc 118', 'NSIC Rc 120', 'NSIC Rc 130'],
  },
  {
    label: 'Medium Inbred',
    varieties: [
      'NSIC Rc 222',
      'NSIC Rc 216',
      'NSIC Rc 160',
      'PSB Rc 82',
      'NSIC Rc 218',
      'NSIC Rc 480',
      'NSIC Rc 402',
      'NSIC Rc 438',
      'PSB Rc 18',
    ],
  },
  {
    label: 'Late Inbred / Traditional',
    varieties: ['NSIC Rc 300', 'Dinorado', 'Malagkit'],
  },
  {
    label: 'Hybrid Rice',
    varieties: ['Hybrid Rice', 'Mestiso 19', 'Mestiso 20', 'SL-8H', 'Bigante Plus'],
  },
];

export const CORN_VARIETY_GROUPS: VarietyGroup[] = [
  {
    label: 'Hybrid Yellow',
    varieties: [
      'Hybrid Yellow',
      'Pioneer Hybrid',
      'Dekalb Hybrid',
      'NK 6410',
      'Pioneer 30T80',
      'DEKALB 8899S',
      'NK8840',
      'Bioseed',
    ],
  },
  {
    label: 'Hybrid White',
    varieties: ['Hybrid White', 'IPB Var 6', 'Macho White'],
  },
  {
    label: 'Traditional / OPV',
    varieties: ['Open-Pollinated Variety (OPV)', 'Tiniguib', 'Native White Flint'],
  },
  {
    label: 'Sweet / Glutinous',
    varieties: ['Sweet Corn', 'Glutinous Corn', 'Green Corn'],
  },
];

export const RICE_VARIETIES = RICE_VARIETY_GROUPS.flatMap((g) => g.varieties);
export const CORN_VARIETIES = CORN_VARIETY_GROUPS.flatMap((g) => g.varieties);

export function varietyGroupsForCrop(crop?: string | null): VarietyGroup[] {
  const key = (crop || '').trim().toLowerCase();
  if (key.includes('corn')) return CORN_VARIETY_GROUPS;
  if (key.includes('rice')) return RICE_VARIETY_GROUPS;
  return [];
}

export function varietiesForCrop(crop?: string | null): string[] {
  const names = varietyGroupsForCrop(crop).flatMap((g) => g.varieties);
  return [...names, OTHER_VARIETY];
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
