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
 * the TARGET (`related_data_object_id`) and classifies it by the target's `necessity` across the
 * `domain_module_data_objects` rows it appears in:
 *   - optional-in-at-least-one-module  (ambiguous: some deployment treats it as optional)
 *   - optional-in-every-module         (unambiguous: never guaranteed present anywhere)
 *
 * It WRITES NOTHING. The figures are the run-time signal for the band; do not assume the
 * prior 531 / 143 / 19 scan (Policy 4: re-derive against live).
 *
 * Usage (from project root): bun run scripts/analytics/required_edge_presence_probe.ts [--samples]
 */
export {};
import { argv } from "node:process";

const SAMPLES = argv.includes("--samples");

async function pg(path: string): Promise<any[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify({ method: "GET", path })),
    stdout: "pipe", stderr: "pipe",
  });
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if (await proc.exited !== 0) throw new Error(`GET ${path}: ${err || out}`);
  return out.trim() ? JSON.parse(out.trim()) : [];
}

const [requiredEdges, dmdo, dataObjects] = await Promise.all([
  pg("/data_object_relationships?is_required=eq.true&select=id,data_object_id,related_data_object_id,relationship_verb,relationship_kind&limit=20000"),
  pg("/domain_module_data_objects?select=data_object_id,necessity&limit=20000"),
  pg("/data_objects?select=id,data_object_name,kind&limit=20000"),
]);

const nameById = new Map<number, string>();
const kindById = new Map<number, string>();
for (const o of dataObjects) { nameById.set(Number(o.id), o.data_object_name); kindById.set(Number(o.id), o.kind); }

// Per target entity: the set of necessity values across the DMDO rows it appears in.
const necessityByDO = new Map<number, Set<string>>();
for (const r of dmdo) {
  const id = Number(r.data_object_id);
  const s = necessityByDO.get(id) ?? new Set<string>();
  if (r.necessity != null) s.add(String(r.necessity));
  necessityByDO.set(id, s);
}
const optionalSomewhere = (id: number): boolean => necessityByDO.get(id)?.has("optional") ?? false;
const optionalEverywhere = (id: number): boolean => {
  const s = necessityByDO.get(id);
  return !!s && s.size > 0 && [...s].every((v) => v === "optional");
};

let total = 0, someCount = 0, everyCount = 0, builtinTarget = 0;
const everyList: string[] = [];
const everyByKind = new Map<string, number>();

for (const e of requiredEdges) {
  total++;
  const target = Number(e.related_data_object_id);
  if (kindById.get(target) === "platform_builtin") { builtinTarget++; continue; }
  if (optionalSomewhere(target)) someCount++;
  if (optionalEverywhere(target)) {
    everyCount++;
    everyByKind.set(e.relationship_kind, (everyByKind.get(e.relationship_kind) ?? 0) + 1);
    const src = nameById.get(Number(e.data_object_id)) ?? `#${e.data_object_id}`;
    const tgt = nameById.get(target) ?? `#${target}`;
    everyList.push(`${src} --${e.relationship_verb ?? "?"}[${e.relationship_kind}]--> ${tgt}`);
  }
}

console.log(`required-edge presence probe (READ-ONLY, no writes)`);
console.log(`  is_required=true edges: ${total}`);
console.log(`  ... target is platform_builtin (always present, excluded): ${builtinTarget}`);
console.log(`  ... target is necessity=optional in at least one module (ambiguous): ${someCount}`);
console.log(`  ... target is necessity=optional in EVERY module it appears (unambiguous): ${everyCount}`);
console.log(`\n  unambiguous breakdown by relationship_kind:`);
for (const [kind, n] of [...everyByKind.entries()].sort((a, b) => b[1] - a[1])) {
  const tag = kind === "composition" ? "  (composition => M9 audit finding, embed or relax)" : "";
  console.log(`    ${kind}: ${n}${tag}`);
}

if (SAMPLES) {
  console.log(`\n  unambiguous edges (target optional everywhere), first 30:`);
  for (const x of everyList.slice(0, 30)) console.log(`    ${x}`);
}
