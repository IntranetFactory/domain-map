#!/usr/bin/env bun
// Phase A loader for SKILLS-MGMT + TLNT-INTEL.
// Idempotent: each table is upserted by natural key (or composite key for junctions).
// Run from project root: bun run c:/dev/domain-map/.tmp_deploy/load_skills_tlnt_intel_phase_a.ts
//
// Scope: domains, vendors, solutions, solution_domains, capabilities, capability_domains,
//        domain_modules, domain_module_capabilities. NO data_objects, NO migrations, NO permissions.

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

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

async function syncTable<T extends Row>(
  path: string,
  rows: T[],
  keyField: keyof T & string,
): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=10000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new rows into ${path} (${existing.length} already present)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: ${existing.length} present, nothing to insert`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// Junction-table sync: dedupe by composite key (caller supplies keyer fn).
async function syncJunction(
  path: string,
  rows: Row[],
  keyer: (r: Row) => string,
  readPath: string, // path with select clause sufficient to compute keys on existing rows
): Promise<void> {
  const existing = await get(readPath);
  const existingKeys = new Set(existing.map(keyer));
  const missing = rows.filter(r => !existingKeys.has(keyer(r)));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new rows into ${path} (${existing.length} already present)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: ${existing.length} present (of ${rows.length} declared), nothing to insert`);
  }
}

// Rule #8 — every new domain must populate all seven business-metadata fields.
function validateDomainRow(d: Row): void {
  const code = d.domain_code;
  if (
    !Number.isFinite(d.crud_percentage) ||
    Number(d.crud_percentage) === 0 ||
    d.min_org_size === "" ||
    d.min_org_size == null ||
    d.cost_band === "" ||
    d.cost_band == null ||
    (d.business_logic === "" && Number(d.crud_percentage) < 95) ||
    Number(d.usa_market_size_usd_m) === 0 ||
    Number(d.market_size_source_year) === 0
  ) {
    throw new Error(`domain ${code} fails validateDomainRow (Rule #8): ${JSON.stringify(d, null, 2)}`);
  }
}

// ============================================================
// PHASE A.1 — Domains
// ============================================================

const domains = [
  {
    domain_code: "SKILLS-MGMT",
    domain_name: "Skills Management",
    description: "Substrate layer for the worker-skill graph: ingests skill signals from learning, performance, and recruiting; runs inference and gap analysis against curated taxonomies and competency models; serves a canonical skill profile per worker to downstream talent, planning, and intelligence consumers.",
    min_org_size: "30 m <2500",
    cost_band: "$$$$",
    crud_percentage: 60,
    certification_required: false,
    business_logic: "Maintains the worker-skill substrate that other HR domains read from and write to: ingests skill signals from learning, performance, and recruiting, runs inference and gap analysis against curated taxonomies and competency models, and serves a canonical skill profile per worker to downstream talent, planning, and intelligence consumers. Goes beyond CRUD by running inference pipelines and proficiency-rollup logic that recompute profile state when contributing signals change.",
    usa_market_size_usd_m: 1750,
    market_size_source_year: 2024,
  },
  {
    domain_code: "TLNT-INTEL",
    domain_name: "Talent Intelligence",
    description: "AI matching and recommendation layer that runs over skill profiles, roles, and opportunities to drive internal mobility, succession readiness, and skills-based hiring decisions. Owns the talent marketplace, the recommendation surfaces, and the audit trail of model inferences; defers person and skill mastership to HCM and SKILLS-MGMT.",
    min_org_size: "30 m <2500",
    cost_band: "$$$$$",
    crud_percentage: 50,
    certification_required: false,
    business_logic: "Runs continuous AI matching, scoring, and recommendation workflows over skill profiles, roles, and opportunities to drive internal mobility, succession readiness, and skills-based hiring decisions that pure CRUD HR systems cannot produce. Owns the marketplace, the recommendation surfaces, and the audit trail of model inferences, while deferring person and skill mastership to HCM and SKILLS-MGMT.",
    usa_market_size_usd_m: 1100,
    market_size_source_year: 2025,
  },
];

