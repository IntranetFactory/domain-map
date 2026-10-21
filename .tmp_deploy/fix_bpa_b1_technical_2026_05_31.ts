#!/usr/bin/env bun
/**
 * BPA B1 technical fixes - 2026-05-31 continuation.
 *
 * Scope (only truly-technical B1 fixes per the prompt; audit:
 * c:/dev/domain-map/audits/BPA.md, "## 2026-05-30 - Validate b1 (full 4-pass)"):
 *
 *   - B1-B1: INSERT 3 `data_object_relationships` rows from users (id 748,
 *     kind=platform_builtin) to the three BPA masters that lack any `users`
 *     edge: business_process_models (247), value_streams (249),
 *     process_simulation_runs (250). Rule #10 audit pre-specifies the verbs
 *     (author/owner, owner, requester). Verb shape mirrors the existing
 *     canonical edge row 1044 (users -> business_capability_maps, verb
 *     "owns_business_capability_map").
 *
 *   - B1-B2: DELETE legacy near-duplicate users->business_capability_maps row
 *     226. The audit pre-specifies the row id. Live state already shows row
 *     226 absent (only canonical row 1044 remains), so this step is a verify
 *     pass-through. No DELETE issued; assertion logged.
 *
 *   - B1-B3: INSERT 3 intra-domain `data_object_relationships` edges between
 *     BPA masters (audit pre-specifies the exact tuples):
 *       value_streams maps_to business_process_models,
 *       business_capability_maps groups business_process_models,
 *       process_simulation_runs simulates business_process_models.
 *     The audit's 4th edge (value_streams supports business_capability_maps)
 *     is marked "optionally" so it is deferred to a user judgment call.
 *
 *   - B1-B5: INSERT 6 `data_object_aliases` rows. Audit pre-specifies exact
 *     (data_object, alias_name) tuples for 247, 249, 250. All synonyms.
 *
 *   - B1-H1: INSERT 10 `handoff_processes` rows tagging BPA-touching handoffs
 *     with APQC PCF activities. Audit pre-specifies (handoff_id, PCF
 *     external_id) tuples for handoffs 180, 181, 182, 184, 740, 741, 783,
 *     784, 785, 786. Handoff 183 already has a discovery_substring tag and is
 *     left alone (Bucket 2 #6 promote-or-keep decision is a user judgment
 *     call). proposal_source='agent_curated'; record_status omitted (DB
 *     default 'new' per Rule #1).
 *
 * Deferred (NOT applied here; recorded in the audit continuation):
 *   - B1-M1 through B1-M5: new domain_modules + cross-domain master rehoming
 *     (capability_maps). Module split shape is Bucket 2 #1 user decision;
 *     capability_map canonical owner is Bucket 2 #2 user decision. Every
 *     downstream M-band fix needs new module IDs.
 *   - B1-S1: catalog_tagline / catalog_description drafts. Rule #20
 *     surface-to-user; never auto-write.
 *   - B1-S2: DELETE legacy bpa-system skill 34. Sequenced after per-module
 *     system skills land, which depend on B1-M1.
 *   - B1-S3, B1-S4, B1-S5: handoff source/target module FK backfills and new
 *     intra-domain handoffs. All gated on B1-M1.
 *   - B1-S6: new `domain_aliases` rows. Out of scope for the technical pass
 *     per prompt.
 *   - B1-B4: new lifecycle states + pattern-flag flips. New entities + flag
 *     flips, both deferred per prompt.
 *   - B1-H1 handoff 183 promotion: Bucket 2 #6 user decision.
 *
 * Pre-flight (verified live before drafting):
 *   - data_objects: 247 business_process_models (domain_owned), 248
 *     business_capability_maps (domain_owned), 249 value_streams
 *     (domain_owned), 250 process_simulation_runs (domain_owned), 748 users
 *     (platform_builtin).
 *   - data_object_relationships: only 217 (267 supports 248) and 1044 (748
 *     owns 248) touch BPA masters. Row 226 already absent.
 *   - data_object_aliases on 247/249/250: 0 existing rows.
 *   - handoff_processes: only handoff 183 has a row (id 102,
 *     discovery_substring, process_id 414). Handoffs 180/181/182/184/740/
 *     741/783/784/785/786 all exist, all source_domain_id or target_domain_id
 *     touches 136 (BPA).
 *   - processes: external_id 16378 = id 78, 10013 = id 13, 17492 = id 414,
 *     11161 = id 1708 (all apqc_pcf_cross_industry).
 *
 * Idempotent: each step re-checks live state before acting; safe to re-run.
 * Run from project root: bun run .tmp_deploy/fix_bpa_b1_technical_2026_05_31.ts
 */

