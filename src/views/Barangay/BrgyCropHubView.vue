<template>
  <ion-page>
    <AppHeader />

    <ion-content class="ion-padding page-bg">
      <div class="wrapper no-print">
        <div class="hub-toolbar">
          <div class="mode-toggle-bar">
            <button class="mode-btn" :class="{ active: kind === 'planting' }" @click="setKind('planting')">Planting</button>
            <button class="mode-btn" :class="{ active: kind === 'standing' }" @click="setKind('standing')">Standing</button>
            <button class="mode-btn" :class="{ active: kind === 'harvest' }" @click="setKind('harvest')">Harvest</button>
          </div>
          <div class="mode-toggle-bar">
            <button class="mode-btn" :class="{ active: viewMode === 'ledger' }" @click="setViewMode('ledger')">Active Ledger</button>
            <button class="mode-btn" :class="{ active: viewMode === 'entry' }" @click="setViewMode('entry')">New Entry</button>
          </div>
        </div>

        <template v-if="viewMode === 'entry'">
          <PlantingLedgerView v-if="kind === 'planting'" embedded @saved="onSaved" />
          <StandingCropLogView v-else-if="kind === 'standing'" embedded @saved="onSaved" />
          <HarvestingLogView v-else embedded @saved="onSaved" />
        </template>

        <template v-else>
          <EncodingBarangaySelector
            :is-admin-override="isAdminOverride"
            v-model:selected-barangay="selectedBarangay"
            :barangay-options="barangayOptions"
            :loading-barangays="loadingBarangays"
            :can-encode="canEncode"
            @change="onTargetBarangayChange"
          />

          <div class="filter-bar">
            <div class="filter-group grow">
              <label class="filter-label">Search</label>
              <input class="filter-input" type="search" v-model="searchQuery" placeholder="Name or RSBSA" />
            </div>
            <div class="filter-group">
              <label class="filter-label">Crop</label>
              <select class="filter-select" v-model="cropFilter">
                <option value="">All Crops</option>
                <option value="Rice">Rice</option>
                <option value="Corn">Corn</option>
              </select>
            </div>
            <div v-if="kind === 'planting'" class="filter-group">
              <label class="filter-label">Form Type</label>
              <select class="filter-select" v-model="plantingMode">
                <option value="already_planted">Already Planted</option>
                <option value="not_continued">Planted but Not Continued</option>
                <option value="with_water">Planted With Water Source</option>
                <option value="without_water">Planted Without Water Source</option>
              </select>
            </div>
          </div>

          <div class="ledger-card">
            <div class="ledger-toolbar">
              <div class="ledger-meta">
                <h3>{{ ledgerTitle }}</h3>
                <span class="ledger-count">{{ filteredRows.length }} record(s) · {{ totalHa.toFixed(2) }} ha</span>
              </div>
              <FormExportActions :print-disabled="loading" @print="printForm" @excel="downloadExcel" />
            </div>

            <div v-if="loading" class="grid-state">
              <ion-spinner name="crescent" color="primary"></ion-spinner>
              <p>Loading records…</p>
            </div>
            <div v-else-if="loadError" class="grid-state error">
              <p>{{ loadError }}</p>
              <button class="retry-btn" type="button" @click="loadLedger">Retry</button>
            </div>
            <div v-else class="table-scroll">
              <table v-if="kind === 'planting'" class="excel-table">
                <thead>
                  <tr>
                    <th>NO.</th>
                    <th>RSBSA NO.</th>
                    <th>LAST NAME</th>
                    <th>FIRST NAME</th>
                    <th>MIDDLE NAME</th>
                    <th>EXT NAME</th>
                    <th>BIRTHDAY</th>
                    <th>FARMER ADDRESS</th>
                    <th>FARM LOCATION</th>
                    <th>VARIETY</th>
                    <th>AREA PLANTED</th>
                    <th>DATE OF PLANTING</th>
                    <th class="no-print">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!filteredRows.length">
                    <td colspan="13" class="empty-row">No planting records match the current filters.</td>
                  </tr>
                  <tr v-for="(row, i) in filteredRows" :key="row.id">
                    <td class="col-no">{{ i + 1 }}</td>
                    <td class="mono">{{ row.rsbsa_no }}</td>
                    <td>{{ row.surname }}</td>
                    <td>{{ row.first_name }}</td>
                    <td>{{ row.middle_name }}</td>
                    <td>{{ row.ext_name }}</td>
                    <td>{{ row.birthdate_display }}</td>
                    <td>{{ row.farmer_address }}</td>
                    <td>{{ row.farm_location }}</td>
                    <td>{{ row.variety }}</td>
                    <td class="col-num">{{ Number(row.area_planted).toFixed(2) }}</td>
                    <td class="mono">{{ row.date_of_planting }}</td>
                    <td class="no-print">
                      <ReportRowActions
                        @edit="openEdit(row)"
                        @remove="promptDelete({ endpoint: deleteEndpoint(row.id), label: ledgerTitle, onSuccess: loadLedger })"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>

              <table v-else-if="kind === 'standing'" class="excel-table">
                <thead>
                  <tr>
                    <th>NO.</th>
                    <th>RSBSA NO.</th>
                    <th>LAST NAME</th>
                    <th>FIRST NAME</th>
                    <th>MIDDLE NAME</th>
                    <th>EXT NAME</th>
                    <th>FARM LOCATION</th>
                    <th>CROP TYPE</th>
                    <th>VARIETY</th>
                    <th>AREA (ha)</th>
                    <th>GROWTH STAGE</th>
                    <th>EST. DATE OF HARVEST</th>
                    <th class="no-print">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!filteredRows.length">
                    <td colspan="13" class="empty-row">No standing crop records match the current filters.</td>
                  </tr>
                  <tr v-for="(row, i) in filteredRows" :key="row.id">
                    <td class="col-no">{{ i + 1 }}</td>
                    <td class="mono">{{ row.rsbsa_no }}</td>
                    <td>{{ row.surname }}</td>
                    <td>{{ row.first_name }}</td>
                    <td>{{ row.middle_name }}</td>
                    <td>{{ row.ext_name }}</td>
                    <td>{{ row.farm_location }}</td>
                    <td>{{ row.crop_type }}</td>
                    <td>{{ row.variety }}</td>
                    <td class="col-num">{{ Number(row.area_ha).toFixed(2) }}</td>
                    <td>{{ row.growth_stage }}</td>
                    <td class="mono">{{ row.est_harvest_date }}</td>
                    <td class="no-print">
                      <ReportRowActions
                        @edit="openEdit(row)"
                        @remove="promptDelete({ endpoint: deleteEndpoint(row.id), label: ledgerTitle, onSuccess: loadLedger })"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>

              <table v-else class="excel-table">
                <thead>
                  <tr>
                    <th>NO.</th>
                    <th>RSBSA NO.</th>
                    <th>LAST NAME</th>
                    <th>FIRST NAME</th>
                    <th>MIDDLE NAME</th>
                    <th>EXT NAME</th>
                    <th>FARM LOCATION</th>
                    <th>CROP TYPE</th>
                    <th>VARIETY</th>
                    <th>AREA HARVESTED (ha)</th>
                    <th>TOTAL YIELD</th>
                    <th>DATE OF HARVEST</th>
                    <th class="no-print">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!filteredRows.length">
                    <td colspan="13" class="empty-row">No harvest records match the current filters.</td>
                  </tr>
                  <tr v-for="(row, i) in filteredRows" :key="row.id">
                    <td class="col-no">{{ i + 1 }}</td>
                    <td class="mono">{{ row.rsbsa_no }}</td>
                    <td>{{ row.surname }}</td>
                    <td>{{ row.first_name }}</td>
                    <td>{{ row.middle_name }}</td>
                    <td>{{ row.ext_name }}</td>
                    <td>{{ row.farm_location }}</td>
                    <td>{{ row.crop_type }}</td>
                    <td>{{ row.variety }}</td>
                    <td class="col-num">{{ Number(row.area_harvested).toFixed(2) }}</td>
                    <td>{{ row.yield_display }}</td>
                    <td class="mono">{{ row.date_of_harvest }}</td>
                    <td class="no-print">
                      <ReportRowActions
                        @edit="openEdit(row)"
                        @remove="promptDelete({ endpoint: deleteEndpoint(row.id), label: ledgerTitle, onSuccess: loadLedger })"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="ledger-footer">
              <span>{{ pageMeta.total }} total · {{ totalHa.toFixed(2) }} ha on this view</span>
              <div v-if="pageMeta.last > 1" class="pager">
                <button type="button" :disabled="page <= 1" @click="page = Math.max(1, page - 1)">Prev</button>
                <span>Page {{ page }} of {{ pageMeta.last }}</span>
                <button type="button" :disabled="page >= pageMeta.last" @click="page = Math.min(pageMeta.last, page + 1)">Next</button>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div v-if="viewMode === 'ledger'" class="form-preview print-document print-only">
        <PlantingLedgerPrint
          v-if="kind === 'planting'"
          :rows="plantingPrintRows"
          :barangay="effectiveBarangay || ''"
          :crop="printCrop"
          :mode="plantingMode"
        />
        <StandingCropPrint
          v-else-if="kind === 'standing'"
          :rows="standingPrintRows"
          :barangay="effectiveBarangay || ''"
          :crop="printCrop"
        />
        <HarvestingPrint
          v-else
          :rows="harvestPrintRows"
          :barangay="effectiveBarangay || ''"
          :crop="printCrop"
        />
      </div>
    </ion-content>

    <ReportInlineEditModal
      :is-open="editOpen"
      :title="editTitle"
      :endpoint="editEndpoint"
      :fields="editFields"
      :initial="editInitial"
      @close="editOpen = false"
      @saved="loadLedger"
    />

    <ConfirmDeleteModal
      :is-open="deleteOpen"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </ion-page>
