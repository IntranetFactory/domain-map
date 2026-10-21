#!/usr/bin/env bun
// Loads REMOTE-ACCESS market (Phase A + B) + BF mapping.
// Phase A — 6 caps, 6 new vendors, 8 new solutions, solution_domains, solution_capabilities
// Phase B — 2 data_objects, 4 domain_data_objects, 3 cross_domain_handoffs
// BF     — REMOTE-ACCESS → IT Operations (owner), Customer Service (contributor)

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
// CAPABILITIES
// ============================================================
const capabilities = [
  { capability_code: "RA-ATTENDED", capability_name: "Attended Remote Session",
    domain: "REMOTE-ACCESS",
    description: "Technician-initiated, end-user-present remote-control session: ad-hoc support workflow with code/PIN-based connection, end-user consent prompt, and live screen sharing." },
  { capability_code: "RA-UNATTENDED", capability_name: "Unattended Remote Access",
    domain: "REMOTE-ACCESS",
    description: "Always-installed agent enabling technician access to endpoints/servers without end-user presence, with grouping by customer/site/role and permission-based access policies." },
  { capability_code: "RA-RECORD", capability_name: "Session Recording and Audit",
    domain: "REMOTE-ACCESS",
    description: "Full-session video recording, keystroke logging, command audit, and tamper-evident retention to meet compliance (PCI, HIPAA, SOX) and incident-review needs." },
  { capability_code: "RA-XFER", capability_name: "File Transfer and Clipboard Sharing",
    domain: "REMOTE-ACCESS",
    description: "Bidirectional file transfer and clipboard synchronization between technician and target, with policy controls (DLP, file-type allowlists, size limits) for regulated environments." },
  { capability_code: "RA-ELEVATE", capability_name: "Just-In-Time Privilege Elevation",
    domain: "REMOTE-ACCESS",
    description: "Temporary elevation to administrator credentials inside the remote session without exposing the credential to the technician (vaulted runas), with approval workflow and time-boxing." },
  { capability_code: "RA-NAT", capability_name: "NAT Traversal and Connectivity",
    domain: "REMOTE-ACCESS",
    description: "Relay-server infrastructure to traverse NAT/firewall boundaries without VPN configuration, with auto-failover, geo-routing for latency, and end-to-end encryption." },
];

// ============================================================
// VENDORS (6 new; reuse ConnectWise, Zoho)
// ============================================================
const newVendors = [
  { vendor_name: "TeamViewer SE", vendor_url: "https://www.teamviewer.com",
    headquarters_country: "Germany",
    description: "Publicly listed remote-access and digital-workplace software vendor (XETRA: TMV).",
    notes: "Founded 2005, HQ Göppingen Germany. IPO 2019. Vends TeamViewer Remote, TeamViewer Tensor (enterprise), TeamViewer Frontline (AR for industrial)." },
  { vendor_name: "AnyDesk Software GmbH", vendor_url: "https://anydesk.com",
    headquarters_country: "Germany",
    description: "Remote-access software vendor; high-performance proprietary DeskRT codec.",
    notes: "Founded 2014, HQ Stuttgart. Backed by EQT (majority stake 2024). Recovering brand trust after 2024 production-server breach disclosure." },
  { vendor_name: "Splashtop Inc.", vendor_url: "https://www.splashtop.com",
    headquarters_country: "USA",
    description: "Remote-access and remote-support software vendor.",
    notes: "Founded 2006, HQ San Jose CA. Independent. Vends Splashtop Business Access (unattended), Splashtop SOS (attended), Splashtop Enterprise. Embedded in many RMM/MSP tools." },
  { vendor_name: "BeyondTrust Corporation", vendor_url: "https://www.beyondtrust.com",
    headquarters_country: "USA",
    description: "Privileged-access management and secure-remote-access vendor.",
    notes: "Founded 1985 (as PowerBroker), HQ Atlanta GA. Owned by Francisco Partners and Clearlake Capital. Vends BeyondTrust Remote Support (formerly Bomgar), Privileged Remote Access, PAM platform." },
  { vendor_name: "GoTo Technologies USA, Inc.", vendor_url: "https://www.goto.com",
    headquarters_country: "USA",
    description: "Remote-work and IT-management software vendor (formerly LogMeIn).",
    notes: "Founded 2003 (as LogMeIn), HQ Boston. Acquired by Vista Equity Partners and Francisco Partners (2020); rebranded GoTo (2022). Vends GoTo Resolve (RMM + remote support), GoTo Connect, GoTo Webinar, Rescue, LastPass (spun out 2024)." },
  { vendor_name: "RealVNC Limited", vendor_url: "https://www.realvnc.com",
    headquarters_country: "UK",
    description: "Remote-access vendor; original VNC commercializer.",
    notes: "Founded 2002, HQ Cambridge UK by the original AT&T Cambridge Research Lab VNC team. Independent. Vends RealVNC Connect across home / professional / enterprise tiers." },
];

