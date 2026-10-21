// DXP b1a execution loader — 2026-06-05
// Executes the agent-solvable pending actions for domain DXP (domains.id=77).
// Tables touched: data_objects (entity_type PATCH), data_object_lifecycle_states,
//   skills, tools, skill_tools, data_object_relationships, data_object_aliases,
//   trigger_events, handoff_processes.
// Legacy skill 52 DELETE + catalog UX PATCH handled in separate scripts.
// Idempotent: every insert is deduped by natural key against live state.

type Row = Record<string, unknown>;

async function call(method: string, path: string, body?: unknown): Promise<any> {
  const req: Row = { method, path };
  if (body !== undefined) req.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest"],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe" },
  );
  proc.stdin.write(JSON.stringify(req));
  proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (err && err.toLowerCase().includes("required audience not found")) {
    throw new Error("JWT_AUDIENCE_ERROR: " + err);
  }
  if (proc.exitCode !== 0) {
    throw new Error(`semantius call failed (${method} ${path}): ${err || out}`);
  }
  try {
    return JSON.parse(out);
  } catch {
    return out;
  }
}

const get = (path: string) => call("GET", path);

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map((r) => {
    const o: Row = {};
    for (const k of keys) o[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return o;
  });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const res = await call("POST", path, slice);
    if (Array.isArray(res)) out.push(...res);
  }
  return out;
}

// master ids
const M = {
  web_pages: 441,
  content_components: 442,
  digital_experiences: 443,
  personalization_rules: 444,
  ab_tests: 445,
  segments_dxp: 446,
  journey_steps: 447,
};

const summary: string[] = [];

// ---------------------------------------------------------------------------
// 1. entity_type classification (gate for lifecycle states, Rule #12). All 7
//    masters carry a workflow ladder => operational_workflow.
// ---------------------------------------------------------------------------
{
  const before = await get(
    "/data_objects?id=in.(441,442,443,444,445,446,447)&select=id,entity_type",
  );
  const need = before.filter((r: Row) => r.entity_type !== "operational_workflow");
  for (const r of need) {
    await call("PATCH", `/data_objects?id=eq.${r.id}`, { entity_type: "operational_workflow" });
  }
  summary.push(`entity_type: patched ${need.length} masters to operational_workflow`);
}

