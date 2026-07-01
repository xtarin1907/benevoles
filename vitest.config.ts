import path from "node:path"
import { loadEnv } from "vite"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // .env.local is a Next.js convention, not auto-loaded by Vite/Vitest
    // for process.env -- load it explicitly (third arg "" = no prefix
    // filter, since these aren't VITE_-prefixed vars).
    env: loadEnv("", process.cwd(), ""),
  },
})
