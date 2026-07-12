import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/todo-apple-mobile/" : "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        name: "CareerFlow",
        short_name: "CareerFlow",
        id: "/todo-apple-mobile/",
        lang: "zh-CN",
        description: "A glass-inspired personal task manager.",
        theme_color: "#dfefff",
        background_color: "#dfefff",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/todo-apple-mobile/",
        scope: "/todo-apple-mobile/",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        cacheId: "careerflow-name-v2",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/[^/]+\/404\.html$/],
      },
    }),
  ],
}));
