<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Farm Profiling</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="refreshLocation" :disabled="locating">
            <ion-icon slot="icon-only" :icon="locateOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="page-bg">
      <!-- Map -->
      <div class="map-shell">
        <div ref="mapEl" class="map-canvas"></div>
        <div class="map-overlay">
          <ion-chip color="light" outline>
            <ion-icon :icon="navigateOutline"></ion-icon>
            <ion-label v-if="currentPos">
              {{ currentPos.lat.toFixed(5) }}, {{ currentPos.lng.toFixed(5) }}
            </ion-label>
            <ion-label v-else>{{ locating ? 'Locating…' : 'No GPS' }}</ion-label>
          </ion-chip>
        </div>
      </div>

      <div class="ion-padding panel">
        <ion-button expand="block" class="geotag-link" router-link="/tech/geo-tag">
          <ion-icon slot="start" :icon="locateOutline"></ion-icon>
          Register Farm Geo-Tag
        </ion-button>

        <!-- Perimeter walk -->
        <ion-card class="tool-card">
          <ion-card-header>
            <ion-card-title>Land Measurement</ion-card-title>
            <ion-card-subtitle>Walk the farm boundary to estimate hectare size</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <div class="stats-row">
              <div class="stat">
                <span class="stat-val">{{ walkPoints.length }}</span>
                <span class="stat-lbl">Vertices</span>
              </div>
              <div class="stat">
                <span class="stat-val">{{ computedHa.toFixed(3) }}</span>
                <span class="stat-lbl">Hectares</span>
              </div>
              <div class="stat">
                <span class="stat-val">{{ walking ? 'ON' : 'OFF' }}</span>
                <span class="stat-lbl">Walk</span>
              </div>
            </div>

            <ion-button
              expand="block"
              :color="walking ? 'danger' : 'primary'"
              class="action-btn"
              @click="togglePerimeterWalk"
            >
              <ion-icon slot="start" :icon="walking ? stopCircleOutline : walkOutline"></ion-icon>
              {{ walking ? 'Stop Perimeter Walk' : 'Start Perimeter Walk' }}
            </ion-button>
            <ion-button
              v-if="walkPoints.length"
              expand="block"
              fill="outline"
              color="medium"
              @click="resetWalk"
            >
              Reset Points
            </ion-button>
            <p class="hint">
              While walking, each GPS fix is recorded as a boundary vertex.
              Closing the polygon estimates parcel area (offline mock — queued later).
            </p>
          </ion-card-content>
        </ion-card>

        <!-- Soil samples -->
        <ion-card class="tool-card">
          <ion-card-header>
            <ion-card-title>Soil Analysis</ion-card-title>
            <ion-card-subtitle>{{ soilSamples.length }} sample(s) logged this session</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-button expand="block" color="secondary" class="action-btn" @click="openSoilModal">
              <ion-icon slot="start" :icon="flaskOutline"></ion-icon>
              Log Soil Sample
            </ion-button>

            <ion-list v-if="soilSamples.length" lines="full" class="sample-list">
              <ion-item v-for="s in soilSamples" :key="s.id">
                <ion-label>
                  <h3>pH {{ s.ph }} · NPK {{ s.nitrogen }}/{{ s.phosphorus }}/{{ s.potassium }}</h3>
                  <p>{{ s.fertilizer_grade }} · {{ formatTime(s.captured_at) }}</p>
                </ion-label>
              </ion-item>
            </ion-list>
            <p v-else class="hint">No soil samples yet. Tap above to record NPK + fertilizer grade.</p>
          </ion-card-content>
        </ion-card>

        <!-- Session queue preview (IndexedDB-ready shape) -->
        <ion-card class="tool-card muted">
          <ion-card-content>
            <p class="queue-note">
              <ion-icon :icon="cloudOfflineOutline"></ion-icon>
              Captures stay in-session mock queue until sync wiring. Shape: perimeter walks + soil samples.
            </p>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- Soil sample modal -->
      <ion-modal :is-open="soilModalOpen" @didDismiss="soilModalOpen = false">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>Log Soil Sample</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="soilModalOpen = false">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <ion-list>
            <ion-item>
              <ion-input
                type="number"
                label="pH Level *"
                label-placement="stacked"
                :value="soilForm.ph"
                placeholder="e.g. 5.8"
                step="0.1"
                min="0"
                max="14"
                @ionInput="(e: any) => soilForm.ph = e.detail.value"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="number"
                label="Nitrogen (N) *"
                label-placement="stacked"
                :value="soilForm.nitrogen"
                placeholder="ppm or index"
                @ionInput="(e: any) => soilForm.nitrogen = e.detail.value"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="number"
                label="Phosphorus (P) *"
                label-placement="stacked"
                :value="soilForm.phosphorus"
                placeholder="ppm or index"
                @ionInput="(e: any) => soilForm.phosphorus = e.detail.value"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-input
                type="number"
                label="Potassium (K) *"
                label-placement="stacked"
                :value="soilForm.potassium"
                placeholder="ppm or index"
                @ionInput="(e: any) => soilForm.potassium = e.detail.value"
              ></ion-input>
            </ion-item>
            <ion-item>
              <ion-select
                label="Recommended Fertilizer Grade *"
                label-placement="stacked"
                interface="popover"
                :value="soilForm.fertilizer_grade"
                @ionChange="(e: any) => soilForm.fertilizer_grade = e.detail.value"
              >
                <ion-select-option value="14-14-14">14-14-14 Complete</ion-select-option>
                <ion-select-option value="16-20-0">16-20-0</ion-select-option>
                <ion-select-option value="46-0-0">46-0-0 Urea</ion-select-option>
                <ion-select-option value="0-0-60">0-0-60 Muriate of Potash</ion-select-option>
                <ion-select-option value="Organic Compost">Organic Compost</ion-select-option>
              </ion-select>
            </ion-item>
          </ion-list>

          <ion-button expand="block" class="save-soil" :disabled="!canSaveSoil" @click="saveSoilSample">
            Save Soil Sample
          </ion-button>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonChip, IonLabel, IonList, IonItem, IonInput, IonSelect, IonSelectOption, IonModal,
  toastController,
} from '@ionic/vue';
import {
  locateOutline, navigateOutline, walkOutline, stopCircleOutline,
  flaskOutline, cloudOfflineOutline,
} from 'ionicons/icons';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchRealLocation as readGpsPosition, ensureLocationPermission } from '@/composables/useNativeHardware';

