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
  type OfflineHarvestLog,
  type OfflineStandingCropLog,
  type OfflineSyncStatus,
} from '@/database/db';
import { isOnline as connectivityIsOnline, isNetworkError, isRetryableSyncError, markReachable, markUnreachable } from './connectivity';
import { shrinkSyncImage } from '@/utils/resizeImageForId';

export interface SyncOutcome {
  client_id: string | null;
  outcome: 'synced' | 'duplicate' | 'failed';
  message: string;
}

/** True only when the device has a network interface up AND the backend recently answered. */
export function isOnline(): boolean {
  return connectivityIsOnline();
}

export { isNetworkError, isRetryableSyncError };

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
    seed_class: p.seed_class ?? null,
    item_type: p.item_type ?? null,
    remaining_quantity: Number(p.remaining_quantity) || 0,
    total_quantity: Number(p.total_quantity) || 0,
    unit_of_measurement: p.unit_of_measurement || 'Bags',
    secondary_unit: p.secondary_unit ?? null,
    secondary_remaining_quantity: p.secondary_remaining_quantity != null ? Number(p.secondary_remaining_quantity) : null,
    secondary_total_quantity: p.secondary_total_quantity != null ? Number(p.secondary_total_quantity) : null,
    per_hectare_allocation: Number(p.items_per_hectare ?? p.per_hectare_allocation) || 0,
    items_per_hectare: Number(p.items_per_hectare ?? p.per_hectare_allocation) || 0,
    secondary_items_per_hectare: p.secondary_items_per_hectare != null ? Number(p.secondary_items_per_hectare) : null,
    max_hectares_limit: Number(p.max_hectares_limit) || 0,
    status: p.status,
    source: 'subsidy' as const,
    end_date: p.end_date || (p.status === 'Active' ? 'Active' : p.status),
  };
}

export async function cacheFarmer(farmer: any) {
  if (!farmer?.id) return;
  await db.cachedFarmers.put({ id: farmer.id, payload: farmer, cached_at: new Date().toISOString() });
  for (const plot of farmer.farm_plots ?? farmer.farmPlots ?? []) {
    if (plot?.id) {
      await db.cachedFarmPlots.put({ id: plot.id, payload: plot, cached_at: new Date().toISOString() });
    }
  }
}

export async function cacheActivePlanting(key: string, payload: any) {
  if (!key) return;
  await db.cachedActivePlanting.put({
    id: key,
    payload: payload ?? null,
    cached_at: new Date().toISOString(),
  });
}

