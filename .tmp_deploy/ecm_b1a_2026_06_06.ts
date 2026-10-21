#!/usr/bin/env bun
// ECM (domain 91) b1a execution - 2026-06-06.
// Executes the three agent-solvable b1a items from audits/ECM/state.yaml:
//   B1A-S9                : PATCH 6 trigger_events.event_category "" -> "state_change".
//   B1A-F2-SYSTEM-SKILLS  : INSERT 3 module-level system skills + 7 mutate tools + skill_tools.
//   B1A-M8-MODULE-UX      : PATCH catalog_tagline + catalog_description on the 3 modules
//                           (empty-guard: write only where the field is currently empty).
//
// Idempotent: every write is preceded by a live read; already-correct rows are skipped.
// record_status is OMITTED on all inserts (DB default = "new"). No `notes` columns written.
// skill_tool_label is platform-computed; omitted on insert.

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (path: string) => call({ method: "GET", path });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });
const post = (path: string, body: Row[] | Row) => call({ method: "POST", path, body });

const DOMAIN_ID = 91;

async function main() {
  console.log("=== ECM b1a execution 2026-06-06 ===\n");

  // ===============================================================
  // B1A-S9 : 6 trigger_events.event_category "" -> "state_change"
  //   Each models a master row transitioning state. Event 900 was
  //   already set to state_change in a prior pass; not in this set.
  // ===============================================================
  const EVENT_IDS = [895, 896, 897, 898, 899, 901];
  console.log("[B1A-S9] trigger_events.event_category backfill");
  const events = await get(
    `/trigger_events?id=in.(${EVENT_IDS.join(",")})&select=id,event_name,event_category`,
  );
  let evPatched = 0;
  for (const e of events) {
    if (e.event_category === "state_change") {
      console.log(`  ok   event ${e.id} ${e.event_name}: already state_change`);
      continue;
    }
    if (e.event_category !== "" && e.event_category !== null) {
      console.log(`  WARN event ${e.id} ${e.event_name}: non-empty category '${e.event_category}'; leaving as-is`);
      continue;
    }
    await patch(`/trigger_events?id=eq.${e.id}`, { event_category: "state_change" });
    console.log(`  PATCH event ${e.id} ${e.event_name}: '' -> state_change`);
    evPatched++;
  }
  console.log(`  -> ${evPatched} events patched\n`);

  // ===============================================================
  // B1A-F2-SYSTEM-SKILLS : Phase S for the 3 ECM modules.
  //   Module -> master/consumer data_objects (from domain_module_data_objects):
  //     242 ECM-REPOSITORY masters 429,430,431,432
  //     243 ECM-RECORDS-GOV masters 433; consumes 429 (required)
  //     244 ECM-WORKFLOW   consumes 429 (required), 430 (optional)
  //   Existing query tools (platform): 436->429, 437->430, 438->431, 439->432, 440->433.
  //   New mutate tools (one+ per module's write workflow), coverage_tier=platform.
  // ===============================================================
  console.log("[B1A-F2-SYSTEM-SKILLS] Phase S: skills + mutate tools + skill_tools");

  // -- resolve data_object name->id (defensive; we already know the ids) --
  const dos = await get(`/data_objects?id=in.(429,430,431,432,433)&select=id,data_object_name`);
  const doId = new Map(dos.map(d => [String(d.data_object_name), Number(d.id)]));

  // -- 1. new mutate tools (dedup by tool_name catalog-wide) --
  type ToolDraft = { tool_name: string; data_object_name: string; description: string };
  const mutateTools: ToolDraft[] = [
    // ECM-REPOSITORY (242)
    { tool_name: "update_content_document", data_object_name: "content_documents",
      description: "Update a content document's metadata, owner, or lifecycle state via Semantius CRUD." },
    { tool_name: "classify_content_document", data_object_name: "document_classifications",
      description: "Apply or change a sensitivity classification on a content document via Semantius CRUD." },
    { tool_name: "publish_document_version", data_object_name: "document_versions",
      description: "Publish a new authoritative version of a document via Semantius CRUD." },
    // ECM-RECORDS-GOV (243)
    { tool_name: "update_records_retention_policy", data_object_name: "records_retention_policies",
      description: "Create or update a records retention policy and its schedule via Semantius CRUD." },
    { tool_name: "dispose_content_document", data_object_name: "content_documents",
      description: "Record a defensible disposition decision on a content document at retention expiry via Semantius CRUD." },
    // ECM-WORKFLOW (244)
    { tool_name: "route_content_document", data_object_name: "content_documents",
      description: "Route a content document into an approval or review workflow via Semantius CRUD." },
    { tool_name: "approve_content_document", data_object_name: "content_documents",
      description: "Record an approval decision on a content document in a workflow via Semantius CRUD." },
  ];

  const existingToolRows = await get(
    `/tools?tool_name=in.(${mutateTools.map(t => t.tool_name).join(",")})&select=id,tool_name`,
  );
  const toolId = new Map<string, number>(existingToolRows.map(t => [String(t.tool_name), Number(t.id)]));
  const newToolPayload = mutateTools
    .filter(t => !toolId.has(t.tool_name))
    .map(t => {
      const doid = doId.get(t.data_object_name);
      if (doid === undefined) throw new Error(`data_object not found for tool ${t.tool_name}: ${t.data_object_name}`);
      return {
        tool_name: t.tool_name,
        description: t.description,
        operation_kind: "mutate",
        data_object_id: doid,
        coverage_tier: "platform",
      };
    });
  if (newToolPayload.length > 0) {
    const ins = await post(`/tools`, newToolPayload);
    for (const r of ins) toolId.set(String(r.tool_name), Number(r.id));
    console.log(`  INSERT ${ins.length} mutate tools: ${ins.map(r => r.tool_name).join(", ")}`);
  } else {
    console.log(`  ok   all ${mutateTools.length} mutate tools already exist`);
  }
  // Add the 5 existing platform query tools + notify_person to the resolver.
  const sharedTools = await get(
    `/tools?tool_name=in.(query_documents,query_document_versions,query_document_folders,query_document_classifications,query_records_retention_policies,notify_person)&select=id,tool_name`,
  );
  for (const t of sharedTools) toolId.set(String(t.tool_name), Number(t.id));

  // -- 2. system skills (one per module, idempotent by skill_name) --
  type SkillDraft = { skill_name: string; domain_module_id: number; description: string };
  const skills: SkillDraft[] = [
    { skill_name: "ecm_repository_agent", domain_module_id: 242,
      description: "System skill for the Content Repository and Capture module. Captures inbound unstructured content, manages metadata, folders, check-in / check-out, version history, and manual plus ML-assisted classification of content documents." },
    { skill_name: "ecm_records_gov_agent", domain_module_id: 243,
      description: "System skill for the Records Management and Information Governance module. Authors retention schedules, applies legal holds, drives defensible disposition at retention expiry, and maintains compliance audit trails over the content estate." },
    { skill_name: "ecm_workflow_agent", domain_module_id: 244,
      description: "System skill for the Document Workflow Automation module. Routes content documents and their versions through review and approval workflows with auditable transitions." },
  ];
  const existingSkills = await get(
    `/skills?skill_name=in.(${skills.map(s => s.skill_name).join(",")})&select=id,skill_name,domain_module_id`,
  );
  const skillId = new Map<string, number>(existingSkills.map(s => [String(s.skill_name), Number(s.id)]));
  const newSkillPayload = skills
    .filter(s => !skillId.has(s.skill_name))
    .map(s => ({
      skill_name: s.skill_name,
      description: s.description,
      skill_type: "system",
      domain_id: DOMAIN_ID,
      domain_module_id: s.domain_module_id,
    }));
  if (newSkillPayload.length > 0) {
    const ins = await post(`/skills`, newSkillPayload);
    for (const r of ins) skillId.set(String(r.skill_name), Number(r.id));
    console.log(`  INSERT ${ins.length} system skills: ${ins.map(r => `${r.skill_name}(id ${r.id})`).join(", ")}`);
  } else {
    console.log(`  ok   all ${skills.length} system skills already exist`);
  }

  // -- 3. skill_tools matrix (idempotent on (skill_id, tool_id)) --
  type ST = { tool: string; level: "required" | "optional" };
  const matrix: Record<string, ST[]> = {
    ecm_repository_agent: [
      { tool: "query_documents", level: "required" },                 // 429
      { tool: "query_document_versions", level: "required" },         // 430
      { tool: "query_document_folders", level: "required" },          // 431
      { tool: "query_document_classifications", level: "required" },  // 432
      { tool: "update_content_document", level: "required" },         // mutate 429
      { tool: "classify_content_document", level: "required" },       // mutate 432
      { tool: "publish_document_version", level: "required" },        // mutate 430
    ],
    ecm_records_gov_agent: [
      { tool: "query_records_retention_policies", level: "required" },// 433 master
      { tool: "query_documents", level: "required" },                 // 429 consumer
      { tool: "update_records_retention_policy", level: "required" }, // mutate 433
      { tool: "dispose_content_document", level: "required" },        // mutate 429
    ],
    ecm_workflow_agent: [
      { tool: "query_documents", level: "required" },                 // 429 consumer (required)
      { tool: "query_document_versions", level: "optional" },         // 430 consumer (optional)
      { tool: "route_content_document", level: "required" },          // mutate 429
      { tool: "approve_content_document", level: "required" },        // mutate 429
      { tool: "notify_person", level: "required" },                   // workflow routing notification (abstraction)
    ],
  };

  // existing skill_tools for these skills, to avoid dupes
  const sids = [...skillId.values()];
  const existingST = sids.length
    ? await get(`/skill_tools?skill_id=in.(${sids.join(",")})&select=skill_id,tool_id`)
    : [];
  const stKey = (s: number, t: number) => `${s}:${t}`;
  const haveST = new Set(existingST.map(r => stKey(Number(r.skill_id), Number(r.tool_id))));

  const stPayload: Row[] = [];
  for (const [skillName, tools] of Object.entries(matrix)) {
    const sid = skillId.get(skillName);
    if (sid === undefined) throw new Error(`skill not resolved: ${skillName}`);
    for (const t of tools) {
      const tid = toolId.get(t.tool);
      if (tid === undefined) throw new Error(`tool not resolved: ${t.tool}`);
      if (haveST.has(stKey(sid, tid))) {
        console.log(`  ok   ${skillName} needs ${t.tool}: already linked`);
        continue;
      }
      stPayload.push({ skill_id: sid, tool_id: tid, requirement_level: t.level });
    }
  }
  if (stPayload.length > 0) {
    const ins = await post(`/skill_tools`, stPayload);
    console.log(`  INSERT ${ins.length} skill_tools rows`);
  } else {
    console.log(`  ok   no new skill_tools to insert`);
  }
  console.log("");

  // ===============================================================
  // B1A-M8-MODULE-UX : catalog_tagline + catalog_description on 242/243/244.
  //   Empty-guard: write only where the current value is empty; never overwrite.
  //   Buyer-voice (workflow + value), no vendor/product names, no em-dashes.
  // ===============================================================
  console.log("[B1A-M8-MODULE-UX] catalog UX backfill (empty-guard)");
  const UX: Record<number, { tagline: string; description: string }> = {
    242: {
      tagline: "Capture every document, find it instantly, and keep one trusted version under control.",
      description:
        "Bring scanned, uploaded, and emailed files into one organized repository where every document carries rich metadata and lives in a folder structure your team actually understands. Full-text search and saved views turn a pile of files into something you can find in seconds.\n\n" +
        "Check documents out to edit them safely, publish new versions without losing the old ones, and let automatic classification flag what is confidential, restricted, or public the moment it arrives. Your people stop guessing which copy is current and start trusting the one source of truth.",
    },
    243: {
      tagline: "Keep what you must, dispose of what you can, and prove it whenever you are asked.",
      description:
        "Define retention schedules once and let every document inherit the right keep-or-dispose rule automatically, so nothing lingers past its time and nothing important is deleted too soon. When a matter requires it, place a legal hold and freeze disposition until the hold lifts.\n\n" +
        "When records reach the end of their retention period, run defensible disposition with a clear, recorded decision. An immutable trail of who accessed, changed, shared, and disposed of each document gives auditors and regulators the evidence they ask for, without a last-minute scramble.",
    },
    244: {
      tagline: "Route documents to the right people and capture every approval on the record.",
      description:
        "Turn document handling into repeatable, auditable processes. Send contracts, claims, invoices, and case files to the right reviewers in the right order, with clear steps, due dates, and a record of every decision along the way.\n\n" +
        "Each transition is captured, so you always know where a document is, who has it, and what happens next. Approvals are no longer buried in inboxes; they are part of the document's history.",
    },
  };
  let uxPatched = 0;
  const mods = await get(
    `/domain_modules?id=in.(242,243,244)&select=id,domain_module_code,catalog_tagline,catalog_description`,
  );
  for (const m of mods) {
    const id = Number(m.id);
    const copy = UX[id];
    if (!copy) continue;
    const body: Row = {};
    if (m.catalog_tagline === "" || m.catalog_tagline === null) {
      body.catalog_tagline = copy.tagline;
    } else {
      console.log(`  SKIP module ${id} ${m.domain_module_code}: catalog_tagline non-empty; not overwriting`);
    }
    if (m.catalog_description === "" || m.catalog_description === null) {
      body.catalog_description = copy.description;
    } else {
      console.log(`  SKIP module ${id} ${m.domain_module_code}: catalog_description non-empty; not overwriting`);
    }
    if (Object.keys(body).length > 0) {
      await patch(`/domain_modules?id=eq.${id}`, body);
      console.log(`  PATCH module ${id} ${m.domain_module_code}: wrote ${Object.keys(body).join(" + ")}`);
      uxPatched++;
    }
  }
  console.log(`  -> ${uxPatched} modules patched\n`);

  // ===============================================================
  // Verification re-reads
  // ===============================================================
  console.log("=== verification ===");
  const evLeft = await get(
    `/trigger_events?id=in.(${EVENT_IDS.join(",")})&event_category=neq.state_change&select=id`,
  );
  console.log(`trigger_events not state_change in set: ${evLeft.length} (expect 0)`);

  const skSet = await get(
    `/skills?domain_id=eq.91&skill_type=eq.system&domain_module_id=not.is.null&select=id,skill_name,domain_module_id&order=domain_module_id.asc`,
  );
  console.log(`module-level system skills for ECM: ${skSet.length} (expect 3)`);
  for (const s of skSet) console.log(`  ${s.skill_name} (id ${s.id}) -> module ${s.domain_module_id}`);
  const skIds = skSet.map(s => s.id);
  const stCount = await get(
    `/skill_tools?skill_id=in.(${skIds.join(",")})&select=skill_id,requirement_level,tools(tool_name,operation_kind,data_object_id)`,
  );
  const perSkill = new Map<number, number>();
  for (const r of stCount) perSkill.set(Number(r.skill_id), (perSkill.get(Number(r.skill_id)) ?? 0) + 1);
  for (const s of skSet) console.log(`  skill ${s.skill_name}: ${perSkill.get(Number(s.id)) ?? 0} skill_tools`);
  // F4 invariant spot-check
  let f4bad = 0;
  for (const r of stCount as any[]) {
    const t = r.tools;
    if (!t) continue;
    const ok =
      ((t.operation_kind === "query" || t.operation_kind === "mutate") && t.data_object_id != null) ||
      (["fetch", "side_effect", "compute"].includes(t.operation_kind) && t.data_object_id == null) ||
      t.operation_kind === "inbound";
    if (!ok) { f4bad++; console.log(`  F4 VIOLATION: ${t.tool_name} (${t.operation_kind}, data_object_id=${t.data_object_id})`); }
  }
  console.log(`F4 invariant violations: ${f4bad} (expect 0)`);

  const uxCheck = await get(
    `/domain_modules?id=in.(242,243,244)&select=id,domain_module_code,catalog_tagline,catalog_description`,
  );
  for (const m of uxCheck) {
    const tl = String(m.catalog_tagline ?? "");
    const dl = String(m.catalog_description ?? "");
    console.log(`  module ${m.id} ${m.domain_module_code}: tagline ${tl.length} chars, description ${dl.length} chars`);
  }

  console.log("\nUI links:");
  console.log("  https://adenin.semantius.ai/domain_map/trigger_events");
  console.log("  https://adenin.semantius.ai/domain_map/skills");
  console.log("  https://adenin.semantius.ai/domain_map/skill_tools");
  console.log("  https://adenin.semantius.ai/domain_map/tools");
  console.log("  https://adenin.semantius.ai/domain_map/domain_modules");
  console.log("\n=== done ===");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
