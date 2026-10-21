#!/usr/bin/env bun
// 2026-06-07 PRM state-driven Validate execute (SKILL.md Rule #21, bulk batch).
// Additive/corrective only; the single write here is a PATCH of EMPTY description-class fields.
// Idempotent: re-reads live before the write and skips any field already populated.
//
// PRM (domain id 96, parent 69 = CRM) is master-bearing under the overlay test
// (partner deal registrations, MDF requests/claims, partner scorecards are real persisted
// records) but UNBUILT: 0 domain_modules (M1 hard fail), 0 capability_domains, 0 masters,
// 0 solution_domains. Per the UNBUILT clause we do NOT scaffold modules/masters/caps/solutions/
// roles/skills; the entire build cascade (B1A-BUILD / B1B-A2 business_logic / B1B-A3 caps /
// B1B-A4 solutions / B1B-M1 modules / B1B-V1..V4 masters / B1B-H1..H2 handoff FK backfill) is
// SURFACED or LEFT, never executed.
//
// Scope (the ONE EXECUTE-classified item from audits/PRM/state.yaml):
//   1. Catalog UX (Rule #20, A4): author EMPTY domains.catalog_tagline / catalog_description
//      on domain 96. This was B1B-A1, whose state blocked_by:user_decision is exactly the
//      stale "surface-before-write" gate Rule #20 / Rule #21 / the charter tell us to ignore.
//      Module-grain (M8) is N/A: 0 modules.
//
// NOT touched here (surfaced, blocked on the build, or backlog):
//   - B1A-BUILD: build of an unbuilt domain (surfaced).
//   - B1B-A2 (business_logic): Rule #8 description-class field, genuinely user-wording-gated;
//      not a Rule #20 catalog UX field, so out of the catalog-UX EXECUTE clause. Part of build.
//   - B1B-A3 (caps), B1B-A4 (solutions Phase-A market shape), B1B-M1 (modules),
//      B1B-V1..V4 (masters), B1B-H1/H2 (source_domain_module_id backfill): all blocked on the
//      build + the four b2 carve-outs; H1/H2 cannot resolve (target module does not exist).
//   - B1B-APQC-211-212: ALREADY CLOSED live. handoff_processes carries (211,151) and (212,151),
//      both proposal_source='agent_curated', record_status='new' (the partner-anchored option).
//      No clean single PCF match for an additive second tag (147 vs 151 fork is genuine), so
//      nothing to insert. Confirmed live this pass.
//   - b2: B2-M1, B2-R1, B2-T1, B2-T2, B2-S1, B2-S2 (judgment / splits).
//   - b3: B3-1..B3-4 (candidate-domain backlog).

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

const DOMAIN_ID = 96;

// ============================================================
// 1. Catalog UX (Rule #20) - only writes EMPTY fields, never overwrites.
// Buyer voice (workflow + value); no vendor names; no em-dash; American English.
// ============================================================
const domainCopy = {
  catalog_tagline:
    "Run your channel program end to end: recruit and tier partners, register and protect joint deals, fund partner-led marketing, and score partner performance against revenue and growth targets.",
  catalog_description:
    "Partner Relationship Management runs the indirect-revenue motion on one surface. Onboard channel partners into tiered programs, give them a branded portal with role-based access, and operate the day-to-day workflows that hold a channel program together. Register and protect joint deals with conflict resolution when two partners chase the same prospect. Fund partner-led marketing through market development requests and claims with proof of spend, plus co-op fund accrual. Enroll partners in training and track certifications so the right partners stay enabled. Score every partner each quarter on revenue, growth, certification compliance, and fund utilization, then run quarterly business reviews against a shared joint plan. Track partner-influenced pipeline and surface co-sell signals so the team knows where a partner already has the account. Built for channel and partner teams, with clean handoffs to marketing for through-channel campaigns, to finance for fund settlement and partner-channel commissions, and to your CRM for registered opportunities and qualified partner referrals.",
};

async function authorCatalogUX() {
  console.log("\n== 1. Catalog UX (Rule #20), domain 96 ==");
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
