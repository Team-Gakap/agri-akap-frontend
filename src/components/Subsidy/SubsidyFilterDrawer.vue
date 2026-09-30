<template>
  <ion-modal :is-open="open" @didDismiss="emit('close')">
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Filter farmers</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="emit('close')">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p class="drawer-label">Barangay</p>
      <BarangayMultiPicker
        v-model="draft.barangays"
        v-model:select-all="draft.allBarangays"
        :barangays="barangays"
      />

      <ion-item class="drawer-field">
        <ion-select
          label="Commodity"
          label-placement="stacked"
          interface="popover"
          :value="draft.commodity"
          @ionChange="(e: any) => draft.commodity = e.detail.value || ''"
        >
          <ion-select-option value="">Program crop</ion-select-option>
          <ion-select-option value="Rice">Rice</ion-select-option>
          <ion-select-option value="Corn">Corn</ion-select-option>
        </ion-select>
      </ion-item>

      <p class="drawer-label">Farm size (ha)</p>
      <div class="presets">
        <button type="button" class="preset" :class="{ on: preset === 'small' }" @click="applyPreset(0.1, 1)">0.1 – 1.0 ha</button>
        <button type="button" class="preset" :class="{ on: preset === 'mid' }" @click="applyPreset(1.1, 3)">1.1 – 3.0 ha</button>
        <button type="button" class="preset" :class="{ on: preset === 'large' }" @click="applyPreset(3.01, null)">&gt; 3.0 ha</button>
        <button type="button" class="preset" :class="{ on: preset === 'any' }" @click="applyPreset(null, null)">Any size</button>
      </div>
      <ion-item class="drawer-field" lines="none">
        <ion-range
          :dual-knobs="true"
          :min="0.1"
          :max="5"
          :step="0.1"
          :value="rangeValue"
          @ionChange="onRange"
        ></ion-range>
      </ion-item>
      <p class="range-readout">{{ rangeReadout }}</p>

      <ion-item lines="none">
        <ion-checkbox :checked="draft.rdanaValidated" @ionChange="(e: any) => draft.rdanaValidated = !!e.detail.checked">
          RDANA calamity validated
        </ion-checkbox>
      </ion-item>
      <div v-if="draft.rdanaValidated" class="rdana-fields">
        <ion-item>
          <ion-input
            type="number"
            label="Within past months"
            label-placement="stacked"
            :value="draft.rdanaMonths"
            min="1"
            max="120"
            @ionInput="(e: any) => draft.rdanaMonths = Number(e.detail.value) || 12"
          ></ion-input>
        </ion-item>
        <ion-item>
          <ion-input
            type="number"
            label="Minimum loss severity %"
            label-placement="stacked"
            :value="draft.rdanaMinSeverity"
            min="0"
            max="100"
            @ionInput="(e: any) => draft.rdanaMinSeverity = Number(e.detail.value) || 0"
          ></ion-input>
        </ion-item>
      </div>

      <ion-item lines="none">
        <ion-checkbox :checked="draft.pestOutbreak" @ionChange="(e: any) => draft.pestOutbreak = !!e.detail.checked">
          Active pest outbreak
        </ion-checkbox>
      </ion-item>
      <ion-item lines="none">
        <ion-checkbox :checked="draft.socialPriority" @ionChange="(e: any) => draft.socialPriority = !!e.detail.checked">
          Senior / PWD first
        </ion-checkbox>
      </ion-item>
      <ion-item lines="none">
        <ion-checkbox :checked="draft.excludeHistory" @ionChange="(e: any) => draft.excludeHistory = !!e.detail.checked">
          Exclude overlapping subsidy history
        </ion-checkbox>
      </ion-item>

      <ion-button expand="block" class="apply-btn" @click="apply">Apply filters</ion-button>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonItem, IonSelect, IonSelectOption, IonRange, IonCheckbox, IonInput,
} from '@ionic/vue';
import BarangayMultiPicker from '@/components/BarangayMultiPicker.vue';
import type { SubsidyFilterState } from '@/services/subsidyManualFilter';

const props = defineProps<{
  open: boolean;
  barangays: string[];
  modelValue: SubsidyFilterState;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'apply', value: SubsidyFilterState): void;
}>();

const draft = reactive<SubsidyFilterState>({ ...props.modelValue, barangays: [...props.modelValue.barangays] });

watch(() => props.open, (isOpen) => {
  if (!isOpen) return;
  Object.assign(draft, props.modelValue, { barangays: [...props.modelValue.barangays] });
});

const rangeValue = computed(() => ({
  lower: draft.minHa ?? 0.1,
  upper: draft.maxHa != null && draft.maxHa <= 5 ? draft.maxHa : 5,
}));

const rangeReadout = computed(() => {
  if (draft.minHa == null && draft.maxHa == null) return 'Any farm size';
  const min = draft.minHa ?? 0.1;
  if (draft.maxHa == null) return `${min.toFixed(1)} ha and above`;
  return `${min.toFixed(1)} – ${draft.maxHa.toFixed(1)} ha`;
});

const preset = computed(() => {
  if (draft.minHa == null && draft.maxHa == null) return 'any';
  if (draft.minHa === 0.1 && draft.maxHa === 1) return 'small';
  if (draft.minHa === 1.1 && draft.maxHa === 3) return 'mid';
  if (draft.minHa === 3.01 && draft.maxHa == null) return 'large';
  return '';
});

const applyPreset = (min: number | null, max: number | null) => {
  draft.minHa = min;
  draft.maxHa = max;
};

const onRange = (event: CustomEvent) => {
  const value = event.detail.value as { lower: number; upper: number };
  draft.minHa = Number(value.lower);
  draft.maxHa = Number(value.upper) >= 5 ? null : Number(value.upper);
};

const apply = () => {
  emit('apply', { ...draft, barangays: [...draft.barangays] });
};
</script>

<style scoped>
.drawer-label {
  margin: 0.85rem 0 0.35rem;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
}
.drawer-field { margin-top: 0.35rem; }
.presets { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.preset {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}
.preset.on {
  background: #e8f5e9;
  border-color: #1a4731;
  color: #1a4731;
}
.range-readout { margin: 0 0 0.5rem; font-size: 0.8rem; color: #475569; font-weight: 700; }
.rdana-fields { margin: 0.25rem 0 0.5rem; }
.apply-btn {
  --background: #1a4731;
  text-transform: none;
  font-weight: 800;
  margin-top: 1rem;
}
</style>
