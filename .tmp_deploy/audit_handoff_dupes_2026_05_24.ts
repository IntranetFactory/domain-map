/**
 * Scan `handoffs` for duplicate / multi-row module-pairs.
 *
 * Three lenses, in increasing strictness:
 *   1. Module-pair (src_mod, tgt_mod) appearing >1x — often legitimate fan-out
 *   2. Tighter key (src_mod, tgt_mod, trigger_event_id) — same event between
 *      same modules, different payload. Usually legitimate.
 *   3. STRICT duplicate (src_mod, tgt_mod, trigger_event_id, data_object_id)
 *      — same event + same payload between same modules. These are real dupes.
 *
 * Also checks the same lenses scoped to rows where both module ids are NULL
 * (where the catalog can't deduplicate by module — should fall back to
 *  (source_domain, target_domain, trigger_event, data_object)).
 */

async function postgrest(method: string, path: string): Promise<any> {
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest"],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe" }
  );
  proc.stdin.write(JSON.stringify({ method, path }));
  proc.stdin.end();
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(err || out);
  return JSON.parse(out.trim());
}

type Row = {
  id: number;
  source_domain_id: number;
  target_domain_id: number;
  source_domain_module_id: number | null;
  target_domain_module_id: number | null;
  trigger_event_id: number;
  data_object_id: number;
};

async function main() {
  console.log("Handoff duplicate scan — 2026-05-24");
  console.log("====================================\n");

  // Pull everything (with both module ids set or otherwise).
  const rows: Row[] = await postgrest(
    "GET",
    "/handoffs?select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,trigger_event_id,data_object_id&limit=20000",
  );
  console.log(`Total handoffs: ${rows.length}\n`);

  const both = rows.filter(r => r.source_domain_module_id != null && r.target_domain_module_id != null);
  const eitherNull = rows.filter(r => r.source_domain_module_id == null || r.target_domain_module_id == null);
  console.log(`  with both module ids set: ${both.length}`);
  console.log(`  with at least one module id NULL: ${eitherNull.length}\n`);

  function group<T>(items: T[], keyFn: (t: T) => string): Map<string, T[]> {
    const m = new Map<string, T[]>();
    for (const it of items) {
      const k = keyFn(it);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(it);
    }
    return m;
  }

  // ---------- Lens 1: (src_mod, tgt_mod) ----------
  console.log("Lens 1: module-pair frequency (src_mod -> tgt_mod)");
  const lens1 = group(both, r => `${r.source_domain_module_id}->${r.target_domain_module_id}`);
  const multi1 = [...lens1.entries()].filter(([, v]) => v.length > 1)
    .sort((a, b) => b[1].length - a[1].length);
  console.log(`  ${multi1.length} module-pairs have >1 row\n`);
  console.log("  Top 15 module-pairs by row count:");
  for (const [k, v] of multi1.slice(0, 15)) {
    console.log(`    ${k} : ${v.length} rows`);
  }

  // ---------- Lens 2: (src_mod, tgt_mod, trigger_event) ----------
  console.log("\nLens 2: same module-pair AND same trigger_event");
  const lens2 = group(both, r => `${r.source_domain_module_id}->${r.target_domain_module_id}|${r.trigger_event_id}`);
  const multi2 = [...lens2.entries()].filter(([, v]) => v.length > 1);
  console.log(`  ${multi2.length} (module-pair, trigger_event) combinations have >1 row`);
  if (multi2.length > 0) {
    for (const [k, v] of multi2.slice(0, 30)) {
      const ids = v.map(r => r.id).join(",");
      const doIds = [...new Set(v.map(r => r.data_object_id))].join(",");
      console.log(`    ${k} : ${v.length} rows (ids ${ids}, payloads ${doIds})`);
    }
    if (multi2.length > 30) console.log(`    ... and ${multi2.length - 30} more`);
  }

  // ---------- Lens 3: STRICT duplicates ----------
  console.log("\nLens 3: STRICT duplicate (src_mod, tgt_mod, trigger_event, data_object)");
  const lens3 = group(both, r => `${r.source_domain_module_id}->${r.target_domain_module_id}|${r.trigger_event_id}|${r.data_object_id}`);
  const multi3 = [...lens3.entries()].filter(([, v]) => v.length > 1);
  console.log(`  ${multi3.length} STRICT duplicate keys`);
  for (const [k, v] of multi3) {
    console.log(`    ${k} : ids ${v.map(r => r.id).join(",")}`);
  }

  // ---------- Lens 3': fallback (no module ids) ----------
  console.log("\nLens 3': STRICT duplicate among rows missing module ids");
  console.log("  Fallback key: (src_domain, tgt_domain, trigger_event, data_object, src_mod, tgt_mod)");
  const lensFallback = group(rows, r =>
    `${r.source_domain_id}->${r.target_domain_id}|te=${r.trigger_event_id}|do=${r.data_object_id}|smod=${r.source_domain_module_id ?? "null"}|tmod=${r.target_domain_module_id ?? "null"}`
  );
  const multiFallback = [...lensFallback.entries()].filter(([, v]) => v.length > 1);
  console.log(`  ${multiFallback.length} duplicate keys on full 6-tuple (across the entire table)`);
  for (const [k, v] of multiFallback.slice(0, 50)) {
    console.log(`    ${k} : ids ${v.map(r => r.id).join(",")}`);
  }
  if (multiFallback.length > 50) console.log(`    ... and ${multiFallback.length - 50} more`);

  // ---------- Looser cross-domain check: same (src_domain, tgt_domain, trigger_event, data_object) ----------
  console.log("\nLens X: same (src_domain, tgt_domain, trigger_event, data_object) — different modules");
  console.log("  These are potentially OK (event fans into multiple modules on the target side)");
  console.log("  but worth eyeballing for accidental duplication");
  const lensX = group(rows, r =>
    `${r.source_domain_id}->${r.target_domain_id}|te=${r.trigger_event_id}|do=${r.data_object_id}`
  );
  const multiX = [...lensX.entries()].filter(([, v]) => v.length > 1);
  console.log(`  ${multiX.length} (src_domain, tgt_domain, trigger_event, data_object) groups with >1 row`);
  for (const [k, v] of multiX.slice(0, 30)) {
    const moduleSlots = v.map(r => `(s=${r.source_domain_module_id ?? "null"}, t=${r.target_domain_module_id ?? "null"})`).join(" ");
    console.log(`    ${k}`);
    console.log(`        ids ${v.map(r => r.id).join(",")}`);
    console.log(`        slots ${moduleSlots}`);
  }
  if (multiX.length > 30) console.log(`    ... and ${multiX.length - 30} more`);
}

await main();
