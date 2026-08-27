<template>
  <ion-page>
    <ion-content class="change-bg">
      <div class="card">
        <h1>Change password</h1>
        <p class="sub">Your account requires a new password before you can continue.</p>
        <form @submit.prevent="submit">
          <ion-item lines="none" class="field-item">
            <ion-input
              v-model="currentPassword"
              :type="showCurrent ? 'text' : 'password'"
              label="Current password"
              label-placement="stacked"
              autocomplete="current-password"
            ></ion-input>
          </ion-item>
          <ion-item lines="none" class="field-item">
            <ion-input
              v-model="password"
              :type="showNew ? 'text' : 'password'"
              label="New password"
              label-placement="stacked"
              autocomplete="new-password"
            ></ion-input>
          </ion-item>
          <ion-item lines="none" class="field-item">
            <ion-input
              v-model="confirmation"
              :type="showNew ? 'text' : 'password'"
              label="Confirm new password"
              label-placement="stacked"
              autocomplete="new-password"
            ></ion-input>
          </ion-item>
          <ion-button expand="block" class="save" type="submit" :disabled="saving">
            {{ saving ? 'Saving…' : 'Update password' }}
          </ion-button>
        </form>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { IonPage, IonContent, IonItem, IonInput, IonButton } from '@ionic/vue';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/utils/toast';

const auth = useAuthStore();
const currentPassword = ref('');
const password = ref('');
const confirmation = ref('');
const saving = ref(false);
const showCurrent = ref(false);
const showNew = ref(false);

const submit = async () => {
  if (password.value.length < 8) {
    await toast.warning('New password must be at least 8 characters.');
    return;
  }
  if (password.value !== confirmation.value) {
    await toast.warning('New password confirmation does not match.');
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
  max-width: 420px; margin: 4rem auto; background: #fff; padding: 1.5rem;
  border-radius: 12px; box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
}
h1 { margin: 0 0 0.35rem; color: #1a4731; font-size: 1.4rem; }
.sub { margin: 0 0 1rem; color: #64748b; }
.field-item { margin-bottom: 0.5rem; --background: #f8fafc; border-radius: 8px; }
.save { --background: #1a4731; margin-top: 0.75rem; }
</style>
