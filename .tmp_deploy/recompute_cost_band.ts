#!/usr/bin/env bun
// Recompute cost_band for all 109 domains under the new 500-user yearly TCO anchor.
// $ <$25k | $$ $25k-100k | $$$ $100k-500k | $$$$ $500k-2M | $$$$$ >$2M

const assignments: Record<string, string[]> = {
  "$": ["VIS-MGMT"],
  "$$": [
    "AP-AUTO", "ATS", "AUDIT", "BCM", "BEN-ADMIN", "COLLAB-GOV", "COMP-MGMT",
    "EMP-EXP", "ESIGN", "HAM", "HCMS", "KMS", "LMS", "LSD", "ONBOARDING",
    "PA", "PRM", "PROD-MGMT", "SMM", "SMP", "TEST-MGMT", "WSC",
  ],
  "$$$": [
    "ACCT-PLAN", "APM", "APIM", "APP-PAAS", "B2C-COMM", "BI", "CDP", "CLIN-DEV",
    "CLM", "CONV-AI", "CPQ", "DAM", "DCG", "DCIM", "DEM", "DI", "DISCOVERY",
    "DQ", "ECM", "ESG", "EXPENSE", "FINOPS", "FSM", "GRC", "GTM-PLAN", "HCM",
    "IDP", "IGA", "INTRANET", "ITAM", "IWMS", "KUBE-PLAT", "LCAP", "LOYALTY",
    "MA", "NPMD", "OMS", "OP-RES", "PAYROLL", "PRIV-MGMT", "PS-LIC", "PSA",
    "RET-STORE", "REV-INTEL", "RPA", "SALES-ENG", "SALES-PERF", "SAM", "SOAR",
    "SUP-LIFE", "SWP", "TALENT-MGMT", "THREAT-INTEL", "TPRM", "UEM", "VMS",
    "VSDP", "VULN-MGMT", "WEB-CONTOPS", "WFM",
  ],
  "$$$$": [
    "AIOPS", "CCAAS", "CMDB", "CRM", "CSM", "DXP", "EAM", "EPM", "HC-PATIENT",
    "HRSD", "IPAAS", "ITOM", "ITSM", "MDM", "MFG-OPS", "OBS", "PROC-MIN",
    "S2P", "SPM", "SUB-MGMT",
  ],
  "$$$$$": [
    "BANK-OPS", "ERP-FIN", "INS-CLAIMS", "SECOPS", "TELCO-BSS", "UTIL-OPS",
  ],
};

const total = Object.values(assignments).reduce((s, a) => s + a.length, 0);
if (total !== 109) throw new Error(`Expected 109 assignments, got ${total}`);

async function semantius(args: string[], jsonBody?: object): Promise<unknown> {
  const proc = Bun.spawn(["semantius", ...args], {
    stdin: jsonBody ? "pipe" : "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  if (jsonBody && proc.stdin) {
    proc.stdin.write(JSON.stringify(jsonBody));
    proc.stdin.end();
  }
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exitCode !== 0) throw new Error(`semantius exit ${exitCode}: ${stderr}`);
  return JSON.parse(stdout);
}

let totalUpdated = 0;
for (const [band, codes] of Object.entries(assignments)) {
  const codesQ = codes.map(c => `"${c}"`).join(",");
  const body = {
    method: "PATCH",
    path: `/domains?domain_code=in.(${codesQ})`,
    body: { cost_band: band },
    headers: { Prefer: "return=representation" },
  };
  const result = (await semantius(["call", "crud", "postgrestRequest"], body)) as Array<{ domain_code: string }>;
  console.log(`${band.padEnd(5)} → ${result.length} rows: ${result.map(r => r.domain_code).sort().join(", ")}`);
  totalUpdated += result.length;
}

console.log(`\nTotal updated: ${totalUpdated} / 109`);
