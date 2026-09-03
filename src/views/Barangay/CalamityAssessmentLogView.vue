<template>
  <component :is="embedded ? 'div' : IonPage" class="encode-root">
    <AppHeader v-if="!embedded" />

    <component :is="embedded ? 'div' : IonContent" class="ion-padding page-bg" :class="{ 'embedded-encode-body': embedded }">
      <div class="wrapper no-print">
        <EncodingBarangaySelector
          :is-admin-override="isAdminOverride"
          v-model:selected-barangay="selectedBarangay"
          :barangay-options="barangayOptions"
          :loading-barangays="loadingBarangays"
          :can-encode="canEncode"
          @change="onTargetBarangayChange"
        />

        <div v-if="!embedded" class="hub-toolbar">
          <div class="mode-toggle-bar">
            <button class="mode-btn" :class="{ active: viewMode === 'ledger' }" type="button" @click="setViewMode('ledger')">Registered records</button>
            <button class="mode-btn" :class="{ active: viewMode === 'entry' }" type="button" @click="setViewMode('entry')">New report</button>
          </div>
        </div>

        <div v-if="showLedger" class="ledger-panel">
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
                <option value="High-Value">High-Value</option>
              </select>
            </div>
          </div>

          <div class="ledger-card">
            <div class="ledger-toolbar">
              <div class="ledger-meta">
                <h3>Registered records</h3>
                <span class="ledger-count">{{ filteredEntries.length }} assessment(s) · {{ totalDamaged.toFixed(2) }} ha damaged</span>
              </div>
              <FormExportActions @print="printForm" @excel="downloadExcel" />
            </div>
            <div class="table-scroll">
              <table class="excel-table">
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
                    <th>STAGE OF CROP</th>
                    <th>AREA PLANTED (ha)</th>
                    <th>AREA DAMAGED (ha)</th>
                    <th>EST. YIELD LOSS (%)</th>
                    <th class="no-print">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!filteredEntries.length">
                    <td colspan="13" class="empty-row">No calamity records match the current filters.</td>
                  </tr>
                  <tr v-for="(e, i) in filteredEntries" :key="e.id">
                    <td class="col-no">{{ i + 1 }}</td>
                    <td class="mono">{{ e.rsbsa_no }}</td>
                    <td>{{ e.surname }}</td>
                    <td>{{ e.first_name }}</td>
                    <td>{{ e.middle_name }}</td>
                    <td>{{ e.ext_name }}</td>
                    <td>{{ e.farm_location }}</td>
                    <td>{{ e.crop_type }}</td>
                    <td>{{ e.crop_stage }}</td>
                    <td class="col-num">{{ Number(e.area_planted).toFixed(2) }}</td>
                    <td class="col-num">{{ Number(e.area_damaged).toFixed(2) }}</td>
                    <td class="col-num">{{ e.est_yield_loss_pct }}</td>
                    <td class="no-print">
                      <img
                        v-if="e.photo_url"
                        :src="e.photo_url"
                        class="ledger-thumb"
                        alt="Evidence"
                        @click="viewingPhoto = e.photo_url!"
                      />
                      <ReportRowActions
                        :can-edit="(e.status || 'Pending') === 'Pending'"
                        :can-remove="(e.status || 'Pending') === 'Pending'"
                        @edit="openEdit(e)"
                        @remove="promptDelete({ endpoint: `/damage-assessments/${e.id}`, label: 'Calamity assessment', onSuccess: loadLedger })"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="ledger-footer">
              <span>{{ pageMeta.total }} total · {{ totalDamaged.toFixed(2) }} ha damaged on this view</span>
              <div v-if="pageMeta.last > 1" class="pager">
                <button type="button" :disabled="page <= 1" @click="page = Math.max(1, page - 1)">Prev</button>
                <span>Page {{ page }} of {{ pageMeta.last }}</span>
                <button type="button" :disabled="page >= pageMeta.last" @click="page = Math.min(pageMeta.last, page + 1)">Next</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="showForm" class="form-card">
          <h3>Add Record</h3>

          <div class="event-bar">
            <ion-select
              class="field grow"
              label="Calamity Type"
              label-placement="stacked"
              interface="popover"
              :value="form.calamity_type"
              placeholder="Select calamity type"
              @ionChange="(e: any) => form.calamity_type = e.detail.value"
            >
              <ion-select-option v-for="t in CALAMITY_TYPES" :key="t" :value="t">{{ t }}</ion-select-option>
            </ion-select>
            <ion-input
              v-if="form.calamity_type !== CALAMITY_TYPE_OTHER"
              class="field grow"
              label="Event Name (optional)"
              label-placement="stacked"
              placeholder="e.g. Typhoon Kristine"
              :value="form.calamity_event"
              @ionInput="(e: any) => form.calamity_event = e.detail.value"
            ></ion-input>
            <ion-input
              v-else
              class="field grow"
              label="Other Calamity Details"
              label-placement="stacked"
              placeholder="Describe the calamity"
              :value="form.calamity_other_detail"
              @ionInput="(e: any) => form.calamity_other_detail = e.detail.value"
            ></ion-input>
            <ion-input
              class="field"
              type="date"
              label="Date of Occurrence"
              label-placement="stacked"
              :value="form.calamity_date"
              @ionInput="(e: any) => form.calamity_date = e.detail.value"
            ></ion-input>
          </div>

          <div class="search-box">
            <ion-input
              class="field"
              label="Search Farmer (RSBSA / Name)"
              label-placement="stacked"
              :value="farmerSearch.query.value"
              :disabled="!canEncode"
              placeholder="Type to search…"
              @ionInput="(e: any) => farmerSearch.onQueryInput(e.detail.value || '')"
            ></ion-input>
            <div v-if="farmerSearch.searching.value" class="hint">Searching…</div>
            <ul v-if="farmerSearch.results.value.length" class="suggest">
              <li v-for="f in farmerSearch.results.value" :key="f.id" @click="onSelectFarmer(f)">
                <strong>{{ farmerDisplayName(f) }}</strong>
                <span>{{ f.rsbsa_no || 'No RSBSA' }} · {{ f.barangay }}</span>
              </li>
            </ul>
          </div>

          <div class="demo-grid" v-if="farmerSearch.selected.value">
            <div class="ro"><span class="lbl">RSBSA</span><span>{{ form.rsbsa_no }}</span></div>
            <div class="ro"><span class="lbl">Last Name</span><span>{{ form.surname }}</span></div>
            <div class="ro"><span class="lbl">First Name</span><span>{{ form.first_name }}</span></div>
            <div class="ro"><span class="lbl">Middle Name</span><span>{{ form.middle_name || '—' }}</span></div>
            <div class="ro"><span class="lbl">Ext</span><span>{{ form.ext_name || '—' }}</span></div>
            <div class="ro full"><span class="lbl">Farmer Address</span><span>{{ form.farmer_address }}</span></div>
          </div>

          <div class="input-grid">
            <ion-select
              class="field"
              label="Farm Location / Plot"
              label-placement="stacked"
              interface="popover"
              :interface-options="{ cssClass: 'encoding-select-popover' }"
              :value="form.plot_id"
              :disabled="!farmerSearch.selected.value"
              @ionChange="onPlotChange"
            >
              <ion-select-option value="">Select plot</ion-select-option>
              <ion-select-option
                v-for="p in farmerSearch.selected.value?.plots || []"
                :key="p.id"
                :value="p.id"
              >
                {{ p.location_brgy || 'Plot' }} · {{ p.commodity }} · {{ p.size_ha }} ha
              </ion-select-option>
            </ion-select>
            <ion-select
              class="field"
              label="Crop Type"
              label-placement="stacked"
              interface="popover"
              :value="form.crop_type"
              @ionChange="(e: any) => form.crop_type = e.detail.value"
            >
              <ion-select-option value="Rice">Rice</ion-select-option>
              <ion-select-option value="Corn">Corn</ion-select-option>
              <ion-select-option value="High-Value">High-Value</ion-select-option>
            </ion-select>
            <VarietyField v-model="form.variety" :crop="form.crop_type" select-class="field" />
            <ion-select
              class="field"
              label="Stage of Crop at Calamity"
              label-placement="stacked"
              interface="popover"
              :value="form.crop_stage"
              @ionChange="(e: any) => form.crop_stage = e.detail.value"
            >
              <ion-select-option value="Seedling">Seedling</ion-select-option>
              <ion-select-option value="Vegetative">Vegetative</ion-select-option>
              <ion-select-option value="Reproductive">Reproductive</ion-select-option>
              <ion-select-option value="Maturity">Maturity</ion-select-option>
            </ion-select>
            <ion-input class="field" type="number" label="Total Area Planted (ha)" label-placement="stacked" :value="form.area_planted" @ionInput="onAreaPlantedInput"></ion-input>
            <ion-input class="field" type="number" label="Area Damaged / Washed Out (ha)" label-placement="stacked" :value="form.area_damaged" @ionInput="onAreaDamagedInput"></ion-input>
            <ion-input
              class="field"
              type="number"
              label="Estimated Yield Loss (%)"
              label-placement="stacked"
              :value="form.est_yield_loss_pct"
              @ionInput="onYieldLossInput"
            ></ion-input>
            <p v-if="autoYieldHint" class="calc-hint">{{ autoYieldHint }}</p>
            <p v-if="harvestReadyHint" class="autofill-hint">{{ harvestReadyHint }}</p>
          </div>

          <ion-button expand="block" class="add-btn" :disabled="!canAdd" @click="addEntry">
            {{ saving ? 'Saving…' : 'Add to Ledger' }}
          </ion-button>
        </div>
      </div>

      <div v-if="!embedded" class="form-preview print-document print-only">
        <CalamityAssessmentPrint
          :rows="previewRows"
          :barangay="effectiveBarangay || ''"
          :event-name="previewEventName"
          :event-date="previewEventDate"
        />
      </div>
      <div v-if="viewingPhoto" class="photo-overlay no-print" @click.self="viewingPhoto = null">
        <div class="photo-modal">
          <button class="photo-close" @click="viewingPhoto = null">✕</button>
          <img :src="viewingPhoto" class="photo-full" alt="Evidence" />
        </div>
      </div>
    </component>

    <ReportInlineEditModal
      :is-open="editOpen"
      title="Edit calamity assessment"
      :endpoint="editEndpoint"
      :fields="calamityEditFields"
      :initial="editInitial"
      @close="editOpen = false"
      @saved="loadLedger"
    />

    <ConfirmDeleteModal
      :is-open="deleteOpen"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </component>
