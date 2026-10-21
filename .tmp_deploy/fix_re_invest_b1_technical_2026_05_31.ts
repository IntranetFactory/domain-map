#!/usr/bin/env bun
// RE-INVEST (domain id 146) B1 technical fixes, 2026-05-31.
// Apply only the items the audit pre-specifies at row-tuple granularity:
//   1. B1-B7: four user-edges into data_object_relationships against `users` (id 748)
//      (Rule #10 explicit edges).
//   2. B1-H1-a..g: six handoff_processes inserts where the audit names
//      handoff_id + APQC PCF external_id; verifies the PCFs are live before insert.
// Everything else in the audit is deferred (new modules/DMDOs, naming arbitration,
// pattern flags, catalog UX, lifecycle states, skill cleanup, FK backfills all gated
// on B1-M1 cure, regulation linkage candidates) per the agent contract for this run.
//
// Run from project root c:/dev/domain-map:
//   bun run "c:/dev/domain-map/.tmp_deploy/fix_re_invest_b1_technical_2026_05_31.ts"

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

async function post(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  return call({ method: "POST", path, body: rows });
}

// ---------------------------------------------------------------------------
// Step 1: B1-B7 user-edges (Rule #10 first-class platform_builtin edges).
// Audit pre-specifies the four verbs.
// ---------------------------------------------------------------------------

// data_objects ids from the audit and live verification:
//   727 investment_funds, 366 investment_properties,
//   369 property_valuations, 728 limited_partners, 748 users
const USER_EDGES: {
  verb: string;
  inverse: string;
  related_data_object_id: number;
  related_data_object_name: string;
}[] = [
  {
    verb: "manages",
    inverse: "is managed by",
    related_data_object_id: 727,
    related_data_object_name: "investment_funds",
  },
  {
    verb: "acquires",
    inverse: "is acquired by",
    related_data_object_id: 366,
    related_data_object_name: "investment_properties",
  },
  {
    verb: "values",
    inverse: "is valued by",
    related_data_object_id: 369,
    related_data_object_name: "property_valuations",
  },
  {
    verb: "owns",
    inverse: "is owned by",
    related_data_object_id: 728,
    related_data_object_name: "limited_partners",
  },
];

async function loadUserEdges() {
  console.log("\n=== B1-B7: data_object_relationships user-edges ===");
  // Read existing user-edges against the RE-INVEST master set so we never
  // double-insert. The natural key here is (data_object_id, verb, related_data_object_id).
  const existing = await get(
    "/data_object_relationships?data_object_id=eq.748&related_data_object_id=in.(366,727,369,728)&select=id,data_object_id,relationship_verb,related_data_object_id",
  );
  const existingKey = new Set(
    existing.map(
      r => `${r.data_object_id}|${String(r.relationship_verb).toLowerCase()}|${r.related_data_object_id}`,
    ),
  );

  const toInsert: Row[] = [];
  for (const e of USER_EDGES) {
    const k = `748|${e.verb.toLowerCase()}|${e.related_data_object_id}`;
    if (existingKey.has(k)) {
      console.log(`  skip (exists): users ${e.verb} ${e.related_data_object_name}`);
      continue;
    }
    toInsert.push({
      data_object_relationship_label: `users ${e.verb} ${e.related_data_object_name}`,
      data_object_id: 748,
      related_data_object_id: e.related_data_object_id,
      owner_side: "target",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      relationship_verb: e.verb,
      inverse_verb: e.inverse,
      is_required: false,
      // record_status defaults to "new" (Rule #1 + Rule #15: don't write notes).
    });
  }
  if (toInsert.length === 0) {
    console.log("  no new user-edges to insert.");
    return;
  }
  const inserted = await post("/data_object_relationships", toInsert);
  console.log(`  inserted ${inserted.length} user-edge rows.`);
  for (const r of inserted) {
    console.log(`    id=${r.id} ${r.data_object_relationship_label}`);
  }
}

