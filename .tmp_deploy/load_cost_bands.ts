#!/usr/bin/env bun
// Adds a `cost_band` enum field to `domains` and `solutions`, then loads:
//   - per-domain band (typical annual subscription tier)
//   - per-solution band (inherited from primary domain, with marquee-vendor overrides)
// Idempotent. Run from project root.

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

async function call(method: string, path: string, body?: unknown): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  const payload: Row = { method, path };
  if (body !== undefined) payload.body = body;
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exit = await proc.exited;
  if (exit !== 0) throw new Error(`semantius (${method} ${path}) failed (${exit}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

async function callTool(server: string, tool: string, args: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", server, tool], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(args));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exit = await proc.exited;
  if (exit !== 0) throw new Error(`semantius (${tool}) failed (${exit}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const ENUM_VALUES = ["$", "$$", "$$$", "$$$$", "$$$$$"];

// ----------------------------------------------------------------
// Step 1: ensure `cost_band` field exists on domains and solutions
// ----------------------------------------------------------------
async function ensureCostBandField(table: string, fieldOrder: number) {
  const existing = await call(
    "GET",
    `/fields?table_name=eq.${table}&field_name=eq.cost_band&select=field_name`,
  );
  if (existing.length > 0) {
    console.log(`  ${table}.cost_band already exists`);
    return;
  }
  console.log(`  creating ${table}.cost_band ...`);
  await callTool("crud", "create_field", {
    data: {
      table_name: table,
      field_name: "cost_band",
      title: "Cost Band",
      format: "enum",
      enum_values: ENUM_VALUES,
      default_value: "",
      width: "default",
      field_order: fieldOrder,
      description: "Typical annual subscription tier for an enterprise deployment. $ <$50K, $$ $50K-$250K, $$$ $250K-$1M, $$$$ $1M-$5M, $$$$$ $5M+.",
      searchable: false,
      input_type: "default",
      cube_type: "auto",
    },
  });
  console.log(`  ${table}.cost_band created`);
}

// ----------------------------------------------------------------
// Step 2: per-domain bands
// ----------------------------------------------------------------
const domainBands: Record<string, string> = {
  // $$$$$
  CRM: "$$$$$", HCM: "$$$$$", "ERP-FIN": "$$$$$", "BANK-OPS": "$$$$$",
  "INS-CLAIMS": "$$$$$", "TELCO-BSS": "$$$$$", "HC-PATIENT": "$$$$$",
  "UTIL-OPS": "$$$$$", SECOPS: "$$$$$", OBS: "$$$$$",

  // $$$$
  ITSM: "$$$$", CSM: "$$$$", FSM: "$$$$", HRSD: "$$$$", OMS: "$$$$",
  CCAAS: "$$$$", CMDB: "$$$$", AIOPS: "$$$$", "KUBE-PLAT": "$$$$",
  APIM: "$$$$", VSDP: "$$$$", IPAAS: "$$$$", LCAP: "$$$$", "APP-PAAS": "$$$$",
  MDM: "$$$$", DI: "$$$$", BI: "$$$$", DCG: "$$$$", DXP: "$$$$",
  MA: "$$$$", CDP: "$$$$", "B2C-COMM": "$$$$", EPM: "$$$$",
  PAYROLL: "$$$$", S2P: "$$$$", CLM: "$$$$", GRC: "$$$$",
  "VULN-MGMT": "$$$$", RPA: "$$$$", "PROC-MIN": "$$$$", "MFG-OPS": "$$$$",

  // $$$
  ITAM: "$$$", SAM: "$$$", HAM: "$$$", FINOPS: "$$$", ITOM: "$$$",
  DISCOVERY: "$$$", DCIM: "$$$", NPMD: "$$$", DEM: "$$$", UEM: "$$$",
  SMP: "$$$", EAM: "$$$", IWMS: "$$$", ATS: "$$$", "TALENT-MGMT": "$$$",
  LMS: "$$$", WFM: "$$$", "COMP-MGMT": "$$$", "BEN-ADMIN": "$$$",
  PA: "$$$", EXPENSE: "$$$", PSA: "$$$", "AP-AUTO": "$$$",
  "SUP-LIFE": "$$$", TPRM: "$$$", "PRIV-MGMT": "$$$", ESG: "$$$",
  SOAR: "$$$", "THREAT-INTEL": "$$$", SPM: "$$$", APM: "$$$",
  CPQ: "$$$", "SUB-MGMT": "$$$", DAM: "$$$", ECM: "$$$",
  LOYALTY: "$$$", "CONV-AI": "$$$", IDP: "$$$", KMS: "$$$",
  VMS: "$$$", DQ: "$$$", "PS-LIC": "$$$", "CLIN-DEV": "$$$",
  WSC: "$$$",

  // $$
  ESIGN: "$$", HCMS: "$$", PRM: "$$", "SALES-ENG": "$$",
  "EMP-EXP": "$$", "TEST-MGMT": "$$", BCM: "$$", AUDIT: "$$",
  "OP-RES": "$$", LSD: "$$",

  // $
  "VIS-MGMT": "$",
};

// ----------------------------------------------------------------
// Step 3: vendor tier overrides applied per solution
// Bumps relative to the solution's primary-domain band.
// ----------------------------------------------------------------
const VENDOR_BUMP: Record<string, number> = {
  // Top-tier enterprise vendors: bump up one band (capped at $$$$$)
  "Salesforce Inc": +1,
  "SAP SE": +1,
  "Workday": +1,
  "Oracle": +1,
  "ServiceNow Inc": +1,
  "Epic Systems": +1,
  "Guidewire": +1,
  "Duck Creek Technologies": +1,
  "Amdocs": +1,
  "Netcracker": +1,
  "Datadog": +1,
  "Splunk": +1,
  "Dynatrace": +1,
  "IBM": +1,

  // SMB / mid-market price leaders: bump down one band (floored at $)
  "Zoho Corporation": -1,
  "Pipedrive": -1,
  "Freshworks": -1,
  "HubSpot": -1,
  "SugarCRM": -1,
  "Creatio": -1,
  "BambooHR": -1,
  "Personio": -1,
  "Brex": -1,
  "Ramp": -1,
  "Smartsheet": -1,
  "Asana": -1,
  "Lever": -1,
  "Gusto": -1,
  "Paychex": -1,
  "Rippling": -1,
  "HiBob": -1,
};

function bandIndex(band: string): number {
  const i = ENUM_VALUES.indexOf(band);
  return i < 0 ? 2 : i;
}

function applyBump(band: string, bump: number): string {
  const i = bandIndex(band);
  const j = Math.max(0, Math.min(ENUM_VALUES.length - 1, i + bump));
  return ENUM_VALUES[j];
}

// ----------------------------------------------------------------
async function main() {
  console.log("Step 1: ensure cost_band field exists");
  await ensureCostBandField("domains", 1000080);
  await ensureCostBandField("solutions", 1000080);

  // -------- Step 2: domains --------
  console.log("\nStep 2: load domain cost bands");
  const allDomains = await call("GET", "/domains?select=id,domain_code,cost_band&limit=1000");
  const codeToDomain = new Map<string, { id: number; band: string }>();
  for (const r of allDomains) {
    codeToDomain.set(String(r.domain_code), { id: Number(r.id), band: String(r.cost_band ?? "") });
  }
  const missing = [...codeToDomain.keys()].filter(c => !(c in domainBands));
  if (missing.length > 0) console.warn(`  domains not in bands map: ${missing.join(", ")}`);

  let domainUpdates = 0;
  for (const [code, band] of Object.entries(domainBands)) {
    const d = codeToDomain.get(code);
    if (!d) {
      console.warn(`  skip ${code}: not in catalog`);
      continue;
    }
    if (d.band === band) continue;
    await call("PATCH", `/domains?id=eq.${d.id}`, { cost_band: band });
    domainUpdates += 1;
  }
  console.log(`  ${domainUpdates} domain rows updated`);

  // -------- Step 3: solutions --------
  console.log("\nStep 3: load solution cost bands");

  // Build a fresh code -> band map from what we just wrote (or from existing values)
  const refreshedDomains = await call("GET", "/domains?select=id,domain_code,cost_band&limit=1000");
  const idToDomainBand = new Map<number, string>();
  for (const r of refreshedDomains) {
    idToDomainBand.set(Number(r.id), String(r.cost_band ?? ""));
  }

  // Read solutions and their primary-domain junctions, plus vendor name
  const solutions = await call(
    "GET",
    "/solutions?select=id,solution_name,vendor_id,cost_band&limit=1000",
  );
  console.log(`  ${solutions.length} solutions to band`);

  const vendors = await call("GET", "/vendors?select=id,vendor_name&limit=1000");
  const idToVendor = new Map<number, string>();
  for (const v of vendors) idToVendor.set(Number(v.id), String(v.vendor_name));

  // solution_domains: pick the row with coverage_level=primary; otherwise any
  const sd = await call(
    "GET",
    "/solution_domains?select=solution_id,domain_id,coverage_level&limit=10000",
  );
  const solutionPrimaryDomain = new Map<number, number>();
  const solutionAnyDomain = new Map<number, number>();
  for (const row of sd) {
    const sid = Number(row.solution_id);
    const did = Number(row.domain_id);
    if (!solutionAnyDomain.has(sid)) solutionAnyDomain.set(sid, did);
    if (row.coverage_level === "primary" && !solutionPrimaryDomain.has(sid)) {
      solutionPrimaryDomain.set(sid, did);
    }
  }

  let solutionUpdates = 0;
  let unmatched = 0;
  const bandHist: Record<string, number> = {};
  for (const s of solutions) {
    const sid = Number(s.id);
    const did =
      solutionPrimaryDomain.get(sid) ??
      solutionAnyDomain.get(sid);
    if (!did) {
      unmatched += 1;
      continue;
    }
    const domainBand = idToDomainBand.get(did);
    if (!domainBand) continue;
    const vendor = idToVendor.get(Number(s.vendor_id));
    const bump = vendor && vendor in VENDOR_BUMP ? VENDOR_BUMP[vendor] : 0;
    const target = applyBump(domainBand, bump);
    bandHist[target] = (bandHist[target] ?? 0) + 1;
    if (String(s.cost_band ?? "") === target) continue;
    await call("PATCH", `/solutions?id=eq.${sid}`, { cost_band: target });
    solutionUpdates += 1;
  }
  console.log(`  ${solutionUpdates} solution rows updated, ${unmatched} unmatched (no domain link)`);

  console.log("\nSolution band distribution:");
  for (const b of ENUM_VALUES) {
    const n = bandHist[b] ?? 0;
    console.log(`  ${b.padEnd(6)}  ${String(n).padStart(3)}  ${"#".repeat(n)}`);
  }

  console.log("\nDomain band distribution:");
  const domainHist: Record<string, number> = {};
  for (const r of refreshedDomains) {
    const b = String(r.cost_band ?? "(empty)");
    domainHist[b] = (domainHist[b] ?? 0) + 1;
  }
  for (const b of [...ENUM_VALUES, "(empty)"]) {
    const n = domainHist[b];
    if (!n) continue;
    console.log(`  ${b.padEnd(6)}  ${String(n).padStart(3)}  ${"#".repeat(n)}`);
  }
}

main().catch(err => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
