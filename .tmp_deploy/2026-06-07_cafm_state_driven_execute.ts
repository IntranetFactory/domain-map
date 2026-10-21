#!/usr/bin/env bun
// 2026-06-07 CAFM state-driven Validate execute (SKILL.md Rule #21, bulk batch).
// Additive/corrective only; everything lands record_status='new' (or PATCH of empty fields).
// Idempotent: re-reads live before every write and skips work already done.
//
// CAFM (domain id 142, parent REAL-EST 141) is the SMB / light-tier sibling of IWMS (23).
// It is UNBUILT: 0 domain_modules (M1 hard fail), 3 capability_domains (374/376/377, all shared
// with IWMS + REAL-EST), 0 masters, 0 business_function_domains, 0 handoffs, 0 skills, 0 roles.
// Per the UNBUILT clause we do NOT scaffold modules/masters/roles/skills; the build cascade
// (B1A-BUILD / B1B-S1..S8 / B1B-M1) is surfaced, not executed, and is gated on the open b2
// existential decision B2-FOLD-VS-DISTINCT (keep CAFM distinct vs fold into IWMS).
//
// Scope (EXECUTE-classified items from audits/CAFM/state.yaml):
//   1. Catalog UX (#20): author EMPTY domain.catalog_tagline / catalog_description (domain 142).
//      (was B1B-S2, whose stale "surface-before-write" gate is ignored per Rule #21.)
//      Module-grain is N/A: 0 modules.
//
// NOT touched here (surfaced to user, blocked on build, retired, or backlog):
//   - B1A-BUILD / B1B-S1 (author modules): UNBUILT build, gated on b2 B2-FOLD-VS-DISTINCT.
//   - B1B-S3 (BFD owner FACILITIES + IT/HR contributors): blocked_by B2-FOLD-VS-DISTINCT
//     (if folded, IWMS owns the BFD). Not executed.
//   - B1B-S4..S8, B1B-M1: all gated transitively on B1B-S1 (modules must exist) + b2.
//   - B1B-S5 references the RETIRED per-module system-skill grain (superseded 2026-06-06):
//     reframed as a note, not executed.
//   - b2: B2-FOLD-VS-DISTINCT, B2-CAPABILITY-RENAME, B2-CERT-REQUIRED,
//     B2-MIN-ORG-SIZE-CROSSCHECK, B2-COST-BAND-CROSSCHECK, B2-LEASE-UTIL-OWNERSHIP.
//   - b3: B3-DESK-CHECKINS, B3-SPACE-CATEGORIES (backlog).

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

const DOMAIN_ID = 142;

// ============================================================
// 1. Catalog UX (Rule #20) - only writes EMPTY fields, never overwrites.
// Buyer voice (workflow + value); no vendor names; no em-dash; American English.
// Anchored on the domain's own description: light-tier / SMB facilities management
// (desk booking, simple space allocation, maintenance ticketing, visitor management),
// deliberately lighter than the enterprise IWMS tier.
// ============================================================
const domainCopy = {
  catalog_tagline:
    "Run a smaller building without the enterprise overhead: book desks, reserve rooms, log fix-it tickets, and sign in visitors from one place.",
  catalog_description:
    "Give a lean facilities team the everyday tools to keep a workplace running without standing up a heavy enterprise platform. Employees book a desk or reserve a meeting room from a simple floor map, so people know where to sit and rooms stop double-booking. When something breaks, anyone can raise a maintenance ticket and watch it move from reported to scheduled to fixed, with the work tracked against the right space. Front-desk staff register visitors, print badges, and keep a clean record of who was on site and when. Space allocation stays light: see how desks and rooms are assigned, spot the floors that are crowded or empty, and right-size the layout from occupancy trends rather than guesswork. This is the mid-market and small-business tier of workplace management, focused on reservations and basic service workflow, and intentionally lighter on utility metering and lease accounting than a full enterprise workplace suite. It is built to get a single site or a small portfolio organized fast, then grow into deeper space and real-estate tooling if the need arrives.",
};

async function authorCatalogUX() {
  console.log("\n== 1. Catalog UX (Rule #20), domain 142 ==");
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
