<template>
  <div class="pw-wrap">
    <ion-item class="custom-input" lines="none">
      <ion-icon :icon="lockClosed" slot="start" class="input-icon"></ion-icon>
      <ion-input
        v-model="model"
        :type="visible ? 'text' : 'password'"
        :label="label"
        label-placement="floating"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
      ></ion-input>
      <ion-button
        fill="clear"
        slot="end"
        class="toggle-password-btn"
        type="button"
        :aria-label="visible ? 'Hide password' : 'Show password'"
        @click="visible = !visible"
      >
        <ion-icon :icon="visible ? eyeOff : eye"></ion-icon>
      </ion-button>
    </ion-item>

    <ul class="pw-rules" aria-live="polite">
      <li
        v-for="rule in evaluated"
        :key="rule.id"
        :class="{ ok: rule.ok, fail: typed && !rule.ok }"
      >
        <ion-icon :icon="rule.ok ? checkmarkCircle : ellipseOutline"></ion-icon>
        {{ rule.label }}
      </li>
      <li v-if="isTemporary" class="fail">
        <ion-icon :icon="closeCircle"></ion-icon>
        Cannot reuse the municipal temporary password
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { AutocompleteTypes } from '@ionic/core';
import { IonItem, IonInput, IonButton, IonIcon } from '@ionic/vue';
import { lockClosed, eye, eyeOff, checkmarkCircle, ellipseOutline, closeCircle } from 'ionicons/icons';
import { PASSWORD_RULES, TEMPORARY_PASSWORD } from '@/utils/passwordPolicy';

const model = defineModel<string>({ default: '' });

withDefaults(defineProps<{
  label?: string;
  placeholder?: string;
  autocomplete?: AutocompleteTypes;
}>(), {
  label: 'New password',
  placeholder: 'Create a strong password',
  autocomplete: 'new-password',
});

const visible = ref(false);
const typed = computed(() => model.value.length > 0);
const isTemporary = computed(() => model.value === TEMPORARY_PASSWORD);
const evaluated = computed(() =>
  PASSWORD_RULES.map((rule) => ({ ...rule, ok: rule.test(model.value) })),
);
</script>

<style scoped>
.pw-wrap { width: 100%; }

.custom-input {
  --background: #ffffff;
  --color: #0f172a;
  --placeholder-color: #94a3b8;
  --highlight-color: transparent;
  --padding-start: 0.7rem;
  --inner-padding-end: 0.35rem;
  min-height: 48px;
  height: 52px;
  margin-bottom: 0.45rem;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.custom-input:focus-within {
  border-color: #1a4731;
  box-shadow: 0 0 0 3px rgba(26, 71, 49, 0.12);
}

.input-icon {
  color: #1a4731;
  font-size: 1.15rem;
  margin-right: 0.35rem;
}

.toggle-password-btn {
  margin: 0;
  --color: #475569;
  --padding-start: 0.4rem;
  --padding-end: 0.5rem;
}

.pw-rules {
  list-style: none;
  margin: 0 0 0.85rem;
  padding: 0.15rem 0.15rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
}

.pw-rules li {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
}

.pw-rules li ion-icon {
  font-size: 0.95rem;
  flex-shrink: 0;
}

.pw-rules li.ok {
  color: #15803d;
}

.pw-rules li.fail {
  color: #b45309;
}
</style>
