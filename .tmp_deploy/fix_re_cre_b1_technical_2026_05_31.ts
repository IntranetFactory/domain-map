#!/usr/bin/env bun
// RE-CRE b1 audit, technical fixes only (2026-05-31 continuation).
//
// Scope per orchestrator task spec (TECHNICAL only; judgment items deferred):
//
//   B1-S5  PATCH event_category on 5 trigger_events (942, 943, 944, 945, 946)
//          Audit pre-specifies values: all 5 -> 'lifecycle'.
//
//   B1-S3  INSERT 13 user-edge data_object_relationships rows per Rule #10.
//          Audit pre-specifies the actor labels per master:
//            commercial_leases (363):       4 actors
//            cam_charges (365):             2 actors
//            stacking_plans (364):          1 actor
//            tenant_credit_records (719):   1 actor
//            sublease_transactions (720):   3 actors
//            building_certifications (721): 2 actors
//
//   H1     APQC tagging from the audit's H1 table, where the audit pre-specifies
//          handoff_id + a single confident PCF id (process verified live):
//            INSERT 303 -> 1511 (Confirm alignment of property requirements)
//            INSERT 859 -> 1345 (Analyze credit scoring history)
//            INSERT 860 -> 1783 (Evaluate environmental impact)
//            INSERT 297 -> 398  (Negotiate and document agreements/contracts)
//            PATCH   id 205 (handoff 309): process_id 1332 -> 398
//                    Audit: "REPLACE existing agent_curated row to 1332 which is a weak match"
//
// Deferred (not applied; reasons summarized in the final report):
//   B1-S1  new modules / DMDOs / capabilities (new entities rule + B2-S1 user pick).
//   B1-S2  intra-domain master-to-master relationships (not user-edges per Rule #10).
//   B1-S4  handoff 304 disposition (gated on B2-S3 user pick).
//   B1-S6  NULL source_domain_module_id (gated on B1-S1: no modules yet).
//   B1-S7  NULL target_domain_module_id (gated on B1-S1 + cross-domain consumer DMDOs).
//   B1-S8  aliases (no exact tuples pre-specified; vendor-context inserts deferred).
//   B1-S9  lifecycle states (gated on B1-S1: requires domain_module_id).
//   B1-S10 pattern flag flips (explicit defer rule + B2-S5 user confirms).
//   B1-S11 catalog_tagline / catalog_description (Rule #20).
//   B1-S12 system skills + tools (gated on B1-S1: new modules first).
//   B1-S13 cross-domain relationships (target masters TBD, B2-S2 surface-to-user).
//   D1     domain_regulations (Bucket 2 B2-S7 explicit "Confirm which to load";
//          ADA exists as id 61 but applicability is user judgment).

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

