<template>
  <ion-alert
    :is-open="isOpen"
    header="Remove record?"
    :message="message"
    :buttons="alertButtons"
    @didDismiss="onDismiss"
  ></ion-alert>
</template>

<script setup lang="ts">
import { IonAlert } from '@ionic/vue';
import { computed } from 'vue';

withDefaults(defineProps<{
  isOpen: boolean;
  message?: string;
}>(), {
  message: 'This record will be removed. You can contact MAO admin if this was a mistake.',
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
    text: 'Remove',
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