</template>

<script setup lang="ts">
import AppHeader from '@/components/Navigation/AppHeader.vue';
import { ref, reactive, computed, defineAsyncComponent, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonInput, IonSelect, IonSelectOption,
} from '@ionic/vue';
import FormExportActions from '@/components/FormExportActions.vue';
import { exportCalamityAssessmentExcel } from '@/utils/statutoryFormExcel';
import { useEncodingBarangay } from '@/composables/useEncodingBarangay';
import EncodingBarangaySelector from '@/components/EncodingBarangaySelector.vue';
import VarietyField from '@/components/VarietyField.vue';
import {
  useBarangayFarmerSearch,
  farmerDisplayName,
  type FarmerOption,
} from '@/composables/useBarangayFarmerSearch';
import { useActivePlanting, stageSelectValue, isHarvestReady } from '@/composables/useActivePlanting';
import apiClient from '@/utils/axios';
import { toast } from '@/utils/toast';
import { storageUrl } from '@/utils/storageUrl';
import {
  CALAMITY_TYPES,
  CALAMITY_TYPE_OTHER,
  buildCalamityName,
} from '@/constants/calamityTypes';
import ReportRowActions from '@/components/ReportRowActions.vue';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal.vue';
import ReportInlineEditModal, { type ReportEditField } from '@/components/ReportInlineEditModal.vue';
import { useReportRowActions } from '@/composables/useReportRowActions';
import '@/assets/reportTableStyles.css';

