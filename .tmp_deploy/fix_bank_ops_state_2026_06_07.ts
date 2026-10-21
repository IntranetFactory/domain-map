#!/usr/bin/env bun
// State-driven execute pass for BANK-OPS (domain_id=43), 2026-06-07.
// Works ONLY the open state items that are independent of the (deferred) build:
//   1. entity_type classification (Rule #12) on the 8 BANK-OPS masters (all 'unclassified').
//   2. Catalog UX (Rule #20): author buyer-voice catalog_tagline + catalog_description on the
//      domain row, ONLY because both are empty (never overwrite a non-empty value).
//   3. B1A-B1: 7 intra-domain master-to-master data_object_relationships edges.
//   4. B1B-B8: 6 generic domain_aliases for BANK-OPS.
//
// UNBUILT-LEAVE discipline: this domain has 0 domain_modules and 0 capability_domains.
// We do NOT scaffold modules / capabilities / lifecycle states (those need realizing module FKs).
// All writes land at record_status='new' (omitted -> DB default 'new'). Idempotent.

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

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

const DOMAIN_ID = 43;

// Master ids resolved live by data_object_name (never hardcode unseen ids beyond verified set).
const MASTER_NAMES = [
  "loan_applications",
  "account_applications",
  "account_openings",
  "banking_kyc_reviews",
  "banking_cases",
  "wire_transfers",
  "loan_disbursements",
  "banking_transactions",
];

// ============================================================
// 0. Resolve master ids live
// ============================================================
const masterRows = await get(
  `/data_objects?data_object_name=in.(${MASTER_NAMES.join(",")})&select=id,data_object_name,entity_type`,
);
const id = new Map<string, number>();
const liveType = new Map<string, string>();
for (const r of masterRows) {
  id.set(String(r.data_object_name), Number(r.id));
  liveType.set(String(r.data_object_name), String(r.entity_type ?? ""));
}
for (const n of MASTER_NAMES) {
  if (!id.has(n)) throw new Error(`Master not found live: ${n}`);
}
console.log(`Resolved ${id.size}/${MASTER_NAMES.length} BANK-OPS masters.`);

// ============================================================
// 1. entity_type classification (Rule #12), idempotent (only PATCH if unclassified/empty)
// ============================================================
// 7 workflow-bearing masters carry approval/review/execution lifecycles -> operational_workflow.
// banking_transactions is an append-only posted ledger record (reconciliation status, no approval
// gate) -> operational_record (lifecycle states NOT required; B2-3 lifecycle SHAPE remains a user call).
const entityTypePlan: Record<string, string> = {
  loan_applications: "operational_workflow",
  account_applications: "operational_workflow",
  account_openings: "operational_workflow",
  banking_kyc_reviews: "operational_workflow",
  banking_cases: "operational_workflow",
  wire_transfers: "operational_workflow",
  loan_disbursements: "operational_workflow",
  banking_transactions: "operational_record",
};

let entityTypePatched = 0;
for (const [name, target] of Object.entries(entityTypePlan)) {
  const cur = liveType.get(name) ?? "";
  if (cur === "" || cur === "unclassified") {
    await patch(`/data_objects?id=eq.${id.get(name)}`, { entity_type: target });
    entityTypePatched++;
    console.log(`  entity_type ${name} -> ${target}`);
  } else {
    console.log(`  entity_type ${name} already '${cur}', skip`);
  }
}
console.log(`entity_type: ${entityTypePatched} PATCHed.`);

// ============================================================
// 2. Catalog UX (Rule #20): domain-row tagline + description, ONLY if empty
// ============================================================
const [domainRow] = await get(
  `/domains?id=eq.${DOMAIN_ID}&select=id,catalog_tagline,catalog_description`,
);
if (!domainRow) throw new Error("BANK-OPS domain row not found");

const taglineText =
  "Run the full banking back office from one workflow spine: open accounts, originate and disburse loans, clear KYC and sanctions checks, move money, and resolve customer disputes.";
const descriptionText =
  "Banking Operations gives retail and commercial banking teams a single place to take a customer from application to active account and from loan request to funded disbursement. Front-line staff capture account and loan applications, route them through identity, beneficial-ownership, and AML review, and track each request through its approval, decline, or funding decision with a clear audit trail.\n\n" +
  "Payment and money-movement work is first class: initiate wire transfers, screen them for sanctions and threshold-reporting triggers, and post the resulting transactions to the right accounts with reconciliation built in. When something goes wrong, open and work banking cases for disputes, fraud claims, account errors, and complaints, with assignment, SLA, and resolution tracking.\n\n" +
  "Compliance is woven through the workflow rather than bolted on, so KYC reviews, sanctions hits, and suspicious-activity signals are captured as the work happens and are ready to hand to your risk and finance teams.";

const catalogWrites: Row = {};
if ((domainRow.catalog_tagline ?? "") === "") catalogWrites.catalog_tagline = taglineText;
if ((domainRow.catalog_description ?? "") === "")
  catalogWrites.catalog_description = descriptionText;

