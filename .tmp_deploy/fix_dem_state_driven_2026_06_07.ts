#!/usr/bin/env bun
// State-driven DEM (domain_id=83) execute pass, 2026-06-07.
// Domain-map-analyst Validate mode (SKILL.md Rule #21). Idempotent; all new rows
// default record_status='new' (Rule #1). Never writes the `notes` column (Rule #15).
// No em-dashes; American English (CLAUDE.md).
//
// Executes ONLY the open state items that are additive/corrective, non-destructive,
// and NOT gated on the (unbuilt) module set:
//   1. entity_type PATCH on the 5 DEM masters (B13 / Rule #12), unclassified -> typed enum.
//   2. Rule #20 catalog_tagline + catalog_description on domains.id=83 (both empty).
//   3. event_category empty-field backfill on trigger_events 677-681.
//   4. B1A-B6: 4 intra-domain master-to-master data_object_relationships.
//
// Run from project root:  bun run ".tmp_deploy/fix_dem_state_driven_2026_06_07.ts"

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

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
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
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

const DOMAIN_ID = 83;

// ------------------------------------------------------------------
// 1. entity_type PATCH (B13 / Rule #12)
// ------------------------------------------------------------------
const entityTypeMap: Record<number, string> = {
  585: "computed", // endpoint_experience_scores: rolling aggregated quality-of-experience metric
  586: "operational_record", // synthetic_monitoring_results: append-only probe-run results
  587: "operational_record", // real_user_sessions: append-only RUM session telemetry
  588: "operational_record", // digital_friction_events: append-only detected friction events
  589: "operational_workflow", // endpoint_anomaly_findings: detect / acknowledge / resolve / suppress workflow
};

async function fixEntityType() {
  console.log("\n== 1. entity_type PATCH ==");
  const live = await get(
    `/data_objects?id=in.(${Object.keys(entityTypeMap).join(",")})&select=id,data_object_name,entity_type`,
  );
  let patched = 0;
  for (const r of live) {
    const id = Number(r.id);
    const want = entityTypeMap[id];
    if (!want) continue;
    if (r.entity_type === want) {
      console.log(`  ${r.data_object_name}: already '${want}', skip`);
      continue;
    }
    if (r.entity_type !== "unclassified" && r.entity_type !== null && r.entity_type !== "") {
      // Non-unclassified, non-empty existing value: would be a destructive overwrite. Skip + warn.
      console.log(
        `  ${r.data_object_name}: existing='${r.entity_type}' is non-unclassified; NOT overwriting (would be destructive).`,
      );
      continue;
    }
    await patch(`/data_objects?id=eq.${id}`, { entity_type: want });
    console.log(`  ${r.data_object_name}: '${r.entity_type}' -> '${want}'`);
    patched++;
  }
  console.log(`  entity_type rows patched: ${patched}`);
  return patched;
}

// ------------------------------------------------------------------
// 2. Rule #20 catalog text on domains.id=83 (only if empty)
// ------------------------------------------------------------------
const CATALOG_TAGLINE =
  "See the digital experience your people and customers actually get, before they file a ticket.";
const CATALOG_DESCRIPTION =
  "Digital Experience Monitoring tells you whether the apps, devices, and SaaS your workforce and customers rely on are fast, available, and frustration-free. It runs synthetic checks from the locations that matter, captures real session telemetry, scores endpoint and application responsiveness, and flags friction and anomalies the moment they degrade the experience. Use it to catch slowdowns proactively, route the right signal to incident and operations teams, and prove that reachability and responsiveness meet the bar your business expects.";

