import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// خروجی ساخت مستقیماً داخل library/ می‌رود (مسیر انتشار GitHub Pages).
// emptyOutDir خاموش است تا data/ و media/ و typography/ پاک نشوند.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "../library",
    emptyOutDir: false,
    chunkSizeWarningLimit: 1600,
  },
  server: {
    fs: { allow: [".."] },
  },
});