// ============================================================
// SOLUTIONS (8)
// ============================================================
type SolutionSpec = {
  solution_name: string; vendor: string;
  solution_type: "saas" | "on_prem" | "hybrid" | "open_source" | "internal_build" | "manual_process";
  solution_url: string; description: string; notes?: string;
  primary?: string[]; secondary?: string[]; partial?: string[];
};
const newSolutions: SolutionSpec[] = [
  { solution_name: "TeamViewer", vendor: "TeamViewer SE", solution_type: "hybrid",
    solution_url: "https://www.teamviewer.com",
    description: "Cross-platform remote-access and remote-support tool: attended/unattended sessions, file transfer, session recording, mobile-to-mobile, AR-assisted support (Pilot/Frontline).",
    primary: ["REMOTE-ACCESS"], partial: ["ITSM"] },
  { solution_name: "AnyDesk", vendor: "AnyDesk Software GmbH", solution_type: "hybrid",
    solution_url: "https://anydesk.com",
    description: "High-performance remote-desktop tool built on the proprietary DeskRT codec: attended and unattended access, file transfer, session recording, lightweight footprint.",
    primary: ["REMOTE-ACCESS"] },
  { solution_name: "Splashtop Business Access", vendor: "Splashtop Inc.", solution_type: "saas",
    solution_url: "https://www.splashtop.com/products/remote-access/business-access",
    description: "Unattended remote-access tool for business and professional use: cross-platform, high-performance video/audio streaming, embedded in many RMM/MSP tools including Atera, Syncro, NinjaOne.",
    primary: ["REMOTE-ACCESS"] },
  { solution_name: "BeyondTrust Remote Support", vendor: "BeyondTrust Corporation", solution_type: "hybrid",
    solution_url: "https://www.beyondtrust.com/remote-support",
    description: "Enterprise/regulated remote-support tool (formerly Bomgar): hardened on-prem option, full session audit, vaulted credential injection, just-in-time elevation, deep ITSM integration.",
    notes: "Bomgar rebranded as BeyondTrust Remote Support post-2018 merger.",
    primary: ["REMOTE-ACCESS"], secondary: ["ITSM"] },
  { solution_name: "ScreenConnect", vendor: "ConnectWise LLC", solution_type: "hybrid",
    solution_url: "https://www.connectwise.com/platform/business-management/control",
    description: "MSP-focused remote-control tool (a.k.a. ConnectWise Control / ConnectWise ScreenConnect): attended/unattended sessions with strong customisation, integrated with ConnectWise PSA and RMM.",
    notes: "Acquired by ConnectWise in 2015; rebranded multiple times (ScreenConnect → ConnectWise Control → ConnectWise ScreenConnect).",
    primary: ["REMOTE-ACCESS"], secondary: ["MSP-PSA"] },
  { solution_name: "Zoho Assist", vendor: "Zoho Corporation Pvt. Ltd.", solution_type: "saas",
    solution_url: "https://www.zoho.com/assist/",
    description: "Cloud-native remote-support and remote-access tool: attended/unattended, file transfer, session recording, AR-assist; tightly integrated with Zoho Desk and Zoho One stack.",
    primary: ["REMOTE-ACCESS"], partial: ["ITSM"] },
  { solution_name: "GoTo Resolve", vendor: "GoTo Technologies USA, Inc.", solution_type: "saas",
    solution_url: "https://www.goto.com/it-management/resolve",
    description: "Unified IT-management and remote-support tool: remote control (attended/unattended), helpdesk ticketing, scripting, mobile MDM. Successor to LogMeIn Rescue + LogMeIn Central.",
    primary: ["REMOTE-ACCESS"], secondary: ["RMM", "ITSM"], partial: ["UEM"] },
  { solution_name: "RealVNC Connect", vendor: "RealVNC Limited", solution_type: "hybrid",
    solution_url: "https://www.realvnc.com/connect",
    description: "Cross-platform remote-access tool from the original VNC commercializers: attended/unattended sessions, encrypted relay, on-prem option, supported across desktop, mobile, embedded systems.",
    primary: ["REMOTE-ACCESS"] },
];

