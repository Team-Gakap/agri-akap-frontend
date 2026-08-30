<template>
  <ion-page>
    <AppHeader />

    <ion-content class="auth-bg">
      <div class="shell">
        <div class="page-head">
          <h1>Outreach &amp; Communications</h1>
          <p>Broadcast SMS advisories via Semaphore to targeted farmers.</p>
        </div>

        <div class="workspace">
          <section class="composer-col">
            <div
              class="weather-banner"
              :class="advisory?.has_advisory ? 'alert' : 'calm'"
            >
              <div v-if="advisoryLoading" class="weather-loading">
                <ion-spinner name="crescent" color="primary"></ion-spinner>
                <span>Checking tomorrow’s forecast…</span>
              </div>
              <template v-else-if="advisory?.has_advisory">
                <div class="weather-copy">
                  <strong>⚠️ {{ weatherHeadline }}</strong>
                  <p>{{ weatherSummary }}</p>
                </div>
                <div class="weather-actions">
                  <button type="button" class="insert-btn" @click="insertWeatherTemplate">
                    + Insert Weather Advisory Template
                  </button>
                  <button
                    type="button"
                    class="send-weather-btn"
                    :disabled="isSendingWeather"
                    @click="sendWeatherWarningNow"
                  >
                    {{ isSendingWeather ? 'Sending…' : 'Send warnings now' }}
                  </button>
                </div>
              </template>
              <p v-else class="weather-empty">
                {{ advisory?.reason || 'No barangay exceeds rain ≥ 80%, max temp ≥ 38°C, or wind > 15 km/h tomorrow.' }}
              </p>
            </div>

            <div class="composer-card">
              <h2>Compose Advisory</h2>
              <div class="tag-row">
                <button
                  v-for="tag in MERGE_TAGS"
                  :key="tag.token"
                  type="button"
                  class="tag-chip"
                  @click="insertTag(tag.token)"
                >
                  + {{ tag.label }}
                </button>
              </div>
              <textarea
                v-model="form.message"
                class="compose-area"
                rows="6"
                maxlength="459"
                placeholder="Type your official MAO advisory here…"
              ></textarea>
              <div class="sms-meter" :class="{ warn: smsMeter.parts > 1, danger: smsMeter.parts > 2 }">
                <span>{{ smsMeter.chars }} / {{ smsMeter.limit }} characters</span>
                <span v-if="smsMeter.parts <= 1">· {{ smsMeter.parts || 0 }} SMS credit per recipient</span>
                <span v-else>· ⚠️ {{ smsMeter.parts }} SMS parts (Costs {{ smsMeter.parts }} credits per farmer)</span>
              </div>

              <div class="audience">
                <div class="audience-head">
                  <h3>Audience Targeting</h3>
                  <label class="commodity-field">
                    <span>Commodity</span>
                    <select v-model="form.target_commodity">
                      <option value="All">All Farmers</option>
                      <option v-for="c in commodities" :key="c" :value="c">{{ c }}</option>
                    </select>
                  </label>
                </div>

                <div class="bulk-row">
                  <button type="button" class="bulk-btn" @click="selectAllBarangays">
                    Select All ({{ barangays.length }})
                  </button>
                  <button type="button" class="bulk-btn" @click="clearBarangays">Clear All</button>
                  <button type="button" class="bulk-btn" @click="selectCluster('am')">A–M</button>
                  <button type="button" class="bulk-btn" @click="selectCluster('nz')">N–Z</button>
                </div>

                <p class="selected-count">
                  Selected: {{ selectedBarangays.length }} / {{ barangays.length }} Barangays
                  (Est. {{ estimatedRecipients.toLocaleString('en-PH') }} Farmers)
                </p>

                <div class="brgy-grid" role="group" aria-label="Target barangays">
                  <label
                    v-for="b in barangays"
                    :key="b"
                    class="brgy-chip"
                    :class="{ on: selectedBarangays.includes(b) }"
                  >
                    <input
                      type="checkbox"
                      :checked="selectedBarangays.includes(b)"
                      @change="onBrgyCheck(b, $event)"
                    />
                    <span>{{ b }}</span>
                  </label>
                  <p v-if="!barangays.length" class="empty-brgy">No barangays loaded.</p>
                </div>
              </div>

              <div class="send-bar">
                <div class="gateway">
                  <span class="dot"></span>
                  Gateway: Semaphore Connected
                </div>
                <ion-button
                  class="send-btn"
                  :disabled="isSending || !form.message.trim() || !selectedBarangays.length"
                  @click="confirmSend"
                >
                  <ion-icon slot="start" :icon="sendOutline"></ion-icon>
                  {{ isSending ? 'Sending…' : 'Send Broadcast' }}
                </ion-button>
              </div>
            </div>
          </section>

          <aside class="preview-col">
            <div class="phone-card">
              <h2>Live Mobile Preview</h2>
              <div class="phone">
                <div class="phone-notch"></div>
                <div class="phone-status">
                  <span>{{ clock }}</span>
                  <span>LTE</span>
                </div>
                <div class="phone-header">MAO-ECHAGUE</div>
                <div class="phone-thread">
                  <div v-if="previewMessage.trim()" class="sms-bubble">
                    {{ previewMessage }}
                  </div>
                  <p v-else class="sms-placeholder">Your advisory will appear here as a farmer would see it.</p>
                </div>
                <div class="phone-meta">{{ smsMeter.parts || 0 }} SMS · {{ smsMeter.chars }} chars</div>
              </div>
            </div>

            <div class="log-card">
              <h2>Recent Broadcast History</h2>
              <div v-if="isLoadingLogs" class="log-state">
                <ion-spinner name="crescent" color="primary"></ion-spinner>
              </div>
              <EmptyState
                v-else-if="!logs.length"
                variant="documents"
                message="No broadcasts yet. Compose a message to reach farmers."
              />
              <ul v-else class="log-list">
                <li v-for="log in logs" :key="log.id">
                  <div class="log-top">
                    <strong>{{ logTitle(log) }}</strong>
                    <span class="log-status" :class="log.status === 'Sent' ? 'ok' : 'fail'">
                      {{ log.status === 'Sent' ? `Delivered (${log.recipient_count}/${log.recipient_count})` : 'Failed' }}
                    </span>
                  </div>
                  <p class="log-meta">{{ logMeta(log) }}</p>
                  <button type="button" class="details-btn" @click="openLog(log)">View Details</button>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </ion-content>

    <ion-alert
      :is-open="showConfirm"
      header="Confirm Broadcast"
      :message="confirmHtml"
      :buttons="[
        { text: 'Cancel', role: 'cancel', handler: () => { showConfirm = false; } },
        { text: 'Send Now', role: 'confirm', cssClass: 'alert-confirm-btn', handler: () => sendBroadcast() },
      ]"
      @didDismiss="showConfirm = false"
    ></ion-alert>

    <ion-alert
      :is-open="!!detailLog"
      header="Broadcast Details"
      :message="detailHtml"
      :buttons="[{ text: 'Close', role: 'cancel' }]"
      @didDismiss="detailLog = null"
    ></ion-alert>
  </ion-page>
