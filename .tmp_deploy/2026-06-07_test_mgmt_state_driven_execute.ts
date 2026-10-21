#!/usr/bin/env bun
// 2026-06-07 TEST-MGMT state-driven Validate execute (SKILL.md Rule #21, bulk batch).
// Additive/corrective only; PATCH of empty/NULL fields. Nothing stamps record_status.
// Idempotent: re-reads live before every write and skips work already done.
//
// TEST-MGMT (domain 8) is UNBUILT (0 domain_modules / M1 hard-fail, 0 capability_domains).
// Per the prompt's LEAVE rule "If UNBUILT (0 modules/0 caps): do not scaffold; surface the
// build; leave the cascade." The build (B1A-BUILD) and its whole cascade are SURFACED, not
// executed: B2-1 module split, B1B-M1 modules, B1B-M2 B10b FK backfill, B1B-M3 DMDO
// migration, B1B-S4 module-anchored lifecycle states, B1A-S1 capabilities. The retired
// per-module-skill item (B1B-S5-F1-SKILL-RETIRE) is CANCELED by the supersession header.
//
// Only build-independent additive/corrective items run here:
//   1. entity_type (B13/Rule #12): classify 8 TEST-MGMT masters (unclassified -> enum)
//   2. Catalog UX (Rule #20)     : author empty catalog_tagline/description on domain 8
//                                  (no domain_modules exist, so module-level UX is N/A)
//
// Already-satisfied bands confirmed live, nothing owed: C1 owner BFD present (Quality
// Engineering / Test Management, fn 62); B11 aliases present (2 per master); B6 intra-domain
// relationships present; A3 solutions present; H1 handoff_processes present on all 9 handoffs;
// B-events event_category populated on all 12. None are open state items.

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
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });

// ============================================================
// 1. entity_type classification (Rule #12 enum:
//    operational_workflow / operational_record / catalog / junction / computed)
// ============================================================
// 572 test_cases                         operational_record   : authored/edited definition; created/updated events, no gated workflow
// 573 test_suites                         operational_record   : grouping/collection of cases; published event but no gate machine
// 574 test_plans                          operational_workflow : draft -> approved (approval gate); plan.approved event
// 575 test_runs                           operational_workflow : queued -> running -> completed|failed; run.completed/failed events
// 576 test_defects                        operational_workflow : created -> triaged -> in_progress -> closed; created/closed events
// 577 test_environments                   catalog              : configuration reference (OS/browser/device/tenant/DB state); config-shape
// 578 requirements_to_test_traceability   junction             : explicit M:N link table between requirements and test_cases
// 225 automation_scripts                  operational_workflow : authored -> executed -> failed; executed/failed events
//     (NB: 225 carries the catalog-wide M7 collision with RMM, a B2-2 user decision;
//      entity_type is a property of the data_object itself, independent of which domain
//      masters it, so classifying it here is additive/corrective and does not touch mastery.)
const entityTypes: { id: number; name: string; entity_type: string }[] = [
  { id: 572, name: "test_cases", entity_type: "operational_record" },
  { id: 573, name: "test_suites", entity_type: "operational_record" },
  { id: 574, name: "test_plans", entity_type: "operational_workflow" },
  { id: 575, name: "test_runs", entity_type: "operational_workflow" },
  { id: 576, name: "test_defects", entity_type: "operational_workflow" },
  { id: 577, name: "test_environments", entity_type: "catalog" },
  { id: 578, name: "requirements_to_test_traceability", entity_type: "junction" },
  { id: 225, name: "automation_scripts", entity_type: "operational_workflow" },
];

async function classifyEntityTypes() {
  console.log("\n== 1. entity_type classification (Rule #12) ==");
  const live = await get(
    "/data_objects?id=in.(572,573,574,575,576,577,578,225)&select=id,entity_type",
  );
  const cur = new Map(live.map(r => [Number(r.id), String(r.entity_type ?? "")]));
  let n = 0;
  for (const e of entityTypes) {
    const c = cur.get(e.id);
    if (c && c !== "unclassified") {
      console.log(`  skip ${e.name}: already '${c}'`);
      continue;
    }
    await patch(`/data_objects?id=eq.${e.id}`, { entity_type: e.entity_type });
    console.log(`  set  ${e.name} -> ${e.entity_type}`);
    n++;
  }
  console.log(`  entity_type updated: ${n}`);
  return n;
}

// ============================================================
// 2. Catalog UX (Rule #20) - only writes EMPTY fields, never overwrites.
//    Buyer-voice (workflow + value), no vendor names (Rule #18), no em-dash, American English.
// ============================================================
const domainCopy = {
  catalog_tagline: "Plan, run, and track every test so releases ship with confidence.",
  catalog_description:
    "Give your QA and engineering teams one home for the whole testing effort. Author reusable test cases with clear steps and expected results, organize them into suites, and scope each release with a test plan that sets entry and exit criteria. Run manual and automated tests against the environments you target, capture pass, fail, blocked, and skipped outcomes with full logs, and turn failures into tracked defects that flow straight to the developers who own them. Tie every test back to the requirements it verifies so you always know your coverage, see release readiness at a glance, and stop shipping the surprises that erode customer trust.",
};

async function authorCatalogUX() {
  console.log("\n== 2. Catalog UX (Rule #20) ==");
  let n = 0;
  const [dom] = await get(
    "/domains?id=eq.8&select=catalog_tagline,catalog_description",
  );
  const dBody: Row = {};
  if (!String(dom?.catalog_tagline ?? "").trim()) dBody.catalog_tagline = domainCopy.catalog_tagline;
  if (!String(dom?.catalog_description ?? "").trim()) dBody.catalog_description = domainCopy.catalog_description;
  if (Object.keys(dBody).length) {
    await patch("/domains?id=eq.8", dBody);
    console.log(`  domain 8: wrote ${Object.keys(dBody).join(", ")}`);
    n++;
  } else {
    console.log("  domain 8: already populated, skip");
  }
  // No domain_modules on TEST-MGMT (unbuilt): module-level catalog UX is N/A this pass.
  console.log(`  catalog UX rows updated: ${n}`);
  return n;
}

// ============================================================
async function main() {
  const counts = {
    entity_type: await classifyEntityTypes(),
    catalog_ux: await authorCatalogUX(),
  };
  console.log("\n== SUMMARY ==");
  console.log(JSON.stringify(counts, null, 2));
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(572,573,574,575,576,577,578,225)");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.8");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
