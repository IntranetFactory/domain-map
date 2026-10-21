#!/usr/bin/env bun
// 2026-06-07 CLIN-DEV state-driven Validate execute (SKILL.md Rule #21, bulk batch).
// Additive/corrective only; everything lands record_status='new' (or PATCH of empty/default fields).
// Idempotent: re-reads live before every write and skips work already done.
//
// CLIN-DEV (domain id 50) is UNBUILT: 0 domain_modules, 0 capability_domains.
// Per the UNBUILT clause we do NOT scaffold modules/capabilities/lifecycle; the build cascade
// (B1A-BUILD / B1B-S1..S10 / B1B-M8) is surfaced, not executed.
//
// Scope (EXECUTE-classified items from audits/CLIN-DEV/state.yaml):
//   1. B13 entity_type : classify all 7 CLIN-DEV masters (entity_type unclassified -> Rule #12 enum)
//   2. Catalog UX (#20): author EMPTY domain.catalog_tagline / catalog_description (domain 50).
//                        Module-grain (B1B-M8) is N/A: 0 modules.
//
// NOT touched here (surfaced to user, or blocked on build, or backlog):
//   - B2-S1 em-dash on business_logic (destructive overwrite)
//   - B2-S2 module split, B2-S3 owner repoint, B2-S4 pattern flags, B2-S5 scope, B2-S6 payload,
//     B2-S11b handoff-894 PCF pick (all b2 decisions)
//   - B1A-S5b master-to-users edges (inverse_verb already models the master-side view; surfaced)
//   - B1A-S11c handoffs 896/897 (no clean cross-industry PCF; defer to Discover)
//   - B1A-S3 Phase A solutions/vendors (part of the build of an unbuilt domain)
//   - All b1b (blocked on B1B-S1 module build) and all b3 (backlog)

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
// 610 medical_devices                operational_workflow : received -> commissioned -> in_service -> out_of_service -> decommissioned
// 611 device_maintenance_logs        operational_record   : preventive/corrective maintenance records, regulatory audit trail (ledger)
// 612 device_recalls                 operational_workflow : issued -> assessing -> isolating -> remediating -> closed
// 613 clinical_engineering_work_orders operational_workflow : open -> dispatched -> in_progress -> completed -> closed
// 614 device_calibration_records     operational_workflow : scheduled -> performed -> passed/failed -> filed (pass/fail gate)
// 615 device_incident_reports        operational_workflow : drafted -> reported_internal -> reported_to_regulator -> investigating -> resolved
// 616 sterilization_cycles           operational_workflow : queued -> running -> completed -> validated/failed -> released
const entityTypes: { id: number; name: string; entity_type: string }[] = [
  { id: 610, name: "medical_devices", entity_type: "operational_workflow" },
  { id: 611, name: "device_maintenance_logs", entity_type: "operational_record" },
  { id: 612, name: "device_recalls", entity_type: "operational_workflow" },
  { id: 613, name: "clinical_engineering_work_orders", entity_type: "operational_workflow" },
  { id: 614, name: "device_calibration_records", entity_type: "operational_workflow" },
  { id: 615, name: "device_incident_reports", entity_type: "operational_workflow" },
  { id: 616, name: "sterilization_cycles", entity_type: "operational_workflow" },
];

async function classifyEntityTypes() {
  console.log("\n== 1. entity_type classification (B13, Rule #12) ==");
  const live = await get(
    "/data_objects?id=in.(610,611,612,613,614,615,616)&select=id,entity_type",
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
    "Keep every medical device safe, maintained, and ready for patient care.",
  catalog_description:
    "Run one trustworthy register of the medical equipment in clinical use, from infusion pumps and ventilators to monitors and imaging systems. Schedule and prove preventive maintenance, manage calibration, and validate sterilization so equipment stays accurate and safe at the bedside. When a recall or adverse event hits, isolate affected units fast, drive the response to closure, and produce the evidence accreditors and regulators expect. Clinical engineering teams cut downtime, stay inspection-ready, and protect patients without drowning in paperwork.",
};

async function authorCatalogUX() {
  console.log("\n== 2. Catalog UX (Rule #20), domain 50 ==");
  let n = 0;
  const [dom] = await get(
    "/domains?id=eq.50&select=catalog_tagline,catalog_description",
  );
  const body: Row = {};
  if (!String(dom?.catalog_tagline ?? "").trim()) body.catalog_tagline = domainCopy.catalog_tagline;
  if (!String(dom?.catalog_description ?? "").trim()) body.catalog_description = domainCopy.catalog_description;
  if (Object.keys(body).length) {
    await patch("/domains?id=eq.50", body);
    console.log(`  domain 50: wrote ${Object.keys(body).join(", ")}`);
    n++;
  } else {
    console.log("  domain 50: already populated, skip");
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
  console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(610,611,612,613,614,615,616)");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.50");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
