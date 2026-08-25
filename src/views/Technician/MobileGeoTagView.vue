<template>
  <ion-page>
    <ion-header class="gis-header">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button :default-href="plotId ? '/tech/geo-tag-queue' : '/tech/dashboard'"></ion-back-button>
        </ion-buttons>
        <ion-title>Mobile GIS Geo-Tag</ion-title>
      </ion-toolbar>
    </ion-header>

    <!-- Not fullscreen: absolute workspace must stay below the toolbar (not under it) -->
    <ion-content :scroll-y="false" class="gis-content">
      <div class="workspace">
        <div class="map-shell">
          <div ref="mapEl" class="map-canvas"></div>

          <div class="map-overlays">
            <div class="top-float" :class="{ interactive: hasAssignedFarmer }">
              <div class="float-main">
                <span class="float-label">Farmer</span>
                <strong class="float-farmer">{{ farmerDisplayName }}</strong>
                <p v-if="assignedPlotLabel" class="float-plot">{{ assignedPlotLabel }}</p>
                <button
                  v-if="hasAssignedFarmer"
                  type="button"
                  class="change-farmer-btn"
                  @click="clearFarmer"
                >
                  Change farmer
                </button>
              </div>
              <div class="float-acc" :class="{ good: accuracyM != null && accuracyM <= 10 }">
                Accuracy: {{ accuracyLabel }}
              </div>
            </div>

            <div v-if="hasAssignedFarmer" class="action-hub-float">
              <span class="hub-label">Farmer Action Hub</span>
              <button type="button" class="refusal-btn" @click="openRefusalPrompt">
                🚫 Log Georeferencing Refusal
              </button>
            </div>
          </div>
        </div>

        <div class="tool-palette">
          <!-- Assignment gate: QR + search before any drawing -->
          <div v-if="!hasAssignedFarmer" class="assign-panel">
            <p class="assign-title">Assign farmer to begin</p>
            <p class="mode-hint">Scan the RSBSA QR, or search by name / RSBSA number.</p>
            <ion-button
              expand="block"
              class="palette-btn primary"
              :disabled="lookingUp || isScanning"
              @click="startScan"
            >
              <ion-icon slot="start" :icon="qrCodeOutline"></ion-icon>
              {{ lookingUp ? 'Looking up…' : 'Scan Farmer QR' }}
            </ion-button>
            <div class="assign-search">
              <ion-input
                class="search-input"
                label="Search farmer (name or RSBSA)"
                label-placement="stacked"
                placeholder="Type at least 2 characters…"
                :value="searchQuery"
                @ionInput="onSearchInput"
              ></ion-input>
              <div v-if="searching" class="search-hint">Searching…</div>
              <ul v-if="searchResults.length" class="suggest">
                <li v-for="f in searchResults" :key="f.id" @click="selectSearchedFarmer(f)">
                  <strong>{{ formatFarmerName(f) }}</strong>
                  <span>{{ f.rsbsa_no || 'No RSBSA' }} · {{ f.permanent_brgy || f.barangay || '—' }}</span>
                </li>
              </ul>
              <p
                v-else-if="searchQuery.trim().length >= 2 && !searching"
                class="search-hint"
              >
                No farmers match “{{ searchQuery.trim() }}”.
              </p>
            </div>
          </div>

          <template v-else>
            <div class="mode-tabs">
              <button
                type="button"
                class="mode-tab"
                :class="{ active: toolMode === 'boundary' }"
                @click="setToolMode('boundary')"
              >
                Mode A · Boundary
              </button>
              <button
                type="button"
                class="mode-tab"
                :class="{ active: toolMode === 'incident' }"
                @click="setToolMode('incident')"
              >
                Mode B · Incident
              </button>
            </div>

            <!-- Mode A: Polygon boundary -->
            <div v-if="toolMode === 'boundary'" class="mode-body">
              <p class="mode-hint">
                Walk the perimeter. Drop points at your GPS, then complete the farm boundary.
                <span v-if="drawing">· {{ draftPoints.length }} point(s)</span>
              </p>
              <ion-button
                v-if="!drawing"
                expand="block"
                class="palette-btn primary"
                :disabled="!currentPos || !hasAssignedFarmer"
                @click="startBoundaryDraw"
              >
                Start Drawing Polygon
              </ion-button>
              <template v-else>
                <ion-button
                  expand="block"
                  class="palette-btn"
                  color="secondary"
                  :disabled="!currentPos"
                  @click="dropBoundaryPoint"
                >
                  Drop Point
                </ion-button>
                <ion-button
                  expand="block"
                  class="palette-btn primary"
                  :disabled="draftPoints.length < 3"
                  @click="completeFarmBoundary"
                >
                  Complete Farm Boundary
                </ion-button>
                <ion-button expand="block" fill="clear" color="medium" @click="cancelBoundaryDraw">
                  Cancel Drawing
                </ion-button>
              </template>
            </div>

            <!-- Mode B: Incident marker -->
            <div v-else class="mode-body">
              <p class="mode-hint">
                Drop a pin at your exact GPS fix for pests, damage, or healthy crop notes.
              </p>
              <ion-button
                expand="block"
                class="palette-btn primary"
                :disabled="!currentPos || !hasAssignedFarmer"
                @click="dropIncidentPin"
              >
                📍 Drop Incident Pin Here
              </ion-button>
            </div>
          </template>
        </div>
      </div>

      <div v-if="isScanning" class="scan-overlay">
        <div class="scan-frame" aria-hidden="true"></div>
        <p class="scan-label">Scanning…</p>
        <p class="scan-hint">Align the RSBSA QR inside the frame</p>
        <ion-button class="cancel-scan-btn" fill="solid" color="light" @click="stopScan">
          Cancel
        </ion-button>
      </div>

      <!-- Agricultural metadata bottom sheet -->
      <ion-modal
        :is-open="formModalOpen"
        :initial-breakpoint="0.75"
        :breakpoints="[0, 0.5, 0.75, 1]"
        handle-behavior="cycle"
        @didDismiss="onFormModalDismiss"
      >
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>{{ formTitle }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeFormModal">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding form-sheet">
          <ion-list lines="full" class="meta-list">
            <ion-item>
              <ion-select
                label="Commodity *"
                label-placement="stacked"
                interface="popover"
                :value="meta.crop_planted"
                @ionChange="(e: any) => meta.crop_planted = e.detail.value"
              >
                <ion-select-option value="Rice">Rice</ion-select-option>
                <ion-select-option value="Corn">Corn</ion-select-option>
                <ion-select-option value="High-Value Crops">High-Value Crops</ion-select-option>
                <ion-select-option
                  v-if="assignedPlotCommodity && !['Rice', 'Corn', 'High-Value Crops'].includes(assignedPlotCommodity)"
                  :value="assignedPlotCommodity"
                >{{ assignedPlotCommodity }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-input
                label="Parcel Name *"
                label-placement="stacked"
                :value="meta.parcel_name"
                placeholder="e.g. Parcel 1, North Field"
                @ionInput="(e: any) => meta.parcel_name = e.detail.value"
              ></ion-input>
            </ion-item>
            <ion-item>
              <VarietyField
                v-model="meta.crop_variety"
                :crop="meta.crop_planted"
                label="Crop Variety"
              />
            </ion-item>
            <div class="schedule-row">
              <ion-item class="schedule-item">
                <ion-select
                  label="Planting: Start Month *"
                  label-placement="stacked"
                  interface="popover"
                  :value="meta.planting_start_month"
                  @ionChange="(e: any) => meta.planting_start_month = e.detail.value"
                >
                  <ion-select-option v-for="m in MONTHS" :key="'start-' + m" :value="m">{{ m }}</ion-select-option>
                </ion-select>
              </ion-item>
              <ion-item class="schedule-item">
                <ion-select
                  label="Planting: End Month *"
                  label-placement="stacked"
                  interface="popover"
                  :value="meta.planting_end_month"
                  @ionChange="(e: any) => meta.planting_end_month = e.detail.value"
                >
                  <ion-select-option v-for="m in MONTHS" :key="'end-' + m" :value="m">{{ m }}</ion-select-option>
                </ion-select>
              </ion-item>
            </div>
            <ion-item>
              <ion-select
                label="Incident Type *"
                label-placement="stacked"
                interface="popover"
                :value="meta.incident_type"
                @ionChange="onIncidentTypeChange"
              >
                <ion-select-option value="none">None / Healthy</ion-select-option>
                <ion-select-option value="pest">Pest Outbreak</ion-select-option>
                <ion-select-option value="calamity">Calamity Damage</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-textarea
                label="Observations / Notes"
                label-placement="stacked"
                :value="meta.observations"
                :auto-grow="true"
                :rows="3"
                placeholder="Field notes, severity, crop stage…"
                @ionInput="(e: any) => meta.observations = e.detail.value"
              ></ion-textarea>
            </ion-item>
          </ion-list>

          <!-- RCM Protocol: non-productive area deduction (polygon boundaries only) -->
          <div v-if="pendingGeometry?.type === 'polygon'" class="rcm-card">
            <p class="rcm-title">DA-RSBSA Georeferencing (RCM Protocol)</p>
            <div class="area-row">
              <span class="area-lbl">Gross Boundary Area</span>
              <span class="area-val">{{ grossAreaSqm.toFixed(1) }} sqm · {{ grossAreaHa.toFixed(4) }} ha</span>
            </div>

            <ion-item class="npa-item">
              <ion-input
                type="number"
                label="Subtract Non-Productive Area (sqm)"
                label-placement="stacked"
                inputmode="decimal"
                :value="meta.non_productive_area_sqm"
                placeholder="e.g. house, road, canal — infra >200 sqm must be deducted"
                @ionInput="(e: any) => meta.non_productive_area_sqm = e.detail.value"
              ></ion-input>
            </ion-item>

            <div class="area-row final">
              <span class="area-lbl">Final Verified Area</span>
              <span class="area-val final-val">{{ finalVerifiedAreaHa.toFixed(4) }} ha</span>
            </div>
            <p class="area-hint">
              {{ finalVerifiedAreaSqm.toFixed(1) }} sqm after deduction
              · DA guideline: infrastructure larger than {{ NON_PRODUCTIVE_AREA_THRESHOLD_SQM }} sqm must be subtracted.
            </p>
          </div>

          <div v-if="hasAssignedFarmer && pendingGeometry?.type === 'polygon'" class="budget-card">
            <p class="rcm-title">Registered Area Budget</p>
            <div class="area-row">
              <span class="area-lbl">Registered Farm Area</span>
              <span class="area-val">{{ registeredAreaHa.toFixed(2) }} ha</span>
            </div>
            <div class="area-row">
              <span class="area-lbl">Currently Mapped Plots{{ replacingPlotLabel }}</span>
              <span class="area-val">{{ mappedForBudgetHa.toFixed(2) }} ha</span>
            </div>
            <div class="area-row">
              <span class="area-lbl">Remaining Unmapped Quota</span>
              <span class="area-val">{{ remainingQuotaHa.toFixed(2) }} ha</span>
            </div>
            <div class="area-row">
              <span class="area-lbl">This Polygon</span>
              <span class="area-val">{{ finalVerifiedAreaHa.toFixed(4) }} ha</span>
            </div>
            <p v-if="polygonExceedsQuota" class="budget-warn">
              Polygon exceeds remaining registered area. Adjust the boundary, or flag spatial discrepancy to save as an undeclared field revision.
            </p>
          </div>

          <ion-item class="discrepancy-item" lines="none">
            <ion-checkbox
              slot="start"
              :checked="meta.has_discrepancy"
              @ionChange="(e: any) => meta.has_discrepancy = e.detail.checked"
            ></ion-checkbox>
            <ion-label class="discrepancy-label">
              Flag Spatial Discrepancy
              <p class="discrepancy-sub">Farm overlaps another property, or an undeclared field was found. Required to save when the polygon exceeds the remaining registered area.</p>
            </ion-label>
          </ion-item>

          <div class="photo-block">
            <ion-button
              expand="block"
              class="camera-btn"
              :disabled="capturingPhoto"
              @click="capturePhotoEvidence"
            >
              <ion-icon slot="start" :icon="cameraOutline"></ion-icon>
              {{ capturingPhoto ? 'Opening Camera…' : '📸 Take Photo of Farmer at Location' }}
            </ion-button>
            <div v-if="meta.photoPreviewSrc" class="thumb-wrap">
              <img :src="meta.photoPreviewSrc" alt="Field evidence thumbnail" class="thumb" />
            </div>
          </div>

          <p class="spatial-summary">{{ spatialSummary }}</p>

          <div class="signature-block">
            <p class="signature-title">DA-RSBSA Georeferencing Consent &amp; Validation</p>
            <SignaturePad
              ref="farmerSigRef"
              label="Farmer's Signature (Consent for Georeferencing) *"
              @update:has-signature="(v: boolean) => (hasFarmerSignature = v)"
            />
            <SignaturePad
              ref="aewSigRef"
              label="AEW / Technician Signature (Validator) *"
              @update:has-signature="(v: boolean) => (hasAewSignature = v)"
            />
          </div>

          <ion-button
            expand="block"
            class="save-geo-btn"
            :disabled="!canSave || saving"
            @click="saveGeoTagRecord"
          >
            {{ saving ? 'Saving…' : 'Save Geo-Tag Record' }}
          </ion-button>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonButton, IonIcon, IonModal, IonList, IonItem, IonInput, IonSelect, IonSelectOption,
  IonTextarea, IonCheckbox, IonLabel, toastController, alertController, onIonViewDidEnter,
} from '@ionic/vue';
import { cameraOutline, qrCodeOutline } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ensureLocationPermission } from '@/composables/useNativeHardware';
import { db, newUuid, type GeoTagIncidentType, type GeoTagGeometryType, type GeoTagRefusalAttempt } from '@/database/db';
import { useSyncStore } from '@/stores/syncStore';
import { queueGeoTagRefusal, lookupFarmer, searchFarmers } from '@/services/syncService';
import SignaturePad from '@/components/SignaturePad.vue';
import VarietyField from '@/components/VarietyField.vue';
import apiClient from '@/utils/axios';
import { presentToast } from '@/utils/toast';

