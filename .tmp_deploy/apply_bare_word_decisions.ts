#!/usr/bin/env bun
// apply_bare_word_decisions.ts — Step 4 task 3 of plan-domain-fact-sheets.md.
//
// Batch executor for the bare-word triage. Reads decisions from the two
// inline tables below (RENAMES + CANONICALS), pre-flights every rename
// against the live catalog as a whole (no writes), then either prints the
// plan and exits (dry-run) or applies the batch atomically per row.
//
// Source of truth for the decisions is .tmp_deploy/bare_word_proposal.md.
// Inlining the lists here (rather than parsing the markdown) keeps the
// executor auditable as a self-contained artifact and avoids brittle
// markdown parsing.
//
// Usage:
//   bun run c:/dev/domain-map/.tmp_deploy/apply_bare_word_decisions.ts          # dry-run
//   bun run c:/dev/domain-map/.tmp_deploy/apply_bare_word_decisions.ts --execute # apply

export {};

import { argv } from "node:process";

const EXECUTE = argv.includes("--execute");

console.log(`mode: ${EXECUTE ? "EXECUTE (writes)" : "DRY-RUN (no writes)"}`);
console.log();

// ---------------------------------------------------------------------------
// Decisions (from .tmp_deploy/bare_word_proposal.md, sign-off 2026-05-22)
// ---------------------------------------------------------------------------

type Rename = { id: number; old: string; new: string };

const RENAMES: Rename[] = [
  { id: 85,  old: "alerts",         new: "monitoring_alerts" },
  { id: 4,   old: "applications",   new: "job_applications" },
  { id: 10,  old: "assessments",    new: "candidate_assessments" },
  { id: 38,  old: "budgets",        new: "financial_budgets" },
  { id: 121, old: "cadences",       new: "sales_cadences" },
  { id: 116, old: "campaigns",      new: "marketing_campaigns" },
  { id: 171, old: "certifications", new: "learner_certifications" },
  { id: 50,  old: "changes",        new: "service_changes" },
  { id: 471, old: "connectors",     new: "integration_connectors" },
  { id: 98,  old: "contacts",       new: "crm_contacts" },
  { id: 66,  old: "contracts",      new: "legal_contracts" },
  { id: 283, old: "controls",       new: "compliance_controls" },
  { id: 429, old: "documents",      new: "content_documents" },
  { id: 371, old: "drivers",        new: "fleet_drivers" },
  { id: 84,  old: "events",         new: "monitoring_events" },
  { id: 443, old: "experiences",    new: "digital_experiences" },
  { id: 486, old: "fields",         new: "farm_fields" },
  { id: 39,  old: "forecasts",      new: "financial_forecasts" },
  { id: 120, old: "forms",          new: "marketing_forms" },
  { id: 47,  old: "incidents",      new: "service_incidents" },
  { id: 75,  old: "invoices",       new: "supplier_invoices" },
  { id: 289, old: "issues",         new: "audit_issues" },
  { id: 99,  old: "leads",          new: "crm_leads" },
  { id: 345, old: "leases",         new: "property_leases" },
  { id: 11,  old: "offers",         new: "job_offers" },
  { id: 100, old: "opportunities",  new: "crm_opportunities" },
  { id: 381, old: "orders",         new: "commerce_orders" },
  { id: 285, old: "policies",       new: "compliance_policies" },
  { id: 273, old: "portfolios",     new: "strategic_portfolios" },
  { id: 32,  old: "positions",      new: "hcm_positions" },
  { id: 49,  old: "problems",       new: "service_problems" },
  { id: 384, old: "products",       new: "commerce_products" },
  { id: 216, old: "projects",       new: "service_projects" },
  { id: 416, old: "quotes",         new: "sales_quotes" },
  { id: 6,   old: "referrals",      new: "candidate_referrals" },
  { id: 480, old: "retainers",      new: "agency_retainers" },
  { id: 282, old: "risks",          new: "compliance_risks" },
  { id: 161, old: "shifts",         new: "work_shifts" },
  { id: 389, old: "shipments",      new: "commerce_shipments" },
  { id: 53,  old: "slas",           new: "service_slas" },
  { id: 347, old: "spaces",         new: "property_spaces" },
  { id: 385, old: "storefronts",    new: "commerce_storefronts" },
  { id: 370, old: "vehicles",       new: "fleet_vehicles" },
];

