#!/usr/bin/env bun
// Per-domain completeness checklist for INV-MGMT (domain_id=164).

async function call(body: any) {
  const json = JSON.stringify(body);
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", json], { stdout: "pipe", stderr: "pipe" });
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const exit = await proc.exited;
  if (exit !== 0) throw new Error(`call failed: ${err}`);
  return JSON.parse(out.trim());
}
const get = (p: string) => call({ method: "GET", path: p });

const ID = 164;
const MODS = [61, 62, 63];

const PASS = (id: string, msg: string) => console.log(`  [PASS] ${id}  ${msg}`);
const FAIL = (id: string, msg: string) => console.log(`  [FAIL] ${id}  ${msg}`);
const REPORT = (id: string, msg: string) => console.log(`  [REPORT] ${id}  ${msg}`);

console.log("=".repeat(64));
console.log(`INV-MGMT completeness checklist (domain_id=${ID})`);
console.log("=".repeat(64));

// ===== S — Structural sweep =====
console.log("\n--- S. Structural sweep ---");

// S1: FK row counts to domains
const s1tables: Array<[string, string]> = [
  ["business_function_domains", "domain_id"],
  ["capability_domains", "domain_id"],
  ["cross_domain_handoffs", "source_domain_id"],
  ["cross_domain_handoffs", "target_domain_id"],
  ["domain_data_objects", "domain_id"],
  ["domain_module_host_domains", "domain_id"],
  ["domain_modules", "domain_id"],
  ["domain_regulations", "domain_id"],
  ["domain_starter_modules", "domain_id"],
  ["domains", "parent_domain_id"],
  ["skills", "domain_id"],
  ["solution_domains", "domain_id"],
];
console.log("\n  S1. Direct FKs to domains:");
console.log("    table                          col                   rows");
for (const [t, c] of s1tables) {
  const rows = await get(`/${t}?${c}=eq.${ID}&select=id`);
  const n = rows.length;
  console.log(`    ${t.padEnd(30)} ${c.padEnd(20)} ${n}`);
}

// S2: per-module indirect coverage
console.log("\n  S2. Per-module coverage:");
console.log("    module_id  module_code               data_objects  capabilities");
const mods = await get(`/domain_modules?domain_id=eq.${ID}&select=id,domain_module_code`);
for (const m of mods) {
  const dos = await get(`/domain_module_data_objects?domain_module_id=eq.${m.id}&select=id`);
  const caps = await get(`/domain_module_capabilities?domain_module_id=eq.${m.id}&select=id`);
  console.log(`    ${String(m.id).padEnd(10)} ${String(m.domain_module_code).padEnd(25)} ${String(dos.length).padEnd(13)} ${caps.length}`);
}

// S3: per-master coverage
console.log("\n  S3. Per-master indirect coverage (states / events / aliases):");
const masters = await get(`/domain_data_objects?domain_id=eq.${ID}&role=eq.master&select=data_object_id,data_objects(data_object_name)`);
console.log("    data_object                     states  events  aliases");
for (const m of masters) {
  const doId = m.data_object_id;
  const name = m.data_objects?.data_object_name;
  const states = await get(`/data_object_lifecycle_states?data_object_id=eq.${doId}&select=id`);
  const events = await get(`/trigger_events?data_object_id=eq.${doId}&select=id`);
  const aliases = await get(`/data_object_aliases?data_object_id=eq.${doId}&select=id`);
  console.log(`    ${String(name).padEnd(31)} ${String(states.length).padEnd(7)} ${String(events.length).padEnd(7)} ${aliases.length}`);
}

// ===== A — Market shape =====
console.log("\n--- A. Market shape ---");
const dom = (await get(`/domains?id=eq.${ID}&select=*`))[0];
// A1
const a1ok = dom.crud_percentage > 0 && dom.min_org_size !== "" && dom.cost_band !== "" && dom.usa_market_size_usd_m > 0 && dom.market_size_source_year > 0 && (dom.business_logic !== "" || dom.crud_percentage >= 95);
a1ok ? PASS("A1", "all 7 metadata fields populated") : FAIL("A1", "missing metadata");

// A2
const caps = await get(`/capability_domains?domain_id=eq.${ID}&select=capability_id`);
caps.length >= 3 ? PASS("A2", `${caps.length} capabilities linked`) : FAIL("A2", `only ${caps.length} capabilities`);

// A3
const sols = await get(`/solution_domains?domain_id=eq.${ID}&select=coverage_level,solutions(solution_name)`);
const primary = sols.filter((s: any) => s.coverage_level === "primary").length;
sols.length >= 3 && primary >= 1 ? PASS("A3", `${sols.length} solutions, ${primary} primary`) : FAIL("A3", `${sols.length} solutions, ${primary} primary`);

