#!/usr/bin/env bun
// EMP-EXP state-driven Validate execute pass (2026-06-07).
// Bulk additive/corrective batch for the open EMP-EXP state.yaml items classified EXECUTE.
//
// Covers:
//   1. B1A-ENTITY-TYPE  -> PATCH entity_type on the 5 EMP-EXP masters (currently unclassified).
//   2. Rule #20 catalog UX -> author + write catalog_tagline/catalog_description on the
//      domain row (62) and both modules (64, 65) where currently empty.
//   3. B1A-S6  -> INSERT trigger_events row survey_campaign.closed (state_change, data_object_id=181).
//   4. B1A-S9  -> INSERT new threshold event engagement_driver.flagged (data_object_id=183) +
//      2 intra-domain handoffs (64 -> 65): one on survey_campaign.closed, one on
//      engagement_driver.flagged.
//   5. B1A-C   -> INSERT 5 business_function_capabilities rows (caps 45-49 owned by
//      Employee Experience business function id 79).
//
// Idempotent: every write reads current state first and only inserts/patches what is missing.
// record_status is omitted on all new rows (DB default 'new' per Rule #1).

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
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

async function post(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  return call({ method: "POST", path, body: rows });
}

// ============================================================
// 1. B1A-ENTITY-TYPE: classify the 5 masters
// ============================================================
console.log("=== 1. entity_type classification (B1A-ENTITY-TYPE) ===");

// Classification per Rule #12 enum:
//   survey_campaigns (181)  -> operational_workflow (draft/launched/closed/archived lifecycle, has gates)
//   survey_responses (182)  -> operational_record    (per-respondent answer record, no business workflow)
//   engagement_drivers (183)-> computed              (calculated driver score, derived from responses)
//   action_plans (184)      -> operational_workflow  (created -> tracked -> completed, manager-owned)
//   pulse_questions (185)   -> catalog               (config-shaped question/item bank, published vs draft)
const entityTypeTargets: Array<{ id: number; name: string; entity_type: string }> = [
  { id: 181, name: "survey_campaigns", entity_type: "operational_workflow" },
  { id: 182, name: "survey_responses", entity_type: "operational_record" },
  { id: 183, name: "engagement_drivers", entity_type: "computed" },
  { id: 184, name: "action_plans", entity_type: "operational_workflow" },
  { id: 185, name: "pulse_questions", entity_type: "catalog" },
];

let entityTypePatched = 0;
for (const t of entityTypeTargets) {
  const [cur] = await get(`/data_objects?id=eq.${t.id}&select=id,entity_type`);
  if (!cur) {
    console.log(`  WARN: data_object ${t.id} (${t.name}) not found, skipping`);
    continue;
  }
  const v = String(cur.entity_type ?? "");
  if (v === "" || v === "unclassified") {
    await patch(`/data_objects?id=eq.${t.id}`, { entity_type: t.entity_type });
    entityTypePatched++;
    console.log(`  PATCH ${t.name} (${t.id}) entity_type='${t.entity_type}'`);
  } else {
    console.log(`  skip ${t.name} (${t.id}): already '${v}'`);
  }
}
console.log(`  entity_type patched: ${entityTypePatched}`);

// ============================================================
// 2. Rule #20 catalog UX: domain 62 + modules 64, 65
// ============================================================
console.log("\n=== 2. Catalog UX backfill (Rule #20) ===");

type CatalogTarget = {
  table: "domains" | "domain_modules";
  id: number;
  label: string;
  catalog_tagline: string;
  catalog_description: string;
};

