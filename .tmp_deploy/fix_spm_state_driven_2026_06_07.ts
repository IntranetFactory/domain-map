#!/usr/bin/env bun
// State-driven Validate execution for the SPM domain (domain_id=9).
// Works only the EXECUTE-classified open items from audits/SPM/state.yaml:
//   1. B13 entity_type: PATCH 8 SPM masters from 'unclassified' -> 'operational_workflow'
//      (280 dependency_chains LEFT pending open b2 B2-S3 config-shape decision).
//   2. B1A-A4 catalog UX (Rule #20): author buyer-voice tagline + description on the
//      domain row IF both are currently empty (never overwrite a non-empty value).
//   3. B1A-S4 (B11) aliases: INSERT generic synonyms (alias_type='synonym') per master.
//   4. B1A-APQC (H1): INSERT agent_curated handoff_processes for the 4 still-untagged
//      outbound handoffs with a clean PCF match (792,793,794,795) PLUS 3 precise
//      agent_curated children for the substring-only rows (241->106, 245->107, 242->905).
//      The substring parents are NOT deleted (destructive -> surfaced to user).
//
// Idempotent: reads live before every write, inserts only missing, never overwrites
// a non-empty value. record_status omitted on inserts (defaults to 'new'); never
// writes any column named exactly 'notes'.

import { } from "bun";

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

const get = (path: string) => call({ method: "GET", path });

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map(r => {
    const out: Row = {};
    for (const k of keys) out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return out;
  });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

// ============================================================
// 1. entity_type PATCH (B13): 8 SPM masters -> operational_workflow
//    280 dependency_chains intentionally excluded (open b2 B2-S3).
// ============================================================
const WORKFLOW_MASTERS = [273, 274, 275, 276, 277, 278, 279, 281];

async function fixEntityTypes() {
  const live = await get(
    `/data_objects?id=in.(${WORKFLOW_MASTERS.join(",")})&select=id,data_object_name,entity_type`,
  );
  const toFix = live.filter(r => r.entity_type === "unclassified" || r.entity_type == null);
  console.log(`\n[entity_type] ${toFix.length} of ${live.length} masters need classification`);
  for (const r of toFix) {
    await patch(`/data_objects?id=eq.${r.id}`, { entity_type: "operational_workflow" });
    console.log(`  PATCH data_objects ${r.id} (${r.data_object_name}) -> operational_workflow`);
  }
  return toFix.length;
}

// ============================================================
// 2. Catalog UX (Rule #20): domain row only (0 modules)
// ============================================================
const SPM_TAGLINE =
  "Plan where the organization invests next, balance demand against capacity, and track the value every initiative actually delivers.";

const SPM_DESCRIPTION = [
  "Strategic Portfolio Management is where leadership decides which initiatives to fund, how to sequence them, and who works on them. Demand requests arrive, get scored on business value and risk, and the strongest candidates become funded initiatives grouped into portfolios that roll up to corporate strategy.",
  "Resource and capacity planning is the engine: every initiative competes for the same people, budget, and time, so allocations are committed against capacity, what-if scenarios are modeled before a commitment is made, and roadmap items are scheduled with their dependencies and contingencies in view.",
  "After the plan is set, the work is to keep it honest. Benefits are tracked against the case that justified each investment, portfolios are rebalanced when priorities shift, and dependency chains surface the blockers that put delivery at risk. The result is a single, defensible view of what the business is doing, why, and whether it is paying off.",
].join("\n\n");

async function fixCatalogUX() {
  const [domain] = await get(
    `/domains?id=eq.9&select=id,catalog_tagline,catalog_description`,
  );
  if (!domain) throw new Error("SPM domain row (id=9) not found");
  const body: Row = {};
  const tagEmpty = !domain.catalog_tagline || String(domain.catalog_tagline).trim() === "";
  const descEmpty = !domain.catalog_description || String(domain.catalog_description).trim() === "";
  if (tagEmpty) body.catalog_tagline = SPM_TAGLINE;
  if (descEmpty) body.catalog_description = SPM_DESCRIPTION;
  if (Object.keys(body).length === 0) {
    console.log(`\n[catalog UX] domain row already populated; nothing to write`);
    return 0;
  }
  await patch(`/domains?id=eq.9`, body);
  console.log(
    `\n[catalog UX] PATCH domains 9: ${Object.keys(body).join(", ")} (only empty fields written)`,
  );
  return Object.keys(body).length;
}

