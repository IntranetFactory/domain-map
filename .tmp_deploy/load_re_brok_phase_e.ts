#!/usr/bin/env bun
// load_re_brok_phase_e.ts - RE-BROKERAGE Phase E (roles)
//
// Phase E for RE-BROKERAGE - personas that work across RE-BROK modules and
// adjacent CRM/CLM modules.
//
// Pre-load: 6 baseline permissions on the two RE-BROK modules (missed by the
// Phase-M load). Required so the role bundles can grant tier-level access.
//
// 4 roles authored (each meets E2 2-module floor):
//   SALES-LISTING-AGENT          (Sales) - lists + tours + transactions, manages
//                                 their seller's contact + leads
//   SALES-BUYER-AGENT            (Sales) - works leads + buyer-side transactions
//   SALES-TRANSACTION-COORDINATOR (Sales) - mid-large brokerage role; transaction
//                                 file mgmt + broker compliance liaison
//   DESIGNATED-BROKER            (cross-functional) - oversight on every RE-BROK
//                                 module + admin tier on commissions/compliance
//
// 12 role_modules rows (3 per role).
// 12 role_permissions rows (3 per role - tier-level grants per role).
//
// Idempotent. Run from project root:
//   bun run c:/dev/domain-map/.tmp_deploy/load_re_brok_phase_e.ts

export {};

type Row = Record<string, unknown>;

async function postgrest(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Row = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path} (exit ${code}): ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

const AGENT_OPS = 151;
const BROKERAGE_OPS = 152;
const CRM_LEAD_MGT = 47;
const CRM_ACCT_MGT = 46;
const CLM_REPOSITORY = 127;
const SALES_FN_ID = 21;
const DOMAIN_MAP_MODULE_ID = 1001;

// ============================================================
// 0. Add 6 missing baseline permissions on RE-BROK modules
// ============================================================
console.log("=== 0. Baseline permissions for RE-BROK modules (Phase-M gap) ===");

type PermBaseline = {
  module_id: number;
  module_code: string;
  module_name: string;
};

const baselineModules: PermBaseline[] = [
  { module_id: AGENT_OPS, module_code: "re-brok-agent-ops", module_name: "Real Estate Agent Operations" },
  { module_id: BROKERAGE_OPS, module_code: "re-brok-brokerage-ops", module_name: "Brokerage Oversight and Commission Management" },
];

type BasePermSpec = {
  name: string;
  tier: "baseline-read" | "baseline-manage" | "baseline-admin";
  description: string;
  domain_module_id: number;
};

const basePerms: BasePermSpec[] = [];
for (const m of baselineModules) {
  basePerms.push({
    name: `${m.module_code}:read`,
    tier: "baseline-read",
    description: `Read access to every entity in the ${m.module_name} module.`,
    domain_module_id: m.module_id,
  });
  basePerms.push({
    name: `${m.module_code}:manage`,
    tier: "baseline-manage",
    description: `Read + write access to non-administrative state on every entity in the ${m.module_name} module.`,
    domain_module_id: m.module_id,
  });
  basePerms.push({
    name: `${m.module_code}:admin`,
    tier: "baseline-admin",
    description: `Administrative access on every entity in the ${m.module_name} module, including settings, deletion, and every workflow gate auto-included via permission_hierarchy.`,
    domain_module_id: m.module_id,
  });
}

const existingBase: Row[] = await postgrest(
  "GET",
  `/permissions?permission_name=in.(${basePerms.map((p) => p.name).join(",")})&select=permission_name`,
) ?? [];
const seenBase = new Set(existingBase.map((r) => String(r.permission_name)));

let baseAdded = 0;
let baseSkipped = 0;
for (const p of basePerms) {
  if (seenBase.has(p.name)) { baseSkipped++; continue; }
  await postgrest("POST", "/permissions", {
    permission_name: p.name,
    description: p.description,
    tier: p.tier,
    domain_module_id: p.domain_module_id,
    module_id: DOMAIN_MAP_MODULE_ID,
  });
  baseAdded++;
}
console.log(`  new ${baseAdded} / recycled ${baseSkipped}`);

// ============================================================
// 1. Resolve all permission IDs needed by role bundles
// ============================================================
console.log("\n=== 1. Resolving permission IDs for bundles ===");

