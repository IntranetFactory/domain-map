// SRM restructure (SUP-LIFE -> SRM), restructure-first pass.
// Idempotent: every step reads existing state first and inserts only what is missing.
// Scope (user-approved 2026-06-19): rename domain, aliases, 3 modules, modularize the 6 existing
// masters, 8 capabilities, repurpose the domain skill, mutate tools + domain_module_tools, module
// catalog UX. Does NOT add the 17 new masters, lifecycle states, handoffs, or personas (follow-up).

type Row = Record<string, unknown>;

const DOMAIN_ID = 28;
const DOMAIN_NAME = "Supplier Relationship Management";
const DOMAIN_CODE = "SRM";

async function call(req: { method: string; path: string; body?: unknown }): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(req));
  proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  const trimmed = out.trim();
  if (!trimmed) {
    if (proc.exitCode === 0) return [];
    throw new Error(`call failed (${proc.exitCode}) ${req.method} ${req.path}: ${err}`);
  }
  let parsed: any;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(`non-JSON from ${req.method} ${req.path}: ${trimmed.slice(0, 500)} ${err}`);
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.code && parsed.message) {
    throw new Error(`PostgREST error ${req.method} ${req.path}: ${JSON.stringify(parsed)}`);
  }
  return parsed;
}
const get = (path: string) => call({ method: "GET", path });

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
    if (Array.isArray(result)) out.push(...result);
  }
  return out;
}

const log = (m: string) => console.log(m);

// ---------------------------------------------------------------------------
// 1. Rename domain SUP-LIFE -> SRM
// ---------------------------------------------------------------------------
const [domain] = await get(`/domains?id=eq.${DOMAIN_ID}`);
if (!domain) throw new Error(`domain ${DOMAIN_ID} not found`);
const codeCollision = await get(`/domains?domain_code=eq.${DOMAIN_CODE}&id=neq.${DOMAIN_ID}&select=id`);
if (codeCollision.length > 0) throw new Error(`domain_code ${DOMAIN_CODE} already used by another domain`);
if (domain.domain_code !== DOMAIN_CODE || domain.domain_name !== DOMAIN_NAME) {
  await call({
    method: "PATCH",
    path: `/domains?id=eq.${DOMAIN_ID}`,
    body: { domain_name: DOMAIN_NAME, domain_code: DOMAIN_CODE },
  });
  log(`renamed domain ${DOMAIN_ID}: ${domain.domain_code} -> ${DOMAIN_CODE}`);
} else {
  log(`domain already named ${DOMAIN_CODE} (skip)`);
}

// ---------------------------------------------------------------------------
// 2. Aliases
// ---------------------------------------------------------------------------
const aliasTexts = [
  "SRM",
  "Supplier Lifecycle Management",
  "SLM",
  "Supplier Management",
  "vendor management",
];
const existingAliases = await get(
  `/domain_aliases?domain_id=eq.${DOMAIN_ID}&select=alias`,
);
const haveAlias = new Set(existingAliases.map((r: Row) => String(r.alias).toLowerCase()));
const newAliases = aliasTexts
  .filter((a) => !haveAlias.has(a.toLowerCase()))
  .map((a) => ({ domain_id: DOMAIN_ID, alias: a, label: a, alias_type: "synonym" }));
await insert("/domain_aliases", newAliases);
log(`aliases: +${newAliases.length} (had ${existingAliases.length})`);

