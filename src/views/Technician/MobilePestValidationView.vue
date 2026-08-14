<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tech/field"></ion-back-button>
        </ion-buttons>
        <ion-title>Check Pests</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding page-bg">
      <p class="lede">
        On-site pest &amp; disease monitoring — GPS pin + photo evidence for LGU masterlist.
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
        <div class="ro"><span class="lbl">Farmer</span><span>{{ form.surname }}, {{ form.first_name }}</span></div>
        <div class="ro"><span class="lbl">Address</span><span>{{ form.farmer_address }}</span></div>
      </div>

      <ion-list class="form-list">
        <ion-item>
          <ion-input
            label="Crop Variety *"
            label-placement="stacked"
            :value="form.variety"
            placeholder="e.g. Hybrid Yellow"
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
            type="number"
            label="Days After Planting *"
            label-placement="stacked"
            :value="form.days_after_planting"
            @ionInput="(e: any) => form.days_after_planting = e.detail.value"
          ></ion-input>
        </ion-item>
        <ion-item>
          <ion-label position="stacked">Area Damage (%) *</ion-label>
          <ion-range
            :min="0"
            :max="100"
            :step="1"
            :value="Number(form.area_damage_pct) || 0"
            pin
            color="danger"
            @ionChange="(e: any) => form.area_damage_pct = String(e.detail.value)"
          ></ion-range>
          <ion-note slot="end">{{ form.area_damage_pct || 0 }}%</ion-note>
        </ion-item>
        <ion-item>
          <ion-input
            label="Damage by Pest/Disease *"
            label-placement="stacked"
            :value="form.damage_by"
            placeholder="e.g. Fall Armyworm"
            @ionInput="(e: any) => form.damage_by = e.detail.value"
          ></ion-input>
        </ion-item>
      </ion-list>

      <ion-card class="hw-card">
        <ion-card-content>
          <p class="hw-label">Outbreak GPS</p>
          <p v-if="form.latitude != null" class="hw-coords">
            {{ form.latitude.toFixed(6) }}, {{ form.longitude!.toFixed(6) }}
          </p>
          <p v-else class="hw-coords muted">No pin yet</p>
          <ion-button expand="block" fill="outline" :disabled="capturingGps" @click="dropGpsPin">
            <ion-icon slot="start" :icon="locateOutline"></ion-icon>
            {{ capturingGps ? 'Dropping pin…' : 'Drop GPS Pin' }}
          </ion-button>
        </ion-card-content>
      </ion-card>

      <ion-card class="hw-card">
        <ion-card-content>
          <p class="hw-label">Photo Evidence</p>
          <img v-if="form.photo_preview" :src="form.photo_preview" alt="Pest evidence" class="photo-prev" />
          <p v-else class="hw-coords muted">No photo yet</p>
          <ion-button expand="block" fill="outline" color="secondary" :disabled="capturingPhoto" @click="capturePhoto">
            <ion-icon slot="start" :icon="cameraOutline"></ion-icon>
            {{ capturingPhoto ? 'Opening camera…' : 'Capture Photo Evidence' }}
          </ion-button>
        </ion-card-content>
      </ion-card>

      <ion-button expand="block" class="save-btn" :disabled="!canSave || saving" @click="saveRecord">
        {{ saving ? 'Saving…' : 'Save Record' }}
      </ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { reactive, computed, ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonInput, IonList, IonItem, IonLabel, IonNote, IonRange, IonButton, IonIcon,
  IonCard, IonCardContent, toastController,
} from '@ionic/vue';
import { locateOutline, cameraOutline } from 'ionicons/icons';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import {
  useBarangayFarmerSearch,
  type FarmerOption,
} from '@/composables/useBarangayFarmerSearch';
import apiClient from '@/utils/axios';

/** Mock queue shape aligned with future tbl_pest_monitoring. */
interface PestMonitoringPayload {
  id: string;
  source: 'technician_mobile';
  farmer_id: string;
  rsbsa_no: string;
  surname: string;
  first_name: string;
  middle_name: string;
  farmer_address: string;
  variety: string;
  area_planted: number;
  days_after_planting: number;
  area_damage_pct: number;
  damage_by: string;
  latitude: number | null;
  longitude: number | null;
  photo_base64: string | null;
  synced: false;
  captured_at: string;
}

const route = useRoute();
const farmerSearch = useBarangayFarmerSearch(() => null, { requireBarangay: false });
const capturingGps = ref(false);
const capturingPhoto = ref(false);
const saving = ref(false);
const sessionQueue = ref<PestMonitoringPayload[]>([]);

const form = reactive({
  farmer_id: '',
  rsbsa_no: '',
  surname: '',
  first_name: '',
  middle_name: '',
  farmer_address: '',
  farm_plot_id: '',
  crop: 'Rice',
  variety: '',
  area_planted: '',
  days_after_planting: '',
  area_damage_pct: '0',
  damage_by: '',
  latitude: null as number | null,
  longitude: null as number | null,
  photo_preview: null as string | null,
});