</template>

<script setup lang="ts">
import AppHeader from '@/components/Navigation/AppHeader.vue';
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton,
  IonButton, IonIcon, IonSpinner, IonAlert, toastController,
} from '@ionic/vue';
import { sendOutline } from 'ionicons/icons';
import axiosInstance from '@/utils/axios';
import EmptyState from '@/components/EmptyState.vue';

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

const MERGE_TAGS = [
  { token: '{Farmer_Name}', label: 'Farmer Name' },
  { token: '{Barangay}', label: 'Barangay' },
  { token: '{Program_Name}', label: 'Program Name' },
  { token: '{Distribution_Date}', label: 'Distribution Date' },
];

const GSM_RE = /^[\x00-\x7F]*$/;

const route = useRoute();
const form = reactive({ message: '', target_commodity: 'All' });
const selectedBarangays = ref<string[]>([]);
const isSending = ref(false);
const isSendingWeather = ref(false);
const logs = ref<any[]>([]);
const isLoadingLogs = ref(true);
const barangays = ref<string[]>([]);
const commodities = ref<string[]>([]);
const showConfirm = ref(false);
const detailLog = ref<any | null>(null);
const advisory = ref<WeatherAdvisory | null>(null);
const advisoryLoading = ref(true);
const estimatedRecipients = ref(0);
const clock = ref('');
let previewTimer: ReturnType<typeof setTimeout> | undefined;
let clockTimer: ReturnType<typeof setInterval> | undefined;

const advisoryItems = computed(() => {
  const a = advisory.value;
  if (!a?.has_advisory) return [] as WeatherAdvisoryItem[];
  if (a.advisories?.length) return a.advisories;
  return [a];
});

const affectedBarangays = computed(() =>
  [...new Set(advisoryItems.value.map((i) => i.barangay).filter(Boolean))] as string[]
);

const weatherHeadline = computed(() => {
  const n = affectedBarangays.value.length;
  const type = advisoryItems.value[0]?.alert_type || 'Weather Alert';
  if (n <= 1) return `${type}: 1 barangay at risk`;
  return `${type}: ${n} barangays at risk`;
});

