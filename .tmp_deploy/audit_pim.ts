#!/usr/bin/env bun
// PIM per-domain completeness audit (S, A, M, B, C, D, E, F bands).

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const tmpPath = `c:\\tmp\\sem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.json`;
  await Bun.write(tmpPath, JSON.stringify(body));
  const proc = Bun.spawn(["bash", "-c", `semantius call crud postgrestRequest < "${tmpPath.replace(/\\/g, "/")}"`], {
    stdout: "pipe", stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(), new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`semantius call failed (exit ${code}): ${stderr}`);
  try { await Bun.file(tmpPath).unlink?.(); } catch {}
  return JSON.parse(stdout.trim() || "[]");
}
const get = (path: string) => call({ method: "GET", path });

const PIM_ID = 167;
const M_CONTENT = 141, M_ASSETS = 142, M_SYND = 143;
const allModuleIds = [M_CONTENT, M_ASSETS, M_SYND];

const pass: string[] = [];
const fail: string[] = [];
const info: string[] = [];

// =========================================================================
// S1. Coverage sweep on FKs pointing at domains
// =========================================================================
console.log("=== S-band ===");
const s1Queries: Array<[string, string, boolean]> = [
  ["business_function_domains", `/business_function_domains?domain_id=eq.${PIM_ID}&select=id`, true],
  ["capability_domains",        `/capability_domains?domain_id=eq.${PIM_ID}&select=id`, true],
  ["handoffs.source",           `/handoffs?source_domain_id=eq.${PIM_ID}&target_domain_id=neq.${PIM_ID}&select=id`, true],
  ["handoffs.target",           `/handoffs?target_domain_id=eq.${PIM_ID}&source_domain_id=neq.${PIM_ID}&select=id`, true],
  ["domain_data_objects",       `/domain_data_objects?domain_id=eq.${PIM_ID}&select=id`, true],
  ["domain_modules",            `/domain_modules?domain_id=eq.${PIM_ID}&select=id`, true],
  ["domain_starter_modules",    `/domain_starter_modules?domain_id=eq.${PIM_ID}&select=id`, true],
  ["solution_domains",          `/solution_domains?domain_id=eq.${PIM_ID}&select=id`, true],
  ["skills",                    `/skills?domain_id=eq.${PIM_ID}&select=id`, true],
  ["domain_regulations",        `/domain_regulations?domain_id=eq.${PIM_ID}&select=id`, false],
  ["domain_module_host_domains", `/domain_module_host_domains?domain_id=eq.${PIM_ID}&select=id`, false],
];
for (const [name, q, expectNonZero] of s1Queries) {
  const rows = await get(q);
  const marker = rows.length === 0 && expectNonZero ? "❌" : (rows.length === 0 ? "·" : "✓");
  console.log(`  S1 ${marker} ${name}: ${rows.length}`);
  if (rows.length === 0 && expectNonZero) fail.push(`S1: ${name} is zero (expected non-zero)`);
  else pass.push(`S1: ${name}=${rows.length}`);
}

// S2. Per-module data_objects + capabilities
console.log("\n  S2 per-module coverage:");
for (const mid of allModuleIds) {
  const cap = await get(`/domain_module_capabilities?domain_module_id=eq.${mid}&select=id`);
  const dmdo = await get(`/domain_module_data_objects?domain_module_id=eq.${mid}&select=id`);
  console.log(`    module ${mid}: capabilities=${cap.length}, data_objects=${dmdo.length}`);
  if (cap.length === 0) fail.push(`S2/M6: module ${mid} has zero capabilities`);
  if (dmdo.length === 0) fail.push(`S2: module ${mid} has zero DMDO`);
}

// =========================================================================
// A. Phase A
// =========================================================================
console.log("\n=== A-band ===");
const dom = (await get(`/domains?id=eq.${PIM_ID}&select=crud_percentage,business_logic,min_org_size,cost_band,certification_required,usa_market_size_usd_m,market_size_source_year`))[0] as Row;
const a1Ok = Number(dom.crud_percentage) > 0 && dom.min_org_size && dom.cost_band && Number(dom.usa_market_size_usd_m) > 0 && Number(dom.market_size_source_year) > 0 && (Number(dom.crud_percentage) >= 95 || String(dom.business_logic ?? "").length > 0);
console.log(`  A1 ${a1Ok ? "✓" : "❌"} domain metadata: crud=${dom.crud_percentage}% org=${dom.min_org_size} cost=${dom.cost_band} TAM=$${dom.usa_market_size_usd_m}M yr=${dom.market_size_source_year}`);
if (!a1Ok) fail.push("A1 metadata gap");

const caps = await get(`/capability_domains?domain_id=eq.${PIM_ID}&select=capability_id`);
console.log(`  A2 ${caps.length >= 3 ? "✓" : "❌"} capabilities: ${caps.length}`);
if (caps.length < 3) fail.push(`A2: only ${caps.length} capabilities`);