/** Offline-queue-ready shapes (mock until IndexedDB sync wiring). */
interface GeoPoint {
  lat: number;
  lng: number;
  captured_at: string;
}

interface PerimeterWalkRecord {
  id: string;
  type: 'perimeter_walk';
  points: GeoPoint[];
  area_ha: number;
  captured_at: string;
  synced: false;
}

interface SoilSampleRecord {
  id: string;
  type: 'soil_sample';
  ph: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  fertilizer_grade: string;
  latitude: number | null;
  longitude: number | null;
  captured_at: string;
  synced: false;
}

const ECHAGUE: L.LatLngExpression = [16.7167, 121.6833];

const mapEl = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let marker: L.Marker | null = null;
let walkLayer: L.Polyline | null = null;
let walkWatchId: string | null = null;

const locating = ref(false);
const walking = ref(false);
const currentPos = ref<{ lat: number; lng: number } | null>(null);
const walkPoints = ref<GeoPoint[]>([]);
const soilSamples = ref<SoilSampleRecord[]>([]);
const pendingQueue = ref<Array<PerimeterWalkRecord | SoilSampleRecord>>([]);

const soilModalOpen = ref(false);
const soilForm = reactive({
  ph: '',
  nitrogen: '',
  phosphorus: '',
  potassium: '',
  fertilizer_grade: '14-14-14',
});

const canSaveSoil = computed(() =>
  soilForm.ph !== ''
  && soilForm.nitrogen !== ''
  && soilForm.phosphorus !== ''
  && soilForm.potassium !== ''
  && !!soilForm.fertilizer_grade
);

