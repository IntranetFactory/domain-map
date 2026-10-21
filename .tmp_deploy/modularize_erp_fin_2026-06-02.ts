#!/usr/bin/env bun
// Idempotent modularization loader for ERP-FIN (domain_id 65).
// Creates 4 full modules, links the 7 capabilities, assigns existing data_objects.
// Reuses existing entities ONLY. Safe to re-run.

type Json = any;

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

const DOMAIN_ID = 65;

type ModuleSpec = {
  domain_module_name: string;
  domain_module_code: string;
  description: string;
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_name: "General Ledger and Close",
    domain_module_code: "ERP-FIN-GL-CLOSE",
    description: "The accounting system of record: chart of accounts, journal posting, cost-center and legal-entity dimensions, fiscal-period management, period-end close orchestration, intercompany postings, and multi-entity consolidation. Holds the ledger masters every other finance module posts into.",
  },
  {
    domain_module_name: "Fixed Asset Accounting",
    domain_module_code: "ERP-FIN-FIXED-ASSETS",
    description: "Capitalization, depreciation, and disposal of fixed assets. Maintains the asset register and per-book depreciation schedules that feed the monthly depreciation journals.",
  },
  {
    domain_module_name: "Cash and Banking",
    domain_module_code: "ERP-FIN-CASH-BANKING",
    description: "Bank-account management, cash transaction recording, receipt and disbursement handling, and reconciliation of cash movements against the ledger. The cash-side of receivables collection and payables disbursement.",
  },
  {
    domain_module_name: "Revenue Recognition",
    domain_module_code: "ERP-FIN-REVENUE-RECOGNITION",
    description: "ASC 606 / IFRS 15 revenue recognition: performance-obligation allocation, deferred-revenue schedules, and recognition timelines bridging contracts and the ledger.",
  },
];

// capability_id -> module_code (M4: every capability placed in >=1 module)
const CAP_LINKS: { code: string; capability_id: number }[] = [
  { code: "ERP-FIN-GL-CLOSE", capability_id: 59 },   // GL
  { code: "ERP-FIN-GL-CLOSE", capability_id: 63 },   // CLOSE-CONSOL
  { code: "ERP-FIN-GL-CLOSE", capability_id: 64 },   // MULTI-ENTITY
  { code: "ERP-FIN-FIXED-ASSETS", capability_id: 62 }, // FIXED-ASSETS
  { code: "ERP-FIN-CASH-BANKING", capability_id: 60 }, // AR
  { code: "ERP-FIN-CASH-BANKING", capability_id: 61 }, // AP
  { code: "ERP-FIN-REVENUE-RECOGNITION", capability_id: 65 }, // REVENUE-RECOG
];

