<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button :default-href="backHref"></ion-back-button>
        </ion-buttons>
        <ion-title>Pest &amp; Disease Response</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="page-bg ion-padding">
      <p class="lede">
        Action-oriented field response — validate barangay pest reports, advise farmers, and dispense interventions.
      </p>

      <!-- Step 1: Target Farm Data -->
      <ion-card class="step-card">
        <ion-card-header>
          <div class="step-badge">1</div>
          <ion-card-title>Target Farm Data</ion-card-title>
          <ion-card-subtitle>Synced from Barangay encoder</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <div class="readonly-grid">
            <div class="ro-item">
              <span class="ro-label">Farmer Name</span>
              <span class="ro-value">{{ state.target.farmerName }}</span>
            </div>
            <div class="ro-item">
              <span class="ro-label">RSBSA No.</span>
              <span class="ro-value">{{ state.target.rsbsaNo }}</span>
            </div>
            <div class="ro-item">
              <span class="ro-label">Barangay</span>
              <span class="ro-value">{{ state.target.barangay }}</span>
            </div>
            <div class="ro-item">
              <span class="ro-label">Crop</span>
              <span class="ro-value">{{ state.target.crop }}</span>
            </div>
            <div class="ro-item full">
              <span class="ro-label">Reported Pest / Disease</span>
              <span class="ro-value pest-alert">{{ state.target.reportedPest }}</span>
            </div>
            <div class="ro-item full">
              <span class="ro-label">Report ID</span>
              <span class="ro-value muted">{{ state.target.reportId }}</span>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Step 2: Ground Truthing -->
      <ion-card class="step-card">
        <ion-card-header>
          <div class="step-badge">2</div>
          <ion-card-title>Ground Truthing</ion-card-title>
          <ion-card-subtitle>Hardware validation on-site</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <p v-if="state.photoPreviewSrc" class="status-ok">
            <ion-icon :icon="checkmarkCircleOutline"></ion-icon>
            Photo evidence captured
          </p>
          <img
            v-if="state.photoPreviewSrc"
            :src="state.photoPreviewSrc"
            alt="Field evidence"
            class="photo-preview"
          />
          <ion-button
            expand="block"
            class="action-btn gold-outline"
            fill="outline"
            :disabled="capturingPhoto"
            @click="capturePhotoEvidence"
          >
            <ion-icon slot="start" :icon="cameraOutline"></ion-icon>
            {{ capturingPhoto ? 'Opening camera…' : 'Capture Photo Evidence' }}
          </ion-button>

          <p class="hw-status" v-if="state.latitude != null">
            <ion-icon :icon="locateOutline"></ion-icon>
            {{ state.latitude.toFixed(6) }}, {{ state.longitude!.toFixed(6) }}
          </p>
          <p v-else class="hw-status muted">GPS not locked yet</p>
          <ion-button
            expand="block"
            class="action-btn"
            :disabled="lockingGps"
            @click="lockGpsCoordinates"
          >
            <ion-icon slot="start" :icon="locateOutline"></ion-icon>
            {{ lockingGps ? 'Acquiring GPS…' : 'Lock GPS Coordinates' }}
          </ion-button>
        </ion-card-content>
      </ion-card>

      <!-- Step 3: Assessment & Advisory -->
      <ion-card class="step-card">
        <ion-card-header>
          <div class="step-badge">3</div>
          <ion-card-title>Assessment &amp; Advisory</ion-card-title>
          <ion-card-subtitle>Confirm findings and recommend controls</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <ion-item class="field-item" lines="none">
            <ion-select
              label="Confirmed Pest/Disease"
              label-placement="stacked"
              interface="action-sheet"
              :value="state.confirmedPest"
              placeholder="Select or confirm pest"
              @ionChange="(e: CustomEvent) => state.confirmedPest = e.detail.value"
            >
              <ion-select-option v-for="p in pestOptions" :key="p" :value="p">{{ p }}</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item class="field-item range-item" lines="none">
            <ion-label position="stacked">Incidence Percentage</ion-label>
            <ion-range
              :min="0"
              :max="100"
              :step="1"
              :value="state.incidencePct"
              pin
              color="primary"
              @ionChange="(e: CustomEvent) => state.incidencePct = e.detail.value"
            ></ion-range>
            <ion-note slot="end" class="range-note">{{ state.incidencePct }}%</ion-note>
          </ion-item>

          <ion-item class="field-item" lines="none">
            <ion-select
              label="Severity"
              label-placement="stacked"
              interface="action-sheet"
              :value="state.severity"
              @ionChange="(e: CustomEvent) => state.severity = e.detail.value"
            >
              <ion-select-option value="Low">Low</ion-select-option>
              <ion-select-option value="Moderate">Moderate</ion-select-option>
              <ion-select-option value="Severe">Severe</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item class="field-item" lines="none">
            <ion-select
              label="Advisory Given"
              label-placement="stacked"
              interface="popover"
              :multiple="true"
              :value="state.advisories"
              placeholder="Select control methods"
              @ionChange="(e: CustomEvent) => state.advisories = e.detail.value"
            >
              <ion-select-option value="Cultural Control">Cultural Control</ion-select-option>
              <ion-select-option value="Biological Control">Biological Control</ion-select-option>
              <ion-select-option value="Chemical Control">Chemical Control</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item class="field-item escalate-item" lines="none">
            <ion-label>
              <h3>🚨 Flag as Potential Outbreak</h3>
              <p>Escalate to MAO for immediate action</p>
            </ion-label>
            <ion-toggle
              slot="end"
              color="danger"
              :checked="state.escalateOutbreak"
              @ionChange="(e: CustomEvent) => state.escalateOutbreak = e.detail.checked"
            ></ion-toggle>
          </ion-item>
        </ion-card-content>
      </ion-card>

      <!-- Step 4: Intervention Distribution -->
      <ion-card class="step-card">
        <ion-card-header>
          <div class="step-badge">4</div>
          <ion-card-title>Intervention Distribution</ion-card-title>
          <ion-card-subtitle>Dispense inputs to the affected farmer</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <p v-if="state.qrScanResult" class="status-ok">
            <ion-icon :icon="qrCodeOutline"></ion-icon>
            Farmer verified: {{ state.qrScanResult }}
          </p>
          <ion-button expand="block" class="action-btn gold" fill="solid" @click="scanFarmerQr">
            <ion-icon slot="start" :icon="qrCodeOutline"></ion-icon>
            Scan Farmer QR to Dispense Item
          </ion-button>

          <ion-item class="field-item" lines="none">
            <ion-select
              label="Item Distributed"
              label-placement="stacked"
              interface="action-sheet"
              :value="state.itemDistributed"
              placeholder="Select intervention item"
              @ionChange="(e: CustomEvent) => state.itemDistributed = e.detail.value"
            >
              <ion-select-option v-for="item in interventionItems" :key="item" :value="item">{{ item }}</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item class="field-item" lines="none">
            <ion-input
              type="number"
              label="Quantity"
              label-placement="stacked"
              placeholder="Enter quantity dispensed"
              :value="state.quantity"
              @ionInput="(e: CustomEvent) => state.quantity = e.detail.value ?? ''"
            ></ion-input>
          </ion-item>
        </ion-card-content>
      </ion-card>

      <ion-button
        expand="block"
        class="submit-btn"
        :disabled="submitting || !canSubmit"
        @click="submitReport"
      >
        {{ submitting ? 'Syncing…' : 'Submit & Sync Report' }}
      </ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonButton, IonIcon, IonItem, IonLabel, IonSelect, IonSelectOption,
  IonRange, IonNote, IonToggle, IonInput, toastController,
} from '@ionic/vue';
import {
  cameraOutline, locateOutline, qrCodeOutline, checkmarkCircleOutline,
} from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { getPestReportById } from '@/data/technicianDispatchQueues';
import {
  fetchRealLocation,
  ensureCameraPermission,
  hideScannerBackground,
  showScannerBackground,
} from '@/composables/useNativeHardware';

