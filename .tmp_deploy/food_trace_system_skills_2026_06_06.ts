#!/usr/bin/env bun
// B1A-SYS-SKILLS (FOOD-TRACE) — Rule #17 / F2 / F3.
// Author one skill_type='system' skill per module (256/257/258), each with >=1 skill_tools.
// Reuse catalog-wide tools by natural key (re-read immediately before any create, Rule #9).
// Channel-vs-capability (Rule #9 / F7): link notify_person / notify_team, NEVER send_email.
// New domain-specific mutate tools (operation_kind=mutate requires data_object_id; platform-covered).
// Finally DELETE legacy skills.id=62 — ONLY after the 3 per-module system skills exist.
// record_status omitted on inserts (default new). notes left empty (Rule #15).

import { $ } from "bun";
$.throws(false);
type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
async function get(path: string): Promise<Row[]> { return call({ method: "GET", path }); }
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50; const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    out.push(...await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) }));
  }
  return out;
}

// ---- 1) New domain-specific mutate tools (catalog-wide; dedup by tool_name) ----
const newTools = [
  { tool_name: "create_traceability_lot", operation_kind: "mutate", data_object_id: 494, coverage_tier: "platform", description: "Create a traceability lot at an origin and assign its lot code." },
  { tool_name: "record_critical_tracking_event", operation_kind: "mutate", data_object_id: 495, coverage_tier: "platform", description: "Record a FSMA-204 critical tracking event (receive, transform, or ship) against a lot." },
  { tool_name: "capture_key_data_element", operation_kind: "mutate", data_object_id: 496, coverage_tier: "platform", description: "Capture a key data element (lot, location, date, quantity) against a tracking event." },
  { tool_name: "initiate_recall", operation_kind: "mutate", data_object_id: 497, coverage_tier: "platform", description: "Initiate a recall and identify affected lots from lot genealogy." },
  { tool_name: "update_recall_event", operation_kind: "mutate", data_object_id: 497, coverage_tier: "platform", description: "Advance a recall through classification, notification, reconciliation, and closure." },
  { tool_name: "create_supplier_certification", operation_kind: "mutate", data_object_id: 498, coverage_tier: "platform", description: "Add a supplier certification document with its validity and expiry." },
  { tool_name: "update_supplier_certification", operation_kind: "mutate", data_object_id: 498, coverage_tier: "platform", description: "Verify, renew, or revoke a supplier certification and update its status." },
];
const reuseNames = ["query_traceability_lots","query_critical_tracking_events","query_key_data_elements","query_recall_events","query_supplier_certifications","notify_person","notify_team","receive_webhook"];
const allNames = [...newTools.map(t => t.tool_name), ...reuseNames];

const existingTools = await get(`/tools?tool_name=in.(${allNames.join(",")})&select=id,tool_name`);
const haveTool = new Set(existingTools.map(r => String(r.tool_name)));
const toolsToInsert = newTools.filter(t => !haveTool.has(t.tool_name));
console.log(`tools: ${newTools.length} new domain-specific proposed, ${toolsToInsert.length} to insert`);
if (toolsToInsert.length) await insert("/tools", toolsToInsert);
// Rebuild name->id map
const toolRows = await get(`/tools?tool_name=in.(${allNames.join(",")})&select=id,tool_name`);
const toolId = new Map<string, number>();
for (const r of toolRows) toolId.set(String(r.tool_name), Number(r.id));
const tid = (n: string) => { const i = toolId.get(n); if (!i) throw new Error(`tool not found: ${n}`); return i; };

// ---- 2) System skills, one per module (dedup by domain_module_id + system) ----
const skillSpecs = [
  { module: 256, skill_name: "food_trace_traceability_events_agent", description: "System skill for the Traceability Events and Lot Genealogy module: query and write critical tracking events, key data elements, and lot genealogy, and answer traceback requests." },
  { module: 257, skill_name: "food_trace_recall_mgmt_agent", description: "System skill for the Recall Execution module: initiate and drive recalls, identify affected lots from genealogy, notify consignees, and track closure." },
  { module: 258, skill_name: "food_trace_supplier_provenance_agent", description: "System skill for the Supplier Documents and Provenance module: manage supplier certifications, track expiry and renewal, and verify provenance claims." },
];
const existingSkills = await get("/skills?domain_module_id=in.(256,257,258)&skill_type=eq.system&select=id,domain_module_id,skill_name");
const skillByMod = new Map<number, number>();
for (const r of existingSkills) skillByMod.set(Number(r.domain_module_id), Number(r.id));
// system skills require BOTH domain_id (host = 155) AND domain_module_id (check constraint
// `A domain_id is required when skill_type is system`; matches the catalog-wide ATS pattern).
const skillsToInsert = skillSpecs.filter(s => !skillByMod.has(s.module)).map(s => ({
  skill_name: s.skill_name, skill_type: "system", domain_id: 155, domain_module_id: s.module, description: s.description,
}));
console.log(`skills: ${skillSpecs.length} system skills proposed, ${skillsToInsert.length} to insert`);
if (skillsToInsert.length) await insert("/skills", skillsToInsert);
const skillRows = await get("/skills?domain_module_id=in.(256,257,258)&skill_type=eq.system&select=id,domain_module_id");
skillByMod.clear();
for (const r of skillRows) skillByMod.set(Number(r.domain_module_id), Number(r.id));
const sid = (m: number) => { const i = skillByMod.get(m); if (!i) throw new Error(`skill not found for module ${m}`); return i; };

