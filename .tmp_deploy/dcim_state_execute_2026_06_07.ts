#!/usr/bin/env bun
// DCIM state-driven Validate execute pass (2026-06-07).
// Executes the additive/corrective open items from audits/DCIM/state.yaml that have
// NO real dependency on the (still-undecided) B2-MODULE-SPLIT decision:
//   1. entity_type PATCH on the 10 DCIM masters (unclassified -> Rule #12 enum).
//      (B13 fix. The three sensor/topology-shape masters classified operational_record
//       IS the new structural config-shape lifecycle exemption per Rule #12, replacing
//       the old data_objects.notes exemption surface.)
//   2. Catalog UX (Rule #20): author buyer-voice catalog_tagline + catalog_description
//      on the DCIM domain row (both currently empty). No module copy: 0 modules.
//   3. data_object_relationships (B1A-T5b): the 9 intra-domain master-to-master edges
//      plus 2 cross-domain edges (-> configuration_items / CMDB, -> financial_plans / SPM).
//      data_object_relationships has NO module FK column, so these are authorable now;
//      state.yaml's blocked_by was a round-trip-optimization gate, not a data dependency.
//      User-edges (rows 1782..1785) already exist and are left untouched.
//
// NOT executed here (gated on the build / module-split decision, surfaced to user):
//   - B1A-T2 new handoff for dc_power_circuit.overload (needs source_domain_module_id).
//   - B1A-B1 PATCH source_domain_module_id on the 9 outbound handoffs (needs modules).
//   - B1B-S1..S6, B1B-T7, B1A-BUILD (the unbuilt-domain build cascade).
//
// Idempotent: reads live state before each write, inserts/patches only what is missing.
// All writes land at record_status='new' (Rule #1). No DELETE, no overwrite of a
// non-empty value, no record_status flip.

import { } from "bun";

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

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map(r => {
    const out: Row = {};
    for (const k of keys) out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return out;
  });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    out.push(...(await call({ method: "POST", path, body: slice })));
  }
  return out;
}

const DOMAIN_ID = 84;

// DCIM master data_object ids (546..555)
const DC = {
  racks: 546,
  cabinets: 547,
  pdus: 548,
  power_circuits: 549,
  upses: 550,
  cooling_units: 551,
  environmental_readings: 552,
  capacity_plans: 553,
  port_connections: 554,
  cable_connections: 555,
};
const CONFIGURATION_ITEMS = 76; // CMDB master
const FINANCIAL_PLANS = 37;     // SPM master

// ============================================================
// 1. entity_type PATCH (Rule #12 enum). Deterministic from the description.
// ============================================================
const entityTypeMap: Record<number, string> = {
  546: "operational_workflow", // dc_racks: planned -> installed -> active -> retired (B1B-T7)
  547: "operational_record",   // dc_cabinets: physical-asset register entry, no approval workflow
  548: "operational_record",   // dc_power_distribution_units: PDU asset record
  549: "operational_workflow", // dc_power_circuits: provisioned -> energized -> deenergized -> decommissioned (B1B-T7)
  550: "operational_record",   // dc_uninterruptible_power_supplies: UPS asset record
  551: "operational_record",   // dc_cooling_units: cooling-device asset record
  552: "operational_record",   // dc_environmental_readings: ingested sensor telemetry record (config-shape exemption)
  553: "operational_workflow", // dc_capacity_plans: draft -> in_review -> approved -> archived (B1B-T7)
  554: "operational_record",   // dc_port_connections: topology/connectivity record (config-shape exemption)
  555: "operational_record",   // dc_cable_connections: physical cable-plant record (config-shape exemption)
};

async function patchEntityTypes(): Promise<number> {
  const ids = Object.keys(entityTypeMap).map(Number);
  const live = await get(
    `/data_objects?id=in.(${ids.join(",")})&select=id,entity_type`,
  );
  let patched = 0;
  for (const r of live) {
    const id = Number(r.id);
    const target = entityTypeMap[id];
    if (!target) continue;
    if (r.entity_type === target) continue; // already correct
    if (r.entity_type !== "unclassified") {
      // Never overwrite an already-typed value without approval.
      console.log(`  SKIP ${id}: entity_type='${r.entity_type}' already typed (not unclassified)`);
      continue;
    }
    await call({
      method: "PATCH",
      path: `/data_objects?id=eq.${id}`,
      body: { entity_type: target },
    });
    patched++;
    console.log(`  PATCH ${id} entity_type -> ${target}`);
  }
  return patched;
}