type Canonical = { id: number; name: string; rationale: string };

const CANONICALS: Canonical[] = [
  { id: 3,   name: "candidates",   rationale: "ATS owns 'candidates' as the canonical job-applicant concept in business software." },
  { id: 383, name: "carts",        rationale: "B2C commerce owns 'carts' as the canonical shopping-cart concept." },
  { id: 386, name: "checkouts",    rationale: "B2C commerce owns 'checkouts' as the canonical purchase-flow concept." },
  { id: 390, name: "coupons",      rationale: "B2C commerce owns 'coupons' as the canonical discount-code concept." },
  { id: 167, name: "courses",      rationale: "LMS owns 'courses' as the canonical training-course concept. No competing meaning in business software." },
  { id: 97,  name: "customers",    rationale: "Customer is the unambiguous canonical term across business software. Multi-master is a metadata reality (federated across CRM-sales / CDP-marketing / CSM-success / MDM-golden-record / SUB-MGMT-subscription views), not a naming problem; future master-data promotion to a shared module is an orthogonal deployer concern." },
  { id: 31,  name: "employees",    rationale: "Employee is the unambiguous canonical term across business software. Multi-master is a metadata reality (HCM system-of-record + slices held by MDM/PAYROLL/IGA + embedded_master in ATS/BEN-ADMIN/COMP-MGMT/EMP-EXP/LMS/ONBOARDING/TALENT-MGMT/WFM), not a naming problem." },
  { id: 251, name: "envelopes",    rationale: "E-signature platforms own 'envelopes' as the canonical signature-package concept (DocuSign convention adopted industry-wide)." },
  { id: 388, name: "fulfillments", rationale: "B2C commerce owns 'fulfillments' as the canonical order-fulfillment concept." },
  { id: 130, name: "influencers",  rationale: "Social media management owns 'influencers' as the canonical creator-relationship concept. No competing meaning in business software." },
  { id: 8,   name: "interviews",   rationale: "ATS owns 'interviews' as the canonical hiring-interview concept in business software." },
  { id: 501, name: "milkings",     rationale: "Dairy management owns 'milkings' as the canonical milking-event concept. Domain-unique." },
  { id: 254, name: "ontologies",   rationale: "Data catalog/governance owns 'ontologies' as the canonical controlled-vocabulary concept." },
  { id: 206, name: "suppliers",    rationale: "Supplier is the unambiguous canonical term across business software. Multi-master is a metadata reality (SUP-LIFE lifecycle + MDM master record); staffing_suppliers is an HCM-side niche sibling that justifies its own prefix without dispossessing the bare term." },
];

// ---------------------------------------------------------------------------
// PostgREST helper
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

async function postgrest(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Row = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path}: ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

function singularize(plural: string): string {
  if (/ies$/.test(plural)) return plural.replace(/ies$/, "y");
  if (/(s|x|z|ch|sh)es$/.test(plural)) return plural.replace(/es$/, "");
  if (/s$/.test(plural)) return plural.replace(/s$/, "");
  return plural;
}

// ---------------------------------------------------------------------------
// Pre-flight — verify every row exists, no name collisions, no event collisions
// ---------------------------------------------------------------------------

console.log("PRE-FLIGHT");
console.log("==========");

// 1. Fetch every catalog row in one pass so we can validate cheaply
const allObjects: Row[] = (await postgrest(
  "GET",
  "/data_objects?select=id,data_object_name,is_canonical_bare_word,naming_authority_rationale&limit=5000",
)) ?? [];
const byId = new Map<number, Row>(allObjects.map((r) => [r.id as number, r]));
const byName = new Map<string, Row>(allObjects.map((r) => [String(r.data_object_name), r]));

const allEvents: Row[] = (await postgrest(
  "GET",
  "/trigger_events?select=id,event_name,data_object_id&limit=10000",
)) ?? [];
const eventsByName = new Map<string, Row>(allEvents.map((r) => [String(r.event_name), r]));

let preflightOk = true;

// Renames: source row exists with the expected old name; target name is free;
// each rewritten event_name is free (excluding the row being rewritten itself).
type RenamePlan = Rename & {
  events: Array<{ id: number; from: string; to: string; rewritten: boolean; warning?: string }>;
};
const renamePlans: RenamePlan[] = [];

