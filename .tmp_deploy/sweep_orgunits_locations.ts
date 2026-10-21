/**
 * Catalog-wide sweep: org_units + locations embedded_master rows across the
 * IT-ops, asset, procurement, risk, and field-service clusters.
 *
 * Run from project root: bun run .tmp_deploy/sweep_orgunits_locations.ts
 */

const ORG_UNITS = 34;
const LOCATIONS = 795;

// Non-modularized candidate domains: rows go on domain_data_objects
const DD = {
  // IT-ops cluster
  CMDB: 4,
  SECOPS: 11,
  VULN_MGMT: 13,
  IGA: 35,
  // Asset cluster (HAM modularized via ITAM, but HAM domain itself is separate)
  HAM: 51,
  SAM: 52,
  EAM: 53,
  FLEET_MAINT: 149,
  // Field service
  FSM: 31,
  // Procurement / finance ops
  S2P: 27,
  AP_AUTO: 29,
  EXPENSE: 67,
  CLM: 26,
  // Risk / governance
  GRC: 15,
  AUDIT: 16,
  // Customer-facing
  CSM: 30,
  // HR-adjacent
  COMP_MGMT: 60,
  // Order / commerce
  OMS: 32,
};

// Modularized candidate modules
const MOD = {
  ITAM_LIFECYCLE: 59,
  HCM_CORE_WORKER: 54,
  ATS_RECRUITMENT_PIPELINE: 4,
  ONB_WELCOME_EXPERIENCE: 37,
  SMP_RENEWAL: 31,
};

interface CmdResult { ok: boolean; data: any; status: number; err?: string }

async function postgrestOnce(method: string, path: string, body?: any): Promise<CmdResult> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" }
  );
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) return { ok: false, data: null, status: code, err: stderr.trim() || stdout.trim() };
  const text = stdout.trim();
  try { return { ok: true, data: text ? JSON.parse(text) : null, status: 0 }; }
  catch { return { ok: true, data: text, status: 0 }; }
}

async function postgrest(method: string, path: string, body?: any): Promise<CmdResult> {
  let r = await postgrestOnce(method, path, body);
  let attempts = 1;
  while (!r.ok && r.err && r.err.includes("required audience not found") && attempts < 5) {
    console.warn(`  JWT-audience transient (attempt ${attempts}, retrying after 4s)...`);
    await new Promise((resolve) => setTimeout(resolve, 4000));
    r = await postgrestOnce(method, path, body);
    attempts++;
  }
  return r;
}
async function get(path: string) { const r = await postgrest("GET", path); if (!r.ok) throw new Error(`GET ${path}: ${r.err}`); return r.data; }
async function post(path: string, body: any) { const r = await postgrest("POST", path, body); if (!r.ok) throw new Error(`POST ${path}: ${r.err}`); return r.data; }

// ------ DOMAIN-LEVEL ROWS ------

interface DomainRow {
  domain_id: number;
  data_object_id: number;
  role: string;
  necessity: string;
  notes: string;
}

