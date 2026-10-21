#!/usr/bin/env bun
// TALENT-MGMT (domain 58) state-driven Validate execute, 2026-06-07.
// Executes the additive/corrective open state items:
//   B1A-ENTITY-TYPE  PATCH 7 masters unclassified -> operational_workflow (only if unclassified)
//   B1A-S5           INSERT up to 13 trigger_events for workflow-gate states (idempotent by event_name)
//   B1B-S4           INSERT 5 intra-domain handoffs (idempotent by source.target.dataobj.trigger_event)
//   B1A-S2           PATCH domain 58 catalog_tagline + catalog_description (empty-guarded)
//   B1A-S3           PATCH modules 51/52/53 catalog UX fields (empty-guarded)
// Idempotent: reads live state before every write; never overwrites a non-empty value.
// Run from project root:  bun run ".tmp_deploy/talent_mgmt_state_execute_2026_06_07.ts"

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

const MASTERS = [174, 175, 176, 177, 178, 179, 180];
// realizing module per master
const REALIZING: Record<number, number> = {
  174: 51, 175: 51, 177: 51, // TALENT-PERFORMANCE-MGMT
  176: 52, 178: 52, 179: 52, // TALENT-SUCCESSION-CAREER
  180: 53,                    // TALENT-CONTINUOUS-FEEDBACK
};

// ---------------------------------------------------------------------------
// B1A-ENTITY-TYPE
// ---------------------------------------------------------------------------
async function fixEntityType() {
  const rows = await get(
    `/data_objects?id=in.(${MASTERS.join(",")})&select=id,data_object_name,entity_type`,
  );
  let patched = 0;
  for (const r of rows) {
    const et = String(r.entity_type ?? "");
    if (et === "unclassified" || et === "" || r.entity_type === null) {
      await patch(`/data_objects?id=eq.${r.id}`, { entity_type: "operational_workflow" });
      console.log(`  entity_type: ${r.data_object_name} (${r.id}) -> operational_workflow`);
      patched++;
    } else {
      console.log(`  entity_type: ${r.data_object_name} (${r.id}) already '${et}', skip`);
    }
  }
  console.log(`B1A-ENTITY-TYPE: patched ${patched} masters`);
  return patched;
}

// ---------------------------------------------------------------------------
// B1A-S5  trigger_events for workflow-gate states
// ---------------------------------------------------------------------------
type EventSpec = {
  event_name: string;
  data_object_id: number;
  event_category: "lifecycle" | "state_change";
  description: string;
};
const EVENTS: EventSpec[] = [
  { event_name: "performance_review.self_assessment_started", data_object_id: 174, event_category: "lifecycle", description: "Employee self-assessment phase opens on the review cycle. Read-write access shifts to the worker for the self-rating window." },
  { event_name: "performance_review.manager_assessment_started", data_object_id: 174, event_category: "lifecycle", description: "Manager assessment phase opens after self-assessment. The reviewing manager records ratings and narrative." },
  { event_name: "performance_review.submitted", data_object_id: 174, event_category: "state_change", description: "Manager submits the completed review for calibration. The record locks against further rating edits pending calibration." },
  { event_name: "performance_review.calibrated", data_object_id: 174, event_category: "state_change", description: "Calibration adjusts the rating to fit the normalized distribution. The calibrated outcome supersedes the manager's draft rating." },
  { event_name: "performance_review.published", data_object_id: 174, event_category: "state_change", description: "Final review is released to the employee. Drives merit recommendations, 9-box derivation, and successor-readiness reassessment." },
  { event_name: "performance_goal.approved", data_object_id: 175, event_category: "state_change", description: "Goal is approved and committed for the period. The goal becomes active and measurable against its metric and weight." },
  { event_name: "performance_goal.cancelled", data_object_id: 175, event_category: "state_change", description: "Goal is cancelled before completion (reorg, role change, deprioritization). The goal exits the active set without a completion outcome." },
  { event_name: "talent_calibration.ratings_locked", data_object_id: 177, event_category: "state_change", description: "Calibration committee locks the normalized ratings at the end of the session. Reviews can no longer be re-rated for this population." },
  { event_name: "talent_calibration.published", data_object_id: 177, event_category: "state_change", description: "Calibration outcomes are published to the affected reviews and downstream consumers. The session reaches its terminal state." },
  { event_name: "succession_plan.reviewed", data_object_id: 176, event_category: "state_change", description: "Bench plan passes business-unit review of successors and readiness ratings ahead of publishing." },
  { event_name: "succession_plan.archived", data_object_id: 176, event_category: "state_change", description: "Superseded or expired succession plan is archived. The plan exits the active bench and is retained for audit." },
  { event_name: "nine_box_placement.confirmed", data_object_id: 178, event_category: "state_change", description: "Performance-by-potential placement is confirmed for the cycle. Drives succession-plan revision and differentiated investment." },
  { event_name: "feedback_record.shared", data_object_id: 180, event_category: "state_change", description: "Continuous-feedback record is shared with the recipient. Feeds the next formal review cycle as supporting context." },
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
    to_state: "",
    description: e.description,
    domain_module_id: REALIZING[e.data_object_id] ?? null,
  }));
  if (missing.length > 0) {
    const inserted = await post("/trigger_events", missing);
    for (const r of inserted) have.set(String(r.event_name), Number(r.id));
    console.log(`B1A-S5: inserted ${missing.length} trigger_events`);
  } else {
    console.log(`B1A-S5: all ${EVENTS.length} trigger_events already present`);
  }
  // re-read to be safe
  const all = await get(
    `/trigger_events?event_name=in.(${names.map(n => encodeURIComponent(n)).join(",")})&select=id,event_name`,
  );
  for (const r of all) have.set(String(r.event_name), Number(r.id));
  // pre-existing events the intra-domain handoffs reference (not authored here)
  const pre = await get(
    `/trigger_events?event_name=in.(${["talent_calibration.completed", "performance_goal.completed"].map(encodeURIComponent).join(",")})&select=id,event_name`,
  );
  for (const r of pre) have.set(String(r.event_name), Number(r.id));
  return have;
}

