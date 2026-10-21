/**
 * BEN-ADMIN state-driven Validate execute pass (2026-06-07).
 *
 * Works ONLY the agent-executable open items in audits/BEN-ADMIN/state.yaml:
 *
 *   B1A-ENTITY-TYPE: PATCH data_objects.entity_type on the 7 BEN-ADMIN masters
 *     (146 benefit_plans, 147 benefit_enrollments, 148 benefit_dependents,
 *      149 life_events, 150 benefit_open_enrollments, 151 benefit_carriers,
 *      152 carrier_feeds) from 'unclassified' to the Rule #12 enum.
 *     Classification (deterministic from description + lifecycle shape):
 *       benefit_plans            -> catalog              (plan offering catalog; has_personal_content=false; simple activate/deactivate publication lifecycle)
 *       benefit_open_enrollments -> operational_workflow (planned->open->closed->processed window with gated transitions)
 *       benefit_enrollments      -> operational_workflow (pending->elected->active->terminated election workflow; gated)
 *       benefit_dependents       -> operational_workflow (declared->pending_verification->verified->inactive; gated verify/deactivate)
 *       life_events              -> operational_workflow (declared->submitted->approved->processed/rejected QLE approval workflow)
 *       benefit_carriers         -> operational_workflow (prospect->contracted->active->suspended->terminated; gated contract/activate/suspend)
 *       carrier_feeds            -> operational_workflow (scheduled->generating->transmitted->acknowledged/failed transmission record; gated)
 *
 *   CATALOG UX (Rule #20): author buyer-voice catalog_tagline + catalog_description on
 *     the BEN-ADMIN domain row (61) and each of the 4 modules (71/72/73/74). Only writes
 *     EMPTY fields; never overwrites a non-empty value. No vendor names (Rule #18); no
 *     em-dash; American English.
 *
 *   B1A-S11 (C1): INSERT 3 business_function_domains rows on domain_id=61:
 *       Human Resources (3)  -> contributor
 *       Payroll (38)         -> contributor
 *       Finance (4)          -> consumer
 *     Idempotent against (domain_id, business_function_id). business_function_domain_label
 *     composed as "<Function> / Benefits Administration". NO notes write (Rule #15).
 *
 * NOT executed here (surfaced / deferred per task contract):
 *   - B1A-RULE15-598 (revert notes on DMDO 598): destructive overwrite of a non-empty
 *     notes value AND writes the 'notes' column (Rule #15). SURFACE only.
 *   - B1A-SELF-CONTAIN (M9): rewrites role/necessity on existing DMDO rows. SURFACE only.
 *   - B1A-PHASE-P (personas/RACI): DEFER, do not author.
 *   - All b1b (blocked on b2 decisions or other-domain audits), all b2, all b3.
 *
 * Run from project root (c:/dev/domain-map):
 *   bun run .tmp_deploy/fix_ben_admin_state_driven_2026_06_07.ts            # dry-run
 *   bun run .tmp_deploy/fix_ben_admin_state_driven_2026_06_07.ts --apply    # apply
 */

const APPLY = process.argv.includes("--apply");

async function pg(method: string, path: string, body?: any): Promise<any> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(
      `${method} ${path} (${code}): ${(stderr || stdout).slice(0, 800)}`,
    );
  }
  return stdout.trim() ? JSON.parse(stdout) : null;
}

// ----- B1A-ENTITY-TYPE -----
const ENTITY_TYPES: Array<{ id: number; name: string; entity_type: string }> = [
  { id: 146, name: "benefit_plans", entity_type: "catalog" },
  { id: 147, name: "benefit_enrollments", entity_type: "operational_workflow" },
  { id: 148, name: "benefit_dependents", entity_type: "operational_workflow" },
  { id: 149, name: "life_events", entity_type: "operational_workflow" },
  { id: 150, name: "benefit_open_enrollments", entity_type: "operational_workflow" },
  { id: 151, name: "benefit_carriers", entity_type: "operational_workflow" },
  { id: 152, name: "carrier_feeds", entity_type: "operational_workflow" },
];

// ----- CATALOG UX (Rule #20) -----
// Buyer-voice copy. No vendor names, no em-dash, American English.
const DOMAIN_CATALOG: { id: number; tagline: string; description: string } = {
  id: 61,
  tagline: "Run open enrollment, life events, and carrier connectivity in one place.",
  description:
    "Benefits Administration gives HR and benefits teams a single workspace to design plan offerings, run annual open enrollment, capture employee elections and dependents, process qualifying life events, and keep insurance carriers and retirement record-keepers in sync. It tracks affordability and ACA reporting obligations so employees get the coverage they choose and the organization stays compliant without spreadsheet wrangling.",
};

