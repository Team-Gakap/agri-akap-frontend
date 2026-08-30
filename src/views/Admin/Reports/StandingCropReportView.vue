<template>
  <ion-page>
    <AppHeader />

    <ion-content class="rpt-content">
      <div class="print-only letterhead">
        <MaoFormHeader
          :show-barangay="false"
          office-title="Municipal Agriculture Office"
          title="Standing Crop Report"
        >
          <template #subtitle>
            <p class="lh-meta">
              Generated: {{ new Date().toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' }) }}
              <span v-if="filters.barangay">&nbsp;|&nbsp; Barangay: {{ filters.barangay }}</span>
              <span v-if="filters.dateFrom || filters.dateTo">&nbsp;|&nbsp; Period: {{ filters.dateFrom || '—' }} to {{ filters.dateTo || '—' }}</span>
            </p>
          </template>
        </MaoFormHeader>
      </div>

      <div class="rpt-shell">
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
            <input class="filter-input" type="search" v-model="searchQuery" placeholder="Name or RSBSA" />
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
            <label class="filter-label">Date From</label>
            <input class="filter-input" type="date" v-model="filters.dateFrom" @change="onCustomDates" />
          </div>
          <div class="filter-group">
            <label class="filter-label">Date To</label>
            <input class="filter-input" type="date" v-model="filters.dateTo" @change="onCustomDates" />
          </div>
          <div class="filter-group">
            <label class="filter-label">Crop Type</label>
            <select class="filter-select" v-model="filters.cropType" @change="fetchRows">
              <option value="">All Crops</option>
              <option value="Rice">Rice</option>
              <option value="Corn">Corn</option>
              <option value="High-Value">High-Value</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">Growth Stage</label>
            <select class="filter-select" v-model="filters.growthStage" @change="fetchRows">
              <option value="">All Stages</option>
              <option value="Seedling">Seedling</option>
              <option value="Vegetative">Vegetative</option>
              <option value="Reproductive">Reproductive</option>
              <option value="Maturity">Maturity</option>
            </select>
          </div>
          <button class="clear-btn" @click="clearFilters">Clear</button>
        </div>

        <div class="grid-shell">
          <div class="grid-head no-print">
            <span class="grid-title">Standing Crop Records</span>
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
                  <th>Name</th>
                  <th>Farm Location</th>
                  <th>Crop</th>
                  <th>Variety</th>
                  <th class="col-num">Area (ha)</th>
                  <th>Growth Stage</th>
                  <th>Est. Harvest</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!filteredRows.length">
                  <td colspan="9" class="empty-row">No standing crop records match the current filters.</td>
                </tr>
                <tr v-for="(row, i) in filteredRows" :key="row.id || i">
                  <td class="col-no">{{ i + 1 }}</td>
                  <td class="mono">{{ row.rsbsa_no }}</td>
                  <td>{{ row.name }}</td>
                  <td>{{ row.farm_location }}</td>
                  <td>{{ row.crop }}</td>
                  <td>{{ row.variety }}</td>
                  <td class="col-num">{{ fmtNum(row.area_ha) }}</td>
                  <td>{{ row.growth_stage }}</td>
                  <td class="mono">{{ fmtDate(row.est_harvest_date) }}</td>
                </tr>
                <tr v-if="filteredRows.length" class="totals-row">
                  <td colspan="6" class="totals-label">TOTALS</td>
                  <td class="col-num">{{ totalAreaHa }}</td>
                  <td colspan="2"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ion-content>

    <ReportEncodeModal
      v-model:is-open="encodeOpen"
      title="Add / Override Standing Crop Record"
      kind="standing"
      :form-component="StandingForm"
      @saved="fetchRows"
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
import ReportEncodeModal from '@/components/ReportEncodeModal.vue';
import MaoFormHeader from '@/components/MaoFormHeader.vue';
import { useReportScope, type ReportPeriod } from '@/composables/useReportScope';

const StandingForm = defineAsyncComponent(() => import('@/views/Barangay/StandingCropLogView.vue'));

interface StandingRow {
  id?: string;
  rsbsa_no: string;
  name: string;
  farm_location: string;
  crop: string;
  variety: string;
  area_ha: number;
  growth_stage: string;
  est_harvest_date: string;
}

const loading = ref(false);
const loadError = ref('');
const rows = ref<StandingRow[]>([]);
const barangays = ref<string[]>([]);
const encodeOpen = ref(false);
const filters = reactive({ barangay: '', cropType: '', growthStage: '', dateFrom: '', dateTo: '' });
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

const filteredRows = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return rows.value;
  return rows.value.filter((r) =>
    r.name.toLowerCase().includes(q) || String(r.rsbsa_no || '').toLowerCase().includes(q)
  );
});
const totalAreaHa = computed(() =>
  filteredRows.value.reduce((s, r) => s + Number(r.area_ha || 0), 0).toFixed(2)
);

const fmtNum = (v: number | string) => Number(v ?? 0).toFixed(2);
const fmtDate = (d: string) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' }); }
  catch { return d; }
};

