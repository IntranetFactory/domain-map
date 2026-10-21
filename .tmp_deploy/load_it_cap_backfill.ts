#!/usr/bin/env bun
// Capability backfill for the IT cluster.
// Step 1 — define 21 new capabilities under ITOM, HAM, SAM, UEM (these domains had zero capabilities).
// Step 2 — score solution_capabilities for the 23 new IT-cluster solutions (11 RMM + 4 MSP-PSA + 8 REMOTE-ACCESS)
//          against:
//          - existing 19 ITSM capabilities (where solution_domains coverage exists on ITSM)
//          - the new HAM / SAM / UEM capabilities (where coverage exists)
// Step 3 — add 3 business_function_domains rows for RMM (IT Operations / Security / Business Operations).
//
// Only positive scores (native / partial / via_extension) are inserted. Absence = not_supported.
// Idempotent: composite-key dedup on every junction.

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
  } else console.log(`  ${path}: ${existing.length} already present`);
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// ============================================================
// NEW CAPABILITIES — ITOM, HAM, SAM, UEM
// ============================================================
const newCapabilities = [
  // ITOM (6)
  { capability_code: "ITOM-INFRA-MON", capability_name: "Infrastructure Monitoring", domain: "ITOM",
    description: "Server, network, storage, hypervisor, and container monitoring with metric collection, dashboards, and topology-aware alerting." },
  { capability_code: "ITOM-EVENT-MGT", capability_name: "Event Management and Correlation", domain: "ITOM",
    description: "Ingestion, normalization, de-duplication, and correlation of events from disparate monitoring tools into a unified operational view." },
  { capability_code: "ITOM-LOG", capability_name: "Log Aggregation and Analysis", domain: "ITOM",
    description: "Centralized collection, indexing, and querying of system and application logs with retention policies and alert-on-pattern." },
  { capability_code: "ITOM-JOB-SCHED", capability_name: "Job Scheduling and Workload Automation", domain: "ITOM",
    description: "Enterprise job scheduling, batch automation, cross-platform workflow orchestration, and dependency-aware execution." },
  { capability_code: "ITOM-CAPACITY", capability_name: "Capacity Planning", domain: "ITOM",
    description: "Trend analysis, forecasting, and what-if modelling of compute / storage / network / licence consumption for proactive scaling." },
  { capability_code: "ITOM-RUNBOOK", capability_name: "Runbook Automation", domain: "ITOM",
    description: "Codified operational runbooks for common incidents and maintenance tasks, executed via the ops tool with approval gates." },

  // HAM (5)
  { capability_code: "HAM-DISCOVERY", capability_name: "Hardware Asset Discovery", domain: "HAM",
    description: "Active and passive discovery of physical IT hardware assets (laptops, desktops, servers, network gear, mobiles, peripherals) with normalization to canonical asset records." },
  { capability_code: "HAM-LIFECYCLE", capability_name: "Hardware Asset Lifecycle Tracking", domain: "HAM",
    description: "End-to-end lifecycle state of each asset (procurement, deployment, in-use, retirement, disposal) with stakeholder ownership and movement history." },
  { capability_code: "HAM-FINANCIAL", capability_name: "Asset Financial Records", domain: "HAM",
    description: "Cost basis, depreciation schedule, residual value, and capitalization data per asset, plus aggregated reporting for finance/audit." },
  { capability_code: "HAM-WARRANTY", capability_name: "Warranty and Contract Tracking", domain: "HAM",
    description: "OEM warranty windows, third-party maintenance contracts, expiry alerting, and renewal/extension workflows tied to individual assets." },
  { capability_code: "HAM-DISPOSAL", capability_name: "Asset Disposal and Decommissioning", domain: "HAM",
    description: "Decommission workflow with data-sanitization evidence, chain-of-custody, e-waste vendor disposition, and audit trail." },

  // SAM (5)
  { capability_code: "SAM-DISCOVERY", capability_name: "Software Installation Discovery", domain: "SAM",
    description: "Agent-based and agent-less discovery of installed software and SaaS usage across endpoints, with publisher/product normalization." },
  { capability_code: "SAM-ENTITLEMENT", capability_name: "Entitlement Reconciliation", domain: "SAM",
    description: "Matching installed/used software against purchased entitlements (licences, agreements, true-up commitments) with deficit/surplus reporting." },
  { capability_code: "SAM-AUDIT", capability_name: "Audit Defence and Compliance Reporting", domain: "SAM",
    description: "Evidence collection, deployment/usage attestation, and reporting packages tailored to vendor audit demands (Microsoft, Oracle, IBM, SAP)." },
  { capability_code: "SAM-METER", capability_name: "Usage Metering and Optimization", domain: "SAM",
    description: "Last-used and frequency metering per installed application with reclamation workflows for unused or low-use licences." },
  { capability_code: "SAM-RENEWAL", capability_name: "Software Renewal Management", domain: "SAM",
    description: "Tracking renewal dates, true-up windows, contract co-termination, and renewal-decision workflow with finance/legal collaboration." },

  // UEM (5)
  { capability_code: "UEM-MDM", capability_name: "Mobile Device Management (iOS / Android / ChromeOS)", domain: "UEM",
    description: "Mobile-OS-native enrolment, configuration, app distribution, compliance enforcement, and remote wipe across iOS, Android, and ChromeOS." },
  { capability_code: "UEM-CONFIG", capability_name: "Configuration Profile Management", domain: "UEM",
    description: "Centralized authoring and deployment of OS-level configuration profiles (Wi-Fi, VPN, certificate, restrictions) across endpoint classes." },
  { capability_code: "UEM-APP-DIST", capability_name: "Application Distribution and Patching", domain: "UEM",
    description: "Curated app catalog, silent install/update, version pinning, and rollback across managed endpoints." },
  { capability_code: "UEM-ZTP", capability_name: "Zero-Touch Provisioning", domain: "UEM",
    description: "Out-of-box enrolment workflows (Apple Business Manager, Windows Autopilot, Android Zero-Touch) with policy assignment before device handoff." },
  { capability_code: "UEM-COMPLIANCE", capability_name: "Endpoint Compliance Policy", domain: "UEM",
    description: "Policy-driven posture evaluation (OS version, encryption, jailbreak detection, antivirus state) with conditional-access enforcement." },
];

