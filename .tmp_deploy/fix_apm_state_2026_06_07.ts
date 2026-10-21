#!/usr/bin/env bun
// State-driven APM audit execution (2026-06-07).
// Works ONLY the additive/corrective EXECUTE items from audits/APM/state.yaml:
//   1. entity_type classification on 7 masters (B1A-ENTITY-TYPE)
//   2. Catalog UX backfill on domain 10 + modules 103/104 (B1A-A4, B1A-M8), empty fields only
//   3. INSERT 7 missing trigger_events for permission-gate states (B1A-B9, additive half)
//   4. INSERT 4 agent_curated handoff_processes tags on untagged handoffs (B1A-H1-REPLACE, additive half)
//
// Destructive halves (re-target handoffs 237/238; DELETE 4 stale discovery_substring rows)
// are SURFACED, not executed. Everything here is additive/corrective, record_status omitted (-> 'new').
// Idempotent: reads live first, writes only what is missing/empty.

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

const get = (path: string) => call({ method: "GET", path });

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

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
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

// ============================================================
// 1. entity_type classification (B1A-ENTITY-TYPE)
// ============================================================
// 5 masters have a permission-gated state machine -> operational_workflow.
// 2 (application_costs, application_value_scores) are time-series snapshots,
// no lifecycle states -> operational_record.
const entityTypes: Record<number, string> = {
  248: "operational_workflow", // business_capability_maps (draft->published->superseded, gate on published)
  267: "operational_workflow", // enterprise_applications (planned..sunsetting..retired, gate on sunsetting)
  269: "operational_workflow", // technology_platforms (emerging..declining..retired, gates)
  270: "operational_workflow", // technology_fit_assessments (draft->in_review->approved, gate on approved)
  271: "operational_workflow", // application_interfaces (active->deprecated->retired, gates)
  268: "operational_record",   // application_costs (time-series cost snapshots, no workflow)
  272: "operational_record",   // application_value_scores (quarterly score snapshots, no workflow)
};

async function step1_entityType() {
  console.log("\n== Step 1: entity_type classification ==");
  const live = await get(
    "/data_objects?id=in.(248,267,268,269,270,271,272)&select=id,data_object_name,entity_type",
  );
  let patched = 0;
  for (const r of live) {
    const id = Number(r.id);
    const want = entityTypes[id];
    const cur = r.entity_type;
    if (cur === null || cur === "unclassified") {
      await patch(`/data_objects?id=eq.${id}`, { entity_type: want });
      console.log(`  PATCH data_objects ${id} (${r.data_object_name}) entity_type -> ${want}`);
      patched++;
    } else {
      console.log(`  skip data_objects ${id} (${r.data_object_name}) already '${cur}'`);
    }
  }
  console.log(`  entity_type patched: ${patched}`);
  return patched;
}

// ============================================================
// 2. Catalog UX backfill (B1A-A4 domain, B1A-M8 modules), empty only
// ============================================================
const domainCatalog = {
  catalog_tagline:
    "See every application you run, score what it is worth, and decide what to keep, fix, or retire.",
  catalog_description:
    "Build one trustworthy inventory of the applications, interfaces, and technology platforms your organization depends on, with the business capabilities each one supports. Track every application through its full life from planned to retired, and keep owners, costs, and technical details in one place.\n\nOnce the landscape is mapped, score each application on cost, business value, and technical fit so you can rank the portfolio and act with confidence. Spot redundant or aging applications, plan migrations and retirements, and give leadership a clear, defensible view of where to invest and where to cut.",
};

const moduleCatalog: Record<number, { catalog_tagline: string; catalog_description: string }> = {
  103: {
    catalog_tagline:
      "Keep one reliable inventory of your applications, interfaces, and platforms, with the capabilities they support.",
    catalog_description:
      "Capture every application, the interfaces that connect it, and the technology platforms it runs on, then link each one to the business capabilities it supports. Record owners, lifecycle stage, and technical detail so anyone can answer what you run and why.\n\nDrive each application and platform through a clear lifecycle, from planned and emerging to operating, sunsetting, and retired, with the right approvals at each gate. The result is a single source of truth your teams can plan, govern, and report against.",
  },
  104: {
    catalog_tagline:
      "Score your applications on cost, value, and technical fit so you know what to invest in, migrate, or eliminate.",
    catalog_description:
      "Turn your application inventory into decisions. Assess each application on what it costs, the business value it delivers, and how well it fits your technology direction, then rank the whole portfolio on a consistent scale.\n\nUse the scores to find redundant, low-value, or aging applications, justify migrations and retirements, and bring a clear, evidence-based recommendation to every portfolio review. Cost and value signals stay current so your invest, migrate, and eliminate calls hold up to scrutiny.",
  },
};

async function step2_catalogUX() {
  console.log("\n== Step 2: catalog UX backfill (empty only) ==");
  let wrote = 0;

  // Domain 10
  const [dom] = await get(
    "/domains?id=eq.10&select=id,catalog_tagline,catalog_description",
  );
  const domPatch: Row = {};
  if (!dom.catalog_tagline) domPatch.catalog_tagline = domainCatalog.catalog_tagline;
  if (!dom.catalog_description) domPatch.catalog_description = domainCatalog.catalog_description;
  if (Object.keys(domPatch).length > 0) {
    await patch("/domains?id=eq.10", domPatch);
    console.log(`  PATCH domains 10 fields: ${Object.keys(domPatch).join(", ")}`);
    wrote++;
  } else {
    console.log("  skip domains 10 (both fields non-empty)");
  }

  // Modules 103, 104
  const mods = await get(
    "/domain_modules?id=in.(103,104)&select=id,catalog_tagline,catalog_description",
  );
  for (const m of mods) {
    const id = Number(m.id);
    const spec = moduleCatalog[id];
    const mp: Row = {};
    if (!m.catalog_tagline) mp.catalog_tagline = spec.catalog_tagline;
    if (!m.catalog_description) mp.catalog_description = spec.catalog_description;
    if (Object.keys(mp).length > 0) {
      await patch(`/domain_modules?id=eq.${id}`, mp);
      console.log(`  PATCH domain_modules ${id} fields: ${Object.keys(mp).join(", ")}`);
      wrote++;
    } else {
      console.log(`  skip domain_modules ${id} (both fields non-empty)`);
    }
  }
  console.log(`  catalog UX rows written: ${wrote}`);
  return wrote;
}

