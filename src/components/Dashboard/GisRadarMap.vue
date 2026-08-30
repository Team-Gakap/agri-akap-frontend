<template>
  <section class="gis-card">
    <header class="gis-head">
      <div>
        <h2>Diagnostic Analytics &amp; GIS Radar</h2>
        <p>Echague, Isabela · parcels, outbreak clusters, 72h flood / lodging</p>
      </div>
      <div class="basemap-switch no-print">
        <button type="button" :class="{ on: basemap === 'satellite' }" @click="setBasemap('satellite')">Satellite</button>
        <button type="button" :class="{ on: basemap === 'terrain' }" @click="setBasemap('terrain')">Terrain</button>
      </div>
    </header>

    <div class="layer-bar no-print">
      <button
        type="button"
        class="layer-chip chip-plots"
        :class="{ on: layers.plots }"
        @click="toggleLayer('plots')"
      >
        <ion-icon v-if="layers.plots" :icon="checkmarkOutline"></ion-icon>
        Registered Plots ({{ plotCount }})
      </button>
      <button
        type="button"
        class="layer-chip chip-pests"
        :class="{ on: layers.pests }"
        @click="toggleLayer('pests')"
      >
        <ion-icon v-if="layers.pests" :icon="warningOutline"></ion-icon>
        Pest Outbreaks ({{ pestCount }})
      </button>
      <button
        type="button"
        class="layer-chip chip-flood"
        :class="{ on: layers.flood }"
        @click="toggleLayer('flood')"
      >
        <ion-icon v-if="layers.flood" :icon="waterOutline"></ion-icon>
        Flood / Lodging ({{ floodCount }})
      </button>
    </div>

    <div v-if="mapLoadError" class="map-error">
      <p><strong>Map unavailable.</strong> {{ mapLoadError }}</p>
    </div>

    <div v-else class="gis-split">
      <div class="map-col">
        <div class="map-shell">
          <div v-if="mapLoading" class="map-loading"><ion-spinner name="crescent"></ion-spinner></div>
          <div ref="mapEl" class="map-canvas"></div>
        </div>
        <div class="map-legend">
          <span class="legend-chip"><i class="dot plot"></i>Georeferenced parcel</span>
          <span class="legend-chip"><i class="dot pest"></i>Pest outbreak</span>
          <span class="legend-chip"><i class="dot flood"></i>Flood / lodging ≥80%</span>
          <span class="legend-chip"><i class="dot damage"></i>Calamity report</span>
        </div>
      </div>

      <aside class="inspector">
        <h3>Spatial Inspector</h3>

        <div v-if="!selected" class="inspector-summary">
          <p class="inspector-kind">Spatial health summary</p>
          <dl>
            <div>
              <dt>Mapped coverage</dt>
              <dd>{{ mappedCoverage.mapped }} / {{ mappedCoverage.total }} parcels georeferenced</dd>
            </div>
            <div>
              <dt>Active spatial alerts</dt>
              <dd>{{ pestAlertLabel }}</dd>
            </div>
            <div>
              <dt>Highest risk area</dt>
              <dd>{{ highestRiskLabel }}</dd>
            </div>
          </dl>
          <p class="inspector-hint">Click a parcel, barangay, or outbreak pin for telemetry.</p>
        </div>

        <div v-else class="inspector-body">
          <p class="inspector-kind">{{ selected.kindLabel }}</p>
          <h4>{{ selected.title }}</h4>
          <dl>
            <div v-for="row in selected.rows" :key="row.label">
              <dt>{{ row.label }}</dt>
              <dd>{{ row.value }}</dd>
            </div>
          </dl>
          <p v-if="selected.flag" class="inspector-flag">{{ selected.flag }}</p>
          <ion-button
            v-if="selected.sms"
            fill="outline"
            size="small"
            class="sms-btn"
            @click="emitSms(selected.sms)"
          >
            Trigger SMS Advisory
          </ion-button>
          <ion-button
            v-if="selected.kind === 'parcel'"
            fill="outline"
            size="small"
            class="sms-btn"
            @click="goFarmers"
          >
            View Farmer Profile
          </ion-button>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonButton, IonIcon, IonSpinner } from '@ionic/vue';
import { checkmarkOutline, warningOutline, waterOutline } from 'ionicons/icons';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import apiClient from '@/utils/axios';
import { echagueMapOptions, loadGoogleMaps } from '@/utils/googleMaps';
import { findRowForGeoName, indexByOfficialName, toOfficialBarangayName } from '@/utils/echagueGeoName';

