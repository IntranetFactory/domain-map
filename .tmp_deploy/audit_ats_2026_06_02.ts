#!/usr/bin/env bun
/**
 * audit_ats_2026_06_02.ts — READ-ONLY structural completeness audit of the ATS domain (id 56).
 * Runs the SKILL.md per-domain checklist bands S/A/M/B/C/E/F/H against live state.
 * Writes nothing. Prints a banded gap report. Masters are derived from the authoritative
 * domain_module_data_objects junction (the legacy domain_data_objects rollup is stale).
 */
export {};

const DOMAIN_ID = 56;
const MODULE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 154];
const FULL_MODULE_IDS = [1, 2, 3, 4, 5, 6, 7, 8];

async function pg(path: string): Promise<any[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify({ method: "GET", path })),
    stdout: "pipe", stderr: "pipe",
  });
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`GET ${path}: ${err || out}`);
  return out.trim() ? JSON.parse(out.trim()) : [];
}

const lines: string[] = [];
const log = (s = "") => { lines.push(s); };
const band = (s: string) => { log(""); log("=".repeat(72)); log(s); log("=".repeat(72)); };

// ---- Fetch everything -------------------------------------------------------
const [
  domains, modules, hostDomains, dmdo, ddoRollup, dataObjectsAll,
  capDomains, modCaps, bfDomains, skills, solDomains, domRegs,
] = await Promise.all([
  pg(`/domains?select=id,domain_code,domain_name,parent_domain_id&limit=10000`),
  pg(`/domain_modules?id=in.(${MODULE_IDS.join(",")})&select=id,domain_module_code,domain_module_name,module_kind,domain_id,catalog_tagline,catalog_description`),
  pg(`/domain_module_host_domains?domain_id=eq.${DOMAIN_ID}&select=domain_module_id`),
  pg(`/domain_module_data_objects?domain_module_id=in.(${MODULE_IDS.join(",")})&select=domain_module_id,data_object_id,role,necessity,notes`),
  pg(`/domain_data_objects?domain_id=eq.${DOMAIN_ID}&select=data_object_id,role,necessity`),
  pg(`/data_objects?select=id,data_object_name,entity_type,kind,singular_label,plural_label,has_personal_content,has_submit_lock,has_single_approver,is_canonical_bare_word,naming_authority_rationale&limit=20000`),
  pg(`/capability_domains?domain_id=eq.${DOMAIN_ID}&select=capability_id,capabilities(capability_code,capability_name)`),
  pg(`/domain_module_capabilities?domain_module_id=in.(${MODULE_IDS.join(",")})&select=domain_module_id,capability_id`),
  pg(`/business_function_domains?domain_id=eq.${DOMAIN_ID}&select=responsibility_type,business_functions(business_function_name)`),
  pg(`/skills?or=(domain_id.eq.${DOMAIN_ID},domain_module_id.in.(${MODULE_IDS.join(",")}))&select=id,skill_name,skill_type,domain_id,domain_module_id`),
  pg(`/solution_domains?domain_id=eq.${DOMAIN_ID}&select=coverage_level,solutions(solution_name)`),
  pg(`/domain_regulations?domain_id=eq.${DOMAIN_ID}&select=applicability,regulations(regulation_name,regulation_code)`),
]);

const doInfo = new Map<number, any>();
for (const o of dataObjectsAll) doInfo.set(Number(o.id), o);
const doName = (id: number) => doInfo.get(id)?.data_object_name ?? `#${id}`;
const domCodeById = new Map<number, string>();
for (const d of domains) domCodeById.set(Number(d.id), d.domain_code);
const modCodeById = new Map<number, string>();
for (const m of modules) modCodeById.set(Number(m.id), m.domain_module_code);
const usersId = [...doInfo.entries()].find(([, o]) => o.data_object_name === "users")?.[0] ?? 748;

// Master set = role=master rows on the FULL modules (authoritative).
const masterRows = dmdo.filter((r) => r.role === "master" && FULL_MODULE_IDS.includes(Number(r.domain_module_id)));
const masters = [...new Set(masterRows.map((r) => Number(r.data_object_id)))];
const mastersCsv = masters.join(",");

