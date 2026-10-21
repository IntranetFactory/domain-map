#!/usr/bin/env bun
// Loads the RMM / MSP-PSA / REMOTE-ACCESS markets into the domain_map module.
//
// Step 1 — 3 new domains: RMM, MSP-PSA, REMOTE-ACCESS (with full metadata)
// Step 2 Phase A (RMM only) — 8 capabilities, 10 vendors, 11 solutions,
//   capability_domains, solution_domains, solution_capabilities
// Step 2 Phase B (RMM only) — 4 new data_objects, 11 domain_data_objects,
//   11 cross_domain_handoffs
//
// Idempotent: reads natural / composite keys first, only inserts missing rows.
// Run from project root: bun run .tmp_deploy/load_rmm.ts

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
// STEP 1 — DOMAINS (full metadata, validated)
// ============================================================
type DomainRow = {
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
};

function validateDomainRow(d: DomainRow): void {
  const errs: string[] = [];
  if (!d.domain_code) errs.push("domain_code empty");
  if (!d.domain_name) errs.push("domain_name empty");
  if (!d.description) errs.push("description empty");
  if (d.crud_percentage === 0) errs.push("crud_percentage is 0 (must be assessed)");
  if (d.crud_percentage < 0 || d.crud_percentage > 100) errs.push("crud_percentage out of range");
  if (d.min_org_size === "") errs.push("min_org_size empty");
  if (d.cost_band === "") errs.push("cost_band empty");
  if (d.business_logic === "" && d.crud_percentage < 95) errs.push("business_logic empty but crud_percentage < 95");
  if (d.usa_market_size_usd_m === 0) errs.push("usa_market_size_usd_m is 0");
  if (d.market_size_source_year === 0) errs.push("market_size_source_year is 0");
  if (errs.length > 0) {
    throw new Error(`Domain row ${d.domain_code} failed validation: ${errs.join("; ")}`);
  }
}

const newDomains: DomainRow[] = [
  {
    domain_code: "RMM",
    domain_name: "Remote Monitoring and Management",
    description:
      "Agent-based monitoring, patching, scripting, and automation of distributed Windows/Mac/Linux endpoints and servers across multi-tenant customer estates. Sold to MSPs (per-endpoint pricing) and increasingly to internal IT departments (per-technician pricing). Distinct from ITOM (no full-stack APM/infrastructure observability), UEM (limited mobile/MDM coverage), and ITSM (no human-process workflow engine). Vendors: NinjaOne, Kaseya VSA, Datto RMM (Kaseya), ConnectWise RMM, N-able N-central, Atera, Syncro, Pulseway, Action1, SuperOps, ManageEngine Endpoint Central.",
    crud_percentage: 70,
    business_logic:
      "Real-time agent telemetry ingestion at scale, threshold-based alerting with hysteresis and de-duplication, sandboxed script execution across heterogeneous OS (PowerShell, Bash, batch, Python), SNMP/WMI/ICMP network discovery, patch dependency resolution and rollback, agent self-update protocols, multi-tenant data isolation, NAT-traversal for remote control hand-offs.",
    min_org_size: "10 xs <50",
    cost_band: "$$",
    certification_required: false,
    usa_market_size_usd_m: 2000,
    market_size_source_year: 2024,
  },
  {
    domain_code: "MSP-PSA",
    domain_name: "MSP Professional Services Automation",
    description:
      "Ticketing, contracts, time tracking, billing, and resource scheduling built around the MSP business model: multi-tenant customer estates, recurring service contracts, block-hour and value-based pricing, and per-customer SLAs. Distinct from generic PSA (services-org variant for consultancies and agencies) — different buyer, different competitive set. Vendors: ConnectWise PSA (Manage), Autotask (Kaseya), Halo PSA, Atera PSA, SuperOps PSA, Syncro, Tigerpaw.",
    crud_percentage: 85,
    business_logic:
      "Recurring contract billing with block-hour decrement, value-based pricing tiers, SLA timer pause/resume on hold, multi-tenant data isolation between customer estates, technician dispatch and scheduling optimization, time-entry approval routing.",
    min_org_size: "10 xs <50",
    cost_band: "$$",
    certification_required: false,
    usa_market_size_usd_m: 800,
    market_size_source_year: 2024,
  },
  {
    domain_code: "REMOTE-ACCESS",
    domain_name: "Remote Access and Support",
    description:
      "Attended (technician-initiated with end-user present) and unattended remote control of workstations and servers, with session recording, file transfer, privilege elevation, and NAT-traversal relay. Distinct from VDI (full virtual desktops), VPN (network-layer tunneling), and PAM (privileged-access management with credential vaulting). Vendors: TeamViewer, AnyDesk, Splashtop, BeyondTrust Remote Support, ScreenConnect (ConnectWise Control), Zoho Assist, LogMeIn Rescue, RealVNC, RustDesk.",
    crud_percentage: 30,
    business_logic:
      "Pixel-level remote desktop protocols over WebRTC and proprietary transports, NAT-traversal and relay infrastructure, end-to-end session encryption, multi-platform input injection (Windows/macOS/Linux/mobile), just-in-time privilege elevation, session recording and audit trails, concurrent-session brokering.",
    min_org_size: "10 xs <50",
    cost_band: "$$",
    certification_required: false,
    usa_market_size_usd_m: 1500,
    market_size_source_year: 2024,
  },
];

for (const d of newDomains) validateDomainRow(d);