const allPermNames = [
  // RE-BROK baselines (just added)
  "re-brok-agent-ops:read", "re-brok-agent-ops:manage", "re-brok-agent-ops:admin",
  "re-brok-brokerage-ops:read", "re-brok-brokerage-ops:manage", "re-brok-brokerage-ops:admin",
  // CRM
  "crm-lead-mgt:read", "crm-lead-mgt:manage",
  "crm-acct-mgt:read", "crm-acct-mgt:manage",
  // CLM
  "clm-repository:read",
];
const permRows: Row[] = await postgrest(
  "GET",
  `/permissions?permission_name=in.(${allPermNames.join(",")})&select=id,permission_name`,
) ?? [];
const permId: Record<string, number> = {};
for (const r of permRows) permId[String(r.permission_name)] = Number(r.id);
console.log(`  ${Object.keys(permId).length} of ${allPermNames.length} resolved`);
for (const n of allPermNames) if (!permId[n]) throw new Error(`Missing permission: ${n}`);

// ============================================================
// 2. roles (4 rows)
// ============================================================
console.log("\n=== 2. roles (4 rows) ===");

type RoleSpec = {
  role_code: string;
  role_name: string;
  slug: string;
  business_function_id: number | null;
  description: string;
  modules: Array<{ module_id: number; interaction_level: "primary" | "secondary" }>;
  permissions: string[];
};

const roles: RoleSpec[] = [
  {
    role_code: "SALES-LISTING-AGENT",
    role_name: "Listing Agent",
    slug: "sales_listing_agent",
    business_function_id: SALES_FN_ID,
    description: "Real estate agent representing the seller. Authors listings, schedules tours, opens transactions on accepted offers, and shepherds the transaction through close. Manages the seller as a CRM contact; reads inbound CRM leads to qualify listing prospects. Permission bundle: re-brok-agent-ops:manage (the agent works the listing lifecycle), crm-acct-mgt:manage (their seller's contact record), crm-lead-mgt:read (qualifying inbound interest).",
    modules: [
      { module_id: AGENT_OPS, interaction_level: "primary" },
      { module_id: CRM_ACCT_MGT, interaction_level: "primary" },
      { module_id: CRM_LEAD_MGT, interaction_level: "secondary" },
    ],
    permissions: ["re-brok-agent-ops:manage", "crm-acct-mgt:manage", "crm-lead-mgt:read"],
  },
  {
    role_code: "SALES-BUYER-AGENT",
    role_name: "Buyer Agent",
    slug: "sales_buyer_agent",
    business_function_id: SALES_FN_ID,
    description: "Real estate agent representing the buyer. Works inbound CRM leads, schedules tours of others' listings for their prospects, and opens transactions on accepted offers as the buyer-side agent. Primary write surface is on CRM leads; reads other agents' listings and works the buyer side of transactions. Permission bundle: crm-lead-mgt:manage (the agent works the lead lifecycle), re-brok-agent-ops:manage (writes the buyer side of transactions + tours), crm-acct-mgt:read (their prospect's contact context).",
    modules: [
      { module_id: AGENT_OPS, interaction_level: "primary" },
      { module_id: CRM_LEAD_MGT, interaction_level: "primary" },
      { module_id: CRM_ACCT_MGT, interaction_level: "secondary" },
    ],
    permissions: ["crm-lead-mgt:manage", "re-brok-agent-ops:manage", "crm-acct-mgt:read"],
  },
  {
    role_code: "SALES-TRANSACTION-COORDINATOR",
    role_name: "Transaction Coordinator",
    slug: "sales_transaction_coordinator",
    business_function_id: SALES_FN_ID,
    description: "Mid-to-large brokerage role specializing in transaction file management and the broker compliance handoff. Reads the agent-side transaction record, authors and tracks disclosures, manages the broker's compliance review queue. Does not author listings or tours. Permission bundle: re-brok-agent-ops:manage (transactions + disclosures from the agent side), re-brok-brokerage-ops:manage (compliance review + commission tracking), clm-repository:read (contract reference for non-standard transaction terms).",
    modules: [
      { module_id: AGENT_OPS, interaction_level: "primary" },
      { module_id: BROKERAGE_OPS, interaction_level: "primary" },
      { module_id: CLM_REPOSITORY, interaction_level: "secondary" },
    ],
    permissions: ["re-brok-agent-ops:manage", "re-brok-brokerage-ops:manage", "clm-repository:read"],
  },
  {
    role_code: "DESIGNATED-BROKER",
    role_name: "Designated Broker",
    slug: "designated_broker",
    business_function_id: null, // cross-functional: oversight spans sales + compliance + finance
    description: "The licensed broker legally responsible for the brokerage's regulatory compliance and trust-accounting. Cross-functional: oversight responsibilities span sales activity supervision, transaction compliance review, commission disbursement, and audit response. Admin tier on both RE-BROK modules; read on CRM contacts for client-relationship oversight. Permission bundle: re-brok-agent-ops:admin (full oversight on agent operations, including every workflow gate via permission_hierarchy), re-brok-brokerage-ops:admin (full broker-level access including commission disbursement and compliance approvals), crm-acct-mgt:read (client-relationship visibility).",
    modules: [
      { module_id: BROKERAGE_OPS, interaction_level: "primary" },
      { module_id: AGENT_OPS, interaction_level: "primary" },
      { module_id: CRM_ACCT_MGT, interaction_level: "secondary" },
    ],
    permissions: ["re-brok-brokerage-ops:admin", "re-brok-agent-ops:admin", "crm-acct-mgt:read"],
  },
];

