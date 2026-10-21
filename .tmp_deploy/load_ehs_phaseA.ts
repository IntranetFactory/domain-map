#!/usr/bin/env bun
// EHS (Environmental, Health and Safety Management) — Phase A loader.
// Market shape: domains + 7 metadata + catalog UX, capabilities + capability_domains,
// domain_modules (4 full) + domain_module_capabilities, vendors (reuse) + solutions + solution_domains.
// Idempotent natural-key loads. record_status omitted (DB default 'new'). No em-dash. No notes populated.

import { ehsCall as call, get, syncTable, insert, validateDomainRow, type Row } from "./ehs_helpers.ts";

// ============================================================
// DOMAIN
// ============================================================
const domainRow = {
  domain_code: "EHS",
  domain_name: "Environmental, Health and Safety Management",
  description:
    "Operational system-of-record for workplace safety (incidents, hazards, risk assessments, corrective actions), occupational health and industrial hygiene, audits and inspections, and environmental compliance (permits, emissions, chemical and safety data sheets). Satisfies OSHA, EU-OSHA, ISO 45001 and ISO 14001 obligations at the establishment level. Operationally upstream of corporate sustainability disclosure (supplies incident and environmental data) and a peer to food-safety management (same safety-management-system archetype, occupational and environmental rather than food-specific).",
  crud_percentage: 80,
  business_logic:
    "Incident-investigation workflows, OSHA recordability determination, serious-injury-and-fatality and leading-indicator analytics, exposure-limit and sampling calculations against occupational exposure limits, corrective-action escalation, and permit-condition and emission-limit monitoring go beyond the JsonLogic-declarable slice.",
  min_org_size: "30 m <2500",
  cost_band: "$$$",
  certification_required: true,
  usa_market_size_usd_m: 2500,
  market_size_source_year: 2025,
  catalog_tagline:
    "Keep your people safe and your sites compliant: log incidents, control hazards, run inspections, and stay ahead of OSHA and environmental rules.",
  catalog_description:
    "Capture every injury, near-miss, and hazard the moment it happens, then drive each one to a closed corrective action. Run job hazard analyses and risk assessments, schedule and complete inspections and audits, and track the training and contractor qualifications that keep your sites compliant. Manage chemicals and safety data sheets, monitor industrial-hygiene exposures and occupational-health records, and keep environmental permits, emissions, and OSHA logs audit-ready. One place to prove your safety and environmental programs are working, from the shop floor to the regulator.",
};

// ============================================================
// CAPABILITIES
// ============================================================
const capabilities: Array<{ capability_code: string; capability_name: string; description: string }> = [
  { capability_code: "EHS-INCIDENT-MGMT", capability_name: "Incident and Near-Miss Management", description: "Capture, investigate, and close out workplace injuries, illnesses, near-misses, and unsafe conditions, including root-cause analysis and recordability determination." },
  { capability_code: "EHS-HAZARD-RISK-ASSESSMENT", capability_name: "Hazard Identification and Risk Assessment", description: "Identify workplace hazards and assess their likelihood and consequence through job hazard analyses, job safety analyses, and risk registers." },
  { capability_code: "EHS-CORRECTIVE-ACTION", capability_name: "Corrective and Preventive Action Management", description: "Assign, track, and verify corrective and preventive actions arising from incidents, inspections, audits, and findings." },
  { capability_code: "EHS-PERMIT-TRACKING", capability_name: "Environmental Permit and Condition Tracking", description: "Track environmental permits, their conditions and limits, renewals, and monitoring obligations for air, water, and waste." },
  { capability_code: "EHS-INSPECTION-AUDIT", capability_name: "Inspection and Audit Management", description: "Plan, schedule, and conduct safety inspections, observations, and management-system audits against standards such as ISO 45001 and ISO 14001." },
  { capability_code: "EHS-CHEMICAL-SDS-MGMT", capability_name: "Chemical and Safety Data Sheet Management", description: "Maintain the chemical inventory, hazardous-substance register, and safety data sheets, with exposure limits and hazard communication." },
  { capability_code: "EHS-OCC-HEALTH-SURVEILLANCE", capability_name: "Occupational Health Surveillance", description: "Manage medical surveillance, exposure records, fitness-for-duty evaluations, and occupational medical case management." },
  { capability_code: "EHS-CONTRACTOR-SAFETY", capability_name: "Contractor Safety Qualification", description: "Prequalify, qualify, and monitor contractors and third parties against safety criteria tied to access and permit-to-work." },
  { capability_code: "EHS-ENV-COMPLIANCE", capability_name: "Environmental Compliance and Emissions", description: "Track emissions and release records, environmental aspect and impact registers, and regulatory environmental reporting obligations." },
  { capability_code: "EHS-TRAINING-COMPETENCY", capability_name: "EHS Training and Competency", description: "Plan, deliver, and record EHS training, competency, and certification, mapping required training to roles and regulations." },
  { capability_code: "EHS-INDUSTRIAL-HYGIENE", capability_name: "Industrial Hygiene Monitoring", description: "Plan and record industrial-hygiene sampling and exposure monitoring against occupational exposure limits for chemical, noise, and other agents." },
];

