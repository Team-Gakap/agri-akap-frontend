<template>
  <header class="mao-form-header">
    <div class="mao-logo-row">
      <div class="mao-logo-slot">
        <img
          src="@/assets/images/echague-logo.png"
          alt="Bayan ng Echague"
          class="mao-logo-img"
        />
      </div>
      <div class="mao-header-text">
        <p class="mao-gov-line">Republic of the Philippines</p>
        <p class="mao-gov-line">Province of Isabela</p>
        <p class="mao-gov-line">Municipality of Echague</p>
        <p v-if="showBarangay" class="mao-brgy-line">
          BARANGAY {{ barangay || '____________' }}
        </p>
        <p v-if="officeTitle" class="mao-office-title">{{ officeTitle }}</p>
        <p v-if="programLine" class="mao-program-line">{{ programLine }}</p>
        <h4 v-if="title" class="mao-doc-title">{{ title }}</h4>
        <slot name="subtitle" />
      </div>
      <div class="mao-logo-slot">
        <img
          src="@/assets/images/bagong-pilipinas-seeklogo.png"
          alt="Bagong Pilipinas"
          class="mao-logo-img"
        />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    barangay?: string;
    showBarangay?: boolean;
    officeTitle?: string;
    programLine?: string;
  }>(),
  {
    title: '',
    barangay: '',
    showBarangay: true,
    officeTitle: '',
    programLine: '',
  },
);
</script>

<style scoped>
.mao-form-header {
  text-align: center;
  margin-bottom: 12px;
}

.mao-logo-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mao-logo-slot {
  width: 78px;
  height: 78px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mao-logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.mao-header-text {
  flex: 1;
  min-width: 0;
}

.mao-gov-line {
  margin: 0;
  font-size: 10pt;
  font-weight: normal;
  line-height: 1.25;
}

.mao-brgy-line {
  margin: 4px 0 0;
  font-size: 11pt;
  font-weight: bold;
  text-transform: uppercase;
}

.mao-office-title {
  margin: 6px 0 0;
  font-size: 12pt;
  font-weight: bold;
  text-transform: uppercase;
}

.mao-program-line {
  margin: 4px 0 0;
  font-size: 11pt;
  font-weight: bold;
  text-transform: uppercase;
}

.mao-doc-title {
  margin: 8px 0 0;
  font-size: 12pt;
  font-weight: bold;
  text-transform: uppercase;
}
</style>
