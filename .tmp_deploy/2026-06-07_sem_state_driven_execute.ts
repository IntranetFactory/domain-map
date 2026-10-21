#!/usr/bin/env bun
// SEM (Strategy Execution Management, domain 166) state-driven Validate execute pass.
// 2026-06-07. Works only the EXECUTE-classified open items from audits/SEM/state.yaml:
//   - B1A-ENTITY-TYPE: PATCH 3 unclassified masters to the Rule #12 enum.
//   - B1A-S2: INSERT 2 intra-domain rollup handoffs to STRATEGY-DEFINITION (105).
//   - B1A-S3: INSERT 2 trigger_events on okr_objectives (245) and strategic_initiatives (274).
//   - B1B-A4: backfill 8 empty catalog_tagline / catalog_description fields (Rule #20).
// Idempotent: reads live before each write, inserts/patches only what is missing/empty.
// Never stamps approved; new rows default to record_status='new'.

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
const post = (path: string, rows: Row[]) => call({ method: "POST", path, body: rows });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });

// ============================================================
// 1. B1A-ENTITY-TYPE: classify unclassified masters per Rule #12
// ============================================================
// strategy_maps (808): configured once per planning horizon, rarely changes
//   structure, no lifecycle states -> catalog.
// operating_reviews (809): meeting workflow with scheduled/in_progress/completed
//   states, locked when closed -> operational_workflow.
// strategy_decisions (810): decision workflow with proposed/decided/deferred/
//   withdrawn states, locked once decided -> operational_workflow.
const entityTypeFixes: { id: number; entity_type: string }[] = [
  { id: 808, entity_type: "catalog" },
  { id: 809, entity_type: "operational_workflow" },
  { id: 810, entity_type: "operational_workflow" },
];

async function fixEntityTypes() {
  console.log("\n== B1A-ENTITY-TYPE: classify masters ==");
  const live = await get(
    "/data_objects?id=in.(808,809,810)&select=id,data_object_name,entity_type",
  );
  const byId = new Map(live.map(r => [Number(r.id), r]));
  let patched = 0;
  for (const fix of entityTypeFixes) {
    const cur = byId.get(fix.id);
    if (!cur) {
      console.log(`  WARN data_object ${fix.id} not found; skipping`);
      continue;
    }
    if (cur.entity_type === fix.entity_type) {
      console.log(`  ${cur.data_object_name} (${fix.id}) already ${fix.entity_type}; skip`);
      continue;
    }
    if (cur.entity_type !== "unclassified" && cur.entity_type !== null) {
      // Never overwrite an already-classified value (would be destructive).
      console.log(
        `  ${cur.data_object_name} (${fix.id}) carries '${cur.entity_type}', not unclassified; LEAVE (no overwrite)`,
      );
      continue;
    }
    await patch(`/data_objects?id=eq.${fix.id}`, { entity_type: fix.entity_type });
    console.log(`  PATCHED ${cur.data_object_name} (${fix.id}) -> ${fix.entity_type}`);
    patched++;
  }
  console.log(`  entity_type patches applied: ${patched}`);
  return patched;
}

// ============================================================
// 2. B1A-S3: insert missing trigger_events (do BEFORE handoffs if any handoff needs them)
// ============================================================
// Neither of the two handoffs we add depends on these events (they use 1375 + 1266,
// which already exist), but the audit pairs S3 with the EPM/re-baseline scenarios.
const newEvents: Row[] = [
  {
    event_name: "okr_objective.deprecated",
    event_category: "state_change",
    data_object_id: 245,
    to_state: "deprecated",
    from_state: "",
    description:
      "OKR objective deprecated when the strategy map is re-baselined and child OKRs become obsolete; drives re-baseline cascades.",
  },
  {
    event_name: "strategic_initiative.benefits_realized",
    event_category: "state_change",
    data_object_id: 274,
    to_state: "benefits_realized",
    from_state: "",
    description:
      "Strategic initiative benefits realized and verified; feeds the benefits-realization rollup and downstream EPM consumers.",
  },
];

async function insertEvents() {
  console.log("\n== B1A-S3: trigger_events ==");
  const names = newEvents.map(e => e.event_name as string);
  const existing = await get(
    `/trigger_events?event_name=in.(${names.join(",")})&select=id,event_name`,
  );
  const have = new Set(existing.map(r => String(r.event_name)));
  const missing = newEvents.filter(e => !have.has(String(e.event_name)));
  if (missing.length === 0) {
    console.log("  all events already present; nothing to insert");
    return 0;
  }
  const created = await post("/trigger_events", missing);
  for (const r of created) console.log(`  INSERTED trigger_event ${r.id} ${r.event_name}`);
  return created.length;
}

// ============================================================
// 3. B1A-S2: insert 2 intra-domain rollup handoffs to STRATEGY-DEFINITION (105)
// ============================================================
// (a) 106 -> 105 on okr_objective.scored (1375), okr_objectives (245)
// (b) 107 -> 105 on strategic_initiative.completed (1266), strategic_initiatives (274)
const newHandoffs: Row[] = [
  {
    handoff_label:
      "Strategy Execution Management → Strategy Execution Management : okr_objective.scored",
    source_domain_id: 166,
    target_domain_id: 166,
    source_domain_module_id: 106,
    target_domain_module_id: 105,
    trigger_event_id: 1375,
    data_object_id: 245,
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description:
      "Scored OKR progress rolls back up to the strategy map so the cascading hierarchy reflects latest execution.",
  },
  {
    handoff_label:
      "Strategy Execution Management → Strategy Execution Management : strategic_initiative.completed",
    source_domain_id: 166,
    target_domain_id: 166,
    source_domain_module_id: 107,
    target_domain_module_id: 105,
    trigger_event_id: 1266,
    data_object_id: 274,
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    description:
      "Completed strategic initiative rolls benefits-realization status up to the strategy map for traceability.",
  },
];