type ToolMode = 'boundary' | 'incident';

interface LatLngPoint {
  lat: number;
  lng: number;
}

interface PendingGeometry {
  type: GeoTagGeometryType;
  points: LatLngPoint[];
}

const ECHAGUE: L.LatLngExpression = [16.7167, 121.6833];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const INCIDENT_COLORS: Record<GeoTagIncidentType, string> = {
  none: '#2e7d32',
  pest: '#c62828',
  calamity: '#ef6c00',
};

const route = useRoute();
const syncStore = useSyncStore();

const mapEl = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let gpsDot: L.CircleMarker | null = null;
let accuracyRing: L.Circle | null = null;
let draftLayer: L.Polyline | L.Polygon | null = null;
let draftOverlayLayers: L.Layer[] = [];
let committedLayers: L.Layer[] = [];
let watchId: string | null = null;

const toolMode = ref<ToolMode>('boundary');
const drawing = ref(false);
const locating = ref(false);
const capturingPhoto = ref(false);
const saving = ref(false);
const formModalOpen = ref(false);

const currentPos = ref<LatLngPoint | null>(null);
const accuracyM = ref<number | null>(null);
const draftPoints = ref<LatLngPoint[]>([]);
const pendingGeometry = ref<PendingGeometry | null>(null);

interface AssignedPlot {
  id: string;
  commodity: string;
  parcel_name: string;
  location_brgy: string;
  size_ha: number;
  planting_start_month: string | null;
  planting_end_month: string | null;
  remarks: string;
}

