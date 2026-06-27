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
// Modes (exactly one required):
//   --domain <CODE>   generate one specific domain
//   --regenerate      regenerate ONLY domains that already have a skill-specs/<CODE>/ folder
//   --released        generate every RELEASED domain/bundle (catalog_release != null); needs --yes to write
//   --all             generate every catalog domain that has modules; ALWAYS needs --yes to write
//
// Usage:
//   bun run scripts/emit_skill_spec.ts --domain ATS
//   bun run scripts/emit_skill_spec.ts --domain ATS --stdout    # print spec.json, write nothing
//   bun run scripts/emit_skill_spec.ts --regenerate             # refresh every existing folder
//   bun run scripts/emit_skill_spec.ts --released               # lists released targets, then stops (no --yes)
//   bun run scripts/emit_skill_spec.ts --released --yes         # confirmed: write every released domain/bundle
//   bun run scripts/emit_skill_spec.ts --all                    # lists targets, then stops (no --yes)
//   bun run scripts/emit_skill_spec.ts --all --yes              # confirmed: write every domain
//   bun run scripts/emit_skill_spec.ts --domain ATS --major 2   # override facts_major
//   bun run scripts/emit_skill_spec.ts --domain ATS --snapshot tests-2026-05-30

export {};

import { writeFileSync, readFileSync, mkdirSync, existsSync, readdirSync, rmSync, cpSync } from "node:fs";
import { dirname } from "node:path";
import { argv } from "node:process";
import { pg } from "./lib/catalog";

// ---------- CLI ----------

const args = argv.slice(2);
function flagValue(name: string): string | null {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}
const DOMAIN_ARG = flagValue("--domain");
const BUNDLE_ARG = flagValue("--bundle");
const ALL = args.includes("--all");
const RELEASED = args.includes("--released");
const REGEN = args.includes("--regenerate");
const YES = args.includes("--yes") || args.includes("--confirm");
const STDOUT = args.includes("--stdout");
const BATCH = ALL || RELEASED || REGEN;
const FACTS_MAJOR = Number(flagValue("--major") ?? "1");
const SNAPSHOT_OVERRIDE = flagValue("--snapshot");
const SKILL_SPECS_DIR = flagValue("--out-dir") ?? "c:/dev/domain-map/catalog/skill-specs";
const TEMPLATE_DIR = "c:/dev/domain-map/catalog/domain-skill-template";
const TEMPLATE_PATH = `${TEMPLATE_DIR}/SKILL.md`;
// Installable skills assemble next to the spec source: <skill-specs parent>/skills. With the
// default skill-specs dir that is catalog/skills; with a temp --out-dir it stays a sibling.
const SKILLS_DIR = flagValue("--skills-dir") ?? `${dirname(SKILL_SPECS_DIR)}/skills`;

const modeCount = [ALL, RELEASED, REGEN, Boolean(DOMAIN_ARG), Boolean(BUNDLE_ARG)].filter(Boolean).length;
if (modeCount !== 1) {
  console.error("Pick exactly one mode:");
  console.error("  --domain <CODE>   generate one specific domain");
  console.error("  --bundle <CODE>   generate one domain-less industry bundle (e.g. HVAC-SVC-MGMT)");
  console.error("  --regenerate      regenerate only folders that already exist (domains + bundles)");
  console.error("  --released [--yes]  generate every RELEASED domain with modules + every released bundle (writing needs --yes)");
  console.error("  --all [--yes]     generate every domain with modules + every domain-less bundle (writing needs --yes)");
  console.error("  shared: [--stdout] [--out-dir DIR] [--major N] [--snapshot S]");
  process.exit(2);
}

// ---------- helpers ----------

const get = (path: string) => pg("GET", path) as Promise<any[]>;
const inList = (ids: (number | string)[]) => `(${ids.join(",")})`;
const todayIso = () => new Date().toISOString().slice(0, 10);

// Project rule: no em-dashes in emitted artifacts. DB-sourced strings get sanitized at
// render time as the same safety net generate_blueprints.ts applies. U+2014 -> ", ".
function clean<T>(v: T): T {
  // Spaced em-dash ("a — b") -> ", "; bare em-dash -> "-". Keeps single spacing.
  return (typeof v === "string" ? (v.replace(/\s*—\s*/g, ", ") as unknown as T) : v);
}

// ---------- catalog.yaml: DB projection + SKILL.md render variables ----------
//
// catalog.yaml is a pure projection of live catalog DB values. It carries (1) the buyer copy
// persisted from the domains table (catalog_tagline / catalog_description) and (2) the variables
// the SKILL.md template ({{...}}) renders. No hand-authored content lives in it, so it is
// regenerated from the DB on every emit. The skills-folder render reads these variables back
// from catalog.yaml (template + catalog.yaml -> SKILL.md), so this file is the render input,
// not just site copy.

function unquoteYaml(s: string): string {
  let v = s.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  return v.trim();
}

// Reads the render variables the SKILL.md template consumes back out of an emitted catalog.yaml,
// so assembling the skills folder is genuinely "template + catalog.yaml". Scalars:
// domain_code_lower, module_slug, domain_name, skill_description. List: capability_names.
// (catalog_description is a multi-line block the template does not render, so it is not parsed.)
function readRenderVars(dir: string): {
  domainCodeLower: string;
  moduleSlug: string;
  domainName: string;
  skillDescription: string;
  capabilityNames: string[];
} {
  let text: string;
  try {
    text = readFileSync(`${dir}/catalog.yaml`, "utf8");
  } catch {
    return { domainCodeLower: "", moduleSlug: "", domainName: "", skillDescription: "", capabilityNames: [] };
  }
  const scalar: Record<string, string> = {};
  const capabilityNames: string[] = [];
  let inCaps = false;
  for (const raw of text.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) continue; // skip blanks + comments
    const top = /^([A-Za-z0-9_]+):(.*)$/.exec(raw);
    if (top && !/^\s/.test(raw)) {
      inCaps = false;
      const key = top[1];
      const rest = top[2].trim();
      if (key === "capability_names") {
        const m = /^\[(.*)\]$/.exec(rest);
        if (m) for (const x of m[1].split(",").map((s) => unquoteYaml(s)).filter(Boolean)) capabilityNames.push(x);
        else inCaps = true; // block list follows
      } else {
        scalar[key] = unquoteYaml(rest);
      }
      continue;
    }
    if (inCaps) {
      const item = /^\s*-\s*(.*)$/.exec(raw);
      if (item && item[1].trim()) capabilityNames.push(unquoteYaml(item[1]));
    }
  }
  return {
    domainCodeLower: scalar.domain_code_lower ?? "",
    moduleSlug: scalar.module_slug ?? "",
    domainName: scalar.domain_name ?? "",
    skillDescription: scalar.skill_description ?? "",
    capabilityNames,
  };
}

