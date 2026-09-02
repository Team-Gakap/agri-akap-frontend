<template>
  <div class="report-row-actions no-print">
    <ion-button
      v-if="canEdit"
      size="small"
      fill="clear"
      color="primary"
      @click="$emit('edit')"
    >
      Edit
    </ion-button>
    <ion-button
      v-if="canRemove"
      size="small"
      fill="clear"
      color="danger"
      @click="$emit('remove')"
    >
      Remove
    </ion-button>
  </div>
</template>

<script setup lang="ts">
import { IonButton } from '@ionic/vue';

withDefaults(defineProps<{
  canEdit?: boolean;
  canRemove?: boolean;
}>(), {
  canEdit: true,
  canRemove: true,
});

defineEmits<{
  edit: [];
  remove: [];
}>();
</script>

<style scoped>
.report-row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  align-items: center;
}
</style>
