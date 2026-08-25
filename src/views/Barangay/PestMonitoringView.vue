<template>
  <component :is="embedded ? 'div' : IonPage" class="encode-root">
    <ion-header v-if="!embedded" class="no-print">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Pest Reports</ion-title>
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

        <ion-select
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

        <div class="form-card">
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

          <ion-button expand="block" class="add-btn" :disabled="!canAdd" @click="addEntry">
            {{ saving ? 'Saving…' : 'Add to Ledger' }}
          </ion-button>
        </div>

        <div v-if="!embedded" class="preview-section no-print">
          <div class="preview-toolbar">
            <div class="preview-meta">
              <h3>Form Preview</h3>
              <span class="preview-count">{{ entries.length }} inspection(s)</span>
            </div>
            <FormExportActions @print="printForm" @excel="downloadExcel" />
          </div>
          <ul v-if="entries.length" class="entry-actions">
            <li v-for="(e, i) in entries" :key="e.id">
              <img
                v-if="e.photo_url"
                :src="e.photo_url"
                class="ledger-thumb"
                alt="Evidence"
                @click="viewingPhoto = e.photo_url!"
              />
              <span>{{ i + 1 }}. {{ e.surname }}, {{ e.first_name }} — {{ e.variety || '—' }}</span>
              <ion-button size="small" fill="clear" color="danger" @click="removeEntry(i)">Remove</ion-button>
            </li>
          </ul>
        </div>
      </div>

      <div v-if="!embedded" class="form-preview print-document">
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
  </component>
</template>

<script setup lang="ts">
import { ref, reactive, computed, defineAsyncComponent, onMounted } from 'vue';
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
import apiClient from '@/utils/axios';
import { toast } from '@/utils/toast';
import { capInputToPlot, plotSizeHa } from '@/utils/plotArea';
import { loadPestCatalog, threatsForCrop } from '@/utils/pestCatalog';
import { storageUrl } from '@/utils/storageUrl';
const PestMonitoringPrint = defineAsyncComponent(() => import('@/components/PestMonitoringPrint.vue'));

withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false });
const emit = defineEmits<{ saved: [] }>();

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
const farmerSearch = useBarangayFarmerSearch(() => effectiveBarangay.value, {
  commodity: () => crop.value,
});

const entries = ref<PestEntry[]>([]);
const viewingPhoto = ref<string | null>(null);

const previewRows = computed(() =>
  entries.value.map((e) => ({
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
    damage_by: e.damage_by,
  })),
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
    return;
  }
  try {
    const res = await apiClient.get('/pest-monitoring', {
      params: {
        per_page: 200,
        crop_type: crop.value || undefined,
        barangay: effectiveBarangay.value,
      },
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
        birthdate_display: formatBirthday(farmer.birthdate || ''),
        farmer_address: mapFarmerAddress(farmer),
        farm_location: r.farm_location || r.farm_plot?.location_brgy || farmer.permanent_brgy || '',
        area_planted: Number(r.area_planted) || 0,
        variety: r.variety || '',
        days_after_planting: Number(r.days_after_planting) || 0,
        area_damage_pct: Number(r.area_damage_pct ?? r.incidence) || 0,
        damage_by: r.pest_name || '',
        date_of_inspection: r.date_of_inspection?.slice?.(0, 10) || r.date_of_inspection || '',
        photo_url: r.photo_url || storageUrl(r.photo_path),
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

const onCropChange = async (e: any) => {
  crop.value = e.detail.value;
  resetForm();
  await loadLedger();
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
  syncAffectedHa();
};

const onPlotChange = (e: any) => {
  form.plot_id = e.detail.value;
  const p = matchingPlots.value.find((x) => x.id === form.plot_id);
  if (p) {
    form.farm_location = p.location_brgy || form.farm_location;
    form.area_planted = String(p.size_ha || form.area_planted);
  }
  syncAffectedHa();
};

const resetForm = () => {
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
  try {
    await apiClient.delete(`/pest-monitoring/${row.id}`);
    entries.value.splice(i, 1);
    await toast.success('Pest inspection removed.');
  } catch (e: any) {
    await toast.error(e?.response?.data?.message || 'Could not remove this inspection.');
  }
};

const printForm = () => {
  window.print();
};

const downloadExcel = async () => {
  await exportPestMonitoringExcel({
    rows: previewRows.value,
    barangay: effectiveBarangay.value || '',
    crop: crop.value,
  });
};

onMounted(async () => {
  await loadPestCatalog();
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