const sols = await get(`/solution_domains?domain_id=eq.${PIM_ID}&select=coverage_level,solution_id`);
const primCount = sols.filter(s => s.coverage_level === "primary").length;
console.log(`  A3 ${(sols.length >= 3 && primCount >= 1) ? "✓" : "❌"} solutions: ${sols.length} (${primCount} primary)`);
if (sols.length < 3 || primCount < 1) fail.push(`A3 solutions=${sols.length} primary=${primCount}`);

// =========================================================================
// M. Phase M
// =========================================================================
console.log("\n=== M-band ===");
const modules = await get(`/domain_modules?domain_id=eq.${PIM_ID}&select=id,domain_module_code`);
console.log(`  M1 ${modules.length >= 1 ? "✓" : "❌"} modules: ${modules.length}`);
const capCount = caps.length;
const m2Required = capCount >= 3;
console.log(`  M2 ${(!m2Required || modules.length >= 2) ? "✓" : "❌"} (capabilities=${capCount} -> ≥2 modules required? ${m2Required})`);
const starter = await get(`/domain_starter_modules?domain_id=eq.${PIM_ID}&select=domain_module_id,position`);
console.log(`  M3 ${(!m2Required || starter.length >= 1) ? "✓" : "❌"} starter modules: ${starter.length}`);
if (m2Required && starter.length < 1) fail.push("M3");

// M4: every capability of this domain has ≥1 realizing module
const capIds = caps.map(c => Number(c.capability_id));
const dmc = await get(`/domain_module_capabilities?capability_id=in.(${capIds.join(",")})&domain_module_id=in.(${allModuleIds.join(",")})&select=capability_id`);
const realizingCaps = new Set(dmc.map(r => Number(r.capability_id)));
const orphans = capIds.filter(c => !realizingCaps.has(c));
console.log(`  M4 ${orphans.length === 0 ? "✓" : "❌"} capability orphans: ${orphans.length}`);
if (orphans.length > 0) fail.push(`M4 orphan caps: ${orphans.join(",")}`);

// M6: every module has ≥1 capability
for (const m of modules) {
  const c = await get(`/domain_module_capabilities?domain_module_id=eq.${m.id}&select=id`);
  if (c.length === 0) fail.push(`M6: module ${m.domain_module_code} has zero capabilities`);
}

// =========================================================================
// B. Phase B
// =========================================================================
console.log("\n=== B-band ===");
const masters = await get(`/domain_data_objects?domain_id=eq.${PIM_ID}&role=eq.master&select=data_object_id`);
const masterIds = masters.map(m => Number(m.data_object_id));
console.log(`  B1 ${masters.length >= 1 ? "✓" : "❌"} masters: ${masters.length}`);

const doRows = await get(`/data_objects?id=in.(${masterIds.join(",")})&select=id,data_object_name,singular_label,plural_label,is_canonical_bare_word,naming_authority_rationale,notes,has_personal_content,has_submit_lock,has_single_approver`);
const b2Bad = doRows.filter(d => !d.singular_label || !d.plural_label);
console.log(`  B2 ${b2Bad.length === 0 ? "✓" : "❌"} singular/plural labels: ${b2Bad.length} missing`);

const b3Bad = doRows.filter(d => !String(d.data_object_name).includes("_") && !d.is_canonical_bare_word);
console.log(`  B3 ${b3Bad.length === 0 ? "✓" : "❌"} naming arbitration: ${b3Bad.length} bare-word without canonical claim`);

// B4 considered (positive evidence: notes annotation OR any flag set OR justified empty)
const b4Notes = doRows.filter(d => String(d.notes ?? "").length > 0 || d.has_personal_content || d.has_submit_lock || d.has_single_approver);
console.log(`  B4 ${b4Notes.length === doRows.length ? "✓" : "·"} pattern flags considered: ${b4Notes.length}/${doRows.length}`);

// B6 intra-domain relationships
const intraRels = await get(`/data_object_relationships?and=(data_object_id.in.(${masterIds.join(",")}),related_data_object_id.in.(${masterIds.join(",")}))&select=data_object_id,relationship_verb,related_data_object_id`);
console.log(`  B6 ${intraRels.length >= 3 ? "✓" : "·"} intra-domain relationships: ${intraRels.length}`);

// B7 users edges
const usersId = 748;
const userRels = await get(`/data_object_relationships?and=(data_object_id.eq.${usersId},related_data_object_id.in.(${masterIds.join(",")}))&select=data_object_id,related_data_object_id`);
console.log(`  B7 ${userRels.length >= 1 ? "✓" : "❌"} users edges: ${userRels.length}`);

