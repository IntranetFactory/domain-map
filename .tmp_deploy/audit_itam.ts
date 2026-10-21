// Full per-domain completeness audit for ITAM (domain_id=3).
// Reads live state via the semantius CLI; no writes.

const DOMAIN_ID = 3;
const DOMAIN_CODE = "ITAM";
const MODULE_IDS = [57, 58, 59, 60]; // ITAM-NORMALIZATION-CATALOG, ITAM-CONTRACTS, ITAM-LIFECYCLE, ITAM-PORTFOLIO-REPORTING
const MASTER_DATA_OBJECT_IDS = [54, 55]; // asset_contracts, asset_lifecycle_events
const SKILL_IDS = [148, 149, 150, 151];

async function pgGet(path: string): Promise<any[]> {
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify({ method: "GET", path })],
    { stdout: "pipe", stderr: "pipe" },
  );
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) {
    throw new Error(`semantius failed (${proc.exitCode}) for ${path}\nstderr: ${stderr}`);
  }
  try {
    return JSON.parse(stdout);
  } catch (e) {
    throw new Error(`bad JSON from ${path}: ${stdout.slice(0, 500)}`);
  }
}

function section(title: string) {
  console.log("\n" + "=".repeat(72));
  console.log(title);
  console.log("=".repeat(72));
}

