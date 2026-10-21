#!/usr/bin/env bun
// load_itam_phase_s.ts
//
// Phase S for ITAM (domain_id=3): authors one `skill_type=system` skill per
// `domain_modules` row (Rule #17), creating the necessary new tools and
// `skill_tools` links along the way. Modules covered: 57 (NORMALIZATION-CATALOG),
// 58 (CONTRACTS), 59 (LIFECYCLE), 60 (PORTFOLIO-REPORTING).
//
// Final step: deletes the legacy domain-level `itam-system` skill (id=73) and
// its two skill_tools rows. The user confirmed this in the same session that
// approved the draft. Once any module-level skill ships, the legacy row
// triggers F1 failure on the next audit; removing it here keeps the audit clean.
//
// Idempotent: every step reads first, only writes what's missing. Safe to re-run.
// Run from project root: bun run c:/dev/domain-map/.tmp_deploy/load_itam_phase_s.ts

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

// ============================================================
// 0. Resolve module IDs + data_object IDs we need
// ============================================================
console.log("=== 0. Resolving FK maps ===");

const ITAM_DOMAIN_ID = 3;

const modRows: Row[] = await postgrest(
  "GET",
  `/domain_modules?domain_id=eq.${ITAM_DOMAIN_ID}&select=id,domain_module_code`,
) ?? [];
const modId: Record<string, number> = {};
for (const r of modRows) modId[String(r.domain_module_code)] = Number(r.id);
console.log(`  modules: ${Object.keys(modId).length} resolved`);
for (const code of ["ITAM-NORMALIZATION-CATALOG", "ITAM-CONTRACTS", "ITAM-LIFECYCLE", "ITAM-PORTFOLIO-REPORTING"]) {
  if (!modId[code]) throw new Error(`Module ${code} not found.`);
}

const doNamesNeeded = [
  "asset_contracts", "asset_lifecycle_events", "locations",
];
const doRows: Row[] = await postgrest(
  "GET",
  `/data_objects?data_object_name=in.(${doNamesNeeded.join(",")})&select=id,data_object_name`,
) ?? [];
const doId: Record<string, number> = {};
for (const r of doRows) doId[String(r.data_object_name)] = Number(r.id);
for (const n of doNamesNeeded) {
  if (!doId[n]) throw new Error(`data_object ${n} not found.`);
}
console.log(`  data_objects: ${Object.keys(doId).length} resolved`);

// ============================================================
// 1. New tools (idempotent on tool_name)
// ============================================================
console.log("\n=== 1. tools (new) ===");

type ToolSpec = {
  name: string;
  operationKind: "query" | "mutate" | "side_effect" | "compute";
  dataObject: string | null;
  description: string;
};

const newTools: ToolSpec[] = [
  {
    name: "query_locations",
    operationKind: "query",
    dataObject: "locations",
    description: "Query physical / IWMS-mastered locations. Used by ITAM-LIFECYCLE to resolve where an asset moved to or from.",
  },
  {
    name: "create_asset_contract",
    operationKind: "mutate",
    dataObject: "asset_contracts",
    description: "Create a new ITAM asset contract (draft state). Spans hardware leases, software licenses, SaaS subscriptions, and cloud commitments.",
  },
  {
    name: "update_asset_contract",
    operationKind: "mutate",
    dataObject: "asset_contracts",
    description: "Update an ITAM asset contract (pre-activation edits, renewal terms, ownership changes).",
  },
  {
    name: "activate_asset_contract",
    operationKind: "mutate",
    dataObject: "asset_contracts",
    description: "Activate a signed/executed ITAM asset contract (draft -> active). Lifecycle-gate workflow tool matching the activate_contract permission verb.",
  },
  {
    name: "terminate_asset_contract",
    operationKind: "mutate",
    dataObject: "asset_contracts",
    description: "Terminate an ITAM asset contract (active/expiring -> terminated). Lifecycle-gate workflow tool matching the terminate_contract permission verb.",
  },
  {
    name: "create_asset_lifecycle_event",
    operationKind: "mutate",
    dataObject: "asset_lifecycle_events",
    description: "Append an asset lifecycle event (acquired, deployed, transferred, retired, disposed). Append-only event log; no per-event state machine.",
  },
  {
    name: "normalize_software_title",
    operationKind: "compute",
    dataObject: null,
    description: "ITAM-NORMALIZATION-CATALOG: canonicalize a raw software-title string into a normalized product/edition/version triple (Technopedia-style). Resolves vendor renames and inconsistent inventory feeds.",
  },
  {
    name: "reconcile_asset_identity",
    operationKind: "compute",
    dataObject: null,
    description: "ITAM-NORMALIZATION-CATALOG: identity reconciliation across HAM/SAM/SMP/FINOPS feeds. Matches an asset record observed in one feed against the canonical asset across the others.",
  },
  {
    name: "compute_tco_rollup",
    operationKind: "compute",
    dataObject: null,
    description: "ITAM-PORTFOLIO-REPORTING: total-cost-of-ownership rollup across HAM, SAM, SMP, FINOPS, and EAM masters plus active asset_contracts. Returns per-cost-center / per-org-unit aggregations.",
  },
  {
    name: "compute_portfolio_metrics",
    operationKind: "compute",
    dataObject: null,
    description: "ITAM-PORTFOLIO-REPORTING: portfolio-level metrics (lifecycle-stage distribution, contract-coverage gaps, expiring-soon, refresh-cycle trends).",
  },
];

