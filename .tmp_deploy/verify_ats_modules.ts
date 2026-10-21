#!/usr/bin/env bun
// verify_ats_modules.ts — sanity-check the ATS module load (plan-modules.md §11 step 3).

export {};

type Row = Record<string, unknown>;

async function get(path: string): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify({ method: "GET", path })),
    stdout: "pipe",
    stderr: "pipe",
  });
  const text = await new Response(proc.stdout).text();
  await proc.exited;
  return JSON.parse(text.trim() || "[]");
}

const codes: Record<number, string> = {
  1: "CANDIDATE-CRM",
  2: "TALENT-POOLS",
  3: "REFERRALS",
  4: "RECRUITMENT-PIPELINE",
  5: "INTERVIEWS",
  6: "OFFERS",
  7: "BACKGROUND-CHECKS",
  8: "PRE-EMPLOYEE-RECORD",
};

const mdo: Row[] = await get(
  "/domain_module_data_objects?domain_module_id=in.(1,2,3,4,5,6,7,8)&select=domain_module_id,role,necessity",
);
const mc: Row[] = await get(
  "/domain_module_capabilities?domain_module_id=in.(1,2,3,4,5,6,7,8)&select=domain_module_id",
);

console.log("MODULE DATA OBJECTS:");
for (const m of [1, 2, 3, 4, 5, 6, 7, 8]) {
  const rows = mdo.filter((r) => r.domain_module_id === m);
  const byRole: Record<string, number> = {};
  for (const r of rows) {
    const k = `${r.role}/${r.necessity}`;
    byRole[k] = (byRole[k] ?? 0) + 1;
  }
  const code = `ATS-${codes[m]}`.padEnd(24);
  const breakdown = Object.entries(byRole)
    .map(([k, v]) => `${v}×${k}`)
    .join(", ");
  console.log(`  ${code} ${String(rows.length).padStart(2)} rows  ${breakdown}`);
}
console.log(`  TOTAL: ${mdo.length}`);
console.log("");
console.log("CAPABILITY JUNCTIONS:");
for (const m of [1, 2, 3, 4, 5, 6, 7, 8]) {
  const n = mc.filter((r) => r.domain_module_id === m).length;
  const code = `ATS-${codes[m]}`.padEnd(24);
  console.log(`  ${code} ${n} capability rows`);
}
console.log(`  TOTAL: ${mc.length}`);
