import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  // Vite does not put .env values on process.env while loading this file, so read them explicitly.
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY || "http://127.0.0.1:4000",
          changeOrigin: true,
        },
      },
    },
    // Perf review 2026-11-16 item 2: rehype-katex pins katex ^0.16 and was bundling a second copy (~250 kB) next to the app's
    // katex 0.19; one copy also matches the katex 0.19 CSS the lesson page loads. rehype-katex only calls renderToString.
    resolve: { dedupe: ["katex"] },
    build: { chunkSizeWarningLimit: 500 },
  };
});