// Per-master master-module map
const masterModuleOf = new Map<number, number>();
for (const r of masterRows) masterModuleOf.set(Number(r.data_object_id), Number(r.domain_module_id));

// Dependent fetches (need masters resolved first)
const [
  lifecycle, rels, relsRev, aliases, triggerEvents, handoffsOut, handoffsIn,
  catalogMasterRows, skillTools, bfCaps,
] = await Promise.all([
  pg(`/data_object_lifecycle_states?data_object_id=in.(${mastersCsv})&select=data_object_id,state_name,state_order,is_initial,is_terminal,requires_permission,permission_verb_override,domain_module_id,process_id`),
  pg(`/data_object_relationships?data_object_id=in.(${mastersCsv})&select=data_object_id,related_data_object_id,relationship_verb,inverse_verb,relationship_type,relationship_kind,is_required,owner_side`),
  pg(`/data_object_relationships?related_data_object_id=in.(${mastersCsv})&select=data_object_id,related_data_object_id,relationship_verb,relationship_type,relationship_kind,is_required,owner_side`),
  pg(`/data_object_aliases?data_object_id=in.(${mastersCsv})&select=data_object_id,alias_name,alias_type`),
  pg(`/trigger_events?data_object_id=in.(${mastersCsv})&select=id,event_name,data_object_id,from_state,to_state,event_category`),
  pg(`/handoffs?source_domain_id=eq.${DOMAIN_ID}&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,data_object_id,trigger_event_id,integration_pattern,friction_level,trigger_event:trigger_events(event_name,data_object_id)`),
  pg(`/handoffs?target_domain_id=eq.${DOMAIN_ID}&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,data_object_id,trigger_event_id,integration_pattern,friction_level,trigger_event:trigger_events(event_name,data_object_id)`),
  pg(`/domain_module_data_objects?data_object_id=in.(${mastersCsv})&role=eq.master&select=data_object_id,domain_module_id,domain_modules(domain_module_code,domain_id)`),
  pg(`/skill_tools?skill_id=in.(${skills.map((s) => s.id).join(",") || "0"})&select=skill_id,requirement_level,notes,tools(id,tool_name,operation_kind,data_object_id,coverage_tier)`),
  pg(`/business_function_capabilities?capability_id=in.(${capDomains.map((c) => c.capability_id).join(",") || "0"})&select=responsibility_type,capability_id,business_functions(business_function_name)`),
]);

const allHandoffs = [...handoffsOut, ...handoffsIn];
const handoffIds = allHandoffs.map((h) => h.id);
const handoffProcs = handoffIds.length
  ? await pg(`/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=handoff_id,process_id,proposal_source,record_status`)
  : [];

// Persona layer (Plan 3 domain_roles)
const roleModules = await pg(`/role_modules?domain_module_id=in.(${MODULE_IDS.join(",")})&select=role_id,interaction_level,domain_module_id,domain_roles(id,role_code,role_name,business_function_id)`);

// ============================================================================
log(`ATS structural audit — domain 56 — ${masters.length} masters across ${FULL_MODULE_IDS.length} full modules + 1 starter`);
log(`legacy domain_data_objects rollup masters: ${ddoRollup.filter((r) => r.role === "master").length} (STALE if << ${masters.length})`);

// ---- S2: per-module coverage ----
band("S2 — per-module data_object + capability coverage");
for (const m of modules) {
  const dCount = dmdo.filter((r) => Number(r.domain_module_id) === Number(m.id)).length;
  const cCount = modCaps.filter((r) => Number(r.domain_module_id) === Number(m.id)).length;
  const flag = dCount === 0 ? "  <-- EMPTY (Rule #14 smell)" : cCount === 0 ? "  <-- 0 capabilities (M6)" : "";
  log(`  ${m.domain_module_code.padEnd(26)} kind=${String(m.module_kind).padEnd(8)} data_objects=${String(dCount).padStart(3)} capabilities=${String(cCount).padStart(2)}${flag}`);
}

