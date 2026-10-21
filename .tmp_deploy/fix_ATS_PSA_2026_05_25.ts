/**
 * Fix loader for 2026-05-25 ATS<->PSA pairwise reconciliation.
 *
 * Single fix in scope:
 *   - Insert 1 ATS-side consumer DMDO row on PSA master `project_resource_allocations`
 *     against ATS-RECRUITMENT-PIPELINE (module id 4), then PATCH handoff 1023
 *     (event `project_resource_allocation.demand_unmet`) to target that module.
 *
 * `necessity=optional` because organisations may not run PSA at all -
 * the requisition flow continues unaffected when PSA is absent.
 *
 * Idempotent: checks existence before insert / PATCH.
 * Omits `record_status` on insert (default 'new' per Rule #1).
 *
 * Run from project root:
 *   bun run .tmp_deploy/fix_ATS_PSA_2026_05_25.ts
 */

interface CmdResult { ok: boolean; data: any; stderr: string; code: number; }

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
  if (code !== 0) return { ok: false, data: null, stderr: stderr.trim() || stdout.trim(), code };
  const text = stdout.trim();
  return { ok: true, data: text ? JSON.parse(text) : null, stderr: "", code: 0 };
}

const ATS_RECRUITMENT_PIPELINE = 4;
const DO_PROJECT_RESOURCE_ALLOCATIONS = 726;
const HANDOFF_DEMAND_UNMET = 1023;

type DmdoRow = {
  domain_module_id: number;
  data_object_id: number;
  role: "consumer";
  necessity: "optional";
  label: string;
};

const DMDO_INSERTS: DmdoRow[] = [
  {
    domain_module_id: ATS_RECRUITMENT_PIPELINE,
    data_object_id: DO_PROJECT_RESOURCE_ALLOCATIONS,
    role: "consumer",
    necessity: "optional",
    label: "ATS-RECRUITMENT-PIPELINE consumes project_resource_allocations (PSA upstream of requisition)",
  },
];

const HANDOFF_PATCHES: { handoff_id: number; target_module_id: number; event_name: string; payload: string }[] = [
  {
    handoff_id: HANDOFF_DEMAND_UNMET,
    target_module_id: ATS_RECRUITMENT_PIPELINE,
    event_name: "project_resource_allocation.demand_unmet",
    payload: "project_resource_allocations",
  },
];

