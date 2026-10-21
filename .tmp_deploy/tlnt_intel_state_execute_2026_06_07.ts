#!/usr/bin/env bun
// TLNT-INTEL (domain 170) state-driven Validate execute, 2026-06-07.
// Executes the additive/corrective open state items only:
//   B1A-ENTITY-TYPE  PATCH 7 masters unclassified -> typed enum (only if unclassified)
//   B1A-S1           INSERT trigger_events for the 7 masters (idempotent by event_name)
//   B1B-S3           INSERT 3 intra-domain handoffs 170->170 (idempotent by data_object_id|trigger_event_id)
//   B1A-S10 (A4)     PATCH domain 170 catalog_tagline + catalog_description (empty-guarded)
//   B1A-S11 (M8)     PATCH modules 175/176/177 catalog UX fields (empty-guarded)
//   B1A-S6 (B11)     INSERT synonym aliases on 5 empty masters (idempotent by data_object_id|alias_name)
// Idempotent: reads live state before every write; never overwrites a non-empty value.
// Run from project root:  bun run ".tmp_deploy/tlnt_intel_state_execute_2026_06_07.ts"

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
const post = (path: string, body: Row | Row[]) => call({ method: "POST", path, body });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });

const MASTERS = [859, 860, 861, 862, 863, 864, 865];
// realizing module per master: 859/860/864 -> 175 MARKETPLACE; 861/862/863/865 -> 176 MOBILITY
const REALIZING: Record<number, number> = {
  859: 175, 860: 175, 864: 175,
  861: 176, 862: 176, 863: 176, 865: 176,
};

// ---------------------------------------------------------------------------
// B1A-ENTITY-TYPE  (deterministic from each master's description, Rule #12)
// ---------------------------------------------------------------------------
const ENTITY_TYPE: Record<number, string> = {
  859: "operational_workflow", // internal_opportunities: open/closed/cancelled posting lifecycle
  860: "operational_workflow", // opportunity_applications: submitted/reviewed/accepted/rejected/withdrawn workflow
  864: "operational_workflow", // mentorship_engagements: matched relationship with status lifecycle
  861: "computed",             // mobility_recommendations: AI-generated next-move projection
  862: "computed",             // fit_scores: computed person-to-role match score
  863: "computed",             // career_path_suggestions: AI-projected career route
  865: "operational_record",   // match_inference_runs: append-only audit record of a scoring batch
};

async function fixEntityType() {
  const rows = await get(
    `/data_objects?id=in.(${MASTERS.join(",")})&select=id,data_object_name,entity_type`,
  );
  let patched = 0;
  for (const r of rows) {
    const id = Number(r.id);
    const et = String(r.entity_type ?? "");
    const target = ENTITY_TYPE[id];
    if (!target) continue;
    if (et === "unclassified" || et === "" || r.entity_type === null) {
      await patch(`/data_objects?id=eq.${id}`, { entity_type: target });
      console.log(`  entity_type: ${r.data_object_name} (${id}) -> ${target}`);
      patched++;
    } else {
      console.log(`  entity_type: ${r.data_object_name} (${id}) already '${et}', skip`);
    }
  }
  console.log(`B1A-ENTITY-TYPE: patched ${patched} masters`);
  return patched;
}

