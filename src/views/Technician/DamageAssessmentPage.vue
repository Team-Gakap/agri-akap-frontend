<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="danger">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Report Damage</ion-title>
        <ion-buttons slot="end">
          <ion-chip :color="syncStore.online ? 'light' : 'warning'">
            <ion-icon :icon="syncStore.online ? cloudDoneOutline : cloudOfflineOutline"></ion-icon>
            <ion-label>{{ syncStore.online ? 'Online' : 'Offline' }}</ion-label>
          </ion-chip>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding auth-bg">
      <div class="form-wrapper">

        <!-- STEP 1: IDENTIFY FARMER BY QR -->
        <template v-if="!farmer">
          <div class="header-section mb-3">
            <h2>Step 1: Identify Farmer</h2>
            <p class="text-muted small">Scan the farmer's RSBSA QR ID to begin the geotagged assessment.</p>
          </div>

          <ion-card class="form-card">
            <ion-card-content>
              <ion-button expand="block" color="danger" class="scan-btn" @click="scanFarmer" :disabled="isLooking">
                <ion-icon slot="start" :icon="qrCodeOutline"></ion-icon>
                {{ isLooking ? 'Searching...' : 'Scan Farmer QR ID' }}
              </ion-button>

              <div class="dev-box">
                <p class="dev-label">MANUAL ENTRY / BYPASS</p>
                <ion-input v-model="manualQr" placeholder="Paste Farmer UUID / RSBSA" class="dev-input"></ion-input>
                <ion-button expand="block" fill="outline" color="medium" @click="lookup(manualQr)" :disabled="isLooking">
                  Find Farmer
                </ion-button>
              </div>

              <p v-if="lookupError" class="error-text">{{ lookupError }}</p>
            </ion-card-content>
          </ion-card>
        </template>

        <!-- STEP 2: ASSESSMENT FORM -->
        <template v-else>
          <ion-card class="farmer-banner">
            <ion-card-content>
              <div class="banner-row">
                <div>
                  <p class="banner-name">{{ farmer.first_name }} {{ farmer.surname }}</p>
                  <p class="banner-sub">{{ farmer.rsbsa_no || 'No RSBSA' }} &middot; {{ farmer.permanent_brgy }}</p>
                </div>
                <ion-button size="small" fill="clear" color="dark" @click="resetFarmer">
                  <ion-icon slot="start" :icon="swapHorizontalOutline"></ion-icon>Change
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>

          <ion-card class="form-card">
            <ion-card-content>
              <ion-item class="custom-input">
                <ion-select v-model="form.farm_plot_id" label="Affected Farm Plot *" label-placement="floating" @ionChange="onPlotChange">
                  <ion-select-option v-for="plot in plots" :key="plot.id" :value="plot.id">
                    {{ plot.commodity }} - {{ plot.size_ha }} ha ({{ plot.location_brgy }})
                  </ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item class="custom-input">
                <ion-select v-model="form.calamity_type" label="Calamity Type *" label-placement="floating">
                  <ion-select-option value="Typhoon">Typhoon</ion-select-option>
                  <ion-select-option value="Flood">Flood</ion-select-option>
                  <ion-select-option value="Drought">Drought</ion-select-option>
                  <ion-select-option value="Pest Outbreak">Pest Outbreak</ion-select-option>
                  <ion-select-option value="Hail">Hail</ion-select-option>
                  <ion-select-option value="Other">Other</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item class="custom-input">
                <ion-input v-model="form.calamity_name" label="Calamity Detail" label-placement="floating" placeholder="e.g., Typhoon Egay"></ion-input>
              </ion-item>

              <ion-item class="custom-input">
                <ion-select v-model="form.crop_stage" label="Crop Stage" label-placement="floating" placeholder="Select stage">
                  <ion-select-option value="Seedling">Seedling</ion-select-option>
                  <ion-select-option value="Vegetative">Vegetative</ion-select-option>
                  <ion-select-option value="Reproductive">Reproductive</ion-select-option>
                  <ion-select-option value="Maturity">Maturity</ion-select-option>
                  <ion-select-option value="Harvested">Harvested</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item class="custom-input">
                <ion-input type="date" v-model="form.date_of_calamity" label="Date of Calamity *" label-placement="floating"></ion-input>
              </ion-item>

              <ion-row>
                <ion-col size="6">
                  <ion-item class="custom-input">
                    <ion-input type="number" v-model="form.damage_percentage" label="Damage % *" label-placement="floating" placeholder="0 - 100"></ion-input>
                  </ion-item>
                </ion-col>
                <ion-col size="6">
                  <ion-item class="custom-input">
                    <ion-input type="number" v-model="form.area_destroyed_ha" label="Area Destroyed (ha) *" label-placement="floating" :max="selectedPlotSize" placeholder="0.00"></ion-input>
                  </ion-item>
                </ion-col>
              </ion-row>

              <ion-item class="custom-input">
                <ion-input type="number" v-model="form.estimated_value_lost" label="Est. Loss (PHP)" label-placement="floating" placeholder="0.00"></ion-input>
              </ion-item>

              <div class="evidence-section mt-4">
                <h3 class="section-title">Geotagged Evidence</h3>

                <div v-if="photoPreview" class="photo-preview-box mb-3">
                  <img :src="photoPreview" alt="Damage Evidence" />
                  <div class="gps-watermark" v-if="form.latitude">
                    {{ form.calamity_type || 'CALAMITY' }}<br>
                    {{ form.crop_stage || 'Stage N/A' }}<br>
                    LAT: {{ form.latitude.toFixed(5) }}<br>
                    LNG: {{ form.longitude.toFixed(5) }}
                  </div>
                </div>

                <ion-button expand="block" color="medium" fill="outline" @click="captureEvidence">
                  <ion-icon slot="start" :icon="cameraOutline"></ion-icon>
                  {{ photoPreview ? 'Retake Photo' : 'Capture Geotagged Photo' }}
                </ion-button>
              </div>

              <ion-button
                expand="block"
                color="danger"
                class="mt-4"
                @click="submitAssessment"
                :disabled="isSubmitting || !photoPreview || !form.farm_plot_id || !form.calamity_type || !form.area_destroyed_ha"
              >
                <ion-icon slot="start" :icon="cloudUploadOutline"></ion-icon>
                {{ submitLabel }}
              </ion-button>
            </ion-card-content>
          </ion-card>
        </template>

      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonCard, IonCardContent, IonItem, IonInput, IonSelect, IonSelectOption,
  IonRow, IonCol, IonButton, IonIcon, IonChip, IonLabel, toastController,
} from '@ionic/vue';
import {
  cameraOutline, cloudUploadOutline, qrCodeOutline, swapHorizontalOutline,
  cloudDoneOutline, cloudOfflineOutline,
} from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import apiClient from '@/utils/axios';
import { useSyncStore } from '@/stores/syncStore';
import { isOnline, lookupFarmer, queueAssessment } from '@/services/syncService';

