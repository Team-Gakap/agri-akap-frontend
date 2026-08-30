<template>
  <div class="turnstile-wrap">
    <div v-if="!siteKey" class="turnstile-error" role="alert">
      Captcha is not configured. Add VITE_TURNSTILE_SITE_KEY and restart the app.
    </div>
    <div v-else ref="host" class="turnstile-host"></div>
    <p v-if="errorMessage" class="turnstile-error" role="alert">{{ errorMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { loadTurnstile, TURNSTILE_SITE_KEY, type TurnstileApi } from '@/utils/turnstile';

const token = defineModel<string>({ default: '' });

const props = withDefaults(defineProps<{
  action?: string;
  size?: 'normal' | 'compact' | 'flexible';
}>(), {
  action: 'login',
  size: 'flexible',
});

const emit = defineEmits<{
  ready: [];
  failed: [message: string];
}>();

const host = ref<HTMLElement | null>(null);
const errorMessage = ref('');
const siteKey = TURNSTILE_SITE_KEY;
let api: TurnstileApi | null = null;
let widgetId: string | null = null;
let mounted = true;

const clearToken = () => {
  token.value = '';
};

const mountWidget = async () => {
  if (!siteKey || !host.value || widgetId) return;

  errorMessage.value = '';
  try {
    api = await loadTurnstile();
    if (!mounted || !host.value || widgetId) return;

    widgetId = api.render(host.value, {
      sitekey: siteKey,
      theme: 'light',
      size: props.size,
      appearance: 'always',
      action: props.action,
      retry: 'auto',
      'refresh-expired': 'auto',
      callback: (value: string) => {
        token.value = value;
        errorMessage.value = '';
        emit('ready');
      },
      'expired-callback': clearToken,
      'timeout-callback': () => {
        clearToken();
        errorMessage.value = 'Captcha timed out. Please try again.';
      },
      'error-callback': () => {
        clearToken();
        // Turnstile already renders its own error UI (e.g. "Verification failed").
        if (import.meta.env.DEV) {
          errorMessage.value =
            'Captcha failed to load. Check your connection and hostname settings.';
        }
        emit('failed', errorMessage.value || 'turnstile-error');
      },
    });
  } catch (err: any) {
    errorMessage.value = err?.message || 'Failed to load captcha.';
    emit('failed', errorMessage.value);
  }
};

const reset = async () => {
  clearToken();
  if (api && widgetId) {
    try {
      api.reset(widgetId);
      return;
    } catch {
      // Widget was detached (Ionic page cache). Remount below.
    }
  }
  unmountWidget();
  await mountWidget();
};

const unmountWidget = () => {
  if (api && widgetId) {
    try {
      api.remove(widgetId);
    } catch {
      // ignore
    }
  }
  widgetId = null;
  clearToken();
};

onMounted(() => {
  mounted = true;
  void mountWidget();
});

onBeforeUnmount(() => {
  mounted = false;
  unmountWidget();
});

defineExpose({ reset, remount: reset });
</script>

<style scoped>
.turnstile-wrap {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  min-height: 68px;
}

.turnstile-host {
  width: 100%;
  min-height: 65px;
  display: flex;
  justify-content: stretch;
}

.turnstile-host :deep(iframe) {
  max-width: 100%;
  width: 100%;
}

.turnstile-error {
  margin: 0.35rem 0 0;
  color: #b91c1c;
  font-size: 0.8rem;
  font-weight: 600;
  text-align: center;
  line-height: 1.35;
}
</style>
