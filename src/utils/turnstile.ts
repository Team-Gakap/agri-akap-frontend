/** Cloudflare dummy key from docs — only valid on localhost, not production domains. */
const PLACEHOLDER_SITE_KEY = '0x4AAAAAAEdHn0r5QvzgfbDb';

/** Official Cloudflare test key (always passes) — localhost dev only. */
const LOCALHOST_TEST_SITE_KEY = '1x00000000000000000000AA';

function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

function resolveSiteKey(): string {
  const configured = (import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim();
  if (configured && configured !== PLACEHOLDER_SITE_KEY) {
    return configured;
  }

  if (import.meta.env.DEV && isLocalhost()) {
    return LOCALHOST_TEST_SITE_KEY;
  }

  return '';
}

export const TURNSTILE_SITE_KEY = resolveSiteKey();

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export interface TurnstileApi {
  render: (container: HTMLElement | string, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
  getResponse: (widgetId: string) => string | undefined;
}

export interface TurnstileRenderOptions {
  sitekey: string;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact' | 'flexible';
  appearance?: 'always' | 'execute' | 'interaction-only';
  action?: string;
  retry?: 'auto' | 'never';
  'refresh-expired'?: 'auto' | 'manual' | 'never';
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: (errorCode?: string) => void;
  'timeout-callback'?: () => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi> | null = null;

export function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }

  if (loading) {
    return loading;
  }

  loading = new Promise<TurnstileApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-agri-turnstile]');
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.turnstile) resolve(window.turnstile);
        else reject(new Error('Captcha script loaded without Turnstile API.'));
      });
      existing.addEventListener('error', () => reject(new Error('Failed to load captcha.')));
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.dataset.agriTurnstile = '1';
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error('Captcha script loaded without Turnstile API.'));
    };
    script.onerror = () => {
      loading = null;
      reject(new Error('Failed to load captcha.'));
    };
    document.head.appendChild(script);
  });

  return loading;
}
