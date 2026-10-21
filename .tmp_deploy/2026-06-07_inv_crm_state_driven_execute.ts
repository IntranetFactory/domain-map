#!/usr/bin/env bun
// 2026-06-07 INV-CRM state-driven Validate execute (SKILL.md Rule #21, bulk batch).
// Additive/corrective only; everything lands record_status='new' (or PATCH of empty/NULL fields).
// Idempotent: re-reads live before every write and skips work already done.
//
// Domain 159 INV-CRM (Investor Relationship and Deal Flow Management).
// Modules: 9 INV-CRM-DEAL-PIPELINE, 10 INV-CRM-RELATIONSHIP-GRAPH, 11 INV-CRM-LP-CRM (all full).
// Masters: 750 vc_deals, 751 investment_memos, 752 relationship_records,
//          753 investor_contacts, 754 lp_prospects.
//
// EXECUTE-classified items (this run):
//   1. B1A-ENTITY-TYPE : classify all 5 masters (entity_type unclassified -> Rule #12 enum)
//   2. Catalog UX (#20): author empty catalog_tagline/description on domain 159 + modules 9/10/11
//                        (overrides the stale surface-before-write gate per the run instructions)
//   3. B1A-S9 (B11)    : insert data_object_aliases generic synonyms on 752, 753, 754
//   4. B1A-S3 (B9)     : author 7 trigger_events (event_category state_change)
//   5. B1A-S4 (B12)    : author lifecycle states on 751 (investment_memos) and 754 (lp_prospects)
//                        only; the 752/753 config-shape lifecycle question stays surfaced as
//                        B2-CONFIG-SHAPE (entity_type already grants the structural exemption).
//
// NOT touched here (surfaced / left to cascade):
//   - B1A-M1..M6        : net-new master data_objects (research-grade entity authoring; carried)
//   - B1A-S6            : role layer (gated by user decision B2-ROLE-NAMING; largely superseded by Phase-P)
//   - B1A-S7            : per-module system skills + skill_tools (RETIRED per 2026-06-06 supersession)
//   - B1A-PHASE-P       : personas / RACI (DEFER per run instructions; not authored)
//   - B1B-B1            : intra-domain handoffs (enumeration_status source_count_only -> not fully specified)
//   - B1B-S8            : GDPR/CCPA/SEC-IAA regulations (gated by user decision B2-REGULATION-SCOPE)
//   - all b2 (user decisions), all b3 (backlog)

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
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (path: string) => call({ method: "GET", path });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });
const post = (path: string, body: Row[]) => call({ method: "POST", path, body });

// ============================================================
// 1. entity_type classification (Rule #12)
// ============================================================
// 750 vc_deals             operational_workflow : full 6-state deal lifecycle (sourced -> closed/declined)
// 751 investment_memos     operational_workflow : submit-lock + single-approver IC memo workflow
// 752 relationship_records computed             : synthesized graph edges / relationship-strength signal
// 753 investor_contacts    operational_record   : directory record of external network people
// 754 lp_prospects         operational_workflow : fundraising stage workflow (researching -> committed/declined)
const entityTypes: { id: number; name: string; entity_type: string }[] = [
  { id: 750, name: "vc_deals", entity_type: "operational_workflow" },
  { id: 751, name: "investment_memos", entity_type: "operational_workflow" },
  { id: 752, name: "relationship_records", entity_type: "computed" },
  { id: 753, name: "investor_contacts", entity_type: "operational_record" },
  { id: 754, name: "lp_prospects", entity_type: "operational_workflow" },
];

async function classifyEntityTypes() {
  console.log("\n== 1. entity_type classification ==");
  const live = await get("/data_objects?id=in.(750,751,752,753,754)&select=id,entity_type");
  const cur = new Map(live.map(r => [Number(r.id), String(r.entity_type ?? "")]));
  let n = 0;
  for (const e of entityTypes) {
    const c = cur.get(e.id);
    if (c && c !== "unclassified") {
      console.log(`  skip ${e.name}: already '${c}'`);
      continue;
    }
    await patch(`/data_objects?id=eq.${e.id}`, { entity_type: e.entity_type });
    console.log(`  set  ${e.name} -> ${e.entity_type}`);
    n++;
  }
  console.log(`  entity_type updated: ${n}`);
  return n;
}

