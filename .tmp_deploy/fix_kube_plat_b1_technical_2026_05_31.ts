#!/usr/bin/env bun
// KUBE-PLAT B1 technical fixes, 2026-05-31
//
// Applies the truly-technical subset of Bucket 1 from audits/KUBE-PLAT.md:
//   Phase R, Rule #10 user-edges (B1-S5): INSERT 8 data_object_relationships
//     rows linking the platform built-in `users` (id 748) to each KUBE-PLAT
//     master with the audit-specified actor verb (cluster_admin, deployer,
//     pipeline_owner, operator_owner, mesh_admin, registry_admin,
//     workload_owner, node_pool_owner).
//   Phase H1, APQC tagging: INSERT 8 agent_curated handoff_processes rows.
//     Each row's handoff_id + APQC PCF process_id is pre-specified by the
//     audit and verified resolvable in the live catalog.
//
// Deferred from B1 (NOT applied by this loader, see report):
//   - B1-S1 (modules, capabilities, solutions) gated on Bucket 2 modularization
//   - B1-S2 catalog UX wording (Rule #20, per-row approval)
//   - B1-S3 pattern flag positive review (chat-surface only)
//   - B1-S4 intra-domain data_object_relationships (not Rule #10 user-edges)
//   - B1-S6 outbound cross-domain data_object_relationships (not user-edges)
//   - B1-S7 B10b FK PATCHes (gated on M1, KUBE-PLAT has no module)
//   - B1-S8 aliases (audit does not pre-specify exact tuples)
//   - B1-S9 lifecycle states (new entities, gated on M1)
//   - B1-S10 F1 legacy skill (user's call: leave / rename / delete)
//
// Idempotency: pre-reads existing rows and inserts only the missing pairs.
// Re-running is free.
//
// Rule discipline:
//   - record_status omitted on every INSERT (DB default 'new'), Rule #1
//   - Zero writes to any `notes` column, Rule #15
//   - APQC tags use proposal_source='agent_curated', agent-authored work
//   - No vendor or product names in any text field, Rule #18

const SEMANTIUS = "semantius";

async function call(method: string, path: string, body?: unknown): Promise<unknown> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const p = Bun.spawn([SEMANTIUS, "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  p.stdin.write(JSON.stringify(payload));
  await p.stdin.end();
  const stdout = await new Response(p.stdout).text();
  const stderr = await new Response(p.stderr).text();
  const code = await p.exited;
  if (code !== 0) {
    throw new Error(`semantius exit ${code}: ${stderr}\nstdout: ${stdout}`);
  }
  if (!stdout.trim()) return null;
  try {
    return JSON.parse(stdout);
  } catch {
    return stdout;
  }
}

const get = (path: string) => call("GET", path);
const post = (path: string, body: unknown) => call("POST", path, body);

type Row = Record<string, unknown>;

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map((r) => {
    const out: Row = {};
    for (const k of keys) {
      out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    }
    return out;
  });
}

async function insertChunked(table: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const result = (await post(`/${table}`, slice)) as Row[] | null;
    if (result) out.push(...result);
  }
  return out;
}

// KUBE-PLAT master ids verified at audit time
const USERS_ID = 748; // platform_builtin

interface UserEdge {
  related_data_object_id: number;
  master_name: string;
  relationship_verb: string;
  inverse_verb: string;
}

// Verbs derived from the audit-specified actor roles per master.
// Plural-noun construction mirrors existing user-edge convention
// (e.g. "owned CIs", "authored baselines", "assigned hardware").
const USER_EDGES: UserEdge[] = [
  {
    related_data_object_id: 448,
    master_name: "kubernetes_clusters",
    relationship_verb: "administered clusters",
    inverse_verb: "is_administered_by",
  },
  {
    related_data_object_id: 449,
    master_name: "cluster_node_pools",
    relationship_verb: "owned node pools",
    inverse_verb: "is_owned_by",
  },
  {
    related_data_object_id: 450,
    master_name: "container_workloads",
    relationship_verb: "owned workloads",
    inverse_verb: "is_owned_by",
  },
  {
    related_data_object_id: 451,
    master_name: "helm_releases",
    relationship_verb: "deployed releases",
    inverse_verb: "is_deployed_by",
  },
  {
    related_data_object_id: 452,
    master_name: "service_meshes",
    relationship_verb: "administered meshes",
    inverse_verb: "is_administered_by",
  },
  {
    related_data_object_id: 453,
    master_name: "operator_installations",
    relationship_verb: "owned operator installations",
    inverse_verb: "is_owned_by",
  },
  {
    related_data_object_id: 454,
    master_name: "platform_pipelines",
    relationship_verb: "owned pipelines",
    inverse_verb: "is_owned_by",
  },
  {
    related_data_object_id: 455,
    master_name: "container_registries",
    relationship_verb: "administered registries",
    inverse_verb: "is_administered_by",
  },
];