const plotId = ref(String(route.query.plot_id || route.query.plot || '').trim());
const farmerId = ref(String(route.query.farmer || route.query.farmer_id || '').trim());
const farmerName = ref(
  String(route.query.farmerName || route.query.farmer_name || route.query.name || '').trim(),
);
const rsbsaNo = ref(String(route.query.rsbsa || route.query.rsbsa_no || '').trim());

const isScanning = ref(false);
const lookingUp = ref(false);
const searching = ref(false);
const searchQuery = ref('');
const searchResults = ref<any[]>([]);
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const hasAssignedFarmer = computed(() => !!farmerId.value);
const farmerDisplayName = computed(() =>
  farmerName.value.trim() || (hasAssignedFarmer.value ? 'Assigned farmer' : 'Unassigned Farmer'),
);

const registeredAreaHa = ref(0);
const farmerPlots = ref<AssignedPlot[]>([]);

const plotFromQuery = (): AssignedPlot | null => {
  const id = String(route.query.plot_id || route.query.plot || '').trim();
  if (!id) return null;
  return {
    id,
    commodity: String(route.query.commodity || '').trim(),
    parcel_name: String(route.query.parcel_name || '').trim(),
    location_brgy: String(route.query.barangay || '').trim(),
    size_ha: Number(route.query.size_ha) || 0,
    planting_start_month: String(route.query.planting_start || '').trim() || null,
    planting_end_month: String(route.query.planting_end || '').trim() || null,
    remarks: String(route.query.notes || '').trim(),
  };
};

const assignedPlot = ref<AssignedPlot | null>(plotFromQuery());

const mapApiPlot = (p: any): AssignedPlot => ({
  id: String(p.id),
  commodity: String(p.commodity || ''),
  parcel_name: String(p.parcel_name || ''),
  location_brgy: String(p.location_brgy || ''),
  size_ha: Number(p.size_ha) || 0,
  planting_start_month: p.planting_start_month || null,
  planting_end_month: p.planting_end_month || null,
  remarks: String(p.geotag_notes || p.remarks || ''),
});

const defaultParcelName = (p: AssignedPlot) => {
  if (p.parcel_name.trim()) return p.parcel_name.trim();
  return [p.commodity, p.location_brgy, p.size_ha ? `${p.size_ha.toFixed(2)} ha` : '']
    .filter(Boolean)
    .join(' · ') || 'Parcel 1';
};

const resolvedAssignedPlot = computed(() => {
  if (assignedPlot.value && (!plotId.value || assignedPlot.value.id === plotId.value)) {
    return assignedPlot.value;
  }
  if (plotId.value) {
    return farmerPlots.value.find((p) => p.id === plotId.value) || plotFromQuery();
  }
  return plotFromQuery();
});

const assignedPlotLabel = computed(() => {
  const p = resolvedAssignedPlot.value;
  if (!p) return '';
  return defaultParcelName(p);
});

const assignedPlotCommodity = computed(() => resolvedAssignedPlot.value?.commodity || '');

const applyAssignedPlotMeta = () => {
  if (formModalOpen.value) return;
  const p = resolvedAssignedPlot.value;
  if (!p) return;
  if (p.commodity) meta.crop_planted = p.commodity;
  meta.parcel_name = defaultParcelName(p);
  if (p.planting_start_month) meta.planting_start_month = p.planting_start_month;
  if (p.planting_end_month) meta.planting_end_month = p.planting_end_month;
  if (p.remarks) meta.observations = p.remarks;
};

const loadAssignedPlot = async () => {
  if (!plotId.value) {
    assignedPlot.value = plotFromQuery();
    applyAssignedPlotMeta();
    return;
  }
  assignedPlot.value = plotFromQuery() || assignedPlot.value;
  applyAssignedPlotMeta();
  try {
    const res = await apiClient.get(`/farm-plots/${plotId.value}`);
    const p = res.data?.data;
    if (p) {
      assignedPlot.value = mapApiPlot(p);
      applyAssignedPlotMeta();
    }
  } catch {
    const fromFarmer = farmerPlots.value.find((p) => p.id === plotId.value);
    if (fromFarmer) {
      assignedPlot.value = fromFarmer;
      applyAssignedPlotMeta();
    }
  }
};

const loadFarmerBudget = async (id: string) => {
  if (!id) {
    registeredAreaHa.value = 0;
    farmerPlots.value = [];
    return;
  }
  try {
    const res = await apiClient.get(`/farmers/${id}`);
    const f = res.data?.data;
    const plots = f?.farm_plots || f?.farmPlots || [];
    registeredAreaHa.value = Number(f?.total_farm_area_ha ?? 0) || 0;
    farmerPlots.value = plots.map(mapApiPlot);
    if (plotId.value) {
      const match = farmerPlots.value.find((p) => p.id === plotId.value);
      if (match && (!assignedPlot.value || assignedPlot.value.id === match.id)) {
        assignedPlot.value = match;
        applyAssignedPlotMeta();
      }
    }
  } catch {
    registeredAreaHa.value = 0;
    farmerPlots.value = [];
  }
};

