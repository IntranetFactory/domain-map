// Continuation loader for SALES-ENG b1 audit, technical fixes only.
//
// Scope (strict allowlist per the subagent prompt):
//   B1-S2: PATCH event_category enum backfill on 7 trigger_events rows.
//   B1-S7: INSERT 4 user-edge data_object_relationships (Rule #10), one per
//          SE master, with the verb shapes the audit pre-specified.
//
// Deferred (judgment, gated, or out of allowlist): B1-S1, S3, S4, S5, S6,
// S8, S9, S10, S11, S12, S13, S14. Detailed reasons appended to the audit.
//
// Idempotent: skips trigger_events rows whose event_category is already
// non-empty; skips user-edge inserts when the same (data_object_id,
// related_data_object_id, relationship_verb) triple already exists.

const PROJECT_ROOT_CHECK = process.cwd().replace(/\\/g, "/").toLowerCase();
if (!PROJECT_ROOT_CHECK.endsWith("/domain-map")) {
  throw new Error(
    `Loader must be invoked from c:/dev/domain-map (cwd is ${process.cwd()}). ` +
      `See SKILL.md rule #6: semantius CLI reads .env from cwd.`,
  );
}

type Json = unknown;

async function semantiusCall(
  action: string,
  payload: Json,
): Promise<unknown> {
  const proc = Bun.spawn(
    ["semantius", "call", "crud", action],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe" },
  );
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exit = await proc.exited;
  if (exit !== 0) {
    if (stderr.includes("required audience not found")) {
      // Rule #6: surface verbatim and halt.
      throw new Error(
        `JWT audience error from semantius (rule #6, stop immediately):\n${stderr.trim()}\n` +
          `Triggering call: action=${action} payload=${JSON.stringify(payload)}`,
      );
    }
    throw new Error(
      `semantius call crud ${action} failed (exit ${exit}):\n${stderr.trim()}\n` +
        `payload=${JSON.stringify(payload)}`,
    );
  }
  if (!stdout.trim()) return null;
  try {
    return JSON.parse(stdout);
  } catch {
    return stdout;
  }
}

async function pgGet(path: string): Promise<unknown> {
  return semantiusCall("postgrestRequest", { method: "GET", path });
}

async function pgPatch(path: string, body: Json): Promise<unknown> {
  return semantiusCall("postgrestRequest", {
    method: "PATCH",
    path,
    body,
  });
}

async function pgPost(path: string, body: Json): Promise<unknown> {
  return semantiusCall("postgrestRequest", {
    method: "POST",
    path,
    body,
  });
}

// ---------- B1-S2: event_category backfill ----------

// Audit pre-specifies these 7 rows and the target category values per Rule
// #13 enum (lifecycle / state_change / threshold / signal).
const EVENT_CATEGORY_PATCHES: Array<{
  id: number;
  event_name: string;
  event_category: "lifecycle" | "state_change" | "threshold" | "signal";
}> = [
  { id: 463, event_name: "call_recording.captured", event_category: "state_change" },
  { id: 464, event_name: "call_recording.transcribed", event_category: "state_change" },
  { id: 465, event_name: "sales_email.sent", event_category: "state_change" },
  { id: 466, event_name: "sales_email.opened", event_category: "signal" },
  { id: 467, event_name: "sales_email.replied", event_category: "signal" },
  { id: 468, event_name: "sales_email.bounced", event_category: "state_change" },
  { id: 469, event_name: "conversation_intelligence.insight_published", event_category: "state_change" },
];

async function applyEventCategoryBackfill(): Promise<{
  patched: number;
  skipped: number;
}> {
  const ids = EVENT_CATEGORY_PATCHES.map((p) => p.id).join(",");
  const live = (await pgGet(
    `/trigger_events?id=in.(${ids})&select=id,event_name,event_category`,
  )) as Array<{ id: number; event_name: string; event_category: string }>;
  const liveById = new Map(live.map((r) => [r.id, r]));

  let patched = 0;
  let skipped = 0;
  for (const patch of EVENT_CATEGORY_PATCHES) {
    const row = liveById.get(patch.id);
    if (!row) {
      throw new Error(
        `trigger_events row ${patch.id} (${patch.event_name}) not found live; ` +
          `aborting before any write.`,
      );
    }
    if (row.event_name !== patch.event_name) {
      throw new Error(
        `trigger_events row ${patch.id} event_name mismatch: ` +
          `live='${row.event_name}' audit='${patch.event_name}'. Aborting.`,
      );
    }
    if (row.event_category && row.event_category !== "") {
      console.log(
        `  [skip] event ${patch.id} (${patch.event_name}) already has ` +
          `event_category='${row.event_category}'`,
      );
      skipped++;
      continue;
    }
    await pgPatch(`/trigger_events?id=eq.${patch.id}`, {
      event_category: patch.event_category,
    });
    console.log(
      `  [patch] event ${patch.id} (${patch.event_name}) -> ` +
        `event_category='${patch.event_category}'`,
    );
    patched++;
  }
  return { patched, skipped };
}

