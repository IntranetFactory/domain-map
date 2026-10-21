// SALES-PERF B1 technical fixes (2026-05-31).
//
// Applies only the truly-technical B1 items from audits/SALES-PERF.md whose
// audit pre-specifies (handoff_id, process_id) tuples. Everything else in
// the audit (catalog UX per Rule #20, 8 new modules, missing master entities
// B1-V1..V7, B10b FK backfill gated on B1-M1) is deferred per the brief.
//
// Fix: B1-H1, INSERT 3 handoff_processes rows.
//   (handoff_id=202, process_id=713, proposal_source='agent_curated')
//   (handoff_id=203, process_id=713, proposal_source='agent_curated')
//   (handoff_id=208, process_id=713, proposal_source='agent_curated')
//
// record_status omitted, defaults to 'new' per Rule #1.
// role omitted, defaults to 'implements' (only allowed value).
// notes omitted per Rule #15.

const HANDOFFS = [202, 203, 208] as const;
const PROCESS_ID = 713;

type ExistingRow = {
  id: number;
  handoff_id: number;
  process_id: number;
  proposal_source: string;
};

async function semantius(args: string[]): Promise<string> {
  const proc = Bun.spawn(["semantius", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  await proc.exited;
  if (proc.exitCode !== 0) {
    throw new Error(
      `semantius exit ${proc.exitCode}\nargs: ${args.join(" ")}\nstdout: ${stdout}\nstderr: ${stderr}`,
    );
  }
  return stdout;
}

async function readExisting(): Promise<ExistingRow[]> {
  const out = await semantius([
    "call",
    "crud",
    "postgrestRequest",
    JSON.stringify({
      method: "GET",
      path: `/handoff_processes?select=id,handoff_id,process_id,proposal_source&handoff_id=in.(${HANDOFFS.join(",")})&process_id=eq.${PROCESS_ID}`,
    }),
  ]);
  return JSON.parse(out);
}

async function verifyHandoffsExist(): Promise<void> {
  const out = await semantius([
    "call",
    "crud",
    "postgrestRequest",
    JSON.stringify({
      method: "GET",
      path: `/handoffs?select=id,target_domain_id&id=in.(${HANDOFFS.join(",")})`,
    }),
  ]);
  const rows = JSON.parse(out) as { id: number; target_domain_id: number }[];
  const seen = new Set(rows.map((r) => r.id));
  for (const h of HANDOFFS) {
    if (!seen.has(h)) throw new Error(`Handoff ${h} not found`);
  }
  // Confirm all target SALES-PERF (102).
  for (const r of rows) {
    if (r.target_domain_id !== 102) {
      throw new Error(
        `Handoff ${r.id} targets domain ${r.target_domain_id}, expected 102 (SALES-PERF)`,
      );
    }
  }
}

async function verifyProcessExists(): Promise<void> {
  const out = await semantius([
    "call",
    "crud",
    "postgrestRequest",
    JSON.stringify({
      method: "GET",
      path: `/processes?select=id,process_name&id=eq.${PROCESS_ID}`,
    }),
  ]);
  const rows = JSON.parse(out) as { id: number; process_name: string }[];
  if (rows.length !== 1) {
    throw new Error(`Process ${PROCESS_ID} not found`);
  }
  console.log(`  process ${PROCESS_ID} = "${rows[0].process_name}"`);
}

async function insertRow(handoff_id: number): Promise<void> {
  const body = [
    {
      handoff_id,
      process_id: PROCESS_ID,
      proposal_source: "agent_curated",
    },
  ];
  const argJson = JSON.stringify({
    method: "POST",
    path: "/handoff_processes",
    body,
  });
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(argJson);
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  await proc.exited;
  if (proc.exitCode !== 0) {
    throw new Error(
      `INSERT failed for handoff ${handoff_id}\nstdout: ${stdout}\nstderr: ${stderr}`,
    );
  }
  console.log(`  inserted (handoff ${handoff_id}, process ${PROCESS_ID})`);
}

async function main(): Promise<void> {
  console.log("SALES-PERF B1 technical fixes (B1-H1 only)");
  console.log("Verifying preconditions");
  await verifyHandoffsExist();
  await verifyProcessExists();

  const existing = await readExisting();
  const existingKeys = new Set(
    existing.map((r) => `${r.handoff_id}.${r.process_id}`),
  );
  console.log(
    `  existing (handoff,process) tuples on target: ${existing.length}`,
  );

  let inserted = 0;
  let skipped = 0;
  for (const h of HANDOFFS) {
    const key = `${h}.${PROCESS_ID}`;
    if (existingKeys.has(key)) {
      console.log(`  skip (already present): ${key}`);
      skipped++;
      continue;
    }
    await insertRow(h);
    inserted++;
  }

  console.log("");
  console.log(`Result: ${inserted} inserted, ${skipped} skipped (idempotent)`);
  console.log(
    "UI: https://tests.semantius.app/domain_map/handoff_processes",
  );
}

await main();
