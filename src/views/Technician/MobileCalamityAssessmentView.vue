<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button :default-href="backHref"></ion-back-button>
        </ion-buttons>
        <ion-title>Calamity Damage</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="page-bg ion-padding">
      <p class="lede">
        Rapid Damage and Needs Assessment for LGU rehabilitation planning — buffer seeds &amp; fertilizer allocation.
      </p>

      <!-- 1. Farmer & Calamity Context -->
      <ion-card class="section-card">
        <ion-card-header>
          <ion-card-title>Farmer &amp; Calamity Context</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item v-if="!dispatchedFromQueue" class="field-item" lines="none">
            <ion-select
              label="Select Active Calamity"
              label-placement="stacked"
              interface="action-sheet"
              :value="state.calamityEvent"
              placeholder="Choose active calamity"
              @ionChange="(e: CustomEvent) => state.calamityEvent = e.detail.value"
            >
              <ion-select-option v-for="c in activeCalamities" :key="c" :value="c">{{ c }}</ion-select-option>
            </ion-select>
          </ion-item>

          <div v-if="dispatchedFromQueue" class="dispatched-banner">
            <p class="dispatched-label">Barangay-encoded report</p>
            <p class="dispatched-event">{{ state.calamityEvent }}</p>
            <p class="dispatched-meta">{{ state.farmerName }} · {{ state.barangay }}</p>
          </div>

          <div v-if="!dispatchedFromQueue" class="search-box">
            <ion-input
              class="search-input"
              label="Search Farmer (RSBSA / Name)"
              label-placement="stacked"
              :value="farmerSearch.query.value"
              placeholder="Type to search…"
              @ionInput="(e: CustomEvent) => farmerSearch.onQueryInput(e.detail.value ?? '')"
            ></ion-input>
            <div v-if="farmerSearch.searching.value" class="hint">Searching…</div>
            <ul v-if="farmerSearch.results.value.length" class="suggest">
              <li v-for="f in farmerSearch.results.value" :key="f.id" @click="onSelectFarmer(f)">
                <strong>{{ f.surname }}, {{ f.first_name }}</strong>
                <span>{{ f.rsbsa_no || 'No RSBSA' }} · {{ f.barangay }}</span>
              </li>
            </ul>
          </div>

          <div v-if="state.farmerId" class="farmer-banner">
            <div>
              <p class="farmer-name">{{ state.farmerName }}</p>
              <p class="farmer-meta">{{ state.rsbsaNo }} · {{ state.barangay }}</p>
            </div>
            <ion-chip :color="rsbsaEligible ? 'success' : 'warning'" class="eligibility-chip">
              <ion-icon :icon="rsbsaEligible ? checkmarkCircleOutline : alertCircleOutline"></ion-icon>
              <ion-label>{{ rsbsaEligible ? 'RSBSA Verified' : 'RSBSA Missing' }}</ion-label>
            </ion-chip>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- 2. Farm & Crop Status -->
      <ion-card class="section-card">
        <ion-card-header>
          <ion-card-title>Farm &amp; Crop Status</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item class="field-item" lines="none">
            <ion-select
              label="Crop Type"
              label-placement="stacked"
              interface="action-sheet"
              :value="state.cropType"
              @ionChange="(e: CustomEvent) => state.cropType = e.detail.value"
            >
              <ion-select-option value="Rice">Rice</ion-select-option>
              <ion-select-option value="Corn">Corn</ion-select-option>
              <ion-select-option value="High-Value">High-Value</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item class="field-item" lines="none">
            <VarietyField v-model="state.variety" :crop="state.cropType" interface-name="action-sheet" />
          </ion-item>

          <ion-item class="field-item" lines="none">
            <ion-select
              label="Stage of Crop"
              label-placement="stacked"
              interface="action-sheet"
              :value="state.cropStage"
              @ionChange="(e: CustomEvent) => state.cropStage = e.detail.value"
            >
              <ion-select-option value="Seedling">Seedling</ion-select-option>
              <ion-select-option value="Vegetative">Vegetative</ion-select-option>
              <ion-select-option value="Reproductive">Reproductive</ion-select-option>
              <ion-select-option value="Maturity">Maturity</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item class="field-item" lines="none">
            <ion-input
              type="number"
              label="Total Area Planted (Hectares)"
              label-placement="stacked"
              :value="state.areaPlanted"
              @ionInput="onAreaPlantedInput"
            ></ion-input>
          </ion-item>
        </ion-card-content>
      </ion-card>

      <!-- 3. Damage Classification -->
      <ion-card class="section-card damage-card">
        <ion-card-header>
          <ion-card-title>Damage Classification</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item class="field-item range-item" lines="none">
            <ion-label position="stacked">Estimated Yield Loss (%)</ion-label>
            <ion-range
              :min="0"
              :max="100"
              :step="1"
              :value="state.yieldLossPct"
              pin
              color="warning"
              @ionChange="(e: CustomEvent) => onYieldLossChange(e.detail.value)"
            ></ion-range>
            <ion-note slot="end" class="range-note">{{ state.yieldLossPct }}%</ion-note>
          </ion-item>
          <p class="severity-line">Severity: <strong>{{ derivedSeverity }}</strong></p>

          <ion-item class="field-item" lines="none">
            <ion-input
              type="number"
              label="Area Damaged (Hectares)"
              label-placement="stacked"
              :value="state.areaDamaged"
              @ionInput="onAreaDamagedInput"
            ></ion-input>
          </ion-item>

          <ion-item class="field-item" lines="none">
            <ion-input
              type="number"
              label="Estimated Value Lost (PHP)"
              label-placement="stacked"
              placeholder="Enter peso amount"
              :value="state.valueLost"
              @ionInput="(e: CustomEvent) => state.valueLost = e.detail.value ?? ''"
            ></ion-input>
          </ion-item>
        </ion-card-content>
      </ion-card>

      <!-- 4. Hardware Proof -->
      <ion-card class="section-card">
        <ion-card-header>
          <ion-card-title>Hardware Proof</ion-card-title>
          <ion-card-subtitle>GPS pin &amp; disaster photo required</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <p v-if="state.latitude != null" class="status-line ok">
            <ion-icon :icon="locateOutline"></ion-icon>
            {{ state.latitude.toFixed(6) }}, {{ state.longitude!.toFixed(6) }}
          </p>
          <p v-else class="status-line muted">GPS not locked</p>
          <ion-button expand="block" class="action-btn" :disabled="lockingGps" @click="lockGps">
            <ion-icon slot="start" :icon="locateOutline"></ion-icon>
            {{ lockingGps ? 'Acquiring GPS…' : 'Lock GPS Coordinates' }}
          </ion-button>

          <img v-if="state.photoDataUrl" :src="state.photoDataUrl" alt="Disaster evidence" class="photo-preview" />
          <p v-if="state.photoDataUrl" class="status-line ok">
            <ion-icon :icon="checkmarkCircleOutline"></ion-icon>
            Disaster photo captured
          </p>
          <ion-button expand="block" class="action-btn outline" fill="outline" :disabled="capturingPhoto" @click="capturePhoto">
            <ion-icon slot="start" :icon="cameraOutline"></ion-icon>
            {{ capturingPhoto ? 'Opening camera…' : 'Capture Disaster Photo' }}
          </ion-button>
        </ion-card-content>
      </ion-card>

      <!-- 5. Rehabilitation Request -->
      <ion-card class="section-card relief-card">
        <ion-card-header>
          <ion-card-title>Rehabilitation Request</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p class="relief-text">
            Recommended LGU Relief Allocation:
            <strong>{{ reliefAllocation.seedBags }} Bags</strong> of Buffer Seeds /
            <strong>{{ reliefAllocation.fertilizerSacks }} Sacks</strong> of Fertilizer
          </p>
          <p class="relief-formula">
            Based on {{ numericAreaDamaged.toFixed(2) }} ha damaged · {{ state.cropType }} · {{ state.yieldLossPct }}% yield loss
          </p>
        </ion-card-content>
      </ion-card>

      <ion-button expand="block" class="submit-btn" :disabled="!canSubmit || submitting" @click="submitAssessment">
        {{ submitting ? 'Submitting…' : 'Submit Assessment' }}
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
  IonButton, IonIcon, IonInput, IonItem, IonSelect, IonSelectOption,
  IonLabel, IonRange, IonNote, IonChip,
} from '@ionic/vue';
import {
  locateOutline, cameraOutline, checkmarkCircleOutline, alertCircleOutline,
} from 'ionicons/icons';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import {
  useBarangayFarmerSearch,
  type FarmerOption,
} from '@/composables/useBarangayFarmerSearch';
import VarietyField from '@/components/VarietyField.vue';
import { damageSeverityFromPct } from '@/constants/cropVarieties';
import { presentToast } from '@/utils/toast';
import apiClient from '@/utils/axios';
import { formatFarmerName } from '@/data/technicianDispatchQueues';