// ---- S3 / B-band per-master sweep ----
band("S3 — per-master coverage (lifecycle / trigger_events / aliases) + B-band flags");
const lcByDO = new Map<number, any[]>();
for (const s of lifecycle) { const a = lcByDO.get(Number(s.data_object_id)) ?? []; a.push(s); lcByDO.set(Number(s.data_object_id), a); }
const evByDO = new Map<number, any[]>();
for (const e of triggerEvents) { const a = evByDO.get(Number(e.data_object_id)) ?? []; a.push(e); evByDO.set(Number(e.data_object_id), a); }
const alByDO = new Map<number, any[]>();
for (const a of aliases) { const x = alByDO.get(Number(a.data_object_id)) ?? []; x.push(a); alByDO.set(Number(a.data_object_id), x); }

const b2_missingLabels: string[] = [];
const b3_bareWord: string[] = [];
const b13_unclassified: string[] = [];
const b12_wfNoStates: string[] = [];
const b11_noAlias: string[] = [];
const b14_statute: string[] = [];

const STATUTE_RE = /^(fcra|ofccp|hipaa|osha|sox|ferpa|finra|gdpr|ccpa|eeo)_|adverse_action|data_subject|self_identif|applicant_flow|summary_of_rights/;
// necessity per (data_object) within ATS modules
const necOf = new Map<number, Set<string>>();
for (const r of dmdo) { if (r.role === "master") { const s = necOf.get(Number(r.data_object_id)) ?? new Set(); s.add(String(r.necessity)); necOf.set(Number(r.data_object_id), s); } }

log(`  ${"data_object".padEnd(36)} type                  states ev al  flags`);
for (const id of masters.sort((a, b) => doName(a).localeCompare(doName(b)))) {
  const o = doInfo.get(id);
  const st = lcByDO.get(id)?.length ?? 0;
  const ev = evByDO.get(id)?.length ?? 0;
  const al = alByDO.get(id)?.length ?? 0;
  const flags = [
    o.has_personal_content ? "personal" : "",
    o.has_submit_lock ? "submitlock" : "",
    o.has_single_approver ? "approver" : "",
  ].filter(Boolean).join(",");
  log(`  ${o.data_object_name.padEnd(36)} ${String(o.entity_type).padEnd(20)} ${String(st).padStart(4)} ${String(ev).padStart(3)} ${String(al).padStart(2)}  ${flags}`);
  if (!o.singular_label || !o.plural_label) b2_missingLabels.push(o.data_object_name);
  if (!o.data_object_name.includes("_") && !o.is_canonical_bare_word) b3_bareWord.push(o.data_object_name);
  if (o.entity_type === "unclassified") b13_unclassified.push(o.data_object_name);
  if (o.entity_type === "operational_workflow" && st === 0) b12_wfNoStates.push(o.data_object_name);
  if (al === 0) b11_noAlias.push(o.data_object_name);
  if (STATUTE_RE.test(o.data_object_name)) {
    const nec = necOf.get(id);
    if (nec && nec.has("required") && !nec.has("optional")) b14_statute.push(`${o.data_object_name} (necessity=required)`);
  }
}

band("A — market shape");
const dom = domains.find((d) => Number(d.id) === DOMAIN_ID);
log(`  A2 capabilities: ${capDomains.length} (${capDomains.map((c) => c.capabilities.capability_code).join(", ")})`);
log(`  A3 solutions: ${solDomains.length}; primary=${solDomains.filter((s) => s.coverage_level === "primary").length}; coverage_level null=${solDomains.filter((s) => !s.coverage_level).length}`);
log(`     ${solDomains.map((s) => `${s.solutions?.solution_name}[${s.coverage_level}]`).join(", ")}`);
log(`  domain_regulations: ${domRegs.length} (${domRegs.map((r) => `${r.regulations?.regulation_name}[${r.regulations?.regulation_code || "EMPTY-CODE"}]`).join(", ")})`);

