// HCM audit C1 fix — add business_function_domains rows for HCM (domain_id=54).
// Idempotent: re-runs are safe (skips rows already present matching domain+function).
// Run from project root: bun run .tmp_deploy/fix_hcm_c1_2026_05_24.ts [--dry-run]

const DRY = process.argv.includes("--dry-run");

async function call(tool: string, payload: unknown): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], {
    stdin: new Response(JSON.stringify(payload)), stdout: "pipe", stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${tool} (${code}): ${(stderr || stdout).slice(0, 500)}`);
  return stdout.trim() ? JSON.parse(stdout) : null;
}

type Row = {
  business_function_id: number;
  business_function_name: string;
  responsibility_type: "owner" | "contributor" | "consumer";
  notes: string;
};

const HCM_ID = 54;

const PROPOSED: Row[] = [
  {
    business_function_id: 27, business_function_name: "IT Operations", responsibility_type: "contributor",
    notes: "Owns offboarding service-request fan-out, asset-recall workflow, and downstream IGA provisioning driven by HCM lifecycle events.",
  },
  {
    business_function_id: 4, business_function_name: "Finance", responsibility_type: "contributor",
    notes: "Owns the cost-center spine that HCM org_units align to; consumes headcount actuals for FP&A and budget consolidation.",
  },
  {
    business_function_id: 7, business_function_name: "Legal", responsibility_type: "contributor",
    notes: "Owns employment-contract templates and employment-law policy; issues legal holds and records employee-related advice tied to HCM identity.",
  },
  {
    business_function_id: 38, business_function_name: "Payroll", responsibility_type: "contributor",
    notes: "Consumes employment_contract executed/amended/expired events for pay basis; publishes pay_cycle.closed back to HCM. HR sub-function with embedded comp slice on the worker record.",
  },
  {
    business_function_id: 32, business_function_name: "Executive", responsibility_type: "consumer",
    notes: "Reads org-design, headcount, and span-of-control analytics for executive reporting and operating-rhythm reviews.",
  },
  {
    business_function_id: 31, business_function_name: "Governance, Risk and Compliance", responsibility_type: "consumer",
    notes: "Reads compliance-training completion, policy-attestation status, and HR-case audit trail to support the GRC control framework.",
  },
];

// Pre-flight: pull existing rows to dedupe.
const existing: { business_function_id: number; responsibility_type: string }[] = await call(
  "postgrestRequest",
  { method: "GET", path: `/business_function_domains?domain_id=eq.${HCM_ID}&select=business_function_id,responsibility_type` },
);
const existingKey = new Set(existing.map(r => `${r.business_function_id}:${r.responsibility_type}`));

const toInsert = PROPOSED.filter(r => !existingKey.has(`${r.business_function_id}:${r.responsibility_type}`));

console.log(`HCM C1 fix: ${PROPOSED.length} proposed, ${existing.length} already present, ${toInsert.length} to insert.`);
for (const r of toInsert) {
  console.log(`  + ${r.business_function_name} (id=${r.business_function_id}) as ${r.responsibility_type}`);
}

if (DRY) {
  console.log("\n[dry-run] no writes.");
  process.exit(0);
}

if (toInsert.length === 0) {
  console.log("Nothing to insert. Done.");
  process.exit(0);
}

const body = toInsert.map(r => ({
  domain_id: HCM_ID,
  business_function_id: r.business_function_id,
  responsibility_type: r.responsibility_type,
  notes: r.notes,
}));

const result = await call("postgrestRequest", {
  method: "POST",
  path: "/business_function_domains",
  headers: { Prefer: "return=representation" },
  body,
});

console.log(`\nInserted ${Array.isArray(result) ? result.length : 0} rows.`);
console.log("UI: https://tests.semantius.app/domain_map/business_function_domains");
