/**
 * PLM Phase C + Phase E loader (2026-05-24)
 *
 * Phase C (organizational ownership):
 *   - business_function_domains: 4 RACI rows (owner R&D, contributor Supply Chain,
 *     contributor Procurement, consumer Customer Service)
 *   - business_function_capabilities: 1 override row for PLM-PRODUCT-COMPLIANCE
 *     (owned by GRC, not the parent-domain owner R&D)
 *
 * Phase E (roles & permission bundling):
 *   - permissions: materialize per-module tier perms (5 modules × 3 tiers = 15) +
 *     workflow-gate perms from data_object_lifecycle_states (17)
 *   - roles: 4 multi-module personas (Design Engineer, Mfg Engineer, ECO Manager,
 *     Regulatory Affairs Specialist)
 *   - role_modules: each role >=2 entries (per E2 floor)
 *   - role_permissions: tier-level grants per role
 *
 * Idempotent. Run from project root:
 *   bun run .tmp_deploy/load_plm_phase_c_and_e.ts
 */

import { $ } from "bun";
$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const get = (path: string) => call({ method: "GET", path });

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

// ============================================================
// CONSTANTS
// ============================================================

const PLM_DOMAIN_ID = 165;

// business_function ids resolved live from the earlier query
const FN_RESEARCH_DEV = 35;
const FN_SUPPLY_CHAIN = 30;
const FN_PROCUREMENT = 19;
const FN_CUSTOMER_SERVICE = 24;
const FN_GRC = 31;

// ============================================================
// PHASE C: business_function_domains + capability override
// ============================================================

async function phaseC(): Promise<void> {
  console.log("\n=== Phase C.1: business_function_domains ===");
  type BfdSpec = {
    business_function_id: number;
    responsibility_type: "owner" | "contributor" | "consumer";
    notes: string;
  };
  const bfdSpecs: BfdSpec[] = [
    { business_function_id: FN_RESEARCH_DEV, responsibility_type: "owner", notes: "Product Engineering / R&D owns the design release, BOM authoring, CAD, requirements, and change-control workflows that PLM serves." },
    { business_function_id: FN_SUPPLY_CHAIN, responsibility_type: "contributor", notes: "Manufacturing Engineering (under Supply Chain) consumes engineering release and contributes the mBOM and routing back into PLM-MFG-PROCESS. Joint authority on the engineering-to-manufacturing handover." },
    { business_function_id: FN_PROCUREMENT, responsibility_type: "contributor", notes: "Procurement contributes supplier material declarations into PLM-COMPLIANCE and consumes the item master + approved supplier list for sourcing." },
    { business_function_id: FN_CUSTOMER_SERVICE, responsibility_type: "consumer", notes: "Field service technicians pull released drawings and as-maintained BOMs from PLM via FSM integration." },
  ];

  const existing = await get(
    `/business_function_domains?domain_id=eq.${PLM_DOMAIN_ID}&select=business_function_id,responsibility_type`,
  );
  const existingKeys = new Set(
    existing.map(r => `${r.business_function_id}:${r.responsibility_type}`),
  );
  const toInsert = bfdSpecs
    .filter(s => !existingKeys.has(`${s.business_function_id}:${s.responsibility_type}`))
    .map(s => ({
      domain_id: PLM_DOMAIN_ID,
      business_function_id: s.business_function_id,
      responsibility_type: s.responsibility_type,
      notes: s.notes,
      record_status: "new",
    }));
  if (toInsert.length > 0) {
    console.log(`  inserting ${toInsert.length} business_function_domains rows`);
    await insert("/business_function_domains", toInsert);
  } else {
    console.log("  all BFD rows already present");
  }

  console.log("\n=== Phase C.2: business_function_capabilities (overrides only) ===");
  // PLM-PRODUCT-COMPLIANCE is owned by GRC (Regulatory Affairs), not by R&D.
  const compCap = await get(`/capabilities?capability_code=eq.PLM-PRODUCT-COMPLIANCE&select=id`);
  if (compCap.length === 0) {
    console.warn("  PLM-PRODUCT-COMPLIANCE capability not found, skipping");
    return;
  }
  const compCapId = Number(compCap[0].id);
  const existingBfc = await get(
    `/business_function_capabilities?capability_id=eq.${compCapId}&select=business_function_id,responsibility_type`,
  );
  const existingBfcKeys = new Set(
    existingBfc.map(r => `${r.business_function_id}:${r.responsibility_type}`),
  );
  const overrideRow = {
    capability_id: compCapId,
    business_function_id: FN_GRC,
    responsibility_type: "owner" as const,
    notes: "Product Compliance is owned by GRC / Regulatory Affairs even though the parent domain PLM sits under R&D. R&D engineers contribute substance content but cannot release a compliance declaration; that authority is regulatory.",
    record_status: "new",
  };
  if (!existingBfcKeys.has(`${FN_GRC}:owner`)) {
    console.log("  inserting 1 business_function_capabilities override row");
    await insert("/business_function_capabilities", [overrideRow]);
  } else {
    console.log("  GRC ownership override already present on PLM-PRODUCT-COMPLIANCE");
  }
}

