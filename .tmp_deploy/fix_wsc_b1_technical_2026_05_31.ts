#!/usr/bin/env bun
// WSC B1 technical fix-loop (2026-05-31).
//
// Applies the truly-technical (audit pre-specified, no judgment) subset of the
// 2026-05-30 WSC audit Bucket 1:
//
//   B1-S1: PATCH 12 trigger_events.event_category per audit mapping
//          (lifecycle / state_change).
//   B1-S2: B7 user-edge verb-shape canonicalization. DELETE 9 noun-phrase rows
//          (ids 287-295), INSERT 9 verb-shape replacements per audit naming.
//   B1-S4: B10b backfill. INSERT 1 DMDO (115, work_automations=246, consumer,
//          optional), then PATCH handoffs.target_domain_module_id=115 on row
//          790.
//   B1-S6: APQC tagging. INSERT 6 high-confidence handoff_processes rows
//          (agent_curated) where audit pre-specifies handoff_id + PCF and no
//          existing row exists (830, 831, 832, 834, 835, 836). Rows 828, 829,
//          833 already have handoff_processes rows from prior loads; left as-is.
//          Row 790 is the deferred no-clean-PCF case.
//   B1-S9: Pairwise consumer DMDOs. INSERT 10 consumer+optional DMDO rows on
//          WSC modules for cross-domain payloads the WSC side reads via
//          existing data_object_relationships.
//
// Deferred (require user judgment per the agent prompt):
//   B1-S3 / B1-S5: 2 intra-domain handoff INSERTs (new handoffs rows; the
//      orchestrator prompt restricts handoff INSERTs to handoff_processes
//      tagging only when audit pre-specifies handoff_id + PCF).
//   B1-S7 / B1-S8: report-only, no action.
//   All Bucket 2 (Rule #15 notes-pollution decisions, pattern-flag judgments,
//      Viva Connections solution_domains, EMPLOYEE-COLLAB-USER bundle).
//   All Bucket 3 (Phase 0 pending).
//
// Idempotent. Run from project root with:
//   bun run .tmp_deploy/fix_wsc_b1_technical_2026_05_31.ts

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

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

async function post(path: string, body: Row[]): Promise<Row[]> {
  return call({ method: "POST", path, body });
}

async function del(path: string): Promise<void> {
  await call({ method: "DELETE", path });
}

// ============================================================
// B1-S1: PATCH 12 trigger_events.event_category per audit
// ============================================================
const B1_S1_EVENT_CATEGORY: Array<{ id: number; category: string }> = [
  { id: 909, category: "lifecycle" },     // chat_channel.created
  { id: 910, category: "state_change" },  // chat_channel.archived
  { id: 911, category: "lifecycle" },     // chat_message.posted
  { id: 912, category: "state_change" },  // chat_message.flagged
  { id: 913, category: "state_change" },  // chat_thread.escalated_to_ticket
  { id: 914, category: "lifecycle" },     // chat_huddle.started
  { id: 915, category: "lifecycle" },     // channel_member.added
  { id: 916, category: "lifecycle" },     // external_guest.invited
  { id: 917, category: "state_change" },  // external_guest.access_revoked
  { id: 918, category: "lifecycle" },     // chat_attachment.shared
  { id: 919, category: "lifecycle" },     // channel_file_share.linked
  { id: 920, category: "state_change" },  // msp_ticket.from_chat
];

async function fixB1S1(): Promise<void> {
  console.log("B1-S1: PATCH 12 trigger_events.event_category per audit mapping");
  const ids = B1_S1_EVENT_CATEGORY.map(r => r.id);
  const before = await get(
    `/trigger_events?id=in.(${ids.join(",")})&select=id,event_name,event_category&order=id.asc`,
  );
  const empty = before.filter(r => r.event_category === "").length;
  console.log(`  ${empty}/${before.length} rows currently empty`);
  for (const { id, category } of B1_S1_EVENT_CATEGORY) {
    await patch(`/trigger_events?id=eq.${id}`, { event_category: category });
  }
  const after = await get(
    `/trigger_events?id=in.(${ids.join(",")})&select=id,event_name,event_category&order=id.asc`,
  );
  const stillEmpty = after.filter(r => r.event_category === "").length;
  console.log(`  after: ${after.length - stillEmpty}/${after.length} rows populated`);
  if (stillEmpty !== 0) throw new Error(`B1-S1 incomplete: ${stillEmpty} rows still empty`);
}

