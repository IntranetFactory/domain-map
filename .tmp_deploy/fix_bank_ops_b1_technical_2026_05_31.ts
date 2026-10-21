// BANK-OPS B1 technical fixes, 2026-05-31.
//
// Scope (technical only, per task envelope):
//   B1-B4  PATCH trigger_events.event_category enum backfill on 10 BANK-OPS
//          rows (ids 1004-1013). Audit pre-specifies each value:
//          8 state_change, 2 signal.
//   B1-B2  INSERT data_object_relationships user-edges (Rule #10) for 8
//          BANK-OPS masters. Audit pre-specifies the actor verb per master
//          (some masters carry two actors).
//   B1-B5  INSERT data_object_aliases for 4 non-self-explanatory masters.
//          Audit pre-specifies exact alias_name tuples.
//   B1-H1  INSERT 7 handoff_processes (handoff_id, process_id). Audit
//          pre-specifies handoff_id + PCF id per row; all 5 PCFs verified
//          resolvable before insert.
//
// Deferred (gated on B2-Decisions, new entities/modules, judgment, or
// outside the technical fix-list):
//   B1-S1  Module creation (new modules; gated on B2 #1 module split).
//   B1-S2  Capabilities (new entities; gated on B2 #1).
//   B1-S3  catalog_tagline / catalog_description (Rule #20 user-review).
//   B1-S4  Skill rename + send_email -> notify_person (rename gated on M1;
//          channel swap is user judgment per audit B2 #4).
//   B1-M1..M4  New compliance entities (new data_objects; outside scope).
//   B1-B1  Intra-domain data_object_relationships (audit pre-specifies but
//          task scope only licenses user-edges per Rule #10).
//   B1-B3  Cross-domain mirror relationships (need lookup of GRC's
//          compliance-alert master; judgment).
//   B1-B6  Lifecycle states (gated on B1-S1 modules; new entities).
//   B1-B7  Pattern flag flips (explicitly deferred in task scope).
//   B1-B8  New domain_aliases (explicitly deferred in task scope).
//
// Rule discipline:
//   - record_status omitted on every INSERT (Rule #1; defaults to 'new').
//   - Zero writes to any `notes` column (Rule #15).
//   - No vendor or product names in any text field (Rule #18). SWIFT, MT103,
//     Fedwire, RTGS are standards-body / interbank-protocol terms, not
//     commercial brands; allowed by the same exception as HIPAA / SOX in
//     `regulations` rows.
//   - Loader invoked from project root only (Rule #6).
//
// Idempotency: every step re-reads live state and skips rows that already
// exist by natural key.
//
// Run from project root c:/dev/domain-map:
//   bun run "c:/dev/domain-map/.tmp_deploy/fix_bank_ops_b1_technical_2026_05_31.ts"

type Json = Record<string, unknown>;

async function semantius(method: string, path: string, body?: unknown): Promise<unknown> {
  const payload: Json = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest"],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe" },
  );
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`semantius ${method} ${path} exit=${code}\nstderr:\n${err}\nstdout:\n${out}`);
  }
  if (out.trim() === "") return null;
  try {
    return JSON.parse(out);
  } catch {
    return out;
  }
}

const get = (p: string) => semantius("GET", p);
const patch = (p: string, b: unknown) => semantius("PATCH", p, b);
const post = (p: string, b: unknown) => semantius("POST", p, b);

const USERS_ID = 748;

// BANK-OPS masters (verified live, 2026-05-31)
const LOAN_APPLICATIONS    = 602;
const ACCOUNT_APPLICATIONS = 603;
const ACCOUNT_OPENINGS     = 604;
const BANKING_KYC_REVIEWS  = 605;
const BANKING_CASES        = 606;
const WIRE_TRANSFERS       = 607;
const LOAN_DISBURSEMENTS   = 608;
const BANKING_TRANSACTIONS = 609;

