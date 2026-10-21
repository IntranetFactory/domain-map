// B1A-F2-F3-SYSTEM-SKILLS: author 1 system skill per VMS module (315/316), redistribute the 8
// skill_tools from legacy skill 118, then DELETE skill 118.
// Run: bun run c:/dev/domain-map/.tmp_deploy/vms_system_skills_2026_06_06.ts
// Rule #1: record_status omitted. Rule #15: skill_tools.notes empty.
// Tools (catalog-wide, reused by tool_id; not created here):
//   757 query_contingent_workers (do186), 758 query_work_orders (do187),
//   759 query_staffing_suppliers (do188), 760 query_rate_cards (do189),
//   761 query_contingent_timesheets (do190), 762 query_contingent_invoices (do191),
//   42 sign_document (side_effect), 37 send_email (side_effect).

type Row = Record<string, unknown>;

async function call(payload: Row): Promise<Row[]> {
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest"],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe", cwd: "c:/dev/domain-map" },
  );
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) throw new Error(`semantius exit ${proc.exitCode}: ${err}\n${out}`);
  if (out.trim() === "") return [];
  try { return JSON.parse(out); } catch { throw new Error(`Non-JSON response: ${out}\n${err}`); }
}

// --- Step 0: dedup pre-flight on system skills for 315/316 -------------------
const existingSkills = await call({
  method: "GET",
  path: "/skills?domain_module_id=in.(315,316)&skill_type=eq.system&select=id,skill_name,domain_module_id",
});
const skillByModule = new Map<number, number>();
for (const s of existingSkills) skillByModule.set(Number(s.domain_module_id), Number(s.id));
console.log(`Existing system skills on 315/316: ${existingSkills.length}`);

// --- Step 1: INSERT the two module system skills (if absent) -----------------
const skillSpecs = [
  {
    module_id: 315,
    skill_name: "vms_worker_sourcing_agent",
    description:
      "System skill for the Worker Sourcing and Supplier Management module. Operates over staffing suppliers, rate cards, staffing work orders, and contingent workers: queries each master, drives the supplier-activation, rate-card publish/supersede, and worker tenure lifecycles, and signs statements of work.",
  },
  {
    module_id: 316,
    skill_name: "vms_time_invoicing_agent",
    description:
      "System skill for the Contingent Time and Invoicing module. Operates over contingent timesheets and contingent invoices: queries each master, drives timesheet submit-approve-bill and invoice receive-match-pay lifecycles, and notifies suppliers and approvers.",
  },
];

for (const spec of skillSpecs) {
  if (skillByModule.has(spec.module_id)) {
    console.log(`  skill for module ${spec.module_id} already exists (id ${skillByModule.get(spec.module_id)}), skipping insert`);
    continue;
  }
  const [row] = await call({
    method: "POST",
    path: "/skills",
    body: [{
      skill_name: spec.skill_name,
      skill_type: "system",
      domain_module_id: spec.module_id,
      domain_id: 64,
      description: spec.description,
    }],
  });
  skillByModule.set(spec.module_id, Number(row.id));
  console.log(`  inserted skill id=${row.id} '${row.skill_name}' for module ${spec.module_id}`);
}

const skill315 = skillByModule.get(315)!;
const skill316 = skillByModule.get(316)!;

// --- Step 2: redistribute skill_tools ----------------------------------------
// 315: query_cw(757), query_work_orders(758), query_suppliers(759), query_rate_cards(760),
//      sign_document(42), send_email(37)
// 316: query_timesheets(761), query_invoices(762), send_email(37)
const desired: { skill_id: number; tool_id: number; requirement_level: string }[] = [
  { skill_id: skill315, tool_id: 757, requirement_level: "required" },
  { skill_id: skill315, tool_id: 758, requirement_level: "required" },
  { skill_id: skill315, tool_id: 759, requirement_level: "required" },
  { skill_id: skill315, tool_id: 760, requirement_level: "required" },
  { skill_id: skill315, tool_id: 42, requirement_level: "required" },
  { skill_id: skill315, tool_id: 37, requirement_level: "optional" },
  { skill_id: skill316, tool_id: 761, requirement_level: "required" },
  { skill_id: skill316, tool_id: 762, requirement_level: "required" },
  { skill_id: skill316, tool_id: 37, requirement_level: "optional" },
];

const existingST = await call({
  method: "GET",
  path: `/skill_tools?skill_id=in.(${skill315},${skill316})&select=skill_id,tool_id`,
});
const stSeen = new Set(existingST.map((r) => `${r.skill_id}|${r.tool_id}`));
const stToInsert = desired
  .filter((d) => !stSeen.has(`${d.skill_id}|${d.tool_id}`))
  .map((d) => ({ ...d, notes: "" }));

console.log(`\nskill_tools to insert: ${stToInsert.length}`);
if (stToInsert.length > 0) {
  const inserted = await call({ method: "POST", path: "/skill_tools", body: stToInsert });
  for (const r of inserted) {
    console.log(`  skill_tool id=${r.id} skill=${r.skill_id} tool=${r.tool_id} (${r.requirement_level})`);
  }
}

// --- Step 3: DELETE legacy skill 118 (cascade removes its skill_tools) --------
console.log("\nDeleting legacy skill 118 (vms-system)...");
await call({ method: "DELETE", path: "/skill_tools?skill_id=eq.118" });
await call({ method: "DELETE", path: "/skills?id=eq.118" });

// --- Verify ------------------------------------------------------------------
const verify118 = await call({ method: "GET", path: "/skills?id=eq.118&select=id" });
console.log(`Skill 118 remaining: ${verify118.length} (expect 0)`);

const finalST = await call({
  method: "GET",
  path: `/skill_tools?skill_id=in.(${skill315},${skill316})&select=skill_id,tool_id,requirement_level,tools(tool_name,operation_kind,data_object_id)&order=skill_id.asc,tool_id.asc`,
});
console.log(`\nFinal skill_tools (skills ${skill315}/${skill316}): ${finalST.length}`);
for (const r of finalST) {
  const t = r.tools as Row;
  console.log(`  skill=${r.skill_id} ${t.tool_name} (${t.operation_kind}, do=${t.data_object_id}, ${r.requirement_level})`);
}
console.log(`\nVMS system skill ids: 315->${skill315}, 316->${skill316}`);
