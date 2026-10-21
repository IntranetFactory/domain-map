#!/usr/bin/env bun
// State-driven IDP audit fixes (2026-06-07).
//
// EXECUTE-NOW items from audits/IDP/state.yaml that do NOT depend on the
// unresolved B2-IDP-MODULE-SPLIT decision:
//   1. entity_type classification (B13): PATCH all 8 IDP masters off 'unclassified'.
//   2. Catalog UX (A4 / Rule #20): author buyer-voice catalog_tagline + catalog_description
//      on domains row id=39 (both empty, never overwrite a non-empty value).
//   3. Aliases (B11): INSERT generic vendor-neutral synonyms (alias_type='synonym').
//
// Idempotent: reads live state, only writes what's missing / still empty.
// Run from project root c:/dev/domain-map:  bun run ".tmp_deploy/fix_idp_state_2026_06_07.ts"

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
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

const DOMAIN_ID = 39;
const MASTER_IDS = [530, 531, 532, 533, 534, 535, 536, 537];

// ---------------------------------------------------------------------------
// 1. entity_type classification (B13)
// Deterministic from each master's description (Rule #12 enum):
//   operational_workflow = has a real status lifecycle / human or job workflow
//   computed             = machine-produced output with a confidence score, no workflow
//   catalog              = config-shaped reference definition
// ---------------------------------------------------------------------------
const ENTITY_TYPES: Record<number, string> = {
  530: "operational_workflow", // capture_batches: received -> in_progress -> completed -> failed
  531: "operational_workflow", // idp_extraction_models: drafted -> trained -> deployed -> degraded -> retired
  532: "computed",             // extracted_fields: machine-extracted value + extraction_confidence
  533: "operational_workflow", // extracted_records: extracted -> requires_review -> validated -> rejected -> exported
  534: "operational_workflow", // idp_validation_results: pending -> pass/fail/review + resolution_state
  535: "computed",             // document_classification_results: machine classification + classification_confidence
  536: "catalog",              // idp_extraction_templates: reusable config definition per document type
  537: "operational_workflow", // training_datasets: drafting -> labeling -> published -> superseded
};

async function fixEntityTypes() {
  console.log("== 1. entity_type classification (B13) ==");
  const live = await get(
    `/data_objects?id=in.(${MASTER_IDS.join(",")})&select=id,data_object_name,entity_type`,
  );
  let patched = 0;
  for (const r of live) {
    const id = Number(r.id);
    const target = ENTITY_TYPES[id];
    if (!target) continue;
    if (r.entity_type === target) {
      console.log(`  ${r.data_object_name}: already ${target}, skip`);
      continue;
    }
    if (r.entity_type !== "unclassified" && r.entity_type != null && r.entity_type !== "") {
      // Non-empty, non-unclassified existing value: overwrite is destructive. Surface, do not write.
      console.log(`  ${r.data_object_name}: SKIP (non-empty existing '${r.entity_type}', would be overwrite)`);
      continue;
    }
    await call({
      method: "PATCH",
      path: `/data_objects?id=eq.${id}`,
      body: { entity_type: target },
    });
    console.log(`  ${r.data_object_name}: ${r.entity_type} -> ${target}`);
    patched++;
  }
  console.log(`  patched ${patched} masters\n`);
}

// ---------------------------------------------------------------------------
// 2. Catalog UX (A4 / Rule #20) on domains row id=39
// Buyer voice (workflow + value), no vendor/product names, American English, no em-dash.
// Only written when the field is currently empty; never overwrite a non-empty value.
// ---------------------------------------------------------------------------
const CATALOG_TAGLINE =
  "Turn the documents flowing into your business into clean, structured data your systems can act on.";
const CATALOG_DESCRIPTION =
  "Intelligent Document Processing takes in documents from any channel, sorts them by type, " +
  "and pulls the key fields, tables, and signatures out of each one, then checks the results " +
  "against your business rules before handing clean records to the systems that need them. " +
  "Confidence-rated extractions move forward on their own when they are clearly correct, while " +
  "anything uncertain drops into a human review queue so a person can confirm or fix it in seconds. " +
  "Teams train the underlying models on labeled samples, watch accuracy in production, and retrain " +
  "when results start to drift, so the pipeline keeps getting more hands-off over time.";

