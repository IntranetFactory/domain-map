#!/usr/bin/env bun
// LEGAL-PRACT-MGMT Phase B deltas:
//   - B11 aliases (~25 rows across 6 masters)
//   - B12 lifecycle states (~33 rows across 6 masters)
//   - B6 intra-domain relationships (~10 rows)
//   - B7 users edges (~13 rows)
//   - B10b backfill: source_domain_module_id on 7 outbound handoffs;
//                    target_domain_module_id only on the CLM edge (CLM-AUTHORING)
// Idempotent. Re-runnable.

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  // Pass JSON inline as a single CLI arg. Avoids stdin-pipe corruption seen on
  // Bun-spawn+bash redirect with multi-row bodies (PGRST102).
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(body)], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (code !== 0) { throw new Error(`semantius failed (${code}): ${stderr}`); }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (p: string) => call({ method: "GET", path: p });
const post = (p: string, b: Row | Row[]) => call({ method: "POST", path: p, body: b });
const patch = (p: string, b: Row) => call({ method: "PATCH", path: p, body: b });
async function insert(p: string, rows: Row[]): Promise<Row[]> {
  if (!rows.length) return [];
  const CHUNK = 50; const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(...await post(p, rows.slice(i, i + CHUNK)));
  return out;
}

const DO_MATTERS = 391, DO_TRUST = 392, DO_CONFLICT = 393, DO_ENG_LETTER = 394;
const DO_COURT_FILING = 738, DO_CLIENT_INVOICE = 739;
const DO_USERS = 748, DO_TIME_ENTRIES = 162, DO_CRM_CONTACTS = 98, DO_LEGAL_CONTRACTS = 66;
const M_MATTER = 132, M_INTAKE = 133, M_BILLING = 134, M_TRUST = 135, M_COURT = 136;
const CLM_AUTHORING_MODULE = 125;