const existingToolNames = new Set(
  ((await postgrest(
    "GET",
    `/tools?tool_name=in.(${newTools.map((t) => t.name).join(",")})&select=tool_name`,
  )) ?? []).map((r: Row) => String(r.tool_name)),
);

for (const t of newTools) {
  if (existingToolNames.has(t.name)) {
    console.log(`  recycled ${t.name}`);
    continue;
  }
  const body: Row = {
    tool_name: t.name,
    operation_kind: t.operationKind,
    description: t.description,
  };
  if (t.dataObject) {
    body.data_object_id = doId[t.dataObject];
  }
  console.log(`  inserting ${t.name} (${t.operationKind})`);
  await postgrest("POST", "/tools", body);
}

// ============================================================
// 2. Resolve all tool IDs (existing + new)
// ============================================================
console.log("\n=== 2. Resolving tool IDs ===");

const allToolNames = [
  // reused existing
  "query_asset_contracts", "query_asset_lifecycle_events",
  "query_purchase_orders", "query_saas_applications",
  "query_hardware_assets", "query_software_licenses",
  "query_hardware_models", "query_hardware_disposal_records",
  "query_industrial_assets", "query_org_units",
  "send_email", "sign_document",
  // newly created above
  "query_locations",
  "create_asset_contract", "update_asset_contract",
  "activate_asset_contract", "terminate_asset_contract",
  "create_asset_lifecycle_event",
  "normalize_software_title", "reconcile_asset_identity",
  "compute_tco_rollup", "compute_portfolio_metrics",
];

const toolRows: Row[] = await postgrest(
  "GET",
  `/tools?tool_name=in.(${allToolNames.join(",")})&select=id,tool_name,operation_kind`,
) ?? [];
const toolId: Record<string, number> = {};
const toolKind: Record<string, string> = {};
for (const r of toolRows) {
  toolId[String(r.tool_name)] = Number(r.id);
  toolKind[String(r.tool_name)] = String(r.operation_kind);
}
console.log(`  tools resolved: ${Object.keys(toolId).length} of ${allToolNames.length}`);
for (const n of allToolNames) {
  if (!toolId[n]) throw new Error(`Tool not found in catalog: ${n}. Loader cannot proceed.`);
}

// ============================================================
// 3. Define the 4 per-module skills
// ============================================================
console.log("\n=== 3. domain_module skills (4 rows) ===");

type SkillSpec = {
  name: string;
  module: string;
  description: string;
  required: string[];
  optional: string[];
  expectedAllPct: number;
  expectedRequiredPct: number | null;
};

