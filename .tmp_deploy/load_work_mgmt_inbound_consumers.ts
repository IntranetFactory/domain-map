#!/usr/bin/env bun
// Follow-up to load_work_mgmt_full.ts: load consumer DMDOs on WORK-MGMT-TASK-EXEC for
// the 16 foreign payloads that arrive via inbound handoffs, then re-patch the
// previously-NULL target_domain_module_id on those handoff rows.

const SEMANTIUS = "semantius";

async function api(path: string, method: "GET" | "POST" | "PATCH" | "DELETE" = "GET", body?: any) {
  const args: any = { method, path };
  if (body !== undefined) args.body = body;
  const proc = Bun.spawn([SEMANTIUS, "call", "crud", "postgrestRequest"], {
    stdin: new TextEncoder().encode(JSON.stringify(args)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const errOut = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) throw new Error(`semantius failed: ${errOut}\n${out}`);
  return out.trim() ? JSON.parse(out) : null;
}

const TASK_EXEC_ID = 149;

// 16 foreign payloads arriving inbound to WORK-MGMT.
// All marked consumer + optional: WORK-MGMT can create work_items from the event
// without requiring back-reference reads on the source data_object.
const consumerPayloadIds = [
  100, // crm_opportunities (CRM)
  274, // strategic_initiatives (SPM)
  273, // strategic_portfolios (SPM)
  184, // action_plans (EMP-EXP)
  714, // nocode_automations (NCDB)
  584, // business_rules_extracted (PROC-MIN)
  472, // webhook_subscriptions (IPAAS)
  678, // pull_requests (VSDP)
  576, // test_defects (TEST-MGMT)
  250, // process_simulation_runs (BPA)
  276, // business_value_assessments (SPM)
  217, // project_tasks (PSA)
  405, // product_roadmaps (PROD-MGMT)
  406, // feature_requests (PROD-MGMT)
  404, // product_releases (PROD-MGMT)
  218, // project_assignments (PSA)
];

console.log("Step 1: Insert 16 consumer DMDOs on WORK-MGMT-TASK-EXEC");

const dmdoRows = consumerPayloadIds.map((doid) => ({
  domain_module_id: TASK_EXEC_ID,
  data_object_id: doid,
  role: "consumer",
  necessity: "optional",
}));

const dmdoExisting: any[] = await api(
  `/domain_module_data_objects?domain_module_id=eq.${TASK_EXEC_ID}&data_object_id=in.(${consumerPayloadIds.join(",")})&select=data_object_id`,
);
const have = new Set(dmdoExisting.map((r: any) => r.data_object_id));
const missing = dmdoRows.filter((r) => !have.has(r.data_object_id));
if (missing.length) {
  console.log(`  inserting ${missing.length} of 16 consumer rows`);
  await api("/domain_module_data_objects", "POST", missing);
} else {
  console.log("  all 16 already present");
}

console.log("Step 2: Re-patch the 16 inbound handoffs with target_domain_module_id=TASK_EXEC_ID");

const handoffs: any[] = await api(
  `/handoffs?target_domain_id=eq.135&target_domain_module_id=is.null&select=id,data_object_id`,
);
let patched = 0;
for (const h of handoffs) {
  if (consumerPayloadIds.includes(h.data_object_id)) {
    await api(`/handoffs?id=eq.${h.id}`, "PATCH", { target_domain_module_id: TASK_EXEC_ID });
    patched++;
  }
}
console.log(`  patched ${patched} of ${handoffs.length} handoffs`);

console.log("\nDone. WORK-MGMT inbound B10b should now be clean.");