export async function getCachedActivePlanting(key: string): Promise<any | undefined> {
  if (!key) return undefined;
  const row = await db.cachedActivePlanting.get(key);
  return row ? row.payload : undefined;
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

/** Search farmers by name/RSBSA. Caches every result and falls back to that
 *  cache (filtered locally) when offline or the request can't reach the server. */
export async function searchFarmers(term: string): Promise<any[]> {
  const value = term.trim();
  if (value.length < 2) return [];

  if (isOnline()) {
    try {
      const res = await apiClient.get('/farmers', {
        params: { search: value, per_page: 20, page: 1 },
      });
      const rows = res.data?.data?.data ?? [];
      for (const f of rows) await cacheFarmer(f);
      return rows;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      /* fall through to cache below */
    }
  }

  return searchCachedFarmers(value);
}

/** Filter previously-cached farmers by name/RSBSA/barangay — used offline. */
export async function searchCachedFarmers(term: string): Promise<any[]> {
  const value = term.trim().toLowerCase();
  if (value.length < 2) return [];
  const cached = await db.cachedFarmers.toArray();
  return cached
    .map((r) => r.payload)
    .filter((f: any) => {
      const name = `${f.surname || ''}, ${f.first_name || ''} ${f.middle_name || ''}`.toLowerCase();
      return name.includes(value)
        || String(f.rsbsa_no || '').toLowerCase().includes(value)
        || String(f.permanent_brgy || f.barangay || '').toLowerCase().includes(value);
    })
    .slice(0, 20);
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
  source?: 'subsidy' | 'program';
  farmer_id: string;
  farmer_name?: string;
  program_id: string;
  program_name?: string;
  rsbsa_no?: string | null;
  beneficiary_id?: string | null;
  geo_tag_lat?: number | null;
  geo_tag_long?: number | null;
  photo_proof_base64?: string;
}): Promise<PendingDistribution> {
  const record: PendingDistribution = {
    client_id: newUuid(),
    source: input.source ?? 'program',
    farmer_id: input.farmer_id,
    farmer_name: input.farmer_name,
    program_id: input.program_id,
    program_name: input.program_name,
    rsbsa_no: input.rsbsa_no ?? null,
    beneficiary_id: input.beneficiary_id ?? null,
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

export async function queueHarvestLog(
  input: Omit<OfflineHarvestLog, 'id' | 'client_id' | 'sync_status' | 'created_at'>,
): Promise<OfflineHarvestLog> {
  const record: OfflineHarvestLog = {
    ...input,
    client_id: newUuid(),
    sync_status: 'pending',
    created_at: new Date().toISOString(),
  };
  const id = await db.offline_harvest_logs.add(record);
  return { ...record, id };
}

export async function queueStandingCropLog(
  input: Omit<OfflineStandingCropLog, 'id' | 'client_id' | 'sync_status' | 'created_at'>,
): Promise<OfflineStandingCropLog> {
  const record: OfflineStandingCropLog = {
    ...input,
    client_id: newUuid(),
    sync_status: 'pending',
    created_at: new Date().toISOString(),
  };
  const id = await db.offline_standing_crop_logs.add(record);
  return { ...record, id };
}

/* --------------------------- Queue list caching -------------------------- */

/** Cache a dispatch queue list (pest/calamity/geo-tag) for offline browsing. */
export async function cacheQueueList(kind: 'pest' | 'calamity' | 'geotag', rows: any[]): Promise<void> {
  await db.cachedQueueLists.put({ kind, rows, cached_at: new Date().toISOString() });
}

/** Read back the last cached dispatch queue list; null if never cached. */
export async function getCachedQueueList(
  kind: 'pest' | 'calamity' | 'geotag',
): Promise<{ rows: any[]; cachedAt: string } | null> {
  const row = await db.cachedQueueLists.get(kind);
  if (!row) return null;
  return { rows: row.rows, cachedAt: row.cached_at };
}

export async function pendingCount(): Promise<number> {
  return pendingQueueCount();
}

export interface PendingQueueItem {
  key: string;
  type: string;
  title: string;
  detail: string;
  createdAt?: string;
  status: 'pending' | 'failed';
  error?: string;
}

const PENDING_OR_FAILED: OfflineSyncStatus[] = ['pending', 'failed'];

export async function listPendingQueueItems(): Promise<PendingQueueItem[]> {
  const [assessments, planting, pests, farms, fieldDist, geoTags, geoRefusals, distributions, harvest, standing] = await Promise.all([
    db.pendingAssessments.toArray(),
    db.offline_planting_logs.where('sync_status').anyOf(PENDING_OR_FAILED).toArray(),
    db.offline_pest_reports.where('sync_status').anyOf(PENDING_OR_FAILED).toArray(),
    db.offline_farm_profiles.where('sync_status').anyOf(PENDING_OR_FAILED).toArray(),
    db.offline_distributions.where('sync_status').anyOf(PENDING_OR_FAILED).toArray(),
    db.offline_geo_tags.where('sync_status').anyOf(PENDING_OR_FAILED).toArray(),
    db.offline_geo_refusals.where('sync_status').anyOf(PENDING_OR_FAILED).toArray(),
    db.pendingDistributions.toArray(),
    db.offline_harvest_logs.where('sync_status').anyOf(PENDING_OR_FAILED).toArray(),
    db.offline_standing_crop_logs.where('sync_status').anyOf(PENDING_OR_FAILED).toArray(),
  ]);

  const items: PendingQueueItem[] = [
    ...assessments.map((r) => ({
      key: `assessment-${r.client_id}`,
      type: 'Calamity',
      title: r.farmer_name || r.calamity_name || r.calamity_type,
      detail: `${r.calamity_type} · ${r.damage_percentage}%`,
      createdAt: r.created_at,
      status: (r.status === 'failed' ? 'failed' : 'pending') as 'pending' | 'failed',
      error: r.error,
    })),
    ...planting.map((r) => ({
      key: `planting-${r.id}`,
      type: 'Planting',
      title: r.farmer_name || r.crop_type,
      detail: `${r.crop_type} · ${r.variety}`,
      createdAt: r.created_at,
      status: (r.sync_status === 'failed' ? 'failed' : 'pending') as 'pending' | 'failed',
      error: r.error,
    })),
    ...pests.map((r) => ({
      key: `pest-${r.id}`,
      type: 'Pest',
      title: r.pest_name || r.crop || 'Pest report',
      detail: `${r.crop || 'Crop'} · ${r.severity}`,
      createdAt: r.created_at,
      status: (r.sync_status === 'failed' ? 'failed' : 'pending') as 'pending' | 'failed',
      error: r.error,
    })),
    ...farms.map((r) => ({
      key: `farm-${r.id}`,
      type: 'Farm profile',
      title: 'Farm perimeter',
      detail: `${r.total_area} ha`,
      createdAt: r.created_at,
      status: (r.sync_status === 'failed' ? 'failed' : 'pending') as 'pending' | 'failed',
      error: r.error,
    })),
    ...fieldDist.map((r) => ({
      key: `dist-${r.id}`,
      type: 'Subsidy',
      title: r.item_dispensed,
      detail: `${r.rsbsa_id} · ${r.quantity}`,
      createdAt: r.timestamp,
      status: (r.sync_status === 'failed' ? 'failed' : 'pending') as 'pending' | 'failed',
      error: r.error,
    })),
    ...geoTags.map((r) => ({
      key: `geo-${r.id}`,
      type: 'Geo-tag',
      title: r.farmer_name || r.parcel_name || r.crop_planted,
      detail: `${r.crop_planted}${r.crop_variety ? ` · ${r.crop_variety}` : ''}`,
      createdAt: r.created_at,
      status: (r.sync_status === 'failed' ? 'failed' : 'pending') as 'pending' | 'failed',
      error: r.error,
    })),
    ...geoRefusals.map((r) => ({
      key: `refusal-${r.id}`,
      type: 'Geo refusal',
      title: r.farmer_name || 'Refusal',
      detail: `Attempt ${r.attempt_number ?? 1}`,
      createdAt: r.created_at,
      status: (r.sync_status === 'failed' ? 'failed' : 'pending') as 'pending' | 'failed',
      error: r.error,
    })),
    ...distributions.map((r) => ({
      key: `claim-${r.client_id}`,
      type: 'Claim',
      title: r.farmer_name || r.program_name || 'Distribution',
      detail: r.program_name || r.farmer_id,
      createdAt: r.created_at,
      status: (r.status === 'failed' ? 'failed' : 'pending') as 'pending' | 'failed',
      error: r.error,
    })),
    ...harvest.map((r) => ({
      key: `harvest-${r.id}`,
      type: 'Harvest',
      title: r.farmer_name || r.crop_type,
      detail: `${r.crop_type} · ${r.total_yield} ${r.yield_unit}`,
      createdAt: r.created_at,
      status: (r.sync_status === 'failed' ? 'failed' : 'pending') as 'pending' | 'failed',
      error: r.error,
    })),
    ...standing.map((r) => ({
      key: `standing-${r.id}`,
      type: 'Standing crop',
      title: r.farmer_name || r.crop_type,
      detail: `${r.crop_type} · ${r.growth_stage}`,
      createdAt: r.created_at,
      status: (r.sync_status === 'failed' ? 'failed' : 'pending') as 'pending' | 'failed',
      error: r.error,
    })),
  ];

  return items.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'failed' ? -1 : 1;
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });
}