</template>

<script setup lang="ts">
import AppHeader from '@/components/Navigation/AppHeader.vue';
import { computed, defineAsyncComponent, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IonPage, IonContent, IonButton, IonSpinner } from '@ionic/vue';
import FormExportActions from '@/components/FormExportActions.vue';
import EncodingBarangaySelector from '@/components/EncodingBarangaySelector.vue';
import { useEncodingBarangay } from '@/composables/useEncodingBarangay';
import { formatBirthday } from '@/composables/useBarangayFarmerSearch';
import type { PlantingPrintMode } from '@/components/PlantingLedgerPrint.vue';
import {
  exportHarvestingExcel,
  exportPlantingLedgerExcel,
  exportStandingCropExcel,
} from '@/utils/statutoryFormExcel';
import apiClient from '@/utils/axios';
import { toast } from '@/utils/toast';
import ReportRowActions from '@/components/ReportRowActions.vue';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal.vue';
import ReportInlineEditModal, { type ReportEditField } from '@/components/ReportInlineEditModal.vue';
import { useReportRowActions } from '@/composables/useReportRowActions';
import '@/assets/reportTableStyles.css';
import {
  PLANTING_STATUS_OPTIONS,
  WATER_SOURCE_OPTIONS,
  GROWTH_STAGE_OPTIONS,
} from '@/constants/reportEditOptions';

