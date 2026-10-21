// Loads the CSA-STARTER module (Rule #19 starter kit) onto FARMER-DIRECT-SALES (domain_id=158).
// Idempotent: re-reads natural keys before every insert.
//
// Phases:
//   1. domain_modules (module_kind='starter')
//   2. domain_module_data_objects (4 embedded_master + 1 consumer)
//   3. domain_module_capabilities (4 realized capabilities)
//   4. permissions (exactly 3 baseline)
//   5. skills (1 system skill)
//   6. skill_tools (10 required tools)
//
// Pre-flight validation: validateStarterDataObjectJunction() enforces Rule #19 invariant 1.

const FDS_DOMAIN_ID = 158;
const STARTER_CODE = "CSA-STARTER";
const STARTER_NAME = "CSA Starter Kit";
const STARTER_DESCRIPTION =
  "CSA-only subscription management for farms operating a single direct-to-member channel. " +
  "Embedded shells for memberships, share packs, customers, and pickup locations support " +
  "membership lifecycle, weekly share fulfillment, pickup-site coordination, and member billing. " +
  "Upgrade by installing the matching full modules (FDS-CSA-MGMT, FDS-ONLINE-STORE, " +
  "FDS-HARVEST-PLANNING, FDS-DELIVERY-OPS, FDS-WHOLESALE, FDS-MARKET-POS) as the operation " +
  "expands into storefront, harvest forecasting, routed delivery, wholesale, or market-day channels.";

type DMDODraft = {
  data_object_id: number;
  role: "embedded_master" | "consumer";
  necessity: "required" | "optional";
};

const DMDO: DMDODraft[] = [
  { data_object_id: 514, role: "embedded_master", necessity: "required" }, // csa_memberships
  { data_object_id: 515, role: "embedded_master", necessity: "required" }, // csa_share_packs
  { data_object_id: 519, role: "embedded_master", necessity: "required" }, // pickup_locations
  { data_object_id: 97,  role: "embedded_master", necessity: "required" }, // customers (CRM-mastered)
  { data_object_id: 748, role: "consumer",        necessity: "required" }, // users (platform_builtin)
];

const CAPABILITY_IDS = [
  473, // FDS-CSA-MGMT
  474, // FDS-SHARE-CUSTOMIZATION
  482, // FDS-SUBSCRIPTION-BILLING
  484, // FDS-MEMBER-PORTAL
];

const PERMISSIONS: { permission_name: string; tier: string }[] = [
  { permission_name: "csa-starter:read",   tier: "baseline-read" },
  { permission_name: "csa-starter:manage", tier: "baseline-manage" },
  { permission_name: "csa-starter:admin",  tier: "baseline-admin" },
];

const SKILL_NAME = "csa_starter_agent";

const SKILL_TOOL_IDS: number[] = [
  461,  // query_csa_memberships
  462,  // query_csa_share_packs
  466,  // query_pickup_locations
  9,    // query_customers
  1037, // create_csa_membership
  1038, // update_csa_membership
  1039, // compose_share_pack
  1045, // create_pickup_location
  913,  // notify_person
  43,   // execute_payment
];

async function rpc(method: string, path: string, body?: unknown) {
  const payload = body === undefined ? { method, path } : { method, path, body };
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" },
  );
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) {
    throw new Error(`semantius ${method} ${path} exit ${proc.exitCode}\nstderr: ${err}\nstdout: ${out}`);
  }
  const trimmed = out.trim();
  return trimmed ? JSON.parse(trimmed) : null;
}

