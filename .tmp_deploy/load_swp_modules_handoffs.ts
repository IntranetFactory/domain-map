/**
 * Phase M (modules) + B-band (handoff backfill + intra-domain) loader for SWP (id 100).
 *
 * Idempotent. Natural-key reads, insert only missing. Chunked POSTs <=50.
 *
 * Run from project root:
 *   bun run c:/dev/domain-map/.tmp_deploy/load_swp_modules_handoffs.ts
 */

const SWP_DOMAIN_ID = 100;
const HCM_DOMAIN_ID = 54;
const HCM_ORG_POSITIONS_MODULE_ID = 55;

type Row = Record<string, any>;

interface CmdResult {
  ok: boolean;
  data: any;
  status: number;
  stderr: string;
}

async function postgrest(method: string, path: string, body?: any): Promise<CmdResult> {
  const payload: Row = { method, path };
  if (body !== undefined) payload.body = body;
  const json = JSON.stringify(payload);
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", json],
    { stdout: "pipe", stderr: "pipe" }
  );
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    return { ok: false, data: null, status: code, stderr };
  }
  const t = stdout.trim();
  return { ok: true, data: t ? JSON.parse(t) : null, status: 0, stderr };
}

async function get(path: string): Promise<any> {
  const r = await postgrest("GET", path);
  if (!r.ok) {
    console.error(`GET ${path} failed: ${r.stderr}`);
    throw new Error(`GET ${path} failed`);
  }
  return r.data;
}

async function postOne(path: string, body: Row): Promise<any> {
  const r = await postgrest("POST", path, body);
  if (!r.ok) {
    console.error(`POST ${path} failed: ${r.stderr}\n  body=${JSON.stringify(body)}`);
    throw new Error(`POST ${path} failed`);
  }
  return r.data;
}

async function postChunked(path: string, rows: Row[]): Promise<any[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: any[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const r = await postgrest("POST", path, slice);
    if (!r.ok) {
      console.error(`POST ${path} chunk ${i} failed: ${r.stderr}`);
      throw new Error(`POST ${path} chunk failed`);
    }
    if (Array.isArray(r.data)) out.push(...r.data);
  }
  return out;
}

async function patchOne(path: string, body: Row): Promise<any> {
  const r = await postgrest("PATCH", path, body);
  if (!r.ok) {
    console.error(`PATCH ${path} failed: ${r.stderr}\n  body=${JSON.stringify(body)}`);
    throw new Error(`PATCH ${path} failed`);
  }
  return r.data;
}

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map((r) => {
    const out: Row = {};
    for (const k of keys) out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return out;
  });
}

function assertNoEmDash(label: string, text: string) {
  if (text.includes("—")) {
    throw new Error(`em-dash detected in ${label}: ${text}`);
  }
}

// ---------------- Module specs ----------------

type ModSpec = {
  code: string;
  name: string;
  description: string;
};

const MODULES: ModSpec[] = [
  {
    code: "SWP-DEMAND-FORECAST",
    name: "Demand Forecast",
    description:
      "Headcount and position demand modeling. Masters headcount_plans, position_demand_forecasts, and skills_gap_analyses. Publishes the canonical hiring-demand signal that ATS, HCM, and LMS subscribe to. Contributor on the requisition slice of job_requisitions (the authorization-to-hire layer that ATS then executes).",
  },
  {
    code: "SWP-SUPPLY-PLANNING",
    name: "Supply Planning",
    description:
      "Talent supply, internal-mobility forecasts, retirement curves, and gap reconciliation. Consumes employees, hcm_positions, org_units, job_profiles, attrition_forecasts, and skills_gap_analyses to build the supply side of the workforce plan. No unique master entities today; supply artifacts are derived from consumed sources and feed back into demand-vs-supply reconciliation inside the planning cycle.",
  },
  {
    code: "SWP-SCENARIO-MODELING",
    name: "Scenario Modeling",
    description:
      "What-if workforce scenarios, org-design alternatives, labor-market intelligence, and M&A or transformation models. Masters workforce_plans, workforce_scenarios, org_designs, and labor_market_benchmarks. Adopted scenarios cascade into HCM org changes, EPM financial-plan assumptions, and downstream cost projections.",
  },
  {
    code: "SWP-COST-PROJECTIONS",
    name: "Cost Projections",
    description:
      "Workforce cost projections, cost-of-plan, and the EPM handoff. Masters workforce_cost_projections (the boundary-object SWP authors and EPM consumes into the consolidated budget). Contributor on financial_plans for the labor-cost slice. Consumes salary_bands, merit_cycles, cost_centers, employees, and hcm_positions to size the loaded-comp envelope.",
  },
];