// ---------------------------------------------------------------------------
// 3. Modules
// ---------------------------------------------------------------------------
const moduleSpecs = [
  {
    domain_module_code: "SRM-SUPPLIER-LIFECYCLE",
    domain_module_name: "Supplier Lifecycle Management",
    description:
      "Supplier master data, onboarding, registration, and qualification. The intake and master-record spine of supplier management.",
    catalog_tagline: "Onboard, qualify, and maintain every supplier on one trusted master record.",
    catalog_description:
      "Run supplier onboarding from invitation through registration, document collection, and approval. Qualify new suppliers against your standards before they go active, and keep the supplier master, contacts, and documents current as the relationship evolves. One clean record per supplier that procurement, finance, and compliance all work from.",
  },
  {
    domain_module_code: "SRM-PERFORMANCE-MGMT",
    domain_module_name: "Supplier Performance Management",
    description:
      "Supplier performance scorecards, KPIs, reviews, and corrective actions. Measures and improves supplier delivery, quality, and service.",
    catalog_tagline: "Score supplier performance and drive improvement where it slips.",
    catalog_description:
      "Measure suppliers against delivery, quality, responsiveness, and savings targets, and roll the results into weighted scorecards your category managers and finance teams share. Spot underperformers early, open corrective actions, and track them to closure so supplier performance improves cycle over cycle.",
  },
  {
    domain_module_code: "SRM-RISK-COMPLIANCE",
    domain_module_name: "Supplier Risk and Compliance",
    description:
      "Supplier risk assessment, certifications, sanctions and compliance screening, and ESG. Operational, qualification-gated supplier risk, distinct from deep third-party due diligence (TPRM).",
    catalog_tagline: "Assess supplier risk and prove compliance before and after you sign.",
    catalog_description:
      "Score each supplier for financial, operational, cyber, and ESG risk, and keep certifications and insurance current with automatic expiry alerts. Screen suppliers for sanctions and compliance gaps, escalate elevated risk to governance and procurement, and keep a defensible record of every check behind each supplier decision.",
  },
];
const existingModules = await get(
  `/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`,
);
const haveModule = new Map<string, number>(
  existingModules.map((r: Row) => [String(r.domain_module_code), Number(r.id)]),
);
const modulesToInsert = moduleSpecs
  .filter((m) => !haveModule.has(m.domain_module_code))
  .map((m) => ({ ...m, domain_id: DOMAIN_ID, module_kind: "full" }));
await insert("/domain_modules", modulesToInsert);
// re-read to build code -> id map
const allModules = await get(`/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`);
const moduleId = new Map<string, number>(
  allModules.map((r: Row) => [String(r.domain_module_code), Number(r.id)]),
);
log(`modules: +${modulesToInsert.length} (total ${allModules.length})`);

// ---------------------------------------------------------------------------
// 4. domain_module_data_objects master rows for the 6 existing masters
// ---------------------------------------------------------------------------
const masterMap: Record<string, number> = {
  suppliers: 206,
  supplier_onboardings: 207,
  supplier_qualifications: 208,
  supplier_scorecards: 209,
  supplier_risk_assessments: 730,
  supplier_certifications: 498,
};
const moduleMasters: { module: string; data_object: string }[] = [
  { module: "SRM-SUPPLIER-LIFECYCLE", data_object: "suppliers" },
  { module: "SRM-SUPPLIER-LIFECYCLE", data_object: "supplier_onboardings" },
  { module: "SRM-SUPPLIER-LIFECYCLE", data_object: "supplier_qualifications" },
  { module: "SRM-PERFORMANCE-MGMT", data_object: "supplier_scorecards" },
  { module: "SRM-RISK-COMPLIANCE", data_object: "supplier_risk_assessments" },
  { module: "SRM-RISK-COMPLIANCE", data_object: "supplier_certifications" },
];
const modIds = allModules.map((r: Row) => Number(r.id));
const existingDMDO = await get(
  `/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,data_object_id`,
);
const haveDMDO = new Set(
  existingDMDO.map((r: Row) => `${r.domain_module_id}.${r.data_object_id}`),
);
const dmdoToInsert = moduleMasters
  .map((mm) => {
    const mid = moduleId.get(mm.module)!;
    const did = masterMap[mm.data_object];
    return { mid, did, mm };
  })
  .filter(({ mid, did }) => !haveDMDO.has(`${mid}.${did}`))
  .map(({ mid, did, mm }) => ({
    domain_module_id: mid,
    data_object_id: did,
    role: "master",
    necessity: "required",
    domain_module_data_object_label: `${mm.module} / ${mm.data_object}`,
    notes: "",
  }));
await insert("/domain_module_data_objects", dmdoToInsert);
log(`domain_module_data_objects master rows: +${dmdoToInsert.length} of ${moduleMasters.length}`);

