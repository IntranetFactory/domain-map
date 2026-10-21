#!/usr/bin/env bun
// load_re_brok_phase_m.ts - RE-BROKERAGE Phase-M modularization
//
// Splits RE-BROKERAGE (domain id 143) into 2 full modules following the
// agent-ops vs. brokerage-ops cut:
//
//   1. RE-BROK-AGENT-OPS         - Agent-facing workflow (lead -> list -> tour ->
//                                  transaction -> close). Solo agents and small
//                                  firms deploy this alone; agents at larger
//                                  brokerages work here while broker oversight
//                                  runs in BROKERAGE-OPS.
//   2. RE-BROK-BROKERAGE-OPS     - Broker-level oversight (multi-agent commission
//                                  splits, compliance review on transactions and
//                                  disclosures, trust-account oversight).
//
// What this load delivers:
//   - 2 domain_modules rows
//   - 8 domain_module_capabilities rows (MLS-SYNDICATION and TRANS-MGMT realize
//     in both modules; others single-realize)
//   - 10 domain_module_data_objects rows
//   - 12 new tools rows (5 master * 2 mutates + syndicate_to_mls + match_listing)
//   - 2 skills rows (one system skill per module per Rule #17)
//   - 27 skill_tools rows
//
// What this load does NOT do (separate follow-ups):
//   - lifecycle states + workflow-gate permissions (Phase B12, Rule #12)
//   - REAL-ESTATE-AGENT starter (Rule #19, blocked on this load completing)
//   - deletion of legacy re-brokerage-system skill id=95 (audit F1 follow-up;
//     requires user confirmation since DELETE is destructive)
//
// Idempotent: every step reads first, only writes what's missing. Re-running is safe.
// Run from project root (CLAUDE.md cwd rule):
//   bun run c:/dev/domain-map/.tmp_deploy/load_re_brok_phase_m.ts

export {};

type Row = Record<string, unknown>;

async function postgrest(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Row = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path} (exit ${code}): ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

const RE_BROK_DOMAIN_ID = 143;

// ============================================================
// 0. Resolve FK maps
// ============================================================
console.log("=== 0. Resolving FK maps ===");

const capCodes = [
  "RE-BROK-LEAD-CAPTURE",
  "RE-BROK-AGENT-CRM",
  "RE-BROK-MLS-SYNDICATION",
  "RE-BROK-TOUR-SCHED",
  "RE-BROK-TRANS-MGMT",
  "RE-BROK-COMMISSION",
];
const capRows: Row[] = await postgrest(
  "GET",
  `/capabilities?capability_code=in.(${capCodes.join(",")})&select=id,capability_code`,
) ?? [];
const capId: Record<string, number> = {};
for (const r of capRows) capId[String(r.capability_code)] = Number(r.id);
console.log(`  capabilities: ${Object.keys(capId).length} of ${capCodes.length}`);
for (const c of capCodes) if (!capId[c]) throw new Error(`Missing capability ${c}`);

const doNames = [
  "real_estate_listings",
  "tour_appointments",
  "real_estate_transactions",
  "disclosure_documents",
  "commission_splits",
  "crm_leads",
  "crm_contacts",
];
const doRows: Row[] = await postgrest(
  "GET",
  `/data_objects?data_object_name=in.(${doNames.join(",")})&select=id,data_object_name`,
) ?? [];
const doId: Record<string, number> = {};
for (const r of doRows) doId[String(r.data_object_name)] = Number(r.id);
console.log(`  data_objects: ${Object.keys(doId).length} of ${doNames.length}`);
for (const n of doNames) if (!doId[n]) throw new Error(`Missing data_object ${n}`);

// ============================================================
// 1. domain_modules (2 rows)
// ============================================================
console.log("\n=== 1. domain_modules ===");

type ModuleSpec = {
  code: string;
  name: string;
  description: string;
};

const modules: ModuleSpec[] = [
  {
    code: "RE-BROK-AGENT-OPS",
    name: "Real Estate Agent Operations",
    description:
      "Agent-facing workflow from lead capture through closing. Lead nurture (writes back into CRM contributor flow), listing creation and MLS syndication, tour scheduling and execution, transaction management (offer to escrow to contingencies to close), and buyer/seller disclosure handling. The deployable unit for solo agents and small firms; agents in larger brokerages work here while broker oversight runs in BROKERAGE-OPS.",
  },
  {
    code: "RE-BROK-BROKERAGE-OPS",
    name: "Brokerage Oversight and Commission Management",
    description:
      "Broker-level oversight on top of agent operations. Multi-agent commission-split engine with franchise overrides and per-agent caps, broker compliance review of transactions and disclosures, trust-account / escrow oversight, broker-level MLS conformance review. Only deployed when the brokerage has grown past informal-broker-supervision scale (typically 10+ agents).",
  },
];

