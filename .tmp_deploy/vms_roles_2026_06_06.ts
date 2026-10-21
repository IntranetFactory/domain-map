// B1A-E1-E2-ROLES: author >=3 VMS personas under business_function_id=68 (Indirect Procurement),
// bind each to modules 315/316 (>=2 role_modules each, 2-module floor), and add a HIRING-MANAGER
// secondary reach on 315.
// Run: bun run c:/dev/domain-map/.tmp_deploy/vms_roles_2026_06_06.ts
// Rule #1: record_status omitted. Rule #15: notes empty. Rule #4/#9: dedup by role_code natural key.
// Personas are function-scoped; permission bundle is DERIVED (not authored). role_modules only.

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

const BF_INDIRECT_PROCUREMENT = 68;

const personaSpecs = [
  {
    role_code: "INDIRECT-PROCUREMENT-PROGRAM-MANAGER",
    role_name: "Contingent Workforce Program Manager",
    business_function_id: BF_INDIRECT_PROCUREMENT,
    description:
      "Owns the end-to-end contingent-workforce program: requisition intake, supplier distribution, rate-card governance, and the time-to-invoice flow. Spans worker sourcing and time-and-invoicing.",
    reach: [
      { module_id: 315, interaction_level: "primary" },
      { module_id: 316, interaction_level: "primary" },
    ],
  },
  {
    role_code: "INDIRECT-PROCUREMENT-SUPPLIER-MANAGER",
    role_name: "Staffing Supplier Manager",
    business_function_id: BF_INDIRECT_PROCUREMENT,
    description:
      "Governs the staffing-supplier panel and the rate cards: onboards and activates suppliers, approves rate cards by role and region, and monitors supplier performance against billed invoices.",
    reach: [
      { module_id: 315, interaction_level: "primary" },
      { module_id: 316, interaction_level: "secondary" },
    ],
  },
  {
    role_code: "INDIRECT-PROCUREMENT-CONTINGENT-LABOR-COORDINATOR",
    role_name: "Contingent Labor Coordinator",
    business_function_id: BF_INDIRECT_PROCUREMENT,
    description:
      "Coordinates day-to-day contingent-labor operations: shepherds worker assignments and tenure tracking in sourcing, and chases timesheet approvals and invoice matching in time-and-invoicing.",
    reach: [
      { module_id: 315, interaction_level: "primary" },
      { module_id: 316, interaction_level: "primary" },
    ],
  },
];

// --- Step 1: upsert personas by role_code ------------------------------------
const codes = personaSpecs.map((p) => `"${p.role_code}"`).join(",");
const existingRoles = await call({
  method: "GET",
  path: `/domain_roles?role_code=in.(${codes})&select=id,role_code`,
});
const roleByCode = new Map<string, number>();
for (const r of existingRoles) roleByCode.set(String(r.role_code), Number(r.id));

const rolesToInsert = personaSpecs
  .filter((p) => !roleByCode.has(p.role_code))
  .map((p) => ({
    role_code: p.role_code,
    role_name: p.role_name,
    description: p.description,
    business_function_id: p.business_function_id,
  }));

console.log(`Personas to insert: ${rolesToInsert.length}`);
if (rolesToInsert.length > 0) {
  const inserted = await call({ method: "POST", path: "/domain_roles", body: rolesToInsert });
  for (const r of inserted) {
    roleByCode.set(String(r.role_code), Number(r.id));
    console.log(`  domain_role id=${r.id} ${r.role_code}`);
  }
}

// Resolve HIRING-MANAGER by natural key (live id, the state.yaml's 10007 was stale).
const [hm] = await call({
  method: "GET",
  path: "/domain_roles?role_code=eq.HIRING-MANAGER&select=id,role_code",
});
if (!hm) throw new Error("HIRING-MANAGER persona not found by role_code");
const hmId = Number(hm.id);
console.log(`HIRING-MANAGER resolved to id=${hmId}`);

// --- Step 2: role_modules reach (dedup by (role_id, domain_module_id)) --------
const allRoleIds = [...roleByCode.values(), hmId];
const existingRM = await call({
  method: "GET",
  path: `/role_modules?role_id=in.(${allRoleIds.join(",")})&select=role_id,domain_module_id`,
});
const rmSeen = new Set(existingRM.map((r) => `${r.role_id}|${r.domain_module_id}`));

const rmDesired: { role_id: number; domain_module_id: number; interaction_level: string }[] = [];
for (const p of personaSpecs) {
  const rid = roleByCode.get(p.role_code)!;
  for (const r of p.reach) {
    rmDesired.push({ role_id: rid, domain_module_id: r.module_id, interaction_level: r.interaction_level });
  }
}
// HIRING-MANAGER secondary on 315 (Rule: hiring managers approve contingent worker requests).
rmDesired.push({ role_id: hmId, domain_module_id: 315, interaction_level: "secondary" });

const rmToInsert = rmDesired
  .filter((d) => !rmSeen.has(`${d.role_id}|${d.domain_module_id}`))
  .map((d) => ({ ...d, notes: "" }));

console.log(`\nrole_modules to insert: ${rmToInsert.length}`);
if (rmToInsert.length > 0) {
  const inserted = await call({ method: "POST", path: "/role_modules", body: rmToInsert });
  for (const r of inserted) {
    console.log(`  role_module id=${r.id} role=${r.role_id} module=${r.domain_module_id} (${r.interaction_level})`);
  }
}

// --- Verify 2-module floor on the 3 new personas -----------------------------
console.log("\n2-module floor verification:");
for (const p of personaSpecs) {
  const rid = roleByCode.get(p.role_code)!;
  const rms = await call({ method: "GET", path: `/role_modules?role_id=eq.${rid}&select=domain_module_id` });
  console.log(`  ${p.role_code} (id ${rid}): ${rms.length} role_modules ${rms.length >= 2 ? "OK" : "FAIL <2"}`);
}
const hmRms = await call({ method: "GET", path: `/role_modules?role_id=eq.${hmId}&select=domain_module_id,interaction_level&order=domain_module_id.asc` });
console.log(`  HIRING-MANAGER (id ${hmId}): ${hmRms.length} role_modules -> ${JSON.stringify(hmRms)}`);
