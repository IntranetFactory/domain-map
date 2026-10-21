/**
 * Catalog expansion: org_units bare-word claim + locations data_object + ITSM hookups.
 *
 * Goal: surface the org_units / locations silos that already exist across the
 * catalog. `org_units` was already mastered by HCM with 8 HR-cluster
 * embedded_masters; this load makes the bare-word claim explicit and extends
 * the same pattern into ITSM. `locations` is a new abstract entity mastered by
 * IWMS, contributed by REAL-EST, and embedded_mastered across the operational
 * cluster.
 *
 * Run from project root: bun run .tmp_deploy/expand_orgunits_locations.ts
 */

const DOMAINS = { ITSM: 1, IWMS: 23, HCM: 54, REAL_EST: 141 };
const ITSM_MODULES = {
  INCIDENT: 38,
  REQUEST: 39,
  PROBLEM: 40,
  CHANGE: 41,
  EVENT: 42,
  KNOWLEDGE: 43,
  WORKSPACE: 44,
  SLA: 45,
};
const ORG_UNITS_ID = 34;
const USERS_ID = 748;

interface CmdResult { ok: boolean; data: any; status: number; err?: string }

async function postgrestOnce(method: string, path: string, body?: any): Promise<CmdResult> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" }
  );
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) return { ok: false, data: null, status: code, err: stderr.trim() || stdout.trim() };
  const text = stdout.trim();
  try { return { ok: true, data: text ? JSON.parse(text) : null, status: 0 }; }
  catch { return { ok: true, data: text, status: 0 }; }
}

async function postgrest(method: string, path: string, body?: any): Promise<CmdResult> {
  let r = await postgrestOnce(method, path, body);
  let attempts = 1;
  while (!r.ok && r.err && r.err.includes("required audience not found") && attempts < 5) {
    console.warn(`  JWT-audience transient (attempt ${attempts}, retrying after 4s)...`);
    await new Promise((resolve) => setTimeout(resolve, 4000));
    r = await postgrestOnce(method, path, body);
    attempts++;
  }
  return r;
}

async function get(path: string) {
  const r = await postgrest("GET", path);
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.err}`);
  return r.data;
}
async function post(path: string, body: any) {
  const r = await postgrest("POST", path, body);
  if (!r.ok) throw new Error(`POST ${path} failed: ${r.err}`);
  return r.data;
}
async function patch(path: string, body: any) {
  const r = await postgrest("PATCH", path, body);
  if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.err}`);
  return r.data;
}

// --------------------------------------------------------------------------
// Phase 1: org_units bare-word claim + missing aliases
// --------------------------------------------------------------------------

async function phase1OrgUnits() {
  console.log("\n=== Phase 1: org_units bare-word claim + aliases ===");

  const row: any[] = await get(
    `/data_objects?id=eq.${ORG_UNITS_ID}&select=id,is_canonical_bare_word`
  );
  if (!row[0].is_canonical_bare_word) {
    console.log("  PATCH org_units.is_canonical_bare_word -> true");
    await patch(`/data_objects?id=eq.${ORG_UNITS_ID}`, {
      is_canonical_bare_word: true,
      naming_authority_rationale:
        "HCM is the canonical owner of org_units catalog-wide. Every flagship HCM platform (Workday, SAP SuccessFactors, Oracle HCM, BambooHR, ADP) masters the org structure (department / division / business_unit / team) as a unified hierarchical tree. The HR cluster (PAYROLL, ATS, ONBOARDING, BEN-ADMIN, LMS, TALENT-MGMT, EMP-EXP, WFM) holds embedded_master copies for standalone deployment; the IT operational cluster (ITSM, ITAM, CMDB) holds embedded_master copies for assignment routing and chargeback. The bare-word claim arbitrates the catalog-wide reference.",
    });
  } else {
    console.log("  org_units already claimed");
  }

  const existingAliases: { alias_name: string }[] = await get(
    `/data_object_aliases?data_object_id=eq.${ORG_UNITS_ID}&select=alias_name`
  );
  const have = new Set(existingAliases.map((a) => a.alias_name.toLowerCase()));
  const desired = [
    { name: "division", type: "synonym" },
    { name: "business unit", type: "synonym" },
    { name: "team", type: "synonym" },
    { name: "organizational unit", type: "synonym" },
    { name: "Organization", type: "synonym" },
  ];
  const toInsert = desired
    .filter((a) => !have.has(a.name.toLowerCase()))
    .map((a) => ({ data_object_id: ORG_UNITS_ID, alias_name: a.name, alias_type: a.type }));
  if (toInsert.length > 0) {
    console.log(`  inserting ${toInsert.length} new aliases`);
    await post("/data_object_aliases", toInsert);
  } else {
    console.log("  aliases already complete");
  }
}