const weatherSummary = computed(() => {
  const names = affectedBarangays.value;
  if (!names.length) return advisoryItems.value[0]?.message || '';
  return `${names.slice(0, 4).join(', ')}${names.length > 4 ? ` +${names.length - 4} more` : ''}.`;
});

const smsMeter = computed(() => {
  const text = form.message;
  const chars = text.length;
  const gsm = GSM_RE.test(text);
  if (!chars) return { chars: 0, limit: 160, parts: 0 };
  if (gsm) {
    if (chars <= 160) return { chars, limit: 160, parts: 1 };
    const parts = Math.ceil(chars / 153);
    return { chars, limit: parts * 153, parts };
  }
  if (chars <= 70) return { chars, limit: 70, parts: 1 };
  const parts = Math.ceil(chars / 67);
  return { chars, limit: parts * 67, parts };
});

const interpolate = (text: string) => {
  const sampleBrgy = selectedBarangays.value[0] || 'Arabiat';
  const program = form.target_commodity === 'All'
    ? 'MAO Subsidy Program'
    : `${form.target_commodity} Program`;
  const date = new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
  return text
    .replaceAll('{Farmer_Name}', 'Juan Dela Cruz')
    .replaceAll('{Barangay}', sampleBrgy)
    .replaceAll('{Program_Name}', program)
    .replaceAll('{Distribution_Date}', date);
};

const previewMessage = computed(() => interpolate(form.message));

const barangaySummary = computed(() => {
  if (!selectedBarangays.value.length) return 'No barangay selected';
  if (barangays.value.length && selectedBarangays.value.length === barangays.value.length) {
    return 'All barangays';
  }
  return selectedBarangays.value.join(', ');
});

const confirmHtml = computed(() =>
  `Send to: ${barangaySummary.value} · ${form.target_commodity}<br/><br/>&quot;${escapeHtml(previewMessage.value)}&quot;<br/><br/>Est. ${estimatedRecipients.value} farmers · ${smsMeter.value.parts || 1} SMS credit(s) each.`
);

const detailHtml = computed(() => {
  const log = detailLog.value;
  if (!log) return '';
  return `${escapeHtml(log.message_body || '')}<br/><br/>${escapeHtml(logMeta(log))}`;
});

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const logTitle = (log: any) => {
  const body = String(log.message_body || '').replace(/\s+/g, ' ').trim();
  if (log.trigger_type === 'Automated_Weather') return log.alert_type || 'Weather Advisory';
  if (body.length <= 52) return body || 'MAO Advisory';
  return `${body.slice(0, 52)}…`;
};

const logMeta = (log: any) => {
  const brgy = String(log.target_barangay || 'All');
  const crop = String(log.target_commodity || 'All');
  const cropLabel = crop === 'All' ? 'All Commodities' : `${crop} Only`;
  const where = brgy === 'All' ? 'All Barangays' : brgy;
  const when = log.created_at
    ? new Date(log.created_at).toLocaleString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })
    : '';
  return `Sent to ${where} · ${cropLabel}${when ? ` · ${when}` : ''}`;
};

const showToast = async (msg: string, color: 'success' | 'danger' = 'success') => {
  const t = await toastController.create({ message: msg, duration: 3000, color, position: 'top' });
  await t.present();
};

const insertTag = (token: string) => {
  const cur = form.message;
  const pad = cur && !cur.endsWith(' ') && !cur.endsWith('\n') ? ' ' : '';
  if (cur.length + pad.length + token.length > 459) return;
  form.message = `${cur}${pad}${token}`;
};

const toggleBarangay = (name: string, checked: boolean) => {
  if (checked) {
    selectedBarangays.value = Array.from(new Set([...selectedBarangays.value, name]));
    return;
  }
  selectedBarangays.value = selectedBarangays.value.filter((b) => b !== name);
};

const onBrgyCheck = (name: string, ev: Event) => {
  toggleBarangay(name, (ev.target as HTMLInputElement).checked);
};

const selectAllBarangays = () => {
  selectedBarangays.value = [...barangays.value];
};

const clearBarangays = () => {
  selectedBarangays.value = [];
};

const selectCluster = (zone: 'am' | 'nz') => {
  const slice = barangays.value.filter((b) => {
    const ch = (b.trim()[0] || 'A').toUpperCase();
    return zone === 'am' ? ch <= 'M' : ch > 'M';
  });
  selectedBarangays.value = Array.from(new Set([...selectedBarangays.value, ...slice]));
};

