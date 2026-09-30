import { ref, computed } from 'vue';
import apiClient from '@/utils/axios';
import { db } from '@/database/db';
import { cacheFarmer, farmerHasCommodity, farmerMatchesSearchTerm, isNetworkError, isOnline } from '@/services/syncService';
import { plotMatchesCrop } from '@/constants/hvccCatalog';

/** Filters previously-cached farmers by name/RSBSA/id/QR + optional barangay/commodity — used offline. */
async function searchCachedFarmersLocal(term: string, barangay?: string, commodity?: string): Promise<any[]> {
  const value = term.trim().toLowerCase();
  const rows = await db.cachedFarmers.toArray();
  return rows
    .map((r) => r.payload)
    .filter((f: any) => {
      if (barangay && String(f.permanent_brgy || '').toLowerCase() !== barangay.toLowerCase()) return false;
      if (commodity && !farmerHasCommodity(f, commodity)) return false;
      if (!value) return true;
      return farmerMatchesSearchTerm(f, value);
    })
    .slice(0, 15);
}

export interface FarmerOption {
  id: string;
  rsbsa_no: string;
  surname: string;
  first_name: string;
  middle_name: string;
  ext_name: string;
  birthdate: string;
  address: string;
  barangay: string;
  is_temporary: boolean;
  registration_type: string;
  plots: Array<{ id: string; location_brgy: string; commodity: string; size_ha: number }>;
}

export interface ManualWalkInPayload {
  surname: string;
  first_name: string;
  middle_name?: string;
  sex: 'Male' | 'Female';
  birthdate: string;
  mobile_number: string;
  commodity: string;
  hectares: number;
  barangay_name?: string;
  declared_sitio?: string;
  enlistment_remarks?: string;
}

/** Split a typed search string into surname / given name for the walk-in form. */
export function splitWalkInName(query: string): { surname: string; first_name: string; middle_name: string } {
  const raw = query.trim().replace(/\s+/g, ' ');
  if (!raw) return { surname: '', first_name: '', middle_name: '' };
  if (raw.includes(',')) {
    const [sur, rest] = raw.split(',');
    const parts = rest.trim().split(' ').filter(Boolean);
    return {
      surname: sur.trim(),
      first_name: parts[0] || '',
      middle_name: parts.slice(1).join(' '),
    };
  }
  const parts = raw.split(' ').filter(Boolean);
  if (parts.length === 1) return { surname: parts[0], first_name: '', middle_name: '' };
  return {
    surname: parts[parts.length - 1],
    first_name: parts[0],
    middle_name: parts.slice(1, -1).join(' '),
  };
}