// ============================================================
// SOLUTION_CAPABILITIES
// ============================================================
type SolCapSpec = {
  solution: string; capability: string;
  delivery_strength: "native" | "partial" | "via_extension" | "not_supported";
  notes?: string;
};
const solCaps: SolCapSpec[] = [
  // TeamViewer — broad
  { solution: "TeamViewer", capability: "RA-ATTENDED", delivery_strength: "native" },
  { solution: "TeamViewer", capability: "RA-UNATTENDED", delivery_strength: "native" },
  { solution: "TeamViewer", capability: "RA-RECORD", delivery_strength: "native" },
  { solution: "TeamViewer", capability: "RA-XFER", delivery_strength: "native" },
  { solution: "TeamViewer", capability: "RA-ELEVATE", delivery_strength: "partial", notes: "Available in Tensor; not in lower tiers." },
  { solution: "TeamViewer", capability: "RA-NAT", delivery_strength: "native" },
  // AnyDesk — performance-focused
  { solution: "AnyDesk", capability: "RA-ATTENDED", delivery_strength: "native" },
  { solution: "AnyDesk", capability: "RA-UNATTENDED", delivery_strength: "native" },
  { solution: "AnyDesk", capability: "RA-RECORD", delivery_strength: "native" },
  { solution: "AnyDesk", capability: "RA-XFER", delivery_strength: "native" },
  { solution: "AnyDesk", capability: "RA-ELEVATE", delivery_strength: "partial" },
  { solution: "AnyDesk", capability: "RA-NAT", delivery_strength: "native", notes: "DeskRT codec optimized for low-bandwidth NAT-traversed connections." },
  // Splashtop Business Access — unattended-focused
  { solution: "Splashtop Business Access", capability: "RA-ATTENDED", delivery_strength: "partial", notes: "Splashtop SOS is the attended sibling; Business Access is unattended-focused." },
  { solution: "Splashtop Business Access", capability: "RA-UNATTENDED", delivery_strength: "native" },
  { solution: "Splashtop Business Access", capability: "RA-RECORD", delivery_strength: "native" },
  { solution: "Splashtop Business Access", capability: "RA-XFER", delivery_strength: "native" },
  { solution: "Splashtop Business Access", capability: "RA-ELEVATE", delivery_strength: "partial" },
  { solution: "Splashtop Business Access", capability: "RA-NAT", delivery_strength: "native" },
  // BeyondTrust Remote Support — enterprise/regulated
  { solution: "BeyondTrust Remote Support", capability: "RA-ATTENDED", delivery_strength: "native" },
  { solution: "BeyondTrust Remote Support", capability: "RA-UNATTENDED", delivery_strength: "native" },
  { solution: "BeyondTrust Remote Support", capability: "RA-RECORD", delivery_strength: "native", notes: "Full-session video + audit trail for compliance." },
  { solution: "BeyondTrust Remote Support", capability: "RA-XFER", delivery_strength: "native" },
  { solution: "BeyondTrust Remote Support", capability: "RA-ELEVATE", delivery_strength: "native", notes: "Vaulted-credential injection is a flagship enterprise capability." },
  { solution: "BeyondTrust Remote Support", capability: "RA-NAT", delivery_strength: "native" },
  // ScreenConnect
  { solution: "ScreenConnect", capability: "RA-ATTENDED", delivery_strength: "native" },
  { solution: "ScreenConnect", capability: "RA-UNATTENDED", delivery_strength: "native" },
  { solution: "ScreenConnect", capability: "RA-RECORD", delivery_strength: "native" },
  { solution: "ScreenConnect", capability: "RA-XFER", delivery_strength: "native" },
  { solution: "ScreenConnect", capability: "RA-ELEVATE", delivery_strength: "partial" },
  { solution: "ScreenConnect", capability: "RA-NAT", delivery_strength: "native" },
  // Zoho Assist
  { solution: "Zoho Assist", capability: "RA-ATTENDED", delivery_strength: "native" },
  { solution: "Zoho Assist", capability: "RA-UNATTENDED", delivery_strength: "native" },
  { solution: "Zoho Assist", capability: "RA-RECORD", delivery_strength: "native" },
  { solution: "Zoho Assist", capability: "RA-XFER", delivery_strength: "native" },
  { solution: "Zoho Assist", capability: "RA-ELEVATE", delivery_strength: "partial" },
  { solution: "Zoho Assist", capability: "RA-NAT", delivery_strength: "native" },
  // GoTo Resolve — broader IT-mgmt
  { solution: "GoTo Resolve", capability: "RA-ATTENDED", delivery_strength: "native" },
  { solution: "GoTo Resolve", capability: "RA-UNATTENDED", delivery_strength: "native" },
  { solution: "GoTo Resolve", capability: "RA-RECORD", delivery_strength: "native" },
  { solution: "GoTo Resolve", capability: "RA-XFER", delivery_strength: "native" },
  { solution: "GoTo Resolve", capability: "RA-ELEVATE", delivery_strength: "native", notes: "Zero-trust controls with helpdesk-issued one-time elevation." },
  { solution: "GoTo Resolve", capability: "RA-NAT", delivery_strength: "native" },
  // RealVNC Connect
  { solution: "RealVNC Connect", capability: "RA-ATTENDED", delivery_strength: "native" },
  { solution: "RealVNC Connect", capability: "RA-UNATTENDED", delivery_strength: "native" },
  { solution: "RealVNC Connect", capability: "RA-RECORD", delivery_strength: "partial", notes: "Available in Enterprise; not in Professional." },
  { solution: "RealVNC Connect", capability: "RA-XFER", delivery_strength: "native" },
  { solution: "RealVNC Connect", capability: "RA-ELEVATE", delivery_strength: "partial" },
  { solution: "RealVNC Connect", capability: "RA-NAT", delivery_strength: "native" },
];

