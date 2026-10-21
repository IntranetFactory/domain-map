#!/usr/bin/env bun
// 2026-06-07 APP-PAAS state-driven Validate execute (SKILL.md Rule #21, bulk batch).
// Additive/corrective only; everything lands record_status='new' (or PATCH of empty/NULL fields).
// Idempotent: re-reads live before every write and skips work already done.
//
// Domain: APP-PAAS (domain id 76). 6 masters (463-468), 0 modules (UNBUILT), 0 capabilities.
//
// Scope (EXECUTE-classified items from audits/APP-PAAS/state.yaml):
//   1. entity_type      : classify 6 APP-PAAS masters (unclassified -> operational_workflow)
//   2. B1A-S13-EVT      : fill empty event_category on 7 APP-PAAS trigger events (Rule #13)
//   3. Catalog UX (#20) : author empty catalog_tagline/description on domain 76 (no modules exist)
//   4. B1B-S6 aliases   : insert clearly-generic PaaS synonyms (alias_type='synonym')
//
// NOT touched here (surfaced / left):
//   - all b2 (B2-S1 module split, B2-S2 superseded by #20 author, B2-S3 flag flips,
//     B2-S4 runtime lifecycle shape, B2-S5 consumer DMDO, B2-H1 handoff 753 tag)
//   - the unbuilt module/capability build (B1A-BUILD, B1B-S1) gated on B2-S1
//   - module-gated cascade: B1B-S4 (intra rels), B1B-S7 (lifecycle states), B1B-S9 (handoff
//     module FKs), B1B-S10 (cross-domain rels), B1B-S11 (intra-domain handoffs)
//   - B1B-S3 pattern-flag flips (destructive overwrite of non-empty defaults -> SURFACE)
//   - B1B-S8 legacy skill retirement: RETIRED. Skill 30 (app-paas-system, domain_id=76,
//     domain_module_id=null) is now the canonical domain-grain system skill under the
//     per-domain-skill model (supersession header 2026-06-06). LEAVE.
//   - C1 business_function_domains: already satisfied (owner=Platform Engineering 60,
//     contributor=IT Operations 27). No write needed.
//
// entity_type note on paas_runtime_instances (466): classified operational_workflow,
// consistent with the sibling KUBE-PLAT decision on its reconciled runtime object
// (container_workloads 450) and the unconditional entity_type EXECUTE rule. The open
// B2-S4 decision now only governs whether lifecycle_states rows get authored for 466,
// which stays blocked behind the build.

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
// 1. entity_type classification
// ============================================================
// All 6 APP-PAAS masters carry a real workflow state machine (state.yaml B1B-S7):
// each is operational_workflow.
const entityTypes: { id: number; name: string; entity_type: string }[] = [
  { id: 463, name: "paas_applications", entity_type: "operational_workflow" },
  { id: 464, name: "paas_deployments", entity_type: "operational_workflow" },
  { id: 465, name: "paas_environments", entity_type: "operational_workflow" },
  { id: 466, name: "paas_runtime_instances", entity_type: "operational_workflow" },
  { id: 467, name: "paas_addons", entity_type: "operational_workflow" },
  { id: 468, name: "paas_build_records", entity_type: "operational_workflow" },
];

