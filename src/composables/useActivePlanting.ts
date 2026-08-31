import { ref } from 'vue';
import apiClient from '@/utils/axios';
import { cacheActivePlanting, getCachedActivePlanting, isNetworkError, isOnline } from '@/services/syncService';

export interface ActivePlanting {
  id: string;
  farm_plot_id: string | null;
  commodity: string;
  variety: string;
  area_planted_ha: number | null;
  date_planted: string | null;
  computed_stage: string | null;
  days_elapsed: number | null;
  days_to_harvest: number | null;
  estimated_harvest_date: string | null;
}

export function activePlantingCacheKey(farmerId: string, farmPlotId?: string | null): string {
  return `${farmerId}:${farmPlotId || ''}`;
}

/** Enum-safe stage for Seedling/Vegetative/Reproductive/Maturity selects. */
export function stageSelectValue(stage: string | null | undefined): string {
  if (!stage) return '';
  return stage === 'Harvest Ready' ? 'Maturity' : stage;
}

export function isHarvestReady(stage: string | null | undefined): boolean {
  return stage === 'Harvest Ready';
}

function mapActivePlanting(raw: any): ActivePlanting | null {
  if (!raw || !raw.id) return null;
  return {
    id: String(raw.id),
    farm_plot_id: raw.farm_plot_id || null,
    commodity: raw.commodity || '',
    variety: raw.variety || '',
    area_planted_ha: raw.area_planted_ha != null ? Number(raw.area_planted_ha) : null,
    date_planted: raw.date_planted ? String(raw.date_planted).slice(0, 10) : null,
    computed_stage: raw.computed_stage || null,
    days_elapsed: raw.days_elapsed != null ? Number(raw.days_elapsed) : null,
    days_to_harvest: raw.days_to_harvest != null ? Number(raw.days_to_harvest) : null,
    estimated_harvest_date: raw.estimated_harvest_date
      ? String(raw.estimated_harvest_date).slice(0, 10)
      : null,
  };
}

export function useActivePlanting() {
  const loading = ref(false);

  const fetchActivePlanting = async (
    farmerId: string,
    opts: { farmPlotId?: string | null; commodity?: string | null } = {},
  ): Promise<ActivePlanting | null> => {
    if (!farmerId) return null;
    const key = activePlantingCacheKey(farmerId, opts.farmPlotId);
    loading.value = true;
    try {
      if (isOnline()) {
        try {
          const res = await apiClient.get(`/farmers/${farmerId}/active-planting`, {
            params: {
              farm_plot_id: opts.farmPlotId || undefined,
              commodity: opts.commodity || undefined,
            },
          });
          const data = res.data?.data ?? null;
          await cacheActivePlanting(key, data);
          return mapActivePlanting(data);
        } catch (err) {
          if (!isNetworkError(err)) return null;
        }
      }

      const cached = await getCachedActivePlanting(key);
      if (cached !== undefined) return mapActivePlanting(cached);

      if (opts.farmPlotId) {
        const fallback = await getCachedActivePlanting(activePlantingCacheKey(farmerId, null));
        if (fallback !== undefined) return mapActivePlanting(fallback);
      }

      return null;
    } finally {
      loading.value = false;
    }
  };

  return { fetchActivePlanting, loading };
}