// ============================================================
// STEP 2 PHASE A — CAPABILITIES (under RMM)
// ============================================================
const capabilities = [
  {
    capability_code: "RMM-EPM",
    capability_name: "Endpoint Monitoring",
    domain: "RMM",
    description:
      "Real-time telemetry collection from Windows/macOS/Linux endpoints and servers (CPU, memory, disk, process, services, event log, hardware health) with configurable polling intervals and remote-agent fan-out.",
  },
  {
    capability_code: "RMM-PATCH",
    capability_name: "Patch Management",
    domain: "RMM",
    description:
      "OS and third-party application patch discovery, approval workflows, maintenance-window scheduling, deployment across endpoint groups, and rollback on failure. Covers Windows Update, macOS updates, and 3rd-party catalogs.",
  },
  {
    capability_code: "RMM-SCRIPT",
    capability_name: "Remote Scripting and Automation",
    domain: "RMM",
    description:
      "Authoring, scheduling, and executing scripts (PowerShell, Bash, batch, Python) across managed endpoints with secure parameter passing, script-library versioning, and per-target execution history.",
  },
  {
    capability_code: "RMM-DISC",
    capability_name: "Network Discovery",
    domain: "RMM",
    description:
      "SNMP/WMI/ICMP/agent-led discovery and inventory of network devices, printers, switches, and unmanaged hosts, with topology mapping and unmanaged-device alerting.",
  },
  {
    capability_code: "RMM-INV",
    capability_name: "Hardware and Software Inventory",
    domain: "RMM",
    description:
      "Automated collection and reporting of hardware specs (CPU, RAM, disk, serial, peripherals) and installed software per agent-managed endpoint, with change tracking and reporting.",
  },
  {
    capability_code: "RMM-ALERT",
    capability_name: "Threshold-Based Alerting",
    domain: "RMM",
    description:
      "Rule-based and ML-assisted alert generation from telemetry thresholds with de-duplication, hysteresis, notification routing (email/SMS/push/webhook), and automatic ticket creation in connected PSA/ITSM tools.",
  },
  {
    capability_code: "RMM-MT",
    capability_name: "Multi-Tenant Customer Management",
    domain: "RMM",
    description:
      "Logical separation of monitored endpoint estates per customer, site, or location for MSP service delivery, with per-tenant configuration, branding, reporting, and access control.",
  },
  {
    capability_code: "RMM-AI",
    capability_name: "AI-Assisted IT Operations",
    domain: "RMM",
    description:
      "Generative AI for script authoring, ticket triage and summarization, root-cause analysis assistance, resolution suggestions from historical resolutions, and natural-language operations queries.",
  },
];

// ============================================================
// STEP 2 PHASE A — VENDORS (10; Kaseya owns Datto and Autotask post-2022)
// ============================================================
const vendors = [
  {
    vendor_name: "NinjaOne LLC",
    vendor_url: "https://www.ninjaone.com",
    headquarters_country: "USA",
    description: "Unified IT-management platform vendor (RMM, patch, MDM, backup, ticketing).",
    notes: "Founded 2013 (Austin, TX) as NinjaRMM; rebranded NinjaOne 2022. Independent, growth-equity backed (TPG, Iconiq).",
  },
  {
    vendor_name: "Kaseya Limited",
    vendor_url: "https://www.kaseya.com",
    headquarters_country: "USA",
    description: "IT-management software roll-up vendor; flagship MSP/IT platform.",
    notes:
      "Founded 2000, HQ Miami. Owned by Insight Partners. Acquired Datto (2022, ~$6.2B), Spanning, Unitrends, ID Agent, RapidFire Tools, AuthAnvil. Vends Kaseya VSA (RMM), Datto RMM, BMS, Autotask PSA.",
  },
  {
    vendor_name: "ConnectWise LLC",
    vendor_url: "https://www.connectwise.com",
    headquarters_country: "USA",
    description: "MSP-focused IT-management software vendor.",
    notes: "Founded 1982, HQ Tampa FL. Owned by Thoma Bravo. Vends ConnectWise PSA (formerly Manage), ConnectWise RMM, ConnectWise Automate (LabTech, legacy), ScreenConnect (ConnectWise Control).",
  },
  {
    vendor_name: "N-able Inc.",
    vendor_url: "https://www.n-able.com",
    headquarters_country: "USA",
    description: "MSP RMM and security vendor; publicly listed (NYSE: NABL).",
    notes: "Spun off from SolarWinds MSP in July 2021 as a separate public company. HQ Burlington MA. Vends N-central (mid-large MSP), N-sight RMM (SMB MSP), Cove Data Protection, Mail Assure.",
  },
  {
    vendor_name: "Syncro MSP Inc.",
    vendor_url: "https://syncromsp.com",
    headquarters_country: "USA",
    description: "All-in-one RMM + PSA + remote-access vendor targeted at SMB MSPs.",
    notes: "Founded 2017 (as RepairShopr-related spinoff), HQ Seattle. Independent. Per-tech pricing model; bundles RMM, PSA, ticketing, and Splashtop integration.",
  },
  {
    vendor_name: "Atera Networks Ltd.",
    vendor_url: "https://www.atera.com",
    headquarters_country: "Israel",
    description: "All-in-one IT-management SaaS (RMM + PSA + helpdesk + remote access) with per-technician pricing.",
    notes: "Founded 2011, HQ Tel Aviv with US office in New York. Backed by General Atlantic ($77M Series B, 2021; valued ~$500M). Per-tech pricing differentiator vs per-endpoint competitors. Atera Action AI / Copilot launched 2023-2024.",
  },
  {
    vendor_name: "MMSOFT Design Ltd. (Pulseway)",
    vendor_url: "https://www.pulseway.com",
    headquarters_country: "Ireland",
    description: "Mobile-first RMM vendor with strong native mobile-app management workflows.",
    notes: "Founded 2011, HQ Dublin. Independent. Pulseway's differentiator is technician-mobile-first UX. Acquired ITarian / Comodo One assets historically.",
  },
  {
    vendor_name: "Action1 Corporation",
    vendor_url: "https://www.action1.com",
    headquarters_country: "USA",
    description: "Cloud-native autonomous patch-management and endpoint-management vendor.",
    notes: "Founded 2018, HQ Houston TX. Independent. Differentiator: free for first 100 endpoints; cloud-native patching focus rather than full RMM stack.",
  },
  {
    vendor_name: "SuperOps Inc.",
    vendor_url: "https://superops.com",
    headquarters_country: "USA",
    description: "AI-native unified PSA + RMM platform for MSPs.",
    notes: "Founded 2020, HQ Walnut CA with significant India presence. Backed by Tanglin Venture Partners, Matrix Partners, Addition. AI-first positioning against ConnectWise/Kaseya.",
  },
  {
    vendor_name: "Zoho Corporation Pvt. Ltd.",
    vendor_url: "https://www.zohocorp.com",
    headquarters_country: "India",
    description: "Privately-held software conglomerate; parent of Zoho One and ManageEngine.",
    notes: "Founded 1996 as AdventNet. HQ Chennai (India) and Pleasanton CA. Bootstrapped, no external funding. ManageEngine division vends Endpoint Central (RMM/UEM), ServiceDesk Plus (ITSM), and ~60 IT-management products.",
  },
];