// ---------------------------------------------------------------------------
// B1A-S1  trigger_events (per state action: state_change for transitions, lifecycle for inference outputs)
// ---------------------------------------------------------------------------
type EventSpec = {
  event_name: string;
  data_object_id: number;
  event_category: "lifecycle" | "state_change";
  to_state: string;
  description: string;
};
const EVENTS: EventSpec[] = [
  // 859 internal_opportunities lifecycle (state_change)
  { event_name: "opportunity.opened", data_object_id: 859, event_category: "state_change", to_state: "open", description: "An internal opportunity is opened and published to the marketplace. Matching recomputes against eligible employees and the posting accepts applications." },
  { event_name: "opportunity.closed", data_object_id: 859, event_category: "state_change", to_state: "closed", description: "An internal opportunity is closed to new applications. The posting stops accepting expressions of interest and proceeds to selection." },
  { event_name: "opportunity.cancelled", data_object_id: 859, event_category: "state_change", to_state: "cancelled", description: "An internal opportunity is cancelled before filling. Outstanding applications are withdrawn and the posting exits the active marketplace." },
  // 860 opportunity_applications lifecycle (state_change)
  { event_name: "opportunity_application.submitted", data_object_id: 860, event_category: "state_change", to_state: "submitted", description: "An employee submits an application to an internal opportunity. The application enters the review queue and the applicant is scored against the role." },
  { event_name: "opportunity_application.under_review", data_object_id: 860, event_category: "state_change", to_state: "under_review", description: "An application moves into review. The hiring manager evaluates the applicant against the role using fit scores and profile evidence." },
  { event_name: "opportunity_application.accepted", data_object_id: 860, event_category: "state_change", to_state: "accepted", description: "An application is accepted. The internal move is approved and the accepted application becomes the source of a downstream worker reassignment or candidate move." },
  { event_name: "opportunity_application.rejected", data_object_id: 860, event_category: "state_change", to_state: "rejected", description: "An application is rejected. The applicant exits the selection flow for this opportunity and may be redirected to other matches." },
  // 864 mentorship_engagements lifecycle (state_change)
  { event_name: "mentorship.activated", data_object_id: 864, event_category: "state_change", to_state: "active", description: "A mentor-mentee match is activated. The pairing becomes an active engagement with goals and a meeting cadence." },
  { event_name: "mentorship.completed", data_object_id: 864, event_category: "state_change", to_state: "completed", description: "A mentorship engagement reaches its goals and completes. The relationship closes and outcomes feed development records." },
  // inference outputs (lifecycle)
  { event_name: "fit_score.computed", data_object_id: 862, event_category: "lifecycle", to_state: "", description: "A fit score is computed for a person against a role or opportunity. The score, drivers, and model version are recorded for ranking and downstream succession or hiring decisions." },
  { event_name: "mobility_recommendation.produced", data_object_id: 861, event_category: "lifecycle", to_state: "", description: "A mobility recommendation is produced for an employee. The next-move suggestion with rationale becomes available on the employee's recommendation surface." },
  { event_name: "career_path.projected", data_object_id: 863, event_category: "lifecycle", to_state: "", description: "A career-path suggestion is projected from a current role toward an aspiration, including the required skills, and is published to the employee and to career planning." },
  { event_name: "match_inference_run.completed", data_object_id: 865, event_category: "lifecycle", to_state: "", description: "A matching or scoring batch completes. The run's outputs (fit scores, recommendations) are finalized and its inputs and model version are recorded for audit." },
];

async function loadEvents(): Promise<Map<string, number>> {
  const names = EVENTS.map(e => e.event_name);
  const existing = await get(
    `/trigger_events?event_name=in.(${names.map(n => encodeURIComponent(n)).join(",")})&select=id,event_name`,
  );
  const have = new Map<string, number>();
  for (const r of existing) have.set(String(r.event_name), Number(r.id));
  const missing = EVENTS.filter(e => !have.has(e.event_name)).map(e => ({
    event_name: e.event_name,
    data_object_id: e.data_object_id,
    event_category: e.event_category,
    from_state: "",
    to_state: e.to_state,
    description: e.description,
    domain_module_id: REALIZING[e.data_object_id] ?? null,
  }));
  if (missing.length > 0) {
    const inserted = await post("/trigger_events", missing);
    for (const r of inserted) have.set(String(r.event_name), Number(r.id));
    console.log(`B1A-S1: inserted ${missing.length} trigger_events`);
  } else {
    console.log(`B1A-S1: all ${EVENTS.length} trigger_events already present`);
  }
  const all = await get(
    `/trigger_events?event_name=in.(${names.map(n => encodeURIComponent(n)).join(",")})&select=id,event_name`,
  );
  for (const r of all) have.set(String(r.event_name), Number(r.id));
  return have;
}

// ---------------------------------------------------------------------------
// B1B-S3  intra-domain handoffs (3); 170->170, lifecycle_progression, low friction
// ---------------------------------------------------------------------------
type HandoffSpec = {
  src_mod: number;
  tgt_mod: number;
  data_object_id: number;
  event_name: string;
  description: string;
};
const HANDOFFS: HandoffSpec[] = [
  { src_mod: 175, tgt_mod: 176, data_object_id: 859, event_name: "opportunity.opened", description: "A newly opened opportunity triggers MOBILITY to recompute match inferences and fit scores for eligible employees." },
  { src_mod: 176, tgt_mod: 175, data_object_id: 862, event_name: "fit_score.computed", description: "Freshly computed fit scores let MARKETPLACE rank applicants against the opportunity during application review." },
  { src_mod: 175, tgt_mod: 176, data_object_id: 860, event_name: "opportunity_application.submitted", description: "A submitted application triggers MOBILITY to score the applicant against the target role." },
];