// Rule #19 invariant 1: starters allow only
//   embedded_master on kind='domain_owned'  OR  consumer on kind='platform_builtin'.
// Enforced platform-side for the master/derived slice; this is the loader's broader pre-flight.
async function validateStarterDataObjectJunction(rows: DMDODraft[]) {
  const ids = Array.from(new Set(rows.map((r) => r.data_object_id))).join(",");
  const dataObjects = (await rpc(
    "GET",
    `/data_objects?id=in.(${ids})&select=id,data_object_name,kind`,
  )) as Array<{ id: number; data_object_name: string; kind: string }>;
  const kindById = new Map(dataObjects.map((d) => [d.id, d.kind]));

  for (const r of rows) {
    const kind = kindById.get(r.data_object_id);
    if (!kind) throw new Error(`Pre-flight: data_object id=${r.data_object_id} not found`);

    if (r.role === "embedded_master" && kind !== "domain_owned") {
      throw new Error(
        `Rule #19 violation: embedded_master only on kind='domain_owned'. ` +
        `data_object_id=${r.data_object_id} has kind='${kind}'`,
      );
    }
    if (r.role === "consumer" && kind !== "platform_builtin") {
      throw new Error(
        `Rule #19 violation: consumer only on kind='platform_builtin'. ` +
        `data_object_id=${r.data_object_id} has kind='${kind}'`,
      );
    }
    // master / derived / contributor / consumer-on-domain-owned would be rejected
    // by the type narrowing on DMDODraft above, so no further checks needed.
  }

  // Invariant 2: canonical master exists for each embedded_master, OR data_object is platform_builtin.
  const embeddedIds = rows.filter((r) => r.role === "embedded_master").map((r) => r.data_object_id);
  if (embeddedIds.length > 0) {
    const masters = (await rpc(
      "GET",
      `/domain_module_data_objects?data_object_id=in.(${embeddedIds.join(",")})&role=eq.master&select=data_object_id,domain_module_id`,
    )) as Array<{ data_object_id: number; domain_module_id: number }>;
    const haveMaster = new Set(masters.map((m) => m.data_object_id));
    for (const id of embeddedIds) {
      if (!haveMaster.has(id)) {
        throw new Error(`Rule #19 invariant 2: no canonical master found for embedded data_object_id=${id}`);
      }
    }
  }
}

async function upsertModule(): Promise<number> {
  const existing = (await rpc(
    "GET",
    `/domain_modules?domain_module_code=eq.${STARTER_CODE}&select=id,module_kind`,
  )) as Array<{ id: number; module_kind: string }>;

  if (existing.length > 0) {
    if (existing[0].module_kind !== "starter") {
      throw new Error(`${STARTER_CODE} exists but module_kind='${existing[0].module_kind}', expected 'starter'`);
    }
    console.log(`domain_modules: ${STARTER_CODE} already present (id=${existing[0].id})`);
    return existing[0].id;
  }

  const inserted = (await rpc("POST", "/domain_modules?select=id", [{
    domain_module_code: STARTER_CODE,
    domain_module_name: STARTER_NAME,
    description: STARTER_DESCRIPTION,
    module_kind: "starter",
    domain_id: FDS_DOMAIN_ID,
  }])) as Array<{ id: number }>;
  console.log(`domain_modules: inserted ${STARTER_CODE} (id=${inserted[0].id})`);
  return inserted[0].id;
}

async function upsertDMDO(moduleId: number) {
  await validateStarterDataObjectJunction(DMDO);

  const existing = (await rpc(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&select=data_object_id,role,necessity`,
  )) as Array<{ data_object_id: number; role: string; necessity: string }>;
  const have = new Set(existing.map((r) => `${r.data_object_id}|${r.role}`));

  const toInsert = DMDO.filter((d) => !have.has(`${d.data_object_id}|${d.role}`))
    .map((d) => ({ domain_module_id: moduleId, ...d }));

  if (toInsert.length === 0) {
    console.log(`domain_module_data_objects: all ${DMDO.length} already present`);
    return;
  }
  await rpc("POST", "/domain_module_data_objects", toInsert);
  console.log(`domain_module_data_objects: inserted ${toInsert.length}, skipped ${DMDO.length - toInsert.length}`);
}

async function upsertCapabilities(moduleId: number) {
  const existing = (await rpc(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&select=capability_id`,
  )) as Array<{ capability_id: number }>;
  const have = new Set(existing.map((r) => r.capability_id));

  const toInsert = CAPABILITY_IDS.filter((cid) => !have.has(cid))
    .map((cid) => ({ domain_module_id: moduleId, capability_id: cid }));

  if (toInsert.length === 0) {
    console.log(`domain_module_capabilities: all ${CAPABILITY_IDS.length} already present`);
    return;
  }
  await rpc("POST", "/domain_module_capabilities", toInsert);
  console.log(`domain_module_capabilities: inserted ${toInsert.length}, skipped ${CAPABILITY_IDS.length - toInsert.length}`);
}

