<template>
  <ion-page>
    <AppHeader />

    <ion-content class="rpt-content">
      <div class="rpt-shell">
        <header class="intro">
          <p class="lede">
            Choose whether farmer and staff SMS goes through IPROG or Semaphore.
            API tokens stay in the server environment — they are never stored or shown here.
          </p>
        </header>

        <div v-if="loading" class="center-state">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
        </div>

        <template v-else>
          <ion-card class="panel">
            <ion-card-header>
              <ion-card-title>Active provider</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p class="status-line">
                Current:
                <strong>{{ providerLabel(settings.provider) }}</strong>
              </p>
              <p class="muted">
                Source:
                {{ settings.source === 'database' ? 'saved by Super Admin' : 'environment default (SMS_PROVIDER)' }}
              </p>

              <ion-segment
                class="provider-segment"
                :value="draft"
                @ionChange="onSegment($event)"
              >
                <ion-segment-button value="iprog">
                  <ion-label>IPROG SMS</ion-label>
                </ion-segment-button>
                <ion-segment-button value="semaphore">
                  <ion-label>Semaphore SMS</ion-label>
                </ion-segment-button>
              </ion-segment>

              <ion-button class="save" :disabled="saving || (draft === settings.provider && settings.source === 'database')" @click="save">
                {{ saving ? 'Saving…' : 'Save provider' }}
              </ion-button>
            </ion-card-content>
          </ion-card>

          <ion-card class="panel">
            <ion-card-header>
              <ion-card-title>Server credentials</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p class="chip" :class="settings.gateways.iprog.configured ? 'ok' : 'warn'">
                IPROG token {{ settings.gateways.iprog.configured ? 'is configured' : 'is not configured' }}
              </p>
              <p class="chip" :class="settings.gateways.semaphore.configured ? 'ok' : 'warn'">
                Semaphore API key {{ settings.gateways.semaphore.configured ? 'is configured' : 'is not configured' }}
              </p>
              <p class="muted">
                Set IPROG_API_TOKEN and SEMAPHORE_API_KEY on the server. Switching to a gateway without a key will be refused in production.
              </p>
            </ion-card-content>
          </ion-card>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import AppHeader from '@/components/Navigation/AppHeader.vue';
import { onMounted, reactive, ref } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonButton, IonSpinner,
  IonSegment, IonSegmentButton, IonLabel,
} from '@ionic/vue';
import apiClient from '@/utils/axios';
import { presentToast } from '@/utils/toast';

type Provider = 'iprog' | 'semaphore';

const loading = ref(true);
const saving = ref(false);
const draft = ref<Provider>('iprog');
const settings = reactive({
  provider: 'iprog' as Provider,
  source: 'env' as 'database' | 'env',
  gateways: {
    iprog: { configured: false },
    semaphore: { configured: false },
  },
});

const providerLabel = (p: Provider) => (p === 'semaphore' ? 'Semaphore SMS' : 'IPROG SMS');

const apply = (data: any) => {
  const provider: Provider = data?.provider === 'semaphore' ? 'semaphore' : 'iprog';
  settings.provider = provider;
  settings.source = data?.source === 'database' ? 'database' : 'env';
  settings.gateways.iprog.configured = Boolean(data?.gateways?.iprog?.configured);
  settings.gateways.semaphore.configured = Boolean(data?.gateways?.semaphore?.configured);
  draft.value = provider;
};

const load = async () => {
  loading.value = true;
  try {
    const res = await apiClient.get('/system/sms-settings');
    apply(res.data?.data ?? {});
  } catch {
    await presentToast('Could not load SMS gateway settings.', 'danger');
  } finally {
    loading.value = false;
  }
};

const onSegment = (e: CustomEvent) => {
  const value = e.detail?.value;
  if (value === 'iprog' || value === 'semaphore') {
    draft.value = value;
  }
};

const save = async () => {
  saving.value = true;
  try {
    const res = await apiClient.patch('/system/sms-settings', { provider: draft.value });
    apply(res.data?.data ?? {});
    await presentToast(res.data?.message || 'SMS gateway updated.', 'success');
  } catch (error: any) {
    await presentToast(error?.response?.data?.message || 'Could not save the SMS gateway.', 'danger');
  } finally {
    saving.value = false;
  }
};

onMounted(() => { void load(); });
</script>

<style scoped>
.rpt-content { --background: #f4f8f5; }
.rpt-shell { max-width: 720px; margin: 0 auto; padding: 0.75rem 1rem 1rem; }
.intro { margin-bottom: 0.75rem; }
.lede { margin: 0; color: #475569; }
.center-state { display: flex; justify-content: center; padding: 3rem; }
.panel { margin: 0 0 0.9rem; }
.status-line { margin: 0 0 0.35rem; color: #0f172a; }
.muted { margin: 0.2rem 0; color: #64748b; font-size: 0.9rem; }
.provider-segment { margin: 0.9rem 0; }
.save { --background: #1a4731; margin-top: 0.4rem; }
.chip {
  display: inline-block;
  margin: 0.25rem 0.5rem 0.25rem 0;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
}
.chip.ok { background: #dcfce7; color: #166534; }
.chip.warn { background: #fef3c7; color: #92400e; }
</style>
