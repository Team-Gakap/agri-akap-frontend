<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Agricultural Intelligence</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" @click="fetchAll" :disabled="isLoading">
            <ion-icon slot="icon-only" :icon="refreshOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="auth-bg ion-padding">
      <div class="dashboard-wrapper">
        <div class="header-section mb-4">
          <h2>Soil Monitoring</h2>
          <p class="text-muted">Live pest alerts and monoculture rotation risks across the municipality.</p>
        </div>

        <!-- Summary chips -->
        <div class="summary-row mb-4" v-if="pestSummary">
          <div class="summ-chip active"><span class="summ-n">{{ pestSummary.active }}</span><span class="summ-l">Active Pests</span></div>
          <div class="summ-chip contained"><span class="summ-n">{{ pestSummary.contained }}</span><span class="summ-l">Contained</span></div>
          <div class="summ-chip resolved"><span class="summ-n">{{ pestSummary.resolved }}</span><span class="summ-l">Resolved</span></div>
          <div class="summ-chip mono"><span class="summ-n">{{ monocultureAlerts.length }}</span><span class="summ-l">Mono Alerts</span></div>
        </div>

        <ion-grid>
          <ion-row>
            <!-- Active Pest Outbreaks -->
            <ion-col size="12" size-md="8">
              <ion-card class="intel-card border-danger">
                <ion-card-header>
                  <ion-card-title class="card-title-danger">
                    <ion-icon :icon="bugOutline"></ion-icon> Active Pest Outbreaks
                  </ion-card-title>
                </ion-card-header>
                <ion-card-content class="ion-no-padding">
                  <ion-list lines="full">
                    <div v-if="isLoading" class="center-msg"><ion-spinner></ion-spinner></div>
                    <div v-else-if="!pests.length" class="center-msg text-muted">No active pest threats reported.</div>

                    <ion-item v-for="pest in pests" :key="pest.id">
                      <ion-label>
                        <div class="pest-title-row">
                          <h2 class="pest-name">{{ pest.pest_name }}</h2>
                          <ion-badge v-if="isThreatVector(pest)" color="danger" class="vector-badge">THREAT VECTOR</ion-badge>
                        </div>
                        <p class="pest-sub">
                          {{ pest.farm_plot?.location_brgy }} · {{ pest.farm_plot?.commodity }}
                        </p>
                        <p class="pest-sub">
                          Farmer: {{ pest.farm_plot?.farmer?.surname ?? '—' }}
                          · Spotted: {{ formatDate(pest.date_spotted) }}
                          · By: {{ pest.technician?.name ?? '—' }}
                        </p>
                        <p v-if="pest.notes" class="pest-notes">{{ pest.notes }}</p>
                        <p v-if="pest.recommended_intervention" class="pest-intervention">
                          <ion-icon :icon="medkitOutline"></ion-icon>
                          {{ pest.recommended_intervention }}
                        </p>
                        <ion-button
                          v-if="isThreatVector(pest) && pest.advisory"
                          size="small"
                          color="danger"
                          class="advisory-btn"
                          @click="advisoryPrompt(pest)"
                        >
                          <ion-icon slot="start" :icon="megaphoneOutline"></ion-icon>
                          Send Community Advisory ({{ pest.advisory.recipient_count }})
                        </ion-button>
                      </ion-label>
                      <div slot="end" class="pest-end">
                        <ion-badge :color="severityColor(pest.severity)" class="severity-badge">
                          {{ pest.severity }}
                        </ion-badge>
                        <ion-button
                          fill="clear"
                          size="small"
                          color="medium"
                          @click="resolvePrompt(pest)"
                        >
                          Update
                        </ion-button>
                      </div>
                    </ion-item>
                  </ion-list>
                </ion-card-content>
              </ion-card>
            </ion-col>

            <!-- Monoculture Rotation Alerts -->
            <ion-col size="12" size-md="4">
              <ion-card class="intel-card border-warning">
                <ion-card-header>
                  <ion-card-title class="card-title-warning">
                    <ion-icon :icon="warningOutline"></ion-icon> Crop Rotation Alerts
                  </ion-card-title>
                </ion-card-header>
                <ion-card-content class="ion-no-padding">
                  <div v-if="isLoading" class="center-msg"><ion-spinner></ion-spinner></div>
                  <div v-else-if="!monocultureAlerts.length" class="center-msg text-muted">No monoculture risks detected.</div>
                  <div
                    v-for="alert in monocultureAlerts"
                    :key="alert.farm_plot_id"
                    class="alert-box"
                  >
                    <strong>{{ alert.farmer?.surname ?? 'Unknown' }}</strong>
                    <p class="alert-sub">{{ alert.location_brgy }} · {{ alert.commodity }}</p>
                    <p class="alert-sub">{{ alert.size_ha }} ha · Crop: <strong>{{ alert.repeated_crop }}</strong></p>
                    <p class="alert-warning">{{ alert.consecutive_seasons }}× consecutive — Soil depletion risk</p>
                  </div>
                </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
      </div>
    </ion-content>

    <!-- Pest Status Update Alert -->
    <ion-alert
      :is-open="showResolveAlert"
      header="Update Pest Status"
      :message="`Pest: ${selectedPest?.pest_name}`"
      :buttons="[
        { text: 'Cancel', role: 'cancel', handler: () => { showResolveAlert = false; } },
        { text: 'Mark Contained', handler: () => updatePestStatus('Contained') },
        { text: 'Mark Resolved', cssClass: 'alert-btn-success', handler: () => updatePestStatus('Resolved') },
      ]"
      @didDismiss="showResolveAlert = false"
    ></ion-alert>

    <!-- Community Advisory Confirm Alert -->
    <ion-alert
      :is-open="showAdvisoryAlert"
      header="Send Community Advisory"
      :message="advisoryMessage"
      :buttons="[
        { text: 'Cancel', role: 'cancel', handler: () => { showAdvisoryAlert = false; } },
        { text: 'Send SMS', cssClass: 'alert-btn-success', handler: () => confirmAdvisory() },
      ]"
      @didDismiss="showAdvisoryAlert = false"
    ></ion-alert>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton, IonButton,
  IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonBadge, IonIcon, IonSpinner, IonAlert,
  toastController,
} from '@ionic/vue';
import { bugOutline, warningOutline, refreshOutline, medkitOutline, megaphoneOutline } from 'ionicons/icons';
import axiosInstance from '@/utils/axios';