// ============================================================
// SOLUTION_CAPABILITIES — sparse matrix
// Each entry: (solution, capability, strength, notes?). Absent pairs default to not_supported.
// ============================================================
type SolCapSpec = {
  solution: string; capability: string;
  delivery_strength: "native" | "partial" | "via_extension" | "not_supported";
  notes?: string;
};

// Helper to factor out routine scoring loops
function scoreMany(solution: string, caps: Record<string, SolCapSpec["delivery_strength"]>): SolCapSpec[] {
  return Object.entries(caps).map(([capability, delivery_strength]) => ({ solution, capability, delivery_strength }));
}

const solCaps: SolCapSpec[] = [
  // ============= ITSM matrix (existing 19 caps) =============
  // RMM bundlers: ticketing + KB + portal + SLA; not full ITSM (no major-incident, problem-mgmt, virtual agent, etc.)
  ...scoreMany("Atera", {
    "ITSM-INCIDENT": "native", "ITSM-REQUEST": "native", "ITSM-CATALOG": "partial",
    "ITSM-KNOWLEDGE": "native", "ITSM-PORTAL": "native", "ITSM-SLA": "native",
    "ITSM-AI-TRIAGE": "native", "ITSM-ASSIGN": "partial", "ITSM-WORKSPACE": "native",
    "ITSM-REPORTING": "partial",
  }),
  ...scoreMany("NinjaOne", {
    "ITSM-INCIDENT": "native", "ITSM-REQUEST": "native", "ITSM-KNOWLEDGE": "partial",
    "ITSM-PORTAL": "native", "ITSM-SLA": "native", "ITSM-ASSIGN": "partial",
    "ITSM-AI-TRIAGE": "native", "ITSM-REPORTING": "partial",
  }),
  ...scoreMany("Kaseya VSA", {
    "ITSM-INCIDENT": "via_extension", "ITSM-REQUEST": "via_extension",
    "ITSM-KNOWLEDGE": "via_extension", "ITSM-PORTAL": "via_extension",
  }),
  ...scoreMany("Datto RMM", {
    "ITSM-INCIDENT": "via_extension", "ITSM-REQUEST": "via_extension",
  }),
  ...scoreMany("ConnectWise RMM", {
    "ITSM-INCIDENT": "via_extension", "ITSM-REQUEST": "via_extension",
    "ITSM-KNOWLEDGE": "via_extension", "ITSM-PORTAL": "via_extension",
  }),
  ...scoreMany("N-able N-central", {
    "ITSM-INCIDENT": "via_extension", "ITSM-REQUEST": "via_extension",
  }),
  ...scoreMany("Syncro", {
    "ITSM-INCIDENT": "native", "ITSM-REQUEST": "native", "ITSM-KNOWLEDGE": "partial",
    "ITSM-PORTAL": "native", "ITSM-SLA": "native", "ITSM-ASSIGN": "partial",
    "ITSM-REPORTING": "partial",
  }),
  ...scoreMany("Pulseway", {
    "ITSM-INCIDENT": "native", "ITSM-REQUEST": "partial", "ITSM-KNOWLEDGE": "partial",
    "ITSM-PORTAL": "partial", "ITSM-SLA": "partial",
  }),
  ...scoreMany("SuperOps", {
    "ITSM-INCIDENT": "native", "ITSM-REQUEST": "native", "ITSM-KNOWLEDGE": "native",
    "ITSM-PORTAL": "native", "ITSM-SLA": "native", "ITSM-AI-TRIAGE": "native",
    "ITSM-ASSIGN": "partial", "ITSM-WORKSPACE": "native", "ITSM-REPORTING": "partial",
  }),
  ...scoreMany("ManageEngine Endpoint Central", {
    "ITSM-INCIDENT": "via_extension", "ITSM-REQUEST": "via_extension",
    "ITSM-KNOWLEDGE": "via_extension",
  }),

  // MSP-PSA solutions: stronger ITSM than RMM bundlers
  ...scoreMany("ConnectWise PSA", {
    "ITSM-INCIDENT": "native", "ITSM-REQUEST": "native", "ITSM-CATALOG": "partial",
    "ITSM-KNOWLEDGE": "native", "ITSM-PORTAL": "native", "ITSM-SLA": "native",
    "ITSM-CHANGE": "partial", "ITSM-ASSIGN": "partial", "ITSM-WORKSPACE": "native",
    "ITSM-REPORTING": "native", "ITSM-CHARGEBACK": "native",
  }),
  ...scoreMany("Autotask PSA", {
    "ITSM-INCIDENT": "native", "ITSM-REQUEST": "native", "ITSM-KNOWLEDGE": "native",
    "ITSM-PORTAL": "native", "ITSM-SLA": "native", "ITSM-CHANGE": "partial",
    "ITSM-ASSIGN": "partial", "ITSM-WORKSPACE": "native", "ITSM-REPORTING": "native",
    "ITSM-CHARGEBACK": "native",
  }),
  ...scoreMany("Halo PSA", {
    "ITSM-INCIDENT": "native", "ITSM-REQUEST": "native", "ITSM-CATALOG": "native",
    "ITSM-KNOWLEDGE": "native", "ITSM-PORTAL": "native", "ITSM-SLA": "native",
    "ITSM-CHANGE": "native", "ITSM-MAJOR-INCIDENT": "partial", "ITSM-PROBLEM": "partial",
    "ITSM-RELEASE": "partial", "ITSM-ASSIGN": "native", "ITSM-WORKSPACE": "native",
    "ITSM-REPORTING": "native", "ITSM-AI-TRIAGE": "partial", "ITSM-CHARGEBACK": "native",
  }),
  ...scoreMany("Tigerpaw One", {
    "ITSM-INCIDENT": "native", "ITSM-REQUEST": "partial", "ITSM-KNOWLEDGE": "partial",
    "ITSM-PORTAL": "partial", "ITSM-SLA": "partial", "ITSM-REPORTING": "partial",
  }),

  // REMOTE-ACCESS solutions: most score 0 on ITSM caps; BeyondTrust + GoTo Resolve are exceptions
  ...scoreMany("BeyondTrust Remote Support", {
    "ITSM-INCIDENT": "partial", "ITSM-PORTAL": "partial",
  }),
  ...scoreMany("GoTo Resolve", {
    "ITSM-INCIDENT": "native", "ITSM-REQUEST": "native", "ITSM-KNOWLEDGE": "partial",
    "ITSM-PORTAL": "native", "ITSM-SLA": "partial", "ITSM-AI-TRIAGE": "partial",
    "ITSM-ASSIGN": "partial", "ITSM-WORKSPACE": "native",
  }),
  ...scoreMany("TeamViewer", {
    "ITSM-INCIDENT": "via_extension",
  }),
  ...scoreMany("Zoho Assist", {
    "ITSM-INCIDENT": "via_extension", "ITSM-PORTAL": "via_extension",
  }),

  // ============= HAM matrix (new 5 caps) =============
  ...scoreMany("NinjaOne", {
    "HAM-DISCOVERY": "native", "HAM-LIFECYCLE": "partial",
    "HAM-WARRANTY": "partial", "HAM-DISPOSAL": "partial",
  }),
  ...scoreMany("Kaseya VSA", {
    "HAM-DISCOVERY": "native", "HAM-LIFECYCLE": "partial", "HAM-WARRANTY": "partial",
  }),
  ...scoreMany("Datto RMM", {
    "HAM-DISCOVERY": "native", "HAM-LIFECYCLE": "partial", "HAM-WARRANTY": "partial",
  }),
  ...scoreMany("ConnectWise RMM", {
    "HAM-DISCOVERY": "native", "HAM-LIFECYCLE": "partial", "HAM-WARRANTY": "partial",
  }),
  ...scoreMany("N-able N-central", {
    "HAM-DISCOVERY": "native", "HAM-LIFECYCLE": "partial",
  }),
  ...scoreMany("Syncro", {
    "HAM-DISCOVERY": "native", "HAM-LIFECYCLE": "native", "HAM-FINANCIAL": "partial",
    "HAM-WARRANTY": "native",
  }),
  ...scoreMany("Atera", {
    "HAM-DISCOVERY": "native", "HAM-LIFECYCLE": "partial",
  }),
  ...scoreMany("Pulseway", {
    "HAM-DISCOVERY": "native",
  }),
  ...scoreMany("SuperOps", {
    "HAM-DISCOVERY": "native", "HAM-LIFECYCLE": "native", "HAM-WARRANTY": "partial",
  }),
  ...scoreMany("ManageEngine Endpoint Central", {
    "HAM-DISCOVERY": "native", "HAM-LIFECYCLE": "partial",
    "HAM-WARRANTY": "partial",
  }),
  ...scoreMany("Tigerpaw One", {
    "HAM-DISCOVERY": "partial", "HAM-LIFECYCLE": "native", "HAM-FINANCIAL": "partial",
    "HAM-WARRANTY": "native", "HAM-DISPOSAL": "partial",
  }),

  // ============= SAM matrix (new 5 caps) =============
  // RMM tools generally do SAM-DISCOVERY natively; entitlement/audit/renewal are SAM-tool territory
  ...scoreMany("NinjaOne", {
    "SAM-DISCOVERY": "native", "SAM-METER": "partial",
  }),
  ...scoreMany("Kaseya VSA", {
    "SAM-DISCOVERY": "native", "SAM-METER": "partial",
  }),
  ...scoreMany("Datto RMM", {
    "SAM-DISCOVERY": "native",
  }),
  ...scoreMany("ConnectWise RMM", {
    "SAM-DISCOVERY": "native",
  }),
  ...scoreMany("N-able N-central", {
    "SAM-DISCOVERY": "native",
  }),
  ...scoreMany("Syncro", {
    "SAM-DISCOVERY": "native",
  }),
  ...scoreMany("Atera", {
    "SAM-DISCOVERY": "native",
  }),
  ...scoreMany("Action1", {
    "SAM-DISCOVERY": "native",
  }),
  ...scoreMany("ManageEngine Endpoint Central", {
    "SAM-DISCOVERY": "native", "SAM-METER": "partial", "SAM-RENEWAL": "partial",
  }),

  // ============= UEM matrix (new 5 caps) =============
  ...scoreMany("NinjaOne", {
    "UEM-MDM": "partial", "UEM-CONFIG": "partial", "UEM-APP-DIST": "native",
    "UEM-COMPLIANCE": "partial",
  }),
  ...scoreMany("Kaseya VSA", {
    "UEM-CONFIG": "partial", "UEM-APP-DIST": "native",
  }),
  ...scoreMany("N-able N-central", {
    "UEM-MDM": "partial", "UEM-CONFIG": "partial", "UEM-APP-DIST": "native",
  }),
  ...scoreMany("ManageEngine Endpoint Central", {
    "UEM-MDM": "native", "UEM-CONFIG": "native", "UEM-APP-DIST": "native",
    "UEM-ZTP": "native", "UEM-COMPLIANCE": "native",
  }),
  ...scoreMany("GoTo Resolve", {
    "UEM-MDM": "partial", "UEM-APP-DIST": "partial",
  }),
];

