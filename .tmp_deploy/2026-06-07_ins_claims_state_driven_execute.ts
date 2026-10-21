#!/usr/bin/env bun
// 2026-06-07 INS-CLAIMS state-driven Validate execute (SKILL.md Rule #21, bulk batch).
// Additive/corrective only; everything lands record_status='new' (or PATCH of empty/default fields).
// Idempotent: re-reads live before every write and skips work already done.
//
// INS-CLAIMS (domain id 44) is UNBUILT: 0 domain_modules (M1 hard fail), 0 capability_domains.
// Per the UNBUILT clause we do NOT scaffold modules/capabilities/lifecycle; the build cascade
// (B1A-BUILD / B1B-M1 / B1B-A2 / B1B-B12 etc.) is surfaced, not executed.
//
// Scope (EXECUTE-classified items from audits/INS-CLAIMS/state.yaml):
//   1. B13 entity_type : classify all 10 INS-CLAIMS masters (entity_type unclassified -> Rule #12 enum)
//   2. Catalog UX (#20): author EMPTY domain.catalog_tagline / catalog_description (domain 44).
//                        Module-grain is N/A: 0 modules.
//
// NOT touched here (surfaced to user, blocked on build, or backlog):
//   - B1A-BUILD / B1B-M1 / B1B-A2 (build of an unbuilt domain: modules, capabilities)
//   - B1A-A3 missing flagship solutions (Phase A build of an unbuilt domain)
//   - B2-MOD-SPLIT, B2-POLICY-ADMIN-SCOPE, B2-FUNC-RACI, B2-REG-SCOPE, B2-APQC-STRATEGY,
//     B2-LFC-EXEMPT, B2-B12-VERBS, B2-A4-COPY, B2-B11-TUPLES (b2 decisions)
//   - B1B-* (all blocked on B1B-M1 module build, or owed by other domains: CSM/ERP-FIN/GRC/TELEMATICS)
//   - B1B-F1-F7-SKILL-RETIRE (retired per per-domain-skill supersession 2026-06-06; reframed as note)
//   - All b3 candidates (backlog)

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

// ============================================================
// 1. entity_type classification (B13, Rule #12)
// ============================================================
// 623 insurance_claims            operational_workflow : open -> in-investigation -> settled -> closed/litigated (explicit status lifecycle)
// 624 insurance_policies          operational_workflow : quoted -> bound -> in force -> lapsed/cancelled/reinstated/expired
// 625 policy_coverages            catalog              : coverage-line reference data within a policy; no workflow
// 626 loss_incidents              operational_record   : FNOL occurrence record (recorder pattern; no required lifecycle gate)
// 627 claim_adjuster_assignments  operational_record   : allocation/workload record driving analytics (no workflow)
// 628 claim_settlements           operational_workflow : drafted -> pending approval -> approved/rejected -> issued
// 629 claim_payments              operational_workflow : pending -> issued -> voided -> reissued
// 630 salvage_recovery_records    operational_record   : recovery ledger entry (recorder pattern; no workflow)
// 631 subrogation_cases           operational_workflow : open -> in recovery -> recovered -> closed unrecovered
// 632 siu_cases                   operational_workflow : open -> investigating -> substantiated/unsubstantiated -> referred -> closed
const entityTypes: { id: number; name: string; entity_type: string }[] = [
  { id: 623, name: "insurance_claims", entity_type: "operational_workflow" },
  { id: 624, name: "insurance_policies", entity_type: "operational_workflow" },
  { id: 625, name: "policy_coverages", entity_type: "catalog" },
  { id: 626, name: "loss_incidents", entity_type: "operational_record" },
  { id: 627, name: "claim_adjuster_assignments", entity_type: "operational_record" },
  { id: 628, name: "claim_settlements", entity_type: "operational_workflow" },
  { id: 629, name: "claim_payments", entity_type: "operational_workflow" },
  { id: 630, name: "salvage_recovery_records", entity_type: "operational_record" },
  { id: 631, name: "subrogation_cases", entity_type: "operational_workflow" },
  { id: 632, name: "siu_cases", entity_type: "operational_workflow" },
];

async function classifyEntityTypes() {
  console.log("\n== 1. entity_type classification (B13, Rule #12) ==");
  const live = await get(
    "/data_objects?id=in.(623,624,625,626,627,628,629,630,631,632)&select=id,entity_type",
  );
  const cur = new Map(live.map(r => [Number(r.id), String(r.entity_type ?? "")]));
  let n = 0;
  for (const e of entityTypes) {
    const c = cur.get(e.id);
    if (c && c !== "unclassified") {
      console.log(`  skip ${e.name}: already '${c}'`);
      continue;
    }
    await patch(`/data_objects?id=eq.${e.id}`, { entity_type: e.entity_type });
    console.log(`  set  ${e.name} -> ${e.entity_type}`);
    n++;
  }
  console.log(`  entity_type updated: ${n}`);
  return n;
}

// ============================================================
// 2. Catalog UX (Rule #20) - only writes EMPTY fields, never overwrites.
// Buyer voice (workflow + value); no vendor names; no em-dash; American English.
// ============================================================
const domainCopy = {
  catalog_tagline:
    "Take every claim from first notice of loss through settlement, payment, and recovery in one place.",
  catalog_description:
    "Handle the whole claim from the moment a loss is reported. Capture first notice of loss, verify coverage against the policy, assign the right adjuster, and keep the case file complete as the investigation unfolds. Set and adjust reserves, adjudicate the coverage decision, agree the settlement, and disburse payment with a clean audit trail at every step. Screen for fraud early, open a special investigation when the indicators warrant it, and pursue subrogation and salvage to recover what is owed. Claims teams cut cycle time and leakage, treat claimants fairly and consistently, and stay ready for state and federal claims-handling scrutiny.",
};

async function authorCatalogUX() {
  console.log("\n== 2. Catalog UX (Rule #20), domain 44 ==");
  let n = 0;
  const [dom] = await get(
    "/domains?id=eq.44&select=catalog_tagline,catalog_description",
  );
  const body: Row = {};
  if (!String(dom?.catalog_tagline ?? "").trim()) body.catalog_tagline = domainCopy.catalog_tagline;
  if (!String(dom?.catalog_description ?? "").trim()) body.catalog_description = domainCopy.catalog_description;
  if (Object.keys(body).length) {
    await patch("/domains?id=eq.44", body);
    console.log(`  domain 44: wrote ${Object.keys(body).join(", ")}`);
    n++;
  } else {
    console.log("  domain 44: already populated, skip");
  }
  console.log(`  catalog UX rows updated: ${n}`);
  return n;
}

// ============================================================
async function main() {
  const counts = {
    entity_type: await classifyEntityTypes(),
    catalog_ux: await authorCatalogUX(),
  };
  console.log("\n== SUMMARY ==");
  console.log(JSON.stringify(counts, null, 2));
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(623,624,625,626,627,628,629,630,631,632)");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.44");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
