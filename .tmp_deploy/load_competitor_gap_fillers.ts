#!/usr/bin/env bun
// Adds genuinely-missing flagship competitor vendors and their solutions to
// fill gaps identified in the Workday review. Targets only vendors that are
// market leaders in a Workday-covered domain and currently absent.
// Idempotent. All record_status defaults to "new".

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
async function get(path: string): Promise<Row[]> { return call({ method: "GET", path }); }
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 40; const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    out.push(...(await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) })));
  }
  return out;
}

// ---------- VENDORS ----------
type VendorSpec = {
  vendor_name: string;
  description: string;
  vendor_url: string;
  headquarters_country: string;
  notes: string;
};
const vendors: VendorSpec[] = [
  { vendor_name: "Beqom", description: "Total-compensation management platform for incentive comp, sales performance, equity, and pay-equity.", vendor_url: "https://www.beqom.com", headquarters_country: "Switzerland", notes: "" },
  { vendor_name: "Aon", description: "Global professional services firm; Radford and McLagan compensation surveys and eReward platform drive compensation benchmarking.", vendor_url: "https://www.aon.com", headquarters_country: "UK", notes: "" },
  { vendor_name: "Legion Technologies", description: "AI-native workforce management platform focused on labour optimisation, scheduling, and frontline employee experience for retail / hospitality / healthcare.", vendor_url: "https://legion.co", headquarters_country: "USA", notes: "" },
  { vendor_name: "Verint Systems", description: "Customer engagement and workforce engagement management vendor; WFM optimisation for contact-centre and back-office labour.", vendor_url: "https://www.verint.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Empyrean Benefit Solutions", description: "Benefits administration platform with carrier integrations, decision-support, and ACA compliance services.", vendor_url: "https://www.goempyrean.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Sequoia Consulting Group", description: "Total-people-platform combining benefits, payroll, comp, and people analytics targeted at growth-stage and mid-market employers.", vendor_url: "https://www.sequoia.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Kelly Services", description: "Workforce solutions company; KellyOCG Helix UX delivers VMS / MSP for contingent workforce management.", vendor_url: "https://www.kellyservices.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Prophix Software", description: "EPM and FP&A platform for mid-market finance teams: budgeting, forecasting, consolidation, financial reporting.", vendor_url: "https://www.prophix.com", headquarters_country: "Canada", notes: "" },
  { vendor_name: "OneStream Software", description: "Corporate performance management platform unifying close, consolidation, planning, and reporting on a single data model.", vendor_url: "https://www.onestream.com", headquarters_country: "USA", notes: "Public via 2024 IPO (NASDAQ:OS)." },
  { vendor_name: "Sage Group", description: "Global accounting, ERP, and people-management vendor; Sage Intacct is the cloud financial-management flagship; Sage People (Sage HR) covers HCM.", vendor_url: "https://www.sage.com", headquarters_country: "UK", notes: "" },
  { vendor_name: "Deel", description: "Global payroll, EOR (employer-of-record), and contractor management platform covering 150+ countries.", vendor_url: "https://www.deel.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Remote", description: "Global payroll, EOR, and contractor management platform; competes directly with Deel.", vendor_url: "https://remote.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Appian", description: "Low-code platform for process automation and case-management applications.", vendor_url: "https://www.appian.com", headquarters_country: "USA", notes: "Public (NASDAQ:APPN)." },
  { vendor_name: "Quickbase", description: "Low-code platform for operational applications, owned by Vista Equity Partners.", vendor_url: "https://www.quickbase.com", headquarters_country: "USA", notes: "Spun out of Intuit in 2016." },
  { vendor_name: "Retool", description: "Internal-tooling and admin-application low-code platform for developers building back-office apps.", vendor_url: "https://retool.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "ContractPodAi", description: "AI-native CLM platform with contract intelligence, lifecycle automation, and legal-front-door agent overlay.", vendor_url: "https://contractpodai.com", headquarters_country: "UK", notes: "" },
  { vendor_name: "Sirion", description: "AI-driven CLM platform for complex post-execution contract management, obligation tracking, and supplier-side compliance.", vendor_url: "https://www.sirion.ai", headquarters_country: "USA", notes: "Previously Sirion Labs." },
  { vendor_name: "LinkSquares", description: "AI CLM platform focused on in-house legal teams: contract review, extraction, repository, and reporting.", vendor_url: "https://linksquares.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Rocketlane", description: "Customer onboarding and professional-services delivery platform combining PSA and customer-portal capabilities.", vendor_url: "https://www.rocketlane.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Litmos", description: "Cloud LMS for corporate, channel, and customer learning. Divested from SAP to Francisco Partners in 2024.", vendor_url: "https://www.litmos.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Degreed", description: "Skills-development and learning-experience platform combining content aggregation, skill tracking, and pathway personalisation.", vendor_url: "https://degreed.com", headquarters_country: "USA", notes: "Acquired Visier-adjacent Engagedly portions; remains independent under Owl Ventures." },
  { vendor_name: "Leapsome", description: "People-enablement platform spanning performance reviews, OKRs, engagement surveys, learning, and instant feedback.", vendor_url: "https://www.leapsome.com", headquarters_country: "Germany", notes: "" },
  { vendor_name: "JAGGAER", description: "Source-to-pay platform for direct + indirect procurement; particularly strong in manufacturing and higher education.", vendor_url: "https://www.jaggaer.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Tradeshift", description: "Procure-to-pay and supplier-collaboration network, with embedded fintech for working capital.", vendor_url: "https://tradeshift.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Esker", description: "AI-driven document automation for order-to-cash and AP automation; strong in supplier-invoice OCR and exception workflow.", vendor_url: "https://www.esker.com", headquarters_country: "France", notes: "Acquired by Bridgepoint in 2024." },
  { vendor_name: "Basware", description: "AP automation and P2P platform with e-invoicing network; strong in EU compliance / Peppol.", vendor_url: "https://www.basware.com", headquarters_country: "Finland", notes: "Taken private by Accel-KKR in 2022." },
];

// ---------- SOLUTIONS ----------
type SolutionSpec = {
  vendor_name: string;
  solution_name: string;
  description: string;
  solution_url: string;
  solution_type: string;
  domains: { code: string; coverage: "primary" | "secondary" | "partial" }[];
};
const solutions: SolutionSpec[] = [
  { vendor_name: "Beqom", solution_name: "Beqom Compensation", description: "Total-compensation management for base pay, incentives, sales commissions, equity, and pay-equity analysis.", solution_url: "", solution_type: "saas", domains: [{ code: "COMP-MGMT", coverage: "primary" }] },
  { vendor_name: "Aon", solution_name: "Aon Radford eReward", description: "Compensation-survey-driven benchmarking, band-management, and pay-equity analytics platform; Radford / McLagan survey data are integrated.", solution_url: "", solution_type: "saas", domains: [{ code: "COMP-MGMT", coverage: "secondary" }] },
  { vendor_name: "Legion Technologies", solution_name: "Legion WFM", description: "AI-native workforce management with demand forecasting, automated scheduling, time and attendance, and frontline employee experience.", solution_url: "", solution_type: "saas", domains: [{ code: "WFM", coverage: "primary" }] },
  { vendor_name: "Verint Systems", solution_name: "Verint Workforce Management", description: "Forecasting, scheduling, and adherence management for contact-centre and back-office labour.", solution_url: "", solution_type: "saas", domains: [{ code: "WFM", coverage: "primary" }] },
  { vendor_name: "Empyrean Benefit Solutions", solution_name: "Empyrean Benefits Administration", description: "Benefits administration platform with carrier integrations, decision support, and ACA compliance services.", solution_url: "", solution_type: "saas", domains: [{ code: "BEN-ADMIN", coverage: "primary" }] },
  { vendor_name: "Sequoia Consulting Group", solution_name: "Sequoia One", description: "Total people platform combining PEO services, benefits, payroll, comp planning, and analytics.", solution_url: "", solution_type: "saas", domains: [{ code: "BEN-ADMIN", coverage: "primary" }, { code: "PAYROLL", coverage: "secondary" }, { code: "COMP-MGMT", coverage: "secondary" }] },
  { vendor_name: "Kelly Services", solution_name: "KellyOCG Helix UX", description: "VMS and MSP services for contingent workforce program management.", solution_url: "", solution_type: "saas", domains: [{ code: "VMS", coverage: "primary" }] },
  { vendor_name: "Prophix Software", solution_name: "Prophix One", description: "Mid-market CPM platform unifying budgeting, forecasting, consolidation, and financial reporting.", solution_url: "", solution_type: "saas", domains: [{ code: "EPM", coverage: "primary" }] },
  { vendor_name: "OneStream Software", solution_name: "OneStream Platform", description: "Unified corporate performance management for close, consolidation, planning, and reporting on a single data model.", solution_url: "", solution_type: "saas", domains: [{ code: "EPM", coverage: "primary" }, { code: "ERP-FIN", coverage: "secondary" }] },
  { vendor_name: "Sage Group", solution_name: "Sage Intacct", description: "Cloud financial management for mid-market, multi-entity finance teams.", solution_url: "", solution_type: "saas", domains: [{ code: "ERP-FIN", coverage: "primary" }] },
  { vendor_name: "Deel", solution_name: "Deel", description: "Global payroll, EOR (employer-of-record), and contractor management platform covering 150+ countries.", solution_url: "", solution_type: "saas", domains: [{ code: "PAYROLL", coverage: "primary" }, { code: "HCM", coverage: "secondary" }, { code: "VMS", coverage: "secondary" }] },
  { vendor_name: "Remote", solution_name: "Remote", description: "Global payroll, EOR, and contractor management platform.", solution_url: "", solution_type: "saas", domains: [{ code: "PAYROLL", coverage: "primary" }, { code: "HCM", coverage: "secondary" }] },
  { vendor_name: "Appian", solution_name: "Appian Platform", description: "Low-code platform for process automation, case management, and AI-driven workflow apps.", solution_url: "", solution_type: "saas", domains: [{ code: "LCAP", coverage: "primary" }] },
  { vendor_name: "Quickbase", solution_name: "Quickbase", description: "Low-code platform for operational applications across project, asset, and resource management use cases.", solution_url: "", solution_type: "saas", domains: [{ code: "LCAP", coverage: "primary" }] },
  { vendor_name: "Retool", solution_name: "Retool", description: "Low-code internal-tooling platform for developers building back-office and admin apps.", solution_url: "", solution_type: "saas", domains: [{ code: "LCAP", coverage: "primary" }] },
  { vendor_name: "ContractPodAi", solution_name: "ContractPodAi Leah", description: "AI-native CLM platform with contract intelligence and legal-front-door agent overlay.", solution_url: "", solution_type: "saas", domains: [{ code: "CLM", coverage: "primary" }] },
  { vendor_name: "Sirion", solution_name: "Sirion CLM", description: "AI-driven CLM platform focused on post-execution obligation tracking and supplier-contract management.", solution_url: "", solution_type: "saas", domains: [{ code: "CLM", coverage: "primary" }] },
  { vendor_name: "LinkSquares", solution_name: "LinkSquares Finalize and Analyze", description: "AI CLM platform for in-house legal teams: contract review, repository, extraction, and reporting.", solution_url: "", solution_type: "saas", domains: [{ code: "CLM", coverage: "primary" }] },
  { vendor_name: "Rocketlane", solution_name: "Rocketlane", description: "Customer onboarding and professional services delivery platform combining PSA and customer-portal capabilities.", solution_url: "", solution_type: "saas", domains: [{ code: "PSA", coverage: "primary" }] },
  { vendor_name: "Litmos", solution_name: "Litmos LMS", description: "Cloud LMS for corporate, channel, and customer learning. Divested from SAP to Francisco Partners in 2024.", solution_url: "", solution_type: "saas", domains: [{ code: "LMS", coverage: "primary" }] },
  { vendor_name: "Degreed", solution_name: "Degreed", description: "Skills-development and learning-experience platform combining content aggregation, skill tracking, and pathway personalisation.", solution_url: "", solution_type: "saas", domains: [{ code: "LMS", coverage: "primary" }] },
  { vendor_name: "Leapsome", solution_name: "Leapsome", description: "People-enablement platform spanning performance reviews, OKRs, engagement surveys, learning, and instant feedback.", solution_url: "", solution_type: "saas", domains: [{ code: "TALENT-MGMT", coverage: "primary" }, { code: "EMP-EXP", coverage: "secondary" }, { code: "LMS", coverage: "secondary" }] },
  { vendor_name: "JAGGAER", solution_name: "JAGGAER ONE", description: "Source-to-pay platform for direct and indirect procurement; strong in manufacturing and higher education.", solution_url: "", solution_type: "saas", domains: [{ code: "S2P", coverage: "primary" }, { code: "SUP-LIFE", coverage: "secondary" }] },
  { vendor_name: "Tradeshift", solution_name: "Tradeshift", description: "Procure-to-pay and supplier-collaboration network with embedded fintech.", solution_url: "", solution_type: "saas", domains: [{ code: "S2P", coverage: "primary" }, { code: "AP-AUTO", coverage: "secondary" }] },
  { vendor_name: "Esker", solution_name: "Esker AP", description: "AI-driven AP automation: invoice capture, three-way match, exception workflow, and e-invoicing.", solution_url: "", solution_type: "saas", domains: [{ code: "AP-AUTO", coverage: "primary" }] },
  { vendor_name: "Basware", solution_name: "Basware AP Automation", description: "AP automation and P2P platform with e-invoicing network; strong in EU compliance and Peppol coverage.", solution_url: "", solution_type: "saas", domains: [{ code: "AP-AUTO", coverage: "primary" }, { code: "S2P", coverage: "secondary" }] },
  // Add ServiceNow App Engine and Salesforce Platform under existing vendors
  { vendor_name: "ServiceNow Inc", solution_name: "ServiceNow App Engine", description: "Low-code application platform built on the Now Platform, allowing custom apps with native workflow, integration, and AI capabilities.", solution_url: "", solution_type: "saas", domains: [{ code: "LCAP", coverage: "primary" }] },
  { vendor_name: "Salesforce Inc", solution_name: "Salesforce Platform", description: "Low-code application platform on the Salesforce data model, including Lightning, Flow, Apex, and Agentforce.", solution_url: "", solution_type: "saas", domains: [{ code: "LCAP", coverage: "primary" }] },
];

async function main() {
  // 1. Vendors
  console.log("=== vendors ===");
  const existingV = await get("/vendors?select=id,vendor_name&limit=2000");
  const vIdByName = new Map<string, number>();
  for (const r of existingV) vIdByName.set(String(r.vendor_name), Number(r.id));
  const missingV = vendors.filter(v => !vIdByName.has(v.vendor_name));
  if (missingV.length > 0) {
    console.log(`  inserting ${missingV.length} new vendors`);
    await insert("/vendors", missingV);
  } else console.log("  none missing");
  const refreshedV = await get("/vendors?select=id,vendor_name&limit=2000");
  for (const r of refreshedV) vIdByName.set(String(r.vendor_name), Number(r.id));

  // 2. Solutions
  console.log("\n=== solutions ===");
  const existingS = await get("/solutions?select=id,solution_name&limit=2000");
  const sIdByName = new Map<string, number>();
  for (const r of existingS) sIdByName.set(String(r.solution_name), Number(r.id));
  const newSolutionPayload: Row[] = [];
  for (const s of solutions) {
    if (sIdByName.has(s.solution_name)) continue;
    const vid = vIdByName.get(s.vendor_name);
    if (!vid) { console.log(`  WARN: vendor not found ${s.vendor_name}`); continue; }
    newSolutionPayload.push({
      solution_name: s.solution_name,
      description: s.description,
      solution_url: s.solution_url,
      solution_type: s.solution_type,
      vendor_id: vid,
      is_active_in_market: true,
      notes: "",
    });
  }
  if (newSolutionPayload.length > 0) {
    console.log(`  inserting ${newSolutionPayload.length} new solutions`);
    await insert("/solutions", newSolutionPayload);
  } else console.log("  none new");
  const refreshedS = await get("/solutions?select=id,solution_name&limit=2000");
  for (const r of refreshedS) sIdByName.set(String(r.solution_name), Number(r.id));

  // 3. solution_domains
  console.log("\n=== solution_domains ===");
  const allDomains = await get("/domains?select=id,domain_code");
  const dIdByCode = new Map<string, number>();
  for (const r of allDomains) dIdByCode.set(String(r.domain_code), Number(r.id));
  const existingSD = await get("/solution_domains?select=solution_id,domain_id&limit=2000");
  const sdKey = (s: number, d: number) => `${s}:${d}`;
  const existingSDSet = new Set(existingSD.map(r => sdKey(Number(r.solution_id), Number(r.domain_id))));
  const newSDRows: Row[] = [];
  for (const s of solutions) {
    const sid = sIdByName.get(s.solution_name);
    if (!sid) { console.log(`  WARN: solution not found ${s.solution_name}`); continue; }
    for (const cov of s.domains) {
      const did = dIdByCode.get(cov.code);
      if (!did) { console.log(`  WARN: domain not found ${cov.code}`); continue; }
      if (existingSDSet.has(sdKey(sid, did))) continue;
      newSDRows.push({ solution_id: sid, domain_id: did, coverage_level: cov.coverage, notes: "" });
    }
  }
  if (newSDRows.length > 0) {
    console.log(`  inserting ${newSDRows.length} new solution_domains rows`);
    await insert("/solution_domains", newSDRows);
  } else console.log("  none new");

  console.log("\n=== Final counts ===");
  const vCount = await get("/vendors?select=count");
  const sCount = await get("/solutions?select=count");
  const sdCount = await get("/solution_domains?select=count");
  console.log(JSON.stringify({ vendors: vCount, solutions: sCount, solution_domains: sdCount }, null, 2));
}

await main();