const syncStore = useSyncStore();

const farmer = ref<any>(null);
const plots = ref<any[]>([]);
const manualQr = ref('');
const isLooking = ref(false);
const lookupError = ref('');

const isSubmitting = ref(false);
const photoPreview = ref<string | null>(null);

const form = ref({
  farm_plot_id: '',
  calamity_type: '',
  calamity_name: '',
  crop_stage: '',
  area_destroyed_ha: null as number | null,
  date_of_calamity: new Date().toISOString().split('T')[0],
  damage_percentage: null as number | null,
  estimated_value_lost: null as number | null,
  latitude: 0,
  longitude: 0,
  photo_base64: '',
});

const selectedPlotSize = computed(() => {
  const plot = plots.value.find(p => p.id === form.value.farm_plot_id);
  return plot?.size_ha ?? null;
});

const submitLabel = computed(() => {
  if (isSubmitting.value) return 'Submitting...';
  return syncStore.online ? 'Submit Notice of Claim' : 'Save Notice Offline';
});

const onPlotChange = () => {
  const plot = plots.value.find(p => p.id === form.value.farm_plot_id);
  if (plot?.size_ha && !form.value.area_destroyed_ha) {
    form.value.area_destroyed_ha = Number(plot.size_ha);
  }
};

const toast = async (message: string, color = 'primary') => {
  const t = await toastController.create({ message, duration: 2500, color, position: 'top' });
  await t.present();
};

const lookup = async (qr: string) => {
  if (!qr || !qr.trim()) {
    lookupError.value = 'Enter or scan a farmer QR / UUID first.';
    return;
  }
  isLooking.value = true;
  lookupError.value = '';
  try {
    const result = await lookupFarmer(qr);
    if (!result) {
      lookupError.value = 'No registered farmer matches this QR code (and no offline cache).';
      return;
    }
    farmer.value = result;
    plots.value = result.farm_plots ?? result.farmPlots ?? [];
    form.value.farm_plot_id = plots.value.length ? plots.value[0].id : '';
  } catch (e: any) {
    lookupError.value = e.response?.data?.message || 'Lookup failed.';
  } finally {
    isLooking.value = false;
  }
};

const scanFarmer = async () => {
  try {
    const { camera } = await BarcodeScanner.requestPermissions();
    if (camera !== 'granted' && camera !== 'limited') {
      lookupError.value = 'Camera permission is required to scan IDs.';
      return;
    }
    const { barcodes } = await BarcodeScanner.scan();
    if (barcodes.length > 0 && barcodes[0].rawValue) {
      await lookup(barcodes[0].rawValue);
    }
  } catch (e) {
    lookupError.value = 'Scanner failed to start. Use manual entry instead.';
  }
};

const resetFarmer = () => {
  farmer.value = null;
  plots.value = [];
  photoPreview.value = null;
  manualQr.value = '';
  form.value.photo_base64 = '';
  form.value.farm_plot_id = '';
};

