<template>
  <ion-page>
    <AppHeader />

    <ion-content class="rpt-content">
      <!-- Print letterhead -->
      <div class="print-only letterhead">
        <MaoFormHeader
          :show-barangay="false"
          office-title="Municipal Agriculture Office"
          title="Damage &amp; Calamity Report"
        >
          <template #subtitle>
            <p class="lh-meta">
              Generated: {{ new Date().toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' }) }}
              <span v-if="filters.dateFrom || filters.dateTo">&nbsp;|&nbsp; Period: {{ filters.dateFrom || '—' }} to {{ filters.dateTo || '—' }}</span>
              <span v-if="filters.barangay">&nbsp;|&nbsp; Barangay: {{ filters.barangay }}</span>
              <span v-if="filters.calamityType">&nbsp;|&nbsp; Type: {{ filters.calamityType }}</span>
            </p>
          </template>
        </MaoFormHeader>
      </div>

      <div class="rpt-shell">
        <!-- Filter bar -->
        <div class="filter-bar no-print">
          <div class="filter-group">
            <label class="filter-label">Barangay</label>
            <select class="filter-select" v-model="filters.barangay" :disabled="!!lockedBarangay" @change="fetchRows">
              <option value="">All Barangays</option>
              <option v-for="b in barangays" :key="b" :value="b">{{ b }}</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">Search</label>
            <input class="filter-input" type="search" v-model="searchQuery" placeholder="Name or calamity" />
          </div>
          <div class="filter-group">
            <label class="filter-label">Period</label>
            <select class="filter-select" :value="period" @change="onPeriodChange">
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="custom">Custom dates</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">Crop</label>
            <select class="filter-select" v-model="filters.cropType" @change="fetchRows">
              <option value="">All</option>
              <option value="Rice">Rice</option>
              <option value="Corn">Corn</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">Calamity Type</label>
            <select class="filter-select" v-model="filters.calamityType" @change="fetchRows">
              <option value="">All Types</option>
              <option v-for="t in CALAMITY_TYPES" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">Status</label>
            <select class="filter-select" v-model="filters.status" @change="fetchRows">
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Verified">Verified</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">Date From</label>
            <input class="filter-input" type="date" v-model="filters.dateFrom" @change="onCustomDates" />
          </div>
          <div class="filter-group">
            <label class="filter-label">Date To</label>
            <input class="filter-input" type="date" v-model="filters.dateTo" @change="onCustomDates" />
          </div>
          <button class="clear-btn" @click="clearFilters">Clear</button>
        </div>

        <!-- Summary stats (screen only) -->
        <div class="stats-bar no-print" v-if="!loading && filteredRows.length">
          <div class="stat-card">
            <span class="stat-val">{{ filteredRows.length }}</span>
            <span class="stat-lbl">Total Reports</span>
          </div>
          <div class="stat-card">
            <span class="stat-val">{{ totalAreaAffected }}</span>
            <span class="stat-lbl">Total Area Affected (ha)</span>
          </div>
          <div class="stat-card">
            <span class="stat-val">{{ totalDamageValue }}</span>
            <span class="stat-lbl">Est. Damage (PHP)</span>
          </div>
        </div>

        <!-- Data grid -->
        <div class="grid-shell">
          <div class="grid-head no-print">
            <span class="grid-title">Damage &amp; Calamity Assessment Records</span>
            <div class="grid-actions no-print">
              <ion-button v-if="!hideEncode" class="add-override-btn" @click="encodeOpen = true">
                <ion-icon slot="start" :icon="addCircleOutline"></ion-icon>
                Add 
              </ion-button>
              <FormExportActions theme="admin" :print-disabled="loading" @print="printReport" @excel="downloadExcel" />
              <span class="row-pill">{{ filteredRows.length }} record(s)</span>
            </div>
          </div>

          <div v-if="loading" class="grid-state">
            <ion-spinner name="crescent" color="primary"></ion-spinner>
            <p>Loading records…</p>
          </div>
          <div v-else-if="loadError" class="grid-state error">
            <p>{{ loadError }}</p>
            <button class="retry-btn" @click="fetchRows">Retry</button>
          </div>
          <div v-else class="table-scroll print-surface">
            <table class="excel-table">
              <thead>
                <tr>
                  <th class="col-no">No</th>
                  <th>Date Reported</th>
                  <th>Barangay</th>
                  <th>Last Name</th>
                  <th>First Name</th>
                  <th>Middle Name</th>
                  <th>Farm Location</th>
                  <th>Crop</th>
                  <th>Calamity Type</th>
                  <th class="col-num">Area Affected (ha)</th>
                  <th class="col-num">Damage Value (PHP)</th>
                  <th>Status</th>
                  <th class="col-evidence no-print">Evidence</th>
                  <th class="no-print">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!filteredRows.length">
                  <td colspan="14" class="empty-row">No damage &amp; calamity records match the current filters.</td>
                </tr>
                <tr v-for="(row, i) in filteredRows" :key="row.id || i">
                  <td class="col-no">{{ i + 1 }}</td>
                  <td class="mono">{{ fmtDate(row.date_reported) }}</td>
                  <td>{{ row.barangay }}</td>
                  <td>{{ row.surname || '—' }}</td>
                  <td>{{ row.first_name || '—' }}</td>
                  <td>{{ row.middle_name || '—' }}</td>
                  <td>{{ row.farm_location }}</td>
                  <td>{{ row.crop }}</td>
                  <td>
                    <span class="type-pill">{{ row.calamity_type }}</span>
                  </td>
                  <td class="col-num">{{ fmtNum(row.area_affected) }}</td>
                  <td class="col-num">{{ fmtMoney(row.damage_value) }}</td>
                  <td>
                    <span class="status-pill" :class="statusClass(row.status)">{{ row.status }}</span>
                  </td>
                  <!-- Thumbnail (screen only) -->
                  <td class="col-evidence no-print">
                    <img
                      v-if="photoSrc(row)"
                      :src="photoSrc(row)!"
                      class="thumb"
                      alt="Evidence"
                      @click="openPhoto(row)"
                    />
                    <span v-else class="no-photo">—</span>
                  </td>
                  <td class="no-print">
                    <ReportRowActions
                      v-if="row.id && !hideEncode"
                      :row-id="String(row.id)"
                      variant="menu"
                      :can-edit="row.status === 'Pending'"
                      :can-remove="row.status === 'Pending' || authStore.isMunicipalAdmin"
                      :can-view="!!photoSrc(row)"
                      :destructive-mode="row.status === 'Pending' ? 'remove' : 'void'"
                      @edit="openEdit(row)"
                      @view="openPhoto(row)"
                      @remove="promptDelete({
                        endpoint: `/damage-assessments/${row.id}`,
                        label: 'Damage record',
                        requireRemarks: row.status !== 'Pending',
                        destructiveMode: row.status === 'Pending' ? 'remove' : 'void',
                        confirmHeader: row.status === 'Pending' ? 'Remove record?' : 'Void record?',
                        confirmMessage: row.status === 'Pending'
                          ? 'This record will be removed. You can contact MAO admin if this was a mistake.'
                          : 'This will void a verified calamity assessment. A justification is required for the audit trail.',
                        confirmText: row.status === 'Pending' ? 'Remove' : 'Void',
                        onSuccess: fetchRows,
                      })"
                    />
                  </td>
                </tr>
              </tbody>
              <!-- Totals row -->
              <tfoot v-if="filteredRows.length">
                <tr class="totals-row">
                  <td colspan="9" class="totals-label">TOTALS</td>
                  <td class="col-num">{{ totalAreaAffected }}</td>
                  <td class="col-num">{{ totalDamageValue }}</td>
                  <td colspan="3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Photo viewer modal (screen only) -->
        <div v-if="viewingPhoto" class="photo-overlay no-print" @click.self="viewingPhoto = null">
          <div class="photo-modal">
            <button class="photo-close" @click="viewingPhoto = null">✕</button>
            <img :src="viewingPhoto" class="photo-full" alt="Evidence Photo" />
          </div>
        </div>

        <!-- Annex: Photo Evidence (print only) -->
        <div v-if="rowsWithPhotos.length" class="print-only annex-section">
          <h2 class="annex-title">Annex A — Photo Evidence</h2>
          <div class="annex-grid">
            <div v-for="(row, i) in rowsWithPhotos" :key="i" class="annex-card">
              <img :src="photoSrc(row)!" class="annex-img" alt="Evidence" />
              <p class="annex-caption">
                #{{ filteredRows.indexOf(row) + 1 }} · {{ row.farmer_name }}<br />
                {{ row.calamity_type }} · {{ row.barangay }} · {{ fmtDate(row.date_reported) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Signature block -->
        <div class="print-only sig-block">
          <div class="sig-col">
            <div class="sig-line"></div>
            <p class="sig-name">Municipal Agriculturist</p>
          </div>
          <div class="sig-col">
            <div class="sig-line"></div>
            <p class="sig-name">Prepared by</p>
          </div>
        </div>
      </div>
    </ion-content>

    <ReportEncodeModal
      v-model:is-open="encodeOpen"
      title="Add / Override Disaster Report"
      kind="damage"
      :form-component="DamageForm"
      @saved="fetchRows"
    />

    <ReportInlineEditModal
      :is-open="editOpen"
      title="Edit damage record"
      :endpoint="editEndpoint"
      :fields="damageEditFields"
      :initial="editInitial"
      @close="editOpen = false"
      @saved="fetchRows"
    />

    <ConfirmDeleteModal
      :is-open="deleteOpen"
      :header="confirmHeader"
      :message="confirmMessage"
      :confirm-text="confirmText"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </ion-page>
</template>

<script setup lang="ts">
import AppHeader from '@/components/Navigation/AppHeader.vue';
import { ref, reactive, computed, onMounted, watch, defineAsyncComponent } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonMenuButton, IonIcon, IonSpinner,
} from '@ionic/vue';
import { addCircleOutline } from 'ionicons/icons';
import FormExportActions from '@/components/FormExportActions.vue';
import { exportAdminGridExcel } from '@/utils/statutoryFormExcel';
import apiClient from '@/utils/axios';
import { storageUrl } from '@/utils/storageUrl';
import ReportEncodeModal from '@/components/ReportEncodeModal.vue';
import ReportRowActions from '@/components/ReportRowActions.vue';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal.vue';
import ReportInlineEditModal, { type ReportEditField } from '@/components/ReportInlineEditModal.vue';
import { useReportRowActions } from '@/composables/useReportRowActions';
import '@/assets/reportTableStyles.css';
import MaoFormHeader from '@/components/MaoFormHeader.vue';
import { useReportScope, type ReportPeriod } from '@/composables/useReportScope';
import { CALAMITY_TYPES, CALAMITY_TYPE_OTHER } from '@/constants/calamityTypes';
import { rowMatchesNameSearch } from '@/utils/farmerNameColumns';
import { useAuthStore } from '@/stores/authStore';

const DamageForm = defineAsyncComponent(() => import('@/views/Barangay/CalamityAssessmentLogView.vue'));

interface DamageRow {
  id?: string;
  date_reported: string;
  barangay: string;
  surname?: string;
  first_name?: string;
  middle_name?: string;
  farmer_name?: string;
  farm_location: string;
  crop: string;
  calamity_type: string;
  calamity_name?: string;
  area_affected: number;
  damage_percentage?: number;
  damage_value: number;
  status: string;
  photo_base64?: string;
  photo_url?: string;
  photo_path?: string;
}

const loading    = ref(false);
const loadError  = ref('');
const rows       = ref<DamageRow[]>([]);
const barangays  = ref<string[]>([]);
const viewingPhoto = ref<string | null>(null);

const filters = reactive({
  barangay: '',
  cropType: '',
  calamityType: '',
  status: '',
  dateFrom: '',
  dateTo: '',
});

const encodeOpen = ref(false);
const authStore = useAuthStore();
const { deleteOpen, confirmHeader, confirmMessage, confirmText, promptDelete, cancelDelete, confirmDelete } = useReportRowActions();
const editOpen = ref(false);
const editEndpoint = ref('');
const editInitial = ref<Record<string, string | number | null | undefined>>({});
const damageEditFields: ReportEditField[] = [
  {
    key: 'calamity_type',
    label: 'Calamity Type',
    type: 'select',
    required: true,
    options: [...CALAMITY_TYPES],
  },
  {
    key: 'calamity_name',
    label: 'Event Name (optional)',
    visibleWhen: { key: 'calamity_type', not: CALAMITY_TYPE_OTHER },
  },
  {
    key: 'calamity_name',
    label: 'Other Calamity Details',
    required: true,
    visibleWhen: { key: 'calamity_type', equals: CALAMITY_TYPE_OTHER },
  },
  { key: 'area_destroyed_ha', label: 'Area Damaged (ha)', type: 'number', required: true },
  { key: 'damage_percentage', label: 'Yield Loss (%)', type: 'number', required: true },
  { key: 'date_of_calamity', label: 'Date of Calamity', type: 'date', required: true },
];

function openEdit(row: DamageRow) {
  if (!row.id) return;
  editEndpoint.value = `/damage-assessments/${row.id}`;
  const eventName = row.calamity_name
    && row.calamity_name !== row.calamity_type
    ? row.calamity_name
    : (row.calamity_type === CALAMITY_TYPE_OTHER ? row.calamity_name : '');
  editInitial.value = {
    calamity_type: row.calamity_type,
    calamity_name: eventName || '',
    area_destroyed_ha: row.area_affected,
    damage_percentage: row.damage_percentage,
    date_of_calamity: row.date_reported,
  };
  editOpen.value = true;
}

const searchQuery = ref('');
const { lockedBarangay, hideEncode, period, applyPeriod } = useReportScope();

watch(lockedBarangay, (b) => {
  if (b) filters.barangay = b;
}, { immediate: true });

function onPeriodChange(e: Event) {
  const next = (e.target as HTMLSelectElement).value as ReportPeriod;
  const range = applyPeriod(next);
  if (next !== 'custom') {
    filters.dateFrom = range.from;
    filters.dateTo = range.to;
    fetchRows();
  }
}

function onCustomDates() {
  period.value = 'custom';
  fetchRows();
}

const filteredRows    = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return rows.value;
  return rows.value.filter((r) =>
    rowMatchesNameSearch(r, q)
    || String(r.calamity_type || '').toLowerCase().includes(q)
    || String(r.barangay || '').toLowerCase().includes(q)
  );
});
const rowsWithPhotos  = computed(() => filteredRows.value.filter(r => photoSrc(r)));
const totalAreaAffected = computed(() =>
  filteredRows.value.reduce((s, r) => s + Number(r.area_affected || 0), 0).toFixed(2)
);
const totalDamageValue = computed(() =>
  filteredRows.value.reduce((s, r) => s + Number(r.damage_value || 0), 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })
);

