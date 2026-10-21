#!/usr/bin/env bun
// FSQM b1a execution (2026-06-06). Idempotent. Run from project root:
//   bun run .tmp_deploy/fix_fsqm_b1a_2026_06_06.ts
//
// Executes these b1a items against the live domain_map module:
//   B1A-MODULE-SYSTEM-SKILLS  - 3 module system skills (259/263/264) + skill_tools,
//                               then DELETE legacy skill 64 + its 8 skill_tools.
//   B1A-MODULE-CATALOG-UX     - write catalog_tagline + catalog_description (empty-guard)
//                               on domain 157 and modules 259/263/264.
//   B1A-LIFECYCLE-STATES      - set entity_type=operational_workflow on 7 masters
//                               (prerequisite per Rule #12), author lifecycle states.
//   B1A-S7                    - 4 new trigger_events + corresponding handoffs.
//   B1A-HANDOFF-MODULE-FK     - backfill source/target_domain_module_id on 13 handoffs.
//
// SKIPPED (not executed here): B1A-S3 pattern-flag review (needs per-row user confirm).

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
const post = (path: string, body: Row[] | Row) => call({ method: "POST", path, body });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });
const del = (path: string) => call({ method: "DELETE", path });

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map(r => {
    const out: Row = {};
    for (const k of keys) out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return out;
  });
}
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    out.push(...(await post(path, slice)));
  }
  return out;
}

const MOD_259 = 259, MOD_263 = 263, MOD_264 = 264;

// ============================================================
// 1. B1A-MODULE-CATALOG-UX  (empty-guard; revised Rule #20)
// ============================================================
async function catalogUx() {
  console.log("\n== B1A-MODULE-CATALOG-UX ==");

  const domainCopy: Record<number, { tagline: string; description: string }> = {
    157: {
      tagline:
        "Keep food safe from receiving to release with one connected food-safety program.",
      description:
        "Run your entire food-safety and quality program in one place. Build and approve HACCP and preventive-control plans, monitor critical control points in real time, and act on deviations before product ships. Manage allergen controls, sanitation cycles, and environmental monitoring, then capture the records that prove control.\n\nWhen something goes wrong, open an incident, drive corrective action, and escalate to recall in a few clicks. Walk into certification audits with evidence already organized, score and segment your suppliers by risk, and stay ahead of the obligations that regulators and retail customers expect you to meet.",
    },
  };

  const moduleCopy: Record<number, { tagline: string; description: string }> = {
    [MOD_259]: {
      tagline:
        "Build HACCP plans and catch every critical-limit deviation as it happens.",
      description:
        "Author HACCP and preventive-control plans, define critical control points with their critical limits, and route each plan through review and approval before it takes effect. Capture monitoring readings at the line on every shift and flag deviations the moment a limit is crossed.\n\nWhen a reading goes out of limit, trigger a product hold, open a food-safety incident, and work the corrective action through to closure, with a full record of who did what and when for your next audit.",
    },
    [MOD_263]: {
      tagline:
        "Run allergen, sanitation, and environmental monitoring without the spreadsheets.",
      description:
        "Map allergens by product and line, validate changeovers, and review labels so the right warnings reach the right packaging. Plan environmental-monitoring swabs by zone, track results, and watch for trends before a single positive becomes a pattern.\n\nSchedule master sanitation, confirm each cycle is completed and verified, and keep pre-operational inspection evidence ready. Every hygiene and contamination-control activity lands in one record set you can hand to an auditor on request.",
    },
    [MOD_264]: {
      tagline:
        "Walk into every certification audit prepared and keep supplier risk in view.",
      description:
        "Prepare for benchmarked certification audits with evidence binders, score forecasts, and a calendar that keeps nothing a surprise. Score and segment your ingredient and packaging suppliers by safety and food-fraud risk, and track the certifications and compliance obligations each one owes you.\n\nWhen a recall is unavoidable, execute it with traceability and regulatory reporting built in, so you can act fast and show your work to customers and authorities.",
    },
  };

  // Domain 157
  for (const [idStr, copy] of Object.entries(domainCopy)) {
    const id = Number(idStr);
    const [cur] = await get(
      `/domains?id=eq.${id}&select=catalog_tagline,catalog_description`,
    );
    const body: Row = {};
    if (!String(cur?.catalog_tagline ?? "").trim()) body.catalog_tagline = copy.tagline;
    if (!String(cur?.catalog_description ?? "").trim())
      body.catalog_description = copy.description;
    if (Object.keys(body).length) {
      await patch(`/domains?id=eq.${id}`, body);
      console.log(`  domain ${id}: wrote ${Object.keys(body).join(", ")}`);
    } else {
      console.log(`  domain ${id}: already populated, skipped`);
    }
  }

  // Modules 259/263/264
  for (const [idStr, copy] of Object.entries(moduleCopy)) {
    const id = Number(idStr);
    const [cur] = await get(
      `/domain_modules?id=eq.${id}&select=catalog_tagline,catalog_description`,
    );
    const body: Row = {};
    if (!String(cur?.catalog_tagline ?? "").trim()) body.catalog_tagline = copy.tagline;
    if (!String(cur?.catalog_description ?? "").trim())
      body.catalog_description = copy.description;
    if (Object.keys(body).length) {
      await patch(`/domain_modules?id=eq.${id}`, body);
      console.log(`  module ${id}: wrote ${Object.keys(body).join(", ")}`);
    } else {
      console.log(`  module ${id}: already populated, skipped`);
    }
  }
}

