#!/usr/bin/env bun
// BI state-driven Validate execute pass (2026-06-07).
// Executes the additive/corrective open items from audits/BI/state.yaml that are
// fully specified, intra-domain, and unblocked:
//   1. entity_type PATCH on the 5 BI masters (unclassified -> Rule #12 enum).
//   2. Catalog UX (Rule #20): author buyer-voice catalog_tagline + catalog_description
//      on the BI domain row (both currently empty). No module copy: 0 modules.
//   3. Intra-domain data_object_relationships (B1A-S4 / B6): 6 edges among the 5
//      masters, fully specified in state.yaml.
//   4. Generic-synonym aliases (B1A-S8 / B11) on the 5 masters. ONLY industry-generic
//      synonyms (no vendor/product names per Rule #18); alias_type='synonym'.
//
// Idempotent: reads live state before each write, inserts/patches only what is missing.
// All writes land at record_status='new' (Rule #1, omitted -> default 'new').
// No DELETE, no overwrite of a non-empty value, no record_status flip.

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

const DOMAIN_ID = 74;
// Master ids
const SEMANTIC_METRICS = 230;
const BI_REPORTS = 691;
const BI_DASHBOARDS = 692;
const BI_QUERIES = 693;
const BI_SUBSCRIPTIONS = 694;

// ============================================================
// 1. entity_type PATCH (Rule #12 enum). BI is analytics-heavy.
// ============================================================
const entityTypeMap: Record<number, string> = {
  [SEMANTIC_METRICS]: "computed",          // certified/derived measurement definition
  [BI_REPORTS]: "operational_workflow",    // draft->published->deprecated->archived (publish gate)
  [BI_DASHBOARDS]: "operational_workflow", // draft->published->shared_externally->archived
  [BI_QUERIES]: "catalog",                 // reusable saved-query definition/template
  [BI_SUBSCRIPTIONS]: "operational_workflow", // active->paused->failed->cancelled
};

async function patchEntityTypes(): Promise<number> {
  const ids = Object.keys(entityTypeMap).map(Number);
  const live = await get(`/data_objects?id=in.(${ids.join(",")})&select=id,entity_type`);
  let patched = 0;
  for (const r of live) {
    const id = Number(r.id);
    const target = entityTypeMap[id];
    if (!target) continue;
    if (r.entity_type === target) continue;
    if (r.entity_type !== "unclassified") {
      console.log(`  SKIP ${id}: entity_type='${r.entity_type}' already typed (not unclassified)`);
      continue;
    }
    await call({ method: "PATCH", path: `/data_objects?id=eq.${id}`, body: { entity_type: target } });
    patched++;
    console.log(`  PATCH ${id} entity_type -> ${target}`);
  }
  return patched;
}

// ============================================================
// 2. Catalog UX (Rule #20) on the domain row. No vendor names, no em-dash.
// ============================================================
const BI_TAGLINE =
  "Turn governed data into reports and dashboards your whole organization can explore, then deliver the answers to the people who need them on a schedule.";

const BI_DESCRIPTION =
  "Business intelligence and analytics gives teams a self-service way to ask questions of their data without waiting on engineering. Analysts build saved queries against a governed semantic layer, assemble the results into reports and interactive dashboards, and publish them for the wider business to explore on their own.\n\n" +
  "Shared metric definitions keep everyone working from the same numbers, so a figure on a sales dashboard means the same thing as the one in a finance report. Content moves through a clear lifecycle, from draft to published to certified, and access controls decide who can view, edit, or share each artifact, including when something is shared outside the company.\n\n" +
  "Once content is live, subscriptions push reports and dashboard snapshots to inboxes on a recurring cadence, and failures or runaway queries raise signals that operations and cost teams can act on. The result is a single place to author, govern, and distribute analytics, turning raw data into decisions that the business can trust.";

