// RLS isolation test — the project's one hard non-negotiable
// (doc/architecture.md, CLAUDE.md): an admin of manifestation A must never
// read or write manifestation B's data, and vice versa. Runs against the
// real cloud dev project with clearly-tagged test data (slug prefix
// "test-rls-"), cleaned up in afterAll — see doc/roadmap.md Phase 1 for
// why a dedicated Supabase branch wasn't used here (YAGNI at this scale).
//
// Requires SUPABASE_SECRET_KEY in .env.local (not retrievable via the
// Supabase MCP tool by design — copy it from the dashboard). Bun
// auto-loads .env.local for `bun run test`.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { Database } from "@/lib/supabase/database.types"

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !PUBLISHABLE_KEY || !SECRET_KEY) {
  throw new Error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY / " +
      "SUPABASE_SECRET_KEY in .env.local. SUPABASE_SECRET_KEY must be copied " +
      "manually from the Supabase dashboard (Settings > API) -- it cannot be " +
      "fetched via the Supabase MCP tool.",
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
const PASSWORD = "test-rls-password-123"

let manifestationA: string
let manifestationB: string
let shiftA: string
let shiftB: string
let userAId: string
let userBId: string
let clientA: SupabaseClient<Database>
let clientB: SupabaseClient<Database>

beforeAll(async () => {
  const { data: manifestations, error: manifestationsError } = await serviceClient
    .from("manifestations")
    .insert([
      { name: "Test RLS A", slug: `test-rls-a-${suffix}` },
      { name: "Test RLS B", slug: `test-rls-b-${suffix}` },
    ])
    .select("id, slug")
  if (manifestationsError) throw manifestationsError
  manifestationA = manifestations.find((m) => m.slug.startsWith("test-rls-a"))!.id
  manifestationB = manifestations.find((m) => m.slug.startsWith("test-rls-b"))!.id

  const { data: secteurs, error: secteursError } = await serviceClient
    .from("secteurs")
    .insert([
      { manifestation_id: manifestationA, name: "Secteur A" },
      { manifestation_id: manifestationB, name: "Secteur B" },
    ])
    .select("id, manifestation_id")
  if (secteursError) throw secteursError

  const { data: shifts, error: shiftsError } = await serviceClient
    .from("shifts")
    .insert([
      {
        manifestation_id: manifestationA,
        secteur_id: secteurs.find((s) => s.manifestation_id === manifestationA)!.id,
        name: "Shift A",
        start_at: new Date().toISOString(),
        end_at: new Date(Date.now() + 3600_000).toISOString(),
        capacity: 1,
      },
      {
        manifestation_id: manifestationB,
        secteur_id: secteurs.find((s) => s.manifestation_id === manifestationB)!.id,
        name: "Shift B",
        start_at: new Date().toISOString(),
        end_at: new Date(Date.now() + 3600_000).toISOString(),
        capacity: 1,
      },
    ])
    .select("id, manifestation_id")
  if (shiftsError) throw shiftsError
  shiftA = shifts.find((s) => s.manifestation_id === manifestationA)!.id
  shiftB = shifts.find((s) => s.manifestation_id === manifestationB)!.id

  const { data: userA, error: userAError } = await serviceClient.auth.admin.createUser({
    email: `test-rls-admin-a-${suffix}@example.com`,
    password: PASSWORD,
    email_confirm: true,
  })
  if (userAError) throw userAError
  const { data: userB, error: userBError } = await serviceClient.auth.admin.createUser({
    email: `test-rls-admin-b-${suffix}@example.com`,
    password: PASSWORD,
    email_confirm: true,
  })
  if (userBError) throw userBError
  userAId = userA.user.id
  userBId = userB.user.id

  const { error: adminsError } = await serviceClient.from("manifestation_admins").insert([
    { manifestation_id: manifestationA, user_id: userAId, role: "owner" },
    { manifestation_id: manifestationB, user_id: userBId, role: "owner" },
  ])
  if (adminsError) throw adminsError

  clientA = await signedInClient(userA.user.email!, PASSWORD)
  clientB = await signedInClient(userB.user.email!, PASSWORD)
})

afterAll(async () => {
  await serviceClient.from("manifestations").delete().in("id", [manifestationA, manifestationB])
  await serviceClient.auth.admin.deleteUser(userAId)
  await serviceClient.auth.admin.deleteUser(userBId)
})

describe("RLS isolation between manifestations", () => {
  it("admin A can read their own shift", async () => {
    const { data } = await clientA.from("shifts").select("id").eq("id", shiftA)
    expect(data).toHaveLength(1)
  })

  it("admin A cannot read manifestation B's shift", async () => {
    const { data } = await clientA.from("shifts").select("id").eq("id", shiftB)
    expect(data).toHaveLength(0)
  })

  it("admin B cannot read manifestation A's shift", async () => {
    const { data } = await clientB.from("shifts").select("id").eq("id", shiftA)
    expect(data).toHaveLength(0)
  })

  it("admin A cannot update manifestation B's shift", async () => {
    // RLS makes this a silent no-op (0 rows affected), not an error --
    // asserting on `data` (empty), not just the absence of `error`.
    const { data, error } = await clientA
      .from("shifts")
      .update({ name: "hijacked" })
      .eq("id", shiftB)
      .select()
    expect(error).toBeNull()
    expect(data).toHaveLength(0)

    const { data: check } = await serviceClient.from("shifts").select("name").eq("id", shiftB).single()
    expect(check?.name).toBe("Shift B")
  })

  it("admin A cannot see manifestation B in the admin-scoped manifestations view", async () => {
    const { data } = await clientA.from("manifestations").select("id").eq("id", manifestationB)
    expect(data).toHaveLength(0)
  })

  it("admin A can see their own manifestation via the admin-scoped policy", async () => {
    const { data } = await clientA.from("manifestations").select("id").eq("id", manifestationA)
    expect(data).toHaveLength(1)
  })
})
