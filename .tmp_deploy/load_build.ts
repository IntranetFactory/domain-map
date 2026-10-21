#!/usr/bin/env bun
// Idempotent loader for a single domain's full-build draft.
// Reads .tmp_deploy/<CODE>-build.json + <CODE>-existing.json, loads:
//   capabilities, capability_domains, vendors_new, solutions_new, solution_domains,
//   new_data_objects, domain_modules, domain_module_capabilities,
//   domain_module_data_objects, data_object_lifecycle_states, tools,
//   domain_module_tools, system skill (if missing), domain_roles, role_modules.
// record_status + notes are OMITTED (DB defaults: 'new' / ''). Labels are generated.
// Additive only. No deletes, no overwrites of existing non-empty values.
//
// Usage: bun run .tmp_deploy/load_build.ts <DOMAIN_CODE> [--dry]

const CODE = process.argv[2];
const DRY = process.argv.includes("--dry");
if (!CODE) throw new Error("usage: load_build.ts <DOMAIN_CODE> [--dry]");

const buildPath = `c:/dev/domain-map/.tmp_deploy/${CODE}-build.json`;
const existingPath = `c:/dev/domain-map/.tmp_deploy/${CODE}-existing.json`;
const build = JSON.parse(await Bun.file(buildPath).text());
const existing = JSON.parse(await Bun.file(existingPath).text());
const domainId: number = existing.domain.id;
const warn: string[] = [];
const summary: string[] = [];

