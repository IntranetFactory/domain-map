#!/usr/bin/env bun
// Final cleanup: resolve the 9 domains that still have two owner rows after
// the OLD→NEW migration. For each, decide which owner is more correct and
// delete the other. The rule is "more-specific sub-function wins" except
// where the OLD-derived migration target was a poor concept fit
// (Total Rewards → Benefits Administration is wrong for COMP-MGMT;
// Controllership → Accounting is okay for ERP-FIN but Expense Management
// belongs under AP, not Controllership/Accounting).

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

// (domain_id, business_function_id_to_DELETE, reason)
type Resolution = { domain: number; deleteFn: number; reason: string };

const resolutions: Resolution[] = [
  { domain: 57, deleteFn: 3,  reason: "LMS: keep L&D (specific) over HR (top-level)" },
  { domain: 64, deleteFn: 3,  reason: "VMS: keep Procurement (correct for contingent workforce sourcing) over HR (top-level)" },
  { domain: 29, deleteFn: 4,  reason: "AP-AUTO: keep Accounts Payable (specific) over Finance (top-level)" },
  { domain: 61, deleteFn: 3,  reason: "BEN-ADMIN: keep Benefits Administration (specific) over HR (top-level)" },
  { domain: 56, deleteFn: 3,  reason: "ATS: keep Recruiting (specific) over HR (top-level)" },
  { domain: 65, deleteFn: 4,  reason: "ERP-FIN: keep Accounting (specific) over Finance (top-level)" },
  { domain: 66, deleteFn: 4,  reason: "EPM: keep FP&A (specific) over Finance (top-level)" },

  // COMP-MGMT (60): the OLD migration sent Total Rewards → Benefits Administration,
  // but Compensation Management is not Benefits. Delete the migrated BenAdmin owner;
  // keep top-level HR. Will add a Comp-side sub-function later if needed.
  { domain: 60, deleteFn: 39, reason: "COMP-MGMT: drop wrong-concept Benefits Administration owner; keep HR" },

  // EXPENSE (67): OLD Controllership → Accounting is the wrong home; Expense Management
  // belongs under AP for workflow ownership (Concur/Expensify). Re-point to AP below.
];

// Re-point case (not just delete): EXPENSE owner from Accounting (42) → Accounts Payable (17),
// and remove the Finance (4) duplicate.
async function repointExpense() {
  // First, change the Accounting (42) owner row → AP (17)
  const rows = await call({
    method: "GET",
    path: "/business_function_domains?domain_id=eq.67&responsibility_type=eq.owner&business_function_id=eq.42&select=id",
  });
  if (rows.length === 0) {
    console.log("  ! EXPENSE Accounting-owner row not found, skipping re-point");
    return;
  }
  await call({
    method: "PATCH",
    path: `/business_function_domains?id=eq.${rows[0].id}`,
    body: { business_function_id: 17 },
  });
  console.log("  EXPENSE: re-pointed Accounting owner → Accounts Payable");
  // Then delete the Finance (4) owner row
  await call({
    method: "DELETE",
    path: "/business_function_domains?domain_id=eq.67&responsibility_type=eq.owner&business_function_id=eq.4",
  });
  console.log("  EXPENSE: deleted Finance (top-level) owner duplicate");
}

async function main() {
  console.log("=== Resolve dual-owner rows ===");
  for (const r of resolutions) {
    await call({
      method: "DELETE",
      path: `/business_function_domains?domain_id=eq.${r.domain}&responsibility_type=eq.owner&business_function_id=eq.${r.deleteFn}`,
    });
    console.log(`  domain_id=${r.domain}: ${r.reason}`);
  }

  console.log("\n=== Re-point EXPENSE (67) owner: Accounting → Accounts Payable ===");
  await repointExpense();

  console.log("\n=== Final audit: domains with >1 owner row ===");
  const owners = await call({
    method: "GET",
    path: "/business_function_domains?responsibility_type=eq.owner&select=domain_id,business_function_id&limit=10000",
  });
  const byDomain = new Map<number, number[]>();
  for (const r of owners) {
    const d = Number(r.domain_id);
    if (!byDomain.has(d)) byDomain.set(d, []);
    byDomain.get(d)!.push(Number(r.business_function_id));
  }
  const dups = [...byDomain.entries()].filter(([_, v]) => v.length > 1);
  console.log(`  domains with >1 owner row: ${dups.length}`);
  for (const [d, v] of dups) console.log(`    domain_id=${d} owners=${v.join(",")}`);

  const finalCounts = {
    business_functions_total: (await call({ method: "GET", path: "/business_functions?select=id&limit=10000" })).length,
    business_function_domains_total: (await call({ method: "GET", path: "/business_function_domains?select=id&limit=10000" })).length,
    domains_total: (await call({ method: "GET", path: "/domains?select=id&limit=10000" })).length,
    owner_rows_total: owners.length,
    domains_with_owner: byDomain.size,
  };
  console.log("\n=== Final counts ===");
  console.log(JSON.stringify(finalCounts, null, 2));
}

await main();