type Row = Record<string, unknown>;

async function semCall(tool: string, payload: Row): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`${tool} (exit ${code}): ${stderr || stdout}`);
  }
  const t = stdout.trim();
  return t ? JSON.parse(t) : null;
}

const get = (path: string) =>
  semCall("postgrestRequest", { method: "GET", path }) as Promise<any[]>;
const post = (path: string, body: Row | Row[]) =>
  semCall("postgrestRequest", { method: "POST", path, body }) as Promise<any[]>;

// ============================================================================
// Constants
// ============================================================================

const USERS_ID = 748;
const BPM_ID = 247; // business_process_models
const BCM_ID = 248; // business_capability_maps
const VS_ID = 249;  // value_streams
const PSR_ID = 250; // process_simulation_runs

// ============================================================================
// B1-B1: users -> master edges (Rule #10)
// ============================================================================

type UserEdgeSpec = {
  related_data_object_id: number;
  related_label: string;
  relationship_verb: string;
  inverse_verb: string;
};

const USER_EDGES: UserEdgeSpec[] = [
  {
    related_data_object_id: BPM_ID,
    related_label: "business_process_models",
    // Per the audit: process models have authors/owners. Use snake_case verb
    // matching the canonical row 1044 pattern.
    relationship_verb: "owns_business_process_model",
    inverse_verb: "owned by user",
  },
  {
    related_data_object_id: VS_ID,
    related_label: "value_streams",
    relationship_verb: "owns_value_stream",
    inverse_verb: "owned by user",
  },
  {
    related_data_object_id: PSR_ID,
    related_label: "process_simulation_runs",
    // Audit: simulation runs have requesters.
    relationship_verb: "requests_process_simulation_run",
    inverse_verb: "requested by user",
  },
];

async function insertUserEdges() {
  console.log("\n=== B1-B1: users -> BPA master edges ===");
  // Pre-flight: verify users (748) is platform_builtin.
  const u = await get(
    `/data_objects?id=eq.${USERS_ID}&select=id,data_object_name,kind`,
  );
  if (u.length !== 1 || u[0].kind !== "platform_builtin") {
    throw new Error(
      `users (id ${USERS_ID}) missing or wrong kind: ${JSON.stringify(u)}`,
    );
  }
  for (const edge of USER_EDGES) {
    const existing = await get(
      `/data_object_relationships?data_object_id=eq.${USERS_ID}` +
        `&related_data_object_id=eq.${edge.related_data_object_id}` +
        `&select=id,relationship_verb`,
    );
    if (existing.length > 0) {
      console.log(
        `  = users -> ${edge.related_label}: ${existing.length} row(s) already present (` +
          existing.map((r: any) => `id=${r.id} verb="${r.relationship_verb}"`).join(", ") +
          "), skipping",
      );
      continue;
    }
    const inserted = await post("/data_object_relationships", {
      data_object_id: USERS_ID,
      related_data_object_id: edge.related_data_object_id,
      relationship_verb: edge.relationship_verb,
      inverse_verb: edge.inverse_verb,
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      is_required: false,
      owner_side: "source",
      // record_status omitted; DB default 'new' applies per Rule #1.
      // notes omitted; default '' per Rule #15.
    });
    console.log(
      `  + users -> ${edge.related_label} (id ${inserted[0]?.id}, verb="${edge.relationship_verb}")`,
    );
  }
}

// ============================================================================
// B1-B2: DELETE row 226 (audit names id). Live state: row 226 absent.
// ============================================================================

async function verifyB1B2Cleanup() {
  console.log("\n=== B1-B2: verify legacy row 226 already absent ===");
  const existing = await get(
    `/data_object_relationships?id=eq.226&select=id`,
  );
  if (existing.length === 0) {
    console.log("  = row 226 not present (already removed prior to this run)");
    return;
  }
  // If it ever reappears, the audit's intent was to remove the legacy
  // duplicate; row 1044 is the canonical edge. Do not auto-delete here
  // unless live state matches the audit's described shape; surface instead.
  console.log(
    `  ! row 226 unexpectedly present: ${JSON.stringify(existing[0])}. ` +
      `Manual review required; not auto-deleting.`,
  );
}

// ============================================================================
// B1-B3: intra-domain master edges
// ============================================================================

type IntraEdgeSpec = {
  data_object_id: number; // source (parent voice)
  related_data_object_id: number;
  source_label: string;
  target_label: string;
  relationship_verb: string;
  inverse_verb: string;
  relationship_type: "one_to_one" | "one_to_many" | "many_to_many";
  relationship_kind: "composition" | "reference" | "association" | "inheritance";
  owner_side: "source" | "target";
};

