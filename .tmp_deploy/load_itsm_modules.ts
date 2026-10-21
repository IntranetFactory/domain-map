/**
 * ITSM full module + B-band fix loader (2026-05-24)
 *
 * Audit findings:
 *   - M1-M4 fail: ITSM has zero domain_modules rows despite 20 capabilities.
 *   - B3 fail: knowledge_articles is bare-word but is_canonical_bare_word=false.
 *   - B12 fail: service_catalog_items has no lifecycle states; service_slas has
 *     no lifecycle states and no config-shape exemption note.
 *   - Trigger events 607-612 have empty event_category.
 *   - B10b fail: every ITSM-touching cross_domain_handoffs row has NULL per-module
 *     attribution.
 *   - M5 fail: lifecycle states have NULL domain_module_id.
 *
 * This loader fixes all of the above. Idempotent; safe to re-run.
 *
 * Run from project root: bun run .tmp_deploy/load_itsm_modules.ts
 */

const ITSM_DOMAIN_ID = 1;
const KMS_DOMAIN_ID = 33;
const USERS_DATA_OBJECT_ID = 748;

const ROLE_RANK: Record<string, number> = {
  master: 0,
  embedded_master: 1,
  contributor: 2,
  consumer: 3,
  derived: 4,
};

interface CmdResult {
  ok: boolean;
  data: any;
  status: number;
  err?: string;
}

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
  if (code !== 0) {
    return { ok: false, data: null, status: code, err: stderr.trim() || stdout.trim() };
  }
  const text = stdout.trim();
  try {
    return { ok: true, data: text ? JSON.parse(text) : null, status: 0 };
  } catch {
    return { ok: true, data: text, status: 0 };
  }
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

async function get(path: string): Promise<any> {
  const r = await postgrest("GET", path);
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.err}`);
  return r.data;
}

async function post(path: string, body: any): Promise<any> {
  const r = await postgrest("POST", path, body);
  if (!r.ok) throw new Error(`POST ${path} failed: ${r.err}`);
  return r.data;
}

async function patch(path: string, body: any): Promise<any> {
  const r = await postgrest("PATCH", path, body);
  if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.err}`);
  return r.data;
}

function strongest<T extends { role: string }>(rows: T[]): T[] {
  if (rows.length === 0) return [];
  const minRank = Math.min(...rows.map((r) => ROLE_RANK[r.role] ?? 99));
  return rows.filter((r) => (ROLE_RANK[r.role] ?? 99) === minRank);
}

// ============================================================================
// Module specifications
// ============================================================================

interface ModuleSpec {
  code: string;
  name: string;
  description: string;
  capabilities: string[];
  masters: string[];
  embeddedMasters?: string[];
  contributors?: { name: string; necessity: string; notes: string }[];
  consumers: { name: string; necessity: string; notes: string }[];
  starterPosition?: number;
  starterNotes?: string;
}