// ============================================================
// B1-S2: B7 verb-shape canonicalization
// DELETE 9 noun-phrase rows, INSERT 9 verb-shape replacements.
// data_object_id (subject) = 748 (users platform_builtin) for every row.
// ============================================================
type UserEdge = {
  legacy_id: number;
  related_data_object_id: number;
  relationship_verb: string;
  inverse_verb: string;
  relationship_type: string;
  relationship_kind: string;
  is_required: boolean;
  owner_side: string;
};

const B1_S2_EDGES: UserEdge[] = [
  // 287: owned channels -> owns_channel (chat_channels=564)
  { legacy_id: 287, related_data_object_id: 564,
    relationship_verb: "owns_channel",     inverse_verb: "is_owned_by",
    relationship_type: "one_to_many", relationship_kind: "reference",
    is_required: false, owner_side: "source" },
  // 288: created channels -> creates_channel (chat_channels=564)
  { legacy_id: 288, related_data_object_id: 564,
    relationship_verb: "creates_channel",  inverse_verb: "is_created_by",
    relationship_type: "one_to_many", relationship_kind: "reference",
    is_required: true,  owner_side: "source" },
  // 289: posted messages -> posts_message (chat_messages=565)
  { legacy_id: 289, related_data_object_id: 565,
    relationship_verb: "posts_message",    inverse_verb: "is_posted_by",
    relationship_type: "one_to_many", relationship_kind: "reference",
    is_required: true,  owner_side: "source" },
  // 290: started threads -> starts_thread (chat_threads=566)
  { legacy_id: 290, related_data_object_id: 566,
    relationship_verb: "starts_thread",    inverse_verb: "is_started_by",
    relationship_type: "one_to_many", relationship_kind: "reference",
    is_required: true,  owner_side: "source" },
  // 291: channel memberships -> holds_membership (channel_members=568)
  { legacy_id: 291, related_data_object_id: 568,
    relationship_verb: "holds_membership", inverse_verb: "is_held_by",
    relationship_type: "one_to_many", relationship_kind: "reference",
    is_required: true,  owner_side: "source" },
  // 292: started huddles -> starts_huddle (chat_huddles=567)
  { legacy_id: 292, related_data_object_id: 567,
    relationship_verb: "starts_huddle",    inverse_verb: "is_started_by",
    relationship_type: "one_to_many", relationship_kind: "reference",
    is_required: true,  owner_side: "source" },
  // 293: uploaded attachments -> uploads_attachment (chat_message_attachments=570)
  { legacy_id: 293, related_data_object_id: 570,
    relationship_verb: "uploads_attachment", inverse_verb: "is_uploaded_by",
    relationship_type: "one_to_many", relationship_kind: "reference",
    is_required: false, owner_side: "source" },
  // 294: shared files -> shares_file (channel_file_shares=571)
  { legacy_id: 294, related_data_object_id: 571,
    relationship_verb: "shares_file",      inverse_verb: "is_shared_by",
    relationship_type: "one_to_many", relationship_kind: "reference",
    is_required: false, owner_side: "source" },
  // 295: issued invitations -> issues_invitation (external_guest_invitations=569)
  { legacy_id: 295, related_data_object_id: 569,
    relationship_verb: "issues_invitation", inverse_verb: "is_issued_by",
    relationship_type: "one_to_many", relationship_kind: "reference",
    is_required: true,  owner_side: "source" },
];

const USERS_DATA_OBJECT_ID = 748;

