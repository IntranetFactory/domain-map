#!/usr/bin/env bun
// EHS — Phase C (business_function_domains) + Phase S (system skill, tools, domain_module_tools)
// + Phase E (domain_roles, role_modules, process_raci, lifecycle.process_id wiring).
// Idempotent. record_status omitted (DB default 'new'). No notes populated. No em-dash.

import { get, insert, syncTable, ehsCall, type Row } from "./ehs_helpers.ts";

const EHS = 174;
const MOD = { SAFETY: 352, HYGIENE: 353, ENV: 354, AUDIT: 355 };

// business functions
const BF = {
  FACILITIES: 33, // Facilities and Real Estate (owner per spine)
  HR: 3, // Human Resources
  MFG: 48, // Manufacturing Operations
  GRC: 31, // Governance, Risk and Compliance
  ESG: 36, // ESG and Sustainability
};

// PCF processes for gated transitions (real cross-industry PCF nodes)
const PCF = {
  RECORD_EHS_EVENTS: 1788, // 13.9.2.4 Record and manage EHS events
  ASSESS_HAZARDS: 205, // 6.4.2 Assess likelihood and consequences of any hazards
  MONITOR_EHS_PROGRAM: 447, // 13.9.3 Monitor and manage EHS program
  DETERMINE_IMPACTS: 445, // 13.9.1 Determine environmental health and safety impacts
  CONDUCT_AUDITS: 1784, // 13.9.1.2 Conduct health and safety and environmental audits
};

async function call(body: Row): Promise<Row[]> { return ehsCall(body); }

