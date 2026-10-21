#!/usr/bin/env bun
// VSDP state-driven Validate execute pass (2026-06-07).
// Executes the additive/corrective open items from audits/VSDP/state.yaml:
//   1. entity_type PATCH on the 8 VSDP masters (unclassified -> Rule #12 enum).
//   2. Catalog UX (Rule #20): author buyer-voice catalog_tagline + catalog_description
//      on the VSDP domain row (both currently empty). No module copy: 0 modules.
//   3. Generic-synonym aliases (B11) on masters where the synonym is industry-generic
//      (no vendor product names; alias_type='synonym'; record_status omitted -> 'new').
//   4. business_function_domains (C1): additive contributor/consumer rows on the
//      20-function spine. Owner (Platform Engineering, sub-function of Software
//      Engineering) already present; left untouched.
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

const DOMAIN_ID = 80;

// ============================================================
// 1. entity_type PATCH (Rule #12 enum)
// ============================================================
const entityTypeMap: Record<number, string> = {
  676: "operational_record",   // source_repositories: created/archived record, no workflow
  677: "operational_record",   // code_commits: append-only event/atomic unit
  678: "operational_workflow", // pull_requests: open/review/merged/closed workflow
  679: "catalog",              // ci_pipelines: pipeline definition / config template
  680: "operational_workflow", // ci_pipeline_runs: queued/running/succeeded/failed/cancelled
  681: "operational_record",   // build_artifacts: publish-once immutable output record
  682: "operational_workflow", // software_deployments: pending/running/succeeded/failed + rollback
  683: "computed",             // value_stream_metrics: derived/computed measurement
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
const VSDP_TAGLINE =
  "Take code from commit to production on one connected platform, with full visibility into how fast and how reliably your teams ship.";

const VSDP_DESCRIPTION =
  "A value-stream delivery platform brings source control, code review, continuous integration, build and artifact management, and release automation together so engineering teams can move a change from the first commit all the way to a running deployment without stitching together a chain of disconnected tools.\n\n" +
  "Developers open pull requests, automated pipelines build and test every change, signed artifacts are promoted through environments, and deployments roll out with the controls and rollback safeguards that release and compliance teams expect. Every step is captured as a record, so the path from idea to production is traceable end to end.\n\n" +
  "On top of that flow sits value-stream analytics: lead time for changes, deployment frequency, change failure rate, and mean time to restore. Engineering leaders use these measures to see where work slows down, prove the impact of process improvements, and keep delivery both fast and safe.";

async function patchCatalogUx(): Promise<number> {
  const [dom] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=id,catalog_tagline,catalog_description`,
  );
  if (!dom) throw new Error("VSDP domain row not found");
  const body: Row = {};
  if (!dom.catalog_tagline || String(dom.catalog_tagline).trim() === "") {
    body.catalog_tagline = VSDP_TAGLINE;
  } else {
    console.log("  SKIP catalog_tagline: already populated");
  }
  if (!dom.catalog_description || String(dom.catalog_description).trim() === "") {
    body.catalog_description = VSDP_DESCRIPTION;
  } else {
    console.log("  SKIP catalog_description: already populated");
  }
  if (Object.keys(body).length === 0) return 0;
  await call({ method: "PATCH", path: `/domains?id=eq.${DOMAIN_ID}`, body });
  console.log(`  PATCH domain ${DOMAIN_ID} catalog UX: ${Object.keys(body).join(", ")}`);
  return Object.keys(body).length;
}

// ============================================================
// 3. Generic-synonym aliases (B11). No vendor product names.
// ============================================================
// Industry-generic synonyms only. Vendor-keyed terms (GitLab merge_requests,
// Azure DevOps workflows, etc.) are deferred to the B2-2 solutions-inventory decision.
const aliasSpecs: { data_object_id: number; alias_name: string }[] = [
  { data_object_id: 676, alias_name: "Code Repositories" },
  { data_object_id: 676, alias_name: "Repositories" },
  { data_object_id: 678, alias_name: "Merge Requests" },
  { data_object_id: 678, alias_name: "Change Requests" },
  { data_object_id: 679, alias_name: "Pipelines" },
  { data_object_id: 679, alias_name: "Build Pipelines" },
  { data_object_id: 680, alias_name: "Pipeline Runs" },
  { data_object_id: 680, alias_name: "Build Runs" },
  { data_object_id: 681, alias_name: "Artifacts" },
  { data_object_id: 683, alias_name: "DORA Metrics" },
  { data_object_id: 683, alias_name: "Flow Metrics" },
];

async function insertAliases(): Promise<number> {
  const ids = [...new Set(aliasSpecs.map(a => a.data_object_id))];
  const existing = await get(
    `/data_object_aliases?data_object_id=in.(${ids.join(",")})&select=data_object_id,alias_name`,
  );
  const have = new Set(
    existing.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`),
  );
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
// 4. business_function_domains (C1) additive contributor/consumer
// ============================================================
// Owner (Platform Engineering id 60) already present. Add the clearly-correct
// contributor/consumer rows from the 20-function spine.
const bfdSpecs: { business_function_id: number; responsibility_type: string; label: string }[] = [
  { business_function_id: 26, responsibility_type: "contributor", label: "Software Engineering / Value Stream Delivery Platform" }, // developers who use the platform
  { business_function_id: 28, responsibility_type: "contributor", label: "Security / Value Stream Delivery Platform" }, // supply-chain / SAST / artifact-signing leg
  { business_function_id: 25, responsibility_type: "consumer", label: "Product Management / Value Stream Delivery Platform" }, // consumes pull_request.merged / delivery flow
];

