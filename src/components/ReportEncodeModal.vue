<template>
  <ion-modal
    :is-open="isOpen"
    class="encoding-modal"
    :keep-contents-mounted="false"
    @didDismiss="onDismiss"
  >
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>{{ title }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="close">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="encoding-modal-body">
      <MobileSubsidyDispenseView
        v-if="kind === 'subsidy'"
        embedded
        @saved="onSaved"
      />
      <component
        v-else-if="formComponent"
        :is="formComponent"
        embedded
        @saved="onSaved"
      />
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { type Component } from 'vue';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent } from '@ionic/vue';
import MobileSubsidyDispenseView from '@/views/Technician/MobileSubsidyDispenseView.vue';

export type EncodeKind = 'planting' | 'harvest' | 'pest' | 'damage' | 'subsidy' | 'standing';

defineProps<{
  isOpen: boolean;
  title: string;
  kind: EncodeKind;
  formComponent?: Component | null;
}>();

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void;
  (e: 'saved'): void;
}>();

const close = () => emit('update:isOpen', false);
const onDismiss = () => emit('update:isOpen', false);

const onSaved = () => {
  emit('saved');
};
</script>

<style scoped>
.encoding-modal-body {
  --background: #f4f8f5;
}
</style>

<style>
ion-modal.encoding-modal {
  --height: 92%;
  --width: min(980px, 96%);
  --border-radius: 12px;
  --box-shadow: 0 12px 40px rgba(15, 23, 42, 0.25);
}
</style>
