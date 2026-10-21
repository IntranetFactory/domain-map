#!/usr/bin/env bun
// load_ats_module_permissions.ts — plan-modules.md §11 step 3.5.
//
// Materializes the derived permissions for the 8 ATS modules into the live `permissions` table,
// then loads the `permission_hierarchy` edges that encode tier inheritance.
//
// Derivation lifts the same logic emit_fact_sheet.ts uses to render the §5 permissions table
// of each module fact sheet (plan-modules.md §4.6):
//
//   For every module:
//     - <slug>:read              tier = baseline-read
//     - <slug>:manage            tier = baseline-manage
//     - <slug>:admin             tier = baseline-admin
//     For every lifecycle state on a master (or realized by this module) where
//     requires_permission = true AND (state.domain_module_id == this module OR
//     state.domain_module_id IS NULL AND data_object is mastered here):
//       - <slug>:<verb_override OR <state_name>_<entity_singular>>   tier = workflow-gate
//     For every master in this module:
//       has_personal_content → :view_all_<plural>, :manage_all_<plural>  tier = override
//       has_submit_lock      → :submit_<singular>                        tier = override
//
//   Hierarchy edges (origin='model', per plan-roles.md §4.3 tier-expansion contract):
//     <slug>:admin   ⊃ <slug>:manage
//     <slug>:manage  ⊃ <slug>:read
//     <slug>:admin   ⊃ every workflow-gate in this module
//     <slug>:admin   ⊃ every override (view_all_*, manage_all_*, submit_*) in this module
//
// Permissions sit under platform module_id=1001 (Domain Map) and carry domain_module_id pointing
// at the catalog module they belong to. `tier` lets queries filter without parsing names.
//
// Idempotent: reads first, only writes what's missing. Re-running is safe.
// Run from project root (CLAUDE.md cwd rule):
//   bun run c:/dev/domain-map/.tmp_deploy/load_ats_module_permissions.ts

export {};

const PLATFORM_MODULE_ID = 1001; // "Domain Map"

type Row = Record<string, unknown>;

async function pg(method: string, path: string, body?: unknown): Promise<any> {
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
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path}: ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

function moduleSlug(code: string): string {
  return code.toLowerCase().replace(/_/g, "-");
}

function singularToken(label: string): string {
  return label.toLowerCase().replace(/\s+/g, "_");
}

function pluralToken(label: string): string {
  return label.toLowerCase().replace(/\s+/g, "_");
}

// ============================================================
// 0. Resolve ATS modules + their data_objects + lifecycle states
// ============================================================
console.log("=== 0. Resolving ATS modules + dependencies ===");

const ATS_DOMAIN_ID = 56;

const modRows: Row[] = await pg(
  "GET",
  `/domain_modules?domain_id=eq.${ATS_DOMAIN_ID}&select=id,domain_module_code,domain_module_name&order=id.asc`,
) ?? [];
console.log(`  modules: ${modRows.length}`);

const moduleIds = modRows.map((m) => m.id as number);

// All data_objects relevant to these modules.
const moduleDORows: Row[] = await pg(
  "GET",
  `/domain_module_data_objects?domain_module_id=in.(${moduleIds.join(",")})&select=domain_module_id,data_object_id,role`,
) ?? [];

// Master ids per module.
const mastersByModule = new Map<number, Set<number>>();
for (const m of modRows) mastersByModule.set(m.id as number, new Set());
for (const r of moduleDORows) {
  if (r.role !== "master") continue;
  mastersByModule.get(r.domain_module_id as number)!.add(r.data_object_id as number);
}

// All data_object records we'll need (master + embedded for pattern flags? — we only derive
// pattern-flag overrides from MASTERS per §4.6).
const masterIdsAll = new Set<number>();
for (const set of mastersByModule.values()) for (const id of set) masterIdsAll.add(id);

const doRows: Row[] = masterIdsAll.size === 0 ? [] : await pg(
  "GET",
  `/data_objects?id=in.(${[...masterIdsAll].join(",")})&select=id,data_object_name,singular_label,plural_label,has_personal_content,has_submit_lock`,
) ?? [];
const doById = new Map<number, Row>(doRows.map((r) => [r.id as number, r]));

// Lifecycle states for these masters (we'll filter for requires_permission and realizing module).
const lcRows: Row[] = masterIdsAll.size === 0 ? [] : await pg(
  "GET",
  `/data_object_lifecycle_states?data_object_id=in.(${[...masterIdsAll].join(",")})&select=id,data_object_id,state_name,domain_module_id,requires_permission,permission_verb_override`,
) ?? [];

// Also include lifecycle states realized by these modules on someone else's master.
const lcRealizedHereRows: Row[] = await pg(
  "GET",
  `/data_object_lifecycle_states?domain_module_id=in.(${moduleIds.join(",")})&select=id,data_object_id,state_name,domain_module_id,requires_permission,permission_verb_override`,
) ?? [];
// Merge, dedupe by id.
const lcById = new Map<number, Row>();
for (const r of [...lcRows, ...lcRealizedHereRows]) lcById.set(r.id as number, r);

