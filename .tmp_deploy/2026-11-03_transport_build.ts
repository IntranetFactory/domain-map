#!/usr/bin/env bun
// Builds TMS and TRUCKING-TMS (Phases A, B, C, S, E, regulations) plus the two approved overwrites
// and the two FLEET-MGMT master additions, from the answered a-files of 2026-11-03.
// Dry-run by default: validates names, references, text, and state machines, and writes nothing.
//   bun run .tmp_deploy/2026-11-03_transport_build.ts           (dry-run)
//   bun run .tmp_deploy/2026-11-03_transport_build.ts --apply   (write)
// Idempotent by natural key. record_status is omitted (DB default 'new'). Notes stay empty (Rule #15).
// catalog_tagline and catalog_description are NOT written here: they wait for copy approval (Rule #20).

import { domainMetadataGaps } from "../scripts/lib/health/logic_sam.ts";
import {
  preflightLifecycleStates,
  preflightRelationships,
  preflightTriggerEvents,
  preflightProcessRaci,
  type LifecycleStateRow,
  type RelationshipRow,
  type TriggerEventRow,
} from "../scripts/lib/catalog_invariants.ts";
import { tms } from "./2026-11-03_transport_spec_tms.ts";
import { trucking } from "./2026-11-03_transport_spec_trucking.ts";

type Row = Record<string, any>;
type StateOpt = { t?: number; gate?: string; p?: string };
type Lifecycle = { o: string; m: string; s: [string, StateOpt?][] };
type DO = { n: string; s: string; p: string; et: string; d: string; c: string; pc?: boolean };
type Copy = { tagline: string; description: string };

export type DomainSpec = {
  domain: Row & { domain_code: string; domain_name: string };
  aliases: string[];
  capabilities: { code: string; name: string; description: string; modules: string[]; functionOwner?: number }[];
  modules: { code: string; name: string; description: string }[];
  vendors: Row[];
  solutions: { name: string; vendor: string; description: string; primary?: string[]; secondary?: string[]; partial?: string[] }[];
  extraSolutionLinks?: { name: string; domain: string; coverage: string }[];
  dataObjects: DO[];
  dmdo: [string, string, string, boolean][];
  aliasesDO: [string, string][];
  processes: { code: string; key: string; name: string; description: string; accountable: string; responsible: string[] }[];
  lifecycle: Lifecycle[];
  events: { n: string; o: string; m: string; from: string; to: string; d: string }[];
  handoffs: (string | number | null)[][];
  relationships: [string, string, string, string, string, string, boolean, string][];
  functions: [number, string][];
  skill: { skill_name: string; description: string; trigger_keywords: string };
  tools: [string, string, string | null, string, string][];
  moduleTools: [string, string, string][];
  personas: { code: string; name: string; fn: number | null; description: string; reach: [string, string][] }[];
  regulations: [string, string, string][];
  newRegulations?: { name: string; code: string; type: string; jurisdiction: number; body: string; url: string; description: string }[];
  fleetAdditions?: { dataObjects: DO[]; dmdo: [string, string, string, boolean][]; lifecycle: Lifecycle[] };
  copy: { domain: Copy; modules: Record<string, Copy> };
};

const APPLY = process.argv.includes("--apply");
const specs = [tms, trucking];
// A composed child cannot exist without its parent, so a composition link is always required (B6b).
for (const s of specs) for (const r of s.relationships) if (r[3] === "composition") r[6] = true;

async function call(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Row = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`${method} ${path}: ${err || out}`);
  const t = out.trim();
  return t ? JSON.parse(t) : [];
}
const get = (p: string): Promise<Row[]> => call("GET", p);
function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map((r) => {
    const o: Row = {};
    for (const k of keys) o[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return o;
  });
}
async function insert(path: string, rows: Row[]): Promise<void> {
  for (let i = 0; i < rows.length; i += 50) await call("POST", path, uniformize(rows.slice(i, i + 50)));
}
async function sync(path: string, rows: Row[], key: string, label = path): Promise<Map<string, number>> {
  const read = async () => new Map((await get(`${path}?select=id,${key}&limit=30000`)).map((r) => [String(r[key]), Number(r.id)]));
  const live = await read();
  const missing = rows.filter((r) => !live.has(String(r[key])));
  console.log(`  ${label}: ${missing.length} to insert, ${rows.length - missing.length} present`);
  if (!missing.length) return live;
  await insert(path, missing);
  return read();
}
async function syncJunction(path: string, rows: Row[], keyOf: (r: Row) => string, liveFilter: string): Promise<void> {
  const live = new Set((await get(`${path}?${liveFilter}&limit=30000`)).map(keyOf));
  const missing = rows.filter((r) => !live.has(keyOf(r)));
  console.log(`  ${path}: ${missing.length} to insert, ${rows.length - missing.length} present`);
  if (missing.length) await insert(path, missing);
}