// ============================================================
// DATA OBJECTS
// ============================================================
const newDataObjects = [
  { data_object_name: "remote_sessions", singular_label: "Remote Session", plural_label: "Remote Sessions", display_label: "Remote Session",
    description: "Established remote-control session: technician identity, target endpoint, session type (attended/unattended), start/end timestamps, transferred files, elevation events, and link to recording artifact. The unit of work in remote-access tools." },
  { data_object_name: "session_recordings", singular_label: "Session Recording", plural_label: "Session Recordings", display_label: "Session Recording",
    description: "Video and audit-log artifact captured from a remote session: storage location, retention policy, redaction state, and downstream compliance evidence. Distinct artifact lifecycle from the parent remote_sessions record." },
];

// ============================================================
// DDO
// ============================================================
type DdoSpec = { domain_code: string; data_object_name: string; role: "master" | "contributor" | "consumer" | "derived"; notes?: string };
const ddoRows: DdoSpec[] = [
  { domain_code: "REMOTE-ACCESS", data_object_name: "remote_sessions", role: "master",
    notes: "Session lifecycle, technician/target identity, elevation events, file-transfer audit." },
  { domain_code: "REMOTE-ACCESS", data_object_name: "session_recordings", role: "master",
    notes: "Video + audit-log artifacts with retention and chain-of-custody." },
  { domain_code: "REMOTE-ACCESS", data_object_name: "rmm_agents", role: "consumer",
    notes: "Reads RMM agent inventory to target endpoints; session launches reuse the same agent footprint in bundled stacks." },
  { domain_code: "REMOTE-ACCESS", data_object_name: "incidents", role: "consumer",
    notes: "Reads ITSM incidents to attach session context to the parent ticket and close the loop on technician work." },
];