// ============================================================
// STEP 2 PHASE A — SOLUTIONS (11) + coverage matrix
// ============================================================
type SolutionSpec = {
  solution_name: string;
  vendor: string;
  solution_type: "saas" | "on_prem" | "hybrid" | "open_source" | "internal_build" | "manual_process";
  solution_url: string;
  description: string;
  notes?: string;
  primary?: string[];
  secondary?: string[];
  partial?: string[];
};

const solutions: SolutionSpec[] = [
  {
    solution_name: "NinjaOne",
    vendor: "NinjaOne LLC",
    solution_type: "saas",
    solution_url: "https://www.ninjaone.com",
    description: "Unified IT-management platform: RMM (endpoint monitoring, patching, scripting), service desk/ticketing, MDM, endpoint backup, and remote access. Targeted at MSPs and internal IT.",
    primary: ["RMM"],
    secondary: ["MSP-PSA", "ITSM", "HAM", "REMOTE-ACCESS"],
    partial: ["SAM", "UEM"],
  },
  {
    solution_name: "Kaseya VSA",
    vendor: "Kaseya Limited",
    solution_type: "saas",
    solution_url: "https://www.kaseya.com/products/vsa/",
    description: "Kaseya's flagship RMM: agent-based endpoint monitoring, patching, scripting, automation, and remote control across multi-tenant customer estates.",
    notes: "VSA 10 is the current (cloud-native) version; legacy VSA 9 still in market. Pairs with Kaseya BMS / Autotask for PSA.",
    primary: ["RMM"],
    secondary: ["ITSM", "HAM", "REMOTE-ACCESS"],
    partial: ["SAM", "UEM"],
  },
  {
    solution_name: "Datto RMM",
    vendor: "Kaseya Limited",
    solution_type: "saas",
    solution_url: "https://www.datto.com/products/rmm/",
    description: "Cloud-native RMM with strong MSP focus: endpoint monitoring, patching, scripting (ComStore), and tight integration with Autotask PSA and Datto BCDR.",
    notes: "Acquired by Kaseya in June 2022 as part of the $6.2B Datto deal; Datto brand preserved.",
    primary: ["RMM"],
    secondary: ["HAM", "REMOTE-ACCESS"],
    partial: ["ITSM", "SAM"],
  },
  {
    solution_name: "ConnectWise RMM",
    vendor: "ConnectWise LLC",
    solution_type: "saas",
    solution_url: "https://www.connectwise.com/platform/business-management/rmm",
    description: "Modern cloud-native RMM (built on the Asio platform) replacing legacy ConnectWise Automate (LabTech): endpoint monitoring, patching, scripting, and AI-assisted operations.",
    notes: "ConnectWise Automate (LabTech) is on legacy/sunset track; ConnectWise RMM is the strategic offering. Pairs with ConnectWise PSA (Manage) for ticketing and ScreenConnect for remote control.",
    primary: ["RMM"],
    secondary: ["HAM", "REMOTE-ACCESS"],
    partial: ["MSP-PSA", "ITSM", "SAM"],
  },
  {
    solution_name: "N-able N-central",
    vendor: "N-able Inc.",
    solution_type: "saas",
    solution_url: "https://www.n-able.com/products/n-central",
    description: "Enterprise-grade RMM for mid-to-large MSPs: deep automation, complex scripting, network monitoring, and AV/EDR management at scale.",
    notes: "N-central targets larger MSPs; N-able N-sight RMM is the SMB-MSP sibling. Pairs with Cove Data Protection.",
    primary: ["RMM"],
    secondary: ["HAM", "REMOTE-ACCESS"],
    partial: ["ITSM", "SAM", "UEM"],
  },
  {
    solution_name: "Syncro",
    vendor: "Syncro MSP Inc.",
    solution_type: "saas",
    solution_url: "https://syncromsp.com",
    description: "All-in-one MSP platform combining RMM, PSA, and ticketing under per-technician pricing. Bundles Splashtop remote access.",
    primary: ["RMM", "MSP-PSA"],
    secondary: ["ITSM", "HAM", "REMOTE-ACCESS"],
    partial: ["SAM"],
  },
  {
    solution_name: "Atera",
    vendor: "Atera Networks Ltd.",
    solution_type: "saas",
    solution_url: "https://www.atera.com",
    description: "All-in-one IT-management SaaS bundling RMM (endpoint monitoring, patching, scripting), PSA (ticketing, contracts, billing), helpdesk, and integrated remote-access (Splashtop/AnyDesk/ScreenConnect). Per-technician pricing differentiates from per-endpoint competitors. Includes Action AI / Copilot for AI-assisted ticketing and scripting.",
    notes: "Targets both MSPs and internal IT teams; ~13,000 customers as of 2024. Action AI launched 2023; expanded with ticket triage, RCA summarization, script generation.",
    primary: ["RMM", "MSP-PSA"],
    secondary: ["ITSM", "REMOTE-ACCESS"],
    partial: ["HAM", "SAM"],
  },
  {
    solution_name: "Pulseway",
    vendor: "MMSOFT Design Ltd. (Pulseway)",
    solution_type: "saas",
    solution_url: "https://www.pulseway.com",
    description: "Mobile-first RMM: endpoint monitoring, patching, scripting, and remote control with a strong native mobile-app experience for on-call technicians.",
    primary: ["RMM"],
    secondary: ["REMOTE-ACCESS"],
    partial: ["ITSM", "HAM"],
  },
  {
    solution_name: "Action1",
    vendor: "Action1 Corporation",
    solution_type: "saas",
    solution_url: "https://www.action1.com",
    description: "Cloud-native autonomous patch-management and endpoint-management platform with no-VPN architecture. Free for first 100 endpoints. Focused on patching rather than full RMM stack.",
    primary: ["RMM"],
    partial: ["SAM"],
  },
  {
    solution_name: "SuperOps",
    vendor: "SuperOps Inc.",
    solution_type: "saas",
    solution_url: "https://superops.com",
    description: "AI-native unified PSA + RMM platform for MSPs: ticketing, contracts, asset management, patching, scripting, and AI copilot for operations.",
    primary: ["RMM", "MSP-PSA"],
    secondary: ["ITSM", "REMOTE-ACCESS"],
    partial: ["HAM"],
  },
  {
    solution_name: "ManageEngine Endpoint Central",
    vendor: "Zoho Corporation Pvt. Ltd.",
    solution_type: "hybrid",
    solution_url: "https://www.manageengine.com/products/desktop-central/",
    description: "Unified endpoint-management suite: RMM-style monitoring/patching/scripting plus UEM (Windows/macOS/Linux/iOS/Android/ChromeOS), MDM, app deployment, and remote control. Available both on-premise and SaaS.",
    notes: "Formerly Desktop Central; rebranded Endpoint Central 2022. Targets internal IT (enterprise) more than MSPs.",
    primary: ["RMM"],
    secondary: ["UEM", "HAM", "REMOTE-ACCESS"],
    partial: ["ITSM", "SAM"],
  },
];