interface PestResponseState {
  target: {
    farmerName: string;
    rsbsaNo: string;
    barangay: string;
    crop: string;
    reportedPest: string;
    reportId: string;
  };
  /** Raw base64 from Camera (no data-URL prefix). */
  photoBase64: string | null;
  /** Bound to <img src> for preview. */
  photoPreviewSrc: string | null;
  latitude: number | null;
  longitude: number | null;
  confirmedPest: string;
  incidencePct: number;
  severity: string;
  advisories: string[];
  escalateOutbreak: boolean;
  itemDistributed: string;
  quantity: string;
  qrScanResult: string | null;
}

const route = useRoute();
const capturingPhoto = ref(false);
const lockingGps = ref(false);
const submitting = ref(false);

const pestOptions = [
  'Brown Planthopper',
  'Fall Armyworm',
  'Rice Black Bug',
  'Stem Borer',
  'Sheath Blight',
  'Bacterial Leaf Blight',
  'Other',
];

const interventionItems = [
  'Trichogramma Cards',
  'Pesticide (Lambda-cyhalothrin)',
  'Pesticide (Chlorantraniliprole)',
  'Fungicide',
  'Biological Agent (Metarhizium)',
  'Pheromone Traps',
];

/** Mock barangay-synced report — replace with API/queue payload later. */
const defaultTarget = {
  farmerName: 'Reyes, Maria Lopez',
  rsbsaNo: '01-28-03-005-000034',
  barangay: 'San Fabian',
  crop: 'Rice',
  reportedPest: 'Brown Planthopper',
  reportId: 'BRGY-PEST-2026-0042',
};