// ============================================================
// MODULES (4 full)
// ============================================================
const modules: Array<{
  domain_module_code: string;
  domain_module_name: string;
  description: string;
  catalog_tagline: string;
  catalog_description: string;
  capabilities: string[];
}> = [
  {
    domain_module_code: "EHS-SAFETY-INCIDENT",
    domain_module_name: "Safety and Incident Management",
    description:
      "Core safety system-of-record. Masters safety incidents, hazards, occupational risk assessments, and corrective actions, plus the statutory OSHA 300 and 301 injury logs. Used standalone as the entry point for any EHS program and alongside the inspection, hygiene, and environmental modules.",
    catalog_tagline: "Log every incident and near-miss, control your hazards, and close out corrective actions fast.",
    catalog_description:
      "Report injuries, illnesses, and near-misses from any device, then run a structured investigation to root cause and recordability. Build a living hazard register from job hazard analyses and risk assessments, and turn every finding into a tracked corrective or preventive action with owners and due dates. Keep your OSHA 300 and 301 logs accurate and ready for the annual summary and electronic submission.",
    capabilities: ["EHS-INCIDENT-MGMT", "EHS-HAZARD-RISK-ASSESSMENT", "EHS-CORRECTIVE-ACTION"],
  },
  {
    domain_module_code: "EHS-INDUSTRIAL-HYGIENE",
    domain_module_name: "Industrial Hygiene and Occupational Health",
    description:
      "Occupational health and exposure module. Masters industrial-hygiene samples, occupational health records, and the chemical inventory and safety data sheets that drive hazard communication and exposure assessment. Used by manufacturing, process, and lab-heavy organizations where worker exposure is a primary risk.",
    catalog_tagline: "Monitor exposures, manage occupational health records, and keep chemicals and SDS under control.",
    catalog_description:
      "Plan and record industrial-hygiene sampling against occupational exposure limits for chemical, noise, and other agents, and link results back to the workers and tasks exposed. Maintain medical surveillance and exposure records, respirator fit tests, and audiometric results with the retention rules occupational health demands. Keep a current chemical inventory and safety data sheet library so hazard communication and exposure assessment stay accurate.",
    capabilities: ["EHS-INDUSTRIAL-HYGIENE", "EHS-OCC-HEALTH-SURVEILLANCE", "EHS-CHEMICAL-SDS-MGMT"],
  },
  {
    domain_module_code: "EHS-ENV-COMPLIANCE",
    domain_module_name: "Environmental Compliance",
    description:
      "Environmental side of the EHS program. Masters environmental permits and their conditions, and contributes emission and release records into corporate sustainability disclosure. Tracks aspect and impact obligations for ISO 14001 and statutory environmental reporting. Used by permitted and regulated sites.",
    catalog_tagline: "Stay on top of environmental permits, limits, and emissions reporting before deadlines slip.",
    catalog_description:
      "Track every environmental permit, its conditions and limits, and the monitoring and renewal obligations for air, water, and waste. Record emissions and releases against limits and feed the same data into corporate sustainability disclosure. Keep your environmental aspect and impact register current for ISO 14001, and never miss a regulatory reporting deadline.",
    capabilities: ["EHS-PERMIT-TRACKING", "EHS-ENV-COMPLIANCE"],
  },
  {
    domain_module_code: "EHS-AUDIT-INSPECTION",
    domain_module_name: "Audit and Inspection",
    description:
      "Assurance module. Masters EHS inspections and management-system audits, contractor safety qualification records, and EHS training and competency records. Shares corrective actions with the safety module. Used to demonstrate conformance to ISO 45001 and ISO 14001 and to govern contractors and required training.",
    catalog_tagline: "Plan and run inspections and audits, qualify your contractors, and prove training is current.",
    catalog_description:
      "Schedule and conduct safety inspections, observations, and management-system audits against standards such as ISO 45001 and ISO 14001, and route every finding into a tracked corrective action. Prequalify and monitor contractors against safety criteria tied to site access and permit-to-work. Map required EHS training to roles and regulations, deliver it, and keep the competency and certification records that prove your program is working.",
    capabilities: ["EHS-INSPECTION-AUDIT", "EHS-CONTRACTOR-SAFETY", "EHS-TRAINING-COMPETENCY"],
  },
];