async function insertBfd(): Promise<number> {
  const existing = await get(
    `/business_function_domains?domain_id=eq.${DOMAIN_ID}&select=business_function_id,responsibility_type`,
  );
  const have = new Set(
    existing.map(r => `${r.business_function_id}|${r.responsibility_type}`),
  );
  const missing = bfdSpecs
    .filter(b => !have.has(`${b.business_function_id}|${b.responsibility_type}`))
    .map(b => ({
      domain_id: DOMAIN_ID,
      business_function_id: b.business_function_id,
      responsibility_type: b.responsibility_type,
      business_function_domain_label: b.label,
    }));
  if (missing.length === 0) {
    console.log("  business_function_domains: all present, nothing to insert");
    return 0;
  }
  await insert("/business_function_domains", missing);
  console.log(`  inserted ${missing.length} business_function_domains rows`);
  return missing.length;
}

// ============================================================
// Run
// ============================================================
console.log("== VSDP state-driven execute 2026-06-07 ==");
console.log("\n[1] entity_type PATCH");
const nEntity = await patchEntityTypes();
console.log("\n[2] catalog UX");
const nCatalog = await patchCatalogUx();
console.log("\n[3] aliases");
const nAlias = await insertAliases();
console.log("\n[4] business_function_domains");
const nBfd = await insertBfd();

console.log("\n== Summary ==");
console.log(`entity_type patched: ${nEntity}`);
console.log(`catalog UX fields written: ${nCatalog}`);
console.log(`aliases inserted: ${nAlias}`);
console.log(`business_function_domains inserted: ${nBfd}`);

// Verify
console.log("\n== Verify ==");
const verifyEnt = await get(
  "/data_objects?id=in.(676,677,678,679,680,681,682,683)&select=id,data_object_name,entity_type&order=id",
);
for (const r of verifyEnt) console.log(`  ${r.id} ${r.data_object_name}: ${r.entity_type}`);
const [vdom] = await get(
  `/domains?id=eq.${DOMAIN_ID}&select=catalog_tagline,catalog_description`,
);
console.log(`  catalog_tagline empty? ${!vdom.catalog_tagline}`);
console.log(`  catalog_description empty? ${!vdom.catalog_description}`);
const valias = await get(
  "/data_object_aliases?data_object_id=in.(676,677,678,679,680,681,682,683)&select=data_object_id,alias_name,alias_type&order=data_object_id",
);
console.log(`  total VSDP master aliases now: ${valias.length}`);
const vbfd = await get(
  `/business_function_domains?domain_id=eq.${DOMAIN_ID}&select=business_function_id,responsibility_type`,
);
console.log(`  total VSDP business_function_domains now: ${vbfd.length}`);

console.log("\nDone.");
