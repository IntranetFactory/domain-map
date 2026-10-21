/**
 * B1A-HANDOFF-MODULE-BACKFILL (UEM, domain 86).
 *
 * Backfill source_domain_module_id on all 9 outbound UEM handoffs (655-663)
 * now that UEM's 3 modules exist (308/309/310). Deterministic strongest-role
 * derivation per SKILL.md B10b:
 *   source_domain_module_id = module in source_domain (86) that masters the
 *     trigger_event's data_object_id with the strongest role
 *     (master > embedded_master > contributor > consumer > derived).
 *
 * Scope: UEM is the SOURCE on every one of these rows, so we only ever set
 * source_domain_module_id. The NULL target_domain_module_id on 657 (target HAM)
 * and 662 (target SAM) is the TARGET domain's B10b, not ours - left untouched.
 *
 * All 9 rows currently carry source_domain_module_id=NULL (snapshotted in
 * audits/UEM/history.md before this run). Idempotent: skips any row already set.
 *
 * Run from project root: bun run .tmp_deploy/backfill_uem_handoff_modules_2026_06_06.ts
 */

const UEM_DOMAIN_ID = 86;
const ROLE_RANK: Record<string, number> = {
  master: 0,
  embedded_master: 1,
  contributor: 2,
  consumer: 3,
  derived: 4,
};

interface CmdResult { ok: boolean; data: any; status: number; }

async function postgrest(method: string, path: string, body?: any): Promise<CmdResult> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" }
  );
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    console.error(`  semantius failed (${code}): ${stderr.trim() || stdout.trim()}`);
    return { ok: false, data: null, status: code };
  }
  const text = stdout.trim();
  return { ok: true, data: text ? JSON.parse(text) : null, status: 0 };
}

async function get(path: string): Promise<any> {
  const r = await postgrest("GET", path);
  if (!r.ok) throw new Error(`GET ${path} failed`);
  return r.data;
}
async function patch(path: string, body: any): Promise<any> {
  const r = await postgrest("PATCH", path, body);
  if (!r.ok) throw new Error(`PATCH ${path} failed`);
  return r.data;
}

function strongest<T extends { role: string }>(rows: T[]): T[] {
  if (rows.length === 0) return [];
  const minRank = Math.min(...rows.map((r) => ROLE_RANK[r.role] ?? 99));
  return rows.filter((r) => (ROLE_RANK[r.role] ?? 99) === minRank);
}

type Handoff = {
  id: number;
  source_domain_id: number;
  target_domain_id: number;
  source_domain_module_id: number | null;
  target_domain_module_id: number | null;
  trigger_event_id: number;
  data_object_id: number;
  trigger_events: { event_name: string; data_object_id: number } | null;
};
type ModuleRow = { id: number; domain_id: number | null; domain_module_code: string };
type DMDORow = { domain_module_id: number; data_object_id: number; role: string };

async function main() {
  console.log("UEM handoff source-module backfill (2026-06-06)");
  console.log("==============================================\n");

  const handoffs: Handoff[] = await get(
    `/handoffs?source_domain_id=eq.${UEM_DOMAIN_ID}&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,trigger_event_id,data_object_id,trigger_events(event_name,data_object_id)&order=id.asc`
  );
  console.log(`Step 1: ${handoffs.length} outbound UEM handoffs found`);

  const eventDoIds = new Set<number>();
  for (const h of handoffs) if (h.trigger_events?.data_object_id) eventDoIds.add(h.trigger_events.data_object_id);

  const modules: ModuleRow[] = await get(
    `/domain_modules?domain_id=eq.${UEM_DOMAIN_ID}&select=id,domain_id,domain_module_code`
  );
  const modulesById = new Map<number, ModuleRow>(modules.map((m) => [m.id, m]));
  console.log(`Step 2: ${modules.length} UEM modules`);

  const moduleIds = modules.map((m) => m.id);
  const dmdoRows: DMDORow[] = await get(
    `/domain_module_data_objects?data_object_id=in.(${[...eventDoIds].join(",")})&domain_module_id=in.(${moduleIds.join(",")})&select=domain_module_id,data_object_id,role`
  );
  console.log(`Step 3: ${dmdoRows.length} (module, event-data_object) DMDO pairs\n`);

  // index (data_object_id) -> [{module, role}]
  const idx = new Map<number, { module: ModuleRow; role: string }[]>();
  for (const r of dmdoRows) {
    const m = modulesById.get(r.domain_module_id);
    if (!m) continue;
    if (!idx.has(r.data_object_id)) idx.set(r.data_object_id, []);
    idx.get(r.data_object_id)!.push({ module: m, role: r.role });
  }

  function derive(doId: number): { moduleId: number | null; reason: string } {
    const cands = idx.get(doId) ?? [];
    if (cands.length === 0) return { moduleId: null, reason: `no UEM module masters data_object ${doId}` };
    const top = strongest(cands);
    if (top.length === 1) return { moduleId: top[0].module.id, reason: `${top[0].role} on data_object ${doId}` };
    return { moduleId: null, reason: `tie: ${top.map((c) => c.module.domain_module_code).join(", ")}` };
  }

  type Fix = { id: number; moduleId: number | null; reason: string; event: string };
  const fixes: Fix[] = [];
  for (const h of handoffs) {
    if (h.source_domain_module_id !== null) {
      console.log(`  handoff ${h.id} already set (source_domain_module_id=${h.source_domain_module_id}) - skip`);
      continue;
    }
    const eventDo = h.trigger_events?.data_object_id;
    if (!eventDo) { fixes.push({ id: h.id, moduleId: null, reason: "trigger_event missing data_object_id", event: h.trigger_events?.event_name ?? "?" }); continue; }
    const d = derive(eventDo);
    fixes.push({ id: h.id, moduleId: d.moduleId, reason: d.reason, event: h.trigger_events?.event_name ?? "?" });
  }

  const settable = fixes.filter((f) => f.moduleId !== null);
  const ambiguous = fixes.filter((f) => f.moduleId === null);

  console.log(`\nDecisions: ${fixes.length} (${settable.length} settable, ${ambiguous.length} ambiguous)\n`);
  for (const f of settable) {
    console.log(`  handoff ${f.id} (${f.event}): source_domain_module_id = ${modulesById.get(f.moduleId!)?.domain_module_code} [${f.reason}]`);
  }
  for (const f of ambiguous) {
    console.log(`  AMBIGUOUS handoff ${f.id} (${f.event}): ${f.reason}`);
  }

  console.log("\nApplying PATCHes...");
  let applied = 0;
  for (const f of settable) {
    await patch(`/handoffs?id=eq.${f.id}`, { source_domain_module_id: f.moduleId });
    applied++;
  }
  console.log(`Applied ${applied} updates.`);

  console.log("\nPost-fix audit (UEM-side null source module FKs remaining):");
  const remaining = await get(
    `/handoffs?source_domain_id=eq.${UEM_DOMAIN_ID}&source_domain_module_id=is.null&select=id,trigger_events(event_name)`
  );
  if (remaining.length === 0) console.log("  zero remaining.");
  else for (const r of remaining) console.log(`  handoff ${r.id} (${r.trigger_events?.event_name}) still null`);

  console.log("\nDone.");
}

main().catch((e) => { console.error("\nFATAL:", e?.message || e); process.exit(1); });
