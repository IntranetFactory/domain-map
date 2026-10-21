/**
 * CMDB audit fixes (2026-05-26)
 *
 * Closes the in-scope failures from the per-domain completeness checklist:
 *   - M3:   load domain_starter_modules (7 capabilities -> requires populated junction)
 *   - B5/Rule #16 drift: PATCH org_units (34) + locations (795) to necessity=optional on the
 *           legacy domain-level rollup (module level was already correct)
 *   - B9b:  3 modules, zero intra-domain handoffs. Author 1 new trigger event
 *           (ci.registered) + 2 lifecycle_progression handoffs:
 *             CMDB-CORE -> CMDB-SERVICE-MAPPING  (service map projection refresh)
 *             CMDB-CORE -> CMDB-BASELINES-DRIFT  (CI becomes baseline-eligible)
 *   - Data quality: PATCH 4 CMDB-published trigger_events with empty event_category
 *           (ci_class.published, service_map.updated, ci_baseline.captured,
 *            ci_baseline.deviation_detected) to the right enum value.
 *
 * Run from the project root:
 *   bun run .tmp_deploy/cmdb_audit_fixes_2026_05_26.ts
 *
 * Idempotent: re-running skips already-applied rows.
 */

const CMDB_DOMAIN_ID = 4;
const MOD_CORE = 108;
const MOD_SVC_MAPPING = 109;
const MOD_BASELINES = 110;
const DO_CI = 76;
const DO_SERVICE_MAPS = 79;
const DO_CI_BASELINES = 80;
const DO_ORG_UNITS = 34;
const DO_LOCATIONS = 795;

interface CmdResult {
  ok: boolean;
  data: any;
  status: number;
}

async function postgrest(method: string, path: string, body?: any): Promise<CmdResult> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    console.error(`  semantius failed (${code}): ${stderr.trim() || stdout.trim()}`);
    return { ok: false, data: null, status: code };
  }
  const text = stdout.trim();
  return { ok: true, data: text ? JSON.parse(text) : null, status: 0 };
}

async function get(path: string): Promise<any> {
  const r = await postgrest("GET", path);
  if (!r.ok) throw new Error(`GET ${path} failed`);
  return r.data;
}

async function post(path: string, body: any): Promise<any> {
  const r = await postgrest("POST", path, body);
  if (!r.ok) throw new Error(`POST ${path} failed`);
  return r.data;
}

async function patch(path: string, body: any): Promise<any> {
  const r = await postgrest("PATCH", path, body);
  if (!r.ok) throw new Error(`PATCH ${path} failed`);
  return r.data;
}

