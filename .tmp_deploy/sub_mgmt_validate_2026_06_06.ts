#!/usr/bin/env bun
// SUB-MGMT (domain 97) state-driven Validate execute pass, 2026-06-06.
// Executes the open EXECUTE items from audits/SUB-MGMT/state.yaml:
//   1. B1A-S3      INSERT 6 intra-domain cross-module handoffs (source=target=97)
//   2. B1A-S8      PATCH lifecycle state 381 -> domain_module_id=168
//   3. B1A-S7-PRIME PATCH empty catalog_tagline/catalog_description on domain 97 + modules 167/168
//   4. B1A-ENTITY-TYPE PATCH entity_type on 5 masters (106,107,108,109,110)
//   5. B1B-S5      INSERT net-new generic synonym aliases on the 5 masters
//   6. B1B-H1      INSERT net-new agent_curated handoff_processes on the untagged cross-domain handoffs
// Idempotent: reads live state first, inserts/patches only what is missing.
// Everything lands at record_status='new' (column omitted). Never writes `notes`.

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

const log: string[] = [];

// ============================================================
// 1. B1A-S3 — 6 intra-domain cross-module handoffs (source=target=97)
// ============================================================
// routing a-f from state.yaml extra_routing. trigger_event ids 129,155,156,493,494,496.
const intraHandoffs = [
  // a: BILLING(168) -> SUBSCRIPTIONS(167), event 494 (customer_invoice.past_due), payload customer_subscriptions (106)
  { src_m: 168, tgt_m: 167, te: 494, do: 106,
    description: "An invoice going past due drives the subscription into a past-due state so access and renewal decisions reflect the unpaid balance." },
  // b: BILLING(168) -> SUBSCRIPTIONS(167), event 493 (customer_invoice.paid), payload customer_subscriptions (106)
  { src_m: 168, tgt_m: 167, te: 493, do: 106,
    description: "An invoice clearing returns the subscription from past-due to active so the customer regains normal service." },
  // c: SUBSCRIPTIONS(167) -> BILLING(168), event 129 (subscription.activated), payload customer_invoices (107)
  { src_m: 167, tgt_m: 168, te: 129, do: 107,
    description: "Activating a subscription triggers the first invoice so billing begins as soon as the customer is live." },
  // d: SUBSCRIPTIONS(167) -> BILLING(168), event 156 (subscription.renewal_required), payload customer_invoices (107)
  { src_m: 167, tgt_m: 168, te: 156, do: 107,
    description: "A renewal coming due triggers the recurring invoice run so the next billing period is invoiced on time." },
  // e: BILLING(168) -> SUBSCRIPTIONS(167), event 155 (dunning.escalation), payload customer_subscriptions (106)
  { src_m: 168, tgt_m: 167, te: 155, do: 106,
    description: "A dunning escalation feeds the subscription into a suspended state when collection attempts on the overdue balance fail." },
  // f: SUBSCRIPTIONS(167) -> BILLING(168), event 496 (usage_record.overage_detected), payload usage_records (108)
  { src_m: 167, tgt_m: 168, te: 496, do: 108,
    description: "Detecting metered overage triggers an overage line on the upcoming invoice so usage above plan is billed." },
];

async function loadIntraHandoffs() {
  const existing = await get(
    "/handoffs?source_domain_id=eq.97&target_domain_id=eq.97&select=source_domain_module_id,target_domain_module_id,trigger_event_id,data_object_id",
  );
  const key = (r: Row) =>
    `${r.source_domain_module_id}|${r.target_domain_module_id}|${r.trigger_event_id}|${r.data_object_id}`;
  const have = new Set(existing.map(key));
  const rows = intraHandoffs
    .map(h => ({
      source_domain_id: 97,
      target_domain_id: 97,
      source_domain_module_id: h.src_m,
      target_domain_module_id: h.tgt_m,
      trigger_event_id: h.te,
      data_object_id: h.do,
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      description: h.description,
    }))
    .filter(r => !have.has(key(r)));
  if (rows.length) await insert("/handoffs", rows);
  log.push(`B1A-S3 intra-domain handoffs: inserted ${rows.length} (had ${existing.length})`);
}

// ============================================================
// 2. B1A-S8 — lifecycle state 381 -> domain_module_id=168
// ============================================================
async function patchLifecycleFK() {
  const [st] = await get(
    "/data_object_lifecycle_states?id=eq.381&select=id,domain_module_id",
  );
  if (!st) { log.push("B1A-S8: state 381 not found, skipped"); return; }
  if (st.domain_module_id == null) {
    await patch("/data_object_lifecycle_states?id=eq.381", { domain_module_id: 168 });
    log.push("B1A-S8 lifecycle FK: PATCHed state 381 domain_module_id=168 (was NULL)");
  } else {
    log.push(`B1A-S8: state 381 already domain_module_id=${st.domain_module_id}, skipped`);
  }
}

