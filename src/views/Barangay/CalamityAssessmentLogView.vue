<template>
  <component :is="embedded ? 'div' : IonPage" class="encode-root">
    <ion-header v-if="!embedded" class="no-print">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Calamity Damage</ion-title>
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

        <div class="form-card">
          <h3>Add Record</h3>

          <div class="event-bar">
            <ion-input
              class="field grow"
              label="Calamity Event Name"
              label-placement="stacked"
              placeholder="e.g. Typhoon Kristine"
              :value="form.calamity_event"
              @ionInput="(e: any) => form.calamity_event = e.detail.value"
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
            <div class="ro full"><span class="lbl">Farmer Address</span><span>{{ form.farmer_address }}</span></div>
          </div>

          <div class="input-grid">
            <ion-select
              class="field"
              label="Farm Location / Plot"
              label-placement="stacked"
              interface="popover"
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
          </div>

          <ion-button expand="block" class="add-btn" :disabled="!canAdd" @click="addEntry">
            {{ saving ? 'Saving…' : 'Add to Ledger' }}
          </ion-button>
        </div>

        <div v-if="!embedded" class="preview-section no-print">
          <div class="preview-toolbar">
            <div class="preview-meta">
              <h3>Form Preview</h3>
              <span class="preview-count">{{ entries.length }} assessment(s) · {{ totalDamaged.toFixed(2) }} ha damaged</span>
            </div>
            <FormExportActions @print="printForm" @excel="downloadExcel" />
          </div>
          <ul v-if="entries.length" class="entry-actions">
            <li v-for="(e, i) in entries" :key="e.id">
              <span>{{ i + 1 }}. {{ e.surname }}, {{ e.first_name }} — {{ e.calamity_event }}</span>
              <ion-button size="small" fill="clear" color="danger" @click="entries.splice(i, 1)">Remove</ion-button>
            </li>
          </ul>
        </div>
      </div>

      <div v-if="!embedded" class="form-preview print-document">
        <CalamityAssessmentPrint
          :rows="previewRows"
          :barangay="effectiveBarangay || ''"
          :event-name="previewEventName"
          :event-date="previewEventDate"
        />
      </div>
    </component>
  </component>
</template>

<script setup lang="ts">
import { ref, reactive, computed, defineAsyncComponent, onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonInput, IonSelect, IonSelectOption, toastController,
} from '@ionic/vue';
import FormExportActions from '@/components/FormExportActions.vue';
import { exportCalamityAssessmentExcel } from '@/utils/statutoryFormExcel';
import { useEncodingBarangay } from '@/composables/useEncodingBarangay';
import EncodingBarangaySelector from '@/components/EncodingBarangaySelector.vue';
import {
  useBarangayFarmerSearch,
  type FarmerOption,
} from '@/composables/useBarangayFarmerSearch';
import apiClient from '@/utils/axios';

const CalamityAssessmentPrint = defineAsyncComponent(() => import('@/components/CalamityAssessmentPrint.vue'));

withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false });
const emit = defineEmits<{ saved: [] }>();

interface CalamityEntry {
  id: string;
  calamity_event: string;
  calamity_date: string;
  rsbsa_no: string;
  surname: string;
  first_name: string;
  middle_name: string;
  ext_name: string;
  farm_location: string;
  crop_type: string;
  crop_stage: string;
  area_planted: number;
  area_damaged: number;
  est_yield_loss_pct: number;
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
const farmerSearch = useBarangayFarmerSearch(() => effectiveBarangay.value);

const entries = ref<CalamityEntry[]>([]);
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
    crop_stage: e.crop_stage,
    area_planted: Number(e.area_planted).toFixed(2),
    area_damaged: Number(e.area_damaged).toFixed(2),
    est_yield_loss_pct: e.est_yield_loss_pct,
  })),
);

const yieldLossManual = ref(false);

const form = reactive({
  calamity_event: '',
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
  crop_stage: 'Vegetative',
  area_planted: '',
  area_damaged: '',
  est_yield_loss_pct: '',
});

const previewEventName = computed(() => entries.value[0]?.calamity_event || form.calamity_event || '');
const previewEventDate = computed(() => entries.value[0]?.calamity_date || form.calamity_date || '');

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

const canAdd = computed(() =>
  canEncode.value
  && !!form.calamity_event
  && !!form.calamity_date
  && !!form.farmer_id
  && !!form.plot_id
  && !!form.area_planted
  && !!form.area_damaged
  && form.est_yield_loss_pct !== ''
  && !saving.value
);