// --------------------------------------------------------------------------
// Phase 2: create locations data_object + aliases + canonical owners
// --------------------------------------------------------------------------

async function phase2Locations(): Promise<number> {
  console.log("\n=== Phase 2: create locations data_object ===");

  const existing: { id: number }[] = await get(
    `/data_objects?data_object_name=eq.locations&select=id`
  );
  let locId: number;
  if (existing.length > 0) {
    locId = existing[0].id;
    console.log(`  locations already exists (id ${locId})`);
  } else {
    console.log("  inserting locations");
    const inserted: any = await post("/data_objects", [{
      data_object_name: "locations",
      singular_label: "Location",
      plural_label: "Locations",
      kind: "domain_owned",
      is_canonical_bare_word: true,
      naming_authority_rationale:
        "IWMS is the canonical owner of the abstract locations entity (named site / office / branch / facility where business activity happens). REAL-EST contributes the property-backed location records when commercial real estate is managed; HCM holds an embedded_master copy as employee work-location; the operational cluster (ITSM, ITAM, CMDB, FSM, ATS, ONBOARDING) embedded_masters for standalone deployment. The locations layer sits above physical real-estate (property_spaces) and below operational specifics (inventory_locations, pickup_locations).",
      notes: "Logical named site/office/branch/facility. Distinct from property_spaces (REAL-EST-granular building/floor records) and inventory_locations (WMS-granular bin/zone records).",
    }]);
    const row: { id: number }[] = await get(`/data_objects?data_object_name=eq.locations&select=id`);
    locId = row[0].id;
    console.log(`  locations -> id ${locId}`);
  }

  const aliases = [
    { name: "site", type: "synonym" },
    { name: "office", type: "synonym" },
    { name: "branch", type: "synonym" },
    { name: "facility", type: "synonym" },
    { name: "workplace", type: "synonym" },
    { name: "building", type: "synonym" },
  ];
  const existingAliases: { alias_name: string }[] = await get(
    `/data_object_aliases?data_object_id=eq.${locId}&select=alias_name`
  );
  const have = new Set(existingAliases.map((a) => a.alias_name.toLowerCase()));
  const newAliases = aliases.filter((a) => !have.has(a.name.toLowerCase()))
    .map((a) => ({ data_object_id: locId, alias_name: a.name, alias_type: a.type }));
  if (newAliases.length > 0) {
    console.log(`  inserting ${newAliases.length} location aliases`);
    await post("/data_object_aliases", newAliases);
  }

  return locId;
}

async function phase3CanonicalOwners(locId: number) {
  console.log("\n=== Phase 3: canonical owners for locations ===");

  const existing: { domain_id: number }[] = await get(
    `/domain_data_objects?data_object_id=eq.${locId}&select=domain_id`
  );
  const have = new Set(existing.map((r) => r.domain_id));

  const desired = [
    {
      domain_id: DOMAINS.IWMS,
      role: "master",
      necessity: "required",
      notes: "IWMS is the canonical owner of the locations registry. Workplace and Space Management vendors (IBM Tririga, Archibus, Spacewell, FM:Systems, Eptura) master the named-site/office/branch list as the operational anchor of all workplace activity.",
    },
    {
      domain_id: DOMAINS.REAL_EST,
      role: "contributor",
      necessity: "optional",
      notes: "REAL-EST contributes the property-backed location records when commercial real estate is under active management (a real_estate_properties row promotes to a named locations entry once it becomes an operating office).",
    },
    {
      domain_id: DOMAINS.HCM,
      role: "embedded_master",
      necessity: "required",
      notes: "HCM holds an embedded_master copy of locations as employee work-location (Workday Location, SAP SuccessFactors Location, Oracle HCM Location). HCM tools deploy without IWMS routinely; reads from IWMS when present.",
    },
  ];

  const toInsert = desired.filter((d) => !have.has(d.domain_id))
    .map((d) => ({ ...d, data_object_id: locId }));
  if (toInsert.length > 0) {
    console.log(`  inserting ${toInsert.length} domain_data_objects rows`);
    await post("/domain_data_objects", toInsert);
  } else {
    console.log("  canonical owners already populated");
  }
}

// --------------------------------------------------------------------------
// Phase 4: ITSM module embedded_master rows for org_units + locations
// --------------------------------------------------------------------------