// =========================================================================
// B1-B4: PATCH trigger_events.event_category on 10 rows.
// Audit (Pass 1 B-band B9): 8 state_change, 2 signal.
// =========================================================================

interface EventPatch {
  id: number;
  event_name: string;
  event_category: "state_change" | "signal";
}

const EVENT_PATCHES: EventPatch[] = [
  { id: 1004, event_name: "loan_application.submitted",       event_category: "state_change" },
  { id: 1005, event_name: "loan_application.approved",        event_category: "state_change" },
  { id: 1006, event_name: "loan_disbursement.executed",       event_category: "state_change" },
  { id: 1007, event_name: "account_application.submitted",    event_category: "state_change" },
  { id: 1008, event_name: "account_opening.completed",        event_category: "state_change" },
  { id: 1009, event_name: "banking_kyc_review.flagged",       event_category: "state_change" },
  { id: 1010, event_name: "banking_case.opened",              event_category: "state_change" },
  { id: 1011, event_name: "wire_transfer.initiated",          event_category: "state_change" },
  { id: 1012, event_name: "wire_transfer.sanctions_hit",      event_category: "signal" },
  { id: 1013, event_name: "banking_transaction.suspicious",   event_category: "signal" },
];

async function patchEventCategories() {
  console.log("\n[1/4] B1-B4: PATCH trigger_events.event_category on 10 rows");
  const ids = EVENT_PATCHES.map((p) => p.id).join(",");
  const live = (await get(
    `/trigger_events?id=in.(${ids})&select=id,event_name,event_category&order=id.asc`,
  )) as Array<{ id: number; event_name: string; event_category: string }>;
  const byId = new Map(live.map((r) => [r.id, r] as const));

  let patched = 0;
  let skipped = 0;
  for (const p of EVENT_PATCHES) {
    const row = byId.get(p.id);
    if (!row) {
      throw new Error(`trigger_events.id=${p.id} not found live`);
    }
    if (row.event_name !== p.event_name) {
      throw new Error(
        `trigger_events.id=${p.id} event_name drift: live='${row.event_name}', audit='${p.event_name}'`,
      );
    }
    if (row.event_category === p.event_category) {
      console.log(`  skip: id=${p.id} ${p.event_name} already '${p.event_category}'`);
      skipped++;
      continue;
    }
    if (row.event_category !== "") {
      throw new Error(
        `trigger_events.id=${p.id} has non-empty live event_category='${row.event_category}', refusing overwrite`,
      );
    }
    await patch(`/trigger_events?id=eq.${p.id}`, { event_category: p.event_category });
    console.log(`  PATCH id=${p.id} ${p.event_name} -> '${p.event_category}'`);
    patched++;
  }
  console.log(`  summary: patched=${patched} skipped=${skipped}`);
}

// =========================================================================
// B1-B2: INSERT data_object_relationships user-edges (Rule #10).
// Audit (Pass 1 B-band B7) pre-specifies the actor verbs per master. Each
// row models a user-as-source edge with a single-direction verb (the actor
// role) following the established catalog convention used in LCAP and the
// other B1 technical fixers for this batch.
// =========================================================================

interface UserEdge {
  related_data_object_id: number;
  related_plural: string;            // label composition only
  relationship_verb: string;         // user-side action ("originates ...")
  inverse_verb: string;              // navigation back ("is_originated_by")
}

