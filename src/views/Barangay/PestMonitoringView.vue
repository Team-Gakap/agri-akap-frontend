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
              <select class="filter-select" :value="cropFilter" @change="onCropFilterChange">
                <option value="">All Crops</option>
                <option value="Corn">Corn</option>
                <option value="Rice">Rice</option>
              </select>
            </div>
          </div>

          <div class="ledger-card">
            <div class="ledger-toolbar">
              <div class="ledger-meta">
                <h3>Registered records</h3>
                <span class="ledger-count">{{ filteredEntries.length }} inspection(s) · {{ totalPlantedHa.toFixed(2) }} ha</span>
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
                    <th>B-DAY</th>
                    <th>FARMER ADDRESS</th>
                    <th>FARM LOCATION</th>
                    <th>AREA PLANTED</th>
                    <th>DAYS AFTER PLANTING</th>
                    <th>VARIETY</th>
                    <th>AREA DAMAGE (%)</th>
                    <th>PEST</th>
                    <th>DISEASE</th>
                    <th class="no-print">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!filteredEntries.length">
                    <td colspan="16" class="empty-row">No pest records match the current filters.</td>
                  </tr>
                  <tr v-for="(e, i) in filteredEntries" :key="e.id">
                    <td class="col-no">{{ i + 1 }}</td>
                    <td class="mono">{{ e.rsbsa_no }}</td>
                    <td>{{ e.surname }}</td>
                    <td>{{ e.first_name }}</td>
                    <td>{{ e.middle_name }}</td>
                    <td>{{ e.ext_name }}</td>
                    <td>{{ e.birthdate_display }}</td>
                    <td>{{ e.farmer_address }}</td>
                    <td>{{ e.farm_location }}</td>
                    <td class="col-num">{{ Number(e.area_planted).toFixed(2) }}</td>
                    <td class="col-num">{{ e.days_after_planting }}</td>
                    <td>{{ e.variety }}</td>
                    <td class="col-num">{{ e.area_damage_pct }}</td>
                    <td>{{ splitDamageBy(e.damage_by, e.crop || crop).pest || '—' }}</td>
                    <td>{{ splitDamageBy(e.damage_by, e.crop || crop).disease || '—' }}</td>
                    <td class="no-print">
                      <img
                        v-if="e.photo_url"
                        :src="e.photo_url"
                        class="ledger-thumb"
                        alt="Evidence"
                        @click="viewingPhoto = e.photo_url!"
                      />
                      <ReportRowActions
                        :can-edit="isPestPending(e)"
                        :can-remove="isPestPending(e)"
                        @edit="openEdit(e)"
                        @remove="promptDelete({ endpoint: `/pest-monitoring/${e.id}`, label: 'Pest inspection', onSuccess: loadLedger })"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="ledger-footer">
              <span>{{ pageMeta.total }} total · {{ totalPlantedHa.toFixed(2) }} ha on this view</span>
              <div v-if="pageMeta.last > 1" class="pager">
                <button type="button" :disabled="page <= 1" @click="page = Math.max(1, page - 1)">Prev</button>
                <span>Page {{ page }} of {{ pageMeta.last }}</span>
                <button type="button" :disabled="page >= pageMeta.last" @click="page = Math.min(pageMeta.last, page + 1)">Next</button>
              </div>
            </div>
          </div>
        </div>

        <ion-select
          v-if="showForm"
          class="field crop-field"
          label="Crop Type"
          label-placement="stacked"
          interface="popover"
          :value="crop"
          @ionChange="onCropChange"
        >
          <ion-select-option value="Corn">Corn</ion-select-option>
          <ion-select-option value="Rice">Rice</ion-select-option>
        </ion-select>

        <div v-if="showForm" class="form-card">
          <h3>Add Report — {{ crop }}</h3>
          <p class="crop-hint">Only farmers with a {{ crop }} farm plot can be added on this form. Choose pest, disease, or both.</p>

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
            <div class="ro"><span class="lbl">Birthday</span><span>{{ form.birthdate_display || '—' }}</span></div>
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
              :disabled="!farmerSearch.selected.value || !matchingPlots.length"
              @ionChange="onPlotChange"
            >
              <ion-select-option value="">Select {{ crop }} plot</ion-select-option>
              <ion-select-option
                v-for="p in matchingPlots"
                :key="p.id"
                :value="p.id"
              >
                {{ p.location_brgy || 'Plot' }} · {{ p.commodity }} · {{ p.size_ha }} ha
              </ion-select-option>
            </ion-select>
            <ion-input class="field" type="number" label="Area Planted (ha)" label-placement="stacked" :value="form.area_planted" @ionInput="onAreaPlantedInput"></ion-input>
            <VarietyField v-model="form.variety" :crop="crop" select-class="field" />
            <ion-select
              class="field"
              label="Crop Stage"
              label-placement="stacked"
              interface="popover"
              :value="form.crop_stage"
              @ionChange="(e: any) => form.crop_stage = e.detail.value"
            >
              <ion-select-option value="">Select stage</ion-select-option>
              <ion-select-option value="Seedling">Seedling</ion-select-option>
              <ion-select-option value="Vegetative">Vegetative</ion-select-option>
              <ion-select-option value="Reproductive">Reproductive</ion-select-option>
              <ion-select-option value="Maturity">Maturity</ion-select-option>
            </ion-select>
            <ion-input class="field" type="number" label="Days After Planting" label-placement="stacked" :value="form.days_after_planting" @ionInput="(e: any) => form.days_after_planting = e.detail.value"></ion-input>
            <ion-input class="field" type="number" label="Area Damaged (%)" label-placement="stacked" :value="form.area_damage_pct" @ionInput="onDamagePctInput"></ion-input>
            <ion-input class="field" type="number" label="Area Affected (ha)" label-placement="stacked" :value="form.area_affected_ha" readonly></ion-input>
            <ion-select
              class="field"
              label="Pest"
              label-placement="stacked"
              interface="action-sheet"
              :value="form.pest"
              @ionChange="(e: any) => onPestChange(e.detail.value)"
            >
              <ion-select-option value="">Select pest</ion-select-option>
              <ion-select-option v-for="p in pestOptions" :key="'p-'+p" :value="p">{{ p }}</ion-select-option>
            </ion-select>
            <ion-select
              class="field"
              label="Disease"
              label-placement="stacked"
              interface="action-sheet"
              :value="form.disease"
              @ionChange="(e: any) => onDiseaseChange(e.detail.value)"
            >
              <ion-select-option value="">Select disease</ion-select-option>
              <ion-select-option v-for="d in diseaseOptions" :key="'d-'+d" :value="d">{{ d }}</ion-select-option>
            </ion-select>
            <ion-input class="field" type="date" label="Date of Inspection" label-placement="stacked" :value="form.date_of_inspection" @ionInput="(e: any) => form.date_of_inspection = e.detail.value"></ion-input>
            <ion-item class="field outbreak-item" lines="none">
              <ion-toggle
                :checked="form.is_outbreak"
                @ionChange="(e: CustomEvent) => form.is_outbreak = !!e.detail.checked"
              >Flag as potential outbreak</ion-toggle>
            </ion-item>
          </div>
          <p v-if="harvestReadyHint" class="autofill-hint">{{ harvestReadyHint }}</p>

          <ion-button expand="block" class="add-btn" :disabled="!canAdd" @click="addEntry">
            {{ saving ? 'Saving…' : 'Add to Ledger' }}
          </ion-button>
        </div>

      </div>

      <div v-if="!embedded" class="form-preview print-document print-only">
        <PestMonitoringPrint
          :rows="previewRows"
          :barangay="effectiveBarangay || ''"
          :crop="crop"
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
      title="Edit pest inspection"
      :endpoint="editEndpoint"
      :fields="pestEditFields"
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
  IonButton, IonIcon, IonInput, IonSelect, IonSelectOption, IonItem, IonToggle,
} from '@ionic/vue';
import FormExportActions from '@/components/FormExportActions.vue';
import { exportPestMonitoringExcel } from '@/utils/statutoryFormExcel';
import { useEncodingBarangay } from '@/composables/useEncodingBarangay';
import EncodingBarangaySelector from '@/components/EncodingBarangaySelector.vue';
import VarietyField from '@/components/VarietyField.vue';
import {
  useBarangayFarmerSearch,
  formatBirthday,
  farmerDisplayName,
  type FarmerOption,
} from '@/composables/useBarangayFarmerSearch';
import { useActivePlanting, stageSelectValue, isHarvestReady } from '@/composables/useActivePlanting';
import apiClient from '@/utils/axios';
import { toast } from '@/utils/toast';
import { capInputToPlot, plotSizeHa } from '@/utils/plotArea';
import { loadPestCatalog, threatsForCrop, splitDamageBy } from '@/utils/pestCatalog';
import { storageUrl } from '@/utils/storageUrl';
import ReportRowActions from '@/components/ReportRowActions.vue';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal.vue';
import ReportInlineEditModal, { type ReportEditField } from '@/components/ReportInlineEditModal.vue';
import { useReportRowActions } from '@/composables/useReportRowActions';
import '@/assets/reportTableStyles.css';
const PestMonitoringPrint = defineAsyncComponent(() => import('@/components/PestMonitoringPrint.vue'));

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