async function insertHandoffs() {
  console.log("\n== B1A-S2: intra-domain rollup handoffs ==");
  // Natural key for idempotency: source_module|target_module|trigger_event|data_object
  const existing = await get(
    "/handoffs?source_domain_module_id=in.(105,106,107)&select=source_domain_module_id,target_domain_module_id,trigger_event_id,data_object_id",
  );
  const key = (r: Row) =>
    `${r.source_domain_module_id}|${r.target_domain_module_id}|${r.trigger_event_id}|${r.data_object_id}`;
  const have = new Set(existing.map(key));
  const missing = newHandoffs.filter(h => !have.has(key(h)));
  if (missing.length === 0) {
    console.log("  both rollup handoffs already present; nothing to insert");
    return 0;
  }
  const created = await post("/handoffs", missing);
  for (const r of created)
    console.log(
      `  INSERTED handoff ${r.id} ${r.source_domain_module_id}->${r.target_domain_module_id} ev=${r.trigger_event_id} obj=${r.data_object_id}`,
    );
  return created.length;
}

// ============================================================
// 4. B1B-A4: catalog UX backfill (Rule #20). Only write into EMPTY fields.
// ============================================================
const domainCopy = {
  catalog_tagline:
    "Turn strategy into measurable execution your whole organization can see.",
  catalog_description:
    "Define strategic objectives, cascade them from the boardroom down to team-level goals, and track the initiatives that deliver them. Run a disciplined operating cadence of quarterly and monthly reviews, keep a clear line of sight from daily execution back to strategic intent, and give leaders the rollups they need to course-correct before goals drift.",
};

const moduleCopy: Record<number, { catalog_tagline: string; catalog_description: string }> = {
  105: {
    catalog_tagline: "Author your strategy once and cascade it everywhere.",
    catalog_description:
      "Capture strategic objectives, build strategy maps across financial, customer, process, and learning perspectives, and cascade the hierarchy from corporate strategy down to team OKRs. Everyone sees how their goals ladder up, so the plan stays aligned as priorities shift.",
  },
  106: {
    catalog_tagline: "Keep every initiative tied to the strategy it serves.",
    catalog_description:
      "Maintain a register of strategic initiatives, capture progress as work moves, and trace execution back to the objectives it advances. Investment-alignment views show where effort and spend are landing, so leaders can spot stalled programs and reallocate early.",
  },
  107: {
    catalog_tagline: "Run reviews that drive decisions, not just status updates.",
    catalog_description:
      "Orchestrate the operating cadence of quarterly, monthly, and weekly business reviews with agenda templates and structured commentary. Capture action items and decisions in one place, and lock each review as the durable record of what was agreed.",
  },
};

async function backfillCatalogUX() {
  console.log("\n== B1B-A4: catalog UX backfill (Rule #20) ==");
  let writes = 0;

  // Domain 166
  const [dom] = await get(
    "/domains?id=eq.166&select=id,catalog_tagline,catalog_description",
  );
  const domPatch: Row = {};
  if (!String(dom.catalog_tagline ?? "").trim())
    domPatch.catalog_tagline = domainCopy.catalog_tagline;
  if (!String(dom.catalog_description ?? "").trim())
    domPatch.catalog_description = domainCopy.catalog_description;
  if (Object.keys(domPatch).length > 0) {
    await patch("/domains?id=eq.166", domPatch);
    console.log(`  PATCHED domain 166 fields: ${Object.keys(domPatch).join(", ")}`);
    writes += Object.keys(domPatch).length;
  } else {
    console.log("  domain 166: both fields already non-empty; LEAVE");
  }

  // Modules 105 / 106 / 107
  const mods = await get(
    "/domain_modules?id=in.(105,106,107)&select=id,catalog_tagline,catalog_description",
  );
  for (const m of mods) {
    const copy = moduleCopy[Number(m.id)];
    const mp: Row = {};
    if (!String(m.catalog_tagline ?? "").trim()) mp.catalog_tagline = copy.catalog_tagline;
    if (!String(m.catalog_description ?? "").trim())
      mp.catalog_description = copy.catalog_description;
    if (Object.keys(mp).length > 0) {
      await patch(`/domain_modules?id=eq.${m.id}`, mp);
      console.log(`  PATCHED module ${m.id} fields: ${Object.keys(mp).join(", ")}`);
      writes += Object.keys(mp).length;
    } else {
      console.log(`  module ${m.id}: both fields already non-empty; LEAVE`);
    }
  }
  console.log(`  catalog UX fields written: ${writes}`);
  return writes;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("SEM (166) state-driven execute pass, 2026-06-07");
  const et = await fixEntityTypes();
  const ev = await insertEvents();
  const ho = await insertHandoffs();
  const ux = await backfillCatalogUX();

  console.log("\n== SUMMARY ==");
  console.log(`  entity_type PATCHes:        ${et}`);
  console.log(`  trigger_events INSERTs:     ${ev}`);
  console.log(`  intra-domain handoff INSERTs: ${ho}`);
  console.log(`  catalog UX field writes:    ${ux}`);
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
  console.log("  https://tests.semantius.app/domain_map/handoffs");
  console.log("  https://tests.semantius.app/domain_map/domains");
  console.log("  https://tests.semantius.app/domain_map/domain_modules");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
