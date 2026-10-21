#!/usr/bin/env bun
// 2026-06-07 DAIRY-MGMT state-driven Validate execute (SKILL.md Rule #21, bulk batch).
// Additive/corrective only; everything lands record_status='new' (or PATCH of empty/NULL fields).
// Idempotent: re-reads live before every write and skips work already done.
//
// DAIRY-MGMT (domain id 156) is modularized: 4 full modules
//   227 DAIRY-MGMT-HERD, 228 DAIRY-MGMT-PARLOR, 229 DAIRY-MGMT-MILK-QUALITY, 230 DAIRY-MGMT-FEED.
// 8 domain-owned masters (499-506). Aliases (B1A-S7) and source_domain_module_id (B1A-B10B)
// already landed 2026-06-05; not re-touched here.
//
// Scope (EXECUTE-classified):
//   1. entity_type      : classify 8 DAIRY-MGMT masters (unclassified -> Rule #12 enum)
//   2. Catalog UX (#20) : author empty catalog_tagline/description on domain 156 + modules 227-230
//   3. B1B-S6 handoff   : insert the missing dairy_cow.lifecycle_changed -> ERP-FIN handoff
//
// NOT touched here (surfaced / left):
//   - all b2 (B2-3..B2-8 user decisions), B1A-S11 (lactation users-edge verb decision)
//   - B1B-S3 (intra-domain data_object_relationships; verb/cardinality judgment, not in allow-list)
//   - B1B-S8 (lifecycle states; state-machine authoring, not in allow-list; feed_rations now
//             exempt via entity_type=catalog)
//   - B1B-B2..B5 (cross-domain mirror rels; blocked on neighbor payload-master identification)
//   - B1B-H2 / B2-8 (reviewer approval; Rule #1 - never stamp approved)
//   - b3 backlog; superseded per-module skill-grain items

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

// ============================================================
// 1. entity_type classification (Rule #12)
// ============================================================
// dairy_cows         (499) operational_workflow : heifer -> pregnant -> lactating -> dry -> culled
// lactation_records  (500) operational_workflow : open -> peak -> declining -> closed
// milkings           (501) operational_workflow : in-progress -> completed -> reconciled
// milk_quality_tests (502) operational_workflow : sampled -> submitted -> pass/fail -> appealed
// breeding_events    (503) operational_workflow : inseminated -> confirmed/failed (preg-check downstream)
// cow_health_events  (504) operational_workflow : treatment-administered -> withdrawal-active -> cleared
// feed_rations       (505) catalog              : author-once-and-supersede TMR formulation (config shape;
//                                                 settles B2-5 via the typed column, lifecycle not required)
// bulk_milk_shipments(506) operational_workflow : scheduled -> loaded -> dispatched -> accepted/rejected
const entityTypes: { id: number; name: string; entity_type: string }[] = [
  { id: 499, name: "dairy_cows", entity_type: "operational_workflow" },
  { id: 500, name: "lactation_records", entity_type: "operational_workflow" },
  { id: 501, name: "milkings", entity_type: "operational_workflow" },
  { id: 502, name: "milk_quality_tests", entity_type: "operational_workflow" },
  { id: 503, name: "breeding_events", entity_type: "operational_workflow" },
  { id: 504, name: "cow_health_events", entity_type: "operational_workflow" },
  { id: 505, name: "feed_rations", entity_type: "catalog" },
  { id: 506, name: "bulk_milk_shipments", entity_type: "operational_workflow" },
];

