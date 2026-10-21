// fix_sam_b1_technical_2026_05_31.ts
//
// Technical B1 fixes for SAM (Software Asset Management, domain id 52).
// Scoped to the items the audit pre-specified with concrete IDs and values
// (no judgment, no DEFER-class work).
//
// Applies:
//   1. B1-S2 trigger_events.event_category backfill (4 PATCHes; ids 617, 618,
//      619, 620). ids 121, 122, 123 already carry 'signal' and are skipped.
//   2. B1-S10 em-dash and British-spelling fix on:
//        - domains.business_logic (id 52)
//        - skills.description (id 105)
//   3. B1-S8 Rule #10 user-edges on the 3 pre-specified SAM masters:
//        - license_audits  (60) is assigned to users
//        - software_licenses (58) is owned by users (license_owner)
//        - software_titles (57) is owned by users (catalog_owner)
//      The fourth optional edge (software_installations -> users) is audit-
//      marked "optional"; deferred to user judgment.
//
// Defers (per the subagent prompt and SKILL hard rules):
//   - B1-S1 module re-author (Phase A, gated on B2-S1, judgment)
//   - B1-S3 trigger-event re-pointing/dedup (judgment, source-domain shape)
//   - B1-S4 10 new trigger_events (gated on B1-S5 / B1-S1)
//   - B1-S5 lifecycle states (gated on B1-S1 + B2-S3)
//   - B1-S6 aliases (not pre-specified as exact tuples)
//   - B1-S7 intra-domain relationships (non-user edges, cardinality is
//     judgment, surfaced for user)
//   - B1-S9 B10b backfill (gated on B1-S1 modules existing)
//   - B1-S11 intra-domain handoffs (gated on B1-S1)
//   - B1-S12 inbound DMDO consumer rows (new DMDO rows, judgment + Rule #16)
//   - B1-S13 CLM -> SAM contract.activated handoff (gated on CLM modules)
//   - H1 APQC handoff_processes (audit gives search terms, not resolved
//     process_ids; per subagent prompt, requires resolvable PCF pre-specified)

const ROOT = "https://tests.semantius.app";

type CallResult = { ok: boolean; status: number; body: string };

