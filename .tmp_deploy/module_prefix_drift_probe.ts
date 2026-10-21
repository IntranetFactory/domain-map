// Read-only diagnostic: find domain_modules whose domain_module_code prefix
// does not match the code of the domain that hosts them (primary domain_id).
// Surfaces stale prefixes left behind by domain renames (e.g. VMS -> CWM).

async function pg(path: string): Promise<any[]> {
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify({ method: "GET", path })],
    { stdout: "pipe", stderr: "pipe" },
  );
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) throw new Error(`semantius failed for ${path}: ${err}`);
  return JSON.parse(out);
}

const domains = await pg("/domains?select=domain_code&limit=5000");
const liveCodes: string[] = domains.map((d) => d.domain_code);
const liveSet = new Set(liveCodes);

const mods = await pg(
  "/domain_modules?select=domain_module_code,module_kind,domain_id,domains(domain_code)&order=domain_id.asc&limit=5000",
);

// longest live domain code D such that code === D or code starts with "D-"
function bestLivePrefix(code: string): string | null {
  let best: string | null = null;
  for (const d of liveCodes) {
    if (code === d || code.startsWith(d + "-")) {
      if (best === null || d.length > best.length) best = d;
    }
  }
  return best;
}

type Row = { code: string; own: string; kind: string; matchedPrefix: string | null };
const noLivePrefix: Row[] = []; // prefix references NO current domain -> rename-drift suspect
const otherDomain: Row[] = []; // prefix is a DIFFERENT live domain -> cross-cutting or misfiled

for (const m of mods) {
  const code: string = m.domain_module_code;
  const own: string = m.domains?.domain_code ?? "(no-primary-domain)";
  const kind: string = m.module_kind;
  if (code === own || code.startsWith(own + "-")) continue; // correctly prefixed
  const matched = bestLivePrefix(code);
  const row: Row = { code, own, kind, matchedPrefix: matched };
  if (matched === null) noLivePrefix.push(row);
  else otherDomain.push(row);
}

console.log(`Total modules scanned: ${mods.length}`);
console.log(`Live domain codes: ${liveCodes.length}\n`);

console.log(`=== GROUP 1: prefix references NO current domain (rename-drift suspects): ${noLivePrefix.length} ===`);
// group by leading token(s) up to first hyphen for readability
const byLead = new Map<string, Row[]>();
for (const r of noLivePrefix) {
  const lead = r.code.split("-")[0];
  if (!byLead.has(lead)) byLead.set(lead, []);
  byLead.get(lead)!.push(r);
}
for (const [lead, rows] of [...byLead.entries()].sort()) {
  console.log(`\n  prefix "${lead}-"  (${rows.length} module${rows.length > 1 ? "s" : ""}):`);
  for (const r of rows) console.log(`    ${r.code}  ->  hosted on ${r.own}  [${r.kind}]`);
}

console.log(`\n=== GROUP 2: prefix is a DIFFERENT live domain (cross-cutting or misfiled): ${otherDomain.length} ===`);
for (const r of otherDomain.sort((a, b) => a.code.localeCompare(b.code))) {
  console.log(`    ${r.code}  ->  hosted on ${r.own}  (prefix matches live domain ${r.matchedPrefix})  [${r.kind}]`);
}