// ============================================================
// 1. B11 aliases
// ============================================================
console.log("[1/5] B11 aliases");
const aliases = [
  { data_object_id: DO_MATTERS, alias_name: "Case",               alias_type: "synonym",        industry_id: null },
  { data_object_id: DO_MATTERS, alias_name: "Cause",              alias_type: "synonym",        industry_id: null },
  { data_object_id: DO_MATTERS, alias_name: "File",               alias_type: "synonym",        industry_id: null },
  { data_object_id: DO_MATTERS, alias_name: "Client Matter",      alias_type: "synonym",        industry_id: null },
  { data_object_id: DO_MATTERS, alias_name: "Engagement",         alias_type: "industry_term", industry_id: 16 },
  { data_object_id: DO_TRUST,    alias_name: "IOLTA Account",      alias_type: "industry_term", industry_id: 16 },
  { data_object_id: DO_TRUST,    alias_name: "Client Funds Account", alias_type: "industry_term", industry_id: 16 },
  { data_object_id: DO_TRUST,    alias_name: "Escrow Account",     alias_type: "synonym",        industry_id: null },
  { data_object_id: DO_TRUST,    alias_name: "Retainer Account",   alias_type: "synonym",        industry_id: null },
  { data_object_id: DO_CONFLICT, alias_name: "Conflict Search",    alias_type: "synonym",        industry_id: null },
  { data_object_id: DO_CONFLICT, alias_name: "Conflicts Run",      alias_type: "synonym",        industry_id: null },
  { data_object_id: DO_CONFLICT, alias_name: "COI Check",          alias_type: "synonym",        industry_id: null },
  { data_object_id: DO_CONFLICT, alias_name: "Ethics Check",       alias_type: "industry_term", industry_id: 16 },
  { data_object_id: DO_ENG_LETTER, alias_name: "Retainer Agreement", alias_type: "industry_term", industry_id: 16 },
  { data_object_id: DO_ENG_LETTER, alias_name: "Fee Agreement",      alias_type: "industry_term", industry_id: 16 },
  { data_object_id: DO_ENG_LETTER, alias_name: "Letter of Engagement", alias_type: "synonym",      industry_id: null },
  { data_object_id: DO_ENG_LETTER, alias_name: "Representation Agreement", alias_type: "synonym", industry_id: null },
  { data_object_id: DO_COURT_FILING, alias_name: "Pleading",        alias_type: "industry_term", industry_id: 16 },
  { data_object_id: DO_COURT_FILING, alias_name: "Court Submission", alias_type: "synonym",       industry_id: null },
  { data_object_id: DO_COURT_FILING, alias_name: "Docket Entry",    alias_type: "industry_term", industry_id: 16 },
  { data_object_id: DO_COURT_FILING, alias_name: "Filed Document",  alias_type: "synonym",       industry_id: null },
  { data_object_id: DO_COURT_FILING, alias_name: "ECF Filing",      alias_type: "industry_term", industry_id: 16 },
  { data_object_id: DO_CLIENT_INVOICE, alias_name: "Bill",          alias_type: "synonym",       industry_id: null },
  { data_object_id: DO_CLIENT_INVOICE, alias_name: "Statement of Services", alias_type: "synonym", industry_id: null },
  { data_object_id: DO_CLIENT_INVOICE, alias_name: "LEDES Invoice", alias_type: "industry_term", industry_id: 16 },
  { data_object_id: DO_CLIENT_INVOICE, alias_name: "Legal Bill",    alias_type: "synonym",       industry_id: null },
];
const existingAliases = await get(`/data_object_aliases?data_object_id=in.(${DO_MATTERS},${DO_TRUST},${DO_CONFLICT},${DO_ENG_LETTER},${DO_COURT_FILING},${DO_CLIENT_INVOICE})&select=data_object_id,alias_name`);
const aliasKey = (r: Row) => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`;
const existingAliasKeys = new Set(existingAliases.map(aliasKey));
const missingAliases = aliases.filter(a => !existingAliasKeys.has(aliasKey(a)));
if (missingAliases.length) await insert("/data_object_aliases", missingAliases);
console.log(`  ${missingAliases.length} aliases inserted (${existingAliases.length} pre-existing)`);

// ============================================================
// 2. B12 lifecycle states
// ============================================================
console.log("\n[2/5] B12 lifecycle states");
type LS = { data_object_id: number; state_name: string; state_order: number; description: string; is_initial?: boolean; is_terminal?: boolean; requires_permission?: boolean; permission_verb_override?: string; domain_module_id: number };
const states: LS[] = [
  // legal_matters
  { data_object_id: DO_MATTERS, state_name: "intake",             state_order: 1, is_initial: true, description: "Matter is being captured at intake; client has not yet been cleared.", domain_module_id: M_MATTER },
  { data_object_id: DO_MATTERS, state_name: "conflict_pending",   state_order: 2, description: "Awaiting conflict-check clearance before matter can advance.", domain_module_id: M_MATTER },
  { data_object_id: DO_MATTERS, state_name: "engagement_pending", state_order: 3, description: "Conflict clear; awaiting signed engagement letter and retainer.", domain_module_id: M_MATTER },
  { data_object_id: DO_MATTERS, state_name: "active",             state_order: 4, requires_permission: true, permission_verb_override: "open_matter", description: "Matter is open; time and expenses billable.", domain_module_id: M_MATTER },
  { data_object_id: DO_MATTERS, state_name: "on_hold",            state_order: 5, requires_permission: true, permission_verb_override: "hold_matter", description: "Matter is paused (client request, fee dispute, awaiting court). Billing suspended.", domain_module_id: M_MATTER },
  { data_object_id: DO_MATTERS, state_name: "closed",             state_order: 6, requires_permission: true, permission_verb_override: "close_matter", is_terminal: true, description: "Matter is closed; final invoice issued, trust balance disbursed. Triggers retention-rule clock.", domain_module_id: M_MATTER },
  { data_object_id: DO_MATTERS, state_name: "archived",           state_order: 7, is_terminal: true, description: "Closed matter has reached its retention threshold; file moved to long-term archive per state-bar rules.", domain_module_id: M_MATTER },
  // trust_accounts
  { data_object_id: DO_TRUST, state_name: "opened",     state_order: 1, is_initial: true, requires_permission: true, permission_verb_override: "open_trust_account", description: "IOLTA trust account opened for a client (and matter, when matter-scoped).", domain_module_id: M_TRUST },
  { data_object_id: DO_TRUST, state_name: "active",     state_order: 2, description: "Trust account is in normal operation; deposits and disbursements posted.", domain_module_id: M_TRUST },
  { data_object_id: DO_TRUST, state_name: "exception",  state_order: 3, requires_permission: true, permission_verb_override: "flag_exception", description: "Three-way reconciliation discrepancy detected. Bookkeeper review and potentially state-bar reporting.", domain_module_id: M_TRUST },
  { data_object_id: DO_TRUST, state_name: "reconciled", state_order: 4, requires_permission: true, permission_verb_override: "reconcile_account", description: "Account reconciled for the period; bank, ledger, and client balances agree.", domain_module_id: M_TRUST },
  { data_object_id: DO_TRUST, state_name: "closed",     state_order: 5, is_terminal: true, requires_permission: true, permission_verb_override: "close_trust_account", description: "Trust account closed; balance fully disbursed or transferred per client direction.", domain_module_id: M_TRUST },
  // conflict_checks
  { data_object_id: DO_CONFLICT, state_name: "requested", state_order: 1, is_initial: true, description: "Conflict-check requested; party names being collected.", domain_module_id: M_INTAKE },
  { data_object_id: DO_CONFLICT, state_name: "searching", state_order: 2, description: "Graph search running across existing matters, parties, and adversaries.", domain_module_id: M_INTAKE },
  { data_object_id: DO_CONFLICT, state_name: "cleared",   state_order: 3, requires_permission: true, permission_verb_override: "approve_conflict_check", is_terminal: true, description: "No conflict found; matter may advance to engagement.", domain_module_id: M_INTAKE },
  { data_object_id: DO_CONFLICT, state_name: "flagged",   state_order: 4, requires_permission: true, permission_verb_override: "flag_conflict", description: "Potential conflict identified; awaiting partner review or ethics-wall decision.", domain_module_id: M_INTAKE },
  { data_object_id: DO_CONFLICT, state_name: "waived",    state_order: 5, requires_permission: true, permission_verb_override: "waive_conflict", is_terminal: true, description: "Conflict waived after written client consent. Matter may advance.", domain_module_id: M_INTAKE },
  { data_object_id: DO_CONFLICT, state_name: "declined",  state_order: 6, requires_permission: true, permission_verb_override: "decline_matter", is_terminal: true, description: "Conflict prevents representation; matter declined.", domain_module_id: M_INTAKE },
  // engagement_letters
  { data_object_id: DO_ENG_LETTER, state_name: "drafted",    state_order: 1, is_initial: true, description: "Engagement letter drafted from template; not yet sent to client.", domain_module_id: M_INTAKE },
  { data_object_id: DO_ENG_LETTER, state_name: "sent",       state_order: 2, requires_permission: true, permission_verb_override: "send_engagement_letter", description: "Sent to client for review and e-signature.", domain_module_id: M_INTAKE },
  { data_object_id: DO_ENG_LETTER, state_name: "signed",     state_order: 3, requires_permission: true, permission_verb_override: "sign_engagement_letter", description: "Client has e-signed; triggers retainer collection and matter activation.", domain_module_id: M_INTAKE },
  { data_object_id: DO_ENG_LETTER, state_name: "effective",  state_order: 4, description: "Engagement is in force; representation is active.", domain_module_id: M_INTAKE },
  { data_object_id: DO_ENG_LETTER, state_name: "expired",    state_order: 5, is_terminal: true, description: "Engagement has reached its end date or matter has closed.", domain_module_id: M_INTAKE },
  { data_object_id: DO_ENG_LETTER, state_name: "superseded", state_order: 6, is_terminal: true, description: "Replaced by a new engagement letter (scope change, fee restructure).", domain_module_id: M_INTAKE },
  // external_court_filings
  { data_object_id: DO_COURT_FILING, state_name: "drafted",   state_order: 1, is_initial: true, description: "Filing being prepared; not yet submitted to court.", domain_module_id: M_COURT },
  { data_object_id: DO_COURT_FILING, state_name: "submitted", state_order: 2, requires_permission: true, permission_verb_override: "submit_court_filing", description: "Filing submitted via ECF or in person; awaiting court acceptance.", domain_module_id: M_COURT },
  { data_object_id: DO_COURT_FILING, state_name: "accepted",  state_order: 3, description: "Court has accepted the filing; deadline clock starts.", domain_module_id: M_COURT },
  { data_object_id: DO_COURT_FILING, state_name: "rejected",  state_order: 4, is_terminal: true, description: "Court rejected the filing (defects, wrong court, missing exhibits). Re-draft required.", domain_module_id: M_COURT },
  { data_object_id: DO_COURT_FILING, state_name: "served",    state_order: 5, is_terminal: true, description: "Filing served on the opposing party; response-deadline calendar populated.", domain_module_id: M_COURT },
  // client_invoices
  { data_object_id: DO_CLIENT_INVOICE, state_name: "drafted",         state_order: 1, is_initial: true, description: "Invoice draft assembled from time and expense entries.", domain_module_id: M_BILLING },
  { data_object_id: DO_CLIENT_INVOICE, state_name: "prebill_review",  state_order: 2, requires_permission: true, permission_verb_override: "review_prebill", description: "Billing partner reviewing the prebill; can write down, transfer time, or annotate.", domain_module_id: M_BILLING },
  { data_object_id: DO_CLIENT_INVOICE, state_name: "issued",          state_order: 3, requires_permission: true, permission_verb_override: "issue_client_invoice", description: "Final invoice issued to client; AR posting and notification triggered.", domain_module_id: M_BILLING },
  { data_object_id: DO_CLIENT_INVOICE, state_name: "paid",            state_order: 4, is_terminal: true, description: "Invoice paid in full; cash receipt posted to AR and trust-to-operating transfer applied if from retainer.", domain_module_id: M_BILLING },
  { data_object_id: DO_CLIENT_INVOICE, state_name: "partially_paid",  state_order: 5, description: "Invoice partially paid; balance remains in AR.", domain_module_id: M_BILLING },
  { data_object_id: DO_CLIENT_INVOICE, state_name: "written_off",     state_order: 6, requires_permission: true, permission_verb_override: "write_off_invoice", is_terminal: true, description: "Invoice written off (uncollectible, ethics ruling, or fee-dispute settlement).", domain_module_id: M_BILLING },
];

const existingStates = await get(`/data_object_lifecycle_states?data_object_id=in.(${DO_MATTERS},${DO_TRUST},${DO_CONFLICT},${DO_ENG_LETTER},${DO_COURT_FILING},${DO_CLIENT_INVOICE})&select=data_object_id,state_name`);
const stateKey = (r: Row) => `${r.data_object_id}|${r.state_name}`;
const existingStateKeys = new Set(existingStates.map(stateKey));
// Normalize: every row gets the same keys so the JSON array shape is uniform (PostgREST rejects heterogeneous shapes with PGRST102).
const missingStates = states.filter(s => !existingStateKeys.has(stateKey(s))).map(s => ({
  data_object_id: s.data_object_id,
  state_name: s.state_name,
  state_order: s.state_order,
  description: s.description,
  is_initial: s.is_initial ?? false,
  is_terminal: s.is_terminal ?? false,
  requires_permission: s.requires_permission ?? false,
  permission_verb_override: s.permission_verb_override ?? "",
  domain_module_id: s.domain_module_id,
}));
if (missingStates.length) await insert("/data_object_lifecycle_states", missingStates);
console.log(`  ${missingStates.length} lifecycle states inserted (${existingStates.length} pre-existing)`);

// ============================================================
// 3. B6 intra-domain relationships + B7 users edges
// ============================================================
console.log("\n[3/5] B6 intra-domain + B7 users edges");
type RR = { data_object_id: number; related_data_object_id: number; relationship_verb: string; inverse_verb: string; relationship_type: string; relationship_kind: string; is_required: boolean; owner_side: string };
const rels: RR[] = [
  // intra-domain (legal_matters as hub)
  { data_object_id: DO_MATTERS, related_data_object_id: DO_ENG_LETTER,      relationship_verb: "originates_from", inverse_verb: "opens",         relationship_type: "one_to_one",   relationship_kind: "reference",  is_required: true,  owner_side: "source" },
  { data_object_id: DO_MATTERS, related_data_object_id: DO_CONFLICT,        relationship_verb: "has_many",       inverse_verb: "scoped_to",     relationship_type: "one_to_many",  relationship_kind: "composition", is_required: true,  owner_side: "source" },
  { data_object_id: DO_MATTERS, related_data_object_id: DO_COURT_FILING,    relationship_verb: "has_many",       inverse_verb: "filed_under",   relationship_type: "one_to_many",  relationship_kind: "composition", is_required: false, owner_side: "source" },
  { data_object_id: DO_MATTERS, related_data_object_id: DO_CLIENT_INVOICE,  relationship_verb: "has_many",       inverse_verb: "bills",         relationship_type: "one_to_many",  relationship_kind: "composition", is_required: true,  owner_side: "source" },
  { data_object_id: DO_MATTERS, related_data_object_id: DO_TRUST,           relationship_verb: "tracked_in",     inverse_verb: "holds_funds_for", relationship_type: "many_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },
  { data_object_id: DO_MATTERS, related_data_object_id: DO_TIME_ENTRIES,    relationship_verb: "accumulates",    inverse_verb: "logged_against", relationship_type: "one_to_many", relationship_kind: "composition", is_required: true,  owner_side: "source" },
  // conflict gate
  { data_object_id: DO_CONFLICT, related_data_object_id: DO_MATTERS,        relationship_verb: "clears",         inverse_verb: "gated_by",      relationship_type: "one_to_one",   relationship_kind: "reference",  is_required: true,  owner_side: "source" },
  // engagement supersedes / replaces
  { data_object_id: DO_ENG_LETTER, related_data_object_id: DO_ENG_LETTER,   relationship_verb: "supersedes",     inverse_verb: "superseded_by", relationship_type: "one_to_one",   relationship_kind: "reference",  is_required: false, owner_side: "source" },
  // invoice settles from trust
  { data_object_id: DO_CLIENT_INVOICE, related_data_object_id: DO_TRUST,    relationship_verb: "settles_from",   inverse_verb: "funds",         relationship_type: "many_to_many", relationship_kind: "association", is_required: false, owner_side: "source" },
  // invoice captures time entries
  { data_object_id: DO_CLIENT_INVOICE, related_data_object_id: DO_TIME_ENTRIES, relationship_verb: "captures",   inverse_verb: "billed_on",     relationship_type: "one_to_many",  relationship_kind: "composition", is_required: true,  owner_side: "source" },
  // (court_filing -> matter handled via the matter has_many court_filings row above; no separate inverse needed)
  // users edges (per Rule #10)
  { data_object_id: DO_USERS, related_data_object_id: DO_MATTERS,           relationship_verb: "leads_as_attorney", inverse_verb: "led_by",     relationship_type: "one_to_many",  relationship_kind: "association", is_required: true,  owner_side: "target" },
  { data_object_id: DO_USERS, related_data_object_id: DO_MATTERS,           relationship_verb: "supervises",     inverse_verb: "supervised_by", relationship_type: "one_to_many",  relationship_kind: "association", is_required: false, owner_side: "target" },
  { data_object_id: DO_USERS, related_data_object_id: DO_MATTERS,           relationship_verb: "bills_as_partner", inverse_verb: "billed_by",   relationship_type: "one_to_many",  relationship_kind: "association", is_required: true,  owner_side: "target" },
  { data_object_id: DO_USERS, related_data_object_id: DO_CONFLICT,          relationship_verb: "requests",       inverse_verb: "requested_by",  relationship_type: "one_to_many",  relationship_kind: "association", is_required: true,  owner_side: "target" },
  { data_object_id: DO_USERS, related_data_object_id: DO_CONFLICT,          relationship_verb: "reviews_as_partner", inverse_verb: "reviewed_by", relationship_type: "one_to_many", relationship_kind: "association", is_required: false, owner_side: "target" },
  { data_object_id: DO_USERS, related_data_object_id: DO_ENG_LETTER,        relationship_verb: "drafts",         inverse_verb: "drafted_by",    relationship_type: "one_to_many",  relationship_kind: "association", is_required: true,  owner_side: "target" },
  { data_object_id: DO_USERS, related_data_object_id: DO_ENG_LETTER,        relationship_verb: "signs_as_partner", inverse_verb: "signed_by",   relationship_type: "one_to_many",  relationship_kind: "association", is_required: true,  owner_side: "target" },
  { data_object_id: DO_USERS, related_data_object_id: DO_TRUST,             relationship_verb: "manages_as_bookkeeper", inverse_verb: "managed_by", relationship_type: "one_to_many", relationship_kind: "association", is_required: true,  owner_side: "target" },
  { data_object_id: DO_USERS, related_data_object_id: DO_COURT_FILING,      relationship_verb: "files",          inverse_verb: "filed_by",      relationship_type: "one_to_many",  relationship_kind: "association", is_required: true,  owner_side: "target" },
  { data_object_id: DO_USERS, related_data_object_id: DO_CLIENT_INVOICE,    relationship_verb: "prepares",       inverse_verb: "prepared_by",   relationship_type: "one_to_many",  relationship_kind: "association", is_required: true,  owner_side: "target" },
  { data_object_id: DO_USERS, related_data_object_id: DO_CLIENT_INVOICE,    relationship_verb: "approves_as_partner", inverse_verb: "approved_by", relationship_type: "one_to_many", relationship_kind: "association", is_required: true,  owner_side: "target" },
  { data_object_id: DO_USERS, related_data_object_id: DO_TIME_ENTRIES,      relationship_verb: "logs_as_timekeeper", inverse_verb: "logged_by",  relationship_type: "one_to_many",  relationship_kind: "association", is_required: true,  owner_side: "target" },
];

// Idempotency key for relationships
const allMasters = [DO_MATTERS, DO_TRUST, DO_CONFLICT, DO_ENG_LETTER, DO_COURT_FILING, DO_CLIENT_INVOICE, DO_USERS, DO_TIME_ENTRIES, DO_CRM_CONTACTS, DO_LEGAL_CONTRACTS];
const existingRels = await get(`/data_object_relationships?data_object_id=in.(${allMasters.join(",")})&select=data_object_id,related_data_object_id,relationship_verb`);
const relKey = (r: Row) => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`;
const existingRelKeys = new Set(existingRels.map(relKey));
const missingRels = rels.filter(r => !existingRelKeys.has(relKey(r)));
if (missingRels.length) await insert("/data_object_relationships", missingRels);
console.log(`  ${missingRels.length} relationships inserted (${existingRels.length} pre-existing)`);