const existingMods: Row[] = await postgrest(
  "GET",
  `/domain_modules?domain_id=eq.${RE_BROK_DOMAIN_ID}&select=id,domain_module_code`,
) ?? [];
const modId: Record<string, number> = {};
for (const r of existingMods) modId[String(r.domain_module_code)] = Number(r.id);

for (const m of modules) {
  if (modId[m.code]) {
    console.log(`  recycled ${m.code} (id=${modId[m.code]})`);
    continue;
  }
  console.log(`  new ${m.code}`);
  await postgrest("POST", "/domain_modules", {
    domain_module_code: m.code,
    domain_module_name: m.name,
    domain_id: RE_BROK_DOMAIN_ID,
    description: m.description,
    module_kind: "full",
  });
}

const finalMods: Row[] = await postgrest(
  "GET",
  `/domain_modules?domain_id=eq.${RE_BROK_DOMAIN_ID}&select=id,domain_module_code`,
) ?? [];
for (const r of finalMods) modId[String(r.domain_module_code)] = Number(r.id);
console.log(`  ${Object.keys(modId).length} module IDs resolved`);

// ============================================================
// 2. domain_module_capabilities (8 rows)
// ============================================================
console.log("\n=== 2. domain_module_capabilities ===");

type CapLink = { module: string; capability: string };

const capLinks: CapLink[] = [
  // AGENT-OPS
  { module: "RE-BROK-AGENT-OPS", capability: "RE-BROK-LEAD-CAPTURE" },
  { module: "RE-BROK-AGENT-OPS", capability: "RE-BROK-AGENT-CRM" },
  { module: "RE-BROK-AGENT-OPS", capability: "RE-BROK-MLS-SYNDICATION" },
  { module: "RE-BROK-AGENT-OPS", capability: "RE-BROK-TOUR-SCHED" },
  { module: "RE-BROK-AGENT-OPS", capability: "RE-BROK-TRANS-MGMT" },
  // BROKERAGE-OPS
  { module: "RE-BROK-BROKERAGE-OPS", capability: "RE-BROK-MLS-SYNDICATION" },
  { module: "RE-BROK-BROKERAGE-OPS", capability: "RE-BROK-TRANS-MGMT" },
  { module: "RE-BROK-BROKERAGE-OPS", capability: "RE-BROK-COMMISSION" },
];

const allModIds = Object.values(modId);
const existingCapLinks: Row[] = await postgrest(
  "GET",
  `/domain_module_capabilities?domain_module_id=in.(${allModIds.join(",")})&select=domain_module_id,capability_id`,
) ?? [];
const seenCapLinks = new Set(existingCapLinks.map((r) => `${r.domain_module_id}:${r.capability_id}`));

let capLinksAdded = 0;
let capLinksSkipped = 0;
for (const link of capLinks) {
  const mid = modId[link.module];
  const cid = capId[link.capability];
  const key = `${mid}:${cid}`;
  if (seenCapLinks.has(key)) {
    capLinksSkipped++;
    continue;
  }
  await postgrest("POST", "/domain_module_capabilities", {
    domain_module_id: mid,
    capability_id: cid,
  });
  capLinksAdded++;
}
console.log(`  new ${capLinksAdded} / recycled ${capLinksSkipped}`);

// ============================================================
// 3. domain_module_data_objects (10 rows)
// ============================================================
console.log("\n=== 3. domain_module_data_objects ===");

type DmdoLink = {
  module: string;
  dataObject: string;
  role: "master" | "embedded_master" | "contributor" | "consumer" | "derived";
  necessity: "required" | "optional";
};