async function patchCatalogUx(): Promise<number> {
  const [dom] = await get(`/domains?id=eq.${DOMAIN_ID}&select=id,catalog_tagline,catalog_description`);
  if (!dom) throw new Error("BI domain row not found");
  const body: Row = {};
  if (!dom.catalog_tagline || String(dom.catalog_tagline).trim() === "") {
    body.catalog_tagline = BI_TAGLINE;
  } else {
    console.log("  SKIP catalog_tagline: already populated");
  }
  if (!dom.catalog_description || String(dom.catalog_description).trim() === "") {
    body.catalog_description = BI_DESCRIPTION;
  } else {
    console.log("  SKIP catalog_description: already populated");
  }
  if (Object.keys(body).length === 0) return 0;
  await call({ method: "PATCH", path: `/domains?id=eq.${DOMAIN_ID}`, body });
  console.log(`  PATCH domain ${DOMAIN_ID} catalog UX: ${Object.keys(body).join(", ")}`);
  return Object.keys(body).length;
}

// ============================================================
// 3. Intra-domain data_object_relationships (B1A-S4 / B6). 6 edges.
//    owner_side names the FK-holding side (source). All reference-kind.
// ============================================================
type RelSpec = {
  data_object_id: number;
  related_data_object_id: number;
  relationship_verb: string;
  inverse_verb: string;
  relationship_type: string;
  relationship_kind: string;
  is_required: boolean;
  owner_side: string;
};

