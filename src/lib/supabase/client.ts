import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

export function createClient() {
  return createSupabaseClient<Database>(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  )
}