interface PestEntry {
  id: string;
  farmer_id?: string;
  plot_id?: string;
  rsbsa_no: string;
  surname: string;
  first_name: string;
  middle_name: string;
  ext_name: string;
  birthdate_display: string;
  farmer_address: string;
  farm_location: string;
  area_planted: number;
  variety: string;
  days_after_planting: number;
  area_damage_pct: number;
  damage_by: string;
  date_of_inspection: string;
  photo_url?: string | null;
  latitude?: number | null;
  crop?: string;
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
const crop = ref('Corn');
const cropFilter = ref('');
const farmerSearch = useBarangayFarmerSearch(() => effectiveBarangay.value, {
  commodity: () => crop.value,
});
const { fetchActivePlanting } = useActivePlanting();
const harvestReadyHint = ref('');

const entries = ref<PestEntry[]>([]);
const viewingPhoto = ref<string | null>(null);
const searchQuery = ref('');
const page = ref(1);
const pageMeta = reactive({ current: 1, last: 1, total: 0 });

const filteredEntries = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return entries.value;
  return entries.value.filter((e) =>
    `${e.rsbsa_no} ${e.surname} ${e.first_name} ${e.middle_name} ${e.ext_name}`.toLowerCase().includes(q)
  );
});

const totalPlantedHa = computed(() =>
  filteredEntries.value.reduce((s, e) => s + Number(e.area_planted || 0), 0)
);

