<template>
  <div class="variety-field">
    <ion-select
      :class="selectClass"
      :label="label"
      label-placement="stacked"
      :interface="interfaceName"
      :value="selection"
      :placeholder="placeholder"
      @ionChange="onSelect"
    >
      <!-- Action-sheet: no separate header options (Ionic ignores disabled); prefix Class · Variety -->
      <template v-if="usePrefixedOptions">
        <template v-for="group in groups" :key="group.label">
          <ion-select-option
            v-for="v in group.varieties"
            :key="`${group.label}:${v}`"
            :value="v"
          >{{ group.label }} · {{ v }}</ion-select-option>
        </template>
        <ion-select-option :value="OTHER_VARIETY">{{ OTHER_VARIETY }}</ion-select-option>
      </template>
      <!-- Popover/alert: bold disabled section headers -->
      <template v-else>
        <template v-for="group in groups" :key="group.label">
          <ion-select-option :value="headerValue(group.label)" disabled class="variety-group-hdr">
            {{ group.label }}
          </ion-select-option>
          <ion-select-option v-for="v in group.varieties" :key="v" :value="v">{{ v }}</ion-select-option>
        </template>
        <ion-select-option :value="OTHER_VARIETY">{{ OTHER_VARIETY }}</ion-select-option>
      </template>
    </ion-select>
    <ion-input
      v-if="selection === OTHER_VARIETY"
      :class="selectClass"
      label="Specify variety"
      label-placement="stacked"
      :value="custom"
      placeholder="Type variety name"
      @ionInput="onCustom"
    ></ion-input>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { IonSelect, IonSelectOption, IonInput } from '@ionic/vue';
import {
  OTHER_VARIETY,
  isKnownVariety,
  varietyGroupsForCrop,
} from '@/constants/cropVarieties';

const props = withDefaults(defineProps<{
  modelValue: string;
  crop?: string;
  label?: string;
  placeholder?: string;
  selectClass?: string;
  interfaceName?: 'popover' | 'action-sheet' | 'alert';
}>(), {
  crop: 'Rice',
  label: 'Variety',
  placeholder: 'Select variety',
  selectClass: '',
  interfaceName: 'popover',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const custom = ref('');
const groups = computed(() => varietyGroupsForCrop(props.crop));
const usePrefixedOptions = computed(() => props.interfaceName === 'action-sheet');

const headerValue = (label: string) => `__hdr:${label}`;

const selection = computed(() => {
  if (!props.modelValue) return '';
  return isKnownVariety(props.crop, props.modelValue) ? props.modelValue : OTHER_VARIETY;
});

watch(
  () => [props.modelValue, props.crop] as const,
  ([value, crop]) => {
    if (value && !isKnownVariety(crop, value) && value !== OTHER_VARIETY) {
      custom.value = value;
    }
  },
  { immediate: true },
);

watch(
  () => props.crop,
  (crop, prev) => {
    if (prev && crop !== prev && props.modelValue && !isKnownVariety(crop, props.modelValue)) {
      custom.value = '';
      emit('update:modelValue', '');
    }
  },
);

const onSelect = (e: CustomEvent) => {
  const next = String(e.detail.value ?? '');
  if (next.startsWith('__hdr:')) return;
  if (next === OTHER_VARIETY) {
    emit('update:modelValue', custom.value.trim());
    return;
  }
  emit('update:modelValue', next);
};

const onCustom = (e: CustomEvent) => {
  const next = String(e.detail.value ?? '');
  custom.value = next;
  emit('update:modelValue', next);
};
</script>

<style scoped>
.variety-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 16rem;
  width: 100%;
}
.variety-field ion-select {
  min-width: 16rem;
  max-width: 100%;
}
.variety-field ion-select::part(text),
.variety-field ion-select::part(placeholder) {
  white-space: normal;
  overflow: visible;
  text-overflow: unset;
  line-height: 1.25;
}
.variety-field :deep(ion-select-option.variety-group-hdr),
.variety-field :deep(.variety-group-hdr) {
  font-weight: 800;
  opacity: 1;
  color: #0f172a;
}
</style>
