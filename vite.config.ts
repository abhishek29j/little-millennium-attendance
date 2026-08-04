// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      // PWA: generates /sw.js (Workbox) + /manifest.webmanifest at build time.
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        filename: "sw.js",
        // Client build output dir (TanStack Start emits the browser bundle here).
        outDir: "dist/client",
        // Registration is handled exclusively by src/lib/pwa.ts (guarded wrapper).
        injectRegister: null,
        // Never emit a service worker in dev / Lovable preview.
        devOptions: { enabled: false },
        includeAssets: ["favicon.jpg", "apple-touch-icon.png", "icons/*.png", "splash/*.png"],
        manifest: {
          name: "Attendance Management System",
          short_name: "Attendance",
          description: "Smart Attendance Management System for Schools",
          theme_color: "#2563EB",
          background_color: "#FFFFFF",
          display: "standalone",
          orientation: "portrait",
          start_url: "/",
          scope: "/",
          categories: ["education", "productivity"],
          icons: [
            ...[72, 96, 128, 144, 152, 192, 384, 512].map((s) => ({
              src: `/icons/icon-${s}.png`,
              sizes: `${s}x${s}`,
              type: "image/png",
              purpose: "any" as const,
            })),
            ...[192, 512].map((s) => ({
              src: `/icons/maskable-${s}.png`,
              sizes: `${s}x${s}`,
              type: "image/png",
              purpose: "maskable" as const,
            })),
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,jpg,svg,woff,woff2}"],
          cleanupOutdatedCaches: true,
          // Adds the SKIP_WAITING message handler used by the "Refresh to update" action.
          importScripts: ["/sw-skip-waiting.js"],
          clientsClaim: true,
          skipWaiting: false,
          navigateFallback: "/",
          // OAuth + API must never be served from the app-shell fallback.
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
          runtimeCaching: [
            {
              // HTML navigations: always try the network first, fall back to cache offline.
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "pages",
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
            {
              // Hashed build assets: safe to serve cache-first.
              urlPattern: ({ url, request, sameOrigin }) =>
                sameOrigin &&
                (request.destination === "script" || request.destination === "style") &&
                url.pathname.startsWith("/_build/"),
              handler: "CacheFirst",
              options: {
                cacheName: "static-assets",
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              // Images (icons, logos, student photos): show cached instantly, refresh in background.
              urlPattern: ({ request }) => request.destination === "image",
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "images",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              // Google Fonts stylesheets + files.
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts",
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Backend reads (dashboard, students, attendance): network first, cached copy offline.
              urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
              method: "GET",
              handler: "NetworkFirst",
              options: {
                cacheName: "api-data",
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
                cacheableResponse: { statuses: [200] },
              },
            },
          ],
        },
      }),
    ],
  },
});
