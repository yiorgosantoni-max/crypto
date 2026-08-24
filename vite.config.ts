import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Split third-party dependencies into separate chunks so the app entry
    // chunk does not grow beyond Vite/Rollup's 500 kB warning threshold.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          const modules = id.split("node_modules/")[1].split("/");
          const packageName = modules[0].startsWith("@")
            ? `${modules[0]}-${modules[1]}`
            : modules[0];

          return `vendor-${packageName.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
}));
