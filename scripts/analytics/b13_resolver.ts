// B13 resolver - the entity_type sibling of scripts/analytics/b9d_resolver.ts.
//
// Classifies every UNCLASSIFIED master's entity_type catalog-wide (or for one domain),
// deterministically, from the signals SKILL.md Rule #12 "Classification heuristic" already
// names, with the lifecycle-state signal (B12) as the strongest input. This is the band that
// kept getting skipped per-domain; run it ONCE across the catalog instead.
//
//   bun run scripts/analytics/b13_resolver.ts              # dry-run, catalog-wide (default)
//   bun run scripts/analytics/b13_resolver.ts --write      # apply catalog-wide
//   bun run scripts/analytics/b13_resolver.ts WFM          # dry-run, one domain
//   bun run scripts/analytics/b13_resolver.ts WFM --write  # apply, one domain
//
// entity_type classification is additive-corrective (Rule #21: agent does it without asking,
// lands reviewable in the records). record_status is NEVER touched (Rule #1). --dry-run is the
// verification surface: every proposed class + the signal that fired is printed before any write.

const WRITE = process.argv.includes("--write");
const DOM = process.argv.slice(2).find((a) => a !== "--write" && a !== "--dry-run") || null;

async function sem(req: any): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(req)], { stdout: "pipe", stderr: "pipe" });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) throw new Error(`semantius failed (${proc.exitCode}): ${err || out}`);
  return out.trim() ? JSON.parse(out) : null;
}

// 1. unclassified data_objects that are a master in >=1 module (B13's <masters> = module junction)
const objs: any[] = await sem({
  method: "GET",
  path: "/data_objects?entity_type=eq.unclassified&select=id,data_object_name,description,domain_module_data_objects(role,domain_modules(domain_module_code,domain_id))",
});
let masters = objs.filter((o) => (o.domain_module_data_objects || []).some((r: any) => r.role === "master"));

if (DOM) {
  const dRows = await sem({ method: "GET", path: `/domains?domain_code=eq.${DOM}&select=id` });
  const did = dRows?.[0]?.id;
  if (!did) throw new Error(`domain ${DOM} not found`);
  masters = masters.filter((o) =>
    (o.domain_module_data_objects || []).some((r: any) => r.role === "master" && r.domain_modules?.domain_id === did));
}

if (masters.length === 0) { console.log(`No unclassified masters${DOM ? ` in ${DOM}` : ""}. Nothing to do.`); process.exit(0); }

// 2. strongest signal: does the master carry lifecycle states?
const ids = masters.map((o) => o.id);
const ls: any[] = await sem({ method: "GET", path: `/data_object_lifecycle_states?data_object_id=in.(${ids.join(",")})&select=data_object_id` });
const lc = new Map<number, number>();
for (const r of ls) lc.set(r.data_object_id, (lc.get(r.data_object_id) || 0) + 1);

// 3. classify (first match wins; lifecycle dominates)
function classify(o: any): { et: string; why: string; conf: "high" | "med" | "low" } {
  const n = o.data_object_name as string;
  const d = ((o.description as string) || "").toLowerCase();
  const states = lc.get(o.id) || 0;
  if (states > 0) return { et: "operational_workflow", why: `${states} lifecycle states`, conf: "high" };
  if (/_(assignments|memberships|links|mappings|associations|attendances|enrollments|participations?|allocations)$/.test(n))
    return { et: "junction", why: "N:M link name, no lifecycle", conf: "med" };
  if (/(score|scorecard|rating|rollup|aggregate|metric|workload|projection|snapshot|index|ranking|forecast_result)/.test(n)
    || /\b(derived|computed|calculated|aggregat|rolled[- ]up|read-only projection)\b/.test(d))
    return { et: "computed", why: "computed/derived signal", conf: "med" };
  if (/(template|definition|taxonom|catalog|categor|policy|policies|configuration|config|library|libraries|reference|lookup|ruleset|blueprint|standard)/.test(n)
    || /\b(reference data|configuration|template|definition|taxonomy|catalog of|lookup table|set of rules)\b/.test(d))
    return { et: "catalog", why: "config/reference signal", conf: "med" };
  if (/(request|application|order|case|ticket|incident|claim|approval|review|assessment|inspection|engagement|onboarding|offboarding|disbursement|opening)/.test(n)
    || /\b(status|approv|lifecycle|workflow|submitted|draft|pending|in progress)\b/.test(d))
    return { et: "operational_workflow", why: "workflow keyword (lifecycle not authored yet)", conf: "low" };
  return { et: "operational_record", why: "default: per-record, no workflow signal", conf: "low" };
}

const rows = masters.map((o) => {
  const dom = (o.domain_module_data_objects || []).find((r: any) => r.role === "master")?.domain_modules?.domain_module_code || "?";
  return { id: o.id, name: o.data_object_name, dom, ...classify(o) };
}).sort((a, b) => (a.conf === b.conf ? a.name.localeCompare(b.name) : ({ low: 0, med: 1, high: 2 } as any)[a.conf] - ({ low: 0, med: 1, high: 2 } as any)[b.conf]));

// 4. report
const byEt: Record<string, number> = {};
for (const r of rows) byEt[r.et] = (byEt[r.et] || 0) + 1;
console.log(`\n${WRITE ? "WRITING" : "DRY-RUN"} - ${rows.length} unclassified masters${DOM ? ` in ${DOM}` : " catalog-wide"}\n`);
console.log("proposed class distribution:", JSON.stringify(byEt), "\n");
console.log("low/med confidence first (these are the ones to eyeball):\n");
for (const r of rows) {
  console.log(`  [${r.conf.padEnd(4)}] ${r.name.padEnd(34)} -> ${r.et.padEnd(22)} (${r.dom}) :: ${r.why}`);
}

// 5. write (additive; record_status untouched)
if (WRITE) {
  console.log("\napplying...");
  let done = 0;
  for (const r of rows) {
    await sem({ method: "PATCH", path: `/data_objects?id=eq.${r.id}`, body: { entity_type: r.et } });
    done++;
  }
  const left = await sem({ method: "GET", path: `/data_objects?entity_type=eq.unclassified&id=in.(${ids.join(",")})&select=id` });
  console.log(`patched ${done}; unclassified remaining in this set: ${left.length}`);
} else {
  // Write the delta as a reviewable artifact (current -> proposed per object), the q-/a- shape
  // but consolidated catalog-wide. Edit the `proposed` column to correct any row, then apply.
  const byDom: Record<string, typeof rows> = {};
  for (const r of rows) (byDom[r.dom] = byDom[r.dom] || []).push(r);
  const lines: string[] = [
    "# B13 classification delta (entity_type: unclassified -> proposed)",
    "",
    `${rows.length} masters, ${Object.keys(byDom).length} modules. Review the \`proposed\` column; change any value you disagree with, then say apply (or tell me the corrections).`,
    "Valid values: operational_workflow | operational_record | catalog | junction | computed",
    "",
  ];
  for (const dom of Object.keys(byDom).sort()) {
    lines.push(`## ${dom}`, "", "| data_object | current | proposed | conf | why |", "| --- | --- | --- | --- | --- |");
    for (const r of byDom[dom]) lines.push(`| ${r.name} | unclassified | ${r.et} | ${r.conf} | ${r.why} |`);
    lines.push("");
  }
  const out = `.tmp_deploy/b13-classification-delta-2026-06-11.md`;
  await Bun.write(out, lines.join("\n"));
  console.log(`\ndelta written to ${out} (dry-run: nothing patched). Review/edit the proposed column, then re-run with --write to apply.`);
}
