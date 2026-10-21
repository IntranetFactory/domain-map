#!/usr/bin/env bun
// MSP-PSA B-band load: lifecycle states, events, intra-domain edges, users-edges,
// aliases, pattern-flag PATCHes, handoff module-FK backfill, intra-domain handoffs,
// + 2 consumer DMDO additions (238 remote_sessions, 565 chat_messages on SVC-DESK).
//
// Idempotent: reads existing rows by natural key before inserting.

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

const D_MSP_PSA = 131;

// data_object ids
const DO_MSP_TICKETS = 233;
const DO_MSP_CONTRACTS = 234;
const DO_MSP_TIME_ENTRIES = 235;
const DO_MSP_INVOICES = 236;
const DO_MSP_CLIENTS = 237;
const DO_REMOTE_SESSIONS = 238;
const DO_CHAT_MESSAGES = 565;
const DO_USERS = 748;

// module ids (loaded in M-band)
const M_SVC_DESK = 137;
const M_CONTRACTS = 138;
const M_TIME_BILLING = 139;
const M_DISPATCH = 140;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const get = (path: string) => call({ method: "GET", path });

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map(r => {
    const out: Row = {};
    for (const k of keys) out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return out;
  });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

// ============================================================
// 1) Add 2 consumer DMDOs (238, 565) on SVC-DESK so handoffs 647/835 can resolve target_module
// ============================================================
const extraDmdoSpecs = [
  { domain_module_id: M_SVC_DESK, data_object_id: DO_REMOTE_SESSIONS, role: "consumer", necessity: "optional" },
  { domain_module_id: M_SVC_DESK, data_object_id: DO_CHAT_MESSAGES,   role: "consumer", necessity: "optional" },
];

// ============================================================
// 2) Lifecycle states
// ============================================================
type StateSpec = {
  data_object_id: number;
  domain_module_id: number;
  state_name: string;
  state_order: number;
  is_initial?: boolean;
  is_terminal?: boolean;
  requires_permission?: boolean;
  permission_verb_override?: string;
  description: string;
};