const DOMAIN_ROWS: DomainRow[] = [
  // org_units across IT-ops cluster
  { domain_id: DD.CMDB,        data_object_id: ORG_UNITS, role: "embedded_master", necessity: "required",
    notes: "CMDB local-masters org_units when no HCM is deployed; reads from HCM when present. CI ownership, support-group assignment, and impact-analysis rollups all key on the departmental tree." },
  { domain_id: DD.IGA,         data_object_id: ORG_UNITS, role: "embedded_master", necessity: "required",
    notes: "IGA local-masters org_units for departmental access policies (dept-scoped role grants, segregation of duties, approver lookup). Demotes to consumer in holistic deployments with HCM present." },
  { domain_id: DD.SECOPS,      data_object_id: ORG_UNITS, role: "embedded_master", necessity: "optional",
    notes: "SOC team assignment is usually flat (shared on-call), but enterprise SOCs scope incident response by business-unit. Optional embedded_master when business-unit scoping is in play." },
  { domain_id: DD.VULN_MGMT,   data_object_id: ORG_UNITS, role: "embedded_master", necessity: "optional",
    notes: "Findings can be routed to the owning department; many deployments stay flat. Optional embedded_master when departmental routing is enabled." },

  // Asset cluster
  { domain_id: DD.HAM,         data_object_id: ORG_UNITS, role: "embedded_master", necessity: "required",
    notes: "HAM local-masters org_units; every hardware asset has a departmental owner for cost-allocation and lifecycle accountability." },
  { domain_id: DD.SAM,         data_object_id: ORG_UNITS, role: "embedded_master", necessity: "required",
    notes: "Software entitlement is allocated by department for license-true-up and chargeback; SAM local-masters when HCM is absent." },
  { domain_id: DD.EAM,         data_object_id: ORG_UNITS, role: "embedded_master", necessity: "required",
    notes: "Industrial asset ownership and maintenance accountability follow the operational org structure (plant -> maintenance team -> shift)." },
  { domain_id: DD.FLEET_MAINT, data_object_id: ORG_UNITS, role: "embedded_master", necessity: "optional",
    notes: "Fleet ownership by regional / divisional org structure; common in multi-region fleets, optional for small fleets." },

  // Field service
  { domain_id: DD.FSM,         data_object_id: ORG_UNITS, role: "embedded_master", necessity: "required",
    notes: "Work orders routed by department (service team / region / dispatch group); FSM local-masters org_units when HCM is not deployed." },

  // Procurement / finance ops
  { domain_id: DD.S2P,         data_object_id: ORG_UNITS, role: "embedded_master", necessity: "required",
    notes: "Purchase requisitions, POs, and supplier qualifications route through departmental approval chains; S2P local-masters when no HCM is present." },
  { domain_id: DD.AP_AUTO,     data_object_id: ORG_UNITS, role: "embedded_master", necessity: "required",
    notes: "Invoice coding and approval routing key off the requester's department; embedded_master required for AP automation to function standalone." },
  { domain_id: DD.EXPENSE,     data_object_id: ORG_UNITS, role: "embedded_master", necessity: "required",
    notes: "Expense submission, policy enforcement, and approval routing all key on the employee's department." },
  { domain_id: DD.CLM,         data_object_id: ORG_UNITS, role: "embedded_master", necessity: "optional",
    notes: "Some CLM deployments track contract ownership by department; many stay flat with legal-team-as-owner. Optional embedded_master." },

  // Risk / governance
  { domain_id: DD.GRC,         data_object_id: ORG_UNITS, role: "embedded_master", necessity: "required",
    notes: "Control ownership, risk scoping, and policy attestation all follow the org tree; GRC local-masters when no HCM is present." },
  { domain_id: DD.AUDIT,       data_object_id: ORG_UNITS, role: "embedded_master", necessity: "required",
    notes: "Audit engagement scoping and finding-routing key on the audited business unit; embedded_master required." },

  // Customer-facing
  { domain_id: DD.CSM,         data_object_id: ORG_UNITS, role: "embedded_master", necessity: "required",
    notes: "Case ownership by support team / region uses the org tree; CSM local-masters when no HCM is deployed." },

  // HR-adjacent
  { domain_id: DD.COMP_MGMT,   data_object_id: ORG_UNITS, role: "embedded_master", necessity: "required",
    notes: "Compensation planning rolls up through the org tree (manager -> team -> dept -> BU); COMP-MGMT local-masters when standalone." },

  // ---------- locations rows ----------

  // IT-ops cluster
  { domain_id: DD.CMDB,        data_object_id: LOCATIONS, role: "embedded_master", necessity: "required",
    notes: "Every CI is deployed at a location; CMDB local-masters locations when no IWMS is present." },
  { domain_id: DD.IGA,         data_object_id: LOCATIONS, role: "embedded_master", necessity: "optional",
    notes: "Location-based access policies (geo-fenced auth, regional administrators); optional in flat-IT shops." },

  // Asset cluster
  { domain_id: DD.HAM,         data_object_id: LOCATIONS, role: "embedded_master", necessity: "required",
    notes: "Every hardware asset has a physical location (HQ, branch, home-office); HAM local-masters when no IWMS is present." },
  { domain_id: DD.EAM,         data_object_id: LOCATIONS, role: "embedded_master", necessity: "required",
    notes: "Industrial assets are sited at plants / facilities / pipelines; EAM local-masters its operational-site list." },
  { domain_id: DD.FLEET_MAINT, data_object_id: LOCATIONS, role: "embedded_master", necessity: "required",
    notes: "Vehicles are based at depots / garages / regional yards; FLEET-MAINT local-masters site list." },

  // Field service
  { domain_id: DD.FSM,         data_object_id: LOCATIONS, role: "embedded_master", necessity: "required",
    notes: "Work-order dispatch keys on the service location; FSM local-masters locations when no IWMS is present." },

  // Order
  { domain_id: DD.OMS,         data_object_id: LOCATIONS, role: "embedded_master", necessity: "optional",
    notes: "Some orders carry pickup-from-location / delivery-from-location semantics; OMS local-masters for omnichannel fulfilment scenarios. Optional in pure ship-from-warehouse setups." },

  // Audit
  { domain_id: DD.AUDIT,       data_object_id: LOCATIONS, role: "embedded_master", necessity: "optional",
    notes: "On-site audits scope by location; many audit programs stay desk-bound. Optional embedded_master." },

  // Comp
  { domain_id: DD.COMP_MGMT,   data_object_id: LOCATIONS, role: "embedded_master", necessity: "optional",
    notes: "Geo-differentiated comp ranges key on work location; optional in single-geography orgs." },
];