// ------------------------------------------------------------ validation (runs in both modes)
const BRITISH = /normalis|analys(e|ing)\b|organis|materialis|categoris|behaviour|colour|\bcentre|catalogue|modelled|labelled|cancelled|programme|licence|defence|optimis|recognis/i;
const problems: string[] = [];
const warnings: string[] = [];
function scanText(v: unknown, where: string) {
  if (typeof v === "string") {
    if (v.includes("—")) problems.push(`em-dash in ${where}: ${v.slice(0, 80)}`);
    if (BRITISH.test(v)) problems.push(`British spelling in ${where}: ${v.slice(0, 80)}`);
  } else if (Array.isArray(v)) v.forEach((x) => scanText(x, where));
  else if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => scanText(x, `${where}.${k}`));
}
specs.forEach((s) => scanText(s, s.domain.domain_code));
for (const s of specs) {
  const gaps = domainMetadataGaps(s.domain as any);
  if (gaps.length) problems.push(`${s.domain.domain_code} Rule #8 gaps: ${gaps.join(", ")}`);
}

const liveObjects = new Map((await get("/data_objects?select=id,data_object_name&limit=30000")).map((r) => [String(r.data_object_name), Number(r.id)]));
const allNew: DO[] = specs.flatMap((s) => [...s.dataObjects, ...(s.fleetAdditions?.dataObjects ?? [])]);
const newNames = new Set(allNew.map((d) => d.n));

// Rule #9. Approved or known collisions, each with its reason.
const RULE9_OK: Record<string, string> = {
  "carrier_freight_invoices|freight_invoices": "approved in TRUCKING-TMS q14",
  "carrier_freight_quotes|freight_quotes": "approved in TRUCKING-TMS q14",
  "carrier_freight_documents|freight_documents": "approved in TRUCKING-TMS q14",
  "freight_cost_allocations|locations": "false positive, al-locations; order_allocations sets the precedent",
};
const singular = (x: string) => x.replace(/ies$/, "y").replace(/s$/, "");
for (const name of newNames) {
  for (const other of new Set([...liveObjects.keys(), ...newNames])) {
    if (name === other) continue;
    if (name.includes(other) || other.includes(name) || singular(name) === singular(other)) {
      const [a, b] = name.length >= other.length ? [name, other] : [other, name];
      if (!RULE9_OK[`${a}|${b}`]) problems.push(`Rule #9 collision: ${name} / ${other}`);
    }
  }
}
for (const d of allNew) if (liveObjects.has(d.n)) warnings.push(`data_object ${d.n} already live`);

const objectExists = (n: string) => newNames.has(n) || liveObjects.has(n);
const moduleCodes = new Set(specs.flatMap((s) => s.modules.map((m) => m.code)));
const liveModules = new Map((await get("/domain_modules?select=id,domain_module_code&limit=5000")).map((r) => [String(r.domain_module_code), Number(r.id)]));
const moduleExists = (c: string) => moduleCodes.has(c) || liveModules.has(c);
const liveDomains = new Map((await get("/domains?select=id,domain_code&limit=5000")).map((r) => [String(r.domain_code), Number(r.id)]));
const domainExists = (c: string) => liveDomains.has(c) || specs.some((s) => s.domain.domain_code === c);
const eventNames = new Set(specs.flatMap((s) => s.events.map((e) => e.n)));
const liveEvents = new Map((await get("/trigger_events?select=id,event_name&limit=30000")).map((r) => [String(r.event_name), Number(r.id)]));
const liveTools = new Map((await get("/tools?select=id,tool_name&limit=30000")).map((r) => [String(r.tool_name), Number(r.id)]));
const specTools = new Set(specs.flatMap((s) => s.tools.map((t) => t[0])));
const personaCodes = new Set(specs.flatMap((s) => s.personas.map((p) => p.code)));
const regNames = new Set(specs.flatMap((s) => (s.newRegulations ?? []).map((r) => r.name)));