/** Shoelace area on WGS84 approx → hectares. */
const computedHa = computed(() => {
  const pts = walkPoints.value;
  if (pts.length < 3) return 0;
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const lat0 = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const cos = Math.cos(toRad(lat0));
  const xy = pts.map((p) => ({
    x: toRad(p.lng) * R * cos,
    y: toRad(p.lat) * R,
  }));
  let area = 0;
  for (let i = 0; i < xy.length; i++) {
    const j = (i + 1) % xy.length;
    area += xy[i].x * xy[j].y - xy[j].x * xy[i].y;
  }
  return Math.abs(area) / 2 / 10000;
});

const toast = async (message: string, color = 'primary') => {
  const t = await toastController.create({ message, duration: 2200, color, position: 'top' });
  await t.present();
};

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const initMap = async () => {
  await nextTick();
  if (!mapEl.value || map) return;
  map = L.map(mapEl.value, { center: ECHAGUE, zoom: 15, zoomControl: false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
  }).addTo(map);
  setTimeout(() => map?.invalidateSize(), 200);
};

const setMarker = (lat: number, lng: number) => {
  if (!map) return;
  if (marker) {
    marker.setLatLng([lat, lng]);
  } else {
    marker = L.marker([lat, lng]).addTo(map);
  }
  map.setView([lat, lng], map.getZoom(), { animate: true });
};

const redrawWalk = () => {
  if (!map) return;
  const latlngs = walkPoints.value.map((p) => [p.lat, p.lng] as L.LatLngExpression);
  if (walkLayer) {
    walkLayer.setLatLngs(latlngs);
  } else if (latlngs.length) {
    walkLayer = L.polyline(latlngs, { color: '#1a4731', weight: 3 }).addTo(map);
  }
};

/**
 * Real device GPS: check/request permissions, then high-accuracy fix.
 * Web browsers may still succeed via navigator.geolocation; failures toast without crashing.
 */
const fetchRealLocation = async (): Promise<{ lat: number; lng: number } | null> => {
  locating.value = true;
  try {
    const pos = await readGpsPosition({ timeout: 12000 });
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    currentPos.value = { lat, lng };
    setMarker(lat, lng);
    return { lat, lng };
  } catch (err) {
    console.warn('[AGRI-AKAP] GPS signal failed:', err);
    await toast('GPS signal failed. Check location permissions and try again.', 'warning');
    if (!currentPos.value) {
      currentPos.value = { lat: 16.7167, lng: 121.6833 };
      setMarker(16.7167, 121.6833);
    }
    return null;
  } finally {
    locating.value = false;
  }
};

const refreshLocation = () => fetchRealLocation();

const addWalkPoint = (lat: number, lng: number) => {
  walkPoints.value.push({
    lat,
    lng,
    captured_at: new Date().toISOString(),
  });
  currentPos.value = { lat, lng };
  setMarker(lat, lng);
  redrawWalk();
};

const togglePerimeterWalk = async () => {
  if (walking.value) {
    walking.value = false;
    if (walkWatchId) {
      try {
        await Geolocation.clearWatch({ id: walkWatchId });
      } catch {
        // ignore
      }
      walkWatchId = null;
    }
    if (walkPoints.value.length >= 3) {
      const record: PerimeterWalkRecord = {
        id: crypto.randomUUID(),
        type: 'perimeter_walk',
        points: [...walkPoints.value],
        area_ha: Number(computedHa.value.toFixed(4)),
        captured_at: new Date().toISOString(),
        synced: false,
      };
      pendingQueue.value.push(record);
      await toast(`Perimeter saved · ${record.area_ha} ha (mock queue)`, 'success');
    } else {
      await toast('Need at least 3 vertices to estimate area.', 'warning');
    }
    return;
  }

  const allowed = await ensureLocationPermission();
  if (!allowed && Capacitor.isNativePlatform()) {
    await toast('Location permission denied. Enable GPS for perimeter walks.', 'warning');
    walking.value = false;
    return;
  }

  walking.value = true;
  await toast('Perimeter walk started — move along the boundary.', 'primary');
  try {
    walkWatchId = await Geolocation.watchPosition(
      { enableHighAccuracy: true },
      (pos, err) => {
        if (err || !pos) return;
        addWalkPoint(pos.coords.latitude, pos.coords.longitude);
      },
    );
  } catch (err) {
    console.warn('[AGRI-AKAP] GPS watch unavailable (web fallback):', err);
    // Browser / web fallback: simulate a few points around current position
    const base = currentPos.value ?? { lat: 16.7167, lng: 121.6833 };
    const offsets = [
      [0, 0],
      [0.0004, 0.0001],
      [0.0003, 0.0005],
      [0.00005, 0.00045],
      [0, 0],
    ];
    for (const [dLat, dLng] of offsets) {
      addWalkPoint(base.lat + dLat, base.lng + dLng);
    }
    await toast('GPS watch unavailable — simulated walk points added.', 'warning');
  }
};