const CalamityAssessmentPrint = defineAsyncComponent(() => import('@/components/CalamityAssessmentPrint.vue'));

const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false });
const emit = defineEmits<{ saved: [] }>();

const route = useRoute();
const router = useRouter();
const viewMode = computed(() => (props.embedded || route.query.mode === 'entry' ? 'entry' : 'ledger'));
const showForm = computed(() => props.embedded || viewMode.value === 'entry');
const showLedger = computed(() => !props.embedded && viewMode.value === 'ledger');

function setViewMode(mode: 'ledger' | 'entry') {
  const query = { ...route.query } as Record<string, any>;
  if (mode === 'entry') query.mode = 'entry';
  else delete query.mode;
  void router.replace({ query });
}

interface CalamityEntry {
  id: string;
  status?: string;
  calamity_type?: string;
  calamity_event: string;
  calamity_date: string;
  rsbsa_no: string;
  surname: string;
  first_name: string;
  middle_name: string;
  ext_name: string;
  farm_location: string;
  crop_type: string;
  variety: string;
  crop_stage: string;
  area_planted: number;
  area_damaged: number;
  est_yield_loss_pct: number;
  photo_url?: string | null;
}

const {
  isAdminOverride,
  selectedBarangay,
  barangayOptions,
  loadingBarangays,
  effectiveBarangay,
  canEncode,
  payloadBarangayName,
} = useEncodingBarangay();
const farmerSearch = useBarangayFarmerSearch(() => effectiveBarangay.value, {
  commodity: () => form.crop_type,
});
const { fetchActivePlanting } = useActivePlanting();
const harvestReadyHint = ref('');