// ============================================================
// 2. B1A-LIFECYCLE-STATES  (entity_type prereq + states)
// ============================================================
const MASTERS: Record<number, string> = {
  507: "haccp_plans",
  508: "critical_control_points",
  509: "ccp_measurements",
  510: "food_safety_incidents",
  511: "allergen_programs",
  512: "environmental_monitoring_samples",
  513: "sanitation_records",
};

// state machines per the b1a action. requires_permission=true marks workflow-gate states.
type St = {
  name: string;
  order: number;
  initial?: boolean;
  terminal?: boolean;
  gate?: boolean;
  desc: string;
};
const STATE_MACHINES: Record<number, { module: number; states: St[] }> = {
  507: {
    module: MOD_259,
    states: [
      { name: "draft", order: 1, initial: true, desc: "Plan is being authored by the preventive-controls qualified individual." },
      { name: "reviewed", order: 2, gate: true, desc: "Plan has been reviewed for hazard analysis completeness." },
      { name: "approved", order: 3, gate: true, desc: "Plan is signed off and authorized to take effect." },
      { name: "in_effect", order: 4, gate: true, desc: "Plan is the governing food-safety plan on the line." },
      { name: "superseded", order: 5, desc: "A newer revision has replaced this plan." },
      { name: "archived", order: 6, terminal: true, desc: "Plan is retained for the record but no longer active." },
    ],
  },
  508: {
    module: MOD_259,
    states: [
      { name: "defined", order: 1, initial: true, desc: "Critical control point is defined with its critical limits." },
      { name: "active", order: 2, gate: true, desc: "CCP is live and being monitored on the line." },
      { name: "deactivated", order: 3, terminal: true, gate: true, desc: "CCP is no longer in use following plan change." },
    ],
  },
  509: {
    module: MOD_259,
    states: [
      { name: "recorded", order: 1, initial: true, desc: "Monitoring reading captured at the line." },
      { name: "reviewed", order: 2, gate: true, desc: "Supervisor has reviewed the reading." },
      { name: "in_deviation", order: 3, desc: "Reading is outside the critical limit." },
      { name: "corrected", order: 4, terminal: true, gate: true, desc: "Corrective action applied and deviation resolved." },
    ],
  },
  510: {
    module: MOD_259,
    states: [
      { name: "opened", order: 1, initial: true, desc: "Food-safety incident has been opened." },
      { name: "under_investigation", order: 2, gate: true, desc: "Root-cause investigation is underway." },
      { name: "contained", order: 3, gate: true, desc: "Affected product is held and contamination is contained." },
      { name: "corrected", order: 4, gate: true, desc: "Corrective and preventive action is in place." },
      { name: "closed", order: 5, terminal: true, gate: true, desc: "Incident is resolved and closed; record is locked." },
      { name: "escalated", order: 6, terminal: true, gate: true, desc: "Incident has been escalated to a recall." },
    ],
  },
  511: {
    module: MOD_263,
    states: [
      { name: "draft", order: 1, initial: true, desc: "Allergen program is being drafted." },
      { name: "approved", order: 2, gate: true, desc: "QA has approved the allergen program." },
      { name: "active", order: 3, gate: true, desc: "Allergen controls are in force on the line." },
      { name: "suspended", order: 4, terminal: true, gate: true, desc: "Program is suspended pending review." },
    ],
  },
  512: {
    module: MOD_263,
    states: [
      { name: "collected", order: 1, initial: true, desc: "Environmental swab has been collected." },
      { name: "in_lab", order: 2, desc: "Sample is at the lab awaiting result." },
      { name: "result_received", order: 3, gate: true, desc: "Lab result has been received and logged." },
      { name: "adverse", order: 4, desc: "Result is positive for an indicator or pathogen." },
      { name: "re_sampled", order: 5, desc: "Zone has been re-sampled following an adverse result." },
      { name: "closed", order: 6, terminal: true, gate: true, desc: "Sampling event is closed out." },
    ],
  },
  513: {
    module: MOD_263,
    states: [
      { name: "scheduled", order: 1, initial: true, desc: "Sanitation cycle is scheduled." },
      { name: "in_progress", order: 2, desc: "Sanitation cycle is being performed." },
      { name: "completed", order: 3, gate: true, desc: "Sanitation cycle is complete." },
      { name: "verified", order: 4, terminal: true, gate: true, desc: "Pre-operational inspection has verified the cycle." },
      { name: "failed", order: 5, terminal: true, gate: true, desc: "Cycle failed verification and must be repeated." },
    ],
  },
};

