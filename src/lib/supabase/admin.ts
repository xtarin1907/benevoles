import { createClient as createRawClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

// Service-role client -- bypasses RLS entirely. Only import this in
// server-only code, and only for operations that have no RLS-scoped
// equivalent (currently: auth.admin.* calls like inviting a manifestation
// admin by email, which requires the Auth Admin API). Never use it for
// regular data reads/writes -- those must go through
// src/lib/supabase/server.ts so RLS stays the actual security boundary.
export function createAdminClient() {
  return createRawClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  )
}