const emit = defineEmits<{
  sms: [payload: { barangay: string; message: string }];
}>();

const router = useRouter();
const PARCEL_GREEN = '#16A34A';
const PARCEL_AMBER = '#d97706';

type LayerKey = 'plots' | 'pests' | 'flood';
type Basemap = 'satellite' | 'terrain';

interface ClimateRow {
  barangay: string;
  barangay_name: string;
  precipitation_probability: number;
  soil_moisture: number | null;
  wind_speed_kmh: number | null;
  farmer_count: number;
  lat: number | null;
  lng: number | null;
}

interface InspectorRow { label: string; value: string }
interface SmsDraft { barangay: string; message: string }
interface SelectedEntity {
  kind: 'parcel' | 'barangay' | 'pest' | 'damage';
  kindLabel: string;
  title: string;
  rows: InspectorRow[];
  flag?: string;
  sms?: SmsDraft;
}

const mapEl = ref<HTMLDivElement | null>(null);
const mapLoading = ref(false);
const mapLoadError = ref('');
const basemap = ref<Basemap>('satellite');
const layers = reactive({ plots: true, pests: true, flood: true });
const selected = ref<SelectedEntity | null>(null);

let map: google.maps.Map | null = null;
let geoJsonLoaded = false;
let skipMapClick = false;
const lastPayload = ref<any>({
  farm_plots: [],
  plot_totals: { mapped: 0, total: 0 },
  pest_outbreaks: [],
  damage_points: [],
  flood_risk_points: [],
  barangay_climate: [],
});

const parcelPolygons: google.maps.Polygon[] = [];
const parcelMarkers: google.maps.Marker[] = [];
const pestMarkers: google.maps.Marker[] = [];
const damageMarkers: google.maps.Marker[] = [];
const pulseOverlays: google.maps.OverlayView[] = [];
let pestClusterer: MarkerClusterer | null = null;
let damageClusterer: MarkerClusterer | null = null;

const climateRows = computed<ClimateRow[]>(() =>
  (lastPayload.value.barangay_climate ?? []).map((r: any) => ({
    barangay: r.barangay,
    barangay_name: r.barangay,
    precipitation_probability: Number(r.precipitation_probability ?? 0),
    soil_moisture: r.soil_moisture != null ? Number(r.soil_moisture) : null,
    wind_speed_kmh: r.wind_speed_kmh != null ? Number(r.wind_speed_kmh) : null,
    farmer_count: Number(r.farmer_count ?? 0),
    lat: r.lat != null ? Number(r.lat) : null,
    lng: r.lng != null ? Number(r.lng) : null,
  })),
);

const climateIndex = computed(() => indexByOfficialName(climateRows.value));

function isActivePest(p: any): boolean {
  const status = String(p.status || '').toLowerCase();
  return !status || status === 'active' || status === 'reported';
}

const plotCount = computed(() => (lastPayload.value.farm_plots ?? []).length);
const pestCount = computed(() =>
  (lastPayload.value.pest_outbreaks ?? []).filter(isActivePest).length,
);
const floodCount = computed(() =>
  climateRows.value.filter((r) => r.precipitation_probability >= 80).length,
);

const mappedCoverage = computed(() => {
  const totals = lastPayload.value.plot_totals;
  if (totals && (totals.mapped != null || totals.total != null)) {
    return {
      mapped: Number(totals.mapped ?? 0),
      total: Number(totals.total ?? plotCount.value),
    };
  }
  const plots = lastPayload.value.farm_plots ?? [];
  const mapped = plots.filter((p: any) =>
    String(p.geotag_status || '').toLowerCase() === 'mapped' || (p.boundary_points?.length ?? 0) >= 3,
  ).length;
  return { mapped, total: plots.length };
});

const pestAlertLabel = computed(() => {
  const pests = (lastPayload.value.pest_outbreaks ?? []).filter(isActivePest);
  if (!pests.length) return 'No active outbreak clusters';
  const byBrgy: Record<string, number> = {};
  pests.forEach((p: any) => {
    const name = String(p.brgy || 'Echague').trim() || 'Echague';
    byBrgy[name] = (byBrgy[name] ?? 0) + 1;
  });
  const top = Object.entries(byBrgy).sort((a, b) => b[1] - a[1])[0];
  if (!top) return 'No active outbreak clusters';
  const [barangay, count] = top;
  return `${count} pest ${count === 1 ? 'outbreak' : 'cluster'} (${barangay})`;
});