for (const r of RENAMES) {
  const src = byId.get(r.id);
  const issues: string[] = [];

  if (!src) {
    issues.push(`id ${r.id} not found in data_objects`);
  } else if (String(src.data_object_name) !== r.old) {
    issues.push(`id ${r.id} expected name '${r.old}' but found '${src.data_object_name}'`);
  }

  const collide = byName.get(r.new);
  if (collide && (collide.id as number) !== r.id) {
    issues.push(`new name '${r.new}' is already taken by id=${collide.id}`);
  }

  const oldSing = singularize(r.old);
  const newSing = singularize(r.new);
  const relevantEvents = allEvents.filter((e) => (e.data_object_id as number) === r.id);
  const eventPlan: RenamePlan["events"] = [];
  for (const ev of relevantEvents) {
    const from = String(ev.event_name);
    const prefix = `${oldSing}.`;
    if (!from.startsWith(prefix)) {
      eventPlan.push({ id: ev.id as number, from, to: from, rewritten: false, warning: `does not start with '${prefix}' — left untouched` });
      continue;
    }
    const to = `${newSing}.${from.slice(prefix.length)}`;
    const existing = eventsByName.get(to);
    const isSelf = existing && (existing.id as number) === (ev.id as number);
    if (existing && !isSelf) {
      eventPlan.push({ id: ev.id as number, from, to, rewritten: true, warning: `collision with trigger_events.id=${existing.id}` });
      issues.push(`event '${to}' collides with id=${existing.id}`);
    } else {
      eventPlan.push({ id: ev.id as number, from, to, rewritten: true });
    }
  }

  if (issues.length > 0) {
    preflightOk = false;
    console.log(`  ✗ ${r.old} → ${r.new}`);
    for (const i of issues) console.log(`      ${i}`);
  } else {
    console.log(`  ✓ ${r.old} → ${r.new}  (${eventPlan.filter((e) => e.rewritten).length} trigger_events to rewrite)`);
  }
  renamePlans.push({ ...r, events: eventPlan });
}

// Canonicals: row exists with the expected name, currently flag=false.
for (const c of CANONICALS) {
  const src = byId.get(c.id);
  if (!src) {
    preflightOk = false;
    console.log(`  ✗ canonical ${c.name} (id ${c.id}) not found`);
    continue;
  }
  if (String(src.data_object_name) !== c.name) {
    preflightOk = false;
    console.log(`  ✗ canonical ${c.name} (id ${c.id}) name mismatch — found '${src.data_object_name}'`);
    continue;
  }
  if (src.is_canonical_bare_word === true) {
    console.log(`  · canonical ${c.name} already flagged — will refresh rationale only`);
  } else {
    console.log(`  ✓ canonical ${c.name}  (set flag + rationale)`);
  }
}

console.log();
console.log(`pre-flight: ${preflightOk ? "PASS" : "FAIL"}`);
console.log(`plan: ${RENAMES.length} renames, ${CANONICALS.length} canonical claims`);

if (!preflightOk) {
  console.error("\n✗ pre-flight failed — fix the issues above before running with --execute");
  process.exit(1);
}

if (!EXECUTE) {
  console.log("\n(dry-run — pass --execute to apply)");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Execute
// ---------------------------------------------------------------------------

console.log("\nEXECUTING");
console.log("=========");

let renamesDone = 0;
let eventsDone = 0;
for (const p of renamePlans) {
  await postgrest("PATCH", `/data_objects?id=eq.${p.id}`, { data_object_name: p.new });
  renamesDone++;
  for (const e of p.events) {
    if (!e.rewritten) continue;
    await postgrest("PATCH", `/trigger_events?id=eq.${e.id}`, { event_name: e.to });
    eventsDone++;
  }
  console.log(`  ✓ ${p.old} → ${p.new}  (+${p.events.filter((e) => e.rewritten).length} events)`);
}

let canonicalsDone = 0;
for (const c of CANONICALS) {
  await postgrest("PATCH", `/data_objects?id=eq.${c.id}`, {
    is_canonical_bare_word: true,
    naming_authority_rationale: c.rationale,
  });
  canonicalsDone++;
  console.log(`  ✓ canonical ${c.name}`);
}

console.log(`\n✓ batch complete: ${renamesDone} renames, ${eventsDone} trigger_events rewrites, ${canonicalsDone} canonical claims`);