async function main() {
  console.log("=== CMDB audit fixes (2026-05-26) ===\n");

  // ----- Sanity -----
  const dom = await get(`/domains?id=eq.${CMDB_DOMAIN_ID}&select=domain_code,domain_name`);
  if (!dom?.[0] || dom[0].domain_code !== "CMDB") {
    throw new Error(`CMDB id mismatch: got ${JSON.stringify(dom)}`);
  }
  console.log(`Target: ${dom[0].domain_code} (${dom[0].domain_name})\n`);

  // ----- M3: domain_starter_modules -----
  console.log("--- M3: domain_starter_modules ---");
  const existingStarter = await get(
    `/domain_starter_modules?domain_id=eq.${CMDB_DOMAIN_ID}&select=domain_module_id,position`,
  );
  const haveModIds = new Set<number>(existingStarter.map((r: any) => r.domain_module_id));
  const starterPlan = [
    {
      domain_id: CMDB_DOMAIN_ID,
      domain_module_id: MOD_CORE,
      position: 1,
      notes:
        "Start here. The authoritative CI repository, classes, and relationships. Every other CMDB module reads from this.",
    },
    {
      domain_id: CMDB_DOMAIN_ID,
      domain_module_id: MOD_SVC_MAPPING,
      position: 2,
      notes:
        "Add when business services need a runtime-accurate CI topology projection for ITSM impact analysis and AIOps correlation.",
    },
    {
      domain_id: CMDB_DOMAIN_ID,
      domain_module_id: MOD_BASELINES,
      position: 3,
      notes:
        "Add when change-control requires pre-change baselines and continuous drift detection against live CI state.",
    },
  ];
  const starterToInsert = starterPlan.filter((r) => !haveModIds.has(r.domain_module_id));
  if (starterToInsert.length === 0) {
    console.log(`  already complete (${existingStarter.length} rows). skipping.`);
  } else {
    const inserted = await post("/domain_starter_modules", starterToInsert);
    console.log(`  inserted ${inserted.length} rows.`);
  }
  console.log();

  // ----- B5 / Rule #16 drift -----
  console.log("--- B5 / Rule #16 drift: necessity -> optional on legacy rollup ---");
  for (const doid of [DO_ORG_UNITS, DO_LOCATIONS]) {
    const row = await get(
      `/domain_data_objects?domain_id=eq.${CMDB_DOMAIN_ID}&data_object_id=eq.${doid}&select=data_object_id,role,necessity`,
    );
    if (row.length === 0) {
      console.log(`  data_object ${doid}: no row, skipping.`);
      continue;
    }
    if (row[0].necessity === "optional") {
      console.log(`  data_object ${doid}: already optional. skipping.`);
      continue;
    }
    await patch(
      `/domain_data_objects?domain_id=eq.${CMDB_DOMAIN_ID}&data_object_id=eq.${doid}`,
      { necessity: "optional" },
    );
    console.log(`  data_object ${doid}: patched required -> optional.`);
  }
  console.log();

  // ----- B9b: intra-domain handoffs -----
  console.log("--- B9b: intra-domain cross-module handoffs ---");

  // Step 1: ensure ci.registered trigger event exists
  let ciRegisteredId: number;
  const existingEvent = await get(
    `/trigger_events?event_name=eq.ci.registered&data_object_id=eq.${DO_CI}&select=id`,
  );
  if (existingEvent.length > 0) {
    ciRegisteredId = existingEvent[0].id;
    console.log(`  trigger_event ci.registered already exists (id=${ciRegisteredId}).`);
  } else {
    const inserted = await post("/trigger_events", [
      {
        event_name: "ci.registered",
        data_object_id: DO_CI,
        event_category: "lifecycle",
        description:
          "CMDB-CORE: a discovered Configuration Item has been reviewed by a data steward and registered into the authoritative CI repository. Downstream CMDB modules (Service Mapping, Baselines/Drift) consume the CI from this point.",
      },
    ]);
    ciRegisteredId = inserted[0].id;
    console.log(`  trigger_event ci.registered inserted (id=${ciRegisteredId}).`);
  }

  // Step 2: insert intra-domain handoffs
  const intraPlan = [
    {
      trigger_event_id: ciRegisteredId,
      source_domain_id: CMDB_DOMAIN_ID,
      target_domain_id: CMDB_DOMAIN_ID,
      source_domain_module_id: MOD_CORE,
      target_domain_module_id: MOD_SVC_MAPPING,
      data_object_id: DO_SERVICE_MAPS,
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      description:
        "CMDB-CORE registers a CI. CMDB-SERVICE-MAPPING refreshes the business-service topology projection that includes the CI and its relationships. No message moves; service maps read CI state directly.",
      notes: "intra | CMDB | CORE -> SERVICE-MAPPING: CI registration drives service-map projection refresh.",
    },
    {
      trigger_event_id: ciRegisteredId,
      source_domain_id: CMDB_DOMAIN_ID,
      target_domain_id: CMDB_DOMAIN_ID,
      source_domain_module_id: MOD_CORE,
      target_domain_module_id: MOD_BASELINES,
      data_object_id: DO_CI_BASELINES,
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      description:
        "CMDB-CORE registers a CI. CMDB-BASELINES-DRIFT becomes eligible to capture pre-change baselines for the newly-registered CI. In-process state read; no message moves.",
      notes: "intra | CMDB | CORE -> BASELINES-DRIFT: CI registration makes the CI baseline-eligible.",
    },
  ];
  const existingIntra = await get(
    `/handoffs?source_domain_id=eq.${CMDB_DOMAIN_ID}&target_domain_id=eq.${CMDB_DOMAIN_ID}&select=source_domain_module_id,target_domain_module_id,trigger_event_id,data_object_id`,
  );
  const intraKey = (r: any) =>
    `${r.source_domain_module_id}|${r.target_domain_module_id}|${r.trigger_event_id}|${r.data_object_id}`;
  const haveIntra = new Set<string>(existingIntra.map(intraKey));
  const intraToInsert = intraPlan.filter((r) => !haveIntra.has(intraKey(r)));
  if (intraToInsert.length === 0) {
    console.log(`  already complete (${existingIntra.length} rows). skipping.`);
  } else {
    const inserted = await post("/handoffs", intraToInsert);
    console.log(`  inserted ${inserted.length} rows.`);
  }
  console.log();

  // ----- Data quality: trigger_events.event_category -----
  console.log("--- Data quality: trigger_events.event_category ---");
  const eventCategoryFixes: Array<{ name: string; category: string }> = [
    { name: "ci_class.published", category: "lifecycle" },
    { name: "service_map.updated", category: "state_change" },
    { name: "ci_baseline.captured", category: "lifecycle" },
    { name: "ci_baseline.deviation_detected", category: "state_change" },
  ];
  for (const fix of eventCategoryFixes) {
    const row = await get(
      `/trigger_events?event_name=eq.${encodeURIComponent(fix.name)}&select=id,event_category`,
    );
    if (row.length === 0) {
      console.log(`  ${fix.name}: not found. skipping.`);
      continue;
    }
    if (row[0].event_category === fix.category) {
      console.log(`  ${fix.name}: already ${fix.category}. skipping.`);
      continue;
    }
    await patch(`/trigger_events?id=eq.${row[0].id}`, { event_category: fix.category });
    console.log(`  ${fix.name}: patched -> ${fix.category}.`);
  }
  console.log();

  // ----- Verification -----
  console.log("=== Verification ===");
  const starter = await get(
    `/domain_starter_modules?domain_id=eq.${CMDB_DOMAIN_ID}&select=position,notes,domain_module:domain_modules(domain_module_code)&order=position.asc`,
  );
  console.log(`domain_starter_modules: ${starter.length} rows`);
  for (const s of starter) {
    console.log(`  ${s.position}. ${s.domain_module.domain_module_code}`);
  }
  const necessity = await get(
    `/domain_data_objects?domain_id=eq.${CMDB_DOMAIN_ID}&data_object_id=in.(${DO_ORG_UNITS},${DO_LOCATIONS})&select=data_object_id,role,necessity,data_objects(data_object_name)`,
  );
  console.log(`\nnecessity drift fix:`);
  for (const n of necessity) {
    console.log(`  ${n.data_objects.data_object_name}: ${n.role} + ${n.necessity}`);
  }
  const intra = await get(
    `/handoffs?source_domain_id=eq.${CMDB_DOMAIN_ID}&target_domain_id=eq.${CMDB_DOMAIN_ID}&select=source_domain_module_id,target_domain_module_id,integration_pattern,trigger_events(event_name)`,
  );
  console.log(`\nintra-domain handoffs: ${intra.length} rows`);
  for (const h of intra) {
    console.log(
      `  mod ${h.source_domain_module_id} -> mod ${h.target_domain_module_id} on ${h.trigger_events.event_name} [${h.integration_pattern}]`,
    );
  }
  const cats = await get(
    `/trigger_events?event_name=in.(ci_class.published,service_map.updated,ci_baseline.captured,ci_baseline.deviation_detected)&select=event_name,event_category`,
  );
  console.log(`\nevent_category fix:`);
  for (const c of cats) {
    console.log(`  ${c.event_name}: ${c.event_category}`);
  }

  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/domain_starter_modules");
  console.log("  https://tests.semantius.app/domain_map/domain_data_objects");
  console.log("  https://tests.semantius.app/domain_map/handoffs");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
