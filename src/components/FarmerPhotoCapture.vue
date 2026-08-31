<template>
  <div class="photo-capture">
    <input
      ref="cameraInput"
      class="hidden-file"
      type="file"
      accept="image/*"
      capture="user"
      :disabled="disabled || busy"
      @change="onFile($event, 'camera')"
    />
    <input
      ref="galleryInput"
      class="hidden-file"
      type="file"
      accept="image/*"
      :disabled="disabled || busy"
      @change="onFile($event, 'gallery')"
    />

    <div v-if="pendingDataUrl" class="confirm-card">
      <img :src="pendingDataUrl" alt="Portrait preview" class="confirm-img" />
      <p class="confirm-hint">Does this look like a 2×2 ID photo?</p>
      <div class="confirm-actions">
        <ion-button size="small" fill="outline" color="medium" :disabled="busy" @click="retake">
          Retake
        </ion-button>
        <ion-button size="small" color="success" :disabled="busy" @click="confirm">
          Use this photo
        </ion-button>
      </div>
    </div>

    <div v-else class="capture-actions">
      <ion-button
        size="small"
        :fill="hasPhoto ? 'outline' : 'solid'"
        :color="hasPhoto ? 'medium' : 'warning'"
        :disabled="disabled || busy"
        @click="openCamera"
      >
        <ion-icon slot="start" :icon="cameraOutline"></ion-icon>
        {{ busy ? 'Preparing…' : hasPhoto ? 'Retake photo' : 'Take photo' }}
      </ion-button>
      <ion-button
        size="small"
        fill="outline"
        color="medium"
        :disabled="disabled || busy"
        @click="openGallery"
      >
        <ion-icon slot="start" :icon="imagesOutline"></ion-icon>
        {{ hasPhoto ? 'Replace from gallery' : 'Choose from gallery' }}
      </ion-button>
    </div>

    <p v-if="error" class="capture-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { IonButton, IonIcon } from '@ionic/vue';
import { cameraOutline, imagesOutline } from 'ionicons/icons';
import { resizeImageForId } from '@/utils/resizeImageForId';

const props = withDefaults(
  defineProps<{
    hasPhoto?: boolean;
    disabled?: boolean;
  }>(),
  { hasPhoto: false, disabled: false },
);

const emit = defineEmits<{
  captured: [dataUrl: string];
}>();

const cameraInput = ref<HTMLInputElement | null>(null);
const galleryInput = ref<HTMLInputElement | null>(null);
const pendingDataUrl = ref('');
const busy = ref(false);
const error = ref('');

const openCamera = () => cameraInput.value?.click();
const openGallery = () => galleryInput.value?.click();

const retake = () => {
  pendingDataUrl.value = '';
  error.value = '';
};

const confirm = () => {
  if (!pendingDataUrl.value) return;
  emit('captured', pendingDataUrl.value);
  pendingDataUrl.value = '';
};

const onFile = async (ev: Event, _source: 'camera' | 'gallery') => {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  busy.value = true;
  error.value = '';
  try {
    pendingDataUrl.value = await resizeImageForId(file);
  } catch (err: any) {
    error.value = err?.message || 'Could not prepare the photo.';
    pendingDataUrl.value = '';
  } finally {
    busy.value = false;
  }
};
</script>

<style scoped>
.photo-capture {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.hidden-file {
  display: none;
}

.capture-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.capture-actions ion-button {
  margin: 0;
  text-transform: none;
  font-weight: 700;
}

.confirm-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 240px;
}

.confirm-img {
  width: 160px;
  height: 160px;
  object-fit: cover;
  border-radius: 8px;
  border: 2px solid #1a4731;
  background: #f1f5f9;
}

.confirm-hint {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: #475569;
  text-align: center;
}

.confirm-actions {
  display: flex;
  gap: 8px;
}

.confirm-actions ion-button {
  margin: 0;
  text-transform: none;
  font-weight: 700;
}

.capture-error {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: #b91c1c;
  text-align: center;
}
</style>