const canSave = computed(() =>
  !!form.farmer_id
  && !!form.variety
  && !!form.area_planted
  && form.days_after_planting !== ''
  && form.area_damage_pct !== ''
  && !!form.damage_by
  && form.latitude != null
  && !!form.photo_preview
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
  form.farmer_address = sel.address;
  if (sel.plots.length) {
    const p = sel.plots.find((x) => ['Rice', 'Corn'].includes(x.commodity)) || sel.plots[0];
    form.farm_plot_id = p.id;
    form.area_planted = String(p.size_ha || form.area_planted);
    if (p.commodity) form.crop = p.commodity;
  }
};

onMounted(async () => {
  const farmerId = String(route.query.farmer || '').trim();
  if (!farmerId) return;
  try {
    const res = await apiClient.get(`/farmers/${farmerId}`);
    const f = res.data?.data;
    if (!f) return;
    await onSelectFarmer({
      id: f.id,
      rsbsa_no: f.rsbsa_no || '',
      surname: f.surname || '',
      first_name: f.first_name || '',
      middle_name: f.middle_name || '',
      ext_name: f.ext_name || '',
      birthdate: f.birthdate || '',
      address: f.permanent_brgy || '',
      barangay: f.permanent_brgy || '',
      plots: (f.farm_plots || f.farmPlots || []).map((p: any) => ({
        id: p.id,
        location_brgy: p.location_brgy || '',
        commodity: p.commodity || '',
        size_ha: Number(p.size_ha) || 0,
      })),
    });
  } catch (err) {
    console.warn('[AGRI-AKAP] Failed to preload farmer for pest check:', err);
  }
});

const dropGpsPin = async () => {
  capturingGps.value = true;
  try {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    form.latitude = pos.coords.latitude;
    form.longitude = pos.coords.longitude;
    const t = await toastController.create({
      message: 'GPS pin dropped on outbreak location.',
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

const capturePhoto = async () => {
  capturingPhoto.value = true;
  try {
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
    });
    form.photo_preview = photo.dataUrl || null;
    const t = await toastController.create({
      message: 'Photo evidence captured.',
      duration: 1800,
      color: 'success',
      position: 'top',
    });
    await t.present();
  } catch {
    const t = await toastController.create({
      message: 'Camera unavailable. Check permissions.',
      duration: 2500,
      color: 'warning',
      position: 'top',
    });
    await t.present();
  } finally {
    capturingPhoto.value = false;
  }
};

const saveRecord = async () => {
  if (!canSave.value || saving.value) return;
  saving.value = true;
  try {
    const payload: PestMonitoringPayload = {
      id: crypto.randomUUID(),
      source: 'technician_mobile',
      farmer_id: form.farmer_id,
      rsbsa_no: form.rsbsa_no,
      surname: form.surname,
      first_name: form.first_name,
      middle_name: form.middle_name,
      farmer_address: form.farmer_address,
      variety: form.variety,
      area_planted: Number(form.area_planted),
      days_after_planting: Number(form.days_after_planting),
      area_damage_pct: Number(form.area_damage_pct),
      damage_by: form.damage_by,
      latitude: form.latitude,
      longitude: form.longitude,
      photo_base64: form.photo_preview,
      synced: false,
      captured_at: new Date().toISOString(),
    };
    sessionQueue.value.push(payload);
    await apiClient.post('/pest-monitoring', {
      id: payload.id,
      farmer_id: form.farmer_id,
      farm_plot_id: form.farm_plot_id || undefined,
      crop: form.crop || 'Rice',
      variety: form.variety,
      area_planted: Number(form.area_planted),
      days_after_planting: Number(form.days_after_planting),
      area_damage_pct: Number(form.area_damage_pct),
      damage_by: form.damage_by,
      date_of_inspection: new Date().toISOString().slice(0, 10),
      farm_location: form.farmer_address,
      photo_base64: form.photo_preview,
      latitude: form.latitude,
      longitude: form.longitude,
    });
    const t = await toastController.create({
      message: 'Pest record saved to the LGU masterlist.',
      duration: 2800,
      color: 'success',
      position: 'top',
    });
    await t.present();
    form.variety = '';
    form.area_planted = '';
    form.days_after_planting = '';
    form.area_damage_pct = '0';
    form.damage_by = '';
    form.latitude = null;
    form.longitude = null;
    form.photo_preview = null;
    farmerSearch.clearSelection();
    form.farmer_id = '';
    form.rsbsa_no = '';
    form.surname = '';
    form.first_name = '';
    form.middle_name = '';
    form.farmer_address = '';
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
.hw-card {
  margin: 0 0 0.75rem; border-radius: 12px; border: 1px solid #e2e8f0;
}
.hw-label { margin: 0; font-size: 0.72rem; font-weight: 800; color: #64748b; text-transform: uppercase; }
.hw-coords { margin: 0.35rem 0 0.65rem; font-weight: 700; color: #1a4731; font-size: 0.95rem; }
.hw-coords.muted { color: #94a3b8; font-weight: 600; }
.photo-prev {
  display: block; width: 100%; max-height: 180px; object-fit: cover;
  border-radius: 10px; margin: 0.5rem 0 0.65rem; border: 1px solid #e2e8f0;
}
.save-btn { --background: #1a4731; text-transform: none; font-weight: 800; margin-bottom: 1.5rem; }
</style>
