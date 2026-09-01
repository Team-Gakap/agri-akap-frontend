<template>
  <ion-page>
    <AppHeader />

    <ion-content class="rpt-content">
      <!-- Print letterhead (hidden on screen) -->
      <div class="print-only letterhead">
        <MaoFormHeader
          :show-barangay="false"
          office-title="Municipal Agriculture Office"
          title="Subsidy Distribution Report"
        >
          <template #subtitle>
            <p class="lh-meta">
              Generated: {{ new Date().toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' }) }}
              <span v-if="filters.dateFrom || filters.dateTo"> &nbsp;|&nbsp; Period: {{ filters.dateFrom || '—' }} to {{ filters.dateTo || '—' }}</span>
              <span v-if="selectedProgramName"> &nbsp;|&nbsp; Program: {{ selectedProgramName }}</span>
              <span v-if="filters.barangay"> &nbsp;|&nbsp; Barangay: {{ filters.barangay }}</span>
              <span v-if="filters.cropType"> &nbsp;|&nbsp; Crop: {{ cropLabel(filters.cropType) }}</span>
              <span v-if="filters.seedClass"> &nbsp;|&nbsp; Seed Class: {{ filters.seedClass }}</span>
              <span v-if="filters.itemType"> &nbsp;|&nbsp; Item: {{ itemTypeLabel(filters.itemType) }}</span>
              <span v-if="searchQuery"> &nbsp;|&nbsp; Search: {{ searchQuery }}</span>
            </p>
          </template>
        </MaoFormHeader>
      </div>

      <div class="rpt-shell">
        <!-- Filter bar -->
        <div class="filter-bar no-print">
          <div class="filter-group">
            <label class="filter-label">Program</label>
            <select class="filter-select" v-model="filters.programId" @change="fetchRows">
              <option value="">All Programs</option>
              <option v-for="prog in programs" :key="prog.id" :value="prog.id">{{ prog.program_name }}</option>
            </select>
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
            <label class="filter-label">Date Claimed From</label>
            <input class="filter-input" type="date" v-model="filters.dateFrom" @change="onCustomDates" />
          </div>
          <div class="filter-group">
            <label class="filter-label">Date Claimed To</label>
            <input class="filter-input" type="date" v-model="filters.dateTo" @change="onCustomDates" />
          </div>
          <div class="filter-group">
            <label class="filter-label">Barangay</label>
            <select class="filter-select" v-model="filters.barangay" :disabled="!!lockedBarangay" @change="fetchRows">
              <option value="">All Barangays</option>
              <option v-for="b in barangays" :key="b" :value="b">{{ b }}</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">Search</label>
            <input class="filter-input" type="search" v-model="searchQuery" placeholder="Name or RSBSA" />
          </div>
          <div class="filter-group">
            <label class="filter-label">Crop</label>
            <select class="filter-select" v-model="filters.cropType" @change="fetchRows">
              <option value="">All</option>
              <option value="Rice">Rice</option>
              <option value="Corn">Corn</option>
              <option value="Both">Rice and Corn</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">Seed Class</label>
            <select class="filter-select" v-model="filters.seedClass" @change="fetchRows">
              <option value="">All</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Inbred">Inbred</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">Item Type</label>
            <select class="filter-select" v-model="filters.itemType" @change="fetchRows">
              <option value="">All</option>
              <option v-for="it in ITEM_TYPES" :key="it" :value="it">{{ itemTypeLabel(it) }}</option>
            </select>
          </div>
          <button class="clear-btn" @click="clearFilters">Clear</button>
        </div>

        <!-- Data grid -->
        <div class="grid-shell">
          <div class="grid-head no-print">
            <span class="grid-title">Claimed Subsidy Beneficiaries</span>
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
                  <th>RSBSA No.</th>
                  <th>Last Name</th>
                  <th>First Name</th>
                  <th>Middle Name</th>
                  <th>Barangay</th>
                  <th>Subsidy Program</th>
                  <th>Crop</th>
                  <th>Item / Amount Received</th>
                  <th>Date Claimed</th>
                  <th class="col-evidence no-print">Photo</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!filteredRows.length">
                  <td colspan="11" class="empty-row">No claimed subsidy records found for the selected filters.</td>
                </tr>
                <tr v-for="(row, i) in filteredRows" :key="i">
                  <td class="col-no">{{ i + 1 }}</td>
                  <td class="mono">{{ row.rsbsa_no }}</td>
                  <td>{{ row.surname || '—' }}</td>
                  <td>{{ row.first_name || '—' }}</td>
                  <td>{{ row.middle_name || '—' }}</td>
                  <td>{{ row.barangay }}</td>
                  <td>{{ row.program_name }}</td>
                  <td>{{ cropLabel(row.target_crop) }}</td>
                  <td>{{ row.item_received }}</td>
                  <td class="mono">{{ fmtDate(row.date_claimed) }}</td>
                  <td class="col-evidence no-print">
                    <img
                      v-if="photoSrc(row)"
                      :src="photoSrc(row)!"
                      class="thumb"
                      alt="Claim photo"
                      @click="openPhoto(row)"
                    />
                    <span v-else class="no-photo">—</span>
                  </td>
                </tr>
                <tr v-if="filteredRows.length" class="totals-row">
                  <td colspan="8" class="totals-label">TOTALS</td>
                  <td colspan="3">{{ subsidyTotalsLabel }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="viewingPhoto" class="photo-overlay no-print" @click.self="viewingPhoto = null">
          <div class="photo-modal">
            <button class="photo-close" @click="viewingPhoto = null">✕</button>
            <img :src="viewingPhoto" class="photo-full" alt="Claim photo" />
          </div>
        </div>

        <!-- Print signature block -->
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
      title="Manual Subsidy Dispense"
      kind="subsidy"
      @saved="fetchRows"
    />
  </ion-page>
</template>

<script setup lang="ts">
import AppHeader from '@/components/Navigation/AppHeader.vue';
import { ref, reactive, computed, onMounted, watch } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonMenuButton, IonIcon, IonSpinner,
} from '@ionic/vue';
import { addCircleOutline } from 'ionicons/icons';
import FormExportActions from '@/components/FormExportActions.vue';
import { exportAdminGridExcel } from '@/utils/statutoryFormExcel';
import apiClient from '@/utils/axios';
import ReportEncodeModal from '@/components/ReportEncodeModal.vue';
import MaoFormHeader from '@/components/MaoFormHeader.vue';
import { cropLabel } from '@/utils/cropLabel';
import { storageUrl } from '@/utils/storageUrl';
import { useReportScope, type ReportPeriod } from '@/composables/useReportScope';
import { rowMatchesNameSearch } from '@/utils/farmerNameColumns';
import { itemTypeLabel, type ItemType } from '@/constants/subsidyCatalog';

const ITEM_TYPES: ItemType[] = ['seed', 'abono', 'liquid_fertilizer', 'wettable', 'cash'];

interface SubsidyRow {
  rsbsa_no: string;
  surname?: string;
  first_name?: string;
  middle_name?: string;
  farmer_name?: string;
  barangay: string;
  program_name: string;
  target_crop?: string;
  seed_class?: string | null;
  item_type?: string | null;
  item_received: string;
  quantity?: number;
  unit?: string;
  quantity_secondary?: number | null;
  unit_secondary?: string | null;
  date_claimed: string;
  photo_url?: string | null;
  photo_path?: string | null;
}

interface Program {
  id: number | string;
  program_name: string;
}

const loading   = ref(false);
const loadError = ref('');
const rows      = ref<SubsidyRow[]>([]);
const programs  = ref<Program[]>([]);
const barangays = ref<string[]>([]);

const filters = reactive({
  programId: '' as string | number,
  dateFrom: '',
  dateTo: '',
  barangay: '',
  cropType: '',
  seedClass: '',
  itemType: '',
});
const searchQuery = ref('');
const viewingPhoto = ref<string | null>(null);

const filteredRows = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return rows.value;
  return rows.value.filter((r) =>
    rowMatchesNameSearch(r, q) || String(r.rsbsa_no || '').toLowerCase().includes(q)
  );
});
const subsidyTotalsLabel = computed(() => {
  const byUnit = new Map<string, number>();
  const addQty = (unit: string, qty: number) => byUnit.set(unit, (byUnit.get(unit) || 0) + qty);

  filteredRows.value.forEach((r) => {
    const unit = r.unit || (String(r.item_received || '').split(' ').slice(1).join(' ') || 'Bags');
    const qty = Number(r.quantity ?? (String(r.item_received || '').split(' ')[0] || 0));
    if (unit.toLowerCase().startsWith('cash') || unit.includes('₱')) {
      addQty('₱ (Cash Assistance)', qty);
    } else {
      addQty(unit, qty);
    }
    if (r.unit_secondary && r.quantity_secondary != null) {
      addQty(r.unit_secondary, Number(r.quantity_secondary));
    }
  });

  return Array.from(byUnit.entries())
    .map(([unit, qty]) => (unit.startsWith('₱') ? `₱${qty.toLocaleString('en-PH')}` : `${qty.toLocaleString('en-PH')} ${unit}`))
    .join(' · ') || '0';
});
const encodeOpen = ref(false);
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

