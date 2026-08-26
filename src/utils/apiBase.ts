import { Capacitor } from '@capacitor/core';

const LAN_API = String(import.meta.env.VITE_API_URL || 'http://192.168.1.190:8000/api').replace(/\/$/, '');
const NATIVE_API = String(import.meta.env.VITE_NATIVE_API_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '');

let resolved: string | null = null;

function originOf(apiUrl: string): string {
  return apiUrl.replace(/\/api\/?$/, '');
}

async function isReachable(origin: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 2000);
    // Laravel's `/up` health route. Any HTTP response means the host is reachable.
    await fetch(`${origin}/up`, { method: 'GET', signal: controller.signal });
    window.clearTimeout(timer);
    return true;
  } catch {
    return false;
  }
}

/**
 * API root including `/api`.
 *
 * Native Android prefers 127.0.0.1 (USB `adb reverse tcp:8000 tcp:8000`) so
 * login works even on mobile data. If that tunnel is down, falls back to
 * VITE_API_URL on the LAN.
 */
export function apiBaseUrl(): string {
  return resolved ?? (Capacitor.isNativePlatform() ? NATIVE_API : LAN_API);
}

export function apiOrigin(): string {
  return originOf(apiBaseUrl());
}

export async function ensureApiBaseUrl(): Promise<string> {
  if (!Capacitor.isNativePlatform()) {
    resolved = LAN_API;
    return resolved;
  }
  if (await isReachable(originOf(NATIVE_API))) {
    resolved = NATIVE_API;
  } else {
    resolved = LAN_API;
  }
  return resolved;
}
