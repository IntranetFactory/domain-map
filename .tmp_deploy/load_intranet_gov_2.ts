#!/usr/bin/env bun
// INTRANET-GOV pass 2: Phase B detail (relationships, aliases, lifecycle, trigger_events,
// handoffs) + Phase S (skill + tools + domain_module_tools) + Phase E (personas + reach + RACI).
// Idempotent; resolves all ids live. record_status omitted -> 'new'.

type Row = Record<string, unknown>;
async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body)); await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if (await proc.exited !== 0) throw new Error(`semantius failed: ${stderr}`);
  const t = stdout.trim(); return t ? JSON.parse(t) : [];
}
const get = (p: string) => call({ method: "GET", path: p });
function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>(); for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map(r => { const o: Row = {}; for (const k of keys) o[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null; return o; });
}
async function insert(path: string, rows: Row[]) {
  if (!rows.length) return; const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) await call({ method: "POST", path, body: uniformize(rows.slice(i, i + CHUNK)) });
}
async function syncTable(path: string, rows: Row[], key: string): Promise<Map<string, number>> {
  const ex = await get(`${path}?select=id,${key}&limit=20000`);
  const have = new Set(ex.map(r => String(r[key])));
  const miss = rows.filter(r => !have.has(String(r[key])));
  if (miss.length) { console.log(`  +${miss.length} into ${path} (${ex.length} existed)`); await insert(path, miss); } else console.log(`  ${path}: all ${ex.length} present`);
  const all = await get(`${path}?select=id,${key}&limit=20000`);
  const m = new Map<string, number>(); for (const r of all) m.set(String(r[key]), Number(r.id)); return m;
}
async function syncJunction(path: string, rows: Row[], sel: string, keyOf: (r: Row) => string) {
  const ex = await get(`${path}?select=${sel}&limit=40000`);
  const have = new Set(ex.map(keyOf));
  const miss = rows.filter(r => !have.has(keyOf(r)));
  if (miss.length) { console.log(`  +${miss.length} into ${path} (${ex.length} existed)`); await insert(path, miss); } else console.log(`  ${path}: all ${ex.length} present`);
}

// ---- resolve ids ----
const DID = Number((await get("/domains?domain_code=eq.INTRANET-GOV&select=id"))[0].id);
const mods = await get("/domain_modules?domain_id=eq." + DID + "&select=id,domain_module_code");
const MOD_INV = Number(mods.find(m => m.domain_module_code === "INTGOV-INVENTORY")!.id);
const MOD_GOV = Number(mods.find(m => m.domain_module_code === "INTGOV-GOVERNANCE")!.id);
const names = ["connected_intranets", "intranet_content_inventory_records", "intranet_content_types", "intranet_content_health_scores", "intranet_content_ownership_assignments", "intranet_content_attestations", "work_items", "users"];
const doRows = await get(`/data_objects?data_object_name=in.(${names.join(",")})&select=id,data_object_name`);
const D = new Map(doRows.map(r => [String(r.data_object_name), Number(r.id)]));
const CI = D.get("connected_intranets")!, IR = D.get("intranet_content_inventory_records")!, CT = D.get("intranet_content_types")!, HS = D.get("intranet_content_health_scores")!, OA = D.get("intranet_content_ownership_assignments")!, AT = D.get("intranet_content_attestations")!, WI = D.get("work_items")!, U = D.get("users")!;
// WORK-MGMT module that masters work_items (for handoff target)
const wmMaster = await get(`/domain_module_data_objects?data_object_id=eq.${WI}&role=eq.master&select=domain_module_id`);
const WM_MOD = wmMaster.length ? Number(wmMaster[0].domain_module_id) : null;
const WM_DOMAIN = 135;
const itOps = await get('/business_functions?business_function_name=eq.IT Operations&select=id'.replace(" ", "%20").replace(" ", "%20"));
const IT_FN = itOps.length ? Number(itOps[0].id) : null;

// ============================================================
console.log("== Phase B: data_object_relationships ==");
const rel = (a: number, b: number, type: string, kind: string, verb: string, inv: string, req: boolean, owner: string): Row =>
  ({ data_object_id: a, related_data_object_id: b, relationship_type: type, relationship_kind: kind, relationship_verb: verb, inverse_verb: inv, is_required: req, owner_side: owner });