// ---- 3) skill_tools links (dedup by (skill_id, tool_id)) ----
type ST = { module: number; tool: string; requirement_level: "required" | "optional" };
const links: ST[] = [
  // Module 256 — TRACEABILITY-EVENTS
  { module: 256, tool: "query_traceability_lots", requirement_level: "required" },
  { module: 256, tool: "query_critical_tracking_events", requirement_level: "required" },
  { module: 256, tool: "query_key_data_elements", requirement_level: "required" },
  { module: 256, tool: "create_traceability_lot", requirement_level: "required" },
  { module: 256, tool: "record_critical_tracking_event", requirement_level: "required" },
  { module: 256, tool: "capture_key_data_element", requirement_level: "required" },
  { module: 256, tool: "notify_team", requirement_level: "optional" },
  // Module 257 — RECALL-MGMT
  { module: 257, tool: "query_recall_events", requirement_level: "required" },
  { module: 257, tool: "query_traceability_lots", requirement_level: "required" },
  { module: 257, tool: "initiate_recall", requirement_level: "required" },
  { module: 257, tool: "update_recall_event", requirement_level: "required" },
  { module: 257, tool: "notify_person", requirement_level: "required" },
  { module: 257, tool: "notify_team", requirement_level: "optional" },
  { module: 257, tool: "receive_webhook", requirement_level: "optional" },
  // Module 258 — SUPPLIER-PROVENANCE
  { module: 258, tool: "query_supplier_certifications", requirement_level: "required" },
  { module: 258, tool: "create_supplier_certification", requirement_level: "required" },
  { module: 258, tool: "update_supplier_certification", requirement_level: "required" },
  { module: 258, tool: "notify_person", requirement_level: "required" },
];
const skillIds = [sid(256), sid(257), sid(258)];
const existingLinks = await get(`/skill_tools?skill_id=in.(${skillIds.join(",")})&select=skill_id,tool_id`);
const haveLink = new Set(existingLinks.map(r => `${r.skill_id}|${r.tool_id}`));
const linkRows = links
  .map(l => ({ skill_id: sid(l.module), tool_id: tid(l.tool), requirement_level: l.requirement_level }))
  .filter(l => !haveLink.has(`${l.skill_id}|${l.tool_id}`));
console.log(`skill_tools: ${links.length} proposed, ${linkRows.length} to insert`);
if (linkRows.length) await insert("/skill_tools", linkRows);

// ---- 4) DELETE legacy skill 62 — only after the 3 module system skills exist ----
const modSkillCount = (await get("/skills?domain_module_id=in.(256,257,258)&skill_type=eq.system&select=id")).length;
if (modSkillCount === 3) {
  const legacy = await get("/skills?id=eq.62&select=id");
  if (legacy.length) {
    // skill_tools FK to skills — clear children first to avoid restrict.
    const legacyTools = await get("/skill_tools?skill_id=eq.62&select=id");
    if (legacyTools.length) {
      await call({ method: "DELETE", path: "/skill_tools?skill_id=eq.62" });
      console.log(`  DELETEd ${legacyTools.length} skill_tools rows for legacy skill 62`);
    }
    await call({ method: "DELETE", path: "/skills?id=eq.62" });
    console.log("  DELETEd legacy skill 62 (food-trace-system)");
  } else {
    console.log("  legacy skill 62 already gone");
  }
} else {
  console.log(`  WARNING: expected 3 module system skills, found ${modSkillCount}; NOT deleting skill 62`);
}

// ---- 5) Verify ----
const finalSkills = await get("/skills?domain_id=eq.155&select=id,skill_name,skill_type,domain_module_id");
const finalSkillsMod = await get("/skills?domain_module_id=in.(256,257,258)&skill_type=eq.system&select=id,skill_name,domain_module_id");
console.log("\nVERIFY skills with domain_id=155:", JSON.stringify(finalSkills));
console.log("VERIFY module-anchored system skills:");
for (const s of finalSkillsMod) {
  const n = (await get(`/skill_tools?skill_id=eq.${s.id}&select=tool_id,requirement_level,tools(tool_name,coverage_tier)`));
  const req = n.filter((r: Row) => r.requirement_level === "required").length;
  const plat = n.filter((r: Row) => (r.tools as Row).coverage_tier === "platform").length;
  console.log(`  skill ${s.id} ${s.skill_name} mod=${s.domain_module_id}: ${n.length} tools (${req} required), strict_score=${(plat/n.length).toFixed(2)}`);
  for (const t of n) console.log(`      ${(t.tools as Row).tool_name} [${t.requirement_level}, ${(t.tools as Row).coverage_tier}]`);
}
