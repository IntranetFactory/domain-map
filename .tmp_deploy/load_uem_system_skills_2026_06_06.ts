/**
 * B1A-SYSTEM-SKILLS (UEM, domain 86). Rule #17 + Phase S three-source derivation.
 *
 * Authors one skill_type='system' skill per UEM module (3), plus the verb-driven
 * mutate tools each skill needs, plus skill_tools linking each skill to its tools.
 * Redistributes the 8 existing query_* tools (728-735) from the legacy domain-level
 * skill 114 onto the per-module skills, then DELETES skill 114 (F1).
 *
 * Skills:
 *   uem_device_lifecycle_agent      module 308  masters 556/561/562
 *   uem_config_apps_agent           module 309  masters 557/559/560
 *   uem_compliance_posture_agent    module 310  masters 558/563
 *
 * Three-source tool derivation (Rule #17, SKILL.md "Three-source derivation"):
 *   1. master query_<entity> (reuse existing 728-735) + verb-driven mutates from
 *      the lifecycle gates authored in B1A-LIFECYCLE-STATES.
 *   2. (no required contributor/consumer reads drive these core workflows.)
 *   3. outbound handoffs that create a record in another domain -> the receiving
 *      mutate. UEM publishes incident-creating events into ITSM:
 *        handoff 655 (enrolled_device.enrolled) -> device-lifecycle skill
 *        handoff 663 (device_configuration_profile.drift_detected) -> config-apps skill
 *        handoff 660 (device_compliance_result.non_compliant) -> compliance skill
 *      All three link the existing create_incident (tool 30, data_object 47). The
 *      IGA/HAM/SAM handoffs are query/sync reads on the consuming side (no UEM-owned
 *      mutate) so they add no required tool here (Rule #17 anti-pattern: don't add a
 *      tool for every consumer relationship).
 *   Notifications use the abstraction notify_person/notify_team (channel-vs-capability
 *   rule), optional.
 *
 * record_status omitted everywhere (Rule #1). skill_tools.notes / tools NEVER carry
 * a notes write (Rule #15). Tools are catalog-wide & shared: every new tool is
 * re-read by tool_name immediately before insert and the existing row reused if present.
 *
 * Run from project root: bun run .tmp_deploy/load_uem_system_skills_2026_06_06.ts
 */

interface CmdResult { ok: boolean; data: any; status: number; }
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
    console.error(`  semantius failed (${code}): ${stderr.trim() || stdout.trim()}`);
    return { ok: false, data: null, status: code };
  }
  const text = stdout.trim();
  return { ok: true, data: text ? JSON.parse(text) : null, status: 0 };
}
async function get(path: string): Promise<any> { const r = await postgrest("GET", path); if (!r.ok) throw new Error(`GET ${path} failed`); return r.data; }
async function post(path: string, body: any): Promise<any> { const r = await postgrest("POST", path, body); if (!r.ok) throw new Error(`POST ${path} failed`); return r.data; }
async function del(path: string): Promise<any> { const r = await postgrest("DELETE", path); if (!r.ok) throw new Error(`DELETE ${path} failed`); return r.data; }

// ---- Tool specs (new mutates). query_* tools already exist (728-735); referenced by name. ----
type ToolSpec = { tool_name: string; operation_kind: "query" | "mutate"; data_object_id: number; description: string; coverage_tier: "platform" };

