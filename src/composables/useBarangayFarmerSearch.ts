import { ref, computed } from 'vue';
import apiClient from '@/utils/axios';

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
  plots: Array<{ id: string; location_brgy: string; commodity: string; size_ha: number }>;
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
      const res = await apiClient.get('/farmers', {
        params: {
          search: term || undefined,
          barangay: brgy || undefined,
          commodity: commodity || undefined,
          per_page: 15,
        },
      });
      const rows = res.data?.data?.data ?? [];
      results.value = rows.map(mapFarmer);
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
      try {
        const res = await apiClient.get(`/farmers/${option.id}`);
        const full = mapFarmer(res.data?.data ?? {});
        selected.value = { ...option, plots: full.plots };
      } catch {
        // keep selection without plots
      }
    }
  };

  /** Plots for the selected farmer that match the active crop form. */
  const plotsForCommodity = (commodity: string) => {
    const crop = commodity.trim().toLowerCase();
    if (!crop) return selected.value?.plots || [];
    return (selected.value?.plots || []).filter(
      (p) => p.commodity.trim().toLowerCase() === crop,
    );
  };

  const clearSelection = () => {
    selected.value = null;
    query.value = '';
    results.value = [];
  };

  return {
    query,
    results,
    searching,
    selected,
    hasAssignment,
    onQueryInput,
    selectFarmer,
    clearSelection,
    search,
    plotsForCommodity,
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
