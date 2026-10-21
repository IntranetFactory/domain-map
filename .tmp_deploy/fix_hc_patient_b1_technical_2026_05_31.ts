// HC-PATIENT B1 technical fixes (2026-05-31)
//
// Scope: only the technical Bucket-1 items from audits/HC-PATIENT.md whose
// concrete values are pre-specified by the audit. Defers every judgment call
// (module split, capabilities, taglines) and every item gated on B1-S1 module
// creation.
//
// Applied:
//   - B1-S9: PATCH 7 trigger_events.event_category backfills (ids 1022..1028).
//     The audit explicitly names the target enum value per event.
//   - B1-S5: INSERT 6 intra-domain data_object_relationships among the 6
//     HC-PATIENT masters. The audit explicitly names the source / target /
//     verb for each edge.
//
// Deferred (rationale per item):
//   - B1-S1, B1-S2, B1-S14, B1-S15, B1-S16: gated on B2-1 module split.
//   - B1-S3: catalog_tagline / catalog_description need user review per Rule #20.
//   - B1-S4: pattern flag flips deferred per the technical scope.
//   - B1-S6: user-edges per Rule #10 lack concrete verb / inverse_verb tuples
//     in the audit (it lists actor roles only). Same shape as the CLIN-DEV
//     defer; surface to user before inserting.
//   - B1-S7: of the 4 proposed cross-domain edges, 899/902 already exist
//     (rows 466, 467 already wire patient_appointments / patient_referrals
//     to customer_cases via 'opens'); 900 / 903 target an ERP-FIN row whose
//     target data_object is not pre-specified and no invoices data_object
//     exists; 901 is routed to Bucket 2 (B2-3) as semantically suspect.
//   - B1-S8: new outbound handoff for event 1022 is gated on Phase 0 vetting.
//   - B1-S10, B1-S11: B10b FK PATCHes require modules from B1-S1 first.
//   - B1-S12: bulk aliases inserts without exact tuple pre-spec.
//   - B1-S13: lifecycle states are new entity drafts (out of scope).
//   - B1-H1.1..1.7: handoff_processes lack concrete process_id values; the
//     audit calls for `/processes` lookup at fix-load time, which is a
//     judgment call.
//
// Idempotency: every operation reads the live row first, no-ops if the row
// already matches the target state (or already exists for the insert path).

const CLI = "semantius";

async function call(action: string, body: unknown): Promise<unknown> {
  const proc = Bun.spawn([CLI, "call", "crud", action], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  proc.stdin.end();
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exitCode !== 0) {
    // JWT-audience errors must surface verbatim per SKILL.md rule #6.
    throw new Error(
      `semantius call crud ${action} failed (exit ${exitCode})\nstderr: ${stderr}\nstdout: ${stdout}`,
    );
  }
  return stdout.trim() ? JSON.parse(stdout) : null;
}

async function pgGet(path: string): Promise<unknown[]> {
  const res = (await call("postgrestRequest", { method: "GET", path })) as unknown[];
  return Array.isArray(res) ? res : [];
}

async function pgPatch(path: string, body: unknown): Promise<unknown> {
  return await call("postgrestRequest", { method: "PATCH", path, body });
}

async function pgPost(path: string, body: unknown): Promise<unknown> {
  return await call("postgrestRequest", { method: "POST", path, body });
}

// ---------------------------------------------------------------------------
// B1-S9: trigger_events.event_category backfill
// ---------------------------------------------------------------------------

const EVENT_CATEGORY: Record<number, string> = {
  1022: "lifecycle", // patient_appointment.scheduled
  1023: "state_change", // patient_appointment.no_show
  1024: "state_change", // clinical_encounter.completed
  1025: "lifecycle", // clinical_order.placed
  1026: "lifecycle", // patient_referral.created
  1027: "state_change", // clinical_note.signed
  1028: "state_change", // care_plan.activated
};

async function backfillEventCategories(): Promise<void> {
  const ids = Object.keys(EVENT_CATEGORY).join(",");
  const live = (await pgGet(
    `/trigger_events?id=in.(${ids})&select=id,event_name,event_category`,
  )) as Array<{ id: number; event_name: string; event_category: string }>;
  let patched = 0;
  let skipped = 0;
  for (const row of live) {
    const target = EVENT_CATEGORY[row.id];
    if (row.event_category === target) {
      skipped++;
      continue;
    }
    await pgPatch(`/trigger_events?id=eq.${row.id}`, { event_category: target });
    console.log(
      `  PATCH trigger_events.id=${row.id} (${row.event_name}) event_category='${row.event_category}' -> '${target}'`,
    );
    patched++;
  }
  console.log(`B1-S9: patched=${patched} skipped=${skipped} (target=${live.length})`);
}

// ---------------------------------------------------------------------------
// B1-S5: intra-domain data_object_relationships among HC-PATIENT masters
// ---------------------------------------------------------------------------
//
// Data-object IDs (verified via /data_objects):
//   617 patient_appointments
//   618 clinical_encounters
//   619 care_plans
//   620 patient_referrals
//   621 clinical_orders
//   622 clinical_notes
//
// Edges (exactly as the audit pre-specifies):
//   1. patient_appointments produces clinical_encounters
//   2. clinical_encounters   produces clinical_orders
//   3. clinical_encounters   produces clinical_notes
//   4. patient_referrals     triggers clinical_encounters
//   5. care_plans            guides   clinical_encounters
//   6. clinical_orders       informs  clinical_notes

