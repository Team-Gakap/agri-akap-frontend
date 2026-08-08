<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Broadcast Center</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="auth-bg ion-padding">
      <div class="dashboard-wrapper">
        <div class="header-section mb-4">
          <h2>Outreach & Communications</h2>
          <p class="text-muted">Broadcast SMS advisories via Semaphore to targeted farmers.</p>
        </div>

        <ion-grid>
          <ion-row>
            <ion-col size="12" size-md="8">

              <!-- Suggested Weather Advisories -->
              <ion-card class="action-card weather-advisory-card mb-3">
                <ion-card-header>
                  <ion-card-title class="card-title">Suggested Weather Advisories</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <div v-if="advisoryLoading" class="text-center p-3">
                    <ion-spinner name="crescent" color="primary"></ion-spinner>
                  </div>
                  <template v-else-if="advisory?.has_advisory">
                    <div
                      v-for="(item, idx) in (advisory.advisories?.length ? advisory.advisories : [advisory])"
                      :key="`${item.barangay || 'all'}-${idx}`"
                      class="advisory-block"
                    >
                      <div class="advisory-badge-row">
                        <ion-chip color="warning">{{ item.alert_type }}</ion-chip>
                        <ion-chip v-if="item.barangay" color="primary">{{ item.barangay }}</ion-chip>
                        <ion-chip v-if="item.already_sent_today" color="medium">Sent today</ion-chip>
                      </div>
                      <p class="advisory-preview">{{ item.message }}</p>
                      <p class="advisory-meta" v-if="item.forecast">
                        Tomorrow {{ item.forecast.forecast_date }} ·
                        Rain {{ item.forecast.precipitation_probability ?? '—' }}% ·
                        Max {{ item.forecast.temperature_max ?? '—' }}°C
                        <span v-if="item.forecast.wind_speed_10m != null">
                          · Wind {{ item.forecast.wind_speed_10m }} km/h
                        </span>
                      </p>
                      <ion-button size="small" fill="outline" color="primary" @click="useAdvisoryInCompose(item.message)">
                        Use in Compose
                      </ion-button>
                    </div>
                    <div class="advisory-actions">
                      <ion-button
                        color="warning"
                        :disabled="isSendingWeather"
                        @click="sendWeatherWarningNow"
                      >
                        <ion-icon slot="start" :icon="warningOutline"></ion-icon>
                        {{ isSendingWeather ? 'Sending…' : 'Send All Weather Warnings Now' }}
                      </ion-button>
                    </div>
                  </template>
                  <p v-else class="advisory-empty">
                    {{ advisory?.reason || 'No severe weather advisory for tomorrow. Thresholds: rain ≥ 80%, max temp ≥ 38°C, or wind > 15 km/h.' }}
                  </p>
                </ion-card-content>
              </ion-card>

              <!-- Compose Card -->
              <ion-card class="action-card">
                <ion-card-header>
                  <ion-card-title class="card-title">Compose Broadcast</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <ion-item class="custom-textarea">
                    <ion-textarea
                      v-model="form.message"
                      placeholder="Type your official MAO advisory here..."
                      :auto-grow="true"
                      :rows="4"
                      :maxlength="160"
                    ></ion-textarea>
                  </ion-item>
                  <div class="char-counter" :class="{ 'char-danger': form.message.length >= 150 }">
                    {{ form.message.length }} / 160 chars
                    <span v-if="form.message.length >= 160" class="char-warn">Character limit reached</span>
                  </div>
                </ion-card-content>
              </ion-card>

              <!-- Target Selection Card -->
              <ion-card class="action-card mt-3">
                <ion-card-header>
                  <ion-card-title class="card-title">Target Selection</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <ion-row>
                    <ion-col size="12" size-md="6">
                      <ion-item class="custom-input">
                        <ion-select v-model="form.target_barangay" label="Target Barangay" label-placement="floating">
                          <ion-select-option value="All">All Barangays</ion-select-option>
                          <ion-select-option
                            v-for="brgy in barangays"
                            :key="brgy"
                            :value="brgy"
                          >{{ brgy }}</ion-select-option>
                        </ion-select>
                      </ion-item>
                    </ion-col>
                    <ion-col size="12" size-md="6">
                      <ion-item class="custom-input">
                        <ion-select v-model="form.target_commodity" label="Target Commodity" label-placement="floating">
                          <ion-select-option value="All">All Farmers</ion-select-option>
                          <ion-select-option
                            v-for="c in commodities"
                            :key="c"
                            :value="c"
                          >{{ c }}</ion-select-option>
                        </ion-select>
                      </ion-item>
                    </ion-col>
                  </ion-row>

                  <div class="action-bar mt-4">
                    <div class="semaphore-status">
                      <ion-icon :icon="radioOutline"></ion-icon>
                      <span>Semaphore SMS Gateway</span>
                    </div>
                    <ion-button
                      color="success"
                      @click="confirmSend"
                      :disabled="isSending || !form.message.trim()"
                    >
                      <ion-icon slot="start" :icon="sendOutline"></ion-icon>
                      {{ isSending ? 'Sending...' : 'Send Broadcast' }}
                    </ion-button>
                  </div>
                </ion-card-content>
              </ion-card>

            </ion-col>

            <!-- Logs Sidebar -->
            <ion-col size="12" size-md="4">
              <ion-card class="action-card">
                <ion-card-header>
                  <ion-card-title class="card-title">Recent Activity</ion-card-title>
                </ion-card-header>
                <ion-card-content class="ion-no-padding">
                  <ion-list lines="full">
                    <div v-if="isLoadingLogs" class="text-center p-3"><ion-spinner></ion-spinner></div>
                    <div v-else-if="!logs.length">
                      <EmptyState
                        variant="documents"
                        message="No broadcasts found. Compose a message to reach farmers."
                      />
                    </div>
                    <ion-item v-for="log in logs" :key="log.id">
                      <ion-label>
                        <h3 class="log-title">{{ log.target_barangay }} · {{ log.target_commodity }}</h3>
                        <p class="text-truncate">{{ log.message_body }}</p>
                        <p class="log-meta">
                          <StatusBadge :status="log.status" />
                          <span>{{ log.recipient_count }} Recipients</span>
                        </p>
                      </ion-label>
                    </ion-item>
                  </ion-list>
                </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>

      </div>
    </ion-content>

    <!-- Confirm Alert -->
    <ion-alert
      :is-open="showConfirm"
      header="Confirm Broadcast"
      :message="`Send to: ${form.target_barangay} · ${form.target_commodity}<br/><br/>&quot;${form.message}&quot;`"
      :buttons="[
        { text: 'Cancel', role: 'cancel', handler: () => { showConfirm = false; } },
        { text: 'Send Now', role: 'confirm', cssClass: 'alert-confirm-btn', handler: () => sendBroadcast() },
      ]"
      @didDismiss="showConfirm = false"
    ></ion-alert>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonTextarea, IonSelect, IonSelectOption, IonButton, IonIcon,
  IonList, IonLabel, IonSpinner, IonAlert, IonChip,
  toastController,
} from '@ionic/vue';
import { sendOutline, radioOutline, warningOutline } from 'ionicons/icons';
import axiosInstance from '@/utils/axios';
import EmptyState from '@/components/EmptyState.vue';
import StatusBadge from '@/components/StatusBadge.vue';