const dmdoLinks: DmdoLink[] = [
  // AGENT-OPS - 4 masters + 2 contributors + 1 consumer
  { module: "RE-BROK-AGENT-OPS", dataObject: "real_estate_listings", role: "master", necessity: "required" },
  { module: "RE-BROK-AGENT-OPS", dataObject: "tour_appointments", role: "master", necessity: "required" },
  { module: "RE-BROK-AGENT-OPS", dataObject: "real_estate_transactions", role: "master", necessity: "required" },
  { module: "RE-BROK-AGENT-OPS", dataObject: "disclosure_documents", role: "master", necessity: "required" },
  { module: "RE-BROK-AGENT-OPS", dataObject: "crm_leads", role: "contributor", necessity: "required" },
  { module: "RE-BROK-AGENT-OPS", dataObject: "crm_contacts", role: "contributor", necessity: "required" },
  { module: "RE-BROK-AGENT-OPS", dataObject: "commission_splits", role: "consumer", necessity: "optional" },
  // BROKERAGE-OPS - 1 master + 2 contributors
  { module: "RE-BROK-BROKERAGE-OPS", dataObject: "commission_splits", role: "master", necessity: "required" },
  { module: "RE-BROK-BROKERAGE-OPS", dataObject: "real_estate_transactions", role: "contributor", necessity: "required" },
  { module: "RE-BROK-BROKERAGE-OPS", dataObject: "disclosure_documents", role: "contributor", necessity: "required" },
];

const existingDmdo: Row[] = await postgrest(
  "GET",
  `/domain_module_data_objects?domain_module_id=in.(${allModIds.join(",")})&select=domain_module_id,data_object_id`,
) ?? [];
const seenDmdo = new Set(existingDmdo.map((r) => `${r.domain_module_id}:${r.data_object_id}`));

let dmdoAdded = 0;
let dmdoSkipped = 0;
for (const link of dmdoLinks) {
  const mid = modId[link.module];
  const did = doId[link.dataObject];
  const key = `${mid}:${did}`;
  if (seenDmdo.has(key)) {
    dmdoSkipped++;
    continue;
  }
  await postgrest("POST", "/domain_module_data_objects", {
    domain_module_id: mid,
    data_object_id: did,
    role: link.role,
    necessity: link.necessity,
  });
  dmdoAdded++;
}
console.log(`  new ${dmdoAdded} / recycled ${dmdoSkipped}`);

// ============================================================
// 4. New tools (12 rows)
// ============================================================
console.log("\n=== 4. tools (new mutate primitives) ===");

type ToolSpec = {
  name: string;
  operationKind: "query" | "mutate" | "side_effect" | "compute" | "inbound";
  dataObject: string | null;
  description: string;
};

const newTools: ToolSpec[] = [
  // real_estate_listings mutates
  {
    name: "create_real_estate_listing",
    operationKind: "mutate",
    dataObject: "real_estate_listings",
    description: "Create a new real estate listing (price, address, listing-agent attribution, listing-agreement reference). Used by AGENT-OPS at the start of the listing-side workflow.",
  },
  {
    name: "update_real_estate_listing",
    operationKind: "mutate",
    dataObject: "real_estate_listings",
    description: "Update a real estate listing (price changes, status transitions draft -> active -> under_contract -> sold, photos, description). Workflow gate at status transitions.",
  },
  // tour_appointments mutates
  {
    name: "create_tour_appointment",
    operationKind: "mutate",
    dataObject: "tour_appointments",
    description: "Book a property tour with a prospect (listing reference, date/time, attendees, lockbox or access instructions).",
  },
  {
    name: "update_tour_appointment",
    operationKind: "mutate",
    dataObject: "tour_appointments",
    description: "Update a tour appointment (reschedule, mark completed with notes, capture buyer-feedback signals).",
  },
  // real_estate_transactions mutates
  {
    name: "create_real_estate_transaction",
    operationKind: "mutate",
    dataObject: "real_estate_transactions",
    description: "Open a new real estate transaction (buyer/seller, listing reference, offer price, escrow agent, target close date). Created when an accepted offer transitions the listing to under_contract.",
  },
  {
    name: "update_real_estate_transaction",
    operationKind: "mutate",
    dataObject: "real_estate_transactions",
    description: "Update a transaction (contingency status, inspection results, financing milestones, broker compliance review, close-date adjustments). Workflow gate at contingency clearance and close.",
  },
  // disclosure_documents mutates
  {
    name: "create_disclosure_document",
    operationKind: "mutate",
    dataObject: "disclosure_documents",
    description: "Generate a required disclosure document from a state-specific template (agency disclosure, lead-paint, natural-hazards, transfer disclosure). Attached to a transaction.",
  },
  {
    name: "update_disclosure_document",
    operationKind: "mutate",
    dataObject: "disclosure_documents",
    description: "Update a disclosure document (party acknowledgment timestamps, broker compliance sign-off, version history when content changes after initial delivery).",
  },
  // commission_splits mutates
  {
    name: "create_commission_split",
    operationKind: "mutate",
    dataObject: "commission_splits",
    description: "Create a commission-split record on a closed transaction (listing-side vs buyer-side splits, agent shares, franchise overrides, broker take). Authored by BROKERAGE-OPS.",
  },
  {
    name: "update_commission_split",
    operationKind: "mutate",
    dataObject: "commission_splits",
    description: "Update a commission split (per-agent cap adjustments, dispute resolution outcomes, recalculation after transaction-level price corrections).",
  },
  // syndicate_to_mls (side_effect, external)
  {
    name: "syndicate_to_mls",
    operationKind: "side_effect",
    dataObject: null,
    description: "Publish an active listing to the local MLS (multiple listing service) via the MLS's syndication API. Enforces MLS-specific conformance: required fields, photo count limits, status-change timestamps. External delivery (each MLS has its own endpoint).",
  },
  // match_listing_to_buyer_preferences (compute, external)
  {
    name: "match_listing_to_buyer_preferences",
    operationKind: "compute",
    dataObject: null,
    description: "ML-based matching of a new or updated listing against the agent's saved buyer preferences (price band, beds/baths, neighborhood, must-have features). Optional augmentation in AGENT-OPS; agents can match manually.",
  },
];