const MODULES: ModuleSpec[] = [
  {
    code: "ITSM-INCIDENT-MGMT",
    name: "Incident Management",
    description: "Capture, triage, route, and resolve service-disrupting incidents. Includes major-incident command, AI-assisted classification, and skill-based assignment.",
    capabilities: ["ITSM-INCIDENT", "ITSM-MAJOR-INCIDENT", "AI-TRIAGE-CLASSIFICATION", "ITSM-ASSIGN"],
    masters: ["service_incidents"],
    contributors: [
      { name: "asset_lifecycle_events", necessity: "optional", notes: "service_incident.asset_failure events generate lifecycle entries (replacement, retirement, RMA)." },
    ],
    consumers: [
      { name: "configuration_items", necessity: "required", notes: "Incidents reference CIs for impact analysis and routing." },
      { name: "monitoring_alerts", necessity: "required", notes: "Alerts that survive filtering become incidents." },
      { name: "error_groups", necessity: "optional", notes: "Error groups can seed incidents when an occurrence threshold or release impact triggers." },
      { name: "service_level_objectives", necessity: "optional", notes: "SLO breach events surface as incidents when the burn rate exceeds error budget." },
    ],
    starterPosition: 1,
    starterNotes: "Always the first ITSM module to install: every IT-shop's first service-desk workflow.",
  },
  {
    code: "ITSM-SERVICE-REQUEST",
    name: "Service Request Fulfillment",
    description: "End-user-driven request workflow, including catalog authoring, request routing, approvals, and self-service portal.",
    capabilities: ["ITSM-REQUEST", "ITSM-CATALOG", "SELF-SERVICE-PORTAL"],
    masters: ["service_requests", "service_catalog_items"],
    consumers: [
      { name: "configuration_items", necessity: "optional", notes: "Some catalog items reference target CIs." },
    ],
    starterPosition: 2,
    starterNotes: "Pairs with incident-mgmt: gives end-users a structured request channel and reduces inbound incident noise.",
  },
  {
    code: "ITSM-PROBLEM-MGMT",
    name: "Problem Management",
    description: "Root-cause analysis, known-error tracking, and corrective action for recurring or major incidents.",
    capabilities: ["ITSM-PROBLEM"],
    masters: ["service_problems"],
    consumers: [
      { name: "configuration_items", necessity: "required", notes: "Problems reference the affected CIs and infrastructure components." },
    ],
  },
  {
    code: "ITSM-CHANGE-MGMT",
    name: "Change and Release Management",
    description: "Change request capture, CAB workflow, approval routing, release planning, and standard-change catalog.",
    capabilities: ["ITSM-CHANGE", "ITSM-RELEASE", "ITSM-STD-CHANGE", "APPROVAL-WORKFLOW"],
    masters: ["service_changes"],
    consumers: [
      { name: "configuration_items", necessity: "required", notes: "Changes target specific CIs; CMDB is required for impact assessment." },
    ],
  },
  {
    code: "ITSM-EVENT-MGMT",
    name: "Event and Alert Handling",
    description: "Reactive event filtering, deduplication, and routing into the incident workflow. Bridge between observability platforms and ITSM.",
    capabilities: ["ITSM-EVENT"],
    masters: [],
    consumers: [
      { name: "monitoring_alerts", necessity: "required", notes: "Primary input: alerts from observability platforms." },
    ],
  },
  {
    code: "ITSM-KNOWLEDGE",
    name: "Knowledge Management",
    description: "Authoring, review, publication, and consumption of knowledge articles supporting ITSM agents and self-service portals.",
    capabilities: ["KNOWLEDGE-MGMT"],
    masters: ["knowledge_articles"],
    consumers: [],
    starterPosition: 3,
    starterNotes: "Foundational for agent productivity and self-service deflection. Install alongside incident-mgmt or request-fulfillment.",
  },
  {
    code: "ITSM-AGENT-WORKSPACE",
    name: "Agent Workspace and Reporting",
    description: "Unified agent experience: workspace, walk-up support, virtual agent / conversational ITSM, and continuous-improvement reporting.",
    capabilities: ["ITSM-WORKSPACE", "ITSM-WALKUP", "ITSM-VIRTUAL-AGENT", "ITSM-REPORTING"],
    masters: [],
    consumers: [],
  },
  {
    code: "ITSM-SLA-MGMT",
    name: "SLA and Chargeback Management",
    description: "SLA / OLA definitions, breach tracking, escalation rules, service-cost tracking, and chargeback to consuming business units.",
    capabilities: ["SLA-MGMT", "ITSM-CHARGEBACK"],
    masters: ["service_slas"],
    consumers: [],
  },
];

// ============================================================================
// Phase 1: Create domain_modules
// ============================================================================