// ============================================================
// 4. B10b backfill: source_domain_module_id on outbound handoffs
// ============================================================
console.log("\n[4/5] B10b: backfill handoff module FKs");
// Map: trigger_event.data_object_id -> source_module
// engagement_letter.signed (394) -> M_INTAKE
// trust_account.exception (392) -> M_TRUST
// legal_matter.closed (391) -> M_MATTER
// court_filing.served (738) -> M_COURT
// client_invoice.paid (739) -> M_BILLING
// court_filing.submitted (738) -> M_COURT
// client_invoice.issued (739) -> M_BILLING
const dataObjectToModule: Record<number, number> = {
  [DO_MATTERS]: M_MATTER,
  [DO_TRUST]: M_TRUST,
  [DO_CONFLICT]: M_INTAKE,
  [DO_ENG_LETTER]: M_INTAKE,
  [DO_COURT_FILING]: M_COURT,
  [DO_CLIENT_INVOICE]: M_BILLING,
};

const outbound = await get(`/handoffs?source_domain_id=eq.150&select=id,trigger_event_id,target_domain_id,target_domain_module_id,source_domain_module_id,trigger_event:trigger_events(data_object_id)`);
let srcPatched = 0, tgtPatched = 0;
for (const h of outbound) {
  const trigDoId = Number((h.trigger_event as Row).data_object_id);
  const srcMod = dataObjectToModule[trigDoId];
  if (srcMod && h.source_domain_module_id == null) {
    await patch(`/handoffs?id=eq.${h.id}`, { source_domain_module_id: srcMod });
    srcPatched++;
  }
  // CLM target (target_domain_id=26) -> CLM-AUTHORING (id 125)
  if (Number(h.target_domain_id) === 26 && h.target_domain_module_id == null) {
    await patch(`/handoffs?id=eq.${h.id}`, { target_domain_module_id: CLM_AUTHORING_MODULE });
    tgtPatched++;
  }
  // Annotate NULL target_domain_module_id for non-modularized counterparties
  if (Number(h.target_domain_id) !== 26 && h.target_domain_module_id == null) {
    // existing notes preserved; we don't overwrite, just add a marker
    const tDomCode = await get(`/domains?id=eq.${h.target_domain_id}&select=domain_code`);
    const code = (tDomCode[0] as Row).domain_code as string;
    const tag = `target NULL until ${code} is modularized`;
    const row = await get(`/handoffs?id=eq.${h.id}&select=notes`);
    const existingNotes = String((row[0] as Row).notes || "");
    if (!existingNotes.includes(tag)) {
      const newNotes = existingNotes ? `${existingNotes} | ${tag}` : tag;
      await patch(`/handoffs?id=eq.${h.id}`, { notes: newNotes });
    }
  }
}
console.log(`  source_domain_module_id patched on ${srcPatched} rows; target_domain_module_id patched on ${tgtPatched} (CLM only)`);

// ============================================================
// 5. Verification summary
// ============================================================
console.log("\n[5/5] verification");
const finalStates = await get(`/data_object_lifecycle_states?data_object_id=in.(${DO_MATTERS},${DO_TRUST},${DO_CONFLICT},${DO_ENG_LETTER},${DO_COURT_FILING},${DO_CLIENT_INVOICE})&select=id`);
const finalAliases = await get(`/data_object_aliases?data_object_id=in.(${DO_MATTERS},${DO_TRUST},${DO_CONFLICT},${DO_ENG_LETTER},${DO_COURT_FILING},${DO_CLIENT_INVOICE})&select=id`);
const finalRels = await get(`/data_object_relationships?or=(data_object_id.in.(${allMasters.join(",")}),related_data_object_id.in.(${allMasters.join(",")}))&select=id`);
console.log(`  lifecycle_states=${finalStates.length}, aliases=${finalAliases.length}, relationships=${finalRels.length}`);
console.log("\nPhase B load complete.");
console.log("UI: https://tests.semantius.app/domain_map/data_object_lifecycle_states");
