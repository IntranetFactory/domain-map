#!/usr/bin/env bun
// State-driven execute for VULN-MGMT (Vulnerability Management), 2026-06-07.
// Works ONLY the open EXECUTE-class items in audits/VULN-MGMT/state.yaml; idempotent
// (read live, act only on what is still open).
//
// VULN-MGMT (domain 13, sub-domain under SECOPS id 11) is UNBUILT:
// 0 domain_modules, 0 domain_module_host_domains, 0 capability_domains, and it
// masters ZERO data_objects of its own today. Under the overlay test it IS
// master-bearing (vulnerabilities, scan results, remediation tickets are real
// records; the leadership-tier zero-master exemption was rescinded 2026-06-02),
// so the answer is a BUILD, not an exemption. Per the prompt's LEAVE rule for
// UNBUILT domains, the build (B1A-BUILD / B1B-V1 modules + capabilities + masters)
// is SURFACED, not scaffolded, and its M / F / B10b cascade is left.
// The build is gated on the keystone b2 decisions (B2-V1 leadership-tier,
// B2-V2 module split, B2-V3 capability cross-cutting).
//
// EXECUTE items available WITHOUT a build:
//   1. A4 catalog UX (Rule #20, B1B-V2 / B2-V5): author buyer-voice
//      catalog_tagline + catalog_description into the EMPTY fields on domain 13.
//      The prompt's EXECUTE rule overrides the stale Rule #20 "surface-before-write"
//      gate and the B2-V5 wording question. Never overwrite a non-empty value.
//      No modules exist, so there is no module-level catalog UX to write.
//   2. H1 APQC tag (B1A-V6): inbound cross-domain handoff 36 (SAM 52 -> VULN-MGMT 13,
//      trigger software_install.detected, payload software_installations) carries 0
//      handoff_processes. Clean cross-industry PCF L4 match found live:
//      process id 1312 "Maintain IT asset records" (code 8.7.7.4, external_id 20918),
//      under 8.0 Manage IT > 8.7 support services > 8.7.7 infrastructure resource
//      administration. A software-install detection event implements maintenance of
//      the IT asset / software-inventory record. INSERT handoff_processes
//      (proposal_source='agent_curated', role='implements', record_status omitted).
//   3. B11 aliases (B1B-V7): domain_aliases has 0 rows. INSERT clearly-enumerated
//      generic industry synonyms (alias_type='synonym' to match the live convention).
//      Only the unambiguous synonyms are written here; the B2-V6 "extend the slate"
//      judgment (VRM / TEM / weakness management) stays surfaced.
//
// entity_type PATCH: NOT owed. VULN-MGMT masters no data_objects. Its two boundary
// DDOs (software_installations id 59, org_units id 34) are mastered by SAM and HCM.
// business_function_domains (C1): NOT owed. Owner (Security Operations Center,
// business_function 64) + 2 contributors already present.
//
// SURFACED (not written): all b2 (B2-V1..V6); the BUILD itself (B1A-BUILD /
// B1A-RECLASS / B1B-V1); personas/RACI (Phase P, deferred, applies only after build).
// LEFT: b1b gated behind the build (B1B-V1 modules+caps, B1B-V5 target FK needs a
// module to point at); b3 backlog (8 entity + 5 regulation + 2 modularization
// candidates, gated on B2-V1); the whole build cascade; SAM-owed source FK on 36.

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
const post = (path: string, body: Row[]) => call({ method: "POST", path, body });

const DOMAIN_ID = 13;
const HANDOFF_ID = 36;
const PCF_PROCESS_ID = 1312; // "Maintain IT asset records", code 8.7.7.4, external_id 20918
const EM_DASH = "—";

// ============================================================
// A4 catalog UX (Rule #20): buyer-voice copy into EMPTY fields only.
// Workflow + value, buyer voice, no vendor/product names. Statutory
// frameworks (PCI-DSS, NIS2, FedRAMP) are allowed in description text.
// ============================================================
const DOMAIN_COPY = {
  catalog_tagline:
    "Find every weakness across your estate, fix the ones an attacker would actually use first, and prove it stayed fixed.",
  catalog_description:
    "Run a closed loop that turns a sprawling, noisy list of security weaknesses into a short list of fixes the right team actually completes. Discover what you own first, from endpoints, servers, and network gear to cloud workloads, containers, web apps, and source code, then scan it continuously so new exposures surface within hours instead of at the next quarterly review. Each scan produces findings tied to a specific asset and a specific vulnerability, deduplicated and tracked through their own lifecycle so a weakness opened today is the same record you confirm, remediate, and verify weeks later.\n\nNot every finding deserves the same urgency, so layer risk on top of raw severity. Combine base severity scores with exploit-prediction signals, known-exploited and actively-attacked intelligence, asset criticality, and exposure to produce a ranked queue that answers the only question that matters at scale: what do we fix this week. Route the winners to the team that owns the fix as remediation work with due dates and ownership, and give the business a governed path to formally accept and time-box the risks it chooses not to fix yet.\n\nClose the loop and keep it auditable. Re-scan to confirm fixes actually landed, reopen anything that regresses, and watch mean-time-to-remediate trend down by asset group, business unit, and severity. Hand auditors defensible evidence that scanning cadence, remediation timelines, and exception approvals meet the obligations that frameworks such as PCI-DSS, FedRAMP, and NIS2 expect, so vulnerability work stops being a spreadsheet fire drill and becomes a measured, repeatable control.",
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
    console.log("  domain 13 catalog UX: both fields already non-empty, skipping");
    return 0;
  }
  await patch(`/domains?id=eq.${DOMAIN_ID}`, body);
  console.log(`  domain 13 catalog UX written: ${Object.keys(body).join(", ")}`);
  return 1;
}

