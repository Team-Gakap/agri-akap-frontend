import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient from '../utils/axios';
import { ensureApiBaseUrl } from '../utils/apiBase';
import router, { homeForRole } from '../router';
import { pendingQueueCount, getDeviceId } from '@/services/db';

export type UserRole = 'admin' | 'technician' | 'barangay_official';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assigned_barangay?: string | null;
}

const INACTIVITY_MS = 60 * 60 * 1000; // 60 minutes — matches Sanctum token expiry
const ACTIVITY_KEY = 'agri_last_activity';
const LOCKED_KEY = 'agri_session_locked';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(JSON.parse(localStorage.getItem('user') || 'null'));
  const token = ref<string | null>(localStorage.getItem('token') || null);
  const sessionLocked = ref(localStorage.getItem(LOCKED_KEY) === '1');
  const lockReason = ref<string | null>(null);
  const lastActivityAt = ref<number>(Number(localStorage.getItem(ACTIVITY_KEY) || Date.now()));

  let inactivityTimer: ReturnType<typeof setInterval> | null = null;
  let activityWired = false;
  let handlingUnauthorized = false;

  const isAuthenticated = computed(() => !!token.value && !sessionLocked.value);
  const userRole = computed(() => user.value?.role ?? null);
  const userName = computed(() => user.value?.name ?? null);
  const lockedEmail = computed(() => user.value?.email ?? '');

  const persistActivity = (ts: number) => {
    lastActivityAt.value = ts;
    localStorage.setItem(ACTIVITY_KEY, String(ts));
  };

  const touchActivity = () => {
    if (!token.value || sessionLocked.value) return;
    persistActivity(Date.now());
  };

  /**
   * Soft-lock: drop the bearer token so the device is unusable, but keep the
   * user profile and IndexedDB queue so field data can be uploaded after re-auth.
   */
  const lockSession = (reason?: string) => {
    if (sessionLocked.value && !token.value) {
      lockReason.value = reason || lockReason.value;
      return;
    }
    token.value = null;
    localStorage.removeItem('token');
    sessionLocked.value = true;
    localStorage.setItem(LOCKED_KEY, '1');
    lockReason.value = reason
      || 'Your session has expired, but you have unsynced field data. Please re-authenticate to safely upload your records.';
    if (router.currentRoute.value.path !== '/session-lock') {
      router.push('/session-lock');
    }
  };

  const clearLockFlags = () => {
    sessionLocked.value = false;
    lockReason.value = null;
    localStorage.removeItem(LOCKED_KEY);
  };

  /**
   * Hard logout — clears auth state. IndexedDB queue is intentionally preserved
   * so offline captures are never wiped by an auth wipe.
   */
  const clearAuthState = () => {
    token.value = null;
    user.value = null;
    clearLockFlags();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const checkInactivity = () => {
    if (!user.value) return;
    // Only soft-lock when we still have a usable session identity.
    if (!token.value && !sessionLocked.value) return;
    if (sessionLocked.value) return;

    const elapsed = Date.now() - lastActivityAt.value;
    if (elapsed >= INACTIVITY_MS) {
      lockSession(
        'Your session locked after 60 minutes of inactivity. Re-enter your password to continue. Offline field data is preserved.'
      );
    }
  };

  const onActivityEvent = () => touchActivity();

  const startInactivityWatcher = () => {
    checkInactivity();
    if (inactivityTimer) return;
    inactivityTimer = setInterval(checkInactivity, 30_000);

    if (!activityWired && typeof window !== 'undefined') {
      activityWired = true;
      ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach((evt) => {
        window.addEventListener(evt, onActivityEvent, { passive: true });
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          checkInactivity();
        }
      });
    }
  };

  const stopInactivityWatcher = () => {
    if (inactivityTimer) {
      clearInterval(inactivityTimer);
      inactivityTimer = null;
    }
  };

  /**
   * Offline-aware 401 handler. Never clears IndexedDB.
   * Sync attempts with pending queue → lock screen; otherwise → login.
   */
  const handleUnauthorized = async (requestUrl = '') => {
    if (handlingUnauthorized) return;
    handlingUnauthorized = true;
    try {
      const url = requestUrl.toLowerCase();
      if (url.includes('/login')) return;

      const pending = await pendingQueueCount();
      const isSyncAttempt = url.includes('/sync');

      if (pending > 0 || isSyncAttempt) {
        lockSession(
          'Your session has expired, but you have unsynced field data. Please re-authenticate to safely upload your records.'
        );
        return;
      }

      clearAuthState();
      stopInactivityWatcher();
      if (router.currentRoute.value.name !== 'Login') {
        router.push('/login');
      }
    } finally {
      handlingUnauthorized = false;
    }
  };

  /**
   * Called on app init to validate a cached token against the server.
   * Offline / locked sessions skip the network check so field data stays reachable.
   */
  const restoreSession = async () => {
    startInactivityWatcher();

    if (sessionLocked.value) {
      if (router.currentRoute.value.path !== '/session-lock') {
        router.push('/session-lock');
      }
      return;
    }

    if (!token.value) return;

    checkInactivity();
    if (sessionLocked.value) return;

    // Offline: keep local session; inactivity watcher still enforces the soft lock.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    try {
      const res = await apiClient.get('/me');
      user.value = res.data.data?.user ?? res.data.data ?? res.data.user;
      localStorage.setItem('user', JSON.stringify(user.value));
      touchActivity();
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401) {
        await handleUnauthorized('/me');
      }
      // Network errors while offline-ish: keep token; do not wipe queue.
    }
  };

  const login = async (credentials: { email: string; password: string; device_name: string }) => {
    try {
      apiClient.defaults.baseURL = await ensureApiBaseUrl();
      const response = await apiClient.post('/login', credentials);
      const data = response.data.data;

      token.value = data.access_token;
      user.value = data.user;
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      clearLockFlags();
      persistActivity(Date.now());
      startInactivityWatcher();

      router.replace(homeForRole(user.value?.role ?? null));

      return { success: true };
    } catch (error: any) {
      // No response at all means the request never reached the backend
      // (offline, wrong LAN IP, firewall, or blocked cleartext HTTP) —
      // that is a different problem than wrong credentials, so say so.
      const message = error.response?.data?.message
        ?? (error.request
          ? 'Cannot reach the server. Check your internet connection.'
          : 'Login failed.');
      return {
        success: false,
        message,
      };
    }
  };

  /** Re-auth from the session lock screen — preserves IndexedDB and resumes home. */
  const reauthenticate = async (password: string) => {
    const email = user.value?.email;
    if (!email) {
      return { success: false, message: 'No cached user. Please sign in from the login page.' };
    }
    const result = await login({
      email,
      password,
      device_name: getDeviceId(),
    });
    return result;
  };

  const logout = async () => {
    if (token.value) {
      try {
        await apiClient.post('/logout');
      } catch {
        // ignore — token may already be expired
      }
    }
    clearAuthState();
    stopInactivityWatcher();
    if (router.currentRoute.value.fullPath !== '/login') {
      router.replace('/login');
    }
  };

  return {
    user,
    token,
    sessionLocked,
    lockReason,
    lastActivityAt,
    isAuthenticated,
    userRole,
    userName,
    lockedEmail,
    login,
    logout,
    restoreSession,
    touchActivity,
    checkInactivity,
    startInactivityWatcher,
    lockSession,
    reauthenticate,
    handleUnauthorized,
  };
});