const skills: SkillSpec[] = [
  {
    name: "itam-normalization-catalog-system",
    module: "ITAM-NORMALIZATION-CATALOG",
    description:
      "Per-module system skill for the cross-asset reference-data and reconciliation substrate. No own masters; reads from HAM / SAM / SMP feeds and runs normalization + identity-reconciliation compute primitives. EAM feed optional.",
    required: [
      "query_hardware_assets",
      "query_software_licenses",
      "query_saas_applications",
      "query_hardware_models",
      "normalize_software_title",
      "reconcile_asset_identity",
    ],
    optional: ["query_industrial_assets"],
    expectedAllPct: 57,
    expectedRequiredPct: 67,
  },
  {
    name: "itam-contracts-system",
    module: "ITAM-CONTRACTS",
    description:
      "Per-module system skill for cross-asset contract management. Masters asset_contracts. Required PO + SaaS-app reads for contract-coverage discovery; required outbound email + e-signature for activation and renewal notifications. Hardware / software CRUD reads optional (depend on which asset class the contract covers).",
    required: [
      "query_asset_contracts",
      "create_asset_contract",
      "update_asset_contract",
      "activate_asset_contract",
      "terminate_asset_contract",
      "query_purchase_orders",
      "query_saas_applications",
      "sign_document",
      "send_email",
    ],
    optional: [
      "query_hardware_assets",
      "query_software_licenses",
    ],
    expectedAllPct: 64,
    expectedRequiredPct: 67,
  },
  {
    name: "itam-lifecycle-system",
    module: "ITAM-LIFECYCLE",
    description:
      "Per-module system skill for the unified asset lifecycle event log. Masters asset_lifecycle_events. Required HAM / SAM / SMP / locations / org_units / PO reads to resolve event subjects and movements. HAM disposal chain and EAM events optional; outbound assignment-notification email optional.",
    required: [
      "query_asset_lifecycle_events",
      "create_asset_lifecycle_event",
      "query_hardware_assets",
      "query_software_licenses",
      "query_saas_applications",
      "query_locations",
      "query_org_units",
      "query_purchase_orders",
    ],
    optional: [
      "query_hardware_disposal_records",
      "query_industrial_assets",
      "send_email",
    ],
    expectedAllPct: 73,
    expectedRequiredPct: 100,
  },
  {
    name: "itam-portfolio-reporting-system",
    module: "ITAM-PORTFOLIO-REPORTING",
    description:
      "Per-module system skill for portfolio-level TCO and lifecycle reporting. Derived module: no own masters; consumes from every sub-domain. Required HAM / SAM / SMP / contracts / lifecycle-events reads + TCO + portfolio-metrics compute primitives. EAM reads + disposal visibility optional.",
    required: [
      "query_asset_contracts",
      "query_asset_lifecycle_events",
      "query_hardware_assets",
      "query_software_licenses",
      "query_saas_applications",
      "compute_tco_rollup",
      "compute_portfolio_metrics",
    ],
    optional: [
      "query_industrial_assets",
      "query_hardware_disposal_records",
    ],
    expectedAllPct: 78,
    expectedRequiredPct: 71,
  },
];

// ============================================================
// 4. Create skills rows (idempotent on skill_name)
// ============================================================
console.log("\n=== 4. skills (4 rows) ===");

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
  const moduleId = modId[s.module];
  if (!moduleId) {
    console.log(`  skipped ${s.name} (module ${s.module} unresolved)`);
    continue;
  }
  console.log(`  inserting ${s.name}`);
  await postgrest("POST", "/skills", {
    skill_name: s.name,
    description: s.description,
    skill_type: "system",
    domain_id: ITAM_DOMAIN_ID,
    domain_module_id: moduleId,
  });
}

const finalSkills: Row[] = await postgrest(
  "GET",
  `/skills?skill_name=in.(${skills.map((s) => s.name).join(",")})&select=id,skill_name`,
) ?? [];
for (const r of finalSkills) skillId[String(r.skill_name)] = Number(r.id);
console.log(`  ${Object.keys(skillId).length} skill IDs resolved`);

// ============================================================
// 5. skill_tools rows (idempotent on (skill_id, tool_id))
// ============================================================
console.log("\n=== 5. skill_tools ===");