// ============================================================
// PHASE A.2 — Vendors (new only; existing reused by name lookup)
// ============================================================

const newVendors = [
  { vendor_name: "Lightcast", vendor_url: "https://lightcast.io", headquarters_country: "USA", description: "Open skills taxonomy and labor-market analytics, OEM ontology used by many HRIS skills clouds (formed by merger of Burning Glass and Emsi)." },
  { vendor_name: "TechWolf", vendor_url: "https://techwolf.com", headquarters_country: "Belgium", description: "Passive skill inference from collaboration data (email, calendar, tickets); API-first, no employee input required." },
  { vendor_name: "SkyHive", vendor_url: "https://skyhive.ai", headquarters_country: "Canada", description: "Real-time skills inference and external labor-market benchmarking; acquired by Cornerstone OnDemand 2024." },
  { vendor_name: "Reejig", vendor_url: "https://reejig.com", headquarters_country: "Australia", description: "Workforce intelligence platform with skills graph, opportunity marketplace, and ethical-AI positioning." },
  { vendor_name: "365Talents", vendor_url: "https://365talents.com", headquarters_country: "France", description: "European AI skills-management and internal opportunity marketplace platform." },
  { vendor_name: "Gloat", vendor_url: "https://gloat.com", headquarters_country: "USA", description: "Talent marketplace and Workforce Graph for skills-based gigs, roles, and mentorships." },
  { vendor_name: "Fuel50", vendor_url: "https://www.fuel50.com", headquarters_country: "New Zealand", description: "AI talent marketplace focused on internal mobility, gigs, and career pathing for mid-market and enterprise." },
  { vendor_name: "Beamery", vendor_url: "https://beamery.com", headquarters_country: "UK", description: "Talent lifecycle management and AI talent graph spanning external candidates and internal employees." },
  { vendor_name: "TalentGuard", vendor_url: "https://www.talentguard.com", headquarters_country: "USA", description: "Career pathing and competency-driven mobility for mid-market." },
  { vendor_name: "Neobrain", vendor_url: "https://neobrain.io", headquarters_country: "France", description: "AI skills and mobility platform for enterprise talent strategy." },
];

// ============================================================
// PHASE A.3 — Solutions (new only; uses vendor lookup map)
// ============================================================
// Format: vendor_name (must already exist or be in newVendors) + solution rows.
// `solution_kind` defaults to 'standard_solution' per the rule: only promote when tool_solutions
// rows will reference the solution. None of these are tool-source candidates yet.

type SolutionDraft = { solution_name: string; vendor_name: string; description: string };

