<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button :default-href="backHref"></ion-back-button>
        </ion-buttons>
        <ion-title>Pest Response</ion-title>
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
            <div class="ro-item">
              <span class="ro-label">Variety</span>
              <span class="ro-value">{{ state.target.variety || '—' }}</span>
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
              <ion-select-option v-for="p in pestOptions" :key="'p-'+p" :value="p">{{ p }} (Pest)</ion-select-option>
              <ion-select-option v-for="d in diseaseOptions" :key="'d-'+d" :value="d">{{ d }} (Disease)</ion-select-option>
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
          <p class="affected-ha">
            Area affected: <strong>{{ affectedAreaHa }} ha</strong>
            <span v-if="state.areaPlantedHa"> ({{ state.areaPlantedHa }} ha planted × {{ state.incidencePct }}%)</span>
          </p>

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
import { useRoute, useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonButton, IonIcon, IonItem, IonLabel, IonSelect, IonSelectOption,
  IonRange, IonNote, IonToggle,
} from '@ionic/vue';
import {
  cameraOutline, locateOutline, checkmarkCircleOutline,
} from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import apiClient from '@/utils/axios';
import { formatFarmerName } from '@/data/technicianDispatchQueues';
import { fetchRealLocation } from '@/composables/useNativeHardware';
import { db, newUuid } from '@/database/db';
import { syncAllPendingData } from '@/services/syncService';
import { loadPestCatalog, threatsForCrop } from '@/utils/pestCatalog';
import { useSyncStore } from '@/stores/syncStore';
import { presentToast } from '@/utils/toast';

interface PestResponseState {
  target: {
    farmerId: string;
    farmerName: string;
    rsbsaNo: string;
    barangay: string;
    crop: string;
    variety: string;
    reportedPest: string;
    reportId: string;
  };
  serverRecordId: string;
  /** Raw base64 from Camera (no data-URL prefix). */
  photoBase64: string | null;
  /** Bound to <img src> for preview. */
  photoPreviewSrc: string | null;
  latitude: number | null;
  longitude: number | null;
  confirmedPest: string;
  incidencePct: number;
  areaPlantedHa: number;
  severity: string;
  advisories: string[];
  escalateOutbreak: boolean;
}

const route = useRoute();
const router = useRouter();
const syncStore = useSyncStore();
const capturingPhoto = ref(false);
const lockingGps = ref(false);
const submitting = ref(false);

const emptyTarget = {
  farmerId: '',
  farmerName: '',
  rsbsaNo: '',
  barangay: '',
  crop: '',
  variety: '',
  reportedPest: '',
  reportId: '',
};

const state = reactive<PestResponseState>({
  target: { ...emptyTarget },
  serverRecordId: '',
  photoBase64: null,
  photoPreviewSrc: null,
  latitude: null,
  longitude: null,
  confirmedPest: '',
  incidencePct: 15,
  areaPlantedHa: 0,
  severity: 'Moderate',
  advisories: [],
  escalateOutbreak: false,
});

const affectedAreaHa = computed(() => {
  const planted = Number(state.areaPlantedHa) || 0;
  const pct = Number(state.incidencePct) || 0;
  return planted > 0 ? (planted * (pct / 100)).toFixed(4) : '0.0000';
});

const canSubmit = computed(() =>
  !!state.confirmedPest
  && state.incidencePct >= 0
  && !!state.severity
  && state.advisories.length > 0
  && !!state.photoBase64
  && state.latitude != null
);

const fromQueue = computed(() => route.query.from === 'queue');
const backHref = computed(() => (fromQueue.value ? '/tech/pest-queue' : '/tech/dashboard'));
const cropThreats = computed(() => threatsForCrop(state.target.crop));
const pestOptions = computed(() => {
  const list = [...cropThreats.value.pests];
  const reported = state.target.reportedPest;
  if (reported && !list.includes(reported) && !cropThreats.value.diseases.includes(reported)) {
    list.unshift(reported);
  }
  return list;
});
const diseaseOptions = computed(() => cropThreats.value.diseases);

const applyQueryTarget = () => {
  const q = route.query;
  if (q.farmerId) state.target.farmerId = String(q.farmerId);
  if (q.farmer) state.target.farmerName = String(q.farmer);
  if (q.barangay) state.target.barangay = String(q.barangay);
  if (q.crop) state.target.crop = String(q.crop);
  if (q.pest) {
    state.target.reportedPest = String(q.pest);
    state.confirmedPest = String(q.pest);
  }
  if (q.reportId) state.target.reportId = String(q.reportId);
  if (q.rsbsa) state.target.rsbsaNo = String(q.rsbsa);
  if (q.variety) state.target.variety = String(q.variety);
};

