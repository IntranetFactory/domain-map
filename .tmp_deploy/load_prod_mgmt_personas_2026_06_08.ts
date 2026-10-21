#!/usr/bin/env bun
// .tmp_deploy/load_prod_mgmt_personas_2026_06_08.ts
//
// Phase P for PROD-MGMT (domain 101, modules PM-DISCOVERY=130 / PM-ROADMAP-DELIVERY=131).
// Resolves the open B1A-PHASE-P item: authors the persona / RACI layer FRESH on
// domain_roles + process_raci (Plan 3 shape). Mirrors scripts/loaders/load_ats_personas_pilot.ts.
// Idempotent (read-before-create on natural keys; PATCH-on-null for process_id).
//
// Authors:
//   1. domain_roles  (4 personas, function-anchored: Product Management 25, Software Engineering 26)
//   2. role_modules  (reach across modules 130 / 131; 2-module floor satisfied for each)
//   3. data_object_lifecycle_states.process_id  (11 gates wired to 7 PCF processes; PATCH null->id only)
//   4. process_raci  (R/A/C/I across the 7 wired processes)
//
// record_status omitted on domain_roles -> DB default 'new' (Rule #1). role_modules / process_raci
// carry no record_status column.
import { pg } from "../scripts/lib/catalog";

const PRODUCT = 25; // Product Management (owner function)
const SW_ENG = 26;  // Software Engineering (contributor function)

const PM_DISCOVERY = 130;
const PM_ROADMAP = 131;

const PERSONAS: { role_code: string; role_name: string; business_function_id: number | null; description: string }[] = [
  {
    role_code: "PRODUCT-MANAGER",
    role_name: "Product Manager",
    business_function_id: PRODUCT,
    description: "Owns an assigned product area end to end: triages feedback and feature requests in discovery, prioritizes and accepts work onto the roadmap, and shepherds features, releases, and beta programs from planning through ship.",
  },
  {
    role_code: "PRODUCT-HEAD",
    role_name: "Head of Product",
    business_function_id: PRODUCT,
    description: "Accountable for the product function's output: approves the published roadmap, owns product-line strategy and lifecycle transitions, and signs off prioritization and launch decisions across the portfolio.",
  },
  {
    role_code: "PRODUCT-OPS-ANALYST",
    role_name: "Product Operations Analyst",
    business_function_id: PRODUCT,
    description: "Runs product operations: keeps roadmap and backlog hygiene, instruments and reports adoption and quality metrics, and coordinates release and beta logistics across teams.",
  },
  {
    role_code: "SW-ENG-LEAD",
    role_name: "Engineering Lead",
    business_function_id: SW_ENG,
    description: "Leads delivery of prioritized product work: takes accepted features through in-delivery and release, reports shipped and rolled-back states, and feeds feasibility input back into discovery.",
  },
];

const REACH: Record<string, [number, string][]> = {
  "PRODUCT-MANAGER": [[PM_DISCOVERY, "primary"], [PM_ROADMAP, "primary"]],
  "PRODUCT-HEAD": [[PM_DISCOVERY, "primary"], [PM_ROADMAP, "primary"]],
  "PRODUCT-OPS-ANALYST": [[PM_ROADMAP, "primary"], [PM_DISCOVERY, "secondary"]],
  "SW-ENG-LEAD": [[PM_ROADMAP, "primary"], [PM_DISCOVERY, "secondary"]],
};

// [data_object_id, state_name, process_id] : wire each gate to the PCF process it realizes.
// 534 Prioritize and select new product/service concepts (10074)
// 625 Develop and manage execution roadmap (20005)
// 539 Introduce new products/services (10077)
// 540 Retire outdated products/services (10078)
// 1262 Implement software change/release (20853)
// 1265 Verify change/release implementation success (20856)
// 538 Develop plan for new product/service development and introduction/launch (16824)
const WIRING: [number, string, number][] = [
  [406, "accepted", 534],            // feature_requests.accepted  -> prioritize/select
  [406, "rejected", 534],            // feature_requests.rejected  -> prioritize/select
  [405, "published", 625],           // product_roadmaps.published -> execution roadmap
  [403, "released", 539],            // product_features.released  -> introduce
  [402, "active", 539],              // product_lines.active       -> introduce
  [403, "deprecated", 540],          // product_features.deprecated-> retire
  [402, "sunset", 540],              // product_lines.sunset       -> retire
  [402, "retired", 540],             // product_lines.retired      -> retire
  [404, "shipped", 1262],            // product_releases.shipped   -> implement change/release
  [404, "rolled_back", 1265],        // product_releases.rolled_back -> verify implementation
  [409, "active", 538],              // beta_programs.active(launch)-> launch plan
];