async function semantiusCall(args: string[]): Promise<CallResult> {
  const proc = Bun.spawn(["semantius", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  const body = stdout + (stderr ? `\n[stderr] ${stderr}` : "");
  if (exitCode !== 0 && /JWT does not have authorization/i.test(body)) {
    console.error("\n=== JWT AUDIENCE ERROR (per SKILL rule #6, STOP) ===");
    console.error(`command: semantius ${args.join(" ")}`);
    console.error(body);
    process.exit(2);
  }
  return { ok: exitCode === 0, status: exitCode, body };
}

async function postgrest(method: string, path: string, body?: unknown) {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const res = await semantiusCall([
    "call",
    "crud",
    "postgrestRequest",
    JSON.stringify(payload),
  ]);
  if (!res.ok) {
    throw new Error(`PostgREST ${method} ${path} failed:\n${res.body}`);
  }
  return res.body;
}

// ----------------------------------------------------------------------------
// 1. B1-S2 trigger_events.event_category backfill
// ----------------------------------------------------------------------------
async function fixTriggerEventCategories() {
  console.log("\n[B1-S2] PATCH trigger_events.event_category");
  const updates: Array<{ id: number; event_category: string }> = [
    { id: 617, event_category: "lifecycle" }, // software_title.added_to_catalog
    { id: 618, event_category: "lifecycle" }, // software_title.eol_reached
    { id: 619, event_category: "threshold" }, // software_license.over_consumed
    { id: 620, event_category: "threshold" }, // software_license.under_consumed
  ];
  for (const u of updates) {
    await postgrest("PATCH", `/trigger_events?id=eq.${u.id}`, {
      event_category: u.event_category,
    });
    console.log(`  PATCH trigger_events ${u.id} -> ${u.event_category}`);
  }
  // Verify 121, 122, 123 are already 'signal' (audit said empty; live check
  // already showed 'signal'; re-verify to catch drift).
  const check = await postgrest(
    "GET",
    "/trigger_events?id=in.(121,122,123,617,618,619,620)&select=id,event_name,event_category",
  );
  console.log(`  verify: ${check}`);
}

// ----------------------------------------------------------------------------
// 2. B1-S10 em-dash + British-spelling cleanup
// ----------------------------------------------------------------------------
async function fixEmDashes() {
  console.log("\n[B1-S10] PATCH em-dash + British spelling");
  // domains.business_logic on SAM (id 52). Original:
  //   "Entitlement reconciliation engine (matching deployed installs against
  //    complex licence metrics) — the genuinely hard kernel of SAM."
  // Fix: em-dash -> colon; British 'licence' -> American 'license'.
  const sam_business_logic =
    "Entitlement reconciliation engine (matching deployed installs against complex license metrics): the genuinely hard kernel of SAM.";
  await postgrest("PATCH", "/domains?id=eq.52", {
    business_logic: sam_business_logic,
  });
  console.log("  PATCH domains.id=52 business_logic (em-dash + license fix)");

  // skills.description on sam-system (id 105). Original:
  //   "System skill for Software Asset Management — runtime workflows over the
  //    domain's master data, derived from masters + cross-domain handoffs."
  // Fix: em-dash -> colon.
  const sam_skill_desc =
    "System skill for Software Asset Management: runtime workflows over the domain's master data, derived from masters + cross-domain handoffs.";
  await postgrest("PATCH", "/skills?id=eq.105", {
    description: sam_skill_desc,
  });
  console.log("  PATCH skills.id=105 description (em-dash fix)");

  const check_domain = await postgrest(
    "GET",
    "/domains?id=eq.52&select=id,business_logic",
  );
  console.log(`  verify domain: ${check_domain}`);
  const check_skill = await postgrest(
    "GET",
    "/skills?id=eq.105&select=id,description",
  );
  console.log(`  verify skill: ${check_skill}`);
}

// ----------------------------------------------------------------------------
// 3. B1-S8 Rule #10 user-edges (3 pre-specified)
// ----------------------------------------------------------------------------
//
// Convention from existing rows (e.g. asset_lifecycle_events 206, hardware_assets
// 256, configuration_items 242): data_object_id = users (748), source-side
// owner, one_to_many, kind=reference, is_required=false, label =
// "users <verb> <plural_target>".
//
// Pre-flight: ensure none of the 3 edges already exist.
async function fixUserEdges() {
  console.log("\n[B1-S8] INSERT users edges on 3 SAM masters");

  const USERS_ID = 748;
  const edges: Array<{
    related_data_object_id: number;
    verb: string;
    inverse_verb: string;
    label_target: string; // plural_label of the related master
  }> = [
    {
      related_data_object_id: 60, // license_audits
      verb: "assigned audits",
      inverse_verb: "is_assigned_to",
      label_target: "license_audits",
    },
    {
      related_data_object_id: 58, // software_licenses
      verb: "owned licenses",
      inverse_verb: "is_owned_by",
      label_target: "software_licenses",
    },
    {
      related_data_object_id: 57, // software_titles
      verb: "owned catalog titles",
      inverse_verb: "is_owned_by",
      label_target: "software_titles",
    },
  ];

  // Pre-flight existence check
  const existingJson = await postgrest(
    "GET",
    `/data_object_relationships?and=(data_object_id.eq.${USERS_ID},related_data_object_id.in.(57,58,60))&select=related_data_object_id,relationship_verb`,
  );
  const existing = JSON.parse(existingJson) as Array<{
    related_data_object_id: number;
    relationship_verb: string;
  }>;
  const existingPairs = new Set(
    existing.map((r) => `${r.related_data_object_id}::${r.relationship_verb}`),
  );

  const rows: Array<Record<string, unknown>> = [];
  for (const e of edges) {
    const key = `${e.related_data_object_id}::${e.verb}`;
    if (existingPairs.has(key)) {
      console.log(`  SKIP (exists): users ${e.verb} ${e.label_target}`);
      continue;
    }
    rows.push({
      data_object_id: USERS_ID,
      related_data_object_id: e.related_data_object_id,
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      relationship_verb: e.verb,
      inverse_verb: e.inverse_verb,
      owner_side: "source",
      is_required: false,
      data_object_relationship_label: `users ${e.verb} ${e.label_target}`,
      // record_status omitted to take default 'new' (rule #1)
      // notes omitted to take default '' (rule #15)
    });
  }

  if (rows.length === 0) {
    console.log("  all 3 edges already exist; nothing to insert");
    return;
  }

  await postgrest("POST", "/data_object_relationships", rows);
  console.log(`  INSERT ${rows.length} user-edge row(s)`);

  // Verify
  const verify = await postgrest(
    "GET",
    `/data_object_relationships?and=(data_object_id.eq.${USERS_ID},related_data_object_id.in.(57,58,60))&select=id,related_data_object_id,relationship_verb,inverse_verb`,
  );
  console.log(`  verify: ${verify}`);
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------
async function main() {
  console.log("=== SAM B1 technical fix pass 2026-05-31 ===");
  console.log(`UI: ${ROOT}/domain_map/domains?id=eq.52`);

  await fixTriggerEventCategories();
  await fixEmDashes();
  await fixUserEdges();

  console.log("\n=== done ===");
  console.log("Spot-check URLs:");
  console.log(`  ${ROOT}/domain_map/trigger_events`);
  console.log(`  ${ROOT}/domain_map/domains`);
  console.log(`  ${ROOT}/domain_map/skills`);
  console.log(`  ${ROOT}/domain_map/data_object_relationships`);
}

await main();