const NEW_MUTATES: ToolSpec[] = [
  // module 308 masters
  { tool_name: "enroll_device", operation_kind: "mutate", data_object_id: 556, coverage_tier: "platform", description: "Enroll a device into management, creating its enrolled_devices record." },
  { tool_name: "retire_device", operation_kind: "mutate", data_object_id: 556, coverage_tier: "platform", description: "Decommission an enrolled device and remove it from active management." },
  { tool_name: "mark_device_lost_or_stolen", operation_kind: "mutate", data_object_id: 556, coverage_tier: "platform", description: "Flag an enrolled device as lost or stolen to gate remote actions." },
  { tool_name: "issue_enrollment_token", operation_kind: "mutate", data_object_id: 561, coverage_tier: "platform", description: "Generate an enrollment token for device onboarding." },
  { tool_name: "revoke_enrollment_token", operation_kind: "mutate", data_object_id: 561, coverage_tier: "platform", description: "Invalidate an unused enrollment token." },
  { tool_name: "record_device_deployment_result", operation_kind: "mutate", data_object_id: 562, coverage_tier: "platform", description: "Record the outcome of a device deployment action." },
  // module 309 masters
  { tool_name: "publish_configuration_profile", operation_kind: "mutate", data_object_id: 557, coverage_tier: "platform", description: "Release a configuration profile so it can be assigned to devices or groups." },
  { tool_name: "assign_configuration_profile", operation_kind: "mutate", data_object_id: 557, coverage_tier: "platform", description: "Target a published configuration profile at devices or groups." },
  { tool_name: "publish_mobile_app_package", operation_kind: "mutate", data_object_id: 559, coverage_tier: "platform", description: "Release a mobile app package for assignment to devices." },
  { tool_name: "deprecate_mobile_app_package", operation_kind: "mutate", data_object_id: 559, coverage_tier: "platform", description: "Withdraw a mobile app package from new assignments." },
  { tool_name: "assign_mobile_app", operation_kind: "mutate", data_object_id: 560, coverage_tier: "platform", description: "Target a mobile app at a device or group for delivery." },
  { tool_name: "deploy_mobile_app", operation_kind: "mutate", data_object_id: 560, coverage_tier: "platform", description: "Trigger delivery of an assigned mobile app to its target device." },
  // module 310 masters
  { tool_name: "publish_compliance_policy", operation_kind: "mutate", data_object_id: 558, coverage_tier: "platform", description: "Release a compliance policy for active evaluation against devices." },
  { tool_name: "revoke_compliance_policy", operation_kind: "mutate", data_object_id: 558, coverage_tier: "platform", description: "Withdraw a compliance policy from enforcement." },
  { tool_name: "evaluate_device_compliance", operation_kind: "mutate", data_object_id: 563, coverage_tier: "platform", description: "Evaluate a device against an assigned compliance policy and record the result." },
];

// Tools referenced by name that are expected to already exist (queries + shared).
const REUSE_BY_NAME = [
  "query_enrolled_devices", "query_enrollment_tokens", "query_device_deployment_results",
  "query_device_configuration_profiles", "query_mobile_app_packages", "query_device_app_assignments",
  "query_device_compliance_policies", "query_device_compliance_results",
  "create_incident", "notify_person", "notify_team",
];

type SkillSpec = {
  skill_name: string;
  domain_module_id: number;
  description: string;
  // [tool_name, requirement_level]
  tools: [string, "required" | "optional"][];
};

const SKILLS: SkillSpec[] = [
  {
    skill_name: "uem_device_lifecycle_agent",
    domain_module_id: 308,
    description: "Operates device enrollment and lifecycle: onboards devices, issues and revokes enrollment tokens, retires or flags lost or stolen devices, and records deployment results.",
    tools: [
      ["query_enrolled_devices", "required"],
      ["query_enrollment_tokens", "required"],
      ["query_device_deployment_results", "required"],
      ["enroll_device", "required"],
      ["retire_device", "required"],
      ["mark_device_lost_or_stolen", "required"],
      ["issue_enrollment_token", "required"],
      ["revoke_enrollment_token", "required"],
      ["record_device_deployment_result", "required"],
      ["create_incident", "required"],     // handoff 655: enrolled_device.enrolled -> ITSM service_incidents
      ["notify_team", "optional"],
    ],
  },
  {
    skill_name: "uem_config_apps_agent",
    domain_module_id: 309,
    description: "Delivers configuration and applications: publishes and assigns configuration profiles, publishes and deprecates mobile app packages, and assigns and deploys apps to devices.",
    tools: [
      ["query_device_configuration_profiles", "required"],
      ["query_mobile_app_packages", "required"],
      ["query_device_app_assignments", "required"],
      ["publish_configuration_profile", "required"],
      ["assign_configuration_profile", "required"],
      ["publish_mobile_app_package", "required"],
      ["deprecate_mobile_app_package", "required"],
      ["assign_mobile_app", "required"],
      ["deploy_mobile_app", "required"],
      ["create_incident", "required"],     // handoff 663: configuration_profile.drift_detected -> ITSM service_incidents
      ["notify_person", "optional"],
    ],
  },
  {
    skill_name: "uem_compliance_posture_agent",
    domain_module_id: 310,
    description: "Manages compliance posture: publishes and revokes compliance policies, evaluates devices against them, and routes non-compliance to incident and access workflows.",
    tools: [
      ["query_device_compliance_policies", "required"],
      ["query_device_compliance_results", "required"],
      ["publish_compliance_policy", "required"],
      ["revoke_compliance_policy", "required"],
      ["evaluate_device_compliance", "required"],
      ["create_incident", "required"],     // handoff 660: device_compliance_result.non_compliant -> ITSM service_incidents
      ["notify_team", "optional"],
    ],
  },
];

