#!/usr/bin/env bun
// State-driven MDM Validate-mode execute pass (2026-06-06).
// Three additive/corrective fixes, all record_status='new' (or carried by row state):
//   1. entity_type classification on the 6 MDM-owned masters (Rule #12).
//   2. handoff_processes APQC tags for the 5 untagged cross-domain handoffs with a clean PCF match (H1).
//   3. Rule #20 catalog UX backfill on the MDM domain row (empty-guarded).
//
// Idempotent: reads live before every write, only writes missing/empty, never overwrites a non-empty value.

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

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

const DOMAIN_ID = 87;

// ============================================================
// 1. entity_type classification (Rule #12)
// ============================================================
// golden_records + source_records are workflow-bearing business objects (matching/merge/
// survivorship/stewardship transitions) -> operational_workflow.
// match_rules / merge_rules are rule definitions referenced by other entities -> catalog.
const ENTITY_TYPES: Record<number, string> = {
  315: "operational_workflow", // customer_golden_records
  316: "operational_workflow", // supplier_golden_records
  317: "operational_workflow", // employee_golden_records
  320: "operational_workflow", // source_records
  318: "catalog", // match_rules
  319: "catalog", // merge_rules
};

async function fixEntityTypes(): Promise<number> {
  const ids = Object.keys(ENTITY_TYPES).join(",");
  const live = await get(
    `/data_objects?id=in.(${ids})&select=id,data_object_name,entity_type`,
  );
  let written = 0;
  for (const r of live) {
    const id = Number(r.id);
    const target = ENTITY_TYPES[id];
    const current = String(r.entity_type ?? "");
    if (current === "" || current === "unclassified") {
      await patch(`/data_objects?id=eq.${id}`, { entity_type: target });
      console.log(`  entity_type ${r.data_object_name} (${id}): ${current || "null"} -> ${target}`);
      written++;
    } else if (current !== target) {
      // Non-empty, non-unclassified existing value is overwrite-protected. Report, do not touch.
      console.log(
        `  SKIP entity_type ${r.data_object_name} (${id}): already '${current}', target was '${target}' (no overwrite)`,
      );
    } else {
      console.log(`  entity_type ${r.data_object_name} (${id}): already '${current}', nothing to do`);
    }
  }
  return written;
}

// ============================================================
// 2. handoff_processes APQC tags (H1)
// ============================================================
// Clean PCF cross_industry matches for the 5 untagged handoffs.
//   269 MDM->CRM customer_golden_record.created  -> 719 Manage customer master data (L4)
//   270 MDM->CSM customer_golden_record.created  -> 719 Manage customer master data (L4)
//   716 MDM->CRM merge_rule.published            -> 771 Maintain master data (L4)
//   274 MDM->HCM employee_golden_record.created  -> 243 Manage and maintain employee data (L3)
//   718 MDM->HCM source_record.merged_to_golden  -> 243 Manage and maintain employee data (L3)
const HANDOFF_TAGS: Array<{ handoff_id: number; process_id: number }> = [
  { handoff_id: 269, process_id: 719 },
  { handoff_id: 270, process_id: 719 },
  { handoff_id: 716, process_id: 771 },
  { handoff_id: 274, process_id: 243 },
  { handoff_id: 718, process_id: 243 },
];

async function fixHandoffProcesses(): Promise<number> {
  const handoffIds = [...new Set(HANDOFF_TAGS.map(t => t.handoff_id))].join(",");
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds})&select=handoff_id,process_id`,
  );
  const existingKey = new Set(
    existing.map(r => `${Number(r.handoff_id)}|${Number(r.process_id)}`),
  );
  const missing = HANDOFF_TAGS.filter(
    t => !existingKey.has(`${t.handoff_id}|${t.process_id}`),
  ).map(t => ({
    handoff_id: t.handoff_id,
    process_id: t.process_id,
    proposal_source: "agent_curated",
    role: "implements",
  }));
  if (missing.length > 0) {
    await insert("/handoff_processes", missing);
    for (const m of missing) {
      console.log(`  handoff_processes: handoff ${m.handoff_id} -> process ${m.process_id} (agent_curated/implements)`);
    }
  } else {
    console.log("  handoff_processes: all 5 tags already present, nothing to insert");
  }
  return missing.length;
}

// ============================================================
// 3. Rule #20 catalog UX backfill (empty-guarded)
// ============================================================
const TAGLINE =
  "Resolve duplicate records from every system into one trusted golden record for each customer, supplier, and employee.";
const DESCRIPTION =
  "Bring the scattered versions of each customer, supplier, and employee together into a single record everyone can rely on. " +
  "Pull in records from every connected system, find the ones that point to the same real-world entity, and merge them with rules you control over which value wins per field. " +
  "Route the uncertain matches to a data steward for review, so nothing gets merged by mistake and nothing slips through.\n\n" +
  "Once a golden record is set, it flows out to the systems that need it, keeping sales, service, HR, and analytics working from the same trusted facts. " +
  "Tune your matching and survivorship rules as your data changes, track how each record was resolved, and handle data-subject and erasure requests cleanly across every place the record lives.";

async function fixCatalogUX(): Promise<number> {
  const [domain] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=id,catalog_tagline,catalog_description`,
  );
  if (!domain) throw new Error(`MDM domain id ${DOMAIN_ID} not found`);
  const patchBody: Row = {};
  if (String(domain.catalog_tagline ?? "") === "") patchBody.catalog_tagline = TAGLINE;
  else console.log(`  SKIP catalog_tagline: already non-empty (no overwrite)`);
  if (String(domain.catalog_description ?? "") === "") patchBody.catalog_description = DESCRIPTION;
  else console.log(`  SKIP catalog_description: already non-empty (no overwrite)`);
  const fields = Object.keys(patchBody);
  if (fields.length > 0) {
    await patch(`/domains?id=eq.${DOMAIN_ID}`, patchBody);
    console.log(`  catalog UX written: ${fields.join(", ")}`);
  }
  return fields.length;
}

// ============================================================
// main
// ============================================================
console.log("== MDM state-driven execute pass (2026-06-06) ==");

console.log("\n[1] entity_type classification (Rule #12)");
const n1 = await fixEntityTypes();

console.log("\n[2] handoff_processes APQC tags (H1)");
const n2 = await fixHandoffProcesses();

console.log("\n[3] catalog UX backfill (Rule #20)");
const n3 = await fixCatalogUX();

console.log("\n== Summary ==");
console.log(`  entity_type PATCHes:        ${n1}`);
console.log(`  handoff_processes INSERTs:  ${n2}`);
console.log(`  catalog UX fields written:  ${n3}`);

console.log("\nUI links:");
console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(315,316,317,318,319,320)");
console.log("  https://tests.semantius.app/domain_map/handoff_processes?handoff_id=in.(269,270,274,716,718)");
console.log("  https://tests.semantius.app/domain_map/domains?id=eq.87");
