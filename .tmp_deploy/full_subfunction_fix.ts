#!/usr/bin/env bun
// Full fix: systematic pass to ensure every domain owns to the most-specific
// sub-function in the business_functions tree. Adds 9 new sub-functions and
// re-points 63 owner rows across all clusters. Idempotent.

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

// ============================================================
// 1. NEW SUB-FUNCTIONS
// ============================================================
const newSubs: { name: string; description: string; parent: string }[] = [
  // HR — 7 new subs
  { name: "HR Service Delivery",       description: "HR shared-services delivery: case management, employee self-service, knowledge, tier-1/tier-2 case escalation. The service-desk pattern applied to HR.", parent: "Human Resources" },
  { name: "Talent Development",        description: "Performance management, succession planning, calibration, talent reviews, career development, internal mobility.",                                         parent: "Human Resources" },
  { name: "Compensation",              description: "Salary planning, incentive programs, equity administration, pay equity, compensation benchmarking. The Total Rewards function minus benefits.",            parent: "Human Resources" },
  { name: "Employee Experience",       description: "Engagement surveys, pulse listening, employee journey orchestration, EX programs, recognition. Cross-cuts internal comms but anchored in HR.",             parent: "Human Resources" },
  { name: "People Analytics",          description: "HR data and analytics function: workforce metrics, attrition prediction, DEI analytics, manager dashboards, predictive people insights.",                  parent: "Human Resources" },
  { name: "Workforce Planning",        description: "Strategic workforce planning, headcount planning, scenario modelling for the workforce, plan-to-execution handoff with FP&A.",                             parent: "Human Resources" },
  { name: "Employee Onboarding",       description: "First-day-through-90-day onboarding: pre-boarding paperwork, provisioning orchestration, manager and buddy programs, ramp tracking.",                     parent: "Human Resources" },
  // Finance — 1 new sub
  { name: "Cloud Financial Operations", description: "FinOps practice: cloud cost transparency, allocation, optimization, commitment management. Distinct from general FP&A — owns the cloud-spend lifecycle.", parent: "Finance" },
  // IT — 1 new sub
  { name: "IT Asset Management",       description: "Hardware, software, SaaS asset lifecycle, license compliance, asset financial management. Distinct from CMDB (configuration) and from procurement (sourcing).", parent: "IT Operations" },
];

