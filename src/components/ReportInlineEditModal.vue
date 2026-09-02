<template>
  <ion-modal :is-open="isOpen" class="report-edit-modal" @didDismiss="$emit('close')">
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>{{ title }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('close')">Cancel</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding edit-modal-body">
      <ion-item v-for="field in fields" :key="field.key" lines="none" class="field-item">
        <ion-input
          :label="field.label"
          label-placement="stacked"
          :type="field.type || 'text'"
          :value="form[field.key]"
          @ionInput="(e: any) => form[field.key] = e.detail.value"
        ></ion-input>
      </ion-item>
      <ion-button expand="block" class="save-btn" :disabled="saving || !canSave" @click="save">
        {{ saving ? 'Saving…' : 'Save changes' }}
      </ion-button>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonItem, IonInput,
} from '@ionic/vue';
import apiClient from '@/utils/axios';
import { toast } from '@/utils/toast';

export interface ReportEditField {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date';
  required?: boolean;
}

const props = defineProps<{
  isOpen: boolean;
  title: string;
  endpoint: string;
  fields: ReportEditField[];
  initial: Record<string, string | number | null | undefined>;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const saving = ref(false);
const form = reactive<Record<string, string>>({});

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return;
    for (const field of props.fields) {
      const val = props.initial[field.key];
      form[field.key] = val == null ? '' : String(val);
    }
  },
  { immediate: true },
);

const canSave = computed(() =>
  props.fields.every((f) => !f.required || String(form[f.key] ?? '').trim() !== ''),
);

async function save() {
  if (!canSave.value || saving.value) return;
  saving.value = true;
  try {
    const payload: Record<string, unknown> = {};
    for (const field of props.fields) {
      const raw = form[field.key];
      payload[field.key] = field.type === 'number' ? Number(raw) : raw;
    }
    await apiClient.patch(props.endpoint, payload);
    await toast.success('Record updated.');
    emit('saved');
    emit('close');
  } catch (e: any) {
    await toast.error(e?.response?.data?.message || 'Could not save changes.');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.edit-modal-body {
  --background: #f4f8f5;
}
.field-item {
  margin-bottom: 0.5rem;
  --background: #fff;
  border-radius: 8px;
}
.save-btn {
  margin-top: 1rem;
}
</style>

<style>
ion-modal.report-edit-modal {
  --height: auto;
  --max-height: 85%;
  --width: min(520px, 96%);
  --border-radius: 12px;
}
</style>
