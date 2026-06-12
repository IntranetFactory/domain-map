// P2.5A.iii — Mid-confidence remainder: system skills for all domains with masters but no existing system skill.
//
// Approach (per plan-master-tasks.md P2.5A.iii):
//   1. Pull live state. Identify candidate domains: have >=1 master, no skill_type='system', not leadership-tier.
//   2. For each candidate, auto-add `query_<master_name>` for any master without an existing query tool.
//   3. Mark each query as REQUIRED on the new system skill.
//   4. Apply per-domain category heuristic to add REQUIRED external tools (send_email, sign_document, etc.).
//      Categories drawn from plan-master-tasks.md P2.5A.iii heuristic table + cross-tranche patterns codified in SKILL.md.
//   5. Insert tools (new only) + skills (new only) + skill_tools (new only). Idempotent.
//   6. Run hypothesis-test rollup.
//
// Mutates are intentionally not auto-generated this pass — selective mutate tooling is a follow-up.
// Rollup: % = (required Semantius-covered tools) / (total required tools). Semantius-covered = operation_kind ∈ {query, mutate}.

const APPLY = process.argv.includes("--apply");
const CHUNK = 50;

type Domain = { id: number; domain_code: string; domain_name: string };
type Skill = { id: number; skill_name: string; skill_type: string; domain_id: number | null };
type Tool = { id: number; tool_name: string; operation_kind: string; data_object_id: number | null };
type DO = { id: number; data_object_name: string };
type DDO = { domain_id: number; data_object_id: number; role: string };

async function call(body: any): Promise<any[]> {
  const p = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  p.stdin.write(JSON.stringify(body));
  await p.stdin.end();
  const out = await new Response(p.stdout).text();
  const err = await new Response(p.stderr).text();
  await p.exited;
  if (p.exitCode !== 0) throw new Error(`semantius failed (${p.exitCode}): ${err}\nstdout: ${out}`);
  try { return JSON.parse(out); } catch { throw new Error(`bad json from semantius: ${out.slice(0, 500)}`); }
}
const get = (path: string) => call({ method: "GET", path });
async function insertChunked(path: string, rows: any[]): Promise<any[]> {
  if (rows.length === 0) return [];
  if (!APPLY) { console.log(`[dry-run] POST ${path}  rows=${rows.length}`); return []; }
  const out: any[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const r = await call({ method: "POST", path, body: chunk });
    out.push(...(r ?? []));
  }
  return out;
}

// ---- Category map ----
// Each value is the set of REQUIRED external tools beyond the per-master query tools.
type Category =
  | "pure"
  | "email"
  | "talent_contract"
  | "it_ops"
  | "field_service"
  | "finance_email"
  | "re_fleet"
  | "telematics"
  | "conv_ai"
  | "supplier"
  | "claims_payment"
  | "visitor"
  | "patient";

const EXTERNALS: Record<Category, string[]> = {
  pure: [],
  email: ["send_email"],
  talent_contract: ["send_email", "sign_document"],
  it_ops: ["send_email", "post_chat_message"],
  field_service: ["send_email", "send_sms"],
  finance_email: ["send_email"],
  re_fleet: ["send_email", "sign_document"],
  telematics: [],
  conv_ai: ["transcribe_audio", "generate_text", "detect_sentiment"],
  supplier: ["send_email", "sign_document"],
  claims_payment: ["send_email", "execute_payment"],
  visitor: ["send_email", "send_sms"],
  patient: ["send_email", "send_sms"],
};

