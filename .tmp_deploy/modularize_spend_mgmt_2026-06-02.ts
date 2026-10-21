#!/usr/bin/env bun
// Idempotent modularization loader for SPEND-MGMT (domain_id 133).
// Scope: domain_modules + domain_module_capabilities + domain_module_data_objects ONLY.
// Reuses existing capabilities and data_objects. Creates no new data_objects,
// capabilities, lifecycle states, skills, tools, handoffs, or relationships.
// Safe to re-run.

type Json = any;

const DOMAIN_ID = 133;

async function semantius(method: string, path: string, body?: Json): Promise<Json> {
  const arg: Json = { method, path };
  if (body !== undefined) arg.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(arg)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius ${method} ${path} failed: ${err || out}`);
  return out.trim() ? JSON.parse(out) : null;
}

// ---- Module definitions ----------------------------------------------------

type ModuleSpec = {
  domain_module_name: string;
  domain_module_code: string;
  description: string;
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_name: "Corporate Cards and Authorization Controls",
    domain_module_code: "SPEND-MGMT-CARDS",
    description:
      "Issuance and lifecycle of physical and virtual corporate cards plus real-time network-side authorization decisioning. Evaluates each authorization request against per-card limits, merchant category, vendor, amount, time, and geography, declining out-of-policy transactions before settlement. Covers multi-currency card spend with bank-grade FX.",
  },
  {
    domain_module_name: "Vendor Bill Pay",
    domain_module_code: "SPEND-MGMT-BILL-PAY",
    description:
      "Direct payment of vendor bills via ACH, wire, card, or check without a sourcing or purchase-order match. Routes each vendor payment authorization through an approval chain, enriches bank details, batches disbursements into payment runs, and reconciles to the ledger.",
  },
  {
    domain_module_name: "Pre-Spend Approval and Policy",
    domain_module_code: "SPEND-MGMT-POLICY-APPROVAL",
    description:
      "Proactive employee requests for spend authorization before any transaction, evaluated against a versioned policy library and an approval workflow. The approval becomes the enforceable commitment used at card-authorization and bill-pay time. Covers out-of-pocket reimbursement requests, receipt capture, and aggregated spend analytics with anomaly detection.",
  },
];

// ---- Capability placement (M4: every capability in >= 1 module) ------------

const CAPABILITY_PLACEMENT: Record<string, number[]> = {
  // capability_id arrays per module code
  "SPEND-MGMT-CARDS": [313, 314, 74, 318],
  // 313 SPEND-CARD-ISSUANCE, 314 SPEND-CARD-AUTH, 74 CORP-CARD, 318 SPEND-FX-TREASURY
  "SPEND-MGMT-BILL-PAY": [316],
  // 316 SPEND-BILL-PAY
  "SPEND-MGMT-POLICY-APPROVAL": [317, 73, 311, 319, 315, 72],
  // 317 SPEND-PRE-APPROVAL, 73 EXPENSE-POLICY, 311 APPROVAL-WORKFLOW,
  // 319 SPEND-ANALYTICS, 315 SPEND-REIMBURSEMENT, 72 EXPENSE-CAPTURE
};

// ---- Data-object placement (preserve existing role + necessity) ------------
// Masters confirmed clear in catalog-wide pre-check (no existing master row):
//   240 spend_requests, 744 corporate_card_accounts, 745 card_authorizations,
//   746 vendor_payment_authorizations, 747 spend_policies.
// Borrowed objects keep their domain-rollup role/necessity:
//   75 supplier_invoices (contributor/required), 205 payment_runs (contributor/required),
//   206 suppliers (consumer/required), 214 expense_policies (contributor/required),
//   210 expense_reports (contributor/required).

type DMDOSpec = { data_object_id: number; role: string; necessity: string };

const DMDO_PLACEMENT: Record<string, DMDOSpec[]> = {
  "SPEND-MGMT-CARDS": [
    { data_object_id: 744, role: "master", necessity: "required" },
    { data_object_id: 745, role: "master", necessity: "required" },
  ],
  "SPEND-MGMT-BILL-PAY": [
    { data_object_id: 746, role: "master", necessity: "required" },
    { data_object_id: 75, role: "contributor", necessity: "required" },
    { data_object_id: 205, role: "contributor", necessity: "required" },
    { data_object_id: 206, role: "consumer", necessity: "required" },
  ],
  "SPEND-MGMT-POLICY-APPROVAL": [
    { data_object_id: 240, role: "master", necessity: "required" },
    { data_object_id: 747, role: "master", necessity: "required" },
    { data_object_id: 214, role: "contributor", necessity: "required" },
    { data_object_id: 210, role: "contributor", necessity: "required" },
  ],
};

// ---- Phase 0: catalog-wide master pre-check (MANDATORY) ---------------------

async function precheckMasters(ownModuleIds: Set<number>): Promise<void> {
  const intendedMasters = new Set<number>();
  for (const rows of Object.values(DMDO_PLACEMENT)) {
    for (const r of rows) if (r.role === "master") intendedMasters.add(r.data_object_id);
  }
  const ids = [...intendedMasters];
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?data_object_id=in.(${ids.join(",")})&role=eq.master&select=data_object_id,domain_module_id`,
  );
  // Only master rows in modules OTHER than this domain's own modules are conflicts.
  // On a clean first run ownModuleIds is empty; on re-run it holds the 3 SPEND-MGMT module ids.
  const offenders = (existing ?? []).filter((r: any) => !ownModuleIds.has(r.domain_module_id));
  if (offenders.length) {
    const detail = offenders.map((r: any) => `${r.data_object_id}@module${r.domain_module_id}`).join(", ");
    throw new Error(
      `Pre-check FAILED: intended masters already mastered elsewhere: ${detail}. ` +
        `Demote to embedded_master before re-running.`,
    );
  }
  console.log(`Pre-check OK: ${ids.length} intended masters have no conflicting catalog-wide master row.`);
}

