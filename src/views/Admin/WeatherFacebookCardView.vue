<template>
  <ion-page>
    <AppHeader />

    <ion-content class="page-bg ion-padding">
      <div class="wrap">
        <header class="hero">
          <div>
            <p class="kicker">Climate Monitoring</p>
            <h1>Facebook rainfall graphic</h1>
            <p class="lede">
              Preview the MAO Echague 24-hour rainfall card from our weather cache, then post it to the office Facebook Page.
            </p>
          </div>
          <router-link class="back-link" to="/admin/weather">← Back to map</router-link>
        </header>

        <div class="toolbar">
          <ion-segment :value="windowKey" @ionChange="onWindowChange">
            <ion-segment-button value="today">
              <ion-label>Today</ion-label>
            </ion-segment-button>
            <ion-segment-button value="tomorrow">
              <ion-label>Tomorrow</ion-label>
            </ion-segment-button>
          </ion-segment>
          <ion-button fill="outline" :disabled="loading" @click="reload">
            {{ loading ? 'Loading…' : 'Refresh preview' }}
          </ion-button>
        </div>

        <div v-if="loading && !preview" class="center-state">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
          <p>Building rainfall graphic…</p>
        </div>

        <div v-else-if="error" class="error-box">
          <strong>Could not build preview.</strong>
          <p>{{ error }}</p>
          <ion-button @click="reload">Try again</ion-button>
        </div>

        <div v-else-if="preview" class="layout">
          <section class="preview-panel">
            <div class="preview-meta">
              <span>{{ preview.validity_label }}</span>
              <span v-if="preview.already_posted" class="warn-pill">Already posted for this window</span>
              <span class="chip" :class="preview.facebook_configured ? 'ok' : 'warn'">
                Facebook {{ preview.facebook_configured ? 'ready' : 'not configured' }}
              </span>
            </div>
            <div class="preview-frame">
              <img
                v-if="previewImageUrl"
                :src="previewImageUrl"
                alt="24-hour rainfall forecast graphic"
                class="preview-img"
              />
              <p v-else class="empty">No image yet.</p>
            </div>
            <div class="actions">
              <ion-button fill="outline" :disabled="!previewImageUrl" @click="downloadPng">
                Download PNG
              </ion-button>
              <ion-button
                class="post-btn"
                :disabled="!canPost || posting"
                @click="confirmPost"
              >
                {{ posting ? 'Posting…' : 'Post to Facebook Page' }}
              </ion-button>
            </div>
            <p v-if="!preview.facebook_configured" class="hint">
              Super Admin must set FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN on the server.
              Preview and download still work without Facebook.
            </p>
            <p class="attr">{{ preview.attribution }}</p>
          </section>

          <aside class="side-panel">
            <h2>Caption</h2>
            <textarea v-model="caption" rows="12" maxlength="2000" />
            <p class="hint">{{ caption.length }}/2000 · editable before posting</p>

            <h2>Legend bands in this graphic</h2>
            <div v-if="!preview.legend?.length" class="empty-block">
              No elevated rainfall bands (all barangays under 5 mm).
            </div>
            <ul v-else class="legend-list">
              <li v-for="block in preview.legend" :key="block.key">
                <span class="swatch" :style="{ background: block.color }"></span>
                <div>
                  <strong>{{ block.label }} ({{ block.range }})</strong>
                  <p>{{ block.barangays.join(', ') }}</p>
                </div>
              </li>
            </ul>

            <h2>Recent posts</h2>
            <div v-if="!history.length" class="empty-block">No Facebook posts yet.</div>
            <ul v-else class="history-list">
              <li v-for="item in history" :key="item.id">
                <strong>{{ item.window }} · {{ item.forecast_date }}</strong>
                <span>{{ formatWhen(item.created_at) }}</span>
                <span>{{ item.posted_by_name || 'MAO admin' }}</span>
                <span class="mono">{{ item.facebook_post_id }}</span>
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import AppHeader from '@/components/Navigation/AppHeader.vue';
import { computed, onMounted, ref } from 'vue';
import {
  IonPage, IonContent, IonButton, IonSpinner, IonSegment, IonSegmentButton, IonLabel,
  alertController,
} from '@ionic/vue';
import apiClient from '@/utils/axios';
import { toast } from '@/utils/toast';

type WindowKey = 'today' | 'tomorrow';

type LegendBlock = {
  key: string;
  label: string;
  range: string;
  color: string;
  barangays: string[];
};

type PreviewPayload = {
  window: WindowKey;
  forecast_date: string;
  validity_label: string;
  attribution: string;
  caption: string;
  legend: LegendBlock[];
  facebook_configured: boolean;
  already_posted: boolean;
  image_url?: string | null;
  has_data: boolean;
};

type HistoryItem = {
  id: string;
  window: string;
  forecast_date: string;
  created_at?: string | null;
  posted_by_name?: string | null;
  facebook_post_id?: string | null;
};

const windowKey = ref<WindowKey>('today');
const loading = ref(false);
const posting = ref(false);
const error = ref('');
const preview = ref<PreviewPayload | null>(null);
const caption = ref('');
const history = ref<HistoryItem[]>([]);
const bust = ref(0);

const canPost = computed(() => Boolean(preview.value?.facebook_configured && preview.value?.has_data && caption.value.trim()));

