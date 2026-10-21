#!/usr/bin/env bun
// State-driven execute for BCM (Business Continuity Management), 2026-06-07.
// Works ONLY the open EXECUTE-class items in audits/BCM/state.yaml; idempotent
// (read live, act only on what is still open).
//
// BCM (domain 17, leadership-tier sub-domain under GRC id 15) is UNBUILT:
// 0 domain_modules, 0 capability_domains, 0 skills, 0 DMDOs, and it masters
// ZERO data_objects of its own. Per the prompt's LEAVE rule for UNBUILT domains,
// the build (B1A-BUILD / B1B-S1 modules, B1B-S2 capabilities, B1B-S4 skills,
// B1B-S6 consumer DMDOs) is SURFACED, not scaffolded, and its M / F / B10b
// cascade is left. The build is gated on the keystone B2-1 (leadership-tier vs
// promote) decision.
//
// Because BCM masters no data_objects, there is NO entity_type PATCH owed
// (the only data_object on its boundary, compliance_risks id 282, is mastered
// by GRC and already carries entity_type='operational_workflow'), NO alias work,
// NO intra-domain relationship/handoff work owed by BCM.
//
// The SOLE EXECUTE item available without a build:
//   1. A4 catalog UX (Rule #20, B1B-S3 / B2-4): author buyer-voice
//      catalog_tagline + catalog_description into the EMPTY fields on domain 17.
//      The prompt's EXECUTE rule overrides the stale Rule #20 "surface-before-write"
//      gate and the B2-4 "which flow" question. Never overwrite a non-empty value.
//      No modules exist, so there is no module-level catalog UX to write.
//
// SURFACED (not written): all b2 (B2-1, B2-2, B2-3, B2-4); the DESTRUCTIVE
// handoff-253 trigger repoint (B1B-S5, re-attribute trigger_event 227) which is
// also blocked on GRC B9/B10b; personas/RACI (Phase P, deferred).
// LEFT: b1b foreign-blocked (B1B-S5 GRC-owed module FK backfill; B1B-A1 blocked
// behind B1B-S5); b3 (12 candidates gated on B2-1); the whole build cascade.

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

const DOMAIN_ID = 17;
const EM_DASH = "—";

// ============================================================
// A4 catalog UX (Rule #20): buyer-voice copy into EMPTY fields only.
// Workflow + value, buyer voice, no vendor/product names. Statutory
// frameworks (ISO 22301, DORA, NIS2) are allowed in description text.
// ============================================================
const DOMAIN_COPY = {
  catalog_tagline:
    "Know what would hurt most if it stopped, plan the recovery, and prove the plan works before you need it.",
  catalog_description:
    "Build an organization that keeps running when something goes wrong. Start with a business impact analysis that maps each critical service to the processes, applications, people, and suppliers it depends on, then set the recovery time and recovery point targets that say how fast each one has to come back and how much data you can afford to lose. Turn those targets into continuity and disaster recovery plans with named owners, recovery strategies, and step-by-step runbooks, so the response is written down and approved instead of improvised under pressure.\n\nKeep the plans honest. Schedule tabletop, walkthrough, and full-interruption exercises, capture the gaps and action items each one surfaces, and feed the findings back into the plans so they get stronger with every test. When a real disruption hits, activate the right plan, stand up the response team, work the call tree and mass-notification roster, log every decision and outbound message, and stand down cleanly with an after-action record that improves the next response.\n\nGive leadership and auditors a defensible answer on resilience. Track plan currency and exercise coverage, evidence the controls that frameworks such as ISO 22301, DORA, and NIS2 expect, and connect continuity to the risks and compliance findings raised elsewhere so a critical risk automatically refreshes the continuity exposure it threatens.",
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
    console.log("  domain 17 catalog UX: both fields already non-empty, skipping");
    return 0;
  }
  await patch(`/domains?id=eq.${DOMAIN_ID}`, body);
  console.log(`  domain 17 catalog UX written: ${Object.keys(body).join(", ")}`);
  return 1;
}

async function main() {
  assertNoEmDash();

  console.log("== A4 catalog UX (Rule #20) ==");
  const uxCount = await authorCatalogUX();

  console.log("\n== SUMMARY ==");
  console.log(`  domain catalog UX written: ${uxCount}`);
  console.log("  (BCM is UNBUILT: build + cascade SURFACED/LEFT, not scaffolded)");

  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.17");
}

await main();
