#!/usr/bin/env bun
// Idempotent Phase-M modularization loader for the EXPENSE domain (domains.id = 67).
// Scope: domain_modules + domain_module_capabilities + domain_module_data_objects ONLY.
// Creates 3 full modules, links each existing capability to a realizing module,
// and assigns each existing data_object to its owning module preserving role + necessity.
// Does NOT create data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships.
// Safe to re-run (reads existing rows by natural key before each insert).
// R1: record_status OMITTED on every insert (DB default 'new').
// R15: notes columns left empty on every DMC / DMDO row (omitted -> DB default '').
// R18: module names/descriptions describe capability shape, no vendor/product names.

type Json = any;

const DOMAIN_ID = 67;

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

// ---------------------------------------------------------------------------
// Design: 3 full modules.
// ---------------------------------------------------------------------------
type ModuleSpec = {
  domain_module_code: string;
  domain_module_name: string;
  description: string;
  capability_ids: number[];
  // data_object assignments preserve existing role + necessity from domain_data_objects.
  data_objects: { data_object_id: number; role: string; necessity: string }[];
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_code: "EXPENSE-CAPTURE-AND-REPORTING",
    domain_module_name: "Expense Capture and Reporting",
    description:
      "Receipt capture and expense entry, rules-based policy enforcement, time-card collection feeding expense entry, and the approval-to-reimbursement workflow over expense reports and their lines.",
    capability_ids: [72, 73, 76, 30], // EXPENSE-CAPTURE, EXPENSE-POLICY, REIMBURSEMENT, TIME-TRACKING
    data_objects: [
      { data_object_id: 210, role: "master", necessity: "required" },          // expense_reports
      { data_object_id: 211, role: "master", necessity: "required" },          // expense_lines
      { data_object_id: 214, role: "master", necessity: "required" },          // expense_policies
      { data_object_id: 34, role: "embedded_master", necessity: "required" },  // org_units
      { data_object_id: 62, role: "consumer", necessity: "required" },         // saas_subscriptions
      { data_object_id: 75, role: "consumer", necessity: "required" },         // supplier_invoices
    ],
  },
  {
    domain_module_code: "EXPENSE-CORP-CARD-RECON",
    domain_module_name: "Corporate Card Reconciliation",
    description:
      "Corporate card feeds, auto-matching of card transactions to expense lines, and reconciliation over the issued-card register and its transaction stream.",
    capability_ids: [74], // CORP-CARD
    data_objects: [
      { data_object_id: 212, role: "master", necessity: "required" }, // corporate_cards
      { data_object_id: 213, role: "master", necessity: "required" }, // card_transactions
    ],
  },
  {
    domain_module_code: "EXPENSE-TRAVEL-AND-PER-DIEM",
    domain_module_name: "Travel Booking and Per Diem",
    description:
      "Travel-booking integration, itinerary capture, pre-trip approval, and post-trip expense reconciliation over imported travel bookings.",
    capability_ids: [75], // TRAVEL-BOOK
    data_objects: [
      { data_object_id: 215, role: "master", necessity: "required" }, // travel_bookings
    ],
  },
];

// ---------------------------------------------------------------------------
// Step 1: upsert modules.
// ---------------------------------------------------------------------------
async function upsertModules(): Promise<Map<string, number>> {
  console.log("\n=== domain_modules ===");
  const codes = MODULES.map(m => m.domain_module_code);
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`,
  );
  const existingCodes = new Set(existing.map((r: any) => r.domain_module_code));
  const toInsert = MODULES.filter(m => !existingCodes.has(m.domain_module_code)).map(m => ({
    domain_module_name: m.domain_module_name,
    domain_module_code: m.domain_module_code,
    description: m.description,
    domain_id: DOMAIN_ID,
    module_kind: "full",
    // catalog_tagline / catalog_description intentionally omitted (M8/A4 backfill gap).
    // record_status omitted (R1).
  }));
  if (toInsert.length) {
    await semantius("POST", "/domain_modules", toInsert);
    console.log(`  +${toInsert.length} modules: ${toInsert.map(m => m.domain_module_code).join(", ")}`);
  } else {
    console.log("  (all modules already present)");
  }

  // Re-read to build code -> id map (never hard-code ids).
  const all = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`,
  );
  const map = new Map<string, number>();
  for (const r of all) map.set(r.domain_module_code, r.id);
  for (const code of codes) {
    if (!map.has(code)) throw new Error(`module not found after insert: ${code}`);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Step 2: upsert domain_module_capabilities. Key: (domain_module_id, capability_id).
// ---------------------------------------------------------------------------
async function upsertCapabilities(moduleId: number, capabilityIds: number[]): Promise<void> {
  if (!capabilityIds.length) return;
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capabilityIds.join(",")})&select=capability_id`,
  );
  const existingIds = new Set(existing.map((r: any) => r.capability_id));
  const toInsert = capabilityIds
    .filter(id => !existingIds.has(id))
    .map(id => ({ domain_module_id: moduleId, capability_id: id }));
  // label auto-computed (omitted); notes omitted (R15); record_status omitted (R1).
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`  +${toInsert.length} DMC rows on module ${moduleId}`);
  }
}

// ---------------------------------------------------------------------------
// Step 3: upsert domain_module_data_objects. Key: (domain_module_id, data_object_id).
// ---------------------------------------------------------------------------
async function upsertDMDO(
  moduleId: number,
  rows: { data_object_id: number; role: string; necessity: string }[],
): Promise<void> {
  if (!rows.length) return;
  const ids = rows.map(r => r.data_object_id);
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${ids.join(",")})&select=data_object_id`,
  );
  const existingIds = new Set(existing.map((r: any) => r.data_object_id));
  const toInsert = rows
    .filter(r => !existingIds.has(r.data_object_id))
    .map(r => ({
      domain_module_id: moduleId,
      data_object_id: r.data_object_id,
      role: r.role,
      necessity: r.necessity,
      // label auto-computed (omitted); notes omitted (R15); record_status omitted (R1).
    }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_data_objects", toInsert);
    console.log(`  +${toInsert.length} DMDO rows on module ${moduleId}`);
  }
}

// ---------------------------------------------------------------------------
// Main.
// ---------------------------------------------------------------------------
async function main() {
  const codeToId = await upsertModules();

  for (const m of MODULES) {
    const moduleId = codeToId.get(m.domain_module_code)!;
    console.log(`\n=== ${m.domain_module_code} (id ${moduleId}) ===`);
    await upsertCapabilities(moduleId, m.capability_ids);
    await upsertDMDO(moduleId, m.data_objects);
  }

  console.log("\nDone.");
}

main().catch(e => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