// ---------------------------------------------------------------------------
// 5. Capabilities + capability_domains + domain_module_capabilities
// ---------------------------------------------------------------------------
const capSpecs = [
  { code: "SRM-SUPPLIER-INFO-MGMT", name: "Supplier Information Management", module: "SRM-SUPPLIER-LIFECYCLE", desc: "Maintain the supplier master record, contacts, and documents as a single source of truth." },
  { code: "SRM-ONBOARDING", name: "Supplier Onboarding", module: "SRM-SUPPLIER-LIFECYCLE", desc: "Invite, register, collect documents from, and approve new suppliers." },
  { code: "SRM-QUALIFICATION", name: "Supplier Qualification", module: "SRM-SUPPLIER-LIFECYCLE", desc: "Vet and approve suppliers against category and compliance standards before activation." },
  { code: "SRM-SEGMENTATION", name: "Supplier Segmentation", module: "SRM-SUPPLIER-LIFECYCLE", desc: "Classify suppliers into tiers by spend, criticality, and category to drive engagement depth." },
  { code: "SRM-PERFORMANCE-MGMT", name: "Supplier Performance Management", module: "SRM-PERFORMANCE-MGMT", desc: "Score supplier delivery, quality, responsiveness, and savings into weighted scorecards." },
  { code: "SRM-CORRECTIVE-ACTION", name: "Supplier Corrective Action Management", module: "SRM-PERFORMANCE-MGMT", desc: "Open, assign, and track corrective actions for underperforming suppliers to closure." },
  { code: "SRM-RISK-ASSESSMENT", name: "Supplier Risk Assessment", module: "SRM-RISK-COMPLIANCE", desc: "Score supplier financial, operational, cyber, and ESG risk and escalate elevated scores." },
  { code: "SRM-COMPLIANCE-SCREENING", name: "Supplier Compliance Screening", module: "SRM-RISK-COMPLIANCE", desc: "Screen suppliers for sanctions and compliance and track certifications and insurance with expiry." },
];
const existingCaps = await get(
  `/capabilities?capability_code=in.(${capSpecs.map((c) => c.code).join(",")})&select=id,capability_code`,
);
const haveCap = new Map<string, number>(
  existingCaps.map((r: Row) => [String(r.capability_code), Number(r.id)]),
);
const capsToInsert = capSpecs
  .filter((c) => !haveCap.has(c.code))
  .map((c) => ({ capability_code: c.code, capability_name: c.name, description: c.desc }));
await insert("/capabilities", capsToInsert);
const allCaps = await get(
  `/capabilities?capability_code=in.(${capSpecs.map((c) => c.code).join(",")})&select=id,capability_code`,
);
const capId = new Map<string, number>(
  allCaps.map((r: Row) => [String(r.capability_code), Number(r.id)]),
);
log(`capabilities: +${capsToInsert.length} (total ${allCaps.length})`);

// capability_domains
const existingCapDom = await get(
  `/capability_domains?domain_id=eq.${DOMAIN_ID}&select=capability_id`,
);
const haveCapDom = new Set(existingCapDom.map((r: Row) => Number(r.capability_id)));
const capDomToInsert = capSpecs
  .filter((c) => !haveCapDom.has(capId.get(c.code)!))
  .map((c) => ({
    capability_id: capId.get(c.code)!,
    domain_id: DOMAIN_ID,
    capability_domain_label: `${c.name} / ${DOMAIN_NAME}`,
    notes: "",
  }));
await insert("/capability_domains", capDomToInsert);
log(`capability_domains: +${capDomToInsert.length}`);

// domain_module_capabilities
const existingDMC = await get(
  `/domain_module_capabilities?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,capability_id`,
);
const haveDMC = new Set(
  existingDMC.map((r: Row) => `${r.domain_module_id}.${r.capability_id}`),
);
const dmcToInsert = capSpecs
  .map((c) => ({ mid: moduleId.get(c.module)!, cid: capId.get(c.code)!, c }))
  .filter(({ mid, cid }) => !haveDMC.has(`${mid}.${cid}`))
  .map(({ mid, cid, c }) => ({
    domain_module_id: mid,
    capability_id: cid,
    domain_module_capability_label: `${c.module} / ${c.code}`,
    notes: "",
  }));
await insert("/domain_module_capabilities", dmcToInsert);
log(`domain_module_capabilities: +${dmcToInsert.length}`);

// ---------------------------------------------------------------------------
// 6. Repurpose the domain skill (id 109)
// ---------------------------------------------------------------------------
const skillDescription =
  "Onboard and qualify suppliers, maintain the supplier master record and its documents, score supplier performance against delivery and quality targets, and assess supplier risk and compliance including sanctions screening, certifications, and ESG. Open corrective actions and re-qualify suppliers when risk or performance slips.";