const stateSpecs: StateSpec[] = [
  // msp_tickets in SVC-DESK
  { data_object_id: DO_MSP_TICKETS, domain_module_id: M_SVC_DESK, state_name: "new", state_order: 10, is_initial: true,  requires_permission: true,  description: "Newly created ticket awaiting triage." },
  { data_object_id: DO_MSP_TICKETS, domain_module_id: M_SVC_DESK, state_name: "in_progress", state_order: 20, requires_permission: true, description: "Ticket assigned to a technician and being actively worked." },
  { data_object_id: DO_MSP_TICKETS, domain_module_id: M_SVC_DESK, state_name: "on_hold", state_order: 30, requires_permission: true, description: "Ticket paused pending customer response or external dependency; SLA timer pauses." },
  { data_object_id: DO_MSP_TICKETS, domain_module_id: M_SVC_DESK, state_name: "resolved", state_order: 40, requires_permission: true, description: "Technician has applied a fix; awaiting customer confirmation before close." },
  { data_object_id: DO_MSP_TICKETS, domain_module_id: M_SVC_DESK, state_name: "closed", state_order: 50, is_terminal: true, requires_permission: true, description: "Ticket finalized after customer confirmation or auto-close timeout." },

  // msp_contracts in CONTRACTS
  { data_object_id: DO_MSP_CONTRACTS, domain_module_id: M_CONTRACTS, state_name: "draft", state_order: 10, is_initial: true, description: "Contract under negotiation; not yet binding." },
  { data_object_id: DO_MSP_CONTRACTS, domain_module_id: M_CONTRACTS, state_name: "active", state_order: 20, requires_permission: true, permission_verb_override: "activate", description: "Contract executed and in force; billing and SLA clocks running." },
  { data_object_id: DO_MSP_CONTRACTS, domain_module_id: M_CONTRACTS, state_name: "suspended", state_order: 30, requires_permission: true, permission_verb_override: "suspend", description: "Contract temporarily paused (non-payment, dispute); SLAs paused, billing held." },
  { data_object_id: DO_MSP_CONTRACTS, domain_module_id: M_CONTRACTS, state_name: "terminated", state_order: 40, is_terminal: true, requires_permission: true, permission_verb_override: "terminate", description: "Contract ended (renewal lapsed, early termination, churn)." },

  // msp_clients in CONTRACTS
  { data_object_id: DO_MSP_CLIENTS, domain_module_id: M_CONTRACTS, state_name: "prospect", state_order: 10, is_initial: true, description: "Pre-contract opportunity; tracked but not yet a paying client." },
  { data_object_id: DO_MSP_CLIENTS, domain_module_id: M_CONTRACTS, state_name: "onboarding", state_order: 20, requires_permission: true, permission_verb_override: "onboard", description: "Initial provisioning under way (RMM agent deployment, billing setup, kickoff)." },
  { data_object_id: DO_MSP_CLIENTS, domain_module_id: M_CONTRACTS, state_name: "active", state_order: 30, description: "Active managed client under at least one current contract." },
  { data_object_id: DO_MSP_CLIENTS, domain_module_id: M_CONTRACTS, state_name: "offboarded", state_order: 40, is_terminal: true, requires_permission: true, permission_verb_override: "offboard", description: "Client relationship ended; RMM agents removed, contracts closed out." },

  // msp_time_entries in TIME-BILLING
  { data_object_id: DO_MSP_TIME_ENTRIES, domain_module_id: M_TIME_BILLING, state_name: "draft", state_order: 10, is_initial: true, description: "Time entry being captured by the technician." },
  { data_object_id: DO_MSP_TIME_ENTRIES, domain_module_id: M_TIME_BILLING, state_name: "submitted", state_order: 20, requires_permission: true, permission_verb_override: "submit", description: "Technician has submitted the entry for approval." },
  { data_object_id: DO_MSP_TIME_ENTRIES, domain_module_id: M_TIME_BILLING, state_name: "approved", state_order: 30, requires_permission: true, permission_verb_override: "approve", description: "Time entry approved and eligible for billing or block-hour decrement." },
  { data_object_id: DO_MSP_TIME_ENTRIES, domain_module_id: M_TIME_BILLING, state_name: "billed", state_order: 40, is_terminal: true, requires_permission: true, permission_verb_override: "bill", description: "Time entry consolidated onto an issued invoice; no further changes allowed." },

  // msp_invoices in TIME-BILLING
  { data_object_id: DO_MSP_INVOICES, domain_module_id: M_TIME_BILLING, state_name: "draft", state_order: 10, is_initial: true, description: "Invoice under preparation; line items still editable." },
  { data_object_id: DO_MSP_INVOICES, domain_module_id: M_TIME_BILLING, state_name: "issued", state_order: 20, requires_permission: true, permission_verb_override: "issue", description: "Invoice sent to customer; submit-lock engaged, AR clock starts." },
  { data_object_id: DO_MSP_INVOICES, domain_module_id: M_TIME_BILLING, state_name: "paid", state_order: 30, is_terminal: true, requires_permission: true, permission_verb_override: "mark_paid", description: "Payment received and reconciled." },
  { data_object_id: DO_MSP_INVOICES, domain_module_id: M_TIME_BILLING, state_name: "overdue", state_order: 40, description: "Past due-date; AR aging engaged; dunning may trigger." },
  { data_object_id: DO_MSP_INVOICES, domain_module_id: M_TIME_BILLING, state_name: "written_off", state_order: 50, is_terminal: true, requires_permission: true, permission_verb_override: "write_off", description: "Invoice charged off as uncollectible; AR adjusted." },
];

// ============================================================
// 3) Trigger events (new + category fixes)
// ============================================================
type EventSpec = {
  event_name: string;
  data_object_id: number;
  domain_module_id?: number;
  event_category: string;
  to_state?: string;
  from_state?: string;
  description: string;
};

