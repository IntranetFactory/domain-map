#!/usr/bin/env bun
// Consolidated Phase-A+B backfill loader.
//
// Phase-A (new domains DLP, DSPM, REAL-EST, CAFM):
//   - 4 new domains + 1 IWMS parent_domain_id PATCH
//   - new vendors / solutions / solution_domains / capabilities / capability_domains / solution_capabilities matrix
//
// Phase-B (all 11 candidate domains: APM, SPM, GRC, AUDIT, DCG, DQ, MDM, ESG, DLP, DSPM, REAL-EST):
//   - new data_objects (master rows)
//   - domain_data_objects (master for new + contributor/consumer rows on existing)
//   - trigger_events
//   - cross_domain_handoffs
//
// All inserts use record_status='new'. Idempotent on natural keys.
//
//   bun run load_phase_b_full.ts            -> DRY RUN
//   bun run load_phase_b_full.ts --apply    -> Live writes

import { $ } from "bun";

$.throws(false);

const APPLY = process.argv.includes("--apply");

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
  const code = await proc.exited;
  if (code !== 0) throw new Error(`semantius call failed (exit ${code}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (path: string) => call({ method: "GET", path });
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  if (!APPLY) { console.log(`  [DRY] POST ${rows.length} → ${path}`); return []; }
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const r = await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) });
    out.push(...r);
  }
  return out;
}
async function patch(path: string, body: Row): Promise<Row[]> {
  if (!APPLY) { console.log(`  [DRY] PATCH ${path} ${JSON.stringify(body)}`); return []; }
  return call({ method: "PATCH", path, body });
}

console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN"}\n`);

// ============================================================================
// RESOLVERS
// ============================================================================
let domainId = new Map<string, number>();
let vendorId = new Map<string, number>();
let solutionId = new Map<string, number>();
let capabilityId = new Map<string, number>();
let doId = new Map<string, number>();
let teId = new Map<string, number>();

async function refreshDomains() {
  const r = await get(`/domains?select=id,domain_code&limit=10000`);
  domainId = new Map(r.map(x => [String(x.domain_code), Number(x.id)]));
}
async function refreshVendors() {
  const r = await get(`/vendors?select=id,vendor_name&limit=10000`);
  vendorId = new Map(r.map(x => [String(x.vendor_name), Number(x.id)]));
}
async function refreshSolutions() {
  const r = await get(`/solutions?select=id,solution_name&limit=10000`);
  solutionId = new Map(r.map(x => [String(x.solution_name), Number(x.id)]));
}
async function refreshCapabilities() {
  const r = await get(`/capabilities?select=id,capability_code&limit=10000`);
  capabilityId = new Map(r.map(x => [String(x.capability_code), Number(x.id)]));
}
async function refreshDOs() {
  const r = await get(`/data_objects?select=id,data_object_name&limit=10000`);
  doId = new Map(r.map(x => [String(x.data_object_name), Number(x.id)]));
}
async function refreshTEs() {
  const r = await get(`/trigger_events?select=id,event_name&limit=10000`);
  teId = new Map(r.map(x => [String(x.event_name), Number(x.id)]));
}
await Promise.all([refreshDomains(), refreshVendors(), refreshSolutions(), refreshCapabilities(), refreshDOs(), refreshTEs()]);
console.log(`Resolved: ${domainId.size} domains, ${vendorId.size} vendors, ${solutionId.size} solutions, ${capabilityId.size} capabilities, ${doId.size} data_objects, ${teId.size} trigger_events.\n`);

const existingDdoRows = await get(`/domain_data_objects?select=domain_id,data_object_id,role&limit=20000`);
const ddoKey = (d: number, o: number, r: string) => `${d}:${o}:${r}`;
const existingDdos = new Set(existingDdoRows.map(r => ddoKey(Number(r.domain_id), Number(r.data_object_id), String(r.role))));

const existingHandoffRows = await get(`/cross_domain_handoffs?select=source_domain_id,target_domain_id,trigger_event_id,data_object_id&limit=20000`);
const hoKey = (s: number, t: number, e: number, d: number) => `${s}:${t}:${e}:${d}`;
const existingHandoffs = new Set(existingHandoffRows.map(r => hoKey(Number(r.source_domain_id), Number(r.target_domain_id), Number(r.trigger_event_id), Number(r.data_object_id))));

const existingSolDomRows = await get(`/solution_domains?select=solution_id,domain_id&limit=20000`);
const solDomKey = (s: number, d: number) => `${s}:${d}`;
const existingSolDoms = new Set(existingSolDomRows.map(r => solDomKey(Number(r.solution_id), Number(r.domain_id))));

const existingCapDomRows = await get(`/capability_domains?select=capability_id,domain_id&limit=20000`);
const capDomKey = (c: number, d: number) => `${c}:${d}`;
const existingCapDoms = new Set(existingCapDomRows.map(r => capDomKey(Number(r.capability_id), Number(r.domain_id))));

const existingSolCapRows = await get(`/solution_capabilities?select=solution_id,capability_id&limit=20000`);
const solCapKey = (s: number, c: number) => `${s}:${c}`;
const existingSolCaps = new Set(existingSolCapRows.map(r => solCapKey(Number(r.solution_id), Number(r.capability_id))));

console.log(`Pre-existing junctions: ${existingDdos.size} ddo, ${existingHandoffs.size} handoffs, ${existingSolDoms.size} sol_dom, ${existingCapDoms.size} cap_dom, ${existingSolCaps.size} sol_cap.\n`);

// ============================================================================
// PHASE A — domain rows
// ============================================================================

type DomainDraft = {
  domain_code: string;
  domain_name: string;
  description: string;
  crud_percentage: number;
  business_logic: string;
  min_org_size: string;
  cost_band: string;
  certification_required: boolean;
  usa_market_size_usd_m: number;
  market_size_source_year: number;
  parent_domain_code?: string;
};

const newDomains: DomainDraft[] = [
  {
    domain_code: "DLP", domain_name: "Data Loss Prevention",
    description: "Detects and blocks unauthorized disclosure of sensitive data (PII, PCI, IP, source code) from leaving the organization perimeter via email, USB, cloud uploads, chat, web, and removable media. Classifies content at rest and in motion; applies policies (block, quarantine, mask, watermark, alert). Complementary to DSPM (which discovers data at rest); DLP enforces at the egress point.",
    crud_percentage: 65,
    business_logic: "Content-scanning engine orchestration (regex / dictionary / statistical / ML pattern detection in files, streams, USB device traffic); policy evaluation on mixed criteria (user role, destination, device, network context); incident creation and remediation workflows; SIEM/SOAR integration for alerting.",
    min_org_size: "20 s <500", cost_band: "$$", certification_required: false,
    usa_market_size_usd_m: 2700, market_size_source_year: 2024,
  },
  {
    domain_code: "DSPM", domain_name: "Data Security Posture Management",
    description: "Discovers sensitive data across cloud data stores (S3, Snowflake, BigQuery, RDS, Databricks, SaaS apps), maps data lineage and access paths, identifies over-privilege and toxic combinations (PII + over-permissive policy), scores risk posture, prioritizes remediation. Discovers and secures at rest; DLP enforces at egress.",
    crud_percentage: 60,
    business_logic: "Data classification ML (sensitivity scoring, PII/PHI detection); multi-cloud connector orchestration and SaaS API pagination at scale; risk-scoring rules combining sensitivity + access breadth + public-internet exposure; templated and custom remediation workflows requiring authorization checks.",
    min_org_size: "30 m <2500", cost_band: "$$", certification_required: false,
    usa_market_size_usd_m: 750, market_size_source_year: 2024,
  },
  {
    domain_code: "REAL-EST", domain_name: "Real Estate and Workplace Management",
    description: "Umbrella for corporate real-estate, workplace optimization, facilities management, and building operations. Two market tiers: IWMS (enterprise) and CAFM (mid-market) — modeled as sub-domains via parent_domain_id. Covers properties, leases, spaces, occupancy, maintenance, capital projects, and utility consumption (Scope 1+2 emissions source for ESG).",
    crud_percentage: 80,
    business_logic: "Space-allocation algorithms (occupancy optimization); utility-consumption analytics; lease-cost modeling and amortization (ASC 842 / IFRS 16); capital-project lifecycle workflows.",
    min_org_size: "30 m <2500", cost_band: "$$$", certification_required: false,
    usa_market_size_usd_m: 3200, market_size_source_year: 2025,
  },
  {
    domain_code: "CAFM", domain_name: "Computer-Aided Facility Management",
    description: "Light-tier facilities management; mid-market and SMB focus. Desk booking, simple space allocation, maintenance ticketing, visitor management. Typically lighter on utility tracking and lease accounting than IWMS.",
    crud_percentage: 90,
    business_logic: "Reservation engines and basic workflow.",
    min_org_size: "20 s <500", cost_band: "$$", certification_required: false,
    usa_market_size_usd_m: 400, market_size_source_year: 2025,
    parent_domain_code: "REAL-EST",
  },
];

