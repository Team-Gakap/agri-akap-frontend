<template>
  <ion-page>
    <ion-content :fullscreen="true" class="public-dash">
      <div class="public-shell">
        <header class="public-hero">
          <div class="hero-bg" aria-hidden="true"></div>
          <div class="hero-inner">
            <img src="@/assets/images/echague-logo.png" alt="MAO Echague" class="hero-logo" />
            <p class="hero-brand">AGRI-AKAP</p>
            <h1>Municipal Agriculture Snapshot</h1>
            <p class="hero-sub">{{ data.office || 'Municipal Agriculture Office' }} · {{ data.municipality || 'Echague, Isabela' }}</p>
            <div class="hero-actions">
              <ion-button v-if="isAuthenticated" class="cta-primary" @click="goHome">Open full system</ion-button>
              <ion-button v-else class="cta-primary" router-link="/login">Sign in for full access</ion-button>
              <ion-button v-if="!isAuthenticated" fill="outline" class="cta-ghost" router-link="/login">Staff login</ion-button>
            </div>
          </div>
        </header>

        <section class="kpi-section" aria-label="Public summary indicators">
          <p v-if="loading" class="status-msg">Loading municipal summary…</p>
          <p v-else-if="error" class="status-msg error">{{ error }}</p>

          <div v-else class="kpi-grid">
            <article class="kpi">
              <p class="kpi-value">{{ fmt(data.total_farmers) }}</p>
              <p class="kpi-label">Registered Farmers</p>
              <p class="kpi-meta">{{ fmt(data.farmers_male) }} male · {{ fmt(data.farmers_female) }} female</p>
            </article>

            <article class="kpi">
              <p class="kpi-value">{{ fmt(data.pwd_total) }}</p>
              <p class="kpi-label">Persons with Disabilities</p>
              <p class="kpi-meta">{{ fmt(data.pwd_male) }} male · {{ fmt(data.pwd_female) }} female</p>
            </article>

            <article class="kpi">
              <p class="kpi-value">{{ fmtPct(data.subsidy_uptake_percent) }}%</p>
              <p class="kpi-label">Subsidy Uptake</p>
              <p class="kpi-meta">
                {{ fmt(data.subsidy_beneficiaries_claimed) }} claimed of
                {{ fmt(data.subsidy_beneficiaries_enrolled) }} enrolled
              </p>
            </article>

            <article class="kpi kpi-peak">
              <p class="kpi-value peak-day">{{ peakWeekdayLabel }}</p>
              <p class="kpi-label">Peak Disbursement Day</p>
              <p class="kpi-meta">
                <template v-if="peak.count">
                  {{ fmt(peak.count) }} claims on peak weekday · last {{ peak.window }} days
                </template>
                <template v-else>No claims in the last {{ peak.window }} days</template>
              </p>
            </article>
          </div>

          <div v-if="!loading && !error && weekdayBars.length" class="weekday-panel">
            <h2>Disbursement by weekday</h2>
            <p class="panel-sub">Claims recorded in the last {{ peak.window }} days</p>
            <ul class="weekday-bars">
              <li v-for="row in weekdayBars" :key="row.day">
                <span class="day-name">{{ row.short }}</span>
                <div class="bar-track">
                  <div
                    class="bar-fill"
                    :class="{ peak: row.day === peak.weekday }"
                    :style="{ width: row.pct + '%' }"
                  ></div>
                </div>
                <span class="day-count">{{ row.count }}</span>
              </li>
            </ul>
          </div>
        </section>

        <footer class="public-footer">
          <p>Aggregated public indicators only. Sign in to access farmer records, reports, and field tools.</p>
        </footer>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent, IonButton } from '@ionic/vue';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/utils/axios';
import { useAuthStore } from '@/stores/authStore';
import { homeForRole } from '@/router';

const router = useRouter();
const auth = useAuthStore();

const loading = ref(true);
const error = ref('');
const data = reactive({
  total_farmers: 0,
  farmers_male: 0,
  farmers_female: 0,
  pwd_male: 0,
  pwd_female: 0,
  pwd_total: 0,
  subsidy_uptake_percent: 0,
  subsidy_beneficiaries_claimed: 0,
  subsidy_beneficiaries_enrolled: 0,
  peak_disbursement: null as any,
  municipality: '',
  office: '',
});

const isAuthenticated = computed(() => auth.isAuthenticated && homeForRole(auth.userRole) !== '/login');

const peak = computed(() => {
  const p = data.peak_disbursement || {};
  return {
    weekday: p.peak_weekday || null,
    count: Number(p.peak_weekday_count || 0),
    window: Number(p.window_days || 90),
    byWeekday: Array.isArray(p.by_weekday) ? p.by_weekday : [],
  };
});