let catalogPatched = 0;
if (Object.keys(catalogWrites).length > 0) {
  await patch(`/domains?id=eq.${DOMAIN_ID}`, catalogWrites);
  catalogPatched = Object.keys(catalogWrites).length;
  console.log(`Catalog UX: wrote ${Object.keys(catalogWrites).join(", ")} on domain ${DOMAIN_ID}.`);
} else {
  console.log("Catalog UX: both fields already non-empty, skip (no overwrite).");
}

// ============================================================
// 3. B1A-B1: 7 intra-domain master-to-master data_object_relationships
//    Idempotent by composed key (data_object_id, related_data_object_id, relationship_verb).
//    relationship_type enum: one_to_one | one_to_many | many_to_many (no many_to_one).
//    "requires banking_kyc_reviews" modeled one_to_one (each application has its own review).
// ============================================================
type RelSpec = {
  source: string;
  target: string;
  verb: string;
  inverse: string;
  cardinality: "one_to_one" | "one_to_many" | "many_to_many";
  required: boolean;
};
const relPlan: RelSpec[] = [
  { source: "loan_applications", target: "loan_disbursements", verb: "spawns", inverse: "originates_from", cardinality: "one_to_one", required: true },
  { source: "account_applications", target: "account_openings", verb: "spawns", inverse: "originates_from", cardinality: "one_to_one", required: true },
  { source: "loan_applications", target: "banking_kyc_reviews", verb: "requires", inverse: "supports", cardinality: "one_to_one", required: true },
  { source: "account_applications", target: "banking_kyc_reviews", verb: "requires", inverse: "supports", cardinality: "one_to_one", required: true },
  { source: "wire_transfers", target: "banking_transactions", verb: "logs", inverse: "records", cardinality: "one_to_many", required: true },
  { source: "loan_disbursements", target: "banking_transactions", verb: "logs", inverse: "records", cardinality: "one_to_one", required: true },
  { source: "banking_cases", target: "banking_transactions", verb: "references", inverse: "referenced_by", cardinality: "many_to_many", required: false },
];

const existingRels = await get(
  `/data_object_relationships?data_object_id=in.(${MASTER_NAMES.map(n => id.get(n)).join(",")})` +
    `&related_data_object_id=in.(${MASTER_NAMES.map(n => id.get(n)).join(",")})` +
    `&select=data_object_id,related_data_object_id,relationship_verb`,
);
const relKey = (a: number, b: number, v: string) => `${a}|${b}|${v}`;
const haveRel = new Set(
  existingRels.map(r =>
    relKey(Number(r.data_object_id), Number(r.related_data_object_id), String(r.relationship_verb)),
  ),
);

const relRows: Row[] = [];
for (const r of relPlan) {
  const a = id.get(r.source)!;
  const b = id.get(r.target)!;
  if (haveRel.has(relKey(a, b, r.verb))) {
    console.log(`  rel ${r.source} ${r.verb} ${r.target} already present, skip`);
    continue;
  }
  relRows.push({
    data_object_id: a,
    related_data_object_id: b,
    owner_side: "source",
    relationship_type: r.cardinality,
    relationship_kind: "reference",
    relationship_verb: r.verb,
    inverse_verb: r.inverse,
    is_required: r.required,
  });
}
if (relRows.length > 0) {
  await insert("/data_object_relationships", relRows);
}
console.log(`Intra-domain relationships: ${relRows.length} INSERTed (${haveRel.size} pre-existing master-pairs).`);

// ============================================================
// 4. B1B-B8: 6 generic domain_aliases for BANK-OPS, idempotent by alias text
//    Columns: domain_id, label (required), alias (required), alias_type (default synonym).
// ============================================================
const aliasList = [
  "banking operations",
  "retail banking ops",
  "commercial banking ops",
  "deposit operations",
  "core banking ops",
  "bank back-office",
];
const existingAliases = await get(
  `/domain_aliases?domain_id=eq.${DOMAIN_ID}&select=alias`,
);
const haveAlias = new Set(existingAliases.map(r => String(r.alias).toLowerCase()));
const aliasRows: Row[] = aliasList
  .filter(a => !haveAlias.has(a.toLowerCase()))
  .map(a => ({
    domain_id: DOMAIN_ID,
    label: a,
    alias: a,
    alias_type: "synonym",
  }));
if (aliasRows.length > 0) {
  await insert("/domain_aliases", aliasRows);
}
console.log(`domain_aliases: ${aliasRows.length} INSERTed (${haveAlias.size} pre-existing).`);

// ============================================================
// Summary
// ============================================================
console.log("\n=== BANK-OPS state-driven execute (2026-06-07) ===");
console.log(`entity_type PATCHed:        ${entityTypePatched}`);
console.log(`catalog UX fields written:  ${catalogPatched}`);
console.log(`intra-domain rels INSERTed: ${relRows.length}`);
console.log(`domain_aliases INSERTed:    ${aliasRows.length}`);
console.log("\nUI links:");
console.log("https://tests.semantius.app/domain_map/data_objects?id=in.(602,603,604,605,606,607,608,609)");
console.log("https://tests.semantius.app/domain_map/domains?id=eq.43");
console.log("https://tests.semantius.app/domain_map/data_object_relationships");
console.log("https://tests.semantius.app/domain_map/domain_aliases?domain_id=eq.43");
