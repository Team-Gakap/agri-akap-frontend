<template>
  <ion-page>
    <ion-content :fullscreen="true" class="ion-padding auth-bg">
      
      <div class="brand-header">
        <div class="logo-container">
           <img src="@/assets/images/echague-logo.png" alt="Municipal Agriculture Office Echague Logo" />
        </div>
        <h1 class="brand-title">AGRI-AKAP</h1>
        <p class="brand-subtitle">Agricultural Assistance and Knowledge Access Portal for Managing Farmers' Subsidies and Support Programs</p>
      </div>

      <div class="login-card">
        <h2 class="form-title">Welcome Back</h2>
        
        <div class="input-group">
          <ion-item class="custom-input" lines="none">
            <ion-icon :icon="person" slot="start" class="input-icon"></ion-icon>
            <ion-input 
              v-model="credentials.email" 
              label="Email Address"
              autocomplete="off"
              label-placement="floating"
              type="email"
              placeholder="Enter your email">
            </ion-input>
          </ion-item>

          <ion-item class="custom-input" lines="none">
            <ion-icon :icon="lockClosed" slot="start" class="input-icon"></ion-icon>
            <ion-input
              v-model="credentials.password"
              :type="showPassword ? 'text' : 'password'"
              label="Password"
              label-placement="floating"
              placeholder="Enter your password"
              autocomplete="new-password">
            </ion-input>
            <ion-button fill="clear" slot="end" class="toggle-password-btn" @click="togglePassword">
            </ion-button>
          </ion-item>
        </div>
        
        <div class="forgot-password">
          <a href="#">Forgot Password?</a>
        </div>
        
        <ion-button 
          expand="block" 
          shape="round" 
          class="login-button" 
          @click="login" 
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? 'Logging In...' : 'Log In' }}
        </ion-button>     
      </div>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import {
  IonContent,
  IonPage,
  IonIcon,
  IonButton,
  IonItem,
  IonInput,
  toastController,
} from "@ionic/vue";
import { person, lockClosed, eye, eyeOff } from "ionicons/icons";
import { useAuthStore } from "@/stores/authStore";

const authStore = useAuthStore();

const isSubmitting = ref(false);
const showPassword = ref(false);

const credentials = reactive({
  email: "",
  password: "",
});

const togglePassword = () => {
  showPassword.value = !showPassword.value;
};

const showToast = async (message: string, color = "danger") => {
  const toast = await toastController.create({ message, duration: 2500, color, position: "top" });
  await toast.present();
};

const login = async () => {
  if (!credentials.email || !credentials.password) {
    await showToast("Email and password are required.");
    return;
  }

  isSubmitting.value = true;

  // Delegate to the auth store: it persists token/user, updates Pinia state
  // (so the axios interceptor attaches the token immediately), and handles
  // role-based redirects.
  const result = await authStore.login({
    email: credentials.email,
    password: credentials.password,
    device_name: navigator.userAgent || "Web Dashboard",
  });

  if (result.success) {
    credentials.email = "";
    credentials.password = "";
  } else {
    await showToast(result.message || "Invalid email or password.");
  }

  isSubmitting.value = false;
};
</script>

<style scoped>
.auth-bg {
  --background: radial-gradient(circle at 50% 0%, #e8f5e9 0%, #c8e6c9 60%, #a5d6a7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.brand-header {
  text-align: center;
  margin-top: 8vh;
  margin-bottom: 2rem;
}

.logo-container {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 100px;
  background: transparent; /* Fixed: Removed background gradient so logo shows fully */
  border-radius: 50%;
  box-shadow: 0 10px 20px rgba(45, 136, 77, 0.4);
  margin-bottom: 1rem;
  border: 4px solid rgba(255, 255, 255, 0.8);
  overflow: hidden; /* Fixed: Prevents the image edges from spilling out */
}

.logo-container img {
  width: 100%; /* Fixed: Stretches image to container bounds */
  height: 100%; /* Fixed: Stretches image to container bounds */
  object-fit: cover; /* Fixed: Fills the entire circle perfectly */
  display: block;
  border-radius: 50%;
}

.logo-icon {
  font-size: 44px;
  color: #ffffff;
}

.brand-title {
  font-size: 2rem;
  font-weight: 800;
  color: #1b5e20;
  margin: 0 0 0.25rem 0;
  letter-spacing: -0.5px;
}

.brand-subtitle {
  font-size: 1rem;
  color: #388e3c;
  font-weight: 500;
  margin: 0;
  opacity: 0.9;
}

.login-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 28px;
  padding: 2.5rem 1.5rem;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
  margin: 0 auto;
  max-width: 420px;
  width: 100%;
  animation: fadeInUp 0.8s ease-out;
  border: 1px solid rgba(255, 255, 255, 0.6);
}

.form-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2c3e50;
  text-align: center;
  margin-bottom: 2rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.custom-input {
  --background: #f4f8f5;
  --color: #1a1a1a; 
  --placeholder-color: #6a7c6f; 
  --border-radius: 16px;
  --padding-start: 1rem;
  --inner-padding-end: 0.5rem;
  border: 2px solid transparent;
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
}

.custom-input:focus-within {
  border-color: #1a4731;
  --background: #ffffff;
  box-shadow: 0 4px 12px rgba(26, 71, 49, 0.15);
  transform: translateY(-2px);
}

.input-icon {
  color: #1a4731;
  font-size: 1.25rem;
  margin-right: 0.75rem;
  transition: color 0.3s ease;
}

.custom-input:focus-within .input-icon {
  color: #2a6648;
}

.toggle-password-btn {
  margin: 0;
  --padding-start: 0.5rem;
  --padding-end: 0.5rem;
}

/* Forgot Password */
.forgot-password {
  text-align: right;
  margin-top: 0.75rem;
  margin-bottom: 2rem;
}

.forgot-password a {
  color: #1a4731;
  font-size: 0.9rem;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s;
}

.forgot-password a:hover {
  color: #2a6648;
  text-decoration: underline;
}

/* Main Button — LGU Forest Green */
.login-button {
  --background: #1a4731;
  --background-hover: #2a6648;
  --background-activated: #173e2b;
  --border-radius: 16px;
  --box-shadow: 0 8px 20px rgba(26, 71, 49, 0.35);
  --ripple-color: rgba(212, 175, 55, 0.35);
  margin: 0;
  height: 56px;
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: 0.5px;
  transition: transform 0.2s ease, opacity 0.15s ease;
}

.login-button:active {
  transform: scale(0.98);
  opacity: 0.9;
}


</style>