// ------ MODULE-LEVEL ROWS ------

interface ModuleRow {
  domain_module_id: number;
  data_object_id: number;
  role: string;
  necessity: string;
  notes: string;
}

const MODULE_ROWS: ModuleRow[] = [
  // ITAM-LIFECYCLE: assets are owned by departments and located somewhere
  { domain_module_id: MOD.ITAM_LIFECYCLE, data_object_id: ORG_UNITS, role: "embedded_master", necessity: "required",
    notes: "Every asset has a departmental owner for cost-allocation; ITAM-LIFECYCLE local-masters when no HCM is deployed." },
  { domain_module_id: MOD.ITAM_LIFECYCLE, data_object_id: LOCATIONS, role: "embedded_master", necessity: "required",
    notes: "Asset placement keys on location; ITAM-LIFECYCLE local-masters when no IWMS is deployed." },

  // HCM-CORE-WORKER masters worker records; locations is employee work-location
  { domain_module_id: MOD.HCM_CORE_WORKER, data_object_id: LOCATIONS, role: "embedded_master", necessity: "required",
    notes: "Every worker record carries a primary work-location. HCM local-masters when no IWMS is present; reads from IWMS when present." },

  // ATS jobs are posted at locations; recruitment is org-unit-scoped (already covered for org_units)
  { domain_module_id: MOD.ATS_RECRUITMENT_PIPELINE, data_object_id: LOCATIONS, role: "embedded_master", necessity: "required",
    notes: "Job postings are location-scoped (remote / hybrid / on-site at specific offices). ATS local-masters when no IWMS is present." },

  // Onboarding occurs at a location
  { domain_module_id: MOD.ONB_WELCOME_EXPERIENCE, data_object_id: ORG_UNITS, role: "embedded_master", necessity: "required",
    notes: "Welcome journey configuration keys on the new hire's department; ONB-WELCOME-EXPERIENCE local-masters when standalone." },
  { domain_module_id: MOD.ONB_WELCOME_EXPERIENCE, data_object_id: LOCATIONS, role: "embedded_master", necessity: "required",
    notes: "First-day welcome (badge pickup, desk assignment, office tour) is location-scoped; ONB-WELCOME-EXPERIENCE local-masters." },

  // SMP-RENEWAL: subscriptions allocated by department for chargeback
  { domain_module_id: MOD.SMP_RENEWAL, data_object_id: ORG_UNITS, role: "embedded_master", necessity: "optional",
    notes: "Some SMP deployments allocate subscription seats by department for chargeback; optional embedded_master when chargeback is in play." },
];

