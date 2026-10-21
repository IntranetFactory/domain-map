#!/usr/bin/env bun
// INV-MGMT Phase C (business_function_domains) + Phase E (permissions + roles).
//
// Phase C: 4 business_function_domains rows.
// Phase E:
//   - 16 catalog-derived permissions on the 3 INV modules (9 baseline + 7 workflow-gate).
//   - 3 roles (function-scoped, snake_case slug per SKILL.md).
//   - 7 role_modules entries (2-module floor on every role).
//   - 7 role_permissions entries (tier-level bundles).
//
// Idempotent. Uses CHUNK=1 (Bun.spawn stdin pipe is unreliable above ~4KB on Windows).

import { $ } from "bun";
$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const json = JSON.stringify(body);
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", json], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const exit = await proc.exited;
  if (exit !== 0) throw new Error(`semantius call failed (exit ${exit}, payload ${json.length}B): ${stderr}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}
async function get(path: string): Promise<Row[]> { return call({ method: "GET", path }); }
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const out: Row[] = [];
  for (const r of rows) {
    const result = await call({ method: "POST", path, body: [r] });
    out.push(...result);
  }
  return out;
}

const INV_MGMT_ID = 164;
const MODULES = { CORE: 61, REPL: 62, KIT: 63 };
const FUNCS = {
  SUPPLY_CHAIN: 30,
  SUPPLY_CHAIN_PLANNING: 47,
  WAREHOUSE_OPS: 49,
  FINANCE: 4,
  SALES_OPS: 52,
};

// ============ Phase C ============
async function phaseC() {
  console.log("\n=== Phase C: business_function_domains ===");
  const rows: Row[] = [
    { domain_id: INV_MGMT_ID, business_function_id: FUNCS.SUPPLY_CHAIN,    responsibility_type: "owner",       notes: "Supply Chain owns inventory planning, accuracy, and reconciliation." },
    { domain_id: INV_MGMT_ID, business_function_id: FUNCS.WAREHOUSE_OPS,   responsibility_type: "contributor", notes: "Warehouse Operations executes physical counts, receipts, transfers, and put-away that drive stock_movements." },
    { domain_id: INV_MGMT_ID, business_function_id: FUNCS.FINANCE,         responsibility_type: "contributor", notes: "Finance contributes inventory accounting policy (FIFO/LIFO/avg), valuation, COGS, and write-down approvals." },
    { domain_id: INV_MGMT_ID, business_function_id: FUNCS.SALES_OPS,       responsibility_type: "consumer",    notes: "Sales Operations consumes ATP signals to commit promise dates on quotes and orders." },
  ];
  const existing = await get(`/business_function_domains?domain_id=eq.${INV_MGMT_ID}&select=business_function_id`);
  const existingIds = new Set(existing.map(r => Number(r.business_function_id)));
  const missing = rows.filter(r => !existingIds.has(Number(r.business_function_id)));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} rows`);
    await insert("/business_function_domains", missing);
  } else {
    console.log("  all present");
  }
}