band("M — modules");
// M4: every capability realized by >=1 module
const realizedCaps = new Set(modCaps.map((r) => Number(r.capability_id)));
const m4orphans = capDomains.filter((c) => !realizedCaps.has(Number(c.capability_id))).map((c) => c.capabilities.capability_code);
log(`  M4 capabilities with NO realizing module: ${m4orphans.length ? m4orphans.join(", ") : "none ✓"}`);
// M6: every module realizes >=1 capability
const m6orphans = modules.filter((m) => !modCaps.some((r) => Number(r.domain_module_id) === Number(m.id))).map((m) => m.domain_module_code);
log(`  M6 modules with NO capability: ${m6orphans.length ? m6orphans.join(", ") : "none ✓"}`);
// M7: catalog-wide single-master
const masterCountCatalog = new Map<number, any[]>();
for (const r of catalogMasterRows) { const a = masterCountCatalog.get(Number(r.data_object_id)) ?? []; a.push(r); masterCountCatalog.set(Number(r.data_object_id), a); }
const m7dupes: string[] = [];
for (const [id, rows] of masterCountCatalog) if (rows.length > 1) m7dupes.push(`${doName(id)}: ${rows.map((x) => x.domain_modules?.domain_module_code).join(" + ")}`);
log(`  M7 catalog-wide multi-master (HARD FAIL if any): ${m7dupes.length ? "\n    " + m7dupes.join("\n    ") : "none ✓"}`);
// M7 within-domain coherence: master coexisting with consumer/contributor in same domain
const roleByDOByMod = new Map<number, Map<number, string>>();
for (const r of dmdo) { const m = roleByDOByMod.get(Number(r.data_object_id)) ?? new Map(); m.set(Number(r.domain_module_id), r.role); roleByDOByMod.set(Number(r.data_object_id), m); }
const m7incoherent: string[] = [];
for (const [id, m] of roleByDOByMod) {
  const roles = [...m.values()];
  if (roles.includes("master") && (roles.includes("consumer") || roles.includes("contributor"))) m7incoherent.push(doName(id));
}
log(`  M7 within-domain master+consumer/contributor (HARD FAIL): ${m7incoherent.length ? m7incoherent.join(", ") : "none ✓"}`);
// M8: catalog UX fields on modules
const m8empty = modules.filter((m) => !m.catalog_tagline || !m.catalog_description).map((m) => m.domain_module_code);
log(`  M8 modules missing catalog_tagline/description: ${m8empty.length}/${modules.length} -> ${m8empty.join(", ")}`);
// M5: lifecycle gates domain_module_id
const m5nullGate = lifecycle.filter((s) => s.requires_permission && s.domain_module_id == null);
log(`  M5 requires_permission states with NULL domain_module_id: ${m5nullGate.length} (NULL=always-reachable, acceptable for single-module; review)`);
// M9 part1: self-containment entity layer
const masterDOIds = new Set(catalogMasterRows.map((r) => Number(r.data_object_id)));
const m9violations: string[] = [];
for (const r of dmdo) {
  if (!FULL_MODULE_IDS.includes(Number(r.domain_module_id))) continue;
  const id = Number(r.data_object_id);
  const o = doInfo.get(id);
  if (o?.kind === "platform_builtin") continue;
  const hard = r.role === "contributor" || (r.role === "consumer" && r.necessity === "required");
  if (!hard) continue;
  // is it embedded_master somewhere in ATS modules?
  const embeddedHere = dmdo.some((x) => Number(x.data_object_id) === id && x.role === "embedded_master" && MODULE_IDS.includes(Number(x.domain_module_id)));
  if (!embeddedHere) m9violations.push(`${modCodeById.get(Number(r.domain_module_id))}: ${o?.data_object_name} (${r.role}/${r.necessity})`);
}
log(`  M9 part1 self-containment violations (contributor or consumer+required, not embedded, not builtin):`);
log(m9violations.length ? "    " + m9violations.join("\n    ") : "    none ✓");

