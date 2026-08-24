<template>
  <div class="form-export-actions" :class="theme">
    <ion-button class="export-btn" :fill="theme === 'admin' ? 'outline' : 'solid'" :disabled="printDisabled" @click="$emit('print')">
      <ion-icon slot="start" :icon="printOutline"></ion-icon>
      Print
    </ion-button>
    <ion-button class="excel-btn" fill="outline" @click="$emit('excel')">
      <ion-icon slot="start" :icon="downloadOutline"></ion-icon>
      Download Excel
    </ion-button>
  </div>
</template>

<script setup lang="ts">
import { IonButton, IonIcon } from '@ionic/vue';
import { downloadOutline, printOutline } from 'ionicons/icons';

withDefaults(
  defineProps<{ theme?: 'barangay' | 'admin'; printDisabled?: boolean }>(),
  { theme: 'barangay', printDisabled: false },
);

defineEmits<{
  print: [];
  excel: [];
}>();
</script>

<style scoped>
.form-export-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.form-export-actions.barangay .export-btn {
  --background: #d4af37;
  --color: #1a4731;
  font-weight: 700;
  text-transform: none;
}

.form-export-actions.admin .export-btn,
.form-export-actions.admin .excel-btn,
.form-export-actions.barangay .excel-btn {
  --background: #1a4731;
  --background-activated: #245a3f;
  --background-focused: #245a3f;
  --background-hover: #245a3f;
  --color: #ffffff;
  --border-color: #1a4731;
  --border-width: 0;
  --border-radius: 6px;
  font-weight: 700;
  text-transform: none;
}
</style>