const INTRA_EDGES: IntraEdgeSpec[] = [
  {
    // value_streams maps_to business_process_models. A value stream typically
    // decomposes into multiple process models; either side can exist
    // standalone, so reference (not composition).
    data_object_id: VS_ID,
    related_data_object_id: BPM_ID,
    source_label: "value_streams",
    target_label: "business_process_models",
    relationship_verb: "maps_to_business_process_model",
    inverse_verb: "realized in value stream",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    owner_side: "source",
  },
  {
    // business_capability_maps groups business_process_models. The map
    // organizes process models under capabilities; reference, not
    // composition (process models can exist without a capability map).
    data_object_id: BCM_ID,
    related_data_object_id: BPM_ID,
    source_label: "business_capability_maps",
    target_label: "business_process_models",
    relationship_verb: "groups_business_process_model",
    inverse_verb: "grouped under capability map",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    owner_side: "source",
  },
  {
    // process_simulation_runs simulates business_process_models. A run
    // targets one BPMN model. Composition is wrong (the model exists
    // independently of the simulation); reference.
    data_object_id: PSR_ID,
    related_data_object_id: BPM_ID,
    source_label: "process_simulation_runs",
    target_label: "business_process_models",
    relationship_verb: "simulates_business_process_model",
    inverse_verb: "simulated by run",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    owner_side: "target",
  },
];

async function insertIntraEdges() {
  console.log("\n=== B1-B3: intra-BPA master edges ===");
  for (const edge of INTRA_EDGES) {
    const existing = await get(
      `/data_object_relationships?data_object_id=eq.${edge.data_object_id}` +
        `&related_data_object_id=eq.${edge.related_data_object_id}` +
        `&select=id,relationship_verb`,
    );
    if (existing.length > 0) {
      console.log(
        `  = ${edge.source_label} -> ${edge.target_label}: ${existing.length} row(s) already present (` +
          existing.map((r: any) => `id=${r.id} verb="${r.relationship_verb}"`).join(", ") +
          "), skipping",
      );
      continue;
    }
    const inserted = await post("/data_object_relationships", {
      data_object_id: edge.data_object_id,
      related_data_object_id: edge.related_data_object_id,
      relationship_verb: edge.relationship_verb,
      inverse_verb: edge.inverse_verb,
      relationship_type: edge.relationship_type,
      relationship_kind: edge.relationship_kind,
      is_required: false,
      owner_side: edge.owner_side,
    });
    console.log(
      `  + ${edge.source_label} -> ${edge.target_label} ` +
        `(id ${inserted[0]?.id}, verb="${edge.relationship_verb}")`,
    );
  }
}

// ============================================================================
// B1-B5: data_object_aliases (synonyms)
// ============================================================================

type AliasSpec = {
  data_object_id: number;
  parent_label: string;
  alias_name: string;
};

const ALIASES: AliasSpec[] = [
  // business_process_models (247): "BPMN diagram", "process map"
  { data_object_id: BPM_ID, parent_label: "business_process_models", alias_name: "BPMN diagram" },
  { data_object_id: BPM_ID, parent_label: "business_process_models", alias_name: "process map" },
  // value_streams (249): "VSM", "lean value stream map"
  { data_object_id: VS_ID, parent_label: "value_streams", alias_name: "VSM" },
  { data_object_id: VS_ID, parent_label: "value_streams", alias_name: "lean value stream map" },
  // process_simulation_runs (250): "Monte Carlo simulation run", "what-if scenario"
  { data_object_id: PSR_ID, parent_label: "process_simulation_runs", alias_name: "Monte Carlo simulation run" },
  { data_object_id: PSR_ID, parent_label: "process_simulation_runs", alias_name: "what-if scenario" },
];

async function insertAliases() {
  console.log("\n=== B1-B5: data_object_aliases on 247/249/250 ===");
  for (const a of ALIASES) {
    const existing = await get(
      `/data_object_aliases?data_object_id=eq.${a.data_object_id}` +
        `&alias_name=eq.${encodeURIComponent(a.alias_name)}` +
        `&select=id`,
    );
    if (existing.length > 0) {
      console.log(
        `  = ${a.parent_label} alias "${a.alias_name}" already present (id ${existing[0].id}), skipping`,
      );
      continue;
    }
    const inserted = await post("/data_object_aliases", {
      data_object_id: a.data_object_id,
      alias_name: a.alias_name,
      alias_type: "synonym",
      is_preferred: false,
      // record_status omitted; default 'new' per Rule #1.
      // industry_id / solution_id omitted (only required for industry_term / solution_term).
      // notes omitted; default '' per Rule #15.
    });
    console.log(
      `  + ${a.parent_label} alias "${a.alias_name}" (id ${inserted[0]?.id})`,
    );
  }
}

