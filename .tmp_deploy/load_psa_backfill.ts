#!/usr/bin/env bun
// PSA cluster backfill (services-org variant; MSP-PSA already done):
//   - 2 new caps (PROJ-PORTFOLIO, ENGAGE-CPQ)
//   - capability_domains for new caps + cross-link REVENUE-RECOG (id 65) to PSA
//   - 5 new vendors, 8 new solutions
//   - backfill solution_domains for Planview Portfolios → PSA (currently missing)
//   - solution_capabilities matrix: 20 solutions × 8 caps (~160 positive cells)
// Idempotent. Run from project root.

import { $ } from "bun";
$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body)); await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(), new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
async function get(path: string) { return call({ method: "GET", path }); }
async function insert(path: string, rows: Row[]) {
  if (rows.length === 0) return [];
  const CHUNK = 50; const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    out.push(...(await call({ method: "POST", path, body: slice })));
  }
  return out;
}
async function syncTable<T extends Row>(path: string, rows: T[], key: keyof T & string) {
  const existing = await get(`${path}?select=id,${key}&limit=10000`);
  const existingKeys = new Set(existing.map(r => String(r[key])));
  const missing = rows.filter(r => !existingKeys.has(String(r[key])));
  if (missing.length > 0) { console.log(`  insert ${missing.length} into ${path}`); await insert(path, missing); }
  else console.log(`  ${path}: nothing new`);
  const all = await get(`${path}?select=id,${key}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[key]), Number(r.id));
  return map;
}

// ============================================================
// CAPABILITIES
// ============================================================
const capabilities = [
  { capability_code: "PROJ-PORTFOLIO", capability_name: "Project Portfolio Management for Services",
    domain: "PSA",
    description: "Cross-engagement visibility for services orgs: pipeline-to-delivery forecasting, capacity-vs-demand modelling across won, committed, and prospective engagements, scenario planning, and program/portfolio rollups. Distinct from per-project resource allocation." },
  { capability_code: "ENGAGE-CPQ", capability_name: "Services Engagement Quoting",
    domain: "PSA",
    description: "Estimating, scoping, SOW generation, and quote-to-project conversion for services engagements. Templates, role-based rate cards, margin guardrails, opportunity-to-engagement handoff. Distinct from product CPQ (which prices SKUs) and from BILLING-PROJ (which invoices delivered work)." },
];

// REVENUE-RECOG cross-link to PSA (existing cap id 65)
const crossLinkRevRecToPsa = true;

// ============================================================
// VENDORS (5 new)
// ============================================================
const newVendors = [
  { vendor_name: "BigTime Software", vendor_url: "https://www.bigtime.net", headquarters_country: "USA",
    description: "PSA vendor for SMB/mid-market services firms.",
    notes: "HQ Chicago IL. Acquired Projector PSA in 2022 to push upmarket; both brands maintained." },
  { vendor_name: "Ruddr", vendor_url: "https://www.ruddr.io", headquarters_country: "USA",
    description: "Modern lightweight PSA for digital/professional services SMBs.", notes: "HQ Atlanta GA." },
  { vendor_name: "Scoro", vendor_url: "https://www.scoro.com", headquarters_country: "Estonia",
    description: "Work-management and PSA platform for agencies and consultancies.", notes: "HQ Tallinn." },
  { vendor_name: "Productive", vendor_url: "https://productive.io", headquarters_country: "Croatia",
    description: "Agency PSA covering sales pipeline → resource planning → billing → profitability.", notes: "HQ Zagreb." },
  { vendor_name: "Accelo", vendor_url: "https://www.accelo.com", headquarters_country: "USA",
    description: "ServOps/PSA for professional services SMBs, retainer-heavy practices.", notes: "HQ Denver CO." },
];

// ============================================================
// SOLUTIONS (8 new)
// ============================================================
type SolutionSpec = {
  solution_name: string; vendor: string;
  solution_type: "saas"|"on_prem"|"hybrid"|"open_source"|"internal_build"|"manual_process";
  solution_url: string; description: string; notes?: string;
  primary?: string[]; secondary?: string[]; partial?: string[];
};
const newSolutions: SolutionSpec[] = [
  { solution_name: "Oracle NetSuite OpenAir", vendor: "Oracle", solution_type: "saas",
    solution_url: "https://www.netsuite.com/portal/products/openair.shtml",
    description: "Mid-market PSA bolt-on to Oracle NetSuite ERP: resource planning, project accounting, time/expense, billing, utilisation. Competes head-to-head with Kantata and Certinia in mid-market RFPs.",
    notes: "Distinct SKU from the broader NetSuite ERP row; modelled separately for accurate PSA market positioning.",
    primary: ["PSA"] },
  { solution_name: "BigTime", vendor: "BigTime Software", solution_type: "saas",
    solution_url: "https://www.bigtime.net",
    description: "SMB/mid-market PSA focused on time, billing, and project profitability for accounting, A/E, consulting firms.",
    primary: ["PSA"] },
  { solution_name: "Projector PSA", vendor: "BigTime Software", solution_type: "saas",
    solution_url: "https://www.projectorpsa.com",
    description: "Enterprise-grade PSA used by management consultancies. Acquired by BigTime in 2022; still sold as a distinct SKU.",
    primary: ["PSA"] },
  { solution_name: "Microsoft Dynamics 365 Project Operations", vendor: "Microsoft", solution_type: "saas",
    solution_url: "https://dynamics.microsoft.com/en-us/project-operations/overview/",
    description: "Microsoft's PSA: unifies former Project Service Automation (CRM-side) and Project Online (delivery-side). Strong inside Microsoft estates with native Sales/Finance integration.",
    primary: ["PSA"] },
  { solution_name: "Ruddr", vendor: "Ruddr", solution_type: "saas",
    solution_url: "https://www.ruddr.io",
    description: "Modern lightweight PSA aimed at digital/professional services SMBs. Clean UX, strong utilisation/billing analytics.",
    primary: ["PSA"] },
  { solution_name: "Scoro", vendor: "Scoro", solution_type: "saas",
    solution_url: "https://www.scoro.com",
    description: "Work-management + PSA hybrid for agencies and consultancies. Quote-to-cash workflow with strong project profitability views.",
    primary: ["PSA"] },
  { solution_name: "Productive", vendor: "Productive", solution_type: "saas",
    solution_url: "https://productive.io",
    description: "Agency-focused PSA: sales pipeline → resource planning → time → billing → profitability in one tool.",
    primary: ["PSA"] },
  { solution_name: "Accelo", vendor: "Accelo", solution_type: "saas",
    solution_url: "https://www.accelo.com",
    description: "ServOps/PSA for professional services SMBs combining client work, time tracking, billing, and retainers.",
    secondary: ["PSA"] },
];

// Existing solutions to backfill solution_domains on (Planview Portfolios missing PSA link)
const backfillSolDom: { solution: string; coverage: "primary"|"secondary"|"partial"; domain: string }[] = [
  { solution: "Planview Portfolios", coverage: "secondary", domain: "PSA" },
];

// ============================================================
// SOLUTION_CAPABILITIES MATRIX
// Strength codes: n=native, p=partial, x=via_extension
// Caps order: RP=RESOURCE-PLAN, PA=PROJECT-ACCT, TE=TIME-EXPENSE-PROJ, BL=BILLING-PROJ,
//             UT=UTILIZATION, PP=PROJ-PORTFOLIO, CPQ=ENGAGE-CPQ, RR=REVENUE-RECOG
// ============================================================
type S = "native"|"partial"|"via_extension"|"not_supported";
const psaCaps = ["RESOURCE-PLAN","PROJECT-ACCT","TIME-EXPENSE-PROJ","BILLING-PROJ","UTILIZATION","PROJ-PORTFOLIO","ENGAGE-CPQ","REVENUE-RECOG"];
function row(sol: string, rp: S, pa: S, te: S, bl: S, ut: S, pp: S, cpq: S, rr: S) {
  const arr: S[] = [rp, pa, te, bl, ut, pp, cpq, rr];
  return arr.map((s, i) => ({ solution: sol, capability: psaCaps[i], delivery_strength: s }))
            .filter(r => r.delivery_strength !== "not_supported");
}
type SolCap = { solution: string; capability: string; delivery_strength: S; notes?: string };
const solCaps: SolCap[] = [
  ...row("Kantata",                                "native","native","native","native","native","native","native","partial"),
  ...row("Certinia PS Cloud",                      "native","native","native","native","native","native","native","native"),
  ...row("Deltek Vantagepoint",                    "native","native","native","native","native","partial","partial","native"),
  ...row("Oracle NetSuite OpenAir",                "native","native","native","native","native","partial","partial","native"),
  ...row("Workday Projects",                       "native","native","native","native","native","partial","partial","native"),
  ...row("Replicon",                               "native","partial","native","native","native","partial","partial","via_extension"),
  ...row("Oracle Fusion Cloud Project Management", "native","native","native","native","native","native","partial","native"),
  ...row("Planview Portfolios",                    "native","partial","partial","partial","native","native","partial","via_extension"),
  ...row("Unit4 ERP",                              "native","native","native","native","partial","partial","via_extension","native"),
  ...row("SAP S/4HANA",                            "native","native","native","native","partial","native","partial","native"),
  ...row("Microsoft Dynamics 365 Project Operations","native","native","native","native","native","partial","native","partial"),
  ...row("BigTime",                                "partial","native","native","native","native","via_extension","partial","via_extension"),
  ...row("Projector PSA",                          "native","native","native","native","native","partial","partial","partial"),
  ...row("Ruddr",                                  "partial","partial","native","native","native","via_extension","via_extension","via_extension"),
  ...row("Scoro",                                  "native","partial","native","native","native","via_extension","native","via_extension"),
  ...row("Productive",                             "native","partial","native","native","native","via_extension","native","via_extension"),
  ...row("Accelo",                                 "partial","partial","native","native","partial","via_extension","partial","via_extension"),
  ...row("Rocketlane",                             "partial","via_extension","partial","partial","partial","via_extension","via_extension","via_extension"),
  ...row("ConnectWise PSA",                        "native","partial","native","native","native","via_extension","partial","via_extension"),
  ...row("Autotask PSA",                           "native","partial","native","native","native","via_extension","partial","via_extension"),
];

// ============================================================
// RUN
// ============================================================
async function main() {
  const allDomains = await get("/domains?select=id,domain_code&limit=10000");
  const domainMap = new Map<string, number>();
  for (const d of allDomains) domainMap.set(String(d.domain_code), Number(d.id));

  console.log("\n=== New capabilities ===");
  const capRows = capabilities.map(c => ({
    capability_code: c.capability_code, capability_name: c.capability_name, description: c.description,
  }));
  await syncTable("/capabilities", capRows, "capability_code");
  const allCaps = await get("/capabilities?select=id,capability_code&limit=10000");
  const capMap = new Map<string, number>();
  for (const r of allCaps) capMap.set(String(r.capability_code), Number(r.id));

  console.log("\n=== capability_domains ===");
  const existingCd = await get("/capability_domains?select=capability_id,domain_id&limit=10000");
  const existingCdSet = new Set(existingCd.map(r => `${r.capability_id}:${r.domain_id}`));
  const newCdRows: Row[] = [];
  const psaId = domainMap.get("PSA")!;
  for (const c of capabilities) {
    const cid = capMap.get(c.capability_code)!;
    const did = domainMap.get(c.domain)!;
    if (existingCdSet.has(`${cid}:${did}`)) continue;
    newCdRows.push({ capability_id: cid, domain_id: did, notes: "" });
  }
  if (crossLinkRevRecToPsa) {
    const rrId = capMap.get("REVENUE-RECOG");
    if (rrId && !existingCdSet.has(`${rrId}:${psaId}`)) {
      newCdRows.push({ capability_id: rrId, domain_id: psaId,
        notes: "Services orgs run RevRec inside their PSA via tight integration with project accounting." });
    }
  }
  if (newCdRows.length > 0) {
    console.log(`  insert ${newCdRows.length}`); await insert("/capability_domains", newCdRows);
  } else console.log("  none");

  console.log("\n=== Vendors ===");
  await syncTable("/vendors", newVendors.map(v => ({ ...v })), "vendor_name");
  const allVendors = await get("/vendors?select=id,vendor_name&limit=10000");
  const vendorMap = new Map<string, number>();
  for (const v of allVendors) vendorMap.set(String(v.vendor_name), Number(v.id));

  console.log("\n=== Solutions ===");
  const solRows = newSolutions.map(s => {
    const vid = vendorMap.get(s.vendor);
    if (!vid) throw new Error(`Vendor not found: ${s.vendor}`);
    return {
      solution_name: s.solution_name, description: s.description,
      solution_url: s.solution_url, vendor_id: vid,
      solution_type: s.solution_type, is_active_in_market: true, notes: s.notes ?? "",
    };
  });
  await syncTable("/solutions", solRows, "solution_name");
  const allSols = await get("/solutions?select=id,solution_name&limit=10000");
  const solMap = new Map<string, number>();
  for (const r of allSols) solMap.set(String(r.solution_name), Number(r.id));

  console.log("\n=== solution_domains (new + backfill) ===");
  const existingSd = await get("/solution_domains?select=solution_id,domain_id,coverage_level&limit=10000");
  const existingSdSet = new Set(existingSd.map(r => `${r.solution_id}:${r.domain_id}:${r.coverage_level}`));
  const newSdRows: Row[] = [];
  let skippedSd = 0, sdMiss = 0;
  function addSd(solName: string, code: string, coverage: "primary"|"secondary"|"partial") {
    const sid = solMap.get(solName); const did = domainMap.get(code);
    if (!sid || !did) { console.warn(`  ! sol_dom FK miss ${solName}/${code}`); sdMiss++; return; }
    const key = `${sid}:${did}:${coverage}`;
    if (existingSdSet.has(key)) { skippedSd++; return; }
    existingSdSet.add(key);
    newSdRows.push({ solution_id: sid, domain_id: did, coverage_level: coverage, notes: "" });
  }
  for (const s of newSolutions) {
    for (const c of s.primary ?? []) addSd(s.solution_name, c, "primary");
    for (const c of s.secondary ?? []) addSd(s.solution_name, c, "secondary");
    for (const c of s.partial ?? []) addSd(s.solution_name, c, "partial");
  }
  for (const b of backfillSolDom) addSd(b.solution, b.domain, b.coverage);
  if (newSdRows.length > 0) {
    console.log(`  insert ${newSdRows.length} (${skippedSd} skipped, ${sdMiss} FK miss)`);
    await insert("/solution_domains", newSdRows);
  } else console.log(`  none (${skippedSd} skipped, ${sdMiss} FK miss)`);

  console.log("\n=== solution_capabilities matrix ===");
  const existingSc = await get("/solution_capabilities?select=solution_id,capability_id&limit=10000");
  const existingScSet = new Set(existingSc.map(r => `${r.solution_id}:${r.capability_id}`));
  const newScRows: Row[] = [];
  let skippedSc = 0, scMiss = 0;
  for (const sc of solCaps) {
    const sid = solMap.get(sc.solution); const cid = capMap.get(sc.capability);
    if (!sid || !cid) { console.warn(`  ! sol_cap FK miss ${sc.solution}/${sc.capability}`); scMiss++; continue; }
    if (existingScSet.has(`${sid}:${cid}`)) { skippedSc++; continue; }
    existingScSet.add(`${sid}:${cid}`);
    newScRows.push({ solution_id: sid, capability_id: cid, delivery_strength: sc.delivery_strength, notes: sc.notes ?? "" });
  }
  if (newScRows.length > 0) {
    console.log(`  insert ${newScRows.length} (${skippedSc} skipped, ${scMiss} FK miss)`);
    await insert("/solution_capabilities", newScRows);
  } else console.log(`  none (${skippedSc} skipped, ${scMiss} FK miss)`);

  console.log("\n=== PSA scope counts ===");
  const counts = {
    psa_capability_domains: (await get(`/capability_domains?domain_id=eq.${psaId}&select=capability_id&limit=1000`)).length,
    psa_solution_domains: (await get(`/solution_domains?domain_id=eq.${psaId}&select=solution_id&limit=1000`)).length,
    capabilities_total: (await get("/capabilities?select=id&limit=10000")).length,
    solutions_total: (await get("/solutions?select=id&limit=10000")).length,
    solution_capabilities_total: (await get("/solution_capabilities?select=solution_id&limit=10000")).length,
  };
  console.log(JSON.stringify(counts, null, 2));
}
await main();