// ---------------------------------------------------------------------------
// B1B-S4  intra-domain handoffs (5)
// ---------------------------------------------------------------------------
type HandoffSpec = {
  src_mod: number;
  tgt_mod: number;
  data_object_id: number;
  event_name: string;
  description: string;
};
const HANDOFFS: HandoffSpec[] = [
  { src_mod: 51, tgt_mod: 52, data_object_id: 174, event_name: "talent_calibration.completed", description: "Calibrated performance ratings feed 9-box placement derivation in succession and career planning." },
  { src_mod: 51, tgt_mod: 52, data_object_id: 174, event_name: "performance_review.published", description: "Published review unlocks successor-readiness reassessment for the worker's positions on the bench." },
  { src_mod: 53, tgt_mod: 51, data_object_id: 180, event_name: "feedback_record.shared", description: "Shared continuous feedback feeds the next formal review cycle as supporting context." },
  { src_mod: 51, tgt_mod: 52, data_object_id: 175, event_name: "performance_goal.completed", description: "Completed goal signals career-development progress and informs succession readiness." },
  { src_mod: 52, tgt_mod: 52, data_object_id: 178, event_name: "nine_box_placement.confirmed", description: "Confirmed placement triggers revision of the affected succession plan." },
];

async function loadHandoffs(eventIds: Map<string, number>) {
  const existing = await get(
    `/handoffs?source_domain_id=eq.58&target_domain_id=eq.58&select=id,data_object_id,trigger_event_id`,
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
      source_domain_id: 58,
      target_domain_id: 58,
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
    console.log(`B1B-S4: inserted ${toInsert.length} intra-domain handoffs`);
  } else {
    console.log(`B1B-S4: all intra-domain handoffs already present`);
  }
  return toInsert.length;
}

// ---------------------------------------------------------------------------
// B1A-S2 / B1A-S3  catalog UX (empty-guarded)
// ---------------------------------------------------------------------------
const DOMAIN_TAGLINE =
  "Grow, evaluate, and retain your people with one connected talent practice, from goals and reviews to succession and continuous feedback.";
const DOMAIN_DESCRIPTION =
  "Run the full talent cycle in one place. Set and track individual goals, run performance reviews with self and manager assessments, and calibrate ratings across teams to keep them fair and consistent.\n\n" +
  "Spot and develop your future leaders. Place people on a performance-by-potential grid, build succession plans for critical roles, and capture each person's career aspirations so you can match them to internal moves.\n\n" +
  "Keep the conversation going all year. Capture kudos, one-on-one notes, and requested feedback that feed naturally into the next review, so recognition and coaching never wait for an annual cycle.";

