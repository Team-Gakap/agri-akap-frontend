import Dexie, { type Table } from 'dexie';

export type QueueStatus = 'pending' | 'syncing' | 'failed';
export type OfflineSyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

/**
 * A distribution claim created in the field. When offline it is queued here
 * with a client-generated UUID (client_id) which becomes the server record's
 * primary key on sync, making the upload idempotent.
 */
export interface PendingDistribution {
  client_id: string;
  farmer_id: string;
  farmer_name?: string;
  program_id: string;
  program_name?: string;
  device_id: string;
  claimed_at: string;
  geo_tag_lat?: number | null;
  geo_tag_long?: number | null;
  photo_proof_base64?: string;
  status: QueueStatus;
  error?: string;
  created_at: string;
}

/**
 * A geotagged damage assessment captured in the field.
 */
export interface PendingAssessment {
  client_id: string;
  farm_plot_id: string;
  farmer_id?: string;
  farmer_name?: string;
  calamity_type: string;
  calamity_name?: string;
  crop_stage?: string | null;
  area_destroyed_ha?: number | null;
  date_of_calamity: string;
  damage_percentage: number;
  estimated_value_lost?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  device_id: string;
  photo_base64: string;
  status: QueueStatus;
  error?: string;
  created_at: string;
}

/** Lightweight offline subsidy dispense row (RSBSA-first). */
export interface OfflineDistribution {
  id?: number;
  client_id: string;
  rsbsa_id: string;
  item_dispensed: string;
  quantity: number | string;
  timestamp: string;
  farmer_id?: string;
  program_id?: string;
  sync_status: OfflineSyncStatus;
}

/** Offline planting log queued for `/sync/bulk`. */
export interface OfflinePlantingLog {
  id?: number;
  client_id: string;
  farmer_id: string;
  crop_type: string;
  variety: string;
  area_planted: number;
  date_planted: string;
  status: string;
  water_source: string;
  latitude?: number | null;
  longitude?: number | null;
  rsbsa_no?: string;
  farmer_name?: string;
  sync_status: OfflineSyncStatus;
  created_at: string;
}

/** Offline pest response queued for `/sync/bulk`. */
export interface OfflinePestReport {
  id?: number;
  client_id: string;
  /** RSBSA number preferred for field capture */
  rsbsa_id: string;
  farmer_id?: string;
  crop?: string;
  pest_name?: string;
  incidence: number;
  severity: string;
  advisory?: string;
  is_outbreak?: boolean;
  photo_base64: string | null;
  lat: number | null;
  lng: number | null;
  report_id?: string;
  item_distributed?: string;
  quantity?: string;
  sync_status: OfflineSyncStatus;
  created_at?: string;
}

/** Offline farm profile / perimeter pin queued for `/sync/bulk`. */
export interface OfflineFarmProfile {
  id?: number;
  client_id: string;
  farmer_id: string;
  /** JSON string: { lat, lng } or polygon vertices */
  coordinates: string;
  total_area: number;
  sync_status: OfflineSyncStatus;
  created_at: string;
}

/** Read caches so the field tool works with no connectivity. */
export interface CachedRecord {
  id: string;
  payload: any;
  cached_at: string;
}

/**
 * Central IndexedDB database for AGRI-AKAP offline-first sync.
 */
class AgriAkapDB extends Dexie {
  pendingDistributions!: Table<PendingDistribution, string>;
  pendingAssessments!: Table<PendingAssessment, string>;
  cachedPrograms!: Table<CachedRecord, string>;
  cachedFarmers!: Table<CachedRecord, string>;
  cachedFarmPlots!: Table<CachedRecord, string>;
  offline_planting_logs!: Table<OfflinePlantingLog, number>;
  offline_pest_reports!: Table<OfflinePestReport, number>;
  offline_farm_profiles!: Table<OfflineFarmProfile, number>;
  offline_distributions!: Table<OfflineDistribution, number>;

  constructor() {
    // IndexedDB name kept as `agri-akap` so existing queued rows survive upgrades.
    super('agri-akap');
    this.version(1).stores({
      pendingDistributions: 'client_id, status, created_at',
      pendingAssessments: 'client_id, status, created_at',
      cachedPrograms: 'id, cached_at',
      cachedFarmers: 'id, cached_at',
      cachedFarmPlots: 'id, cached_at',
    });
    this.version(2).stores({
      pendingDistributions: 'client_id, status, created_at',
      pendingAssessments: 'client_id, status, created_at',
      cachedPrograms: 'id, cached_at',
      cachedFarmers: 'id, cached_at',
      cachedFarmPlots: 'id, cached_at',
    });
    this.version(3).stores({
      pendingDistributions: 'client_id, status, created_at',
      pendingAssessments: 'client_id, status, created_at',
      cachedPrograms: 'id, cached_at',
      cachedFarmers: 'id, cached_at',
      cachedFarmPlots: 'id, cached_at',
    });
    // v4 — offline-first field queues (planting / pest / farm profile)
    this.version(4).stores({
      pendingDistributions: 'client_id, status, created_at',
      pendingAssessments: 'client_id, status, created_at',
      cachedPrograms: 'id, cached_at',
      cachedFarmers: 'id, cached_at',
      cachedFarmPlots: 'id, cached_at',
      offline_planting_logs: '++id, farmer_id, crop_type, variety, area_planted, date_planted, status, water_source, sync_status, client_id',
      offline_pest_reports: '++id, farmer_id, crop, incidence, severity, advisory, is_outbreak, photo_base64, lat, lng, sync_status, client_id',
      offline_farm_profiles: '++id, farmer_id, coordinates, total_area, sync_status, client_id',
    });
    // v5 — RSBSA-first distributions + pest index; DB renamed via Dexie name above for new installs
    this.version(5).stores({
      pendingDistributions: 'client_id, status, created_at',
      pendingAssessments: 'client_id, status, created_at',
      cachedPrograms: 'id, cached_at',
      cachedFarmers: 'id, cached_at',
      cachedFarmPlots: 'id, cached_at',
      offline_planting_logs: '++id, farmer_id, crop_type, sync_status, client_id',
      offline_pest_reports: '++id, rsbsa_id, incidence, severity, photo_base64, lat, lng, sync_status, client_id',
      offline_farm_profiles: '++id, farmer_id, coordinates, total_area, sync_status, client_id',
      offline_distributions: '++id, rsbsa_id, item_dispensed, quantity, timestamp, sync_status, client_id',
    });
  }
}

export const db = new AgriAkapDB();

/** Count unsynced field records across all offline queues. */
export async function pendingQueueCount(): Promise<number> {
  const [distributions, assessments, planting, pests, farms, fieldDist] = await Promise.all([
    db.pendingDistributions.count(),
    db.pendingAssessments.count(),
    db.offline_planting_logs.where('sync_status').equals('pending').count(),
    db.offline_pest_reports.where('sync_status').equals('pending').count(),
    db.offline_farm_profiles.where('sync_status').equals('pending').count(),
    db.offline_distributions.where('sync_status').equals('pending').count(),
  ]);
  return distributions + assessments + planting + pests + farms + fieldDist;
}

/** Generate a client-side UUID (used as the eventual server PK). */
export function newUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Stable per-device identifier for audit trails. */
export function getDeviceId(): string {
  const key = 'agri_device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = 'DEV-' + newUuid();
    localStorage.setItem(key, id);
  }
  return id;
}