interface CalamityAssessmentState {
  assessmentId: string;
  farmPlotId: string;
  calamityEvent: string;
  farmerId: string;
  farmerName: string;
  rsbsaNo: string;
  barangay: string;
  cropType: string;
  variety: string;
  cropStage: string;
  areaPlanted: string;
  yieldLossPct: number;
  areaDamaged: string;
  valueLost: string;
  plotSizeHa: number;
  latitude: number | null;
  longitude: number | null;
  photoDataUrl: string | null;
}

const activeCalamities = [
  'Typhoon Kristine',
  'Typhoon Egay',
  'Flash Flood Event',
  'Prolonged Drought',
  'Hailstorm',
];

const route = useRoute();
const farmerSearch = useBarangayFarmerSearch(() => null, {
  requireBarangay: false,
  commodity: () => state.cropType,
});
const lockingGps = ref(false);
const capturingPhoto = ref(false);
const submitting = ref(false);

const state = reactive<CalamityAssessmentState>({
  assessmentId: '',
  farmPlotId: '',
  calamityEvent: '',
  farmerId: '',
  farmerName: '',
  rsbsaNo: '',
  barangay: '',
  cropType: 'Rice',
  variety: '',
  cropStage: 'Vegetative',
  areaPlanted: '',
  yieldLossPct: 40,
  areaDamaged: '',
  valueLost: '',
  plotSizeHa: 0,
  latitude: null,
  longitude: null,
  photoDataUrl: null,
});

