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

        <div class="form-card">
          <h3>Add Record</h3>

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
            <VarietyField v-model="form.variety" :crop="form.crop_type" label="Seed Variety" select-class="field" />
            <ion-input class="field" type="number" label="Area (Hectares)" label-placement="stacked" :value="form.area_ha" @ionInput="onAreaHaInput"></ion-input>
            <ion-select
              class="field"
              label="Current Growth Stage"
              label-placement="stacked"
              interface="popover"
              :value="form.growth_stage"
              @ionChange="(e: any) => form.growth_stage = e.detail.value"
            >
              <ion-select-option value="Seedling">Seedling</ion-select-option>
              <ion-select-option value="Vegetative">Vegetative</ion-select-option>
              <ion-select-option value="Reproductive">Reproductive</ion-select-option>
              <ion-select-option value="Maturity">Maturity</ion-select-option>
            </ion-select>
            <ion-input class="field" type="date" label="Estimated Date of Harvest" label-placement="stacked" :value="form.est_harvest_date" @ionInput="(e: any) => form.est_harvest_date = e.detail.value"></ion-input>
          </div>
          <p v-if="harvestReadyHint" class="autofill-hint">{{ harvestReadyHint }}</p>

          <ion-button expand="block" class="add-btn" :disabled="!canAdd" @click="addEntry">
            {{ saving ? 'Saving…' : 'Add to Ledger' }}
          </ion-button>
        </div>

        <div v-if="!embedded" class="preview-section no-print">
          <div class="preview-toolbar">
            <div class="preview-meta">
              <h3>Form Preview</h3>
              <span class="preview-count">{{ entries.length }} entry(ies) · {{ totalHa.toFixed(2) }} ha standing</span>
            </div>
            <FormExportActions @print="printForm" @excel="downloadExcel" />
          </div>
          <ul v-if="entries.length" class="entry-actions">
            <li v-for="(e, i) in entries" :key="e.id">
              <span>{{ i + 1 }}. {{ e.surname }}, {{ e.first_name }} — {{ e.crop_type }}</span>
              <ReportRowActions
                :can-edit="false"
                @remove="promptDelete({ endpoint: `/standing-crop-logs/${e.id}`, label: 'Standing crop entry', onSuccess: async () => { entries.splice(i, 1); } })"
              />
            </li>
          </ul>
        </div>
      </div>

      <div v-if="!embedded" class="form-preview print-document print-only">
        <StandingCropPrint
          :rows="previewRows"
          :barangay="effectiveBarangay || ''"
          :crop="previewCrop"
        />
      </div>
    </component>

    <ConfirmDeleteModal
      :is-open="deleteOpen"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </component>
</template>

<script setup lang="ts">
import AppHeader from '@/components/Navigation/AppHeader.vue';
import { ref, reactive, computed, defineAsyncComponent, onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonInput, IonSelect, IonSelectOption,
} from '@ionic/vue';
import FormExportActions from '@/components/FormExportActions.vue';
import { exportStandingCropExcel } from '@/utils/statutoryFormExcel';
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
import ReportRowActions from '@/components/ReportRowActions.vue';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal.vue';
import { useReportRowActions } from '@/composables/useReportRowActions';
import '@/assets/reportTableStyles.css';

const { deleteOpen, promptDelete, cancelDelete, confirmDelete } = useReportRowActions();

const StandingCropPrint = defineAsyncComponent(() => import('@/components/StandingCropPrint.vue'));

withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false });
const emit = defineEmits<{ saved: [] }>();

interface StandingCropEntry {
  id: string;
  rsbsa_no: string;
  surname: string;
  first_name: string;
  middle_name: string;
  ext_name: string;
  farm_location: string;
  crop_type: string;
  variety: string;
  area_ha: number;
  growth_stage: string;
  est_harvest_date: string;
}

const {
  isAdminOverride,
  selectedBarangay,
  barangayOptions,
  loadingBarangays,
  effectiveBarangay,
  canEncode,
} = useEncodingBarangay();
const farmerSearch = useBarangayFarmerSearch(() => effectiveBarangay.value, {
  commodity: () => form.crop_type,
});
const { fetchActivePlanting } = useActivePlanting();
const harvestReadyHint = ref('');

const entries = ref<StandingCropEntry[]>([]);
const saving = ref(false);

