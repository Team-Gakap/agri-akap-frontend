<template>
  <div class="psgc-picker" :class="{ disabled, 'psgc-birthplace': isBirthplace }">
    <div v-if="showOutsideToggle" class="toggle-row">
      <ion-checkbox
        :checked="outsideEchague"
        :disabled="disabled"
        @ionChange="onOutsideToggle($event)"
      />
      <span class="toggle-label">Address is outside Echague</span>
    </div>

    <template v-if="!isNationalCascade">
      <div class="locked-grid" :class="{ 'no-region': !effectiveIncludeRegion }">
        <div v-if="effectiveIncludeRegion" class="locked-field">
          <span class="locked-label">Region</span>
          <span class="locked-value">{{ echague.region }}</span>
        </div>
        <div class="locked-field">
          <span class="locked-label">Province</span>
          <span class="locked-value">{{ echague.province }}</span>
        </div>
        <div class="locked-field">
          <span class="locked-label">Municipality / City</span>
          <span class="locked-value">{{ echague.city }}</span>
        </div>
      </div>
      <SearchableSelect
        :model-value="barangay"
        label="Barangay"
        placeholder="Search barangay…"
        :options="echagueBarangays"
        :required="required"
        :disabled="disabled"
        @update:model-value="emitBarangay"
      />
    </template>

    <template v-else>
      <div class="cascade-grid" :class="cascadeGridClass">
        <SearchableSelect
          v-if="effectiveIncludeRegion"
          :model-value="region"
          label="Region"
          placeholder="Select region…"
          :options="regionNames"
          :required="required"
          :disabled="disabled"
          @update:model-value="onRegionPick"
        />
        <SearchableSelect
          :model-value="province"
          :label="isBirthplace ? 'Place of Birth (Province)' : 'Province'"
          placeholder="Select province…"
          :options="provinceNames"
          :required="required"
          :disabled="disabled || (effectiveIncludeRegion && !regionCode)"
          @update:model-value="onProvincePick"
        />
        <SearchableSelect
          :model-value="city"
          :label="isBirthplace ? 'Place of Birth (City/Municipality)' : 'Municipality / City'"
          placeholder="Select city…"
          :options="cityNames"
          :required="required"
          :disabled="disabled || !provinceCode"
          @update:model-value="onCityPick"
        />
        <SearchableSelect
          v-if="showBarangay"
          :model-value="barangay"
          label="Barangay"
          placeholder="Search barangay…"
          :options="barangayNames"
          :required="required"
          :disabled="disabled || !cityCode"
          @update:model-value="emitBarangay"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { IonCheckbox } from '@ionic/vue';
import SearchableSelect from '@/components/SearchableSelect.vue';
import { usePsgcLocations, type PsgcItem } from '@/composables/usePsgcLocations';

const props = withDefaults(defineProps<{
  mode?: 'address' | 'birthplace';
  region?: string;
  province?: string;
  city?: string;
  barangay?: string;
  outsideEchague?: boolean;
  includeRegion?: boolean;
  required?: boolean;
  disabled?: boolean;
}>(), {
  mode: 'address',
  region: '',
  province: '',
  city: '',
  barangay: '',
  outsideEchague: false,
  includeRegion: true,
  required: true,
  disabled: false,
});

const emit = defineEmits<{
  (e: 'update:region', value: string): void;
  (e: 'update:province', value: string): void;
  (e: 'update:city', value: string): void;
  (e: 'update:barangay', value: string): void;
  (e: 'update:outsideEchague', value: boolean): void;
}>();

const {
  fetchRegions,
  fetchProvinces,
  fetchCities,
  fetchBarangays,
  getEchagueDefaults,
  fallbackDefaults,
} = usePsgcLocations();

const isBirthplace = computed(() => props.mode === 'birthplace');
const showOutsideToggle = computed(() => !isBirthplace.value);
const isNationalCascade = computed(() => isBirthplace.value || props.outsideEchague);
const showBarangay = computed(() => !isBirthplace.value);
const effectiveIncludeRegion = computed(() => (isBirthplace.value ? true : props.includeRegion));
const cascadeGridClass = computed(() => {
  if (isBirthplace.value) return 'birthplace-grid';
  if (!effectiveIncludeRegion.value) return 'no-region';
  return '';
});

const echague = ref({ ...fallbackDefaults });
const echagueBarangays = computed(() => echague.value.barangays);

const regions = ref<PsgcItem[]>([]);
const provinces = ref<PsgcItem[]>([]);
const cities = ref<PsgcItem[]>([]);
const barangays = ref<PsgcItem[]>([]);

const regionCode = ref('');
const provinceCode = ref('');
const cityCode = ref('');