// ============================================================
// H1 APQC tag (B1A-V6): handoff_processes on inbound cross-domain handoff 36.
// ============================================================
async function authorHandoffProcess(): Promise<number> {
  // Verify the handoff is still cross-domain and still inbound to VULN-MGMT.
  const [ho] = await get(
    `/handoffs?id=eq.${HANDOFF_ID}&select=id,source_domain_id,target_domain_id`,
  );
  if (!ho) {
    console.log(`  handoff ${HANDOFF_ID} not found, skipping APQC tag`);
    return 0;
  }
  if (Number(ho.source_domain_id) === Number(ho.target_domain_id)) {
    console.log(`  handoff ${HANDOFF_ID} is intra-domain, not an H1 candidate, skipping`);
    return 0;
  }
  // Verify the PCF process exists and is cross-industry.
  const [proc] = await get(
    `/processes?id=eq.${PCF_PROCESS_ID}&select=id,process_name,process_code,source_framework`,
  );
  if (!proc) throw new Error(`PCF process ${PCF_PROCESS_ID} not found; refusing to write dangling FK`);
  if (proc.source_framework !== "apqc_pcf_cross_industry")
    throw new Error(`PCF process ${PCF_PROCESS_ID} is not cross-industry (${proc.source_framework})`);
  // Idempotent: skip if a row already maps this handoff to this process.
  const existing = await get(
    `/handoff_processes?handoff_id=eq.${HANDOFF_ID}&process_id=eq.${PCF_PROCESS_ID}&select=id`,
  );
  if (existing.length > 0) {
    console.log(`  handoff_processes ${HANDOFF_ID}->${PCF_PROCESS_ID} already present, skipping`);
    return 0;
  }
  await post("/handoff_processes", [
    {
      handoff_id: HANDOFF_ID,
      process_id: PCF_PROCESS_ID,
      role: "implements",
      proposal_source: "agent_curated",
    },
  ]);
  console.log(
    `  handoff_processes written: handoff ${HANDOFF_ID} implements "${proc.process_name}" (${proc.process_code})`,
  );
  return 1;
}

// ============================================================
// B11 aliases (B1B-V7): clearly-enumerated generic industry synonyms.
// alias_type='synonym' matches the live convention (all 31 existing rows use it).
// Only unambiguous synonyms; B2-V6 "extend slate" judgment stays surfaced.
// ============================================================
const ALIASES: { alias: string; label: string }[] = [
  { alias: "risk-based vulnerability management", label: "RBVM" },
  { alias: "threat and vulnerability management", label: "TVM" },
  { alias: "vulnerability response", label: "vulnerability response" },
  { alias: "vuln management", label: "vuln management" },
];

async function authorAliases(): Promise<number> {
  const existing = await get(
    `/domain_aliases?domain_id=eq.${DOMAIN_ID}&select=id,alias`,
  );
  const have = new Set(existing.map(r => String(r.alias).toLowerCase()));
  const missing = ALIASES.filter(a => !have.has(a.alias.toLowerCase()));
  if (missing.length === 0) {
    console.log(`  domain_aliases: all ${ALIASES.length} already present, skipping`);
    return 0;
  }
  const rows = missing.map(a => ({
    domain_id: DOMAIN_ID,
    alias: a.alias,
    alias_type: "synonym",
    label: a.label,
  }));
  await post("/domain_aliases", rows);
  console.log(`  domain_aliases written: ${missing.map(a => a.alias).join(", ")}`);
  return missing.length;
}

async function main() {
  assertNoEmDash();

  console.log("== A4 catalog UX (Rule #20) ==");
  const uxCount = await authorCatalogUX();

  console.log("\n== H1 APQC tag (handoff 36) ==");
  const hpCount = await authorHandoffProcess();

  console.log("\n== B11 domain_aliases ==");
  const aliasCount = await authorAliases();

  console.log("\n== SUMMARY ==");
  console.log(`  domain catalog UX written: ${uxCount}`);
  console.log(`  handoff_processes written: ${hpCount}`);
  console.log(`  domain_aliases written: ${aliasCount}`);
  console.log("  (VULN-MGMT is UNBUILT: build + cascade SURFACED/LEFT, not scaffolded)");

  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.13");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes?handoff_id=eq.36");
  console.log("  https://tests.semantius.app/domain_map/domain_aliases?domain_id=eq.13");
}

await main();
