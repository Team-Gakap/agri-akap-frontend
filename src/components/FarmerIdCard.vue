<template>
  <article
    class="id-card"
    :class="[
      isPriority ? 'cat-priority' : 'cat-regular',
      printMode ? 'is-print' : 'is-preview',
    ]"
  >
    <div class="id-header">
      <img
        v-if="!logoFailed"
        src="@/assets/images/echague-logo.png"
        alt="MAO Logo"
        class="id-logo"
        @error="logoFailed = true"
      />
      <div class="id-header-text">
        <p class="gov-line-1">REPUBLIC OF THE PHILIPPINES</p>
        <p class="gov-line-2">Municipality of Echague</p>
        <p class="gov-line-3">MUNICIPAL AGRICULTURE OFFICE</p>
      </div>
    </div>

    <div class="id-body">
      <div class="photo-section">
        <div class="photo-box">
          <img v-if="photoUrl" :src="photoUrl" class="photo-img" alt="" />
          <ion-icon v-else :icon="personOutline" class="photo-icon"></ion-icon>
        </div>
        <div class="badge-role">REGISTERED FARMER</div>
      </div>

      <div class="details-section">
        <div class="detail-group">
          <span class="detail-label">FULL NAME</span>
          <span class="detail-value name-value">{{ fullName }}</span>
        </div>
        <div class="detail-group">
          <span class="detail-label">RSBSA NUMBER</span>
          <span class="detail-value rsbsa-value">{{ farmer.rsbsa_no || 'PENDING' }}</span>
        </div>
        <div class="detail-row">
          <div class="detail-group">
            <span class="detail-label">BARANGAY</span>
            <span class="detail-value">{{ farmer.permanent_brgy }}</span>
          </div>
          <div class="detail-group">
            <span class="detail-label">SEX</span>
            <span class="detail-value">{{ farmer.sex }}</span>
          </div>
        </div>
      </div>

      <div class="qr-section">
        <qrcode-vue
          v-if="farmer.id"
          :value="String(farmer.id)"
          :size="printMode ? 70 : 80"
          level="H"
        />
        <p class="qr-label">Scan to Verify</p>
      </div>
    </div>

    <div class="id-footer" :class="isPriority ? 'footer-priority' : 'footer-regular'">
      <span v-if="isPriority" class="footer-star">★</span>
      {{ footerText }}
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { IonIcon } from '@ionic/vue';
import { personOutline } from 'ionicons/icons';
import QrcodeVue from 'qrcode.vue';

const props = withDefaults(
  defineProps<{
    farmer: Record<string, any>;
    printMode?: boolean;
  }>(),
  { printMode: false },
);

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://127.0.0.1:8000';
const logoFailed = ref(false);

const ageOf = (farmer: Record<string, any>): number | null => {
  if (!farmer?.birthdate) return null;
  const bd = new Date(farmer.birthdate);
  const today = new Date();
  let age = today.getFullYear() - bd.getFullYear();
  const m = today.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
  return age;
};

const priorityCategory = computed<'pwd' | 'senior' | 'regular'>(() => {
  const f = props.farmer;
  if (!f) return 'regular';
  if (f.is_pwd) return 'pwd';
  const age = ageOf(f);
  if (age !== null && age >= 60) return 'senior';
  return 'regular';
});

const isPriority = computed(() => priorityCategory.value !== 'regular');

const footerText = computed(() => {
  if (priorityCategory.value === 'pwd') return 'PRIORITY ACCESS — PERSON WITH DISABILITY';
  if (priorityCategory.value === 'senior') return 'PRIORITY ACCESS — SENIOR CITIZEN';
  return 'OFFICIAL GOVERNMENT BENEFICIARY CARD';
});

const fullName = computed(() => {
  const f = props.farmer || {};
  const mi = f.middle_name ? `${String(f.middle_name)[0]}.` : '';
  return [f.first_name, mi, f.surname, f.ext_name].filter(Boolean).join(' ');
});

const photoUrl = computed(() => {
  const path = props.farmer?.photo_path;
  if (!path) return '';
  if (String(path).startsWith('http') || String(path).startsWith('data:')) return path;
  return `${API_BASE}/storage/${path}`;
});
</script>

<style scoped>
.id-card {
  width: 85.6mm;
  height: 53.98mm;
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #d1d5db;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  display: flex;
  flex-direction: column;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  position: relative;
}

.id-card.is-preview {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08);
}

.id-card.is-print {
  border-radius: 4px;
  box-shadow: none;
  border: 0.5px solid #cccccc;
}

.id-card.cat-regular { border-top: 3px solid #1a4731; }
.id-card.cat-priority { border-top: 3px solid #d4af37; }

.id-header {
  background: #1a4731;
  color: #ffffff;
  display: flex;
  align-items: center;
  padding: 5px 10px;
  gap: 7px;
  flex-shrink: 0;
}

.id-logo {
  width: 26px;
  height: 26px;
  background: white;
  border-radius: 50%;
  padding: 1px;
  object-fit: contain;
  flex-shrink: 0;
}

.id-header-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.gov-line-1 {
  margin: 0;
  font-size: 5.5px;
  font-weight: 600;
  letter-spacing: 0.8px;
  opacity: 0.85;
  text-transform: uppercase;
}

.gov-line-2 {
  margin: 0;
  font-size: 7.5px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.gov-line-3 {
  margin: 0;
  font-size: 6px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #d4af37;
}

.id-body {
  display: flex;
  padding: 6px 10px;
  gap: 8px;
  background: #ffffff;
  flex: 1;
  align-items: center;
}

.photo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 56px;
  flex-shrink: 0;
  gap: 3px;
}

.photo-box {
  width: 48px;
  height: 48px;
  background: #f1f5f9;
  border: 1.5px solid #cbd5e1;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.photo-img { width: 100%; height: 100%; object-fit: cover; }
.photo-icon { font-size: 1.6rem; color: #94a3b8; }

.badge-role {
  font-size: 4.5px;
  font-weight: 800;
  background: #1a4731;
  color: white;
  padding: 1.5px 5px;
  border-radius: 2px;
  text-align: center;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  white-space: nowrap;
}

.details-section { flex-grow: 1; min-width: 0; }
.detail-group { display: flex; flex-direction: column; margin-bottom: 3px; }
.detail-row { display: flex; gap: 10px; }

.detail-label {
  font-size: 5px;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  line-height: 1;
}

.detail-value {
  font-size: 8px;
  font-weight: 600;
  color: #1e293b;
  margin-top: 1px;
  line-height: 1.2;
}

.name-value {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  color: #0f172a;
  letter-spacing: 0.02em;
}

.rsbsa-value {
  font-family: 'Courier New', monospace;
  font-size: 9px;
  font-weight: 700;
  color: #1a4731;
  letter-spacing: 0.8px;
}

.qr-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.qr-label {
  font-size: 4.5px;
  color: #94a3b8;
  margin: 0;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.id-footer {
  text-align: center;
  padding: 3.5px 10px;
  font-size: 5.5px;
  font-weight: 800;
  letter-spacing: 1px;
  text-transform: uppercase;
  flex-shrink: 0;
}

.footer-regular {
  background: #1a4731;
  color: #ffffff;
  border-top: 2px solid #143a28;
}

.footer-priority {
  background: linear-gradient(90deg, #d4af37 0%, #f1c94b 50%, #d4af37 100%);
  color: #3a2f00;
  border-top: 2px solid #b8860b;
}

.footer-star { margin-right: 4px; }

.id-header,
.id-footer,
.footer-regular,
.footer-priority,
.badge-role {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
</style>
