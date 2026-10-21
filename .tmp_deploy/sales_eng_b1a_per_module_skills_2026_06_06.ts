/**
 * B1A-F-PER-MODULE-SKILLS  (SALES-ENG, domain 95)
 *
 * Retire the legacy domain-level system skill (id 104) + its 5 skill_tools, then
 * author one `skill_type='system'` skill per full module (296/297/298) with a
 * per-module tool split satisfying Rule #17 / F2 / F3 / F4 (>=1 query, >=1 mutate,
 * >=1 workflow-driving action per skill; valid operation_kind<->data_object_id).
 *
 * Tool reuse (Rule #9, catalog-wide shared table): re-read /tools by name and link
 * the existing row if present; only create the missing domain-specific mutate/compute
 * primitives. record_status OMITTED on every insert (DB default 'new', Rule #1/#4).
 * notes left empty everywhere (Rule #15). No vendor/product names (Rule #18).
 *
 * Channel-vs-capability (F7): cadence module 296 links make_phone_call (voice IS the
 * dialler workflow) and notify_person (generic). email module 297 links send_email
 * (the cadence-step tracked send IS the workflow; notes wording is the deferred
 * user item B2-CHANNEL-NOTES, left empty here per Rule #15). conv-coaching 298 uses
 * compute analyze + a publish mutate (workflow gate on conversation_intelligence_records).
 *
 * Idempotent: skills keyed on skill_name, tools on tool_name, skill_tools on
 * (skill_id, tool_id). Re-run is free.
 *
 * Run from project root: bun run .tmp_deploy/sales_eng_b1a_per_module_skills_2026_06_06.ts
 */

const DOMAIN_ID = 95;
const LEGACY_SKILL_ID = 104;

interface CmdResult { ok: boolean; data: any; status: number; err: string }

async function postgrest(method: string, path: string, body?: any): Promise<CmdResult> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    const err = stderr.trim() || stdout.trim();
    if (/required audience not found/i.test(err)) {
      console.error(`\nJWT-AUDIENCE ERROR. Verbatim:\n${err}\nCommand: ${method} ${path}`);
      process.exit(2);
    }
    return { ok: false, data: null, status: code, err };
  }
  const text = stdout.trim();
  return { ok: true, data: text ? JSON.parse(text) : null, status: 0, err: "" };
}

