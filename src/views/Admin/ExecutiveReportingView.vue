<template>
  <ion-page>
    <AppHeader />

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

      <div class="preview-toolbar no-print">
        <div class="preview-meta">
          <h3>{{ activeCategoryLabel }}</h3>
          <span class="row-badge">{{ filteredRows.length }} row(s)</span>
        </div>
        <FormExportActions theme="admin" @print="printReport" @excel="downloadExcel" />
      </div>

      <div v-if="loading" class="table-state no-print">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
        <p>Loading encoded records…</p>
      </div>
      <div v-else-if="loadError" class="table-state error no-print">
        <p>{{ loadError }}</p>
        <ion-button size="small" @click="fetchRows">Retry</ion-button>
      </div>
      <div v-else class="form-preview print-document">
        <PrintableReportTemplate
          :report-type="activeCategory"
          :rows="filteredRows"
          :barangay="filters.barangay"
          :crop-type="filters.cropType"
          :date-from="filters.dateFrom"
          :date-to="filters.dateTo"
          :prepared-by="preparedBy"
        />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import AppHeader from '@/components/Navigation/AppHeader.vue';
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
} from '@ionic/vue';
import FormExportActions from '@/components/FormExportActions.vue';
import PrintableReportTemplate from '@/components/PrintableReportTemplate.vue';
import {
  columnsForCategory,
  REPORT_CATEGORY_LABELS,
  REPORT_PRINT_TITLES,
  type ExecutiveReportCategory,
} from '@/constants/executiveReportingColumns';
import { exportExecutiveReportExcel } from '@/utils/statutoryFormExcel';
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

const activeCategoryLabel = computed(() => REPORT_CATEGORY_LABELS[activeCategory.value]);
const preparedBy = computed(() => authStore.userName ?? 'MAO Administrator');
const filteredRows = computed(() => rows.value);

const filterSummary = computed(() => {
  const parts: string[] = [];
  if (filters.barangay) parts.push(`Barangay: ${filters.barangay}`);
  else parts.push('Barangay: All');
  if (filters.cropType) parts.push(`Crop: ${filters.cropType}`);
  if (filters.dateFrom || filters.dateTo) {
    parts.push(`Period: ${filters.dateFrom || '…'} to ${filters.dateTo || '…'}`);
  }
  return parts.join(' · ');
});

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

function printReport() {
  window.print();
}

async function downloadExcel() {
  await exportExecutiveReportExcel({
    columns: columnsForCategory(activeCategory.value),
    rows: filteredRows.value,
    reportTitle: REPORT_PRINT_TITLES[activeCategory.value],
    filterSummary: filterSummary.value,
    preparedBy: preparedBy.value,
    filename: `executive-${activeCategory.value}.xlsx`,
  });
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

.preview-toolbar {
  max-width: 1200px;
  margin: 0 auto 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.preview-meta h3 {
  margin: 0;
  color: #1a4731;
  font-size: 1rem;
  font-weight: 700;
}

.row-badge {
  background: #d4af37;
  color: #1a4731;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  margin-left: 0.5rem;
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

@media print {
  .no-print {
    display: none !important;
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