const highestRiskLabel = computed(() => {
  if (!climateRows.value.length) return 'No 72h climate cache';
  const top = climateRows.value.reduce((best, row) => (
    row.precipitation_probability > best.precipitation_probability ? row : best
  ));
  return `${top.barangay} (${top.precipitation_probability}% rain)`;
});

function climateForGeo(geoName: string): ClimateRow | undefined {
  return findRowForGeoName(geoName, climateIndex.value);
}

function soilLabel(raw: number | null): string {
  if (raw == null || Number.isNaN(raw)) return '—';
  const v = raw > 1 ? raw / 100 : raw;
  return `${v.toFixed(2)} m³/m³`;
}

function applyBasemap(mode: Basemap) {
  if (!map) return;
  map.setMapTypeId(mode === 'satellite' ? google.maps.MapTypeId.SATELLITE : google.maps.MapTypeId.TERRAIN);
  map.setOptions({ styles: echagueMapOptions().styles });
}

function setBasemap(mode: Basemap) {
  basemap.value = mode;
  applyBasemap(mode);
}

function toggleLayer(key: LayerKey) {
  layers[key] = !layers[key];
  refreshChoropleth();
  renderOverlays();
}

function emitSms(draft: SmsDraft) {
  emit('sms', draft);
}

function goFarmers() {
  router.push('/admin/farmers');
}

function clearSelection() {
  selected.value = null;
  refreshChoropleth();
}

function circleIcon(fill: string, stroke: string, scale: number): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale,
    fillColor: fill,
    fillOpacity: 0.92,
    strokeColor: stroke,
    strokeWeight: 1.5,
  };
}

function isCriticalSeverity(severity: unknown): boolean {
  const v = String(severity || '').toLowerCase();
  return v.includes('high') || v.includes('critical') || v.includes('severe');
}

function floodFill(precip: number | undefined): { color: string; opacity: number } {
  if (precip == null) return { color: '#e2e8f0', opacity: 0.28 };
  if (precip >= 80) return { color: '#ef4444', opacity: 0.55 };
  if (precip >= 50) return { color: '#fb923c', opacity: 0.4 };
  return { color: '#94a3b8', opacity: 0.12 };
}

function choroplethStyle(feature: google.maps.Data.Feature): google.maps.Data.StyleOptions {
  const geoName = String(feature.getProperty('adm4_name') ?? '');
  const official = toOfficialBarangayName(geoName);
  const row = climateForGeo(geoName);
  const selectedBrgy = selected.value?.kind === 'barangay' && selected.value.title === official;
  if (!layers.flood) {
    return {
      strokeColor: selectedBrgy ? '#D4AF37' : '#94a3b8',
      strokeWeight: selectedBrgy ? 2.5 : 1,
      fillColor: '#0f172a',
      fillOpacity: 0.04,
      zIndex: 1,
      clickable: true,
    };
  }
  const fill = floodFill(row?.precipitation_probability);
  return {
    strokeColor: selectedBrgy ? '#D4AF37' : '#ffffff',
    strokeWeight: selectedBrgy ? 2.5 : 1,
    fillColor: fill.color,
    fillOpacity: selectedBrgy ? Math.min(0.8, fill.opacity + 0.15) : fill.opacity,
    zIndex: selectedBrgy ? 3 : 1,
    clickable: true,
  };
}

function refreshChoropleth() {
  map?.data.setStyle(choroplethStyle);
}

function selectBarangay(geoName: string) {
  const official = toOfficialBarangayName(geoName);
  const row = climateForGeo(geoName);
  const precip = row?.precipitation_probability ?? 0;
  selected.value = {
    kind: 'barangay',
    kindLabel: 'Barangay / flood zone',
    title: official,
    rows: [
      { label: '72h rain probability', value: `${precip}%` },
      { label: 'Root-zone moisture', value: soilLabel(row?.soil_moisture ?? null) },
      { label: 'Wind', value: row?.wind_speed_kmh != null ? `${row.wind_speed_kmh} km/h` : '—' },
      { label: 'Registered farmers', value: String(row?.farmer_count ?? 0) },
    ],
    flag: precip >= 80 ? `Active threat: flood / lodging hazard (${precip}% rain)` : undefined,
    sms: {
      barangay: official,
      message: `MAO Echague Advisory: ${precip}% rain probability in ${official} over the next 72 hours. Delay spraying and secure inputs. Stay safe.`,
    },
  };
  refreshChoropleth();
}

