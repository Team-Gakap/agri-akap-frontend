<template>
  <ion-card class="weather-card">
    <ion-card-content>
      <div class="weather-head">
        <div class="head-copy">
          <p class="eyebrow">{{ useDeviceGps ? 'Field Climate · Live GPS' : 'Climate · Echague' }}</p>
          <h3 class="title">{{ today?.status || 'Weather' }}</h3>
          <p class="date" v-if="today">{{ formatDate(today.forecast_date) }} · {{ locationLabel }}</p>
        </div>
        <div class="temp-block" v-if="today">
          <span class="temp-main">{{ displayTemp }}°</span>
          <span class="temp-range">{{ formatTemp(today.temperature_min) }}° / {{ formatTemp(today.temperature_max) }}°</span>
        </div>
        <div class="temp-block muted" v-else-if="loading || locating">
          <ion-spinner name="crescent" color="light"></ion-spinner>
        </div>
        <div class="temp-block muted" v-else>
          <span class="temp-main">—</span>
        </div>
      </div>

      <!-- Device GPS strip (technician mobile) -->
      <div v-if="useDeviceGps" class="gps-strip">
        <div class="gps-left">
          <ion-icon :icon="locateOutline" class="gps-icon"></ion-icon>
          <div class="gps-copy">
            <span class="gps-label">You are in</span>
            <span v-if="locating || (coords && !placeName && loading)" class="gps-coords muted">Finding location…</span>
            <span v-else-if="placeName" class="gps-coords">{{ placeName }}</span>
            <span v-else class="gps-coords muted">{{ gpsError || 'Location not available' }}</span>
            <span v-if="placeSub" class="gps-sub">{{ placeSub }}</span>
          </div>
        </div>
        <button type="button" class="gps-refresh" :disabled="locating || loading" @click="refreshGpsWeather">
          <ion-icon :icon="refreshOutline"></ion-icon>
        </button>
      </div>

      <ion-select
        v-if="barangays.length && !useDeviceGps"
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
          <span class="metric-value" :class="{ warn: windSpeed > 15 }">
            {{ formatMetric(today.wind_speed_10m) }} km/h
          </span>
        </div>
      </div>

      <!-- Spray / field advisories from live conditions -->
      <div v-if="useDeviceGps && today" class="advisory" :class="advisory.tone">
        <p class="advisory-title">{{ advisory.title }}</p>
        <p class="advisory-desc">{{ advisory.desc }}</p>
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
import { IonCard, IonCardContent, IonSpinner, IonSelect, IonSelectOption, IonIcon } from '@ionic/vue';
import { locateOutline, refreshOutline } from 'ionicons/icons';
import apiClient from '@/utils/axios';
import { fetchRealLocation } from '@/composables/useNativeHardware';

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
  /** When true, acquire device GPS and show field location + spray advisories. */
  useDeviceGps?: boolean;
}>(), {
  defaultBarangay: 'Soyung (Poblacion)',
  useDeviceGps: false,
});

const loading = ref(true);
const locating = ref(false);
const error = ref('');
const gpsError = ref('');
const today = ref<WeatherDay | null>(null);
const forecast = ref<WeatherDay[]>([]);
const barangays = ref<string[]>([]);
const selectedBarangay = ref(props.defaultBarangay);
const coords = ref<{ lat: number; lng: number; accuracy: number } | null>(null);
const placeName = ref<string | null>(null);
const placeSub = ref<string | null>(null);
const inEchague = ref(false);

const windSpeed = computed(() => Number(today.value?.wind_speed_10m ?? 0));
const displayTempNum = computed(() => {
  if (!today.value) return null;
  const max = today.value.temperature_max;
  const min = today.value.temperature_min;
  if (max != null) return Number(max);
  if (min != null) return Number(min);
  return null;
});

const locationLabel = computed(() => {
  if (props.useDeviceGps && placeName.value) return placeName.value;
  return selectedBarangay.value;
});

const displayTemp = computed(() => {
  if (!today.value) return '—';
  const max = today.value.temperature_max;
  const min = today.value.temperature_min;
  if (max != null) return formatTemp(max);
  if (min != null) return formatTemp(min);
  return '—';
});