// ============================================================
// STEP 2 PHASE A — SOLUTION_CAPABILITIES (delivery_strength matrix)
// ============================================================
// Legend: native = first-class feature; partial = supported but lightweight;
// via_extension = via integration/marketplace; not_supported = absent.
type SolCapSpec = {
  solution: string;
  capability: string;
  delivery_strength: "native" | "partial" | "via_extension" | "not_supported";
  notes?: string;
};

const solCaps: SolCapSpec[] = [
  // NinjaOne — broad bundler
  { solution: "NinjaOne", capability: "RMM-EPM", delivery_strength: "native" },
  { solution: "NinjaOne", capability: "RMM-PATCH", delivery_strength: "native" },
  { solution: "NinjaOne", capability: "RMM-SCRIPT", delivery_strength: "native" },
  { solution: "NinjaOne", capability: "RMM-DISC", delivery_strength: "partial", notes: "Lighter network-discovery vs N-central/Kaseya." },
  { solution: "NinjaOne", capability: "RMM-INV", delivery_strength: "native" },
  { solution: "NinjaOne", capability: "RMM-ALERT", delivery_strength: "native" },
  { solution: "NinjaOne", capability: "RMM-MT", delivery_strength: "native" },
  { solution: "NinjaOne", capability: "RMM-AI", delivery_strength: "native", notes: "Ninja AI for ticketing and script generation." },

  // Kaseya VSA — broad/legacy heavy
  { solution: "Kaseya VSA", capability: "RMM-EPM", delivery_strength: "native" },
  { solution: "Kaseya VSA", capability: "RMM-PATCH", delivery_strength: "native" },
  { solution: "Kaseya VSA", capability: "RMM-SCRIPT", delivery_strength: "native" },
  { solution: "Kaseya VSA", capability: "RMM-DISC", delivery_strength: "native" },
  { solution: "Kaseya VSA", capability: "RMM-INV", delivery_strength: "native" },
  { solution: "Kaseya VSA", capability: "RMM-ALERT", delivery_strength: "native" },
  { solution: "Kaseya VSA", capability: "RMM-MT", delivery_strength: "native" },
  { solution: "Kaseya VSA", capability: "RMM-AI", delivery_strength: "partial", notes: "AI features rolling out via Cooper Copilot." },

  // Datto RMM — cloud-native, MSP-focused
  { solution: "Datto RMM", capability: "RMM-EPM", delivery_strength: "native" },
  { solution: "Datto RMM", capability: "RMM-PATCH", delivery_strength: "native" },
  { solution: "Datto RMM", capability: "RMM-SCRIPT", delivery_strength: "native", notes: "ComStore component marketplace." },
  { solution: "Datto RMM", capability: "RMM-DISC", delivery_strength: "native" },
  { solution: "Datto RMM", capability: "RMM-INV", delivery_strength: "native" },
  { solution: "Datto RMM", capability: "RMM-ALERT", delivery_strength: "native" },
  { solution: "Datto RMM", capability: "RMM-MT", delivery_strength: "native" },
  { solution: "Datto RMM", capability: "RMM-AI", delivery_strength: "partial", notes: "Kaseya Cooper extension." },

  // ConnectWise RMM
  { solution: "ConnectWise RMM", capability: "RMM-EPM", delivery_strength: "native" },
  { solution: "ConnectWise RMM", capability: "RMM-PATCH", delivery_strength: "native" },
  { solution: "ConnectWise RMM", capability: "RMM-SCRIPT", delivery_strength: "native" },
  { solution: "ConnectWise RMM", capability: "RMM-DISC", delivery_strength: "partial" },
  { solution: "ConnectWise RMM", capability: "RMM-INV", delivery_strength: "native" },
  { solution: "ConnectWise RMM", capability: "RMM-ALERT", delivery_strength: "native" },
  { solution: "ConnectWise RMM", capability: "RMM-MT", delivery_strength: "native" },
  { solution: "ConnectWise RMM", capability: "RMM-AI", delivery_strength: "native", notes: "Sidekick AI assistant on Asio platform." },

  // N-able N-central — enterprise depth
  { solution: "N-able N-central", capability: "RMM-EPM", delivery_strength: "native" },
  { solution: "N-able N-central", capability: "RMM-PATCH", delivery_strength: "native" },
  { solution: "N-able N-central", capability: "RMM-SCRIPT", delivery_strength: "native", notes: "Automation Manager with deep scripting." },
  { solution: "N-able N-central", capability: "RMM-DISC", delivery_strength: "native", notes: "Strong network discovery vs SMB-focused peers." },
  { solution: "N-able N-central", capability: "RMM-INV", delivery_strength: "native" },
  { solution: "N-able N-central", capability: "RMM-ALERT", delivery_strength: "native" },
  { solution: "N-able N-central", capability: "RMM-MT", delivery_strength: "native" },
  { solution: "N-able N-central", capability: "RMM-AI", delivery_strength: "partial", notes: "Ecoverse AI features rolling out." },

  // Syncro
  { solution: "Syncro", capability: "RMM-EPM", delivery_strength: "native" },
  { solution: "Syncro", capability: "RMM-PATCH", delivery_strength: "native" },
  { solution: "Syncro", capability: "RMM-SCRIPT", delivery_strength: "native" },
  { solution: "Syncro", capability: "RMM-DISC", delivery_strength: "partial" },
  { solution: "Syncro", capability: "RMM-INV", delivery_strength: "native" },
  { solution: "Syncro", capability: "RMM-ALERT", delivery_strength: "native" },
  { solution: "Syncro", capability: "RMM-MT", delivery_strength: "native" },
  { solution: "Syncro", capability: "RMM-AI", delivery_strength: "partial", notes: "AI ticket suggestions; growing." },

  // Atera — per-technician all-in-one
  { solution: "Atera", capability: "RMM-EPM", delivery_strength: "native" },
  { solution: "Atera", capability: "RMM-PATCH", delivery_strength: "native", notes: "Native OS + Chocolatey-backed 3rd-party patching." },
  { solution: "Atera", capability: "RMM-SCRIPT", delivery_strength: "native", notes: "Shared script library; PowerShell/Bash/batch/Python." },
  { solution: "Atera", capability: "RMM-DISC", delivery_strength: "partial", notes: "SNMP network discovery; lighter vs N-central." },
  { solution: "Atera", capability: "RMM-INV", delivery_strength: "native" },
  { solution: "Atera", capability: "RMM-ALERT", delivery_strength: "native" },
  { solution: "Atera", capability: "RMM-MT", delivery_strength: "native" },
  { solution: "Atera", capability: "RMM-AI", delivery_strength: "native", notes: "Action AI / Copilot is a flagship differentiator: AI ticket triage, RCA, script generation, KB suggestions." },

  // Pulseway — mobile-first
  { solution: "Pulseway", capability: "RMM-EPM", delivery_strength: "native" },
  { solution: "Pulseway", capability: "RMM-PATCH", delivery_strength: "native" },
  { solution: "Pulseway", capability: "RMM-SCRIPT", delivery_strength: "native" },
  { solution: "Pulseway", capability: "RMM-DISC", delivery_strength: "partial" },
  { solution: "Pulseway", capability: "RMM-INV", delivery_strength: "native" },
  { solution: "Pulseway", capability: "RMM-ALERT", delivery_strength: "native", notes: "Mobile push notifications are the differentiator." },
  { solution: "Pulseway", capability: "RMM-MT", delivery_strength: "native" },
  { solution: "Pulseway", capability: "RMM-AI", delivery_strength: "partial" },

  // Action1 — patching-focused, narrow
  { solution: "Action1", capability: "RMM-EPM", delivery_strength: "partial", notes: "Telemetry is patching-focused, not full endpoint monitoring." },
  { solution: "Action1", capability: "RMM-PATCH", delivery_strength: "native", notes: "Flagship capability." },
  { solution: "Action1", capability: "RMM-SCRIPT", delivery_strength: "native" },
  { solution: "Action1", capability: "RMM-DISC", delivery_strength: "partial" },
  { solution: "Action1", capability: "RMM-INV", delivery_strength: "native" },
  { solution: "Action1", capability: "RMM-ALERT", delivery_strength: "partial", notes: "Patch-failure alerting; limited general telemetry alerting." },
  { solution: "Action1", capability: "RMM-MT", delivery_strength: "native" },
  { solution: "Action1", capability: "RMM-AI", delivery_strength: "partial" },

  // SuperOps — AI-native unified
  { solution: "SuperOps", capability: "RMM-EPM", delivery_strength: "native" },
  { solution: "SuperOps", capability: "RMM-PATCH", delivery_strength: "native" },
  { solution: "SuperOps", capability: "RMM-SCRIPT", delivery_strength: "native" },
  { solution: "SuperOps", capability: "RMM-DISC", delivery_strength: "partial" },
  { solution: "SuperOps", capability: "RMM-INV", delivery_strength: "native" },
  { solution: "SuperOps", capability: "RMM-ALERT", delivery_strength: "native" },
  { solution: "SuperOps", capability: "RMM-MT", delivery_strength: "native" },
  { solution: "SuperOps", capability: "RMM-AI", delivery_strength: "native", notes: "AI-native positioning across ticketing and operations." },

  // ManageEngine Endpoint Central — UEM-bias
  { solution: "ManageEngine Endpoint Central", capability: "RMM-EPM", delivery_strength: "native" },
  { solution: "ManageEngine Endpoint Central", capability: "RMM-PATCH", delivery_strength: "native" },
  { solution: "ManageEngine Endpoint Central", capability: "RMM-SCRIPT", delivery_strength: "native" },
  { solution: "ManageEngine Endpoint Central", capability: "RMM-DISC", delivery_strength: "native" },
  { solution: "ManageEngine Endpoint Central", capability: "RMM-INV", delivery_strength: "native" },
  { solution: "ManageEngine Endpoint Central", capability: "RMM-ALERT", delivery_strength: "native" },
  { solution: "ManageEngine Endpoint Central", capability: "RMM-MT", delivery_strength: "partial", notes: "Multi-tenant via MSP edition; weaker than MSP-native peers." },
  { solution: "ManageEngine Endpoint Central", capability: "RMM-AI", delivery_strength: "partial", notes: "Zia AI assistant rolling out across Zoho stack." },
];