// ---------- B1-S7: user-edge relationships per Rule #10 ----------

// Master data_object IDs (verified by live read).
const USERS_DO_ID = 748;
const SE_MASTERS: Array<{
  data_object_name: string;
  id: number;
  relationship_verb: string; // user-side action verb (audit pre-specified)
  inverse_verb: string; // master-side reverse phrasing
}> = [
  {
    data_object_name: "sales_cadences",
    id: 121,
    relationship_verb: "owns_cadence",
    inverse_verb: "is_owned_by",
  },
  {
    data_object_name: "call_recordings",
    id: 122,
    relationship_verb: "dialled_call",
    inverse_verb: "is_dialled_by",
  },
  {
    data_object_name: "sales_emails",
    id: 123,
    relationship_verb: "sent_email",
    inverse_verb: "is_sent_by",
  },
  {
    data_object_name: "conversation_intelligence_records",
    id: 124,
    relationship_verb: "analyzed_for_user",
    inverse_verb: "is_analyzed_for",
  },
];

async function applyUserEdges(): Promise<{
  inserted: number;
  skipped: number;
}> {
  // Verify the master IDs and the users DO still match expectations.
  const ids = [USERS_DO_ID, ...SE_MASTERS.map((m) => m.id)].join(",");
  const live = (await pgGet(
    `/data_objects?id=in.(${ids})&select=id,data_object_name,kind`,
  )) as Array<{ id: number; data_object_name: string; kind: string }>;
  const liveById = new Map(live.map((r) => [r.id, r]));
  const usersRow = liveById.get(USERS_DO_ID);
  if (!usersRow || usersRow.data_object_name !== "users" || usersRow.kind !== "platform_builtin") {
    throw new Error(
      `users data_object (id ${USERS_DO_ID}) is missing or has unexpected ` +
        `shape: ${JSON.stringify(usersRow)}. Aborting Rule #10 inserts.`,
    );
  }
  for (const m of SE_MASTERS) {
    const row = liveById.get(m.id);
    if (!row || row.data_object_name !== m.data_object_name) {
      throw new Error(
        `SE master id ${m.id} mismatch: live=${JSON.stringify(row)} ` +
          `expected name='${m.data_object_name}'. Aborting.`,
      );
    }
  }

  // Pull every existing relationship touching users x SE masters.
  const masterIds = SE_MASTERS.map((m) => m.id).join(",");
  const existing = (await pgGet(
    `/data_object_relationships?or=(and(data_object_id.eq.${USERS_DO_ID},related_data_object_id.in.(${masterIds})),and(related_data_object_id.eq.${USERS_DO_ID},data_object_id.in.(${masterIds})))&select=id,data_object_id,related_data_object_id,relationship_verb`,
  )) as Array<{
    id: number;
    data_object_id: number;
    related_data_object_id: number;
    relationship_verb: string;
  }>;
  const existingKey = new Set(
    existing.map(
      (r) => `${r.data_object_id}:${r.related_data_object_id}:${r.relationship_verb}`,
    ),
  );

  let inserted = 0;
  let skipped = 0;
  for (const m of SE_MASTERS) {
    const key = `${USERS_DO_ID}:${m.id}:${m.relationship_verb}`;
    if (existingKey.has(key)) {
      console.log(
        `  [skip] user-edge users->${m.data_object_name} verb='${m.relationship_verb}' already exists`,
      );
      skipped++;
      continue;
    }
    const body = {
      data_object_relationship_label: `users ${m.relationship_verb} ${m.data_object_name}`,
      data_object_id: USERS_DO_ID,
      related_data_object_id: m.id,
      owner_side: "source",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      relationship_verb: m.relationship_verb,
      inverse_verb: m.inverse_verb,
      is_required: false,
      // record_status omitted: default 'new' per Rule #1.
      // notes omitted: default '' per Rule #15.
    };
    await pgPost("/data_object_relationships", body);
    console.log(
      `  [insert] user-edge users -> ${m.data_object_name} verb='${m.relationship_verb}' inverse='${m.inverse_verb}'`,
    );
    inserted++;
  }
  return { inserted, skipped };
}

// ---------- main ----------

async function main(): Promise<void> {
  console.log("[B1-S2] event_category enum backfill on 7 trigger_events");
  const ec = await applyEventCategoryBackfill();
  console.log(`  -> patched=${ec.patched} skipped=${ec.skipped}\n`);

  console.log("[B1-S7] user-edge data_object_relationships (Rule #10), 4 rows");
  const ue = await applyUserEdges();
  console.log(`  -> inserted=${ue.inserted} skipped=${ue.skipped}\n`);

  console.log("Done.");
}

await main();
