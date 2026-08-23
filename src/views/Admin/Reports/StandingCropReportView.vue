<template>
  <ion-page>
    <ion-header class="no-print">
      <ion-toolbar class="rpt-toolbar">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Standing Crop Report</ion-title>
      </ion-toolbar>
    </ion-header>

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
            </p>
          </template>
        </MaoFormHeader>
      </div>

      <div class="rpt-shell">
        <div class="filter-bar no-print">
          <div class="filter-group">
            <label class="filter-label">Barangay</label>
            <select class="filter-select" v-model="filters.barangay" @change="fetchRows">
              <option value="">All Barangays</option>
              <option v-for="b in barangays" :key="b" :value="b">{{ b }}</option>
            </select>
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
          <div class="grid-head">
            <span class="grid-title">Standing Crop Records</span>
            <div class="grid-actions no-print">
              <ion-button class="add-override-btn" @click="encodeOpen = true">
                <ion-icon slot="start" :icon="addCircleOutline"></ion-icon>
                Add
              </ion-button>
              <FormExportActions theme="admin" @print="printReport" @excel="downloadExcel" />
              <span class="row-pill">{{ rows.length }} record(s)</span>
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
          <div v-else class="table-scroll">
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
                <tr v-if="!rows.length">
                  <td colspan="9" class="empty-row">No standing crop records match the current filters.</td>
                </tr>
                <tr v-for="(row, i) in rows" :key="row.id || i">
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
                <tr v-if="rows.length" class="totals-row">
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
import { ref, reactive, computed, onMounted, defineAsyncComponent } from 'vue';
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
const filters = reactive({ barangay: '', cropType: '', growthStage: '' });
const totalAreaHa = computed(() =>
  rows.value.reduce((s, r) => s + Number(r.area_ha || 0), 0).toFixed(2)
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
  filters.barangay = '';
  filters.cropType = '';
  filters.growthStage = '';
  fetchRows();
}

function printReport() {
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
    rows: rows.value as Record<string, unknown>[],
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
.filter-label { font-size: 0.68rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
.filter-select, .clear-btn, .retry-btn {
  font-family: inherit; font-size: 0.85rem; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px;
}
.clear-btn, .retry-btn { background: #f8fafc; cursor: pointer; font-weight: 700; }
.grid-shell { background: #fff; border: 1px solid #d5dbe1; border-radius: 8px; overflow: hidden; flex: 1; }
.grid-head { display: flex; justify-content: space-between; align-items: center; padding: 0.7rem 0.9rem; border-bottom: 1px solid #e2e8f0; }
.grid-title { font-weight: 800; color: #1a4731; }
.row-pill { font-size: 0.75rem; font-weight: 700; color: #64748b; }
.grid-state { padding: 2rem; text-align: center; color: #64748b; }
.grid-state.error { color: #b91c1c; }
.table-scroll { overflow: auto; }
.excel-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.excel-table th, .excel-table td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
.excel-table th { background: #f1f5f9; font-size: 0.72rem; text-transform: uppercase; color: #475569; }
.col-no { width: 48px; }
.col-num { text-align: right; }
.totals-row { background: #1a4731 !important; }
.totals-row td { color: #fff !important; font-weight: 800; font-size: 12px; border-color: #0f3021; }
.totals-label { text-align: right; letter-spacing: 0.05em; }
.mono { font-variant-numeric: tabular-nums; }
.empty-row { text-align: center; color: #94a3b8; padding: 1.5rem !important; }
.lh-meta { margin: 0; font-size: 0.85rem; }
.print-only { display: none; }
@media print {
  .no-print { display: none !important; }
  .print-only { display: block; }
}
</style>
