import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/todo-apple-mobile/" : "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon-v2.svg", "favicon-v2.ico", "apple-touch-icon-v2.png", "pwa-192x192-v2.png", "pwa-512x512-v2.png"],
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
          { src: "pwa-192x192-v2.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "pwa-512x512-v2.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "pwa-512x512-v2.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        cacheId: "careerflow-icons-v3",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/[^/]+\/404\.html$/],
      },
    }),
  ],
}));
