export type TenureCategory =
  | 'ip_cc'
  | 'arb'
  | 'registered_owner'
  | 'tenant'
  | 'lessee'
  | 'others';

export interface TenurePlotInput {
  ownership_type: string;
  is_ancestral_domain?: boolean;
  is_agrarian_reform_beneficiary?: boolean;
}

export const TENURIAL_DOCUMENTS: Record<TenureCategory, string[]> = {
  registered_owner: [
    'Certificate of Title / Regular Title (TCT or OCT)',
    'Tax Declaration (agricultural land)',
    'Free Patent / Homestead Patent / Agricultural Sales Patent',
    'Deed of Absolute Sale / Donation / Extrajudicial Settlement',
  ],
  arb: [
    'Certificate of Land Ownership Award (CLOA) — Individual',
    'Certificate of Land Ownership Award (CLOA) — Collective',
    'Certificate of Land Ownership Award (CLOA) — Co-ownership',
    'Emancipation Patent (EP)',
    'Certificate of Land Transfer (CLT)',
  ],
  ip_cc: [
    'Certificate of Ancestral Domain Title (CADT)',
    'Certificate of Ancestral Land Title (CALT)',
    'NCIP Certification (traditional land rights)',
  ],
  tenant: [
    'Notarized Agricultural Leasehold Contract / Tenancy Agreement',
    'Barangay Agrarian Reform Committee (BARC) Certification',
    'Barangay Certificate / Landowner Affidavit',
  ],
  lessee: [
    'Lease Contract / Contract of Lease',
    'Notarized Landowner Consent / Usufruct Agreement',
  ],
  others: [
    'Barangay Certification of Actual Tillage / Land Occupancy',
    'Affidavit of Heirship / Consent of Co-heirs',
    'Urban/Peri-Urban Agriculture Certification',
  ],
};

export function resolveTenureCategory(plot: TenurePlotInput): TenureCategory {
  if (plot.is_ancestral_domain) return 'ip_cc';
  if (plot.is_agrarian_reform_beneficiary) return 'arb';
  switch (plot.ownership_type) {
    case 'Registered Owner':
      return 'registered_owner';
    case 'Tenant':
      return 'tenant';
    case 'Lessee':
      return 'lessee';
    default:
      return 'others';
  }
}

export function tenurialDocumentOptions(plot: TenurePlotInput): string[] {
  return TENURIAL_DOCUMENTS[resolveTenureCategory(plot)] ?? TENURIAL_DOCUMENTS.others;
}

export function tenureCategoryLabel(category: TenureCategory): string {
  const labels: Record<TenureCategory, string> = {
    registered_owner: 'Registered Land Owner',
    arb: 'Agrarian Reform Beneficiary',
    ip_cc: 'Indigenous Peoples / Cultural Community',
    tenant: 'Tenant (Sharecropper / Kasama)',
    lessee: 'Lessee / Renter',
    others: 'Others (Informal Tiller / Heir / Urban Agriculture)',
  };
  return labels[category];
}

export function tenurialDocumentHint(plot: TenurePlotInput): string {
  const category = resolveTenureCategory(plot);
  if (category === 'tenant') {
    return 'For tenants: document must reflect the registered landowner\'s name and RSBSA number when available.';
  }
  if (category === 'lessee') {
    return 'Lease documents should state lessor, lessee, duration, area, and location.';
  }
  return `Documents for ${tenureCategoryLabel(category)} per DA RSBSA enrollment requirements.`;
}
