#!/usr/bin/env bun
// CCAAS B1 technical fixes - 2026-05-31 continuation.
//
// Scope (audit-pre-specified, non-judgmental):
//   1. APQC handoff_processes: replace 2 wrong tags (B1-H1, B1-H2) by DELETE + INSERT,
//      and INSERT 5 new agent_curated tags (B1-H3, B1-H4, B1-H7, B1-H8, B1-H9).
//      B1-H5 (499.922) and B1-H6 (500.195) already present from prior load.
//   2. B1-B3 user-edges per Rule #10: 5 explicit users<->CCAAS-master edges.
//
// Deferred (out of scope per orchestrator prompt):
//   B1-S1..S7, B1-M1..M4, B1-U1..U5, B1-B1, B1-B2, B1-T1..T3 - all gated on module
//   shape decision (Bucket 2 #1) or involve new entities/aliases/judgment.
//   B1-S4 regulations - underlying regulations rows do not exist; would need new entity inserts.

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<unknown> {
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
  return text ? JSON.parse(text) : null;
}

async function get(path: string): Promise<Row[]> {
  return (await call({ method: "GET", path })) as Row[];
}

async function post(path: string, body: Row[] | Row): Promise<Row[]> {
  return ((await call({ method: "POST", path, body })) as Row[]) ?? [];
}

async function del(path: string): Promise<void> {
  await call({ method: "DELETE", path });
}

// =============================================================================
// 1. APQC handoff_processes fixes
// =============================================================================

// B1-H1: handoff 225, replace wrong process 37 with 928 (PCF 10396).
// B1-H2: handoff 226, replace wrong process 610 with 934 (PCF 10400).
const REPLACEMENTS: Array<{ existing_id: number; handoff_id: number; new_process_id: number }> = [
  { existing_id: 85,  handoff_id: 225, new_process_id: 928 },
  { existing_id: 127, handoff_id: 226, new_process_id: 934 },
];

// B1-H3, B1-H4, B1-H7, B1-H8, B1-H9: new agent_curated tags.
// (B1-H5/H6 already exist; B1-H10/H11 deferred to discovery pass 3.)
const NEW_TAGS: Array<{ handoff_id: number; process_id: number; note: string }> = [
  { handoff_id: 501, process_id: 928,  note: "B1-H3 contact_record.captured -> Respond to customer problems" },
  { handoff_id: 530, process_id: 138,  note: "B1-H4 intent.identified -> Analyze and respond to customer insight" },
  { handoff_id: 228, process_id: 928,  note: "B1-H7 conversation.escalated_to_human -> Respond to customer problems" },
  { handoff_id: 722, process_id: 1293, note: "B1-H8 knowledge_base_article.updated -> Maintain service support knowledge repository" },
  { handoff_id: 833, process_id: 928,  note: "B1-H9 chat_thread.escalated_to_ticket -> Respond to customer problems" },
];

async function fixHandoffProcesses() {
  console.log("=== APQC handoff_processes fixes ===");

  // Step 1: DELETE the two wrong tags.
  for (const r of REPLACEMENTS) {
    console.log(`  DELETE handoff_processes id=${r.existing_id} (wrong tag on handoff ${r.handoff_id})`);
    await del(`/handoff_processes?id=eq.${r.existing_id}`);
  }

  // Step 2: INSERT the corrected replacement tags + the 5 new agent_curated tags.
  // Skip any (handoff_id, process_id) pair that already exists - idempotent.
  const wantedKeys = [
    ...REPLACEMENTS.map(r => `${r.handoff_id}.${r.new_process_id}`),
    ...NEW_TAGS.map(r => `${r.handoff_id}.${r.process_id}`),
  ];
  const existing = await get(`/handoff_processes?select=key&key=in.(${wantedKeys.map(k => `"${k}"`).join(",")})`);
  const existingKeySet = new Set(existing.map(r => String(r.key)));

  const toInsert: Row[] = [];

  for (const r of REPLACEMENTS) {
    const key = `${r.handoff_id}.${r.new_process_id}`;
    if (existingKeySet.has(key)) {
      console.log(`  SKIP replacement ${key} (already present)`);
      continue;
    }
    toInsert.push({
      handoff_id: r.handoff_id,
      process_id: r.new_process_id,
      role: "implements",
      proposal_source: "agent_curated",
      // record_status omitted - default 'new' per Rule #1.
    });
  }

  for (const r of NEW_TAGS) {
    const key = `${r.handoff_id}.${r.process_id}`;
    if (existingKeySet.has(key)) {
      console.log(`  SKIP new tag ${key} (already present): ${r.note}`);
      continue;
    }
    toInsert.push({
      handoff_id: r.handoff_id,
      process_id: r.process_id,
      role: "implements",
      proposal_source: "agent_curated",
    });
  }

  if (toInsert.length > 0) {
    console.log(`  INSERT ${toInsert.length} handoff_processes rows`);
    await post("/handoff_processes", toInsert);
  } else {
    console.log("  nothing new to insert");
  }
}