const selectedProgramName = computed(() =>
  filters.programId ? programs.value.find(p => p.id == filters.programId)?.program_name ?? '' : ''
);

const fmtDate = (d: string) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' }); }
  catch { return d; }
};

async function fetchRows() {
  loading.value = true;
  loadError.value = '';
  try {
    const res = await apiClient.get('/reports/subsidies', {
      params: {
        program_id: filters.programId || undefined,
        date_from:  filters.dateFrom  || undefined,
        date_to:    filters.dateTo    || undefined,
        barangay:   filters.barangay  || undefined,
        crop_type:  filters.cropType  || undefined,
        seed_class: filters.seedClass || undefined,
        item_type:  filters.itemType  || undefined,
      },
    });
    rows.value = res.data?.data?.rows ?? [];
  } catch (e: any) {
    rows.value = [];
    loadError.value = e?.response?.data?.message || 'Could not load subsidy report data.';
  } finally {
    loading.value = false;
  }
}

async function fetchPrograms() {
  try {
    // GET /subsidies returns the subsidy program list (SubsidyController::index).
    // Handle both flat array and paginated { data: [...] } shapes.
    const res = await apiClient.get('/subsidies');
    const payload = res.data?.data;
    programs.value = Array.isArray(payload) ? payload : (payload?.data ?? []);
  } catch { programs.value = []; }
}

