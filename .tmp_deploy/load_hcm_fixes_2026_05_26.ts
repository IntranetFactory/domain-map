/**
 * HCM audit fixes (2026-05-26).
 *
 * Applies the cures the user approved after the audit:
 *   1. Mint 2 missing query tools (query_job_offers, query_candidate_assessments)
 *   2. Create 3 module-level system skills for HCM (Rule #17, F2)
 *   3. Link skill_tools for each new skill (F3, F7: use notify_person, not send_email)
 *   4. PATCH employees.has_personal_content=true (B4: false-by-default is wrong; row holds PII)
 *   5. B10b backfill on 24 outbound HCM handoffs: derive target_domain_module_id
 *   6. Retire legacy hcm-system skill (id 15): delete its skill_tools, then the skill (F1)
 *   7. Report counts + UI links
 *
 * Idempotent: every step reads first, only writes the delta.
 * Run from project root:
 *   bun run "c:/dev/domain-map/.tmp_deploy/load_hcm_fixes_2026_05_26.ts"
 */

const HCM_DOMAIN_ID = 54;
const HCM_MODULES = {
  CORE_WORKER: 54,
  ORG_POSITIONS: 55,
  LIFECYCLE_WORKFLOWS: 56,
} as const;
const LEGACY_HCM_SYSTEM_SKILL_ID = 15;

const ROLE_RANK: Record<string, number> = {
  master: 0,
  embedded_master: 1,
  contributor: 2,
  consumer: 3,
  derived: 4,
};

interface CmdResult {
  ok: boolean;
  data: any;
  status: number;
  raw: string;
}

async function postgrest(method: string, path: string, body?: any): Promise<CmdResult> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" }
  );
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    const msg = stderr.trim() || stdout.trim();
    return { ok: false, data: null, status: code, raw: msg };
  }
  const text = stdout.trim();
  return { ok: true, data: text ? JSON.parse(text) : null, status: 0, raw: text };
}

async function get(path: string): Promise<any> {
  const r = await postgrest("GET", path);
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.raw}`);
  return r.data;
}

async function post(path: string, body: any): Promise<any> {
  const r = await postgrest("POST", path, body);
  if (!r.ok) throw new Error(`POST ${path} failed: ${r.raw}`);
  return r.data;
}

async function patch(path: string, body: any): Promise<any> {
  const r = await postgrest("PATCH", path, body);
  if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.raw}`);
  return r.data;
}

async function del(path: string): Promise<any> {
  const r = await postgrest("DELETE", path);
  if (!r.ok) throw new Error(`DELETE ${path} failed: ${r.raw}`);
  return r.data;
}

function strongest<T extends { role: string }>(rows: T[]): T[] {
  if (rows.length === 0) return [];
  const minRank = Math.min(...rows.map((r) => ROLE_RANK[r.role] ?? 99));
  return rows.filter((r) => (ROLE_RANK[r.role] ?? 99) === minRank);
}

// ---------------------------------------------------------------------------
// Step 1: mint missing query tools
// ---------------------------------------------------------------------------
async function step1MintTools(): Promise<Map<string, number>> {
  console.log("\nStep 1: mint missing query tools");
  const existing: { id: number; tool_name: string }[] = await get(
    `/tools?tool_name=in.(query_job_offers,query_candidate_assessments)&select=id,tool_name`
  );
  const byName = new Map<string, number>(existing.map((t) => [t.tool_name, t.id]));

  const toMint = [
    { tool_name: "query_job_offers", data_object_id: 11, description: "Read job_offer records (ATS-mastered) to correlate hire events with originating offers in HCM lifecycle workflows." },
    { tool_name: "query_candidate_assessments", data_object_id: 10, description: "Read candidate_assessment records (ATS-mastered) to surface pre-hire context in HCM lifecycle workflows." },
  ];

  const missing = toMint.filter((t) => !byName.has(t.tool_name));
  if (missing.length === 0) {
    console.log("  both query tools already present, skip");
    return byName;
  }

  for (const t of missing) {
    const body = {
      tool_name: t.tool_name,
      operation_kind: "query",
      coverage_tier: "platform",
      data_object_id: t.data_object_id,
      description: t.description,
    };
    const r = await postgrest("POST", "/tools", body);
    if (!r.ok) throw new Error(`mint ${t.tool_name} failed: ${r.raw}`);
    // PostgREST POST with no Prefer header returns nothing; re-read.
  }

  const after: { id: number; tool_name: string }[] = await get(
    `/tools?tool_name=in.(query_job_offers,query_candidate_assessments)&select=id,tool_name`
  );
  const map = new Map<string, number>(after.map((t) => [t.tool_name, t.id]));
  console.log(`  minted ${missing.length}, now resolved: ${[...map.entries()].map(([n, id]) => `${n}=${id}`).join(", ")}`);
  return map;
}