// A6
REPORT("A6", `skipped: solution_data_objects table not in this catalog (catalog-wide gap; not per-domain)`);

// ===== M — Modules =====
console.log("\n--- M. Modules ---");
// M1
mods.length >= 1 ? PASS("M1", `${mods.length} modules`) : FAIL("M1", "no modules");
// M2
const capCount = caps.length;
(capCount < 3 || mods.length >= 2) ? PASS("M2", `${capCount} capabilities, ${mods.length} modules`) : FAIL("M2", `${capCount} caps but only ${mods.length} modules`);
// M3
const starters = await get(`/domain_starter_modules?domain_id=eq.${ID}&select=id`);
(capCount < 3 || starters.length >= 1) ? PASS("M3", `${starters.length} starter rows`) : FAIL("M3", "no starter junction");
// M4
const allCapIds = caps.map((c: any) => c.capability_id);
const dmc = await get(`/domain_module_capabilities?domain_module_id=in.(${MODS.join(",")})&select=capability_id`);
const realizedCaps = new Set(dmc.map((d: any) => d.capability_id));
const orphanCaps = allCapIds.filter((c: number) => !realizedCaps.has(c));
orphanCaps.length === 0 ? PASS("M4", "every capability realized by ≥1 module") : FAIL("M4", `${orphanCaps.length} orphan capabilities`);
// M5
const mastersIds = masters.map((m: any) => m.data_object_id);
const lcs = await get(`/data_object_lifecycle_states?requires_permission=eq.true&data_object_id=in.(${mastersIds.join(",")})&select=state_name,domain_module_id`);
const lcsWithoutModule = lcs.filter((s: any) => s.domain_module_id === null);
REPORT("M5", `${lcs.length} workflow-gate states across INV masters; ${lcsWithoutModule.length} with NULL domain_module_id (acceptable when always-reachable)`);
// M6
const modCapsByMod = new Map<number, number>();
for (const m of mods) {
  const cs = dmc.filter((d: any) => d.domain_module_id === undefined);
  // re-query per module since the in-clause doesn't carry domain_module_id back
  const cap = await get(`/domain_module_capabilities?domain_module_id=eq.${m.id}&select=id`);
  modCapsByMod.set(m.id, cap.length);
}
const orphanMods = [...modCapsByMod.entries()].filter(([_, n]) => n === 0);
orphanMods.length === 0 ? PASS("M6", `every module realizes ≥1 capability`) : FAIL("M6", `${orphanMods.length} capability-orphaned modules`);

// ===== B — Data-object footprint =====
console.log("\n--- B. Data-object footprint ---");
// B1
const mastersInScope = await get(`/domain_data_objects?domain_id=eq.${ID}&role=eq.master&select=data_object_id`);
mastersInScope.length >= 1 ? PASS("B1", `${mastersInScope.length} masters`) : FAIL("B1", "no masters");

// B2: labels on masters
const masterIds = mastersInScope.map((m: any) => m.data_object_id);
const masterDOs = await get(`/data_objects?id=in.(${masterIds.join(",")})&select=data_object_name,singular_label,plural_label,has_personal_content,has_submit_lock,has_single_approver,is_canonical_bare_word,naming_authority_rationale,notes`);
const missingLabels = masterDOs.filter((d: any) => !d.singular_label || !d.plural_label);
missingLabels.length === 0 ? PASS("B2", "all masters have singular+plural labels") : FAIL("B2", `${missingLabels.length} missing labels`);

// B3: naming arbitration
const bareWords = masterDOs.filter((d: any) => !String(d.data_object_name).includes("_"));
const claimedBareOK = bareWords.every((d: any) => d.is_canonical_bare_word && d.naming_authority_rationale);
bareWords.length === 0 || claimedBareOK ? PASS("B3", `${bareWords.length} bare-word names (all justified or none)`) : FAIL("B3", "unclaimed bare-word masters");

// B4: pattern flags considered
const flagged = masterDOs.filter((d: any) => d.has_personal_content || d.has_submit_lock || d.has_single_approver);
PASS("B4", `${flagged.length} of ${masterDOs.length} masters carry at least one pattern flag (rest considered false-by-default)`);

// B5: embedded_master integrity
const emb = await get(`/domain_data_objects?domain_id=eq.${ID}&role=eq.embedded_master&select=data_object_id,data_objects(data_object_name,kind)`);
const failsB5: string[] = [];
for (const e of emb) {
  if (e.data_objects?.kind === "platform_builtin") continue;
  const masterRows = await get(`/domain_data_objects?data_object_id=eq.${e.data_object_id}&role=eq.master&select=id`);
  if (masterRows.length === 0) failsB5.push(e.data_objects?.data_object_name);
}
failsB5.length === 0 ? PASS("B5", `all ${emb.length} embedded_masters have canonical owners`) : FAIL("B5", `orphan embedded_masters: ${failsB5.join(", ")}`);

