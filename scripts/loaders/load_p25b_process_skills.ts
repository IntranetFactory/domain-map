// P2.5B — Process-skill tool requirements (3 candidates from P1.7).
//
// Inserts 3 new skills with skill_type='process' and links each to its required tools.
//
// Approach:
//   - For each process skill, the candidate plan file lists the involved domains.
//   - REQUIRED query tools: one per master `data_object` across those domains.
//   - REQUIRED mutate tools: only for domains where the skill ACTIVELY writes (not passive readers).
//   - REQUIRED external tools: per the plan file's tool-requirements section.
//
// Idempotent: skips skills/skill_tools that already exist.

const APPLY = process.argv.includes("--apply");
const CHUNK = 50;

async function call(body: any): Promise<any[]> {
  const p = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  p.stdin.write(JSON.stringify(body));
  await p.stdin.end();
  const out = await new Response(p.stdout).text();
  const err = await new Response(p.stderr).text();
  await p.exited;
  if (p.exitCode !== 0) throw new Error(`semantius failed (${p.exitCode}): ${err}`);
  return JSON.parse(out);
}
const get = (path: string) => call({ method: "GET", path });
async function insertChunked(path: string, rows: any[]) {
  if (rows.length === 0) return;
  if (!APPLY) { console.log(`[dry-run] POST ${path}  rows=${rows.length}`); return; }
  for (let i = 0; i < rows.length; i += CHUNK) {
    await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) });
  }
}

// ---- Process-skill definitions ----

type ProcessSkill = {
  skill_name: string;
  description: string;
  // domains whose masters the skill READS from (queries required)
  query_domains: string[];
  // domains where the skill WRITES (mutate tools required where they exist)
  mutate_domains: string[];
  // required side_effect / compute tool names
  externals: string[];
};

const SKILLS: ProcessSkill[] = [
  {
    skill_name: "employee-jml-process",
    description: "Joiner-Mover-Leaver process skill — orchestrates the employee lifecycle across HCM, IGA, ONBOARDING, PAYROLL, ITAM, BEN-ADMIN, COMP-MGMT, TALENT-MGMT, WFM, ATS, ITSM, AGENCY-MGMT. APQC PCF L2 20599 'Manage employee onboarding, training, and development'. Triggered by employee.{created,promoted,position_changed,terminated} fan-out.",
    query_domains: ["HCM", "IGA", "ITAM", "HAM", "ITSM", "ONBOARDING", "PAYROLL", "BEN-ADMIN", "COMP-MGMT", "TALENT-MGMT", "WFM", "ATS", "AGENCY-MGMT"],
    mutate_domains: ["HCM", "IGA", "ONBOARDING", "PAYROLL", "ITAM", "HAM", "ITSM", "BEN-ADMIN", "COMP-MGMT"],
    externals: ["send_email", "sign_document", "post_chat_message"],
  },
  {
    skill_name: "opportunity-l2c-process",
    description: "Lead-to-Cash process skill — orchestrates opportunity lifecycle across CRM, SALES-ENG, CDP, CPQ, CSM, PSA, REV-INTEL, SALES-PERF, AGENCY-MGMT, WORK-MGMT. APQC PCF L3 10182 'Manage leads/opportunities'. Triggered by opportunity.{created,qualified,requires_quote,stage_changed,closed_won,closed_lost}.",
    query_domains: ["CRM", "SALES-ENG", "CDP", "CPQ", "CSM", "PSA", "REV-INTEL", "SALES-PERF", "AGENCY-MGMT", "WORK-MGMT", "CLM", "SUB-MGMT", "ERP-FIN"],
    mutate_domains: ["CRM", "CPQ", "CLM", "CSM", "SUB-MGMT", "PSA", "ERP-FIN"],
    externals: ["send_email", "sign_document"],
  },
  {
    skill_name: "case-service-process",
    description: "Customer/HR case orchestration process skill — routes cases across CDP, CRM, CSM, HRSD, IGA, ITSM, SUB-MGMT with cross-domain escalation + churn-risk + sentiment loops. APQC PCF L3 10388 'Manage customer service problems, requests, and inquiries'. Triggered by case.{created,it_assistance_required,critical_health_drop,churn_risk_detected,resolved}.",
    query_domains: ["CDP", "CRM", "CSM", "HRSD", "IGA", "ITSM", "SUB-MGMT", "KMS"],
    mutate_domains: ["CSM", "HRSD", "ITSM", "IGA", "CRM"],
    externals: ["send_email", "post_chat_message", "detect_sentiment", "classify_text"],
  },
];

// ---- Resolve live state ----

const [domains, tools, allSkills, ddo, allST] = await Promise.all([
  get(`/domains?select=id,domain_code&limit=10000`),
  get(`/tools?select=id,tool_name,operation_kind,data_object_id&limit=10000`),
  get(`/skills?select=id,skill_name,skill_type&limit=10000`),
  get(`/domain_data_objects?role=eq.master&select=domain_id,data_object_id&limit=20000`),
  get(`/skill_tools?select=skill_id,tool_id&limit=30000`),
]);