async function classifyEntityTypes() {
  console.log("\n== 1. entity_type classification ==");
  const live = await get(
    "/data_objects?id=in.(463,464,465,466,467,468)&select=id,entity_type",
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
// 2. event_category on 7 APP-PAAS trigger events (B1A-S13, Rule #13)
// ============================================================
// Mapping from state.yaml B1A-S13-EVT-CATEGORIES (deterministic from Rule #13 vocab +
// event-name semantics). Only fills EMPTY values; never overwrites.
const eventCats: { id: number; name: string; cat: string }[] = [
  { id: 818, name: "paas_application.created", cat: "lifecycle" },
  { id: 819, name: "paas_deployment.succeeded", cat: "state_change" },
  { id: 820, name: "paas_deployment.failed", cat: "state_change" },
  { id: 821, name: "paas_environment.promoted", cat: "state_change" },
  { id: 822, name: "paas_runtime.scaled", cat: "state_change" },
  { id: 823, name: "paas_addon.provisioned", cat: "lifecycle" },
  { id: 824, name: "paas_build.failed", cat: "state_change" },
];

async function fillEventCategory() {
  console.log("\n== 2. trigger_events.event_category (B1A-S13) ==");
  const live = await get(
    "/trigger_events?id=in.(818,819,820,821,822,823,824)&select=id,event_category",
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
// 3. Catalog UX (Rule #20) - only writes EMPTY fields, never overwrites
// ============================================================
// Buyer voice (workflow + value); no vendor/product names (Rule #18); American English; no em-dash.
// Domain grain only: APP-PAAS has 0 modules, so there is no module-grain catalog copy to write.
const domainCopy = {
  catalog_tagline:
    "Ship code-first apps to a managed runtime that builds, deploys, and scales without touching servers.",
  catalog_description:
    "Push your web apps, APIs, and background workers to a managed runtime that builds your code on every commit and deploys it for you. Promote a release from staging up to production, watch it roll out, and roll back a bad deploy without managing infrastructure. Spin up the databases, caches, and queues your app needs as attachable add-ons, scale instances up and down as traffic changes, and keep each environment isolated and reproducible. Teams get from commit to running app in minutes and stay focused on product instead of provisioning and patching servers.",
};

async function authorCatalogUX() {
  console.log("\n== 3. Catalog UX (Rule #20) ==");
  let n = 0;
  const [dom] = await get(
    "/domains?id=eq.76&select=catalog_tagline,catalog_description",
  );
  const dBody: Row = {};
  if (!String(dom?.catalog_tagline ?? "").trim()) dBody.catalog_tagline = domainCopy.catalog_tagline;
  if (!String(dom?.catalog_description ?? "").trim()) dBody.catalog_description = domainCopy.catalog_description;
  if (Object.keys(dBody).length) {
    await patch("/domains?id=eq.76", dBody);
    console.log(`  domain 76: wrote ${Object.keys(dBody).join(", ")}`);
    n++;
  } else {
    console.log("  domain 76: already populated, skip");
  }
  console.log(`  catalog UX rows updated: ${n}`);
  return n;
}

// ============================================================
// 4. B11 aliases - clearly-generic PaaS synonyms only (alias_type='synonym')
// ============================================================
// Generic, non-vendor cross-PaaS terms (the words a buyer types regardless of vendor).
// Vendor-brand-specific alias tuples (e.g. "dyno", "machine", "config vars") stay under
// B1B-S6 / B2-ALIASES pending exact tuples + solution ids per the loader-prompt scope.
const aliases: { data_object_id: number; alias_name: string }[] = [
  { data_object_id: 463, alias_name: "app" },
  { data_object_id: 463, alias_name: "project" },
  { data_object_id: 463, alias_name: "service" },
  { data_object_id: 463, alias_name: "site" },
  { data_object_id: 464, alias_name: "deploy" },
  { data_object_id: 464, alias_name: "release" },
  { data_object_id: 464, alias_name: "rollout" },
  { data_object_id: 465, alias_name: "environment" },
  { data_object_id: 465, alias_name: "deployment stage" },
  { data_object_id: 466, alias_name: "instance" },
  { data_object_id: 466, alias_name: "runtime" },
  { data_object_id: 466, alias_name: "worker" },
  { data_object_id: 467, alias_name: "add-on" },
  { data_object_id: 467, alias_name: "managed service" },
  { data_object_id: 467, alias_name: "plugin" },
  { data_object_id: 468, alias_name: "build" },
  { data_object_id: 468, alias_name: "build job" },
];

async function insertAliases() {
  console.log("\n== 4. data_object_aliases (B1B-S6 generic synonyms) ==");
  const existing = await get(
    "/data_object_aliases?data_object_id=in.(463,464,465,466,467,468)&select=data_object_id,alias_name",
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
    }));
  if (toInsert.length) {
    const CHUNK = 50;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      await post("/data_object_aliases", toInsert.slice(i, i + CHUNK));
    }
    for (const a of toInsert) console.log(`  +${a.data_object_id} "${a.alias_name}" (synonym)`);
  } else {
    console.log("  all aliases already present, nothing to insert");
  }
  console.log(`  aliases inserted: ${toInsert.length}`);
  return toInsert.length;
}

// ============================================================
async function main() {
  const counts = {
    entity_type: await classifyEntityTypes(),
    event_category: await fillEventCategory(),
    catalog_ux: await authorCatalogUX(),
    aliases: await insertAliases(),
  };
  console.log("\n== SUMMARY ==");
  console.log(JSON.stringify(counts, null, 2));
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(463,464,465,466,467,468)");
  console.log("  https://tests.semantius.app/domain_map/trigger_events?data_object_id=in.(463,464,465,466,467,468)");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.76");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases?data_object_id=in.(463,464,465,466,467,468)");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
