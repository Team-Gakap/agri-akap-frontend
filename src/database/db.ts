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
  farm_plot_id?: string;
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
  server_id?: string;
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

/** Geometry kind for advanced mobile GIS / geo-tag records. */
export type GeoTagGeometryType = 'polygon' | 'marker';

/** Incident classification aligned with MAO dashboard map colors. */
export type GeoTagIncidentType = 'none' | 'pest' | 'calamity';

/** DA-RSBSA commodity classification (KoboCollect parity). */
export type GeoTagCommodity = 'Rice' | 'Corn' | 'High-Value Crops';

/**
 * Offline geo-tag (farm boundary polygon OR incident marker) with crop metadata
 * and optional Base64 photo evidence. Synced to Laravel MAO later via `/sync/bulk`.
 *
 * DA-RSBSA Georeferencing Guidelines (RCM Protocol) compliance fields:
 * `gross_area_sqm`/`non_productive_area_sqm`/`final_area_*` capture the
 * infrastructure deduction, and `has_discrepancy` flags spatial overlaps or
 * undeclared fields for MAO review. `notify_sms` tells the backend whether to
 * fire the Semaphore "Georeferencing Stub" SMS once the farm_plots record
 * (created from a completed polygon) is saved.
 *
 * DA GeoLogBook fields (replaces reliance on KoboCollect): `planting_start_month`
 * / `planting_end_month` capture the DA planting calendar window, and
 * `farmer_signature_base64` / `aew_signature_base64` capture the wet-signature
 * consent + validation pair required by the RSBSA georeferencing form.
 */
export interface OfflineGeoTag {
  id?: number;
  client_id: string;
  farmer_id?: string;
  farmer_name?: string;
  rsbsa_no?: string;
  geometry_type: GeoTagGeometryType;
  /** Polygon vertices [{lat,lng},…] or single marker {lat,lng} */
  coordinates: string;
  crop_planted: string;
  crop_variety: string;
  /** FFRS 2.0 multi-parcel: farm parcel identifier (e.g. "Parcel 1"). */
  parcel_name: string;
  incident_type: GeoTagIncidentType;
  observations: string;
  photo_base64: string | null;
  accuracy_m?: number | null;
  /** Gross shoelace-estimated polygon area (sqm), before deduction. Null for markers. */
  gross_area_sqm?: number | null;
  /** Infrastructure/idle area subtracted per DA guidelines (>200 sqm must be deducted). */
  non_productive_area_sqm?: number | null;
  /** gross_area_sqm - non_productive_area_sqm, floored at 0. Null for markers. */
  final_area_sqm?: number | null;
  /** final_area_sqm converted to hectares. Null for markers. */
  final_area_ha?: number | null;
  /** Technician-flagged spatial overlap / undeclared field, routed to MAO review. */
  has_discrepancy?: boolean;
  /** When true (default), backend fires the Semaphore georeferencing SMS on save. */
  notify_sms?: boolean;
  /** DA planting calendar: month the crop was/will be planted (e.g. "May"). */
  planting_start_month?: string | null;
  /** DA planting calendar: expected month of harvest (e.g. "October"). */
  planting_end_month?: string | null;
  /** Base64 PNG — farmer's wet-signature consent for georeferencing. */
  farmer_signature_base64?: string | null;
  /** Base64 PNG — AEW/technician validator signature. */
  aew_signature_base64?: string | null;
  sync_status: OfflineSyncStatus;
  created_at: string;
}

/** Refusal attempt ordinal per the DA "3-Attempt Rule" exclusion protocol. */
export type GeoTagRefusalAttempt = 1 | 2 | 3;

/**
 * Offline log of a farmer refusing georeferencing consent. Three logged
 * attempts (per the DA "3-Attempt Rule") make the farmer eligible for the
 * RSBSA exclusion protocol reviewed by MAO staff.
 */
export interface OfflineGeoRefusal {
  id?: number;
  client_id: string;
  farmer_id?: string;
  farmer_name?: string;
  rsbsa_no?: string;
  attempt_number: GeoTagRefusalAttempt;
  reason: string;
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
  offline_geo_tags!: Table<OfflineGeoTag, number>;
  offline_geo_refusals!: Table<OfflineGeoRefusal, number>;

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
    // v6 — advanced mobile GIS geo-tags (polygon boundaries + incident markers)
    this.version(6).stores({
      pendingDistributions: 'client_id, status, created_at',
      pendingAssessments: 'client_id, status, created_at',
      cachedPrograms: 'id, cached_at',
      cachedFarmers: 'id, cached_at',
      cachedFarmPlots: 'id, cached_at',
      offline_planting_logs: '++id, farmer_id, crop_type, sync_status, client_id',
      offline_pest_reports: '++id, rsbsa_id, incidence, severity, photo_base64, lat, lng, sync_status, client_id',
      offline_farm_profiles: '++id, farmer_id, coordinates, total_area, sync_status, client_id',
      offline_distributions: '++id, rsbsa_id, item_dispensed, quantity, timestamp, sync_status, client_id',
      offline_geo_tags: '++id, farmer_id, geometry_type, incident_type, sync_status, client_id, created_at',
    });
    // v7 — DA GeoLogBook compliance: digital signatures, planting schedule,
    // commodity tracking (in offline_geo_tags), and the refusal tracker queue.
    this.version(7).stores({
      pendingDistributions: 'client_id, status, created_at',
      pendingAssessments: 'client_id, status, created_at',
      cachedPrograms: 'id, cached_at',
      cachedFarmers: 'id, cached_at',
      cachedFarmPlots: 'id, cached_at',
      offline_planting_logs: '++id, farmer_id, crop_type, sync_status, client_id',
      offline_pest_reports: '++id, rsbsa_id, incidence, severity, photo_base64, lat, lng, sync_status, client_id',
      offline_farm_profiles: '++id, farmer_id, coordinates, total_area, sync_status, client_id',
      offline_distributions: '++id, rsbsa_id, item_dispensed, quantity, timestamp, sync_status, client_id',
      offline_geo_tags: '++id, farmer_id, geometry_type, incident_type, sync_status, client_id, created_at',
      offline_geo_refusals: '++id, farmer_id, attempt_number, sync_status, client_id, created_at',
    });
  }
}

export const db = new AgriAkapDB();

/** Count unsynced field records across all offline queues. */
export async function pendingQueueCount(): Promise<number> {
  const [distributions, assessments, planting, pests, farms, fieldDist, geoTags, geoRefusals] = await Promise.all([
    db.pendingDistributions.count(),
    db.pendingAssessments.count(),
    db.offline_planting_logs.where('sync_status').equals('pending').count(),
    db.offline_pest_reports.where('sync_status').equals('pending').count(),
    db.offline_farm_profiles.where('sync_status').equals('pending').count(),
    db.offline_distributions.where('sync_status').equals('pending').count(),
    db.offline_geo_tags.where('sync_status').equals('pending').count(),
    db.offline_geo_refusals.where('sync_status').equals('pending').count(),
  ]);
  return distributions + assessments + planting + pests + farms + fieldDist + geoTags + geoRefusals;
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
