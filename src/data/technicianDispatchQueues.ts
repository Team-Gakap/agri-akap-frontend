export type QueueStatus = 'pending' | 'validated';

export interface PendingPestReport {
  id: string;
  reportId: string;
  barangay: string;
  farmerName: string;
  farmerId?: string;
  rsbsaNo: string;
  crop: string;
  reportedPest: string;
  encodedAt: string;
  status: QueueStatus;
}

export interface PendingCalamityReport {
  id: string;
  reportId: string;
  calamityEvent: string;
  barangay: string;
  farmerName: string;
  rsbsaNo: string;
  farmerId: string;
  farmPlotId?: string;
  cropType: string;
  variety: string;
  cropStage: string;
  areaPlanted: number;
  areaDamagedReported: number;
  encodedAt: string;
  status: QueueStatus;
}

export function formatFarmerName(farmer: any): string {
  if (!farmer) return 'Unknown farmer';
  const last = farmer.surname || farmer.last_name || '';
  const first = [farmer.first_name, farmer.middle_name, farmer.ext_name].filter(Boolean).join(' ');
  if (last && first) return `${last}, ${first}`;
  return farmer.full_name || last || first || 'Unknown farmer';
}

export function formatQueueDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}
