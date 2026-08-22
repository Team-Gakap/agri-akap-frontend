import apiClient from '@/utils/axios';
import {
  db,
  getDeviceId,
  newUuid,
  pendingQueueCount,
  type PendingAssessment,
  type PendingDistribution,
  type OfflineDistribution,
  type OfflinePlantingLog,
  type OfflinePestReport,
  type OfflineFarmProfile,
  type OfflineGeoTag,
  type OfflineGeoRefusal,
} from '@/database/db';

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

function mapSubsidyProgram(p: any) {
  return {
    id: p.id,
    name: p.program_name || p.name,
    program_name: p.program_name || p.name,
    type: p.target_crop || p.type,
    target_crop: p.target_crop,
    remaining_quantity: Number(p.remaining_quantity) || 0,
    total_quantity: Number(p.total_quantity) || 0,
    unit_of_measurement: p.unit_of_measurement || 'Bags',
    per_hectare_allocation: Number(p.items_per_hectare ?? p.per_hectare_allocation) || 0,
    items_per_hectare: Number(p.items_per_hectare ?? p.per_hectare_allocation) || 0,
    max_hectares_limit: Number(p.max_hectares_limit) || 0,
    status: p.status,
    source: 'subsidy' as const,
    end_date: p.end_date || (p.status === 'Active' ? 'Active' : p.status),
  };
}

async function cacheFarmer(farmer: any) {
  if (!farmer?.id) return;
  await db.cachedFarmers.put({ id: farmer.id, payload: farmer, cached_at: new Date().toISOString() });
  for (const plot of farmer.farm_plots ?? farmer.farmPlots ?? []) {
    if (plot?.id) {
      await db.cachedFarmPlots.put({ id: plot.id, payload: plot, cached_at: new Date().toISOString() });
    }
  }
}

/** Active subsidy campaigns first; fall back to legacy programs table. */
export async function getSubsidyPrograms(): Promise<any[]> {
  if (isOnline()) {
    try {
      const res = await apiClient.get('/subsidies');
      const list = Array.isArray(res.data?.data) ? res.data.data : (res.data?.data?.data ?? []);
      const mapped = list.map(mapSubsidyProgram);
      if (mapped.length) {
        await cacheAll('cachedPrograms', mapped);
        return mapped;
      }
    } catch {
      /* fall through */
    }
  }
  return (await db.cachedPrograms.toArray())
    .map((r) => r.payload)
    .filter((p) => p?.source === 'subsidy' || p?.program_name);
}

