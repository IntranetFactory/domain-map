#!/usr/bin/env bun
// SPEND-MGMT (domain 133) b1a execution, 2026-06-06.
// Mechanical fixes against the live domain_map module via the semantius CLI.
//
// Items covered:
//   B1A-SYSTEM-SKILLS    : author 3 module-level system skills (303/304/305),
//                          re-point the 8 skill_tools off legacy skill 107,
//                          DELETE skill 107.
//   B1A-CATALOG-UX       : backfill empty catalog_tagline/catalog_description on
//                          domain 133 + modules 303/304/305 (Rule #20 empty-guard).
//   B1A-LIFECYCLE-STATES : load lifecycle states on 4 workflow-bearing masters
//                          (240->305, 744->303, 745->303, 746->304). 747 deferred (B2-S2).
//                          Sets entity_type='operational_workflow' on those 4 (Rule #12 prereq).
//   B1A-OUTBOUND-SOURCE-FK : PATCH source_domain_module_id on 14 outbound handoffs.
//   B1A-INBOUND-TARGET-FK  : PATCH target_domain_module_id on 5 inbound handoffs.
//
// Idempotent: every write reads live state first and only writes what is missing /
// still wrong. record_status omitted everywhere (DB default 'new'). No `notes` writes.

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
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const get = (path: string) => call({ method: "GET", path });

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const result = await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) });
    out.push(...result);
  }
  return out;
}

const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });
const del = (path: string) => call({ method: "DELETE", path });

const log = (...a: unknown[]) => console.log(...a);

// ============================================================
// B1A-CATALOG-UX — buyer-voice copy, write only where empty
// ============================================================
const catalogCopy: Array<{
  table: "domains" | "domain_modules";
  id: number;
  tagline: string;
  description: string;
}> = [
  {
    table: "domains",
    id: 133,
    tagline:
      "Give every team a card, a budget, and clear rules, then see and control company spend in real time.",
    description:
      "Put company money in employees' hands without losing control. Issue corporate cards with built-in limits, route every purchase request through the right approver, and pay vendor bills on time, all under one set of spending rules.\n\nSet policies once and let them enforce themselves: cards decline out-of-policy purchases at the moment of swipe, requests above a threshold wait for sign-off, and high-value authorizations escalate automatically. Finance sees committed and actual spend as it happens instead of weeks later in a reconciliation.\n\nClose the books faster with transactions, approvals, and vendor payments captured as they occur and handed cleanly to expense, accounts payable, and the general ledger.",
  },
  {
    table: "domain_modules",
    id: 303,
    tagline:
      "Issue corporate cards with spending limits and approve or decline every charge against your rules in real time.",
    description:
      "Open and manage corporate card accounts, set per-card and per-category limits, and freeze or close cards the moment you need to. Every swipe is checked against your spending rules and approved or declined in real time, so out-of-policy charges never post.\n\nReview authorizations as they happen, escalate high-value charges for an extra look, and keep multi-currency spend in view. Posted transactions flow on to expense and accounting so reconciliation is a check, not a chase.",
  },
  {
    table: "domain_modules",
    id: 304,
    tagline:
      "Approve vendor bills and route every payment by the right method, then release it on the next run.",
    description:
      "Approve what you owe each vendor, choose how to pay (ACH, wire, virtual card, or check), and route every payment through the right sign-off chain before it goes out. Approved authorizations queue for the next payment run and release automatically when a matching invoice clears.\n\nKeep vendor invoices, payment runs, and supplier records in one view so bill pay stays in step with accounts payable and the general ledger.",
  },
  {
    table: "domain_modules",
    id: 305,
    tagline:
      "Request spend, check it against policy, and get the right approval before any money is committed.",
    description:
      "Stop overspend before it starts. Employees submit a request, the system checks it against your spending policy, and it routes to the right approver based on amount, category, and team. Nothing is committed until it clears.\n\nMaintain one policy library that drives approvals across cards, bill pay, and reimbursement, and watch requested versus committed spend so budget owners always know what is in the pipeline before it lands on the ledger.",
  },
];