band("B — data-object footprint");
log(`  B2 masters missing singular/plural label: ${b2_missingLabels.length ? b2_missingLabels.join(", ") : "none ✓"}`);
log(`  B3 bare-word masters w/o canonical claim: ${b3_bareWord.length ? b3_bareWord.join(", ") : "none ✓"}`);
log(`  B13 masters with entity_type=unclassified: ${b13_unclassified.length ? b13_unclassified.join(", ") : "none ✓"}`);
log(`  B12 operational_workflow masters with ZERO lifecycle states: ${b12_wfNoStates.length ? b12_wfNoStates.join(", ") : "none ✓"}`);
log(`  B14 statute-prefixed masters still necessity=required (should be optional): ${b14_statute.length ? b14_statute.join(", ") : "none ✓"}`);
log(`  B11 masters with ZERO aliases (review which are self-explanatory): ${b11_noAlias.length}`);
log(`    ${b11_noAlias.join(", ")}`);
// B5 embedded_master integrity
const embeddedHere = dmdo.filter((r) => r.role === "embedded_master");
const b5broken: string[] = [];
for (const r of embeddedHere) {
  const id = Number(r.data_object_id);
  const o = doInfo.get(id);
  if (o?.kind === "platform_builtin") continue;
  if (!masterDOIds.has(id)) b5broken.push(o?.data_object_name ?? `#${id}`);
}
log(`  B5 embedded_master with NO canonical master anywhere: ${b5broken.length ? [...new Set(b5broken)].join(", ") : "none ✓"}`);
// B7 users edges
const userEdgeDO = new Set<number>();
for (const r of [...rels, ...relsRev]) {
  if (Number(r.related_data_object_id) === usersId) userEdgeDO.add(Number(r.data_object_id));
  if (Number(r.data_object_id) === usersId) userEdgeDO.add(Number(r.related_data_object_id));
}
const b7noUser = masters.filter((id) => !userEdgeDO.has(id)).map(doName);
log(`  B7 masters with NO edge to users (#${usersId}) [${b7noUser.length}/${masters.length}]:`);
log(`    ${b7noUser.join(", ")}`);
// B6 intra-domain relationships: masters with no edge to another in-domain master
const masterSet = new Set(masters);
const intraEdgeDO = new Set<number>();
for (const r of rels) { if (masterSet.has(Number(r.data_object_id)) && masterSet.has(Number(r.related_data_object_id))) { intraEdgeDO.add(Number(r.data_object_id)); intraEdgeDO.add(Number(r.related_data_object_id)); } }
const b6isolated = masters.filter((id) => !intraEdgeDO.has(id)).map(doName);
log(`  B6 masters with NO intra-domain relationship edge [${b6isolated.length}/${masters.length}]:`);
log(`    ${b6isolated.join(", ")}`);

band("B9 / B9b / B10b — events + handoffs");
log(`  trigger_events on ATS masters: ${triggerEvents.length}`);
const evWithHandoff = new Set(allHandoffs.map((h) => Number(h.trigger_event_id)).filter(Boolean));
const evNoHandoff = triggerEvents.filter((e) => !evWithHandoff.has(Number(e.id))).map((e) => e.event_name);
log(`  B9 trigger_events with NO handoff row: ${evNoHandoff.length}${evNoHandoff.length ? " -> " + evNoHandoff.join(", ") : " ✓"}`);
const crossOut = handoffsOut.filter((h) => Number(h.target_domain_id) !== DOMAIN_ID);
const crossIn = handoffsIn.filter((h) => Number(h.source_domain_id) !== DOMAIN_ID);
const intra = handoffsOut.filter((h) => Number(h.target_domain_id) === DOMAIN_ID);
log(`  handoffs: outbound cross-domain=${crossOut.length}, inbound cross-domain=${crossIn.length}, intra-domain=${intra.length}`);
// B9b intra-domain module pairs covered
const intraPairs = new Set(intra.map((h) => `${h.source_domain_module_id}->${h.target_domain_module_id}`));
log(`  B9b intra-domain handoff module pairs present: ${intraPairs.size} -> ${[...intraPairs].map((p) => { const [a, b] = p.split("->"); return `${modCodeById.get(Number(a)) ?? a}->${modCodeById.get(Number(b)) ?? b}`; }).join(", ")}`);
// B10b null module FK
const b10bOutNull = handoffsOut.filter((h) => h.source_domain_module_id == null).map((h) => `#${h.id} ${h.trigger_event?.event_name ?? "?"}`);
const b10bInNull = handoffsIn.filter((h) => h.target_domain_module_id == null).map((h) => `#${h.id} ${h.trigger_event?.event_name ?? "?"}->${domCodeById.get(Number(h.source_domain_id))}`);
log(`  B10b outbound w/ NULL source_domain_module_id: ${b10bOutNull.length}${b10bOutNull.length ? " -> " + b10bOutNull.join(", ") : " ✓"}`);
log(`  B10b inbound  w/ NULL target_domain_module_id: ${b10bInNull.length}${b10bInNull.length ? " -> " + b10bInNull.join(", ") : " ✓"}`);

