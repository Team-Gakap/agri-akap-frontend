<template>
  <div class="sig-pad">
    <div class="sig-pad-head">
      <span class="sig-pad-label">{{ label }}</span>
      <button type="button" class="sig-clear-btn" @click="clear">Clear</button>
    </div>
    <div class="sig-canvas-wrap" :class="{ empty: !hasStroke }">
      <canvas
        ref="canvasEl"
        class="sig-canvas"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @pointerleave="onPointerUp"
      ></canvas>
      <span v-if="!hasStroke" class="sig-placeholder">Sign here</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';

const props = defineProps<{
  label: string;
  /** Reset counter — bump from the parent to force-clear this pad (e.g. after save). */
  resetSignal?: number;
}>();

const emit = defineEmits<{
  (e: 'update:hasSignature', value: boolean): void;
}>();

const canvasEl = ref<HTMLCanvasElement | null>(null);
const hasStroke = ref(false);
let ctx: CanvasRenderingContext2D | null = null;
let drawing = false;
let lastX = 0;
let lastY = 0;
let resizeObserver: ResizeObserver | null = null;

const DPR = () => Math.max(window.devicePixelRatio || 1, 1);

const resizeCanvas = () => {
  const canvas = canvasEl.value;
  if (!canvas) return;
  const wrap = canvas.parentElement;
  if (!wrap) return;

  // Preserve current strokes across a resize by snapshotting first.
  const prevHadStroke = hasStroke.value;
  let snapshot: ImageData | null = null;
  if (ctx && canvas.width > 0 && canvas.height > 0) {
    try {
      snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch {
      snapshot = null;
    }
  }

  const dpr = DPR();
  const rect = wrap.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1a4731';

  if (snapshot && prevHadStroke) {
    // Best-effort restore (only exact when size is unchanged).
    try {
      ctx.putImageData(snapshot, 0, 0);
    } catch {
      /* ignore — pad will just appear blank after a real size change */
    }
  }
};

const getPos = (e: PointerEvent) => {
  const canvas = canvasEl.value!;
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
};

const onPointerDown = (e: PointerEvent) => {
  if (!ctx) return;
  e.preventDefault();
  drawing = true;
  (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  const { x, y } = getPos(e);
  lastX = x;
  lastY = y;
  ctx.beginPath();
  ctx.moveTo(x, y);
};

const onPointerMove = (e: PointerEvent) => {
  if (!drawing || !ctx) return;
  e.preventDefault();
  const { x, y } = getPos(e);
  ctx.lineTo(x, y);
  ctx.stroke();
  lastX = x;
  lastY = y;
  if (!hasStroke.value) {
    hasStroke.value = true;
    emit('update:hasSignature', true);
  }
};

const onPointerUp = (e: PointerEvent) => {
  if (!drawing) return;
  drawing = false;
  (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
};

const clear = () => {
  const canvas = canvasEl.value;
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  hasStroke.value = false;
  emit('update:hasSignature', false);
};

/** Extract the signature as a Base64 PNG data URL, or null if untouched. */
const toBase64 = (): string | null => {
  if (!hasStroke.value || !canvasEl.value) return null;
  return canvasEl.value.toDataURL('image/png');
};

watch(
  () => props.resetSignal,
  () => clear(),
);

onMounted(async () => {
  await nextTick();
  resizeCanvas();
  if (canvasEl.value?.parentElement && 'ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => resizeCanvas());
    resizeObserver.observe(canvasEl.value.parentElement);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});

defineExpose({ clear, toBase64, hasStroke });
</script>

<style scoped>
.sig-pad {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.sig-pad-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

.sig-pad-label {
  font-size: 0.8rem;
  font-weight: 800;
  color: #334155;
}

.sig-clear-btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #64748b;
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border-radius: 8px;
  padding: 0.3rem 0.6rem;
  line-height: 1;
}

.sig-clear-btn:active {
  background: #f1f5f9;
}

.sig-canvas-wrap {
  position: relative;
  height: 140px;
  border: 1.5px dashed #cbd5e1;
  border-radius: 12px;
  background: #fff;
  overflow: hidden;
  touch-action: none;
}

.sig-canvas-wrap.empty {
  background: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 110px,
    #e2e8f0 110px,
    #e2e8f0 111px
  );
}

.sig-canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: crosshair;
}

.sig-placeholder {
  position: absolute;
  bottom: 8px;
  left: 12px;
  font-size: 0.72rem;
  font-weight: 700;
  color: #cbd5e1;
  pointer-events: none;
}
</style>
