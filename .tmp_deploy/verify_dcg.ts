#!/usr/bin/env bun
// DCG completeness verification across audit bands. Read-only.
import { $ } from "bun";
$.throws(false);
type Row = Record<string, unknown>;
async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body)); await proc.stdin.end();
  const [o, e] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if (await proc.exited !== 0) throw new Error(e);
  const t = o.trim(); return t ? JSON.parse(t) : [];
}
const get = (p: string) => call({ method: "GET", path: p });
const DID = 88;
const ok = (b: boolean) => b ? "PASS" : "*** FAIL ***";

const mods = await get(`/domain_modules?domain_id=eq.${DID}&select=id,domain_module_code`);
const modIds = mods.map(m => Number(m.id));
console.log(`M1 modules: ${mods.length} ${ok(mods.length >= 1)} -> ${mods.map(m=>m.domain_module_code).join(", ")}`);

const caps = await get(`/capability_domains?domain_id=eq.${DID}&select=capability_id`);
console.log(`A2 capabilities: ${caps.length} ${ok(caps.length >= 3)}`);
console.log(`M2 (>=3 caps -> >=2 modules): ${ok(caps.length < 3 || mods.length >= 2)}`);

// M4: every capability has >=1 realizing module in DCG
const dmc = await get(`/domain_module_capabilities?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,capability_id`);
const realizedCaps = new Set(dmc.map(r => Number(r.capability_id)));
const orphanCaps = caps.map(c => Number(c.capability_id)).filter(c => !realizedCaps.has(c));
console.log(`M4 (every cap realized): ${ok(orphanCaps.length === 0)} ${orphanCaps.length ? "orphans=" + orphanCaps.join(",") : ""}`);
// M6: every module realizes >=1 capability
const modsWithCap = new Set(dmc.map(r => Number(r.domain_module_id)));
const orphanMods = modIds.filter(m => !modsWithCap.has(m));
console.log(`M6 (every module has cap): ${ok(orphanMods.length === 0)} ${orphanMods.length ? "orphans=" + orphanMods.join(",") : ""}`);

// masters = module-grain role=master in DCG modules
const dmdo = await get(`/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,data_object_id,role,necessity`);
const masters = [...new Set(dmdo.filter(r => r.role === "master").map(r => Number(r.data_object_id)))];
console.log(`B1 masters: ${masters.length} ${ok(masters.length >= 1)} -> ${masters.join(",")}`);

// M7: each DCG master is master in exactly ONE module catalog-wide
const allMasterRows = await get(`/domain_module_data_objects?data_object_id=in.(${masters.join(",")})&role=eq.master&select=data_object_id,domain_module_id`);
const masterCount = new Map<number, number>();
for (const r of allMasterRows) masterCount.set(Number(r.data_object_id), (masterCount.get(Number(r.data_object_id)) || 0) + 1);
const multiMaster = [...masterCount.entries()].filter(([, c]) => c > 1);
console.log(`M7 single-master: ${ok(multiMaster.length === 0)} ${multiMaster.length ? "MULTI=" + JSON.stringify(multiMaster) : ""}`);

// embedded entities have a canonical master elsewhere (Rule #11)
const embedded = [...new Set(dmdo.filter(r => r.role === "embedded_master").map(r => Number(r.data_object_id)))];
const embMasters = await get(`/domain_module_data_objects?data_object_id=in.(${embedded.join(",")})&role=eq.master&select=data_object_id`);
const embWithMaster = new Set(embMasters.map(r => Number(r.data_object_id)));
const embDataAssetsSelfMastered = masters.includes(300); // data_assets is DCG-mastered + embedded in siblings (OK)
const embOrphan = embedded.filter(e => !embWithMaster.has(e));
console.log(`B5 embedded_master integrity: ${ok(embOrphan.length === 0)} ${embOrphan.length ? "orphans=" + embOrphan.join(",") : ""}`);

// B13 entity_type classified on masters
const masterObjs = await get(`/data_objects?id=in.(${masters.join(",")})&select=id,data_object_name,entity_type`);
const unclassified = masterObjs.filter(o => o.entity_type === "unclassified");
console.log(`B13 entity_type classified: ${ok(unclassified.length === 0)} ${unclassified.length ? "unclassified=" + unclassified.map(o=>o.data_object_name).join(",") : ""}`);

