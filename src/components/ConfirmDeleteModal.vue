<template>
  <ion-alert
    :is-open="isOpen"
    :header="header"
    :message="message"
    :buttons="alertButtons"
    @didDismiss="onDismiss"
  ></ion-alert>
</template>

<script setup lang="ts">
import { IonAlert } from '@ionic/vue';
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  isOpen: boolean;
  header?: string;
  message?: string;
  confirmText?: string;
}>(), {
  header: 'Remove record?',
  message: 'This record will be removed. You can contact MAO admin if this was a mistake.',
  confirmText: 'Remove',
});

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const alertButtons = computed(() => [
  {
    text: 'Cancel',
    role: 'cancel',
  },
  {
    text: props.confirmText,
    role: 'destructive',
  },
]);

function onDismiss(ev: CustomEvent) {
  const role = String(ev.detail?.role || '');
  if (role === 'destructive') {
    emit('confirm');
    return;
  }
  if (role === 'cancel' || role === 'backdrop' || role === 'gesture') {
    emit('cancel');
  }
}
</script>
