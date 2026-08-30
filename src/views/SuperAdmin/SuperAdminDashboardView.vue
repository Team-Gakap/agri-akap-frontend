<template>
  <ion-page>
    <AppHeader />

    <ion-content class="dash-bg ion-padding">
      <div class="shell">
        <div v-if="loading" class="center-state">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
        </div>

        <div v-else class="kpi-grid">
          <ion-card class="kpi" button @click="go('/superadmin/users')">
            <ion-card-content>
              <p class="kpi-value">{{ summary.total }}</p>
              <p class="kpi-label">Staff accounts</p>
            </ion-card-content>
          </ion-card>
          <ion-card class="kpi" button @click="go('/superadmin/security')">
            <ion-card-content>
              <p class="kpi-value">MFA</p>
              <p class="kpi-label">Security settings</p>
            </ion-card-content>
          </ion-card>
          <ion-card class="kpi">
            <ion-card-content>
              <p class="kpi-value">{{ summary.by_role.admin || 0 }}</p>
              <p class="kpi-label">MAO Admins</p>
            </ion-card-content>
          </ion-card>
          <ion-card class="kpi">
            <ion-card-content>
              <p class="kpi-value">{{ summary.by_role.technician || 0 }}</p>
              <p class="kpi-label">Technicians</p>
            </ion-card-content>
          </ion-card>
          <ion-card class="kpi">
            <ion-card-content>
              <p class="kpi-value">{{ summary.by_role.barangay_official || 0 }}</p>
              <p class="kpi-label">Barangay encoders</p>
            </ion-card-content>
          </ion-card>
          <ion-card class="kpi warn">
            <ion-card-content>
              <p class="kpi-value">{{ summary.locked }}</p>
              <p class="kpi-label">Locked</p>
            </ion-card-content>
          </ion-card>
          <ion-card class="kpi muted">
            <ion-card-content>
              <p class="kpi-value">{{ summary.deactivated }}</p>
              <p class="kpi-label">Deactivated</p>
            </ion-card-content>
          </ion-card>
        </div>

        <ion-card class="panel">
          <ion-card-header>
            <ion-card-title>Recent security events</ion-card-title>
            <ion-button fill="clear" size="small" @click="go('/superadmin/audit-logs')">View all</ion-button>
          </ion-card-header>
          <ion-card-content>
            <p v-if="!events.length" class="empty">No audit events yet.</p>
            <ul v-else class="events">
              <li v-for="ev in events" :key="ev.id">
                <span class="act">{{ ev.action }}</span>
                <span class="who">{{ ev.actor_email || 'system' }}</span>
                <span class="when">{{ formatWhen(ev.created_at) }}</span>
              </li>
            </ul>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import AppHeader from '@/components/Navigation/AppHeader.vue';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonButton, IonSpinner,
} from '@ionic/vue';
import apiClient from '@/utils/axios';

const router = useRouter();
const loading = ref(true);
const summary = reactive({
  total: 0,
  deactivated: 0,
  locked: 0,
  by_role: {} as Record<string, number>,
});
const events = ref<any[]>([]);

const go = (path: string) => router.push(path);

const formatWhen = (iso?: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString();
};

const load = async () => {
  loading.value = true;
  try {
    const [sumRes, logRes] = await Promise.all([
      apiClient.get('/staff/summary'),
      apiClient.get('/system/audit-logs', { params: { per_page: 10 } }),
    ]);
    Object.assign(summary, sumRes.data?.data ?? {});
    const page = logRes.data?.data;
    events.value = page?.data ?? [];
  } catch {
    events.value = [];
  } finally {
    loading.value = false;
  }
};

onMounted(() => { void load(); });
</script>

<style scoped>
.dash-bg { --background: #f4f8f5; }
.shell { max-width: 1100px; margin: 0 auto; }
.center-state { display: flex; justify-content: center; padding: 3rem; }
.kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1rem; }
.kpi { margin: 0; cursor: default; }
.kpi-value { font-size: 1.7rem; font-weight: 800; color: #1a4731; margin: 0; }
.kpi-label { margin: 0.2rem 0 0; color: #64748b; font-size: 0.85rem; }
.kpi.warn .kpi-value { color: #b45309; }
.kpi.muted .kpi-value { color: #64748b; }
.panel { margin: 0; }
.panel ion-card-header { display: flex; align-items: center; justify-content: space-between; }
.events { list-style: none; margin: 0; padding: 0; }
.events li { display: grid; grid-template-columns: 1.4fr 1.4fr 1fr; gap: 0.5rem; padding: 0.45rem 0; border-bottom: 1px solid #e2e8f0; font-size: 0.85rem; }
.act { font-weight: 700; color: #1a4731; font-family: ui-monospace, monospace; }
.who { color: #334155; }
.when { color: #64748b; text-align: right; }
.empty { color: #94a3b8; }
@media (max-width: 800px) {
  .kpi-grid { grid-template-columns: 1fr 1fr; }
  .events li { grid-template-columns: 1fr; }
}
</style>
