<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Farm Map</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="loadData" :disabled="isLoading">
            <ion-icon slot="icon-only" :icon="refreshOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- Filters -->
      <div class="filter-bar">
        <ion-select
          class="filter"
          label="Barangay"
          label-placement="stacked"
          interface="popover"
          :value="barangay"
          placeholder="All"
          @ionChange="(e: any) => { barangay = e.detail.value; loadData(); }"
        >
          <ion-select-option :value="''">All barangays</ion-select-option>
          <ion-select-option v-for="b in barangays" :key="b" :value="b">{{ b }}</ion-select-option>
        </ion-select>

        <ion-select
          class="filter"
          label="Commodity"
          label-placement="stacked"
          interface="popover"
          :value="commodity"
          placeholder="All"
          @ionChange="(e: any) => { commodity = e.detail.value; loadData(); }"
        >
          <ion-select-option :value="''">All commodities</ion-select-option>
          <ion-select-option v-for="c in commodities" :key="c" :value="c">{{ c }}</ion-select-option>
        </ion-select>
      </div>

      <!-- Layer toggles -->
      <div class="layer-bar">
        <ion-chip :class="{ off: !layers.farms }" @click="toggleLayer('farms')">
          <span class="dot farms"></span> Farms ({{ counts.farms }})
        </ion-chip>
        <ion-chip :class="{ off: !layers.damage }" @click="toggleLayer('damage')">
          <span class="dot damage"></span> Damage ({{ counts.damage }})
        </ion-chip>
        <ion-chip :class="{ off: !layers.pests }" @click="toggleLayer('pests')">
          <span class="dot pests"></span> Pests ({{ counts.pests }})
        </ion-chip>
      </div>

      <div class="map-shell">
        <div v-if="isLoading" class="map-loading"><ion-spinner name="crescent"></ion-spinner></div>
        <div ref="mapEl" class="map-canvas"></div>
      </div>

      <!-- Legend -->
      <div class="legend">
        <strong>Commodities</strong>
        <div class="legend-row" v-for="(color, name) in commodityColors" :key="name">
          <span class="dot" :style="{ background: color }"></span>{{ name }}
        </div>
        <div class="legend-row"><span class="dot" :style="{ background: OTHER_COLOR }"></span>Other</div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonSpinner, IonChip, IonSelect, IonSelectOption, toastController,
} from '@ionic/vue';
import { refreshOutline } from 'ionicons/icons';
import { useRoute } from 'vue-router';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import apiClient from '@/utils/axios';

const route = useRoute();

// Echague, Isabela approx center
const ECHAGUE: [number, number] = [16.7053, 121.6772];

const OTHER_COLOR = '#64748b';
const commodityColors: Record<string, string> = {
  Rice: '#16a34a',
  Corn: '#f59e0b',
};

const mapEl = ref<HTMLDivElement | null>(null);
const isLoading = ref(false);
const barangay = ref('');
const commodity = ref('');
const barangays = ref<string[]>([]);
const commodities = ref<string[]>([]);
const counts = reactive({ farms: 0, damage: 0, pests: 0 });
const layers = reactive({ farms: true, damage: true, pests: true });

let map: L.Map | null = null;
let farmLayer: L.LayerGroup | null = null;
let damageLayer: L.LayerGroup | null = null;
let pestLayer: L.LayerGroup | null = null;
let heatLayer: any = null;

const colorFor = (c: string | null) => (c && commodityColors[c]) || OTHER_COLOR;

const toast = async (message: string, color = 'primary') => {
  const t = await toastController.create({ message, duration: 2200, color, position: 'top' });
  await t.present();
};

const initMap = () => {
  if (!mapEl.value || map) return;
  map = L.map(mapEl.value, { center: ECHAGUE, zoom: 12 });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
  farmLayer = L.layerGroup().addTo(map);
  damageLayer = L.layerGroup().addTo(map);
  pestLayer = L.layerGroup().addTo(map);
  // Ionic renders content async; ensure tiles size correctly
  setTimeout(() => map?.invalidateSize(), 300);
};

const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