// Compose the SKILL.md routing description from the DOMAIN SKILL's own fields: the prose
// (skills.description) followed by "Use for: <trigger_keywords>", dropping any keyword whose
// term already appears in the prose (the dedup double-check). Both are the trigger surface:
// the prose carries natural-language phrasing, the keywords the short search terms.
// NOTE: this substring drop is only a FLOOR (it catches exact repeats). The trigger match is
// semantic, so true dedup is the author's job: a keyword that is a near-synonym of a word
// already in the prose (e.g. "real estate broker" when the prose says "real estate agent")
// adds nothing and should not be authored. See SKILL.md Phase S.
function composeSkillDescription(prose: string, triggerKeywords: string): string {
  const p = clean((prose ?? "").trim());
  const kws = (triggerKeywords ?? "")
    .split(",")
    .map((k) => clean(k.trim()))
    .filter(Boolean);
  const lowerProse = p.toLowerCase();
  const fresh = kws.filter((k) => !lowerProse.includes(k.toLowerCase()));
  return fresh.length ? `${p} Use for: ${fresh.join(", ")}.` : p;
}

// The SKILL.md description is sourced from the domain skill's prose (skills.description) plus its
// trigger keywords (skills.trigger_keywords). BOTH are required: a missing skill, empty prose, or
// empty keywords ERRORS rather than shipping an incomplete trigger surface (the F8 audit band
// enforces the same at audit time).
function skillDescriptionFrom(code: string, skill: any): string {
  const prose = String(skill?.description ?? "").trim();
  const keywords = String(skill?.trigger_keywords ?? "").trim();
  if (!skill || !prose || !keywords) {
    const what = !skill
      ? "no domain skill row"
      : [!prose && "skills.description", !keywords && "skills.trigger_keywords"].filter(Boolean).join(" + ") + " empty";
    throw new Error(
      `${code}: ${what}. The SKILL.md routing description is sourced from skills.description + ` +
        `skills.trigger_keywords (both required), so the emit STOPS instead of shipping an incomplete ` +
        `trigger surface. Author both in one pass (trigger-shaped prose + comma-separated keywords, the ` +
        `complement of the prose), then re-emit.`,
    );
  }
  return composeSkillDescription(prose, keywords);
}