const formatFarmerName = (f: any) => {
  if (!f) return '';
  if (f.full_name) return f.full_name;
  const parts = [f.surname || f.last_name, [f.first_name, f.middle_name].filter(Boolean).join(' ')].filter(Boolean);
  return parts.length ? parts.join(', ') : (f.name || 'Unknown farmer');
};

const applyFarmer = (result: any) => {
  farmerId.value = String(result?.id || '').trim();
  farmerName.value = formatFarmerName(result);
  rsbsaNo.value = String(result?.rsbsa_no || result?.rsbsaNo || '').trim();
  searchQuery.value = '';
  searchResults.value = [];
  void loadFarmerBudget(farmerId.value);
};

const selectSearchedFarmer = (f: any) => {
  applyFarmer(f);
  void toast('Farmer assigned.', 'success');
};

const clearFarmer = () => {
  if (drawing.value) cancelBoundaryDraw();
  farmerId.value = '';
  farmerName.value = '';
  rsbsaNo.value = '';
  plotId.value = '';
  assignedPlot.value = null;
  searchQuery.value = '';
  searchResults.value = [];
  registeredAreaHa.value = 0;
  farmerPlots.value = [];
};

const onSearchInput = (e: CustomEvent) => {
  const value = String(e.detail.value ?? '');
  searchQuery.value = value;
  if (searchTimer) clearTimeout(searchTimer);
  const term = value.trim();
  if (term.length < 2) {
    searchResults.value = [];
    searching.value = false;
    return;
  }
  searching.value = true;
  searchTimer = setTimeout(async () => {
    try {
      searchResults.value = await searchFarmers(term);
    } catch {
      searchResults.value = [];
    } finally {
      searching.value = false;
    }
  }, 280);
};

const fetchFarmerByQr = async (raw: string) => {
  const value = raw.trim();
  if (!value) return;
  lookingUp.value = true;
  try {
    const result = await lookupFarmer(value);
    if (!result) {
      searchQuery.value = value;
      searchResults.value = await searchFarmers(value);
      await toast(
        searchResults.value.length
          ? 'Pick the matching farmer below.'
          : 'No farmer found for that QR / RSBSA / name.',
        'warning',
      );
      return;
    }
    applyFarmer(result);
    await toast('Farmer assigned.', 'success');
  } catch (err) {
    console.warn('[AGRI-AKAP] Farmer lookup failed:', err);
    await toast('Lookup failed. Check connection or try again.', 'danger');
  } finally {
    lookingUp.value = false;
  }
};

/** ML Kit `scan()` uses a native camera UI — do not clear the WebView background. */
const clearScannerBackground = () => {
  document.body.classList.remove('scanner-active', 'barcode-scanner-active');
};

const stopScan = async () => {
  try {
    await BarcodeScanner.stopScan?.();
  } catch {
    // ignore
  }
  clearScannerBackground();
  isScanning.value = false;
};

const startScan = async () => {
  if (isScanning.value) return;

  if (!Capacitor.isNativePlatform()) {
    await toast('Camera scanner needs a native build. Search by name or RSBSA below.', 'warning');
    return;
  }

  try {
    const { camera } = await BarcodeScanner.requestPermissions();
    if (camera !== 'granted' && camera !== 'limited') {
      await toast('Camera permission denied. Search by name or RSBSA below.', 'warning');
      return;
    }

    isScanning.value = true;
    clearScannerBackground();

    const { barcodes } = await BarcodeScanner.scan();
    const raw = barcodes[0]?.rawValue?.trim();
    await stopScan();

    if (!raw) {
      await toast('No QR code detected. Try again or search manually.', 'warning');
      return;
    }

    searchQuery.value = raw;
    await fetchFarmerByQr(raw);
  } catch (err) {
    console.warn('[AGRI-AKAP] QR scanner failed (web/native):', err);
    await stopScan();
    await toast('Scanner unavailable. Search by name or RSBSA below.', 'danger');
  }
};

const meta = reactive({
  crop_planted: 'Rice',
  crop_variety: '',
  parcel_name: '',
  planting_start_month: null as string | null,
  planting_end_month: null as string | null,
  incident_type: 'none' as GeoTagIncidentType,
  observations: '',
  non_productive_area_sqm: '' as string | number,
  has_discrepancy: false,
  photoBase64: null as string | null,
  photoPreviewSrc: null as string | null,
});

watch(
  () => [plotId.value, farmerPlots.value, assignedPlot.value] as const,
  () => {
    if (formModalOpen.value) return;
    applyAssignedPlotMeta();
  },
);

const matchingPlotForCrop = computed(() => {
  if (plotId.value) {
    return assignedPlot.value
      || farmerPlots.value.find((p) => p.id === plotId.value)
      || farmerPlots.value[0]
      || null;
  }
  const crop = String(meta.crop_planted || '').trim().toLowerCase();
  if (!crop) return null;
  return farmerPlots.value.find((p) => p.commodity.trim().toLowerCase() === crop)
    || farmerPlots.value[0]
    || null;
});

const mappedForBudgetHa = computed(() => {
  const excludeId = matchingPlotForCrop.value?.id;
  return farmerPlots.value
    .filter((p) => !excludeId || p.id !== excludeId)
    .reduce((s, p) => s + (Number(p.size_ha) || 0), 0);
});

const remainingQuotaHa = computed(() =>
  Math.max(0, registeredAreaHa.value - mappedForBudgetHa.value),
);

const replacingPlotLabel = computed(() =>
  matchingPlotForCrop.value ? ' (replacing matching plot)' : '',
);

interface SignaturePadHandle {
  clear: () => void;
  toBase64: () => string | null;
}

const farmerSigRef = ref<SignaturePadHandle | null>(null);
const aewSigRef = ref<SignaturePadHandle | null>(null);
const hasFarmerSignature = ref(false);
const hasAewSignature = ref(false);

const accuracyLabel = computed(() => {
  if (accuracyM.value == null) return locating.value ? 'Acquiring…' : '—';
  return `±${Math.round(accuracyM.value)}m`;
});

const formTitle = computed(() =>
  pendingGeometry.value?.type === 'polygon' ? 'Farm Boundary Metadata' : 'Incident Pin Metadata',
);

const spatialSummary = computed(() => {
  const g = pendingGeometry.value;
  if (!g) return '';
  if (g.type === 'polygon') {
    return `Boundary: ${g.points.length} vertices · color follows Incident Type on map`;
  }
  const p = g.points[0];
  return p
    ? `Marker: ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`
    : 'Marker pending';
});

/**
 * Haversine great-circle distance in metres between two WGS-84 points.
 * Used for the DA Start/End Gap Rule check before the metadata modal opens.
 */
const haversineMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

/**
 * Equirectangular-projection shoelace area (meters²) — matches the backend's
 * `polygonAreaSqm()` so the technician's on-device preview equals the
 * server's authoritative RCM Protocol figure.
 */
