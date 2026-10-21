#!/usr/bin/env bun
// Loads Agency Management Software (AGENCY-MGMT) — Phases A + B + C.
// Idempotent: reads by natural key, inserts missing, re-reads.

import { $ } from "bun";
$.throws(false);

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
  if (exitCode !== 0) throw new Error(`semantius failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (path: string) => call({ method: "GET", path });
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (!rows.length) return [];
  const CHUNK = 50, out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    out.push(...await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) }));
  }
  return out;
}
async function syncTable<T extends Row>(path: string, rows: T[], keyField: keyof T & string): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=10000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length) { console.log(`  + ${missing.length} new -> ${path}`); await insert(path, missing); }
  else console.log(`  ${path}: all present`);
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// Guard against rule #8: validate domains row before insert
function validateDomainRow(r: any): void {
  const ok =
    typeof r.crud_percentage === "number" && r.crud_percentage > 0 &&
    typeof r.min_org_size === "string" && r.min_org_size !== "" &&
    typeof r.cost_band === "string" && r.cost_band !== "" &&
    (r.business_logic !== "" || r.crud_percentage >= 95) &&
    typeof r.usa_market_size_usd_m === "number" && r.usa_market_size_usd_m > 0 &&
    typeof r.market_size_source_year === "number" && r.market_size_source_year > 0;
  if (!ok) throw new Error(`domains row missing required metadata: ${JSON.stringify(r)}`);
}

// ============================================================
// 1. INDUSTRY
// ============================================================
async function loadIndustry(): Promise<number> {
  const name = "Advertising and Marketing Agencies";
  const existing = await get(`/industries?industry_name=eq.${encodeURIComponent(name)}&select=id`);
  if (existing.length) { console.log(`  industry exists: ${name}`); return Number(existing[0].id); }
  console.log(`  + industry: ${name}`);
  const created = await insert("/industries", [{
    industry_name: name,
    parent_industry_id: 10,
    description: "Independent and holding-company advertising, marketing, creative, PR, media-buying, and digital agencies. Buyers of vertical agency-management software (Workamajig, Deltek WorkBook, Advantage, FunctionPoint, Mediaocean). Distinct from in-house marketing teams of non-agency businesses.",
  }]);
  return Number(created[0].id);
}

// ============================================================
// 2. DOMAIN
// ============================================================
async function loadDomain(industryId: number): Promise<number> {
  const code = "AGENCY-MGMT";
  const existing = await get(`/domains?domain_code=eq.${code}&select=id`);
  if (existing.length) { console.log(`  domain exists: ${code}`); return Number(existing[0].id); }
  const row = {
    domain_code: code,
    domain_name: "Agency Management Software",
    industry_id: industryId,
    description: "Vertical operations platform for advertising, marketing, creative, PR, and media agencies. Combines agency-specific job/traffic management, time tracking with client rate cards, retainer accounting with burn-down, media buying (plans + insertion orders + commission), creative review/proofing, multi-rate billing (cost-plus, retainer, T&M, fixed fee), and per-job profitability. Distinct from PSA (services/consulting firms — no media/retainer/commission semantics), from WORK-MGMT (horizontal, no client-billing or media-buying), and from DAM (asset library only).",
    crud_percentage: 75,
    business_logic: "Multi-rate billing (cost-plus, fixed fee, retainer burn-down, T&M); media commission and markup (typically 17.65% gross-up or 15% media commission); per-job profitability rollups across time, materials, and media; retainer draw-down and replenishment; project-based revenue recognition under ASC 606; multi-currency client and supplier reconciliation.",
    min_org_size: "20 s <500",
    cost_band: "$$",
    certification_required: false,
    usa_market_size_usd_m: 350,
    market_size_source_year: 2024,
  };
  validateDomainRow(row);
  console.log(`  + domain: ${code}`);
  const created = await insert("/domains", [row]);
  return Number(created[0].id);
}

// ============================================================
// 3. CAPABILITIES (new + reused)
// ============================================================
const NEW_CAPABILITIES = [
  { capability_code: "AGENCY-MGMT-JOBS", capability_name: "Agency Job and Traffic Management",
    description: "Central agency job (engagement) record with traffic state, brief linkage, deliverable rollup, assigned teams, deadlines, and status routing. The system-of-record for the agency's active book of business — distinct from PSA's project record by retainer linkage, creative-brief origination, and media-plan attachment." },
  { capability_code: "AGENCY-MGMT-RETAINER", capability_name: "Retainer Accounting and Burn-Down",
    description: "Recurring retainer agreements with monthly fee, allocated hours/scope, and live burn-down against time entries and media costs. Surfaces over-burn alerts, replenishment triggers, and end-of-period roll-forward / true-up. Distinct from subscription billing — retainer accounting tracks consumed work against a committed scope envelope, not invoiced units." },
  { capability_code: "AGENCY-MGMT-MEDIA-BUY", capability_name: "Media Plan and Insertion Order Management",
    description: "Per-campaign media plans broken down by outlet, daypart, audience, and budget; conversion of approved plans into insertion orders (IOs) to media outlets with negotiated rates, commission terms, and make-good provisions. Includes IO reconciliation against media-outlet invoices and post-campaign performance reporting." },
  { capability_code: "AGENCY-MGMT-ESTIMATE", capability_name: "Client Estimating and Change Orders",
    description: "Pre-engagement client estimates priced from rate cards, expected effort, and media/production cost lines with markup; conversion of approved estimates into agency jobs with locked billing terms; change-order workflow for scope creep with explicit client approval." },
  { capability_code: "AGENCY-MGMT-MARKUP", capability_name: "Cost-Plus and Markup Billing Logic",
    description: "Configurable markup rules per cost type (labour, media, third-party production, freelance) per client agreement. Includes commission gross-up (e.g., 17.65% on net media to yield 15% commission), markup ladders by client tier, and pass-through vs. marked-up cost designations on invoices." },
  { capability_code: "AGENCY-MGMT-PROFITABILITY", capability_name: "Per-Job and Per-Client Profitability Analysis",
    description: "Live per-job and per-client margin rollups combining time costs (hours × loaded employee rate), media costs, third-party production, and overhead allocation against billable revenue. Surfaces under-water jobs, top-client margin, and discipline-level profitability for staffing and pricing decisions." },
  { capability_code: "CREATIVE-REVIEW", capability_name: "Creative Proofing and Approval",
    description: "Cross-cutting capability: multi-stakeholder review and annotation of creative deliverables (images, video, copy, layouts) with version history, approval routing, mark-up tools, and audit trail. Spans agency mgmt, work mgmt, and DAM markets. Pure-plays: Ziflow, ProofHub, Filestage; embedded in Workfront, Wrike, Frame.io." },
];

// Cross-cutting capabilities to extend into AGENCY-MGMT via capability_domains
const EXTEND_CROSS_CUTTING = [
  { code: "TIME-TRACKING", notes: "Agency time tracking with client rate-card lookup, billable/non-billable/agency-overhead coding, and per-job + per-deliverable attribution. Cross-cutting capability also delivered by WFM, PSA, MSP, Legal-Time-Billing, Accounting-Time-Billing." },
  { code: "RATE-MGMT", notes: "Per-client, per-discipline, per-role rate cards with effective-dating, override hierarchy, and currency. Same capability shape as PSA and consulting verticals." },
  { code: "RESOURCE-PLAN", notes: "Discipline-based resource planning across creative, strategy, account, and media teams; capacity vs. demand by week; freelancer pool augmentation." },
  { code: "BILLING-PROJ", notes: "Project billing for agency engagements with cost-plus, T&M, fixed-fee, and retainer-draw variants on a single invoice; WIP tracking and revenue recognition." },
];

async function loadCapabilities(domainId: number): Promise<Map<string, number>> {
  const capMap = await syncTable("/capabilities", NEW_CAPABILITIES, "capability_code");
  // capability_domains: link new + cross-cutting capabilities to AGENCY-MGMT
  const existingCD = await get(`/capability_domains?domain_id=eq.${domainId}&select=capability_id`);
  const haveCapIds = new Set(existingCD.map(r => Number(r.capability_id)));

  // Resolve cross-cutting cap IDs
  const crossCutting = await get(`/capabilities?capability_code=in.(${EXTEND_CROSS_CUTTING.map(c => c.code).join(",")})&select=id,capability_code`);
  const codeToId = new Map(crossCutting.map(r => [String(r.capability_code), Number(r.id)]));

  const cdRows: Row[] = [];
  for (const c of NEW_CAPABILITIES) {
    const cid = capMap.get(c.capability_code)!;
    if (!haveCapIds.has(cid)) {
      cdRows.push({ domain_id: domainId, capability_id: cid, notes: `${c.capability_name} — semantic home for AGENCY-MGMT.` });
    }
  }
  for (const cc of EXTEND_CROSS_CUTTING) {
    const cid = codeToId.get(cc.code);
    if (!cid) { console.warn(`  ! cross-cutting capability ${cc.code} not found`); continue; }
    if (!haveCapIds.has(cid)) {
      cdRows.push({ domain_id: domainId, capability_id: cid, notes: cc.notes });
    }
  }
  if (cdRows.length) {
    console.log(`  + ${cdRows.length} capability_domains rows`);
    await insert("/capability_domains", cdRows);
  } else console.log(`  capability_domains: all present`);

  // Also extend CREATIVE-REVIEW to WORK-MGMT and DAM
  const crCapId = capMap.get("CREATIVE-REVIEW")!;
  const targets = await get(`/domains?domain_code=in.(WORK-MGMT,DAM)&select=id,domain_code`);
  for (const t of targets) {
    const existing = await get(`/capability_domains?capability_id=eq.${crCapId}&domain_id=eq.${t.id}&select=id`);
    if (!existing.length) {
      console.log(`  + capability_domains: CREATIVE-REVIEW -> ${t.domain_code}`);
      await insert("/capability_domains", [{ domain_id: Number(t.id), capability_id: crCapId, notes: `CREATIVE-REVIEW cross-cutting into ${t.domain_code}.` }]);
    }
  }

  return capMap;
}

// ============================================================
// 4. VENDORS
// ============================================================
const NEW_VENDORS = [
  { vendor_name: "Workamajig", description: "US agency-management software vendor (Workamajig LLC). Flagship Workamajig Platinum." },
  { vendor_name: "Advantage Software", description: "Heritage US agency-management software vendor (Advantage Software Inc). Flagship Advantage; deep agency-finance lineage." },
  { vendor_name: "Function Point Productivity Software", description: "Canadian agency-management vendor (Function Point Productivity Software Inc). Flagship Function Point." },
  { vendor_name: "Mediaocean", description: "US media-financial-software vendor (Mediaocean LLC). Flagship Spectra/Prisma for media planning, buying, and billing." },
  { vendor_name: "ProActive Software", description: "New Zealand-based vendor (ProActive Software Ltd). Flagship ProWorkflow project mgmt for agencies and creative teams." },
  { vendor_name: "Magnetic HQ", description: "South-African / US agency-management vendor. Flagship Magnetic for SMB creative agencies." },
  { vendor_name: "Forecast.app", description: "Danish AI-powered project-management vendor (Forecast Apps ApS). Used by agencies and services firms for capacity planning and time tracking." },
];

// ============================================================
// 5. SOLUTIONS
// ============================================================
type SolDraft = {
  solution_name: string;
  vendor: string; // vendor_name
  description: string;
  coverage: "primary" | "secondary" | "partial";
  cost_band?: string;
  min_org_size?: string;
};
const SOLUTIONS: SolDraft[] = [
  { solution_name: "Workamajig Platinum", vendor: "Workamajig", coverage: "primary",
    description: "Flagship US agency-management suite — project management, time tracking, resource planning, traffic, estimating, retainers, and full agency accounting (GL, A/R, A/P, billing) in one product. Popular with mid-size US ad/marketing/creative agencies (50–500 staff).",
    cost_band: "$$", min_org_size: "20 s <500" },
  { solution_name: "Deltek WorkBook", vendor: "Deltek", coverage: "primary",
    description: "Pure-play agency-management suite acquired by Deltek from Danish vendor WorkBook in 2017. Project management, traffic, time, resource planning, finance, and CRM for creative/marketing agencies. Strong in Europe.",
    cost_band: "$$$", min_org_size: "20 s <500" },
  { solution_name: "Advantage", vendor: "Advantage Software", coverage: "primary",
    description: "Heritage US agency-management platform with deep finance lineage (AS/400 origins, since 1980s). Used by larger US agencies (200–2000 staff) for production, traffic, media, billing, and GL. Modern web UI on top of mature financials.",
    cost_band: "$$$", min_org_size: "30 m <2500" },
  { solution_name: "Function Point", vendor: "Function Point Productivity Software", coverage: "primary",
    description: "Cloud agency-management suite for small/mid creative agencies. Project management, estimating, time tracking, billing, and reporting. Canadian vendor; common in North-American SMB agencies.",
    cost_band: "$$", min_org_size: "20 s <500" },
  { solution_name: "Mediaocean Spectra/Prisma", vendor: "Mediaocean", coverage: "secondary",
    description: "Spectra (agency-finance) and Prisma (media planning/buying) — Mediaocean's flagship suite for media agencies and holding companies. Covers media-buying side strongly; lighter on creative job management and retainer accounting.",
    cost_band: "$$$$", min_org_size: "40 l <10000" },
  { solution_name: "ProWorkflow", vendor: "ProActive Software", coverage: "partial",
    description: "Project- and task-management for creative teams and SMB agencies. Includes time tracking and basic invoicing. Lighter on agency-specific accounting (no full GL, no retainer burn-down).",
    cost_band: "$", min_org_size: "10 xs <50" },
  { solution_name: "Magnetic", vendor: "Magnetic HQ", coverage: "partial",
    description: "End-to-end agency platform for SMB creative agencies — CRM, project management, time, billing, and accounting. Strong in South-African and EMEA markets.",
    cost_band: "$$", min_org_size: "10 xs <50" },
  { solution_name: "Forecast", vendor: "Forecast.app", coverage: "partial",
    description: "AI-powered project management with capacity planning and time tracking; used by digital agencies and services firms. Lighter on agency-specific billing semantics (retainer burn-down, media commission) than purpose-built suites.",
    cost_band: "$$", min_org_size: "20 s <500" },
  { solution_name: "Scoro", vendor: "Scoro", coverage: "secondary",
    description: "End-to-end work-management suite popular with agencies and professional-services firms. Project management, quoting, time tracking, billing, and reporting. Estonian-rooted vendor; horizontal but agency-friendly.",
    cost_band: "$$", min_org_size: "10 xs <50" },
  { solution_name: "Aprimo Marketing Productivity", vendor: "Aprimo", coverage: "secondary",
    description: "Aprimo's marketing-operations and financial-management module — marketing-spend, plan tracking, content production workflow. Enterprise-marketing focus; overlaps agency mgmt at the marketing-ops layer rather than agency-finance.",
    cost_band: "$$$$", min_org_size: "40 l <10000" },
];

async function loadVendorsAndSolutions(): Promise<{ vendorMap: Map<string, number>; solMap: Map<string, number> }> {
  // existing vendors check + insert
  const allVendorNames = Array.from(new Set([
    ...NEW_VENDORS.map(v => v.vendor_name),
    "Deltek", "Aprimo", "Scoro", "Adobe",
  ]));
  const existingVendors = await get(`/vendors?vendor_name=in.(${allVendorNames.map(n => `"${n}"`).join(",")})&select=id,vendor_name`);
  const haveVendorNames = new Set(existingVendors.map(r => String(r.vendor_name)));
  const missingVendors = NEW_VENDORS.filter(v => !haveVendorNames.has(v.vendor_name));
  if (missingVendors.length) { console.log(`  + ${missingVendors.length} vendors`); await insert("/vendors", missingVendors); }
  const refreshed = await get(`/vendors?vendor_name=in.(${allVendorNames.map(n => `"${n}"`).join(",")})&select=id,vendor_name`);
  const vendorMap = new Map(refreshed.map(r => [String(r.vendor_name), Number(r.id)]));

  // solutions
  const existingSols = await get(`/solutions?solution_name=in.(${SOLUTIONS.map(s => `"${s.solution_name}"`).join(",")})&select=id,solution_name`);
  const haveSolNames = new Set(existingSols.map(r => String(r.solution_name)));
  const missingSols = SOLUTIONS.filter(s => !haveSolNames.has(s.solution_name)).map(s => ({
    solution_name: s.solution_name,
    vendor_id: vendorMap.get(s.vendor)!,
    description: s.description,
    cost_band: s.cost_band,
    min_org_size: s.min_org_size,
    is_active_in_market: true,
  }));
  if (missingSols.length) { console.log(`  + ${missingSols.length} solutions`); await insert("/solutions", missingSols); }
  const refreshedSols = await get(`/solutions?solution_name=in.(${SOLUTIONS.map(s => `"${s.solution_name}"`).join(",")})&select=id,solution_name`);
  const solMap = new Map(refreshedSols.map(r => [String(r.solution_name), Number(r.id)]));
  return { vendorMap, solMap };
}

async function loadSolutionDomains(domainId: number, solMap: Map<string, number>): Promise<void> {
  const existing = await get(`/solution_domains?domain_id=eq.${domainId}&select=solution_id`);
  const haveSolIds = new Set(existing.map(r => Number(r.solution_id)));
  const rows = SOLUTIONS
    .filter(s => !haveSolIds.has(solMap.get(s.solution_name)!))
    .map(s => ({
      solution_id: solMap.get(s.solution_name)!,
      domain_id: domainId,
      coverage_level: s.coverage,
    }));
  if (rows.length) { console.log(`  + ${rows.length} solution_domains`); await insert("/solution_domains", rows); }
  else console.log(`  solution_domains: all present`);
}

// solution_capabilities matrix (11 solutions × 11 capabilities)
// keys: solution_name | capability_code -> delivery_strength
const MATRIX: Record<string, Record<string, "native" | "partial" | "via_extension" | "not_supported">> = {
  "Workamajig Platinum": {
    "AGENCY-MGMT-JOBS": "native", "AGENCY-MGMT-RETAINER": "native", "AGENCY-MGMT-MEDIA-BUY": "native",
    "AGENCY-MGMT-ESTIMATE": "native", "AGENCY-MGMT-MARKUP": "native", "AGENCY-MGMT-PROFITABILITY": "native",
    "CREATIVE-REVIEW": "native", "TIME-TRACKING": "native", "RATE-MGMT": "native", "RESOURCE-PLAN": "native", "BILLING-PROJ": "native",
  },
  "Deltek WorkBook": {
    "AGENCY-MGMT-JOBS": "native", "AGENCY-MGMT-RETAINER": "native", "AGENCY-MGMT-MEDIA-BUY": "partial",
    "AGENCY-MGMT-ESTIMATE": "native", "AGENCY-MGMT-MARKUP": "native", "AGENCY-MGMT-PROFITABILITY": "native",
    "CREATIVE-REVIEW": "partial", "TIME-TRACKING": "native", "RATE-MGMT": "native", "RESOURCE-PLAN": "native", "BILLING-PROJ": "native",
  },
  "Advantage": {
    "AGENCY-MGMT-JOBS": "native", "AGENCY-MGMT-RETAINER": "native", "AGENCY-MGMT-MEDIA-BUY": "native",
    "AGENCY-MGMT-ESTIMATE": "native", "AGENCY-MGMT-MARKUP": "native", "AGENCY-MGMT-PROFITABILITY": "native",
    "CREATIVE-REVIEW": "partial", "TIME-TRACKING": "native", "RATE-MGMT": "native", "RESOURCE-PLAN": "native", "BILLING-PROJ": "native",
  },
  "Function Point": {
    "AGENCY-MGMT-JOBS": "native", "AGENCY-MGMT-RETAINER": "partial", "AGENCY-MGMT-MEDIA-BUY": "not_supported",
    "AGENCY-MGMT-ESTIMATE": "native", "AGENCY-MGMT-MARKUP": "native", "AGENCY-MGMT-PROFITABILITY": "native",
    "CREATIVE-REVIEW": "via_extension", "TIME-TRACKING": "native", "RATE-MGMT": "native", "RESOURCE-PLAN": "native", "BILLING-PROJ": "native",
  },
  "Mediaocean Spectra/Prisma": {
    "AGENCY-MGMT-JOBS": "partial", "AGENCY-MGMT-RETAINER": "partial", "AGENCY-MGMT-MEDIA-BUY": "native",
    "AGENCY-MGMT-ESTIMATE": "partial", "AGENCY-MGMT-MARKUP": "native", "AGENCY-MGMT-PROFITABILITY": "partial",
    "CREATIVE-REVIEW": "not_supported", "TIME-TRACKING": "partial", "RATE-MGMT": "native", "RESOURCE-PLAN": "not_supported", "BILLING-PROJ": "native",
  },
  "ProWorkflow": {
    "AGENCY-MGMT-JOBS": "partial", "AGENCY-MGMT-RETAINER": "not_supported", "AGENCY-MGMT-MEDIA-BUY": "not_supported",
    "AGENCY-MGMT-ESTIMATE": "partial", "AGENCY-MGMT-MARKUP": "not_supported", "AGENCY-MGMT-PROFITABILITY": "partial",
    "CREATIVE-REVIEW": "via_extension", "TIME-TRACKING": "native", "RATE-MGMT": "partial", "RESOURCE-PLAN": "partial", "BILLING-PROJ": "partial",
  },
  "Magnetic": {
    "AGENCY-MGMT-JOBS": "native", "AGENCY-MGMT-RETAINER": "partial", "AGENCY-MGMT-MEDIA-BUY": "partial",
    "AGENCY-MGMT-ESTIMATE": "native", "AGENCY-MGMT-MARKUP": "partial", "AGENCY-MGMT-PROFITABILITY": "partial",
    "CREATIVE-REVIEW": "partial", "TIME-TRACKING": "native", "RATE-MGMT": "native", "RESOURCE-PLAN": "partial", "BILLING-PROJ": "native",
  },
  "Forecast": {
    "AGENCY-MGMT-JOBS": "partial", "AGENCY-MGMT-RETAINER": "not_supported", "AGENCY-MGMT-MEDIA-BUY": "not_supported",
    "AGENCY-MGMT-ESTIMATE": "partial", "AGENCY-MGMT-MARKUP": "not_supported", "AGENCY-MGMT-PROFITABILITY": "partial",
    "CREATIVE-REVIEW": "not_supported", "TIME-TRACKING": "native", "RATE-MGMT": "partial", "RESOURCE-PLAN": "native", "BILLING-PROJ": "partial",
  },
  "Scoro": {
    "AGENCY-MGMT-JOBS": "partial", "AGENCY-MGMT-RETAINER": "partial", "AGENCY-MGMT-MEDIA-BUY": "not_supported",
    "AGENCY-MGMT-ESTIMATE": "native", "AGENCY-MGMT-MARKUP": "partial", "AGENCY-MGMT-PROFITABILITY": "native",
    "CREATIVE-REVIEW": "not_supported", "TIME-TRACKING": "native", "RATE-MGMT": "native", "RESOURCE-PLAN": "native", "BILLING-PROJ": "native",
  },
  "Aprimo Marketing Productivity": {
    "AGENCY-MGMT-JOBS": "partial", "AGENCY-MGMT-RETAINER": "not_supported", "AGENCY-MGMT-MEDIA-BUY": "partial",
    "AGENCY-MGMT-ESTIMATE": "partial", "AGENCY-MGMT-MARKUP": "not_supported", "AGENCY-MGMT-PROFITABILITY": "partial",
    "CREATIVE-REVIEW": "native", "TIME-TRACKING": "not_supported", "RATE-MGMT": "not_supported", "RESOURCE-PLAN": "partial", "BILLING-PROJ": "not_supported",
  },
  "Adobe Workfront": {
    "AGENCY-MGMT-JOBS": "partial", "AGENCY-MGMT-RETAINER": "not_supported", "AGENCY-MGMT-MEDIA-BUY": "not_supported",
    "AGENCY-MGMT-ESTIMATE": "partial", "AGENCY-MGMT-MARKUP": "not_supported", "AGENCY-MGMT-PROFITABILITY": "partial",
    "CREATIVE-REVIEW": "native", "TIME-TRACKING": "native", "RATE-MGMT": "partial", "RESOURCE-PLAN": "native", "BILLING-PROJ": "not_supported",
  },
};

async function loadSolutionCapabilities(solMap: Map<string, number>, capMap: Map<string, number>): Promise<void> {
  // also resolve cross-cutting + Adobe Workfront IDs
  const ccCodes = ["TIME-TRACKING", "RATE-MGMT", "RESOURCE-PLAN", "BILLING-PROJ"];
  const ccCaps = await get(`/capabilities?capability_code=in.(${ccCodes.join(",")})&select=id,capability_code`);
  for (const c of ccCaps) capMap.set(String(c.capability_code), Number(c.id));
  const wfSol = await get(`/solutions?solution_name=eq.Adobe%20Workfront&select=id`);
  if (wfSol.length) solMap.set("Adobe Workfront", Number(wfSol[0].id));

  // existing rows for these (solution, capability) combos
  const solIds = Array.from(new Set(Object.keys(MATRIX).map(s => solMap.get(s)).filter((v): v is number => typeof v === "number")));
  const capIds = Array.from(new Set(Object.values(MATRIX).flatMap(m => Object.keys(m)).map(c => capMap.get(c)).filter((v): v is number => typeof v === "number")));
  const existing = await get(`/solution_capabilities?solution_id=in.(${solIds.join(",")})&capability_id=in.(${capIds.join(",")})&select=solution_id,capability_id`);
  const haveKey = new Set(existing.map(r => `${r.solution_id}|${r.capability_id}`));

  const rows: Row[] = [];
  for (const [solName, capStrengths] of Object.entries(MATRIX)) {
    const sid = solMap.get(solName);
    if (!sid) { console.warn(`  ! solution ${solName} missing`); continue; }
    for (const [capCode, strength] of Object.entries(capStrengths)) {
      const cid = capMap.get(capCode);
      if (!cid) { console.warn(`  ! capability ${capCode} missing`); continue; }
      if (haveKey.has(`${sid}|${cid}`)) continue;
      rows.push({ solution_id: sid, capability_id: cid, delivery_strength: strength });
    }
  }
  if (rows.length) { console.log(`  + ${rows.length} solution_capabilities`); await insert("/solution_capabilities", rows); }
  else console.log(`  solution_capabilities: all present`);
}

// ============================================================
// 6. PHASE B — data_objects, domain_data_objects, trigger_events, cross_domain_handoffs
// ============================================================
const NEW_DATA_OBJECTS = [
  { data_object_name: "agency_jobs", singular_label: "Agency Job", plural_label: "Agency Jobs", display_label: "Agency Job",
    description: "Central engagement record for an agency client — the unit of billable work. Carries client, brief, deliverables, traffic state, retainer link (if any), assigned team, and rolled-up financials. Distinct from PSA `projects` by retainer linkage, creative-brief origination, and media-plan attachment." },
  { data_object_name: "agency_time_entries", singular_label: "Agency Time Entry", plural_label: "Agency Time Entries", display_label: "Agency Time Entry",
    description: "Time logged against an agency_job + task + deliverable by an employee or freelancer, with client-rate-card application, billable/non-billable/agency-overhead coding, and discipline tagging (strategy, design, account, production). Follows the `msp_time_entries` precedent for vertical-specific time data." },
  { data_object_name: "retainers", singular_label: "Retainer", plural_label: "Retainers", display_label: "Retainer",
    description: "Recurring fee agreement with a client — monthly amount, included scope (hours or deliverables), period, and live burn-down against logged time + costs. Surfaces over-burn alerts, replenishment triggers, and period roll-forward." },
  { data_object_name: "media_plans", singular_label: "Media Plan", plural_label: "Media Plans", display_label: "Media Plan",
    description: "Per-campaign media-buying plan broken down by outlet, channel, daypart, audience, flight dates, and budget allocation. Approved media plans convert into insertion_orders." },
  { data_object_name: "insertion_orders", singular_label: "Insertion Order", plural_label: "Insertion Orders", display_label: "Insertion Order",
    description: "Purchase order from the agency to a specific media outlet (publisher, broadcaster, platform) committing budget at negotiated rates with commission terms and make-good provisions. Reconciled against the media outlet's invoice." },
  { data_object_name: "creative_briefs", singular_label: "Creative Brief", plural_label: "Creative Briefs", display_label: "Creative Brief",
    description: "Initiating document for a creative job — client objective, audience, key message, mandatories, deliverable list, deadlines, and budget. Authored by account/strategy, approved by client, drives creative-team scoping." },
  { data_object_name: "creative_deliverables", singular_label: "Creative Deliverable", plural_label: "Creative Deliverables", display_label: "Creative Deliverable",
    description: "Asset under production within an agency_job — an image, video, layout, copy doc, or campaign element with version history and proofing/approval state. Final approved versions register in DAM." },
  { data_object_name: "agency_estimates", singular_label: "Agency Estimate", plural_label: "Agency Estimates", display_label: "Agency Estimate",
    description: "Pre-engagement client estimate priced from rate cards, expected effort, and media/production cost lines with markup. Approval converts the estimate into an agency_job with locked billing terms." },
];

const CONSUMER_DATA_OBJECTS: { name: string; role: "consumer" | "contributor"; notes: string }[] = [
  { name: "customers", role: "consumer", notes: "AGENCY-MGMT consumes customers (CDP/CRM-mastered) as the agency client list — the buyer side of every agency_job, retainer, and invoice." },
  { name: "employees", role: "consumer", notes: "AGENCY-MGMT consumes employees (HCM-mastered) as the resourceable agency staff pool — assigned to jobs, logging time at loaded billing rates." },
  { name: "contracts", role: "consumer", notes: "AGENCY-MGMT consumes contracts (CLM-mastered) — Master Services Agreements and signed SOWs that seed billing terms, scope, and rate cards on agency_jobs." },
  { name: "opportunities", role: "consumer", notes: "AGENCY-MGMT consumes won opportunities (CRM-mastered) as the trigger to spin up an agency_job and request scope finalisation." },
  { name: "suppliers", role: "consumer", notes: "AGENCY-MGMT consumes suppliers (S2P-mastered) — media outlets, freelancers, production houses billed against insertion_orders and job costs." },
];

const TRIGGER_EVENTS = [
  { event_name: "opportunity.won", data_object: "opportunities", from_state: "open", to_state: "won",
    event_category: "lifecycle",
    description: "An agency new-business opportunity reaches Closed Won in CRM, triggering downstream job spin-up in AGENCY-MGMT." },
  { event_name: "contract.signed", data_object: "contracts", from_state: "pending", to_state: "signed",
    event_category: "lifecycle",
    description: "A client SOW / MSA is fully executed in CLM, seeding billing rules and scope on the agency_job." },
  { event_name: "estimate.approved", data_object: "agency_estimates", from_state: "pending", to_state: "approved",
    event_category: "lifecycle",
    description: "Client signs off on an agency estimate; agency converts it into a binding SOW in CLM and a kicked-off job." },
  { event_name: "deliverable.approved", data_object: "creative_deliverables", from_state: "in_review", to_state: "approved",
    event_category: "lifecycle",
    description: "All client and internal reviewers have approved the final version of a creative deliverable; ready to register in DAM as the canonical brand asset." },
  { event_name: "agency_invoice.issued", data_object: "agency_jobs", from_state: "wip", to_state: "billed",
    event_category: "state_change",
    description: "An agency-issued client invoice (combining time, materials, media, markup) is finalised; AR booking in ERP-FIN." },
  { event_name: "media_costs.posted", data_object: "insertion_orders", from_state: "open", to_state: "reconciled",
    event_category: "state_change",
    description: "Media costs are reconciled and posted to the GL — covering net media spend, agency commission, and currency conversion. Period-cycle-close coupling against ERP-FIN." },
  { event_name: "vendor_invoice.received", data_object: "insertion_orders", from_state: "open", to_state: "matched",
    event_category: "state_change",
    description: "Media-outlet or freelancer invoice arrives via S2P; matched against the originating insertion_order with quantity and rate reconciliation." },
  { event_name: "employee.terminated", data_object: "employees", from_state: "active", to_state: "terminated",
    event_category: "lifecycle",
    description: "Agency staff member is terminated in HCM; open job assignments need reassignment, retainer burn-down adjustment, and access removal." },
];

type HandoffDraft = {
  source: string; target: string; trigger_event: string;
  data_object: string; integration_pattern: string; friction: string; description: string; notes: string;
};
const HANDOFFS: HandoffDraft[] = [
  { source: "CRM", target: "AGENCY-MGMT", trigger_event: "opportunity.won", data_object: "agency_jobs",
    integration_pattern: "api_call", friction: "medium",
    description: "When an agency wins new business in CRM, AGENCY-MGMT needs to spin up an agency_job with the client, scope, billing terms, and a placeholder team. The handoff translates sales-side opportunity attributes (forecast value, close date) into delivery-side job attributes (scope, brief, rate plan).",
    notes: "Friction shape: scope translation — sales-stage scope rarely matches the level of detail an agency_job needs (deliverable list, rate card, retainer linkage). Often requires a kick-off meeting to finalise." },
  { source: "CLM", target: "AGENCY-MGMT", trigger_event: "contract.signed", data_object: "agency_jobs",
    integration_pattern: "api_call", friction: "medium",
    description: "Signed SOW or MSA from CLM seeds billing rules, rate card, scope envelope, and SLA terms onto the agency_job. Subsequent change orders also flow this way.",
    notes: "Friction shape: identifier reconciliation — CLM SOW ID needs to map to the agency_job ID, and signing-party data needs to match the client record." },
  { source: "AGENCY-MGMT", target: "CLM", trigger_event: "estimate.approved", data_object: "contracts",
    integration_pattern: "api_call", friction: "medium",
    description: "Client-approved estimate must be converted into a signed SOW in CLM before delivery can start. Includes line-item scope, billing terms, deliverable schedule, and approval routing.",
    notes: "Friction shape: alert/escalation without feedback loop — estimate approval doesn't auto-create the SOW; CLM-side delays block delivery start." },
  { source: "AGENCY-MGMT", target: "DAM", trigger_event: "deliverable.approved", data_object: "creative_deliverables",
    integration_pattern: "api_call", friction: "medium",
    description: "Final-approved creative deliverable registers in DAM as the canonical brand asset with metadata (client, campaign, agency_job, usage rights, expiry). Surfaces in DAM search for future reuse.",
    notes: "Friction shape: cross-vendor stack — agency mgmt and DAM are usually different vendors; manual metadata enrichment is common before the asset is genuinely findable." },
  { source: "AGENCY-MGMT", target: "ERP-FIN", trigger_event: "agency_invoice.issued", data_object: "agency_jobs",
    integration_pattern: "batch_sync", friction: "medium",
    description: "Agency client invoice (time + materials + media + markup) posts to ERP-FIN AR for cash collection and revenue recognition. Multi-line invoice with retainer-draw, T&M, and media-pass-through components.",
    notes: "Friction shape: identifier reconciliation — agency_job → ERP-FIN project / cost-centre mapping is often manual. Sub-ledger detail (commission, markup) frequently collapses in the GL view." },
  { source: "AGENCY-MGMT", target: "ERP-FIN", trigger_event: "media_costs.posted", data_object: "insertion_orders",
    integration_pattern: "batch_sync", friction: "high",
    description: "Media costs (net + commission + markup) post from agency mgmt to ERP-FIN GL at period close. Multi-currency, multi-outlet, with commission gross-up and pass-through-vs-billable splits.",
    notes: "Friction shape: period/cycle-close coupling + cross-vendor stack — period close blocks if media reconciliation is incomplete; backdated outlet invoices arriving post-close cascade adjustments." },
  { source: "S2P", target: "AGENCY-MGMT", trigger_event: "vendor_invoice.received", data_object: "insertion_orders",
    integration_pattern: "api_call", friction: "high",
    description: "Media-outlet or freelancer invoice arrives via S2P and needs three-way match against the originating insertion_order (quantity, rate, make-good provisions) before booking against the job for cost-plus billing.",
    notes: "Friction shape: cross-vendor stack — media-outlet invoicing is notoriously inconsistent (rate variances, make-good adjustments, late arrivals). Manual reconciliation rate often >20%." },
  { source: "HCM", target: "AGENCY-MGMT", trigger_event: "employee.terminated", data_object: "agency_time_entries",
    integration_pattern: "event_stream", friction: "medium",
    description: "Agency staff member terminated in HCM; AGENCY-MGMT must reassign open job tasks, freeze the employee's time entry capability (but preserve historical entries for billing), and trigger access removal for project tooling.",
    notes: "Friction shape: leaver/cancellation recall — termination event is harder to act on than onboarding; open tasks and in-flight deliverables need explicit reassignment, and time-entry locking has to coexist with historical-record preservation." },
];

async function loadPhaseB(domainId: number): Promise<void> {
  console.log("Phase B — data_objects + handoffs");
  // data_objects
  const doMap = await syncTable("/data_objects", NEW_DATA_OBJECTS, "data_object_name");
  // domain_data_objects masters
  const existingDDO = await get(`/domain_data_objects?domain_id=eq.${domainId}&select=data_object_id,role`);
  const haveDDO = new Set(existingDDO.map(r => `${r.data_object_id}|${r.role}`));
  const masterRows: Row[] = [];
  for (const d of NEW_DATA_OBJECTS) {
    const id = doMap.get(d.data_object_name)!;
    if (haveDDO.has(`${id}|master`)) continue;
    masterRows.push({
      domain_id: domainId, data_object_id: id, role: "master",
      notes: `AGENCY-MGMT masters ${d.display_label}: ${d.description.split(".")[0]}.`,
    });
  }
  // consumer/contributor rows for existing data_objects
  const consumerIds = await get(`/data_objects?data_object_name=in.(${CONSUMER_DATA_OBJECTS.map(c => c.name).join(",")})&select=id,data_object_name`);
  const consumerMap = new Map(consumerIds.map(r => [String(r.data_object_name), Number(r.id)]));
  const consumerRows: Row[] = [];
  for (const c of CONSUMER_DATA_OBJECTS) {
    const id = consumerMap.get(c.name);
    if (!id) { console.warn(`  ! consumer data_object ${c.name} not found`); continue; }
    if (haveDDO.has(`${id}|${c.role}`)) continue;
    consumerRows.push({ domain_id: domainId, data_object_id: id, role: c.role, notes: c.notes });
  }
  const allDDO = [...masterRows, ...consumerRows];
  if (allDDO.length) { console.log(`  + ${allDDO.length} domain_data_objects`); await insert("/domain_data_objects", allDDO); }
  else console.log(`  domain_data_objects: all present`);

  // trigger_events (idempotent by event_name)
  const allDataObjectIds = new Map<string, number>([...doMap, ...consumerMap]);
  const existingEvents = await get(`/trigger_events?event_name=in.(${TRIGGER_EVENTS.map(e => `"${e.event_name}"`).join(",")})&select=id,event_name`);
  const haveEvents = new Set(existingEvents.map(r => String(r.event_name)));
  const eventRows = TRIGGER_EVENTS.filter(e => !haveEvents.has(e.event_name)).map(e => ({
    event_name: e.event_name,
    data_object_id: allDataObjectIds.get(e.data_object)!,
    from_state: e.from_state, to_state: e.to_state,
    event_category: e.event_category,
    description: e.description,
  }));
  if (eventRows.length) { console.log(`  + ${eventRows.length} trigger_events`); await insert("/trigger_events", eventRows); }
  const allEvents = await get(`/trigger_events?event_name=in.(${TRIGGER_EVENTS.map(e => `"${e.event_name}"`).join(",")})&select=id,event_name`);
  const eventMap = new Map(allEvents.map(r => [String(r.event_name), Number(r.id)]));

  // cross_domain_handoffs
  const partnerCodes = Array.from(new Set([...HANDOFFS.map(h => h.source), ...HANDOFFS.map(h => h.target)]));
  const partnerDomains = await get(`/domains?domain_code=in.(${partnerCodes.join(",")})&select=id,domain_code`);
  const domainCodeMap = new Map(partnerDomains.map(r => [String(r.domain_code), Number(r.id)]));

  const existingH = await get(`/cross_domain_handoffs?or=(source_domain_id.eq.${domainId},target_domain_id.eq.${domainId})&select=source_domain_id,target_domain_id,trigger_event_id`);
  const haveH = new Set(existingH.map(r => `${r.source_domain_id}|${r.target_domain_id}|${r.trigger_event_id}`));

  const handoffRows: Row[] = [];
  for (const h of HANDOFFS) {
    const sourceId = domainCodeMap.get(h.source);
    const targetId = domainCodeMap.get(h.target);
    const eventId = eventMap.get(h.trigger_event);
    const doId = allDataObjectIds.get(h.data_object);
    if (!sourceId || !targetId || !eventId || !doId) {
      console.warn(`  ! handoff missing refs: ${h.source}->${h.target} ${h.trigger_event} (src=${sourceId} tgt=${targetId} evt=${eventId} do=${doId})`);
      continue;
    }
    if (haveH.has(`${sourceId}|${targetId}|${eventId}`)) continue;
    handoffRows.push({
      source_domain_id: sourceId,
      target_domain_id: targetId,
      trigger_event_id: eventId,
      data_object_id: doId,
      trigger_event: h.trigger_event,
      integration_pattern: h.integration_pattern,
      friction_level: h.friction,
      description: h.description,
      notes: h.notes,
    });
  }
  if (handoffRows.length) { console.log(`  + ${handoffRows.length} cross_domain_handoffs`); await insert("/cross_domain_handoffs", handoffRows); }
  else console.log(`  cross_domain_handoffs: all present`);
}

// ============================================================
// 7. PHASE C
// ============================================================
async function loadPhaseC(domainId: number): Promise<void> {
  console.log("Phase C — business_function_domains");
  const rows = [
    { business_function_id: 34, responsibility_type: "owner",       notes: "Business Operations / agency COO owns the platform — workflow, traffic, resource planning, profitability oversight." },
    { business_function_id: 4,  responsibility_type: "contributor", notes: "Finance owns the billing, AR, retainer accounting, and per-job profitability rollups inside the agency-mgmt platform." },
    { business_function_id: 21, responsibility_type: "contributor", notes: "Sales / Account Management owns new-business pipeline, client estimates, change orders, and the account-relationship layer of agency_jobs." },
  ];
  const existing = await get(`/business_function_domains?domain_id=eq.${domainId}&select=business_function_id`);
  const haveBF = new Set(existing.map(r => Number(r.business_function_id)));
  const toInsert = rows.filter(r => !haveBF.has(r.business_function_id)).map(r => ({ ...r, domain_id: domainId }));
  if (toInsert.length) { console.log(`  + ${toInsert.length} business_function_domains`); await insert("/business_function_domains", toInsert); }
  else console.log(`  business_function_domains: all present`);
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  const me = await call({ method: "GET", path: "/" }).then(() => null).catch(() => null); // warm
  console.log("=== AGENCY-MGMT load ===");
  console.log("\n[1] industry");
  const industryId = await loadIndustry();
  console.log(`  industry_id = ${industryId}`);

  console.log("\n[2] domain");
  const domainId = await loadDomain(industryId);
  console.log(`  domain_id = ${domainId}`);

  console.log("\n[3] capabilities");
  const capMap = await loadCapabilities(domainId);

  console.log("\n[4] vendors + solutions");
  const { solMap } = await loadVendorsAndSolutions();

  console.log("\n[5] solution_domains");
  await loadSolutionDomains(domainId, solMap);

  console.log("\n[6] solution_capabilities matrix");
  await loadSolutionCapabilities(solMap, capMap);

  console.log("\n[7] Phase B");
  await loadPhaseB(domainId);

  console.log("\n[8] Phase C");
  await loadPhaseC(domainId);

  console.log("\n=== done ===");
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
