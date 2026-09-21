import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vitejs.dev/config/
// Build the self-contained preview with `vite build --mode demo`.
export default defineConfig(({ mode }) => {
  const isDemo = mode === 'demo'
  return {
    // Build stamp (set when this build runs — i.e. at deploy time on Vercel) so
    // the app can show which version is live.
    define: {
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    // Relative base so the single-file preview works when hosted at any path.
    base: isDemo ? './' : '/',
    plugins: isDemo
      ? [react(), VitePWA({ disable: true }), viteSingleFile()]
      : [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
          manifest: {
            name: 'Exhibition Supplier Intelligence',
            short_name: 'Exhibitions',
            description:
              'Permanent multi-exhibition supplier intelligence, live fair capture and trip planning — works offline.',
            theme_color: '#b8272c',
            background_color: '#ffffff',
            display: 'standalone',
            orientation: 'portrait',
            start_url: '/',
            icons: [
              { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
              { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
              { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            ],
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
            navigateFallbackDenylist: [/^\/rest\//, /^\/auth\//, /^\/storage\//],
          },
        }),
      ],
  }
})
