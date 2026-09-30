<template>
  <div class="hvcc-selector">
    <ion-select
      class="field"
      label="Crop Type"
      label-placement="stacked"
      interface="popover"
      :value="crop"
      @ionChange="onCrop"
    >
      <ion-select-option value="Rice">Rice</ion-select-option>
      <ion-select-option value="Corn">Corn</ion-select-option>
      <ion-select-option value="HVCC">HVCC</ion-select-option>
    </ion-select>

    <ion-select
      v-if="crop === 'HVCC'"
      class="field"
      label="Category"
      label-placement="stacked"
      interface="popover"
      :value="category"
      @ionChange="onCategory"
    >
      <ion-select-option value="">Select category</ion-select-option>
      <ion-select-option v-for="name in hvccCategories()" :key="name" :value="name">{{ name }}</ion-select-option>
    </ion-select>

    <ion-select
      v-if="crop === 'HVCC' && category"
      class="field"
      label="Specific Commodity / Crop"
      label-placement="stacked"
      interface="popover"
      :value="commoditySelection"
      @ionChange="onCommodity"
    >
      <ion-select-option value="">Select commodity</ion-select-option>
      <ion-select-option v-for="name in hvccCommoditiesFor(category)" :key="name" :value="name">{{ name }}</ion-select-option>
      <ion-select-option :value="OTHER_COMMODITY">Other</ion-select-option>
    </ion-select>

    <ion-input
      v-if="crop === 'HVCC' && commoditySelection === OTHER_COMMODITY"
      class="field"
      label="Other commodity"
      label-placement="stacked"
      :value="otherText"
      placeholder="Type the commodity"
      @ionInput="onOther"
    ></ion-input>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { IonSelect, IonSelectOption, IonInput } from '@ionic/vue';
import {
  OTHER_COMMODITY,
  hvccCategories,
  hvccCommoditiesFor,
  isHvccCommodity,
} from '@/constants/hvccCatalog';

const crop = defineModel<string>('crop', { default: 'Rice' });
const category = defineModel<string>('category', { default: '' });
const commodity = defineModel<string>('commodity', { default: '' });

const emit = defineEmits<{
  change: [];
}>();

const otherText = ref('');
const commoditySelection = computed(() => {
  if (!commodity.value) return '';
  if (isHvccCommodity(commodity.value)) return commodity.value;
  return OTHER_COMMODITY;
});

watch(commoditySelection, (value) => {
  if (value === OTHER_COMMODITY) otherText.value = isHvccCommodity(commodity.value) ? '' : commodity.value;
});

function onCrop(e: any) {
  const next = e.detail.value || 'Rice';
  crop.value = next;
  if (next !== 'HVCC') {
    category.value = '';
    commodity.value = '';
    otherText.value = '';
  }
  emit('change');
}

function onCategory(e: any) {
  category.value = e.detail.value || '';
  commodity.value = '';
  otherText.value = '';
  emit('change');
}

function onCommodity(e: any) {
  const next = e.detail.value || '';
  if (next === OTHER_COMMODITY) {
    commodity.value = otherText.value.trim();
  } else {
    commodity.value = next;
    otherText.value = '';
  }
  emit('change');
}

function onOther(e: any) {
  otherText.value = e.detail.value || '';
  commodity.value = otherText.value.trim();
  emit('change');
}
</script>

<style scoped>
.hvcc-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  flex: 1 1 280px;
}
.field { flex: 1 1 180px; }
</style>