// ============================================================================
// B1-H1: handoff_processes APQC tags
// ============================================================================

type TagSpec = {
  handoff_id: number;
  process_id: number; // resolved live below from external_id
  external_id: string;
  pcf_name: string;
  direction: string; // for log only
};

const TAG_SPECS: Omit<TagSpec, "process_id">[] = [
  // handoff 180: BPA -> PROC-MIN process_model.published -> Manage business processes (78)
  { handoff_id: 180, external_id: "16378", pcf_name: "Manage business processes", direction: "BPA -> PROC-MIN" },
  // handoff 181: BPA -> APM capability_map.updated -> Develop and Manage Business Capabilities (13)
  // Audit lists PCF 13 as primary (L1 confident); alt PCF 261 deferred to user.
  { handoff_id: 181, external_id: "10013", pcf_name: "Develop and Manage Business Capabilities", direction: "BPA -> APM" },
  // handoff 182: BPA -> APM process_model.published -> Manage business processes (78)
  { handoff_id: 182, external_id: "16378", pcf_name: "Manage business processes", direction: "BPA -> APM" },
  // handoff 184: BPA -> PROD-MGMT value_stream.bottleneck_identified -> Reengineer business processes and systems (1708)
  { handoff_id: 184, external_id: "11161", pcf_name: "Reengineer business processes and systems", direction: "BPA -> PROD-MGMT" },
  // handoff 740: PROC-MIN -> BPA discovered_process_model.published -> Manage business processes (78)
  { handoff_id: 740, external_id: "16378", pcf_name: "Manage business processes", direction: "PROC-MIN -> BPA" },
  // handoff 741: PROC-MIN -> BPA process_variant.identified -> Manage business processes (78)
  { handoff_id: 741, external_id: "16378", pcf_name: "Manage business processes", direction: "PROC-MIN -> BPA" },
  // handoff 783: BPA -> PROC-MIN process_simulation_run.completed -> Manage business processes (78)
  { handoff_id: 783, external_id: "16378", pcf_name: "Manage business processes", direction: "BPA -> PROC-MIN" },
  // handoff 784: BPA -> PROD-MGMT process_simulation_run.bottleneck_identified -> Reengineer business processes and systems (1708)
  { handoff_id: 784, external_id: "11161", pcf_name: "Reengineer business processes and systems", direction: "BPA -> PROD-MGMT" },
  // handoff 785: BPA -> SPM process_simulation_run.completed -> Manage business processes (78)
  { handoff_id: 785, external_id: "16378", pcf_name: "Manage business processes", direction: "BPA -> SPM" },
  // handoff 786: BPA -> WORK-MGMT process_simulation_run.bottleneck_identified -> Reengineer business processes and systems (1708)
  { handoff_id: 786, external_id: "11161", pcf_name: "Reengineer business processes and systems", direction: "BPA -> WORK-MGMT" },
];

async function resolveProcessIds(): Promise<Map<string, number>> {
  const externalIds = Array.from(new Set(TAG_SPECS.map((t) => t.external_id)));
  const rows = await get(
    `/processes?external_id=in.(${externalIds.join(",")})&source_framework=eq.apqc_pcf_cross_industry&select=id,external_id,process_name`,
  );
  const map = new Map<string, number>();
  for (const r of rows) map.set(String(r.external_id), Number(r.id));
  for (const eid of externalIds) {
    if (!map.has(eid)) {
      throw new Error(
        `Pre-flight: PCF external_id ${eid} not found in /processes (apqc_pcf_cross_industry).`,
      );
    }
  }
  return map;
}