const domainId = new Map<string, number>((domains as any[]).map(d => [d.domain_code, d.id]));
const toolByName = new Map<string, any>((tools as any[]).map(t => [t.tool_name, t]));
const skillIdByName = new Map<string, number>((allSkills as any[]).map(s => [s.skill_name, s.id]));
const mastersByDomain = new Map<number, Set<number>>();
for (const r of ddo as any[]) {
  const s = mastersByDomain.get(r.domain_id) ?? new Set();
  s.add(r.data_object_id);
  mastersByDomain.set(r.domain_id, s);
}
// Build (operation_kind, data_object_id) → tool_name lookup
const toolByDOAndKind = new Map<string, string>();
for (const t of tools as any[]) {
  if (t.data_object_id != null) toolByDOAndKind.set(`${t.operation_kind}:${t.data_object_id}`, t.tool_name);
}
const stKey = (sid: number, tid: number) => `${sid}:${tid}`;
const existingST = new Set((allST as any[]).map(r => stKey(r.skill_id, r.tool_id)));

// ---- Plan: per-skill tool sets ----

type SkillPlan = { skill_name: string; tools: { tool_name: string; reason: string }[] };
const plans: SkillPlan[] = [];

for (const s of SKILLS) {
  const tools: { tool_name: string; reason: string }[] = [];
  const seen = new Set<string>();

  function add(toolName: string, reason: string) {
    if (seen.has(toolName)) return;
    if (!toolByName.has(toolName)) {
      console.warn(`!! ${s.skill_name}: tool '${toolName}' not in catalog — skipping. Reason: ${reason}`);
      return;
    }
    seen.add(toolName);
    tools.push({ tool_name: toolName, reason });
  }

  // Queries: one per master across query_domains
  for (const dc of s.query_domains) {
    const di = domainId.get(dc);
    if (di == null) { console.warn(`!! Unknown domain code: ${dc}`); continue; }
    const masters = mastersByDomain.get(di);
    if (!masters) continue;
    for (const doi of masters) {
      const tn = toolByDOAndKind.get(`query:${doi}`);
      if (tn) add(tn, `query master in ${dc}`);
    }
  }
  // Mutates: one per master across mutate_domains (where mutate exists)
  for (const dc of s.mutate_domains) {
    const di = domainId.get(dc);
    if (di == null) continue;
    const masters = mastersByDomain.get(di);
    if (!masters) continue;
    for (const doi of masters) {
      const tn = toolByDOAndKind.get(`mutate:${doi}`);
      if (tn) add(tn, `mutate master in ${dc}`);
    }
  }
  // Externals
  for (const ext of s.externals) add(ext, `external action required by process`);

  plans.push({ skill_name: s.skill_name, tools });
}

// ---- Summary surface ----

console.log("=== P2.5B process-skill plan ===\n");
for (const p of plans) {
  const skill = SKILLS.find(s => s.skill_name === p.skill_name)!;
  const queryCount = p.tools.filter(t => toolByName.get(t.tool_name).operation_kind === "query").length;
  const mutateCount = p.tools.filter(t => toolByName.get(t.tool_name).operation_kind === "mutate").length;
  const sideCount = p.tools.filter(t => toolByName.get(t.tool_name).operation_kind === "side_effect").length;
  const computeCount = p.tools.filter(t => toolByName.get(t.tool_name).operation_kind === "compute").length;
  const total = p.tools.length;
  const sCovered = queryCount + mutateCount;
  const pct = total ? Math.round((sCovered / total) * 100) : 0;
  console.log(`${p.skill_name}`);
  console.log(`  domains (read): ${skill.query_domains.join(", ")}`);
  console.log(`  domains (write): ${skill.mutate_domains.join(", ")}`);
  console.log(`  tools: ${total} (query ${queryCount} + mutate ${mutateCount} + side_effect ${sideCount} + compute ${computeCount})`);
  console.log(`  Projected Semantius coverage: ${pct}% (${sCovered}/${total} are query+mutate)`);
  console.log(`  Externals: ${skill.externals.join(", ")}`);
  console.log("");
}

// ---- Insert ----

const newSkillRows = SKILLS
  .filter(s => !skillIdByName.has(s.skill_name))
  .map(s => ({
    skill_name: s.skill_name,
    skill_type: "process",
    description: s.description,
  }));
console.log(`>>> Inserting ${newSkillRows.length} new process skills`);
await insertChunked("/skills", newSkillRows);

// Refresh skills map (in APPLY)
let postSkillId = skillIdByName;
if (APPLY) {
  const refreshed = await get(`/skills?select=id,skill_name&limit=10000`);
  postSkillId = new Map((refreshed as any[]).map(s => [s.skill_name, s.id]));
}

// skill_tools rows
const stRows: any[] = [];
let dups = 0;
for (const p of plans) {
  const sid = postSkillId.get(p.skill_name);
  if (sid == null) {
    if (APPLY) throw new Error(`skill ${p.skill_name} not resolvable post-insert`);
    continue;
  }
  for (const t of p.tools) {
    const tool = toolByName.get(t.tool_name)!;
    if (existingST.has(stKey(sid, tool.id))) { dups++; continue; }
    stRows.push({ skill_id: sid, tool_id: tool.id, requirement_level: "required" });
  }
}
console.log(`>>> Inserting ${stRows.length} skill_tools rows (${dups} already linked)`);
await insertChunked("/skill_tools", stRows);

console.log(`\nMode: ${APPLY ? "APPLY (writes done)" : "DRY-RUN (no writes)"}`);