// ---------------------------------------------------------------------------
// Step 2 + 3: create the 3 skills + link skill_tools
// ---------------------------------------------------------------------------
type SkillSpec = {
  skill_name: string;
  description: string;
  domain_module_id: number;
  tools: { tool_name: string; requirement_level: "required" | "optional"; notes: string }[];
};

async function resolveToolIds(toolNames: string[]): Promise<Map<string, number>> {
  const rows: { id: number; tool_name: string }[] = await get(
    `/tools?tool_name=in.(${toolNames.join(",")})&select=id,tool_name`
  );
  const map = new Map<string, number>(rows.map((t) => [t.tool_name, t.id]));
  for (const n of toolNames) {
    if (!map.has(n)) throw new Error(`tool not found in catalog: ${n}`);
  }
  return map;
}

async function step23CreateSkills(): Promise<{ skillsCreated: number; linksCreated: number }> {
  console.log("\nStep 2 + 3: create module-level system skills and link tools");

  const specs: SkillSpec[] = [
    {
      skill_name: "hcm_core_worker_agent",
      description: "System skill for the HCM-CORE-WORKER module. Operates on employees, employment_contracts, and employment_events: queries the core worker record, posts employment events (hire / promote / transfer / leave / terminate), handles contract signing.",
      domain_module_id: HCM_MODULES.CORE_WORKER,
      tools: [
        { tool_name: "query_employees", requirement_level: "required", notes: "Read the core worker record." },
        { tool_name: "update_employee_record", requirement_level: "required", notes: "Maintain core attributes (name, status, manager, org_unit, position)." },
        { tool_name: "query_employment_contracts", requirement_level: "required", notes: "Surface the current contract and its history." },
        { tool_name: "query_employment_events", requirement_level: "required", notes: "Audit trail of lifecycle transitions." },
        { tool_name: "create_employment_event", requirement_level: "required", notes: "Post hire / promote / transfer / leave / terminate events." },
        { tool_name: "sign_document", requirement_level: "required", notes: "E-signature is the workflow for employment_contracts.signed." },
        { tool_name: "notify_person", requirement_level: "required", notes: "Manager-change and contract-signing notifications to the affected employee." },
      ],
    },
    {
      skill_name: "hcm_org_positions_agent",
      description: "System skill for the HCM-ORG-POSITIONS module. Operates on org_units, job_profiles, and hcm_positions: maintains org structure, opens / fills / freezes / eliminates positions, manages job profile catalog.",
      domain_module_id: HCM_MODULES.ORG_POSITIONS,
      tools: [
        { tool_name: "query_org_units", requirement_level: "required", notes: "Read the org tree." },
        { tool_name: "query_job_profiles", requirement_level: "required", notes: "Read the job catalog." },
        { tool_name: "query_positions", requirement_level: "required", notes: "Read the position inventory." },
        { tool_name: "create_position", requirement_level: "required", notes: "Open a new headcount slot." },
        { tool_name: "update_position", requirement_level: "required", notes: "Transition position lifecycle (approve / open / fill / freeze / eliminate)." },
        { tool_name: "query_job_requisitions", requirement_level: "required", notes: "Cross-domain read into ATS to correlate open positions with active requisitions (consumer + required on DMDO)." },
        { tool_name: "notify_person", requirement_level: "required", notes: "Approver notifications on position / job-profile state changes." },
      ],
    },
    {
      skill_name: "hcm_lifecycle_workflows_agent",
      description: "System skill for the HCM-LIFECYCLE-WORKFLOWS module. Orchestrates joiner-mover-leaver workflows across HCM: ingests hire signals from ATS (offers + assessments + pre-employees + candidates), creates the employee + employment_event records, fans out termination cascades, writes asset_lifecycle_events into ITAM.",
      domain_module_id: HCM_MODULES.LIFECYCLE_WORKFLOWS,
      tools: [
        { tool_name: "query_employees", requirement_level: "required", notes: "Read current worker state to drive transitions." },
        { tool_name: "query_employment_events", requirement_level: "required", notes: "Trace prior lifecycle history for the worker." },
        { tool_name: "create_employment_event", requirement_level: "required", notes: "Cross-module write back to HCM-CORE-WORKER on each lifecycle transition." },
        { tool_name: "query_job_offers", requirement_level: "required", notes: "Read accepted ATS offers (consumer + required on DMDO) to correlate with hire events." },
        { tool_name: "query_candidates", requirement_level: "required", notes: "Read pre-hire ATS candidate context (consumer + required on DMDO)." },
        { tool_name: "query_candidate_assessments", requirement_level: "required", notes: "Read pre-hire ATS assessment context (consumer + required on DMDO)." },
        { tool_name: "query_pre_employees", requirement_level: "required", notes: "Read the pre-employee handoff record (consumer + required on DMDO)." },
        { tool_name: "query_asset_lifecycle_events", requirement_level: "required", notes: "Read existing ITAM events to avoid duplicate dispatches." },
        { tool_name: "create_asset_lifecycle_event", requirement_level: "required", notes: "Write asset-recall events into ITAM on employee.terminated (contributor + required on DMDO)." },
        { tool_name: "notify_person", requirement_level: "required", notes: "Joiner / leaver notifications to the affected worker, manager, and HR business partner." },
        { tool_name: "notify_team", requirement_level: "required", notes: "Broadcast joiner / leaver announcements to the receiving team channel." },
      ],
    },
  ];

  // Pre-flight: confirm every tool name resolves.
  const allToolNames = new Set<string>();
  for (const s of specs) for (const t of s.tools) allToolNames.add(t.tool_name);
  const toolIdMap = await resolveToolIds([...allToolNames]);
  console.log(`  resolved ${toolIdMap.size} tool ids`);

  // Find existing skills (idempotent re-runs).
  const existingSkills: { id: number; skill_name: string; domain_module_id: number | null }[] = await get(
    `/skills?domain_module_id=in.(${Object.values(HCM_MODULES).join(",")})&skill_type=eq.system&select=id,skill_name,domain_module_id`
  );
  const skillByModule = new Map<number, { id: number; skill_name: string }>();
  for (const s of existingSkills) {
    if (s.domain_module_id !== null) skillByModule.set(s.domain_module_id, s);
  }

  let skillsCreated = 0;
  for (const spec of specs) {
    if (skillByModule.has(spec.domain_module_id)) {
      console.log(`  skill on module ${spec.domain_module_id} already exists (${skillByModule.get(spec.domain_module_id)!.skill_name}); skip create`);
      continue;
    }
    const body = {
      skill_name: spec.skill_name,
      skill_type: "system",
      domain_id: HCM_DOMAIN_ID,
      domain_module_id: spec.domain_module_id,
      description: spec.description,
    };
    await postgrest("POST", "/skills", body);
    skillsCreated++;
  }

  // Re-read to get the ids.
  const afterSkills: { id: number; skill_name: string; domain_module_id: number | null }[] = await get(
    `/skills?domain_module_id=in.(${Object.values(HCM_MODULES).join(",")})&skill_type=eq.system&select=id,skill_name,domain_module_id`
  );
  const skillIdByModule = new Map<number, number>();
  for (const s of afterSkills) {
    if (s.domain_module_id !== null) skillIdByModule.set(s.domain_module_id, s.id);
  }
  console.log(`  ${skillsCreated} skills created (${afterSkills.length} module-level system skills now)`);

  // Link skill_tools idempotently.
  const allSkillIds = [...skillIdByModule.values()];
  const existingLinks: { skill_id: number; tool_id: number }[] = await get(
    `/skill_tools?skill_id=in.(${allSkillIds.join(",")})&select=skill_id,tool_id`
  );
  const linkKey = (skillId: number, toolId: number) => `${skillId}:${toolId}`;
  const existingLinkSet = new Set<string>(existingLinks.map((l) => linkKey(l.skill_id, l.tool_id)));

  const toInsert: any[] = [];
  for (const spec of specs) {
    const skillId = skillIdByModule.get(spec.domain_module_id)!;
    for (const t of spec.tools) {
      const toolId = toolIdMap.get(t.tool_name)!;
      if (existingLinkSet.has(linkKey(skillId, toolId))) continue;
      toInsert.push({
        skill_id: skillId,
        tool_id: toolId,
        requirement_level: t.requirement_level,
        notes: t.notes,
      });
    }
  }

  if (toInsert.length === 0) {
    console.log("  all skill_tools links already present");
    return { skillsCreated, linksCreated: 0 };
  }

  // Chunked insert (Windows command-line limit insurance).
  const CHUNK = 50;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK);
    await post("/skill_tools", chunk);
  }
  console.log(`  inserted ${toInsert.length} skill_tools links`);
  return { skillsCreated, linksCreated: toInsert.length };
}

