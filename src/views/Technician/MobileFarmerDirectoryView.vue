<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tech/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>Find Farmer</ion-title>
      </ion-toolbar>
      <ion-toolbar color="primary">
        <ion-searchbar
          v-model="query"
          placeholder="Type farmer number or last name…"
          :debounce="350"
          show-clear-button="focus"
          @ionInput="onSearch"
          style="--background:#fff;--color:#0f172a;"
        ></ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content class="page-bg">
      <p class="hint">
        Search farmers in Echague, then choose an action.
      </p>

      <ion-card v-if="selected" class="selected-card">
        <ion-card-content>
          <p class="sel-label">Selected farmer</p>
          <h2>{{ formatName(selected) }}</h2>
          <p class="rsbsa">{{ selected.rsbsa_no || 'No RSBSA' }}</p>
          <p>{{ selected.permanent_brgy || '—' }} · {{ selected.mobile_number || 'No mobile' }}</p>
          <ion-button expand="block" class="act-btn subsidy" @click="goSubsidy">
            Give Subsidy
          </ion-button>
          <ion-button expand="block" fill="outline" class="act-btn" @click="goPest">
            Check Pests
          </ion-button>
          <ion-button expand="block" fill="outline" class="act-btn" @click="goCalamity">
            Check Calamity Damage
          </ion-button>
          <ion-button expand="block" fill="clear" color="medium" @click="selected = null">
            Clear selection
          </ion-button>
        </ion-card-content>
      </ion-card>

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
          :class="{ active: selected?.id === f.id }"
          @click="openActions(f)"
        >
          <ion-label>
            <h2>{{ formatName(f) }}</h2>
            <p class="rsbsa">{{ f.rsbsa_no || 'No RSBSA' }}</p>
            <p>{{ f.permanent_brgy || '—' }} · {{ f.mobile_number || 'No mobile' }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonSearchbar, IonList, IonItem, IonLabel, IonSpinner, IonIcon, IonCard, IonCardContent,
  IonButton,
} from '@ionic/vue';
import { searchOutline } from 'ionicons/icons';
import { searchFarmers } from '@/services/syncService';

const router = useRouter();
const query = ref('');
const results = ref<any[]>([]);
const loading = ref(false);
const error = ref('');
const selected = ref<any | null>(null);

const formatName = (f: any) => {
  if (!f?.surname) return 'Unknown farmer';
  return `${f.surname}, ${[f.first_name, f.middle_name, f.ext_name].filter(Boolean).join(' ')}`;
};

const farmerQuery = (f: any) => ({
  farmer: f.id,
  rsbsa: f.rsbsa_no || '',
  name: formatName(f),
  barangay: f.permanent_brgy || '',
});

const goSubsidy = () => {
  if (!selected.value) return;
  router.push({ path: '/tech/subsidy-dispense', query: farmerQuery(selected.value) });
};

const goPest = () => {
  if (!selected.value) return;
  router.push({ path: '/tech/pest-validation', query: farmerQuery(selected.value) });
};

const goCalamity = () => {
  if (!selected.value) return;
  router.push({ path: '/tech/calamity-rdana', query: farmerQuery(selected.value) });
};

const onSearch = async (e: CustomEvent) => {
  const value = String(e.detail.value ?? '').trim();
  query.value = value;
  error.value = '';
  selected.value = null;

  if (value.length < 2) {
    results.value = [];
    return;
  }

  loading.value = true;
  try {
    results.value = await searchFarmers(value);
  } catch (err: any) {
    results.value = [];
    error.value = err?.response?.data?.message || 'Search failed. Check connection.';
  } finally {
    loading.value = false;
  }
};

const openActions = (f: any) => {
  selected.value = f;
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

.selected-card {
  margin: 0.5rem 0.85rem 0.75rem;
  border-radius: 14px;
  border: 1px solid #c5d9cc;
  border-left: 5px solid #1a4731;
}

.sel-label {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
}

.selected-card h2 {
  margin: 0.2rem 0 0;
  font-size: 1.12rem;
  font-weight: 800;
  color: #1a4731;
}

.selected-card p {
  margin: 0.15rem 0 0;
  color: #64748b;
  font-size: 0.85rem;
}

.selected-card p.rsbsa,
ion-label p.rsbsa {
  color: #8a6d12;
  font-weight: 700;
  font-family: ui-monospace, monospace;
  font-size: 0.78rem;
}

.act-btn {
  margin-top: 0.55rem;
  text-transform: none;
  font-weight: 800;
}

.act-btn.subsidy {
  --background: #1a4731;
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

ion-item.active {
  border-color: #1a4731;
  box-shadow: 0 0 0 2px rgba(26, 71, 49, 0.12);
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
</style>
