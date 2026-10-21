#!/usr/bin/env bun
// 2026-06-07 ESG state-driven Validate execute (SKILL.md Rule #21, bulk batch).
// Additive/corrective only; everything lands record_status='new' (or PATCH of empty/NULL fields).
// Idempotent: re-reads live before every write and skips work already done.
//
// ESG (domain 21) is UNBUILT (0 domain_modules, 0 capability_domains). Per the prompt's
// LEAVE rule, the build and its cascade (B1A-BUILD, B1B-S2/S4/S5/S10/S12/S13, module-grain
// lifecycle, module FK backfills, legacy esg-system skill DELETE) are SURFACED, not executed.
// Per-module skill-grain items are RETIRED (supersession header, Plan 3). Only build-independent
// additive/corrective items that operate on the 9 existing masters run here:
//   1. entity_type (Rule #12 / B13) : classify 9 ESG masters (unclassified -> enum)
//   2. Catalog UX (Rule #20)        : author empty catalog_tagline/description on domain 21
//   3. B1A-S11 (B11)                : insert generic synonym data_object_aliases for 9 masters
//   4. B1A-S6 (B6)                  : insert 8 intra-domain data_object_relationships edges
//
// NOT executed (surfaced/left): B1A-M1..M5, B1A-U1..U4 (new entities routed to non-existent
// modules; part of the build); B1A-S7 (users-edges, Rule #10 modeling tier - left with B1A-BUILD);
// B1A-S8 (cross-domain edges - target endpoints risk_registers/regulatory_policies/
// tprm_supplier_risk_records DO NOT EXIST in the catalog, and the activity_data edge is blocked
// on B2-5); all b2; all b1b (blocked); all b3.
//
// C1 (business_function_domains) already populated (owner 115 + Finance contributor 116): skip.
// H1 (APQC handoff_processes) already fully tagged on all 9 ESG handoffs (closed 2026-05-31): skip.
// A3 (solution_domains) passes (7 solutions); SCOPE DISCIPLINE forbids new vendors/solutions: skip.

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

const MASTER_IDS = [321, 322, 323, 324, 325, 326, 327, 328, 329];
const inList = MASTER_IDS.join(",");

// ============================================================
// 1. entity_type classification (Rule #12 / B13)
// ============================================================
// 321 emissions_records        operational_record   : physical fact, timestamped GHG record
// 322 emission_factors         catalog              : reference lookup (IPCC/EPA/Defra), versioned
// 323 activity_data_records    operational_record   : raw operational input metric
// 324 esg_targets              operational_workflow : proposed -> approved -> active -> achieved/missed
// 325 esg_metrics              computed             : derived KPI roll-up, reporting-cycle refresh
// 326 esg_disclosures          operational_workflow : draft -> submitted_for_assurance -> assured -> filed
// 327 supplier_esg_assessments operational_workflow : requested -> in_progress -> scored -> recertified
// 328 facility_emissions       operational_workflow : open -> locked -> filed (period close)
// 329 esg_initiatives          operational_workflow : planned -> launched -> in_progress -> completed
const entityTypes: { id: number; name: string; entity_type: string }[] = [
  { id: 321, name: "emissions_records", entity_type: "operational_record" },
  { id: 322, name: "emission_factors", entity_type: "catalog" },
  { id: 323, name: "activity_data_records", entity_type: "operational_record" },
  { id: 324, name: "esg_targets", entity_type: "operational_workflow" },
  { id: 325, name: "esg_metrics", entity_type: "computed" },
  { id: 326, name: "esg_disclosures", entity_type: "operational_workflow" },
  { id: 327, name: "supplier_esg_assessments", entity_type: "operational_workflow" },
  { id: 328, name: "facility_emissions", entity_type: "operational_workflow" },
  { id: 329, name: "esg_initiatives", entity_type: "operational_workflow" },
];