const PlantingLedgerView = defineAsyncComponent(() => import('@/views/Barangay/PlantingLedgerView.vue'));
const StandingCropLogView = defineAsyncComponent(() => import('@/views/Barangay/StandingCropLogView.vue'));
const HarvestingLogView = defineAsyncComponent(() => import('@/views/Barangay/HarvestingLogView.vue'));
const PlantingLedgerPrint = defineAsyncComponent(() => import('@/components/PlantingLedgerPrint.vue'));
const StandingCropPrint = defineAsyncComponent(() => import('@/components/StandingCropPrint.vue'));
const HarvestingPrint = defineAsyncComponent(() => import('@/components/HarvestingPrint.vue'));

type CropKind = 'planting' | 'standing' | 'harvest';
type ViewMode = 'ledger' | 'entry';

interface LedgerRow {
  id: string;
  rsbsa_no: string;
  surname: string;
  first_name: string;
  middle_name: string;
  ext_name: string;
  birthdate_display: string;
  farmer_address: string;
  farm_location: string;
  crop: string;
  crop_type: string;
  variety: string;
  area_planted: number;
  date_of_planting: string;
  planting_status: string;
  water_source: string;
  remarks: string;
  area_ha: number;
  growth_stage: string;
  est_harvest_date: string;
  area_harvested: number;
  yield_amount: number;
  yield_display: string;
  date_of_harvest: string;
}

