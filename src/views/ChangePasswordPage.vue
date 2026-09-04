<template>
  <ion-page>
    <ion-content class="change-bg" :fullscreen="true">
      <div class="card">
        <button
          v-if="!forced"
          type="button"
          class="back"
          @click="goBack"
        >
          Back
        </button>
        <h1>{{ forced ? 'Change password' : 'Account password' }}</h1>
        <p class="sub">
          {{
            forced
              ? 'Your account requires a new password before you can continue.'
              : 'Choose a strong password that you have not used as a temporary credential.'
          }}
        </p>
        <form @submit.prevent="submit">
          <ion-item lines="none" class="field-item">
            <ion-input
              v-model="currentPassword"
              :type="showCurrent ? 'text' : 'password'"
              label="Current password"
              label-placement="stacked"
              autocomplete="current-password"
            ></ion-input>
            <ion-button
              fill="clear"
              slot="end"
              type="button"
              class="toggle-btn"
              :aria-label="showCurrent ? 'Hide password' : 'Show password'"
              @click="showCurrent = !showCurrent"
            >
              <ion-icon :icon="showCurrent ? eyeOff : eye"></ion-icon>
            </ion-button>
          </ion-item>

          <PasswordStrengthField v-model="password" label="New password" />

          <ion-item lines="none" class="field-item">
            <ion-input
              v-model="confirmation"
              :type="showNew ? 'text' : 'password'"
              label="Confirm new password"
              label-placement="stacked"
              autocomplete="new-password"
            ></ion-input>
            <ion-button
              fill="clear"
              slot="end"
              type="button"
              class="toggle-btn"
              :aria-label="showNew ? 'Hide password' : 'Show password'"
              @click="showNew = !showNew"
            >
              <ion-icon :icon="showNew ? eyeOff : eye"></ion-icon>
            </ion-button>
          </ion-item>
          <p v-if="confirmation && password !== confirmation" class="hint">Passwords do not match.</p>

          <ion-button expand="block" class="save" type="submit" :disabled="saving || !canSubmit">
            {{ saving ? 'Saving…' : 'Update password' }}
          </ion-button>
        </form>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonContent, IonItem, IonInput, IonButton, IonIcon } from '@ionic/vue';
import { eye, eyeOff } from 'ionicons/icons';
import PasswordStrengthField from '@/components/PasswordStrengthField.vue';
import { useAuthStore } from '@/stores/authStore';
import { homeForRole } from '@/router';
import { isPasswordStrong } from '@/utils/passwordPolicy';
import { toast } from '@/utils/toast';

const auth = useAuthStore();
const router = useRouter();
const currentPassword = ref('');
const password = ref('');
const confirmation = ref('');
const saving = ref(false);
const showCurrent = ref(false);
const showNew = ref(false);

const forced = computed(() => auth.mustChangePassword);
const canSubmit = computed(() =>
  currentPassword.value.length > 0
  && isPasswordStrong(password.value)
  && password.value === confirmation.value,
);

const goBack = () => {
  if (window.history.length > 1) {
    router.back();
    return;
  }
  router.replace(homeForRole(auth.userRole));
};

const submit = async () => {
  if (!canSubmit.value) {
    await toast.warning('Enter a strong password and confirm it before saving.');
    return;
  }
  saving.value = true;
  const result = await auth.changePassword({
    current_password: currentPassword.value,
    password: password.value,
    password_confirmation: confirmation.value,
  });
  saving.value = false;
  if (result.success) {
    await toast.success('Password updated.');
  } else {
    await toast.error(result.message);
  }
};
</script>

<style scoped>
.change-bg { --background: #f4f8f5; }

.card {
  width: min(420px, calc(100% - 2rem));
  margin: 2.5rem auto;
  background: #fff;
  padding: 1.35rem 1.2rem 1.5rem;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
}

.back {
  background: none;
  border: 0;
  padding: 0;
  margin: 0 0 0.65rem;
  color: #1a4731;
  font-size: 0.82rem;
  font-weight: 800;
  cursor: pointer;
}

h1 { margin: 0 0 0.35rem; color: #1a4731; font-size: 1.35rem; }
.sub { margin: 0 0 1rem; color: #64748b; font-size: 0.9rem; line-height: 1.45; }
.field-item {
  margin-bottom: 0.5rem;
  --background: #f8fafc;
  border-radius: 8px;
}
.toggle-btn { margin: 0; --color: #475569; }
.hint { margin: 0 0 0.65rem; color: #b45309; font-size: 0.75rem; font-weight: 700; }
.save { --background: #1a4731; margin-top: 0.75rem; }

@media (max-width: 640px) {
  .card {
    margin: 1.1rem auto calc(1.1rem + env(safe-area-inset-bottom, 0px));
    box-shadow: none;
    border: 1px solid #e2e8f0;
  }
}
</style>
