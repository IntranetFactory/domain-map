// Read-only report: domains with no capabilities AND/OR no market coverage (solutions/vendors).
// "No vendors" is read via solution_domains -> solutions -> vendors, since vendors attach to
// a domain only through the solution_domains junction.

async function get(path: string): Promise<any> {
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify({ method: "GET", path })],
    { stdout: "pipe", stderr: "pipe" },
  );
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) {
    throw new Error(`semantius failed for ${path}\n${err}\n${out}`);
  }
  // CLI may wrap output; try to find the JSON array/object
  const trimmed = out.trim();
  const start = trimmed.search(/[\[{]/);
  return JSON.parse(start >= 0 ? trimmed.slice(start) : trimmed);
}

const domains: any[] = await get(
  "/domains?select=id,domain_code,domain_name,parent_domain_id,usa_market_size_usd_m&order=domain_code.asc&limit=10000",
);

const capLinks: any[] = await get("/capability_domains?select=domain_id&limit=100000");
const solLinks: any[] = await get(
  "/solution_domains?select=domain_id,solutions(vendor_id)&limit=100000",
);

const hasCap = new Set<number>(capLinks.map((r) => r.domain_id));
const hasSol = new Set<number>(solLinks.map((r) => r.domain_id));
// domains that have at least one solution WITH a vendor attached
const hasVendor = new Set<number>(
  solLinks.filter((r) => r.solutions && r.solutions.vendor_id != null).map((r) => r.domain_id),
);

// child-domain set (so we can flag umbrella parents, which legitimately may delegate)
const isParent = new Set<number>(domains.map((d) => d.parent_domain_id).filter(Boolean));

const rows = domains.map((d) => ({
  code: d.domain_code,
  name: d.domain_name,
  id: d.id,
  cap: hasCap.has(d.id),
  sol: hasSol.has(d.id),
  vendor: hasVendor.has(d.id),
  parent: isParent.has(d.id),
}));

const noCap = rows.filter((r) => !r.cap);
const noVendor = rows.filter((r) => !r.vendor);
const noEither = rows.filter((r) => !r.cap || !r.vendor);
const noBoth = rows.filter((r) => !r.cap && !r.vendor);

console.log(`TOTAL DOMAINS: ${domains.length}`);
console.log(`  with capabilities:     ${rows.filter((r) => r.cap).length}`);
console.log(`  with solutions:        ${rows.filter((r) => r.sol).length}`);
console.log(`  with vendor coverage:  ${rows.filter((r) => r.vendor).length}`);
console.log("");
console.log(`NO CAPABILITIES (${noCap.length}):`);
for (const r of noCap) console.log(`  ${r.parent ? "▸" : " "} ${r.code.padEnd(20)} ${r.name}`);
console.log("");
console.log(`NO VENDOR COVERAGE (${noVendor.length}):`);
for (const r of noVendor) console.log(`  ${r.parent ? "▸" : " "} ${r.code.padEnd(20)} ${r.name}`);
console.log("");
console.log(`COMPLETELY UNRESEARCHED — no capabilities AND no vendors (${noBoth.length}):`);
for (const r of noBoth) console.log(`  ${r.parent ? "▸" : " "} ${r.code.padEnd(20)} ${r.name}`);
console.log("");
console.log(`(▸ = this domain is a parent/umbrella of other domains)`);
console.log(`MISSING EITHER (union, ${noEither.length})`);