// ============================================================
// 3. Aliases (B11): generic synonyms, alias_type='synonym'
// ============================================================
type AliasSpec = { data_object_id: number; alias_name: string };
const ALIASES: AliasSpec[] = [
  // 273 strategic_portfolios
  { data_object_id: 273, alias_name: "Investment Portfolios" },
  { data_object_id: 273, alias_name: "Strategy Portfolios" },
  // 274 strategic_initiatives
  { data_object_id: 274, alias_name: "Initiatives" },
  { data_object_id: 274, alias_name: "Strategic Programs" },
  { data_object_id: 274, alias_name: "Epics" },
  // 275 roadmap_items
  { data_object_id: 275, alias_name: "Roadmap Entries" },
  { data_object_id: 275, alias_name: "Planned Features" },
  // 276 business_value_assessments
  { data_object_id: 276, alias_name: "Value Scorecards" },
  { data_object_id: 276, alias_name: "Prioritization Scores" },
  { data_object_id: 276, alias_name: "Business Cases" },
  // 277 resource_allocations
  { data_object_id: 277, alias_name: "Resource Assignments" },
  { data_object_id: 277, alias_name: "Capacity Allocations" },
  // 278 demand_intake_requests
  { data_object_id: 278, alias_name: "Demand Requests" },
  { data_object_id: 278, alias_name: "Intake Requests" },
  { data_object_id: 278, alias_name: "Idea Submissions" },
  // 279 scenario_plans
  { data_object_id: 279, alias_name: "What-If Scenarios" },
  { data_object_id: 279, alias_name: "Planning Scenarios" },
  // 280 dependency_chains
  { data_object_id: 280, alias_name: "Dependency Maps" },
  { data_object_id: 280, alias_name: "Critical Path Dependencies" },
  // 281 benefits_tracking_records
  { data_object_id: 281, alias_name: "Benefits Realization Records" },
  { data_object_id: 281, alias_name: "Outcome Tracking Records" },
];

async function fixAliases() {
  const ids = [...new Set(ALIASES.map(a => a.data_object_id))];
  const existing = await get(
    `/data_object_aliases?data_object_id=in.(${ids.join(",")})&select=data_object_id,alias_name`,
  );
  const existKey = new Set(
    existing.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`),
  );
  const missing = ALIASES.filter(
    a => !existKey.has(`${a.data_object_id}|${a.alias_name.toLowerCase()}`),
  ).map(a => ({ ...a, alias_type: "synonym" }));
  console.log(`\n[aliases] ${missing.length} of ${ALIASES.length} aliases missing -> insert`);
  if (missing.length > 0) await insert("/data_object_aliases", missing);
  return missing.length;
}

// ============================================================
// 4. APQC handoff_processes (H1): agent_curated, role=implements
//    key natural id = "<handoff_id>.<process_id>"
// ============================================================
type HpSpec = { handoff_id: number; process_id: number };
const HANDOFF_PROCESSES: HpSpec[] = [
  // newly-tagged outbound (clean PCF match)
  { handoff_id: 792, process_id: 1133 }, // benefits_tracking_record.realized -> Monitor and analyze IT value and benefits (L4)
  { handoff_id: 793, process_id: 517 },  // business_value_assessment.completed -> Determine business value for each strategic priority (L4)
  { handoff_id: 794, process_id: 1135 }, // dependency_chain.identified -> Manage IT projects and services interdependencies (L4)
  { handoff_id: 795, process_id: 1133 }, // benefits_tracking_record.at_risk -> Monitor and analyze IT value and benefits (L4)
  // precise agent_curated children alongside substring-only parents (parents NOT deleted)
  { handoff_id: 241, process_id: 106 },  // initiative.kickoff -> Execute strategic initiatives (L3)
  { handoff_id: 245, process_id: 107 },  // initiative.completed -> Review execution of strategic initiatives (L3)
  { handoff_id: 242, process_id: 905 },  // resource_allocation.committed -> Identify, select, and assign resources (L4)
];

async function fixHandoffProcesses() {
  const hids = [...new Set(HANDOFF_PROCESSES.map(h => h.handoff_id))];
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${hids.join(",")})&select=handoff_id,process_id,key`,
  );
  const existKey = new Set(existing.map(r => `${r.handoff_id}.${r.process_id}`));
  const missing = HANDOFF_PROCESSES.filter(
    h => !existKey.has(`${h.handoff_id}.${h.process_id}`),
  ).map(h => ({
    handoff_id: h.handoff_id,
    process_id: h.process_id,
    role: "implements",
    proposal_source: "agent_curated",
    key: `${h.handoff_id}.${h.process_id}`,
  }));
  console.log(
    `\n[handoff_processes] ${missing.length} of ${HANDOFF_PROCESSES.length} agent_curated rows missing -> insert`,
  );
  if (missing.length > 0) await insert("/handoff_processes", missing);
  return missing.length;
}

// ============================================================
async function main() {
  console.log("=== SPM state-driven Validate execution (2026-06-07) ===");
  const n1 = await fixEntityTypes();
  const n2 = await fixCatalogUX();
  const n3 = await fixAliases();
  const n4 = await fixHandoffProcesses();

  console.log("\n=== Summary ===");
  console.log(`  entity_type PATCH:       ${n1} masters`);
  console.log(`  catalog UX PATCH:        ${n2} fields on domain row`);
  console.log(`  aliases INSERT:          ${n3} rows`);
  console.log(`  handoff_processes INSERT:${n4} rows`);
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(273,274,275,276,277,278,279,281)");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.9");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases?data_object_id=in.(273,274,275,276,277,278,279,280,281)");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes?handoff_id=in.(241,242,245,792,793,794,795)");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