const KINDS: CropKind[] = ['planting', 'standing', 'harvest'];

const route = useRoute();
const router = useRouter();

const {
  isAdminOverride,
  selectedBarangay,
  barangayOptions,
  loadingBarangays,
  effectiveBarangay,
  canEncode,
} = useEncodingBarangay();

const kind = computed<CropKind>(() => {
  const raw = String(route.query.kind || 'planting');
  return KINDS.includes(raw as CropKind) ? (raw as CropKind) : 'planting';
});
const viewMode = computed<ViewMode>(() => (route.query.mode === 'entry' ? 'entry' : 'ledger'));

const searchQuery = ref('');
const cropFilter = ref('');
const plantingMode = ref<PlantingPrintMode>('already_planted');
const page = ref(1);
const loading = ref(false);
const loadError = ref('');
const rows = ref<LedgerRow[]>([]);
const pageMeta = reactive({ current: 1, last: 1, total: 0 });

const ledgerTitle = computed(() => {
  if (kind.value === 'standing') return 'Standing Crop Records';
  if (kind.value === 'harvest') return 'Harvest Records';
  return 'Planting Records';
});

const mapFarmerAddress = (f: any) =>
  [f?.permanent_house_no, f?.permanent_street, f?.permanent_brgy, f?.permanent_city, f?.permanent_province]
    .filter(Boolean)
    .join(', ') || f?.permanent_brgy || '';

const sliceDate = (v: any) => String(v || '').slice(0, 10);

const yieldLabel = (amount: number, unit: string) =>
  `${Number(amount).toLocaleString()} ${unit || 'Metric Tons'}`;

const emptyRow = (): LedgerRow => ({
  id: '',
  rsbsa_no: '',
  surname: '',
  first_name: '',
  middle_name: '',
  ext_name: '',
  birthdate_display: '',
  farmer_address: '',
  farm_location: '',
  crop: '',
  crop_type: '',
  variety: '',
  area_planted: 0,
  date_of_planting: '',
  planting_status: '',
  water_source: '',
  remarks: '',
  area_ha: 0,
  growth_stage: '',
  est_harvest_date: '',
  area_harvested: 0,
  yield_amount: 0,
  yield_display: '',
  date_of_harvest: '',
});

const mapPlanting = (r: any): LedgerRow => {
  const farmer = r.farmer || {};
  return {
    ...emptyRow(),
    id: r.id,
    rsbsa_no: farmer.rsbsa_no || '',
    surname: farmer.surname || '',
    first_name: farmer.first_name || '',
    middle_name: farmer.middle_name || '',
    ext_name: farmer.ext_name || '',
    birthdate_display: formatBirthday(farmer.birthdate || ''),
    farmer_address: mapFarmerAddress(farmer),
    farm_location: r.farm_location || r.farm_plot?.location_brgy || farmer.permanent_brgy || '',
    crop: r.crop_type || 'Rice',
    crop_type: r.crop_type || 'Rice',
    variety: r.variety || '',
    area_planted: Number(r.area_planted) || 0,
    date_of_planting: sliceDate(r.date_planted),
    planting_status: r.status || 'Active',
    water_source: r.water_source || '',
    remarks: r.remarks || '',
  };
};

const mapStanding = (r: any): LedgerRow => {
  const farmer = r.farmer || {};
  return {
    ...emptyRow(),
    id: r.id,
    rsbsa_no: farmer.rsbsa_no || '',
    surname: farmer.surname || '',
    first_name: farmer.first_name || '',
    middle_name: farmer.middle_name || '',
    ext_name: farmer.ext_name || '',
    farm_location: r.farm_location || r.farm_plot?.location_brgy || farmer.permanent_brgy || '',
    crop: r.crop_type || 'Rice',
    crop_type: r.crop_type || 'Rice',
    variety: r.variety || '',
    area_ha: Number(r.area_ha) || 0,
    growth_stage: r.growth_stage || '',
    est_harvest_date: sliceDate(r.est_harvest_date),
  };
};

