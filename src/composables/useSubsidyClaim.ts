import { Geolocation } from '@capacitor/geolocation';
import apiClient from '@/utils/axios';
import { isOnline, isRetryableSyncError, queueDistribution, syncAllPendingData } from '@/services/syncService';
import { useSyncStore } from '@/stores/syncStore';
import type { ReleaseContext } from '@/stores/distributionStore';

export interface SubsidyClaimData {
  farmer_name?: string;
  quantity_dispensed?: number | string;
  unit?: string;
  inventory_remaining?: number | string;
  quantity_dispensed_secondary?: number | null;
  unit_secondary?: string | null;
  inventory_remaining_secondary?: number | null;
}

export interface SubsidyClaimResult {
  offline: boolean;
  data?: SubsidyClaimData;
}

async function silentGps(
  plotLat?: number | null,
  plotLong?: number | null,
): Promise<{ lat: number | null; long: number | null }> {
  try {
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 4000,
    });
    return { lat: position.coords.latitude, long: position.coords.longitude };
  } catch {
    if (plotLat != null && plotLong != null) {
      return { lat: Number(plotLat), long: Number(plotLong) };
    }
    return { lat: null, long: null };
  }
}

/** Live claim, or queue for /sync/bulk when offline. No photo voucher. */
export async function claimSubsidyRelease(ctx: ReleaseContext): Promise<SubsidyClaimResult> {
  const syncStore = useSyncStore();
  const { lat, long } = await silentGps(ctx.plot_lat, ctx.plot_long);

  const queue = async (): Promise<SubsidyClaimResult> => {
    await queueDistribution({
      source: ctx.source ?? 'program',
      farmer_id: ctx.farmer_id,
      farmer_name: ctx.farmer_name,
      program_id: ctx.program_id,
      program_name: ctx.item_released,
      rsbsa_no: ctx.rsbsa_no,
      beneficiary_id: ctx.beneficiary_id,
      geo_tag_lat: lat,
      geo_tag_long: long,
    });
    await syncStore.refreshCount();
    void syncAllPendingData().then(() => syncStore.refreshCount());
    return { offline: true };
  };

  if (!isOnline()) {
    return queue();
  }

  try {
    if (ctx.source === 'subsidy') {
      const response = await apiClient.post(`/subsidies/${ctx.program_id}/claim-farmer`, {
        farmer_id: ctx.farmer_id,
        rsbsa_no: ctx.rsbsa_no,
        beneficiary_id: ctx.beneficiary_id,
      });
      return { offline: false, data: response.data?.data ?? {} };
    }

    const response = await apiClient.post('/distributions/claim', {
      farmer_id: ctx.farmer_id,
      program_id: ctx.program_id,
      geo_tag_lat: lat,
      geo_tag_long: long,
    });
    return { offline: false, data: response.data?.data ?? {} };
  } catch (err: any) {
    if (isRetryableSyncError(err)) {
      return queue();
    }
    throw err;
  }
}