const previewRows = computed(() =>
  filteredEntries.value.map((e) => {
    const parts = splitDamageBy(e.damage_by, e.crop || crop.value);
    return {
      rsbsa_no: e.rsbsa_no,
      surname: e.surname,
      first_name: e.first_name,
      middle_name: e.middle_name,
      ext_name: e.ext_name,
      birthdate: e.birthdate_display,
      farmer_address: e.farmer_address,
      farm_location: e.farm_location,
      area_planted: Number(e.area_planted).toFixed(2),
      days_after_planting: e.days_after_planting,
      variety: e.variety,
      area_damage_pct: e.area_damage_pct,
      pest: parts.pest,
      disease: parts.disease,
      damage_by: e.damage_by,
    };
  }),
);
const saving = ref(false);

const form = reactive({
  farmer_id: '',
  rsbsa_no: '',
  surname: '',
  first_name: '',
  middle_name: '',
  ext_name: '',
  birthdate: '',
  birthdate_display: '',
  farmer_address: '',
  plot_id: '',
  farm_location: '',
  area_planted: '',
  variety: '',
  crop_stage: '',
  days_after_planting: '',
  area_damage_pct: '',
  area_affected_ha: '',
  pest: '',
  disease: '',
  damage_by: '',
  date_of_inspection: '',
  is_outbreak: false,
});

