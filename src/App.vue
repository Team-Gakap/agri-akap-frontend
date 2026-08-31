<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { onMounted, onUnmounted } from 'vue';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { useSyncStore } from '@/stores/syncStore';
import { useAuthStore } from '@/stores/authStore';
import { applyNativeChrome } from '@/utils/nativeChrome';

const syncStore = useSyncStore();
const authStore = useAuthStore();

let resumeListenerHandle: { remove: () => void } | null = null;

onMounted(async () => {
  await applyNativeChrome();
  syncStore.init();
  // Validate cached token; start inactivity watcher; honor soft-lock without wiping IndexedDB.
  await authStore.restoreSession();
  authStore.startInactivityWatcher();

  // A technician's phone regains signal most often while the app is backgrounded
  // (in a pocket). Re-probe connectivity and flush the queue as soon as we resume.
  if (Capacitor.isNativePlatform()) {
    resumeListenerHandle = await CapacitorApp.addListener('resume', () => {
      void syncStore.recheck();
    });
  }
});

onUnmounted(() => {
  resumeListenerHandle?.remove();
  syncStore.teardown();
});
</script>