async function loadCatalogUx() {
  log("\n=== B1A-CATALOG-UX ===");
  let written = 0;
  let guarded = 0;
  for (const c of catalogCopy) {
    const [live] = await get(
      `/${c.table}?id=eq.${c.id}&select=id,catalog_tagline,catalog_description`,
    );
    if (!live) {
      log(`  ! ${c.table} ${c.id} not found, skipping`);
      continue;
    }
    const body: Row = {};
    if (String(live.catalog_tagline ?? "") === "") body.catalog_tagline = c.tagline;
    else guarded++;
    if (String(live.catalog_description ?? "") === "") body.catalog_description = c.description;
    else guarded++;
    if (Object.keys(body).length === 0) {
      log(`  ${c.table} ${c.id}: both fields non-empty, empty-guard skipped`);
      continue;
    }
    await patch(`/${c.table}?id=eq.${c.id}`, body);
    written += Object.keys(body).length;
    log(`  ${c.table} ${c.id}: wrote ${Object.keys(body).join(", ")}`);
  }
  log(`  catalog UX fields written: ${written}; non-empty fields guarded: ${guarded}`);
}

// ============================================================
// B1A-SYSTEM-SKILLS — 3 system skills + re-point 8 skill_tools + DELETE 107
// ============================================================
const skillSpecs = [
  {
    code: "SPEND-MGMT-CARDS",
    module_id: 303,
    skill_name: "spend_mgmt_cards_agent",
    description:
      "System skill for the Corporate Cards and Authorization Controls module: runtime workflows over corporate card accounts and card authorizations, including authorization decisioning and reconciliation.",
  },
  {
    code: "SPEND-MGMT-BILL-PAY",
    module_id: 304,
    skill_name: "spend_mgmt_bill_pay_agent",
    description:
      "System skill for the Vendor Bill Pay module: runtime workflows over vendor payment authorizations, routing, and release.",
  },
  {
    code: "SPEND-MGMT-POLICY-APPROVAL",
    module_id: 305,
    skill_name: "spend_mgmt_policy_approval_agent",
    description:
      "System skill for the Pre-Spend Approval and Policy module: runtime workflows over spend requests and spend policies, including policy evaluation and approval routing.",
  },
];

// tool_id -> target module_id (which per-module skill should own the link).
// query_corporate_card_accounts(842,->744) and query_card_authorizations(843,->745) -> 303.
// query_vendor_payment_authorizations(844,->746) -> 304.
// query_spend_requests(699,->240) and query_spend_policies(845,->747) -> 305.
// EXPENSE card tools query_corporate_cards(459,->212) + query_card_transactions(460,->213)
//   and send_email(37) attach to CARDS (303): card reconciliation reads those tables and
//   card-authorization decline/high-value events drive the email notifications.
const toolToModule: Record<number, number> = {
  842: 303,
  843: 303,
  459: 303,
  460: 303,
  37: 303,
  844: 304,
  699: 305,
  845: 305,
};

async function loadSystemSkills() {
  log("\n=== B1A-SYSTEM-SKILLS ===");

  // 1. Author the 3 system skills, idempotent on (skill_type=system, domain_module_id).
  const moduleSkillId = new Map<number, number>();
  for (const s of skillSpecs) {
    const existing = await get(
      `/skills?skill_type=eq.system&domain_module_id=eq.${s.module_id}&select=id,skill_name`,
    );
    if (existing.length > 0) {
      moduleSkillId.set(s.module_id, Number(existing[0].id));
      log(`  skill for module ${s.module_id} exists: id ${existing[0].id} (${existing[0].skill_name})`);
      continue;
    }
    const [created] = await insert("/skills", [
      {
        skill_name: s.skill_name,
        skill_type: "system",
        domain_id: 133,
        domain_module_id: s.module_id,
        description: s.description,
      },
    ]);
    moduleSkillId.set(s.module_id, Number(created.id));
    log(`  created skill ${created.id} '${s.skill_name}' for module ${s.module_id}`);
  }

  // 2. Re-point the existing skill_tools rows from skill 107 to the per-module skill.
  const stRows = await get(
    "/skill_tools?skill_id=eq.107&select=id,tool_id,requirement_level",
  );
  log(`  legacy skill 107 carries ${stRows.length} skill_tools rows`);
  for (const st of stRows) {
    const toolId = Number(st.tool_id);
    const targetModule = toolToModule[toolId];
    if (targetModule === undefined) {
      throw new Error(`No module mapping for tool_id ${toolId} (skill_tools ${st.id}) - refusing to orphan it`);
    }
    const targetSkill = moduleSkillId.get(targetModule);
    if (targetSkill === undefined) throw new Error(`No skill for module ${targetModule}`);
    // Dedup: does the target skill already link this tool? (idempotent re-run)
    const dup = await get(
      `/skill_tools?skill_id=eq.${targetSkill}&tool_id=eq.${toolId}&select=id`,
    );
    if (dup.length > 0) {
      // Already migrated on a prior run; drop the legacy row if it still exists.
      await del(`/skill_tools?id=eq.${st.id}`);
      log(`  skill_tools ${st.id} (tool ${toolId}) already on skill ${targetSkill}; removed legacy row`);
      continue;
    }
    await patch(`/skill_tools?id=eq.${st.id}`, { skill_id: targetSkill });
    log(`  skill_tools ${st.id} (tool ${toolId}) -> skill ${targetSkill} (module ${targetModule})`);
  }

  // 3. DELETE the now-empty legacy skill 107.
  const remaining = await get("/skill_tools?skill_id=eq.107&select=id");
  if (remaining.length > 0) {
    throw new Error(`skill 107 still has ${remaining.length} skill_tools rows; not deleting`);
  }
  const stillThere = await get("/skills?id=eq.107&select=id");
  if (stillThere.length > 0) {
    await del("/skills?id=eq.107");
    log("  DELETED legacy skill 107");
  } else {
    log("  legacy skill 107 already deleted");
  }
}

