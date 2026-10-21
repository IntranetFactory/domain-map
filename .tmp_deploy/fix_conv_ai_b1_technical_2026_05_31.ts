#!/usr/bin/env bun
// CONV-AI Bucket 1 — technical-only fixes (2026-05-31).
//
// Scope: apply only the items the audit pre-specifies and that do not require
// user judgment. Items requiring decisions (modularization, capabilities,
// catalog UX text, publish-lock flag flips, lifecycle states, new entities,
// boundary fixes owed by other domains, the H1.2 borderline PCF, alias
// drafts) are deferred to a separate user-facing pass.
//
// Applied here:
//   1. PATCH conversation_transcripts.has_personal_content=true (B1-S6 partial).
//   2. PATCH 6 trigger_events.event_category enum backfills (B1-S9).
//   3. INSERT 4 intra-domain data_object_relationships (B1-S7).
//   4. INSERT 3 user→author edges per Rule #10 (B1-S8 partial; the
//      reviewing_agent edges are "may have" in the audit, deferred).
//   5. INSERT 5 handoff_processes rows for B1-H1.1, H1.3, H1.4, H1.6, H1.7
//      (handoffs 723/724/745/228 already have rows; H1.2 deferred).
//
// Idempotent: each section reads existing state before writing.

const ROOT = "https://tests.semantius.app/domain_map";

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
  const exit = await proc.exited;
  if (exit !== 0) {
    throw new Error(`semantius failed (exit ${exit}): ${stderr}`);
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

async function post(path: string, rows: Row[]): Promise<Row[]> {
  return call({ method: "POST", path, body: rows });
}

// ============================================================
// 1. PATCH conversation_transcripts.has_personal_content=true
// ============================================================
console.log("\n== B1-S6: data_objects.has_personal_content backfill ==");
{
  const before = await get(
    "/data_objects?id=eq.259&select=id,data_object_name,has_personal_content",
  );
  console.log("  before:", JSON.stringify(before));
  if (before.length === 1 && before[0].has_personal_content === false) {
    await patch("/data_objects?id=eq.259", { has_personal_content: true });
    console.log("  PATCHED conversation_transcripts.has_personal_content=true");
  } else {
    console.log("  already set or row missing; no PATCH");
  }
}

// ============================================================
// 2. PATCH 6 trigger_events.event_category backfills (B1-S9)
//    Enum values per Rule #13: lifecycle, state_change, threshold, signal.
//    The audit pre-specifies the mapping per row.
// ============================================================
console.log("\n== B1-S9: trigger_events.event_category backfill ==");
const triggerFixes: Array<{ id: number; event_category: string; event_name: string }> = [
  { id: 802, event_name: "bot_definition.published", event_category: "state_change" },
  { id: 803, event_name: "bot_definition.disabled", event_category: "state_change" },
  { id: 804, event_name: "intent_definition.published", event_category: "state_change" },
  { id: 805, event_name: "intent_definition.low_confidence_burst", event_category: "threshold" },
  { id: 806, event_name: "conversation_flow.published", event_category: "state_change" },
  { id: 807, event_name: "conversation_flow.fallback_triggered", event_category: "signal" },
];
{
  const ids = triggerFixes.map(f => f.id).join(",");
  const live = await get(
    `/trigger_events?id=in.(${ids})&select=id,event_name,event_category`,
  );
  const byId = new Map(live.map(r => [Number(r.id), r]));
  for (const fix of triggerFixes) {
    const row = byId.get(fix.id);
    if (!row) {
      console.log(`  skip id=${fix.id}: not found in live`);
      continue;
    }
    if (row.event_name !== fix.event_name) {
      console.log(
        `  skip id=${fix.id}: event_name drift, live='${row.event_name}', expected='${fix.event_name}'`,
      );
      continue;
    }
    if (row.event_category === fix.event_category) {
      console.log(`  skip id=${fix.id}: already '${fix.event_category}'`);
      continue;
    }
    if (row.event_category !== "") {
      console.log(
        `  skip id=${fix.id}: live category '${row.event_category}' is non-empty; audit only authorizes empty→${fix.event_category}`,
      );
      continue;
    }
    await patch(`/trigger_events?id=eq.${fix.id}`, { event_category: fix.event_category });
    console.log(`  PATCHED id=${fix.id} (${fix.event_name}) → ${fix.event_category}`);
  }
}

// ============================================================
// 3. INSERT 4 intra-domain data_object_relationships (B1-S7)
//    Audit pre-specifies the four edges by verb. Enum values verified
//    against /fields metadata: relationship_kind ∈ {composition, reference,
//    association, inheritance}; relationship_type ∈ {one_to_one,
//    one_to_many, many_to_many}; owner_side ∈ {source, target}.
//    Existing intra-domain edge 478 (intent_definitions→knowledge_articles)
//    is preserved.
// ============================================================
console.log("\n== B1-S7: intra-domain data_object_relationships ==");
//   bot_definitions (699) composes conversation_flows (701)
//   conversation_flows (701) references intent_definitions (700)
//   intent_detections (260) occurs_in conversation_transcripts (259)
//   conversation_flows (701) produces conversation_transcripts (259)
const intraEdges = [
  {
    data_object_id: 699,
    related_data_object_id: 701,
    relationship_verb: "composes",
    inverse_verb: "composed_by",
    relationship_kind: "composition",
    relationship_type: "one_to_many",
    owner_side: "source",
    is_required: true,
  },
  {
    data_object_id: 701,
    related_data_object_id: 700,
    relationship_verb: "references",
    inverse_verb: "referenced_by",
    relationship_kind: "reference",
    relationship_type: "many_to_many",
    owner_side: "source",
    is_required: false,
  },
  {
    data_object_id: 260,
    related_data_object_id: 259,
    relationship_verb: "occurs_in",
    inverse_verb: "contains",
    relationship_kind: "reference",
    relationship_type: "many_to_many",
    owner_side: "source",
    is_required: true,
  },
  {
    data_object_id: 701,
    related_data_object_id: 259,
    relationship_verb: "produces",
    inverse_verb: "produced_by",
    relationship_kind: "reference",
    relationship_type: "one_to_many",
    owner_side: "source",
    is_required: false,
  },
];
{
  const sources = [...new Set(intraEdges.map(e => e.data_object_id))].join(",");
  const targets = [...new Set(intraEdges.map(e => e.related_data_object_id))].join(",");
  const live = await get(
    `/data_object_relationships?and=(data_object_id.in.(${sources}),related_data_object_id.in.(${targets}))&select=data_object_id,related_data_object_id,relationship_verb`,
  );
  const key = (s: unknown, t: unknown, v: unknown) => `${s}|${t}|${v}`;
  const have = new Set(live.map(r => key(r.data_object_id, r.related_data_object_id, r.relationship_verb)));
  const missing = intraEdges.filter(
    e => !have.has(key(e.data_object_id, e.related_data_object_id, e.relationship_verb)),
  );
  if (missing.length === 0) {
    console.log("  all 4 intra-domain edges already present");
  } else {
    console.log(`  inserting ${missing.length} intra-domain edges`);
    const inserted = await post("/data_object_relationships", missing);
    console.log(`  inserted ${inserted.length} rows`);
  }
}

// ============================================================
// 4. INSERT 3 user→author edges per Rule #10 (B1-S8 partial)
//    Audit explicitly names: bot_definitions, intent_definitions,
//    conversation_flows have an `author` user. The reviewing_agent edges
//    are "may have" — deferred.
//    Pattern: users (748) authored <entities> (verb on user side reads
//    "authored <entities>", inverse "is_authored_by"), one_to_many, owner=source.
// ============================================================
console.log("\n== B1-S8: data_object_relationships user-edges (Rule #10) ==");
const userEdges = [
  {
    data_object_id: 748,
    related_data_object_id: 699,
    relationship_verb: "authored bot_definitions",
    inverse_verb: "is_authored_by",
    relationship_kind: "reference",
    relationship_type: "one_to_many",
    owner_side: "source" as const,
    is_required: false,
  },
  {
    data_object_id: 748,
    related_data_object_id: 700,
    relationship_verb: "authored intent_definitions",
    inverse_verb: "is_authored_by",
    relationship_kind: "reference",
    relationship_type: "one_to_many",
    owner_side: "source" as const,
    is_required: false,
  },
  {
    data_object_id: 748,
    related_data_object_id: 701,
    relationship_verb: "authored conversation_flows",
    inverse_verb: "is_authored_by",
    relationship_kind: "reference",
    relationship_type: "one_to_many",
    owner_side: "source" as const,
    is_required: false,
  },
];
{
  const targets = userEdges.map(e => e.related_data_object_id).join(",");
  const live = await get(
    `/data_object_relationships?and=(data_object_id.eq.748,related_data_object_id.in.(${targets}))&select=data_object_id,related_data_object_id,relationship_verb,inverse_verb`,
  );
  const key = (t: unknown, v: unknown) => `${t}|${v}`;
  const have = new Set(live.map(r => key(r.related_data_object_id, r.inverse_verb)));
  const missing = userEdges.filter(e => !have.has(key(e.related_data_object_id, e.inverse_verb)));
  if (missing.length === 0) {
    console.log("  all 3 user-edges already present");
  } else {
    console.log(`  inserting ${missing.length} user-edges`);
    const inserted = await post("/data_object_relationships", missing);
    console.log(`  inserted ${inserted.length} rows`);
  }
}

// ============================================================
// 5. INSERT 5 handoff_processes rows (B1-H1.x)
//    Only handoffs without an existing handoff_processes row are inserted.
//    Live snapshot at script-write time: 228, 723, 724, 745 already have
//    rows (different PCFs than the audit recommends, but audit B1-H1.2 is
//    flagged as deferral and the other three pre-existed; touching them
//    would override prior human/agent judgment).
//    Audit-confident PCFs being applied:
//      H1.1: handoff 227 → process 196 (Manage customer service problems, requests, and inquiries)
//      H1.3: handoff 743 → process 927 (Resolve customer problems, requests, and inquiries)
//      H1.4: handoff 744 → process 926 (Analyze problems, requests, and inquiries)
//      H1.6: handoff 746 → process 52  (Deploy services/solutions)
//      H1.7: handoff 153 → process 52  (Deploy services/solutions)
// ============================================================
console.log("\n== H1.x: handoff_processes inserts ==");
const handoffProcesses = [
  { handoff_id: 227, process_id: 196, proposal_source: "agent_curated", role: "implements" },
  { handoff_id: 743, process_id: 927, proposal_source: "agent_curated", role: "implements" },
  { handoff_id: 744, process_id: 926, proposal_source: "agent_curated", role: "implements" },
  { handoff_id: 746, process_id: 52, proposal_source: "agent_curated", role: "implements" },
  { handoff_id: 153, process_id: 52, proposal_source: "agent_curated", role: "implements" },
];
{
  // Verify both handoffs and PCFs exist.
  const handoffIds = handoffProcesses.map(r => r.handoff_id).join(",");
  const liveHandoffs = await get(`/handoffs?id=in.(${handoffIds})&select=id`);
  const haveHandoffs = new Set(liveHandoffs.map(r => Number(r.id)));
  for (const r of handoffProcesses) {
    if (!haveHandoffs.has(r.handoff_id)) {
      throw new Error(`abort: handoff id=${r.handoff_id} missing from live`);
    }
  }
  const processIds = [...new Set(handoffProcesses.map(r => r.process_id))].join(",");
  const liveProcesses = await get(
    `/processes?id=in.(${processIds})&select=id,source_framework`,
  );
  const haveProcs = new Map(liveProcesses.map(r => [Number(r.id), String(r.source_framework)]));
  for (const r of handoffProcesses) {
    const sf = haveProcs.get(r.process_id);
    if (!sf) throw new Error(`abort: process id=${r.process_id} missing from live`);
    if (sf !== "apqc_pcf_cross_industry") {
      throw new Error(`abort: process id=${r.process_id} not apqc_pcf_cross_industry (is '${sf}')`);
    }
  }

  // Skip handoffs that already have a row.
  const liveHP = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds})&select=handoff_id`,
  );
  const haveHP = new Set(liveHP.map(r => Number(r.handoff_id)));
  const missing = handoffProcesses.filter(r => !haveHP.has(r.handoff_id));
  if (missing.length === 0) {
    console.log("  all 5 handoff_processes already present");
  } else {
    console.log(`  inserting ${missing.length} handoff_processes (skipped: ${handoffProcesses.length - missing.length} pre-existing)`);
    const inserted = await post("/handoff_processes", missing);
    console.log(`  inserted ${inserted.length} rows`);
  }
}

// ============================================================
// Post-load summary
// ============================================================
console.log("\n== Post-load verification ==");
const txAfter = await get(
  "/data_objects?id=eq.259&select=data_object_name,has_personal_content",
);
console.log("  conversation_transcripts:", JSON.stringify(txAfter));

const teAfter = await get(
  "/trigger_events?id=in.(802,803,804,805,806,807)&select=id,event_name,event_category&order=id.asc",
);
console.log("  trigger_events:", JSON.stringify(teAfter));

const relCount = await get(
  "/data_object_relationships?or=(data_object_id.in.(699,700,701,259,260,748),related_data_object_id.in.(699,700,701,259,260))&select=id,data_object_id,related_data_object_id,relationship_verb",
);
console.log(`  CONV-AI-touching relationships: ${relCount.length} rows`);

const hpAfter = await get(
  "/handoff_processes?handoff_id=in.(227,228,743,744,745,746,153,723,724)&select=handoff_id,process_id&order=handoff_id.asc",
);
console.log(`  handoff_processes on CONV-AI handoffs: ${hpAfter.length} rows`);
console.log("  ", JSON.stringify(hpAfter));

console.log(`\nUI: ${ROOT}/trigger_events  ${ROOT}/data_object_relationships  ${ROOT}/handoff_processes  ${ROOT}/data_objects`);
console.log("\nDone.");