const eventSpecs: EventSpec[] = [
  { event_name: "msp_ticket.created",          data_object_id: DO_MSP_TICKETS,       domain_module_id: M_SVC_DESK,     event_category: "state_change", to_state: "new",          description: "Customer or RMM agent has opened a new MSP ticket." },
  { event_name: "msp_ticket.resolved",         data_object_id: DO_MSP_TICKETS,       domain_module_id: M_SVC_DESK,     event_category: "state_change", to_state: "resolved",     description: "Technician has applied a fix; awaiting customer confirmation." },
  { event_name: "msp_ticket.closed",           data_object_id: DO_MSP_TICKETS,       domain_module_id: M_SVC_DESK,     event_category: "state_change", to_state: "closed",       description: "Ticket finalized after customer confirmation or auto-close." },
  { event_name: "msp_time_entry.submitted",    data_object_id: DO_MSP_TIME_ENTRIES,  domain_module_id: M_TIME_BILLING, event_category: "state_change", to_state: "submitted",    description: "Technician has submitted a time entry for approval." },
  { event_name: "msp_time_entry.approved",     data_object_id: DO_MSP_TIME_ENTRIES,  domain_module_id: M_TIME_BILLING, event_category: "state_change", to_state: "approved",     description: "Time entry approved; eligible for billing or block-hour decrement." },
  { event_name: "msp_invoice.paid",            data_object_id: DO_MSP_INVOICES,      domain_module_id: M_TIME_BILLING, event_category: "state_change", to_state: "paid",         description: "MSP customer invoice has been paid in full." },
  { event_name: "msp_invoice.overdue",         data_object_id: DO_MSP_INVOICES,      domain_module_id: M_TIME_BILLING, event_category: "threshold",    to_state: "overdue",      description: "Invoice past due date; dunning workflow may trigger." },
  { event_name: "msp_contract.terminated",     data_object_id: DO_MSP_CONTRACTS,     domain_module_id: M_CONTRACTS,    event_category: "state_change", to_state: "terminated",   description: "MSP contract has been terminated (early termination, churn, non-renewal)." },
  { event_name: "msp_contract.suspended",      data_object_id: DO_MSP_CONTRACTS,     domain_module_id: M_CONTRACTS,    event_category: "state_change", to_state: "suspended",    description: "MSP contract paused (non-payment, dispute). SLAs paused; billing held." },
];

// PATCHes on existing events with empty event_category
const eventCategoryFixes: Array<{ id: number; event_category: string; to_state?: string; from_state?: string; domain_module_id?: number }> = [
  { id: 536, event_category: "state_change", to_state: "active",      domain_module_id: M_CONTRACTS },
  { id: 537, event_category: "threshold",                              domain_module_id: M_CONTRACTS },
  { id: 538, event_category: "state_change", to_state: "issued",      domain_module_id: M_TIME_BILLING },
  { id: 539, event_category: "state_change", to_state: "active",      domain_module_id: M_CONTRACTS },
  { id: 540, event_category: "state_change", to_state: "offboarded",  domain_module_id: M_CONTRACTS },
  // existing events 75, 76 also benefit from domain_module_id
  { id: 75, event_category: "state_change", domain_module_id: M_TIME_BILLING },
  { id: 76, event_category: "state_change", domain_module_id: M_SVC_DESK },
];

// ============================================================
// 4) Intra-domain relationships (B6)
// ============================================================
type RelSpec = {
  data_object_id: number;
  related_data_object_id: number;
  relationship_verb: string;
  inverse_verb: string;
  relationship_type: "one_to_one" | "one_to_many" | "many_to_many";
  relationship_kind: "composition" | "reference" | "association" | "inheritance";
  owner_side: "source" | "target";
  is_required: boolean;
  notes?: string;
};