const state = reactive<PestResponseState>({
  target: { ...defaultTarget },
  photoBase64: null,
  photoPreviewSrc: null,
  latitude: null,
  longitude: null,
  confirmedPest: defaultTarget.reportedPest,
  incidencePct: 15,
  severity: 'Moderate',
  advisories: [],
  escalateOutbreak: false,
  itemDistributed: '',
  quantity: '',
  qrScanResult: null,
});

const canSubmit = computed(() =>
  !!state.confirmedPest
  && state.incidencePct >= 0
  && !!state.severity
  && state.advisories.length > 0
);

const fromQueue = computed(() => route.query.from === 'queue');
const backHref = computed(() => (fromQueue.value ? '/tech/pest-queue' : '/tech/dashboard'));

onMounted(() => {
  const id = route.query.id as string | undefined;
  if (id) {
    const report = getPestReportById(id);
    if (report) {
      state.target = {
        farmerName: report.farmerName,
        rsbsaNo: report.rsbsaNo,
        barangay: report.barangay,
        crop: report.crop,
        reportedPest: report.reportedPest,
        reportId: report.reportId,
      };
      state.confirmedPest = report.reportedPest;
      return;
    }
  }

  const q = route.query;
  if (q.farmer) state.target.farmerName = String(q.farmer);
  if (q.barangay) state.target.barangay = String(q.barangay);
  if (q.crop) state.target.crop = String(q.crop);
  if (q.pest) {
    state.target.reportedPest = String(q.pest);
    state.confirmedPest = String(q.pest);
  }
  if (q.reportId) state.target.reportId = String(q.reportId);
  if (q.rsbsa) state.target.rsbsaNo = String(q.rsbsa);
});

/** Capture field photo evidence as Base64 and preview before submit. */
const capturePhotoEvidence = async () => {
  capturingPhoto.value = true;
  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
    });

    const base64 = photo.base64String ?? null;
    if (!base64) {
      throw new Error('Empty camera payload');
    }

    const format = (photo.format || 'jpeg').toLowerCase();
    state.photoBase64 = base64;
    state.photoPreviewSrc = `data:image/${format};base64,${base64}`;

    if (state.latitude == null) {
      try {
        const pos = await fetchRealLocation({ timeout: 8000 });
        state.latitude = pos.coords.latitude;
        state.longitude = pos.coords.longitude;
      } catch (err) {
        console.warn('[AGRI-AKAP] GPS optional on photo capture:', err);
      }
    }

    const t = await toastController.create({
      message: 'Photo evidence captured. Review preview before submitting.',
      duration: 2200,
      color: 'success',
      position: 'top',
    });
    await t.present();
  } catch (err) {
    console.warn('[AGRI-AKAP] Camera unavailable (web/native):', err);
    const t = await toastController.create({
      message: 'Camera unavailable. Check device permissions or try on a native build.',
      duration: 2500,
      color: 'warning',
      position: 'top',
    });
    await t.present();
  } finally {
    capturingPhoto.value = false;
  }
};

const lockGpsCoordinates = async () => {
  lockingGps.value = true;
  try {
    const pos = await fetchRealLocation({ timeout: 12000 });
    state.latitude = pos.coords.latitude;
    state.longitude = pos.coords.longitude;
    const t = await toastController.create({
      message: 'GPS coordinates locked.',
      duration: 2000,
      color: 'success',
      position: 'top',
    });
    await t.present();
  } catch (err) {
    console.warn('[AGRI-AKAP] GPS lock failed:', err);
    const t = await toastController.create({
      message: 'Unable to lock GPS. Enable location services.',
      duration: 2500,
      color: 'warning',
      position: 'top',
    });
    await t.present();
  } finally {
    lockingGps.value = false;
  }
};