// [process_id, role_code, raci, consultation_blocking]
const RACI: [number, string, string, boolean][] = [
  // 534 prioritize/select (discovery acceptance)
  [534, "PRODUCT-MANAGER", "responsible", false],
  [534, "PRODUCT-HEAD", "accountable", false],
  [534, "SW-ENG-LEAD", "consulted", false],
  [534, "PRODUCT-OPS-ANALYST", "informed", false],
  // 625 execution roadmap (roadmap published)
  [625, "PRODUCT-MANAGER", "responsible", false],
  [625, "PRODUCT-HEAD", "accountable", false],
  [625, "SW-ENG-LEAD", "consulted", false],
  [625, "PRODUCT-OPS-ANALYST", "informed", false],
  // 539 introduce (feature released / line active)
  [539, "PRODUCT-MANAGER", "responsible", false],
  [539, "PRODUCT-HEAD", "accountable", false],
  [539, "SW-ENG-LEAD", "consulted", false],
  [539, "PRODUCT-OPS-ANALYST", "informed", false],
  // 540 retire (feature deprecated / line sunset+retired)
  [540, "PRODUCT-MANAGER", "responsible", false],
  [540, "PRODUCT-HEAD", "accountable", false],
  [540, "PRODUCT-OPS-ANALYST", "informed", false],
  // 1262 implement change/release (release shipped)
  [1262, "SW-ENG-LEAD", "responsible", false],
  [1262, "PRODUCT-MANAGER", "accountable", false],
  [1262, "PRODUCT-OPS-ANALYST", "consulted", false],
  [1262, "PRODUCT-HEAD", "informed", false],
  // 1265 verify implementation (release rolled_back)
  [1265, "SW-ENG-LEAD", "responsible", false],
  [1265, "PRODUCT-MANAGER", "accountable", false],
  [1265, "PRODUCT-OPS-ANALYST", "informed", false],
  // 538 launch plan (beta active)
  [538, "PRODUCT-MANAGER", "responsible", false],
  [538, "PRODUCT-HEAD", "accountable", false],
  [538, "SW-ENG-LEAD", "consulted", false],
  [538, "PRODUCT-OPS-ANALYST", "informed", false],
];

const roleIdByCode: Record<string, number> = {};

for (const p of PERSONAS) {
  const existing = await pg("GET", `/domain_roles?role_code=eq.${p.role_code}&select=id`);
  if (existing && existing.length) {
    roleIdByCode[p.role_code] = existing[0].id as number;
    console.log(`persona exists:  ${p.role_code} (#${existing[0].id})`);
    continue;
  }
  const created = await pg("POST", "/domain_roles", p);
  roleIdByCode[p.role_code] = created[0].id as number;
  console.log(`persona created: ${p.role_code} (#${created[0].id})`);
}

let rmCreated = 0;
for (const [code, rows] of Object.entries(REACH)) {
  const rid = roleIdByCode[code];
  for (const [mid, level] of rows) {
    const ex = await pg("GET", `/role_modules?role_id=eq.${rid}&domain_module_id=eq.${mid}&select=id`);
    if (ex && ex.length) continue;
    await pg("POST", "/role_modules", { role_id: rid, domain_module_id: mid, interaction_level: level });
    rmCreated++;
  }
}
console.log(`role_modules created: ${rmCreated}`);

let wired = 0;
for (const [doid, state, pid] of WIRING) {
  // PATCH only rows where process_id is still null (fill-empty, not overwrite).
  const ex = await pg("GET", `/data_object_lifecycle_states?data_object_id=eq.${doid}&state_name=eq.${state}&select=id,process_id`);
  if (!ex || !ex.length) { console.warn(`WARN no lifecycle state ${doid}.${state}`); continue; }
  if (ex[0].process_id !== null && ex[0].process_id !== undefined) {
    console.log(`skip wired ${doid}.${state} (process_id=${ex[0].process_id})`);
    continue;
  }
  await pg("PATCH", `/data_object_lifecycle_states?id=eq.${ex[0].id}`, { process_id: pid });
  wired++;
}
console.log(`lifecycle process_id wirings applied: ${wired}`);

let raciCreated = 0;
for (const [pid, code, letter, blocking] of RACI) {
  const rid = roleIdByCode[code];
  const ex = await pg("GET", `/process_raci?process_id=eq.${pid}&actor_role_id=eq.${rid}&raci=eq.${letter}&select=id`);
  if (ex && ex.length) continue;
  await pg("POST", "/process_raci", { process_id: pid, actor_role_id: rid, raci: letter, consultation_blocking: blocking });
  raciCreated++;
}
console.log(`process_raci created: ${raciCreated}`);
console.log("done.");
