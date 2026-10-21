/**
 * CSM B1 technical fixes (2026-05-31 continuation pass).
 *
 * Backfills handoffs.source_domain_module_id and handoffs.target_domain_module_id
 * for every row touching CSM (domain_id 30) using the deterministic B10b rule:
 *
 *   source_domain_module_id = CSM module that holds trigger_events.data_object_id
 *     with the strongest role (master > embedded_master > contributor > consumer).
 *   target_domain_module_id = CSM module that holds handoffs.data_object_id
 *     (the payload) with the strongest role.
 *
 *   Ties or no candidate -> leave NULL (surfaced in audit, not auto-resolved).
 *
 * Covers B1-B2 (10 outbound rows) and B1-B3 (53 inbound rows). B1-S4 (the
 * permission_verb_override PATCHes on customer_cases.resolved / .closed) was
 * applied directly via the CLI before this script ran and is not in scope.
 *
 * Run from project root: bun run .tmp_deploy/fix_csm_b1_technical_2026_05_31.ts
 */

const CSM_DOMAIN_ID = 30;
const ROLE_RANK: Record<string, number> = {
  master: 0,
  embedded_master: 1,
  contributor: 2,
  consumer: 3,
  derived: 4,
};

interface CmdResult {
  ok: boolean;
  data: any;
  status: number;
}

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
  console.log("CSM B1 technical: handoff module-FK backfill (2026-05-31)");
  console.log("=========================================================\n");

  console.log("Step 1: pull CSM-touching handoffs + trigger events");
  const handoffs: Handoff[] = await get(
    `/handoffs?or=(source_domain_id.eq.${CSM_DOMAIN_ID},target_domain_id.eq.${CSM_DOMAIN_ID})&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,trigger_event_id,data_object_id,trigger_events(event_name,data_object_id)`
  );
  console.log(`  ${handoffs.length} handoffs found`);

  console.log("Step 2: pull CSM modules + CSM DMDOs");
  const modules: ModuleRow[] = await get(
    `/domain_modules?domain_id=eq.${CSM_DOMAIN_ID}&select=id,domain_id,domain_module_code`
  );
  const modulesById = new Map<number, ModuleRow>(modules.map((m) => [m.id, m]));
  console.log(`  ${modules.length} CSM modules`);

  const csmModuleIds = modules.map((m) => m.id);
  const dmdoRows: DMDORow[] = await get(
    `/domain_module_data_objects?domain_module_id=in.(${csmModuleIds.join(",")})&select=domain_module_id,data_object_id,role`
  );
  console.log(`  ${dmdoRows.length} CSM DMDO rows\n`);

  // Index: data_object_id -> [{module, role}, ...] (within CSM only)
  type Candidate = { module: ModuleRow; role: string };
  const candidatesByDo = new Map<number, Candidate[]>();
  for (const r of dmdoRows) {
    const m = modulesById.get(r.domain_module_id);
    if (!m) continue;
    if (!candidatesByDo.has(r.data_object_id)) candidatesByDo.set(r.data_object_id, []);
    candidatesByDo.get(r.data_object_id)!.push({ module: m, role: r.role });
  }

  function deriveCsmModule(dataObjectId: number): { moduleId: number | null; reason: string } {
    const cands = candidatesByDo.get(dataObjectId) ?? [];
    if (cands.length === 0) return { moduleId: null, reason: `no CSM module holds data_object ${dataObjectId}` };
    const top = strongest(cands);
    if (top.length === 1) return { moduleId: top[0].module.id, reason: `${top[0].role} on data_object ${dataObjectId}` };
    return {
      moduleId: null,
      reason: `tie: ${top.length} CSM modules with role ${top[0].role} (${top.map((c) => c.module.domain_module_code).join(", ")})`,
    };
  }

  console.log("Step 3: derive");
  type FixRow = {
    handoff_id: number;
    column: "source_domain_module_id" | "target_domain_module_id";
    newValue: number | null;
    reason: string;
    eventName: string;
    payloadDo: number;
  };
  const decisions: FixRow[] = [];

  for (const h of handoffs) {
    if (h.source_domain_id === CSM_DOMAIN_ID && h.source_domain_module_id === null) {
      const eventDoId = h.trigger_events?.data_object_id;
      if (!eventDoId) {
        decisions.push({
          handoff_id: h.id,
          column: "source_domain_module_id",
          newValue: null,
          reason: "trigger_event missing data_object_id",
          eventName: h.trigger_events?.event_name ?? "?",
          payloadDo: h.data_object_id,
        });
      } else {
        const d = deriveCsmModule(eventDoId);
        decisions.push({
          handoff_id: h.id,
          column: "source_domain_module_id",
          newValue: d.moduleId,
          reason: `event DO ${eventDoId}: ${d.reason}`,
          eventName: h.trigger_events?.event_name ?? "?",
          payloadDo: h.data_object_id,
        });
      }
    }
    if (h.target_domain_id === CSM_DOMAIN_ID && h.target_domain_module_id === null) {
      const d = deriveCsmModule(h.data_object_id);
      decisions.push({
        handoff_id: h.id,
        column: "target_domain_module_id",
        newValue: d.moduleId,
        reason: `payload DO ${h.data_object_id}: ${d.reason}`,
        eventName: h.trigger_events?.event_name ?? "?",
        payloadDo: h.data_object_id,
      });
    }
  }

  const settable = decisions.filter((d) => d.newValue !== null);
  const ambiguous = decisions.filter((d) => d.newValue === null);
  console.log(`  ${decisions.length} decisions: ${settable.length} settable, ${ambiguous.length} left NULL (ambiguous or no candidate)\n`);

  if (settable.length > 0) {
    console.log("Settable PATCHes:");
    for (const d of settable) {
      const mod = modulesById.get(d.newValue!);
      console.log(`  handoff ${d.handoff_id} (${d.eventName}): ${d.column} = ${mod?.domain_module_code ?? "?"} [${d.reason}]`);
    }
    console.log("");
  }

  if (ambiguous.length > 0) {
    console.log("Left NULL (surfaced for audit follow-up):");
    for (const d of ambiguous) {
      console.log(`  handoff ${d.handoff_id} (${d.eventName}): ${d.column} - ${d.reason}`);
    }
    console.log("");
  }

  console.log("Step 4: apply PATCHes");
  let applied = 0;
  for (const d of settable) {
    const body: any = {};
    body[d.column] = d.newValue;
    await patch(`/handoffs?id=eq.${d.handoff_id}`, body);
    applied++;
  }
  console.log(`  applied ${applied} updates\n`);

  console.log("Step 5: post-fix audit");
  const remaining = await get(
    `/handoffs?or=(and(source_domain_id.eq.${CSM_DOMAIN_ID},source_domain_module_id.is.null),and(target_domain_id.eq.${CSM_DOMAIN_ID},target_domain_module_id.is.null))&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,data_object_id,trigger_events(event_name,data_object_id)`
  );
  if (remaining.length === 0) {
    console.log("  zero CSM-side NULL module FKs remaining");
  } else {
    console.log(`  ${remaining.length} CSM-side NULL module FKs remain (expected = ambiguous count above)`);
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error("\nFATAL:", e?.message || e);
  process.exit(1);
});
