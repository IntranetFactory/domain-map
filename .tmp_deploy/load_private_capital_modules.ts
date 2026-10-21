#!/usr/bin/env bun
// Phase A extension: modularize the 5 private-capital domains.
// Per plan-modules.md §1: each module = autonomous, independently-deployable unit
// owning its own data_objects, lifecycle states, edges, and tool surface.
//
// 21 modules total across INV-CRM, FUND-ADMIN, PORT-MONIT, CAP-TABLE, EM-FUND-PLATFORM.
// + domain_module_capabilities linking existing caps to their canonical module.
// + domain_starter_modules per domain (2 rows each = 10 total).
// + domain_module_host_domains for cross-cutting capabilities (APPROVAL-WORKFLOW on
//   FUND-ADMIN modules + CAP-TABLE modules; IDENTITY-RESOLUTION already linked at
//   capability_domains; we don't materialize them as modules in this load — only
//   their capability assignments).

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
  const code = await proc.exited;
  if (code !== 0) throw new Error(`semantius failed (exit ${code}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const get = (path: string) => call({ method: "GET", path });

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const result = await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) });
    out.push(...result);
  }
  return out;
}

async function syncTable<T extends Row>(
  path: string, rows: T[], keyField: keyof T & string,
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
// MODULES (21 total)
// ============================================================
type Mod = {
  code: string;
  name: string;
  domain: string;            // domain_code
  description: string;
  capabilities: string[];    // capability_codes the module realizes
};

const modules: Mod[] = [
  // ===== INV-CRM (3 modules) =====
  {
    code: "INV-CRM-DEAL-PIPELINE",
    name: "Deal Pipeline",
    domain: "INV-CRM",
    description: "The investment-opportunity pipeline backbone: deal sourcing through closure, deal-team collaboration, and IC investment memos. Structurally similar to standalone deal-flow products (Affinity deal pipeline, 4Degrees pipeline). Masters deals and investment memos.",
    capabilities: ["INVCRM-DEAL-PIPELINE", "INVCRM-DEAL-MEMO-COLLAB"],
  },
  {
    code: "INV-CRM-RELATIONSHIP-GRAPH",
    name: "Relationship Graph",
    domain: "INV-CRM",
    description: "Auto-inferred relationship graph from email/calendar metadata with warm-introduction path computation across the firm's network. Identity reconciliation of founders, executives, and co-investors across deal stages.",
    capabilities: ["INVCRM-RELATIONSHIP-INTEL", "INVCRM-INTRODUCTION-ROUTING", "IDENTITY-RESOLUTION"],
  },
  {
    code: "INV-CRM-LP-CRM",
    name: "LP CRM",
    domain: "INV-CRM",
    description: "Fundraising-side CRM for LP outreach, meetings, and capital-commitment pipeline. Also lightweight portfolio-company awareness for deal-team consumption (full portfolio monitoring lives in PORT-MONIT).",
    capabilities: ["INVCRM-LP-RELATIONSHIP-MGMT", "INVCRM-PORTCO-TRACKING"],
  },

  // ===== FUND-ADMIN (4 modules) =====
  {
    code: "FUND-ADMIN-FUND-LEDGER",
    name: "Fund Ledger",
    domain: "FUND-ADMIN",
    description: "Fund accounting: GP books for the fund vehicle, multi-currency support, GAAP/IFRS partnership accounting, and audit-support packaging. Masters funds, fund ledger entries, and close periods.",
    capabilities: ["FUNDADMIN-FUND-ACCOUNTING", "FUNDADMIN-AUDIT-SUPPORT"],
  },
  {
    code: "FUND-ADMIN-LP-COMMITMENTS",
    name: "LP Commitments",
    domain: "FUND-ADMIN",
    description: "LP onboarding (KYC/AML + subscription document collection), PCAP (partner capital account) statement generation, and LP-facing portal for statement and document access.",
    capabilities: ["FUNDADMIN-LP-ONBOARDING-KYC", "FUNDADMIN-PCAP-STATEMENTS", "FUNDADMIN-LP-PORTAL"],
  },
  {
    code: "FUND-ADMIN-CAPITAL-CALLS",
    name: "Capital Calls",
    domain: "FUND-ADMIN",
    description: "Capital-call notice generation, LP payment tracking, and call schedule management across funds. Requires approval workflow (GP sign-off, sometimes IC).",
    capabilities: ["FUNDADMIN-CAPITAL-CALLS", "APPROVAL-WORKFLOW"],
  },
  {
    code: "FUND-ADMIN-DISTRIBUTIONS",
    name: "Distributions and Waterfalls",
    domain: "FUND-ADMIN",
    description: "Distribution notice generation with European/American/hybrid waterfall calculations, catchup, clawback, and hurdle-rate handling.",
    capabilities: ["FUNDADMIN-DISTRIBUTION-WATERFALLS"],
  },

  // ===== PORT-MONIT (4 modules) =====
  {
    code: "PORT-MONIT-PORTCO-DATA",
    name: "Portfolio Company Data",
    domain: "PORT-MONIT",
    description: "KPI collection from portfolio companies via portal upload, email parsing, or accounting connectors. Also ESG and diversity metric collection for LP disclosure and SFDR compliance. Masters portfolio companies and the KPI / ESG record streams.",
    capabilities: ["PORTMONIT-KPI-COLLECTION", "PORTMONIT-ESG-DIVERSITY-TRACKING"],
  },
  {
    code: "PORT-MONIT-VALUATIONS",
    name: "Portfolio Valuations",
    domain: "PORT-MONIT",
    description: "Fair-value marks per ASC 820 with methodology-tagged audit trail across reporting cycles. Distinct from CAP-TABLE's 409A valuations (which are issuer-side IRS valuations); these are LP-side fair-value marks.",
    capabilities: ["PORTMONIT-VALUATION-TRACKING"],
  },
  {
    code: "PORT-MONIT-FUND-PERF",
    name: "Fund Performance",
    domain: "PORT-MONIT",
    description: "Time-weighted IRR/MOIC/TVPI/DPI computation across multi-vintage funds with PME benchmarking and J-curve normalization. Aggregate dashboards over portfolio holdings.",
    capabilities: ["PORTMONIT-PERFORMANCE-METRICS", "PORTMONIT-FUND-DASHBOARDS"],
  },
  {
    code: "PORT-MONIT-LP-REPORTING",
    name: "LP Performance Reports",
    domain: "PORT-MONIT",
    description: "Quarterly LP-facing performance reports with fund and individual position metrics. Distinct from FUND-ADMIN's PCAP statements (which are accounting-side capital-account ledgers); these are performance narratives.",
    capabilities: ["PORTMONIT-LP-REPORTS"],
  },

  // ===== CAP-TABLE (6 modules) =====
  {
    code: "CAP-TABLE-LEDGER",
    name: "Shareholder Ledger",
    domain: "CAP-TABLE",
    description: "Authoritative record of equity holders, security classes (common, preferred, SAFE), and the historical transaction log for the issuing company.",
    capabilities: ["CAPTABLE-SHAREHOLDER-LEDGER"],
  },
  {
    code: "CAP-TABLE-GRANTS",
    name: "Equity Grants and Pool Management",
    domain: "CAP-TABLE",
    description: "Option pool tracking (size, available headroom), RSU/option grant issuance with board approval, grant acceptance, vesting-schedule administration. Multi-masters equity_grants alongside COMP-MGMT (which holds the compensation-policy slice).",
    capabilities: ["CAPTABLE-OPTION-POOL-MGMT", "CAPTABLE-GRANT-WORKFLOWS", "APPROVAL-WORKFLOW"],
  },
  {
    code: "CAP-TABLE-VALUATIONS",
    name: "409A and ASC 718",
    domain: "CAP-TABLE",
    description: "IRS 409A fair-market-value determination per methodology (income, market, asset, OPM backsolve), and ASC 718 stock-based compensation expense recognition with Black-Scholes or lattice models.",
    capabilities: ["CAPTABLE-409A-VALUATIONS", "CAPTABLE-ASC718-EXPENSE"],
  },
  {
    code: "CAP-TABLE-EXIT-MODELING",
    name: "Exit Waterfall Modeling",
    domain: "CAP-TABLE",
    description: "Scenario modeling for exit proceeds distribution with multiple preferred-class participation rights, liquidation preferences, and conversion economics.",
    capabilities: ["CAPTABLE-EXIT-WATERFALL-MODELING"],
  },
  {
    code: "CAP-TABLE-EMPLOYEE-PORTAL",
    name: "Employee Equity Portal",
    domain: "CAP-TABLE",
    description: "Employee-facing portal for grant acceptance, vesting visibility, exercise workflows, and tax-document access. Distinct from board-side grant administration (which lives in CAP-TABLE-GRANTS).",
    capabilities: ["CAPTABLE-EMPLOYEE-EQUITY-PORTAL"],
  },
  {
    code: "CAP-TABLE-SECONDARY",
    name: "Secondary Transactions",
    domain: "CAP-TABLE",
    description: "Tender offers, employee liquidity programs, and shareholder-initiated secondary transfers with board-approval workflow.",
    capabilities: ["CAPTABLE-SECONDARY-TRANSACTIONS"],
  },

  // ===== EM-FUND-PLATFORM (4 modules) =====
  // Note: this domain is architecturally bundle-only. Modules represent the analytical
  // decomposition of the bundle, not separately deployable units.
  {
    code: "EM-FUND-FORMATION",
    name: "Fund Formation",
    domain: "EM-FUND-PLATFORM",
    description: "End-to-end fund-vehicle setup: entity formation, EIN application, banking onboarding, and templated LPA. Unique to bundled emerging-manager platforms; not present in modular FUND-ADMIN.",
    capabilities: ["EMFUND-FUND-FORMATION"],
  },
  {
    code: "EM-FUND-SPV",
    name: "SPV Formation and Administration",
    domain: "EM-FUND-PLATFORM",
    description: "Single-deal special-purpose-vehicle creation with templated docs and ongoing admin. Dominant vehicle below ~$25M deal size; competitive sub-segment within the EM bundle.",
    capabilities: ["EMFUND-SPV-FORMATION"],
  },
  {
    code: "EM-FUND-OPS-LITE",
    name: "Lite Fund Operations",
    domain: "EM-FUND-PLATFORM",
    description: "Simplified LP onboarding, capital calls, and LP portal for single-fund single-class structures. Deliberately less complex than the FUND-ADMIN equivalents; the simplification IS the value engineering.",
    capabilities: ["EMFUND-LP-ONBOARDING-LITE", "EMFUND-CAPITAL-CALLS-LITE", "EMFUND-LP-PORTAL-LITE"],
  },
  {
    code: "EM-FUND-CAPTABLE-LITE",
    name: "Lite Cap Table",
    domain: "EM-FUND-PLATFORM",
    description: "Basic shareholder ledger and grant tracking for the GP entity and portfolio cap-table awareness. Not the full ASC 718 / 409A / exit-waterfall machinery of standalone CAP-TABLE.",
    capabilities: ["EMFUND-CAPTABLE-LITE"],
  },
];

// ============================================================
// STARTER JUNCTION (2 per domain = 10 rows)
// ============================================================
type Starter = { domain: string; position: number; module_code: string; notes: string };

const starters: Starter[] = [
  // INV-CRM
  { domain: "INV-CRM", position: 1, module_code: "INV-CRM-DEAL-PIPELINE", notes: "The investment-opportunity backbone — start here. Provides deals, stages, and IC memo workflow. Without it, the relationship graph and LP CRM have nothing to anchor against." },
  { domain: "INV-CRM", position: 2, module_code: "INV-CRM-RELATIONSHIP-GRAPH", notes: "Auto-inferred network graph that turns deal records into a navigable relationship surface. Adds the warm-intro path computation and identity reconciliation." },
  // FUND-ADMIN
  { domain: "FUND-ADMIN", position: 1, module_code: "FUND-ADMIN-FUND-LEDGER", notes: "The fund-accounting core — masters funds and ledger entries. Every other fund-admin module references the fund vehicle this module owns." },
  { domain: "FUND-ADMIN", position: 2, module_code: "FUND-ADMIN-LP-COMMITMENTS", notes: "LP onboarding, PCAP statements, and LP portal. With these two installed you have the minimum recognizable fund-admin product." },
  // PORT-MONIT
  { domain: "PORT-MONIT", position: 1, module_code: "PORT-MONIT-PORTCO-DATA", notes: "Portfolio company data collection — masters portfolio companies and the KPI stream that everything else builds on." },
  { domain: "PORT-MONIT", position: 2, module_code: "PORT-MONIT-VALUATIONS", notes: "Adds the fair-value mark machinery on top of the KPI stream. With these two you can run a portfolio-monitoring product." },
  // CAP-TABLE
  { domain: "CAP-TABLE", position: 1, module_code: "CAP-TABLE-LEDGER", notes: "The shareholder ledger — masters cap tables, security classes, and shareholder records. The structural backbone of any cap-table product." },
  { domain: "CAP-TABLE", position: 2, module_code: "CAP-TABLE-GRANTS", notes: "Option pools and equity grant workflows. With these two installed you have the minimum viable cap-table product (Carta circa 2014)." },
  // EM-FUND-PLATFORM
  { domain: "EM-FUND-PLATFORM", position: 1, module_code: "EM-FUND-FORMATION", notes: "Fund formation — the entry point. Without forming the fund vehicle there's nothing else to administer." },
  { domain: "EM-FUND-PLATFORM", position: 2, module_code: "EM-FUND-OPS-LITE", notes: "Lite LP onboarding + capital calls + portal. With formation and ops-lite installed, a solo GP can run an emerging-manager fund end-to-end." },
];

// ============================================================
// RUN
// ============================================================
async function main() {
  // 1. Look up domain ids
  const domainCodes = Array.from(new Set(modules.map(m => m.domain)));
  const domainRows = await get(`/domains?domain_code=in.(${domainCodes.join(",")})&select=id,domain_code`);
  const domainMap = new Map<string, number>();
  for (const r of domainRows) domainMap.set(String(r.domain_code), Number(r.id));
  if (domainMap.size !== domainCodes.length) {
    throw new Error(`Missing domains: ${domainCodes.filter(c => !domainMap.has(c)).join(", ")}`);
  }

  // 2. Look up capability ids (mix of new domain-prefixed + existing cross-cutting)
  const allCaps = Array.from(new Set(modules.flatMap(m => m.capabilities)));
  const capRows = await get(`/capabilities?capability_code=in.(${allCaps.join(",")})&select=id,capability_code`);
  const capMap = new Map<string, number>();
  for (const r of capRows) capMap.set(String(r.capability_code), Number(r.id));
  if (capMap.size !== allCaps.length) {
    throw new Error(`Missing capabilities: ${allCaps.filter(c => !capMap.has(c)).join(", ")}`);
  }

  // 3. Insert domain_modules
  console.log("\n=== domain_modules ===");
  const moduleRows = modules.map(m => ({
    domain_module_code: m.code,
    domain_module_name: m.name,
    domain_id: domainMap.get(m.domain)!,
    description: m.description,
  }));
  const moduleMap = await syncTable("/domain_modules", moduleRows, "domain_module_code");

  // 4. Insert domain_module_capabilities
  console.log("\n=== domain_module_capabilities ===");
  const existingMC = await get("/domain_module_capabilities?select=domain_module_id,capability_id&limit=10000");
  const existingMCSet = new Set(existingMC.map(r => `${r.domain_module_id}:${r.capability_id}`));
  const newMCs: Row[] = [];
  for (const m of modules) {
    const mid = moduleMap.get(m.code)!;
    for (const cc of m.capabilities) {
      const cid = capMap.get(cc)!;
      const key = `${mid}:${cid}`;
      if (!existingMCSet.has(key)) {
        existingMCSet.add(key);
        newMCs.push({ domain_module_id: mid, capability_id: cid });
      }
    }
  }
  if (newMCs.length > 0) {
    console.log(`  inserting ${newMCs.length} new domain_module_capabilities rows`);
    await insert("/domain_module_capabilities", newMCs);
  } else {
    console.log(`  domain_module_capabilities: nothing to insert`);
  }

  // 5. Insert domain_starter_modules
  console.log("\n=== domain_starter_modules ===");
  const existingSM = await get("/domain_starter_modules?select=domain_id,domain_module_id&limit=10000");
  const existingSMSet = new Set(existingSM.map(r => `${r.domain_id}:${r.domain_module_id}`));
  const newSMs: Row[] = [];
  for (const s of starters) {
    const did = domainMap.get(s.domain)!;
    const mid = moduleMap.get(s.module_code)!;
    const key = `${did}:${mid}`;
    if (!existingSMSet.has(key)) {
      existingSMSet.add(key);
      newSMs.push({
        domain_id: did,
        domain_module_id: mid,
        position: s.position,
        notes: s.notes,
      });
    }
  }
  if (newSMs.length > 0) {
    console.log(`  inserting ${newSMs.length} new domain_starter_modules rows`);
    await insert("/domain_starter_modules", newSMs);
  } else {
    console.log(`  domain_starter_modules: nothing to insert`);
  }

  // Summary
  console.log("\n=== Summary ===");
  const newDomainIds = Array.from(domainMap.values());
  const modCount = (await get(`/domain_modules?domain_id=in.(${newDomainIds.join(",")})&select=id`)).length;
  const mcCount = (await get(`/domain_module_capabilities?select=id&domain_module_id=in.(${Array.from(moduleMap.values()).join(",")})`)).length;
  const smCount = (await get(`/domain_starter_modules?domain_id=in.(${newDomainIds.join(",")})&select=id`)).length;
  console.log({ modules: modCount, module_capability_links: mcCount, starter_modules: smCount });
}

await main();
console.log("\nDone.");