const newSolutions: SolutionDraft[] = [
  // SKILLS-MGMT primaries (new pure-play vendors)
  { solution_name: "Lightcast Open Skills", vendor_name: "Lightcast", description: "Open skills taxonomy and labor-market signal feed; OEM ontology consumed by HRIS skills clouds." },
  { solution_name: "TechWolf Skills Engine", vendor_name: "TechWolf", description: "Passive skill inference engine consuming collaboration data without requiring employee self-input." },
  { solution_name: "SkyHive Quantum Labor Market", vendor_name: "SkyHive", description: "Real-time skills inference and external labor-market benchmarking; standalone product after Cornerstone acquisition." },
  { solution_name: "Reejig Workforce Intelligence", vendor_name: "Reejig", description: "Workforce graph with opportunity marketplace and ethical-AI matching; serves SKILLS-MGMT and TLNT-INTEL." },
  { solution_name: "365Talents Skills Platform", vendor_name: "365Talents", description: "European skills-management suite with declarative and inferred skill profiles." },
  { solution_name: "Fuel50 FuelSkills", vendor_name: "Fuel50", description: "Skills inference and competency-framework engine; Fuel50's skills layer beneath its talent marketplace." },

  // SKILLS-MGMT secondaries (suite-embedded skills clouds; created here, attributed to existing vendors)
  { solution_name: "Workday Skills Cloud", vendor_name: "Workday", description: "Suite-embedded skills foundation layer riding on Workday HCM; powers talent, learning, recruiting consumers within the suite." },
  { solution_name: "SAP SuccessFactors Talent Intelligence Hub", vendor_name: "SAP SE", description: "SuccessFactors-embedded skills hub with growth portfolio, talent intelligence, and skills inference." },
  { solution_name: "Cornerstone Skills Graph", vendor_name: "Cornerstone OnDemand", description: "Cornerstone-embedded skills ontology and inference engine, augmented by acquired SkyHive technology." },
  { solution_name: "Oracle Dynamic Skills", vendor_name: "Oracle", description: "Oracle Cloud HCM embedded skills engine with skills cloud and dynamic skill recommendations." },

  // TLNT-INTEL primaries (new pure-play vendors)
  { solution_name: "Gloat Workforce Agility Platform", vendor_name: "Gloat", description: "Talent marketplace and Workforce Graph for skills-based gigs, projects, full-time internal moves, and mentorships." },
  { solution_name: "Fuel50 Talent Marketplace", vendor_name: "Fuel50", description: "AI talent marketplace for internal mobility, gigs, mentorships, and career-path projection." },
  { solution_name: "Beamery Talent Lifecycle Management", vendor_name: "Beamery", description: "Talent CRM and AI talent graph spanning external candidates and internal employees with skills-based hiring assist." },
  { solution_name: "365Talents Skills + Mobility", vendor_name: "365Talents", description: "AI skills platform with internal opportunity marketplace and mobility recommendations." },
  { solution_name: "ServiceNow Talent Development", vendor_name: "ServiceNow Inc", description: "Skills-based mobility and project matching inside the Now Platform; built on the acquired Hitch Works engine." },

  // TLNT-INTEL secondaries
  { solution_name: "SAP SuccessFactors Opportunity Marketplace", vendor_name: "SAP SE", description: "SuccessFactors Career and Talent Development module for skills-based internal mobility, gigs, and career hub." },
  { solution_name: "TalentGuard Career Pathing", vendor_name: "TalentGuard", description: "Career-path and competency-driven mobility for mid-market." },
  { solution_name: "Neobrain Skills + Mobility", vendor_name: "Neobrain", description: "French AI skills and mobility platform for enterprise talent strategy." },
];

// ============================================================
// PHASE A.4 — solution_domains links
// ============================================================

type SolDomLink = { solution_name: string; domain_code: string; coverage_level: "primary" | "secondary" };

