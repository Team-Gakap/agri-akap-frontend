<template>
  <AuthShell
    title="Forgot password"
    subtitle="Enter your official work email. If an active account is associated with this email, a reset link will be dispatched."
  >
    <form class="auth-form" @submit.prevent="submit">
      <ion-item class="custom-input" lines="none">
        <ion-icon :icon="mailOutline" slot="start" class="input-icon"></ion-icon>
        <ion-input
          v-model="email"
          label="Email Address"
          autocomplete="username"
          label-placement="floating"
          type="email"
          placeholder="admin@echague.gov.ph"
        ></ion-input>
      </ion-item>

      <TurnstileWidget
        v-if="showCaptcha"
        ref="captcha"
        v-model="turnstileToken"
        action="forgot-password"
        size="flexible"
        class="turnstile-slot"
      />

      <ion-button
        type="submit"
        expand="block"
        class="login-button"
        :disabled="isSubmitting || (showCaptcha && !turnstileToken)"
      >
        <ion-spinner v-if="isSubmitting" name="crescent"></ion-spinner>
        <span v-else>Send reset link</span>
      </ion-button>
    </form>

    <button type="button" class="back-link" @click="goLogin">Back to sign in</button>
  </AuthShell>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Capacitor } from '@capacitor/core';
import { IonItem, IonInput, IonIcon, IonButton, IonSpinner } from '@ionic/vue';
import { mailOutline } from 'ionicons/icons';
import AuthShell from '@/components/AuthShell.vue';
import TurnstileWidget from '@/components/TurnstileWidget.vue';
import { useAuthStore } from '@/stores/authStore';
import { presentToast } from '@/utils/toast';

const router = useRouter();
const authStore = useAuthStore();
const showCaptcha = !Capacitor.isNativePlatform();

const email = ref('');
const turnstileToken = ref('');
const isSubmitting = ref(false);
const captcha = ref<{ reset: () => Promise<void> } | null>(null);

const goLogin = () => router.replace({ name: 'Login' });

const submit = async () => {
  if (isSubmitting.value) return;
  if (!email.value.trim()) {
    await presentToast('Email is required.', 'warning');
    return;
  }
  if (showCaptcha && !turnstileToken.value) {
    await presentToast('Please complete the captcha.', 'warning');
    return;
  }

  isSubmitting.value = true;
  const result = await authStore.requestPasswordReset({
    email: email.value.trim(),
    turnstile_token: showCaptcha ? turnstileToken.value : undefined,
  });
  isSubmitting.value = false;

  if (result.success) {
    await presentToast(result.message, 'success', 4200);
    email.value = '';
    turnstileToken.value = '';
    if (showCaptcha) await captcha.value?.reset();
    return;
  }

  if (showCaptcha) await captcha.value?.reset();
  await presentToast(result.message, 'danger');
};
</script>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
}

.custom-input {
  --background: #ffffff;
  --color: #0f172a;
  --placeholder-color: #94a3b8;
  --highlight-color: transparent;
  --padding-start: 0.7rem;
  --inner-padding-end: 0.35rem;
  min-height: 48px;
  height: 52px;
  margin-bottom: 0.85rem;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.custom-input:focus-within {
  border-color: #1a4731;
  box-shadow: 0 0 0 3px rgba(26, 71, 49, 0.12);
}

.input-icon {
  color: #1a4731;
  font-size: 1.15rem;
  margin-right: 0.35rem;
}

.turnstile-slot {
  margin: 0 0 1rem;
  width: 100%;
}

.login-button {
  --background: #1a4731;
  --background-hover: #14532d;
  --background-activated: #0f2d1f;
  --border-radius: 8px;
  --box-shadow: none;
  margin: 0;
  height: 48px;
  font-weight: 800;
  font-size: 0.95rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.login-button ion-spinner {
  width: 22px;
  height: 22px;
  color: #fff;
}

.back-link {
  display: block;
  width: 100%;
  margin-top: 1rem;
  background: none;
  border: 0;
  color: #1a4731;
  font-size: 0.85rem;
  font-weight: 800;
  cursor: pointer;
  text-align: center;
}
</style>