const previewImageUrl = computed(() => {
  const url = preview.value?.image_url;
  if (!url) return '';
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}_=${bust.value}`;
});

function onWindowChange(e: CustomEvent) {
  const value = e.detail?.value;
  if (value === 'today' || value === 'tomorrow') {
    windowKey.value = value;
    void reload();
  }
}

async function reload() {
  loading.value = true;
  error.value = '';
  try {
    const [cardRes, histRes] = await Promise.all([
      apiClient.get('/weather/facebook-card', { params: { window: windowKey.value } }),
      apiClient.get('/weather/facebook-posts'),
    ]);
    preview.value = cardRes.data?.data ?? null;
    caption.value = preview.value?.caption ?? '';
    history.value = Array.isArray(histRes.data?.data) ? histRes.data.data : [];
    bust.value = Date.now();
  } catch (err: any) {
    error.value = err?.response?.data?.message || err?.message || 'Request failed.';
    preview.value = null;
  } finally {
    loading.value = false;
  }
}

async function downloadPng() {
  try {
    const res = await apiClient.get('/weather/facebook-card.png', {
      params: { window: windowKey.value },
      responseType: 'blob',
      headers: { Accept: 'image/png' },
    });
    const blob = new Blob([res.data], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mao-echague-rainfall-${windowKey.value}-${preview.value?.forecast_date || 'forecast'}.png`;
    a.click();
    URL.revokeObjectURL(url);
    await toast.success('PNG downloaded.');
  } catch (err: any) {
    await toast.error(err?.response?.data?.message || 'Download failed.');
  }
}

async function confirmPost() {
  if (!canPost.value) return;

  const already = preview.value?.already_posted;
  const alert = await alertController.create({
    header: already ? 'Post again?' : 'Post to Facebook?',
    message: already
      ? 'This forecast window was already posted. Post again to the Facebook Page?'
      : 'Publish this rainfall graphic and caption to the MAO Facebook Page?',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: already ? 'Post again' : 'Post',
        role: 'confirm',
        handler: () => { void doPost(Boolean(already)); },
      },
    ],
  });
  await alert.present();
}

async function doPost(force: boolean) {
  posting.value = true;
  try {
    const res = await apiClient.post('/weather/facebook-card/post', {
      window: windowKey.value,
      caption: caption.value.trim(),
      force,
    });
    await toast.success(res.data?.message || 'Posted to Facebook.');
    await reload();
  } catch (err: any) {
    await toast.error(err?.response?.data?.message || 'Facebook post failed.');
  } finally {
    posting.value = false;
  }
}

function formatWhen(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
  } catch {
    return iso;
  }
}

onMounted(() => {
  void reload();
});
</script>

<style scoped>
.page-bg { --background: #f4f8f5; }
.wrap { max-width: 1180px; margin: 0 auto; }
.hero {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}
.kicker { margin: 0; color: #64748b; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; }
h1 { margin: 0.15rem 0 0.35rem; color: #0f172a; font-size: 1.45rem; }
.lede { margin: 0; color: #475569; max-width: 42rem; }
.back-link { color: #1a4731; font-weight: 700; text-decoration: none; white-space: nowrap; }
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1rem;
}
.center-state, .error-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2.5rem 1rem;
  color: #475569;
}
.error-box { background: #fef2f2; border-radius: 12px; color: #991b1b; }
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.9fr);
  gap: 1rem;
}
@media (max-width: 960px) {
  .layout { grid-template-columns: 1fr; }
}
.preview-panel, .side-panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 1rem;
}
.preview-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
  color: #334155;
}
.warn-pill {
  background: #fef3c7;
  color: #92400e;
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  font-weight: 700;
}
.chip {
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  font-weight: 700;
}
.chip.ok { background: #dcfce7; color: #166534; }
.chip.warn { background: #fef3c7; color: #92400e; }
.preview-frame {
  background: #0f2744;
  border-radius: 10px;
  overflow: hidden;
  min-height: 220px;
}
.preview-img { display: block; width: 100%; height: auto; }
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.85rem;
}
.post-btn { --background: #1a4731; }
.hint { margin: 0.55rem 0 0; color: #64748b; font-size: 0.82rem; }
.attr { margin: 0.35rem 0 0; color: #94a3b8; font-size: 0.75rem; }
.side-panel h2 {
  margin: 0 0 0.45rem;
  font-size: 0.95rem;
  color: #0f172a;
}
.side-panel h2 + .hint,
.side-panel textarea + .hint { margin-bottom: 1rem; }
textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
  font: inherit;
  resize: vertical;
  min-height: 180px;
}
.legend-list, .history-list {
  list-style: none;
  margin: 0 0 1.1rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
.legend-list li, .history-list li {
  display: flex;
  gap: 0.55rem;
  align-items: flex-start;
  font-size: 0.82rem;
  color: #334155;
}
.history-list li {
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.55rem 0.65rem;
  background: #f8fafc;
  border-radius: 10px;
}
.swatch {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  margin-top: 3px;
  flex-shrink: 0;
  border: 1px solid rgba(15, 23, 42, 0.15);
}
.legend-list p { margin: 0.15rem 0 0; color: #64748b; }
.empty-block {
  margin: 0 0 1rem;
  padding: 0.7rem;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  color: #64748b;
  font-size: 0.85rem;
}
.mono { font-family: ui-monospace, monospace; font-size: 0.75rem; color: #64748b; word-break: break-all; }
.empty { color: #cbd5e1; padding: 2rem; text-align: center; }
</style>