// ============ Phase E.1: permissions ============
async function phaseE_permissions(): Promise<Map<string, number>> {
  console.log("\n=== Phase E.1: permissions ===");

  const modCodes: Array<[string, number]> = [
    ["inv-core-stock",    MODULES.CORE],
    ["inv-replenishment", MODULES.REPL],
    ["inv-kitting",       MODULES.KIT],
  ];

  type P = { permission_name: string; tier: "baseline-read" | "baseline-manage" | "baseline-admin" | "workflow-gate" | "override"; domain_module_id: number; description: string };
  const perms: P[] = [];

  // Baseline tiers per module
  for (const [code, mid] of modCodes) {
    perms.push(
      { permission_name: `${code}:read`,   tier: "baseline-read",   domain_module_id: mid, description: `Read access to ${code} module records.` },
      { permission_name: `${code}:manage`, tier: "baseline-manage", domain_module_id: mid, description: `Create and edit access to ${code} module records.` },
      { permission_name: `${code}:admin`,  tier: "baseline-admin",  domain_module_id: mid, description: `Full administrative access to ${code} module, including delete and configuration.` },
    );
  }

  // Workflow-gate perms (derived from lifecycle states with requires_permission=true on INV masters).
  // All five workflow-shaped masters live in INV-CORE-STOCK; no domain_module_id is set on the
  // lifecycle_states rows themselves, so the gates default to the realizing module (CORE).
  const gates: Array<[string, string]> = [
    ["post_stock_movement",          "Post a draft stock_movement to inventory balances."],
    ["reverse_stock_movement",       "Post a compensating reversal of a previously-posted stock_movement."],
    ["approve_stock_transfer",       "Approve a stock_transfer for release to in_transit."],
    ["reconcile_stock_transfer",     "Resolve a discrepancy on a stock_transfer receipt (write-off or recovery)."],
    ["approve_cycle_count_variance", "Approve cycle_count variances for posting to balances."],
    ["initiate_lot_recall",          "Initiate a recall on an inventory_lot."],
    ["scrap_serialized_unit",        "Scrap a serialized_unit (terminal disposition)."],
  ];
  for (const [verb, desc] of gates) {
    perms.push({ permission_name: `inv-core-stock:${verb}`, tier: "workflow-gate", domain_module_id: MODULES.CORE, description: desc });
  }

  const existing = await get(`/permissions?domain_module_id=in.(${Object.values(MODULES).join(",")})&select=id,permission_name`);
  const existingNames = new Set(existing.map(r => String(r.permission_name)));
  const missing = perms.filter(p => !existingNames.has(p.permission_name));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} permissions (${existing.length} existed)`);
    await insert("/permissions", missing);
  } else {
    console.log("  all present");
  }
  const all = await get(`/permissions?domain_module_id=in.(${Object.values(MODULES).join(",")})&select=id,permission_name`);
  const map = new Map<string, number>();
  for (const p of all) map.set(String(p.permission_name), Number(p.id));
  return map;
}

// ============ Phase E.2: roles ============
async function phaseE_roles(): Promise<Map<string, number>> {
  console.log("\n=== Phase E.2: roles ===");
  type R = { role_code: string; slug: string; role_name: string; business_function_id: number; origin: string; description: string };
  const roles: R[] = [
    {
      role_code: "WAREHOUSE-INVENTORY-MANAGER",
      slug: "warehouse_inventory_manager",
      role_name: "Inventory Manager",
      business_function_id: FUNCS.WAREHOUSE_OPS,
      origin: "model",
      description: "Owns inventory operations end-to-end for the warehouse: full administrative access to stock tracking, replenishment, and kitting. Approves cycle-count variances, transfers, and exceptional movements.",
    },
    {
      role_code: "SUPPLY-CHAIN-INVENTORY-PLANNER",
      slug: "supply_chain_inventory_planner",
      role_name: "Inventory Planner",
      business_function_id: FUNCS.SUPPLY_CHAIN_PLANNING,
      origin: "model",
      description: "Authors and tunes reorder rules, ABC-XYZ classifications, and ATP policy. Reads stock balances to validate replenishment decisions; does not touch kit definitions.",
    },
    {
      role_code: "FINANCE-INVENTORY-ACCOUNTANT",
      slug: "finance_inventory_accountant",
      role_name: "Inventory Accountant",
      business_function_id: FUNCS.FINANCE,
      origin: "model",
      description: "Read-only access to stock and replenishment data for inventory valuation, COGS calculation, and variance reporting. Writes happen in ERP-FIN, not in INV-MGMT.",
    },
  ];

  const existing = await get(`/roles?role_code=in.(${roles.map(r => r.role_code).join(",")})&select=id,role_code`);
  const existingCodes = new Set(existing.map(r => String(r.role_code)));
  const missing = roles.filter(r => !existingCodes.has(r.role_code));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} roles`);
    await insert("/roles", missing);
  } else {
    console.log("  all present");
  }
  const all = await get(`/roles?role_code=in.(${roles.map(r => r.role_code).join(",")})&select=id,role_code`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r.role_code), Number(r.id));
  return map;
}