const previewRows = computed(() =>
  entries.value.map((e) => ({
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

const previewCrop = computed(() => entries.value[0]?.crop_type || 'Rice');

const form = reactive({
  farmer_id: '',
  rsbsa_no: '',
  surname: '',
  first_name: '',
  middle_name: '',
  ext_name: '',
  birthdate_display: '',
  farmer_address: '',
  plot_id: '',
  farm_location: '',
  crop_type: 'Rice',
  variety: '',
  area_ha: '',
  growth_stage: 'Vegetative',
  est_harvest_date: '',
});

const selectedPlotSize = computed(() =>
  plotSizeHa(farmerSearch.selected.value?.plots?.find((x) => x.id === form.plot_id))
);
const onAreaHaInput = (e: any) => {
  form.area_ha = capInputToPlot(e.detail.value, selectedPlotSize.value);
};

const canAdd = computed(() =>
  canEncode.value && !!form.farmer_id && !!form.area_ha && !!form.variety && !!form.est_harvest_date && !saving.value
);

onMounted(() => {
  void loadLedger();
});

const totalHa = computed(() =>
  entries.value.reduce((s, e) => s + Number(e.area_ha || 0), 0)
);

const sliceDate = (v: any) => String(v || '').slice(0, 10);

const loadLedger = async () => {
  if (!effectiveBarangay.value) {
    entries.value = [];
    return;
  }
  try {
    const res = await apiClient.get('/standing-crop-logs', {
      params: { per_page: 200, barangay: effectiveBarangay.value },
    });
    const rows = res.data?.data?.data ?? [];
    entries.value = rows.map((r: any) => {
      const farmer = r.farmer || {};
      return {
        id: r.id,
        rsbsa_no: farmer.rsbsa_no || '',
        surname: farmer.surname || '',
        first_name: farmer.first_name || '',
        middle_name: farmer.middle_name || '',
        ext_name: farmer.ext_name || '',
        farm_location: r.farm_location || r.farm_plot?.location_brgy || farmer.permanent_brgy || '',
        crop_type: r.crop_type || 'Rice',
        variety: r.variety || '',
        area_ha: Number(r.area_ha) || 0,
        growth_stage: r.growth_stage || '',
        est_harvest_date: sliceDate(r.est_harvest_date),
      } as StandingCropEntry;
    });
  } catch {
    entries.value = [];
  }
};

const onTargetBarangayChange = () => {
  resetForm();
  void loadLedger();
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
  form.birthdate_display = formatBirthday(sel.birthdate);
  form.farmer_address = sel.address;
  form.plot_id = '';
  form.farm_location = sel.barangay;
  form.area_ha = '';
  form.variety = '';
  if (sel.plots.length === 1) {
    const p = sel.plots[0];
    form.plot_id = p.id;
    form.farm_location = p.location_brgy || sel.barangay;
    form.area_ha = String(p.size_ha || '');
    if (['Rice', 'Corn'].includes(p.commodity)) form.crop_type = p.commodity;
  }
  await applyPlantingAutofill();
};

const onPlotChange = async (e: CustomEvent) => {
  form.plot_id = String(e.detail.value);
  const p = farmerSearch.selected.value?.plots.find((x) => x.id === form.plot_id);
  if (p) {
    form.farm_location = p.location_brgy || form.farm_location;
    form.area_ha = String(p.size_ha || form.area_ha);
    if (['Rice', 'Corn'].includes(p.commodity)) form.crop_type = p.commodity;
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
  if (planting.area_planted_ha != null && planting.area_planted_ha > 0) {
    form.area_ha = capInputToPlot(String(planting.area_planted_ha), selectedPlotSize.value);
  }
  if (planting.computed_stage) {
    form.growth_stage = stageSelectValue(planting.computed_stage);
  }
  if (!form.est_harvest_date && planting.estimated_harvest_date) {
    form.est_harvest_date = planting.estimated_harvest_date;
  }
  if (isHarvestReady(planting.computed_stage)) {
    harvestReadyHint.value = planting.estimated_harvest_date
      ? `Ready for harvest (est. ${planting.estimated_harvest_date}).`
      : 'Active planting is ready for harvest.';
  }
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
  form.birthdate_display = '';
  form.farmer_address = '';
  form.plot_id = '';
  form.farm_location = '';
  form.variety = '';
  form.area_ha = '';
  form.est_harvest_date = '';
  form.growth_stage = 'Vegetative';
};

const addEntry = async () => {
  if (!canAdd.value) return;
  saving.value = true;
  const id = crypto.randomUUID();
  try {
    await apiClient.post('/standing-crop-logs', {
      id,
      farmer_id: form.farmer_id,
      farm_plot_id: form.plot_id || undefined,
      crop_type: form.crop_type,
      variety: form.variety,
      area_ha: Number(form.area_ha),
      growth_stage: form.growth_stage,
      est_harvest_date: form.est_harvest_date,
      farm_location: form.farm_location,
    });
    entries.value.unshift({
      id,
      rsbsa_no: form.rsbsa_no,
      surname: form.surname,
      first_name: form.first_name,
      middle_name: form.middle_name,
      ext_name: form.ext_name,
      farm_location: form.farm_location,
      crop_type: form.crop_type,
      variety: form.variety,
      area_ha: Number(form.area_ha),
      growth_stage: form.growth_stage,
      est_harvest_date: form.est_harvest_date,
    });
    resetForm();
    await toast.success('Standing crop entry saved.', 1800);
    emit('saved');
  } catch (e: any) {
    await toast.error(e?.response?.data?.message || 'Failed to save standing crop entry.');
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
  try {
    await apiClient.delete(`/standing-crop-logs/${row.id}`);
    entries.value.splice(i, 1);
    await toast.success('Standing crop record removed.');
  } catch (e: any) {
    await toast.error(e?.response?.data?.message || 'Could not remove this standing crop record.');
  }
};

const printForm = () => {
  window.print();
};

const downloadExcel = async () => {
  await exportStandingCropExcel({
    rows: previewRows.value,
    barangay: effectiveBarangay.value || '',
    crop: previewCrop.value,
  });
};
</script>

<style scoped>
.page-bg { --background: #f4f8f5; }
.wrapper { max-width: 1100px; margin: 0 auto; padding-bottom: 2rem; }
.export-btn { --background: #d4af37; --color: #1a4731; font-weight: 700; text-transform: none; }

.warn-banner {
  background: #fff8e1; color: #92400e; border: 1px solid #fcd34d;
  border-radius: 10px; padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 0.88rem;
}
.input-grid, .demo-grid { display: flex; flex-wrap: wrap; gap: 0.75rem; }
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
.search-box { position: relative; margin-bottom: 0.75rem; }
.hint { font-size: 0.8rem; color: #94a3b8; margin-top: 4px; }
.autofill-hint { font-size: 0.8rem; color: #166534; margin: 0.35rem 0 0; }
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
