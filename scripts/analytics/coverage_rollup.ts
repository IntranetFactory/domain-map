// Semantius coverage rollup - per deployable unit (domain + value-stream process).
//
// After the per-domain-skill migration (plans/per-domain-skill-restoration.md), tool requirements
// live on the modules (`domain_module_tools`) and on the value-stream processes (`process_tools`),
// NOT on per-module `skill_tools` (retired). A domain's coverage is the rollup of its modules'
// tool requirements over the domain's PRIMARY modules only, deduped by tool with `required` winning
// over `optional`. A starter that merely embeds a domain entity is a consumer of the market, not a
// contributor, so its tools are NOT rolled into that market's score.
//
// Per-unit metric:
//   % = (count of required tools whose operation_kind ∈ SEMANTIUS_COVERED) / (count of required tools)
//
// NO fallback. A domain whose modules carry zero `domain_module_tools` reads as INCOMPLETE because
// it is incomplete (band M1/F3), not as 0-of-0 "covered". It is surfaced, never silently skipped.
//
// Default: per-domain rollup for every domain that owns or hosts >=1 module, sorted by domain_code.
// Flags:
//   --process      Roll up the value-stream processes (`process_tools`) instead of domains.
//   --diagnostic   Print only units <100% (or incomplete), with the tools dragging them down.
//   --domain CODE  Restrict to one domain_code (ignored with --process).
//   --csv          Machine-readable CSV instead of the human table.
export {};

const args = process.argv.slice(2);
const DIAGNOSTIC = args.includes("--diagnostic");
const CSV = args.includes("--csv");
const PROCESS = args.includes("--process");
const domainIdx = args.indexOf("--domain");
const DOMAIN_FILTER = domainIdx >= 0 ? args[domainIdx + 1] : null;

// Hardcoded Semantius-covered operation_kinds (operation_kind heuristic for "internal-data tools").
// Excluded by design: fetch (external reads), side_effect (external writes), compute (pure
// transforms), inbound (receive-shaped). For per-tool coverage truth read tools.coverage_tier.
const SEMANTIUS_COVERED = new Set(["query", "mutate"]);

type Tool = { id: number; tool_name: string; operation_kind: string };
type TR = { tool_id: number; requirement_level: string };

async function call(body: any): Promise<any[]> {
  const p = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  p.stdin.write(JSON.stringify(body));
  await p.stdin.end();
  const out = await new Response(p.stdout).text();
  const err = await new Response(p.stderr).text();
  await p.exited;
  if (p.exitCode !== 0) throw new Error(`semantius failed (${p.exitCode}): ${err}`);
  return out.trim() ? JSON.parse(out) : [];
}
const get = (path: string) => call({ method: "GET", path });
const LIMIT = 200000;

type Row = { unit: string; label: string; pct: number | null; covered: number; required: number; notCovered: { name: string; kind: string }[] };

// Reduce a set of (tool_id, requirement_level) into the coverage row, deduped by tool_id with
// `required` winning over `optional`.
function rollup(unit: string, label: string, trs: TR[], toolKind: Map<number, string>, toolName: Map<number, string>): Row {
  const level = new Map<number, string>();
  for (const r of trs) {
    const prev = level.get(r.tool_id);
    if (prev !== "required") level.set(r.tool_id, r.requirement_level);
  }
  const required = [...level.entries()].filter(([, lv]) => lv === "required").map(([tid]) => tid);
  const covered = required.filter(tid => SEMANTIUS_COVERED.has(toolKind.get(tid) ?? ""));
  const notCovered = required
    .filter(tid => !SEMANTIUS_COVERED.has(toolKind.get(tid) ?? ""))
    .map(tid => ({ name: toolName.get(tid) ?? `?#${tid}`, kind: toolKind.get(tid) ?? "?" }));
  const pct = required.length ? Math.round((covered.length / required.length) * 100) : null;
  return { unit, label, pct, covered: covered.length, required: required.length, notCovered };
}