const MODULE_COPY: Record<number, { tagline: string; description: string }> = {
  51: {
    tagline:
      "Set goals, run reviews, and calibrate ratings so performance management stays fair, consistent, and tied to results.",
    description:
      "Give every employee clear goals and a structured review. Define individual goals and OKRs with metrics and weights, then track progress through the year and roll outcomes into the review cycle.\n\n" +
      "Run reviews the way your business works. Move each review through self-assessment, manager assessment, submission, and publishing, with the right people gated into each step.\n\n" +
      "Remove rater bias with calibration. Bring managers together to normalize ratings across teams, lock the calibrated outcomes, and publish results that downstream merit, succession, and 9-box decisions can trust.",
  },
  52: {
    tagline:
      "Build the bench for critical roles and give people a clear path forward with succession plans, 9-box placement, and career aspirations.",
    description:
      "Protect the business from key-person risk. Build succession plans for critical positions, identify ready successors with readiness ratings, and capture risk-of-loss so you always know where the gaps are.\n\n" +
      "See talent at a glance. Place people on a performance-by-potential grid to focus development and investment where it pays off, and feed confirmed placements straight back into succession planning.\n\n" +
      "Make career growth a two-way conversation. Record each person's target roles and mobility preferences so you can match them to internal opportunities and keep your best people moving forward.",
  },
  53: {
    tagline:
      "Keep feedback flowing all year with kudos, one-on-one notes, and requested feedback that feed straight into reviews.",
    description:
      "Make recognition and coaching part of everyday work. Capture kudos, one-on-one notes, peer comments, and requested feedback as they happen, independent of the formal review calendar.\n\n" +
      "Share feedback with the right timing and the right people. Move each record from draft to shared to acknowledged so feedback lands clearly and is confirmed by the recipient.\n\n" +
      "Connect continuous feedback to formal performance. Aggregate the year's feedback into review summaries so managers walk into every review with the full picture.",
  },
};

async function fixDomainCatalog() {
  const [d] = await get(
    `/domains?id=eq.58&select=id,catalog_tagline,catalog_description`,
  );
  if (!d) throw new Error("domain 58 not found");
  const body: Row = {};
  if (!String(d.catalog_tagline ?? "").trim()) body.catalog_tagline = DOMAIN_TAGLINE;
  if (!String(d.catalog_description ?? "").trim()) body.catalog_description = DOMAIN_DESCRIPTION;
  if (Object.keys(body).length > 0) {
    await patch(`/domains?id=eq.58`, body);
    console.log(`B1A-S2: wrote domain 58 catalog fields: ${Object.keys(body).join(", ")}`);
    return 1;
  }
  console.log(`B1A-S2: domain 58 catalog fields already populated, skip`);
  return 0;
}

async function fixModuleCatalog() {
  const mods = await get(
    `/domain_modules?id=in.(51,52,53)&select=id,domain_module_code,catalog_tagline,catalog_description`,
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
      console.log(`B1A-S3: wrote module ${m.domain_module_code} (${m.id}) catalog fields: ${Object.keys(body).join(", ")}`);
      count++;
    } else {
      console.log(`B1A-S3: module ${m.domain_module_code} (${m.id}) already populated, skip`);
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
async function main() {
  console.log("== TALENT-MGMT state execute 2026-06-07 ==");
  const etCount = await fixEntityType();
  const eventIds = await loadEvents();
  const hoCount = await loadHandoffs(eventIds);
  const domCount = await fixDomainCatalog();
  const modCount = await fixModuleCatalog();

  console.log("\n== Summary ==");
  console.log(`entity_type patched: ${etCount}`);
  console.log(`trigger_events present (target ${EVENTS.length}): resolved ${eventIds.size}`);
  console.log(`intra-domain handoffs inserted: ${hoCount}`);
  console.log(`domain catalog rows written: ${domCount}`);
  console.log(`module catalog rows written: ${modCount}`);
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(174,175,176,177,178,179,180)");
  console.log("  https://tests.semantius.app/domain_map/trigger_events?data_object_id=in.(174,175,176,177,178,180)");
  console.log("  https://tests.semantius.app/domain_map/handoffs?source_domain_id=eq.58&target_domain_id=eq.58");
  console.log("  https://tests.semantius.app/domain_map/domain_modules?domain_id=eq.58");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