async function phase1CreateModules(): Promise<Map<string, number>> {
  console.log("\n=== Phase 1: Create domain_modules ===");
  const existing: { id: number; domain_module_code: string }[] = await get(
    `/domain_modules?domain_id=eq.${ITSM_DOMAIN_ID}&select=id,domain_module_code`
  );
  const existingMap = new Map(existing.map((m) => [m.domain_module_code, m.id]));
  console.log(`  existing ITSM modules: ${existing.length}`);

  const toInsert = MODULES.filter((m) => !existingMap.has(m.code)).map((m) => ({
    domain_id: ITSM_DOMAIN_ID,
    domain_module_code: m.code,
    domain_module_name: m.name,
    description: m.description,
  }));

  if (toInsert.length > 0) {
    console.log(`  inserting ${toInsert.length} new modules`);
    await post("/domain_modules", toInsert);
  } else {
    console.log("  nothing to insert");
  }

  const after: { id: number; domain_module_code: string }[] = await get(
    `/domain_modules?domain_id=eq.${ITSM_DOMAIN_ID}&select=id,domain_module_code`
  );
  const map = new Map(after.map((m) => [m.domain_module_code, m.id]));
  for (const m of MODULES) {
    if (!map.has(m.code)) throw new Error(`module ${m.code} missing after insert`);
    console.log(`    ${m.code} -> id ${map.get(m.code)}`);
  }
  return map;
}

// ============================================================================
// Phase 2: Link capabilities to modules
// ============================================================================

async function phase2LinkCapabilities(moduleIds: Map<string, number>): Promise<void> {
  console.log("\n=== Phase 2: domain_module_capabilities ===");
  const capRows: { id: number; capability_code: string }[] = await get(
    `/capability_domains?domain_id=eq.${ITSM_DOMAIN_ID}&select=capabilities(id,capability_code)`
  ).then((rows: any[]) => rows.map((r) => r.capabilities));
  const capMap = new Map(capRows.map((c) => [c.capability_code, c.id]));

  const existing: { domain_module_id: number; capability_id: number }[] = await get(
    `/domain_module_capabilities?domain_module_id=in.(${[...moduleIds.values()].join(",")})&select=domain_module_id,capability_id`
  );
  const existingKeys = new Set(existing.map((r) => `${r.domain_module_id}:${r.capability_id}`));

  const toInsert: any[] = [];
  for (const m of MODULES) {
    const modId = moduleIds.get(m.code)!;
    for (const capCode of m.capabilities) {
      const capId = capMap.get(capCode);
      if (!capId) {
        console.warn(`  WARN: capability ${capCode} not found for module ${m.code}`);
        continue;
      }
      const key = `${modId}:${capId}`;
      if (!existingKeys.has(key)) {
        toInsert.push({ domain_module_id: modId, capability_id: capId });
      }
    }
  }
  console.log(`  inserting ${toInsert.length} domain_module_capabilities rows`);
  if (toInsert.length > 0) await post("/domain_module_capabilities", toInsert);
}

// ============================================================================
// Phase 3: Link data objects to modules
// ============================================================================

