#!/usr/bin/env bun
// load_re_brok_b12_followups.ts - Phase B12 completion for RE-BROK
//
// Two follow-ups to load_re_brok_lifecycle_states.ts:
//
// (1) Materialize 20 workflow-gate permissions from the lifecycle states
//     (Rule #12 + Rule #14: prefix = realizing module's domain_module_code).
//
// (2) Set pattern flags on the 5 master data_objects:
//     - has_personal_content: true if record contains PII / personal client data
//     - has_submit_lock:     true if record locks after a terminal state
//     - has_single_approver: true if a single approver gates the workflow
//
// Idempotent on (permission_name) for permissions; pattern flags are PATCHes.
// Run from project root: bun run c:/dev/domain-map/.tmp_deploy/load_re_brok_b12_followups.ts

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

const AGENT_OPS = 151;
const BROKERAGE_OPS = 152;
const DOMAIN_MAP_MODULE_ID = 1001;
const MOD_CODE: Record<number, string> = {
  [AGENT_OPS]: "re-brok-agent-ops",
  [BROKERAGE_OPS]: "re-brok-brokerage-ops",
};

const masterNames = [
  "real_estate_listings",
  "tour_appointments",
  "real_estate_transactions",
  "disclosure_documents",
  "commission_splits",
];

// ============================================================
// 0. Resolve master data_object IDs
// ============================================================
console.log("=== 0. Resolving data_object IDs ===");
const doRows: Row[] = await postgrest(
  "GET",
  `/data_objects?data_object_name=in.(${masterNames.join(",")})&select=id,data_object_name,has_personal_content,has_submit_lock,has_single_approver`,
) ?? [];
const doId: Record<string, number> = {};
const doFlags: Record<string, { hpc: boolean; hsl: boolean; hsa: boolean }> = {};
for (const r of doRows) {
  doId[String(r.data_object_name)] = Number(r.id);
  doFlags[String(r.data_object_name)] = {
    hpc: Boolean(r.has_personal_content),
    hsl: Boolean(r.has_submit_lock),
    hsa: Boolean(r.has_single_approver),
  };
}
console.log(`  ${Object.keys(doId).length} of ${masterNames.length} resolved`);

// ============================================================
// 1. Materialize workflow-gate permissions
// ============================================================
console.log("\n=== 1. Workflow-gate permissions ===");

const dataObjectIds = Object.values(doId);
const gateStates: Row[] = await postgrest(
  "GET",
  `/data_object_lifecycle_states?data_object_id=in.(${dataObjectIds.join(",")})&requires_permission=eq.true&select=state_name,permission_verb_override,domain_module_id,data_object_id`,
) ?? [];
console.log(`  ${gateStates.length} workflow-gate lifecycle states found`);

type PermSpec = {
  name: string;
  description: string;
  domain_module_id: number;
};

const idToName: Record<number, string> = {};
for (const n of masterNames) idToName[doId[n]] = n;

const permsToCreate: PermSpec[] = [];
for (const g of gateStates) {
  const mid = Number(g.domain_module_id);
  if (!mid || !MOD_CODE[mid]) {
    throw new Error(`Gate state ${g.state_name} on data_object_id=${g.data_object_id} has no realizing module`);
  }
  const verb = String(g.permission_verb_override || g.state_name);
  const name = `${MOD_CODE[mid]}:${verb}`;
  const entityName = idToName[Number(g.data_object_id)] || `data_object_id=${g.data_object_id}`;
  permsToCreate.push({
    name,
    description: `Workflow gate transitioning ${entityName} to state '${g.state_name}'. Materialized from data_object_lifecycle_states under Rule #12; prefix is the realizing module ${MOD_CODE[mid]} under Rule #14.`,
    domain_module_id: mid,
  });
}

const existingPerms: Row[] = await postgrest(
  "GET",
  `/permissions?permission_name=in.(${permsToCreate.map((p) => p.name).join(",")})&select=permission_name`,
) ?? [];
const seenPerms = new Set(existingPerms.map((r) => String(r.permission_name)));