band("C — functional ownership");
const owners = bfDomains.filter((b) => b.responsibility_type === "owner");
log(`  C1 business_function_domains: ${bfDomains.length} rows; owners=${owners.length}`);
log(`     ${bfDomains.map((b) => `${b.business_functions?.business_function_name}[${b.responsibility_type}]`).join(", ")}`);
log(`  C2 business_function_capabilities overrides: ${bfCaps.length}`);

band("E — personas / RACI (Plan 3 domain_roles)");
const personaIds = new Set(roleModules.map((r) => r.domain_roles?.id).filter(Boolean));
log(`  E1 personas touching ATS modules: ${personaIds.size}`);
if (personaIds.size === 0) log(`     >>> ZERO personas. Multi-module domain (8 modules) -> E1 FIRES A FINDING (Plan-3 wiped _core roles; re-authoring pending).`);
else {
  const byRole = new Map<number, any[]>();
  for (const r of roleModules) { const a = byRole.get(r.domain_roles.id) ?? []; a.push(r); byRole.set(r.domain_roles.id, a); }
  for (const [rid, rows] of byRole) log(`     ${rows[0].domain_roles.role_code} reaches ${rows.length} ATS module(s)${rows.length < 2 ? " <-- below 2-module floor (E2)" : ""}`);
}

band("F — skill layer");
const sysSkills = skills.filter((s) => s.skill_type === "system");
const legacySys = sysSkills.filter((s) => s.domain_module_id == null && Number(s.domain_id) === DOMAIN_ID);
log(`  F1 legacy domain-level system skills (domain_id set, no module): ${legacySys.length ? legacySys.map((s) => s.skill_name).join(", ") : "none ✓"}`);
const sysByModule = new Map<number, any[]>();
for (const s of sysSkills) if (s.domain_module_id != null) { const a = sysByModule.get(Number(s.domain_module_id)) ?? []; a.push(s); sysByModule.set(Number(s.domain_module_id), a); }
const f2missing: string[] = [], f2dup: string[] = [];
for (const m of modules) {
  const n = (sysByModule.get(Number(m.id)) ?? []).length;
  if (n === 0) f2missing.push(m.domain_module_code);
  else if (n > 1) f2dup.push(`${m.domain_module_code}(${n})`);
}
log(`  F2 modules with ZERO system skill: ${f2missing.length ? f2missing.join(", ") : "none ✓"}`);
log(`  F2 modules with >1 system skill: ${f2dup.length ? f2dup.join(", ") : "none ✓"}`);
// F3 skill_tools per system skill
const stBySkill = new Map<number, any[]>();
for (const t of skillTools) { const a = stBySkill.get(Number(t.skill_id)) ?? []; a.push(t); stBySkill.set(Number(t.skill_id), a); }
const f3empty = sysSkills.filter((s) => (stBySkill.get(Number(s.id)) ?? []).length === 0).map((s) => s.skill_name);
log(`  F3 system skills with ZERO skill_tools: ${f3empty.length ? f3empty.join(", ") : "none ✓"}`);
// F4 operation_kind <-> data_object_id invariant
const f4bad: string[] = [];
for (const t of skillTools) {
  const tk = t.tools; if (!tk) continue;
  const ok = tk.operation_kind, hasDO = tk.data_object_id != null;
  if ((ok === "query" || ok === "mutate") && !hasDO) f4bad.push(`${tk.tool_name}(${ok} needs data_object_id)`);
  if ((ok === "fetch" || ok === "side_effect" || ok === "compute") && hasDO) f4bad.push(`${tk.tool_name}(${ok} must be NULL)`);
}
log(`  F4 operation_kind/data_object_id invariant violations: ${f4bad.length ? [...new Set(f4bad)].join(", ") : "none ✓"}`);
// F5 semantius score per module
log(`  F5 Semantius score per module (strict / operational):`);
for (const m of modules) {
  const sk = (sysByModule.get(Number(m.id)) ?? [])[0];
  if (!sk) { log(`     ${m.domain_module_code.padEnd(26)} UNCOMPUTABLE (no system skill)`); continue; }
  const tools = stBySkill.get(Number(sk.id)) ?? [];
  if (!tools.length) { log(`     ${m.domain_module_code.padEnd(26)} UNCOMPUTABLE (no skill_tools)`); continue; }
  const denom = tools.length;
  const strict = tools.filter((t) => t.tools?.coverage_tier === "platform").length / denom;
  const oper = tools.filter((t) => ["platform", "integration"].includes(t.tools?.coverage_tier)).length / denom;
  log(`     ${m.domain_module_code.padEnd(26)} ${(strict * 100).toFixed(0)}% / ${(oper * 100).toFixed(0)}%  (n=${denom})`);
}
// F7 channel primitives w/o justification
const CHANNELS = new Set(["send_email", "send_sms", "post_chat_message", "make_phone_call", "send_push_notification", "send_whatsapp_message"]);
const f7rows = skillTools.filter((t) => CHANNELS.has(t.tools?.tool_name)).map((t) => `${t.tools.tool_name} (notes="${t.notes ?? ""}")`);
log(`  F7 channel primitives linked (verify each has channel-specific justification): ${f7rows.length ? f7rows.join("; ") : "none ✓"}`);

