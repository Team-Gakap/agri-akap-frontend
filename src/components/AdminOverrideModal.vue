<template>
  <ion-modal :is-open="isOpen" @didDismiss="onDismiss">
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Admin override</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="emit('cancel')">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p class="lead">
        This farmer is an unverified walk-in and is not on the RSBSA registry.
        Re-enter your account password and record why this subsidy is being released.
      </p>
      <p v-if="error" class="error">{{ error }}</p>
      <ion-input
        class="field"
        type="password"
        label="Your password"
        label-placement="stacked"
        :value="password"
        @ionInput="(e: any) => password = e.detail.value || ''"
      ></ion-input>
      <ion-select
        class="field"
        label="Reason"
        label-placement="stacked"
        interface="popover"
        :value="reasonCode"
        @ionChange="(e: any) => reasonCode = e.detail.value || ''"
      >
        <ion-select-option value="">Select a reason</ion-select-option>
        <ion-select-option v-for="opt in OVERRIDE_REASONS" :key="opt.code" :value="opt.code">
          {{ opt.label }}
        </ion-select-option>
      </ion-select>
      <ion-textarea
        class="field"
        label="Additional notes (optional)"
        label-placement="stacked"
        placeholder="Land title, batch reference, or calamity details."
        :auto-grow="true"
        :rows="3"
        :value="notes"
        @ionInput="(e: any) => notes = e.detail.value || ''"
      ></ion-textarea>
      <ion-button expand="block" :disabled="!canConfirm" @click="confirm">
        Authorize release
      </ion-button>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonInput, IonTextarea, IonSelect, IonSelectOption } from '@ionic/vue';
import { OVERRIDE_REASONS } from '@/constants/hvccCatalog';

const props = defineProps<{
  isOpen: boolean;
  error?: string;
}>();

const emit = defineEmits<{
  cancel: [];
  confirm: [payload: { password: string; reason: string; reason_code: string; notes: string }];
}>();

const password = ref('');
const reasonCode = ref('');
const notes = ref('');

watch(() => props.isOpen, (open) => {
  if (!open) return;
  password.value = '';
  reasonCode.value = '';
  notes.value = '';
});

const selectedReason = computed(() => OVERRIDE_REASONS.find((opt) => opt.code === reasonCode.value));
const canConfirm = computed(() => password.value.trim().length > 0 && !!selectedReason.value);

function onDismiss() {
  emit('cancel');
}

function confirm() {
  if (!canConfirm.value) return;
  const label = selectedReason.value?.label || '';
  const extra = notes.value.trim();
  emit('confirm', {
    password: password.value,
    reason_code: reasonCode.value,
    notes: extra,
    reason: extra ? `${label} — ${extra}` : label,
  });
}
</script>

<style scoped>
.lead { color: #334155; font-size: 0.92rem; margin-top: 0; }
.error { color: #b91c1c; font-size: 0.88rem; }
.field { margin-bottom: 0.85rem; }
</style>