const MODULE_CATALOG: Array<{
  id: number;
  code: string;
  tagline: string;
  description: string;
}> = [
  {
    id: 71,
    code: "BEN-PLAN-DESIGN",
    tagline: "Build your plan catalog and set up each enrollment window.",
    description:
      "Define the medical, dental, vision, retirement, and voluntary plans you offer, set eligibility and pricing, map payroll deductions, and scope offerings by legal entity. Schedule and configure each open enrollment window so employees see the right choices when the window opens.",
  },
  {
    id: 72,
    code: "BEN-ENROLLMENT",
    tagline: "Guide employees through elections, dependents, and life events.",
    description:
      "Give employees a guided path to elect coverage, add and verify dependents, and report qualifying life events such as marriage, a new child, or a move. Benefits teams review and approve changes, lock records once verified, and keep every election accurate from onboarding through termination.",
  },
  {
    id: 73,
    code: "BEN-CARRIER-INTEG",
    tagline: "Keep carriers and record-keepers in sync automatically.",
    description:
      "Connect to insurance carriers, retirement record-keepers, and equity providers over EDI, API, or file feeds. Transmit enrollment changes, reconcile carrier acknowledgments, and resolve member-identity mismatches so coverage on file always matches what employees elected.",
  },
  {
    id: 74,
    code: "BEN-ACA-COMPLIANCE",
    tagline: "Stay ahead of ACA reporting and affordability obligations.",
    description:
      "Track monthly affordability and coverage offers, generate 1094-C and 1095-C filings, and produce the audit trail that keeps the organization clear of ACA penalties. Pull enrollment, employee, and legal-entity data together so year-end reporting is a confirmation step, not a fire drill.",
  },
];

// ----- B1A-S11: business_function_domains -----
const BEN_ADMIN_DOMAIN_ID = 61;
const BEN_ADMIN_DOMAIN_NAME = "Benefits Administration";
const BFD_ROWS: Array<{
  business_function_id: number;
  function_name: string;
  responsibility_type: "contributor" | "consumer";
}> = [
  { business_function_id: 3, function_name: "Human Resources", responsibility_type: "contributor" },
  { business_function_id: 38, function_name: "Payroll", responsibility_type: "contributor" },
  { business_function_id: 4, function_name: "Finance", responsibility_type: "consumer" },
];

async function patchEntityTypes(): Promise<void> {
  console.log("B1A-ENTITY-TYPE: classify 7 masters (data_objects.entity_type)");
  console.log("--------------------------------------------------------------");
  const live: Array<{ id: number; data_object_name: string; entity_type: string }> =
    await pg(
      "GET",
      "/data_objects?id=in.(146,147,148,149,150,151,152)&select=id,data_object_name,entity_type",
    );
  const byId = new Map(live.map((r) => [r.id, r]));
  for (const e of ENTITY_TYPES) {
    const cur = byId.get(e.id);
    if (!cur) {
      console.log(`  ! id=${e.id} (${e.name}) not found`);
      continue;
    }
    if (cur.entity_type === e.entity_type) {
      console.log(`  = ${e.name} already ${e.entity_type}`);
      continue;
    }
    if (cur.entity_type !== "unclassified" && cur.entity_type !== null) {
      // Defensive: do NOT overwrite a non-empty, non-unclassified classification.
      console.log(
        `  ! ${e.name} already classified as "${cur.entity_type}" (not unclassified) - SKIP (would overwrite)`,
      );
      continue;
    }
    console.log(
      `  ${APPLY ? "->" : "DRY"} ${e.name}: "${cur.entity_type}" -> "${e.entity_type}"`,
    );
    if (APPLY) {
      await pg("PATCH", `/data_objects?id=eq.${e.id}`, { entity_type: e.entity_type });
    }
  }
  console.log("");
}

