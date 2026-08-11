<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Stock Management</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="loadPrograms">
            <ion-icon slot="icon-only" :icon="refreshOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="inv-bg ion-padding">
      <div class="inv-wrapper">

        <div class="page-intro">
          <h2>Inventory Control</h2>
          <p>Log incoming regional deliveries, set minimum reorder limits, and map active distribution cycles to target barangays.</p>
        </div>

        <div v-if="loading" class="loading-state">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Loading stock levels…</p>
        </div>

        <EmptyState
          v-else-if="!programs.length"
          variant="inventory"
          title="No programs found"
          message="No programs found. Create a program to begin tracking stock."
        />

        <div v-else class="stock-grid">
          <ion-card v-for="p in programs" :key="p.id" class="stock-card">
            <ion-card-content>
              <div class="sc-head">
                <div>
                  <h3 class="sc-name">{{ p.name }}</h3>
                  <ion-badge color="primary" class="sc-type">{{ p.type }}</ion-badge>
                  <ion-badge v-if="!p.is_active" color="medium" class="sc-type">Inactive</ion-badge>
                </div>
                <ion-badge v-if="isLowStock(p)" color="danger" class="low-badge">
                  <ion-icon :icon="alertCircleOutline"></ion-icon> LOW STOCK
                </ion-badge>
              </div>

              <div class="sc-numbers">
                <span class="sc-remaining">{{ Number(p.remaining_quantity).toLocaleString() }}</span>
                <span class="sc-of">/ {{ Number(p.total_quantity).toLocaleString() }} {{ p.unit_of_measurement }}</span>
              </div>

              <ion-progress-bar
                :value="stockRatio(p)"
                :color="isLowStock(p) ? 'danger' : (stockRatio(p) < 0.4 ? 'warning' : 'success')"
              ></ion-progress-bar>

              <div class="sc-meta">
                <div class="scm-row">
                  <span class="scm-label">Reorder Level</span>
                  <strong>{{ p.reorder_level != null ? Number(p.reorder_level).toLocaleString() + ' ' + p.unit_of_measurement : 'Not set' }}</strong>
                </div>
                <div class="scm-row">
                  <span class="scm-label">Target Barangays</span>
                  <strong>{{ (p.target_barangays && p.target_barangays.length) ? p.target_barangays.length + ' assigned' : 'All / none' }}</strong>
                </div>
              </div>

              <div v-if="p.target_barangays && p.target_barangays.length" class="brgy-chips">
                <ion-chip v-for="b in p.target_barangays" :key="b" class="brgy-chip">{{ b }}</ion-chip>
              </div>

              <div class="sc-actions">
                <ion-button size="small" fill="solid" @click="openRestock(p)">
                  <ion-icon slot="start" :icon="addCircleOutline"></ion-icon>
                  Log Delivery
                </ion-button>
                <ion-button size="small" fill="outline" @click="openSettings(p)">
                  <ion-icon slot="start" :icon="settingsOutline"></ion-icon>
                  Stock Settings
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>
        </div>
      </div>

      <!-- LOG DELIVERY MODAL -->
      <ion-modal :is-open="restockOpen" @didDismiss="restockOpen = false">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>Log Incoming Delivery</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="restockOpen = false">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <div v-if="activeProgram">
            <p class="modal-program">{{ activeProgram.name }}</p>
            <p class="modal-hint">Current stock: <strong>{{ Number(activeProgram.remaining_quantity).toLocaleString() }} {{ activeProgram.unit_of_measurement }}</strong></p>

            <ion-item class="modal-input">
              <ion-input
                type="number"
                v-model="restockQty"
                :label="`Units Delivered (${activeProgram.unit_of_measurement}) *`"
                label-placement="floating"
                placeholder="e.g., 500"
                min="1"
              ></ion-input>
            </ion-item>

            <ion-button expand="block" class="mt-3" :disabled="savingRestock || !(Number(restockQty) >= 1)" @click="submitRestock">
              <ion-icon slot="start" :icon="addCircleOutline"></ion-icon>
              {{ savingRestock ? 'Saving…' : 'Add to Stock' }}
            </ion-button>
          </div>
        </ion-content>
      </ion-modal>

      <!-- STOCK SETTINGS MODAL -->
      <ion-modal :is-open="settingsOpen" @didDismiss="settingsOpen = false">
        <ion-header>
          <ion-toolbar color="primary">
            <ion-title>Stock Settings</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="settingsOpen = false">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <div v-if="activeProgram">
            <p class="modal-program">{{ activeProgram.name }}</p>

            <ion-item class="modal-input">
              <ion-input
                type="number"
                v-model="settingsReorder"
                :label="`Minimum Reorder Level (${activeProgram.unit_of_measurement})`"
                label-placement="floating"
                placeholder="Leave blank to disable alerts"
                min="0"
              ></ion-input>
            </ion-item>

            <ion-item class="modal-input">
              <ion-select
                v-model="settingsBarangays"
                :multiple="true"
                label="Target Barangays"
                label-placement="floating"
                placeholder="Select barangays for this cycle"
              >
                <ion-select-option v-for="b in barangays" :key="b" :value="b">{{ b }}</ion-select-option>
              </ion-select>
            </ion-item>
            <p class="modal-hint">Distribution cycle targets. Leave empty to keep the program open to all barangays.</p>

            <ion-button expand="block" class="mt-3" :disabled="savingSettings" @click="submitSettings">
              <ion-icon slot="start" :icon="saveOutline"></ion-icon>
              {{ savingSettings ? 'Saving…' : 'Save Settings' }}
            </ion-button>
          </div>
        </ion-content>
      </ion-modal>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonMenuButton, IonIcon, IonCard, IonCardContent, IonBadge, IonProgressBar,
  IonChip, IonModal, IonItem, IonInput, IonSelect, IonSelectOption, IonSpinner,
  toastController,
} from '@ionic/vue';
import {
  refreshOutline, alertCircleOutline, addCircleOutline,
  settingsOutline, saveOutline,
} from 'ionicons/icons';
import apiClient from '@/utils/axios';
import EmptyState from '@/components/EmptyState.vue';