const catalogTargets: CatalogTarget[] = [
  {
    table: "domains",
    id: 62,
    label: "EMP-EXP domain",
    catalog_tagline:
      "Listen to your workforce continuously and turn what you hear into action that managers actually take.",
    catalog_description:
      "Run engagement, pulse, lifecycle, and 360 feedback programs from one place. Build your question library, schedule listening cadences, and collect responses under anonymity protections your people trust. Scores roll up into the drivers that explain how teams feel, so leaders see what is working and where to focus. Hand each result to the manager who owns it as a concrete action plan, then track follow-through to closure. The full listen-and-act loop sits in a single workflow: ask, understand, act, and measure whether the action moved the needle.",
  },
  {
    table: "domain_modules",
    id: 64,
    label: "EMP-EXP-CONTINUOUS-LISTEN module",
    catalog_tagline:
      "Keep a steady pulse on engagement with surveys your people answer and scores leaders can act on.",
    catalog_description:
      "Design and run engagement, pulse, lifecycle, and 360 listening from a reusable question library. Set cadences, target the right audiences, and protect respondents with anonymity floors that keep candor high. As responses arrive, scores aggregate into engagement drivers at the team, department, and segment level, so you can spot strengths and trouble spots without combing through raw answers. This is the always-on voice-of-employee surface that feeds every downstream conversation about how the organization is doing.",
  },
  {
    table: "domain_modules",
    id: 65,
    label: "EMP-EXP-ACTION-PLANNING module",
    catalog_tagline:
      "Turn survey results into manager-owned action plans and track them through to real change.",
    catalog_description:
      "Close the loop between listening and doing. When driver scores reveal where a team needs attention, managers and HR business partners create focused action plans tied directly to the result that prompted them. Track each commitment from creation through completion, spawn the supporting tasks that get the work done, and see whether follow-through actually lifted the next round of scores. Repeated inaction becomes its own signal, so accountability stays visible and engagement programs deliver outcomes rather than just reports.",
  },
];

let catalogTaglineWrites = 0;
let catalogDescWrites = 0;
for (const t of catalogTargets) {
  const [cur] = await get(
    `/${t.table}?id=eq.${t.id}&select=id,catalog_tagline,catalog_description`,
  );
  if (!cur) {
    console.log(`  WARN: ${t.label} (${t.id}) not found, skipping`);
    continue;
  }
  const patchBody: Row = {};
  if (String(cur.catalog_tagline ?? "") === "") {
    patchBody.catalog_tagline = t.catalog_tagline;
  }
  if (String(cur.catalog_description ?? "") === "") {
    patchBody.catalog_description = t.catalog_description;
  }
  if (Object.keys(patchBody).length > 0) {
    await patch(`/${t.table}?id=eq.${t.id}`, patchBody);
    if ("catalog_tagline" in patchBody) catalogTaglineWrites++;
    if ("catalog_description" in patchBody) catalogDescWrites++;
    console.log(`  PATCH ${t.label}: wrote ${Object.keys(patchBody).join(", ")}`);
  } else {
    console.log(`  skip ${t.label}: both catalog fields already non-empty`);
  }
}
console.log(`  catalog_tagline written: ${catalogTaglineWrites}, catalog_description written: ${catalogDescWrites}`);

// ============================================================
// 3 + 4. trigger_events (B1A-S6, B1A-S9 threshold event)
// ============================================================
console.log("\n=== 3. trigger_events INSERT (B1A-S6, B1A-S9) ===");

type EventSpec = {
  event_name: string;
  event_category: string;
  data_object_id: number;
  description: string;
};

const eventSpecs: EventSpec[] = [
  {
    event_name: "survey_campaign.closed",
    event_category: "state_change",
    data_object_id: 181,
    description:
      "Engagement / pulse / lifecycle survey campaign closed. Response collection window shut; driver scores finalized and available for action planning and downstream analytics.",
  },
  {
    event_name: "engagement_driver.flagged",
    event_category: "threshold",
    data_object_id: 183,
    description:
      "An engagement driver score crossed an at-risk threshold for a team or segment. Signals that the driver warrants a manager or HRBP action plan.",
  },
];

const eventIdByName = new Map<string, number>();
for (const spec of eventSpecs) {
  const [existing] = await get(
    `/trigger_events?event_name=eq.${encodeURIComponent(spec.event_name)}&select=id,event_name`,
  );
  if (existing) {
    eventIdByName.set(spec.event_name, Number(existing.id));
    console.log(`  skip event ${spec.event_name}: already id ${existing.id}`);
  } else {
    const [created] = await post("/trigger_events", [spec]);
    eventIdByName.set(spec.event_name, Number(created.id));
    console.log(`  INSERT event ${spec.event_name} -> id ${created.id}`);
  }
}

