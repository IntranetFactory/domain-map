#!/usr/bin/env bun
// 2026-06-07 HAM state-driven Validate execute (SKILL.md Rule #21, bulk batch).
// Additive/corrective only; everything lands record_status='new' (or PATCH of empty/NULL fields).
// Idempotent: re-reads live before every write and skips work already done.
//
// Scope (EXECUTE-classified items from audits/HAM/state.yaml):
//   1. B1A-ENTITY-TYPE  : classify 5 HAM masters (entity_type unclassified -> enum)
//   2. Catalog UX (#20) : author empty catalog_tagline/description on domain 51 + modules 169/170
//   3. B1A-S4           : fill empty event_category on 6 HAM trigger events
//   4. B1A-H1 (APQC)    : insert 2 missing handoff_processes (671->1573, 672->1561)
//   5. B1B-S8 (B10b)    : backfill source_domain_module_id on 5 outbound handoffs
//   6. B1B-S10 (B10b)   : backfill target_domain_module_id on 2 inbound handoffs
//
// Destructive / blocked / deferred items are NOT touched here (surfaced to user).

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
// 1. entity_type classification (B1A-ENTITY-TYPE)
// ============================================================
// hardware_assets       (56)  operational_workflow : procured -> received -> deployed -> in_use -> in_repair -> retired -> disposed
// hardware_models       (695) catalog              : reference catalog of device models / SKUs
// hardware_warranties   (696) operational_record   : registered warranty coverage records
// hardware_disposal_records (697) operational_workflow : initiated -> sanitized -> certified -> completed
// spare_parts_inventory (698) operational_record   : stock-on-hand records per part/location
const entityTypes: { id: number; name: string; entity_type: string }[] = [
  { id: 56, name: "hardware_assets", entity_type: "operational_workflow" },
  { id: 695, name: "hardware_models", entity_type: "catalog" },
  { id: 696, name: "hardware_warranties", entity_type: "operational_record" },
  { id: 697, name: "hardware_disposal_records", entity_type: "operational_workflow" },
  { id: 698, name: "spare_parts_inventory", entity_type: "operational_record" },
];

