#!/usr/bin/env bun
// Idempotent modularizer for SALES-ENG (Sales Engagement, domains.id = 95).
// Creates 3 full domain_modules, links 8 capabilities, assigns existing data_objects.
// Scope: modules + entity assignment ONLY. Reuses existing entities. Safe to re-run.
//
// Master pre-check (catalog-wide, 2026-06-02):
//   sales_cadences (121): no master row anywhere -> SALES-ENG masters it.
//   call_recordings (122): no master row anywhere (embedded_master in REV-INTEL) -> SALES-ENG masters it.
//   sales_emails (123): no master row anywhere -> SALES-ENG masters it.
//   conversation_intelligence_records (124): mastered by REV-INTEL-CONVERSATION (186) -> embedded_master here.
//   crm_contacts (98): mastered by CRM-ACCT-MGT (46) -> contributor here.

type Json = any;

async function semantius(method: string, path: string, body?: Json): Promise<Json> {
  const arg: Json = { method, path };
  if (body !== undefined) arg.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(arg)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius ${method} ${path} failed: ${err || out}`);
  return out.trim() ? JSON.parse(out) : null;
}

const DOMAIN_ID = 95;

// ---- Module specs ----
type ModuleSpec = {
  domain_module_code: string;
  domain_module_name: string;
  description: string;
  capability_ids: number[];
  data_objects: { id: number; role: string; necessity: string }[];
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_code: "SALES-ENG-CADENCE-OUTREACH",
    domain_module_name: "Cadence and Outbound Outreach",
    description:
      "Multi-step outbound sequencing engine. Reps and automation enroll prospects into cadences that combine email, call, social, and video touches with timing and branching rules. Includes power and click-to-call dialling and third-party intent and buyer-signal scoring that triggers enrollment.",
    capability_ids: [278, 279, 283], // SE-CADENCE-SEQ, SE-AUTO-DIALER, SE-INTENT-DATA
    data_objects: [
      { id: 121, role: "master", necessity: "required" }, // sales_cadences
      { id: 98, role: "contributor", necessity: "required" }, // crm_contacts
    ],
  },
  {
    domain_module_code: "SALES-ENG-EMAIL-SCHEDULING",
    domain_module_name: "Sales Email and Meeting Scheduling",
    description:
      "One-to-one sales email with open, click, and reply tracking, reusable templates and snippets, and AI-assisted drafting and reply suggestions from prospect context. Includes prospect-facing booking links with availability, round-robin routing, and qualifier forms.",
    capability_ids: [280, 282, 284], // SE-EMAIL-TRACKING, SE-MEETING-SCHED, SE-AI-EMAIL-DRAFT
    data_objects: [
      { id: 123, role: "master", necessity: "required" }, // sales_emails
      { id: 98, role: "contributor", necessity: "required" }, // crm_contacts
    ],
  },
  {
    domain_module_code: "SALES-ENG-CONVERSATION-COACHING",
    domain_module_name: "Conversation Intelligence and Rep Coaching",
    description:
      "Call and meeting recording, transcription, and AI-extracted talk ratios, objections, commitments, and next steps. Feeds scorecard-driven coaching workflows, cadence A/B comparison, and manager one-to-one preparation.",
    capability_ids: [281, 285], // SE-CONV-INTEL, SE-REP-COACHING
    data_objects: [
      { id: 122, role: "master", necessity: "required" }, // call_recordings
      { id: 124, role: "embedded_master", necessity: "required" }, // conversation_intelligence_records
    ],
  },
];

async function upsertModules(): Promise<Map<string, number>> {
  const codes = MODULES.map(m => m.domain_module_code);
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`,
  );
  const have = new Set(existing.map((r: any) => r.domain_module_code));
  const toInsert = MODULES.filter(m => !have.has(m.domain_module_code)).map(m => ({
    domain_module_name: m.domain_module_name,
    domain_module_code: m.domain_module_code,
    description: m.description,
    domain_id: DOMAIN_ID,
    module_kind: "full",
  }));
  if (toInsert.length) {
    await semantius("POST", "/domain_modules", toInsert);
    console.log(`  +${toInsert.length} domain_modules: ${toInsert.map(m => m.domain_module_code).join(", ")}`);
  } else {
    console.log("  modules already present");
  }
  // re-read for code->id map
  const all = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`,
  );
  const map = new Map<string, number>();
  for (const r of all) map.set(r.domain_module_code, r.id);
  return map;
}

async function upsertCapabilities(moduleId: number, capIds: number[]): Promise<void> {
  if (!capIds.length) return;
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capIds.join(",")})&select=capability_id`,
  );
  const have = new Set(existing.map((r: any) => r.capability_id));
  const toInsert = capIds
    .filter(id => !have.has(id))
    .map(id => ({ domain_module_id: moduleId, capability_id: id }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`  +${toInsert.length} capability links on module ${moduleId}`);
  }
}

