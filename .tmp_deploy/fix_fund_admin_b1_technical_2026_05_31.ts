#!/usr/bin/env bun
// FUND-ADMIN B1 technical residual fixes (2026-05-31).
// Continuation pass: applies only the strictly-technical items the audit
// pre-specifies enough to deploy without further user judgment.
//
// In scope (per the residual-pass classification):
//   - B1-S4: PATCH domain_module_id on existing lifecycle states for funds,
//            lp_commitments, fund_distributions (state IDs + target modules
//            named explicitly in the audit).
//   - B1-M2: INSERT domain_regulations rows for AIFMD (41) and FATCA (50)
//            against FUND-ADMIN (160). Both regulations already exist in the
//            catalog; SEC-MKT-RULE / ILPA / CRS / Cayman do not, so they are
//            deferred as new-entity work.
//   - B1-S3: INSERT data_object_relationships user-edges (Rule #10) for the
//            actor roles the audit pre-specifies on 6 masters.
//   - B1-H1: INSERT handoff_processes for the 4 agent_curated proposals where
//            the audit pre-specifies handoff_id + a resolvable PCF process_id
//            (1041->1480, 1042->1422, 1043->56, 1038->310). Low-confidence /
//            verify-pending proposals (1040 H1a, 1044 H1e, 1046 H1g) are
//            deferred.
//
// Deferred (not in this loader):
//   - B1-M1 (new regulations), B1-W1..W4 (new data_objects)
//   - B1-S1 (catalog UX, Rule #20)
//   - B1-S2 (pattern flag flips, user decision)
//   - B1-S5 (report-only on RE-INVEST side)
//   - B1-L1..L7 (new lifecycle states + trigger events)
//   - B1-B9b (intra-domain handoffs; needs trigger_event resolution)
//   - Bucket 2 (judgment) + Bucket 3 (Phase 0 candidates)

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

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

// ============================================================
// B1-S4: PATCH domain_module_id on lifecycle states
// ============================================================
// FUND-ADMIN module IDs: FUND-LEDGER=12, LP-COMMITMENTS=13,
// CAPITAL-CALLS=14, DISTRIBUTIONS=15. Audit names the per-master
// attribution: funds->12, lp_commitments->13, fund_distributions->15.

async function applyB1S4(): Promise<void> {
  console.log("[B1-S4] PATCH lifecycle state domain_module_id");

  // funds (data_object_id=755) -> module 12 (FUND-LEDGER)
  const fundsStates = await get(
    "/data_object_lifecycle_states?data_object_id=eq.755&domain_module_id=is.null&select=id,state_name",
  );
  if (fundsStates.length > 0) {
    const ids = fundsStates.map(r => r.id).join(",");
    await patch(
      `/data_object_lifecycle_states?id=in.(${ids})`,
      { domain_module_id: 12 },
    );
    console.log(`  funds: PATCHed ${fundsStates.length} states -> module 12 (FUND-LEDGER)`);
  } else {
    console.log("  funds: nothing to patch");
  }

  // lp_commitments (data_object_id=759) -> module 13 (LP-COMMITMENTS)
  const lpCommitStates = await get(
    "/data_object_lifecycle_states?data_object_id=eq.759&domain_module_id=is.null&select=id,state_name",
  );
  if (lpCommitStates.length > 0) {
    const ids = lpCommitStates.map(r => r.id).join(",");
    await patch(
      `/data_object_lifecycle_states?id=in.(${ids})`,
      { domain_module_id: 13 },
    );
    console.log(`  lp_commitments: PATCHed ${lpCommitStates.length} states -> module 13 (LP-COMMITMENTS)`);
  } else {
    console.log("  lp_commitments: nothing to patch");
  }

  // fund_distributions (data_object_id=368) -> module 15 (DISTRIBUTIONS)
  const distStates = await get(
    "/data_object_lifecycle_states?data_object_id=eq.368&domain_module_id=is.null&select=id,state_name",
  );
  if (distStates.length > 0) {
    const ids = distStates.map(r => r.id).join(",");
    await patch(
      `/data_object_lifecycle_states?id=in.(${ids})`,
      { domain_module_id: 15 },
    );
    console.log(`  fund_distributions: PATCHed ${distStates.length} states -> module 15 (DISTRIBUTIONS)`);
  } else {
    console.log("  fund_distributions: nothing to patch");
  }
}

// ============================================================
// B1-M2: INSERT domain_regulations for existing regulations
// ============================================================
// AIFMD (id 41), FATCA (id 50) exist; link to FUND-ADMIN (160).

async function applyB1M2(): Promise<void> {
  console.log("[B1-M2] INSERT domain_regulations for FUND-ADMIN");

  const existing = await get(
    "/domain_regulations?domain_id=eq.160&regulation_id=in.(41,50)&select=regulation_id",
  );
  const have = new Set(existing.map(r => Number(r.regulation_id)));

  const candidates: Row[] = [
    {
      domain_id: 160,
      regulation_id: 41,           // AIFMD
      applicability: "mandatory",  // EU-domiciled AIFs / depositary + reporting
    },
    {
      domain_id: 160,
      regulation_id: 50,           // FATCA
      applicability: "mandatory",  // funds accepting US-reportable LP capital
    },
  ];
  const toInsert = candidates.filter(c => !have.has(Number(c.regulation_id)));
  if (toInsert.length > 0) {
    await insert("/domain_regulations", toInsert);
    console.log(`  inserted ${toInsert.length} domain_regulations row(s)`);
  } else {
    console.log("  nothing to insert");
  }
}