// ============================================================
// VENDORS (reuse existing by vendor_name) + SOLUTIONS
// ============================================================
const vendors: Array<{ vendor_name: string; vendor_url: string; headquarters_country: string; description: string }> = [
  { vendor_name: "Cority", vendor_url: "https://www.cority.com", headquarters_country: "Canada", description: "Pure-play enterprise environmental, health, safety, and quality software vendor with depth in occupational health and industrial hygiene." },
  { vendor_name: "Intelex", vendor_url: "https://www.intelex.com", headquarters_country: "Canada", description: "Configurable environmental, health, safety, and quality management software vendor; operating company of an industrial-technology group." },
  { vendor_name: "Enablon", vendor_url: "https://www.enablon.com", headquarters_country: "France", description: "Environmental, health, safety, operational-risk, and sustainability software vendor with a large process-industry footprint." },
  { vendor_name: "VelocityEHS", vendor_url: "https://www.ehs.com", headquarters_country: "USA", description: "Cloud-native environmental, health, safety, and ESG software vendor with strength in chemical and safety data sheet management and industrial ergonomics." },
  { vendor_name: "Benchmark Digital Partners", vendor_url: "https://benchmarkgensuite.com", headquarters_country: "USA", description: "Connected-worker environmental, health, and safety software vendor with a large process and manufacturing install base." },
  // Sphera (57) and Wolters Kluwer (47, owner of Enablon brand) already exist; reused by name.
];