const solutionDomainLinks: SolDomLink[] = [
  // SKILLS-MGMT
  { solution_name: "Lightcast Open Skills", domain_code: "SKILLS-MGMT", coverage_level: "primary" },
  { solution_name: "TechWolf Skills Engine", domain_code: "SKILLS-MGMT", coverage_level: "primary" },
  { solution_name: "SkyHive Quantum Labor Market", domain_code: "SKILLS-MGMT", coverage_level: "primary" },
  { solution_name: "Reejig Workforce Intelligence", domain_code: "SKILLS-MGMT", coverage_level: "primary" },
  { solution_name: "365Talents Skills Platform", domain_code: "SKILLS-MGMT", coverage_level: "primary" },
  { solution_name: "Workday Skills Cloud", domain_code: "SKILLS-MGMT", coverage_level: "secondary" },
  { solution_name: "SAP SuccessFactors Talent Intelligence Hub", domain_code: "SKILLS-MGMT", coverage_level: "secondary" },
  { solution_name: "Cornerstone Skills Graph", domain_code: "SKILLS-MGMT", coverage_level: "secondary" },
  { solution_name: "Oracle Dynamic Skills", domain_code: "SKILLS-MGMT", coverage_level: "secondary" },
  { solution_name: "Eightfold Talent Intelligence Platform", domain_code: "SKILLS-MGMT", coverage_level: "secondary" },
  { solution_name: "Gloat Workforce Agility Platform", domain_code: "SKILLS-MGMT", coverage_level: "secondary" },
  { solution_name: "Fuel50 FuelSkills", domain_code: "SKILLS-MGMT", coverage_level: "secondary" },

  // TLNT-INTEL
  { solution_name: "Eightfold Talent Intelligence Platform", domain_code: "TLNT-INTEL", coverage_level: "primary" },
  { solution_name: "Workday HiredScore", domain_code: "TLNT-INTEL", coverage_level: "primary" },
  { solution_name: "Workday Talent Optimization", domain_code: "TLNT-INTEL", coverage_level: "secondary" },
  { solution_name: "Gloat Workforce Agility Platform", domain_code: "TLNT-INTEL", coverage_level: "primary" },
  { solution_name: "Fuel50 Talent Marketplace", domain_code: "TLNT-INTEL", coverage_level: "primary" },
  { solution_name: "Beamery Talent Lifecycle Management", domain_code: "TLNT-INTEL", coverage_level: "primary" },
  { solution_name: "365Talents Skills + Mobility", domain_code: "TLNT-INTEL", coverage_level: "primary" },
  { solution_name: "Reejig Workforce Intelligence", domain_code: "TLNT-INTEL", coverage_level: "primary" },
  { solution_name: "ServiceNow Talent Development", domain_code: "TLNT-INTEL", coverage_level: "primary" },
  { solution_name: "SAP SuccessFactors Opportunity Marketplace", domain_code: "TLNT-INTEL", coverage_level: "secondary" },
  { solution_name: "Oracle Dynamic Skills", domain_code: "TLNT-INTEL", coverage_level: "secondary" },
  { solution_name: "Phenom Intelligent Talent Experience", domain_code: "TLNT-INTEL", coverage_level: "secondary" },
  { solution_name: "TalentGuard Career Pathing", domain_code: "TLNT-INTEL", coverage_level: "secondary" },
  { solution_name: "Neobrain Skills + Mobility", domain_code: "TLNT-INTEL", coverage_level: "secondary" },
];

// ============================================================
// PHASE A.5 — Capabilities
// ============================================================

type CapabilityDraft = { capability_code: string; capability_name: string; description: string };

const capabilities: CapabilityDraft[] = [
  // SKILLS-MGMT (7)
  { capability_code: "SKILLS-MGMT-TAXONOMY", capability_name: "Skill Ontology Management", description: "Curate the skill universe, synonyms, hierarchies, and skill-to-job-role mappings." },
  { capability_code: "SKILLS-MGMT-COMPETENCY-MODELS", capability_name: "Competency Model Authoring", description: "Define role-anchored bundles of skills plus required proficiency levels, job-architecture adjacent." },
  { capability_code: "SKILLS-MGMT-INFERENCE", capability_name: "Skill Inference", description: "Derive worker skills from resumes, job history, completed learning, and work-activity signals." },
  { capability_code: "SKILLS-MGMT-ASSESSMENT", capability_name: "Skill Proficiency Assessment", description: "Self, manager, peer, and test-based proficiency rating against a defined scale." },
  { capability_code: "SKILLS-MGMT-GAP-ANALYSIS", capability_name: "Skill Gap Analysis", description: "Compare current workforce skill inventory against required-role profiles to surface shortages." },
  { capability_code: "SKILLS-MGMT-INVENTORY", capability_name: "Internal Skills Inventory and Heatmap", description: "Org-wide views of skill density, scarcity, and distribution by team, region, or job family." },
  { capability_code: "SKILLS-MGMT-VALIDATION", capability_name: "Peer and Manager Skill Validation", description: "Workflows for endorsing or contesting inferred or self-claimed skills." },

  // TLNT-INTEL (8)
  { capability_code: "TLNT-INTEL-MARKETPLACE", capability_name: "Internal Talent Marketplace Operation", description: "Posts gigs, projects, stretch roles, full-time openings; routes employees to them." },
  { capability_code: "TLNT-INTEL-MENTORSHIP-MATCHING", capability_name: "Mentorship Matching", description: "Matches mentees to mentors by skill, aspiration, and location." },
  { capability_code: "TLNT-INTEL-FIT-SCORING", capability_name: "Role-Candidate Fit Scoring", description: "AI-derived match score between a person's skill profile and a role's required skills." },
  { capability_code: "TLNT-INTEL-MOBILITY-RECS", capability_name: "Internal Mobility Recommendation", description: "Personalized recommendations of next moves for each employee." },
  { capability_code: "TLNT-INTEL-SUCCESSION-RANKING", capability_name: "Skills-Based Succession Ranking", description: "Ranks ready-now, ready-soon, ready-later candidates for critical roles." },
  { capability_code: "TLNT-INTEL-CAREER-PATHS", capability_name: "Career Path Projection", description: "Generates lateral, diagonal, and vertical pathways from current role to aspiration." },
  { capability_code: "TLNT-INTEL-SKILLS-HIRING", capability_name: "Skills-Based Hiring Assist", description: "Re-ranks external applicants by inferred skill fit; surfaces internal alternatives." },
  { capability_code: "TLNT-INTEL-SKILLS-HEATMAP", capability_name: "Workforce Skills Heatmap", description: "Org-level visualization of skill supply, demand, gaps, and risk." },
];