const relSpecs: RelSpec[] = [
  // a saved query is the source of one or more reports
  { data_object_id: BI_QUERIES, related_data_object_id: BI_REPORTS, relationship_verb: "feeds", inverse_verb: "is_sourced_from", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  // a saved query backs dashboard tiles
  { data_object_id: BI_QUERIES, related_data_object_id: BI_DASHBOARDS, relationship_verb: "feeds", inverse_verb: "is_sourced_from", relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  // a subscription delivers a report on a cadence
  { data_object_id: BI_REPORTS, related_data_object_id: BI_SUBSCRIPTIONS, relationship_verb: "is_delivered_by", inverse_verb: "delivers", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  // a subscription delivers a dashboard snapshot on a cadence
  { data_object_id: BI_DASHBOARDS, related_data_object_id: BI_SUBSCRIPTIONS, relationship_verb: "is_delivered_by", inverse_verb: "delivers", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  // saved queries reference certified metrics by name
  { data_object_id: SEMANTIC_METRICS, related_data_object_id: BI_QUERIES, relationship_verb: "is_referenced_by", inverse_verb: "references", relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
  // KPI tiles render metrics directly
  { data_object_id: SEMANTIC_METRICS, related_data_object_id: BI_DASHBOARDS, relationship_verb: "is_rendered_on", inverse_verb: "renders", relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
];

async function insertRelationships(): Promise<number> {
  // Pull every relationship among the 5 masters and dedupe on the unordered pair.
  const ids = [SEMANTIC_METRICS, BI_REPORTS, BI_DASHBOARDS, BI_QUERIES, BI_SUBSCRIPTIONS];
  const existing = await get(
    `/data_object_relationships?and=(data_object_id.in.(${ids.join(",")}),related_data_object_id.in.(${ids.join(",")}))&select=data_object_id,related_data_object_id`,
  );
  const pair = (a: number, b: number) => [a, b].sort((x, y) => x - y).join("|");
  const have = new Set(existing.map(r => pair(Number(r.data_object_id), Number(r.related_data_object_id))));
  const missing = relSpecs.filter(s => !have.has(pair(s.data_object_id, s.related_data_object_id)));
  if (missing.length === 0) {
    console.log("  data_object_relationships: all present, nothing to insert");
    return 0;
  }
  await insert("/data_object_relationships", missing as unknown as Row[]);
  console.log(`  inserted ${missing.length} intra-domain relationship rows`);
  return missing.length;
}

// ============================================================
// 4. Generic-synonym aliases (B1A-S8 / B11). No vendor/product names (Rule #18).
//    alias_type='synonym' (live enum; 'vendor_synonym' from state.yaml is NOT a
//    valid value in this catalog). Vendor-product labels (Look, Liveboard,
//    Paginated Report, Master Item, App, Page, Explore, Story) are deferred:
//    they map to solutions and are out of the generic-synonym EXECUTE scope.
// ============================================================
const aliasSpecs: { data_object_id: number; alias_name: string }[] = [
  { data_object_id: BI_REPORTS, alias_name: "Reports" },
  { data_object_id: BI_REPORTS, alias_name: "Analytical Reports" },
  { data_object_id: BI_DASHBOARDS, alias_name: "Dashboards" },
  { data_object_id: BI_DASHBOARDS, alias_name: "Analytics Dashboards" },
  { data_object_id: BI_QUERIES, alias_name: "Saved Queries" },
  { data_object_id: BI_QUERIES, alias_name: "Analytical Queries" },
  { data_object_id: BI_SUBSCRIPTIONS, alias_name: "Subscriptions" },
  { data_object_id: BI_SUBSCRIPTIONS, alias_name: "Report Subscriptions" },
  { data_object_id: SEMANTIC_METRICS, alias_name: "Metrics" },
  { data_object_id: SEMANTIC_METRICS, alias_name: "Business Metrics" },
  { data_object_id: SEMANTIC_METRICS, alias_name: "Measures" },
  { data_object_id: SEMANTIC_METRICS, alias_name: "KPIs" },
];

async function insertAliases(): Promise<number> {
  const ids = [...new Set(aliasSpecs.map(a => a.data_object_id))];
  const existing = await get(
    `/data_object_aliases?data_object_id=in.(${ids.join(",")})&select=data_object_id,alias_name`,
  );
  const have = new Set(existing.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`));
  const missing = aliasSpecs
    .filter(a => !have.has(`${a.data_object_id}|${a.alias_name.toLowerCase()}`))
    .map(a => ({
      data_object_id: a.data_object_id,
      alias_name: a.alias_name,
      alias_type: "synonym",
      is_preferred: false,
    }));
  if (missing.length === 0) {
    console.log("  aliases: all present, nothing to insert");
    return 0;
  }
  await insert("/data_object_aliases", missing);
  console.log(`  inserted ${missing.length} alias rows`);
  return missing.length;
}

// ============================================================
// Run
// ============================================================
console.log("== BI state-driven execute 2026-06-07 ==");
console.log("\n[1] entity_type PATCH");
const nEntity = await patchEntityTypes();
console.log("\n[2] catalog UX");
const nCatalog = await patchCatalogUx();
console.log("\n[3] intra-domain relationships");
const nRel = await insertRelationships();
console.log("\n[4] generic aliases");
const nAlias = await insertAliases();

console.log("\n== Summary ==");
console.log(`entity_type patched: ${nEntity}`);
console.log(`catalog UX fields written: ${nCatalog}`);
console.log(`intra-domain relationships inserted: ${nRel}`);
console.log(`aliases inserted: ${nAlias}`);

// Verify
console.log("\n== Verify ==");
const verifyEnt = await get(
  "/data_objects?id=in.(230,691,692,693,694)&select=id,data_object_name,entity_type&order=id",
);
for (const r of verifyEnt) console.log(`  ${r.id} ${r.data_object_name}: ${r.entity_type}`);
const [vdom] = await get(`/domains?id=eq.${DOMAIN_ID}&select=catalog_tagline,catalog_description`);
console.log(`  catalog_tagline empty? ${!vdom.catalog_tagline}`);
console.log(`  catalog_description empty? ${!vdom.catalog_description}`);
const vrel = await get(
  "/data_object_relationships?and=(data_object_id.in.(230,691,692,693,694),related_data_object_id.in.(230,691,692,693,694))&select=data_object_id,related_data_object_id,relationship_verb&order=id",
);
console.log(`  intra-domain relationships now: ${vrel.length}`);
const valias = await get(
  "/data_object_aliases?data_object_id=in.(230,691,692,693,694)&select=data_object_id,alias_name&order=data_object_id",
);
console.log(`  total BI master aliases now: ${valias.length}`);

console.log("\nDone.");
