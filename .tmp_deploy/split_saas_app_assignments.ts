#!/usr/bin/env bun
// Implements Option γ (split) for the saas_app_assignments M7 conflict.
//
// Resolves the catalog-wide single-master violation on data_object_id=63 by
// splitting the intentional multi-master entity into two semantically distinct
// entities with non-overlapping lifecycles, mirroring how SMP and IGA flagship
// vendors actually model the data:
//
//   • smp_license_seat_assignments  — SMP-mastered, seat/cost/utilization axis
//                                     lifecycle: provisioned → active → idle → reclaimed
//                                     (renames existing data_object id=63)
//
//   • iga_user_entitlements         — IGA-mastered, identity/access/governance axis
//                                     lifecycle: requested → approved → granted →
//                                                certified → revoked
//                                     (new data_object)
//
// They are linked by a `correlates_with` relationship row (no cardinality
// guarantee — the two records correlate but routinely diverge in real orgs).
//
// Run:    bun run .tmp_deploy/split_saas_app_assignments.ts --dry-run
// Apply:  bun run .tmp_deploy/split_saas_app_assignments.ts --apply

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

const APPLY = process.argv.includes("--apply");
const DRY_RUN = !APPLY;

const SMP_DOMAIN_ID = 85;
const IGA_DOMAIN_ID = 35;
const SMP_DISCOVERY_OPT_MODULE_ID = 30;
const IGA_AUTO_PROVISIONING_MODULE_ID = 148;
const USERS_DATA_OBJECT_ID = 748;
const SAAS_APPLICATIONS_DATA_OBJECT_ID = 61;
const EXISTING_DATA_OBJECT_ID = 63; // saas_app_assignments

// Skills that currently link tool 522 (query_saas_app_assignments)
const SKILL_SMP_DISCOVERY_OPT = 135;
const SKILL_IGA_AUTO_PROVISIONING = 225;
const SKILL_IGA_ACCESS_CERTIFICATION = 222;
const SKILL_EMPLOYEE_JML_PROCESS = 124;
const SKILL_CASE_SERVICE_PROCESS = 126;

// Existing IDs to mutate or retire
const DMDO_IGA_MASTER_ID = 747; // IGA's master claim on data_object 63 — DELETE
const HANDOFF_43_ID = 43;       // duplicate of handoff 640, uses buggy TE 8 — DELETE
const TRIGGER_EVENT_8_ID = 8;   // mis-pointed duplicate of TE 622 — DELETE
const TOOL_QUERY_ID = 522;      // rename query_saas_app_assignments → query_smp_license_seat_assignments
const TOOL_RECLAIM_ID = 874;    // rename reclaim_assignment → reclaim_seat_assignment
const TE_PROVISIONED_ID = 1196;
const TE_RECLAIMED_ID = 1197;
const TE_DEPROVISIONED_ID = 1198;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud/postgrestRequest"], {
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
  if (DRY_RUN) {
    console.log(`  [DRY] PATCH ${path}  body=${JSON.stringify(body)}`);
    return [];
  }
  return call({ method: "PATCH", path, body });
}

async function del(path: string): Promise<Row[]> {
  if (DRY_RUN) {
    console.log(`  [DRY] DELETE ${path}`);
    return [];
  }
  return call({ method: "DELETE", path });
}

