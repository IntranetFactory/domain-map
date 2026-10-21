#!/usr/bin/env bun
// LEASE-ACCT (Lease Accounting and Administration) full domain build.
// Phases A/B/C/S/E, loaded live at record_status='new' (omitted => DB default).
// Idempotent: every table read by natural key, only missing rows inserted, then
// re-read to build a natural-key -> id map. Safe to re-run.
//
// Verdict from Phase 0 (.tmp_deploy/LEASE-ACCT-phase0-2026-06-14.md): promote-as-domain.
// CLI only (Rule #0). Run from project root: bun run "<abs path>". No cd, no MCP, no Python.

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
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  if (text.includes("required audience not found")) throw new Error(`JWT audience error: ${text}`);
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map((r) => {
    const out: Row = {};
    for (const k of keys) out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return out;
  });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

// syncByKey: insert only rows whose natural key is missing; return key->id map.
async function syncByKey<T extends Row>(
  path: string,
  rows: T[],
  keyField: keyof T & string,
): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=10000`);
  const existingKeys = new Set(existing.map((r) => String(r[keyField])));
  const missing = rows.filter((r) => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  ${path}: inserting ${missing.length} (had ${existing.length})`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: all ${rows.length} present (had ${existing.length})`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// syncComposite: idempotent insert for junctions keyed on a composite natural key.
async function syncComposite(
  path: string,
  rows: Row[],
  keyOf: (r: Row) => string,
  selectCols: string,
): Promise<void> {
  const existing = await get(`${path}?select=${selectCols}&limit=20000`);
  const existingKeys = new Set(existing.map(keyOf));
  const missing = rows.filter((r) => !existingKeys.has(keyOf(r)));
  if (missing.length > 0) {
    console.log(`  ${path}: inserting ${missing.length} (had ${existing.length})`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: all ${rows.length} present (had ${existing.length})`);
  }
}

function validateDomainRow(d: Row): void {
  const bad =
    d.crud_percentage === 0 ||
    d.min_org_size === "" ||
    d.cost_band === "" ||
    (d.business_logic === "" && (d.crud_percentage as number) < 95) ||
    d.usa_market_size_usd_m === 0 ||
    d.market_size_source_year === 0;
  if (bad) throw new Error(`validateDomainRow failed for ${d.domain_code}: ${JSON.stringify(d)}`);
}