for (const s of specs) {
  const code = s.domain.domain_code;
  for (const [m, o] of [...s.dmdo, ...(s.fleetAdditions?.dmdo ?? [])]) {
    if (!moduleExists(m)) problems.push(`${code} dmdo: unknown module ${m}`);
    if (!objectExists(o)) problems.push(`${code} dmdo: unknown object ${o}`);
  }
  for (const c of s.capabilities) for (const m of c.modules) if (!moduleExists(m)) problems.push(`${code} capability ${c.code}: unknown module ${m}`);
  for (const m of s.modules) if (!s.capabilities.some((c) => c.modules.includes(m.code))) problems.push(`${code} module ${m.code} realizes no capability`);
  for (const m of s.modules) if (!s.dmdo.some(([mm, , r]) => mm === m.code && r === "master")) problems.push(`${code} module ${m.code} masters nothing`);
  for (const [o] of s.aliasesDO) if (!objectExists(o)) problems.push(`${code} alias: unknown object ${o}`);
  const masters = new Set(s.dmdo.filter((r) => r[2] === "master").map((r) => r[1]));
  for (const d of s.dataObjects) if (!masters.has(d.n)) problems.push(`${code} object ${d.n} has no master row`);
  const statesOf = new Map(s.lifecycle.map((l) => [l.o, l.s.map((x) => x[0])]));
  for (const d of s.dataObjects) if (d.et === "operational_workflow" && !statesOf.has(d.n)) problems.push(`${code} workflow object ${d.n} has no lifecycle`);
  for (const l of s.lifecycle) for (const [, opt] of l.s) if (opt?.gate && !s.processes.some((p) => p.code === opt.p)) problems.push(`${code} gate ${opt.gate}: unknown process ${opt.p}`);
  for (const l of s.fleetAdditions?.lifecycle ?? []) statesOf.set(l.o, l.s.map((x) => x[0]));
  for (const e of s.events) {
    const st = statesOf.get(e.o);
    if (!st) problems.push(`${code} event ${e.n}: object has no lifecycle`);
    else if (!st.includes(e.from) || !st.includes(e.to)) problems.push(`${code} event ${e.n}: state ${e.from}->${e.to} not in lifecycle`);
    if (liveEvents.has(e.n)) warnings.push(`event ${e.n} already live`);
  }
  for (const h of s.handoffs) {
    const [src, tgt, sm, tm, o, ev] = h as string[];
    if (!domainExists(src)) problems.push(`${code} handoff: unknown domain ${src}`);
    if (!domainExists(tgt)) problems.push(`${code} handoff: unknown domain ${tgt}`);
    if (sm && !moduleExists(sm)) problems.push(`${code} handoff: unknown module ${sm}`);
    if (tm && !moduleExists(tm)) problems.push(`${code} handoff: unknown module ${tm}`);
    if (!objectExists(o)) problems.push(`${code} handoff: unknown object ${o}`);
    if (!ev || (!eventNames.has(ev) && !liveEvents.has(ev))) problems.push(`${code} handoff: unknown event ${ev}`);
  }
  for (const r of s.relationships) for (const o of [r[0], r[1]]) if (!objectExists(o)) problems.push(`${code} relationship: unknown object ${o}`);
  for (const t of s.tools) if (t[2] && !objectExists(t[2])) problems.push(`${code} tool ${t[0]}: unknown object ${t[2]}`);
  for (const t of s.tools) if ((t[1] === "query" || t[1] === "mutate") !== !!t[2]) problems.push(`${code} tool ${t[0]}: operation_kind and data_object disagree (F4)`);
  for (const [m, t] of s.moduleTools) {
    if (!moduleExists(m)) problems.push(`${code} moduleTool: unknown module ${m}`);
    if (!specTools.has(t) && !liveTools.has(t)) problems.push(`${code} moduleTool: unknown tool ${t}`);
  }
  for (const p of s.processes) for (const a of [p.accountable, ...p.responsible]) if (!personaCodes.has(a)) problems.push(`${code} process ${p.code}: unknown persona ${a}`);
  for (const p of s.personas) if (p.reach.length < 2) problems.push(`${code} persona ${p.code} is below the 2-module floor`);
  for (const p of s.processes) if (p.responsible.includes(p.accountable)) problems.push(`${code} process ${p.code}: A is also R (E4c)`);
  for (const [r] of s.regulations) if (!regNames.has(r)) problems.push(`${code} regulation: unknown ${r}`);
  for (const m of s.modules) if (!s.copy.modules[m.code]) problems.push(`${code} module ${m.code} has no drafted copy`);
}