const scanFarmerQr = async () => {
  try {
    if (!Capacitor.isNativePlatform()) {
      console.warn('[AGRI-AKAP] QR scan native-only; using target RSBSA fallback on web.');
      state.qrScanResult = state.target.rsbsaNo;
      const t = await toastController.create({
        message: 'Web fallback: using target farm RSBSA as verified ID.',
        duration: 2200,
        color: 'warning',
        position: 'top',
      });
      await t.present();
      return;
    }

    const allowed = await ensureCameraPermission();
    if (!allowed) {
      const t = await toastController.create({
        message: 'Camera permission required to scan farmer QR.',
        duration: 2400,
        color: 'warning',
        position: 'top',
      });
      await t.present();
      return;
    }

    hideScannerBackground();
    try {
      const { barcodes } = await BarcodeScanner.scan();
      const raw = barcodes[0]?.rawValue?.trim();
      if (!raw) {
        const t = await toastController.create({
          message: 'No QR detected. Try again.',
          duration: 2200,
          color: 'warning',
          position: 'top',
        });
        await t.present();
        return;
      }
      state.qrScanResult = raw;
      const t = await toastController.create({
        message: 'Farmer QR verified for dispense.',
        duration: 2200,
        color: 'success',
        position: 'top',
      });
      await t.present();
    } finally {
      showScannerBackground();
    }
  } catch (err) {
    console.warn('[AGRI-AKAP] Pest QR scan failed:', err);
    showScannerBackground();
    const t = await toastController.create({
      message: 'Scanner failed. Check camera permissions.',
      duration: 2500,
      color: 'danger',
      position: 'top',
    });
    await t.present();
  }
};

const submitReport = async () => {
  if (!canSubmit.value || submitting.value) return;
  submitting.value = true;
  try {
    await new Promise((r) => setTimeout(r, 500));

    let message = 'Inspection Logged. Synced to MAO Dashboard.';
    let color: 'success' | 'danger' = 'success';
    if (state.escalateOutbreak) {
      color = 'danger';
      message += ' Outbreak Alert Sent to MAO!';
    }

    const t = await toastController.create({
      message,
      duration: 3500,
      color,
      position: 'top',
    });
    await t.present();
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.page-bg {
  --background: #f4f8f5;
}

.lede {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  color: #475569;
  line-height: 1.45;
}

.step-card {
  margin: 0 0 1rem;
  border-radius: 16px;
  border: 1px solid #d1e0d6;
  box-shadow: 0 2px 8px rgba(26, 71, 49, 0.08);
}

.step-card ion-card-header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-bottom: 0.5rem;
}

.step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #1a4731;
  color: #d4af37;
  font-weight: 800;
  font-size: 1rem;
  margin-bottom: 0.35rem;
}

ion-card-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: #1a4731;
}

ion-card-subtitle {
  font-size: 0.85rem;
  color: #64748b;
}

.readonly-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}

.ro-item {
  background: #f0f7f2;
  border: 1px solid #c5d9cc;
  border-radius: 12px;
  padding: 0.65rem 0.75rem;
}

.ro-item.full {
  grid-column: 1 / -1;
}

.ro-label {
  display: block;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 0.2rem;
}

.ro-value {
  display: block;
  font-size: 1rem;
  font-weight: 700;
  color: #1a4731;
  line-height: 1.3;
}

.ro-value.muted {
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
}

.ro-value.pest-alert {
  color: #b45309;
}

.action-btn {
  --border-radius: 14px;
  min-height: 52px;
  font-size: 1rem;
  font-weight: 700;
  text-transform: none;
  margin-bottom: 0.65rem;
  --background: #1a4731;
  --color: #fff;
}

.action-btn.gold {
  --background: #d4af37;
  --color: #1a4731;
}

.action-btn.gold-outline {
  --border-color: #d4af37;
  --color: #1a4731;
  --background: #fff;
}

.hw-status {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0 0 0.65rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: #1a4731;
}

.hw-status.muted {
  color: #94a3b8;
  font-weight: 600;
}

.status-ok {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: #15803d;
}

.photo-preview {
  display: block;
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  border-radius: 12px;
  margin-bottom: 0.65rem;
  border: 2px solid #1a4731;
}

.field-item {
  --background: #f8fafc;
  --border-radius: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  margin-bottom: 0.75rem;
  --min-height: 56px;
}

.range-item {
  padding-bottom: 0.5rem;
}

.range-note {
  font-size: 1.1rem;
  font-weight: 800;
  color: #1a4731;
  min-width: 48px;
  text-align: right;
}

.escalate-item {
  --background: #fef2f2;
  border-color: #fecaca;
}

.escalate-item h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  color: #991b1b;
}

.escalate-item p {
  margin: 0.2rem 0 0;
  font-size: 0.82rem;
  color: #b91c1c;
}

.submit-btn {
  --background: #1a4731;
  --border-radius: 14px;
  min-height: 56px;
  font-size: 1.05rem;
  font-weight: 800;
  text-transform: none;
  margin: 0.5rem 0 2rem;
}

.submit-btn:disabled {
  opacity: 0.55;
}
</style>
