import { defineConfig } from "vite"

export default defineConfig({
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
    allowedHosts: [".ts.net"],
  },
  build: {
    outDir: "dist",
    target: "es2022",
    sourcemap: true,
  },
})
