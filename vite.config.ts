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
    build: { chunkSizeWarningLimit: 1400 },
  };
});