// ============================================================
// PHASE E.1: materialize permissions
// ============================================================

async function phaseE1Permissions(): Promise<Map<string, number>> {
  console.log("\n=== Phase E.1: permissions ===");
  const plmModules: { id: number; domain_module_code: string }[] = await get(
    `/domain_modules?domain_id=eq.${PLM_DOMAIN_ID}&select=id,domain_module_code`,
  );

  type PermSpec = {
    permission_name: string;
    description: string;
    domain_module_id: number;
    tier: "baseline-read" | "baseline-manage" | "baseline-admin" | "workflow-gate";
  };
  const specs: PermSpec[] = [];

  // 3 baseline tier permissions per module
  for (const m of plmModules) {
    const prefix = m.domain_module_code.toLowerCase();
    specs.push({ permission_name: `${prefix}:read`,   description: `Read access to ${m.domain_module_code}.`,                       domain_module_id: m.id, tier: "baseline-read" });
    specs.push({ permission_name: `${prefix}:manage`, description: `Create, update, and progress workflows in ${m.domain_module_code}.`, domain_module_id: m.id, tier: "baseline-manage" });
    specs.push({ permission_name: `${prefix}:admin`,  description: `Full administrative access to ${m.domain_module_code}, including module configuration.`, domain_module_id: m.id, tier: "baseline-admin" });
  }

  // Workflow gates from lifecycle states with permission_verb_override + domain_module_id
  const lcStates: { state_name: string; permission_verb_override: string; domain_module_id: number; description: string }[] = await get(
    `/data_object_lifecycle_states?requires_permission=eq.true&domain_module_id=in.(${plmModules.map(m => m.id).join(",")})&select=state_name,permission_verb_override,domain_module_id,description`,
  );
  const codeById = new Map(plmModules.map(m => [m.id, m.domain_module_code.toLowerCase()]));
  for (const s of lcStates) {
    const prefix = codeById.get(s.domain_module_id);
    if (!prefix) continue;
    const verb = s.permission_verb_override || s.state_name;
    specs.push({
      permission_name: `${prefix}:${verb}`,
      description: s.description,
      domain_module_id: s.domain_module_id,
      tier: "workflow-gate",
    });
  }

  // Idempotent: skip ones already present
  const existing: { permission_name: string }[] = await get(
    `/permissions?permission_name=in.(${specs.map(s => s.permission_name).join(",")})&select=permission_name`,
  );
  const existingNames = new Set(existing.map(r => r.permission_name));
  // Note: permissions table is a Semantius built-in and does not carry record_status.
  const toInsert = specs.filter(s => !existingNames.has(s.permission_name));

  if (toInsert.length > 0) {
    console.log(`  inserting ${toInsert.length} permissions (${specs.length - toInsert.length} already existed)`);
    await insert("/permissions", toInsert);
  } else {
    console.log("  all PLM permissions already present");
  }

  const all: { id: number; permission_name: string }[] = await get(
    `/permissions?permission_name=in.(${specs.map(s => s.permission_name).join(",")})&select=id,permission_name`,
  );
  return new Map(all.map(p => [p.permission_name, p.id]));
}

// ============================================================
// PHASE E.2: roles
// ============================================================

interface RoleSpec {
  role_code: string;
  role_name: string;
  slug: string;
  description: string;
  business_function_id: number | null;
  modules: { code: string; level: "primary" | "secondary"; notes: string }[];
  permissions: string[]; // permission_name list
}