// ---------------------------------------------------------------------------
// 2. data_object_lifecycle_states  (B1A-LIFECYCLE-STATES)
//    domain_module_id: 441/442/443 -> 236, 444/445/446 -> 237, 447 -> 238.
//    requires_permission=true on workflow gates (publish/unpublish/activate/
//    retire/start/complete/...).
// ---------------------------------------------------------------------------
{
  type S = {
    data_object_id: number;
    state_name: string;
    state_order: number;
    is_initial?: boolean;
    is_terminal?: boolean;
    requires_permission?: boolean;
    permission_verb_override?: string;
    domain_module_id: number;
  };
  const states: S[] = [
    // web_pages (441) -> 236
    { data_object_id: M.web_pages, state_name: "draft", state_order: 1, is_initial: true, domain_module_id: 236 },
    { data_object_id: M.web_pages, state_name: "in_review", state_order: 2, domain_module_id: 236 },
    { data_object_id: M.web_pages, state_name: "approved", state_order: 3, requires_permission: true, permission_verb_override: "approve_web_page", domain_module_id: 236 },
    { data_object_id: M.web_pages, state_name: "published", state_order: 4, requires_permission: true, permission_verb_override: "publish_web_page", domain_module_id: 236 },
    { data_object_id: M.web_pages, state_name: "unpublished", state_order: 5, requires_permission: true, permission_verb_override: "unpublish_web_page", domain_module_id: 236 },
    { data_object_id: M.web_pages, state_name: "archived", state_order: 6, is_terminal: true, requires_permission: true, permission_verb_override: "archive_web_page", domain_module_id: 236 },
    // content_components (442) -> 236
    { data_object_id: M.content_components, state_name: "draft", state_order: 1, is_initial: true, domain_module_id: 236 },
    { data_object_id: M.content_components, state_name: "published", state_order: 2, requires_permission: true, permission_verb_override: "publish_content_component", domain_module_id: 236 },
    { data_object_id: M.content_components, state_name: "deprecated", state_order: 3, is_terminal: true, requires_permission: true, permission_verb_override: "deprecate_content_component", domain_module_id: 236 },
    // digital_experiences (443) -> 236
    { data_object_id: M.digital_experiences, state_name: "planned", state_order: 1, is_initial: true, domain_module_id: 236 },
    { data_object_id: M.digital_experiences, state_name: "active", state_order: 2, requires_permission: true, permission_verb_override: "activate_digital_experience", domain_module_id: 236 },
    { data_object_id: M.digital_experiences, state_name: "ended", state_order: 3, is_terminal: true, requires_permission: true, permission_verb_override: "end_digital_experience", domain_module_id: 236 },
    // personalization_rules (444) -> 237
    { data_object_id: M.personalization_rules, state_name: "draft", state_order: 1, is_initial: true, domain_module_id: 237 },
    { data_object_id: M.personalization_rules, state_name: "active", state_order: 2, requires_permission: true, permission_verb_override: "activate_personalization_rule", domain_module_id: 237 },
    { data_object_id: M.personalization_rules, state_name: "paused", state_order: 3, requires_permission: true, permission_verb_override: "pause_personalization_rule", domain_module_id: 237 },
    { data_object_id: M.personalization_rules, state_name: "retired", state_order: 4, is_terminal: true, requires_permission: true, permission_verb_override: "retire_personalization_rule", domain_module_id: 237 },
    // ab_tests (445) -> 237
    { data_object_id: M.ab_tests, state_name: "configured", state_order: 1, is_initial: true, domain_module_id: 237 },
    { data_object_id: M.ab_tests, state_name: "running", state_order: 2, requires_permission: true, permission_verb_override: "start_ab_test", domain_module_id: 237 },
    { data_object_id: M.ab_tests, state_name: "completed", state_order: 3, requires_permission: true, permission_verb_override: "complete_ab_test", domain_module_id: 237 },
    { data_object_id: M.ab_tests, state_name: "archived", state_order: 4, is_terminal: true, requires_permission: true, permission_verb_override: "archive_ab_test", domain_module_id: 237 },
    // segments_dxp (446) -> 237
    { data_object_id: M.segments_dxp, state_name: "draft", state_order: 1, is_initial: true, domain_module_id: 237 },
    { data_object_id: M.segments_dxp, state_name: "published", state_order: 2, requires_permission: true, permission_verb_override: "publish_segment_dxp", domain_module_id: 237 },
    { data_object_id: M.segments_dxp, state_name: "retired", state_order: 3, is_terminal: true, requires_permission: true, permission_verb_override: "retire_segment_dxp", domain_module_id: 237 },
    // journey_steps (447) -> 238
    { data_object_id: M.journey_steps, state_name: "defined", state_order: 1, is_initial: true, domain_module_id: 238 },
    { data_object_id: M.journey_steps, state_name: "entered", state_order: 2, domain_module_id: 238 },
    { data_object_id: M.journey_steps, state_name: "exited", state_order: 3, is_terminal: true, domain_module_id: 238 },
    { data_object_id: M.journey_steps, state_name: "abandoned", state_order: 4, is_terminal: true, domain_module_id: 238 },
  ];
  const existing = await get(
    "/data_object_lifecycle_states?data_object_id=in.(441,442,443,444,445,446,447)&select=data_object_id,state_name",
  );
  const seen = new Set(existing.map((r: Row) => `${r.data_object_id}|${r.state_name}`));
  const toLoad = states
    .filter((s) => !seen.has(`${s.data_object_id}|${s.state_name}`))
    .map((s) => ({
      data_object_id: s.data_object_id,
      state_name: s.state_name,
      state_order: s.state_order,
      is_initial: s.is_initial ?? false,
      is_terminal: s.is_terminal ?? false,
      requires_permission: s.requires_permission ?? false,
      permission_verb_override: s.permission_verb_override ?? "",
      domain_module_id: s.domain_module_id,
    }));
  const r = await insert("/data_object_lifecycle_states", toLoad);
  summary.push(`data_object_lifecycle_states: inserted ${r.length} (of ${states.length} planned)`);
}

// ---------------------------------------------------------------------------
// 3. trigger_events  (B1A-WORKFLOW-EVENTS) — 7 workflow-gate state-change events
//    not already present. event_category='state_change', data_object_id = mastering
//    master.
// ---------------------------------------------------------------------------
{
  const events = [
    { event_name: "web_page.archived", data_object_id: M.web_pages, from_state: "unpublished", to_state: "archived" },
    { event_name: "web_page.draft", data_object_id: M.web_pages, from_state: "", to_state: "draft" },
    { event_name: "ab_test.archived", data_object_id: M.ab_tests, from_state: "completed", to_state: "archived" },
    { event_name: "personalization_rule.paused", data_object_id: M.personalization_rules, from_state: "active", to_state: "paused" },
    { event_name: "personalization_rule.retired", data_object_id: M.personalization_rules, from_state: "paused", to_state: "retired" },
    { event_name: "segment_dxp.retired", data_object_id: M.segments_dxp, from_state: "published", to_state: "retired" },
    { event_name: "digital_experience.ended", data_object_id: M.digital_experiences, from_state: "active", to_state: "ended" },
  ];
  const existing = await get(
    "/trigger_events?data_object_id=in.(441,442,443,444,445,446,447)&select=event_name",
  );
  const seen = new Set(existing.map((r: Row) => r.event_name));
  const toLoad = events
    .filter((e) => !seen.has(e.event_name))
    .map((e) => ({
      event_name: e.event_name,
      data_object_id: e.data_object_id,
      from_state: e.from_state,
      to_state: e.to_state,
      event_category: "state_change",
      description: `State-change event fired when a ${e.event_name.split(".")[0].replace(/_/g, " ")} transitions to ${e.to_state}.`,
    }));
  const r = await insert("/trigger_events", toLoad);
  summary.push(`trigger_events: inserted ${r.length} (of ${events.length} planned)`);
}