async function lifecycleStates() {
  console.log("\n== B1A-LIFECYCLE-STATES ==");

  // Prerequisite per Rule #12: lifecycle states are valid only on operational_workflow.
  // All 7 FSQM masters carry real workflows; set entity_type before authoring states.
  for (const id of Object.keys(MASTERS).map(Number)) {
    const [cur] = await get(`/data_objects?id=eq.${id}&select=entity_type`);
    if (cur?.entity_type !== "operational_workflow") {
      await patch(`/data_objects?id=eq.${id}`, { entity_type: "operational_workflow" });
      console.log(`  data_object ${id} (${MASTERS[id]}): entity_type ${cur?.entity_type} -> operational_workflow`);
    } else {
      console.log(`  data_object ${id} (${MASTERS[id]}): entity_type already operational_workflow`);
    }
  }

  // Author lifecycle states, idempotent on the composed label <data_object_name>.<state_name>.
  const existing = await get(
    `/data_object_lifecycle_states?data_object_id=in.(507,508,509,510,511,512,513)&select=data_object_lifecycle_state_label`,
  );
  const existingLabels = new Set(
    existing.map(r => String(r.data_object_lifecycle_state_label)),
  );

  const rows: Row[] = [];
  for (const [idStr, spec] of Object.entries(STATE_MACHINES)) {
    const doId = Number(idStr);
    const name = MASTERS[doId];
    for (const s of spec.states) {
      const label = `${name}.${s.name}`;
      if (existingLabels.has(label)) continue;
      rows.push({
        data_object_id: doId,
        data_object_lifecycle_state_label: label,
        state_name: s.name,
        state_order: s.order,
        is_initial: !!s.initial,
        is_terminal: !!s.terminal,
        requires_permission: !!s.gate,
        description: s.desc,
        domain_module_id: spec.module,
      });
    }
  }
  if (rows.length) {
    await insert("/data_object_lifecycle_states", rows);
    console.log(`  inserted ${rows.length} lifecycle states`);
  } else {
    console.log("  all lifecycle states already present");
  }
}

