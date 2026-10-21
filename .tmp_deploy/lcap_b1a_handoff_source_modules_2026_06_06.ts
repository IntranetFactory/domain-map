#!/usr/bin/env bun
// B1A-HANDOFF-SOURCE-MODULES — PATCH source_domain_module_id on 4 outbound LCAP handoffs.
//
// Derivation (B10b): source_domain_module_id = the module in the source domain (37) that
// MASTERS the trigger_event's data_object, strongest role wins. All four resolve cleanly:
//   704 (lcap_app.published,           event do 220 lcap_apps)            -> 265 LCAP-VISUAL-COMPOSITION
//   705 (lcap_workflow.published,       event do 222 lcap_workflows)       -> 266 LCAP-RUNTIME-LIFECYCLE
//   706 (lcap_app.deployment_failed,    event do 220 lcap_apps)            -> 265 LCAP-VISUAL-COMPOSITION
//   707 (lcap_business_object.schema_changed, event do 221 lcap_business_objects) -> 265 LCAP-VISUAL-COMPOSITION
//
// Prior value on all four: source_domain_module_id = NULL (snapshotted in history.md).
// target_domain_module_id is NOT touched (706 already=38 ITSM; 704/705/707 stay NULL pending
// counterparty audits — B1B-S14-OTHERS).
//
// Run from project root: bun run c:/dev/domain-map/.tmp_deploy/lcap_b1a_handoff_source_modules_2026_06_06.ts

export {};

async function postgrest(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path}: ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

const MAP: Record<number, number> = { 704: 265, 705: 266, 706: 265, 707: 265 };

// Pre-flight: re-read current state, only patch rows still NULL on source side and in domain 37.
const rows: any[] = await postgrest(
  "GET",
  "/handoffs?id=in.(704,705,706,707)&select=id,source_domain_id,source_domain_module_id,trigger_events(data_object_id)",
);
console.log("Pre-flight:");
for (const r of rows) console.log(`  handoff ${r.id}: source_domain_id=${r.source_domain_id} source_domain_module_id=${r.source_domain_module_id} eventDO=${r.trigger_events?.data_object_id}`);

let patched = 0;
for (const r of rows) {
  if (r.source_domain_id !== 37) {
    console.log(`  SKIP ${r.id}: source_domain_id != 37`);
    continue;
  }
  if (r.source_domain_module_id !== null) {
    console.log(`  SKIP ${r.id}: source_domain_module_id already set (${r.source_domain_module_id})`);
    continue;
  }
  const mod = MAP[r.id];
  await postgrest("PATCH", `/handoffs?id=eq.${r.id}`, { source_domain_module_id: mod });
  console.log(`  PATCHed handoff ${r.id}: source_domain_module_id = ${mod}`);
  patched++;
}

console.log(`\nPatched ${patched} rows.`);

// Verify
const after: any[] = await postgrest(
  "GET",
  "/handoffs?id=in.(704,705,706,707)&select=id,source_domain_module_id,target_domain_module_id&order=id.asc",
);
console.log("Post-fix:");
for (const r of after) console.log(`  handoff ${r.id}: source=${r.source_domain_module_id} target=${r.target_domain_module_id}`);
