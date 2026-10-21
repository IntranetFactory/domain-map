#!/usr/bin/env bun
// State-driven RET-STORE (domain id 48) execute pass, 2026-06-07.
// Works only the build-independent EXECUTE-NOW items: RET-STORE is an UNBUILT
// domain (0 domain_modules), so every module-grain item cascades behind the
// build and is left. The two independent additive/corrective writes are:
//
//   1. entity_type PATCH: all 6 RET-STORE masters carry entity_type='unclassified'
//      (Rule #12 / B13 fail). All 6 are operational_workflow masters (each is a
//      workflow-bearing record with an obvious state machine). PATCH to
//      'operational_workflow'. This is a data_objects-column fix, no domain_module_id
//      involved, so it does not depend on the module build.
//
//   2. Catalog UX (Rule #20 / B1B-CATALOG-UX): the RET-STORE domains row has both
//      catalog_tagline and catalog_description empty. Author buyer-voice copy
//      (workflow + value, no vendor/product names, no em-dash, American English) and
//      write it. The domain row exists independent of the build. NEVER overwrite a
//      non-empty value: the script re-reads first and skips if already populated.
//
// Idempotent: reads live state before every write, patches only what is still
// unclassified / empty. record_status is left at the DB default ('new') for any
// content; no row is stamped approved.

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

const DOMAIN_ID = 48;
const MASTER_IDS = [647, 648, 649, 650, 651, 652];

// ------------------------------------------------------------------
// 1. entity_type PATCH (unclassified -> operational_workflow)
// ------------------------------------------------------------------
async function fixEntityType(): Promise<number> {
  const masters = await get(
    `/data_objects?id=in.(${MASTER_IDS.join(",")})&select=id,data_object_name,entity_type`,
  );
  const toFix = masters.filter(m => m.entity_type === "unclassified" || m.entity_type == null);
  if (toFix.length === 0) {
    console.log("entity_type: all 6 masters already classified, nothing to do.");
    return 0;
  }
  for (const m of toFix) {
    await patch(`/data_objects?id=eq.${m.id}`, { entity_type: "operational_workflow" });
    console.log(`  PATCH data_objects.${m.data_object_name} (${m.id}) entity_type -> operational_workflow`);
  }
  console.log(`entity_type: patched ${toFix.length} masters to operational_workflow.`);
  return toFix.length;
}

// ------------------------------------------------------------------
// 2. Catalog UX on the domains row (write only when empty)
// ------------------------------------------------------------------
const CATALOG_TAGLINE =
  "Run the store floor: dispatch daily tasks, audit execution, and staff the right hours in the right places.";

const CATALOG_DESCRIPTION =
  "Retail Store Operations is the daily operating rhythm of the sales floor. " +
  "It pushes the work that has to happen in every store down to the right associate at the right time: " +
  "shelf stocking, planogram resets, zone cleaning, opening and closing checklists, and safety walks, " +
  "then tracks completion so district and store managers can see, store by store, whether the plan actually got done.\n\n" +
  "The same workflow runs the controls that keep a fleet of stores consistent. " +
  "Operational and compliance audits, planogram compliance checks with photo evidence, and mystery-shopper assessments " +
  "turn the in-store experience into scored, remediable records, while labor scheduling matches associate availability " +
  "and coverage bands to forecasted demand so no shift is over- or under-staffed.\n\n" +
  "The payoff is execution you can prove: consistent merchandising and service across every location, fewer compliance " +
  "and shrink gaps, and frontline accountability that holds up. The domain feeds completed tasks and published schedules " +
  "into workforce time and labor, opens coaching and service follow-ups from audit and mystery-shopper findings, and " +
  "escalates overdue checklists so nothing on the floor quietly falls through.";

function assertNoEmDash(label: string, text: string): void {
  if (text.includes("—")) {
    throw new Error(`${label} contains an em-dash (U+2014); rewrite before loading.`);
  }
}

async function fixCatalogUx(): Promise<number> {
  assertNoEmDash("catalog_tagline", CATALOG_TAGLINE);
  assertNoEmDash("catalog_description", CATALOG_DESCRIPTION);

  const [domain] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=id,catalog_tagline,catalog_description`,
  );
  if (!domain) throw new Error(`RET-STORE domain id ${DOMAIN_ID} not found.`);

  const patchBody: Row = {};
  const tagEmpty = domain.catalog_tagline == null || String(domain.catalog_tagline).trim() === "";
  const descEmpty =
    domain.catalog_description == null || String(domain.catalog_description).trim() === "";

  if (tagEmpty) patchBody.catalog_tagline = CATALOG_TAGLINE;
  else console.log("catalog_tagline already populated, skipping (no overwrite).");

  if (descEmpty) patchBody.catalog_description = CATALOG_DESCRIPTION;
  else console.log("catalog_description already populated, skipping (no overwrite).");

  if (Object.keys(patchBody).length === 0) {
    console.log("Catalog UX: domain row already has both fields, nothing to do.");
    return 0;
  }
  await patch(`/domains?id=eq.${DOMAIN_ID}`, patchBody);
  console.log(`Catalog UX: wrote ${Object.keys(patchBody).join(" + ")} on the RET-STORE domains row.`);
  return Object.keys(patchBody).length;
}

// ------------------------------------------------------------------
const etCount = await fixEntityType();
const uxCount = await fixCatalogUx();

console.log("\n=== Summary ===");
console.log(`entity_type masters patched: ${etCount}`);
console.log(`domain catalog fields written: ${uxCount}`);
console.log("\nUI links:");
console.log("https://tests.semantius.app/domain_map/data_objects");
console.log("https://tests.semantius.app/domain_map/domains");