const shoelaceAreaSqm = (points: LatLngPoint[]): number => {
  if (points.length < 3) return 0;
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const meanLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const cos = Math.cos(toRad(meanLat));
  const xy = points.map((p) => ({
    x: toRad(p.lng) * R * cos,
    y: toRad(p.lat) * R,
  }));
  let area = 0;
  for (let i = 0; i < xy.length; i++) {
    const j = (i + 1) % xy.length;
    area += xy[i].x * xy[j].y - xy[j].x * xy[i].y;
  }
  return Math.abs(area) / 2;
};

/** Gross farm boundary area (sqm), before the non-productive area deduction. */
const grossAreaSqm = computed(() => {
  const g = pendingGeometry.value;
  if (!g || g.type !== 'polygon') return 0;
  return shoelaceAreaSqm(g.points);
});

const grossAreaHa = computed(() => grossAreaSqm.value / 10000);

/** DA guideline: infrastructure/idle pockets larger than this must be deducted. */
const NON_PRODUCTIVE_AREA_THRESHOLD_SQM = 200;

const nonProductiveAreaSqm = computed(() => Math.max(0, Number(meta.non_productive_area_sqm) || 0));

/** Final Verified Area = gross boundary area minus the declared non-productive deduction. */
const finalVerifiedAreaSqm = computed(() =>
  Math.max(0, grossAreaSqm.value - nonProductiveAreaSqm.value),
);

const finalVerifiedAreaHa = computed(() => finalVerifiedAreaSqm.value / 10000);

const polygonExceedsQuota = computed(() =>
  pendingGeometry.value?.type === 'polygon'
  && finalVerifiedAreaHa.value > remainingQuotaHa.value + 0.0001,
);

const canSave = computed(() =>
  hasAssignedFarmer.value
  && !!pendingGeometry.value
  && pendingGeometry.value.points.length > 0
  && !!meta.crop_planted
  && !!meta.parcel_name?.trim()
  && !!meta.incident_type
  && !!meta.planting_start_month
  && !!meta.planting_end_month
  && hasFarmerSignature.value
  && hasAewSignature.value
  && (!polygonExceedsQuota.value || !!meta.has_discrepancy)
);

const toast = (message: string, color: 'success' | 'warning' | 'danger' | 'primary' = 'primary') =>
  presentToast(message, color);

const resetMetaForm = () => {
  meta.crop_planted = 'Rice';
  meta.crop_variety = '';
  meta.parcel_name = '';
  meta.planting_start_month = null;
  meta.planting_end_month = null;
  meta.incident_type = pendingGeometry.value?.type === 'polygon' ? 'none' : 'pest';
  meta.observations = '';
  meta.non_productive_area_sqm = '';
  meta.has_discrepancy = false;
  meta.photoBase64 = null;
  meta.photoPreviewSrc = null;
  farmerSigRef.value?.clear();
  aewSigRef.value?.clear();
  hasFarmerSignature.value = false;
  hasAewSignature.value = false;
  applyAssignedPlotMeta();
};

const clearDraftLayers = () => {
  if (!map) return;
  if (draftLayer) {
    map.removeLayer(draftLayer);
    draftLayer = null;
  }
  draftOverlayLayers.forEach((m) => map?.removeLayer(m));
  draftOverlayLayers = [];
};

const redrawDraft = () => {
  if (!map) return;
  clearDraftLayers();
  const latlngs = draftPoints.value.map((p) => [p.lat, p.lng] as L.LatLngExpression);
  if (!latlngs.length) return;

  const color = INCIDENT_COLORS.none;
  draftLayer = L.polyline(latlngs, { color, weight: 3, dashArray: '6 4' }).addTo(map);
  draftPoints.value.forEach((p) => {
    const m = L.circleMarker([p.lat, p.lng], {
      radius: 6,
      color: '#fff',
      weight: 2,
      fillColor: color,
      fillOpacity: 1,
    }).addTo(map!);
    draftOverlayLayers.push(m);
  });
};

