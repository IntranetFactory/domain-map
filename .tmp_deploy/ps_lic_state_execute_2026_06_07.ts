#!/usr/bin/env bun
// PS-LIC state-driven Validate execute pass (2026-06-07).
// Executes the three build-independent additive/corrective items open in
// audits/PS-LIC/state.yaml. All other open items cascade off the (deferred,
// user-gated) module/capability build and are surfaced/left, not executed here.
//
// 1. B13 entity_type: PATCH the 6 PS-LIC masters from 'unclassified' to the
//    Rule #12 enum. All 6 carry published-verb workflow trigger events implying
//    workflow gates -> 'operational_workflow'.
// 2. event_category backfill: 8 PS-LIC trigger events have empty event_category.
//    Lifecycle state-machine transitions -> 'lifecycle'; the time-based
//    renewal-due event -> 'threshold'.
// 3. A4 / Rule #20 catalog UX: domains.catalog_tagline + catalog_description are
//    both empty. Author buyer-voice copy and write it. No modules exist, so no
//    module-level taglines to write. NEVER overwrite a non-empty value.
//
// Idempotent: each write re-reads live first and only writes the rows that still
// need it. Re-running is free.

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

const DOMAIN_ID = 46;
const MASTER_IDS = [641, 642, 643, 644, 645, 646];

// ------------------------------------------------------------------
// 1. entity_type PATCH (B13)
// ------------------------------------------------------------------
async function fixEntityType() {
  const rows = await get(
    `/data_objects?id=in.(${MASTER_IDS.join(",")})&select=id,data_object_name,entity_type`,
  );
  const target = "operational_workflow";
  const todo = rows.filter(r => r.entity_type === "unclassified" || r.entity_type === "" || r.entity_type == null);
  console.log(`\n[entity_type] ${todo.length} of ${rows.length} masters need classification`);
  for (const r of todo) {
    await call({
      method: "PATCH",
      path: `/data_objects?id=eq.${r.id}`,
      body: { entity_type: target },
    });
    console.log(`  PATCH data_objects ${r.id} (${r.data_object_name}) entity_type -> ${target}`);
  }
  if (todo.length === 0) console.log("  nothing to do");
  return todo.length;
}

// ------------------------------------------------------------------
// 2. event_category backfill
// ------------------------------------------------------------------
async function fixEventCategory() {
  const rows = await get(
    `/trigger_events?data_object_id=in.(${MASTER_IDS.join(",")})&select=id,event_name,event_category`,
  );
  // license_renewal.due is a time-threshold event (renewal becomes due on a date);
  // every other event is a lifecycle state-machine transition.
  const categoryFor = (eventName: string) =>
    eventName === "license_renewal.due" ? "threshold" : "lifecycle";
  const todo = rows.filter(r => r.event_category === "" || r.event_category == null);
  console.log(`\n[event_category] ${todo.length} of ${rows.length} trigger events need a category`);
  let n = 0;
  for (const r of todo) {
    const cat = categoryFor(String(r.event_name));
    await call({
      method: "PATCH",
      path: `/trigger_events?id=eq.${r.id}`,
      body: { event_category: cat },
    });
    console.log(`  PATCH trigger_events ${r.id} (${r.event_name}) event_category -> ${cat}`);
    n++;
  }
  if (todo.length === 0) console.log("  nothing to do");
  return n;
}

// ------------------------------------------------------------------
// 3. Catalog UX (A4 / Rule #20) on the domain row
// ------------------------------------------------------------------
const CATALOG_TAGLINE =
  "Take permit and license applications, issue and renew them, schedule inspections, enforce code, and bill regulatory fees in one civic-services workflow.";

const CATALOG_DESCRIPTION =
  "Run the full licensing and permitting lifecycle for a government agency from a single workflow. " +
  "Applicants submit permits and license applications, staff review and route them, and approved records are issued, tracked, and renewed on schedule. " +
  "Field inspectors work scheduled inspections against each permit, and failed inspections open code-enforcement cases that carry through contest and resolution. " +
  "Regulatory fees are assessed at each gated step and handed to finance for collection, while constituents follow their case from submission to approval. " +
  "The result is faster turnaround, a defensible audit trail on every decision, and one connected record of every license, permit, inspection, and fee an agency manages.";

async function fixCatalogUx() {
  const [dom] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=id,catalog_tagline,catalog_description`,
  );
  if (!dom) throw new Error("PS-LIC domain row not found");
  const patch: Row = {};
  if (dom.catalog_tagline === "" || dom.catalog_tagline == null) {
    patch.catalog_tagline = CATALOG_TAGLINE;
  } else {
    console.log("\n[catalog] catalog_tagline already non-empty, leaving as-is");
  }
  if (dom.catalog_description === "" || dom.catalog_description == null) {
    patch.catalog_description = CATALOG_DESCRIPTION;
  } else {
    console.log("[catalog] catalog_description already non-empty, leaving as-is");
  }
  if (Object.keys(patch).length === 0) {
    console.log("\n[catalog] nothing to do");
    return 0;
  }
  await call({ method: "PATCH", path: `/domains?id=eq.${DOMAIN_ID}`, body: patch });
  console.log(`\n[catalog] PATCH domains ${DOMAIN_ID} fields: ${Object.keys(patch).join(", ")}`);
  return Object.keys(patch).length;
}

// ------------------------------------------------------------------
async function main() {
  // em-dash guard on authored copy (Rule: no U+2014 anywhere)
  for (const s of [CATALOG_TAGLINE, CATALOG_DESCRIPTION]) {
    if (s.includes("—")) throw new Error("em-dash found in authored catalog copy");
  }
  const e = await fixEntityType();
  const c = await fixEventCategory();
  const u = await fixCatalogUx();
  console.log(`\n=== Summary ===`);
  console.log(`  entity_type PATCHed:        ${e}`);
  console.log(`  event_category backfilled:  ${c}`);
  console.log(`  catalog UX fields written:  ${u}`);
  console.log(`\nUI links:`);
  console.log(`  https://tests.semantius.app/domain_map/data_objects?id=in.(${MASTER_IDS.join(",")})`);
  console.log(`  https://tests.semantius.app/domain_map/trigger_events?data_object_id=in.(${MASTER_IDS.join(",")})`);
  console.log(`  https://tests.semantius.app/domain_map/domains?id=eq.${DOMAIN_ID}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