const intraDomainRels: RelSpec[] = [
  { data_object_id: DO_MSP_CLIENTS,   related_data_object_id: DO_MSP_CONTRACTS,    relationship_verb: "holds_contracts",  inverse_verb: "issued_to",         relationship_type: "one_to_many", relationship_kind: "reference", owner_side: "target", is_required: true,  notes: "Every MSP contract is issued to exactly one client; clients may hold multiple concurrent contracts." },
  { data_object_id: DO_MSP_CONTRACTS, related_data_object_id: DO_MSP_TICKETS,      relationship_verb: "covers_tickets",   inverse_verb: "raised_against",    relationship_type: "one_to_many", relationship_kind: "reference", owner_side: "target", is_required: false, notes: "Optional; some tickets are out-of-contract (T&M overflow)." },
  { data_object_id: DO_MSP_CLIENTS,   related_data_object_id: DO_MSP_TICKETS,      relationship_verb: "raises_tickets",   inverse_verb: "opened_by",         relationship_type: "one_to_many", relationship_kind: "reference", owner_side: "target", is_required: true },
  { data_object_id: DO_MSP_TICKETS,   related_data_object_id: DO_MSP_TIME_ENTRIES, relationship_verb: "accrues_time",     inverse_verb: "logged_on",         relationship_type: "one_to_many", relationship_kind: "reference", owner_side: "target", is_required: false, notes: "Time entries may also be standalone (block-hour true-up, project work without a ticket)." },
  { data_object_id: DO_MSP_CLIENTS,   related_data_object_id: DO_MSP_INVOICES,     relationship_verb: "receives_invoices", inverse_verb: "billed_to",        relationship_type: "one_to_many", relationship_kind: "reference", owner_side: "target", is_required: true },
  { data_object_id: DO_MSP_INVOICES,  related_data_object_id: DO_MSP_TIME_ENTRIES, relationship_verb: "consolidates_time", inverse_verb: "included_in_invoice", relationship_type: "one_to_many", relationship_kind: "reference", owner_side: "target", is_required: false },
  { data_object_id: DO_MSP_CONTRACTS, related_data_object_id: DO_MSP_INVOICES,     relationship_verb: "generates_invoices", inverse_verb: "bills_against",   relationship_type: "one_to_many", relationship_kind: "reference", owner_side: "target", is_required: false, notes: "Recurring billing typically generated from the contract schedule; one-off invoices may not link." },
];

// ============================================================
// 5) Users edges (B7)
// ============================================================
const userRels: RelSpec[] = [
  { data_object_id: DO_USERS, related_data_object_id: DO_MSP_TICKETS,      relationship_verb: "is_assigned_to_tickets", inverse_verb: "assigned_to",  relationship_type: "one_to_many", relationship_kind: "reference", owner_side: "target", is_required: false, notes: "Technician assignee on the MSP ticket queue." },
  { data_object_id: DO_USERS, related_data_object_id: DO_MSP_TICKETS,      relationship_verb: "opens_tickets",          inverse_verb: "opened_by",    relationship_type: "one_to_many", relationship_kind: "reference", owner_side: "target", is_required: false, notes: "Requester on the ticket (often a client-side contact synced into users)." },
  { data_object_id: DO_USERS, related_data_object_id: DO_MSP_TIME_ENTRIES, relationship_verb: "logs_time_entries",      inverse_verb: "logged_by",    relationship_type: "one_to_many", relationship_kind: "reference", owner_side: "target", is_required: true,  notes: "Technician who captured the time entry." },
  { data_object_id: DO_USERS, related_data_object_id: DO_MSP_TIME_ENTRIES, relationship_verb: "approves_time_entries",  inverse_verb: "approved_by",  relationship_type: "one_to_many", relationship_kind: "reference", owner_side: "target", is_required: false },
  { data_object_id: DO_USERS, related_data_object_id: DO_MSP_CONTRACTS,    relationship_verb: "manages_contracts",      inverse_verb: "managed_by",   relationship_type: "one_to_many", relationship_kind: "reference", owner_side: "target", is_required: false, notes: "Account manager on the MSP contract." },
  { data_object_id: DO_USERS, related_data_object_id: DO_MSP_INVOICES,     relationship_verb: "issues_invoices",        inverse_verb: "issued_by",    relationship_type: "one_to_many", relationship_kind: "reference", owner_side: "target", is_required: false },
  { data_object_id: DO_USERS, related_data_object_id: DO_MSP_CLIENTS,      relationship_verb: "owns_clients",           inverse_verb: "owned_by",     relationship_type: "one_to_many", relationship_kind: "reference", owner_side: "target", is_required: false, notes: "Account owner on the MSP client." },
];