const skillTriggers =
  "supplier management, supplier relationship management, vendor management, supplier risk management, supplier onboarding, supplier qualification, supplier performance, supplier scorecards, supplier compliance, sanctions screening, KYC, ESG, supplier diversity, supplier information management, SIM";
const [skill] = await get(`/skills?domain_id=eq.${DOMAIN_ID}&skill_type=eq.domain&select=id,skill_name`);
if (!skill) throw new Error(`no domain skill found for domain ${DOMAIN_ID}`);
await call({
  method: "PATCH",
  path: `/skills?id=eq.${skill.id}`,
  body: { skill_name: "srm", description: skillDescription, trigger_keywords: skillTriggers },
});
log(`skill ${skill.id}: ${skill.skill_name} -> srm (description + trigger_keywords set)`);

// ---------------------------------------------------------------------------
// 7. Mutate tools (queries + cert mutates already exist; insert the missing mutates)
// ---------------------------------------------------------------------------
const toolSpecs = [
  { name: "create_supplier", op: "mutate", doid: 206, desc: "Create a supplier master record." },
  { name: "update_supplier", op: "mutate", doid: 206, desc: "Update a supplier master record." },
  { name: "create_supplier_onboarding", op: "mutate", doid: 207, desc: "Start a supplier onboarding workflow." },
  { name: "approve_supplier_onboarding", op: "mutate", doid: 207, desc: "Approve a supplier onboarding to activate the supplier." },
  { name: "create_supplier_qualification", op: "mutate", doid: 208, desc: "Open a supplier qualification record." },
  { name: "approve_supplier_qualification", op: "mutate", doid: 208, desc: "Approve a supplier qualification." },
  { name: "update_supplier_scorecard", op: "mutate", doid: 209, desc: "Update a supplier performance scorecard." },
  { name: "publish_supplier_scorecard", op: "mutate", doid: 209, desc: "Publish a supplier performance scorecard for the review period." },
  { name: "create_supplier_risk_assessment", op: "mutate", doid: 730, desc: "Create a supplier risk assessment." },
  { name: "approve_supplier_risk_assessment", op: "mutate", doid: 730, desc: "Approve a supplier risk assessment decision." },
];
const existingTools = await get(
  `/tools?tool_name=in.(${toolSpecs.map((t) => t.name).join(",")})&select=id,tool_name`,
);
const haveTool = new Map<string, number>(
  existingTools.map((r: Row) => [String(r.tool_name), Number(r.id)]),
);
const toolsToInsert = toolSpecs
  .filter((t) => !haveTool.has(t.name))
  .map((t) => ({
    tool_name: t.name,
    operation_kind: t.op,
    data_object_id: t.doid,
    description: t.desc,
    coverage_tier: "platform",
  }));
await insert("/tools", toolsToInsert);
log(`tools: +${toolsToInsert.length} mutate tools`);

// Build a full tool-name -> id map for everything we link (existing + new).
const linkToolNames = [
  "query_suppliers", "create_supplier", "update_supplier",
  "query_supplier_onboardings", "create_supplier_onboarding", "approve_supplier_onboarding",
  "query_supplier_qualifications", "create_supplier_qualification", "approve_supplier_qualification",
  "query_supplier_scorecards", "update_supplier_scorecard", "publish_supplier_scorecard",
  "query_supplier_risk_assessments", "create_supplier_risk_assessment", "approve_supplier_risk_assessment",
  "query_supplier_certifications", "create_supplier_certification", "update_supplier_certification",
  "notify_person", "notify_team",
];
const toolRows = await get(
  `/tools?tool_name=in.(${linkToolNames.join(",")})&select=id,tool_name`,
);
const toolId = new Map<string, number>(
  toolRows.map((r: Row) => [String(r.tool_name), Number(r.id)]),
);
for (const n of linkToolNames) if (!toolId.has(n)) throw new Error(`missing tool ${n} after insert`);