function inferCalamityType(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('typhoon') || n.includes('bagyo')) return 'Typhoon';
  if (n.includes('flood') || n.includes('baha')) return 'Flood';
  if (n.includes('drought') || n.includes('el nino') || n.includes('elnino')) return 'Drought';
  if (n.includes('pest')) return 'Pest Outbreak';
  if (n.includes('hail')) return 'Hail';
  return 'Other';
}

const loadLedger = async () => {
  if (!effectiveBarangay.value) {
    entries.value = [];
    return;
  }
  try {
    const res = await apiClient.get('/damage-assessments', {
      params: { per_page: 200, barangay: effectiveBarangay.value },
    });
    const rows = res.data?.data?.data ?? [];
    entries.value = rows.map((r: any) => {
      const farmer = r.farmer || {};
      return {
        id: r.id,
        calamity_event: r.calamity_name || r.calamity_type || '',
        calamity_date: r.date_of_calamity?.slice?.(0, 10) || r.date_of_calamity || '',
        rsbsa_no: farmer.rsbsa_no || '',
        surname: farmer.surname || '',
        first_name: farmer.first_name || '',
        middle_name: farmer.middle_name || '',
        ext_name: farmer.ext_name || '',
        farm_location: r.farm_plot?.location_brgy || farmer.permanent_brgy || '',
        crop_type: r.farm_plot?.commodity || '',
        crop_stage: r.crop_stage || '',
        area_planted: Number(r.area_planted_ha ?? r.farm_plot?.size_ha) || 0,
        area_damaged: Number(r.area_destroyed_ha) || 0,
        est_yield_loss_pct: Number(r.damage_percentage) || 0,
      } as CalamityEntry;
    });
  } catch {
    entries.value = [];
  }
};

const totalDamaged = computed(() =>
  entries.value.reduce((s, e) => s + Number(e.area_damaged || 0), 0)
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
};

const onPlotChange = (e: CustomEvent) => {
  form.plot_id = String(e.detail.value);
  const p = farmerSearch.selected.value?.plots.find((x) => x.id === form.plot_id);
  if (p) {
    form.farm_location = p.location_brgy || form.farm_location;
    form.area_planted = String(p.size_ha || form.area_planted);
    if (['Rice', 'Corn'].includes(p.commodity)) form.crop_type = p.commodity;
    recalcYieldLoss();
  }
};

const resetFarmerForm = () => {
  farmerSearch.clearSelection();
  form.farmer_id = '';
  form.rsbsa_no = '';
  form.surname = '';
  form.first_name = '';
  form.middle_name = '';
  form.ext_name = '';
  form.farmer_address = '';
  form.plot_id = '';
  form.farm_location = '';
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
      calamity_type: inferCalamityType(form.calamity_event),
      calamity_name: form.calamity_event,
      crop_stage: form.crop_stage,
      area_destroyed_ha: Number(form.area_damaged),
      area_planted_ha: Number(form.area_planted),
      date_of_calamity: form.calamity_date,
      damage_percentage: Number(form.est_yield_loss_pct),
      barangay_name: payloadBarangayName(),
    });

    entries.value.unshift({
      id,
      calamity_event: form.calamity_event,
      calamity_date: form.calamity_date,
      rsbsa_no: form.rsbsa_no,
      surname: form.surname,
      first_name: form.first_name,
      middle_name: form.middle_name,
      ext_name: form.ext_name,
      farm_location: form.farm_location,
      crop_type: form.crop_type,
      crop_stage: form.crop_stage,
      area_planted: Number(form.area_planted),
      area_damaged: Number(form.area_damaged),
      est_yield_loss_pct: Number(form.est_yield_loss_pct),
    });
    resetFarmerForm();
    const t = await toastController.create({ message: 'Calamity assessment saved.', color: 'success', duration: 1800, position: 'top' });
    await t.present();
    emit('saved');
  } catch (e: any) {
    const t = await toastController.create({
      message: e?.response?.data?.message || 'Failed to save calamity assessment. Select a farm plot.',
      color: 'danger',
      duration: 2800,
      position: 'top',
    });
    await t.present();
  } finally {
    saving.value = false;
  }
};

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
.event-bar, .input-grid, .demo-grid { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.event-bar { margin-bottom: 0.75rem; }
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
.search-box { position: relative; margin-bottom: 0.75rem; }
.hint { font-size: 0.8rem; color: #94a3b8; margin-top: 4px; }
.calc-hint {
  flex: 1 1 100%;
  margin: 0;
  font-size: 0.78rem;
  color: #64748b;
  font-style: italic;
}
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