async function upsertDMDO(
  moduleId: number,
  rows: { id: number; role: string; necessity: string }[],
): Promise<void> {
  if (!rows.length) return;
  const ids = rows.map(r => r.id);
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${ids.join(",")})&select=data_object_id`,
  );
  const have = new Set(existing.map((r: any) => r.data_object_id));
  const toInsert = rows
    .filter(r => !have.has(r.id))
    .map(r => ({
      domain_module_id: moduleId,
      data_object_id: r.id,
      role: r.role,
      necessity: r.necessity,
    }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_data_objects", toInsert);
    console.log(`  +${toInsert.length} DMDO rows on module ${moduleId}`);
  }
}

async function main() {
  console.log("=== SALES-ENG modularization ===");
  const codeToId = await upsertModules();

  for (const m of MODULES) {
    const moduleId = codeToId.get(m.domain_module_code);
    if (!moduleId) throw new Error(`module id not found for ${m.domain_module_code}`);
    console.log(`\n-- ${m.domain_module_code} (id ${moduleId})`);
    await upsertCapabilities(moduleId, m.capability_ids);
    await upsertDMDO(moduleId, m.data_objects);
  }

  // ---- Verify ----
  console.log("\n=== Verify ===");
  const mods = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`,
  );
  console.log(`modules: ${mods.length}`);
  const caps = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=in.(${mods.map((m: any) => m.id).join(",")})&select=capability_id`,
  );
  const placed = new Set(caps.map((c: any) => c.capability_id));
  const allCaps = [278, 279, 280, 281, 282, 283, 284, 285];
  const missing = allCaps.filter(c => !placed.has(c));
  console.log(`capability links: ${caps.length}; distinct placed: ${placed.size}/8; missing: ${missing.length ? missing.join(",") : "none"}`);

  const dmdo = await semantius(
    "GET",
    `/domain_module_data_objects?domain_module_id=in.(${mods.map((m: any) => m.id).join(",")})&select=domain_module_id,data_object_id,role,necessity`,
  );
  console.log(`DMDO rows: ${dmdo.length}`);
  for (const m of mods) {
    const rows = dmdo.filter((d: any) => d.domain_module_id === m.id);
    console.log(`  ${m.domain_module_code}: ${rows.length} data_objects [${rows.map((r: any) => `${r.data_object_id}:${r.role}`).join(", ")}]`);
  }

  // catalog-wide master uniqueness for our masters
  for (const doId of [121, 122, 123]) {
    const masters = await semantius(
      "GET",
      `/domain_module_data_objects?data_object_id=eq.${doId}&role=eq.master&select=domain_module_id,domain_modules(domain_module_code)`,
    );
    console.log(`  master(${doId}) catalog-wide: ${masters.length} [${masters.map((r: any) => r.domain_modules?.domain_module_code).join(", ")}]`);
  }

  console.log("\nDone.");
}

main().catch(e => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