/* ------------------------------- Flushing ------------------------------- */

let syncingAll = false;

type AutoIncTable =
  | 'offline_planting_logs'
  | 'offline_pest_reports'
  | 'offline_farm_profiles'
  | 'offline_distributions'
  | 'offline_geo_tags'
  | 'offline_geo_refusals'
  | 'offline_harvest_logs'
  | 'offline_standing_crop_logs';

/** Point list from a queued geo-tag's JSON coordinates field. */
function parseQueuedGeoPoints(raw: string): Array<{ lat: number; lng: number }> {
  try {
    const decoded = JSON.parse(raw);
    if (decoded && typeof decoded === 'object' && 'lat' in decoded && 'lng' in decoded) {
      return [{ lat: Number(decoded.lat), lng: Number(decoded.lng) }];
    }
    if (!Array.isArray(decoded)) return [];
    return decoded
      .filter((p) => p && typeof p === 'object' && 'lat' in p && 'lng' in p)
      .map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  } catch {
    return [];
  }
}

/**
 * Queued 3-point same-spot walks are stored as polygons with ~0 ha. Send them
 * as a marker so Sync Now retries instead of hitting the zero-area rejection.
 */
function coerceDegenerateGeoTag(row: OfflineGeoTag): {
  geometry_type: OfflineGeoTag['geometry_type'];
  coordinates: string;
} {
  if (row.geometry_type !== 'polygon') {
    return { geometry_type: row.geometry_type, coordinates: row.coordinates };
  }

  const points = parseQueuedGeoPoints(row.coordinates);
  const gross = Number(row.gross_area_sqm);
  const finalHa = Number(row.final_area_ha);
  const zeroArea =
    points.length < 3
    || (Number.isFinite(gross) && gross < 1)
    || (Number.isFinite(finalHa) && finalHa <= 0);

  if (!zeroArea || points.length === 0) {
    return { geometry_type: 'polygon', coordinates: row.coordinates };
  }

  const centroid = {
    lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
    lng: points.reduce((s, p) => s + p.lng, 0) / points.length,
  };
  return { geometry_type: 'marker', coordinates: JSON.stringify(centroid) };
}

