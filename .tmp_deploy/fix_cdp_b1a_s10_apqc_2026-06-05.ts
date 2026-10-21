#!/usr/bin/env bun
// B1A-S10: APQC PCF tagging of CDP cross-domain handoffs (H1).
// 5 REPLACE (PATCH existing wrong substring rows to the correct L2/L3 + agent_curated),
// 1 FLIP (handoff 77: discovery_override -> agent_curated, keep process 196),
// 16 INSERT (new agent_curated rows), 1 NO-OP (handoff 89, already correct).
//
// All authored/updated rows: role='implements', proposal_source='agent_curated',
// record_status omitted on inserts (DB default 'new'). Composed key (handoff_id, process_id)
// prevents duplicates. PCF process ids resolved live below against actual catalog rows
// (the audit's proposed external_ids were stale; these are the real best-fit L2/L3 matches).
// Idempotent; safe to re-run.

type Json = any;

async function semantius(method: string, path: string, body?: Json): Promise<Json> {
  const arg: Json = { method, path };
  if (body !== undefined) arg.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(arg)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius ${method} ${path} failed: ${err || out}`);
  return out.trim() ? JSON.parse(out) : null;
}

// PCF process ids resolved live from the catalog (verified before authoring this loader):
//  148 Manage customers and accounts (10183, L3)
//  132 Design and manage customer loyalty program (18924, L3)
//   25 Develop and manage sales plans (10105, L2)
//  136 Develop and manage promotional activities (20010, L3)
//  196 Manage customer service problems, requests, and inquiries (10388, L3)
//  100 Develop customer experience strategy (19959, L3)
//  115 Manage product and service master data (11740, L3)
//  150 Manage sales orders (10185, L3)
//  138 Analyze and respond to customer insight (16613, L3)
//   20 Develop products and services (10062, L2)
const P = {
  customers_accounts: 148,
  loyalty: 132,
  sales_plans: 25,
  promotional: 136,
  service_problems: 196,
  cx_strategy: 100,
  master_data: 115,
  sales_orders: 150,
  customer_insight: 138,
  products_services: 20,
} as const;

// REPLACE: PATCH the existing (wrong) handoff_processes row in place.
// {row_id, handoff_id, new_process_id}
const REPLACE: { row_id: number; handoff_id: number; new_process_id: number }[] = [
  { row_id: 73, handoff_id: 68, new_process_id: P.customers_accounts }, // was 797
  { row_id: 81, handoff_id: 78, new_process_id: P.loyalty }, // was 133
  { row_id: 82, handoff_id: 80, new_process_id: P.promotional }, // was 133
  { row_id: 83, handoff_id: 478, new_process_id: P.loyalty }, // was 133
  { row_id: 148, handoff_id: 480, new_process_id: P.cx_strategy }, // was 1814 (L5)
];

// FLIP: keep process 196, change proposal_source only.
const FLIP: { row_id: number; handoff_id: number }[] = [{ row_id: 76, handoff_id: 77 }];

// INSERT: new agent_curated rows. Composed key (handoff_id, process_id).
const INSERT: { handoff_id: number; process_id: number }[] = [
  { handoff_id: 79, process_id: P.sales_plans },
  { handoff_id: 479, process_id: P.service_problems },
  { handoff_id: 481, process_id: P.master_data },
  { handoff_id: 529, process_id: P.cx_strategy },
  { handoff_id: 69, process_id: P.promotional },
  { handoff_id: 74, process_id: P.promotional },
  { handoff_id: 75, process_id: P.cx_strategy },
  { handoff_id: 76, process_id: P.sales_orders },
  { handoff_id: 997, process_id: P.products_services },
  { handoff_id: 508, process_id: P.promotional },
  { handoff_id: 504, process_id: P.cx_strategy },
  { handoff_id: 717, process_id: P.master_data },
  { handoff_id: 809, process_id: P.cx_strategy },
  { handoff_id: 810, process_id: P.cx_strategy },
  { handoff_id: 272, process_id: P.master_data },
  { handoff_id: 1004, process_id: P.products_services },
];

async function main() {
  console.log("=== B1A-S10: APQC PCF tagging of CDP cross-domain handoffs ===");

  // Pre-flight: confirm all referenced process ids exist and are real PCF rows.
  const procIds = [...new Set([...REPLACE.map((r) => r.new_process_id), ...INSERT.map((r) => r.process_id), 196])];
  const procs = await semantius(
    "GET",
    `/processes?id=in.(${procIds.join(",")})&select=id,process_name,external_id,hierarchy_level`,
  );
  const procMap = new Map<number, any>(procs.map((p: any) => [p.id, p]));
  for (const id of procIds) {
    if (!procMap.has(id)) throw new Error(`process id ${id} does not exist`);
  }

  // --- REPLACE (PATCH in place) ---
  for (const r of REPLACE) {
    await semantius(
      "PATCH",
      `/handoff_processes?id=eq.${r.row_id}`,
      { process_id: r.new_process_id, proposal_source: "agent_curated", role: "implements" },
    );
    const p = procMap.get(r.new_process_id);
    console.log(
      `  REPLACE row ${r.row_id} (handoff ${r.handoff_id}) -> process ${r.new_process_id} ` +
        `[${p.process_name} / ${p.external_id} / L${p.hierarchy_level}], proposal_source=agent_curated`,
    );
  }

  // --- FLIP (proposal_source only) ---
  for (const f of FLIP) {
    await semantius(
      "PATCH",
      `/handoff_processes?id=eq.${f.row_id}`,
      { proposal_source: "agent_curated" },
    );
    console.log(`  FLIP row ${f.row_id} (handoff ${f.handoff_id}) discovery_override -> agent_curated (process 196 kept)`);
  }

  // --- INSERT (dedup by composed key) ---
  const handoffIds = INSERT.map((r) => r.handoff_id);
  const existing = await semantius(
    "GET",
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=handoff_id,process_id`,
  );
  const existingKeys = new Set(existing.map((r: any) => `${r.handoff_id}|${r.process_id}`));
  const toInsert = INSERT.filter((r) => !existingKeys.has(`${r.handoff_id}|${r.process_id}`)).map((r) => ({
    handoff_id: r.handoff_id,
    process_id: r.process_id,
    role: "implements",
    proposal_source: "agent_curated",
  }));
  if (toInsert.length) {
    const CHUNK = 50;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      await semantius("POST", "/handoff_processes", toInsert.slice(i, i + CHUNK));
    }
    console.log(`  +${toInsert.length} INSERT handoff_processes rows`);
  } else {
    console.log("  INSERT rows already present, no inserts");
  }

  // --- Verification ---
  console.log("\n=== Verification (all 23 CDP cross-domain handoffs) ===");
  const all = await semantius(
    "GET",
    `/handoff_processes?handoff_id=in.(68,78,79,80,478,479,480,481,529,69,74,75,76,77,89,997,508,504,717,809,810,272,1004)` +
      `&select=handoff_id,process_id,proposal_source,record_status,process:processes(process_name,external_id,hierarchy_level)&order=handoff_id.asc`,
  );
  const bySource: Record<string, number> = {};
  for (const r of all) {
    bySource[r.proposal_source] = (bySource[r.proposal_source] ?? 0) + 1;
    const p = r.process;
    console.log(
      `  handoff ${r.handoff_id} -> ${r.process_id} [${p?.process_name} / L${p?.hierarchy_level}] ` +
        `(${r.proposal_source}, ${r.record_status})`,
    );
  }
  console.log(`\n  total rows: ${all.length}; by proposal_source:`, bySource);
  console.log("UI: https://tests.semantius.app/domain_map/handoff_processes");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