async function insertRows(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  if (DRY_RUN) {
    console.log(`  [DRY] POST ${path}  ${rows.length} rows`);
    for (const r of rows) console.log(`        ${JSON.stringify(r)}`);
    return [];
  }
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

// ============================================================
// PHASE A — Rename existing entity (data_object id=63)
//           saas_app_assignments → smp_license_seat_assignments
// ============================================================

async function phaseA(): Promise<void> {
  console.log("\n=== Phase A: rename saas_app_assignments → smp_license_seat_assignments ===");

  // A1. Pre-flight: verify the entity is still present in the state we expect.
  const existing = await get(`/data_objects?id=eq.${EXISTING_DATA_OBJECT_ID}&select=id,data_object_name`);
  if (existing.length === 0) {
    throw new Error(`data_object id=${EXISTING_DATA_OBJECT_ID} not found — aborting`);
  }
  const currentName = existing[0]!.data_object_name as string;
  if (currentName === "smp_license_seat_assignments") {
    console.log("  A.skip: rename already applied (idempotent)");
  } else if (currentName !== "saas_app_assignments") {
    throw new Error(`data_object id=${EXISTING_DATA_OBJECT_ID} unexpected name "${currentName}" — aborting`);
  }

  // A2. Rename the data_object and rewrite description to SMP-axis only.
  //     NOTE: per Rule #15, do NOT touch the `notes` column here.
  if (currentName !== "smp_license_seat_assignments") {
    await patch(`/data_objects?id=eq.${EXISTING_DATA_OBJECT_ID}`, {
      data_object_name: "smp_license_seat_assignments",
      singular_label: "SMP License Seat Assignment",
      plural_label: "SMP License Seat Assignments",
      description:
        "SMP's view of a user-to-app license seat: who holds a seat at which tier, cost-per-seat, utilization signal, last active. Drives reclamation and rightsizing. Correlates with an iga_user_entitlement record (the governance view of the same access fact); the two routinely diverge.",
    });
  }

  // A3. Delete the IGA-side master claim — it moves to a new entity in Phase B.
  const dmdoIga = await get(`/domain_module_data_objects?id=eq.${DMDO_IGA_MASTER_ID}&select=id`);
  if (dmdoIga.length > 0) {
    await del(`/domain_module_data_objects?id=eq.${DMDO_IGA_MASTER_ID}`);
  } else {
    console.log("  A.skip: IGA master DMDO already gone");
  }

  // A4. Delete handoff 43 (duplicate of 640, and uses buggy TE 8 — B1-S5 cleanup).
  const h43 = await get(`/handoffs?id=eq.${HANDOFF_43_ID}&select=id`);
  if (h43.length > 0) {
    await del(`/handoffs?id=eq.${HANDOFF_43_ID}`);
  } else {
    console.log("  A.skip: handoff 43 already gone");
  }

  // A5. Delete trigger_event 8 (duplicate of 622, only used by handoff 43 we just removed).
  //     Defensive: re-check there are no remaining handoffs referencing TE 8.
  const remainingTe8Handoffs = await get(`/handoffs?trigger_event_id=eq.${TRIGGER_EVENT_8_ID}&select=id`);
  if (remainingTe8Handoffs.length === 0) {
    const te8 = await get(`/trigger_events?id=eq.${TRIGGER_EVENT_8_ID}&select=id`);
    if (te8.length > 0) {
      await del(`/trigger_events?id=eq.${TRIGGER_EVENT_8_ID}`);
    } else {
      console.log("  A.skip: trigger_event 8 already gone");
    }
  } else {
    console.log(`  A.warn: trigger_event 8 still has ${remainingTe8Handoffs.length} handoffs — not deleting`);
  }

  // A6. Rename the three SMP-lifecycle trigger_events to the new prefix.
  const renames: Array<[number, string, string]> = [
    [TE_PROVISIONED_ID, "saas_app_assignment.provisioned", "smp_license_seat_assignment.provisioned"],
    [TE_RECLAIMED_ID, "saas_app_assignment.reclaimed", "smp_license_seat_assignment.reclaimed"],
    [TE_DEPROVISIONED_ID, "saas_app_assignment.deprovisioned", "smp_license_seat_assignment.deprovisioned"],
  ];
  for (const [id, oldName, newName] of renames) {
    const row = await get(`/trigger_events?id=eq.${id}&select=id,event_name`);
    if (row.length === 0) {
      console.log(`  A.warn: trigger_event id=${id} not found`);
      continue;
    }
    if (row[0]!.event_name === newName) {
      console.log(`  A.skip: trigger_event id=${id} already renamed`);
      continue;
    }
    if (row[0]!.event_name !== oldName) {
      console.log(`  A.warn: trigger_event id=${id} unexpected name "${row[0]!.event_name}" — skipping`);
      continue;
    }
    await patch(`/trigger_events?id=eq.${id}`, { event_name: newName });
  }

  // A7. Rename tools 522 + 874 to the SMP-prefixed forms.
  const toolRenames: Array<[number, string, string, string]> = [
    [TOOL_QUERY_ID, "query_saas_app_assignments", "query_smp_license_seat_assignments",
      "Query / list / get smp license seat assignment records."],
    [TOOL_RECLAIM_ID, "reclaim_assignment", "reclaim_seat_assignment",
      "Return an idle seat to the pool. Notifies the user; the IGA-side entitlement revocation fires from iga_user_entitlements via its own lifecycle."],
  ];
  for (const [id, oldName, newName, newDesc] of toolRenames) {
    const row = await get(`/tools?id=eq.${id}&select=id,tool_name`);
    if (row.length === 0) {
      console.log(`  A.warn: tool id=${id} not found`);
      continue;
    }
    if (row[0]!.tool_name === newName) {
      console.log(`  A.skip: tool id=${id} already renamed`);
      continue;
    }
    if (row[0]!.tool_name !== oldName) {
      console.log(`  A.warn: tool id=${id} unexpected name "${row[0]!.tool_name}" — skipping`);
      continue;
    }
    await patch(`/tools?id=eq.${id}`, { tool_name: newName, description: newDesc });
  }
}

// ============================================================
// PHASE B — Create new entity iga_user_entitlements
// ============================================================

async function phaseB(): Promise<number> {
  console.log("\n=== Phase B: create iga_user_entitlements ===");

  // B1. Create the data_object (idempotent on natural key).
  let igaEntId: number;
  const existingIga = await get(`/data_objects?data_object_name=eq.iga_user_entitlements&select=id`);
  if (existingIga.length > 0) {
    igaEntId = Number(existingIga[0]!.id);
    console.log(`  B.skip: iga_user_entitlements already exists (id=${igaEntId})`);
  } else {
    const insertResult = await insertRows("/data_objects", [{
      data_object_name: "iga_user_entitlements",
      singular_label: "User Entitlement",
      plural_label: "User Entitlements",
      kind: "domain_owned",
      description:
        "IGA's governance view of a user's access to an application: the entitlement grant, who requested it, who approved it, when it was last certified, and when it was revoked. Driven by birthright policy plus access-request workflow. Correlates with an smp_license_seat_assignment (the seat/cost view of the same access fact); the two routinely diverge.",
      has_personal_content: true,
      has_submit_lock: false,
      has_single_approver: false,
      is_canonical_bare_word: false,
    }]);
    if (DRY_RUN) {
      console.log("  B.dry: returning sentinel id=-1 for new iga_user_entitlements");
      igaEntId = -1;
    } else {
      const fresh = await get(`/data_objects?data_object_name=eq.iga_user_entitlements&select=id`);
      igaEntId = Number(fresh[0]!.id);
      console.log(`  B.new: iga_user_entitlements id=${igaEntId}`);
    }
  }

  // Guard: subsequent INSERTs need a real id. In dry-run, just print placeholders.
  const idForRef = igaEntId === -1 ? "<NEW_IGA_ENT_ID>" : String(igaEntId);

  // B2. Master DMDO row on IGA-AUTO-PROVISIONING.
  if (igaEntId !== -1) {
    const existingDmdo = await get(`/domain_module_data_objects?data_object_id=eq.${igaEntId}&domain_module_id=eq.${IGA_AUTO_PROVISIONING_MODULE_ID}&role=eq.master&select=id`);
    if (existingDmdo.length === 0) {
      await insertRows("/domain_module_data_objects", [{
        data_object_id: igaEntId,
        domain_module_id: IGA_AUTO_PROVISIONING_MODULE_ID,
        role: "master",
        necessity: "required",
      }]);
    } else {
      console.log("  B.skip: IGA-AUTO-PROVISIONING master DMDO already present");
    }
  } else {
    await insertRows("/domain_module_data_objects", [{
      data_object_id: idForRef,
      domain_module_id: IGA_AUTO_PROVISIONING_MODULE_ID,
      role: "master",
      necessity: "required",
    }]);
  }

  // B3. Lifecycle states (idempotent on (data_object_id, state_name)).
  const states: Row[] = [
    { state_name: "requested",  state_order: 10, is_initial: true,  is_terminal: false, requires_permission: true, permission_verb_override: "request_entitlement", domain_module_id: IGA_AUTO_PROVISIONING_MODULE_ID },
    { state_name: "approved",   state_order: 20, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "approve_entitlement", domain_module_id: IGA_AUTO_PROVISIONING_MODULE_ID },
    { state_name: "granted",    state_order: 30, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "grant_entitlement",   domain_module_id: IGA_AUTO_PROVISIONING_MODULE_ID },
    { state_name: "certified",  state_order: 40, is_initial: false, is_terminal: false, requires_permission: false, permission_verb_override: "",                   domain_module_id: IGA_AUTO_PROVISIONING_MODULE_ID },
    { state_name: "revoked",    state_order: 50, is_initial: false, is_terminal: true,  requires_permission: true, permission_verb_override: "revoke_entitlement", domain_module_id: IGA_AUTO_PROVISIONING_MODULE_ID },
  ];
  const stateRowsToInsert: Row[] = [];
  for (const s of states) {
    if (igaEntId === -1) {
      stateRowsToInsert.push({ ...s, data_object_id: idForRef });
      continue;
    }
    const existing = await get(`/data_object_lifecycle_states?data_object_id=eq.${igaEntId}&state_name=eq.${s.state_name as string}&select=id`);
    if (existing.length === 0) {
      stateRowsToInsert.push({ ...s, data_object_id: igaEntId });
    }
  }
  if (stateRowsToInsert.length > 0) {
    await insertRows("/data_object_lifecycle_states", stateRowsToInsert);
  } else {
    console.log("  B.skip: all 5 lifecycle states already present");
  }

  // B4. Trigger events.
  const events: Row[] = [
    { event_name: "iga_user_entitlement.requested",  event_category: "lifecycle",    description: "A user entitlement has been requested via the IGA access-request workflow. Routes to approver." },
    { event_name: "iga_user_entitlement.approved",   event_category: "state_change", description: "Approver granted the entitlement request. Routes to auto-provisioning." },
    { event_name: "iga_user_entitlement.granted",    event_category: "lifecycle",    description: "The entitlement has been provisioned (SCIM/API write to the target application succeeded). User now has access. SMP sees the corresponding seat appear on next sync." },
    { event_name: "iga_user_entitlement.certified",  event_category: "lifecycle",    description: "Periodic access certification confirmed the entitlement is still appropriate. Resets the next-certification timer." },
    { event_name: "iga_user_entitlement.revoked",    event_category: "lifecycle",    description: "Entitlement removed (leaver, manual revoke, or certification rejection). SMP-side seat is freed for reclamation on next sync." },
  ];
  const eventRowsToInsert: Row[] = [];
  for (const e of events) {
    if (igaEntId === -1) {
      eventRowsToInsert.push({ ...e, data_object_id: idForRef, domain_module_id: IGA_AUTO_PROVISIONING_MODULE_ID });
      continue;
    }
    const existing = await get(`/trigger_events?event_name=eq.${e.event_name as string}&select=id`);
    if (existing.length === 0) {
      eventRowsToInsert.push({ ...e, data_object_id: igaEntId, domain_module_id: IGA_AUTO_PROVISIONING_MODULE_ID });
    }
  }
  if (eventRowsToInsert.length > 0) {
    await insertRows("/trigger_events", eventRowsToInsert);
  } else {
    console.log("  B.skip: all 5 trigger events already present");
  }

  // B5. Aliases.
  const aliases: Row[] = [
    { alias_name: "Entitlement",   alias_type: "synonym" },
    { alias_name: "Account",       alias_type: "synonym" },
    { alias_name: "Access Grant",  alias_type: "synonym" },
  ];
  const aliasRowsToInsert: Row[] = [];
  for (const a of aliases) {
    if (igaEntId === -1) {
      aliasRowsToInsert.push({ ...a, data_object_id: idForRef });
      continue;
    }
    const existing = await get(`/data_object_aliases?data_object_id=eq.${igaEntId}&alias_name=eq.${encodeURIComponent(a.alias_name as string)}&select=id`);
    if (existing.length === 0) {
      aliasRowsToInsert.push({ ...a, data_object_id: igaEntId });
    }
  }
  if (aliasRowsToInsert.length > 0) {
    await insertRows("/data_object_aliases", aliasRowsToInsert);
  } else {
    console.log("  B.skip: all 3 aliases already present");
  }

  // B6. Relationships.
  //  - users → iga_user_entitlements ("holds")
  //  - saas_applications → iga_user_entitlements ("entitles_to")
  //  - smp_license_seat_assignments (the renamed 63) → iga_user_entitlements ("correlates_with")
  const relationships: Row[] = [
    {
      data_object_id: USERS_DATA_OBJECT_ID,
      related_data_object_id: igaEntId === -1 ? idForRef : igaEntId,
      relationship_verb: "holds",
      inverse_verb: "held_by",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      is_required: true,
      owner_side: "target",
    },
    {
      data_object_id: SAAS_APPLICATIONS_DATA_OBJECT_ID,
      related_data_object_id: igaEntId === -1 ? idForRef : igaEntId,
      relationship_verb: "entitles_to",
      inverse_verb: "grants_access_to",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      is_required: true,
      owner_side: "source",
    },
    {
      data_object_id: EXISTING_DATA_OBJECT_ID, // now smp_license_seat_assignments
      related_data_object_id: igaEntId === -1 ? idForRef : igaEntId,
      relationship_verb: "correlates_with",
      inverse_verb: "correlates_with",
      relationship_type: "one_to_one",
      relationship_kind: "reference",
      is_required: false,
      owner_side: "source",
    },
  ];
  const relRowsToInsert: Row[] = [];
  for (const r of relationships) {
    if (igaEntId === -1) {
      relRowsToInsert.push(r);
      continue;
    }
    const existing = await get(`/data_object_relationships?data_object_id=eq.${r.data_object_id}&related_data_object_id=eq.${igaEntId}&relationship_verb=eq.${encodeURIComponent(r.relationship_verb as string)}&select=id`);
    if (existing.length === 0) {
      relRowsToInsert.push(r);
    }
  }
  if (relRowsToInsert.length > 0) {
    await insertRows("/data_object_relationships", relRowsToInsert);
  } else {
    console.log("  B.skip: all 3 relationships already present");
  }

  // B7. Tools — 6 new IGA-axis primitives.
  const tools: Array<{ tool_name: string; operation_kind: string; description: string }> = [
    { tool_name: "query_iga_user_entitlements",    operation_kind: "query",  description: "Query / list / get IGA user-entitlement records." },
    { tool_name: "request_entitlement",            operation_kind: "mutate", description: "Submit an entitlement request for a user against an application. Routes through approval workflow." },
    { tool_name: "approve_entitlement",            operation_kind: "mutate", description: "Approve a pending entitlement request. Transitions state to approved; downstream provisioning fires on the granted transition." },
    { tool_name: "grant_entitlement",              operation_kind: "mutate", description: "Provision the approved entitlement: writes to the target application via SCIM/API. Transitions state to granted." },
    { tool_name: "certify_entitlement",            operation_kind: "mutate", description: "Confirm via access certification that the entitlement is still appropriate. Resets the certification timer." },
    { tool_name: "revoke_entitlement",             operation_kind: "mutate", description: "Revoke a granted entitlement: removes access in the target application via SCIM/API. Transitions state to revoked. Frees the SMP-side seat for reclamation." },
  ];
  const toolRowsToInsert: Row[] = [];
  const newToolIdsByName = new Map<string, number>();
  for (const t of tools) {
    const existing = await get(`/tools?tool_name=eq.${t.tool_name}&select=id`);
    if (existing.length === 0) {
      const data_object_id_for_tool = t.operation_kind === "query" || t.operation_kind === "mutate"
        ? (igaEntId === -1 ? idForRef : igaEntId)
        : null;
      toolRowsToInsert.push({
        tool_name: t.tool_name,
        operation_kind: t.operation_kind,
        coverage_tier: "platform",
        data_object_id: data_object_id_for_tool,
        description: t.description,
      });
    } else {
      newToolIdsByName.set(t.tool_name, Number(existing[0]!.id));
    }
  }
  if (toolRowsToInsert.length > 0) {
    await insertRows("/tools", toolRowsToInsert);
    if (!DRY_RUN) {
      const allNew = await get(`/tools?tool_name=in.(${tools.map(t => t.tool_name).join(",")})&select=id,tool_name`);
      for (const r of allNew) newToolIdsByName.set(r.tool_name as string, Number(r.id));
    }
  } else {
    console.log("  B.skip: all 6 IGA-axis tools already present");
  }

  // B8. skill_tools re-wiring (only meaningful when not dry-run; in dry-run we describe).
  if (DRY_RUN) {
    console.log("  B.dry: would re-wire skill_tools per Phase C plan below");
    return igaEntId;
  }

  // Phase C executed eagerly here so it runs in the same pass.
  console.log("\n=== Phase C: re-wire skill_tools ===");
  await rewireSkill({
    skillId: SKILL_IGA_AUTO_PROVISIONING,
    skillName: "iga_auto_provisioning_agent",
    dropTools: [TOOL_QUERY_ID],
    addTools: [
      { name: "query_iga_user_entitlements", requirement_level: "required" },
      { name: "request_entitlement",         requirement_level: "required" },
      { name: "approve_entitlement",         requirement_level: "required" },
      { name: "grant_entitlement",           requirement_level: "required" },
      { name: "revoke_entitlement",          requirement_level: "required" },
    ],
    toolIds: newToolIdsByName,
  });
  await rewireSkill({
    skillId: SKILL_IGA_ACCESS_CERTIFICATION,
    skillName: "iga_access_certification_agent",
    dropTools: [TOOL_QUERY_ID],
    addTools: [
      { name: "query_iga_user_entitlements", requirement_level: "required" },
      { name: "certify_entitlement",         requirement_level: "required" },
    ],
    toolIds: newToolIdsByName,
  });
  await rewireSkill({
    skillId: SKILL_EMPLOYEE_JML_PROCESS,
    skillName: "employee-jml-process",
    dropTools: [],
    addTools: [
      { name: "query_iga_user_entitlements", requirement_level: "required" },
    ],
    toolIds: newToolIdsByName,
  });
  await rewireSkill({
    skillId: SKILL_CASE_SERVICE_PROCESS,
    skillName: "case-service-process",
    dropTools: [],
    addTools: [
      { name: "query_iga_user_entitlements", requirement_level: "optional" },
    ],
    toolIds: newToolIdsByName,
  });

  return igaEntId;
}

async function rewireSkill(opts: {
  skillId: number;
  skillName: string;
  dropTools: number[];
  addTools: Array<{ name: string; requirement_level: "required" | "optional" }>;
  toolIds: Map<string, number>;
}): Promise<void> {
  console.log(`  rewire ${opts.skillName} (id=${opts.skillId})`);
  for (const dropToolId of opts.dropTools) {
    const existing = await get(`/skill_tools?skill_id=eq.${opts.skillId}&tool_id=eq.${dropToolId}&select=id`);
    if (existing.length > 0) {
      await del(`/skill_tools?skill_id=eq.${opts.skillId}&tool_id=eq.${dropToolId}`);
    }
  }
  const toInsert: Row[] = [];
  for (const add of opts.addTools) {
    const tid = opts.toolIds.get(add.name);
    if (!tid) {
      console.log(`    warn: tool "${add.name}" not in id map; skipping`);
      continue;
    }
    const existing = await get(`/skill_tools?skill_id=eq.${opts.skillId}&tool_id=eq.${tid}&select=id`);
    if (existing.length === 0) {
      toInsert.push({ skill_id: opts.skillId, tool_id: tid, requirement_level: add.requirement_level });
    }
  }
  if (toInsert.length > 0) {
    await insertRows("/skill_tools", toInsert);
  }
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  console.log(DRY_RUN
    ? "MODE: dry-run (no writes). Re-run with --apply to execute."
    : "MODE: apply (writes will execute).");

  await phaseA();
  const igaEntId = await phaseB();

  console.log("\n=== Summary ===");
  console.log(`  Phase A: renamed data_object id=${EXISTING_DATA_OBJECT_ID}, deleted IGA master DMDO + handoff 43 + trigger_event 8, renamed 3 trigger_events + 2 tools.`);
  console.log(`  Phase B: created iga_user_entitlements (id=${igaEntId === -1 ? "<new>" : igaEntId}), 1 master DMDO, 5 lifecycle states, 5 trigger_events, 3 aliases, 3 relationships, 6 tools.`);
  console.log("  Phase C: re-wired skill_tools on 4 skills (IGA-AUTO-PROVISIONING, IGA-ACCESS-CERTIFICATION, employee-jml-process, case-service-process).");
  console.log("\nUI: https://tests.semantius.app/domain_map/data_objects");
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