// ============================================================
// 3. B1A-S7-PRIME — catalog copy on empty fields only
// ============================================================
const domainCopy = {
  tagline: "Run the full subscription money lifecycle, from sign-up through billing, revenue, and recovery.",
  description:
    "Operate recurring revenue end to end. Activate and change subscriptions, generate and issue invoices on a schedule, rate metered usage, recognize revenue under modern accounting standards, and recover failed payments through dunning. Built for teams that need every billing event, state change, and revenue entry to stay auditable and tied to the customer record.",
};
const moduleCopy: Record<number, { tagline: string; description: string }> = {
  167: {
    tagline: "Manage the subscription lifecycle and the usage that drives it.",
    description:
      "Take subscriptions from trial to active, handle upgrades, downgrades, renewals, cancellations, and reactivations, and capture metered usage as it happens. Keeps subscription state and usage in one place so billing, revenue, and customer teams always work from the same source of truth.",
  },
  168: {
    tagline: "Issue recurring invoices and recover the payments that slip.",
    description:
      "Generate, issue, and track invoices across the billing cycle, then catch and work past-due balances through structured dunning. Gives finance and collections teams a clear view of what was billed, what was paid, and what needs follow-up, with every invoice state change recorded for audit.",
  },
};

async function loadCatalogCopy() {
  const [dom] = await get("/domains?id=eq.97&select=catalog_tagline,catalog_description");
  const domBody: Row = {};
  if (dom && (dom.catalog_tagline === "" || dom.catalog_tagline == null)) domBody.catalog_tagline = domainCopy.tagline;
  if (dom && (dom.catalog_description === "" || dom.catalog_description == null)) domBody.catalog_description = domainCopy.description;
  if (Object.keys(domBody).length) {
    await patch("/domains?id=eq.97", domBody);
    log.push(`B1A-S7-PRIME domain 97: wrote ${Object.keys(domBody).join("+")}`);
  } else {
    log.push("B1A-S7-PRIME domain 97: catalog fields already non-empty, skipped");
  }
  const mods = await get("/domain_modules?id=in.(167,168)&select=id,catalog_tagline,catalog_description");
  for (const m of mods) {
    const id = Number(m.id);
    const copy = moduleCopy[id];
    const body: Row = {};
    if (m.catalog_tagline === "" || m.catalog_tagline == null) body.catalog_tagline = copy.tagline;
    if (m.catalog_description === "" || m.catalog_description == null) body.catalog_description = copy.description;
    if (Object.keys(body).length) {
      await patch(`/domain_modules?id=eq.${id}`, body);
      log.push(`B1A-S7-PRIME module ${id}: wrote ${Object.keys(body).join("+")}`);
    } else {
      log.push(`B1A-S7-PRIME module ${id}: catalog fields already non-empty, skipped`);
    }
  }
}

// ============================================================
// 4. B1A-ENTITY-TYPE — classify entity_type on 5 masters
// ============================================================
// 106 customer_subscriptions: operational_workflow (trial->active->...->churned)
// 107 customer_invoices: operational_workflow (draft->issued->paid->...)
// 108 usage_records: operational_record (append-only metered event log; B2-S1 may later add a lifecycle -> operational_workflow)
// 109 revenue_recognition_records: operational_workflow (pending->recognized->reversed, ASC 606 gate)
// 110 dunning_events: operational_workflow (triggered->escalated->resolved->written_off)
const entityTypes: Record<number, string> = {
  106: "operational_workflow",
  107: "operational_workflow",
  108: "operational_record",
  109: "operational_workflow",
  110: "operational_workflow",
};

async function classifyEntityTypes() {
  const objs = await get("/data_objects?id=in.(106,107,108,109,110)&select=id,data_object_name,entity_type");
  let n = 0;
  for (const o of objs) {
    const id = Number(o.id);
    const target = entityTypes[id];
    if (o.entity_type === "unclassified" || o.entity_type == null) {
      await patch(`/data_objects?id=eq.${id}`, { entity_type: target });
      log.push(`B1A-ENTITY-TYPE: ${o.data_object_name} (${id}) -> ${target}`);
      n++;
    } else {
      log.push(`B1A-ENTITY-TYPE: ${o.data_object_name} (${id}) already ${o.entity_type}, skipped`);
    }
  }
  log.push(`B1A-ENTITY-TYPE: classified ${n} masters`);
}

// ============================================================
// 5. B1B-S5 — net-new generic synonym aliases
// ============================================================
const aliasSpec: Record<number, string[]> = {
  106: ["subscriptions", "recurring_charges", "subscription_records"],
  107: ["invoices", "bills", "customer_bills"],
  108: ["usage_events", "metered_events", "meter_readings"],
  109: ["revrec_records", "deferred_revenue_schedules", "performance_obligation_records"],
  110: ["dunning_notices", "collections_events", "payment_recovery_events"],
};