function selectParcel(p: any) {
  skipMapClick = true;
  const mapped = String(p.geotag_status || '').toLowerCase() === 'mapped' || (p.boundary_points?.length ?? 0) >= 3;
  selected.value = {
    kind: 'parcel',
    kindLabel: 'Farm parcel',
    title: p.farmer_name || 'Registered plot',
    rows: [
      { label: 'RSBSA', value: p.rsbsa_no || '—' },
      { label: 'Barangay', value: p.brgy || '—' },
      { label: 'Commodity', value: p.commodity || '—' },
      { label: 'Area', value: p.size_ha != null ? `${Number(p.size_ha).toFixed(2)} ha` : '—' },
      { label: 'Growth stage', value: p.growth_stage || '—' },
      { label: 'Georef status', value: mapped ? 'Mapped boundary' : (p.geotag_status || 'Point only') },
    ],
  };
  refreshChoropleth();
}

function selectPest(p: any) {
  skipMapClick = true;
  const rec = p.recommendation || 'Coordinate with the assigned MAO technician.';
  const brgy = p.brgy || 'Echague';
  selected.value = {
    kind: 'pest',
    kindLabel: 'Pest outbreak',
    title: p.pest_name || 'Pest report',
    rows: [
      { label: 'Severity', value: p.severity || '—' },
      { label: 'Date logged', value: p.date_spotted || '—' },
      { label: 'Barangay', value: brgy },
      { label: 'Crop', value: p.commodity || '—' },
      { label: 'Recommendation', value: rec },
    ],
    flag: isCriticalSeverity(p.severity) ? `Active threat flagged: ${p.pest_name || 'pest'} (${p.severity})` : undefined,
    sms: {
      barangay: brgy,
      message: `MAO Echague Advisory: ${p.pest_name || 'Pest outbreak'} (${p.severity || 'unspecified'}) in ${brgy}. ${rec}`.slice(0, 459),
    },
  };
  refreshChoropleth();
}

function selectDamage(d: any) {
  skipMapClick = true;
  const brgy = d.brgy || 'Echague';
  const pct = Number(d.damage_percentage ?? 0);
  selected.value = {
    kind: 'damage',
    kindLabel: 'Calamity report',
    title: d.calamity_name || 'Damage report',
    rows: [
      { label: 'Damage', value: `${pct}%` },
      { label: 'Barangay', value: brgy },
      { label: 'Farmer', value: d.farmer_name || '—' },
      { label: 'Status', value: d.status || '—' },
    ],
    sms: {
      barangay: brgy,
      message: `MAO Echague Advisory: ${d.calamity_name || 'Calamity'} damage (${pct}%) in ${brgy}. Await ocular inspection guidance.`,
    },
  };
  refreshChoropleth();
}

function clearOverlays() {
  parcelPolygons.splice(0).forEach((poly) => poly.setMap(null));
  parcelMarkers.splice(0).forEach((m) => m.setMap(null));
  pestMarkers.splice(0).forEach((m) => m.setMap(null));
  damageMarkers.splice(0).forEach((m) => m.setMap(null));
  pulseOverlays.splice(0).forEach((o) => o.setMap(null));
  pestClusterer?.clearMarkers();
  damageClusterer?.clearMarkers();
}

function addPulse(position: google.maps.LatLngLiteral) {
  if (!map) return;
  const div = document.createElement('div');
  div.className = 'gis-pulse';
  const overlay = new google.maps.OverlayView();
  overlay.onAdd = function onAdd() {
    this.getPanes()?.overlayMouseTarget.appendChild(div);
  };
  overlay.draw = function draw() {
    const proj = this.getProjection();
    if (!proj) return;
    const point = proj.fromLatLngToDivPixel(new google.maps.LatLng(position.lat, position.lng));
    if (!point) return;
    div.style.left = `${point.x - 16}px`;
    div.style.top = `${point.y - 16}px`;
  };
  overlay.onRemove = function onRemove() {
    div.remove();
  };
  overlay.setMap(map);
  pulseOverlays.push(overlay);
}