const captureEvidence = async () => {
  try {
    const coordinates = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
    form.value.latitude = coordinates.coords.latitude;
    form.value.longitude = coordinates.coords.longitude;
  } catch {
    await toast('GPS unavailable. Photo will still be captured but coordinates may be missing.', 'warning');
  }

  try {
    const image = await Camera.getPhoto({
      quality: 70,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
    });

    photoPreview.value = `data:image/jpeg;base64,${image.base64String}`;
    form.value.photo_base64 = `data:image/jpeg;base64,${image.base64String}`;
  } catch {
    await toast('Camera access failed. A geotagged photo is required.', 'danger');
  }
};

const submitAssessment = async () => {
  if (!form.value.calamity_type) {
    await toast('Select a calamity type before submitting.', 'danger');
    return;
  }
  if (!form.value.area_destroyed_ha || Number(form.value.area_destroyed_ha) <= 0) {
    await toast('Enter the area destroyed in hectares.', 'danger');
    return;
  }
  if (selectedPlotSize.value && Number(form.value.area_destroyed_ha) > Number(selectedPlotSize.value)) {
    await toast(`Area destroyed cannot exceed the plot size (${selectedPlotSize.value} ha).`, 'danger');
    return;
  }
  if (!form.value.photo_base64) {
    await toast('A geotagged photo is strictly required for LGU validation.', 'danger');
    return;
  }

  isSubmitting.value = true;

  const payload = {
    farm_plot_id: form.value.farm_plot_id,
    farmer_id: farmer.value?.id,
    farmer_name: `${farmer.value?.first_name ?? ''} ${farmer.value?.surname ?? ''}`.trim(),
    calamity_type: form.value.calamity_type,
    calamity_name: form.value.calamity_name || form.value.calamity_type,
    crop_stage: form.value.crop_stage || null,
    area_destroyed_ha: Number(form.value.area_destroyed_ha),
    date_of_calamity: form.value.date_of_calamity,
    damage_percentage: Number(form.value.damage_percentage),
    estimated_value_lost: form.value.estimated_value_lost != null ? Number(form.value.estimated_value_lost) : null,
    latitude: form.value.latitude || null,
    longitude: form.value.longitude || null,
    photo_base64: form.value.photo_base64,
  };

  try {
    if (isOnline()) {
      const res = await apiClient.post('/damage-assessments', payload);
      await toast(res.data.message || 'Notice of claim filed.', 'success');
    } else {
      await queueAssessment(payload);
      await syncStore.refreshCount();
      await toast('Notice saved offline. It will sync when reconnected.', 'warning');
    }
    resetFarmer();
    form.value.calamity_type = '';
    form.value.calamity_name = '';
    form.value.crop_stage = '';
    form.value.area_destroyed_ha = null;
    form.value.damage_percentage = null;
    form.value.estimated_value_lost = null;
  } catch (error: any) {
    // Network failure while "online": fall back to the offline queue.
    try {
      await queueAssessment(payload);
      await syncStore.refreshCount();
      await toast('Upload failed - saved offline for later sync.', 'warning');
      resetFarmer();
    } catch {
      await toast(error.response?.data?.message || 'Failed to submit report.', 'danger');
    }
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.auth-bg { --background: #f4f8f5; }
.form-wrapper { max-width: 600px; margin: 0 auto; padding-top: 1rem; }
.text-muted { color: #6c757d; }
.small { font-size: 0.9rem; }
.mb-3 { margin-bottom: 1rem; }
.mt-4 { margin-top: 1.5rem; }

.header-section h2 { color: #1a4731; font-weight: 800; margin: 0 0 4px; }

.form-card { border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.03); border: 1px solid #e2e8f0; margin: 0; border-top: 4px solid #c0392b; }
.custom-input { --background: #ffffff; border-radius: 8px; margin-bottom: 0.8rem; box-shadow: 0 2px 4px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; }
.scan-btn { height: 60px; font-weight: 800; letter-spacing: 0.5px; }

.dev-box { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px dashed #ccc; }
.dev-label { font-size: 0.75rem; color: #94a3b8; margin: 0 0 0.5rem; letter-spacing: 1px; }
.dev-input { --background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 0.6rem; }
.error-text { color: #c0392b; margin-top: 1rem; font-weight: 600; }

.farmer-banner { border-radius: 12px; border-left: 5px solid #1a4731; margin: 0 0 1rem; }
.banner-row { display: flex; justify-content: space-between; align-items: center; }
.banner-name { font-weight: 800; color: #1a4731; margin: 0; font-size: 1.1rem; }
.banner-sub { color: #64748b; margin: 2px 0 0; font-size: 0.85rem; }

.section-title { font-size: 1rem; color: #1a4731; font-weight: 800; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 15px; }
.photo-preview-box { position: relative; width: 100%; max-height: 300px; overflow: hidden; border-radius: 8px; border: 2px dashed #c0392b; background: #000; display: flex; align-items: center; justify-content: center; }
.photo-preview-box img { width: 100%; height: auto; opacity: 0.85; }
.gps-watermark { position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.7); color: #00ff00; padding: 5px 10px; font-family: monospace; font-size: 0.8rem; border-radius: 4px; font-weight: 700; z-index: 2; }
</style>