// capability_domains: every capability links to its semantic-home domain
const capabilityDomainLinks: Array<{ capability_code: string; domain_code: string }> = [
  ...capabilities.filter(c => c.capability_code.startsWith("SKILLS-MGMT-")).map(c => ({ capability_code: c.capability_code, domain_code: "SKILLS-MGMT" })),
  ...capabilities.filter(c => c.capability_code.startsWith("TLNT-INTEL-")).map(c => ({ capability_code: c.capability_code, domain_code: "TLNT-INTEL" })),
];

// ============================================================
// PHASE A.6 — Modules
// ============================================================

type ModuleDraft = { domain_module_code: string; domain_module_name: string; description: string; domain_code: string; module_kind: "full" };

const modules: ModuleDraft[] = [
  {
    domain_module_code: "SKILLS-MGMT-TAXONOMY",
    domain_module_name: "Skill Taxonomy and Competency Models",
    description: "Authors the skill ontology, the role-to-skill competency bundles, and the source-of-truth references that other modules consume.",
    domain_code: "SKILLS-MGMT",
    module_kind: "full",
  },
  {
    domain_module_code: "SKILLS-MGMT-PROFILE",
    domain_module_name: "Worker Skill Profiles and Assessments",
    description: "Maintains per-worker skill profiles, runs the inference pipeline, captures assessments and validations, and produces gap and inventory analytics.",
    domain_code: "SKILLS-MGMT",
    module_kind: "full",
  },
  {
    domain_module_code: "TLNT-INTEL-MARKETPLACE",
    domain_module_name: "Talent Marketplace",
    description: "Operates the internal opportunity marketplace: posting, matching, and applying across gigs, projects, full-time internal moves, and mentorships.",
    domain_code: "TLNT-INTEL",
    module_kind: "full",
  },
  {
    domain_module_code: "TLNT-INTEL-MOBILITY",
    domain_module_name: "Mobility, Succession and Fit",
    description: "AI recommendations, fit scores, succession ranking, career-path projection, and skills-based hiring assist.",
    domain_code: "TLNT-INTEL",
    module_kind: "full",
  },
  {
    domain_module_code: "TLNT-INTEL-INSIGHTS",
    domain_module_name: "Workforce Skills Insights",
    description: "Org-level skills heatmaps, gap and supply analytics for HR leaders.",
    domain_code: "TLNT-INTEL",
    module_kind: "full",
  },
];

// ============================================================
// PHASE A.7 — domain_module_capabilities (each capability realized by exactly one module)
// ============================================================