const existingNewToolRows: Row[] = await postgrest(
  "GET",
  `/tools?tool_name=in.(${newTools.map((t) => t.name).join(",")})&select=id,tool_name`,
) ?? [];
const seenNewTools = new Set(existingNewToolRows.map((r) => String(r.tool_name)));

let toolsAdded = 0;
let toolsSkipped = 0;
for (const t of newTools) {
  if (seenNewTools.has(t.name)) {
    toolsSkipped++;
    continue;
  }
  const body: Row = {
    tool_name: t.name,
    operation_kind: t.operationKind,
    description: t.description,
  };
  if (t.dataObject) body.data_object_id = doId[t.dataObject];
  await postgrest("POST", "/tools", body);
  toolsAdded++;
}
console.log(`  new ${toolsAdded} / recycled ${toolsSkipped}`);

// Resolve full tool map (existing + new) for skill_tools authoring
const allToolNames = [
  // existing
  "query_real_estate_listings", "query_tour_appointments", "query_real_estate_transactions",
  "query_disclosure_documents", "query_commission_splits",
  "query_leads", "update_lead", "query_contacts", "update_contact",
  "notify_person", "notify_team", "sign_document", "generate_text",
  // newly created
  ...newTools.map((t) => t.name),
];
const allToolRows: Row[] = await postgrest(
  "GET",
  `/tools?tool_name=in.(${allToolNames.join(",")})&select=id,tool_name,operation_kind,coverage_tier`,
) ?? [];
const toolId: Record<string, number> = {};
const toolKind: Record<string, string> = {};
const toolTier: Record<string, string> = {};
for (const r of allToolRows) {
  toolId[String(r.tool_name)] = Number(r.id);
  toolKind[String(r.tool_name)] = String(r.operation_kind);
  toolTier[String(r.tool_name)] = String(r.coverage_tier);
}
console.log(`  ${Object.keys(toolId).length} of ${allToolNames.length} tools resolved`);
for (const n of allToolNames) if (!toolId[n]) console.log(`  WARN missing tool: ${n}`);

// ============================================================
// 5. skills (2 system skills, Rule #17)
// ============================================================
console.log("\n=== 5. skills (2 system skills) ===");

type SkillSpec = {
  name: string;
  module: string;
  description: string;
  required: string[];
  optional: string[];
};

