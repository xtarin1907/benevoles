import { corsHeaders } from "../_shared/cors.ts"
import { AuthError, createServiceRoleClient, getCaller } from "../_shared/auth.ts"

// Invitation/retrait d'admins reste réservé au super_admin (RLS : seul un
// 'owner' ou super_admin peut écrire manifestation_admins -- aucun flux ne
// crée d'owner pour l'instant, donc en pratique seul super_admin peut agir
// ici). Mirrors the former src/app/manage/[id]/actions.ts inviteManifestationAdmin.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { profile } = await getCaller(req)

    if (profile?.platform_role !== "super_admin") {
      throw new AuthError(403, "Réservé au super admin.")
    }

    const { manifestationId, email } = await req.json()
    if (!manifestationId || !email) {
      throw new AuthError(400, "manifestationId et email requis.")
    }

    const admin = createServiceRoleClient()
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email)

    if (inviteError || !invited.user) {
      throw new AuthError(400, inviteError?.message ?? "Échec de l'invitation.")
    }

    const { error: linkError } = await admin.from("manifestation_admins").insert({
      manifestation_id: manifestationId,
      user_id: invited.user.id,
      role: "admin",
    })

    if (linkError) {
      throw new AuthError(400, linkError.message)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500
    const message = error instanceof Error ? error.message : "Erreur inconnue."
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
