<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tech/farm-profiling"></ion-back-button>
        </ion-buttons>
        <ion-title>Pin Farm Location</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding page-bg">
      <p class="lede">
        Save the farm’s GPS location. A new pin cannot be too close to another farm.
      </p>

      <!-- GPS lock -->
      <ion-card class="gps-card" :class="{ locked: gpsLocked }">
        <ion-card-content>
          <p class="gps-label">Parcel coordinates</p>
          <p v-if="form.latitude != null" class="gps-coords">
            {{ form.latitude.toFixed(6) }}, {{ form.longitude!.toFixed(6) }}
          </p>
          <p v-else class="gps-coords muted">Not locked yet</p>
          <ion-chip v-if="gpsLocked" color="success" class="lock-chip">
            <ion-icon :icon="lockClosedOutline"></ion-icon>
            <ion-label>GPS locked</ion-label>
          </ion-chip>
          <ion-button
            expand="block"
            :color="gpsLocked ? 'medium' : 'primary'"
            :disabled="locating"
            class="gps-btn"
            @click="getCurrentLocation"
          >
            <ion-icon slot="start" :icon="locateOutline"></ion-icon>
            {{ locating ? 'Acquiring high-accuracy GPS…' : (gpsLocked ? 'Re-lock Current Location' : 'Get Current Location') }}
          </ion-button>
        </ion-card-content>
      </ion-card>

      <!-- Farmer -->
      <div class="search-box">
        <ion-input
          class="field"
          label="Search Farmer (RSBSA / Name) *"
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
        <div class="ro"><span class="lbl">Farmer</span><span>{{ form.surname }}, {{ form.first_name }}</span></div>
      </div>

      <ion-list class="form-list">
        <ion-item>
          <ion-input
            label="Barangay *"
            label-placement="stacked"
            :value="form.location_brgy"
            @ionInput="(e: any) => form.location_brgy = e.detail.value"
          ></ion-input>
        </ion-item>
        <ion-item>
          <ion-select
            label="Ownership Type *"
            label-placement="stacked"
            interface="popover"
            :value="form.ownership_type"
            @ionChange="(e: any) => form.ownership_type = e.detail.value"
          >
            <ion-select-option value="Owner">Owner</ion-select-option>
            <ion-select-option value="Tenant">Tenant</ion-select-option>
            <ion-select-option value="Lessee">Lessee</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item v-if="form.ownership_type !== 'Owner'">
          <ion-input
            label="Landowner Name *"
            label-placement="stacked"
            :value="form.landowner_name"
            placeholder="Registered landowner full name"
            @ionInput="(e: any) => form.landowner_name = e.detail.value"
          ></ion-input>
        </ion-item>
        <ion-item>
          <ion-select
            label="Commodity *"
            label-placement="stacked"
            interface="popover"
            :value="form.commodity"
            @ionChange="(e: any) => form.commodity = e.detail.value"
          >
            <ion-select-option value="Rice">Rice</ion-select-option>
            <ion-select-option value="Corn">Corn</ion-select-option>
            <ion-select-option value="Tobacco">Tobacco</ion-select-option>
            <ion-select-option value="Vegetables">Vegetables</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-input
            type="number"
            label="Parcel Size (ha) *"
            label-placement="stacked"
            :value="form.size_ha"
            @ionInput="(e: any) => form.size_ha = e.detail.value"
          ></ion-input>
        </ion-item>
        <ion-item>
          <ion-input
            label="Remarks"
            label-placement="stacked"
            :value="form.remarks"
            @ionInput="(e: any) => form.remarks = e.detail.value"
          ></ion-input>
        </ion-item>
      </ion-list>

      <ion-button
        expand="block"
        class="save-btn"
        :disabled="!canSave || submitting"
        @click="submitGeotag"
      >
        {{ submitting ? 'Registering…' : 'Register Farm Plot' }}
      </ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { reactive, computed, ref } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonCard, IonCardContent, IonButton, IonIcon, IonChip, IonLabel, IonInput,
  IonSelect, IonSelectOption, IonList, IonItem, alertController, toastController,
} from '@ionic/vue';
import { locateOutline, lockClosedOutline } from 'ionicons/icons';
import { Geolocation } from '@capacitor/geolocation';
import apiClient from '@/utils/axios';
import {
  useBarangayFarmerSearch,
  type FarmerOption,
} from '@/composables/useBarangayFarmerSearch';

const farmerSearch = useBarangayFarmerSearch(() => null, { requireBarangay: false });
const locating = ref(false);
const gpsLocked = ref(false);
const submitting = ref(false);

const form = reactive({
  farmer_id: '',
  rsbsa_no: '',
  surname: '',
  first_name: '',
  location_brgy: '',
  ownership_type: 'Owner',
  landowner_name: '',
  commodity: 'Rice',
  size_ha: '',
  remarks: '',
  latitude: null as number | null,
  longitude: null as number | null,
});