const derivedSeverity = computed(() => damageSeverityFromPct(state.yieldLossPct));

const applyAreaFromYieldLoss = (pct: number) => {
  const base = Number(state.areaPlanted) || state.plotSizeHa || 0;
  if (base <= 0) return;
  const ha = Math.round((base * pct / 100) * 10000) / 10000;
  const cap = Math.min(
    state.plotSizeHa > 0 ? state.plotSizeHa : Number.POSITIVE_INFINITY,
    Number(state.areaPlanted) > 0 ? Number(state.areaPlanted) : Number.POSITIVE_INFINITY,
  );
  state.areaDamaged = String(Number.isFinite(cap) ? Math.min(ha, cap) : ha);
};

const onYieldLossChange = (value: number | number[]) => {
  const pct = Array.isArray(value) ? Number(value[0]) : Number(value);
  state.yieldLossPct = Number.isFinite(pct) ? pct : 0;
  applyAreaFromYieldLoss(state.yieldLossPct);
};

const rsbsaEligible = computed(() => !!state.rsbsaNo && state.rsbsaNo.trim().length > 0);

const numericAreaDamaged = computed(() => Math.max(0, Number(state.areaDamaged) || 0));

/** LGU buffer allocation: 2 seed bags + 1 fertilizer sack per hectare damaged (scaled by yield loss). */
const reliefAllocation = computed(() => {
  const ha = numericAreaDamaged.value;
  const lossFactor = state.yieldLossPct / 100;
  const seedBags = Math.max(0, Math.ceil(ha * 2 * lossFactor));
  const fertilizerSacks = Math.max(0, Math.ceil(ha * 1 * lossFactor));
  return { seedBags, fertilizerSacks };
});

