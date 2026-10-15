import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    // host: "192.168.0.128",
    port: 8080,
    hmr: {
      overlay: false,
    },
    /* Local development talks to the API through this proxy rather than
       calling it directly from the browser.
     
       The deployed API only allows the site's own origin, so a browser on
       http://localhost:8080 is refused by CORS before the request is even
       sent. Vite forwards these two paths from its own server instead, where
       CORS does not apply.
     
       This affects `npm run dev` only — `vite build` ignores `server` — so a
       production build is unchanged. Point VITE_BACKEND_URL at a backend of
       your own in .env to bypass it. */
    proxy: {
      "/api": {
        target: process.env.VITE_DEV_API_TARGET || "https://club-project-make-by-claude-ai.onrender.com",
        changeOrigin: true,
        secure: true,
      },
      "/socket.io": {
        target: process.env.VITE_DEV_API_TARGET || "https://club-project-make-by-claude-ai.onrender.com",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    // Without this, every dependency lands in the single entry chunk and any
    // change to app code invalidates the whole thing in the browser cache.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-data": ["@reduxjs/toolkit", "react-redux", "@tanstack/react-query", "axios"],
          "vendor-forms": ["react-hook-form", "zod", "@hookform/resolvers"]
        }
      }
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
