// Semantius coverage rollup - per deployable unit (domain + value-stream process).
//
// After the per-domain-skill migration (plans/per-domain-skill-restoration.md), tool requirements
// live on the modules (`domain_module_tools`) and on the value-stream processes (`process_tools`),
// NOT on per-module `skill_tools` (retired). A domain's coverage is the rollup of its modules'
// tool requirements over the domain's PRIMARY modules only, deduped by tool_id. A starter that merely
// embeds a domain entity is a consumer of the market, not a contributor, so its tools are NOT rolled
// into that market's score.
//
// Per-unit metrics (domain-map-analyst SKILL.md "Semantius score"), over ALL of the unit's distinct
// tools, required and optional, classified by tools.coverage_tier. Each score covers the tiers of the
// one before it plus its own (see SCORES):
//   semantius_score        every semantius* tier                     (Semantius out of the box)
//   semantius_agent_core   + agent_native + agent_common             (+ the agent and the office suite)
//   semantius_agent_first  + agent_first                             (+ agent-ready subscriptions)
// vendor_platform (build or approximate) and external (integration work) are gaps in all three.
//
// NO fallback. A domain whose modules carry zero `domain_module_tools` reads as INCOMPLETE because
// it is incomplete (band M1/F3), not as 0-of-0 "covered". It is surfaced, never silently skipped.
//
// Default: per-domain rollup for every domain that owns or hosts >=1 module, sorted by domain_code.
// Flags:
//   --process      Roll up the value-stream processes (`process_tools`) instead of domains.
//   --diagnostic   Print only units whose semantius_agent_first is <100% (or incomplete).
//   --domain CODE  Restrict to one domain_code (ignored with --process).
//   --csv          Machine-readable CSV instead of the human table.
export {};

const args = process.argv.slice(2);
const DIAGNOSTIC = args.includes("--diagnostic");
const CSV = args.includes("--csv");
const PROCESS = args.includes("--process");
const domainIdx = args.indexOf("--domain");
const DOMAIN_FILTER = domainIdx >= 0 ? args[domainIdx + 1] : null;

// Every semantius* tier (semantius_crud / _workflow / _platform) counts in all three scores.
const isSemantius = (tier: string) => tier.startsWith("semantius");
const SCORES = [
  { key: "semantius_score", agentTiers: new Set<string>() },
  { key: "semantius_agent_core", agentTiers: new Set(["agent_native", "agent_common"]) },
  { key: "semantius_agent_first", agentTiers: new Set(["agent_native", "agent_common", "agent_first"]) },
];
const covers = (s: (typeof SCORES)[number], tier: string) => isSemantius(tier) || s.agentTiers.has(tier);
const WIDEST = SCORES[SCORES.length - 1];

type Tool = { id: number; tool_name: string; coverage_tier: string };
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

type ToolRef = { name: string; tier: string; level: string };
type Row = {
  unit: string;
  label: string;
  pcts: (number | null)[]; // one per SCORES entry
  counts: number[]; // covered tools per SCORES entry
  total: number;
  agentTools: ToolRef[]; // agent_* tools: covered by the agent scores only
  gaps: ToolRef[]; // vendor_platform / external: uncovered in every score
};

// Reduce a set of (tool_id, requirement_level) into the coverage row, deduped by tool_id with
// `required` winning over `optional` (the level is reported on tool lists; both levels count in the score).
function rollup(unit: string, label: string, trs: TR[], toolTier: Map<number, string>, toolName: Map<number, string>): Row {
  const level = new Map<number, string>();
  for (const r of trs) {
    const prev = level.get(r.tool_id);
    if (prev !== "required") level.set(r.tool_id, r.requirement_level);
  }
  const all = [...level.keys()];
  const tierOf = (tid: number) => toolTier.get(tid) ?? "?";
  const ref = (tid: number): ToolRef => ({ name: toolName.get(tid) ?? `?#${tid}`, tier: tierOf(tid), level: level.get(tid)! });
  const counts = SCORES.map(s => all.filter(tid => covers(s, tierOf(tid))).length);
  return {
    unit,
    label,
    pcts: counts.map(n => (all.length ? Math.round((n / all.length) * 100) : null)),
    counts,
    total: all.length,
    agentTools: all.filter(tid => tierOf(tid).startsWith("agent_")).map(ref),
    gaps: all.filter(tid => !covers(WIDEST, tierOf(tid))).map(ref),
  };
}

