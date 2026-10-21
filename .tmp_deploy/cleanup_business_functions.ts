#!/usr/bin/env bun
// Cleanup of the pre-existing OLD business_functions taxonomy left behind
// by an earlier abandoned load. Re-points junction rows to the canonical
// new taxonomy, promotes Procurement to top-level, deletes orphan rows,
// and fills in the missing DATA-AI-PLAT RACI.

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

// OLD function id → NEW function id (or null if it should be deleted with no replacement)
const FN_REMAP: Record<number, number> = {
  5:  27,   // Information Technology → IT Operations
  6:  34,   // Operations → Business Operations
  8:  3,    // HR Operations → Human Resources (top-level fold)
  9:  37,   // Talent Acquisition → Recruiting
  10: 39,   // Total Rewards → Benefits Administration (closest concept)
  12: 3,    // HR Business Partner → Human Resources
  13: 3,    // Workforce Planning → Human Resources
  14: 3,    // People Analytics → Human Resources
  15: 42,   // Controllership → Accounting
  16: 43,   // FP&A → Financial Planning and Analysis
};

// DATA-AI-PLAT was the new domain missing a RACI mapping. Add it here.
const DATA_AI_PLAT_RACI = {
  domain_code: "DATA-AI-PLAT",
  owner: "Data and Analytics",
  contributors: ["Software Engineering", "IT Operations"],
  consumers: ["Finance", "Sales", "Marketing", "Business Operations"],
};

async function main() {
  console.log("\n=== Step 1: re-point business_function_domains rows from OLD to NEW function ids ===");
  const allBFD = await call({ method: "GET", path: "/business_function_domains?select=id,business_function_id,domain_id,responsibility_type&limit=10000" });

  // Build a lookup of existing (domain_id, function_id, responsibility_type) to detect duplicates
  const existingKeys = new Set<string>();
  for (const r of allBFD) existingKeys.add(`${r.domain_id}:${r.business_function_id}:${r.responsibility_type}`);

  let migrated = 0;
  let deletedDup = 0;
  for (const r of allBFD) {
    const oldId = Number(r.business_function_id);
    const newId = FN_REMAP[oldId];
    if (newId === undefined) continue; // not an OLD id

    const domainId = Number(r.domain_id);
    const resp = String(r.responsibility_type);
    const newKey = `${domainId}:${newId}:${resp}`;

    if (existingKeys.has(newKey)) {
      // The NEW-taxonomy row already exists. Delete the OLD row.
      await call({ method: "DELETE", path: `/business_function_domains?id=eq.${r.id}` });
      deletedDup++;
    } else {
      // No conflict: re-point the OLD row to the NEW function id.
      await call({
        method: "PATCH",
        path: `/business_function_domains?id=eq.${r.id}`,
        body: { business_function_id: newId },
      });
      existingKeys.add(newKey);
      // Remove the old key from the set
      existingKeys.delete(`${domainId}:${oldId}:${resp}`);
      migrated++;
    }
  }
  console.log(`  migrated ${migrated} rows to new function ids`);
  console.log(`  deleted ${deletedDup} duplicate (OLD-side) rows`);

  console.log("\n=== Step 2: promote Procurement (id 19) to top-level ===");
  await call({
    method: "PATCH",
    path: "/business_functions?id=eq.19",
    body: { parent_business_function_id: null },
  });
  console.log("  Procurement.parent_business_function_id = null");

  console.log("\n=== Step 3: delete orphan OLD function rows ===");
  // Refresh: which OLD ids still have any junction rows?
  const remainingBFD = await call({ method: "GET", path: "/business_function_domains?select=business_function_id&limit=10000" });
  const usedFnIds = new Set(remainingBFD.map(r => Number(r.business_function_id)));
  const oldIds = Object.keys(FN_REMAP).map(Number);
  for (const oldId of oldIds) {
    if (usedFnIds.has(oldId)) {
      console.log(`  ! function id ${oldId} still has junction rows; skipping delete`);
      continue;
    }
    await call({ method: "DELETE", path: `/business_functions?id=eq.${oldId}` });
    console.log(`  deleted business_functions id=${oldId}`);
  }

  console.log("\n=== Step 4: add DATA-AI-PLAT RACI rows ===");
  const fnList = await call({ method: "GET", path: "/business_functions?select=id,business_function_name&limit=10000" });
  const fnId = new Map<string, number>();
  for (const r of fnList) fnId.set(String(r.business_function_name), Number(r.id));

  const dapDomain = await call({ method: "GET", path: "/domains?domain_code=eq.DATA-AI-PLAT&select=id" });
  if (dapDomain.length === 0) {
    console.log("  ! DATA-AI-PLAT not found, skipping");
  } else {
    const domainId = Number(dapDomain[0].id);
    const existing = await call({ method: "GET", path: `/business_function_domains?domain_id=eq.${domainId}&select=business_function_id,responsibility_type` });
    const exSet = new Set(existing.map(r => `${r.business_function_id}:${r.responsibility_type}`));
    const rows: Row[] = [];
    const add = (name: string, resp: "owner" | "contributor" | "consumer") => {
      const id = fnId.get(name);
      if (!id) throw new Error(`Function not found: ${name}`);
      const key = `${id}:${resp}`;
      if (exSet.has(key)) return;
      rows.push({ business_function_id: id, domain_id: domainId, responsibility_type: resp, notes: "" });
    };
    add(DATA_AI_PLAT_RACI.owner, "owner");
    for (const c of DATA_AI_PLAT_RACI.contributors) add(c, "contributor");
    for (const c of DATA_AI_PLAT_RACI.consumers) add(c, "consumer");
    if (rows.length > 0) {
      await call({ method: "POST", path: "/business_function_domains", body: rows });
      console.log(`  inserted ${rows.length} rows for DATA-AI-PLAT`);
    }
  }

  console.log("\n=== Step 5: final audit ===");
  const finalCounts = {
    business_functions_total: (await call({ method: "GET", path: "/business_functions?select=id&limit=10000" })).length,
    business_function_domains_total: (await call({ method: "GET", path: "/business_function_domains?select=id&limit=10000" })).length,
    procurement_parent: (await call({ method: "GET", path: "/business_functions?id=eq.19&select=parent_business_function_id" }))[0],
  };
  console.log(JSON.stringify(finalCounts, null, 2));

  // Multi-owner check
  const allOwners = await call({ method: "GET", path: "/business_function_domains?responsibility_type=eq.owner&select=domain_id,business_function_id&limit=10000" });
  const byDomain = new Map<number, number[]>();
  for (const r of allOwners) {
    const d = Number(r.domain_id);
    if (!byDomain.has(d)) byDomain.set(d, []);
    byDomain.get(d)!.push(Number(r.business_function_id));
  }
  const dups = [...byDomain.entries()].filter(([_, v]) => v.length > 1);
  console.log(`  domains with >1 owner row: ${dups.length}`);
  if (dups.length > 0) {
    for (const [d, v] of dups) console.log(`    domain_id=${d} owners=${v.join(",")}`);
  }
  console.log(`  total owner rows: ${allOwners.length} (should equal ${byDomain.size} = number of domains-with-owner)`);
}

await main();
