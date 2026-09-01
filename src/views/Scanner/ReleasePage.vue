<template>
  <component :is="embedded ? 'div' : IonPage" class="encode-root">
    <ion-header v-if="!embedded">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tech/subsidy-dispense" text="Back"></ion-back-button>
        </ion-buttons>
        <ion-title>Confirm Release</ion-title>
        <ion-buttons slot="end">
          <ion-chip :color="syncStore.online ? 'light' : 'warning'" style="--background:rgba(255,255,255,0.15);">
            <ion-icon :icon="syncStore.online ? cloudDoneOutline : cloudOfflineOutline"></ion-icon>
            <ion-label>{{ syncStore.online ? 'Online' : 'Offline' }}</ion-label>
          </ion-chip>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <component :is="embedded ? 'div' : IonContent" class="release-bg ion-padding">
      <div class="release-wrapper">

        <ion-card v-if="!ctx" class="empty-card">
          <ion-card-content>
            <p>No verified farmer in context. Please scan a farmer ID first.</p>
            <ion-button expand="block" @click="goScan">
              <ion-icon slot="start" :icon="qrCodeOutline"></ion-icon>
              Back to Scanner
            </ion-button>
          </ion-card-content>
        </ion-card>

        <template v-else-if="releaseResult">
          <ion-card :color="releaseResult.offline ? 'warning' : 'success'">
            <ion-card-header>
              <ion-icon
                :icon="releaseResult.offline ? cloudOfflineOutline : checkmarkCircleOutline"
                class="result-icon"
              ></ion-icon>
              <ion-card-title class="text-white">
                {{ releaseResult.offline ? 'Queued Offline' : 'Release Recorded' }}
              </ion-card-title>
            </ion-card-header>
            <ion-card-content class="text-white">
              <template v-if="releaseResult.offline">
                <p>This release is saved on your device and will sync automatically when reconnected. Eligibility and inventory are verified on upload.</p>
              </template>
              <template v-else>
                <h2 class="farmer-name-result">{{ releaseResult.data?.farmer_name }}</h2>
                <div class="dispense-box">
                  <span class="dispense-label">DISPENSED</span>
                  <span class="dispense-qty">{{ releaseResult.data?.quantity_dispensed }} {{ releaseResult.data?.unit }}</span>
                  <span v-if="releaseResult.data?.unit_secondary" class="dispense-qty-secondary">
                    + {{ releaseResult.data?.quantity_dispensed_secondary }} {{ releaseResult.data?.unit_secondary }}
                  </span>
                </div>
                <p class="remaining-note">Inventory Remaining: <strong>{{ releaseResult.data?.inventory_remaining }} {{ releaseResult.data?.unit }}</strong></p>
                <p v-if="releaseResult.data?.unit_secondary" class="remaining-note">
                  Inventory Remaining: <strong>{{ releaseResult.data?.inventory_remaining_secondary }} {{ releaseResult.data?.unit_secondary }}</strong>
                </p>
                <p class="sms-note">
                  <ion-icon :icon="chatbubbleEllipsesOutline"></ion-icon>
                  SMS receipt sent to the farmer's registered number.
                </p>
              </template>
            </ion-card-content>
          </ion-card>

          <ion-button expand="block" class="mt-4" @click="goScan">
            <ion-icon slot="start" :icon="qrCodeOutline"></ion-icon>
            Scan Next Farmer
          </ion-button>
        </template>

        <template v-else>
          <ion-card class="alloc-card">
            <ion-card-content>
              <p class="alloc-eyebrow">ALLOCATION PREVIEW</p>
              <h2 class="alloc-farmer" v-if="ctx.farmer_name">{{ ctx.farmer_name }}</h2>
              <h2 class="alloc-farmer" v-else>Farmer (offline)</h2>

              <div class="alloc-item">
                <span class="ai-label">Program Name</span>
                <strong>{{ ctx.item_released }}</strong>
              </div>

              <template v-if="!ctx.offline">
                <div class="alloc-grid">
                  <div class="ag-cell">
                    <span class="ag-label">Program Crop Area</span>
                    <span class="ag-value">{{ ctx.total_farm_size }} ha</span>
                  </div>
                  <div class="ag-cell">
                    <span class="ag-label">Eligible</span>
                    <span class="ag-value">{{ ctx.eligible_size }} ha</span>
                  </div>
                </div>
                <div class="alloc-qty-box">
                  <span class="aqb-label">TO RELEASE</span>
                  <span class="aqb-qty">{{ ctx.quantity }}</span>
                  <span class="aqb-unit">{{ ctx.unit }}</span>
                  <span v-if="ctx.unit_secondary" class="aqb-secondary">+ {{ ctx.quantity_secondary }} {{ ctx.unit_secondary }}</span>
                </div>
                <p class="alloc-remaining">Inventory Remaining: <strong>{{ ctx.inventory_remaining }} {{ ctx.unit }}</strong></p>
                <p v-if="ctx.unit_secondary" class="alloc-remaining">
                  Inventory Remaining: <strong>{{ ctx.inventory_remaining_secondary }} {{ ctx.unit_secondary }}</strong>
                </p>
              </template>
              <div v-else class="offline-note">
                <ion-icon :icon="cloudOfflineOutline"></ion-icon>
                Offline: the exact allocation will be computed by the server on sync.
              </div>
            </ion-card-content>
          </ion-card>

          <ion-button
            expand="block"
            size="large"
            class="authorize-btn"
            :disabled="isSubmitting"
            @click="authorizeRelease"
          >
            <ion-icon slot="start" :icon="checkmarkDoneOutline"></ion-icon>
            {{ authorizeLabel }}
          </ion-button>
        </template>

      </div>
    </component>
  </component>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonIcon,
  IonChip, IonLabel, toastController,
} from '@ionic/vue';
import {
  qrCodeOutline, checkmarkDoneOutline,
  checkmarkCircleOutline, chatbubbleEllipsesOutline,
  cloudDoneOutline, cloudOfflineOutline,
} from 'ionicons/icons';
import { useRouter } from 'vue-router';
import { useSyncStore } from '@/stores/syncStore';
import { useDistributionStore } from '@/stores/distributionStore';
import { claimSubsidyRelease } from '@/composables/useSubsidyClaim';