async function ownModuleIds(): Promise<Set<number>> {
  const codes = MODULES.map((m) => m.domain_module_code);
  const rows = await semantius(
    "GET",
    `/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id`,
  );
  return new Set((rows ?? []).map((r: any) => r.id));
}

// ---- Phase 1: domain_modules ----------------------------------------------

async function upsertModules(): Promise<Map<string, number>> {
  const codes = MODULES.map((m) => m.domain_module_code);
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`,
  );
  const existingCodes = new Set(existing.map((r: any) => r.domain_module_code));
  const toInsert = MODULES.filter((m) => !existingCodes.has(m.domain_module_code)).map((m) => ({
    domain_module_name: m.domain_module_name,
    domain_module_code: m.domain_module_code,
    description: m.description,
    domain_id: DOMAIN_ID,
    module_kind: "full",
  }));
  if (toInsert.length) {
    await semantius("POST", "/domain_modules", toInsert);
    console.log(`  +${toInsert.length} domain_modules: ${toInsert.map((m) => m.domain_module_code).join(", ")}`);
  } else {
    console.log("  domain_modules already present; none inserted.");
  }
  // Re-read for code -> id map.
  const all = await semantius(
    "GET",
    `/domain_modules?domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`,
  );
  const map = new Map<string, number>();
  for (const r of all) map.set(r.domain_module_code, r.id);
  return map;
}

// ---- Phase 2: domain_module_capabilities -----------------------------------

async function upsertCapabilities(moduleMap: Map<string, number>): Promise<void> {
  for (const [code, capIds] of Object.entries(CAPABILITY_PLACEMENT)) {
    const moduleId = moduleMap.get(code)!;
    const existing = await semantius(
      "GET",
      `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capIds.join(",")})&select=capability_id`,
    );
    const existingIds = new Set(existing.map((r: any) => r.capability_id));
    const toInsert = capIds
      .filter((id) => !existingIds.has(id))
      .map((capability_id) => ({ domain_module_id: moduleId, capability_id }));
    if (toInsert.length) {
      await semantius("POST", "/domain_module_capabilities", toInsert);
      console.log(`  +${toInsert.length} capability links on ${code}`);
    }
  }
}

// ---- Phase 3: domain_module_data_objects -----------------------------------

async function upsertDMDO(moduleMap: Map<string, number>): Promise<void> {
  for (const [code, rows] of Object.entries(DMDO_PLACEMENT)) {
    const moduleId = moduleMap.get(code)!;
    const ids = rows.map((r) => r.data_object_id);
    const existing = await semantius(
      "GET",
      `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${ids.join(",")})&select=data_object_id`,
    );
    const existingIds = new Set(existing.map((r: any) => r.data_object_id));
    const toInsert = rows
      .filter((r) => !existingIds.has(r.data_object_id))
      .map((r) => ({
        domain_module_id: moduleId,
        data_object_id: r.data_object_id,
        role: r.role,
        necessity: r.necessity,
      }));
    if (toInsert.length) {
      await semantius("POST", "/domain_module_data_objects", toInsert);
      console.log(`  +${toInsert.length} DMDO rows on ${code}`);
    }
  }
}

// ---- Verification ----------------------------------------------------------

async function verify(moduleMap: Map<string, number>): Promise<void> {
  console.log("\n=== VERIFY ===");
  const moduleIds = [...moduleMap.values()];

  // Every capability placed?
  const capsLinked = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=in.(${moduleIds.join(",")})&select=capability_id`,
  );
  const placed = new Set(capsLinked.map((r: any) => r.capability_id));
  const allCaps = await semantius(
    "GET",
    `/capability_domains?domain_id=eq.${DOMAIN_ID}&select=capability_id`,
  );
  const expected = allCaps.map((r: any) => r.capability_id);
  const unplaced = expected.filter((id: number) => !placed.has(id));
  console.log(`Capabilities: ${expected.length} in domain, ${placed.size} placed. Unplaced: ${unplaced.length ? unplaced.join(",") : "none"}`);

  // Each module non-empty?
  for (const [code, id] of moduleMap) {
    const caps = await semantius("GET", `/domain_module_capabilities?domain_module_id=eq.${id}&select=capability_id`);
    const dobjs = await semantius("GET", `/domain_module_data_objects?domain_module_id=eq.${id}&select=data_object_id,role`);
    const masters = dobjs.filter((r: any) => r.role === "master").length;
    console.log(`  ${code} (id ${id}): ${caps.length} caps, ${dobjs.length} data_objects, ${masters} masters`);
  }

  // Catalog-wide single-master check on the 5 masters.
  const masterIds = [240, 744, 745, 746, 747];
  const masterRows = await semantius(
    "GET",
    `/domain_module_data_objects?data_object_id=in.(${masterIds.join(",")})&role=eq.master&select=data_object_id,domain_module_id`,
  );
  const counts = new Map<number, number>();
  for (const r of masterRows) counts.set(r.data_object_id, (counts.get(r.data_object_id) ?? 0) + 1);
  for (const mid of masterIds) {
    const c = counts.get(mid) ?? 0;
    const flag = c === 1 ? "OK" : "VIOLATION";
    console.log(`  master ${mid}: ${c} master row(s) catalog-wide [${flag}]`);
  }
}

// ---- Main ------------------------------------------------------------------

async function main() {
  console.log("=== SPEND-MGMT modularization (3 full modules) ===");
  await precheckMasters(await ownModuleIds());
  const moduleMap = await upsertModules();
  await upsertCapabilities(moduleMap);
  await upsertDMDO(moduleMap);
  await verify(moduleMap);
  console.log("\nDone.");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