// (data_object_id, role, necessity, notes) per module code.
type DMDOSpec = { mod: string; do_id: number; role: string; necessity: string; notes: string };

const DMDO_SPECS: DMDOSpec[] = [
  // DEMAND-FORECAST
  { mod: "SWP-DEMAND-FORECAST", do_id: 24, role: "master", necessity: "required", notes: "Headcount plans live here; published demand cascades to ATS and HCM." },
  { mod: "SWP-DEMAND-FORECAST", do_id: 25, role: "master", necessity: "required", notes: "Position demand forecasts by org x geo x level x quarter." },
  { mod: "SWP-DEMAND-FORECAST", do_id: 26, role: "master", necessity: "required", notes: "Skills gap analyses driving sourcing and learning priorities." },
  { mod: "SWP-DEMAND-FORECAST", do_id: 1, role: "contributor", necessity: "required", notes: "SWP authorizes the requisition slice (approved position, budget, time window); ATS owns execution." },
  { mod: "SWP-DEMAND-FORECAST", do_id: 42, role: "consumer", necessity: "required", notes: "Attrition forecasts feed natural-reduction assumptions into demand." },
  { mod: "SWP-DEMAND-FORECAST", do_id: 32, role: "consumer", necessity: "required", notes: "Positions inventory for demand-vs-actuals reconciliation." },
  { mod: "SWP-DEMAND-FORECAST", do_id: 31, role: "consumer", necessity: "required", notes: "Employee headcount feeds plan-vs-actual." },
  { mod: "SWP-DEMAND-FORECAST", do_id: 34, role: "consumer", necessity: "required", notes: "Org units are the planning dimension." },
  { mod: "SWP-DEMAND-FORECAST", do_id: 33, role: "consumer", necessity: "required", notes: "Job profiles define what roles are being planned." },
  { mod: "SWP-DEMAND-FORECAST", do_id: 196, role: "consumer", necessity: "required", notes: "Cost centers are the planning dimension on the finance side." },

  // SUPPLY-PLANNING
  { mod: "SWP-SUPPLY-PLANNING", do_id: 31, role: "consumer", necessity: "required", notes: "Current employee population is the supply baseline." },
  { mod: "SWP-SUPPLY-PLANNING", do_id: 32, role: "consumer", necessity: "required", notes: "Positions inventory shapes available supply." },
  { mod: "SWP-SUPPLY-PLANNING", do_id: 34, role: "consumer", necessity: "required", notes: "Org units are the planning dimension." },
  { mod: "SWP-SUPPLY-PLANNING", do_id: 33, role: "consumer", necessity: "required", notes: "Job profiles define the role catalog for supply mapping." },
  { mod: "SWP-SUPPLY-PLANNING", do_id: 42, role: "consumer", necessity: "required", notes: "Attrition forecasts drive supply attrition curves." },
  { mod: "SWP-SUPPLY-PLANNING", do_id: 26, role: "consumer", necessity: "optional", notes: "Skills gap analyses reconciled against current supply." },

  // SCENARIO-MODELING
  { mod: "SWP-SCENARIO-MODELING", do_id: 23, role: "master", necessity: "required", notes: "Workforce plans (the multi-year planning artifact)." },
  { mod: "SWP-SCENARIO-MODELING", do_id: 27, role: "master", necessity: "required", notes: "Workforce scenarios (growth, restructure, shore-shift)." },
  { mod: "SWP-SCENARIO-MODELING", do_id: 28, role: "master", necessity: "required", notes: "Org designs published as scenarios adopted." },
  { mod: "SWP-SCENARIO-MODELING", do_id: 29, role: "master", necessity: "required", notes: "Labor market benchmarks (salary medians, supply-demand, attrition baselines)." },
  { mod: "SWP-SCENARIO-MODELING", do_id: 34, role: "consumer", necessity: "required", notes: "Org units form the canvas for scenario design." },
  { mod: "SWP-SCENARIO-MODELING", do_id: 33, role: "consumer", necessity: "required", notes: "Job profiles populate scenario role models." },
  { mod: "SWP-SCENARIO-MODELING", do_id: 43, role: "consumer", necessity: "optional", notes: "People KPIs inform scenario evaluation." },

  // COST-PROJECTIONS
  { mod: "SWP-COST-PROJECTIONS", do_id: 30, role: "master", necessity: "required", notes: "Workforce cost projections; boundary object with EPM (SWP masters, EPM consumes into the consolidated budget)." },
  { mod: "SWP-COST-PROJECTIONS", do_id: 37, role: "contributor", necessity: "optional", notes: "SWP refines the labor-cost slice of the financial plan." },
  { mod: "SWP-COST-PROJECTIONS", do_id: 154, role: "consumer", necessity: "optional", notes: "Salary bands feed loaded-comp assumptions." },
  { mod: "SWP-COST-PROJECTIONS", do_id: 155, role: "consumer", necessity: "optional", notes: "Merit cycles model planned increase." },
  { mod: "SWP-COST-PROJECTIONS", do_id: 196, role: "consumer", necessity: "required", notes: "Cost centers are the finance dimension." },
  { mod: "SWP-COST-PROJECTIONS", do_id: 31, role: "consumer", necessity: "required", notes: "Employee population sizes the comp envelope." },
  { mod: "SWP-COST-PROJECTIONS", do_id: 32, role: "consumer", necessity: "required", notes: "Positions inventory sizes the position-cost envelope." },
];

