#!/usr/bin/env bun
// TRAVEL-MGMT (Corporate Travel Management) — Phase A loader.
// domains + capabilities + capability_domains + domain_modules +
// domain_module_capabilities + vendors + solutions + solution_domains.
// Idempotent via natural keys. record_status omitted on every insert (DB default 'new').

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
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map(r => {
    const out: Row = {};
    for (const k of keys) out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return out;
  });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

async function syncByKey(path: string, rows: Row[], keyField: string): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=10000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  ${path}: inserting ${missing.length} new (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: ${existing.length} present, nothing to insert`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// Rule #8 hard-fail validator (mirrors validateDomainRow in load_research.ts).
function validateDomainRow(d: Row): void {
  const problems: string[] = [];
  if (!d.domain_code) problems.push("domain_code empty");
  if (!d.domain_name) problems.push("domain_name empty");
  if (!d.description) problems.push("description empty");
  if (Number(d.crud_percentage) === 0) problems.push("crud_percentage is 0");
  if (d.min_org_size === "" || d.min_org_size == null) problems.push("min_org_size empty");
  if (d.cost_band === "" || d.cost_band == null) problems.push("cost_band empty");
  if (
    (d.business_logic === "" || d.business_logic == null) &&
    Number(d.crud_percentage) < 95
  ) problems.push("business_logic empty while crud_percentage < 95");
  if (Number(d.usa_market_size_usd_m) === 0) problems.push("usa_market_size_usd_m is 0");
  if (Number(d.market_size_source_year) === 0) problems.push("market_size_source_year is 0");
  if (typeof d.certification_required !== "boolean") problems.push("certification_required not boolean");
  if (problems.length > 0) {
    throw new Error(`validateDomainRow FAILED for ${d.domain_code}: ${problems.join("; ")}`);
  }
}

// ============================================================
// PHASE A DATA
// ============================================================

const DOMAIN = {
  domain_code: "TRAVEL-MGMT",
  domain_name: "Corporate Travel Management",
  description:
    "Software market for managing a corporate travel program end to end: policy-aware sourcing and booking of air, hotel, rail, and ground travel; trip and itinerary management; traveler profiles with loyalty, documents, and preferences; pre-trip approval workflows; and traveler duty-of-care monitoring. Distinct from post-trip expense reimbursement and from card-authorization spend control: this domain owns the pre-trip sourcing, the reservation, the journey, and the safety obligation, then hands the resulting charges and the trip record outward to the expense and spend domains.",
  crud_percentage: 65,
  business_logic:
    "Policy-aware shopping and fare-rule evaluation, GDS and NDC inventory arbitration across multiple content sources, pre-trip approval routing with out-of-policy exception handling, unused-ticket credit tracking and reapplication, and real-time duty-of-care risk monitoring that correlates traveler location against destination intelligence to trigger alerts.",
  min_org_size: "20 s <500",
  cost_band: "$$$",
  certification_required: false,
  // Defensible US TAM figure: corporate travel management software + TMC technology
  // spend (booking and program tooling, excluding the underlying travel spend itself).
  // Triangulated from public vendor scale (a leading self-booking vendor reported ~$613M TTM
  // revenue on ~$7.6B gross bookings at its 2025 IPO) plus the managed-travel TMC tech layer.
  // NEEDS A SOURCED MARKET-SIZING PASS (flagged in q-file as the open sourcing item).
  usa_market_size_usd_m: 3500,
  market_size_source_year: 2025,
  catalog_tagline:
    "Book travel within policy, keep every traveler safe, and stay on top of the whole trip from one place.",
  catalog_description:
    "Shop and book flights, hotels, rail, and cars within your travel policy, route out-of-policy trips for approval, and give travelers self-service booking with their own profiles, loyalty numbers, and saved preferences. Every trip lives in one itinerary you can change, track, and reconcile, and unused tickets are tracked so credits never go to waste. When something goes wrong on the road, see where your travelers are, send alerts, and meet your duty-of-care obligations. Trip charges and records flow straight to expense and spend so finance never has to chase them.",
};

const capabilities = [
  { capability_code: "TRAVEL-POLICY-AWARE-SHOPPING", capability_name: "Policy-Aware Travel Shopping", description: "Search and present air, hotel, rail, and ground options filtered and ranked by the organization's travel policy, surfacing in-policy choices and flagging out-of-policy selections at the point of booking." },
  { capability_code: "TRAVEL-INVENTORY-SOURCING", capability_name: "Travel Inventory Sourcing", description: "Aggregate bookable travel content from GDS, NDC, and direct-supplier sources into a unified shopping surface, including ancillaries and negotiated rates." },
  { capability_code: "TRAVEL-BOOKING-RESERVATIONS", capability_name: "Travel Booking and Reservations", description: "Create, hold, modify, and cancel reservations across air, hotel, rail, and car at the reservation-record level, managing fulfillment and ticketing." },
  { capability_code: "TRAVEL-ITINERARY-MGMT", capability_name: "Trip and Itinerary Management", description: "Assemble booked segments into a single trip itinerary the traveler can view and change, keeping the journey synchronized as segments are added, modified, or disrupted." },
  { capability_code: "TRAVEL-PROFILE-MGMT", capability_name: "Traveler Profile Management", description: "Maintain per-traveler profiles holding preferences, loyalty memberships, travel documents, and emergency contacts that personalize shopping and satisfy identity requirements." },
  { capability_code: "TRAVEL-APPROVALS", capability_name: "Pre-Trip Approval Workflow", description: "Route proposed and booked trips for pre-trip authorization based on policy, cost thresholds, and destination risk, capturing approvals and exception justifications." },
  { capability_code: "TRAVEL-DUTY-OF-CARE", capability_name: "Traveler Duty of Care", description: "Monitor where travelers are against destination risk intelligence, raise alerts on emerging threats, and support locating and assisting travelers during disruptions and emergencies." },
  { capability_code: "TRAVEL-CREDIT-MGMT", capability_name: "Unused-Ticket and Credit Management", description: "Track unused and partially used tickets and travel credits, and reapply them to future bookings so prepaid value is recovered rather than lost." },
];

// 4 full modules per the Phase 0 modularization hypothesis (>=3 capabilities => >=2 full modules).
const modules = [
  {
    domain_module_code: "TRAVEL-MGMT-BOOKING-SOURCING",
    domain_module_name: "Booking and Sourcing",
    module_kind: "full",
    description:
      "Sources bookable travel content across GDS, NDC, and direct suppliers, runs policy-aware shopping, and creates and manages air, hotel, rail, and car reservations. Masters the search results, the reservations, and the unused-ticket credits. Used standalone for a self-booking program and alongside the policy, profile, and duty-of-care modules for a managed program.",
    catalog_tagline: "Shop in-policy travel across every source and book it in seconds.",
    catalog_description: "Search flights, hotels, rail, and cars from one place, with policy-fit and price shown up front so travelers pick the right option fast. Hold, change, and cancel reservations cleanly, and never lose prepaid value: unused tickets and credits are tracked and reapplied to the next trip automatically.",
    capabilities: ["TRAVEL-POLICY-AWARE-SHOPPING", "TRAVEL-INVENTORY-SOURCING", "TRAVEL-BOOKING-RESERVATIONS", "TRAVEL-CREDIT-MGMT"],
  },
  {
    domain_module_code: "TRAVEL-MGMT-TRIP-ITINERARY",
    domain_module_name: "Trip and Itinerary Management",
    module_kind: "full",
    description:
      "Assembles booked segments into a single trip the traveler can view, change, and track, keeping the itinerary synchronized through additions, modifications, and disruptions. Masters the trip container and the itinerary. The seam where the trip record and its charges hand off to the expense and spend domains.",
    catalog_tagline: "Keep the whole trip in one itinerary, always up to date.",
    catalog_description: "Every booked segment rolls up into one trip your traveler can see and change, and stays in sync when plans shift or flights are disrupted. The complete trip record flows straight to expense and spend, so finance reconciles charges without chasing anyone for details.",
    capabilities: ["TRAVEL-ITINERARY-MGMT"],
  },
  {
    domain_module_code: "TRAVEL-MGMT-PROFILE-POLICY",
    domain_module_name: "Traveler Profiles and Travel Policy",
    module_kind: "full",
    description:
      "Maintains per-traveler profiles (preferences, loyalty, documents, emergency contacts) and the travel policy plus pre-trip approval workflow. Masters traveler profiles, travel policies, and trip approvals. Drives policy-aware shopping in the booking module and feeds traveler identity into duty-of-care.",
    catalog_tagline: "Personalize booking with traveler profiles and keep trips within policy.",
    catalog_description: "Give every traveler a profile with their loyalty numbers, document details, preferences, and emergency contacts, so booking is fast and compliant. Set travel policy once and route out-of-policy or high-cost trips for pre-trip approval, capturing exceptions and sign-offs along the way.",
    capabilities: ["TRAVEL-PROFILE-MGMT", "TRAVEL-APPROVALS"],
  },
  {
    domain_module_code: "TRAVEL-MGMT-DUTY-OF-CARE",
    domain_module_name: "Duty of Care and Traveler Risk",
    module_kind: "full",
    description:
      "Monitors traveler location against destination risk intelligence, raises alerts on emerging threats, and supports locating and assisting travelers during disruptions. Masters the duty-of-care alerts. Reads traveler profiles and trip itineraries to know who is where.",
    catalog_tagline: "Know where your travelers are and keep them safe on the road.",
    catalog_description: "See where every traveler is at a glance, match their trips against live destination risk, and get alerted the moment something threatens them. When disruption hits, locate affected travelers fast and act on your duty-of-care obligation instead of scrambling.",
    capabilities: ["TRAVEL-DUTY-OF-CARE"],
  },
];

type SolutionDef = {
  solution_name: string;
  vendor: string;
  solution_type: "saas" | "on_prem" | "hybrid" | "open_source" | "internal_build" | "manual_process";
  solution_url?: string;
  description: string;
  coverage: "primary" | "secondary" | "partial";
};

// Reuse existing vendors by vendor_name (Navan=190, SAP SE=18 already exist).
const newVendors = [
  { vendor_name: "Spotnana", vendor_url: "https://www.spotnana.com", headquarters_country: "USA", description: "Travel-as-a-service infrastructure vendor; aggregates GDS, NDC, and direct-supplier content and powers embedded corporate travel for other platforms." },
  { vendor_name: "American Express Global Business Travel", vendor_url: "https://www.amexglobalbusinesstravel.com", headquarters_country: "USA", description: "Managed travel company (TMC) with proprietary online and offline booking tooling and global program management." },
  { vendor_name: "BCD Travel", vendor_url: "https://www.bcdtravel.com", headquarters_country: "Netherlands", description: "Global travel management company providing managed travel programs, duty-of-care, and program optimization for large multinationals." },
];

const solutions: SolutionDef[] = [
  { solution_name: "Navan Travel", vendor: "Navan", solution_type: "saas", solution_url: "https://navan.com", description: "All-in-one corporate travel and expense platform with modern self-booking, embedded policy, and duty-of-care.", coverage: "primary" },
  { solution_name: "SAP Concur Travel", vendor: "SAP SE", solution_type: "saas", solution_url: "https://www.concur.com", description: "Enterprise corporate-travel booking with deep policy, global compliance, and broad ERP alignment.", coverage: "primary" },
  { solution_name: "Spotnana Travel-as-a-Service", vendor: "Spotnana", solution_type: "saas", solution_url: "https://www.spotnana.com", description: "API-first corporate travel infrastructure aggregating GDS, NDC, and direct content for embedded and managed programs.", coverage: "primary" },
  { solution_name: "Amex GBT Egencia", vendor: "American Express Global Business Travel", solution_type: "saas", solution_url: "https://www.egencia.com", description: "Online corporate travel booking and managed-program tooling within the largest managed-travel company.", coverage: "primary" },
  { solution_name: "BCD Travel Program Management", vendor: "BCD Travel", solution_type: "saas", solution_url: "https://www.bcdtravel.com", description: "Managed corporate travel program with booking, duty-of-care, and travel-program optimization.", coverage: "primary" },
];

async function main() {
  console.log("=== TRAVEL-MGMT Phase A ===\n");

  // --- domains ---
  console.log("Domains:");
  validateDomainRow(DOMAIN);
  const domainMap = await syncByKey("/domains", [DOMAIN], "domain_code");
  const domainId = domainMap.get("TRAVEL-MGMT");
  if (!domainId) throw new Error("TRAVEL-MGMT domain id missing after sync");
  console.log(`  TRAVEL-MGMT id=${domainId}`);

  // PATCH catalog UX fields onto the (possibly pre-existing) row only when empty (Rule #20 empty-guard).
  const [domRow] = await get(`/domains?id=eq.${domainId}&select=catalog_tagline,catalog_description`);
  const patch: Row = {};
  if (!domRow.catalog_tagline) patch.catalog_tagline = DOMAIN.catalog_tagline;
  if (!domRow.catalog_description) patch.catalog_description = DOMAIN.catalog_description;
  if (Object.keys(patch).length > 0) {
    await call({ method: "PATCH", path: `/domains?id=eq.${domainId}`, body: patch });
    console.log(`  patched domain catalog UX fields: ${Object.keys(patch).join(", ")}`);
  }

  // --- capabilities ---
  console.log("Capabilities:");
  const capMap = await syncByKey("/capabilities", capabilities, "capability_code");

  // --- capability_domains ---
  console.log("capability_domains:");
  const existingCD = await get(`/capability_domains?domain_id=eq.${domainId}&select=capability_id`);
  const existingCDset = new Set(existingCD.map(r => Number(r.capability_id)));
  const cdRows = capabilities
    .map(c => ({ capability_id: capMap.get(c.capability_code)!, domain_id: domainId }))
    .filter(r => !existingCDset.has(r.capability_id));
  if (cdRows.length) await insert("/capability_domains", cdRows);
  console.log(`  inserted ${cdRows.length} capability_domains (${existingCD.length} existed)`);

  // --- domain_modules ---
  console.log("domain_modules:");
  const moduleRows = modules.map(m => ({
    domain_module_code: m.domain_module_code,
    domain_module_name: m.domain_module_name,
    domain_id: domainId,
    module_kind: m.module_kind,
    description: m.description,
    catalog_tagline: m.catalog_tagline,
    catalog_description: m.catalog_description,
  }));
  const moduleMap = await syncByKey("/domain_modules", moduleRows, "domain_module_code");
  // empty-guard PATCH catalog UX onto pre-existing module rows
  for (const m of modules) {
    const mid = moduleMap.get(m.domain_module_code)!;
    const [mr] = await get(`/domain_modules?id=eq.${mid}&select=catalog_tagline,catalog_description`);
    const mp: Row = {};
    if (!mr.catalog_tagline) mp.catalog_tagline = m.catalog_tagline;
    if (!mr.catalog_description) mp.catalog_description = m.catalog_description;
    if (Object.keys(mp).length) await call({ method: "PATCH", path: `/domain_modules?id=eq.${mid}`, body: mp });
  }

  // --- domain_module_capabilities ---
  console.log("domain_module_capabilities:");
  const modIds = modules.map(m => moduleMap.get(m.domain_module_code)!);
  const existingDMC = await get(`/domain_module_capabilities?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,capability_id`);
  const dmcSet = new Set(existingDMC.map(r => `${r.domain_module_id}:${r.capability_id}`));
  const dmcRows: Row[] = [];
  for (const m of modules) {
    const mid = moduleMap.get(m.domain_module_code)!;
    for (const cc of m.capabilities) {
      const cid = capMap.get(cc)!;
      const key = `${mid}:${cid}`;
      if (!dmcSet.has(key)) { dmcSet.add(key); dmcRows.push({ domain_module_id: mid, capability_id: cid }); }
    }
  }
  if (dmcRows.length) await insert("/domain_module_capabilities", dmcRows);
  console.log(`  inserted ${dmcRows.length} domain_module_capabilities`);

  // --- vendors ---
  console.log("vendors:");
  const vendorMap = await syncByKey("/vendors", newVendors, "vendor_name");

  // --- solutions ---
  console.log("solutions:");
  const solRows = solutions.map(s => {
    const vid = vendorMap.get(s.vendor);
    if (!vid) throw new Error(`vendor not found for ${s.solution_name}: ${s.vendor}`);
    return {
      solution_name: s.solution_name,
      description: s.description,
      solution_url: s.solution_url ?? "",
      vendor_id: vid,
      solution_type: s.solution_type,
      is_active_in_market: true,
    };
  });
  const solMap = await syncByKey("/solutions", solRows, "solution_name");

  // --- solution_domains ---
  console.log("solution_domains:");
  const existingSD = await get(`/solution_domains?domain_id=eq.${domainId}&select=solution_id,coverage_level`);
  const sdSet = new Set(existingSD.map(r => `${r.solution_id}:${r.coverage_level}`));
  const sdRows: Row[] = [];
  for (const s of solutions) {
    const sid = solMap.get(s.solution_name)!;
    const key = `${sid}:${s.coverage}`;
    if (!sdSet.has(key)) { sdSet.add(key); sdRows.push({ solution_id: sid, domain_id: domainId, coverage_level: s.coverage }); }
  }
  if (sdRows.length) await insert("/solution_domains", sdRows);
  console.log(`  inserted ${sdRows.length} solution_domains`);

  // --- counts ---
  console.log("\n=== Phase A counts ===");
  const counts = {
    domain_id: domainId,
    capabilities: (await get(`/capability_domains?domain_id=eq.${domainId}&select=capability_id`)).length,
    modules: (await get(`/domain_modules?domain_id=eq.${domainId}&select=id`)).length,
    domain_module_capabilities: (await get(`/domain_module_capabilities?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id`)).length,
    solution_domains: (await get(`/solution_domains?domain_id=eq.${domainId}&select=solution_id`)).length,
  };
  console.log(counts);
  console.log("module ids:", Object.fromEntries(modules.map(m => [m.domain_module_code, moduleMap.get(m.domain_module_code)])));
}

await main();
console.log("Phase A done.");