const render = (data: any) => {
  if (!map || !farmLayer || !damageLayer || !pestLayer) return;

  farmLayer.clearLayers();
  damageLayer.clearLayers();
  pestLayer.clearLayers();
  if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }

  const farms = data.farm_plots ?? [];
  const damage = data.damage_points ?? [];
  const pests = data.pest_outbreaks ?? [];
  counts.farms = farms.length;
  counts.damage = damage.length;
  counts.pests = pests.length;

  // Farm plots — commodity-colored circle markers
  farms.forEach((f: any) => {
    L.circleMarker([f.lat, f.lng], {
      radius: 7, color: '#ffffff', weight: 1.5, fillColor: colorFor(f.commodity), fillOpacity: 0.9,
    })
      .bindPopup(
        `<strong>${esc(f.commodity || 'Farm plot')}</strong><br/>` +
        `${esc(f.farmer_name || '')}<br/>` +
        `Brgy ${esc(f.brgy || '-')}<br/>` +
        `${f.size_ha ? esc(f.size_ha) + ' ha' : ''}`
      )
      .addTo(farmLayer!);
  });

  // Damage — heat weighted by damage %, plus clickable markers
  if (damage.length) {
    const heatPoints = damage.map((d: any) => [d.lat, d.lng, Math.max(0.1, (d.damage_percentage || 0) / 100)]);
    heatLayer = (L as any).heatLayer(heatPoints, { radius: 28, blur: 20, maxZoom: 15 });
    if (layers.damage) heatLayer.addTo(map);
    damage.forEach((d: any) => {
      L.circleMarker([d.lat, d.lng], {
        radius: 6, color: '#7f1d1d', weight: 1, fillColor: '#ef4444', fillOpacity: 0.85,
      })
        .bindPopup(
          `<strong>${esc(d.calamity_name || 'Damage')}</strong><br/>` +
          `${esc(d.farmer_name || '')}<br/>` +
          `Damage: <b>${esc(d.damage_percentage)}%</b><br/>` +
          `Status: ${esc(d.status)}<br/>` +
          `Brgy ${esc(d.brgy || '-')}`
        )
        .addTo(damageLayer!);
    });
  }

  // Pest outbreaks — severity-colored markers
  pests.forEach((p: any) => {
    const sev = String(p.severity || '').toLowerCase();
    const fill = sev.includes('high') || sev.includes('severe') ? '#b91c1c'
      : sev.includes('med') ? '#d97706' : '#eab308';
    L.circleMarker([p.lat, p.lng], {
      radius: 7, color: '#422006', weight: 1.5, fillColor: fill, fillOpacity: 0.9,
    })
      .bindPopup(
        `<strong>${esc(p.pest_name || 'Pest outbreak')}</strong><br/>` +
        `Severity: ${esc(p.severity || '-')}<br/>` +
        `Status: ${esc(p.status || '-')}<br/>` +
        `${esc(p.commodity || '')} &middot; Brgy ${esc(p.brgy || '-')}`
      )
      .addTo(pestLayer!);
  });

  applyLayerVisibility();
};

const applyLayerVisibility = () => {
  if (!map || !farmLayer || !damageLayer || !pestLayer) return;
  const setVis = (grp: L.LayerGroup, on: boolean) => {
    if (on) { if (!map!.hasLayer(grp)) map!.addLayer(grp); }
    else { if (map!.hasLayer(grp)) map!.removeLayer(grp); }
  };
  setVis(farmLayer, layers.farms);
  setVis(damageLayer, layers.damage);
  setVis(pestLayer, layers.pests);
  if (heatLayer) {
    if (layers.damage) { if (!map.hasLayer(heatLayer)) map.addLayer(heatLayer); }
    else { if (map.hasLayer(heatLayer)) map.removeLayer(heatLayer); }
  }
};

const toggleLayer = (key: 'farms' | 'damage' | 'pests') => {
  layers[key] = !layers[key];
  applyLayerVisibility();
};

const loadData = async () => {
  isLoading.value = true;
  try {
    const params: Record<string, string> = {};
    if (barangay.value) params.barangay = barangay.value;
    if (commodity.value) params.commodity = commodity.value;
    const res = await apiClient.get('/dashboard/map-data', { params });
    render(res.data?.data ?? {});
  } catch (e) {
    await toast('Failed to load map data.', 'danger');
  } finally {
    isLoading.value = false;
  }
};

const loadFilters = async () => {
  try {
    const [b, c] = await Promise.all([
      apiClient.get('/farmers/barangays'),
      apiClient.get('/farmers/commodities'),
    ]);
    barangays.value = (b.data?.data ?? b.data ?? []).filter(Boolean);
    commodities.value = (c.data?.data ?? c.data ?? []).filter(Boolean);
  } catch {
    // filters are optional; ignore
  }
};

const focusFromQuery = () => {
  const lat = parseFloat(String(route.query.lat ?? ''));
  const lng = parseFloat(String(route.query.lng ?? ''));
  if (map && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    map.setView([lat, lng], 16);
    L.circleMarker([lat, lng], {
      radius: 11, color: '#1d4ed8', weight: 3, fillColor: '#3b82f6', fillOpacity: 0.5,
    }).addTo(map).bindPopup('Selected location').openPopup();
  }
};

onMounted(async () => {
  await nextTick();
  initMap();
  await loadFilters();
  await loadData();
  focusFromQuery();
});

onBeforeUnmount(() => {
  if (map) { map.remove(); map = null; }
});
</script>

<style scoped>
.filter-bar { display: flex; gap: 0.75rem; padding: 0.6rem 0.9rem 0; flex-wrap: wrap; }
.filter { flex: 1; min-width: 150px; --background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 2px 10px; }
.layer-bar { display: flex; gap: 0.5rem; padding: 0.5rem 0.9rem; flex-wrap: wrap; }
.layer-bar ion-chip { --background: #eef2ff; font-weight: 600; }
.layer-bar ion-chip.off { opacity: 0.4; }
.dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
.dot.farms { background: #16a34a; }
.dot.damage { background: #ef4444; }
.dot.pests { background: #eab308; }
.map-shell { position: relative; margin: 0 0.9rem; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
.map-canvas { width: 100%; height: 62vh; min-height: 360px; }
.map-loading { position: absolute; z-index: 500; top: 12px; right: 12px; background: #fff; border-radius: 50%; padding: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
.legend { margin: 0.8rem 0.9rem 1.4rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0.7rem 0.9rem; font-size: 0.85rem; }
.legend strong { display: block; margin-bottom: 0.4rem; color: #0f172a; }
.legend-row { display: flex; align-items: center; margin: 2px 0; color: #334155; }
</style>
