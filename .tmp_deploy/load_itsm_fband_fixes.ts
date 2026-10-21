// ITSM F-band audit fixes (2026-05-26).
// Idempotent. Run from project root: bun run .tmp_deploy/load_itsm_fband_fixes.ts
//
// Scope:
//   F1  retire legacy domain-level system skill (skills.id=14) + its skill_tools
//   F3  add required tools to thin / empty skills (141/142/143/144/145/146/147)
//   F7  swap unjustified channel primitives to notify_person / notify_team and
//       justify the channel-specific ones (140/141/143/144)
//   New tools authored for missing workflow gates:
//     approve_service_request, publish_catalog_item, retire_catalog_item,
//     update_problem_status, approve_change, update_change_status,
//     create_knowledge_article, publish_article, archive_knowledge_article,
//     create_sla, update_sla
// B12 service_slas exemption is already on data_objects.notes (no action).

async function pg(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<any> {
  const args: Record<string, unknown> = { method, path };
  if (body !== undefined) args.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(args)],
    { stdout: "pipe", stderr: "pipe" },
  );
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`semantius ${method} ${path} failed (${code}): ${stderr || stdout}`);
  }
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  try { return JSON.parse(trimmed); } catch { return trimmed; }
}

type ToolDraft = {
  tool_name: string;
  description: string;
  operation_kind: "query" | "mutate" | "side_effect" | "compute" | "inbound";
  data_object_id: number | null;
  coverage_tier: "platform" | "external" | "integration";
};

const NEW_TOOLS: ToolDraft[] = [
  { tool_name: "approve_service_request", description: "Approve a service request, transitioning it past the approval workflow gate.", operation_kind: "mutate", data_object_id: 48, coverage_tier: "platform" },
  { tool_name: "publish_catalog_item",   description: "Publish a service catalog item, making it requestable in the portal.",                 operation_kind: "mutate", data_object_id: 52, coverage_tier: "platform" },
  { tool_name: "retire_catalog_item",    description: "Retire a service catalog item, removing it from the requestable catalog.",              operation_kind: "mutate", data_object_id: 52, coverage_tier: "platform" },
  { tool_name: "update_problem_status",  description: "Advance a problem record's state (new/investigating/known_error/resolved/closed).",     operation_kind: "mutate", data_object_id: 49, coverage_tier: "platform" },
  { tool_name: "approve_change",         description: "Approve a change request, satisfying the CAB workflow gate.",                           operation_kind: "mutate", data_object_id: 50, coverage_tier: "platform" },
  { tool_name: "update_change_status",   description: "Advance a change request's state (new/assess/approve/schedule/implement/review/close).", operation_kind: "mutate", data_object_id: 50, coverage_tier: "platform" },
  { tool_name: "create_knowledge_article", description: "Author a new knowledge article in draft state.",                                       operation_kind: "mutate", data_object_id: 51, coverage_tier: "platform" },
  { tool_name: "publish_article",        description: "Publish a knowledge article, making it visible to the configured audiences.",            operation_kind: "mutate", data_object_id: 51, coverage_tier: "platform" },
  { tool_name: "archive_knowledge_article", description: "Archive a knowledge article, removing it from active search results.",                operation_kind: "mutate", data_object_id: 51, coverage_tier: "platform" },
  { tool_name: "create_sla",             description: "Create an SLA definition with thresholds and target response/resolution windows.",       operation_kind: "mutate", data_object_id: 53, coverage_tier: "platform" },
  { tool_name: "update_sla",             description: "Update an SLA definition's targets, schedule, or breach thresholds.",                    operation_kind: "mutate", data_object_id: 53, coverage_tier: "platform" },
];

const NOTIFY_PERSON = 913;
const NOTIFY_TEAM   = 914;
const SEND_EMAIL    = 37;
const POST_CHAT     = 40;

type SkillToolDraft = {
  skill_id: number;
  tool_id: number;
  requirement_level: "required" | "optional";
  notes: string;
};

