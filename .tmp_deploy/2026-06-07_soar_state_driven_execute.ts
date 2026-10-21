#!/usr/bin/env bun
// State-driven execute for SOAR (Security Orchestration, Automation and Response),
// 2026-06-07. Works ONLY the open EXECUTE-class items in audits/SOAR/state.yaml;
// idempotent (read live, act only on what is still open).
//
// SOAR (domain 12, sub-domain under SECOPS id 11) is UNBUILT and master-bearing
// under the overlay test (playbooks, automation runs, security cases are real
// records), but today has 0 domain_modules (M1 fail), 0 capability_domains,
// 0 skills, 0 DMDOs, 0 handoffs, 0 trigger_events, and masters ZERO data_objects
// of its own (security_playbooks / automation_runs / security_cases /
// security_incidents do not exist). Per the prompt's LEAVE rule for UNBUILT
// domains, the build (B1A-BUILD / B1-S1 modules + capabilities, B1-S4 events,
// B1-S6 skills, B1-S7 lifecycle states) is SURFACED, not scaffolded, and its
// M / B / F / H cascade is left. The build's precision is gated on B2-S3
// (Phase 0 vendor research vs eyeball-mode), a user decision.
//
// Because SOAR masters no data_objects there is NO entity_type PATCH owed, NO
// intra-domain handoff/relationship work owed, NO APQC handoff_processes anchor
// (0 cross-domain handoffs). The owner business_function_domains row (function
// 64, Security Operations Center = "Security", role 'owner') already exists, so
// the C1 owner row is a no-op.
//
// EXECUTE items available without a build:
//   1. B1-S2 / A4 catalog UX (Rule #20): author buyer-voice catalog_tagline +
//      catalog_description into the EMPTY fields on domain 12. The prompt's
//      EXECUTE rule overrides the stale "surface-before-write" gate (B2-S4) and
//      Rule #20's per-row-approval gate. Never overwrite a non-empty value.
//      No modules exist, so there is no module-level catalog UX to write.
//   2. B1-S3 / B11 aliases: INSERT clearly-enumerated, vendor-neutral synonyms
//      into domain_aliases (alias_type='synonym', record_status omitted -> 'new').
//      Idempotent on (domain_id, alias). No vendor/product names (Rule #18).
//
// SURFACED (not written): B1A-RULE-EMDASH (DESTRUCTIVE: overwrites the non-empty
// domains.business_logic value to strip a U+2014 em-dash; recommended fix only);
// all b2 (B2-S1 ownership contributor/consumer, B2-S2 regulations, B2-S3 Phase 0
// vs eyeball, B2-S4 catalog copy flow -> superseded by item 1 above); the build.
// LEFT: b1b foreign-blocked/cascaded (B1-S1 build gated on B2-S3; B1-S4/S6/S7/S8
// cascade on the build; B1-S5 publisher-side fan-out owed by DLP/DATA-SEC);
// B1-S6 also RETIRED per the per-domain-skill supersession header; b3 (empty);
// B1-S9 record_status meta-reminder (no live target).

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
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const result = await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) });
    out.push(...result);
  }
  return out;
}

const DOMAIN_ID = 12;
const EM_DASH = "—";

// ============================================================
// B1-S2 / A4 catalog UX (Rule #20): buyer-voice copy into EMPTY fields only.
// Workflow + value, buyer voice, no vendor/product names (Rule #18).
// ============================================================
const DOMAIN_COPY = {
  catalog_tagline:
    "Turn your security team's repetitive response steps into automated playbooks so every alert gets handled fast, consistently, and with a full audit trail.",
  catalog_description:
    "Give your security operations center a way to respond to alerts at machine speed instead of by hand. Build playbooks that capture how your analysts actually work, enrich an indicator, check it against threat intelligence, isolate a host, disable an account, open a case, and let the platform run those steps automatically the moment a qualifying alert arrives. The repetitive triage that used to consume an analyst's day runs in seconds, and the steps that genuinely need human judgment are the only ones that reach the queue.\n\nConnect the tools you already own so a single response can reach across the stack. Playbooks call out to endpoint, network, identity, email, and ticketing systems through reusable connectors, gather the evidence, take the containment action, and write everything back to a security case so the incident has one timeline from first signal to closure. Analysts work the case, assign tasks, escalate when criteria are met, and track every action against the clock.\n\nMeasure and improve the whole response. Every run is recorded, so you can see how often a playbook fires, where it succeeds or fails, and how long containment takes, then tighten mean time to respond release after release. The same record gives leadership and auditors defensible proof that incidents were handled, escalated, and disclosed on time.",
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
    console.log("  domain 12 catalog UX: both fields already non-empty, skipping");
    return 0;
  }
  await patch(`/domains?id=eq.${DOMAIN_ID}`, body);
  console.log(`  domain 12 catalog UX written: ${Object.keys(body).join(", ")}`);
  return 1;
}

// ============================================================
// B1-S3 / B11 domain_aliases: vendor-neutral synonyms, alias_type='synonym',
// record_status omitted (-> 'new'). Idempotent on (domain_id, alias).
// 'notes' column never written (Rule #15).
// ============================================================
const ALIASES = [
  "security orchestration",
  "security automation",
  "playbook automation",
  "SOC automation",
  "hyperautomation for SOC",
  "security orchestration automation and response",
  "incident response automation",
  "playbook orchestration",
];

function assertAliasesNoEmDash() {
  for (const a of ALIASES) if (a.includes(EM_DASH)) throw new Error(`em-dash in alias: ${a}`);
}

async function authorAliases(): Promise<number> {
  const existing = await get(`/domain_aliases?domain_id=eq.${DOMAIN_ID}&select=alias`);
  const have = new Set(existing.map(r => String(r.alias).toLowerCase()));
  const missing = ALIASES.filter(a => !have.has(a.toLowerCase()));
  if (missing.length === 0) {
    console.log(`  domain_aliases: all ${ALIASES.length} present, nothing to insert`);
    return 0;
  }
  const rows: Row[] = missing.map(a => ({
    domain_id: DOMAIN_ID,
    alias: a,
    label: a,
    alias_type: "synonym",
  }));
  await insert("/domain_aliases", rows);
  console.log(`  domain_aliases inserted: ${missing.length} (${existing.length} existed)`);
  return missing.length;
}

async function main() {
  assertNoEmDash();
  assertAliasesNoEmDash();

  console.log("== B1-S2 / A4 catalog UX (Rule #20) ==");
  const uxCount = await authorCatalogUX();

  console.log("== B1-S3 / B11 domain_aliases ==");
  const aliasCount = await authorAliases();

  console.log("\n== SUMMARY ==");
  console.log(`  domain catalog UX written: ${uxCount}`);
  console.log(`  domain_aliases inserted: ${aliasCount}`);
  console.log("  (SOAR is UNBUILT: build + M/B/F/H cascade SURFACED/LEFT, not scaffolded)");

  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.12");
  console.log("  https://tests.semantius.app/domain_map/domain_aliases?domain_id=eq.12");
}

await main();
