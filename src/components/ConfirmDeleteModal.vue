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

const props = withDefaults(defineProps<{
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
    handler: () => emit('cancel'),
  },
  {
    text: 'Remove',
    role: 'destructive',
    handler: () => emit('confirm'),
  },
]);

function onDismiss() {
  emit('cancel');
}
</script>
