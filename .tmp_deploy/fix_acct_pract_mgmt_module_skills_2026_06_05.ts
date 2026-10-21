#!/usr/bin/env bun
// B1A-MODULE-SKILLS for ACCT-PRACT-MGMT (domain_id=152).
//
// Authors one system skill per module (207 ENGAGEMENT-WORKFLOW, 208 TAX-RETURN-PREP,
// 209 CLIENT-PORTAL-BILLING) with domain_module_id set, distributing and extending the
// tool surface (query + mutate + fetch + inbound + notify_person + sign_document), then
// retires the legacy domain-level skill id=25 (DELETE) once the three module skills exist.
//
// Idempotent: dedups tools by tool_name and skills by (skill_type, domain_module_id);
// re-running is a no-op. record_status omitted on every insert (DB default 'new').
//
// Tool reuse (catalog-wide table, shared): query_tax_returns(287), query_client_engagements(288),
// query_time_entries(780), notify_person(913), receive_webhook(896), sign_document(42).
// Tools created here (domain-specific to masters 400/401, or external fetch):
//   update_tax_return (mutate, data_object_id=400), update_client_engagement (mutate, 401),
//   fetch_irs_acceptance_status (fetch, NULL).

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

async function post(path: string, body: Row[]): Promise<Row[]> {
  if (body.length === 0) return [];
  return call({ method: "POST", path, body });
}

// ----------------------------------------------------------------
// 1. TOOLS — create domain-specific rows, dedup by tool_name.
// ----------------------------------------------------------------
const toolSpecs = [
  {
    tool_name: "update_tax_return",
    operation_kind: "mutate",
    data_object_id: 400,
    coverage_tier: "platform",
    description:
      "Create or update a tax return record and advance its lifecycle state (in_preparation, in_review, ready_for_filing, filed, accepted_by_irs, rejected_by_irs, amended). Writes Semantius-mastered structured data.",
  },
  {
    tool_name: "update_client_engagement",
    operation_kind: "mutate",
    data_object_id: 401,
    coverage_tier: "platform",
    description:
      "Create or update a client engagement record and advance its lifecycle state (proposed, commenced, active, on_hold, completed, terminated). Writes Semantius-mastered structured data.",
  },
  {
    tool_name: "fetch_irs_acceptance_status",
    operation_kind: "fetch",
    data_object_id: null,
    coverage_tier: "external",
    description:
      "Poll the taxing authority e-file vendor for the acceptance or rejection status of a submitted return. External read; no Semantius-side data model.",
  },
];

async function syncTools(): Promise<Map<string, number>> {
  const names = toolSpecs.map((t) => t.tool_name);
  const inList = names.join(",");
  const existing = await get(
    `/tools?tool_name=in.(${inList})&select=id,tool_name`,
  );
  const existingNames = new Set(existing.map((r) => String(r.tool_name)));
  const missing = toolSpecs.filter((t) => !existingNames.has(t.tool_name));
  if (missing.length > 0) {
    console.log(`Inserting ${missing.length} new tools: ${missing.map((m) => m.tool_name).join(", ")}`);
    await post("/tools", missing);
  } else {
    console.log("All domain-specific tools already present.");
  }
  const all = await get(`/tools?tool_name=in.(${inList})&select=id,tool_name`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r.tool_name), Number(r.id));
  return map;
}

// Reusable tool ids (re-read immediately before linking to confirm presence).
async function reusableToolMap(): Promise<Map<string, number>> {
  const names = [
    "query_tax_returns",
    "query_client_engagements",
    "query_time_entries",
    "notify_person",
    "receive_webhook",
    "sign_document",
  ];
  const all = await get(
    `/tools?tool_name=in.(${names.join(",")})&select=id,tool_name`,
  );
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r.tool_name), Number(r.id));
  for (const n of names) {
    if (!map.has(n)) throw new Error(`Expected reusable tool '${n}' not found in catalog.`);
  }
  return map;
}

// ----------------------------------------------------------------
// 2. SKILLS — one system skill per module, dedup by (skill_type, domain_module_id).
// ----------------------------------------------------------------
const DOMAIN_ID = 152;
const skillSpecs = [
  {
    domain_module_id: 207,
    skill_name: "acct_pract_mgmt_engagement_workflow_agent",
    description:
      "System skill for the Engagement and Service-Line Workflow module. Operates over client_engagements: queries the engagement book of work, advances engagement lifecycle state, and notifies engagement stakeholders.",
  },
  {
    domain_module_id: 208,
    skill_name: "acct_pract_mgmt_tax_return_prep_agent",
    description:
      "System skill for the Tax Return Preparation and Document Retention module. Operates over tax_returns: queries returns, advances preparation and filing state, sends returns for e-signature, polls the taxing authority for acceptance status, and receives acceptance and signature callbacks.",
  },
  {
    domain_module_id: 209,
    skill_name: "acct_pract_mgmt_client_portal_billing_agent",
    description:
      "System skill for the Client Portal and Time and Billing module. Queries time entries that feed engagement billing and notifies clients through the portal.",
  },
];