const BULK_SYNC_TIMEOUT_MS = 120_000;

type MissingOutcome = 'synced' | 'pending';

export interface SyncFlushResult {
  synced: number;
  failed: number;
  errored?: boolean;
  errorMessage?: string;
}

async function clearSyncedRows(
  table: AutoIncTable,
  rows: Array<{ id?: number; client_id: string }>,
  outcomes: SyncOutcome[] | undefined,
  counters: { synced: number; failed: number },
  missing: MissingOutcome = 'synced',
) {
  const byClient = new Map((outcomes ?? []).map((o) => [o.client_id, o]));
  for (const row of rows) {
    const outcome = byClient.get(row.client_id);
    if (outcome?.outcome === 'synced' || outcome?.outcome === 'duplicate') {
      if (row.id != null) await db[table].delete(row.id);
      counters.synced++;
    } else if (outcome?.outcome === 'failed') {
      counters.failed++;
      if (row.id != null) {
        await db[table].update(row.id, { sync_status: 'failed', error: outcome.message });
      }
    } else if (missing === 'synced') {
      if (row.id != null) await db[table].delete(row.id);
      counters.synced++;
    } else if (row.id != null) {
      await db[table].update(row.id, { sync_status: 'pending' });
    }
  }
}

async function applyKeyedOutcomes(
  table: 'pendingDistributions' | 'pendingAssessments',
  rows: Array<{ client_id: string }>,
  outcomes: SyncOutcome[] | undefined,
  counters: { synced: number; failed: number },
  missing: MissingOutcome,
) {
  const byClient = new Map((outcomes ?? []).map((o) => [o.client_id, o]));
  for (const row of rows) {
    const outcome = byClient.get(row.client_id);
    if (outcome?.outcome === 'synced' || outcome?.outcome === 'duplicate') {
      await db[table].delete(row.client_id);
      counters.synced++;
    } else if (outcome?.outcome === 'failed') {
      counters.failed++;
      await db[table].update(row.client_id, { status: 'failed', error: outcome.message });
    } else if (missing === 'synced') {
      await db[table].delete(row.client_id);
      counters.synced++;
    } else {
      await db[table].update(row.client_id, { status: 'pending' });
    }
  }
}

