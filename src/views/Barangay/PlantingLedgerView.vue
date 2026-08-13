<template>
  <ion-page>
    <ion-header class="no-print">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Planting Records</ion-title>
        <ion-buttons slot="end">
          <ion-button class="export-btn no-print" :disabled="!entries.length" @click="exportForm">
            <ion-icon slot="start" :icon="printOutline"></ion-icon>
            Print Form
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding page-bg">
      <div class="wrapper no-print">
        <div v-if="!assignedBarangay" class="warn-banner">
          No assigned barangay on this account. Ask MAO admin to set <code>assigned_barangay</code> before encoding.
        </div>

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
              :disabled="!assignedBarangay"
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
            <ion-input class="field" type="number" label="Area Planted (ha)" label-placement="stacked" :value="form.area_planted" @ionInput="(e: any) => form.area_planted = e.detail.value"></ion-input>
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

        <div class="table-card">
          <div class="table-head">
            <h3>Encoded Entries ({{ entries.length }})</h3>
            <span class="totals">{{ totalHa.toFixed(2) }} ha total</span>
          </div>
          <div v-if="entries.length" class="table-wrap">
            <table class="mao-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Farmer</th>
                  <th>Crop</th>
                  <th>Area</th>
                  <th>Status</th>
                  <th>Water</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(e, i) in entries" :key="e.id">
                  <td>{{ i + 1 }}</td>
                  <td><strong>{{ e.surname }}, {{ e.first_name }}</strong></td>
                  <td>{{ e.crop }}</td>
                  <td>{{ Number(e.area_planted).toFixed(2) }}</td>
                  <td><StatusBadge :status="e.planting_status" /></td>
                  <td>{{ e.water_source }}</td>
                  <td>{{ e.date_of_planting }}</td>
                  <td>
                    <ion-button size="small" fill="clear" color="danger" @click="entries.splice(i, 1)">Remove</ion-button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <EmptyState
            v-else
            variant="documents"
            message="No planting entries found. Search a farmer and add a planting record."
          />
        </div>
      </div>

      <div class="print-only print-document">
        <PlantingLedgerPrint
          v-if="printRows.length"
          :rows="printRows"
          :barangay="assignedBarangay || ''"
          :crop="crop"
          :mode="mode"
        />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, defineAsyncComponent, onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonInput, IonSelect, IonSelectOption, toastController,
} from '@ionic/vue';
import { printOutline } from 'ionicons/icons';
import { useAuthStore } from '@/stores/authStore';
import {
  useBarangayFarmerSearch,
  formatBirthday,
  type FarmerOption,
} from '@/composables/useBarangayFarmerSearch';
import type { PlantingPrintMode } from '@/components/PlantingLedgerPrint.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import EmptyState from '@/components/EmptyState.vue';
import apiClient from '@/utils/axios';
const PlantingLedgerPrint = defineAsyncComponent(() => import('@/components/PlantingLedgerPrint.vue'));

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
  area_planted: number;
  date_of_planting: string;
  planting_status: string;
  water_source: string;
  remarks: string;
}

const authStore = useAuthStore();
const assignedBarangay = computed(() => authStore.user?.assigned_barangay || null);
const crop = ref('Rice');
const farmerSearch = useBarangayFarmerSearch(() => assignedBarangay.value, {
  commodity: () => crop.value,
});

const mode = ref<PlantingPrintMode>('already_planted');
const entries = ref<PlantingEntry[]>([]);
const printRows = ref<Record<string, string | number>[]>([]);
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
  date_of_planting: '',
  planting_status: 'Active',
  water_source: 'Deepwell',
  remarks: '',
});

const matchingPlots = computed(() => farmerSearch.plotsForCommodity(crop.value));

const canAdd = computed(() =>
  !!form.farmer_id
  && !!form.plot_id
  && !!form.area_planted
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
  form.date_of_planting = '';
  form.remarks = '';
};

const onCropChange = async (e: any) => {
  crop.value = e.detail.value;
  resetEncodeForm();
};

const loadLedger = async () => {
  loadingLedger.value = true;
  try {
    const res = await apiClient.get('/planting-logs', { params: { per_page: 200 } });
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
    const t = await toastController.create({
      message: `This farmer has no ${crop.value} plot. Switch Crop Type or choose another farmer.`,
      color: 'warning',
      duration: 2800,
      position: 'top',
    });
    await t.present();
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
    const t = await toastController.create({
      message: `Select a ${crop.value} farm plot before encoding.`,
      color: 'warning',
      duration: 2400,
      position: 'top',
    });
    await t.present();
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
      variety: 'Unspecified',
      area_planted: Number(form.area_planted),
      date_planted: form.date_of_planting,
      status: form.planting_status,
      water_source: form.water_source,
      farm_location: form.farm_location,
      remarks: form.remarks,
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
      area_planted: Number(form.area_planted),
      date_of_planting: form.date_of_planting,
      planting_status: form.planting_status,
      water_source: form.water_source,
      remarks: form.remarks,
    });
    resetEncodeForm();
    const t = await toastController.create({ message: 'Planting entry saved.', color: 'success', duration: 1800, position: 'top' });
    await t.present();
  } catch (e: any) {
    const t = await toastController.create({
      message: e?.response?.data?.message || 'Failed to save planting entry.',
      color: 'danger',
      duration: 2800,
      position: 'top',
    });
    await t.present();
  } finally {
    saving.value = false;
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

const exportForm = async () => {
  const list = filteredForExport.value;
  if (!list.length) {
    const t = await toastController.create({
      message: 'No entries match the selected crop/form mode.',
      color: 'warning',
      duration: 2400,
      position: 'top',
    });
    await t.present();
    return;
  }
  printRows.value = list.map((e) => ({
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
  }));
  setTimeout(() => window.print(), 350);
};

onMounted(() => {
  void loadLedger();
});
</script>

<style scoped>
.page-bg { --background: #f4f8f5; }
.wrapper { max-width: 1100px; margin: 0 auto; padding-bottom: 2rem; }
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

.form-card, .table-card {
  background: white; border: 1px solid #e2e8f0; border-radius: 12px;
  padding: 1rem; margin-bottom: 1rem;
}
.form-card h3, .table-head h3 { margin: 0 0 0.75rem; color: #1a4731; font-weight: 800; }
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

.table-head { display: flex; justify-content: space-between; align-items: center; }
.totals { font-weight: 700; color: #1a4731; }
</style>