const insertWeatherTemplate = () => {
  const items = advisoryItems.value;
  if (!items.length) return;
  const msg = items[0]?.message || advisory.value?.message || '';
  form.message = String(msg).slice(0, 459);
  if (affectedBarangays.value.length) {
    selectedBarangays.value = [...affectedBarangays.value];
  }
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
    // fallback
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

const refreshAudience = async () => {
  try {
    const res = await axiosInstance.post('/broadcasts/preview', {
      target_barangays: selectedBarangays.value.length === barangays.value.length
        ? []
        : selectedBarangays.value,
      target_commodity: form.target_commodity,
    });
    estimatedRecipients.value = Number(res.data?.data?.recipient_count ?? 0);
  } catch {
    estimatedRecipients.value = 0;
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

const confirmSend = async () => {
  if (!selectedBarangays.value.length) {
    await showToast('Select at least one barangay.', 'danger');
    return;
  }
  if (smsMeter.value.parts > 3) {
    await showToast('Message is too long for SMS (max 3 parts).', 'danger');
    return;
  }
  showConfirm.value = true;
};

const sendBroadcast = async () => {
  showConfirm.value = false;
  isSending.value = true;
  try {
    const all = selectedBarangays.value.length === barangays.value.length;
    const res = await axiosInstance.post('/broadcasts/send', {
      message_body: form.message,
      target_barangays: all ? [] : selectedBarangays.value,
      target_commodity: form.target_commodity,
    });
    await showToast(res.data.message ?? 'Broadcast sent successfully!', 'success');
    form.message = '';
    fetchLogs();
    refreshAudience();
  } catch (err: any) {
    await showToast(err.response?.data?.message ?? 'Broadcast failed.', 'danger');
  } finally {
    isSending.value = false;
  }
};

const openLog = (log: any) => {
  detailLog.value = log;
};

const applyQueryPrefill = () => {
  const msg = route.query.message;
  if (typeof msg === 'string' && msg.trim()) {
    form.message = msg.slice(0, 459);
  }
  const raw = route.query.barangays;
  if (typeof raw === 'string' && raw.trim()) {
    const names = raw.split('|').map((s) => s.trim()).filter(Boolean);
    if (names.length) selectedBarangays.value = names;
  }
};

const tickClock = () => {
  clock.value = new Date().toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
};

watch(
  [selectedBarangays, () => form.target_commodity],
  () => {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => { void refreshAudience(); }, 350);
  },
  { deep: true },
);

onMounted(async () => {
  tickClock();
  clockTimer = setInterval(tickClock, 30000);
  await Promise.all([fetchLogs(), fetchFilters(), fetchAdvisory()]);
  applyQueryPrefill();
  if (!selectedBarangays.value.length && barangays.value.length) {
    selectedBarangays.value = [...barangays.value];
  }
  await refreshAudience();
});

onUnmounted(() => {
  clearTimeout(previewTimer);
  if (clockTimer) clearInterval(clockTimer);
});
</script>

<style scoped>
.auth-bg { --background: #f4f8f5; }
.shell {
  max-width: 1280px;
  margin: 0 auto;
  padding: 1rem 1.1rem 2rem;
}
.page-head h1 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
  color: #1a4731;
}
.page-head p {
  margin: 0.2rem 0 0;
  color: #5f7268;
  font-size: 0.9rem;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr);
  gap: 14px;
  margin-top: 1rem;
  align-items: start;
}

.weather-banner {
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 0.85rem 1rem;
  margin-bottom: 12px;
}
.weather-banner.calm { border-left: 4px solid #94a3b8; }
.weather-banner.alert {
  border-left: 4px solid #d4af37;
  background: #fffbeb;
}
.weather-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 0.88rem;
}
.weather-copy strong { color: #92400e; font-size: 0.95rem; }
.weather-copy p { margin: 0.25rem 0 0; color: #78350f; font-size: 0.85rem; }
.weather-empty { margin: 0; color: #475569; font-size: 0.88rem; line-height: 1.45; }
.weather-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 0.7rem; }
.insert-btn, .send-weather-btn {
  font-family: inherit;
  font-weight: 800;
  font-size: 0.78rem;
  border-radius: 8px;
  padding: 7px 12px;
  cursor: pointer;
}
.insert-btn { background: #1a4731; color: #fff; border: 0; }
.send-weather-btn { background: #fff; color: #92400e; border: 1px solid #f59e0b; }

.composer-card, .phone-card, .log-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  padding: 1rem 1.05rem 1.1rem;
}
.composer-card h2, .phone-card h2, .log-card h2 {
  margin: 0 0 0.7rem;
  font-size: 1rem;
  font-weight: 800;
  color: #1a4731;
}

.tag-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.tag-chip {
  border: 1px dashed #1a4731;
  background: #f0f7f2;
  color: #1a4731;
  font-size: 0.72rem;
  font-weight: 700;
  font-family: inherit;
  padding: 4px 8px;
  border-radius: 999px;
  cursor: pointer;
}
.compose-area {
  width: 100%;
  min-height: 140px;
  resize: vertical;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 0.75rem 0.85rem;
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.45;
  color: #0f172a;
  background: #f8fafc;
  box-sizing: border-box;
}
.sms-meter {
  margin-top: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #475569;
  text-align: right;
}
.sms-meter.warn { color: #b45309; }
.sms-meter.danger { color: #b91c1c; }

.audience { margin-top: 1.15rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; }
.audience-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 0.65rem;
}
.audience h3 {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 800;
  color: #1a4731;
}
.commodity-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 0.7rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.commodity-field select {
  min-width: 160px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.4rem 0.55rem;
  font-size: 0.85rem;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
  color: #0f172a;
  background: #fff;
  font-family: inherit;
}

.bulk-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.bulk-btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #1a4731;
  font-size: 0.74rem;
  font-weight: 700;
  font-family: inherit;
  padding: 5px 10px;
  border-radius: 999px;
  cursor: pointer;
}
.bulk-btn:hover { background: #e8f5e9; }
.selected-count {
  margin: 0 0 8px;
  font-size: 0.82rem;
  font-weight: 700;
  color: #1a4731;
}

.brgy-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.brgy-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #0f172a;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
}
.brgy-chip.on {
  background: #e8f5e9;
  border-color: #1a4731;
  color: #14532d;
  font-weight: 800;
}
.brgy-chip input { accent-color: #1a4731; width: 15px; height: 15px; }
.empty-brgy { grid-column: 1 / -1; color: #64748b; font-size: 0.85rem; }

.send-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 1.1rem;
  padding-top: 0.9rem;
  border-top: 1px solid #e2e8f0;
}
.gateway {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.82rem;
  font-weight: 700;
  color: #15803d;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
}
.send-btn {
  --background: #1a4731;
  --color: #fff;
  text-transform: none;
  font-weight: 800;
  margin: 0;
}

.phone {
  max-width: 280px;
  margin: 0 auto;
  background: #0f172a;
  border-radius: 28px;
  padding: 10px 10px 14px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.22);
}
.phone-notch {
  width: 88px;
  height: 8px;
  background: #1e293b;
  border-radius: 999px;
  margin: 4px auto 8px;
}
.phone-status {
  display: flex;
  justify-content: space-between;
  color: #94a3b8;
  font-size: 0.68rem;
  padding: 0 6px 8px;
}
.phone-header {
  background: #1a4731;
  color: #fff;
  text-align: center;
  font-weight: 800;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  padding: 8px;
  border-radius: 8px 8px 0 0;
}
.phone-thread {
  background: #f1f5f9;
  min-height: 168px;
  padding: 12px;
}
.sms-bubble {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 4px 14px 14px 14px;
  padding: 10px 12px;
  font-size: 0.84rem;
  line-height: 1.45;
  color: #0f172a;
  white-space: pre-wrap;
}
.sms-placeholder {
  margin: 0;
  color: #94a3b8;
  font-size: 0.8rem;
  text-align: center;
  padding-top: 2.2rem;
}
.phone-meta {
  color: #94a3b8;
  font-size: 0.68rem;
  text-align: center;
  padding-top: 8px;
}

.log-card { margin-top: 12px; }
.log-state { text-align: center; padding: 1.2rem; }
.log-list { list-style: none; margin: 0; padding: 0; }
.log-list li {
  padding: 0.75rem 0;
  border-bottom: 1px solid #f1f5f9;
}
.log-list li:last-child { border-bottom: 0; }
.log-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: flex-start;
}
.log-top strong {
  color: #0f172a;
  font-size: 0.86rem;
  line-height: 1.3;
}
.log-status {
  font-size: 0.7rem;
  font-weight: 800;
  white-space: nowrap;
}
.log-status.ok { color: #15803d; }
.log-status.fail { color: #b91c1c; }
.log-meta {
  margin: 4px 0 6px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
}
.details-btn {
  border: 0;
  background: none;
  color: #1a4731;
  font-weight: 800;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
}

@media (max-width: 900px) {
  .workspace { grid-template-columns: 1fr; }
  .brgy-grid { grid-template-columns: 1fr; }
}
</style>
