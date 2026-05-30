// Semantius coverage rollup — system skills.
//
// Per-skill metric:
//   % = (count of required tools whose operation_kind ∈ SEMANTIUS_COVERED) / (count of required tools)
//
// Defaults to printing the rollup for every skill_type='system' skill, sorted by domain_code.
// Flags:
//   --diagnostic   Print only skills <100%, with the specific tools dragging them down (name + operation_kind).
//   --skill NAME   Restrict to one skill.
//   --csv          Machine-readable CSV (skill_name,domain_code,pct,required_count,covered_count) instead of the human table.

const args = process.argv.slice(2);
const DIAGNOSTIC = args.includes("--diagnostic");
const CSV = args.includes("--csv");
const skillFilterIdx = args.indexOf("--skill");
const SKILL_FILTER = skillFilterIdx >= 0 ? args[skillFilterIdx + 1] : null;
const typeIdx = args.indexOf("--type");
const TYPE_FILTER: "system" | "process" | "all" = typeIdx >= 0 ? args[typeIdx + 1] as any : "system";

// Hardcoded Semantius-covered operation_kinds (Option 1 per plan-tools-catalog.md § Open question).
// When a new operation_kind value is added (or one splits), update this set and re-run.
// Excluded by design:
//   - fetch: external-data reads (vendor APIs, search). Semantius never owns the upstream schema.
//   - side_effect: external-write side-effects (some flip to platform when Semantius ships native dispatcher; see coverage_tier for the per-tool truth).
//   - compute: pure transforms; covered if/when Semantius ships native compute.
//   - inbound: receive-shaped; the inbound listener is platform-ish but the source is external.
// For per-tool coverage truth, read tools.coverage_tier; this script uses operation_kind as a fast heuristic for "internal-data tools".
const SEMANTIUS_COVERED = new Set(["query", "mutate"]);

type Skill = { id: number; skill_name: string; skill_type: string; domain_id: number | null };
type Tool = { id: number; tool_name: string; operation_kind: string };
type Domain = { id: number; domain_code: string };
type ST = { skill_id: number; tool_id: number; requirement_level: string };

async function call(body: any): Promise<any[]> {
  const p = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  p.stdin.write(JSON.stringify(body));
  await p.stdin.end();
  const out = await new Response(p.stdout).text();
  const err = await new Response(p.stderr).text();
  await p.exited;
  if (p.exitCode !== 0) throw new Error(`semantius failed (${p.exitCode}): ${err}`);
  return JSON.parse(out);
}
const get = (path: string) => call({ method: "GET", path });

async function main() {
  const [skills, tools, domains, st] = await Promise.all([
    get(`/skills?select=id,skill_name,skill_type,domain_id${TYPE_FILTER === "all" ? "" : `&skill_type=eq.${TYPE_FILTER}`}&limit=10000`) as Promise<Skill[]>,
    get(`/tools?select=id,tool_name,operation_kind&limit=10000`) as Promise<Tool[]>,
    get(`/domains?select=id,domain_code&limit=10000`) as Promise<Domain[]>,
    get(`/skill_tools?select=skill_id,tool_id,requirement_level&limit=30000`) as Promise<ST[]>,
  ]);

  const toolKind = new Map(tools.map(t => [t.id, t.operation_kind]));
  const toolName = new Map(tools.map(t => [t.id, t.tool_name]));
  const domainCode = new Map(domains.map(d => [d.id, d.domain_code]));
  const stBySkill = new Map<number, ST[]>();
  for (const r of st) {
    const arr = stBySkill.get(r.skill_id) ?? [];
    arr.push(r);
    stBySkill.set(r.skill_id, arr);
  }

  type Row = { skill: string; domain: string; pct: number; covered: number; required: number; notCovered: { name: string; kind: string }[] };
  const rows: Row[] = [];
  for (const s of skills) {
    if (SKILL_FILTER && s.skill_name !== SKILL_FILTER) continue;
    const required = (stBySkill.get(s.id) ?? []).filter(r => r.requirement_level === "required");
    const covered = required.filter(r => SEMANTIUS_COVERED.has(toolKind.get(r.tool_id) ?? ""));
    const notCovered = required
      .filter(r => !SEMANTIUS_COVERED.has(toolKind.get(r.tool_id) ?? ""))
      .map(r => ({ name: toolName.get(r.tool_id) ?? `?#${r.tool_id}`, kind: toolKind.get(r.tool_id) ?? "?" }));
    const pct = required.length ? Math.round((covered.length / required.length) * 100) : 0;
    rows.push({
      skill: s.skill_name,
      domain: s.domain_id != null ? (domainCode.get(s.domain_id) ?? "?") : "—",
      pct,
      covered: covered.length,
      required: required.length,
      notCovered,
    });
  }
  rows.sort((a, b) => a.skill.localeCompare(b.skill));

  if (CSV) {
    console.log("skill_name,domain_code,pct,covered,required");
    for (const r of rows) console.log(`${r.skill},${r.domain},${r.pct},${r.covered},${r.required}`);
    return;
  }

  console.log(`Semantius-covered set: { ${[...SEMANTIUS_COVERED].join(", ")} }`);
  console.log(`Mode: ${DIAGNOSTIC ? "diagnostic (<100% only)" : "full rollup"}\n`);

  let shown = 0, full = 0;
  for (const r of rows) {
    if (DIAGNOSTIC && r.pct === 100) { full++; continue; }
    const flag = r.pct === 100 ? "✅" : "⬇";
    let line = `${flag} ${String(r.pct).padStart(3)}%  ${r.skill.padEnd(32)} ${r.covered}/${r.required}`;
    if (r.pct < 100) {
      line += `   ↳ NOT covered: ${r.notCovered.map(t => `${t.name}(${t.kind})`).join(", ")}`;
    }
    console.log(line);
    shown++;
  }
  if (DIAGNOSTIC) console.log(`\nHidden (100% Semantius-covered): ${full}`);
  const totalFull = rows.filter(r => r.pct === 100).length;
  console.log(`\nTotal: ${totalFull}/${rows.length} system skills at 100% Semantius-covered`);
}

await main();