const matchingPlots = computed(() => farmerSearch.plotsForCommodity(crop.value));
const pestOptions = computed(() => threatsForCrop(crop.value).pests);
const diseaseOptions = computed(() => threatsForCrop(crop.value).diseases);
const syncDamageBy = () => {
  form.damage_by = [form.pest, form.disease].filter(Boolean).join(' / ');
};
const onPestChange = (value: string) => {
  form.pest = value || '';
  syncDamageBy();
};
const onDiseaseChange = (value: string) => {
  form.disease = value || '';
  syncDamageBy();
};
const selectedPlotSize = computed(() =>
  plotSizeHa(matchingPlots.value.find((p) => p.id === form.plot_id))
);
const syncAffectedHa = () => {
  const planted = Number(form.area_planted) || 0;
  const pct = Number(form.area_damage_pct) || 0;
  const raw = planted * (pct / 100);
  const cap = selectedPlotSize.value > 0 ? Math.min(planted || selectedPlotSize.value, selectedPlotSize.value) : planted;
  const ha = cap > 0 ? Math.min(raw, cap) : raw;
  form.area_affected_ha = planted > 0 ? String(Number(ha.toFixed(4))) : '';
};
const onAreaPlantedInput = (e: any) => {
  form.area_planted = capInputToPlot(e.detail.value, selectedPlotSize.value);
  syncAffectedHa();
};
const onDamagePctInput = (e: any) => {
  const raw = e.detail.value ?? '';
  const n = Number(raw);
  form.area_damage_pct = !Number.isNaN(n) && n > 100 ? '100' : raw;
  syncAffectedHa();
};

const canAdd = computed(() =>
  canEncode.value
  && !!form.farmer_id
  && !!form.plot_id
  && !!form.area_planted
  && !!form.days_after_planting
  && form.area_damage_pct !== ''
  && (!!form.pest || !!form.disease)
  && !!form.date_of_inspection
  && !saving.value
);

const mapFarmerAddress = (f: any) =>
  [f?.permanent_house_no, f?.permanent_street, f?.permanent_brgy, f?.permanent_city, f?.permanent_province]
    .filter(Boolean)
    .join(', ') || f?.permanent_brgy || '';

const loadLedger = async () => {
  if (!effectiveBarangay.value) {
    entries.value = [];
    pageMeta.current = 1;
    pageMeta.last = 1;
    pageMeta.total = 0;
    return;
  }
  try {
    const res = await apiClient.get('/pest-monitoring', {
      params: {
        per_page: 200,
        page: page.value,
        crop_type: cropFilter.value || undefined,
        barangay: effectiveBarangay.value,
      },
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
        farmer_id: r.farmer_id,
        plot_id: r.farm_plot_id || '',
        rsbsa_no: farmer.rsbsa_no || '',
        surname: farmer.surname || '',
        first_name: farmer.first_name || '',
        middle_name: farmer.middle_name || '',
        ext_name: farmer.ext_name || '',
        birthdate_display: formatBirthday(farmer.birthdate || ''),
        farmer_address: mapFarmerAddress(farmer),
        farm_location: r.farm_location || r.farm_plot?.location_brgy || farmer.permanent_brgy || '',
        area_planted: Number(r.area_planted) || 0,
        variety: r.variety || '',
        days_after_planting: Number(r.days_after_planting) || 0,
        area_damage_pct: Number(r.area_damage_pct ?? r.incidence) || 0,
        damage_by: r.pest_name || '',
        date_of_inspection: r.date_of_inspection?.slice?.(0, 10) || r.date_of_inspection || '',
        photo_url: storageUrl(r.photo_url || r.photo_path),
        latitude: r.latitude != null ? Number(r.latitude) : null,
        crop: r.crop || '',
      } as PestEntry;
    });
  } catch {
    entries.value = [];
  }
};

const onTargetBarangayChange = () => {
  resetForm();
  void loadLedger();
};

const onCropFilterChange = (e: Event) => {
  cropFilter.value = (e.target as HTMLSelectElement).value;
  page.value = 1;
  void loadLedger();
};

const onCropChange = async (e: any) => {
  crop.value = e.detail.value;
  resetForm();
};

const onSelectFarmer = async (f: FarmerOption) => {
  await farmerSearch.selectFarmer(f);
  const sel = farmerSearch.selected.value;
  if (!sel) return;

  const plots = farmerSearch.plotsForCommodity(crop.value);
  if (!plots.length) {
    farmerSearch.clearSelection();
    await toast.warning(`This farmer has no ${crop.value} plot. Switch Crop Type or choose another farmer.`);
    return;
  }

  form.farmer_id = sel.id;
  form.rsbsa_no = sel.rsbsa_no;
  form.surname = sel.surname;
  form.first_name = sel.first_name;
  form.middle_name = sel.middle_name;
  form.ext_name = sel.ext_name;
  form.birthdate = sel.birthdate;
  form.birthdate_display = formatBirthday(sel.birthdate);
  form.farmer_address = sel.address;
  form.plot_id = '';
  form.farm_location = sel.barangay;
  form.area_planted = '';
  form.variety = '';
  form.crop_stage = '';
  form.days_after_planting = '';
  if (plots.length === 1) {
    form.plot_id = plots[0].id;
    form.farm_location = plots[0].location_brgy || sel.barangay;
    form.area_planted = String(plots[0].size_ha || '');
  }
  syncAffectedHa();
  await applyPlantingAutofill();
};

