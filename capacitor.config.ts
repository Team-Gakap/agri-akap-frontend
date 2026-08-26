import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ph.gov.echague.agriakap',
  appName: 'AGRI-AKAP',
  webDir: 'dist',
  server: {
    // LAN Laravel backend is served over plain HTTP; Android 9+ blocks
    // cleartext requests by default, so this must stay enabled while the
    // API is HTTP. Switch to HTTPS in production and remove this.
    cleartext: true,
    androidScheme: 'https',
  },
  plugins: {
    // Native HTTP bypasses WebView mixed-content / CORS so LAN (and
    // USB-reversed) HTTP to Laravel actually leaves the device.
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
