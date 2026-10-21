#!/usr/bin/env bun
// MFG-OPS state-driven Validate execute (2026-06-07).
//
// Executes the additive/corrective open items from audits/MFG-OPS/state.yaml
// that are independent of the unresolved module-split decision (B2-MODULE-SPLIT):
//
//   B13 entity_type   PATCH 7 masters from 'unclassified' to the Rule #12 enum.
//   A4  catalog UX    Author catalog_tagline + catalog_description on domain 47
//                     (both empty). Rule #20 buyer-voice; record_status carries
//                     the review signal. No module-level M8 (0 domain_modules).
//   B11 aliases       INSERT generic industry synonyms across the 7 masters
//                     (alias_type='synonym'; no industry_id available).
//   B1A-S10           INSERT 5 intra-domain data_object_relationships edges.
//   B1A-S11           INSERT users (id 748) actor edges across the 7 masters.
//
// Surfaced (NOT written here): B1A-S12 (cross-domain mirror rows: target-side
// consuming data_objects are not enumerated for handoffs 950/951/954 and the one
// enumerated row, 952 -> service_incidents, is gated on B2-SHOP-FLOOR-CASES-ITSM);
// B1A-S13 (pattern-flag PATCH proposals); all b2; personas (Phase P, unbuilt).
//
// Idempotent: every section reads live state and inserts only what is missing.
// record_status omitted on all writes (defaults to 'new', Rule #1). No 'notes'
// column is ever written (Rule #15). No em-dash; American English.