// ============================================================
// B1A-LIFECYCLE-STATES — 4 workflow-bearing masters
// ============================================================
type LcState = {
  state_name: string;
  state_order: number;
  is_initial?: boolean;
  is_terminal?: boolean;
  requires_permission?: boolean;
  permission_verb_override?: string;
};
const lifecycle: Array<{
  data_object_id: number;
  name: string;
  module_id: number;
  states: LcState[];
}> = [
  {
    data_object_id: 240,
    name: "spend_requests",
    module_id: 305,
    // draft -> submitted -> approved/rejected -> spent/cancelled
    states: [
      { state_name: "draft", state_order: 10, is_initial: true },
      { state_name: "submitted", state_order: 20, requires_permission: true, permission_verb_override: "submit_spend_request" },
      { state_name: "approved", state_order: 30, requires_permission: true, permission_verb_override: "approve_spend_request" },
      { state_name: "rejected", state_order: 40, is_terminal: true, requires_permission: true, permission_verb_override: "reject_spend_request" },
      { state_name: "spent", state_order: 50, is_terminal: true },
      { state_name: "cancelled", state_order: 60, is_terminal: true, requires_permission: true, permission_verb_override: "cancel_spend_request" },
    ],
  },
  {
    data_object_id: 744,
    name: "corporate_card_accounts",
    module_id: 303,
    // application -> active -> frozen/closed
    states: [
      { state_name: "application", state_order: 10, is_initial: true },
      { state_name: "active", state_order: 20, requires_permission: true, permission_verb_override: "activate_corporate_card_account" },
      { state_name: "frozen", state_order: 30, requires_permission: true, permission_verb_override: "freeze_corporate_card_account" },
      { state_name: "closed", state_order: 40, is_terminal: true, requires_permission: true, permission_verb_override: "close_corporate_card_account" },
    ],
  },
  {
    data_object_id: 745,
    name: "card_authorizations",
    module_id: 303,
    // requested -> approved/declined -> posted -> reconciled/disputed
    states: [
      { state_name: "requested", state_order: 10, is_initial: true },
      { state_name: "approved", state_order: 20, requires_permission: true, permission_verb_override: "approve_card_authorization" },
      { state_name: "declined", state_order: 30, is_terminal: true, requires_permission: true, permission_verb_override: "decline_card_authorization" },
      { state_name: "posted", state_order: 40 },
      { state_name: "reconciled", state_order: 50, is_terminal: true, requires_permission: true, permission_verb_override: "reconcile_card_authorization" },
      { state_name: "disputed", state_order: 60, is_terminal: true, requires_permission: true, permission_verb_override: "dispute_card_authorization" },
    ],
  },
  {
    data_object_id: 746,
    name: "vendor_payment_authorizations",
    module_id: 304,
    // requested -> approved/rejected -> released/held
    states: [
      { state_name: "requested", state_order: 10, is_initial: true },
      { state_name: "approved", state_order: 20, requires_permission: true, permission_verb_override: "approve_vendor_payment_authorization" },
      { state_name: "rejected", state_order: 30, is_terminal: true, requires_permission: true, permission_verb_override: "reject_vendor_payment_authorization" },
      { state_name: "released", state_order: 40, is_terminal: true, requires_permission: true, permission_verb_override: "release_vendor_payment_authorization" },
      { state_name: "held", state_order: 50, requires_permission: true, permission_verb_override: "hold_vendor_payment_authorization" },
    ],
  },
];