const entries = ref<CalamityEntry[]>([]);
const viewingPhoto = ref<string | null>(null);
const saving = ref(false);
const searchQuery = ref('');
const cropFilter = ref('');
const page = ref(1);
const pageMeta = reactive({ current: 1, last: 1, total: 0 });

const filteredEntries = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return entries.value.filter((e) => {
    if (cropFilter.value && e.crop_type !== cropFilter.value) return false;
    if (!q) return true;
    return `${e.rsbsa_no} ${e.surname} ${e.first_name} ${e.middle_name} ${e.ext_name} ${e.calamity_event}`.toLowerCase().includes(q);
  });
});

const previewRows = computed(() =>
  filteredEntries.value.map((e) => ({
    rsbsa_no: e.rsbsa_no,
    surname: e.surname,
    first_name: e.first_name,
    middle_name: e.middle_name,
    ext_name: e.ext_name,
    farm_location: e.farm_location,
    crop_type: e.crop_type,
    crop_stage: e.crop_stage,
    area_planted: Number(e.area_planted).toFixed(2),
    area_damaged: Number(e.area_damaged).toFixed(2),
    est_yield_loss_pct: e.est_yield_loss_pct,
  })),
);

const yieldLossManual = ref(false);

const form = reactive({
  calamity_type: '' as string,
  calamity_event: '',
  calamity_other_detail: '',
  calamity_date: '',
  farmer_id: '',
  rsbsa_no: '',
  surname: '',
  first_name: '',
  middle_name: '',
  ext_name: '',
  farmer_address: '',
  plot_id: '',
  farm_location: '',
  crop_type: 'Rice',
  variety: '',
  crop_stage: 'Vegetative',
  area_planted: '',
  area_damaged: '',
  est_yield_loss_pct: '',
});

const previewEventName = computed(() => {
  const first = filteredEntries.value[0] || entries.value[0];
  if (first?.calamity_event) return first.calamity_event;
  return buildCalamityName(form.calamity_type, form.calamity_event, form.calamity_other_detail);
});
const previewEventDate = computed(() => filteredEntries.value[0]?.calamity_date || entries.value[0]?.calamity_date || form.calamity_date || '');