// ============================================================
// 2. Catalog UX (Rule #20) on the domain row
// ============================================================
const DCIM_TAGLINE =
  "See, power, cool, and plan every rack in your data centers from one live model, so you never run out of space, power, or cooling by surprise.";

const DCIM_DESCRIPTION =
  "Data center infrastructure management gives facilities and IT infrastructure teams a single, authoritative model of the physical estate: every site, rack, and cabinet, the power chain that feeds them, the cooling that keeps them within range, and the cables and ports that connect them. Instead of spreadsheets and tribal knowledge, you get a live register of what is installed, where it sits, and how much headroom is left.\n\n" +
  "Operators track power from the incoming circuit through distribution units and uninterruptible supplies down to the outlet, monitor temperature and humidity from cabinet-level sensors, and map physical connectivity port by port and cable by cable. When a circuit overloads, a cooling unit fails, or an environmental threshold is breached, the event is captured and routed to the teams and systems that need to act.\n\n" +
  "On top of the asset and telemetry layer sits capacity planning: forward-looking projections of power, cooling, space, and bandwidth per site and zone. Planners use that headroom view to schedule growth, justify build-outs, and negotiate colocation with confidence, while changes to the physical layer flow out to the configuration database and downstream operations so the rest of IT stays in step.";

async function patchCatalogUx(): Promise<number> {
  const [dom] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=id,catalog_tagline,catalog_description`,
  );
  if (!dom) throw new Error("DCIM domain row not found");
  const body: Row = {};
  if (!dom.catalog_tagline || String(dom.catalog_tagline).trim() === "") {
    body.catalog_tagline = DCIM_TAGLINE;
  } else {
    console.log("  SKIP catalog_tagline: already populated");
  }
  if (!dom.catalog_description || String(dom.catalog_description).trim() === "") {
    body.catalog_description = DCIM_DESCRIPTION;
  } else {
    console.log("  SKIP catalog_description: already populated");
  }
  if (Object.keys(body).length === 0) return 0;
  await call({ method: "PATCH", path: `/domains?id=eq.${DOMAIN_ID}`, body });
  console.log(`  PATCH domain ${DOMAIN_ID} catalog UX: ${Object.keys(body).join(", ")}`);
  return Object.keys(body).length;
}

// ============================================================
// 3. data_object_relationships (B1A-T5b)
//    9 intra-domain edges + 2 cross-domain edges. No module FK on this table.
//    Shape matches the existing user-edges (rows 1782..1785):
//      relationship_type one_to_many, owner_side source, is_required false.
//    relationship_kind: composition for structural "contains", association for
//    functional topology edges, reference for cross-domain.
// ============================================================
type RelSpec = {
  data_object_id: number;       // source
  related_data_object_id: number; // target
  relationship_verb: string;
  inverse_verb: string;
  relationship_kind: "composition" | "association" | "reference";
  label: string;
};

const relSpecs: RelSpec[] = [
  // --- 9 intra-domain edges ---
  { data_object_id: DC.racks, related_data_object_id: DC.cabinets,
    relationship_verb: "contains", inverse_verb: "is_contained_in",
    relationship_kind: "composition", label: "dc_racks contains dc_cabinets" },
  { data_object_id: DC.cabinets, related_data_object_id: DC.pdus,
    relationship_verb: "contains", inverse_verb: "is_contained_in",
    relationship_kind: "composition", label: "dc_cabinets contains dc_power_distribution_units" },
  { data_object_id: DC.pdus, related_data_object_id: DC.power_circuits,
    relationship_verb: "feeds", inverse_verb: "is_fed_by",
    relationship_kind: "association", label: "dc_power_distribution_units feeds dc_power_circuits" },
  { data_object_id: DC.power_circuits, related_data_object_id: DC.cabinets,
    relationship_verb: "powers", inverse_verb: "is_powered_by",
    relationship_kind: "association", label: "dc_power_circuits powers dc_cabinets" },
  { data_object_id: DC.upses, related_data_object_id: DC.pdus,
    relationship_verb: "backs", inverse_verb: "is_backed_by",
    relationship_kind: "association", label: "dc_uninterruptible_power_supplies backs dc_power_distribution_units" },
  { data_object_id: DC.cooling_units, related_data_object_id: DC.cabinets,
    relationship_verb: "serves", inverse_verb: "is_served_by",
    relationship_kind: "association", label: "dc_cooling_units serves dc_cabinets" },
  { data_object_id: DC.environmental_readings, related_data_object_id: DC.cabinets,
    relationship_verb: "sampled_at", inverse_verb: "is_sampled_by",
    relationship_kind: "association", label: "dc_environmental_readings sampled_at dc_cabinets" },
  { data_object_id: DC.capacity_plans, related_data_object_id: DC.racks,
    relationship_verb: "plans", inverse_verb: "is_planned_by",
    relationship_kind: "association", label: "dc_capacity_plans plans dc_racks" },
  { data_object_id: DC.port_connections, related_data_object_id: DC.cable_connections,
    relationship_verb: "connects", inverse_verb: "is_connected_by",
    relationship_kind: "association", label: "dc_port_connections connects dc_cable_connections" },
  // --- 2 cross-domain edges ---
  { data_object_id: DC.port_connections, related_data_object_id: CONFIGURATION_ITEMS,
    relationship_verb: "updates", inverse_verb: "is_updated_by",
    relationship_kind: "reference", label: "dc_port_connections updates configuration_items" },
  { data_object_id: DC.capacity_plans, related_data_object_id: FINANCIAL_PLANS,
    relationship_verb: "informs", inverse_verb: "is_informed_by",
    relationship_kind: "reference", label: "dc_capacity_plans informs financial_plans" },
];

async function insertRelationships(): Promise<number> {
  const srcIds = [...new Set(relSpecs.map(r => r.data_object_id))];
  const existing = await get(
    `/data_object_relationships?data_object_id=in.(${srcIds.join(",")})&select=data_object_id,related_data_object_id,relationship_verb`,
  );
  const have = new Set(
    existing.map(r => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`),
  );
  const missing = relSpecs
    .filter(s => !have.has(`${s.data_object_id}|${s.related_data_object_id}|${s.relationship_verb}`))
    .map(s => ({
      data_object_id: s.data_object_id,
      related_data_object_id: s.related_data_object_id,
      relationship_type: "one_to_many",
      relationship_kind: s.relationship_kind,
      relationship_verb: s.relationship_verb,
      inverse_verb: s.inverse_verb,
      is_required: false,
      owner_side: "source",
      data_object_relationship_label: s.label,
    }));
  if (missing.length === 0) {
    console.log("  data_object_relationships: all present, nothing to insert");
    return 0;
  }
  await insert("/data_object_relationships", missing);
  for (const m of missing) console.log(`  + ${m.data_object_relationship_label}`);
  return missing.length;
}

