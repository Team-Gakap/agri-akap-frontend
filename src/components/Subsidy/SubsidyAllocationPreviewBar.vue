<template>
  <div class="preview-bar" :class="tone">
    <div class="metric">
      <span class="metric-label">Total Selected</span>
      <span class="metric-value">{{ selectedCount }} Farmers</span>
    </div>
    <div class="metric">
      <span class="metric-label">Required Stock</span>
      <span class="metric-value">{{ requiredLabel }}</span>
    </div>
    <div class="metric">
      <span class="metric-label">Stock Balance</span>
      <span class="metric-value">{{ availableLabel }} available → {{ remainingLabel }} remaining</span>
    </div>
    <span class="tone-pill">{{ toneLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { stockTone, worstStockTone, type StockTone } from '@/services/subsidyManualFilter';

const props = defineProps<{
  selectedCount: number;
  requiredPrimary: number;
  requiredSecondary?: number | null;
  availablePrimary: number;
  availableSecondary?: number | null;
  unit: string;
  secondaryUnit?: string | null;
}>();

const fmt = (value: number) => Number(value || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 });

const primaryTone = computed(() => stockTone(props.requiredPrimary, props.availablePrimary));
const secondaryTone = computed<StockTone | null>(() => {
  if (!props.secondaryUnit || props.requiredSecondary == null || props.availableSecondary == null) return null;
  return stockTone(props.requiredSecondary, props.availableSecondary);
});
const tone = computed(() => worstStockTone(primaryTone.value, secondaryTone.value));

const toneLabel = computed(() => {
  if (tone.value === 'red') return 'Inventory breached';
  if (tone.value === 'amber') return 'Capacity warning';
  return 'Available';
});

const requiredLabel = computed(() => {
  const primary = `${fmt(props.requiredPrimary)} ${props.unit}`;
  if (props.secondaryUnit && props.requiredSecondary != null) {
    return `${primary} / ${fmt(props.requiredSecondary)} ${props.secondaryUnit}`;
  }
  return primary;
});

const availableLabel = computed(() => `${fmt(props.availablePrimary)} ${props.unit}`);

const remainingLabel = computed(() => {
  const left = props.availablePrimary - props.requiredPrimary;
  const primary = `${fmt(left)} ${props.unit}`;
  if (props.secondaryUnit && props.requiredSecondary != null && props.availableSecondary != null) {
    const secondaryLeft = props.availableSecondary - props.requiredSecondary;
    return `${primary} / ${fmt(secondaryLeft)} ${props.secondaryUnit}`;
  }
  return primary;
});
</script>

<style scoped>
.preview-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem 1.5rem;
  padding: 0.65rem 0.9rem;
  border-radius: 8px;
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
  color: #14532d;
}
.preview-bar.amber {
  border-color: #fcd34d;
  background: #fffbeb;
  color: #92400e;
}
.preview-bar.red {
  border-color: #fecaca;
  background: #fef2f2;
  color: #991b1b;
}
.metric { display: flex; flex-direction: column; min-width: 8rem; }
.metric-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.75;
}
.metric-value { font-size: 0.92rem; font-weight: 800; }
.tone-pill {
  margin-left: auto;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
}
</style>