// ============================================================
// STEP 2 PHASE B — DATA OBJECTS (RMM-mastered, 4 new)
// ============================================================
const newDataObjects = [
  {
    data_object_name: "rmm_agents",
    singular_label: "RMM Agent",
    plural_label: "RMM Agents",
    display_label: "RMM Agent",
    description:
      "The installed RMM agent on an endpoint or server: its version, last check-in time, health, configuration state, and telemetry-channel status. Distinct from configuration_items (CMDB's relationship/abstraction model) and hardware_assets (HAM's financial/lifecycle model) — rmm_agents is the operational liveness view used by RMM tools.",
  },
  {
    data_object_name: "patch_jobs",
    singular_label: "Patch Job",
    plural_label: "Patch Jobs",
    display_label: "Patch Job",
    description:
      "A scheduled or ad-hoc deployment of OS or third-party patches to a defined set of endpoints, with per-endpoint approval, execution status, success/failure, and rollback state. Tied to maintenance windows and approval workflows.",
  },
  {
    data_object_name: "automation_scripts",
    singular_label: "Automation Script",
    plural_label: "Automation Scripts",
    display_label: "Automation Script",
    description:
      "A reusable script (PowerShell, Bash, batch, Python) in the RMM tool's script library for remote execution against managed endpoints, with version history, parameter schema, scheduled runs, and per-target execution outcome.",
  },
  {
    data_object_name: "monitoring_policies",
    singular_label: "Monitoring Policy",
    plural_label: "Monitoring Policies",
    display_label: "Monitoring Policy",
    description:
      "A threshold/rule template (e.g. \"alert if disk > 90% for 5 min\", \"alert on service stop\") applied to endpoints or endpoint groups. Drives alert generation in the RMM tool; lifecycle is independent of any single alert.",
  },
];

