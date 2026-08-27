<template>
  <div class="mfa-panel">
    <p class="mfa-kicker">Two-factor authentication</p>
    <h3>{{ heading }}</h3>
    <p class="mfa-sub">{{ subtitle }}</p>

    <div v-if="step === 'setup'" class="setup-block">
      <div v-if="qrLoading" class="center">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
      </div>
      <template v-else>
        <img v-if="qrDataUri" :src="qrDataUri" alt="Authenticator QR code" class="qr" />
        <p v-if="otpauthUri" class="manual-hint">
          Scan this code with Google Authenticator, Authy, or a similar app. Then enter the 6-digit code.
        </p>
      </template>
      <ion-item class="custom-input" lines="none">
        <ion-input
          v-model="totpCode"
          label="Authenticator code"
          label-placement="floating"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          @keyup.enter="submitSetup"
        ></ion-input>
      </ion-item>
      <ion-button expand="block" class="mfa-btn" :disabled="busy || totpCode.length !== 6" @click="submitSetup">
        {{ busy ? 'Verifying…' : 'Confirm and continue' }}
      </ion-button>
    </div>

    <div v-else-if="step === 'recovery'" class="recovery-block">
      <p class="warn">
        Save these recovery codes now. Each code works once. They will not be shown again.
      </p>
      <ul class="codes">
        <li v-for="code in recoveryCodes" :key="code">{{ code }}</li>
      </ul>
      <div class="row-actions">
        <ion-button fill="outline" size="small" @click="copyCodes">Copy</ion-button>
        <ion-button fill="outline" size="small" @click="downloadCodes">Download</ion-button>
      </div>
      <ion-button expand="block" class="mfa-btn" @click="finishRecovery">I have saved these codes</ion-button>
    </div>

    <div v-else-if="step === 'sms'" class="verify-block">
      <p class="manual-hint">
        We sent a 6-digit code to {{ challenge?.masked_mobile || 'your mobile number' }}.
      </p>
      <ion-item class="custom-input" lines="none">
        <ion-input
          v-model="smsCode"
          label="SMS code"
          label-placement="floating"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          @keyup.enter="submitSms"
        ></ion-input>
      </ion-item>
      <ion-button expand="block" class="mfa-btn" :disabled="busy || smsCode.length !== 6" @click="submitSms">
        {{ busy ? 'Verifying…' : 'Verify SMS code' }}
      </ion-button>
      <button type="button" class="text-link" :disabled="busy || smsCooldown > 0" @click="sendSms">
        {{ smsCooldown > 0 ? `Resend in ${smsCooldown}s` : 'Resend SMS code' }}
      </button>
      <button type="button" class="text-link" @click="step = 'verify'">Use authenticator instead</button>
    </div>

    <div v-else class="verify-block">
      <ion-item v-if="!useRecovery" class="custom-input" lines="none">
        <ion-input
          v-model="totpCode"
          label="Authenticator code"
          label-placement="floating"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="8"
          @keyup.enter="submitVerify"
        ></ion-input>
      </ion-item>
      <ion-item v-else class="custom-input" lines="none">
        <ion-input
          v-model="recoveryCode"
          label="Recovery code"
          label-placement="floating"
          autocomplete="off"
          @keyup.enter="submitVerify"
        ></ion-input>
      </ion-item>
      <ion-button expand="block" class="mfa-btn" :disabled="busy || !verifyReady" @click="submitVerify">
        {{ busy ? 'Verifying…' : 'Verify' }}
      </ion-button>
      <button type="button" class="text-link" @click="toggleRecovery">
        {{ useRecovery ? 'Use authenticator code' : 'Use a recovery code' }}
      </button>
      <button
        v-if="canUseSms"
        type="button"
        class="text-link"
        :disabled="busy"
        @click="startSms"
      >
        Use SMS code
      </button>
    </div>

    <button type="button" class="text-link back" @click="$emit('cancel')">Back to password</button>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { IonButton, IonInput, IonItem, IonSpinner } from '@ionic/vue';
import { useAuthStore, type MfaChallengePayload } from '@/stores/authStore';
import { presentToast } from '@/utils/toast';

defineProps<{
  challenge: MfaChallengePayload | null;
}>();

const emit = defineEmits<{
  completed: [];
  cancel: [];
}>();

const auth = useAuthStore();
const step = ref<'setup' | 'verify' | 'sms' | 'recovery'>('verify');
const totpCode = ref('');
const recoveryCode = ref('');
const smsCode = ref('');
const useRecovery = ref(false);
const busy = ref(false);
const qrLoading = ref(false);
const qrDataUri = ref('');
const otpauthUri = ref('');
const recoveryCodes = ref<string[]>([]);
const smsCooldown = ref(0);
let cooldownTimer: ReturnType<typeof setInterval> | null = null;

const canUseSms = computed(() => (auth.mfaChallenge?.mfa_methods ?? []).includes('sms'));

const heading = computed(() => {
  if (step.value === 'setup') return 'Set up your authenticator';
  if (step.value === 'recovery') return 'Save your recovery codes';
  if (step.value === 'sms') return 'Enter the SMS code';
  return 'Enter your verification code';
});

const subtitle = computed(() => {
  if (step.value === 'setup') return 'This SuperAdmin account requires an authenticator app before a session can start.';
  if (step.value === 'recovery') return 'Keep these codes offline. You will need one if you lose your authenticator.';
  if (step.value === 'sms') return 'SMS is a fallback after authenticator enrollment.';
  return 'Use the 6-digit code from your authenticator app.';
});