async function fixB1S2(): Promise<void> {
  console.log("B1-S2: DELETE 9 noun-phrase user-edges + INSERT 9 verb-shape replacements");

  // Pre-flight: which legacy rows still exist? Which verb-shape replacements
  // already exist (re-run safety)?
  const legacyIds = B1_S2_EDGES.map(e => e.legacy_id);
  const legacy = await get(
    `/data_object_relationships?id=in.(${legacyIds.join(",")})` +
      `&select=id,related_data_object_id,relationship_verb`,
  );
  console.log(`  ${legacy.length}/${B1_S2_EDGES.length} legacy noun-phrase rows still present`);

  // Check for already-loaded verb-shape replacements (idempotency)
  const wantedVerbs = B1_S2_EDGES.map(e => e.relationship_verb);
  const existingNew = await get(
    `/data_object_relationships?data_object_id=eq.${USERS_DATA_OBJECT_ID}` +
      `&relationship_verb=in.(${wantedVerbs.join(",")})` +
      `&select=id,related_data_object_id,relationship_verb`,
  );
  const existingNewKeys = new Set(
    existingNew.map(r => `${r.related_data_object_id}|${r.relationship_verb}`),
  );

  // DELETE legacy rows that are still present
  for (const edge of B1_S2_EDGES) {
    if (legacy.find(r => r.id === edge.legacy_id)) {
      console.log(`  DELETE id=${edge.legacy_id} ("${legacy.find(r => r.id === edge.legacy_id)!.relationship_verb}")`);
      await del(`/data_object_relationships?id=eq.${edge.legacy_id}`);
    } else {
      console.log(`  id=${edge.legacy_id} already deleted; skipping`);
    }
  }

  // INSERT verb-shape replacements (skip any already present)
  const inserts: Row[] = [];
  for (const edge of B1_S2_EDGES) {
    const key = `${edge.related_data_object_id}|${edge.relationship_verb}`;
    if (existingNewKeys.has(key)) {
      console.log(`  verb-shape ${edge.relationship_verb} already present; skipping insert`);
      continue;
    }
    inserts.push({
      data_object_id: USERS_DATA_OBJECT_ID,
      related_data_object_id: edge.related_data_object_id,
      relationship_verb: edge.relationship_verb,
      inverse_verb: edge.inverse_verb,
      relationship_type: edge.relationship_type,
      relationship_kind: edge.relationship_kind,
      is_required: edge.is_required,
      owner_side: edge.owner_side,
    });
  }
  console.log(`  INSERT ${inserts.length} verb-shape rows`);
  if (inserts.length > 0) {
    await post("/data_object_relationships", inserts);
  }

  // Verification
  const after = await get(
    `/data_object_relationships?data_object_id=eq.${USERS_DATA_OBJECT_ID}` +
      `&related_data_object_id=in.(564,565,566,567,568,569,570,571)` +
      `&select=id,related_data_object_id,relationship_verb,inverse_verb&order=related_data_object_id.asc`,
  );
  console.log(`  after: ${after.length} user-edge rows to WSC masters`);
  for (const r of after) {
    console.log(`    id=${r.id} related=${r.related_data_object_id} verb=${r.relationship_verb} inverse=${r.inverse_verb}`);
  }
  // Each of the 8 WSC masters needs ≥1 user-edge. chat_channels(564) has two
  // (owner + creator); the other 7 have one each. Total expected: 9.
  if (after.length < 9) {
    throw new Error(`B1-S2: expected ≥9 user-edge rows post-load, saw ${after.length}`);
  }
  // No noun-phrase rows should remain
  const noisy = after.filter(r => typeof r.relationship_verb === "string" && (r.relationship_verb as string).includes(" "));
  if (noisy.length > 0) {
    throw new Error(`B1-S2: ${noisy.length} noun-phrase rows still present: ${noisy.map(r => r.relationship_verb).join(", ")}`);
  }
}

// ============================================================
// B1-S4: B10b backfill. INSERT 1 DMDO + PATCH handoff 790.
// ============================================================
const WSC_CHANNELS_CONVERSATIONS_MODULE_ID = 115;
const WORK_AUTOMATIONS_DATA_OBJECT_ID = 246;
const B1_S4_HANDOFF_ID = 790;

