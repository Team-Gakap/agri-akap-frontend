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
    <div class="edit-modal-body">
      <template v-for="field in visibleFields" :key="`${field.key}:${field.label}`">
        <ion-item v-if="field.type === 'select'" lines="none" class="field-item">
          <ion-select
            :label="field.label"
            label-placement="stacked"
            interface="action-sheet"
            :value="form[field.key]"
            @ionChange="(e: any) => form[field.key] = String(e.detail.value ?? '')"
          >
            <ion-select-option value="">{{ field.placeholder || 'Select…' }}</ion-select-option>
            <ion-select-option
              v-for="opt in field.options || []"
              :key="opt"
              :value="opt"
            >{{ opt }}</ion-select-option>
          </ion-select>
        </ion-item>
        <div v-else-if="field.type === 'variety'" class="field-item variety-wrap">
          <VarietyField
            :model-value="form[field.key]"
            :crop="varietyCrop"
            :label="field.label"
            select-class="variety-select"
            interface-name="action-sheet"
            @update:model-value="(v) => form[field.key] = v"
          />
        </div>
        <ion-item v-else lines="none" class="field-item">
          <ion-input
            :label="field.label"
            label-placement="stacked"
            :type="(field.type === 'number' || field.type === 'date') ? field.type : 'text'"
            v-model="form[field.key]"
          ></ion-input>
        </ion-item>
      </template>
      <ion-button expand="block" class="save-btn" :disabled="saving || !canSave" @click="save">
        {{ saving ? 'Saving…' : 'Save changes' }}
      </ion-button>
    </div>
  </ion-modal>
</template>

<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonItem, IonInput,
  IonSelect, IonSelectOption,
} from '@ionic/vue';
import VarietyField from '@/components/VarietyField.vue';
import apiClient from '@/utils/axios';
import { toast } from '@/utils/toast';

export interface ReportEditField {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'variety';
  required?: boolean;
  options?: string[];
  placeholder?: string;
  /** Virtual keys (pest/disease) — composed into damage_by on save, not sent. */
  virtual?: boolean;
  visibleWhen?: { key: string; equals?: string; not?: string };
}

const VIRTUAL_KEYS = new Set(['pest', 'disease']);

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

const varietyCrop = computed(() =>
  String(props.initial.crop || props.initial.crop_type || form.crop || form.crop_type || 'Rice'),
);

function isFieldVisible(field: ReportEditField): boolean {
  const rule = field.visibleWhen;
  if (!rule) return true;
  const current = String(form[rule.key] ?? '');
  if (rule.equals !== undefined) return current === rule.equals;
  if (rule.not !== undefined) return current !== rule.not;
  return true;
}

const visibleFields = computed(() => props.fields.filter(isFieldVisible));

function hydrate() {
  for (const field of props.fields) {
    const val = props.initial[field.key];
    form[field.key] = val == null ? '' : String(val);
  }
}

watch(
  () => [props.isOpen, props.fields, props.initial] as const,
  ([open]) => {
    if (!open) return;
    hydrate();
  },
  { immediate: true, deep: true },
);

const canSave = computed(() => {
  if (!visibleFields.value.every((f) => !f.required || String(form[f.key] ?? '').trim() !== '')) {
    return false;
  }
  const hasPestKeys = props.fields.some((f) => f.key === 'pest' || f.key === 'disease');
  if (hasPestKeys) {
    return !!(String(form.pest || '').trim() || String(form.disease || '').trim());
  }
  return true;
});

async function save() {
  if (!canSave.value || saving.value) return;
  saving.value = true;
  try {
    const payload: Record<string, unknown> = {};
    const hasPestKeys = props.fields.some((f) => f.key === 'pest' || f.key === 'disease');

    for (const field of props.fields) {
      if (!isFieldVisible(field)) continue;
      if (field.virtual || VIRTUAL_KEYS.has(field.key)) continue;

      const raw = form[field.key];
      if (field.type === 'number') {
        payload[field.key] = Number(raw);
      } else if (String(raw ?? '').trim() === '' && !field.required) {
        payload[field.key] = null;
      } else {
        payload[field.key] = raw;
      }
    }

    if (hasPestKeys) {
      const joined = [form.pest, form.disease].filter((v) => String(v || '').trim()).join(' / ');
      payload.damage_by = joined;
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
  background: #f4f8f5;
  padding: 1rem;
  overflow: auto;
  max-height: calc(85vh - 56px);
}
.field-item {
  margin-bottom: 0.5rem;
  --background: #fff;
  --color: #0f172a;
  --min-height: 56px;
  border-radius: 8px;
}
.variety-wrap {
  background: #fff;
  border-radius: 8px;
  padding: 0.25rem 0.5rem 0.5rem;
}
.variety-wrap :deep(.variety-select) {
  width: 100%;
  --color: #0f172a;
}
.save-btn {
  margin-top: 1rem;
}
</style>

<style>
ion-modal.report-edit-modal {
  --height: min(560px, 85%);
  --width: min(520px, 96%);
  --border-radius: 12px;
}
</style>