// ============================================================
// STEP 2 PHASE B — DOMAIN_DATA_OBJECTS (Signal 1)
// ============================================================
type DdoSpec = {
  domain_code: string;
  data_object_name: string;
  role: "master" | "contributor" | "consumer" | "derived";
  notes?: string;
};

const ddoRows: DdoSpec[] = [
  // RMM as master of the 4 new objects
  { domain_code: "RMM", data_object_name: "rmm_agents", role: "master", notes: "Agent lifecycle, version, configuration, telemetry-channel state." },
  { domain_code: "RMM", data_object_name: "patch_jobs", role: "master", notes: "Patch deployment runs with per-endpoint execution status." },
  { domain_code: "RMM", data_object_name: "automation_scripts", role: "master", notes: "Script library, scheduled runs, execution history per target." },
  { domain_code: "RMM", data_object_name: "monitoring_policies", role: "master", notes: "Threshold rule definitions and per-endpoint/group bindings." },

  // RMM as co-master of alerts (with ITOM)
  {
    domain_code: "RMM",
    data_object_name: "alerts",
    role: "master",
    notes:
      "Endpoint-telemetry alerts generated by agent-side thresholds (CPU, disk, service, event-log). Co-master with ITOM, which owns infrastructure-event alerts from APM/log/event sources.",
  },

  // RMM as contributor to existing cluster-owned objects
  {
    domain_code: "RMM",
    data_object_name: "configuration_items",
    role: "contributor",
    notes:
      "Contributes agent-collected CI attributes (OS, installed services, network config, runtime versions). CMDB remains master; RMM is one of several discovery sources whose conflicts CMDB must reconcile.",
  },
  {
    domain_code: "RMM",
    data_object_name: "hardware_assets",
    role: "contributor",
    notes:
      "Contributes agent-collected hardware specs (CPU, RAM, disk, serial, BIOS, peripherals). HAM remains master of the financial/lifecycle record; RMM feeds the live operational view.",
  },
  {
    domain_code: "RMM",
    data_object_name: "software_installations",
    role: "contributor",
    notes:
      "Contributes agent-detected installed-software inventory per endpoint. SAM remains master and reconciles against entitlements; RMM is the most accurate installed-state source.",
  },
  {
    domain_code: "RMM",
    data_object_name: "discovered_devices",
    role: "contributor",
    notes:
      "Contributes agent-led and SNMP-based network scans. DISCOVERY remains master of the broader inventory; RMM scans are scoped to the managed estate.",
  },
  {
    domain_code: "RMM",
    data_object_name: "changes",
    role: "contributor",
    notes:
      "Creates change records for approved patch jobs and bulk-script runs. ITSM remains master of the change-management workflow.",
  },

  // RMM as consumer
  {
    domain_code: "RMM",
    data_object_name: "incidents",
    role: "consumer",
    notes:
      "Reads ITSM-mastered incidents to attach context when an RMM-generated alert produced a ticket, enabling closed-loop alert resolution.",
  },
  {
    domain_code: "RMM",
    data_object_name: "service_requests",
    role: "consumer",
    notes:
      "Reads ITSM-mastered service requests to trigger RMM automation (e.g. requested software install) and report back outcome.",
  },
];

// ============================================================
// STEP 2 PHASE B — CROSS_DOMAIN_HANDOFFS (Signal 2)
// ============================================================
type HandoffSpec = {
  source_domain_code: string;
  target_domain_code: string;
  data_object_name: string;
  trigger_event: string;
  integration_pattern: "event_stream" | "api_call" | "batch_sync" | "manual_handoff" | "file_drop";
  friction_level: "high" | "medium" | "low";
  description: string;
  notes?: string;
};

