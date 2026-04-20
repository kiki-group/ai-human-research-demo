import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // When deployed to GitHub Pages under https://<org>.github.io/ai-human-research-demo/
  // the app assets live at /ai-human-research-demo/... Use HashRouter so client-side
  // routing works without server-side rewrites.
  base: mode === "production" ? "/ai-human-research-demo/" : "/",
}));