async function classifyEntityTypes() {
  console.log("\n== 1. entity_type classification ==");
  const live = await get(
    "/data_objects?id=in.(499,500,501,502,503,504,505,506)&select=id,entity_type",
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
// 2. Catalog UX (Rule #20) - only writes EMPTY fields, never overwrites
//    Buyer-voice (workflow + value); no vendor names; no em-dash; American English.
// ============================================================
const domainCopy = {
  catalog_tagline:
    "Run the dairy by the cow and by the tank: track every animal through her lactation, capture every milking, and keep milk quality and feed cost under control from one record.",
  catalog_description:
    "Manage the herd one cow at a time. Follow each animal through her whole working life, from heifer to first calving, through each lactation cycle, into dry-off, and on to a culling decision when the time comes. Breeding events, pregnancy results, and health treatments all hang off the individual cow record, so the next action and the withdrawal status are never a guess.\n\nCapture what the parlor and the tank produce. Pull per-session milking yields straight from the parlor or robot, roll them into each lactation, and turn finished milk into bulk shipments ready for pickup. Test the milk that leaves the farm for somatic cell count, bacteria, butterfat, protein, and antibiotic residue, and hold a shipment when a result or an active treatment says it should not ship.\n\nKeep the economics honest. Formulate total-mixed rations by group, log what actually goes in the mixer, and tie feed cost back to milk income so income-over-feed-cost is something you can see, not estimate. Quality results, treatment withdrawals, and shipment records line up to support FDA Grade A and animal-care obligations without a separate paper trail.",
};

const moduleCopy: Record<number, { catalog_tagline: string; catalog_description: string }> = {
  // 227 DAIRY-MGMT-HERD
  227: {
    catalog_tagline:
      "One record per cow, from calving through lactation, breeding, health, and the culling call.",
    catalog_description:
      "Keep a living record for every animal in the herd. Track parity, current lactation status, and pen location, and move each cow through her lifecycle as she calves, peaks, dries off, and is eventually replaced.\n\nLog the work that drives the herd forward. Record breeding events with the sire and technician, follow pregnancy checks to confirmation, and capture health incidents with their treatment and withdrawal period so a treated cow never ships milk too soon. Lactation records open with each calving and carry days-in-milk, peak yield, and the 305-day projection.\n\nThe result is a herd you can manage by exception: see which cows are open, which are due to dry off, which are under withdrawal, and which are candidates to cull, all from the same place.",
  },
  // 228 DAIRY-MGMT-PARLOR
  228: {
    catalog_tagline:
      "Capture every milking from the parlor and turn finished milk into bulk shipments ready to leave the farm.",
    catalog_description:
      "Bring parlor and robot output into one record. Capture per-cow, per-session milkings with yield, conductivity, and duration straight from parlor or automated-milking telemetry, and reconcile sessions so the day's production reconciles cow by cow.\n\nMove milk off the farm with a clean trail. Build bulk tank shipments to the processor or cooperative with pickup time, volume, grade, and hauler, so every load that leaves is accounted for and ready for the next step in traceability.\n\nThe payoff is production you can trust at the cow level and at the tank level, with shipment records that line up against quality results before milk is dispatched.",
  },
  // 229 DAIRY-MGMT-MILK-QUALITY
  229: {
    catalog_tagline:
      "Test the milk that leaves the farm and hold what fails: SCC, bacteria, components, and residue in one place.",
    catalog_description:
      "Test milk where it matters, at the bulk tank and the individual cow. Record somatic cell count, bacterial count, butterfat, protein, and antibiotic-residue screens, and follow each result from sampled through submitted to a pass, fail, or appeal.\n\nTurn a failing result into action, not just a number. A failed test or an active treatment can gate a shipment so milk that should not leave the farm does not, protecting the load, the premium, and the buyer relationship.\n\nQuality history rolls up so trends are visible over time, supporting DHIA testing standards and FDA Grade A obligations with the evidence already captured.",
  },
  // 230 DAIRY-MGMT-FEED
  230: {
    catalog_tagline:
      "Formulate rations by group, log every mix, and tie feed cost back to milk income.",
    catalog_description:
      "Build total-mixed rations the way the herd is actually fed: by group, with ingredients and inclusion percentages set for each pen's stage and production level. Each ration is formulated, put into use, and superseded when the recipe changes, so the current formulation is always clear.\n\nLog what goes in the mixer, not just what was planned. Mixing records capture the real batch so feeding can be checked against the formulation.\n\nClose the economic loop. Tie ration cost to milk income so income-over-feed-cost is a number you manage rather than estimate, and so a ration change can be weighed against its effect on production and margin.",
  },
};

async function authorCatalogUX() {
  console.log("\n== 2. Catalog UX (Rule #20) ==");
  let n = 0;
  // domain 156
  const [dom] = await get(
    "/domains?id=eq.156&select=catalog_tagline,catalog_description",
  );
  const dBody: Row = {};
  if (!String(dom?.catalog_tagline ?? "").trim())
    dBody.catalog_tagline = domainCopy.catalog_tagline;
  if (!String(dom?.catalog_description ?? "").trim())
    dBody.catalog_description = domainCopy.catalog_description;
  if (Object.keys(dBody).length) {
    await patch("/domains?id=eq.156", dBody);
    console.log(`  domain 156: wrote ${Object.keys(dBody).join(", ")}`);
    n++;
  } else {
    console.log("  domain 156: already populated, skip");
  }
  // modules 227-230
  const mods = await get(
    "/domain_modules?id=in.(227,228,229,230)&select=id,domain_module_code,catalog_tagline,catalog_description",
  );
  for (const m of mods) {
    const id = Number(m.id);
    const copy = moduleCopy[id];
    if (!copy) continue;
    const body: Row = {};
    if (!String(m.catalog_tagline ?? "").trim())
      body.catalog_tagline = copy.catalog_tagline;
    if (!String(m.catalog_description ?? "").trim())
      body.catalog_description = copy.catalog_description;
    if (Object.keys(body).length) {
      await patch(`/domain_modules?id=eq.${id}`, body);
      console.log(`  module ${id} (${m.domain_module_code}): wrote ${Object.keys(body).join(", ")}`);
      n++;
    } else {
      console.log(`  module ${id} (${m.domain_module_code}): already populated, skip`);
    }
  }
  console.log(`  catalog UX rows updated: ${n}`);
  return n;
}

// ============================================================
// 3. B1B-S6 - missing handoff dairy_cow.lifecycle_changed -> ERP-FIN
//    trigger_event 1099 (dairy_cow.lifecycle_changed, data_object 499), source module 227 (HERD).
//    Target ERP-FIN = domain 65 (same target as sibling lifecycle/feed handoffs 956/958).
//    Mirrors sibling 956 (batch_sync / low). target_domain_module_id left NULL (owed by ERP-FIN).
//    Idempotent on the (source, target, source_module, trigger_event, data_object) natural key.
// ============================================================
const HANDOFF = {
  source_domain_id: 156,
  target_domain_id: 65,
  data_object_id: 499,
  trigger_event_id: 1099,
  source_domain_module_id: 227,
  integration_pattern: "batch_sync",
  friction_level: "low",
  description:
    "Cow lifecycle transition (new lactating, dry-off, or culling) updates ERP-FIN fixed-asset valuation and herd-economic models.",
};

async function insertMissingHandoff() {
  console.log("\n== 3. B1B-S6 missing handoff (dairy_cow.lifecycle_changed -> ERP-FIN) ==");
  const existing = await get(
    "/handoffs?source_domain_id=eq.156&target_domain_id=eq.65&trigger_event_id=eq.1099&data_object_id=eq.499&select=id",
  );
  if (existing.length) {
    console.log(`  already present (id=${existing[0].id}), skip`);
    return 0;
  }
  const created = await post("/handoffs", [HANDOFF]);
  console.log(`  inserted handoff id=${created[0]?.id}`);
  return 1;
}

// ============================================================
async function main() {
  const counts = {
    entity_type: await classifyEntityTypes(),
    catalog_ux: await authorCatalogUX(),
    missing_handoff: await insertMissingHandoff(),
  };
  console.log("\n== SUMMARY ==");
  console.log(JSON.stringify(counts, null, 2));
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(499,500,501,502,503,504,505,506)");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.156");
  console.log("  https://tests.semantius.app/domain_map/domain_modules?domain_id=eq.156");
  console.log("  https://tests.semantius.app/domain_map/handoffs?source_domain_id=eq.156");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
