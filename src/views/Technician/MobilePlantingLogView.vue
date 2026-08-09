<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tech/field"></ion-back-button>
        </ion-buttons>
        <ion-title>Planting Log</ion-title>
      </ion-toolbar>
      <ion-toolbar color="primary">
        <ion-segment :value="form.crop" color="light" @ionChange="(e: any) => form.crop = e.detail.value">
          <ion-segment-button value="Rice">
            <ion-label>Rice</ion-label>
          </ion-segment-button>
          <ion-segment-button value="Corn">
            <ion-label>Corn</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding page-bg">
      <p class="lede">
        On-site planting entry for LGU masterlist (Rice/Corn · Active/Not Continued · water source).
      </p>

      <div class="search-box">
        <ion-input
          class="field"
          label="Search Farmer (RSBSA / Name)"
          label-placement="stacked"
          :value="farmerSearch.query.value"
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

      <div v-if="farmerSearch.selected.value" class="demo-card">
        <div class="ro"><span class="lbl">RSBSA</span><span>{{ form.rsbsa_no }}</span></div>
        <div class="ro"><span class="lbl">Farmer</span><span>{{ form.surname }}, {{ form.first_name }} {{ form.middle_name }}</span></div>
        <div class="ro"><span class="lbl">Address</span><span>{{ form.farmer_address }}</span></div>
      </div>

      <ion-list class="form-list">
        <ion-item>
          <ion-input
            label="Variety *"
            label-placement="stacked"
            :value="form.variety"
            placeholder="e.g. Sticky Rice / Sweet Corn"
            @ionInput="(e: any) => form.variety = e.detail.value"
          ></ion-input>
        </ion-item>
        <ion-item>
          <ion-input
            type="number"
            label="Area Planted (ha) *"
            label-placement="stacked"
            :value="form.area_planted"
            @ionInput="(e: any) => form.area_planted = e.detail.value"
          ></ion-input>
        </ion-item>
        <ion-item>
          <ion-input
            type="date"
            label="Date of Planting *"
            label-placement="stacked"
            :value="form.date_of_planting"
            @ionInput="(e: any) => form.date_of_planting = e.detail.value"
          ></ion-input>
        </ion-item>
        <ion-item>
          <ion-select
            label="Status *"
            label-placement="stacked"
            interface="popover"
            :value="form.planting_status"
            @ionChange="(e: any) => form.planting_status = e.detail.value"
          >
            <ion-select-option value="Active">Active</ion-select-option>
            <ion-select-option value="Not Continued">Not Continued</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-select
            label="Water Source *"
            label-placement="stacked"
            interface="popover"
            :value="form.water_source"
            @ionChange="(e: any) => form.water_source = e.detail.value"
          >
            <ion-select-option value="Deepwell">Deepwell</ion-select-option>
            <ion-select-option value="Irrigated">Irrigated</ion-select-option>
            <ion-select-option value="Rainfed/None">Rainfed/None</ion-select-option>
          </ion-select>
        </ion-item>
      </ion-list>

      <ion-card class="gps-card">
        <ion-card-content>
          <p class="gps-label">Field GPS</p>
          <p v-if="form.latitude != null" class="gps-coords">
            {{ form.latitude.toFixed(6) }}, {{ form.longitude!.toFixed(6) }}
          </p>
          <p v-else class="gps-coords muted">No pin yet</p>
          <ion-button expand="block" fill="outline" :disabled="capturingGps" @click="captureGps">
            <ion-icon slot="start" :icon="locateOutline"></ion-icon>
            {{ capturingGps ? 'Capturing…' : 'Capture GPS Location' }}
          </ion-button>
        </ion-card-content>
      </ion-card>

      <ion-button expand="block" class="save-btn" :disabled="!canSave || saving" @click="saveRecord">
        {{ saving ? 'Saving…' : 'Save to LGU Masterlist' }}
      </ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { reactive, computed, ref } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonSegment, IonSegmentButton, IonLabel, IonInput, IonSelect, IonSelectOption,
  IonList, IonItem, IonButton, IonIcon, IonCard, IonCardContent, toastController,
} from '@ionic/vue';
import { locateOutline } from 'ionicons/icons';
import { Geolocation } from '@capacitor/geolocation';
import {
  useBarangayFarmerSearch,
  formatBirthday,
  type FarmerOption,
} from '@/composables/useBarangayFarmerSearch';
import { queuePlantingLog } from '@/services/syncService';
import { useSyncStore } from '@/stores/syncStore';

const farmerSearch = useBarangayFarmerSearch(() => null, { requireBarangay: false });
const syncStore = useSyncStore();
const capturingGps = ref(false);
const saving = ref(false);

