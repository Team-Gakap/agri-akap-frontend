import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Keep native chrome (status bar) readable and inset WebView content only when
 * the status bar actually overlays the WebView (Android 15+). When overlay is
 * off, the WebView already starts below the bar — extra CSS padding doubles it.
 */
export async function applyNativeChrome(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.show();
    await StatusBar.setStyle({ style: Style.Light });
    try {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setBackgroundColor({ color: '#1a4731' });
    } catch {
      // API 35+ edge-to-edge: overlay/color are ignored.
    }

    const info = await StatusBar.getInfo();
    const overlays = info.overlays === true;
    const height = Math.max(0, Number(info.height) || 0);
    const inset = overlays
      ? (height > 0 ? `${height}px` : 'env(safe-area-inset-top, 0px)')
      : '0px';
    const root = document.documentElement;
    root.style.setProperty('--ion-safe-area-top', inset);
    root.style.setProperty('--agri-status-bar-height', inset);
    root.classList.add('is-native');
    if (overlays) {
      root.classList.add('is-native-overlay');
    } else {
      root.classList.remove('is-native-overlay');
    }
  } catch (err) {
    console.warn('[AGRI-AKAP] Status bar setup skipped:', err);
  }
}
