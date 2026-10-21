#!/usr/bin/env bun
// SUP-LIFE state-driven Validate execute (2026-06-07).
// Two additive/corrective PATCH waves; both idempotent (read live, skip if already done).
//
//   1. B13 entity_type: PATCH the 5 SUP-LIFE masters that are still
//      entity_type='unclassified' to 'operational_workflow' (each ships a
//      documented state machine per state.yaml B1B-B12). 498 is already classified.
//      Targets: 206 suppliers, 207 supplier_onboardings, 208 supplier_qualifications,
//               209 supplier_scorecards, 730 supplier_risk_assessments.
//   2. A4 Catalog UX (Rule #20): PATCH domains.id=28 catalog_tagline + catalog_description
//      ONLY because both are empty live. Never overwrites a non-empty value.
//
// No DELETE, no overwrite of any non-empty value. Nothing stamped approved (Rule #1).

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
    const msg = `${stderr}`;
    if (/audience|JWT|aud /i.test(msg)) {
      console.error("JWT AUDIENCE ERROR — STOPPING, returning verbatim:\n" + msg);
      process.exit(5);
    }
    throw new Error(`semantius call failed (exit ${exitCode}): ${msg}`);
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

// ============================================================
// WAVE 1 — B13 entity_type classification (operational_workflow)
// ============================================================
const WORKFLOW_MASTERS = [206, 207, 208, 209, 730];

console.log("=== WAVE 1: entity_type (B13) ===");
const masters = await get(
  "/data_objects?id=in.(206,207,208,209,498,730)&select=id,data_object_name,entity_type&order=id",
);
const stillUnclassified = masters
  .filter(m => m.entity_type === "unclassified" && WORKFLOW_MASTERS.includes(Number(m.id)))
  .map(m => Number(m.id));

if (stillUnclassified.length === 0) {
  console.log("  all target masters already classified, nothing to PATCH");
} else {
  console.log(`  PATCHing ${stillUnclassified.length} masters -> operational_workflow: ${stillUnclassified.join(", ")}`);
  const res = await patch(
    `/data_objects?id=in.(${stillUnclassified.join(",")})`,
    { entity_type: "operational_workflow" },
  );
  console.log(`  PATCHed ${res.length} rows`);
}

// verify
const afterMasters = await get(
  "/data_objects?id=in.(206,207,208,209,498,730)&select=id,data_object_name,entity_type&order=id",
);
console.log("  post-state:");
for (const m of afterMasters) {
  console.log(`    ${m.id} ${m.data_object_name}: ${m.entity_type}`);
}

// ============================================================
// WAVE 2 — A4 Catalog UX (Rule #20), domain row only, empty-only
// ============================================================
console.log("\n=== WAVE 2: catalog UX (A4 / Rule #20) ===");

const TAGLINE =
  "Onboard new suppliers, qualify them against your standards, and monitor performance and risk on one supplier record.";

const DESCRIPTION = [
  "Run supplier onboarding from invite through KYC, banking, tax, and sanctions checks. Capture insurance, ISO, and SOC certifications with automatic expiry alerts so renewals never lapse.",
  "Score supplier performance against delivery, quality, and SLA targets. Roll KPIs into tiered scorecards your category managers and finance teams share.",
  "Assess supplier risk on financial, ESG, cyber, and operational axes. Escalate elevated scores to governance and procurement for re-qualification or replacement.",
].join("\n\n");

const [domainRow] = await get(
  "/domains?domain_code=eq.SUP-LIFE&select=id,catalog_tagline,catalog_description",
);
if (!domainRow) throw new Error("SUP-LIFE domain row not found");

const updates: Row = {};
const tagEmpty = !domainRow.catalog_tagline || String(domainRow.catalog_tagline).trim() === "";
const descEmpty =
  !domainRow.catalog_description || String(domainRow.catalog_description).trim() === "";

if (tagEmpty) updates.catalog_tagline = TAGLINE;
else console.log("  catalog_tagline already populated, NOT overwriting");
if (descEmpty) updates.catalog_description = DESCRIPTION;
else console.log("  catalog_description already populated, NOT overwriting");

if (Object.keys(updates).length === 0) {
  console.log("  nothing to backfill (both fields already populated)");
} else {
  console.log(`  PATCHing domains.id=28 fields: ${Object.keys(updates).join(", ")}`);
  await patch("/domains?id=eq.28", updates);
}

const [afterDomain] = await get(
  "/domains?domain_code=eq.SUP-LIFE&select=id,catalog_tagline,catalog_description",
);
console.log("  post-state tagline:", JSON.stringify(afterDomain.catalog_tagline));
console.log("  post-state description (first 80):", String(afterDomain.catalog_description).slice(0, 80) + "...");

// ============================================================
// UI links
// ============================================================
console.log("\n=== UI links ===");
console.log("https://tests.semantius.app/domain_map/data_objects?id=in.(206,207,208,209,730)");
console.log("https://tests.semantius.app/domain_map/domains?domain_code=eq.SUP-LIFE");
console.log("\nDONE.");
