// CLM a-file q1 (B1A-SELF-CONTAIN) approved 2026-06-11: option (a) DELETE both backwards
// contributor+required rows on CLM-REPOSITORY, AND ensure the correct direction is modeled on the
// "other side" (SMP / SAM) as embedded_master + optional (user instruction: "be sure they are embed
// master, optional on the other side").
//
//   DELETE  647  CLM-REPOSITORY (127) x saas_subscriptions (62)  contributor+required
//   DELETE  648  CLM-REPOSITORY (127) x software_licenses  (58)  contributor+required
//   PATCH   97   SMP-RENEWAL-VENDOR (31) x legal_contracts (66)  contributor -> embedded_master (necessity stays optional)
//   INSERT  ---  SAM-ENTITLEMENT-MGMT (202) x legal_contracts (66)  embedded_master + optional   (was absent)
//
// domain_module_data_objects has NO record_status column, so nothing to stamp.
// Rule #11: embedded_master requires a canonical master for legal_contracts -> CLM-REPOSITORY (127) row 644. Asserted below.
// Idempotent: re-run finds the deletes done, role already embedded_master, SAM row already present -> 0 effective changes.

async function call(method: string, path: string, body?: unknown): Promise<unknown> {
  const arg = JSON.stringify({ method, path, ...(body ? { body } : {}) });
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", arg], { stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`semantius exit ${code}: ${err || out}`);
  return out.trim() ? JSON.parse(out) : null;
}

// --- Rule #11 pre-flight: canonical master for legal_contracts (66) must exist ---
const masters = (await call(
  "GET",
  "/domain_module_data_objects?data_object_id=eq.66&role=eq.master&select=domain_module_id,domain_modules(domain_module_code)",
)) as { domain_module_id: number; domain_modules: { domain_module_code: string } }[];
if (!masters.length) throw new Error("ABORT: no canonical master for legal_contracts(66); embedded_master would be a broken pointer.");
console.log(`Rule #11 OK: legal_contracts mastered by ${masters.map((m) => m.domain_modules.domain_module_code).join(", ")}`);

// --- 1. DELETE the two backwards CLM-REPOSITORY contributor rows ---
for (const id of [647, 648]) {
  await call("DELETE", `/domain_module_data_objects?id=eq.${id}`);
  console.log(`DELETE dmdo ${id} (CLM-REPOSITORY backwards contributor): done`);
}

// --- 2. PATCH SMP row 97 contributor -> embedded_master (necessity stays optional) ---
await call("PATCH", "/domain_module_data_objects?id=eq.97&role=eq.contributor", { role: "embedded_master" });
console.log("PATCH dmdo 97 (SMP-RENEWAL-VENDOR x legal_contracts): role -> embedded_master");

// --- 3. INSERT SAM-ENTITLEMENT-MGMT (202) x legal_contracts (66) embedded_master+optional if absent ---
const existingSam = (await call(
  "GET",
  "/domain_module_data_objects?domain_module_id=eq.202&data_object_id=eq.66&select=id,role,necessity",
)) as { id: number }[];
if (existingSam.length) {
  console.log(`SAM-ENTITLEMENT-MGMT x legal_contracts already present (id ${existingSam[0].id}); leaving as-is`);
} else {
  await call("POST", "/domain_module_data_objects", {
    domain_module_id: 202,
    data_object_id: 66,
    role: "embedded_master",
    necessity: "optional",
  });
  console.log("INSERT SAM-ENTITLEMENT-MGMT (202) x legal_contracts (66): embedded_master + optional");
}

// --- 4. Verify post-state ---
console.log("\n=== POST-STATE ===");
const clmRepoBackwards = (await call(
  "GET",
  "/domain_module_data_objects?domain_module_id=eq.127&data_object_id=in.(58,62)&select=id,data_object_id,role",
)) as unknown[];
if (clmRepoBackwards.length) throw new Error(`FAIL: CLM-REPOSITORY still has rows on 58/62: ${JSON.stringify(clmRepoBackwards)}`);
console.log("CLM-REPOSITORY: 0 rows on saas_subscriptions(62)/software_licenses(58) -> self-containment restored.");

const otherSide = (await call(
  "GET",
  "/domain_module_data_objects?data_object_id=eq.66&domain_module_id=in.(31,202)&select=domain_module_id,role,necessity,domain_modules(domain_module_code)",
)) as { domain_module_id: number; role: string; necessity: string; domain_modules: { domain_module_code: string } }[];
for (const r of otherSide) {
  console.log(`  ${r.domain_modules.domain_module_code} x legal_contracts: role=${r.role} necessity=${r.necessity}`);
}
const ok =
  otherSide.length === 2 &&
  otherSide.every((r) => r.role === "embedded_master" && r.necessity === "optional");
if (!ok) throw new Error("FAIL: SMP/SAM legal_contracts rows are not both embedded_master+optional.");
console.log("\nOther side OK: SMP-RENEWAL-VENDOR + SAM-ENTITLEMENT-MGMT both embedded_master + optional on legal_contracts.");