async function main() {
  console.log("=== LEASE-ACCT build ===");

  // Resolve adjacent domain ids live (Rule: never hard-code).
  const adj = await get(
    "/domains?domain_code=in.(REAL-EST,RE-CRE,FINOPS,ACCT-PLAN)&select=id,domain_code",
  );
  const domId: Record<string, number> = {};
  for (const r of adj) domId[String(r.domain_code)] = Number(r.id);
  const REAL_EST = domId["REAL-EST"];
  const RE_CRE = domId["RE-CRE"];
  const FINOPS = domId["FINOPS"];
  const ACCT_PLAN = domId["ACCT-PLAN"];
  console.log({ REAL_EST, RE_CRE, FINOPS, ACCT_PLAN });

  // =========================================================================
  // PHASE A - Market shape
  // =========================================================================
  console.log("\n--- Phase A: domain ---");
  const domainRow: Row = {
    domain_code: "LEASE-ACCT",
    domain_name: "Lease Accounting and Administration",
    description:
      "Lessee lease accounting and administration: bringing every operating and finance lease onto the balance sheet under ASC 842 and IFRS 16. Covers right-of-use asset and lease liability recognition, lease classification (finance vs operating under ASC 842; single lessee model under IFRS 16), amortization and liability schedules, modification and remeasurement accounting, journal-entry generation into the general ledger, and quantitative and qualitative disclosure reporting, with an administration layer for lease records, critical dates, and documents. Distinct from the real-estate and workplace view (which treats leases as occupancy records, not an audited subledger) and from commercial real-estate operations (landlord-side CAM, escalations, and the leasing pipeline). The accounting kernel is a certification-grade financial-compliance surface owned by the office of the controller.",
    crud_percentage: 70,
    business_logic:
      "Amortization and lease-liability schedule generation (effective-interest unwinding, straight-line operating-lease cost plug), lease classification tests (ASC 842 five criteria; IFRS 16 single lessee model), modification and remeasurement re-calculation (discount-rate reassessment, index and rate true-ups, scope changes), impairment of right-of-use assets, and parallel ASC 842 / IFRS 16 schedule computation where both bases are reported. The disclosure maturity analysis and weighted-average rate and term rollups are computed, not declarative.",
    min_org_size: "30 m <2500",
    cost_band: "$$$",
    certification_required: true,
    usa_market_size_usd_m: 900,
    market_size_source_year: 2024,
    catalog_tagline: "Audit-ready ASC 842 and IFRS 16 lease accounting from contract to disclosure.",
    catalog_description:
      "Put every lease on the balance sheet with the right right-of-use asset, lease liability, and amortization schedule, then generate the journal entries, disclosures, and audit trail your external auditors will accept. Classify finance versus operating leases under ASC 842 or run the single lessee model under IFRS 16, handle modifications and remeasurements without rebuilding spreadsheets, and track critical dates and lease documents in one place. Built for the controller's team to stay compliant and close on time across the whole lease portfolio.",
  };
  validateDomainRow(domainRow);
  const domMap = await syncByKey("/domains", [domainRow], "domain_code");
  const LEASE_ACCT = domMap.get("LEASE-ACCT")!;
  console.log("LEASE-ACCT id =", LEASE_ACCT);

  console.log("\n--- Phase A: capabilities ---");
  const capabilities = [
    {
      capability_code: "LEASE-ASC842-COMPLIANCE",
      capability_name: "ASC 842 Compliance",
      description:
        "Recognize, measure, and report lessee leases under US GAAP ASC 842, including the finance-versus-operating classification, balance-sheet recognition of operating leases, and the required quantitative and qualitative disclosures.",
    },
    {
      capability_code: "LEASE-IFRS16-COMPLIANCE",
      capability_name: "IFRS 16 Compliance",
      description:
        "Recognize and measure lessee leases under the IFRS 16 single lessee model, where all leases are treated like finance leases, with the low-value and short-term exemptions and the IFRS-specific disclosure schedule.",
    },
    {
      capability_code: "LEASE-CLASSIFICATION",
      capability_name: "Lease Classification",
      description:
        "Apply the classification tests that determine accounting treatment: finance versus operating for ASC 842 lessees and the lessor buckets, capturing the classification rationale and re-testing on modification.",
    },
    {
      capability_code: "LEASE-ROU-CALCULATION",
      capability_name: "Right-of-Use Asset and Liability Calculation",
      description:
        "Compute the initial and ongoing right-of-use asset and lease liability balances, including the discount rate applied, amortization and effective-interest schedules, and the period expense.",
    },
    {
      capability_code: "LEASE-MODIFICATION-ACCOUNTING",
      capability_name: "Lease Modification Accounting",
      description:
        "Account for lease modifications, remeasurements, and reassessments: scope and consideration changes, discount-rate updates, index and rate true-ups, and right-of-use asset impairment.",
    },
    {
      capability_code: "LEASE-DISCLOSURE-REPORTING",
      capability_name: "Disclosure Reporting",
      description:
        "Produce the lease-accounting footnote disclosures: weighted-average discount rate and remaining term, maturity analysis of undiscounted cash flows, lease cost by type, and the reconciliations the standards require.",
    },
    {
      capability_code: "LEASE-ADMINISTRATION",
      capability_name: "Lease Administration",
      description:
        "Maintain the lease record system: agreements and components, leased assets, critical dates and alerts, renewals and terminations, payment terms, and the underlying lease documents that source the accounting.",
    },
  ];
  const capMap = await syncByKey("/capabilities", capabilities, "capability_code");

  await syncComposite(
    "/capability_domains",
    capabilities.map((c) => ({ capability_id: capMap.get(c.capability_code)!, domain_id: LEASE_ACCT, notes: "" })),
    (r) => `${r.capability_id}|${r.domain_id}`,
    "capability_id,domain_id",
  );

  console.log("\n--- Phase A: modules ---");
  const modules = [
    {
      domain_module_code: "LEASE-ACCT-ACCOUNTING",
      domain_module_name: "Lease Accounting",
      domain_id: LEASE_ACCT,
      module_kind: "full",
      description:
        "The ASC 842 / IFRS 16 accounting kernel. Masters the right-of-use assets, lease liabilities, classifications, payment and amortization schedules, modifications, disclosures, and the journal entries that post lease activity to the general ledger. This is the certification-grade financial-compliance core owned by the controller's team; it is not part of any real-estate domain.",
      catalog_tagline: "Recognize, measure, and disclose every lease on the balance sheet.",
      catalog_description:
        "Run the lease subledger your auditors trust. Calculate right-of-use assets and lease liabilities, generate amortization and interest schedules, classify finance versus operating under ASC 842 or run the IFRS 16 single model, and post clean journal entries to the general ledger. Handle modifications and remeasurements without rebuilding the math, and produce the weighted-average rate, maturity-analysis, and lease-cost disclosures your footnotes require, all on an immutable audit trail.",
    },
    {
      domain_module_code: "LEASE-ACCT-ADMINISTRATION",
      domain_module_name: "Lease Administration",
      domain_id: LEASE_ACCT,
      module_kind: "full",
      description:
        "The lease record and obligation-management layer that sources the accounting. Masters lease agreements (the accounting-subledger view of the contract), critical dates and alerts, renewals and terminations, payment terms, and the lease documents. Overlaps the real-estate and commercial-real-estate domains on lease records; scoped here to the lessee accounting feed, not workplace occupancy or landlord operations.",
      catalog_tagline: "Track lease records, critical dates, and documents that feed the books.",
      catalog_description:
        "Keep every lease and its obligations in one organized record. Capture lease agreements and their components, store the source documents, and never miss a renewal, option, or termination deadline with critical-date alerts. Manage payment terms and the changes that flow straight into your lease accounting, so the numbers always tie back to the contract.",
    },
  ];
  const modMap = await syncByKey("/domain_modules", modules, "domain_module_code");
  const M_ACCT = modMap.get("LEASE-ACCT-ACCOUNTING")!;
  const M_ADMIN = modMap.get("LEASE-ACCT-ADMINISTRATION")!;

  // capability -> realizing module
  const capModule: Record<string, number> = {
    "LEASE-ASC842-COMPLIANCE": M_ACCT,
    "LEASE-IFRS16-COMPLIANCE": M_ACCT,
    "LEASE-CLASSIFICATION": M_ACCT,
    "LEASE-ROU-CALCULATION": M_ACCT,
    "LEASE-MODIFICATION-ACCOUNTING": M_ACCT,
    "LEASE-DISCLOSURE-REPORTING": M_ACCT,
    "LEASE-ADMINISTRATION": M_ADMIN,
  };
  await syncComposite(
    "/domain_module_capabilities",
    capabilities.map((c) => ({
      domain_module_id: capModule[c.capability_code],
      capability_id: capMap.get(c.capability_code)!,
      notes: "",
    })),
    (r) => `${r.domain_module_id}|${r.capability_id}`,
    "domain_module_id,capability_id",
  );

  console.log("\n--- Phase A: vendors + solutions ---");
  const vendors = [
    {
      vendor_name: "FinQuery",
      vendor_url: "https://finquery.com",
      headquarters_country: "USA",
      description:
        "Lease and contract accounting software vendor; lease accounting (the LeaseQuery product) is the founding and anchor offering.",
    },
    {
      vendor_name: "Trullion",
      vendor_url: "https://trullion.com",
      headquarters_country: "USA",
      description:
        "AI-native accounting automation vendor whose flagship is lease accounting, extracting lease data from documents into audit-ready subledger entries; revenue recognition is a second pillar.",
    },
    {
      vendor_name: "Occupier",
      vendor_url: "https://occupier.com",
      headquarters_country: "USA",
      description:
        "Tenant-side lease lifecycle vendor combining lease administration, real-estate transaction management, and lease accounting on one platform.",
    },
    {
      vendor_name: "Nakisa",
      vendor_url: "https://nakisa.com",
      headquarters_country: "Canada",
      description:
        "Enterprise lease administration and accounting vendor; the lease accounting solution co-developed with and resold by a major ERP vendor for equipment and real-estate leasing.",
    },
  ];
  const vendMap = await syncByKey("/vendors", vendors, "vendor_name");
  // Reuse existing vendors by name where present.
  const existingVend = await get(
    "/vendors?vendor_name=in.(insightsoftware,Accruent,%22CoStar%20Group%22,IBM,%22SAP%20SE%22,Oracle,%22MRI%20Software%22)&select=id,vendor_name",
  );
  for (const r of existingVend) vendMap.set(String(r.vendor_name), Number(r.id));

  const solutions: Array<Row & { _domains: Array<[string, number]> }> = [
    {
      solution_name: "LeaseQuery",
      vendor_id: vendMap.get("FinQuery")!,
      solution_type: "saas",
      solution_url: "https://finquery.com/lease-accounting-software/",
      is_active_in_market: true,
      description:
        "Pure-play lease accounting software for ASC 842, IFRS 16, GASB 87/96, and related standards, covering right-of-use assets, liabilities, amortization schedules, journal entries, and disclosures. Formerly branded LeaseQuery before the company rebranded to FinQuery in 2024; the product is still sold as LeaseQuery.",
      notes: "Company rebranded LeaseQuery to FinQuery on 2024-02-08; product still sold as LeaseQuery.",
      _domains: [["primary", M_ACCT]],
    },
    {
      solution_name: "Trullion Lease Accounting",
      vendor_id: vendMap.get("Trullion")!,
      solution_type: "saas",
      solution_url: "https://trullion.com/solutions/lease-accounting/",
      is_active_in_market: true,
      description:
        "AI-driven lease accounting that abstracts lease terms from source documents into ASC 842 and IFRS 16 subledger journal entries, classifications, schedules, and disclosures.",
      notes: "",
      _domains: [["primary", M_ACCT]],
    },
    {
      solution_name: "Occupier",
      vendor_id: vendMap.get("Occupier")!,
      solution_type: "saas",
      solution_url: "https://occupier.com",
      is_active_in_market: true,
      description:
        "Tenant lease management platform combining lease administration and critical-date tracking, real-estate transaction management, and ASC 842 / IFRS 16 lease accounting.",
      notes: "",
      _domains: [["primary", M_ACCT]],
    },
    {
      solution_name: "Nakisa Lease Administration",
      vendor_id: vendMap.get("Nakisa")!,
      solution_type: "saas",
      solution_url: "https://nakisa.com/lease-administration/",
      is_active_in_market: true,
      description:
        "Enterprise lease administration and accounting for real-estate and equipment leases under ASC 842, IFRS 16, and GASB 87, including parallel-standard schedules; resold and supported by a major ERP vendor.",
      notes: "",
      _domains: [["primary", M_ACCT]],
    },
    {
      solution_name: "CoStar Real Estate Manager",
      vendor_id: vendMap.get("CoStar Group")!,
      solution_type: "saas",
      solution_url: "https://www.costarmanager.com",
      is_active_in_market: true,
      description:
        "Real-estate lifecycle and lease-accounting platform handling total lease lifecycle plus ASC 842, IFRS 16, and FRS 102 lease accounting alongside real-estate data.",
      notes: "CoStar Group acquired Visual Lease 2024-11-01; both now sit in the CoStar portfolio.",
      _domains: [["primary", M_ACCT]],
    },
    {
      solution_name: "EZLease",
      vendor_id: vendMap.get("insightsoftware")!,
      solution_type: "saas",
      solution_url: "https://www.ezlease.com",
      is_active_in_market: true,
      description:
        "Focused lease accounting software for ASC 842, IFRS 16, and GASB 87/96 covering asset and liability schedules, journal entries, and disclosures.",
      notes: "Acquired by insightsoftware via the LeaseAccelerator transaction (2024-07-11).",
      _domains: [["primary", M_ACCT]],
    },
    {
      solution_name: "Accruent Lucernex",
      vendor_id: vendMap.get("Accruent")!,
      solution_type: "saas",
      solution_url: "https://www.accruent.com/products/lucernex",
      is_active_in_market: true,
      description:
        "Real-estate and lease management within an IWMS suite, including ASC 842, IFRS 16, and GASB 87 lease accounting and the lease administration record.",
      notes: "",
      _domains: [["secondary", M_ACCT]],
    },
  ];
  const solMap = await syncByKey(
    "/solutions",
    solutions.map(({ _domains, ...rest }) => rest),
    "solution_name",
  );
  await syncComposite(
    "/solution_domains",
    solutions.flatMap((s) =>
      s._domains.map(([cov]) => ({
        solution_id: solMap.get(String(s.solution_name))!,
        domain_id: LEASE_ACCT,
        coverage_level: cov,
        notes: "",
      })),
    ),
    (r) => `${r.solution_id}|${r.domain_id}`,
    "solution_id,domain_id",
  );

  // =========================================================================
  // PHASE B - Data-object footprint
  // =========================================================================
  console.log("\n--- Phase B: data_objects ---");
  // entity_type per Rule #12; pattern flags per Rule #12.
  const dataObjects = [
    // ACCOUNTING module masters
    {
      data_object_name: "rou_assets",
      singular_label: "Right-of-Use Asset",
      plural_label: "Right-of-Use Assets",
      entity_type: "operational_workflow",
      has_single_approver: false,
      description:
        "The right-of-use asset recognized for a lease: initial measurement, accumulated amortization, impairment, and carrying value over the lease term under ASC 842 or IFRS 16.",
      _module: M_ACCT,
      _necessity: "required",
    },
    {
      data_object_name: "lease_liabilities",
      singular_label: "Lease Liability",
      plural_label: "Lease Liabilities",
      entity_type: "operational_workflow",
      description:
        "The lease liability measured at the present value of unpaid lease payments, unwound with effective interest over the lease term and remeasured on modification or reassessment.",
      _module: M_ACCT,
      _necessity: "required",
    },
    {
      data_object_name: "lease_classifications",
      singular_label: "Lease Classification",
      plural_label: "Lease Classifications",
      entity_type: "operational_workflow",
      has_single_approver: true,
      description:
        "The classification decision for a lease and its supporting test results: finance versus operating for ASC 842 lessees (and lessor sales-type, direct-financing, operating buckets); single lessee model under IFRS 16. Re-tested on modification.",
      _module: M_ACCT,
      _necessity: "required",
    },
    {
      data_object_name: "lease_payment_schedules",
      singular_label: "Lease Payment Schedule",
      plural_label: "Lease Payment Schedules",
      entity_type: "operational_record",
      description:
        "The period-by-period schedule of lease cash flows, liability amortization (principal and interest), and right-of-use asset amortization that drives recognition and the maturity-analysis disclosure.",
      _module: M_ACCT,
      _necessity: "required",
    },
    {
      data_object_name: "lease_modifications",
      singular_label: "Lease Modification",
      plural_label: "Lease Modifications",
      entity_type: "operational_workflow",
      has_single_approver: true,
      description:
        "A change to a lease and its accounting consequence: scope or consideration changes, remeasurements, reassessments, discount-rate updates, index and rate true-ups, and right-of-use asset impairment, with before-and-after balances.",
      _module: M_ACCT,
      _necessity: "required",
    },
    {
      data_object_name: "lease_disclosures",
      singular_label: "Lease Disclosure",
      plural_label: "Lease Disclosures",
      entity_type: "operational_workflow",
      has_submit_lock: true,
      description:
        "A prepared lease-accounting disclosure for a reporting period: weighted-average discount rate and remaining term, maturity analysis of undiscounted cash flows, lease cost by type, and the standard reconciliations, frozen once filed.",
      _module: M_ACCT,
      _necessity: "required",
    },
    {
      data_object_name: "asc842_journal_entries",
      singular_label: "ASC 842 Journal Entry",
      plural_label: "ASC 842 Journal Entries",
      entity_type: "operational_workflow",
      has_submit_lock: true,
      has_single_approver: true,
      description:
        "The lease-accounting journal entries generated for posting to the general ledger under ASC 842 or IFRS 16: initial recognition, periodic amortization and interest, modification, and termination entries, with preparer and approver controls.",
      _module: M_ACCT,
      _necessity: "optional",
    },
    // ADMINISTRATION module masters
    {
      data_object_name: "lease_agreements",
      singular_label: "Lease Agreement",
      plural_label: "Lease Agreements",
      entity_type: "operational_workflow",
      description:
        "The lessee lease contract as the accounting subledger record: parties, leased asset, commencement and end dates, term, options, components, and the payment terms the accounting is built from. The lessee-accounting view, distinct from the workplace occupancy record and the landlord operations record.",
      _module: M_ADMIN,
      _necessity: "required",
    },
    {
      data_object_name: "lease_critical_dates",
      singular_label: "Lease Critical Date",
      plural_label: "Lease Critical Dates",
      entity_type: "operational_workflow",
      description:
        "A tracked obligation deadline on a lease: option-exercise windows, renewal and notice dates, rent reviews, and termination deadlines, with alerting so the obligation is acted on before it lapses.",
      _module: M_ADMIN,
      _necessity: "required",
    },
    {
      data_object_name: "lease_documents",
      singular_label: "Lease Document",
      plural_label: "Lease Documents",
      entity_type: "operational_record",
      description:
        "A source document attached to a lease: the executed contract, amendments, abstracts, and correspondence that evidence the terms feeding the accounting.",
      _module: M_ADMIN,
      _necessity: "required",
    },
  ];
  // Naming-collision guard (Rule #9): journal_entries (194) exists; ours is asc842_journal_entries.
  const collisionCheck = await get(
    "/data_objects?data_object_name=in.(rou_assets,lease_liabilities,lease_classifications,lease_payment_schedules,lease_modifications,lease_disclosures,asc842_journal_entries,lease_agreements,lease_critical_dates,lease_documents)&select=data_object_name",
  );
  // (Pre-flight only; syncByKey below is idempotent on data_object_name.)
  // Normalize NOT-NULL pattern flags so uniformize never sends null on a row that omitted one.
  const insertableDO = dataObjects.map(({ _module, _necessity, ...rest }) => ({
    has_personal_content: false,
    has_submit_lock: false,
    has_single_approver: false,
    is_canonical_bare_word: false,
    naming_authority_rationale: "",
    notes: "",
    kind: "domain_owned",
    ...rest,
  }));
  const doMap = await syncByKey("/data_objects", insertableDO, "data_object_name");
  // users builtin
  const usersDO = (await get("/data_objects?data_object_name=eq.users&select=id"))[0];
  const USERS = Number(usersDO.id);
  const doid = (name: string): number => {
    const id = doMap.get(name);
    if (!id) throw new Error(`missing data_object id for ${name}`);
    return id;
  };

  console.log("\n--- Phase B: domain_module_data_objects (masters) ---");
  await syncComposite(
    "/domain_module_data_objects",
    dataObjects.map((d) => ({
      domain_module_id: d._module,
      data_object_id: doid(d.data_object_name),
      role: "master",
      necessity: d._necessity,
      notes: "",
    })),
    (r) => `${r.domain_module_id}|${r.data_object_id}|${r.role}`,
    "domain_module_id,data_object_id,role",
  );

  console.log("\n--- Phase B: data_object_relationships (intra + users + cross-domain) ---");
  // Intra-domain edges. owner_side names the parent (lifecycle owner / cascade root).
  type Rel = {
    src: string;
    dst: string;
    verb: string;
    inverse: string;
    type: "one_to_one" | "one_to_many" | "many_to_many";
    kind: "composition" | "reference" | "association" | "inheritance";
    is_required: boolean;
    owner_side: "source" | "target";
    _srcId?: number;
    _dstId?: number;
  };
  const intra: Rel[] = [
    { src: "lease_agreements", dst: "rou_assets", verb: "gives rise to", inverse: "is recognized for", type: "one_to_many", kind: "composition", is_required: true, owner_side: "source" },
    { src: "lease_agreements", dst: "lease_liabilities", verb: "gives rise to", inverse: "is recognized for", type: "one_to_many", kind: "composition", is_required: true, owner_side: "source" },
    { src: "lease_agreements", dst: "lease_classifications", verb: "is classified by", inverse: "classifies", type: "one_to_many", kind: "composition", is_required: true, owner_side: "source" },
    { src: "lease_liabilities", dst: "lease_payment_schedules", verb: "is amortized by", inverse: "amortizes", type: "one_to_many", kind: "composition", is_required: true, owner_side: "source" },
    { src: "lease_agreements", dst: "lease_modifications", verb: "is modified by", inverse: "modifies", type: "one_to_many", kind: "composition", is_required: false, owner_side: "source" },
    { src: "lease_modifications", dst: "lease_payment_schedules", verb: "remeasures", inverse: "is remeasured by", type: "one_to_many", kind: "reference", is_required: false, owner_side: "source" },
    { src: "lease_agreements", dst: "asc842_journal_entries", verb: "generates", inverse: "posts", type: "one_to_many", kind: "composition", is_required: false, owner_side: "source" },
    { src: "rou_assets", dst: "asc842_journal_entries", verb: "is recorded by", inverse: "records", type: "one_to_many", kind: "reference", is_required: false, owner_side: "source" },
    { src: "lease_liabilities", dst: "asc842_journal_entries", verb: "is recorded by", inverse: "records", type: "one_to_many", kind: "reference", is_required: false, owner_side: "source" },
    { src: "lease_disclosures", dst: "lease_payment_schedules", verb: "aggregates", inverse: "rolls up into", type: "one_to_many", kind: "reference", is_required: false, owner_side: "target" },
    { src: "lease_agreements", dst: "lease_critical_dates", verb: "tracks", inverse: "is tracked for", type: "one_to_many", kind: "composition", is_required: false, owner_side: "source" },
    { src: "lease_agreements", dst: "lease_documents", verb: "is evidenced by", inverse: "evidences", type: "one_to_many", kind: "composition", is_required: false, owner_side: "source" },
  ];
  // users edges (Rule #10)
  const userEdges: Rel[] = [
    { src: "users", dst: "lease_classifications", verb: "approves", inverse: "is approved by", type: "one_to_many", kind: "reference", is_required: false, owner_side: "source" },
    { src: "users", dst: "lease_modifications", verb: "approves", inverse: "is approved by", type: "one_to_many", kind: "reference", is_required: false, owner_side: "source" },
    { src: "users", dst: "asc842_journal_entries", verb: "prepares", inverse: "is prepared by", type: "one_to_many", kind: "reference", is_required: false, owner_side: "source" },
    { src: "users", dst: "asc842_journal_entries", verb: "approves", inverse: "is approved by", type: "one_to_many", kind: "reference", is_required: false, owner_side: "source" },
    { src: "users", dst: "lease_disclosures", verb: "prepares", inverse: "is prepared by", type: "one_to_many", kind: "reference", is_required: false, owner_side: "source" },
    { src: "users", dst: "lease_agreements", verb: "administers", inverse: "is administered by", type: "one_to_many", kind: "reference", is_required: false, owner_side: "source" },
    { src: "users", dst: "lease_critical_dates", verb: "is alerted on", inverse: "alerts", type: "one_to_many", kind: "reference", is_required: false, owner_side: "source" },
  ];
  const idForRel = (name: string): number => (name === "users" ? USERS : doid(name));
  const allLocalRels = [...intra, ...userEdges].map((r) => ({
    data_object_id: idForRel(r.src),
    related_data_object_id: idForRel(r.dst),
    relationship_verb: r.verb,
    inverse_verb: r.inverse,
    relationship_type: r.type,
    relationship_kind: r.kind,
    is_required: r.is_required,
    owner_side: r.owner_side,
    notes: "",
  }));
  await syncComposite(
    "/data_object_relationships",
    allLocalRels,
    (r) => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`,
    "data_object_id,related_data_object_id,relationship_verb",
  );

  // Cross-domain payload-target edges. Targets in adjacent domains may not be installed;
  // these are reference edges (required-if-present), is_required=false, target is the parent.
  // Resolve target master ids live where they exist; skip the edge if the target master is absent.
  console.log("\n--- Phase B: cross-domain relationships ---");
  const crossTargets = await get(
    "/data_objects?data_object_name=in.(commercial_leases,property_leases,journal_entries,general_ledger_accounts,cost_centers)&select=id,data_object_name",
  );
  const xId: Record<string, number> = {};
  for (const r of crossTargets) xId[String(r.data_object_name)] = Number(r.id);
  const crossRels: Row[] = [];
  // lease_agreements (LEASE-ACCT) sources from the RE/CRE lease record where present.
  if (xId["commercial_leases"]) {
    crossRels.push({
      data_object_id: doid("lease_agreements"),
      related_data_object_id: xId["commercial_leases"],
      relationship_verb: "accounts for",
      inverse_verb: "is accounted for by",
      relationship_type: "one_to_one",
      relationship_kind: "association",
      is_required: false,
      owner_side: "target",
      notes: "",
    });
  }
  if (xId["property_leases"]) {
    crossRels.push({
      data_object_id: doid("lease_agreements"),
      related_data_object_id: xId["property_leases"],
      relationship_verb: "accounts for",
      inverse_verb: "is accounted for by",
      relationship_type: "one_to_one",
      relationship_kind: "association",
      is_required: false,
      owner_side: "target",
      notes: "",
    });
  }
  // asc842_journal_entries (LEASE-ACCT) post into the GL journal_entries master where present (FINOPS/ACCT-PLAN adjacency is the controller GL).
  if (xId["journal_entries"]) {
    crossRels.push({
      data_object_id: doid("asc842_journal_entries"),
      related_data_object_id: xId["journal_entries"],
      relationship_verb: "posts to",
      inverse_verb: "is posted from",
      relationship_type: "many_to_many",
      relationship_kind: "association",
      is_required: false,
      owner_side: "target",
      notes: "",
    });
  }
  if (crossRels.length) {
    await syncComposite(
      "/data_object_relationships",
      crossRels,
      (r) => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`,
      "data_object_id,related_data_object_id,relationship_verb",
    );
  } else {
    console.log("  no cross-domain target masters present; skipped");
  }

  console.log("\n--- Phase B: data_object_aliases ---");
  const aliases = [
    { data_object_name: "rou_assets", alias_name: "ROU Asset", alias_type: "synonym" },
    { data_object_name: "rou_assets", alias_name: "Right of Use Asset", alias_type: "synonym" },
    { data_object_name: "lease_liabilities", alias_name: "Lease Obligation", alias_type: "synonym" },
    { data_object_name: "lease_payment_schedules", alias_name: "Amortization Schedule", alias_type: "synonym" },
    { data_object_name: "lease_classifications", alias_name: "Finance vs Operating Test", alias_type: "synonym" },
    { data_object_name: "lease_modifications", alias_name: "Remeasurement", alias_type: "synonym" },
    { data_object_name: "lease_disclosures", alias_name: "Lease Footnote Disclosure", alias_type: "synonym" },
    { data_object_name: "asc842_journal_entries", alias_name: "Lease Journal Entry", alias_type: "synonym" },
    { data_object_name: "lease_agreements", alias_name: "Lease Contract", alias_type: "synonym" },
    { data_object_name: "lease_critical_dates", alias_name: "Critical Date", alias_type: "synonym" },
    { data_object_name: "lease_documents", alias_name: "Lease Abstract", alias_type: "synonym" },
  ];
  await syncComposite(
    "/data_object_aliases",
    aliases.map((a) => ({
      data_object_id: doid(a.data_object_name),
      alias_name: a.alias_name,
      alias_type: a.alias_type,
      is_preferred: false,
      notes: "",
    })),
    (r) => `${r.data_object_id}|${r.alias_name}`,
    "data_object_id,alias_name",
  );

  console.log("\n--- Phase B: data_object_lifecycle_states ---");
  // operational_workflow masters get lifecycle. operational_record (schedules, documents) exempt.
  type LС = { dobj: string; module: number; states: Array<[string, number, boolean, boolean, boolean]> };
  // tuple: state_name, state_order, is_initial, is_terminal, requires_permission
  const lifecycles: LС[] = [
    {
      dobj: "rou_assets",
      module: M_ACCT,
      states: [
        ["initial_recognition", 1, true, false, false],
        ["amortizing", 2, false, false, false],
        ["impaired", 3, false, false, true],
        ["derecognized", 4, false, true, false],
      ],
    },
    {
      dobj: "lease_liabilities",
      module: M_ACCT,
      states: [
        ["initial_recognition", 1, true, false, false],
        ["accruing", 2, false, false, false],
        ["remeasured", 3, false, false, false],
        ["settled", 4, false, true, false],
      ],
    },
    {
      dobj: "lease_classifications",
      module: M_ACCT,
      states: [
        ["draft", 1, true, false, false],
        ["approved", 2, false, false, true],
        ["superseded", 3, false, true, false],
      ],
    },
    {
      dobj: "lease_modifications",
      module: M_ACCT,
      states: [
        ["draft", 1, true, false, false],
        ["approved", 2, false, false, true],
        ["posted", 3, false, true, false],
      ],
    },
    {
      dobj: "lease_disclosures",
      module: M_ACCT,
      states: [
        ["draft", 1, true, false, false],
        ["reviewed", 2, false, false, false],
        ["filed", 3, false, true, true],
      ],
    },
    {
      dobj: "asc842_journal_entries",
      module: M_ACCT,
      states: [
        ["draft", 1, true, false, false],
        ["pending_approval", 2, false, false, false],
        ["approved", 3, false, false, true],
        ["posted", 4, false, true, true],
      ],
    },
    {
      dobj: "lease_agreements",
      module: M_ADMIN,
      states: [
        ["draft", 1, true, false, false],
        ["active", 2, false, false, true],
        ["expired", 3, false, true, false],
        ["terminated", 4, false, true, true],
      ],
    },
    {
      dobj: "lease_critical_dates",
      module: M_ADMIN,
      states: [
        ["upcoming", 1, true, false, false],
        ["actioned", 2, false, true, false],
        ["lapsed", 3, false, true, false],
      ],
    },
  ];
  const lifeRows: Row[] = [];
  for (const lc of lifecycles) {
    for (const [name, order, init, term, reqperm] of lc.states) {
      lifeRows.push({
        data_object_id: doid(lc.dobj),
        state_name: name,
        state_order: order,
        is_initial: init,
        is_terminal: term,
        requires_permission: reqperm,
        permission_verb_override: "",
        domain_module_id: lc.module,
      });
    }
  }
  await syncComposite(
    "/data_object_lifecycle_states",
    lifeRows,
    (r) => `${r.data_object_id}|${r.state_name}`,
    "data_object_id,state_name",
  );

  console.log("\n--- Phase B: regulations + domain_regulations ---");
  // SOX (id 5) exists. ASC-842 and IFRS-16 need creating.
  const regSpecs = [
    {
      regulation_code: "ASC-842",
      regulation_name: "ASC 842 Leases",
      regulation_type: "accounting_standard",
      jurisdiction_id: 3, // US
      issuing_body: "Financial Accounting Standards Board",
      regulation_url: "https://fasb.org",
      description:
        "US GAAP lease accounting standard requiring lessees to recognize right-of-use assets and lease liabilities for operating and finance leases on the balance sheet, with a dual classification model and prescribed quantitative and qualitative disclosures.",
      certification_required: false,
    },
    {
      regulation_code: "IFRS-16",
      regulation_name: "IFRS 16 Leases",
      regulation_type: "accounting_standard",
      jurisdiction_id: 1, // INTL
      issuing_body: "International Accounting Standards Board",
      regulation_url: "https://www.ifrs.org",
      description:
        "IFRS lease accounting standard applying a single lessee model under which all leases are recognized on the balance sheet as right-of-use assets and lease liabilities (treated like finance leases), with low-value and short-term exemptions and an IFRS-specific disclosure schedule.",
      certification_required: false,
    },
  ];
  const regMap = await syncByKey("/regulations", regSpecs, "regulation_code");
  // pull SOX id
  const soxRow = (await get("/regulations?regulation_code=eq.SOX&select=id"))[0];
  const SOX = Number(soxRow.id);
  const domRegs = [
    { regulation_id: regMap.get("ASC-842")!, applicability: "conditional", condition_notes: "Applies to lessees reporting under US GAAP." },
    { regulation_id: regMap.get("IFRS-16")!, applicability: "conditional", condition_notes: "Applies to lessees reporting under IFRS." },
    { regulation_id: SOX, applicability: "conditional", condition_notes: "Applies to SEC registrants; lease subledger and journal-entry controls are ICFR evidence." },
  ];
  await syncComposite(
    "/domain_regulations",
    domRegs.map((d) => ({ domain_id: LEASE_ACCT, regulation_id: d.regulation_id, applicability: d.applicability, condition_notes: d.condition_notes, notes: "" })),
    (r) => `${r.domain_id}|${r.regulation_id}`,
    "domain_id,regulation_id",
  );

  console.log("\n--- Phase B: trigger_events ---");
  const triggerEvents = [
    { event_name: "lease.commenced", dobj: "lease_agreements", from_state: "draft", to_state: "active", event_category: "lifecycle", description: "A lease has commenced: the right-of-use asset and lease liability are recognized and the initial journal entry is generated for posting to the general ledger." },
    { event_name: "lease.modified", dobj: "lease_modifications", from_state: "draft", to_state: "posted", event_category: "lifecycle", description: "A lease modification or remeasurement has been approved and posted: the right-of-use asset and liability are recalculated and a catch-up journal entry is generated." },
    { event_name: "lease.remeasured", dobj: "lease_liabilities", from_state: "accruing", to_state: "remeasured", event_category: "state_change", description: "A lease liability has been remeasured (discount-rate, index, or scope change), triggering a disclosure update for the period." },
    { event_name: "lease.terminated", dobj: "lease_agreements", from_state: "active", to_state: "terminated", event_category: "lifecycle", description: "A lease has been terminated early: the remaining right-of-use asset and liability are derecognized and a termination journal entry is generated." },
    { event_name: "lease_journal_entry.posted", dobj: "asc842_journal_entries", from_state: "approved", to_state: "posted", event_category: "lifecycle", description: "A lease journal entry has been approved and posted to the general ledger." },
    { event_name: "lease_disclosure.filed", dobj: "lease_disclosures", from_state: "reviewed", to_state: "filed", event_category: "lifecycle", description: "A lease-accounting disclosure has been finalized and filed for the reporting period." },
    { event_name: "critical_date.due", dobj: "lease_critical_dates", from_state: "upcoming", to_state: "upcoming", event_category: "threshold", description: "A lease critical date is approaching its deadline: an alert fires to the lease administrator to act on the option, renewal, or notice." },
  ];
  await syncComposite(
    "/trigger_events",
    triggerEvents.map((t) => ({
      data_object_id: doid(t.dobj),
      event_name: t.event_name,
      from_state: t.from_state,
      to_state: t.to_state,
      event_category: t.event_category,
      description: t.description,
    })),
    (r) => `${r.event_name}`,
    "event_name",
  );
  const teMap = await syncByKey("/trigger_events", triggerEvents.map((t) => ({ event_name: t.event_name })), "event_name");

  console.log("\n--- Phase B: handoffs ---");
  // Outbound handoffs: lease commenced -> GL journal; remeasurement -> disclosure (intra), etc.
  // Resolve target-domain module ids where they exist; intra-domain rows use lifecycle_progression.
  type HO = {
    source_domain_id: number; target_domain_id: number; source_mod: number; target_mod: number | null;
    payload: string; event: string; pattern: string; friction: string; description: string;
  };
  const handoffs: HO[] = [
    {
      source_domain_id: LEASE_ACCT, target_domain_id: LEASE_ACCT, source_mod: M_ADMIN, target_mod: M_ACCT,
      payload: "lease_agreements", event: "lease.commenced", pattern: "lifecycle_progression", friction: "low",
      description: "A commenced lease in administration flows into accounting: the right-of-use asset and lease liability are recognized and the initial journal entry is generated.",
    },
    {
      source_domain_id: LEASE_ACCT, target_domain_id: LEASE_ACCT, source_mod: M_ACCT, target_mod: M_ACCT,
      payload: "lease_liabilities", event: "lease.remeasured", pattern: "lifecycle_progression", friction: "low",
      description: "A remeasured lease liability updates the period disclosure: the weighted-average rate, maturity analysis, and lease-cost rollups are recomputed.",
    },
    {
      source_domain_id: LEASE_ACCT, target_domain_id: FINOPS, source_mod: M_ACCT, target_mod: null,
      payload: "asc842_journal_entries", event: "lease_journal_entry.posted", pattern: "api_call", friction: "medium",
      description: "A posted lease journal entry hands the lease debit and credit to the general ledger for the financial close.",
    },
    {
      source_domain_id: LEASE_ACCT, target_domain_id: REAL_EST, source_mod: M_ADMIN, target_mod: null,
      payload: "lease_critical_dates", event: "critical_date.due", pattern: "api_call", friction: "medium",
      description: "An approaching lease critical date alerts the real-estate and facilities team to exercise or decline a renewal or option.",
    },
    {
      source_domain_id: LEASE_ACCT, target_domain_id: ACCT_PLAN, source_mod: M_ACCT, target_mod: null,
      payload: "lease_disclosures", event: "lease_disclosure.filed", pattern: "batch_sync", friction: "medium",
      description: "A filed lease disclosure feeds the consolidated financial statements and footnote package.",
    },
  ];
  // Resolve a payload data_object id; for cross-domain rows the payload is a LEASE-ACCT master.
  const handoffRows = handoffs.map((h) => ({
    source_domain_id: h.source_domain_id,
    target_domain_id: h.target_domain_id,
    source_domain_module_id: h.source_mod,
    target_domain_module_id: h.target_mod,
    data_object_id: doid(h.payload),
    trigger_event_id: teMap.get(h.event)!,
    integration_pattern: h.pattern,
    friction_level: h.friction,
    description: h.description,
    notes: "",
  }));
  await syncComposite(
    "/handoffs",
    handoffRows,
    (r) => `${r.source_domain_id}|${r.target_domain_id}|${r.data_object_id}|${r.trigger_event_id}`,
    "source_domain_id,target_domain_id,data_object_id,trigger_event_id",
  );

  // =========================================================================
  // PHASE C - Organisational-function coverage
  // =========================================================================
  console.log("\n--- Phase C: business_function_domains ---");
  // Accounting owner; Facilities and Real Estate contributor; Internal Audit consumer.
  const bf = await get(
    "/business_functions?business_function_name=in.(Accounting,%22Facilities%20and%20Real%20Estate%22,%22Internal%20Audit%22)&select=id,business_function_name",
  );
  const bfId: Record<string, number> = {};
  for (const r of bf) bfId[String(r.business_function_name)] = Number(r.id);
  await syncComposite(
    "/business_function_domains",
    [
      { business_function_id: bfId["Accounting"], domain_id: LEASE_ACCT, responsibility_type: "owner", notes: "" },
      { business_function_id: bfId["Facilities and Real Estate"], domain_id: LEASE_ACCT, responsibility_type: "contributor", notes: "" },
      { business_function_id: bfId["Internal Audit"], domain_id: LEASE_ACCT, responsibility_type: "consumer", notes: "" },
    ],
    (r) => `${r.business_function_id}|${r.domain_id}`,
    "business_function_id,domain_id",
  );

  // =========================================================================
  // PHASE S - System skill + tools + domain_module_tools
  // =========================================================================
  console.log("\n--- Phase S: tools ---");
  // query + mutate tools (data_object_id required); notify abstractions (side_effect, null).
  const tools: Array<{ tool_name: string; operation_kind: string; dobj: string | null; description: string }> = [
    { tool_name: "query_lease_agreements", operation_kind: "query", dobj: "lease_agreements", description: "Read lease agreements and their terms." },
    { tool_name: "query_rou_assets", operation_kind: "query", dobj: "rou_assets", description: "Read right-of-use asset balances and schedules." },
    { tool_name: "query_lease_liabilities", operation_kind: "query", dobj: "lease_liabilities", description: "Read lease liability balances and amortization." },
    { tool_name: "query_lease_payment_schedules", operation_kind: "query", dobj: "lease_payment_schedules", description: "Read the period-by-period lease payment and amortization schedule." },
    { tool_name: "query_lease_disclosures", operation_kind: "query", dobj: "lease_disclosures", description: "Read prepared lease-accounting disclosures for a reporting period." },
    { tool_name: "create_lease_agreement", operation_kind: "mutate", dobj: "lease_agreements", description: "Create a lease agreement record." },
    { tool_name: "classify_lease", operation_kind: "mutate", dobj: "lease_classifications", description: "Record a lease classification and its supporting test results." },
    { tool_name: "create_lease_modification", operation_kind: "mutate", dobj: "lease_modifications", description: "Record a lease modification or remeasurement and recalculate balances." },
    { tool_name: "generate_lease_journal_entry", operation_kind: "mutate", dobj: "asc842_journal_entries", description: "Generate a lease-accounting journal entry for posting to the general ledger." },
    { tool_name: "prepare_lease_disclosure", operation_kind: "mutate", dobj: "lease_disclosures", description: "Prepare or update a lease-accounting disclosure for a reporting period." },
    { tool_name: "notify_person", operation_kind: "side_effect", dobj: null, description: "Notify a single recipient (e.g. a lease accountant or administrator)." },
    { tool_name: "notify_team", operation_kind: "side_effect", dobj: null, description: "Broadcast a notification to a team (e.g. critical-date or close alerts)." },
  ];
  const toolRows = tools.map((t) => ({
    tool_name: t.tool_name,
    operation_kind: t.operation_kind,
    data_object_id: t.dobj ? doid(t.dobj) : null,
    // coverage_tier check: must be 'platform' for query/mutate (Semantius-native CRUD);
    // side_effect notify abstractions are 'external'.
    coverage_tier: t.operation_kind === "query" || t.operation_kind === "mutate" ? "platform" : "external",
    description: t.description,
  }));
  const toolMap = await syncByKey("/tools", toolRows, "tool_name");

  console.log("\n--- Phase S: domain_module_tools ---");
  // Map each tool to its realizing module + requirement_level.
  const dmt: Array<{ module: number; tool: string; req: string }> = [
    { module: M_ADMIN, tool: "query_lease_agreements", req: "required" },
    { module: M_ADMIN, tool: "create_lease_agreement", req: "required" },
    { module: M_ADMIN, tool: "notify_person", req: "optional" },
    { module: M_ADMIN, tool: "notify_team", req: "optional" },
    { module: M_ACCT, tool: "query_rou_assets", req: "required" },
    { module: M_ACCT, tool: "query_lease_liabilities", req: "required" },
    { module: M_ACCT, tool: "query_lease_payment_schedules", req: "required" },
    { module: M_ACCT, tool: "query_lease_disclosures", req: "required" },
    { module: M_ACCT, tool: "classify_lease", req: "required" },
    { module: M_ACCT, tool: "create_lease_modification", req: "required" },
    { module: M_ACCT, tool: "generate_lease_journal_entry", req: "required" },
    { module: M_ACCT, tool: "prepare_lease_disclosure", req: "required" },
    { module: M_ACCT, tool: "notify_person", req: "optional" },
    { module: M_ACCT, tool: "notify_team", req: "optional" },
  ];
  await syncComposite(
    "/domain_module_tools",
    dmt.map((d) => ({ domain_module_id: d.module, tool_id: toolMap.get(d.tool)!, requirement_level: d.req, notes: "" })),
    (r) => `${r.domain_module_id}|${r.tool_id}`,
    "domain_module_id,tool_id",
  );

  console.log("\n--- Phase S: system skill ---");
  const skillRows = [
    {
      skill_name: "lease-acct-system",
      skill_type: "system",
      domain_id: LEASE_ACCT,
      description:
        "The domain agent for lease accounting and administration. Reasons across lease records, classification, right-of-use and liability schedules, modifications, journal-entry generation, and disclosures; derives its toolset from the lease accounting and administration modules.",
    },
  ];
  await syncByKey("/skills", skillRows, "skill_name");

  // =========================================================================
  // PHASE E - Personas + RACI
  // =========================================================================
  console.log("\n--- Phase E: domain_roles ---");
  const roles = [
    {
      role_code: "ACCOUNTING-LEASE-ACCOUNTANT",
      role_name: "Lease Accountant",
      business_function_id: bfId["Accounting"],
      description:
        "Prepares lease accounting: classifies leases, maintains right-of-use and liability schedules, records modifications and remeasurements, and generates the journal entries for the general ledger.",
      _modules: [M_ACCT, M_ADMIN] as number[],
    },
    {
      role_code: "FACILITIES-LEASE-ADMINISTRATOR",
      role_name: "Lease Administrator",
      business_function_id: bfId["Facilities and Real Estate"],
      description:
        "Maintains the lease record system: agreements and documents, critical dates and alerts, renewals and terminations, and the payment terms that feed lease accounting.",
      _modules: [M_ADMIN, M_ACCT] as number[],
    },
    {
      role_code: "ACCOUNTING-CONTROLLER",
      role_name: "Controller",
      business_function_id: bfId["Accounting"],
      description:
        "Owns lease-accounting policy and the close: approves classifications and modifications, reviews and files disclosures, and signs off on the lease subledger for financial reporting.",
      _modules: [M_ACCT, M_ADMIN] as number[],
    },
  ];
  const roleMap = await syncByKey(
    "/domain_roles",
    roles.map(({ _modules, ...rest }) => rest),
    "role_code",
  );

  console.log("\n--- Phase E: role_modules ---");
  const roleModuleRows: Row[] = [];
  for (const r of roles) {
    const rid = roleMap.get(r.role_code)!;
    r._modules.forEach((mid, idx) => {
      roleModuleRows.push({ role_id: rid, domain_module_id: mid, interaction_level: idx === 0 ? "primary" : "secondary", notes: "" });
    });
  }
  await syncComposite(
    "/role_modules",
    roleModuleRows,
    (r) => `${r.role_id}|${r.domain_module_id}`,
    "role_id,domain_module_id",
  );

  console.log("\n--- Phase E: process_raci ---");
  // Real cross-industry PCF nodes (finance/accounting category 9).
  const P = {
    establish_policies: 1374, // 9.3.1.2 Establish accounting policies
    process_je: 1379, // 9.3.2.2 Process journal entries
    reconcile_gl: 1383, // 9.3.2.6 Reconcile general ledger accounts
    fixed_asset_adj: 1390, // 9.3.3.4 Process and record fixed-asset adjustments...
    depreciation: 1392, // 9.3.3.6 Calculate and record depreciation expense
    consol_fs: 1397, // 9.3.4.2 Prepare consolidated financial statements
  };
  const raci: Array<{ process_id: number; role: string; raci: string; blocking?: boolean }> = [
    // Lease accountant is responsible for the recurring accounting production.
    { process_id: P.process_je, role: "ACCOUNTING-LEASE-ACCOUNTANT", raci: "responsible" },
    { process_id: P.depreciation, role: "ACCOUNTING-LEASE-ACCOUNTANT", raci: "responsible" },
    { process_id: P.fixed_asset_adj, role: "ACCOUNTING-LEASE-ACCOUNTANT", raci: "responsible" },
    { process_id: P.consol_fs, role: "ACCOUNTING-LEASE-ACCOUNTANT", raci: "consulted", blocking: true },
    // Controller is accountable for policy, GL reconciliation, and disclosures.
    { process_id: P.establish_policies, role: "ACCOUNTING-CONTROLLER", raci: "accountable" },
    { process_id: P.reconcile_gl, role: "ACCOUNTING-CONTROLLER", raci: "accountable" },
    { process_id: P.process_je, role: "ACCOUNTING-CONTROLLER", raci: "accountable" },
    { process_id: P.consol_fs, role: "ACCOUNTING-CONTROLLER", raci: "accountable" },
    // Lease administrator feeds the source data; informed on accounting close.
    { process_id: P.fixed_asset_adj, role: "FACILITIES-LEASE-ADMINISTRATOR", raci: "consulted" },
    { process_id: P.process_je, role: "FACILITIES-LEASE-ADMINISTRATOR", raci: "informed" },
  ];
  await syncComposite(
    "/process_raci",
    raci.map((r) => ({
      process_id: r.process_id,
      actor_role_id: roleMap.get(r.role)!,
      raci: r.raci,
      consultation_blocking: r.blocking ?? false,
    })),
    (r) => `${r.process_id}|${r.actor_role_id}|${r.raci}`,
    "process_id,actor_role_id,raci",
  );

  console.log("\n=== LEASE-ACCT build complete ===");

  // Post-load metadata audit (Rule #8 step 3).
  const zeros = await get(
    "/domains?domain_code=eq.LEASE-ACCT&select=domain_code,crud_percentage,min_org_size,cost_band,usa_market_size_usd_m",
  );
  console.log("metadata check:", JSON.stringify(zeros));
}

main().catch((e) => {
  console.error("BUILD FAILED:", e.message);
  process.exit(1);
});
