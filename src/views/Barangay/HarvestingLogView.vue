<template>
  <ion-page>
    <ion-header class="no-print">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Harvest Records</ion-title>
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

        <div class="form-card">
          <h3>Add Record</h3>

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
            <ion-input class="field" label="Variety" label-placement="stacked" :value="form.variety" @ionInput="(e: any) => form.variety = e.detail.value"></ion-input>
            <ion-input class="field" type="number" label="Area Harvested (ha)" label-placement="stacked" :value="form.area_harvested" @ionInput="(e: any) => form.area_harvested = e.detail.value"></ion-input>
            <ion-input class="field" type="number" label="Total Yield Produced" label-placement="stacked" :value="form.yield_amount" @ionInput="(e: any) => form.yield_amount = e.detail.value"></ion-input>
            <ion-select
              class="field"
              label="Yield Unit"
              label-placement="stacked"
              interface="popover"
              :value="form.yield_unit"
              @ionChange="(e: any) => form.yield_unit = e.detail.value"
            >
              <ion-select-option value="Metric Tons">Metric Tons</ion-select-option>
              <ion-select-option value="Kilograms">Kilograms</ion-select-option>
            </ion-select>
            <ion-input class="field" type="date" label="Date of Harvest" label-placement="stacked" :value="form.date_of_harvest" @ionInput="(e: any) => form.date_of_harvest = e.detail.value"></ion-input>
          </div>

          <ion-button expand="block" class="add-btn" :disabled="!canAdd" @click="addEntry">
            Add to Ledger
          </ion-button>
        </div>

        <div class="table-card">
          <div class="table-head">
            <h3>Encoded Harvests ({{ entries.length }})</h3>
            <span class="totals">{{ totalHa.toFixed(2) }} ha harvested</span>
          </div>
          <div v-if="entries.length" class="table-wrap">
            <table class="mao-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Farmer</th>
                  <th>Location</th>
                  <th>Crop</th>
                  <th>Area</th>
                  <th>Yield</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(e, i) in entries" :key="e.id">
                  <td>{{ i + 1 }}</td>
                  <td><strong>{{ e.surname }}, {{ e.first_name }}</strong></td>
                  <td>{{ e.farm_location }}</td>
                  <td>{{ e.crop_type }}</td>
                  <td>{{ Number(e.area_harvested).toFixed(2) }}</td>
                  <td>{{ e.yield_display }}</td>
                  <td>{{ e.date_of_harvest }}</td>
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
            message="No harvest records yet. Search a farmer and log a completed harvest."
          />
        </div>
      </div>

      <div class="print-only print-document">
        <HarvestingPrint
          v-if="printRows.length"
          :rows="printRows"
          :barangay="assignedBarangay || ''"
          :crop="printCrop"
        />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, defineAsyncComponent } from 'vue';
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
import EmptyState from '@/components/EmptyState.vue';

const HarvestingPrint = defineAsyncComponent(() => import('@/components/HarvestingPrint.vue'));

interface HarvestEntry {
  id: string;
  rsbsa_no: string;
  surname: string;
  first_name: string;
  middle_name: string;
  ext_name: string;
  farm_location: string;
  crop_type: string;
  variety: string;
  area_harvested: number;
  yield_amount: number;
  yield_unit: string;
  yield_display: string;
  date_of_harvest: string;
}

const authStore = useAuthStore();
const assignedBarangay = computed(() => authStore.user?.assigned_barangay || null);
const farmerSearch = useBarangayFarmerSearch(() => assignedBarangay.value);

const entries = ref<HarvestEntry[]>([]);
const printRows = ref<Record<string, string | number>[]>([]);
const printCrop = ref('Rice');

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
  area_harvested: '',
  yield_amount: '',
  yield_unit: 'Metric Tons',
  date_of_harvest: '',
});

const canAdd = computed(() =>
  !!form.farmer_id && !!form.area_harvested && !!form.yield_amount && !!form.date_of_harvest && !!form.variety
);

const totalHa = computed(() =>
  entries.value.reduce((s, e) => s + Number(e.area_harvested || 0), 0)
);

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
  form.area_harvested = '';
  if (sel.plots.length === 1) {
    const p = sel.plots[0];
    form.plot_id = p.id;
    form.farm_location = p.location_brgy || sel.barangay;
    form.area_harvested = String(p.size_ha || '');
    if (['Rice', 'Corn'].includes(p.commodity)) form.crop_type = p.commodity;
  }
};

const onPlotChange = (e: CustomEvent) => {
  form.plot_id = String(e.detail.value);
  const p = farmerSearch.selected.value?.plots.find((x) => x.id === form.plot_id);
  if (p) {
    form.farm_location = p.location_brgy || form.farm_location;
    form.area_harvested = String(p.size_ha || form.area_harvested);
    if (['Rice', 'Corn'].includes(p.commodity)) form.crop_type = p.commodity;
  }
};

const resetForm = () => {
  farmerSearch.clearSelection();
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
  form.area_harvested = '';
  form.yield_amount = '';
  form.date_of_harvest = '';
};

const addEntry = async () => {
  if (!canAdd.value) return;
  const yieldDisplay = `${Number(form.yield_amount).toLocaleString()} ${form.yield_unit}`;
  entries.value.push({
    id: crypto.randomUUID(),
    rsbsa_no: form.rsbsa_no,
    surname: form.surname,
    first_name: form.first_name,
    middle_name: form.middle_name,
    ext_name: form.ext_name,
    farm_location: form.farm_location,
    crop_type: form.crop_type,
    variety: form.variety,
    area_harvested: Number(form.area_harvested),
    yield_amount: Number(form.yield_amount),
    yield_unit: form.yield_unit,
    yield_display: yieldDisplay,
    date_of_harvest: form.date_of_harvest,
  });
  resetForm();
  const t = await toastController.create({ message: 'Harvest record added.', color: 'success', duration: 1800, position: 'top' });
  await t.present();
};

const exportForm = async () => {
  if (!entries.value.length) return;
  printCrop.value = entries.value[0]?.crop_type || 'Rice';
  printRows.value = entries.value.map((e) => ({
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
  }));
  setTimeout(() => window.print(), 350);
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
  --background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 10px;
}

.form-card, .table-card {
  background: white; border: 1px solid #e2e8f0; border-radius: 12px;
  padding: 1rem; margin-bottom: 1rem;
}
.form-card h3, .table-head h3 { margin: 0 0 0.75rem; color: #1a4731; font-weight: 800; }
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

.table-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
.totals { font-weight: 700; color: #1a4731; }
</style>
