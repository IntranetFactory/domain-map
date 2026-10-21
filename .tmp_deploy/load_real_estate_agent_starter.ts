#!/usr/bin/env bun
// load_real_estate_agent_starter.ts - REAL-ESTATE-AGENT starter (Rule #19)
//
// Solo-agent and small-firm persona bundle. Single-install deployable that
// embeds masters from CRM (leads + contacts), RE-BROKERAGE (listings + tours
// + transactions + disclosures), and CLM (legal_contracts). Larger brokerages
// deploy the underlying full modules and skip the starter.
//
// PREREQUISITE: RE-BROKERAGE Phase-M must be loaded first (this script
// requires real_estate_listings / tour_appointments / real_estate_transactions /
// disclosure_documents to have role='master' at the module layer in
// RE-BROK-AGENT-OPS).
//
// What this load delivers:
//   - 1 domain_modules row (module_kind='starter', domain_id=NULL)
//   - 3 domain_module_host_domains rows (CRM, RE-BROKERAGE, CLM)
//   - 8 domain_module_capabilities rows
//   - 7 domain_module_data_objects rows (all embedded_master)
//   - 3 permissions rows (baseline-read, baseline-manage, baseline-admin)
//   - 1 skills row (system skill)
//   - 24 skill_tools rows (20 required + 4 optional)
//
// Six Rule-#19 invariants validated pre-flight:
//   1. Role restricted: every DMDO row is embedded_master (never master/derived)
//   2. Canonical master exists: every embedded data_object has a master row
//      somewhere in a module_kind='full' module
//   3. No lifecycle states authored (loader doesn't touch data_object_lifecycle_states)
//   4. Exactly 3 baseline permissions, no workflow-gate permissions
//   5. domain_module_capabilities allowed (8 rows for marketing surface)
//   6. Exactly 1 system skill with >=1 skill_tools rows
//
// Idempotent: every step reads first, only writes what's missing.
// Run from project root (CLAUDE.md cwd rule):
//   bun run c:/dev/domain-map/.tmp_deploy/load_real_estate_agent_starter.ts

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

const STARTER_CODE = "REAL-ESTATE-AGENT";
const STARTER_NAME = "Real Estate Agent (solo / small firm bundle)";
const STARTER_DESC =
  "Solo-agent and small-firm persona bundle. Single-install deployable for individual real estate agents covering lead capture and contact relationships (CRM-LEAD-MGT, CRM-ACCT-MGT), listing creation and MLS syndication, tour scheduling, transaction execution, disclosure handling (RE-BROK-AGENT-OPS), and contract reference (CLM-REPOSITORY). One module to install; larger brokerages deploy the underlying full modules and skip the starter.";

const CRM_DOMAIN_ID = 69;
const RE_BROK_DOMAIN_ID = 143;
const CLM_DOMAIN_ID = 26;
const HOST_DOMAIN_IDS = [CRM_DOMAIN_ID, RE_BROK_DOMAIN_ID, CLM_DOMAIN_ID];

const DOMAIN_MAP_MODULE_ID = 1001; // permissions.module_id (catalog owner)

// ============================================================
// 0. Resolve FK maps + validate canonical masters exist (invariant #2)
// ============================================================
console.log("=== 0. Resolving FK maps + validating canonical masters ===");

const doNames = [
  "crm_leads", "crm_contacts",
  "real_estate_listings", "tour_appointments", "real_estate_transactions", "disclosure_documents",
  "legal_contracts",
];
const doRows: Row[] = await postgrest(
  "GET",
  `/data_objects?data_object_name=in.(${doNames.join(",")})&select=id,data_object_name,kind`,
) ?? [];
const doId: Record<string, number> = {};
const doKind: Record<string, string> = {};
for (const r of doRows) {
  doId[String(r.data_object_name)] = Number(r.id);
  doKind[String(r.data_object_name)] = String(r.kind);
}
console.log(`  data_objects: ${Object.keys(doId).length} of ${doNames.length}`);
for (const n of doNames) if (!doId[n]) throw new Error(`Missing data_object ${n}`);