const coloredDivIcon = (color: string, label: string) =>
  L.divIcon({
    className: 'geo-pin',
    html: `<span class="geo-pin-dot" style="background:${color}"></span><span class="geo-pin-lbl">${label}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

const paintCommittedGeometry = (geometry: PendingGeometry, incident: GeoTagIncidentType) => {
  if (!map) return;
  const color = INCIDENT_COLORS[incident];
  if (geometry.type === 'polygon' && geometry.points.length >= 3) {
    const poly = L.polygon(
      geometry.points.map((p) => [p.lat, p.lng] as L.LatLngExpression),
      { color, weight: 3, fillColor: color, fillOpacity: 0.25 },
    ).addTo(map);
    committedLayers.push(poly);
  } else if (geometry.points[0]) {
    const p = geometry.points[0];
    const label = incident === 'pest' ? 'P' : incident === 'calamity' ? 'D' : 'H';
    const marker = L.marker([p.lat, p.lng], { icon: coloredDivIcon(color, label) }).addTo(map);
    committedLayers.push(marker);
  }
};

const updateGpsVisual = (lat: number, lng: number, accuracy: number) => {
  if (!map) return;
  if (gpsDot) {
    gpsDot.setLatLng([lat, lng]);
  } else {
    gpsDot = L.circleMarker([lat, lng], {
      radius: 8,
      color: '#ffffff',
      weight: 2,
      fillColor: '#2196f3',
      fillOpacity: 1,
      className: 'tech-gps-dot',
    }).addTo(map);
  }
  if (accuracyRing) {
    accuracyRing.setLatLng([lat, lng]);
    accuracyRing.setRadius(Math.max(accuracy, 5));
  } else {
    accuracyRing = L.circle([lat, lng], {
      radius: Math.max(accuracy, 5),
      color: '#2196f3',
      weight: 1,
      fillColor: '#2196f3',
      fillOpacity: 0.12,
    }).addTo(map);
  }
};

const refreshMapSize = () => {
  if (!map) return;
  requestAnimationFrame(() => {
    map?.invalidateSize({ animate: false });
  });
};

const initMap = async () => {
  await nextTick();
  if (!mapEl.value || map) return;
  map = L.map(mapEl.value, {
    center: ECHAGUE,
    zoom: 16,
    zoomControl: false,
    attributionControl: false,
  });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(map);
  // Smooth mobile pans / prevent Ionic scroll steal
  map.getContainer().addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  refreshMapSize();
  setTimeout(refreshMapSize, 100);
  setTimeout(refreshMapSize, 350);
};

const applyPosition = (
  coords: { latitude: number; longitude: number; accuracy?: number | null },
  recenter = false,
) => {
  const lat = coords.latitude;
  const lng = coords.longitude;
  currentPos.value = { lat, lng };
  accuracyM.value = coords.accuracy ?? null;
  updateGpsVisual(lat, lng, coords.accuracy || 15);
  if (recenter && map) {
    map.setView([lat, lng], Math.max(map.getZoom(), 16), { animate: true });
  }
};

const startLiveTracking = async () => {
  locating.value = true;
  try {
    const allowed = await ensureLocationPermission();
    if (!allowed) {
      await toast('Location permission required for GIS tagging.', 'warning');
      locating.value = false;
      return;
    }

    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
    applyPosition(pos.coords, true);

    watchId = await Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 },
      (position, err) => {
        if (err || !position) return;
        applyPosition(position.coords, false);
      },
    );
  } catch (err) {
    console.warn('[AGRI-AKAP] Live GPS failed:', err);
    await toast('Unable to start live GPS. Check permissions.', 'warning');
  } finally {
    locating.value = false;
  }
};

const stopLiveTracking = async () => {
  if (!watchId) return;
  try {
    await Geolocation.clearWatch({ id: watchId });
  } catch {
    // ignore
  }
  watchId = null;
};

const setToolMode = (mode: ToolMode) => {
  if (drawing.value) cancelBoundaryDraw();
  toolMode.value = mode;
};

const startBoundaryDraw = () => {
  if (!hasAssignedFarmer.value) {
    void toast('Assign a farmer first (scan QR or search).', 'warning');
    return;
  }
  drawing.value = true;
  draftPoints.value = [];
  clearDraftLayers();
};

const cancelBoundaryDraw = () => {
  drawing.value = false;
  draftPoints.value = [];
  clearDraftLayers();
};

const dropBoundaryPoint = async () => {
  if (!currentPos.value) {
    await toast('Waiting for GPS fix…', 'warning');
    return;
  }
  draftPoints.value.push({ ...currentPos.value });
  redrawDraft();
};

const openMetadataModal = (geometry: PendingGeometry) => {
  pendingGeometry.value = geometry;
  resetMetaForm();
  formModalOpen.value = true;
  clearDraftLayers();
  if (!map) return;
  const color = INCIDENT_COLORS[meta.incident_type];
  if (geometry.type === 'polygon' && geometry.points.length >= 3) {
    draftLayer = L.polygon(
      geometry.points.map((p) => [p.lat, p.lng] as L.LatLngExpression),
      { color, weight: 3, fillColor: color, fillOpacity: 0.2 },
    ).addTo(map);
  } else if (geometry.points[0]) {
    const p = geometry.points[0];
    const label = meta.incident_type === 'pest' ? 'P' : meta.incident_type === 'calamity' ? 'D' : 'H';
    draftOverlayLayers.push(
      L.marker([p.lat, p.lng], { icon: coloredDivIcon(color, label) }).addTo(map),
    );
  }
};

const discardPendingOnClose = ref(true);

const closeFormModal = () => {
  formModalOpen.value = false;
};

const onFormModalDismiss = () => {
  formModalOpen.value = false;
  if (discardPendingOnClose.value && pendingGeometry.value) {
    clearDraftLayers();
    pendingGeometry.value = null;
  }
  discardPendingOnClose.value = true;
};

const completeFarmBoundary = async () => {
  if (draftPoints.value.length < 3) {
    await toast('Need at least 3 points to close a farm boundary.', 'warning');
    return;
  }

  const points = [...draftPoints.value];

  // DA Start/End Gap Rule — the perimeter walk's first and last points must be
  // ≤ 10 m apart. Catch this before queuing so the technician can correct it
  // in the field rather than discovering it only on sync.
  const first = points[0];
  const last = points[points.length - 1];
  const gapM = haversineMeters(first.lat, first.lng, last.lat, last.lng);
  if (gapM > 10) {
    await toast(
      `Start–End gap is ${Math.round(gapM)} m. DA requires ≤ 10 m — walk back closer to your starting point before completing.`,
      'warning',
    );
    return;
  }

  drawing.value = false;
  draftPoints.value = [];
  openMetadataModal({ type: 'polygon', points });
};

const dropIncidentPin = async () => {
  if (!hasAssignedFarmer.value) {
    await toast('Assign a farmer first (scan QR or search).', 'warning');
    return;
  }
  if (!currentPos.value) {
    await toast('Waiting for GPS fix…', 'warning');
    return;
  }
  openMetadataModal({ type: 'marker', points: [{ ...currentPos.value }] });
};

const onIncidentTypeChange = (e: CustomEvent) => {
  meta.incident_type = e.detail.value as GeoTagIncidentType;
  // Live recolor draft polygon / preview pin
  const g = pendingGeometry.value;
  if (!map || !g) return;
  clearDraftLayers();
  const color = INCIDENT_COLORS[meta.incident_type];
  if (g.type === 'polygon' && g.points.length >= 3) {
    draftLayer = L.polygon(
      g.points.map((p) => [p.lat, p.lng] as L.LatLngExpression),
      { color, weight: 3, fillColor: color, fillOpacity: 0.25 },
    ).addTo(map);
  } else if (g.points[0]) {
    const p = g.points[0];
    const label = meta.incident_type === 'pest' ? 'P' : meta.incident_type === 'calamity' ? 'D' : 'H';
    const marker = L.marker([p.lat, p.lng], { icon: coloredDivIcon(color, label) }).addTo(map);
    draftOverlayLayers.push(marker);
  }
};

const capturePhotoEvidence = async () => {
  capturingPhoto.value = true;
  try {
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
    });
    const base64 = photo.base64String ?? null;
    if (!base64) throw new Error('Empty camera payload');
    const format = (photo.format || 'jpeg').toLowerCase();
    meta.photoBase64 = base64;
    meta.photoPreviewSrc = `data:image/${format};base64,${base64}`;
    await toast('Photo evidence captured.', 'success');
  } catch (err) {
    console.warn('[AGRI-AKAP] Camera capture failed:', err);
    await toast('Camera unavailable. Check permissions.', 'warning');
  } finally {
    capturingPhoto.value = false;
  }
};

/**
 * DA "3-Attempt Rule": logs a farmer's refusal to consent to georeferencing.
 * Three logged refusals make the farmer eligible for the RSBSA exclusion
 * protocol, reviewed by MAO staff once synced.
 */
const openRefusalPrompt = async () => {
  if (!hasAssignedFarmer.value) {
    await toast('Assign a farmer first before logging a refusal.', 'warning');
    return;
  }
  const alert = await alertController.create({
    header: 'Log Georeferencing Refusal',
    subHeader: farmerDisplayName.value,
    message: 'Is this the 1st, 2nd, or 3rd refusal attempt?',
    inputs: [
      { type: 'radio', label: '1st Attempt', value: 1, checked: true },
      { type: 'radio', label: '2nd Attempt', value: 2 },
      { type: 'radio', label: '3rd Attempt (triggers DA exclusion review)', value: 3 },
    ],
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Next' },
    ],
  });
  await alert.present();
  const { data, role } = await alert.onDidDismiss();
  if (role === 'cancel' || data?.values == null) return;

  const attemptNumber = Number(data.values) as GeoTagRefusalAttempt;
  await promptRefusalReason(attemptNumber);
};

const promptRefusalReason = async (attemptNumber: GeoTagRefusalAttempt) => {
  const alert = await alertController.create({
    header: `Refusal — Attempt ${attemptNumber}`,
    message: 'Please provide a brief reason for the refusal.',
    inputs: [
      {
        name: 'reason',
        type: 'textarea',
        placeholder: 'e.g. Farmer unavailable, distrust of GPS mapping, land dispute…',
      },
    ],
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Save',
        handler: async (form: any) => {
          const reason = String(form.reason || '').trim();
          if (!reason) {
            await toast('A brief reason is required.', 'warning');
            return false;
          }
          await queueGeoTagRefusal({
            farmer_id: farmerId.value || undefined,
            farmer_name: farmerDisplayName.value,
            rsbsa_no: rsbsaNo.value || undefined,
            attempt_number: attemptNumber,
            reason,
          });
          await syncStore.refreshCount();
          await toast(
            attemptNumber >= 3
              ? 'Refusal logged (3rd attempt) — flagged for DA exclusion review.'
              : `Refusal logged (attempt ${attemptNumber}).`,
            'warning',
          );
          return true;
        },
      },
    ],
  });
  await alert.present();
};

const saveGeoTagRecord = async () => {
  if (!canSave.value || saving.value || !pendingGeometry.value) return;
  saving.value = true;
  try {
    const geometry = pendingGeometry.value;
    const coordinates =
      geometry.type === 'polygon'
        ? JSON.stringify(geometry.points)
        : JSON.stringify(geometry.points[0]);

    const isPolygon = geometry.type === 'polygon';

    await db.offline_geo_tags.add({
      client_id: newUuid(),
      farmer_id: farmerId.value || undefined,
      farmer_name: farmerDisplayName.value,
      rsbsa_no: rsbsaNo.value || undefined,
      farm_plot_id: plotId.value || matchingPlotForCrop.value?.id || undefined,
      geometry_type: geometry.type,
      coordinates,
      crop_planted: meta.crop_planted,
      crop_variety: meta.crop_variety.trim(),
      parcel_name: meta.parcel_name.trim(),
      incident_type: meta.incident_type,
      observations: meta.observations.trim(),
      photo_base64: meta.photoBase64,
      accuracy_m: accuracyM.value,
      gross_area_sqm: isPolygon ? grossAreaSqm.value : null,
      non_productive_area_sqm: isPolygon ? nonProductiveAreaSqm.value : null,
      final_area_sqm: isPolygon ? finalVerifiedAreaSqm.value : null,
      final_area_ha: isPolygon ? finalVerifiedAreaHa.value : null,
      has_discrepancy: meta.has_discrepancy,
      notify_sms: true,
      planting_start_month: meta.planting_start_month,
      planting_end_month: meta.planting_end_month,
      farmer_signature_base64: farmerSigRef.value?.toBase64() ?? null,
      aew_signature_base64: aewSigRef.value?.toBase64() ?? null,
      sync_status: 'pending',
      created_at: new Date().toISOString(),
    });

    paintCommittedGeometry(geometry, meta.incident_type);
    clearDraftLayers();
    pendingGeometry.value = null;
    discardPendingOnClose.value = false;
    formModalOpen.value = false;

    await syncStore.refreshCount();
    await toast('Geo-tag saved offline. Will sync to MAO when online.', 'success');
  } catch (err) {
    console.warn('[AGRI-AKAP] Failed to queue geo-tag:', err);
    await toast('Could not save locally. Please try again.', 'danger');
  } finally {
    saving.value = false;
  }
};

watch(
  () => [
    route.query.farmer,
    route.query.farmer_id,
    route.query.farmerName,
    route.query.farmer_name,
    route.query.name,
    route.query.rsbsa,
    route.query.rsbsa_no,
    route.query.plot_id,
    route.query.plot,
    route.query.commodity,
    route.query.parcel_name,
    route.query.barangay,
    route.query.size_ha,
    route.query.planting_start,
    route.query.planting_end,
    route.query.notes,
  ],
  () => {
    const id = String(route.query.farmer || route.query.farmer_id || '').trim();
    const name = String(route.query.farmerName || route.query.farmer_name || route.query.name || '').trim();
    const rsbsa = String(route.query.rsbsa || route.query.rsbsa_no || '').trim();
    const pid = String(route.query.plot_id || route.query.plot || '').trim();
    if (id) farmerId.value = id;
    if (name) farmerName.value = name;
    if (rsbsa) rsbsaNo.value = rsbsa;
    plotId.value = pid;
    if (pid) {
      assignedPlot.value = plotFromQuery() || assignedPlot.value;
      applyAssignedPlotMeta();
      void loadAssignedPlot();
    }
  },
);

onMounted(async () => {
  clearScannerBackground();
  await initMap();
  await startLiveTracking();
  if (farmerId.value) {
    void loadFarmerBudget(farmerId.value);
  }
  if (plotId.value) {
    void loadAssignedPlot();
  }
});

/** Ionic keeps pages cached — resize when this tab becomes visible again. */
onIonViewDidEnter(() => {
  clearScannerBackground();
  refreshMapSize();
  setTimeout(refreshMapSize, 200);
  const pid = String(route.query.plot_id || route.query.plot || '').trim();
  const id = String(route.query.farmer || route.query.farmer_id || '').trim();
  const name = String(route.query.farmerName || route.query.farmer_name || route.query.name || '').trim();
  const rsbsa = String(route.query.rsbsa || route.query.rsbsa_no || '').trim();
  if (id) farmerId.value = id;
  if (name) farmerName.value = name;
  if (rsbsa) rsbsaNo.value = rsbsa;
  plotId.value = pid;
  if (pid) void loadAssignedPlot();
});

watch(farmerId, (id) => {
  if (id) void loadFarmerBudget(id);
});

onBeforeUnmount(async () => {
  if (searchTimer) clearTimeout(searchTimer);
  await stopScan();
  clearScannerBackground();
  await stopLiveTracking();
  clearDraftLayers();
  committedLayers.forEach((l) => map?.removeLayer(l));
  committedLayers = [];
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<style scoped>
.gis-header {
  position: relative;
  z-index: 100;
}

.gis-header ion-toolbar {
  --background: #1a4731;
  --color: #ffffff;
  --border-width: 0;
}

.gis-content {
  --background: #e8f0eb;
  --padding-top: 0;
  --padding-bottom: 0;
  --padding-start: 0;
  --padding-end: 0;
  position: relative;
  z-index: 1;
}

/* Fill the content box only (header + tab bar already reserved by Ionic) */
.workspace {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.map-shell {
  position: relative;
  flex: 1 1 auto;
  min-height: 140px;
  overflow: hidden;
  background: #dce8df;
}

.map-canvas {
  width: 100%;
  height: 100%;
  touch-action: none;
  z-index: 0;
}

.map-overlays {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  z-index: 500;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
}

.top-float {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 0.85rem;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  pointer-events: none;
}

.top-float.interactive {
  pointer-events: auto;
}

.float-label {
  display: block;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #64748b;
}

.float-farmer {
  display: block;
  font-size: 0.95rem;
  font-weight: 800;
  color: #1a4731;
  line-height: 1.2;
}

.float-plot {
  margin: 0.2rem 0 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #0f766e;
  line-height: 1.3;
}

.change-farmer-btn {
  margin-top: 0.2rem;
  padding: 0;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
}

.assign-panel {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.15rem 0 0.35rem;
  max-height: 100%;
  overflow: auto;
}

.assign-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
  color: #1a4731;
}

.assign-search {
  background: rgba(255, 255, 255, 0.96);
  border-radius: 10px;
  padding: 0.25rem 0.65rem 0.55rem;
}

.assign-search .search-input {
  --padding-start: 0;
  --color: #0f172a;
}

.search-hint {
  margin: 0.25rem 0 0;
  font-size: 0.78rem;
  color: #64748b;
}

.suggest {
  list-style: none;
  margin: 0.35rem 0 0;
  padding: 0;
  max-height: 140px;
  overflow: auto;
}

.suggest li {
  padding: 0.5rem 0.1rem;
  border-top: 1px solid #eef2f0;
  cursor: pointer;
}

.suggest li strong {
  display: block;
  color: #1a4731;
  font-size: 0.88rem;
}

.suggest li span {
  display: block;
  color: #64748b;
  font-size: 0.74rem;
  margin-top: 0.1rem;
}

.scan-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding: 0 1.25rem 3rem;
  pointer-events: none;
  background: transparent;
}

.scan-frame {
  position: absolute;
  top: 22%;
  left: 50%;
  transform: translateX(-50%);
  width: min(72vw, 280px);
  height: min(72vw, 280px);
  border: 3px solid #d4af37;
  border-radius: 16px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.35);
  pointer-events: none;
}

.scan-label {
  pointer-events: none;
  margin: 0 0 0.35rem;
  font-size: 1.25rem;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.55);
}

.scan-hint {
  pointer-events: none;
  margin: 0 0 1.25rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
}

.cancel-scan-btn {
  pointer-events: auto;
  --border-radius: 14px;
  min-width: 160px;
  font-weight: 800;
  text-transform: none;
}

.float-acc {
  flex-shrink: 0;
  font-size: 0.78rem;
  font-weight: 800;
  color: #b45309;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  padding: 0.35rem 0.55rem;
}

.float-acc.good {
  color: #166534;
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.action-hub-float {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.45rem 0.6rem;
  border-radius: 10px;
  background: rgba(15, 36, 25, 0.72);
  backdrop-filter: blur(2px);
  pointer-events: auto;
}

.hub-label {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #cfe8d8;
  flex-shrink: 0;
}

.refusal-btn {
  border: 1px solid #fca5a5;
  background: rgba(254, 242, 242, 0.95);
  color: #b91c1c;
  font-size: 0.7rem;
  font-weight: 800;
  border-radius: 8px;
  padding: 0.4rem 0.55rem;
  line-height: 1.2;
  white-space: nowrap;
}

.refusal-btn:active {
  background: #fee2e2;
}

.tool-palette {
  flex: 0 0 auto;
  max-height: min(38%, 280px);
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #f4f8f5;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.12);
  padding: 0.65rem 0.85rem 0.85rem;
  overflow: auto;
  z-index: 10;
}

.mode-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;
  margin-bottom: 0.55rem;
}

.mode-tab {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #475569;
  font-weight: 800;
  font-size: 0.78rem;
  border-radius: 10px;
  padding: 0.55rem 0.4rem;
  min-height: 42px;
}

.mode-tab.active {
  background: #1a4731;
  border-color: #1a4731;
  color: #fff;
}

.mode-body {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
}

.mode-hint {
  margin: 0 0 0.25rem;
  font-size: 0.78rem;
  color: #64748b;
  line-height: 1.35;
}

.palette-btn {
  text-transform: none;
  font-weight: 800;
  min-height: 46px;
  margin: 0;
}

.palette-btn.primary {
  --background: #1a4731;
}

.form-sheet {
  --background: #f8faf9;
}

.meta-list {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  margin-bottom: 0.85rem;
  overflow: hidden;
}

.schedule-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.schedule-row .schedule-item:first-child {
  border-right: 1px solid #f1f5f9;
}

.rcm-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.75rem 0.85rem;
  margin-bottom: 0.75rem;
}

.budget-card {
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 12px;
  padding: 0.75rem 0.85rem;
  margin-bottom: 0.75rem;
}

.budget-warn {
  margin: 0.5rem 0 0;
  padding: 0.45rem 0.55rem;
  border-radius: 8px;
  background: #fff7ed;
  border: 1px solid #fdba74;
  color: #9a3412;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.35;
}

.rcm-title {
  margin: 0 0 0.5rem;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #1a4731;
}

.area-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.25rem 0;
}

.area-row.final {
  margin-top: 0.35rem;
  padding-top: 0.5rem;
  border-top: 1px dashed #e2e8f0;
}

.area-lbl {
  font-size: 0.78rem;
  font-weight: 700;
  color: #64748b;
}

.area-val {
  font-size: 0.85rem;
  font-weight: 800;
  color: #334155;
}

.area-val.final-val {
  font-size: 1.05rem;
  color: #1a4731;
}

.npa-item {
  --background: #f8faf9;
  border-radius: 10px;
  margin: 0.35rem 0;
}

.area-hint {
  margin: 0.3rem 0 0;
  font-size: 0.72rem;
  color: #94a3b8;
  line-height: 1.4;
}

.discrepancy-item {
  --background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 12px;
  margin-bottom: 0.75rem;
  --padding-start: 0.75rem;
  --inner-padding-end: 0.75rem;
}

.discrepancy-label {
  font-size: 0.85rem;
  font-weight: 800;
  color: #9a3412;
}

.discrepancy-sub {
  margin: 0.15rem 0 0;
  font-size: 0.72rem;
  font-weight: 600;
  color: #b45309;
  white-space: normal;
}

.photo-block {
  margin-bottom: 0.75rem;
}

.camera-btn {
  --background: #0f766e;
  text-transform: none;
  font-weight: 800;
  min-height: 48px;
  margin: 0 0 0.65rem;
}

.thumb-wrap {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  background: #fff;
  max-height: 180px;
}

.thumb {
  display: block;
  width: 100%;
  height: 160px;
  object-fit: cover;
}

.spatial-summary {
  margin: 0 0 0.75rem;
  font-size: 0.78rem;
  color: #64748b;
  font-weight: 600;
}

.signature-block {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem 0.85rem;
  margin-bottom: 0.85rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.signature-title {
  margin: 0;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #1a4731;
}

.save-geo-btn {
  --background: #1a4731;
  text-transform: none;
  font-weight: 900;
  font-size: 1rem;
  min-height: 56px;
  margin-bottom: 1.5rem;
}

:deep(.geo-pin) {
  background: transparent;
  border: none;
}

:deep(.geo-pin-dot) {
  display: block;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  margin: 0 auto;
}

:deep(.geo-pin-lbl) {
  display: block;
  text-align: center;
  font-size: 0.65rem;
  font-weight: 900;
  color: #0f172a;
  text-shadow: 0 0 3px #fff;
  margin-top: 1px;
}

:deep(.leaflet-container) {
  font: inherit;
  background: #dce8df;
}
</style>