const onPlotChange = async (e: any) => {
  form.plot_id = e.detail.value;
  const p = matchingPlots.value.find((x) => x.id === form.plot_id);
  if (p) {
    form.farm_location = p.location_brgy || form.farm_location;
    form.area_planted = String(p.size_ha || form.area_planted);
  }
  syncAffectedHa();
  await applyPlantingAutofill();
};

const applyPlantingAutofill = async () => {
  harvestReadyHint.value = '';
  if (!form.farmer_id) return;
  const planting = await fetchActivePlanting(form.farmer_id, {
    farmPlotId: form.plot_id || undefined,
    commodity: crop.value,
  });
  if (!planting) return;
  if (!form.variety.trim() && planting.variety) form.variety = planting.variety;
  if (planting.area_planted_ha != null && planting.area_planted_ha > 0) {
    form.area_planted = capInputToPlot(String(planting.area_planted_ha), selectedPlotSize.value);
  }
  if (planting.days_elapsed != null) {
    form.days_after_planting = String(planting.days_elapsed);
  }
  if (planting.computed_stage) {
    form.crop_stage = stageSelectValue(planting.computed_stage);
  }
  if (isHarvestReady(planting.computed_stage)) {
    harvestReadyHint.value = 'Active planting is ready for harvest.';
  }
  syncAffectedHa();
};

const resetForm = () => {
  farmerSearch.clearSelection();
  harvestReadyHint.value = '';
  form.farmer_id = '';
  form.rsbsa_no = '';
  form.surname = '';
  form.first_name = '';
  form.middle_name = '';
  form.ext_name = '';
  form.birthdate = '';
  form.birthdate_display = '';
  form.farmer_address = '';
  form.plot_id = '';
  form.farm_location = '';
  form.area_planted = '';
  form.variety = '';
  form.crop_stage = '';
  form.days_after_planting = '';
  form.area_damage_pct = '';
  form.area_affected_ha = '';
  form.pest = '';
  form.disease = '';
  form.damage_by = '';
  form.date_of_inspection = '';
  form.is_outbreak = false;
};

const addEntry = async () => {
  if (!canAdd.value) return;
  const plotOk = matchingPlots.value.some((p) => p.id === form.plot_id);
  if (!plotOk) {
    await toast.warning(`Select a ${crop.value} farm plot before encoding.`);
    return;
  }
  saving.value = true;
  const id = crypto.randomUUID();
  try {
    await apiClient.post('/pest-monitoring', {
      id,
      farmer_id: form.farmer_id,
      farm_plot_id: form.plot_id || undefined,
      crop: crop.value,
      variety: form.variety || undefined,
      crop_stage: form.crop_stage || undefined,
      area_planted: Number(form.area_planted),
      days_after_planting: Number(form.days_after_planting),
      area_damage_pct: Number(form.area_damage_pct),
      damage_by: form.damage_by,
      date_of_inspection: form.date_of_inspection,
      farm_location: form.farm_location,
      barangay_name: payloadBarangayName(),
      is_outbreak: form.is_outbreak,
    });

    entries.value.unshift({
      id,
      farmer_id: form.farmer_id,
      plot_id: form.plot_id,
      rsbsa_no: form.rsbsa_no,
      surname: form.surname,
      first_name: form.first_name,
      middle_name: form.middle_name,
      ext_name: form.ext_name,
      birthdate_display: form.birthdate_display,
      farmer_address: form.farmer_address,
      farm_location: form.farm_location,
      area_planted: Number(form.area_planted),
      variety: form.variety,
      days_after_planting: Number(form.days_after_planting),
      area_damage_pct: Number(form.area_damage_pct),
      damage_by: form.damage_by,
      date_of_inspection: form.date_of_inspection,
    });
    resetForm();
    await toast.success('Pest inspection saved.', 1800);
    emit('saved');
    if (!props.embedded) setViewMode('ledger');
  } catch (e: any) {
    await toast.error(e?.response?.data?.message || 'Failed to save pest inspection.');
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
    endpoint: `/pest-monitoring/${row.id}`,
    label: 'Pest inspection',
    onSuccess: loadLedger,
  });
};

