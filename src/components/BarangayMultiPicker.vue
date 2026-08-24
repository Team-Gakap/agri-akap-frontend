<template>
  <div class="brgy-picker">
    <ion-item lines="none" class="select-all">
      <ion-checkbox
        :checked="selectAll"
        @ionChange="(e: CustomEvent) => emit('update:selectAll', !!e.detail.checked)"
      >Select all barangays</ion-checkbox>
    </ion-item>
    <p class="hint">{{ hint }}</p>
    <div class="brgy-list" :class="{ dimmed: selectAll }">
      <ion-item v-for="b in barangays" :key="b" lines="none">
        <ion-checkbox
          :checked="selectAll || modelValue.includes(b)"
          :disabled="selectAll"
          @ionChange="(e: CustomEvent) => onToggle(b, !!e.detail.checked)"
        >{{ b }}</ion-checkbox>
      </ion-item>
      <p v-if="!barangays.length" class="empty">No barangays loaded.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonItem, IonCheckbox } from '@ionic/vue';

const props = defineProps<{
  barangays: string[];
  modelValue: string[];
  selectAll: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void;
  (e: 'update:selectAll', value: boolean): void;
}>();

const hint = computed(() => {
  if (props.selectAll) return 'Recipients: farmers in every barangay.';
  if (!props.modelValue.length) return 'Check one or more barangays, or use Select all.';
  return `Recipients: farmers in ${props.modelValue.length} selected barangay${props.modelValue.length === 1 ? '' : 's'}.`;
});

const onToggle = (barangay: string, checked: boolean) => {
  if (checked) {
    emit('update:modelValue', Array.from(new Set([...props.modelValue, barangay])));
    return;
  }
  emit('update:modelValue', props.modelValue.filter((b) => b !== barangay));
};
</script>

<style scoped>
.brgy-picker {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
}
.select-all {
  --background: #f8fafc;
  font-weight: 700;
}
.hint {
  margin: 0;
  padding: 0.35rem 1rem 0.55rem;
  font-size: 0.78rem;
  color: #64748b;
}
.brgy-list {
  max-height: 220px;
  overflow: auto;
  border-top: 1px solid #e2e8f0;
}
.brgy-list.dimmed {
  opacity: 0.55;
}
.empty {
  margin: 0;
  padding: 0.75rem 1rem;
  color: #94a3b8;
  font-size: 0.85rem;
}
</style>