// Soft invariants through the shared library, using stand-in ids for rows not yet loaded.
const USERS = 748;
let fake = -1;
const pseudo = new Map<string, number>(liveObjects);
const idOf = (n: string) => { if (!pseudo.has(n)) pseudo.set(n, fake--); return pseudo.get(n)!; };
const nameOf = (id: number) => [...pseudo.entries()].find(([, v]) => v === id)?.[0] ?? String(id);
const relRows: RelationshipRow[] = specs.flatMap((s) => s.relationships).map((r, i) => ({ id: `r${i}`, data_object_id: idOf(r[0]), related_data_object_id: idOf(r[1]), relationship_type: r[2], relationship_kind: r[3], relationship_verb: r[4], inverse_verb: r[5], is_required: r[6], owner_side: r[7] }) as any);
const pr = preflightRelationships(relRows, { usersId: USERS, nameOf });
problems.push(...pr.errors);
warnings.push(...pr.warnings);
const lcRows: LifecycleStateRow[] = specs.flatMap((s) => [...s.lifecycle]).flatMap((l) => l.s.map(([state, opt], i) => ({ id: `${l.o}.${state}`, data_object_id: idOf(l.o), state_name: state, state_order: i + 1, is_initial: i === 0, is_terminal: !!opt?.t, requires_permission: !!opt?.gate, permission_verb_override: opt?.gate ?? "", domain_module_id: 1, process_id: opt?.p ? 1 : null }) as any));
const pl = preflightLifecycleStates(lcRows, { nameOf });
problems.push(...pl.errors);
warnings.push(...pl.warnings);
const teRows: TriggerEventRow[] = specs.flatMap((s) => s.events).map((e, i) => ({ id: `e${i}`, event_name: e.n, data_object_id: idOf(e.o), from_state: e.from, to_state: e.to }) as any);
const pe = preflightTriggerEvents(teRows, lcRows, { nameOf });
warnings.push(...pe.warnings);