interface WeatherAdvisoryItem {
  barangay?: string | null;
  alert_type: string | null;
  message: string | null;
  already_sent_today?: boolean;
  forecast?: {
    forecast_date: string;
    precipitation_probability: number | null;
    temperature_max: number | null;
    wind_speed_10m?: number | null;
  } | null;
}

interface WeatherAdvisory extends WeatherAdvisoryItem {
  has_advisory: boolean;
  advisories?: WeatherAdvisoryItem[];
  reason?: string | null;
}

const form = ref({ message: '', target_barangay: 'All', target_commodity: 'All' });
const isSending = ref(false);
const isSendingWeather = ref(false);
const logs = ref<any[]>([]);
const isLoadingLogs = ref(true);
const barangays = ref<string[]>([]);
const commodities = ref<string[]>([]);
const showConfirm = ref(false);
const advisory = ref<WeatherAdvisory | null>(null);
const advisoryLoading = ref(true);

const showToast = async (msg: string, color: 'success' | 'danger' = 'success') => {
  const t = await toastController.create({ message: msg, duration: 3000, color, position: 'top' });
  await t.present();
};

const fetchLogs = async () => {
  try {
    const res = await axiosInstance.get('/broadcasts');
    logs.value = res.data.data ?? [];
  } catch {
    // silent
  } finally {
    isLoadingLogs.value = false;
  }
};