async function fixB1S4(): Promise<void> {
  console.log("B1-S4: INSERT 1 DMDO (115, work_automations=246, consumer, optional) + PATCH handoff 790");

  // Step 1: DMDO insert (idempotent on (module, data_object))
  const existingDmdo = await get(
    `/domain_module_data_objects?domain_module_id=eq.${WSC_CHANNELS_CONVERSATIONS_MODULE_ID}` +
      `&data_object_id=eq.${WORK_AUTOMATIONS_DATA_OBJECT_ID}&select=id,role,necessity`,
  );
  if (existingDmdo.length === 0) {
    console.log("  INSERT DMDO (115, 246, consumer, optional)");
    await post("/domain_module_data_objects", [
      {
        domain_module_id: WSC_CHANNELS_CONVERSATIONS_MODULE_ID,
        data_object_id: WORK_AUTOMATIONS_DATA_OBJECT_ID,
        role: "consumer",
        necessity: "optional",
      },
    ]);
  } else {
    console.log(`  DMDO already exists (id=${existingDmdo[0].id}, role=${existingDmdo[0].role}); skipping insert`);
  }

  // Step 2: PATCH handoffs.target_domain_module_id=115 on row 790
  const before = await get(
    `/handoffs?id=eq.${B1_S4_HANDOFF_ID}&select=id,source_domain_module_id,target_domain_module_id`,
  );
  if (before.length === 0) throw new Error(`B1-S4: handoff ${B1_S4_HANDOFF_ID} not found`);
  if (before[0].target_domain_module_id === WSC_CHANNELS_CONVERSATIONS_MODULE_ID) {
    console.log(`  handoff ${B1_S4_HANDOFF_ID} already targets module 115; skipping PATCH`);
  } else {
    console.log(`  PATCH handoff ${B1_S4_HANDOFF_ID} target_domain_module_id: ${before[0].target_domain_module_id} -> 115`);
    await patch(`/handoffs?id=eq.${B1_S4_HANDOFF_ID}`, {
      target_domain_module_id: WSC_CHANNELS_CONVERSATIONS_MODULE_ID,
    });
  }

  // Verification
  const after = await get(
    `/handoffs?id=eq.${B1_S4_HANDOFF_ID}&select=id,source_domain_module_id,target_domain_module_id`,
  );
  console.log(`  after: handoff 790 target_domain_module_id=${after[0].target_domain_module_id}`);
  if (after[0].target_domain_module_id !== WSC_CHANNELS_CONVERSATIONS_MODULE_ID) {
    throw new Error(`B1-S4: PATCH failed`);
  }
}

// ============================================================
// B1-S6: APQC handoff_processes. INSERT 6 high-confidence agent_curated rows.
// Skip 828, 829, 833 (already have handoff_processes rows from prior loads).
// Skip 790 (deferred, no clean PCF per audit).
// ============================================================
const B1_S6_INSERTS: Array<{ handoff_id: number; process_id: number; comment: string }> = [
  { handoff_id: 830, process_id: 273,  comment: "external_guest.invited -> IGA, PCF 20756 Manage IT user identity and authorization" },
  { handoff_id: 831, process_id: 273,  comment: "channel_member.added -> IGA, PCF 20756" },
  { handoff_id: 832, process_id: 1179, comment: "chat_message.posted -> DLP, PCF 20739 Review and monitor physical and logical IT data security measures" },
  { handoff_id: 834, process_id: 1299, comment: "chat_thread.escalated_to_ticket -> ITSM, PCF 20903 Triage IT service delivery incidents" },
  { handoff_id: 835, process_id: 196,  comment: "msp_ticket.from_chat -> MSP-PSA, PCF 10388 Manage customer service problems, requests, and inquiries" },
  { handoff_id: 836, process_id: 273,  comment: "external_guest.access_revoked -> IGA, PCF 20756" },
];

async function fixB1S6(): Promise<void> {
  console.log("B1-S6: INSERT 6 agent_curated handoff_processes rows");

  const handoffIds = B1_S6_INSERTS.map(r => r.handoff_id);
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})` +
      `&select=handoff_id,process_id`,
  );
  const existingKeys = new Set(existing.map(r => `${r.handoff_id}|${r.process_id}`));

  const inserts: Row[] = [];
  for (const r of B1_S6_INSERTS) {
    const key = `${r.handoff_id}|${r.process_id}`;
    if (existingKeys.has(key)) {
      console.log(`  ${key} already exists; skipping`);
      continue;
    }
    inserts.push({
      handoff_id: r.handoff_id,
      process_id: r.process_id,
      proposal_source: "agent_curated",
      role: "implements",
    });
  }
  console.log(`  INSERT ${inserts.length}/${B1_S6_INSERTS.length} rows`);
  if (inserts.length > 0) {
    await post("/handoff_processes", inserts);
  }

  // Verification
  const after = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})` +
      `&select=handoff_id,process_id,proposal_source&order=handoff_id.asc`,
  );
  console.log(`  after: ${after.length} matching rows`);
  for (const r of after) {
    console.log(`    handoff=${r.handoff_id} process=${r.process_id} source=${r.proposal_source}`);
  }
  if (after.length < B1_S6_INSERTS.length) {
    throw new Error(`B1-S6: expected ≥${B1_S6_INSERTS.length} rows post-load, saw ${after.length}`);
  }
}

