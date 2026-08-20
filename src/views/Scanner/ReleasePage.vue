<template>
  <component :is="embedded ? 'div' : IonPage" class="encode-root">
    <ion-header v-if="!embedded">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tech/subsidy-dispense" text="Back"></ion-back-button>
        </ion-buttons>
        <ion-title>Confirm Release</ion-title>
        <ion-buttons slot="end">
          <ion-chip :color="syncStore.online ? 'light' : 'warning'" style="--background:rgba(255,255,255,0.15);">
            <ion-icon :icon="syncStore.online ? cloudDoneOutline : cloudOfflineOutline"></ion-icon>
            <ion-label>{{ syncStore.online ? 'Online' : 'Offline' }}</ion-label>
          </ion-chip>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <component :is="embedded ? 'div' : IonContent" class="release-bg ion-padding">
      <div class="release-wrapper">

        <!-- No context (opened directly) -->
        <ion-card v-if="!ctx" class="empty-card">
          <ion-card-content>
            <p>No verified farmer in context. Please scan a farmer ID first.</p>
            <ion-button expand="block" @click="goScan">
              <ion-icon slot="start" :icon="qrCodeOutline"></ion-icon>
              Back to Scanner
            </ion-button>
          </ion-card-content>
        </ion-card>

        <!-- SUCCESS SCREEN -->
        <template v-else-if="releaseResult">
          <ion-card :color="releaseResult.offline ? 'warning' : 'success'">
            <ion-card-header>
              <ion-icon
                :icon="releaseResult.offline ? cloudOfflineOutline : checkmarkCircleOutline"
                class="result-icon"
              ></ion-icon>
              <ion-card-title class="text-white">
                {{ releaseResult.offline ? 'Queued Offline' : 'Release Recorded' }}
              </ion-card-title>
            </ion-card-header>
            <ion-card-content class="text-white">
              <template v-if="releaseResult.offline">
                <p>This release is saved on your device and will sync automatically when reconnected. Eligibility and inventory are verified on upload.</p>
              </template>
              <template v-else>
                <h2 class="farmer-name-result">{{ releaseResult.data?.farmer_name }}</h2>
                <div class="dispense-box">
                  <span class="dispense-label">DISPENSED</span>
                  <span class="dispense-qty">{{ releaseResult.data?.quantity_dispensed }}</span>
                </div>
                <p class="remaining-note">Inventory Remaining: <strong>{{ releaseResult.data?.inventory_remaining }}</strong></p>
                <p class="sms-note">
                  <ion-icon :icon="chatbubbleEllipsesOutline"></ion-icon>
                  SMS receipt sent to the farmer's registered number.
                </p>
              </template>
            </ion-card-content>
          </ion-card>

          <ion-button expand="block" class="mt-4" @click="goScan">
            <ion-icon slot="start" :icon="qrCodeOutline"></ion-icon>
            Scan Next Farmer
          </ion-button>
        </template>

        <!-- RELEASE FORM -->
        <template v-else>
          <!-- Allocation preview -->
          <ion-card class="alloc-card">
            <ion-card-content>
              <p class="alloc-eyebrow">ALLOCATION PREVIEW</p>
              <h2 class="alloc-farmer" v-if="ctx.farmer_name">{{ ctx.farmer_name }}</h2>
              <h2 class="alloc-farmer" v-else>Farmer (offline)</h2>

              <div class="alloc-item">
                <span class="ai-label">Item</span>
                <strong>{{ ctx.item_released }}</strong>
              </div>

              <template v-if="!ctx.offline">
                <div class="alloc-grid">
                  <div class="ag-cell">
                    <span class="ag-label">Farm Size</span>
                    <span class="ag-value">{{ ctx.total_farm_size }} ha</span>
                  </div>
                  <div class="ag-cell">
                    <span class="ag-label">Eligible</span>
                    <span class="ag-value">{{ ctx.eligible_size }} ha</span>
                  </div>
                </div>
                <div class="alloc-qty-box">
                  <span class="aqb-label">TO RELEASE</span>
                  <span class="aqb-qty">{{ ctx.quantity }}</span>
                  <span class="aqb-unit">{{ ctx.unit }}</span>
                </div>
                <p class="alloc-remaining">Inventory Remaining: <strong>{{ ctx.inventory_remaining }} {{ ctx.unit }}</strong></p>
              </template>
              <div v-else class="offline-note">
                <ion-icon :icon="cloudOfflineOutline"></ion-icon>
                Offline: the exact allocation will be computed by the server on sync.
              </div>
            </ion-card-content>
          </ion-card>

          <!-- Evidence capture -->
          <ion-card class="evidence-card">
            <ion-card-content>
              <h3 class="section-title">Photo Voucher <span class="req">*required</span></h3>

              <div v-if="photoPreview" class="photo-preview-box mb-3">
                <img :src="photoPreview" alt="Release Voucher" />
                <div class="gps-watermark" v-if="geo.lat">
                  LAT: {{ geo.lat.toFixed(5) }}<br>
                  LNG: {{ geo.long.toFixed(5) }}
                </div>
              </div>

              <ion-button expand="block" color="medium" fill="outline" @click="captureVoucher">
                <ion-icon slot="start" :icon="cameraOutline"></ion-icon>
                {{ photoPreview ? 'Retake Photo' : 'Capture Photo Voucher' }}
              </ion-button>

              <p class="gps-status">
                <ion-icon :icon="locationOutline"></ion-icon>
                <span v-if="geo.source === 'device'">High-accuracy GPS locked.</span>
                <span v-else-if="geo.source === 'plot'">Using registered plot coordinates (device GPS unavailable).</span>
                <span v-else>No coordinates yet — captured with the photo.</span>
              </p>
            </ion-card-content>
          </ion-card>

          <ion-button
            expand="block"
            size="large"
            class="authorize-btn"
            :disabled="!photoPreview || isSubmitting"
            @click="authorizeRelease"
          >
            <ion-icon slot="start" :icon="checkmarkDoneOutline"></ion-icon>
            {{ authorizeLabel }}
          </ion-button>
          <p class="helper-text" v-if="!photoPreview">Capture a photo voucher to enable release.</p>
        </template>

      </div>
    </component>
  </component>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonIcon,
  IonChip, IonLabel, toastController,
} from '@ionic/vue';
import {
  qrCodeOutline, cameraOutline, locationOutline, checkmarkDoneOutline,
  checkmarkCircleOutline, chatbubbleEllipsesOutline,
  cloudDoneOutline, cloudOfflineOutline,
} from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { useRouter } from 'vue-router';
import apiClient from '@/utils/axios';
import { useSyncStore } from '@/stores/syncStore';
import { useDistributionStore } from '@/stores/distributionStore';
import { isOnline, queueDistribution } from '@/services/syncService';

