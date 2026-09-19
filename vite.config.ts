import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/todo-apple-mobile/" : "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "yami-mark-v2.svg", "yami-mask-icon-v8.svg", "yami-wordmark-v8.svg", "yami-app-icon-v2.svg", "yami-favicon-v8.ico", "yami-favicon-32-v8.png", "yami-app-icon-180-v8.png", "yami-app-icon-192-v8.png", "yami-app-icon-512-v8.png", "yami-app-icon-maskable-512-v8.png"],
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
          { src: "yami-app-icon-192-v8.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "yami-app-icon-512-v8.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "yami-app-icon-maskable-512-v8.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        cacheId: "yami-brand-v15",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globIgnores: ["**/favicon-debug-20260919.html", "**/yami-debug-favicon-20260919.svg", "**/favicon-debug-20260919-b.html", "**/yami-debug-favicon-20260919-b.svg"],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [
          /^\/[^/]+\/404\.html$/,
          /^\/todo-apple-mobile\/favicon-debug-20260919\.html$/,
          /^\/todo-apple-mobile\/favicon-debug-20260919-b\.html$/,
        ],
      },
    }),
  ],
}));
