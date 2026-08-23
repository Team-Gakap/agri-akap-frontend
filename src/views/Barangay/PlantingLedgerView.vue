<template>
  <component :is="embedded ? 'div' : IonPage" class="encode-root">
    <ion-header v-if="!embedded" class="no-print">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Planting Records</ion-title>
      </ion-toolbar>
    </ion-header>

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

        <div class="mode-bar">
          <ion-select
            class="field"
            label="Crop Type"
            label-placement="stacked"
            interface="popover"
            :value="crop"
            @ionChange="onCropChange"
          >
            <ion-select-option value="Rice">Rice</ion-select-option>
            <ion-select-option value="Corn">Corn</ion-select-option>
          </ion-select>
          <ion-select
            class="field grow"
            label="Form Type"
            label-placement="stacked"
            interface="popover"
            :value="mode"
            @ionChange="(e: any) => mode = e.detail.value"
          >
            <ion-select-option value="already_planted">Already Planted</ion-select-option>
            <ion-select-option value="not_continued">Planted but Not Continued</ion-select-option>
            <ion-select-option value="with_water">Planted With Water Source</ion-select-option>
            <ion-select-option value="without_water">Planted Without Water Source</ion-select-option>
          </ion-select>
        </div>

        <div class="form-card">
          <h3>Add Record — {{ crop }}</h3>
          <p class="crop-hint">Only farmers with a {{ crop }} farm plot can be added on this form.</p>

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
              <li
                v-for="f in farmerSearch.results.value"
                :key="f.id"
                @click="onSelectFarmer(f)"
              >
                <strong>{{ f.surname }}, {{ f.first_name }}</strong>
                <span>{{ f.rsbsa_no }} · {{ f.barangay }}</span>
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
            <ion-input class="field" type="date" label="Date of Planting" label-placement="stacked" :value="form.date_of_planting" @ionInput="(e: any) => form.date_of_planting = e.detail.value"></ion-input>
            <ion-select class="field" label="Planting Status" label-placement="stacked" interface="popover" :value="form.planting_status" @ionChange="(e: any) => form.planting_status = e.detail.value">
              <ion-select-option value="Active">Active</ion-select-option>
              <ion-select-option value="Not Continued">Not Continued</ion-select-option>
            </ion-select>
            <ion-select class="field" label="Water Source" label-placement="stacked" interface="popover" :value="form.water_source" @ionChange="(e: any) => form.water_source = e.detail.value">
              <ion-select-option value="Deepwell">Deepwell</ion-select-option>
              <ion-select-option value="Irrigated">Irrigated</ion-select-option>
              <ion-select-option value="Rainfed/None">Rainfed/None</ion-select-option>
            </ion-select>
            <ion-input class="field grow" label="Remarks" label-placement="stacked" :value="form.remarks" @ionInput="(e: any) => form.remarks = e.detail.value"></ion-input>
          </div>

          <ion-button expand="block" class="add-btn" :disabled="!canAdd" @click="addEntry">
            {{ saving ? 'Saving…' : 'Add to Ledger' }}
          </ion-button>
        </div>

        <div v-if="!embedded" class="preview-section no-print">
          <div class="preview-toolbar">
            <div class="preview-meta">
              <h3>Form Preview</h3>
              <span class="preview-count">{{ filteredForExport.length }} / {{ entries.length }} entry(ies) · {{ totalHa.toFixed(2) }} ha</span>
            </div>
            <FormExportActions @print="printForm" @excel="downloadExcel" />
          </div>
          <ul v-if="entries.length" class="entry-actions">
            <li v-for="(e, i) in entries" :key="e.id">
              <span>{{ i + 1 }}. {{ e.surname }}, {{ e.first_name }} — {{ Number(e.area_planted).toFixed(2) }} ha</span>
              <ion-button size="small" fill="clear" color="danger" @click="removeEntry(i)">Remove</ion-button>
            </li>
          </ul>
        </div>
      </div>

      <div v-if="!embedded" class="form-preview print-document">
        <PlantingLedgerPrint
          :rows="previewRows"
          :barangay="effectiveBarangay || ''"
          :crop="crop"
          :mode="mode"
        />
      </div>
    </component>
  </component>
</template>

