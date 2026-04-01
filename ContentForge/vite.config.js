import { defineConfig } from "vite";

/** Même proxy en dev et preview : le navigateur appelle /__groq/… (same-origin) → Groq (évite CORS). */
const groqProxy = {
  "/__groq": {
    target: "https://api.groq.com",
    changeOrigin: true,
    secure: true,
    rewrite: (path) => path.replace(/^\/__groq/, ""),
  },
};

export default defineConfig({
  root: ".",
  publicDir: "public",
  server: {
    proxy: groqProxy,
  },
  preview: {
    proxy: groqProxy,
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: "index.html",
    },
  },
});