console.log(`mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
console.log(`new data_objects: ${allNew.length}; relationships: ${relRows.length}; lifecycle states: ${lcRows.length}; events: ${teRows.length}`);
if (warnings.length) console.log(`\nWARNINGS (${warnings.length}):\n  ` + warnings.join("\n  "));
if (problems.length) {
  console.log(`\nPROBLEMS (${problems.length}):\n  ` + problems.join("\n  "));
  process.exit(1);
}
console.log("\nvalidation clean");
if (!APPLY) process.exit(0);

// ------------------------------------------------------------ apply
const domId = new Map(liveDomains);
console.log("\n=== Phase A ===");
const liveDomainRows = await sync("/domains", specs.map((s) => ({ ...s.domain, notes: "" })), "domain_code", "domains");
for (const [k, v] of liveDomainRows) domId.set(k, v);
const did = (c: string) => { const v = domId.get(c); if (!v) throw new Error(`no domain ${c}`); return v; };

const capMap = await sync("/capabilities", specs.flatMap((s) => s.capabilities.map((c) => ({ capability_code: c.code, capability_name: c.name, description: c.description }))), "capability_code", "capabilities");
const specDomainIds = specs.map((s) => did(s.domain.domain_code)).join(",");
await syncJunction("/capability_domains", specs.flatMap((s) => s.capabilities.map((c) => ({ capability_id: capMap.get(c.code), domain_id: did(s.domain.domain_code), notes: "" }))), (r) => `${r.capability_id}:${r.domain_id}`, `domain_id=in.(${specDomainIds})&select=capability_id,domain_id`);

const modMap = await sync("/domain_modules", specs.flatMap((s) => s.modules.map((m) => ({ domain_module_code: m.code, domain_module_name: m.name, description: m.description, domain_id: did(s.domain.domain_code), module_kind: "full" }))), "domain_module_code", "domain_modules");
const mid = (c: string | null) => { if (c === null) return null; const v = modMap.get(c); if (!v) throw new Error(`no module ${c}`); return v; };
const specModuleIds = specs.flatMap((s) => s.modules.map((m) => mid(m.code))).join(",");
await syncJunction("/domain_module_capabilities", specs.flatMap((s) => s.capabilities.flatMap((c) => c.modules.map((m) => ({ domain_module_id: mid(m), capability_id: capMap.get(c.code), notes: "" })))), (r) => `${r.domain_module_id}:${r.capability_id}`, `domain_module_id=in.(${specModuleIds})&select=domain_module_id,capability_id`);

const vendorMap = await sync("/vendors", specs.flatMap((s) => s.vendors.map((v) => ({ ...v, notes: "" }))), "vendor_name", "vendors");
const solMap = await sync("/solutions", specs.flatMap((s) => s.solutions.map((x) => {
  const vendor_id = vendorMap.get(x.vendor);
  if (!vendor_id) throw new Error(`no vendor ${x.vendor}`);
  return { solution_name: x.name, description: x.description, solution_url: "", vendor_id, solution_type: "saas", is_active_in_market: true, solution_kind: "standard_solution", notes: "" };
})), "solution_name", "solutions");
const sdRows: Row[] = [];
for (const s of specs) {
  for (const x of s.solutions) {
    for (const [cov, list] of [["primary", x.primary], ["secondary", x.secondary], ["partial", x.partial]] as const) {
      for (const c of list ?? []) sdRows.push({ solution_id: solMap.get(x.name), domain_id: did(c), coverage_level: cov, notes: "" });
    }
  }
  for (const l of s.extraSolutionLinks ?? []) sdRows.push({ solution_id: solMap.get(l.name), domain_id: did(l.domain), coverage_level: l.coverage, notes: "" });
}
await syncJunction("/solution_domains", sdRows, (r) => `${r.solution_id}:${r.domain_id}`, `domain_id=in.(${specDomainIds})&select=solution_id,domain_id`);
await syncJunction("/domain_aliases", specs.flatMap((s) => s.aliases.map((a) => ({ domain_id: did(s.domain.domain_code), alias: a, alias_type: "synonym", notes: "" }))), (r) => `${r.domain_id}:${r.alias}`, `domain_id=in.(${specDomainIds})&select=domain_id,alias`);

console.log("\n=== Phase B ===");
const doMap = await sync("/data_objects", allNew.map((d) => ({ data_object_name: d.n, singular_label: d.s, plural_label: d.p, description: d.d, catalog_description: d.c, kind: "domain_owned", entity_type: d.et, has_personal_content: !!d.pc, notes: "" })), "data_object_name", "data_objects");
const oid = (n: string) => { const v = doMap.get(n); if (!v) throw new Error(`no data_object ${n}`); return v; };

const fleetDmdo = specs.flatMap((s) => s.fleetAdditions?.dmdo ?? []);
const dmdoRows = [...specs.flatMap((s) => s.dmdo), ...fleetDmdo].map(([m, o, role, opt]) => ({ domain_module_id: mid(m), data_object_id: oid(o), role, is_install_optional: opt, notes: "" }));
const dmdoModules = [...new Set(dmdoRows.map((r) => r.domain_module_id))].join(",");
// Rule #11: an embedded_master needs a master somewhere. Live masters plus this batch.
const embeddedIds = [...new Set(dmdoRows.filter((r) => r.role === "embedded_master").map((r) => r.data_object_id))];
const liveMasters = new Set((await get(`/domain_module_data_objects?data_object_id=in.(${embeddedIds.join(",")})&role=eq.master&select=data_object_id&limit=5000`)).map((r) => r.data_object_id));
for (const r of dmdoRows.filter((x) => x.role === "embedded_master")) {
  if (!liveMasters.has(r.data_object_id) && !dmdoRows.some((x) => x.role === "master" && x.data_object_id === r.data_object_id)) throw new Error(`Rule #11: no master for data_object ${r.data_object_id}`);
}
await syncJunction("/domain_module_data_objects", dmdoRows, (r) => `${r.domain_module_id}:${r.data_object_id}`, `domain_module_id=in.(${dmdoModules})&select=domain_module_id,data_object_id`);
// Corrections to two rows this build's first run wrote: IFTA becomes embedded_master (M9 part 1), and
// pay_runs comes off TRK-SETTLEMENT (M9 part 2; the handoff to PAYROLL covers employee drivers).
const dispatchId = mid("TRK-DISPATCH"), settlementId = mid("TRK-SETTLEMENT");
const [iftaRow] = await get(`/domain_module_data_objects?domain_module_id=eq.${dispatchId}&data_object_id=eq.${oid("ifta_quarterly_returns")}&select=id,role`);
if (iftaRow?.role === "contributor") await call("PATCH", `/domain_module_data_objects?id=eq.${iftaRow.id}`, { role: "embedded_master" });
const [payRow] = await get(`/domain_module_data_objects?domain_module_id=eq.${settlementId}&data_object_id=eq.${oid("pay_runs")}&select=id`);
if (payRow) await call("DELETE", `/domain_module_data_objects?id=eq.${payRow.id}`);

