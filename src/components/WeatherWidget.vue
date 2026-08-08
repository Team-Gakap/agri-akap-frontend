<template>
  <ion-card class="weather-card">
    <ion-card-content>
      <div class="weather-head">
        <div class="head-copy">
          <p class="eyebrow">Hyper-Local Climate · Echague</p>
          <h3 class="title">{{ today?.status || 'Weather' }}</h3>
          <p class="date" v-if="today">{{ formatDate(today.forecast_date) }} · {{ selectedBarangay }}</p>
        </div>
        <div class="temp-block" v-if="today">
          <span class="temp-main">{{ displayTemp }}°</span>
          <span class="temp-range">{{ formatTemp(today.temperature_min) }}° / {{ formatTemp(today.temperature_max) }}°</span>
        </div>
        <div class="temp-block muted" v-else-if="loading">
          <ion-spinner name="crescent" color="light"></ion-spinner>
        </div>
        <div class="temp-block muted" v-else>
          <span class="temp-main">—</span>
        </div>
      </div>

      <ion-select
        v-if="barangays.length"
        class="brgy-select"
        interface="popover"
        :value="selectedBarangay"
        @ionChange="onBarangayChange"
      >
        <ion-select-option v-for="b in barangays" :key="b" :value="b">{{ b }}</ion-select-option>
      </ion-select>

      <div class="metrics" v-if="today">
        <div class="metric">
          <span class="metric-label">Rain Chance</span>
          <span class="metric-value">{{ today.precipitation_probability ?? 0 }}%</span>
        </div>
        <div class="metric">
          <span class="metric-label">Crop Water Demand (ET0)</span>
          <span class="metric-value">{{ formatMetric(today.evapotranspiration) }} mm</span>
        </div>
        <div class="metric">
          <span class="metric-label">Root Zone Moisture</span>
          <span class="metric-value">{{ formatMetric(today.soil_moisture_28cm ?? today.soil_moisture) }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Wind Speed</span>
          <span class="metric-value" :class="{ warn: (today.wind_speed_10m ?? 0) > 15 }">
            {{ formatMetric(today.wind_speed_10m) }} km/h
          </span>
        </div>
      </div>

      <p v-if="error" class="error-note">{{ error }}</p>

      <div class="forecast" v-if="forecast.length">
        <div v-for="day in forecast" :key="day.forecast_date" class="forecast-day">
          <span class="f-day">{{ shortDay(day.forecast_date) }}</span>
          <span class="f-status">{{ day.status }}</span>
          <span class="f-temp">{{ formatTemp(day.temperature_max) }}°</span>
          <span class="f-rain">{{ day.precipitation_probability ?? 0 }}%</span>
        </div>
      </div>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { IonCard, IonCardContent, IonSpinner, IonSelect, IonSelectOption } from '@ionic/vue';
import apiClient from '@/utils/axios';

interface WeatherDay {
  id?: string;
  barangay_name?: string;
  forecast_date: string;
  temperature_min: number | null;
  temperature_max: number | null;
  precipitation_probability: number | null;
  soil_moisture: number | null;
  evapotranspiration?: number | null;
  soil_moisture_28cm?: number | null;
  wind_speed_10m?: number | null;
  weather_code: number | null;
  status: string;
}

const props = withDefaults(defineProps<{
  defaultBarangay?: string;
}>(), {
  defaultBarangay: 'Soyung (Poblacion)',
});

const loading = ref(true);
const error = ref('');
const today = ref<WeatherDay | null>(null);
const forecast = ref<WeatherDay[]>([]);
const barangays = ref<string[]>([]);
const selectedBarangay = ref(props.defaultBarangay);

const displayTemp = computed(() => {
  if (!today.value) return '—';
  const max = today.value.temperature_max;
  const min = today.value.temperature_min;
  if (max != null) return formatTemp(max);
  if (min != null) return formatTemp(min);
  return '—';
});

const formatTemp = (n: number | null | undefined) => {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Math.round(Number(n)).toString();
};

const formatMetric = (n: number | null | undefined) => {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toFixed(1);
};

const formatDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

const shortDay = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short' });

const loadBarangays = async () => {
  try {
    const res = await apiClient.get('/weather/barangays');
    barangays.value = res.data?.data ?? [];
    if (barangays.value.length && !barangays.value.includes(selectedBarangay.value)) {
      selectedBarangay.value = barangays.value[0];
    }
  } catch {
    try {
      const res = await apiClient.get('/farmers/barangays');
      barangays.value = res.data?.data ?? [];
    } catch {
      barangays.value = [props.defaultBarangay];
    }
  }
};

const loadWeather = async () => {
  loading.value = true;
  error.value = '';
  try {
    const res = await apiClient.get('/weather/current', {
      params: { barangay: selectedBarangay.value },
    });
    const payload = res.data?.data;
    today.value = payload?.today ?? null;
    forecast.value = Array.isArray(payload?.forecast) ? payload.forecast : [];
    if (payload?.location?.barangay) {
      selectedBarangay.value = payload.location.barangay;
    }
    if (!today.value) {
      error.value = 'No cache for this barangay. Run php artisan weather:fetch.';
    }
  } catch {
    today.value = null;
    forecast.value = [];
    error.value = 'Weather API unavailable.';
  } finally {
    loading.value = false;
  }
};

const onBarangayChange = async (e: CustomEvent) => {
  selectedBarangay.value = String(e.detail.value);
  await loadWeather();
};

onMounted(async () => {
  await loadBarangays();
  await loadWeather();
});
</script>

<style scoped>
.weather-card {
  margin: 0 0 1rem;
  border-radius: 16px;
  background: linear-gradient(135deg, #1a4731 0%, #245a3f 55%, #1a4731 100%);
  color: #fff;
  box-shadow: 0 6px 18px rgba(26, 71, 49, 0.25);
  border: 1px solid rgba(212, 175, 55, 0.35);
}

.weather-card ion-card-content {
  padding: 1rem 1.1rem 1.1rem;
}

.weather-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
}

.eyebrow {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #d4af37;
}

.title {
  margin: 0.2rem 0 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: #fff;
}

.date {
  margin: 0.15rem 0 0;
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.75);
}