async function phaseR_userEdges() {
  console.log("\n=== Phase R, Rule #10 user-edges (B1-S5) ===");
  const targetIds = USER_EDGES.map((e) => e.related_data_object_id).join(",");
  const existing = (await get(
    `/data_object_relationships?data_object_id=eq.${USERS_ID}&related_data_object_id=in.(${targetIds})&select=id,related_data_object_id,relationship_verb`,
  )) as Row[];
  const existingPairs = new Set<string>(
    existing.map((r) => `${r.related_data_object_id}|${String(r.relationship_verb).toLowerCase()}`),
  );
  console.log(`  existing edges on these masters: ${existing.length}`);

  const toInsert: Row[] = [];
  for (const e of USER_EDGES) {
    const key = `${e.related_data_object_id}|${e.relationship_verb.toLowerCase()}`;
    if (existingPairs.has(key)) {
      console.log(`  (skip) ${e.master_name}: edge already present`);
      continue;
    }
    toInsert.push({
      data_object_id: USERS_ID,
      related_data_object_id: e.related_data_object_id,
      relationship_verb: e.relationship_verb,
      inverse_verb: e.inverse_verb,
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      owner_side: "source",
      is_required: false,
      // record_status omitted, DB default 'new'
      // notes omitted, Rule #15
    });
  }

  if (toInsert.length === 0) {
    console.log("  nothing to insert");
    return;
  }
  console.log(`  inserting ${toInsert.length} user-edges`);
  const result = await insertChunked("data_object_relationships", toInsert);
  console.log(`  inserted ${result.length} rows`);
}

interface ApqcTag {
  handoff_id: number;
  process_id: number;
  mnemonic: string;
}

// Each row's handoff_id + process_id is pre-specified by the audit
// (Pass 1 H section table). Process ids verified resolvable.
const APQC_BATCH: ApqcTag[] = [
  { handoff_id: 799, process_id: 1312, mnemonic: "KUBE-PLAT->ITAM cluster.provisioned, maintain IT asset records" },
  { handoff_id: 760, process_id: 1304, mnemonic: "KUBE-PLAT->OBS cluster.provisioned, manage infra perf and capacity" },
  { handoff_id: 761, process_id: 1304, mnemonic: "KUBE-PLAT->ITOM node_pool.scaled, manage infra perf and capacity" },
  { handoff_id: 763, process_id: 1299, mnemonic: "KUBE-PLAT->ITSM workload.degraded, triage IT service incidents" },
  { handoff_id: 759, process_id: 1305, mnemonic: "KUBE-PLAT->APP-PAAS workload.degraded, respond to unplanned issues" },
  { handoff_id: 762, process_id: 1262, mnemonic: "KUBE-PLAT->VSDP helm_release.deployed, implement software change/release" },
  { handoff_id: 764, process_id: 1307, mnemonic: "KUBE-PLAT->GRC image.vulnerable, monitor IT infra security" },
  { handoff_id: 753, process_id: 1311, mnemonic: "APP-PAAS->KUBE-PLAT paas_deployment.succeeded, install/configure/upgrade infra" },
];

async function phaseH1_apqcTags() {
  console.log("\n=== Phase H1, APQC handoff_processes tagging ===");
  const handoffIds = APQC_BATCH.map((t) => t.handoff_id).join(",");
  const existing = (await get(
    `/handoff_processes?handoff_id=in.(${handoffIds})&select=id,handoff_id,process_id`,
  )) as Row[];
  const existingPairs = new Set<string>(
    existing.map((r) => `${r.handoff_id}|${r.process_id}`),
  );
  console.log(`  existing handoff_processes for these handoffs: ${existing.length}`);

  const toInsert: Row[] = [];
  for (const t of APQC_BATCH) {
    const key = `${t.handoff_id}|${t.process_id}`;
    if (existingPairs.has(key)) {
      console.log(`  (skip) ${t.mnemonic}: tag already present`);
      continue;
    }
    toInsert.push({
      handoff_id: t.handoff_id,
      process_id: t.process_id,
      role: "implements",
      proposal_source: "agent_curated",
      // record_status omitted, DB default 'new'
      // notes omitted, Rule #15
    });
  }

  if (toInsert.length === 0) {
    console.log("  nothing to insert");
    return;
  }
  console.log(`  inserting ${toInsert.length} APQC tags`);
  const result = await insertChunked("handoff_processes", toInsert);
  console.log(`  inserted ${result.length} rows`);
}

async function main() {
  console.log("KUBE-PLAT B1 technical fixes, 2026-05-31");
  await phaseR_userEdges();
  await phaseH1_apqcTags();
  console.log("\nDone.");
}

await main();
