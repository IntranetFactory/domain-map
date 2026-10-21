#!/usr/bin/env bun
// Loads the new white-space domain INTRANET-GOV (Intranet Governance) into the live
// domain_map module. Phase A (market shape) + Phase B-core (data_objects + module masters)
// + Phase C (functional ownership). Idempotent: reads existing rows by natural key,
// inserts only the missing ones, re-reads to build id maps.
//
// All record_status omitted -> DB default 'new' (Rule #1). No approvals stamped.

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
const get = (path: string) => call({ method: "GET", path });

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map(r => {
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
    out.push(...await call({ method: "POST", path, body: slice }));
  }
  return out;
}
// sync on a single natural key -> Map<key,id>
async function syncTable(path: string, rows: Row[], keyField: string): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=10000`);
  const have = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !have.has(String(r[keyField])));
  if (missing.length) { console.log(`  +${missing.length} into ${path} (${existing.length} existed)`); await insert(path, missing); }
  else console.log(`  ${path}: all ${existing.length} present`);
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const m = new Map<string, number>();
  for (const r of all) m.set(String(r[keyField]), Number(r.id));
  return m;
}
// sync a junction on a composite key built from already-resolved FK columns
async function syncJunction(path: string, rows: Row[], selectCols: string, keyOf: (r: Row) => string): Promise<void> {
  const existing = await get(`${path}?select=${selectCols}&limit=20000`);
  const have = new Set(existing.map(keyOf));
  const missing = rows.filter(r => !have.has(keyOf(r)));
  if (missing.length) { console.log(`  +${missing.length} into ${path} (${existing.length} existed)`); await insert(path, missing); }
  else console.log(`  ${path}: all ${existing.length} present`);
}

function validateDomainRow(d: Row) {
  const fail = (d.crud_percentage as number) === 0 || d.min_org_size === "" || d.cost_band === "" ||
    (d.business_logic === "" && (d.crud_percentage as number) < 95) ||
    (d.usa_market_size_usd_m as number) === 0 || (d.market_size_source_year as number) === 0;
  if (fail) throw new Error(`validateDomainRow failed for ${d.domain_code}: ${JSON.stringify(d)}`);
}

// ============================================================
console.log("== Phase A: domain ==");
const domainRow: Row = {
  domain_code: "INTRANET-GOV",
  domain_name: "Intranet Governance",
  parent_domain_id: null,
  description: "Platform-agnostic inventory, accountable ownership, recertification, content lifecycle, quality and accessibility governance, and improvement planning over content held in an organization's existing intranets. The accountability layer over the intranet platform(s) already in place, not a publishing platform itself. Distinct from Employee Communications & Intranet (the publishing platform), Web Content Operations & Governance (external / customer-facing audience), and Collaboration Governance (Microsoft 365 container and tenant governance).",
  crud_percentage: 70,
  business_logic: "Cures the intranet ghost town by giving organizations a platform-agnostic system of record for what content exists, who is accountable for it, and whether it has been recertified, without forcing a rip-and-replace of their existing intranets.",
  min_org_size: "30 m <2500",
  cost_band: "$$",
  certification_required: false,
  usa_market_size_usd_m: 120,
  market_size_source_year: 2025,
  catalog_tagline: "Know what is in every intranet, who owns it, and whether it is still true, without replacing the intranet you have.",
  catalog_description: "Map every page, hub, library, and form across the intranets you already run, then make someone accountable for each one. Assign owners and review cadences, run recertification cycles so content gets confirmed current or flagged stale, and turn what you find into a prioritized improvement backlog. Connect SharePoint, Viva, Staffbase, Simpplr, or WordPress as governed sources and govern them from one place. Built for the digital-workplace and internal-comms teams who inherit stale, abandoned, unowned content nobody trusts. It is an accountability layer over your existing intranets, not another intranet to migrate to.",
};
validateDomainRow(domainRow);
const domMap = await syncTable("/domains", [domainRow], "domain_code");
const DID = domMap.get("INTRANET-GOV")!;
console.log(`  domain id = ${DID}`);

console.log("== Phase A: capabilities ==");
const caps: Row[] = [
  { capability_code: "INTGOV-CONNECT", capability_name: "Source Connectors", description: "Connect and crawl heterogeneous intranet platforms (SharePoint and Viva, Staffbase, Simpplr, WordPress) as governed sources." },
  { capability_code: "INTGOV-INV", capability_name: "Content Inventory and Mapping", description: "Discover and register pages, hubs, spaces, libraries, and forms across connected intranets into a single map." },
  { capability_code: "INTGOV-QUAL", capability_name: "Content Quality Scanning", description: "Detect stale, broken-link, duplicate, and low-readability content for the internal audience." },
  { capability_code: "INTGOV-A11Y", capability_name: "Accessibility Governance", description: "Scan internal content against accessibility standards and surface owner-mapped issues." },
  { capability_code: "INTGOV-OWN", capability_name: "Ownership Accountability", description: "Assign every inventory item an accountable owner and backup with a defined review cadence." },
  { capability_code: "INTGOV-ATTEST", capability_name: "Ownership Attestation and Recertification", description: "Periodic owner attestation that content is current, with flag-stale, remediate, or archive outcomes." },
  { capability_code: "INTGOV-LIFE", capability_name: "Content Lifecycle and Review", description: "Drive content from live through review-due to archived per policy and content-type retention rules." },
  { capability_code: "INTGOV-PLAN", capability_name: "Improvement Planning and Backlog", description: "Maintain a prioritized improvement backlog that embeds Work Management for execution." },
];
const capMap = await syncTable("/capabilities", caps, "capability_code");

console.log("== Phase A: capability_domains ==");
await syncJunction("/capability_domains",
  caps.map(c => ({ capability_id: capMap.get(c.capability_code as string)!, domain_id: DID })),
  "capability_id,domain_id", r => `${r.capability_id}|${r.domain_id}`);

console.log("== Phase A: domain_modules ==");
const modules: Row[] = [
  { domain_module_code: "INTGOV-INVENTORY", domain_module_name: "Inventory and Sources", domain_id: DID, module_kind: "full",
    description: "Connector registry, cross-platform content inventory, content-type policy, and health scoring.",
    catalog_tagline: "See every piece of content across all your intranets in one map.",
    catalog_description: "Connect SharePoint, Viva, Staffbase, Simpplr, or WordPress and automatically build a living inventory of every page, hub, library, and form. Classify content by type, score its health and accessibility, and know exactly what exists before you decide what to fix." },
  { domain_module_code: "INTGOV-GOVERNANCE", domain_module_name: "Ownership, Lifecycle and Planning", domain_id: DID, module_kind: "full",
    description: "Accountable ownership assignments, recertification attestations, and the improvement backlog.",
    catalog_tagline: "Put a name on every page and keep it accountable over time.",
    catalog_description: "Assign an accountable owner and review cadence to each piece of content, run recertification cycles so owners confirm what is current or flag what is stale, and turn the gaps into a prioritized improvement backlog. The accountability layer that keeps your intranet from decaying into a ghost town." },
];
const modMap = await syncTable("/domain_modules", modules, "domain_module_code");
const MOD_INV = modMap.get("INTGOV-INVENTORY")!;
const MOD_GOV = modMap.get("INTGOV-GOVERNANCE")!;

console.log("== Phase A: domain_module_capabilities ==");
const dmc: Row[] = [
  ...["INTGOV-CONNECT", "INTGOV-INV", "INTGOV-QUAL", "INTGOV-A11Y"].map(c => ({ domain_module_id: MOD_INV, capability_id: capMap.get(c)! })),
  ...["INTGOV-OWN", "INTGOV-ATTEST", "INTGOV-LIFE", "INTGOV-PLAN"].map(c => ({ domain_module_id: MOD_GOV, capability_id: capMap.get(c)! })),
];
await syncJunction("/domain_module_capabilities", dmc, "domain_module_id,capability_id", r => `${r.domain_module_id}|${r.capability_id}`);

console.log("== Phase A: vendors + solutions (partial coverage) ==");
const vendMap = await syncTable("/vendors", [
  { vendor_name: "Powell Software", vendor_url: "https://powell-software.com", headquarters_country: "France", description: "Microsoft 365 intranet and collaboration-governance vendor (Powell Intranet, Powell Governance)." },
], "vendor_name");
// Microsoft vendor already exists; resolve id
const msVendor = await get("/vendors?vendor_name=eq.Microsoft&select=id");
const MS_VID = msVendor.length ? Number(msVendor[0].id) : null;
const newSolutions: Row[] = [
  { solution_name: "Microsoft SharePoint Advanced Management", vendor_id: MS_VID, solution_type: "saas", solution_kind: "standard_solution", description: "SharePoint Online lifecycle controls: inactive-site detection, owner notification, and site recertification. Single-platform, site-grain." },
  { solution_name: "Powell Governance", vendor_id: vendMap.get("Powell Software")!, solution_type: "saas", solution_kind: "standard_solution", description: "Microsoft 365 / SharePoint / Teams site governance: templates, lifecycle, ownership, and content review cycles. Microsoft-bound." },
];
await syncTable("/solutions", newSolutions, "solution_name");
// resolve all 6 partial-coverage solution ids by name
const partialNames = ["Siteimprove", "Acquia Optimize", "Orchestry", "AvePoint Confidence Platform", "Microsoft SharePoint Advanced Management", "Powell Governance"];
const solRows = await get(`/solutions?solution_name=in.(${partialNames.map(n => `"${n}"`).join(",")})&select=id,solution_name`);
const solMap = new Map(solRows.map(r => [String(r.solution_name), Number(r.id)]));

console.log("== Phase A: solution_domains (all partial) ==");
await syncJunction("/solution_domains",
  partialNames.filter(n => solMap.has(n)).map(n => ({ solution_id: solMap.get(n)!, domain_id: DID, coverage_level: "partial" })),
  "solution_id,domain_id", r => `${r.solution_id}|${r.domain_id}`);

// ============================================================
console.log("== Phase B: data_objects ==");
const dataObjects: Row[] = [
  { data_object_name: "connected_intranets", singular_label: "Connected Intranet", plural_label: "Connected Intranets", entity_type: "catalog", kind: "domain_owned", is_canonical_bare_word: false, has_personal_content: false, has_submit_lock: false, has_single_approver: false, description: "A source intranet platform under governance (the connector target): platform type, base URL, auth, crawl schedule, and status." },
  { data_object_name: "intranet_content_inventory_records", singular_label: "Content Inventory Record", plural_label: "Content Inventory Records", entity_type: "operational_record", kind: "domain_owned", is_canonical_bare_word: false, has_personal_content: false, has_submit_lock: false, has_single_approver: false, description: "A discovered or registered piece of intranet content (page, hub, space, library, form) across connected intranets, with source, type, last-modified, owner, and governance status." },
  { data_object_name: "intranet_content_types", singular_label: "Intranet Content Type", plural_label: "Intranet Content Types", entity_type: "catalog", kind: "domain_owned", is_canonical_bare_word: false, has_personal_content: false, has_submit_lock: false, has_single_approver: false, description: "A governed content-type definition (policy, news post, hub, library, form, FAQ) carrying its default review cadence, criticality, and retention rule." },
  { data_object_name: "intranet_content_health_scores", singular_label: "Content Health Score", plural_label: "Content Health Scores", entity_type: "computed", kind: "domain_owned", is_canonical_bare_word: false, has_personal_content: false, has_submit_lock: false, has_single_approver: false, description: "Derived freshness, quality, accessibility, and ownership-coverage score per inventory record." },
  { data_object_name: "intranet_content_ownership_assignments", singular_label: "Content Ownership Assignment", plural_label: "Content Ownership Assignments", entity_type: "junction", kind: "domain_owned", is_canonical_bare_word: false, has_personal_content: false, has_submit_lock: false, has_single_approver: false, description: "Assignment of an accountable owner and backup to an inventory record, with the review cadence the owner is responsible for." },
  { data_object_name: "intranet_content_attestations", singular_label: "Content Attestation", plural_label: "Content Attestations", entity_type: "operational_workflow", kind: "domain_owned", is_canonical_bare_word: false, has_personal_content: false, has_submit_lock: false, has_single_approver: true, description: "A recertification record: an owner attests that a piece of content is current, or flags it stale for remediation or archival." },
];
const doMap = await syncTable("/data_objects", dataObjects, "data_object_name");
// resolve embed/consume targets
const refObjs = await get('/data_objects?data_object_name=in.(work_items,users)&select=id,data_object_name');
for (const r of refObjs) doMap.set(String(r.data_object_name), Number(r.id));

console.log("== Phase B: domain_module_data_objects ==");
const dmdo: Row[] = [
  // Module A masters
  { domain_module_id: MOD_INV, data_object_id: doMap.get("connected_intranets")!, role: "master", necessity: "required" },
  { domain_module_id: MOD_INV, data_object_id: doMap.get("intranet_content_inventory_records")!, role: "master", necessity: "required" },
  { domain_module_id: MOD_INV, data_object_id: doMap.get("intranet_content_types")!, role: "master", necessity: "required" },
  { domain_module_id: MOD_INV, data_object_id: doMap.get("intranet_content_health_scores")!, role: "master", necessity: "required" },
  // Module B masters + embed + consume
  { domain_module_id: MOD_GOV, data_object_id: doMap.get("intranet_content_ownership_assignments")!, role: "master", necessity: "required" },
  { domain_module_id: MOD_GOV, data_object_id: doMap.get("intranet_content_attestations")!, role: "master", necessity: "required" },
  { domain_module_id: MOD_GOV, data_object_id: doMap.get("work_items")!, role: "embedded_master", necessity: "optional" },
  { domain_module_id: MOD_GOV, data_object_id: doMap.get("users")!, role: "consumer", necessity: "required" },
];
await syncJunction("/domain_module_data_objects", dmdo, "domain_module_id,data_object_id", r => `${r.domain_module_id}|${r.data_object_id}`);

// ============================================================
console.log("== Phase C: business_function_domains ==");
const fnNames = ["IT Operations", "Human Resources", "Marketing Communications", "Executive"];
const fnRows = await get(`/business_functions?business_function_name=in.(${fnNames.map(n => `"${n}"`).join(",")})&select=id,business_function_name`);
const fnMap = new Map(fnRows.map(r => [String(r.business_function_name), Number(r.id)]));
for (const n of fnNames) if (!fnMap.has(n)) console.log(`  WARN: business_function not found: ${n}`);
const bfd: Row[] = [
  { business_function_id: fnMap.get("IT Operations"), domain_id: DID, responsibility_type: "owner" },
  { business_function_id: fnMap.get("Human Resources"), domain_id: DID, responsibility_type: "owner" },
  { business_function_id: fnMap.get("Marketing Communications"), domain_id: DID, responsibility_type: "contributor" },
  { business_function_id: fnMap.get("Executive"), domain_id: DID, responsibility_type: "consumer" },
].filter(r => r.business_function_id != null);
await syncJunction("/business_function_domains", bfd, "business_function_id,domain_id,responsibility_type", r => `${r.business_function_id}|${r.domain_id}|${r.responsibility_type}`);

console.log("\n== DONE (Phase A + B-core + C). UI: ==");
console.log("https://tests.semantius.app/domain_map/domains");
console.log("https://tests.semantius.app/domain_map/domain_module_data_objects");
console.log(`domain id = ${DID}, modules: INVENTORY=${MOD_INV} GOVERNANCE=${MOD_GOV}`);