const computedYieldLoss = computed(() => {
  const planted = Number(form.area_planted);
  const damaged = Number(form.area_damaged);
  if (!planted || planted <= 0 || Number.isNaN(damaged)) return '';
  const pct = Math.min(100, (damaged / planted) * 100);
  return (Math.round(pct * 10) / 10).toFixed(1);
});

const autoYieldHint = computed(() => {
  if (!computedYieldLoss.value) return '';
  return yieldLossManual.value
    ? 'Yield loss manually overridden.'
    : `Auto-calculated from area damaged ÷ area planted (${computedYieldLoss.value}%).`;
});

const canAdd = computed(() => {
  const typeOk = !!form.calamity_type;
  const otherOk = form.calamity_type !== CALAMITY_TYPE_OTHER || !!form.calamity_other_detail.trim();
  return canEncode.value
    && typeOk
    && otherOk
    && !!form.calamity_date
    && !!form.farmer_id
    && !!form.plot_id
    && !!form.variety.trim()
    && !!form.area_planted
    && !!form.area_damaged
    && form.est_yield_loss_pct !== ''
    && !saving.value;
});

const calamityNameForSubmit = () =>
  buildCalamityName(form.calamity_type, form.calamity_event, form.calamity_other_detail);

const loadLedger = async () => {
  if (!effectiveBarangay.value) {
    entries.value = [];
    pageMeta.current = 1;
    pageMeta.last = 1;
    pageMeta.total = 0;
    return;
  }
  try {
    const res = await apiClient.get('/damage-assessments', {
      params: { per_page: 200, page: page.value, barangay: effectiveBarangay.value, status: 'Pending' },
    });
    const paginator = res.data?.data ?? {};
    const rows = paginator.data ?? [];
    pageMeta.current = Number(paginator.current_page) || 1;
    pageMeta.last = Number(paginator.last_page) || 1;
    pageMeta.total = Number(paginator.total) || rows.length;
    entries.value = rows.map((r: any) => {
      const farmer = r.farmer || {};
      return {
        id: r.id,
        status: r.status || 'Pending',
        calamity_type: r.calamity_type || '',
        calamity_event: r.calamity_name || r.calamity_type || '',
        calamity_date: r.date_of_calamity?.slice?.(0, 10) || r.date_of_calamity || '',
        rsbsa_no: farmer.rsbsa_no || '',
        surname: farmer.surname || '',
        first_name: farmer.first_name || '',
        middle_name: farmer.middle_name || '',
        ext_name: farmer.ext_name || '',
        farm_location: r.farm_plot?.location_brgy || farmer.permanent_brgy || '',
        crop_type: r.farm_plot?.commodity || '',
        variety: r.variety || '',
        crop_stage: r.crop_stage || '',
        area_planted: Number(r.area_planted_ha ?? r.farm_plot?.size_ha) || 0,
        area_damaged: Number(r.area_destroyed_ha) || 0,
        est_yield_loss_pct: Number(r.damage_percentage) || 0,
        photo_url: storageUrl(r.photo_url || r.photo_evidence_path || r.photo_path),
      } as CalamityEntry;
    });
  } catch {
    entries.value = [];
  }
};

const totalDamaged = computed(() =>
  filteredEntries.value.reduce((s, e) => s + Number(e.area_damaged || 0), 0)
);

function recalcYieldLoss() {
  if (!yieldLossManual.value && computedYieldLoss.value) {
    form.est_yield_loss_pct = computedYieldLoss.value;
  }
}

const onAreaPlantedInput = (e: CustomEvent) => {
  form.area_planted = e.detail.value ?? '';
  recalcYieldLoss();
};

const onAreaDamagedInput = (e: CustomEvent) => {
  const raw = e.detail.value ?? '';
  const plot = farmerSearch.selected.value?.plots.find((x) => x.id === form.plot_id);
  const planted = Number(form.area_planted) || 0;
  const plotHa = Number(plot?.size_ha) || 0;
  const cap = Math.min(
    plotHa > 0 ? plotHa : Number.POSITIVE_INFINITY,
    planted > 0 ? planted : Number.POSITIVE_INFINITY,
  );
  let next = raw;
  const n = Number(raw);
  if (!Number.isNaN(n) && Number.isFinite(cap) && n > cap) {
    next = String(cap);
  }
  form.area_damaged = next;
  recalcYieldLoss();
};

