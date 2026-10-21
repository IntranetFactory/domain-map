#!/usr/bin/env bun
// Idempotent modularization loader for the LOYALTY domain (domains.id = 78).
// Scope: domain_modules + domain_module_capabilities + domain_module_data_objects ONLY.
// Reuses existing capabilities (286-293) and data_objects (97, 263, 264, 265, 717, 718).
// Creates NO new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships.
// Safe to re-run.
//
// Module shape (3 full modules):
//   LOYALTY-PROGRAM-CORE   caps 286,287,290  | loyalty_members(master), loyalty_tiers(master), customers(contributor)
//   LOYALTY-POINTS-REWARDS caps 288,289      | loyalty_transactions(master), redemption_rewards(master), redemption_transactions(master)
//   LOYALTY-ENGAGEMENT     caps 291,292,293  | loyalty_members(consumer)
//
// Master pre-check (run 2026-06-02): customers(97) already mastered in module 46 (CRM-ACCT-MGT) -> contributor here.
// loyalty_members(263), loyalty_transactions(264), loyalty_tiers(265), redemption_rewards(717),
// redemption_transactions(718) have NO master row anywhere -> each mastered in exactly one LOYALTY module.

type Json = any;

const DOMAIN_ID = 78;

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

type ModuleSpec = {
  domain_module_code: string;
  domain_module_name: string;
  description: string;
  capability_ids: number[];
  dmdo: { data_object_id: number; role: string; necessity: string }[];
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_code: "LOYALTY-PROGRAM-CORE",
    domain_module_name: "Loyalty Program Core",
    description:
      "Member enrollment, profile, and program/tier design. Configures points-earn rules, tier thresholds, qualification windows, and retention logic, and links each member identity to the canonical customer record.",
    capability_ids: [286, 287, 290],
    dmdo: [
      { data_object_id: 263, role: "master", necessity: "required" },       // loyalty_members
      { data_object_id: 265, role: "master", necessity: "required" },       // loyalty_tiers
      { data_object_id: 97, role: "contributor", necessity: "required" },   // customers (mastered in CRM)
    ],
  },
  {
    domain_module_code: "LOYALTY-POINTS-REWARDS",
    domain_module_name: "Points Ledger and Rewards",
    description:
      "Double-entry points ledger and rewards fulfillment. Records accrual, redemption, adjustment, and expiry events with an auditable per-member balance, and runs the redeemable rewards catalog and redemption settlement.",
    capability_ids: [288, 289],
    dmdo: [
      { data_object_id: 264, role: "master", necessity: "required" },       // loyalty_transactions
      { data_object_id: 717, role: "master", necessity: "required" },       // redemption_rewards
      { data_object_id: 718, role: "master", necessity: "required" },       // redemption_transactions
    ],
  },
  {
    domain_module_code: "LOYALTY-ENGAGEMENT",
    domain_module_name: "Promotions, Partners, and Member Portal",
    description:
      "Member-facing engagement surface. Runs time-bound bonus and multiplier promotions and gamified challenges, manages multi-brand coalition and partner-issued-points programs, and powers the branded self-service portal and mobile app.",
    capability_ids: [291, 292, 293],
    dmdo: [
      { data_object_id: 263, role: "consumer", necessity: "required" },     // loyalty_members (read for portal/promotions)
    ],
  },
];

async function upsertModules(): Promise<Map<string, number>> {
  const codes = MODULES.map(m => m.domain_module_code);
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`,
  );
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
    console.log(`  +${toInsert.length} domain_modules: ${toInsert.map(r => r.domain_module_code).join(", ")}`);
  } else {
    console.log("  modules already present");
  }
  // Re-read for the authoritative code -> id map.
  const all = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`,
  );
  const map = new Map<string, number>();
  for (const r of all) map.set(r.domain_module_code, r.id);
  return map;
}

async function upsertCapabilities(moduleId: number, capabilityIds: number[]): Promise<void> {
  if (!capabilityIds.length) return;
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capabilityIds.join(",")})&select=capability_id`,
  );
  const existingIds = new Set(existing.map((r: any) => r.capability_id));
  const toInsert = capabilityIds
    .filter(id => !existingIds.has(id))
    .map(capability_id => ({ domain_module_id: moduleId, capability_id }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`  +${toInsert.length} DMC rows on module ${moduleId}`);
  }
}

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
    }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_data_objects", toInsert);
    console.log(`  +${toInsert.length} DMDO rows on module ${moduleId}`);
  }
}

async function main() {
  console.log("=== Modularize LOYALTY (domain 78) ===");

  // Defensive: re-confirm no foreign master claims on the 5 in-domain masters.
  const precheck = await semantius(
    "GET",
    "/domain_module_data_objects?data_object_id=in.(263,264,265,717,718)&role=eq.master&select=domain_module_id,data_object_id",
  );
  const ours = new Set<number>();
  // (ours filled after module map is known; collect foreign claims here)

  const moduleMap = await upsertModules();
  const myModuleIds = new Set([...moduleMap.values()]);
  const foreignMasters = precheck.filter((r: any) => !myModuleIds.has(r.domain_module_id));
  if (foreignMasters.length) {
    throw new Error(
      `Master pre-check FAILED: foreign master claims exist on LOYALTY masters: ${JSON.stringify(foreignMasters)}. ` +
        `Demote those entities to embedded_master before re-running.`,
    );
  }

  for (const m of MODULES) {
    const moduleId = moduleMap.get(m.domain_module_code);
    if (!moduleId) throw new Error(`module not found after insert: ${m.domain_module_code}`);
    console.log(`\n--- ${m.domain_module_code} (id ${moduleId}) ---`);
    await upsertCapabilities(moduleId, m.capability_ids);
    await upsertDMDO(moduleId, m.dmdo);
  }

  console.log("\nDone.");
}

main().catch(e => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