// B8 outbound cross-domain relationships
const outboundRels = await get(`/data_object_relationships?and=(data_object_id.in.(${masterIds.join(",")}),related_data_object_id.not.in.(${masterIds.join(",")}))&select=data_object_id,relationship_verb,related_data_object_id`);
console.log(`  B8 ${outboundRels.length >= 1 ? "✓" : "·"} outbound cross-domain relationships: ${outboundRels.length}`);

// B9 trigger events + outbound handoffs
const triggers = await get(`/trigger_events?data_object_id=in.(${masterIds.join(",")})&select=id,event_name`);
const outHandoffs = await get(`/handoffs?source_domain_id=eq.${PIM_ID}&target_domain_id=neq.${PIM_ID}&select=id,trigger_event_id`);
console.log(`  B9 ${(triggers.length >= 5 && outHandoffs.length >= 3) ? "✓" : "❌"} trigger_events=${triggers.length} outbound handoffs=${outHandoffs.length}`);

// B9b intra-domain handoffs (≥2 modules so applicable)
const intraHandoffs = await get(`/handoffs?source_domain_id=eq.${PIM_ID}&target_domain_id=eq.${PIM_ID}&select=id`);
console.log(`  B9b ${intraHandoffs.length >= 1 ? "✓" : "❌"} intra-domain handoffs: ${intraHandoffs.length}`);

// B10b per-module attribution on handoffs touching PIM
const allTouching = await get(`/handoffs?or=(source_domain_id.eq.${PIM_ID},target_domain_id.eq.${PIM_ID})&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id`);
const b10bMissingSource = allTouching.filter(h => Number(h.source_domain_id) === PIM_ID && h.source_domain_module_id == null).length;
const b10bMissingTarget = allTouching.filter(h => Number(h.target_domain_id) === PIM_ID && h.target_domain_module_id == null).length;
console.log(`  B10b ${(b10bMissingSource === 0 && b10bMissingTarget === 0) ? "✓" : "❌"} module attribution: src-missing=${b10bMissingSource} tgt-missing=${b10bMissingTarget} (of ${allTouching.length} total)`);

// B11 aliases on non-self-explanatory masters
const aliases = await get(`/data_object_aliases?data_object_id=in.(${masterIds.join(",")})&select=data_object_id`);
console.log(`  B11 ${aliases.length >= 5 ? "✓" : "·"} aliases: ${aliases.length}`);

// B12 lifecycle states
const lc = await get(`/data_object_lifecycle_states?data_object_id=in.(${masterIds.join(",")})&select=data_object_id,state_name,requires_permission`);
const lcByDo = new Map<number, Row[]>();
for (const r of lc) {
  const k = Number(r.data_object_id);
  if (!lcByDo.has(k)) lcByDo.set(k, []);
  lcByDo.get(k)!.push(r);
}
const noLc = masterIds.filter(m => !lcByDo.has(m));
console.log(`  B12 lifecycle states: ${lc.length} total across ${lcByDo.size}/${masterIds.length} masters. No-LC masters: [${noLc.join(",")}] (must have config-shape notes)`);
for (const m of noLc) {
  const r = doRows.find(d => Number(d.id) === m);
  const note = String(r?.notes ?? "");
  if (!note.toLowerCase().includes("config")) fail.push(`B12: master ${m} (${r?.data_object_name}) has no lifecycle states and no config-shape exemption note`);
}

// =========================================================================
// C. Phase C
// =========================================================================
console.log("\n=== C-band ===");
const bfd = await get(`/business_function_domains?domain_id=eq.${PIM_ID}&select=responsibility_type,business_function_id`);
const owners = bfd.filter(r => r.responsibility_type === "owner");
console.log(`  C1 ${owners.length >= 1 ? "✓" : "❌"} owner rows: ${owners.length}, total bfd rows: ${bfd.length}`);

// =========================================================================
// E. Phase E
// =========================================================================
console.log("\n=== E-band ===");
const roles = await get(`/roles?business_function_id=in.(${[22, 19].join(",")})&role_code=like.*PIM*&select=id,role_code`);
const rolesByCode = await get(`/roles?role_code=in.(MARKETING-PIM-ADMIN,MARKETING-MERCHANDISING-MGR,MARKETING-PRODUCT-CONTENT-EDITOR,MARKETING-SYNDICATION-OPS,PROCUREMENT-PIM-SUPPLIER-LIAISON)&select=id,role_code`);
const roleIds = rolesByCode.map(r => Number(r.id));
console.log(`  E1 ${roleIds.length >= 3 ? "✓" : "❌"} PIM-touching roles: ${roleIds.length}`);

