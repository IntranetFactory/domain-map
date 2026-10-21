#!/usr/bin/env bun
// 2026-06-07 COLLAB-GOV state-driven Validate execute (SKILL.md Rule #21, bulk batch).
// Additive/corrective only; everything lands record_status='new' (or PATCH of empty fields).
// Idempotent: re-reads live before every write and skips work already done.
//
// COLLAB-GOV (domain id 127, parent 91 = ECM) is master-bearing under the overlay test
// (B1A-RECLASS settled 2026-06-02: leadership-tier exemption rescinded; masters workspace
// inventory, lifecycle policy, permission-audit and remediation records; AvePoint / ShareGate
// class) but UNBUILT: 0 domain_modules (M1 hard fail), 7 capability_domains, 0 masters,
// 0 aliases, 0 regulations. Per the UNBUILT clause we do NOT scaffold modules/masters/roles/
// skills; the build cascade (B1A-BUILD / B1B-M1 / B1B-B-BAND / B1B-E-BAND / B1B-F-BAND) is
// surfaced, not executed.
//
// Scope (EXECUTE-classified items from audits/COLLAB-GOV/state.yaml):
//   1. Catalog UX (#20): author EMPTY domain.catalog_tagline / catalog_description (domain 127).
//                        Drafts from history.md B1-S1; real-market buyer voice (B1A-RECLASS settled
//                        master-bearing, so the leadership-tier "signal layer" voice pivot is moot).
//                        Module-grain is N/A: 0 modules. (was B1B-S1 / B2-2 stale "surface" gate.)
//   2. Aliases (B11): INSERT the 3 clearly-generic, non-vendor synonyms into domain_aliases.
//                     (B2-8's 4 vendor/product-named candidates surfaced, not loaded -> Rule #18 caution.)
//
// NOT touched here (surfaced to user, blocked on build, retired, or backlog):
//   - B1A-RECLASS (settled note: master-bearing), B1A-BUILD (build of an unbuilt domain)
//   - B1B-M1 / B1B-B-BAND / B1B-E-BAND / B1B-F-BAND (all blocked on the build + B2-1)
//     (B1B-F-BAND also references the RETIRED per-module system-skill model, superseded 2026-06-06)
//   - C1 already satisfied live: business_function_domains has owner (End-User Computing 59) +
//     contributor (Security 28); no insert. The owner<->contributor flip is B2-3 (destructive, surfaced).
//   - entity_type PATCH: N/A (0 masters). APQC H1: N/A (0 handoffs).
//   - b2: B2-1 (classification), B2-3 (BF flip), B2-4 (regulations), B2-5 (modularization),
//         B2-6 (SAAS-BACKUP), B2-7 (TENANT-MIGRATION), B2-8 vendor-named alias subset.
//   - b3: all 8 candidate master groups (backlog, gated on B2-1 real-market route).

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
const insert = (path: string, rows: Row[]) => call({ method: "POST", path, body: rows });

const DOMAIN_ID = 127;

// ============================================================
// 1. Catalog UX (Rule #20) - only writes EMPTY fields, never overwrites.
// Buyer voice (workflow + value); no vendor names; no em-dash; American English.
// Drafts carried verbatim from audits/COLLAB-GOV/history.md B1-S1 (2026-05-30).
// ============================================================
const domainCopy = {
  catalog_tagline:
    "Inventory every workspace, enforce sharing policies, and clean up sprawl across your collaboration tenant.",
  catalog_description:
    "Discover every team site, channel, file-sync drive, and group container in your collaboration tenant. Run permission audits and external-share reviews on a schedule, archive workspaces that have gone stale, and automate provisioning so new workspaces ship with the right ownership and retention policy from day one. Catch oversharing before it becomes a data incident, surface broken or duplicated permission inheritance, and give business owners a path to attest to access without an IT ticket.",
};

async function authorCatalogUX() {
  console.log("\n== 1. Catalog UX (Rule #20), domain 127 ==");
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
// 2. Aliases (B11): INSERT clearly-generic, non-vendor synonyms only.
// No industry_id available -> alias_type='synonym'. record_status omitted (defaults 'new').
// Rule #15: never write the 'notes' column. Rule #18: keep vendor/product names out -> the
// 4 product-named B2-8 candidates (microsoft 365 governance, m365 management, sharepoint
// governance, teams governance) are SURFACED, not loaded here.
// Idempotent against lower(alias) per domain.
// ============================================================
const aliasList = [
  "tenant administration",
  "workspace governance",
  "collaboration sprawl management",
];

async function authorAliases() {
  console.log("\n== 2. Aliases (B11), domain 127 ==");
  const live = await get(
    `/domain_aliases?domain_id=eq.${DOMAIN_ID}&select=id,alias`,
  );
  const have = new Set(live.map(r => String(r.alias).trim().toLowerCase()));
  const missing = aliasList.filter(a => !have.has(a.trim().toLowerCase()));
  if (missing.length === 0) {
    console.log(`  all ${aliasList.length} aliases already present, nothing to insert`);
    return 0;
  }
  const rows = missing.map(a => ({
    domain_id: DOMAIN_ID,
    alias: a,
    alias_type: "synonym",
  }));
  await insert("/domain_aliases", rows);
  for (const a of missing) console.log(`  insert alias: ${a}`);
  console.log(`  aliases inserted: ${missing.length}`);
  return missing.length;
}

// ============================================================
async function main() {
  const counts = {
    catalog_ux: await authorCatalogUX(),
    aliases: await authorAliases(),
  };
  console.log("\n== SUMMARY ==");
  console.log(JSON.stringify(counts, null, 2));
  console.log("\nUI links:");
  console.log(`  https://tests.semantius.app/domain_map/domains?id=eq.${DOMAIN_ID}`);
  console.log(`  https://tests.semantius.app/domain_map/domain_aliases?domain_id=eq.${DOMAIN_ID}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
