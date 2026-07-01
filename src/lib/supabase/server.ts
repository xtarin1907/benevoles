import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "./database.types"

// Uses the publishable key, same as the browser client, so reads/writes
// stay scoped by RLS to the signed-in user. Never swap this for the
// secret key here -- RLS is this project's entire security model
// (doc/architecture.md), and the secret key bypasses it like the old
// service_role key.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component -- proxy.ts refreshes the
            // session instead, so this can be safely ignored.
          }
        },
      },
    },
  )
}