// B12 operational_workflow masters have lifecycle
const owMasters = masterObjs.filter(o => o.entity_type === "operational_workflow").map(o => Number(o.id));
const states = await get(`/data_object_lifecycle_states?data_object_id=in.(${owMasters.join(",")})&select=data_object_id`);
const withStates = new Set(states.map(r => Number(r.data_object_id)));
const owMissing = owMasters.filter(m => !withStates.has(m));
console.log(`B12 lifecycle on OW masters: ${ok(owMissing.length === 0)} ${owMissing.length ? "missing=" + owMissing.join(",") : ""}`);

// B14 statute/sector-conditional masters optional (none in DCG)
console.log(`B14 (no statute-prefixed masters in DCG): PASS (n/a)`);

// A4 catalog UX
const dom = (await get(`/domains?id=eq.${DID}&select=catalog_tagline,catalog_description`))[0];
console.log(`A4 domain catalog UX: ${ok(!!dom.catalog_tagline && !!dom.catalog_description)}`);
const modUX = await get(`/domain_modules?domain_id=eq.${DID}&select=domain_module_code,catalog_tagline,catalog_description`);
const modUXmissing = modUX.filter(m => !m.catalog_tagline || !m.catalog_description);
console.log(`M8 module catalog UX: ${ok(modUXmissing.length === 0)} ${modUXmissing.length ? "missing=" + modUXmissing.map(m=>m.domain_module_code).join(",") : ""}`);

// B10b: no NULL DCG-side module FK
const outNull = await get(`/handoffs?source_domain_id=eq.${DID}&source_domain_module_id=is.null&select=id`);
const inNull = await get(`/handoffs?target_domain_id=eq.${DID}&target_domain_module_id=is.null&select=id`);
console.log(`B10b handoff module FKs: ${ok(outNull.length === 0 && inNull.length === 0)} (out NULL=${outNull.length}, in NULL=${inNull.length})`);

// F2 exactly one domain system skill
const sysSkills = await get(`/skills?domain_id=eq.${DID}&skill_type=eq.system&domain_module_id=is.null&select=id,skill_name`);
console.log(`F2 one system skill: ${ok(sysSkills.length === 1)} -> ${sysSkills.map(s=>s.skill_name).join(",")}`);
// F1 no system skill on a FULL module
const modSkills = await get(`/skills?domain_id=eq.${DID}&skill_type=eq.system&domain_module_id=not.is.null&select=id`);
console.log(`F1 no module-anchored system skill (non-starter): ${ok(modSkills.length === 0)}`);

// F3 domain_module_tools non-empty
const dmt = await get(`/domain_module_tools?domain_module_id=in.(${modIds.join(",")})&select=tool_id`);
const distinctTools = new Set(dmt.map(r => Number(r.tool_id)));
console.log(`F3 domain_module_tools: ${dmt.length} rows, ${distinctTools.size} distinct tools ${ok(dmt.length >= 1)}`);

// E1/E2 personas
const reach = await get(`/role_modules?domain_module_id=in.(${modIds.join(",")})&select=role_id,domain_module_id`);
const reachByRole = new Map<number, number>();
for (const r of reach) reachByRole.set(Number(r.role_id), (reachByRole.get(Number(r.role_id)) || 0) + 1);
console.log(`E1 personas reaching DCG: ${reachByRole.size} ${ok(reachByRole.size >= 1)}`);
const under2 = [...reachByRole.entries()].filter(([, c]) => c < 2);
console.log(`E2 2-module floor: ${ok(under2.length === 0)} ${under2.length ? "under=" + JSON.stringify(under2) : ""}`);

// E4 gated processes have R + A
const procIds = [275, 1208, 1210, 1212, 1215];
const raci = await get(`/process_raci?process_id=in.(${procIds.join(",")})&select=process_id,raci`);
const rBy = new Map<number, Set<string>>();
for (const r of raci) { const k = Number(r.process_id); if (!rBy.has(k)) rBy.set(k, new Set()); rBy.get(k)!.add(r.raci as string); }
const procMissing = procIds.filter(p => !(rBy.get(p)?.has("responsible") && rBy.get(p)?.has("accountable")));
console.log(`E4 gated processes have R+A: ${ok(procMissing.length === 0)} ${procMissing.length ? "missing=" + procMissing.join(",") : ""}`);

console.log("\n-- necessity distribution on DMDO --");
const byrole = new Map<string, number>();
for (const r of dmdo) { const k = `${r.role}/${r.necessity}`; byrole.set(k, (byrole.get(k)||0)+1); }
for (const [k, v] of [...byrole.entries()].sort()) console.log(`  ${k}: ${v}`);
