<template>
  <ion-page>
    <ion-header class="no-print">
      <ion-toolbar class="exec-toolbar">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Executive Reporting Suite</ion-title>
        <ion-buttons slot="end">
          <ion-button
            class="export-btn"
            :disabled="!filteredRows.length"
            @click="exportToPdf"
          >
            <ion-icon slot="start" :icon="printOutline"></ion-icon>
            Export to PDF
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="exec-content ion-padding">
      <div class="suite-header no-print">
        <h2>MAO Executive Reporting</h2>
        <p>Live planting, pest, and damage records encoded by barangay officials (and field sync).</p>
      </div>

      <ion-segment
        class="category-segment no-print"
        :value="activeCategory"
        scrollable
        @ionChange="onCategoryChange"
      >
        <ion-segment-button
          v-for="cat in categories"
          :key="cat.id"
          :value="cat.id"
        >
          <ion-label>{{ cat.shortLabel }}</ion-label>
        </ion-segment-button>
      </ion-segment>

      <div class="filter-bar no-print">
        <ion-select
          class="filter-field"
          label="Barangay"
          label-placement="stacked"
          interface="popover"
          :value="filters.barangay"
          @ionChange="(e: CustomEvent) => filters.barangay = e.detail.value"
        >
          <ion-select-option value="">All Barangays</ion-select-option>
          <ion-select-option v-for="b in barangays" :key="b" :value="b">{{ b }}</ion-select-option>
        </ion-select>

        <ion-input
          class="filter-field"
          type="date"
          label="Start Date"
          label-placement="stacked"
          :value="filters.dateFrom"
          @ionInput="(e: CustomEvent) => filters.dateFrom = e.detail.value ?? ''"
        ></ion-input>

        <ion-input
          class="filter-field"
          type="date"
          label="End Date"
          label-placement="stacked"
          :value="filters.dateTo"
          @ionInput="(e: CustomEvent) => filters.dateTo = e.detail.value ?? ''"
        ></ion-input>

        <ion-select
          class="filter-field"
          label="Crop Type"
          label-placement="stacked"
          interface="popover"
          :value="filters.cropType"
          @ionChange="(e: CustomEvent) => filters.cropType = e.detail.value"
        >
          <ion-select-option value="">All Crops</ion-select-option>
          <ion-select-option value="Rice">Rice</ion-select-option>
          <ion-select-option value="Corn">Corn</ion-select-option>
          <ion-select-option value="High-Value">High-Value</ion-select-option>
        </ion-select>
      </div>

      <div class="table-panel no-print">
        <div class="panel-head">
          <h3>{{ activeCategoryLabel }}</h3>
          <span class="row-badge">{{ filteredRows.length }} row(s)</span>
        </div>

        <div v-if="loading" class="table-state">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
          <p>Loading encoded records…</p>
        </div>
        <div v-else-if="loadError" class="table-state error">
          <p>{{ loadError }}</p>
          <ion-button size="small" @click="fetchRows">Retry</ion-button>
        </div>
        <div v-else class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th v-for="col in activeColumns" :key="col.key" :class="{ center: col.center }">
                  {{ col.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!filteredRows.length">
                <td :colspan="activeColumns.length" class="empty-cell">
                  No encoded records match the current filters. Encode planting, pest, or calamity data in the Barangay Portal, then refresh.
                </td>
              </tr>
              <tr v-for="(row, i) in filteredRows" :key="i">
                <td
                  v-for="col in activeColumns"
                  :key="col.key"
                  :class="{ center: col.center }"
                >
                  {{ displayCell(row, col.key, i) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Hidden print target -->
      <div class="print-only">
        <PrintableReportTemplate
          v-if="printPayload"
          :report-type="printPayload.reportType"
          :rows="printPayload.rows"
          :barangay="printPayload.barangay"
          :crop-type="printPayload.cropType"
          :date-from="printPayload.dateFrom"
          :date-to="printPayload.dateTo"
          :prepared-by="preparedBy"
        />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonMenuButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonSpinner,
  toastController,
} from '@ionic/vue';
import { printOutline } from 'ionicons/icons';
import PrintableReportTemplate from '@/components/PrintableReportTemplate.vue';
import {
  columnsForCategory,
  REPORT_CATEGORY_LABELS,
  type ExecutiveReportCategory,
} from '@/constants/executiveReportingColumns';
import apiClient from '@/utils/axios';
import { useAuthStore } from '@/stores/authStore';

export type ExecutiveReportRow = Record<string, string | number>;

const categories: { id: ExecutiveReportCategory; shortLabel: string }[] = [
  { id: 'crop_production', shortLabel: 'Crop Production' },
  { id: 'masterlists', shortLabel: 'Masterlists' },
  { id: 'pest_surveillance', shortLabel: 'Pest Surveillance' },
  { id: 'damage_calamity', shortLabel: 'Damage & Calamity' },
];

const authStore = useAuthStore();
const activeCategory = ref<ExecutiveReportCategory>('crop_production');
const barangays = ref<string[]>([]);
const rows = ref<ExecutiveReportRow[]>([]);
const loading = ref(false);
const loadError = ref('');

const filters = reactive({
  barangay: '',
  dateFrom: '',
  dateTo: '',
  cropType: '',
});

const printPayload = ref<{
  reportType: ExecutiveReportCategory;
  rows: ExecutiveReportRow[];
  barangay: string;
  cropType: string;
  dateFrom: string;
  dateTo: string;
} | null>(null);

const activeColumns = computed(() => columnsForCategory(activeCategory.value));
const activeCategoryLabel = computed(() => REPORT_CATEGORY_LABELS[activeCategory.value]);
const preparedBy = computed(() => authStore.userName ?? 'MAO Administrator');
const filteredRows = computed(() => rows.value);

let fetchTimer: ReturnType<typeof setTimeout> | undefined;

async function fetchRows() {
  loading.value = true;
  loadError.value = '';
  try {
    const res = await apiClient.get('/executive-reports', {
      params: {
        category: activeCategory.value,
        barangay: filters.barangay || undefined,
        crop_type: filters.cropType || undefined,
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
      },
    });
    rows.value = res.data?.data?.rows ?? [];
  } catch (e: any) {
    rows.value = [];
    loadError.value = e?.response?.data?.message || 'Failed to load encoded report data.';
  } finally {
    loading.value = false;
  }
}

function scheduleFetch() {
  clearTimeout(fetchTimer);
  fetchTimer = setTimeout(() => {
    void fetchRows();
  }, 250);
}

function onCategoryChange(e: CustomEvent) {
  const val = e.detail.value as ExecutiveReportCategory;
  if (val) activeCategory.value = val;
}

function displayCell(row: ExecutiveReportRow, key: string, index: number): string | number {
  if (key === 'no') return index + 1;
  return row[key] ?? '';
}

async function exportToPdf() {
  if (!filteredRows.value.length) {
    const t = await toastController.create({
      message: 'No data to export for the current filters.',
      color: 'warning',
      duration: 2400,
      position: 'top',
    });
    await t.present();
    return;
  }

  printPayload.value = {
    reportType: activeCategory.value,
    rows: filteredRows.value,
    barangay: filters.barangay,
    cropType: filters.cropType,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  };

  setTimeout(() => window.print(), 350);
}

watch(
  () => [activeCategory.value, filters.barangay, filters.dateFrom, filters.dateTo, filters.cropType],
  () => scheduleFetch(),
);

onMounted(async () => {
  try {
    const res = await apiClient.get('/farmers/barangays');
    barangays.value = (res.data?.data ?? []).filter(Boolean);
  } catch {
    barangays.value = [];
  }
  await fetchRows();
});
</script>

<style scoped>
.exec-toolbar {
  --background: #1a4731;
  --color: #fff;
}

.export-btn {
  --background: #d4af37;
  --color: #1a4731;
  font-weight: 700;
  text-transform: none;
}

.exec-content {
  --background: #f4f8f5;
}

.suite-header {
  max-width: 1200px;
  margin: 0 auto 1rem;
}

.suite-header h2 {
  margin: 0 0 0.25rem;
  color: #1a4731;
  font-size: 1.35rem;
}

.suite-header p {
  margin: 0;
  color: #4b5563;
  font-size: 0.9rem;
}

.category-segment {
  max-width: 1200px;
  margin: 0 auto 1rem;
  --background: #e8f0eb;
}

.category-segment ion-segment-button {
  --color: #1a4731;
  --color-checked: #fff;
  --indicator-color: #1a4731;
  min-width: 120px;
  font-size: 0.78rem;
}

.filter-bar {
  max-width: 1200px;
  margin: 0 auto 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
  background: #fff;
  border: 1px solid #d1e0d6;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(26, 71, 49, 0.06);
}

.filter-field {
  --background: #f8fbf9;
  border: 1px solid #c5d9cc;
  border-radius: 8px;
  padding: 0 0.5rem;
}

.table-panel {
  max-width: 1200px;
  margin: 0 auto 2rem;
  background: #fff;
  border: 1px solid #d1e0d6;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(26, 71, 49, 0.08);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  background: linear-gradient(90deg, #1a4731 0%, #245a3f 100%);
  color: #fff;
}

.panel-head h3 {
  color: #d1e0d6;
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.row-badge {
  background: #d4af37;
  color: #1a4731;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
}

.table-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2.5rem 1rem;
  color: #4b5563;
}

.table-state.error {
  color: #b91c1c;
}

.table-scroll {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
  min-width: 900px;
}

.data-table th {
  background: #eef5f0;
  color: #1a4731;
  font-weight: 700;
  text-align: left;
  padding: 0.55rem 0.5rem;
  border-bottom: 2px solid #1a4731;
  white-space: nowrap;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.data-table td {
  padding: 0.5rem;
  border-bottom: 1px solid #e5ece7;
  vertical-align: top;
  color: #1f2937;
}

.data-table tbody tr:nth-child(even) {
  background: #fafcfa;
}

.data-table tbody tr:hover {
  background: #f0f7f2;
}

.data-table .center {
  text-align: center;
}

.empty-cell {
  text-align: center;
  color: #6b7280;
  padding: 2rem !important;
  font-style: italic;
}

.print-only {
  display: none;
}

@media print {
  .no-print {
    display: none !important;
  }

  .print-only {
    display: block !important;
  }

  ion-content {
    --background: #fff;
  }
}
</style>

<style>
@media print {
  ion-header,
  ion-menu,
  .ion-page:not(.can-go-back) ion-header,
  .no-print {
    display: none !important;
  }

  body {
    background: #fff !important;
  }
}
</style>