const mapHarvest = (r: any): LedgerRow => {
  const farmer = r.farmer || {};
  const unit = r.yield_unit || 'Metric Tons';
  const amount = Number(r.total_yield) || 0;
  return {
    ...emptyRow(),
    id: r.id,
    rsbsa_no: farmer.rsbsa_no || '',
    surname: farmer.surname || '',
    first_name: farmer.first_name || '',
    middle_name: farmer.middle_name || '',
    ext_name: farmer.ext_name || '',
    farm_location: r.farm_location || r.farm_plot?.location_brgy || farmer.permanent_brgy || '',
    crop: r.crop_type || 'Rice',
    crop_type: r.crop_type || 'Rice',
    variety: r.variety || '',
    area_harvested: Number(r.area_harvested) || 0,
    yield_amount: amount,
    yield_display: yieldLabel(amount, unit),
    date_of_harvest: sliceDate(r.date_harvested),
  };
};

const cropOf = (row: LedgerRow) => row.crop || row.crop_type || '';

const matchesSearch = (row: LedgerRow, q: string) => {
  if (!q) return true;
  const hay = `${row.rsbsa_no} ${row.surname} ${row.first_name} ${row.middle_name} ${row.ext_name}`.toLowerCase();
  return hay.includes(q);
};

const filteredRows = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return rows.value.filter((row) => {
    if (cropFilter.value && cropOf(row) !== cropFilter.value) return false;
    if (!matchesSearch(row, q)) return false;
    if (kind.value !== 'planting') return true;
    if (plantingMode.value === 'not_continued') return row.planting_status === 'Not Continued';
    if (plantingMode.value === 'with_water') return row.water_source !== 'Rainfed/None' && row.planting_status === 'Active';
    if (plantingMode.value === 'without_water') return row.water_source === 'Rainfed/None';
    return row.planting_status === 'Active';
  });
});

const totalHa = computed(() =>
  filteredRows.value.reduce((sum, row) => {
    if (kind.value === 'standing') return sum + Number(row.area_ha || 0);
    if (kind.value === 'harvest') return sum + Number(row.area_harvested || 0);
    return sum + Number(row.area_planted || 0);
  }, 0),
);

const printCrop = computed(() => cropFilter.value || cropOf(filteredRows.value[0] || emptyRow()) || 'Rice');

const plantingPrintRows = computed(() =>
  filteredRows.value.map((e) => ({
    rsbsa_no: e.rsbsa_no,
    surname: e.surname,
    first_name: e.first_name,
    middle_name: e.middle_name,
    ext_name: e.ext_name,
    birthdate: e.birthdate_display,
    farmer_address: e.farmer_address,
    farm_location: e.farm_location,
    variety: e.variety,
    area_planted: Number(e.area_planted).toFixed(2),
    area_planted_num: e.area_planted,
    date_of_planting: e.date_of_planting,
    water_source: e.water_source,
    remarks: e.remarks,
  })),
);

const standingPrintRows = computed(() =>
  filteredRows.value.map((e) => ({
    rsbsa_no: e.rsbsa_no,
    surname: e.surname,
    first_name: e.first_name,
    middle_name: e.middle_name,
    ext_name: e.ext_name,
    farm_location: e.farm_location,
    crop_type: e.crop_type,
    variety: e.variety,
    area_ha: Number(e.area_ha).toFixed(2),
    growth_stage: e.growth_stage,
    est_harvest_date: e.est_harvest_date,
  })),
);

const harvestPrintRows = computed(() =>
  filteredRows.value.map((e) => ({
    rsbsa_no: e.rsbsa_no,
    surname: e.surname,
    first_name: e.first_name,
    middle_name: e.middle_name,
    ext_name: e.ext_name,
    farm_location: e.farm_location,
    crop_type: e.crop_type,
    variety: e.variety,
    area_harvested: Number(e.area_harvested).toFixed(2),
    yield_display: e.yield_display,
    date_of_harvest: e.date_of_harvest,
  })),
);

