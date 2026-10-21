/**
 * §2 of plans/domain-kind-taxonomy-plan.md — READ-ONLY classification probe.
 *
 * For every domain computes (a) master_count = distinct data_object_id with role='master' in
 * domain_module_data_objects joined module->domain via the module's PRIMARY domain_id (plan §2:
 * "joined module->domain, NOT a domains-direct count"), and (b) the set of solution_domains
 * coverage_level values present. Then classifies per the plan §2 rules. Writes NOTHING; surfaces
 * the emerging_market candidates + master=0 review list for user confirmation before any flip.
 *
 * Run: bun run .tmp_deploy/classify_domain_kind_probe_2026_06_16.ts
 */

type CmdResult = { ok: boolean; data: any; stderr: string };
async function call(path: string): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify({ method: "GET", path }));
  proc.stdin.end();
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`GET ${path}: ${err || out}`);
  return out.trim() ? JSON.parse(out.trim()) : [];
}

const [domains, modules, masters, solDomains] = await Promise.all([
  call("/domains?select=id,domain_code,domain_name,domain_kind&limit=10000"),
  call("/domain_modules?select=id,domain_id&limit=20000"),
  call("/domain_module_data_objects?role=eq.master&select=domain_module_id,data_object_id&limit=40000"),
  call("/solution_domains?select=domain_id,coverage_level&limit=40000"),
]);

const modPrimaryDomain = new Map<number, number | null>(modules.map((m: any) => [m.id, m.domain_id]));
const codeById = new Map<number, string>(domains.map((d: any) => [d.id, d.domain_code]));

// domain -> set of mastered data_object_ids (via the module's PRIMARY domain_id)
const mastersByDomain = new Map<number, Set<number>>();
for (const r of masters) {
  const dom = modPrimaryDomain.get(r.domain_module_id);
  if (dom == null) continue;
  if (!mastersByDomain.has(dom)) mastersByDomain.set(dom, new Set());
  mastersByDomain.get(dom)!.add(r.data_object_id);
}
// domain -> set of coverage_level values present
const covByDomain = new Map<number, Set<string>>();
for (const r of solDomains) {
  if (!covByDomain.has(r.domain_id)) covByDomain.set(r.domain_id, new Set());
  if (r.coverage_level) covByDomain.get(r.domain_id)!.add(r.coverage_level);
}

const emerging: string[] = [];        // master>0, only partial (no primary, no secondary)
const secondaryOnly: string[] = [];   // master>0, no primary but has secondary (established; surface)
const masterNoCoverage: string[] = []; // master>0, zero solution_domains (A3 gap; surface)
const zeroMaster: string[] = [];      // master=0 (overlay or unbuilt; review individually)
let cleanEstablished = 0;             // master>0 + has primary (default established_market; no change)

for (const d of domains) {
  const m = mastersByDomain.get(d.id)?.size ?? 0;
  const cov = covByDomain.get(d.id) ?? new Set<string>();
  const label = `${d.domain_code} (m=${m}, cov=[${[...cov].sort().join(",") || "none"}])`;
  if (m === 0) { zeroMaster.push(label); continue; }
  if (cov.has("primary")) { cleanEstablished++; continue; }
  if (cov.has("secondary")) { secondaryOnly.push(label); continue; }
  if (cov.has("partial")) { emerging.push(label); continue; }
  masterNoCoverage.push(label); // master>0 but no coverage rows at all
}

const show = (title: string, arr: string[]) => {
  console.log(`\n${title}: ${arr.length}`);
  for (const x of arr.sort()) console.log(`  ${x}`);
};

console.log(`§2 domain_kind classification probe (READ-ONLY) — ${domains.length} domains`);
console.log(`current domain_kind distribution: ${JSON.stringify(domains.reduce((a: any, d: any) => { a[d.domain_kind] = (a[d.domain_kind] || 0) + 1; return a; }, {}))}`);
console.log(`\nclean established_market (master>0 & >=1 primary; stay default, no change): ${cleanEstablished}`);
show("EMERGING_MARKET candidates (master>0, ONLY partial coverage) -> needs your confirmation to flip", emerging);
show("master>0, secondary-only (no primary) -> stays established_market, surfaced for confirmation", secondaryOnly);
show("master>0, ZERO solution_domains (A3 coverage gap; not an emerging signal per se) -> review", masterNoCoverage);
show("master=0 (overlay OR unbuilt; review individually, plan §2)", zeroMaster);