const solutions: Array<{
  solution_name: string;
  vendor: string;
  solution_type: "saas" | "on_prem" | "hybrid" | "open_source" | "internal_build" | "manual_process";
  solution_url: string;
  description: string;
  primary?: string[];
  secondary?: string[];
}> = [
  { solution_name: "Cority Environmental Health and Safety", vendor: "Cority", solution_type: "saas", solution_url: "https://www.cority.com", description: "Enterprise EHS and occupational-health suite spanning safety, industrial hygiene, occupational health, environmental, and analytics.", primary: ["EHS"], secondary: ["ESG"] },
  { solution_name: "Intelex EHSQ Management", vendor: "Intelex", solution_type: "saas", solution_url: "https://www.intelex.com", description: "Configurable EHS and quality management platform covering incidents, audits, inspections, compliance, and environmental reporting.", primary: ["EHS"] },
  { solution_name: "Sphera EHS and Operational Risk", vendor: "Sphera", solution_type: "saas", solution_url: "https://sphera.com", description: "EHS, operational-risk, and product-stewardship platform with chemical and process-safety depth.", primary: ["EHS"], secondary: ["ESG"] },
  { solution_name: "Enablon EHS and Sustainability", vendor: "Wolters Kluwer", solution_type: "saas", solution_url: "https://www.enablon.com", description: "Enterprise EHS, risk, and sustainability platform with a large process-industry footprint.", primary: ["EHS"], secondary: ["ESG", "GRC"] },
  { solution_name: "VelocityEHS Accelerate Platform", vendor: "VelocityEHS", solution_type: "saas", solution_url: "https://www.ehs.com", description: "Cloud EHS and ESG platform strong in chemical and safety data sheet management, industrial ergonomics, and incident management.", primary: ["EHS"], secondary: ["ESG"] },
  { solution_name: "Benchmark Gensuite EHS", vendor: "Benchmark Digital Partners", solution_type: "saas", solution_url: "https://benchmarkgensuite.com", description: "Connected-worker EHS suite covering incidents, inspections, compliance, and contractor safety for process and manufacturing.", primary: ["EHS"] },
];