// Invariant #2: every embedded_master must point at a data_object that has
// role='master' in some module_kind='full' module, OR kind='platform_builtin'.
console.log("\n  Invariant #2 pre-flight: canonical master check");
for (const n of doNames) {
  const did = doId[n];
  if (doKind[n] === "platform_builtin") {
    console.log(`    ${n}: platform_builtin (passes by exception)`);
    continue;
  }
  const masters: Row[] = await postgrest(
    "GET",
    `/domain_module_data_objects?data_object_id=eq.${did}&role=eq.master&select=domain_module:domain_modules!inner(id,domain_module_code,module_kind)&domain_module.module_kind=eq.full`,
  ) ?? [];
  if (masters.length === 0) {
    throw new Error(`Invariant #2 violation: ${n} has no role='master' row in any module_kind='full' module`);
  }
  const masterMods = masters.map((r: any) => r.domain_module?.domain_module_code).filter(Boolean);
  console.log(`    ${n}: mastered by ${masterMods.join(", ")}`);
}

// Capability map
const capCodes = [
  // RE-BROK
  "RE-BROK-LEAD-CAPTURE", "RE-BROK-AGENT-CRM", "RE-BROK-MLS-SYNDICATION",
  "RE-BROK-TOUR-SCHED", "RE-BROK-TRANS-MGMT",
  // CRM
  "CRM-LEAD-MGT", "CRM-ACCT-CONTACT",
  // CLM
  "CLM-CONTRACT-REPOSITORY",
];
const capRows: Row[] = await postgrest(
  "GET",
  `/capabilities?capability_code=in.(${capCodes.join(",")})&select=id,capability_code`,
) ?? [];
const capId: Record<string, number> = {};
for (const r of capRows) capId[String(r.capability_code)] = Number(r.id);
console.log(`  capabilities: ${Object.keys(capId).length} of ${capCodes.length}`);
for (const c of capCodes) if (!capId[c]) throw new Error(`Missing capability ${c}`);

// ============================================================
// 1. domain_modules (1 starter row)
// ============================================================
console.log("\n=== 1. domain_modules (starter) ===");

const existingStarter: Row[] = await postgrest(
  "GET",
  `/domain_modules?domain_module_code=eq.${STARTER_CODE}&select=id,module_kind,domain_id`,
) ?? [];

let starterId: number;
if (existingStarter.length > 0) {
  const e = existingStarter[0] as any;
  starterId = Number(e.id);
  console.log(`  recycled ${STARTER_CODE} (id=${starterId}, kind=${e.module_kind}, domain_id=${e.domain_id})`);
} else {
  console.log(`  new ${STARTER_CODE}`);
  await postgrest("POST", "/domain_modules", {
    domain_module_code: STARTER_CODE,
    domain_module_name: STARTER_NAME,
    domain_id: null,
    description: STARTER_DESC,
    module_kind: "starter",
  });
  const [created] = await postgrest(
    "GET",
    `/domain_modules?domain_module_code=eq.${STARTER_CODE}&select=id`,
  ) ?? [];
  starterId = Number(created.id);
  console.log(`  id=${starterId}`);
}

// ============================================================
// 2. domain_module_host_domains (3 rows)
// ============================================================
console.log("\n=== 2. domain_module_host_domains ===");

const existingHosts: Row[] = await postgrest(
  "GET",
  `/domain_module_host_domains?domain_module_id=eq.${starterId}&select=domain_id`,
) ?? [];
const seenHosts = new Set(existingHosts.map((r) => Number(r.domain_id)));

let hostsAdded = 0;
let hostsSkipped = 0;
for (const did of HOST_DOMAIN_IDS) {
  if (seenHosts.has(did)) {
    hostsSkipped++;
    continue;
  }
  await postgrest("POST", "/domain_module_host_domains", {
    domain_module_id: starterId,
    domain_id: did,
  });
  hostsAdded++;
}
console.log(`  new ${hostsAdded} / recycled ${hostsSkipped}`);

// ============================================================
// 3. domain_module_capabilities (8 rows)
// ============================================================
console.log("\n=== 3. domain_module_capabilities ===");

const existingCaps: Row[] = await postgrest(
  "GET",
  `/domain_module_capabilities?domain_module_id=eq.${starterId}&select=capability_id`,
) ?? [];
const seenCaps = new Set(existingCaps.map((r) => Number(r.capability_id)));

let capsAdded = 0;
let capsSkipped = 0;
for (const code of capCodes) {
  const cid = capId[code];
  if (seenCaps.has(cid)) {
    capsSkipped++;
    continue;
  }
  await postgrest("POST", "/domain_module_capabilities", {
    domain_module_id: starterId,
    capability_id: cid,
  });
  capsAdded++;
}
console.log(`  new ${capsAdded} / recycled ${capsSkipped}`);