band("H — APQC handoff coverage");
const crossAll = [...crossOut, ...crossIn];
const taggedHandoff = new Set(handoffProcs.map((p) => Number(p.handoff_id)));
const approved = handoffProcs.filter((p) => p.record_status === "approved").length;
const agentCurated = handoffProcs.filter((p) => p.proposal_source === "agent_curated").length;
const untagged = crossAll.filter((h) => !taggedHandoff.has(Number(h.id)));
log(`  H1 cross-domain handoffs: ${crossAll.length}; tagged=${crossAll.length - untagged.length}; untagged=${untagged.length}`);
log(`     headline (approved tags)=${approved}; process side-bar (agent_curated)=${agentCurated}`);
log(`  untagged cross-domain handoffs (need APQC classification):`);
for (const h of untagged) {
  const dir = Number(h.source_domain_id) === DOMAIN_ID ? `-> ${domCodeById.get(Number(h.target_domain_id))}` : `<- ${domCodeById.get(Number(h.source_domain_id))}`;
  log(`     #${h.id} ${dir.padEnd(22)} ${h.trigger_event?.event_name ?? "?"} [${doName(Number(h.data_object_id))}]`);
}

band("NEIGHBOR DISCOVERY (pass 3 input)");
const neighborWeight = new Map<string, number>();
for (const h of crossAll) {
  const other = Number(h.source_domain_id) === DOMAIN_ID ? Number(h.target_domain_id) : Number(h.source_domain_id);
  const code = domCodeById.get(other) ?? `#${other}`;
  neighborWeight.set(code, (neighborWeight.get(code) ?? 0) + 1);
}
// add DMDO cross-domain dependency weight: ATS embedded/consumer/contributor masters owned elsewhere
for (const r of dmdo) {
  if (["embedded_master", "consumer", "contributor"].includes(r.role)) {
    const owners = (masterCountCatalog.get(Number(r.data_object_id)) ?? []).filter((x) => Number(x.domain_modules?.domain_id) !== DOMAIN_ID);
    for (const ow of owners) { const code = domCodeById.get(Number(ow.domain_modules?.domain_id)) ?? "?"; neighborWeight.set(code, (neighborWeight.get(code) ?? 0) + 1); }
  }
}
const ranked = [...neighborWeight.entries()].sort((a, b) => b[1] - a[1]);
log(`  ATS neighbors by edge weight (handoffs + cross-domain dependencies):`);
for (const [code, w] of ranked) log(`     ${code.padEnd(16)} ${w}${w >= 3 ? "  <-- deep pairwise candidate" : ""}`);

console.log(lines.join("\n"));
await Bun.write("c:/tmp/ats-structural-audit-2026-06-02.txt", lines.join("\n"));
console.log("\n[written to c:/tmp/ats-structural-audit-2026-06-02.txt]");