// Pre-flight: 2-module floor
for (const r of roles) {
  if (r.modules.length < 2) throw new Error(`Role ${r.role_code} fails 2-module floor (E2)`);
}

const existingRoles: Row[] = await postgrest(
  "GET",
  `/roles?role_code=in.(${roles.map((r) => r.role_code).join(",")})&select=id,role_code`,
) ?? [];
const roleId: Record<string, number> = {};
for (const r of existingRoles) roleId[String(r.role_code)] = Number(r.id);

for (const r of roles) {
  if (roleId[r.role_code]) {
    console.log(`  recycled ${r.role_code} (id=${roleId[r.role_code]})`);
    continue;
  }
  console.log(`  new ${r.role_code}`);
  await postgrest("POST", "/roles", {
    role_code: r.role_code,
    role_name: r.role_name,
    slug: r.slug,
    description: r.description,
    origin: "model",
    module_id: DOMAIN_MAP_MODULE_ID,
    business_function_id: r.business_function_id,
  });
}

const finalRoles: Row[] = await postgrest(
  "GET",
  `/roles?role_code=in.(${roles.map((r) => r.role_code).join(",")})&select=id,role_code`,
) ?? [];
for (const r of finalRoles) roleId[String(r.role_code)] = Number(r.id);
console.log(`  ${Object.keys(roleId).length} role IDs resolved`);

// ============================================================
// 3. role_modules (12 rows)
// ============================================================
console.log("\n=== 3. role_modules ===");

const allRoleIds = Object.values(roleId);
const existingRM: Row[] = await postgrest(
  "GET",
  `/role_modules?role_id=in.(${allRoleIds.join(",")})&select=role_id,domain_module_id`,
) ?? [];
const seenRM = new Set(existingRM.map((r) => `${r.role_id}:${r.domain_module_id}`));

let rmAdded = 0;
let rmSkipped = 0;
for (const r of roles) {
  const rid = roleId[r.role_code];
  for (const m of r.modules) {
    const key = `${rid}:${m.module_id}`;
    if (seenRM.has(key)) { rmSkipped++; continue; }
    await postgrest("POST", "/role_modules", {
      role_id: rid,
      domain_module_id: m.module_id,
      interaction_level: m.interaction_level,
    });
    rmAdded++;
  }
}
console.log(`  new ${rmAdded} / recycled ${rmSkipped}`);

// ============================================================
// 4. role_permissions (12 rows)
// ============================================================
console.log("\n=== 4. role_permissions ===");

const existingRP: Row[] = await postgrest(
  "GET",
  `/role_permissions?role_id=in.(${allRoleIds.join(",")})&select=role_id,permission_id`,
) ?? [];
const seenRP = new Set(existingRP.map((r) => `${r.role_id}:${r.permission_id}`));

