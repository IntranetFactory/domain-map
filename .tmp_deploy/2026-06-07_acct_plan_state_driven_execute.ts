#!/usr/bin/env bun
// 2026-06-07 ACCT-PLAN state-driven Validate execute (SKILL.md Rule #21, bulk batch).
// Additive/corrective only; everything lands record_status='new' (or PATCH of empty fields).
// Idempotent: re-reads live before every write and skips work already done.
//
// ACCT-PLAN (domain id 105) is master-bearing (overlay test: it persists real account_plans,
// mutual_action_plans, relationship_maps, white_space_maps) but UNBUILT: 0 domain_modules
// (M1 hard fail), 7 capability_domains, 0 masters. Per the UNBUILT clause we do NOT scaffold
// modules/masters/roles/skills; the build cascade (B1A-BUILD / B1B-M1 / B1B-V1..V7 / B1B-S1)
// is surfaced, not executed.
//
// Scope (EXECUTE-classified items from audits/ACCT-PLAN/state.yaml):
//   1. Catalog UX (#20): author EMPTY domain.catalog_tagline / catalog_description (domain 105).
//                        Module-grain is N/A: 0 modules. (was B1B-A1-PATCH stale "surface" gate)
//   2. Aliases (B11 / B2-A1): INSERT the 4 clearly-enumerated generic synonyms into domain_aliases.
//
// NOT touched here (surfaced to user, blocked on build, retired, or backlog):
//   - B1A-RECLASS (settled note: master-bearing), B1A-BUILD (build of an unbuilt domain)
//   - B1B-M1-MODULES, B1B-V1..V7 (masters), B1B-S1-B10B-BACKFILL (all blocked on the build + b2)
//   - B1B-H1-209: APQC gap already CLOSED live (handoff_processes id 1073, process 148, agent_curated).
//                 The state's proposed 717 would REPLACE the existing weak tag -> destructive, surfaced.
//   - b2: B2-L1, B2-M1, B2-T1, B2-D1, B2-K1, B2-C1, B2-E1, B2-V1 (judgment / destructive)
//   - b3: all 7 candidates (backlog)

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

const DOMAIN_ID = 105;

// ============================================================
// 1. Catalog UX (Rule #20) - only writes EMPTY fields, never overwrites.
// Buyer voice (workflow + value); no vendor names; no em-dash; American English.
// ============================================================
const domainCopy = {
  catalog_tagline:
    "Plan, run, and review your strategic accounts the way the best account teams do: map relationships, find white space, write joint plans, and close on QBR commitments.",
  catalog_description:
    "Give account teams a structured surface to plan against named key accounts: who decides, who buys today, and where the next opportunity sits. Relationship maps make the org chart and the political reality visible. White-space maps show every product an account has not bought yet on a per-business-unit grid. Account plans hold the named objectives and strategies the team will pursue this year, with a clean version history. Mutual action plans extend the plan to the buyer with shared milestones, owned roles on either side, and signed acknowledgements as work progresses. Quarterly business review templates and meeting workflows close the loop on every review: actions logged, commitments tracked, and last quarter's promises checked against this quarter's progress. Health and growth metrics roll up across the portfolio, key-account team assignments make staffing legible, white space identified by the planning workflow flows to sales engagement, and account-health decline flows to customer success. Built to sit on top of your CRM and customer-success systems rather than replace them.",
};

async function authorCatalogUX() {
  console.log("\n== 1. Catalog UX (Rule #20), domain 105 ==");
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
// 2. Aliases (B11 / B2-A1): INSERT clearly-enumerated generic synonyms.
// No industry_id available -> alias_type='synonym'. record_status omitted (defaults 'new').
// Rule #15: never write the 'notes' column.
// Idempotent against lower(alias) per domain.
// ============================================================
const aliasList = [
  "KAM",
  "key account management",
  "strategic account management",
  "account planning",
];

async function authorAliases() {
  console.log("\n== 2. Aliases (B11 / B2-A1), domain 105 ==");
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