// ============================================================
// 3. B1A-S7  (4 new trigger_events + handoffs)
// ============================================================
type EvtSpec = {
  event_name: string;
  event_category: string;
  data_object_id: number;
  domain_module_id: number;
  description: string;
  handoff: {
    target_domain_id: number;
    target_domain_module_id: number | null;
    source_domain_module_id: number;
    integration_pattern: string;
    friction_level: string;
    description: string;
  };
};
const NEW_EVENTS: EvtSpec[] = [
  {
    event_name: "haccp_plan.due_for_review",
    event_category: "threshold",
    data_object_id: 507,
    domain_module_id: MOD_259,
    description:
      "A HACCP plan has reached its annual review date under the FSMA preventive-controls review cycle; the owning module reopens the plan for reassessment.",
    handoff: {
      target_domain_id: 157,
      target_domain_module_id: MOD_259,
      source_domain_module_id: MOD_259,
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      description:
        "An in-effect HACCP plan reaching its annual review date routes the plan back into authoring for reassessment within the HACCP and CCP monitoring module.",
    },
  },
  {
    event_name: "food_safety_incident.opened",
    event_category: "lifecycle",
    data_object_id: 510,
    domain_module_id: MOD_259,
    description:
      "A food-safety incident has been opened; the owning module starts the investigation and containment workflow.",
    handoff: {
      target_domain_id: 157,
      target_domain_module_id: MOD_259,
      source_domain_module_id: MOD_259,
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      description:
        "Opening a food-safety incident starts the investigation and corrective-action workflow inside the HACCP and CCP monitoring module.",
    },
  },
  {
    event_name: "food_safety_incident.closed",
    event_category: "lifecycle",
    data_object_id: 510,
    domain_module_id: MOD_259,
    description:
      "A food-safety incident has been resolved and closed; the record is locked and retained as audit evidence.",
    handoff: {
      target_domain_id: 157,
      target_domain_module_id: MOD_259,
      source_domain_module_id: MOD_259,
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      description:
        "Closing a food-safety incident locks the record and files the corrective-action evidence for audit within the HACCP and CCP monitoring module.",
    },
  },
  {
    event_name: "environmental_monitoring_sample.adverse_trend",
    event_category: "threshold",
    data_object_id: 512,
    domain_module_id: MOD_263,
    description:
      "Three or more positive environmental-monitoring results in 60 days at the same zone form an adverse trend; the program escalates for investigation.",
    handoff: {
      target_domain_id: 157,
      target_domain_module_id: MOD_259,
      source_domain_module_id: MOD_263,
      integration_pattern: "lifecycle_progression",
      friction_level: "medium",
      description:
        "An adverse environmental-monitoring trend at a zone escalates from the hygiene-control module into a food-safety incident investigation in the HACCP and CCP monitoring module.",
    },
  },
];

async function newEventsAndHandoffs() {
  console.log("\n== B1A-S7 (trigger_events + handoffs) ==");

  // trigger_events idempotent on event_name.
  const existingEvts = await get(
    `/trigger_events?event_name=in.(${NEW_EVENTS.map(e => e.event_name).join(",")})&select=id,event_name`,
  );
  const evtMap = new Map<string, number>();
  for (const r of existingEvts) evtMap.set(String(r.event_name), Number(r.id));

  const evtRows = NEW_EVENTS.filter(e => !evtMap.has(e.event_name)).map(e => ({
    event_name: e.event_name,
    event_category: e.event_category,
    data_object_id: e.data_object_id,
    domain_module_id: e.domain_module_id,
    description: e.description,
  }));
  if (evtRows.length) {
    await insert("/trigger_events", evtRows);
    console.log(`  inserted ${evtRows.length} trigger_events`);
  } else {
    console.log("  all trigger_events already present");
  }
  // refresh map
  const allEvts = await get(
    `/trigger_events?event_name=in.(${NEW_EVENTS.map(e => e.event_name).join(",")})&select=id,event_name`,
  );
  evtMap.clear();
  for (const r of allEvts) evtMap.set(String(r.event_name), Number(r.id));

  // handoffs idempotent on (source, target, data_object, trigger_event).
  const handoffRows: Row[] = [];
  for (const e of NEW_EVENTS) {
    const evtId = evtMap.get(e.event_name);
    if (!evtId) throw new Error(`missing trigger_event id for ${e.event_name}`);
    const dup = await get(
      `/handoffs?source_domain_id=eq.157&target_domain_id=eq.${e.handoff.target_domain_id}` +
        `&data_object_id=eq.${e.data_object_id}&trigger_event_id=eq.${evtId}&select=id`,
    );
    if (dup.length) {
      console.log(`  handoff for ${e.event_name} already present (id ${dup[0].id})`);
      continue;
    }
    handoffRows.push({
      source_domain_id: 157,
      target_domain_id: e.handoff.target_domain_id,
      data_object_id: e.data_object_id,
      trigger_event_id: evtId,
      source_domain_module_id: e.handoff.source_domain_module_id,
      target_domain_module_id: e.handoff.target_domain_module_id,
      integration_pattern: e.handoff.integration_pattern,
      friction_level: e.handoff.friction_level,
      description: e.handoff.description,
    });
  }
  if (handoffRows.length) {
    await insert("/handoffs", handoffRows);
    console.log(`  inserted ${handoffRows.length} handoffs`);
  } else {
    console.log("  all new handoffs already present");
  }
}

