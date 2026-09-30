<template>
  <span v-if="show" class="walkin-chip">{{ label || 'Unverified Walk-in' }}</span>
</template>

<script setup lang="ts">
defineProps<{ show?: boolean; label?: string }>();
</script>

<style scoped>
.walkin-chip {
  display: inline-block;
  margin-left: 0.35rem;
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
  background: #fef3c7;
  color: #92400e;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  vertical-align: middle;
  white-space: nowrap;
}
</style>
