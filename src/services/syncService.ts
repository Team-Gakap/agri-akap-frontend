import apiClient from '@/utils/axios';
import {
  db,
  getDeviceId,
  newUuid,
  pendingQueueCount,
  type PendingAssessment,
  type PendingDistribution,
  type OfflinePlantingLog,
  type OfflinePestReport,
  type OfflineFarmProfile,
} from './db';

export interface SyncOutcome {
  client_id: string | null;
  outcome: 'synced' | 'duplicate' | 'failed';
  message: string;
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

/* ----------------------------- Read caching ----------------------------- */

async function cacheAll(
  table: 'cachedPrograms' | 'cachedFarmers' | 'cachedFarmPlots',
  records: any[],
) {
  const now = new Date().toISOString();
  const rows = records
    .filter((r) => r && r.id)
    .map((r) => ({ id: r.id, payload: r, cached_at: now }));
  await db[table].clear();
  await db[table].bulkPut(rows);
}

/** Fetch programs, caching them for offline use; fall back to cache when offline. */
export async function getPrograms(): Promise<any[]> {
  if (isOnline()) {
    try {
      const res = await apiClient.get('/programs', { params: { active_only: true } });
      const list = res.data?.data?.data ?? res.data?.data ?? [];
      await cacheAll('cachedPrograms', list);
      return list;
    } catch {
      /* fall through to cache */
    }
  }
  return (await db.cachedPrograms.toArray()).map((r) => r.payload);
}

/** Resolve a scanned farmer QR to their profile + plots, using cache when offline. */
export async function lookupFarmer(qr: string): Promise<any | null> {
  const value = qr.trim();
  if (isOnline()) {
    try {
      const res = await apiClient.get('/farmers/lookup', { params: { qr: value } });
      const farmer = res.data?.data;
      if (farmer) {
        await db.cachedFarmers.put({ id: farmer.id, payload: farmer, cached_at: new Date().toISOString() });
        for (const plot of farmer.farm_plots ?? farmer.farmPlots ?? []) {
          await db.cachedFarmPlots.put({ id: plot.id, payload: plot, cached_at: new Date().toISOString() });
        }
      }
      return farmer ?? null;
    } catch {
      /* fall through to cache */
    }
  }
  const cached = await db.cachedFarmers.get(value);
  return cached ? cached.payload : null;
}

/* ------------------------------- Queueing ------------------------------- */

export async function queueDistribution(input: {
  farmer_id: string;
  farmer_name?: string;
  program_id: string;
  program_name?: string;
  geo_tag_lat?: number | null;
  geo_tag_long?: number | null;
  photo_proof_base64?: string;
}): Promise<PendingDistribution> {
  const record: PendingDistribution = {
    client_id: newUuid(),
    farmer_id: input.farmer_id,
    farmer_name: input.farmer_name,
    program_id: input.program_id,
    program_name: input.program_name,
    geo_tag_lat: input.geo_tag_lat ?? null,
    geo_tag_long: input.geo_tag_long ?? null,
    photo_proof_base64: input.photo_proof_base64,
    device_id: getDeviceId(),
    claimed_at: new Date().toISOString(),
    status: 'pending',
    created_at: new Date().toISOString(),
  };
  await db.pendingDistributions.put(record);
  return record;
}

export async function queueAssessment(
  input: Omit<PendingAssessment, 'client_id' | 'device_id' | 'status' | 'created_at'>,
): Promise<PendingAssessment> {
  const record: PendingAssessment = {
    ...input,
    client_id: newUuid(),
    device_id: getDeviceId(),
    status: 'pending',
    created_at: new Date().toISOString(),
  };
  await db.pendingAssessments.put(record);
  return record;
}

export async function queuePlantingLog(
  input: Omit<OfflinePlantingLog, 'id' | 'client_id' | 'sync_status' | 'created_at'>,
): Promise<OfflinePlantingLog> {
  const record: OfflinePlantingLog = {
    ...input,
    client_id: newUuid(),
    sync_status: 'pending',
    created_at: new Date().toISOString(),
  };
  const id = await db.offline_planting_logs.add(record);
  return { ...record, id };
}

export async function queuePestReport(
  input: Omit<OfflinePestReport, 'id' | 'client_id' | 'sync_status' | 'created_at'>,
): Promise<OfflinePestReport> {
  const record: OfflinePestReport = {
    ...input,
    client_id: newUuid(),
    sync_status: 'pending',
    created_at: new Date().toISOString(),
  };
  const id = await db.offline_pest_reports.add(record);
  return { ...record, id };
}

export async function queueFarmProfile(
  input: Omit<OfflineFarmProfile, 'id' | 'client_id' | 'sync_status' | 'created_at'>,
): Promise<OfflineFarmProfile> {
  const record: OfflineFarmProfile = {
    ...input,
    client_id: newUuid(),
    sync_status: 'pending',
    created_at: new Date().toISOString(),
  };
  const id = await db.offline_farm_profiles.add(record);
  return { ...record, id };
}

export async function pendingCount(): Promise<number> {
  return pendingQueueCount();
}

/* ------------------------------- Flushing ------------------------------- */

let flushing = false;
let pushingOffline = false;

/**
 * Push Dexie offline field queues (planting / pest / farm profiles) to Laravel.
 * On HTTP 200, mark local rows synced (and remove) to prevent duplicate uploads.
 */
export async function pushOfflineData(): Promise<{ synced: number; failed: number }> {
  if (pushingOffline || !isOnline()) {
    return { synced: 0, failed: 0 };
  }

  const planting_logs = await db.offline_planting_logs.where('sync_status').equals('pending').toArray();
  const pest_reports = await db.offline_pest_reports.where('sync_status').equals('pending').toArray();
  const farm_profiles = await db.offline_farm_profiles.where('sync_status').equals('pending').toArray();

  if (planting_logs.length === 0 && pest_reports.length === 0 && farm_profiles.length === 0) {
    return { synced: 0, failed: 0 };
  }

  pushingOffline = true;
  try {
    const plantingIds = planting_logs.map((r) => r.id!).filter(Boolean);
    const pestIds = pest_reports.map((r) => r.id!).filter(Boolean);
    const farmIds = farm_profiles.map((r) => r.id!).filter(Boolean);

    await db.offline_planting_logs.where('id').anyOf(plantingIds).modify({ sync_status: 'syncing' });
    await db.offline_pest_reports.where('id').anyOf(pestIds).modify({ sync_status: 'syncing' });
    await db.offline_farm_profiles.where('id').anyOf(farmIds).modify({ sync_status: 'syncing' });

    const payload = {
      device_id: getDeviceId(),
      planting_logs: planting_logs.map((r) => ({
        client_id: r.client_id,
        farmer_id: r.farmer_id,
        rsbsa_no: r.rsbsa_no,
        crop_type: r.crop_type,
        variety: r.variety,
        area_planted: r.area_planted,
        date_planted: r.date_planted,
        status: r.status,
        water_source: r.water_source,
        latitude: r.latitude ?? null,
        longitude: r.longitude ?? null,
      })),
      pest_reports: pest_reports.map((r) => ({
        client_id: r.client_id,
        farmer_id: r.farmer_id,
        crop: r.crop,
        pest_name: r.pest_name,
        incidence: r.incidence,
        severity: r.severity,
        advisory: r.advisory,
        is_outbreak: r.is_outbreak,
        photo_base64: r.photo_base64,
        lat: r.lat,
        lng: r.lng,
        report_id: r.report_id,
        item_distributed: r.item_distributed,
        quantity: r.quantity,
      })),
      farm_profiles: farm_profiles.map((r) => ({
        client_id: r.client_id,
        farmer_id: r.farmer_id,
        coordinates: r.coordinates,
        total_area: r.total_area,
      })),
    };

    const res = await apiClient.post('/sync/bulk', payload);
    if (res.status !== 200) {
      throw new Error(`Sync HTTP ${res.status}`);
    }

    const results = res.data?.results ?? {};
    let synced = 0;
    let failed = 0;

    const applyOutcomes = async (
      table: 'offline_planting_logs' | 'offline_pest_reports' | 'offline_farm_profiles',
      rows: Array<{ id?: number; client_id: string }>,
      outcomes: SyncOutcome[] | undefined,
    ) => {
      const byClient = new Map((outcomes ?? []).map((o) => [o.client_id, o]));
      for (const row of rows) {
        const outcome = byClient.get(row.client_id);
        if (!outcome || outcome.outcome === 'synced' || outcome.outcome === 'duplicate') {
          if (row.id != null) await db[table].delete(row.id);
          synced++;
        } else {
          failed++;
          if (row.id != null) {
            await db[table].update(row.id, { sync_status: 'failed' });
          }
        }
      }
    };

    // Successful HTTP 200 with transactional batch — clear all syncing rows
    // even if per-item results are omitted (backend returns "Sync Successful").
    if (!results.planting_logs && !results.pest_reports && !results.farm_profiles) {
      await db.offline_planting_logs.where('id').anyOf(plantingIds).delete();
      await db.offline_pest_reports.where('id').anyOf(pestIds).delete();
      await db.offline_farm_profiles.where('id').anyOf(farmIds).delete();
      synced = plantingIds.length + pestIds.length + farmIds.length;
    } else {
      await applyOutcomes('offline_planting_logs', planting_logs, results.planting_logs);
      await applyOutcomes('offline_pest_reports', pest_reports, results.pest_reports);
      await applyOutcomes('offline_farm_profiles', farm_profiles, results.farm_profiles);
    }

    return { synced, failed };
  } catch {
    await db.offline_planting_logs.where('sync_status').equals('syncing').modify({ sync_status: 'pending' });
    await db.offline_pest_reports.where('sync_status').equals('syncing').modify({ sync_status: 'pending' });
    await db.offline_farm_profiles.where('sync_status').equals('syncing').modify({ sync_status: 'pending' });
    return { synced: 0, failed: 0 };
  } finally {
    pushingOffline = false;
  }
}

/**
 * Push all queued records to the Laravel bulk-sync endpoint and reconcile
 * the local queue based on the per-item outcome:
 *   synced / duplicate -> remove from queue (server now owns the record)
 *   failed             -> keep and flag so the technician can retry
 */
export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  if (flushing || !isOnline()) {
    return { synced: 0, failed: 0 };
  }
  flushing = true;