function hubQuery(next: { kind?: CropKind; mode?: ViewMode }) {
  const query: Record<string, string> = {
    kind: next.kind || kind.value,
  };
  const mode = next.mode || viewMode.value;
  if (mode === 'entry') query.mode = 'entry';
  return query;
}

function setKind(next: CropKind) {
  page.value = 1;
  void router.replace({ path: '/brgy/crop-records', query: hubQuery({ kind: next }) });
}

function setViewMode(next: ViewMode) {
  void router.replace({ path: '/brgy/crop-records', query: hubQuery({ mode: next }) });
}

function onTargetBarangayChange() {
  page.value = 1;
  void loadLedger();
}

function onSaved() {
  setViewMode('ledger');
  void loadLedger();
}

async function loadLedger() {
  if (viewMode.value !== 'ledger') return;
  if (!effectiveBarangay.value) {
    rows.value = [];
    pageMeta.current = 1;
    pageMeta.last = 1;
    pageMeta.total = 0;
    return;
  }
  loading.value = true;
  loadError.value = '';
  const endpoint =
    kind.value === 'standing' ? '/standing-crop-logs'
      : kind.value === 'harvest' ? '/harvest-logs'
        : '/planting-logs';
  const mapper =
    kind.value === 'standing' ? mapStanding
      : kind.value === 'harvest' ? mapHarvest
        : mapPlanting;
  try {
    const res = await apiClient.get(endpoint, {
      params: { per_page: 200, page: page.value, barangay: effectiveBarangay.value },
    });
    const paginator = res.data?.data ?? {};
    const list = paginator.data ?? [];
    rows.value = list.map(mapper);
    pageMeta.current = Number(paginator.current_page) || 1;
    pageMeta.last = Number(paginator.last_page) || 1;
    pageMeta.total = Number(paginator.total) || list.length;
  } catch {
    rows.value = [];
    loadError.value = 'Could not load ledger records.';
  } finally {
    loading.value = false;
  }
}

async function removeRow(id: string) {
  promptDelete({
    endpoint: deleteEndpoint(id),
    label: ledgerTitle.value,
    onSuccess: loadLedger,
  });
}

function deleteEndpoint(id: string) {
  return kind.value === 'standing' ? `/standing-crop-logs/${id}`
    : kind.value === 'harvest' ? `/harvest-logs/${id}`
      : `/planting-logs/${id}`;
}

const { deleteOpen, promptDelete, cancelDelete, confirmDelete } = useReportRowActions();
const editOpen = ref(false);
const editEndpoint = ref('');
const editTitle = ref('Edit record');
const editInitial = ref<Record<string, string | number | null | undefined>>({});
const editFields = ref<ReportEditField[]>([]);

function openEdit(row: LedgerRow) {
  if (kind.value === 'harvest') {
    editEndpoint.value = `/harvest-logs/${row.id}`;
    editTitle.value = 'Edit harvest record';
    editFields.value = [
      { key: 'variety', label: 'Variety', type: 'variety', required: true },
      { key: 'area_harvested', label: 'Area Harvested (ha)', type: 'number', required: true },
      { key: 'total_yield', label: 'Total Yield (MT)', type: 'number', required: true },
      { key: 'date_harvested', label: 'Date Harvested', type: 'date', required: true },
    ];
    editInitial.value = {
      crop: row.crop_type,
      crop_type: row.crop_type,
      variety: row.variety,
      area_harvested: row.area_harvested,
      total_yield: row.yield_amount,
      date_harvested: row.date_of_harvest,
    };
  } else if (kind.value === 'standing') {
    editEndpoint.value = `/standing-crop-logs/${row.id}`;
    editTitle.value = 'Edit standing crop record';
    editFields.value = [
      { key: 'variety', label: 'Variety', type: 'variety', required: true },
      { key: 'area_ha', label: 'Area (ha)', type: 'number', required: true },
      {
        key: 'growth_stage',
        label: 'Growth Stage',
        type: 'select',
        options: [...GROWTH_STAGE_OPTIONS],
      },
      { key: 'est_harvest_date', label: 'Est. Harvest Date', type: 'date', required: true },
    ];
    editInitial.value = {
      crop: row.crop_type,
      crop_type: row.crop_type,
      variety: row.variety,
      area_ha: row.area_ha,
      growth_stage: row.growth_stage,
      est_harvest_date: row.est_harvest_date,
    };
  } else {
    editEndpoint.value = `/planting-logs/${row.id}`;
    editTitle.value = 'Edit planting record';
    editFields.value = [
      { key: 'variety', label: 'Variety', type: 'variety', required: true },
      { key: 'area_planted', label: 'Area Planted (ha)', type: 'number', required: true },
      { key: 'date_planted', label: 'Date Planted', type: 'date', required: true },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [...PLANTING_STATUS_OPTIONS],
      },
      {
        key: 'water_source',
        label: 'Water Source',
        type: 'select',
        options: [...WATER_SOURCE_OPTIONS],
      },
    ];
    editInitial.value = {
      crop: row.crop_type,
      crop_type: row.crop_type,
      variety: row.variety,
      area_planted: row.area_planted,
      date_planted: row.date_of_planting,
      status: row.planting_status,
      water_source: row.water_source,
    };
  }
  editOpen.value = true;
}

