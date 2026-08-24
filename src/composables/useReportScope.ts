import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type ReportPeriod = 'week' | 'month' | 'custom';

export function weekRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
  return { from: isoDate(from), to: isoDate(now) };
}

export function monthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: isoDate(from), to: isoDate(now) };
}

export function useReportScope() {
  const route = useRoute();
  const auth = useAuthStore();
  const isBarangayPortal = computed(() => String(route.path || '').startsWith('/brgy'));
  const lockedBarangay = computed(() =>
    isBarangayPortal.value ? String(auth.user?.assigned_barangay || '') : '',
  );
  const hideEncode = computed(() => isBarangayPortal.value);
  const period = ref<ReportPeriod>('custom');

  const applyPeriod = (next: ReportPeriod) => {
    period.value = next;
    if (next === 'week') return weekRange();
    if (next === 'month') return monthRange();
    return { from: '', to: '' };
  };

  return { isBarangayPortal, lockedBarangay, hideEncode, period, applyPeriod };
}
