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
            <h2>{{ title }}</h2>
            <p class="auth-sub">{{ subtitle }}</p>
            <slot />
            <p class="auth-footer">© 2026 MAO Echague</p>
          </div>
        </section>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonPage } from '@ionic/vue';

defineProps<{
  title: string;
  subtitle: string;
}>();
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

.hero-value { display: none; }

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

.auth-footer {
  margin: 1.25rem 0 0;
  text-align: center;
  font-size: 0.72rem;
  font-weight: 600;
  color: #64748b;
  line-height: 1.4;
}

@media (min-width: 1024px) {
  .login-content { --background: #ffffff; }

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
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.86);
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
}
</style>