async function fetchBarangays() {
  try {
    const res = await apiClient.get('/farmers/barangays');
    barangays.value = (res.data?.data ?? []).filter(Boolean);
  } catch { barangays.value = []; }
}

function photoSrc(row: SubsidyRow): string | null {
  return storageUrl(row.photo_url || row.photo_path);
}

function openPhoto(row: SubsidyRow) {
  const src = photoSrc(row);
  if (src) viewingPhoto.value = src;
}

function clearFilters() {
  filters.programId = '';
  filters.dateFrom  = '';
  filters.dateTo    = '';
  filters.barangay  = lockedBarangay.value || '';
  filters.cropType  = '';
  filters.seedClass = '';
  filters.itemType  = '';
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
  if (selectedProgramName.value) line += ` | Program: ${selectedProgramName.value}`;
  if (filters.barangay) line += ` | Barangay: ${filters.barangay}`;
  if (filters.cropType) line += ` | Crop: ${cropLabel(filters.cropType)}`;
  if (filters.seedClass) line += ` | Seed Class: ${filters.seedClass}`;
  if (filters.itemType) line += ` | Item: ${itemTypeLabel(filters.itemType)}`;
  return line;
}

async function downloadExcel() {
  await exportAdminGridExcel({
    filename: 'subsidy-distribution-report.xlsx',
    reportTitle: 'Subsidy Distribution Report',
    metaLine: reportMetaLine(),
    columns: [
      { key: 'no', label: 'No' },
      { key: 'rsbsa_no', label: 'RSBSA No.' },
      { key: 'surname', label: 'Last Name' },
      { key: 'first_name', label: 'First Name' },
      { key: 'middle_name', label: 'Middle Name' },
      { key: 'barangay', label: 'Barangay' },
      { key: 'program_name', label: 'Subsidy Program' },
      { key: 'target_crop', label: 'Crop' },
      { key: 'item_received', label: 'Item / Amount Received' },
      { key: 'date_claimed', label: 'Date Claimed' },
    ],
    rows: filteredRows.value as Record<string, unknown>[],
    getCellValue(row, key, index) {
      if (key === 'no') return index + 1;
      if (key === 'date_claimed') return fmtDate(String(row.date_claimed ?? ''));
      if (key === 'target_crop') return cropLabel(String(row.target_crop ?? ''));
      return String(row[key] ?? '');
    },
  });
}

