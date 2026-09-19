import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/todo-apple-mobile/" : "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "yami-mark-v2.svg", "yami-mask-icon-v4.svg", "yami-wordmark-v3.svg", "yami-app-icon-v2.svg", "yami-favicon-v4.svg", "yami-favicon-32-v4.png", "yami-favicon-v4.ico", "yami-app-icon-180-v3.png", "yami-app-icon-192-v3.png", "yami-app-icon-512-v3.png", "yami-app-icon-maskable-512-v3.png"],
      manifest: {
        name: "Yami",
        short_name: "Yami",
        id: "/todo-apple-mobile/",
        lang: "zh-CN",
        description: "A focused workspace for Japanese job hunting.",
        theme_color: "#f7f7f8",
        background_color: "#f7f7f8",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/todo-apple-mobile/",
        scope: "/todo-apple-mobile/",
        icons: [
          { src: "yami-app-icon-192-v3.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "yami-app-icon-512-v3.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "yami-app-icon-maskable-512-v3.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        cacheId: "careerflow-brand-v11",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/[^/]+\/404\.html$/],
      },
    }),
  ],
}));