const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false });
const emit = defineEmits<{ saved: []; back: [] }>();

const router = useRouter();
const syncStore = useSyncStore();
const distributionStore = useDistributionStore();

const ctx = computed(() => distributionStore.context);

const isSubmitting = ref(false);
const photoPreview = ref<string | null>(null);
const photoBase64 = ref<string>('');
const releaseResult = ref<any>(null);

const geo = ref<{ lat: number; long: number; source: 'device' | 'plot' | 'none' }>({
  lat: 0,
  long: 0,
  source: 'none',
});

const authorizeLabel = computed(() => {
  if (isSubmitting.value) return 'Recording...';
  return syncStore.online ? 'Authorize Release' : 'Save Release Offline';
});

onMounted(() => {
  // Seed best-effort coordinates from the plot fallback if provided.
  if (ctx.value?.plot_lat != null && ctx.value?.plot_long != null) {
    geo.value = { lat: Number(ctx.value.plot_lat), long: Number(ctx.value.plot_long), source: 'plot' };
  }
});

const toast = async (message: string, color = 'primary') => {
  const t = await toastController.create({ message, duration: 2600, color, position: 'top' });
  await t.present();
};

const goScan = () => {
  distributionStore.clear();
  if (props.embedded) {
    emit('back');
    return;
  }
  router.replace('/tech/subsidy-dispense');
};

const captureVoucher = async () => {
  // GPS is best-effort: a failure here keeps any plot-fallback coordinates.
  try {
    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
    geo.value = {
      lat: position.coords.latitude,
      long: position.coords.longitude,
      source: 'device',
    };
  } catch {
    if (geo.value.source !== 'plot') {
      await toast('Device GPS unavailable — using plot coordinates if registered.', 'warning');
    }
  }

  try {
    const image = await Camera.getPhoto({
      quality: 70,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
    });
    photoPreview.value = `data:image/jpeg;base64,${image.base64String}`;
    photoBase64.value = `data:image/jpeg;base64,${image.base64String}`;
  } catch {
    await toast('Camera access failed. A photo voucher is required to authorize release.', 'danger');
  }
};

const authorizeRelease = async () => {
  if (!ctx.value) return;
  if (!photoBase64.value) {
    await toast('A photo voucher is strictly required to authorize release.', 'danger');
    return;
  }

  isSubmitting.value = true;

  const lat = geo.value.source === 'none' ? null : geo.value.lat;
  const long = geo.value.source === 'none' ? null : geo.value.long;

  // OFFLINE: queue for bulk sync (server verifies eligibility on upload).
  if (!isOnline()) {
    if (ctx.value.source === 'subsidy') {
      await toast('Connect to the internet to release this subsidy.', 'warning');
      isSubmitting.value = false;
      return;
    }
    await queueRelease(lat, long);
    return;
  }

  try {
    if (ctx.value.source === 'subsidy') {
      const response = await apiClient.post(`/subsidies/${ctx.value.program_id}/claim-farmer`, {
        farmer_id: ctx.value.farmer_id,
        rsbsa_no: ctx.value.rsbsa_no,
        beneficiary_id: ctx.value.beneficiary_id,
      });
      releaseResult.value = response.data;
      isSubmitting.value = false;
      if (props.embedded) emit('saved');
      return;
    }

    const response = await apiClient.post('/distributions/claim', {
      farmer_id: ctx.value.farmer_id,
      program_id: ctx.value.program_id,
      geo_tag_lat: lat,
      geo_tag_long: long,
      photo_proof_base64: photoBase64.value,
    });
    releaseResult.value = response.data;
    if (props.embedded) emit('saved');
  } catch (err: any) {
    if (!err.response) {
      // Network dropped: fall back to the offline queue.
      await queueRelease(lat, long);
      return;
    }
    await toast(err.response?.data?.message || 'Release failed. Please try again.', 'danger');
    isSubmitting.value = false;
  }
};