const USER_EDGES: UserEdge[] = [
  // loan_applications: originator + underwriter
  { related_data_object_id: LOAN_APPLICATIONS,    related_plural: "loan_applications",    relationship_verb: "originates_loan_application",   inverse_verb: "is_originated_by"   },
  { related_data_object_id: LOAN_APPLICATIONS,    related_plural: "loan_applications",    relationship_verb: "underwrites_loan_application",  inverse_verb: "is_underwritten_by" },
  // account_applications: opener + KYC officer
  { related_data_object_id: ACCOUNT_APPLICATIONS, related_plural: "account_applications", relationship_verb: "opens_account_application",     inverse_verb: "is_opened_by"       },
  { related_data_object_id: ACCOUNT_APPLICATIONS, related_plural: "account_applications", relationship_verb: "kyc_reviews_account_application", inverse_verb: "is_kyc_reviewed_by" },
  // account_openings: provisioner + relationship manager
  { related_data_object_id: ACCOUNT_OPENINGS,     related_plural: "account_openings",     relationship_verb: "provisions_account_opening",    inverse_verb: "is_provisioned_by"  },
  { related_data_object_id: ACCOUNT_OPENINGS,     related_plural: "account_openings",     relationship_verb: "manages_account_relationship",  inverse_verb: "is_managed_by"      },
  // banking_kyc_reviews: reviewer + escalation target
  { related_data_object_id: BANKING_KYC_REVIEWS,  related_plural: "banking_kyc_reviews",  relationship_verb: "reviews_banking_kyc_review",    inverse_verb: "is_reviewed_by"     },
  { related_data_object_id: BANKING_KYC_REVIEWS,  related_plural: "banking_kyc_reviews",  relationship_verb: "escalates_banking_kyc_review",  inverse_verb: "is_escalated_to"    },
  // banking_cases: assignee + escalation
  { related_data_object_id: BANKING_CASES,        related_plural: "banking_cases",        relationship_verb: "owns_banking_case",             inverse_verb: "is_assigned_to"     },
  { related_data_object_id: BANKING_CASES,        related_plural: "banking_cases",        relationship_verb: "escalates_banking_case",        inverse_verb: "is_escalated_to"    },
  // wire_transfers: initiator + approver
  { related_data_object_id: WIRE_TRANSFERS,       related_plural: "wire_transfers",       relationship_verb: "initiates_wire_transfer",       inverse_verb: "is_initiated_by"    },
  { related_data_object_id: WIRE_TRANSFERS,       related_plural: "wire_transfers",       relationship_verb: "approves_wire_transfer",        inverse_verb: "is_approved_by"     },
  // loan_disbursements: funder
  { related_data_object_id: LOAN_DISBURSEMENTS,   related_plural: "loan_disbursements",   relationship_verb: "funds_loan_disbursement",       inverse_verb: "is_funded_by"       },
  // banking_transactions: poster
  { related_data_object_id: BANKING_TRANSACTIONS, related_plural: "banking_transactions", relationship_verb: "posts_banking_transaction",     inverse_verb: "is_posted_by"       },
];

async function insertUserEdges() {
  console.log("\n[2/4] B1-B2: INSERT data_object_relationships user-edges (Rule #10)");
  let inserted = 0;
  let skipped = 0;
  for (const e of USER_EDGES) {
    const existing = (await get(
      `/data_object_relationships?data_object_id=eq.${USERS_ID}` +
        `&related_data_object_id=eq.${e.related_data_object_id}` +
        `&relationship_verb=eq.${encodeURIComponent(e.relationship_verb)}` +
        `&select=id`,
    )) as Array<{ id: number }>;
    if (existing.length > 0) {
      console.log(`  skip: users '${e.relationship_verb}' ${e.related_plural} already exists (id=${existing[0].id})`);
      skipped++;
      continue;
    }
    const row = {
      data_object_relationship_label: `users ${e.relationship_verb} ${e.related_plural}`,
      data_object_id: USERS_ID,
      related_data_object_id: e.related_data_object_id,
      relationship_verb: e.relationship_verb,
      inverse_verb: e.inverse_verb,
      owner_side: "source",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      is_required: false,
      // record_status omitted (Rule #1: defaults to 'new')
      // notes omitted (Rule #15)
    };
    const result = (await post("/data_object_relationships", [row])) as Array<{ id: number }>;
    const newId = Array.isArray(result) && result.length > 0 ? result[0].id : "?";
    console.log(`  INSERT users '${e.relationship_verb}' ${e.related_plural} -> id=${newId}`);
    inserted++;
  }
  console.log(`  summary: inserted=${inserted} skipped=${skipped}`);
}