const peakWeekdayLabel = computed(() => peak.value.weekday || '—');

const weekdayBars = computed(() => {
  const rows = peak.value.byWeekday;
  const max = Math.max(1, ...rows.map((r: any) => Number(r.count || 0)));
  return rows.map((r: any) => ({
    day: r.day,
    short: String(r.day || '').slice(0, 3),
    count: Number(r.count || 0),
    pct: Math.round((Number(r.count || 0) / max) * 100),
  }));
});

const fmt = (n: unknown) => Number(n || 0).toLocaleString('en-PH');
const fmtPct = (n: unknown) => Number(n || 0).toFixed(Number(n || 0) % 1 ? 1 : 0);

const goHome = () => router.push(homeForRole(auth.userRole));

onMounted(async () => {
  loading.value = true;
  error.value = '';
  try {
    const res = await apiClient.get('/public/dashboard-summary');
    Object.assign(data, res.data?.data || {});
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Could not load public dashboard summary.';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.public-dash {
  --background: #f3f6f2;
}

.public-shell {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.public-hero {
  position: relative;
  color: #fff;
  padding: 2.5rem 1.25rem 2rem;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(135deg, rgba(26, 71, 49, 0.92), rgba(15, 46, 32, 0.88)),
    url('@/assets/images/echague-logo.png') center / 40% no-repeat;
  filter: saturate(1.05);
}

.hero-inner {
  position: relative;
  z-index: 1;
  max-width: 720px;
  margin: 0 auto;
  text-align: center;
}

.hero-logo {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #fff;
  object-fit: contain;
  margin-bottom: 0.75rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.hero-brand {
  margin: 0;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-weight: 800;
  letter-spacing: 0.18em;
  font-size: 0.85rem;
  color: #d4af37;
}

.public-hero h1 {
  margin: 0.4rem 0 0.35rem;
  font-size: clamp(1.55rem, 4vw, 2.1rem);
  font-weight: 700;
  line-height: 1.2;
}

.hero-sub {
  margin: 0 0 1.25rem;
  opacity: 0.9;
  font-size: 0.95rem;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  justify-content: center;
}

.cta-primary {
  --background: #d4af37;
  --color: #1a4731;
  --border-radius: 10px;
  font-weight: 700;
}

.cta-ghost {
  --border-color: rgba(255, 255, 255, 0.55);
  --color: #fff;
  --border-radius: 10px;
}

.kpi-section {
  flex: 1;
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 2rem;
}

.status-msg {
  text-align: center;
  color: #475569;
  padding: 2rem 0;
}

.status-msg.error {
  color: #b91c1c;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
}

@media (min-width: 768px) {
  .kpi-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.kpi {
  background: #fff;
  border: 1px solid #dce5dd;
  border-radius: 14px;
  padding: 1rem 1.05rem;
  box-shadow: 0 1px 2px rgba(26, 71, 49, 0.04);
}

.kpi-value {
  margin: 0;
  font-size: 1.65rem;
  font-weight: 800;
  color: #1a4731;
  line-height: 1.1;
}

.kpi-value.peak-day {
  font-size: 1.25rem;
}

.kpi-label {
  margin: 0.35rem 0 0;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #64748b;
}

.kpi-meta {
  margin: 0.35rem 0 0;
  font-size: 0.82rem;
  color: #475569;
  line-height: 1.35;
}

.weekday-panel {
  margin-top: 1.5rem;
  background: #fff;
  border: 1px solid #dce5dd;
  border-radius: 14px;
  padding: 1.1rem 1.2rem 1.25rem;
}

.weekday-panel h2 {
  margin: 0;
  font-size: 1.05rem;
  color: #1a4731;
}

.panel-sub {
  margin: 0.2rem 0 1rem;
  color: #64748b;
  font-size: 0.85rem;
}

.weekday-bars {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.weekday-bars li {
  display: grid;
  grid-template-columns: 2.4rem 1fr 2.2rem;
  gap: 0.55rem;
  align-items: center;
}

.day-name {
  font-size: 0.78rem;
  font-weight: 700;
  color: #475569;
}

.bar-track {
  height: 10px;
  background: #e8efe9;
  border-radius: 999px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: #2f6b4f;
  border-radius: 999px;
  min-width: 0;
  transition: width 0.35s ease;
}

.bar-fill.peak {
  background: #d4af37;
}

.day-count {
  text-align: right;
  font-size: 0.8rem;
  font-weight: 700;
  color: #1a4731;
}

.public-footer {
  text-align: center;
  padding: 0 1.25rem 2rem;
  color: #64748b;
  font-size: 0.82rem;
}
</style>