async function main() {
  console.log("\n=== EHS Phase C / S / E ===");

  // resolve data_object ids
  const masters = await get(`/data_objects?data_object_name=in.(safety_incidents,hazards,ehs_risk_assessments,corrective_actions,osha_300_logs,osha_301_reports,industrial_hygiene_samples,occupational_health_records,chemical_inventory,sds_records,environmental_permits,ehs_inspections,ehs_audits,contractor_safety_records,ehs_training_records)&select=id,data_object_name`);
  const doId = new Map(masters.map(r => [String(r.data_object_name), Number(r.id)]));
  const id = (n: string) => { const v = doId.get(n); if (!v) throw new Error(`missing data_object ${n}`); return v; };

  // ============================================================
  // PHASE C — business_function_domains
  // ============================================================
  console.log("\n--- business_function_domains ---");
  const bfd: Array<{ fn: number; resp: "owner" | "contributor" | "consumer" }> = [
    { fn: BF.FACILITIES, resp: "owner" },
    { fn: BF.HR, resp: "contributor" },
    { fn: BF.MFG, resp: "contributor" },
    { fn: BF.GRC, resp: "contributor" },
    { fn: BF.ESG, resp: "consumer" },
  ];
  const existBFD = await get(`/business_function_domains?domain_id=eq.${EHS}&select=business_function_id`);
  const haveBFD = new Set(existBFD.map(r => Number(r.business_function_id)));
  const bfdRows: Row[] = [];
  for (const b of bfd) {
    if (!haveBFD.has(b.fn)) bfdRows.push({ business_function_id: b.fn, domain_id: EHS, responsibility_type: b.resp, notes: "" });
  }
  if (bfdRows.length) await insert("/business_function_domains", bfdRows);
  console.log(`  inserted ${bfdRows.length} business_function_domains`);

  // ============================================================
  // PHASE S — system skill + tools + domain_module_tools
  // ============================================================
  // --- skill (one domain-grain system skill) ---
  console.log("\n--- skills ---");
  const existSkill = await get(`/skills?domain_id=eq.${EHS}&skill_type=eq.system&select=id,skill_name,domain_module_id`);
  let skillId: number;
  if (existSkill.length === 0) {
    const ins = await insert("/skills", [{
      skill_name: "ehs-system",
      skill_type: "system",
      domain_id: EHS,
      description: "Agent surface for the Environmental, Health and Safety domain. Reasons across safety incidents, hazards, occupational risk assessments, corrective actions, inspections, audits, industrial-hygiene exposures, occupational health, chemicals and safety data sheets, environmental permits, emissions, training, and contractor safety. Derives its toolset from the domain's modules and notifies people and teams on incidents, over-limit exposures, expiring permits, and overdue actions.",
    }]);
    skillId = Number(ins[0].id);
    console.log(`  inserted skill ehs-system id=${skillId}`);
  } else {
    skillId = Number(existSkill[0].id);
    console.log(`  ehs-system already present id=${skillId}`);
  }

  // --- tools ---
  console.log("\n--- tools ---");
  // query + mutate per master (operation_kind query/mutate require data_object_id)
  type ToolDef = { tool_name: string; operation_kind: "query" | "mutate" | "side_effect"; data_object?: string; description: string };
  const queryMutate: ToolDef[] = [];
  const masterNamesForTools = [
    "safety_incidents", "hazards", "ehs_risk_assessments", "corrective_actions",
    "industrial_hygiene_samples", "occupational_health_records", "chemical_inventory",
    "environmental_permits", "ehs_inspections", "ehs_audits",
    "contractor_safety_records", "ehs_training_records",
  ];
  for (const m of masterNamesForTools) {
    queryMutate.push({ tool_name: `query_${m}`, operation_kind: "query", data_object: m, description: `Query ${m.replace(/_/g, " ")}.` });
  }
  // mutate tools (lifecycle-bearing masters + key writes)
  const mutateMasters = ["safety_incidents", "hazards", "ehs_risk_assessments", "corrective_actions", "environmental_permits", "ehs_inspections", "ehs_audits", "industrial_hygiene_samples"];
  for (const m of mutateMasters) {
    queryMutate.push({ tool_name: `update_${m}`, operation_kind: "mutate", data_object: m, description: `Create or update ${m.replace(/_/g, " ")}, including lifecycle transitions.` });
  }

  // existing tool reuse by tool_name (catalog-wide)
  const allToolNames = [...queryMutate.map(t => t.tool_name), "notify_person", "notify_team"];
  const existTools = await get(`/tools?tool_name=in.(${allToolNames.join(",")})&select=id,tool_name`);
  const toolIdByName = new Map(existTools.map(r => [String(r.tool_name), Number(r.id)]));
  const toolRows: Row[] = [];
  for (const t of queryMutate) {
    if (toolIdByName.has(t.tool_name)) continue;
    // query/mutate tools are delivered by Semantius CRUD => coverage_tier must be 'platform' (DB check constraint)
    toolRows.push({ tool_name: t.tool_name, operation_kind: t.operation_kind, data_object_id: id(t.data_object!), description: t.description, coverage_tier: "platform" });
  }
  if (toolRows.length) await insert("/tools", toolRows);
  // re-read to map all
  const allTools = await get(`/tools?tool_name=in.(${allToolNames.join(",")})&select=id,tool_name`);
  for (const r of allTools) toolIdByName.set(String(r.tool_name), Number(r.id));
  console.log(`  inserted ${toolRows.length} tools (notify_person/notify_team reused id ${toolIdByName.get("notify_person")}/${toolIdByName.get("notify_team")})`);

  // --- domain_module_tools ---
  console.log("\n--- domain_module_tools ---");
  // map each tool to the module that owns its data_object; notify_person/team optional on safety + env
  const toolToModule: Record<string, number> = {
    query_safety_incidents: MOD.SAFETY, update_safety_incidents: MOD.SAFETY,
    query_hazards: MOD.SAFETY, update_hazards: MOD.SAFETY,
    query_ehs_risk_assessments: MOD.SAFETY, update_ehs_risk_assessments: MOD.SAFETY,
    query_corrective_actions: MOD.SAFETY, update_corrective_actions: MOD.SAFETY,
    query_industrial_hygiene_samples: MOD.HYGIENE, update_industrial_hygiene_samples: MOD.HYGIENE,
    query_occupational_health_records: MOD.HYGIENE,
    query_chemical_inventory: MOD.HYGIENE,
    query_environmental_permits: MOD.ENV, update_environmental_permits: MOD.ENV,
    query_ehs_inspections: MOD.AUDIT, update_ehs_inspections: MOD.AUDIT,
    query_ehs_audits: MOD.AUDIT, update_ehs_audits: MOD.AUDIT,
    query_contractor_safety_records: MOD.AUDIT,
    query_ehs_training_records: MOD.AUDIT,
  };
  // required vs optional: query+gate-bearing update = required; pure-read on optional masters = optional
  const requiredTools = new Set([
    "query_safety_incidents", "update_safety_incidents", "query_hazards", "update_hazards",
    "query_ehs_risk_assessments", "update_ehs_risk_assessments", "query_corrective_actions", "update_corrective_actions",
    "query_chemical_inventory", "query_environmental_permits", "update_environmental_permits",
    "query_ehs_inspections", "update_ehs_inspections", "query_ehs_audits", "update_ehs_audits",
    "query_ehs_training_records",
  ]);
  const existDMT = await get(`/domain_module_tools?domain_module_id=in.(${Object.values(MOD).join(",")})&select=domain_module_id,tool_id`);
  const haveDMT = new Set(existDMT.map(r => `${r.domain_module_id}:${r.tool_id}`));
  const dmtRows: Row[] = [];
  const addDMT = (mod: number, toolName: string, level: "required" | "optional") => {
    const tid = toolIdByName.get(toolName);
    if (!tid) { console.warn(`  ! tool ${toolName} not found`); return; }
    const k = `${mod}:${tid}`;
    if (haveDMT.has(k)) return;
    haveDMT.add(k);
    dmtRows.push({ domain_module_id: mod, tool_id: tid, requirement_level: level, notes: "" });
  };
  for (const [toolName, mod] of Object.entries(toolToModule)) {
    addDMT(mod, toolName, requiredTools.has(toolName) ? "required" : "optional");
  }
  // notify abstractions: notify_person on safety (incident/action alerts) + env (permit alerts); notify_team on safety
  addDMT(MOD.SAFETY, "notify_person", "optional");
  addDMT(MOD.SAFETY, "notify_team", "optional");
  addDMT(MOD.ENV, "notify_person", "optional");
  addDMT(MOD.HYGIENE, "notify_person", "optional");
  if (dmtRows.length) await insert("/domain_module_tools", dmtRows);
  console.log(`  inserted ${dmtRows.length} domain_module_tools`);

  // ============================================================
  // PHASE E — lifecycle.process_id wiring + domain_roles + role_modules + process_raci
  // ============================================================
  // --- wire lifecycle gated states to PCF processes ---
  console.log("\n--- lifecycle process_id wiring ---");
  const gatedWiring: Array<{ entity: string; state: string; process: number }> = [
    { entity: "safety_incidents", state: "closed", process: PCF.RECORD_EHS_EVENTS },
    { entity: "ehs_risk_assessments", state: "approved", process: PCF.ASSESS_HAZARDS },
    { entity: "corrective_actions", state: "verified", process: PCF.MONITOR_EHS_PROGRAM },
    { entity: "environmental_permits", state: "active", process: PCF.DETERMINE_IMPACTS },
    { entity: "ehs_audits", state: "closed", process: PCF.CONDUCT_AUDITS },
  ];
  let wired = 0;
  for (const g of gatedWiring) {
    const rows = await get(`/data_object_lifecycle_states?data_object_id=eq.${id(g.entity)}&state_name=eq.${g.state}&select=id,process_id`);
    if (!rows.length) { console.warn(`  ! gated state ${g.entity}.${g.state} not found`); continue; }
    if (rows[0].process_id) continue; // already wired (idempotent)
    await call({ method: "PATCH", path: `/data_object_lifecycle_states?id=eq.${rows[0].id}`, body: { process_id: g.process } });
    wired++;
  }
  console.log(`  wired ${wired} lifecycle states to PCF processes`);

  // --- domain_roles (personas) ---
  console.log("\n--- domain_roles ---");
  const roles: Array<{ role_code: string; role_name: string; description: string; business_function_id: number | null }> = [
    { role_code: "FACILITIES-EHS-SAFETY-MANAGER", role_name: "EHS Safety Manager", description: "Owns the site safety program: incident investigation, hazard and risk assessment, corrective actions, inspections, and required training. Accountable for closing incidents and verifying corrective actions.", business_function_id: BF.FACILITIES },
    { role_code: "FACILITIES-EHS-INDUSTRIAL-HYGIENIST", role_name: "Industrial Hygienist", description: "Plans and runs exposure monitoring and industrial-hygiene sampling, manages occupational-health surveillance, and governs the chemical inventory and safety data sheets.", business_function_id: BF.FACILITIES },
    { role_code: "FACILITIES-EHS-ENV-COMPLIANCE-MANAGER", role_name: "Environmental Compliance Manager", description: "Owns environmental permits, conditions, and limits, emissions and release records, and ISO 14001 conformance; accountable for permit renewals and environmental reporting.", business_function_id: BF.FACILITIES },
    { role_code: "EHS-SITE-MANAGER", role_name: "EHS Site Manager", description: "Cross-functional site leader accountable for the whole EHS program at an establishment, spanning safety, occupational health, environmental compliance, and audit readiness.", business_function_id: null },
  ];
  const roleMap = await syncTable("/domain_roles", roles, "role_code");

  // --- role_modules (>=2 reach each) ---
  console.log("\n--- role_modules ---");
  const roleReach: Record<string, Array<{ mod: number; level: "primary" | "secondary" }>> = {
    "FACILITIES-EHS-SAFETY-MANAGER": [
      { mod: MOD.SAFETY, level: "primary" }, { mod: MOD.AUDIT, level: "primary" }, { mod: MOD.HYGIENE, level: "secondary" },
    ],
    "FACILITIES-EHS-INDUSTRIAL-HYGIENIST": [
      { mod: MOD.HYGIENE, level: "primary" }, { mod: MOD.SAFETY, level: "secondary" },
    ],
    "FACILITIES-EHS-ENV-COMPLIANCE-MANAGER": [
      { mod: MOD.ENV, level: "primary" }, { mod: MOD.AUDIT, level: "secondary" },
    ],
    "EHS-SITE-MANAGER": [
      { mod: MOD.SAFETY, level: "primary" }, { mod: MOD.ENV, level: "primary" }, { mod: MOD.AUDIT, level: "primary" }, { mod: MOD.HYGIENE, level: "secondary" },
    ],
  };
  const roleIds = roles.map(r => roleMap.get(r.role_code)!);
  const existRM = await get(`/role_modules?role_id=in.(${roleIds.join(",")})&select=role_id,domain_module_id`);
  const haveRM = new Set(existRM.map(r => `${r.role_id}:${r.domain_module_id}`));
  const rmRows: Row[] = [];
  for (const [code, reach] of Object.entries(roleReach)) {
    const rid = roleMap.get(code)!;
    for (const r of reach) {
      const k = `${rid}:${r.mod}`;
      if (haveRM.has(k)) continue;
      haveRM.add(k);
      rmRows.push({ role_id: rid, domain_module_id: r.mod, interaction_level: r.level, notes: "" });
    }
  }
  if (rmRows.length) await insert("/role_modules", rmRows);
  console.log(`  inserted ${rmRows.length} role_modules`);

  // --- process_raci on the gated processes ---
  console.log("\n--- process_raci ---");
  // each gated process: 1 Responsible + 1 Accountable persona (+ optional consulted)
  const raci: Array<{ process: number; raci: "responsible" | "accountable" | "consulted" | "informed"; role: string; blocking?: boolean }> = [
    // Record and manage EHS events (incident close) — Safety Manager owns
    { process: PCF.RECORD_EHS_EVENTS, raci: "responsible", role: "FACILITIES-EHS-SAFETY-MANAGER" },
    { process: PCF.RECORD_EHS_EVENTS, raci: "accountable", role: "EHS-SITE-MANAGER" },
    // Assess hazards (risk assessment approval)
    { process: PCF.ASSESS_HAZARDS, raci: "responsible", role: "FACILITIES-EHS-SAFETY-MANAGER" },
    { process: PCF.ASSESS_HAZARDS, raci: "accountable", role: "EHS-SITE-MANAGER" },
    { process: PCF.ASSESS_HAZARDS, raci: "consulted", role: "FACILITIES-EHS-INDUSTRIAL-HYGIENIST", blocking: false },
    // Monitor and manage EHS program (corrective action verify)
    { process: PCF.MONITOR_EHS_PROGRAM, raci: "responsible", role: "FACILITIES-EHS-SAFETY-MANAGER" },
    { process: PCF.MONITOR_EHS_PROGRAM, raci: "accountable", role: "EHS-SITE-MANAGER" },
    // Determine EHS impacts (permit active)
    { process: PCF.DETERMINE_IMPACTS, raci: "responsible", role: "FACILITIES-EHS-ENV-COMPLIANCE-MANAGER" },
    { process: PCF.DETERMINE_IMPACTS, raci: "accountable", role: "EHS-SITE-MANAGER" },
    // Conduct audits (audit close)
    { process: PCF.CONDUCT_AUDITS, raci: "responsible", role: "FACILITIES-EHS-SAFETY-MANAGER" },
    { process: PCF.CONDUCT_AUDITS, raci: "accountable", role: "EHS-SITE-MANAGER" },
  ];
  const procIds = [...new Set(raci.map(r => r.process))];
  const existPR = await get(`/process_raci?process_id=in.(${procIds.join(",")})&select=process_id,raci,actor_role_id`);
  const havePR = new Set(existPR.map(r => `${r.process_id}:${r.raci}:${r.actor_role_id}`));
  const prRows: Row[] = [];
  for (const r of raci) {
    const rid = roleMap.get(r.role)!;
    const k = `${r.process}:${r.raci}:${rid}`;
    if (havePR.has(k)) continue;
    havePR.add(k);
    prRows.push({ process_id: r.process, actor_role_id: rid, raci: r.raci, consultation_blocking: r.blocking ?? false });
  }
  if (prRows.length) await insert("/process_raci", prRows);
  console.log(`  inserted ${prRows.length} process_raci`);

  // --- counts ---
  const counts = {
    business_function_domains: (await get(`/business_function_domains?domain_id=eq.${EHS}&select=business_function_id`)).length,
    skills: (await get(`/skills?domain_id=eq.${EHS}&skill_type=eq.system&select=id`)).length,
    tools_new: toolRows.length,
    domain_module_tools: (await get(`/domain_module_tools?domain_module_id=in.(${Object.values(MOD).join(",")})&select=tool_id`)).length,
    domain_roles: (await get(`/domain_roles?role_code=in.(${roles.map(r => r.role_code).join(",")})&select=id`)).length,
    role_modules: (await get(`/role_modules?role_id=in.(${roleIds.join(",")})&select=role_id`)).length,
    process_raci: (await get(`/process_raci?process_id=in.(${procIds.join(",")})&select=process_id`)).length,
  };
  console.log("\n=== Phase C/S/E counts (EHS) ===");
  console.log(counts);
  console.log("SKILL_ID=" + skillId);
  console.log("ROLE_IDS=" + JSON.stringify(Object.fromEntries(roles.map(r => [r.role_code, roleMap.get(r.role_code)]))));
}

await main();
console.log("Phase C/S/E done.");
