#!/usr/bin/env bun
// MFG-OPS Bucket 1 technical fixes (2026-05-31).
//
// Applies the technically-deterministic B1 items from audits/MFG-OPS.md:
//
//   B1-S6 (B9 enum gap)      PATCH 8 trigger_events.event_category backfills
//                            (audit pre-specifies exact event -> category map).
//   B1-W1 (SCOPE-CREEP)      DELETE 3 solution_domains rows (audit names exact
//                            solution_id + domain_id tuples 842/843/845 x 47).
//   B1-H1 (APQC tagging)     INSERT 10 handoff_processes agent_curated rows
//                            (audit pre-specifies handoff_id + PCF process_id).
//                            Natural key (handoff_id, process_id) deduplicates
//                            re-runs and tolerates the PLM-side rows already
//                            tagged on 1087 / 1091 / 1092 with different PCFs.
//
// Deferred per the technical/judgment split:
//   B1-S1  zero domain_modules; gated on Bucket 2 #1 module-split decision.
//   B1-S2  capability authoring; new entities, user must choose scope.
//   B1-S3  catalog_tagline / catalog_description; Rule #20 buyer-voice draft
//          needs user-approved wording.
//   B1-S4  data_object_aliases; audit suggests synonyms but does not pre-
//          specify exact tuples; bulk insert blocked.
//   B1-S5  data_object_lifecycle_states; blocked by B1-S1 (FK to modules).
//   B1-S7  roles / role_modules / role_permissions; blocked by B1-S1.
//   B1-S8  system skill domain_module_id; blocked by B1-S1.
//   B1-S9  skill kebab -> snake rename; gated on B1-S8.
//
// Idempotent: every section reads live state and skips rows that already
// match. Safe to re-run.

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
    const err = stderr.trim();
    if (err.includes("required audience not found")) {
      console.error(
        "\n*** JWT AUDIENCE ERROR. STOPPING per SKILL Rule #6 ***\n" +
          err +
          "\nCommand body: " +
          JSON.stringify(body) +
          "\n",
      );
      process.exit(2);
    }
    throw new Error(`semantius call failed (exit ${exitCode}): ${err}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

async function post(path: string, body: Row[]): Promise<Row[]> {
  if (body.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < body.length; i += CHUNK) {
    const slice = body.slice(i, i + CHUNK);
    const res = await call({ method: "POST", path, body: slice });
    out.push(...res);
  }
  return out;
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

async function del(path: string): Promise<Row[]> {
  return call({ method: "DELETE", path });
}

// ============================================================
// B1-S6  PATCH trigger_events.event_category for 8 MFG-OPS events
// ============================================================
//
// Audit pre-specifies the event_name -> category mapping. Live IDs were
// resolved at script-write time and re-resolved here against event_name for
// safety.
async function fixS6() {
  console.log("\n[B1-S6] PATCH trigger_events.event_category for 8 MFG-OPS events");
  const mapping: Record<string, string> = {
    "production_order.released":             "lifecycle",
    "production_order.completed":            "lifecycle",
    "work_instruction.revised":              "state_change",
    "production_schedule.published":         "lifecycle",
    "produced_unit.completed":               "lifecycle",
    "production_downtime_event.recorded":    "signal",
    "production_quality_inspection.failed":  "state_change",
    "shop_floor_case.opened":                "lifecycle",
  };
  const names = Object.keys(mapping);
  const namesFilter = names.map(n => `"${n}"`).join(",");
  const live = await get(
    `/trigger_events?event_name=in.(${namesFilter})&select=id,event_name,event_category`,
  );
  console.log(`  resolved ${live.length} of ${names.length} events live`);
  if (live.length === 0) return;

  let patched = 0;
  for (const cat of ["lifecycle", "state_change", "signal", "threshold"]) {
    const toUpdate = live.filter(
      r => mapping[String(r.event_name)] === cat && String(r.event_category ?? "") !== cat,
    );
    if (toUpdate.length === 0) continue;
    const ids = toUpdate.map(r => Number(r.id));
    await patch(
      `/trigger_events?id=in.(${ids.join(",")})`,
      { event_category: cat },
    );
    console.log(`  set event_category='${cat}' on ${ids.length} rows: [${ids.join(",")}]`);
    patched += ids.length;
  }
  if (patched === 0) console.log("  all 8 already categorized; no PATCH issued");
}

// ============================================================
// B1-W1  DELETE 3 PLM-vendor solution_domains rows on MFG-OPS
// ============================================================
//
// Siemens Teamcenter (842), PTC Windchill (843), Dassault 3DEXPERIENCE ENOVIA
// (845) are PLM products. Their MFG-OPS coverage is the BOM / routing handoff
// already modeled on handoffs 1087 / 1091 / 1092. Duplicate signal at the
// solution_domains marketing layer; delete the 3 rows.
async function fixW1() {
  console.log("\n[B1-W1] DELETE 3 PLM-vendor solution_domains rows on MFG-OPS (domain 47)");
  const solutionIds = [842, 843, 845];
  const existing = await get(
    `/solution_domains?solution_id=in.(${solutionIds.join(",")})&domain_id=eq.47&select=id,solution_id,domain_id,coverage_level`,
  );
  console.log(`  found ${existing.length} of ${solutionIds.length} rows still live`);
  if (existing.length === 0) {
    console.log("  nothing to delete");
    return;
  }
  const liveIds = existing.map(r => Number(r.id));
  await del(`/solution_domains?id=in.(${liveIds.join(",")})`);
  console.log(`  deleted ${liveIds.length} rows: [${liveIds.join(",")}]`);
}

// ============================================================
// B1-H1 APQC. INSERT 10 handoff_processes rows (agent_curated, status 'new')
// ============================================================
//
// PCF ids verified live before the loader runs:
//   id 830  external 19566  Monitor and optimize production process            (L4)
//   id 415  external 17498  Implement and maintain the EQMS                    (L3)
//   id 1299 external 20903  Triage IT service delivery incidents                (L4)
//   id 171  external 10370  Maintain production records and manage lot trace.   (L3)
//   id 588  external 10097  Identify requirements for changes to mfg/delivery   (L4)
//   id 590  external 10100  Install and validate production/service delivery    (L4)
//   id 578  external 10098  Develop and test prototype production process       (L4)
//   id 822  external 10308  Schedule production orders and create lots          (L4)
//   id 817  external 10301  Support inventory and production processes          (L4)
//
// Handoff 954 -> process 171 already exists (handoff_processes id 652);
// loader skips it via the natural-key (handoff_id, process_id) dedup.
// Handoffs 1087 / 1091 / 1092 already carry PLM-side agent_curated tags with
// different PCFs (1190 / 549 / 1841). The MFG-OPS-facing tags below are
// additive and coexist on the same handoff edges.
async function fixH1() {
  console.log("\n[B1-H1] INSERT handoff_processes for 10 high-confidence handoffs");

  const proposed: { handoff_id: number; process_id: number }[] = [
    { handoff_id: 949,  process_id: 830  },  // MFG-OPS -> EAM, downtime.recorded
    { handoff_id: 951,  process_id: 415  },  // MFG-OPS -> GRC, quality_inspection.failed
    { handoff_id: 952,  process_id: 1299 },  // MFG-OPS -> ITSM, shop_floor_case.opened
    { handoff_id: 954,  process_id: 171  },  // MFG-OPS -> FOOD-TRACE, produced_unit.completed
    { handoff_id: 1087, process_id: 588  },  // PLM -> MFG-OPS, ECO.released
    { handoff_id: 1091, process_id: 590  },  // PLM -> MFG-OPS, manufacturing_bom.released
    { handoff_id: 1092, process_id: 578  },  // PLM -> MFG-OPS, manufacturing_routing.released
    { handoff_id: 867,  process_id: 822  },  // EAM -> MFG-OPS, eam_work_order.completed
    { handoff_id: 975,  process_id: 415  },  // FSQM -> MFG-OPS, critical_control_point.deviation
    { handoff_id: 979,  process_id: 817  },  // FSQM -> MFG-OPS, sanitation_record.completed
  ];

  // Validate every process id resolves before any write.
  const procIds = [...new Set(proposed.map(p => p.process_id))];
  const procs = await get(
    `/processes?id=in.(${procIds.join(",")})&select=id,external_id,process_name`,
  );
  if (procs.length !== procIds.length) {
    throw new Error(
      `process id resolution failed: expected ${procIds.length}, got ${procs.length}`,
    );
  }

  // Validate every handoff id resolves and is cross-domain.
  const hoIds = [...new Set(proposed.map(p => p.handoff_id))];
  const hos = await get(
    `/handoffs?id=in.(${hoIds.join(",")})&select=id,source_domain_id,target_domain_id`,
  );
  if (hos.length !== hoIds.length) {
    throw new Error(
      `handoff id resolution failed: expected ${hoIds.length}, got ${hos.length}`,
    );
  }
  for (const h of hos) {
    if (Number(h.source_domain_id) === Number(h.target_domain_id)) {
      throw new Error(`handoff ${h.id} is intra-domain; expected cross-domain only`);
    }
  }

  // Skip rows that already exist on (handoff_id, process_id).
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${hoIds.join(",")})&select=handoff_id,process_id`,
  );
  const existingKeys = new Set(
    existing.map(r => `${r.handoff_id}::${r.process_id}`),
  );
  const missing = proposed.filter(
    p => !existingKeys.has(`${p.handoff_id}::${p.process_id}`),
  );
  console.log(
    `  ${proposed.length} proposed; ${proposed.length - missing.length} already present; ${missing.length} to insert`,
  );
  if (missing.length === 0) return;

  // record_status default = 'new' per Rule #1, omit. role default = 'implements'.
  // proposal_source = 'agent_curated' per the audit's classification.
  const rows = missing.map(p => ({
    handoff_id: p.handoff_id,
    process_id: p.process_id,
    proposal_source: "agent_curated",
  }));
  await post("/handoff_processes", rows);
  console.log(`  inserted ${rows.length} handoff_processes`);
}

// ============================================================
// Main
// ============================================================
const main = async () => {
  console.log("=== MFG-OPS Bucket 1 technical fixes. 2026-05-31 ===");
  await fixS6();
  await fixW1();
  await fixH1();
  console.log("\nAll technical B1 fixes applied. Re-run safe.");
};

await main();