async function main() {
  const tools = (await get(`/tools?select=id,tool_name,coverage_tier&limit=${LIMIT}`)) as Tool[];
  const toolTier = new Map(tools.map(t => [t.id, t.coverage_tier]));
  const toolName = new Map(tools.map(t => [t.id, t.tool_name]));

  const rows: Row[] = [];

  if (PROCESS) {
    const [processes, pt] = await Promise.all([
      get(`/business_processes?source_framework=eq.custom&select=id,process_key,process_name&limit=${LIMIT}`),
      get(`/process_tools?select=process_id,tool_id,requirement_level&limit=${LIMIT}`) as Promise<(TR & { process_id: number })[]>,
    ]);
    const byProc = new Map<number, TR[]>();
    for (const r of pt) { const a = byProc.get(r.process_id) ?? []; a.push(r); byProc.set(r.process_id, a); }
    for (const p of processes) {
      if (!byProc.has(p.id)) continue; // only value-stream processes that carry tools
      rows.push(rollup(p.process_key, p.process_name, byProc.get(p.id)!, toolTier, toolName));
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
      rows.push(rollup(code, code, trByDomain.get(did) ?? [], toolTier, toolName));
    }
  }

  rows.sort((a, b) => a.unit.localeCompare(b.unit));

  if (CSV) {
    console.log(`${PROCESS ? "process_key" : "domain_code"},${SCORES.map(s => s.key).join(",")},total_tools`);
    for (const r of rows) console.log(`${r.unit},${r.pcts.map(p => p ?? "incomplete").join(",")},${r.total}`);
    return;
  }

  console.log(`Unit: ${PROCESS ? "value-stream process (process_tools)" : "domain (domain_module_tools, primary modules)"}`);
  for (const s of SCORES) console.log(`${s.key.padEnd(22)} covers { semantius*${[...s.agentTiers].map(t => ", " + t).join("")} }`);
  console.log(`Mode: ${DIAGNOSTIC ? "diagnostic (semantius_agent_first <100% / incomplete only)" : "full rollup"}\n`);

  const fmt = (p: number | null) => (p === null ? " n/a" : `${String(p).padStart(3)}%`);
  const list = (ts: ToolRef[]) => ts.map(t => `${t.name}(${t.tier}${t.level === "optional" ? ", optional" : ""})`).join(", ");
  const widest = (r: Row) => r.pcts[r.pcts.length - 1];
  let hidden = 0, incomplete = 0;
  for (const r of rows) {
    if (r.pcts[0] === null) incomplete++;
    if (DIAGNOSTIC && widest(r) === 100) { hidden++; continue; }
    const flag = r.pcts[0] === null ? "∅" : widest(r) === 100 ? "✅" : "⬇";
    let line = `${flag} ${r.pcts.map(fmt).join(" ")}  ${r.unit.padEnd(20)} ${r.counts.join("/")}/${r.total}`;
    if (r.pcts[0] === null) line += `   ↳ INCOMPLETE: no domain_module_tools (band M1/F3)`;
    else {
      if (r.agentTools.length) line += `   ↳ agent: ${list(r.agentTools)}`;
      if (r.gaps.length) line += `   ↳ NOT covered: ${list(r.gaps)}`;
    }
    console.log(line);
  }
  if (DIAGNOSTIC) console.log(`\nHidden (semantius_agent_first 100%): ${hidden}`);
  const at100 = SCORES.map((s, i) => `${rows.filter(r => r.pcts[i] === 100).length} at 100% ${s.key}`).join(", ");
  console.log(`\nTotal: ${rows.length} units; ${at100}; ${incomplete} incomplete (no tools).`);
}

await main();
