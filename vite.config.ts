import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/todo-apple-mobile/" : "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon-v4.svg", "favicon-v4.ico", "apple-touch-icon-v6.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png"],
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
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        cacheId: "careerflow-icons-v6",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/[^/]+\/404\.html$/],
      },
    }),
  ],
}));