async function classifyEntityTypes() {
  console.log("\n== 1. entity_type classification ==");
  const live = await get(
    "/data_objects?id=in.(56,695,696,697,698)&select=id,entity_type",
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
// ============================================================
const domainCopy = {
  catalog_tagline: "Know every device you own, where it is, and what it costs.",
  catalog_description:
    "Build a single trustworthy register of laptops, desktops, servers, network gear, and mobile devices. Track each asset from purchase through deployment, repair, and retirement, manage warranties and spare parts, and run secure, evidenced disposal at end of life. Cut surprise spend, satisfy audits, and refresh hardware on a plan instead of in a panic.",
};
const moduleCopy: Record<number, { catalog_tagline: string; catalog_description: string }> = {
  169: {
    catalog_tagline: "One source of truth for every hardware asset and the models behind it.",
    catalog_description:
      "Capture devices the moment they are discovered, assign them to people and locations, and follow each one through its full lifecycle. Hold a clean catalog of the models you standardize on, track purchase and depreciation for finance, and see at a glance what is deployed, in repair, or ready to retire.",
  },
  170: {
    catalog_tagline: "Warranties, spare parts, and clean end-of-life, all in one place.",
    catalog_description:
      "Register warranty coverage and get ahead of expirations before they cost you. Keep spare parts stocked across warehouses and field technicians so repairs do not stall, and run device disposal with sanitized media, certificates, and the evidence auditors and regulators expect.",
  },
};

async function authorCatalogUX() {
  console.log("\n== 2. Catalog UX (Rule #20) ==");
  let n = 0;
  // Domain 51
  const [dom] = await get(
    "/domains?id=eq.51&select=catalog_tagline,catalog_description",
  );
  const dBody: Row = {};
  if (!String(dom?.catalog_tagline ?? "").trim()) dBody.catalog_tagline = domainCopy.catalog_tagline;
  if (!String(dom?.catalog_description ?? "").trim()) dBody.catalog_description = domainCopy.catalog_description;
  if (Object.keys(dBody).length) {
    await patch("/domains?id=eq.51", dBody);
    console.log(`  domain 51: wrote ${Object.keys(dBody).join(", ")}`);
    n++;
  } else {
    console.log("  domain 51: already populated, skip");
  }
  // Modules 169, 170
  const mods = await get(
    "/domain_modules?id=in.(169,170)&select=id,catalog_tagline,catalog_description",
  );
  const mcur = new Map(mods.map(m => [Number(m.id), m]));
  for (const id of [169, 170]) {
    const m = mcur.get(id) ?? {};
    const body: Row = {};
    if (!String((m as Row).catalog_tagline ?? "").trim()) body.catalog_tagline = moduleCopy[id].catalog_tagline;
    if (!String((m as Row).catalog_description ?? "").trim()) body.catalog_description = moduleCopy[id].catalog_description;
    if (Object.keys(body).length) {
      await patch(`/domain_modules?id=eq.${id}`, body);
      console.log(`  module ${id}: wrote ${Object.keys(body).join(", ")}`);
      n++;
    } else {
      console.log(`  module ${id}: already populated, skip`);
    }
  }
  console.log(`  catalog UX rows updated: ${n}`);
  return n;
}

// ============================================================
// 3. event_category on 6 HAM trigger events (B1A-S4, Rule #13)
// ============================================================
const eventCats: { id: number; name: string; cat: string }[] = [
  { id: 682, name: "hardware_model.added", cat: "lifecycle" },
  { id: 683, name: "hardware_model.eol_announced", cat: "state_change" },
  { id: 684, name: "hardware_warranty.expiring", cat: "threshold" },
  { id: 685, name: "hardware_warranty.expired", cat: "state_change" },
  { id: 686, name: "hardware_disposal_record.completed", cat: "state_change" },
  { id: 687, name: "spare_parts_inventory.low_threshold", cat: "threshold" },
];

async function fillEventCategory() {
  console.log("\n== 3. trigger_events.event_category (B1A-S4) ==");
  const live = await get(
    "/trigger_events?id=in.(682,683,684,685,686,687)&select=id,event_category",
  );
  const cur = new Map(live.map(r => [Number(r.id), String(r.event_category ?? "")]));
  let n = 0;
  for (const e of eventCats) {
    const c = cur.get(e.id);
    if (c && c.trim()) {
      console.log(`  skip ${e.name}: already '${c}'`);
      continue;
    }
    await patch(`/trigger_events?id=eq.${e.id}`, { event_category: e.cat });
    console.log(`  set  ${e.name} -> ${e.cat}`);
    n++;
  }
  console.log(`  event_category updated: ${n}`);
  return n;
}

// ============================================================
// 4. APQC handoff_processes inserts (B1A-H1) - clean PCF matches only
// ============================================================
// 671 HAM->GRC (disposal completed)  -> 1573 Manage disposition, disposal, reprocessing activities (L4)
// 672 HAM->SPM (model eol_announced) -> 1561 Monitor useful life of assets (L4)
const apqc: { handoff_id: number; process_id: number; label: string }[] = [
  { handoff_id: 671, process_id: 1573, label: "Manage disposition, disposal, reprocessing activities" },
  { handoff_id: 672, process_id: 1561, label: "Monitor useful life of assets" },
];

async function insertApqc() {
  console.log("\n== 4. APQC handoff_processes (B1A-H1) ==");
  const existing = await get(
    "/handoff_processes?handoff_id=in.(671,672)&select=handoff_id,process_id",
  );
  const seen = new Set(existing.map(r => `${r.handoff_id}|${r.process_id}`));
  const toInsert = apqc
    .filter(a => !seen.has(`${a.handoff_id}|${a.process_id}`))
    .map(a => ({
      handoff_id: a.handoff_id,
      process_id: a.process_id,
      role: "implements",
      proposal_source: "agent_curated",
    }));
  if (toInsert.length) {
    await post("/handoff_processes", toInsert);
    for (const a of apqc) console.log(`  +${a.handoff_id} -> ${a.process_id} (${a.label})`);
  } else {
    console.log("  all APQC rows already present, nothing to insert");
  }
  console.log(`  handoff_processes inserted: ${toInsert.length}`);
  return toInsert.length;
}

// ============================================================
// 5. source_domain_module_id backfill (B1B-S8 / B10b) - 5 outbound
// ============================================================
const srcFk: { id: number; module: number; payload: string }[] = [
  { id: 668, module: 170, payload: "spare_parts_inventory" },
  { id: 669, module: 170, payload: "hardware_warranties" },
  { id: 670, module: 170, payload: "hardware_disposal_records" },
  { id: 671, module: 170, payload: "hardware_disposal_records" },
  { id: 672, module: 169, payload: "hardware_models" },
];

async function backfillSourceFk() {
  console.log("\n== 5. source_domain_module_id backfill (B1B-S8) ==");
  const live = await get(
    "/handoffs?id=in.(668,669,670,671,672)&select=id,source_domain_module_id",
  );
  const cur = new Map(live.map(r => [Number(r.id), r.source_domain_module_id]));
  let n = 0;
  for (const f of srcFk) {
    if (cur.get(f.id) != null) {
      console.log(`  skip ${f.id}: already ${cur.get(f.id)}`);
      continue;
    }
    await patch(`/handoffs?id=eq.${f.id}`, { source_domain_module_id: f.module });
    console.log(`  set  ${f.id} source -> ${f.module} (${f.payload})`);
    n++;
  }
  console.log(`  source FK updated: ${n}`);
  return n;
}

// ============================================================
// 6. target_domain_module_id backfill (B1B-S10 / B10b) - 2 inbound deterministic
// ============================================================
const tgtFk: { id: number; module: number; payload: string }[] = [
  { id: 32, module: 169, payload: "hardware_assets" },
  { id: 144, module: 169, payload: "hardware_assets" },
];

async function backfillTargetFk() {
  console.log("\n== 6. target_domain_module_id backfill (B1B-S10) ==");
  const live = await get(
    "/handoffs?id=in.(32,144)&select=id,target_domain_module_id",
  );
  const cur = new Map(live.map(r => [Number(r.id), r.target_domain_module_id]));
  let n = 0;
  for (const f of tgtFk) {
    if (cur.get(f.id) != null) {
      console.log(`  skip ${f.id}: already ${cur.get(f.id)}`);
      continue;
    }
    await patch(`/handoffs?id=eq.${f.id}`, { target_domain_module_id: f.module });
    console.log(`  set  ${f.id} target -> ${f.module} (${f.payload})`);
    n++;
  }
  console.log(`  target FK updated: ${n}`);
  return n;
}

// ============================================================
async function main() {
  const counts = {
    entity_type: await classifyEntityTypes(),
    catalog_ux: await authorCatalogUX(),
    event_category: await fillEventCategory(),
    apqc: await insertApqc(),
    source_fk: await backfillSourceFk(),
    target_fk: await backfillTargetFk(),
  };
  console.log("\n== SUMMARY ==");
  console.log(JSON.stringify(counts, null, 2));
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(56,695,696,697,698)");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.51");
  console.log("  https://tests.semantius.app/domain_map/domain_modules?id=in.(169,170)");
  console.log("  https://tests.semantius.app/domain_map/trigger_events?id=in.(682,683,684,685,686,687)");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes?handoff_id=in.(671,672)");
  console.log("  https://tests.semantius.app/domain_map/handoffs?source_domain_id=eq.51");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