const fetchFilters = async () => {
  try {
    const [bRes, cRes] = await Promise.all([
      axiosInstance.get('/farmers/barangays'),
      axiosInstance.get('/farmers/commodities'),
    ]);
    barangays.value = bRes.data.data ?? [];
    commodities.value = cRes.data.data ?? [];
  } catch {
    // fallback: leave empty (user can still select "All")
  }
};

const fetchAdvisory = async () => {
  advisoryLoading.value = true;
  try {
    const res = await axiosInstance.get('/weather/advisories');
    advisory.value = res.data?.data ?? null;
  } catch {
    advisory.value = {
      has_advisory: false,
      alert_type: null,
      message: null,
      reason: 'Unable to load weather advisories.',
    };
  } finally {
    advisoryLoading.value = false;
  }
};

const useAdvisoryInCompose = (message?: string | null) => {
  const text = message || advisory.value?.message;
  if (text) {
    form.value.message = text.slice(0, 160);
  }
};

const sendWeatherWarningNow = async () => {
  if (!advisory.value?.has_advisory || isSendingWeather.value) return;
  isSendingWeather.value = true;
  try {
    const res = await axiosInstance.post('/weather/advisories/send');
    await showToast(res.data.message ?? 'Weather warning sent.', 'success');
    await Promise.all([fetchLogs(), fetchAdvisory()]);
  } catch (err: any) {
    await showToast(err.response?.data?.message ?? 'Weather warning failed.', 'danger');
  } finally {
    isSendingWeather.value = false;
  }
};

const confirmSend = () => { showConfirm.value = true; };

const sendBroadcast = async () => {
  showConfirm.value = false;
  isSending.value = true;
  try {
    const res = await axiosInstance.post('/broadcasts/send', {
      message_body: form.value.message,
      target_barangay: form.value.target_barangay,
      target_commodity: form.value.target_commodity,
    });
    await showToast(res.data.message ?? 'Broadcast sent successfully!', 'success');
    form.value.message = '';
    fetchLogs();
  } catch (err: any) {
    await showToast(err.response?.data?.message ?? 'Broadcast failed.', 'danger');
  } finally {
    isSending.value = false;
  }
};

onMounted(async () => {
  await Promise.all([fetchLogs(), fetchFilters(), fetchAdvisory()]);
});
</script>

<style scoped>
.auth-bg { --background: #f4f8f5; }
.dashboard-wrapper { max-width: 1200px; margin: 0 auto; padding-top: 1rem; padding-bottom: 2rem; }
.header-section h2 { font-weight: 800; color: #1a4731; margin: 0 0 4px; }
.text-muted { color: #6c757d; font-size: 0.9rem; }
.mb-3 { margin-bottom: 1rem; }
.mb-4 { margin-bottom: 1.5rem; }
.mt-3 { margin-top: 1rem; }
.mt-4 { margin-top: 1.5rem; }
.p-3 { padding: 1rem; }
.text-center { text-align: center; }

.action-card { border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #e2e8f0; }
.weather-advisory-card { border-left: 4px solid #d4af37; }
.card-title { font-size: 1.05rem; color: #1a4731; font-weight: 800; }

.advisory-block {
  margin-bottom: 0.85rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px dashed #e2e8f0;
}
.advisory-block:last-of-type { border-bottom: none; }
.advisory-badge-row { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-bottom: 0.5rem; }
.advisory-preview {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  line-height: 1.45;
  color: #1e293b;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  padding: 0.75rem;
}
.advisory-meta {
  margin: 0.5rem 0 0;
  font-size: 0.8rem;
  color: #64748b;
}
.advisory-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.85rem;
}
.advisory-empty {
  margin: 0;
  font-size: 0.9rem;
  color: #64748b;
  line-height: 1.45;
}

.custom-textarea { --background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
.custom-input { --background: white; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 0; }

.char-counter { font-size: 0.8rem; color: #64748b; text-align: right; margin-top: 4px; }
.char-danger { color: #c0392b; font-weight: 700; }
.char-warn { margin-left: 8px; }

.action-bar { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #eee; padding-top: 1rem; }
.semaphore-status { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 600; color: #2e7d32; }

.log-title { font-weight: 700; font-size: 0.9rem; }
.log-meta { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; margin-top: 4px; }
.text-truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
