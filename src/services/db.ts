/**
 * Compatibility re-export — canonical Dexie schema lives in `@/database/db`.
 */
export {
  db,
  pendingQueueCount,
  newUuid,
  getDeviceId,
  type QueueStatus,
  type OfflineSyncStatus,
  type PendingDistribution,
  type PendingAssessment,
  type OfflineDistribution,
  type OfflinePlantingLog,
  type OfflinePestReport,
  type OfflineFarmProfile,
  type CachedRecord,
} from '@/database/db';
