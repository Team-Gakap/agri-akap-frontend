<template>
  <AuthShell
    title="Reset password"
    subtitle="Choose a new password for your AGRI-AKAP account. This link can be used only once."
  >
    <p v-if="!token" class="link-error">This reset link is missing a token. Request a new link from the sign-in page.</p>

    <form v-else class="auth-form" @submit.prevent="submit">
      <ion-item class="custom-input" lines="none">
        <ion-icon :icon="mailOutline" slot="start" class="input-icon"></ion-icon>
        <ion-input
          v-model="email"
          label="Email Address"
          autocomplete="username"
          label-placement="floating"
          type="email"
        ></ion-input>
      </ion-item>

      <PasswordStrengthField v-model="password" label="New password" />

      <ion-item class="custom-input" lines="none">
        <ion-icon :icon="lockClosed" slot="start" class="input-icon"></ion-icon>
        <ion-input
          v-model="confirmation"
          :type="showConfirm ? 'text' : 'password'"
          label="Confirm new password"
          label-placement="floating"
          autocomplete="new-password"
        ></ion-input>
        <ion-button
          fill="clear"
          slot="end"
          class="toggle-password-btn"
          type="button"
          :aria-label="showConfirm ? 'Hide password' : 'Show password'"
          @click="showConfirm = !showConfirm"
        >
          <ion-icon :icon="showConfirm ? eyeOff : eye"></ion-icon>
        </ion-button>
      </ion-item>
      <p v-if="confirmation && !matches" class="hint fail">Passwords do not match.</p>

      <ion-button
        type="submit"
        expand="block"
        class="login-button"
        :disabled="isSubmitting || !canSubmit"
      >
        <ion-spinner v-if="isSubmitting" name="crescent"></ion-spinner>
        <span v-else>Update password</span>
      </ion-button>
    </form>

    <button type="button" class="back-link" @click="goLogin">Back to sign in</button>
  </AuthShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IonItem, IonInput, IonIcon, IonButton, IonSpinner } from '@ionic/vue';
import { mailOutline, lockClosed, eye, eyeOff } from 'ionicons/icons';
import AuthShell from '@/components/AuthShell.vue';
import PasswordStrengthField from '@/components/PasswordStrengthField.vue';
import { useAuthStore } from '@/stores/authStore';
import { isPasswordStrong } from '@/utils/passwordPolicy';
import { presentToast } from '@/utils/toast';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const token = computed(() => String(route.query.token || ''));
const email = ref(String(route.query.email || ''));
const password = ref('');
const confirmation = ref('');
const showConfirm = ref(false);
const isSubmitting = ref(false);

const matches = computed(() => password.value === confirmation.value);
const canSubmit = computed(() =>
  !!email.value.trim()
  && isPasswordStrong(password.value)
  && matches.value
  && confirmation.value.length > 0,
);

const goLogin = () => router.replace({ name: 'Login' });

const submit = async () => {
  if (isSubmitting.value || !canSubmit.value) return;

  isSubmitting.value = true;
  const result = await authStore.confirmPasswordReset({
    email: email.value.trim(),
    token: token.value,
    password: password.value,
    password_confirmation: confirmation.value,
  });
  isSubmitting.value = false;

  if (result.success) {
    await presentToast(result.message, 'success', 4200);
    await router.replace({ name: 'Login' });
    return;
  }

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

.toggle-password-btn {
  margin: 0;
  --color: #475569;
  --padding-start: 0.4rem;
  --padding-end: 0.5rem;
}

.hint {
  margin: -0.55rem 0 0.85rem;
  font-size: 0.75rem;
  font-weight: 700;
}

.hint.fail { color: #b45309; }

.link-error {
  margin: 0 0 1rem;
  font-size: 0.88rem;
  font-weight: 700;
  color: #b45309;
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
