#!/usr/bin/env bun
// Phase A/M for CPQ (73), SUB-MGMT (97), HAM (51) so the HVAC starter can embed
// sales_quotes / customer_invoices / spare_parts_inventory under Rule #19 invariant #2.
// Minimal scope: modules + module_capabilities + module_data_objects (master rows for
// the data_objects each module owns). Phase B/E/S for these domains is follow-up work
// and will surface as F2/F3 audit gaps until done.
// Idempotent. Re-runnable.

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(body)], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`semantius failed (${code}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (p: string) => call({ method: "GET", path: p });
const post = (p: string, b: Row | Row[]) => call({ method: "POST", path: p, body: b });
async function insert(p: string, rows: Row[]): Promise<Row[]> {
  if (!rows.length) return [];
  const CHUNK = 50; const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(...await post(p, rows.slice(i, i + CHUNK)));
  return out;
}

const CPQ_DOMAIN_ID = 73;
const SUB_MGMT_DOMAIN_ID = 97;
const HAM_DOMAIN_ID = 51;

type ModSpec = {
  domain_id: number;
  domain_module_code: string;
  domain_module_name: string;
  description: string;
  capabilityCodes: string[];
  masterDataObjectNames: string[];
};

const modSpecs: ModSpec[] = [
  // ===== CPQ =====
  {
    domain_id: CPQ_DOMAIN_ID,
    domain_module_code: "CPQ-PRODUCT-CATALOG",
    domain_module_name: "Product Catalog and Pricing Rules",
    description: "Configurable product definitions, product bundles, and pricing rules. The reference data CPQ quote-building reads from. Includes AI price-optimisation and subscription-pricing variants.",
    capabilityCodes: ["CPQ-PRODUCT-CFG", "CPQ-SUBSCRIPTION-MODELS", "CPQ-PRICE-OPTIM"],
    masterDataObjectNames: ["product_configurations", "pricing_rules", "product_bundles"],
  },
  {
    domain_id: CPQ_DOMAIN_ID,
    domain_module_code: "CPQ-QUOTE-BUILDER",
    domain_module_name: "Quote Construction and Discounting",
    description: "Sales-quote authoring workflow: quote header, line items, discount application, guided-selling navigation, and quote-document generation. The seller-facing CPQ surface.",
    capabilityCodes: ["CPQ-PRICING-DISCOUNT", "CPQ-GUIDED-SELL", "CPQ-QUOTE-DOC"],
    masterDataObjectNames: ["sales_quotes", "quote_lines", "quote_discounts"],
  },
  {
    domain_id: CPQ_DOMAIN_ID,
    domain_module_code: "CPQ-APPROVALS-CONTRACTS",
    domain_module_name: "Approvals and Contract Drafts",
    description: "Discount-approval workflows and contract-draft handoff to CLM. Captures the multi-tier sign-off path that gates high-discount or non-standard quotes from advancing to execution.",
    capabilityCodes: ["CPQ-APPROVAL", "CPQ-CONTRACT-AMEND", "APPROVAL-WORKFLOW"],
    masterDataObjectNames: ["discount_approvals", "contract_drafts"],
  },
  // ===== SUB-MGMT =====
  {
    domain_id: SUB_MGMT_DOMAIN_ID,
    domain_module_code: "SUB-MGMT-SUBSCRIPTIONS",
    domain_module_name: "Subscription Lifecycle and Usage",
    description: "Subscription record lifecycle (active, paused, cancelled, churned), usage metering and rating, revenue recognition under ASC 606 / IFRS 15, entitlement management, and SaaS churn analytics. The recurring-revenue substrate.",
    capabilityCodes: ["SUB-LIFECYCLE", "SUB-USAGE-METER", "SUB-REV-REC", "SUB-CHURN-ANALYTICS", "SUB-ENT-MGT"],
    masterDataObjectNames: ["customer_subscriptions", "usage_records", "revenue_recognition_records"],
  },
  {
    domain_id: SUB_MGMT_DOMAIN_ID,
    domain_module_code: "SUB-MGMT-BILLING",
    domain_module_name: "Recurring Billing and Dunning",
    description: "Invoice generation, payment processing, tax calculation, and dunning workflows for failed-payment recovery. Sits downstream of the subscription lifecycle.",
    capabilityCodes: ["SUB-BILLING-INVOICE", "SUB-PAYMENT-DUNNING", "SUB-TAX-CALC"],
    masterDataObjectNames: ["customer_invoices", "dunning_events"],
  },
  // ===== HAM =====
  {
    domain_id: HAM_DOMAIN_ID,
    domain_module_code: "HAM-ASSET-REGISTRY",
    domain_module_name: "Hardware Asset Registry",
    description: "Authoritative register of hardware assets and their reference models. Tracks discovery feeds, lifecycle states, financial attributes (purchase, depreciation), and ownership.",
    capabilityCodes: ["HAM-DISCOVERY", "HAM-LIFECYCLE", "HAM-FINANCIAL"],
    masterDataObjectNames: ["hardware_assets", "hardware_models"],
  },
  {
    domain_id: HAM_DOMAIN_ID,
    domain_module_code: "HAM-WARRANTY-PARTS",
    domain_module_name: "Warranty, Disposal, and Spare Parts",
    description: "Warranty registrations, end-of-life disposal records, and spare-parts inventory at warehouses and on technician trucks. Sits adjacent to the asset registry; feeds field-service operations.",
    capabilityCodes: ["HAM-WARRANTY", "HAM-DISPOSAL"],
    masterDataObjectNames: ["hardware_warranties", "hardware_disposal_records", "spare_parts_inventory"],
  },
];

// ============================================================
// 0. Resolve capability ids + data_object ids
// ============================================================
console.log("[0/4] resolving capabilities + data_objects");
const allCapCodes = [...new Set(modSpecs.flatMap(m => m.capabilityCodes))];
const allDoNames = [...new Set(modSpecs.flatMap(m => m.masterDataObjectNames))];

const capRows = await get(`/capabilities?capability_code=in.(${allCapCodes.join(",")})&select=id,capability_code`);
const capId = new Map<string, number>();
for (const r of capRows) capId.set(String(r.capability_code), Number(r.id));
const missingCaps = allCapCodes.filter(c => !capId.has(c));
if (missingCaps.length) throw new Error(`Missing capabilities: ${missingCaps.join(", ")}`);

const doRows = await get(`/data_objects?data_object_name=in.(${allDoNames.join(",")})&select=id,data_object_name`);
const doId = new Map<string, number>();
for (const r of doRows) doId.set(String(r.data_object_name), Number(r.id));
const missingDo = allDoNames.filter(n => !doId.has(n));
if (missingDo.length) throw new Error(`Missing data_objects: ${missingDo.join(", ")}`);
console.log(`  ${capId.size} capabilities + ${doId.size} data_objects resolved`);

// ============================================================
// 1. modules
// ============================================================
console.log("\n[1/4] modules");
const moduleRows = modSpecs.map(m => ({
  domain_id: m.domain_id,
  domain_module_code: m.domain_module_code,
  domain_module_name: m.domain_module_name,
  description: m.description,
  module_kind: "full",
}));
const existingModules = await get(`/domain_modules?domain_module_code=in.(${moduleRows.map(m => m.domain_module_code).join(",")})&select=id,domain_module_code`);
const existingModuleCodes = new Set(existingModules.map(m => String(m.domain_module_code)));
const missingModules = moduleRows.filter(m => !existingModuleCodes.has(m.domain_module_code));
if (missingModules.length) await insert("/domain_modules", missingModules);
console.log(`  ${missingModules.length} modules inserted (${existingModules.length} pre-existing)`);

const allModules = await get(`/domain_modules?domain_module_code=in.(${moduleRows.map(m => m.domain_module_code).join(",")})&select=id,domain_module_code`);
const moduleId = new Map<string, number>();
for (const m of allModules) moduleId.set(String(m.domain_module_code), Number(m.id));

// ============================================================
// 2. domain_module_capabilities
// ============================================================
console.log("\n[2/4] domain_module_capabilities");
const dmcRows: Row[] = [];
for (const m of modSpecs) {
  const mid = moduleId.get(m.domain_module_code)!;
  for (const c of m.capabilityCodes) {
    dmcRows.push({ domain_module_id: mid, capability_id: capId.get(c)! });
  }
}
const moduleIdList = [...moduleId.values()].join(",");
const existingDmc = await get(`/domain_module_capabilities?domain_module_id=in.(${moduleIdList})&select=domain_module_id,capability_id`);
const dmcKey = (r: Row) => `${r.domain_module_id}|${r.capability_id}`;
const existingDmcKeys = new Set(existingDmc.map(dmcKey));
const missingDmc = dmcRows.filter(r => !existingDmcKeys.has(dmcKey(r)));
if (missingDmc.length) await insert("/domain_module_capabilities", missingDmc);
console.log(`  ${missingDmc.length} DMC inserted (${existingDmc.length} pre-existing)`);

// ============================================================
// 3. domain_module_data_objects (master rows)
// ============================================================
console.log("\n[3/4] domain_module_data_objects");
const dmdoRows: Row[] = [];
for (const m of modSpecs) {
  const mid = moduleId.get(m.domain_module_code)!;
  for (const n of m.masterDataObjectNames) {
    dmdoRows.push({ domain_module_id: mid, data_object_id: doId.get(n)!, role: "master", necessity: "required" });
  }
}
const existingDmdo = await get(`/domain_module_data_objects?domain_module_id=in.(${moduleIdList})&select=domain_module_id,data_object_id`);
const dmdoKey = (r: Row) => `${r.domain_module_id}|${r.data_object_id}`;
const existingDmdoKeys = new Set(existingDmdo.map(dmdoKey));
const missingDmdo = dmdoRows.filter(r => !existingDmdoKeys.has(dmdoKey(r)));
if (missingDmdo.length) await insert("/domain_module_data_objects", missingDmdo);
console.log(`  ${missingDmdo.length} DMDO master rows inserted (${existingDmdo.length} pre-existing)`);

// ============================================================
// 4. Verification + invariant check (for HVAC starter)
// ============================================================
console.log("\n[4/4] verification");
const hvacEmbedded = ["sales_quotes", "customer_invoices", "spare_parts_inventory"];
for (const n of hvacEmbedded) {
  const did = doId.get(n)!;
  const masters = await get(`/domain_module_data_objects?data_object_id=eq.${did}&role=eq.master&select=domain_module:domain_modules!inner(id,domain_module_code,module_kind)&domain_module.module_kind=eq.full`);
  console.log(`  ${n}: ${masters.length} full-module master(s) — ${masters.map((r: any) => r.domain_module?.domain_module_code).join(", ")}`);
}

console.log("\nDone. CPQ/SUB-MGMT/HAM Phase A/M loaded.");
console.log("KNOWN FOLLOW-UP: these modules need Phase B (data_object relationships, lifecycle states, aliases, trigger_events, handoffs) and Phase S (system skill + skill_tools per module) to fully satisfy the per-domain checklist. F2/F3 audit gaps until then.");
console.log("UI: https://tests.semantius.app/domain_map/domain_modules");