onMounted(async () => {
  await Promise.all([fetchPrograms(), fetchBarangays()]);
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
.filter-select { min-width: 160px; }
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

/* Data grid */
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
.row-pill {
  background: #d4af37;
  color: #1a4731;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 2px 10px;
  border-radius: 999px;
}
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
.retry-btn {
  border: 1px solid #1a4731;
  background: transparent;
  color: #1a4731;
  border-radius: 6px;
  padding: 4px 14px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.8rem;
  font-family: inherit;
}

.table-scroll { flex: 1; overflow: auto; }

.excel-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
  color: #1e293b;
  min-width: 900px;
}
.excel-table th,
.excel-table td {
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
.totals-row { background: #1a4731 !important; }
.totals-row td { color: #fff !important; font-weight: 800; font-size: 12px; border-color: #0f3021; }
.totals-label { text-align: right; letter-spacing: 0.05em; }
.col-no { text-align: right; width: 40px; }
.col-evidence { width: 70px; text-align: center; }
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
}
.photo-full { max-width: 80vw; max-height: 80vh; object-fit: contain; }
.photo-close {
  position: absolute;
  top: 6px;
  right: 10px;
  border: none;
  background: transparent;
  font-size: 1.2rem;
  cursor: pointer;
}
.mono { font-family: 'Courier New', monospace; }
.empty-row { text-align: center; color: #94a3b8; padding: 2rem 0; font-style: italic; }

/* Signature block */
.sig-block { display: none; }
.sig-col { text-align: center; flex: 1; }
.sig-line { border-bottom: 1px solid #1a4731; width: 200px; margin: 0 auto 6px; }
.sig-name { font-size: 0.82rem; font-weight: 700; color: #1a4731; margin: 0; }

/* ── Print ─────────────────────────────────────────────────── */
.no-print { }
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
  .excel-table { min-width: 0 !important; }
  .excel-table thead th { position: static; background: #1a4731 !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }

  .letterhead { text-align: center; margin-bottom: 1rem; border-bottom: 2px solid #1a4731; padding-bottom: 0.75rem; }
  .lh-title { margin: 0; font-size: 1.1rem; font-weight: 800; color: #1a4731; }
  .lh-sub { margin: 2px 0; font-size: 0.9rem; color: #374151; }
  .lh-meta { margin: 2px 0 0; font-size: 0.78rem; color: #64748b; }

  .sig-block {
    display: flex !important;
    justify-content: space-around;
    margin-top: 3rem;
    padding-top: 1rem;
  }
}
</style>