function renderOverlays() {
  if (!map) return;
  clearOverlays();

  if (layers.plots) {
    (lastPayload.value.farm_plots ?? []).forEach((p: any) => {
      const mapped = String(p.geotag_status || '').toLowerCase() === 'mapped' || (p.boundary_points?.length ?? 0) >= 3;
      const stroke = mapped ? PARCEL_GREEN : PARCEL_AMBER;
      const path = (p.boundary_points ?? []) as Array<{ lat: number; lng: number }>;
      if (path.length >= 3) {
        const poly = new google.maps.Polygon({
          paths: path,
          strokeColor: stroke,
          strokeWeight: 2,
          fillColor: PARCEL_GREEN,
          fillOpacity: 0.25,
          zIndex: 4,
          map,
        });
        poly.addListener('click', () => selectParcel(p));
        parcelPolygons.push(poly);
      } else if (p.lat != null && p.lng != null) {
        const marker = new google.maps.Marker({
          position: { lat: Number(p.lat), lng: Number(p.lng) },
          map,
          icon: circleIcon(stroke, '#0f2d1f', 6),
          zIndex: 5,
        });
        marker.addListener('click', () => selectParcel(p));
        parcelMarkers.push(marker);
      }
    });
  }

  if (layers.pests) {
    const pests = (lastPayload.value.pest_outbreaks ?? []).filter(isActivePest);
    pests.forEach((p: any) => {
      const high = isCriticalSeverity(p.severity);
      const fill = high ? '#b91c1c' : '#eab308';
      const marker = new google.maps.Marker({
        position: { lat: Number(p.lat), lng: Number(p.lng) },
        icon: circleIcon(fill, '#422006', high ? 9 : 7),
        zIndex: 8,
      });
      marker.addListener('click', () => selectPest(p));
      pestMarkers.push(marker);
      if (high) addPulse({ lat: Number(p.lat), lng: Number(p.lng) });
    });
    pestClusterer = new MarkerClusterer({ map, markers: pestMarkers });
  }

  if (layers.flood) {
    (lastPayload.value.damage_points ?? []).forEach((d: any) => {
      const severe = Number(d.damage_percentage || 0) >= 50;
      const marker = new google.maps.Marker({
        position: { lat: Number(d.lat), lng: Number(d.lng) },
        icon: circleIcon(severe ? '#ef4444' : '#f59e0b', '#7f1d1d', severe ? 8 : 6),
        zIndex: 7,
      });
      marker.addListener('click', () => selectDamage(d));
      damageMarkers.push(marker);
    });
    damageClusterer = new MarkerClusterer({ map, markers: damageMarkers });
  }
}

async function initMap() {
  if (!mapEl.value || map) {
    if (map) google.maps.event.trigger(map, 'resize');
    return;
  }
  try {
    await loadGoogleMaps();
  } catch (err: any) {
    mapLoadError.value = err?.message ?? 'Failed to load Google Maps.';
    return;
  }
  map = new google.maps.Map(mapEl.value, echagueMapOptions({
    mapTypeId: google.maps.MapTypeId.SATELLITE,
    zoom: 12,
  }));
  map.data.setStyle(choroplethStyle);
  map.data.addListener('click', (e: google.maps.Data.MouseEvent) => {
    skipMapClick = true;
    const geoName = String(e.feature.getProperty('adm4_name') ?? '');
    selectBarangay(geoName);
  });
  map.addListener('click', () => {
    if (skipMapClick) {
      skipMapClick = false;
      return;
    }
    clearSelection();
  });
  google.maps.event.trigger(map, 'resize');
}

async function loadGeoJson() {
  if (!map || geoJsonLoaded) return;
  const res = await fetch('/geo/echague-barangays.geojson');
  if (!res.ok) throw new Error(`Failed to fetch barangay GeoJSON (${res.status}).`);
  const geo = await res.json();
  map.data.addGeoJson(geo);
  geoJsonLoaded = true;
  refreshChoropleth();
}

async function fetchMapData() {
  mapLoading.value = true;
  try {
    const res = await apiClient.get('/dashboard/map-data');
    lastPayload.value = res.data?.data ?? {};
    await loadGeoJson();
    renderOverlays();
    refreshChoropleth();
  } catch {
    // GIS is supplementary; dashboard KPIs still load independently.
  } finally {
    mapLoading.value = false;
  }
}

onMounted(async () => {
  await initMap();
  await fetchMapData();
});

onBeforeUnmount(() => {
  clearOverlays();
  pestClusterer = null;
  damageClusterer = null;
  map = null;
});
</script>

