import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { useAuthStore } from '../stores/authStore';
import { apiBaseUrl } from './apiBase';

const apiClient = axios.create({
  baseURL: apiBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request Interceptor: Attach Token + refresh local activity clock
apiClient.interceptors.request.use((config) => {
  const authStore = useAuthStore();
  if (authStore.token && config.headers) {
    config.headers.Authorization = `Bearer ${authStore.token}`;
  }
  if (Capacitor.isNativePlatform()) {
    config.headers['X-Agri-Platform'] = 'native';
  }
  // Successful intentional API use counts as activity (online sessions).
  if (authStore.token && !authStore.sessionLocked) {
    authStore.touchActivity();
  }
  return config;
});

// Response Interceptor: Offline-aware 401 handling (never wipe IndexedDB queue)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const url = String(error.config?.url || '');
      // Failed login attempts must not trigger lock / logout loops.
      if (!url.includes('/login')) {
        const authStore = useAuthStore();
        await authStore.handleUnauthorized(url);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
