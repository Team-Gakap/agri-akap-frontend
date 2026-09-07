<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="webcam-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="webcam-capture-title"
    >
      <div class="webcam-modal">
        <header class="webcam-header">
          <h3 id="webcam-capture-title" class="webcam-title">
            <ion-icon :icon="cameraOutline" aria-hidden="true"></ion-icon>
            Beneficiary Photo Capture
          </h3>
          <button type="button" class="webcam-close" aria-label="Close camera" @click="closeModal">
            <ion-icon :icon="closeOutline"></ion-icon>
          </button>
        </header>

        <div class="webcam-viewport">
          <video
            ref="videoRef"
            autoplay
            playsinline
            muted
            class="webcam-video mirror"
          ></video>

          <div class="face-guide" aria-hidden="true"></div>

          <div v-if="cameraError" class="webcam-error">
            <p class="webcam-error-title">Camera Unavailable</p>
            <p class="webcam-error-msg">{{ cameraError }}</p>
          </div>
        </div>

        <canvas ref="canvasRef" class="webcam-canvas" width="400" height="400"></canvas>

        <footer class="webcam-footer">
          <button type="button" class="btn-cancel" @click="closeModal">Cancel</button>
          <button
            type="button"
            class="btn-capture"
            :disabled="!isStreaming"
            @click="captureFrame"
          >
            <ion-icon :icon="cameraOutline" aria-hidden="true"></ion-icon>
            Capture Photo
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { IonIcon } from '@ionic/vue';
import { cameraOutline, closeOutline } from 'ionicons/icons';

const props = defineProps<{ isOpen: boolean }>();
const emit = defineEmits<{
  close: [];
  captured: [base64: string];
}>();

const videoRef = ref<HTMLVideoElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const isStreaming = ref(false);
const cameraError = ref<string | null>(null);
let mediaStream: MediaStream | null = null;

const stopCamera = () => {
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
  if (videoRef.value) {
    videoRef.value.srcObject = null;
  }
  isStreaming.value = false;
};

const startCamera = async () => {
  cameraError.value = null;
  isStreaming.value = false;

  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.value = 'This browser does not support webcam capture. Please upload a photo instead.';
    return;
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 720 },
        height: { ideal: 720 },
        facingMode: 'user',
      },
      audio: false,
    });

    await nextTick();

    const video = videoRef.value;
    if (!video) {
      stopCamera();
      cameraError.value = 'Could not initialize the camera preview.';
      return;
    }

    video.srcObject = mediaStream;
    await video.play();
    isStreaming.value = true;
  } catch (err: unknown) {
    stopCamera();
    const message = err instanceof Error ? err.message : '';
    cameraError.value =
      message || 'Permission denied or no webcam found on this device.';
  }
};

const captureFrame = () => {
  const video = videoRef.value;
  const canvas = canvasRef.value;
  if (!video || !canvas || !isStreaming.value) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const vw = video.videoWidth || 720;
  const vh = video.videoHeight || 720;
  const side = Math.min(vw, vh);
  const sx = (vw - side) / 2;
  const sy = (vh - side) / 2;

  ctx.save();
  // Mirror to match the viewfinder
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, side, side, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  emit('captured', dataUrl);
  closeModal();
};

const closeModal = () => {
  stopCamera();
  emit('close');
};

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      void startCamera();
    } else {
      stopCamera();
    }
  },
);

onBeforeUnmount(() => {
  stopCamera();
});
</script>

<style scoped>
.webcam-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(4px);
}

.webcam-modal {
  position: relative;
  width: 100%;
  max-width: 420px;
  overflow: hidden;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.35);
}

.webcam-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  background: #f4f8f5;
}

.webcam-title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  font-weight: 700;
  color: #0f172a;
}

.webcam-title ion-icon {
  font-size: 1.1rem;
  color: #1a4731;
}

.webcam-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
}

.webcam-close:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.webcam-close ion-icon {
  font-size: 1.25rem;
}

.webcam-viewport {
  position: relative;
  aspect-ratio: 1 / 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #000;
}

.webcam-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mirror {
  transform: scaleX(-1);
}

.face-guide {
  pointer-events: none;
  position: absolute;
  inset: 2rem;
  border: 3px dashed rgba(255, 255, 255, 0.65);
  border-radius: 50%;
}

.webcam-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
  background: #0f172a;
}

.webcam-error-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 700;
  color: #f87171;
}

.webcam-error-msg {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.4;
  color: #cbd5e1;
}

.webcam-canvas {
  display: none;
}

.webcam-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-top: 1px solid #e2e8f0;
  background: #fff;
}

.btn-cancel,
.btn-capture {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease, opacity 0.15s ease;
}

.btn-cancel {
  padding: 10px 14px;
  border: none;
  background: transparent;
  color: #475569;
}

.btn-cancel:hover {
  background: #f1f5f9;
}

.btn-capture {
  padding: 10px 18px;
  border: none;
  background: #1a4731;
  color: #fff;
  box-shadow: 0 2px 8px rgba(26, 71, 49, 0.25);
}

.btn-capture:hover:not(:disabled) {
  background: #143828;
}

.btn-capture:active:not(:disabled) {
  transform: scale(0.97);
}

.btn-capture:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-capture ion-icon {
  font-size: 1rem;
}
</style>