const programs = ref<any[]>([]);
const barangays = ref<string[]>([]);
const loading = ref(true);

const activeProgram = ref<any>(null);
const restockOpen = ref(false);
const settingsOpen = ref(false);

const restockQty = ref<number | null>(null);
const savingRestock = ref(false);

const settingsReorder = ref<number | null>(null);
const settingsBarangays = ref<string[]>([]);
const savingSettings = ref(false);

const toast = async (message: string, color = 'primary') => {
  const t = await toastController.create({ message, duration: 2600, color, position: 'top' });
  await t.present();
};

const stockRatio = (p: any): number => {
  if (!p.total_quantity) return 0;
  return Math.max(0, Math.min(1, p.remaining_quantity / p.total_quantity));
};

const isLowStock = (p: any): boolean =>
  p.reorder_level != null && Number(p.remaining_quantity) <= Number(p.reorder_level);

const loadPrograms = async () => {
  loading.value = true;
  try {
    const res = await apiClient.get('/programs');
    programs.value = res.data?.data?.data ?? res.data?.data ?? [];
  } catch {
    await toast('Failed to load programs.', 'danger');
  } finally {
    loading.value = false;
  }
};

const loadBarangays = async () => {
  try {
    const res = await apiClient.get('/farmers/barangays');
    barangays.value = res.data?.data ?? [];
  } catch {
    /* non-fatal: multiselect just stays empty */
  }
};

onMounted(async () => {
  await Promise.all([loadPrograms(), loadBarangays()]);
});

const openRestock = (p: any) => {
  activeProgram.value = p;
  restockQty.value = null;
  restockOpen.value = true;
};

const submitRestock = async () => {
  if (!activeProgram.value || !(Number(restockQty.value) >= 1)) return;
  savingRestock.value = true;
  try {
    const res = await apiClient.post(`/programs/${activeProgram.value.id}/restock`, {
      quantity_added: Number(restockQty.value),
    });
    await toast(res.data?.message || 'Delivery logged.', 'success');
    restockOpen.value = false;
    await loadPrograms();
  } catch (err: any) {
    await toast(err.response?.data?.message || 'Failed to log delivery.', 'danger');
  } finally {
    savingRestock.value = false;
  }
};

const openSettings = (p: any) => {
  activeProgram.value = p;
  settingsReorder.value = p.reorder_level != null ? Number(p.reorder_level) : null;
  settingsBarangays.value = Array.isArray(p.target_barangays) ? [...p.target_barangays] : [];
  settingsOpen.value = true;
};

const submitSettings = async () => {
  if (!activeProgram.value) return;
  savingSettings.value = true;
  try {
    const res = await apiClient.patch(`/programs/${activeProgram.value.id}/config`, {
      reorder_level: settingsReorder.value === null || settingsReorder.value === ('' as any)
        ? null
        : Number(settingsReorder.value),
      target_barangays: settingsBarangays.value.length ? settingsBarangays.value : null,
    });
    await toast(res.data?.message || 'Stock settings updated.', 'success');
    settingsOpen.value = false;
    await loadPrograms();
  } catch (err: any) {
    await toast(err.response?.data?.message || 'Failed to update settings.', 'danger');
  } finally {
    savingSettings.value = false;
  }
};
</script>

<style scoped>
.inv-bg { --background: #f4f8f5; }
.inv-wrapper { max-width: 1100px; margin: 0 auto; }

.page-intro { margin-bottom: 1.25rem; }
.page-intro h2 { color: #1a4731; font-weight: 800; margin: 0 0 4px; }
.page-intro p { color: #64748b; font-size: 0.9rem; margin: 0; max-width: 640px; }

.loading-state { text-align: center; padding: 3rem 1rem; color: #64748b; }

.stock-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; }
.stock-card { border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04); margin: 0; }

.sc-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.sc-name { color: #1a4731; font-weight: 800; margin: 0 0 6px; font-size: 1.1rem; }
.sc-type { margin-right: 4px; text-transform: capitalize; }
.low-badge { display: inline-flex; align-items: center; gap: 4px; font-weight: 800; }
.low-badge ion-icon { font-size: 0.9rem; }

.sc-numbers { margin: 14px 0 6px; display: flex; align-items: baseline; gap: 6px; }
.sc-remaining { font-size: 1.9rem; font-weight: 900; color: #1a4731; line-height: 1; }
.sc-of { font-size: 0.85rem; color: #94a3b8; }

.sc-meta { margin-top: 14px; }
.scm-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 0.88rem; }
.scm-label { color: #64748b; }

.brgy-chips { margin-top: 8px; }
.brgy-chip { --background: rgba(26,71,49,0.08); --color: #1a4731; font-size: 0.75rem; height: 24px; }

.sc-actions { display: flex; gap: 8px; margin-top: 16px; }
.sc-actions ion-button { flex: 1; }

.modal-program { font-weight: 800; color: #1a4731; font-size: 1.15rem; margin: 0 0 4px; }
.modal-hint { color: #64748b; font-size: 0.85rem; margin: 4px 0 1rem; }
.modal-input { --background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 0.8rem; }
.mt-3 { margin-top: 1rem; }
</style>