async function loadLifecycleStates() {
  log("\n=== B1A-LIFECYCLE-STATES ===");
  // Rule #12 prereq: lifecycle states require entity_type='operational_workflow'.
  // The 4 masters are unclassified; their workflows are explicit in the b1a action.
  for (const m of lifecycle) {
    const [obj] = await get(`/data_objects?id=eq.${m.data_object_id}&select=id,entity_type`);
    if (obj && obj.entity_type !== "operational_workflow") {
      await patch(`/data_objects?id=eq.${m.data_object_id}`, { entity_type: "operational_workflow" });
      log(`  data_objects ${m.data_object_id} (${m.name}): entity_type '${obj.entity_type}' -> 'operational_workflow'`);
    } else if (obj) {
      log(`  data_objects ${m.data_object_id} (${m.name}): entity_type already 'operational_workflow'`);
    }
  }

  let inserted = 0;
  for (const m of lifecycle) {
    const existing = await get(
      `/data_object_lifecycle_states?data_object_id=eq.${m.data_object_id}&select=id,state_name`,
    );
    const existingNames = new Set(existing.map(r => String(r.state_name)));
    const toInsert = m.states
      .filter(s => !existingNames.has(s.state_name))
      .map(s => ({
        data_object_id: m.data_object_id,
        state_name: s.state_name,
        state_order: s.state_order,
        is_initial: s.is_initial ?? false,
        is_terminal: s.is_terminal ?? false,
        requires_permission: s.requires_permission ?? false,
        permission_verb_override: s.permission_verb_override ?? "",
        domain_module_id: m.module_id,
      }));
    if (toInsert.length === 0) {
      log(`  ${m.name} (${m.data_object_id}): all ${m.states.length} states present`);
      continue;
    }
    await insert("/data_object_lifecycle_states", toInsert);
    inserted += toInsert.length;
    log(`  ${m.name} (${m.data_object_id}) -> module ${m.module_id}: inserted ${toInsert.length} states`);
  }
  log(`  lifecycle states inserted: ${inserted}`);
}

// ============================================================
// B1A-OUTBOUND-SOURCE-FK + B1A-INBOUND-TARGET-FK
// ============================================================
const outboundSourceFk: Record<number, number> = {
  165: 303, 166: 303, 173: 303, 174: 303, 557: 303, 558: 303, 600: 303,
  167: 304, 168: 304, 556: 304,
  169: 305, 172: 305, 559: 305, 560: 305,
};
const inboundTargetFk: Record<number, number> = {
  170: 305, 171: 305, 552: 305, 555: 305,
  598: 304,
};

async function patchHandoffFk(
  map: Record<number, number>,
  column: "source_domain_module_id" | "target_domain_module_id",
  label: string,
) {
  log(`\n=== ${label} ===`);
  let patched = 0;
  let already = 0;
  for (const [idStr, moduleId] of Object.entries(map)) {
    const id = Number(idStr);
    const [live] = await get(`/handoffs?id=eq.${id}&select=id,${column}`);
    if (!live) {
      log(`  ! handoff ${id} not found, skipping`);
      continue;
    }
    if (Number(live[column]) === moduleId) {
      already++;
      log(`  handoff ${id}: ${column} already ${moduleId}`);
      continue;
    }
    await patch(`/handoffs?id=eq.${id}`, { [column]: moduleId });
    patched++;
    log(`  handoff ${id}: ${column} ${live[column] ?? "null"} -> ${moduleId}`);
  }
  log(`  patched: ${patched}; already correct: ${already}`);
}

// ============================================================
// MAIN
// ============================================================
await loadCatalogUx();
await loadSystemSkills();
await loadLifecycleStates();
await patchHandoffFk(outboundSourceFk, "source_domain_module_id", "B1A-OUTBOUND-SOURCE-FK");
await patchHandoffFk(inboundTargetFk, "target_domain_module_id", "B1A-INBOUND-TARGET-FK");

log("\nDONE.");
