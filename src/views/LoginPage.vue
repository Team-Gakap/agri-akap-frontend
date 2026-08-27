<template>
  <ion-page>
    <ion-content :fullscreen="true" class="login-content">
      <div class="login-shell">
        <aside class="hero-pane" aria-label="MAO Echague branding">
          <div class="hero-pattern" aria-hidden="true">
            <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
              <g fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5">
                <path d="M40 320 C80 240 120 220 160 280 C200 340 260 300 300 220" />
                <path d="M80 360 C140 260 180 200 240 250 C280 290 320 240 360 160" />
              </g>
              <g fill="rgba(212,175,55,0.12)">
                <ellipse cx="70" cy="90" rx="18" ry="8" transform="rotate(-30 70 90)" />
                <ellipse cx="330" cy="70" rx="22" ry="9" transform="rotate(25 330 70)" />
                <ellipse cx="310" cy="330" rx="26" ry="10" transform="rotate(-20 310 330)" />
              </g>
            </svg>
          </div>

          <div class="hero-inner">
            <div class="logo-ring">
              <img src="@/assets/images/echague-logo.png" alt="Municipal Agriculture Office Echague" />
            </div>
            <h1>AGRI-AKAP</h1>
            <p class="hero-office">Municipal Agriculture Office</p>
            <p class="hero-place">Echague, Isabela</p>
            <p class="hero-value">
              Empowering MAO operations with secure digital governance and field intelligence
            </p>
          </div>
        </aside>

        <section class="auth-pane">
          <div class="auth-inner">
            <h2>{{ authStore.mfaChallenge ? 'Verify identity' : 'Welcome Back' }}</h2>
            <p class="auth-sub">
              {{
                authStore.mfaChallenge
                  ? 'Complete two-factor authentication to continue'
                  : (isNative ? 'Enter your credentials to continue' : 'Sign in with your official account')
              }}
            </p>

            <MfaChallengePanel
              v-if="authStore.mfaChallenge"
              :challenge="authStore.mfaChallenge"
              @completed="onMfaCompleted"
              @cancel="cancelMfa"
            />

            <form v-else class="auth-form" @submit.prevent="login">
              <ion-item class="custom-input" lines="none">
                <ion-icon :icon="person" slot="start" class="input-icon"></ion-icon>
                <ion-input
                  v-model="credentials.email"
                  label="Email Address"
                  autocomplete="username"
                  label-placement="floating"
                  type="email"
                  placeholder="admin@echague.gov.ph"
                ></ion-input>
              </ion-item>

              <ion-item class="custom-input" lines="none">
                <ion-icon :icon="lockClosed" slot="start" class="input-icon"></ion-icon>
                <ion-input
                  v-model="credentials.password"
                  :type="showPassword ? 'text' : 'password'"
                  label="Password"
                  label-placement="floating"
                  placeholder="Enter your password"
                  autocomplete="current-password"
                  @keyup.enter="login"
                ></ion-input>
                <ion-button
                  fill="clear"
                  slot="end"
                  class="toggle-password-btn"
                  type="button"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  @click="togglePassword"
                >
                  <ion-icon :icon="showPassword ? eyeOff : eye"></ion-icon>
                </ion-button>
              </ion-item>

              <div class="forgot-password">
                <a href="#" @click.prevent>Forgot Password?</a>
              </div>

              <TurnstileWidget
                v-if="showCaptcha"
                ref="captcha"
                v-model="turnstileToken"
                action="login"
                size="flexible"
                class="turnstile-slot"
              />

              <ion-button
                type="button"
                expand="block"
                class="login-button"
                :disabled="isSubmitting || (showCaptcha && !turnstileToken)"
                @click="login"
              >
                <ion-spinner v-if="isSubmitting" name="crescent"></ion-spinner>
                <span v-else>Log In</span>
                <ion-icon v-if="!isSubmitting" slot="end" :icon="arrowForward"></ion-icon>
              </ion-button>
            </form>

            <p class="auth-footer">© 2026 MAO Echague</p>
          </div>

          <p class="mobile-status" role="status">
            <span class="status-dot" :class="{ on: isOnline }"></span>
            {{ isOnline ? 'System Online · Central Database Active' : 'Offline · Local device ready' }}
          </p>
        </section>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { Capacitor } from "@capacitor/core";
import {
  IonContent,
  IonPage,
  IonIcon,
  IonButton,
  IonItem,
  IonInput,
  IonSpinner,
  onIonViewDidEnter,
} from "@ionic/vue";
import { person, lockClosed, eye, eyeOff, arrowForward } from "ionicons/icons";
import { useAuthStore } from "@/stores/authStore";
import { useSyncStore } from "@/stores/syncStore";
import { presentToast } from "@/utils/toast";
import TurnstileWidget from "@/components/TurnstileWidget.vue";
import MfaChallengePanel from "@/components/MfaChallengePanel.vue";

const authStore = useAuthStore();
const syncStore = useSyncStore();

const isNative = Capacitor.isNativePlatform();
const showCaptcha = !isNative;
const isOnline = computed(() => syncStore.online);

const isSubmitting = ref(false);
const showPassword = ref(false);
const turnstileToken = ref("");
const captcha = ref<{ reset: () => Promise<void> } | null>(null);
let didEnterOnce = false;

const credentials = reactive({
  email: "",
  password: "",
});

const togglePassword = () => {
  showPassword.value = !showPassword.value;
};