const onYieldLossInput = (e: CustomEvent) => {
  form.est_yield_loss_pct = e.detail.value ?? '';
  yieldLossManual.value = true;
  const planted = Number(form.area_planted);
  const pct = Number(form.est_yield_loss_pct);
  if (planted > 0 && !Number.isNaN(pct)) {
    const plot = farmerSearch.selected.value?.plots.find((x) => x.id === form.plot_id);
    const plotHa = Number(plot?.size_ha) || 0;
    const ha = Math.round((planted * pct / 100) * 10000) / 10000;
    const cap = plotHa > 0 ? Math.min(planted, plotHa) : planted;
    form.area_damaged = String(Math.min(ha, cap));
  }
};

const onSelectFarmer = async (f: FarmerOption) => {
  await farmerSearch.selectFarmer(f);
  const sel = farmerSearch.selected.value;
  if (!sel) return;
  form.farmer_id = sel.id;
  form.rsbsa_no = sel.rsbsa_no;
  form.surname = sel.surname;
  form.first_name = sel.first_name;
  form.middle_name = sel.middle_name;
  form.ext_name = sel.ext_name;
  form.farmer_address = sel.address;
  form.plot_id = '';
  form.farm_location = sel.barangay;
  form.area_planted = '';
  form.area_damaged = '';
  form.variety = '';
  yieldLossManual.value = false;
  form.est_yield_loss_pct = '';
  if (sel.plots.length === 1) {
    const p = sel.plots[0];
    form.plot_id = p.id;
    form.farm_location = p.location_brgy || sel.barangay;
    form.area_planted = String(p.size_ha || '');
    if (['Rice', 'Corn'].includes(p.commodity)) form.crop_type = p.commodity;
    recalcYieldLoss();
  }
  await applyPlantingAutofill();
};

const onPlotChange = async (e: CustomEvent) => {
  form.plot_id = String(e.detail.value);
  const p = farmerSearch.selected.value?.plots.find((x) => x.id === form.plot_id);
  if (p) {
    form.farm_location = p.location_brgy || form.farm_location;
    form.area_planted = String(p.size_ha || form.area_planted);
    if (['Rice', 'Corn'].includes(p.commodity)) form.crop_type = p.commodity;
    recalcYieldLoss();
  }
  await applyPlantingAutofill();
};

const applyPlantingAutofill = async () => {
  harvestReadyHint.value = '';
  if (!form.farmer_id) return;
  const planting = await fetchActivePlanting(form.farmer_id, {
    farmPlotId: form.plot_id || undefined,
    commodity: form.crop_type,
  });
  if (!planting) return;
  if (planting.commodity && ['Rice', 'Corn'].includes(planting.commodity)) {
    form.crop_type = planting.commodity;
  }
  if (!form.variety.trim() && planting.variety) form.variety = planting.variety;
  if (planting.computed_stage) {
    form.crop_stage = stageSelectValue(planting.computed_stage);
  }
  if (planting.area_planted_ha != null && planting.area_planted_ha > 0) {
    form.area_planted = String(planting.area_planted_ha);
    const damaged = Number(form.area_damaged);
    if (!Number.isNaN(damaged) && damaged > planting.area_planted_ha) {
      form.area_damaged = String(planting.area_planted_ha);
    }
    recalcYieldLoss();
  }
  if (isHarvestReady(planting.computed_stage)) {
    harvestReadyHint.value = 'Active planting is ready for harvest.';
  }
};