// Resolve any data_objects we don't yet have (states might reference masters not in this module).
const missingDOIds = new Set<number>();
for (const r of lcById.values()) {
  const did = r.data_object_id as number;
  if (!doById.has(did)) missingDOIds.add(did);
}
if (missingDOIds.size > 0) {
  const extraRows: Row[] = await pg(
    "GET",
    `/data_objects?id=in.(${[...missingDOIds].join(",")})&select=id,data_object_name,singular_label,plural_label,has_personal_content,has_submit_lock`,
  ) ?? [];
  for (const r of extraRows) doById.set(r.id as number, r);
}

// ============================================================
// 1. Compute the full permission set per module
// ============================================================
console.log("\n=== 1. Computing derived permissions per module ===");

type DerivedPerm = {
  permission_name: string;
  tier: "baseline-read" | "baseline-manage" | "baseline-admin" | "workflow-gate" | "override";
  description: string;
  domain_module_id: number;
};

type ModuleDerivation = {
  module: Row;
  slug: string;
  perms: DerivedPerm[];
};

const derivations: ModuleDerivation[] = [];

for (const m of modRows) {
  const moduleId = m.id as number;
  const slug = moduleSlug(String(m.domain_module_code));
  const perms: DerivedPerm[] = [];

  // Baseline tiers
  perms.push({
    permission_name: `${slug}:read`,
    tier: "baseline-read",
    description: `Read access to every entity in the ${m.domain_module_code} module.`,
    domain_module_id: moduleId,
  });
  perms.push({
    permission_name: `${slug}:manage`,
    tier: "baseline-manage",
    description: `Edit operational records in the ${m.domain_module_code} module.`,
    domain_module_id: moduleId,
  });
  perms.push({
    permission_name: `${slug}:admin`,
    tier: "baseline-admin",
    description: `Edit reference data in the ${m.domain_module_code} module and inherit every workflow gate below via permission_hierarchy.`,
    domain_module_id: moduleId,
  });

  // Workflow gates from lifecycle states this module owns:
  //   - state.domain_module_id === this module's id, OR
  //   - state.domain_module_id IS NULL AND data_object is mastered by this module.
  const ownMasters = mastersByModule.get(moduleId) ?? new Set();
  for (const ls of lcById.values()) {
    if (!ls.requires_permission) continue;
    const realizingId = ls.domain_module_id as number | null;
    const ownsAsRealizer = realizingId === moduleId;
    const ownsAsMaster = realizingId === null && ownMasters.has(ls.data_object_id as number);
    if (!ownsAsRealizer && !ownsAsMaster) continue;
    const obj = doById.get(ls.data_object_id as number);
    if (!obj) continue;
    const verbSegment = ls.permission_verb_override
      ? String(ls.permission_verb_override)
      : `${ls.state_name}_${singularToken(String(obj.singular_label))}`;
    perms.push({
      permission_name: `${slug}:${verbSegment}`,
      tier: "workflow-gate",
      description: `Transition \`${obj.data_object_name}\` into state \`${ls.state_name}\`.`,
      domain_module_id: moduleId,
    });
  }

  // Pattern-flag overrides on this module's masters.
  for (const did of ownMasters) {
    const obj = doById.get(did);
    if (!obj) continue;
    const singular = singularToken(String(obj.singular_label));
    const plural = pluralToken(String(obj.plural_label));
    if (obj.has_personal_content) {
      perms.push({
        permission_name: `${slug}:view_all_${plural}`,
        tier: "override",
        description: `View all \`${obj.data_object_name}\` rows beyond row-scope (pattern flag: has_personal_content).`,
        domain_module_id: moduleId,
      });
      perms.push({
        permission_name: `${slug}:manage_all_${plural}`,
        tier: "override",
        description: `Manage all \`${obj.data_object_name}\` rows beyond row-scope (pattern flag: has_personal_content).`,
        domain_module_id: moduleId,
      });
    }
    if (obj.has_submit_lock) {
      perms.push({
        permission_name: `${slug}:submit_${singular}`,
        tier: "override",
        description: `Submit and lock a \`${obj.data_object_name}\` row (pattern flag: has_submit_lock).`,
        domain_module_id: moduleId,
      });
    }
  }

  derivations.push({ module: m, slug, perms });
  console.log(`  ${String(m.domain_module_code).padEnd(28)} → ${perms.length} permissions`);
}

const totalDerived = derivations.reduce((acc, d) => acc + d.perms.length, 0);
console.log(`  total derived: ${totalDerived} permissions across ${derivations.length} modules`);

// ============================================================
// 2. Upsert permission rows
// ============================================================
console.log("\n=== 2. Upserting permission rows ===");

const allPermNames = derivations.flatMap((d) => d.perms.map((p) => p.permission_name));
const existingPerms: Row[] = allPermNames.length === 0 ? [] : await pg(
  "GET",
  `/permissions?permission_name=in.(${allPermNames.join(",")})&select=id,permission_name,domain_module_id,tier`,
) ?? [];
const existingByName = new Map<string, Row>(existingPerms.map((r) => [String(r.permission_name), r]));

