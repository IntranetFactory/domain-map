#!/usr/bin/env bun
// Loads MSP-PSA market (Phase A + B) plus BF mapping for MSP-PSA.
// Phase A — 6 caps, 2 new vendors, 4 new solutions, capability_domains, solution_domains,
//           solution_capabilities for new solutions + cross-coverage from RMM bundlers.
// Phase B — 5 data_objects MSP-PSA masters, 9 domain_data_objects, 3 cross_domain_handoffs.
// BF     — MSP-PSA → IT Operations (owner), Finance (contributor), Business Operations (contributor).

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
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
async function get(path: string): Promise<Row[]> { return call({ method: "GET", path }); }
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50; const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    out.push(...(await call({ method: "POST", path, body: slice })));
  }
  return out;
}
async function syncTable<T extends Row>(path: string, rows: T[], keyField: keyof T & string): Promise<Map<string, number>> {
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
// CAPABILITIES (under MSP-PSA)
// ============================================================
const capabilities = [
  { capability_code: "MSP-TICKET", capability_name: "Multi-Tenant Service Ticketing",
    domain: "MSP-PSA",
    description: "Ticket lifecycle (create, route, work, escalate, close) with mandatory customer-tenant tagging, per-customer SLAs, and time-tracked work logs that flow into billing." },
  { capability_code: "MSP-CONTRACT", capability_name: "MSP Service Contract Management",
    domain: "MSP-PSA",
    description: "Multi-flavour service contracts (block-hour, retainer, value-based, per-device, managed-services), with consumption tracking, renewal management, and per-contract SLA terms." },
  { capability_code: "MSP-BILLING", capability_name: "MSP Recurring Billing and Invoicing",
    domain: "MSP-PSA",
    description: "Recurring billing of managed-services subscriptions, on-demand billing of out-of-contract work, contract-true-up and proration, and tax-aware invoice generation with QuickBooks/Xero/Sage handoff." },
  { capability_code: "MSP-TIME", capability_name: "Technician Time and Activity Tracking",
    domain: "MSP-PSA",
    description: "Per-ticket / per-contract / per-customer time entries with category tagging, billable/non-billable classification, approval workflow, and feed into payroll and billing." },
  { capability_code: "MSP-DISPATCH", capability_name: "Technician Dispatch and Scheduling",
    domain: "MSP-PSA",
    description: "Calendar-aware technician assignment to tickets and on-site visits, with skills-matching, geographic optimization, and team-capacity views." },
  { capability_code: "MSP-CSAT", capability_name: "Customer Portal and CSAT",
    domain: "MSP-PSA",
    description: "Customer-facing portal for ticket submission, status, knowledge base access, and post-resolution CSAT surveys feeding NPS/CSAT scoring." },
];

// ============================================================
// VENDORS (2 new; reuse Kaseya, ConnectWise, Atera, Syncro, SuperOps, Zoho)
// ============================================================
const newVendors = [
  { vendor_name: "Halo Service Solutions Ltd.",
    vendor_url: "https://halopsa.com",
    headquarters_country: "UK",
    description: "MSP-PSA and ITSM software vendor (Halo PSA, HaloITSM, HaloCRM).",
    notes: "HQ Stowmarket, UK. Independent, founded as NetHelpDesk (1994), rebranded as Halo Service Solutions 2019. Halo PSA is a flagship-grade alternative to ConnectWise PSA and Autotask for MSPs." },
  { vendor_name: "Tigerpaw Software, Inc.",
    vendor_url: "https://www.tigerpawsoftware.com",
    headquarters_country: "USA",
    description: "PSA / business-management software vendor for MSPs, technology integrators, and AV/security dealers.",
    notes: "Founded 1984, HQ Bellevue NE. Independent. Tigerpaw One covers PSA + lightweight CRM + inventory; targets converged MSP/AV/security-dealer market." },
];

// ============================================================
// SOLUTIONS (4 new; the existing Atera/Syncro/SuperOps/NinjaOne/ConnectWise-RMM already cover MSP-PSA)
// ============================================================
type SolutionSpec = {
  solution_name: string; vendor: string;
  solution_type: "saas" | "on_prem" | "hybrid" | "open_source" | "internal_build" | "manual_process";
  solution_url: string; description: string; notes?: string;
  primary?: string[]; secondary?: string[]; partial?: string[];
};
const newSolutions: SolutionSpec[] = [
  { solution_name: "ConnectWise PSA", vendor: "ConnectWise LLC", solution_type: "saas",
    solution_url: "https://www.connectwise.com/platform/business-management/psa",
    description: "ConnectWise's flagship PSA (formerly ConnectWise Manage): multi-tenant ticketing, contracts (block-hour/agreement/per-device), time tracking, billing, dispatch, and customer portal. The MSP industry-standard PSA.",
    notes: "Rebranded from ConnectWise Manage in 2022 as part of the broader Asio-platform unification.",
    primary: ["MSP-PSA"], secondary: ["ITSM", "PSA"] },
  { solution_name: "Autotask PSA", vendor: "Kaseya Limited", solution_type: "saas",
    solution_url: "https://www.datto.com/products/autotask-psa/",
    description: "MSP PSA acquired with Datto (2017 → 2022): multi-tenant ticketing, contracts, dispatch, project management, time/expense, billing, and tight integration with Datto RMM and Kaseya VSA.",
    notes: "Originally Autotask Corp; acquired by Vista Equity Partners (2014), then merged with Datto (2017), then acquired by Kaseya (2022).",
    primary: ["MSP-PSA"], secondary: ["ITSM", "PSA"] },
  { solution_name: "Halo PSA", vendor: "Halo Service Solutions Ltd.", solution_type: "saas",
    solution_url: "https://halopsa.com",
    description: "Modern MSP PSA: ticketing, contracts (block, retainer, fixed-fee, project), time, billing, dispatch, asset management, and customer portal. Positioned as an alternative to ConnectWise PSA/Autotask with stronger UX.",
    primary: ["MSP-PSA"], secondary: ["ITSM"] },
  { solution_name: "Tigerpaw One", vendor: "Tigerpaw Software, Inc.", solution_type: "hybrid",
    solution_url: "https://www.tigerpawsoftware.com",
    description: "Business-management platform for MSPs / technology integrators / AV-security dealers: PSA ticketing, contracts, inventory, lightweight CRM, mobile field service.",
    primary: ["MSP-PSA"], partial: ["ITSM"] },
];

// ============================================================
// SOLUTION_CAPABILITIES — score new MSP-PSA solutions + cross-coverage
// ============================================================
type SolCapSpec = {
  solution: string; capability: string;
  delivery_strength: "native" | "partial" | "via_extension" | "not_supported";
  notes?: string;
};
const solCaps: SolCapSpec[] = [
  // ConnectWise PSA — flagship MSP PSA
  { solution: "ConnectWise PSA", capability: "MSP-TICKET", delivery_strength: "native" },
  { solution: "ConnectWise PSA", capability: "MSP-CONTRACT", delivery_strength: "native" },
  { solution: "ConnectWise PSA", capability: "MSP-BILLING", delivery_strength: "native" },
  { solution: "ConnectWise PSA", capability: "MSP-TIME", delivery_strength: "native" },
  { solution: "ConnectWise PSA", capability: "MSP-DISPATCH", delivery_strength: "native" },
  { solution: "ConnectWise PSA", capability: "MSP-CSAT", delivery_strength: "native" },
  // Autotask PSA
  { solution: "Autotask PSA", capability: "MSP-TICKET", delivery_strength: "native" },
  { solution: "Autotask PSA", capability: "MSP-CONTRACT", delivery_strength: "native" },
  { solution: "Autotask PSA", capability: "MSP-BILLING", delivery_strength: "native" },
  { solution: "Autotask PSA", capability: "MSP-TIME", delivery_strength: "native" },
  { solution: "Autotask PSA", capability: "MSP-DISPATCH", delivery_strength: "native" },
  { solution: "Autotask PSA", capability: "MSP-CSAT", delivery_strength: "native" },
  // Halo PSA
  { solution: "Halo PSA", capability: "MSP-TICKET", delivery_strength: "native" },
  { solution: "Halo PSA", capability: "MSP-CONTRACT", delivery_strength: "native" },
  { solution: "Halo PSA", capability: "MSP-BILLING", delivery_strength: "native" },
  { solution: "Halo PSA", capability: "MSP-TIME", delivery_strength: "native" },
  { solution: "Halo PSA", capability: "MSP-DISPATCH", delivery_strength: "native" },
  { solution: "Halo PSA", capability: "MSP-CSAT", delivery_strength: "native" },
  // Tigerpaw One
  { solution: "Tigerpaw One", capability: "MSP-TICKET", delivery_strength: "native" },
  { solution: "Tigerpaw One", capability: "MSP-CONTRACT", delivery_strength: "native" },
  { solution: "Tigerpaw One", capability: "MSP-BILLING", delivery_strength: "native" },
  { solution: "Tigerpaw One", capability: "MSP-TIME", delivery_strength: "native" },
  { solution: "Tigerpaw One", capability: "MSP-DISPATCH", delivery_strength: "partial" },
  { solution: "Tigerpaw One", capability: "MSP-CSAT", delivery_strength: "partial" },

  // Existing all-in-one RMM bundlers with MSP-PSA coverage — cross-score on new MSP-PSA caps
  { solution: "Atera", capability: "MSP-TICKET", delivery_strength: "native" },
  { solution: "Atera", capability: "MSP-CONTRACT", delivery_strength: "native", notes: "Block-hour, retainer, and value-based contracts." },
  { solution: "Atera", capability: "MSP-BILLING", delivery_strength: "native", notes: "QuickBooks/Xero integration." },
  { solution: "Atera", capability: "MSP-TIME", delivery_strength: "native" },
  { solution: "Atera", capability: "MSP-DISPATCH", delivery_strength: "partial" },
  { solution: "Atera", capability: "MSP-CSAT", delivery_strength: "native" },
  { solution: "Syncro", capability: "MSP-TICKET", delivery_strength: "native" },
  { solution: "Syncro", capability: "MSP-CONTRACT", delivery_strength: "native" },
  { solution: "Syncro", capability: "MSP-BILLING", delivery_strength: "native" },
  { solution: "Syncro", capability: "MSP-TIME", delivery_strength: "native" },
  { solution: "Syncro", capability: "MSP-DISPATCH", delivery_strength: "partial" },
  { solution: "Syncro", capability: "MSP-CSAT", delivery_strength: "partial" },
  { solution: "SuperOps", capability: "MSP-TICKET", delivery_strength: "native" },
  { solution: "SuperOps", capability: "MSP-CONTRACT", delivery_strength: "native" },
  { solution: "SuperOps", capability: "MSP-BILLING", delivery_strength: "native" },
  { solution: "SuperOps", capability: "MSP-TIME", delivery_strength: "native" },
  { solution: "SuperOps", capability: "MSP-DISPATCH", delivery_strength: "partial" },
  { solution: "SuperOps", capability: "MSP-CSAT", delivery_strength: "partial" },
  { solution: "NinjaOne", capability: "MSP-TICKET", delivery_strength: "native", notes: "Native ticketing module added 2022; lighter than pure-play PSAs." },
  { solution: "NinjaOne", capability: "MSP-CONTRACT", delivery_strength: "partial" },
  { solution: "NinjaOne", capability: "MSP-BILLING", delivery_strength: "via_extension", notes: "Typically paired with ConnectWise PSA / Autotask for billing." },
  { solution: "NinjaOne", capability: "MSP-TIME", delivery_strength: "partial" },
  { solution: "NinjaOne", capability: "MSP-DISPATCH", delivery_strength: "partial" },
  { solution: "NinjaOne", capability: "MSP-CSAT", delivery_strength: "partial" },
  { solution: "ConnectWise RMM", capability: "MSP-TICKET", delivery_strength: "via_extension", notes: "Pairs with ConnectWise PSA for ticketing." },
  { solution: "ConnectWise RMM", capability: "MSP-CONTRACT", delivery_strength: "via_extension" },
  { solution: "ConnectWise RMM", capability: "MSP-BILLING", delivery_strength: "via_extension" },
  { solution: "ConnectWise RMM", capability: "MSP-TIME", delivery_strength: "via_extension" },
  { solution: "ConnectWise RMM", capability: "MSP-DISPATCH", delivery_strength: "via_extension" },
  { solution: "ConnectWise RMM", capability: "MSP-CSAT", delivery_strength: "via_extension" },
];

// ============================================================
// DATA OBJECTS (MSP-PSA masters)
// ============================================================
const newDataObjects = [
  { data_object_name: "msp_tickets", singular_label: "MSP Ticket", plural_label: "MSP Tickets", display_label: "MSP Ticket",
    description: "Billable service ticket against an MSP service contract: customer tenant, contract reference, time-tracked work logs, billable/non-billable category, SLA timer, dispatch state. Distinct from ITSM-mastered incidents (internal-IT-flavored) — same shape, different buyer and lifecycle." },
  { data_object_name: "msp_contracts", singular_label: "MSP Service Contract", plural_label: "MSP Service Contracts", display_label: "MSP Service Contract",
    description: "Multi-flavour service contract between an MSP and an end-customer: block-hour, retainer, value-based, per-device, or managed-services. Tracks consumption, renewal dates, SLA terms, and per-contract billing rules." },
  { data_object_name: "msp_time_entries", singular_label: "MSP Time Entry", plural_label: "MSP Time Entries", display_label: "MSP Time Entry",
    description: "Per-ticket / per-contract / per-customer technician time entry, with category tagging, billable/non-billable classification, approval state, and downstream feed into payroll and billing." },
  { data_object_name: "msp_invoices", singular_label: "MSP Customer Invoice", plural_label: "MSP Customer Invoices", display_label: "MSP Customer Invoice",
    description: "Invoice generated by the MSP to its end-customer: recurring service-subscription line items + out-of-contract billable work + tax. Distinct from customer_invoices (SUB-MGMT, software-vendor-issued) and invoices (S2P, AP-side)." },
  { data_object_name: "msp_clients", singular_label: "MSP Client Organization", plural_label: "MSP Client Organizations", display_label: "MSP Client Organization",
    description: "An MSP's end-customer organization: site/location hierarchy, contact directory, contract portfolio, and asset estate. The MSP's view of its client roster; distinct from customers (which represent product-company customers in CRM/CSM context)." },
];

// ============================================================
// DOMAIN_DATA_OBJECTS
// ============================================================
type DdoSpec = { domain_code: string; data_object_name: string; role: "master" | "contributor" | "consumer" | "derived"; notes?: string };
const ddoRows: DdoSpec[] = [
  // MSP-PSA masters
  { domain_code: "MSP-PSA", data_object_name: "msp_tickets", role: "master", notes: "Billable tickets against MSP contracts; distinct lifecycle from ITSM incidents." },
  { domain_code: "MSP-PSA", data_object_name: "msp_contracts", role: "master", notes: "Service contracts with consumption tracking and renewal management." },
  { domain_code: "MSP-PSA", data_object_name: "msp_time_entries", role: "master", notes: "Technician time entries feeding payroll and billing." },
  { domain_code: "MSP-PSA", data_object_name: "msp_invoices", role: "master", notes: "MSP-to-customer invoices; AR side from the MSP perspective." },
  { domain_code: "MSP-PSA", data_object_name: "msp_clients", role: "master", notes: "MSP's roster of end-customer organizations." },
  // MSP-PSA contributors / consumers
  { domain_code: "MSP-PSA", data_object_name: "alerts", role: "consumer",
    notes: "Consumes RMM-generated alerts as ticket-creation triggers in the MSP queue." },
  { domain_code: "MSP-PSA", data_object_name: "rmm_agents", role: "consumer",
    notes: "Reads RMM agent inventory per customer to target remote sessions and report covered estate." },
  { domain_code: "MSP-PSA", data_object_name: "incidents", role: "contributor",
    notes: "Optional contribution: when MSP-PSA tickets correlate to a customer's internal ITSM incidents (rare; mostly orthogonal markets)." },
  { domain_code: "MSP-PSA", data_object_name: "hardware_assets", role: "consumer",
    notes: "Reads customer-asset inventory per ticket context (which device the ticket is about)." },
];

// ============================================================
// CROSS_DOMAIN_HANDOFFS
// ============================================================
type HandoffSpec = {
  source_domain_code: string; target_domain_code: string; data_object_name: string;
  trigger_event: string;
  integration_pattern: "event_stream" | "api_call" | "batch_sync" | "manual_handoff" | "file_drop";
  friction_level: "high" | "medium" | "low";
  description: string; notes?: string;
};
const handoffs: HandoffSpec[] = [
  { source_domain_code: "RMM", target_domain_code: "MSP-PSA", data_object_name: "msp_tickets",
    trigger_event: "alert.threshold_breached",
    integration_pattern: "api_call", friction_level: "medium",
    description: "RMM monitoring alert breaches a policy threshold and creates an MSP-PSA ticket in the affected customer's queue, with telemetry snapshot, endpoint context, and SLA-aware priority. Friction is lower than the RMM→ITSM equivalent in same-vendor stacks (ConnectWise RMM↔PSA, Datto RMM↔Autotask, Atera unified) but rises in cross-vendor MSP stacks.",
    notes: "Same alert-to-ticket pattern as RMM→ITSM; native in unified vendor stacks, friction high in cross-vendor combinations." },
  { source_domain_code: "MSP-PSA", target_domain_code: "REMOTE-ACCESS", data_object_name: "msp_tickets",
    trigger_event: "ticket.escalated",
    integration_pattern: "manual_handoff", friction_level: "medium",
    description: "Tier-1 ticket escalates to a remote-session need; technician launches the remote-control tool against the affected endpoint. Failure modes: ticket-to-endpoint mapping is hostname-based and breaks for shifting laptop names; session recording rarely auto-links back to the ticket.",
    notes: "Parallel to ITSM→RMM ticket.escalated handoff." },
  { source_domain_code: "MSP-PSA", target_domain_code: "HAM", data_object_name: "hardware_assets",
    trigger_event: "ticket.created",
    integration_pattern: "api_call", friction_level: "low",
    description: "New MSP ticket references a specific customer-owned asset; HAM (or the MSP's asset register equivalent) provides device metadata, warranty status, and asset history. Low-friction in unified stacks where assets are mastered inside the PSA itself.",
    notes: "Most MSP PSAs include native asset registers — this handoff is internal in same-tool stacks but cross-domain when an external asset register is canonical." },
];

// ============================================================
// BUSINESS_FUNCTION_DOMAINS for MSP-PSA
// ============================================================
type BfdSpec = { bf_name: string; domain_code: string; responsibility_type: "owner" | "contributor" | "consumer"; notes?: string };
const bfdRows: BfdSpec[] = [
  { bf_name: "IT Operations", domain_code: "MSP-PSA", responsibility_type: "owner",
    notes: "MSP-PSA is operated by an MSP's IT-operations/service-delivery team. For internal-IT buyers (Atera/Syncro dual-use), it serves IT Operations directly." },
  { bf_name: "Finance", domain_code: "MSP-PSA", responsibility_type: "contributor",
    notes: "Finance consumes invoicing output and approves billing rules; MSP-PSA contributes recurring-revenue data to financial reporting." },
  { bf_name: "Business Operations", domain_code: "MSP-PSA", responsibility_type: "contributor",
    notes: "Business operations owns utilization reporting, technician productivity, and customer-profitability analytics derived from MSP-PSA data." },
];

// ============================================================
// RUN
// ============================================================
async function main() {
  console.log("\n=== Domain map lookup ===");
  const allDomainsRaw = await get("/domains?select=id,domain_code&limit=10000");
  const allDomainMap = new Map<string, number>();
  for (const d of allDomainsRaw) allDomainMap.set(String(d.domain_code), Number(d.id));

  console.log("\n=== Capabilities (under MSP-PSA) ===");
  const capRows = capabilities.map(c => ({
    capability_code: c.capability_code, capability_name: c.capability_name, description: c.description,
  }));
  const capMap = await syncTable("/capabilities", capRows, "capability_code");

  console.log("\n=== capability_domains ===");
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
  } else console.log("  no new capability_domains rows");

  console.log("\n=== Vendors ===");
  const vendorMap = await syncTable("/vendors", newVendors.map(v => ({ ...v })), "vendor_name");
  const allVendorsRaw = await get("/vendors?select=id,vendor_name&limit=10000");
  for (const v of allVendorsRaw) vendorMap.set(String(v.vendor_name), Number(v.id));

  console.log("\n=== Solutions ===");
  const solutionRows = newSolutions.map(s => {
    const vendorId = vendorMap.get(s.vendor);
    if (!vendorId) throw new Error(`Vendor not found for solution ${s.solution_name}: ${s.vendor}`);
    return {
      solution_name: s.solution_name, description: s.description,
      solution_url: s.solution_url, vendor_id: vendorId,
      solution_type: s.solution_type, is_active_in_market: true, notes: s.notes ?? "",
    };
  });
  await syncTable("/solutions", solutionRows, "solution_name");
  const allSolutionsRaw = await get("/solutions?select=id,solution_name&limit=10000");
  const solutionMap = new Map<string, number>();
  for (const r of allSolutionsRaw) solutionMap.set(String(r.solution_name), Number(r.id));

  console.log("\n=== solution_domains ===");
  const existingSolDomLinks = await get("/solution_domains?select=solution_id,domain_id,coverage_level&limit=10000");
  const existingSolDomSet = new Set(existingSolDomLinks.map(r => `${r.solution_id}:${r.domain_id}:${r.coverage_level}`));
  const newSolDomRows: Row[] = [];
  let skippedSolDom = 0;
  for (const s of newSolutions) {
    const sid = solutionMap.get(s.solution_name)!;
    const buildLink = (code: string, coverage: "primary" | "secondary" | "partial") => {
      const did = allDomainMap.get(code);
      if (!did) { console.warn(`  ! domain ${code} not found`); return; }
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
  } else console.log(`  no new solution_domains rows (${skippedSolDom} already present)`);

  console.log("\n=== solution_capabilities ===");
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
    newSolCapRows.push({ solution_id: sid, capability_id: cid, delivery_strength: sc.delivery_strength, notes: sc.notes ?? "" });
  }
  if (newSolCapRows.length > 0) {
    console.log(`  inserting ${newSolCapRows.length} solution_capabilities rows (${skippedSolCap} already present)`);
    await insert("/solution_capabilities", newSolCapRows);
  } else console.log(`  no new solution_capabilities rows (${skippedSolCap} already present)`);

  console.log("\n=== Data objects ===");
  const existingDoRaw = await get("/data_objects?select=id,data_object_name&limit=10000");
  const existingDoNames = new Set(existingDoRaw.map(r => String(r.data_object_name)));
  const missingDo = newDataObjects.filter(d => !existingDoNames.has(d.data_object_name));
  if (missingDo.length > 0) {
    console.log(`  inserting ${missingDo.length} new data_objects`);
    await insert("/data_objects", missingDo);
  } else console.log(`  no new data_objects to insert`);
  const allDoRaw = await get("/data_objects?select=id,data_object_name&limit=10000");
  const doMap = new Map<string, number>();
  for (const r of allDoRaw) doMap.set(String(r.data_object_name), Number(r.id));

  console.log("\n=== domain_data_objects ===");
  const existingDdoRaw = await get("/domain_data_objects?select=domain_id,data_object_id,role&limit=10000");
  const existingDdoSet = new Set(existingDdoRaw.map(r => `${r.domain_id}:${r.data_object_id}:${r.role}`));
  const newDdoRows: Row[] = [];
  let skippedDdo = 0;
  for (const d of ddoRows) {
    const did = allDomainMap.get(d.domain_code);
    const oid = doMap.get(d.data_object_name);
    if (!did) throw new Error(`Domain not found: ${d.domain_code}`);
    if (!oid) throw new Error(`Data object not found: ${d.data_object_name}`);
    const key = `${did}:${oid}:${d.role}`;
    if (existingDdoSet.has(key)) { skippedDdo++; continue; }
    existingDdoSet.add(key);
    newDdoRows.push({ domain_id: did, data_object_id: oid, role: d.role, notes: d.notes ?? "" });
  }
  if (newDdoRows.length > 0) {
    console.log(`  inserting ${newDdoRows.length} domain_data_objects (${skippedDdo} already present)`);
    await insert("/domain_data_objects", newDdoRows);
  } else console.log(`  no new domain_data_objects (${skippedDdo} already present)`);

  console.log("\n=== cross_domain_handoffs ===");
  const existingHandoffsRaw = await get("/cross_domain_handoffs?select=source_domain_id,target_domain_id,data_object_id,trigger_event&limit=10000");
  const existingHandoffSet = new Set(existingHandoffsRaw.map(r => `${r.source_domain_id}:${r.target_domain_id}:${r.data_object_id}:${r.trigger_event}`));
  const newHandoffRows: Row[] = [];
  let skippedHandoff = 0;
  for (const h of handoffs) {
    const src = allDomainMap.get(h.source_domain_code);
    const tgt = allDomainMap.get(h.target_domain_code);
    const oid = doMap.get(h.data_object_name);
    if (!src || !tgt || !oid) throw new Error(`FK lookup failed for ${h.trigger_event}`);
    const key = `${src}:${tgt}:${oid}:${h.trigger_event}`;
    if (existingHandoffSet.has(key)) { skippedHandoff++; continue; }
    existingHandoffSet.add(key);
    newHandoffRows.push({
      source_domain_id: src, target_domain_id: tgt, data_object_id: oid,
      trigger_event: h.trigger_event, integration_pattern: h.integration_pattern,
      friction_level: h.friction_level, description: h.description, notes: h.notes ?? "",
    });
  }
  if (newHandoffRows.length > 0) {
    console.log(`  inserting ${newHandoffRows.length} cross_domain_handoffs (${skippedHandoff} already present)`);
    await insert("/cross_domain_handoffs", newHandoffRows);
  } else console.log(`  no new cross_domain_handoffs (${skippedHandoff} already present)`);

  console.log("\n=== business_function_domains ===");
  const allBfsRaw = await get("/business_functions?select=id,business_function_name&limit=10000");
  const bfMap = new Map<string, number>();
  for (const r of allBfsRaw) bfMap.set(String(r.business_function_name), Number(r.id));
  const existingBfdRaw = await get("/business_function_domains?select=business_function_id,domain_id,responsibility_type&limit=10000");
  const existingBfdSet = new Set(existingBfdRaw.map(r => `${r.business_function_id}:${r.domain_id}:${r.responsibility_type}`));
  const newBfdRows: Row[] = [];
  let skippedBfd = 0;
  for (const b of bfdRows) {
    const bfid = bfMap.get(b.bf_name);
    const did = allDomainMap.get(b.domain_code);
    if (!bfid) throw new Error(`BF not found: ${b.bf_name}`);
    if (!did) throw new Error(`Domain not found: ${b.domain_code}`);
    const key = `${bfid}:${did}:${b.responsibility_type}`;
    if (existingBfdSet.has(key)) { skippedBfd++; continue; }
    existingBfdSet.add(key);
    newBfdRows.push({
      business_function_id: bfid, domain_id: did,
      responsibility_type: b.responsibility_type, notes: b.notes ?? "",
    });
  }
  if (newBfdRows.length > 0) {
    console.log(`  inserting ${newBfdRows.length} business_function_domains (${skippedBfd} already present)`);
    await insert("/business_function_domains", newBfdRows);
  } else console.log(`  no new business_function_domains (${skippedBfd} already present)`);

  console.log("\n=== Done. ===");
}
await main();