const form = reactive({
  farmer_id: '',
  rsbsa_no: '',
  surname: '',
  first_name: '',
  middle_name: '',
  ext_name: '',
  birthdate: '',
  farmer_address: '',
  crop: 'Rice',
  variety: '',
  area_planted: '',
  date_of_planting: new Date().toISOString().slice(0, 10),
  planting_status: 'Active',
  water_source: 'Deepwell',
  latitude: null as number | null,
  longitude: null as number | null,
});

const canSave = computed(() =>
  !!form.farmer_id
  && !!form.variety
  && !!form.area_planted
  && !!form.date_of_planting
  && form.latitude != null
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
  form.birthdate = formatBirthday(sel.birthdate);
  form.farmer_address = sel.address;
  if (sel.plots.length === 1) {
    form.area_planted = String(sel.plots[0].size_ha || '');
    if (sel.plots[0].commodity === 'Rice' || sel.plots[0].commodity === 'Corn') {
      form.crop = sel.plots[0].commodity;
    }
  }
};

const captureGps = async () => {
  capturingGps.value = true;
  try {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    form.latitude = pos.coords.latitude;
    form.longitude = pos.coords.longitude;
    const t = await toastController.create({
      message: 'GPS pin captured for this planting record.',
      duration: 2000,
      color: 'success',
      position: 'top',
    });
    await t.present();
  } catch {
    const t = await toastController.create({
      message: 'Unable to read GPS. Enable location and retry.',
      duration: 2500,
      color: 'warning',
      position: 'top',
    });
    await t.present();
  } finally {
    capturingGps.value = false;
  }
};

const saveRecord = async () => {
  if (!canSave.value || saving.value) return;
  saving.value = true;
  try {
    await queuePlantingLog({
      farmer_id: form.farmer_id,
      rsbsa_no: form.rsbsa_no,
      farmer_name: `${form.surname}, ${form.first_name} ${form.middle_name}`.trim(),
      crop_type: form.crop,
      variety: form.variety,
      area_planted: Number(form.area_planted),
      date_planted: form.date_of_planting,
      status: form.planting_status,
      water_source: form.water_source,
      latitude: form.latitude,
      longitude: form.longitude,
    });
    await syncStore.refreshCount();
    if (syncStore.online) {
      void syncStore.sync();
    }
    const t = await toastController.create({
      message: 'Saved Locally. Will sync when online.',
      duration: 2800,
      color: 'success',
      position: 'top',
    });
    await t.present();
    form.variety = '';
    form.area_planted = '';
    form.planting_status = 'Active';
    form.water_source = 'Deepwell';
    form.latitude = null;
    form.longitude = null;
    farmerSearch.clearSelection();
    form.farmer_id = '';
    form.rsbsa_no = '';
    form.surname = '';
    form.first_name = '';
    form.middle_name = '';
    form.ext_name = '';
    form.birthdate = '';
    form.farmer_address = '';
  } catch (err) {
    console.warn('[AGRI-AKAP] Failed to queue planting log:', err);
    const t = await toastController.create({
      message: 'Could not save locally. Please try again.',
      duration: 2500,
      color: 'danger',
      position: 'top',
    });
    await t.present();
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.page-bg { --background: #f4f8f5; }
.lede { margin: 0 0 0.85rem; font-size: 0.88rem; color: #64748b; line-height: 1.4; }
.search-box { position: relative; margin-bottom: 0.75rem; }
.field {
  --background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0 10px;
}
.hint { font-size: 0.8rem; color: #94a3b8; margin-top: 4px; }
.suggest {
  list-style: none; margin: 4px 0 0; padding: 0;
  border: 1px solid #e2e8f0; border-radius: 10px; background: #fff;
  max-height: 200px; overflow: auto;
}
.suggest li {
  padding: 0.55rem 0.75rem; cursor: pointer;
  display: flex; flex-direction: column; border-bottom: 1px solid #f1f5f9;
}
.suggest li:active { background: #e8f5e9; }
.suggest li span { font-size: 0.78rem; color: #64748b; }
.demo-card {
  background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
  padding: 0.65rem; margin-bottom: 0.75rem; display: flex; flex-direction: column; gap: 0.4rem;
}
.ro { display: flex; flex-direction: column; }
.lbl { font-size: 0.65rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
.form-list {
  background: #fff; border-radius: 12px; border: 1px solid #e2e8f0;
  margin-bottom: 0.75rem; overflow: hidden;
}
.gps-card {
  margin: 0 0 0.85rem; border-radius: 12px; border: 1px solid #e2e8f0;
}
.gps-label { margin: 0; font-size: 0.72rem; font-weight: 800; color: #64748b; text-transform: uppercase; }
.gps-coords { margin: 0.35rem 0 0.65rem; font-weight: 700; color: #1a4731; font-size: 0.95rem; }
.gps-coords.muted { color: #94a3b8; font-weight: 600; }
.save-btn { --background: #1a4731; text-transform: none; font-weight: 800; margin-bottom: 1.5rem; }
</style>