const aliasRows = specs.flatMap((s) => s.aliasesDO.map(([o, a]) => ({ data_object_id: oid(o), alias_name: a, alias_type: "synonym", is_preferred: false, notes: "" })));
await syncJunction("/data_object_aliases", aliasRows, (r) => `${r.data_object_id}:${String(r.alias_name).toLowerCase()}`, `data_object_id=in.(${[...new Set(aliasRows.map((r) => r.data_object_id))].join(",")})&select=data_object_id,alias_name`);

const procMap = await sync("/business_processes", specs.flatMap((s) => s.processes.map((p) => ({ process_name: p.name, process_code: p.code, process_key: p.key, description: p.description, source_framework: "custom", hierarchy_level: 1 }))), "process_code", "business_processes");
// process_key is how the emitter groups RACI rows, so fill it where this build's first run left it empty.
for (const p of specs.flatMap((s) => s.processes)) {
  const [row] = await get(`/business_processes?process_code=eq.${p.code}&select=id,process_key`);
  if (!row.process_key) await call("PATCH", `/business_processes?id=eq.${row.id}`, { process_key: p.key });
}
const lifecycles = specs.flatMap((s) => [...s.lifecycle, ...(s.fleetAdditions?.lifecycle ?? [])]);
const lcInsert = lifecycles.flatMap((l) => l.s.map(([state, opt], i) => ({
  data_object_id: oid(l.o), state_name: state, state_order: i + 1, is_initial: i === 0, is_terminal: !!opt?.t, requires_permission: !!opt?.gate,
  permission_verb_override: opt?.gate ?? "", domain_module_id: mid(l.m), process_id: opt?.p ? procMap.get(opt.p) : null, notes: "", description: "",
})));
await syncJunction("/data_object_lifecycle_states", lcInsert, (r) => `${r.data_object_id}:${r.state_name}`, `data_object_id=in.(${[...new Set(lcInsert.map((r) => r.data_object_id))].join(",")})&select=data_object_id,state_name`);

const evMap = await sync("/trigger_events", specs.flatMap((s) => s.events.map((e) => ({ event_name: e.n, data_object_id: oid(e.o), from_state: e.from, to_state: e.to, event_category: "lifecycle", description: e.d, domain_module_id: mid(e.m) }))), "event_name", "trigger_events");
const hoRows = specs.flatMap((s) => s.handoffs).map((h) => {
  const [src, tgt, sm, tm, o, ev, pattern, friction, description] = h as any[];
  return { source_domain_id: did(src), target_domain_id: did(tgt), source_domain_module_id: mid(sm), target_domain_module_id: mid(tm), data_object_id: oid(o), trigger_event_id: evMap.get(ev), integration_pattern: pattern, friction_level: friction, description, notes: "" };
});
const hoKey = (r: Row) => `${r.source_domain_id}|${r.target_domain_id}|${r.source_domain_module_id}|${r.target_domain_module_id}|${r.data_object_id}|${r.trigger_event_id}`;
const handoffDomainIds = `${specDomainIds},${did("FLEET-MGMT")}`; // the IFTA handoff to FIN starts in FLEET-MGMT
await syncJunction("/handoffs", hoRows, hoKey, `or=(source_domain_id.in.(${handoffDomainIds}),target_domain_id.in.(${handoffDomainIds}))&limit=30000&select=source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,data_object_id,trigger_event_id`);

const relInsert = specs.flatMap((s) => s.relationships).map(([f, t, type, kind, verb, inv, req, own]) => ({ data_object_id: oid(f), related_data_object_id: oid(t), relationship_type: type, relationship_kind: kind, relationship_verb: verb, inverse_verb: inv, is_required: req, owner_side: own, notes: "" }));
await syncJunction("/data_object_relationships", relInsert, (r) => `${r.data_object_id}:${r.related_data_object_id}:${r.relationship_verb}`, `data_object_id=in.(${[...new Set(relInsert.map((r) => r.data_object_id))].join(",")})&select=data_object_id,related_data_object_id,relationship_verb`);