  let synced = 0;
  let failed = 0;

  try {
    const distributions = await db.pendingDistributions.toArray();
    const assessments = await db.pendingAssessments.toArray();

    if (distributions.length > 0 || assessments.length > 0) {
      await db.pendingDistributions.toCollection().modify({ status: 'syncing' });
      await db.pendingAssessments.toCollection().modify({ status: 'syncing' });

      const payload = {
        device_id: getDeviceId(),
        distributions: distributions.map((d) => ({
          client_id: d.client_id,
          farmer_id: d.farmer_id,
          program_id: d.program_id,
          device_id: d.device_id,
          claimed_at: d.claimed_at,
          geo_tag_lat: d.geo_tag_lat,
          geo_tag_long: d.geo_tag_long,
          photo_proof_base64: d.photo_proof_base64,
        })),
        assessments: assessments.map((a) => ({
          id: a.client_id,
          farm_plot_id: a.farm_plot_id,
          farmer_id: a.farmer_id,
          calamity_type: a.calamity_type,
          calamity_name: a.calamity_name,
          crop_stage: a.crop_stage,
          area_destroyed_ha: a.area_destroyed_ha,
          date_of_calamity: a.date_of_calamity,
          damage_percentage: a.damage_percentage,
          estimated_value_lost: a.estimated_value_lost,
          latitude: a.latitude,
          longitude: a.longitude,
          device_id: a.device_id,
          photo_base64: a.photo_base64,
        })),
      };

      const res = await apiClient.post('/sync/bulk', payload);
      const results = res.data?.results ?? { distributions: [], assessments: [] };

      for (const r of results.distributions as SyncOutcome[]) {
        if (r.outcome === 'synced' || r.outcome === 'duplicate') {
          await db.pendingDistributions.delete(r.client_id as string);
          synced++;
        } else {
          failed++;
          await db.pendingDistributions.update(r.client_id as string, {
            status: 'failed',
            error: r.message,
          });
        }
      }

      for (const r of results.assessments as SyncOutcome[]) {
        if (r.outcome === 'synced' || r.outcome === 'duplicate') {
          await db.pendingAssessments.delete(r.client_id as string);
          synced++;
        } else {
          failed++;
          await db.pendingAssessments.update(r.client_id as string, {
            status: 'failed',
            error: r.message,
          });
        }
      }
    }

    const offline = await pushOfflineData();
    synced += offline.synced;
    failed += offline.failed;

    return { synced, failed };
  } catch {
    await db.pendingDistributions.where('status').equals('syncing').modify({ status: 'pending' });
    await db.pendingAssessments.where('status').equals('syncing').modify({ status: 'pending' });
    return { synced, failed };
  } finally {
    flushing = false;
  }
}