const rels: Row[] = [
  rel(CI, IR, "one_to_many", "composition", "contains", "is contained in", true, "source"),
  rel(CT, IR, "one_to_many", "reference", "classifies", "is classified as", true, "source"),
  rel(IR, OA, "one_to_many", "composition", "is governed by", "governs", false, "source"),
  rel(IR, AT, "one_to_many", "composition", "is attested by", "attests", false, "source"),
  rel(IR, HS, "one_to_one", "composition", "is scored by", "scores", false, "source"),
  rel(IR, WI, "one_to_many", "reference", "spawns improvement", "improves", false, "source"),
  rel(U, OA, "one_to_many", "reference", "is accountable owner on", "names owner", true, "source"),
  rel(U, AT, "one_to_many", "reference", "attests", "is attested by", true, "source"),
];
await syncJunction("/data_object_relationships", rels, "data_object_id,related_data_object_id,relationship_verb", r => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`);

console.log("== Phase B: data_object_aliases ==");
const alias = (id: number, name: string): Row => ({ data_object_id: id, alias_name: name, alias_type: "synonym", is_preferred: false });
const aliases: Row[] = [
  alias(CI, "governed source"), alias(CI, "content source"),
  alias(IR, "content inventory"), alias(IR, "content register"),
  alias(AT, "content recertification"), alias(AT, "content review"),
  alias(OA, "content stewardship"),
];
await syncJunction("/data_object_aliases", aliases, "data_object_id,alias_name", r => `${r.data_object_id}|${r.alias_name}`);

console.log("== Phase B: lifecycle states for intranet_content_attestations ==");
const ls = (name: string, order: number, init: boolean, term: boolean, perm: boolean, verb: string): Row =>
  ({ data_object_id: AT, state_name: name, state_order: order, is_initial: init, is_terminal: term, requires_permission: perm, permission_verb_override: verb, domain_module_id: perm ? MOD_GOV : null });
const states: Row[] = [
  ls("pending", 1, true, false, false, ""),
  ls("attested_current", 2, false, false, true, "attest"),
  ls("flagged_stale", 3, false, false, true, "flag_stale"),
  ls("remediated", 4, false, false, false, ""),
  ls("archived", 5, false, true, true, "archive"),
];
await syncJunction("/data_object_lifecycle_states", states, "data_object_id,state_name", r => `${r.data_object_id}|${r.state_name}`);

console.log("== Phase B: trigger_events ==");
const ev = (name: string, doid: number, from: string, to: string, cat: string, desc: string): Row =>
  ({ event_name: name, data_object_id: doid, from_state: from, to_state: to, event_category: cat, description: desc });
const events: Row[] = [
  ev("intranet_content_inventory_record.registered", IR, "", "registered", "lifecycle", "A new piece of intranet content has been discovered or registered into the inventory and now needs an accountable owner."),
  ev("intranet_content_attestation.attested", AT, "pending", "attested_current", "lifecycle", "An owner has recertified that a piece of content is current."),
  ev("intranet_content_attestation.flagged_stale", AT, "pending", "flagged_stale", "state_change", "An owner (or the cadence elapsing) has flagged content as stale, requiring remediation or archival; spawns an improvement work item."),
];
const evMap = await syncTable("/trigger_events", events, "event_name");

console.log("== Phase B: handoffs ==");
const hf = (src: number, tgt: number, srcMod: number | null, tgtMod: number | null, payload: number, evName: string, pat: string, fric: string, desc: string): Row =>
  ({ source_domain_id: src, target_domain_id: tgt, source_domain_module_id: srcMod, target_domain_module_id: tgtMod, data_object_id: payload, trigger_event_id: evMap.get(evName)!, integration_pattern: pat, friction_level: fric, description: desc });
const handoffs: Row[] = [
  // intra-domain: inventory registered (Module A) -> ownership assignment due (Module B)
  hf(DID, DID, MOD_INV, MOD_GOV, OA, "intranet_content_inventory_record.registered", "lifecycle_progression", "low", "When content is registered in the inventory, the governance module opens an ownership assignment so the item gets an accountable owner."),
  // cross-domain: content flagged stale -> create improvement work item in WORK-MGMT
  hf(DID, WM_DOMAIN, MOD_GOV, WM_MOD, WI, "intranet_content_attestation.flagged_stale", "api_call", "medium", "When content is flagged stale during recertification, an improvement work item is created in Work Management for remediation."),
];
await syncJunction("/handoffs", handoffs, "source_domain_id,target_domain_id,data_object_id,trigger_event_id", r => `${r.source_domain_id}|${r.target_domain_id}|${r.data_object_id}|${r.trigger_event_id}`);

// ============================================================
console.log("== Phase S: system skill ==");
await syncTable("/skills", [
  { skill_name: "intranet-gov-system", skill_type: "system", domain_id: DID, domain_module_id: null, description: "Agent surface for Intranet Governance: connects and crawls existing intranets, builds and queries the content inventory, assigns and tracks accountable owners, runs recertification attestations, and turns stale content into an improvement backlog. Derives its toolset from the domain's modules." },
], "skill_name");

console.log("== Phase S: tools ==");
const tool = (name: string, op: string, doid: number | null, tier: string, desc: string): Row =>
  ({ tool_name: name, operation_kind: op, data_object_id: doid, coverage_tier: tier, description: desc });
const newTools: Row[] = [
  tool("query_connected_intranets", "query", CI, "platform", "List and read connected intranet sources under governance."),
  tool("register_connected_intranet", "mutate", CI, "platform", "Register a new intranet source (SharePoint, Viva, Staffbase, Simpplr, WordPress) as a governed source."),
  tool("crawl_intranet_source", "fetch", null, "external", "Crawl a connected intranet to retrieve its content listing for inventory ingestion."),
  tool("query_intranet_content_inventory_records", "query", IR, "platform", "List and read intranet content inventory records."),
  tool("update_intranet_content_inventory_record", "mutate", IR, "platform", "Update inventory record metadata, type classification, or governance status."),
  tool("query_intranet_content_types", "query", CT, "platform", "List governed intranet content types and their review-cadence policies."),
  tool("update_intranet_content_type", "mutate", CT, "platform", "Create or update a content-type policy (review cadence, criticality, retention)."),
  tool("query_intranet_content_health_scores", "query", HS, "platform", "Read computed content health scores per inventory record."),
  tool("scan_content_quality", "compute", null, "external", "Scan internal content for stale, broken-link, duplicate, and readability issues."),
  tool("scan_content_accessibility", "compute", null, "external", "Scan internal content against accessibility standards and return findings."),
  tool("query_intranet_content_ownership_assignments", "query", OA, "platform", "List and read content ownership assignments."),
  tool("assign_content_owner", "mutate", OA, "platform", "Assign or reassign the accountable owner and backup for a piece of content, with review cadence."),
  tool("query_intranet_content_attestations", "query", AT, "platform", "List and read content recertification attestations."),
  tool("request_content_attestation", "mutate", AT, "platform", "Open a recertification attestation for an owner to confirm or flag content."),
  tool("attest_content", "mutate", AT, "platform", "Owner attests that content is current (recertification)."),
  tool("flag_content_stale", "mutate", AT, "platform", "Flag content as stale for remediation or archival."),
  tool("archive_content", "mutate", AT, "platform", "Archive content that is no longer current and will not be remediated."),
];
const toolMap = await syncTable("/tools", newTools, "tool_name");
// reuse existing
for (const t of await get("/tools?tool_name=in.(notify_person,query_work_items,create_work_item)&select=id,tool_name")) toolMap.set(String(t.tool_name), Number(t.id));

console.log("== Phase S: domain_module_tools ==");
const dmt = (mod: number, tname: string, req: string): Row => ({ domain_module_id: mod, tool_id: toolMap.get(tname)!, requirement_level: req });
const moduleTools: Row[] = [
  // Module A
  ...["query_connected_intranets", "register_connected_intranet", "crawl_intranet_source", "query_intranet_content_inventory_records", "update_intranet_content_inventory_record", "query_intranet_content_types", "update_intranet_content_type", "query_intranet_content_health_scores"].map(t => dmt(MOD_INV, t, "required")),
  ...["scan_content_quality", "scan_content_accessibility"].map(t => dmt(MOD_INV, t, "optional")),
  // Module B
  ...["query_intranet_content_ownership_assignments", "assign_content_owner", "query_intranet_content_attestations", "request_content_attestation", "attest_content", "flag_content_stale", "archive_content", "notify_person", "create_work_item"].map(t => dmt(MOD_GOV, t, "required")),
  dmt(MOD_GOV, "query_work_items", "optional"),
];
await syncJunction("/domain_module_tools", moduleTools, "domain_module_id,tool_id", r => `${r.domain_module_id}|${r.tool_id}`);

// ============================================================
console.log("== Phase E: personas ==");
const roleMap = await syncTable("/domain_roles", [
  { role_code: "DIGITAL-WORKPLACE-GOV-LEAD", role_name: "Digital Workplace Governance Lead", business_function_id: null, description: "Owns the intranet governance program across all connected sources: sets policy, oversees recertification, and is accountable for content currency and accountability coverage." },
  { role_code: "CONTENT-OWNER", role_name: "Content Owner", business_function_id: null, description: "Accountable owner for specific pieces of intranet content; responds to recertification attestations and remediates or archives stale content." },
  { role_code: "ITOPS-INTRANET-ADMIN", role_name: "Intranet Platform Administrator", business_function_id: IT_FN, description: "Connects and maintains intranet sources, runs crawls and scans, and keeps the inventory and connectors healthy." },
], "role_code");
const R_LEAD = roleMap.get("DIGITAL-WORKPLACE-GOV-LEAD")!, R_OWNER = roleMap.get("CONTENT-OWNER")!, R_ADMIN = roleMap.get("ITOPS-INTRANET-ADMIN")!;

console.log("== Phase E: role_modules (reach) ==");
const rm = (role: number, mod: number, lvl: string): Row => ({ role_id: role, domain_module_id: mod, interaction_level: lvl });
await syncJunction("/role_modules", [
  rm(R_LEAD, MOD_INV, "primary"), rm(R_LEAD, MOD_GOV, "primary"),
  rm(R_OWNER, MOD_GOV, "primary"), rm(R_OWNER, MOD_INV, "secondary"),
  rm(R_ADMIN, MOD_INV, "primary"), rm(R_ADMIN, MOD_GOV, "secondary"),
], "role_id,domain_module_id", r => `${r.role_id}|${r.domain_module_id}`);

console.log("== Phase E: recertification process + RACI ==");
const procMap = await syncTable("/processes", [
  { process_code: "CUSTOM-INTRANET-GOV-RECERT", process_name: "Recertify Intranet Content", source_framework: "custom", external_id: "", external_url: "", hierarchy_level: 1, description: "Periodic recertification of intranet content: owners attest that content is current, or flag it stale for remediation or archival, keeping the intranet free of ghost-town content." },
], "process_code");
const RECERT = procMap.get("CUSTOM-INTRANET-GOV-RECERT")!;
// wire the gated attestation states to the process
for (const st of await get(`/data_object_lifecycle_states?data_object_id=eq.${AT}&requires_permission=eq.true&select=id,process_id`)) {
  if (st.process_id == null) await call({ method: "PATCH", path: `/data_object_lifecycle_states?id=eq.${st.id}`, body: { process_id: RECERT } });
}
const raci = (actor: number, letter: string, blocking: boolean): Row => ({ process_id: RECERT, actor_role_id: actor, raci: letter, consultation_blocking: blocking });
await syncJunction("/process_raci", [
  raci(R_OWNER, "responsible", false),
  raci(R_LEAD, "accountable", false),
  raci(R_ADMIN, "consulted", false),
], "process_id,actor_role_id,raci", r => `${r.process_id}|${r.actor_role_id}|${r.raci}`);

console.log("\n== DONE (Phase B detail + S + E) ==");
console.log(`WORK-MGMT target module for handoff = ${WM_MOD}, IT Operations fn = ${IT_FN}`);
console.log("https://tests.semantius.app/domain_map/data_object_relationships");
console.log("https://tests.semantius.app/domain_map/domain_module_tools");
console.log("https://tests.semantius.app/domain_map/process_raci");