const rolesSpec: RoleSpec[] = [
  {
    role_code: "RESEARCH-DEV-DESIGN-ENGINEER",
    role_name: "Design Engineer",
    slug: "research_dev_design_engineer",
    description: "Authors part designs, mints engineering revisions, owns CAD source files in the vault, and writes / decomposes engineering requirements. The originator of most ECRs.",
    business_function_id: FN_RESEARCH_DEV,
    modules: [
      { code: "PLM-ENG-CORE", level: "primary", notes: "Owns part, BOM, and revision authoring; raises ECRs." },
      { code: "PLM-CAD-PDM", level: "primary", notes: "Checks out / checks in CAD models for the parts they own." },
      { code: "PLM-REQUIREMENTS", level: "secondary", notes: "Reads allocated requirements; decomposes when working as systems engineer." },
    ],
    permissions: ["plm-eng-core:manage", "plm-cad-pdm:manage", "plm-requirements:read"],
  },
  {
    role_code: "RESEARCH-DEV-MFG-ENGINEER",
    role_name: "Manufacturing Engineer",
    slug: "research_dev_mfg_engineer",
    description: "Authors the mBOM, manufacturing routing, and work-instruction structure. Bridges engineering release to MES; the typical releaser of mBOM and routing revisions.",
    business_function_id: FN_RESEARCH_DEV,
    modules: [
      { code: "PLM-MFG-PROCESS", level: "primary", notes: "Authors mBOM, routings, and variant resolutions." },
      { code: "PLM-ENG-CORE", level: "secondary", notes: "Reads released eBOM and part master to drive mBOM authoring." },
    ],
    permissions: ["plm-mfg-process:manage", "plm-mfg-process:release_mbom", "plm-eng-core:read"],
  },
  {
    role_code: "RESEARCH-DEV-ENG-CHANGE-MANAGER",
    role_name: "Engineering Change Manager",
    slug: "research_dev_eng_change_manager",
    description: "Owns the engineering change workflow end-to-end: impact analysis, CAB submission, approval routing, release scheduling, and close-out. Cross-cuts engineering, manufacturing, and compliance.",
    business_function_id: FN_RESEARCH_DEV,
    modules: [
      { code: "PLM-ENG-CORE", level: "primary", notes: "Administers the ECO workflow; approves and releases changes." },
      { code: "PLM-MFG-PROCESS", level: "secondary", notes: "Coordinates mBOM and routing impact assessment for each change." },
      { code: "PLM-COMPLIANCE", level: "secondary", notes: "Reads compliance impact when changes touch regulated parts." },
    ],
    permissions: ["plm-eng-core:admin", "plm-mfg-process:read", "plm-compliance:read"],
  },
  {
    role_code: "GRC-REGULATORY-AFFAIRS",
    role_name: "Regulatory Affairs Specialist",
    slug: "grc_regulatory_affairs",
    description: "Owns product-compliance declarations end-to-end: maintains the regulated-substances catalog, requests declarations from suppliers, approves received declarations, and gates the sellable-in-market flag.",
    business_function_id: FN_GRC,
    modules: [
      { code: "PLM-COMPLIANCE", level: "primary", notes: "Administers the regulated-substances catalog and approves declarations." },
      { code: "PLM-ENG-CORE", level: "secondary", notes: "Reads part data to attach declarations and traverse BOM rollups." },
    ],
    permissions: ["plm-compliance:admin", "plm-eng-core:read"],
  },
];

async function phaseE2Roles(): Promise<Map<string, number>> {
  console.log("\n=== Phase E.2: roles ===");
  const existing: { id: number; role_code: string }[] = await get(
    `/roles?role_code=in.(${rolesSpec.map(r => r.role_code).join(",")})&select=id,role_code`,
  );
  const existingCodes = new Set(existing.map(r => r.role_code));
  const toInsert = rolesSpec
    .filter(r => !existingCodes.has(r.role_code))
    .map(r => ({
      role_code: r.role_code,
      role_name: r.role_name,
      slug: r.slug,
      description: r.description,
      origin: "model",
      business_function_id: r.business_function_id,
      record_status: "new",
    }));
  if (toInsert.length > 0) {
    console.log(`  inserting ${toInsert.length} roles`);
    await insert("/roles", toInsert);
  } else {
    console.log("  all roles already present");
  }
  const all: { id: number; role_code: string }[] = await get(
    `/roles?role_code=in.(${rolesSpec.map(r => r.role_code).join(",")})&select=id,role_code`,
  );
  return new Map(all.map(r => [r.role_code, r.id]));
}

