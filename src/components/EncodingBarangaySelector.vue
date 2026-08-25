<template>
  <div class="encoding-barangay-block">
    <div v-if="isAdminOverride" class="admin-banner">
      <ion-icon :icon="createOutline"></ion-icon>
      <div>
        <strong>Admin Override — Manual Entry</strong>
        <p>You are encoding data on behalf of a local barangay unit. Select the target barangay before searching farmers.</p>
      </div>
    </div>

    <SearchableSelect
      v-if="isAdminOverride"
      variant="filter"
      label="Target Barangay"
      placeholder="Search barangay…"
      :options="barangayOptions"
      :model-value="selectedBarangay"
      :disabled="loadingBarangays"
      @update:model-value="onBarangayPicked"
    />

    <div v-else-if="!canEncode" class="warn-banner">
      No assigned barangay on this account. Ask MAO admin to set <code>assigned_barangay</code> before encoding.
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue';
import { createOutline } from 'ionicons/icons';
import SearchableSelect from '@/components/SearchableSelect.vue';

defineProps<{
  isAdminOverride: boolean;
  selectedBarangay: string;
  barangayOptions: string[];
  loadingBarangays: boolean;
  canEncode: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:selectedBarangay', value: string): void;
  (e: 'change'): void;
}>();

const onBarangayPicked = (value: string) => {
  emit('update:selectedBarangay', value);
  emit('change');
};
</script>

<style scoped>
.encoding-barangay-block { margin-bottom: 1rem; }

.admin-banner {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  background: #eff6ff;
  color: #1e3a5f;
  border: 1px solid #93c5fd;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
  font-size: 0.88rem;
}
.admin-banner ion-icon {
  font-size: 1.4rem;
  color: #2563eb;
  flex-shrink: 0;
  margin-top: 2px;
}
.admin-banner strong { display: block; margin-bottom: 0.2rem; }
.admin-banner p { margin: 0; font-size: 0.82rem; opacity: 0.9; }

.warn-banner {
  background: #fff8e1;
  color: #92400e;
  border: 1px solid #fcd34d;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  font-size: 0.88rem;
}
</style>