async function fixCatalogText() {
  console.log("\n== 2. Rule #20 catalog text ==");
  const [d] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=id,catalog_tagline,catalog_description`,
  );
  if (!d) throw new Error("domain 83 not found");
  const body: Row = {};
  const tagline = String(d.catalog_tagline ?? "").trim();
  const desc = String(d.catalog_description ?? "").trim();
  if (tagline === "") body.catalog_tagline = CATALOG_TAGLINE;
  else console.log(`  catalog_tagline already set; NOT overwriting.`);
  if (desc === "") body.catalog_description = CATALOG_DESCRIPTION;
  else console.log(`  catalog_description already set; NOT overwriting.`);
  if (Object.keys(body).length === 0) {
    console.log("  nothing to write");
    return 0;
  }
  await patch(`/domains?id=eq.${DOMAIN_ID}`, body);
  console.log(`  wrote: ${Object.keys(body).join(", ")}`);
  return Object.keys(body).length;
}

// ------------------------------------------------------------------
// 3. event_category empty-field backfill on 677-681
// ------------------------------------------------------------------
const eventCategoryMap: Record<number, string> = {
  677: "state_change", // endpoint_experience_score.degraded
  678: "state_change", // synthetic_monitoring_result.failed
  679: "signal", // real_user_session.poor_experience (telemetry degradation signal)
  680: "signal", // digital_friction_event.recorded (telemetry signal)
  681: "lifecycle", // endpoint_anomaly_finding.published (publication lifecycle step)
};

async function fixEventCategory() {
  console.log("\n== 3. event_category backfill ==");
  const live = await get(
    `/trigger_events?id=in.(${Object.keys(eventCategoryMap).join(",")})&select=id,event_name,event_category`,
  );
  let patched = 0;
  for (const r of live) {
    const id = Number(r.id);
    const want = eventCategoryMap[id];
    if (!want) continue;
    const cur = String(r.event_category ?? "").trim();
    if (cur !== "") {
      console.log(`  ${r.event_name}: already '${cur}'; NOT overwriting.`);
      continue;
    }
    await patch(`/trigger_events?id=eq.${id}`, { event_category: want });
    console.log(`  ${r.event_name}: '' -> '${want}'`);
    patched++;
  }
  console.log(`  event_category rows patched: ${patched}`);
  return patched;
}

// ------------------------------------------------------------------
// 4. B1A-B6: 4 intra-domain master-to-master data_object_relationships
// ------------------------------------------------------------------
type RelSpec = {
  src: number;
  srcName: string;
  tgt: number;
  tgtName: string;
  verb: string;
  inverse: string;
  rtype: string;
};
const relSpecs: RelSpec[] = [
  { src: 588, srcName: "digital_friction_events", tgt: 585, tgtName: "endpoint_experience_scores", verb: "contributes_to", inverse: "aggregated_from", rtype: "many_to_many" },
  { src: 587, srcName: "real_user_sessions", tgt: 585, tgtName: "endpoint_experience_scores", verb: "contributes_to", inverse: "aggregated_from", rtype: "many_to_many" },
  { src: 586, srcName: "synthetic_monitoring_results", tgt: 585, tgtName: "endpoint_experience_scores", verb: "contributes_to", inverse: "aggregated_from", rtype: "many_to_many" },
  { src: 589, srcName: "endpoint_anomaly_findings", tgt: 588, tgtName: "digital_friction_events", verb: "correlates_with", inverse: "correlates_with", rtype: "many_to_many" },
];

async function fixIntraDomainRels() {
  console.log("\n== 4. B1A-B6 intra-domain data_object_relationships ==");
  const existing = await get(
    `/data_object_relationships?data_object_id=in.(585,586,587,588,589)&select=data_object_id,related_data_object_id,relationship_verb`,
  );
  const seen = new Set(
    existing.map(r => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`),
  );
  const toInsert: Row[] = [];
  for (const s of relSpecs) {
    const key = `${s.src}|${s.tgt}|${s.verb}`;
    if (seen.has(key)) {
      console.log(`  ${s.srcName} ${s.verb} ${s.tgtName}: already present, skip`);
      continue;
    }
    toInsert.push({
      data_object_relationship_label: `${s.srcName} ${s.verb} ${s.tgtName}`,
      data_object_id: s.src,
      related_data_object_id: s.tgt,
      relationship_type: s.rtype,
      relationship_kind: "association",
      relationship_verb: s.verb,
      inverse_verb: s.inverse,
      is_required: false,
      owner_side: "source",
    });
  }
  if (toInsert.length === 0) {
    console.log("  nothing to insert");
    return 0;
  }
  const out = await insert("/data_object_relationships", toInsert);
  console.log(`  inserted ${out.length} relationship rows: ids ${out.map(r => r.id).join(", ")}`);
  return out.length;
}

// ------------------------------------------------------------------
async function main() {
  const c1 = await fixEntityType();
  const c2 = await fixCatalogText();
  const c3 = await fixEventCategory();
  const c4 = await fixIntraDomainRels();
  console.log("\n== SUMMARY ==");
  console.log(`  entity_type patched:        ${c1}`);
  console.log(`  catalog fields written:     ${c2}`);
  console.log(`  event_category patched:     ${c3}`);
  console.log(`  intra-domain rels inserted: ${c4}`);
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(585,586,587,588,589)");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.83");
  console.log("  https://tests.semantius.app/domain_map/trigger_events?id=in.(677,678,679,680,681)");
  console.log("  https://tests.semantius.app/domain_map/data_object_relationships?data_object_id=in.(585,586,587,588,589)");
}

main().catch(e => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
