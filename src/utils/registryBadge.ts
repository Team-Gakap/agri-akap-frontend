export function registryBadgeLabel(row: {
  rsbsa_no?: string | null;
  registration_type?: string | null;
  is_temporary?: boolean | null;
  is_walkin?: boolean | null;
}): string | null {
  const rsbsa = String(row.rsbsa_no || '').trim();
  if (rsbsa) return null;
  if (row.registration_type === 'manual_walkin' || row.is_walkin || row.is_temporary) {
    return row.registration_type === 'manual_walkin' ? 'MANUAL-ENTRY' : 'UNREGISTERED';
  }
  return 'UNREGISTERED';
}