async function patchCatalogUx(): Promise<void> {
  console.log("CATALOG UX (Rule #20): domain + 4 modules (empty fields only)");
  console.log("-------------------------------------------------------------");

  // Domain row
  const dom: Array<{ id: number; catalog_tagline: string; catalog_description: string }> =
    await pg(
      "GET",
      `/domains?id=eq.${DOMAIN_CATALOG.id}&select=id,catalog_tagline,catalog_description`,
    );
  if (dom && dom.length > 0) {
    const cur = dom[0];
    const patch: any = {};
    if (!cur.catalog_tagline || cur.catalog_tagline.trim() === "")
      patch.catalog_tagline = DOMAIN_CATALOG.tagline;
    else console.log(`  = domain ${DOMAIN_CATALOG.id} catalog_tagline non-empty, skip`);
    if (!cur.catalog_description || cur.catalog_description.trim() === "")
      patch.catalog_description = DOMAIN_CATALOG.description;
    else console.log(`  = domain ${DOMAIN_CATALOG.id} catalog_description non-empty, skip`);
    if (Object.keys(patch).length > 0) {
      console.log(
        `  ${APPLY ? "->" : "DRY"} domain ${DOMAIN_CATALOG.id}: set ${Object.keys(patch).join(", ")}`,
      );
      if (APPLY) await pg("PATCH", `/domains?id=eq.${DOMAIN_CATALOG.id}`, patch);
    }
  }

  // Modules
  const modIds = MODULE_CATALOG.map((m) => m.id).join(",");
  const mods: Array<{ id: number; catalog_tagline: string; catalog_description: string }> =
    await pg(
      "GET",
      `/domain_modules?id=in.(${modIds})&select=id,catalog_tagline,catalog_description`,
    );
  const modById = new Map((mods || []).map((m) => [m.id, m]));
  for (const m of MODULE_CATALOG) {
    const cur = modById.get(m.id);
    if (!cur) {
      console.log(`  ! module ${m.id} (${m.code}) not found`);
      continue;
    }
    const patch: any = {};
    if (!cur.catalog_tagline || cur.catalog_tagline.trim() === "")
      patch.catalog_tagline = m.tagline;
    else console.log(`  = module ${m.code} catalog_tagline non-empty, skip`);
    if (!cur.catalog_description || cur.catalog_description.trim() === "")
      patch.catalog_description = m.description;
    else console.log(`  = module ${m.code} catalog_description non-empty, skip`);
    if (Object.keys(patch).length > 0) {
      console.log(
        `  ${APPLY ? "->" : "DRY"} module ${m.code} (${m.id}): set ${Object.keys(patch).join(", ")}`,
      );
      if (APPLY) await pg("PATCH", `/domain_modules?id=eq.${m.id}`, patch);
    }
  }
  console.log("");
}

async function insertBusinessFunctionDomains(): Promise<void> {
  console.log("B1A-S11: business_function_domains (HR/Payroll contributor, Finance consumer)");
  console.log("---------------------------------------------------------------------------");
  const existing: Array<{
    id: number;
    business_function_id: number;
    responsibility_type: string;
  }> = await pg(
    "GET",
    `/business_function_domains?domain_id=eq.${BEN_ADMIN_DOMAIN_ID}&select=id,business_function_id,responsibility_type`,
  );
  const existingFnIds = new Set((existing || []).map((r) => r.business_function_id));

  const newRows: any[] = [];
  for (const r of BFD_ROWS) {
    if (existingFnIds.has(r.business_function_id)) {
      console.log(`  = ${r.function_name} (${r.business_function_id}) already present, skip`);
      continue;
    }
    console.log(
      `  ${APPLY ? "->" : "DRY"} INSERT ${r.function_name} (${r.business_function_id}) -> ${r.responsibility_type}`,
    );
    newRows.push({
      domain_id: BEN_ADMIN_DOMAIN_ID,
      business_function_id: r.business_function_id,
      responsibility_type: r.responsibility_type,
      business_function_domain_label: `${r.function_name} / ${BEN_ADMIN_DOMAIN_NAME}`,
      // record_status omitted: defaults to "new" per Rule #1.
      // No notes write (Rule #15).
    });
  }

  if (newRows.length === 0) {
    console.log("  (nothing to insert)");
  } else if (APPLY) {
    await pg("POST", "/business_function_domains", newRows);
    console.log(`  -> POSTed ${newRows.length} rows`);
  } else {
    console.log(`  DRY would POST ${newRows.length} rows`);
  }
  console.log("");
}

async function main(): Promise<void> {
  console.log(`BEN-ADMIN state-driven execute pass (apply=${APPLY})`);
  console.log("===================================================\n");

  await patchEntityTypes();
  await patchCatalogUx();
  await insertBusinessFunctionDomains();

  console.log("Done.");
  console.log("");
  console.log("Verify in the UI:");
  console.log("  https://tests.semantius.app/domain_map/data_objects");
  console.log("  https://tests.semantius.app/domain_map/domains");
  console.log("  https://tests.semantius.app/domain_map/domain_modules");
  console.log("  https://tests.semantius.app/domain_map/business_function_domains");
}

await main();
