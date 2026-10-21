// RPA B1 technical-only fixes per audits/RPA.md continuation 2026-05-31.
// Scope:
//  - B1-S3: PATCH event_category on 10 trigger_events rows.
//  - B1-S6: INSERT 7 users -> RPA-master edges in data_object_relationships
//           (Rule #10 audit pre-specified verbs).
//  - B1-S13: INSERT 4 handoff_processes rows tagging RPA cross-domain
//            handoffs to APQC PCF activities (audit pre-specified tuples).
//
// All other Bucket 1 items are gated on B1-S1 (Phase A modules), or are
// judgment calls deferred per dispatcher rules. record_status omitted on
// every insert (default 'new', per Rule #1).

const RPA_DOMAIN_ID = 38;
const USERS_ID = 748;

// ---------- semantius CLI helper ----------

async function pgRequest(method: string, path: string, body?: unknown): Promise<unknown> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
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
  const exit = await proc.exited;
  if (exit !== 0) {
    throw new Error(`semantius exit ${exit}: ${stderr || stdout}`);
  }
  const text = stdout.trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ---------- B1-S3: event_category backfill ----------

const eventCategoryMap: Record<string, "lifecycle" | "state_change" | "threshold" | "signal"> = {
  "rpa_bot.deployed": "lifecycle",
  "rpa_bot.disabled": "state_change",
  "rpa_execution.completed": "state_change",
  "rpa_execution.failed": "state_change",
  "rpa_execution.long_running": "threshold",
  "rpa_schedule.activated": "state_change",
  "rpa_activity.added": "lifecycle",
  "rpa_activity_log.exception_captured": "signal",
  "rpa_bot_credentials.expiring": "threshold",
  "rpa_deployment_package.released": "lifecycle",
};

async function fixEventCategories() {
  const eventNames = Object.keys(eventCategoryMap);
  const orFilter = eventNames.map(n => `event_name.eq.${n}`).join(",");
  const existing = (await pgRequest(
    "GET",
    `/trigger_events?or=(${orFilter})&select=id,event_name,event_category`,
  )) as Array<{ id: number; event_name: string; event_category: string }>;

  let patched = 0;
  for (const row of existing) {
    const desired = eventCategoryMap[row.event_name];
    if (!desired) continue;
    if (row.event_category === desired) continue;
    await pgRequest("PATCH", `/trigger_events?id=eq.${row.id}`, { event_category: desired });
    patched++;
  }
  console.log(`B1-S3: patched ${patched} trigger_events rows (${existing.length} matched).`);
}

// ---------- B1-S6: users edges to RPA masters ----------

// Audit pre-specified tuples (Rule #10 first-class built-in edges).
// rpa_bots=523, rpa_executions=524, rpa_schedules=525, rpa_activities=526,
// rpa_activity_logs=527, rpa_bot_credentials=528, rpa_deployment_packages=529.
const userEdges: Array<{
  related_data_object_id: number;
  relationship_verb: string;
  inverse_verb: string;
}> = [
  { related_data_object_id: 523, relationship_verb: "authored bots",           inverse_verb: "is_authored_by"  },
  { related_data_object_id: 525, relationship_verb: "scheduled runs",          inverse_verb: "is_scheduled_by" },
  { related_data_object_id: 529, relationship_verb: "approved deployments",    inverse_verb: "is_approved_by"  },
  { related_data_object_id: 528, relationship_verb: "rotated credentials",     inverse_verb: "is_rotated_by"   },
  { related_data_object_id: 527, relationship_verb: "triaged activity logs",   inverse_verb: "is_triaged_by"   },
  { related_data_object_id: 524, relationship_verb: "supervised executions",   inverse_verb: "is_supervised_by"},
  { related_data_object_id: 526, relationship_verb: "curated activities",      inverse_verb: "is_curated_by"   },
];

async function insertUserEdges() {
  const targetIds = userEdges.map(e => e.related_data_object_id);
  const existing = (await pgRequest(
    "GET",
    `/data_object_relationships?data_object_id=eq.${USERS_ID}&related_data_object_id=in.(${targetIds.join(",")})&select=id,related_data_object_id,relationship_verb`,
  )) as Array<{ id: number; related_data_object_id: number; relationship_verb: string }>;
  const existingPairs = new Set(
    existing.map(r => `${r.related_data_object_id}:${r.relationship_verb}`),
  );

  const rows = userEdges
    .filter(e => !existingPairs.has(`${e.related_data_object_id}:${e.relationship_verb}`))
    .map(e => ({
      data_object_id: USERS_ID,
      related_data_object_id: e.related_data_object_id,
      relationship_verb: e.relationship_verb,
      inverse_verb: e.inverse_verb,
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      is_required: false,
      owner_side: "source",
    }));

  if (rows.length === 0) {
    console.log(`B1-S6: 0 users-edges to insert (all 7 already present).`);
    return;
  }
  await pgRequest("POST", "/data_object_relationships", rows);
  console.log(`B1-S6: inserted ${rows.length} users-edges to RPA masters.`);
}

// ---------- B1-S13: handoff_processes ----------

// Audit pre-specified tuples. Process 1299 = "Triage IT service delivery
// incidents". Process 1184 = "Conduct IT compliance control auditing of
// internal and external services". Both verified live above.
const handoffProcessTuples: Array<{ handoff_id: number; process_id: number }> = [
  { handoff_id: 736, process_id: 1299 }, // rpa_execution.failed -> ITSM
  { handoff_id: 739, process_id: 1299 }, // rpa_bot_credentials.expiring -> ITSM
  { handoff_id: 737, process_id: 1184 }, // rpa_execution.completed -> AUDIT
  { handoff_id: 738, process_id: 1184 }, // rpa_activity_log.exception_captured -> AUDIT
];

async function insertHandoffProcesses() {
  const handoffIds = handoffProcessTuples.map(t => t.handoff_id);
  const existing = (await pgRequest(
    "GET",
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=handoff_id,process_id`,
  )) as Array<{ handoff_id: number; process_id: number }>;
  const existingPairs = new Set(existing.map(r => `${r.handoff_id}:${r.process_id}`));

  const rows = handoffProcessTuples
    .filter(t => !existingPairs.has(`${t.handoff_id}:${t.process_id}`))
    .map(t => ({
      handoff_id: t.handoff_id,
      process_id: t.process_id,
      role: "implements",
      proposal_source: "agent_curated",
    }));

  if (rows.length === 0) {
    console.log(`B1-S13: 0 handoff_processes to insert (all 4 already present).`);
    return;
  }
  await pgRequest("POST", "/handoff_processes", rows);
  console.log(`B1-S13: inserted ${rows.length} handoff_processes rows.`);
}

// ---------- main ----------

await fixEventCategories();
await insertUserEdges();
await insertHandoffProcesses();

console.log(`\nDone. RPA domain id=${RPA_DOMAIN_ID}.`);
console.log(`UI:`);
console.log(`  https://tests.semantius.app/domain_map/trigger_events`);
console.log(`  https://tests.semantius.app/domain_map/data_object_relationships`);
console.log(`  https://tests.semantius.app/domain_map/handoff_processes`);