export function useBarangayFarmerSearch(
  assignedBarangay: () => string | null | undefined,
  options: {
    requireBarangay?: boolean;
    /** When set, search only returns farmers with a matching farm-plot commodity. */
    commodity?: () => string | null | undefined;
  } = {},
) {
  const requireBarangay = options.requireBarangay !== false;
  const query = ref('');
  const results = ref<FarmerOption[]>([]);
  const searching = ref(false);
  const selected = ref<FarmerOption | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const hasAssignment = computed(() => !!assignedBarangay());
  const canEnlistWalkIn = computed(() => {
    const term = query.value.trim();
    return term.length > 0 && results.value.length === 0 && !searching.value && !selected.value;
  });

  const mapFarmer = (f: any): FarmerOption => {
    const parts = [
      f.permanent_house_no,
      f.permanent_street,
      f.permanent_brgy,
      f.permanent_city,
      f.permanent_province,
    ].filter(Boolean);
    return {
      id: f.id,
      rsbsa_no: f.rsbsa_no || '',
      surname: f.surname || '',
      first_name: f.first_name || '',
      middle_name: f.middle_name || '',
      ext_name: f.ext_name || '',
      birthdate: f.birthdate || '',
      address: parts.join(', ') || f.permanent_brgy || '',
      barangay: f.permanent_brgy || '',
      is_temporary: Boolean(f.is_temporary),
      registration_type: f.registration_type || 'rsbsa',
      plots: (f.farm_plots || f.farmPlots || []).map((p: any) => ({
        id: p.id,
        location_brgy: p.location_brgy || '',
        commodity: p.commodity || '',
        size_ha: Number(p.size_ha) || 0,
      })),
    };
  };

  const search = async (term: string) => {
    const brgy = assignedBarangay();
    if (requireBarangay && !brgy) {
      results.value = [];
      return;
    }
    searching.value = true;
    try {
      const commodity = options.commodity?.()?.trim() || undefined;

      if (isOnline()) {
        try {
          const res = await apiClient.get('/farmers', {
            params: {
              search: term || undefined,
              barangay: brgy || undefined,
              commodity: commodity || undefined,
              per_page: 15,
            },
          });
          const rows = res.data?.data?.data ?? [];
          for (const r of rows) await cacheFarmer(r);
          results.value = rows.map(mapFarmer);
          return;
        } catch (err) {
          if (!isNetworkError(err)) throw err;
          /* fall through to the offline cache below */
        }
      }

      const cachedRows = await searchCachedFarmersLocal(term, brgy || undefined, commodity);
      results.value = cachedRows.map(mapFarmer);
    } catch {
      results.value = [];
    } finally {
      searching.value = false;
    }
  };

  const onQueryInput = (value: string) => {
    query.value = value;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => search(value.trim()), 300);
  };

  const selectFarmer = async (option: FarmerOption) => {
    selected.value = option;
    query.value = `${option.surname}, ${option.first_name}`;
    results.value = [];
    // Load plots if missing from list payload
    if (!option.plots.length) {
      if (isOnline()) {
        try {
          const res = await apiClient.get(`/farmers/${option.id}`);
          await cacheFarmer(res.data?.data);
          const full = mapFarmer(res.data?.data ?? {});
          selected.value = { ...option, plots: full.plots };
          return;
        } catch (err) {
          if (!isNetworkError(err)) return;
          /* fall through to cache below */
        }
      }
      const cached = await db.cachedFarmers.get(option.id);
      if (cached?.payload) {
        const full = mapFarmer(cached.payload);
        selected.value = { ...option, plots: full.plots };
      }
    }
  };

  /** Plots for the selected farmer that match the active crop form. */
  const plotsForCommodity = (commodity: string, hvccCommodity?: string | null) => {
    const crop = commodity.trim();
    if (!crop) return selected.value?.plots || [];
    return (selected.value?.plots || []).filter(
      (p) => plotMatchesCrop(p.commodity, crop, hvccCommodity),
    );
  };

  const clearSelection = () => {
    selected.value = null;
    query.value = '';
    results.value = [];
  };

  /** Creates a provisional farmer. Requires connectivity; selection is applied immediately. */
  const enlistManualWalkIn = async (payload: ManualWalkInPayload): Promise<FarmerOption> => {
    if (!isOnline()) {
      throw new Error('Requires internet connection to enlist a new farmer.');
    }
    try {
      const res = await apiClient.post('/farmers/manual-enlist', payload);
      const farmer = mapFarmer(res.data?.data ?? {});
      await cacheFarmer(res.data?.data);
      selected.value = farmer;
      query.value = `${farmer.surname}, ${farmer.first_name}`;
      results.value = [];
      return farmer;
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      const first = errors ? Object.values(errors).flat()[0] : null;
      const message = (typeof first === 'string' && first)
        || err?.response?.data?.message
        || err?.message
        || 'Could not enlist this farmer.';
      throw new Error(message);
    }
  };

  return {
    query,
    results,
    searching,
    selected,
    hasAssignment,
    canEnlistWalkIn,
    onQueryInput,
    selectFarmer,
    clearSelection,
    search,
    plotsForCommodity,
    enlistManualWalkIn,
  };
}

export function formatBirthday(d: string): string {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  const yy = String(dt.getFullYear()).slice(-2);
  return `${mm}-${dd}-${yy}`;
}

export function farmerDisplayName(f: FarmerOption): string {
  const given = [f.first_name, f.middle_name, f.ext_name].filter(Boolean).join(' ');
  return f.surname ? `${f.surname}, ${given}`.trim() : given || '—';
}