const pests = ref<any[]>([]);
const monocultureAlerts = ref<any[]>([]);
const pestSummary = ref<any>(null);
const isLoading = ref(true);
const showResolveAlert = ref(false);
const selectedPest = ref<any>(null);

const showAdvisoryAlert = ref(false);
const advisoryMessage = ref('');
const advisoryPest = ref<any>(null);

const isThreatVector = (pest: any): boolean => pest.severity === 'High' || pest.severity === 'Critical';

const fetchAll = async () => {
  isLoading.value = true;
  try {
    const [dashRes, monoRes] = await Promise.all([
      axiosInstance.get('/intelligence/dashboard'),
      axiosInstance.get('/intelligence/monoculture-alerts'),
    ]);
    pests.value = dashRes.data.data.active_pests ?? [];
    pestSummary.value = dashRes.data.data.pest_summary ?? null;
    monocultureAlerts.value = monoRes.data.data ?? [];
  } catch {
    // silent
  } finally {
    isLoading.value = false;
  }
};

const severityColor = (s: string) => {
  if (s === 'Critical') return 'danger';
  if (s === 'High') return 'warning';
  if (s === 'Medium') return 'secondary';
  return 'success';
};

const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const resolvePrompt = (pest: any) => {
  selectedPest.value = pest;
  showResolveAlert.value = true;
};

const advisoryPrompt = (pest: any) => {
  advisoryPest.value = pest;
  const adv = pest.advisory;
  advisoryMessage.value =
    `Target: ${adv.recipient_count} ${adv.target_commodity} farmer(s) in Brgy ${adv.target_barangay}.\n\n"${adv.message}"`;
  showAdvisoryAlert.value = true;
};

