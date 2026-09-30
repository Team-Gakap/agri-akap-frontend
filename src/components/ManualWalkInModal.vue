<template>
  <ion-modal :is-open="isOpen" @didDismiss="onDismiss">
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Enlist manual walk-in</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="saving" @click="emit('cancel')">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p class="lead notice">
        Unregistered / Walk-in Farmer — this entry will be saved under a provisional profile.
        Subsidy release will need an admin override.
      </p>
      <p v-if="barangayName" class="meta">Barangay: <strong>{{ barangayName }}</strong> · Crop: <strong>{{ commodity }}</strong></p>
      <p v-if="error" class="error">{{ error }}</p>

      <div class="grid">
        <ion-input class="field" label="Surname" label-placement="stacked" :value="form.surname" @ionInput="(e: any) => form.surname = e.detail.value || ''"></ion-input>
        <ion-input class="field" label="First name" label-placement="stacked" :value="form.first_name" @ionInput="(e: any) => form.first_name = e.detail.value || ''"></ion-input>
        <ion-input class="field" label="Middle name" label-placement="stacked" :value="form.middle_name" @ionInput="(e: any) => form.middle_name = e.detail.value || ''"></ion-input>
        <ion-select class="field" label="Sex" label-placement="stacked" interface="popover" :value="form.sex" @ionChange="(e: any) => form.sex = e.detail.value">
          <ion-select-option value="Male">Male</ion-select-option>
          <ion-select-option value="Female">Female</ion-select-option>
        </ion-select>
        <ion-input class="field" type="date" label="Birthdate" label-placement="stacked" :value="form.birthdate" @ionInput="(e: any) => form.birthdate = e.detail.value || ''"></ion-input>
        <ion-input class="field" label="Mobile number" label-placement="stacked" :value="form.mobile_number" @ionInput="(e: any) => form.mobile_number = e.detail.value || ''"></ion-input>
        <ion-input class="field grow" label="Declared Farm Location (Sitio)" label-placement="stacked" :value="form.declared_sitio" placeholder="Barangay / Sitio" @ionInput="(e: any) => form.declared_sitio = e.detail.value || ''"></ion-input>
        <ion-input class="field" type="number" label="Hectares" label-placement="stacked" :value="form.hectares" @ionInput="(e: any) => form.hectares = e.detail.value || ''"></ion-input>
        <ion-textarea class="field grow" label="Remarks (optional)" label-placement="stacked" :auto-grow="true" :value="form.remarks" @ionInput="(e: any) => form.remarks = e.detail.value || ''"></ion-textarea>
      </div>

      <ion-button expand="block" :disabled="saving || !canSubmit" @click="submit">
        {{ saving ? 'Saving…' : 'Create provisional profile' }}
      </ion-button>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonInput, IonSelect, IonSelectOption, IonTextarea } from '@ionic/vue';
import { splitWalkInName, type ManualWalkInPayload } from '@/composables/useBarangayFarmerSearch';

const props = defineProps<{
  isOpen: boolean;
  initialQuery?: string;
  commodity: string;
  barangayName?: string;
  saving?: boolean;
  error?: string;
}>();

const emit = defineEmits<{
  cancel: [];
  submit: [payload: Omit<ManualWalkInPayload, 'commodity' | 'barangay_name'>];
}>();

const form = reactive({
  surname: '',
  first_name: '',
  middle_name: '',
  sex: '' as '' | 'Male' | 'Female',
  birthdate: '',
  mobile_number: '',
  hectares: '',
  declared_sitio: '',
  remarks: '',
});

watch(() => props.isOpen, (open) => {
  if (!open) return;
  const name = splitWalkInName(props.initialQuery || '');
  form.surname = name.surname;
  form.first_name = name.first_name;
  form.middle_name = name.middle_name;
  form.sex = '';
  form.birthdate = '';
  form.mobile_number = '';
  form.hectares = '';
  form.declared_sitio = '';
  form.remarks = '';
});

const canSubmit = computed(() =>
  !!form.surname.trim()
  && !!form.first_name.trim()
  && (form.sex === 'Male' || form.sex === 'Female')
  && !!form.birthdate
  && !!form.mobile_number.trim()
  && Number(form.hectares) >= 0.01
);

function onDismiss() {
  if (!props.saving) emit('cancel');
}

function submit() {
  if (!canSubmit.value || props.saving || (form.sex !== 'Male' && form.sex !== 'Female')) return;
  emit('submit', {
    surname: form.surname.trim(),
    first_name: form.first_name.trim(),
    middle_name: form.middle_name.trim() || undefined,
    sex: form.sex,
    birthdate: form.birthdate,
    mobile_number: form.mobile_number.trim(),
    hectares: Number(form.hectares),
    declared_sitio: form.declared_sitio.trim() || undefined,
    enlistment_remarks: form.remarks.trim() || undefined,
  });
}
</script>

<style scoped>
.lead { color: #334155; font-size: 0.92rem; margin-top: 0; }
.notice { background: #fef3c7; color: #92400e; padding: 0.65rem 0.75rem; border-radius: 8px; }
.meta { color: #475569; font-size: 0.85rem; }
.error { color: #b91c1c; font-size: 0.88rem; }
.grid { display: flex; flex-wrap: wrap; gap: 0.75rem; margin: 0.75rem 0 1rem; }
.field { flex: 1 1 180px; }
.grow { flex-basis: 100%; }
</style>