// ============================================================================
// PHASE A — vendors (only new ones; rest are looked up)
// ============================================================================
type VendorDraft = { vendor_name: string; description: string; vendor_url: string; headquarters_country: string; notes: string };
const newVendors: VendorDraft[] = [
  // DLP
  { vendor_name: "Forcepoint", description: "UEBA + DLP + email security stack (formerly Websense).", vendor_url: "https://www.forcepoint.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Trellix", description: "Standalone security vendor (formerly McAfee Enterprise / FireEye merger, separated 2022).", vendor_url: "https://www.trellix.com", headquarters_country: "USA", notes: "Trellix DLP = former McAfee DLP" },
  { vendor_name: "Proofpoint", description: "Enterprise email and data security; acquired Mimecast 2024.", vendor_url: "https://www.proofpoint.com", headquarters_country: "USA", notes: "Mimecast subsidiary post-2024" },
  { vendor_name: "Netskope", description: "Cloud-native CASB + SSE vendor; DLP as sub-capability within SSE stack.", vendor_url: "https://www.netskope.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Zscaler", description: "SASE vendor; DLP within ZIA/ZPA.", vendor_url: "https://www.zscaler.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Code42", description: "Insider-risk and data-protection vendor; Incydr product line.", vendor_url: "https://www.code42.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Nightfall AI", description: "AI-native DLP for SaaS and GenAI use cases.", vendor_url: "https://www.nightfall.ai", headquarters_country: "USA", notes: "" },
  { vendor_name: "Cyberhaven", description: "Data lineage and forensic-recovery vendor.", vendor_url: "https://www.cyberhaven.com", headquarters_country: "USA", notes: "" },
  // DSPM
  { vendor_name: "Varonis", description: "Data security platform; legacy on-premises strength, cloud module emerging.", vendor_url: "https://www.varonis.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Cyera", description: "Cloud-native DSPM; data discovery and risk mapping.", vendor_url: "https://www.cyera.io", headquarters_country: "Israel", notes: "Founded 2021" },
  { vendor_name: "BigID", description: "Data intelligence platform; DSPM + governance + privacy.", vendor_url: "https://www.bigid.com", headquarters_country: "USA", notes: "Alteryx subsidiary since 2023, operated independently" },
  { vendor_name: "Normalyze", description: "AWS-focused DSPM; data discovery and access audit.", vendor_url: "https://www.normalyze.ai", headquarters_country: "USA", notes: "" },
  { vendor_name: "Sentra", description: "Real-time cloud data security; multi-cloud DSPM.", vendor_url: "https://www.sentra.io", headquarters_country: "USA", notes: "" },
  { vendor_name: "Rubrik", description: "Cloud data resilience + ransomware protection; absorbed Laminar (2023) for DSPM angle.", vendor_url: "https://www.rubrik.com", headquarters_country: "USA", notes: "Laminar acquisition 2023" },
  { vendor_name: "Concentric AI", description: "Shadow-SaaS + data-risk discovery.", vendor_url: "https://www.concentricai.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Symmetry Systems", description: "SaaS-native data inventory + access governance.", vendor_url: "https://www.symmetry-systems.com", headquarters_country: "Israel", notes: "" },
  // REAL-EST
  { vendor_name: "Planon", description: "Integrated workplace management; space optimization focus.", vendor_url: "https://www.planon.com", headquarters_country: "Netherlands", notes: "" },
  { vendor_name: "Archibus", description: "CAFM ↔ IWMS bridge solution; modular suite.", vendor_url: "https://www.archibus.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "MRI Software", description: "Commercial real-estate software; lease accounting, property mgmt.", vendor_url: "https://www.mrisoftware.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Yardi", description: "Property and lease management; commercial real-estate financial mgmt.", vendor_url: "https://www.yardi.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Nuvolo", description: "Mobile-first CMMS / CAFM; low-code workflow.", vendor_url: "https://www.nuvolo.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Tango", description: "SMB desk booking + workplace analytics.", vendor_url: "https://tangohr.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Officespace", description: "Cloud workplace management; SMB CAFM.", vendor_url: "https://www.officespace.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Accruent", description: "Integrated real-asset management; CAFM → IWMS spectrum.", vendor_url: "https://www.accruent.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Honeywell", description: "Building operations / energy management overlay.", vendor_url: "https://www.honeywell.com", headquarters_country: "USA", notes: "Honeywell Forge brand for building ops" },
  { vendor_name: "Spacewell", description: "Modular IWMS with strong EU energy focus.", vendor_url: "https://www.spacewell.eu", headquarters_country: "Belgium", notes: "" },
];

// ============================================================================
// PHASE A — solutions
// ============================================================================
type SolutionDraft = { solution_name: string; vendor_name: string; description: string; solution_url: string; solution_type: string; is_active_in_market: boolean; notes: string };

const newSolutions: SolutionDraft[] = [
  // DLP (10)
  { solution_name: "Microsoft Purview DLP", vendor_name: "Microsoft", description: "M365-native DLP; classifies and protects across Exchange, SharePoint, Teams, OneDrive via sensitivity labels.", solution_url: "https://learn.microsoft.com/en-us/purview/dlp-learn-about-dlp", solution_type: "saas", is_active_in_market: true, notes: "" },
  { solution_name: "Broadcom Data Protection DLP", vendor_name: "Broadcom", description: "Full-stack DLP (email/endpoint/network/web); formerly Symantec DLP.", solution_url: "https://www.broadcom.com/products/information-security/data-loss-prevention", solution_type: "hybrid", is_active_in_market: true, notes: "Symantec heritage" },
  { solution_name: "Forcepoint DLP", vendor_name: "Forcepoint", description: "On-prem agent + network-inline DLP with UEBA-driven remediation.", solution_url: "https://www.forcepoint.com/product/dlp", solution_type: "hybrid", is_active_in_market: true, notes: "" },
  { solution_name: "Trellix Data Loss Prevention", vendor_name: "Trellix", description: "Endpoint + email DLP (former McAfee DLP).", solution_url: "https://www.trellix.com/en-us/products/data-loss-prevention.html", solution_type: "hybrid", is_active_in_market: true, notes: "" },
  { solution_name: "Proofpoint Information Protection", vendor_name: "Proofpoint", description: "Email-centric DLP + targeted attack defense; Mimecast integration post-2024.", solution_url: "https://www.proofpoint.com/us/products/information-protection", solution_type: "saas", is_active_in_market: true, notes: "" },
  { solution_name: "Netskope Next Gen SWG DLP", vendor_name: "Netskope", description: "DLP within cloud-native SWG/SASE stack; web and API egress inspection.", solution_url: "https://www.netskope.com/products/secure-web-gateway", solution_type: "saas", is_active_in_market: true, notes: "" },
  { solution_name: "Zscaler Internet Access DLP", vendor_name: "Zscaler", description: "Network-inline DLP within ZIA/SASE.", solution_url: "https://www.zscaler.com/products/zscaler-internet-access", solution_type: "saas", is_active_in_market: true, notes: "" },
  { solution_name: "Code42 Incydr", vendor_name: "Code42", description: "Behavioral insider-risk + data-exfil detection.", solution_url: "https://www.code42.com/products/incydr", solution_type: "saas", is_active_in_market: true, notes: "" },
  { solution_name: "Nightfall AI DLP", vendor_name: "Nightfall AI", description: "API-first AI-native DLP for SaaS apps.", solution_url: "https://www.nightfall.ai/solutions/data-loss-prevention", solution_type: "saas", is_active_in_market: true, notes: "" },
  { solution_name: "Cyberhaven", vendor_name: "Cyberhaven", description: "File-lineage and forensic data-loss remediation.", solution_url: "https://www.cyberhaven.com", solution_type: "saas", is_active_in_market: true, notes: "" },
  // DSPM (12)
  { solution_name: "Wiz DSPM", vendor_name: "Wiz", description: "Cloud data security posture scanner; multi-cloud discovery + classification + risk scoring.", solution_url: "https://www.wiz.io/product/data-security", solution_type: "saas", is_active_in_market: true, notes: "" },
  { solution_name: "Varonis Data Security Platform", vendor_name: "Varonis", description: "Data security platform; on-prem + cloud module covering DSPM + access governance.", solution_url: "https://www.varonis.com", solution_type: "hybrid", is_active_in_market: true, notes: "" },
  { solution_name: "Cyera Platform", vendor_name: "Cyera", description: "Pure-play DSPM; data discovery + risk mapping + remediation across cloud platforms.", solution_url: "https://www.cyera.io/product", solution_type: "saas", is_active_in_market: true, notes: "" },
  { solution_name: "BigID Platform", vendor_name: "BigID", description: "Enterprise data intelligence; DSPM as one lens of broader governance.", solution_url: "https://www.bigid.com/product", solution_type: "saas", is_active_in_market: true, notes: "" },
  { solution_name: "Dig by Palo Alto Networks", vendor_name: "Palo Alto Networks", description: "SaaS data + API security (acquired Dig Security 2023); part of SaaS Security Platform.", solution_url: "https://www.paloaltonetworks.com/cloud-security/api-security", solution_type: "saas", is_active_in_market: true, notes: "Dig acquired 2023" },
  { solution_name: "Normalyze Platform", vendor_name: "Normalyze", description: "AWS data discovery + access audit + policy automation.", solution_url: "https://www.normalyze.ai/product", solution_type: "saas", is_active_in_market: true, notes: "" },
  { solution_name: "Sentra Platform", vendor_name: "Sentra", description: "Real-time cloud data security; multi-cloud DSPM with streaming access audit.", solution_url: "https://www.sentra.io/product", solution_type: "saas", is_active_in_market: true, notes: "" },
  { solution_name: "Rubrik Cloud Native Protection", vendor_name: "Rubrik", description: "Cloud data resilience + DSPM (post-Laminar acquisition).", solution_url: "https://www.rubrik.com/en/solutions/cloud-native-protection", solution_type: "saas", is_active_in_market: true, notes: "" },
  { solution_name: "Concentric AI Toucan Platform", vendor_name: "Concentric AI", description: "Shadow-SaaS + data risk discovery.", solution_url: "https://www.concentricai.com/platform", solution_type: "saas", is_active_in_market: true, notes: "" },
  { solution_name: "Symmetry Systems Platform", vendor_name: "Symmetry Systems", description: "SaaS data inventory + access audit (Salesforce, Slack, M365, Google Workspace).", solution_url: "https://www.symmetry-systems.com", solution_type: "saas", is_active_in_market: true, notes: "" },
  { solution_name: "Securiti Platform", vendor_name: "Securiti", description: "Data discovery + privacy compliance + remediation automation across clouds.", solution_url: "https://www.securiti.ai/product", solution_type: "saas", is_active_in_market: true, notes: "" },
  { solution_name: "IBM Guardium Insights", vendor_name: "IBM", description: "Data security and database-activity monitoring; cloud + hybrid.", solution_url: "https://www.ibm.com/products/guardium-insights", solution_type: "saas", is_active_in_market: true, notes: "" },
  // REAL-EST (12)
  { solution_name: "IBM TRIRIGA", vendor_name: "IBM", description: "Enterprise IWMS; lease accounting, portfolio management, occupancy optimization.", solution_url: "https://www.ibm.com/products/tririga", solution_type: "saas", is_active_in_market: true, notes: "" },
  { solution_name: "MRI OnCore", vendor_name: "MRI Software", description: "Commercial property management + lease accounting.", solution_url: "https://www.mrisoftware.com/software/oncore", solution_type: "saas", is_active_in_market: true, notes: "" },
  { solution_name: "Planon Workplace", vendor_name: "Planon", description: "IWMS platform; space booking, utilization, energy management.", solution_url: "https://www.planon.com/solutions/workplace", solution_type: "saas", is_active_in_market: true, notes: "" },
  { solution_name: "Archibus", vendor_name: "Archibus", description: "Modular CAFM/IWMS; bridges SMB to enterprise.", solution_url: "https://www.archibus.com", solution_type: "hybrid", is_active_in_market: true, notes: "" },
  { solution_name: "Yardi Voyager", vendor_name: "Yardi", description: "Commercial property and lease accounting.", solution_url: "https://www.yardi.com/products/voyager/", solution_type: "saas", is_active_in_market: true, notes: "" },
  { solution_name: "Eptura Workplace", vendor_name: "Eptura", description: "Desk booking, space mgmt, visitor handling (post-Condeco/iOffice/SpaceIQ merger).", solution_url: "https://www.eptura.com/products", solution_type: "saas", is_active_in_market: true, notes: "" },
  { solution_name: "Nuvolo CMMS", vendor_name: "Nuvolo", description: "Mobile-first CMMS; low-code workflow on ServiceNow platform heritage.", solution_url: "https://www.nuvolo.com/solutions/cmms", solution_type: "saas", is_active_in_market: true, notes: "" },
  { solution_name: "Tango Workplace", vendor_name: "Tango", description: "SMB desk booking + visitor mgmt + workplace analytics.", solution_url: "https://tangohr.com", solution_type: "saas", is_active_in_market: true, notes: "" },
  { solution_name: "Officespace", vendor_name: "Officespace", description: "SMB cloud workplace mgmt; analytics + utilization.", solution_url: "https://www.officespace.com", solution_type: "saas", is_active_in_market: true, notes: "" },
  { solution_name: "Accruent Resolute", vendor_name: "Accruent", description: "Integrated real-asset mgmt; CAFM + lease cost + capital projects.", solution_url: "https://www.accruent.com/solutions/resolute", solution_type: "saas", is_active_in_market: true, notes: "" },
  { solution_name: "Honeywell Forge Building Operations", vendor_name: "Honeywell", description: "Building operations + energy mgmt + maintenance overlay.", solution_url: "https://www.honeywellforge.com", solution_type: "saas", is_active_in_market: true, notes: "" },
  { solution_name: "Spacewell", vendor_name: "Spacewell", description: "Modular IWMS with strong EU energy focus.", solution_url: "https://www.spacewell.eu", solution_type: "saas", is_active_in_market: true, notes: "" },
];

// ============================================================================
// PHASE A — solution_domains
// ============================================================================
type SolDomDraft = { solution_name: string; domain_code: string; coverage_level: string; notes: string };
const solDoms: SolDomDraft[] = [
  // DLP
  { solution_name: "Microsoft Purview DLP", domain_code: "DLP", coverage_level: "primary", notes: "Native M365 DLP" },
  { solution_name: "Broadcom Data Protection DLP", domain_code: "DLP", coverage_level: "primary", notes: "Full-stack DLP; largest installed base" },
  { solution_name: "Forcepoint DLP", domain_code: "DLP", coverage_level: "primary", notes: "Full-stack hybrid" },
  { solution_name: "Trellix Data Loss Prevention", domain_code: "DLP", coverage_level: "primary", notes: "Full-stack DLP" },
  { solution_name: "Proofpoint Information Protection", domain_code: "DLP", coverage_level: "primary", notes: "Email-primary DLP" },
  { solution_name: "Netskope Next Gen SWG DLP", domain_code: "DLP", coverage_level: "secondary", notes: "DLP within SWG/SSE" },
  { solution_name: "Zscaler Internet Access DLP", domain_code: "DLP", coverage_level: "secondary", notes: "DLP within ZIA/SASE" },
  { solution_name: "Code42 Incydr", domain_code: "DLP", coverage_level: "partial", notes: "Behavioral insider-risk angle" },
  { solution_name: "Nightfall AI DLP", domain_code: "DLP", coverage_level: "partial", notes: "SaaS-centric API DLP" },
  { solution_name: "Cyberhaven", domain_code: "DLP", coverage_level: "partial", notes: "Forensic + lineage angle" },
  // DSPM
  { solution_name: "Wiz DSPM", domain_code: "DSPM", coverage_level: "primary", notes: "Flagship DSPM" },
  { solution_name: "Varonis Data Security Platform", domain_code: "DSPM", coverage_level: "secondary", notes: "DSPM as one lens of governance" },
  { solution_name: "Cyera Platform", domain_code: "DSPM", coverage_level: "primary", notes: "Pure-play DSPM" },
  { solution_name: "BigID Platform", domain_code: "DSPM", coverage_level: "secondary", notes: "Governance-led" },
  { solution_name: "Dig by Palo Alto Networks", domain_code: "DSPM", coverage_level: "secondary", notes: "SaaS + API focus" },
  { solution_name: "Normalyze Platform", domain_code: "DSPM", coverage_level: "primary", notes: "AWS-focused pure-play" },
  { solution_name: "Sentra Platform", domain_code: "DSPM", coverage_level: "primary", notes: "Real-time multi-cloud" },
  { solution_name: "Rubrik Cloud Native Protection", domain_code: "DSPM", coverage_level: "secondary", notes: "Resilience-first; DSPM via Laminar" },
  { solution_name: "Concentric AI Toucan Platform", domain_code: "DSPM", coverage_level: "secondary", notes: "Shadow-SaaS focus" },
  { solution_name: "Symmetry Systems Platform", domain_code: "DSPM", coverage_level: "secondary", notes: "SaaS-centric" },
  { solution_name: "Securiti Platform", domain_code: "DSPM", coverage_level: "primary", notes: "Multi-cloud + remediation" },
  { solution_name: "IBM Guardium Insights", domain_code: "DSPM", coverage_level: "secondary", notes: "Database-centric heritage" },
  // REAL-EST + IWMS (existing) + CAFM
  { solution_name: "IBM TRIRIGA", domain_code: "REAL-EST", coverage_level: "primary", notes: "Flagship IWMS at umbrella level" },
  { solution_name: "IBM TRIRIGA", domain_code: "IWMS", coverage_level: "primary", notes: "Enterprise IWMS flagship" },
  { solution_name: "MRI OnCore", domain_code: "REAL-EST", coverage_level: "primary", notes: "Lease/finance focus" },
  { solution_name: "MRI OnCore", domain_code: "IWMS", coverage_level: "primary", notes: "IWMS-tier" },
  { solution_name: "Planon Workplace", domain_code: "REAL-EST", coverage_level: "primary", notes: "" },
  { solution_name: "Planon Workplace", domain_code: "IWMS", coverage_level: "primary", notes: "" },
  { solution_name: "Archibus", domain_code: "REAL-EST", coverage_level: "primary", notes: "Spans both tiers" },
  { solution_name: "Archibus", domain_code: "IWMS", coverage_level: "primary", notes: "" },
  { solution_name: "Archibus", domain_code: "CAFM", coverage_level: "primary", notes: "" },
  { solution_name: "Yardi Voyager", domain_code: "REAL-EST", coverage_level: "secondary", notes: "Property-finance slant" },
  { solution_name: "Yardi Voyager", domain_code: "IWMS", coverage_level: "secondary", notes: "" },
  { solution_name: "Eptura Workplace", domain_code: "REAL-EST", coverage_level: "primary", notes: "" },
  { solution_name: "Eptura Workplace", domain_code: "IWMS", coverage_level: "primary", notes: "" },
  { solution_name: "Nuvolo CMMS", domain_code: "CAFM", coverage_level: "primary", notes: "CAFM flagship" },
  { solution_name: "Nuvolo CMMS", domain_code: "REAL-EST", coverage_level: "secondary", notes: "" },
  { solution_name: "Tango Workplace", domain_code: "CAFM", coverage_level: "primary", notes: "SMB CAFM" },
  { solution_name: "Tango Workplace", domain_code: "REAL-EST", coverage_level: "secondary", notes: "" },
  { solution_name: "Officespace", domain_code: "CAFM", coverage_level: "primary", notes: "Pure CAFM" },
  { solution_name: "Officespace", domain_code: "REAL-EST", coverage_level: "secondary", notes: "" },
  { solution_name: "Accruent Resolute", domain_code: "CAFM", coverage_level: "primary", notes: "" },
  { solution_name: "Accruent Resolute", domain_code: "IWMS", coverage_level: "secondary", notes: "Light IWMS" },
  { solution_name: "Accruent Resolute", domain_code: "REAL-EST", coverage_level: "primary", notes: "" },
  { solution_name: "Honeywell Forge Building Operations", domain_code: "REAL-EST", coverage_level: "secondary", notes: "Energy primary" },
  { solution_name: "Honeywell Forge Building Operations", domain_code: "IWMS", coverage_level: "secondary", notes: "" },
  { solution_name: "Spacewell", domain_code: "REAL-EST", coverage_level: "primary", notes: "" },
  { solution_name: "Spacewell", domain_code: "IWMS", coverage_level: "primary", notes: "" },
];

// ============================================================================
// PHASE A — capabilities
// ============================================================================
type CapabilityDraft = { capability_code: string; capability_name: string; description: string };
const newCapabilities: CapabilityDraft[] = [
  // DLP (8)
  { capability_code: "DLP-CLASSIFY", capability_name: "Data Classification and Labeling", description: "Inline and at-rest classification of data by sensitivity level; lexicon, statistical, and ML-driven inference." },
  { capability_code: "DLP-POLICY-ENGINE", capability_name: "DLP Policy Definition and Enforcement", description: "Rules engine for detecting policy violations and applying actions (block, quarantine, redact, mask, watermark, alert)." },
  { capability_code: "DLP-EMAIL-EGRESS", capability_name: "Email and Messaging Gateway DLP", description: "Inspection of outbound email, Teams, Slack messages and attachments for sensitive content." },
  { capability_code: "DLP-ENDPOINT-AGENT", capability_name: "Endpoint DLP", description: "Agent-based monitoring of local file access, USB/removable media, printing, clipboard, screen capture." },
  { capability_code: "DLP-NETWORK-INLINE", capability_name: "Network Inline and Web Gateway DLP", description: "Inspection of internet egress traffic for sensitive content; integration with proxy/SWG/SASE." },
  { capability_code: "DLP-CLOUD-API", capability_name: "Cloud and SaaS App Egress DLP", description: "API-level integration with SaaS apps for real-time scanning of file uploads and messages." },
  { capability_code: "DLP-INCIDENT-MGMT", capability_name: "DLP Incident and Remediation Workflow", description: "Event generation, case management, SIEM/SOAR integration, user education and exception workflows." },
  { capability_code: "DLP-FINGERPRINT", capability_name: "Data Fingerprinting and Forensic Recovery", description: "File hashing, lineage tracking, and post-exfiltration forensic recovery." },
  // DSPM (7)
  { capability_code: "DSPM-DATA-DISCOVERY", capability_name: "Cloud Data Discovery and Inventory", description: "Automated enumeration of cloud data stores (S3, databases, warehouses, SaaS apps)." },
  { capability_code: "DSPM-CLASSIFICATION", capability_name: "DSPM Data Classification and Sensitivity Scoring", description: "ML-driven and rule-based identification of PII / PHI / financial / trade-secret data with sensitivity scoring." },
  { capability_code: "DSPM-ACCESS-AUDIT", capability_name: "Access Path and Permission Audit", description: "Enumeration of identity principals and their effective permissions on data objects; detects over-privilege and toxic combinations." },
  { capability_code: "DSPM-LINEAGE", capability_name: "DSPM Data Lineage and Flow Mapping", description: "Tracks data movement across pipelines, transformations, and cross-system flows for risk context." },
  { capability_code: "DSPM-RISK-SCORING", capability_name: "DSPM Risk Posture Scoring", description: "Combines sensitivity + access breadth + exposure vector into risk scores; prioritizes remediation." },
  { capability_code: "DSPM-REMEDIATION", capability_name: "DSPM Remediation Automation", description: "Templated and custom policy enforcement for IAM corrections, bucket policy updates, entitlement reviews." },
  { capability_code: "DSPM-SHADOW-DATA", capability_name: "Shadow Data and Unmanaged Store Detection", description: "Identifies data stores, files, or SaaS instances not in official inventory." },
  // REAL-EST (7)
  { capability_code: "REAL-PROPERTY-MGMT", capability_name: "Property and Portfolio Management", description: "Owned/leased properties, locations, buildings, acquisition / disposal lifecycle." },
  { capability_code: "REAL-SPACE-OPTIM", capability_name: "Space Optimization and Allocation", description: "Desk, room, parking, floor allocation; occupancy forecasting; utilization heatmaps." },
  { capability_code: "REAL-LEASE-MGMT", capability_name: "Real Estate Lease Management", description: "Lease dates, renewals, rent calculations, expiry alerts; ASC 842 / IFRS 16 amortization." },
  { capability_code: "REAL-MAINTENANCE", capability_name: "Facilities Maintenance Management", description: "Preventive/corrective maintenance scheduling, technician dispatch, asset history." },
  { capability_code: "REAL-OCCUPANCY-ANALYTICS", capability_name: "Occupancy Tracking and Analytics", description: "Real-time desk/room utilization, badge-in rates, hybrid-work patterns, forecasting." },
  { capability_code: "REAL-UTILITY-TRACKING", capability_name: "Utility Meter Reading and Consumption Analytics", description: "Electricity, water, gas, waste metering; cost allocation; emissions reporting input." },
  { capability_code: "REAL-CAPITAL-PROJECTS", capability_name: "Capital Project Lifecycle Management", description: "Plan, budget, track building improvements, renovations, expansions." },
];

// ============================================================================
// PHASE A — capability_domains (cap_code → [domain_code])
// ============================================================================
const capDoms: { capability_code: string; domain_code: string; notes: string }[] = [
  // DLP (8 caps → DLP)
  ...["DLP-CLASSIFY","DLP-POLICY-ENGINE","DLP-EMAIL-EGRESS","DLP-ENDPOINT-AGENT","DLP-NETWORK-INLINE","DLP-CLOUD-API","DLP-INCIDENT-MGMT","DLP-FINGERPRINT"].map(c => ({ capability_code: c, domain_code: "DLP", notes: "" })),
  // DSPM (7 caps → DSPM)
  ...["DSPM-DATA-DISCOVERY","DSPM-CLASSIFICATION","DSPM-ACCESS-AUDIT","DSPM-LINEAGE","DSPM-RISK-SCORING","DSPM-REMEDIATION","DSPM-SHADOW-DATA"].map(c => ({ capability_code: c, domain_code: "DSPM", notes: "" })),
  // REAL-EST caps → REAL-EST + tier-specific links
  { capability_code: "REAL-PROPERTY-MGMT", domain_code: "REAL-EST", notes: "" },
  { capability_code: "REAL-PROPERTY-MGMT", domain_code: "IWMS", notes: "" },
  { capability_code: "REAL-SPACE-OPTIM", domain_code: "REAL-EST", notes: "" },
  { capability_code: "REAL-SPACE-OPTIM", domain_code: "IWMS", notes: "" },
  { capability_code: "REAL-SPACE-OPTIM", domain_code: "CAFM", notes: "" },
  { capability_code: "REAL-LEASE-MGMT", domain_code: "REAL-EST", notes: "" },
  { capability_code: "REAL-LEASE-MGMT", domain_code: "IWMS", notes: "Enterprise-tier capability" },
  { capability_code: "REAL-MAINTENANCE", domain_code: "REAL-EST", notes: "" },
  { capability_code: "REAL-MAINTENANCE", domain_code: "IWMS", notes: "" },
  { capability_code: "REAL-MAINTENANCE", domain_code: "CAFM", notes: "CAFM primary" },
  { capability_code: "REAL-OCCUPANCY-ANALYTICS", domain_code: "REAL-EST", notes: "" },
  { capability_code: "REAL-OCCUPANCY-ANALYTICS", domain_code: "IWMS", notes: "" },
  { capability_code: "REAL-OCCUPANCY-ANALYTICS", domain_code: "CAFM", notes: "" },
  { capability_code: "REAL-UTILITY-TRACKING", domain_code: "REAL-EST", notes: "" },
  { capability_code: "REAL-UTILITY-TRACKING", domain_code: "IWMS", notes: "" },
  { capability_code: "REAL-CAPITAL-PROJECTS", domain_code: "REAL-EST", notes: "" },
  { capability_code: "REAL-CAPITAL-PROJECTS", domain_code: "IWMS", notes: "" },
];

// ============================================================================
// PHASE A — solution_capabilities matrix (compact representation)
// ============================================================================
// shape: [solutionName, [ [capCode, deliveryStrength, notes?], ... ]]
type SolCapTuple = [string, string] | [string, string, string];
const solCapMatrix: Record<string, SolCapTuple[]> = {
  // DLP solutions
  "Microsoft Purview DLP": [
    ["DLP-CLASSIFY", "native"], ["DLP-POLICY-ENGINE", "native"], ["DLP-EMAIL-EGRESS", "native"],
    ["DLP-ENDPOINT-AGENT", "not_supported"], ["DLP-NETWORK-INLINE", "not_supported"],
    ["DLP-CLOUD-API", "partial"], ["DLP-INCIDENT-MGMT", "native"], ["DLP-FINGERPRINT", "not_supported"],
  ],
  "Broadcom Data Protection DLP": [
    ["DLP-CLASSIFY", "native"], ["DLP-POLICY-ENGINE", "native"], ["DLP-EMAIL-EGRESS", "native"],
    ["DLP-ENDPOINT-AGENT", "native"], ["DLP-NETWORK-INLINE", "native"],
    ["DLP-CLOUD-API", "partial"], ["DLP-INCIDENT-MGMT", "native"], ["DLP-FINGERPRINT", "partial"],
  ],
  "Forcepoint DLP": [
    ["DLP-CLASSIFY", "native"], ["DLP-POLICY-ENGINE", "native"], ["DLP-EMAIL-EGRESS", "native"],
    ["DLP-ENDPOINT-AGENT", "native"], ["DLP-NETWORK-INLINE", "native"],
    ["DLP-CLOUD-API", "partial"], ["DLP-INCIDENT-MGMT", "native"], ["DLP-FINGERPRINT", "not_supported"],
  ],
  "Trellix Data Loss Prevention": [
    ["DLP-CLASSIFY", "native"], ["DLP-POLICY-ENGINE", "native"], ["DLP-EMAIL-EGRESS", "native"],
    ["DLP-ENDPOINT-AGENT", "native"], ["DLP-NETWORK-INLINE", "native"],
    ["DLP-CLOUD-API", "partial"], ["DLP-INCIDENT-MGMT", "native"], ["DLP-FINGERPRINT", "not_supported"],
  ],
  "Proofpoint Information Protection": [
    ["DLP-CLASSIFY", "native"], ["DLP-POLICY-ENGINE", "native"], ["DLP-EMAIL-EGRESS", "native"],
    ["DLP-ENDPOINT-AGENT", "not_supported"], ["DLP-NETWORK-INLINE", "not_supported"],
    ["DLP-CLOUD-API", "partial"], ["DLP-INCIDENT-MGMT", "native"], ["DLP-FINGERPRINT", "not_supported"],
  ],
  "Netskope Next Gen SWG DLP": [
    ["DLP-CLASSIFY", "partial"], ["DLP-POLICY-ENGINE", "partial"], ["DLP-EMAIL-EGRESS", "not_supported"],
    ["DLP-ENDPOINT-AGENT", "not_supported"], ["DLP-NETWORK-INLINE", "native"],
    ["DLP-CLOUD-API", "native"], ["DLP-INCIDENT-MGMT", "partial"], ["DLP-FINGERPRINT", "not_supported"],
  ],
  "Zscaler Internet Access DLP": [
    ["DLP-CLASSIFY", "partial"], ["DLP-POLICY-ENGINE", "partial"], ["DLP-EMAIL-EGRESS", "not_supported"],
    ["DLP-ENDPOINT-AGENT", "not_supported"], ["DLP-NETWORK-INLINE", "native"],
    ["DLP-CLOUD-API", "partial"], ["DLP-INCIDENT-MGMT", "partial"], ["DLP-FINGERPRINT", "not_supported"],
  ],
  "Code42 Incydr": [
    ["DLP-CLASSIFY", "not_supported"], ["DLP-POLICY-ENGINE", "partial"], ["DLP-EMAIL-EGRESS", "not_supported"],
    ["DLP-ENDPOINT-AGENT", "native"], ["DLP-NETWORK-INLINE", "not_supported"],
    ["DLP-CLOUD-API", "partial"], ["DLP-INCIDENT-MGMT", "native"], ["DLP-FINGERPRINT", "native"],
  ],
  "Nightfall AI DLP": [
    ["DLP-CLASSIFY", "native"], ["DLP-POLICY-ENGINE", "partial"], ["DLP-EMAIL-EGRESS", "not_supported"],
    ["DLP-ENDPOINT-AGENT", "not_supported"], ["DLP-NETWORK-INLINE", "not_supported"],
    ["DLP-CLOUD-API", "native"], ["DLP-INCIDENT-MGMT", "partial"], ["DLP-FINGERPRINT", "not_supported"],
  ],
  "Cyberhaven": [
    ["DLP-CLASSIFY", "not_supported"], ["DLP-POLICY-ENGINE", "partial"], ["DLP-EMAIL-EGRESS", "not_supported"],
    ["DLP-ENDPOINT-AGENT", "partial"], ["DLP-NETWORK-INLINE", "not_supported"],
    ["DLP-CLOUD-API", "partial"], ["DLP-INCIDENT-MGMT", "native"], ["DLP-FINGERPRINT", "native"],
  ],
  // DSPM solutions
  "Wiz DSPM": [
    ["DSPM-DATA-DISCOVERY", "native"], ["DSPM-CLASSIFICATION", "native"], ["DSPM-ACCESS-AUDIT", "native"],
    ["DSPM-LINEAGE", "partial"], ["DSPM-RISK-SCORING", "native"], ["DSPM-REMEDIATION", "native"], ["DSPM-SHADOW-DATA", "native"],
  ],
  "Varonis Data Security Platform": [
    ["DSPM-DATA-DISCOVERY", "partial"], ["DSPM-CLASSIFICATION", "partial"], ["DSPM-ACCESS-AUDIT", "native"],
    ["DSPM-LINEAGE", "partial"], ["DSPM-RISK-SCORING", "partial"], ["DSPM-REMEDIATION", "native"], ["DSPM-SHADOW-DATA", "partial"],
  ],
  "Cyera Platform": [
    ["DSPM-DATA-DISCOVERY", "native"], ["DSPM-CLASSIFICATION", "native"], ["DSPM-ACCESS-AUDIT", "native"],
    ["DSPM-LINEAGE", "native"], ["DSPM-RISK-SCORING", "native"], ["DSPM-REMEDIATION", "native"], ["DSPM-SHADOW-DATA", "native"],
  ],
  "BigID Platform": [
    ["DSPM-DATA-DISCOVERY", "native"], ["DSPM-CLASSIFICATION", "native"], ["DSPM-ACCESS-AUDIT", "native"],
    ["DSPM-LINEAGE", "native"], ["DSPM-RISK-SCORING", "native"], ["DSPM-REMEDIATION", "native"], ["DSPM-SHADOW-DATA", "native"],
  ],
  "Dig by Palo Alto Networks": [
    ["DSPM-DATA-DISCOVERY", "native"], ["DSPM-CLASSIFICATION", "partial"], ["DSPM-ACCESS-AUDIT", "native"],
    ["DSPM-LINEAGE", "partial"], ["DSPM-RISK-SCORING", "native"], ["DSPM-REMEDIATION", "partial"], ["DSPM-SHADOW-DATA", "native"],
  ],
  "Normalyze Platform": [
    ["DSPM-DATA-DISCOVERY", "native"], ["DSPM-CLASSIFICATION", "native"], ["DSPM-ACCESS-AUDIT", "native"],
    ["DSPM-LINEAGE", "partial"], ["DSPM-RISK-SCORING", "native"], ["DSPM-REMEDIATION", "native"], ["DSPM-SHADOW-DATA", "native"],
  ],
  "Sentra Platform": [
    ["DSPM-DATA-DISCOVERY", "native"], ["DSPM-CLASSIFICATION", "native"], ["DSPM-ACCESS-AUDIT", "native"],
    ["DSPM-LINEAGE", "partial"], ["DSPM-RISK-SCORING", "native"], ["DSPM-REMEDIATION", "native"], ["DSPM-SHADOW-DATA", "native"],
  ],
  "Rubrik Cloud Native Protection": [
    ["DSPM-DATA-DISCOVERY", "native"], ["DSPM-CLASSIFICATION", "partial"], ["DSPM-ACCESS-AUDIT", "native"],
    ["DSPM-LINEAGE", "partial"], ["DSPM-RISK-SCORING", "partial"], ["DSPM-REMEDIATION", "partial"], ["DSPM-SHADOW-DATA", "partial"],
  ],
  "Concentric AI Toucan Platform": [
    ["DSPM-DATA-DISCOVERY", "native"], ["DSPM-CLASSIFICATION", "partial"], ["DSPM-ACCESS-AUDIT", "native"],
    ["DSPM-LINEAGE", "not_supported"], ["DSPM-RISK-SCORING", "native"], ["DSPM-REMEDIATION", "partial"], ["DSPM-SHADOW-DATA", "native"],
  ],
  "Symmetry Systems Platform": [
    ["DSPM-DATA-DISCOVERY", "native"], ["DSPM-CLASSIFICATION", "partial"], ["DSPM-ACCESS-AUDIT", "native"],
    ["DSPM-LINEAGE", "partial"], ["DSPM-RISK-SCORING", "native"], ["DSPM-REMEDIATION", "native"], ["DSPM-SHADOW-DATA", "native"],
  ],
  "Securiti Platform": [
    ["DSPM-DATA-DISCOVERY", "native"], ["DSPM-CLASSIFICATION", "native"], ["DSPM-ACCESS-AUDIT", "native"],
    ["DSPM-LINEAGE", "native"], ["DSPM-RISK-SCORING", "native"], ["DSPM-REMEDIATION", "native"], ["DSPM-SHADOW-DATA", "native"],
  ],
  "IBM Guardium Insights": [
    ["DSPM-DATA-DISCOVERY", "native"], ["DSPM-CLASSIFICATION", "native"], ["DSPM-ACCESS-AUDIT", "native"],
    ["DSPM-LINEAGE", "partial"], ["DSPM-RISK-SCORING", "native"], ["DSPM-REMEDIATION", "native"], ["DSPM-SHADOW-DATA", "partial"],
  ],
  // REAL-EST solutions
  "IBM TRIRIGA": [
    ["REAL-PROPERTY-MGMT", "native"], ["REAL-SPACE-OPTIM", "native"], ["REAL-LEASE-MGMT", "native"],
    ["REAL-MAINTENANCE", "native"], ["REAL-OCCUPANCY-ANALYTICS", "native"], ["REAL-UTILITY-TRACKING", "native"],
    ["REAL-CAPITAL-PROJECTS", "partial"],
  ],
  "MRI OnCore": [
    ["REAL-PROPERTY-MGMT", "native"], ["REAL-LEASE-MGMT", "native"], ["REAL-SPACE-OPTIM", "partial"],
    ["REAL-MAINTENANCE", "partial"], ["REAL-OCCUPANCY-ANALYTICS", "not_supported"],
  ],
  "Planon Workplace": [
    ["REAL-PROPERTY-MGMT", "native"], ["REAL-SPACE-OPTIM", "native"], ["REAL-MAINTENANCE", "native"],
    ["REAL-OCCUPANCY-ANALYTICS", "native"], ["REAL-LEASE-MGMT", "partial"], ["REAL-UTILITY-TRACKING", "native"],
  ],
  "Archibus": [
    ["REAL-PROPERTY-MGMT", "native"], ["REAL-SPACE-OPTIM", "native"], ["REAL-LEASE-MGMT", "partial"],
    ["REAL-MAINTENANCE", "native"], ["REAL-OCCUPANCY-ANALYTICS", "native"], ["REAL-UTILITY-TRACKING", "partial"],
  ],
  "Yardi Voyager": [
    ["REAL-PROPERTY-MGMT", "native"], ["REAL-LEASE-MGMT", "native"],
    ["REAL-SPACE-OPTIM", "not_supported"], ["REAL-MAINTENANCE", "not_supported"],
  ],
  "Eptura Workplace": [
    ["REAL-PROPERTY-MGMT", "partial"], ["REAL-SPACE-OPTIM", "native"], ["REAL-OCCUPANCY-ANALYTICS", "native"],
    ["REAL-MAINTENANCE", "partial"], ["REAL-LEASE-MGMT", "not_supported"],
  ],
  "Nuvolo CMMS": [
    ["REAL-MAINTENANCE", "native"], ["REAL-OCCUPANCY-ANALYTICS", "partial"],
    ["REAL-SPACE-OPTIM", "not_supported"],
  ],
  "Tango Workplace": [
    ["REAL-SPACE-OPTIM", "native"], ["REAL-OCCUPANCY-ANALYTICS", "native"],
    ["REAL-PROPERTY-MGMT", "partial"], ["REAL-MAINTENANCE", "not_supported"],
  ],
  "Officespace": [
    ["REAL-SPACE-OPTIM", "native"], ["REAL-OCCUPANCY-ANALYTICS", "native"],
    ["REAL-PROPERTY-MGMT", "partial"], ["REAL-MAINTENANCE", "not_supported"],
  ],
  "Accruent Resolute": [
    ["REAL-PROPERTY-MGMT", "native"], ["REAL-MAINTENANCE", "native"], ["REAL-LEASE-MGMT", "native"],
    ["REAL-SPACE-OPTIM", "partial"], ["REAL-CAPITAL-PROJECTS", "native"],
  ],
  "Honeywell Forge Building Operations": [
    ["REAL-UTILITY-TRACKING", "native"], ["REAL-MAINTENANCE", "native"], ["REAL-PROPERTY-MGMT", "partial"],
  ],
  "Spacewell": [
    ["REAL-PROPERTY-MGMT", "native"], ["REAL-SPACE-OPTIM", "native"], ["REAL-MAINTENANCE", "native"],
    ["REAL-OCCUPANCY-ANALYTICS", "native"], ["REAL-UTILITY-TRACKING", "native"],
  ],
};

// ============================================================================
// PHASE B — data_objects
// ============================================================================
type DataObjectDraft = { data_object_name: string; singular_label?: string; plural_label?: string; display_label: string; description: string };

const newDataObjects: DataObjectDraft[] = [
  // APM (6 — dropped application_lifecycle_states)
  { data_object_name: "enterprise_applications", singular_label: "Enterprise Application", plural_label: "Enterprise Applications", display_label: "Enterprise Application", description: "Individual business application in the enterprise portfolio (custom-built, on-prem, SaaS, hybrid) with owner, criticality, lifecycle state, vendor/platform, strategic value. Distinct from ATS `applications` (job-submission). APM's flagship entity." },
  { data_object_name: "application_costs", singular_label: "Application Total Cost of Ownership", plural_label: "Application Total Cost of Ownerships", display_label: "Application Total Cost of Ownership", description: "Aggregated cost per enterprise application: license fees, infrastructure, support, personnel, cloud usage. Refresh monthly/quarterly; feeds FINOPS." },
  { data_object_name: "technology_platforms", singular_label: "Technology Platform", plural_label: "Technology Platforms", display_label: "Technology Platform", description: "Vendor platform / tech stack (Azure, AWS, Salesforce platform, Kubernetes, .NET) with version, EOL, upgrade status, org-wide instance count. Distinct from `vendors` (legal entity) and `solutions` (product)." },
  { data_object_name: "technology_fit_assessments", singular_label: "Technology Fit Assessment", plural_label: "Technology Fit Assessments", display_label: "Technology Fit Assessment", description: "Evaluation of an application's tech-stack alignment with enterprise standards and vendor roadmap; score + gap analysis + remediation roadmap." },
  { data_object_name: "application_interfaces", singular_label: "Application Interface", plural_label: "Application Interfaces", display_label: "Application Interface", description: "Named integration point between two applications (API, ETL, message queue, file-drop, manual); carries payload type, data owner, frequency, SLA." },
  { data_object_name: "application_value_scores", singular_label: "Application Value Score", plural_label: "Application Value Scores", display_label: "Application Value Score", description: "Multi-dimensional time-series score per application: criticality, revenue attribution, adoption, strategic alignment, technical health. Quarterly refresh." },
  // SPM (9)
  { data_object_name: "portfolios", singular_label: "Portfolio", plural_label: "Portfolios", display_label: "Portfolio", description: "Container for strategic initiatives grouped by business unit, product line, or cost center; aggregate KPIs and investment rules." },
  { data_object_name: "strategic_initiatives", singular_label: "Strategic Initiative", plural_label: "Strategic Initiatives", display_label: "Strategic Initiative", description: "Multi-quarter / annual program aligned to corporate strategy; bundles related projects, has executive sponsor and benefits realisation plan." },
  { data_object_name: "roadmap_items", singular_label: "Roadmap Item", plural_label: "Roadmap Items", display_label: "Roadmap Item", description: "Planned product/capability delivery slated for a future release cycle; carries dependencies and contingency planning. Drives PROD-MGMT consumption." },
  { data_object_name: "business_value_assessments", singular_label: "Business Value Assessment", plural_label: "Business Value Assessments", display_label: "Business Value Assessment", description: "Scoring model for prioritising portfolio items: NPV, strategic alignment, risk, dependencies, resource constraints. Ranked backlog." },
  { data_object_name: "resource_allocations", singular_label: "Resource Allocation", plural_label: "Resource Allocations", display_label: "Resource Allocation", description: "Assignment of person / team / asset to an initiative or roadmap item for a time period; utilisation % and cost rate. Capacity-checks against SWP." },
  { data_object_name: "demand_intake_requests", singular_label: "Demand Intake Request", plural_label: "Demand Intake Requests", display_label: "Demand Intake Request", description: "Business case submission for new initiative or feature: requester, justification, estimated cost, timeline, approval workflow." },
  { data_object_name: "scenario_plans", singular_label: "Scenario Plan", plural_label: "Scenario Plans", display_label: "Scenario Plan", description: "What-if strategic scenarios (M&A, market disruption, expansion). Branches EPM `financial_scenarios` and SWP `workforce_scenarios`." },
  { data_object_name: "dependency_chains", singular_label: "Dependency Chain", plural_label: "Dependency Chains", display_label: "Dependency Chain", description: "Sequencing and blocking relationships between initiatives and roadmap items; critical path, lag time, external dependencies." },
  { data_object_name: "benefits_tracking_records", singular_label: "Benefits Tracking Record", plural_label: "Benefits Tracking Records", display_label: "Benefits Tracking Record", description: "Post-initiative metric capture: realised ROI, strategic-goal achievement, scope-vs-plan variance. Closes the loop from business_value_assessments." },
  // GRC (10)
  { data_object_name: "risks", singular_label: "Risk", plural_label: "Risks", display_label: "Risk", description: "Identified threat to organisational objectives; likelihood, impact, inherent / residual severity, owner. Links to controls and risk factors." },
  { data_object_name: "controls", singular_label: "Control", plural_label: "Controls", display_label: "Control", description: "Mitigating action or safeguard designed to reduce risk; control type (preventive / detective / corrective), design scope, owner, test frequency." },
  { data_object_name: "control_assessments", singular_label: "Control Assessment", plural_label: "Control Assessments", display_label: "Control Assessment", description: "Test result verifying a control's operating effectiveness; tester, scope, result, evidence reference, remediation status." },
  { data_object_name: "policies", singular_label: "Policy", plural_label: "Policies", display_label: "Policy", description: "Formal governance directive (acceptable-use, data-protection, whistleblower, anti-corruption); version, effective date, scope, owner, approval chain." },
  { data_object_name: "policy_attestations", singular_label: "Policy Attestation", plural_label: "Policy Attestations", display_label: "Policy Attestation", description: "Record that a user read, understood, and acknowledged a policy; timestamp, version, medium, completion evidence." },
  { data_object_name: "compliance_obligations", singular_label: "Compliance Obligation", plural_label: "Compliance Obligations", display_label: "Compliance Obligation", description: "Requirement imposed by a regulation or internal policy that must be fulfilled; distinct from contract_obligations (commercial) and controls (mechanisms)." },
  { data_object_name: "compliance_evidence", singular_label: "Compliance Evidence", plural_label: "Compliance Evidences", display_label: "Compliance Evidence", description: "Artifact proving fulfilment of an obligation: audit report, assessment result, signed attestation, log export. Carries obligation_id, type, retention." },
  { data_object_name: "issues", singular_label: "Issue", plural_label: "Issues", display_label: "Issue", description: "Identified gap, risk exposure, or non-conformance from assessment, audit, or policy exception. Carries priority, due date, owner, status." },
  { data_object_name: "remediation_plans", singular_label: "Remediation Plan", plural_label: "Remediation Plans", display_label: "Remediation Plan", description: "Action plan to close an issue or failed control test; responsible party, target date, steps, evidence requirements, status." },
  { data_object_name: "risk_assessments", singular_label: "Risk Assessment", plural_label: "Risk Assessments", display_label: "Risk Assessment", description: "Periodic or event-driven exercise to identify, analyse, and evaluate risks; type (enterprise / process / threat), scope, date, register version, findings." },
  // AUDIT (8)
  { data_object_name: "audit_plans", singular_label: "Audit Plan", plural_label: "Audit Plans", display_label: "Audit Plan", description: "Multi-year audit strategy and annual planning calendar defining audit-universe coverage, risk-based scoping, and timing." },
  { data_object_name: "audit_engagements", singular_label: "Audit Engagement", plural_label: "Audit Engagements", display_label: "Audit Engagement", description: "Scoped fieldwork initiative; scope statement, budget, team, timeline, procedures. Lifecycle: planned → in_progress → draft_report → completed." },
  { data_object_name: "audit_findings", singular_label: "Audit Finding", plural_label: "Audit Findings", display_label: "Audit Finding", description: "Observed control deviation, process gap, or non-compliance discovered during fieldwork; condition, criteria, cause, impact, remediation owner, target date. Triggers GRC issues via handoff." },
  { data_object_name: "work_papers", singular_label: "Work Paper", plural_label: "Work Papers", display_label: "Work Paper", description: "Fieldwork documentation: test procedures executed, evidence gathered, conclusions, sign-off. Keyed to audit_programs and control_tests." },
  { data_object_name: "control_tests", singular_label: "Audit Control Test", plural_label: "Audit Control Tests", display_label: "Audit Control Test", description: "Audit's execution view of a control: what was tested, how, sample size, exceptions found, evidence file references. Distinct from GRC control_assessments (continuous)." },
  { data_object_name: "audit_recommendations", singular_label: "Audit Recommendation", plural_label: "Audit Recommendations", display_label: "Audit Recommendation", description: "Forward-looking corrective-action proposal from fieldwork; risk rating, proposed owner, target date, expected cost/benefit." },
  { data_object_name: "audit_reports", singular_label: "Audit Report", plural_label: "Audit Reports", display_label: "Audit Report", description: "Formal deliverable: executive summary, scope, findings + recommendations ranked by severity, management response, sign-off." },
  { data_object_name: "follow_up_actions", singular_label: "Audit Follow-up Action", plural_label: "Audit Follow-up Actions", display_label: "Audit Follow-up Action", description: "Remediation tracking: owner, target date, evidence upload, closure date. Closure → closes corresponding GRC issue." },
  // DCG (9; metric_definitions / data_products / ontologies promoted from contributor to master via ddo rows below)
  { data_object_name: "data_assets", singular_label: "Data Asset", plural_label: "Data Assets", display_label: "Data Asset", description: "Cataloged data-bearing entity (table, dataset, API, database, file) with metadata, owner, storage location, format, record count, source system reference. DCG's flagship." },
  { data_object_name: "data_lineage_relationships", singular_label: "Data Lineage Relationship", plural_label: "Data Lineage Relationships", display_label: "Data Lineage Relationship", description: "Flow edge from source data_asset to target data_asset with column-level mapping, transformation logic, frequency, SLA. Represents ETL/dbt graphs." },
  { data_object_name: "glossary_terms", singular_label: "Business Glossary Term", plural_label: "Business Glossary Terms", display_label: "Business Glossary Term", description: "Business-language definition of a concept: term name, definition, steward, domains, related terms, synonyms, certification status. Distinct from ontologies (formal RDF/OWL models)." },
  { data_object_name: "data_classifications", singular_label: "Data Classification", plural_label: "Data Classifications", display_label: "Data Classification", description: "Sensitivity tag applied to data_assets (PII, PCI, PHI, Sensitive, Confidential, Internal). DCG masters the taxonomy; DSPM/DLP apply at rest and at egress respectively." },
  { data_object_name: "data_domains", singular_label: "Data Domain", plural_label: "Data Domains", display_label: "Data Domain", description: "Logical subject-area / domain grouping (Customer, Order, Inventory) organising multiple data_assets with ownership and documentation." },
  { data_object_name: "data_stewardship_assignments", singular_label: "Data Stewardship Assignment", plural_label: "Data Stewardship Assignments", display_label: "Data Stewardship Assignment", description: "Assignment of a steward (user) to a data_asset or glossary_term; responsibility type (owner / contributor / reviewer), escalation chain. Used by both DCG and MDM steward workflows." },
  { data_object_name: "data_certifications", singular_label: "Data Certification", plural_label: "Data Certifications", display_label: "Data Certification", description: "Attestation that a data_asset meets quality / compliance thresholds for production use; certifier, date, valid-until, conditions. Distinct from DQ rule pass/fail." },
  { data_object_name: "data_access_policies", singular_label: "Data Access Policy", plural_label: "Data Access Policies", display_label: "Data Access Policy", description: "Governance rule controlling who can access a data_asset: audience, permission level, conditions, approval chain, audit trail. Distinct from infrastructure-level IAM policies (DSPM `iam_access_policies`)." },
  { data_object_name: "data_usage_metrics", singular_label: "Data Usage Metric", plural_label: "Data Usage Metrics", display_label: "Data Usage Metric", description: "Aggregated consumption signal per data_asset: accessing_team, query_count, last_access, bytes scanned. Drives popularity and stale-asset detection." },
  // DQ (6)
  { data_object_name: "quality_rules", singular_label: "Data Quality Rule", plural_label: "Data Quality Rules", display_label: "Data Quality Rule", description: "Business logic defining acceptable data state: cardinality bounds, regex patterns, referential integrity constraints, statistical thresholds. References DCG `data_assets`." },
  { data_object_name: "quality_incidents", singular_label: "Data Quality Incident", plural_label: "Data Quality Incidents", display_label: "Data Quality Incident", description: "Work item raised when a profiling or monitoring rule breaches: root-cause detail, remediation status, linked data assets, SLA." },
  { data_object_name: "profile_results", singular_label: "Data Profile Result", plural_label: "Data Profile Results", display_label: "Data Profile Result", description: "Summary statistics computed on a data_asset: cardinality, null %, distinct count, value distributions, pattern samples. One per asset per scan." },
  { data_object_name: "dq_dimensions", singular_label: "Data Quality Dimension", plural_label: "Data Quality Dimensions", display_label: "Data Quality Dimension", description: "Canonical quality dimension (completeness, uniqueness, validity, timeliness, consistency, accuracy). DAMA/ISO reference data." },
  { data_object_name: "dq_scorecards", singular_label: "Data Quality Scorecard", plural_label: "Data Quality Scorecards", display_label: "Data Quality Scorecard", description: "Aggregated quality score per asset/time-slice: weighted roll-up of dimension scores, trend, direction. Consumed by BI dashboards." },
  { data_object_name: "dq_sla_definitions", singular_label: "Data Quality SLA Definition", plural_label: "Data Quality SLA Definitions", display_label: "Data Quality SLA Definition", description: "Contractual thresholds: max % null, max duplicate rate, max rule-breach count per day, incident response time." },
  // MDM (6 — dropped product_golden_records + data_steward_assignments collapsed into DCG's)
  { data_object_name: "customer_golden_records", singular_label: "Customer Golden Record", plural_label: "Customer Golden Records", display_label: "Customer Golden Record", description: "Single resolved customer identity across all source systems (CRM/CSM/SUB-MGMT/CDP), resolved via match/merge/survivorship rules. Distinct from operational `customers`." },
  { data_object_name: "supplier_golden_records", singular_label: "Supplier Golden Record", plural_label: "Supplier Golden Records", display_label: "Supplier Golden Record", description: "Single resolved supplier identity across all source systems (S2P/SUP-LIFE), resolved via match/merge/survivorship." },
  { data_object_name: "employee_golden_records", singular_label: "Employee Golden Record", plural_label: "Employee Golden Records", display_label: "Employee Golden Record", description: "Single resolved employee identity across HCM/Payroll/IGA/T&A sources." },
  { data_object_name: "match_rules", singular_label: "MDM Match Rule", plural_label: "MDM Match Rules", display_label: "MDM Match Rule", description: "Decision logic (exact / fuzzy / ML) identifying candidate duplicate records within or across sources; field weights, threshold scores." },
  { data_object_name: "merge_rules", singular_label: "MDM Merge Rule", plural_label: "MDM Merge Rules", display_label: "MDM Merge Rule", description: "Defines which source system's value wins per field when two records merge (survivorship: first/last/most-populated/highest-quality/custom)." },
  { data_object_name: "source_records", singular_label: "MDM Source Record", plural_label: "MDM Source Records", display_label: "MDM Source Record", description: "Raw record from a source system before match/merge processing; preserves provenance and source identifier for lineage." },
  // ESG (9 — dropped audit_trails_esg)
  { data_object_name: "emissions_records", singular_label: "Emissions Record", plural_label: "Emissions Records", display_label: "Emissions Record", description: "Physical fact of Scope 1, 2, or 3 GHG emissions from a facility, activity, or supply-chain tier; CO2-equivalents with timestamp and source." },
  { data_object_name: "emission_factors", singular_label: "Emission Factor", plural_label: "Emission Factors", display_label: "Emission Factor", description: "Lookup mapping activity (natural gas, electricity, freight) to emissions coefficient; sourced from IPCC/EPA/Defra; versioned by effective date." },
  { data_object_name: "activity_data_records", singular_label: "Activity Data Record", plural_label: "Activity Data Records", display_label: "Activity Data Record", description: "Raw operational metric feeding emissions calc: kWh, fuel litres, waste tonnage, commute miles. Mapped to emission_factor → emissions_record. Broader than REAL-EST `utility_meter_readings`." },
  { data_object_name: "esg_targets", singular_label: "ESG Target", plural_label: "ESG Targets", display_label: "ESG Target", description: "Commitment goal (SBTi, Net Zero, reduction %): target year, baseline year, scope coverage, approval status. Tracked vs actuals." },
  { data_object_name: "esg_metrics", singular_label: "ESG Metric", plural_label: "ESG Metrics", display_label: "ESG Metric", description: "Derived KPI roll-up: total Scope 1/2/3 emissions, intensity ratios (per $M revenue, per FTE), water/waste/DEI/governance metrics. Reporting-cycle refresh." },
  { data_object_name: "esg_disclosures", singular_label: "ESG Disclosure", plural_label: "ESG Disclosures", display_label: "ESG Disclosure", description: "Prepared report per framework (CSRD, CDP, GRI, SASB, TCFD, SEC Climate Rule, ISSB) for a fiscal year; narrative + metrics + assurance status." },
  { data_object_name: "supplier_esg_assessments", singular_label: "Supplier ESG Assessment", plural_label: "Supplier ESG Assessments", display_label: "Supplier ESG Assessment", description: "Vendor ESG performance profile: questionnaire responses, audit results, certifications (ISO 14001, B-Corp), Scope 3 estimate. Annual refresh." },
  { data_object_name: "facility_emissions", singular_label: "Facility Emissions", plural_label: "Facility Emissionses", display_label: "Facility Emissions", description: "Emissions inventory at facility/plant/building granularity: metered utility data → activity_data → emissions by scope/source." },
  { data_object_name: "esg_initiatives", singular_label: "ESG Initiative", plural_label: "ESG Initiatives", display_label: "ESG Initiative", description: "Action program to reduce emissions or improve social/governance KPI: renewable project, waste reduction, DEI hiring program. Tracks budget, actuals, impact." },
  // DLP (7 — dropped dlp_classifications; uses data_classifications from DCG)
  { data_object_name: "dlp_incidents", singular_label: "DLP Incident", plural_label: "DLP Incidents", display_label: "DLP Incident", description: "DLP policy violation event from an exfiltration attempt; user, timestamp, classification, destination, action taken, remediation status." },
  { data_object_name: "dlp_policies", singular_label: "DLP Policy", plural_label: "DLP Policies", display_label: "DLP Policy", description: "Rule set defining data-protection behaviour: conditions (user role, destination, classification, network) and actions (block, quarantine, redact, mask, watermark, alert)." },
  { data_object_name: "data_exfiltration_attempts", singular_label: "Data Exfiltration Attempt", plural_label: "Data Exfiltration Attempts", display_label: "Data Exfiltration Attempt", description: "Raw event of sensitive data being moved/accessed outside authorised boundaries; precursor to dlp_incident (filter: did policy trigger?)." },
  { data_object_name: "dlp_quarantine_items", singular_label: "DLP Quarantine Item", plural_label: "DLP Quarantine Items", display_label: "DLP Quarantine Item", description: "Blocked or flagged artifact (email, file, message) in temporary hold pending admin review or user override request." },
  { data_object_name: "dlp_exceptions", singular_label: "DLP Policy Exception", plural_label: "DLP Policy Exceptions", display_label: "DLP Policy Exception", description: "User or admin-approved exception to a DLP policy; time-limited; tracks requestor, approver, business justification, expiration." },
  { data_object_name: "dlp_user_activity_logs", singular_label: "DLP User Activity Log", plural_label: "DLP User Activity Logs", display_label: "DLP User Activity Log", description: "Audit trail of user interactions with DLP system: blocks, quarantine reviews, exception requests, policy violations. Supports forensic investigation." },
  // DSPM (8 — uses data_assets+data_classifications from DCG; dropped data_lineage_flows in favour of DCG's data_lineage_relationships; dropped identity_principals as IGA not in scope)
  { data_object_name: "cloud_storage_buckets", singular_label: "Cloud Storage Bucket", plural_label: "Cloud Storage Buckets", display_label: "Cloud Storage Bucket", description: "AWS S3 bucket, Azure Blob container, GCP Cloud Storage bucket, OSS bucket. Holds unstructured data. Lens distinct from CMDB configuration_items (security-posture vs IT-ops topology)." },
  { data_object_name: "cloud_databases", singular_label: "Cloud Database Instance", plural_label: "Cloud Database Instances", display_label: "Cloud Database Instance", description: "RDS, Cloud SQL, Snowflake schema, BigQuery dataset, Databricks workspace, Redshift cluster. Structured-data container at security-posture lens." },
  { data_object_name: "data_warehouses", singular_label: "Data Warehouse", plural_label: "Data Warehouses", display_label: "Data Warehouse", description: "Snowflake, BigQuery, Redshift cluster. Analytics-specialised database with distinct access model from transactional DBs." },
  { data_object_name: "saas_app_instances", singular_label: "SaaS App Instance", plural_label: "SaaS App Instances", display_label: "SaaS App Instance", description: "Salesforce org, Slack workspace, M365 tenant, Google Workspace domain, Jira cloud instance. Data residing in SaaS platforms (security-posture lens)." },
  { data_object_name: "iam_access_policies", singular_label: "IAM Access Policy", plural_label: "IAM Access Policies", display_label: "IAM Access Policy", description: "AWS bucket policy, Azure RBAC assignment, Snowflake RBAC rule, SaaS role grant, database permission. Infrastructure-level IAM artifact. Distinct from DCG `data_access_policies` (governance policy)." },
  { data_object_name: "sensitive_data_incidents", singular_label: "Sensitive Data Incident", plural_label: "Sensitive Data Incidents", display_label: "Sensitive Data Incident", description: "Detected over-privilege, toxic combination (PII + public access), unauthorised access, shadow-data exposure. DSPM remediation trigger." },
  { data_object_name: "data_risk_scores", singular_label: "Data Risk Score", plural_label: "Data Risk Scores", display_label: "Data Risk Score", description: "Per-asset risk score combining sensitivity + access breadth + exposure vector; prioritises DSPM remediation queue." },
  { data_object_name: "shadow_data_findings", singular_label: "Shadow Data Finding", plural_label: "Shadow Data Findings", display_label: "Shadow Data Finding", description: "Detected data store, file, or SaaS instance not in official inventory; unmanaged or rogue replica." },
  // REAL-EST (8)
  { data_object_name: "real_estate_properties", singular_label: "Real Estate Property", plural_label: "Real Estate Properties", display_label: "Real Estate Property", description: "Building, facility, or managed space (owned/leased); lifecycle from acquisition/lease-start to sale/expiry." },
  { data_object_name: "leases", singular_label: "Lease Agreement", plural_label: "Lease Agreements", display_label: "Lease Agreement", description: "Buyer-side lease contract; terms, dates, financials, renewals. Distinct from `contracts` (CLM) — real-estate specific with ASC 842/IFRS 16 accounting." },
  { data_object_name: "floor_plans", singular_label: "Floor Plan", plural_label: "Floor Plans", display_label: "Floor Plan", description: "Floor layout, desk/room locations, capacity, zone assignments." },
  { data_object_name: "spaces", singular_label: "Space", plural_label: "Spaces", display_label: "Space", description: "Desk, meeting room, parking space, locker, or other allocable unit. Parent = real_estate_property or floor_plan." },
  { data_object_name: "occupancy_records", singular_label: "Occupancy Record", plural_label: "Occupancy Records", display_label: "Occupancy Record", description: "Real-time or snapshot occupancy state for a space: desk booked, room reserved, actual check-in via badge/mobile." },
  { data_object_name: "maintenance_work_orders", singular_label: "Maintenance Work Order", plural_label: "Maintenance Work Orders", display_label: "Maintenance Work Order", description: "Preventive or corrective maintenance task; dispatches to technicians. REAL-EST-mastered; FSM consumes/contributes via handoff." },
  { data_object_name: "utility_meter_readings", singular_label: "Utility Meter Reading", plural_label: "Utility Meter Readings", display_label: "Utility Meter Reading", description: "Electricity, water, gas, waste consumption recorded per period. Source of ESG Scope 1+2 activity data (feeds ESG `activity_data_records`)." },
  { data_object_name: "capital_projects", singular_label: "Capital Project", plural_label: "Capital Projects", display_label: "Capital Project", description: "Building improvement, renovation, or expansion; budget, timeline, completion status." },
];

// ============================================================================
// PHASE B — domain_data_objects
// ============================================================================
type DdoDraft = { domain_code: string; data_object_name: string; role: string; notes: string };

const newDdos: DdoDraft[] = [
  // APM masters (6)
  { domain_code: "APM", data_object_name: "enterprise_applications", role: "master", notes: "APM's flagship; enterprise-application portfolio with TIME-scoring lifecycle column" },
  { domain_code: "APM", data_object_name: "application_costs", role: "master", notes: "FINOPS consumes downstream" },
  { domain_code: "APM", data_object_name: "technology_platforms", role: "master", notes: "Vendor platform / tech-stack inventory" },
  { domain_code: "APM", data_object_name: "technology_fit_assessments", role: "master", notes: "" },
  { domain_code: "APM", data_object_name: "application_interfaces", role: "master", notes: "Integration-point inventory" },
  { domain_code: "APM", data_object_name: "application_value_scores", role: "master", notes: "Time-series multi-dimensional scores" },
  // APM consumer/contributor
  { domain_code: "APM", data_object_name: "saas_applications", role: "consumer", notes: "SMP-mastered; APM reads for portfolio SaaS slice" },
  { domain_code: "APM", data_object_name: "software_titles", role: "consumer", notes: "SAM-mastered; APM reads for on-prem/installed software" },
  { domain_code: "APM", data_object_name: "configuration_items", role: "consumer", notes: "CMDB-mastered; APM reads application↔infrastructure dependency chains" },
  { domain_code: "APM", data_object_name: "data_products", role: "consumer", notes: "DCG-mastered; APM reads for data-integration visibility" },

  // SPM masters (9)
  { domain_code: "SPM", data_object_name: "portfolios", role: "master", notes: "Strategic container" },
  { domain_code: "SPM", data_object_name: "strategic_initiatives", role: "master", notes: "Multi-quarter program anchor" },
  { domain_code: "SPM", data_object_name: "roadmap_items", role: "master", notes: "Strategic / portfolio roadmap items; PROD-MGMT consumes for product-roadmap" },
  { domain_code: "SPM", data_object_name: "business_value_assessments", role: "master", notes: "Prioritisation backlog" },
  { domain_code: "SPM", data_object_name: "resource_allocations", role: "master", notes: "Bridges strategic headcount demand (SWP) → tactical booking" },
  { domain_code: "SPM", data_object_name: "demand_intake_requests", role: "master", notes: "Demand-funnel governance" },
  { domain_code: "SPM", data_object_name: "scenario_plans", role: "master", notes: "Branches EPM financial_scenarios + SWP workforce_scenarios" },
  { domain_code: "SPM", data_object_name: "dependency_chains", role: "master", notes: "Initiative-level dependencies (distinct from work-item dependencies)" },
  { domain_code: "SPM", data_object_name: "benefits_tracking_records", role: "master", notes: "Realised-value tracking" },
  // SPM consumer/contributor
  { domain_code: "SPM", data_object_name: "financial_scenarios", role: "consumer", notes: "EPM-mastered; SPM consumes for financial impact of portfolio decisions" },
  { domain_code: "SPM", data_object_name: "workforce_scenarios", role: "consumer", notes: "SWP-mastered; SPM consumes for resource-impact modelling" },
  { domain_code: "SPM", data_object_name: "position_demand_forecasts", role: "contributor", notes: "SPM demand_intake + resource_allocations feed SWP's position_demand_forecasts" },
  { domain_code: "SPM", data_object_name: "projects", role: "consumer", notes: "WORK-MGMT-mastered; SPM rolls up to portfolio KPIs" },

  // GRC masters (10)
  { domain_code: "GRC", data_object_name: "risks", role: "master", notes: "Enterprise risk register (single-master v1; multi-master with OP-RES/TPRM/SECOPS/PRIV-MGMT deferred to follow-up)" },
  { domain_code: "GRC", data_object_name: "controls", role: "master", notes: "Control definitions" },
  { domain_code: "GRC", data_object_name: "control_assessments", role: "master", notes: "Continuous control-effectiveness assessments (distinct from AUDIT's exercise-specific control_tests)" },
  { domain_code: "GRC", data_object_name: "policies", role: "master", notes: "Compliance-critical policies; Legal contributes authorship" },
  { domain_code: "GRC", data_object_name: "policy_attestations", role: "master", notes: "User policy acknowledgements" },
  { domain_code: "GRC", data_object_name: "compliance_obligations", role: "master", notes: "Regulatory / internal obligations" },
  { domain_code: "GRC", data_object_name: "compliance_evidence", role: "master", notes: "Curated evidence artefacts; AUDIT consumes" },
  { domain_code: "GRC", data_object_name: "issues", role: "master", notes: "GRC issue register; receives AUDIT findings via handoff" },
  { domain_code: "GRC", data_object_name: "remediation_plans", role: "master", notes: "Issue-closure plans; triggers ITSM tickets" },
  { domain_code: "GRC", data_object_name: "risk_assessments", role: "master", notes: "Periodic / event-driven assessment runs" },
  // GRC consumer
  { domain_code: "GRC", data_object_name: "contract_obligations", role: "consumer", notes: "CLM-mastered; cross-references compliance_obligations to contract-imposed regulatory requirements" },
  { domain_code: "GRC", data_object_name: "employees", role: "consumer", notes: "Reads for policy-attestation targeting + access-control exception implications" },

  // AUDIT masters (8)
  { domain_code: "AUDIT", data_object_name: "audit_plans", role: "master", notes: "Strategic audit calendar" },
  { domain_code: "AUDIT", data_object_name: "audit_engagements", role: "master", notes: "Engagement lifecycle anchor" },
  { domain_code: "AUDIT", data_object_name: "audit_findings", role: "master", notes: "Discovery artefacts; flow to GRC issues" },
  { domain_code: "AUDIT", data_object_name: "work_papers", role: "master", notes: "Fieldwork evidence layer" },
  { domain_code: "AUDIT", data_object_name: "control_tests", role: "master", notes: "Audit-exercise-specific (references GRC controls)" },
  { domain_code: "AUDIT", data_object_name: "audit_recommendations", role: "master", notes: "" },
  { domain_code: "AUDIT", data_object_name: "audit_reports", role: "master", notes: "Final deliverable" },
  { domain_code: "AUDIT", data_object_name: "follow_up_actions", role: "master", notes: "Remediation tracking; closure → GRC issue closure" },
  // AUDIT consumer
  { domain_code: "AUDIT", data_object_name: "journal_entries", role: "consumer", notes: "ERP-FIN mastered; reads for forensic review + post-close audit" },
  { domain_code: "AUDIT", data_object_name: "forecasts", role: "consumer", notes: "EPM mastered; reads for forecast-accuracy audit" },
  { domain_code: "AUDIT", data_object_name: "issues", role: "consumer", notes: "GRC mastered; AUDIT findings produce GRC issues; closure feedback flows back" },
  { domain_code: "AUDIT", data_object_name: "employees", role: "consumer", notes: "Reads for fieldwork-team roster, access-control review, SoD testing" },
  { domain_code: "AUDIT", data_object_name: "vendors", role: "consumer", notes: "Reads for third-party audit procedures, vendor-control testing" },

  // DCG masters (9 new + 3 promotions of existing from contributor → master)
  { domain_code: "DCG", data_object_name: "data_assets", role: "master", notes: "Cataloged data-bearing entity; DCG's flagship" },
  { domain_code: "DCG", data_object_name: "data_lineage_relationships", role: "master", notes: "Flow-edge graph between data_assets" },
  { domain_code: "DCG", data_object_name: "glossary_terms", role: "master", notes: "Business-language glossary; distinct from ontologies" },
  { domain_code: "DCG", data_object_name: "data_classifications", role: "master", notes: "Shared classification taxonomy; DLP + DSPM apply via contributor rows" },
  { domain_code: "DCG", data_object_name: "data_domains", role: "master", notes: "Subject-area groupings" },
  { domain_code: "DCG", data_object_name: "data_stewardship_assignments", role: "master", notes: "Universal steward assignments; MDM references rather than re-masters" },
  { domain_code: "DCG", data_object_name: "data_certifications", role: "master", notes: "Production-readiness attestations; signals DQ to start monitoring" },
  { domain_code: "DCG", data_object_name: "data_access_policies", role: "master", notes: "Governance policy (steward-level approval); distinct from DSPM iam_access_policies (infrastructure)" },
  { domain_code: "DCG", data_object_name: "data_usage_metrics", role: "master", notes: "Asset-popularity + stale-asset detection" },
  // DCG promotions: existing data_objects that DCG was a contributor on — now master
  { domain_code: "DCG", data_object_name: "metric_definitions", role: "master", notes: "DCG masters catalog entry + lineage; METRICS-layer co-master for formula/dimension slice" },
  { domain_code: "DCG", data_object_name: "data_products", role: "master", notes: "DCG masters published metadata + contract; DI contributes lineage" },
  { domain_code: "DCG", data_object_name: "ontologies", role: "master", notes: "DCG masters formal RDF/OWL structure; SEMANTIC-LAYER co-master for domain-specific ontologies" },

  // DQ masters (6 + 2 co-master/contributor rows)
  { domain_code: "DQ", data_object_name: "quality_rules", role: "master", notes: "References DCG data_assets via FK" },
  { domain_code: "DQ", data_object_name: "quality_incidents", role: "master", notes: "Rule-breach work items" },
  { domain_code: "DQ", data_object_name: "profile_results", role: "master", notes: "Per-asset per-scan summary statistics" },
  { domain_code: "DQ", data_object_name: "dq_dimensions", role: "master", notes: "DAMA/ISO canonical reference data" },
  { domain_code: "DQ", data_object_name: "dq_scorecards", role: "master", notes: "Asset-level quality rollups" },
  { domain_code: "DQ", data_object_name: "dq_sla_definitions", role: "master", notes: "SLA thresholds for incident SLA-criticality" },
  // DQ co-master + contributor
  { domain_code: "DQ", data_object_name: "anomaly_detections", role: "master", notes: "Co-master with AIOPS. DQ slice = anomalies linked to quality_rule_id; AIOPS slice = monitored_system_id" },
  { domain_code: "DQ", data_object_name: "incidents", role: "contributor", notes: "DQ creates ITSM incidents for SLA-critical quality breaches (DLP-style escalation)" },

  // MDM masters (6 + 3 co-master rows on existing)
  { domain_code: "MDM", data_object_name: "customer_golden_records", role: "master", notes: "Resolved customer identity across CRM/CSM/SUB-MGMT/CDP sources" },
  { domain_code: "MDM", data_object_name: "supplier_golden_records", role: "master", notes: "Resolved supplier identity across S2P sources" },
  { domain_code: "MDM", data_object_name: "employee_golden_records", role: "master", notes: "Resolved employee identity across HCM/Payroll/IGA sources" },
  { domain_code: "MDM", data_object_name: "match_rules", role: "master", notes: "Match decision logic" },
  { domain_code: "MDM", data_object_name: "merge_rules", role: "master", notes: "Survivorship rules" },
  { domain_code: "MDM", data_object_name: "source_records", role: "master", notes: "Pre-merge raw records with source provenance" },
  // MDM co-masters
  { domain_code: "MDM", data_object_name: "customers", role: "master", notes: "Co-master on golden-identity slice (operational lifecycles owned by CRM/CSM/SUB-MGMT)" },
  { domain_code: "MDM", data_object_name: "suppliers", role: "master", notes: "Co-master on golden-identity slice (operational lifecycle owned by S2P)" },
  { domain_code: "MDM", data_object_name: "employees", role: "master", notes: "Co-master on golden-identity slice (operational lifecycle owned by HCM)" },

  // ESG masters (9)
  { domain_code: "ESG", data_object_name: "emissions_records", role: "master", notes: "Physical fact of GHG emissions" },
  { domain_code: "ESG", data_object_name: "emission_factors", role: "master", notes: "Lookup; sourced from IPCC/EPA/Defra; versioned by effective date" },
  { domain_code: "ESG", data_object_name: "activity_data_records", role: "master", notes: "Broader than REAL-EST utility_meter_readings; includes commute miles, waste, freight" },
  { domain_code: "ESG", data_object_name: "esg_targets", role: "master", notes: "SBTi / Net Zero commitments" },
  { domain_code: "ESG", data_object_name: "esg_metrics", role: "master", notes: "KPI rollups + intensity ratios" },
  { domain_code: "ESG", data_object_name: "esg_disclosures", role: "master", notes: "Per-framework disclosure packages" },
  { domain_code: "ESG", data_object_name: "supplier_esg_assessments", role: "master", notes: "Vendor ESG profile slice; SUP-LIFE co-contributor via supplier_qualifications" },
  { domain_code: "ESG", data_object_name: "facility_emissions", role: "master", notes: "Per-facility emissions rollup" },
  { domain_code: "ESG", data_object_name: "esg_initiatives", role: "master", notes: "Action programs (distinct from SPM strategic_initiatives — ESG-specific lifecycle)" },
  // ESG consumer + contributor
  { domain_code: "ESG", data_object_name: "supplier_qualifications", role: "contributor", notes: "SUP-LIFE masters; ESG contributes ESG-specific slice (certifications, score, Scope 3 estimate)" },
  { domain_code: "ESG", data_object_name: "suppliers", role: "consumer", notes: "Reads supplier master to link supplier_esg_assessments" },
  { domain_code: "ESG", data_object_name: "financial_plans", role: "consumer", notes: "Reads revenue / headcount for intensity-ratio calc" },

  // DLP masters (6 + DCG-shared classifications as contributor)
  { domain_code: "DLP", data_object_name: "dlp_incidents", role: "master", notes: "" },
  { domain_code: "DLP", data_object_name: "dlp_policies", role: "master", notes: "" },
  { domain_code: "DLP", data_object_name: "data_exfiltration_attempts", role: "master", notes: "Raw attempts (pre-policy-evaluation)" },
  { domain_code: "DLP", data_object_name: "dlp_quarantine_items", role: "master", notes: "" },
  { domain_code: "DLP", data_object_name: "dlp_exceptions", role: "master", notes: "" },
  { domain_code: "DLP", data_object_name: "dlp_user_activity_logs", role: "master", notes: "" },
  { domain_code: "DLP", data_object_name: "data_classifications", role: "contributor", notes: "Applies classifications at egress scan time (DCG masters the taxonomy)" },
  { domain_code: "DLP", data_object_name: "employees", role: "consumer", notes: "Reads identity context for policy evaluation" },

  // DSPM masters (8 + contributors on shared)
  { domain_code: "DSPM", data_object_name: "cloud_storage_buckets", role: "master", notes: "Security-posture lens (distinct from CMDB CI topology lens)" },
  { domain_code: "DSPM", data_object_name: "cloud_databases", role: "master", notes: "" },
  { domain_code: "DSPM", data_object_name: "data_warehouses", role: "master", notes: "" },
  { domain_code: "DSPM", data_object_name: "saas_app_instances", role: "master", notes: "" },
  { domain_code: "DSPM", data_object_name: "iam_access_policies", role: "master", notes: "Infrastructure IAM artifact (distinct from DCG data_access_policies)" },
  { domain_code: "DSPM", data_object_name: "sensitive_data_incidents", role: "master", notes: "DSPM remediation trigger" },
  { domain_code: "DSPM", data_object_name: "data_risk_scores", role: "master", notes: "" },
  { domain_code: "DSPM", data_object_name: "shadow_data_findings", role: "master", notes: "Shadow-data discovery output" },
  { domain_code: "DSPM", data_object_name: "data_assets", role: "contributor", notes: "DCG-mastered; DSPM enriches with security-posture context" },
  { domain_code: "DSPM", data_object_name: "data_classifications", role: "contributor", notes: "Applies classifications via at-rest scans (DCG masters)" },
  { domain_code: "DSPM", data_object_name: "data_lineage_relationships", role: "consumer", notes: "DCG-mastered; DSPM consumes for risk-context enrichment" },

  // REAL-EST masters (8) + IWMS / CAFM tier links
  { domain_code: "REAL-EST", data_object_name: "real_estate_properties", role: "master", notes: "Umbrella property master" },
  { domain_code: "REAL-EST", data_object_name: "leases", role: "master", notes: "ASC 842 / IFRS 16 lease accounting; CLM-distinct" },
  { domain_code: "REAL-EST", data_object_name: "floor_plans", role: "master", notes: "" },
  { domain_code: "REAL-EST", data_object_name: "spaces", role: "master", notes: "" },
  { domain_code: "REAL-EST", data_object_name: "occupancy_records", role: "master", notes: "" },
  { domain_code: "REAL-EST", data_object_name: "maintenance_work_orders", role: "master", notes: "FSM consumes for technician dispatch" },
  { domain_code: "REAL-EST", data_object_name: "utility_meter_readings", role: "master", notes: "Scope 1+2 source data; ESG consumes via activity_data_records" },
  { domain_code: "REAL-EST", data_object_name: "capital_projects", role: "master", notes: "Building-improvement projects" },
  // REAL-EST consumer
  { domain_code: "REAL-EST", data_object_name: "configuration_items", role: "consumer", notes: "EAM-mastered; assets contained in properties" },
  { domain_code: "REAL-EST", data_object_name: "employees", role: "consumer", notes: "Seat-assignment + occupancy analytics" },
];

// ============================================================================
// PHASE B — trigger_events
// ============================================================================
type TEDraft = { event_name: string; data_object_name: string; from_state: string; to_state: string; event_category: string; description: string };

const newTEs: TEDraft[] = [
  // APM (6)
  { event_name: "application.onboarded", data_object_name: "enterprise_applications", from_state: "", to_state: "operate", event_category: "lifecycle", description: "Application added to portfolio, assigned to owner, baseline established." },
  { event_name: "application.lifecycle_state_changed", data_object_name: "enterprise_applications", from_state: "any", to_state: "any", event_category: "state_change", description: "Lifecycle transition (plan/develop/operate/sunset)." },
  { event_name: "application_interface.broken", data_object_name: "application_interfaces", from_state: "active", to_state: "broken", event_category: "state_change", description: "Integration-point failure detected." },
  { event_name: "technology_fit.assessment_completed", data_object_name: "technology_fit_assessments", from_state: "in_progress", to_state: "completed", event_category: "signal", description: "Architecture fit assessment finished." },
  { event_name: "application_cost.updated", data_object_name: "application_costs", from_state: "any", to_state: "updated", event_category: "threshold", description: "Periodic cost refresh published." },
  { event_name: "application_value.recalculated", data_object_name: "application_value_scores", from_state: "any", to_state: "recalculated", event_category: "threshold", description: "Quarterly value-score refresh; outliers trigger portfolio review." },
  // SPM (8)
  { event_name: "demand_intake.submitted", data_object_name: "demand_intake_requests", from_state: "", to_state: "submitted", event_category: "lifecycle", description: "New demand arrives; governance workflow begins." },
  { event_name: "demand_intake.approved", data_object_name: "demand_intake_requests", from_state: "reviewed", to_state: "approved", event_category: "state_change", description: "Approved demand becomes authorised initiative or roadmap item." },
  { event_name: "initiative.kickoff", data_object_name: "strategic_initiatives", from_state: "planned", to_state: "in_progress", event_category: "lifecycle", description: "Initiative moves to execution; announces to SWP (capacity) and WORK-MGMT (scope)." },
  { event_name: "initiative.completed", data_object_name: "strategic_initiatives", from_state: "in_progress", to_state: "completed", event_category: "lifecycle", description: "Execution complete; benefits tracking begins." },
  { event_name: "roadmap_item.released", data_object_name: "roadmap_items", from_state: "in_progress", to_state: "delivered", event_category: "lifecycle", description: "Feature/capability ships." },
  { event_name: "portfolio.rebalanced", data_object_name: "portfolios", from_state: "active", to_state: "active", event_category: "state_change", description: "Portfolio composition or prioritisation changes; cascades to children." },
  { event_name: "resource_allocation.committed", data_object_name: "resource_allocations", from_state: "proposed", to_state: "committed", event_category: "state_change", description: "Tentative allocation becomes binding." },
  { event_name: "scenario_plan.evaluated", data_object_name: "scenario_plans", from_state: "draft", to_state: "evaluated", event_category: "state_change", description: "Executive scenario modeled end-to-end (financial + workforce)." },
  // GRC (6)
  { event_name: "risk.identified", data_object_name: "risks", from_state: "", to_state: "active", event_category: "lifecycle", description: "New risk detected via assessment, policy review, or third-party notice." },
  { event_name: "control.failed", data_object_name: "control_assessments", from_state: "untested", to_state: "fail", event_category: "state_change", description: "Control test result is fail; triggers remediation plan." },
  { event_name: "policy.updated", data_object_name: "policies", from_state: "published", to_state: "republished", event_category: "state_change", description: "Policy version incremented and approved; triggers re-attestation." },
  { event_name: "issue.created", data_object_name: "issues", from_state: "", to_state: "open", event_category: "lifecycle", description: "GRC issue opened (from audit, assessment, or policy exception)." },
  { event_name: "obligation.overdue", data_object_name: "compliance_obligations", from_state: "on_track", to_state: "overdue", event_category: "threshold", description: "Obligation completion date passes without evidence." },
  { event_name: "assessment.completed", data_object_name: "risk_assessments", from_state: "in_progress", to_state: "completed", event_category: "lifecycle", description: "Risk assessment finalised; updates enterprise risk register." },
  // AUDIT (7)
  { event_name: "audit_engagement.created", data_object_name: "audit_engagements", from_state: "", to_state: "created", event_category: "lifecycle", description: "Fieldwork initiative scoped and kicked off." },
  { event_name: "audit_engagement.completed", data_object_name: "audit_engagements", from_state: "in_progress", to_state: "completed", event_category: "lifecycle", description: "All fieldwork procedures executed; findings drafted." },
  { event_name: "finding.created", data_object_name: "audit_findings", from_state: "", to_state: "created", event_category: "state_change", description: "Control deviation or non-compliance identified and documented." },
  { event_name: "finding.remediated", data_object_name: "audit_findings", from_state: "open", to_state: "resolved", event_category: "state_change", description: "Remediation evidence uploaded; finding closed." },
  { event_name: "audit_report.issued", data_object_name: "audit_reports", from_state: "reviewed", to_state: "issued", event_category: "lifecycle", description: "Final audit report signed off and distributed." },
  { event_name: "recommendation.accepted", data_object_name: "audit_recommendations", from_state: "pending", to_state: "accepted", event_category: "state_change", description: "Management acknowledged corrective action; remediation owner assigned." },
  { event_name: "follow_up_action.closed", data_object_name: "follow_up_actions", from_state: "pending", to_state: "closed", event_category: "state_change", description: "Remediation evidence approved; triggers GRC issue closure." },
  // DCG (7)
  { event_name: "data_asset.discovered", data_object_name: "data_assets", from_state: "unmapped", to_state: "cataloged", event_category: "lifecycle", description: "New table/dataset/API detected via automated crawler; DCG creates draft asset." },
  { event_name: "data_asset.classified", data_object_name: "data_assets", from_state: "unclassified", to_state: "classified", event_category: "state_change", description: "Sensitivity label applied; DLP/DSPM react to enforce/audit." },
  { event_name: "data_asset.certified", data_object_name: "data_assets", from_state: "uncertified", to_state: "certified", event_category: "state_change", description: "Steward approves asset for production; signals DQ to activate monitoring." },
  { event_name: "glossary_term.published", data_object_name: "glossary_terms", from_state: "", to_state: "published", event_category: "lifecycle", description: "Business term published; semantically links to assets and ontologies." },
  { event_name: "data_classification.rule_updated", data_object_name: "data_classifications", from_state: "", to_state: "updated", event_category: "state_change", description: "Classification rule revised; downstream re-scans triggered." },
  { event_name: "stewardship.escalated", data_object_name: "data_stewardship_assignments", from_state: "active", to_state: "escalated", event_category: "signal", description: "Steward assignment unacknowledged past SLA." },
  { event_name: "data_access_request.approved", data_object_name: "data_access_policies", from_state: "pending", to_state: "approved", event_category: "state_change", description: "Access request to an asset approved by steward; IGA/DLP receive grant signal." },
  // DQ (5)
  { event_name: "quality_rule.created", data_object_name: "quality_rules", from_state: "", to_state: "active", event_category: "lifecycle", description: "Rule definition published; triggers initial profile run." },
  { event_name: "quality_rule.breach", data_object_name: "quality_rules", from_state: "active", to_state: "breached", event_category: "state_change", description: "Rule evaluation detected violation." },
  { event_name: "quality_incident.raised", data_object_name: "quality_incidents", from_state: "", to_state: "open", event_category: "lifecycle", description: "Incident created by profiler/monitor." },
  { event_name: "profile_result.updated", data_object_name: "profile_results", from_state: "pending", to_state: "ready", event_category: "state_change", description: "Profile scan complete; triggers scorecard aggregation." },
  { event_name: "dq_scorecard.breached", data_object_name: "dq_scorecards", from_state: "compliant", to_state: "non_compliant", event_category: "threshold", description: "Weighted score dropped below SLA threshold." },
  // MDM (5; dropped product_golden_records events)
  { event_name: "match_rule.activated", data_object_name: "match_rules", from_state: "inactive", to_state: "active", event_category: "state_change", description: "Match rule enabled; triggers re-evaluation of pending duplicate sets." },
  { event_name: "customer_golden_record.created", data_object_name: "customer_golden_records", from_state: "", to_state: "active", event_category: "lifecycle", description: "New deduplicated customer golden record resolved; published to CRM/CSM/SUB-MGMT/CDP." },
  { event_name: "customer_golden_record.updated", data_object_name: "customer_golden_records", from_state: "active", to_state: "active", event_category: "state_change", description: "Customer golden record updated; published to all consumers." },
  { event_name: "supplier_golden_record.updated", data_object_name: "supplier_golden_records", from_state: "active", to_state: "active", event_category: "state_change", description: "Supplier golden record updated; published to S2P, SUP-LIFE." },
  { event_name: "employee_golden_record.created", data_object_name: "employee_golden_records", from_state: "", to_state: "active", event_category: "lifecycle", description: "Deduplicated employee identity resolved; published to HCM, Payroll, IGA." },
  // ESG (7)
  { event_name: "emissions_record.ingested", data_object_name: "emissions_records", from_state: "", to_state: "validated", event_category: "lifecycle", description: "Raw emissions fact ingested; passed QC." },
  { event_name: "emission_target.breached", data_object_name: "esg_targets", from_state: "in_progress", to_state: "breached", event_category: "threshold", description: "Actual emissions exceed target threshold." },
  { event_name: "esg_disclosure.submitted_for_assurance", data_object_name: "esg_disclosures", from_state: "draft", to_state: "in_assurance", event_category: "lifecycle", description: "Disclosure handed to external auditor; audit clock starts." },
  { event_name: "esg_disclosure.assured", data_object_name: "esg_disclosures", from_state: "in_assurance", to_state: "assured", event_category: "lifecycle", description: "External assurance complete; sign-off recorded." },
  { event_name: "supplier_esg_assessment.score_updated", data_object_name: "supplier_esg_assessments", from_state: "assessed", to_state: "assessed", event_category: "state_change", description: "ESG score recalculated on refresh." },
  { event_name: "esg_metric.threshold_breached", data_object_name: "esg_metrics", from_state: "normal", to_state: "threshold_breached", event_category: "threshold", description: "Calculated KPI crosses alert threshold." },
  { event_name: "facility_emissions.reported", data_object_name: "facility_emissions", from_state: "draft", to_state: "reported", event_category: "lifecycle", description: "Facility-level emissions locked for reporting period." },
  // DLP (8)
  { event_name: "dlp_incident.violation_detected", data_object_name: "dlp_incidents", from_state: "new", to_state: "confirmed", event_category: "state_change", description: "User/system triggers a DLP policy rule match." },
  { event_name: "dlp_incident.blocked", data_object_name: "dlp_incidents", from_state: "confirmed", to_state: "blocked", event_category: "state_change", description: "Policy action executed (email rejected, USB blocked)." },
  { event_name: "dlp_incident.quarantined", data_object_name: "dlp_incidents", from_state: "confirmed", to_state: "quarantined", event_category: "state_change", description: "Attachment placed in temporary hold pending review." },
  { event_name: "dlp_incident.remediated", data_object_name: "dlp_incidents", from_state: "quarantined", to_state: "resolved", event_category: "state_change", description: "Admin approved release/redaction; incident closed." },
  { event_name: "dlp_incident.escalated", data_object_name: "dlp_incidents", from_state: "confirmed", to_state: "escalated", event_category: "state_change", description: "High-severity violation escalated to SIEM/SOAR/IGA." },
  { event_name: "data_exfiltration_attempt.initiated", data_object_name: "data_exfiltration_attempts", from_state: "", to_state: "detected", event_category: "lifecycle", description: "Raw exfiltration attempt observed; triggers DLP scanning pipeline." },
  { event_name: "dlp_exception.requested", data_object_name: "dlp_exceptions", from_state: "", to_state: "pending_approval", event_category: "lifecycle", description: "User or admin requests exception to a DLP policy." },
  { event_name: "dlp_exception.approved", data_object_name: "dlp_exceptions", from_state: "pending_approval", to_state: "active", event_category: "state_change", description: "Admin approves exception; rule applied to policy engine." },
  // DSPM (7)
  { event_name: "cloud_storage_bucket.public_access_detected", data_object_name: "cloud_storage_buckets", from_state: "private", to_state: "public_or_overly_permissive", event_category: "threshold", description: "S3-equivalent bucket with public read/write or overly-broad principal access." },
  { event_name: "iam_access_policy.permission_escalation_detected", data_object_name: "iam_access_policies", from_state: "compliant", to_state: "non_compliant", event_category: "threshold", description: "IAM policy grants broader permission than necessary." },
  { event_name: "sensitive_data_incident.detected", data_object_name: "sensitive_data_incidents", from_state: "", to_state: "new_exposure", event_category: "lifecycle", description: "DSPM detected over-privilege, shadow data, or toxic combination." },
  { event_name: "sensitive_data_incident.resolved", data_object_name: "sensitive_data_incidents", from_state: "new_exposure", to_state: "remediated", event_category: "state_change", description: "Sensitive-data incident mitigated." },
  { event_name: "data_risk_score.updated", data_object_name: "data_risk_scores", from_state: "any", to_state: "updated", event_category: "state_change", description: "Per-asset DSPM risk score recalculated." },
  { event_name: "shadow_data_finding.detected", data_object_name: "shadow_data_findings", from_state: "", to_state: "new", event_category: "signal", description: "Unmanaged data store/file/SaaS instance discovered." },
  { event_name: "data_classification.sensitivity_elevated", data_object_name: "data_classifications", from_state: "low", to_state: "medium_or_high", event_category: "state_change", description: "Sensitivity label upgraded after new PII/PHI detection." },
  // REAL-EST (12)
  { event_name: "lease.created", data_object_name: "leases", from_state: "", to_state: "active", event_category: "lifecycle", description: "New lease signed; properties + cost center linked." },
  { event_name: "lease.renewed", data_object_name: "leases", from_state: "active", to_state: "renewed", event_category: "state_change", description: "Lease renewal negotiated; new end date / cost / terms." },
  { event_name: "lease.expiring", data_object_name: "leases", from_state: "active", to_state: "expiring", event_category: "signal", description: "90/60/30-day expiry warning." },
  { event_name: "lease.terminated", data_object_name: "leases", from_state: "active", to_state: "terminated", event_category: "lifecycle", description: "Lease ended." },
  { event_name: "space.allocated", data_object_name: "spaces", from_state: "available", to_state: "booked", event_category: "state_change", description: "Desk or room assigned to occupant." },
  { event_name: "space.deallocated", data_object_name: "spaces", from_state: "booked", to_state: "available", event_category: "state_change", description: "Occupant released; space returns to pool." },
  { event_name: "occupancy.recorded", data_object_name: "occupancy_records", from_state: "", to_state: "recorded", event_category: "signal", description: "Real-time badge/mobile check-in captured." },
  { event_name: "maintenance_work_order.created", data_object_name: "maintenance_work_orders", from_state: "", to_state: "open", event_category: "lifecycle", description: "Work order generated (preventive or reactive)." },
  { event_name: "maintenance_work_order.dispatched", data_object_name: "maintenance_work_orders", from_state: "open", to_state: "dispatched", event_category: "state_change", description: "FSM receives dispatch for technician assignment." },
  { event_name: "maintenance_work_order.completed", data_object_name: "maintenance_work_orders", from_state: "dispatched", to_state: "completed", event_category: "lifecycle", description: "Work completed; asset history + cost captured." },
  { event_name: "utility_meter_reading.published", data_object_name: "utility_meter_readings", from_state: "recorded", to_state: "published", event_category: "lifecycle", description: "Reading validated and published to ESG for emissions calc." },
  { event_name: "capital_project.completed", data_object_name: "capital_projects", from_state: "in_progress", to_state: "completed", event_category: "lifecycle", description: "Project finished; property updated with new assets/configuration." },
];

// ============================================================================
// PHASE B — cross_domain_handoffs
// (Only handoffs where both source and target domains exist in catalog.)
// ============================================================================
type HoDraft = { event_name: string; source_domain_code: string; target_domain_code: string; data_object_name: string; integration_pattern: string; friction_level: string; description: string };

const newHandoffs: HoDraft[] = [
  // APM outbound
  { event_name: "application.onboarded", source_domain_code: "APM", target_domain_code: "SAM", data_object_name: "enterprise_applications", integration_pattern: "api_call", friction_level: "medium", description: "New app triggers SAM software-title sync; identity reconciliation (app name vs software title) can lag." },
  { event_name: "application.onboarded", source_domain_code: "APM", target_domain_code: "CMDB", data_object_name: "enterprise_applications", integration_pattern: "api_call", friction_level: "medium", description: "App onboard creates CMDB CI; multi-vendor stacks need bespoke sync." },
  { event_name: "application.lifecycle_state_changed", source_domain_code: "APM", target_domain_code: "CMDB", data_object_name: "enterprise_applications", integration_pattern: "batch_sync", friction_level: "medium", description: "Sunset triggers CMDB CI retirement; decom timeline coordination." },
  { event_name: "application.lifecycle_state_changed", source_domain_code: "APM", target_domain_code: "SAM", data_object_name: "enterprise_applications", integration_pattern: "batch_sync", friction_level: "medium", description: "Sunset triggers license termination and reinstall-base cleanup." },
  { event_name: "application_interface.broken", source_domain_code: "APM", target_domain_code: "ITSM", data_object_name: "application_interfaces", integration_pattern: "event_stream", friction_level: "high", description: "Integration failure escalates to incident; detection lag; true-positive rate varies." },
  // SPM outbound
  { event_name: "demand_intake.approved", source_domain_code: "SPM", target_domain_code: "WORK-MGMT", data_object_name: "strategic_initiatives", integration_pattern: "api_call", friction_level: "high", description: "SPM creates work_projects + kickoff work_items for charter and resourcing." },
  { event_name: "initiative.kickoff", source_domain_code: "SPM", target_domain_code: "SWP", data_object_name: "strategic_initiatives", integration_pattern: "event_stream", friction_level: "high", description: "SWP reserves headcount from workforce_scenarios; demand > supply requires escalation." },
  { event_name: "resource_allocation.committed", source_domain_code: "SPM", target_domain_code: "SWP", data_object_name: "resource_allocations", integration_pattern: "api_call", friction_level: "medium", description: "SPM books person/team; SWP syncs to workforce plan and decrements available capacity." },
  { event_name: "roadmap_item.released", source_domain_code: "SPM", target_domain_code: "PROD-MGMT", data_object_name: "roadmap_items", integration_pattern: "api_call", friction_level: "medium", description: "SPM closes roadmap item; PROD-MGMT marks feature shipped." },
  { event_name: "portfolio.rebalanced", source_domain_code: "SPM", target_domain_code: "WORK-MGMT", data_object_name: "portfolios", integration_pattern: "batch_sync", friction_level: "high", description: "Re-prioritisation cascades to project priority updates; high-touch validation." },
  { event_name: "initiative.completed", source_domain_code: "SPM", target_domain_code: "EPM", data_object_name: "strategic_initiatives", integration_pattern: "api_call", friction_level: "medium", description: "Realised cost / schedule variance fed to EPM forecast and variance analysis." },
  { event_name: "scenario_plan.evaluated", source_domain_code: "SPM", target_domain_code: "EPM", data_object_name: "scenario_plans", integration_pattern: "event_stream", friction_level: "medium", description: "Evaluated scenario integrated by EPM for consolidated financial forecasting." },
  // GRC outbound
  { event_name: "issue.created", source_domain_code: "GRC", target_domain_code: "AUDIT", data_object_name: "issues", integration_pattern: "api_call", friction_level: "medium", description: "GRC-identified compliance gap feeds AUDIT investigation workflow." },
  { event_name: "control.failed", source_domain_code: "GRC", target_domain_code: "ITSM", data_object_name: "remediation_plans", integration_pattern: "api_call", friction_level: "high", description: "Failed IT control → ITSM ticket; no feedback when ITSM closes ticket on GRC SLA." },
  { event_name: "policy.updated", source_domain_code: "GRC", target_domain_code: "LMS", data_object_name: "policy_attestations", integration_pattern: "api_call", friction_level: "medium", description: "Policy version triggers LMS compliance-training requirement for scoped users." },
  { event_name: "policy.updated", source_domain_code: "GRC", target_domain_code: "HRSD", data_object_name: "policy_attestations", integration_pattern: "manual_handoff", friction_level: "high", description: "Policy update (leave, harassment) → HRSD exception handling; no standardised machine-readable payload." },
  { event_name: "obligation.overdue", source_domain_code: "GRC", target_domain_code: "AUDIT", data_object_name: "compliance_obligations", integration_pattern: "api_call", friction_level: "high", description: "Obligation past due → AUDIT escalation as non-conformance risk." },
  { event_name: "assessment.completed", source_domain_code: "GRC", target_domain_code: "OP-RES", data_object_name: "risk_assessments", integration_pattern: "api_call", friction_level: "medium", description: "Enterprise risk assessment → OP-RES for operational-resilience planning." },
  { event_name: "assessment.completed", source_domain_code: "GRC", target_domain_code: "BCM", data_object_name: "risks", integration_pattern: "api_call", friction_level: "medium", description: "Critical risks feed BCM business-continuity-scenario planning." },
  // AUDIT outbound
  { event_name: "finding.created", source_domain_code: "AUDIT", target_domain_code: "GRC", data_object_name: "audit_findings", integration_pattern: "event_stream", friction_level: "medium", description: "Audit finding flows to GRC for issue creation; canonical AUDIT→GRC separation." },
  { event_name: "follow_up_action.closed", source_domain_code: "AUDIT", target_domain_code: "GRC", data_object_name: "follow_up_actions", integration_pattern: "api_call", friction_level: "low", description: "AUDIT remediation closure → GRC issue closure (1:1 linkage established at finding time)." },
  { event_name: "recommendation.accepted", source_domain_code: "AUDIT", target_domain_code: "EPM", data_object_name: "audit_recommendations", integration_pattern: "batch_sync", friction_level: "medium", description: "Accepted recommendations with budget impact → EPM scenario planning." },
  { event_name: "audit_engagement.completed", source_domain_code: "AUDIT", target_domain_code: "ITSM", data_object_name: "audit_engagements", integration_pattern: "manual_handoff", friction_level: "high", description: "IT audit outcomes trigger ITSM actions; requires human interpretation of scope/findings." },
  { event_name: "finding.remediated", source_domain_code: "AUDIT", target_domain_code: "TPRM", data_object_name: "audit_findings", integration_pattern: "api_call", friction_level: "medium", description: "Third-party audit findings flow to TPRM for vendor-risk score update." },
  // DCG outbound
  { event_name: "data_asset.discovered", source_domain_code: "DI", target_domain_code: "DCG", data_object_name: "data_assets", integration_pattern: "event_stream", friction_level: "low", description: "Schema crawler publishes new table; DCG auto-creates draft asset." },
  { event_name: "data_asset.classified", source_domain_code: "DCG", target_domain_code: "DLP", data_object_name: "data_assets", integration_pattern: "api_call", friction_level: "high", description: "DCG publishes classification label; DLP must update enforcement policies." },
  { event_name: "data_asset.classified", source_domain_code: "DCG", target_domain_code: "DSPM", data_object_name: "data_assets", integration_pattern: "api_call", friction_level: "high", description: "DCG publishes classification; DSPM re-evaluates posture and alerts on over-privileged access." },
  { event_name: "data_asset.certified", source_domain_code: "DCG", target_domain_code: "DQ", data_object_name: "data_assets", integration_pattern: "api_call", friction_level: "medium", description: "Asset certified → DQ activates monitoring rules." },
  { event_name: "data_access_request.approved", source_domain_code: "DCG", target_domain_code: "IGA", data_object_name: "data_access_policies", integration_pattern: "api_call", friction_level: "high", description: "Access approved → IGA syncs credentials (AD group, role assignment)." },
  { event_name: "data_access_request.approved", source_domain_code: "DCG", target_domain_code: "DLP", data_object_name: "data_access_policies", integration_pattern: "api_call", friction_level: "medium", description: "Policy approved → DLP activates PII masking for named users." },
  { event_name: "glossary_term.published", source_domain_code: "DCG", target_domain_code: "KGP", data_object_name: "glossary_terms", integration_pattern: "api_call", friction_level: "medium", description: "New glossary term published → KGP (Knowledge Graph Platform) populates concept hierarchy and links related entities." },
  // DQ outbound
  { event_name: "quality_rule.breach", source_domain_code: "DQ", target_domain_code: "ITSM", data_object_name: "quality_incidents", integration_pattern: "event_stream", friction_level: "medium", description: "Severity ≥ HIGH or breach > SLA threshold → ITSM incident. Dedup on (asset_id, rule_id)." },
  { event_name: "dq_scorecard.breached", source_domain_code: "DQ", target_domain_code: "ITSM", data_object_name: "quality_incidents", integration_pattern: "api_call", friction_level: "medium", description: "Scorecard SLA breach → ITSM escalation ticket." },
  { event_name: "profile_result.updated", source_domain_code: "DQ", target_domain_code: "DCG", data_object_name: "data_assets", integration_pattern: "batch_sync", friction_level: "medium", description: "Aggregated stats published back to DCG as asset metadata." },
  // MDM outbound
  { event_name: "customer_golden_record.created", source_domain_code: "MDM", target_domain_code: "CRM", data_object_name: "customers", integration_pattern: "api_call", friction_level: "medium", description: "Resolved golden ID + merged attributes; CRM links operational record." },
  { event_name: "customer_golden_record.created", source_domain_code: "MDM", target_domain_code: "CSM", data_object_name: "customers", integration_pattern: "api_call", friction_level: "medium", description: "Resolved golden ID published to service-view." },
  { event_name: "customer_golden_record.created", source_domain_code: "MDM", target_domain_code: "SUB-MGMT", data_object_name: "customers", integration_pattern: "api_call", friction_level: "medium", description: "Published to billing for invoice/subscription account reconciliation." },
  { event_name: "customer_golden_record.updated", source_domain_code: "MDM", target_domain_code: "CDP", data_object_name: "customers", integration_pattern: "event_stream", friction_level: "high", description: "Golden record changes must propagate within SLA; identity corrections time-sensitive for marketing." },
  { event_name: "supplier_golden_record.updated", source_domain_code: "MDM", target_domain_code: "SUP-LIFE", data_object_name: "suppliers", integration_pattern: "api_call", friction_level: "high", description: "Golden-record changes flow to SUP-LIFE for risk reassessment; approval workflows add latency." },
  { event_name: "employee_golden_record.created", source_domain_code: "MDM", target_domain_code: "HCM", data_object_name: "employees", integration_pattern: "api_call", friction_level: "medium", description: "Resolved identity → HCM links operational HR record." },
  // ESG outbound
  { event_name: "emissions_record.ingested", source_domain_code: "ESG", target_domain_code: "AUDIT", data_object_name: "emissions_records", integration_pattern: "api_call", friction_level: "medium", description: "ESG publishes immutable fact; AUDIT reads for assurance sampling." },
  { event_name: "esg_disclosure.submitted_for_assurance", source_domain_code: "ESG", target_domain_code: "AUDIT", data_object_name: "esg_disclosures", integration_pattern: "api_call", friction_level: "high", description: "Disclosure handed to AUDIT; tight Q deadline; no ack/retry on missed submissions." },
  { event_name: "supplier_esg_assessment.score_updated", source_domain_code: "ESG", target_domain_code: "SUP-LIFE", data_object_name: "supplier_esg_assessments", integration_pattern: "api_call", friction_level: "medium", description: "Updated ESG score → SUP-LIFE supplier_qualifications field; tier reassessment." },
  { event_name: "supplier_esg_assessment.score_updated", source_domain_code: "ESG", target_domain_code: "TPRM", data_object_name: "supplier_esg_assessments", integration_pattern: "api_call", friction_level: "high", description: "Score → TPRM risk model; no feedback loop on TPRM action." },
  { event_name: "emission_target.breached", source_domain_code: "ESG", target_domain_code: "GRC", data_object_name: "esg_targets", integration_pattern: "event_stream", friction_level: "medium", description: "Target breach (SBTi-committed) → GRC obligation tracking." },
  // DLP outbound
  { event_name: "dlp_incident.violation_detected", source_domain_code: "DLP", target_domain_code: "SECOPS", data_object_name: "dlp_incidents", integration_pattern: "event_stream", friction_level: "medium", description: "Violation events to SIEM for SOC enrichment / triage." },
  { event_name: "dlp_incident.escalated", source_domain_code: "DLP", target_domain_code: "IGA", data_object_name: "dlp_incidents", integration_pattern: "api_call", friction_level: "high", description: "High-severity violations → IGA user-risk scoring; identity reconciliation friction." },
  { event_name: "dlp_incident.escalated", source_domain_code: "DLP", target_domain_code: "SECOPS", data_object_name: "dlp_incidents", integration_pattern: "event_stream", friction_level: "high", description: "Critical violations fan-out to SOAR/ticketing; alert fatigue risk." },
  { event_name: "dlp_incident.blocked", source_domain_code: "DLP", target_domain_code: "PRIV-MGMT", data_object_name: "dlp_incidents", integration_pattern: "batch_sync", friction_level: "low", description: "Nightly batch export of PII/GDPR blocks for privacy-incident tracking." },
  { event_name: "data_exfiltration_attempt.initiated", source_domain_code: "DLP", target_domain_code: "SECOPS", data_object_name: "data_exfiltration_attempts", integration_pattern: "event_stream", friction_level: "medium", description: "Raw attempts → SIEM for behavioural analytics; high volume requires tuning." },
  // DSPM outbound
  { event_name: "data_asset.classified", source_domain_code: "DSPM", target_domain_code: "DCG", data_object_name: "data_assets", integration_pattern: "api_call", friction_level: "low", description: "DSPM propagates newly-discovered data-asset sensitivity labels to DCG." },
  { event_name: "sensitive_data_incident.detected", source_domain_code: "DSPM", target_domain_code: "IGA", data_object_name: "iam_access_policies", integration_pattern: "api_call", friction_level: "high", description: "Over-privilege findings → IGA role review; IGA may not have data-scoped roles." },
  { event_name: "sensitive_data_incident.detected", source_domain_code: "DSPM", target_domain_code: "SECOPS", data_object_name: "sensitive_data_incidents", integration_pattern: "api_call", friction_level: "medium", description: "High-severity findings → SOC triage; bespoke schema mapping." },
  { event_name: "data_classification.sensitivity_elevated", source_domain_code: "DSPM", target_domain_code: "PRIV-MGMT", data_object_name: "data_assets", integration_pattern: "api_call", friction_level: "medium", description: "Elevation may trigger privacy data-subject / retention workflows." },
  { event_name: "iam_access_policy.permission_escalation_detected", source_domain_code: "DSPM", target_domain_code: "IGA", data_object_name: "iam_access_policies", integration_pattern: "manual_handoff", friction_level: "high", description: "Over-privilege in AWS IAM / Snowflake RBAC / SF profiles; manual correction common." },
  { event_name: "sensitive_data_incident.resolved", source_domain_code: "DSPM", target_domain_code: "SECOPS", data_object_name: "sensitive_data_incidents", integration_pattern: "api_call", friction_level: "low", description: "Incident closure signal to SECOPS." },
  // REAL-EST outbound
  { event_name: "maintenance_work_order.created", source_domain_code: "REAL-EST", target_domain_code: "FSM", data_object_name: "maintenance_work_orders", integration_pattern: "api_call", friction_level: "medium", description: "Maintenance ticket dispatched to FSM for technician assignment." },
  { event_name: "maintenance_work_order.completed", source_domain_code: "FSM", target_domain_code: "REAL-EST", data_object_name: "maintenance_work_orders", integration_pattern: "api_call", friction_level: "high", description: "Async, often delayed (technician retro logging); leaver/cancellation recall pattern on vacated spaces." },
  { event_name: "utility_meter_reading.published", source_domain_code: "REAL-EST", target_domain_code: "ESG", data_object_name: "utility_meter_readings", integration_pattern: "batch_sync", friction_level: "high", description: "Utility readings → ESG activity_data calc; period/cycle-close coupling + meter_id↔facility_code identity reconciliation." },
  { event_name: "capital_project.completed", source_domain_code: "REAL-EST", target_domain_code: "EAM", data_object_name: "capital_projects", integration_pattern: "api_call", friction_level: "medium", description: "New assets installed; EAM records created at project closeout." },
  { event_name: "space.allocated", source_domain_code: "REAL-EST", target_domain_code: "HCM", data_object_name: "spaces", integration_pattern: "api_call", friction_level: "low", description: "Seat-assignment binding; low friction if shared employee master." },
];

// ============================================================================
// EXECUTION
// ============================================================================

// --- Phase A0: domains ---
const missingDomains = newDomains.filter(d => !domainId.has(d.domain_code));
console.log(`Section A0 — domains: ${newDomains.length} planned, ${missingDomains.length} to insert.`);
if (missingDomains.length > 0) {
  const payload = missingDomains.map(d => {
    const out: Row = {
      domain_code: d.domain_code, domain_name: d.domain_name, description: d.description,
      crud_percentage: d.crud_percentage, business_logic: d.business_logic,
      min_org_size: d.min_org_size, cost_band: d.cost_band,
      certification_required: d.certification_required,
      usa_market_size_usd_m: d.usa_market_size_usd_m, market_size_source_year: d.market_size_source_year,
    };
    if (d.parent_domain_code) {
      const pid = domainId.get(d.parent_domain_code);
      if (pid === undefined) {
        // Parent in same batch; resolve after this insert. For DRY RUN we skip; for APPLY we re-read after parent inserted.
        // CAFM's parent is REAL-EST in same batch — process in two waves.
        return null;
      }
      out.parent_domain_id = pid;
    }
    return out;
  }).filter(x => x !== null) as Row[];

  // Insert parents first (no parent_domain_code), then children
  const parents = payload.filter(p => p.parent_domain_id === undefined);
  await insert("/domains", parents);
  if (APPLY) await refreshDomains();
  // Now children
  const children = missingDomains
    .filter(d => d.parent_domain_code !== undefined)
    .map(d => {
      const pid = domainId.get(d.parent_domain_code!);
      if (!APPLY && pid === undefined) {
        console.log(`  [DRY] CAFM child would resolve parent REAL-EST.id on apply`);
        return null;
      }
      if (APPLY && pid === undefined) throw new Error(`Parent not found: ${d.parent_domain_code}`);
      return {
        domain_code: d.domain_code, domain_name: d.domain_name, description: d.description,
        crud_percentage: d.crud_percentage, business_logic: d.business_logic,
        min_org_size: d.min_org_size, cost_band: d.cost_band,
        certification_required: d.certification_required,
        usa_market_size_usd_m: d.usa_market_size_usd_m, market_size_source_year: d.market_size_source_year,
        parent_domain_id: pid,
      };
    })
    .filter(x => x !== null) as Row[];
  if (children.length > 0) {
    await insert("/domains", children);
    if (APPLY) await refreshDomains();
  }
}

// --- Phase A0.5: PATCH IWMS parent_domain_id = REAL-EST.id (only if IWMS exists and isn't already pointed there) ---
{
  const realEstId = domainId.get("REAL-EST");
  const iwmsId = domainId.get("IWMS");
  if (iwmsId !== undefined && realEstId !== undefined) {
    const iwmsRow = await get(`/domains?id=eq.${iwmsId}&select=parent_domain_id`);
    const currentParent = iwmsRow[0]?.parent_domain_id;
    if (currentParent !== realEstId) {
      console.log(`Section A0.5 — IWMS parent_domain_id: ${currentParent ?? "null"} → ${realEstId}`);
      await patch(`/domains?id=eq.${iwmsId}`, { parent_domain_id: realEstId });
    } else {
      console.log(`Section A0.5 — IWMS parent_domain_id already correct (${realEstId})`);
    }
  } else if (!APPLY) {
    console.log(`Section A0.5 — [DRY] would PATCH IWMS.parent_domain_id once REAL-EST exists`);
  }
}

// --- Phase A1: vendors ---
const missingVendors = newVendors.filter(v => !vendorId.has(v.vendor_name));
console.log(`Section A1 — vendors: ${newVendors.length} planned, ${missingVendors.length} to insert.`);
if (missingVendors.length > 0) {
  await insert("/vendors", missingVendors);
  if (APPLY) await refreshVendors();
}

// --- Phase A2: solutions ---
const missingSolutions = newSolutions.filter(s => !solutionId.has(s.solution_name));
console.log(`Section A2 — solutions: ${newSolutions.length} planned, ${missingSolutions.length} to insert.`);
if (missingSolutions.length > 0) {
  const payload: Row[] = [];
  for (const s of missingSolutions) {
    const vid = vendorId.get(s.vendor_name);
    if (!APPLY && vid === undefined) {
      console.log(`  [DRY] ${s.solution_name} → vendor ${s.vendor_name} (will resolve on apply)`);
      continue;
    }
    if (APPLY && vid === undefined) throw new Error(`Vendor not found: ${s.vendor_name}`);
    payload.push({
      solution_name: s.solution_name, vendor_id: vid, description: s.description,
      solution_url: s.solution_url, solution_type: s.solution_type,
      is_active_in_market: s.is_active_in_market, notes: s.notes,
    });
  }
  await insert("/solutions", payload);
  if (APPLY) await refreshSolutions();
}

// --- Phase A3: solution_domains ---
const solDomPayload: Row[] = [];
let solDomSkipped = 0;
for (const r of solDoms) {
  const sid = solutionId.get(r.solution_name);
  const did = domainId.get(r.domain_code);
  if (sid === undefined || did === undefined) { solDomSkipped++; continue; }
  if (existingSolDoms.has(solDomKey(sid, did))) continue;
  solDomPayload.push({ solution_id: sid, domain_id: did, coverage_level: r.coverage_level, notes: r.notes });
}
console.log(`Section A3 — solution_domains: ${solDoms.length} planned, ${solDomPayload.length} to insert, ${solDomSkipped} skipped (will resolve on apply).`);
if (solDomPayload.length > 0) await insert("/solution_domains", solDomPayload);

// --- Phase A4: capabilities ---
const missingCaps = newCapabilities.filter(c => !capabilityId.has(c.capability_code));
console.log(`Section A4 — capabilities: ${newCapabilities.length} planned, ${missingCaps.length} to insert.`);
if (missingCaps.length > 0) {
  await insert("/capabilities", missingCaps);
  if (APPLY) await refreshCapabilities();
}

// --- Phase A5: capability_domains ---
const capDomPayload: Row[] = [];
let capDomSkipped = 0;
for (const r of capDoms) {
  const cid = capabilityId.get(r.capability_code);
  const did = domainId.get(r.domain_code);
  if (cid === undefined || did === undefined) { capDomSkipped++; continue; }
  if (existingCapDoms.has(capDomKey(cid, did))) continue;
  capDomPayload.push({ capability_id: cid, domain_id: did, notes: r.notes });
}
console.log(`Section A5 — capability_domains: ${capDoms.length} planned, ${capDomPayload.length} to insert, ${capDomSkipped} skipped (will resolve on apply).`);
if (capDomPayload.length > 0) await insert("/capability_domains", capDomPayload);

// --- Phase A6: solution_capabilities ---
const solCapPayload: Row[] = [];
let solCapSkipped = 0;
let solCapPlanned = 0;
for (const [solName, caps] of Object.entries(solCapMatrix)) {
  const sid = solutionId.get(solName);
  for (const t of caps) {
    solCapPlanned++;
    const [capCode, strength, notes] = t.length === 3 ? t : [t[0], t[1], ""] as [string, string, string];
    const cid = capabilityId.get(capCode);
    if (sid === undefined || cid === undefined) { solCapSkipped++; continue; }
    if (existingSolCaps.has(solCapKey(sid, cid))) continue;
    solCapPayload.push({ solution_id: sid, capability_id: cid, delivery_strength: strength, notes });
  }
}
console.log(`Section A6 — solution_capabilities: ${solCapPlanned} planned, ${solCapPayload.length} to insert, ${solCapSkipped} skipped (will resolve on apply).`);
if (solCapPayload.length > 0) await insert("/solution_capabilities", solCapPayload);

// --- Phase B1: data_objects ---
const missingDOs2 = newDataObjects.filter(d => !doId.has(d.data_object_name));
console.log(`Section B1 — data_objects: ${newDataObjects.length} planned, ${missingDOs2.length} to insert.`);
if (missingDOs2.length > 0) {
  await insert("/data_objects", missingDOs2);
  if (APPLY) await refreshDOs();
}

// --- Phase B2: domain_data_objects ---
const ddoPayload: Row[] = [];
let ddoSkipped = 0;
for (const r of newDdos) {
  const did = domainId.get(r.domain_code);
  const oid = doId.get(r.data_object_name);
  if (did === undefined || oid === undefined) { ddoSkipped++; continue; }
  if (existingDdos.has(ddoKey(did, oid, r.role))) continue;
  ddoPayload.push({ domain_id: did, data_object_id: oid, role: r.role, notes: r.notes });
}
console.log(`Section B2 — domain_data_objects: ${newDdos.length} planned, ${ddoPayload.length} to insert, ${ddoSkipped} skipped (will resolve on apply).`);
if (ddoPayload.length > 0) await insert("/domain_data_objects", ddoPayload);

// --- Phase B3: trigger_events ---
const tePayload: Row[] = [];
let teSkipped = 0;
for (const r of newTEs) {
  if (teId.has(r.event_name)) continue;
  const oid = doId.get(r.data_object_name);
  if (oid === undefined) { teSkipped++; continue; }
  tePayload.push({ event_name: r.event_name, data_object_id: oid, from_state: r.from_state, to_state: r.to_state, event_category: r.event_category, description: r.description });
}
console.log(`Section B3 — trigger_events: ${newTEs.length} planned, ${tePayload.length} to insert, ${teSkipped} skipped (will resolve on apply).`);
if (tePayload.length > 0) {
  await insert("/trigger_events", tePayload);
  if (APPLY) await refreshTEs();
}

// --- Phase B4: cross_domain_handoffs ---
const hoPayload: Row[] = [];
let hoSkipped = 0;
const skippedReasons: string[] = [];
for (const r of newHandoffs) {
  const sid = domainId.get(r.source_domain_code);
  const tid = domainId.get(r.target_domain_code);
  const eid = teId.get(r.event_name);
  const oid = doId.get(r.data_object_name);
  if (sid === undefined) { hoSkipped++; skippedReasons.push(`${r.event_name}: source ${r.source_domain_code} not in catalog`); continue; }
  if (tid === undefined) { hoSkipped++; skippedReasons.push(`${r.event_name}: target ${r.target_domain_code} not in catalog`); continue; }
  if (eid === undefined) { hoSkipped++; continue; }
  if (oid === undefined) { hoSkipped++; continue; }
  if (existingHandoffs.has(hoKey(sid, tid, eid, oid))) continue;
  hoPayload.push({ source_domain_id: sid, target_domain_id: tid, trigger_event_id: eid, data_object_id: oid, integration_pattern: r.integration_pattern, friction_level: r.friction_level, description: r.description });
}
console.log(`Section B4 — cross_domain_handoffs: ${newHandoffs.length} planned, ${hoPayload.length} to insert, ${hoSkipped} skipped.`);
if (skippedReasons.length > 0 && !APPLY) {
  const unique = [...new Set(skippedReasons)].slice(0, 10);
  for (const s of unique) console.log(`  [DRY skip] ${s}`);
}
if (hoPayload.length > 0) await insert("/cross_domain_handoffs", hoPayload);

console.log(`\nDone (${APPLY ? "live" : "dry run"}).`);