// ============================================================
// 3. trigger_events for permission-gate states (B1A-B9, additive)
// ============================================================
// event_category enum: lifecycle / state_change / threshold / signal. All 7 are state transitions -> state_change.
// domain_module_id is the module that owns the gated state.
const newEvents = [
  { event_name: "business_capability_map.published", data_object_id: 248, domain_module_id: 103, to_state: "published",
    description: "A business capability map is published, giving consumers a stable, governed view of the capability landscape to align against." },
  { event_name: "enterprise_application.sunsetting", data_object_id: 267, domain_module_id: 103, to_state: "sunsetting",
    description: "An application enters sunsetting, signaling dependents to plan replacement, migration, or decommissioning." },
  { event_name: "technology_platform.declining", data_object_id: 269, domain_module_id: 103, to_state: "declining",
    description: "A technology platform is classified as declining, signaling teams to avoid new investment and plan a path off it." },
  { event_name: "technology_platform.retired", data_object_id: 269, domain_module_id: 103, to_state: "retired",
    description: "A technology platform is retired and no longer supported, requiring remaining workloads to move off it." },
  { event_name: "technology_fit.approved", data_object_id: 270, domain_module_id: 104, to_state: "approved",
    description: "A technology fit assessment is approved, locking the verdict that drives invest, migrate, or eliminate decisions." },
  { event_name: "application_interface.deprecated", data_object_id: 271, domain_module_id: 103, to_state: "deprecated",
    description: "An application interface is deprecated, warning consumers to migrate to a supported integration before it is removed." },
  { event_name: "application_interface.retired", data_object_id: 271, domain_module_id: 103, to_state: "retired",
    description: "An application interface is retired and no longer available, breaking any integration still bound to it." },
];

async function step3_triggerEvents() {
  console.log("\n== Step 3: trigger_events (permission-gate states) ==");
  const existing = await get("/trigger_events?select=event_name&limit=10000");
  const have = new Set(existing.map(r => String(r.event_name)));
  const missing = newEvents
    .filter(e => !have.has(e.event_name))
    .map(e => ({ ...e, event_category: "state_change", from_state: "" }));
  if (missing.length > 0) {
    await insert("/trigger_events", missing);
    for (const e of missing) console.log(`  INSERT trigger_events ${e.event_name} (do=${e.data_object_id})`);
  }
  console.log(`  trigger_events inserted: ${missing.length} (${newEvents.length - missing.length} already present)`);
  return missing.length;
}

// ============================================================
// 4. handoff_processes agent_curated tags (B1A-H1-REPLACE, additive half)
// ============================================================
// Only the 4 currently-UNTAGGED cross-domain handoffs with a clean PCF match.
// The 4 stale discovery_substring rows (235/236/237/238 -> 1180) are REPLACE/DELETE = destructive => SURFACED.
const newTags = [
  { handoff_id: 855,  process_id: 1156 }, // technology_platform.sunset -> GRC : Identify and evaluate IT risk (20713)
  { handoff_id: 1195, process_id: 1170 }, // technology_fit.assessment_completed -> GRC : Conduct IT risk and threat assessments (20728)
  { handoff_id: 1197, process_id: 1132 }, // application_cost.updated -> EPM : Monitor and analyze IT financial performance (20686) [matches sibling 1196]
  { handoff_id: 1198, process_id: 1139 }, // application_value.recalculated -> SPM : Quantify value of IT service and project portfolio investments (20695)
];

async function step4_handoffProcesses() {
  console.log("\n== Step 4: handoff_processes agent_curated tags ==");
  const ids = newTags.map(t => t.handoff_id).join(",");
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${ids})&select=handoff_id,process_id`,
  );
  const have = new Set(existing.map(r => `${r.handoff_id}|${r.process_id}`));
  const missing = newTags
    .filter(t => !have.has(`${t.handoff_id}|${t.process_id}`))
    .map(t => ({ ...t, proposal_source: "agent_curated", role: "implements" }));
  if (missing.length > 0) {
    await insert("/handoff_processes", missing);
    for (const t of missing) console.log(`  INSERT handoff_processes handoff=${t.handoff_id} process=${t.process_id}`);
  }
  console.log(`  handoff_processes inserted: ${missing.length} (${newTags.length - missing.length} already present)`);
  return missing.length;
}

async function main() {
  const c1 = await step1_entityType();
  const c2 = await step2_catalogUX();
  const c3 = await step3_triggerEvents();
  const c4 = await step4_handoffProcesses();

  console.log("\n===== SUMMARY =====");
  console.log(`entity_type PATCH:        ${c1}`);
  console.log(`catalog UX rows written:  ${c2}`);
  console.log(`trigger_events INSERT:    ${c3}`);
  console.log(`handoff_processes INSERT: ${c4}`);
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects");
  console.log("  https://tests.semantius.app/domain_map/domains");
  console.log("  https://tests.semantius.app/domain_map/domain_modules");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