.temp-block { text-align: right; min-width: 72px; }
.temp-block.muted { opacity: 0.85; }

.temp-main {
  display: block;
  font-size: 2.4rem;
  font-weight: 800;
  line-height: 1;
  color: #d4af37;
}

.temp-range {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.8);
}

.brgy-select {
  margin-top: 0.85rem;
  --background: rgba(255, 255, 255, 0.12);
  --color: #fff;
  --placeholder-color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(212, 175, 55, 0.4);
  border-radius: 10px;
  padding: 0 0.5rem;
  max-width: 100%;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  margin-top: 0.85rem;
}

.metric {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(212, 175, 55, 0.25);
  border-radius: 10px;
  padding: 0.55rem 0.45rem;
  text-align: center;
}

.metric-label {
  display: block;
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 700;
}

.metric-value {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.95rem;
  font-weight: 800;
  color: #fff;
}

.metric-value.warn { color: #fbbf24; }

.error-note {
  margin: 0.75rem 0 0;
  font-size: 0.75rem;
  color: #fde68a;
}

.forecast {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
  margin-top: 0.9rem;
}

.forecast-day {
  background: rgba(0, 0, 0, 0.18);
  border-radius: 10px;
  padding: 0.5rem 0.4rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.f-day {
  font-size: 0.72rem;
  font-weight: 800;
  color: #d4af37;
  text-transform: uppercase;
}

.f-status {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.f-temp { font-size: 0.95rem; font-weight: 800; }
.f-rain { font-size: 0.7rem; color: rgba(255, 255, 255, 0.7); }

@media (min-width: 768px) {
  .metrics { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
</style>