// ---------------------------------------------------------------------------
// 4. intra-domain data_object_relationships  (B1A-INTRA-RELATIONSHIPS)
//    master-to-master edges among 441-447.
// ---------------------------------------------------------------------------
{
  type R = {
    data_object_id: number;
    related_data_object_id: number;
    relationship_verb: string;
    inverse_verb: string;
    relationship_type: string;
    relationship_kind: string;
    is_required: boolean;
    owner_side: string;
  };
  const rels: R[] = [
    // web_pages embeds content_components (one-to-many; page is parent)
    { data_object_id: M.web_pages, related_data_object_id: M.content_components, relationship_verb: "embeds", inverse_verb: "is embedded in", relationship_type: "one_to_many", relationship_kind: "composition", is_required: false, owner_side: "source" },
    // digital_experiences spans web_pages (one-to-many; experience is parent)
    { data_object_id: M.digital_experiences, related_data_object_id: M.web_pages, relationship_verb: "spans", inverse_verb: "is spanned by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
    // personalization_rules targets segments_dxp (many-to-many)
    { data_object_id: M.personalization_rules, related_data_object_id: M.segments_dxp, relationship_verb: "targets", inverse_verb: "is targeted by", relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
    // ab_tests runs_on web_pages (one-to-many; web_page is parent => owner_side=target)
    { data_object_id: M.ab_tests, related_data_object_id: M.web_pages, relationship_verb: "runs on", inverse_verb: "hosts", relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
    // ab_tests evaluates personalization_rules (one-to-many; ab_test is parent of the evaluated rule set)
    { data_object_id: M.ab_tests, related_data_object_id: M.personalization_rules, relationship_verb: "evaluates", inverse_verb: "is evaluated by", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
    // journey_steps composes digital_experiences (many-to-one; digital_experience is parent => owner_side=target)
    { data_object_id: M.journey_steps, related_data_object_id: M.digital_experiences, relationship_verb: "composes", inverse_verb: "is composed of", relationship_type: "one_to_many", relationship_kind: "composition", is_required: false, owner_side: "target" },
    // journey_steps references web_pages (many-to-many)
    { data_object_id: M.journey_steps, related_data_object_id: M.web_pages, relationship_verb: "references", inverse_verb: "is referenced by", relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  ];
  const existing = await get(
    "/data_object_relationships?and=(data_object_id.in.(441,442,443,444,445,446,447),related_data_object_id.in.(441,442,443,444,445,446,447))&select=data_object_id,related_data_object_id,relationship_verb",
  );
  const seen = new Set(
    existing.map((r: Row) => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`),
  );
  const toLoad = rels
    .filter((r) => !seen.has(`${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`))
    .map((r) => ({ ...r }));
  const r = await insert("/data_object_relationships", toLoad);
  summary.push(`intra-domain data_object_relationships: inserted ${r.length} (of ${rels.length} planned)`);
}

// ---------------------------------------------------------------------------
// 5. cross-domain data_object_relationships  (B1A-S9) — 4 loadable edges whose
//    target master exists in the catalog. relationship_type=many_to_many,
//    relationship_kind=reference, is_required=false, owner_side=source.
// ---------------------------------------------------------------------------
{
  const T = { marketing_campaigns: 116, audience_segments: 113, product_features: 403 };
  const rels = [
    { data_object_id: M.digital_experiences, related_data_object_id: T.marketing_campaigns, relationship_verb: "activates into", inverse_verb: "is activated from" }, // 808 DXP->MA
    { data_object_id: M.segments_dxp, related_data_object_id: T.audience_segments, relationship_verb: "publishes to", inverse_verb: "is published from" }, // 809 DXP->CDP
    { data_object_id: M.journey_steps, related_data_object_id: T.audience_segments, relationship_verb: "feeds", inverse_verb: "is fed by" }, // 810 DXP->CDP
    { data_object_id: M.ab_tests, related_data_object_id: T.product_features, relationship_verb: "informs", inverse_verb: "is informed by" }, // 813 DXP->PROD-MGMT
  ].map((r) => ({
    ...r,
    relationship_type: "many_to_many",
    relationship_kind: "reference",
    is_required: false,
    owner_side: "source",
  }));
  const existing = await get(
    "/data_object_relationships?and=(data_object_id.in.(441,443,445,446,447),related_data_object_id.in.(113,116,403))&select=data_object_id,related_data_object_id,relationship_verb",
  );
  const seen = new Set(
    existing.map((r: Row) => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`),
  );
  const toLoad = rels.filter(
    (r) => !seen.has(`${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`),
  );
  const r = await insert("/data_object_relationships", toLoad);
  summary.push(`cross-domain data_object_relationships: inserted ${r.length} (of ${rels.length} planned)`);
}

// ---------------------------------------------------------------------------
// 6. data_object_aliases  (B1A-ALIASES) — flagship vendor terminology.
// ---------------------------------------------------------------------------
{
  const aliases: { data_object_id: number; alias_name: string }[] = [
    { data_object_id: M.web_pages, alias_name: "Page" },
    { data_object_id: M.web_pages, alias_name: "Content Item" },
    { data_object_id: M.web_pages, alias_name: "Node" },
    { data_object_id: M.content_components, alias_name: "Experience Fragment" },
    { data_object_id: M.content_components, alias_name: "Rendering" },
    { data_object_id: M.content_components, alias_name: "Content Block" },
    { data_object_id: M.digital_experiences, alias_name: "Campaign" },
    { data_object_id: M.digital_experiences, alias_name: "Experience" },
    { data_object_id: M.personalization_rules, alias_name: "Activity" },
    { data_object_id: M.personalization_rules, alias_name: "Personalization" },
    { data_object_id: M.personalization_rules, alias_name: "Experience Targeting" },
    { data_object_id: M.ab_tests, alias_name: "Experiment" },
    { data_object_id: M.ab_tests, alias_name: "A/B/n Test" },
    { data_object_id: M.ab_tests, alias_name: "Optimization Test" },
    { data_object_id: M.segments_dxp, alias_name: "Audience" },
    { data_object_id: M.segments_dxp, alias_name: "Visitor Profile" },
    { data_object_id: M.journey_steps, alias_name: "Journey Stage" },
    { data_object_id: M.journey_steps, alias_name: "Flow Step" },
  ];
  const existing = await get(
    "/data_object_aliases?data_object_id=in.(441,442,443,444,445,446,447)&select=data_object_id,alias_name",
  );
  const seen = new Set(existing.map((r: Row) => `${r.data_object_id}|${r.alias_name}`));
  const toLoad = aliases
    .filter((a) => !seen.has(`${a.data_object_id}|${a.alias_name}`))
    .map((a) => ({
      data_object_id: a.data_object_id,
      alias_name: a.alias_name,
      alias_type: "synonym",
      is_preferred: false,
    }));
  const r = await insert("/data_object_aliases", toLoad);
  summary.push(`data_object_aliases: inserted ${r.length} (of ${aliases.length} planned)`);
}

// ---------------------------------------------------------------------------
// 7. handoff_processes APQC tags  (B1A-S11) — 11 confident L2/L3 matches,
//    4 deferred (97, 815, 820, 811). agent_curated, record_status omitted (new).
// ---------------------------------------------------------------------------
{
  const tags = [
    { handoff_id: 808, process_id: 665 },  // Execute promotional activities
    { handoff_id: 812, process_id: 677 },  // Develop business rules to provide personalized offers
    { handoff_id: 813, process_id: 1822 }, // Carry out post launch analytics to test acceptability in the market
    { handoff_id: 814, process_id: 1763 }, // Publish approved content
    { handoff_id: 838, process_id: 428 },  // Develop and manage content
    { handoff_id: 92, process_id: 1763 },  // Publish approved content
    { handoff_id: 95, process_id: 428 },   // Develop and manage content
    { handoff_id: 803, process_id: 1763 }, // Publish approved content
    { handoff_id: 804, process_id: 428 },  // Develop and manage content
    { handoff_id: 805, process_id: 428 },  // Develop and manage content
    { handoff_id: 1001, process_id: 538 }, // Develop plan for new product/service development and introduction/launch
  ];
  const existing = await get(
    "/handoff_processes?handoff_id=in.(808,812,813,814,838,92,95,803,804,805,1001)&select=handoff_id,process_id",
  );
  const seen = new Set(existing.map((r: Row) => `${r.handoff_id}|${r.process_id}`));
  const toLoad = tags
    .filter((t) => !seen.has(`${t.handoff_id}|${t.process_id}`))
    .map((t) => ({
      handoff_id: t.handoff_id,
      process_id: t.process_id,
      role: "implements",
      proposal_source: "agent_curated",
    }));
  const r = await insert("/handoff_processes", toLoad);
  summary.push(`handoff_processes: inserted ${r.length} (of ${tags.length} planned)`);
}

console.log("\n=== DXP b1a load summary ===");
for (const s of summary) console.log("  " + s);
console.log("=== done ===\n");