function printForm() {
  window.print();
}

async function downloadExcel() {
  const barangay = effectiveBarangay.value || '';
  if (kind.value === 'standing') {
    await exportStandingCropExcel({
      rows: standingPrintRows.value,
      barangay,
      crop: printCrop.value,
    });
    return;
  }
  if (kind.value === 'harvest') {
    await exportHarvestingExcel({
      rows: harvestPrintRows.value,
      barangay,
      crop: printCrop.value,
    });
    return;
  }
  await exportPlantingLedgerExcel({
    rows: plantingPrintRows.value,
    barangay,
    crop: printCrop.value,
    mode: plantingMode.value,
  });
}

watch(kind, () => {
  page.value = 1;
});

watch([kind, page, viewMode, effectiveBarangay], () => {
  if (viewMode.value === 'ledger') void loadLedger();
}, { immediate: true });
</script>

<style scoped>
.page-bg { --background: #f4f8f5; }
.wrapper { max-width: 1200px; margin: 0 auto; padding-bottom: 2rem; }
.hub-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: space-between;
  margin-bottom: 1rem;
}
.mode-toggle-bar {
  display: flex;
  background: #fff;
  border: 1px solid #d5dbe1;
  border-radius: 8px;
  overflow: hidden;
  width: fit-content;
}
.mode-btn {
  border: none;
  background: transparent;
  padding: 8px 20px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #64748b;
  cursor: pointer;
  font-family: inherit;
}
.mode-btn.active { background: #1a4731; color: #fff; }
.mode-btn:not(.active):hover { background: #f1f5f9; }

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: flex-end;
  background: #fff;
  border: 1px solid #d5dbe1;
  border-radius: 8px;
  padding: 0.6rem 0.9rem;
  margin-bottom: 0.75rem;
}
.filter-group { display: flex; flex-direction: column; gap: 3px; }
.filter-group.grow { flex: 1; min-width: 180px; }
.filter-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.filter-select, .filter-input {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 0.88rem;
  font-family: inherit;
  min-width: 140px;
  background: #fff;
}

.ledger-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}
.ledger-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e2e8f0;
}
.ledger-meta h3 { margin: 0; color: #1a4731; font-weight: 800; font-size: 1rem; }
.ledger-count { font-size: 0.85rem; color: #64748b; }
.grid-state {
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
.table-scroll { overflow: auto; max-height: 62vh; }
.excel-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 12px;
  color: #1e293b;
  min-width: 900px;
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
.col-no, .col-num { text-align: right; }
.mono { font-family: 'Courier New', monospace; }
.empty-row { text-align: center; color: #94a3b8; padding: 2rem 0; font-style: italic; white-space: normal; }
.ledger-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.65rem 1rem;
  border-top: 1px solid #e2e8f0;
  font-size: 0.82rem;
  color: #64748b;
}
.pager { display: flex; align-items: center; gap: 0.5rem; }
.pager button {
  border: 1px solid #1a4731;
  background: #fff;
  color: #1a4731;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  font-weight: 700;
  font-family: inherit;
}
.pager button:disabled { opacity: 0.4; cursor: default; }
</style>