async function main() {
  console.log("Fix-loader: ATS<->PSA pairwise reconciliation (2026-05-25)\n");

  // Pre-flight print
  console.log("=== PROPOSED FIXES (pre-flight) ===");
  console.log("DMDO inserts (role=consumer, necessity=optional):");
  for (const r of DMDO_INSERTS) console.log(`  + module=${r.domain_module_id} data_object=${r.data_object_id} (${r.label})`);
  console.log("Handoff PATCHes:");
  for (const p of HANDOFF_PATCHES) {
    console.log(`  ~ handoff ${p.handoff_id} (${p.event_name}, payload=${p.payload}) -> target_domain_module_id=${p.target_module_id}`);
  }
  console.log("===\n");

  // Phase A: DMDO inserts (idempotent)
  console.log("Phase A: DMDO insert pre-flight read...");
  const moduleIds = [...new Set(DMDO_INSERTS.map((r) => r.domain_module_id))].join(",");
  const dataObjectIds = [...new Set(DMDO_INSERTS.map((r) => r.data_object_id))].join(",");
  const existing = await postgrest(
    "GET",
    `/domain_module_data_objects?domain_module_id=in.(${moduleIds})&data_object_id=in.(${dataObjectIds})&select=domain_module_id,data_object_id,role,necessity`
  );
  if (!existing.ok) { console.error(`  read failed: ${existing.stderr}`); process.exit(1); }
  const existingKeys = new Set<string>(
    (existing.data ?? []).map((r: any) => `${r.domain_module_id}:${r.data_object_id}`)
  );
  console.log(`  ${existing.data?.length ?? 0} existing rows on affected (module, data_object) pairs`);

  const toInsert = DMDO_INSERTS.filter((r) => !existingKeys.has(`${r.domain_module_id}:${r.data_object_id}`));
  if (toInsert.length === 0) {
    console.log("  all rows already present; skipping insert\n");
  } else {
    console.log(`  inserting ${toInsert.length} new rows:`);
    for (const r of toInsert) console.log(`    + ${r.label}`);
    // Omit record_status — rely on default 'new'
    const insertRows = toInsert.map((r) => ({
      domain_module_id: r.domain_module_id,
      data_object_id: r.data_object_id,
      role: r.role,
      necessity: r.necessity,
    }));
    const ins = await postgrest("POST", "/domain_module_data_objects", insertRows);
    if (!ins.ok) { console.error(`  INSERT failed: ${ins.stderr}`); process.exit(1); }
    console.log(`  ok\n`);
  }

  // Phase B: PATCH handoff (only when NULL)
  console.log("Phase B: handoff PATCH (only NULL target_domain_module_id)...");
  const handoffIds = HANDOFF_PATCHES.map((p) => p.handoff_id).join(",");
  const handoffsPre = await postgrest(
    "GET",
    `/handoffs?id=in.(${handoffIds})&select=id,target_domain_module_id,trigger_events(event_name)`
  );
  if (!handoffsPre.ok) { console.error(`  pre-read failed: ${handoffsPre.stderr}`); process.exit(1); }
  const preState = new Map<number, number | null>(
    handoffsPre.data.map((h: any) => [h.id, h.target_domain_module_id])
  );

  let patched = 0, skipped = 0;
  for (const p of HANDOFF_PATCHES) {
    const cur = preState.get(p.handoff_id);
    if (cur !== null && cur !== undefined) {
      if (cur === p.target_module_id) {
        console.log(`  ~ ${p.handoff_id} already set to ${p.target_module_id}; skip`);
        skipped++;
      } else {
        console.log(`  ! ${p.handoff_id} unexpected non-null ${cur}; skip (manual review)`);
        skipped++;
      }
      continue;
    }
    const r = await postgrest(
      "PATCH",
      `/handoffs?id=eq.${p.handoff_id}`,
      { target_domain_module_id: p.target_module_id }
    );
    if (!r.ok) { console.error(`  FAIL ${p.handoff_id}: ${r.stderr}`); continue; }
    console.log(`  ok ${p.handoff_id}  ${p.event_name}  -> module ${p.target_module_id}`);
    patched++;
  }
  console.log(`  patched ${patched}, skipped ${skipped}\n`);

  // Verify
  console.log("Verification:");
  const dmdoVerify = await postgrest(
    "GET",
    `/domain_module_data_objects?domain_module_id=in.(${moduleIds})&data_object_id=in.(${dataObjectIds})&select=domain_module_id,data_object_id,role,necessity,record_status,domain_modules(domain_module_code),data_objects(data_object_name)&order=domain_module_id.asc,data_object_id.asc`
  );
  if (!dmdoVerify.ok) { console.error(`  verify dmdo failed: ${dmdoVerify.stderr}`); process.exit(1); }
  console.log(`  DMDO (${dmdoVerify.data.length}):`);
  for (const r of dmdoVerify.data) {
    console.log(`    ${r.domain_modules.domain_module_code}  ${r.role}/${r.necessity}  ${r.data_objects.data_object_name}  [${r.record_status}]`);
  }

  const handoffVerify = await postgrest(
    "GET",
    `/handoffs?id=in.(${handoffIds})&select=id,source_domain_module_id,target_domain_module_id,trigger_events(event_name)&order=id.asc`
  );
  if (!handoffVerify.ok) { console.error(`  verify handoffs failed: ${handoffVerify.stderr}`); process.exit(1); }
  for (const h of handoffVerify.data) {
    const ok = h.target_domain_module_id !== null && h.source_domain_module_id !== null;
    console.log(`  handoff ${h.id} src=${h.source_domain_module_id} tgt=${h.target_domain_module_id} ${ok ? "OK" : "STILL-NULL"}`);
  }
}

main();
