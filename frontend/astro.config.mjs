import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import node from "@astrojs/node";

export default defineConfig({
  integrations: [react(), tailwind()],
  output: "static", // keep this — Astro 5 lets you opt individual pages into SSR
  adapter: node({ mode: "standalone" }),
  server: {
    port: 4321,
  },
  vite: {
    server: {
      strictPort: true,
    },
  },
});