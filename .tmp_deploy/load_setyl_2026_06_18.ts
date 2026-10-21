// One-off loader: add Setyl (vendor + solution + solution_domains).
// Idempotent: re-running inserts only what is missing. record_status defaults to "new".
// Run: bun run .tmp_deploy/load_setyl_2026_06_18.ts   (from project root c:/dev/domain-map)

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
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const get = (path: string) => call({ method: "GET", path });

async function insert(path: string, rows: Row[]): Promise<void> {
  if (rows.length === 0) return;
  await call({ method: "POST", path, body: rows });
}

async function syncByKey(path: string, rows: Row[], keyField: string): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=10000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  ${path}: inserting ${missing.length} new (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: all ${rows.length} already present`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// ---- Phase 1: vendor ----
const vendorMap = await syncByKey(
  "/vendors",
  [{
    vendor_name: "Setyl Ltd",
    headquarters_country: "United Kingdom",
    vendor_url: "https://setyl.com",
    description: "Provider of an IT asset, SaaS, and spend management platform aimed at SMB and mid-market organizations.",
  }],
  "vendor_name",
);
const vendorId = vendorMap.get("Setyl Ltd")!;

// ---- Phase 2: solution ----
const solutionMap = await syncByKey(
  "/solutions",
  [{
    solution_name: "Setyl",
    vendor_id: vendorId,
    solution_url: "https://setyl.com",
    is_active_in_market: true,
    description:
      "IT asset, SaaS/license, and spend management platform: tracks hardware and equipment, discovers and manages SaaS subscriptions and licenses, and gives visibility into IT and vendor spend. Aimed at SMB and mid-market IT, finance, and operations teams.",
  }],
  "solution_name",
);
const solutionId = solutionMap.get("Setyl")!;

// ---- Phase 3: solution_domains ----
const coverage: { domain_id: number; domain_name: string; coverage_level: string }[] = [
  { domain_id: 85, domain_name: "SaaS Management Platforms", coverage_level: "primary" },
  { domain_id: 51, domain_name: "Hardware Asset Management", coverage_level: "primary" },
  { domain_id: 52, domain_name: "Software Asset Management", coverage_level: "secondary" },
  { domain_id: 3, domain_name: "IT Asset Management", coverage_level: "secondary" },
  { domain_id: 133, domain_name: "Corporate Spend Management", coverage_level: "partial" },
];

const existingSD = await get(`/solution_domains?solution_id=eq.${solutionId}&select=domain_id`);
const existingDomainIds = new Set(existingSD.map(r => Number(r.domain_id)));
const missingSD = coverage
  .filter(c => !existingDomainIds.has(c.domain_id))
  .map(c => ({
    solution_id: solutionId,
    domain_id: c.domain_id,
    coverage_level: c.coverage_level,
    solution_domain_label: `Setyl / ${c.domain_name}`,
  }));
if (missingSD.length > 0) {
  console.log(`  /solution_domains: inserting ${missingSD.length} new (${existingSD.length} existed)`);
  await insert("/solution_domains", missingSD);
} else {
  console.log(`  /solution_domains: all ${coverage.length} already present`);
}

// ---- Summary ----
const final = await get(
  `/solution_domains?solution_id=eq.${solutionId}&select=coverage_level,record_status,domains(domain_code,domain_name)&order=coverage_level.asc`,
);
console.log(`\nSetyl loaded: vendor_id=${vendorId}, solution_id=${solutionId}`);
console.log("Coverage:");
for (const r of final as any[]) {
  console.log(`  ${r.domains.domain_code.padEnd(11)} ${r.coverage_level.padEnd(10)} [${r.record_status}]`);
}