// ============ Phase E.3: role_modules ============
async function phaseE_roleModules(roleMap: Map<string, number>) {
  console.log("\n=== Phase E.3: role_modules ===");
  type RM = { role_code: string; domain_module_id: number; interaction_level: "primary" | "secondary"; notes: string };
  const rms: RM[] = [
    { role_code: "WAREHOUSE-INVENTORY-MANAGER", domain_module_id: MODULES.CORE, interaction_level: "primary",   notes: "Day-to-day inventory operations." },
    { role_code: "WAREHOUSE-INVENTORY-MANAGER", domain_module_id: MODULES.REPL, interaction_level: "primary",   notes: "Owns reorder execution and overrides." },
    { role_code: "WAREHOUSE-INVENTORY-MANAGER", domain_module_id: MODULES.KIT,  interaction_level: "secondary", notes: "Manages kit definitions when seller adds bundles; not a daily concern." },
    { role_code: "SUPPLY-CHAIN-INVENTORY-PLANNER", domain_module_id: MODULES.REPL, interaction_level: "primary",   notes: "Primary planning surface: reorder rules, ABC-XYZ, ATP." },
    { role_code: "SUPPLY-CHAIN-INVENTORY-PLANNER", domain_module_id: MODULES.CORE, interaction_level: "secondary", notes: "Read access to balances and movements to validate replenishment outcomes." },
    { role_code: "FINANCE-INVENTORY-ACCOUNTANT",   domain_module_id: MODULES.CORE, interaction_level: "secondary", notes: "Read access for valuation, COGS, and variance reconciliation." },
    { role_code: "FINANCE-INVENTORY-ACCOUNTANT",   domain_module_id: MODULES.REPL, interaction_level: "secondary", notes: "Read access for on-order and committed-stock visibility in financial close." },
  ];

  const rows: Row[] = rms.map(r => ({
    role_id: roleMap.get(r.role_code)!,
    domain_module_id: r.domain_module_id,
    interaction_level: r.interaction_level,
    notes: r.notes,
  }));

  const roleIds = [...new Set(rows.map(r => r.role_id))];
  const existing = await get(`/role_modules?role_id=in.(${roleIds.join(",")})&select=role_id,domain_module_id`);
  const existingKeys = new Set(existing.map(r => `${r.role_id}:${r.domain_module_id}`));
  const missing = rows.filter(r => !existingKeys.has(`${r.role_id}:${r.domain_module_id}`));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} role_modules`);
    await insert("/role_modules", missing);
  } else {
    console.log("  all present");
  }
}

// ============ Phase E.4: role_permissions ============
async function phaseE_rolePermissions(roleMap: Map<string, number>, permMap: Map<string, number>) {
  console.log("\n=== Phase E.4: role_permissions ===");
  type RP = { role_code: string; perm_name: string; notes: string };
  const rps: RP[] = [
    { role_code: "WAREHOUSE-INVENTORY-MANAGER", perm_name: "inv-core-stock:admin",    notes: "Full admin on stock operations." },
    { role_code: "WAREHOUSE-INVENTORY-MANAGER", perm_name: "inv-replenishment:admin", notes: "Full admin on replenishment." },
    { role_code: "WAREHOUSE-INVENTORY-MANAGER", perm_name: "inv-kitting:manage",      notes: "Manage kit definitions; not full admin (kit deletion is rare and warrants intentional config-level access)." },
    { role_code: "SUPPLY-CHAIN-INVENTORY-PLANNER", perm_name: "inv-replenishment:admin", notes: "Full admin on reorder rules and ATP policy." },
    { role_code: "SUPPLY-CHAIN-INVENTORY-PLANNER", perm_name: "inv-core-stock:read",     notes: "Read balances and movements to validate replenishment outcomes." },
    { role_code: "FINANCE-INVENTORY-ACCOUNTANT",   perm_name: "inv-core-stock:read",     notes: "Read for inventory valuation and COGS." },
    { role_code: "FINANCE-INVENTORY-ACCOUNTANT",   perm_name: "inv-replenishment:read",  notes: "Read on-order and committed-stock for financial close." },
  ];

  const rows: Row[] = rps.map(r => {
    const roleId = roleMap.get(r.role_code);
    const permId = permMap.get(r.perm_name);
    if (!roleId) throw new Error(`Unknown role ${r.role_code}`);
    if (!permId) throw new Error(`Unknown permission ${r.perm_name}`);
    return { role_id: roleId, permission_id: permId, notes: r.notes };
  });

  const roleIds = [...new Set(rows.map(r => r.role_id))];
  const existing = await get(`/role_permissions?role_id=in.(${roleIds.join(",")})&select=role_id,permission_id`);
  const existingKeys = new Set(existing.map(r => `${r.role_id}:${r.permission_id}`));
  const missing = rows.filter(r => !existingKeys.has(`${r.role_id}:${r.permission_id}`));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} role_permissions`);
    await insert("/role_permissions", missing);
  } else {
    console.log("  all present");
  }
}

// ============ Main ============
async function main() {
  await phaseC();
  const permMap = await phaseE_permissions();
  const roleMap = await phaseE_roles();
  await phaseE_roleModules(roleMap);
  await phaseE_rolePermissions(roleMap, permMap);

  console.log("\n=== Done ===");
  console.log("UI links:");
  console.log("  https://tests.semantius.app/domain_map/business_function_domains");
  console.log("  https://tests.semantius.app/domain_map/permissions");
  console.log("  https://tests.semantius.app/domain_map/roles");
  console.log("  https://tests.semantius.app/domain_map/role_modules");
  console.log("  https://tests.semantius.app/domain_map/role_permissions");
}

await main();
