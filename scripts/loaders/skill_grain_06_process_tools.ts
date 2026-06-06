#!/usr/bin/env bun
/**
 * skill_grain_06_process_tools.ts — Step 5 of plans/per-domain-skill-restoration.md.
 *
 * The 3 `process` skills (124/125/126) get a real `processes` target each, are linked via
 * skills.process_id, and their 226 skill_tools migrate into process_tools.
 *
 *   - Create exactly 3 `processes` rows (source_framework='custom', the only legal non-APQC value;
 *     unique process_key; hierarchy_level=1; parent_process_id null; external_url=''), mirroring the
 *     existing custom process row (id 2018) for the framework-specific empties.
 *   - PATCH skills 124/125/126 process_id -> the matching new row.
 *   - Migrate each skill's skill_tools (107/67/52 = 226) into process_tools keyed on the process,
 *     deduped on (process_id, tool_id), preserving requirement_level/notes/record_status.
 *   - Delete those 226 skill_tools (snapshot-verified by id before any DELETE).
 *
 * Idempotent: processes skip on existing process_key; PATCH is set-to-target; migration skips
 * pairs already present. Run from project root: bun run scripts/loaders/skill_grain_06_process_tools.ts
 */
export {};
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Row = Record<string, unknown>;
async function semCall(tool: string, payload: Row): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${tool} (exit ${code}): ${stderr || stdout}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : null;
}
const get = (path: string) => semCall("postgrestRequest", { method: "GET", path }) as Promise<any[]>;
const post = (path: string, body: Row[]) => semCall("postgrestRequest", { method: "POST", path, body }) as Promise<any[]>;
const patch = (path: string, body: Row) => semCall("postgrestRequest", { method: "PATCH", path, body }) as Promise<any[]>;
const del = (path: string) => semCall("postgrestRequest", { method: "DELETE", path }) as Promise<any[]>;

const LIMIT = 200000;

// snapshot (id verification for the delete)
const snapshot = JSON.parse(readFileSync(resolve(process.cwd(), "plans/snapshots/skill_tools.json"), "utf8")) as any[];
const snapIds = new Set<number>(snapshot.map(r => Number(r.id)));

type VS = { skillName: string; process_key: string; process_name: string; process_code: string; description: string };
const VALUE_STREAMS: VS[] = [
  {
    skillName: "employee-jml-process",
    process_key: "employee_jml_value_stream",
    process_name: "Employee Joiner-Mover-Leaver Value Stream",
    process_code: "VS-EMP-JML",
    description:
      "Cross-domain employee lifecycle value stream: the joiner, mover, and leaver journey that spans recruiting, hire and onboarding, identity and access provisioning, payroll and benefits enrollment, role and org changes, and offboarding. Coordinates the agent workflows that no single domain owns end to end.",
  },
  {
    skillName: "opportunity-l2c-process",
    process_key: "opportunity_l2c_value_stream",
    process_name: "Opportunity Lead-to-Cash Value Stream",
    process_code: "VS-OPP-L2C",
    description:
      "Cross-domain lead-to-cash value stream: the opportunity journey from demand generation and lead qualification through pipeline, quoting and configuration, order capture, fulfillment, invoicing, and revenue recognition. Coordinates the agent workflows that span the marketing, sales, and finance domains.",
  },
  {
    skillName: "case-service-process",
    process_key: "case_service_value_stream",
    process_name: "Case and Service Value Stream",
    process_code: "VS-CASE-SVC",
    description:
      "Cross-domain case and service value stream: the customer issue journey from intake and triage through case management, field or remote service execution, knowledge capture, and resolution and follow-up. Coordinates the agent workflows that span the support, service, and operations domains.",
  },
];