async function phase4ITSMModules(locId: number) {
  console.log("\n=== Phase 4: ITSM modules embedded_master org_units + locations ===");

  type Row = { module_id: number; module_label: string; data_object_id: number; data_object_label: string; role: string; necessity: string; notes: string };

  const rows: Row[] = [
    // org_units across operational modules
    { module_id: ITSM_MODULES.INCIDENT, module_label: "INCIDENT", data_object_id: ORG_UNITS_ID, data_object_label: "org_units", role: "embedded_master", necessity: "required",
      notes: "ITSM local-masters org_units when no HCM is deployed; reads from HCM when present. Used for assignment routing, group ownership, and impact-scope filtering on incidents." },
    { module_id: ITSM_MODULES.REQUEST, module_label: "REQUEST", data_object_id: ORG_UNITS_ID, data_object_label: "org_units", role: "embedded_master", necessity: "required",
      notes: "ITSM local-masters org_units when no HCM is deployed; reads from HCM when present. Used for requester / approver routing and departmental visibility on catalog items." },
    { module_id: ITSM_MODULES.PROBLEM, module_label: "PROBLEM", data_object_id: ORG_UNITS_ID, data_object_label: "org_units", role: "embedded_master", necessity: "required",
      notes: "ITSM local-masters org_units when no HCM is deployed; reads from HCM when present. Used for problem-ownership routing and impact-scope filtering." },
    { module_id: ITSM_MODULES.CHANGE, module_label: "CHANGE", data_object_id: ORG_UNITS_ID, data_object_label: "org_units", role: "embedded_master", necessity: "required",
      notes: "ITSM local-masters org_units when no HCM is deployed; reads from HCM when present. Used for CAB membership, change-owner routing, and impact-scope filtering." },
    { module_id: ITSM_MODULES.WORKSPACE, module_label: "WORKSPACE", data_object_id: ORG_UNITS_ID, data_object_label: "org_units", role: "embedded_master", necessity: "required",
      notes: "Agent workspace + skill-based assignment + walk-up support all depend on a departmental tree. ITSM local-masters when no HCM is deployed." },
    { module_id: ITSM_MODULES.SLA, module_label: "SLA", data_object_id: ORG_UNITS_ID, data_object_label: "org_units", role: "embedded_master", necessity: "optional",
      notes: "Used for departmental SLA breakdowns and chargeback by org unit. Optional: SLA tracking still functions on a flat customer-facing model without departments." },

    // locations across operational modules
    { module_id: ITSM_MODULES.INCIDENT, module_label: "INCIDENT", data_object_id: locId, data_object_label: "locations", role: "embedded_master", necessity: "required",
      notes: "ITSM local-masters locations when no IWMS is deployed; reads from IWMS when present. Used to anchor walk-up support, on-site dispatch, and asset-affected geographies." },
    { module_id: ITSM_MODULES.REQUEST, module_label: "REQUEST", data_object_id: locId, data_object_label: "locations", role: "embedded_master", necessity: "required",
      notes: "Catalog items routinely scope by location (equipment delivery, on-site provisioning, building access). ITSM local-masters when no IWMS is deployed." },
    { module_id: ITSM_MODULES.PROBLEM, module_label: "PROBLEM", data_object_id: locId, data_object_label: "locations", role: "embedded_master", necessity: "optional",
      notes: "Many problems are infrastructure-wide; location-scoped problems (e.g. site-specific outages) need a location reference. Optional in many deployments." },
    { module_id: ITSM_MODULES.CHANGE, module_label: "CHANGE", data_object_id: locId, data_object_label: "locations", role: "embedded_master", necessity: "required",
      notes: "Changes routinely scope by site for change-windows and on-site coordination. ITSM local-masters when no IWMS is deployed." },
    { module_id: ITSM_MODULES.WORKSPACE, module_label: "WORKSPACE", data_object_id: locId, data_object_label: "locations", role: "embedded_master", necessity: "required",
      notes: "Walk-up support is location-anchored; agent-workspace routing accounts for nearest-site dispatch. ITSM local-masters when no IWMS is deployed." },
  ];

  const moduleIds = Object.values(ITSM_MODULES).join(",");
  const existing: { domain_module_id: number; data_object_id: number }[] = await get(
    `/domain_module_data_objects?domain_module_id=in.(${moduleIds})&data_object_id=in.(${ORG_UNITS_ID},${locId})&select=domain_module_id,data_object_id`
  );
  const have = new Set(existing.map((r) => `${r.domain_module_id}:${r.data_object_id}`));

  const toInsert = rows.filter((r) => !have.has(`${r.module_id}:${r.data_object_id}`))
    .map((r) => ({
      domain_module_id: r.module_id,
      data_object_id: r.data_object_id,
      role: r.role,
      necessity: r.necessity,
      notes: r.notes,
    }));
  console.log(`  inserting ${toInsert.length} domain_module_data_objects rows`);
  if (toInsert.length > 0) await post("/domain_module_data_objects", toInsert);
}

// --------------------------------------------------------------------------
// Phase 5: relationships (parent hierarchy + users edges)
// --------------------------------------------------------------------------