async function fetchRows() {
  loading.value = true;
  loadError.value = '';
  try {
    const res = await apiClient.get('/standing-crop-logs', {
      params: {
        per_page: 500,
        barangay: filters.barangay || undefined,
        crop_type: filters.cropType || undefined,
        growth_stage: filters.growthStage || undefined,
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
      },
    });
    const data = res.data?.data?.data ?? [];
    rows.value = data.map((r: any) => {
      const farmer = r.farmer || {};
      return {
        id: r.id,
        rsbsa_no: farmer.rsbsa_no || '',
        name: trim(`${farmer.first_name || ''} ${farmer.surname || ''}`),
        farm_location: r.farm_location || r.farm_plot?.location_brgy || farmer.permanent_brgy || '',
        crop: r.crop_type || '',
        variety: r.variety || '',
        area_ha: Number(r.area_ha) || 0,
        growth_stage: r.growth_stage || '',
        est_harvest_date: String(r.est_harvest_date || '').slice(0, 10),
      };
    });
  } catch (e: any) {
    rows.value = [];
    loadError.value = e?.response?.data?.message || 'Could not load standing crop data.';
  } finally {
    loading.value = false;
  }
}

function trim(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

function clearFilters() {
  filters.barangay = lockedBarangay.value || '';
  filters.cropType = '';
  filters.growthStage = '';
  filters.dateFrom = '';
  filters.dateTo = '';
  searchQuery.value = '';
  period.value = 'custom';
  fetchRows();
}

function printReport() {
  if (loading.value) return;
  window.print();
}

async function downloadExcel() {
  await exportAdminGridExcel({
    filename: 'standing-crop.xlsx',
    reportTitle: 'Standing Crop Report',
    metaLine: `Generated: ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    columns: [
      { key: 'no', label: 'No' },
      { key: 'rsbsa_no', label: 'RSBSA No.' },
      { key: 'name', label: 'Name' },
      { key: 'farm_location', label: 'Farm Location' },
      { key: 'crop', label: 'Crop' },
      { key: 'variety', label: 'Variety' },
      { key: 'area_ha', label: 'Area (ha)' },
      { key: 'growth_stage', label: 'Growth Stage' },
      { key: 'est_harvest_date', label: 'Est. Harvest' },
    ],
    rows: filteredRows.value as Record<string, unknown>[],
    getCellValue(row, key, index) {
      if (key === 'no') return index + 1;
      if (key === 'est_harvest_date') return fmtDate(String(row[key] ?? ''));
      if (key === 'area_ha') return fmtNum(row[key] as number);
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
.grid-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.rpt-content { --background: #eef1f4; }
.rpt-shell { display: flex; flex-direction: column; height: 100%; padding: 0.75rem 1rem 1rem; gap: 0.65rem; }
.filter-bar {
  display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: flex-end;
  background: #fff; border: 1px solid #d5dbe1; border-radius: 8px; padding: 0.7rem 0.85rem;
}
.filter-group { display: flex; flex-direction: column; gap: 4px; }
.filter-label { font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em; }
.filter-select {
  min-width: 160px;
  font-family: inherit; font-size: 0.82rem; border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 8px;
  background: #fff; color: #334155;
}
.clear-btn, .retry-btn { font-family: inherit; font-size: 0.8rem; border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 12px; background: transparent; color: #64748b; cursor: pointer; font-weight: 700; }
.clear-btn:hover { border-color: #94a3b8; color: #334155; }
.grid-shell { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; flex: 1; display: flex; flex-direction: column; }
.grid-head { display: flex; justify-content: space-between; align-items: center; padding: 0.55rem 1rem; background: linear-gradient(90deg, #1a4731 0%, #245a3f 100%); }
.grid-title { color: #d1e0d6; font-size: 0.9rem; font-weight: 700; }
.row-pill { background: #d4af37; color: #1a4731; font-size: 0.72rem; font-weight: 800; padding: 2px 10px; border-radius: 999px; }
.grid-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; padding: 2rem; color: #64748b; }
.grid-state.error { color: #b91c1c; }
.table-scroll { flex: 1; overflow: auto; }
.excel-table { border-collapse: collapse; width: 100%; min-width: 900px; font-size: 13px; color: #1e293b; }
.excel-table th, .excel-table td { border: 1px solid #cbd5e1; padding: 4px 8px; text-align: left; white-space: nowrap; }
.excel-table th { position: sticky; top: 0; background: #1a4731; color: #fff; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; z-index: 2; }
.excel-table tbody tr:nth-child(even) { background: #f8fafc; }
.excel-table tbody tr:hover { background: #eef5ee; }
.col-no { width: 40px; text-align: right; }
.col-num { text-align: right; }
.totals-row { background: #1a4731 !important; }
.totals-row td { color: #fff !important; font-weight: 800; font-size: 12px; border-color: #0f3021; }
.totals-label { text-align: right; letter-spacing: 0.05em; }
.mono { font-family: 'Courier New', monospace; }
.empty-row { text-align: center; color: #94a3b8; padding: 2rem 0 !important; font-style: italic; }
.lh-meta { margin: 0; font-size: 0.85rem; }
.print-only { display: none; }
@media print {
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  .rpt-shell, .rpt-content, .grid-shell, .table-scroll, .print-surface {
    overflow: visible !important;
    height: auto !important;
    max-height: none !important;
    padding: 0;
  }
  .grid-shell { border: none; }
  .excel-table { min-width: 0 !important; }
  .excel-table thead th {
    position: static;
    background: #1a4731 !important;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  .totals-row { background: #1a4731 !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .letterhead { text-align: center; margin-bottom: 1rem; border-bottom: 2px solid #1a4731; padding-bottom: 0.75rem; }
  .lh-meta { margin: 2px 0 0; font-size: 0.78rem; color: #64748b; }
  .sig-block { display: flex !important; justify-content: space-around; margin-top: 3rem; padding-top: 1rem; }
}
</style>