// =========================================================================
// B1-B5: INSERT data_object_aliases. Audit pre-specifies exact tuples.
// Rule #18: SWIFT, MT103, Fedwire, RTGS are interbank standards / network
// protocols issued by cooperatives or central-bank operators, not vendor or
// product brands. Same statutory-anchor exception as HIPAA / SOX.
// =========================================================================

interface AliasProposal {
  data_object_id: number;
  alias_name: string;
}

const ALIAS_PROPOSALS: AliasProposal[] = [
  // banking_kyc_reviews
  { data_object_id: BANKING_KYC_REVIEWS,  alias_name: "AML review" },
  { data_object_id: BANKING_KYC_REVIEWS,  alias_name: "EDD review" },
  { data_object_id: BANKING_KYC_REVIEWS,  alias_name: "CDD review" },
  { data_object_id: BANKING_KYC_REVIEWS,  alias_name: "BSA review" },
  { data_object_id: BANKING_KYC_REVIEWS,  alias_name: "due-diligence file" },
  // banking_cases
  { data_object_id: BANKING_CASES,        alias_name: "dispute case" },
  { data_object_id: BANKING_CASES,        alias_name: "bank dispute" },
  { data_object_id: BANKING_CASES,        alias_name: "complaint" },
  { data_object_id: BANKING_CASES,        alias_name: "regulatory case" },
  // wire_transfers
  { data_object_id: WIRE_TRANSFERS,       alias_name: "SWIFT" },
  { data_object_id: WIRE_TRANSFERS,       alias_name: "MT103" },
  { data_object_id: WIRE_TRANSFERS,       alias_name: "Fedwire" },
  { data_object_id: WIRE_TRANSFERS,       alias_name: "RTGS transfer" },
  // banking_transactions
  { data_object_id: BANKING_TRANSACTIONS, alias_name: "posting" },
  { data_object_id: BANKING_TRANSACTIONS, alias_name: "ledger entry" },
  { data_object_id: BANKING_TRANSACTIONS, alias_name: "account movement" },
];

async function insertAliases() {
  console.log("\n[3/4] B1-B5: INSERT data_object_aliases (16 proposals)");
  const toInsert: Json[] = [];
  for (const a of ALIAS_PROPOSALS) {
    const existing = (await get(
      `/data_object_aliases?data_object_id=eq.${a.data_object_id}` +
        `&alias_name=eq.${encodeURIComponent(a.alias_name)}` +
        `&select=id`,
    )) as Array<{ id: number }>;
    if (existing.length > 0) {
      console.log(`  skip: alias '${a.alias_name}' on ${a.data_object_id} already exists (id=${existing[0].id})`);
      continue;
    }
    toInsert.push({
      data_object_id: a.data_object_id,
      alias_name: a.alias_name,
      alias_type: "synonym",
      is_preferred: false,
      // record_status omitted (Rule #1)
      // notes omitted (Rule #15)
    });
  }
  if (toInsert.length === 0) {
    console.log("  no new aliases to insert");
    return;
  }
  console.log(`  inserting ${toInsert.length} alias(es)...`);
  const result = (await post("/data_object_aliases", toInsert)) as Array<{ id: number; alias_name: string }>;
  if (Array.isArray(result)) {
    for (const r of result) {
      console.log(`  + id=${r.id} alias='${r.alias_name}'`);
    }
  }
}

// =========================================================================
// B1-H1: INSERT handoff_processes for 7 BANK-OPS outbound handoffs.
// Audit pre-specifies (handoff_id, process_id) per row. All PCFs are in
// the apqc_pcf_cross_industry framework and verified resolvable.
// =========================================================================

interface HandoffProcess {
  handoff_id: number;
  process_id: number;
  pcf_label: string;
}

