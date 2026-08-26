import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import apiClient from '@/utils/axios';

/**
 * Two-layer connectivity model:
 * - `connected`  — the device has an active Wi-Fi/cellular interface
 *   (Capacitor Network plugin natively, `navigator.onLine` on web).
 * - `reachable`   — the Laravel backend actually answered a request recently.
 *
 * `navigator.onLine` alone is not enough on Android: a phone can report an
 * active radio while the backend is unreachable (weak signal, DNS failure,
 * Railway cold start). We only report the app as "online" when both hold.
 */
let connected = typeof navigator === 'undefined' ? true : navigator.onLine;
let reachable = true;
let probing = false;
let consecutiveFailures = 0;
let probeTimer: ReturnType<typeof setInterval> | null = null;
let initialized = false;

const listeners = new Set<(online: boolean) => void>();

function computeOnline(): boolean {
  return connected && reachable;
}

function notify() {
  const online = computeOnline();
  listeners.forEach((cb) => {
    try {
      cb(online);
    } catch {
      /* listener errors must not break connectivity tracking */
    }
  });
}

export function isOnline(): boolean {
  return computeOnline();
}

/** Subscribe to online/offline transitions. Returns an unsubscribe function. */
export function onConnectivityChange(cb: (online: boolean) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** True for axios errors that never reached the server (timeout, DNS, offline). */
export function isNetworkError(err: any): boolean {
  return !!err && !err.response;
}

/** A successful API call is itself proof the backend is reachable. */
export function markReachable(): void {
  consecutiveFailures = 0;
  if (!reachable) {
    reachable = true;
    notify();
  }
}

/** Two consecutive failures (probe or real request) before flipping to offline UI. */
export function markUnreachable(): void {
  consecutiveFailures += 1;
  if (consecutiveFailures >= 2 && reachable) {
    reachable = false;
    notify();
  }
}

async function probeReachability(): Promise<boolean> {
  if (!connected) return false;
  if (probing) return reachable;
  probing = true;
  try {
    await apiClient.get('/ping', { timeout: 6000 });
    markReachable();
    return true;
  } catch (err) {
    if (isNetworkError(err)) {
      markUnreachable();
    } else {
      // Any HTTP response (even 401/404/500) proves the backend is reachable.
      markReachable();
    }
    return reachable;
  } finally {
    probing = false;
  }
}

/** Force an immediate reachability check (e.g. on app resume). */
export async function refreshConnectivity(): Promise<boolean> {
  await probeReachability();
  return isOnline();
}

/** Wire native/web connectivity events + a periodic reachability probe. Call once on app start. */
export function initConnectivity(): void {
  if (initialized) return;
  initialized = true;

  if (Capacitor.isNativePlatform()) {
    Network.getStatus()
      .then((status) => {
        connected = status.connected;
        notify();
        if (connected) void probeReachability();
      })
      .catch(() => {
        /* fall back to optimistic default */
      });

    Network.addListener('networkStatusChange', (status) => {
      const wasConnected = connected;
      connected = status.connected;
      if (connected && !wasConnected) {
        consecutiveFailures = 0;
        reachable = true;
        void probeReachability();
      }
      notify();
    });
  } else if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      connected = true;
      consecutiveFailures = 0;
      reachable = true;
      notify();
      void probeReachability();
    });
    window.addEventListener('offline', () => {
      connected = false;
      notify();
    });
  }

  if (probeTimer) clearInterval(probeTimer);
  probeTimer = setInterval(() => {
    const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    if (connected && !hidden) void probeReachability();
  }, 25000);

  if (connected) void probeReachability();
}
