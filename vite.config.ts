import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      strategies: 'generateSW',
      includeAssets: [
        'icons/opslyce-pwa-192.png',
        'icons/opslyce-pwa-512.png',
        'assets/brand/opslyce-logo-horizontal.png',
        'assets/brand/opslyce-emblem.png',
        'assets/environments/title-hq-threshold.png',
        'assets/environments/operative-station-monitor.png',
        'assets/characters/patch-neutral.png',
        'assets/characters/byte-neutral.png',
        'assets/browser/hq-intranet-hero.png',
        'assets/browser/hq-global-operations-map.png',
        'assets/browser/hq-systems-wall.png'
      ],
      manifest: {
        name: 'OpSlyce',
        short_name: 'OpSlyce',
        description: 'A safe, simulated cyber adventure.',
        theme_color: '#071427',
        background_color: '#071427',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/opslyce-pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/opslyce-pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false,
        navigateFallback: '/index.html',
        runtimeCaching: []
      }
    })
  ],
  build: {
    sourcemap: true
  }
});