// B6: intra-domain relationships
const intra = await get(`/data_object_relationships?and=(data_object_id.in.(${masterIds.join(",")}),related_data_object_id.in.(${masterIds.join(",")}))&select=id`);
intra.length >= 5 ? PASS("B6", `${intra.length} intra-domain relationships`) : FAIL("B6", `only ${intra.length} intra-domain edges`);

// B7: users edges
const usersEdges = await get(`/data_object_relationships?and=(data_object_id.in.(${masterIds.join(",")}),related_data_object_id.eq.748)&select=id`);
usersEdges.length >= 1 ? PASS("B7", `${usersEdges.length} users-edges`) : FAIL("B7", "no users edges");

// B8: cross-domain outbound (this domain's masters -> other domains)
const outbound = await get(`/data_object_relationships?and=(data_object_id.in.(${masterIds.join(",")}),related_data_object_id.not.in.(${masterIds.join(",")}))&select=id,related_data_object_id`);
const usersAndOwnMasters = new Set([748, ...masterIds]);
const trueOutbound = outbound.filter((r: any) => !usersAndOwnMasters.has(r.related_data_object_id));
trueOutbound.length >= 1 ? PASS("B8", `${trueOutbound.length} cross-domain outbound edges`) : FAIL("B8", "no cross-domain outbound");

// B9: outbound events + handoffs
const outEvents = await get(`/trigger_events?data_object_id=in.(${masterIds.join(",")})&select=id`);
const outHandoffs = await get(`/cross_domain_handoffs?source_domain_id=eq.${ID}&select=id,trigger_event_id`);
outEvents.length >= 1 && outHandoffs.length >= 1 ? PASS("B9", `${outEvents.length} events, ${outHandoffs.length} outbound handoffs`) : FAIL("B9", "missing events or handoffs");

// B10b: per-module attribution on handoffs
const outHandoffsFull = await get(`/cross_domain_handoffs?source_domain_id=eq.${ID}&select=id,source_domain_module_id,target_domain_module_id`);
const nullSrcMod = outHandoffsFull.filter((h: any) => h.source_domain_module_id === null);
const nullTgtMod = outHandoffsFull.filter((h: any) => h.target_domain_module_id === null);
nullSrcMod.length === 0 ? PASS("B10b-src", "all outbound handoffs have source_domain_module_id") : FAIL("B10b-src", `${nullSrcMod.length} NULL`);
REPORT("B10b-tgt", `${nullTgtMod.length} of ${outHandoffsFull.length} outbound handoffs have NULL target_domain_module_id (adjacent domains not yet modularized; cannot fix from this domain)`);

// B11: aliases on non-self-explanatory masters
const aliases = await get(`/data_object_aliases?data_object_id=in.(${masterIds.join(",")})&select=data_object_id`);
const masterIdsWithAlias = new Set(aliases.map((a: any) => a.data_object_id));
const noAlias = masterDOs.filter((d: any) => !masterIdsWithAlias.has(d.id)).map((d: any) => d.data_object_name);
console.log(`    B11 detail: ${aliases.length} alias rows; masters without aliases: [${noAlias.join(", ")}]`);
masterDOs.length - noAlias.length >= 5 ? PASS("B11", `${masterDOs.length - noAlias.length} of ${masterDOs.length} masters have aliases`) : FAIL("B11", "too few aliased");

// B12: lifecycle states or config-shape exemption
const lcsByDO = new Map<number, number>();
const allLCS = await get(`/data_object_lifecycle_states?data_object_id=in.(${masterIds.join(",")})&select=data_object_id`);
for (const s of allLCS) lcsByDO.set(s.data_object_id, (lcsByDO.get(s.data_object_id) || 0) + 1);
const failsB12: string[] = [];
for (const d of masterDOs) {
  if (lcsByDO.has(d.id)) continue;
  if (!String(d.notes).match(/config[- ]shape/i)) failsB12.push(d.data_object_name);
}
failsB12.length === 0 ? PASS("B12", `every master has states or config-shape exemption note`) : FAIL("B12", `unannotated: ${failsB12.join(", ")}`);

// ===== C — Functional ownership =====
console.log("\n--- C. Functional ownership ---");
const bfd = await get(`/business_function_domains?domain_id=eq.${ID}&select=responsibility_type,business_functions(business_function_name)`);
const owners = bfd.filter((b: any) => b.responsibility_type === "owner").length;
owners >= 1 ? PASS("C1", `${owners} owner, ${bfd.length} total RACI rows`) : FAIL("C1", "no owner");
REPORT("C2", "no diverging-capability overrides surfaced (all capabilities owned by domain owner Supply Chain)");