async function call(body: any): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`semantius failed: ${err}\n${out}`);
  const t = out.trim();
  if (!t) return [];
  const s = t.search(/[\[{]/);
  return JSON.parse(s >= 0 ? t.slice(s) : t);
}
const get = (path: string) => call({ method: "GET", path });
async function post(path: string, rows: any[]): Promise<void> {
  if (rows.length === 0) return;
  if (DRY) { summary.push(`  [dry] would POST ${rows.length} -> ${path}`); return; }
  for (let i = 0; i < rows.length; i += 50) {
    await call({ method: "POST", path, body: rows.slice(i, i + 50) });
  }
}

// ---------- data_object name -> id resolver (existing + newly inserted + fallback query) ----------
const doNameToId = new Map<string, number>();
for (const r of existing.data_objects || []) {
  if (r.data_objects) doNameToId.set(r.data_objects.data_object_name, r.data_objects.id);
}
async function resolveDataObject(name: string): Promise<number | null> {
  if (doNameToId.has(name)) return doNameToId.get(name)!;
  const rows = await get(`/data_objects?data_object_name=eq.${encodeURIComponent(name)}&select=id`);
  if (rows.length) { doNameToId.set(name, rows[0].id); return rows[0].id; }
  return null;
}

// ===================== 1. capabilities =====================
{
  const want = build.capabilities || [];
  const existingCaps = await get(`/capabilities?select=id,capability_code&limit=100000`);
  const codeToId = new Map<string, number>(existingCaps.map((r: any) => [r.capability_code, r.id]));
  const missing = want.filter((c: any) => !codeToId.has(c.capability_code))
    .map((c: any) => ({ capability_code: c.capability_code, capability_name: c.capability_name, description: c.description || c.capability_name }));
  await post("/capabilities", missing);
  const after = await get(`/capabilities?select=id,capability_code&limit=100000`);
  const map = new Map<string, number>(after.map((r: any) => [r.capability_code, r.id]));
  summary.push(`capabilities: +${missing.length} (${want.length} in draft)`);

  // capability_domains link
  const existLinks = await get(`/capability_domains?domain_id=eq.${domainId}&select=capability_id`);
  const linked = new Set<number>(existLinks.map((r: any) => r.capability_id));
  const newLinks = want.map((c: any) => map.get(c.capability_code)).filter((id: any) => id && !linked.has(id))
    .map((id: number) => ({ capability_id: id, domain_id: domainId }));
  await post("/capability_domains", newLinks);
  summary.push(`capability_domains: +${newLinks.length}`);
  // stash for module links
  (globalThis as any).capCodeToId = map;
}
const capCodeToId: Map<string, number> = (globalThis as any).capCodeToId;

// ===================== 2. vendors_new + solutions_new + solution_domains =====================
{
  const vNew = build.vendors_new || [];
  const existV = await get(`/vendors?select=id,vendor_name&limit=100000`);
  const vMap = new Map<string, number>(existV.map((r: any) => [r.vendor_name, r.id]));
  const vMissing = vNew.filter((v: any) => !vMap.has(v.vendor_name))
    .map((v: any) => ({ vendor_name: v.vendor_name, description: v.description || "", vendor_url: v.vendor_url || "", headquarters_country: v.headquarters_country || "" }));
  await post("/vendors", vMissing);
  const afterV = await get(`/vendors?select=id,vendor_name&limit=100000`);
  const vMap2 = new Map<string, number>(afterV.map((r: any) => [r.vendor_name, r.id]));
  summary.push(`vendors: +${vMissing.length}`);

  const sNew = build.solutions_new || [];
  const existS = await get(`/solutions?select=id,solution_name&limit=100000`);
  const sMap = new Map<string, number>(existS.map((r: any) => [r.solution_name, r.id]));
  const sMissing: any[] = [];
  for (const s of sNew) {
    if (sMap.has(s.solution_name)) continue;
    const vid = vMap2.get(s.vendor_name);
    if (!vid) { warn.push(`solution ${s.solution_name}: vendor '${s.vendor_name}' not found, skipping`); continue; }
    sMissing.push({
      solution_name: s.solution_name, vendor_id: vid, description: s.description || `${s.solution_name}.`,
      solution_type: s.solution_type || "saas", solution_kind: "standard_solution",
      solution_url: s.solution_url || "", is_active_in_market: true,
      min_org_size: "", max_org_size: "", cost_band: "",
    });
  }
  await post("/solutions", sMissing);
  const afterS = await get(`/solutions?select=id,solution_name&limit=100000`);
  const sMap2 = new Map<string, number>(afterS.map((r: any) => [r.solution_name, r.id]));
  summary.push(`solutions: +${sMissing.length}`);

  const existSD = await get(`/solution_domains?domain_id=eq.${domainId}&select=solution_id`);
  const sdLinked = new Set<number>(existSD.map((r: any) => r.solution_id));
  const sdNew: any[] = [];
  for (const s of sNew) {
    const sid = sMap2.get(s.solution_name);
    if (sid && !sdLinked.has(sid)) sdNew.push({ solution_id: sid, domain_id: domainId, coverage_level: s.coverage_level || "secondary" });
  }
  await post("/solution_domains", sdNew);
  summary.push(`solution_domains: +${sdNew.length}`);
}

// ===================== 3. new_data_objects (Rule #9 collision check) =====================
{
  const want = build.new_data_objects || [];
  if (want.length) {
    const allDo = await get(`/data_objects?select=data_object_name&limit=100000`);
    const allNames = new Set<string>(allDo.map((r: any) => r.data_object_name));
    const toInsert: any[] = [];
    for (const o of want) {
      const name = o.data_object_name;
      if (allNames.has(name)) { await resolveDataObject(name); continue; } // exact dup: reuse
      // collision check
      for (const ex of allNames) {
        if (ex !== name && (name.includes(ex) || ex.includes(name))) {
          warn.push(`naming collision: new '${name}' vs existing '${ex}' (proceeding; name is scope-prefixed)`);
        }
      }
      toInsert.push({
        data_object_name: name, kind: "domain_owned", entity_type: o.entity_type || "unclassified",
        singular_label: o.singular_label || name, plural_label: o.plural_label || name,
        description: o.description || name,
        is_canonical_bare_word: !!o.is_canonical_bare_word, naming_authority_rationale: o.naming_authority_rationale || "",
        has_personal_content: !!o.has_personal_content, has_submit_lock: !!o.has_submit_lock, has_single_approver: !!o.has_single_approver,
      });
    }
    await post("/data_objects", toInsert);
    // refresh resolver for the new names
    for (const o of want) await resolveDataObject(o.data_object_name);
    summary.push(`data_objects: +${toInsert.length} new`);
  } else summary.push(`data_objects: +0 new`);
}

// ===================== 4. domain_modules =====================
{
  const want = build.modules || [];
  const existM = await get(`/domain_modules?domain_id=eq.${domainId}&select=id,domain_module_code`);
  const mMap = new Map<string, number>(existM.map((r: any) => [r.domain_module_code, r.id]));
  const missing = want.filter((m: any) => !mMap.has(m.domain_module_code)).map((m: any) => ({
    domain_module_code: m.domain_module_code, domain_module_name: m.domain_module_name,
    module_kind: m.module_kind || "full", domain_id: domainId,
    description: m.description || "", catalog: false,
    catalog_tagline: m.catalog_tagline || "", catalog_description: m.catalog_description || "",
  }));
  await post("/domain_modules", missing);
  const afterM = await get(`/domain_modules?domain_id=eq.${domainId}&select=id,domain_module_code`);
  const mMap2 = new Map<string, number>(afterM.map((r: any) => [r.domain_module_code, r.id]));
  summary.push(`domain_modules: +${missing.length} (${want.length} in draft)`);
  (globalThis as any).modCodeToId = mMap2;
}
const modCodeToId: Map<string, number> = (globalThis as any).modCodeToId;

// ===================== 5. domain_module_capabilities =====================
{
  const want = build.modules || [];
  const modIds = [...modCodeToId.values()];
  const existDMC = modIds.length ? await get(`/domain_module_capabilities?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,capability_id`) : [];
  const seen = new Set(existDMC.map((r: any) => `${r.domain_module_id}.${r.capability_id}`));
  const rows: any[] = [];
  for (const m of want) {
    const mid = modCodeToId.get(m.domain_module_code);
    if (!mid) continue;
    for (const cc of m.capability_codes || []) {
      const cid = capCodeToId.get(cc);
      if (!cid) { warn.push(`module ${m.domain_module_code}: capability '${cc}' not found`); continue; }
      const k = `${mid}.${cid}`;
      if (!seen.has(k)) { seen.add(k); rows.push({ domain_module_id: mid, capability_id: cid }); }
    }
  }
  await post("/domain_module_capabilities", rows);
  summary.push(`domain_module_capabilities: +${rows.length}`);
}

// ===================== 6. domain_module_data_objects =====================
{
  const want = build.modules || [];
  const modIds = [...modCodeToId.values()];
  const existDMDO = modIds.length ? await get(`/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,data_object_id`) : [];
  const seen = new Set(existDMDO.map((r: any) => `${r.domain_module_id}.${r.data_object_id}`));
  const rows: any[] = [];
  for (const m of want) {
    const mid = modCodeToId.get(m.domain_module_code);
    if (!mid) continue;
    for (const o of m.data_objects || []) {
      const did = await resolveDataObject(o.data_object_name);
      if (!did) { warn.push(`module ${m.domain_module_code}: data_object '${o.data_object_name}' not found, skipping DMDO`); continue; }
      const k = `${mid}.${did}`;
      if (seen.has(k)) continue;
      seen.add(k);
      rows.push({ domain_module_id: mid, data_object_id: did, role: o.role || "consumer", necessity: o.necessity || "required" });
    }
  }
  await post("/domain_module_data_objects", rows);
  summary.push(`domain_module_data_objects: +${rows.length}`);
}

// ===================== 7. data_object_lifecycle_states =====================
{
  const want = build.lifecycle_states || [];
  const rows: any[] = [];
  for (const entry of want) {
    const did = await resolveDataObject(entry.data_object_name);
    if (!did) { warn.push(`lifecycle: data_object '${entry.data_object_name}' not found`); continue; }
    const exist = await get(`/data_object_lifecycle_states?data_object_id=eq.${did}&select=state_name`);
    if (exist.length) { summary.push(`  lifecycle ${entry.data_object_name}: already has ${exist.length} states, skipping`); continue; }
    let order = 10;
    for (const s of entry.states || []) {
      rows.push({
        data_object_id: did, state_name: s.state_name, state_order: s.state_order ?? order,
        description: s.description || s.state_name, is_initial: !!s.is_initial, is_terminal: !!s.is_terminal,
        requires_permission: !!s.requires_permission, permission_verb_override: s.permission_verb_override || "",
      });
      order += 10;
    }
  }
  await post("/data_object_lifecycle_states", rows);
  summary.push(`data_object_lifecycle_states: +${rows.length}`);
}

// ===================== 8. tools + domain_module_tools =====================
{
  const wantTools = build.tools || [];
  const existT = await get(`/tools?select=id,tool_name&limit=100000`);
  const tMap = new Map<string, number>(existT.map((r: any) => [r.tool_name, r.id]));
  const toInsert: any[] = [];
  for (const t of wantTools) {
    if (tMap.has(t.tool_name)) continue;
    const ok = t.operation_kind;
    let did: number | null = null;
    if (ok === "query" || ok === "mutate") {
      did = t.data_object_name ? await resolveDataObject(t.data_object_name) : null;
      if (!did) { warn.push(`tool ${t.tool_name}: ${ok} requires data_object but '${t.data_object_name}' not found, skipping`); continue; }
    }
    const coverage = (ok === "query" || ok === "mutate") ? "platform" : "external";
    toInsert.push({ tool_name: t.tool_name, operation_kind: ok, data_object_id: did, description: t.description || t.tool_name, coverage_tier: coverage });
  }
  await post("/tools", toInsert);
  const afterT = await get(`/tools?select=id,tool_name&limit=100000`);
  const tMap2 = new Map<string, number>(afterT.map((r: any) => [r.tool_name, r.id]));
  summary.push(`tools: +${toInsert.length} new (deduped against catalog)`);

  // domain_module_tools
  const want = build.module_tools || [];
  const modIds = [...modCodeToId.values()];
  const existDMT = modIds.length ? await get(`/domain_module_tools?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,tool_id`) : [];
  const seen = new Set(existDMT.map((r: any) => `${r.domain_module_id}.${r.tool_id}`));
  const rows: any[] = [];
  for (const mt of want) {
    const mid = modCodeToId.get(mt.domain_module_code);
    const tid = tMap2.get(mt.tool_name);
    if (!mid) { warn.push(`module_tool: module '${mt.domain_module_code}' not found`); continue; }
    if (!tid) { warn.push(`module_tool: tool '${mt.tool_name}' not found`); continue; }
    const k = `${mid}.${tid}`;
    if (!seen.has(k)) { seen.add(k); rows.push({ domain_module_id: mid, tool_id: tid, requirement_level: mt.requirement_level || "required" }); }
  }
  await post("/domain_module_tools", rows);
  summary.push(`domain_module_tools: +${rows.length}`);
}

// ===================== 9. system skill (ensure exactly one domain-grain) =====================
{
  const existSkill = await get(`/skills?domain_id=eq.${domainId}&skill_type=eq.system&domain_module_id=is.null&select=id,skill_name`);
  if (existSkill.length === 0) {
    const name = `${CODE.toLowerCase()}-system`;
    const desc = build.system_skill_description || `System skill for ${existing.domain.domain_name}: derives its toolset from the domain's modules.`;
    await post("/skills", [{ skill_name: name, skill_type: "system", domain_id: domainId, description: desc }]);
    summary.push(`skills: +1 system skill (${name})`);
  } else summary.push(`skills: system skill already exists (${existSkill[0].skill_name})`);
}

// ===================== 10. domain_roles + role_modules =====================
{
  const want = build.personas || [];
  if (want.length) {
    const bfs = await get(`/business_functions?select=id,business_function_name&limit=1000`);
    const bfMap = new Map<string, number>(bfs.map((r: any) => [r.business_function_name, r.id]));
    const existR = await get(`/domain_roles?select=id,role_code&limit=100000`);
    const rMap = new Map<string, number>(existR.map((r: any) => [r.role_code, r.id]));
    const missing = want.filter((p: any) => !rMap.has(p.role_code)).map((p: any) => {
      const bfId = p.business_function ? bfMap.get(p.business_function) ?? null : null;
      if (p.business_function && bfId === null) warn.push(`persona ${p.role_code}: business_function '${p.business_function}' not found, using null`);
      return { role_code: p.role_code, role_name: p.role_name, description: p.description || p.role_name, business_function_id: bfId };
    });
    await post("/domain_roles", missing);
    const afterR = await get(`/domain_roles?select=id,role_code&limit=100000`);
    const rMap2 = new Map<string, number>(afterR.map((r: any) => [r.role_code, r.id]));
    summary.push(`domain_roles: +${missing.length}`);

    const roleIds = want.map((p: any) => rMap2.get(p.role_code)).filter(Boolean);
    const existRM = roleIds.length ? await get(`/role_modules?role_id=in.(${roleIds.join(",")})&select=role_id,domain_module_id`) : [];
    const seen = new Set(existRM.map((r: any) => `${r.role_id}.${r.domain_module_id}`));
    const rows: any[] = [];
    for (const p of want) {
      const rid = rMap2.get(p.role_code);
      if (!rid) continue;
      for (const m of p.modules || []) {
        const mid = modCodeToId.get(m.domain_module_code);
        if (!mid) { warn.push(`persona ${p.role_code}: module '${m.domain_module_code}' not found`); continue; }
        const k = `${rid}.${mid}`;
        if (!seen.has(k)) { seen.add(k); rows.push({ role_id: rid, domain_module_id: mid, interaction_level: m.interaction_level || "primary" }); }
      }
    }
    await post("/role_modules", rows);
    summary.push(`role_modules: +${rows.length}`);
  } else summary.push(`personas: none in draft`);
}

console.log(`\n===== ${CODE} (domain_id=${domainId})${DRY ? " [DRY RUN]" : ""} =====`);
for (const s of summary) console.log("  " + s);
if (warn.length) { console.log("  WARNINGS:"); for (const w of warn) console.log("   ! " + w); }
