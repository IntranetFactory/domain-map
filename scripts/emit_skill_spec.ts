#!/usr/bin/env bun
// scripts/emit_skill_spec.ts
//
// Emits the per-domain skill-spec bundle into catalog/skill-specs/<DOMAIN>/:
//   spec.json  - structured per-domain data, emitted FROM LIVE CATALOG STATE
//   SKILL.md   - the template at catalog/domain-skill-template/SKILL.md with {{...}} resolved
//
// catalog.yaml is buyer-facing marketing copy governed by Rule #20 (never overwrite a
// non-empty value without per-row sign-off). This emitter therefore NEVER touches an
// existing catalog.yaml; it only scaffolds a placeholder one when the folder has none.
//
// This is the script that the 2026-05-31 session promised ("scripts/emit_skill_spec.ts
// --domain ATS that reads live and rewrites spec.json + SKILL.md") and never delivered.
// The hand-authored catalog/skill-specs/ATS/ was a stale sample; this regenerates from live.
//
// All reads go through scripts/lib/catalog.ts pg() so the semantius CLI runs from the
// project-root cwd (CLAUDE.md cwd rule). Bun + TypeScript only, never Python.
//
// Three modes (exactly one required):
//   --domain <CODE>   generate one specific domain
//   --regenerate      regenerate ONLY domains that already have a skill-specs/<CODE>/ folder
//   --all             generate every catalog domain that has modules; ALWAYS needs --yes to write
//
// Usage:
//   bun run scripts/emit_skill_spec.ts --domain ATS
//   bun run scripts/emit_skill_spec.ts --domain ATS --stdout    # print spec.json, write nothing
//   bun run scripts/emit_skill_spec.ts --regenerate             # refresh every existing folder
//   bun run scripts/emit_skill_spec.ts --all                    # lists targets, then stops (no --yes)
//   bun run scripts/emit_skill_spec.ts --all --yes              # confirmed: write every domain
//   bun run scripts/emit_skill_spec.ts --domain ATS --major 2   # override facts_major
//   bun run scripts/emit_skill_spec.ts --domain ATS --snapshot tests-2026-05-30

export {};

import { writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { argv } from "node:process";
import { pg } from "./lib/catalog";

// ---------- CLI ----------

const args = argv.slice(2);
function flagValue(name: string): string | null {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}
const DOMAIN_ARG = flagValue("--domain");
const ALL = args.includes("--all");
const REGEN = args.includes("--regenerate");
const YES = args.includes("--yes") || args.includes("--confirm");
const STDOUT = args.includes("--stdout");
const BATCH = ALL || REGEN;
const FACTS_MAJOR = Number(flagValue("--major") ?? "1");
const SNAPSHOT_OVERRIDE = flagValue("--snapshot");
const SKILL_SPECS_DIR = flagValue("--out-dir") ?? "c:/dev/domain-map/catalog/skill-specs";
const TEMPLATE_PATH = "c:/dev/domain-map/catalog/domain-skill-template/SKILL.md";

const modeCount = [ALL, REGEN, Boolean(DOMAIN_ARG)].filter(Boolean).length;
if (modeCount !== 1) {
  console.error("Pick exactly one mode:");
  console.error("  --domain <CODE>   generate one specific domain");
  console.error("  --regenerate      regenerate only domains that already have a skill-specs/ folder");
  console.error("  --all [--yes]     generate every catalog domain with modules (writing needs --yes)");
  console.error("  shared: [--stdout] [--out-dir DIR] [--major N] [--snapshot S]");
  process.exit(2);
}

// ---------- helpers ----------

const get = (path: string) => pg("GET", path) as Promise<any[]>;
const inList = (ids: (number | string)[]) => `(${ids.join(",")})`;
const todayIso = () => new Date().toISOString().slice(0, 10);

// Project rule: no em-dashes in emitted artifacts. DB-sourced strings get sanitized at
// render time as the same safety net emit_fact_sheet.ts applies. U+2014 -> ", ".
function clean<T>(v: T): T {
  // Spaced em-dash ("a — b") -> ", "; bare em-dash -> "-". Keeps single spacing.
  return (typeof v === "string" ? (v.replace(/\s*—\s*/g, ", ") as unknown as T) : v);
}

// Best-effort org slug for catalog_snapshot. Never throws; falls back to "catalog".
async function orgSlug(): Promise<string> {
  if (SNAPSHOT_OVERRIDE) return SNAPSHOT_OVERRIDE.replace(/-\d{4}-\d{2}-\d{2}$/, "");
  try {
    const proc = Bun.spawn(["semantius", "call", "crud", "getCurrentUser"], {
      stdin: new Response("{}"),
      stdout: "pipe",
      stderr: "pipe",
    });
    const text = (await new Response(proc.stdout).text()).trim();
    await proc.exited;
    const cu = text ? JSON.parse(text) : {};
    const slug =
      cu?.org_slug ?? cu?.tenant_slug ?? cu?.organization?.slug ?? cu?.org ?? cu?.tenant ?? cu?.organization_name;
    return typeof slug === "string" && slug.length > 0 ? slug : "catalog";
  } catch {
    return "catalog";
  }
}

// Spec-key -> (table, field) for the enum vocabularies the skill might write. Live
// /fields (format=enum) is the source of truth, mirroring enum_drift_probe.ts.
const ENUM_SPEC: { key: string; table: string; field: string }[] = [
  { key: "trigger_event_category", table: "trigger_events", field: "event_category" },
  { key: "integration_pattern", table: "handoffs", field: "integration_pattern" },
  { key: "friction_level", table: "handoffs", field: "friction_level" },
  { key: "role_dmdo", table: "domain_module_data_objects", field: "role" },
  { key: "necessity", table: "domain_module_data_objects", field: "necessity" },
  { key: "record_status", table: "handoffs", field: "record_status" },
];

// ---------- shared lookups (loaded once) ----------

type Lookups = {
  domainCodeById: Map<number, string>;
  moduleCodeById: Map<number, string>;
  businessFunctionNameById: Map<number, string>;
  capabilityDomainCount: Map<number, number>;
  enumByKey: Map<string, string[]>;
  snapshot: string;
};

async function loadLookups(): Promise<Lookups> {
  const [domains, modules, bfs, capDomains, enumFields, org] = await Promise.all([
    get("/domains?select=id,domain_code&limit=10000"),
    get("/domain_modules?select=id,domain_module_code&limit=10000"),
    get("/business_functions?select=id,business_function_name&limit=10000"),
    get("/capability_domains?select=capability_id,domain_id&limit=20000"),
    get("/fields?format=eq.enum&select=table_name,field_name,enum_values&limit=20000"),
    orgSlug(),
  ]);

  const capabilityDomainCount = new Map<number, number>();
  for (const r of capDomains) {
    const cid = r.capability_id as number;
    capabilityDomainCount.set(cid, (capabilityDomainCount.get(cid) ?? 0) + 1);
  }

  const enumLive = new Map<string, string[]>();
  for (const f of enumFields) enumLive.set(`${f.table_name}.${f.field_name}`, (f.enum_values ?? []).map(String));
  const enumByKey = new Map<string, string[]>();
  for (const e of ENUM_SPEC) enumByKey.set(e.key, enumLive.get(`${e.table}.${e.field}`) ?? []);

  return {
    domainCodeById: new Map(domains.map((d) => [d.id as number, d.domain_code as string])),
    moduleCodeById: new Map(modules.map((m) => [m.id as number, m.domain_module_code as string])),
    businessFunctionNameById: new Map(bfs.map((b) => [b.id as number, b.business_function_name as string])),
    capabilityDomainCount,
    enumByKey,
    snapshot: SNAPSHOT_OVERRIDE ?? `${org}-${todayIso()}`,
  };
}

// ---------- per-domain spec build ----------

async function buildSpec(domainCode: string, lk: Lookups): Promise<{ spec: any; masters: any[]; capNames: string[]; adjacentDomainCodes: string[] }> {
  const [domainRow] = await get(
    `/domains?domain_code=eq.${domainCode}&select=id,domain_code,domain_name,description,parent_domain_id,business_logic,min_org_size,cost_band,certification_required,usa_market_size_usd_m,market_size_source_year&limit=1`,
  );
  if (!domainRow) throw new Error(`domain ${domainCode} not found in /domains`);
  const domainId = domainRow.id as number;

  // Modules hosted on this domain: primary (domain_id) + host junction.
  const [primaryModules, hostJunction] = await Promise.all([
    get(`/domain_modules?domain_id=eq.${domainId}&select=id,domain_module_code,domain_module_name,module_kind,description&order=domain_module_code.asc`),
    get(`/domain_module_host_domains?domain_id=eq.${domainId}&select=domain_module_id`),
  ]);
  const moduleIds = [...new Set([...primaryModules.map((m) => m.id as number), ...hostJunction.map((h) => h.domain_module_id as number)])];
  const moduleById = new Map<number, any>(primaryModules.map((m) => [m.id as number, m]));
  // Fetch any host-only modules not already in primaryModules.
  const missingModuleIds = moduleIds.filter((id) => !moduleById.has(id));
  if (missingModuleIds.length > 0) {
    const extra = await get(`/domain_modules?id=in.${inList(missingModuleIds)}&select=id,domain_module_code,domain_module_name,module_kind,description`);
    for (const m of extra) moduleById.set(m.id as number, m);
  }

  // Bulk per-domain reads. Each is scoped to this domain's modules / id.
  const moduleIdList = inList(moduleIds.length ? moduleIds : [-1]);
  const [
    domainAliases,
    bfDomains,
    capDomains,
    moduleCaps,
    dmdo,
    outboundHandoffsRaw,
    systemSkills,
    moduleTools,
    roleModules,
  ] = await Promise.all([
    get(`/domain_aliases?domain_id=eq.${domainId}&select=alias&order=alias.asc`),
    get(`/business_function_domains?domain_id=eq.${domainId}&select=responsibility_type,business_functions(business_function_name)`),
    get(`/capability_domains?domain_id=eq.${domainId}&select=capability_id,capabilities(capability_code,capability_name)`),
    get(`/domain_module_capabilities?domain_module_id=in.${moduleIdList}&select=domain_module_id,capability_id,capabilities(capability_code)`),
    get(`/domain_module_data_objects?domain_module_id=in.${moduleIdList}&select=domain_module_id,data_object_id,role,necessity`),
    get(`/handoffs?source_domain_id=eq.${domainId}&target_domain_id=neq.${domainId}&select=integration_pattern,friction_level,source_domain_module_id,target_domain_id,target_domain_module_id,data_objects(data_object_name),trigger_events(event_name,event_category),handoff_processes(processes(external_id,process_name))&order=id.asc`),
    get(`/skills?skill_type=eq.system&or=(domain_id.eq.${domainId},domain_module_id.in.${moduleIdList})&select=id,skill_name,domain_id,domain_module_id`),
    get(`/domain_module_tools?domain_module_id=in.${moduleIdList}&select=domain_module_id,tool_id,requirement_level`),
    get(`/role_modules?domain_module_id=in.${moduleIdList}&select=role_id,domain_module_id,interaction_level`),
  ]);

  // ----- data object detail (all masters + entities referenced in scope) -----
  const scopeObjectIds = [...new Set(dmdo.map((r) => r.data_object_id as number))];
  const dataObjectRows = scopeObjectIds.length
    ? await get(`/data_objects?id=in.${inList(scopeObjectIds)}&select=id,data_object_name,singular_label,plural_label,description,is_canonical_bare_word,has_personal_content,has_submit_lock,has_single_approver`)
    : [];
  const doById = new Map<number, any>(dataObjectRows.map((d) => [d.id as number, d]));
  const masterIds = [...new Set(dmdo.filter((r) => r.role === "master").map((r) => r.data_object_id as number))];

  const [usersRow] = await get(`/data_objects?data_object_name=eq.users&select=id&limit=1`);
  const usersId = usersRow?.id as number | undefined;

  const [lifecycleRows, doAliasRows, relationshipRows] = await Promise.all([
    masterIds.length ? get(`/data_object_lifecycle_states?data_object_id=in.${inList(masterIds)}&select=data_object_id,state_name,state_order,is_initial,is_terminal,requires_permission,permission_verb_override&order=data_object_id.asc,state_order.asc`) : Promise.resolve([]),
    masterIds.length ? get(`/data_object_aliases?data_object_id=in.${inList(masterIds)}&select=data_object_id,alias_name,alias_type&order=alias_name.asc`) : Promise.resolve([]),
    masterIds.length ? get(`/data_object_relationships?or=(data_object_id.in.${inList(masterIds)},related_data_object_id.in.${inList(masterIds)})&select=data_object_id,related_data_object_id,relationship_type,relationship_verb,is_required`) : Promise.resolve([]),
  ]);

  const lifecycleByDo = groupBy(lifecycleRows, (r) => r.data_object_id as number);
  const aliasByDo = groupBy(doAliasRows, (r) => r.data_object_id as number);

  const nameOf = (id: number): string | null => (id === usersId ? "users" : doById.get(id)?.data_object_name ?? null);

  // ----- modules section -----
  const dmdoByModule = groupBy(dmdo, (r) => r.domain_module_id as number);
  const capCodeByModule = groupBy(moduleCaps, (r) => r.domain_module_id as number);
  const modulesOut = moduleIds
    .map((id) => moduleById.get(id))
    .filter(Boolean)
    .sort((a, b) => (a.domain_module_code as string).localeCompare(b.domain_module_code as string))
    .map((m) => {
      const rows = dmdoByModule.get(m.id as number) ?? [];
      const byRole = (role: string) =>
        rows.filter((r) => r.role === role).map((r) => nameOf(r.data_object_id as number)).filter(Boolean).sort();
      const realizes = (capCodeByModule.get(m.id as number) ?? [])
        .map((r) => r.capabilities?.capability_code)
        .filter(Boolean)
        .sort();
      const out: any = {
        code: m.domain_module_code,
        name: m.domain_module_name,
        kind: m.module_kind,
        realizes_capabilities: realizes,
        masters: byRole("master"),
        embedded_masters: byRole("embedded_master"),
        consumers: byRole("consumer"),
      };
      if (m.description) out.description = clean(m.description);
      return out;
    });

  // ----- data_objects section: every master, full detail -----
  const masterDetail = masterIds
    .map((id) => doById.get(id))
    .filter(Boolean)
    .sort((a, b) => (a.data_object_name as string).localeCompare(b.data_object_name as string))
    .map((d) => {
      const states = (lifecycleByDo.get(d.id as number) ?? []).map((s) => {
        const o: any = { name: s.state_name, order: s.state_order };
        if (s.is_initial) o.is_initial = true;
        if (s.is_terminal) o.is_terminal = true;
        if (s.requires_permission) o.requires_permission = true;
        if (s.permission_verb_override) o.permission_verb_override = s.permission_verb_override;
        return o;
      });
      const aliases = (aliasByDo.get(d.id as number) ?? []).map((a) => ({ name: a.alias_name, source: a.alias_type }));
      return {
        name: d.data_object_name,
        singular_label: d.singular_label,
        plural_label: d.plural_label,
        description: clean(d.description ?? ""),
        is_canonical_bare_word: Boolean(d.is_canonical_bare_word),
        pattern_flags: {
          has_personal_content: Boolean(d.has_personal_content),
          has_submit_lock: Boolean(d.has_submit_lock),
          has_single_approver: Boolean(d.has_single_approver),
        },
        aliases,
        lifecycle_states: states,
      };
    });

  // ----- relationships -----
  const relationships = relationshipRows
    .map((r) => {
      const from = nameOf(r.data_object_id as number);
      const to = nameOf(r.related_data_object_id as number);
      if (!from || !to) return null;
      return {
        from,
        verb: clean(r.relationship_verb ?? ""),
        to,
        cardinality: r.relationship_type ?? null,
        required: Boolean(r.is_required),
      };
    })
    .filter(Boolean);

  // ----- handoffs.outbound + apqc rollup -----
  const apqc = new Map<string, string>();
  const outbound = outboundHandoffsRaw.map((h) => {
    const procs = (h.handoff_processes ?? [])
      .map((hp: any) => hp.processes)
      .filter(Boolean)
      .map((p: any) => ({ external_id: p.external_id, name: clean(p.process_name) }));
    for (const p of procs) apqc.set(String(p.external_id), p.name);
    return {
      trigger_event: h.trigger_events?.event_name ?? null,
      payload: h.data_objects?.data_object_name ?? null,
      target_domain: lk.domainCodeById.get(h.target_domain_id as number) ?? null,
      target_module: h.target_domain_module_id != null ? lk.moduleCodeById.get(h.target_domain_module_id as number) ?? null : null,
      integration_pattern: h.integration_pattern ?? null,
      friction_level: h.friction_level ?? null,
      source_module: h.source_domain_module_id != null ? lk.moduleCodeById.get(h.source_domain_module_id as number) ?? null : null,
      apqc_processes: procs,
    };
  });
  const apqcTouched = [...apqc.entries()]
    .map(([external_id, name]) => ({ external_id, name }))
    .sort((a, b) => a.external_id.localeCompare(b.external_id, undefined, { numeric: true }));

  // ----- system skills (current grain: one per domain + one per starter module) -----
  const toolIds = [...new Set(moduleTools.map((r) => r.tool_id as number))];
  const toolRows = toolIds.length ? await get(`/tools?id=in.${inList(toolIds)}&select=id,tool_name,operation_kind`) : [];
  const toolById = new Map<number, any>(toolRows.map((t) => [t.id as number, t]));
  const moduleToolsByModule = groupBy(moduleTools, (r) => r.domain_module_id as number);
  const fullModuleIds = modulesOut.filter((m) => m.kind === "full").map((m) => {
    // reverse map code->id
    return [...moduleById.values()].find((x) => x.domain_module_code === m.code)?.id as number;
  });
  const systemSkillsOut = systemSkills
    .sort((a, b) => (a.skill_name as string).localeCompare(b.skill_name as string))
    .map((s) => {
      const scopeModuleIds: number[] =
        s.domain_module_id != null ? [s.domain_module_id as number] : fullModuleIds.filter(Boolean);
      // Union tools across the skill's module scope; required wins on collision.
      const byTool = new Map<number, boolean>();
      for (const mid of scopeModuleIds) {
        for (const r of moduleToolsByModule.get(mid) ?? []) {
          const required = r.requirement_level === "required";
          byTool.set(r.tool_id as number, (byTool.get(r.tool_id as number) ?? false) || required);
        }
      }
      const tools = [...byTool.entries()]
        .map(([tid, required]) => {
          const t = toolById.get(tid);
          return t ? { name: t.tool_name, kind: t.operation_kind, required } : null;
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      return {
        module_code: s.domain_module_id != null ? lk.moduleCodeById.get(s.domain_module_id as number) ?? null : null,
        skill_grain: s.domain_module_id != null ? "module" : "domain",
        skill_name: s.skill_name,
        tools,
      };
    });

  // ----- roles (personas) -----
  const roleIds = [...new Set(roleModules.map((r) => r.role_id as number))];
  const roleRows = roleIds.length ? await get(`/domain_roles?id=in.${inList(roleIds)}&select=id,role_code,business_function_id`) : [];
  const roleById = new Map<number, any>(roleRows.map((r) => [r.id as number, r]));
  const roleModulesByRole = groupBy(roleModules, (r) => r.role_id as number);
  const rolesOut = roleIds
    .map((rid) => {
      const role = roleById.get(rid);
      if (!role) return null;
      const mods = (roleModulesByRole.get(rid) ?? [])
        .map((rm) => ({ code: lk.moduleCodeById.get(rm.domain_module_id as number) ?? null, interaction: rm.interaction_level }))
        .filter((m) => m.code)
        .sort((a, b) => (a.code as string).localeCompare(b.code as string));
      return {
        code: role.role_code,
        business_function: role.business_function_id != null ? lk.businessFunctionNameById.get(role.business_function_id as number) ?? null : null,
        modules: mods,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.code.localeCompare(b.code));

  // ----- business functions (market RACI) -----
  const bf = { owner: [] as string[], contributors: [] as string[], consumers: [] as string[] };
  for (const r of bfDomains) {
    const name = r.business_functions?.business_function_name;
    if (!name) continue;
    if (r.responsibility_type === "owner") bf.owner.push(name);
    else if (r.responsibility_type === "contributor") bf.contributors.push(name);
    else if (r.responsibility_type === "consumer") bf.consumers.push(name);
  }
  bf.owner.sort();
  bf.contributors.sort();
  bf.consumers.sort();

  // ----- capabilities (domain level) -----
  const capabilities = capDomains
    .map((r) => ({
      code: r.capabilities?.capability_code,
      name: r.capabilities?.capability_name,
      cross_cutting: (lk.capabilityDomainCount.get(r.capability_id as number) ?? 1) > 1,
    }))
    .filter((c) => c.code)
    .sort((a, b) => (a.code as string).localeCompare(b.code as string));

  // ----- enums -----
  const enums: Record<string, string[]> = {};
  for (const e of ENUM_SPEC) enums[e.key] = lk.enumByKey.get(e.key) ?? [];

  const aliases = domainAliases.map((a) => a.alias as string);

  const spec = {
    facts_major: FACTS_MAJOR,
    emitted: todayIso(),
    catalog_snapshot: lk.snapshot,

    domain: {
      code: domainRow.domain_code,
      name: domainRow.domain_name,
      description: clean(domainRow.description ?? ""),
      parent_domain_code: domainRow.parent_domain_id != null ? lk.domainCodeById.get(domainRow.parent_domain_id as number) ?? null : null,
      business_logic: clean(domainRow.business_logic ?? ""),
      min_org_size: domainRow.min_org_size ?? null,
      cost_band: domainRow.cost_band ?? null,
      certification_required: Boolean(domainRow.certification_required),
      usa_market_size_usd_m: domainRow.usa_market_size_usd_m ?? null,
      market_size_source_year: domainRow.market_size_source_year ?? null,
    },

    aliases,
    business_functions: bf,
    capabilities,
    modules: modulesOut,
    data_objects: masterDetail,
    relationships,
    handoffs: { outbound },
    apqc_processes_touched: apqcTouched,
    system_skills: systemSkillsOut,
    roles: rolesOut,
    enums,
  };

  return {
    spec,
    masters: masterDetail,
    capNames: capabilities.map((c) => c.name as string),
    adjacentDomainCodes: [...new Set(outbound.map((h) => h.target_domain).filter(Boolean) as string[])].sort(),
  };
}

function groupBy<T>(rows: T[], keyFn: (r: T) => number): Map<number, T[]> {
  const out = new Map<number, T[]>();
  for (const r of rows) {
    const k = keyFn(r);
    const list = out.get(k);
    if (list) list.push(r);
    else out.set(k, [r]);
  }
  return out;
}

// ---------- SKILL.md rendering ----------

function renderSkillMd(template: string, spec: any, ctx: { masters: any[]; capNames: string[]; adjacentDomainCodes: string[] }): string {
  const code = spec.domain.code as string;
  const subs: Record<string, string> = {
    DOMAIN_CODE_LOWER: code.toLowerCase(),
    DOMAIN_CODE: code,
    DOMAIN_NAME: spec.domain.name,
    ALIASES_COMMA_LIST: spec.aliases.length ? spec.aliases.join(", ") : code.toLowerCase(),
    ENTITY_NOUNS_COMMA_LIST: ctx.masters.map((m) => m.plural_label).join(", "),
    CAPABILITY_NAMES_COMMA_LIST: ctx.capNames.join(", "),
    ADJACENT_DOMAIN_SKILLS: ctx.adjacentDomainCodes.length ? ctx.adjacentDomainCodes.map((c) => `use-${c.toLowerCase()}`).join(", ") : "none",
    MODULE_SLUG: code.toLowerCase(),
  };
  let out = template;
  for (const [k, v] of Object.entries(subs)) out = out.replaceAll(`{{${k}}}`, v);
  // Safety net: strip any em-dash that slipped through from a substituted DB value.
  return out.replace(/\s*—\s*/g, ", ");
}

// ---------- scaffolds ----------

function catalogYamlScaffold(code: string, name: string): string {
  return [
    `# Catalog UX data for the use-${code.toLowerCase()} skill.`,
    `# SCAFFOLD emitted by emit_skill_spec.ts because no catalog.yaml existed.`,
    `# Rule #20: buyer voice (workflow + value). Marketing edits these freely; AI loaders`,
    `# must NOT regenerate without per-row review. The emitter never overwrites this file.`,
    ``,
    `domain_code: ${code}`,
    `skill_name: use-${code.toLowerCase()}`,
    ``,
    `catalog_tagline: "TODO buyer-facing one-liner for ${name}."`,
    ``,
    `catalog_description: |`,
    `  TODO buyer-facing description.`,
    ``,
    `category: TODO`,
    ``,
    `search_keywords: []`,
    ``,
    `icon: ""`,
    ``,
    `depends_on_skills:`,
    `  - use-semantius`,
    `related_skills: []`,
    ``,
  ].join("\n");
}

// ---------- driver ----------

async function emitOne(code: string, lk: Lookups, template: string): Promise<void> {
  const { spec, masters, capNames, adjacentDomainCodes } = await buildSpec(code, lk);
  const specJson = JSON.stringify(spec, null, 2) + "\n";

  if (STDOUT) {
    process.stdout.write(specJson);
    return;
  }

  const dir = `${SKILL_SPECS_DIR}/${code}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/spec.json`, specJson, "utf8");

  const skillMd = renderSkillMd(template, spec, { masters, capNames, adjacentDomainCodes });
  writeFileSync(`${dir}/SKILL.md`, skillMd, "utf8");

  const catalogYamlPath = `${dir}/catalog.yaml`;
  let yamlNote = "kept existing catalog.yaml (Rule #20: never overwritten)";
  if (!existsSync(catalogYamlPath)) {
    writeFileSync(catalogYamlPath, catalogYamlScaffold(code, spec.domain.name), "utf8");
    yamlNote = "scaffolded catalog.yaml (was missing; fill in the TODOs)";
  }

  console.log(
    `wrote ${dir}/spec.json + SKILL.md  (${spec.modules.length} modules, ${spec.data_objects.length} masters, ${spec.handoffs.outbound.length} outbound handoffs, ${spec.system_skills.length} system skills, ${spec.roles.length} roles); ${yamlNote}`,
  );
}

const lk = await loadLookups();
const template = await Bun.file(TEMPLATE_PATH).text();

let domainCodes: string[];
if (ALL) {
  const withModules = await get("/domain_modules?select=domain_id&limit=20000");
  const domainIdsWithModules = new Set(withModules.map((r) => r.domain_id as number));
  const catalogDomains = await get("/domains?catalog=is.true&select=id,domain_code&limit=10000");
  domainCodes = catalogDomains
    .filter((d) => domainIdsWithModules.has(d.id as number))
    .map((d) => d.domain_code as string)
    .sort();

  // "generate all always requires a confirmation": without --yes (and not a read-only
  // --stdout run) list the targets and stop. Re-run with --yes to actually write.
  if (!STDOUT && !YES) {
    console.error(`--all targets ${domainCodes.length} catalog domains with modules:`);
    console.error("  " + domainCodes.join(", "));
    console.error(`\nThis OVERWRITES spec.json + SKILL.md in ${domainCodes.length} folders under`);
    console.error(`${SKILL_SPECS_DIR}. Nothing written yet. Re-run with --yes to proceed.`);
    process.exit(0);
  }
  console.error(`--all: writing ${domainCodes.length} catalog domains with modules`);
} else if (REGEN) {
  domainCodes = existsSync(SKILL_SPECS_DIR)
    ? readdirSync(SKILL_SPECS_DIR, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort()
    : [];
  if (domainCodes.length === 0) {
    console.error(`--regenerate: no existing skill-spec folders under ${SKILL_SPECS_DIR}; nothing to do.`);
    process.exit(0);
  }
  console.error(`--regenerate: ${domainCodes.length} existing folder(s): ${domainCodes.join(", ")}`);
} else {
  domainCodes = [DOMAIN_ARG as string];
}

let failures = 0;
for (const code of domainCodes) {
  try {
    await emitOne(code, lk, template);
  } catch (e) {
    failures++;
    console.error(`FAILED ${code}: ${(e as Error).message}`);
    if (!BATCH) process.exit(1);
  }
}
if (BATCH) console.error(`done: ${domainCodes.length - failures}/${domainCodes.length} emitted${failures ? `, ${failures} failed` : ""}`);