// 1. Create / reuse the 3 processes.
const skillByName = new Map((await get(`/skills?skill_type=eq.process&select=id,skill_name,process_id&limit=${LIMIT}`)).map(s => [s.skill_name, s]));
const processIdBySkill = new Map<number, number>();
for (const vs of VALUE_STREAMS) {
  const skill = skillByName.get(vs.skillName);
  if (!skill) throw new Error(`process skill '${vs.skillName}' not found — ABORT`);
  let proc = (await get(`/processes?process_key=eq.${vs.process_key}&select=id,process_key`))[0];
  if (!proc) {
    const res = await post(`/processes`, [{
      process_name: vs.process_name,
      process_code: vs.process_code,
      description: vs.description,
      source_framework: "custom",
      process_key: vs.process_key,
      external_id: "",
      external_url: "",
      hierarchy_level: 1,
      parent_process_id: null,
      record_status: "new",
    }]);
    proc = res[0];
    console.log(`  + created process ${proc.id} (${vs.process_key})`);
  } else {
    console.log(`  = process ${proc.id} (${vs.process_key}) already exists`);
  }
  processIdBySkill.set(skill.id, proc.id);
  // 2. link the skill
  if (skill.process_id !== proc.id) {
    await patch(`/skills?id=eq.${skill.id}`, { process_id: proc.id });
    console.log(`    ~ linked skill ${skill.id} (${vs.skillName}) -> process ${proc.id}`);
  } else {
    console.log(`    = skill ${skill.id} already linked to process ${proc.id}`);
  }
}

// 3. Migrate skill_tools -> process_tools, deduped on (process_id, tool_id).
const processSkillIds = [...processIdBySkill.keys()];
const st = await get(`/skill_tools?skill_id=in.(${processSkillIds.join(",")})&select=id,skill_id,tool_id,requirement_level,notes,record_status&limit=${LIMIT}`);
console.log(`\nprocess-skill skill_tools to migrate: ${st.length} (expect 226)`);
if (st.length !== 226) throw new Error(`expected 226, got ${st.length} — ABORT`);

const existingPT = new Set((await get(`/process_tools?select=process_id,tool_id&limit=${LIMIT}`)).map(r => `${r.process_id}.${r.tool_id}`));
const byKey = new Map<string, Row>();
for (const r of st) {
  const pid = processIdBySkill.get(r.skill_id)!;
  const key = `${pid}.${r.tool_id}`;
  if (!byKey.has(key)) {
    byKey.set(key, { process_id: pid, tool_id: r.tool_id, requirement_level: r.requirement_level, notes: r.notes ?? null, record_status: r.record_status });
  } else if (byKey.get(key)!.requirement_level !== "required" && r.requirement_level === "required") {
    byKey.set(key, { process_id: pid, tool_id: r.tool_id, requirement_level: "required", notes: r.notes ?? null, record_status: r.record_status });
  }
}
const toInsert = [...byKey.values()].filter(c => !existingPT.has(`${c.process_id}.${c.tool_id}`));
console.log(`distinct (process,tool) pairs: ${byKey.size}; to insert this run: ${toInsert.length}`);
const CHUNK = 300;
let inserted = 0;
for (let i = 0; i < toInsert.length; i += CHUNK) {
  const res = await post(`/process_tools`, toInsert.slice(i, i + CHUNK));
  inserted += res.length;
}
console.log(`  + inserted ${inserted} process_tools`);

const ptCount = (await get(`/process_tools?select=process_id&limit=${LIMIT}`)).length;
console.log(`process_tools now: ${ptCount} (expect 226)`);
if (ptCount !== 226) throw new Error(`process_tools count ${ptCount} != 226 — ABORT before delete`);

// 4. Delete the 226 skill_tools (snapshot-verified by id).
const ids = st.map(r => Number(r.id));
const missing = ids.filter(id => !snapIds.has(id));
if (missing.length) throw new Error(`${missing.length} process skill_tools not in snapshot — ABORT`);
console.log(`HARD INVARIANT OK: all ${ids.length} rows present in committed snapshot.`);
let deleted = 0;
for (let i = 0; i < ids.length; i += CHUNK) {
  const res = await del(`/skill_tools?id=in.(${ids.slice(i, i + CHUNK).join(",")})`);
  deleted += res.length;
}
console.log(`  - deleted ${deleted} migrated skill_tools`);

// 5. Verify.
const [stAfter, skillsAfter] = await Promise.all([
  get(`/skill_tools?select=id&limit=${LIMIT}`),
  get(`/skills?id=in.(124,125,126)&select=id,process_id`),
]);
const allLinked = skillsAfter.every(s => s.process_id != null);
console.log(`\nskill_tools now: ${stAfter.length} (expect 1917 = 2143 - 226)`);
console.log(`skills 124/125/126 process_id: ${skillsAfter.map(s => `${s.id}->${s.process_id}`).join(", ")}`);
const ok = stAfter.length === 1917 && ptCount === 226 && allLinked;
console.log(ok ? "VERIFIED: 3 processes created, skills linked, 226 in process_tools, 226 skill_tools deleted." : "MISMATCH — investigate.");
if (!ok) process.exit(1);