const queueRelease = async (lat: number | null, long: number | null) => {
  if (!ctx.value) return;
  await queueDistribution({
    farmer_id: ctx.value.farmer_id,
    farmer_name: ctx.value.farmer_name,
    program_id: ctx.value.program_id,
    program_name: ctx.value.item_released,
    geo_tag_lat: lat,
    geo_tag_long: long,
    photo_proof_base64: photoBase64.value,
  });
  await syncStore.refreshCount();
  releaseResult.value = { offline: true };
  isSubmitting.value = false;
};
</script>

<style scoped>
.release-bg { --background: #f4f8f5; }
.release-wrapper { max-width: 680px; margin: 0 auto; }

.empty-card { border-radius: 12px; }

.alloc-card { border-radius: 12px; border: 1px solid #e2e8f0; border-top: 4px solid #1a4731; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.alloc-eyebrow { font-size: 0.72rem; letter-spacing: 2px; color: #94a3b8; margin: 0 0 4px; font-weight: 700; }
.alloc-farmer { font-weight: 900; color: #1a4731; margin: 0 0 12px; font-size: 1.35rem; }
.alloc-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eef2f0; }
.ai-label { color: #64748b; font-size: 0.9rem; }

.alloc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
.ag-cell { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; }
.ag-label { display: block; font-size: 0.75rem; color: #94a3b8; }
.ag-value { display: block; font-weight: 800; color: #1a4731; font-size: 1.05rem; margin-top: 2px; }

.alloc-qty-box { margin-top: 14px; background: #1a4731; color: white; border-radius: 10px; padding: 1rem; text-align: center; display: flex; flex-direction: column; gap: 2px; }
.aqb-label { font-size: 0.72rem; letter-spacing: 2px; opacity: 0.8; }
.aqb-qty { font-size: 2.8rem; font-weight: 900; line-height: 1; }
.aqb-unit { font-size: 0.95rem; opacity: 0.85; }
.alloc-remaining { font-size: 0.82rem; color: #64748b; text-align: right; margin: 8px 0 0; }

.offline-note { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding: 10px; background: #fff7e6; border: 1px solid #ffe0a3; border-radius: 8px; color: #92600a; font-size: 0.85rem; }

.evidence-card { border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04); margin-top: 1rem; }
.section-title { font-size: 1rem; color: #1a4731; font-weight: 800; margin: 0 0 12px; }
.req { color: #c0392b; font-size: 0.75rem; font-weight: 700; margin-left: 4px; }
.photo-preview-box { position: relative; width: 100%; max-height: 300px; overflow: hidden; border-radius: 8px; border: 2px dashed #1a4731; background: #000; display: flex; align-items: center; justify-content: center; }
.photo-preview-box img { width: 100%; height: auto; opacity: 0.9; }
.gps-watermark { position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.72); color: #00ff88; padding: 5px 10px; font-family: monospace; font-size: 0.78rem; border-radius: 4px; font-weight: 700; }
.gps-status { display: flex; align-items: center; gap: 6px; margin: 12px 0 0; font-size: 0.82rem; color: #64748b; }
.mb-3 { margin-bottom: 1rem; }

.authorize-btn { --border-radius: 14px; height: 70px; font-size: 1.05rem; font-weight: 800; letter-spacing: 1px; margin-top: 1.5rem; }
.helper-text { color: var(--ion-color-medium); font-size: 0.85rem; text-align: center; margin-top: 0.6rem; }

.mt-4 { margin-top: 1.5rem; }
.text-white { color: white !important; }
.result-icon { font-size: 3rem; margin-bottom: 0.5rem; }
.farmer-name-result { font-weight: 900; font-size: 1.5rem; margin: 0 0 1rem; }
.dispense-box { background: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.6); border-radius: 10px; padding: 1.2rem; text-align: center; display: flex; flex-direction: column; gap: 4px; }
.dispense-label { font-size: 0.8rem; letter-spacing: 2px; opacity: 0.85; }
.dispense-qty { font-size: 2.6rem; font-weight: 900; line-height: 1; }
.remaining-note { font-size: 0.82rem; margin-top: 1rem; opacity: 0.9; }
.sms-note { display: flex; align-items: center; gap: 6px; font-size: 0.82rem; margin-top: 0.75rem; opacity: 0.9; }
</style>