async function main() {
  console.log("=== ITSM F-band fixes ===");

  // ---------------------------------------------------------------
  // Phase 1: ensure new tools exist (idempotent by tool_name)
  // ---------------------------------------------------------------
  const existingTools: { id: number; tool_name: string }[] = await pg(
    "GET",
    `/tools?tool_name=in.(${NEW_TOOLS.map(t => t.tool_name).join(",")})&select=id,tool_name`,
  ) ?? [];
  const haveTool = new Set(existingTools.map(t => t.tool_name));
  const toInsertTools = NEW_TOOLS.filter(t => !haveTool.has(t.tool_name));
  if (toInsertTools.length > 0) {
    console.log(`Inserting ${toInsertTools.length} new tools...`);
    await pg("POST", "/tools", toInsertTools);
  } else {
    console.log("All new tools already present.");
  }

  // Build name -> id map for everything we need to reference below
  const toolsByName: Record<string, number> = {};
  const allTools: { id: number; tool_name: string }[] = await pg(
    "GET",
    `/tools?tool_name=in.(${NEW_TOOLS.map(t => t.tool_name).join(",")})&select=id,tool_name`,
  ) ?? [];
  for (const t of allTools) toolsByName[t.tool_name] = t.id;
  for (const name of NEW_TOOLS.map(t => t.tool_name)) {
    if (!toolsByName[name]) throw new Error(`tool ${name} missing after insert`);
  }

  // ---------------------------------------------------------------
  // Phase 2: F1 - retire legacy itsm-system skill (id=14)
  // ---------------------------------------------------------------
  console.log("Retiring legacy skill id=14 (itsm-system)...");
  await pg("DELETE", "/skill_tools?skill_id=eq.14");
  await pg("DELETE", "/skills?id=eq.14");
  console.log("  done.");

  // ---------------------------------------------------------------
  // Phase 3: F7 channel-primitive swaps + notes
  // skill_tools PATCH idempotent: filter matches at most once on the old tool_id
  // ---------------------------------------------------------------
  console.log("Applying F7 channel swaps + justifications...");
  type Patch = { skill_id: number; old_tool_id: number; new_tool_id?: number; notes?: string };
  const patches: Patch[] = [
    // Skill 140 incident
    { skill_id: 140, old_tool_id: SEND_EMAIL, new_tool_id: NOTIFY_PERSON, notes: "Assignee + status-change notifications; channel-substitutable." },
    { skill_id: 140, old_tool_id: POST_CHAT,                              notes: "Major-incident bridge: ChatOps (Slack/Teams) IS the workflow; not substitutable." },
    // Skill 141 service-request
    { skill_id: 141, old_tool_id: SEND_EMAIL, new_tool_id: NOTIFY_PERSON, notes: "Requester + approver notifications; channel-substitutable." },
    // Skill 143 change-mgmt
    { skill_id: 143, old_tool_id: SEND_EMAIL, new_tool_id: NOTIFY_PERSON, notes: "CAB approver + implementer notifications; channel-substitutable." },
    { skill_id: 143, old_tool_id: POST_CHAT,                              notes: "CAB bridge / change-window coordination: ChatOps IS the workflow; not substitutable." },
    // Skill 144 event-mgmt
    { skill_id: 144, old_tool_id: SEND_EMAIL, new_tool_id: NOTIFY_PERSON, notes: "Alert routing to on-call; channel-substitutable." },
    { skill_id: 144, old_tool_id: POST_CHAT,  new_tool_id: NOTIFY_TEAM,   notes: "Alert broadcast to on-call team; channel-substitutable." },
  ];
  for (const p of patches) {
    const body: Record<string, unknown> = {};
    if (p.new_tool_id !== undefined) body.tool_id = p.new_tool_id;
    if (p.notes !== undefined) body.notes = p.notes;
    if (Object.keys(body).length === 0) continue;
    // First try patching the old_tool_id row (pre-swap state); idempotency-safe
    await pg(
      "PATCH",
      `/skill_tools?skill_id=eq.${p.skill_id}&tool_id=eq.${p.old_tool_id}`,
      body,
    );
    // If we swapped, also patch the new-tool row in case the swap already happened (so notes are still set)
    if (p.new_tool_id !== undefined && p.notes !== undefined) {
      await pg(
        "PATCH",
        `/skill_tools?skill_id=eq.${p.skill_id}&tool_id=eq.${p.new_tool_id}`,
        { notes: p.notes },
      );
    }
  }
  console.log(`  ${patches.length} channel-primitive patches applied.`);

  // ---------------------------------------------------------------
  // Phase 4: F3 new skill_tools links
  // ---------------------------------------------------------------
  console.log("Linking new skill_tools rows...");

  // Existing static tool ids (catalog-wide):
  const QUERY_INCIDENTS         = 16;
  const QUERY_CHANGES           = 17;
  const QUERY_KNOWLEDGE         = 19;
  const QUERY_SR                = 188;
  const QUERY_PROBLEMS          = 187;
  const QUERY_CATALOG_ITEMS     = 189;
  const QUERY_SLAS              = 190;
  const QUERY_CIS               = 18;
  const CREATE_INCIDENT         = 30;
  const UPDATE_INCIDENT_STATUS  = 237;

  const T = toolsByName;

  const newLinks: SkillToolDraft[] = [
    // 141 service-request: missing workflow-gate mutates
    { skill_id: 141, tool_id: T.approve_service_request, requirement_level: "required", notes: "Workflow gate: service_requests.approved." },
    { skill_id: 141, tool_id: T.publish_catalog_item,    requirement_level: "required", notes: "Workflow gate: service_catalog_items.published." },
    { skill_id: 141, tool_id: T.retire_catalog_item,     requirement_level: "required", notes: "Workflow gate: service_catalog_items.retired." },

    // 142 problem-mgmt: status update
    { skill_id: 142, tool_id: T.update_problem_status, requirement_level: "required", notes: "Drives service_problems.resolved transition." },

    // 143 change-mgmt: CAB approval and status progression
    { skill_id: 143, tool_id: T.approve_change,        requirement_level: "required", notes: "Workflow gate: service_changes.approved (CAB approval)." },
    { skill_id: 143, tool_id: T.update_change_status,  requirement_level: "required", notes: "Advances change through schedule/implement/review/close." },

    // 145 knowledge: full CRUD lifecycle
    { skill_id: 145, tool_id: T.create_knowledge_article,  requirement_level: "required", notes: "Author articles in draft." },
    { skill_id: 145, tool_id: T.publish_article,           requirement_level: "required", notes: "Workflow gate: knowledge_articles.published." },
    { skill_id: 145, tool_id: T.archive_knowledge_article, requirement_level: "optional", notes: "Retire stale articles from active search." },

    // 147 sla-mgmt: definition CRUD
    { skill_id: 147, tool_id: T.create_sla, requirement_level: "required", notes: "Author SLA definitions." },
    { skill_id: 147, tool_id: T.update_sla, requirement_level: "required", notes: "Update SLA targets / thresholds / breach status." },

    // 146 agent-workspace: F3 cure - cross-module queue surface
    { skill_id: 146, tool_id: QUERY_INCIDENTS,        requirement_level: "required", notes: "Surface incident queue in workspace." },
    { skill_id: 146, tool_id: QUERY_SR,               requirement_level: "required", notes: "Surface service-request queue in workspace." },
    { skill_id: 146, tool_id: QUERY_PROBLEMS,         requirement_level: "required", notes: "Surface problem queue in workspace." },
    { skill_id: 146, tool_id: QUERY_CHANGES,          requirement_level: "required", notes: "Surface change queue in workspace." },
    { skill_id: 146, tool_id: QUERY_KNOWLEDGE,        requirement_level: "optional", notes: "Contextual KB lookup from workspace." },
    { skill_id: 146, tool_id: QUERY_CIS,              requirement_level: "optional", notes: "CI lookup from ticket context." },
    { skill_id: 146, tool_id: UPDATE_INCIDENT_STATUS, requirement_level: "optional", notes: "Handle-in-place status updates from workspace." },
    { skill_id: 146, tool_id: CREATE_INCIDENT,        requirement_level: "optional", notes: "Walk-up / phone-in incident creation from workspace." },

    // 144 event-mgmt: structural gap - event-to-incident escalation
    { skill_id: 144, tool_id: CREATE_INCIDENT, requirement_level: "required", notes: "Canonical event-to-incident escalation when alerts exceed threshold." },
    { skill_id: 144, tool_id: QUERY_INCIDENTS, requirement_level: "optional", notes: "Correlate inbound events against open incidents for deduplication." },
  ];

  // Idempotency: filter out (skill_id, tool_id) pairs that already exist
  const existing: { skill_id: number; tool_id: number }[] = await pg(
    "GET",
    `/skill_tools?skill_id=in.(140,141,142,143,144,145,146,147)&select=skill_id,tool_id`,
  ) ?? [];
  const have = new Set(existing.map(e => `${e.skill_id}:${e.tool_id}`));
  const toInsert = newLinks.filter(l => !have.has(`${l.skill_id}:${l.tool_id}`));
  if (toInsert.length > 0) {
    console.log(`  inserting ${toInsert.length} new skill_tools rows...`);
    // Chunk to be safe on Windows
    for (let i = 0; i < toInsert.length; i += 25) {
      const batch = toInsert.slice(i, i + 25);
      await pg("POST", "/skill_tools", batch);
    }
  } else {
    console.log("  all skill_tools links already present.");
  }

  // ---------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------
  console.log("\n=== Summary ===");
  for (const sid of [140, 141, 142, 143, 144, 145, 146, 147]) {
    const rows: { tool_id: number; requirement_level: string; tools: { tool_name: string; coverage_tier: string } }[] =
      await pg(
        "GET",
        `/skill_tools?skill_id=eq.${sid}&select=tool_id,requirement_level,tools(tool_name,coverage_tier)`,
      ) ?? [];
    const total = rows.length;
    const platform = rows.filter(r => r.tools.coverage_tier === "platform").length;
    const pct = total === 0 ? 0 : Math.round((platform / total) * 100);
    console.log(`  skill ${sid}: ${total} tools, ${platform} platform (${pct}% strict)`);
  }

  // Confirm legacy skill is gone
  const legacy = await pg("GET", "/skills?id=eq.14&select=id");
  console.log(`  legacy skill 14 retired: ${Array.isArray(legacy) && legacy.length === 0 ? "yes" : "NO"}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