const closedEventId = eventIdByName.get("survey_campaign.closed")!;
const flaggedEventId = eventIdByName.get("engagement_driver.flagged")!;

// ============================================================
// 4b. Intra-domain handoffs 64 -> 65 (B1A-S9)
// ============================================================
console.log("\n=== 4. Intra-domain handoffs (B1A-S9) ===");

// Natural key on handoffs: (source, target, source_module, target_module, event, data_object).
type HandoffSpec = {
  source_domain_id: number;
  target_domain_id: number;
  source_domain_module_id: number;
  target_domain_module_id: number;
  trigger_event_id: number;
  data_object_id: number;
  integration_pattern: string;
  friction_level: string;
  description: string;
};

const handoffSpecs: HandoffSpec[] = [
  {
    source_domain_id: 62,
    target_domain_id: 62,
    source_domain_module_id: 64,
    target_domain_module_id: 65,
    trigger_event_id: closedEventId,
    data_object_id: 183,
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description:
      "Survey campaign closes and finalized engagement driver scores become available. Action Planning picks up the driver results so managers can plan against the latest signal.",
  },
  {
    source_domain_id: 62,
    target_domain_id: 62,
    source_domain_module_id: 64,
    target_domain_module_id: 65,
    trigger_event_id: flaggedEventId,
    data_object_id: 183,
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description:
      "An engagement driver crosses an at-risk threshold. The flagged driver signal spawns an action plan in Action Planning for the affected team or segment.",
  },
];

const existingIntra = await get(
  "/handoffs?source_domain_id=eq.62&target_domain_id=eq.62&select=trigger_event_id,data_object_id,source_domain_module_id,target_domain_module_id",
);
const intraKey = (r: Row) =>
  `${r.source_domain_module_id}|${r.target_domain_module_id}|${r.trigger_event_id}|${r.data_object_id}`;
const existingIntraKeys = new Set(existingIntra.map(intraKey));

const missingHandoffs = handoffSpecs.filter(h => !existingIntraKeys.has(intraKey(h)));
if (missingHandoffs.length > 0) {
  const created = await post("/handoffs", missingHandoffs);
  console.log(`  INSERT ${created.length} intra-domain handoffs (ids ${created.map(r => r.id).join(", ")})`);
} else {
  console.log("  skip: both intra-domain handoffs already present");
}

// ============================================================
// 5. business_function_capabilities (B1A-C)
// ============================================================
console.log("\n=== 5. business_function_capabilities (B1A-C) ===");

// Owner attribution: Employee Experience business function (id 79) owns all 5 EMP-EXP capabilities.
const bfId = 79;
const capIds = [45, 46, 47, 48, 49];
const existingBfc = await get(
  `/business_function_capabilities?business_function_id=eq.${bfId}&capability_id=in.(${capIds.join(",")})&select=capability_id`,
);
const existingCapIds = new Set(existingBfc.map(r => Number(r.capability_id)));
const bfcRows = capIds
  .filter(c => !existingCapIds.has(c))
  .map(c => ({
    capability_id: c,
    business_function_id: bfId,
    responsibility_type: "owner",
  }));
if (bfcRows.length > 0) {
  const created = await post("/business_function_capabilities", bfcRows);
  console.log(`  INSERT ${created.length} business_function_capabilities (owner, bf 79)`);
} else {
  console.log("  skip: all 5 bf_capabilities rows already present");
}

console.log("\n=== DONE ===");
console.log("UI links:");
console.log("  https://tests.semantius.app/domain_map/data_objects");
console.log("  https://tests.semantius.app/domain_map/domains");
console.log("  https://tests.semantius.app/domain_map/domain_modules");
console.log("  https://tests.semantius.app/domain_map/trigger_events");
console.log("  https://tests.semantius.app/domain_map/handoffs");
console.log("  https://tests.semantius.app/domain_map/business_function_capabilities");