// ============================================================
// HANDOFFS
// ============================================================
type HandoffSpec = {
  source_domain_code: string; target_domain_code: string; data_object_name: string;
  trigger_event: string;
  integration_pattern: "event_stream" | "api_call" | "batch_sync" | "manual_handoff" | "file_drop";
  friction_level: "high" | "medium" | "low";
  description: string; notes?: string;
};
const handoffs: HandoffSpec[] = [
  { source_domain_code: "REMOTE-ACCESS", target_domain_code: "ITSM", data_object_name: "incidents",
    trigger_event: "session.completed",
    integration_pattern: "api_call", friction_level: "medium",
    description: "Completed remote session writes a session summary (duration, technician, actions taken, recording link) back to the originating ITSM incident as a work-note. Failure modes: ticket-id correlation is brittle when session was launched outside the ticket flow; recording links break when retention policy expires before the ticket closes.",
    notes: "Strongest in same-vendor stacks (e.g., BeyondTrust + ServiceNow); cross-vendor stacks rely on connector quality." },
  { source_domain_code: "REMOTE-ACCESS", target_domain_code: "MSP-PSA", data_object_name: "msp_time_entries",
    trigger_event: "session.completed",
    integration_pattern: "manual_handoff", friction_level: "high",
    description: "Session duration should populate a billable time entry in MSP-PSA, but in cross-vendor MSP stacks technicians manually transcribe session minutes into the PSA. Failure modes: session minutes go unbilled, customer disputes arise over after-the-fact time entries, productivity reporting under-counts work.",
    notes: "Classic time-tracking friction in cross-vendor MSP stacks; native in unified vendor stacks (ConnectWise PSA ↔ ScreenConnect, Atera unified)." },
  { source_domain_code: "REMOTE-ACCESS", target_domain_code: "GRC", data_object_name: "session_recordings",
    trigger_event: "session.recorded",
    integration_pattern: "batch_sync", friction_level: "medium",
    description: "Recorded sessions feed compliance evidence archives for PCI/HIPAA/SOX audits. Failure modes: retention-policy mismatch between RA tool and GRC archive; redaction obligations (passwords, PHI) inconsistently applied; chain-of-custody for evidence is rarely tamper-evident across systems.",
    notes: "Only fires in regulated environments; GRC-domain dependency may not yet be loaded — script skips silently if target missing." },
];

// ============================================================
// BF DOMAINS
// ============================================================
type BfdSpec = { bf_name: string; domain_code: string; responsibility_type: "owner" | "contributor" | "consumer"; notes?: string };
const bfdRows: BfdSpec[] = [
  { bf_name: "IT Operations", domain_code: "REMOTE-ACCESS", responsibility_type: "owner",
    notes: "Primary buyer and operator: IT service desk / endpoint support / MSP service-delivery teams." },
  { bf_name: "Customer Service", domain_code: "REMOTE-ACCESS", responsibility_type: "contributor",
    notes: "Customer-facing remote-support workflows (GoTo Rescue, ScreenConnect for end-customer support) place this domain into the customer-service stack as well." },
  { bf_name: "Security", domain_code: "REMOTE-ACCESS", responsibility_type: "contributor",
    notes: "Session recording, elevation policy, and credential vaulting fall under security operations and PAM oversight." },
];