async function get(path: string): Promise<any[]> {
  const r = await postgrest("GET", path);
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.err}`);
  return r.data ?? [];
}
async function post(path: string, body: any): Promise<any[]> {
  const r = await postgrest("POST", path, body);
  if (!r.ok) throw new Error(`POST ${path} failed: ${r.err}`);
  return r.data ?? [];
}
async function del(path: string): Promise<void> {
  const r = await postgrest("DELETE", path);
  if (!r.ok) throw new Error(`DELETE ${path} failed: ${r.err}`);
}

type Tool = { id: number; tool_name: string; operation_kind: string; data_object_id: number | null; coverage_tier: string };
type ToolSpec = { tool_name: string; operation_kind: string; data_object_id: number | null; coverage_tier: string; description: string };

async function main() {
  console.log("B1A-F-PER-MODULE-SKILLS — SALES-ENG (95)");
  console.log("=========================================\n");

  // ---- Pre-flight: legacy skill + its skill_tools ----
  const legacy = await get(`/skills?id=eq.${LEGACY_SKILL_ID}&select=id,skill_name,skill_type,domain_id,domain_module_id`);
  const legacyST = await get(`/skill_tools?skill_id=eq.${LEGACY_SKILL_ID}&select=id,tool_id,requirement_level`);
  console.log(`Legacy skill 104 present: ${legacy.length === 1}; skill_tools rows: ${legacyST.length}`);
  console.log(`  skill_tools ids: [${legacyST.map((r) => r.id).join(", ")}]\n`);

  // ---- Confirm the 3 modules + their masters ----
  const modules = await get(`/domain_modules?id=in.(296,297,298)&select=id,domain_module_code,module_kind,domain_id`);
  if (modules.length !== 3) throw new Error(`Expected 3 modules, found ${modules.length}`);

  // ---- DELETE legacy skill_tools then the skill (snapshot already in history.md) ----
  if (legacyST.length > 0) {
    await del(`/skill_tools?skill_id=eq.${LEGACY_SKILL_ID}`);
    console.log(`Deleted ${legacyST.length} legacy skill_tools rows (skill_id=${LEGACY_SKILL_ID}).`);
  } else {
    console.log("No legacy skill_tools to delete (already removed).");
  }
  if (legacy.length === 1) {
    await del(`/skills?id=eq.${LEGACY_SKILL_ID}`);
    console.log(`Deleted legacy skill ${LEGACY_SKILL_ID}.\n`);
  } else {
    console.log("Legacy skill already removed.\n");
  }

  // ---- Author 3 per-module system skills (idempotent on skill_name) ----
  const skillSpecs = [
    {
      skill_name: "sales_eng_cadence_outreach_agent",
      domain_module_id: 296,
      description:
        "System skill for the Cadence and Outbound Outreach module. Runs multi-step outbound cadences over sales_cadences: enrolls prospects, advances cadence steps, places dialler calls, and routes intent-triggered starts. Mirrors the module's masters and lifecycle.",
    },
    {
      skill_name: "sales_eng_email_scheduling_agent",
      domain_module_id: 297,
      description:
        "System skill for the Sales Email and Meeting Scheduling module. Drafts and sends tracked sales emails over sales_emails, drafts AI-assisted replies, and books prospect meetings. Mirrors the module's masters and lifecycle.",
    },
    {
      skill_name: "sales_eng_conversation_coaching_agent",
      domain_module_id: 298,
      description:
        "System skill for the Conversation Intelligence and Rep Coaching module. Captures call recordings, runs conversation analysis, publishes conversation insights, and surfaces coaching signals over call_recordings and conversation_intelligence_records. Mirrors the module's masters and lifecycle.",
    },
  ];

  const skillIdByModule = new Map<number, number>();
  for (const s of skillSpecs) {
    const existing = await get(`/skills?skill_name=eq.${encodeURIComponent(s.skill_name)}&select=id,skill_name,domain_module_id`);
    if (existing.length > 0) {
      skillIdByModule.set(s.domain_module_id, existing[0].id);
      console.log(`Skill exists: ${s.skill_name} (id ${existing[0].id}) -> module ${s.domain_module_id}`);
    } else {
      const ins = await post(`/skills`, [{
        skill_name: s.skill_name,
        skill_type: "system",
        domain_id: DOMAIN_ID,
        domain_module_id: s.domain_module_id,
        description: s.description,
        // record_status OMITTED (default 'new')
      }]);
      skillIdByModule.set(s.domain_module_id, ins[0].id);
      console.log(`Inserted skill: ${s.skill_name} (id ${ins[0].id}) -> module ${s.domain_module_id}`);
    }
  }
  console.log("");

  // ---- Resolve / create tools (Rule #9 dedup by tool_name) ----
  // New domain-specific primitives to create when absent:
  const newToolSpecs: ToolSpec[] = [
    // cadence (master 121)
    { tool_name: "create_sales_cadence", operation_kind: "mutate", data_object_id: 121, coverage_tier: "platform", description: "Create a new sales cadence (the outbound multi-step sequence definition)." },
    { tool_name: "enroll_prospect_in_cadence", operation_kind: "mutate", data_object_id: 121, coverage_tier: "platform", description: "Enroll a prospect into a sales cadence, activating the cadence run for that target." },
    // sales emails (master 123)
    { tool_name: "create_sales_email", operation_kind: "mutate", data_object_id: 123, coverage_tier: "platform", description: "Create a tracked sales email tied to a cadence step or one-off send." },
    { tool_name: "draft_sales_email", operation_kind: "compute", data_object_id: null, coverage_tier: "external", description: "Generate an AI-assisted draft of a sales email or reply for a prospect." },
    // call recordings (master 122)
    { tool_name: "create_call_recording", operation_kind: "mutate", data_object_id: 122, coverage_tier: "platform", description: "Create a call recording record for a placed or received sales call." },
    { tool_name: "analyze_conversation", operation_kind: "compute", data_object_id: null, coverage_tier: "external", description: "Run conversation intelligence analysis over a call recording transcript." },
    // conversation intelligence (embedded_master 124)
    { tool_name: "publish_conversation_insight", operation_kind: "mutate", data_object_id: 124, coverage_tier: "platform", description: "Publish an analyzed conversation intelligence record so its insights are visible for coaching." },
  ];

  // Reused existing tools (must already exist by name).
  const reusedNames = [
    "query_cadences", "query_call_recordings", "query_sales_emails", "query_conversation_intelligence_records",
    "send_email", "make_phone_call", "notify_person",
  ];

  const allNames = [...reusedNames, ...newToolSpecs.map((t) => t.tool_name)];
  const existingTools: Tool[] = await get(`/tools?tool_name=in.(${allNames.join(",")})&select=id,tool_name,operation_kind,data_object_id,coverage_tier`);
  const toolByName = new Map<string, Tool>(existingTools.map((t) => [t.tool_name, t]));

  // Verify reused tools exist
  for (const n of reusedNames) {
    if (!toolByName.has(n)) throw new Error(`Expected reusable tool '${n}' to already exist catalog-wide; aborting (Rule #9).`);
  }

  // Create missing new tools (idempotent: re-read by name immediately before create)
  const toCreate: ToolSpec[] = [];
  for (const spec of newToolSpecs) {
    const fresh = await get(`/tools?tool_name=eq.${encodeURIComponent(spec.tool_name)}&select=id,tool_name,operation_kind,data_object_id,coverage_tier`);
    if (fresh.length > 0) {
      toolByName.set(spec.tool_name, fresh[0]);
      console.log(`Tool exists (reuse): ${spec.tool_name} (id ${fresh[0].id})`);
    } else {
      toCreate.push(spec);
    }
  }
  if (toCreate.length > 0) {
    const created = await post(`/tools`, toCreate.map((t) => ({
      tool_name: t.tool_name,
      operation_kind: t.operation_kind,
      data_object_id: t.data_object_id, // null for compute, set for mutate
      coverage_tier: t.coverage_tier,
      description: t.description,
      // record_status OMITTED (default 'new')
    })));
    for (const c of created) {
      toolByName.set(c.tool_name, c);
      console.log(`Inserted tool: ${c.tool_name} (id ${c.id}, ${c.operation_kind}, data_object_id=${c.data_object_id ?? "null"}, ${c.coverage_tier})`);
    }
  }
  console.log("");

  // ---- F4 invariant pre-flight on every tool we are about to link ----
  function assertInvariant(t: Tool) {
    const k = t.operation_kind;
    if ((k === "query" || k === "mutate") && (t.data_object_id === null || t.data_object_id === undefined))
      throw new Error(`F4 violation: ${t.tool_name} (${k}) must have data_object_id set.`);
    if ((k === "fetch" || k === "side_effect" || k === "compute") && t.data_object_id !== null)
      throw new Error(`F4 violation: ${t.tool_name} (${k}) must have data_object_id NULL.`);
  }

  // ---- skill_tools plan: (module -> [ {tool_name, requirement_level} ]) ----
  const plan: Record<number, { tool_name: string; requirement_level: "required" | "optional" }[]> = {
    296: [
      { tool_name: "query_cadences", requirement_level: "required" },
      { tool_name: "create_sales_cadence", requirement_level: "required" },
      { tool_name: "enroll_prospect_in_cadence", requirement_level: "required" },
      { tool_name: "make_phone_call", requirement_level: "required" }, // voice IS the dialler workflow
      { tool_name: "notify_person", requirement_level: "optional" },
    ],
    297: [
      { tool_name: "query_sales_emails", requirement_level: "required" },
      { tool_name: "create_sales_email", requirement_level: "required" },
      { tool_name: "send_email", requirement_level: "required" }, // cadence-step tracked send IS the workflow (B2-CHANNEL-NOTES owns the notes wording)
      { tool_name: "draft_sales_email", requirement_level: "optional" },
      { tool_name: "notify_person", requirement_level: "optional" },
    ],
    298: [
      { tool_name: "query_call_recordings", requirement_level: "required" },
      { tool_name: "query_conversation_intelligence_records", requirement_level: "required" },
      { tool_name: "create_call_recording", requirement_level: "required" },
      { tool_name: "analyze_conversation", requirement_level: "required" },
      { tool_name: "publish_conversation_insight", requirement_level: "required" }, // workflow gate: analyzed -> published
      { tool_name: "notify_person", requirement_level: "optional" },
    ],
  };

  // ---- Insert skill_tools idempotently on (skill_id, tool_id) ----
  let inserted = 0;
  for (const moduleId of [296, 297, 298]) {
    const skillId = skillIdByModule.get(moduleId)!;
    const existingPairs: any[] = await get(`/skill_tools?skill_id=eq.${skillId}&select=tool_id`);
    const have = new Set<number>(existingPairs.map((r) => Number(r.tool_id)));
    const rows: any[] = [];
    for (const p of plan[moduleId]) {
      const tool = toolByName.get(p.tool_name)!;
      assertInvariant(tool);
      if (have.has(tool.id)) {
        console.log(`  skill ${skillId} (mod ${moduleId}) already links ${p.tool_name}; skip`);
        continue;
      }
      rows.push({
        skill_id: skillId,
        tool_id: tool.id,
        requirement_level: p.requirement_level,
        // notes OMITTED -> default '' (Rule #15)
        // record_status OMITTED -> default 'new'
      });
    }
    if (rows.length > 0) {
      const ins = await post(`/skill_tools`, rows);
      inserted += ins.length;
      console.log(`  skill ${skillId} (mod ${moduleId}): inserted ${ins.length} skill_tools`);
    }
  }
  console.log(`\nTotal skill_tools inserted: ${inserted}`);

  // ---- Verification ----
  console.log("\n=== VERIFICATION ===");
  const legacyAfter = await get(`/skills?id=eq.${LEGACY_SKILL_ID}&select=id`);
  console.log(`Legacy skill 104 still present: ${legacyAfter.length > 0} (expect false)`);

  const modSkills = await get(`/skills?domain_module_id=in.(296,297,298)&skill_type=eq.system&select=id,skill_name,domain_module_id&order=domain_module_id.asc`);
  console.log(`Module-level system skills (expect 3): ${modSkills.length}`);
  for (const s of modSkills) {
    const st = await get(`/skill_tools?skill_id=eq.${s.id}&select=requirement_level,tools(tool_name,operation_kind,data_object_id,coverage_tier)`);
    const req = st.filter((r: any) => r.requirement_level === "required").length;
    console.log(`  ${s.skill_name} (id ${s.id}, mod ${s.domain_module_id}): ${st.length} tools (${req} required)`);
    for (const r of st) {
      const t = r.tools;
      console.log(`      - ${t.tool_name} [${r.requirement_level}] ${t.operation_kind} doid=${t.data_object_id ?? "null"} ${t.coverage_tier}`);
    }
  }

  // F2 dangling check: any module without exactly one system skill
  const f2 = new Map<number, number>();
  for (const s of modSkills) f2.set(s.domain_module_id, (f2.get(s.domain_module_id) ?? 0) + 1);
  for (const m of [296, 297, 298]) {
    const c = f2.get(m) ?? 0;
    console.log(`F2 module ${m}: ${c} system skill(s) ${c === 1 ? "OK" : "FAIL"}`);
  }

  console.log("\nUI: https://tests.semantius.app/domain_map/skills");
  console.log("UI: https://tests.semantius.app/domain_map/skill_tools");
  console.log("UI: https://tests.semantius.app/domain_map/tools");
  console.log("\nDone.");
}

main().catch((e) => {
  console.error("\nFATAL:", e?.message || e);
  process.exit(1);
});