const fmtNum  = (v: number | string) => Number(v ?? 0).toFixed(2);
const fmtMoney = (v: number | string) =>
  Number(v ?? 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
const fmtDate = (d: string) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' }); }
  catch { return d; }
};

function photoSrc(row: DamageRow): string | null {
  if (row.photo_base64) return row.photo_base64.startsWith('data:') ? row.photo_base64 : `data:image/jpeg;base64,${row.photo_base64}`;
  return storageUrl(row.photo_url || row.photo_path);
}

function openPhoto(row: DamageRow) {
  const src = photoSrc(row);
  if (src) viewingPhoto.value = src;
}

function statusClass(st: string) {
  const s = (st || '').toLowerCase();
  if (s === 'approved') return 'st-done';
  if (s === 'verified') return 'st-val';
  if (s === 'rejected') return 'st-rej';
  return 'st-pend';
}

async function fetchRows() {
  loading.value = true;
  loadError.value = '';
  try {
    const res = await apiClient.get('/reports/damage-calamity', {
      params: {
        barangay:      filters.barangay     || undefined,
        crop_type:     filters.cropType     || undefined,
        calamity_type: filters.calamityType || undefined,
        status:        filters.status       || undefined,
        date_from:     filters.dateFrom     || undefined,
        date_to:       filters.dateTo       || undefined,
      },
    });
    rows.value = res.data?.data?.rows ?? [];
  } catch (e: any) {
    rows.value = [];
    loadError.value = e?.response?.data?.message || 'Could not load damage & calamity data.';
  } finally {
    loading.value = false;
  }
}