const resetWalk = () => {
  walkPoints.value = [];
  if (walkLayer && map) {
    map.removeLayer(walkLayer);
    walkLayer = null;
  }
};

const openSoilModal = () => {
  soilForm.ph = '';
  soilForm.nitrogen = '';
  soilForm.phosphorus = '';
  soilForm.potassium = '';
  soilForm.fertilizer_grade = '14-14-14';
  soilModalOpen.value = true;
};

const saveSoilSample = async () => {
  if (!canSaveSoil.value) return;
  const record: SoilSampleRecord = {
    id: crypto.randomUUID(),
    type: 'soil_sample',
    ph: Number(soilForm.ph),
    nitrogen: Number(soilForm.nitrogen),
    phosphorus: Number(soilForm.phosphorus),
    potassium: Number(soilForm.potassium),
    fertilizer_grade: soilForm.fertilizer_grade,
    latitude: currentPos.value?.lat ?? null,
    longitude: currentPos.value?.lng ?? null,
    captured_at: new Date().toISOString(),
    synced: false,
  };
  soilSamples.value.unshift(record);
  pendingQueue.value.push(record);
  soilModalOpen.value = false;
  await toast('Soil sample logged (mock queue).', 'success');
};

watch(walkPoints, () => redrawWalk(), { deep: true });

onMounted(async () => {
  await initMap();
  await refreshLocation();
});

onBeforeUnmount(async () => {
  if (walkWatchId) {
    try {
      await Geolocation.clearWatch({ id: walkWatchId });
    } catch {
      // ignore
    }
  }
  map?.remove();
  map = null;
});
</script>

<style scoped>
.page-bg { --background: #f4f8f5; }
.geotag-link {
  --background: #1a4731;
  text-transform: none;
  font-weight: 800;
  min-height: 48px;
  margin: 0 0 0.85rem;
}
.map-shell {
  position: relative;
  height: 42vh;
  min-height: 220px;
  border-bottom: 1px solid #e2e8f0;
}
.map-canvas { width: 100%; height: 100%; }
.map-overlay {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 500;
}
.panel { padding-top: 0.75rem; padding-bottom: 2rem; }
.tool-card {
  margin: 0 0 0.85rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.tool-card.muted { background: #fffbeb; }
.stats-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.85rem;
}
.stat {
  flex: 1;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.65rem 0.4rem;
  text-align: center;
}
.stat-val { display: block; font-size: 1.15rem; font-weight: 900; color: #1a4731; }
.stat-lbl { font-size: 0.68rem; color: #64748b; text-transform: uppercase; font-weight: 700; }
.action-btn { text-transform: none; font-weight: 700; margin-top: 0.25rem; }
.hint { font-size: 0.8rem; color: #94a3b8; margin: 0.65rem 0 0; line-height: 1.4; }
.sample-list { margin-top: 0.5rem; background: transparent; }
.queue-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  font-size: 0.82rem;
  color: #92400e;
  font-weight: 600;
}
.save-soil { margin-top: 1rem; --background: #1a4731; text-transform: none; font-weight: 700; }
</style>