async function classifyEntityTypes() {
  console.log("\n== 1. entity_type classification (Rule #12) ==");
  const live = await get(`/data_objects?id=in.(${inList})&select=id,entity_type`);
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
// 2. Catalog UX (Rule #20) - only writes EMPTY fields, never overwrites
// ============================================================
// Buyer voice, workflow + value. No vendor/product names (Rule #18). Statutory frameworks
// (CSRD, GHG Protocol, ISSB) are allowed in description text. No em-dash; American English.
const domainCopy = {
  catalog_tagline: "Measure your footprint, hit your targets, and report with confidence.",
  catalog_description:
    "Turn raw operational data into a defensible sustainability record. Pull in activity data and utility readings, apply the right emission factors, and calculate Scope 1, 2, and 3 emissions down to the facility. Set reduction and net-zero targets, track them against live metrics, and run the initiatives that close the gap. When reporting season arrives, prepare disclosures to each framework you answer to, from CSRD and ISSB to GHG Protocol, keep the audit trail your assurance provider needs, and score the suppliers that drive your value-chain footprint. One place to manage the numbers, the commitments, and the evidence behind every claim you publish.",
};

async function authorCatalogUX() {
  console.log("\n== 2. Catalog UX (Rule #20) ==");
  let n = 0;
  const [dom] = await get("/domains?id=eq.21&select=catalog_tagline,catalog_description");
  const dBody: Row = {};
  if (!String(dom?.catalog_tagline ?? "").trim()) dBody.catalog_tagline = domainCopy.catalog_tagline;
  if (!String(dom?.catalog_description ?? "").trim())
    dBody.catalog_description = domainCopy.catalog_description;
  if (Object.keys(dBody).length) {
    await patch("/domains?id=eq.21", dBody);
    console.log(`  domain 21: wrote ${Object.keys(dBody).join(", ")}`);
    n++;
  } else {
    console.log("  domain 21: already populated, skip");
  }
  // No domain_modules on ESG (unbuilt): module-level catalog UX is N/A this pass.
  console.log(`  catalog UX rows updated: ${n}`);
  return n;
}

// ============================================================
// 3. data_object_aliases generic synonyms (B1A-S11 / B11)
// ============================================================
// Generic, cross-vendor synonyms + statutory framework terms only (Rule #18: aliases may
// carry generic synonyms; statutory frameworks like GHG Protocol / CSRD are allowed).
// NO vendor product names.
const aliases: { data_object_id: number; master: string; alias_name: string }[] = [
  { data_object_id: 321, master: "emissions_records", alias_name: "GHG Records" },
  { data_object_id: 321, master: "emissions_records", alias_name: "Carbon Emissions" },
  { data_object_id: 321, master: "emissions_records", alias_name: "Scope 1+2+3 Records" },
  { data_object_id: 322, master: "emission_factors", alias_name: "Emission Coefficients" },
  { data_object_id: 322, master: "emission_factors", alias_name: "Carbon Factors" },
  { data_object_id: 323, master: "activity_data_records", alias_name: "Activity Data" },
  { data_object_id: 323, master: "activity_data_records", alias_name: "Consumption Data" },
  { data_object_id: 324, master: "esg_targets", alias_name: "Sustainability Targets" },
  { data_object_id: 324, master: "esg_targets", alias_name: "Emission Reduction Goals" },
  { data_object_id: 324, master: "esg_targets", alias_name: "Net Zero Commitments" },
  { data_object_id: 325, master: "esg_metrics", alias_name: "Sustainability KPIs" },
  { data_object_id: 325, master: "esg_metrics", alias_name: "ESG Indicators" },
  { data_object_id: 326, master: "esg_disclosures", alias_name: "Sustainability Reports" },
  { data_object_id: 326, master: "esg_disclosures", alias_name: "CSRD Reports" },
  { data_object_id: 326, master: "esg_disclosures", alias_name: "Climate Disclosures" },
  { data_object_id: 327, master: "supplier_esg_assessments", alias_name: "Supplier Sustainability Scores" },
  { data_object_id: 327, master: "supplier_esg_assessments", alias_name: "Vendor ESG Ratings" },
  { data_object_id: 328, master: "facility_emissions", alias_name: "Site Emissions" },
  { data_object_id: 328, master: "facility_emissions", alias_name: "Facility Carbon Inventory" },
  { data_object_id: 329, master: "esg_initiatives", alias_name: "Sustainability Programs" },
  { data_object_id: 329, master: "esg_initiatives", alias_name: "Decarbonization Projects" },
];

async function insertAliases() {
  console.log("\n== 3. data_object_aliases (B1A-S11) ==");
  const existing = await get(
    `/data_object_aliases?data_object_id=in.(${inList})&select=data_object_id,alias_name`,
  );
  const seen = new Set(
    existing.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`),
  );
  const toInsert = aliases
    .filter(a => !seen.has(`${a.data_object_id}|${a.alias_name.toLowerCase()}`))
    .map(a => ({
      data_object_id: a.data_object_id,
      alias_name: a.alias_name,
      alias_type: "synonym",
      is_preferred: false,
    }));
  if (toInsert.length) {
    await post("/data_object_aliases", toInsert);
    for (const a of toInsert) console.log(`  +${a.alias_name} -> do ${a.data_object_id}`);
  } else {
    console.log("  all aliases already present, nothing to insert");
  }
  console.log(`  aliases inserted: ${toInsert.length}`);
  return toInsert.length;
}

// ============================================================
// 4. intra-domain data_object_relationships (B1A-S6 / B6)
// ============================================================
// 8 edges between the 9 ESG masters, exactly per the B1A-S6 finding verbs.
// relationship_kind in (composition, reference, association, inheritance);
// relationship_type in (one_to_one, one_to_many, many_to_many); owner_side in (source, target).
const intraRels: {
  data_object_id: number;
  related_data_object_id: number;
  relationship_verb: string;
  inverse_verb: string;
  relationship_type: string;
  relationship_kind: string;
  is_required: boolean;
  owner_side: string;
}[] = [
  { data_object_id: 322, related_data_object_id: 321, relationship_verb: "applies to", inverse_verb: "is calculated with", relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "source" },
  { data_object_id: 323, related_data_object_id: 321, relationship_verb: "sources", inverse_verb: "is derived from", relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "source" },
  { data_object_id: 328, related_data_object_id: 321, relationship_verb: "rolls up", inverse_verb: "rolls up to", relationship_type: "one_to_many", relationship_kind: "composition", is_required: false, owner_side: "source" },
  { data_object_id: 324, related_data_object_id: 325, relationship_verb: "governs", inverse_verb: "is governed by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  { data_object_id: 325, related_data_object_id: 321, relationship_verb: "summarizes", inverse_verb: "is summarized by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  { data_object_id: 326, related_data_object_id: 325, relationship_verb: "reports", inverse_verb: "is reported in", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  { data_object_id: 326, related_data_object_id: 328, relationship_verb: "reports", inverse_verb: "is reported in", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  { data_object_id: 329, related_data_object_id: 324, relationship_verb: "drives", inverse_verb: "is driven by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
];

async function insertIntraRels() {
  console.log("\n== 4. intra-domain data_object_relationships (B1A-S6) ==");
  const existing = await get(
    `/data_object_relationships?or=(data_object_id.in.(${inList}),related_data_object_id.in.(${inList}))&select=data_object_id,related_data_object_id`,
  );
  const seen = new Set(existing.map(r => `${r.data_object_id}|${r.related_data_object_id}`));
  const toInsert = intraRels.filter(
    r => !seen.has(`${r.data_object_id}|${r.related_data_object_id}`),
  );
  if (toInsert.length) {
    await post("/data_object_relationships", toInsert);
    for (const r of toInsert)
      console.log(`  +${r.data_object_id} ${r.relationship_verb} ${r.related_data_object_id}`);
  } else {
    console.log("  all intra-domain edges already present, nothing to insert");
  }
  console.log(`  intra-domain rels inserted: ${toInsert.length}`);
  return toInsert.length;
}

// ============================================================
async function main() {
  const counts = {
    entity_type: await classifyEntityTypes(),
    catalog_ux: await authorCatalogUX(),
    aliases: await insertAliases(),
    intra_rels: await insertIntraRels(),
  };
  console.log("\n== SUMMARY ==");
  console.log(JSON.stringify(counts, null, 2));
  console.log("\nUI links:");
  console.log(`  https://tests.semantius.app/domain_map/data_objects?id=in.(${inList})`);
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.21");
  console.log(`  https://tests.semantius.app/domain_map/data_object_aliases?data_object_id=in.(${inList})`);
  console.log(`  https://tests.semantius.app/domain_map/data_object_relationships?data_object_id=in.(${inList})`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