const skills: SkillSpec[] = [
  {
    name: "re_brok_agent_ops_agent",
    module: "RE-BROK-AGENT-OPS",
    description:
      "Per-module system skill for the agent-facing real estate workflow. Covers lead capture and CRM contributor writes, listing creation and MLS syndication, tour scheduling and execution, transaction management end-to-end (offer to close), and disclosure handling. Optional augmentations: ML-based buyer-preference matching and AI listing-description generation.",
    required: [
      "query_real_estate_listings", "create_real_estate_listing", "update_real_estate_listing",
      "query_tour_appointments", "create_tour_appointment", "update_tour_appointment",
      "query_real_estate_transactions", "create_real_estate_transaction", "update_real_estate_transaction",
      "query_disclosure_documents", "create_disclosure_document", "update_disclosure_document",
      "query_leads", "update_lead",
      "query_contacts", "update_contact",
      "notify_person",
      "sign_document",
      "syndicate_to_mls",
    ],
    optional: ["match_listing_to_buyer_preferences", "generate_text"],
  },
  {
    name: "re_brok_brokerage_ops_agent",
    module: "RE-BROK-BROKERAGE-OPS",
    description:
      "Per-module system skill for broker-level oversight. Masters commission splits with franchise overrides and per-agent caps; contributes compliance-review fields on transactions and disclosures. Optional augmentations: broadcast notifications to the broker compliance team and AI-generated compliance summaries.",
    required: [
      "query_commission_splits", "create_commission_split", "update_commission_split",
      "query_real_estate_transactions", "update_real_estate_transaction",
      "query_disclosure_documents", "update_disclosure_document",
      "notify_person",
    ],
    optional: ["notify_team", "generate_text"],
  },
];

const existingSkills: Row[] = await postgrest(
  "GET",
  `/skills?skill_name=in.(${skills.map((s) => s.name).join(",")})&select=id,skill_name`,
) ?? [];
const skillId: Record<string, number> = {};
for (const r of existingSkills) skillId[String(r.skill_name)] = Number(r.id);

for (const s of skills) {
  if (skillId[s.name]) {
    console.log(`  recycled ${s.name} (id=${skillId[s.name]})`);
    continue;
  }
  const mid = modId[s.module];
  if (!mid) throw new Error(`Skill ${s.name}: module ${s.module} unresolved`);
  console.log(`  new ${s.name}`);
  await postgrest("POST", "/skills", {
    skill_name: s.name,
    description: s.description,
    skill_type: "system",
    domain_id: RE_BROK_DOMAIN_ID,
    domain_module_id: mid,
  });
}

const finalSkills: Row[] = await postgrest(
  "GET",
  `/skills?skill_name=in.(${skills.map((s) => s.name).join(",")})&select=id,skill_name`,
) ?? [];
for (const r of finalSkills) skillId[String(r.skill_name)] = Number(r.id);
console.log(`  ${Object.keys(skillId).length} skill IDs resolved`);

// ============================================================
// 6. skill_tools
// ============================================================
console.log("\n=== 6. skill_tools ===");

const allSkillIds = Object.values(skillId);
const existingST: Row[] = await postgrest(
  "GET",
  `/skill_tools?skill_id=in.(${allSkillIds.join(",")})&select=skill_id,tool_id`,
) ?? [];
const seenST = new Set(existingST.map((r) => `${r.skill_id}:${r.tool_id}`));

let stAdded = 0;
let stSkipped = 0;
for (const s of skills) {
  const sid = skillId[s.name];
  if (!sid) continue;
  const pairs: Array<{ toolName: string; level: "required" | "optional" }> = [
    ...s.required.map((t) => ({ toolName: t, level: "required" as const })),
    ...s.optional.map((t) => ({ toolName: t, level: "optional" as const })),
  ];
  for (const p of pairs) {
    const tid = toolId[p.toolName];
    if (!tid) {
      console.log(`  WARN ${s.name} -> ${p.toolName} (tool unresolved)`);
      continue;
    }
    const key = `${sid}:${tid}`;
    if (seenST.has(key)) {
      stSkipped++;
      continue;
    }
    await postgrest("POST", "/skill_tools", {
      skill_id: sid,
      tool_id: tid,
      requirement_level: p.level,
    });
    stAdded++;
  }
}
console.log(`  new ${stAdded} / recycled ${stSkipped}`);

// ============================================================
// 7. Verification
// ============================================================
console.log("\n=== 7. Verification ===");

// M1, M2: domain has >=2 full modules
const modCheck: Row[] = await postgrest(
  "GET",
  `/domain_modules?domain_id=eq.${RE_BROK_DOMAIN_ID}&module_kind=eq.full&select=id`,
) ?? [];
console.log(`  M1/M2: ${modCheck.length} full modules (need >=2 since 6 capabilities) ${modCheck.length >= 2 ? "PASS" : "FAIL"}`);