function clearFilters() {
  filters.barangay     = lockedBarangay.value || '';
  filters.cropType     = '';
  filters.calamityType = '';
  filters.status       = '';
  filters.dateFrom     = '';
  filters.dateTo       = '';
  searchQuery.value = '';
  period.value = 'custom';
  fetchRows();
}

function printReport() {
  if (loading.value) return;
  window.print();
}

function reportMetaLine() {
  let line = `Generated: ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}`;
  if (filters.dateFrom || filters.dateTo) {
    line += ` | Period: ${filters.dateFrom || '—'} to ${filters.dateTo || '—'}`;
  }
  if (filters.barangay) line += ` | Barangay: ${filters.barangay}`;
  if (filters.calamityType) line += ` | Type: ${filters.calamityType}`;
  return line;
}

async function downloadExcel() {
  await exportAdminGridExcel({
    filename: 'damage-calamity-report.xlsx',
    reportTitle: 'Damage & Calamity Report',
    metaLine: reportMetaLine(),
    columns: [
      { key: 'no', label: 'No' },
      { key: 'date_reported', label: 'Date Reported' },
      { key: 'barangay', label: 'Barangay' },
      { key: 'surname', label: 'Last Name' },
      { key: 'first_name', label: 'First Name' },
      { key: 'middle_name', label: 'Middle Name' },
      { key: 'farm_location', label: 'Farm Location' },
      { key: 'crop', label: 'Crop' },
      { key: 'calamity_type', label: 'Calamity Type' },
      { key: 'area_affected', label: 'Area Affected (ha)' },
      { key: 'damage_value', label: 'Damage Value (PHP)' },
      { key: 'status', label: 'Status' },
    ],
    rows: filteredRows.value as Record<string, unknown>[],
    getCellValue(row, key, index) {
      if (key === 'no') return index + 1;
      if (key === 'date_reported') return fmtDate(String(row.date_reported ?? ''));
      if (key === 'area_affected') return fmtNum(row.area_affected as number);
      if (key === 'damage_value') return fmtMoney(row.damage_value as number);
      return String(row[key] ?? '');
    },
  });
}