async function main() {
  const tools = (await get(`/tools?select=id,tool_name,operation_kind&limit=${LIMIT}`)) as Tool[];
  const toolKind = new Map(tools.map(t => [t.id, t.operation_kind]));
  const toolName = new Map(tools.map(t => [t.id, t.tool_name]));

  const rows: Row[] = [];

  if (PROCESS) {
    const [processes, pt] = await Promise.all([
      get(`/processes?source_framework=eq.custom&select=id,process_key,process_name&limit=${LIMIT}`),
      get(`/process_tools?select=process_id,tool_id,requirement_level&limit=${LIMIT}`) as Promise<(TR & { process_id: number })[]>,
    ]);
    const byProc = new Map<number, TR[]>();
    for (const r of pt) { const a = byProc.get(r.process_id) ?? []; a.push(r); byProc.set(r.process_id, a); }
    for (const p of processes) {
      if (!byProc.has(p.id)) continue; // only value-stream processes that carry tools
      rows.push(rollup(p.process_key, p.process_name, byProc.get(p.id)!, toolKind, toolName));
    }
  } else {
    const [domains, modules, dmt] = await Promise.all([
      get(`/domains?select=id,domain_code,domain_kind&limit=${LIMIT}`),
      get(`/domain_modules?select=id,domain_id&limit=${LIMIT}`),
      get(`/domain_module_tools?select=domain_module_id,tool_id,requirement_level&limit=${LIMIT}`) as Promise<(TR & { domain_module_id: number })[]>,
    ]);
    const domainCode = new Map(domains.map(d => [d.id, d.domain_code]));
    // bundle-domains master nothing; exclude them from the coverage rollup (plan §4). Inert until §3.
    const bundleDomainIds = new Set(domains.filter((d: any) => d.domain_kind === "bundle").map((d: any) => d.id));
    // A market's coverage is computed over its PRIMARY modules only (`domain_modules.domain_id`).
    // A starter that merely embeds one of this domain's entities is a CONSUMER of the market, not a
    // contributor to it (Rule #19: starters never master, only embed); its tools are not this
    // market's tool needs, so they are NOT folded in. This keeps the score a stable property of the
    // market instead of shifting with whatever persona bundle borrows one of its entities.
    const modToDomains = new Map<number, Set<number>>();
    for (const m of modules) { const s = modToDomains.get(m.id) ?? new Set<number>(); if (m.domain_id != null) s.add(m.domain_id); modToDomains.set(m.id, s); }
    // every domain that owns a module is a deployable unit.
    const unitDomains = new Set<number>();
    for (const s of modToDomains.values()) for (const d of s) unitDomains.add(d);
    // domain -> its tool-requirement rows (over its primary modules).
    const trByDomain = new Map<number, TR[]>();
    for (const r of dmt) {
      for (const d of (modToDomains.get(r.domain_module_id) ?? new Set<number>())) {
        const a = trByDomain.get(d) ?? []; a.push(r); trByDomain.set(d, a);
      }
    }
    for (const did of unitDomains) {
      if (bundleDomainIds.has(did)) continue; // exclude bundle-domains (plan §4)
      const code = domainCode.get(did) ?? `?#${did}`;
      if (DOMAIN_FILTER && code !== DOMAIN_FILTER) continue;
      rows.push(rollup(code, code, trByDomain.get(did) ?? [], toolKind, toolName));
    }
  }

  rows.sort((a, b) => a.unit.localeCompare(b.unit));

  if (CSV) {
    console.log(`${PROCESS ? "process_key" : "domain_code"},pct,covered,required`);
    for (const r of rows) console.log(`${r.unit},${r.pct ?? "incomplete"},${r.covered},${r.required}`);
    return;
  }

  console.log(`Unit: ${PROCESS ? "value-stream process (process_tools)" : "domain (domain_module_tools, primary modules)"}`);
  console.log(`Semantius-covered set: { ${[...SEMANTIUS_COVERED].join(", ")} }`);
  console.log(`Mode: ${DIAGNOSTIC ? "diagnostic (<100% / incomplete only)" : "full rollup"}\n`);

  let full = 0, incomplete = 0;
  for (const r of rows) {
    if (r.pct === null) incomplete++;
    if (DIAGNOSTIC && r.pct === 100) { full++; continue; }
    const flag = r.pct === null ? "∅" : r.pct === 100 ? "✅" : "⬇";
    const pctStr = r.pct === null ? "n/a" : `${String(r.pct).padStart(3)}%`;
    let line = `${flag} ${pctStr}  ${r.unit.padEnd(20)} ${r.covered}/${r.required}`;
    if (r.pct === null) line += `   ↳ INCOMPLETE: no required domain_module_tools (band M1/F3)`;
    else if (r.pct < 100) line += `   ↳ NOT covered: ${r.notCovered.map(t => `${t.name}(${t.kind})`).join(", ")}`;
    console.log(line);
  }
  const totalFull = rows.filter(r => r.pct === 100).length;
  if (DIAGNOSTIC) console.log(`\nHidden (100% covered): ${full}`);
  console.log(`\nTotal: ${totalFull}/${rows.length} units at 100% Semantius-covered; ${incomplete} incomplete (no tools).`);
}

await main();