async function loadHandoffs(eventIds: Map<string, number>) {
  const existing = await get(
    `/handoffs?source_domain_id=eq.170&target_domain_id=eq.170&select=id,data_object_id,trigger_event_id`,
  );
  const existKey = new Set(
    existing.map(r => `${r.data_object_id}|${r.trigger_event_id}`),
  );
  const toInsert: Row[] = [];
  for (const h of HANDOFFS) {
    const evId = eventIds.get(h.event_name);
    if (!evId) {
      console.log(`  WARN intra-handoff: event ${h.event_name} not resolved, skipping`);
      continue;
    }
    const key = `${h.data_object_id}|${evId}`;
    if (existKey.has(key)) {
      console.log(`  intra-handoff ${h.event_name} already present, skip`);
      continue;
    }
    toInsert.push({
      source_domain_id: 170,
      target_domain_id: 170,
      data_object_id: h.data_object_id,
      trigger_event_id: evId,
      source_domain_module_id: h.src_mod,
      target_domain_module_id: h.tgt_mod,
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      description: h.description,
      notes: "",
    });
  }
  if (toInsert.length > 0) {
    await post("/handoffs", toInsert);
    console.log(`B1B-S3: inserted ${toInsert.length} intra-domain handoffs`);
  } else {
    console.log(`B1B-S3: all intra-domain handoffs already present`);
  }
  return toInsert.length;
}

// ---------------------------------------------------------------------------
// B1A-S6  aliases (synonyms) on the 5 empty masters (860, 862, 863, 864, 865)
// 859 already has 4; 861 already has 2 (the 863 placement question is left to the user).
// ---------------------------------------------------------------------------
type AliasSpec = { data_object_id: number; alias_name: string };
const ALIASES: AliasSpec[] = [
  { data_object_id: 860, alias_name: "applications" },
  { data_object_id: 860, alias_name: "internal applications" },
  { data_object_id: 860, alias_name: "expressions of interest" },
  { data_object_id: 862, alias_name: "match scores" },
  { data_object_id: 862, alias_name: "talent scores" },
  { data_object_id: 862, alias_name: "fit ratings" },
  { data_object_id: 863, alias_name: "career path recommendations" },
  { data_object_id: 863, alias_name: "growth paths" },
  { data_object_id: 864, alias_name: "mentoring pairs" },
  { data_object_id: 864, alias_name: "mentorship sessions" },
  { data_object_id: 864, alias_name: "mentor matches" },
  { data_object_id: 865, alias_name: "inference jobs" },
  { data_object_id: 865, alias_name: "model runs" },
  { data_object_id: 865, alias_name: "scoring batches" },
];

