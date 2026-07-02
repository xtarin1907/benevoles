// Authorization tests for the two Supabase Edge Functions that hold the
// service_role key (supabase/functions/invite-manifestation-admin,
// supabase/functions/send-newsletter) -- there is no more Next.js server
// layer running requireSuperAdmin()/requireManifestationAccess(), so each
// function re-derives the caller's identity from their JWT and re-checks
// authorization itself. A bug here is a privilege escalation or a contact
// data leak, not a UI glitch -- see src/__tests__/rls-isolation.test.ts for
// the same real-cloud-project + throwaway-account pattern this reuses.
//
// Deliberately NOT testing the "authorized caller" success path for
// invite-manifestation-admin (would send a real invite email on every test
// run) -- only that unauthorized callers are rejected, which is the actual
// security boundary. For send-newsletter, "authorized" is verified by
// getting past the 403 (a 400/500 further down the pipeline, e.g. no
// consenting recipients or RESEND_API_KEY not configured, still proves the
// authorization check itself passed) without a real send actually
// happening while RESEND_API_KEY is unset.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { Database } from "@/lib/supabase/database.types"

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !PUBLISHABLE_KEY || !SECRET_KEY) {
  throw new Error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY / " +
      "SUPABASE_SECRET_KEY in .env.local.",
  )
}

const serviceClient = createClient<Database>(SUPABASE_URL, SECRET_KEY)

function signedInClient(email: string, password: string) {
  return createClient<Database>(SUPABASE_URL!, PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  }).auth.signInWithPassword({ email, password }).then((res) => {
    if (res.error) throw res.error
    const client = createClient<Database>(SUPABASE_URL!, PUBLISHABLE_KEY!, {
      auth: { persistSession: false },
    })
    return client.auth.setSession(res.data.session!).then(() => client)
  })
}

const suffix = crypto.randomUUID().slice(0, 8)
const PASSWORD = "test-edge-fn-password-123"

let manifestationA: string
let ownerAId: string
let outsiderId: string
let clientOwnerA: SupabaseClient<Database>
let clientOutsider: SupabaseClient<Database>

beforeAll(async () => {
  const { data: manifestation, error: manifestationError } = await serviceClient
    .from("manifestations")
    .insert({ name: "Test Edge Fn A", slug: `test-edgefn-a-${suffix}` })
    .select("id")
    .single()
  if (manifestationError) throw manifestationError
  manifestationA = manifestation.id

  const { data: owner, error: ownerError } = await serviceClient.auth.admin.createUser({
    email: `test-edgefn-owner-${suffix}@example.com`,
    password: PASSWORD,
    email_confirm: true,
  })
  if (ownerError) throw ownerError
  ownerAId = owner.user.id

  const { data: outsider, error: outsiderError } = await serviceClient.auth.admin.createUser({
    email: `test-edgefn-outsider-${suffix}@example.com`,
    password: PASSWORD,
    email_confirm: true,
  })
  if (outsiderError) throw outsiderError
  outsiderId = outsider.user.id

  // owner: manifestation_admins row for A but NOT platform_role super_admin
  // -- authorized for send-newsletter (any manifestation_admin), NOT
  // authorized for invite-manifestation-admin (super_admin only).
  const { error: adminsError } = await serviceClient
    .from("manifestation_admins")
    .insert({ manifestation_id: manifestationA, user_id: ownerAId, role: "owner" })
  if (adminsError) throw adminsError

  clientOwnerA = await signedInClient(owner.user.email!, PASSWORD)
  clientOutsider = await signedInClient(outsider.user.email!, PASSWORD)
})

afterAll(async () => {
  await serviceClient.from("manifestations").delete().eq("id", manifestationA)
  await serviceClient.auth.admin.deleteUser(ownerAId)
  await serviceClient.auth.admin.deleteUser(outsiderId)
})

describe("invite-manifestation-admin authorization", () => {
  it("rejects a manifestation_admin who is not super_admin", async () => {
    const { error } = await clientOwnerA.functions.invoke("invite-manifestation-admin", {
      body: { manifestationId: manifestationA, email: "nobody@example.com" },
    })
    expect(error?.context?.status).toBe(403)
    const body = await error!.context.json()
    expect(body.error).toMatch(/super admin/i)
  })

  it("rejects a user with no admin rights at all", async () => {
    const { error } = await clientOutsider.functions.invoke("invite-manifestation-admin", {
      body: { manifestationId: manifestationA, email: "nobody@example.com" },
    })
    expect(error?.context?.status).toBe(403)
    const body = await error!.context.json()
    expect(body.error).toMatch(/super admin/i)
  })
})

describe("send-newsletter authorization", () => {
  it("rejects a user with no admin rights on this manifestation", async () => {
    const { error } = await clientOutsider.functions.invoke("send-newsletter", {
      body: {
        manifestationId: manifestationA,
        subject: "test",
        body: "test",
        scope: "manifestation_engaged",
      },
    })
    expect(error?.context?.status).toBe(403)
    const body = await error!.context.json()
    expect(body.error).toMatch(/accès refusé/i)
  })

  it("lets a manifestation_admin of this manifestation past the authorization check", async () => {
    const { error } = await clientOwnerA.functions.invoke("send-newsletter", {
      body: {
        manifestationId: manifestationA,
        subject: "test",
        body: "test",
        scope: "manifestation_engaged",
      },
    })
    // Authorization passes (not 403) -- fails further down the pipeline
    // instead (no consenting recipients, or RESEND_API_KEY not configured
    // yet), which is expected and proves no real email was sent.
    expect(error?.context?.status).not.toBe(403)
  })
})