// Plan-master-tasks.md P2.5A.iii heuristic table, extended for the not-listed candidates surfaced by the live state.
const CATEGORY: Record<string, Category> = {
  // Pure-Semantius (no required external tools)
  "BI": "pure", "DATA-AI-PLAT": "pure", "METRICS-LAYER": "pure", "KGP": "pure", "NCDB": "pure",
  "LCAP": "pure", "DAM": "pure", "BPA": "pure", "PSA": "pure", "WORK-MGMT": "pure",
  "DISCOVERY": "pure", "HAM": "pure", "SAM": "pure", "ITAM": "pure", "IGA": "pure",
  "APIM": "pure", "APP-PAAS": "pure", "IPAAS": "pure", "KUBE-PLAT": "pure", "DI": "pure",
  "DCIM": "pure", "DEM": "pure", "NPMD": "pure", "UEM": "pure", "VSDP": "pure",
  "DLP": "pure", "DSPM": "pure",
  "DXP": "pure", "ECM": "pure", "WEB-CONTOPS": "pure", "HCMS": "pure",
  "IDP": "pure", "KMS": "pure", "MFG-OPS": "pure", "PROC-MIN": "pure", "RPA": "pure",
  "PROD-MGMT": "pure", "RET-STORE": "pure", "TEST-MGMT": "pure", "SMP": "pure",
  "DAIRY-MGMT": "pure", "FMIS": "pure",

  // Operational + email
  "CRM": "email", "SALES-ENG": "email", "CDP": "email", "CSM": "email", "LOYALTY": "email",
  "SUB-MGMT": "email", "HRSD": "email", "AP-AUTO": "email", "EXPENSE": "email", "SPEND-MGMT": "email",
  "AGENCY-MGMT": "email", "EAM": "email", "OMS": "email", "IWMS": "email", "TELCO-BSS": "email",
  "UTIL-OPS": "email", "VET-PRACT-MGMT": "email", "FARMER-DIRECT-SALES": "email",
  "FOOD-TRACE": "email", "FSQM": "email", "CLIN-DEV": "email",

  // Talent / contract (+email +sign_document)
  "TALENT-MGMT": "talent_contract", "BEN-ADMIN": "talent_contract", "COMP-MGMT": "talent_contract",
  "EMP-EXP": "talent_contract", "WFM": "talent_contract", "ONBOARDING": "talent_contract", "CLM": "talent_contract",
  "ACCT-PRACT-MGMT": "talent_contract", "CPQ": "talent_contract",
  "BANK-OPS": "talent_contract", "LEGAL-PRACT-MGMT": "talent_contract", "LSD": "talent_contract",
  "PS-LIC": "talent_contract",

  // IT-ops (+email +chat)
  "AIOPS": "it_ops", "ITOM": "it_ops", "OBS": "it_ops", "RMM": "it_ops",
  "REMOTE-ACCESS": "it_ops", "MSP-PSA": "it_ops", "WSC": "it_ops",

  // Field service (+email +sms)
  "FSM": "field_service",

  // Finance / payments-heavy (+email)
  "FIN": "finance_email",

  // Real-estate / fleet (+email +sign)
  "RE-CRE": "re_fleet", "RE-BROKERAGE": "re_fleet", "RE-INVEST": "re_fleet", "RE-PROP-MGMT": "re_fleet",
  "FLEET-MGMT": "re_fleet", "FLEET-MAINT": "re_fleet", "REAL-EST": "re_fleet",

  // Telematics (vehicle-device data only, no comms)
  "TELEMATICS": "telematics",

  // AI-conversational
  "CONV-AI": "conv_ai",

  // Supplier-facing
  "SUP-LIFE": "supplier", "VMS": "supplier",

  // Claims with payouts
  "INS-CLAIMS": "claims_payment",

  // Visitor / patient (+email +sms)
  "VIS-MGMT": "visitor",
  "HC-PATIENT": "patient",
};

const LEADERSHIP_BLOCKLIST = new Set([
  "REV-INTEL","SALES-PERF","GTM-PLAN","ACCT-PLAN","PRM","OP-RES","BCM",
  "SECOPS","SOAR","THREAT-INTEL","TPRM","VULN-MGMT","PRIV-MGMT","FINOPS",
  "INTRANET","COLLAB-GOV",
]);

// ---- Pull state ----
let domainByCode = new Map<string, number>();
let doId = new Map<string, number>();
let doNameById = new Map<number, string>();
let toolId = new Map<string, number>();
let toolKindById = new Map<number, string>();
let skillId = new Map<string, number>();
let skillDomainIds = new Set<number>();
let mastersByDomain = new Map<number, string[]>();
let existingSkillTools = new Set<string>();

async function refresh(): Promise<void> {
  const [domains, dos, tools, skills, ddo, st] = await Promise.all([
    get(`/domains?select=id,domain_code,domain_name&limit=10000`) as Promise<Domain[]>,
    get(`/data_objects?select=id,data_object_name&limit=10000`) as Promise<DO[]>,
    get(`/tools?select=id,tool_name,operation_kind&limit=10000`) as Promise<Tool[]>,
    get(`/skills?select=id,skill_name,skill_type,domain_id&limit=10000`) as Promise<Skill[]>,
    get(`/domain_data_objects?select=domain_id,data_object_id,role&role=eq.master&limit=20000`) as Promise<DDO[]>,
    get(`/skill_tools?select=skill_id,tool_id&limit=20000`) as Promise<{skill_id:number;tool_id:number}[]>,
  ]);
  domainByCode = new Map(domains.map(d => [d.domain_code, d.id]));
  doId = new Map(dos.map(d => [d.data_object_name, d.id]));
  doNameById = new Map(dos.map(d => [d.id, d.data_object_name]));
  toolId = new Map(tools.map(t => [t.tool_name, t.id]));
  toolKindById = new Map(tools.map(t => [t.id, t.operation_kind]));
  skillId = new Map(skills.map(s => [s.skill_name, s.id]));
  skillDomainIds = new Set(skills.filter(s => s.skill_type === "system" && s.domain_id != null).map(s => s.domain_id as number));
  mastersByDomain = new Map();
  for (const r of ddo) {
    if (r.role !== "master") continue;
    const n = doNameById.get(r.data_object_id);
    if (!n) continue;
    const arr = mastersByDomain.get(r.domain_id) ?? [];
    arr.push(n);
    mastersByDomain.set(r.domain_id, arr);
  }
  existingSkillTools = new Set(st.map(r => `${r.skill_id}:${r.tool_id}`));
}