const regionNames = computed(() => regions.value.map((r) => r.name));
const provinceNames = computed(() => provinces.value.map((p) => p.name));
const cityNames = computed(() => cities.value.map((c) => c.name));
const barangayNames = computed(() => barangays.value.map((b) => b.name));

const findCode = (list: PsgcItem[], name: string) =>
  list.find((item) => item.name === name)?.code ?? '';

const applyEchagueDefaults = () => {
  if (effectiveIncludeRegion.value) emit('update:region', echague.value.region);
  emit('update:province', echague.value.province);
  emit('update:city', echague.value.city);
};

const onOutsideToggle = (event: CustomEvent) => {
  const checked = !!event.detail.checked;
  emit('update:outsideEchague', checked);
  if (!checked) {
    applyEchagueDefaults();
    emit('update:barangay', '');
    regionCode.value = echague.value.region_code;
    provinceCode.value = echague.value.province_code;
    cityCode.value = echague.value.city_code;
  } else {
    emit('update:region', '');
    emit('update:province', '');
    emit('update:city', '');
    emit('update:barangay', '');
    regionCode.value = '';
    provinceCode.value = '';
    cityCode.value = '';
    provinces.value = [];
    cities.value = [];
    barangays.value = [];
  }
};

const onRegionPick = async (name: string) => {
  emit('update:region', name);
  emit('update:province', '');
  emit('update:city', '');
  if (!isBirthplace.value) emit('update:barangay', '');
  regionCode.value = findCode(regions.value, name);
  provinceCode.value = '';
  cityCode.value = '';
  cities.value = [];
  barangays.value = [];
  provinces.value = regionCode.value ? await fetchProvinces(regionCode.value) : [];
};

const onProvincePick = async (name: string) => {
  emit('update:province', name);
  emit('update:city', '');
  if (!isBirthplace.value) emit('update:barangay', '');
  provinceCode.value = findCode(provinces.value, name);
  cityCode.value = '';
  barangays.value = [];
  cities.value = provinceCode.value ? await fetchCities(provinceCode.value) : [];
};

const onCityPick = async (name: string) => {
  emit('update:city', name);
  if (isBirthplace.value) return;
  emit('update:barangay', '');
  cityCode.value = findCode(cities.value, name);
  barangays.value = cityCode.value ? await fetchBarangays(cityCode.value) : [];
};

const emitBarangay = (value: string) => {
  emit('update:barangay', value);
};

const hydrateNationalCascade = async () => {
  if (effectiveIncludeRegion.value) {
    if (!regions.value.length) regions.value = await fetchRegions();
    if (props.region) {
      regionCode.value = findCode(regions.value, props.region);
      if (regionCode.value && !provinces.value.length) {
        provinces.value = await fetchProvinces(regionCode.value);
      }
    }
  }

  if (props.province && provinces.value.length) {
    provinceCode.value = findCode(provinces.value, props.province);
    if (provinceCode.value && !cities.value.length) {
      cities.value = await fetchCities(provinceCode.value);
    }
  }

  if (props.city && cities.value.length) {
    cityCode.value = findCode(cities.value, props.city);
    if (cityCode.value && showBarangay.value && !barangays.value.length) {
      barangays.value = await fetchBarangays(cityCode.value);
    }
  }
};

onMounted(async () => {
  echague.value = await getEchagueDefaults();

  if (isBirthplace.value) {
    regions.value = await fetchRegions();
    await hydrateNationalCascade();
    return;
  }

  if (!props.outsideEchague && !props.city) {
    applyEchagueDefaults();
  }
  if (props.outsideEchague) {
    regions.value = effectiveIncludeRegion.value ? await fetchRegions() : [];
    await hydrateNationalCascade();
  }
});

watch(() => props.outsideEchague, async (outside) => {
  if (isBirthplace.value) return;
  if (outside && effectiveIncludeRegion.value && !regions.value.length) {
    regions.value = await fetchRegions();
    await hydrateNationalCascade();
  }
});
</script>

<style scoped>
.psgc-picker.disabled {
  opacity: 0.65;
  pointer-events: none;
}
.toggle-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.65rem;
}
.toggle-label {
  font-size: 0.82rem;
  color: #334155;
  font-weight: 600;
}
.locked-grid,
.cascade-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
  margin-bottom: 0.65rem;
}
.cascade-grid.birthplace-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.locked-grid.no-region,
.cascade-grid.no-region {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.locked-field {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #f8fafc;
  padding: 0.45rem 0.65rem;
  min-height: 42px;
}
.locked-label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.35px;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 4px;
}
.locked-value {
  font-size: 13px;
  color: #0f172a;
  font-weight: 600;
}
@media (max-width: 900px) {
  .locked-grid,
  .cascade-grid,
  .cascade-grid.birthplace-grid {
    grid-template-columns: 1fr;
  }
}
</style>