const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false });
const emit = defineEmits<{ saved: []; back: [] }>();

const router = useRouter();
const syncStore = useSyncStore();
const distributionStore = useDistributionStore();

const ctx = computed(() => distributionStore.context);

const isSubmitting = ref(false);
const releaseResult = ref<any>(null);

const authorizeLabel = computed(() => {
  if (isSubmitting.value) return 'Recording...';
  return syncStore.online ? 'Authorize Release' : 'Save Release Offline';
});

const toast = async (message: string, color = 'primary') => {
  const t = await toastController.create({ message, duration: 2600, color, position: 'top' });
  await t.present();
};

const goScan = () => {
  distributionStore.clear();
  if (props.embedded) {
    emit('back');
    return;
  }
  router.replace('/tech/subsidy-dispense');
};

const authorizeRelease = async () => {
  if (!ctx.value) return;
  isSubmitting.value = true;
  try {
    const result = await claimSubsidyRelease(ctx.value);
    releaseResult.value = result;
    if (props.embedded) emit('saved');
  } catch (err: any) {
    await toast(err.response?.data?.message || 'Release failed. Please try again.', 'danger');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.release-bg { --background: #f4f8f5; }
.release-wrapper { max-width: 680px; margin: 0 auto; }

.empty-card { border-radius: 12px; }

.alloc-card { border-radius: 12px; border: 1px solid #e2e8f0; border-top: 4px solid #1a4731; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.alloc-eyebrow { font-size: 0.72rem; letter-spacing: 2px; color: #94a3b8; margin: 0 0 4px; font-weight: 700; }
.alloc-farmer { font-weight: 900; color: #1a4731; margin: 0 0 12px; font-size: 1.35rem; }
.alloc-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eef2f0; }
.ai-label { color: #64748b; font-size: 0.9rem; }

.alloc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
.ag-cell { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; }
.ag-label { display: block; font-size: 0.75rem; color: #94a3b8; }
.ag-value { display: block; font-weight: 800; color: #1a4731; font-size: 1.05rem; margin-top: 2px; }

.alloc-qty-box { margin-top: 14px; background: #1a4731; color: white; border-radius: 10px; padding: 1rem; text-align: center; display: flex; flex-direction: column; gap: 2px; }
.aqb-label { font-size: 0.72rem; letter-spacing: 2px; opacity: 0.8; }
.aqb-qty { font-size: 2.8rem; font-weight: 900; line-height: 1; }
.aqb-unit { font-size: 0.95rem; opacity: 0.85; }
.aqb-secondary { font-size: 1.1rem; font-weight: 700; opacity: 0.9; margin-top: 2px; }
.alloc-remaining { font-size: 0.82rem; color: #64748b; text-align: right; margin: 8px 0 0; }

.offline-note { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding: 10px; background: #fff7e6; border: 1px solid #ffe0a3; border-radius: 8px; color: #92600a; font-size: 0.85rem; }

.authorize-btn { --border-radius: 14px; height: 70px; font-size: 1.05rem; font-weight: 800; letter-spacing: 1px; margin-top: 1.5rem; }

.mt-4 { margin-top: 1.5rem; }
.text-white { color: white !important; }
.result-icon { font-size: 3rem; margin-bottom: 0.5rem; }
.farmer-name-result { font-weight: 900; font-size: 1.5rem; margin: 0 0 1rem; }
.dispense-box { background: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.6); border-radius: 10px; padding: 1.2rem; text-align: center; display: flex; flex-direction: column; gap: 4px; }
.dispense-label { font-size: 0.8rem; letter-spacing: 2px; opacity: 0.85; }
.dispense-qty { font-size: 2.6rem; font-weight: 900; line-height: 1; }
.dispense-qty-secondary { font-size: 1.2rem; font-weight: 700; opacity: 0.9; margin-top: 4px; display: block; }
.remaining-note { font-size: 0.82rem; margin-top: 1rem; opacity: 0.9; }
.sms-note { display: flex; align-items: center; gap: 6px; font-size: 0.82rem; margin-top: 0.75rem; opacity: 0.9; }
</style>
