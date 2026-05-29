/**
 * Backfill cross_domain_handoffs.source_domain_module_id / target_domain_module_id
 * for every row touching ATS (domain_id 56).
 *
 * Discovered 2026-05-23: 99% of cross_domain_handoffs rows in the catalog have
 * NULL per-module attribution. The audit didn't catch it because the SKILL.md
 * B9 check didn't include these columns in its query.
 *
 * Derivation rule (matches new SKILL.md B9b):
 *   source_domain_module_id = module in source_domain that MASTERS the
 *     trigger_event's data_object (i.e., who publishes the event). Strongest
 *     role wins: master > embedded_master > contributor > consumer > derived.
 *   target_domain_module_id = module in target_domain that holds the handoff's
 *     PAYLOAD data_object with the strongest role.
 *   Ties or no candidates -> leave NULL + report.
 *
 * Scope: only rows where ATS is on the relevant side.
 *   - source_domain_id=56 -> backfill source_domain_module_id (other side is
 *     the target domain's concern; will be caught by their B9b when audited).
 *   - target_domain_id=56 -> backfill target_domain_module_id.
 *
 * Run from project root: bun run .tmp_deploy/backfill_ats_handoff_modules_2026_05_23.ts
 */

const ATS_DOMAIN_ID = 56;
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
  console.log("ATS handoff module-attribution backfill (2026-05-23)");
  console.log("=====================================================\n");

  console.log("Step 1: pull ATS-touching handoffs + trigger events");
  const handoffs: Handoff[] = await get(
    `/cross_domain_handoffs?or=(source_domain_id.eq.${ATS_DOMAIN_ID},target_domain_id.eq.${ATS_DOMAIN_ID})&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,trigger_event_id,data_object_id,trigger_events(event_name,data_object_id)`
  );
  console.log(`  ${handoffs.length} handoffs found`);

  // Collect the set of (domain, data_object) pairs we need to resolve modules for.
  // source side: (source_domain_id, trigger_events.data_object_id)
  // target side: (target_domain_id, cross_domain_handoffs.data_object_id)
  const domainIds = new Set<number>();
  const dataObjectIds = new Set<number>();
  for (const h of handoffs) {
    domainIds.add(h.source_domain_id);
    domainIds.add(h.target_domain_id);
    if (h.trigger_events?.data_object_id) dataObjectIds.add(h.trigger_events.data_object_id);
    dataObjectIds.add(h.data_object_id);
  }

  console.log(`Step 2: pull modules for ${domainIds.size} relevant domains`);
  const modules: ModuleRow[] = await get(
    `/domain_modules?domain_id=in.(${[...domainIds].join(",")})&select=id,domain_id,domain_module_code`
  );
  const modulesByDomain = new Map<number, ModuleRow[]>();
  for (const m of modules) {
    if (m.domain_id === null) continue;
    if (!modulesByDomain.has(m.domain_id)) modulesByDomain.set(m.domain_id, []);
    modulesByDomain.get(m.domain_id)!.push(m);
  }
  const modulesById = new Map<number, ModuleRow>(modules.map((m) => [m.id, m]));
  console.log(`  ${modules.length} modules across those domains`);

  console.log(`Step 3: pull domain_module_data_objects for ${dataObjectIds.size} payload data_objects`);
  const allModuleIds = modules.map((m) => m.id);
  const dmdoRows: DMDORow[] = await get(
    `/domain_module_data_objects?data_object_id=in.(${[...dataObjectIds].join(",")})&domain_module_id=in.(${allModuleIds.join(",")})&select=domain_module_id,data_object_id,role`
  );
  console.log(`  ${dmdoRows.length} (module, data_object) pairs`);

  // Index: (domain_id, data_object_id) -> [{module, role}, ...]
  type Candidate = { module: ModuleRow; role: string };
  const candidatesIdx = new Map<string, Candidate[]>();
  for (const r of dmdoRows) {
    const m = modulesById.get(r.domain_module_id);
    if (!m || m.domain_id === null) continue;
    const key = `${m.domain_id}:${r.data_object_id}`;
    if (!candidatesIdx.has(key)) candidatesIdx.set(key, []);
    candidatesIdx.get(key)!.push({ module: m, role: r.role });
  }

  function deriveModule(domainId: number, dataObjectId: number): { moduleId: number | null; reason: string } {
    const key = `${domainId}:${dataObjectId}`;
    const cands = candidatesIdx.get(key) ?? [];
    if (cands.length === 0) return { moduleId: null, reason: "no module in domain holds this data_object" };
    const top = strongest(cands);
    if (top.length === 1) return { moduleId: top[0].module.id, reason: `${top[0].role} on data_object ${dataObjectId}` };
    return {
      moduleId: null,
      reason: `tie: ${top.length} modules with role ${top[0].role} (${top.map((c) => c.module.domain_module_code).join(", ")})`,
    };
  }

  console.log("\nStep 4: derive and patch\n");
  type FixRow = { handoff_id: number; column: "source_domain_module_id" | "target_domain_module_id"; newValue: number | null; reason: string; eventName: string };
  const decisions: FixRow[] = [];

  for (const h of handoffs) {
    // Source side: who publishes the trigger_event? Use trigger_events.data_object_id.
    if (h.source_domain_id === ATS_DOMAIN_ID && h.source_domain_module_id === null) {
      const eventDoId = h.trigger_events?.data_object_id;
      if (!eventDoId) {
        decisions.push({
          handoff_id: h.id,
          column: "source_domain_module_id",
          newValue: null,
          reason: "trigger_event missing data_object_id",
          eventName: h.trigger_events?.event_name ?? "?",
        });
      } else {
        const d = deriveModule(ATS_DOMAIN_ID, eventDoId);
        decisions.push({
          handoff_id: h.id,
          column: "source_domain_module_id",
          newValue: d.moduleId,
          reason: d.reason,
          eventName: h.trigger_events?.event_name ?? "?",
        });
      }
    }
    // Target side: who holds the payload?
    if (h.target_domain_id === ATS_DOMAIN_ID && h.target_domain_module_id === null) {
      const d = deriveModule(ATS_DOMAIN_ID, h.data_object_id);
      decisions.push({
        handoff_id: h.id,
        column: "target_domain_module_id",
        newValue: d.moduleId,
        reason: d.reason,
        eventName: h.trigger_events?.event_name ?? "?",
      });
    }
  }

  const settable = decisions.filter((d) => d.newValue !== null);
  const ambiguous = decisions.filter((d) => d.newValue === null);

  console.log(`Decisions: ${decisions.length} (${settable.length} settable, ${ambiguous.length} ambiguous/leave-null)\n`);

  if (settable.length > 0) {
    console.log("Settable:");
    for (const d of settable) {
      const mod = modulesById.get(d.newValue!);
      console.log(`  handoff ${d.handoff_id} (${d.eventName}): ${d.column} = ${mod?.domain_module_code ?? "?"} [${d.reason}]`);
    }
    console.log("");
  }

  if (ambiguous.length > 0) {
    console.log("AMBIGUOUS / LEFT NULL (manual review needed):");
    for (const d of ambiguous) {
      console.log(`  handoff ${d.handoff_id} (${d.eventName}): ${d.column} - ${d.reason}`);
    }
    console.log("");
  }

  // Apply the settable updates. Each PATCH is one row by id.
  console.log("Applying PATCHes...");
  let applied = 0;
  for (const d of settable) {
    const body: any = {};
    body[d.column] = d.newValue;
    await patch(`/cross_domain_handoffs?id=eq.${d.handoff_id}`, body);
    applied++;
  }
  console.log(`Applied ${applied} updates.`);

  // Verify: re-query.
  console.log("\nStep 5: post-fix audit");
  const remaining = await get(
    `/cross_domain_handoffs?or=(and(source_domain_id.eq.${ATS_DOMAIN_ID},source_domain_module_id.is.null),and(target_domain_id.eq.${ATS_DOMAIN_ID},target_domain_module_id.is.null))&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,trigger_events(event_name)`
  );
  if (remaining.length === 0) {
    console.log("  zero ATS-side null module FKs remaining.");
  } else {
    console.log(`  ${remaining.length} ATS-side null module FKs remaining (expected = ambiguous count above):`);
    for (const r of remaining) {
      const side = r.source_domain_id === ATS_DOMAIN_ID && r.source_domain_module_id === null ? "source" : "target";
      console.log(`    handoff ${r.id} (${r.trigger_events?.event_name}): ${side} side`);
    }
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error("\nFATAL:", e?.message || e);
  process.exit(1);
});
