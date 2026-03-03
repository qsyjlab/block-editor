import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5174,
  },
  resolve: {
    alias: {
      "@block-editor/editor/dist/style.css": path.resolve(
        __dirname,
        "../../packages/editor/dist/style.css",
      ),
      "@block-editor/editor": path.resolve(
        __dirname,
        "../../packages/editor/src/index.ts",
      ),
    },
  },
});