// ---- Build proposed inserts ----
type Candidate = { code: string; domainId: number; name: string; masters: string[]; category: Category };

function slugify(code: string): string { return code.toLowerCase(); }

async function main() {
  await refresh();
  const domains = await get(`/domains?select=id,domain_code,domain_name&limit=10000`) as Domain[];
  const candidates: Candidate[] = [];
  for (const d of domains) {
    if (LEADERSHIP_BLOCKLIST.has(d.domain_code)) continue;
    if (skillDomainIds.has(d.id)) continue;
    const masters = mastersByDomain.get(d.id) ?? [];
    if (masters.length === 0) continue;
    const cat = CATEGORY[d.domain_code];
    if (!cat) {
      console.error(`!! No category mapping for ${d.domain_code} (${d.domain_name}) — skipping. Add to CATEGORY map.`);
      continue;
    }
    candidates.push({ code: d.domain_code, domainId: d.id, name: d.domain_name, masters, category: cat });
  }
  candidates.sort((a, b) => a.code.localeCompare(b.code));

  // Tools to insert: query_<master> for masters whose data_object has no existing query tool.
  // Existing tools (from p25a_i / p25a_ii / P2.3) MUST be reused — never re-create.
  type ToolDraft = { tool_name: string; operation_kind: "query"; data_object_name: string; description: string };
  const toolDrafts: ToolDraft[] = [];
  const seenToolDraft = new Set<string>();
  // Build a map: data_object_id → existing query tool_name (if any)
  const existingTools = await get(`/tools?select=id,tool_name,operation_kind,data_object_id&limit=10000`) as Tool[];
  const queryByDOID = new Map<number, string>();
  for (const t of existingTools) {
    if (t.operation_kind === "query" && t.data_object_id != null) queryByDOID.set(t.data_object_id, t.tool_name);
  }

  // For each candidate, figure out the required tools (by name) — resolving to existing or new query tool names.
  type SkillToolPlan = { skill_name: string; tool_name: string; requirement_level: "required"|"optional" };
  const skillToolPlans: SkillToolPlan[] = [];
  const skillDrafts: { skill_name: string; domain_code: string; description: string }[] = [];

  for (const c of candidates) {
    const skillName = `${slugify(c.code)}-system`;
    skillDrafts.push({
      skill_name: skillName,
      domain_code: c.code,
      description: `System skill for ${c.name} — runtime workflows over the domain's master data, derived from masters + cross-domain handoffs.`,
    });
    // Per-master queries
    for (const m of c.masters) {
      const doid = doId.get(m);
      if (doid == null) continue;
      let toolName = queryByDOID.get(doid);
      if (!toolName) {
        toolName = `query_${m}`;
        const key = toolName;
        if (!seenToolDraft.has(key) && !toolId.has(toolName)) {
          seenToolDraft.add(key);
          toolDrafts.push({
            tool_name: toolName,
            operation_kind: "query",
            data_object_name: m,
            description: `Query / list / get ${m.replace(/_/g, " ")} records.`,
          });
        }
      }
      skillToolPlans.push({ skill_name: skillName, tool_name: toolName!, requirement_level: "required" });
    }
    // External tools for the category
    for (const ext of EXTERNALS[c.category]) {
      skillToolPlans.push({ skill_name: skillName, tool_name: ext, requirement_level: "required" });
    }
  }

  // Summary
  console.log("=== P2.5A.iii Dry-run summary ===");
  console.log(`Candidates: ${candidates.length}`);
  console.log(`New query tools to insert: ${toolDrafts.length}`);
  console.log(`New skills to insert: ${skillDrafts.filter(s => !skillId.has(s.skill_name)).length}`);
  console.log(`Total skill_tools rows (pre-dedupe): ${skillToolPlans.length}`);
  // Distribution by category
  const byCat: Record<string, number> = {};
  for (const c of candidates) byCat[c.category] = (byCat[c.category] ?? 0) + 1;
  console.log("Candidates by category:", byCat);

  // Validate: every external tool referenced must already exist
  const externalSet = new Set(Object.values(EXTERNALS).flat());
  for (const ext of externalSet) {
    if (!toolId.has(ext)) throw new Error(`External tool '${ext}' is not in the catalog. Aborting.`);
  }

  // INSERT phase
  // 1) Tools (query only, with data_object_id resolved)
  const toolRows = toolDrafts.map(t => ({
    tool_name: t.tool_name,
    operation_kind: t.operation_kind,
    data_object_id: doId.get(t.data_object_name)!,
    description: t.description,
  }));
  console.log(`\n>>> Inserting ${toolRows.length} new tools (operation_kind=query)`);
  await insertChunked("/tools", toolRows);
  if (APPLY) await refresh();

  // 2) Skills
  const skillRows = skillDrafts
    .filter(s => !skillId.has(s.skill_name))
    .map(s => ({
      skill_name: s.skill_name,
      skill_type: "system",
      domain_id: domainByCode.get(s.domain_code)!,
      description: s.description,
    }));
  console.log(`>>> Inserting ${skillRows.length} new skills (skill_type=system)`);
  await insertChunked("/skills", skillRows);
  if (APPLY) await refresh();

  // 3) skill_tools (dedupe)
  const stRows: any[] = [];
  let skippedExisting = 0;
  for (const p of skillToolPlans) {
    const sid = skillId.get(p.skill_name);
    const tid = toolId.get(p.tool_name);
    if (sid == null || tid == null) {
      if (!APPLY) continue; // dry-run won't have ids for new rows
      throw new Error(`Could not resolve skill_tools (${p.skill_name}, ${p.tool_name})`);
    }
    if (existingSkillTools.has(`${sid}:${tid}`)) { skippedExisting++; continue; }
    stRows.push({ skill_id: sid, tool_id: tid, requirement_level: p.requirement_level });
  }
  console.log(`>>> Inserting ${stRows.length} skill_tools (${skippedExisting} already existed)`);
  await insertChunked("/skill_tools", stRows);

  // ---- Rollup ----
  if (APPLY) await refresh();
  console.log("\n=== Hypothesis-test rollup (system skills only, this tranche) ===");
  // Pull skill_tools fresh for the rollup
  const allST = await get(`/skill_tools?select=skill_id,tool_id,requirement_level&limit=30000`) as {skill_id:number;tool_id:number;requirement_level:string}[];
  // Build skill_id → list of tool ids
  const stBySkill = new Map<number, {tool_id:number;requirement_level:string}[]>();
  for (const r of allST) {
    const arr = stBySkill.get(r.skill_id) ?? [];
    arr.push({ tool_id: r.tool_id, requirement_level: r.requirement_level });
    stBySkill.set(r.skill_id, arr);
  }
  const SEMANTIUS = new Set(["query", "mutate"]);
  const lines: string[] = [];
  const summary = { fullyCovered: 0, total: 0 };
  for (const c of candidates) {
    const skillName = `${slugify(c.code)}-system`;
    const sid = skillId.get(skillName);
    if (sid == null) { lines.push(`?? ${skillName} (skill not present)`); continue; }
    const required = (stBySkill.get(sid) ?? []).filter(r => r.requirement_level === "required");
    const sCovered = required.filter(r => SEMANTIUS.has(toolKindById.get(r.tool_id) ?? ""));
    const pct = required.length ? Math.round((sCovered.length / required.length) * 100) : 0;
    summary.total++;
    if (pct === 100) summary.fullyCovered++;
    const flag = pct === 100 ? "✅" : "⬇";
    let line = `${flag} ${String(pct).padStart(3)}%  ${skillName.padEnd(28)} ${sCovered.length}/${required.length}`;
    if (pct < 100) {
      const notCov = required.filter(r => !SEMANTIUS.has(toolKindById.get(r.tool_id) ?? ""));
      const names: string[] = [];
      for (const r of notCov) {
        const tname = [...toolId.entries()].find(([_, v]) => v === r.tool_id)?.[0] ?? `?#${r.tool_id}`;
        names.push(`${tname}(${toolKindById.get(r.tool_id)})`);
      }
      line += `   ↳ NOT covered: ${names.join(", ")}`;
    }
    lines.push(line);
  }
  for (const l of lines) console.log(l);
  console.log(`\n${summary.fullyCovered}/${summary.total} skills are 100% Semantius-covered.`);

  console.log(`\nMode: ${APPLY ? "APPLY (writes done)" : "DRY-RUN (no writes)"}`);
}

await main();