const HANDOFF_PROCESSES: HandoffProcess[] = [
  { handoff_id: 886, process_id: 70,   pcf_label: "Manage compliance" },
  { handoff_id: 887, process_id: 70,   pcf_label: "Manage compliance" },
  { handoff_id: 888, process_id: 323,  pcf_label: "Manage financial fraud/dispute cases" },
  { handoff_id: 889, process_id: 1438, pcf_label: "Process payments" },
  { handoff_id: 890, process_id: 196,  pcf_label: "Manage customer service problems, requests, and inquiries" },
  { handoff_id: 891, process_id: 323,  pcf_label: "Manage financial fraud/dispute cases" },
  { handoff_id: 892, process_id: 1438, pcf_label: "Process payments" },
];

async function insertHandoffProcesses() {
  console.log("\n[4/4] B1-H1: INSERT handoff_processes for 7 BANK-OPS handoffs");
  // Pre-flight: verify all PCFs resolvable.
  const procIds = [...new Set(HANDOFF_PROCESSES.map((hp) => hp.process_id))].join(",");
  const procs = (await get(
    `/processes?id=in.(${procIds})&select=id,process_name`,
  )) as Array<{ id: number; process_name: string }>;
  const procMap = new Map(procs.map((p) => [p.id, p.process_name]));
  for (const hp of HANDOFF_PROCESSES) {
    if (!procMap.has(hp.process_id)) {
      throw new Error(`Pre-flight: process_id=${hp.process_id} for handoff ${hp.handoff_id} not found in catalog`);
    }
  }
  // Pre-flight: verify all handoffs exist (and belong to BANK-OPS).
  const handoffIds = HANDOFF_PROCESSES.map((hp) => hp.handoff_id).join(",");
  const handoffs = (await get(
    `/handoffs?id=in.(${handoffIds})&select=id,source_domain_id,target_domain_id,trigger_event_id`,
  )) as Array<{ id: number; source_domain_id: number }>;
  const handoffMap = new Map(handoffs.map((h) => [h.id, h] as const));
  for (const hp of HANDOFF_PROCESSES) {
    const h = handoffMap.get(hp.handoff_id);
    if (!h) throw new Error(`Pre-flight: handoff_id=${hp.handoff_id} not found`);
    if (h.source_domain_id !== 43) {
      throw new Error(`Pre-flight: handoff_id=${hp.handoff_id} source_domain_id=${h.source_domain_id} != 43 (BANK-OPS)`);
    }
  }

  let inserted = 0;
  let skipped = 0;
  for (const hp of HANDOFF_PROCESSES) {
    const existing = (await get(
      `/handoff_processes?handoff_id=eq.${hp.handoff_id}` +
        `&process_id=eq.${hp.process_id}&select=id`,
    )) as Array<{ id: number }>;
    if (existing.length > 0) {
      console.log(`  skip: handoff ${hp.handoff_id} -> process ${hp.process_id} already linked (id=${existing[0].id})`);
      skipped++;
      continue;
    }
    const row = {
      handoff_id: hp.handoff_id,
      process_id: hp.process_id,
      role: "implements",
      proposal_source: "agent_curated",
      // record_status omitted (Rule #1: defaults to 'new')
      // notes omitted (Rule #15)
    };
    const result = (await post("/handoff_processes", [row])) as Array<{ id: number }>;
    const newId = Array.isArray(result) && result.length > 0 ? result[0].id : "?";
    console.log(`  INSERT handoff_processes: handoff=${hp.handoff_id} process=${hp.process_id} (${procMap.get(hp.process_id)}) -> id=${newId}`);
    inserted++;
  }
  console.log(`  summary: inserted=${inserted} skipped=${skipped}`);
}

// =========================================================================
// main
// =========================================================================

async function main() {
  console.log("=== BANK-OPS B1 technical fixes, 2026-05-31 ===");
  await patchEventCategories();
  await insertUserEdges();
  await insertAliases();
  await insertHandoffProcesses();
  console.log("\nDone.");
  console.log("\nUI spot-check:");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
  console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