// ============================================================
// B1-S3: INSERT data_object_relationships user-edges (Rule #10)
// ============================================================
// related_data_object_id = 748 (users, platform_builtin).
// Pattern (matches existing user-edges in the catalog):
//   relationship_type = many_to_many
//   relationship_kind = reference
//   owner_side        = source
//   is_required       = false
// Verbs use parent-voice past participle ("posted by") + active-voice inverse
// ("posts"), mirroring the established convention.

type UserEdge = {
  data_object_id: number;
  relationship_verb: string;
  inverse_verb: string;
};

const userEdges: UserEdge[] = [
  // fund_ledger_entries (756): poster
  { data_object_id: 756, relationship_verb: "posted by",     inverse_verb: "posts" },
  // fund_close_periods (757): closer + approver
  { data_object_id: 757, relationship_verb: "closed by",     inverse_verb: "closes" },
  { data_object_id: 757, relationship_verb: "approved by",   inverse_verb: "approves" },
  // lp_subscriptions (758): onboarder + reviewer
  { data_object_id: 758, relationship_verb: "onboarded by",  inverse_verb: "onboards" },
  { data_object_id: 758, relationship_verb: "reviewed by",   inverse_verb: "reviews" },
  // pcap_statements (760): preparer + approver
  { data_object_id: 760, relationship_verb: "prepared by",   inverse_verb: "prepares" },
  { data_object_id: 760, relationship_verb: "approved by",   inverse_verb: "approves" },
  // capital_call_responses (761): booker
  { data_object_id: 761, relationship_verb: "booked by",     inverse_verb: "books" },
  // waterfall_calculations (762): calculator + approver
  { data_object_id: 762, relationship_verb: "calculated by", inverse_verb: "calculates" },
  { data_object_id: 762, relationship_verb: "approved by",   inverse_verb: "approves" },
];

async function applyB1S3(): Promise<void> {
  console.log("[B1-S3] INSERT data_object_relationships user-edges");

  const masterIds = [...new Set(userEdges.map(e => e.data_object_id))].join(",");
  const existing = await get(
    `/data_object_relationships?related_data_object_id=eq.748&data_object_id=in.(${masterIds})&select=data_object_id,relationship_verb`,
  );
  const have = new Set(
    existing.map(r => `${r.data_object_id}|${r.relationship_verb}`),
  );

  const toInsert: Row[] = userEdges
    .filter(e => !have.has(`${e.data_object_id}|${e.relationship_verb}`))
    .map(e => ({
      data_object_id: e.data_object_id,
      related_data_object_id: 748,
      relationship_type: "many_to_many",
      relationship_kind: "reference",
      relationship_verb: e.relationship_verb,
      inverse_verb: e.inverse_verb,
      owner_side: "source",
      is_required: false,
    }));

  if (toInsert.length > 0) {
    await insert("/data_object_relationships", toInsert);
    console.log(`  inserted ${toInsert.length} user-edge relationship(s)`);
  } else {
    console.log("  all user-edges already present");
  }
}

// ============================================================
// B1-H1: INSERT handoff_processes (agent_curated, high/medium PCFs)
// ============================================================
// Only the proposals where the audit pre-specifies both handoff_id and a
// resolvable PCF process_id are inserted. Low-confidence / verify-pending
// rows (H1a 1040, H1e 1044, H1g 1046) are deferred.

type HandoffProcessProposal = {
  handoff_id: number;
  process_id: number;
};

const hpProposals: HandoffProcessProposal[] = [
  { handoff_id: 1041, process_id: 1480 }, // H1b: capital_call.issued -> PCF 10911
  { handoff_id: 1042, process_id: 1422 }, // H1c: fund_distribution.executed -> PCF 10862
  { handoff_id: 1043, process_id: 56 },   // H1d: portco_valuation.final -> PCF 10730
  { handoff_id: 1038, process_id: 310 },  // H1f: vc_deal.closed -> PCF 10751
];

async function applyB1H1(): Promise<void> {
  console.log("[B1-H1] INSERT handoff_processes (agent_curated)");

  const handoffIds = hpProposals.map(p => p.handoff_id).join(",");
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds})&select=handoff_id,process_id`,
  );
  const have = new Set(
    existing.map(r => `${r.handoff_id}|${r.process_id}`),
  );

  const toInsert: Row[] = hpProposals
    .filter(p => !have.has(`${p.handoff_id}|${p.process_id}`))
    .map(p => ({
      handoff_id: p.handoff_id,
      process_id: p.process_id,
      proposal_source: "agent_curated",
    }));

  if (toInsert.length > 0) {
    await insert("/handoff_processes", toInsert);
    console.log(`  inserted ${toInsert.length} handoff_processes row(s)`);
  } else {
    console.log("  all proposed handoff_processes already present");
  }
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log("FUND-ADMIN B1 technical residual fixes (2026-05-31)");
  console.log("=".repeat(60));
  await applyB1S4();
  await applyB1M2();
  await applyB1S3();
  await applyB1H1();
  console.log("=".repeat(60));
  console.log("done.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