const advisory = computed(() => {
  const wind = windSpeed.value;
  const temp = displayTempNum.value ?? 0;

  if (wind > 15) {
    return {
      tone: 'danger',
      title: '⚠️ SPRAYING NOT RECOMMENDED',
      desc: 'High risk of pesticide drift. Wait for wind below 15 km/h.',
    };
  }
  if (temp > 35) {
    return {
      tone: 'warning',
      title: '⚠️ AVOID FOLIAR SPRAYING',
      desc: 'High evaporation rate. Spray early morning or late afternoon.',
    };
  }
  return {
    tone: 'success',
    title: '✅ Optimal conditions for field interventions',
    desc: 'Wind and temperature are within safe spraying thresholds.',
  };
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

const todayIso = () => new Date().toISOString().slice(0, 10);

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

const loadWeatherByBarangay = async () => {
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
};

const applyLocalPayload = (d: Record<string, any>) => {
  const temp = Number(d.temperature ?? d.temperature_max ?? d.temperature_2m ?? NaN);
  const wind = Number(d.wind_speed ?? d.wind_speed_10m ?? NaN);
  const rain = Number(d.precipitation_risk ?? d.precipitation_probability ?? 0);

  today.value = {
    forecast_date: todayIso(),
    temperature_min: Number.isFinite(temp) ? temp - 2 : null,
    temperature_max: Number.isFinite(temp) ? temp : null,
    precipitation_probability: Number.isFinite(rain) ? rain : 0,
    soil_moisture: d.soil_moisture != null ? Number(d.soil_moisture) : null,
    soil_moisture_28cm: d.soil_moisture_28cm != null ? Number(d.soil_moisture_28cm) : null,
    evapotranspiration: d.evapotranspiration != null ? Number(d.evapotranspiration) : null,
    wind_speed_10m: Number.isFinite(wind) ? wind : null,
    weather_code: d.weather_code != null ? Number(d.weather_code) : null,
    status: d.status || 'Live Field',
  };
  forecast.value = Array.isArray(d.forecast) ? d.forecast : forecast.value;
};

/** Build "City, Province" style subtitle from reverse-geocode parts. */
const formatPlaceSub = (parts: {
  municipality?: string | null;
  province?: string | null;
  country?: string | null;
  place?: string | null;
}) => {
  const bits = [parts.municipality, parts.province]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i && v !== parts.place);
  if (bits.length) return bits.join(', ');
  if (parts.country && parts.country !== parts.place) return parts.country;
  return null;
};

/**
 * Reverse-geocode GPS → real place name (works outside Echague).
 * Backend Nominatim first; BigDataCloud client fallback if API is down.
 */
const resolvePlaceName = async (lat: number, lng: number) => {
  placeName.value = null;
  placeSub.value = null;
  inEchague.value = false;

  try {
    const res = await apiClient.get('/weather/reverse', { params: { lat, lng }, timeout: 15000 } as any);
    const d = res.data?.data;
    if (d?.place) {
      placeName.value = String(d.place);
      placeSub.value = formatPlaceSub(d);
      inEchague.value = !!d.in_echague;

      const nearest = d.nearest_echague_barangay?.barangay;
      if (inEchague.value && typeof nearest === 'string' && nearest.trim()) {
        selectedBarangay.value = nearest;
      }
      return;
    }
  } catch {
    // fall through to public reverse-geocode client
  }

  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client` +
        `?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
    );
    if (!res.ok) throw new Error(`reverse ${res.status}`);
    const json = await res.json();
    const locality = json.locality || json.city || json.principalSubdivision || null;
    const municipality = json.city || json.locality || null;
    const province = json.principalSubdivision || null;
    const country = json.countryName || null;

    placeName.value = locality || municipality || province || 'Unknown location';
    placeSub.value = formatPlaceSub({
      place: placeName.value,
      municipality: municipality !== locality ? municipality : null,
      province,
      country,
    });
    inEchague.value = /echague/i.test(`${municipality || ''} ${locality || ''} ${province || ''}`);
  } catch {
    placeName.value = null;
    placeSub.value = null;
  }
};

const loadOpenMeteoAtCoords = async (lat: number, lng: number) => {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,windspeed_10m,precipitation_probability` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode` +
      `&timezone=Asia%2FManila&forecast_days=3`,
  );
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const json = await res.json();
  const current = json.current ?? {};
  const daily = json.daily ?? {};
  const dates: string[] = daily.time ?? [];

  today.value = {
    forecast_date: dates[0] || todayIso(),
    temperature_min: daily.temperature_2m_min?.[0] ?? null,
    temperature_max: current.temperature_2m ?? daily.temperature_2m_max?.[0] ?? null,
    precipitation_probability: current.precipitation_probability ?? daily.precipitation_probability_max?.[0] ?? 0,
    soil_moisture: null,
    wind_speed_10m: current.windspeed_10m ?? null,
    weather_code: daily.weathercode?.[0] ?? null,
    status: 'Live Field',
  };

  forecast.value = dates.slice(0, 3).map((date: string, i: number) => ({
    forecast_date: date,
    temperature_min: daily.temperature_2m_min?.[i] ?? null,
    temperature_max: daily.temperature_2m_max?.[i] ?? null,
    precipitation_probability: daily.precipitation_probability_max?.[i] ?? 0,
    soil_moisture: null,
    wind_speed_10m: i === 0 ? (current.windspeed_10m ?? null) : null,
    weather_code: daily.weathercode?.[i] ?? null,
    status: 'Forecast',
  }));
};