async function main() {
  // ===== S1: FK coverage sweep =====
  section("S1: FK coverage sweep (FKs to domains)");
  const s1Pairs: Array<[string, string]> = [
    ["business_function_domains", `domain_id=eq.${DOMAIN_ID}`],
    ["capability_domains", `domain_id=eq.${DOMAIN_ID}`],
    ["handoffs (source)", `source_domain_id=eq.${DOMAIN_ID}`],
    ["handoffs (target)", `target_domain_id=eq.${DOMAIN_ID}`],
    ["domain_data_objects", `domain_id=eq.${DOMAIN_ID}`],
    ["domain_module_host_domains", `domain_id=eq.${DOMAIN_ID}`],
    ["domain_modules", `domain_id=eq.${DOMAIN_ID}`],
    ["domain_regulations", `domain_id=eq.${DOMAIN_ID}`],
    ["domain_starter_modules", `domain_id=eq.${DOMAIN_ID}`],
    ["domains (children)", `parent_domain_id=eq.${DOMAIN_ID}`],
    ["skills", `domain_id=eq.${DOMAIN_ID}`],
    ["solution_domains", `domain_id=eq.${DOMAIN_ID}`],
  ];
  for (const [label, filter] of s1Pairs) {
    const tbl = label.split(" ")[0];
    const rows = await pgGet(`/${tbl}?${filter}&select=id&limit=10000`);
    console.log(`  ${label.padEnd(32)} -> ${rows.length}`);
  }

  // ===== S2: per-module indirect coverage =====
  section("S2: per-module data_objects + capabilities");
  for (const mid of MODULE_IDS) {
    const [mod] = await pgGet(`/domain_modules?id=eq.${mid}&select=domain_module_code`);
    const dmd = await pgGet(`/domain_module_data_objects?domain_module_id=eq.${mid}&select=id`);
    const dmc = await pgGet(`/domain_module_capabilities?domain_module_id=eq.${mid}&select=id`);
    console.log(`  ${mod.domain_module_code.padEnd(30)} -> data_objects=${dmd.length} capabilities=${dmc.length}`);
  }

  // ===== S3: per-master lifecycle/trigger/aliases =====
  section("S3: per-master lifecycle states, trigger events, aliases");
  for (const did of MASTER_DATA_OBJECT_IDS) {
    const [d] = await pgGet(`/data_objects?id=eq.${did}&select=data_object_name,has_personal_content,has_submit_lock,has_single_approver,notes`);
    const ls = await pgGet(`/data_object_lifecycle_states?data_object_id=eq.${did}&select=id`);
    const te = await pgGet(`/trigger_events?data_object_id=eq.${did}&select=id`);
    const al = await pgGet(`/data_object_aliases?data_object_id=eq.${did}&select=id`);
    console.log(`  ${d.data_object_name.padEnd(28)} states=${ls.length} events=${te.length} aliases=${al.length}`);
    console.log(`     pattern flags: personal=${d.has_personal_content} submit_lock=${d.has_submit_lock} single_approver=${d.has_single_approver}`);
    if (d.notes) console.log(`     notes: ${d.notes.slice(0, 120)}`);
  }

  // ===== A1: domain metadata =====
  section("A1: domains row metadata");
  const [domain] = await pgGet(`/domains?id=eq.${DOMAIN_ID}&select=crud_percentage,business_logic,min_org_size,cost_band,certification_required,usa_market_size_usd_m,market_size_source_year`);
  console.log(`  crud_percentage=${domain.crud_percentage} business_logic="${(domain.business_logic ?? "").slice(0, 80)}..."`);
  console.log(`  min_org_size="${domain.min_org_size}" cost_band="${domain.cost_band}" certification=${domain.certification_required}`);
  console.log(`  TAM USD ${domain.usa_market_size_usd_m}M year=${domain.market_size_source_year}`);
  const a1Pass =
    domain.crud_percentage > 0 &&
    (domain.business_logic !== "" || domain.crud_percentage >= 95) &&
    domain.min_org_size !== "" &&
    domain.cost_band !== "" &&
    domain.usa_market_size_usd_m > 0 &&
    domain.market_size_source_year > 0;
  console.log(`  PASS=${a1Pass}`);

  // ===== A2/A3: capabilities + solutions =====
  section("A2: capabilities, A3: solutions");
  const capDom = await pgGet(`/capability_domains?domain_id=eq.${DOMAIN_ID}&select=capabilities(capability_code)`);
  console.log(`  A2 capabilities count=${capDom.length} (need >=3): ${capDom.map((r: any) => r.capabilities.capability_code).join(", ")}`);
  const solDom = await pgGet(`/solution_domains?domain_id=eq.${DOMAIN_ID}&select=coverage_level,solutions(solution_name)`);
  const primary = solDom.filter((r: any) => r.coverage_level === "primary").length;
  console.log(`  A3 solutions count=${solDom.length} primary=${primary}`);
  for (const r of solDom) console.log(`     ${r.coverage_level.padEnd(10)} ${r.solutions.solution_name}`);

  // ===== M-band =====
  section("M-band: modules");
  const modules = await pgGet(`/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code,domain_module_name`);
  console.log(`  M1 module count=${modules.length} (need >=1)`);
  console.log(`  M2 capability count=${capDom.length}, modules=${modules.length} (if caps>=3 need modules>=2): PASS=${capDom.length < 3 || modules.length >= 2}`);
  const starters = await pgGet(`/domain_starter_modules?domain_id=eq.${DOMAIN_ID}&select=position,notes,domain_modules(domain_module_code)&order=position.asc`);
  console.log(`  M3 starter modules count=${starters.length} (if caps>=3 need >=1): PASS=${capDom.length < 3 || starters.length >= 1}`);
  // M4: every capability has >=1 realizing module within this domain's modules
  console.log(`  M4 capability -> module realization:`);
  const capIds: number[] = [];
  for (const r of capDom) {
    const [c] = await pgGet(`/capabilities?capability_code=eq.${r.capabilities.capability_code}&select=id`);
    if (c) capIds.push(c.id);
  }
  const m4Misses: string[] = [];
  for (let i = 0; i < capIds.length; i++) {
    const cap = capDom[i].capabilities.capability_code;
    const realizing = await pgGet(`/domain_module_capabilities?capability_id=eq.${capIds[i]}&domain_module_id=in.(${MODULE_IDS.join(",")})&select=domain_module_id`);
    console.log(`     ${cap.padEnd(30)} -> ${realizing.length} module(s)`);
    if (realizing.length === 0) m4Misses.push(cap);
  }
  console.log(`  M4 PASS=${m4Misses.length === 0}${m4Misses.length ? ` (orphans: ${m4Misses.join(",")})` : ""}`);
  // M5: workflow-gate states have domain_module_id set when belonging to a module
  const lifeStates = await pgGet(`/data_object_lifecycle_states?data_object_id=in.(${MASTER_DATA_OBJECT_IDS.join(",")})&requires_permission=eq.true&select=data_object_id,state_name,domain_module_id`);
  console.log(`  M5 workflow-gate states=${lifeStates.length} (rows with null module_id allowed if always-reachable)`);
  for (const s of lifeStates) console.log(`     do=${s.data_object_id} state=${s.state_name} module_id=${s.domain_module_id ?? "NULL"}`);
  // M6: every module realizes >=1 capability
  console.log(`  M6 module -> capability:`);
  let m6Pass = true;
  for (const m of modules) {
    const realizes = await pgGet(`/domain_module_capabilities?domain_module_id=eq.${m.id}&select=id`);
    console.log(`     ${m.domain_module_code.padEnd(30)} -> ${realizes.length} capability(s)`);
    if (realizes.length === 0) m6Pass = false;
  }
  console.log(`  M6 PASS=${m6Pass}`);

  // ===== B-band =====
  section("B-band: data-object footprint");
  // B1: masters
  const masters = await pgGet(`/domain_module_data_objects?domain_module_id=in.(${MODULE_IDS.join(",")})&role=eq.master&select=data_object_id,domain_module_id,necessity,data_objects(data_object_name)`);
  console.log(`  B1 masters across modules=${masters.length}`);
  for (const m of masters) console.log(`     ${m.data_objects.data_object_name.padEnd(28)} module=${m.domain_module_id} necessity=${m.necessity}`);
  // B2: labels
  const masterDoIds = [...new Set(masters.map((m: any) => m.data_object_id))];
  const masterDos = await pgGet(`/data_objects?id=in.(${masterDoIds.join(",")})&select=id,data_object_name,singular_label,plural_label,is_canonical_bare_word,naming_authority_rationale,notes,has_personal_content,has_submit_lock,has_single_approver`);
  let b2Pass = true;
  for (const d of masterDos) {
    if (!d.singular_label || !d.plural_label) {
      console.log(`  B2 MISS ${d.data_object_name}: singular="${d.singular_label}" plural="${d.plural_label}"`);
      b2Pass = false;
    }
  }
  console.log(`  B2 PASS=${b2Pass}`);
  // B3: naming arbitration
  let b3Pass = true;
  for (const d of masterDos) {
    const isBareWord = !d.data_object_name.includes("_");
    if (isBareWord && !d.is_canonical_bare_word) {
      console.log(`  B3 MISS ${d.data_object_name} is bare-word but not canonical`);
      b3Pass = false;
    }
  }
  console.log(`  B3 PASS=${b3Pass} (prefixed names auto-pass)`);
  // B4: pattern flags consideration
  console.log(`  B4 pattern flags per master:`);
  for (const d of masterDos) {
    console.log(`     ${d.data_object_name.padEnd(28)} personal=${d.has_personal_content} submit_lock=${d.has_submit_lock} single_approver=${d.has_single_approver}`);
  }
  // B5: embedded_master integrity
  const embedded = await pgGet(`/domain_module_data_objects?domain_module_id=in.(${MODULE_IDS.join(",")})&role=eq.embedded_master&select=data_object_id,data_objects(data_object_name,kind)`);
  console.log(`  B5 embedded_master rows=${embedded.length}`);
  let b5Pass = true;
  for (const e of embedded) {
    const canonicalMasters = await pgGet(`/domain_module_data_objects?data_object_id=eq.${e.data_object_id}&role=eq.master&select=id`);
    const isBuiltin = e.data_objects.kind === "platform_builtin";
    const ok = isBuiltin || canonicalMasters.length > 0;
    console.log(`     ${e.data_objects.data_object_name.padEnd(28)} kind=${e.data_objects.kind} canonical_masters=${canonicalMasters.length} ok=${ok}`);
    if (!ok) b5Pass = false;
  }
  console.log(`  B5 PASS=${b5Pass}`);
  // B6: intra-domain relationships
  const intraRel = await pgGet(`/data_object_relationships?and=(data_object_id.in.(${MASTER_DATA_OBJECT_IDS.join(",")}),related_data_object_id.in.(${MASTER_DATA_OBJECT_IDS.join(",")}))&select=data_object_id,relationship_verb,related_data_object_id`);
  console.log(`  B6 intra-domain relationships=${intraRel.length}`);
  for (const r of intraRel) console.log(`     ${r.data_object_id} ${r.relationship_verb} ${r.related_data_object_id}`);
  // B7: users edges
  const [usersRow] = await pgGet(`/data_objects?data_object_name=eq.users&select=id`);
  const usersId = usersRow?.id;
  const userEdges = await pgGet(`/data_object_relationships?or=(and(data_object_id.in.(${MASTER_DATA_OBJECT_IDS.join(",")}),related_data_object_id.eq.${usersId}),and(related_data_object_id.in.(${MASTER_DATA_OBJECT_IDS.join(",")}),data_object_id.eq.${usersId}))&select=data_object_id,relationship_verb,related_data_object_id`);
  console.log(`  B7 users edges=${userEdges.length} (users.id=${usersId})`);
  for (const r of userEdges) console.log(`     ${r.data_object_id} ${r.relationship_verb} ${r.related_data_object_id}`);
  // B8: cross-domain outbound relationships
  const crossRel = await pgGet(`/data_object_relationships?and=(data_object_id.in.(${MASTER_DATA_OBJECT_IDS.join(",")}),related_data_object_id.not.in.(${MASTER_DATA_OBJECT_IDS.join(",")}))&select=data_object_id,relationship_verb,related_data_object_id,is_required,notes`);
  console.log(`  B8 outbound cross-domain relationships=${crossRel.length}`);
  for (const r of crossRel.slice(0, 10)) console.log(`     ${r.data_object_id} ${r.relationship_verb} ${r.related_data_object_id} req=${r.is_required}`);
  // B9: outbound trigger_events + handoffs
  const triggerEvents = await pgGet(`/trigger_events?data_object_id=in.(${MASTER_DATA_OBJECT_IDS.join(",")})&select=id,event_name,data_object_id`);
  console.log(`  B9 trigger_events on masters=${triggerEvents.length}`);
  for (const t of triggerEvents) console.log(`     ${t.event_name} (do=${t.data_object_id}, te_id=${t.id})`);
  const outHandoffs = await pgGet(`/handoffs?source_domain_id=eq.${DOMAIN_ID}&select=id,trigger_event_id,target_domain_id,integration_pattern,friction_level,source_domain_module_id,target_domain_module_id,trigger_events(event_name)`);
  console.log(`  B9 outbound handoffs=${outHandoffs.length}`);
  for (const h of outHandoffs) console.log(`     ${h.trigger_events?.event_name ?? "?"} -> domain=${h.target_domain_id} pattern=${h.integration_pattern} friction=${h.friction_level} src_mod=${h.source_domain_module_id ?? "NULL"} tgt_mod=${h.target_domain_module_id ?? "NULL"}`);
  // B9b: intra-domain cross-module handoffs (if modules >= 2)
  if (modules.length >= 2) {
    const intraHandoffs = await pgGet(`/handoffs?source_domain_id=eq.${DOMAIN_ID}&target_domain_id=eq.${DOMAIN_ID}&select=id,trigger_event_id,source_domain_module_id,target_domain_module_id,integration_pattern,trigger_events(event_name)`);
    console.log(`  B9b intra-domain handoffs=${intraHandoffs.length}`);
    for (const h of intraHandoffs) console.log(`     ${h.trigger_events?.event_name ?? "?"} mod${h.source_domain_module_id}->mod${h.target_domain_module_id} pattern=${h.integration_pattern}`);
  }
  // B10: inbound handoffs (report only)
  const inHandoffs = await pgGet(`/handoffs?target_domain_id=eq.${DOMAIN_ID}&select=id,trigger_event_id,source_domain_id,data_object_id,trigger_events(event_name)`);
  console.log(`  B10 inbound handoffs=${inHandoffs.length}`);
  for (const h of inHandoffs.slice(0, 5)) console.log(`     ${h.trigger_events?.event_name ?? "?"} from domain=${h.source_domain_id}`);
  // B10b: per-module attribution on handoffs touching this domain
  const outNullSrc = outHandoffs.filter((h: any) => h.source_domain_module_id === null);
  const outNullTgt = outHandoffs.filter((h: any) => h.target_domain_module_id === null);
  const inNullTgt = inHandoffs.filter((h: any) => (h as any).target_domain_module_id === null);
  console.log(`  B10b NULL source_module on outbound=${outNullSrc.length}`);
  console.log(`  B10b NULL target_module on outbound (other side's owed): ${outNullTgt.length}`);
  // Need to re-query inbound for target_domain_module_id field specifically
  const inHandoffsFull = await pgGet(`/handoffs?target_domain_id=eq.${DOMAIN_ID}&target_domain_module_id=is.null&select=id`);
  console.log(`  B10b NULL target_module on inbound (this domain owes)=${inHandoffsFull.length}`);
  // B11: aliases per master
  console.log(`  B11 aliases per master:`);
  for (const did of MASTER_DATA_OBJECT_IDS) {
    const al = await pgGet(`/data_object_aliases?data_object_id=eq.${did}&select=alias_name,alias_type`);
    const [d] = masterDos.filter((m: any) => m.id === did);
    console.log(`     ${d.data_object_name.padEnd(28)} aliases=${al.length}`);
    for (const a of al) console.log(`        ${a.alias_type}: ${a.alias_name}`);
  }
  // B12: lifecycle states
  console.log(`  B12 lifecycle states per master+required:`);
  for (const m of masters.filter((x: any) => x.necessity === "required")) {
    const ls = await pgGet(`/data_object_lifecycle_states?data_object_id=eq.${m.data_object_id}&select=state_name,state_order,is_initial,is_terminal,requires_permission,permission_verb_override,domain_module_id&order=state_order.asc`);
    const [d] = masterDos.filter((x: any) => x.id === m.data_object_id);
    console.log(`     ${d.data_object_name.padEnd(28)} states=${ls.length} notes="${(d.notes ?? "").slice(0, 80)}"`);
    for (const s of ls) console.log(`        ${s.state_order}. ${s.state_name} init=${s.is_initial} term=${s.is_terminal} gate=${s.requires_permission} mod=${s.domain_module_id ?? "NULL"} override=${s.permission_verb_override ?? ""}`);
  }

  // ===== C-band =====
  section("C-band: functional ownership");
  const bfd = await pgGet(`/business_function_domains?domain_id=eq.${DOMAIN_ID}&select=responsibility_type,business_functions(business_function_name)`);
  console.log(`  C1 business_function_domains=${bfd.length}`);
  for (const r of bfd) console.log(`     ${r.responsibility_type.padEnd(12)} ${r.business_functions.business_function_name}`);
  console.log(`  C1 PASS=${bfd.filter((r: any) => r.responsibility_type === "owner").length >= 1}`);
  // C2: capability-level overrides
  if (capIds.length > 0) {
    const bfc = await pgGet(`/business_function_capabilities?capability_id=in.(${capIds.join(",")})&select=responsibility_type,business_functions(business_function_name),capabilities(capability_code)`);
    console.log(`  C2 capability-level function overrides=${bfc.length}`);
    for (const r of bfc) console.log(`     ${r.capabilities.capability_code} ${r.responsibility_type} ${r.business_functions.business_function_name}`);
  }

  // ===== E-band =====
  section("E-band: roles & permission bundling");
  // Roles touching any of this domain's modules
  const roleMods = await pgGet(`/role_modules?domain_module_id=in.(${MODULE_IDS.join(",")})&select=role_id,interaction_level,domain_module_id,roles(id,role_code,role_name,business_function_id)`);
  const roleIds = [...new Set(roleMods.map((r: any) => r.role_id))];
  console.log(`  E1 distinct roles touching ITAM modules=${roleIds.length}`);
  for (const rid of roleIds) {
    const sample = roleMods.find((r: any) => r.role_id === rid);
    console.log(`     role_id=${rid} ${sample.roles.role_code} (bf=${sample.roles.business_function_id ?? "cross-fn"})`);
  }
  if (roleIds.length === 0) {
    console.log(`     (no roles loaded for ITAM modules)`);
  } else {
    // E2: 2-module floor
    for (const rid of roleIds) {
      const rm = await pgGet(`/role_modules?role_id=eq.${rid}&select=domain_module_id`);
      console.log(`     E2 role_id=${rid} role_modules=${rm.length} (need >=2): PASS=${rm.length >= 2}`);
    }
    // E3: interaction_level set
    const nullIL = await pgGet(`/role_modules?role_id=in.(${roleIds.join(",")})&interaction_level=is.null&select=id`);
    console.log(`  E3 role_modules rows with NULL interaction_level=${nullIL.length}`);
    // E4: bundle minimum
    for (const rid of roleIds) {
      const rp = await pgGet(`/role_permissions?role_id=eq.${rid}&select=id`);
      console.log(`     E4 role_id=${rid} role_permissions=${rp.length} (need >=1)`);
    }
  }

  // ===== F-band =====
  section("F-band: skill-layer integrity");
  // F1: legacy domain-level system skills with no module
  const legacy = await pgGet(`/skills?domain_id=eq.${DOMAIN_ID}&skill_type=eq.system&domain_module_id=is.null&select=id,skill_name`);
  console.log(`  F1 legacy domain-level system skills=${legacy.length} (need 0)`);
  // F2: one system skill per module
  console.log(`  F2 per-module system skill count:`);
  let f2Pass = true;
  for (const m of modules) {
    const sk = await pgGet(`/skills?domain_module_id=eq.${m.id}&skill_type=eq.system&select=id,skill_name`);
    console.log(`     ${m.domain_module_code.padEnd(30)} skills=${sk.length} (need exactly 1)`);
    if (sk.length !== 1) f2Pass = false;
  }
  console.log(`  F2 PASS=${f2Pass}`);
  // F3: skill_tools per skill >= 1
  console.log(`  F3 skill_tools per skill:`);
  let f3Pass = true;
  for (const sid of SKILL_IDS) {
    const st = await pgGet(`/skill_tools?skill_id=eq.${sid}&select=id`);
    if (st.length < 1) f3Pass = false;
    console.log(`     skill_id=${sid} skill_tools=${st.length}`);
  }
  console.log(`  F3 PASS=${f3Pass}`);
  // F4: operation_kind <-> data_object_id invariant
  const allTools = await pgGet(`/skill_tools?skill_id=in.(${SKILL_IDS.join(",")})&select=skill_id,tools(id,tool_name,operation_kind,data_object_id,coverage_tier)`);
  let f4Pass = true;
  for (const r of allTools) {
    const t = r.tools;
    const k = t.operation_kind;
    const hasDo = t.data_object_id !== null;
    let ok = true;
    if ((k === "query" || k === "mutate") && !hasDo) ok = false;
    if ((k === "side_effect" || k === "compute") && hasDo) ok = false;
    if (!ok) {
      console.log(`     F4 VIOLATION tool=${t.tool_name} kind=${k} data_object_id=${t.data_object_id}`);
      f4Pass = false;
    }
  }
  console.log(`  F4 PASS=${f4Pass}`);

  // F5: Semantius score per module + domain rollup
  section("F5: Semantius score per module");
  let domNum = 0;
  let domNumOp = 0;
  let domDen = 0;
  const moduleScoreRows: Array<{ mod: string; total: number; platform: number; integration: number; external: number; strict: number; operational: number }> = [];
  for (let i = 0; i < SKILL_IDS.length; i++) {
    const sid = SKILL_IDS[i];
    const mid = MODULE_IDS[i];
    const [mod] = await pgGet(`/domain_modules?id=eq.${mid}&select=domain_module_code`);
    const rows = allTools.filter((r: any) => r.skill_id === sid);
    const total = rows.length;
    const platform = rows.filter((r: any) => r.tools.coverage_tier === "platform").length;
    const integration = rows.filter((r: any) => r.tools.coverage_tier === "integration").length;
    const external = rows.filter((r: any) => r.tools.coverage_tier === "external").length;
    const strict = total === 0 ? 0 : platform / total;
    const operational = total === 0 ? 0 : (platform + integration) / total;
    moduleScoreRows.push({ mod: mod.domain_module_code, total, platform, integration, external, strict, operational });
    domNum += platform;
    domNumOp += platform + integration;
    domDen += total;
  }
  console.log(`  Module                          tools  plat  intg  ext   strict%  operational%`);
  for (const r of moduleScoreRows) {
    console.log(`  ${r.mod.padEnd(32)} ${String(r.total).padStart(5)} ${String(r.platform).padStart(5)} ${String(r.integration).padStart(5)} ${String(r.external).padStart(5)}  ${(r.strict * 100).toFixed(1).padStart(6)}%  ${(r.operational * 100).toFixed(1).padStart(7)}%`);
  }
  const domStrict = domDen === 0 ? 0 : domNum / domDen;
  const domOp = domDen === 0 ? 0 : domNumOp / domDen;
  console.log(`  ${"ITAM (rollup)".padEnd(32)} ${String(domDen).padStart(5)} ${String(domNum).padStart(5)} ${"-".padStart(5)} ${String(domDen - domNumOp).padStart(5)}  ${(domStrict * 100).toFixed(1).padStart(6)}%  ${(domOp * 100).toFixed(1).padStart(7)}%`);

  // F7: channel primitive misuse audit
  section("F7: channel primitive audit");
  const channelPrims = ["send_email", "send_sms", "post_chat_message", "make_phone_call", "send_push_notification", "send_whatsapp_message"];
  const channelRows = await pgGet(`/skill_tools?skill_id=in.(${SKILL_IDS.join(",")})&select=skill_id,notes,requirement_level,tools!inner(tool_name)&tools.tool_name=in.(${channelPrims.join(",")})`);
  console.log(`  F7 channel primitive rows on ITAM skills=${channelRows.length}`);
  for (const r of channelRows) {
    const notesEmpty = !r.notes || r.notes.trim().length === 0;
    console.log(`     skill_id=${r.skill_id} tool=${r.tools.tool_name} req=${r.requirement_level} notes="${(r.notes ?? "").slice(0, 80)}" notesEmpty=${notesEmpty}`);
  }
}

await main();