async function upsertPermissions(moduleId: number) {
  const names = PERMISSIONS.map((p) => `"${p.permission_name}"`).join(",");
  const existing = (await rpc(
    "GET",
    `/permissions?permission_name=in.(${names})&select=id,permission_name,domain_module_id`,
  )) as Array<{ id: number; permission_name: string; domain_module_id: number | null }>;

  for (const e of existing) {
    if (e.domain_module_id !== moduleId) {
      throw new Error(`permission ${e.permission_name} exists but domain_module_id=${e.domain_module_id}, expected ${moduleId}`);
    }
  }

  const haveNames = new Set(existing.map((e) => e.permission_name));
  const toInsert = PERMISSIONS.filter((p) => !haveNames.has(p.permission_name))
    .map((p) => ({
      permission_name: p.permission_name,
      description: "",
      domain_module_id: moduleId,
      tier: p.tier,
    }));

  if (toInsert.length === 0) {
    console.log(`permissions: all 3 already present`);
    return;
  }
  await rpc("POST", "/permissions", toInsert);
  console.log(`permissions: inserted ${toInsert.length}, skipped ${3 - toInsert.length}`);
}

async function upsertSkill(moduleId: number): Promise<number> {
  const existing = (await rpc(
    "GET",
    `/skills?skill_name=eq.${SKILL_NAME}&select=id,skill_type,domain_module_id`,
  )) as Array<{ id: number; skill_type: string; domain_module_id: number | null }>;

  if (existing.length > 0) {
    const e = existing[0];
    if (e.skill_type !== "system" || e.domain_module_id !== moduleId) {
      throw new Error(`skill ${SKILL_NAME} exists with wrong shape: skill_type=${e.skill_type}, domain_module_id=${e.domain_module_id}`);
    }
    console.log(`skills: ${SKILL_NAME} already present (id=${e.id})`);
    return e.id;
  }

  const inserted = (await rpc("POST", "/skills?select=id", [{
    skill_name: SKILL_NAME,
    skill_type: "system",
    domain_id: FDS_DOMAIN_ID,
    domain_module_id: moduleId,
    description: "Agent skill for the CSA Starter Kit: read and mutate CSA memberships, share packs, pickup locations, and customer-shell records; send pickup-reminder / billing notifications; charge subscription payments.",
  }])) as Array<{ id: number }>;
  console.log(`skills: inserted ${SKILL_NAME} (id=${inserted[0].id})`);
  return inserted[0].id;
}

async function upsertSkillTools(skillId: number) {
  const existing = (await rpc(
    "GET",
    `/skill_tools?skill_id=eq.${skillId}&select=tool_id`,
  )) as Array<{ tool_id: number }>;
  const have = new Set(existing.map((r) => r.tool_id));

  const toInsert = SKILL_TOOL_IDS.filter((tid) => !have.has(tid))
    .map((tid) => ({ skill_id: skillId, tool_id: tid, requirement_level: "required" }));

  if (toInsert.length === 0) {
    console.log(`skill_tools: all ${SKILL_TOOL_IDS.length} already present`);
    return;
  }
  await rpc("POST", "/skill_tools", toInsert);
  console.log(`skill_tools: inserted ${toInsert.length}, skipped ${SKILL_TOOL_IDS.length - toInsert.length}`);
}

async function main() {
  const moduleId = await upsertModule();
  await upsertDMDO(moduleId);
  await upsertCapabilities(moduleId);
  await upsertPermissions(moduleId);
  const skillId = await upsertSkill(moduleId);
  await upsertSkillTools(skillId);

  console.log(`\nDone. CSA-STARTER module_id=${moduleId}, skill_id=${skillId}.`);
  console.log("UI:");
  console.log(`  https://tests.semantius.app/domain_map/domain_modules`);
  console.log(`  https://tests.semantius.app/domain_map/domain_module_data_objects`);
  console.log(`  https://tests.semantius.app/domain_map/skills`);
  console.log(`  https://tests.semantius.app/domain_map/skill_tools`);
}

await main();