async function post(path: string, body: Row | Row[]): Promise<Row[]> {
  return call({ method: "POST", path, body });
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

// -----------------------------------------------------------------------------
// B1-S5: trigger_events enum backfill (5 rows). Audit pre-specifies values.
// Allowed values per Rule #13: lifecycle / state_change / threshold / signal.
// -----------------------------------------------------------------------------
const enumBackfill: Array<{ id: number; event_name: string; event_category: string }> = [
  { id: 942, event_name: "stacking_plan.published",       event_category: "lifecycle" },
  { id: 943, event_name: "tenant_credit.assessed",        event_category: "lifecycle" },
  { id: 944, event_name: "sublease.initiated",            event_category: "lifecycle" },
  { id: 945, event_name: "sublease.executed",             event_category: "lifecycle" },
  { id: 946, event_name: "building_certification.earned", event_category: "lifecycle" },
];

async function applyB1S5(): Promise<number> {
  console.log("\n=== B1-S5: trigger_events.event_category backfill ===");
  const ids = enumBackfill.map((r) => r.id).join(",");
  const current = await get(
    `/trigger_events?id=in.(${ids})&select=id,event_name,event_category`,
  );
  const currentMap = new Map(
    current.map((r) => [Number(r.id), String(r.event_category ?? "")]),
  );
  let n = 0;
  for (const row of enumBackfill) {
    const have = currentMap.get(row.id);
    if (have === undefined) {
      console.log(`  ! event ${row.id} (${row.event_name}) not found, skip`);
      continue;
    }
    if (have === row.event_category) {
      console.log(`  - event ${row.id} (${row.event_name}): already '${row.event_category}', skip`);
      continue;
    }
    if (have && have !== "") {
      console.log(`  ! event ${row.id} (${row.event_name}): live='${have}' differs from proposed='${row.event_category}', skip (drift)`);
      continue;
    }
    await patch(`/trigger_events?id=eq.${row.id}`, {
      event_category: row.event_category,
    });
    console.log(`  + event ${row.id} (${row.event_name}): '' -> '${row.event_category}'`);
    n++;
  }
  return n;
}

// -----------------------------------------------------------------------------
// B1-S3: INSERT 13 user-edge data_object_relationships per Rule #10.
// Source = users (data_objects.id 748, kind='platform_builtin').
// Shape mirrors the proven METRICS-LAYER B1-S4 idiom:
//   owner_side='target', relationship_type='many_to_many',
//   relationship_kind='reference', is_required=false.
// -----------------------------------------------------------------------------
const userEdges: Array<{
  related: number;
  related_name: string;
  verb: string;
  inverse: string;
  label: string;
}> = [
  // commercial_leases (363) -- 4 actors
  {
    related: 363, related_name: "commercial_leases",
    verb: "signs as landlord", inverse: "is signed as landlord by",
    label: "users sign commercial_leases as landlord",
  },
  {
    related: 363, related_name: "commercial_leases",
    verb: "signs as tenant", inverse: "is signed as tenant by",
    label: "users sign commercial_leases as tenant",
  },
  {
    related: 363, related_name: "commercial_leases",
    verb: "approves", inverse: "is approved by",
    label: "users approves commercial_leases",
  },
  {
    related: 363, related_name: "commercial_leases",
    verb: "originated as broker", inverse: "was brokered by",
    label: "users originate commercial_leases as broker",
  },
  // cam_charges (365) -- 2 actors
  {
    related: 365, related_name: "cam_charges",
    verb: "prepares reconciliation", inverse: "is reconciled by",
    label: "users prepare cam_charges reconciliation",
  },
  {
    related: 365, related_name: "cam_charges",
    verb: "approves reconciliation", inverse: "is approved by",
    label: "users approve cam_charges reconciliation",
  },
  // stacking_plans (364) -- 1 actor
  {
    related: 364, related_name: "stacking_plans",
    verb: "authors", inverse: "is authored by",
    label: "users author stacking_plans",
  },
  // tenant_credit_records (719) -- 1 actor
  {
    related: 719, related_name: "tenant_credit_records",
    verb: "analyzes credit", inverse: "is analyzed by",
    label: "users analyze tenant_credit_records",
  },
  // sublease_transactions (720) -- 3 actors
  {
    related: 720, related_name: "sublease_transactions",
    verb: "consents as landlord", inverse: "received landlord consent from",
    label: "users consent to sublease_transactions as landlord",
  },
  {
    related: 720, related_name: "sublease_transactions",
    verb: "sublets as sublessor", inverse: "is sublet by",
    label: "users sublet sublease_transactions as sublessor",
  },
  {
    related: 720, related_name: "sublease_transactions",
    verb: "takes as sublessee", inverse: "is taken by",
    label: "users take sublease_transactions as sublessee",
  },
  // building_certifications (721) -- 2 actors
  {
    related: 721, related_name: "building_certifications",
    verb: "issues as certifying authority", inverse: "was issued by",
    label: "users issue building_certifications as certifying authority",
  },
  {
    related: 721, related_name: "building_certifications",
    verb: "owns internally", inverse: "is internally owned by",
    label: "users own building_certifications internally",
  },
];

async function applyB1S3(): Promise<number> {
  console.log("\n=== B1-S3: user-edge data_object_relationships per Rule #10 ===");
  let n = 0;
  for (const e of userEdges) {
    const existing = await get(
      `/data_object_relationships?and=(data_object_id.eq.748,related_data_object_id.eq.${e.related},relationship_verb.eq.${encodeURIComponent(e.verb)})&select=id`,
    );
    if (existing.length > 0) {
      console.log(`  - edge users -> ${e.related_name} (${e.verb}): exists id=${existing[0].id}, skip`);
      continue;
    }
    const inserted = await post("/data_object_relationships", [
      {
        data_object_relationship_label: e.label,
        data_object_id: 748,
        related_data_object_id: e.related,
        owner_side: "target",
        relationship_type: "many_to_many",
        relationship_kind: "reference",
        relationship_verb: e.verb,
        inverse_verb: e.inverse,
        is_required: false,
      },
    ]);
    console.log(`  + edge users -> ${e.related_name} (${e.verb}): inserted id=${inserted[0]?.id}`);
    n++;
  }
  return n;
}

// -----------------------------------------------------------------------------
// H1: handoff_processes inserts + 1 PATCH (per audit H1 table).
// PCFs verified live (process_code / process_name shown in comments).
// -----------------------------------------------------------------------------
const handoffProcessInserts: Array<{
  handoff_id: number;
  process_id: number;
  pcf_code: string;
}> = [
  { handoff_id: 303, process_id: 1511, pcf_code: "10.1.1.1 (Confirm alignment of property requirements)" },
  { handoff_id: 859, process_id: 1345, pcf_code: "9.2.1.3 (Analyze credit scoring history)" },
  { handoff_id: 860, process_id: 1783, pcf_code: "13.9.1.1 (Evaluate environmental impact)" },
  { handoff_id: 297, process_id: 398,  pcf_code: "12.4.9 (Negotiate and document agreements/contracts)" },
];

async function applyH1Inserts(): Promise<number> {
  console.log("\n=== H1: INSERT handoff_processes (audit pre-specifies handoff + PCF) ===");
  let n = 0;
  for (const p of handoffProcessInserts) {
    const existing = await get(
      `/handoff_processes?and=(handoff_id.eq.${p.handoff_id},process_id.eq.${p.process_id})&select=id`,
    );
    if (existing.length > 0) {
      console.log(`  - handoff ${p.handoff_id} -> process ${p.process_id} ${p.pcf_code}: exists id=${existing[0].id}, skip`);
      continue;
    }
    const inserted = await post("/handoff_processes", [
      {
        handoff_id: p.handoff_id,
        process_id: p.process_id,
        proposal_source: "agent_curated",
        // role defaults to 'implements'; record_status defaults to 'new'; notes empty.
      },
    ]);
    console.log(`  + handoff ${p.handoff_id} -> process ${p.process_id} ${p.pcf_code}: inserted id=${inserted[0]?.id}`);
    n++;
  }
  return n;
}

// H1 PATCH: handoff 309's existing agent_curated row id=205 currently points at
// process 1332 (weak match per audit); audit pre-specifies replacement to 398.
async function applyH1Patch309(): Promise<number> {
  console.log("\n=== H1: PATCH handoff_processes id=205 (handoff 309) process_id 1332 -> 398 ===");
  const live = await get(`/handoff_processes?id=eq.205&select=id,handoff_id,process_id,proposal_source,record_status`);
  if (live.length === 0) {
    console.log(`  ! handoff_processes id=205 not found, skip`);
    return 0;
  }
  const row = live[0];
  if (Number(row.process_id) === 398) {
    console.log(`  - id=205: already pointing at process_id=398, skip`);
    return 0;
  }
  if (Number(row.process_id) !== 1332) {
    console.log(`  ! id=205: live process_id=${row.process_id} differs from expected 1332, skip (drift, surface to user)`);
    return 0;
  }
  if (String(row.record_status) === "approved") {
    console.log(`  ! id=205: record_status='approved', skip (would clobber human-confirmed tag)`);
    return 0;
  }
  // Also pre-flight: ensure the replacement target doesn't already coexist as a
  // separate row on this handoff (we don't want a duplicate after the PATCH).
  const dup = await get(
    `/handoff_processes?and=(handoff_id.eq.309,process_id.eq.398)&select=id`,
  );
  if (dup.length > 0) {
    console.log(`  ! handoff 309 already has a separate row for process 398 (id=${dup[0].id}); skipping PATCH to avoid unique-key conflict, surface to user`);
    return 0;
  }
  await patch(`/handoff_processes?id=eq.205`, {
    process_id: 398,
    proposal_source: "agent_curated",
  });
  console.log(`  + id=205: process_id 1332 -> 398 (proposal_source kept agent_curated)`);
  return 1;
}

// -----------------------------------------------------------------------------
// Driver.
// -----------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log("RE-CRE b1 technical fixes (2026-05-31)");
  console.log("======================================");

  const n5 = await applyB1S5();
  const n3 = await applyB1S3();
  const nH1ins = await applyH1Inserts();
  const nH1patch = await applyH1Patch309();

  console.log("\n======================================");
  console.log(`SUMMARY`);
  console.log(`  B1-S5 trigger_events PATCH:        ${n5}`);
  console.log(`  B1-S3 user-edge rels INSERT:       ${n3}`);
  console.log(`  H1    handoff_processes INSERT:    ${nH1ins}`);
  console.log(`  H1    handoff_processes PATCH 309: ${nH1patch}`);
  console.log("\nUI spot-check links:");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
  console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