const handoffs: HandoffSpec[] = [
  {
    source_domain_code: "RMM",
    target_domain_code: "ITSM",
    data_object_name: "incidents",
    trigger_event: "alert.threshold_breached",
    integration_pattern: "api_call",
    friction_level: "high",
    description:
      "RMM agent telemetry breaches a monitoring policy threshold and the alert is forwarded to ITSM to auto-create an incident with affected endpoint, telemetry snapshot, and severity. Failure modes: alert-to-ticket bridges across different vendors break on auth/throttling/schema drift; threshold rules drift between systems; duplicate-alert suppression in one tool doesn't propagate to the other; closing the incident rarely closes the originating alert.",
    notes: "Cross-vendor stack pattern; the canonical RMM↔ITSM friction point.",
  },
  {
    source_domain_code: "RMM",
    target_domain_code: "AIOPS",
    data_object_name: "alerts",
    trigger_event: "alert.threshold_breached",
    integration_pattern: "event_stream",
    friction_level: "medium",
    description:
      "RMM alerts stream to an AIOps correlation engine for noise reduction, multi-source event correlation, and incident clustering before any ticket is created. Failure modes: enrichment lag between alert emission and AIOps consumption; correlation accuracy depends on consistent CI identifiers across RMM/ITOM/AIOps; back-channel closure rarely flows to RMM.",
  },
  {
    source_domain_code: "RMM",
    target_domain_code: "ITSM",
    data_object_name: "changes",
    trigger_event: "patch_job.scheduled",
    integration_pattern: "api_call",
    friction_level: "medium",
    description:
      "A scheduled patch job in RMM creates a corresponding change record in ITSM for CAB approval and audit trail. Failure modes: approval delays in ITSM don't gate RMM execution; emergency patch jobs bypass change-control by design and leave the change record stale.",
  },
  {
    source_domain_code: "RMM",
    target_domain_code: "ITSM",
    data_object_name: "changes",
    trigger_event: "patch_job.completed",
    integration_pattern: "api_call",
    friction_level: "medium",
    description:
      "Patch job completion updates the corresponding ITSM change record with per-endpoint execution result and closes it. Failure modes: partial-failure handling differs between tools; rollback events may not be reflected in the change history.",
  },
  {
    source_domain_code: "RMM",
    target_domain_code: "HAM",
    data_object_name: "hardware_assets",
    trigger_event: "endpoint.discovered",
    integration_pattern: "batch_sync",
    friction_level: "medium",
    description:
      "RMM agent installation on a new endpoint syncs hardware specs (CPU, RAM, disk, serial, BIOS) to the HAM asset register. Failure modes: identity reconciliation across RMM agent-id, HAM asset-tag, and CMDB CI-id is unreliable; VMs and ephemeral cloud instances create churn in HAM that doesn't map to a physical lifecycle.",
    notes: "Identity-reconciliation pattern; same logical device in three identifier spaces.",
  },
  {
    source_domain_code: "RMM",
    target_domain_code: "SAM",
    data_object_name: "software_installations",
    trigger_event: "endpoint.discovered",
    integration_pattern: "batch_sync",
    friction_level: "medium",
    description:
      "RMM agent reports detected installed software per endpoint to SAM for entitlement reconciliation. Failure modes: normalization (publisher/product/version) varies between RMM tool dictionaries and SAM tool dictionaries, causing reconciliation gaps; metering data (last-used, frequency) is rarely included in the RMM payload.",
  },
  {
    source_domain_code: "RMM",
    target_domain_code: "CMDB",
    data_object_name: "configuration_items",
    trigger_event: "endpoint.discovered",
    integration_pattern: "api_call",
    friction_level: "high",
    description:
      "RMM contributes CI attributes (OS, installed services, network config) to the CMDB. Failure modes: CMDB receives the same logical CI from multiple discovery sources (RMM, AD, agent-less scans, cloud APIs) with conflicting attribute values; reconciliation rules are CMDB-vendor-specific and rarely fully cover RMM's payload shape.",
    notes: "Identity-reconciliation pattern at scale; one of the highest-friction shapes in IT-ops.",
  },
  {
    source_domain_code: "RMM",
    target_domain_code: "DISCOVERY",
    data_object_name: "discovered_devices",
    trigger_event: "network_device.discovered",
    integration_pattern: "api_call",
    friction_level: "medium",
    description:
      "RMM-led SNMP/agent-led network scans push discovered (often unmanaged) devices to the broader DISCOVERY inventory. Failure modes: scan-coverage overlap with dedicated discovery tools creates duplicate device records; classification (printer vs switch vs IoT) is inconsistent across sources.",
  },
  {
    source_domain_code: "ITSM",
    target_domain_code: "RMM",
    data_object_name: "rmm_agents",
    trigger_event: "ticket.escalated",
    integration_pattern: "manual_handoff",
    friction_level: "medium",
    description:
      "A tier-1 ITSM ticket is escalated to tier-2 with a remote-session need; the technician opens the RMM console to launch diagnostics scripts or a remote-control session against the affected endpoint. Failure modes: ticket-to-endpoint resolution is name-based and breaks for laptops with shifting hostnames; session context is rarely captured back to the ticket.",
  },
  {
    source_domain_code: "ITSM",
    target_domain_code: "RMM",
    data_object_name: "rmm_agents",
    trigger_event: "ticket.resolved",
    integration_pattern: "api_call",
    friction_level: "low",
    description:
      "ITSM ticket resolution back-references RMM to acknowledge/clear the originating alert and stop further escalation. Lowest-friction handoff in the cluster — well-supported in same-vendor stacks; bespoke in cross-vendor stacks.",
  },
  {
    source_domain_code: "HAM",
    target_domain_code: "RMM",
    data_object_name: "rmm_agents",
    trigger_event: "asset.retired",
    integration_pattern: "api_call",
    friction_level: "high",
    description:
      "A hardware asset retired/disposed in HAM should trigger RMM agent uninstall and license release to avoid orphaned agents continuing to phone home and consume seats. Failure modes: classic leaver-pattern friction — the 'going away' event reliably reaches HAM but doesn't reliably reach RMM; orphan agents accumulate; per-endpoint billing inflates.",
    notes: "Leaver / cancellation recall pattern; structural friction across the IT-ops cluster.",
  },
];

