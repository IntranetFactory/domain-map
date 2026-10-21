#!/usr/bin/env bun
// ESIGN B1 technical fixes (continuation, 2026-05-31).
//
// Scope: only the truly-technical fixes from audits/ESIGN.md Bucket 1.
// Judgment items, items gated on B2 decisions, and items that depend on the
// not-yet-authored ESIGN-SIGNATURE-OPS module are deferred.
//
// Applies:
//   B1-S4  Insert 2 data_object_relationships rows: users sends/signs envelopes
//   B1-S7  PATCH lifecycle state 'voided' (id 441) to requires_permission=true
//          and permission_verb_override='void_envelope'
//          (M5 domain_module_id portion deferred until module exists)
//   B1-S9  Insert 2 domain_regulations rows: ESIGN (94) <- eIDAS (34) and FDA 21 CFR Part 11 (22)
//          Both applicability='conditional' (scope-bound: eIDAS only binds EU envelopes,
//          FDA 21 CFR Part 11 only binds FDA-regulated electronic records).
//   B1-S10 PATCH handoff_processes id=204 process_id from 1135 to 398
//
// Idempotent: pre-flights each write against live state and skips writes already in place.

import { $ } from "bun";

$.throws(false);

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
    const combined = `${stderr}\n${stdout}`;
    if (/JWT does not have authorization/i.test(combined)) {
      console.error("JWT-AUDIENCE ERROR (Rule #6) — STOP and surface verbatim to user:");
      console.error(combined);
      process.exit(2);
    }
    throw new Error(`semantius call failed (exit ${exitCode}): ${combined}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

async function post(path: string, body: Row | Row[]): Promise<Row[]> {
  return call({ method: "POST", path, body });
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

const ESIGN_DOMAIN_ID = 94;
const ENVELOPES_ID = 251;
const USERS_ID = 748;
const VOIDED_STATE_ID = 441;
const HANDOFF_PROCESS_ROW_ID = 204;
const NEW_PROCESS_ID = 398;
const EIDAS_ID = 34;
const FDA_21CFR11_ID = 22;

// ----- B1-S4: users -> envelopes relationships (sender, signer) -----

async function fixB1S4() {
  console.log("\n== B1-S4: users -> envelopes data_object_relationships (sender, signer) ==");

  const existing = await get(
    `/data_object_relationships?data_object_id=eq.${USERS_ID}&related_data_object_id=eq.${ENVELOPES_ID}&select=id,relationship_verb`
  );
  const haveVerbs = new Set(existing.map((r) => (r.relationship_verb as string) ?? ""));
  console.log(`  existing users->envelopes verbs: ${JSON.stringify([...haveVerbs])}`);

  const desired = [
    {
      data_object_id: USERS_ID,
      related_data_object_id: ENVELOPES_ID,
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      relationship_verb: "sends envelopes",
      inverse_verb: "is_sent_by",
      is_required: false,
      owner_side: "source",
    },
    {
      data_object_id: USERS_ID,
      related_data_object_id: ENVELOPES_ID,
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      relationship_verb: "signs envelopes",
      inverse_verb: "is_signed_by",
      is_required: false,
      owner_side: "source",
    },
  ];

  const toInsert = desired.filter((r) => !haveVerbs.has(r.relationship_verb as string));
  if (toInsert.length === 0) {
    console.log("  all desired user-edges already present, nothing to insert");
    return;
  }
  console.log(`  inserting ${toInsert.length} relationship row(s):`);
  for (const r of toInsert) console.log(`    - ${r.relationship_verb}`);
  const inserted = await post("/data_object_relationships", toInsert);
  console.log(`  inserted ${inserted.length} row(s)`);
}

// ----- B1-S7: PATCH voided lifecycle state to be a workflow gate -----

async function fixB1S7() {
  console.log("\n== B1-S7: PATCH envelopes lifecycle state 'voided' (id 441) ==");
  const [row] = await get(
    `/data_object_lifecycle_states?id=eq.${VOIDED_STATE_ID}&select=id,state_name,requires_permission,permission_verb_override`
  );
  if (!row) throw new Error(`lifecycle state id ${VOIDED_STATE_ID} not found`);
  if (row.state_name !== "voided") {
    throw new Error(`expected state_name 'voided' on id ${VOIDED_STATE_ID}, got '${row.state_name}'`);
  }
  if (row.requires_permission === true && row.permission_verb_override === "void_envelope") {
    console.log("  already requires_permission=true with verb 'void_envelope', nothing to patch");
    return;
  }
  console.log(
    `  before: requires_permission=${row.requires_permission}, permission_verb_override='${row.permission_verb_override}'`
  );
  const updated = await patch(
    `/data_object_lifecycle_states?id=eq.${VOIDED_STATE_ID}`,
    { requires_permission: true, permission_verb_override: "void_envelope" }
  );
  console.log(`  patched: ${JSON.stringify(updated[0])}`);
}

// ----- B1-S9: ESIGN domain_regulations for eIDAS and FDA 21 CFR Part 11 -----

async function fixB1S9() {
  console.log("\n== B1-S9: domain_regulations rows for ESIGN (eIDAS, FDA 21 CFR Part 11) ==");
  const existing = await get(
    `/domain_regulations?domain_id=eq.${ESIGN_DOMAIN_ID}&regulation_id=in.(${EIDAS_ID},${FDA_21CFR11_ID})&select=id,regulation_id`
  );
  const haveRegIds = new Set(existing.map((r) => r.regulation_id as number));
  const desired = [
    {
      domain_id: ESIGN_DOMAIN_ID,
      regulation_id: EIDAS_ID,
      applicability: "conditional",
    },
    {
      domain_id: ESIGN_DOMAIN_ID,
      regulation_id: FDA_21CFR11_ID,
      applicability: "conditional",
    },
  ];
  const toInsert = desired.filter((r) => !haveRegIds.has(r.regulation_id as number));
  if (toInsert.length === 0) {
    console.log("  both domain_regulations rows already present, nothing to insert");
    return;
  }
  console.log(`  inserting ${toInsert.length} row(s):`);
  for (const r of toInsert) console.log(`    - domain_id=${r.domain_id}, regulation_id=${r.regulation_id}, applicability=${r.applicability}`);
  const inserted = await post("/domain_regulations", toInsert);
  console.log(`  inserted ${inserted.length} row(s)`);
}

// ----- B1-S10: REPLACE APQC tag on handoff 217 (PATCH process_id) -----

async function fixB1S10() {
  console.log(`\n== B1-S10: PATCH handoff_processes id=${HANDOFF_PROCESS_ROW_ID} process_id -> ${NEW_PROCESS_ID} ==`);
  const [row] = await get(
    `/handoff_processes?id=eq.${HANDOFF_PROCESS_ROW_ID}&select=id,handoff_id,process_id,role,proposal_source,record_status,key`
  );
  if (!row) throw new Error(`handoff_processes id ${HANDOFF_PROCESS_ROW_ID} not found`);
  if (row.handoff_id !== 217) {
    throw new Error(`expected handoff_id=217 on row ${HANDOFF_PROCESS_ROW_ID}, got ${row.handoff_id}`);
  }
  if (row.process_id === NEW_PROCESS_ID) {
    console.log(`  already process_id=${NEW_PROCESS_ID}, nothing to patch`);
    return;
  }
  console.log(`  before: process_id=${row.process_id}, key=${row.key}`);
  // Pre-flight: ensure target process row exists
  const [target] = await get(`/processes?id=eq.${NEW_PROCESS_ID}&select=id,process_code,process_name`);
  if (!target) throw new Error(`target process id ${NEW_PROCESS_ID} not found`);
  // Pre-flight: ensure the new (handoff_id, process_id) key is not already taken
  const conflict = await get(
    `/handoff_processes?handoff_id=eq.${row.handoff_id}&process_id=eq.${NEW_PROCESS_ID}&select=id`
  );
  if (conflict.length > 0) {
    throw new Error(
      `cannot PATCH: a handoff_processes row already exists for handoff_id=${row.handoff_id} process_id=${NEW_PROCESS_ID} (ids: ${conflict.map((c) => c.id).join(",")})`
    );
  }
  const updated = await patch(
    `/handoff_processes?id=eq.${HANDOFF_PROCESS_ROW_ID}`,
    { process_id: NEW_PROCESS_ID }
  );
  console.log(`  patched: ${JSON.stringify(updated[0])}`);
}

async function main() {
  await fixB1S4();
  await fixB1S7();
  await fixB1S9();
  await fixB1S10();
  console.log("\nDone. Spot-check URLs:");
  console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
  console.log("  https://tests.semantius.app/domain_map/data_object_lifecycle_states");
  console.log("  https://tests.semantius.app/domain_map/domain_regulations");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