// ============================================================
// 4. domain_module_data_objects (7 embedded_master rows)
// ============================================================
console.log("\n=== 4. domain_module_data_objects (embedded_master only) ===");

type DmdoLink = {
  dataObject: string;
  role: "embedded_master" | "consumer" | "contributor"; // Rule #19 invariant #1
  necessity: "required" | "optional";
};

const dmdoLinks: DmdoLink[] = [
  { dataObject: "crm_leads", role: "embedded_master", necessity: "required" },
  { dataObject: "crm_contacts", role: "embedded_master", necessity: "required" },
  { dataObject: "real_estate_listings", role: "embedded_master", necessity: "required" },
  { dataObject: "tour_appointments", role: "embedded_master", necessity: "required" },
  { dataObject: "real_estate_transactions", role: "embedded_master", necessity: "required" },
  { dataObject: "disclosure_documents", role: "embedded_master", necessity: "required" },
  { dataObject: "legal_contracts", role: "embedded_master", necessity: "required" },
];

// Invariant #1 pre-flight (also enforced platform-side by starter_no_master rule)
for (const link of dmdoLinks) {
  // @ts-expect-error - intentional runtime check
  if (link.role === "master" || link.role === "derived") {
    throw new Error(`Invariant #1: starter junction on ${link.dataObject} cannot use role '${link.role}'`);
  }
}

const existingDmdo: Row[] = await postgrest(
  "GET",
  `/domain_module_data_objects?domain_module_id=eq.${starterId}&select=data_object_id`,
) ?? [];
const seenDmdo = new Set(existingDmdo.map((r) => Number(r.data_object_id)));

let dmdoAdded = 0;
let dmdoSkipped = 0;
for (const link of dmdoLinks) {
  const did = doId[link.dataObject];
  if (seenDmdo.has(did)) {
    dmdoSkipped++;
    continue;
  }
  await postgrest("POST", "/domain_module_data_objects", {
    domain_module_id: starterId,
    data_object_id: did,
    role: link.role,
    necessity: link.necessity,
  });
  dmdoAdded++;
}
console.log(`  new ${dmdoAdded} / recycled ${dmdoSkipped}`);

// ============================================================
// 5. permissions (3 baseline rows - invariant #4)
// ============================================================
console.log("\n=== 5. permissions (3 baseline tiers) ===");

const permPrefix = "real-estate-agent";
type PermSpec = {
  name: string;
  tier: "baseline-read" | "baseline-manage" | "baseline-admin";
  description: string;
};
const perms: PermSpec[] = [
  {
    name: `${permPrefix}:read`,
    tier: "baseline-read",
    description: "Read access to every embedded entity in the REAL-ESTATE-AGENT starter (leads, contacts, listings, tours, transactions, disclosures, legal contracts).",
  },
  {
    name: `${permPrefix}:manage`,
    tier: "baseline-manage",
    description: "Read + write access to non-administrative state on every embedded entity in the REAL-ESTATE-AGENT starter (create / update on the agent's own records).",
  },
  {
    name: `${permPrefix}:admin`,
    tier: "baseline-admin",
    description: "Administrative access on every embedded entity in the REAL-ESTATE-AGENT starter, including settings and deletion. Typical role: the solo agent themselves; the broker if multi-agent oversight is delegated.",
  },
];

const existingPerms: Row[] = await postgrest(
  "GET",
  `/permissions?permission_name=in.(${perms.map((p) => p.name).join(",")})&select=id,permission_name`,
) ?? [];
const seenPerms = new Set(existingPerms.map((r) => String(r.permission_name)));

let permsAdded = 0;
let permsSkipped = 0;
for (const p of perms) {
  if (seenPerms.has(p.name)) {
    permsSkipped++;
    continue;
  }
  await postgrest("POST", "/permissions", {
    permission_name: p.name,
    description: p.description,
    tier: p.tier,
    domain_module_id: starterId,
    module_id: DOMAIN_MAP_MODULE_ID,
  });
  permsAdded++;
}
console.log(`  new ${permsAdded} / recycled ${permsSkipped}`);

// ============================================================
// 6. skills (1 system skill - invariant #6)
// ============================================================
console.log("\n=== 6. skills (1 system skill) ===");