// handoff_processes: APQC tag where the spec names one; null is an explicit deferral.
const liveHandoffs = await get(`/handoffs?or=(source_domain_id.in.(${handoffDomainIds}),target_domain_id.in.(${handoffDomainIds}))&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,data_object_id,trigger_event_id&limit=30000`);
const hoId = new Map(liveHandoffs.map((r) => [hoKey(r), Number(r.id)]));
const hpRows: Row[] = [];
specs.flatMap((s) => s.handoffs).forEach((h, i) => {
  const tag = h[9];
  if (tag === null || tag === undefined) return;
  const process_id = typeof tag === "number" ? tag : procMap.get(String(tag));
  if (!process_id) throw new Error(`no process ${tag}`);
  hpRows.push({ handoff_id: hoId.get(hoKey(hoRows[i])), process_id, role: "implements", proposal_source: "agent_curated", notes: "" });
});
if (hpRows.length) {
  // B9d: a payload this build masters is tagged to the custom process that realizes it. Re-point the
  // APQC tags this build's first run wrote on those same handoffs (own rows, one tag per handoff).
  const handoffIds = hpRows.map((r) => r.handoff_id).join(",");
  const liveTags = await get(`/handoff_processes?handoff_id=in.(${handoffIds})&select=id,handoff_id,process_id`);
  for (const r of hpRows) {
    const wrong = liveTags.find((x) => x.handoff_id === r.handoff_id && x.process_id !== r.process_id);
    if (wrong) await call("PATCH", `/handoff_processes?id=eq.${wrong.id}`, { process_id: r.process_id });
  }
  await syncJunction("/handoff_processes", hpRows, (r) => `${r.handoff_id}:${r.process_id}`, `handoff_id=in.(${handoffIds})&select=handoff_id,process_id`);
}

console.log("\n=== Phase C ===");
await syncJunction("/business_function_domains", specs.flatMap((s) => s.functions.map(([f, r]) => ({ business_function_id: f, domain_id: did(s.domain.domain_code), responsibility_type: r, notes: "" }))), (r) => `${r.business_function_id}:${r.domain_id}`, `domain_id=in.(${specDomainIds})&select=business_function_id,domain_id`);
const bfcRows = specs.flatMap((s) => s.capabilities.filter((c) => c.functionOwner).map((c) => ({ business_function_id: c.functionOwner, capability_id: capMap.get(c.code), responsibility_type: "owner", notes: "" })));
await syncJunction("/business_function_capabilities", bfcRows, (r) => `${r.business_function_id}:${r.capability_id}`, `capability_id=in.(${bfcRows.map((r) => r.capability_id).join(",")})&select=business_function_id,capability_id`);

console.log("\n=== Phase S ===");
await sync("/skills", specs.map((s) => ({ ...s.skill, skill_type: "domain", domain_id: did(s.domain.domain_code) })), "skill_name", "skills");
const toolMap = await sync("/tools", specs.flatMap((s) => s.tools.map(([tool_name, operation_kind, o, coverage_tier, description]) => ({ tool_name, operation_kind, data_object_id: o ? oid(o) : null, coverage_tier, description }))), "tool_name", "tools");
await syncJunction("/domain_module_tools", specs.flatMap((s) => s.moduleTools.map(([m, t, requirement_level]) => {
  const tool_id = toolMap.get(t);
  if (!tool_id) throw new Error(`no tool ${t}`);
  return { domain_module_id: mid(m), tool_id, requirement_level, notes: "" };
})), (r) => `${r.domain_module_id}:${r.tool_id}`, `domain_module_id=in.(${specModuleIds})&select=domain_module_id,tool_id`);