// data_object assignments. role per catalog-wide pre-check + preserve legacy roles for borrowed entities.
const DO_LINKS: { code: string; data_object_id: number; role: string; necessity: string }[] = [
  // GL-CLOSE masters (none mastered elsewhere catalog-wide -> genuine masters)
  { code: "ERP-FIN-GL-CLOSE", data_object_id: 194, role: "master", necessity: "required" }, // journal_entries
  { code: "ERP-FIN-GL-CLOSE", data_object_id: 195, role: "master", necessity: "required" }, // general_ledger_accounts
  { code: "ERP-FIN-GL-CLOSE", data_object_id: 196, role: "master", necessity: "required" }, // cost_centers
  { code: "ERP-FIN-GL-CLOSE", data_object_id: 197, role: "master", necessity: "required" }, // legal_entities
  { code: "ERP-FIN-GL-CLOSE", data_object_id: 198, role: "master", necessity: "required" }, // accounting_periods
  { code: "ERP-FIN-GL-CLOSE", data_object_id: 203, role: "master", necessity: "required" }, // intercompany_transactions
  // GL-CLOSE consumers (borrowed, mastered by other domains -> preserve consumer role)
  { code: "ERP-FIN-GL-CLOSE", data_object_id: 145, role: "consumer", necessity: "required" }, // payroll_journal_entries (PAYROLL-RUN master)
  { code: "ERP-FIN-GL-CLOSE", data_object_id: 147, role: "consumer", necessity: "required" }, // benefit_enrollments (BEN-ENROLLMENT master)
  { code: "ERP-FIN-GL-CLOSE", data_object_id: 210, role: "consumer", necessity: "required" }, // expense_reports (EXPENSE-CAPTURE master)

  // FIXED-ASSETS masters
  { code: "ERP-FIN-FIXED-ASSETS", data_object_id: 201, role: "master", necessity: "required" }, // fixed_assets
  { code: "ERP-FIN-FIXED-ASSETS", data_object_id: 202, role: "master", necessity: "required" }, // asset_depreciation_schedules

  // CASH-BANKING masters
  { code: "ERP-FIN-CASH-BANKING", data_object_id: 199, role: "master", necessity: "required" }, // bank_accounts
  { code: "ERP-FIN-CASH-BANKING", data_object_id: 200, role: "master", necessity: "required" }, // cash_transactions

  // REVENUE-RECOGNITION: 109 mastered by SUB-MGMT-SUBSCRIPTIONS catalog-wide -> embedded_master here.
  { code: "ERP-FIN-REVENUE-RECOGNITION", data_object_id: 109, role: "embedded_master", necessity: "required" }, // revenue_recognition_records
  { code: "ERP-FIN-REVENUE-RECOGNITION", data_object_id: 216, role: "consumer", necessity: "required" }, // service_projects (PSA-PROJECT-DELIVERY master)
];

async function upsertModules(): Promise<Map<string, number>> {
  const codes = MODULES.map(m => m.domain_module_code);
  const existing = await semantius("GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`);
  const existingCodes = new Set(existing.map((r: any) => r.domain_module_code));
  const toInsert = MODULES
    .filter(m => !existingCodes.has(m.domain_module_code))
    .map(m => ({
      domain_module_name: m.domain_module_name,
      domain_module_code: m.domain_module_code,
      description: m.description,
      domain_id: DOMAIN_ID,
      module_kind: "full",
    }));
  if (toInsert.length) {
    await semantius("POST", "/domain_modules", toInsert);
    console.log(`  +${toInsert.length} modules: ${toInsert.map(m => m.domain_module_code).join(", ")}`);
  } else {
    console.log("  modules already present");
  }
  // re-read for code->id map
  const all = await semantius("GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`);
  const map = new Map<string, number>();
  for (const r of all) map.set(r.domain_module_code, r.id);
  return map;
}

async function upsertCaps(modMap: Map<string, number>): Promise<void> {
  for (const link of CAP_LINKS) {
    const moduleId = modMap.get(link.code)!;
    const existing = await semantius("GET",
      `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=eq.${link.capability_id}&select=id`);
    if (!existing?.length) {
      await semantius("POST", "/domain_module_capabilities", [
        { domain_module_id: moduleId, capability_id: link.capability_id },
      ]);
      console.log(`  +DMC ${link.code} <- cap ${link.capability_id}`);
    }
  }
}

async function upsertDMDO(modMap: Map<string, number>): Promise<void> {
  for (const link of DO_LINKS) {
    const moduleId = modMap.get(link.code)!;
    const existing = await semantius("GET",
      `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=eq.${link.data_object_id}&select=id`);
    if (!existing?.length) {
      await semantius("POST", "/domain_module_data_objects", [
        {
          domain_module_id: moduleId,
          data_object_id: link.data_object_id,
          role: link.role,
          necessity: link.necessity,
        },
      ]);
      console.log(`  +DMDO ${link.code} <- do ${link.data_object_id} (${link.role}/${link.necessity})`);
    }
  }
}

async function main() {
  console.log("=== ERP-FIN modularization ===");
  const modMap = await upsertModules();
  await upsertCaps(modMap);
  await upsertDMDO(modMap);
  console.log("\nDone.");
}

main().catch(e => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