const canSubmit = computed(() =>
  !!state.calamityEvent
  && !!state.farmerId
  && rsbsaEligible.value
  && (!!state.variety || !!state.assessmentId)
  && !!state.areaPlanted
  && !!state.areaDamaged
  && Number(state.valueLost) > 0
  && state.latitude != null
  && !!state.photoDataUrl
);

const dispatchedFromQueue = computed(() => route.query.from === 'queue');
const backHref = computed(() => (dispatchedFromQueue.value ? '/tech/calamity-queue' : '/tech/dashboard'));

const applyAssessment = (r: any) => {
  const farmer = r.farmer || {};
  const plot = r.farm_plot || r.farmPlot || {};
  state.assessmentId = r.id || '';
  state.farmPlotId = r.farm_plot_id || plot.id || '';
  state.calamityEvent = r.calamity_name || r.calamity_type || state.calamityEvent;
  state.farmerId = r.farmer_id || farmer.id || '';
  state.farmerName = formatFarmerName(farmer);
  state.rsbsaNo = farmer.rsbsa_no || '';
  state.barangay = farmer.permanent_brgy || plot.location_brgy || '';
  state.cropType = plot.commodity || state.cropType;
  state.variety = r.variety || state.variety;
  state.cropStage = r.crop_stage || state.cropStage;
  state.areaPlanted = String(r.area_planted_ha ?? plot.size_ha ?? '');
  state.plotSizeHa = Number(plot.size_ha ?? r.area_planted_ha ?? 0);
  state.areaDamaged = String(r.area_destroyed_ha ?? '');
  state.valueLost = r.estimated_value_lost != null ? String(r.estimated_value_lost) : '';
  state.yieldLossPct = Number(r.damage_percentage) || 0;
  if (!state.areaDamaged) applyAreaFromYieldLoss(state.yieldLossPct);
};

onMounted(async () => {
  const id = String(route.query.id || '').trim();
  const farmerId = String(route.query.farmer || '').trim();
  if (id) {
    try {
      const res = await apiClient.get(`/damage-assessments/${id}`);
      if (res.data?.data) applyAssessment(res.data.data);
      return;
    } catch (err) {
      console.warn('[AGRI-AKAP] Failed to load calamity report:', err);
    }
  }
  if (farmerId) {
    try {
      const res = await apiClient.get(`/farmers/${farmerId}`);
      const f = res.data?.data;
      if (f) {
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
      }
    } catch (err) {
      console.warn('[AGRI-AKAP] Failed to preload farmer:', err);
    }
  }
});

const onSelectFarmer = async (f: FarmerOption) => {
  await farmerSearch.selectFarmer(f);
  const sel = farmerSearch.selected.value;
  if (!sel) return;
  state.farmerId = sel.id;
  state.farmerName = `${sel.surname}, ${sel.first_name}`;
  state.rsbsaNo = sel.rsbsa_no;
  state.barangay = sel.barangay;
  farmerSearch.query.value = state.farmerName;
  farmerSearch.results.value = [];
  if (sel.plots.length === 1) {
    const p = sel.plots[0];
    state.farmPlotId = p.id;
    state.areaPlanted = String(p.size_ha || '');
    state.plotSizeHa = Number(p.size_ha) || 0;
    if (['Rice', 'Corn'].includes(p.commodity)) state.cropType = p.commodity;
  } else if (sel.plots.length) {
    const match = sel.plots.find((p) => p.commodity === state.cropType) || sel.plots[0];
    state.farmPlotId = match.id;
    state.areaPlanted = String(match.size_ha || state.areaPlanted);
    state.plotSizeHa = Number(match.size_ha) || 0;
  }
  applyAreaFromYieldLoss(state.yieldLossPct);
};

const onAreaPlantedInput = (e: CustomEvent) => {
  state.areaPlanted = e.detail.value ?? '';
};

