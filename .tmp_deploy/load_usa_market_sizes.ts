#!/usr/bin/env bun
// Loads per-domain USA market size estimates (USD millions, 2025).
// Ballpark figures from public market research (Gartner/IDC/Forrester class), ±30%.
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

const SOURCE_YEAR = 2025;

// Per-domain USA TAM in USD millions
const usaMarketSizes: Record<string, number> = {
  // Tier XL ($10B+)
  CRM: 35000,
  "ERP-FIN": 25000,
  SECOPS: 15000,
  HCM: 12000,
  BI: 12000,
  CSM: 10000,

  // Tier L ($5-10B)
  OBS: 8000,
  ITOM: 8000,
  MA: 8000,
  "B2C-COMM": 8000,
  WSC: 8000,
  "APP-PAAS": 8000,
  ECM: 8000,
  PAYROLL: 8000,
  CCAAS: 8000,
  ITSM: 7000,
  S2P: 7000,
  "HC-PATIENT": 6000,
  LMS: 5500,
  VSDP: 5500,
  LCAP: 5000,
  EPM: 5000,
  DXP: 5000,
  WFM: 5000,
  "BANK-OPS": 5000,
  DI: 5000,

  // Tier M ($2-5B)
  IPAAS: 4500,
  UEM: 4000,
  "INS-CLAIMS": 3500,
  "VULN-MGMT": 3500,
  GRC: 3500,
  "TELCO-BSS": 3500,
  "MFG-OPS": 3500,
  EAM: 3500,
  MDM: 3500,
  ESIGN: 3500,
  "SALES-ENG": 3500,
  "KUBE-PLAT": 3500,
  IGA: 3000,
  EXPENSE: 3000,
  ATS: 3000,
  RPA: 2500,
  "AP-AUTO": 2500,
  CLM: 2500,
  FSM: 2500,
  "TALENT-MGMT": 2500,
  "BEN-ADMIN": 2500,
  PSA: 2500,
  SPM: 2500,
  CDP: 2500,
  APIM: 2500,
  DCG: 2500,
  "UTIL-OPS": 2500,
  "SUB-MGMT": 2500,
  CPQ: 2000,
  NPMD: 2000,
  DAM: 2000,

  // Tier S ($1-2B)
  OMS: 1800,
  VMS: 1800,
  "THREAT-INTEL": 1800,
  ESG: 1500,
  FINOPS: 1500,
  SAM: 1500,
  "EMP-EXP": 1500,
  IWMS: 1500,
  AIOPS: 1500,
  "CONV-AI": 1500,
  DQ: 1500,
  DCIM: 1500,
  IDP: 1200,
  "RET-STORE": 1200,
  LSD: 1200,
  HCMS: 1200,
  "COMP-MGMT": 1200,
  "PRIV-MGMT": 1200,
  KMS: 1000,
  TPRM: 1000,
  "PS-LIC": 1000,

  // Tier XS (<$1B)
  DEM: 800,
  ITAM: 800,
  CMDB: 800,
  LOYALTY: 800,
  SMP: 800,
  HRSD: 700,
  "PROC-MIN": 700,
  "TEST-MGMT": 700,
  SOAR: 700,
  PA: 700,
  PRM: 700,
  AUDIT: 500,
  DISCOVERY: 500,
  HAM: 500,
  "SUP-LIFE": 500,
  APM: 400,
  "CLIN-DEV": 400,
  BCM: 300,
  "OP-RES": 250,
  "VIS-MGMT": 200,
};

async function main() {
  console.log(`Loading USA market size estimates (USD M, ${SOURCE_YEAR}) for ${Object.keys(usaMarketSizes).length} domains`);

  const allDomains = await call(
    "GET",
    "/domains?select=id,domain_code,usa_market_size_usd_m,market_size_source_year&limit=1000",
  );
  const codeToDomain = new Map<string, { id: number; size: number | null; year: number | null }>();
  for (const r of allDomains) {
    codeToDomain.set(String(r.domain_code), {
      id: Number(r.id),
      size: r.usa_market_size_usd_m == null ? null : Number(r.usa_market_size_usd_m),
      year: r.market_size_source_year == null ? null : Number(r.market_size_source_year),
    });
  }

  const inCatalogNotInMap = [...codeToDomain.keys()].filter(c => !(c in usaMarketSizes));
  if (inCatalogNotInMap.length > 0) {
    console.warn(`  domains in catalog with no estimate: ${inCatalogNotInMap.join(", ")}`);
  }
  const inMapNotInCatalog = Object.keys(usaMarketSizes).filter(c => !codeToDomain.has(c));
  if (inMapNotInCatalog.length > 0) {
    console.warn(`  estimates with no matching catalog row (skipping): ${inMapNotInCatalog.join(", ")}`);
  }

  let updates = 0;
  let unchanged = 0;
  for (const [code, size] of Object.entries(usaMarketSizes)) {
    const d = codeToDomain.get(code);
    if (!d) continue;
    if (d.size === size && d.year === SOURCE_YEAR) {
      unchanged += 1;
      continue;
    }
    await call("PATCH", `/domains?id=eq.${d.id}`, {
      usa_market_size_usd_m: size,
      market_size_source_year: SOURCE_YEAR,
    });
    updates += 1;
  }

  const total = Object.values(usaMarketSizes).reduce((a, b) => a + b, 0);
  console.log(`\n  updates:    ${updates}`);
  console.log(`  unchanged:  ${unchanged}`);
  console.log(`  total USA TAM (sum of estimates): USD ${total.toLocaleString()} M`);
  console.log(`\n  UI: https://tests.semantius.app/domain_map/domains`);
}

main().catch(err => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