/** Fetch programs, caching them for offline use; fall back to cache when offline. */
export async function getPrograms(): Promise<any[]> {
  const subsidies = await getSubsidyPrograms();
  if (subsidies.length) return subsidies;

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

export async function searchFarmers(term: string): Promise<any[]> {
  const value = term.trim();
  if (value.length < 2) return [];
  const res = await apiClient.get('/farmers', {
    params: { search: value, per_page: 20, page: 1 },
  });
  return res.data?.data?.data ?? [];
}

/** Resolve a scanned farmer QR / RSBSA / typed name to their profile. */
export async function lookupFarmer(qr: string): Promise<any | null> {
  const value = qr.trim();
  if (!value) return null;

  if (isOnline()) {
    try {
      const res = await apiClient.get('/farmers/lookup', { params: { qr: value } });
      const farmer = res.data?.data;
      if (farmer) {
        await cacheFarmer(farmer);
        return farmer;
      }
    } catch {
      /* try registry search next */
    }

    try {
      const rows = await searchFarmers(value);
      const exact = rows.find((f: any) =>
        String(f.id) === value
        || String(f.rsbsa_no || '').toLowerCase() === value.toLowerCase()
        || String(f.qr_code_hash || '') === value
      );
      const farmer = exact || (rows.length === 1 ? rows[0] : null);
      if (farmer) await cacheFarmer(farmer);
      return farmer;
    } catch {
      /* fall through to cache */
    }
  }

  const cachedById = await db.cachedFarmers.get(value);
  if (cachedById) return cachedById.payload;

  const cached = await db.cachedFarmers.toArray();
  const match = cached.find((r) => {
    const f = r.payload || {};
    return String(f.rsbsa_no || '').toLowerCase() === value.toLowerCase()
      || String(f.qr_code_hash || '') === value
      || `${f.surname || ''}, ${f.first_name || ''}`.toLowerCase().includes(value.toLowerCase());
  });
  return match ? match.payload : null;
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
    rsbsa_id: input.rsbsa_id || input.farmer_id || '',
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

export async function queueGeoTag(
  input: Omit<OfflineGeoTag, 'id' | 'client_id' | 'sync_status' | 'created_at'>,
): Promise<OfflineGeoTag> {
  const record: OfflineGeoTag = {
    ...input,
    client_id: newUuid(),
    sync_status: 'pending',
    created_at: new Date().toISOString(),
  };
  const id = await db.offline_geo_tags.add(record);
  return { ...record, id };
}

export async function queueGeoTagRefusal(
  input: Omit<OfflineGeoRefusal, 'id' | 'client_id' | 'sync_status' | 'created_at'>,
): Promise<OfflineGeoRefusal> {
  const record: OfflineGeoRefusal = {
    ...input,
    client_id: newUuid(),
    sync_status: 'pending',
    created_at: new Date().toISOString(),
  };
  const id = await db.offline_geo_refusals.add(record);
  return { ...record, id };
}

export async function queueOfflineDistribution(
  input: Omit<OfflineDistribution, 'id' | 'client_id' | 'sync_status' | 'timestamp'> & {
    timestamp?: string;
  },
): Promise<OfflineDistribution> {
  const record: OfflineDistribution = {
    ...input,
    client_id: newUuid(),
    timestamp: input.timestamp ?? new Date().toISOString(),
    sync_status: 'pending',
  };
  const id = await db.offline_distributions.add(record);
  return { ...record, id };
}

export async function pendingCount(): Promise<number> {
  return pendingQueueCount();
}

/* ------------------------------- Flushing ------------------------------- */

let syncingAll = false;

type AutoIncTable =
  | 'offline_planting_logs'
  | 'offline_pest_reports'
  | 'offline_farm_profiles'
  | 'offline_distributions'
  | 'offline_geo_tags'
  | 'offline_geo_refusals';

async function clearSyncedRows(
  table: AutoIncTable,
  rows: Array<{ id?: number; client_id: string }>,
  outcomes: SyncOutcome[] | undefined,
  counters: { synced: number; failed: number },
) {
  const byClient = new Map((outcomes ?? []).map((o) => [o.client_id, o]));
  for (const row of rows) {
    const outcome = byClient.get(row.client_id);
    if (!outcome || outcome.outcome === 'synced' || outcome.outcome === 'duplicate') {
      if (row.id != null) await db[table].delete(row.id);
      counters.synced++;
    } else {
      counters.failed++;
      if (row.id != null) await db[table].update(row.id, { sync_status: 'failed' });
    }
  }
}

/**
 * Offline-first sync engine:
 * 1. Abort when offline
 * 2. Collect every Dexie row with sync_status === 'pending'
 * 3. POST master payload to `/sync/bulk`
 * 4. On HTTP 200, delete (or mark synced) local rows to avoid duplicates
 */
export async function syncAllPendingData(): Promise<{ synced: number; failed: number }> {
  if (syncingAll || !isOnline()) {
    return { synced: 0, failed: 0 };
  }

  const [
    claimDistributions,
    assessments,
    planting_logs,
    pest_reports,
    farm_profiles,
    field_distributions,
    geo_tags,
    geo_refusals,
  ] = await Promise.all([
    db.pendingDistributions.toArray(),
    db.pendingAssessments.toArray(),
    db.offline_planting_logs.where('sync_status').equals('pending').toArray(),
    db.offline_pest_reports.where('sync_status').equals('pending').toArray(),
    db.offline_farm_profiles.where('sync_status').equals('pending').toArray(),
    db.offline_distributions.where('sync_status').equals('pending').toArray(),
    db.offline_geo_tags.where('sync_status').equals('pending').toArray(),
    db.offline_geo_refusals.where('sync_status').equals('pending').toArray(),
  ]);

  const hasWork =
    claimDistributions.length
    || assessments.length
    || planting_logs.length
    || pest_reports.length
    || farm_profiles.length
    || field_distributions.length
    || geo_tags.length
    || geo_refusals.length;

  if (!hasWork) {
    return { synced: 0, failed: 0 };
  }

  syncingAll = true;
  const counters = { synced: 0, failed: 0 };

  try {
    await db.pendingDistributions.toCollection().modify({ status: 'syncing' });
    await db.pendingAssessments.toCollection().modify({ status: 'syncing' });

    const plantingIds = planting_logs.map((r) => r.id!).filter(Boolean);
    const pestIds = pest_reports.map((r) => r.id!).filter(Boolean);
    const farmIds = farm_profiles.map((r) => r.id!).filter(Boolean);
    const fieldIds = field_distributions.map((r) => r.id!).filter(Boolean);
    const geoTagIds = geo_tags.map((r) => r.id!).filter(Boolean);
    const geoRefusalIds = geo_refusals.map((r) => r.id!).filter(Boolean);

    if (plantingIds.length) {
      await db.offline_planting_logs.where('id').anyOf(plantingIds).modify({ sync_status: 'syncing' });
    }
    if (pestIds.length) {
      await db.offline_pest_reports.where('id').anyOf(pestIds).modify({ sync_status: 'syncing' });
    }
    if (farmIds.length) {
      await db.offline_farm_profiles.where('id').anyOf(farmIds).modify({ sync_status: 'syncing' });
    }
    if (fieldIds.length) {
      await db.offline_distributions.where('id').anyOf(fieldIds).modify({ sync_status: 'syncing' });
    }
    if (geoTagIds.length) {
      await db.offline_geo_tags.where('id').anyOf(geoTagIds).modify({ sync_status: 'syncing' });
    }
    if (geoRefusalIds.length) {
      await db.offline_geo_refusals.where('id').anyOf(geoRefusalIds).modify({ sync_status: 'syncing' });
    }

    const payload = {
      device_id: getDeviceId(),
      distributions: claimDistributions.map((d) => ({
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
      planting_logs: planting_logs.map((r) => ({
        client_id: r.client_id,
        farmer_id: r.farmer_id,
        farm_plot_id: r.farm_plot_id,
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
        farmer_id: r.farmer_id || r.rsbsa_id,
        rsbsa_no: r.rsbsa_id,
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
        server_id: r.server_id,
        item_distributed: r.item_distributed,
        quantity: r.quantity,
      })),
      farm_profiles: farm_profiles.map((r) => ({
        client_id: r.client_id,
        farmer_id: r.farmer_id,
        coordinates: r.coordinates,
        total_area: r.total_area,
      })),
      field_distributions: field_distributions.map((r) => ({
        client_id: r.client_id,
        rsbsa_id: r.rsbsa_id,
        item_dispensed: r.item_dispensed,
        quantity: r.quantity,
        timestamp: r.timestamp,
        farmer_id: r.farmer_id,
        program_id: r.program_id,
      })),
      geo_tags: geo_tags.map((r) => ({
        client_id: r.client_id,
        farmer_id: r.farmer_id,
        rsbsa_no: r.rsbsa_no,
        device_id: getDeviceId(),
        geometry_type: r.geometry_type,
        coordinates: r.coordinates,
        crop_planted: r.crop_planted,
        crop_variety: r.crop_variety,
        parcel_name: r.parcel_name,
        incident_type: r.incident_type,
        observations: r.observations,
        photo_base64: r.photo_base64,
        accuracy_m: r.accuracy_m,
        non_productive_area_sqm: r.non_productive_area_sqm,
        has_discrepancy: r.has_discrepancy,
        notify_sms: r.notify_sms ?? true,
        planting_start_month: r.planting_start_month,
        planting_end_month: r.planting_end_month,
        farmer_signature_base64: r.farmer_signature_base64,
        aew_signature_base64: r.aew_signature_base64,
      })),
      geo_tag_refusals: geo_refusals.map((r) => ({
        client_id: r.client_id,
        farmer_id: r.farmer_id,
        rsbsa_no: r.rsbsa_no,
        device_id: getDeviceId(),
        attempt_number: r.attempt_number,
        reason: r.reason,
      })),
    };

    const res = await apiClient.post('/sync/bulk', payload);
    if (res.status !== 200) {
      throw new Error(`Sync HTTP ${res.status}`);
    }

    const results = res.data?.results ?? {};

    for (const r of (results.distributions ?? []) as SyncOutcome[]) {
      if (r.outcome === 'synced' || r.outcome === 'duplicate') {
        await db.pendingDistributions.delete(r.client_id as string);
        counters.synced++;
      } else if (r.client_id) {
        counters.failed++;
        await db.pendingDistributions.update(r.client_id, { status: 'failed', error: r.message });
      }
    }

    for (const r of (results.assessments ?? []) as SyncOutcome[]) {
      if (r.outcome === 'synced' || r.outcome === 'duplicate') {
        await db.pendingAssessments.delete(r.client_id as string);
        counters.synced++;
      } else if (r.client_id) {
        counters.failed++;
        await db.pendingAssessments.update(r.client_id, { status: 'failed', error: r.message });
      }
    }

    // Claims/assessments with no per-item results but HTTP 200 → clear syncing leftovers
    if (!results.distributions?.length && claimDistributions.length) {
      for (const d of claimDistributions) {
        await db.pendingDistributions.delete(d.client_id);
        counters.synced++;
      }
    }
    if (!results.assessments?.length && assessments.length) {
      for (const a of assessments) {
        await db.pendingAssessments.delete(a.client_id);
        counters.synced++;
      }
    }

    await clearSyncedRows('offline_planting_logs', planting_logs, results.planting_logs, counters);
    await clearSyncedRows('offline_pest_reports', pest_reports, results.pest_reports, counters);
    await clearSyncedRows('offline_farm_profiles', farm_profiles, results.farm_profiles, counters);
    await clearSyncedRows(
      'offline_distributions',
      field_distributions,
      results.field_distributions ?? results.offline_distributions,
      counters,
    );
    await clearSyncedRows('offline_geo_tags', geo_tags, results.geo_tags, counters);
    await clearSyncedRows('offline_geo_refusals', geo_refusals, results.geo_tag_refusals, counters);

    return counters;
  } catch {
    await db.pendingDistributions.where('status').equals('syncing').modify({ status: 'pending' });
    await db.pendingAssessments.where('status').equals('syncing').modify({ status: 'pending' });
    await db.offline_planting_logs.where('sync_status').equals('syncing').modify({ sync_status: 'pending' });
    await db.offline_pest_reports.where('sync_status').equals('syncing').modify({ sync_status: 'pending' });
    await db.offline_farm_profiles.where('sync_status').equals('syncing').modify({ sync_status: 'pending' });
    await db.offline_distributions.where('sync_status').equals('syncing').modify({ sync_status: 'pending' });
    await db.offline_geo_tags.where('sync_status').equals('syncing').modify({ sync_status: 'pending' });
    await db.offline_geo_refusals.where('sync_status').equals('syncing').modify({ sync_status: 'pending' });
    return { synced: 0, failed: 0 };
  } finally {
    syncingAll = false;
  }
}

/** @deprecated Prefer `syncAllPendingData()` — kept for existing call sites. */
export async function pushOfflineData(): Promise<{ synced: number; failed: number }> {
  return syncAllPendingData();
}

/** @deprecated Prefer `syncAllPendingData()` — kept for existing call sites. */
export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  return syncAllPendingData();
}
