import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient from '../utils/axios';
import { ensureApiBaseUrl } from '../utils/apiBase';
import router, { homeForRole } from '../router';
import { prefetchFieldCache } from '@/services/syncService';

export type UserRole = 'super_admin' | 'admin' | 'technician' | 'barangay_official';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assigned_barangay?: string | null;
  must_change_password?: boolean;
  is_active?: boolean;
  requires_mfa?: boolean;
}

export type LoginResult =
  | { success: true; mfa_required: true; message?: undefined }
  | { success: true; mfa_required: false; message?: undefined }
  | { success: false; mfa_required: false; message: string };

export interface MfaChallengePayload {
  mfa_required: boolean;
  mfa_challenge_id: string;
  mfa_setup_required: boolean;
  mfa_methods: string[];
  masked_mobile: string | null;
  stored_at?: number;
}

const MFA_KEY = 'agri_mfa_challenge';
const MFA_TTL_MS = 5 * 60 * 1000;
const LEGACY_LOCKED_KEY = 'agri_session_locked';
const LEGACY_ACTIVITY_KEY = 'agri_last_activity';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(JSON.parse(localStorage.getItem('user') || 'null'));
  const token = ref<string | null>(localStorage.getItem('token') || null);
  const mfaChallenge = ref<MfaChallengePayload | null>(null);
  const pendingMfaSession = ref<{ access_token: string; user: User } | null>(null);

  let handlingUnauthorized = false;

  const isAuthenticated = computed(() => !!token.value);
  const userRole = computed(() => user.value?.role ?? null);
  const userName = computed(() => user.value?.name ?? null);
  const isSuperAdmin = computed(() => userRole.value === 'super_admin');
  const isMunicipalAdmin = computed(() => userRole.value === 'admin' || userRole.value === 'super_admin');
  const mustChangePassword = computed(() => !!user.value?.must_change_password);
  const requiresMfa = computed(() => !!user.value?.requires_mfa || isSuperAdmin.value);

  const clearLegacyLockKeys = () => {
    localStorage.removeItem(LEGACY_LOCKED_KEY);
    localStorage.removeItem(LEGACY_ACTIVITY_KEY);
  };

  /**
   * Hard logout — clears auth state. IndexedDB queue is intentionally preserved
   * so offline captures are never wiped by an auth wipe.
   */
  const clearAuthState = () => {
    token.value = null;
    user.value = null;
    mfaChallenge.value = null;
    pendingMfaSession.value = null;
    sessionStorage.removeItem(MFA_KEY);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    clearLegacyLockKeys();
  };

  /**
   * 401 handler. Never clears IndexedDB. Sends the user to login.
   */
  const handleUnauthorized = async (requestUrl = '') => {
    if (handlingUnauthorized) return;
    handlingUnauthorized = true;
    try {
      const url = requestUrl.toLowerCase();
      if (url.includes('/login') || url.includes('/auth/mfa')) return;

      clearAuthState();
      if (router.currentRoute.value.name !== 'Login') {
        router.push('/login');
      }
    } finally {
      handlingUnauthorized = false;
    }
  };

  /**
   * Called on app init to validate a cached token against the server.
   * Offline sessions skip the network check so field data stays reachable.
   */
  const restoreSession = async () => {
    // Drop leftover soft-lock flags from older builds.
    clearLegacyLockKeys();

    if (!token.value) return;

    // Offline: keep local session.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    try {
      const res = await apiClient.get('/me');
      user.value = res.data.data?.user ?? res.data.data ?? res.data.user;
      localStorage.setItem('user', JSON.stringify(user.value));
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401) {
        await handleUnauthorized('/me');
      }
      // Network errors while offline-ish: keep token; do not wipe queue.
    }
  };

  const rememberMfaChallenge = (data: MfaChallengePayload) => {
    const payload: MfaChallengePayload = { ...data, stored_at: Date.now() };
    mfaChallenge.value = payload;
    sessionStorage.setItem(MFA_KEY, JSON.stringify(payload));
  };

  const clearMfaChallenge = () => {
    mfaChallenge.value = null;
    pendingMfaSession.value = null;
    sessionStorage.removeItem(MFA_KEY);
  };

  const restoreMfaChallenge = () => {
    try {
      const raw = sessionStorage.getItem(MFA_KEY);
      if (!raw) {
        mfaChallenge.value = null;
        return;
      }
      const parsed = JSON.parse(raw) as MfaChallengePayload;
      if (!parsed?.mfa_challenge_id || Date.now() - (parsed.stored_at ?? 0) > MFA_TTL_MS) {
        clearMfaChallenge();
        return;
      }
      mfaChallenge.value = parsed;
    } catch {
      clearMfaChallenge();
    }
  };

  restoreMfaChallenge();

  const hydrateSession = (data: { access_token: string; user: User }, navigate = true) => {
    token.value = data.access_token;
    user.value = data.user;
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    clearLegacyLockKeys();
    if (data.user?.role === 'technician' || data.user?.role === 'admin') {
      void prefetchFieldCache();
    }
    if (navigate) {
      clearMfaChallenge();
      router.replace(
        user.value?.must_change_password ? '/change-password' : homeForRole(user.value?.role ?? null),
      );
    }
  };

  const login = async (credentials: {
    email: string;
    password: string;
    device_name: string;
    turnstile_token?: string;
  }): Promise<LoginResult> => {
    try {
      apiClient.defaults.baseURL = await ensureApiBaseUrl();
      const response = await apiClient.post('/login', credentials);
      const data = response.data.data;

      if (data?.mfa_required) {
        rememberMfaChallenge(data);
        return { success: true as const, mfa_required: true as const };
      }

      hydrateSession(data);
      return { success: true as const, mfa_required: false as const };
    } catch (error: any) {
      const message = error.response?.data?.message
        ?? (error.request
          ? 'Cannot reach the server. Check your internet connection.'
          : 'Login failed.');
      return {
        success: false as const,
        mfa_required: false as const,
        message,
      };
    }
  };

  const mfaError = (error: any, fallback: string) =>
    error?.response?.data?.message ?? fallback;

  const fetchMfaSetupQr = async () => {
    const id = mfaChallenge.value?.mfa_challenge_id;
    if (!id) return { success: false as const, message: 'MFA challenge expired. Please sign in again.' };
    try {
      const response = await apiClient.get('/auth/mfa/setup-qr', { params: { mfa_challenge_id: id } });
      return {
        success: true as const,
        otpauth_uri: String(response.data?.data?.otpauth_uri ?? ''),
        qr_data_uri: String(response.data?.data?.qr_data_uri ?? ''),
      };
    } catch (error: any) {
      return { success: false as const, message: mfaError(error, 'Could not load the authenticator QR code.') };
    }
  };

  const confirmMfaSetup = async (code: string) => {
    const id = mfaChallenge.value?.mfa_challenge_id;
    if (!id) return { success: false as const, message: 'MFA challenge expired. Please sign in again.' };
    try {
      const response = await apiClient.post('/auth/mfa/setup', { mfa_challenge_id: id, code });
      const data = response.data.data;
      pendingMfaSession.value = { access_token: data.access_token, user: data.user };
      hydrateSession(pendingMfaSession.value, false);
      return {
        success: true as const,
        recovery_codes: (data.recovery_codes ?? []) as string[],
      };
    } catch (error: any) {
      return { success: false as const, message: mfaError(error, 'Invalid authenticator code.') };
    }
  };

  const finishMfaSession = () => {
    if (pendingMfaSession.value && !token.value) {
      hydrateSession(pendingMfaSession.value, false);
    }
    clearMfaChallenge();
    router.replace(
      user.value?.must_change_password ? '/change-password' : homeForRole(user.value?.role ?? null),
    );
  };

  const verifyMfa = async (code: string) => {
    const id = mfaChallenge.value?.mfa_challenge_id;
    if (!id) return { success: false as const, message: 'MFA challenge expired. Please sign in again.' };
    try {
      const response = await apiClient.post('/auth/mfa/verify', { mfa_challenge_id: id, code: code.trim() });
      hydrateSession(response.data.data);
      return { success: true as const };
    } catch (error: any) {
      return { success: false as const, message: mfaError(error, 'Invalid MFA code.') };
    }
  };

  const sendMfaSms = async () => {
    const id = mfaChallenge.value?.mfa_challenge_id;
    if (!id) return { success: false as const, message: 'MFA challenge expired. Please sign in again.' };
    try {
      const response = await apiClient.post('/auth/mfa/sms/send', { mfa_challenge_id: id });
      if (mfaChallenge.value && response.data?.data?.masked_mobile) {
        rememberMfaChallenge({
          ...mfaChallenge.value,
          masked_mobile: response.data.data.masked_mobile,
        });
      }
      return {
        success: true as const,
        resend_after_seconds: Number(response.data?.data?.resend_after_seconds ?? 60),
      };
    } catch (error: any) {
      return { success: false as const, message: mfaError(error, 'Could not send an SMS code.') };
    }
  };

  const verifyMfaSms = async (code: string) => {
    const id = mfaChallenge.value?.mfa_challenge_id;
    if (!id) return { success: false as const, message: 'MFA challenge expired. Please sign in again.' };
    try {
      const response = await apiClient.post('/auth/mfa/sms/verify', { mfa_challenge_id: id, code });
      hydrateSession(response.data.data);
      return { success: true as const };
    } catch (error: any) {
      return { success: false as const, message: mfaError(error, 'Invalid SMS code.') };
    }
  };

  const applyUser = (next: User | null) => {
    user.value = next;
    if (next) {
      localStorage.setItem('user', JSON.stringify(next));
    } else {
      localStorage.removeItem('user');
    }
  };

  const apiErrorMessage = (error: any, fallback: string) => {
    const errors = error?.response?.data?.errors;
    if (errors && typeof errors === 'object') {
      const first = Object.values(errors).flat()[0];
      if (typeof first === 'string' && first) return first;
    }
    return error?.response?.data?.message ?? fallback;
  };

  const changePassword = async (payload: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }) => {
    try {
      const response = await apiClient.post('/auth/change-password', payload);
      const next = response.data?.data?.user as User | undefined;
      if (next) applyUser(next);
      else if (user.value) applyUser({ ...user.value, must_change_password: false });
      router.replace(homeForRole(user.value?.role ?? null));
      return { success: true as const };
    } catch (error: any) {
      return {
        success: false as const,
        message: apiErrorMessage(error, 'Could not update password.'),
      };
    }
  };

  const requestPasswordReset = async (payload: { email: string; turnstile_token?: string }) => {
    try {
      const response = await apiClient.post('/auth/forgot-password', payload);
      return {
        success: true as const,
        message: String(response.data?.message ?? 'If an active account is associated with this email, a reset link has been dispatched.'),
      };
    } catch (error: any) {
      return {
        success: false as const,
        message: apiErrorMessage(error, 'Could not send a reset link.'),
      };
    }
  };

  const confirmPasswordReset = async (payload: {
    email: string;
    token: string;
    password: string;
    password_confirmation: string;
  }) => {
    try {
      const response = await apiClient.post('/auth/reset-password', payload);
      return {
        success: true as const,
        message: String(response.data?.message ?? 'Password updated. Sign in with your new password.'),
      };
    } catch (error: any) {
      return {
        success: false as const,
        message: apiErrorMessage(error, 'Could not reset the password.'),
      };
    }
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
    if (router.currentRoute.value.fullPath !== '/login') {
      router.replace('/login');
    }
  };

  return {
    user,
    token,
    mfaChallenge,
    isAuthenticated,
    userRole,
    userName,
    isSuperAdmin,
    isMunicipalAdmin,
    mustChangePassword,
    requiresMfa,
    login,
    logout,
    changePassword,
    requestPasswordReset,
    confirmPasswordReset,
    restoreSession,
    restoreMfaChallenge,
    clearMfaChallenge,
    fetchMfaSetupQr,
    confirmMfaSetup,
    finishMfaSession,
    verifyMfa,
    sendMfaSms,
    verifyMfaSms,
    handleUnauthorized,
  };
});
