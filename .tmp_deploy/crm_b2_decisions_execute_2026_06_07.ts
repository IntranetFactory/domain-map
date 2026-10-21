// CRM b2 decision execution, 2026-06-07.
// User-resolved decisions from audits/CRM/state.yaml:
//   B2-S2 = b  -> revert auto-populated notes on pipeline_stages (101). DESTRUCTIVE, approved.
//   B2-S4 = all yes -> flip 4 pattern flags to true. DESTRUCTIVE (false->true), approved.
//   B2-S7 = a  -> promote CUSTOMER-360 (cap 310) to cross-cutting: add the 2 missing
//                 capability_domains rows (CSM 30, MA 70). Additive (record_status defaults 'new').
//   B2-S5 = a, B2-S6 = a, B2-CRM-C1 = b -> confirm-only, no DB write (state.yaml only).
//
// Run: bun run "c:/dev/domain-map/.tmp_deploy/crm_b2_decisions_execute_2026_06_07.ts"

async function call(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`semantius failed (${code}) on ${method} ${path}\n${err}\n${out}`);
  const trimmed = out.trim();
  return trimmed ? JSON.parse(trimmed) : null;
}

// --- B2-S2: revert pipeline_stages (101) notes to empty ---------------------
async function revertPipelineStagesNote() {
  const before = await call("GET", "/data_objects?id=eq.101&select=notes");
  if ((before?.[0]?.notes ?? "") === "") {
    console.log("B2-S2: notes on 101 already empty, skipping.");
    return;
  }
  await call("PATCH", "/data_objects?id=eq.101", { notes: "" });
  console.log("B2-S2: reverted pipeline_stages (101) notes to empty.");
}

// --- B2-S4: flip pattern flags to true --------------------------------------
async function flipPatternFlags() {
  const patches: Array<[number, Record<string, boolean>]> = [
    [99, { has_submit_lock: true }],                              // crm_leads: locks on conversion
    [100, { has_personal_content: true, has_single_approver: true }], // crm_opportunities
    [102, { has_personal_content: true }],                        // sales_activities
  ];
  for (const [id, body] of patches) {
    await call("PATCH", `/data_objects?id=eq.${id}`, body);
    console.log(`B2-S4: data_object ${id} <- ${JSON.stringify(body)}`);
  }
}

// --- B2-S7: promote CUSTOMER-360 (cap 310) to cross-cutting -----------------
const CAP = 310;
const CAP_NAME = "Customer 360 (Unified Customer View)";
const NEW_LINKS = [
  { domain_id: 30, domain_name: "Customer Service Management" },
  { domain_id: 70, domain_name: "Marketing Automation" },
];

async function promoteCustomer360() {
  const existing = await call("GET", `/capability_domains?capability_id=eq.${CAP}&select=domain_id`);
  const have = new Set((existing ?? []).map((r: any) => r.domain_id));
  const rows = NEW_LINKS.filter((l) => !have.has(l.domain_id)).map((l) => ({
    capability_id: CAP,
    domain_id: l.domain_id,
    capability_domain_label: `${CAP_NAME} / ${l.domain_name}`,
    notes: "",
  }));
  if (rows.length === 0) {
    console.log("B2-S7: CUSTOMER-360 already linked to CSM + MA, nothing to insert.");
    return;
  }
  const inserted = await call("POST", "/capability_domains", rows);
  console.log(`B2-S7: linked CUSTOMER-360 to ${rows.length} new domains.`);
  for (const r of inserted ?? []) console.log(`  id=${r.id} cap=${r.capability_id} domain=${r.domain_id} "${r.capability_domain_label}"`);
}

// --- run --------------------------------------------------------------------
await revertPipelineStagesNote();
await flipPatternFlags();
await promoteCustomer360();

// Verify
console.log("\n--- verify ---");
console.table(await call("GET", "/data_objects?id=in.(99,100,101,102)&select=id,data_object_name,notes,has_personal_content,has_submit_lock,has_single_approver&order=id.asc"));
console.table(await call("GET", `/capability_domains?capability_id=eq.${CAP}&select=id,domain_id,capability_domain_label,record_status&order=domain_id.asc`));
