import apiClient from '@/utils/axios';

export interface SubsidyFilterState {
  barangays: string[];
  allBarangays: boolean;
  commodity: '' | 'Rice' | 'Corn';
  minHa: number | null;
  maxHa: number | null;
  rdanaValidated: boolean;
  rdanaMonths: number;
  rdanaMinSeverity: number;
  pestOutbreak: boolean;
  socialPriority: boolean;
  excludeHistory: boolean;
  search: string;
}

export interface EligibleFarmerRow {
  farmer_id: string;
  rsbsa_no: string;
  last_name: string;
  first_name: string;
  middle_name?: string | null;
  barangay: string;
  mobile_number?: string | null;
  farm_area: number;
  is_pwd: boolean;
  is_senior: boolean;
  damage_percentage: number | null;
  is_outbreak: boolean;
  priority_tier: number | null;
  calculated_allocation: number;
  calculated_allocation_secondary: number | null;
  already_on_masterlist: boolean;
  masterlist_status: string | null;
}

export type StockTone = 'green' | 'amber' | 'red';

export const defaultSubsidyFilters = (): SubsidyFilterState => ({
  barangays: [],
  allBarangays: true,
  commodity: '',
  minHa: null,
  maxHa: null,
  rdanaValidated: false,
  rdanaMonths: 12,
  rdanaMinSeverity: 50,
  pestOutbreak: false,
  socialPriority: false,
  excludeHistory: true,
  search: '',
});

export function stockTone(required: number, available: number): StockTone {
  if (required > available + 0.0001) return 'red';
  if (available > 0 && required >= available * 0.9 && required > 0) return 'amber';
  return 'green';
}

export function worstStockTone(primary: StockTone, secondary: StockTone | null): StockTone {
  if (primary === 'red' || secondary === 'red') return 'red';
  if (primary === 'amber' || secondary === 'amber') return 'amber';
  return 'green';
}

export async function fetchEligibleFarmers(programId: string, filters: SubsidyFilterState): Promise<EligibleFarmerRow[]> {
  const params: Record<string, unknown> = {
    exclude_history: filters.excludeHistory ? 1 : 0,
    rdana_validated: filters.rdanaValidated ? 1 : 0,
    pest_outbreak: filters.pestOutbreak ? 1 : 0,
    social_priority: filters.socialPriority ? 1 : 0,
  };

  if (!filters.allBarangays && filters.barangays.length) {
    params.barangays = filters.barangays;
  }
  if (filters.commodity) params.commodity = filters.commodity;
  if (filters.minHa != null) params.min_ha = filters.minHa;
  if (filters.maxHa != null) params.max_ha = filters.maxHa;
  if (filters.rdanaValidated) {
    params.rdana_months = filters.rdanaMonths;
    params.rdana_min_severity = filters.rdanaMinSeverity;
  }
  if (filters.search.trim()) params.search = filters.search.trim();

  const res = await apiClient.get(`/subsidies/${programId}/eligible-farmers`, { params });
  return (res.data?.data?.farmers ?? []).map((row: any) => ({
    farmer_id: row.farmer_id,
    rsbsa_no: row.rsbsa_no,
    last_name: row.last_name,
    first_name: row.first_name,
    middle_name: row.middle_name,
    barangay: row.barangay || 'Unspecified',
    mobile_number: row.mobile_number,
    farm_area: Number(row.farm_area || 0),
    is_pwd: !!row.is_pwd,
    is_senior: !!row.is_senior,
    damage_percentage: row.damage_percentage != null ? Number(row.damage_percentage) : null,
    is_outbreak: !!row.is_outbreak,
    priority_tier: row.priority_tier != null ? Number(row.priority_tier) : null,
    calculated_allocation: Number(row.calculated_allocation || 0),
    calculated_allocation_secondary: row.calculated_allocation_secondary != null
      ? Number(row.calculated_allocation_secondary)
      : null,
    already_on_masterlist: !!row.already_on_masterlist,
    masterlist_status: row.masterlist_status ?? null,
  }));
}

export async function submitManualSelection(programId: string, rsbsaNos: string[], farmerIds: string[] = []) {
  const res = await apiClient.post(`/subsidies/${programId}/manual-select`, {
    farmer_rsbsa_nos: rsbsaNos,
    farmer_ids: farmerIds,
  });
  return res.data;
}