// ============================================================
// 6) Aliases (B11)
// ============================================================
type AliasSpec = { data_object_id: number; alias_name: string; alias_type: "synonym" | "industry_term" | "solution_term"; solution_id?: number; notes?: string };

const aliasSpecs: AliasSpec[] = [
  // msp_clients
  { data_object_id: DO_MSP_CLIENTS, alias_name: "Companies",         alias_type: "solution_term", solution_id: 534, notes: "ConnectWise PSA terminology." },
  { data_object_id: DO_MSP_CLIENTS, alias_name: "Accounts",          alias_type: "solution_term", solution_id: 535, notes: "Autotask terminology." },
  { data_object_id: DO_MSP_CLIENTS, alias_name: "Managed Customers", alias_type: "synonym" },
  // msp_contracts
  { data_object_id: DO_MSP_CONTRACTS, alias_name: "Agreements",     alias_type: "solution_term", solution_id: 534, notes: "ConnectWise PSA terminology." },
  { data_object_id: DO_MSP_CONTRACTS, alias_name: "Service Contracts", alias_type: "synonym" },
  { data_object_id: DO_MSP_CONTRACTS, alias_name: "MSAs",           alias_type: "synonym", notes: "Master Service Agreement." },
  // msp_tickets
  { data_object_id: DO_MSP_TICKETS, alias_name: "Service Tickets",  alias_type: "synonym" },
  { data_object_id: DO_MSP_TICKETS, alias_name: "Trouble Tickets",  alias_type: "synonym" },
  { data_object_id: DO_MSP_TICKETS, alias_name: "Help Desk Tickets", alias_type: "synonym" },
  // msp_time_entries
  { data_object_id: DO_MSP_TIME_ENTRIES, alias_name: "Timesheets",  alias_type: "synonym", notes: "Loose synonym; an MSP timesheet is a roll-up of many time entries." },
  // msp_invoices
  { data_object_id: DO_MSP_INVOICES, alias_name: "Customer Invoices", alias_type: "synonym" },
  { data_object_id: DO_MSP_INVOICES, alias_name: "Bills",             alias_type: "synonym" },
];

// ============================================================
// 7) Pattern flag PATCHes (B4)
// ============================================================
const dataObjectFlagPatches: Array<{ id: number; has_submit_lock?: boolean; notes?: string }> = [
  { id: DO_MSP_CONTRACTS, has_submit_lock: true, notes: "Submit-lock engages on activation: once active, financial terms are locked from edit." },
  { id: DO_MSP_INVOICES,  has_submit_lock: true, notes: "Submit-lock engages on issuance: once issued, the invoice is locked and corrections require a credit memo." },
];

// ============================================================
// 8) Handoff module-FK backfill (B10b) — PATCH 10 existing rows
// ============================================================
type HandoffPatch = {
  id: number;
  source_domain_module_id: number | null;
  target_domain_module_id: number | null;
  notes_append?: string;
};

const handoffPatches: HandoffPatch[] = [
  { id: 159, source_domain_module_id: null,            target_domain_module_id: M_SVC_DESK,     notes_append: " | source NULL until RMM is modularized" },
  { id: 160, source_domain_module_id: M_SVC_DESK,      target_domain_module_id: null,           notes_append: " | target NULL until REMOTE-ACCESS is modularized" },
  { id: 161, source_domain_module_id: M_SVC_DESK,      target_domain_module_id: null,           notes_append: " | target NULL until HAM is modularized; trigger_event.id=? is mis-modeled (event name 'ticket.created' points at hardware_assets data_object — flagged for follow-up)" },
  { id: 163, source_domain_module_id: null,            target_domain_module_id: M_TIME_BILLING, notes_append: " | source NULL until REMOTE-ACCESS is modularized" },
  { id: 523, source_domain_module_id: M_SVC_DESK,      target_domain_module_id: null,           notes_append: " | target NULL until CSM consumes msp_tickets" },
  { id: 524, source_domain_module_id: M_TIME_BILLING,  target_domain_module_id: null,           notes_append: " | target NULL until ERP-FIN is modularized" },
  { id: 525, source_domain_module_id: M_CONTRACTS,     target_domain_module_id: null,           notes_append: " | target NULL until CSM consumes msp_contracts" },
  { id: 526, source_domain_module_id: M_CONTRACTS,     target_domain_module_id: null,           notes_append: " | target NULL until ERP-FIN is modularized" },
  { id: 647, source_domain_module_id: null,            target_domain_module_id: M_SVC_DESK,     notes_append: " | source NULL until REMOTE-ACCESS is modularized" },
  // 835: source already set to 115; only patch target
  { id: 835, source_domain_module_id: 115,             target_domain_module_id: M_SVC_DESK },
];