const resetFarmerForm = () => {
  farmerSearch.clearSelection();
  harvestReadyHint.value = '';
  form.farmer_id = '';
  form.rsbsa_no = '';
  form.surname = '';
  form.first_name = '';
  form.middle_name = '';
  form.ext_name = '';
  form.farmer_address = '';
  form.plot_id = '';
  form.farm_location = '';
  form.variety = '';
  form.area_planted = '';
  form.area_damaged = '';
  form.est_yield_loss_pct = '';
  yieldLossManual.value = false;
};

const onTargetBarangayChange = () => {
  resetFarmerForm();
  void loadLedger();
};

const addEntry = async () => {
  if (!canAdd.value) return;
  saving.value = true;
  const id = crypto.randomUUID();
  try {
    await apiClient.post('/damage-assessments', {
      id,
      farm_plot_id: form.plot_id,
      farmer_id: form.farmer_id,
      calamity_type: form.calamity_type,
      calamity_name: calamityNameForSubmit(),
      crop_stage: form.crop_stage,
      variety: form.variety.trim(),
      area_destroyed_ha: Number(form.area_damaged),
      area_planted_ha: Number(form.area_planted),
      date_of_calamity: form.calamity_date,
      damage_percentage: Number(form.est_yield_loss_pct),
      barangay_name: payloadBarangayName(),
    });

    entries.value.unshift({
      id,
      calamity_event: calamityNameForSubmit(),
      calamity_date: form.calamity_date,
      rsbsa_no: form.rsbsa_no,
      surname: form.surname,
      first_name: form.first_name,
      middle_name: form.middle_name,
      ext_name: form.ext_name,
      farm_location: form.farm_location,
      crop_type: form.crop_type,
      variety: form.variety.trim(),
      crop_stage: form.crop_stage,
      area_planted: Number(form.area_planted),
      area_damaged: Number(form.area_damaged),
      est_yield_loss_pct: Number(form.est_yield_loss_pct),
    });
    resetFarmerForm();
    await toast.success('Calamity assessment saved.', 1800);
    emit('saved');
    if (!props.embedded) setViewMode('ledger');
  } catch (e: any) {
    await toast.error(e?.response?.data?.message || 'Failed to save calamity assessment. Select a farm plot.');
  } finally {
    saving.value = false;
  }
};

const removeEntry = async (i: number) => {
  const row = entries.value[i];
  if (!row?.id) {
    entries.value.splice(i, 1);
    return;
  }
  promptDelete({
    endpoint: `/damage-assessments/${row.id}`,
    label: 'Calamity assessment',
    onSuccess: loadLedger,
  });
};

