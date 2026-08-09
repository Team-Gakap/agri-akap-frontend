<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tech/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>Farmer Directory</ion-title>
      </ion-toolbar>
      <ion-toolbar color="primary">
        <ion-searchbar
          v-model="query"
          placeholder="Type RSBSA or last name…"
          :debounce="450"
          show-clear-button="focus"
          @ionInput="onSearch"
          style="--background:#fff;--color:#0f172a;"
        ></ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content class="page-bg">
      <p class="hint">
        Search the Echague RSBSA registry. Results load only when you type (not the full list).
      </p>

      <div v-if="!query.trim()" class="idle">
        <ion-icon :icon="searchOutline"></ion-icon>
        <p>Enter at least 2 characters to look up a farmer.</p>
      </div>

      <div v-else-if="loading" class="idle">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
        <p>Searching…</p>
      </div>

      <div v-else-if="error" class="idle error">
        <p>{{ error }}</p>
      </div>

      <div v-else-if="!results.length" class="idle">
        <p>No farmers match “{{ query }}”.</p>
      </div>

      <ion-list v-else lines="full" class="result-list">
        <ion-item
          v-for="f in results"
          :key="f.id"
          button
          detail
          @click="openActions(f)"
        >
          <ion-label>
            <h2>{{ formatName(f) }}</h2>
            <p class="rsbsa">{{ f.rsbsa_no || 'No RSBSA' }}</p>
            <p>{{ f.permanent_brgy || '—' }} · {{ f.mobile_number || 'No mobile' }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <ion-action-sheet
        :is-open="sheetOpen"
        header="Farmer actions"
        :buttons="sheetButtons"
        @didDismiss="sheetOpen = false"
      ></ion-action-sheet>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonSearchbar, IonList, IonItem, IonLabel, IonSpinner, IonIcon, IonActionSheet,
} from '@ionic/vue';
import { searchOutline } from 'ionicons/icons';
import apiClient from '@/utils/axios';

const router = useRouter();
const query = ref('');
const results = ref<any[]>([]);
const loading = ref(false);
const error = ref('');
const sheetOpen = ref(false);
const selected = ref<any | null>(null);

const formatName = (f: any) => {
  if (!f?.surname) return 'Unknown farmer';
  return `${f.surname}, ${[f.first_name, f.middle_name, f.ext_name].filter(Boolean).join(' ')}`;
};

const sheetButtons = computed(() => [
  {
    text: 'Dispense Subsidy',
    handler: () => {
      const id = selected.value?.id;
      if (!id) return;
      router.push({ path: '/tech/subsidy-dispense', query: { farmer: id, rsbsa: selected.value?.rsbsa_no } });
    },
  },
  {
    text: 'Open Scanner / Release',
    handler: () => {
      const id = selected.value?.id;
      if (!id) return;
      router.push({ path: '/tech/scanner', query: { farmer: id } });
    },
  },
  {
    text: 'View Profile (ID Issuance context)',
    handler: () => {
      const id = selected.value?.id;
      if (!id) return;
      // Tech registry detail falls back to farmers list selection path
      router.push({ path: '/tech/farmers', query: { highlight: id } });
    },
  },
  { text: 'Cancel', role: 'cancel' },
]);

const onSearch = async (e: CustomEvent) => {
  const value = String(e.detail.value ?? '').trim();
  query.value = value;
  error.value = '';

  if (value.length < 2) {
    results.value = [];
    return;
  }

  loading.value = true;
  try {
    const res = await apiClient.get('/farmers', {
      params: { search: value, page: 1 },
    });
    results.value = res.data?.data?.data ?? [];
  } catch (err: any) {
    results.value = [];
    error.value = err?.response?.data?.message || 'Search failed. Check connection.';
  } finally {
    loading.value = false;
  }
};

const openActions = (f: any) => {
  selected.value = f;
  sheetOpen.value = true;
};
</script>

<style scoped>
.page-bg { --background: #f4f8f5; }

.hint {
  margin: 0.85rem 1rem 0.5rem;
  font-size: 0.82rem;
  color: #64748b;
  line-height: 1.4;
}

.idle {
  text-align: center;
  padding: 3rem 1.5rem;
  color: #94a3b8;
}
.idle ion-icon {
  font-size: 2.4rem;
  color: #1a4731;
  opacity: 0.35;
  margin-bottom: 0.5rem;
}
.idle.error { color: #b91c1c; }

.result-list {
  background: transparent;
  padding: 0 0.5rem 2rem;
}

ion-item {
  --background: #fff;
  --border-radius: 12px;
  margin: 0.4rem 0.35rem;
  border: 1px solid #d5e3da;
  border-radius: 12px;
  --padding-start: 14px;
}

ion-label h2 {
  margin: 0;
  font-weight: 800;
  color: #1a4731;
  font-size: 1rem;
}

ion-label p {
  margin: 0.15rem 0 0;
  color: #64748b;
  font-size: 0.82rem;
}

ion-label p.rsbsa {
  color: #8a6d12;
  font-weight: 700;
  font-family: ui-monospace, monospace;
  font-size: 0.78rem;
}
</style>