async function phase3LinkDataObjects(moduleIds: Map<string, number>): Promise<Map<string, number>> {
  console.log("\n=== Phase 3: domain_module_data_objects ===");

  const allNeeded = new Set<string>();
  for (const m of MODULES) {
    m.masters.forEach((n) => allNeeded.add(n));
    m.embeddedMasters?.forEach((n) => allNeeded.add(n));
    m.contributors?.forEach((c) => allNeeded.add(c.name));
    m.consumers.forEach((c) => allNeeded.add(c.name));
  }
  const names = [...allNeeded];
  const namesEnc = names.map((n) => encodeURIComponent(n)).join(",");
  const dataObjects: { id: number; data_object_name: string }[] = await get(
    `/data_objects?data_object_name=in.(${namesEnc})&select=id,data_object_name`
  );
  const doMap = new Map(dataObjects.map((d) => [d.data_object_name, d.id]));
  for (const n of names) {
    if (!doMap.has(n)) throw new Error(`data_object ${n} not found in catalog`);
  }

  const existing: { domain_module_id: number; data_object_id: number; role: string }[] = await get(
    `/domain_module_data_objects?domain_module_id=in.(${[...moduleIds.values()].join(",")})&select=domain_module_id,data_object_id,role`
  );
  const existingKeys = new Set(existing.map((r) => `${r.domain_module_id}:${r.data_object_id}`));

  const toInsert: any[] = [];
  for (const m of MODULES) {
    const modId = moduleIds.get(m.code)!;
    const linksFor = (
      list: { name: string; necessity?: string; notes?: string }[] | undefined,
      role: string,
      defaultNecessity: string
    ) => {
      list?.forEach((item) => {
        const doId = doMap.get(item.name)!;
        const key = `${modId}:${doId}`;
        if (!existingKeys.has(key)) {
          toInsert.push({
            domain_module_id: modId,
            data_object_id: doId,
            role,
            necessity: item.necessity || defaultNecessity,
            notes: item.notes || "",
          });
          existingKeys.add(key);
        }
      });
    };
    m.masters.forEach((name) => {
      const doId = doMap.get(name)!;
      const key = `${modId}:${doId}`;
      if (!existingKeys.has(key)) {
        toInsert.push({
          domain_module_id: modId,
          data_object_id: doId,
          role: "master",
          necessity: "required",
          notes: "",
        });
        existingKeys.add(key);
      }
    });
    linksFor(m.embeddedMasters?.map((n) => ({ name: n })), "embedded_master", "required");
    linksFor(m.contributors, "contributor", "required");
    linksFor(m.consumers, "consumer", "required");
  }
  console.log(`  inserting ${toInsert.length} domain_module_data_objects rows`);
  if (toInsert.length > 0) await post("/domain_module_data_objects", toInsert);

  return doMap;
}

// ============================================================================
// Phase 4: Starter modules
// ============================================================================

async function phase4StarterModules(moduleIds: Map<string, number>): Promise<void> {
  console.log("\n=== Phase 4: domain_starter_modules ===");
  const existing: { domain_module_id: number }[] = await get(
    `/domain_starter_modules?domain_id=eq.${ITSM_DOMAIN_ID}&select=domain_module_id`
  );
  const existingSet = new Set(existing.map((r) => r.domain_module_id));

  const toInsert: any[] = [];
  for (const m of MODULES) {
    if (m.starterPosition === undefined) continue;
    const modId = moduleIds.get(m.code)!;
    if (existingSet.has(modId)) continue;
    toInsert.push({
      domain_id: ITSM_DOMAIN_ID,
      domain_module_id: modId,
      position: m.starterPosition,
      notes: m.starterNotes || "",
    });
  }
  console.log(`  inserting ${toInsert.length} domain_starter_modules rows`);
  if (toInsert.length > 0) await post("/domain_starter_modules", toInsert);
}

// ============================================================================
// Phase 5: B3 fix - claim knowledge_articles bare-word
// ============================================================================

async function phase5BareWordClaim(): Promise<void> {
  console.log("\n=== Phase 5: knowledge_articles bare-word claim ===");
  const rows: { id: number; is_canonical_bare_word: boolean }[] = await get(
    `/data_objects?data_object_name=eq.knowledge_articles&select=id,is_canonical_bare_word`
  );
  if (rows.length === 0) {
    console.warn("  knowledge_articles not found");
    return;
  }
  if (rows[0].is_canonical_bare_word) {
    console.log("  already claimed");
    return;
  }
  await patch(`/data_objects?id=eq.${rows[0].id}`, {
    is_canonical_bare_word: true,
    naming_authority_rationale:
      "ITSM is the canonical owner of the knowledge_articles entity catalog-wide. Every flagship ITSM vendor (ServiceNow, Jira Service Management, Freshservice, BMC Helix, Ivanti) mints this name verbatim. KMS, CSM, HRSD, and LSD all consume or contribute to ITSM-mastered knowledge_articles rather than re-mastering. The bare-word claim makes the catalog-wide reference unambiguous.",
  });
  console.log("  claimed");
}

// ============================================================================
// Phase 6: B12 - service_catalog_items lifecycle + service_slas exemption
// ============================================================================