onIonViewDidEnter(() => {
  authStore.restoreMfaChallenge();
  if (didEnterOnce && showCaptcha && !authStore.mfaChallenge) {
    void captcha.value?.reset();
  }
  didEnterOnce = true;
});

const login = async () => {
  if (isSubmitting.value) return;

  if (!credentials.email || !credentials.password) {
    await presentToast("Email and password are required.", "warning");
    return;
  }

  if (showCaptcha && !turnstileToken.value) {
    await presentToast("Please complete the captcha.", "warning");
    return;
  }

  isSubmitting.value = true;

  const result = await authStore.login({
    email: credentials.email,
    password: credentials.password,
    device_name: isNative
      ? `Capacitor ${Capacitor.getPlatform()}`
      : (navigator.userAgent || "Web Dashboard"),
    turnstile_token: showCaptcha ? turnstileToken.value : undefined,
  });

  if (result.success) {
    if (result.mfa_required) {
      credentials.password = "";
      turnstileToken.value = "";
    } else {
      credentials.email = "";
      credentials.password = "";
      turnstileToken.value = "";
    }
  } else {
    if (showCaptcha) await captcha.value?.reset();
    await presentToast(result.message || "Invalid email or password.", "danger");
  }

  isSubmitting.value = false;
};

const cancelMfa = () => {
  authStore.clearMfaChallenge();
};

const onMfaCompleted = () => {
  credentials.email = "";
  credentials.password = "";
  turnstileToken.value = "";
};
</script>

<style scoped>
.login-content {
  --background: linear-gradient(180deg, #dceee3 0%, #c5ddcc 42%, #e8f0ea 100%);
  --padding-top: 0;
  --padding-bottom: 0;
  --padding-start: 0;
  --padding-end: 0;
}

.login-shell {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.hero-pane {
  position: relative;
  overflow: hidden;
  background: linear-gradient(165deg, #14532d 0%, #1a4731 55%, #0f2d1f 100%);
  color: #fff;
  text-align: center;
  padding: calc(1.1rem + env(safe-area-inset-top, 0px)) 1.25rem 1.6rem;
}

.hero-pattern {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.9;
}

.hero-pattern svg {
  width: 100%;
  height: 100%;
}

.hero-inner { position: relative; z-index: 1; }

.logo-ring {
  width: 86px;
  height: 86px;
  margin: 0 auto 0.7rem;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  background: #fff;
}

.logo-ring img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.hero-pane h1 {
  margin: 0;
  font-size: 1.7rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #fff;
}

.hero-office {
  margin: 0.2rem 0 0;
  font-size: 0.92rem;
  font-weight: 700;
  color: #d4af37;
}

.hero-place {
  margin: 0.1rem 0 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.82);
}

.hero-value,
.hero-bullets {
  display: none;
}

.auth-pane {
  flex: 1;
  background: #ffffff;
  border-radius: 24px 24px 0 0;
  margin-top: -14px;
  padding: 1.35rem 1.15rem calc(1.1rem + env(safe-area-inset-bottom, 0px));
  box-shadow: 0 -8px 28px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
}

.auth-inner {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  flex: 1;
}

.auth-inner h2 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 800;
  color: #0f172a;
}

.auth-sub {
  margin: 0.25rem 0 1.25rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: #475569;
}

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

.forgot-password {
  text-align: right;
  margin: -0.15rem 0 1rem;
}

.forgot-password a {
  color: #475569;
  font-size: 0.85rem;
  font-weight: 700;
  text-decoration: none;
}

.forgot-password a:hover {
  color: #1a4731;
  text-decoration: underline;
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
  --ripple-color: rgba(255, 255, 255, 0.18);
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

.auth-footer {
  margin: 1.25rem 0 0;
  text-align: center;
  font-size: 0.72rem;
  font-weight: 600;
  color: #64748b;
  line-height: 1.4;
}

.mobile-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin: 1rem 0 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: #334155;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #94a3b8;
}

.status-dot.on { background: #16a34a; }

@media (min-width: 1024px) {
  .login-content {
    --background: #ffffff;
  }

  .login-shell {
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-height: 100%;
    height: 100%;
  }

  .login-content::part(scroll) {
    display: flex;
    flex-direction: column;
    min-height: 100%;
  }

  .hero-pane {
    margin: 0;
    padding: 2.5rem 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: left;
    background: #1a4731;
  }

  .hero-inner { max-width: 440px; }

  .logo-ring {
    margin: 0 0 1.1rem;
    width: 108px;
    height: 108px;
  }

  .hero-pane h1 { font-size: 2.4rem; }

  .hero-office { font-size: 1.05rem; }

  .hero-place { font-size: 0.95rem; margin-bottom: 1rem; }

  .hero-value {
    display: block;
    margin: 0 0 1.4rem;
    font-size: 0.95rem;
    font-weight: 600;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.86);
  }

  .hero-bullets {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .hero-bullets li {
    position: relative;
    padding-left: 1.15rem;
    font-size: 0.92rem;
    font-weight: 700;
    color: #f8fafc;
  }

  .hero-bullets li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.45rem;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #d4af37;
  }

  .auth-pane {
    margin: 0;
    border-radius: 0;
    box-shadow: none;
    align-items: center;
    justify-content: center;
    padding: 2.5rem 3rem;
  }

  .auth-inner {
    flex: 0 1 420px;
    margin: 0;
  }

  .mobile-status { display: none; }
}
</style>