// Starter sequence
const STARTER_SEQ: { code: string; position: number; notes: string }[] = [
  { code: "SWP-DEMAND-FORECAST", position: 1, notes: "Start here. Provides headcount and position demand plus skills gap, the canonical hiring-demand signal SWP publishes to ATS, HCM, and LMS." },
  { code: "SWP-SCENARIO-MODELING", position: 2, notes: "Add workforce scenarios, org-design alternatives, and labor-market benchmarks; scenario adoption cascades into HCM and EPM." },
  { code: "SWP-COST-PROJECTIONS", position: 3, notes: "Layer in workforce_cost_projections; this is the boundary-object handoff to EPM for the consolidated budget." },
  { code: "SWP-SUPPLY-PLANNING", position: 4, notes: "Optional supply-side overlay for gap reconciliation; consumes employees, positions, and attrition forecasts." },
];

// ---------------- B9b intra-domain handoffs ----------------

type IntraSpec = {
  src_code: string;
  tgt_code: string;
  trigger_event_id: number;
  data_object_id: number;
  description: string;
};

const INTRA_HANDOFFS: IntraSpec[] = [
  {
    src_code: "SWP-DEMAND-FORECAST",
    tgt_code: "SWP-SUPPLY-PLANNING",
    trigger_event_id: 384, // position_demand_forecast.updated
    data_object_id: 25,
    description: "Refreshed demand triggers supply reconciliation: supply-planning evaluates internal-mobility, retirement, and external-supply assumptions against the new demand baseline.",
  },
  {
    src_code: "SWP-SCENARIO-MODELING",
    tgt_code: "SWP-DEMAND-FORECAST",
    trigger_event_id: 386, // workforce_scenario.approved
    data_object_id: 27,
    description: "Adopted scenario refreshes the headcount and position demand baseline; demand-forecast re-runs its plan under the chosen scenario.",
  },
  {
    src_code: "SWP-SCENARIO-MODELING",
    tgt_code: "SWP-COST-PROJECTIONS",
    trigger_event_id: 386, // workforce_scenario.approved
    data_object_id: 27,
    description: "Adopted scenario triggers a cost-projection recompute under the new headcount and org-design assumptions.",
  },
  {
    src_code: "SWP-DEMAND-FORECAST",
    tgt_code: "SWP-COST-PROJECTIONS",
    trigger_event_id: 62, // headcount.approved
    data_object_id: 1,
    description: "Approved headcount triggers cost-projection refresh: cost-projections rolls the new requisition load into the loaded-comp envelope.",
  },
];