const confirmAdvisory = async () => {
  showAdvisoryAlert.value = false;
  if (!advisoryPest.value) return;
  try {
    const res = await axiosInstance.post(`/intelligence/pest-outbreaks/${advisoryPest.value.id}/advisory`);
    const t = await toastController.create({
      message: res.data.message ?? 'Community advisory dispatched.',
      duration: 3000, color: 'success', position: 'top',
    });
    await t.present();
  } catch (err: any) {
    const t = await toastController.create({
      message: err.response?.data?.message ?? 'Failed to send advisory.',
      duration: 3000, color: 'danger', position: 'top',
    });
    await t.present();
  }
};

const updatePestStatus = async (status: 'Contained' | 'Resolved') => {
  showResolveAlert.value = false;
  if (!selectedPest.value) return;
  try {
    await axiosInstance.patch(`/intelligence/pest-outbreaks/${selectedPest.value.id}/status`, { status });
    const t = await toastController.create({ message: `Pest marked as ${status}.`, duration: 2500, color: 'success', position: 'top' });
    await t.present();
    await fetchAll();
  } catch {
    const t = await toastController.create({ message: 'Failed to update pest status.', duration: 2500, color: 'danger', position: 'top' });
    await t.present();
  }
};

onMounted(() => fetchAll());
</script>

<style scoped>
.auth-bg { --background: #f4f8f5; }
.dashboard-wrapper { max-width: 1200px; margin: 0 auto; padding-top: 1rem; padding-bottom: 2rem; }
.header-section h2 { font-weight: 800; color: #1a4731; margin: 0 0 4px; }
.text-muted { color: #6c757d; font-size: 0.9rem; }
.mb-4 { margin-bottom: 1.5rem; }
.center-msg { padding: 1.5rem; text-align: center; }

.summary-row { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.summ-chip { flex: 1; min-width: 90px; border-radius: 10px; padding: 0.75rem; display: flex; flex-direction: column; align-items: center; background: white; border: 1px solid #e2e8f0; }
.summ-chip.active { border-left: 4px solid #c0392b; }
.summ-chip.contained { border-left: 4px solid #f39c12; }
.summ-chip.resolved { border-left: 4px solid #2e7d32; }
.summ-chip.mono { border-left: 4px solid #7b1fa2; }
.summ-n { font-size: 1.6rem; font-weight: 900; color: #0f172a; }
.summ-l { font-size: 0.72rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }

.intel-card { border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #e2e8f0; overflow: hidden; }
.border-danger { border-top: 4px solid #c0392b; }
.border-warning { border-top: 4px solid #f39c12; }

.card-title-danger { font-weight: 800; color: #c0392b; display: flex; align-items: center; gap: 8px; font-size: 1rem; }
.card-title-warning { font-weight: 800; color: #d35400; display: flex; align-items: center; gap: 8px; font-size: 1rem; }

.pest-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.pest-name { font-weight: 800; color: #0f172a; }
.vector-badge { font-size: 0.62rem; letter-spacing: 0.5px; }
.pest-sub { font-size: 0.82rem; color: #64748b; margin: 1px 0 0; }
.pest-notes { font-size: 0.82rem; color: #475569; font-style: italic; margin: 4px 0 0; }
.pest-intervention {
  display: flex; align-items: flex-start; gap: 6px;
  font-size: 0.82rem; color: #1a4731; font-weight: 600;
  background: #e8f5e9; border-radius: 6px; padding: 8px 10px; margin: 6px 0 0;
}
.pest-intervention ion-icon { font-size: 1rem; flex-shrink: 0; margin-top: 1px; }
.advisory-btn { margin: 8px 0 0; --border-radius: 8px; text-transform: none; font-weight: 700; }
.pest-end { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.severity-badge { font-size: 0.75rem; }

.alert-box { background: #fff8e1; border-bottom: 1px solid #ffe082; padding: 12px 16px; }
.alert-sub { font-size: 0.82rem; color: #64748b; margin: 2px 0 0; }
.alert-warning { font-size: 0.82rem; color: #c0392b; font-weight: 700; margin: 4px 0 0; }
</style>
