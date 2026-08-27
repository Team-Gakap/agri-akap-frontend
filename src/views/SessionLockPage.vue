<template>
  <ion-page>
    <ion-content :fullscreen="true" class="ion-padding lock-bg">
      <div class="lock-card">
        <div class="lock-icon-wrap">
          <ion-icon :icon="lockClosedOutline"></ion-icon>
        </div>
        <h1>{{ authStore.mfaChallenge ? 'Verify identity' : 'Session Locked' }}</h1>
        <p class="lock-msg">
          {{
            authStore.mfaChallenge
              ? 'Enter your authenticator code to resume this SuperAdmin session.'
              : (authStore.lockReason
                || 'Your session has expired, but you have unsynced field data. Please re-authenticate to safely upload your records.')
          }}
        </p>

        <div class="email-chip" v-if="authStore.lockedEmail">
          {{ authStore.lockedEmail }}
        </div>

        <MfaChallengePanel
          v-if="authStore.mfaChallenge"
          :challenge="authStore.mfaChallenge"
          @completed="onMfaCompleted"
          @cancel="cancelMfa"
        />

        <template v-else>
          <ion-item class="custom-input" lines="none">
            <ion-icon :icon="lockClosed" slot="start" class="input-icon"></ion-icon>
            <ion-input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              label="Password"
              label-placement="floating"
              placeholder="Enter your password"
              autocomplete="current-password"
              @keyup.enter="unlock"
            ></ion-input>
            <ion-button fill="clear" slot="end" @click="showPassword = !showPassword">
              <ion-icon :icon="showPassword ? eyeOff : eye" color="medium"></ion-icon>
            </ion-button>
          </ion-item>

          <TurnstileWidget
            v-if="showCaptcha"
            ref="captcha"
            v-model="turnstileToken"
            action="unlock"
            size="flexible"
            class="turnstile-slot"
          />

          <ion-button
            expand="block"
            shape="round"
            class="unlock-btn"
            :disabled="isSubmitting || !password || (showCaptcha && !turnstileToken)"
            @click="unlock"
          >
            {{ isSubmitting ? 'Verifying…' : 'Unlock & Resume' }}
          </ion-button>
        </template>

        <ion-button fill="clear" color="medium" class="switch-user" @click="goLogin">
          Sign in as a different user
        </ion-button>

        <p class="preserve-note">
          Offline field queue (IndexedDB) is preserved. After unlock, open Sync to upload pending records.
        </p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  IonPage, IonContent, IonItem, IonInput, IonButton, IonIcon, toastController,
  onIonViewDidEnter,
} from '@ionic/vue';
import { lockClosed, lockClosedOutline, eye, eyeOff } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';
import { useRouter } from 'vue-router';
import TurnstileWidget from '@/components/TurnstileWidget.vue';
import MfaChallengePanel from '@/components/MfaChallengePanel.vue';

const authStore = useAuthStore();
const syncStore = useSyncStore();
const router = useRouter();

const password = ref('');
const showPassword = ref(false);
const isSubmitting = ref(false);
const turnstileToken = ref('');
const captcha = ref<{ reset: () => Promise<void> } | null>(null);
const showCaptcha = !Capacitor.isNativePlatform();
let didEnterOnce = false;

onIonViewDidEnter(() => {
  authStore.restoreMfaChallenge();
  if (didEnterOnce && showCaptcha && !authStore.mfaChallenge) {
    void captcha.value?.reset();
  }
  didEnterOnce = true;
});

const resumeAfterAuth = async () => {
  password.value = '';
  turnstileToken.value = '';
  if (syncStore.online && syncStore.pending > 0) {
    await syncStore.sync();
  }
};

const unlock = async () => {
  if (!password.value || isSubmitting.value) return;
  if (showCaptcha && !turnstileToken.value) {
    const t = await toastController.create({
      message: 'Please complete the captcha.',
      color: 'warning',
      duration: 2200,
      position: 'top',
    });
    await t.present();
    return;
  }
  isSubmitting.value = true;
  try {
    const result = await authStore.reauthenticate(
      password.value,
      showCaptcha ? turnstileToken.value : undefined,
    );
    if (!result.success) {
      if (showCaptcha) await captcha.value?.reset();
      const t = await toastController.create({
        message: result.message || 'Re-authentication failed.',
        color: 'danger',
        duration: 2800,
        position: 'top',
      });
      await t.present();
      return;
    }
    if (result.mfa_required) {
      password.value = '';
      turnstileToken.value = '';
      return;
    }
    await resumeAfterAuth();
  } finally {
    isSubmitting.value = false;
  }
};

const cancelMfa = () => {
  authStore.clearMfaChallenge();
};

const onMfaCompleted = () => {
  void resumeAfterAuth();
};

const goLogin = async () => {
  await authStore.logout();
  router.push('/login');
};
</script>

<style scoped>
.lock-bg {
  --background: linear-gradient(160deg, #0f2d1f 0%, #1a4731 45%, #243b2e 100%);
}
.lock-card {
  max-width: 420px;
  margin: 12vh auto 0;
  background: #fff;
  border-radius: 16px;
  padding: 1.75rem 1.5rem 1.25rem;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
  text-align: center;
}
.lock-icon-wrap {
  width: 64px;
  height: 64px;
  margin: 0 auto 0.75rem;
  border-radius: 50%;
  background: #fff8e1;
  color: #d4af37;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
}
.lock-card h1 {
  margin: 0 0 0.5rem;
  color: #1a4731;
  font-size: 1.35rem;
  font-weight: 800;
}
.lock-msg {
  color: #475569;
  font-size: 0.9rem;
  line-height: 1.45;
  margin: 0 0 1rem;
  text-align: left;
}
.email-chip {
  display: inline-block;
  background: #f0fdf4;
  color: #1a4731;
  border: 1px solid #c8e6c9;
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 0.8rem;
  font-weight: 700;
  margin-bottom: 1rem;
}
.custom-input {
  --background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  margin-bottom: 1rem;
}
.turnstile-slot {
  margin: 0 0 1rem;
}
.input-icon { color: #1a4731; }
.unlock-btn {
  --background: #1a4731;
  --border-radius: 999px;
  font-weight: 700;
  text-transform: none;
  margin-top: 0.25rem;
}
.switch-user {
  margin-top: 0.5rem;
  text-transform: none;
  font-size: 0.85rem;
}
.preserve-note {
  margin: 1rem 0 0;
  font-size: 0.75rem;
  color: #94a3b8;
  line-height: 1.4;
}
.lock-card :deep(.mfa-panel) {
  text-align: left;
}
</style>