let inserted = 0;
let patched = 0;
let unchanged = 0;
for (const d of derivations) {
  for (const p of d.perms) {
    const existing = existingByName.get(p.permission_name);
    if (!existing) {
      await pg("POST", "/permissions", {
        permission_name: p.permission_name,
        description: p.description,
        module_id: PLATFORM_MODULE_ID,
        domain_module_id: p.domain_module_id,
        tier: p.tier,
      });
      inserted++;
      continue;
    }
    // Patch if either catalog column is missing.
    const patch: Row = {};
    if (existing.domain_module_id !== p.domain_module_id) patch.domain_module_id = p.domain_module_id;
    if (existing.tier !== p.tier) patch.tier = p.tier;
    if (Object.keys(patch).length === 0) {
      unchanged++;
      continue;
    }
    await pg("PATCH", `/permissions?id=eq.${existing.id}`, patch);
    patched++;
  }
}
console.log(`  ✨ inserted ${inserted} / ♻ patched ${patched} / unchanged ${unchanged}`);

// Re-resolve IDs for the hierarchy step.
const allPerms: Row[] = await pg(
  "GET",
  `/permissions?permission_name=in.(${allPermNames.join(",")})&select=id,permission_name`,
) ?? [];
const permIdByName = new Map<string, number>(allPerms.map((r) => [String(r.permission_name), r.id as number]));

// ============================================================
// 3. Build permission_hierarchy edges (origin='model')
// ============================================================
console.log("\n=== 3. Loading permission_hierarchy edges (origin='model') ===");

type Edge = { including: string; included: string };

const edges: Edge[] = [];
for (const d of derivations) {
  const adminName = `${d.slug}:admin`;
  const manageName = `${d.slug}:manage`;
  const readName = `${d.slug}:read`;
  // baseline-tier chain: admin ⊃ manage ⊃ read
  edges.push({ including: adminName, included: manageName });
  edges.push({ including: manageName, included: readName });
  // admin ⊃ every workflow-gate and override in this module
  for (const p of d.perms) {
    if (p.tier === "workflow-gate" || p.tier === "override") {
      edges.push({ including: adminName, included: p.permission_name });
    }
  }
}

// Resolve to IDs and read existing edges to dedupe.
const allIncluding = new Set(edges.map((e) => e.including));
const allIncluded = new Set(edges.map((e) => e.included));
const allEdgePermNames = [...new Set([...allIncluding, ...allIncluded])];
const allEdgePermIds = allEdgePermNames
  .map((n) => permIdByName.get(n))
  .filter((id): id is number => id !== undefined);

const existingEdges: Row[] = allEdgePermIds.length === 0 ? [] : await pg(
  "GET",
  `/permission_hierarchy?including_permission_id=in.(${allEdgePermIds.join(",")})&included_permission_id=in.(${allEdgePermIds.join(",")})&select=including_permission_id,included_permission_id,origin`,
) ?? [];
const existingEdgeKeys = new Set(
  existingEdges.map((r) => `${r.including_permission_id}->${r.included_permission_id}`),
);

let edgeInserted = 0;
let edgeSkipped = 0;
for (const e of edges) {
  const includingId = permIdByName.get(e.including);
  const includedId = permIdByName.get(e.included);
  if (!includingId || !includedId) {
    console.log(`  ⚠ missing permission for edge ${e.including} ⊃ ${e.included}`);
    continue;
  }
  const key = `${includingId}->${includedId}`;
  if (existingEdgeKeys.has(key)) {
    edgeSkipped++;
    continue;
  }
  await pg("POST", "/permission_hierarchy", {
    including_permission_id: includingId,
    included_permission_id: includedId,
    origin: "model",
  });
  edgeInserted++;
}
console.log(`  ✨ inserted ${edgeInserted} / ♻ existing ${edgeSkipped}`);

// ============================================================
// 4. Per-module summary
// ============================================================
console.log("\n=== 4. Summary ===");
console.log();
console.log("  module                          | perms | gates | overrides | hierarchy edges");
console.log("  --------------------------------|-------|-------|-----------|----------------");
for (const d of derivations) {
  const gates = d.perms.filter((p) => p.tier === "workflow-gate").length;
  const overrides = d.perms.filter((p) => p.tier === "override").length;
  // Admin includes manage + (gates + overrides). manage includes read. → 2 + gates + overrides per module.
  const edgesForMod = 2 + gates + overrides;
  console.log(
    `  ${String(d.module.domain_module_code).padEnd(31)} | ${String(d.perms.length).padStart(5)} | ${String(gates).padStart(5)} | ${String(overrides).padStart(9)} | ${String(edgesForMod).padStart(15)}`,
  );
}

console.log("\n✓ load_ats_module_permissions.ts complete.");
console.log("Verify via:");
console.log(`  semantius call crud postgrestRequest '{"method":"GET","path":"/permissions?permission_name=like.ats-*&select=permission_name,tier,domain_module_id&order=permission_name.asc&limit=200"}'`);
console.log(`  semantius call crud postgrestRequest '{"method":"GET","path":"/permission_hierarchy?origin=eq.model&select=including_permission_id,included_permission_id&limit=200"}'`);