// ============================================================
// BF DOMAINS for RMM (MSP-PSA and REMOTE-ACCESS already done)
// ============================================================
type BfdSpec = { bf_name: string; domain_code: string; responsibility_type: "owner" | "contributor" | "consumer"; notes?: string };
const bfdRows: BfdSpec[] = [
  { bf_name: "IT Operations", domain_code: "RMM", responsibility_type: "owner",
    notes: "Primary buyer and operator: IT operations / endpoint operations teams in internal IT; MSP service-delivery teams when sold to MSPs." },
  { bf_name: "Security", domain_code: "RMM", responsibility_type: "contributor",
    notes: "Patch management, agent-policy enforcement, and endpoint hardening fall under security operations; many RMM tools also integrate with EDR." },
  { bf_name: "Business Operations", domain_code: "RMM", responsibility_type: "contributor",
    notes: "Reporting on endpoint health, patch compliance, and MSP customer-profitability roll up into business operations dashboards." },
];

// ============================================================
// RUN
// ============================================================
async function main() {
  const allDomainsRaw = await get("/domains?select=id,domain_code&limit=10000");
  const allDomainMap = new Map<string, number>();
  for (const d of allDomainsRaw) allDomainMap.set(String(d.domain_code), Number(d.id));

  console.log("\n=== New capabilities (ITOM/HAM/SAM/UEM) ===");
  const capRows = newCapabilities.map(c => ({
    capability_code: c.capability_code, capability_name: c.capability_name, description: c.description,
  }));
  await syncTable("/capabilities", capRows, "capability_code");
  const allCapsRaw = await get("/capabilities?select=id,capability_code&limit=10000");
  const capMap = new Map<string, number>();
  for (const r of allCapsRaw) capMap.set(String(r.capability_code), Number(r.id));

  console.log("\n=== capability_domains for new caps ===");
  const existingCapDom = await get("/capability_domains?select=capability_id,domain_id&limit=10000");
  const existingCapDomSet = new Set(existingCapDom.map(r => `${r.capability_id}:${r.domain_id}`));
  const newCdRows: Row[] = [];
  for (const c of newCapabilities) {
    const cid = capMap.get(c.capability_code)!;
    const did = allDomainMap.get(c.domain)!;
    if (existingCapDomSet.has(`${cid}:${did}`)) continue;
    newCdRows.push({ capability_id: cid, domain_id: did, notes: "" });
  }
  if (newCdRows.length > 0) {
    console.log(`  inserting ${newCdRows.length}`);
    await insert("/capability_domains", newCdRows);
  } else console.log("  none");

  console.log("\n=== solution_capabilities (matrix backfill) ===");
  const allSolutionsRaw = await get("/solutions?select=id,solution_name&limit=10000");
  const solutionMap = new Map<string, number>();
  for (const r of allSolutionsRaw) solutionMap.set(String(r.solution_name), Number(r.id));

  const existingSolCap = await get("/solution_capabilities?select=solution_id,capability_id&limit=10000");
  const existingSolCapSet = new Set(existingSolCap.map(r => `${r.solution_id}:${r.capability_id}`));
  const newScRows: Row[] = [];
  let skippedSc = 0, missingFK = 0;
  for (const sc of solCaps) {
    const sid = solutionMap.get(sc.solution);
    const cid = capMap.get(sc.capability);
    if (!sid || !cid) {
      console.warn(`  ! FK miss: ${sc.solution} / ${sc.capability}`);
      missingFK++;
      continue;
    }
    if (existingSolCapSet.has(`${sid}:${cid}`)) { skippedSc++; continue; }
    existingSolCapSet.add(`${sid}:${cid}`);
    newScRows.push({
      solution_id: sid, capability_id: cid,
      delivery_strength: sc.delivery_strength, notes: sc.notes ?? "",
    });
  }
  if (newScRows.length > 0) {
    console.log(`  inserting ${newScRows.length} solution_capabilities (${skippedSc} skipped, ${missingFK} FK misses)`);
    await insert("/solution_capabilities", newScRows);
  } else console.log(`  none (${skippedSc} skipped, ${missingFK} FK misses)`);

  console.log("\n=== business_function_domains for RMM ===");
  const allBfs = await get("/business_functions?select=id,business_function_name&limit=10000");
  const bfMap = new Map<string, number>();
  for (const r of allBfs) bfMap.set(String(r.business_function_name), Number(r.id));
  const existingBfd = await get("/business_function_domains?select=business_function_id,domain_id,responsibility_type&limit=10000");
  const existingBfdSet = new Set(existingBfd.map(r => `${r.business_function_id}:${r.domain_id}:${r.responsibility_type}`));
  const newBfdRows: Row[] = [];
  let skippedBfd = 0;
  for (const b of bfdRows) {
    const bfid = bfMap.get(b.bf_name);
    const did = allDomainMap.get(b.domain_code);
    if (!bfid || !did) throw new Error(`FK failure bfd ${b.bf_name}/${b.domain_code}`);
    if (existingBfdSet.has(`${bfid}:${did}:${b.responsibility_type}`)) { skippedBfd++; continue; }
    existingBfdSet.add(`${bfid}:${did}:${b.responsibility_type}`);
    newBfdRows.push({
      business_function_id: bfid, domain_id: did,
      responsibility_type: b.responsibility_type, notes: b.notes ?? "",
    });
  }
  if (newBfdRows.length > 0) {
    console.log(`  inserting ${newBfdRows.length} (${skippedBfd} skipped)`);
    await insert("/business_function_domains", newBfdRows);
  } else console.log(`  none (${skippedBfd} skipped)`);

  console.log("\n=== Final IT-cluster counts ===");
  const counts = {
    capabilities_total: (await get("/capabilities?select=id&limit=10000")).length,
    capability_domains_total: (await get("/capability_domains?select=capability_id&limit=10000")).length,
    solution_capabilities_total: (await get("/solution_capabilities?select=solution_id&limit=10000")).length,
    business_function_domains_total: (await get("/business_function_domains?select=business_function_id&limit=10000")).length,
  };
  console.log(JSON.stringify(counts, null, 2));
}
await main();