const onAreaDamagedInput = (e: CustomEvent) => {
  const raw = e.detail.value ?? '';
  const planted = Number(state.areaPlanted) || 0;
  const cap = Math.min(
    state.plotSizeHa > 0 ? state.plotSizeHa : Number.POSITIVE_INFINITY,
    planted > 0 ? planted : Number.POSITIVE_INFINITY,
  );
  let next = raw;
  const n = Number(raw);
  if (!Number.isNaN(n) && Number.isFinite(cap) && n > cap) {
    next = String(cap);
  }
  state.areaDamaged = next;
};

const lockGps = async () => {
  lockingGps.value = true;
  try {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 12000 });
    state.latitude = pos.coords.latitude;
    state.longitude = pos.coords.longitude;
    await presentToast('GPS coordinates locked.', 'success', 2000);
  } catch {
    await presentToast('Unable to lock GPS. Enable location services.', 'warning');
  } finally {
    lockingGps.value = false;
  }
};

const capturePhoto = async () => {
  capturingPhoto.value = true;
  try {
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
    });
    state.photoDataUrl = photo.dataUrl || null;
    await presentToast('Disaster photo captured.', 'success', 2000);
  } catch {
    await presentToast('Camera unavailable. Check permissions.', 'warning');
  } finally {
    capturingPhoto.value = false;
  }
};

const submitAssessment = async () => {
  if (!canSubmit.value || submitting.value) return;
  submitting.value = true;
  try {
    const photo = state.photoDataUrl || '';
    if (state.assessmentId) {
      await apiClient.patch(`/damage-assessments/${state.assessmentId}/field-validate`, {
        latitude: state.latitude,
        longitude: state.longitude,
        photo_base64: photo,
        area_destroyed_ha: Number(state.areaDamaged) || 0,
        damage_percentage: state.yieldLossPct,
        crop_stage: state.cropStage || undefined,
        variety: state.variety || undefined,
        estimated_value_lost: Number(state.valueLost) || 0,
      });
    } else {
      if (!state.farmPlotId) {
        await presentToast('This farmer needs a farm plot before calamity assessment can be saved.', 'warning', 2800);
        return;
      }
      await apiClient.post('/damage-assessments', {
        id: crypto.randomUUID(),
        farm_plot_id: state.farmPlotId,
        farmer_id: state.farmerId,
        calamity_type: inferCalamityType(state.calamityEvent),
        calamity_name: state.calamityEvent,
        crop_stage: state.cropStage || undefined,
        variety: state.variety || undefined,
        area_destroyed_ha: Number(state.areaDamaged) || 0,
        area_planted_ha: Number(state.areaPlanted) || 0,
        date_of_calamity: new Date().toISOString().slice(0, 10),
        damage_percentage: state.yieldLossPct,
        estimated_value_lost: Number(state.valueLost) || 0,
        latitude: state.latitude,
        longitude: state.longitude,
        photo_base64: photo,
      });
    }
    await presentToast('Assessment saved. Added to the MAO rehabilitation masterlist.', 'success', 3200);
  } catch (e: any) {
    await presentToast(e?.response?.data?.message || 'Could not save assessment.', 'danger', 2800);
  } finally {
    submitting.value = false;
  }
};

function inferCalamityType(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('typhoon') || n.includes('bagyo')) return 'Typhoon';
  if (n.includes('flood') || n.includes('baha')) return 'Flood';
  if (n.includes('drought') || n.includes('el nino') || n.includes('elnino')) return 'Drought';
  if (n.includes('pest')) return 'Pest Outbreak';
  if (n.includes('hail')) return 'Hail';
  return 'Other';
}
</script>