// =============================================================================
// 2. B1-B3 user-edges per Rule #10
// =============================================================================

// Data-object ids confirmed live:
//   users (platform_builtin)        = 748
//   contact_records                 = 257
//   support_sessions                = 256
//   agent_states                    = 736
//   ccaas_call_recordings           = 735
//   disposition_codes               = 737
//
// Each edge follows the established pattern (data_object_id=users, related_data_object_id=target,
// owner_side=source, relationship_type=one_to_many, relationship_kind=reference).

const USER_EDGES: Array<{
  related_id: number;
  related_name: string;
  verb: string;
  inverse: string;
}> = [
  { related_id: 257, related_name: "contact_records",      verb: "handles",   inverse: "is_handled_by" },
  { related_id: 256, related_name: "support_sessions",     verb: "handles",   inverse: "is_handled_by" },
  { related_id: 736, related_name: "agent_states",         verb: "has",       inverse: "is_held_by" },
  { related_id: 735, related_name: "ccaas_call_recordings", verb: "evaluates", inverse: "is_evaluated_by" },
  { related_id: 737, related_name: "disposition_codes",    verb: "applies",   inverse: "is_applied_by" },
];

async function loadUserEdges() {
  console.log("=== B1-B3 user-edges (Rule #10) ===");

  // Pre-flight: skip any (data_object_id, related_data_object_id, relationship_verb) tuple
  // already present, in either direction.
  const existingFwd = await get(
    `/data_object_relationships?select=id,data_object_id,related_data_object_id,relationship_verb&data_object_id=eq.748&related_data_object_id=in.(${USER_EDGES.map(e => e.related_id).join(",")})`,
  );
  const existingRev = await get(
    `/data_object_relationships?select=id,data_object_id,related_data_object_id,relationship_verb&related_data_object_id=eq.748&data_object_id=in.(${USER_EDGES.map(e => e.related_id).join(",")})`,
  );
  const fwdSet = new Set(existingFwd.map(r => `${r.data_object_id}.${r.related_data_object_id}.${r.relationship_verb}`));
  const revSet = new Set(existingRev.map(r => `${r.data_object_id}.${r.related_data_object_id}.${r.relationship_verb}`));

  const toInsert: Row[] = [];
  for (const e of USER_EDGES) {
    const fwdKey = `748.${e.related_id}.${e.verb}`;
    const revKey = `${e.related_id}.748.${e.inverse}`;
    if (fwdSet.has(fwdKey) || revSet.has(revKey)) {
      console.log(`  SKIP users ${e.verb} ${e.related_name} (already present)`);
      continue;
    }
    toInsert.push({
      data_object_id: 748,
      related_data_object_id: e.related_id,
      relationship_verb: e.verb,
      inverse_verb: e.inverse,
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      owner_side: "source",
      is_required: false,
      data_object_relationship_label: `users ${e.verb} ${e.related_name}`,
      // record_status omitted - default 'new' per Rule #1.
      // notes omitted - Rule #15.
    });
  }

  if (toInsert.length > 0) {
    console.log(`  INSERT ${toInsert.length} data_object_relationships rows`);
    await post("/data_object_relationships", toInsert);
  } else {
    console.log("  all user-edges already present");
  }
}

// =============================================================================
// main
// =============================================================================

async function main() {
  await fixHandoffProcesses();
  await loadUserEdges();
  console.log("done");
}

await main();
