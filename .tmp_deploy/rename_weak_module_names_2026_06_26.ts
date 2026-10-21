// One-off: disambiguate weak `domain_module_name` values (M10) on 10 modules.
// Renames only; record_status untouched (Rule #1). Idempotent: re-running re-PATCHes
// the same target value. Surfaced and approved per-name before this ran.
//
// Run: bun run "c:/dev/domain-map/.tmp_deploy/rename_weak_module_names_2026_06_26.ts"

async function semantius(method: string, path: string, body?: unknown): Promise<unknown> {
  const args = JSON.stringify({ method, path, body });
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  await proc.exited;
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  if (proc.exitCode !== 0) throw new Error(`semantius ${method} ${path} failed: ${err}`);
  return out.trim() ? JSON.parse(out) : null;
}

const RENAMES: { code: string; name: string }[] = [
  { code: "ATS-INTERVIEWS", name: "Candidate Interviews" },
  { code: "ATS-OFFERS", name: "Job Offers" },
  { code: "ATS-TALENT-POOLS", name: "Candidate Talent Pools" },
  { code: "CLM-RENEWAL", name: "Contract Renewal Management" },
  { code: "INTGOV-GOVERNANCE", name: "Intranet Content Governance and Lifecycle" },
  { code: "INTGOV-INVENTORY", name: "Intranet Content Inventory and Sources" },
  { code: "ITSM-AGENT-WORKSPACE", name: "Service Agent Workspace and Reporting" },
  { code: "ITSM-KNOWLEDGE", name: "IT Knowledge Management" },
  { code: "SVCS-PROC-SETTLEMENT", name: "Services Milestone Delivery and Settlement" },
  { code: "WORK-MGMT-INTAKE", name: "Work Request Intake" },
];

let patched = 0;
for (const r of RENAMES) {
  const res = (await semantius(
    "PATCH",
    `/domain_modules?domain_module_code=eq.${r.code}`,
    { domain_module_name: r.name },
  )) as { domain_module_code: string; domain_module_name: string }[] | null;
  const got = Array.isArray(res) && res.length ? res[0].domain_module_name : "(no row returned)";
  console.log(`  ${r.code.padEnd(24)} -> ${got}`);
  if (Array.isArray(res) && res.length) patched++;
}
console.log(`\nPatched ${patched}/${RENAMES.length} module names.`);