async function loadAliases() {
  const ids = [...new Set(ALIASES.map(a => a.data_object_id))];
  const existing = await get(
    `/data_object_aliases?data_object_id=in.(${ids.join(",")})&select=data_object_id,alias_name`,
  );
  const existKey = new Set(
    existing.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`),
  );
  const toInsert = ALIASES.filter(
    a => !existKey.has(`${a.data_object_id}|${a.alias_name.toLowerCase()}`),
  ).map(a => ({
    data_object_id: a.data_object_id,
    alias_name: a.alias_name,
    alias_type: "synonym",
    is_preferred: false,
    notes: "",
  }));
  if (toInsert.length > 0) {
    await post("/data_object_aliases", toInsert);
    console.log(`B1A-S6: inserted ${toInsert.length} aliases`);
  } else {
    console.log(`B1A-S6: all aliases already present`);
  }
  return toInsert.length;
}

// ---------------------------------------------------------------------------
// B1A-S10 (A4) domain catalog UX  +  B1A-S11 (M8) module catalog UX (empty-guarded)
// ---------------------------------------------------------------------------
const DOMAIN_TAGLINE =
  "Match your people to internal opportunities, surface their next best move, and make skills-based talent decisions you can stand behind.";
const DOMAIN_DESCRIPTION =
  "Open up internal mobility. Post gigs, projects, stretch assignments, and full-time internal roles in one marketplace, then let AI matching put each opportunity in front of the employees who fit it best.\n\n" +
  "Show every employee their next move. Generate personalized mobility recommendations, fit scores, and projected career paths from each person's skills and aspirations, so growth conversations start with real options instead of guesswork.\n\n" +
  "Decide with evidence, and keep the receipts. See org-wide skills heatmaps and gaps for workforce planning, and keep an auditable trail of every match and score the models produce so your talent decisions stay defensible.";

const MODULE_COPY: Record<number, { tagline: string; description: string }> = {
  175: {
    tagline:
      "Run an internal talent marketplace where employees discover and apply to gigs, projects, mentorships, and internal roles.",
    description:
      "Give your people one place to grow without leaving. Post internal opportunities of every shape, gigs, projects, stretch assignments, mentorships, and full-time moves, and let employees browse and apply.\n\n" +
      "Move applications through a clear flow. Track each expression of interest from submitted through review to accepted or rejected, with the right approvers gated into each step.\n\n" +
      "Connect people to mentors. Match mentors and mentees, set goals and a cadence, and follow each engagement through to completion so development happens in the open.",
  },
  176: {
    tagline:
      "Surface AI fit scores, mobility recommendations, and career paths that guide every employee toward their next best move.",
    description:
      "Turn skills data into next steps. Compute fit scores between people and roles, generate mobility recommendations with clear rationale, and project career paths from where someone is to where they want to go.\n\n" +
      "Support skills-based hiring and succession. Rank candidates by fit for open roles and successor slots so managers make faster, fairer talent decisions grounded in evidence.\n\n" +
      "Keep recommendations fresh and explainable. Each match run records its inputs, model version, and outputs, so every score and suggestion can be traced and trusted.",
  },
  177: {
    tagline:
      "Give HR leaders org-wide skills heatmaps and gap analytics to see where talent is strong and where it is thin.",
    description:
      "See your workforce's capabilities at a glance. Roll individual skills and inferences up into org-level heatmaps that show concentration, depth, and coverage across teams.\n\n" +
      "Find the gaps before they bite. Compare the skills you have against the skills you need and pinpoint where to hire, develop, or redeploy.\n\n" +
      "Feed strategic workforce planning. Hand clean supply-and-gap signals to planning so capability decisions line up with where the business is headed.",
  },
};

async function fixDomainCatalog() {
  const [d] = await get(`/domains?id=eq.170&select=id,catalog_tagline,catalog_description`);
  if (!d) throw new Error("domain 170 not found");
  const body: Row = {};
  if (!String(d.catalog_tagline ?? "").trim()) body.catalog_tagline = DOMAIN_TAGLINE;
  if (!String(d.catalog_description ?? "").trim()) body.catalog_description = DOMAIN_DESCRIPTION;
  if (Object.keys(body).length > 0) {
    await patch(`/domains?id=eq.170`, body);
    console.log(`B1A-S10: wrote domain 170 catalog fields: ${Object.keys(body).join(", ")}`);
    return 1;
  }
  console.log(`B1A-S10: domain 170 catalog fields already populated, skip`);
  return 0;
}

async function fixModuleCatalog() {
  const mods = await get(
    `/domain_modules?id=in.(175,176,177)&select=id,domain_module_code,catalog_tagline,catalog_description`,
  );
  let count = 0;
  for (const m of mods) {
    const copy = MODULE_COPY[Number(m.id)];
    if (!copy) continue;
    const body: Row = {};
    if (!String(m.catalog_tagline ?? "").trim()) body.catalog_tagline = copy.tagline;
    if (!String(m.catalog_description ?? "").trim()) body.catalog_description = copy.description;
    if (Object.keys(body).length > 0) {
      await patch(`/domain_modules?id=eq.${m.id}`, body);
      console.log(`B1A-S11: wrote module ${m.domain_module_code} (${m.id}) catalog fields: ${Object.keys(body).join(", ")}`);
      count++;
    } else {
      console.log(`B1A-S11: module ${m.domain_module_code} (${m.id}) already populated, skip`);
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
async function main() {
  console.log("== TLNT-INTEL state execute 2026-06-07 ==");
  const etCount = await fixEntityType();
  const eventIds = await loadEvents();
  const hoCount = await loadHandoffs(eventIds);
  const aliasCount = await loadAliases();
  const domCount = await fixDomainCatalog();
  const modCount = await fixModuleCatalog();

  console.log("\n== Summary ==");
  console.log(`entity_type patched: ${etCount}`);
  console.log(`trigger_events present (target ${EVENTS.length}): resolved ${eventIds.size}`);
  console.log(`intra-domain handoffs inserted: ${hoCount}`);
  console.log(`aliases inserted: ${aliasCount}`);
  console.log(`domain catalog rows written: ${domCount}`);
  console.log(`module catalog rows written: ${modCount}`);
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(859,860,861,862,863,864,865)");
  console.log("  https://tests.semantius.app/domain_map/trigger_events?data_object_id=in.(859,860,861,862,863,865)");
  console.log("  https://tests.semantius.app/domain_map/handoffs?source_domain_id=eq.170");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases?data_object_id=in.(860,862,863,864,865)");
  console.log("  https://tests.semantius.app/domain_map/domain_modules?domain_id=eq.170");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
