#!/usr/bin/env bun
// State-driven LSD audit execute (domain-map-analyst Validate mode, SKILL.md Rule #21).
// Date: 2026-06-07.
//
// Scope (only the module-INDEPENDENT, additive/corrective open items; LSD is an UNBUILT
// domain with 0 domain_modules, so every module-gated structural fix is LEFT/SURFACED):
//   1. Rule #12: PATCH data_objects.entity_type from 'unclassified' -> 'operational_workflow'
//      on the 8 LSD masters (633-640). All 8 carry observable lifecycle transitions.
//   2. Rule #20 (B1A-S3): author the empty catalog_tagline + catalog_description on the
//      LSD domains row (id 25). Buyer-voice, no vendor names, no em-dash, American English.
//      Stale "surface-before-write" gate ignored per brief; never overwrite a non-empty value.
//
// Idempotent: reads live first; only patches rows still carrying the pre-state value.

import {} from "bun";

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

const LSD_DOMAIN_ID = 25;
const MASTER_IDS = [633, 634, 635, 636, 637, 638, 639, 640];

// ----------------------------------------------------------------------------
// 1. entity_type backfill (Rule #12). All 8 LSD masters are operational_workflow:
//    each has an observable state machine (matters submitted->...->closed; intake
//    submitted->triaged->routed; holds drafted->issued->acknowledged->released;
//    ediscovery created->...->closed; engagements proposed->active->completed;
//    advice drafted->issued; inquiries received->...->closed; dockets open->updated->closed).
// ----------------------------------------------------------------------------
async function backfillEntityType(): Promise<number> {
  const live = await get(
    `/data_objects?id=in.(${MASTER_IDS.join(",")})&select=id,data_object_name,entity_type&order=id.asc`,
  );
  const needPatch = live.filter(
    r => r.entity_type === null || r.entity_type === "unclassified" || r.entity_type === "",
  );
  console.log(
    `entity_type: ${needPatch.length} of ${live.length} LSD masters need patch to 'operational_workflow'`,
  );
  let patched = 0;
  for (const r of needPatch) {
    await patch(`/data_objects?id=eq.${r.id}`, { entity_type: "operational_workflow" });
    console.log(`  patched ${r.data_object_name} (id ${r.id}) -> operational_workflow`);
    patched++;
  }
  return patched;
}

// ----------------------------------------------------------------------------
// 2. Catalog UX (Rule #20 / B1A-S3) on the LSD domain row. Buyer voice: workflow + value.
//    No vendor/product names (Rule #18). No em-dash. American English.
// ----------------------------------------------------------------------------
const CATALOG_TAGLINE =
  "Run the in-house legal department as a service: take in requests, triage them into matters, and move legal work to close.";

const CATALOG_DESCRIPTION =
  "Legal Service Delivery gives the in-house legal team a single front door for the rest of the business. " +
  "Employees and business units submit requests for advice, review, or representation through an intake portal; " +
  "the legal team triages each request, decides whether to open a matter, route it to outside counsel, or answer it directly, " +
  "and then tracks the work through to resolution. Matters carry their parties, key dates, budgets, and assigned counsel in one place, " +
  "so nothing falls through the cracks and the team can see how much legal work is in flight at any moment.\n\n" +
  "Around the matter sit the operational workflows that legal teams live in every day: issuing and releasing legal holds, " +
  "orchestrating ediscovery collection and production, recording legal advice with its privilege classification, " +
  "engaging and managing outside counsel, and responding to inquiries from regulators within deadline. " +
  "Court-bound matters get a docket that tracks filings, hearings, and trial dates against the calendar.\n\n" +
  "The value is faster, more consistent legal service with far less email and spreadsheet tracking. " +
  "Leaders get visibility into demand, workload, cycle time, and outside-counsel spend, " +
  "while the business gets a predictable place to ask for legal help and a clear answer on where each request stands.";

async function backfillCatalogUx(): Promise<{ tagline: boolean; description: boolean }> {
  const [domain] = await get(
    `/domains?id=eq.${LSD_DOMAIN_ID}&select=id,domain_code,catalog_tagline,catalog_description`,
  );
  if (!domain) throw new Error(`LSD domain row id=${LSD_DOMAIN_ID} not found`);

  const body: Row = {};
  const taglineEmpty =
    domain.catalog_tagline === null || domain.catalog_tagline === "";
  const descEmpty =
    domain.catalog_description === null || domain.catalog_description === "";

  if (taglineEmpty) body.catalog_tagline = CATALOG_TAGLINE;
  else console.log("catalog_tagline already non-empty; NOT overwriting");
  if (descEmpty) body.catalog_description = CATALOG_DESCRIPTION;
  else console.log("catalog_description already non-empty; NOT overwriting");

  if (Object.keys(body).length > 0) {
    await patch(`/domains?id=eq.${LSD_DOMAIN_ID}`, body);
    console.log(
      `catalog UX: patched ${Object.keys(body).join(", ")} on LSD domain row ${LSD_DOMAIN_ID}`,
    );
  } else {
    console.log("catalog UX: nothing to write (both fields already non-empty)");
  }
  return { tagline: taglineEmpty, description: descEmpty };
}

// ----------------------------------------------------------------------------
async function main() {
  console.log("=== LSD state-driven execute 2026-06-07 ===");
  // (tenant already confirmed ma@adenin.com / org adenin via getCurrentUser before run)

  const entityPatched = await backfillEntityType();
  const catalog = await backfillCatalogUx();

  console.log("\n=== Summary ===");
  console.log(`entity_type patched: ${entityPatched} masters`);
  console.log(
    `catalog UX: tagline=${catalog.tagline ? "written" : "skipped"}, description=${catalog.description ? "written" : "skipped"}`,
  );

  console.log("\n=== Verify ===");
  const checkEt = await get(
    `/data_objects?id=in.(${MASTER_IDS.join(",")})&select=id,data_object_name,entity_type&order=id.asc`,
  );
  for (const r of checkEt) console.log(`  ${r.data_object_name}: ${r.entity_type}`);
  const [d] = await get(
    `/domains?id=eq.${LSD_DOMAIN_ID}&select=catalog_tagline,catalog_description`,
  );
  console.log(`  domain tagline len: ${String(d?.catalog_tagline ?? "").length}`);
  console.log(`  domain description len: ${String(d?.catalog_description ?? "").length}`);

  console.log("\n=== UI links ===");
  console.log("https://tests.semantius.app/domain_map/data_objects");
  console.log("https://tests.semantius.app/domain_map/domains");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