const canSave = computed(() => {
  const tenureOk = form.ownership_type === 'Owner' || !!form.landowner_name.trim();
  return (
    !!form.farmer_id
    && !!form.location_brgy
    && !!form.size_ha
    && form.latitude != null
    && form.longitude != null
    && gpsLocked.value
    && tenureOk
  );
});

const onSelectFarmer = async (f: FarmerOption) => {
  await farmerSearch.selectFarmer(f);
  const sel = farmerSearch.selected.value;
  if (!sel) return;
  form.farmer_id = sel.id;
  form.rsbsa_no = sel.rsbsa_no;
  form.surname = sel.surname;
  form.first_name = sel.first_name;
  form.location_brgy = sel.barangay || form.location_brgy;
};

const getCurrentLocation = async () => {
  locating.value = true;
  gpsLocked.value = false;
  try {
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
    form.latitude = pos.coords.latitude;
    form.longitude = pos.coords.longitude;
    gpsLocked.value = true;
    const t = await toastController.create({
      message: `GPS locked · ±${Math.round(pos.coords.accuracy || 0)} m accuracy`,
      duration: 2200,
      color: 'success',
      position: 'top',
    });
    await t.present();
  } catch {
    const t = await toastController.create({
      message: 'Unable to acquire high-accuracy GPS. Check location permissions.',
      duration: 2800,
      color: 'warning',
      position: 'top',
    });
    await t.present();
  } finally {
    locating.value = false;
  }
};

const showCollisionAlert = async (message: string) => {
  const alert = await alertController.create({
    header: 'Coordinate Collision',
    subHeader: 'Double-claim blocked',
    message: message
      || 'This land parcel is already registered to another user. Please verify tenancy/ownership.',
    cssClass: 'collision-alert',
    buttons: ['OK'],
  });
  await alert.present();
};

const submitGeotag = async () => {
  if (!canSave.value || submitting.value) return;
  submitting.value = true;
  try {
    await apiClient.post('/farm-plots', {
      farmer_id: form.farmer_id,
      latitude: form.latitude,
      longitude: form.longitude,
      location_brgy: form.location_brgy,
      location_city: 'Echague',
      location_province: 'Isabela',
      ownership_type: form.ownership_type,
      landowner_name: form.ownership_type === 'Owner' ? null : form.landowner_name,
      commodity: form.commodity,
      size_ha: Number(form.size_ha),
      remarks: form.remarks || null,
    });
    const t = await toastController.create({
      message: 'Farm plot geotagged and registered.',
      duration: 2600,
      color: 'success',
      position: 'top',
    });
    await t.present();
    // Reset parcel fields; keep farmer if encoding multiple plots
    form.size_ha = '';
    form.remarks = '';
    form.landowner_name = '';
    form.latitude = null;
    form.longitude = null;
    gpsLocked.value = false;
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    if (status === 409 || data?.error === 'Coordinate Collision') {
      await showCollisionAlert(data?.message);
      return;
    }
    const t = await toastController.create({
      message: data?.message || 'Failed to register farm plot.',
      duration: 2800,
      color: 'danger',
      position: 'top',
    });
    await t.present();
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.page-bg { --background: #f4f8f5; }
.lede { margin: 0 0 0.85rem; font-size: 0.88rem; color: #64748b; line-height: 1.4; }
.gps-card {
  margin: 0 0 0.85rem;
  border-radius: 14px;
  border: 2px solid #e2e8f0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.gps-card.locked { border-color: #2e7d32; background: #f1f8f4; }
.gps-label { margin: 0; font-size: 0.72rem; font-weight: 800; color: #64748b; text-transform: uppercase; }
.gps-coords { margin: 0.4rem 0 0.65rem; font-size: 1.15rem; font-weight: 900; color: #1a4731; letter-spacing: 0.02em; }
.gps-coords.muted { color: #94a3b8; font-weight: 600; font-size: 1rem; }
.lock-chip { margin: 0 0 0.65rem; }
.gps-btn { text-transform: none; font-weight: 800; margin: 0; min-height: 48px; }
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
  padding: 0.65rem 0.75rem; cursor: pointer;
  display: flex; flex-direction: column; border-bottom: 1px solid #f1f5f9;
}
.suggest li:active { background: #e8f5e9; }
.suggest li span { font-size: 0.78rem; color: #64748b; }
.demo-card {
  background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
  padding: 0.65rem; margin-bottom: 0.75rem; display: flex; flex-direction: column; gap: 0.35rem;
}
.ro { display: flex; flex-direction: column; }
.lbl { font-size: 0.65rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
.form-list {
  background: #fff; border-radius: 12px; border: 1px solid #e2e8f0;
  margin-bottom: 0.85rem; overflow: hidden;
}
.save-btn {
  --background: #1a4731;
  text-transform: none;
  font-weight: 800;
  min-height: 52px;
  margin-bottom: 1.75rem;
}
</style>