// ============================================================
// B1-S9: Pairwise consumer DMDOs. INSERT 10 consumer+optional rows
// per audit mapping (per the relationship's WSC-side anchor).
// ============================================================
const B1_S9_DMDOS: Array<{ module_id: number; data_object_id: number; comment: string }> = [
  { module_id: 115, data_object_id: 429, comment: "WSC-CHANNELS-CONVERSATIONS consumer of content_documents (ECM)" },
  { module_id: 115, data_object_id: 431, comment: "WSC-CHANNELS-CONVERSATIONS consumer of document_folders (ECM)" },
  { module_id: 115, data_object_id: 246, comment: "WSC-CHANNELS-CONVERSATIONS consumer of work_automations (WORK-MGMT)" },
  { module_id: 117, data_object_id: 704, comment: "WSC-EXTERNAL-COLLAB consumer of iga_access_requests" },
  { module_id: 117, data_object_id: 708, comment: "WSC-EXTERNAL-COLLAB consumer of iga_provisioning_events" },
  { module_id: 115, data_object_id: 705, comment: "WSC-CHANNELS-CONVERSATIONS consumer of iga_access_certifications" },
  { module_id: 115, data_object_id: 47,  comment: "WSC-CHANNELS-CONVERSATIONS consumer of service_incidents" },
  { module_id: 115, data_object_id: 330, comment: "WSC-CHANNELS-CONVERSATIONS consumer of dlp_incidents" },
  { module_id: 115, data_object_id: 256, comment: "WSC-CHANNELS-CONVERSATIONS consumer of support_sessions" },
  { module_id: 115, data_object_id: 233, comment: "WSC-CHANNELS-CONVERSATIONS consumer of msp_tickets" },
];

async function fixB1S9(): Promise<void> {
  console.log("B1-S9: INSERT 10 pairwise consumer+optional DMDO rows");

  // De-dupe in case B1-S4 already inserted (115, 246) above
  const moduleIds = [...new Set(B1_S9_DMDOS.map(r => r.module_id))];
  const dataObjectIds = [...new Set(B1_S9_DMDOS.map(r => r.data_object_id))];
  const existing = await get(
    `/domain_module_data_objects?domain_module_id=in.(${moduleIds.join(",")})` +
      `&data_object_id=in.(${dataObjectIds.join(",")})` +
      `&select=domain_module_id,data_object_id,role,necessity`,
  );
  const existingKeys = new Set(
    existing.map(r => `${r.domain_module_id}|${r.data_object_id}`),
  );

  const inserts: Row[] = [];
  for (const r of B1_S9_DMDOS) {
    const key = `${r.module_id}|${r.data_object_id}`;
    if (existingKeys.has(key)) {
      console.log(`  ${key} already exists; skipping`);
      continue;
    }
    inserts.push({
      domain_module_id: r.module_id,
      data_object_id: r.data_object_id,
      role: "consumer",
      necessity: "optional",
    });
  }
  console.log(`  INSERT ${inserts.length}/${B1_S9_DMDOS.length} rows`);
  if (inserts.length > 0) {
    await post("/domain_module_data_objects", inserts);
  }

  // Verification
  const after = await get(
    `/domain_module_data_objects?domain_module_id=in.(${moduleIds.join(",")})` +
      `&data_object_id=in.(${dataObjectIds.join(",")})` +
      `&select=domain_module_id,data_object_id,role,necessity&order=domain_module_id.asc,data_object_id.asc`,
  );
  console.log(`  after: ${after.length} matching DMDO rows`);
  for (const r of after) {
    console.log(`    module=${r.domain_module_id} data_object=${r.data_object_id} role=${r.role} necessity=${r.necessity}`);
  }
  if (after.length < B1_S9_DMDOS.length) {
    throw new Error(`B1-S9: expected ≥${B1_S9_DMDOS.length} DMDO rows post-load, saw ${after.length}`);
  }
}

// ============================================================
// MAIN
// ============================================================
async function main(): Promise<void> {
  console.log("=== WSC B1 technical fix-loop (2026-05-31) ===\n");
  await fixB1S1();
  console.log("");
  await fixB1S2();
  console.log("");
  await fixB1S4();
  console.log("");
  await fixB1S6();
  console.log("");
  await fixB1S9();
  console.log("\n=== Done ===");
  console.log("UI spot-check links:");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
  console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
  console.log("  https://tests.semantius.app/domain_map/handoffs");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes");
  console.log("  https://tests.semantius.app/domain_map/domain_module_data_objects");
}

await main();