const verifyReady = computed(() => (
  useRecovery.value ? recoveryCode.value.trim().length >= 8 : totpCode.value.trim().length === 6
));

const loadQr = async () => {
  qrLoading.value = true;
  const result = await auth.fetchMfaSetupQr();
  qrLoading.value = false;
  if (!result.success) {
    await presentToast(result.message || 'Could not load the authenticator QR code.', 'danger');
    emit('cancel');
    return;
  }
  qrDataUri.value = result.qr_data_uri;
  otpauthUri.value = result.otpauth_uri;
};

onMounted(() => {
  if (auth.mfaChallenge?.mfa_setup_required) {
    step.value = 'setup';
    void loadQr();
  } else {
    step.value = 'verify';
  }
});

onBeforeUnmount(() => {
  if (cooldownTimer) clearInterval(cooldownTimer);
});

const startCooldown = (seconds = 60) => {
  smsCooldown.value = seconds;
  if (cooldownTimer) clearInterval(cooldownTimer);
  cooldownTimer = setInterval(() => {
    smsCooldown.value -= 1;
    if (smsCooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
    }
  }, 1000);
};

const submitSetup = async () => {
  if (busy.value || totpCode.value.length !== 6) return;
  busy.value = true;
  const result = await auth.confirmMfaSetup(totpCode.value);
  busy.value = false;
  if (!result.success) {
    await presentToast(result.message || 'Invalid authenticator code.', 'danger');
    return;
  }
  recoveryCodes.value = result.recovery_codes ?? [];
  totpCode.value = '';
  step.value = 'recovery';
};

const finishRecovery = () => {
  auth.finishMfaSession();
  emit('completed');
};

const submitVerify = async () => {
  if (busy.value || !verifyReady.value) return;
  busy.value = true;
  const result = await auth.verifyMfa(useRecovery.value ? recoveryCode.value : totpCode.value);
  busy.value = false;
  if (!result.success) {
    await presentToast(result.message || 'Invalid MFA code.', 'danger');
    return;
  }
  emit('completed');
};

const toggleRecovery = () => {
  useRecovery.value = !useRecovery.value;
  totpCode.value = '';
  recoveryCode.value = '';
};

const startSms = async () => {
  if (busy.value || smsCooldown.value > 0) return;
  busy.value = true;
  const result = await auth.sendMfaSms();
  busy.value = false;
  if (!result.success) {
    await presentToast(result.message || 'Could not send an SMS code.', 'danger');
    return;
  }
  startCooldown(result.resend_after_seconds ?? 60);
  step.value = 'sms';
  await presentToast('SMS code sent.', 'success');
};

const sendSms = async () => {
  if (busy.value || smsCooldown.value > 0) return;
  busy.value = true;
  const result = await auth.sendMfaSms();
  busy.value = false;
  if (!result.success) {
    await presentToast(result.message || 'Could not send an SMS code.', 'danger');
    return;
  }
  startCooldown(result.resend_after_seconds ?? 60);
  await presentToast('SMS code sent.', 'success');
};

const submitSms = async () => {
  if (busy.value || smsCode.value.length !== 6) return;
  busy.value = true;
  const result = await auth.verifyMfaSms(smsCode.value);
  busy.value = false;
  if (!result.success) {
    await presentToast(result.message || 'Invalid SMS code.', 'danger');
    return;
  }
  emit('completed');
};

const copyCodes = async () => {
  try {
    await navigator.clipboard.writeText(recoveryCodes.value.join('\n'));
    await presentToast('Recovery codes copied.', 'success');
  } catch {
    await presentToast('Could not copy. Download the file instead.', 'warning');
  }
};

const downloadCodes = () => {
  const blob = new Blob(
    [`AGRI-AKAP SuperAdmin recovery codes\n\n${recoveryCodes.value.join('\n')}\n`],
    { type: 'text/plain' },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'agri-akap-recovery-codes.txt';
  a.click();
  URL.revokeObjectURL(url);
};
</script>

<style scoped>
.mfa-panel { display: flex; flex-direction: column; gap: 0.35rem; }
.mfa-kicker {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #1a4731;
}
h3 { margin: 0; font-size: 1.2rem; font-weight: 800; color: #0f172a; }
.mfa-sub, .manual-hint { margin: 0 0 0.75rem; font-size: 0.88rem; font-weight: 600; color: #475569; line-height: 1.45; }
.center { display: flex; justify-content: center; padding: 1rem; }
.qr {
  width: 180px;
  height: 180px;
  display: block;
  margin: 0 auto 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
}
.custom-input {
  --background: #ffffff;
  --color: #0f172a;
  --highlight-color: transparent;
  min-height: 48px;
  margin-bottom: 0.85rem;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}
.mfa-btn {
  --background: #1a4731;
  --border-radius: 8px;
  height: 48px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.text-link {
  margin-top: 0.55rem;
  background: none;
  border: 0;
  color: #1a4731;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  text-align: left;
  padding: 0;
}
.text-link:disabled { color: #94a3b8; cursor: not-allowed; }
.text-link.back { margin-top: 1rem; color: #64748b; }
.warn { color: #b45309; font-weight: 700; font-size: 0.88rem; }
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
  gap: 0.4rem;
}
.codes li { padding: 0.15rem 0; }
.row-actions { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
</style>
