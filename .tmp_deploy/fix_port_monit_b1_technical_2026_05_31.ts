#!/usr/bin/env bun
// PORT-MONIT B1 technical fixes per audits/PORT-MONIT.md (2026-05-30 audit, B1 bucket).
//
// Applies ONLY the items that meet the strict technical-fix criteria:
//
//   1. B1-S5  INSERT 5 data_object_relationships rows (users -> master), per Rule #10.
//   2. B1-S10 PATCH domain_module_id=16 on the 3 lifecycle states of portfolio_companies (M5).
//   3. B1-H1  INSERT handoff_processes rows for handoffs whose audit-pre-specified
//             (handoff_id, process_id) pair is resolvable AND not already present.
//             Handoff 1039 already carries a handoff_processes row; only 1043/1042/1045 insert.
//
// Deferred (out of technical scope, per subagent contract):
//   - B1-S1 (catalog_tagline/description, Rule #20)
//   - B1-S2 (new system skills + tools, new entities + judgment)
//   - B1-S3 (new roles, new entities + judgment)
//   - B1-S4 (regulations, audit gates on Bucket 2 #1)
//   - B1-S6 (data_object_aliases, audit lists option-bundles not exact tuples)
//   - B1-S7 (lifecycle state authoring, judgment on state names + workflow gates)
//   - B1-S8 (trigger_events, depends on S7 + judgment)
//   - B1-S9 (intra-domain handoffs, depends on S8)
//   - B1-M1..M8 (new entities)
//
// Idempotent: pre-flights each write against live state and skips no-op writes.
// Per Rule #15 omits `notes` entirely. Per Rule #1 omits `record_status` (defaults to 'new').

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
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr.trim()}`);
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
  if (rows.length === 0) return [];
  return call({ method: "POST", path, body: rows });
}

// ----------------------------------------------------------------------------
// B1-S5: 5 user-edges per Rule #10
// ----------------------------------------------------------------------------
// users (data_object_id=748, kind=platform_builtin) -> master, owner_side='target',
// relationship_kind='reference', relationship_type='one_to_many' (catalog norm),
// mirroring the shape of existing PORT-MONIT user-edges (rels 885 + 886).
//
// Verbs are short action prose consistent with the catalog's user-edge convention
// (see /data_object_relationships?data_object_id=eq.748 samples).
// Audit row-by-row labels: submitter / submitter / computed_by / period_owner / report_author.

const USER_DO_ID = 748;

const userEdges: Row[] = [
  {
    data_object_id: USER_DO_ID,
    related_data_object_id: 764, // portco_kpi_periods
    relationship_verb: "submits",
    inverse_verb: "is_submitted_by",
    owner_side: "target",
    relationship_kind: "reference",
    relationship_type: "one_to_many",
    is_required: false,
  },
  {
    data_object_id: USER_DO_ID,
    related_data_object_id: 765, // portco_esg_records
    relationship_verb: "submits",
    inverse_verb: "is_submitted_by",
    owner_side: "target",
    relationship_kind: "reference",
    relationship_type: "one_to_many",
    is_required: false,
  },
  {
    data_object_id: USER_DO_ID,
    related_data_object_id: 767, // fund_position_returns
    relationship_verb: "computes",
    inverse_verb: "is_computed_by",
    owner_side: "target",
    relationship_kind: "reference",
    relationship_type: "one_to_many",
    is_required: false,
  },
  {
    data_object_id: USER_DO_ID,
    related_data_object_id: 768, // fund_performance_periods
    relationship_verb: "owns",
    inverse_verb: "is_owned_by",
    owner_side: "target",
    relationship_kind: "reference",
    relationship_type: "one_to_many",
    is_required: false,
  },
  {
    data_object_id: USER_DO_ID,
    related_data_object_id: 769, // lp_quarterly_reports
    relationship_verb: "authors",
    inverse_verb: "is_authored_by",
    owner_side: "target",
    relationship_kind: "reference",
    relationship_type: "one_to_many",
    is_required: false,
  },
];

async function applyUserEdges() {
  console.log("\n== B1-S5: data_object_relationships (5 user-edges) ==");
  const targetIds = userEdges.map(r => r.related_data_object_id).join(",");
  const existing = await get(
    `/data_object_relationships?data_object_id=eq.${USER_DO_ID}&related_data_object_id=in.(${targetIds})&select=id,related_data_object_id`,
  );
  const taken = new Set(existing.map(r => Number(r.related_data_object_id)));
  const missing = userEdges.filter(r => !taken.has(Number(r.related_data_object_id)));
  if (missing.length === 0) {
    console.log(`  all 5 edges already present; nothing to insert`);
    return;
  }
  console.log(`  inserting ${missing.length} edges (${existing.length} already present)`);
  const inserted = await post("/data_object_relationships", missing);
  console.log(`  inserted ids: ${inserted.map(r => r.id).join(", ")}`);
}

// ----------------------------------------------------------------------------
// B1-S10: PATCH domain_module_id=16 on 3 lifecycle states of portfolio_companies
// ----------------------------------------------------------------------------
// State ids: 476 (active), 477 (exited), 478 (written_off). All currently
// domain_module_id=null. Per audit, PORT-MONIT-PORTCO-DATA (module 16) is the
// canonical home; without this PATCH, workflow-gate permissions mis-prefix.

const lifecycleStateIds = [476, 477, 478];
const PORTCO_DATA_MODULE_ID = 16;

async function applyLifecycleStateModuleId() {
  console.log("\n== B1-S10: lifecycle states domain_module_id (M5) ==");
  const existing = await get(
    `/data_object_lifecycle_states?id=in.(${lifecycleStateIds.join(",")})&select=id,state_name,domain_module_id`,
  );
  const needPatch = existing.filter(r => r.domain_module_id !== PORTCO_DATA_MODULE_ID);
  if (needPatch.length === 0) {
    console.log(`  all 3 states already point at module ${PORTCO_DATA_MODULE_ID}; nothing to patch`);
    return;
  }
  console.log(`  patching ${needPatch.length} states to domain_module_id=${PORTCO_DATA_MODULE_ID}`);
  for (const row of needPatch) {
    await patch(`/data_object_lifecycle_states?id=eq.${row.id}`, {
      domain_module_id: PORTCO_DATA_MODULE_ID,
    });
    console.log(`    state ${row.id} (${row.state_name}) -> module ${PORTCO_DATA_MODULE_ID}`);
  }
}

// ----------------------------------------------------------------------------
// B1-H1: handoff_processes rows (audit-pre-specified handoff_id + PCF id)
// ----------------------------------------------------------------------------
// Audit pre-specifies confident matches (4 handoffs). Insert only when:
//   1. The handoff row exists.
//   2. The PCF process row exists.
//   3. No existing handoff_processes row already covers (handoff_id, process_id).
// Handoff 1039 already has handoff_processes row 572 (process_id=409, a different
// PCF), so the audit's proposed (1039, 491) row is OUT OF SCOPE for this technical
// pass: changing the existing row's process_id is a judgment call left to the user.

const handoffProcessProposals = [
  { handoff_id: 1043, process_id: 1390, proposal_source: "agent_curated", role: "implements" },
  { handoff_id: 1042, process_id: 1401, proposal_source: "agent_curated", role: "implements" },
  { handoff_id: 1039, process_id: 491,  proposal_source: "agent_curated", role: "implements" },
  { handoff_id: 1045, process_id: 354,  proposal_source: "agent_curated", role: "implements" },
];

async function applyHandoffProcesses() {
  console.log("\n== B1-H1: handoff_processes (APQC PCF tagging) ==");
  const handoffIds = handoffProcessProposals.map(p => p.handoff_id);
  const processIds = handoffProcessProposals.map(p => p.process_id);
  const handoffs = await get(
    `/handoffs?id=in.(${handoffIds.join(",")})&select=id`,
  );
  const processes = await get(
    `/processes?id=in.(${processIds.join(",")})&select=id`,
  );
  const handoffSet = new Set(handoffs.map(r => Number(r.id)));
  const processSet = new Set(processes.map(r => Number(r.id)));
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=handoff_id,process_id`,
  );
  const existingPairs = new Set(
    existing.map(r => `${Number(r.handoff_id)}::${Number(r.process_id)}`),
  );
  const existingByHandoff = new Map<number, number[]>();
  for (const r of existing) {
    const hid = Number(r.handoff_id);
    if (!existingByHandoff.has(hid)) existingByHandoff.set(hid, []);
    existingByHandoff.get(hid)!.push(Number(r.process_id));
  }

  const toInsert: Row[] = [];
  for (const p of handoffProcessProposals) {
    if (!handoffSet.has(p.handoff_id)) {
      console.log(`  SKIP handoff ${p.handoff_id}: missing handoff row`);
      continue;
    }
    if (!processSet.has(p.process_id)) {
      console.log(`  SKIP handoff ${p.handoff_id}: process ${p.process_id} missing`);
      continue;
    }
    const pairKey = `${p.handoff_id}::${p.process_id}`;
    if (existingPairs.has(pairKey)) {
      console.log(`  SKIP handoff ${p.handoff_id}: pair (handoff,process)=(${p.handoff_id},${p.process_id}) already present`);
      continue;
    }
    const otherForHandoff = existingByHandoff.get(p.handoff_id) ?? [];
    if (otherForHandoff.length > 0) {
      // Pre-existing PCF on this handoff with a different process_id. Adding ours
      // creates a second tag. That is a judgment call (which PCF is canonical),
      // not a technical fix. Skip to avoid silently double-tagging.
      console.log(
        `  SKIP handoff ${p.handoff_id}: already tagged with process(es) [${otherForHandoff.join(",")}]; ` +
        `proposed ${p.process_id} differs - leaving for user judgment`,
      );
      continue;
    }
    toInsert.push(p as unknown as Row);
  }

  if (toInsert.length === 0) {
    console.log(`  nothing to insert`);
    return;
  }
  console.log(`  inserting ${toInsert.length} handoff_processes rows`);
  const inserted = await post("/handoff_processes", toInsert);
  console.log(`  inserted ids: ${inserted.map(r => r.id).join(", ")}`);
}

// ----------------------------------------------------------------------------
// main
// ----------------------------------------------------------------------------

async function main() {
  console.log("PORT-MONIT B1 technical fixes — 2026-05-31");
  await applyUserEdges();
  await applyLifecycleStateModuleId();
  await applyHandoffProcesses();
  console.log("\nDone.");
}

await main();