const skillName = "real_estate_agent_starter";
const skillDesc =
  "Solo-agent system skill for the REAL-ESTATE-AGENT starter. Spans CRM lead/contact workflow, RE-BROKERAGE listing/tour/transaction/disclosure workflow, and CLM contract reference. Calls platform CRUD on every embedded master; uses notify_person for client comms, sign_document for purchase agreements, syndicate_to_mls for listing distribution. Optional augmentations: ML buyer-preference matching, AI listing-description and follow-up-email generation, broker-side contract authoring and execution overrides.";

const existingSkills: Row[] = await postgrest(
  "GET",
  `/skills?skill_name=eq.${skillName}&select=id,skill_name`,
) ?? [];

let skillId: number;
if (existingSkills.length > 0) {
  skillId = Number((existingSkills[0] as any).id);
  console.log(`  recycled ${skillName} (id=${skillId})`);
} else {
  console.log(`  new ${skillName}`);
  // System skills require domain_id (check constraint). For a cross-domain
  // starter (module domain_id is NULL), use the most-relevant host domain
  // for rollup purposes; the authoritative scope is domain_module_id.
  await postgrest("POST", "/skills", {
    skill_name: skillName,
    description: skillDesc,
    skill_type: "system",
    domain_id: RE_BROK_DOMAIN_ID,
    domain_module_id: starterId,
  });
  const [created] = await postgrest(
    "GET",
    `/skills?skill_name=eq.${skillName}&select=id`,
  ) ?? [];
  skillId = Number(created.id);
  console.log(`  id=${skillId}`);
}

// ============================================================
// 7. skill_tools (20 required + 4 optional = 24 rows)
// ============================================================
console.log("\n=== 7. skill_tools ===");

const requiredTools = [
  // CRM (6)
  "query_leads", "update_lead", "convert_lead",
  "query_contacts", "create_contact", "update_contact",
  // RE-BROK (11)
  "query_real_estate_listings", "create_real_estate_listing", "update_real_estate_listing",
  "query_tour_appointments", "create_tour_appointment", "update_tour_appointment",
  "query_real_estate_transactions", "create_real_estate_transaction", "update_real_estate_transaction",
  "query_disclosure_documents",
  "syndicate_to_mls",
  // CLM (1)
  "query_legal_contracts",
  // cross-cutting (2)
  "notify_person", "sign_document",
];
const optionalTools = [
  "create_legal_contract", "execute_legal_contract",
  "match_listing_to_buyer_preferences", "generate_text",
];
const allToolNames = [...requiredTools, ...optionalTools];

const toolRows: Row[] = await postgrest(
  "GET",
  `/tools?tool_name=in.(${allToolNames.join(",")})&select=id,tool_name,operation_kind,coverage_tier`,
) ?? [];
const toolId: Record<string, number> = {};
const toolTier: Record<string, string> = {};
for (const r of toolRows) {
  toolId[String(r.tool_name)] = Number(r.id);
  toolTier[String(r.tool_name)] = String(r.coverage_tier);
}
console.log(`  ${Object.keys(toolId).length} of ${allToolNames.length} tools resolved`);
for (const n of allToolNames) if (!toolId[n]) throw new Error(`Tool unresolved: ${n}`);

const existingST: Row[] = await postgrest(
  "GET",
  `/skill_tools?skill_id=eq.${skillId}&select=tool_id`,
) ?? [];
const seenST = new Set(existingST.map((r) => Number(r.tool_id)));

let stAdded = 0;
let stSkipped = 0;
for (const t of requiredTools) {
  const tid = toolId[t];
  if (seenST.has(tid)) { stSkipped++; continue; }
  await postgrest("POST", "/skill_tools", { skill_id: skillId, tool_id: tid, requirement_level: "required" });
  stAdded++;
}
for (const t of optionalTools) {
  const tid = toolId[t];
  if (seenST.has(tid)) { stSkipped++; continue; }
  await postgrest("POST", "/skill_tools", { skill_id: skillId, tool_id: tid, requirement_level: "optional" });
  stAdded++;
}
console.log(`  new ${stAdded} / recycled ${stSkipped}`);

// ============================================================
// 8. Six-invariant verification
// ============================================================
console.log("\n=== 8. Rule #19 six-invariant verification ===");

// Invariant #1: role restricted
const dmdoCheck: Row[] = await postgrest(
  "GET",
  `/domain_module_data_objects?domain_module_id=eq.${starterId}&select=role`,
) ?? [];
const i1 = dmdoCheck.every((r) => ["embedded_master", "consumer", "contributor"].includes(String(r.role)));
console.log(`  #1 role restricted (no master/derived):     ${i1 ? "PASS" : "FAIL"} (${dmdoCheck.length} rows)`);