type BulkResults = Record<string, SyncOutcome[] | undefined>;

async function applyAllBulkResults(
  results: BulkResults,
  rows: {
    claimDistributions: Array<{ client_id: string }>;
    assessments: Array<{ client_id: string }>;
    planting_logs: Array<{ id?: number; client_id: string }>;
    pest_reports: Array<{ id?: number; client_id: string }>;
    farm_profiles: Array<{ id?: number; client_id: string }>;
    field_distributions: Array<{ id?: number; client_id: string }>;
    geo_tags: Array<{ id?: number; client_id: string }>;
    geo_refusals: Array<{ id?: number; client_id: string }>;
    harvest_logs: Array<{ id?: number; client_id: string }>;
    standing_crop_logs: Array<{ id?: number; client_id: string }>;
  },
  counters: { synced: number; failed: number },
  missing: MissingOutcome,
) {
  await applyKeyedOutcomes('pendingDistributions', rows.claimDistributions, results.distributions, counters, missing);
  await applyKeyedOutcomes('pendingAssessments', rows.assessments, results.assessments, counters, missing);
  await clearSyncedRows('offline_planting_logs', rows.planting_logs, results.planting_logs, counters, missing);
  await clearSyncedRows('offline_pest_reports', rows.pest_reports, results.pest_reports, counters, missing);
  await clearSyncedRows('offline_farm_profiles', rows.farm_profiles, results.farm_profiles, counters, missing);
  await clearSyncedRows(
    'offline_distributions',
    rows.field_distributions,
    results.field_distributions ?? results.offline_distributions,
    counters,
    missing,
  );
  await clearSyncedRows('offline_geo_tags', rows.geo_tags, results.geo_tags, counters, missing);
  await clearSyncedRows('offline_geo_refusals', rows.geo_refusals, results.geo_tag_refusals, counters, missing);
  await clearSyncedRows('offline_harvest_logs', rows.harvest_logs, results.harvest_logs, counters, missing);
  await clearSyncedRows('offline_standing_crop_logs', rows.standing_crop_logs, results.standing_crop_logs, counters, missing);

  if (counters.synced > 0) {
    await db.cachedQueueLists.clear();
  }
}

export async function resetSyncingToPending() {
  await db.pendingDistributions.where('status').equals('syncing').modify({ status: 'pending' });
  await db.pendingAssessments.where('status').equals('syncing').modify({ status: 'pending' });
  await db.offline_planting_logs.where('sync_status').equals('syncing').modify({ sync_status: 'pending' });
  await db.offline_pest_reports.where('sync_status').equals('syncing').modify({ sync_status: 'pending' });
  await db.offline_farm_profiles.where('sync_status').equals('syncing').modify({ sync_status: 'pending' });
  await db.offline_distributions.where('sync_status').equals('syncing').modify({ sync_status: 'pending' });
  await db.offline_geo_tags.where('sync_status').equals('syncing').modify({ sync_status: 'pending' });
  await db.offline_geo_refusals.where('sync_status').equals('syncing').modify({ sync_status: 'pending' });
  await db.offline_harvest_logs.where('sync_status').equals('syncing').modify({ sync_status: 'pending' });
  await db.offline_standing_crop_logs.where('sync_status').equals('syncing').modify({ sync_status: 'pending' });
}

function axiosResponseData(err: unknown): { message?: string; results?: BulkResults } | undefined {
  const data = (err as { response?: { data?: { message?: string; results?: BulkResults } } })?.response?.data;
  return data && typeof data === 'object' ? data : undefined;
}

/**
 * Offline-first sync engine:
 * 1. Abort when offline
 * 2. Collect every Dexie row with sync_status === 'pending' or 'failed'
 * 3. POST master payload to `/sync/bulk` (120s timeout for geo-tag photos)
 * 4. Apply per-item results (HTTP 200 or error bodies that include `results`)
 */