// M4: every capability has >=1 realizing module
let m4ok = true;
for (const c of capCodes) {
  const cid = capId[c];
  const realizers: Row[] = await postgrest(
    "GET",
    `/domain_module_capabilities?capability_id=eq.${cid}&domain_module_id=in.(${allModIds.join(",")})&select=id`,
  ) ?? [];
  if (realizers.length === 0) {
    console.log(`  M4 FAIL: capability ${c} has no realizer`);
    m4ok = false;
  }
}
console.log(`  M4: every capability has >=1 realizer ${m4ok ? "PASS" : "FAIL"}`);

// M6: every module realizes >=1 capability
let m6ok = true;
for (const code of Object.keys(modId)) {
  if (!modules.find((m) => m.code === code)) continue;
  const mid = modId[code];
  const realized: Row[] = await postgrest(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${mid}&select=id`,
  ) ?? [];
  if (realized.length === 0) {
    console.log(`  M6 FAIL: module ${code} realizes no capability`);
    m6ok = false;
  }
}
console.log(`  M6: every module realizes >=1 capability ${m6ok ? "PASS" : "FAIL"}`);

// F2: every module has exactly one system skill
let f2ok = true;
for (const code of Object.keys(modId)) {
  if (!modules.find((m) => m.code === code)) continue;
  const mid = modId[code];
  const sysSkills: Row[] = await postgrest(
    "GET",
    `/skills?domain_module_id=eq.${mid}&skill_type=eq.system&select=id`,
  ) ?? [];
  if (sysSkills.length !== 1) {
    console.log(`  F2 FAIL: module ${code} has ${sysSkills.length} system skills (expected 1)`);
    f2ok = false;
  }
}
console.log(`  F2: every module has exactly 1 system skill ${f2ok ? "PASS" : "FAIL"}`);

// F3: every system skill has >=1 skill_tools row
let f3ok = true;
for (const s of skills) {
  const sid = skillId[s.name];
  if (!sid) continue;
  const st: Row[] = await postgrest(
    "GET",
    `/skill_tools?skill_id=eq.${sid}&select=id`,
  ) ?? [];
  if (st.length === 0) {
    console.log(`  F3 FAIL: skill ${s.name} has zero skill_tools`);
    f3ok = false;
  }
}
console.log(`  F3: every system skill has >=1 skill_tools ${f3ok ? "PASS" : "FAIL"}`);

// Semantius coverage scores per skill
console.log();
console.log("  Semantius coverage per skill (strict / operational):");
console.log("  skill                            | tools | platform | plat+integ | strict | operational");
console.log("  ---------------------------------|-------|----------|------------|--------|------------");
for (const s of skills) {
  const sid = skillId[s.name];
  if (!sid) continue;
  const allTools = [...s.required, ...s.optional];
  const total = allTools.length;
  const platform = allTools.filter((t) => toolTier[t] === "platform").length;
  const platformOrIntegration = allTools.filter((t) => toolTier[t] === "platform" || toolTier[t] === "integration").length;
  const strict = Math.round((platform / total) * 100);
  const op = Math.round((platformOrIntegration / total) * 100);
  console.log(
    `  ${s.name.padEnd(33)} | ${String(total).padStart(5)} | ${String(platform).padStart(8)} | ${String(platformOrIntegration).padStart(10)} | ${String(strict).padStart(5)}% | ${String(op).padStart(10)}%`,
  );
}

// Legacy skill F1 warning
const legacy: Row[] = await postgrest(
  "GET",
  `/skills?domain_id=eq.${RE_BROK_DOMAIN_ID}&skill_type=eq.system&domain_module_id=is.null&select=id,skill_name`,
) ?? [];
if (legacy.length > 0) {
  console.log();
  console.log(`  F1 WARN: legacy domain-level system skill(s) still present:`);
  for (const r of legacy) console.log(`    id=${r.id} name=${r.skill_name}`);
  console.log(`    Per audit F1, these are obsolete once module-level system skills exist.`);
  console.log(`    Recommend DELETE after user confirmation (destructive).`);
}

console.log();
console.log("=== complete ===");
console.log("UI links to verify:");
console.log("  https://tests.semantius.app/domain_map/domain_modules");
console.log("  https://tests.semantius.app/domain_map/domain_module_capabilities");
console.log("  https://tests.semantius.app/domain_map/domain_module_data_objects");
console.log("  https://tests.semantius.app/domain_map/skills");
console.log("  https://tests.semantius.app/domain_map/tools");
console.log("  https://tests.semantius.app/domain_map/skill_tools");