async function phase6Lifecycle(moduleIds: Map<string, number>, doMap: Map<string, number>): Promise<void> {
  console.log("\n=== Phase 6: B12 lifecycle states + exemptions ===");

  const catalogItemsId = doMap.get("service_catalog_items")!;
  const slasId = doMap.get("service_slas")!;
  const requestModId = moduleIds.get("ITSM-SERVICE-REQUEST")!;
  const slaModId = moduleIds.get("ITSM-SLA-MGMT")!;

  const existingStates: { data_object_id: number; state_name: string }[] = await get(
    `/data_object_lifecycle_states?data_object_id=in.(${catalogItemsId},${slasId})&select=data_object_id,state_name`
  );
  const have = new Set(existingStates.map((s) => `${s.data_object_id}:${s.state_name}`));

  const catalogStates = [
    { state_name: "draft", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: requestModId },
    { state_name: "published", state_order: 2, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "publish_catalog_item", domain_module_id: requestModId },
    { state_name: "retired", state_order: 3, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "retire_catalog_item", domain_module_id: requestModId },
  ];

  const newRows: any[] = [];
  for (const s of catalogStates) {
    if (!have.has(`${catalogItemsId}:${s.state_name}`)) {
      newRows.push({ data_object_id: catalogItemsId, ...s });
    }
  }
  if (newRows.length > 0) {
    console.log(`  inserting ${newRows.length} service_catalog_items lifecycle states`);
    await post("/data_object_lifecycle_states", newRows);
  } else {
    console.log("  service_catalog_items lifecycle already populated");
  }

  const slasRow: { id: number; notes: string }[] = await get(
    `/data_objects?id=eq.${slasId}&select=id,notes`
  );
  if (slasRow[0].notes === "") {
    console.log("  annotating service_slas config-shape exemption");
    await patch(`/data_objects?id=eq.${slasId}`, {
      notes: "Config-shaped master with no workflow. Authored once at SLA setup, edited inline when terms renegotiate; no per-state permissions needed. Breach signals fire on metrics, not on a state machine of the SLA record itself. Rule #12 config-shape exemption.",
    });
  } else {
    console.log("  service_slas already has notes");
  }
}

// ============================================================================
// Phase 7: Fix empty trigger_event categories
// ============================================================================

async function phase7TriggerCategories(): Promise<void> {
  console.log("\n=== Phase 7: trigger_events.event_category backfill ===");
  const empty: { id: number; event_name: string; event_category: string }[] = await get(
    `/trigger_events?data_object_id=in.(47,48,49,50,51,52,53)&event_category=eq.&select=id,event_name,event_category`
  );
  console.log(`  ${empty.length} ITSM-master trigger_events have empty category`);

  const categoryFor = (eventName: string): string => {
    if (eventName.endsWith(".warning")) return "threshold";
    if (eventName.endsWith(".breached")) return "threshold";
    return "state_change";
  };

  for (const ev of empty) {
    const cat = categoryFor(ev.event_name);
    console.log(`    ${ev.event_name} -> ${cat}`);
    await patch(`/trigger_events?id=eq.${ev.id}`, { event_category: cat });
  }
}

// ============================================================================
// Phase 8: Backfill lifecycle states' domain_module_id
// ============================================================================

