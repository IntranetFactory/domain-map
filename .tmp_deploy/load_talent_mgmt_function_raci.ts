// Fix 6 (TALENT-MGMT audit, 2026-05-24): C1 - extend RACI beyond the owner row.

type Json = unknown;

async function pg(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: Json): Promise<any> {
  const args: Record<string, unknown> = { method, path };
  if (body !== undefined) args.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(args)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`pg ${method} ${path} failed (${code}): ${err || out}`);
  const trimmed = out.trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed);
}

const DOMAIN_ID = 58;

type Row = { business_function_id: number; responsibility_type: "owner" | "contributor" | "consumer"; notes: string };
const rows: Row[] = [
  {
    business_function_id: 3, // Human Resources
    responsibility_type: "contributor",
    notes: "HR Business Partners co-author succession plans, run review-cycle administration, and support managers through calibration sessions. The umbrella HR function contributes operationally even when Talent Development owns the program.",
  },
  {
    business_function_id: 78, // Compensation
    responsibility_type: "contributor",
    notes: "Compensation consumes calibrated ratings to drive merit cycles and feeds back salary-range / comp-band constraints that shape goal-setting and succession-readiness conversations.",
  },
  {
    business_function_id: 32, // Executive
    responsibility_type: "consumer",
    notes: "Executive leadership consumes the succession bench for critical / leadership-tier roles and reviews 9-box outcomes for senior populations.",
  },
];

async function ensureRow(r: Row) {
  const existing = await pg(
    "GET",
    `/business_function_domains?domain_id=eq.${DOMAIN_ID}&business_function_id=eq.${r.business_function_id}&select=id`,
  );
  if (existing && existing.length) return false;
  await pg("POST", "/business_function_domains", [
    {
      domain_id: DOMAIN_ID,
      business_function_id: r.business_function_id,
      responsibility_type: r.responsibility_type,
      notes: r.notes,
    },
  ]);
  return true;
}

async function main() {
  let inserted = 0, skipped = 0;
  for (const r of rows) {
    if (await ensureRow(r)) inserted++;
    else skipped++;
  }
  console.log(`business_function_domains: ${inserted} inserted, ${skipped} already present`);
}

await main();
