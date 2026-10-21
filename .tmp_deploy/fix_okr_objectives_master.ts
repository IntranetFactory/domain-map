// Fix multi-master integrity on okr_objectives (data_object_id=245).
//
// Background: 2026-05-26 module-split decision created WORK-MGMT-GOALS-OKR (mod 150)
// as canonical master of okr_objectives but failed to demote TALENT-PERFORMANCE-MGMT
// (mod 51) from master to embedded_master. Catalog ran with dual master in DMDO
// until the 2026-05-28 M7 rewrite caught it. SEM legacy DDO also drifted from
// DMDO (DMDO says embedded_master in mod 105, legacy DDO says master). SPM has a
// legacy DDO ghost with no DMDO row.
//
// Four writes:
//   1. PATCH DMDO 194 (mod 51, TALENT-PERFORMANCE-MGMT): master+required -> embedded_master+optional
//   2. DELETE legacy DDO 428 (SPM ghost, no DMDO row)
//   3. PATCH legacy DDO 429 (TALENT-MGMT): master+required -> embedded_master+optional (matches new DMDO)
//   4. PATCH legacy DDO 1156 (SEM): master+required -> embedded_master+required (matches existing DMDO mod 105)
//
// WORK-MGMT legacy DDO 427 stays as master+required (correct derivation from DMDO mod 150).

const OK_STATUSES = new Set([200, 204]);

async function call(method: string, path: string, body?: unknown): Promise<unknown> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`semantius ${method} ${path} exit ${code}\n${stderr}\n${stdout}`);
  }
  return stdout ? JSON.parse(stdout) : null;
}

async function patch(path: string, body: unknown, label: string): Promise<void> {
  console.log(`PATCH ${label}: ${path}`);
  const res = await call("PATCH", path, body);
  console.log(`  -> ${JSON.stringify(res)}`);
}

async function del(path: string, label: string): Promise<void> {
  console.log(`DELETE ${label}: ${path}`);
  const res = await call("DELETE", path);
  console.log(`  -> ${JSON.stringify(res)}`);
}

// 1. DMDO demotion on TALENT-PERFORMANCE-MGMT (mod 51) row.
await patch(
  "/domain_module_data_objects?id=eq.194",
  { role: "embedded_master", necessity: "optional" },
  "DMDO 194 TALENT-PERFORMANCE-MGMT okr_objectives -> embedded_master+optional",
);

// 2. SPM ghost (no DMDO row, legacy DDO orphan).
await del(
  "/domain_data_objects?id=eq.428",
  "DDO 428 SPM okr_objectives ghost",
);

// 3. TALENT-MGMT legacy DDO sync.
await patch(
  "/domain_data_objects?id=eq.429",
  { role: "embedded_master", necessity: "optional" },
  "DDO 429 TALENT-MGMT okr_objectives -> embedded_master+optional",
);

// 4. SEM legacy DDO sync (drift predates this audit; DMDO mod 105 is embedded_master+required).
await patch(
  "/domain_data_objects?id=eq.1156",
  { role: "embedded_master", necessity: "required" },
  "DDO 1156 SEM okr_objectives -> embedded_master+required",
);

// Verification pass.
console.log("\n=== Verification ===");
const dmdoAfter = await call(
  "GET",
  "/domain_module_data_objects?data_object_id=eq.245&select=id,domain_module_id,role,necessity,domain_module:domain_modules(domain_module_code,domain_id,domains(domain_code))&order=domain_module_id.asc",
);
console.log("DMDO rows on okr_objectives:");
console.log(JSON.stringify(dmdoAfter, null, 2));

const ddoAfter = await call(
  "GET",
  "/domain_data_objects?data_object_id=eq.245&select=id,domain_id,role,necessity,domains(domain_code)&order=domain_id.asc",
);
console.log("\nLegacy DDO rows on okr_objectives:");
console.log(JSON.stringify(ddoAfter, null, 2));

// Master-count assertion: catalog-wide exactly one master in DMDO.
const masters = (dmdoAfter as Array<{ role: string }>).filter((r) => r.role === "master");
if (masters.length !== 1) {
  throw new Error(`Expected exactly 1 DMDO master row, got ${masters.length}`);
}
console.log(`\n✓ Single-master integrity: ${masters.length} master row in DMDO (canonical owner via mod 150).`);
