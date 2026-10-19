export const OVERRIDE_REASONS = [
  { code: 'tenant_endorsed', label: 'Tenant/Lessee Endorsed by Barangay Captain' },
  { code: 'pending_rsbsa_batch', label: 'Pending RSBSA Enrollment (Encoded in Batch)' },
  { code: 'emergency_calamity_hvcdp', label: 'Emergency Calamity Buffer Relief (Under DA-HVCDP)' },
] as const;

export type OverrideReasonCode = (typeof OVERRIDE_REASONS)[number]['code'];
