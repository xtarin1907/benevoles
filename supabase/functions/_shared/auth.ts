import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Replicates src/lib/auth/guards.ts's former server-side checks: there is
// no more Next.js server layer to run requireSuperAdmin/
// requireManifestationAccess, so every Edge Function re-derives the caller's
// identity from their JWT and re-checks authorization itself, using the
// anon key (RLS-scoped) -- never the service-role key -- for this check.
export async function getCaller(req: Request) {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    throw new AuthError(401, "Missing Authorization header.")
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error,
  } = await callerClient.auth.getUser()

  if (error || !user) {
    throw new AuthError(401, "Invalid or expired session.")
  }

  const { data: profile } = await callerClient
    .from("profiles")
    .select("platform_role")
    .eq("id", user.id)
    .single()

  return { user, profile, callerClient }
}

export async function isManifestationAdmin(
  callerClient: ReturnType<typeof createClient>,
  manifestationId: string,
  userId: string,
) {
  const { data } = await callerClient
    .from("manifestation_admins")
    .select("role")
    .eq("manifestation_id", manifestationId)
    .eq("user_id", userId)
    .maybeSingle()

  return Boolean(data)
}

export function createServiceRoleClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  return createClient(supabaseUrl, serviceRoleKey)
}

export class AuthError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}
