#!/usr/bin/env bun
// Loads the Product Management (PROD-MGMT) market into the domain_map module:
// 1 domain, 8 new vendors (+ Atlassian reused), 9 solutions,
// 6 capabilities, and the supporting junctions
// (solution_domains, capability_domains, solution_capabilities).
// Idempotent: reads natural keys first, only inserts missing rows.

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
    console.log(`  inserting ${missing.length} new rows into ${path} (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: ${existing.length} already present, nothing to insert`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// ============================================================
// DOMAIN
// ============================================================
const newDomains = [
  {
    domain_code: "PROD-MGMT",
    domain_name: "Product Management",
    description:
      "Product discovery, customer-feedback aggregation, feature prioritization, roadmap planning, and release management for software products. Distinct from Strategic Portfolio Management (investment selection) and engineering issue tracking (delivery execution) — Product Management is the discipline of deciding what to build and when to release it, with vendors like Productboard, Aha!, Atlassian Jira Product Discovery, Pendo, and Airfocus competing as a recognised software category.",
  },
];

// ============================================================
// CAPABILITIES (under PROD-MGMT)
// ============================================================
const capabilities = [
  {
    capability_code: "PM-ROADMAP",
    capability_name: "Product Roadmap Visualization",
    domain: "PROD-MGMT",
    description:
      "Authoring and sharing of product roadmaps across timeline, swimlane, now-next-later, and theme views, with versioning, audience-specific views, and stakeholder distribution.",
  },
  {
    capability_code: "PM-PRIORITIZATION",
    capability_name: "Feature Prioritization",
    domain: "PROD-MGMT",
    description:
      "Structured scoring of features and ideas using frameworks such as RICE, MoSCoW, value-vs-effort, weighted shortest job first, and custom criteria, with portfolio-level trade-off visualization.",
  },
  {
    capability_code: "PM-FEEDBACK",
    capability_name: "Customer Feedback Aggregation and Insights",
    domain: "PROD-MGMT",
    description:
      "Capture of customer feedback from support tickets, sales calls, surveys, in-app prompts, and reviews; deduplication, tagging, linking to features and personas, and quantification of demand per opportunity.",
  },
  {
    capability_code: "PM-RELEASES",
    capability_name: "Release Planning and Communication",
    domain: "PROD-MGMT",
    description:
      "Planning of releases against committed scope, generation of release notes, in-app announcements, and changelog distribution to customers and internal stakeholders.",
  },
  {
    capability_code: "PM-STRATEGY",
    capability_name: "Product Strategy and OKR Linkage",
    domain: "PROD-MGMT",
    description:
      "Definition of product vision, strategic goals, and OKRs, and traceability from features and initiatives back to the goals they serve, enabling outcome-based prioritization.",
  },
  {
    capability_code: "PM-DISCOVERY",
    capability_name: "Opportunity and Idea Management",
    domain: "PROD-MGMT",
    description:
      "Capture of raw opportunities and ideas (from customers, employees, and market signals), triage workflows, opportunity-solution-tree modelling, and conversion to validated features.",
  },
];

// ============================================================
// VENDORS (Atlassian already exists; will reuse by name)
// ============================================================
const vendors = [
  {
    vendor_name: "Productboard, Inc.",
    vendor_url: "https://www.productboard.com",
    headquarters_country: "USA",
    description: "Customer-insight and product-management platform vendor.",
    notes:
      "Founded 2014, dual HQ in San Francisco and Prague. Backed by Tiger Global, Index Ventures, Sequoia. Independent, focused on product discovery and prioritization.",
  },
  {
    vendor_name: "Aha! Labs Inc.",
    vendor_url: "https://www.aha.io",
    headquarters_country: "USA",
    description: "Product-management software vendor (Aha! Roadmaps, Ideas, Develop, Whiteboards, Knowledge).",
    notes:
      "Founded 2013, fully remote, bootstrapped and profitable. Independent vendor; broad PM suite spanning roadmaps, ideas, agile development, and whiteboarding.",
  },
  {
    vendor_name: "Pendo.io, Inc.",
    vendor_url: "https://www.pendo.io",
    headquarters_country: "USA",
    description: "Product-experience platform combining product analytics, in-app guides, feedback, and roadmaps.",
    notes:
      "Founded 2013, HQ Raleigh NC. Acquired Mind the Product (2021) and Receptive (2020, the foundation of Pendo Feedback).",
  },
  {
    vendor_name: "Airfocus GmbH",
    vendor_url: "https://airfocus.com",
    headquarters_country: "Germany",
    description: "Modular product-management platform vendor.",
    notes: "Founded 2017, HQ Hamburg. Independent; modular PM platform with prioritization frameworks and roadmaps.",
  },
  {
    vendor_name: "insightsoftware",
    vendor_url: "https://insightsoftware.com",
    headquarters_country: "USA",
    description: "Financial-reporting and analytics software conglomerate; parent of ProductPlan.",
    notes:
      "HQ Raleigh NC. Acquired ProductPlan in 2023, adding roadmapping to its portfolio of finance and reporting tools (Equifax, Certent, Jet Analytics).",
  },
  {
    vendor_name: "Tempo Software",
    vendor_url: "https://www.tempo.io",
    headquarters_country: "USA",
    description: "Portfolio of time-tracking, capacity-planning, and roadmapping products for Jira and beyond.",
    notes:
      "HQ Boston. Acquired Roadmunk in 2021 and ALM Works (Structure for Jira) in 2022; portfolio company of Diversis Capital.",
  },
  {
    vendor_name: "Craft.io Ltd.",
    vendor_url: "https://craft.io",
    headquarters_country: "UK",
    description: "End-to-end product-management platform vendor.",
    notes: "Founded 2015, HQ London (with significant Israel presence). Independent; positions as an end-to-end PM tool with specs, strategy, and roadmaps.",
  },
  {
    vendor_name: "Dragonboat, Inc.",
    vendor_url: "https://dragonboat.io",
    headquarters_country: "USA",
    description: "Outcome-driven product portfolio and capacity-planning platform vendor.",
    notes:
      "Founded 2019, HQ in the San Francisco Bay Area. Independent; targets product operations and product-portfolio leaders.",
  },
];

// ============================================================
// SOLUTIONS (with primary/secondary domain assignments)
// ============================================================
type SolutionSpec = {
  solution_name: string;
  vendor: string;
  solution_type: "saas" | "on_prem" | "hybrid" | "open_source" | "internal_build" | "manual_process";
  description: string;
  notes?: string;
  primary?: string[];
  secondary?: string[];
  partial?: string[];
};

const solutions: SolutionSpec[] = [
  {
    solution_name: "Productboard",
    vendor: "Productboard, Inc.",
    solution_type: "saas",
    description:
      "Customer-insight-driven product-management platform: aggregates feedback, prioritizes features against product goals, and shares roadmaps with stakeholders.",
    primary: ["PROD-MGMT"],
  },
  {
    solution_name: "Aha! Roadmaps",
    vendor: "Aha! Labs Inc.",
    solution_type: "saas",
    description:
      "Flagship product-management application of the Aha! suite: strategy, goals, releases, features, and roadmap views with stakeholder publishing.",
    primary: ["PROD-MGMT"],
  },
  {
    solution_name: "Jira Product Discovery",
    vendor: "Atlassian",
    solution_type: "saas",
    description:
      "Atlassian's product-discovery and prioritization tool. Captures opportunities, prioritizes with custom scoring, and feeds delivery to Jira Software for execution.",
    notes: "Released as a general-availability product in 2023; pairs tightly with Jira Software and Confluence.",
    primary: ["PROD-MGMT"],
    secondary: ["VSDP"],
  },
  {
    solution_name: "Pendo Roadmaps",
    vendor: "Pendo.io, Inc.",
    solution_type: "saas",
    description:
      "Roadmap and feedback module of the Pendo product-experience platform, deeply integrated with Pendo's in-app analytics, NPS, and guides.",
    notes: "Combines Pendo Feedback (formerly Receptive) and roadmaps; sold alongside Pendo Analytics.",
    primary: ["PROD-MGMT"],
  },
  {
    solution_name: "Airfocus",
    vendor: "Airfocus GmbH",
    solution_type: "saas",
    description:
      "Modular product-management platform with prioritization frameworks (RICE, value-vs-effort), roadmaps, insights, and customer-portal feedback collection.",
    primary: ["PROD-MGMT"],
  },
  {
    solution_name: "ProductPlan",
    vendor: "insightsoftware",
    solution_type: "saas",
    description:
      "Roadmap-first product-management application: timeline, swimlane, and portfolio views with stakeholder publishing and Jira integration.",
    notes: "Acquired by insightsoftware in 2023 from the original ProductPlan team based in Santa Barbara.",
    primary: ["PROD-MGMT"],
  },
  {
    solution_name: "Roadmunk",
    vendor: "Tempo Software",
    solution_type: "saas",
    description:
      "Roadmap visualization and idea-management tool: timeline and swimlane roadmaps, feedback inbox, and prioritization scoring.",
    notes: "Acquired by Tempo from its Toronto founders in 2021; remains a standalone product within the Tempo portfolio.",
    primary: ["PROD-MGMT"],
  },
  {
    solution_name: "Craft.io",
    vendor: "Craft.io Ltd.",
    solution_type: "saas",
    description:
      "End-to-end product-management platform: product strategy, specs (PRDs), prioritization, roadmaps, and feedback capture.",
    primary: ["PROD-MGMT"],
  },
  {
    solution_name: "Dragonboat",
    vendor: "Dragonboat, Inc.",
    solution_type: "saas",
    description:
      "Outcome-driven product portfolio and capacity-planning platform: links objectives to initiatives, features, and capacity; built for product-operations leaders.",
    primary: ["PROD-MGMT"],
    secondary: ["SPM"],
  },
];

// ============================================================
// SOLUTION_CAPABILITIES (delivery_strength per solution × capability)
// ============================================================
// Strength legend: native = first-class supported feature; partial = supported but lightweight;
// via_extension = via integration / marketplace add-on; not_supported = absent.
type SolCapSpec = {
  solution: string;
  capability: string;
  delivery_strength: "native" | "partial" | "via_extension" | "not_supported";
  notes?: string;
};
const solCaps: SolCapSpec[] = [
  // Productboard — feedback-centric
  { solution: "Productboard", capability: "PM-ROADMAP", delivery_strength: "native" },
  { solution: "Productboard", capability: "PM-PRIORITIZATION", delivery_strength: "native" },
  { solution: "Productboard", capability: "PM-FEEDBACK", delivery_strength: "native", notes: "Insights inbox is the flagship surface." },
  { solution: "Productboard", capability: "PM-RELEASES", delivery_strength: "partial", notes: "Release notes via integrations and templates; limited native distribution channel." },
  { solution: "Productboard", capability: "PM-STRATEGY", delivery_strength: "native", notes: "Objectives and drivers link to features." },
  { solution: "Productboard", capability: "PM-DISCOVERY", delivery_strength: "native" },

  // Aha! Roadmaps — broad suite
  { solution: "Aha! Roadmaps", capability: "PM-ROADMAP", delivery_strength: "native" },
  { solution: "Aha! Roadmaps", capability: "PM-PRIORITIZATION", delivery_strength: "native" },
  { solution: "Aha! Roadmaps", capability: "PM-FEEDBACK", delivery_strength: "native", notes: "Aha! Ideas portal is native; deeper analytics via Aha! Discovery." },
  { solution: "Aha! Roadmaps", capability: "PM-RELEASES", delivery_strength: "native" },
  { solution: "Aha! Roadmaps", capability: "PM-STRATEGY", delivery_strength: "native", notes: "Strategy → goals → initiatives → features is the core model." },
  { solution: "Aha! Roadmaps", capability: "PM-DISCOVERY", delivery_strength: "native" },

  // Jira Product Discovery — newer, lighter
  { solution: "Jira Product Discovery", capability: "PM-ROADMAP", delivery_strength: "native" },
  { solution: "Jira Product Discovery", capability: "PM-PRIORITIZATION", delivery_strength: "native" },
  { solution: "Jira Product Discovery", capability: "PM-FEEDBACK", delivery_strength: "partial", notes: "Insights field per idea; relies on integrations for inbound feedback streams." },
  { solution: "Jira Product Discovery", capability: "PM-RELEASES", delivery_strength: "via_extension", notes: "Releases handled in Jira Software once an idea is delivered." },
  { solution: "Jira Product Discovery", capability: "PM-STRATEGY", delivery_strength: "partial" },
  { solution: "Jira Product Discovery", capability: "PM-DISCOVERY", delivery_strength: "native" },

  // Pendo Roadmaps — analytics-led
  { solution: "Pendo Roadmaps", capability: "PM-ROADMAP", delivery_strength: "native" },
  { solution: "Pendo Roadmaps", capability: "PM-PRIORITIZATION", delivery_strength: "partial" },
  { solution: "Pendo Roadmaps", capability: "PM-FEEDBACK", delivery_strength: "native", notes: "Pendo Feedback (Receptive) is the flagship feedback module." },
  { solution: "Pendo Roadmaps", capability: "PM-RELEASES", delivery_strength: "native", notes: "Native in-app guides for release announcements." },
  { solution: "Pendo Roadmaps", capability: "PM-STRATEGY", delivery_strength: "partial" },
  { solution: "Pendo Roadmaps", capability: "PM-DISCOVERY", delivery_strength: "partial" },

  // Airfocus — modular
  { solution: "Airfocus", capability: "PM-ROADMAP", delivery_strength: "native" },
  { solution: "Airfocus", capability: "PM-PRIORITIZATION", delivery_strength: "native", notes: "Prioritization frameworks are a flagship module." },
  { solution: "Airfocus", capability: "PM-FEEDBACK", delivery_strength: "native", notes: "Insights and customer-portal modules." },
  { solution: "Airfocus", capability: "PM-RELEASES", delivery_strength: "partial" },
  { solution: "Airfocus", capability: "PM-STRATEGY", delivery_strength: "native", notes: "Objectives module with goal-to-feature linking." },
  { solution: "Airfocus", capability: "PM-DISCOVERY", delivery_strength: "native" },

  // ProductPlan — roadmap-first, limited elsewhere
  { solution: "ProductPlan", capability: "PM-ROADMAP", delivery_strength: "native", notes: "Roadmap visualization is the flagship." },
  { solution: "ProductPlan", capability: "PM-PRIORITIZATION", delivery_strength: "partial" },
  { solution: "ProductPlan", capability: "PM-FEEDBACK", delivery_strength: "partial" },
  { solution: "ProductPlan", capability: "PM-RELEASES", delivery_strength: "partial" },
  { solution: "ProductPlan", capability: "PM-STRATEGY", delivery_strength: "partial" },
  { solution: "ProductPlan", capability: "PM-DISCOVERY", delivery_strength: "partial" },

  // Roadmunk — roadmap-centric
  { solution: "Roadmunk", capability: "PM-ROADMAP", delivery_strength: "native" },
  { solution: "Roadmunk", capability: "PM-PRIORITIZATION", delivery_strength: "partial" },
  { solution: "Roadmunk", capability: "PM-FEEDBACK", delivery_strength: "partial", notes: "Idea inbox with merge and scoring." },
  { solution: "Roadmunk", capability: "PM-RELEASES", delivery_strength: "partial" },
  { solution: "Roadmunk", capability: "PM-STRATEGY", delivery_strength: "partial" },
  { solution: "Roadmunk", capability: "PM-DISCOVERY", delivery_strength: "partial" },

  // Craft.io — end-to-end
  { solution: "Craft.io", capability: "PM-ROADMAP", delivery_strength: "native" },
  { solution: "Craft.io", capability: "PM-PRIORITIZATION", delivery_strength: "native" },
  { solution: "Craft.io", capability: "PM-FEEDBACK", delivery_strength: "native" },
  { solution: "Craft.io", capability: "PM-RELEASES", delivery_strength: "partial" },
  { solution: "Craft.io", capability: "PM-STRATEGY", delivery_strength: "native", notes: "Vision and strategy modules with goal-to-spec linking." },
  { solution: "Craft.io", capability: "PM-DISCOVERY", delivery_strength: "native" },

  // Dragonboat — portfolio-oriented
  { solution: "Dragonboat", capability: "PM-ROADMAP", delivery_strength: "native" },
  { solution: "Dragonboat", capability: "PM-PRIORITIZATION", delivery_strength: "native", notes: "Outcome-driven prioritization with capacity awareness is the flagship." },
  { solution: "Dragonboat", capability: "PM-FEEDBACK", delivery_strength: "partial" },
  { solution: "Dragonboat", capability: "PM-RELEASES", delivery_strength: "partial" },
  { solution: "Dragonboat", capability: "PM-STRATEGY", delivery_strength: "native", notes: "Objectives to initiatives to capacity is the core data model." },
  { solution: "Dragonboat", capability: "PM-DISCOVERY", delivery_strength: "partial" },
];

// ============================================================
// RUN
// ============================================================
async function main() {
  console.log("\n=== Domains ===");
  const domainMap = await syncTable("/domains", newDomains.map(d => ({ ...d })), "domain_code");

  // Full domain map (for secondary/partial cross-domain coverage)
  const allDomainsRaw = await get("/domains?select=id,domain_code&limit=10000");
  const allDomainMap = new Map<string, number>();
  for (const d of allDomainsRaw) allDomainMap.set(String(d.domain_code), Number(d.id));

  console.log("\n=== Capabilities ===");
  const capRows = capabilities.map(c => ({
    capability_code: c.capability_code,
    capability_name: c.capability_name,
    description: c.description,
  }));
  const capMap = await syncTable("/capabilities", capRows, "capability_code");

  console.log("\n=== capability_domains junctions ===");
  const existingCapDomLinks = await get("/capability_domains?select=capability_id,domain_id&limit=10000");
  const existingCapDomSet = new Set(existingCapDomLinks.map(r => `${r.capability_id}:${r.domain_id}`));
  const newCapDomRows: Row[] = [];
  for (const c of capabilities) {
    const cid = capMap.get(c.capability_code)!;
    const did = allDomainMap.get(c.domain)!;
    const key = `${cid}:${did}`;
    if (existingCapDomSet.has(key)) continue;
    newCapDomRows.push({ capability_id: cid, domain_id: did, notes: "" });
  }
  if (newCapDomRows.length > 0) {
    console.log(`  inserting ${newCapDomRows.length} capability_domains rows`);
    await insert("/capability_domains", newCapDomRows);
  } else {
    console.log("  no new capability_domains rows");
  }

  console.log("\n=== Vendors ===");
  const vendorMap = await syncTable("/vendors", vendors.map(v => ({ ...v })), "vendor_name");
  // The pre-existing "Atlassian" vendor row is reused by name (already in the catalog as id 3).
  const fullVendorsRaw = await get("/vendors?select=id,vendor_name&limit=10000");
  for (const v of fullVendorsRaw) vendorMap.set(String(v.vendor_name), Number(v.id));

  console.log("\n=== Solutions ===");
  const solutionRows = solutions.map(s => {
    const vendorId = vendorMap.get(s.vendor);
    if (!vendorId) throw new Error(`Vendor not found for solution ${s.solution_name}: ${s.vendor}`);
    return {
      solution_name: s.solution_name,
      description: s.description,
      solution_url: "",
      vendor_id: vendorId,
      solution_type: s.solution_type,
      is_active_in_market: true,
      notes: s.notes ?? "",
    };
  });
  const solutionMap = await syncTable("/solutions", solutionRows, "solution_name");

  console.log("\n=== solution_domains junctions ===");
  const existingSolDomLinks = await get("/solution_domains?select=solution_id,domain_id,coverage_level&limit=10000");
  const existingSolDomSet = new Set(existingSolDomLinks.map(r => `${r.solution_id}:${r.domain_id}:${r.coverage_level}`));
  const newSolDomRows: Row[] = [];
  let skippedSolDom = 0;
  for (const s of solutions) {
    const sid = solutionMap.get(s.solution_name)!;
    const buildLink = (code: string, coverage: "primary" | "secondary" | "partial") => {
      const did = allDomainMap.get(code);
      if (!did) { console.warn(`  ! domain ${code} not found for ${s.solution_name}`); return; }
      const key = `${sid}:${did}:${coverage}`;
      if (existingSolDomSet.has(key)) { skippedSolDom++; return; }
      existingSolDomSet.add(key);
      newSolDomRows.push({ solution_id: sid, domain_id: did, coverage_level: coverage, notes: "" });
    };
    for (const code of s.primary ?? []) buildLink(code, "primary");
    for (const code of s.secondary ?? []) buildLink(code, "secondary");
    for (const code of s.partial ?? []) buildLink(code, "partial");
  }
  if (newSolDomRows.length > 0) {
    console.log(`  inserting ${newSolDomRows.length} solution_domains rows (${skippedSolDom} already present)`);
    await insert("/solution_domains", newSolDomRows);
  } else {
    console.log(`  no new solution_domains rows (${skippedSolDom} already present)`);
  }

  console.log("\n=== solution_capabilities junctions ===");
  const existingSolCapLinks = await get("/solution_capabilities?select=solution_id,capability_id&limit=10000");
  const existingSolCapSet = new Set(existingSolCapLinks.map(r => `${r.solution_id}:${r.capability_id}`));
  const newSolCapRows: Row[] = [];
  let skippedSolCap = 0;
  for (const sc of solCaps) {
    const sid = solutionMap.get(sc.solution);
    const cid = capMap.get(sc.capability);
    if (!sid) throw new Error(`Solution not found: ${sc.solution}`);
    if (!cid) throw new Error(`Capability not found: ${sc.capability}`);
    const key = `${sid}:${cid}`;
    if (existingSolCapSet.has(key)) { skippedSolCap++; continue; }
    existingSolCapSet.add(key);
    newSolCapRows.push({
      solution_id: sid,
      capability_id: cid,
      delivery_strength: sc.delivery_strength,
      notes: sc.notes ?? "",
    });
  }
  if (newSolCapRows.length > 0) {
    console.log(`  inserting ${newSolCapRows.length} solution_capabilities rows (${skippedSolCap} already present)`);
    await insert("/solution_capabilities", newSolCapRows);
  } else {
    console.log(`  no new solution_capabilities rows (${skippedSolCap} already present)`);
  }

  // ===== Final counts (PROD-MGMT scope) =====
  const prodMgmtDomainId = allDomainMap.get("PROD-MGMT");
  const counts = {
    domains_total: (await get("/domains?select=id&limit=10000")).length,
    capabilities_total: (await get("/capabilities?select=id&limit=10000")).length,
    capability_domains_total: (await get("/capability_domains?select=capability_id&limit=10000")).length,
    vendors_total: (await get("/vendors?select=id&limit=10000")).length,
    solutions_total: (await get("/solutions?select=id&limit=10000")).length,
    solution_domains_total: (await get("/solution_domains?select=solution_id&limit=10000")).length,
    solution_capabilities_total: (await get("/solution_capabilities?select=solution_id&limit=10000")).length,
    prod_mgmt_solution_domains: (await get(`/solution_domains?domain_id=eq.${prodMgmtDomainId}&select=solution_id&limit=10000`)).length,
    prod_mgmt_capability_domains: (await get(`/capability_domains?domain_id=eq.${prodMgmtDomainId}&select=capability_id&limit=10000`)).length,
  };
  console.log("\n=== Final counts ===");
  console.log(JSON.stringify(counts, null, 2));
}

await main();
