#!/usr/bin/env bun
/**
 * m11_rollup_probe.ts — read-only preview for Plan 1 m11-fix (plan-1-consistency.md Step D).
 *
 * `domain_data_objects` is declared a derived rollup of `domain_module_data_objects`
 * (strongest held_as wins), but nothing regenerates it, so it drifts. This probe recomputes the
 * rollup the same way scripts/lib/catalog.ts does (HELD_AS_ORDER, strongest held_as wins) and
 * surfaces disagreements. It WRITES NOTHING. It deliberately scopes the comparison to
 * MODULARIZED domains only: non-modularized domains have legacy domain_data_objects rows with
 * no module source, and a blind recompute would wrongly delete them, so they are reported but
 * never proposed for change.
 *
 * Usage (from project root): bun run scripts/analytics/m11_rollup_probe.ts [--samples]
 */
import { argv } from "node:process";

const SAMPLES = argv.includes("--samples");
const HELD_AS_ORDER = ["master", "embedded_master", "contributor", "consumer", "derived"];
const RANK: Record<string, number> = Object.fromEntries(HELD_AS_ORDER.map((r, i) => [r, i]));

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

const [domainsKind, modules, dmdo, ddo] = await Promise.all([
  pg("/domains?select=id,domain_kind&limit=20000"),
  pg("/domain_modules?select=id,domain_id&limit=20000"),
  pg("/domain_module_data_objects?select=domain_module_id,data_object_id,held_as,is_install_optional&limit=20000"),
  pg("/domain_data_objects?select=domain_id,data_object_id,held_as,is_install_optional&limit=20000"),
]);
// bundle-domains master nothing; exclude them from the rollup reconciliation (plan §4). Inert until §3.
const bundleDomainIds = new Set<number>(domainsKind.filter((d: any) => d.domain_kind === "bundle").map((d: any) => Number(d.id)));

// module -> its one home domain (PRIMARY only). A starter's embedded entities attribute to the
// starter's own (bundle) domain, never to the markets it embeds from — consistent with emit_domain_map
// and the coverage rollup (a starter consumes a market, it does not contribute to its rollup).
const modToDomains = new Map<number, Set<number>>();
for (const m of modules) {
  const s = modToDomains.get(m.id) ?? new Set<number>();
  if (m.domain_id != null) s.add(Number(m.domain_id));
  modToDomains.set(m.id, s);
}
const modularizedDomains = new Set<number>();
for (const s of modToDomains.values()) for (const d of s) if (!bundleDomainIds.has(d)) modularizedDomains.add(d);

// derive rollup: (domain_id, data_object_id) -> strongest {held_as, is_install_optional}
const derived = new Map<string, { held_as: string; is_install_optional: boolean | null }>();
for (const r of dmdo) {
  const domains = modToDomains.get(Number(r.domain_module_id));
  if (!domains) continue;
  for (const dom of domains) {
    if (bundleDomainIds.has(dom)) continue; // exclude bundle-domains (plan §4)
    const key = `${dom}|${r.data_object_id}`;
    const cur = derived.get(key);
    if (!cur || (RANK[r.held_as] ?? 99) < (RANK[cur.held_as] ?? 99)) {
      derived.set(key, { held_as: r.held_as, is_install_optional: (r.is_install_optional as boolean | null) ?? cur?.is_install_optional ?? null });
    }
  }
}

// index stored rollup
const stored = new Map<string, { held_as: string; is_install_optional: boolean | null; domain: number }>();
for (const r of ddo) stored.set(`${r.domain_id}|${r.data_object_id}`, { held_as: r.held_as, is_install_optional: (r.is_install_optional as boolean | null) ?? null, domain: Number(r.domain_id) });

const mismatches: string[] = [];   // present in both, held_as/is_install_optional differ
const derivedMissing: string[] = []; // derivable but absent from stored (rollup should add)
const staleExtra: string[] = [];     // stored in a MODULARIZED domain but not derivable (candidate removal)
let nonModularizedStored = 0;

for (const [key, d] of derived) {
  const s = stored.get(key);
  if (!s) { derivedMissing.push(`${key} -> ${d.held_as}/${d.is_install_optional ?? "-"}`); continue; }
  if (s.held_as !== d.held_as || (s.is_install_optional ?? null) !== (d.is_install_optional ?? null)) {
    mismatches.push(`${key}: stored ${s.held_as}/${s.is_install_optional ?? "-"} vs derived ${d.held_as}/${d.is_install_optional ?? "-"}`);
  }
}
for (const [key, s] of stored) {
  if (!modularizedDomains.has(s.domain)) { nonModularizedStored++; continue; }
  if (!derived.has(key)) staleExtra.push(`${key}: stored ${s.held_as}/${s.is_install_optional ?? "-"} has no module source`);
}

console.log(`m11 rollup probe (READ-ONLY, no writes)`);
console.log(`  stored domain_data_objects: ${ddo.length} | derivable (domain,data_object) pairs: ${derived.size}`);
console.log(`  modularized domains: ${modularizedDomains.size}`);
console.log(`  stored rows in NON-modularized domains (legacy, left untouched): ${nonModularizedStored}`);
console.log(`\n  held_as/is_install_optional mismatches (modularized): ${mismatches.length}`);
console.log(`  derivable but missing from stored (rollup under-populated): ${derivedMissing.length}`);
console.log(`  stored in modularized domain with no module source (rollup over-populated): ${staleExtra.length}`);

if (SAMPLES) {
  const show = (label: string, arr: string[]) => { if (arr.length) { console.log(`\n${label} (first 15):`); for (const x of arr.slice(0, 15)) console.log(`  ${x}`); } };
  show("MISMATCHES", mismatches);
  show("DERIVED-MISSING", derivedMissing);
  show("STALE-EXTRA", staleExtra);
}