async function fixCatalogUX() {
  console.log("== 2. Catalog UX (A4 / Rule #20) on domains row 39 ==");
  const [row] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=catalog_tagline,catalog_description`,
  );
  const body: Row = {};
  const taglineEmpty = !row.catalog_tagline || String(row.catalog_tagline).trim() === "";
  const descEmpty = !row.catalog_description || String(row.catalog_description).trim() === "";
  if (taglineEmpty) body.catalog_tagline = CATALOG_TAGLINE;
  else console.log("  catalog_tagline already set, skip (overwrite forbidden)");
  if (descEmpty) body.catalog_description = CATALOG_DESCRIPTION;
  else console.log("  catalog_description already set, skip (overwrite forbidden)");
  if (Object.keys(body).length > 0) {
    await call({ method: "PATCH", path: `/domains?id=eq.${DOMAIN_ID}`, body });
    console.log(`  wrote ${Object.keys(body).join(", ")}`);
  }
  console.log("");
}

// ---------------------------------------------------------------------------
// 3. Aliases (B11): generic vendor-neutral synonyms, alias_type='synonym'.
// No industry_id on IDP masters; all rows are plain synonyms. Idempotent on
// (data_object_id, alias_name).
// ---------------------------------------------------------------------------
const ALIASES: { data_object_id: number; alias_name: string }[] = [
  { data_object_id: 530, alias_name: "Document Batch" },
  { data_object_id: 530, alias_name: "Processing Case" },
  { data_object_id: 530, alias_name: "Document Queue" },
  { data_object_id: 533, alias_name: "Extraction" },
  { data_object_id: 533, alias_name: "Processed Document" },
  { data_object_id: 533, alias_name: "Analysis Result" },
  { data_object_id: 532, alias_name: "Extracted Value" },
  { data_object_id: 532, alias_name: "Detected Entity" },
  { data_object_id: 531, alias_name: "Document Processor" },
  { data_object_id: 531, alias_name: "Custom Extraction Model" },
  { data_object_id: 534, alias_name: "Validation Case" },
  { data_object_id: 534, alias_name: "Review Item" },
  { data_object_id: 535, alias_name: "Classification Result" },
  { data_object_id: 535, alias_name: "Document Classification" },
];

async function fixAliases() {
  console.log("== 3. Aliases (B11) generic synonyms ==");
  const live = await get(
    `/data_object_aliases?data_object_id=in.(${MASTER_IDS.join(",")})&select=data_object_id,alias_name`,
  );
  const existing = new Set(
    live.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`),
  );
  const missing = ALIASES.filter(
    a => !existing.has(`${a.data_object_id}|${a.alias_name.toLowerCase()}`),
  ).map(a => ({
    data_object_id: a.data_object_id,
    alias_name: a.alias_name,
    alias_type: "synonym",
    is_preferred: false,
  }));
  if (missing.length > 0) {
    await insert("/data_object_aliases", missing);
    console.log(`  inserted ${missing.length} alias rows (${live.length} existed)`);
  } else {
    console.log(`  all ${ALIASES.length} aliases already present, nothing to insert`);
  }
  console.log("");
}

async function main() {
  await fixEntityTypes();
  await fixCatalogUX();
  await fixAliases();

  // Verification
  console.log("== verification ==");
  const dobjs = await get(
    `/data_objects?id=in.(${MASTER_IDS.join(",")})&select=id,data_object_name,entity_type&order=id`,
  );
  const unclassified = dobjs.filter(r => r.entity_type === "unclassified");
  console.log(`  masters still unclassified: ${unclassified.length}`);
  for (const r of dobjs) console.log(`    ${r.data_object_name}: ${r.entity_type}`);
  const [dom] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=catalog_tagline,catalog_description`,
  );
  console.log(`  catalog_tagline set: ${!!dom.catalog_tagline && String(dom.catalog_tagline).trim() !== ""}`);
  console.log(`  catalog_description set: ${!!dom.catalog_description && String(dom.catalog_description).trim() !== ""}`);
  const aliases = await get(
    `/data_object_aliases?data_object_id=in.(${MASTER_IDS.join(",")})&select=data_object_id`,
  );
  console.log(`  total IDP alias rows: ${aliases.length}`);

  console.log("\n== UI links ==");
  console.log("  https://tests.semantius.app/domain_map/data_objects");
  console.log("  https://tests.semantius.app/domain_map/domains");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
