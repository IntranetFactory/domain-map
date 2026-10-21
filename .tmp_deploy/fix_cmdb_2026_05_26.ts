// Comprehensive CMDB audit fix loader (2026-05-26).
// Phases: A2+M1 capabilities/modules, B12 lifecycle+exemptions, B9 trigger cleanup,
// F1+F2 retire legacy skill / build per-module system skills, B10b handoff backfill,
// E1-E6 roles + permissions bundle.
//
// Idempotent: each step reads by natural key and skips when present.

const PROJECT_ROOT = "c:\\dev\\domain-map";

type Json = unknown;

async function pg(method: string, path: string, body?: Json): Promise<any> {
  const args = ["call", "crud", "postgrestRequest"];
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", ...args, JSON.stringify(payload)], {
    cwd: PROJECT_ROOT,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  await proc.exited;
  if (proc.exitCode !== 0) {
    throw new Error(`semantius ${method} ${path} failed: ${stderr || stdout}`);
  }
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

async function get(path: string) {
  return await pg("GET", path);
}

async function post(path: string, body: Json) {
  return await pg("POST", path, body);
}

async function patch(path: string, body: Json) {
  return await pg("PATCH", path, body);
}

async function del(path: string) {
  return await pg("DELETE", path);
}

// Domain + master ids resolved upfront via natural keys.
const CMDB_DOMAIN_ID = 4;
const IT_INFRA_FN_ID = 58;

const MASTERS = {
  configuration_items: 76,
  ci_relationships: 77,
  ci_classes: 78,
  service_maps: 79,
  ci_baselines: 80,
};

const NEIGHBORS = {
  service_incidents: 47,
  service_changes: 50,
  hardware_assets: 56,
  org_units: 34,
  locations: 795,
};

// Target modules for handoff backfill (resolved by natural key in run()).
const ITSM_INCIDENT_MGMT_MODULE_ID = 38;
const ITSM_CHANGE_MGMT_MODULE_ID = 41;
const DISCOVERY_DOMAIN_ID = 5;

async function ensureRow<T extends Record<string, any>>(
  table: string,
  naturalKeyField: keyof T,
  naturalKey: string,
  selectCols: string,
  row: T,
): Promise<{ id: number; created: boolean }> {
  const existing = await get(
    `/${table}?${String(naturalKeyField)}=eq.${encodeURIComponent(naturalKey)}&select=id`,
  );
  if (Array.isArray(existing) && existing.length > 0) {
    return { id: existing[0].id, created: false };
  }
  const inserted = await post(`/${table}?select=${selectCols}`, [row]);
  if (!Array.isArray(inserted) || inserted.length === 0) {
    throw new Error(`Insert into ${table} returned no row: ${JSON.stringify(inserted)}`);
  }
  return { id: inserted[0].id, created: true };
}

async function ensureJunction(
  table: string,
  filterExpr: string,
  row: Record<string, unknown>,
): Promise<{ created: boolean }> {
  const existing = await get(`/${table}?${filterExpr}&select=id`);
  if (Array.isArray(existing) && existing.length > 0) {
    return { created: false };
  }
  await post(`/${table}`, [row]);
  return { created: true };
}

const log = (s: string) => console.log(s);
const summary: string[] = [];

async function run() {
  log("=== Phase 1: A2 + M1 — capabilities, modules, module-capabilities, starter-modules, domain_module_data_objects ===");

  // Capabilities (all CMDB-prefixed; none cleanly span 3+ domains as marketed cross-cutting).
  const capDefs = [
    { code: "CMDB-DISCOVERY-INVENTORY", name: "Discovery and CI Inventory", desc: "Automated discovery of infrastructure CIs (servers, network gear, virtual machines, cloud resources) via probes, agents, and cloud APIs; ingestion into the CMDB with reconciliation against existing records." },
    { code: "CMDB-CI-MODELING", name: "CI Modeling", desc: "Authoring and maintenance of the CI class hierarchy, attribute definitions, and validation rules that define the shape of every CI record." },
    { code: "CMDB-REL-MAPPING", name: "Relationship and Topology Mapping", desc: "Modeling dependencies, containment, and runtime relationships between CIs to enable impact analysis and root-cause traversal." },
    { code: "CMDB-SVC-MAPPING", name: "Service Mapping", desc: "Mapping business services to their underlying infrastructure CIs, producing dynamic application service maps used by ITSM impact analysis and AIOPS correlation." },
    { code: "CMDB-BASELINE-DRIFT", name: "Baseline and Drift Detection", desc: "Capturing pre-change CI baselines, comparing live configuration against captured snapshots, and flagging unauthorized deviations as drift events." },
    { code: "CMDB-GOVERNANCE", name: "CMDB Governance and Data Quality", desc: "Stewardship workflows, data-quality KPIs, audit trails, and ownership assignment for every CI class so that the CMDB stays trustworthy as the system of record." },
    { code: "CMDB-RECONCILIATION", name: "Multi-Source Reconciliation", desc: "Merging CI records from multiple discovery feeds (Discovery, RMM, NPMD, DCIM, cloud APIs) into a single authoritative record without duplicates or conflicts." },
  ];

  const capIds: Record<string, number> = {};
  for (const c of capDefs) {
    const r = await ensureRow(
      "capabilities",
      "capability_code",
      c.code,
      "id",
      { capability_code: c.code, capability_name: c.name, description: c.desc },
    );
    capIds[c.code] = r.id;
    if (r.created) summary.push(`+ capability ${c.code} (#${r.id})`);
  }

  for (const c of capDefs) {
    const res = await ensureJunction(
      "capability_domains",
      `capability_id=eq.${capIds[c.code]}&domain_id=eq.${CMDB_DOMAIN_ID}`,
      { capability_id: capIds[c.code], domain_id: CMDB_DOMAIN_ID, notes: "" },
    );
    if (res.created) summary.push(`+ capability_domains ${c.code} -> CMDB`);
  }

  // Modules.
  const moduleDefs = [
    {
      code: "CMDB-CORE",
      name: "CMDB Core Repository",
      desc: "The authoritative configuration item record, its class definitions, and the relationships between CIs. Houses discovery ingestion, reconciliation, stewardship, and the canonical CI lifecycle.",
    },
    {
      code: "CMDB-SERVICE-MAPPING",
      name: "Service Mapping",
      desc: "Business-service-to-CI topology projection. Maps applications and business services onto the underlying CI graph so ITSM impact analysis and AIOPS correlation have a runtime-accurate model.",
    },
    {
      code: "CMDB-BASELINES-DRIFT",
      name: "Baselines and Drift Detection",
      desc: "Captures pre-change CI baseline snapshots and continuously compares live state against them, raising drift events for change-management investigation.",
    },
  ];

  const modIds: Record<string, number> = {};
  for (const m of moduleDefs) {
    const r = await ensureRow(
      "domain_modules",
      "domain_module_code",
      m.code,
      "id",
      {
        domain_module_code: m.code,
        domain_module_name: m.name,
        domain_id: CMDB_DOMAIN_ID,
        description: m.desc,
      },
    );
    modIds[m.code] = r.id;
    if (r.created) summary.push(`+ domain_modules ${m.code} (#${r.id})`);
  }

  // Module -> capability realization.
  const modCap: [string, string][] = [
    ["CMDB-CORE", "CMDB-DISCOVERY-INVENTORY"],
    ["CMDB-CORE", "CMDB-CI-MODELING"],
    ["CMDB-CORE", "CMDB-REL-MAPPING"],
    ["CMDB-CORE", "CMDB-GOVERNANCE"],
    ["CMDB-CORE", "CMDB-RECONCILIATION"],
    ["CMDB-SERVICE-MAPPING", "CMDB-SVC-MAPPING"],
    ["CMDB-BASELINES-DRIFT", "CMDB-BASELINE-DRIFT"],
  ];
  for (const [mc, cc] of modCap) {
    const res = await ensureJunction(
      "domain_module_capabilities",
      `domain_module_id=eq.${modIds[mc]}&capability_id=eq.${capIds[cc]}`,
      { domain_module_id: modIds[mc], capability_id: capIds[cc], notes: "" },
    );
    if (res.created) summary.push(`+ domain_module_capabilities ${mc} <- ${cc}`);
  }

  // Starter modules: ordered onboarding path.
  const starter: { mc: string; pos: number; note: string }[] = [
    { mc: "CMDB-CORE", pos: 10, note: "Start here. CMDB-CORE is the authoritative CI store: discover, model, and reconcile your infrastructure CIs before layering anything else on top." },
    { mc: "CMDB-SERVICE-MAPPING", pos: 20, note: "Add second once CMDB-CORE has trustworthy data. Service mapping projects business services over the CI graph and feeds ITSM impact analysis and AIOPS correlation." },
    { mc: "CMDB-BASELINES-DRIFT", pos: 30, note: "Add once change management is mature enough to act on drift signals. Baselines + drift detection require a stable change process so detected deviations have somewhere to land." },
  ];
  for (const s of starter) {
    const res = await ensureJunction(
      "domain_starter_modules",
      `domain_id=eq.${CMDB_DOMAIN_ID}&domain_module_id=eq.${modIds[s.mc]}`,
      {
        domain_id: CMDB_DOMAIN_ID,
        domain_module_id: modIds[s.mc],
        position: s.pos,
        notes: s.note,
      },
    );
    if (res.created) summary.push(`+ domain_starter_modules pos ${s.pos} ${s.mc}`);
  }

  // domain_module_data_objects. Empty notes by default (Rule #15).
  // Embedded masters of infrastructure (org_units, locations) are optional per Rule #16.
  type DmdoRow = { dm: string; do_id: number; role: string; necessity: "required" | "optional" };
  const dmdo: DmdoRow[] = [
    { dm: "CMDB-CORE", do_id: MASTERS.configuration_items, role: "master", necessity: "required" },
    { dm: "CMDB-CORE", do_id: MASTERS.ci_relationships, role: "master", necessity: "required" },
    { dm: "CMDB-CORE", do_id: MASTERS.ci_classes, role: "master", necessity: "required" },
    { dm: "CMDB-CORE", do_id: NEIGHBORS.service_changes, role: "contributor", necessity: "required" },
    { dm: "CMDB-CORE", do_id: NEIGHBORS.hardware_assets, role: "contributor", necessity: "required" },
    { dm: "CMDB-CORE", do_id: NEIGHBORS.org_units, role: "embedded_master", necessity: "optional" },
    { dm: "CMDB-CORE", do_id: NEIGHBORS.locations, role: "embedded_master", necessity: "optional" },
    { dm: "CMDB-SERVICE-MAPPING", do_id: MASTERS.service_maps, role: "master", necessity: "required" },
    { dm: "CMDB-SERVICE-MAPPING", do_id: MASTERS.configuration_items, role: "consumer", necessity: "required" },
    { dm: "CMDB-SERVICE-MAPPING", do_id: MASTERS.ci_relationships, role: "consumer", necessity: "required" },
    { dm: "CMDB-BASELINES-DRIFT", do_id: MASTERS.ci_baselines, role: "master", necessity: "required" },
    { dm: "CMDB-BASELINES-DRIFT", do_id: MASTERS.configuration_items, role: "consumer", necessity: "required" },
  ];
  for (const r of dmdo) {
    const res = await ensureJunction(
      "domain_module_data_objects",
      `domain_module_id=eq.${modIds[r.dm]}&data_object_id=eq.${r.do_id}`,
      {
        domain_module_id: modIds[r.dm],
        data_object_id: r.do_id,
        role: r.role,
        necessity: r.necessity,
        notes: "",
      },
    );
    if (res.created) summary.push(`+ domain_module_data_objects ${r.dm} -> ${r.do_id} (${r.role}/${r.necessity})`);
  }

  log("=== Phase 2: B12 — lifecycle states + config-shape exemption notes ===");

  // configuration_items: keep 5 states; flip workflow gates to requires_permission=true
  // on registered, retired, archived; attribute to CMDB-CORE module.
  const ciStates = await get(`/data_object_lifecycle_states?data_object_id=eq.${MASTERS.configuration_items}&select=id,state_name,requires_permission,permission_verb_override,domain_module_id`);
  const gateMap: Record<string, { rp: boolean; verb: string }> = {
    registered: { rp: true, verb: "register_ci" },
    retired: { rp: true, verb: "retire_ci" },
    archived: { rp: true, verb: "archive_ci" },
  };
  for (const s of ciStates) {
    const target = gateMap[s.state_name];
    const patches: Record<string, unknown> = {};
    if (s.domain_module_id !== modIds["CMDB-CORE"]) patches.domain_module_id = modIds["CMDB-CORE"];
    if (target && (s.requires_permission !== target.rp || s.permission_verb_override !== target.verb)) {
      patches.requires_permission = target.rp;
      patches.permission_verb_override = target.verb;
    }
    if (Object.keys(patches).length > 0) {
      await patch(`/data_object_lifecycle_states?id=eq.${s.id}`, patches);
      summary.push(`~ lifecycle state ${s.state_name} on configuration_items: ${Object.keys(patches).join(", ")}`);
    }
  }

  // Config-shape exemption notes on the other 4 masters.
  const exemptions: { id: number; note: string }[] = [
    { id: MASTERS.ci_relationships, note: "Config-shaped graph edges (CI dependencies). Discovered or hand-curated, then maintained inline. No workflow gates. No per-state permissions needed (Rule #12 config-shape exemption)." },
    { id: MASTERS.ci_classes, note: "Config-shaped CI class schema (attributes, validation rules). Authored by data stewards, edited inline. No workflow gates. No per-state permissions needed (Rule #12 config-shape exemption)." },
    { id: MASTERS.service_maps, note: "Auto-refreshed topology projection. Generated by discovery, edited by service owners. Updates emit service_map.updated but no per-state permission boundary. No workflow gates (Rule #12 config-shape exemption)." },
    { id: MASTERS.ci_baselines, note: "Immutable snapshot reference; captured once, then read-only for drift compare. No workflow gates. No per-state permissions needed (Rule #12 config-shape exemption)." },
  ];
  for (const e of exemptions) {
    const existing = await get(`/data_objects?id=eq.${e.id}&select=notes`);
    if (existing[0].notes !== e.note) {
      await patch(`/data_objects?id=eq.${e.id}`, { notes: e.note });
      summary.push(`~ data_objects.notes set on #${e.id}`);
    }
  }

  log("=== Phase 3: B9 — trigger-event cleanup and missing-subscriber handoffs ===");

  // PATCH trigger_event 30 (ci.unauthorized_change_detected): repoint from incidents (47)
  // to configuration_items (76) and rewrite the broken auto-generated description.
  const te30 = await get(`/trigger_events?id=eq.30&select=id,event_name,data_object_id,description`);
  if (te30[0].data_object_id !== MASTERS.configuration_items) {
    await patch(`/trigger_events?id=eq.30`, {
      data_object_id: MASTERS.configuration_items,
      description: "Fired when an unauthorized change to a Configuration Item is detected (live state diverges from the captured baseline or the change has no approved change_request). CMDB publishes; ITSM-INCIDENT-MGMT creates an incident for investigation.",
    });
    summary.push("~ trigger_events #30 repointed to configuration_items + description rewritten");
  }

  // DELETE handoff 52 (duplicate of 627/628; topology.published on event_correlations
  // is AIOPS's master, not CMDB's, and the same edge is already covered by
  // service_map.updated CMDB->AIOPS).
  const h52 = await get(`/handoffs?id=eq.52&select=id`);
  if (Array.isArray(h52) && h52.length > 0) {
    await del(`/handoffs?id=eq.52`);
    summary.push("- handoff #52 deleted (duplicate of 627/628)");
  }

  // Add subscribers for ci_class.published (626) and ci_baseline.captured (628).
  // 626 -> DISCOVERY (probe recalibration); 628 -> ITSM-CHANGE-MGMT (pre-change reference).
  const newHandoffs = [
    {
      trigger_event_id: 626,
      source_domain_id: CMDB_DOMAIN_ID,
      target_domain_id: DISCOVERY_DOMAIN_ID,
      data_object_id: MASTERS.ci_classes,
      integration_pattern: "api_call",
      friction_level: "low",
      notes: "CMDB CI class definition change recalibrates discovery probes so they emit the new attribute set on the next scan.",
    },
    {
      trigger_event_id: 628,
      source_domain_id: CMDB_DOMAIN_ID,
      target_domain_id: 1, // ITSM
      data_object_id: MASTERS.ci_baselines,
      integration_pattern: "api_call",
      friction_level: "low",
      notes: "Pre-change CI baseline captured; ITSM-CHANGE-MGMT holds the snapshot as the comparison reference for the linked change_request.",
    },
  ];
  for (const h of newHandoffs) {
    const res = await ensureJunction(
      "handoffs",
      `trigger_event_id=eq.${h.trigger_event_id}&source_domain_id=eq.${h.source_domain_id}&target_domain_id=eq.${h.target_domain_id}`,
      h as Record<string, unknown>,
    );
    if (res.created) summary.push(`+ handoff trigger #${h.trigger_event_id} ${h.source_domain_id}->${h.target_domain_id}`);
  }

  log("=== Phase 4: F1 + F2 — retire legacy domain-level skill, create 3 module-level system skills ===");

  // Create 3 new module-level system skills (idempotent by skill_name).
  const skillDefs = [
    {
      name: "cmdb_core_agent",
      module: "CMDB-CORE",
      desc: "System agent for the CMDB Core Repository. Queries CI, relationship, and class state; updates CIs after reconciliation; raises ITSM incidents when an unauthorized change is detected.",
      toolNames: ["query_configuration_items", "query_ci_relationships", "query_ci_classes", "update_configuration_item", "create_incident"],
    },
    {
      name: "cmdb_svc_mapping_agent",
      module: "CMDB-SERVICE-MAPPING",
      desc: "System agent for the Service Mapping module. Queries service maps and the CI graph that backs them to answer business-service impact and topology questions.",
      toolNames: ["query_service_maps", "query_configuration_items", "query_ci_relationships"],
    },
    {
      name: "cmdb_baselines_agent",
      module: "CMDB-BASELINES-DRIFT",
      desc: "System agent for the Baselines and Drift Detection module. Queries baselines and current CI state to answer drift questions; surfaces diff against captured baseline.",
      toolNames: ["query_ci_baselines", "query_configuration_items"],
    },
  ];

  const newSkillIds: Record<string, number> = {};
  for (const s of skillDefs) {
    const r = await ensureRow(
      "skills",
      "skill_name",
      s.name,
      "id",
      {
        skill_name: s.name,
        skill_type: "system",
        domain_id: CMDB_DOMAIN_ID,
        domain_module_id: modIds[s.module],
        description: s.desc,
      },
    );
    newSkillIds[s.name] = r.id;
    if (r.created) summary.push(`+ skills ${s.name} (#${r.id}) for ${s.module}`);
  }

  // Look up tool ids by name (idempotent).
  const allToolNames = Array.from(new Set(skillDefs.flatMap((s) => s.toolNames)));
  const tools = await get(`/tools?tool_name=in.(${allToolNames.map(encodeURIComponent).join(",")})&select=id,tool_name`);
  const toolIdByName: Record<string, number> = {};
  for (const t of tools) toolIdByName[t.tool_name] = t.id;
  for (const tn of allToolNames) {
    if (!toolIdByName[tn]) throw new Error(`Expected tool ${tn} not found in catalog`);
  }

  // skill_tools: link each tool to each skill (all required).
  for (const s of skillDefs) {
    for (const tn of s.toolNames) {
      const skillId = newSkillIds[s.name];
      const toolId = toolIdByName[tn];
      const res = await ensureJunction(
        "skill_tools",
        `skill_id=eq.${skillId}&tool_id=eq.${toolId}`,
        { skill_id: skillId, tool_id: toolId, requirement_level: "required", notes: "" },
      );
      if (res.created) summary.push(`+ skill_tools ${s.name} -> ${tn}`);
    }
  }

  // Retire legacy skill (cmdb-system, id=3). Skill_tools FK is `parent` so cascade applies.
  const legacy = await get(`/skills?skill_name=eq.cmdb-system&select=id`);
  if (Array.isArray(legacy) && legacy.length > 0) {
    const legacyId = legacy[0].id;
    // Delete dependent skill_tools first (safe even if cascade exists).
    await del(`/skill_tools?skill_id=eq.${legacyId}`);
    await del(`/skills?id=eq.${legacyId}`);
    summary.push(`- legacy skill cmdb-system (#${legacyId}) retired + skill_tools removed`);
  }

  log("=== Phase 5: B10b — backfill source/target module FKs on every CMDB-touching handoff ===");

  // Resolve target modules in non-CMDB domains by natural key.
  const apmCoreMod = (await get(`/domain_modules?domain_module_code=eq.APM-PORTFOLIO-REGISTRY&select=id`))[0]?.id;

  type BackfillRow = {
    id: number;
    src?: number;
    tgt?: number;
    note?: string;
  };
  const backfill: BackfillRow[] = [
    // Outbound from CMDB:
    { id: 51, src: modIds["CMDB-CORE"] /* incident.unauth_change after trigger fix */ /* target 38 already set */ },
    { id: 627, src: modIds["CMDB-SERVICE-MAPPING"], tgt: ITSM_INCIDENT_MGMT_MODULE_ID },
    { id: 628, src: modIds["CMDB-SERVICE-MAPPING"], note: "target NULL until AIOPS is modularized" },
    { id: 629, src: modIds["CMDB-BASELINES-DRIFT"], tgt: ITSM_INCIDENT_MGMT_MODULE_ID },
    // Inbound to CMDB:
    { id: 48, tgt: modIds["CMDB-CORE"], note: "source NULL until DISCOVERY is modularized" },
    { id: 49, tgt: modIds["CMDB-CORE"], note: "source NULL until DISCOVERY is modularized" },
    { id: 146, tgt: modIds["CMDB-CORE"], note: "source NULL until RMM is modularized" },
    { id: 30, src: ITSM_CHANGE_MGMT_MODULE_ID, tgt: modIds["CMDB-CORE"] },
    { id: 621, tgt: modIds["CMDB-CORE"], note: "source NULL until DISCOVERY is modularized" },
    { id: 654, tgt: modIds["CMDB-SERVICE-MAPPING"], note: "source NULL until NPMD is modularized" },
    { id: 679, tgt: modIds["CMDB-CORE"], note: "source NULL until DCIM is modularized" },
    { id: 625, tgt: modIds["CMDB-CORE"], note: "source NULL until DISCOVERY is modularized" },
    { id: 237, src: apmCoreMod, tgt: modIds["CMDB-CORE"] },
    { id: 236, src: apmCoreMod, tgt: modIds["CMDB-CORE"] },
    { id: 854, src: apmCoreMod, tgt: modIds["CMDB-CORE"] },
  ];

  for (const b of backfill) {
    const current = await get(`/handoffs?id=eq.${b.id}&select=source_domain_module_id,target_domain_module_id,notes`);
    if (!Array.isArray(current) || current.length === 0) {
      summary.push(`! handoff #${b.id} not found (skipped)`);
      continue;
    }
    const cur = current[0];
    const patches: Record<string, unknown> = {};
    if (b.src !== undefined && cur.source_domain_module_id !== b.src) patches.source_domain_module_id = b.src;
    if (b.tgt !== undefined && cur.target_domain_module_id !== b.tgt) patches.target_domain_module_id = b.tgt;
    if (b.note && cur.notes !== b.note) patches.notes = b.note;
    if (Object.keys(patches).length > 0) {
      await patch(`/handoffs?id=eq.${b.id}`, patches);
      summary.push(`~ handoff #${b.id} backfilled: ${Object.keys(patches).join(", ")}`);
    }
  }

  log("=== Phase 6: E1-E6 — permissions + roles + role_modules + role_permissions ===");

  // Create baseline-tier permissions for each module (3 modules x 3 tiers = 9 rows).
  const tiers: { suffix: string; tier: string; descPrefix: string }[] = [
    { suffix: "read", tier: "baseline-read", descPrefix: "Read-only access to" },
    { suffix: "manage", tier: "baseline-manage", descPrefix: "Standard read/write access to" },
    { suffix: "admin", tier: "baseline-admin", descPrefix: "Full administrative access to" },
  ];
  const permIdByName: Record<string, number> = {};
  for (const m of moduleDefs) {
    const moduleSlug = m.code.toLowerCase();
    for (const t of tiers) {
      const name = `${moduleSlug}:${t.suffix}`;
      const r = await ensureRow(
        "permissions",
        "permission_name",
        name,
        "id",
        {
          permission_name: name,
          description: `${t.descPrefix} ${m.name} (${m.code}).`,
          tier: t.tier,
          module_id: 1001,
          domain_module_id: modIds[m.code],
        },
      );
      permIdByName[name] = r.id;
      if (r.created) summary.push(`+ permission ${name}`);
    }
  }

  // Roles (function-scoped, IT-INFRA prefix per existing convention).
  type RoleDef = {
    code: string;
    name: string;
    slug: string;
    desc: string;
    modules: { code: string; level: "primary" | "secondary" }[];
    perms: string[];
  };
  const roleDefs: RoleDef[] = [
    {
      code: "IT-INFRA-CMDB-ADMIN",
      name: "CMDB Administrator",
      slug: "it_infra_cmdb_admin",
      desc: "Owns the CMDB end-to-end: discovery configuration, CI class authoring, service-mapping policy, baseline strategy, and stewardship workflows. Full admin on every CMDB module.",
      modules: [
        { code: "CMDB-CORE", level: "primary" },
        { code: "CMDB-SERVICE-MAPPING", level: "primary" },
        { code: "CMDB-BASELINES-DRIFT", level: "primary" },
      ],
      perms: ["cmdb-core:admin", "cmdb-service-mapping:admin", "cmdb-baselines-drift:admin"],
    },
    {
      code: "IT-INFRA-DISCOVERY-OPERATOR",
      name: "Discovery Operator",
      slug: "it_infra_discovery_operator",
      desc: "Runs discovery scans, triages reconciliation conflicts, and curates the service maps generated from discovery output. Manage on CMDB-CORE and CMDB-SERVICE-MAPPING.",
      modules: [
        { code: "CMDB-CORE", level: "primary" },
        { code: "CMDB-SERVICE-MAPPING", level: "secondary" },
      ],
      perms: ["cmdb-core:manage", "cmdb-service-mapping:manage"],
    },
    {
      code: "IT-INFRA-CMDB-DATA-STEWARD",
      name: "CMDB Data Steward",
      slug: "it_infra_cmdb_data_steward",
      desc: "Owns CI class definitions, data-quality KPIs, and baseline review for a specific CI domain (servers, network, database). Manage on CMDB-CORE; manage on baselines to capture/promote stewardship snapshots.",
      modules: [
        { code: "CMDB-CORE", level: "primary" },
        { code: "CMDB-BASELINES-DRIFT", level: "primary" },
      ],
      perms: ["cmdb-core:manage", "cmdb-baselines-drift:manage"],
    },
  ];

  const roleIdByCode: Record<string, number> = {};
  for (const r of roleDefs) {
    const result = await ensureRow(
      "roles",
      "role_code",
      r.code,
      "id",
      {
        role_code: r.code,
        role_name: r.name,
        slug: r.slug,
        description: r.desc,
        business_function_id: IT_INFRA_FN_ID,
        origin: "model",
        module_id: 1001,
      },
    );
    roleIdByCode[r.code] = result.id;
    if (result.created) summary.push(`+ role ${r.code} (#${result.id})`);
  }

  for (const r of roleDefs) {
    for (const m of r.modules) {
      const res = await ensureJunction(
        "role_modules",
        `role_id=eq.${roleIdByCode[r.code]}&domain_module_id=eq.${modIds[m.code]}`,
        {
          role_id: roleIdByCode[r.code],
          domain_module_id: modIds[m.code],
          interaction_level: m.level,
          notes: "",
        },
      );
      if (res.created) summary.push(`+ role_modules ${r.code} -> ${m.code} (${m.level})`);
    }
    for (const p of r.perms) {
      const permId = permIdByName[p];
      if (!permId) throw new Error(`Permission ${p} not found for role ${r.code}`);
      const res = await ensureJunction(
        "role_permissions",
        `role_id=eq.${roleIdByCode[r.code]}&permission_id=eq.${permId}`,
        {
          role_id: roleIdByCode[r.code],
          permission_id: permId,
          role_permission_label: `${r.code} grants ${p}`,
          notes: "",
        },
      );
      if (res.created) summary.push(`+ role_permissions ${r.code} -> ${p}`);
    }
  }

  log("\n=== SUMMARY ===");
  if (summary.length === 0) {
    log("No changes (everything already in place).");
  } else {
    for (const line of summary) log(line);
    log(`\nTotal changes: ${summary.length}`);
  }
}

run().catch((e) => {
  console.error("LOADER FAILED:", e);
  process.exit(1);
});
