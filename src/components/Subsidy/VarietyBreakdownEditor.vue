<template>
  <div class="variety-editor">
    <p class="assign-note">
      A barangay only marks that variety as Recommended. Technicians can still issue any variety that has stock on the truck.
    </p>
    <div v-for="(v, vi) in modelValue" :key="vi" class="variety-block">
      <div class="variety-edit-row">
        <ion-input
          class="variety-edit-name"
          :value="v.variety_name"
          placeholder="Variety name (e.g. JACKPOT)"
          @ionInput="(e: any) => v.variety_name = String(e.detail.value ?? '')"
        ></ion-input>
        <ion-input
          type="number"
          class="variety-edit-qty"
          :value="v.quantity"
          placeholder="Qty"
          min="0"
          @ionInput="(e: any) => v.quantity = e.detail.value === '' || e.detail.value == null ? null : Number(e.detail.value)"
        ></ion-input>
        <button type="button" class="variety-remove-btn" @click="removeRow(vi)">✕</button>
      </div>
      <div class="variety-assign-row">
        <select class="fca-select" :value="v.target_fca" @change="onFca(v, $event)">
          <option value="">No FCA</option>
          <option v-if="v.target_fca && !fcaOptions.includes(v.target_fca)" :value="v.target_fca">
            {{ v.target_fca }} (not registered)
          </option>
          <option v-for="name in fcaOptions" :key="name" :value="name">{{ name }}</option>
        </select>
        <details class="brgy-details">
          <summary>{{ barangaySummary(v) }}</summary>
          <div class="brgy-checks">
            <label v-for="b in barangays" :key="b" class="brgy-check">
              <input
                type="checkbox"
                :checked="v.target_barangays.includes(b)"
                @change="toggleBarangay(v, b, ($event.target as HTMLInputElement).checked)"
              />
              <span>{{ b }}</span>
            </label>
            <p v-if="!barangays.length" class="empty">No barangays loaded.</p>
          </div>
        </details>
      </div>
    </div>

    <ion-button expand="block" fill="outline" class="variety-add-btn" @click="addRow">
      + Add variety
    </ion-button>
    <p class="total-hint">
      Total: {{ total.toLocaleString() }} {{ unitLabel || 'units' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonButton, IonInput } from '@ionic/vue';

export interface VarietyDraft {
  variety_name: string;
  quantity: number | null;
  target_fca: string;
  target_barangays: string[];
}

const props = defineProps<{
  modelValue: VarietyDraft[];
  barangays: string[];
  fcas?: string[];
  unitLabel?: string;
}>();

const fcaOptions = computed(() => props.fcas ?? []);

const emit = defineEmits<{
  'update:modelValue': [VarietyDraft[]];
}>();

const total = computed(() =>
  props.modelValue.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0),
);

const blankRow = (): VarietyDraft => ({
  variety_name: '',
  quantity: null,
  target_fca: '',
  target_barangays: [],
});

const addRow = () => {
  emit('update:modelValue', [...props.modelValue, blankRow()]);
};

const removeRow = (index: number) => {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index));
};

const onFca = (row: VarietyDraft, event: Event) => {
  row.target_fca = (event.target as HTMLSelectElement).value;
};

const toggleBarangay = (row: VarietyDraft, barangay: string, checked: boolean) => {
  if (checked) {
    if (!row.target_barangays.includes(barangay)) {
      row.target_barangays = [...row.target_barangays, barangay];
    }
    return;
  }
  row.target_barangays = row.target_barangays.filter((name) => name !== barangay);
};

const barangaySummary = (row: VarietyDraft) => {
  const count = row.target_barangays.length;
  if (!count) return 'Barangays receiving this variety (optional)';
  if (count <= 2) return row.target_barangays.join(', ');
  return `${count} barangays`;
};
</script>

<style scoped>
.variety-block {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.55rem 0.65rem 0.7rem;
  margin-bottom: 0.65rem;
  background: #fff;
}
.variety-edit-row { display: flex; gap: 0.5rem; align-items: center; }
.variety-edit-name { flex: 1; }
.variety-edit-qty { width: 110px; }
.variety-remove-btn {
  background: #fee2e2;
  color: #991b1b;
  border: none;
  border-radius: 6px;
  padding: 0.35rem 0.6rem;
  cursor: pointer;
  font-size: 0.85rem;
}
.variety-assign-row {
  display: grid;
  grid-template-columns: minmax(140px, 220px) 1fr;
  gap: 0.5rem;
  margin-top: 0.45rem;
  align-items: start;
}
.fca-select {
  width: 100%;
  min-height: 42px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #0f172a;
  font: inherit;
  font-size: 0.85rem;
  padding: 0.4rem 0.55rem;
}
.assign-note {
  margin: 0 0 0.65rem;
  color: #475569;
  font-size: 0.8rem;
  line-height: 1.4;
}
.brgy-details {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}
.brgy-details summary {
  cursor: pointer;
  padding: 0.55rem 0.7rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: #1a4731;
}
.brgy-checks {
  max-height: 160px;
  overflow: auto;
  padding: 0.25rem 0.7rem 0.55rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.15rem 0.5rem;
}
.brgy-check {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: #0f172a;
}
.empty { margin: 0; color: #94a3b8; font-size: 0.8rem; }
.variety-add-btn { text-transform: none; margin-bottom: 0.35rem; }
.total-hint { color: #64748b; font-size: 0.85rem; margin: 0.25rem 0 0.75rem; }
@media (max-width: 640px) {
  .variety-assign-row { grid-template-columns: 1fr; }
  .brgy-checks { grid-template-columns: 1fr; }
}
</style>