onMounted(async () => {
  try {
    const res = await apiClient.get('/farmers/barangays');
    barangays.value = (res.data?.data ?? []).filter(Boolean);
  } catch { barangays.value = []; }
  fetchRows();
});
</script>

<style scoped>
.rpt-toolbar { --background: #1a4731; --color: #fff; }
.add-override-btn {
  --background: #ffffff;
  --background-activated: #e8f5e9;
  --color: #1a4731;
  font-weight: 800;
  text-transform: none;
  --border-radius: 6px;
  --padding-start: 12px;
  --padding-end: 14px;
}
.export-btn {
  --background: transparent;
  --background-activated: rgba(255, 255, 255, 0.08);
  --color: #f5e6a8;
  --border-width: 1.5px;
  --border-style: solid;
  --border-color: #d4af37;
  --border-radius: 6px;
  font-weight: 700;
  text-transform: none;
}
.grid-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.rpt-content { --background: #eef1f4; }

.rpt-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0.75rem 1rem 1rem;
  gap: 0.65rem;
}

/* Filter bar */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: flex-end;
  background: #fff;
  border: 1px solid #d5dbe1;
  border-radius: 8px;
  padding: 0.6rem 0.9rem;
}
.filter-group { display: flex; flex-direction: column; gap: 3px; }
.filter-label { font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em; }
.filter-select, .filter-input {
  font-size: 0.82rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 5px 8px;
  background: #fff;
  color: #334155;
  font-family: inherit;
}
.filter-select { min-width: 150px; }
.filter-input  { width: 130px; }
.clear-btn {
  align-self: flex-end;
  background: transparent;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
  cursor: pointer;
  font-family: inherit;
}
.clear-btn:hover { border-color: #94a3b8; color: #334155; }

/* Stats bar */
.stats-bar {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.stat-card {
  background: #fff;
  border: 1px solid #d5dbe1;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 160px;
}
.stat-val { font-size: 1.1rem; font-weight: 800; color: #1a4731; }
.stat-lbl { font-size: 0.68rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.03em; }

/* Grid */
.grid-shell {
  flex: 1;
  min-height: 0;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.grid-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 1rem;
  background: linear-gradient(90deg, #1a4731 0%, #245a3f 100%);
}
.grid-title { color: #d1e0d6; font-size: 0.9rem; font-weight: 700; }
.row-pill { background: #d4af37; color: #1a4731; font-size: 0.72rem; font-weight: 800; padding: 2px 10px; border-radius: 999px; }
.grid-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #64748b;
  padding: 2rem;
}
.grid-state.error { color: #b91c1c; }
.retry-btn { border: 1px solid #1a4731; background: transparent; color: #1a4731; border-radius: 6px; padding: 4px 14px; cursor: pointer; font-weight: 700; font-size: 0.8rem; font-family: inherit; }
.table-scroll { flex: 1; overflow: auto; }

.excel-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
  color: #1e293b;
  min-width: 1100px;
}
.excel-table th, .excel-table td {
  border: 1px solid #cbd5e1;
  padding: 4px 8px;
  text-align: left;
  white-space: nowrap;
}
.excel-table thead th {
  position: sticky;
  top: 0;
  background: #1a4731;
  color: #fff;
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  z-index: 2;
}
.excel-table tbody tr:nth-child(even) { background: #f8fafc; }
.excel-table tbody tr:hover { background: #eef5ee; }
.col-no { text-align: right; width: 40px; }
.col-num { text-align: right; }
.col-evidence { width: 70px; text-align: center; }
.mono { font-family: 'Courier New', monospace; }
.empty-row { text-align: center; color: #94a3b8; padding: 2rem 0; font-style: italic; }

/* Totals row */
.totals-row { background: #1a4731 !important; }
.totals-row td { color: #fff !important; font-weight: 800; font-size: 12px; border-color: #0f3021; }
.totals-label { text-align: right; letter-spacing: 0.05em; }

/* Pills */
.type-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: #fef9c3;
  color: #854d0e;
  white-space: nowrap;
}
.status-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
.st-done { background: #dcfce7; color: #166534; }
.st-val  { background: #dbeafe; color: #1d4ed8; }
.st-rej  { background: #fee2e2; color: #991b1b; }
.st-pend { background: #fef9c3; color: #854d0e; }

/* Thumbnail */
.thumb {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #cbd5e1;
  cursor: zoom-in;
  display: block;
  margin: 0 auto;
}
.no-photo { color: #94a3b8; font-size: 12px; }

/* Photo viewer */
.photo-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.photo-modal {
  position: relative;
  background: #fff;
  border-radius: 10px;
  padding: 1rem;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.photo-close {
  position: absolute;
  top: 8px;
  right: 10px;
  background: transparent;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #374151;
  font-weight: 700;
}
.photo-full {
  max-width: 80vw;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 6px;
}

/* Signature block */
.sig-block { display: none; }
.sig-col { text-align: center; flex: 1; }
.sig-line { border-bottom: 1px solid #1a4731; width: 200px; margin: 0 auto 6px; }
.sig-name { font-size: 0.82rem; font-weight: 700; color: #1a4731; margin: 0; }

/* Print */
.print-only { display: none; }
@media print {
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  .rpt-shell, .rpt-content, .grid-shell, .table-scroll, .print-surface {
    overflow: visible !important;
    height: auto !important;
    max-height: none !important;
  }
  .grid-shell { border: none; }
  .excel-table { min-width: 0 !important; width: 100% !important; font-size: 9.5px !important; }
  .excel-table th, .excel-table td { white-space: normal !important; }

  .excel-table thead th {
    position: static;
    background: #1a4731 !important;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  .totals-row { background: #1a4731 !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .type-pill, .status-pill { print-color-adjust: exact; -webkit-print-color-adjust: exact; }

  .letterhead { text-align: center; margin-bottom: 1rem; border-bottom: 2px solid #1a4731; padding-bottom: 0.75rem; }
  .lh-title { margin: 0; font-size: 1.1rem; font-weight: 800; color: #1a4731; }
  .lh-sub   { margin: 2px 0; font-size: 0.9rem; color: #374151; }
  .lh-meta  { margin: 2px 0 0; font-size: 0.78rem; color: #64748b; }

  /* Annex */
  .annex-section { margin-top: 2rem; page-break-before: always; }
  .annex-title { font-size: 1rem; font-weight: 800; color: #1a4731; margin-bottom: 1rem; border-bottom: 2px solid #1a4731; padding-bottom: 4px; }
  .annex-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .annex-card { display: flex; flex-direction: column; align-items: center; }
  .annex-img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  .annex-caption { font-size: 9px; color: #374151; text-align: center; margin-top: 4px; line-height: 1.4; }

  .sig-block { display: flex !important; justify-content: space-around; margin-top: 3rem; padding-top: 1rem; }
}
</style>