// E2 2-module floor
let e2Bad = 0;
for (const rid of roleIds) {
  const rm = await get(`/role_modules?role_id=eq.${rid}&select=id`);
  if (rm.length < 2) e2Bad++;
}
console.log(`  E2 ${e2Bad === 0 ? "✓" : "❌"} 2-module floor: ${e2Bad} roles below`);

// E3 interaction_level set
const rmNull = await get(`/role_modules?role_id=in.(${roleIds.join(",")})&interaction_level=is.null&select=id`);
console.log(`  E3 ${rmNull.length === 0 ? "✓" : "❌"} interaction_level set: ${rmNull.length} missing`);

// E4 every role has ≥1 permission
let e4Bad = 0;
for (const rid of roleIds) {
  const rp = await get(`/role_permissions?role_id=eq.${rid}&select=role_id`);
  if (rp.length === 0) e4Bad++;
}
console.log(`  E4 ${e4Bad === 0 ? "✓" : "❌"} non-empty bundles: ${e4Bad} empty`);

// =========================================================================
// F. Skill-layer (Rule #17)
// =========================================================================
console.log("\n=== F-band ===");
const sysSkillsByModule = new Map<number, Row[]>();
for (const mid of allModuleIds) sysSkillsByModule.set(mid, []);
const sysSkills = await get(`/skills?domain_module_id=in.(${allModuleIds.join(",")})&skill_type=eq.system&select=id,skill_name,domain_module_id`);
for (const s of sysSkills) sysSkillsByModule.get(Number(s.domain_module_id))!.push(s);
let f2Bad = 0;
for (const [mid, skills] of sysSkillsByModule.entries()) {
  if (skills.length !== 1) { f2Bad++; fail.push(`F2: module ${mid} has ${skills.length} system skills (need exactly 1)`); }
}
console.log(`  F2 ${f2Bad === 0 ? "✓" : "❌"} exactly-one system skill per module: ${f2Bad} bad`);

// F3 ≥1 skill_tools per system skill
const skillIdList = sysSkills.map(s => Number(s.id));
let f3Bad = 0;
for (const sid of skillIdList) {
  const st = await get(`/skill_tools?skill_id=eq.${sid}&select=id`);
  if (st.length < 1) f3Bad++;
}
console.log(`  F3 ${f3Bad === 0 ? "✓" : "❌"} skill_tools floor: ${f3Bad} empty skills`);

// F5 Semantius score per module + rollup
const stWithTools = await get(`/skill_tools?skill_id=in.(${skillIdList.join(",")})&select=skill_id,requirement_level,tool:tools(tool_name,coverage_tier)`);
const perSkill = new Map<number, { total: number; platform: number; ops: number }>();
for (const sid of skillIdList) perSkill.set(sid, { total: 0, platform: 0, ops: 0 });
for (const r of stWithTools) {
  const s = perSkill.get(Number(r.skill_id))!;
  s.total++;
  const tier = (r.tool as Row).coverage_tier;
  if (tier === "platform") { s.platform++; s.ops++; }
  if (tier === "integration") s.ops++;
}
console.log(`  F5 Semantius scores:`);
for (const s of sysSkills) {
  const m = perSkill.get(Number(s.id))!;
  console.log(`     ${s.skill_name}: strict=${(m.platform / m.total * 100).toFixed(0)}% operational=${(m.ops / m.total * 100).toFixed(0)}% (${m.platform}/${m.ops}/${m.total})`);
}
let tot = { p: 0, o: 0, t: 0 };
for (const v of perSkill.values()) { tot.p += v.platform; tot.o += v.ops; tot.t += v.total; }
console.log(`     PIM domain rollup: strict=${(tot.p / tot.t * 100).toFixed(1)}% operational=${(tot.o / tot.t * 100).toFixed(1)}% (${tot.p}/${tot.o}/${tot.t})`);

// F7 channel-primitive misuse check
const channelTools = ["send_email", "send_sms", "post_chat_message", "make_phone_call", "send_push_notification", "send_whatsapp_message"];
const channelLinks = await get(`/skill_tools?skill_id=in.(${skillIdList.join(",")})&select=skill_id,notes,tool:tools!inner(tool_name)&tool.tool_name=in.(${channelTools.join(",")})`);
const f7Bad = channelLinks.filter(r => {
  const note = String(r.notes ?? "").toLowerCase();
  return note.length === 0 || /(reminder|notification|confirmation|notify\b)/.test(note);
}).length;
console.log(`  F7 ${f7Bad === 0 ? "✓" : "❌"} channel-primitive misuse: ${f7Bad} suspect rows (${channelLinks.length} total channel links)`);

// =========================================================================
// Summary
// =========================================================================
console.log("\n=== SUMMARY ===");
if (fail.length === 0) console.log("✅ All in-scope checks pass.");
else {
  console.log(`❌ ${fail.length} failure(s):`);
  for (const f of fail) console.log(`  - ${f}`);
}
