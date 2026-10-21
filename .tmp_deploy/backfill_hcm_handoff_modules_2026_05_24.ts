/**
 * Backfill handoffs.source_domain_module_id / target_domain_module_id
 * for every row touching HCM (domain_id=54).
 *
 * Strategy mirrors backfill_ats_handoff_modules_2026_05_23.ts:
 *   source_domain_module_id = HCM module that masters the trigger_event's data_object.
 *   target_domain_module_id = HCM module that holds the handoff's payload data_object.
 *   Strongest role wins (master > embedded_master > contributor > consumer > derived).
 *   Tie / no-candidate -> leave NULL + surface in the report.
 *
 * Pass --apply to perform the PATCHes. Default is dry-run / report-only.
 *
 * Run from project root:
 *   bun run .tmp_deploy/backfill_hcm_handoff_modules_2026_05_24.ts            # report only
 *   bun run .tmp_deploy/backfill_hcm_handoff_modules_2026_05_24.ts --apply    # apply settable rows
 */

const HCM_DOMAIN_ID = 54;
const APPLY = process.argv.includes("--apply");

const ROLE_RANK: Record<string, number> = {
  master: 0,
  embedded_master: 1,
  contributor: 2,
  consumer: 3,
  derived: 4,
};

async function pg(method: string, path: string, body?: any): Promise<any> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify(payload)), stdout: "pipe", stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${method} ${path} (${code}): ${(stderr || stdout).slice(0, 500)}`);
  return stdout.trim() ? JSON.parse(stdout) : null;
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

function strongest<T extends { role: string }>(rows: T[]): T[] {
  if (rows.length === 0) return [];
  const minRank = Math.min(...rows.map((r) => ROLE_RANK[r.role] ?? 99));
  return rows.filter((r) => (ROLE_RANK[r.role] ?? 99) === minRank);
}

async function main() {
  console.log(`HCM handoff module-attribution backfill (apply=${APPLY})`);
  console.log("=======================================================\n");

  // Pull all HCM-touching handoffs.
  const handoffs: Handoff[] = await pg(
    "GET",
    `/handoffs?or=(source_domain_id.eq.${HCM_DOMAIN_ID},target_domain_id.eq.${HCM_DOMAIN_ID})&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,trigger_event_id,data_object_id,trigger_events(event_name,data_object_id)`,
  );
  console.log(`Step 1: ${handoffs.length} HCM-touching handoffs.`);

  // Pull HCM modules.
  const hcmModules: ModuleRow[] = await pg(
    "GET",
    `/domain_modules?domain_id=eq.${HCM_DOMAIN_ID}&select=id,domain_id,domain_module_code`,
  );
  const moduleById = new Map<number, ModuleRow>(hcmModules.map(m => [m.id, m]));
  console.log(`Step 2: ${hcmModules.length} HCM modules: ${hcmModules.map(m => `${m.id}=${m.domain_module_code}`).join(", ")}`);

  // Collect payload + trigger-event data_object_ids we need module mappings for.
  const dataObjectIds = new Set<number>();
  for (const h of handoffs) {
    if (h.source_domain_id === HCM_DOMAIN_ID && h.source_domain_module_id === null && h.trigger_events?.data_object_id) {
      dataObjectIds.add(h.trigger_events.data_object_id);
    }
    if (h.target_domain_id === HCM_DOMAIN_ID && h.target_domain_module_id === null) {
      dataObjectIds.add(h.data_object_id);
    }
  }
  console.log(`Step 3: ${dataObjectIds.size} distinct data_objects need HCM-module resolution.`);

  if (dataObjectIds.size === 0) {
    console.log("\nNo null module FKs to backfill on HCM side. Done.");
    return;
  }

  // Pull domain_module_data_objects for those data_objects against HCM's modules only.
  const hcmModuleIds = hcmModules.map(m => m.id);
  const dmdoRows: DMDORow[] = await pg(
    "GET",
    `/domain_module_data_objects?data_object_id=in.(${[...dataObjectIds].join(",")})&domain_module_id=in.(${hcmModuleIds.join(",")})&select=domain_module_id,data_object_id,role`,
  );
  console.log(`Step 4: ${dmdoRows.length} (HCM-module, data_object) holdings cover ${new Set(dmdoRows.map(r => r.data_object_id)).size} of ${dataObjectIds.size} data_objects.`);

  // Index by data_object_id -> [{module, role}].
  type Candidate = { module: ModuleRow; role: string };
  const idx = new Map<number, Candidate[]>();
  for (const r of dmdoRows) {
    const m = moduleById.get(r.domain_module_id);
    if (!m) continue;
    if (!idx.has(r.data_object_id)) idx.set(r.data_object_id, []);
    idx.get(r.data_object_id)!.push({ module: m, role: r.role });
  }

  function deriveHcmModule(dataObjectId: number): { moduleId: number | null; reason: string } {
    const cands = idx.get(dataObjectId) ?? [];
    if (cands.length === 0) return { moduleId: null, reason: "no HCM module holds this data_object (deeper B-band gap)" };
    const top = strongest(cands);
    if (top.length === 1) return { moduleId: top[0].module.id, reason: `${top[0].role} on data_object ${dataObjectId}` };
    return { moduleId: null, reason: `tie: ${top.length} HCM modules at role ${top[0].role} (${top.map(c => c.module.domain_module_code).join(", ")})` };
  }

  // Build decision set.
  type Decision = {
    handoff_id: number;
    column: "source_domain_module_id" | "target_domain_module_id";
    side: "outbound" | "inbound";
    eventName: string;
    payloadDoId: number;
    newValue: number | null;
    reason: string;
  };
  const decisions: Decision[] = [];

  for (const h of handoffs) {
    if (h.source_domain_id === HCM_DOMAIN_ID && h.source_domain_module_id === null) {
      const eventDoId = h.trigger_events?.data_object_id ?? null;
      if (eventDoId === null) {
        decisions.push({
          handoff_id: h.id, column: "source_domain_module_id", side: "outbound",
          eventName: h.trigger_events?.event_name ?? "?", payloadDoId: h.data_object_id,
          newValue: null, reason: "trigger_event missing data_object_id",
        });
      } else {
        const d = deriveHcmModule(eventDoId);
        decisions.push({
          handoff_id: h.id, column: "source_domain_module_id", side: "outbound",
          eventName: h.trigger_events?.event_name ?? "?", payloadDoId: eventDoId,
          newValue: d.moduleId, reason: d.reason,
        });
      }
    }
    if (h.target_domain_id === HCM_DOMAIN_ID && h.target_domain_module_id === null) {
      const d = deriveHcmModule(h.data_object_id);
      decisions.push({
        handoff_id: h.id, column: "target_domain_module_id", side: "inbound",
        eventName: h.trigger_events?.event_name ?? "?", payloadDoId: h.data_object_id,
        newValue: d.moduleId, reason: d.reason,
      });
    }
  }

  const settable = decisions.filter(d => d.newValue !== null);
  const ambiguous = decisions.filter(d => d.newValue === null);

  console.log(`\nStep 5: ${decisions.length} decisions (${settable.length} settable, ${ambiguous.length} ambiguous / report-only).\n`);

  if (settable.length > 0) {
    console.log("SETTABLE (deterministic):");
    for (const d of settable) {
      const mod = moduleById.get(d.newValue!);
      console.log(`  handoff ${d.handoff_id} (${d.side}, ${d.eventName}) -> ${d.column} = ${mod?.domain_module_code} [${d.reason}]`);
    }
    console.log("");
  }

  if (ambiguous.length > 0) {
    console.log("AMBIGUOUS / DEEPER GAP (leave NULL; surfaced for review):");
    for (const d of ambiguous) {
      console.log(`  handoff ${d.handoff_id} (${d.side}, ${d.eventName}, payload data_object_id=${d.payloadDoId}) -> ${d.column}: ${d.reason}`);
    }
    console.log("");
  }

  if (!APPLY) {
    console.log("[dry-run] no PATCHes applied. Re-run with --apply to write the settable rows.");
    return;
  }

  if (settable.length === 0) {
    console.log("No settable rows to apply.");
    return;
  }

  console.log(`Applying ${settable.length} PATCHes...`);
  let applied = 0;
  for (const d of settable) {
    const body: Record<string, number> = {};
    body[d.column] = d.newValue!;
    await pg("PATCH", `/handoffs?id=eq.${d.handoff_id}`, body);
    applied++;
  }
  console.log(`Applied ${applied} updates.`);
  console.log("\nUI: https://tests.semantius.app/domain_map/handoffs");
}

main().catch((e) => {
  console.error("\nFATAL:", e?.message || e);
  process.exit(1);
});