// ============================================================
// 4. B1A-HANDOFF-MODULE-FK  (backfill module FKs on 13 handoffs)
// ============================================================
const OUTBOUND_SRC: Record<number, number> = {
  356: MOD_259, // food_safety_incident.escalated
  358: MOD_259, // ccp_measurement.deviation
  975: MOD_259, // critical_control_point.deviation
  976: MOD_259, // critical_control_point.deviation
  977: MOD_263, // allergen_program.violation_detected
  978: MOD_263, // environmental_monitoring_sample.positive
  979: MOD_263, // sanitation_record.completed
  980: MOD_259, // haccp_plan.approved
};
const INBOUND_TGT: Record<number, number> = {
  352: MOD_259, // field_application.recorded (FMIS)
  354: MOD_259, // milk_quality_test.failed (DAIRY)
  355: MOD_259, // cow_health_event.treatment_administered (DAIRY)
  361: MOD_264, // supplier_certification.expired (FOOD-TRACE)
  971: MOD_259, // traceability_lot.created (FOOD-TRACE)
};

async function backfillHandoffFks() {
  console.log("\n== B1A-HANDOFF-MODULE-FK ==");
  for (const [idStr, mod] of Object.entries(OUTBOUND_SRC)) {
    const id = Number(idStr);
    const [cur] = await get(`/handoffs?id=eq.${id}&select=source_domain_module_id`);
    if (cur?.source_domain_module_id == null) {
      await patch(`/handoffs?id=eq.${id}`, { source_domain_module_id: mod });
      console.log(`  handoff ${id}: source_domain_module_id NULL -> ${mod}`);
    } else {
      console.log(`  handoff ${id}: source_domain_module_id already ${cur.source_domain_module_id}, skipped`);
    }
  }
  for (const [idStr, mod] of Object.entries(INBOUND_TGT)) {
    const id = Number(idStr);
    const [cur] = await get(`/handoffs?id=eq.${id}&select=target_domain_module_id`);
    if (cur?.target_domain_module_id == null) {
      await patch(`/handoffs?id=eq.${id}`, { target_domain_module_id: mod });
      console.log(`  handoff ${id}: target_domain_module_id NULL -> ${mod}`);
    } else {
      console.log(`  handoff ${id}: target_domain_module_id already ${cur.target_domain_module_id}, skipped`);
    }
  }
}