// Invariant #2: already validated pre-flight
console.log(`  #2 canonical master exists for each:        PASS (validated pre-flight)`);

// Invariant #3: no lifecycle states authored from starter
//   (loader never wrote any; structural check: data_object_lifecycle_states
//   has no rows whose domain_module_id matches this starter)
const lifecycleCheck: Row[] = await postgrest(
  "GET",
  `/data_object_lifecycle_states?domain_module_id=eq.${starterId}&select=id`,
) ?? [];
const i3 = lifecycleCheck.length === 0;
console.log(`  #3 no lifecycle states authored:            ${i3 ? "PASS" : "FAIL"} (${lifecycleCheck.length} rows)`);

// Invariant #4: exactly 3 baseline permissions, no workflow gates
const permCheck: Row[] = await postgrest(
  "GET",
  `/permissions?domain_module_id=eq.${starterId}&select=tier`,
) ?? [];
const baselineCount = permCheck.filter((r) => String(r.tier).startsWith("baseline-")).length;
const gateCount = permCheck.filter((r) => String(r.tier) === "workflow-gate").length;
const i4 = baselineCount === 3 && gateCount === 0;
console.log(`  #4 exactly 3 baseline, no workflow gates:   ${i4 ? "PASS" : "FAIL"} (baseline=${baselineCount}, gates=${gateCount})`);

// Invariant #5: domain_module_capabilities present
const capCheck: Row[] = await postgrest(
  "GET",
  `/domain_module_capabilities?domain_module_id=eq.${starterId}&select=id`,
) ?? [];
const i5 = capCheck.length > 0;
console.log(`  #5 capabilities linked:                     ${i5 ? "PASS" : "FAIL"} (${capCheck.length} rows)`);

// Invariant #6: exactly 1 system skill with >=1 skill_tools
const skillCheck: Row[] = await postgrest(
  "GET",
  `/skills?domain_module_id=eq.${starterId}&skill_type=eq.system&select=id`,
) ?? [];
const stCheck: Row[] = await postgrest(
  "GET",
  `/skill_tools?skill_id=eq.${skillId}&select=id`,
) ?? [];
const i6 = skillCheck.length === 1 && stCheck.length >= 1;
console.log(`  #6 exactly 1 system skill, >=1 skill_tools: ${i6 ? "PASS" : "FAIL"} (skills=${skillCheck.length}, tools=${stCheck.length})`);

console.log();
const allPass = i1 && i3 && i4 && i5 && i6;
console.log(allPass ? "  All Rule #19 invariants PASS" : "  Invariant FAILURE - investigate");

// Semantius coverage
console.log();
console.log("=== 9. Semantius coverage ===");
const total = allToolNames.length;
const platform = allToolNames.filter((t) => toolTier[t] === "platform").length;
const platformOrIntegration = allToolNames.filter((t) => toolTier[t] === "platform" || toolTier[t] === "integration").length;
const strict = Math.round((platform / total) * 100);
const op = Math.round((platformOrIntegration / total) * 100);
console.log(`  total tools: ${total}`);
console.log(`  platform:    ${platform} (strict=${strict}%)`);
console.log(`  plat+integ:  ${platformOrIntegration} (operational=${op}%)`);
console.log(`  external:    ${allToolNames.filter((t) => toolTier[t] === "external").map((t) => `${t}(${toolTier[t]})`).join(", ")}`);

console.log();
console.log("=== complete ===");
console.log("UI links to verify:");
console.log("  https://tests.semantius.app/domain_map/domain_modules");
console.log(`  https://tests.semantius.app/domain_map/domain_module_data_objects (filter domain_module_id=${starterId})`);
console.log(`  https://tests.semantius.app/domain_map/domain_module_capabilities (filter domain_module_id=${starterId})`);
console.log(`  https://tests.semantius.app/domain_map/domain_module_host_domains (filter domain_module_id=${starterId})`);
console.log(`  https://tests.semantius.app/domain_map/permissions (filter domain_module_id=${starterId})`);
console.log(`  https://tests.semantius.app/domain_map/skills (filter id=${skillId})`);
console.log(`  https://tests.semantius.app/domain_map/skill_tools (filter skill_id=${skillId})`);
