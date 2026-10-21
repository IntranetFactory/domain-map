#!/usr/bin/env bun
// Loads the LIVESTOCK-MGMT domain (general beef / sheep / cattle / grazing management)
// into the live Semantius `domain_map` module via the semantius CLI.
//
// Verdict: promote-as-domain (Phase 0 at .tmp_deploy/LIVESTOCK-MGMT-phase0-2026-06-14.md).
// Idempotent: each table reads existing rows by natural key and inserts only the missing
// ones, then re-reads to build a full natural-key -> id map. All rows land at
// record_status='new' (omitted on insert; Rule #1). No notes populated (Rule #15).
// CLI only, never MCP (Rule #0). TypeScript on Bun, never Python (Rule #4b).

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
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  if (text.includes('"code"') && text.includes('"message"') && !text.startsWith("[")) {
    // surface PostgREST error objects loudly
    throw new Error(`PostgREST error: ${text}`);
  }
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

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
  const CHUNK = 40;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

// Insert only rows whose natural key is not already present; return key->id map for ALL.
async function syncByKey(
  path: string,
  rows: Row[],
  keyField: string,
  selectExtra = "",
): Promise<Map<string, number>> {
  const sel = `id,${keyField}${selectExtra ? "," + selectExtra : ""}`;
  const existing = await get(`${path}?select=${sel}&limit=10000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  ${path}: inserting ${missing.length} new (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: all ${rows.length} present, nothing to insert`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// Generic idempotent junction loader keyed on a composite tuple computed from the row.
async function syncJunction(
  path: string,
  rows: Row[],
  keyOf: (r: Row) => string,
  selectCols: string,
): Promise<void> {
  const existing = await get(`${path}?select=${selectCols}&limit=10000`);
  const existingKeys = new Set(existing.map(keyOf));
  const missing = rows.filter(r => !existingKeys.has(keyOf(r)));
  if (missing.length > 0) {
    console.log(`  ${path}: inserting ${missing.length} new junction rows (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: all ${rows.length} junction rows present`);
  }
}

const id = (m: Map<string, number>, k: string): number => {
  const v = m.get(k);
  if (v === undefined) throw new Error(`missing id for key '${k}' in map`);
  return v;
};

// Resolve adjacent domains live (never hard-code).
async function resolveDomainId(code: string): Promise<number> {
  const r = await get(`/domains?domain_code=eq.${code}&select=id`);
  if (!r.length) throw new Error(`adjacent domain ${code} not found`);
  return Number(r[0].id);
}

async function main() {
  console.log("== LIVESTOCK-MGMT load ==");

  // ---- Resolve adjacent ids live ----
  const FMIS = await resolveDomainId("FMIS");
  const FOODTRACE = await resolveDomainId("FOOD-TRACE");
  const DAIRY = await resolveDomainId("DAIRY-MGMT");
  console.log(`  adjacent: FMIS=${FMIS} FOOD-TRACE=${FOODTRACE} DAIRY-MGMT=${DAIRY}`);

  const usersRow = await get(`/data_objects?data_object_name=eq.users&select=id`);
  const USERS = Number(usersRow[0].id);

  // ============================================================
  // PHASE A.1 - domain (7 metadata fields + catalog UX, Rule #8 + #20)
  // ============================================================
  const DOMAIN_CODE = "LIVESTOCK-MGMT";
  const domainRow = {
    domain_code: DOMAIN_CODE,
    domain_name: "Livestock Management",
    description:
      "Records, plans, and tracks beef, sheep, and mixed grazing-livestock operations: individual-animal records, mob (group) management, mob movements between paddocks and properties, weight gains with average-daily-gain tracking, breeding and calving records, treatment and medicine records with withholding periods, pasture allocation and rotational grazing planning, and the electronic-identifier traceability layer (EID / RFID ear tags, national identification scheme device numbers). Buyer is the small-to-mid grazing operation, station, ranch, or family farm. Distinct from Dairy Herd Management (milking, lactation, milk quality) and from the crop / whole-farm Farm Management Information System, though it shares the paddock and whole-farm substrate with the latter.",
    business_logic:
      "Beyond CRUD and state-based workflow: average-daily-gain and growth-curve computation from weight series, stocking-rate-versus-carrying-capacity grazing optimization, rest-period and rotation scheduling driven by pasture cover and rainfall, and withholding-period date arithmetic that gates sale and slaughter eligibility after a treatment.",
    min_org_size: "10 xs <50",
    cost_band: "$",
    crud_percentage: 70,
    certification_required: false,
    usa_market_size_usd_m: 900,
    market_size_source_year: 2025,
    catalog_tagline:
      "Run your herd and your pastures from one place: animals, mobs, movements, weights, breeding, treatments, and grazing plans.",
    catalog_description:
      "Track every animal and every mob from birth or purchase through to sale, with weights and average daily gains, breeding and calving records, and treatment and medicine logs that keep your withholding periods straight. Move mobs between paddocks and properties, allocate pasture, and plan rotations against your stocking rate and carrying capacity. Capture electronic ear-tag reads in the yard and keep your traceability records audit-ready for the identification scheme in your region. Built for the grazier, station, or family farm that wants real records without the weight of a full enterprise system.",
  };
  const domainMap = await syncByKey("/domains", [domainRow], "domain_code");
  const DOMAIN_ID = id(domainMap, DOMAIN_CODE);
  console.log(`  domain LIVESTOCK-MGMT id=${DOMAIN_ID}`);

  // ============================================================
  // PHASE A.2 - capabilities + capability_domains (Rule #14: >=3 => >=2 full modules)
  // ============================================================
  const capabilities = [
    { capability_code: "LIVESTOCK-ANIMAL-RECORDS", capability_name: "Individual Animal Records", description: "Maintain a lifecycle record for each animal: identity, breed, sex, status, parentage, and history of weights, treatments, and movements." },
    { capability_code: "LIVESTOCK-MOB-MANAGEMENT", capability_name: "Mob and Group Management", description: "Organize animals into mobs (groups) and manage them collectively for movements, treatments, and pasture allocation." },
    { capability_code: "LIVESTOCK-MOB-MOVEMENTS", capability_name: "Mob Movement Tracking", description: "Record movements of mobs between paddocks, properties, and external destinations, with date, count, and reason." },
    { capability_code: "LIVESTOCK-WEIGHT-GAIN", capability_name: "Weight and Growth Tracking", description: "Capture weigh sessions and compute average daily gain and growth curves over time for animals and mobs." },
    { capability_code: "LIVESTOCK-BREEDING-RECORDS", capability_name: "Breeding and Calving Records", description: "Track joining, pregnancy, calving and lambing, sires and dams, and birth weights across the breeding cycle." },
    { capability_code: "LIVESTOCK-TREATMENT-RECORDS", capability_name: "Treatment and Medicine Records", description: "Record vaccinations, treatments, and medicine administrations with batch numbers and withholding periods that gate sale and slaughter eligibility." },
    { capability_code: "LIVESTOCK-GRAZING-PLANNING", capability_name: "Pasture Allocation and Grazing Planning", description: "Allocate pasture, plan rotational grazing with rest periods, and match stocking rate to paddock carrying capacity." },
    { capability_code: "LIVESTOCK-TRACEABILITY", capability_name: "Livestock Identification and Traceability", description: "Manage electronic and visual identifiers and traceable movement records to meet the national livestock-identification scheme in the operation's jurisdiction." },
  ];
  const capMap = await syncByKey("/capabilities", capabilities, "capability_code");

  await syncJunction(
    "/capability_domains",
    capabilities.map(c => ({ capability_id: id(capMap, c.capability_code), domain_id: DOMAIN_ID, notes: "" })),
    r => `${r.capability_id}|${r.domain_id}`,
    "capability_id,domain_id",
  );

  // ============================================================
  // PHASE A.3 - domain_modules (2 full modules) + domain_module_capabilities
  // ============================================================
  const modules = [
    {
      domain_module_code: "LIVESTOCK-MGMT-HERD",
      domain_module_name: "Herd and Animal Records",
      domain_id: DOMAIN_ID,
      module_kind: "full",
      description:
        "The animal-centric system of record: individual-animal records, mobs and groups, mob movements, weigh sessions with average daily gain, breeding and calving records, treatment and medicine records with withholding periods, sale and purchase records, and the electronic-identifier traceability layer. Used standalone by a records-keeping operation or alongside the grazing module.",
      catalog_tagline: "Keep a record for every animal and every mob: weights, breeding, treatments, movements, and sales.",
      catalog_description:
        "Give every animal and mob a living record. Capture weigh sessions in the yard and watch average daily gains, log breeding and calving, and record every treatment with its withholding period so you never sell or send an animal too early. Move mobs between paddocks and properties, register sales and purchases, and keep electronic ear-tag identifiers and traceability movements in order for your region's scheme.",
    },
    {
      domain_module_code: "LIVESTOCK-MGMT-GRAZING",
      domain_module_name: "Pasture and Grazing Planning",
      domain_id: DOMAIN_ID,
      module_kind: "full",
      description:
        "The pasture and grazing-planning system of record: paddocks, pasture allocations, and rotational grazing plans with rest periods, stocking rate, and carrying capacity. Used standalone by a grazing-focused operation or alongside the herd module to drive mob movements.",
      catalog_tagline: "Plan your rotations: allocate pasture, set rest periods, and match stocking rate to carrying capacity.",
      catalog_description:
        "Map your paddocks and plan how mobs graze them. Allocate pasture, schedule rotations with the rest periods each paddock needs, and keep stocking rate matched to carrying capacity so feed lasts and paddocks recover. Build grazing plans you can follow through the season and adjust as conditions change.",
    },
  ];
  const moduleMap = await syncByKey("/domain_modules", modules, "domain_module_code");
  const HERD = id(moduleMap, "LIVESTOCK-MGMT-HERD");
  const GRAZING = id(moduleMap, "LIVESTOCK-MGMT-GRAZING");

  // capability -> realizing module
  const capModule: Record<string, number> = {
    "LIVESTOCK-ANIMAL-RECORDS": HERD,
    "LIVESTOCK-MOB-MANAGEMENT": HERD,
    "LIVESTOCK-MOB-MOVEMENTS": HERD,
    "LIVESTOCK-WEIGHT-GAIN": HERD,
    "LIVESTOCK-BREEDING-RECORDS": HERD,
    "LIVESTOCK-TREATMENT-RECORDS": HERD,
    "LIVESTOCK-TRACEABILITY": HERD,
    "LIVESTOCK-GRAZING-PLANNING": GRAZING,
  };
  await syncJunction(
    "/domain_module_capabilities",
    capabilities.map(c => ({ domain_module_id: capModule[c.capability_code], capability_id: id(capMap, c.capability_code), notes: "" })),
    r => `${r.domain_module_id}|${r.capability_id}`,
    "domain_module_id,capability_id",
  );

  // ============================================================
  // PHASE A.4 - vendors (reuse by name) + solutions + solution_domains
  // ============================================================
  const vendors = [
    { vendor_name: "AgriWebb", vendor_url: "https://www.agriwebb.com", headquarters_country: "Australia", description: "Livestock-management software vendor for beef and sheep grazing operations; grazing, inventory, compliance, and provenance.", notes: "" },
    { vendor_name: "Herdwatch", vendor_url: "https://herdwatch.com", headquarters_country: "Ireland", description: "Farm and livestock record-keeping software vendor for cattle, sheep, and pasture; breeding, medicine, and compliance records.", notes: "" },
    { vendor_name: "MaiaGrazing", vendor_url: "https://www.maiagrazing.com", headquarters_country: "Australia", description: "Rotational-grazing and pasture-management software vendor; stocking rate, carrying capacity, and grazing-plan analytics.", notes: "Original grazing platform; now part of Atlas Ag, which markets the next-generation Atlas Grazing on the same lineage." },
    { vendor_name: "Performance Livestock Analytics", vendor_url: "https://www.performancelivestockanalytics.com", headquarters_country: "USA", description: "Feedlot, stocker, and backgrounder livestock-management software vendor for feeding, performance, and health records; maker of Performance Beef.", notes: "Acquired by Zoetis in 2020." },
    { vendor_name: "CattleMax", vendor_url: "https://www.cattlemax.com", headquarters_country: "USA", description: "Cattle record-keeping software vendor with electronic-identification and USDA-traceability support; integrates yard weigh and EID data.", notes: "" },
    { vendor_name: "Datamars", vendor_url: "https://livestock.datamars.com", headquarters_country: "Switzerland", description: "Livestock electronic-identification, weigh-scale, and data vendor (Tru-Test); national-scheme transaction registration and yard data capture.", notes: "" },
  ];
  const vendorMap = await syncByKey("/vendors", vendors, "vendor_name");

  const solutions = [
    { solution_name: "AgriWebb", vendor: "AgriWebb", solution_type: "saas", solution_url: "https://www.agriwebb.com", description: "Cloud livestock-management platform for beef and sheep: mob management, grazing, weights, treatments, sales, and traceability.", coverage_level_by_module: "primary" },
    { solution_name: "Herdwatch", vendor: "Herdwatch", solution_type: "saas", solution_url: "https://herdwatch.com", description: "Mobile-first livestock record-keeping for cattle, sheep, and pasture: breeding, medicine, weights, and audit-ready compliance.", coverage_level_by_module: "primary" },
    { solution_name: "MaiaGrazing", vendor: "MaiaGrazing", solution_type: "saas", solution_url: "https://www.maiagrazing.com", description: "Grazing-management platform: rotational planning, rest periods, stocking rate, carrying capacity, and pasture analytics.", coverage_level_by_module: "primary" },
    { solution_name: "Performance Beef", vendor: "Performance Livestock Analytics", solution_type: "saas", solution_url: "https://www.performancelivestockanalytics.com/performance-beef", description: "Feeding, performance, and health record-keeping for feedlot, stocker, and backgrounder cattle operations.", coverage_level_by_module: "secondary" },
    { solution_name: "CattleMax", vendor: "CattleMax", solution_type: "saas", solution_url: "https://www.cattlemax.com", description: "Cattle record keeping with EID and traceability: animals, breeding, weights, treatments, and sales.", coverage_level_by_module: "primary" },
  ];
  const solInsertable = solutions.map(s => ({
    solution_name: s.solution_name,
    vendor_id: id(vendorMap, s.vendor),
    solution_type: s.solution_type,
    solution_url: s.solution_url,
    description: s.description,
    is_active_in_market: true,
    solution_kind: "standard_solution",
    notes: "",
  }));
  const solMap = await syncByKey("/solutions", solInsertable, "solution_name");

  await syncJunction(
    "/solution_domains",
    solutions.map(s => ({ solution_id: id(solMap, s.solution_name), domain_id: DOMAIN_ID, coverage_level: s.coverage_level_by_module, notes: "" })),
    r => `${r.solution_id}|${r.domain_id}`,
    "solution_id,domain_id",
  );

  // ============================================================
  // PHASE B.1 - data_objects (masters) + B.2 DMDO rows
  // pattern-flag booleans set explicitly (NOT-NULL). entity_type on every master.
  // ============================================================
  type MasterSpec = {
    data_object_name: string;
    singular_label: string;
    plural_label: string;
    description: string;
    entity_type: "operational_workflow" | "operational_record" | "catalog" | "junction" | "computed";
    has_personal_content?: boolean;
    has_submit_lock?: boolean;
    has_single_approver?: boolean;
    module: number;
    necessity: "required" | "optional";
  };
  const masters: MasterSpec[] = [
    {
      data_object_name: "livestock_animals", singular_label: "Animal", plural_label: "Animals",
      description: "An individual head of livestock: identity, breed, sex, birth or acquisition date, current status, parentage, and the mob it belongs to. The animal-centric core record beef and sheep operations build their schema around.",
      entity_type: "operational_workflow", module: HERD, necessity: "required",
    },
    {
      data_object_name: "livestock_mobs", singular_label: "Mob", plural_label: "Mobs",
      description: "A managed group of animals (mob, group, or lot) handled collectively for movements, treatments, and pasture allocation. The unit most day-to-day grazing operations actually operate on.",
      entity_type: "operational_workflow", module: HERD, necessity: "required",
    },
    {
      data_object_name: "mob_movements", singular_label: "Mob Movement", plural_label: "Mob Movements",
      description: "A recorded movement of a mob between paddocks, properties, or to an external destination, with date, head count, origin, destination, and reason. Feeds traceability-scheme movement reporting.",
      entity_type: "operational_workflow", module: HERD, necessity: "required",
    },
    {
      data_object_name: "animal_weight_records", singular_label: "Weight Record", plural_label: "Weight Records",
      description: "A weigh observation for an animal or mob session, with weight, date, and source (manual or scale-head capture). The series drives average-daily-gain and growth-curve computation.",
      entity_type: "operational_record", module: HERD, necessity: "required",
    },
    {
      data_object_name: "breeding_records", singular_label: "Breeding Record", plural_label: "Breeding Records",
      description: "A breeding-cycle event: joining, pregnancy test, calving or lambing, with sire, dam, offspring, and birth weight. Tracks reproductive performance across the season.",
      entity_type: "operational_workflow", module: HERD, necessity: "required",
    },
    {
      data_object_name: "animal_treatment_records", singular_label: "Treatment Record", plural_label: "Treatment Records",
      description: "A vaccination, treatment, or medicine administration for an animal or mob, with product, batch number, dose, date, and the withholding period that gates sale and slaughter eligibility.",
      entity_type: "operational_workflow", module: HERD, necessity: "required",
    },
    {
      data_object_name: "animal_sale_records", singular_label: "Sale Record", plural_label: "Sale Records",
      description: "A sale or purchase transaction for animals or mobs, with counterparty, head count, weights, price, and destination. The commercial close-out of an animal's on-farm lifecycle.",
      entity_type: "operational_workflow", module: HERD, necessity: "required",
    },
    {
      data_object_name: "livestock_identifiers", singular_label: "Livestock Identifier", plural_label: "Livestock Identifiers",
      description: "An electronic or visual identifier attached to an animal (RFID / EID ear tag, national-scheme device number, management tag) and the traceability registration it carries. Jurisdiction-gated: the applicable scheme depends on where the operation runs.",
      entity_type: "operational_record", module: HERD, necessity: "optional",
    },
    {
      data_object_name: "grazing_paddocks", singular_label: "Paddock", plural_label: "Paddocks",
      description: "A grazing paddock or field: area, location, pasture type, carrying capacity, and rest state. The land unit grazing plans rotate mobs across.",
      entity_type: "catalog", module: GRAZING, necessity: "required",
    },
    {
      data_object_name: "pasture_allocations", singular_label: "Pasture Allocation", plural_label: "Pasture Allocations",
      description: "An assignment of a mob to a paddock for a grazing period, with start and end dates, stocking rate, and expected versus actual rest. The junction that realizes a grazing plan on the ground.",
      entity_type: "operational_workflow", module: GRAZING, necessity: "required",
    },
    {
      data_object_name: "grazing_plans", singular_label: "Grazing Plan", plural_label: "Grazing Plans",
      description: "A rotational-grazing plan over a set of paddocks and mobs: planned rotation order, rest periods, stocking rate, and carrying-capacity targets for a season or cycle.",
      entity_type: "operational_workflow", module: GRAZING, necessity: "required",
    },
  ];

  const masterInsertable = masters.map(m => ({
    data_object_name: m.data_object_name,
    singular_label: m.singular_label,
    plural_label: m.plural_label,
    description: m.description,
    kind: "domain_owned",
    entity_type: m.entity_type,
    is_canonical_bare_word: false,
    naming_authority_rationale: "",
    has_personal_content: m.has_personal_content ?? false,
    has_submit_lock: m.has_submit_lock ?? false,
    has_single_approver: m.has_single_approver ?? false,
    notes: "",
  }));
  const doMap = await syncByKey("/data_objects", masterInsertable, "data_object_name");
  const doid = (name: string) => id(doMap, name);

  await syncJunction(
    "/domain_module_data_objects",
    masters.map(m => ({ domain_module_id: m.module, data_object_id: doid(m.data_object_name), role: "master", necessity: m.necessity, notes: "" })),
    r => `${r.domain_module_id}|${r.data_object_id}`,
    "domain_module_id,data_object_id",
  );

  // GRAZING also consumes mobs (mob -> paddock allocation needs the mob); record a cross-module consumer.
  await syncJunction(
    "/domain_module_data_objects",
    [{ domain_module_id: GRAZING, data_object_id: doid("livestock_mobs"), role: "consumer", necessity: "required", notes: "" }],
    r => `${r.domain_module_id}|${r.data_object_id}`,
    "domain_module_id,data_object_id",
  );

  // ============================================================
  // PHASE B.3 - data_object_relationships (intra-domain + users edges + cross-domain)
  // ============================================================
  type Rel = {
    from: string; to: string; verb: string; inverse: string;
    type: "one_to_one" | "one_to_many" | "many_to_many";
    kind: "composition" | "reference" | "association" | "inheritance";
    is_required: boolean; owner_side: "source" | "target";
    to_external?: number; // when the 'to' side is a platform builtin (users) by id
  };
  const rels: Rel[] = [
    // intra-domain
    { from: "livestock_mobs", to: "livestock_animals", verb: "groups", inverse: "belongs to", type: "one_to_many", kind: "composition", is_required: false, owner_side: "source" },
    { from: "livestock_animals", to: "animal_weight_records", verb: "has", inverse: "weighs", type: "one_to_many", kind: "composition", is_required: false, owner_side: "source" },
    { from: "livestock_animals", to: "animal_treatment_records", verb: "receives", inverse: "treats", type: "one_to_many", kind: "composition", is_required: false, owner_side: "source" },
    { from: "livestock_animals", to: "breeding_records", verb: "appears in", inverse: "records", type: "one_to_many", kind: "reference", is_required: false, owner_side: "target" },
    { from: "livestock_animals", to: "livestock_identifiers", verb: "is tagged with", inverse: "identifies", type: "one_to_many", kind: "composition", is_required: false, owner_side: "source" },
    { from: "livestock_mobs", to: "mob_movements", verb: "undergoes", inverse: "moves", type: "one_to_many", kind: "composition", is_required: false, owner_side: "source" },
    { from: "livestock_mobs", to: "animal_treatment_records", verb: "receives", inverse: "treats", type: "one_to_many", kind: "reference", is_required: false, owner_side: "source" },
    { from: "livestock_animals", to: "animal_sale_records", verb: "is sold via", inverse: "sells", type: "one_to_many", kind: "reference", is_required: false, owner_side: "source" },
    { from: "grazing_paddocks", to: "pasture_allocations", verb: "hosts", inverse: "occupies", type: "one_to_many", kind: "reference", is_required: false, owner_side: "source" },
    { from: "livestock_mobs", to: "pasture_allocations", verb: "is allocated via", inverse: "allocates", type: "one_to_many", kind: "reference", is_required: false, owner_side: "source" },
    { from: "grazing_plans", to: "pasture_allocations", verb: "schedules", inverse: "realizes", type: "one_to_many", kind: "composition", is_required: false, owner_side: "source" },
    { from: "grazing_plans", to: "grazing_paddocks", verb: "covers", inverse: "is covered by", type: "many_to_many", kind: "association", is_required: false, owner_side: "source" },
    { from: "mob_movements", to: "grazing_paddocks", verb: "moves to", inverse: "receives", type: "one_to_many", kind: "reference", is_required: false, owner_side: "target" },
    // users edges (Rule #10)
    { from: "livestock_animals", to: "users", to_external: USERS, verb: "is recorded by", inverse: "records", type: "one_to_many", kind: "reference", is_required: false, owner_side: "target" },
    { from: "animal_treatment_records", to: "users", to_external: USERS, verb: "is administered by", inverse: "administers", type: "one_to_many", kind: "reference", is_required: false, owner_side: "target" },
    { from: "mob_movements", to: "users", to_external: USERS, verb: "is logged by", inverse: "logs", type: "one_to_many", kind: "reference", is_required: false, owner_side: "target" },
    { from: "grazing_plans", to: "users", to_external: USERS, verb: "is authored by", inverse: "authors", type: "one_to_many", kind: "reference", is_required: false, owner_side: "target" },
  ];
  // cross-domain rel edges to FOOD-TRACE handled via cross-domain data_objects pulled below.

  // Need FOOD-TRACE master payload to relate animal_sale -> lot genealogy. We don't hard-author a
  // FOOD-TRACE master here; the cross-domain edge is expressed via handoffs (Phase B.5) per loader idiom.

  const relRows = rels.map(r => ({
    data_object_id: doid(r.from),
    related_data_object_id: r.to_external ?? doid(r.to),
    relationship_verb: r.verb,
    inverse_verb: r.inverse,
    relationship_type: r.type,
    relationship_kind: r.kind,
    is_required: r.is_required,
    owner_side: r.owner_side,
    notes: "",
  }));
  await syncJunction(
    "/data_object_relationships",
    relRows,
    r => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`,
    "data_object_id,related_data_object_id,relationship_verb",
  );

  // ============================================================
  // PHASE B.4 - data_object_aliases (cross-vendor / industry synonyms)
  // ============================================================
  const aliases = [
    { for: "livestock_mobs", alias_name: "Group", alias_type: "synonym" },
    { for: "livestock_mobs", alias_name: "Lot", alias_type: "synonym" },
    { for: "grazing_paddocks", alias_name: "Field", alias_type: "synonym" },
    { for: "grazing_paddocks", alias_name: "Pasture", alias_type: "synonym" },
    { for: "livestock_identifiers", alias_name: "EID Tag", alias_type: "synonym" },
    { for: "livestock_identifiers", alias_name: "Ear Tag", alias_type: "synonym" },
    { for: "animal_treatment_records", alias_name: "Medicine Record", alias_type: "synonym" },
    { for: "breeding_records", alias_name: "Calving Record", alias_type: "synonym" },
  ];
  const aliasRows = aliases.map(a => ({
    data_object_id: doid(a.for),
    alias_name: a.alias_name,
    alias_type: a.alias_type,
    is_preferred: false,
    notes: "",
  }));
  await syncJunction(
    "/data_object_aliases",
    aliasRows,
    r => `${r.data_object_id}|${r.alias_name}`,
    "data_object_id,alias_name",
  );

  // ============================================================
  // PHASE B.5 - data_object_lifecycle_states (operational_workflow masters only)
  // ============================================================
  type Lc = { do: string; module: number; states: { name: string; order: number; initial?: boolean; terminal?: boolean; gate?: boolean; verb?: string }[] };
  const lifecycles: Lc[] = [
    { do: "livestock_animals", module: HERD, states: [
      { name: "active", order: 1, initial: true },
      { name: "sold", order: 2, terminal: true, gate: true, verb: "sell_animal" },
      { name: "deceased", order: 3, terminal: true },
      { name: "culled", order: 4, terminal: true, gate: true, verb: "cull_animal" },
    ]},
    { do: "livestock_mobs", module: HERD, states: [
      { name: "open", order: 1, initial: true },
      { name: "closed", order: 2, terminal: true },
    ]},
    { do: "mob_movements", module: HERD, states: [
      { name: "planned", order: 1, initial: true },
      { name: "completed", order: 2, terminal: true, gate: true, verb: "complete_movement" },
    ]},
    { do: "breeding_records", module: HERD, states: [
      { name: "joined", order: 1, initial: true },
      { name: "pregnant", order: 2 },
      { name: "born", order: 3, terminal: true },
      { name: "failed", order: 4, terminal: true },
    ]},
    { do: "animal_treatment_records", module: HERD, states: [
      { name: "administered", order: 1, initial: true },
      { name: "within_withholding", order: 2 },
      { name: "cleared", order: 3, terminal: true, gate: true, verb: "clear_withholding" },
    ]},
    { do: "animal_sale_records", module: HERD, states: [
      { name: "draft", order: 1, initial: true },
      { name: "confirmed", order: 2, gate: true, verb: "confirm_sale" },
      { name: "settled", order: 3, terminal: true },
    ]},
    { do: "pasture_allocations", module: GRAZING, states: [
      { name: "scheduled", order: 1, initial: true },
      { name: "grazing", order: 2 },
      { name: "rested", order: 3, terminal: true },
    ]},
    { do: "grazing_plans", module: GRAZING, states: [
      { name: "draft", order: 1, initial: true },
      { name: "active", order: 2, gate: true, verb: "activate_plan" },
      { name: "completed", order: 3, terminal: true },
    ]},
  ];
  const lcRows: Row[] = [];
  for (const lc of lifecycles) {
    for (const s of lc.states) {
      lcRows.push({
        data_object_id: doid(lc.do),
        state_name: s.name,
        state_order: s.order,
        description: "",
        is_initial: s.initial ?? false,
        is_terminal: s.terminal ?? false,
        requires_permission: s.gate ?? false,
        permission_verb_override: s.verb ?? "",
        domain_module_id: lc.module,
        notes: "",
      });
    }
  }
  await syncJunction(
    "/data_object_lifecycle_states",
    lcRows,
    r => `${r.data_object_id}|${r.state_name}`,
    "data_object_id,state_name",
  );

  // ============================================================
  // PHASE B.6 - trigger_events + handoffs (outbound to FOOD-TRACE; intra-domain)
  // ============================================================
  const triggerEvents = [
    { event_name: "animal.sold", data_object: "animal_sale_records", from_state: "draft", to_state: "confirmed", event_category: "lifecycle", domain_module_id: HERD, description: "An animal or mob has been sold or sent to slaughter; the on-farm lifecycle closes and the carcass enters the downstream traceability chain." },
    { event_name: "treatment.recorded", data_object: "animal_treatment_records", from_state: "", to_state: "administered", event_category: "lifecycle", domain_module_id: HERD, description: "A treatment or medicine has been administered, opening a withholding period that gates sale and slaughter eligibility until it clears." },
    { event_name: "mob_movement.completed", data_object: "mob_movements", from_state: "planned", to_state: "completed", event_category: "state_change", domain_module_id: HERD, description: "A mob movement between paddocks or properties has completed; updates animal locations and feeds traceability-scheme movement reporting." },
    { event_name: "pasture_allocation.started", data_object: "pasture_allocations", from_state: "scheduled", to_state: "grazing", event_category: "state_change", domain_module_id: GRAZING, description: "A mob has begun grazing an allocated paddock; the grazing plan advances and the paddock's rest clock resets on exit." },
  ];
  const teRows = triggerEvents.map(t => ({
    event_name: t.event_name,
    data_object_id: doid(t.data_object),
    from_state: t.from_state,
    to_state: t.to_state,
    event_category: t.event_category,
    domain_module_id: t.domain_module_id,
    description: t.description,
  }));
  const teMap = await syncByKey("/trigger_events", teRows, "event_name");
  const teid = (name: string) => id(teMap, name);

  // Handoffs. Outbound to FOOD-TRACE (animal sold -> lot genealogy; treatment -> withholding gates
  // food safety). Intra-domain (treatment -> sale eligibility; allocation -> movement).
  const handoffs = [
    { src: DOMAIN_ID, tgt: FOODTRACE, payload: "animal_sale_records", event: "animal.sold", pattern: "api_call", friction: "high",
      src_mod: HERD, tgt_mod: null,
      description: "When an animal or mob is sold or sent to slaughter, the sale and identity records hand off to food traceability so the carcass lot can be tied back to the animal's on-farm provenance and movement history." },
    { src: DOMAIN_ID, tgt: FOODTRACE, payload: "animal_treatment_records", event: "treatment.recorded", pattern: "api_call", friction: "high",
      src_mod: HERD, tgt_mod: null,
      description: "When a treatment is recorded, its withholding period and the animals it applies to hand off to food traceability so an animal still inside a withholding window is blocked from entering the food chain." },
    { src: DOMAIN_ID, tgt: DOMAIN_ID, payload: "animal_treatment_records", event: "treatment.recorded", pattern: "lifecycle_progression", friction: "low",
      src_mod: HERD, tgt_mod: HERD,
      description: "Within the herd module, recording a treatment opens a withholding period that gates the sale record's confirm transition until the withholding clears." },
    { src: DOMAIN_ID, tgt: DOMAIN_ID, payload: "pasture_allocations", event: "pasture_allocation.started", pattern: "lifecycle_progression", friction: "low",
      src_mod: GRAZING, tgt_mod: HERD,
      description: "Starting a pasture allocation drives the corresponding mob movement into the allocated paddock, keeping animal locations consistent with the grazing plan." },
  ];
  const handoffRows = handoffs.map(h => ({
    source_domain_id: h.src,
    target_domain_id: h.tgt,
    data_object_id: doid(h.payload),
    trigger_event_id: teid(h.event),
    integration_pattern: h.pattern,
    friction_level: h.friction,
    source_domain_module_id: h.src_mod,
    target_domain_module_id: h.tgt_mod,
    description: h.description,
    notes: "",
  }));
  await syncJunction(
    "/handoffs",
    handoffRows,
    r => `${r.source_domain_id}|${r.target_domain_id}|${r.data_object_id}|${r.trigger_event_id}`,
    "source_domain_id,target_domain_id,data_object_id,trigger_event_id",
  );

  // ============================================================
  // PHASE C - business_function_domains (owner = Business Operations, mirror FMIS/DAIRY)
  // ============================================================
  const bf = await get("/business_functions?select=id,business_function_name&limit=300");
  const bfId = (name: string) => {
    const r = bf.find(x => x.business_function_name === name);
    if (!r) throw new Error(`business_function '${name}' not found`);
    return Number(r.id);
  };
  const bfdRows = [
    { business_function_id: bfId("Business Operations"), domain_id: DOMAIN_ID, responsibility_type: "owner", notes: "" },
    { business_function_id: bfId("Supply Chain"), domain_id: DOMAIN_ID, responsibility_type: "contributor", notes: "" },
    { business_function_id: bfId("Finance"), domain_id: DOMAIN_ID, responsibility_type: "consumer", notes: "" },
  ];
  await syncJunction(
    "/business_function_domains",
    bfdRows,
    r => `${r.business_function_id}|${r.domain_id}`,
    "business_function_id,domain_id",
  );

  // ============================================================
  // PHASE S - tools + domain_module_tools + one domain-grain system skill (Rule #17)
  // ============================================================
  // operation_kind: query/mutate REQUIRE data_object_id; fetch/side_effect/compute REQUIRE null.
  // coverage_tier: platform for query/mutate platform tools, else external.
  type ToolSpec = {
    tool_name: string; operation_kind: "query" | "mutate" | "fetch" | "side_effect" | "compute" | "inbound";
    data_object?: string; coverage_tier: "platform" | "external" | "integration"; description: string;
    module: number; requirement_level: "required" | "optional";
  };
  const tools: ToolSpec[] = [
    // HERD module
    { tool_name: "query_livestock_animals", operation_kind: "query", data_object: "livestock_animals", coverage_tier: "platform", description: "Read individual-animal records, including identity, status, mob, and history.", module: HERD, requirement_level: "required" },
    { tool_name: "mutate_livestock_animals", operation_kind: "mutate", data_object: "livestock_animals", coverage_tier: "platform", description: "Create and update animal records and progress their lifecycle (active, sold, culled, deceased).", module: HERD, requirement_level: "required" },
    { tool_name: "query_livestock_mobs", operation_kind: "query", data_object: "livestock_mobs", coverage_tier: "platform", description: "Read mobs and their member animals.", module: HERD, requirement_level: "required" },
    { tool_name: "mutate_livestock_mobs", operation_kind: "mutate", data_object: "livestock_mobs", coverage_tier: "platform", description: "Create, update, and close mobs and adjust membership.", module: HERD, requirement_level: "required" },
    { tool_name: "mutate_mob_movements", operation_kind: "mutate", data_object: "mob_movements", coverage_tier: "platform", description: "Plan and complete mob movements between paddocks and properties.", module: HERD, requirement_level: "required" },
    { tool_name: "mutate_animal_weight_records", operation_kind: "mutate", data_object: "animal_weight_records", coverage_tier: "platform", description: "Record weigh observations for animals and mob sessions.", module: HERD, requirement_level: "required" },
    { tool_name: "mutate_breeding_records", operation_kind: "mutate", data_object: "breeding_records", coverage_tier: "platform", description: "Record joining, pregnancy, and calving or lambing events.", module: HERD, requirement_level: "required" },
    { tool_name: "mutate_animal_treatment_records", operation_kind: "mutate", data_object: "animal_treatment_records", coverage_tier: "platform", description: "Record treatments and medicines and track withholding periods.", module: HERD, requirement_level: "required" },
    { tool_name: "mutate_animal_sale_records", operation_kind: "mutate", data_object: "animal_sale_records", coverage_tier: "platform", description: "Record sales and purchases and progress them to settled.", module: HERD, requirement_level: "required" },
    { tool_name: "query_livestock_identifiers", operation_kind: "query", data_object: "livestock_identifiers", coverage_tier: "platform", description: "Read electronic and visual identifiers and their traceability registration.", module: HERD, requirement_level: "optional" },
    { tool_name: "fetch_eid_tag_reads", operation_kind: "fetch", coverage_tier: "external", description: "Fetch electronic-identifier reads from a yard EID reader or scale-head device feed.", module: HERD, requirement_level: "optional" },
    { tool_name: "fetch_livestock_market_prices", operation_kind: "fetch", coverage_tier: "external", description: "Fetch current saleyard and market price indicators for livestock classes from an external market-price feed.", module: HERD, requirement_level: "optional" },
    { tool_name: "notify_person", operation_kind: "side_effect", coverage_tier: "external", description: "Notify a specific person (e.g. the stock manager) of a withholding clearance or a due movement.", module: HERD, requirement_level: "optional" },
    // GRAZING module
    { tool_name: "query_grazing_paddocks", operation_kind: "query", data_object: "grazing_paddocks", coverage_tier: "platform", description: "Read paddocks, their carrying capacity, and rest state.", module: GRAZING, requirement_level: "required" },
    { tool_name: "mutate_pasture_allocations", operation_kind: "mutate", data_object: "pasture_allocations", coverage_tier: "platform", description: "Allocate mobs to paddocks and progress allocations through grazing and rest.", module: GRAZING, requirement_level: "required" },
    { tool_name: "mutate_grazing_plans", operation_kind: "mutate", data_object: "grazing_plans", coverage_tier: "platform", description: "Build and activate rotational grazing plans with rest periods and stocking targets.", module: GRAZING, requirement_level: "required" },
    { tool_name: "fetch_weather_forecast", operation_kind: "fetch", coverage_tier: "external", description: "Fetch local weather and rainfall forecast to inform grazing rotation and rest-period decisions.", module: GRAZING, requirement_level: "optional" },
    { tool_name: "notify_team", operation_kind: "side_effect", coverage_tier: "external", description: "Notify the farm team of a scheduled rotation or a paddock that is ready to graze.", module: GRAZING, requirement_level: "optional" },
  ];
  const toolInsertable = tools.map(t => ({
    tool_name: t.tool_name,
    operation_kind: t.operation_kind,
    data_object_id: (t.operation_kind === "query" || t.operation_kind === "mutate") ? doid(t.data_object!) : null,
    coverage_tier: t.coverage_tier,
    description: t.description,
  }));
  const toolMap = await syncByKey("/tools", toolInsertable, "tool_name");
  const toolId = (n: string) => id(toolMap, n);

  await syncJunction(
    "/domain_module_tools",
    tools.map(t => ({ domain_module_id: t.module, tool_id: toolId(t.tool_name), requirement_level: t.requirement_level, notes: "" })),
    r => `${r.domain_module_id}|${r.tool_id}`,
    "domain_module_id,tool_id",
  );

  // One domain-grain system skill (Rule #17): domain_id set, domain_module_id NULL.
  const skillRow = {
    skill_name: "livestock-mgmt-system",
    skill_type: "system",
    domain_id: DOMAIN_ID,
    description:
      "The single agent surface for Livestock Management. Reasons across herd and grazing: animal and mob records, weights and average daily gains, breeding, treatments and withholding periods, mob movements, sales, paddocks, pasture allocations, and grazing plans. Derives its toolset from the domain's modules' tool requirements and scopes itself to the modules installed in the tenant.",
  };
  const skillMap = await syncByKey("/skills", [skillRow], "skill_name");
  const SKILL_ID = id(skillMap, "livestock-mgmt-system");

  // ============================================================
  // PHASE E - domain_roles + role_modules (>=2 modules each)
  // ============================================================
  const ownerBf = bfId("Business Operations");
  const roles = [
    { role_code: "LIVESTOCK-STATION-MANAGER", role_name: "Station Manager", business_function_id: ownerBf, description: "Runs the whole grazing operation: oversees herd performance, grazing plans, sales, and compliance across all properties and mobs.", modules: [HERD, GRAZING] },
    { role_code: "LIVESTOCK-STOCK-MANAGER", role_name: "Stock Manager", business_function_id: ownerBf, description: "Manages the animals and mobs day to day: records, weights, breeding, treatments, and movements in the yard and paddock.", modules: [HERD, GRAZING] },
    { role_code: "LIVESTOCK-GRAZIER", role_name: "Grazier", business_function_id: ownerBf, description: "Plans and executes pasture rotations: allocates paddocks, sets rest periods, and matches stocking rate to carrying capacity, moving mobs accordingly.", modules: [GRAZING, HERD] },
  ];
  const roleInsertable = roles.map(r => ({ role_code: r.role_code, role_name: r.role_name, business_function_id: r.business_function_id, description: r.description }));
  const roleMap = await syncByKey("/domain_roles", roleInsertable, "role_code");

  const roleModuleRows: Row[] = [];
  for (const r of roles) {
    r.modules.forEach((m, idx) => {
      roleModuleRows.push({ role_id: id(roleMap, r.role_code), domain_module_id: m, interaction_level: idx === 0 ? "primary" : "secondary", notes: "" });
    });
  }
  await syncJunction(
    "/role_modules",
    roleModuleRows,
    r => `${r.role_id}|${r.domain_module_id}`,
    "role_id,domain_module_id",
  );

  // process_raci: net-new APQC processes are a research carve-out; no real cross-industry PCF node
  // fits a farm/livestock-specific gated process, so we DEFER process->RACI to a b2 (do not invent
  // processes). Personas + role_modules authored above regardless (per build spec).

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log("\n== LOAD SUMMARY ==");
  console.log(`domain LIVESTOCK-MGMT id=${DOMAIN_ID}`);
  console.log(`modules: HERD=${HERD} GRAZING=${GRAZING}`);
  console.log(`system skill id=${SKILL_ID}`);
  const counts: [string, string][] = [
    ["domains", `domain_code=eq.${DOMAIN_CODE}`],
    ["capabilities", `capability_code=like.LIVESTOCK-*`],
    ["capability_domains", `domain_id=eq.${DOMAIN_ID}`],
    ["domain_modules", `domain_id=eq.${DOMAIN_ID}`],
    ["domain_module_capabilities", `domain_module_id=in.(${HERD},${GRAZING})`],
    ["data_objects", `data_object_name=in.(${masters.map(m => m.data_object_name).join(",")})`],
    ["domain_module_data_objects", `domain_module_id=in.(${HERD},${GRAZING})`],
    ["data_object_relationships", `data_object_id=in.(${masters.map(m => doid(m.data_object_name)).join(",")})`],
    ["data_object_aliases", `data_object_id=in.(${masters.map(m => doid(m.data_object_name)).join(",")})`],
    ["data_object_lifecycle_states", `domain_module_id=in.(${HERD},${GRAZING})`],
    ["trigger_events", `domain_module_id=in.(${HERD},${GRAZING})`],
    ["handoffs", `source_domain_id=eq.${DOMAIN_ID}`],
    ["business_function_domains", `domain_id=eq.${DOMAIN_ID}`],
    ["tools", `tool_name=in.(${tools.map(t => t.tool_name).join(",")})`],
    ["domain_module_tools", `domain_module_id=in.(${HERD},${GRAZING})`],
    ["skills", `domain_id=eq.${DOMAIN_ID}`],
    ["domain_roles", `role_code=like.LIVESTOCK-*`],
    ["role_modules", `domain_module_id=in.(${HERD},${GRAZING})`],
    ["solutions", `id=in.(${solutions.map(s => id(solMap, s.solution_name)).join(",")})`],
    ["solution_domains", `domain_id=eq.${DOMAIN_ID}`],
    ["vendors", `vendor_name=in.(${vendors.map(v => v.vendor_name).join(",")})`],
  ];
  for (const [table, filter] of counts) {
    const rows = await get(`/${table}?${filter}&select=id`);
    console.log(`  ${table}: ${rows.length}`);
  }
  console.log("\nUI: https://adenin.semantius.app/domain_map/domains");
  console.log("re-run is idempotent; safe to repeat if summary timed out mid-way.");
}

main().catch(e => {
  console.error("LOAD FAILED:", e.message);
  process.exit(1);
});