// ---------------------------------------------------------------------------
// Step 2: B1-H1 handoff_processes inserts (audit pre-specifies handoff_id +
// APQC PCF external_id). PCF ids are verified live before insert; existing
// rows on the same (handoff_id, process_id) tuple are skipped per the
// catalog's unique `key` constraint.
// ---------------------------------------------------------------------------

const H1_PROPOSALS: {
  audit_id: string;
  handoff_id: number;
  pcf_external_id: string; // APQC PCF external_id
}[] = [
  { audit_id: "B1-H1-a", handoff_id: 305, pcf_external_id: "10831" },
  { audit_id: "B1-H1-b", handoff_id: 306, pcf_external_id: "10862" },
  { audit_id: "B1-H1-c", handoff_id: 307, pcf_external_id: "10893" },
  { audit_id: "B1-H1-d", handoff_id: 863, pcf_external_id: "10803" },
  { audit_id: "B1-H1-f", handoff_id: 301, pcf_external_id: "10800" },
  { audit_id: "B1-H1-g", handoff_id: 857, pcf_external_id: "10955" },
  // B1-H1-e (303 -> 1511) is already present (id 454, agent_curated).
  // B1-H1-h (862) is already tagged (id 192).
  // B1-H1-i (859) deferred per audit (no clean APQC PCF match).
];

async function loadHandoffProcesses() {
  console.log("\n=== B1-H1: handoff_processes (agent_curated) ===");

  // Resolve PCF external_ids -> processes.id.
  const externalIds = [...new Set(H1_PROPOSALS.map(p => p.pcf_external_id))];
  const pcfRows = await get(
    `/processes?external_id=in.(${externalIds.join(",")})&source_framework=eq.apqc_pcf_cross_industry&select=id,external_id`,
  );
  const pcfByExt = new Map<string, number>();
  for (const r of pcfRows) {
    pcfByExt.set(String(r.external_id), Number(r.id));
  }
  const missingPcf = externalIds.filter(x => !pcfByExt.has(x));
  if (missingPcf.length > 0) {
    throw new Error(
      `PCF external_ids not resolvable in /processes: ${missingPcf.join(", ")}`,
    );
  }

  // Verify handoffs all exist.
  const handoffIds = [...new Set(H1_PROPOSALS.map(p => p.handoff_id))];
  const handoffRows = await get(
    `/handoffs?id=in.(${handoffIds.join(",")})&select=id`,
  );
  const liveHandoffs = new Set(handoffRows.map(r => Number(r.id)));
  const missingH = handoffIds.filter(x => !liveHandoffs.has(x));
  if (missingH.length > 0) {
    throw new Error(`handoffs not found: ${missingH.join(", ")}`);
  }

  // Existing handoff_processes rows for these handoffs.
  const existingRows = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=handoff_id,process_id`,
  );
  const existingKey = new Set(
    existingRows.map(r => `${r.handoff_id}.${r.process_id}`),
  );

  const toInsert: Row[] = [];
  for (const p of H1_PROPOSALS) {
    const process_id = pcfByExt.get(p.pcf_external_id)!;
    const key = `${p.handoff_id}.${process_id}`;
    if (existingKey.has(key)) {
      console.log(
        `  skip (exists): ${p.audit_id} handoff ${p.handoff_id} -> process ${process_id}`,
      );
      continue;
    }
    toInsert.push({
      handoff_id: p.handoff_id,
      process_id,
      role: "implements",
      proposal_source: "agent_curated",
      // record_status defaults to "new" (Rule #1).
      // notes default "" (Rule #15).
    });
  }
  if (toInsert.length === 0) {
    console.log("  no new handoff_processes rows to insert.");
    return;
  }
  const inserted = await post("/handoff_processes", toInsert);
  console.log(`  inserted ${inserted.length} handoff_processes rows.`);
  for (const r of inserted) {
    console.log(`    id=${r.id} handoff=${r.handoff_id} process=${r.process_id} source=${r.proposal_source}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

await loadUserEdges();
await loadHandoffProcesses();

console.log("\nDone. UI spot-check:");
console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
console.log("  https://tests.semantius.app/domain_map/handoff_processes");
