#!/usr/bin/env bun
// REAL-EST (domain 141) b1a execution, 2026-06-06.
// Executes four agent-solvable pending actions against the live domain_map module:
//   B1A-S3         : 8 intra-domain master-to-master data_object_relationships (B6)
//   B1A-LIFECYCLE  : entity_type classification + lifecycle state machines on 7 masters (B12)
//   B1A-HANDOFF-FK : PATCH NULL module FKs on 8 handoffs (B10b); 870 skipped (user DMDO decision)
//   B1A-SYS-SKILLS : 4 module-level system skills + skill_tools rebind + retire legacy skill 99 (F1/F2/F3/F7)
//
// Idempotent: every write re-reads live state by natural key first and only writes the gap.
// No record_status set on any insert (DB default = new). No `notes` column written (Rule #15).

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
    const msg = stderr || stdout;
    if (/required audience not found/i.test(msg)) {
      throw new Error(`JWT-AUDIENCE-ERROR: ${msg.trim()}`);
    }
    throw new Error(`semantius call failed (exit ${exitCode}): ${msg}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

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

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

async function del(path: string): Promise<Row[]> {
  return call({ method: "DELETE", path });
}

const MASTERS = [344, 345, 346, 347, 348, 349, 350, 351];

// ============================================================
// B1A-S3 — intra-domain master-to-master relationships
// ============================================================
async function b1aS3() {
  console.log("\n=== B1A-S3: intra-domain data_object_relationships ===");
  // (source, target, verb, inverse_verb). All one_to_many / reference / owner_side=source / is_required=false.
  const edges: [number, number, string, string][] = [
    [344, 346, "has", "belongs to"],                    // properties -> floor_plans
    [346, 347, "subdivides into", "is part of"],         // floor_plans -> property_spaces
    [347, 348, "has", "records occupancy for"],          // property_spaces -> occupancy_records
    [344, 345, "is leased under", "covers"],             // properties -> property_leases
    [344, 350, "is metered by", "meters"],               // properties -> utility_meter_readings
    [344, 349, "has", "is raised against"],              // properties -> facility_work_orders
    [344, 351, "undergoes", "is performed on"],          // properties -> capital_projects
    [347, 349, "has", "is located in"],                  // property_spaces -> facility_work_orders
  ];

  const existing = await get(
    `/data_object_relationships?and=(data_object_id.in.(${MASTERS.join(",")}),related_data_object_id.in.(${MASTERS.join(",")}))&select=id,data_object_id,related_data_object_id`,
  );
  const seen = new Set(existing.map(r => `${r.data_object_id}|${r.related_data_object_id}`));

  const rows = edges
    .filter(([s, t]) => !seen.has(`${s}|${t}`))
    .map(([s, t, verb, inv]) => ({
      data_object_id: s,
      related_data_object_id: t,
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      relationship_verb: verb,
      inverse_verb: inv,
      is_required: false,
      owner_side: "source",
    }));

  if (rows.length === 0) {
    console.log(`  all ${edges.length} edges already present, nothing to insert`);
  } else {
    const created = await insert("/data_object_relationships", rows);
    console.log(`  inserted ${created.length} relationship rows (ids: ${created.map(r => r.id).join(", ")})`);
  }
}

// ============================================================
// B1A-LIFECYCLE — entity_type + lifecycle state machines
// ============================================================
type LState = {
  state_name: string;
  state_order: number;
  is_initial?: boolean;
  is_terminal?: boolean;
  requires_permission?: boolean;
  permission_verb_override?: string;
  description: string;
};

async function b1aLifecycle() {
  console.log("\n=== B1A-LIFECYCLE: entity_type + lifecycle states ===");

  // (a) classify the 7 workflow masters as operational_workflow. occupancy_records (348)
  //     is the config-shape exemption candidate per the action -> left unclassified, surfaced.
  const workflowMasters = [344, 345, 346, 347, 349, 350, 351];
  const dobs = await get(
    `/data_objects?id=in.(${workflowMasters.join(",")})&select=id,data_object_name,entity_type`,
  );
  const toClassify = dobs.filter(r => r.entity_type === "unclassified");
  for (const r of toClassify) {
    await patch(`/data_objects?id=eq.${r.id}`, { entity_type: "operational_workflow" });
  }
  console.log(
    `  entity_type -> operational_workflow on ${toClassify.length} masters (ids: ${toClassify.map(r => r.id).join(", ")}); ${dobs.length - toClassify.length} already classified`,
  );

  // (b) state machines. module-anchored per the action.
  const machines: { data_object_id: number; module: number; states: LState[] }[] = [
    {
      data_object_id: 344, // real_estate_properties, module 288
      module: 288,
      states: [
        { state_name: "in_portfolio", state_order: 10, is_initial: true, description: "Property is part of the portfolio and being prepared for use." },
        { state_name: "active", state_order: 20, description: "Property is in active use or available within the portfolio." },
        { state_name: "divested", state_order: 30, is_terminal: true, requires_permission: true, permission_verb_override: "divest_property", description: "Property has been sold or removed from the portfolio." },
      ],
    },
    {
      data_object_id: 345, // property_leases, module 288
      module: 288,
      states: [
        { state_name: "draft", state_order: 10, is_initial: true, description: "Lease terms are being negotiated and not yet binding." },
        { state_name: "active", state_order: 20, requires_permission: true, permission_verb_override: "activate_lease", description: "Lease is signed and in effect." },
        { state_name: "renewal_pending", state_order: 30, description: "Lease is approaching expiry and a renewal decision is pending." },
        { state_name: "renewed", state_order: 40, is_terminal: true, requires_permission: true, permission_verb_override: "renew_lease", description: "Lease has been renewed under new terms." },
        { state_name: "expired", state_order: 50, is_terminal: true, description: "Lease reached its end date without renewal." },
        { state_name: "terminated", state_order: 60, is_terminal: true, requires_permission: true, permission_verb_override: "terminate_lease", description: "Lease was ended before its scheduled expiry." },
      ],
    },
    {
      data_object_id: 346, // floor_plans, module 288
      module: 288,
      states: [
        { state_name: "draft", state_order: 10, is_initial: true, description: "Floor plan is being drawn and reviewed." },
        { state_name: "published", state_order: 20, requires_permission: true, permission_verb_override: "publish_floor_plan", description: "Floor plan is published as the authoritative layout." },
        { state_name: "superseded", state_order: 30, is_terminal: true, description: "Floor plan has been replaced by a newer published version." },
      ],
    },
    {
      data_object_id: 347, // property_spaces, module 289
      module: 289,
      states: [
        { state_name: "available", state_order: 10, is_initial: true, description: "Space is available for allocation." },
        { state_name: "allocated", state_order: 20, requires_permission: true, permission_verb_override: "allocate_space", description: "Space is allocated to an occupant or team." },
        { state_name: "released", state_order: 30, is_terminal: true, requires_permission: true, permission_verb_override: "release_space", description: "Space allocation has ended and the space is released." },
      ],
    },
    {
      data_object_id: 349, // facility_work_orders, module 290
      module: 290,
      states: [
        { state_name: "created", state_order: 10, is_initial: true, description: "Work order has been raised." },
        { state_name: "assigned", state_order: 20, description: "Work order is assigned to a team or technician." },
        { state_name: "dispatched", state_order: 30, requires_permission: true, permission_verb_override: "dispatch_work_order", description: "Work order has been dispatched for execution." },
        { state_name: "in_progress", state_order: 40, description: "Work is actively underway." },
        { state_name: "completed", state_order: 50, requires_permission: true, permission_verb_override: "complete_work_order", description: "Work has been completed and is awaiting closure." },
        { state_name: "closed", state_order: 60, is_terminal: true, description: "Work order is closed." },
      ],
    },
    {
      data_object_id: 350, // utility_meter_readings, module 290
      module: 290,
      states: [
        { state_name: "recorded", state_order: 10, is_initial: true, description: "Meter reading has been captured." },
        { state_name: "validated", state_order: 20, description: "Reading has passed validation checks." },
        { state_name: "published", state_order: 30, is_terminal: true, requires_permission: true, permission_verb_override: "publish_meter_reading", description: "Reading is published for downstream consumption." },
      ],
    },
    {
      data_object_id: 351, // capital_projects, module 291
      module: 291,
      states: [
        { state_name: "planning", state_order: 10, is_initial: true, description: "Project is in planning and scoping." },
        { state_name: "approved", state_order: 20, requires_permission: true, permission_verb_override: "approve_capital_project", description: "Project budget and scope have been approved." },
        { state_name: "in_progress", state_order: 30, description: "Project execution is underway." },
        { state_name: "completed", state_order: 40, is_terminal: true, requires_permission: true, permission_verb_override: "complete_capital_project", description: "Project has been completed and handed over." },
        { state_name: "cancelled", state_order: 50, is_terminal: true, description: "Project was cancelled before completion." },
      ],
    },
  ];

  const allIds = machines.map(m => m.data_object_id);
  const existing = await get(
    `/data_object_lifecycle_states?data_object_id=in.(${allIds.join(",")})&select=id,data_object_id,state_name`,
  );
  const seen = new Set(existing.map(r => `${r.data_object_id}|${r.state_name}`));

  const rows: Row[] = [];
  for (const m of machines) {
    for (const s of m.states) {
      if (seen.has(`${m.data_object_id}|${s.state_name}`)) continue;
      rows.push({
        data_object_id: m.data_object_id,
        domain_module_id: m.module,
        state_name: s.state_name,
        state_order: s.state_order,
        is_initial: s.is_initial ?? false,
        is_terminal: s.is_terminal ?? false,
        requires_permission: s.requires_permission ?? false,
        permission_verb_override: s.permission_verb_override ?? "",
        description: s.description,
      });
    }
  }

  if (rows.length === 0) {
    console.log("  all lifecycle states already present, nothing to insert");
  } else {
    const created = await insert("/data_object_lifecycle_states", rows);
    console.log(`  inserted ${created.length} lifecycle state rows across ${machines.length} masters`);
  }
  console.log("  occupancy_records (348) left entity_type=unclassified (config-shape, user decision); no lifecycle authored.");
}

// ============================================================
// B1A-HANDOFF-FK — PATCH NULL module FKs (B10b)
// ============================================================
async function b1aHandoffFk() {
  console.log("\n=== B1A-HANDOFF-FK: module FK backfill on handoffs ===");
  // outbound source_domain_module_id derivations
  const sourcePatches: [number, number][] = [
    [291, 290], [293, 290], [294, 291], [295, 289],
    [856, 288], [857, 288], [858, 288],
  ];
  // inbound target_domain_module_id derivations
  const targetPatches: [number, number][] = [
    [292, 290],
  ];

  const ids = [...sourcePatches, ...targetPatches].map(([id]) => id);
  const live = await get(
    `/handoffs?id=in.(${ids.join(",")})&select=id,source_domain_module_id,target_domain_module_id`,
  );
  const byId = new Map(live.map(r => [Number(r.id), r]));

  let patched = 0;
  for (const [id, mod] of sourcePatches) {
    const row = byId.get(id);
    if (row && row.source_domain_module_id === null) {
      await patch(`/handoffs?id=eq.${id}`, { source_domain_module_id: mod });
      console.log(`  handoff ${id}: source_domain_module_id -> ${mod}`);
      patched++;
    } else {
      console.log(`  handoff ${id}: source already set (${row?.source_domain_module_id}); skipped`);
    }
  }
  for (const [id, mod] of targetPatches) {
    const row = byId.get(id);
    if (row && row.target_domain_module_id === null) {
      await patch(`/handoffs?id=eq.${id}`, { target_domain_module_id: mod });
      console.log(`  handoff ${id}: target_domain_module_id -> ${mod}`);
      patched++;
    } else {
      console.log(`  handoff ${id}: target already set (${row?.target_domain_module_id}); skipped`);
    }
  }
  console.log(`  ${patched} handoff(s) patched. Handoff 870 SKIPPED (needs consumer DMDO design decision).`);
}

// ============================================================
// B1A-SYS-SKILLS — module system skills + skill_tools rebind + retire legacy 99
// ============================================================
async function b1aSysSkills() {
  console.log("\n=== B1A-SYS-SKILLS: module system skills + tool rebind ===");

  // Resolve notify_person (Rule #9 re-read shared tool by natural key).
  const npRows = await get("/tools?tool_name=eq.notify_person&select=id,tool_name");
  if (npRows.length === 0) throw new Error("notify_person tool not found; aborting (Rule #9).");
  const NOTIFY_PERSON = Number(npRows[0].id);
  console.log(`  notify_person tool id = ${NOTIFY_PERSON}`);

  // Tool ids resolved live by name (the 8 query tools + sign_document; send_email replaced by notify_person).
  const toolByName = new Map<string, number>();
  const toolNames = [
    "query_real_estate_properties", "query_leases", "query_floor_plans", "query_spaces",
    "query_occupancy_records", "query_facility_work_orders", "query_utility_meter_readings",
    "query_capital_projects", "sign_document",
  ];
  const toolRows = await get(`/tools?tool_name=in.(${toolNames.join(",")})&select=id,tool_name`);
  for (const r of toolRows) toolByName.set(String(r.tool_name), Number(r.id));
  const tool = (n: string): number => {
    const id = toolByName.get(n);
    if (id === undefined) throw new Error(`tool ${n} not found`);
    return id;
  };

  // 1. Author 4 module-level system skills (idempotent by skill_name).
  const skillSpecs = [
    { skill_name: "real_est_portfolio_agent", domain_module_id: 288, description: "Manages the property and lease portfolio: queries properties, leases, and floor plans, runs the lease lifecycle, and dispatches lease and property notifications." },
    { skill_name: "real_est_space_ops_agent", domain_module_id: 289, description: "Optimizes workplace space: queries spaces and occupancy records, runs the space allocation lifecycle, and notifies occupants and planners." },
    { skill_name: "real_est_facility_ops_agent", domain_module_id: 290, description: "Runs facility maintenance and utility tracking: queries work orders and meter readings, drives the work-order and reading lifecycles, and dispatches maintenance notifications." },
    { skill_name: "real_est_capital_projects_agent", domain_module_id: 291, description: "Manages capital projects: queries projects, runs the capital-project approval and delivery lifecycle, and notifies project stakeholders." },
  ];

  const existingSkills = await get(
    "/skills?skill_name=in.(real_est_portfolio_agent,real_est_space_ops_agent,real_est_facility_ops_agent,real_est_capital_projects_agent)&select=id,skill_name,domain_module_id",
  );
  const skillByName = new Map(existingSkills.map(r => [String(r.skill_name), Number(r.id)]));

  // Live constraint `domain_required_when_skill_type_is_system` still requires domain_id
  // even on the module-anchored target shape; set both (domain_id=141 REAL-EST).
  const toCreate = skillSpecs
    .filter(s => !skillByName.has(s.skill_name))
    .map(s => ({ skill_name: s.skill_name, skill_type: "system", domain_id: 141, domain_module_id: s.domain_module_id, description: s.description }));
  if (toCreate.length > 0) {
    const created = await insert("/skills", toCreate);
    for (const r of created) skillByName.set(String(r.skill_name), Number(r.id));
    console.log(`  created ${created.length} system skills`);
  } else {
    console.log("  all 4 system skills already present");
  }
  const skillId = (n: string): number => {
    const id = skillByName.get(n);
    if (id === undefined) throw new Error(`skill ${n} not resolved`);
    return id;
  };

  // 2. skill_tools rebind: distribute the legacy 10 tools across the 4 module skills.
  //    send_email -> notify_person (F7). All required.
  const links: { skill: string; tools: number[] }[] = [
    {
      skill: "real_est_portfolio_agent", // 288: properties, leases, floor_plans
      tools: [
        tool("query_real_estate_properties"),
        tool("query_leases"),
        tool("query_floor_plans"),
        tool("sign_document"),
        NOTIFY_PERSON,
      ],
    },
    {
      skill: "real_est_space_ops_agent", // 289: spaces, occupancy
      tools: [
        tool("query_spaces"),
        tool("query_occupancy_records"),
        NOTIFY_PERSON,
      ],
    },
    {
      skill: "real_est_facility_ops_agent", // 290: work orders, meter readings
      tools: [
        tool("query_facility_work_orders"),
        tool("query_utility_meter_readings"),
        NOTIFY_PERSON,
      ],
    },
    {
      skill: "real_est_capital_projects_agent", // 291: capital projects
      tools: [
        tool("query_capital_projects"),
        NOTIFY_PERSON,
      ],
    },
  ];

  const newSkillIds = skillSpecs.map(s => skillId(s.skill_name));
  const existingST = await get(
    `/skill_tools?skill_id=in.(${newSkillIds.join(",")})&select=id,skill_id,tool_id`,
  );
  const stSeen = new Set(existingST.map(r => `${r.skill_id}|${r.tool_id}`));

  const stRows: Row[] = [];
  for (const l of links) {
    const sid = skillId(l.skill);
    for (const tid of l.tools) {
      if (stSeen.has(`${sid}|${tid}`)) continue;
      stRows.push({ skill_id: sid, tool_id: tid, requirement_level: "required" });
    }
  }
  if (stRows.length > 0) {
    const created = await insert("/skill_tools", stRows);
    console.log(`  inserted ${created.length} skill_tools rows across the 4 module skills`);
  } else {
    console.log("  all skill_tools links already present");
  }

  // 3. Retire legacy domain-level system skill 99 (F1). Its 10 skill_tools cascade-delete.
  const legacy = await get("/skills?id=eq.99&select=id,skill_name,domain_id,domain_module_id");
  if (legacy.length > 0) {
    await del("/skill_tools?skill_id=eq.99"); // explicit, in case cascade is restrict
    await del("/skills?id=eq.99");
    console.log("  DELETED legacy skill 99 (real-est-system) and its skill_tools.");
  } else {
    console.log("  legacy skill 99 already retired.");
  }
}

// ============================================================
async function main() {
  const who = await call({ method: "GET", path: "/domains?id=eq.141&select=id,domain_code,domain_name" });
  console.log(`Target domain: ${JSON.stringify(who)}`);
  await b1aS3();
  await b1aLifecycle();
  await b1aHandoffFk();
  await b1aSysSkills();
  console.log("\n=== DONE ===");
}

main().catch(e => {
  console.error("LOADER FAILED:", e.message);
  process.exit(1);
});