// ============================================================
// RUN
// ============================================================
async function main() {
  const allDomainsRaw = await get("/domains?select=id,domain_code&limit=10000");
  const allDomainMap = new Map<string, number>();
  for (const d of allDomainsRaw) allDomainMap.set(String(d.domain_code), Number(d.id));

  console.log("\n=== Capabilities ===");
  const capRows = capabilities.map(c => ({
    capability_code: c.capability_code, capability_name: c.capability_name, description: c.description,
  }));
  const capMap = await syncTable("/capabilities", capRows, "capability_code");

  console.log("\n=== capability_domains ===");
  const existingCapDom = await get("/capability_domains?select=capability_id,domain_id&limit=10000");
  const existingCapDomSet = new Set(existingCapDom.map(r => `${r.capability_id}:${r.domain_id}`));
  const newCdRows: Row[] = [];
  for (const c of capabilities) {
    const cid = capMap.get(c.capability_code)!;
    const did = allDomainMap.get(c.domain)!;
    if (existingCapDomSet.has(`${cid}:${did}`)) continue;
    newCdRows.push({ capability_id: cid, domain_id: did, notes: "" });
  }
  if (newCdRows.length > 0) {
    console.log(`  inserting ${newCdRows.length}`); await insert("/capability_domains", newCdRows);
  } else console.log("  none");

  console.log("\n=== Vendors ===");
  const vendorMap = await syncTable("/vendors", newVendors.map(v => ({ ...v })), "vendor_name");
  const allVendorsRaw = await get("/vendors?select=id,vendor_name&limit=10000");
  for (const v of allVendorsRaw) vendorMap.set(String(v.vendor_name), Number(v.id));

  console.log("\n=== Solutions ===");
  const solutionRows = newSolutions.map(s => {
    const vendorId = vendorMap.get(s.vendor);
    if (!vendorId) throw new Error(`Vendor not found: ${s.vendor}`);
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
  const existingSolDom = await get("/solution_domains?select=solution_id,domain_id,coverage_level&limit=10000");
  const existingSolDomSet = new Set(existingSolDom.map(r => `${r.solution_id}:${r.domain_id}:${r.coverage_level}`));
  const newSdRows: Row[] = [];
  let skippedSd = 0;
  for (const s of newSolutions) {
    const sid = solutionMap.get(s.solution_name)!;
    const buildLink = (code: string, coverage: "primary" | "secondary" | "partial") => {
      const did = allDomainMap.get(code);
      if (!did) { console.warn(`  ! domain ${code} not found`); return; }
      const key = `${sid}:${did}:${coverage}`;
      if (existingSolDomSet.has(key)) { skippedSd++; return; }
      existingSolDomSet.add(key);
      newSdRows.push({ solution_id: sid, domain_id: did, coverage_level: coverage, notes: "" });
    };
    for (const code of s.primary ?? []) buildLink(code, "primary");
    for (const code of s.secondary ?? []) buildLink(code, "secondary");
    for (const code of s.partial ?? []) buildLink(code, "partial");
  }
  if (newSdRows.length > 0) {
    console.log(`  inserting ${newSdRows.length} (${skippedSd} skipped)`);
    await insert("/solution_domains", newSdRows);
  } else console.log(`  none (${skippedSd} skipped)`);

  console.log("\n=== solution_capabilities ===");
  const existingSolCap = await get("/solution_capabilities?select=solution_id,capability_id&limit=10000");
  const existingSolCapSet = new Set(existingSolCap.map(r => `${r.solution_id}:${r.capability_id}`));
  const newScRows: Row[] = [];
  let skippedSc = 0;
  for (const sc of solCaps) {
    const sid = solutionMap.get(sc.solution);
    const cid = capMap.get(sc.capability);
    if (!sid || !cid) throw new Error(`FK failure: ${sc.solution}/${sc.capability}`);
    if (existingSolCapSet.has(`${sid}:${cid}`)) { skippedSc++; continue; }
    existingSolCapSet.add(`${sid}:${cid}`);
    newScRows.push({ solution_id: sid, capability_id: cid, delivery_strength: sc.delivery_strength, notes: sc.notes ?? "" });
  }
  if (newScRows.length > 0) {
    console.log(`  inserting ${newScRows.length} (${skippedSc} skipped)`);
    await insert("/solution_capabilities", newScRows);
  } else console.log(`  none (${skippedSc} skipped)`);

  console.log("\n=== Data objects ===");
  const existingDo = await get("/data_objects?select=id,data_object_name&limit=10000");
  const existingDoNames = new Set(existingDo.map(r => String(r.data_object_name)));
  const missingDo = newDataObjects.filter(d => !existingDoNames.has(d.data_object_name));
  if (missingDo.length > 0) {
    console.log(`  inserting ${missingDo.length}`); await insert("/data_objects", missingDo);
  } else console.log("  none");
  const allDo = await get("/data_objects?select=id,data_object_name&limit=10000");
  const doMap = new Map<string, number>();
  for (const r of allDo) doMap.set(String(r.data_object_name), Number(r.id));

  console.log("\n=== domain_data_objects ===");
  const existingDdo = await get("/domain_data_objects?select=domain_id,data_object_id,role&limit=10000");
  const existingDdoSet = new Set(existingDdo.map(r => `${r.domain_id}:${r.data_object_id}:${r.role}`));
  const newDdoRows: Row[] = [];
  let skippedDdo = 0;
  for (const d of ddoRows) {
    const did = allDomainMap.get(d.domain_code);
    const oid = doMap.get(d.data_object_name);
    if (!did || !oid) throw new Error(`FK failure ddo ${d.domain_code}/${d.data_object_name}`);
    if (existingDdoSet.has(`${did}:${oid}:${d.role}`)) { skippedDdo++; continue; }
    existingDdoSet.add(`${did}:${oid}:${d.role}`);
    newDdoRows.push({ domain_id: did, data_object_id: oid, role: d.role, notes: d.notes ?? "" });
  }
  if (newDdoRows.length > 0) {
    console.log(`  inserting ${newDdoRows.length} (${skippedDdo} skipped)`);
    await insert("/domain_data_objects", newDdoRows);
  } else console.log(`  none (${skippedDdo} skipped)`);

  console.log("\n=== cross_domain_handoffs ===");
  const existingHo = await get("/cross_domain_handoffs?select=source_domain_id,target_domain_id,data_object_id,trigger_event&limit=10000");
  const existingHoSet = new Set(existingHo.map(r => `${r.source_domain_id}:${r.target_domain_id}:${r.data_object_id}:${r.trigger_event}`));
  const newHoRows: Row[] = [];
  let skippedHo = 0;
  for (const h of handoffs) {
    const src = allDomainMap.get(h.source_domain_code);
    const tgt = allDomainMap.get(h.target_domain_code);
    const oid = doMap.get(h.data_object_name);
    if (!src) { console.warn(`  ! src domain ${h.source_domain_code} missing — skip`); continue; }
    if (!tgt) { console.warn(`  ! target domain ${h.target_domain_code} missing — skip ${h.trigger_event}`); continue; }
    if (!oid) { console.warn(`  ! data_object ${h.data_object_name} missing — skip ${h.trigger_event}`); continue; }
    const key = `${src}:${tgt}:${oid}:${h.trigger_event}`;
    if (existingHoSet.has(key)) { skippedHo++; continue; }
    existingHoSet.add(key);
    newHoRows.push({
      source_domain_id: src, target_domain_id: tgt, data_object_id: oid,
      trigger_event: h.trigger_event, integration_pattern: h.integration_pattern,
      friction_level: h.friction_level, description: h.description, notes: h.notes ?? "",
    });
  }
  if (newHoRows.length > 0) {
    console.log(`  inserting ${newHoRows.length} (${skippedHo} skipped)`);
    await insert("/cross_domain_handoffs", newHoRows);
  } else console.log(`  none (${skippedHo} skipped)`);

  console.log("\n=== business_function_domains ===");
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

  console.log("\n=== Done. ===");
}
await main();