// ---------------- B10b backfill plan ----------------

type Backfill = {
  handoff_id: number;
  source_module_code?: string; // omit when not patching
  target_module_id?: number | null; // explicit null kept null
  reason: string;
};

const OUTBOUND_BACKFILL: Backfill[] = [
  { handoff_id: 14, source_module_code: "SWP-DEMAND-FORECAST", reason: "headcount.approved (62) payload job_requisitions; DEMAND-FORECAST contributes the requisition slice." },
  { handoff_id: 15, source_module_code: "SWP-SCENARIO-MODELING", target_module_id: HCM_ORG_POSITIONS_MODULE_ID, reason: "hcm_position.approved_for_creation (98) payload org_designs; SCENARIO-MODELING masters org_designs; HCM target is ORG-POSITIONS." },
  { handoff_id: 16, source_module_code: "SWP-COST-PROJECTIONS", reason: "cost_projection.approved (40) payload workforce_cost_projections; COST-PROJECTIONS masters this. EPM target NULL: no modules yet." },
  { handoff_id: 454, source_module_code: "SWP-DEMAND-FORECAST", target_module_id: HCM_ORG_POSITIONS_MODULE_ID, reason: "position_demand_forecast.updated (384) payload 25; DEMAND-FORECAST masters; HCM target ORG-POSITIONS." },
  { handoff_id: 455, source_module_code: "SWP-DEMAND-FORECAST", reason: "position_demand_forecast.updated (384) payload 25; DEMAND-FORECAST masters; ATS target already 4." },
  { handoff_id: 456, source_module_code: "SWP-DEMAND-FORECAST", reason: "skills_gap_analysis.completed (385) payload 26; DEMAND-FORECAST masters skills_gap_analyses; LMS target already 34." },
  { handoff_id: 457, source_module_code: "SWP-SCENARIO-MODELING", target_module_id: HCM_ORG_POSITIONS_MODULE_ID, reason: "workforce_scenario.approved (386) payload 27; SCENARIO-MODELING masters; HCM target ORG-POSITIONS." },
  { handoff_id: 458, source_module_code: "SWP-SCENARIO-MODELING", reason: "workforce_scenario.approved (386) payload 27; SCENARIO-MODELING masters; EPM target NULL: no modules." },
  { handoff_id: 459, source_module_code: "SWP-SCENARIO-MODELING", target_module_id: HCM_ORG_POSITIONS_MODULE_ID, reason: "org_design.published (387) payload 28; SCENARIO-MODELING masters org_designs; HCM target ORG-POSITIONS." },
  { handoff_id: 460, source_module_code: "SWP-SCENARIO-MODELING", reason: "labor_market_benchmark.refreshed (388) payload 29; SCENARIO-MODELING masters; COMP-MGMT target NULL: no modules." },
];

// Inbound B10b: target side is SWP; derive module from payload data_object.
// We only fill target_domain_module_id (source side belongs to that domain's audit).
const INBOUND_PAYLOAD_TO_MODULE: Record<number, string> = {
  // demand-forecast topics
  23: "SWP-DEMAND-FORECAST",   // workforce_plans inbound is operational/financial → demand baseline
  24: "SWP-DEMAND-FORECAST",   // headcount actuals
  25: "SWP-DEMAND-FORECAST",   // requisition.filled payload (position demand reconcile)
  1: "SWP-DEMAND-FORECAST",    // job_requisitions
  42: "SWP-DEMAND-FORECAST",   // attrition_forecasts inbound updates demand assumptions
  // other inbound payloads not held by any SWP module today → leave NULL
};