onMounted(async () => {
  await loadPestCatalog();
  applyQueryTarget();
  const id = String(route.query.id || '').trim();
  if (!id) return;
  state.serverRecordId = id;
  try {
    const res = await apiClient.get(`/pest-monitoring/${id}`);
    const r = res.data?.data;
    if (!r) return;
    const farmer = r.farmer || {};
    state.target = {
      farmerId: r.farmer_id || farmer.id || '',
      farmerName: formatFarmerName(farmer) || state.target.farmerName,
      rsbsaNo: farmer.rsbsa_no || state.target.rsbsaNo,
      barangay: farmer.permanent_brgy || r.farm_location || r.farm_plot?.location_brgy || state.target.barangay,
      crop: r.crop || r.farm_plot?.commodity || state.target.crop,
      variety: r.variety || state.target.variety,
      reportedPest: r.pest_name || state.target.reportedPest,
      reportId: r.report_ref || `PEST-${String(r.id).slice(0, 8).toUpperCase()}`,
    };
    state.confirmedPest = state.target.reportedPest;
    if (r.incidence != null) state.incidencePct = Number(r.incidence) || state.incidencePct;
    state.areaPlantedHa = Number(r.area_planted ?? r.farm_plot?.size_ha) || 0;
    if (r.severity) state.severity = r.severity;
  } catch (err) {
    console.warn('[AGRI-AKAP] Failed to load pest report:', err);
  }
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

    await presentToast('Photo evidence captured. Review preview before submitting.');
  } catch (err) {
    console.warn('[AGRI-AKAP] Camera unavailable (web/native):', err);
    await presentToast('Camera unavailable. Check device permissions or try on a native build.', 'warning');
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
    await presentToast('GPS coordinates locked.', 'success', 2000);
  } catch (err) {
    console.warn('[AGRI-AKAP] GPS lock failed:', err);
    await presentToast('Unable to lock GPS. Enable location services.', 'warning');
  } finally {
    lockingGps.value = false;
  }
};

const submitReport = async () => {
  if (!canSubmit.value || submitting.value) return;
  submitting.value = true;
  try {
    const rsbsaId = state.target.rsbsaNo || state.target.farmerId || '';
    const photo = state.photoBase64?.startsWith('data:')
      ? state.photoBase64
      : `data:image/jpeg;base64,${state.photoBase64}`;

    if (state.serverRecordId && navigator.onLine) {
      await apiClient.patch(`/pest-monitoring/${state.serverRecordId}/field-validate`, {
        latitude: state.latitude,
        longitude: state.longitude,
        photo_base64: photo,
        pest_name: state.confirmedPest,
        incidence: state.incidencePct,
        severity: state.severity,
        advisory: state.advisories.join(', '),
        is_outbreak: state.escalateOutbreak,
      });
    } else {
      await db.offline_pest_reports.add({
        client_id: newUuid(),
        rsbsa_id: rsbsaId,
        farmer_id: state.target.farmerId || undefined,
        crop: state.target.crop,
        pest_name: state.confirmedPest,
        incidence: state.incidencePct,
        severity: state.severity,
        advisory: state.advisories.join(', '),
        is_outbreak: state.escalateOutbreak,
        photo_base64: state.photoBase64,
        lat: state.latitude,
        lng: state.longitude,
        report_id: state.target.reportId,
        server_id: state.serverRecordId || undefined,
        sync_status: 'pending',
        created_at: new Date().toISOString(),
      });

      await syncStore.refreshCount();
      if (navigator.onLine) {
        void syncAllPendingData().then(() => syncStore.refreshCount());
      }
    }

    await presentToast(
      state.serverRecordId && navigator.onLine
        ? 'Field validation saved. Status updated on the pest report.'
        : 'Saved locally. Will sync when online.',
      state.escalateOutbreak ? 'warning' : 'success',
      2800,
    );
    await router.replace(backHref.value);
  } catch (err: any) {
    console.warn('[AGRI-AKAP] Failed to save pest report:', err);
    await presentToast(err?.response?.data?.message || 'Could not save pest validation. Please try again.', 'danger');
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

.affected-ha {
  margin: 0.15rem 0 0.65rem;
  font-size: 0.85rem;
  color: #334155;
}
.affected-ha span { color: #64748b; }
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