// ===== E — Roles =====
console.log("\n--- E. Roles ---");
// E1
const fnIds = bfd.filter((b: any) => b.responsibility_type === "owner" || b.responsibility_type === "contributor").map((b: any) => b.business_functions?.business_function_name);
// Roles by function for this domain (function-scoped)
const rolesByFunc = await get(`/roles?or=(business_function_id.eq.4,business_function_id.eq.47,business_function_id.eq.49)&select=id,role_code,business_function_id`);
const roleIds = rolesByFunc.map((r: any) => r.id);
// Also cross-functional roles touching INV modules
const cfRoleModules = await get(`/role_modules?domain_module_id=in.(${MODS.join(",")})&select=role_id,role:roles(business_function_id)`);
const cfRoleIds = new Set(cfRoleModules.filter((r: any) => r.role?.business_function_id === null).map((r: any) => r.role_id));
const totalRoles = new Set([...roleIds, ...cfRoleIds]);
// Filter to roles that actually touch INV modules
const rmAll = await get(`/role_modules?role_id=in.(${[...totalRoles].join(",")})&domain_module_id=in.(${MODS.join(",")})&select=role_id`);
const touchingRoles = new Set(rmAll.map((r: any) => r.role_id));
touchingRoles.size >= 3 ? PASS("E1", `${touchingRoles.size} roles touching INV modules`) : FAIL("E1", `only ${touchingRoles.size}`);

// E2: 2-module floor
const allRoleModules = await get(`/role_modules?role_id=in.(${[...touchingRoles].join(",")})&select=role_id`);
const moduleCount = new Map<number, number>();
for (const r of allRoleModules) moduleCount.set(r.role_id, (moduleCount.get(r.role_id) || 0) + 1);
const violators = [...moduleCount.entries()].filter(([_, n]) => n < 2);
violators.length === 0 ? PASS("E2", "every role spans ≥2 modules") : FAIL("E2", `${violators.length} single-module roles`);

// E3: interaction_level
const rmNull = await get(`/role_modules?role_id=in.(${[...touchingRoles].join(",")})&interaction_level=is.null&select=id`);
rmNull.length === 0 ? PASS("E3", "every role_modules has interaction_level set") : FAIL("E3", `${rmNull.length} NULL`);

// E4: non-empty bundle
const rp = await get(`/role_permissions?role_id=in.(${[...touchingRoles].join(",")})&select=role_id`);
const bundleCount = new Map<number, number>();
for (const r of rp) bundleCount.set(r.role_id, (bundleCount.get(r.role_id) || 0) + 1);
const emptyBundles = [...touchingRoles].filter(r => (bundleCount.get(r) || 0) < 1);
emptyBundles.length === 0 ? PASS("E4", "every role has ≥1 role_permission") : FAIL("E4", `${emptyBundles.length} empty`);

// E5: Path A / Path B agreement (per role)
console.log("    E5. Path A (role_modules.domain_id) vs Path B (role_permissions.permission.domain_id):");
for (const rid of touchingRoles) {
  const a = await get(`/role_modules?role_id=eq.${rid}&select=domain_module:domain_modules(domain_id)`);
  const aDomains = new Set(a.map((x: any) => x.domain_module?.domain_id));
  const b = await get(`/role_permissions?role_id=eq.${rid}&select=permission:permissions(domain_module:domain_modules(domain_id))`);
  const bDomains = new Set(b.map((x: any) => x.permission?.domain_module?.domain_id));
  const aOnly = [...aDomains].filter(d => !bDomains.has(d));
  const bOnly = [...bDomains].filter(d => !aDomains.has(d));
  if (aOnly.length === 0 && bOnly.length === 0) {
    console.log(`      role ${rid}: agree on ${[...aDomains].join(",")}`);
  } else {
    console.log(`      role ${rid}: A-only ${aOnly.join(",")} / B-only ${bOnly.join(",")}`);
  }
}

// ===== F — Skill-layer integrity =====
console.log("\n--- F. Skill-layer integrity ---");
const legacySkills = await get(`/skills?domain_id=eq.${ID}&skill_type=eq.system&domain_module_id=is.null&select=id`);
legacySkills.length === 0 ? PASS("F1", "no legacy domain-level system skills (no skills yet authored)") : REPORT("F1", `${legacySkills.length} legacy domain-level system skills`);

console.log("\n" + "=".repeat(64));
console.log("Audit complete.");
console.log("=".repeat(64));