const { deleteOpen, promptDelete, cancelDelete, confirmDelete } = useReportRowActions();
const editOpen = ref(false);
const editEndpoint = ref('');
const editInitial = ref<Record<string, string | number | null | undefined>>({});
const calamityEditFields: ReportEditField[] = [
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

function openEdit(entry: CalamityEntry) {
  if (!entry.id) return;
  editEndpoint.value = `/damage-assessments/${entry.id}`;
  const type = entry.calamity_type || '';
  const event = entry.calamity_event || '';
  const eventName = type === CALAMITY_TYPE_OTHER
    ? event
    : (event && event !== type ? event : '');
  editInitial.value = {
    calamity_type: type || event,
    calamity_name: eventName,
    area_destroyed_ha: entry.area_damaged,
    damage_percentage: entry.est_yield_loss_pct,
    date_of_calamity: entry.calamity_date,
  };
  editOpen.value = true;
}

const printForm = () => {
  window.print();
};

const downloadExcel = async () => {
  await exportCalamityAssessmentExcel({
    rows: previewRows.value,
    barangay: effectiveBarangay.value || '',
    eventName: previewEventName.value,
    eventDate: previewEventDate.value,
  });
};

onMounted(() => {
  void loadLedger();
});

watch(page, () => {
  void loadLedger();
});

watch(viewMode, (mode) => {
  if (!props.embedded && mode === 'ledger') void loadLedger();
});
</script>

<style scoped>
.page-bg { --background: #f4f8f5; }
.wrapper { max-width: 1200px; margin: 0 auto; padding-bottom: 2rem; }
.embedded-encode-body { padding-bottom: 2rem; }
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
  margin-bottom: 1rem;
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
.export-btn { --background: #d4af37; --color: #1a4731; font-weight: 700; text-transform: none; }

.warn-banner {
  background: #fff8e1; color: #92400e; border: 1px solid #fcd34d;
  border-radius: 10px; padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 0.88rem;
}
.event-bar, .input-grid, .demo-grid { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.event-bar { margin-bottom: 0.75rem; }
.field {
  flex: 1; min-width: 140px;
  --background: #ffffff;
  --color: #0f172a;
  --placeholder-color: #64748b;
  border: 1.5px solid #94a3b8;
  border-radius: 8px;
  padding: 0 10px;
  background: #ffffff;
  color: #0f172a;
}
.field.grow { flex: 2; min-width: 200px; }

.form-card {
  background: white; border: 1px solid #e2e8f0; border-radius: 12px;
  padding: 1rem; margin-bottom: 1rem;
}
.form-card h3 { margin: 0 0 0.75rem; color: #1a4731; font-weight: 800; }
.preview-section { margin-bottom: 0.75rem; }
.preview-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.5rem;
}
.preview-meta h3 { margin: 0; color: #1a4731; font-weight: 800; font-size: 1rem; }
.preview-count { font-size: 0.85rem; color: #64748b; }
.entry-actions {
  list-style: none; margin: 0 0 0.75rem; padding: 0; background: #fff;
  border: 1px solid #e2e8f0; border-radius: 10px; max-height: 180px; overflow: auto;
}
.entry-actions li {
  display: flex; align-items: center; justify-content: space-between;
  gap: 0.5rem; padding: 0.35rem 0.65rem; border-bottom: 1px solid #f1f5f9; font-size: 0.88rem;
}
.entry-actions li:last-child { border-bottom: none; }
.ledger-thumb {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid #e2e8f0;
  flex-shrink: 0;
}
.photo-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.72);
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}
.photo-modal { position: relative; max-width: min(90vw, 720px); }
.photo-full { width: 100%; border-radius: 10px; }
.photo-close {
  position: absolute;
  top: -12px;
  right: -12px;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 999px;
  background: #fff;
  cursor: pointer;
  font-weight: 800;
}
.search-box { position: relative; margin-bottom: 0.75rem; }
.hint { font-size: 0.8rem; color: #94a3b8; margin-top: 4px; }
.autofill-hint {
  flex: 1 1 100%;
  font-size: 0.8rem;
  color: #166534;
  margin: 0;
}
.calc-hint {
  flex: 1 1 100%;
  margin: 0;
  font-size: 0.78rem;
  color: #64748b;
  font-style: italic;
}
.suggest {
  list-style: none; margin: 4px 0 0; padding: 0; border: 1px solid #e2e8f0;
  border-radius: 8px; background: white; max-height: 280px; overflow: auto; z-index: 20;
  position: absolute; left: 0; right: 0; width: 100%; min-width: 100%;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
}
.suggest li {
  padding: 0.6rem 0.85rem; cursor: pointer; display: flex; flex-direction: column; gap: 2px;
  border-bottom: 1px solid #f1f5f9;
  white-space: normal; overflow: visible; text-overflow: unset;
}
.suggest li:hover { background: #e8f5e9; }
.suggest li strong { white-space: normal; overflow: visible; font-size: 0.9rem; color: #0f172a; }
.suggest li span { font-size: 0.78rem; color: #64748b; white-space: normal; overflow: visible; }

.demo-grid { margin-bottom: 0.75rem; }
.ro {
  flex: 1; min-width: 140px; background: #f8fafc; border: 1px solid #e2e8f0;
  border-radius: 8px; padding: 0.5rem 0.65rem;
}
.ro.full { flex: 1 1 100%; }
.lbl { display: block; font-size: 0.68rem; color: #64748b; text-transform: uppercase; font-weight: 700; }
.add-btn { --background: #1a4731; margin-top: 0.85rem; text-transform: none; font-weight: 700; }
</style>
