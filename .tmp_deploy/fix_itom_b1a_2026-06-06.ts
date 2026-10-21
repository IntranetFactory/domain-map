// Idempotent loader for ITOM b1a execution (2026-06-06).
// Resolves three b1a items in dependency order:
//   1. B1A-CONSUMER-DMDO: 8 consumer domain_module_data_objects rows on module 267.
//   2. B1A-SYS-SKILLS: 3 per-module system skills + their tools + skill_tools; then
//      DELETE legacy skill 74 and its 6 skill_tools.
//   3. B1A-HANDOFF-FK-BACKFILL: PATCH source_/target_domain_module_id on 13 handoffs.
// B1A-ROLE-MODULES is intentionally NOT handled here (skipped: 2-module-floor + judgment).
//
// All writes omit record_status (DB default = "new"); no notes columns written.
// Run from project root:  bun run "c:/dev/domain-map/.tmp_deploy/fix_itom_b1a_2026-06-06.ts"

type Row = Record<string, unknown>;

async function call(req: { method: string; path: string; body?: unknown }): Promise<any> {
  const payload: Record<string, unknown> = { method: req.method, path: req.path };
  if (req.body !== undefined) payload.body = req.body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${proc.exitCode}) for ${req.method} ${req.path}\nstderr: ${err}\nstdout: ${out}`);
  }
  const trimmed = out.trim();
  if (trimmed === "") return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    // Some PATCH/DELETE with no Prefer:return produce empty/non-JSON bodies.
    return trimmed;
  }
}

const get = (path: string) => call({ method: "GET", path });

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map((r) => {
    const o: Row = {};
    for (const k of keys) o[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return o;
  });
}

async function insert(path: string, rows: Row[]): Promise<any[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: any[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const res = await call({ method: "POST", path, body: slice });
    if (Array.isArray(res)) out.push(...res);
  }
  return out;
}

const ITOM_DOMAIN_ID = 2;
const M_INFRA = 267; // ITOM-INFRA-MON
const M_CAP = 268;   // ITOM-CAPACITY-PLAN
const M_OPS = 269;   // ITOM-OPS-AUTOMATION

// ---------------------------------------------------------------------------
// ITEM 1 - B1A-CONSUMER-DMDO: 8 consumer rows on module 267 (ITOM-INFRA-MON).
// All 8 payloads are foreign-mastered infra/monitoring shapes ITOM reads via
// inbound handoffs (or implicitly, service_maps). necessity=optional per
// Rule #16-A: ITOM's core monitoring workflow runs without these enrichment reads.
// ---------------------------------------------------------------------------
const CONSUMER_PAYLOADS = [
  { data_object_id: 79, name: "service_maps" },
  { data_object_id: 93, name: "event_correlations" },
  { data_object_id: 96, name: "predictive_signals" },
  { data_object_id: 722, name: "alert_suppression_rules" },
  { data_object_id: 552, name: "dc_environmental_readings" },
  { data_object_id: 546, name: "dc_racks" },
  { data_object_id: 466, name: "paas_runtime_instances" },
  { data_object_id: 449, name: "cluster_node_pools" },
];

async function loadConsumerDmdo() {
  console.log("\n=== ITEM 1: B1A-CONSUMER-DMDO ===");
  const existing: any[] = await get(
    `/domain_module_data_objects?domain_module_id=eq.${M_INFRA}&select=id,data_object_id,role`,
  );
  const present = new Set(existing.map((r) => Number(r.data_object_id)));
  const toInsert: Row[] = [];
  for (const p of CONSUMER_PAYLOADS) {
    if (present.has(p.data_object_id)) {
      console.log(`  skip (exists): ${p.name} (${p.data_object_id}) already on ${M_INFRA}`);
      continue;
    }
    toInsert.push({
      domain_module_id: M_INFRA,
      data_object_id: p.data_object_id,
      role: "consumer",
      necessity: "optional",
    });
  }
  const created = await insert("/domain_module_data_objects", toInsert);
  console.log(`  inserted ${created.length} consumer DMDO rows on ${M_INFRA}.`);
  return created;
}

// ---------------------------------------------------------------------------
// ITEM 2 - B1A-SYS-SKILLS.
// Tools: dedup by tool_name against /tools (catalog-wide table). Only create
// ITOM-specific mutate tools; reuse all existing query + notify rows.
// ---------------------------------------------------------------------------

// New ITOM-specific mutate tools (none exist on masters 84/85/86/87 today).
const NEW_TOOLS: { tool_name: string; data_object_id: number | null; operation_kind: string; coverage_tier: string; description: string }[] = [
  { tool_name: "acknowledge_monitoring_alert", data_object_id: 85, operation_kind: "mutate", coverage_tier: "platform", description: "Acknowledge a monitoring alert, recording the on-call analyst taking ownership." },
  { tool_name: "resolve_monitoring_alert", data_object_id: 85, operation_kind: "mutate", coverage_tier: "platform", description: "Resolve a monitoring alert once the underlying condition has cleared." },
  { tool_name: "create_monitoring_policy", data_object_id: 86, operation_kind: "mutate", coverage_tier: "platform", description: "Author a new monitoring policy defining thresholds and detection rules." },
  { tool_name: "activate_monitoring_policy", data_object_id: 86, operation_kind: "mutate", coverage_tier: "platform", description: "Activate a reviewed monitoring policy so it governs live event and alert generation." },
  { tool_name: "create_capacity_record", data_object_id: 87, operation_kind: "mutate", coverage_tier: "platform", description: "Record a capacity datapoint for a resource for baseline and forecast analysis." },
  { tool_name: "update_capacity_record", data_object_id: 87, operation_kind: "mutate", coverage_tier: "platform", description: "Update a capacity record as baselines and forecast horizons are recomputed." },
];

// Reused existing tool ids (verified live before writing this loader):
//   541 query_events(84), 542 query_alerts(85), 543 query_monitoring_policies(86),
//   544 query_capacity_records(87), 30 create_incident(47),
//   913 notify_person, 914 notify_team.
const TOOL = {
  query_events: 541,
  query_alerts: 542,
  query_monitoring_policies: 543,
  query_capacity_records: 544,
  create_incident: 30,
  notify_person: 913,
  notify_team: 914,
} as Record<string, number>;

async function syncTools(): Promise<Record<string, number>> {
  // Re-read catalog-wide by tool_name immediately before create (shared table).
  const names = NEW_TOOLS.map((t) => t.tool_name);
  const existing: any[] = await get(
    `/tools?tool_name=in.(${names.join(",")})&select=id,tool_name`,
  );
  const map: Record<string, number> = {};
  for (const r of existing) map[String(r.tool_name)] = Number(r.id);
  const toCreate = NEW_TOOLS.filter((t) => !(t.tool_name in map));
  for (const t of toCreate) console.log(`  tool create: ${t.tool_name} -> data_object ${t.data_object_id}`);
  for (const t of NEW_TOOLS) if (t.tool_name in map) console.log(`  tool skip (exists): ${t.tool_name} (id ${map[t.tool_name]})`);
  const created = await insert(
    "/tools",
    toCreate.map(({ tool_name, data_object_id, operation_kind, coverage_tier, description }) => ({
      tool_name,
      data_object_id,
      operation_kind,
      coverage_tier,
      description,
    })),
  );
  for (const r of created) map[String(r.tool_name)] = Number(r.id);
  return { ...TOOL, ...map };
}

// Per-module skill spec: name + which tools (by name) at which requirement_level.
type ToolRef = { name: string; level: "required" | "optional" };
const SKILL_SPECS: { module_id: number; skill_name: string; description: string; tools: ToolRef[] }[] = [
  {
    module_id: M_INFRA,
    skill_name: "itom_infra_mon_agent",
    description:
      "System skill for the Infrastructure Monitoring and Event Management module. Runs monitoring-policy authoring, event and alert triage, and incident escalation over the module's master data.",
    tools: [
      { name: "query_events", level: "required" },
      { name: "query_alerts", level: "required" },
      { name: "query_monitoring_policies", level: "required" },
      { name: "create_monitoring_policy", level: "required" },
      { name: "activate_monitoring_policy", level: "required" },
      { name: "acknowledge_monitoring_alert", level: "required" },
      { name: "resolve_monitoring_alert", level: "required" },
      { name: "create_incident", level: "required" },
      { name: "notify_person", level: "required" },
      { name: "notify_team", level: "optional" },
    ],
  },
  {
    module_id: M_CAP,
    skill_name: "itom_capacity_plan_agent",
    description:
      "System skill for the Capacity Planning module. Collects capacity datapoints, maintains baselines and forecasts, and escalates threshold and forecast-exhaustion signals.",
    tools: [
      { name: "query_capacity_records", level: "required" },
      { name: "create_capacity_record", level: "required" },
      { name: "update_capacity_record", level: "required" },
      { name: "notify_person", level: "required" },
    ],
  },
  {
    module_id: M_OPS,
    skill_name: "itom_ops_automation_agent",
    description:
      "System skill for the Operations Automation and Workload Scheduling module. Reads alerts that trigger automation and drives alert resolution as runbooks and scheduled jobs complete.",
    tools: [
      { name: "query_alerts", level: "required" },
      { name: "resolve_monitoring_alert", level: "required" },
      { name: "notify_person", level: "required" },
      { name: "notify_team", level: "optional" },
    ],
  },
];

async function loadSystemSkills(toolMap: Record<string, number>) {
  console.log("\n=== ITEM 2: B1A-SYS-SKILLS ===");
  // Existing module-anchored system skills (idempotency).
  const existingSkills: any[] = await get(
    `/skills?domain_module_id=in.(${M_INFRA},${M_CAP},${M_OPS})&skill_type=eq.system&select=id,skill_name,domain_module_id`,
  );
  const skillByModule = new Map<number, number>();
  for (const s of existingSkills) skillByModule.set(Number(s.domain_module_id), Number(s.id));

  for (const spec of SKILL_SPECS) {
    let skillId = skillByModule.get(spec.module_id);
    if (skillId === undefined) {
      const [created] = await insert("/skills", [
        {
          skill_name: spec.skill_name,
          description: spec.description,
          skill_type: "system",
          domain_id: ITOM_DOMAIN_ID,
          domain_module_id: spec.module_id,
        },
      ]);
      skillId = Number(created.id);
      console.log(`  skill create: ${spec.skill_name} (id ${skillId}) on module ${spec.module_id}`);
    } else {
      console.log(`  skill skip (exists): ${spec.skill_name} (id ${skillId}) on module ${spec.module_id}`);
    }

    // skill_tools (idempotent by (skill_id, tool_id)).
    const existingLinks: any[] = await get(
      `/skill_tools?skill_id=eq.${skillId}&select=tool_id`,
    );
    const linked = new Set(existingLinks.map((r) => Number(r.tool_id)));
    const newLinks: Row[] = [];
    for (const tr of spec.tools) {
      const toolId = toolMap[tr.name];
      if (toolId === undefined) throw new Error(`tool not resolved: ${tr.name}`);
      if (linked.has(toolId)) continue;
      newLinks.push({ skill_id: skillId, tool_id: toolId, requirement_level: tr.level });
    }
    const createdLinks = await insert("/skill_tools", newLinks);
    console.log(`    skill_tools: +${createdLinks.length} (target ${spec.tools.length} total)`);
  }
}

async function retireLegacySkill() {
  console.log("\n=== ITEM 2b: retire legacy skill 74 ===");
  const legacy: any[] = await get(`/skills?id=eq.74&select=id,skill_name,domain_module_id`);
  if (legacy.length === 0) {
    console.log("  legacy skill 74 already deleted; nothing to do.");
    return;
  }
  // Snapshot skill_tools first (caller logs printed prior values from history).
  const links: any[] = await get(`/skill_tools?skill_id=eq.74&select=id,tool_id,requirement_level`);
  console.log(`  legacy skill_tools to delete: ${JSON.stringify(links.map((l) => l.id))}`);
  // Verify all 3 module skills exist before deleting (F1 precondition).
  const moduleSkills: any[] = await get(
    `/skills?domain_module_id=in.(${M_INFRA},${M_CAP},${M_OPS})&skill_type=eq.system&select=id,domain_module_id`,
  );
  const covered = new Set(moduleSkills.map((s) => Number(s.domain_module_id)));
  for (const m of [M_INFRA, M_CAP, M_OPS]) {
    if (!covered.has(m)) throw new Error(`refuse to delete legacy skill 74: module ${m} has no system skill yet`);
  }
  await call({ method: "DELETE", path: `/skill_tools?skill_id=eq.74` });
  await call({ method: "DELETE", path: `/skills?id=eq.74` });
  console.log("  deleted legacy skill 74 and its skill_tools rows.");
}

// ---------------------------------------------------------------------------
// ITEM 3 - B1A-HANDOFF-FK-BACKFILL.
// Derivation per SKILL.md B10b:
//   source_domain_module_id = ITOM module holding trigger_events.data_object_id (strongest role)
//   target_domain_module_id = ITOM module holding handoffs.data_object_id payload (strongest role)
// Computed from the live module-junction (after item 1 lands the consumer rows).
// ---------------------------------------------------------------------------
const OUTBOUND_HANDOFFS = [28, 53, 619, 620]; // source_domain_module_id null on ITOM side
const INBOUND_HANDOFFS = [50, 54, 59, 605, 607, 673, 681, 755, 761]; // target side

const ROLE_RANK: Record<string, number> = {
  master: 5,
  embedded_master: 4,
  contributor: 3,
  consumer: 2,
  derived: 1,
};

async function buildModuleRoleIndex(): Promise<Map<number, { module_id: number; rank: number }>> {
  const rows: any[] = await get(
    `/domain_module_data_objects?domain_module_id=in.(${M_INFRA},${M_CAP},${M_OPS})&select=domain_module_id,data_object_id,role`,
  );
  // For each data_object_id, the ITOM module holding it at the strongest role.
  const best = new Map<number, { module_id: number; rank: number }>();
  for (const r of rows) {
    const doid = Number(r.data_object_id);
    const rank = ROLE_RANK[String(r.role)] ?? 0;
    const cur = best.get(doid);
    if (!cur || rank > cur.rank) best.set(doid, { module_id: Number(r.domain_module_id), rank });
  }
  return best;
}

async function backfillHandoffFks() {
  console.log("\n=== ITEM 3: B1A-HANDOFF-FK-BACKFILL ===");
  const index = await buildModuleRoleIndex();
  const handoffs: any[] = await get(
    `/handoffs?id=in.(${[...OUTBOUND_HANDOFFS, ...INBOUND_HANDOFFS].join(",")})&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,data_object_id,trigger_event_id,trigger_events(data_object_id)`,
  );
  const byId = new Map<number, any>(handoffs.map((h) => [Number(h.id), h]));

  let patched = 0;
  for (const hid of OUTBOUND_HANDOFFS) {
    const h = byId.get(hid);
    if (!h) throw new Error(`handoff ${hid} not found`);
    if (h.source_domain_module_id !== null) {
      console.log(`  outbound ${hid}: source_domain_module_id already ${h.source_domain_module_id}; skip`);
      continue;
    }
    const eventDoid = Number(h.trigger_events?.data_object_id);
    const hit = index.get(eventDoid);
    if (!hit) {
      console.log(`  outbound ${hid}: NO ITOM module holds trigger event data_object ${eventDoid}; leave null (ambiguous)`);
      continue;
    }
    await call({ method: "PATCH", path: `/handoffs?id=eq.${hid}`, body: { source_domain_module_id: hit.module_id } });
    console.log(`  outbound ${hid}: source_domain_module_id <- ${hit.module_id} (event data_object ${eventDoid}, role rank ${hit.rank})`);
    patched++;
  }
  for (const hid of INBOUND_HANDOFFS) {
    const h = byId.get(hid);
    if (!h) throw new Error(`handoff ${hid} not found`);
    if (h.target_domain_module_id !== null) {
      console.log(`  inbound ${hid}: target_domain_module_id already ${h.target_domain_module_id}; skip`);
      continue;
    }
    const payloadDoid = Number(h.data_object_id);
    const hit = index.get(payloadDoid);
    if (!hit) {
      console.log(`  inbound ${hid}: NO ITOM module holds payload data_object ${payloadDoid}; leave null (ambiguous)`);
      continue;
    }
    await call({ method: "PATCH", path: `/handoffs?id=eq.${hid}`, body: { target_domain_module_id: hit.module_id } });
    console.log(`  inbound ${hid}: target_domain_module_id <- ${hit.module_id} (payload data_object ${payloadDoid}, role rank ${hit.rank})`);
    patched++;
  }
  console.log(`  patched ${patched} handoff FK(s).`);
}

// ---------------------------------------------------------------------------
async function main() {
  await loadConsumerDmdo();            // item 1 (must precede item 3 so payloads resolve)
  const toolMap = await syncTools();
  await loadSystemSkills(toolMap);     // item 2
  await retireLegacySkill();           // item 2b (after the 3 module skills exist)
  await backfillHandoffFks();          // item 3
  console.log("\nDone.");
}

await main();