// ============================================================
// PHASE E.3: role_modules
// ============================================================

async function phaseE3RoleModules(roleIdMap: Map<string, number>): Promise<void> {
  console.log("\n=== Phase E.3: role_modules ===");
  const plmModules: { id: number; domain_module_code: string }[] = await get(
    `/domain_modules?domain_id=eq.${PLM_DOMAIN_ID}&select=id,domain_module_code`,
  );
  const modIdMap = new Map(plmModules.map(m => [m.domain_module_code, m.id]));
  const roleIds = [...roleIdMap.values()];
  const existing: { role_id: number; domain_module_id: number }[] = await get(
    `/role_modules?role_id=in.(${roleIds.join(",")})&select=role_id,domain_module_id`,
  );
  const existingKeys = new Set(existing.map(r => `${r.role_id}:${r.domain_module_id}`));

  const toInsert: Row[] = [];
  for (const r of rolesSpec) {
    const rid = roleIdMap.get(r.role_code);
    if (!rid) continue;
    for (const m of r.modules) {
      const mid = modIdMap.get(m.code);
      if (!mid) {
        console.warn(`  module ${m.code} not found for ${r.role_code}`);
        continue;
      }
      const key = `${rid}:${mid}`;
      if (existingKeys.has(key)) continue;
      toInsert.push({
        role_id: rid,
        domain_module_id: mid,
        interaction_level: m.level,
        notes: m.notes,
      });
    }
  }
  if (toInsert.length > 0) {
    console.log(`  inserting ${toInsert.length} role_modules rows`);
    await insert("/role_modules", toInsert);
  } else {
    console.log("  all role_modules already present");
  }
}

// ============================================================
// PHASE E.4: role_permissions
// ============================================================

async function phaseE4RolePermissions(
  roleIdMap: Map<string, number>,
  permIdMap: Map<string, number>,
): Promise<void> {
  console.log("\n=== Phase E.4: role_permissions ===");
  const roleIds = [...roleIdMap.values()];
  const existing: { role_id: number; permission_id: number }[] = await get(
    `/role_permissions?role_id=in.(${roleIds.join(",")})&select=role_id,permission_id`,
  );
  const existingKeys = new Set(existing.map(r => `${r.role_id}:${r.permission_id}`));

  const toInsert: Row[] = [];
  for (const r of rolesSpec) {
    const rid = roleIdMap.get(r.role_code);
    if (!rid) continue;
    for (const permName of r.permissions) {
      const pid = permIdMap.get(permName);
      if (!pid) {
        console.warn(`  permission ${permName} not found for ${r.role_code}`);
        continue;
      }
      const key = `${rid}:${pid}`;
      if (existingKeys.has(key)) continue;
      toInsert.push({ role_id: rid, permission_id: pid });
    }
  }
  if (toInsert.length > 0) {
    console.log(`  inserting ${toInsert.length} role_permissions rows`);
    await insert("/role_permissions", toInsert);
  } else {
    console.log("  all role_permissions already present");
  }
}

// ============================================================
// RUN
// ============================================================

async function main() {
  console.log("PLM Phase C + E loader (2026-05-24)");
  console.log("====================================");

  await phaseC();
  const permIdMap = await phaseE1Permissions();
  const roleIdMap = await phaseE2Roles();
  await phaseE3RoleModules(roleIdMap);
  await phaseE4RolePermissions(roleIdMap, permIdMap);

  console.log("\n=== Post-load counts ===");
  const counts = {
    business_function_domains: (await get(`/business_function_domains?domain_id=eq.${PLM_DOMAIN_ID}&select=business_function_id`)).length,
    business_function_capabilities_overrides: (await get(`/business_function_capabilities?capability_id=in.(${(await get(`/capability_domains?domain_id=eq.${PLM_DOMAIN_ID}&select=capability_id`)).map((r: any) => r.capability_id).join(",")})&select=business_function_id`)).length,
    plm_permissions: permIdMap.size,
    plm_roles: roleIdMap.size,
    plm_role_modules: (await get(`/role_modules?role_id=in.(${[...roleIdMap.values()].join(",")})&select=role_id`)).length,
    plm_role_permissions: (await get(`/role_permissions?role_id=in.(${[...roleIdMap.values()].join(",")})&select=role_id`)).length,
  };
  console.log(counts);
}

await main();
console.log("\nDone.");