// ---------------------------------------------------------------------------
// Step 4: PATCH employees.has_personal_content
// ---------------------------------------------------------------------------
async function step4PatchEmployeesPII() {
  console.log("\nStep 4: PATCH employees.has_personal_content=true (B4)");
  const cur: { id: number; has_personal_content: boolean }[] = await get(
    `/data_objects?id=eq.31&select=id,has_personal_content`
  );
  if (cur[0]?.has_personal_content === true) {
    console.log("  already true, skip");
    return;
  }
  await patch(`/data_objects?id=eq.31`, { has_personal_content: true });
  console.log("  set employees.has_personal_content=true");
}

// ---------------------------------------------------------------------------
// Step 5: B10b backfill on HCM outbound handoffs
// ---------------------------------------------------------------------------
async function step5BackfillB10b(): Promise<{ patched: number; ambiguous: number; nullKept: number }> {
  console.log("\nStep 5: B10b backfill on HCM outbound handoffs");

  type Handoff = {
    id: number;
    target_domain_id: number;
    target_domain_module_id: number | null;
    data_object_id: number;
    trigger_events: { event_name: string } | null;
  };

  const handoffs: Handoff[] = await get(
    `/handoffs?source_domain_id=eq.${HCM_DOMAIN_ID}&target_domain_module_id=is.null&select=id,target_domain_id,target_domain_module_id,data_object_id,trigger_events(event_name)`
  );
  console.log(`  ${handoffs.length} outbound rows with null target_domain_module_id`);
  if (handoffs.length === 0) return { patched: 0, ambiguous: 0, nullKept: 0 };

  const targetDomains = [...new Set(handoffs.map((h) => h.target_domain_id))];
  const payloadDataObjects = [...new Set(handoffs.map((h) => h.data_object_id))];

  const targetModules: { id: number; domain_id: number; domain_module_code: string }[] = await get(
    `/domain_modules?domain_id=in.(${targetDomains.join(",")})&select=id,domain_id,domain_module_code`
  );
  const modulesById = new Map<number, { id: number; domain_id: number; domain_module_code: string }>(
    targetModules.map((m) => [m.id, m])
  );
  const modulesByDomain = new Map<number, typeof targetModules>();
  for (const m of targetModules) {
    if (!modulesByDomain.has(m.domain_id)) modulesByDomain.set(m.domain_id, []);
    modulesByDomain.get(m.domain_id)!.push(m);
  }

  // Also pull cross-cutting modules hosted on the target domains.
  const hostJunctions: { domain_id: number; domain_module_id: number }[] = await get(
    `/domain_module_host_domains?domain_id=in.(${targetDomains.join(",")})&select=domain_id,domain_module_id`
  );
  // Add hosted modules into the per-domain list and resolve the module rows we don't have yet.
  const extraModuleIds = hostJunctions.map((h) => h.domain_module_id).filter((id) => !modulesById.has(id));
  if (extraModuleIds.length > 0) {
    const extras: { id: number; domain_id: number | null; domain_module_code: string }[] = await get(
      `/domain_modules?id=in.(${extraModuleIds.join(",")})&select=id,domain_id,domain_module_code`
    );
    for (const e of extras) modulesById.set(e.id, e as any);
  }
  for (const hj of hostJunctions) {
    const m = modulesById.get(hj.domain_module_id);
    if (!m) continue;
    if (!modulesByDomain.has(hj.domain_id)) modulesByDomain.set(hj.domain_id, []);
    if (!modulesByDomain.get(hj.domain_id)!.some((x) => x.id === m.id)) {
      modulesByDomain.get(hj.domain_id)!.push(m as any);
    }
  }

  const allModuleIds = [...modulesById.keys()];
  const dmdo: { domain_module_id: number; data_object_id: number; role: string }[] = await get(
    `/domain_module_data_objects?data_object_id=in.(${payloadDataObjects.join(",")})&domain_module_id=in.(${allModuleIds.join(",")})&select=domain_module_id,data_object_id,role`
  );

  type Candidate = { moduleId: number; role: string; code: string };
  const candIdx = new Map<string, Candidate[]>();
  for (const r of dmdo) {
    const m = modulesById.get(r.domain_module_id);
    if (!m) continue;
    const targetDomain = m.domain_id ?? (hostJunctions.find((h) => h.domain_module_id === m.id)?.domain_id ?? null);
    if (targetDomain === null) continue;
    const key = `${targetDomain}:${r.data_object_id}`;
    if (!candIdx.has(key)) candIdx.set(key, []);
    candIdx.get(key)!.push({ moduleId: m.id, role: r.role, code: m.domain_module_code });
  }

  type Decision = { handoffId: number; eventName: string; targetCode: string; payload: number; chosenModuleId: number | null; reason: string };
  const decisions: Decision[] = [];
  const targetDomainsById = new Map<number, string>();
  const allTargetDomains: { id: number; domain_code: string }[] = await get(
    `/domains?id=in.(${targetDomains.join(",")})&select=id,domain_code`
  );
  for (const d of allTargetDomains) targetDomainsById.set(d.id, d.domain_code);

  for (const h of handoffs) {
    const key = `${h.target_domain_id}:${h.data_object_id}`;
    const cands = candIdx.get(key) ?? [];
    if (cands.length === 0) {
      decisions.push({
        handoffId: h.id,
        eventName: h.trigger_events?.event_name ?? "?",
        targetCode: targetDomainsById.get(h.target_domain_id) ?? `domain_${h.target_domain_id}`,
        payload: h.data_object_id,
        chosenModuleId: null,
        reason: "no module in target domain holds payload (may need DMDO row first)",
      });
      continue;
    }
    const top = strongest(cands);
    if (top.length === 1) {
      decisions.push({
        handoffId: h.id,
        eventName: h.trigger_events?.event_name ?? "?",
        targetCode: targetDomainsById.get(h.target_domain_id) ?? `domain_${h.target_domain_id}`,
        payload: h.data_object_id,
        chosenModuleId: top[0].moduleId,
        reason: `${top[0].role} on ${top[0].code}`,
      });
    } else {
      decisions.push({
        handoffId: h.id,
        eventName: h.trigger_events?.event_name ?? "?",
        targetCode: targetDomainsById.get(h.target_domain_id) ?? `domain_${h.target_domain_id}`,
        payload: h.data_object_id,
        chosenModuleId: null,
        reason: `tie: ${top.length} modules with role ${top[0].role} (${top.map((c) => c.code).join(", ")})`,
      });
    }
  }

  const settable = decisions.filter((d) => d.chosenModuleId !== null);
  const ambiguous = decisions.filter((d) => d.chosenModuleId === null && d.reason.startsWith("tie:"));
  const noCandidate = decisions.filter((d) => d.chosenModuleId === null && d.reason.startsWith("no module"));

  console.log(`  decisions: ${decisions.length} total, ${settable.length} settable, ${ambiguous.length} ambiguous (tie), ${noCandidate.length} no candidate`);

  if (settable.length > 0) {
    console.log("  settable:");
    for (const d of settable) {
      console.log(`    handoff ${d.handoffId} (${d.eventName} -> ${d.targetCode}): module ${d.chosenModuleId} [${d.reason}]`);
    }
  }
  if (ambiguous.length > 0) {
    console.log("  ambiguous (left NULL, manual review):");
    for (const d of ambiguous) {
      console.log(`    handoff ${d.handoffId} (${d.eventName} -> ${d.targetCode}): ${d.reason}`);
    }
  }
  if (noCandidate.length > 0) {
    console.log("  no candidate (left NULL, upstream DMDO gap):");
    for (const d of noCandidate) {
      console.log(`    handoff ${d.handoffId} (${d.eventName} -> ${d.targetCode}): payload data_object ${d.payload}`);
    }
  }

  for (const d of settable) {
    await patch(`/handoffs?id=eq.${d.handoffId}`, { target_domain_module_id: d.chosenModuleId });
  }

  return { patched: settable.length, ambiguous: ambiguous.length, nullKept: noCandidate.length };
}