async function phase8LifecycleModules(moduleIds: Map<string, number>, doMap: Map<string, number>): Promise<void> {
  console.log("\n=== Phase 8: lifecycle_states.domain_module_id backfill ===");
  const masterToModule: Record<string, string> = {
    service_incidents: "ITSM-INCIDENT-MGMT",
    service_requests: "ITSM-SERVICE-REQUEST",
    service_catalog_items: "ITSM-SERVICE-REQUEST",
    service_problems: "ITSM-PROBLEM-MGMT",
    service_changes: "ITSM-CHANGE-MGMT",
    knowledge_articles: "ITSM-KNOWLEDGE",
    service_slas: "ITSM-SLA-MGMT",
  };

  for (const [doName, modCode] of Object.entries(masterToModule)) {
    const doId = doMap.get(doName);
    const modId = moduleIds.get(modCode);
    if (!doId || !modId) continue;
    const states: { id: number; domain_module_id: number | null }[] = await get(
      `/data_object_lifecycle_states?data_object_id=eq.${doId}&domain_module_id=is.null&select=id,domain_module_id`
    );
    if (states.length === 0) {
      console.log(`  ${doName}: already attributed`);
      continue;
    }
    console.log(`  ${doName} (${states.length} states) -> ${modCode} (${modId})`);
    for (const s of states) {
      await patch(`/data_object_lifecycle_states?id=eq.${s.id}`, { domain_module_id: modId });
    }
  }
}

// ============================================================================
// Phase 9: Backfill cross_domain_handoffs per-module attribution
// ============================================================================

async function phase9HandoffModules(moduleIds: Map<string, number>): Promise<void> {
  console.log("\n=== Phase 9: cross_domain_handoffs per-module attribution ===");

  const handoffs: any[] = await get(
    `/cross_domain_handoffs?or=(source_domain_id.eq.${ITSM_DOMAIN_ID},target_domain_id.eq.${ITSM_DOMAIN_ID})&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,trigger_event_id,data_object_id,trigger_events(event_name,data_object_id)`
  );
  console.log(`  ${handoffs.length} ITSM-touching handoffs`);

  const itsmModuleIds = [...moduleIds.values()];
  const dmdoITSM: { domain_module_id: number; data_object_id: number; role: string }[] = await get(
    `/domain_module_data_objects?domain_module_id=in.(${itsmModuleIds.join(",")})&select=domain_module_id,data_object_id,role`
  );

  function resolveITSMModule(doId: number): { ok: true; id: number } | { ok: false; reason: string } {
    const rows = dmdoITSM.filter((r) => r.data_object_id === doId);
    if (rows.length === 0) return { ok: false, reason: `no ITSM module holds data_object ${doId}` };
    const winners = strongest(rows);
    if (winners.length > 1) return { ok: false, reason: `tie among ${winners.length} modules at role ${winners[0].role}` };
    return { ok: true, id: winners[0].domain_module_id };
  }

  let patched = 0;
  let skipped = 0;
  for (const h of handoffs) {
    const updates: any = {};

    if (h.source_domain_id === ITSM_DOMAIN_ID && h.source_domain_module_id === null) {
      const eventDoId = h.trigger_events?.data_object_id;
      if (eventDoId) {
        const r = resolveITSMModule(eventDoId);
        if (r.ok) updates.source_domain_module_id = r.id;
        else console.log(`    handoff ${h.id} source: ${r.reason} (event do=${eventDoId})`);
      }
    }
    if (h.target_domain_id === ITSM_DOMAIN_ID && h.target_domain_module_id === null) {
      const r = resolveITSMModule(h.data_object_id);
      if (r.ok) updates.target_domain_module_id = r.id;
      else console.log(`    handoff ${h.id} target: ${r.reason} (payload do=${h.data_object_id})`);
    }

    if (Object.keys(updates).length > 0) {
      await patch(`/cross_domain_handoffs?id=eq.${h.id}`, updates);
      patched++;
    } else {
      skipped++;
    }
  }
  console.log(`  patched ${patched}, skipped ${skipped}`);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log("ITSM full module + B-band fix loader (2026-05-24)");
  console.log("==================================================");

  const moduleIds = await phase1CreateModules();
  await phase2LinkCapabilities(moduleIds);
  const doMap = await phase3LinkDataObjects(moduleIds);
  await phase4StarterModules(moduleIds);
  await phase5BareWordClaim();
  await phase6Lifecycle(moduleIds, doMap);
  await phase7TriggerCategories();
  await phase8LifecycleModules(moduleIds, doMap);
  await phase9HandoffModules(moduleIds);

  console.log("\n=== Done ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