const { deleteOpen, promptDelete, cancelDelete, confirmDelete } = useReportRowActions();
const editOpen = ref(false);
const editEndpoint = ref('');
const editInitial = ref<Record<string, string | number | null | undefined>>({});
const pestEditFields = ref<ReportEditField[]>([]);

function isPestPending(entry: PestEntry): boolean {
  return !entry.photo_url || entry.latitude == null;
}

function openEdit(entry: PestEntry) {
  if (!entry.id || !isPestPending(entry)) return;
  const entryCrop = entry.crop || crop.value;
  const threats = threatsForCrop(entryCrop);
  const parts = splitDamageBy(entry.damage_by, entryCrop);
  editEndpoint.value = `/pest-monitoring/${entry.id}`;
  pestEditFields.value = [
    {
      key: 'pest',
      label: 'Pest',
      type: 'select',
      options: threats.pests,
      placeholder: 'Select pest',
      virtual: true,
    },
    {
      key: 'disease',
      label: 'Disease',
      type: 'select',
      options: threats.diseases,
      placeholder: 'Select disease',
      virtual: true,
    },
    { key: 'area_damage_pct', label: 'Area Damage (%)', type: 'number', required: true },
    { key: 'date_of_inspection', label: 'Date of Inspection', type: 'date', required: true },
    { key: 'variety', label: 'Variety', type: 'variety' },
  ];
  editInitial.value = {
    crop: entryCrop,
    crop_type: entryCrop,
    pest: parts.pest,
    disease: parts.disease,
    area_damage_pct: entry.area_damage_pct,
    date_of_inspection: entry.date_of_inspection,
    variety: entry.variety,
  };
  editOpen.value = true;
}

const printForm = () => {
  window.print();
};

const downloadExcel = async () => {
  await exportPestMonitoringExcel({
    rows: previewRows.value,
    barangay: effectiveBarangay.value || '',
    crop: cropFilter.value || 'All Crops',
  });
};

onMounted(async () => {
  await loadPestCatalog();
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
.crop-field { margin-bottom: 1rem; max-width: 240px; }
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
.outbreak-item { --background: #fff7ed; border: 1px solid #fdba74; grid-column: 1 / -1; }
.form-card {
  background: white; border: 1px solid #e2e8f0; border-radius: 12px;
  padding: 1rem; margin-bottom: 1rem;
}
.form-card h3 { margin: 0 0 0.75rem; color: #1a4731; font-weight: 800; }
.preview-section {
  margin-bottom: 0.75rem;
}
.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}
.preview-meta h3 {
  margin: 0;
  color: #1a4731;
  font-weight: 800;
  font-size: 1rem;
}
.preview-count {
  font-size: 0.85rem;
  color: #64748b;
}
.entry-actions {
  list-style: none;
  margin: 0 0 0.75rem;
  padding: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  max-height: 180px;
  overflow: auto;
}
.entry-actions li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.35rem 0.65rem;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.88rem;
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
.crop-hint { margin: -0.35rem 0 0.85rem; font-size: 0.82rem; color: #64748b; }
.search-box { position: relative; margin-bottom: 0.75rem; }
.hint { font-size: 0.8rem; color: #94a3b8; margin-top: 4px; }
.autofill-hint { font-size: 0.8rem; color: #166534; margin: 0.35rem 0 0; }
.suggest {
  list-style: none; margin: 4px 0 0; padding: 0; border: 1px solid #e2e8f0;
  border-radius: 8px; background: white; max-height: 280px; overflow: auto;
  position: absolute; left: 0; right: 0; width: 100%; min-width: 100%; z-index: 20;
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
.demo-grid, .input-grid { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.75rem; }
.ro {
  flex: 1; min-width: 140px; background: #f8fafc; border: 1px solid #e2e8f0;
  border-radius: 8px; padding: 0.5rem 0.65rem;
}
.ro.full { flex: 1 1 100%; }
.lbl { display: block; font-size: 0.68rem; color: #64748b; text-transform: uppercase; font-weight: 700; }
.add-btn { --background: #1a4731; text-transform: none; font-weight: 700; }
</style>
