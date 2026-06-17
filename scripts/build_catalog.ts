#!/usr/bin/env bun
// scripts/build_catalog.ts
//
// One command to (re)generate the whole catalog/ folder from live Semantius state, scoped to
// RELEASED domains. "Released" == domains.catalog_release IS NOT NULL (any date, a future-scheduled
// one included). It runs the three catalog emitters in order, all sharing ONE definition of released
// (isDomainReleased in scripts/lib/catalog.ts) so the three artifacts can never scope to different
// sets:
//
//   1. catalog/domain-map/*.json  emit_domain_map.ts --released-any   domain-map / personas /
//                              processes / business-functions snapshots, released-only.
//   2. catalog/blueprints/*    generate_blueprints.ts --released      one semantic blueprint per
//                              module hosted on a released domain (primary domain or host junction).
//   3. catalog/skill-specs/*   emit_skill_spec.ts --released --yes     spec.json + catalog.yaml per
//      + catalog/skills/*                                              released domain/bundle, plus
//                              the installable use-<code> skill folder rendered from the template.
//
// Ordering matters for freshness + speed: step 1 forces a fresh DB read and rewrites the shared
// catalog cache (.tmp_deploy/.catalog-cache.json, 5-min TTL); step 2 reads that just-written cache
// (a cache hit, fast); step 3 pulls the catalog itself (its own bulk path, independent of the cache).
//
// Usage:
//   bun run scripts/build_catalog.ts            # preview the released scope, write NOTHING
//   bun run scripts/build_catalog.ts --yes      # regenerate all three in place
//   bun run scripts/build_catalog.ts --check    # regenerate, then FAIL if catalog/ changed (CI drift gate)
//   bun run scripts/build_catalog.ts --yes --no-cache   # force a fresh DB read end-to-end
//
// Writes are deterministic and user-triggered; nothing here mutates live catalog rows. Per CLAUDE.md
// the agent never commits: review the regenerated catalog/ and commit it yourself.

export {};

import { argv, exit } from "node:process";
import { isDomainReleased, loadCachedCatalog, type ModuleRow } from "./lib/catalog";

const args = argv.slice(2);
const WRITE = args.includes("--yes") || args.includes("--write");
const CHECK = args.includes("--check");
const NO_CACHE = args.includes("--no-cache");

const ROOT = "c:/dev/domain-map";

// One step never blocks the others. generate_blueprints exits non-zero when a single module fails
// its integrity gate (e.g. B13: a data_object missing entity_type, an UPSTREAM data gap, not a build
// bug); that must not stop the JSON or skills from refreshing. So each step runs, its exit code is
// recorded, and build_catalog reports a summary and exits non-zero at the END if anything failed
// (so CI still catches it). Per-item isolation inside each emitter already keeps a single bad row
// from bricking the rest of that emitter's corpus.
const steps: { label: string; code: number }[] = [];
async function run(label: string, cmd: string[]): Promise<void> {
  console.error(`\n=== ${label} ===\n$ ${cmd.join(" ")}`);
  const proc = Bun.spawn(cmd, { cwd: ROOT, stdin: "inherit", stdout: "inherit", stderr: "inherit" });
  const code = await proc.exited;
  steps.push({ label, code });
  if (code !== 0) console.error(`\nbuild_catalog: step "${label}" exited ${code} (continuing; see final summary).`);
}

// ---- preview the released scope (writes nothing) ------------------------------------------------
// Computed here for the preview/log only; each emitter recomputes its own scope from the same
// isDomainReleased rule, so this is a faithful mirror of what they will target.
const { index, all } = await loadCachedCatalog({ forceRefresh: NO_CACHE });
const releasedDomains = index.domains
  .filter((d) => isDomainReleased(d))
  .sort((a, b) => a.domain_code.localeCompare(b.domain_code));
const releasedDomainIds = new Set(releasedDomains.map((d) => d.id));

const hostDomainsByModule = new Map<number, Set<number>>();
for (const h of all.hostDomains) {
  const mid = h.domain_module_id as number;
  if (!hostDomainsByModule.has(mid)) hostDomainsByModule.set(mid, new Set());
  hostDomainsByModule.get(mid)!.add(h.domain_id as number);
}
const releasedModules: ModuleRow[] = index.modules
  .filter((m) => {
    if (m.domain_id !== null && releasedDomainIds.has(m.domain_id)) return true;
    for (const did of hostDomainsByModule.get(m.id) ?? []) if (releasedDomainIds.has(did)) return true;
    return false;
  })
  .sort((a, b) => a.domain_module_code.localeCompare(b.domain_module_code));

console.error(`Released domains (catalog_release != null): ${releasedDomains.length}`);
console.error("  " + (releasedDomains.map((d) => d.domain_code).join(", ") || "(none)"));
console.error(`Modules on released domains (blueprints): ${releasedModules.length}`);
console.error("  " + (releasedModules.map((m) => m.domain_module_code).join(", ") || "(none)"));

if (!WRITE && !CHECK) {
  console.error(`\nPreview only, nothing written. Re-run with --yes to regenerate, or --check for a CI drift gate.`);
  exit(0);
}

if (releasedDomains.length === 0) {
  console.error(`\nNo released domains, nothing to build.`);
  exit(0);
}

// ---- regenerate all three, released-scoped, in order -------------------------------------------
await run("1/3 JSON snapshots", ["bun", "run", "scripts/emit_domain_map.ts", "--released-any"]);
await run("2/3 blueprints", [
  "bun",
  "run",
  "scripts/generate_blueprints.ts",
  "--released",
  ...(NO_CACHE ? ["--no-cache"] : []),
]);
await run("3/3 skills", ["bun", "run", "scripts/emit_skill_spec.ts", "--released", "--yes"]);

// ---- summary -----------------------------------------------------------------------------------
const failed = steps.filter((s) => s.code !== 0);
console.error(`\n=== build_catalog summary ===`);
for (const s of steps) console.error(`  ${s.code === 0 ? "ok  " : "FAIL"}  ${s.label} (exit ${s.code})`);
if (failed.length > 0) {
  console.error(
    `\n${failed.length} step(s) reported failures (see their output above). Common cause: a module's ` +
      `data_object is missing entity_type (B13), which must be classified upstream before its blueprint ` +
      `can emit. Everything that passed was still regenerated.`,
  );
}

// ---- CI drift gate -----------------------------------------------------------------------------
// --check regenerates (above) then asserts the working tree under catalog/ is clean. Intended for
// CI (clean checkout -> build -> assert no diff). Run locally it leaves the fresh files in place for
// review when it fails. Read-only git (status only); never resets or discards (CLAUDE.md Rule #1).
let driftCode = 0;
if (CHECK) {
  const proc = Bun.spawn(["git", "status", "--porcelain", "--", "catalog/"], {
    cwd: ROOT,
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = (await new Response(proc.stdout).text()).trim();
  await proc.exited;
  if (out) {
    console.error(`\nbuild_catalog --check: catalog/ is NOT fresh. Regeneration changed:\n${out}`);
    console.error(`Review the regenerated files and commit them (the agent does not commit).`);
    driftCode = 1;
  } else {
    console.error(`\nbuild_catalog --check: catalog/ is fresh (no drift).`);
  }
}

if (failed.length > 0) exit(failed[0].code || 1);
if (driftCode) exit(driftCode);
console.error(`\nbuild_catalog: done.`);