// ============================================================
// 9) Intra-domain handoffs (B9b)
// ============================================================
type IntraHandoff = {
  source_module: number; target_module: number;
  trigger_event_name: string; // resolved to id after events load
  data_object_id: number;
  integration_pattern: "lifecycle_progression" | "api_call" | "event_stream" | "batch_sync" | "manual_handoff" | "file_drop";
  friction_level: "low" | "medium" | "high";
  notes: string;
};

const intraHandoffs: IntraHandoff[] = [
  { source_module: M_SVC_DESK,    target_module: M_DISPATCH,     trigger_event_name: "msp_ticket.created",    data_object_id: DO_MSP_TICKETS,      integration_pattern: "lifecycle_progression", friction_level: "low", notes: "New ticket enters dispatch board for scheduling (when site visit or skilled-tech routing is required)." },
  { source_module: M_SVC_DESK,    target_module: M_TIME_BILLING, trigger_event_name: "msp_time_entry.approved", data_object_id: DO_MSP_TIME_ENTRIES, integration_pattern: "lifecycle_progression", friction_level: "low", notes: "Approved time entries become available for invoice consolidation." },
  { source_module: M_CONTRACTS,   target_module: M_TIME_BILLING, trigger_event_name: "msp_contract.activated",  data_object_id: DO_MSP_CONTRACTS,    integration_pattern: "lifecycle_progression", friction_level: "low", notes: "Contract activation enables recurring billing schedule and block-hour ledger." },
  { source_module: M_CONTRACTS,   target_module: M_SVC_DESK,     trigger_event_name: "msp_contract.suspended",  data_object_id: DO_MSP_CONTRACTS,    integration_pattern: "lifecycle_progression", friction_level: "medium", notes: "Suspended contracts block new tickets in queue (or flag them with a contract-issue indicator)." },
];

