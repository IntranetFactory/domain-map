#!/usr/bin/env bun
// 2026-06-07 PRIV-MGMT state-driven Validate execute (SKILL.md Rule #21, bulk batch).
// Additive/corrective only; the one write is a PATCH of EMPTY fields. Idempotent: re-reads
// live before writing and skips work already done.
//
// PRIV-MGMT (domain id 20, parent 15 = GRC) is master-bearing under the overlay test
// (B1A-RECLASS settled 2026-06-02: leadership-tier exemption rescinded; masters DSARs,
// consent records, ROPA/processing inventory, privacy assessments; OneTrust/TrustArc class)
// but UNBUILT: 0 domain_modules (M1 hard fail), 0 capability_domains, 0 masters (neither
// domain_data_objects nor domain_module_data_objects), 0 domain_aliases. Per the UNBUILT
// clause we do NOT scaffold modules/masters/capabilities/roles/skills; the build cascade
// (B1A-BUILD / B1B-S1-CLUSTER) is SURFACED, not executed.
//
// Scope (EXECUTE-classified items from audits/PRIV-MGMT/state.yaml):
//   1. Catalog UX (#20): author EMPTY domain.catalog_tagline / catalog_description (domain 20).
//      My run instructions override the stale "surface-before-write" B2-3 gate: author buyer
//      voice and write it. Module-grain is N/A: 0 modules. No vendor names (Rule #18);
//      statutory frameworks (GDPR, CCPA/CPRA) allowed in description text. No em-dash; US English.
//
// NOT touched here (surfaced to user, blocked on build, or backlog):
//   - B1A-RECLASS (settled note: master-bearing), B1A-BUILD (build of an unbuilt domain) -> SURFACE.
//   - B1A-APQC-HANDOFF-288: gated on B2-5 destructive overlay (DSPM-side B9 attribution
//     mismatch: trigger_event 273 data_object_id=303 data_classifications vs handoff 288
//     payload data_object_id=300 data_assets). SURFACE; do not load the handoff_processes row.
//   - B1B-S1-CLUSTER: blocked on B2-1/B2-2/B2-3/B3-1/B3-3 -> LEAVE.
//   - b2: B2-1 (re-home 4 masters), B2-2 (module split), B2-3 (Rule #20 wording: superseded by
//     this execute for the actual write; the choice of voice is the agent draft), B2-4 (config-
//     shape lifecycle exemption), B2-5 (handoff 288 APQC timing) -> SURFACE.
//   - b3: B3-1 (DataGrail/Transcend solutions), B3-2 (more regulations), B3-3 (master candidates)
//     -> LEAVE (backlog, gated on Phase-0 vetting).
//   - C1 already satisfied live: business_function_domains has owner (Privacy Office bf 72) +
//     contributors (Legal bf 7, Security bf 28). No insert.
//   - entity_type PATCH: N/A (0 PRIV-MGMT masters). data_object_aliases (B11 B1-S10): N/A
//     (no owned masters to attach to; gated on B2-1). APQC H1: handoff 283 already tagged
//     (handoff_processes row 492); handoff 288 gated on B2-5 (see above).

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

const DOMAIN_ID = 20;

// ============================================================
// 1. Catalog UX (Rule #20) - only writes EMPTY fields, never overwrites.
// Buyer voice (workflow + value); no vendor/product names; no em-dash; American English.
// Grounded in the domain's actual nature: DSR/DSAR pipeline, consent ledger, processing
// inventory (ROPA), privacy assessments (PIA/DPIA), breach handling. Statutory frameworks
// (GDPR, CCPA/CPRA) are allowed in description text per Rule #18.
// ============================================================
const domainCopy = {
  catalog_tagline:
    "Handle data-subject requests, capture consent, and keep your processing inventory audit-ready.",
  catalog_description:
    "Run the privacy operations that keep you compliant with GDPR, CCPA/CPRA, and the privacy laws that follow them. Intake and fulfill data-subject access, correction, and deletion requests through a tracked pipeline that fans out to every source system and meets the statutory response clock. Capture and prove consent against the specific purpose it was given for, and honor withdrawals across the systems that rely on it. Maintain a living record of processing activities so you always know what personal data you hold, where it lives, who it is shared with, and on what legal basis. Author privacy and data-protection impact assessments, route them for sign-off, and log breaches with the notification timing regulators expect, so an audit or a regulator inquiry becomes a report you can pull rather than a fire drill.",
};

async function authorCatalogUX() {
  console.log("\n== 1. Catalog UX (Rule #20), domain 20 ==");
  let n = 0;
  const [dom] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=catalog_tagline,catalog_description`,
  );
  const body: Row = {};
  if (!String(dom?.catalog_tagline ?? "").trim()) body.catalog_tagline = domainCopy.catalog_tagline;
  if (!String(dom?.catalog_description ?? "").trim())
    body.catalog_description = domainCopy.catalog_description;
  if (Object.keys(body).length) {
    await patch(`/domains?id=eq.${DOMAIN_ID}`, body);
    console.log(`  domain ${DOMAIN_ID}: wrote ${Object.keys(body).join(", ")}`);
    n++;
  } else {
    console.log(`  domain ${DOMAIN_ID}: already populated, skip`);
  }
  console.log(`  catalog UX rows updated: ${n}`);
  return n;
}

// ============================================================
async function main() {
  const counts = {
    catalog_ux: await authorCatalogUX(),
  };
  console.log("\n== SUMMARY ==");
  console.log(JSON.stringify(counts, null, 2));
  console.log("\nUI links:");
  console.log(`  https://tests.semantius.app/domain_map/domains?id=eq.${DOMAIN_ID}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