async function syncSkills(): Promise<Map<number, number>> {
  const modIds = skillSpecs.map((s) => s.domain_module_id);
  const existing = await get(
    `/skills?skill_type=eq.system&domain_module_id=in.(${modIds.join(",")})&select=id,domain_module_id`,
  );
  const byMod = new Map<number, number>();
  for (const r of existing) byMod.set(Number(r.domain_module_id), Number(r.id));
  const missing = skillSpecs
    .filter((s) => !byMod.has(s.domain_module_id))
    .map((s) => ({
      skill_name: s.skill_name,
      description: s.description,
      skill_type: "system",
      domain_id: DOMAIN_ID,
      domain_module_id: s.domain_module_id,
    }));
  if (missing.length > 0) {
    console.log(`Inserting ${missing.length} new system skills.`);
    await post("/skills", missing);
  } else {
    console.log("All module system skills already present.");
  }
  const all = await get(
    `/skills?skill_type=eq.system&domain_module_id=in.(${modIds.join(",")})&select=id,domain_module_id,skill_name`,
  );
  const map = new Map<number, number>();
  for (const r of all) map.set(Number(r.domain_module_id), Number(r.id));
  for (const s of skillSpecs) {
    if (!map.has(s.domain_module_id))
      throw new Error(`Skill for module ${s.domain_module_id} missing after sync.`);
    if (all.filter((r) => Number(r.domain_module_id) === s.domain_module_id).length > 1)
      throw new Error(`>1 system skill on module ${s.domain_module_id} (Rule #17 violation).`);
  }
  return map;
}

// ----------------------------------------------------------------
// 3. SKILL_TOOLS — link tools to skills, dedup by (skill_id, tool_id).
// ----------------------------------------------------------------
async function syncSkillTools(
  skillByMod: Map<number, number>,
  reusable: Map<string, number>,
  created: Map<string, number>,
): Promise<number> {
  const toolId = (name: string): number => {
    const id = reusable.get(name) ?? created.get(name);
    if (id === undefined) throw new Error(`Tool '${name}' id not resolved.`);
    return id;
  };

  // (module_id, tool_name, requirement_level)
  const plan: Array<[number, string, "required" | "optional"]> = [
    // 207 ENGAGEMENT-WORKFLOW — masters client_engagements (401)
    [207, "query_client_engagements", "required"],
    [207, "update_client_engagement", "required"],
    [207, "notify_person", "optional"],
    // 208 TAX-RETURN-PREP — masters tax_returns (400)
    [208, "query_tax_returns", "required"],
    [208, "update_tax_return", "required"],
    [208, "sign_document", "required"],
    [208, "fetch_irs_acceptance_status", "optional"],
    [208, "receive_webhook", "optional"],
    // 209 CLIENT-PORTAL-BILLING — carries time_entries (162) contributor
    [209, "query_time_entries", "required"],
    [209, "notify_person", "optional"],
  ];

  const skillNameByMod = new Map<number, string>(
    skillSpecs.map((s) => [s.domain_module_id, s.skill_name]),
  );

  const skillIds = [...skillByMod.values()].join(",");
  const existing = await get(
    `/skill_tools?skill_id=in.(${skillIds})&select=skill_id,tool_id`,
  );
  const existingPairs = new Set(
    existing.map((r) => `${r.skill_id}|${r.tool_id}`),
  );

  const rows: Row[] = [];
  for (const [modId, toolName, level] of plan) {
    const skillId = skillByMod.get(modId)!;
    const tId = toolId(toolName);
    const key = `${skillId}|${tId}`;
    if (existingPairs.has(key)) continue;
    rows.push({
      skill_tool_label: `${skillNameByMod.get(modId)} needs ${toolName}`,
      skill_id: skillId,
      tool_id: tId,
      requirement_level: level,
      notes: "",
    });
  }

  if (rows.length > 0) {
    console.log(`Inserting ${rows.length} skill_tools links.`);
    await post("/skill_tools", rows);
  } else {
    console.log("All skill_tools links already present.");
  }
  return rows.length;
}

// ----------------------------------------------------------------
// 4. RETIRE legacy skill id=25 — only after 3 module skills exist.
//    Snapshot already captured to history.md before this run.
// ----------------------------------------------------------------
async function retireLegacySkill(skillByMod: Map<number, number>): Promise<boolean> {
  if (skillByMod.size !== 3) {
    console.log("Skipping legacy retire: 3 module skills not all present.");
    return false;
  }
  const legacy = await get(`/skills?id=eq.25&select=id,skill_name,domain_module_id`);
  if (legacy.length === 0) {
    console.log("Legacy skill id=25 already absent.");
    return false;
  }
  // Delete its skill_tools first (explicit; FK is cascade but we are deliberate).
  await call({ method: "DELETE", path: "/skill_tools?skill_id=eq.25" });
  await call({ method: "DELETE", path: "/skills?id=eq.25" });
  const check = await get(`/skills?id=eq.25&select=id`);
  if (check.length !== 0) throw new Error("Legacy skill id=25 still present after DELETE.");
  console.log("Retired legacy skill id=25 and its skill_tools.");
  return true;
}

// ----------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------
console.log("=== B1A-MODULE-SKILLS for ACCT-PRACT-MGMT (152) ===");
const created = await syncTools();
const reusable = await reusableToolMap();
const skillByMod = await syncSkills();
const stLinks = await syncSkillTools(skillByMod, reusable, created);
const retired = await retireLegacySkill(skillByMod);

console.log("\n=== SUMMARY ===");
console.log("Tools created/present (domain-specific):");
for (const [n, id] of created) console.log(`  ${n} -> id ${id}`);
console.log("System skills by module:");
for (const [mod, id] of skillByMod) console.log(`  module ${mod} -> skill id ${id}`);
console.log(`skill_tools links inserted this run: ${stLinks}`);
console.log(`Legacy skill id=25 retired: ${retired}`);

console.log("\nUI:");
console.log("  https://tests.semantius.app/domain_map/skills");
console.log("  https://tests.semantius.app/domain_map/tools");
console.log("  https://tests.semantius.app/domain_map/skill_tools");
