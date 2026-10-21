#!/usr/bin/env bun
// State-driven execute for OP-RES (Operational Resilience), 2026-06-07.
// Works ONLY the open EXECUTE-class items in audits/OP-RES/state.yaml; idempotent
// (read live, act only on what is still open).
//
// OP-RES (domain 18, leadership-tier sub-domain under GRC id 15) is UNBUILT:
// 0 domain_modules, 0 capability_domains, 0 skills, 0 module DMDOs, and it masters
// ZERO data_objects of its own. Per the prompt's LEAVE rule for UNBUILT domains,
// the build (B1A-BUILD / B1B-S1 modules, B1B-S2 capabilities, B1B-S4 skill,
// B1B-S6 consumer DMDOs) is SURFACED, not scaffolded, and its M / F / B10b
// cascade is left. The build is gated on the keystone B2-1 (leadership-tier vs
// promote) decision, settled as "master-bearing, needs a build" by B1A-RECLASS.
//
// Because OP-RES masters no data_objects, there is NO entity_type PATCH owed,
// NO alias work, NO intra-domain relationship/handoff work owed by OP-RES.
// C1 is already satisfied (owner = Governance, Risk and Compliance; contributors
// IT Operations + Security all present on business_function_domains), so no
// business_function_domains insert is owed either.
//
// The SOLE EXECUTE item available without a build:
//   1. A4 catalog UX (Rule #20, B1B-S3 / B2-4): author buyer-voice
//      catalog_tagline + catalog_description into the EMPTY fields on domain 18.
//      The prompt's EXECUTE rule overrides the stale Rule #20 "surface-before-write"
//      gate and the B2-4 "which flow" question. Never overwrite a non-empty value.
//      No modules exist, so there is no module-level catalog UX (M8) to write.
//
// SURFACED (not written): all b2 (B2-1, B2-2, B2-3, B2-4); the DESTRUCTIVE
// handoff-252 trigger repoint (B1B-S5, re-attribute trigger_event 227) which is
// also blocked on GRC B9/B5; personas/RACI (Phase P, deferred).
// LEFT: b1b foreign-blocked (B1B-S5 GRC-owed trigger + module FK backfill;
// B1B-S6 consumer DMDO blocked on the build; B1B-A1 agent_curated handoff_processes
// blocked behind B1B-S5); b3 (11 candidates gated on B2-1); the whole build cascade;
// B1B-S4 (per-module system skill) RETIRED per the 2026-06-06 supersession header.

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

const DOMAIN_ID = 18;
const EM_DASH = "—";

// ============================================================
// A4 catalog UX (Rule #20): buyer-voice copy into EMPTY fields only.
// Workflow + value, buyer voice, no vendor/product names. Statutory
// frameworks (DORA, NIS2) are allowed in description text.
// ============================================================
const DOMAIN_COPY = {
  catalog_tagline:
    "Map the services your customers depend on, set the limits you can never breach, and prove you can stay inside them when something breaks.",
  catalog_description:
    "Run your business through the lens of the services that matter most to customers and to the market, not the systems that happen to support them. Identify your important business services, then map each one down to the people, processes, applications, data, and third parties it relies on, so you can see exactly what a single failure would take out and where the hidden single points of failure are.\n\nFor every important service, set an impact tolerance: the maximum disruption you are willing to accept before customers or the wider market are harmed. Test those limits against severe but plausible scenarios, from a key supplier going dark to a cyber outage or a data-center loss, and record whether each service stayed inside tolerance or breached it. Turn every breach and near miss into tracked remediation with owners and due dates, so the gaps close instead of resurfacing in the next test.\n\nGive boards and regulators a clear, evidenced view of how resilient the organization really is. Maintain the self-assessment and reporting that rules such as DORA and NIS2 expect, link operational-resilience incidents back to the services and tolerances they threatened, and keep the dependency map current as the business changes, so resilience is a living posture you can defend rather than a document that ages on a shelf.",
};

function assertNoEmDash() {
  for (const b of [DOMAIN_COPY.catalog_tagline, DOMAIN_COPY.catalog_description]) {
    if (b.includes(EM_DASH)) throw new Error(`em-dash found in authored copy: ${b}`);
  }
}

async function authorCatalogUX(): Promise<number> {
  const [dom] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=id,catalog_tagline,catalog_description`,
  );
  const body: Row = {};
  if (!dom?.catalog_tagline || String(dom.catalog_tagline).trim() === "")
    body.catalog_tagline = DOMAIN_COPY.catalog_tagline;
  if (!dom?.catalog_description || String(dom.catalog_description).trim() === "")
    body.catalog_description = DOMAIN_COPY.catalog_description;
  if (Object.keys(body).length === 0) {
    console.log("  domain 18 catalog UX: both fields already non-empty, skipping");
    return 0;
  }
  await patch(`/domains?id=eq.${DOMAIN_ID}`, body);
  console.log(`  domain 18 catalog UX written: ${Object.keys(body).join(", ")}`);
  return 1;
}

async function main() {
  assertNoEmDash();

  console.log("== A4 catalog UX (Rule #20) ==");
  const uxCount = await authorCatalogUX();

  console.log("\n== SUMMARY ==");
  console.log(`  domain catalog UX written: ${uxCount}`);
  console.log("  (OP-RES is UNBUILT: build + cascade SURFACED/LEFT, not scaffolded)");

  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.18");
}

await main();