export async function syncAllPendingData(): Promise<SyncFlushResult> {
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
    harvest_logs,
    standing_crop_logs,
  ] = await Promise.all([
    db.pendingDistributions.toArray(),
    db.pendingAssessments.toArray(),
    db.offline_planting_logs.where('sync_status').anyOf(PENDING_OR_FAILED).toArray(),
    db.offline_pest_reports.where('sync_status').anyOf(PENDING_OR_FAILED).toArray(),
    db.offline_farm_profiles.where('sync_status').anyOf(PENDING_OR_FAILED).toArray(),
    db.offline_distributions.where('sync_status').anyOf(PENDING_OR_FAILED).toArray(),
    db.offline_geo_tags.where('sync_status').anyOf(PENDING_OR_FAILED).toArray(),
    db.offline_geo_refusals.where('sync_status').anyOf(PENDING_OR_FAILED).toArray(),
    db.offline_harvest_logs.where('sync_status').anyOf(PENDING_OR_FAILED).toArray(),
    db.offline_standing_crop_logs.where('sync_status').anyOf(PENDING_OR_FAILED).toArray(),
  ]);

  const hasWork =
    claimDistributions.length
    || assessments.length
    || planting_logs.length
    || pest_reports.length
    || farm_profiles.length
    || field_distributions.length
    || geo_tags.length
    || geo_refusals.length
    || harvest_logs.length
    || standing_crop_logs.length;

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
    const harvestIds = harvest_logs.map((r) => r.id!).filter(Boolean);
    const standingIds = standing_crop_logs.map((r) => r.id!).filter(Boolean);

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
    if (harvestIds.length) {
      await db.offline_harvest_logs.where('id').anyOf(harvestIds).modify({ sync_status: 'syncing' });
    }
    if (standingIds.length) {
      await db.offline_standing_crop_logs.where('id').anyOf(standingIds).modify({ sync_status: 'syncing' });
    }

    const payload = {
      device_id: getDeviceId(),
      distributions: await Promise.all(claimDistributions.map(async (d) => ({
        client_id: d.client_id,
        source: d.source ?? 'program',
        farmer_id: d.farmer_id,
        program_id: d.program_id,
        rsbsa_no: d.rsbsa_no,
        beneficiary_id: d.beneficiary_id,
        device_id: d.device_id,
        claimed_at: d.claimed_at,
        geo_tag_lat: d.geo_tag_lat,
        geo_tag_long: d.geo_tag_long,
        photo_proof_base64: await shrinkSyncImage(d.photo_proof_base64),
      }))),
      assessments: await Promise.all(assessments.map(async (a) => ({
        id: a.client_id,
        assessment_id: a.assessment_id,
        farm_plot_id: a.farm_plot_id,
        farmer_id: a.farmer_id,
        farmer_name: a.farmer_name,
        calamity_type: a.calamity_type,
        calamity_name: a.calamity_name,
        crop_stage: a.crop_stage,
        variety: a.variety,
        area_planted_ha: a.area_planted_ha,
        area_destroyed_ha: a.area_destroyed_ha,
        date_of_calamity: a.date_of_calamity,
        damage_percentage: a.damage_percentage,
        estimated_value_lost: a.estimated_value_lost,
        latitude: a.latitude,
        longitude: a.longitude,
        device_id: a.device_id,
        photo_base64: await shrinkSyncImage(a.photo_base64),
      }))),
      planting_logs: planting_logs.map((r) => ({
        client_id: r.client_id,
        farmer_id: r.farmer_id,
        farm_plot_id: r.farm_plot_id || undefined,
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
      pest_reports: await Promise.all(pest_reports.map(async (r) => ({
        client_id: r.client_id,
        farmer_id: r.farmer_id || r.rsbsa_id,
        rsbsa_no: r.rsbsa_id,
        crop: r.crop,
        pest_name: r.pest_name,
        incidence: r.incidence,
        severity: r.severity,
        advisory: r.advisory,
        is_outbreak: r.is_outbreak,
        photo_base64: await shrinkSyncImage(r.photo_base64),
        lat: r.lat,
        lng: r.lng,
        report_id: r.report_id,
        server_id: r.server_id,
        item_distributed: r.item_distributed,
        quantity: r.quantity,
      }))),
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
      geo_tags: await Promise.all(geo_tags.map(async (r) => {
        const coerced = coerceDegenerateGeoTag(r);
        return {
        client_id: r.client_id,
        farmer_id: r.farmer_id,
        rsbsa_no: r.rsbsa_no,
        farm_plot_id: r.farm_plot_id,
        device_id: getDeviceId(),
        geometry_type: coerced.geometry_type,
        coordinates: coerced.coordinates,
        crop_planted: r.crop_planted,
        crop_variety: r.crop_variety,
        parcel_name: r.parcel_name,
        incident_type: r.incident_type || 'none',
        observations: r.observations,
        photo_base64: await shrinkSyncImage(r.photo_base64),
        accuracy_m: r.accuracy_m,
        non_productive_area_sqm: coerced.geometry_type === 'polygon' ? r.non_productive_area_sqm : 0,
        has_discrepancy: r.has_discrepancy,
        planting_start_month: r.planting_start_month,
        planting_end_month: r.planting_end_month,
        farmer_signature_base64: await shrinkSyncImage(r.farmer_signature_base64, 1200),
        aew_signature_base64: await shrinkSyncImage(r.aew_signature_base64, 1200),
        };
      })),
      geo_tag_refusals: geo_refusals.map((r) => ({
        client_id: r.client_id,
        farmer_id: r.farmer_id,
        rsbsa_no: r.rsbsa_no,
        device_id: getDeviceId(),
        attempt_number: r.attempt_number,
        reason: r.reason,
      })),
      harvest_logs: harvest_logs.map((r) => ({
        client_id: r.client_id,
        farmer_id: r.farmer_id,
        farm_plot_id: r.farm_plot_id || undefined,
        rsbsa_no: r.rsbsa_no,
        crop_type: r.crop_type,
        variety: r.variety,
        area_harvested: r.area_harvested,
        total_yield: r.total_yield,
        yield_unit: r.yield_unit,
        date_harvested: r.date_harvested,
        farm_location: r.farm_location,
      })),
      standing_crop_logs: standing_crop_logs.map((r) => ({
        client_id: r.client_id,
        farmer_id: r.farmer_id,
        farm_plot_id: r.farm_plot_id || undefined,
        rsbsa_no: r.rsbsa_no,
        crop_type: r.crop_type,
        variety: r.variety,
        area_ha: r.area_ha,
        growth_stage: r.growth_stage,
        est_harvest_date: r.est_harvest_date,
        farm_location: r.farm_location,
      })),
    };

    const bulkRows = {
      claimDistributions,
      assessments,
      planting_logs,
      pest_reports,
      farm_profiles,
      field_distributions,
      geo_tags,
      geo_refusals,
      harvest_logs,
      standing_crop_logs,
    };

    const res = await apiClient.post('/sync/bulk', payload, { timeout: BULK_SYNC_TIMEOUT_MS });
    if (res.status !== 200) {
      throw new Error(`Sync HTTP ${res.status}`);
    }
    markReachable();

    await applyAllBulkResults(res.data?.results ?? {}, bulkRows, counters, 'pending');

    return counters;
  } catch (err) {
    const errorBody = axiosResponseData(err);
    if (errorBody?.results) {
      await applyAllBulkResults(errorBody.results, {
        claimDistributions,
        assessments,
        planting_logs,
        pest_reports,
        farm_profiles,
        field_distributions,
        geo_tags,
        geo_refusals,
        harvest_logs,
        standing_crop_logs,
      }, counters, 'pending');
      return counters;
    }

    if (isNetworkError(err)) {
      markUnreachable();
    }
    console.warn('[AGRI-AKAP] Bulk sync failed, will retry:', err);
    await resetSyncingToPending();
    return {
      synced: 0,
      failed: 0,
      errored: true,
      errorMessage: errorBody?.message,
    };
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