// ---------------------------------------------------------------------------
// 8. domain_module_tools
// ---------------------------------------------------------------------------
const dmtSpecs: { module: string; tool: string; req: "required" | "optional" }[] = [
  // SLM
  { module: "SRM-SUPPLIER-LIFECYCLE", tool: "query_suppliers", req: "required" },
  { module: "SRM-SUPPLIER-LIFECYCLE", tool: "create_supplier", req: "required" },
  { module: "SRM-SUPPLIER-LIFECYCLE", tool: "update_supplier", req: "optional" },
  { module: "SRM-SUPPLIER-LIFECYCLE", tool: "query_supplier_onboardings", req: "required" },
  { module: "SRM-SUPPLIER-LIFECYCLE", tool: "create_supplier_onboarding", req: "required" },
  { module: "SRM-SUPPLIER-LIFECYCLE", tool: "approve_supplier_onboarding", req: "required" },
  { module: "SRM-SUPPLIER-LIFECYCLE", tool: "query_supplier_qualifications", req: "required" },
  { module: "SRM-SUPPLIER-LIFECYCLE", tool: "create_supplier_qualification", req: "required" },
  { module: "SRM-SUPPLIER-LIFECYCLE", tool: "approve_supplier_qualification", req: "required" },
  { module: "SRM-SUPPLIER-LIFECYCLE", tool: "notify_person", req: "optional" },
  // SPM
  { module: "SRM-PERFORMANCE-MGMT", tool: "query_supplier_scorecards", req: "required" },
  { module: "SRM-PERFORMANCE-MGMT", tool: "update_supplier_scorecard", req: "required" },
  { module: "SRM-PERFORMANCE-MGMT", tool: "publish_supplier_scorecard", req: "required" },
  { module: "SRM-PERFORMANCE-MGMT", tool: "notify_person", req: "optional" },
  // SRC
  { module: "SRM-RISK-COMPLIANCE", tool: "query_supplier_risk_assessments", req: "required" },
  { module: "SRM-RISK-COMPLIANCE", tool: "create_supplier_risk_assessment", req: "required" },
  { module: "SRM-RISK-COMPLIANCE", tool: "approve_supplier_risk_assessment", req: "required" },
  { module: "SRM-RISK-COMPLIANCE", tool: "query_supplier_certifications", req: "required" },
  { module: "SRM-RISK-COMPLIANCE", tool: "create_supplier_certification", req: "required" },
  { module: "SRM-RISK-COMPLIANCE", tool: "update_supplier_certification", req: "optional" },
  { module: "SRM-RISK-COMPLIANCE", tool: "notify_person", req: "optional" },
  { module: "SRM-RISK-COMPLIANCE", tool: "notify_team", req: "optional" },
];
const existingDMT = await get(
  `/domain_module_tools?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,tool_id`,
);
const haveDMT = new Set(existingDMT.map((r: Row) => `${r.domain_module_id}.${r.tool_id}`));
const dmtToInsert = dmtSpecs
  .map((s) => ({ mid: moduleId.get(s.module)!, tid: toolId.get(s.tool)!, req: s.req }))
  .filter(({ mid, tid }) => !haveDMT.has(`${mid}.${tid}`))
  .map(({ mid, tid, req }) => ({
    domain_module_id: mid,
    tool_id: tid,
    requirement_level: req,
    notes: "",
  }));
await insert("/domain_module_tools", dmtToInsert);
log(`domain_module_tools: +${dmtToInsert.length} of ${dmtSpecs.length}`);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
log("\n=== SRM restructure summary ===");
const [d2] = await get(`/domains?id=eq.${DOMAIN_ID}&select=domain_code,domain_name,domain_kind`);
log(`domain: ${d2.domain_code} "${d2.domain_name}" (${d2.domain_kind})`);
const mods2 = await get(`/domain_modules?domain_id=eq.${DOMAIN_ID}&select=domain_module_code,module_kind&order=id.asc`);
log(`modules (${mods2.length}): ${mods2.map((m: Row) => m.domain_module_code).join(", ")}`);
const caps2 = await get(`/capability_domains?domain_id=eq.${DOMAIN_ID}&select=capabilities(capability_code)`);
log(`capabilities (${caps2.length}): ${caps2.map((c: any) => c.capabilities?.capability_code).join(", ")}`);
const dmtCount = await get(
  `/domain_module_tools?domain_module_id=in.(${modIds.join(",")})&select=tool_id`,
);
const distinctTools = new Set(dmtCount.map((r: Row) => Number(r.tool_id)));
log(`domain_module_tools rows: ${dmtCount.length}; distinct tools: ${distinctTools.size}`);
log("Done.");