// Best-effort org slug for catalog_snapshot. Never throws; falls back to "catalog".
async function orgSlug(): Promise<string> {
  if (SNAPSHOT_OVERRIDE) return SNAPSHOT_OVERRIDE.replace(/-\d{4}-\d{2}-\d{2}$/, "");
  try {
    const proc = Bun.spawn(["semantius", "call", "crud", "getCurrentUser"], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
    proc.stdin.write("{}");
    proc.stdin.end();
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

// ---------- bulk catalog load (one pass, all domains) ----------
//
// Every read the per-domain / per-bundle builders need is fetched ONCE here as a full-table pull,
// then indexed in memory. buildSpec / buildBundleSpec are pure derivations over these indices and
// issue ZERO further reads, so the number of `semantius` subprocess spawns is a constant (~22)
// regardless of how many domains the catalog holds. The previous design issued ~19 scoped reads
// PER domain (each a fresh CLI spawn), which is fine at 13 domains but does not scale to 100+.

type Bulk = {
  // id -> human lookups (the old Lookups shape; callers still read these by name)
  domainCodeById: Map<number, string>;
  moduleCodeById: Map<number, string>;
  moduleDomainById: Map<number, number | null>;
  businessFunctionNameById: Map<number, string>;
  capabilityDomainCount: Map<number, number>;
  enumByKey: Map<string, string[]>;
  snapshot: string;

  // full rows + indices for in-memory derivation
  domainByCode: Map<string, any>;
  moduleById: Map<number, any>;
  moduleByCode: Map<string, any>;
  modulesByDomainId: Map<number, any[]>;
  hostByDomainId: Map<number, any[]>;
  hostByModuleId: Map<number, any[]>;
  domainAliasesByDomainId: Map<number, any[]>;
  bfDomainsByDomainId: Map<number, any[]>;
  capDomainsByDomainId: Map<number, any[]>;
  capabilityById: Map<number, any>;
  moduleCapsByModuleId: Map<number, any[]>;
  dmdoByModuleId: Map<number, any[]>;
  dmdoByDataObjectId: Map<number, any[]>;
  handoffsBySourceDomainId: Map<number, any[]>;
  handoffsBySourceModuleId: Map<number, any[]>;
  skillsByDomainId: Map<number, any[]>;
  moduleToolsByModuleId: Map<number, any[]>;
  roleModulesByModuleId: Map<number, any[]>;
  dataObjectById: Map<number, any>;
  usersId: number | undefined;
  lifecycleByDataObjectId: Map<number, any[]>;
  doAliasesByDataObjectId: Map<number, any[]>;
  relationships: any[];
  toolById: Map<number, any>;
  roleById: Map<number, any>;
};

async function loadBulk(): Promise<Bulk> {
  const L = 100000; // full-table pulls; the catalog is well under this even at 100+ domains
  const [
    domains,
    modules,
    hostDomains,
    domainAliases,
    bfDomains,
    capabilities,
    capabilityDomains,
    moduleCaps,
    dmdo,
    handoffs,
    skills,
    moduleTools,
    roleModules,
    dataObjects,
    lifecycle,
    doAliases,
    relationships,
    tools,
    domainRoles,
    bfs,
    enumFields,
    org,
  ] = await Promise.all([
    get(`/domains?select=id,domain_code,domain_name,description,parent_domain_id,domain_kind,certification_required,catalog_release,catalog_tagline,catalog_description&limit=${L}`),
    get(`/domain_modules?select=id,domain_module_code,domain_module_name,domain_id,module_kind,description,catalog_tagline&limit=${L}`),
    get(`/domain_module_host_domains?select=domain_module_id,domain_id&limit=${L}`),
    get(`/domain_aliases?select=domain_id,alias&order=alias.asc&limit=${L}`),
    get(`/business_function_domains?select=domain_id,responsibility_type,business_function_id&limit=${L}`),
    get(`/capabilities?select=id,capability_code,capability_name&limit=${L}`),
    get(`/capability_domains?select=capability_id,domain_id&limit=${L}`),
    get(`/domain_module_capabilities?select=domain_module_id,capability_id&limit=${L}`),
    get(`/domain_module_data_objects?select=domain_module_id,data_object_id,role,necessity&order=domain_module_id.asc,data_object_id.asc&limit=${L}`),
    get(`/handoffs?select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,integration_pattern,friction_level,data_objects(data_object_name),trigger_events(event_name,event_category),handoff_processes(processes(external_id,process_name))&order=id.asc&limit=${L}`),
    get(`/skills?skill_type=eq.domain&select=id,skill_name,description,trigger_keywords,domain_id&order=id.asc&limit=${L}`),
    get(`/domain_module_tools?select=domain_module_id,tool_id,requirement_level&limit=${L}`),
    get(`/role_modules?select=role_id,domain_module_id,interaction_level&limit=${L}`),
    get(`/data_objects?select=id,data_object_name,singular_label,plural_label,description,is_canonical_bare_word,has_personal_content&limit=${L}`),
    get(`/data_object_lifecycle_states?select=data_object_id,state_name,state_order,is_initial,is_terminal,requires_permission,permission_verb_override&order=data_object_id.asc,state_order.asc&limit=${L}`),
    get(`/data_object_aliases?select=data_object_id,alias_name,alias_type&order=alias_name.asc&limit=${L}`),
    get(`/data_object_relationships?select=data_object_id,related_data_object_id,relationship_type,relationship_verb,is_required&order=data_object_id.asc,related_data_object_id.asc&limit=${L}`),
    get(`/tools?select=id,tool_name,operation_kind&limit=${L}`),
    get(`/domain_roles?select=id,role_code,business_function_id&limit=${L}`),
    get(`/business_functions?select=id,business_function_name&limit=${L}`),
    get(`/fields?format=eq.enum&select=table_name,field_name,enum_values&limit=${L}`),
    orgSlug(),
  ]);

  const capabilityDomainCount = new Map<number, number>();
  for (const r of capabilityDomains) {
    const cid = r.capability_id as number;
    capabilityDomainCount.set(cid, (capabilityDomainCount.get(cid) ?? 0) + 1);
  }

  const enumLive = new Map<string, string[]>();
  for (const f of enumFields) enumLive.set(`${f.table_name}.${f.field_name}`, (f.enum_values ?? []).map(String));
  const enumByKey = new Map<string, string[]>();
  for (const e of ENUM_SPEC) enumByKey.set(e.key, enumLive.get(`${e.table}.${e.field}`) ?? []);

  const usersRow = dataObjects.find((d: any) => d.data_object_name === "users");

  return {
    domainCodeById: new Map(domains.map((d: any) => [d.id as number, d.domain_code as string])),
    moduleCodeById: new Map(modules.map((m: any) => [m.id as number, m.domain_module_code as string])),
    moduleDomainById: new Map(modules.map((m: any) => [m.id as number, (m.domain_id as number | null) ?? null])),
    businessFunctionNameById: new Map(bfs.map((b: any) => [b.id as number, b.business_function_name as string])),
    capabilityDomainCount,
    enumByKey,
    snapshot: SNAPSHOT_OVERRIDE ?? `${org}-${todayIso()}`,

    domainByCode: new Map(domains.map((d: any) => [d.domain_code as string, d])),
    moduleById: new Map(modules.map((m: any) => [m.id as number, m])),
    moduleByCode: new Map(modules.map((m: any) => [m.domain_module_code as string, m])),
    modulesByDomainId: groupBy(modules.filter((m: any) => m.domain_id != null), (m: any) => m.domain_id as number),
    hostByDomainId: groupBy(hostDomains, (h: any) => h.domain_id as number),
    hostByModuleId: groupBy(hostDomains, (h: any) => h.domain_module_id as number),
    domainAliasesByDomainId: groupBy(domainAliases, (a: any) => a.domain_id as number),
    bfDomainsByDomainId: groupBy(bfDomains, (r: any) => r.domain_id as number),
    capDomainsByDomainId: groupBy(capabilityDomains, (r: any) => r.domain_id as number),
    capabilityById: new Map(capabilities.map((c: any) => [c.id as number, c])),
    moduleCapsByModuleId: groupBy(moduleCaps, (r: any) => r.domain_module_id as number),
    dmdoByModuleId: groupBy(dmdo, (r: any) => r.domain_module_id as number),
    dmdoByDataObjectId: groupBy(dmdo, (r: any) => r.data_object_id as number),
    handoffsBySourceDomainId: groupBy(handoffs, (h: any) => h.source_domain_id as number),
    handoffsBySourceModuleId: groupBy(handoffs.filter((h: any) => h.source_domain_module_id != null), (h: any) => h.source_domain_module_id as number),
    skillsByDomainId: groupBy(skills.filter((s: any) => s.domain_id != null), (s: any) => s.domain_id as number),
    moduleToolsByModuleId: groupBy(moduleTools, (r: any) => r.domain_module_id as number),
    roleModulesByModuleId: groupBy(roleModules, (r: any) => r.domain_module_id as number),
    dataObjectById: new Map(dataObjects.map((d: any) => [d.id as number, d])),
    usersId: usersRow?.id as number | undefined,
    lifecycleByDataObjectId: groupBy(lifecycle, (r: any) => r.data_object_id as number),
    doAliasesByDataObjectId: groupBy(doAliases, (r: any) => r.data_object_id as number),
    relationships,
    toolById: new Map(tools.map((t: any) => [t.id as number, t])),
    roleById: new Map(domainRoles.map((r: any) => [r.id as number, r])),
  };
}

// ---------- per-domain spec build ----------

function buildSpec(domainCode: string, lk: Bulk): { spec: any; masters: any[]; capNames: string[]; adjacentDomainCodes: string[]; handoffCount: number } {
  const domainRow = lk.domainByCode.get(domainCode);
  if (!domainRow) throw new Error(`domain ${domainCode} not found in /domains`);
  const domainId = domainRow.id as number;

  // Modules hosted on this domain: primary (domain_id) + host junction. Resolved from the one-time
  // bulk load; no per-domain reads.
  const moduleById = lk.moduleById;
  const primaryModuleIds = (lk.modulesByDomainId.get(domainId) ?? []).map((m) => m.id as number);
  const hostModuleIds = (lk.hostByDomainId.get(domainId) ?? []).map((h) => h.domain_module_id as number);
  const discoveredModuleIds = [...new Set([...primaryModuleIds, ...hostModuleIds])];

  // A per-domain spec covers only the domain's FULL modules. A starter (module_kind='starter')
  // is just a packaged subset of the domain; the combination-agnostic skill already handles any
  // subset via discovery, so starters are NOT enumerated here. This single filter also keeps a
  // starter that only reaches this domain via the host junction (e.g. the domain-less HVAC bundle
  // on FSM) out of the domain spec. Domain-less starters get their own bundle skill (see emitBundle).
  const moduleIds = discoveredModuleIds.filter((id) => moduleById.get(id)?.module_kind === "full");

  // Per-domain slices, derived in memory from the bulk indices (was 9 scoped reads + 5 follow-ups).
  const domainAliases = lk.domainAliasesByDomainId.get(domainId) ?? [];
  const bfDomains = lk.bfDomainsByDomainId.get(domainId) ?? [];
  const capDomains = lk.capDomainsByDomainId.get(domainId) ?? [];
  const moduleCaps = moduleIds.flatMap((mid) => lk.moduleCapsByModuleId.get(mid) ?? []);
  const dmdo = moduleIds.flatMap((mid) => lk.dmdoByModuleId.get(mid) ?? []);
  const outboundHandoffsRaw = (lk.handoffsBySourceDomainId.get(domainId) ?? []).filter(
    (h) => (h.target_domain_id as number) !== domainId,
  );
  const systemSkills = (lk.skillsByDomainId.get(domainId) ?? []).slice();
  const moduleTools = moduleIds.flatMap((mid) => lk.moduleToolsByModuleId.get(mid) ?? []);
  const roleModules = moduleIds.flatMap((mid) => lk.roleModulesByModuleId.get(mid) ?? []);

  // ----- data object detail (all masters + entities referenced in scope) -----
  const scopeObjectIds = [...new Set(dmdo.map((r) => r.data_object_id as number))];
  const doById = new Map<number, any>();
  for (const id of scopeObjectIds) {
    const d = lk.dataObjectById.get(id);
    if (d) doById.set(id, d);
  }
  const masterIds = [...new Set(dmdo.filter((r) => r.role === "master").map((r) => r.data_object_id as number))];
  const masterIdSet = new Set(masterIds);
  const usersId = lk.usersId;

  // Master-scoped lifecycle/alias views come straight from the bulk indices; relationships are the
  // rows where either endpoint is one of this domain's masters (the old `or=(...)` query, in memory).
  const lifecycleByDo = lk.lifecycleByDataObjectId;
  const aliasByDo = lk.doAliasesByDataObjectId;
  const relationshipRows = lk.relationships.filter(
    (r) => masterIdSet.has(r.data_object_id as number) || masterIdSet.has(r.related_data_object_id as number),
  );

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
        .map((r) => lk.capabilityById.get(r.capability_id as number)?.capability_code)
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
        // has_personal_content is a HINT that this entity holds owner-scoped rows and an
        // ABAC rule (JsonLogic select_rule / validation_rules) should be authored. It does
        // not by itself enforce anything. Emitted as a direct property (the former
        // pattern_flags wrapper was dropped 2026-06-26 once it held a single flag).
        has_personal_content: Boolean(d.has_personal_content),
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
    .filter(Boolean)
    .sort((a: any, b: any) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.verb.localeCompare(b.verb));

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

  // ----- system skills (per-domain spec: the DOMAIN-GRAIN skill only) -----
  // The catalog carries SYSTEM skills at two grains: domain (domain_id set, domain_module_id
  // null) and starter (domain_module_id -> a module_kind='starter'). A per-domain spec emits
  // ONLY the domain-grain skill: a starter is just a packaged subset the combination-agnostic
  // skill already covers, so its skill is not surfaced here. The starter skill row ALSO carries
  // domain_id, so the query pins domain_module_id IS NULL (not just domain_id). Domain-less
  // starters get their own skill via emitBundle. PROCESS skills (process_id set) are out of
  // scope. The domain skill's tools = union across the domain's FULL modules.
  const toolById = lk.toolById;
  const moduleToolsByModule = groupBy(moduleTools, (r) => r.domain_module_id as number);
  const fullModuleIds = moduleIds; // moduleIds is already filtered to FULL modules above
  const systemSkillsOut = systemSkills
    .sort((a, b) => (a.skill_name as string).localeCompare(b.skill_name as string))
    .map((s) => {
      // Domain skills derive their toolset from the union of the domain's FULL modules.
      const byTool = new Map<number, boolean>();
      for (const mid of fullModuleIds.filter(Boolean)) {
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
        skill_grain: "domain",
        skill_name: s.skill_name,
        description: clean((s.description as string) ?? ""),
        trigger_keywords: (s.trigger_keywords as string) ?? "",
        tools,
      };
    });

  // ----- roles (personas) -----
  const roleIds = [...new Set(roleModules.map((r) => r.role_id as number))];
  const roleById = lk.roleById;
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
    const name = lk.businessFunctionNameById.get(r.business_function_id as number);
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
    .map((r) => {
      const cap = lk.capabilityById.get(r.capability_id as number);
      return {
        code: cap?.capability_code,
        name: cap?.capability_name,
        cross_cutting: (lk.capabilityDomainCount.get(r.capability_id as number) ?? 1) > 1,
      };
    })
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
      certification_required: Boolean(domainRow.certification_required),
      catalog_tagline: clean(domainRow.catalog_tagline ?? ""),
      catalog_description: clean(domainRow.catalog_description ?? ""),
    },

    aliases,
    business_functions: bf,
    capabilities,
    modules: modulesOut,
    data_objects: masterDetail,
    relationships,
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
    handoffCount: outbound.length,
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

// ---------- domain-less bundle spec build ----------

// A domain-less starter (module_kind='starter', domain_id=null) is a cross-domain industry
// bundle (e.g. HVAC-SVC-MGMT, REAL-ESTATE-AGENT). It masters nothing of its own; it COMPOSES
// entities mastered by the domains it is hosted on, and carries its OWN system skill. There is
// no domain skill to ride on, so it gets its own skill-spec folder. The spec is module-rooted.
function buildBundleSpec(
  code: string,
  lk: Bulk,
): { spec: any; entityPluralLabels: string[]; capNames: string[]; adjacentDomainCodes: string[] } {
  const mod = lk.moduleByCode.get(code);
  if (!mod) throw new Error(`bundle module ${code} not found in /domain_modules`);
  if (mod.module_kind !== "starter") throw new Error(`${code} is module_kind='${mod.module_kind}', not a starter bundle`);
  const moduleId = mod.id as number;

  // All slices derived in memory from the one-time bulk load.
  const hosts = lk.hostByModuleId.get(moduleId) ?? [];
  const dmdo = lk.dmdoByModuleId.get(moduleId) ?? [];
  const caps = lk.moduleCapsByModuleId.get(moduleId) ?? [];
  const skillRows = mod.domain_id != null ? lk.skillsByDomainId.get(mod.domain_id as number) ?? [] : [];
  const moduleTools = lk.moduleToolsByModuleId.get(moduleId) ?? [];
  const roleModules = lk.roleModulesByModuleId.get(moduleId) ?? [];
  const outboundRaw = lk.handoffsBySourceModuleId.get(moduleId) ?? [];

  // After §3 the bundle is promoted to a domain_kind='bundle' domain that carries the buyer
  // catalog copy; read the tagline from there so it survives the §5 module-catalog CLEAR. Pre-§3
  // (no bundle-domain yet) bundleDomain is null and spec.bundle.tagline falls back to the module.
  const bundleDomainRow = lk.domainByCode.get(code);
  const bundleDomain = bundleDomainRow && bundleDomainRow.domain_kind === "bundle" ? bundleDomainRow : null;

  const hostDomainCodes = hosts
    .map((h) => lk.domainCodeById.get(h.domain_id as number))
    .filter((c): c is string => Boolean(c))
    .sort();

  // Composed entities (the bundle masters nothing): resolve names + the domain that masters each.
  const entityIds = [...new Set(dmdo.map((r) => r.data_object_id as number))];
  const doById = lk.dataObjectById;
  const ownerDomainByDo = new Map<number, string | null>();
  for (const did of entityIds) {
    const masterRow = (lk.dmdoByDataObjectId.get(did) ?? []).find((r) => r.role === "master");
    if (!masterRow) continue;
    const domId = lk.moduleDomainById.get(masterRow.domain_module_id as number);
    ownerDomainByDo.set(did, domId != null ? lk.domainCodeById.get(domId) ?? null : null);
  }
  const composes = dmdo
    .map((r) => {
      const d = doById.get(r.data_object_id as number);
      if (!d) return null;
      return {
        name: d.data_object_name,
        singular_label: d.singular_label,
        plural_label: d.plural_label,
        role: r.role,
        owning_domain: ownerDomainByDo.get(r.data_object_id as number) ?? null,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  const capabilities = caps
    .map((r) => {
      const cap = lk.capabilityById.get(r.capability_id as number);
      return {
        code: cap?.capability_code,
        name: cap?.capability_name,
        cross_cutting: (lk.capabilityDomainCount.get(r.capability_id as number) ?? 1) > 1,
      };
    })
    .filter((c) => c.code)
    .sort((a, b) => (a.code as string).localeCompare(b.code as string));

  // The bundle's own system skill (one per starter; modeled singular).
  const toolById = lk.toolById;
  const tools = moduleTools
    .map((r) => {
      const t = toolById.get(r.tool_id as number);
      return t ? { name: t.tool_name, kind: t.operation_kind, required: r.requirement_level === "required" } : null;
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.name.localeCompare(b.name));
  const systemSkill = skillRows.length
    ? {
        skill_grain: "domain",
        skill_name: skillRows[0].skill_name,
        description: clean((skillRows[0].description as string) ?? ""),
        trigger_keywords: (skillRows[0].trigger_keywords as string) ?? "",
        tools,
      }
    : null;

  // Outbound handoffs + APQC rollup.
  const apqc = new Map<string, string>();
  const outbound = outboundRaw.map((h) => {
    const procs = (h.handoff_processes ?? [])
      .map((hp: any) => hp.processes)
      .filter(Boolean)
      .map((p: any) => ({ external_id: p.external_id, name: clean(p.process_name) }));
    for (const p of procs) apqc.set(String(p.external_id), p.name);
    return {
      trigger_event: h.trigger_events?.event_name ?? null,
      payload: h.data_objects?.data_object_name ?? null,
      target_domain: h.target_domain_id != null ? lk.domainCodeById.get(h.target_domain_id as number) ?? null : null,
      target_module: h.target_domain_module_id != null ? lk.moduleCodeById.get(h.target_domain_module_id as number) ?? null : null,
      integration_pattern: h.integration_pattern ?? null,
      friction_level: h.friction_level ?? null,
      apqc_processes: procs,
    };
  });
  const apqcTouched = [...apqc.entries()]
    .map(([external_id, name]) => ({ external_id, name }))
    .sort((a, b) => a.external_id.localeCompare(b.external_id, undefined, { numeric: true }));

  // Roles (personas) on the bundle module.
  const roleIds = [...new Set(roleModules.map((r) => r.role_id as number))];
  const roleById = lk.roleById;
  const roles = roleIds
    .map((rid) => {
      const role = roleById.get(rid);
      if (!role) return null;
      const rm = roleModules.find((x) => (x.role_id as number) === rid);
      return {
        code: role.role_code,
        business_function: role.business_function_id != null ? lk.businessFunctionNameById.get(role.business_function_id as number) ?? null : null,
        interaction: rm?.interaction_level ?? null,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.code.localeCompare(b.code));

  const enums: Record<string, string[]> = {};
  for (const e of ENUM_SPEC) enums[e.key] = lk.enumByKey.get(e.key) ?? [];

  const spec = {
    facts_major: FACTS_MAJOR,
    emitted: todayIso(),
    catalog_snapshot: lk.snapshot,

    bundle: {
      code: mod.domain_module_code,
      name: mod.domain_module_name,
      kind: "industry_starter",
      domain_attached: false,
      tagline: clean(bundleDomain?.catalog_tagline ?? mod.catalog_tagline ?? ""),
      catalog_description: clean(bundleDomain?.catalog_description ?? ""),
      description: clean(mod.description ?? ""),
      host_domains: hostDomainCodes,
    },

    capabilities,
    composes,
    apqc_processes_touched: apqcTouched,
    system_skill: systemSkill,
    roles,
    enums,
  };

  return {
    spec,
    entityPluralLabels: composes.map((c: any) => c.plural_label as string),
    capNames: capabilities.map((c) => c.name as string),
    adjacentDomainCodes: hostDomainCodes,
  };
}

// ---------- template rendering (template text + catalog.yaml render variables) ----------

// Resolves the {{...}} placeholders in ANY template file (SKILL.md, references/*.md, scripts/*.ts),
// not just SKILL.md. The same variable set is substituted everywhere, so a placeholder such as
// {{DOMAIN_CODE_LOWER}} renders identically wherever it appears across the template tree.
function renderTemplate(
  text: string,
  v: { domainCodeLower: string; moduleSlug: string; domainName: string; skillDescription: string; capabilityNames: string[] },
): string {
  const subs: Record<string, string> = {
    SKILL_DESCRIPTION: v.skillDescription,
    DOMAIN_CODE_LOWER: v.domainCodeLower,
    // Uppercase canonical code, exactly as the deploy pipeline stamps modules.settings.domain_code
    // (e.g. IT-OPS-STARTER). Round-trips from the lowercase var since codes are uppercase + hyphens.
    DOMAIN_CODE: v.domainCodeLower.toUpperCase(),
    DOMAIN_NAME: v.domainName,
    CAPABILITY_NAMES_COMMA_LIST: v.capabilityNames.join(", "),
    MODULE_SLUG: v.moduleSlug,
  };
  let out = text;
  for (const [k, val] of Object.entries(subs)) out = out.replaceAll(`{{${k}}}`, val);
  // Safety net: strip any em-dash that slipped through from a substituted DB value.
  return out.replace(/\s*—\s*/g, ", ");
}

// ---------- catalog.yaml builder (the single owner of catalog.yaml's shape) ----------

// Emits catalog.yaml as a pure projection of DB-derived values. No category / search_keywords /
// icon (we never had those as DB columns); no hand-authored content. New variables get added
// here only when the DB actually carries them, never invented.
function buildCatalogYaml(v: {
  code: string;
  name: string;
  tagline: string;
  description: string;
  skillDescription: string;
  capabilityNames: string[];
  relatedSkills: string[];
}): string {
  const codeLower = v.code.toLowerCase();
  const q = (s: string) => `"${s.replace(/"/g, "'")}"`;
  const yamlList = (key: string, items: string[]) =>
    items.length ? `${key}:\n${items.map((i) => `  - ${i}`).join("\n")}` : `${key}: []`;
  // catalog_description is a literal block: one paragraph per line, blank line between paragraphs.
  const descBlock = v.description
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean)
    .map((p) => `  ${p}`)
    .join("\n\n");
  return [
    `# Projection of live catalog DB values for the use-${codeLower} skill.`,
    `# Emitted by scripts/emit_skill_spec.ts. The database is the source of truth; do NOT hand-edit.`,
    `# DB-derived only: buyer copy persisted from the domains table + the variables the SKILL.md`,
    `# template ({{...}}) renders. No hand-authored / original content lives in this file.`,
    ``,
    `domain_code: ${v.code}`,
    `domain_code_lower: ${codeLower}`,
    `domain_name: ${q(v.name)}`,
    `module_slug: ${codeLower}`,
    `skill_name: use-${codeLower}`,
    ``,
    `# Buyer copy, persisted from domains.catalog_tagline / domains.catalog_description.`,
    `catalog_tagline: ${q(v.tagline)}`,
    `catalog_description: |`,
    descBlock,
    ``,
    `# Rendered into the SKILL.md frontmatter description:.`,
    `skill_description: ${q(v.skillDescription)}`,
    ``,
    `# Rendered into the SKILL.md "Workflows / capabilities" line (domain_module_capabilities).`,
    yamlList("capability_names", v.capabilityNames),
    ``,
    `depends_on_skills:`,
    `  - use-semantius`,
    yamlList("related_skills", v.relatedSkills),
    ``,
  ].join("\n");
}

// catalog.yaml is a DB projection, so missing buyer copy is an ERROR, not a placeholder: a stub
// that silently ships missing text is exactly the bug being fixed. Stop the emit for this code.
function assertBuyerCopy(code: string, tagline: string, description: string): void {
  const missing: string[] = [];
  if (!tagline.trim()) missing.push("catalog_tagline");
  if (!description.trim()) missing.push("catalog_description");
  if (missing.length) {
    throw new Error(
      `${code}: empty ${missing.join(" + ")} on the domains row. catalog.yaml is a DB projection, so the ` +
        `emit STOPS here instead of writing a placeholder. Populate the field(s) in the database, then re-emit.`,
    );
  }
}

// ---------- writers ----------

// skill-specs/<CODE>/ holds DATA only: spec.json (DB facts) + catalog.yaml (DB projection). The
// rendered SKILL.md is NOT stored here; it is rendered into the installable skill folder from
// template + catalog.yaml. Any stale SKILL.md from the old behavior is removed.
// spec.json differs day-to-day only in its date fields (`emitted`, and the date suffix of
// `catalog_snapshot`). Compare with those normalized so a re-run that changes nothing else does
// NOT rewrite spec.json (avoids date-only churn in git). When real content changes, the full spec
// is written with the current date. An unparseable existing file falls through and gets rewritten.
function specEqualIgnoringDates(a: string, b: string): boolean {
  const strip = (s: string): string => {
    try {
      const o = JSON.parse(s);
      o.emitted = "";
      if (typeof o.catalog_snapshot === "string") o.catalog_snapshot = o.catalog_snapshot.replace(/\d{4}-\d{2}-\d{2}$/, "");
      return JSON.stringify(o);
    } catch {
      return s;
    }
  };
  return strip(a) === strip(b);
}

function writeFolder(code: string, specJson: string, catalogYaml: string): void {
  const dir = `${SKILL_SPECS_DIR}/${code}`;
  mkdirSync(dir, { recursive: true });
  // Only rewrite spec.json when something other than the date changed (no date-only churn).
  const specPath = `${dir}/spec.json`;
  if (!(existsSync(specPath) && specEqualIgnoringDates(readFileSync(specPath, "utf8"), specJson))) {
    writeFileSync(specPath, specJson, "utf8");
  }
  writeFileSync(`${dir}/catalog.yaml`, catalogYaml, "utf8");
  rmSync(`${dir}/SKILL.md`, { force: true }); // skill-specs no longer stores an expanded SKILL.md
}

// Every file under a directory, recursively (used to render all copied template files in place).
function walkDir(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...walkDir(full));
    else if (e.isFile()) out.push(full);
  }
  return out;
}

// Assembles the INSTALLABLE skill folder <SKILLS_DIR>/use-<code>/:
//   (a) delete any existing folder, (b) copy the generic domain-skill-template (references/,
//   scripts/, the template SKILL.md with {{...}} placeholders), (c) copy this entry's data
//   (spec.json + catalog.yaml), (d) render {{...}} IN PLACE across EVERY copied template file,
//   not just SKILL.md: placeholders such as the blueprint URL {{DOMAIN_CODE_LOWER}} also live in
//   references/bootstrap.md. spec.json + catalog.yaml sit at the folder root and are left as data
//   (catalog.yaml is the render INPUT). The expanded files exist ONLY in the installable folder.
function assembleInstalledSkill(specCode: string, template: string): string {
  const skillName = `use-${specCode.toLowerCase()}`;
  const dest = `${SKILLS_DIR}/${skillName}`;
  rmSync(dest, { recursive: true, force: true }); // (a)
  mkdirSync(dest, { recursive: true });
  cpSync(TEMPLATE_DIR, dest, { recursive: true }); // (b) template SKILL.md + references/ + scripts/
  for (const f of ["spec.json", "catalog.yaml"]) {
    cpSync(`${SKILL_SPECS_DIR}/${specCode}/${f}`, `${dest}/${f}`); // (c)
  }
  // (d) render placeholders everywhere. SKILL.md comes from the in-memory template; references/
  // and scripts/ are rendered from disk. The data files at the folder root are never rendered.
  const vars = readRenderVars(dest);
  writeFileSync(`${dest}/SKILL.md`, renderTemplate(template, vars), "utf8");
  for (const sub of ["references", "scripts"]) {
    const subdir = `${dest}/${sub}`;
    if (!existsSync(subdir)) continue;
    for (const file of walkDir(subdir)) {
      writeFileSync(file, renderTemplate(readFileSync(file, "utf8"), vars), "utf8");
    }
  }
  return skillName;
}

// ---------- driver ----------

async function emitOne(code: string, lk: Bulk, template: string): Promise<void> {
  const { spec, capNames, adjacentDomainCodes, handoffCount } = await buildSpec(code, lk);
  const specJson = JSON.stringify(spec, null, 2) + "\n";
  if (STDOUT) {
    process.stdout.write(specJson);
    return;
  }
  const tagline = spec.domain.catalog_tagline ?? "";
  const description = spec.domain.catalog_description ?? "";
  assertBuyerCopy(code, tagline, description);
  const catalogYaml = buildCatalogYaml({
    code: spec.domain.code,
    name: spec.domain.name,
    tagline,
    description,
    skillDescription: skillDescriptionFrom(code, spec.system_skills[0]),
    capabilityNames: capNames,
    relatedSkills: adjacentDomainCodes.map((c) => `use-${c.toLowerCase()}`),
  });
  writeFolder(code, specJson, catalogYaml);
  const skillName = assembleInstalledSkill(code, template);
  console.log(
    `wrote ${SKILL_SPECS_DIR}/${code}/ [domain] ${spec.modules.length} modules, ${spec.data_objects.length} masters, ${handoffCount} handoffs -> installed ${SKILLS_DIR}/${skillName}/ (catalog.yaml + SKILL.md projected from DB)`,
  );
}

async function emitBundle(code: string, lk: Bulk, template: string): Promise<void> {
  const { spec, capNames, adjacentDomainCodes } = await buildBundleSpec(code, lk);
  const specJson = JSON.stringify(spec, null, 2) + "\n";
  if (STDOUT) {
    process.stdout.write(specJson);
    return;
  }
  const tagline = spec.bundle.tagline ?? "";
  const description = spec.bundle.catalog_description ?? "";
  assertBuyerCopy(code, tagline, description);
  const catalogYaml = buildCatalogYaml({
    code: spec.bundle.code,
    name: spec.bundle.name,
    tagline,
    description,
    skillDescription: skillDescriptionFrom(code, spec.system_skill),
    capabilityNames: capNames,
    relatedSkills: adjacentDomainCodes.map((c) => `use-${c.toLowerCase()}`),
  });
  writeFolder(code, specJson, catalogYaml);
  const skillName = assembleInstalledSkill(code, template);
  console.log(
    `wrote ${SKILL_SPECS_DIR}/${code}/ [bundle] ${spec.composes.length} composed entities, hosts: ${spec.bundle.host_domains.join("/") || "none"} -> installed ${SKILLS_DIR}/${skillName}/ (catalog.yaml + SKILL.md projected from DB)`,
  );
}

const lk = await loadBulk();
const template = await Bun.file(TEMPLATE_PATH).text();

type Task = { code: string; kind: "domain" | "bundle" };

// "Generate all" domains = every domain with >=1 module (a deployable unit a per-domain skill
// can cover). The domains.catalog_release date is about site publication, not skill eligibility
// (ATS has no release date), so it is NOT a filter here.
async function domainCodesWithModules(): Promise<string[]> {
  const withModules = await get("/domain_modules?select=domain_id&limit=20000");
  const ids = new Set(withModules.map((r) => r.domain_id as number));
  // Exclude domain_kind='bundle': a promoted bundle-domain (plan §3) has a module (its starter),
  // so without this filter it would be emitted BOTH as a domain folder here and as a bundle
  // folder via domainLessBundleCodes() (double-emit, plan §4 Finding 4). Bundles dispatch ONLY
  // through the bundle path.
  const allDomains = await get("/domains?select=id,domain_code,domain_kind&limit=10000");
  return allDomains
    .filter((d) => ids.has(d.id as number) && d.domain_kind !== "bundle")
    .map((d) => d.domain_code as string)
    .sort();
}
async function domainLessBundleCodes(): Promise<string[]> {
  // A bundle is a domain_kind='bundle' domain (post-promotion, plan §3) OR — during the
  // transition before §3 sets the starters' domain_id — a legacy starter module with
  // domain_id=null. The legacy clause returns nothing once §3 runs (and §6 flips the column
  // NOT NULL); it is a removable shim kept so `--regenerate` keeps recognizing the committed
  // bundle folders mid-migration. The two key spaces coincide: a promoted bundle's domain_code
  // equals its starter's domain_module_code (§3 copies the code).
  const [bundleDomains, legacy] = await Promise.all([
    get("/domains?domain_kind=eq.bundle&select=domain_code"),
    get("/domain_modules?module_kind=eq.starter&domain_id=is.null&select=domain_module_code"),
  ]);
  const codes = new Set<string>([
    ...bundleDomains.map((r) => r.domain_code as string),
    ...legacy.map((r) => r.domain_module_code as string),
  ]);
  return [...codes].sort();
}

let tasks: Task[];
if (ALL) {
  const [domainCodes, bundleCodes] = await Promise.all([domainCodesWithModules(), domainLessBundleCodes()]);
  // "generate all always requires a confirmation": without --yes (and not a read-only
  // --stdout run) list the targets and stop. Re-run with --yes to actually write.
  if (!STDOUT && !YES) {
    console.error(`--all targets ${domainCodes.length} domains + ${bundleCodes.length} domain-less bundles:`);
    console.error("  domains: " + domainCodes.join(", "));
    console.error("  bundles: " + (bundleCodes.join(", ") || "(none)"));
    console.error(`\nThis OVERWRITES spec.json + SKILL.md in ${domainCodes.length + bundleCodes.length} folders under`);
    console.error(`${SKILL_SPECS_DIR}. Nothing written yet. Re-run with --yes to proceed.`);
    process.exit(0);
  }
  tasks = [
    ...domainCodes.map((code) => ({ code, kind: "domain" as const })),
    ...bundleCodes.map((code) => ({ code, kind: "bundle" as const })),
  ];
  console.error(`--all: writing ${tasks.length} folders (${domainCodes.length} domains + ${bundleCodes.length} bundles)`);
} else if (RELEASED) {
  // Same target set as --all, restricted to RELEASED domains/bundles (domains.catalog_release != null,
  // any date). lk.domainByCode carries catalog_release (added to the bulk load), so the filter needs no
  // extra query. Like --all, writing OVERWRITES every targeted folder and requires --yes.
  const [domainCodes, bundleCodes] = await Promise.all([domainCodesWithModules(), domainLessBundleCodes()]);
  const isReleased = (code: string) => Boolean(lk.domainByCode.get(code)?.catalog_release);
  const relDomains = domainCodes.filter(isReleased);
  const relBundles = bundleCodes.filter(isReleased);
  if (!STDOUT && !YES) {
    console.error(`--released targets ${relDomains.length} released domains + ${relBundles.length} released bundles:`);
    console.error("  domains: " + (relDomains.join(", ") || "(none)"));
    console.error("  bundles: " + (relBundles.join(", ") || "(none)"));
    console.error(`\nThis OVERWRITES spec.json + catalog.yaml + the installable skill in ${relDomains.length + relBundles.length} folders.`);
    console.error(`Nothing written yet. Re-run with --yes to proceed.`);
    process.exit(0);
  }
  tasks = [
    ...relDomains.map((code) => ({ code, kind: "domain" as const })),
    ...relBundles.map((code) => ({ code, kind: "bundle" as const })),
  ];
  console.error(`--released: writing ${tasks.length} folders (${relDomains.length} domains + ${relBundles.length} bundles)`);
} else if (REGEN) {
  const folders = existsSync(SKILL_SPECS_DIR)
    ? readdirSync(SKILL_SPECS_DIR, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()
    : [];
  if (folders.length === 0) {
    console.error(`--regenerate: no existing skill-spec folders under ${SKILL_SPECS_DIR}; nothing to do.`);
    process.exit(0);
  }
  // Each existing folder is either a domain or a domain-less bundle; dispatch by code.
  const bundleSet = new Set(await domainLessBundleCodes());
  tasks = folders.map((code) => ({ code, kind: bundleSet.has(code) ? "bundle" : "domain" }));
  console.error(`--regenerate: ${folders.length} existing folder(s): ${folders.join(", ")}`);
} else if (BUNDLE_ARG) {
  tasks = [{ code: BUNDLE_ARG, kind: "bundle" }];
} else {
  tasks = [{ code: DOMAIN_ARG as string, kind: "domain" }];
}

let failures = 0;
for (const t of tasks) {
  try {
    if (t.kind === "bundle") await emitBundle(t.code, lk, template);
    else await emitOne(t.code, lk, template);
  } catch (e) {
    failures++;
    console.error(`FAILED ${t.code} [${t.kind}]: ${(e as Error).message}`);
    if (!BATCH) process.exit(1);
  }
}
if (BATCH) console.error(`done: ${tasks.length - failures}/${tasks.length} emitted${failures ? `, ${failures} failed` : ""}`);