import { $ } from "bun";
$.throws(false);

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
    const err = stderr.trim();
    if (err.includes("required audience not found")) {
      console.error(
        "\n*** JWT AUDIENCE ERROR. STOPPING per SKILL Rule #6 ***\n" +
          err +
          "\nCommand body: " +
          JSON.stringify(body) +
          "\n",
      );
      process.exit(2);
    }
    throw new Error(`semantius call failed (exit ${exitCode}): ${err}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map((r) => {
    const out: Row = {};
    for (const k of keys)
      out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return out;
  });
}

async function post(path: string, body: Row[]): Promise<Row[]> {
  if (body.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < body.length; i += CHUNK) {
    const slice = uniformize(body.slice(i, i + CHUNK));
    const res = await call({ method: "POST", path, body: slice });
    out.push(...res);
  }
  return out;
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

const MASTERS = {
  production_orders: 595,
  work_instructions: 596,
  production_schedules: 597,
  produced_units: 598,
  production_downtime_events: 599,
  production_quality_inspections: 600,
  shop_floor_cases: 601,
};
const USERS_ID = 748;

// ============================================================
// B13  PATCH data_objects.entity_type (Rule #12 enum)
// ============================================================
async function fixEntityType() {
  console.log("\n[B13] PATCH entity_type on 7 MFG-OPS masters");
  // Deterministic from each master's live description.
  const want: Record<number, string> = {
    595: "operational_workflow", // release-to-floor work unit; supervisor-gated lifecycle
    596: "operational_workflow", // authored / approved / locked / revised instruction
    597: "operational_workflow", // planned then published build plan
    598: "operational_record",   // immutable as-built traceability record
    599: "operational_record",   // logged stoppage event with reason / resolution
    600: "operational_workflow", // inspection with pass/fail disposition + hold/release gate
    601: "operational_workflow", // open / assign / resolve case workflow
  };
  const ids = Object.keys(want).map(Number);
  const live = await get(
    `/data_objects?id=in.(${ids.join(",")})&select=id,data_object_name,entity_type`,
  );
  let patched = 0;
  for (const r of live) {
    const id = Number(r.id);
    const target = want[id];
    const current = String(r.entity_type ?? "");
    if (current === target) continue;
    if (current !== "unclassified" && current !== "") {
      console.log(
        `  SKIP ${r.data_object_name} (${id}): entity_type already '${current}', not overwriting`,
      );
      continue;
    }
    await patch(`/data_objects?id=eq.${id}`, { entity_type: target });
    console.log(`  ${r.data_object_name} (${id}): '${current}' -> '${target}'`);
    patched++;
  }
  if (patched === 0) console.log("  all 7 already classified; no PATCH issued");
  return patched;
}

// ============================================================
// A4  Catalog UX on domain 47 (Rule #20). Only write empty fields.
// ============================================================
async function fixCatalogUX() {
  console.log("\n[A4] Author catalog_tagline + catalog_description on domain 47");
  const [d] = await get(
    "/domains?id=eq.47&select=id,catalog_tagline,catalog_description",
  );
  if (!d) throw new Error("domain 47 not found");
  const tagline =
    "Run the shop floor in real time, from order release to the as-built record.";
  const description =
    "Manufacturing operations turns released production orders into finished, traceable units. " +
    "Schedulers sequence work across lines and cells, operators follow current work instructions step by step, " +
    "and every build is captured as an as-built record with its lot and serial. " +
    "Quality inspections gate pass, fail, and hold decisions at the point of build, downtime and stoppages are logged " +
    "for live OEE, and shop-floor cases route operator escalations to the problem-solving team. " +
    "The result is a connected floor where plant managers, supervisors, operators, and quality inspectors share one " +
    "live view of what is being built, how fast, and at what quality.";
  const body: Row = {};
  if (String(d.catalog_tagline ?? "") === "") body.catalog_tagline = tagline;
  else console.log("  catalog_tagline already set; not overwriting");
  if (String(d.catalog_description ?? "") === "")
    body.catalog_description = description;
  else console.log("  catalog_description already set; not overwriting");
  if (Object.keys(body).length === 0) {
    console.log("  nothing to write");
    return 0;
  }
  await patch("/domains?id=eq.47", body);
  console.log(`  wrote ${Object.keys(body).join(", ")}`);
  return Object.keys(body).length;
}

// ============================================================
// B11  data_object_aliases (generic synonyms, alias_type='synonym')
// ============================================================
async function fixAliases() {
  console.log("\n[B11] INSERT generic synonyms across 7 masters");
  const specs: { data_object_id: number; alias_name: string }[] = [
    // production_orders
    { data_object_id: 595, alias_name: "Work Order" },
    { data_object_id: 595, alias_name: "Manufacturing Order" },
    { data_object_id: 595, alias_name: "MO" },
    { data_object_id: 595, alias_name: "WO" },
    // work_instructions
    { data_object_id: 596, alias_name: "Standard Operating Procedure" },
    { data_object_id: 596, alias_name: "SOP" },
    { data_object_id: 596, alias_name: "Build Instruction" },
    { data_object_id: 596, alias_name: "Routing Step" },
    // production_schedules
    { data_object_id: 597, alias_name: "Line Schedule" },
    { data_object_id: 597, alias_name: "Dispatch List" },
    { data_object_id: 597, alias_name: "Production Sequence" },
    // produced_units
    { data_object_id: 598, alias_name: "Build Record" },
    { data_object_id: 598, alias_name: "As-Built" },
    { data_object_id: 598, alias_name: "Serial Record" },
    // production_downtime_events
    { data_object_id: 599, alias_name: "Downtime Log" },
    { data_object_id: 599, alias_name: "Line Stoppage" },
    { data_object_id: 599, alias_name: "OEE Downtime" },
    // production_quality_inspections
    { data_object_id: 600, alias_name: "In-Process Inspection" },
    { data_object_id: 600, alias_name: "IPI" },
    { data_object_id: 600, alias_name: "Source Inspection" },
    // shop_floor_cases
    { data_object_id: 601, alias_name: "Andon Event" },
    { data_object_id: 601, alias_name: "Floor Escalation" },
    { data_object_id: 601, alias_name: "Escalation Ticket" },
  ];
  const ids = [...new Set(specs.map((s) => s.data_object_id))];
  const existing = await get(
    `/data_object_aliases?data_object_id=in.(${ids.join(",")})&select=data_object_id,alias_name`,
  );
  const seen = new Set(
    existing.map(
      (r) => `${r.data_object_id}::${String(r.alias_name).toLowerCase()}`,
    ),
  );
  const missing = specs.filter(
    (s) => !seen.has(`${s.data_object_id}::${s.alias_name.toLowerCase()}`),
  );
  console.log(
    `  ${specs.length} proposed; ${specs.length - missing.length} already present; ${missing.length} to insert`,
  );
  if (missing.length === 0) return 0;
  const rows = missing.map((s) => ({
    data_object_id: s.data_object_id,
    alias_name: s.alias_name,
    alias_type: "synonym",
    is_preferred: false,
  }));
  await post("/data_object_aliases", rows);
  console.log(`  inserted ${rows.length} aliases`);
  return rows.length;
}

// ============================================================
// B1A-S10  intra-domain data_object_relationships (5 edges)
// ============================================================
async function fixIntraEdges() {
  console.log("\n[B1A-S10] INSERT 5 intra-domain data_object_relationships");
  // owner_side='source' = the row's data_object_id side owns the FK.
  // Valid cardinality enum: one_to_one / one_to_many / many_to_many.
  // relationship_type reads source -> target. The "many_to_one" intent is
  // expressed by anchoring the "one" side as data_object_id with one_to_many
  // and placing the FK with owner_side='target'.
  const edges = [
    {
      // one production_order executes many work_instructions (steps)
      data_object_id: MASTERS.production_orders,
      related_data_object_id: MASTERS.work_instructions,
      relationship_verb: "executes",
      inverse_verb: "is executed by",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      is_required: false,
      owner_side: "target",
    },
    {
      // one production_order produces many produced_units
      data_object_id: MASTERS.production_orders,
      related_data_object_id: MASTERS.produced_units,
      relationship_verb: "produces",
      inverse_verb: "is produced by",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      is_required: false,
      owner_side: "target",
    },
    {
      // one production_schedule sequences many production_orders
      data_object_id: MASTERS.production_schedules,
      related_data_object_id: MASTERS.production_orders,
      relationship_verb: "sequences",
      inverse_verb: "is scheduled in",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      is_required: false,
      owner_side: "target",
    },
    {
      // one produced_unit is inspected by many production_quality_inspections
      data_object_id: MASTERS.produced_units,
      related_data_object_id: MASTERS.production_quality_inspections,
      relationship_verb: "is inspected by",
      inverse_verb: "inspects",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      is_required: false,
      owner_side: "target",
    },
    {
      // one production_order raises many shop_floor_cases
      data_object_id: MASTERS.production_orders,
      related_data_object_id: MASTERS.shop_floor_cases,
      relationship_verb: "raises",
      inverse_verb: "is raised against",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      is_required: false,
      owner_side: "target",
    },
  ];
  return insertEdges(edges);
}

// ============================================================
// B1A-S11  users actor edges across the 7 masters
// ============================================================
async function fixUserEdges() {
  console.log("\n[B1A-S11] INSERT users actor edges across 7 masters");
  // Canonical users-edge convention (ids 1847-1855): master is data_object_id,
  // users (748) is related_data_object_id, relationship_type='many_to_many',
  // owner_side='source', verb on the master ("released by"), inverse from user.
  const mk = (
    masterId: number,
    verb: string,
    inverse: string,
  ): Row => ({
    data_object_id: masterId,
    related_data_object_id: USERS_ID,
    relationship_verb: verb,
    inverse_verb: inverse,
    relationship_type: "many_to_many",
    relationship_kind: "reference",
    is_required: false,
    owner_side: "source",
  });
  const edges: Row[] = [
    mk(MASTERS.production_orders, "released by", "releases"),
    mk(MASTERS.work_instructions, "authored by", "authors"),
    mk(MASTERS.work_instructions, "approved by", "approves"),
    mk(MASTERS.production_schedules, "planned by", "plans"),
    mk(MASTERS.produced_units, "operated by", "operates"),
    mk(MASTERS.production_downtime_events, "recorded by", "records"),
    mk(MASTERS.production_quality_inspections, "inspected by", "inspects"),
    mk(MASTERS.shop_floor_cases, "opened by", "opens"),
    mk(MASTERS.shop_floor_cases, "assigned to", "is assigned"),
  ];
  return insertEdges(edges);
}

// Shared: idempotent insert into data_object_relationships keyed on
// (data_object_id, related_data_object_id, relationship_verb).
async function insertEdges(edges: Row[]): Promise<number> {
  const srcIds = [...new Set(edges.map((e) => Number(e.data_object_id)))];
  const existing = await get(
    `/data_object_relationships?data_object_id=in.(${srcIds.join(",")})&select=data_object_id,related_data_object_id,relationship_verb`,
  );
  const seen = new Set(
    existing.map(
      (r) =>
        `${r.data_object_id}::${r.related_data_object_id}::${String(r.relationship_verb).toLowerCase()}`,
    ),
  );
  const missing = edges.filter(
    (e) =>
      !seen.has(
        `${e.data_object_id}::${e.related_data_object_id}::${String(e.relationship_verb).toLowerCase()}`,
      ),
  );
  console.log(
    `  ${edges.length} proposed; ${edges.length - missing.length} already present; ${missing.length} to insert`,
  );
  if (missing.length === 0) return 0;
  await post("/data_object_relationships", missing);
  console.log(`  inserted ${missing.length} relationship edges`);
  return missing.length;
}

const main = async () => {
  console.log("=== MFG-OPS state-driven execute. 2026-06-07 ===");
  const counts = {
    entity_type: await fixEntityType(),
    catalog_ux: await fixCatalogUX(),
    aliases: await fixAliases(),
    intra_edges: await fixIntraEdges(),
    user_edges: await fixUserEdges(),
  };
  console.log("\n=== Summary ===");
  console.log(JSON.stringify(counts, null, 2));
  console.log("\nDone. Re-run safe (idempotent).");
};

await main();