// ============================================================
// 2. Catalog UX (Rule #20) - only writes EMPTY fields, never overwrites.
//    Buyer-voice (workflow + value); no vendor/product names; no em-dash; American English.
// ============================================================
const domainCopy = {
  catalog_tagline:
    "See who in your network can open the next door, run every deal from first meeting to close, and keep your investor relationships warm in one place.",
  catalog_description:
    "Turn the relationships your team already has into deal flow. The system reads the email and calendar trails your people generate and builds a living map of who knows whom and how strongly, so when you want to reach a founder or a fund you can see the warmest path in and route the introduction to the right colleague. Founders, executives, co-investors, and advisors all live in one network directory instead of scattered across personal inboxes.\n\nMove every opportunity through a pipeline the whole team can see. Source deals, run diligence, draft and circulate the investment memo, take it to the committee, issue the term sheet, and mark the close or the pass, each stage with the right approvals attached. Per-deal staffing and committee votes stay on the record, so nothing depends on one partner's memory.\n\nManage the capital side with the same discipline. Track limited partners from first research through soft circle to a firm commitment, hand the relationship cleanly to fund administration when an LP commits, and keep the people who back you informed across the life of the fund. The payoff is more warm introductions that convert, a pipeline leadership can actually trust, and investor relationships that compound instead of decay.",
};

const moduleCopy: Record<number, { catalog_tagline: string; catalog_description: string }> = {
  9: {
    catalog_tagline:
      "Run every investment from first meeting to signed term sheet with the diligence, memo, and committee approvals all in one pipeline.",
    catalog_description:
      "Move each opportunity through a shared pipeline so the whole deal team sees where it stands. Capture a new deal the moment it is sourced, work it through diligence, and pull the supporting material together as you go. When it is ready for the committee, draft the investment memo, lock it for the vote, and record the decision.\n\nKeep the approvals where they belong. The stages that matter, committee review, term sheet, and close, carry their own permission gates, so the right people sign off before a deal advances and a pass is logged just as clearly as a win. Per-deal roles keep accountability tied to the opportunity rather than to a static org chart.\n\nThe payoff is a pipeline leadership can trust, faster handoffs between sourcing and diligence, and an auditable trail of how each investment decision was actually made.",
  },
  10: {
    catalog_tagline:
      "Map who in your firm knows whom, surface the warmest path to any target, and route introductions to the colleague best placed to make them.",
    catalog_description:
      "Build a relationship graph from the signals your team already produces. The system reads email and calendar metadata to infer who is connected to whom and how strong each tie is, then keeps that map current as relationships grow or go quiet. Founders, executives, co-investors, board members, and advisors all sit in one network directory.\n\nUse the graph to open doors. When you want to reach a person or an organization, see the shortest warm path in and ask the colleague who actually holds that relationship to make the introduction. Track the request through to a yes or a no so nothing stalls in someone's inbox.\n\nThe payoff is more introductions that land, less guessing about who can reach a target, and a network that becomes a shared firm asset instead of a set of private address books.",
  },
  11: {
    catalog_tagline:
      "Manage limited partners from first research through soft circle to a firm commitment, then hand the relationship cleanly to fund administration.",
    catalog_description:
      "Run your fundraise as a relationship pipeline, not a spreadsheet. Track each prospective limited partner from initial research through outreach, meetings, and a soft circle to a signed commitment, with the people leading the relationship clearly assigned. See at a glance who is in motion, who is stalled, and where the next conversation needs to happen.\n\nKeep the capital side connected to the rest of the firm. When an LP commits, hand the relationship to fund administration so the commitment is recorded without re-keying, and surface capital-call and fund activity back into the relationship record so the people who back you always feel looked after.\n\nThe payoff is a fundraise you can forecast, warmer long-term investor relationships, and a clean boundary between the courtship of an LP and the administration of the fund they join.",
  },
};

async function authorCatalogUX() {
  console.log("\n== 2. Catalog UX (Rule #20) ==");
  let n = 0;
  // domain row
  const [dom] = await get("/domains?id=eq.159&select=catalog_tagline,catalog_description");
  const dBody: Row = {};
  if (!String(dom?.catalog_tagline ?? "").trim()) dBody.catalog_tagline = domainCopy.catalog_tagline;
  if (!String(dom?.catalog_description ?? "").trim())
    dBody.catalog_description = domainCopy.catalog_description;
  if (Object.keys(dBody).length) {
    await patch("/domains?id=eq.159", dBody);
    console.log(`  domain 159: wrote ${Object.keys(dBody).join(", ")}`);
    n++;
  } else {
    console.log("  domain 159: already populated, skip");
  }
  // module rows
  const mods = await get(
    "/domain_modules?id=in.(9,10,11)&select=id,catalog_tagline,catalog_description",
  );
  const modById = new Map(mods.map(m => [Number(m.id), m]));
  for (const mid of [9, 10, 11]) {
    const live = modById.get(mid);
    const body: Row = {};
    if (!String(live?.catalog_tagline ?? "").trim())
      body.catalog_tagline = moduleCopy[mid].catalog_tagline;
    if (!String(live?.catalog_description ?? "").trim())
      body.catalog_description = moduleCopy[mid].catalog_description;
    if (Object.keys(body).length) {
      await patch(`/domain_modules?id=eq.${mid}`, body);
      console.log(`  module ${mid}: wrote ${Object.keys(body).join(", ")}`);
      n++;
    } else {
      console.log(`  module ${mid}: already populated, skip`);
    }
  }
  console.log(`  catalog UX rows updated: ${n}`);
  return n;
}