// ============================================================
// RUN
// ============================================================
async function main() {
  // ===== STEP 1: DOMAINS =====
  console.log("\n=== Step 1: Domains (with full metadata) ===");
  const domainKeys = newDomains.map(d => d.domain_code);
  const existingDomainsRaw = await get(`/domains?select=id,domain_code&domain_code=in.(${domainKeys.join(",")})`);
  const existingDomainCodes = new Set(existingDomainsRaw.map(r => String(r.domain_code)));
  const missingDomains = newDomains.filter(d => !existingDomainCodes.has(d.domain_code));
  if (missingDomains.length > 0) {
    console.log(`  inserting ${missingDomains.length} new domains: ${missingDomains.map(d => d.domain_code).join(", ")}`);
    await insert("/domains", missingDomains as unknown as Row[]);
  } else {
    console.log("  all three domains already exist");
  }

  // Build full domain map for downstream FK resolution
  const allDomainsRaw = await get("/domains?select=id,domain_code&limit=10000");
  const allDomainMap = new Map<string, number>();
  for (const d of allDomainsRaw) allDomainMap.set(String(d.domain_code), Number(d.id));

  // ===== STEP 2 PHASE A =====
  console.log("\n=== Phase A: Capabilities (under RMM) ===");
  const capRows = capabilities.map(c => ({
    capability_code: c.capability_code,
    capability_name: c.capability_name,
    description: c.description,
  }));
  const capMap = await syncTable("/capabilities", capRows, "capability_code");

  console.log("\n=== Phase A: capability_domains junctions ===");
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

  console.log("\n=== Phase A: Vendors ===");
  const vendorMap = await syncTable("/vendors", vendors.map(v => ({ ...v })), "vendor_name");

  console.log("\n=== Phase A: Solutions ===");
  const solutionRows = solutions.map(s => {
    const vendorId = vendorMap.get(s.vendor);
    if (!vendorId) throw new Error(`Vendor not found for solution ${s.solution_name}: ${s.vendor}`);
    return {
      solution_name: s.solution_name,
      description: s.description,
      solution_url: s.solution_url,
      vendor_id: vendorId,
      solution_type: s.solution_type,
      is_active_in_market: true,
      notes: s.notes ?? "",
    };
  });
  const solutionMap = await syncTable("/solutions", solutionRows, "solution_name");

  console.log("\n=== Phase A: solution_domains junctions ===");
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

  console.log("\n=== Phase A: solution_capabilities junctions ===");
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

  // ===== STEP 2 PHASE B =====
  console.log("\n=== Phase B: Data objects ===");
  const existingDoRaw = await get("/data_objects?select=id,data_object_name&limit=10000");
  const existingDoNames = new Set(existingDoRaw.map(r => String(r.data_object_name)));
  const missingDo = newDataObjects.filter(d => !existingDoNames.has(d.data_object_name));
  if (missingDo.length > 0) {
    console.log(`  inserting ${missingDo.length} new data_objects (${existingDoRaw.length} existed)`);
    await insert("/data_objects", missingDo);
  } else {
    console.log(`  no new data_objects to insert`);
  }
  const allDoRaw = await get("/data_objects?select=id,data_object_name&limit=10000");
  const doMap = new Map<string, number>();
  for (const r of allDoRaw) doMap.set(String(r.data_object_name), Number(r.id));

  console.log("\n=== Phase B: domain_data_objects (Signal 1) ===");
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
    newDdoRows.push({
      domain_id: did,
      data_object_id: oid,
      role: d.role,
      notes: d.notes ?? "",
    });
  }
  if (newDdoRows.length > 0) {
    console.log(`  inserting ${newDdoRows.length} domain_data_objects rows (${skippedDdo} already present)`);
    await insert("/domain_data_objects", newDdoRows);
  } else {
    console.log(`  no new domain_data_objects rows (${skippedDdo} already present)`);
  }

  console.log("\n=== Phase B: cross_domain_handoffs (Signal 2) ===");
  const existingHandoffsRaw = await get(
    "/cross_domain_handoffs?select=source_domain_id,target_domain_id,data_object_id,trigger_event&limit=10000",
  );
  const existingHandoffSet = new Set(
    existingHandoffsRaw.map(
      r => `${r.source_domain_id}:${r.target_domain_id}:${r.data_object_id}:${r.trigger_event}`,
    ),
  );
  const newHandoffRows: Row[] = [];
  let skippedHandoff = 0;
  for (const h of handoffs) {
    const src = allDomainMap.get(h.source_domain_code);
    const tgt = allDomainMap.get(h.target_domain_code);
    const oid = doMap.get(h.data_object_name);
    if (!src) throw new Error(`Source domain not found: ${h.source_domain_code}`);
    if (!tgt) throw new Error(`Target domain not found: ${h.target_domain_code}`);
    if (!oid) throw new Error(`Data object not found: ${h.data_object_name}`);
    const key = `${src}:${tgt}:${oid}:${h.trigger_event}`;
    if (existingHandoffSet.has(key)) { skippedHandoff++; continue; }
    existingHandoffSet.add(key);
    newHandoffRows.push({
      source_domain_id: src,
      target_domain_id: tgt,
      data_object_id: oid,
      trigger_event: h.trigger_event,
      integration_pattern: h.integration_pattern,
      friction_level: h.friction_level,
      description: h.description,
      notes: h.notes ?? "",
    });
  }
  if (newHandoffRows.length > 0) {
    console.log(`  inserting ${newHandoffRows.length} cross_domain_handoffs rows (${skippedHandoff} already present)`);
    await insert("/cross_domain_handoffs", newHandoffRows);
  } else {
    console.log(`  no new cross_domain_handoffs rows (${skippedHandoff} already present)`);
  }

  // ===== AUDIT + COUNTS =====
  console.log("\n=== Post-load audit: zero-default domains (should not contain RMM/MSP-PSA/REMOTE-ACCESS) ===");
  const zeroDefaultDomains = await get(
    "/domains?select=domain_code,crud_percentage,min_org_size,cost_band,usa_market_size_usd_m&crud_percentage=eq.0&order=id.desc&limit=50",
  );
  console.log(JSON.stringify(zeroDefaultDomains, null, 2));

  const rmmDomainId = allDomainMap.get("RMM")!;
  const counts = {
    domains_total: (await get("/domains?select=id&limit=10000")).length,
    capabilities_total: (await get("/capabilities?select=id&limit=10000")).length,
    vendors_total: (await get("/vendors?select=id&limit=10000")).length,
    solutions_total: (await get("/solutions?select=id&limit=10000")).length,
    solution_domains_total: (await get("/solution_domains?select=solution_id&limit=10000")).length,
    solution_capabilities_total: (await get("/solution_capabilities?select=solution_id&limit=10000")).length,
    data_objects_total: (await get("/data_objects?select=id&limit=10000")).length,
    domain_data_objects_total: (await get("/domain_data_objects?select=domain_id&limit=10000")).length,
    cross_domain_handoffs_total: (await get("/cross_domain_handoffs?select=id&limit=10000")).length,
    rmm_solution_domains: (await get(`/solution_domains?domain_id=eq.${rmmDomainId}&select=solution_id&limit=10000`)).length,
    rmm_capability_domains: (await get(`/capability_domains?domain_id=eq.${rmmDomainId}&select=capability_id&limit=10000`)).length,
    rmm_mastered_data_objects: (
      await get(`/domain_data_objects?domain_id=eq.${rmmDomainId}&role=eq.master&select=data_object_id&limit=10000`)
    ).length,
    rmm_outbound_handoffs: (
      await get(`/cross_domain_handoffs?source_domain_id=eq.${rmmDomainId}&select=id&limit=10000`)
    ).length,
    rmm_inbound_handoffs: (
      await get(`/cross_domain_handoffs?target_domain_id=eq.${rmmDomainId}&select=id&limit=10000`)
    ).length,
  };
  console.log("\n=== Final counts ===");
  console.log(JSON.stringify(counts, null, 2));
}

await main();
