<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Security</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="rpt-content">
      <div class="rpt-shell">
        <header class="intro">
          <p class="eyebrow">SuperAdmin</p>
          <h1>Account security</h1>
          <p class="lede">Authenticator enrollment is required. SMS is an optional fallback after TOTP is confirmed.</p>
        </header>

        <div v-if="loading" class="center-state">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
        </div>

        <template v-else>
          <ion-card class="panel">
            <ion-card-header>
              <ion-card-title>Authenticator</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p class="status-line">
                Status:
                <strong>{{ status.enrolled ? 'Enrolled' : 'Not enrolled' }}</strong>
              </p>
              <p v-if="status.confirmed_at" class="muted">Confirmed {{ formatWhen(status.confirmed_at) }}</p>
              <p class="muted">Recovery codes remaining: {{ status.recovery_codes_remaining }}</p>
            </ion-card-content>
          </ion-card>

          <ion-card class="panel">
            <ion-card-header>
              <ion-card-title>SMS fallback number</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p class="muted">Current: {{ status.masked_mobile || 'Not set' }}</p>
              <p class="muted">SMS backup {{ status.sms_available ? 'is available' : 'is not available until a mobile number is saved and the gateway is configured.' }}</p>
              <ion-item class="field" lines="none">
                <ion-input
                  v-model="mobile"
                  label="Philippine mobile number"
                  label-placement="stacked"
                  placeholder="09XXXXXXXXX"
                ></ion-input>
              </ion-item>
              <ion-button class="save" :disabled="savingMobile" @click="saveMobile">
                {{ savingMobile ? 'Saving…' : 'Save mobile number' }}
              </ion-button>
            </ion-card-content>
          </ion-card>

          <ion-card class="panel">
            <ion-card-header>
              <ion-card-title>Regenerate recovery codes</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p class="warn">This replaces all unused codes. Enter your password and a current authenticator code.</p>
              <ion-item class="field" lines="none">
                <ion-input v-model="currentPassword" type="password" label="Current password" label-placement="stacked"></ion-input>
              </ion-item>
              <ion-item class="field" lines="none">
                <ion-input v-model="totp" inputmode="numeric" maxlength="6" label="Authenticator code" label-placement="stacked"></ion-input>
              </ion-item>
              <ion-button class="save" :disabled="savingCodes" @click="regenerate">
                {{ savingCodes ? 'Generating…' : 'Generate new codes' }}
              </ion-button>
              <div v-if="recoveryCodes.length" class="codes-wrap">
                <p class="warn">Save these now. They will not be shown again.</p>
                <ul class="codes">
                  <li v-for="code in recoveryCodes" :key="code">{{ code }}</li>
                </ul>
                <ion-button fill="outline" size="small" @click="copyCodes">Copy</ion-button>
              </div>
            </ion-card-content>
          </ion-card>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonButton, IonSpinner,
  IonItem, IonInput,
} from '@ionic/vue';
import apiClient from '@/utils/axios';
import { presentToast } from '@/utils/toast';

const loading = ref(true);
const savingMobile = ref(false);
const savingCodes = ref(false);
const mobile = ref('');
const currentPassword = ref('');
const totp = ref('');
const recoveryCodes = ref<string[]>([]);
const status = reactive({
  enrolled: false,
  confirmed_at: null as string | null,
  masked_mobile: null as string | null,
  has_mobile: false,
  sms_available: false,
  recovery_codes_remaining: 0,
});

const formatWhen = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '');

const load = async () => {
  loading.value = true;
  try {
    const res = await apiClient.get('/auth/mfa/status');
    Object.assign(status, res.data?.data ?? {});
  } catch {
    await presentToast('Could not load MFA status.', 'danger');
  } finally {
    loading.value = false;
  }
};

const saveMobile = async () => {
  if (!mobile.value.trim()) {
    await presentToast('Enter a Philippine mobile number.', 'warning');
    return;
  }
  savingMobile.value = true;
  try {
    const res = await apiClient.patch('/auth/mfa/mobile', { mobile_number: mobile.value.trim() });
    Object.assign(status, res.data?.data ?? {});
    mobile.value = '';
    await presentToast('Mobile number updated.', 'success');
  } catch (error: any) {
    await presentToast(error?.response?.data?.message || 'Could not save the mobile number.', 'danger');
  } finally {
    savingMobile.value = false;
  }
};

const regenerate = async () => {
  if (!currentPassword.value || totp.value.length !== 6) {
    await presentToast('Password and a 6-digit authenticator code are required.', 'warning');
    return;
  }
  savingCodes.value = true;
  try {
    const res = await apiClient.post('/auth/mfa/recovery-codes', {
      current_password: currentPassword.value,
      code: totp.value,
    });
    recoveryCodes.value = res.data?.data?.recovery_codes ?? [];
    currentPassword.value = '';
    totp.value = '';
    await load();
    await presentToast('New recovery codes generated.', 'success');
  } catch (error: any) {
    await presentToast(error?.response?.data?.message || 'Could not regenerate recovery codes.', 'danger');
  } finally {
    savingCodes.value = false;
  }
};

const copyCodes = async () => {
  try {
    await navigator.clipboard.writeText(recoveryCodes.value.join('\n'));
    await presentToast('Recovery codes copied.', 'success');
  } catch {
    await presentToast('Could not copy the codes.', 'warning');
  }
};

onMounted(() => { void load(); });
</script>

<style scoped>
.rpt-content { --background: #f4f8f5; }
.rpt-shell { max-width: 720px; margin: 0 auto; padding: 1rem; }
.intro { margin-bottom: 1rem; }
.eyebrow { margin: 0; font-size: 0.78rem; letter-spacing: 0.04em; text-transform: uppercase; color: #64748b; font-weight: 700; }
h1 { margin: 0.2rem 0; font-size: 1.5rem; color: #1a4731; }
.lede { margin: 0; color: #475569; }
.center-state { display: flex; justify-content: center; padding: 3rem; }
.panel { margin: 0 0 0.9rem; }
.status-line { margin: 0 0 0.35rem; color: #0f172a; }
.muted { margin: 0.2rem 0; color: #64748b; font-size: 0.9rem; }
.warn { color: #b45309; font-weight: 700; font-size: 0.88rem; }
.field { --background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 0.6rem 0; }
.save { --background: #1a4731; margin-top: 0.4rem; }
.codes {
  list-style: none;
  margin: 0.5rem 0;
  padding: 0.75rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
  columns: 2;
}
.codes-wrap { margin-top: 0.75rem; }
</style>