async function main() {
  console.log("org_units / locations cluster sweep (2026-05-24)");
  console.log("=================================================");

  // Domain-level inserts
  console.log("\nPhase A: domain_data_objects");
  const allDomainIds = [...new Set(DOMAIN_ROWS.map((r) => r.domain_id))];
  const existing: any[] = await get(
    `/domain_data_objects?data_object_id=in.(${ORG_UNITS},${LOCATIONS})&domain_id=in.(${allDomainIds.join(",")})&select=domain_id,data_object_id`
  );
  const have = new Set(existing.map((r) => `${r.domain_id}:${r.data_object_id}`));
  const toInsertD = DOMAIN_ROWS.filter((r) => !have.has(`${r.domain_id}:${r.data_object_id}`));
  console.log(`  ${toInsertD.length} of ${DOMAIN_ROWS.length} new`);
  if (toInsertD.length > 0) {
    // chunk into ≤20-row batches for the POST
    for (let i = 0; i < toInsertD.length; i += 20) {
      const chunk = toInsertD.slice(i, i + 20);
      await post("/domain_data_objects", chunk);
      console.log(`    inserted batch ${i}..${i + chunk.length}`);
    }
  }

  // Module-level inserts
  console.log("\nPhase B: domain_module_data_objects");
  const allModuleIds = [...new Set(MODULE_ROWS.map((r) => r.domain_module_id))];
  const existingMod: any[] = await get(
    `/domain_module_data_objects?data_object_id=in.(${ORG_UNITS},${LOCATIONS})&domain_module_id=in.(${allModuleIds.join(",")})&select=domain_module_id,data_object_id`
  );
  const haveMod = new Set(existingMod.map((r) => `${r.domain_module_id}:${r.data_object_id}`));
  const toInsertM = MODULE_ROWS.filter((r) => !haveMod.has(`${r.domain_module_id}:${r.data_object_id}`));
  console.log(`  ${toInsertM.length} of ${MODULE_ROWS.length} new`);
  if (toInsertM.length > 0) await post("/domain_module_data_objects", toInsertM);

  // Final silos signal
  console.log("\nPhase C: silos signal");
  for (const [name, doId] of [["org_units", ORG_UNITS], ["locations", LOCATIONS]] as const) {
    const dRows: any[] = await get(
      `/domain_data_objects?data_object_id=eq.${doId}&select=role,domains(domain_code)`
    );
    const mRows: any[] = await get(
      `/domain_module_data_objects?data_object_id=eq.${doId}&select=role,domain_modules(domain_module_code)`
    );
    const dCnt = (r: string) => dRows.filter((x) => x.role === r).length;
    const mCnt = (r: string) => mRows.filter((x) => x.role === r).length;
    console.log(`\n  ${name}:`);
    console.log(`    domain-level: master=${dCnt("master")} embedded=${dCnt("embedded_master")} contributor=${dCnt("contributor")} consumer=${dCnt("consumer")} derived=${dCnt("derived")}`);
    console.log(`    module-level: master=${mCnt("master")} embedded=${mCnt("embedded_master")}`);
    console.log(`    burden score (embedded total): ${dCnt("embedded_master") + mCnt("embedded_master")}`);
  }
  console.log("\nDone.");
}

main().catch((e) => { console.error(e); process.exit(1); });