let rpAdded = 0;
let rpSkipped = 0;
for (const r of roles) {
  const rid = roleId[r.role_code];
  for (const pName of r.permissions) {
    const pid = permId[pName];
    const key = `${rid}:${pid}`;
    if (seenRP.has(key)) { rpSkipped++; continue; }
    await postgrest("POST", "/role_permissions", {
      role_id: rid,
      permission_id: pid,
    });
    rpAdded++;
  }
}
console.log(`  new ${rpAdded} / recycled ${rpSkipped}`);

// ============================================================
// 5. Verification (E1-E5)
// ============================================================
console.log("\n=== 5. Phase-E audit (E1-E5) ===");

// E1: role coverage (multi-module RE-BROK has >=3 roles touching its modules)
const reBrokModIds = [AGENT_OPS, BROKERAGE_OPS];
const reBrokRoles: Row[] = await postgrest(
  "GET",
  `/role_modules?domain_module_id=in.(${reBrokModIds.join(",")})&select=role:roles(role_code)`,
) ?? [];
const distinctRoleCodes = new Set(reBrokRoles.map((r: any) => r.role?.role_code).filter(Boolean));
console.log(`  E1: ${distinctRoleCodes.size} distinct roles touch RE-BROK modules ${distinctRoleCodes.size >= 3 ? "PASS" : "FAIL"}`);

// E2: 2-module floor
let e2ok = true;
for (const r of roles) {
  const rid = roleId[r.role_code];
  const mods: Row[] = await postgrest("GET", `/role_modules?role_id=eq.${rid}&select=id`) ?? [];
  if (mods.length < 2) { e2ok = false; console.log(`    E2 FAIL: ${r.role_code} has ${mods.length} modules`); }
}
console.log(`  E2: 2-module floor on every role ${e2ok ? "PASS" : "FAIL"}`);

// E3: interaction_level set
const interactionCheck: Row[] = await postgrest(
  "GET",
  `/role_modules?role_id=in.(${allRoleIds.join(",")})&interaction_level=is.null&select=id`,
) ?? [];
console.log(`  E3: interaction_level set on every row ${interactionCheck.length === 0 ? "PASS" : "FAIL"} (nulls=${interactionCheck.length})`);

// E4: every role has >=1 role_permissions
let e4ok = true;
for (const r of roles) {
  const rid = roleId[r.role_code];
  const rp: Row[] = await postgrest("GET", `/role_permissions?role_id=eq.${rid}&select=id`) ?? [];
  if (rp.length === 0) { e4ok = false; console.log(`    E4 FAIL: ${r.role_code} has no permissions`); }
}
console.log(`  E4: every role has >=1 permission ${e4ok ? "PASS" : "FAIL"}`);

// E5: Path A / Path B agree
console.log(`  E5: Path A/B domain agreement check (per role):`);
let e5ok = true;
for (const r of roles) {
  const rid = roleId[r.role_code];
  const pathA: Row[] = await postgrest(
    "GET",
    `/role_modules?role_id=eq.${rid}&select=domain_module:domain_modules(domain_id)`,
  ) ?? [];
  const pathB: Row[] = await postgrest(
    "GET",
    `/role_permissions?role_id=eq.${rid}&select=permission:permissions(domain_module_id,domain_module:domain_modules(domain_id))`,
  ) ?? [];
  const setA = new Set(pathA.map((x: any) => x.domain_module?.domain_id).filter(Boolean));
  const setB = new Set(pathB.map((x: any) => x.permission?.domain_module?.domain_id).filter(Boolean));
  const matches = setA.size === setB.size && [...setA].every((x) => setB.has(x));
  if (!matches) { e5ok = false; console.log(`    ${r.role_code}: A=[${[...setA].join(",")}] B=[${[...setB].join(",")}] MISMATCH`); }
}
console.log(`  E5: Path A/B agreement ${e5ok ? "PASS" : "FAIL"}`);

console.log();
console.log("=== complete ===");
console.log("UI:");
console.log("  https://tests.semantius.app/domain_map/roles (filter role_code ilike *RE* or *BROKER*)");
console.log("  https://tests.semantius.app/domain_map/role_modules");
console.log("  https://tests.semantius.app/domain_map/role_permissions");