async function loadAliases() {
  const existing = await get(
    "/data_object_aliases?data_object_id=in.(106,107,108,109,110)&select=data_object_id,alias_name",
  );
  const have = new Set(existing.map(r => `${r.data_object_id}|${r.alias_name}`));
  const rows: Row[] = [];
  for (const [doid, names] of Object.entries(aliasSpec)) {
    for (const name of names) {
      if (!have.has(`${doid}|${name}`)) {
        rows.push({
          data_object_id: Number(doid),
          alias_name: name,
          alias_type: "synonym",
          is_preferred: false,
        });
      }
    }
  }
  if (rows.length) await insert("/data_object_aliases", rows);
  log.push(`B1B-S5 aliases: inserted ${rows.length} (had ${existing.length} on the 5 masters)`);
}

// ============================================================
// 6. B1B-H1 — net-new agent_curated handoff_processes (untagged only)
// ============================================================
// PCF process ids resolved live this pass against source_framework=apqc_pcf_cross_industry:
//   148 Manage customers and accounts (10183)
//   196 Manage customer service problems, requests, and inquiries (10388)
//   304 Manage and process collections (10745)
//   719 Manage customer master data (14208)
// Only NET-NEW rows for handoffs with no existing handoff_processes row are inserted here.
// REPLACE (72,73,233,519) and CONFIRM (63,67,197,485) are surfaced, NOT touched.
const tagSpec: Array<{ handoff_id: number; process_id: number }> = [
  { handoff_id: 64, process_id: 148 },  // subscription.activated -> CRM (customers)
  { handoff_id: 65, process_id: 196 },  // subscription.activated -> CSM (customer_entitlements)
  { handoff_id: 194, process_id: 304 }, // dunning.escalation -> CSM (dunning_events)
  { handoff_id: 195, process_id: 148 }, // subscription.renewal_required -> CSM
  { handoff_id: 196, process_id: 148 }, // subscription.downgraded -> CRM
  { handoff_id: 490, process_id: 148 }, // subscription.upgraded -> CRM
  { handoff_id: 493, process_id: 304 }, // customer_invoice.past_due -> CSM
  { handoff_id: 494, process_id: 196 }, // subscription.cancelled -> CSM
  { handoff_id: 224, process_id: 148 }, // health_score.declined -> SUB-MGMT (customers)
  { handoff_id: 234, process_id: 148 }, // subscription.expansion_requested -> SUB-MGMT
  { handoff_id: 271, process_id: 719 }, // customer_golden_record.created -> SUB-MGMT
  { handoff_id: 471, process_id: 148 }, // crm_opportunity.closed_won -> SUB-MGMT
  { handoff_id: 489, process_id: 148 }, // customer_entitlement.depleted -> SUB-MGMT
];

async function loadHandoffProcesses() {
  const ids = tagSpec.map(t => t.handoff_id).join(",");
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${ids})&select=handoff_id,process_id`,
  );
  const have = new Set(existing.map(r => `${r.handoff_id}|${r.process_id}`));
  // also guard: if a handoff already carries ANY tag, skip it (net-new only, don't double-tag)
  const tagged = new Set(existing.map(r => Number(r.handoff_id)));
  const rows: Row[] = [];
  const skipped: number[] = [];
  for (const t of tagSpec) {
    if (tagged.has(t.handoff_id) || have.has(`${t.handoff_id}|${t.process_id}`)) {
      skipped.push(t.handoff_id);
      continue;
    }
    rows.push({
      handoff_id: t.handoff_id,
      process_id: t.process_id,
      role: "implements",
      proposal_source: "agent_curated",
    });
  }
  if (rows.length) await insert("/handoff_processes", rows);
  log.push(
    `B1B-H1 handoff_processes: inserted ${rows.length} net-new` +
      (skipped.length ? `; skipped already-tagged handoffs [${skipped.join(",")}]` : ""),
  );
}

// ============================================================
async function main() {
  await loadIntraHandoffs();
  await patchLifecycleFK();
  await loadCatalogCopy();
  await classifyEntityTypes();
  await loadAliases();
  await loadHandoffProcesses();

  console.log("\n===== SUB-MGMT Validate execute, 2026-06-06 =====");
  for (const l of log) console.log("  " + l);
  console.log("\nUI links:");
  for (const t of [
    "handoffs", "handoff_processes", "data_object_aliases",
    "domains", "domain_modules", "data_objects", "data_object_lifecycle_states",
  ]) {
    console.log(`  https://tests.semantius.app/domain_map/${t}`);
  }
}

await main();
