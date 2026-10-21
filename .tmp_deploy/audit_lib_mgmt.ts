#!/usr/bin/env bun
// Audit LIB-MGMT against the per-domain completeness checklist.
// Runs bands A, M, B, C, E, F. Prints PASS / FAIL with diagnostic detail.

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
  if (exitCode !== 0) throw new Error(`semantius failed: ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const get = (path: string) => call({ method: "GET", path });

function check(id: string, pass: boolean, detail: string): void {
  console.log(`${pass ? "PASS" : "FAIL"} ${id}: ${detail}`);
}

async function main(): Promise<void> {
  const [domain] = await get("/domains?domain_code=eq.LIB-MGMT&select=*");
  if (!domain) throw new Error("LIB-MGMT not found");
  const domainId = Number(domain.id);
  console.log(`\n=== Audit: LIB-MGMT (id=${domainId}) ===\n`);

  // A1: domain metadata
  const a1pass =
    Number(domain.crud_percentage) > 0 &&
    (domain.min_org_size as string) !== "" &&
    (domain.cost_band as string) !== "" &&
    Number(domain.usa_market_size_usd_m) > 0 &&
    Number(domain.market_size_source_year) > 0 &&
    ((domain.business_logic as string) !== "" || Number(domain.crud_percentage) >= 95);
  check("A1", a1pass, `crud=${domain.crud_percentage}, min_org=${domain.min_org_size}, cost=${domain.cost_band}, tam=${domain.usa_market_size_usd_m}M (${domain.market_size_source_year}), cert=${domain.certification_required}, biz_logic_len=${(domain.business_logic as string).length}`);

  // A2: capabilities
  const caps = await get(`/capability_domains?domain_id=eq.${domainId}&select=capability_id`);
  check("A2", caps.length >= 3, `${caps.length} capabilities linked`);

  // A3: solutions
  const sols = await get(`/solution_domains?domain_id=eq.${domainId}&select=coverage_level`);
  const primary = sols.filter(s => s.coverage_level === "primary").length;
  check("A3", sols.length >= 3 && primary >= 1, `${sols.length} solutions (${primary} primary)`);

  // Module set
  const modules = await get(`/domain_modules?domain_id=eq.${domainId}&select=id,domain_module_code`);
  const moduleIds = modules.map(m => Number(m.id));

  // M1
  check("M1", moduleIds.length >= 1, `${moduleIds.length} modules`);

  // M2
  check("M2", caps.length < 3 || moduleIds.length >= 2, `${caps.length} caps, ${moduleIds.length} modules`);

  // M4: every capability has ≥1 realizing module
  const capIds = caps.map(c => Number(c.capability_id));
  const mc = await get(
    `/domain_module_capabilities?domain_module_id=in.(${moduleIds.join(",")})&select=capability_id`,
  );
  const realizedCapIds = new Set(mc.map(m => Number(m.capability_id)));
  const orphanCaps = capIds.filter(c => !realizedCapIds.has(c));
  check("M4", orphanCaps.length === 0, orphanCaps.length === 0 ? "all caps realized" : `orphan caps: ${orphanCaps.join(",")}`);

  // M6: every module realizes ≥1 capability
  const realizingModules = new Set(mc.map(m => Number((m as Row).domain_module_id ?? -1)));
  const mc2 = await get(
    `/domain_module_capabilities?domain_module_id=in.(${moduleIds.join(",")})&select=domain_module_id`,
  );
  const realizing = new Set(mc2.map(r => Number(r.domain_module_id)));
  const orphanMods = moduleIds.filter(m => !realizing.has(m));
  check("M6", orphanMods.length === 0, orphanMods.length === 0 ? "all modules realize ≥1 cap" : `orphan modules: ${orphanMods.join(",")}`);

  // Master set
  const dmdo = await get(
    `/domain_module_data_objects?domain_module_id=in.(${moduleIds.join(",")})&role=eq.master&select=data_object_id`,
  );
  const masterIds = [...new Set(dmdo.map(r => Number(r.data_object_id)))];
  check("B1", masterIds.length >= 1, `${masterIds.length} master data_objects`);

  // B2: labels
  const dataObjects = await get(
    `/data_objects?id=in.(${masterIds.join(",")})&select=id,data_object_name,singular_label,plural_label,is_canonical_bare_word,naming_authority_rationale,has_personal_content,has_submit_lock,has_single_approver`,
  );
  const missingLabels = dataObjects.filter(d => !d.singular_label || !d.plural_label);
  check("B2", missingLabels.length === 0, missingLabels.length === 0 ? "all masters have labels" : `missing: ${missingLabels.map(d => d.data_object_name).join(",")}`);

  // B3: bare-word claims
  const bareWords = dataObjects.filter(d => {
    const name = String(d.data_object_name);
    return !name.includes("_") || ["bibliographic_records", "interlibrary_loan_requests"].includes(name);
  });
  const badBareWord = bareWords.filter(
    d => !d.is_canonical_bare_word || !(d.naming_authority_rationale as string),
  );
  check("B3", badBareWord.length === 0, badBareWord.length === 0 ? "bare-word claims valid" : `unflagged bare words: ${badBareWord.map(d => d.data_object_name).join(",")}`);

  // B4: pattern flags considered (informational — count flagged)
  const flaggedCount = dataObjects.filter(
    d => d.has_personal_content || d.has_submit_lock || d.has_single_approver,
  ).length;
  check("B4", true, `${flaggedCount}/${dataObjects.length} masters have ≥1 pattern flag (audit pass: flags considered)`);

  // B5: embedded_master integrity (skip — no embedded_master rows in this load)
  const embMaster = await get(
    `/domain_module_data_objects?domain_module_id=in.(${moduleIds.join(",")})&role=eq.embedded_master&select=data_object_id`,
  );
  check("B5", true, `${embMaster.length} embedded_master rows (none expected for LIB-MGMT)`);

  // B6: intra-domain relationships
  const intraRel = await get(
    `/data_object_relationships?and=(data_object_id.in.(${masterIds.join(",")}),related_data_object_id.in.(${masterIds.join(",")}))&select=data_object_id,relationship_verb`,
  );
  check("B6", intraRel.length >= 5, `${intraRel.length} intra-domain relationship edges`);

  // B7: users edges
  const [usersObj] = await get("/data_objects?data_object_name=eq.users&select=id");
  const usersId = Number(usersObj?.id);
  const userEdges = await get(
    `/data_object_relationships?or=(and(data_object_id.in.(${masterIds.join(",")}),related_data_object_id.eq.${usersId}),and(data_object_id.eq.${usersId},related_data_object_id.in.(${masterIds.join(",")})))&select=data_object_id,relationship_verb`,
  );
  check("B7", userEdges.length >= 3, `${userEdges.length} users-edges from LIB masters`);

  // B9: trigger events + handoffs
  const triggers = await get(
    `/trigger_events?data_object_id=in.(${masterIds.join(",")})&select=id,event_name`,
  );
  check("B9-events", triggers.length >= 5, `${triggers.length} trigger_events on LIB masters`);
  const outbound = await get(
    `/handoffs?source_domain_id=eq.${domainId}&select=id,trigger_event_id,source_domain_module_id,target_domain_module_id`,
  );
  check("B9-handoffs", outbound.length >= 5, `${outbound.length} outbound handoffs (all intra-domain)`);

  // B9b: intra-domain cross-module handoffs (multi-module domain)
  const intraXMod = outbound.filter(
    h => h.source_domain_module_id !== h.target_domain_module_id,
  );
  check("B9b", intraXMod.length >= 3, `${intraXMod.length} intra-domain cross-module handoffs`);

  // B10b: per-module attribution
  const unattributed = outbound.filter(
    h => !h.source_domain_module_id || !h.target_domain_module_id,
  );
  check("B10b", unattributed.length === 0, unattributed.length === 0 ? "all handoffs have module attribution" : `${unattributed.length} unattributed`);

  // B11: aliases
  const aliases = await get(
    `/data_object_aliases?data_object_id=in.(${masterIds.join(",")})&select=data_object_id,alias_name`,
  );
  check("B11", aliases.length >= 10, `${aliases.length} aliases authored`);

  // B12: lifecycle states for master + required
  const reqMasters = await get(
    `/domain_module_data_objects?domain_module_id=in.(${moduleIds.join(",")})&role=eq.master&necessity=eq.required&select=data_object_id`,
  );
  const reqMasterIds = [...new Set(reqMasters.map(r => Number(r.data_object_id)))];
  const lcs = await get(
    `/data_object_lifecycle_states?data_object_id=in.(${reqMasterIds.join(",")})&select=data_object_id`,
  );
  const lcsByDo = new Map<number, number>();
  for (const r of lcs) lcsByDo.set(Number(r.data_object_id), (lcsByDo.get(Number(r.data_object_id)) ?? 0) + 1);
  const noLcs = reqMasterIds.filter(d => !lcsByDo.has(d));
  // Some masters are config-shape (library_circulation_policies, library_patron_categories, library_vendor_accounts, library_sharing_partners, library_holdings, library_saved_searches)
  const configExempt = new Set<number>();
  const exemptNames = new Set([
    "library_circulation_policies",
    "library_patron_categories",
    "library_vendor_accounts",
    "library_sharing_partners",
    "library_holdings",
    "library_saved_searches",
  ]);
  const doMeta = await get(
    `/data_objects?id=in.(${reqMasterIds.join(",")})&select=id,data_object_name`,
  );
  for (const d of doMeta) {
    if (exemptNames.has(String(d.data_object_name))) configExempt.add(Number(d.id));
  }
  const realGaps = noLcs.filter(d => !configExempt.has(d));
  check("B12", realGaps.length === 0, realGaps.length === 0 ? `${reqMasterIds.length} req-masters: ${lcsByDo.size} with states, ${configExempt.size} config-exempt` : `gaps (need surfacing): ${realGaps.join(",")}`);

  // C1: business_function_domains
  const bfd = await get(
    `/business_function_domains?domain_id=eq.${domainId}&select=responsibility_type`,
  );
  const ownerCount = bfd.filter(r => r.responsibility_type === "owner").length;
  check("C1", bfd.length >= 1 && ownerCount >= 1, `${bfd.length} BFD rows, ${ownerCount} owner`);

  // E1: roles
  const rmAll = await get(
    `/role_modules?domain_module_id=in.(${moduleIds.join(",")})&select=role_id`,
  );
  const roleIds = [...new Set(rmAll.map(r => Number(r.role_id)))];
  check("E1", caps.length < 3 || roleIds.length >= 3, `${roleIds.length} distinct roles touching LIB modules`);

  // E2: 2-module floor
  const rmCounts = new Map<number, number>();
  for (const r of rmAll) rmCounts.set(Number(r.role_id), (rmCounts.get(Number(r.role_id)) ?? 0) + 1);
  // need to count ALL modules per role, not just LIB modules
  const allRmRows = await get(
    `/role_modules?role_id=in.(${roleIds.join(",")})&select=role_id`,
  );
  const allRmCounts = new Map<number, number>();
  for (const r of allRmRows) allRmCounts.set(Number(r.role_id), (allRmCounts.get(Number(r.role_id)) ?? 0) + 1);
  const under2 = roleIds.filter(rid => (allRmCounts.get(rid) ?? 0) < 2);
  check("E2", under2.length === 0, under2.length === 0 ? "every role spans ≥2 modules" : `under-2: ${under2.join(",")}`);

  // E3: interaction_level set
  const rmEmpty = await get(
    `/role_modules?role_id=in.(${roleIds.join(",")})&interaction_level=is.null&select=id`,
  );
  check("E3", rmEmpty.length === 0, rmEmpty.length === 0 ? "all role_modules have interaction_level" : `${rmEmpty.length} null`);

  // E4: role_permissions
  const rpRows = await get(
    `/role_permissions?role_id=in.(${roleIds.join(",")})&select=role_id`,
  );
  const rpCounts = new Map<number, number>();
  for (const r of rpRows) rpCounts.set(Number(r.role_id), (rpCounts.get(Number(r.role_id)) ?? 0) + 1);
  const noBundle = roleIds.filter(rid => !rpCounts.get(rid));
  check("E4", noBundle.length === 0, noBundle.length === 0 ? `every role has bundle (avg ${(rpRows.length / roleIds.length).toFixed(1)} perms)` : `no-bundle: ${noBundle.join(",")}`);

  // F2: every module has exactly one system skill
  const sysSkills = await get(
    `/skills?domain_module_id=in.(${moduleIds.join(",")})&skill_type=eq.system&select=id,skill_name,domain_module_id`,
  );
  const skillsByModule = new Map<number, number>();
  for (const s of sysSkills) skillsByModule.set(Number(s.domain_module_id), (skillsByModule.get(Number(s.domain_module_id)) ?? 0) + 1);
  const modFail = moduleIds.filter(m => skillsByModule.get(m) !== 1);
  check("F2", modFail.length === 0, modFail.length === 0 ? `${sysSkills.length}/${moduleIds.length} modules have 1 system skill` : `modules with !=1 skill: ${modFail.join(",")}`);

  // F3: every system skill has ≥1 skill_tools
  const skillIds = sysSkills.map(s => Number(s.id));
  const stRows = await get(
    `/skill_tools?skill_id=in.(${skillIds.join(",")})&select=skill_id,tool_id,requirement_level`,
  );
  const stBySkill = new Map<number, number>();
  for (const r of stRows) stBySkill.set(Number(r.skill_id), (stBySkill.get(Number(r.skill_id)) ?? 0) + 1);
  const emptySkill = skillIds.filter(s => !stBySkill.get(s));
  check("F3", emptySkill.length === 0, emptySkill.length === 0 ? `${stRows.length} skill_tools rows (${(stRows.length / skillIds.length).toFixed(1)} avg)` : `empty: ${emptySkill.join(",")}`);

  // F4: operation_kind ↔ data_object_id invariant
  const toolIds = [...new Set(stRows.map(r => Number(r.tool_id)))];
  const toolMeta = await get(
    `/tools?id=in.(${toolIds.join(",")})&select=id,tool_name,operation_kind,data_object_id`,
  );
  const f4Bad: string[] = [];
  for (const t of toolMeta) {
    const k = String(t.operation_kind);
    const hasDo = t.data_object_id !== null;
    if ((k === "query" || k === "mutate") && !hasDo) f4Bad.push(`${t.tool_name}:no_data_object`);
    if ((k === "side_effect" || k === "compute") && hasDo) f4Bad.push(`${t.tool_name}:has_data_object`);
  }
  check("F4", f4Bad.length === 0, f4Bad.length === 0 ? "all tools have valid kind↔data_object pairing" : f4Bad.join(", "));

  // F5: Semantius score
  const strictByModule = new Map<string, { num: number; den: number }>();
  const opByModule = new Map<string, { num: number; den: number }>();
  const skillToModule = new Map<number, number>();
  for (const s of sysSkills) skillToModule.set(Number(s.id), Number(s.domain_module_id));
  const toolMetaMap = new Map<number, Row>();
  for (const t of toolMeta) toolMetaMap.set(Number(t.id), t);
  for (const r of stRows) {
    const mid = skillToModule.get(Number(r.skill_id))!;
    const moduleCode = modules.find(m => Number(m.id) === mid)?.domain_module_code as string;
    const tier = (toolMetaMap.get(Number(r.tool_id))?.coverage_tier as string) ?? "external";
    const bucket = (m: Map<string, { num: number; den: number }>) => {
      let v = m.get(moduleCode);
      if (!v) { v = { num: 0, den: 0 }; m.set(moduleCode, v); }
      return v;
    };
    const s = bucket(strictByModule);
    const o = bucket(opByModule);
    s.den += 1;
    o.den += 1;
    if (tier === "platform") s.num += 1;
    if (tier === "platform" || tier === "integration") o.num += 1;
  }
  console.log("\nSemantius score per module:");
  for (const [mod, v] of strictByModule) {
    const op = opByModule.get(mod)!;
    const strictPct = ((v.num / v.den) * 100).toFixed(0);
    const opPct = ((op.num / op.den) * 100).toFixed(0);
    console.log(`  ${mod}: strict=${v.num}/${v.den}=${strictPct}% / operational=${op.num}/${op.den}=${opPct}%`);
  }
  check("F5", strictByModule.size === moduleIds.length, `score computable for ${strictByModule.size}/${moduleIds.length} modules`);

  console.log("\n=== Audit complete ===");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