// ============================================================
// 2. RE-POINTS (domain_code → new owner function_name)
// ============================================================
const repoints: { domain: string; newOwner: string; note: string }[] = [
  // HR cluster (9)
  { domain: "HRSD",         newOwner: "HR Service Delivery",     note: "HRSD is HR's service-desk; specific sub" },
  { domain: "PAYROLL",      newOwner: "Payroll",                 note: "exact-name sub already existed" },
  { domain: "TALENT-MGMT",  newOwner: "Talent Development",      note: "performance/succession/talent reviews" },
  { domain: "WFM",          newOwner: "Workforce Management",    note: "exact-name sub already existed" },
  { domain: "COMP-MGMT",    newOwner: "Compensation",            note: "Comp is its own Total-Rewards-side discipline" },
  { domain: "EMP-EXP",      newOwner: "Employee Experience",     note: "EX function is the buyer" },
  { domain: "PA",           newOwner: "People Analytics",        note: "re-introduced sub for the HR-analytics team" },
  { domain: "SWP",          newOwner: "Workforce Planning",      note: "re-introduced sub for the strategic-WFP team" },
  { domain: "ONBOARDING",   newOwner: "Employee Onboarding",     note: "onboarding is its own discipline outside Recruiting" },

  // Finance / GRC cluster (3)
  { domain: "FINOPS",       newOwner: "Cloud Financial Operations", note: "FinOps is its own discipline" },
  { domain: "SUB-MGMT",     newOwner: "Accounts Receivable",     note: "subscription/revenue lifecycle is AR-side" },
  { domain: "AUDIT",        newOwner: "Internal Audit",          note: "Internal Audit team buys audit-mgmt software (cross-cluster: was under GRC, now under Finance.Internal Audit)" },

  // IT Operations cluster (18)
  { domain: "ITSM",         newOwner: "IT Service Desk",         note: "service desk = literal ITSM buyer" },
  { domain: "ITOM",         newOwner: "IT Infrastructure",       note: "infrastructure ops" },
  { domain: "ITAM",         newOwner: "IT Asset Management",     note: "new sub for the asset-mgr role" },
  { domain: "HAM",          newOwner: "IT Asset Management",     note: "hardware asset sub-discipline" },
  { domain: "SAM",          newOwner: "IT Asset Management",     note: "software asset sub-discipline" },
  { domain: "SMP",          newOwner: "IT Asset Management",     note: "SaaS asset sub-discipline" },
  { domain: "CMDB",         newOwner: "IT Infrastructure",       note: "config of infrastructure" },
  { domain: "DISCOVERY",    newOwner: "IT Infrastructure",       note: "infrastructure scanning" },
  { domain: "AIOPS",        newOwner: "IT Infrastructure",       note: "infrastructure ops AI" },
  { domain: "DEM",          newOwner: "IT Infrastructure",       note: "end-user-perf monitoring sits with infra team" },
  { domain: "NPMD",         newOwner: "IT Infrastructure",       note: "network performance" },
  { domain: "DCIM",         newOwner: "IT Infrastructure",       note: "data centre infrastructure" },
  { domain: "UEM",          newOwner: "End-User Computing",      note: "endpoint mgmt sub" },
  { domain: "APM",          newOwner: "IT Infrastructure",       note: "Application Portfolio Mgmt — IT-side enterprise architecture" },
  { domain: "COLLAB-GOV",   newOwner: "End-User Computing",      note: "M365/Google governance lives with EUC" },
  { domain: "WSC",          newOwner: "End-User Computing",      note: "Slack/Teams admin sits with EUC" },
  { domain: "IPAAS",        newOwner: "IT Infrastructure",       note: "integration platform" },
  { domain: "LCAP",         newOwner: "IT Infrastructure",       note: "low-code platform ops" },

  // Security cluster (5)
  { domain: "SECOPS",       newOwner: "Security Operations Center", note: "SOC function" },
  { domain: "SOAR",         newOwner: "Security Operations Center", note: "SOC automation" },
  { domain: "VULN-MGMT",    newOwner: "Security Operations Center", note: "SOC scans" },
  { domain: "THREAT-INTEL", newOwner: "Security Operations Center", note: "SOC threat intel" },
  { domain: "IGA",          newOwner: "Identity and Access Management", note: "IAM function owns IGA" },

  // Sales cluster (5)
  { domain: "CPQ",          newOwner: "Sales Operations",        note: "Sales Ops owns deal-desk/CPQ" },
  { domain: "PRM",          newOwner: "Channel Sales",           note: "partner program function" },
  { domain: "SALES-PERF",   newOwner: "Sales Operations",        note: "comp/quota/incentive ops" },
  { domain: "REV-INTEL",    newOwner: "Sales Operations",        note: "forecast/intel tooling owned by Sales Ops" },
  { domain: "GTM-PLAN",     newOwner: "Sales Operations",        note: "go-to-market planning function" },

  // Marketing cluster (4)
  { domain: "MA",           newOwner: "Demand Generation",       note: "demand gen owns MA" },
  { domain: "DAM",          newOwner: "Brand and Creative",      note: "creative team owns asset mgmt" },
  { domain: "SMM",          newOwner: "Marketing Communications", note: "social is MarComms" },
  { domain: "INTRANET",     newOwner: "Marketing Communications", note: "internal comms sits in MarComms or sometimes HR; defaulting to MarComms" },

  // Customer Service cluster (3)
  { domain: "FSM",          newOwner: "Customer Field Service",  note: "customer field service sub" },
  { domain: "CONV-AI",      newOwner: "Contact Center Operations", note: "contact center buys CONV-AI" },
  { domain: "CCAAS",        newOwner: "Contact Center Operations", note: "CCaaS = contact centre" },

  // Software Engineering cluster (6)
  { domain: "OBS",          newOwner: "Site Reliability Engineering", note: "SRE owns observability" },
  { domain: "TEST-MGMT",    newOwner: "Quality Engineering",     note: "QE function" },
  { domain: "APP-PAAS",     newOwner: "Platform Engineering",    note: "internal platform" },
  { domain: "APIM",         newOwner: "Platform Engineering",    note: "API platform" },
  { domain: "VSDP",         newOwner: "Platform Engineering",    note: "delivery platform" },
  { domain: "KUBE-PLAT",    newOwner: "Platform Engineering",    note: "k8s platform" },

  // GRC cluster (1)
  { domain: "PRIV-MGMT",    newOwner: "Privacy Office",          note: "Privacy Office function" },

  // Data cluster (5)
  { domain: "BI",           newOwner: "Business Intelligence",   note: "BI function" },
  { domain: "MDM",          newOwner: "Data Engineering",        note: "data engineering owns MDM" },
  { domain: "DCG",          newOwner: "Data Engineering",        note: "catalog/governance under DE" },
  { domain: "DI",           newOwner: "Data Engineering",        note: "data integration is DE" },
  { domain: "DQ",           newOwner: "Data Engineering",        note: "data quality is DE" },

  // Procurement cluster (1)
  { domain: "VMS",          newOwner: "Indirect Procurement",    note: "contingent labour is indirect spend" },

  // Supply Chain cluster (1)
  { domain: "MFG-OPS",      newOwner: "Manufacturing Operations", note: "Manufacturing sub" },

  // Legal cluster (2)
  { domain: "CLM",          newOwner: "Contract Operations",     note: "contract ops function" },
  { domain: "ESIGN",        newOwner: "Contract Operations",     note: "contract ops uses e-sign" },
];

