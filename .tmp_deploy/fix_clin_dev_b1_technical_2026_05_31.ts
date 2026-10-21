// CLIN-DEV B1 technical fixes (2026-05-31)
//
// Scope: only the technical Bucket-1 items from audits/CLIN-DEV.md whose
// concrete values are pre-specified by the audit. Defers every judgment call
// (module split, scope, taglines) and every item gated on B1-S1 module creation.
//
// Applied:
//   - B1-S6: PATCH 8 trigger_events.event_category backfills (1014..1021)
//   - B1-S5 (partial): PATCH 8 data_object_relationships.relationship_verb
//     renames to snake_case (rows 653..660); the audit explicitly names the
//     row IDs and the verb form. The audit's master-to-users inverse-edge
//     inserts are deferred: no concrete tuples were pre-specified.
//   - B1-S11 (partial): INSERT 3 handoff_processes rows for handoffs
//     893 (PCF 353), 898 (PCF 1556), 895 (PCF 199). Handoff 894 (PCF "37 or
//     204") is deferred because the audit offers two PCFs and asks for a
//     pick; 896 and 897 are explicitly deferred by the audit itself.
//
// Idempotency: every operation reads the live row first, no-ops if the row
// already matches the target state.

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
// B1-S6: trigger_events.event_category backfill
// ---------------------------------------------------------------------------

const EVENT_CATEGORY: Record<number, string> = {
  1014: "lifecycle",
  1015: "signal",
  1016: "threshold",
  1017: "state_change",
  1018: "state_change",
  1019: "state_change",
  1020: "lifecycle",
  1021: "state_change",
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
      `  PATCH trigger_events.id=${row.id} (${row.event_name}) event_category='' -> '${target}'`,
    );
    patched++;
  }
  console.log(`B1-S6: patched=${patched} skipped=${skipped} (target=${live.length})`);
}

// ---------------------------------------------------------------------------
// B1-S5 (partial): snake_case the 8 noun-phrase relationship_verb values
// ---------------------------------------------------------------------------

const VERB_RENAME: Record<number, string> = {
  653: "owns_device",
  654: "performed_maintenance",
  655: "performed_calibration",
  656: "operated_cycle",
  657: "reported_incident",
  658: "manages_recall",
  659: "assigned_work_orders",
  660: "opened_work_orders",
};

async function renameUserEdgeVerbs(): Promise<void> {
  const ids = Object.keys(VERB_RENAME).join(",");
  const live = (await pgGet(
    `/data_object_relationships?id=in.(${ids})&select=id,relationship_verb`,
  )) as Array<{ id: number; relationship_verb: string }>;
  let patched = 0;
  let skipped = 0;
  for (const row of live) {
    const target = VERB_RENAME[row.id];
    if (row.relationship_verb === target) {
      skipped++;
      continue;
    }
    await pgPatch(`/data_object_relationships?id=eq.${row.id}`, {
      relationship_verb: target,
    });
    console.log(
      `  PATCH data_object_relationships.id=${row.id} relationship_verb='${row.relationship_verb}' -> '${target}'`,
    );
    patched++;
  }
  console.log(`B1-S5 (verb rename): patched=${patched} skipped=${skipped} (target=${live.length})`);
}

// ---------------------------------------------------------------------------
// B1-S11 (partial): handoff_processes for the 3 unambiguously tagged handoffs
// ---------------------------------------------------------------------------

type ProcTag = { handoffId: number; processId: number };

const TAGS: ProcTag[] = [
  { handoffId: 893, processId: 353 }, // CLIN-DEV -> ITSM, work_order.opened, Perform asset maintenance L3 (19253)
  { handoffId: 898, processId: 1556 }, // CLIN-DEV -> ITSM, calibration.due, Perform preventative asset maintenance L4 (10947)
  { handoffId: 895, processId: 199 }, // CLIN-DEV -> GRC, device_incident.reported, Report incidents and risks to regulatory bodies L3 (12840)
];

async function loadHandoffProcessTags(): Promise<void> {
  // Pre-flight: verify all handoff_ids and process_ids exist.
  const handoffIds = TAGS.map((t) => t.handoffId).join(",");
  const processIds = TAGS.map((t) => t.processId).join(",");
  const handoffs = (await pgGet(
    `/handoffs?id=in.(${handoffIds})&select=id`,
  )) as Array<{ id: number }>;
  const processes = (await pgGet(
    `/processes?id=in.(${processIds})&select=id`,
  )) as Array<{ id: number }>;
  const haveH = new Set(handoffs.map((r) => r.id));
  const haveP = new Set(processes.map((r) => r.id));
  for (const t of TAGS) {
    if (!haveH.has(t.handoffId)) throw new Error(`Pre-flight fail: handoff ${t.handoffId} missing`);
    if (!haveP.has(t.processId)) throw new Error(`Pre-flight fail: process ${t.processId} missing`);
  }

  // Idempotency: skip if (handoff_id, process_id) already exists.
  const existing = (await pgGet(
    `/handoff_processes?handoff_id=in.(${handoffIds})&select=handoff_id,process_id`,
  )) as Array<{ handoff_id: number; process_id: number }>;
  const existingKey = new Set(existing.map((r) => `${r.handoff_id}.${r.process_id}`));

  const rows = TAGS.filter(
    (t) => !existingKey.has(`${t.handoffId}.${t.processId}`),
  ).map((t) => ({
    label: `handoff_${t.handoffId}_implements_process_${t.processId}`,
    handoff_id: t.handoffId,
    process_id: t.processId,
    role: "implements",
    proposal_source: "agent_curated",
    // record_status omitted: defaults to 'new' per SKILL.md rule #1.
    // notes omitted: empty by default per SKILL.md rule #15.
  }));

  if (rows.length === 0) {
    console.log(`B1-S11: 0 new handoff_processes rows (all ${TAGS.length} already present)`);
    return;
  }
  const inserted = (await pgPost(`/handoff_processes`, rows)) as
    | Array<{ id: number; handoff_id: number; process_id: number }>
    | null;
  console.log(
    `B1-S11: inserted ${rows.length} handoff_processes rows: ${rows
      .map((r) => `handoff=${r.handoff_id} -> process=${r.process_id}`)
      .join("; ")}`,
  );
  if (inserted && Array.isArray(inserted)) {
    for (const r of inserted) {
      console.log(`  -> id=${r.id} handoff_id=${r.handoff_id} process_id=${r.process_id}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

console.log("CLIN-DEV B1 technical fixes - 2026-05-31");
console.log("==========================================");
await backfillEventCategories();
console.log("");
await renameUserEdgeVerbs();
console.log("");
await loadHandoffProcessTags();
console.log("");
console.log("Done.");