<style scoped>
.gis-card {
  margin: 0;
  border-radius: 16px;
  border: 1px solid #E2E8F0;
  background: #fff;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
  overflow: hidden;
}
.gis-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.85rem 1rem 0.55rem;
  background: #0F172A;
}
.gis-head h2 {
  margin: 0;
  color: #fff;
  font-weight: 800;
  font-size: 0.98rem;
}
.gis-head p {
  margin: 0.15rem 0 0;
  color: #94a3b8;
  font-weight: 600;
  font-size: 0.75rem;
}
.basemap-switch { display: flex; gap: 0.35rem; }
.basemap-switch button {
  border: 1px solid #334155;
  background: transparent;
  color: #e2e8f0;
  border-radius: 999px;
  padding: 0.28rem 0.7rem;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}
.basemap-switch button.on {
  background: #1A4731;
  border-color: #1A4731;
  color: #fff;
}
.layer-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.55rem 1rem 0.35rem;
}
.layer-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  border: 1px solid #E2E8F0;
  background: #fff;
  color: #64748B;
  border-radius: 999px;
  padding: 0.28rem 0.7rem;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}
.layer-chip ion-icon { font-size: 0.9rem; }
.layer-chip.chip-plots.on {
  background: #16A34A;
  border-color: #16A34A;
  color: #fff;
}
.layer-chip.chip-pests.on {
  background: #D97706;
  border-color: #D97706;
  color: #fff;
}
.layer-chip.chip-flood.on {
  background: #334155;
  border-color: #334155;
  color: #fff;
}

.gis-split {
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(240px, 3fr);
  gap: 0;
  min-height: 420px;
}
.map-col { min-width: 0; padding: 0 0.75rem 0.85rem 1rem; }
.map-shell {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #E2E8F0;
}
.map-canvas { width: 100%; height: 420px; }
.map-loading {
  position: absolute; z-index: 500; top: 10px; right: 10px;
  background: #fff; border-radius: 50%; padding: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
}
.map-error {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
  background: #fef2f2;
  color: #991b1b;
  font-size: 0.85rem;
}
.map-legend { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.5rem; }
.legend-chip {
  font-size: 0.72rem;
  font-weight: 600;
  color: #475569;
  display: inline-flex;
  align-items: center;
}
.dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 6px; }
.dot.plot { background: #16A34A; }
.dot.pest { background: #eab308; }
.dot.flood { background: #ef4444; }
.dot.damage { background: #b91c1c; }

.inspector {
  border-left: 1px solid #E2E8F0;
  padding: 0.85rem 1rem 1rem;
  background: #F8FAFC;
}
.inspector h3 {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #1A4731;
}
.inspector-hint {
  margin: 0.85rem 0 0;
  font-size: 0.75rem;
  color: #64748b;
  line-height: 1.45;
}
.inspector-kind {
  margin: 0.7rem 0 0;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #D4AF37;
}
.inspector h4 {
  margin: 0.2rem 0 0.65rem;
  font-size: 1.05rem;
  font-weight: 800;
  color: #0f172a;
}
.inspector dl { margin: 0.45rem 0 0; }
.inspector dl div {
  display: grid;
  grid-template-columns: 7.5rem 1fr;
  gap: 0.35rem;
  padding: 0.28rem 0;
  border-bottom: 1px solid #E2E8F0;
  font-size: 0.78rem;
}
.inspector dt { color: #64748b; font-weight: 700; }
.inspector dd { margin: 0; color: #0f172a; font-weight: 650; }
.inspector-flag {
  margin: 0.7rem 0 0;
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 0.75rem;
  font-weight: 700;
}
.sms-btn {
  --border-color: #1A4731;
  --color: #1A4731;
  text-transform: none;
  font-weight: 700;
  font-size: 0.75rem;
  margin: 0.75rem 0 0;
}

@media (max-width: 960px) {
  .gis-split { grid-template-columns: 1fr; }
  .inspector { border-left: none; border-top: 1px solid #E2E8F0; }
  .map-col { padding: 0 1rem 0.75rem; }
}
</style>

<style>
.gis-pulse {
  position: absolute;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #ef4444;
  pointer-events: none;
  animation: gis-pulse 1.4s ease-out infinite;
}
@keyframes gis-pulse {
  0% { transform: scale(0.55); opacity: 0.7; }
  100% { transform: scale(1.7); opacity: 0; }
}
</style>