async function main() {
  console.log("=== Step 1: add new sub-functions ===");
  const existing = await call({ method: "GET", path: "/business_functions?select=id,business_function_name&limit=10000" });
  const fnId = new Map<string, number>();
  for (const r of existing) fnId.set(String(r.business_function_name), Number(r.id));

  const subsToInsert = newSubs.filter(s => !fnId.has(s.name));
  if (subsToInsert.length > 0) {
    const rows = subsToInsert.map(s => ({
      business_function_name: s.name,
      description: s.description,
      parent_business_function_id: fnId.get(s.parent),
    }));
    for (const r of rows) {
      if (!r.parent_business_function_id) throw new Error(`Parent not found for ${r.business_function_name}`);
    }
    await call({ method: "POST", path: "/business_functions", body: rows });
    console.log(`  inserted ${rows.length} sub-functions`);
  } else {
    console.log("  all 9 sub-functions already exist");
  }

  // Refresh id map
  const refreshed = await call({ method: "GET", path: "/business_functions?select=id,business_function_name&limit=10000" });
  fnId.clear();
  for (const r of refreshed) fnId.set(String(r.business_function_name), Number(r.id));

  // Pull domain ids
  const allDomains = await call({ method: "GET", path: "/domains?select=id,domain_code&limit=10000" });
  const domainId = new Map<string, number>();
  for (const r of allDomains) domainId.set(String(r.domain_code), Number(r.id));

  console.log("\n=== Step 2: re-point owner rows ===");
  let repointed = 0;
  let skipped = 0;
  for (const rp of repoints) {
    const dId = domainId.get(rp.domain);
    const newFnId = fnId.get(rp.newOwner);
    if (!dId) { console.log(`  ! domain not found: ${rp.domain}`); continue; }
    if (!newFnId) { console.log(`  ! function not found: ${rp.newOwner}`); continue; }

    // Find current owner row for this domain
    const currentOwner = await call({
      method: "GET",
      path: `/business_function_domains?domain_id=eq.${dId}&responsibility_type=eq.owner&select=id,business_function_id`,
    });
    if (currentOwner.length === 0) { console.log(`  ! ${rp.domain}: no existing owner row`); continue; }
    if (currentOwner.length > 1) { console.log(`  ! ${rp.domain}: ${currentOwner.length} owner rows — skipping`); continue; }
    const row = currentOwner[0];
    if (Number(row.business_function_id) === newFnId) { skipped++; continue; }

    await call({
      method: "PATCH",
      path: `/business_function_domains?id=eq.${row.id}`,
      body: { business_function_id: newFnId },
    });
    repointed++;
  }
  console.log(`  re-pointed ${repointed} rows; ${skipped} already on target`);

  console.log("\n=== Step 3: audit ===");
  const finalOwners = await call({
    method: "GET",
    path: "/business_function_domains?responsibility_type=eq.owner&select=domain_id,business_functions(business_function_name,parent_business_function_id)&limit=10000",
  });
  let topLevel = 0;
  let subLevel = 0;
  for (const r of finalOwners) {
    const fn = (r as any).business_functions;
    if (fn.parent_business_function_id === null) topLevel++;
    else subLevel++;
  }
  console.log(`  owner rows: ${finalOwners.length}`);
  console.log(`    pointing to top-level function: ${topLevel}`);
  console.log(`    pointing to sub-function:       ${subLevel}`);

  // List remaining top-level-owner domains so we can review them
  const stillTop = await call({
    method: "GET",
    path: "/business_function_domains?responsibility_type=eq.owner&select=domains(domain_code),business_functions!inner(business_function_name,parent_business_function_id)&business_functions.parent_business_function_id=is.null&limit=200",
  });
  console.log("\n  Remaining top-level-owner domains (intentional):");
  const byFn = new Map<string, string[]>();
  for (const r of stillTop) {
    const fn = (r as any).business_functions.business_function_name;
    const d = (r as any).domains.domain_code;
    if (!byFn.has(fn)) byFn.set(fn, []);
    byFn.get(fn)!.push(d);
  }
  for (const [fn, ds] of [...byFn.entries()].sort((a,b) => b[1].length - a[1].length)) {
    console.log(`    ${fn} (${ds.length}): ${ds.join(", ")}`);
  }

  const counts = {
    business_functions_total:        (await call({ method: "GET", path: "/business_functions?select=id&limit=10000" })).length,
    business_function_domains_total: (await call({ method: "GET", path: "/business_function_domains?select=id&limit=10000" })).length,
  };
  console.log("\n=== Final counts ===");
  console.log(JSON.stringify(counts, null, 2));
}

await main();