const loadWeatherByCoords = async (lat: number, lng: number) => {
  await resolvePlaceName(lat, lng);

  // Outside Echague (or unknown): always use live micro-climate at the GPS pin
  if (!inEchague.value) {
    try {
      await loadOpenMeteoAtCoords(lat, lng);
      error.value = '';
      return;
    } catch {
      error.value = 'Live weather unavailable for this location.';
      today.value = null;
      forecast.value = [];
      return;
    }
  }

  // Inside Echague: prefer cached barangay weather, then live pin weather
  try {
    await loadWeatherByBarangay();
    if (today.value) {
      error.value = '';
      return;
    }
  } catch {
    // continue
  }

  try {
    const res = await apiClient.get('/weather/local', {
      params: { lat, lng },
      timeout: 10000,
    } as any);
    applyLocalPayload(res.data?.data ?? res.data);
    error.value = '';
    return;
  } catch {
    // continue
  }

  try {
    await loadOpenMeteoAtCoords(lat, lng);
    error.value = '';
  } catch {
    today.value = null;
    forecast.value = [];
    error.value = 'Weather API unavailable.';
  }
};

const acquireGps = async (): Promise<boolean> => {
  locating.value = true;
  gpsError.value = '';
  placeName.value = null;
  placeSub.value = null;
  inEchague.value = false;
  try {
    const pos = await fetchRealLocation({ timeout: 15000 });
    coords.value = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? 999,
    };
    return true;
  } catch (err: any) {
    coords.value = null;
    placeName.value = null;
    placeSub.value = null;
    gpsError.value =
      err?.message?.includes('denied')
        ? 'Enable location permission to use field weather.'
        : (err?.message ?? 'GPS unavailable on this device.');
    return false;
  } finally {
    locating.value = false;
  }
};

const loadWeather = async () => {
  loading.value = true;
  error.value = '';
  try {
    if (props.useDeviceGps && coords.value) {
      await loadWeatherByCoords(coords.value.lat, coords.value.lng);
    } else {
      await loadWeatherByBarangay();
    }
  } catch {
    today.value = null;
    forecast.value = [];
    error.value = 'Weather API unavailable.';
  } finally {
    loading.value = false;
  }
};

const refreshGpsWeather = async () => {
  if (!props.useDeviceGps) return;
  const ok = await acquireGps();
  if (ok) await loadWeather();
};

const onBarangayChange = async (e: CustomEvent) => {
  selectedBarangay.value = String(e.detail.value);
  await loadWeather();
};

onMounted(async () => {
  await loadBarangays();

  if (props.useDeviceGps) {
    const ok = await acquireGps();
    if (ok) {
      await loadWeather();
      return;
    }
  }

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

.gps-strip {
  margin-top: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.7rem 0.8rem;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(212, 175, 55, 0.3);
}

.gps-left {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
  flex: 1;
}

.gps-icon {
  font-size: 1.35rem;
  color: #d4af37;
  flex-shrink: 0;
}

.gps-copy {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.gps-label {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #d4af37;
}

.gps-coords {
  font-size: 0.92rem;
  font-weight: 700;
  color: #fff;
  line-height: 1.25;
  white-space: normal;
}

.gps-coords.muted {
  color: rgba(255, 255, 255, 0.55);
  font-weight: 500;
}

.gps-sub {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.55);
}

.gps-refresh {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(212, 175, 55, 0.4);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
}

.gps-refresh:disabled {
  opacity: 0.5;
}

.gps-refresh ion-icon {
  font-size: 1.1rem;
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

.advisory {
  margin-top: 0.85rem;
  border-radius: 12px;
  padding: 0.75rem 0.85rem;
}

.advisory.danger {
  background: rgba(239, 68, 68, 0.18);
  border: 1px solid rgba(239, 68, 68, 0.55);
}

.advisory.warning {
  background: rgba(245, 158, 11, 0.18);
  border: 1px solid rgba(245, 158, 11, 0.55);
}

.advisory.success {
  background: rgba(16, 185, 129, 0.16);
  border: 1px solid rgba(16, 185, 129, 0.45);
}

.advisory-title {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 800;
  color: #fff;
  line-height: 1.3;
}

.advisory-desc {
  margin: 0.3rem 0 0;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.4;
}

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