// ---------------- Main ----------------

async function main() {
  console.log("SWP Phase M + B-band loader (2026-05-24)");
  console.log("=========================================\n");

  // Pre-flight: em-dash sweep.
  for (const m of MODULES) {
    assertNoEmDash(`module ${m.code} description`, m.description);
    assertNoEmDash(`module ${m.code} name`, m.name);
  }
  for (const d of DMDO_SPECS) assertNoEmDash(`dmdo ${d.mod}/${d.do_id} notes`, d.notes);
  for (const s of STARTER_SEQ) assertNoEmDash(`starter ${s.code} notes`, s.notes);
  for (const h of INTRA_HANDOFFS) assertNoEmDash(`intra-handoff ${h.src_code}->${h.tgt_code} desc`, h.description);
  for (const b of OUTBOUND_BACKFILL) assertNoEmDash(`backfill ${b.handoff_id} reason`, b.reason);
  console.log("Pre-flight: em-dash sweep PASS.\n");

  // Sanity check: confirm SWP domain.
  const swp = await get(`/domains?id=eq.${SWP_DOMAIN_ID}&select=id,domain_code,domain_name`);
  if (!Array.isArray(swp) || swp.length === 0) {
    throw new Error("SWP domain not found");
  }
  console.log(`SWP confirmed: ${swp[0].domain_code} = ${swp[0].domain_name}\n`);

  // Step 1: insert / read modules.
  console.log("Step 1: SWP modules");
  const existingMods: any[] = await get(`/domain_modules?domain_id=eq.${SWP_DOMAIN_ID}&select=id,domain_module_code`);
  const modByCode = new Map<string, number>(existingMods.map((m) => [m.domain_module_code, m.id]));
  const toCreate = MODULES.filter((m) => !modByCode.has(m.code));
  if (toCreate.length > 0) {
    const inserted = await postChunked(`/domain_modules`, toCreate.map((m) => ({
      domain_module_code: m.code,
      domain_module_name: m.name,
      domain_id: SWP_DOMAIN_ID,
      description: m.description,
    })));
    for (const row of inserted) modByCode.set(row.domain_module_code, row.id);
    console.log(`  inserted ${inserted.length} modules`);
  } else {
    console.log("  no new modules to insert");
  }
  for (const m of MODULES) {
    console.log(`  ${m.code} = ${modByCode.get(m.code)}`);
  }

  // Step 2: domain_module_data_objects
  console.log("\nStep 2: domain_module_data_objects");
  const allModIds = MODULES.map((m) => modByCode.get(m.code)!).filter((x) => x);
  const existingDmdo: any[] = await get(`/domain_module_data_objects?domain_module_id=in.(${allModIds.join(",")})&select=domain_module_id,data_object_id,role`);
  const dmdoKey = (m: number, d: number) => `${m}|${d}`;
  const haveDmdo = new Set<string>(existingDmdo.map((r) => dmdoKey(r.domain_module_id, r.data_object_id)));
  const dmdoToInsert: Row[] = [];
  for (const spec of DMDO_SPECS) {
    const mid = modByCode.get(spec.mod);
    if (!mid) throw new Error(`module ${spec.mod} not resolved`);
    if (haveDmdo.has(dmdoKey(mid, spec.do_id))) continue;
    dmdoToInsert.push({
      domain_module_id: mid,
      data_object_id: spec.do_id,
      role: spec.role,
      necessity: spec.necessity,
      notes: spec.notes,
    });
  }
  if (dmdoToInsert.length > 0) {
    await postChunked(`/domain_module_data_objects`, dmdoToInsert);
    console.log(`  inserted ${dmdoToInsert.length} dmdo rows`);
  } else {
    console.log("  no new dmdo rows");
  }

  // Step 3: domain_starter_modules
  console.log("\nStep 3: domain_starter_modules");
  const existingStarter: any[] = await get(`/domain_starter_modules?domain_id=eq.${SWP_DOMAIN_ID}&select=domain_module_id,position`);
  const haveStarter = new Set<number>(existingStarter.map((r) => r.domain_module_id));
  const starterToInsert: Row[] = [];
  for (const s of STARTER_SEQ) {
    const mid = modByCode.get(s.code);
    if (!mid) throw new Error(`starter ${s.code} not resolved`);
    if (haveStarter.has(mid)) continue;
    starterToInsert.push({
      domain_id: SWP_DOMAIN_ID,
      domain_module_id: mid,
      position: s.position,
      notes: s.notes,
    });
  }
  if (starterToInsert.length > 0) {
    await postChunked(`/domain_starter_modules`, starterToInsert);
    console.log(`  inserted ${starterToInsert.length} starter rows`);
  } else {
    console.log("  no new starter rows");
  }

  // Step 4: B9b intra-domain handoffs
  console.log("\nStep 4: intra-domain handoffs (B9b)");
  const existingIntra: any[] = await get(`/handoffs?source_domain_id=eq.${SWP_DOMAIN_ID}&target_domain_id=eq.${SWP_DOMAIN_ID}&select=id,trigger_event_id,data_object_id,source_domain_module_id,target_domain_module_id`);
  const intraKey = (src_mod: number, tgt_mod: number, te: number, do_id: number) => `${src_mod}|${tgt_mod}|${te}|${do_id}`;
  const haveIntra = new Set<string>(existingIntra.map((r) => intraKey(r.source_domain_module_id, r.target_domain_module_id, r.trigger_event_id, r.data_object_id)));
  const intraToInsert: Row[] = [];
  for (const h of INTRA_HANDOFFS) {
    const src = modByCode.get(h.src_code);
    const tgt = modByCode.get(h.tgt_code);
    if (!src || !tgt) throw new Error(`intra modules unresolved: ${h.src_code}/${h.tgt_code}`);
    if (haveIntra.has(intraKey(src, tgt, h.trigger_event_id, h.data_object_id))) continue;
    intraToInsert.push({
      source_domain_id: SWP_DOMAIN_ID,
      target_domain_id: SWP_DOMAIN_ID,
      source_domain_module_id: src,
      target_domain_module_id: tgt,
      trigger_event_id: h.trigger_event_id,
      data_object_id: h.data_object_id,
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      description: h.description,
      notes: "",
    });
  }
  if (intraToInsert.length > 0) {
    await postChunked(`/handoffs`, intraToInsert);
    console.log(`  inserted ${intraToInsert.length} intra-domain handoffs`);
  } else {
    console.log("  no new intra-domain handoffs");
  }

  // Step 5: B10b backfill outbound rows.
  console.log("\nStep 5: B10b backfill of existing outbound handoffs");
  let patched = 0;
  for (const b of OUTBOUND_BACKFILL) {
    const body: Row = {};
    if (b.source_module_code) {
      const mid = modByCode.get(b.source_module_code);
      if (!mid) throw new Error(`backfill source ${b.source_module_code} unresolved`);
      body.source_domain_module_id = mid;
    }
    if (b.target_module_id !== undefined && b.target_module_id !== null) {
      body.target_domain_module_id = b.target_module_id;
    }
    if (Object.keys(body).length === 0) continue;
    // Only patch if currently null on the column(s) we'd change.
    const current: any[] = await get(`/handoffs?id=eq.${b.handoff_id}&select=source_domain_module_id,target_domain_module_id`);
    if (current.length === 0) {
      console.log(`  handoff ${b.handoff_id}: NOT FOUND, skipping`);
      continue;
    }
    const cur = current[0];
    const todo: Row = {};
    if (body.source_domain_module_id != null && cur.source_domain_module_id == null) {
      todo.source_domain_module_id = body.source_domain_module_id;
    }
    if (body.target_domain_module_id != null && cur.target_domain_module_id == null) {
      todo.target_domain_module_id = body.target_domain_module_id;
    }
    if (Object.keys(todo).length === 0) {
      console.log(`  handoff ${b.handoff_id}: already populated, skipping`);
      continue;
    }
    await patchOne(`/handoffs?id=eq.${b.handoff_id}`, todo);
    patched++;
    console.log(`  handoff ${b.handoff_id}: patched ${Object.keys(todo).join(", ")}`);
  }
  console.log(`  total patches: ${patched}`);

  // Step 6: B10b backfill INBOUND target-side (SWP is target).
  console.log("\nStep 6: B10b backfill INBOUND target-side (SWP target_domain_module_id)");
  const inbound: any[] = await get(`/handoffs?target_domain_id=eq.${SWP_DOMAIN_ID}&select=id,data_object_id,target_domain_module_id`);
  let inboundPatched = 0;
  let inboundSkippedNoMap = 0;
  for (const h of inbound) {
    if (h.target_domain_module_id != null) continue;
    const code = INBOUND_PAYLOAD_TO_MODULE[h.data_object_id];
    if (!code) {
      inboundSkippedNoMap++;
      console.log(`  inbound ${h.id}: payload ${h.data_object_id} not mapped to any SWP module, leaving NULL`);
      continue;
    }
    const mid = modByCode.get(code);
    if (!mid) continue;
    await patchOne(`/handoffs?id=eq.${h.id}`, { target_domain_module_id: mid });
    inboundPatched++;
    console.log(`  inbound ${h.id}: target_domain_module_id = ${code} (${mid})`);
  }
  console.log(`  inbound patched: ${inboundPatched}, no-map: ${inboundSkippedNoMap}`);

  // Step 7: post-load verification.
  console.log("\nStep 7: post-load verification");
  const modsFinal: any[] = await get(`/domain_modules?domain_id=eq.${SWP_DOMAIN_ID}&select=id,domain_module_code`);
  console.log(`  modules: ${modsFinal.length}`);
  const finalIds = modsFinal.map((m) => m.id);
  const dmdoFinal: any[] = await get(`/domain_module_data_objects?domain_module_id=in.(${finalIds.join(",")})&select=domain_module_id`);
  console.log(`  dmdo rows: ${dmdoFinal.length}`);
  const starterFinal: any[] = await get(`/domain_starter_modules?domain_id=eq.${SWP_DOMAIN_ID}&select=id`);
  console.log(`  starter rows: ${starterFinal.length}`);
  const intraFinal: any[] = await get(`/handoffs?source_domain_id=eq.${SWP_DOMAIN_ID}&target_domain_id=eq.${SWP_DOMAIN_ID}&select=id`);
  console.log(`  intra-domain handoffs: ${intraFinal.length}`);
  const outboundFinal: any[] = await get(`/handoffs?source_domain_id=eq.${SWP_DOMAIN_ID}&target_domain_id=neq.${SWP_DOMAIN_ID}&select=id,source_domain_module_id,target_domain_module_id`);
  const outboundNullSrc = outboundFinal.filter((r) => r.source_domain_module_id == null).length;
  console.log(`  outbound rows: ${outboundFinal.length} (NULL src module: ${outboundNullSrc})`);
  const inboundFinal: any[] = await get(`/handoffs?target_domain_id=eq.${SWP_DOMAIN_ID}&source_domain_id=neq.${SWP_DOMAIN_ID}&select=id,target_domain_module_id`);
  const inboundNullTgt = inboundFinal.filter((r) => r.target_domain_module_id == null).length;
  console.log(`  inbound rows: ${inboundFinal.length} (NULL tgt module: ${inboundNullTgt})`);

  console.log("\nDone.");
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/domain_modules");
  console.log("  https://tests.semantius.app/domain_map/domain_module_data_objects");
  console.log("  https://tests.semantius.app/domain_map/domain_starter_modules");
  console.log("  https://tests.semantius.app/domain_map/handoffs");
}

main().catch((e) => {
  console.error("\nFATAL:", e?.message || e);
  process.exit(1);
});