async function main() {
  console.log("\n=== EHS Phase A ===");

  // --- DOMAIN ---
  validateDomainRow(domainRow);
  console.log("\n--- domains ---");
  const domainMap = await syncTable("/domains", [domainRow], "domain_code");
  const ehsId = domainMap.get("EHS")!;
  console.log(`  EHS domain id = ${ehsId}`);

  // resolve adjacent domain ids for solution_domains
  const adj = await get("/domains?domain_code=in.(ESG,GRC,IWMS,REAL-EST,FSQM)&select=id,domain_code");
  const domainCodeToId = new Map<string, number>([["EHS", ehsId]]);
  for (const r of adj) domainCodeToId.set(String(r.domain_code), Number(r.id));

  // --- CAPABILITIES ---
  console.log("\n--- capabilities ---");
  const capMap = await syncTable("/capabilities", capabilities, "capability_code");

  // --- capability_domains ---
  console.log("\n--- capability_domains ---");
  const existingCapDom = await get(`/capability_domains?domain_id=eq.${ehsId}&select=capability_id`);
  const haveCapDom = new Set(existingCapDom.map(r => Number(r.capability_id)));
  const capDomRows: Row[] = [];
  for (const c of capabilities) {
    const cid = capMap.get(c.capability_code)!;
    if (!haveCapDom.has(cid)) capDomRows.push({ capability_id: cid, domain_id: ehsId, notes: "" });
  }
  if (capDomRows.length) await insert("/capability_domains", capDomRows);
  console.log(`  inserted ${capDomRows.length} capability_domains (${haveCapDom.size} existed)`);

  // --- MODULES ---
  console.log("\n--- domain_modules ---");
  const moduleRows = modules.map(m => ({
    domain_module_code: m.domain_module_code,
    domain_module_name: m.domain_module_name,
    domain_id: ehsId,
    module_kind: "full",
    description: m.description,
    catalog_tagline: m.catalog_tagline,
    catalog_description: m.catalog_description,
  }));
  const moduleMap = await syncTable("/domain_modules", moduleRows, "domain_module_code");

  // --- domain_module_capabilities ---
  console.log("\n--- domain_module_capabilities ---");
  const existingDMC = await get(
    `/domain_module_capabilities?domain_module_id=in.(${modules.map(m => moduleMap.get(m.domain_module_code)).join(",")})&select=domain_module_id,capability_id`,
  );
  const haveDMC = new Set(existingDMC.map(r => `${r.domain_module_id}:${r.capability_id}`));
  const dmcRows: Row[] = [];
  for (const m of modules) {
    const mid = moduleMap.get(m.domain_module_code)!;
    for (const cc of m.capabilities) {
      const cid = capMap.get(cc)!;
      if (!haveDMC.has(`${mid}:${cid}`)) dmcRows.push({ domain_module_id: mid, capability_id: cid, notes: "" });
    }
  }
  if (dmcRows.length) await insert("/domain_module_capabilities", dmcRows);
  console.log(`  inserted ${dmcRows.length} domain_module_capabilities (${haveDMC.size} existed)`);

  // --- VENDORS (reuse by name; record_status omitted -> DB default 'new') ---
  console.log("\n--- vendors ---");
  const vendorRows = vendors.map(v => ({ ...v, notes: "" }));
  const vendorMap = await syncTable("/vendors", vendorRows, "vendor_name");
  // merge existing reused vendors
  const reused = await get("/vendors?vendor_name=in.(Sphera,Wolters%20Kluwer)&select=id,vendor_name");
  for (const r of reused) vendorMap.set(String(r.vendor_name), Number(r.id));

  // --- SOLUTIONS ---
  console.log("\n--- solutions ---");
  const solutionRows = solutions.map(s => {
    const vid = vendorMap.get(s.vendor);
    if (!vid) throw new Error(`Vendor not found for solution ${s.solution_name}: ${s.vendor}`);
    return {
      solution_name: s.solution_name,
      description: s.description,
      solution_url: s.solution_url,
      vendor_id: vid,
      solution_type: s.solution_type,
      is_active_in_market: true,
      notes: "",
    };
  });
  const solutionMap = await syncTable("/solutions", solutionRows, "solution_name");

  // --- solution_domains ---
  console.log("\n--- solution_domains ---");
  const existingSD = await get("/solution_domains?select=solution_id,domain_id,coverage_level&limit=20000");
  const haveSD = new Set(existingSD.map(r => `${r.solution_id}:${r.domain_id}:${r.coverage_level}`));
  const sdRows: Row[] = [];
  for (const s of solutions) {
    const sid = solutionMap.get(s.solution_name)!;
    const link = (code: string, cov: "primary" | "secondary" | "partial") => {
      const did = domainCodeToId.get(code);
      if (!did) { console.warn(`  ! domain ${code} not resolved for ${s.solution_name}`); return; }
      const key = `${sid}:${did}:${cov}`;
      if (haveSD.has(key)) return;
      haveSD.add(key);
      sdRows.push({ solution_id: sid, domain_id: did, coverage_level: cov, notes: "" });
    };
    for (const c of s.primary ?? []) link(c, "primary");
    for (const c of s.secondary ?? []) link(c, "secondary");
  }
  if (sdRows.length) await insert("/solution_domains", sdRows);
  console.log(`  inserted ${sdRows.length} solution_domains`);

  // --- counts ---
  const counts = {
    domain: (await get(`/domains?id=eq.${ehsId}&select=id`)).length,
    capabilities: (await get(`/capability_domains?domain_id=eq.${ehsId}&select=capability_id`)).length,
    modules: (await get(`/domain_modules?domain_id=eq.${ehsId}&select=id`)).length,
    domain_module_capabilities: (await get(`/domain_module_capabilities?domain_module_id=in.(${modules.map(m => moduleMap.get(m.domain_module_code)).join(",")})&select=domain_module_id`)).length,
    solution_domains: (await get(`/solution_domains?domain_id=eq.${ehsId}&select=solution_id`)).length,
  };
  console.log("\n=== Phase A counts (EHS) ===");
  console.log(counts);
  console.log("EHS_DOMAIN_ID=" + ehsId);
  console.log("MODULE_IDS=" + JSON.stringify(Object.fromEntries(modules.map(m => [m.domain_module_code, moduleMap.get(m.domain_module_code)]))));
}

await main();
console.log("Phase A done.");