// ============================================================
// 3. data_object_aliases (B1A-S9 / B11) - generic synonyms, alias_type='synonym'
//    No vendor/product names (Rule #18). Idempotent on (data_object_id, lower(alias_name)).
// ============================================================
const aliases: { data_object_id: number; alias_name: string }[] = [
  // relationship_records (752)
  { data_object_id: 752, alias_name: "relationship strength" },
  { data_object_id: 752, alias_name: "network signals" },
  // investor_contacts (753)
  { data_object_id: 753, alias_name: "people" },
  { data_object_id: 753, alias_name: "contacts" },
  { data_object_id: 753, alias_name: "founders" },
  // lp_prospects (754)
  { data_object_id: 754, alias_name: "LPs" },
  { data_object_id: 754, alias_name: "limited partners" },
  { data_object_id: 754, alias_name: "fund investors" },
];

async function insertAliases() {
  console.log("\n== 3. data_object_aliases (B1A-S9 / B11) ==");
  const existing = await get(
    "/data_object_aliases?data_object_id=in.(752,753,754)&select=data_object_id,alias_name",
  );
  const seen = new Set(
    existing.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`),
  );
  const toInsert = aliases
    .filter(a => !seen.has(`${a.data_object_id}|${a.alias_name.toLowerCase()}`))
    .map(a => ({
      data_object_id: a.data_object_id,
      alias_name: a.alias_name,
      alias_type: "synonym",
    }));
  if (toInsert.length) {
    const CHUNK = 50;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      await post("/data_object_aliases", toInsert.slice(i, i + CHUNK));
    }
    for (const a of toInsert) console.log(`  +${a.data_object_id}  ${a.alias_name}`);
  } else {
    console.log("  all alias rows already present, nothing to insert");
  }
  console.log(`  aliases inserted: ${toInsert.length}`);
  return toInsert.length;
}

// ============================================================
// 4. trigger_events (B1A-S3 / B9) - event_category state_change (Rule #13).
//    Idempotent on event_name. domain_module_id anchors the workflow-gate event to its module.
// ============================================================
const triggerEvents: {
  event_name: string;
  data_object_id: number;
  domain_module_id: number;
  description: string;
}[] = [
  {
    event_name: "vc_deal.ic_review_requested",
    data_object_id: 750,
    domain_module_id: 9,
    description: "Deal has cleared diligence and been put forward for an investment-committee vote.",
  },
  {
    event_name: "vc_deal.term_sheet_issued",
    data_object_id: 750,
    domain_module_id: 9,
    description: "Investment committee approved the deal and a term sheet has been issued to the company.",
  },
  {
    event_name: "vc_deal.declined",
    data_object_id: 750,
    domain_module_id: 9,
    description: "Deal has been passed on and removed from the active pipeline.",
  },
  {
    event_name: "investment_memo.submitted",
    data_object_id: 751,
    domain_module_id: 9,
    description: "Investment memo has been locked and submitted for committee review.",
  },
  {
    event_name: "investment_memo.approved",
    data_object_id: 751,
    domain_module_id: 9,
    description: "Investment committee approved the memo, recording the formal investment decision.",
  },
  {
    event_name: "lp_prospect.committed",
    data_object_id: 754,
    domain_module_id: 11,
    description: "Limited partner has firmly committed capital, ready to convert into a fund commitment.",
  },
  {
    event_name: "lp_prospect.declined",
    data_object_id: 754,
    domain_module_id: 11,
    description: "Limited partner has declined to commit for this fund.",
  },
];

async function insertTriggerEvents() {
  console.log("\n== 4. trigger_events (B1A-S3 / B9) ==");
  const names = triggerEvents.map(e => e.event_name);
  const inList = names.map(n => `"${n}"`).join(",");
  const existing = await get(
    `/trigger_events?event_name=in.(${inList})&select=event_name`,
  );
  const have = new Set(existing.map(r => String(r.event_name)));
  const toInsert = triggerEvents
    .filter(e => !have.has(e.event_name))
    .map(e => ({
      event_name: e.event_name,
      data_object_id: e.data_object_id,
      domain_module_id: e.domain_module_id,
      event_category: "state_change",
      description: e.description,
    }));
  if (toInsert.length) {
    await post("/trigger_events", toInsert);
    for (const e of toInsert) console.log(`  +${e.event_name} (do ${e.data_object_id}, mod ${e.domain_module_id})`);
  } else {
    console.log("  all trigger events already present, nothing to insert");
  }
  console.log(`  trigger events inserted: ${toInsert.length}`);
  return toInsert.length;
}

// ============================================================
// 5. data_object_lifecycle_states (B1A-S4 / B12) for the two unambiguous workflow masters.
//    Both are now entity_type=operational_workflow, so >=1 state is REQUIRED (Rule #12 B12).
//    Idempotent on (data_object_id, state_name). State-machine shape: exactly one is_initial,
//    >=1 is_terminal, monotonic unique state_order (M4).
//    752/753 are intentionally NOT given lifecycle states here: their config-shape exemption
//    (computed / operational_record) is surfaced as B2-CONFIG-SHAPE for the optional-states call.
// ============================================================
const MEMO = 751;
const LP = 754;
const lifecycleStates = [
  // investment_memos (751) -> module 9. submit/approve gates.
  { data_object_id: MEMO, state_name: "draft", state_order: 10, description: "Memo is being authored by the deal team; thesis, financials, and risks in progress.", is_initial: true, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: 9 },
  { data_object_id: MEMO, state_name: "in_review", state_order: 20, description: "Memo locked and submitted for investment-committee review.", is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "submit_memo", domain_module_id: 9 },
  { data_object_id: MEMO, state_name: "approved", state_order: 30, description: "Investment committee approved the memo, recording the formal investment decision.", is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "approve_memo", domain_module_id: 9 },
  { data_object_id: MEMO, state_name: "published", state_order: 40, description: "Final memo of record, circulated and archived for the deal file.", is_initial: false, is_terminal: true, requires_permission: false, permission_verb_override: "", domain_module_id: 9 },
  // lp_prospects (754) -> module 11. commit/decline gates; both terminal.
  { data_object_id: LP, state_name: "researching", state_order: 10, description: "Prospective limited partner identified and being researched before outreach.", is_initial: true, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: 11 },
  { data_object_id: LP, state_name: "contacted", state_order: 20, description: "Initial outreach made to the prospective limited partner.", is_initial: false, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: 11 },
  { data_object_id: LP, state_name: "in_meeting", state_order: 30, description: "Active fundraising conversations underway with the prospect.", is_initial: false, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: 11 },
  { data_object_id: LP, state_name: "soft_circled", state_order: 40, description: "Prospect has verbally indicated intent to commit, pending firm sign-off.", is_initial: false, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_id: 11 },
  { data_object_id: LP, state_name: "committed", state_order: 50, description: "Limited partner has firmly committed capital, ready to hand to fund administration.", is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "record_commitment", domain_module_id: 11 },
  { data_object_id: LP, state_name: "declined", state_order: 60, description: "Limited partner declined to commit for this fund.", is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "record_decline", domain_module_id: 11 },
];

async function insertLifecycleStates() {
  console.log("\n== 5. data_object_lifecycle_states (B1A-S4 / B12) ==");
  const existing = await get(
    `/data_object_lifecycle_states?data_object_id=in.(${MEMO},${LP})&select=data_object_id,state_name`,
  );
  const have = new Set(existing.map(r => `${r.data_object_id}|${r.state_name}`));
  const toInsert = lifecycleStates.filter(
    s => !have.has(`${s.data_object_id}|${s.state_name}`),
  );
  if (toInsert.length) {
    await post("/data_object_lifecycle_states", toInsert);
    for (const s of toInsert)
      console.log(`  +${s.data_object_id} ${s.state_order} ${s.state_name} gate=${s.requires_permission}`);
  } else {
    console.log("  all lifecycle states already present, nothing to insert");
  }
  console.log(`  lifecycle states inserted: ${toInsert.length}`);
  return toInsert.length;
}

// ============================================================
async function main() {
  const counts = {
    entity_type: await classifyEntityTypes(),
    catalog_ux: await authorCatalogUX(),
    aliases: await insertAliases(),
    trigger_events: await insertTriggerEvents(),
    lifecycle_states: await insertLifecycleStates(),
  };
  console.log("\n== SUMMARY ==");
  console.log(JSON.stringify(counts, null, 2));
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(750,751,752,753,754)");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.159");
  console.log("  https://tests.semantius.app/domain_map/domain_modules?id=in.(9,10,11)");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases?data_object_id=in.(752,753,754)");
  console.log("  https://tests.semantius.app/domain_map/trigger_events?data_object_id=in.(750,751,754)");
  console.log("  https://tests.semantius.app/domain_map/data_object_lifecycle_states?data_object_id=in.(751,754)");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