const moduleCapabilityLinks: Array<{ capability_code: string; domain_module_code: string }> = [
  // SKILLS-MGMT-TAXONOMY
  { capability_code: "SKILLS-MGMT-TAXONOMY", domain_module_code: "SKILLS-MGMT-TAXONOMY" },
  { capability_code: "SKILLS-MGMT-COMPETENCY-MODELS", domain_module_code: "SKILLS-MGMT-TAXONOMY" },
  // SKILLS-MGMT-PROFILE
  { capability_code: "SKILLS-MGMT-INFERENCE", domain_module_code: "SKILLS-MGMT-PROFILE" },
  { capability_code: "SKILLS-MGMT-ASSESSMENT", domain_module_code: "SKILLS-MGMT-PROFILE" },
  { capability_code: "SKILLS-MGMT-GAP-ANALYSIS", domain_module_code: "SKILLS-MGMT-PROFILE" },
  { capability_code: "SKILLS-MGMT-INVENTORY", domain_module_code: "SKILLS-MGMT-PROFILE" },
  { capability_code: "SKILLS-MGMT-VALIDATION", domain_module_code: "SKILLS-MGMT-PROFILE" },
  // TLNT-INTEL-MARKETPLACE
  { capability_code: "TLNT-INTEL-MARKETPLACE", domain_module_code: "TLNT-INTEL-MARKETPLACE" },
  { capability_code: "TLNT-INTEL-MENTORSHIP-MATCHING", domain_module_code: "TLNT-INTEL-MARKETPLACE" },
  // TLNT-INTEL-MOBILITY
  { capability_code: "TLNT-INTEL-FIT-SCORING", domain_module_code: "TLNT-INTEL-MOBILITY" },
  { capability_code: "TLNT-INTEL-MOBILITY-RECS", domain_module_code: "TLNT-INTEL-MOBILITY" },
  { capability_code: "TLNT-INTEL-SUCCESSION-RANKING", domain_module_code: "TLNT-INTEL-MOBILITY" },
  { capability_code: "TLNT-INTEL-CAREER-PATHS", domain_module_code: "TLNT-INTEL-MOBILITY" },
  { capability_code: "TLNT-INTEL-SKILLS-HIRING", domain_module_code: "TLNT-INTEL-MOBILITY" },
  // TLNT-INTEL-INSIGHTS
  { capability_code: "TLNT-INTEL-SKILLS-HEATMAP", domain_module_code: "TLNT-INTEL-INSIGHTS" },
];

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("Phase A loader: SKILLS-MGMT + TLNT-INTEL");
  console.log("=".repeat(60));

  // 1. Domains (with Rule #8 validation)
  console.log("\n[1/8] domains");
  for (const d of domains) validateDomainRow(d);
  const domainIds = await syncTable("/domains", domains, "domain_code");
  for (const d of domains) console.log(`  ${d.domain_code} -> id ${domainIds.get(d.domain_code)}`);

  // 2. Vendors
  console.log("\n[2/8] vendors");
  const vendorIds = await syncTable("/vendors", newVendors, "vendor_name");
  // Also load existing vendor ids we'll need for solution attribution.
  const allVendors = await get("/vendors?select=id,vendor_name&limit=10000");
  for (const v of allVendors) vendorIds.set(String(v.vendor_name), Number(v.id));

  // 3. Solutions (attribute to vendor_id)
  console.log("\n[3/8] solutions");
  const solutionRows = newSolutions.map(s => {
    const vid = vendorIds.get(s.vendor_name);
    if (!vid) throw new Error(`vendor ${s.vendor_name} not found for solution ${s.solution_name}`);
    return { solution_name: s.solution_name, vendor_id: vid, description: s.description };
  });
  const solutionIds = await syncTable("/solutions", solutionRows, "solution_name");
  // Also pull existing solutions we'll link (HiredScore, Talent Optimization, Eightfold TIP, Phenom).
  const allSolutions = await get("/solutions?select=id,solution_name&limit=10000");
  for (const s of allSolutions) solutionIds.set(String(s.solution_name), Number(s.id));

  // 4. solution_domains links
  console.log("\n[4/8] solution_domains");
  const sdRows: Row[] = solutionDomainLinks.map(l => {
    const sid = solutionIds.get(l.solution_name);
    const did = domainIds.get(l.domain_code);
    if (!sid) throw new Error(`solution ${l.solution_name} not resolved`);
    if (!did) throw new Error(`domain ${l.domain_code} not resolved`);
    return { solution_id: sid, domain_id: did, coverage_level: l.coverage_level };
  });
  await syncJunction(
    "/solution_domains",
    sdRows,
    r => `${r.solution_id}|${r.domain_id}`,
    "/solution_domains?select=solution_id,domain_id&limit=10000",
  );

  // 5. capabilities
  console.log("\n[5/8] capabilities");
  const capabilityIds = await syncTable("/capabilities", capabilities, "capability_code");

  // 6. capability_domains links
  console.log("\n[6/8] capability_domains");
  const cdRows: Row[] = capabilityDomainLinks.map(l => {
    const cid = capabilityIds.get(l.capability_code);
    const did = domainIds.get(l.domain_code);
    if (!cid) throw new Error(`capability ${l.capability_code} not resolved`);
    if (!did) throw new Error(`domain ${l.domain_code} not resolved`);
    return { capability_id: cid, domain_id: did };
  });
  await syncJunction(
    "/capability_domains",
    cdRows,
    r => `${r.capability_id}|${r.domain_id}`,
    "/capability_domains?select=capability_id,domain_id&limit=10000",
  );

  // 7. domain_modules
  console.log("\n[7/8] domain_modules");
  const moduleRows = modules.map(m => {
    const did = domainIds.get(m.domain_code);
    if (!did) throw new Error(`domain ${m.domain_code} not resolved for module ${m.domain_module_code}`);
    return {
      domain_module_code: m.domain_module_code,
      domain_module_name: m.domain_module_name,
      description: m.description,
      domain_id: did,
      module_kind: m.module_kind,
    };
  });
  const moduleIds = await syncTable("/domain_modules", moduleRows, "domain_module_code");

  // 8. domain_module_capabilities
  console.log("\n[8/8] domain_module_capabilities");
  const dmcRows: Row[] = moduleCapabilityLinks.map(l => {
    const cid = capabilityIds.get(l.capability_code);
    const mid = moduleIds.get(l.domain_module_code);
    if (!cid) throw new Error(`capability ${l.capability_code} not resolved for module ${l.domain_module_code}`);
    if (!mid) throw new Error(`module ${l.domain_module_code} not resolved`);
    return { capability_id: cid, domain_module_id: mid };
  });
  await syncJunction(
    "/domain_module_capabilities",
    dmcRows,
    r => `${r.capability_id}|${r.domain_module_id}`,
    "/domain_module_capabilities?select=capability_id,domain_module_id&limit=10000",
  );

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Summary:");
  console.log(`  domains:                       2 (SKILLS-MGMT, TLNT-INTEL)`);
  console.log(`  new vendors:                  ${newVendors.length}`);
  console.log(`  new solutions:                ${newSolutions.length}`);
  console.log(`  solution_domains links:       ${solutionDomainLinks.length}`);
  console.log(`  capabilities:                 ${capabilities.length}`);
  console.log(`  capability_domains links:     ${capabilityDomainLinks.length}`);
  console.log(`  domain_modules:               ${modules.length}`);
  console.log(`  domain_module_capabilities:   ${moduleCapabilityLinks.length}`);
  console.log("\nUI links for spot-check:");
  console.log("  https://tests.semantius.app/domain_map/domains");
  console.log("  https://tests.semantius.app/domain_map/vendors");
  console.log("  https://tests.semantius.app/domain_map/solutions");
  console.log("  https://tests.semantius.app/domain_map/solution_domains");
  console.log("  https://tests.semantius.app/domain_map/capabilities");
  console.log("  https://tests.semantius.app/domain_map/capability_domains");
  console.log("  https://tests.semantius.app/domain_map/domain_modules");
  console.log("  https://tests.semantius.app/domain_map/domain_module_capabilities");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