// ============================================================
// Run
// ============================================================
console.log("== DCIM state-driven execute 2026-06-07 ==");
console.log("\n[1] entity_type PATCH");
const nEntity = await patchEntityTypes();
console.log("\n[2] catalog UX");
const nCatalog = await patchCatalogUx();
console.log("\n[3] data_object_relationships (B1A-T5b)");
const nRel = await insertRelationships();

console.log("\n== Summary ==");
console.log(`entity_type patched: ${nEntity}`);
console.log(`catalog UX fields written: ${nCatalog}`);
console.log(`data_object_relationships inserted: ${nRel}`);

// Verify
console.log("\n== Verify ==");
const verifyEnt = await get(
  "/data_objects?id=in.(546,547,548,549,550,551,552,553,554,555)&select=id,data_object_name,entity_type&order=id",
);
for (const r of verifyEnt) console.log(`  ${r.id} ${r.data_object_name}: ${r.entity_type}`);
const stillUnclassified = verifyEnt.filter(r => r.entity_type === "unclassified").length;
console.log(`  still unclassified: ${stillUnclassified}`);
const [vdom] = await get(
  `/domains?id=eq.${DOMAIN_ID}&select=catalog_tagline,catalog_description`,
);
console.log(`  catalog_tagline empty? ${!vdom.catalog_tagline}`);
console.log(`  catalog_description empty? ${!vdom.catalog_description}`);
const vrel = await get(
  "/data_object_relationships?data_object_id=in.(546,547,548,549,550,551,552,553,554,555)&select=id,data_object_relationship_label&order=id",
);
console.log(`  total DCIM-source data_object_relationships now: ${vrel.length}`);
for (const r of vrel) console.log(`    ${r.id} ${r.data_object_relationship_label}`);

console.log("\nDone.");
