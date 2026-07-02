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
    // Vitest doesn't load .env into process.env on its own (only Vite's
    // import.meta.env) -- load explicitly (third arg "" = no prefix
    // filter, since SUPABASE_SECRET_KEY isn't VITE_-prefixed).
    env: loadEnv("", process.cwd(), ""),
  },
})