// ============================================================
// 5. B1A-MODULE-SYSTEM-SKILLS  (3 skills + skill_tools, then retire skill 64)
// ============================================================
// Tool ids (verified live): query tools 492-498 for masters 507-513;
//   borrowed/contributor query+mutate tools for module 264;
//   notify_person 913, notify_team 914 (channel abstractions, replace send_email).
const SKILLS: {
  module: number;
  code: string;
  name: string;
  description: string;
  tools: { tool_id: number; requirement_level: string }[];
}[] = [
  {
    module: MOD_259,
    code: "FSQM-HACCP-CCP",
    name: "fsqm_haccp_ccp_agent",
    description:
      "Operates HACCP plan authoring, critical control point setup, CCP monitoring, and deviation-to-incident workflows for the Hazard Analysis and CCP Monitoring module.",
    tools: [
      { tool_id: 492, requirement_level: "required" }, // query_haccp_plans
      { tool_id: 493, requirement_level: "required" }, // query_critical_control_points
      { tool_id: 494, requirement_level: "required" }, // query_ccp_measurements
      { tool_id: 495, requirement_level: "required" }, // query_food_safety_incidents
      { tool_id: 913, requirement_level: "required" }, // notify_person (deviation alert / escalation)
      { tool_id: 914, requirement_level: "optional" }, // notify_team (broadcast on major incident)
    ],
  },
  {
    module: MOD_263,
    code: "FSQM-HYGIENE-CONTROL",
    name: "fsqm_hygiene_control_agent",
    description:
      "Operates allergen control, environmental monitoring, and sanitation workflows for the Allergen, Sanitation and Environmental Monitoring module.",
    tools: [
      { tool_id: 496, requirement_level: "required" }, // query_allergen_programs
      { tool_id: 497, requirement_level: "required" }, // query_environmental_monitoring_samples
      { tool_id: 498, requirement_level: "required" }, // query_sanitation_records
      { tool_id: 913, requirement_level: "required" }, // notify_person (positive-result page-out)
      { tool_id: 914, requirement_level: "optional" }, // notify_team
    ],
  },
  {
    module: MOD_264,
    code: "FSQM-AUDIT-SUPPLIER",
    name: "fsqm_audit_supplier_agent",
    description:
      "Operates certification audit preparation, supplier risk scoring, supplier certification tracking, compliance obligations, and recall execution for the Certification Audit and Supplier Risk module.",
    tools: [
      { tool_id: 489, requirement_level: "required" }, // query_supplier_certifications
      { tool_id: 21, requirement_level: "required" }, // query_suppliers
      { tool_id: 85, requirement_level: "required" }, // query_compliance_obligations
      { tool_id: 488, requirement_level: "required" }, // query_recall_events
      { tool_id: 1746, requirement_level: "optional" }, // create_supplier_certification
      { tool_id: 1747, requirement_level: "optional" }, // update_supplier_certification
      { tool_id: 1744, requirement_level: "required" }, // initiate_recall
      { tool_id: 1745, requirement_level: "optional" }, // update_recall_event
      { tool_id: 913, requirement_level: "required" }, // notify_person (audit / cert-expiry reminders)
      { tool_id: 914, requirement_level: "optional" }, // notify_team (recall broadcast)
    ],
  },
];

async function systemSkills() {
  console.log("\n== B1A-MODULE-SYSTEM-SKILLS ==");

  // (1) author one system skill per module, idempotent on (skill_type, domain_module_id).
  for (const sk of SKILLS) {
    let [existing] = await get(
      `/skills?skill_type=eq.system&domain_module_id=eq.${sk.module}&select=id,skill_name`,
    );
    let skillId: number;
    if (existing) {
      skillId = Number(existing.id);
      console.log(`  module ${sk.module}: system skill already present (id ${skillId})`);
    } else {
      const [created] = await insert("/skills", [
        {
          skill_name: sk.name,
          skill_type: "system",
          domain_id: 157,
          domain_module_id: sk.module,
          description: sk.description,
        },
      ]);
      skillId = Number(created.id);
      console.log(`  module ${sk.module}: created system skill ${sk.name} (id ${skillId})`);
    }

    // (2) link skill_tools, idempotent on (skill_id, tool_id).
    const existingLinks = await get(
      `/skill_tools?skill_id=eq.${skillId}&select=tool_id`,
    );
    const have = new Set(existingLinks.map(r => Number(r.tool_id)));
    const toAdd = sk.tools
      .filter(t => !have.has(t.tool_id))
      .map(t => ({
        skill_id: skillId,
        tool_id: t.tool_id,
        requirement_level: t.requirement_level,
      }));
    if (toAdd.length) {
      await insert("/skill_tools", toAdd);
      console.log(`    linked ${toAdd.length} skill_tools to skill ${skillId}`);
    } else {
      console.log(`    skill ${skillId}: all skill_tools already linked`);
    }
  }

  // (3) DELETE legacy skill 64 + its skill_tools (snapshot already in history.md).
  const [legacy] = await get(`/skills?id=eq.64&select=id`);
  if (legacy) {
    const legacyTools = await get(`/skill_tools?skill_id=eq.64&select=id`);
    if (legacyTools.length) {
      await del(`/skill_tools?skill_id=eq.64`);
      console.log(`  deleted ${legacyTools.length} skill_tools on legacy skill 64`);
    }
    await del(`/skills?id=eq.64`);
    console.log("  deleted legacy skill 64");
  } else {
    console.log("  legacy skill 64 already absent");
  }
}

// ============================================================
// main
// ============================================================
console.log("FSQM b1a execution 2026-06-06");
await catalogUx();
await lifecycleStates();
await newEventsAndHandoffs();
await backfillHandoffFks();
await systemSkills();
console.log("\nDONE");
