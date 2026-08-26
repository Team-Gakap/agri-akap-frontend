import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { BarcodeFormat, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

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
    status = await Geolocation.requestPermissions({ permissions: ['location'] });
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
    if (Capacitor.isNativePlatform()) {
      const cam = await Camera.requestPermissions({ permissions: ['camera'] });
      if (cam.camera === 'granted' || cam.camera === 'limited') {
        return true;
      }
    }
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

export type QrScanResult =
  | { ok: true; value: string }
  | { ok: false; reason: 'not_native' | 'permission' | 'cancelled' | 'empty' | 'unavailable' };

const QR_FORMATS = [BarcodeFormat.QrCode];

let liveScanAbort: (() => Promise<void>) | null = null;

function firstQrValue(barcodes?: { rawValue?: string | null }[] | null): string {
  return barcodes?.[0]?.rawValue?.trim() || '';
}

function isCancelError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message || err || '');
  return /cancel/i.test(msg) || Boolean((err as { cancelled?: boolean })?.cancelled);
}

export async function stopLiveQrScan(): Promise<void> {
  if (liveScanAbort) await liveScanAbort();
}

/**
 * Scan a farmer QR on device.
 *
 * Google Play's Code Scanner UI (`scan()`) is missing on many TECNO / OEM
 * phones even when camera + GPS work. Fall back to CameraX live scan, then
 * to a still photo decoded with on-device ML Kit.
 */
export async function scanFarmerQr(hooks?: {
  onLiveScanStart?: () => void;
  onLiveScanEnd?: () => void;
}): Promise<QrScanResult> {
  if (!Capacitor.isNativePlatform()) {
    return { ok: false, reason: 'not_native' };
  }
  if (!(await ensureCameraPermission())) {
    return { ok: false, reason: 'permission' };
  }

  try {
    const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
    if (available) {
      const { barcodes } = await BarcodeScanner.scan({ formats: QR_FORMATS });
      const value = firstQrValue(barcodes);
      return value ? { ok: true, value } : { ok: false, reason: 'empty' };
    }
  } catch (err) {
    console.warn('[AGRI-AKAP] Google Code Scanner unavailable:', err);
  }

  try {
    hooks?.onLiveScanStart?.();
    const value = await scanWithLiveCamera();
    hooks?.onLiveScanEnd?.();
    return value ? { ok: true, value } : { ok: false, reason: 'empty' };
  } catch (err) {
    hooks?.onLiveScanEnd?.();
    if (isCancelError(err)) return { ok: false, reason: 'cancelled' };
    console.warn('[AGRI-AKAP] Live QR scanner failed:', err);
  }

  try {
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
    });
    const path = photo.path;
    if (!path) return { ok: false, reason: 'empty' };
    const { barcodes } = await BarcodeScanner.readBarcodesFromImage({
      path,
      formats: QR_FORMATS,
    });
    const value = firstQrValue(barcodes);
    return value ? { ok: true, value } : { ok: false, reason: 'empty' };
  } catch (err) {
    if (isCancelError(err)) return { ok: false, reason: 'cancelled' };
    console.warn('[AGRI-AKAP] Photo QR decode failed:', err);
    return { ok: false, reason: 'unavailable' };
  }
}

async function scanWithLiveCamera(): Promise<string> {
  hideScannerBackground();
  return new Promise((resolve, reject) => {
    let settled = false;

    const finish = async (next: () => void) => {
      if (settled) return;
      settled = true;
      liveScanAbort = null;
      try {
        await BarcodeScanner.removeAllListeners();
        await BarcodeScanner.stopScan();
      } catch {
        // already stopped
      }
      showScannerBackground();
      next();
    };

    liveScanAbort = () =>
      finish(() => reject(Object.assign(new Error('cancelled'), { cancelled: true })));

    void (async () => {
      try {
        await BarcodeScanner.addListener('barcodesScanned', (event) => {
          const value = firstQrValue(event.barcodes);
          if (value) void finish(() => resolve(value));
        });
        await BarcodeScanner.addListener('scanError', (event) => {
          void finish(() => reject(new Error(event.message || 'scanError')));
        });
        await BarcodeScanner.startScan({ formats: QR_FORMATS });
      } catch (err) {
        void finish(() => reject(err));
      }
    })();
  });
}
