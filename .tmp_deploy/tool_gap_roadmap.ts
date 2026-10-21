// P2.7 — Tool-gap roadmap.
//
// Two queries:
//   1. Highest-leverage tools: which tools have the most dependent skill_tools (=required by the most skills)?
//   2. Tool-gap candidates: which tools are heavily depended on AND lack candidate vendor solutions?
//
// CLI:
//   bun run .tmp_deploy/tool_gap_roadmap.ts            # both reports
//   bun run .tmp_deploy/tool_gap_roadmap.ts --top 20   # top N for each

const args = process.argv.slice(2);
const TOP = args.includes("--top") ? Number(args[args.indexOf("--top") + 1]) : 15;

async function call(body: any): Promise<any[]> {
  const p = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  p.stdin.write(JSON.stringify(body));
  await p.stdin.end();
  const out = await new Response(p.stdout).text();
  await p.exited;
  return JSON.parse(out);
}
const get = (path: string) => call({ method: "GET", path });

const [tools, skillTools, toolSolutions, solutions] = await Promise.all([
  get(`/tools?select=id,tool_name,operation_kind,data_object_id&limit=10000`),
  get(`/skill_tools?select=skill_id,tool_id,requirement_level&limit=30000`),
  get(`/tool_solutions?select=tool_id,solution_id&limit=10000`),
  get(`/solutions?select=id,solution_name,solution_kind&limit=10000`),
]);

const toolById = new Map<number, any>((tools as any[]).map(t => [t.id, t]));
const solutionById = new Map<number, any>((solutions as any[]).map(s => [s.id, s]));

// Count required skill_tools per tool
const dependentRequiredSkills = new Map<number, number>();
const dependentAnySkills = new Map<number, number>();
for (const r of skillTools as any[]) {
  dependentAnySkills.set(r.tool_id, (dependentAnySkills.get(r.tool_id) ?? 0) + 1);
  if (r.requirement_level === "required") {
    dependentRequiredSkills.set(r.tool_id, (dependentRequiredSkills.get(r.tool_id) ?? 0) + 1);
  }
}

// Count solutions per tool
const solutionsByTool = new Map<number, string[]>();
for (const r of toolSolutions as any[]) {
  const arr = solutionsByTool.get(r.tool_id) ?? [];
  const sol = solutionById.get(r.solution_id);
  if (sol) arr.push(sol.solution_name);
  solutionsByTool.set(r.tool_id, arr);
}

// ---- Report 1: highest-leverage tools ----
type Row = { tool: any; required_by: number; any_by: number; solution_count: number; solutions: string[] };
const rows: Row[] = [];
for (const [tid, count] of dependentRequiredSkills.entries()) {
  const tool = toolById.get(tid)!;
  const sols = solutionsByTool.get(tid) ?? [];
  rows.push({
    tool,
    required_by: count,
    any_by: dependentAnySkills.get(tid) ?? 0,
    solution_count: sols.length,
    solutions: sols,
  });
}

console.log("=== Highest-leverage tools (most required-by skill count) ===");
console.log("(Tools sorted by # of skills that REQUIRE them. Semantius-covered tools (query/mutate) are dominant in volume but not always the highest-leverage individuals.)\n");
console.log("rank  tool                          kind         req'd-by  solutions  delivery list");
console.log("─".repeat(140));
const byLeverage = [...rows].sort((a, b) => b.required_by - a.required_by);
let n = 0;
for (const r of byLeverage) {
  if (++n > TOP) break;
  const kind = r.tool.operation_kind.padEnd(11);
  console.log(`  ${String(n).padStart(3)}  ${r.tool.tool_name.padEnd(30)} ${kind}  ${String(r.required_by).padStart(7)}  ${String(r.solution_count).padStart(9)}  ${r.solutions.slice(0, 3).join(", ") + (r.solutions.length > 3 ? ` (+${r.solutions.length - 3})` : "")}`);
}

// ---- Report 2: gap candidates — high-leverage tools with thin solution coverage ----
console.log("\n=== Tool-gap candidates (high-leverage + thin solution coverage) ===");
console.log("(Tools required by many skills but covered by few candidate solutions. Side-effect / compute kinds — Semantius doesn't cover them — are the natural gap signal.)\n");
console.log("rank  tool                          kind         req'd-by  solutions  notes");
console.log("─".repeat(140));
// Score: required_by × max(0, 5 − solution_count) — favors high demand AND low solution coverage
const gapRows = rows
  .filter(r => r.tool.operation_kind === "side_effect" || r.tool.operation_kind === "compute") // Semantius doesn't cover these
  .map(r => ({ ...r, gap_score: r.required_by * Math.max(0, 5 - r.solution_count) }))
  .sort((a, b) => b.gap_score - a.gap_score);
let m = 0;
for (const r of gapRows) {
  if (++m > TOP) break;
  const kind = r.tool.operation_kind.padEnd(11);
  const sols = r.solutions.length === 0 ? "—" : r.solutions.slice(0, 3).join(", ");
  console.log(`  ${String(m).padStart(3)}  ${r.tool.tool_name.padEnd(30)} ${kind}  ${String(r.required_by).padStart(7)}  ${String(r.solution_count).padStart(9)}  ${sols}`);
}

// ---- Top 5 gap summary ----
console.log("\n=== Top 5 tool gaps (recommended next integrations) ===");
const top5 = gapRows.slice(0, 5);
for (const r of top5) {
  console.log(`  • ${r.tool.tool_name} (${r.tool.operation_kind}) — required by ${r.required_by} skills, ${r.solution_count} candidate solution(s)${r.solutions.length ? `: ${r.solutions.join(", ")}` : ""}`);
}