<script setup lang="ts">
import { ref, reactive, computed, defineAsyncComponent, onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonInput, IonSelect, IonSelectOption,
} from '@ionic/vue';
import FormExportActions from '@/components/FormExportActions.vue';
import { exportPlantingLedgerExcel } from '@/utils/statutoryFormExcel';
import { useEncodingBarangay } from '@/composables/useEncodingBarangay';
import EncodingBarangaySelector from '@/components/EncodingBarangaySelector.vue';
import VarietyField from '@/components/VarietyField.vue';
import {
  useBarangayFarmerSearch,
  formatBirthday,
  type FarmerOption,
} from '@/composables/useBarangayFarmerSearch';
import type { PlantingPrintMode } from '@/components/PlantingLedgerPrint.vue';
import apiClient from '@/utils/axios';
import { toast } from '@/utils/toast';
import { capInputToPlot, plotSizeHa } from '@/utils/plotArea';
const PlantingLedgerPrint = defineAsyncComponent(() => import('@/components/PlantingLedgerPrint.vue'));

withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false });
const emit = defineEmits<{ saved: [] }>();

interface PlantingEntry {
  id: string;
  farmer_id: string;
  plot_id?: string;
  rsbsa_no: string;
  surname: string;
  first_name: string;
  middle_name: string;
  ext_name: string;
  birthdate: string;
  birthdate_display: string;
  farmer_address: string;
  farm_location: string;
  crop: string;
  variety: string;
  area_planted: number;
  date_of_planting: string;
  planting_status: string;
  water_source: string;
  remarks: string;
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
const crop = ref('Rice');
const farmerSearch = useBarangayFarmerSearch(() => effectiveBarangay.value, {
  commodity: () => crop.value,
});

const mode = ref<PlantingPrintMode>('already_planted');
const entries = ref<PlantingEntry[]>([]);
const saving = ref(false);
const loadingLedger = ref(false);

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
  date_of_planting: '',
  planting_status: 'Active',
  water_source: 'Deepwell',
  remarks: '',
});

const matchingPlots = computed(() => farmerSearch.plotsForCommodity(crop.value));
const selectedPlotSize = computed(() =>
  plotSizeHa(matchingPlots.value.find((p) => p.id === form.plot_id))
);
const onAreaPlantedInput = (e: any) => {
  form.area_planted = capInputToPlot(e.detail.value, selectedPlotSize.value);
};

const canAdd = computed(() =>
  canEncode.value
  && !!form.farmer_id
  && !!form.plot_id
  && !!form.area_planted
  && !!form.variety.trim()
  && !!form.date_of_planting
  && !saving.value
);

const totalHa = computed(() =>
  entries.value.reduce((s, e) => s + Number(e.area_planted || 0), 0)
);

const mapFarmerAddress = (f: any) =>
  [f?.permanent_house_no, f?.permanent_street, f?.permanent_brgy, f?.permanent_city, f?.permanent_province]
    .filter(Boolean)
    .join(', ') || f?.permanent_brgy || '';

const resetEncodeForm = () => {
  farmerSearch.clearSelection();
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
  form.date_of_planting = '';
  form.remarks = '';
};

const onTargetBarangayChange = () => {
  resetEncodeForm();
  void loadLedger();
};

const onCropChange = async (e: any) => {
  crop.value = e.detail.value;
  resetEncodeForm();
};

const loadLedger = async () => {
  if (!effectiveBarangay.value) {
    entries.value = [];
    return;
  }
  loadingLedger.value = true;
  try {
    const res = await apiClient.get('/planting-logs', {
      params: { per_page: 200, barangay: effectiveBarangay.value },
    });
    const rows = res.data?.data?.data ?? [];
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
        birthdate: farmer.birthdate || '',
        birthdate_display: formatBirthday(farmer.birthdate || ''),
        farmer_address: mapFarmerAddress(farmer),
        farm_location: r.farm_location || r.farm_plot?.location_brgy || farmer.permanent_brgy || '',
        crop: r.crop_type || 'Rice',
        variety: r.variety || '',
        area_planted: Number(r.area_planted) || 0,
        date_of_planting: r.date_planted?.slice?.(0, 10) || r.date_planted || '',
        planting_status: r.status || 'Active',
        water_source: r.water_source || '',
        remarks: r.remarks || '',
      } as PlantingEntry;
    });
  } catch {
    entries.value = [];
  } finally {
    loadingLedger.value = false;
  }
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
  if (plots.length === 1) {
    form.plot_id = plots[0].id;
    form.farm_location = plots[0].location_brgy || sel.barangay;
    form.area_planted = String(plots[0].size_ha || '');
  }
};