<style scoped>
.page-bg { --background: #f4f8f5; }

.lede {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  color: #475569;
  line-height: 1.45;
}

.severity-line {
  margin: 0.35rem 0 0.6rem;
  font-size: 0.88rem;
  color: #475569;
}

.severity-line strong { color: #1a4731; }

.section-card {
  margin: 0 0 1rem;
  border-radius: 16px;
  border: 1px solid #d1e0d6;
  box-shadow: 0 2px 8px rgba(26, 71, 49, 0.08);
}

ion-card-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: #1a4731;
}

ion-card-subtitle {
  font-size: 0.82rem;
  color: #64748b;
}

.field-item {
  --background: #f8fafc;
  --border-radius: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  margin-bottom: 0.75rem;
  --min-height: 56px;
}

.search-box { position: relative; margin-bottom: 0.75rem; }
.search-input {
  --background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0 10px;
}
.hint { font-size: 0.8rem; color: #94a3b8; margin-top: 4px; }
.suggest {
  list-style: none; margin: 4px 0 0; padding: 0;
  border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;
  max-height: 200px; overflow: auto;
}
.suggest li {
  padding: 0.65rem 0.75rem; cursor: pointer;
  display: flex; flex-direction: column; border-bottom: 1px solid #f1f5f9;
  min-height: 52px;
}
.suggest li:active { background: #e8f5e9; }
.suggest li span { font-size: 0.78rem; color: #64748b; }

.farmer-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  background: #f0f7f2;
  border: 1px solid #c5d9cc;
  border-radius: 12px;
  padding: 0.75rem;
}

.farmer-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  color: #1a4731;
}

.farmer-meta {
  margin: 0.2rem 0 0;
  font-size: 0.82rem;
  color: #64748b;
}

.eligibility-chip { font-weight: 700; flex-shrink: 0; }

.dispatched-banner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
}

.dispatched-label {
  margin: 0;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #991b1b;
}

.dispatched-event {
  margin: 0.25rem 0 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: #dc2626;
}

.dispatched-meta {
  margin: 0.2rem 0 0;
  font-size: 0.88rem;
  color: #64748b;
}

.damage-segment {
  margin-bottom: 0.75rem;
  --background: #fef3c7;
}

.damage-segment ion-segment-button {
  --color: #92400e;
  --color-checked: #fff;
  --indicator-color: #dc2626;
  min-height: 48px;
  font-weight: 700;
  font-size: 0.82rem;
}

.damage-segment ion-segment-button[value='partial'] {
  --indicator-color: #ca8a04;
}

.damage-type-hint {
  font-size: 0.85rem;
  font-weight: 700;
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  margin-bottom: 0.75rem;
}

.damage-type-hint.total {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.damage-type-hint.partial {
  background: #fefce8;
  color: #854d0e;
  border: 1px solid #fde047;
}

.yield-lock {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fef2f2;
  border: 2px solid #fca5a5;
  border-radius: 12px;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
}

.yield-lock-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #991b1b;
}

.yield-lock-value {
  font-size: 1.35rem;
  font-weight: 800;
  color: #dc2626;
}

.range-item { padding-bottom: 0.5rem; }
.range-note {
  font-size: 1.1rem;
  font-weight: 800;
  color: #ca8a04;
  min-width: 48px;
  text-align: right;
}

.action-btn {
  --border-radius: 14px;
  min-height: 52px;
  font-size: 1rem;
  font-weight: 700;
  text-transform: none;
  margin-bottom: 0.65rem;
  --background: #1a4731;
}

.action-btn.outline {
  --border-color: #1a4731;
  --color: #1a4731;
}

.status-line {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  font-weight: 700;
}

.status-line.ok { color: #15803d; }
.status-line.muted { color: #94a3b8; font-weight: 600; }

.photo-preview {
  display: block;
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  border-radius: 12px;
  margin-bottom: 0.65rem;
  border: 2px solid #dc2626;
}

.relief-card {
  background: linear-gradient(135deg, #f0f7f2 0%, #fefce8 100%);
  border-color: #d4af37;
}

.relief-text {
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
  color: #1a4731;
}

.relief-text strong {
  color: #b45309;
  font-size: 1.05rem;
}

.relief-formula {
  margin: 0.5rem 0 0;
  font-size: 0.78rem;
  color: #64748b;
  font-style: italic;
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

.submit-btn:disabled { opacity: 0.55; }
</style>
