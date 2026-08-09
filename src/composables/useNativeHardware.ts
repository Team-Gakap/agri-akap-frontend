import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Ensure fine/coarse location permission before GPS reads.
 */
export async function ensureLocationPermission(): Promise<boolean> {
  try {
    let status = await Geolocation.checkPermissions();
    if (status.location === 'granted' || status.coarseLocation === 'granted') {
      return true;
    }
    status = await Geolocation.requestPermissions();
    return status.location === 'granted' || status.coarseLocation === 'granted';
  } catch (err) {
    console.warn('[AGRI-AKAP] Geolocation permissions unavailable (web fallback):', err);
    return Capacitor.getPlatform() === 'web';
  }
}

/**
 * High-accuracy GPS fix with permission gate.
 */
export async function fetchRealLocation(options?: { timeout?: number }) {
  const allowed = await ensureLocationPermission();
  if (!allowed) {
    throw new Error('Location permission denied. Enable GPS for farm mapping.');
  }

  return Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: options?.timeout ?? 12000,
  });
}

/**
 * Request camera permission for ML Kit barcode scanning.
 */
export async function ensureCameraPermission(): Promise<boolean> {
  try {
    const { camera } = await BarcodeScanner.requestPermissions();
    return camera === 'granted' || camera === 'limited';
  } catch (err) {
    console.warn('[AGRI-AKAP] Camera permissions unavailable (web fallback):', err);
    return false;
  }
}

/** Transparent WebView helpers for continuous camera scanners. */
export function hideScannerBackground() {
  document.body.classList.add('scanner-active', 'barcode-scanner-active');
}

export function showScannerBackground() {
  document.body.classList.remove('scanner-active', 'barcode-scanner-active');
}