const onPlotChange = (e: any) => {
  form.plot_id = e.detail.value;
  const p = matchingPlots.value.find((x) => x.id === form.plot_id);
  if (p) {
    form.farm_location = p.location_brgy || form.farm_location;
    form.area_planted = String(p.size_ha || form.area_planted);
  }
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
    await apiClient.post('/planting-logs', {
      id,
      farmer_id: form.farmer_id,
      farm_plot_id: form.plot_id || undefined,
      crop_type: crop.value,
      variety: form.variety.trim(),
      area_planted: Number(form.area_planted),
      date_planted: form.date_of_planting,
      status: form.planting_status,
      water_source: form.water_source,
      farm_location: form.farm_location,
      remarks: form.remarks,
      barangay_name: payloadBarangayName(),
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
      birthdate: form.birthdate,
      birthdate_display: form.birthdate_display,
      farmer_address: form.farmer_address,
      farm_location: form.farm_location,
      crop: crop.value,
      variety: form.variety.trim(),
      area_planted: Number(form.area_planted),
      date_of_planting: form.date_of_planting,
      planting_status: form.planting_status,
      water_source: form.water_source,
      remarks: form.remarks,
    });
    resetEncodeForm();
    await toast.success('Planting entry saved.', 1800);
    emit('saved');
  } catch (e: any) {
    await toast.error(e?.response?.data?.message || 'Failed to save planting entry.');
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
    await apiClient.delete(`/planting-logs/${row.id}`);
    entries.value.splice(i, 1);
    await toast.success('Planting log removed.');
  } catch (e: any) {
    await toast.error(e?.response?.data?.message || 'Could not remove this planting log.');
  }
};

const filteredForExport = computed(() => {
  return entries.value.filter((e) => {
    if (e.crop !== crop.value) return false;
    if (mode.value === 'not_continued') return e.planting_status === 'Not Continued';
    if (mode.value === 'with_water') return e.water_source !== 'Rainfed/None' && e.planting_status === 'Active';
    if (mode.value === 'without_water') return e.water_source === 'Rainfed/None';
    return e.planting_status === 'Active';
  });
});

const previewRows = computed(() =>
  filteredForExport.value.map((e) => ({
    rsbsa_no: e.rsbsa_no,
    surname: e.surname,
    first_name: e.first_name,
    middle_name: e.middle_name,
    ext_name: e.ext_name,
    birthdate: e.birthdate_display,
    farmer_address: e.farmer_address,
    farm_location: e.farm_location,
    area_planted: Number(e.area_planted).toFixed(2),
    area_planted_num: e.area_planted,
    date_of_planting: e.date_of_planting,
    water_source: e.water_source,
    remarks: e.remarks,
  })),
);

const printForm = () => {
  window.print();
};

const downloadExcel = async () => {
  await exportPlantingLedgerExcel({
    rows: previewRows.value,
    barangay: effectiveBarangay.value || '',
    crop: crop.value,
    mode: mode.value,
  });
};

onMounted(() => {
  void loadLedger();
});
</script>

<style scoped>
.page-bg { --background: #f4f8f5; }
.wrapper { max-width: 1100px; margin: 0 auto; padding-bottom: 2rem; }
.embedded-encode-body { padding-bottom: 2rem; }
.export-btn { --background: #d4af37; --color: #1a4731; font-weight: 700; text-transform: none; }

.warn-banner {
  background: #fff8e1; color: #92400e; border: 1px solid #fcd34d;
  border-radius: 10px; padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 0.88rem;
}
.mode-bar, .input-grid, .demo-grid {
  display: flex; flex-wrap: wrap; gap: 0.75rem;
}
.mode-bar { margin-bottom: 1rem; }
.field {
  flex: 1; min-width: 140px;
  --background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 10px;
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
.crop-hint { margin: -0.35rem 0 0.85rem; font-size: 0.82rem; color: #64748b; }
.search-box { position: relative; margin-bottom: 0.75rem; }
.hint { font-size: 0.8rem; color: #94a3b8; margin-top: 4px; }
.suggest {
  list-style: none; margin: 4px 0 0; padding: 0; border: 1px solid #e2e8f0;
  border-radius: 8px; background: white; max-height: 220px; overflow: auto; z-index: 5;
}
.suggest li {
  padding: 0.55rem 0.75rem; cursor: pointer; display: flex; flex-direction: column;
  border-bottom: 1px solid #f1f5f9;
}
.suggest li:hover { background: #e8f5e9; }
.suggest li span { font-size: 0.78rem; color: #64748b; }

.demo-grid { margin-bottom: 0.75rem; }
.ro {
  flex: 1; min-width: 140px; background: #f8fafc; border: 1px solid #e2e8f0;
  border-radius: 8px; padding: 0.5rem 0.65rem;
}
.ro.full { flex: 1 1 100%; }
.lbl { display: block; font-size: 0.68rem; color: #64748b; text-transform: uppercase; font-weight: 700; }
.add-btn { --background: #1a4731; margin-top: 0.85rem; text-transform: none; font-weight: 700; }
</style>
