// SVCS-PROC (Services Procurement / SOW) new emerging_market domain build.
// Authorized by the user 2026-06-19: q1=a (own emerging_market domain), q2=a (two modules),
// q3=a (master the SOW cluster; consume suppliers/legal_contracts/rate_cards), q4=a (CWM embeds
// as needed, S2P consumes; CLM owns the contract, SRM owns the supplier), q5=a (Services
// Procurement / SVCS-PROC), q6=a (proposed metadata, $600M US TAM flagged as a triangulated
// placeholder to source before any released figure).
// Build spec: .tmp_deploy/SOW-design-2026-06-19.md. Phase 0: .tmp_deploy/SOW-phase0-2026-06-19.md.
// Idempotent: every step reads existing state first and inserts only what is missing.
//
// Scope:
//   1. Create SVCS-PROC domain (domain_kind='emerging_market', full Rule #8 metadata + Rule #20
//      buyer-voice catalog copy).
//   2. 2 full modules (buyer-voice catalog copy, Rule #20).
//   3. 8 new SOW masters (4 required + 4 optional) as data_objects + master DMDO rows. Every name
//      pre-checked M7-clean (zero existing master rows catalog-wide). necessity per Rule #16,
//      entity_type per Rule #12.
//   4. Consumed rows (role=consumer): suppliers (206, SRM), legal_contracts (66, CLM),
//      rate_cards (189, CWM). NEVER master for these.
//   5. 4 capabilities + capability_domains + domain_module_capabilities.
//   6. One domain skill (skill_type='domain', skill_name='svcs-proc') + tools + domain_module_tools
//      (>=1 query, >=1 mutate, >=1 workflow-gate per module). notify_person/notify_team default.
//   7. domain_aliases.
//
// NEVER touches record_status (Rule #1): all new rows default 'new'. No vendor names (Rule #18).
// All notes left EMPTY (Rule #15). No em-dashes. American English.

type Row = Record<string, unknown>;

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

const DOMAIN_CODE = "SVCS-PROC";
const DOMAIN_NAME = "Services Procurement";

// ---------------------------------------------------------------------------
// 1. Create SVCS-PROC domain (emerging_market, full Rule #8 metadata + Rule #20 catalog copy)
// ---------------------------------------------------------------------------
const catalogTagline =
  "Buy outsourced services under a statement of work, then track milestones to acceptance and payment.";
const catalogDescription =
  "Procure outsourced services from a firm under a statement of work, not headcount you manage day " +
  "to day. Author the SOW, take in proposals, and stand up the engagement, then break the work into " +
  "milestones and deliverables and track each one to acceptance. Settle on what was delivered with " +
  "milestone-based invoices, handle change orders when scope shifts, and keep a clear record of who " +
  "accepted what and when. The services firm stays your supplier and the SOW stays your contract; " +
  "this is where you run the engagement in between.";
const businessLogic =
  "Deliverable and milestone acceptance scoring, services-bid evaluation and supplier matching, and " +
  "change-order impact assessment sit beyond the declarable CRUD and state-workflow slice.";

const domainDescription =
  "Buyer-side procurement of outsourced services from a firm under a statement of work: author the " +
  "SOW, intake proposals, run the engagement, track milestones and deliverables, accept the work, " +
  "and settle milestone-based invoices. The unit is the engagement and its deliverables from a firm, " +
  "not an individual contractor as in contingent workforce. References the services firm as a " +
  "supplier mastered elsewhere, the SOW or master agreement as a contract document mastered in " +
  "contract lifecycle management, and rate cards where the work is rate-priced; masters the SOW " +
  "engagement cluster itself.";

// Rule #8 loader hard-fail (validate before any POST)
function validateDomainRow(d: {
  crud_percentage: number;
  business_logic: string;
  min_org_size: string;
  cost_band: string;
  usa_market_size_usd_m: number;
  market_size_source_year: number;
  catalog_tagline: string;
  catalog_description: string;
}): void {
  const bad =
    d.crud_percentage === 0 ||
    d.min_org_size === "" ||
    d.cost_band === "" ||
    (d.business_logic === "" && d.crud_percentage < 95) ||
    d.usa_market_size_usd_m === 0 ||
    d.market_size_source_year === 0 ||
    d.catalog_tagline === "" ||
    d.catalog_description === "";
  if (bad) throw new Error("Domain row fails Rule #8 / Rule #20 metadata guard. STOP.");
}