// ---------------------------------------------------------------------------
// Step 6: retire legacy hcm-system skill
// ---------------------------------------------------------------------------
async function step6RetireLegacy() {
  console.log("\nStep 6: retire legacy hcm-system skill");
  const legacy: { id: number; skill_name: string }[] = await get(
    `/skills?id=eq.${LEGACY_HCM_SYSTEM_SKILL_ID}&select=id,skill_name`
  );
  if (legacy.length === 0) {
    console.log("  legacy skill already gone, skip");
    return;
  }
  const links: { id: number }[] = await get(
    `/skill_tools?skill_id=eq.${LEGACY_HCM_SYSTEM_SKILL_ID}&select=id`
  );
  console.log(`  deleting ${links.length} legacy skill_tools rows`);
  await del(`/skill_tools?skill_id=eq.${LEGACY_HCM_SYSTEM_SKILL_ID}`);
  console.log(`  deleting legacy skill row id=${LEGACY_HCM_SYSTEM_SKILL_ID}`);
  await del(`/skills?id=eq.${LEGACY_HCM_SYSTEM_SKILL_ID}`);
}

// ---------------------------------------------------------------------------
// Step 7: report
// ---------------------------------------------------------------------------
async function step7Report() {
  console.log("\nStep 7: post-fix audit");

  const skills: any[] = await get(
    `/skills?domain_module_id=in.(${Object.values(HCM_MODULES).join(",")})&skill_type=eq.system&select=id,skill_name,domain_module_id`
  );
  console.log(`  module-level system skills: ${skills.length} (target: 3)`);
  for (const s of skills) {
    const tools: any[] = await get(
      `/skill_tools?skill_id=eq.${s.id}&select=requirement_level,tools(tool_name,coverage_tier)`
    );
    const platform = tools.filter((t) => t.tools.coverage_tier === "platform").length;
    const operational = tools.filter((t) => ["platform", "integration"].includes(t.tools.coverage_tier)).length;
    const total = tools.length;
    console.log(`    skill ${s.id} (${s.skill_name}, module ${s.domain_module_id}): ${total} tools; strict=${platform}/${total}=${((platform / total) * 100).toFixed(1)}%, operational=${operational}/${total}`);
    const external = tools.filter((t) => t.tools.coverage_tier !== "platform");
    if (external.length > 0) {
      for (const e of external) console.log(`      gap: ${e.tools.tool_name} (${e.tools.coverage_tier})`);
    }
  }

  const legacyCount: any = await get(`/skills?id=eq.${LEGACY_HCM_SYSTEM_SKILL_ID}&select=id`);
  console.log(`  legacy hcm-system skill remaining: ${legacyCount.length === 0 ? "0 (retired OK)" : `${legacyCount.length} (FAILED retire)`}`);

  const remainingNull: any = await get(
    `/handoffs?source_domain_id=eq.${HCM_DOMAIN_ID}&target_domain_module_id=is.null&select=id,trigger_events(event_name),target_domain_id`
  );
  console.log(`  outbound HCM handoffs still missing target_domain_module_id: ${remainingNull.length}`);
  if (remainingNull.length > 0) {
    for (const r of remainingNull) {
      console.log(`    handoff ${r.id} (${r.trigger_events?.event_name}) -> target_domain ${r.target_domain_id}`);
    }
  }

  const emp: any = await get(`/data_objects?id=eq.31&select=has_personal_content`);
  console.log(`  employees.has_personal_content: ${emp[0]?.has_personal_content}`);

  console.log("\nUI links:");
  console.log("  skills:      https://tests.semantius.app/domain_map/skills");
  console.log("  skill_tools: https://tests.semantius.app/domain_map/skill_tools");
  console.log("  handoffs:    https://tests.semantius.app/domain_map/handoffs");
  console.log("  data_objects: https://tests.semantius.app/domain_map/data_objects");
}

async function main() {
  console.log("HCM audit fixes (2026-05-26)");
  console.log("============================");
  const toolMap = await step1MintTools();
  const { skillsCreated, linksCreated } = await step23CreateSkills();
  await step4PatchEmployeesPII();
  const b10b = await step5BackfillB10b();
  await step6RetireLegacy();
  await step7Report();
  console.log(`\nSummary: ${toolMap.size} tools, +${skillsCreated} skills, +${linksCreated} skill_tools, B10b: ${b10b.patched} patched / ${b10b.ambiguous} ambiguous / ${b10b.nullKept} no-candidate`);
}

main().catch((e) => {
  console.error("\nFATAL:", e?.message || e);
  process.exit(1);
});