const F4_NULL_KINDS = new Set(["fetch", "side_effect", "compute"]);

async function resolveTool(tool_name: string, spec?: ToolSpec): Promise<{ id: number; operation_kind: string; data_object_id: number | null }> {
  // Re-read immediately before any create (Rule #9: tools are catalog-wide & shared, other agents may run concurrently).
  const found: { id: number; operation_kind: string; data_object_id: number | null }[] =
    await get(`/tools?tool_name=eq.${encodeURIComponent(tool_name)}&select=id,operation_kind,data_object_id`);
  if (found.length > 0) return found[0];
  if (!spec) throw new Error(`tool ${tool_name} expected to exist but not found, and no spec to create it`);
  const created = await post("/tools", [{
    tool_name: spec.tool_name,
    operation_kind: spec.operation_kind,
    data_object_id: spec.data_object_id,
    description: spec.description,
    coverage_tier: spec.coverage_tier,
    // record_status omitted -> DB default 'new'
  }]);
  const row = Array.isArray(created) ? created[0] : created;
  console.log(`    + created tool ${spec.tool_name} (id ${row.id})`);
  return { id: row.id, operation_kind: row.operation_kind, data_object_id: row.data_object_id };
}

async function main() {
  console.log("UEM system skills load (2026-06-06)");
  console.log("===================================\n");

  // ---- Resolve / create all tools, build name -> row map. F4 invariant check. ----
  console.log("Step 1: resolve tools (dedup catalog-wide by tool_name)");
  const toolByName = new Map<string, { id: number; operation_kind: string; data_object_id: number | null }>();
  for (const name of REUSE_BY_NAME) {
    const t = await resolveTool(name);
    toolByName.set(name, t);
    console.log(`  reuse ${name} -> tool ${t.id} (${t.operation_kind})`);
  }
  for (const spec of NEW_MUTATES) {
    const t = await resolveTool(spec.tool_name, spec);
    toolByName.set(spec.tool_name, t);
  }

  // F4: query/mutate require data_object_id; fetch/side_effect/compute require NULL.
  for (const [name, t] of toolByName) {
    if ((t.operation_kind === "query" || t.operation_kind === "mutate") && t.data_object_id == null)
      throw new Error(`F4 violation: ${name} is ${t.operation_kind} but data_object_id is null`);
    if (F4_NULL_KINDS.has(t.operation_kind) && t.data_object_id != null)
      throw new Error(`F4 violation: ${name} is ${t.operation_kind} but data_object_id is set`);
  }
  console.log(`  ${toolByName.size} tools resolved, F4 invariant holds.\n`);

  // ---- Create skills (idempotent by skill_name + domain_module_id). ----
  console.log("Step 2: skills");
  const skillByModule = new Map<number, number>();
  for (const s of SKILLS) {
    const existing: { id: number }[] = await get(
      `/skills?skill_name=eq.${encodeURIComponent(s.skill_name)}&domain_module_id=eq.${s.domain_module_id}&select=id`
    );
    let skillId: number;
    if (existing.length > 0) {
      skillId = existing[0].id;
      console.log(`  ${s.skill_name} already exists (id ${skillId}) - skip insert`);
    } else {
      const created = await post("/skills", [{
        skill_name: s.skill_name,
        skill_type: "system",
        domain_id: 86,             // system skills require domain_id (check constraint); module-grain via domain_module_id
        domain_module_id: s.domain_module_id,
        description: s.description,
        // record_status omitted -> DB default 'new'.
      }]);
      const row = Array.isArray(created) ? created[0] : created;
      skillId = row.id;
      console.log(`  + ${s.skill_name} (id ${skillId}) module ${s.domain_module_id}`);
    }
    skillByModule.set(s.domain_module_id, skillId);
  }

  // ---- Create skill_tools (idempotent by (skill_id, tool_id)). ----
  console.log("\nStep 3: skill_tools");
  for (const s of SKILLS) {
    const skillId = skillByModule.get(s.domain_module_id)!;
    const existing: { tool_id: number }[] = await get(`/skill_tools?skill_id=eq.${skillId}&select=tool_id`);
    const have = new Set(existing.map((e) => e.tool_id));
    const rows: any[] = [];
    for (const [toolName, level] of s.tools) {
      const t = toolByName.get(toolName);
      if (!t) throw new Error(`skill ${s.skill_name} references unknown tool ${toolName}`);
      if (have.has(t.id)) continue;
      rows.push({ skill_id: skillId, tool_id: t.id, requirement_level: level, notes: "" });
    }
    if (rows.length > 0) {
      await post("/skill_tools", rows);
    }
    console.log(`  ${s.skill_name}: ${rows.length} new links (${s.tools.length} total spec'd)`);
  }

  // ---- Retire legacy skill 114 after the 3 per-module skills + their query tools exist (F1). ----
  console.log("\nStep 4: retire legacy skill 114 (uem-system)");
  const legacy: { id: number }[] = await get(`/skills?id=eq.114&select=id`);
  if (legacy.length === 0) {
    console.log("  skill 114 already gone - skip");
  } else {
    // Confirm all 3 per-module skills exist with >=1 skill_tools, and the 8 legacy
    // query tools are redistributed, before deleting.
    for (const s of SKILLS) {
      const skillId = skillByModule.get(s.domain_module_id)!;
      const st: { id: number }[] = await get(`/skill_tools?skill_id=eq.${skillId}&select=id`);
      if (st.length < 1) throw new Error(`refuse to delete 114: skill ${s.skill_name} has 0 skill_tools`);
    }
    const legacyTools = [728, 729, 730, 731, 732, 733, 734, 735];
    for (const tid of legacyTools) {
      const linked: { skill_id: number }[] = await get(`/skill_tools?tool_id=eq.${tid}&skill_id=neq.114&select=skill_id`);
      if (linked.length < 1) throw new Error(`refuse to delete 114: query tool ${tid} not redistributed to any per-module skill`);
    }
    // skill_tools.skill_id is a parent FK (cascade) so deleting the skill removes its links.
    await del(`/skills?id=eq.114`);
    console.log("  DELETED skill 114 (its 8 skill_tools cascade; tools 728-735 retained & redistributed).");
  }

  // ---- Verify (F2/F3). ----
  console.log("\nVerification:");
  for (const s of SKILLS) {
    const skillId = skillByModule.get(s.domain_module_id)!;
    const st: { requirement_level: string; tools: { tool_name: string; operation_kind: string } }[] =
      await get(`/skill_tools?skill_id=eq.${skillId}&select=requirement_level,tools(tool_name,operation_kind)&order=requirement_level.asc`);
    const req = st.filter((x) => x.requirement_level === "required").length;
    console.log(`  ${s.skill_name} (id ${skillId}, module ${s.domain_module_id}): ${st.length} tools (${req} required)`);
  }
  const sysSkills: { id: number; skill_name: string; domain_module_id: number }[] =
    await get(`/skills?domain_module_id=in.(308,309,310)&skill_type=eq.system&select=id,skill_name,domain_module_id&order=domain_module_id.asc`);
  console.log(`\n  F2: ${sysSkills.length} system skills across modules 308/309/310 (expect exactly 3, one per module).`);
  for (const k of sysSkills) console.log(`    module ${k.domain_module_id} -> ${k.skill_name} (id ${k.id})`);

  console.log("\nDone.");
}

main().catch((e) => { console.error("\nFATAL:", e?.message || e); process.exit(1); });