const domainRow = {
  domain_code: DOMAIN_CODE,
  domain_name: DOMAIN_NAME,
  description: domainDescription,
  domain_kind: "emerging_market",
  crud_percentage: 80,
  business_logic: businessLogic,
  min_org_size: "30 m <2500",
  cost_band: "$$",
  certification_required: false,
  usa_market_size_usd_m: 600,
  market_size_source_year: 2025,
  catalog_tagline: catalogTagline,
  catalog_description: catalogDescription,
};
validateDomainRow(domainRow);

let [domain] = await get(`/domains?domain_code=eq.${DOMAIN_CODE}&select=id,domain_code`);
if (!domain) {
  await insert("/domains", [domainRow]);
  log(`created domain ${DOMAIN_CODE}`);
} else {
  log(`domain ${DOMAIN_CODE} already exists (skip create)`);
}
[domain] = await get(`/domains?domain_code=eq.${DOMAIN_CODE}&select=id,domain_code`);
const DOMAIN_ID = Number(domain.id);
log(`SVCS-PROC domain_id = ${DOMAIN_ID}`);

// ---------------------------------------------------------------------------
// 2. Two full modules (buyer-voice catalog copy)
// ---------------------------------------------------------------------------
const moduleSpecs = [
  {
    domain_module_code: "SVCS-PROC-ENGAGEMENT",
    domain_module_name: "Services Sourcing and Engagement",
    description:
      "The pre-delivery surface: author the statement of work, take in services proposals, stand up " +
      "the engagement against the supplier and the contract, and amend scope through change orders. " +
      "Masters the SOW, the engagement, the proposal, and the change order; consumes the supplier, " +
      "the contract, and rate cards from their owning domains.",
    catalog_tagline:
      "Author the SOW, take in proposals, and stand up the engagement before the work begins.",
    catalog_description:
      "Turn an awarded services deal into a working engagement. Author the statement of work that " +
      "scopes what the firm will deliver, take in the proposals or bids attached to it, and stand " +
      "up the engagement against the supplier and the signed contract. When the work shifts, raise " +
      "a change order and keep the SOW current instead of letting scope drift. The services firm " +
      "stays your supplier and the SOW stays your contract; this module is where you shape the " +
      "engagement they hang off of.",
  },
  {
    domain_module_code: "SVCS-PROC-SETTLEMENT",
    domain_module_name: "Milestone Delivery and Settlement",
    description:
      "The delivery and settlement surface: break the engagement into milestones and deliverables, " +
      "track each to acceptance, and settle on what was delivered through milestone-based invoices. " +
      "Masters the milestone, the deliverable, the milestone invoice, and the acceptance record.",
    catalog_tagline:
      "Track milestones and deliverables to acceptance, then pay on what was actually delivered.",
    catalog_description:
      "Run the delivery half of a services engagement. Break the statement of work into milestones " +
      "and the deliverables that close them, then track each one to formal acceptance so payment " +
      "follows delivered outcomes, not elapsed time. Raise milestone-based invoices against " +
      "accepted work and keep a clear, auditable record of who accepted what and when. Outcome-based " +
      "settlement that ties every payment back to a milestone the buyer signed off.",
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
const allModules = await get(`/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`);
const moduleId = new Map<string, number>(
  allModules.map((r: Row) => [String(r.domain_module_code), Number(r.id)]),
);
const modIds = allModules.map((r: Row) => Number(r.id));
log(`modules: +${modulesToInsert.length} (total ${allModules.length})`);
for (const m of moduleSpecs) if (!moduleId.has(m.domain_module_code)) throw new Error(`module ${m.domain_module_code} missing after insert`);

// ---------------------------------------------------------------------------
// 3. 8 new SOW masters (data_objects + master DMDO rows)
// ---------------------------------------------------------------------------
// entity_type per Rule #12; necessity per Rule #16 (4 required case-D, 4 optional case-C).
// All names pre-checked M7-clean catalog-wide (zero existing rows + zero existing masters). notes EMPTY.
type NewMaster = {
  name: string;
  singular: string;
  plural: string;
  module: string;
  necessity: "required" | "optional";
  entity_type: "operational_workflow" | "operational_record" | "catalog" | "junction" | "computed";
  desc: string;
  flags?: Partial<{ has_single_approver: boolean; has_submit_lock: boolean; has_personal_content: boolean }>;
};
const newMasters: NewMaster[] = [
  // --- Module 1: SVCS-PROC-ENGAGEMENT ---
  { name: "statements_of_work", singular: "Statement of Work", plural: "Statements of Work", module: "SVCS-PROC-ENGAGEMENT", necessity: "required", entity_type: "operational_workflow",
    desc: "The buyer-side statement of work that scopes outsourced services a firm will deliver: the deliverables, the schedule, the price basis, and the acceptance terms. The headline document the whole engagement hangs off, distinct from the underlying contract that governs it." },
  { name: "services_engagements", singular: "Services Engagement", plural: "Services Engagements", module: "SVCS-PROC-ENGAGEMENT", necessity: "required", entity_type: "operational_workflow",
    desc: "The active firm-level engagement that executes a statement of work: the spine milestones, deliverables, and invoices bind to, carrying the supplier, the contract reference, and the engagement-scoped scorecard. One supplier can hold several distinct engagements." },
  { name: "services_proposals", singular: "Services Proposal", plural: "Services Proposals", module: "SVCS-PROC-ENGAGEMENT", necessity: "optional", entity_type: "operational_workflow",
    desc: "Bids and proposals a firm submits against a specific statement of work, capturing the proposed scope, approach, and price for evaluation. Optional because some buyers run a SOW off a pre-awarded master agreement without a bid round." },
  { name: "sow_change_orders", singular: "SOW Change Order", plural: "SOW Change Orders", module: "SVCS-PROC-ENGAGEMENT", necessity: "optional", entity_type: "operational_workflow",
    desc: "Amendments to an active statement of work that revise scope, schedule, deliverables, or price, tracked through approval so the SOW stays current. Optional because not every engagement amends.", flags: { has_single_approver: true } },
  // --- Module 2: SVCS-PROC-SETTLEMENT ---
  { name: "sow_milestones", singular: "SOW Milestone", plural: "SOW Milestones", module: "SVCS-PROC-SETTLEMENT", necessity: "required", entity_type: "operational_workflow",
    desc: "Schedule-and-payment checkpoints that break a services engagement into accountable stages, each tied to deliverables and to the milestone invoice it releases. The settlement mechanic that makes outcome-based services payment work." },
  { name: "service_deliverables", singular: "Service Deliverable", plural: "Service Deliverables", module: "SVCS-PROC-SETTLEMENT", necessity: "optional", entity_type: "operational_workflow",
    desc: "Concrete work products a firm produces under a statement of work, tracked from submission to acceptance against the milestone they close. Optional because some buyers settle on the milestone alone and inline deliverables as attributes." },
  { name: "milestone_invoices", singular: "Milestone Invoice", plural: "Milestone Invoices", module: "SVCS-PROC-SETTLEMENT", necessity: "required", entity_type: "operational_workflow",
    desc: "Invoices a firm raises against an accepted milestone of a services engagement, so payment follows delivered outcomes rather than elapsed time. The settlement record for outcome-based services work, distinct from time-and-materials contingent invoices." },
  { name: "service_acceptances", singular: "Service Acceptance", plural: "Service Acceptances", module: "SVCS-PROC-SETTLEMENT", necessity: "optional", entity_type: "operational_record",
    desc: "Formal sign-off records capturing that the buyer accepted a deliverable or milestone, who accepted it, and when, gating the milestone invoice. Optional because some buyers accept implicitly on invoice rather than recording a typed acceptance.", flags: { has_single_approver: true } },
];

// 3a. Insert data_objects (idempotent on name)
const masterNames = newMasters.map((o) => o.name);
const existingMasterObjs = await get(
  `/data_objects?data_object_name=in.(${masterNames.join(",")})&select=id,data_object_name`,
);
const haveMasterObj = new Map<string, number>(
  existingMasterObjs.map((r: Row) => [String(r.data_object_name), Number(r.id)]),
);
const masterObjsToInsert = newMasters
  .filter((o) => !haveMasterObj.has(o.name))
  .map((o) => ({
    data_object_name: o.name,
    singular_label: o.singular,
    plural_label: o.plural,
    description: o.desc,
    entity_type: o.entity_type,
    kind: "domain_owned",
    has_personal_content: o.flags?.has_personal_content ?? false,
    has_submit_lock: o.flags?.has_submit_lock ?? false,
    has_single_approver: o.flags?.has_single_approver ?? false,
  }));
await insert("/data_objects", masterObjsToInsert);
log(`master data_objects: +${masterObjsToInsert.length} of ${newMasters.length}`);

const allMasterRows = await get(
  `/data_objects?data_object_name=in.(${masterNames.join(",")})&select=id,data_object_name`,
);
const objId = new Map<string, number>(
  allMasterRows.map((r: Row) => [String(r.data_object_name), Number(r.id)]),
);
for (const n of masterNames) if (!objId.has(n)) throw new Error(`data_object ${n} missing after insert`);

// 3b. M7 GUARD: before inserting any master DMDO row, confirm zero existing master rows for it
// anywhere outside SVCS-PROC. A foreign master means the entity must be CONSUMED, not mastered.
log("\n--- M7 pre-insert guard (each SVCS-PROC master must have ZERO foreign master rows) ---");
for (const o of newMasters) {
  const did = objId.get(o.name)!;
  const existingMasters = await get(
    `/domain_module_data_objects?data_object_id=eq.${did}&role=eq.master&select=id,domain_module_id`,
  );
  const foreign = existingMasters.filter((r: Row) => !modIds.includes(Number(r.domain_module_id)));
  if (foreign.length > 0) {
    throw new Error(
      `M7 FAIL: ${o.name} (do ${did}) already has a master row outside SVCS-PROC: ${JSON.stringify(foreign)}. STOP. This entity must be CONSUMED, not mastered.`,
    );
  }
}
log("M7 guard passed: all 8 SVCS-PROC master names are master-free catalog-wide.");

// 3c. Insert master DMDO rows (idempotent on (module, data_object))
const existingDMDO = await get(
  `/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,data_object_id,role`,
);
const haveDMDO = new Set(existingDMDO.map((r: Row) => `${r.domain_module_id}.${r.data_object_id}`));
const masterRows = newMasters
  .map((o) => ({ o, mid: moduleId.get(o.module)!, did: objId.get(o.name)! }))
  .filter(({ mid, did }) => !haveDMDO.has(`${mid}.${did}`))
  .map(({ o, mid, did }) => ({
    domain_module_id: mid,
    data_object_id: did,
    role: "master",
    necessity: o.necessity,
    domain_module_data_object_label: `${o.module} / ${o.name}`,
    notes: "",
  }));
await insert("/domain_module_data_objects", masterRows);
log(`master DMDO rows: +${masterRows.length} of ${newMasters.length}`);

// ---------------------------------------------------------------------------
// 4. Consumed rows (role=consumer). NEVER master for these.
//    suppliers (206, SRM), legal_contracts (66, CLM), rate_cards (189, CWM).
// ---------------------------------------------------------------------------
const consumeSpecs: { name: string; module: string }[] = [
  { name: "suppliers", module: "SVCS-PROC-ENGAGEMENT" },        // SRM master (206); the services firm
  { name: "legal_contracts", module: "SVCS-PROC-ENGAGEMENT" },  // CLM master (66); the SOW/MSA document
  { name: "rate_cards", module: "SVCS-PROC-ENGAGEMENT" },       // CWM master (189); rate-priced SOW work
];
const consumeNames = [...new Set(consumeSpecs.map((c) => c.name))];
const consumeObjRows = await get(
  `/data_objects?data_object_name=in.(${consumeNames.join(",")})&select=id,data_object_name`,
);
const consumeId = new Map<string, number>(
  consumeObjRows.map((r: Row) => [String(r.data_object_name), Number(r.id)]),
);
const missingConsume = consumeNames.filter((n) => !consumeId.has(n));
if (missingConsume.length) throw new Error(`consume targets absent from catalog: ${missingConsume.join(", ")}. STOP.`);

// M7 guard for consumed rows: confirm each consumed entity has a master ELSEWHERE (never here),
// and that SVCS-PROC does not also master it.
log("\n--- consumed-row guard (each consumed entity is mastered elsewhere, never by SVCS-PROC) ---");
const svcsMasterIds = new Set(newMasters.map((o) => objId.get(o.name)!));
for (const n of consumeNames) {
  const did = consumeId.get(n)!;
  if (svcsMasterIds.has(did)) throw new Error(`coherence FAIL: SVCS-PROC must not master ${n} (${did}); it is consumed.`);
  const masters = await get(`/domain_module_data_objects?data_object_id=eq.${did}&role=eq.master&select=domain_module_id`);
  const foreign = masters.filter((r: Row) => !modIds.includes(Number(r.domain_module_id)));
  if (foreign.length !== 1) {
    log(`WARN: ${n} (${did}) has ${foreign.length} foreign master rows (expected 1): ${JSON.stringify(foreign)}`);
  }
}

const existingDMDO2 = await get(
  `/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,data_object_id`,
);
const haveDMDO2 = new Set(existingDMDO2.map((r: Row) => `${r.domain_module_id}.${r.data_object_id}`));
const consumeRows = consumeSpecs
  .map((c) => ({ c, mid: moduleId.get(c.module)!, did: consumeId.get(c.name)! }))
  .filter(({ mid, did }) => !haveDMDO2.has(`${mid}.${did}`))
  .map(({ c, mid, did }) => ({
    domain_module_id: mid,
    data_object_id: did,
    role: "consumer",
    necessity: "optional",
    domain_module_data_object_label: `${c.module} / ${c.name}`,
    notes: "",
  }));
await insert("/domain_module_data_objects", consumeRows);
log(`consumer DMDO rows: +${consumeRows.length}`);

// ---------------------------------------------------------------------------
// 5. Capabilities + capability_domains + domain_module_capabilities
// ---------------------------------------------------------------------------
const capSpecs = [
  { code: "SVCS-PROC-SOURCING", name: "Services sourcing and bidding", module: "SVCS-PROC-ENGAGEMENT", desc: "Take in proposals and bids against a statement of work and evaluate them to award an engagement." },
  { code: "SVCS-PROC-SOW-AUTHORING", name: "SOW authoring and engagement execution", module: "SVCS-PROC-ENGAGEMENT", desc: "Author the statement of work, stand up the engagement against the supplier and contract, and amend scope through change orders." },
  { code: "SVCS-PROC-MILESTONE-SETTLEMENT", name: "Milestone and deliverable settlement", module: "SVCS-PROC-SETTLEMENT", desc: "Track milestones and deliverables to acceptance and settle on delivered outcomes through milestone-based invoices." },
  { code: "SVCS-PROC-SUPPLIER-PERFORMANCE", name: "Services supplier performance", module: "SVCS-PROC-SETTLEMENT", desc: "Capture engagement-scoped supplier scorecard data from delivery and acceptance to inform future awards." },
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
const capId = new Map<string, number>(allCaps.map((r: Row) => [String(r.capability_code), Number(r.id)]));
log(`capabilities: +${capsToInsert.length} (total ${allCaps.length})`);

const existingCapDom = await get(`/capability_domains?domain_id=eq.${DOMAIN_ID}&select=capability_id`);
const haveCapDom = new Set(existingCapDom.map((r: Row) => Number(r.capability_id)));
const capDomToInsert = capSpecs
  .filter((c) => !haveCapDom.has(capId.get(c.code)!))
  .map((c) => ({ capability_id: capId.get(c.code)!, domain_id: DOMAIN_ID, capability_domain_label: `${c.name} / ${DOMAIN_NAME}`, notes: "" }));
await insert("/capability_domains", capDomToInsert);
log(`capability_domains: +${capDomToInsert.length}`);

const existingDMC = await get(
  `/domain_module_capabilities?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,capability_id`,
);
const haveDMC = new Set(existingDMC.map((r: Row) => `${r.domain_module_id}.${r.capability_id}`));
const dmcToInsert = capSpecs
  .map((c) => ({ mid: moduleId.get(c.module)!, cid: capId.get(c.code)!, c }))
  .filter(({ mid, cid }) => !haveDMC.has(`${mid}.${cid}`))
  .map(({ mid, cid, c }) => ({ domain_module_id: mid, capability_id: cid, domain_module_capability_label: `${c.module} / ${c.code}`, notes: "" }));
await insert("/domain_module_capabilities", dmcToInsert);
log(`domain_module_capabilities: +${dmcToInsert.length}`);

// ---------------------------------------------------------------------------
// 6. Domain skill + tools + domain_module_tools
// ---------------------------------------------------------------------------
const skillDescription =
  "Procure outsourced services under a statement of work end to end. Author the SOW that scopes what " +
  "a firm will deliver, take in services proposals and bids, and stand up the engagement against the " +
  "supplier and the contract. Amend scope through change orders, then break the work into milestones " +
  "and deliverables and track each to formal acceptance. Settle on delivered outcomes with " +
  "milestone-based invoices, and keep a record of who accepted what and when. The services firm stays " +
  "the supplier and the SOW stays the contract; this runs the engagement in between.";
const skillTriggers =
  "statement of work, SOW, SOW management, services procurement, services engagement, deliverable, " +
  "milestone, milestone invoice, milestone-based billing, outcome-based services, services proposal, " +
  "services bid, change order, service acceptance, outsourced services, professional services procurement";

let [svcsSkill] = await get(`/skills?domain_id=eq.${DOMAIN_ID}&skill_type=eq.domain&select=id,skill_name`);
if (!svcsSkill) {
  await insert("/skills", [
    { skill_name: "svcs-proc", skill_type: "domain", domain_id: DOMAIN_ID, description: skillDescription, trigger_keywords: skillTriggers },
  ]);
  [svcsSkill] = await get(`/skills?domain_id=eq.${DOMAIN_ID}&skill_type=eq.domain&select=id,skill_name`);
  log(`created SVCS-PROC domain skill id ${svcsSkill.id}`);
} else {
  await call({
    method: "PATCH",
    path: `/skills?id=eq.${svcsSkill.id}`,
    body: { skill_name: "svcs-proc", description: skillDescription, trigger_keywords: skillTriggers },
  });
  log(`SVCS-PROC domain skill already exists (id ${svcsSkill.id}); refreshed description + triggers`);
}

// Tools: one query + create + workflow-gate mutate per module, anchored on a real master.
type ToolSpec = { name: string; op: "query" | "mutate"; obj: string; desc: string };
const toolSpecs: ToolSpec[] = [
  // ENGAGEMENT
  { name: "query_statements_of_work", op: "query", obj: "statements_of_work", desc: "Query statements of work and their scope, schedule, and status." },
  { name: "author_statement_of_work", op: "mutate", obj: "statements_of_work", desc: "Author a statement of work that scopes the services a firm will deliver." },
  { name: "activate_services_engagement", op: "mutate", obj: "services_engagements", desc: "Stand up a services engagement against the supplier and contract once the SOW is finalized (workflow gate)." },
  { name: "query_services_engagements", op: "query", obj: "services_engagements", desc: "Query active services engagements and the supplier and contract each binds to." },
  { name: "approve_sow_change_order", op: "mutate", obj: "sow_change_orders", desc: "Approve a change order that revises an active statement of work (workflow gate)." },
  // SETTLEMENT
  { name: "query_sow_milestones", op: "query", obj: "sow_milestones", desc: "Query the milestones of a services engagement and their delivery status." },
  { name: "accept_service_deliverable", op: "mutate", obj: "service_deliverables", desc: "Record acceptance of a service deliverable against the milestone it closes (workflow gate)." },
  { name: "query_milestone_invoices", op: "query", obj: "milestone_invoices", desc: "Query milestone invoices raised against accepted milestones." },
  { name: "approve_milestone_invoice", op: "mutate", obj: "milestone_invoices", desc: "Approve a milestone invoice for payment once the milestone is accepted (workflow gate)." },
];
const existingToolRows = await get(
  `/tools?tool_name=in.(${toolSpecs.map((t) => t.name).join(",")})&select=id,tool_name`,
);
const haveTool = new Map<string, number>(existingToolRows.map((r: Row) => [String(r.tool_name), Number(r.id)]));
const toolsToInsert = toolSpecs
  .filter((t) => !haveTool.has(t.name))
  .map((t) => ({ tool_name: t.name, operation_kind: t.op, data_object_id: objId.get(t.obj)!, description: t.desc, coverage_tier: "platform" }));
await insert("/tools", toolsToInsert);
log(`tools: +${toolsToInsert.length} of ${toolSpecs.length}`);

const linkToolNames = [...toolSpecs.map((t) => t.name), "notify_person", "notify_team"];
const toolRows = await get(`/tools?tool_name=in.(${linkToolNames.join(",")})&select=id,tool_name`);
const toolId = new Map<string, number>(toolRows.map((r: Row) => [String(r.tool_name), Number(r.id)]));
for (const n of linkToolNames) if (!toolId.has(n)) throw new Error(`missing tool ${n} after insert`);

const dmtSpecs: { module: string; tool: string; req: "required" | "optional" }[] = [
  // ENGAGEMENT: query + mutate + workflow-gate + notify
  { module: "SVCS-PROC-ENGAGEMENT", tool: "query_statements_of_work", req: "required" },
  { module: "SVCS-PROC-ENGAGEMENT", tool: "query_services_engagements", req: "required" },
  { module: "SVCS-PROC-ENGAGEMENT", tool: "author_statement_of_work", req: "required" },
  { module: "SVCS-PROC-ENGAGEMENT", tool: "activate_services_engagement", req: "required" }, // workflow gate
  { module: "SVCS-PROC-ENGAGEMENT", tool: "approve_sow_change_order", req: "optional" }, // workflow gate
  { module: "SVCS-PROC-ENGAGEMENT", tool: "notify_person", req: "optional" },
  // SETTLEMENT: query + mutate + workflow-gate + notify
  { module: "SVCS-PROC-SETTLEMENT", tool: "query_sow_milestones", req: "required" },
  { module: "SVCS-PROC-SETTLEMENT", tool: "query_milestone_invoices", req: "required" },
  { module: "SVCS-PROC-SETTLEMENT", tool: "accept_service_deliverable", req: "required" }, // workflow gate
  { module: "SVCS-PROC-SETTLEMENT", tool: "approve_milestone_invoice", req: "required" }, // workflow gate
  { module: "SVCS-PROC-SETTLEMENT", tool: "notify_team", req: "optional" },
];
const existingDMT = await get(
  `/domain_module_tools?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,tool_id`,
);
const haveDMT = new Set(existingDMT.map((r: Row) => `${r.domain_module_id}.${r.tool_id}`));
const dmtToInsert = dmtSpecs
  .map((s) => ({ mid: moduleId.get(s.module)!, tid: toolId.get(s.tool)!, req: s.req }))
  .filter(({ mid, tid }) => !haveDMT.has(`${mid}.${tid}`))
  .map(({ mid, tid, req }) => ({ domain_module_id: mid, tool_id: tid, requirement_level: req, notes: "" }));
await insert("/domain_module_tools", dmtToInsert);
log(`domain_module_tools: +${dmtToInsert.length} of ${dmtSpecs.length}`);

// ---------------------------------------------------------------------------
// 7. domain_aliases
// ---------------------------------------------------------------------------
const aliasTexts = ["services procurement", "SOW management", "statement of work", "SOW"];
const existingAliases = await get(`/domain_aliases?domain_id=eq.${DOMAIN_ID}&select=alias`);
const haveAlias = new Set(existingAliases.map((r: Row) => String(r.alias).toLowerCase()));
const newAliases = aliasTexts
  .filter((a) => !haveAlias.has(a.toLowerCase()))
  .map((a) => ({ domain_id: DOMAIN_ID, alias: a, label: a, alias_type: "synonym" }));
await insert("/domain_aliases", newAliases);
log(`domain_aliases: +${newAliases.length} (had ${existingAliases.length})`);

// ---------------------------------------------------------------------------
// Summary + live verification
// ---------------------------------------------------------------------------
log("\n=== SVCS-PROC build summary ===");
const [d2] = await get(`/domains?id=eq.${DOMAIN_ID}&select=domain_code,domain_name,domain_kind,crud_percentage,min_org_size,cost_band,certification_required,usa_market_size_usd_m,market_size_source_year`);
log(`domain: ${d2.domain_code} "${d2.domain_name}" (${d2.domain_kind}) crud=${d2.crud_percentage} org=${d2.min_org_size} band=${d2.cost_band} cert=${d2.certification_required} TAM=$${d2.usa_market_size_usd_m}m/${d2.market_size_source_year} | id ${DOMAIN_ID}`);
let total = 0;
for (const m of allModules) {
  const masters = await get(
    `/domain_module_data_objects?domain_module_id=eq.${m.id}&role=eq.master&select=id`,
  );
  total += masters.length;
  log(`  ${m.domain_module_code}: ${masters.length} masters`);
}
log(`Total SVCS-PROC master rows: ${total} (expect 8)`);

// M7 final verification: each new master has exactly one master row and it is SVCS-PROC; each
// consumed entity still has exactly one master and it is NOT a SVCS-PROC module.
log("\n--- M7 final verification (new masters) ---");
let m7ok = true;
for (const o of newMasters) {
  const did = objId.get(o.name)!;
  const masters = await get(`/domain_module_data_objects?data_object_id=eq.${did}&role=eq.master&select=domain_module_id`);
  const svcs = masters.filter((r: Row) => modIds.includes(Number(r.domain_module_id)));
  const ok = masters.length === 1 && svcs.length === 1;
  if (!ok) m7ok = false;
  log(`${o.name}: masters=${masters.length} (svcs-proc=${svcs.length}) ${ok ? "OK" : "FAIL"}`);
}
log("\n--- M7 final verification (consumed entities, must stay single-master, NOT SVCS-PROC) ---");
for (const [name, did] of [["suppliers", 206], ["legal_contracts", 66], ["rate_cards", 189]] as [string, number][]) {
  const masters = await get(`/domain_module_data_objects?data_object_id=eq.${did}&role=eq.master&select=domain_module_id,domain_modules(domain_module_code)`);
  const svcs = masters.filter((r: Row) => modIds.includes(Number(r.domain_module_id)));
  const ok = masters.length === 1 && svcs.length === 0;
  if (!ok) m7ok = false;
  const owner = masters.map((r: any) => r.domain_modules?.domain_module_code).join(",");
  log(`${name} (${did}): masters=${masters.length} owner=${owner} svcs-proc=${svcs.length} ${ok ? "OK" : "FAIL"}`);
}
if (!m7ok) throw new Error("M7 verification FAILED. STOP and investigate.");
log("M7 holds: all 8 new masters single-mastered by SVCS-PROC; all 3 consumed entities single-mastered elsewhere.");

// unclassified-master check
const unclassified = await get(
  `/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&role=eq.master&select=data_objects(data_object_name,entity_type)`,
);
const bad = unclassified.filter((r: any) => !r.data_objects?.entity_type || r.data_objects.entity_type === "unclassified");
log(`unclassified masters: ${bad.length} (expect 0)${bad.length ? " -> " + JSON.stringify(bad) : ""}`);

const caps2 = await get(`/capability_domains?domain_id=eq.${DOMAIN_ID}&select=capability_id`);
log(`capability_domains: ${caps2.length} (expect 4)`);
const [skillCheck] = await get(`/skills?domain_id=eq.${DOMAIN_ID}&skill_type=eq.domain&select=id,skill_name,description,trigger_keywords`);
log(`skill: ${skillCheck?.skill_name} desc_len=${(skillCheck?.description ?? "").length} triggers_len=${(skillCheck?.trigger_keywords ?? "").length}`);
log(`UI: https://adenin.semantius.app/domain_map/domains`);
log("Done.");
