import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
        manifest: {
          name: 'Stride Up',
          short_name: 'Stride Up',
          description: 'Rede social fitness para compartilhar sua jornada de treinos e nutrição',
          theme_color: '#06b6d4',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          dir: 'ltr',
          id: '/',
          start_url: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ],
          categories: [
            'fitness',
            'health',
            'social'
          ],
          screenshots: [
            {
              src: '/screenshots/mobile-profile.jpg',
              sizes: '359x662',
              type: 'image/jpeg',
              form_factor: 'narrow',
              label: 'User Profile'
            },
            {
              src: '/screenshots/mobile-challenges.jpg',
              sizes: '367x683',
              type: 'image/jpeg',
              form_factor: 'narrow',
              label: 'Challenges List'
            },
            {
              src: '/screenshots/mobile-workout.jpg',
              sizes: '357x615',
              type: 'image/jpeg',
              form_factor: 'narrow',
              label: 'Workout Setup'
            },
            {
              src: '/screenshots/web-profile.jpg',
              sizes: '969x817',
              type: 'image/jpeg',
              form_factor: 'wide',
              label: 'Web Profile'
            },
            {
              src: '/screenshots/web-challenges.jpg',
              sizes: '995x675',
              type: 'image/jpeg',
              form_factor: 'wide',
              label: 'Web Challenges'
            },
            {
              src: '/screenshots/web-nutrition.jpg',
              sizes: '873x724',
              type: 'image/jpeg',
              form_factor: 'wide',
              label: 'Web Nutrition'
            }
          ],
          prefer_related_applications: false
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