const skillIds = Object.values(skillId);
const existingST: Row[] = await postgrest(
  "GET",
  `/skill_tools?skill_id=in.(${skillIds.join(",")})&select=skill_id,tool_id`,
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
      console.log(`  missing tool: ${s.name} -> ${p.toolName}`);
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
console.log(`  ${stAdded} new / ${stSkipped} existing`);

// ============================================================
// 6. Verify per-module Semantius scores
// ============================================================
console.log("\n=== 6. Semantius score verification ===");

const SEMANTIUS_COVERED = new Set(["query", "mutate"]);

let allMatch = true;
console.log();
console.log("  module                       | all     | req-only | exp-all | exp-req | match");
console.log("  -----------------------------|---------|----------|---------|---------|------");
for (const s of skills) {
  const reqKinds = s.required.map((t) => toolKind[t] ?? "?");
  const optKinds = s.optional.map((t) => toolKind[t] ?? "?");
  const allKinds = [...reqKinds, ...optKinds];

  const reqCovered = reqKinds.filter((k) => SEMANTIUS_COVERED.has(k)).length;
  const allCovered = allKinds.filter((k) => SEMANTIUS_COVERED.has(k)).length;

  const allPct = allKinds.length === 0 ? 0 : Math.round((allCovered / allKinds.length) * 100);
  const reqPct = reqKinds.length === 0 ? null : Math.round((reqCovered / reqKinds.length) * 100);

  const allOk = Math.abs(allPct - s.expectedAllPct) <= 1;
  const reqOk = reqPct === null ? s.expectedRequiredPct === null
    : (s.expectedRequiredPct !== null && Math.abs(reqPct - s.expectedRequiredPct) <= 1);
  const match = allOk && reqOk;
  if (!match) allMatch = false;

  const allCell = `${allCovered}/${allKinds.length}=${allPct}%`;
  const reqCell = reqPct === null ? "-/-" : `${reqCovered}/${reqKinds.length}=${reqPct}%`;
  const expAll = `${s.expectedAllPct}%`;
  const expReq = s.expectedRequiredPct === null ? "-" : `${s.expectedRequiredPct}%`;

  console.log(
    `  ${s.module.padEnd(28)} | ${allCell.padEnd(7)} | ${reqCell.padEnd(8)} | ${expAll.padEnd(7)} | ${expReq.padEnd(7)} | ${match ? "ok" : "MISMATCH"}`,
  );
}

console.log();
console.log(allMatch ? "All scores match expected." : "Score mismatch detected — investigate.");

// ============================================================
// 7. Retire the legacy domain-level itam-system skill (id 73)
// ============================================================
console.log("\n=== 7. Retire legacy domain-level itam-system skill ===");

const legacy: Row[] = await postgrest(
  "GET",
  `/skills?id=eq.73&select=id,skill_name,skill_type,domain_id,domain_module_id`,
) ?? [];
if (legacy.length === 0) {
  console.log("  already removed (skills.id=73 not found)");
} else {
  const row = legacy[0];
  if (row.skill_name !== "itam-system" || row.domain_module_id !== null || Number(row.domain_id) !== ITAM_DOMAIN_ID) {
    throw new Error(`Refusing to delete skills.id=73 — unexpected shape: ${JSON.stringify(row)}`);
  }
  console.log(`  found legacy ${row.skill_name} (id=${row.id})`);
  const legacyST: Row[] = await postgrest(
    "GET",
    `/skill_tools?skill_id=eq.73&select=id,tool_id`,
  ) ?? [];
  console.log(`  deleting ${legacyST.length} skill_tools row(s) on skill_id=73`);
  for (const st of legacyST) {
    await postgrest("DELETE", `/skill_tools?id=eq.${st.id}`);
  }
  console.log(`  deleting skills.id=73`);
  await postgrest("DELETE", `/skills?id=eq.73`);
  console.log("  legacy retired");
}

console.log("\nload_itam_phase_s.ts complete.");
console.log("\nVerify in the UI:");
console.log(`  https://tests.semantius.app/domain_map/skills?domain_id=eq.${ITAM_DOMAIN_ID}`);
console.log(`  https://tests.semantius.app/domain_map/skill_tools`);
console.log(`  https://tests.semantius.app/domain_map/tools`);