console.log("\n=== Phase E ===");
const roleMap = await sync("/domain_roles", specs.flatMap((s) => s.personas.map((p) => ({ role_code: p.code, role_name: p.name, description: p.description, business_function_id: p.fn }))), "role_code", "domain_roles");
const rmRows = specs.flatMap((s) => s.personas.flatMap((p) => p.reach.map(([m, lvl]) => ({ role_id: roleMap.get(p.code), domain_module_id: mid(m), interaction_level: lvl, notes: "" }))));
await syncJunction("/role_modules", rmRows, (r) => `${r.role_id}:${r.domain_module_id}`, `domain_module_id=in.(${specModuleIds})&select=role_id,domain_module_id`);
const raciRows = specs.flatMap((s) => s.processes.flatMap((p) => [
  { process_id: procMap.get(p.code), actor_role_id: roleMap.get(p.accountable), raci: "accountable", consultation_blocking: false },
  ...p.responsible.map((r) => ({ process_id: procMap.get(p.code), actor_role_id: roleMap.get(r), raci: "responsible", consultation_blocking: false })),
]));
const raciProcs = [...new Set(raciRows.map((r) => r.process_id))].join(",");
const liveRaci = await get(`/process_raci?process_id=in.(${raciProcs})&select=process_id,actor_role_id,actor_skill_id,raci&limit=2000`);
const prc = preflightProcessRaci(raciRows as any, liveRaci as any);
if (prc.errors.length) throw new Error(`process_raci preflight: ${prc.errors.join("; ")}`);
prc.warnings.forEach((w) => console.log(`  warn: ${w}`));
await syncJunction("/process_raci", raciRows, (r) => `${r.process_id}:${r.actor_role_id}:${r.raci}`, `process_id=in.(${raciProcs})&select=process_id,actor_role_id,raci`);

console.log("\n=== Regulations ===");
const regMap = await sync("/regulations", specs.flatMap((s) => s.newRegulations ?? []).map((r) => ({ regulation_name: r.name, regulation_code: r.code, regulation_type: r.type, jurisdiction_id: r.jurisdiction, issuing_body: r.body, regulation_url: r.url, description: r.description, certification_required: false })), "regulation_name", "regulations");
await syncJunction("/domain_regulations", specs.flatMap((s) => s.regulations.map(([name, applicability, condition_notes]) => ({ domain_id: did(s.domain.domain_code), regulation_id: regMap.get(name), applicability, condition_notes, notes: "" }))), (r) => `${r.domain_id}:${r.regulation_id}`, `domain_id=in.(${specDomainIds})&select=domain_id,regulation_id`);

// ------------------------------------------------------------ approved overwrites (TRUCKING-TMS q20, q21)
console.log("\n=== Approved overwrites ===");
async function guardedPatch(path: string, field: string, from: string, to: string, label: string) {
  const [row] = await get(`${path}&select=${field}`);
  if (row?.[field] === to) return console.log(`  ${label}: already applied`);
  if (row?.[field] !== from) throw new Error(`${label}: current value differs from the approved 'from', not overwriting: ${row?.[field]}`);
  await call("PATCH", path, { [field]: to });
  console.log(`  ${label}: updated`);
}
await guardedPatch("/solutions?id=eq.717", "description",
  "Heavy-duty trucking platform (PeopleNet, TMW, Transics): TMS, ELD/telematics, driver workflow, fleet maintenance.",
  "Carrier transportation management suite (TMW.Suite, Innovative, TruckMate) covering loads, dispatch, billing, and settlements, with TMT Fleet Maintenance as a separate product. Connects to third-party in-cab telematics.",
  "Trimble Transportation description");
await guardedPatch("/solution_domains?id=eq.1040", "coverage_level", "primary", "partial", "Trimble coverage on TELEMATICS");
await guardedPatch("/solution_domains?id=eq.1039", "coverage_level", "primary", "secondary", "Trimble coverage on FLEET-MGMT");
const FLEET_FROM = "Umbrella for the operational management of vehicle fleets: vehicle inventory and lifecycle, driver assignment, fuel and expense tracking, dispatch, utilization analytics, and regulatory compliance (DOT/IFTA). Cross-industry buyer (logistics, last-mile delivery, field service, public sector, construction, utilities, rentals). Two sub-domains: TELEMATICS (the GPS/ELD/dashcam data layer) and FLEET-MAINT (preventive maintenance, work orders, parts).";
const FLEET_TO = "Umbrella for the operational management of vehicle fleets: vehicle inventory and lifecycle, driver assignment, fuel and expense tracking, vehicle-to-job dispatch, utilization analytics, and regulatory compliance (DOT/IFTA). Cross-industry buyer (logistics, last-mile delivery, field service, public sector, construction, utilities, rentals). Two sub-domains: TELEMATICS (the GPS/ELD/dashcam data layer) and FLEET-MAINT (preventive maintenance, work orders, parts). Distinct from TRUCKING-TMS (freight load dispatch, customer billing, driver settlement).";
await guardedPatch("/domains?domain_code=eq.FLEET-MGMT", "description", FLEET_FROM, FLEET_TO, "FLEET-MGMT description");

console.log("\n=== Done ===");
for (const s of specs) console.log(`${s.domain.domain_code}: domain id ${did(s.domain.domain_code)}`);
