#!/usr/bin/env bun
// 2026-06-07 KUBE-PLAT state-driven Validate execute (SKILL.md Rule #21, bulk batch).
// Additive/corrective only; everything lands record_status='new' (or PATCH of empty/NULL fields).
// Idempotent: re-reads live before every write and skips work already done.
//
// Domain: KUBE-PLAT (domain id 81, parent 76 APP-PAAS). 8 masters (448-455), 0 modules.
//
// Scope (EXECUTE-classified items from audits/KUBE-PLAT/state.yaml):
//   1. entity_type      : classify 8 KUBE-PLAT masters (unclassified -> operational_workflow)
//   2. B1A-EV1          : fill empty event_category on 11 KUBE-PLAT trigger events (Rule #13)
//   3. Catalog UX (#20) : author empty catalog_tagline/description on domain 81 (no modules exist)
//   4. B11 aliases      : insert 11 clearly-generic technology synonyms (alias_type='synonym')
//
// NOT touched here (surfaced / left): all b2; the unbuilt module/capability/solution build
// (B1A-BUILD, B1B-S1, gated on B2-MODULARIZATION); module-gated edges/states/FKs
// (B1B-S4/S6/S7/S9); vendor-brand alias tuples (B1B-S8 / B2-ALIAS-TUPLES); skill 78
// (now the canonical domain-grain system skill under the per-domain-skill model; B1B-S10 retired).

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
// All 8 KUBE-PLAT masters carry a real workflow (state machines drafted in state.yaml
// B1B-S9): each is operational_workflow. container_workloads is the running runtime object
// (pending->running->degraded->failed->succeeded), an operational workflow, not a rollup.
const entityTypes: { id: number; name: string; entity_type: string }[] = [
  { id: 448, name: "kubernetes_clusters", entity_type: "operational_workflow" },
  { id: 449, name: "cluster_node_pools", entity_type: "operational_workflow" },
  { id: 450, name: "container_workloads", entity_type: "operational_workflow" },
  { id: 451, name: "helm_releases", entity_type: "operational_workflow" },
  { id: 452, name: "service_meshes", entity_type: "operational_workflow" },
  { id: 453, name: "operator_installations", entity_type: "operational_workflow" },
  { id: 454, name: "platform_pipelines", entity_type: "operational_workflow" },
  { id: 455, name: "container_registries", entity_type: "operational_workflow" },
];

async function classifyEntityTypes() {
  console.log("\n== 1. entity_type classification ==");
  const live = await get(
    "/data_objects?id=in.(448,449,450,451,452,453,454,455)&select=id,entity_type",
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
// 2. event_category on 11 KUBE-PLAT trigger events (B1A-EV1, Rule #13)
// ============================================================
const eventCats: { id: number; name: string; cat: string }[] = [
  { id: 825, name: "kubernetes_cluster.provisioned", cat: "lifecycle" },
  { id: 826, name: "kubernetes_cluster.decommissioned", cat: "lifecycle" },
  { id: 827, name: "cluster_node_pool.scaled", cat: "threshold" },
  { id: 828, name: "container_workload.degraded", cat: "state_change" },
  { id: 829, name: "helm_release.deployed", cat: "lifecycle" },
  { id: 830, name: "helm_release.rolled_back", cat: "lifecycle" },
  { id: 831, name: "service_mesh.policy_updated", cat: "state_change" },
  { id: 832, name: "operator.installed", cat: "lifecycle" },
  { id: 833, name: "platform_pipeline.completed", cat: "lifecycle" },
  { id: 834, name: "container_registry.image_pushed", cat: "lifecycle" },
  { id: 835, name: "container_image.vulnerable", cat: "signal" },
];

async function fillEventCategory() {
  console.log("\n== 2. trigger_events.event_category (B1A-EV1) ==");
  const live = await get(
    "/trigger_events?id=in.(825,826,827,828,829,830,831,832,833,834,835)&select=id,event_category",
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
// Domain grain only: KUBE-PLAT has 0 modules, so there is no module-grain catalog copy to write.
const domainCopy = {
  catalog_tagline:
    "Run production Kubernetes clusters and the workloads on them, with day-2 operations and fleet-wide control.",
  catalog_description:
    "Stand up production-grade Kubernetes clusters, size and scale their node pools, and keep them patched, upgraded, and healthy through their whole life. Roll out applications as workloads and packaged releases, install the operators and service meshes they depend on, and wire in the pipelines that build and deploy into the cluster. Manage many clusters as one fleet instead of hand-tending each one. Get reliable container infrastructure with the upgrade, backup, and recovery routines built in, so platform teams ship and operate workloads without assembling the platform from scratch.",
};

async function authorCatalogUX() {
  console.log("\n== 3. Catalog UX (Rule #20) ==");
  let n = 0;
  const [dom] = await get(
    "/domains?id=eq.81&select=catalog_tagline,catalog_description",
  );
  const dBody: Row = {};
  if (!String(dom?.catalog_tagline ?? "").trim()) dBody.catalog_tagline = domainCopy.catalog_tagline;
  if (!String(dom?.catalog_description ?? "").trim()) dBody.catalog_description = domainCopy.catalog_description;
  if (Object.keys(dBody).length) {
    await patch("/domains?id=eq.81", dBody);
    console.log(`  domain 81: wrote ${Object.keys(dBody).join(", ")}`);
    n++;
  } else {
    console.log("  domain 81: already populated, skip");
  }
  console.log(`  catalog UX rows updated: ${n}`);
  return n;
}

// ============================================================
// 4. B11 aliases - clearly-generic technology synonyms only (alias_type='synonym')
// ============================================================
// Generic, non-vendor Kubernetes-ecosystem terms. Vendor-brand cluster variants
// (e.g. distribution-specific cluster names) are NOT loaded here; those are solution_term
// shaped and stay under B1B-S8 / B2-ALIAS-TUPLES pending exact tuples + solution ids.
const aliases: { data_object_id: number; alias_name: string }[] = [
  { data_object_id: 448, alias_name: "k8s cluster" },
  { data_object_id: 448, alias_name: "control plane" },
  { data_object_id: 450, alias_name: "Pod" },
  { data_object_id: 450, alias_name: "Deployment" },
  { data_object_id: 450, alias_name: "StatefulSet" },
  { data_object_id: 450, alias_name: "DaemonSet" },
  { data_object_id: 450, alias_name: "Job" },
  { data_object_id: 451, alias_name: "Helm chart release" },
  { data_object_id: 453, alias_name: "Kubernetes Operator" },
  { data_object_id: 453, alias_name: "OperatorHub install" },
  { data_object_id: 455, alias_name: "OCI registry" },
  { data_object_id: 455, alias_name: "image registry" },
];

async function insertAliases() {
  console.log("\n== 4. data_object_aliases (B11 generic synonyms) ==");
  const existing = await get(
    "/data_object_aliases?data_object_id=in.(448,449,450,451,452,453,454,455)&select=data_object_id,alias_name",
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
  console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(448,449,450,451,452,453,454,455)");
  console.log("  https://tests.semantius.app/domain_map/trigger_events?data_object_id=in.(448,449,450,451,452,453,454,455)");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.81");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases?data_object_id=in.(448,449,450,451,452,453,454,455)");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