let permsAdded = 0;
let permsSkipped = 0;
for (const p of permsToCreate) {
  if (seenPerms.has(p.name)) { permsSkipped++; continue; }
  await postgrest("POST", "/permissions", {
    permission_name: p.name,
    description: p.description,
    tier: "workflow-gate",
    domain_module_id: p.domain_module_id,
    module_id: DOMAIN_MAP_MODULE_ID,
  });
  permsAdded++;
}
console.log(`  new ${permsAdded} / recycled ${permsSkipped}`);

// ============================================================
// 2. Pattern flags on data_objects
// ============================================================
console.log("\n=== 2. Pattern flags (PATCH) ===");

type FlagSpec = {
  data_object_name: string;
  has_personal_content: boolean;
  has_submit_lock: boolean;
  has_single_approver: boolean;
  rationale: string;
};

const flagSpecs: FlagSpec[] = [
  {
    data_object_name: "real_estate_listings",
    has_personal_content: true, // seller addresses, photos of inside the home
    has_submit_lock: false,
    has_single_approver: false,
    rationale: "Personal: listing contains seller address + interior photos. No submit lock (active listings stay editable). No single approver (broker reviews but doesn't gate-approve every listing edit).",
  },
  {
    data_object_name: "tour_appointments",
    has_personal_content: true, // prospect names, contact info, access notes
    has_submit_lock: false,
    has_single_approver: false,
    rationale: "Personal: prospect names + contact info + access instructions. No submit lock. No single approver (showing-agent confirms, not a per-tour approval).",
  },
  {
    data_object_name: "real_estate_transactions",
    has_personal_content: true, // identifiable buyers/sellers, financial data
    has_submit_lock: true, // once closed, deed is recorded; transaction is immutable
    has_single_approver: false, // multiple gates (broker compliance, broker close-approval) by different actors
    rationale: "Personal: identifiable parties + financial details. Submit-lock: once 'closed' state, deed is recorded; transaction is immutable. Multi-approver: broker gates compliance_review and cleared_to_close; not a single approver.",
  },
  {
    data_object_name: "disclosure_documents",
    has_personal_content: true, // per-party acknowledgments with names/dates
    has_submit_lock: true, // once acknowledged, the document is locked
    has_single_approver: true, // each disclosure has one recipient signer
    rationale: "Personal: per-party signed acknowledgments. Submit-lock: once 'acknowledged' state, document is immutable for compliance. Single-approver: each disclosure is signed by one recipient (the buyer OR the seller per disclosure type).",
  },
  {
    data_object_name: "commission_splits",
    has_personal_content: false, // amounts and percentages; no PII
    has_submit_lock: true, // once paid, locked
    has_single_approver: true, // broker approves
    rationale: "Not personal: amounts and percentages, no PII. Submit-lock: once 'paid' state, split is locked. Single-approver: broker is the canonical approver of every split.",
  },
];

let flagsPatched = 0;
let flagsUnchanged = 0;
for (const f of flagSpecs) {
  const did = doId[f.data_object_name];
  if (!did) continue;
  const current = doFlags[f.data_object_name];
  if (current && current.hpc === f.has_personal_content && current.hsl === f.has_submit_lock && current.hsa === f.has_single_approver) {
    flagsUnchanged++;
    console.log(`  ${f.data_object_name}: already at target (HPC=${f.has_personal_content}, HSL=${f.has_submit_lock}, HSA=${f.has_single_approver})`);
    continue;
  }
  await postgrest("PATCH", `/data_objects?id=eq.${did}`, {
    has_personal_content: f.has_personal_content,
    has_submit_lock: f.has_submit_lock,
    has_single_approver: f.has_single_approver,
  });
  flagsPatched++;
  console.log(`  ${f.data_object_name}: PATCH (HPC=${f.has_personal_content}, HSL=${f.has_submit_lock}, HSA=${f.has_single_approver})`);
  console.log(`    rationale: ${f.rationale}`);
}
console.log(`  patched ${flagsPatched} / unchanged ${flagsUnchanged}`);

console.log();
console.log("=== complete ===");
console.log("UI:");
console.log("  https://tests.semantius.app/domain_map/permissions (filter tier=workflow-gate)");
console.log("  https://tests.semantius.app/domain_map/data_objects");