// ============================================================
// Loader
// ============================================================
async function main() {
  console.log("=== MSP-PSA B-band load ===\n");

  // ---- 1) Extra DMDOs ----
  console.log("[1/9] Adding 2 consumer DMDOs (238 remote_sessions, 565 chat_messages on SVC-DESK)");
  const existingExtra = await get(`/domain_module_data_objects?domain_module_id=eq.${M_SVC_DESK}&data_object_id=in.(${DO_REMOTE_SESSIONS},${DO_CHAT_MESSAGES})&select=data_object_id`);
  const existingExtraIds = new Set(existingExtra.map(r => Number(r.data_object_id)));
  const missingExtra = extraDmdoSpecs.filter(s => !existingExtraIds.has(s.data_object_id));
  if (missingExtra.length > 0) {
    await insert("/domain_module_data_objects", missingExtra as Row[]);
    console.log(`  inserted ${missingExtra.length}`);
  } else console.log("  all already present");

  // ---- 2) Lifecycle states ----
  console.log("\n[2/9] Lifecycle states");
  const masterIds = [DO_MSP_TICKETS, DO_MSP_CONTRACTS, DO_MSP_TIME_ENTRIES, DO_MSP_INVOICES, DO_MSP_CLIENTS];
  const existingStates = await get(`/data_object_lifecycle_states?data_object_id=in.(${masterIds.join(",")})&select=data_object_id,state_name`);
  const stateKey = (doid: number, name: string) => `${doid}|${name}`;
  const existingStateKeys = new Set(existingStates.map(r => stateKey(Number(r.data_object_id), String(r.state_name))));
  const missingStates = stateSpecs
    .filter(s => !existingStateKeys.has(stateKey(s.data_object_id, s.state_name)))
    .map(s => ({
      ...s,
      is_initial: s.is_initial ?? false,
      is_terminal: s.is_terminal ?? false,
      requires_permission: s.requires_permission ?? false,
      permission_verb_override: s.permission_verb_override ?? "",
    }));
  if (missingStates.length > 0) {
    await insert("/data_object_lifecycle_states", missingStates as unknown as Row[]);
    console.log(`  inserted ${missingStates.length}`);
  } else console.log("  all already present");

  // ---- 3) Trigger events ----
  console.log("\n[3/9] Trigger events (new + category fixes)");
  const existingEvents = await get(`/trigger_events?data_object_id=in.(${masterIds.join(",")})&select=id,event_name`);
  const existingEventNames = new Set(existingEvents.map(r => String(r.event_name)));
  const missingEvents = eventSpecs.filter(s => !existingEventNames.has(s.event_name));
  if (missingEvents.length > 0) {
    await insert("/trigger_events", missingEvents as unknown as Row[]);
    console.log(`  inserted ${missingEvents.length} new`);
  } else console.log("  all new events already present");

  for (const fix of eventCategoryFixes) {
    const { id, ...body } = fix;
    await patch(`/trigger_events?id=eq.${id}`, body as unknown as Row);
  }
  console.log(`  patched ${eventCategoryFixes.length} existing events with category / module FK`);

  // Build event-name -> id map
  const allEvents = await get(`/trigger_events?data_object_id=in.(${masterIds.join(",")})&select=id,event_name`);
  const eventIdByName = new Map<string, number>();
  for (const r of allEvents) eventIdByName.set(String(r.event_name), Number(r.id));

  // ---- 4) Intra-domain relationships ----
  console.log("\n[4/9] Intra-domain relationships (B6)");
  const masterAndUserIds = [...masterIds, DO_USERS];
  const existingRels = await get(`/data_object_relationships?or=(and(data_object_id.in.(${masterAndUserIds.join(",")}),related_data_object_id.in.(${masterAndUserIds.join(",")})))&select=data_object_id,related_data_object_id,relationship_verb`);
  const relKey = (a: number, b: number, v: string) => `${a}|${b}|${v}`;
  const existingRelKeys = new Set(existingRels.map(r => relKey(Number(r.data_object_id), Number(r.related_data_object_id), String(r.relationship_verb))));
  const normalizeRel = (r: RelSpec) => ({ ...r, notes: r.notes ?? "" });
  const missingIntraRels = intraDomainRels.filter(r => !existingRelKeys.has(relKey(r.data_object_id, r.related_data_object_id, r.relationship_verb))).map(normalizeRel);
  if (missingIntraRels.length > 0) {
    await insert("/data_object_relationships", missingIntraRels as unknown as Row[]);
    console.log(`  inserted ${missingIntraRels.length}`);
  } else console.log("  all already present");

  // ---- 5) Users edges ----
  console.log("\n[5/9] Users edges (B7)");
  const missingUserRels = userRels.filter(r => !existingRelKeys.has(relKey(r.data_object_id, r.related_data_object_id, r.relationship_verb))).map(normalizeRel);
  if (missingUserRels.length > 0) {
    await insert("/data_object_relationships", missingUserRels as unknown as Row[]);
    console.log(`  inserted ${missingUserRels.length}`);
  } else console.log("  all already present");

  // ---- 6) Aliases ----
  console.log("\n[6/9] Aliases (B11)");
  const existingAliases = await get(`/data_object_aliases?data_object_id=in.(${masterIds.join(",")})&select=data_object_id,alias_name`);
  const aliasKey = (doid: number, name: string) => `${doid}|${name.toLowerCase()}`;
  const existingAliasKeys = new Set(existingAliases.map(r => aliasKey(Number(r.data_object_id), String(r.alias_name))));
  const missingAliases = aliasSpecs
    .filter(s => !existingAliasKeys.has(aliasKey(s.data_object_id, s.alias_name)))
    .map(s => ({ ...s, notes: s.notes ?? "", solution_id: s.solution_id ?? null }));
  if (missingAliases.length > 0) {
    await insert("/data_object_aliases", missingAliases as unknown as Row[]);
    console.log(`  inserted ${missingAliases.length}`);
  } else console.log("  all already present");

  // ---- 7) Pattern flag PATCHes ----
  console.log("\n[7/9] Pattern flag PATCHes (B4)");
  for (const p of dataObjectFlagPatches) {
    const { id, ...body } = p;
    await patch(`/data_objects?id=eq.${id}`, body as unknown as Row);
  }
  console.log(`  patched ${dataObjectFlagPatches.length} data_objects`);

  // ---- 8) Handoff module-FK backfill ----
  console.log("\n[8/9] Handoff module-FK backfill (B10b)");
  // Fetch current notes so we can append rather than overwrite
  const handoffIds = handoffPatches.map(p => p.id).join(",");
  const currentHandoffs = await get(`/handoffs?id=in.(${handoffIds})&select=id,notes`);
  const notesById = new Map<number, string>();
  for (const r of currentHandoffs) notesById.set(Number(r.id), String(r.notes ?? ""));

  for (const p of handoffPatches) {
    const currentNotes = notesById.get(p.id) ?? "";
    const newNotes = p.notes_append && !currentNotes.includes(p.notes_append.trim())
      ? (currentNotes + p.notes_append).trim()
      : currentNotes;
    const body: Row = {
      source_domain_module_id: p.source_domain_module_id,
      target_domain_module_id: p.target_domain_module_id,
      notes: newNotes,
    };
    await patch(`/handoffs?id=eq.${p.id}`, body);
  }
  console.log(`  patched ${handoffPatches.length} handoff rows`);

  // ---- 9) Intra-domain handoffs ----
  console.log("\n[9/9] Intra-domain handoffs (B9b)");
  const intraHandoffRows: Row[] = [];
  const missingEventForHandoff: string[] = [];
  for (const ih of intraHandoffs) {
    const eid = eventIdByName.get(ih.trigger_event_name);
    if (!eid) {
      missingEventForHandoff.push(ih.trigger_event_name);
      continue;
    }
    intraHandoffRows.push({
      source_domain_id: D_MSP_PSA,
      target_domain_id: D_MSP_PSA,
      source_domain_module_id: ih.source_module,
      target_domain_module_id: ih.target_module,
      trigger_event_id: eid,
      data_object_id: ih.data_object_id,
      integration_pattern: ih.integration_pattern,
      friction_level: ih.friction_level,
      notes: ih.notes,
    });
  }
  if (missingEventForHandoff.length > 0) {
    console.log(`  WARN: missing event ids for ${missingEventForHandoff.join(", ")}`);
  }
  // Dedupe against existing intra-domain rows
  const existingIntra = await get(`/handoffs?source_domain_id=eq.${D_MSP_PSA}&target_domain_id=eq.${D_MSP_PSA}&select=trigger_event_id,source_domain_module_id,target_domain_module_id`);
  const intraKey = (te: number, sm: number, tm: number) => `${te}|${sm}|${tm}`;
  const existingIntraKeys = new Set(existingIntra.map(r => intraKey(Number(r.trigger_event_id), Number(r.source_domain_module_id), Number(r.target_domain_module_id))));
  const missingIntra = intraHandoffRows.filter(r => !existingIntraKeys.has(intraKey(Number(r.trigger_event_id), Number(r.source_domain_module_id), Number(r.target_domain_module_id))));
  if (missingIntra.length > 0) {
    await insert("/handoffs", missingIntra);
    console.log(`  inserted ${missingIntra.length}`);
  } else console.log("  all already present");

  // ---- summary ----
  console.log("\n=== summary ===");
  console.log("UI: https://tests.semantius.app/domain_map/domain_modules");
  console.log("UI: https://tests.semantius.app/domain_map/data_object_lifecycle_states");
  console.log("UI: https://tests.semantius.app/domain_map/trigger_events");
  console.log("UI: https://tests.semantius.app/domain_map/handoffs");
}

await main();