async function phase5Relationships(locId: number) {
  console.log("\n=== Phase 5: relationships ===");

  const existing: any[] = await get(
    `/data_object_relationships?or=(data_object_id.in.(${ORG_UNITS_ID},${locId},${USERS_ID}),related_data_object_id.in.(${ORG_UNITS_ID},${locId}))&select=data_object_id,related_data_object_id,relationship_verb`
  );
  const have = new Set(existing.map((r) => `${r.data_object_id}:${r.related_data_object_id}:${r.relationship_verb}`));

  const desired = [
    // org_units self-hierarchy
    { data_object_id: ORG_UNITS_ID, related_data_object_id: ORG_UNITS_ID,
      relationship_verb: "rolls_up_to", inverse_verb: "parent of",
      relationship_type: "one_to_many", relationship_kind: "reference",
      is_required: false, owner_side: "source",
      notes: "Hierarchical parent-child between org_units (Team -> Department -> Division -> BU -> Company)." },
    // locations self-hierarchy
    { data_object_id: locId, related_data_object_id: locId,
      relationship_verb: "rolls_up_to", inverse_verb: "parent of",
      relationship_type: "one_to_many", relationship_kind: "reference",
      is_required: false, owner_side: "source",
      notes: "Hierarchical parent-child between locations (Office -> City -> Country -> Region)." },
    // org_units -> users (one org_unit has many member users)
    { data_object_id: ORG_UNITS_ID, related_data_object_id: USERS_ID,
      relationship_verb: "has members", inverse_verb: "belongs_to",
      relationship_type: "one_to_many", relationship_kind: "reference",
      is_required: false, owner_side: "target",
      notes: "Every user is assigned to one or more org_units (department membership). Drives assignment routing, RBAC scoping, and chargeback." },
    // locations -> users (one location houses many users)
    { data_object_id: locId, related_data_object_id: USERS_ID,
      relationship_verb: "houses", inverse_verb: "based_at",
      relationship_type: "one_to_many", relationship_kind: "reference",
      is_required: false, owner_side: "target",
      notes: "Every user has a primary work location. Drives walk-up support routing, on-site dispatch, and location-based access." },
  ];

  const toInsert = desired.filter((d) =>
    !have.has(`${d.data_object_id}:${d.related_data_object_id}:${d.relationship_verb}`)
  );
  console.log(`  inserting ${toInsert.length} data_object_relationships rows`);
  if (toInsert.length > 0) await post("/data_object_relationships", toInsert);
}

// --------------------------------------------------------------------------
// Phase 6: surface the silos signal
// --------------------------------------------------------------------------

async function phase6SilosReport(locId: number) {
  console.log("\n=== Phase 6: silos signal ===");

  for (const [name, doId] of [["org_units", ORG_UNITS_ID], ["locations", locId]] as const) {
    const rows: any[] = await get(
      `/domain_data_objects?data_object_id=eq.${doId}&select=domain_id,role,necessity,domains(domain_code)`
    );
    const modRows: any[] = await get(
      `/domain_module_data_objects?data_object_id=eq.${doId}&select=domain_module_id,role,necessity,domain_modules(domain_module_code)`
    );

    const masters = rows.filter((r) => r.role === "master").map((r) => r.domains.domain_code);
    const dEmbed = rows.filter((r) => r.role === "embedded_master").map((r) => r.domains.domain_code);
    const dContrib = rows.filter((r) => r.role === "contributor").map((r) => r.domains.domain_code);
    const dConsume = rows.filter((r) => r.role === "consumer").map((r) => r.domains.domain_code);
    const mEmbed = modRows.filter((r) => r.role === "embedded_master").map((r) => r.domain_modules.domain_module_code);

    console.log(`\n  ${name}:`);
    console.log(`    canonical master(s):       ${masters.join(", ") || "(none)"}`);
    console.log(`    domain-level embedded:      ${dEmbed.length} (${dEmbed.join(", ")})`);
    console.log(`    domain-level contributor:   ${dContrib.length} (${dContrib.join(", ") || "-"})`);
    console.log(`    domain-level consumer:      ${dConsume.length} (${dConsume.join(", ") || "-"})`);
    console.log(`    module-level embedded:      ${mEmbed.length} (${mEmbed.join(", ") || "-"})`);
    console.log(`    integration-burden silos:   ${dEmbed.length + mEmbed.length}`);
  }
}

async function main() {
  console.log("org_units / locations catalog expansion (2026-05-24)");
  console.log("======================================================");
  await phase1OrgUnits();
  const locId = await phase2Locations();
  await phase3CanonicalOwners(locId);
  await phase4ITSMModules(locId);
  await phase5Relationships(locId);
  await phase6SilosReport(locId);
  console.log("\nDone.");
}

main().catch((e) => { console.error(e); process.exit(1); });