async function insertHandoffTags() {
  console.log("\n=== B1-H1: handoff_processes APQC tags ===");
  const processMap = await resolveProcessIds();
  // Pre-flight: confirm every handoff exists and touches BPA (domain 136).
  const handoffIds = TAG_SPECS.map((t) => t.handoff_id);
  const handoffs = await get(
    `/handoffs?id=in.(${handoffIds.join(",")})&select=id,source_domain_id,target_domain_id`,
  );
  if (handoffs.length !== handoffIds.length) {
    throw new Error(
      `Pre-flight: expected ${handoffIds.length} handoffs, got ${handoffs.length}. ` +
        `Found: ${handoffs.map((h: any) => h.id).join(",")}`,
    );
  }
  for (const h of handoffs) {
    if (h.source_domain_id !== 136 && h.target_domain_id !== 136) {
      throw new Error(
        `Pre-flight: handoff ${h.id} does not touch BPA (domain 136); ` +
          `source=${h.source_domain_id} target=${h.target_domain_id}`,
      );
    }
  }
  console.log(`  + verified ${handoffs.length} handoffs all touch BPA (domain 136)`);

  for (const spec of TAG_SPECS) {
    const processId = processMap.get(spec.external_id)!;
    const existing = await get(
      `/handoff_processes?handoff_id=eq.${spec.handoff_id}` +
        `&process_id=eq.${processId}&select=id,proposal_source,record_status`,
    );
    if (existing.length > 0) {
      console.log(
        `  = handoff ${spec.handoff_id} -> "${spec.pcf_name}" already tagged ` +
          `(id ${existing[0].id}, proposal_source=${existing[0].proposal_source}), skipping`,
      );
      continue;
    }
    const inserted = await post("/handoff_processes", {
      handoff_id: spec.handoff_id,
      process_id: processId,
      proposal_source: "agent_curated",
      // record_status omitted; DB default 'new' applies per Rule #1.
      // role omitted; default 'implements' applies.
      // notes omitted; default '' per Rule #15.
    });
    console.log(
      `  + handoff ${spec.handoff_id} (${spec.direction}) -> "${spec.pcf_name}" ` +
        `(id ${inserted[0]?.id}, key="${inserted[0]?.key}")`,
    );
  }
}

// ============================================================================
// Post-flight summary
// ============================================================================

async function postflight() {
  console.log("\n=== Post-flight summary ===");

  const userEdges = await get(
    `/data_object_relationships?data_object_id=eq.${USERS_ID}` +
      `&related_data_object_id=in.(${BPM_ID},${BCM_ID},${VS_ID},${PSR_ID})` +
      `&select=id,related_data_object_id,relationship_verb&order=related_data_object_id.asc`,
  );
  console.log(`  users -> BPA-master edges: ${userEdges.length}`);
  for (const r of userEdges) {
    console.log(`    id=${r.id} related=${r.related_data_object_id} verb=${r.relationship_verb}`);
  }

  const intraEdges = await get(
    `/data_object_relationships?data_object_id=in.(${BPM_ID},${BCM_ID},${VS_ID},${PSR_ID})` +
      `&related_data_object_id=in.(${BPM_ID},${BCM_ID},${VS_ID},${PSR_ID})` +
      `&select=id,data_object_id,related_data_object_id,relationship_verb&order=id.asc`,
  );
  console.log(`  intra-BPA master edges: ${intraEdges.length}`);
  for (const r of intraEdges) {
    console.log(
      `    id=${r.id} ${r.data_object_id} -> ${r.related_data_object_id} verb=${r.relationship_verb}`,
    );
  }

  const aliases = await get(
    `/data_object_aliases?data_object_id=in.(${BPM_ID},${BCM_ID},${VS_ID},${PSR_ID})` +
      `&select=id,data_object_id,alias_name,alias_type&order=data_object_id.asc,id.asc`,
  );
  console.log(`  BPA master aliases: ${aliases.length}`);
  for (const r of aliases) {
    console.log(`    id=${r.id} parent=${r.data_object_id} "${r.alias_name}" (${r.alias_type})`);
  }

  const tagHandoffIds = TAG_SPECS.map((t) => t.handoff_id).concat(183);
  const tags = await get(
    `/handoff_processes?handoff_id=in.(${tagHandoffIds.join(",")})` +
      `&select=id,handoff_id,process_id,proposal_source,record_status&order=handoff_id.asc`,
  );
  console.log(`  handoff_processes rows on BPA-touching handoffs: ${tags.length}`);
  for (const r of tags) {
    console.log(
      `    id=${r.id} handoff=${r.handoff_id} process=${r.process_id} ` +
        `source=${r.proposal_source} status=${r.record_status}`,
    );
  }
}

async function main() {
  console.log("BPA B1 technical fixes (2026-05-31 continuation)");
  console.log("================================================");
  await insertUserEdges();
  await verifyB1B2Cleanup();
  await insertIntraEdges();
  await insertAliases();
  await insertHandoffTags();
  await postflight();
  console.log("\nDone.");
  console.log("  UI: https://tests.semantius.app/domain_map/data_object_relationships");
  console.log("  UI: https://tests.semantius.app/domain_map/data_object_aliases");
  console.log("  UI: https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
