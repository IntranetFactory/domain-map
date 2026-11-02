#!/usr/bin/env bun
/**
 * required_edge_presence_probe.ts — read-only signal for the plan-4 M9 relationship-layer band.
 *
 * The keystone of plan-4: `data_object_relationships.is_required` is PRESENCE-CONDITIONAL (a
 * mandatory FK only WHEN the target entity is installed; it never forces the target to install).
 * Under the old unconditional reading, a required edge whose TARGET is an install-optional entity
 * silently forced that entity to install, defeating Rule #16 and making subset / starter
 * deployments unbuildable.
 *
 * This probe quantifies the catalog-wide exposure. For every `is_required=true` edge it inspects
 * the TARGET (`related_data_object_id`) and classifies it by the target's `is_install_optional` across the
 * `domain_module_data_objects` rows it appears in:
 *   - optional-in-at-least-one-module  (ambiguous: some deployment treats it as optional)
 *   - optional-in-every-module         (unambiguous: never guaranteed present anywhere)
 *
 * It WRITES NOTHING. The figures are the run-time signal for the band; do not assume the
 * prior 531 / 143 / 19 scan (Policy 4: re-derive against live).
 *
 * The classification is the shared health logic (scripts/lib/health/logic_sam.ts
 * classifyRequiredEdgeTargets); this probe only fetches and prints.
 *
 * Usage (from project root): bun run scripts/analytics/required_edge_presence_probe.ts [--samples]
 */
export {};
import { argv } from "node:process";
import { classifyRequiredEdgeTargets } from "../lib/health/logic_sam.ts";

const SAMPLES = argv.includes("--samples");

async function pg(path: string): Promise<any[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify({ method: "GET", path }));
  proc.stdin.end();
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if (await proc.exited !== 0) throw new Error(`GET ${path}: ${err || out}`);
  return out.trim() ? JSON.parse(out.trim()) : [];
}

const [requiredEdges, dmdo, dataObjects] = await Promise.all([
  pg("/data_object_relationships?is_required=eq.true&select=id,data_object_id,related_data_object_id,relationship_verb,relationship_kind&limit=20000"),
  pg("/domain_module_data_objects?select=data_object_id,is_install_optional&limit=20000"),
  pg("/data_objects?select=id,data_object_name,kind&limit=20000"),
]);

const nameById = new Map<number, string>();
const kindById = new Map<number, string>();
for (const o of dataObjects) { nameById.set(Number(o.id), o.data_object_name); kindById.set(Number(o.id), o.kind); }

// Per target entity, the is_install_optional values across the DMDO rows it appears in decide the class.
const summary = classifyRequiredEdgeTargets(requiredEdges, dmdo, kindById);
const everyList = summary.everyEdges.map((e) => {
  const src = nameById.get(Number(e.data_object_id)) ?? `#${e.data_object_id}`;
  const target = Number(e.related_data_object_id);
  const tgt = nameById.get(target) ?? `#${target}`;
  return `${src} --${e.relationship_verb ?? "?"}[${e.relationship_kind}]--> ${tgt}`;
});

console.log(`required-edge presence probe (READ-ONLY, no writes)`);
console.log(`  is_required=true edges: ${summary.total}`);
console.log(`  ... target is platform_builtin (always present, excluded): ${summary.builtinTarget}`);
console.log(`  ... target is is_install_optional=true in at least one module (ambiguous): ${summary.optionalSomewhere}`);
console.log(`  ... target is is_install_optional=true in EVERY module it appears (unambiguous): ${summary.optionalEverywhere}`);
console.log(`\n  unambiguous breakdown by relationship_kind:`);
for (const [kind, n] of [...summary.everyByKind.entries()].sort((a, b) => b[1] - a[1])) {
  const tag = kind === "composition" ? "  (composition => M9 audit finding, embed or relax)" : "";
  console.log(`    ${kind}: ${n}${tag}`);
}

if (SAMPLES) {
  console.log(`\n  unambiguous edges (target optional everywhere), first 30:`);
  for (const x of everyList.slice(0, 30)) console.log(`    ${x}`);
}