type IntraEdge = {
  source: number;
  target: number;
  sourceName: string;
  targetName: string;
  verb: string;
  inverse: string;
  cardinality: "one_to_one" | "one_to_many" | "many_to_many";
  kind: "composition" | "reference" | "association" | "inheritance";
  ownerSide: "source" | "target";
  isRequired: boolean;
};

const INTRA_EDGES: IntraEdge[] = [
  {
    source: 617,
    target: 618,
    sourceName: "patient_appointments",
    targetName: "clinical_encounters",
    verb: "produces",
    inverse: "is_produced_by",
    cardinality: "one_to_many",
    kind: "composition",
    ownerSide: "source",
    isRequired: false,
  },
  {
    source: 618,
    target: 621,
    sourceName: "clinical_encounters",
    targetName: "clinical_orders",
    verb: "produces",
    inverse: "is_produced_by",
    cardinality: "one_to_many",
    kind: "composition",
    ownerSide: "source",
    isRequired: false,
  },
  {
    source: 618,
    target: 622,
    sourceName: "clinical_encounters",
    targetName: "clinical_notes",
    verb: "produces",
    inverse: "is_produced_by",
    cardinality: "one_to_many",
    kind: "composition",
    ownerSide: "source",
    isRequired: false,
  },
  {
    source: 620,
    target: 618,
    sourceName: "patient_referrals",
    targetName: "clinical_encounters",
    verb: "triggers",
    inverse: "is_triggered_by",
    cardinality: "one_to_many",
    kind: "reference",
    ownerSide: "source",
    isRequired: false,
  },
  {
    source: 619,
    target: 618,
    sourceName: "care_plans",
    targetName: "clinical_encounters",
    verb: "guides",
    inverse: "is_guided_by",
    cardinality: "one_to_many",
    kind: "reference",
    ownerSide: "source",
    isRequired: false,
  },
  {
    source: 621,
    target: 622,
    sourceName: "clinical_orders",
    targetName: "clinical_notes",
    verb: "informs",
    inverse: "is_informed_by",
    cardinality: "one_to_many",
    kind: "reference",
    ownerSide: "source",
    isRequired: false,
  },
];

async function loadIntraDomainEdges(): Promise<void> {
  const allIds = Array.from(
    new Set(INTRA_EDGES.flatMap((e) => [e.source, e.target])),
  ).join(",");
  // Idempotency: pull every relationship row currently involving any of
  // the 6 HC-PATIENT masters; skip inserts whose (source, target, verb)
  // already exist.
  const existing = (await pgGet(
    `/data_object_relationships?or=(data_object_id.in.(${allIds}),related_data_object_id.in.(${allIds}))&select=id,data_object_id,related_data_object_id,relationship_verb`,
  )) as Array<{
    id: number;
    data_object_id: number;
    related_data_object_id: number;
    relationship_verb: string;
  }>;
  const existingKey = new Set(
    existing.map(
      (r) => `${r.data_object_id}.${r.related_data_object_id}.${r.relationship_verb}`,
    ),
  );

  const rows = INTRA_EDGES.filter(
    (e) => !existingKey.has(`${e.source}.${e.target}.${e.verb}`),
  ).map((e) => ({
    data_object_relationship_label: `${e.sourceName} ${e.verb} ${e.targetName}`,
    data_object_id: e.source,
    related_data_object_id: e.target,
    relationship_verb: e.verb,
    inverse_verb: e.inverse,
    relationship_type: e.cardinality,
    relationship_kind: e.kind,
    owner_side: e.ownerSide,
    is_required: e.isRequired,
    // record_status omitted: defaults to 'new' per SKILL.md rule #1.
    // notes omitted: empty by default per SKILL.md rule #15.
  }));

  if (rows.length === 0) {
    console.log(`B1-S5: 0 new data_object_relationships rows (all ${INTRA_EDGES.length} already present)`);
    return;
  }
  const inserted = (await pgPost(`/data_object_relationships`, rows)) as
    | Array<{ id: number; data_object_id: number; related_data_object_id: number; relationship_verb: string }>
    | null;
  console.log(`B1-S5: inserted ${rows.length} data_object_relationships rows:`);
  for (const r of rows) {
    console.log(
      `  -> ${r.data_object_relationship_label} (src=${r.data_object_id} tgt=${r.related_data_object_id})`,
    );
  }
  if (inserted && Array.isArray(inserted)) {
    for (const r of inserted) {
      console.log(`  POSTED id=${r.id} src=${r.data_object_id} tgt=${r.related_data_object_id} verb=${r.relationship_verb}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

console.log("HC-PATIENT B1 technical fixes - 2026-05-31");
console.log("===========================================");
await backfillEventCategories();
console.log("");
await loadIntraDomainEdges();
console.log("");
console.log("Done.");
