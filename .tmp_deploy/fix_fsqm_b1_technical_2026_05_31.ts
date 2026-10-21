#!/usr/bin/env bun
/**
 * FSQM B1 truly-technical fixes (2026-05-31 continuation).
 *
 * Applies ONLY the audit's pre-specified, no-judgment items:
 *
 *   1. B1-S8  DELETE stale trigger_event 349 (audit_finding.created) and
 *             its dependents: handoff_processes(id=143) and handoffs(id=357).
 *             Audit names exact row IDs and explains FSQM is mis-emitting
 *             an event whose payload (audit_findings, id=294) is mastered
 *             by AUDIT (id=16), not FSQM. Cascade-safe deletion order:
 *             handoff_processes -> handoffs -> trigger_events.
 *
 *   2. B1-S5  INSERT 10 user-edges into data_object_relationships
 *             (Rule #10 built-in edges). All target users (id=748).
 *             Audit pre-specifies role labels per master.
 *
 *   3. B1-S4  INSERT 5 intra-domain data_object_relationships rows
 *             (audit pre-specifies tuples in B6 list).
 *
 *   4. B1-S6  INSERT 4 cross-domain data_object_relationships rows
 *             mirroring outbound handoffs (audit pre-specifies in B8
 *             and Pass 4).
 *
 *   5. B1-H1  INSERT 10 handoff_processes rows that the audit table
 *             pre-specifies with handoff_id + PCF id + external_id.
 *             record_status omitted (defaults to 'new' per Rule #1).
 *             proposal_source='agent_curated'. Excludes handoff 357
 *             (cascade-deleted by step 1) and 352 / 354 / 355 (already
 *             tagged agent_curated with different process_ids; conflict
 *             needs user judgment to resolve).
 *
 * Deferred (NOT applied by this loader):
 *   - B1-S1   A4 catalog_tagline / catalog_description (Rule #20).
 *   - B1-S2   M1 zero modules (new entities; Bucket 2 #1 module-split
 *             decision gates).
 *   - B1-S3   B4 pattern-flag flips (per instructions: pattern flag
 *             flips deferred).
 *   - B1-S7   B9 missing trigger_events (new entities).
 *   - B1-S9   B11 aliases (audit lists candidates but does NOT
 *             pre-specify alias_type / solution_id resolution; vendor
 *             synonyms need solution_term + solution_id arbitration).
 *   - B1-S10  B12 lifecycle states (new entities).
 *   - B1-S11  F1/F7 legacy skill cleanup (sequenced after M1).
 *   - B1-S12  C2 capability function-divergence review (judgment).
 *   - B1-M1..M4  MISSING masters (new entities).
 *   - regulations gap: 0 domain_regulations rows but the food-safety
 *             regulations themselves (FSMA, FDA Food Traceability,
 *             Codex HACCP, USDA FSIS, SQF/BRC GS/FSSC 22000/IFS Food)
 *             do NOT exist in the catalog yet; cannot link to
 *             non-existent rows. New regulation inserts are deferred
 *             per scope (new entities).
 *   - APQC tags for handoffs 352 / 354 / 355: already tagged
 *             agent_curated with different process_ids; would need user
 *             to choose between competing tags.
 *
 * Idempotent: every step reads existing state and inserts/patches/
 * deletes only the missing rows. Safe to re-run.
 *
 * Run from project root:
 *   bun run c:/dev/domain-map/.tmp_deploy/fix_fsqm_b1_technical_2026_05_31.ts
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
const del = (path: string) =>
  semCall("postgrestRequest", { method: "DELETE", path, body: {} }) as Promise<any[]>;

const FSQM_DOMAIN_ID = 157;
const USERS_DO_ID = 748;

// Master data_object IDs (FSQM-owned)
const DO = {
  haccp_plans: 507,
  critical_control_points: 508,
  ccp_measurements: 509,
  food_safety_incidents: 510,
  allergen_programs: 511,
  environmental_monitoring_samples: 512,
  sanitation_records: 513,
} as const;

// Cross-domain target data_object IDs (verified live)
const NEIGHBOR_DO = {
  recall_events: 497,        // FOOD-TRACE (155)
  audit_findings: 294,       // AUDIT (16)
  compliance_obligations: 287, // GRC (15)
} as const;

// ---------------------------------------------------------------------------
// B1-S8: DELETE stale trigger_event 349 (audit_finding.created) and
// its dependents. Cascade order: handoff_processes -> handoffs -> trigger_events.
// ---------------------------------------------------------------------------

async function deleteStaleAuditFindingEvent() {
  console.log("\n=== B1-S8: DELETE stale trigger_event 349 (mis-attributed) ===");

  // Verify the event still has data_object_id=294 (AUDIT-mastered audit_findings).
  const events = await get("/trigger_events?id=eq.349&select=id,event_name,data_object_id");
  if (events.length === 0) {
    console.log("  = trigger_event 349: already deleted, skipping");
    return;
  }
  const event = events[0];
  if (event.data_object_id !== 294 || event.event_name !== "audit_finding.created") {
    console.log(
      `  ! trigger_event 349 changed since audit (event_name="${event.event_name}", data_object_id=${event.data_object_id}); refusing to delete`,
    );
    return;
  }

  // Find every handoff that still references trigger_event 349.
  const handoffs = await get("/handoffs?trigger_event_id=eq.349&select=id");
  const handoffIds = handoffs.map((h) => Number(h.id));
  console.log(`  - found ${handoffIds.length} handoff(s) referencing trigger_event 349: [${handoffIds.join(",")}]`);

  // Delete handoff_processes for those handoffs first.
  if (handoffIds.length > 0) {
    const hpRows = await get(
      `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=id,handoff_id,process_id`,
    );
    for (const hp of hpRows) {
      await del(`/handoff_processes?id=eq.${hp.id}`);
      console.log(`  - deleted handoff_processes id=${hp.id} (handoff_id=${hp.handoff_id}, process_id=${hp.process_id})`);
    }
  }

  // Delete handoffs.
  for (const hid of handoffIds) {
    await del(`/handoffs?id=eq.${hid}`);
    console.log(`  - deleted handoffs id=${hid}`);
  }

  // Delete the trigger_event itself.
  await del("/trigger_events?id=eq.349");
  console.log("  - deleted trigger_events id=349 (audit_finding.created)");
}

// ---------------------------------------------------------------------------
// B1-S5: INSERT user-edges (Rule #10).
// Each edge: <master> -> users (id=748). many_to_many reference.
// Direction matches catalog idiom (master is source; users is target).
// ---------------------------------------------------------------------------

type UserEdge = {
  source_do_id: number;
  source_name: string; // for label + logging
  relationship_verb: string;
  inverse_verb: string;
  is_required: boolean;
};

const USER_EDGES: UserEdge[] = [
  {
    source_do_id: DO.haccp_plans,
    source_name: "haccp_plans",
    relationship_verb: "is authored by PCQI",
    inverse_verb: "authors HACCP plan",
    is_required: true,
  },
  {
    source_do_id: DO.haccp_plans,
    source_name: "haccp_plans",
    relationship_verb: "is approved by plant manager",
    inverse_verb: "approves HACCP plan",
    is_required: true,
  },
  {
    source_do_id: DO.critical_control_points,
    source_name: "critical_control_points",
    relationship_verb: "is monitored by",
    inverse_verb: "monitors CCP",
    is_required: true,
  },
  {
    source_do_id: DO.ccp_measurements,
    source_name: "ccp_measurements",
    relationship_verb: "is recorded by operator",
    inverse_verb: "records CCP measurement",
    is_required: true,
  },
  {
    source_do_id: DO.food_safety_incidents,
    source_name: "food_safety_incidents",
    relationship_verb: "is reported by",
    inverse_verb: "reports food safety incident",
    is_required: true,
  },
  {
    source_do_id: DO.food_safety_incidents,
    source_name: "food_safety_incidents",
    relationship_verb: "is owned by QA manager",
    inverse_verb: "owns food safety incident",
    is_required: true,
  },
  {
    source_do_id: DO.allergen_programs,
    source_name: "allergen_programs",
    relationship_verb: "is owned by QA manager",
    inverse_verb: "owns allergen program",
    is_required: true,
  },
  {
    source_do_id: DO.environmental_monitoring_samples,
    source_name: "environmental_monitoring_samples",
    relationship_verb: "is collected by EMP technician",
    inverse_verb: "collects EMP sample",
    is_required: true,
  },
  {
    source_do_id: DO.sanitation_records,
    source_name: "sanitation_records",
    relationship_verb: "is performed by sanitor",
    inverse_verb: "performs sanitation",
    is_required: true,
  },
  {
    source_do_id: DO.sanitation_records,
    source_name: "sanitation_records",
    relationship_verb: "is verified by supervisor",
    inverse_verb: "verifies sanitation",
    is_required: true,
  },
];

async function insertUserEdges() {
  console.log("\n=== B1-S5: INSERT data_object_relationships user-edges ===");

  const sourceIds = [...new Set(USER_EDGES.map((e) => e.source_do_id))];
  const existing = await get(
    `/data_object_relationships?select=id,data_object_id,related_data_object_id,relationship_verb&data_object_id=in.(${sourceIds.join(",")})&related_data_object_id=eq.${USERS_DO_ID}`,
  );
  const existingKey = new Set(
    existing.map((r) => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`),
  );

  const toInsert: Row[] = [];
  for (const edge of USER_EDGES) {
    const key = `${edge.source_do_id}|${USERS_DO_ID}|${edge.relationship_verb}`;
    if (existingKey.has(key)) {
      console.log(`  = ${edge.source_name} -> users (${edge.relationship_verb}): exists, skipping`);
      continue;
    }
    toInsert.push({
      data_object_id: edge.source_do_id,
      related_data_object_id: USERS_DO_ID,
      data_object_relationship_label: `${edge.source_name} ${edge.relationship_verb} users`,
      relationship_verb: edge.relationship_verb,
      inverse_verb: edge.inverse_verb,
      relationship_type: "many_to_many",
      relationship_kind: "reference",
      owner_side: "source",
      is_required: edge.is_required,
      // record_status omitted -> defaults to 'new' per Rule #1.
      // notes omitted -> empty per Rule #15.
    });
  }

  if (toInsert.length === 0) {
    console.log("  (nothing to insert)");
    return;
  }
  const inserted = await post("/data_object_relationships", toInsert);
  for (const r of inserted) {
    console.log(`  + id=${r.id} ${r.data_object_relationship_label}`);
  }
}

// ---------------------------------------------------------------------------
// B1-S4: INSERT intra-domain data_object_relationships.
// Audit pre-specifies 5 verbs in the B6 list (excluding the cross-domain
// food_safety_incidents -> recall_events which is handled in B1-S6).
// ---------------------------------------------------------------------------

type IntraEdge = {
  source_do_id: number;
  source_name: string;
  related_do_id: number;
  related_name: string;
  relationship_verb: string;
  inverse_verb: string;
  relationship_type: "one_to_one" | "one_to_many" | "many_to_many";
  relationship_kind: "composition" | "reference" | "association" | "inheritance";
  owner_side: "source" | "target";
  is_required: boolean;
};

const INTRA_EDGES: IntraEdge[] = [
  {
    source_do_id: DO.haccp_plans,
    source_name: "haccp_plans",
    related_do_id: DO.critical_control_points,
    related_name: "critical_control_points",
    relationship_verb: "defines",
    inverse_verb: "is defined by",
    relationship_type: "one_to_many",
    relationship_kind: "composition",
    owner_side: "source",
    is_required: true,
  },
  {
    source_do_id: DO.critical_control_points,
    source_name: "critical_control_points",
    related_do_id: DO.ccp_measurements,
    related_name: "ccp_measurements",
    relationship_verb: "is monitored by",
    inverse_verb: "monitors",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    owner_side: "source",
    is_required: true,
  },
  {
    source_do_id: DO.allergen_programs,
    source_name: "allergen_programs",
    related_do_id: DO.environmental_monitoring_samples,
    related_name: "environmental_monitoring_samples",
    relationship_verb: "is verified by",
    inverse_verb: "verifies",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    owner_side: "source",
    is_required: false,
  },
  {
    source_do_id: DO.haccp_plans,
    source_name: "haccp_plans",
    related_do_id: DO.food_safety_incidents,
    related_name: "food_safety_incidents",
    relationship_verb: "governs",
    inverse_verb: "is governed by",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    owner_side: "source",
    is_required: false,
  },
  {
    source_do_id: DO.environmental_monitoring_samples,
    source_name: "environmental_monitoring_samples",
    related_do_id: DO.food_safety_incidents,
    related_name: "food_safety_incidents",
    relationship_verb: "triggers",
    inverse_verb: "is triggered by",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    owner_side: "source",
    is_required: false,
  },
];

async function insertIntraEdges() {
  console.log("\n=== B1-S4: INSERT data_object_relationships intra-domain edges ===");
  await insertEdgesBatch(INTRA_EDGES);
}

// ---------------------------------------------------------------------------
// B1-S6: INSERT cross-domain data_object_relationships mirroring outbound
// handoffs (audit pre-specifies in B8 and Pass 4).
// ---------------------------------------------------------------------------

const CROSS_EDGES: IntraEdge[] = [
  {
    source_do_id: DO.food_safety_incidents,
    source_name: "food_safety_incidents",
    related_do_id: NEIGHBOR_DO.recall_events,
    related_name: "recall_events",
    relationship_verb: "spawns",
    inverse_verb: "is spawned by",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    owner_side: "source",
    is_required: false,
  },
  {
    source_do_id: DO.haccp_plans,
    source_name: "haccp_plans",
    related_do_id: NEIGHBOR_DO.audit_findings,
    related_name: "audit_findings",
    relationship_verb: "is subject to",
    inverse_verb: "raised against",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    owner_side: "target",
    is_required: false,
  },
  {
    source_do_id: DO.food_safety_incidents,
    source_name: "food_safety_incidents",
    related_do_id: NEIGHBOR_DO.compliance_obligations,
    related_name: "compliance_obligations",
    relationship_verb: "triggers",
    inverse_verb: "is triggered by",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    owner_side: "source",
    is_required: false,
  },
  {
    source_do_id: DO.haccp_plans,
    source_name: "haccp_plans",
    related_do_id: NEIGHBOR_DO.compliance_obligations,
    related_name: "compliance_obligations",
    relationship_verb: "is subject to",
    inverse_verb: "constrains",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    owner_side: "target",
    is_required: false,
  },
];

async function insertCrossEdges() {
  console.log("\n=== B1-S6: INSERT data_object_relationships cross-domain edges ===");
  await insertEdgesBatch(CROSS_EDGES);
}

async function insertEdgesBatch(edges: IntraEdge[]) {
  const sourceIds = [...new Set(edges.map((e) => e.source_do_id))];
  const relatedIds = [...new Set(edges.map((e) => e.related_do_id))];
  // Pre-flight: read everything that could collide on (source, related, verb).
  const existing = await get(
    `/data_object_relationships?select=id,data_object_id,related_data_object_id,relationship_verb&data_object_id=in.(${sourceIds.join(",")})&related_data_object_id=in.(${relatedIds.join(",")})`,
  );
  const existingKey = new Set(
    existing.map((r) => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`),
  );

  const toInsert: Row[] = [];
  for (const e of edges) {
    const key = `${e.source_do_id}|${e.related_do_id}|${e.relationship_verb}`;
    if (existingKey.has(key)) {
      console.log(`  = ${e.source_name} ${e.relationship_verb} ${e.related_name}: exists, skipping`);
      continue;
    }
    toInsert.push({
      data_object_id: e.source_do_id,
      related_data_object_id: e.related_do_id,
      data_object_relationship_label: `${e.source_name} ${e.relationship_verb} ${e.related_name}`,
      relationship_verb: e.relationship_verb,
      inverse_verb: e.inverse_verb,
      relationship_type: e.relationship_type,
      relationship_kind: e.relationship_kind,
      owner_side: e.owner_side,
      is_required: e.is_required,
      // record_status omitted -> defaults to 'new' per Rule #1.
      // notes omitted -> empty per Rule #15.
    });
  }

  if (toInsert.length === 0) {
    console.log("  (nothing to insert)");
    return;
  }
  const inserted = await post("/data_object_relationships", toInsert);
  for (const r of inserted) {
    console.log(`  + id=${r.id} ${r.data_object_relationship_label}`);
  }
}

// ---------------------------------------------------------------------------
// B1-H1: INSERT handoff_processes (agent_curated) for FSQM handoffs.
// Audit pre-specifies (handoff_id, PCF external_id) tuples. Excludes
// handoff 357 (deleted by B1-S8) and 352 / 354 / 355 (already tagged
// agent_curated with different process_ids; conflict deferred to user).
// ---------------------------------------------------------------------------

type HandoffProcess = {
  handoff_id: number;
  process_id: number;
  expected_external_id: string;
  pcf_name: string;
};

const HANDOFF_PROCESSES: HandoffProcess[] = [
  { handoff_id: 356, process_id: 204, expected_external_id: "20111", pcf_name: "Initiate recall" },
  { handoff_id: 358, process_id: 170, expected_external_id: "10369", pcf_name: "Perform quality testing" },
  { handoff_id: 975, process_id: 579, expected_external_id: "10089", pcf_name: "Eliminate quality and reliability problems" },
  { handoff_id: 976, process_id: 37, expected_external_id: "20110", pcf_name: "Manage product recalls and regulatory audits" },
  { handoff_id: 977, process_id: 393, expected_external_id: "11047", pcf_name: "Ensure compliance" },
  { handoff_id: 978, process_id: 208, expected_external_id: "20115", pcf_name: "Monitor and audit recall effectiveness" },
  { handoff_id: 979, process_id: 1551, expected_external_id: "19248", pcf_name: "Undertake quality control" },
  { handoff_id: 980, process_id: 162, expected_external_id: "10368", pcf_name: "Develop quality standards and procedures" },
  { handoff_id: 361, process_id: 805, expected_external_id: "10289", pcf_name: "Certify and validate suppliers" },
  { handoff_id: 971, process_id: 818, expected_external_id: "10302", pcf_name: "Monitor quality of product delivered" },
];

async function insertHandoffProcesses() {
  console.log("\n=== B1-H1: INSERT handoff_processes (agent_curated) ===");

  const handoffIds = [...new Set(HANDOFF_PROCESSES.map((r) => r.handoff_id))];
  const processIds = [...new Set(HANDOFF_PROCESSES.map((r) => r.process_id))];

  const [handoffs, processes] = await Promise.all([
    get(`/handoffs?select=id,source_domain_id,target_domain_id&id=in.(${handoffIds.join(",")})`),
    get(`/processes?select=id,external_id&id=in.(${processIds.join(",")})`),
  ]);
  const handoffMap = new Map<number, { source: number; target: number }>(
    handoffs.map((h) => [
      Number(h.id),
      { source: Number(h.source_domain_id), target: Number(h.target_domain_id) },
    ]),
  );
  const processMap = new Map<number, string>(
    processes.map((p) => [Number(p.id), String(p.external_id)]),
  );

  // Verify every handoff touches FSQM (either side) and PCF external_id matches.
  for (const row of HANDOFF_PROCESSES) {
    const hinfo = handoffMap.get(row.handoff_id);
    if (!hinfo) {
      throw new Error(`pre-flight: handoff_id=${row.handoff_id} not found`);
    }
    if (hinfo.source !== FSQM_DOMAIN_ID && hinfo.target !== FSQM_DOMAIN_ID) {
      throw new Error(
        `pre-flight: handoff id=${row.handoff_id} touches neither side of FSQM (source=${hinfo.source}, target=${hinfo.target})`,
      );
    }
    const liveExternal = processMap.get(row.process_id);
    if (!liveExternal) {
      throw new Error(`pre-flight: process_id=${row.process_id} not found`);
    }
    if (liveExternal !== row.expected_external_id) {
      throw new Error(
        `pre-flight: process_id=${row.process_id} external_id is "${liveExternal}", audit expected "${row.expected_external_id}". Refusing to write.`,
      );
    }
  }
  console.log(`  + pre-flight: all ${HANDOFF_PROCESSES.length} (handoff_id, process_id) pairs verified`);

  // Skip existing rows.
  const existing = await get(
    `/handoff_processes?select=id,handoff_id,process_id&handoff_id=in.(${handoffIds.join(",")})`,
  );
  const existingKey = new Set(existing.map((r) => `${r.handoff_id}|${r.process_id}`));

  const toInsert: Row[] = [];
  for (const row of HANDOFF_PROCESSES) {
    const key = `${row.handoff_id}|${row.process_id}`;
    if (existingKey.has(key)) {
      console.log(`  = handoff_id=${row.handoff_id} process_id=${row.process_id}: exists, skipping`);
      continue;
    }
    toInsert.push({
      handoff_id: row.handoff_id,
      process_id: row.process_id,
      role: "implements",
      proposal_source: "agent_curated",
      // record_status omitted -> defaults to 'new' per Rule #1.
      // notes omitted -> empty per Rule #15.
    });
  }

  if (toInsert.length === 0) {
    console.log("  (nothing to insert)");
    return;
  }
  const inserted = await post("/handoff_processes", toInsert);
  for (const r of inserted) {
    const audit = HANDOFF_PROCESSES.find(
      (a) => a.handoff_id === Number(r.handoff_id) && a.process_id === Number(r.process_id),
    );
    console.log(
      `  + id=${r.id} handoff_id=${r.handoff_id} -> process_id=${r.process_id} (${audit?.pcf_name}) key="${r.key}"`,
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("FSQM B1 truly-technical fixes (2026-05-31)");
  console.log("==========================================");

  await deleteStaleAuditFindingEvent();
  await insertUserEdges();
  await insertIntraEdges();
  await insertCrossEdges();
  await insertHandoffProcesses();

  console.log("\nDone.");
  console.log("  UI links:");
  console.log("    https://tests.semantius.app/domain_map/trigger_events");
  console.log("    https://tests.semantius.app/domain_map/handoffs");
  console.log("    https://tests.semantius.app/domain_map/data_object_relationships");
  console.log("    https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
