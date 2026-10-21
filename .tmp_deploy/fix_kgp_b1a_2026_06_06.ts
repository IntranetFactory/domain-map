// KGP b1a execution — 2026-06-06
// Executes the agent-solvable pending actions for domain KGP (id 138) against the
// live domain_map master module. Run from project root: bun run <abs path>.
//
// Items:
//  - B1A-SYSTEM-SKILLS: 2 module-scoped system skills (270, 271), re-allocate skill 76's
//    4 query tools by module, add mutate + side_effect tool floor per master, retire skill 76,
//    write module 270/271 catalog_tagline + catalog_description (M8, empty-guard).
//  - B1A-EVENT-MODULE-FK: PATCH trigger_events module FK (720,721->270; 722,723->271).
//  - B1A-B10B-HANDOFF-FK: PATCH handoff module FKs (221,697->270 src; 698,699->271 src;
//    222->271 tgt; 223->270 tgt).
//  - B1A-APQC-H221: verify handoff_processes row for 221 (idempotent insert if missing).
//
// All inserts omit record_status (DB default = "new"). No notes columns written.

type Json = Record<string, unknown>;

async function cli(method: string, path: string, body?: unknown): Promise<any> {
  const req: Json = { method, path };
  if (body !== undefined) req.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(req)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (err && /required audience not found/i.test(err)) {
    throw new Error("JWT_AUDIENCE: " + err.trim());
  }
  if (proc.exitCode !== 0) {
    throw new Error(`CLI failed (${method} ${path}) exit ${proc.exitCode}: ${err || out}`);
  }
  const text = out.trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function log(...a: unknown[]) {
  console.log(...a);
}

async function main() {
  // ---------------------------------------------------------------------------
  // B1A-SYSTEM-SKILLS — part 1: ensure the mutate tool floor exists (dedup by tool_name)
  // ---------------------------------------------------------------------------
  // Re-read tools immediately before creating any generic/reusable tool (Rule #9 / scope #9).
  const newTools = [
    { tool_name: "publish_ontology", operation_kind: "mutate", data_object_id: 742, coverage_tier: "platform",
      description: "Validate and publish a versioned ontology so downstream graphs and agents can rely on it." },
    { tool_name: "merge_kg_entity", operation_kind: "mutate", data_object_id: 743, coverage_tier: "platform",
      description: "Reconcile and merge duplicate knowledge graph entities into a single canonical record." },
  ];
  const toolIdByName: Record<string, number> = {};
  for (const t of newTools) {
    const existing = await cli("GET", `/tools?tool_name=eq.${t.tool_name}&select=id,tool_name,operation_kind,data_object_id`);
    if (Array.isArray(existing) && existing.length > 0) {
      toolIdByName[t.tool_name] = existing[0].id;
      log(`tool exists: ${t.tool_name} -> id ${existing[0].id} (linked, not re-created)`);
    } else {
      const ins = await cli("POST", "/tools", [t]);
      const id = Array.isArray(ins) ? ins[0].id : ins.id;
      toolIdByName[t.tool_name] = id;
      log(`tool created: ${t.tool_name} -> id ${id}`);
    }
  }

  // notify_person is the side_effect floor (channel abstraction, platform) — must already exist.
  const np = await cli("GET", `/tools?tool_name=eq.notify_person&select=id`);
  if (!Array.isArray(np) || np.length === 0) throw new Error("notify_person tool not found (expected id 913)");
  const notifyPersonId = np[0].id as number;
  log(`notify_person -> id ${notifyPersonId}`);

  // ---------------------------------------------------------------------------
  // B1A-SYSTEM-SKILLS — part 2: author the 2 module-scoped system skills (dedup by name)
  // ---------------------------------------------------------------------------
  const skills = [
    { skill_name: "kgp_ontology_engine_agent", skill_type: "system", domain_id: 138, domain_module_id: 270,
      description: "System skill for the KGP Ontology Engine module: authors, validates, and publishes ontologies on the native graph store, and reads the cross-domain ontology surface." },
    { skill_name: "kgp_graph_query_apps_agent", skill_type: "system", domain_id: 138, domain_module_id: 271,
      description: "System skill for the KGP Graph Query and Applications module: queries and reconciles knowledge graph entities for federated queries, agent grounding, and operational apps." },
  ];
  const skillIdByName: Record<string, number> = {};
  for (const s of skills) {
    const existing = await cli("GET", `/skills?skill_name=eq.${s.skill_name}&select=id,domain_module_id`);
    if (Array.isArray(existing) && existing.length > 0) {
      skillIdByName[s.skill_name] = existing[0].id;
      log(`skill exists: ${s.skill_name} -> id ${existing[0].id} (linked, not re-created)`);
    } else {
      const ins = await cli("POST", "/skills", [s]);
      const id = Array.isArray(ins) ? ins[0].id : ins.id;
      skillIdByName[s.skill_name] = id;
      log(`skill created: ${s.skill_name} -> id ${id} (module ${s.domain_module_id})`);
    }
  }
  const skill270 = skillIdByName["kgp_ontology_engine_agent"];
  const skill271 = skillIdByName["kgp_graph_query_apps_agent"];

  // ---------------------------------------------------------------------------
  // B1A-SYSTEM-SKILLS — part 3: skill_tools allocation (re-allocate skill 76's queries by module
  // + mutate + side_effect floor). Dedup by (skill_id, tool_id).
  // ---------------------------------------------------------------------------
  const desiredSkillTools = [
    // module 270 (ontology engine): query_ontologies(111), query_kgp_ontologies(820), publish_ontology, notify_person
    { skill_id: skill270, tool_id: 111, requirement_level: "required" },
    { skill_id: skill270, tool_id: 820, requirement_level: "required" },
    { skill_id: skill270, tool_id: toolIdByName["publish_ontology"], requirement_level: "required" },
    { skill_id: skill270, tool_id: notifyPersonId, requirement_level: "optional" },
    // module 271 (graph query apps): query_knowledge_graph_entities(386), query_kgp_knowledge_graph_entities(821), merge_kg_entity, notify_person
    { skill_id: skill271, tool_id: 386, requirement_level: "required" },
    { skill_id: skill271, tool_id: 821, requirement_level: "required" },
    { skill_id: skill271, tool_id: toolIdByName["merge_kg_entity"], requirement_level: "required" },
    { skill_id: skill271, tool_id: notifyPersonId, requirement_level: "optional" },
  ];
  for (const st of desiredSkillTools) {
    const existing = await cli("GET", `/skill_tools?skill_id=eq.${st.skill_id}&tool_id=eq.${st.tool_id}&select=id`);
    if (Array.isArray(existing) && existing.length > 0) {
      log(`skill_tools exists: skill ${st.skill_id} tool ${st.tool_id} -> id ${existing[0].id}`);
    } else {
      const ins = await cli("POST", "/skill_tools", [st]);
      const id = Array.isArray(ins) ? ins[0].id : ins.id;
      log(`skill_tools created: skill ${st.skill_id} tool ${st.tool_id} (${st.requirement_level}) -> id ${id}`);
    }
  }

  // ---------------------------------------------------------------------------
  // B1A-SYSTEM-SKILLS — part 4: retire legacy skill 76 (delete its skill_tools, then the skill)
  // Snapshot already captured in history.md before this run.
  // ---------------------------------------------------------------------------
  const skill76Tools = await cli("GET", `/skill_tools?skill_id=eq.76&select=id,tool_id,requirement_level`);
  if (Array.isArray(skill76Tools) && skill76Tools.length > 0) {
    for (const row of skill76Tools) {
      await cli("DELETE", `/skill_tools?id=eq.${row.id}`);
      log(`skill_tools deleted (skill 76): id ${row.id} (tool ${row.tool_id})`);
    }
  }
  const skill76 = await cli("GET", `/skills?id=eq.76&select=id`);
  if (Array.isArray(skill76) && skill76.length > 0) {
    await cli("DELETE", `/skills?id=eq.76`);
    log(`skill deleted: id 76 (kgp-system, legacy domain-level)`);
  } else {
    log(`skill 76 already absent`);
  }

  // ---------------------------------------------------------------------------
  // B1A-SYSTEM-SKILLS — part 5: module catalog UX copy (M8). Empty-guard per field.
  // ---------------------------------------------------------------------------
  const moduleCopy = [
    {
      id: 270,
      catalog_tagline: "Model your business as a living ontology and let the graph infer the facts you never wrote down.",
      catalog_description:
        "Capture your domain as a formal ontology: define the classes, properties, and constraints that describe how your business really works, and version every change so you can trust what published.\n\nA built-in reasoning tier turns those definitions into answers, materializing relationships and entailed facts your team never had to assert by hand. Everything lives on a native graph store with transactions, replication, and backup, so the model that powers your apps and agents is durable and auditable.\n\nValidate before you publish, promote a reviewed version when it is ready, and keep earlier versions for lineage. Downstream queries, applications, and AI agents all read from one shared, governed source of meaning.",
    },
    {
      id: 271,
      catalog_tagline: "Query one unified graph across every source, and ground your apps and AI agents in trusted, connected facts.",
      catalog_description:
        "Ask questions across your entire knowledge graph and federate to remote and virtual sources without moving or copying data first. Named-graph access control keeps each team scoped to what it is allowed to see.\n\nExpose relational, document, and API sources as native graph data on demand, and combine symbolic queries with vector search so retrieval returns precise, explainable results instead of guesses. Every answer carries the lineage that shows where it came from.\n\nCode-first and low-code applications read and write back to the same graph entities, and AI agents get typed, connected context they can reason over. Reconcile and merge duplicate records so the graph stays clean as it grows.",
    },
  ];
  for (const m of moduleCopy) {
    const cur = await cli("GET", `/domain_modules?id=eq.${m.id}&select=id,catalog_tagline,catalog_description`);
    const row = Array.isArray(cur) ? cur[0] : cur;
    const patch: Json = {};
    if (!row.catalog_tagline || row.catalog_tagline.trim() === "") patch.catalog_tagline = m.catalog_tagline;
    else log(`module ${m.id} catalog_tagline NON-EMPTY — left untouched (overwrite-protected)`);
    if (!row.catalog_description || row.catalog_description.trim() === "") patch.catalog_description = m.catalog_description;
    else log(`module ${m.id} catalog_description NON-EMPTY — left untouched (overwrite-protected)`);
    if (Object.keys(patch).length > 0) {
      await cli("PATCH", `/domain_modules?id=eq.${m.id}`, patch);
      log(`module ${m.id} catalog copy written: [${Object.keys(patch).join(", ")}]`);
    } else {
      log(`module ${m.id} catalog copy: nothing to write (both fields non-empty)`);
    }
  }

  // ---------------------------------------------------------------------------
  // B1A-EVENT-MODULE-FK — PATCH trigger_events.domain_module_id (only where currently NULL)
  // ---------------------------------------------------------------------------
  const eventMap: Array<[number, number]> = [[720, 270], [721, 270], [722, 271], [723, 271]];
  for (const [eid, mid] of eventMap) {
    const cur = await cli("GET", `/trigger_events?id=eq.${eid}&select=id,domain_module_id`);
    const row = Array.isArray(cur) ? cur[0] : cur;
    if (row.domain_module_id === null) {
      await cli("PATCH", `/trigger_events?id=eq.${eid}`, { domain_module_id: mid });
      log(`trigger_event ${eid} domain_module_id NULL -> ${mid}`);
    } else {
      log(`trigger_event ${eid} domain_module_id already ${row.domain_module_id} — left untouched`);
    }
  }

  // ---------------------------------------------------------------------------
  // B1A-B10B-HANDOFF-FK — PATCH per-module FK on resolvable rows (only where currently NULL)
  // ---------------------------------------------------------------------------
  // outbound: source_domain_module_id
  const srcMap: Array<[number, number]> = [[221, 270], [697, 270], [698, 271], [699, 271]];
  for (const [hid, mid] of srcMap) {
    const cur = await cli("GET", `/handoffs?id=eq.${hid}&select=id,source_domain_module_id`);
    const row = Array.isArray(cur) ? cur[0] : cur;
    if (row.source_domain_module_id === null) {
      await cli("PATCH", `/handoffs?id=eq.${hid}`, { source_domain_module_id: mid });
      log(`handoff ${hid} source_domain_module_id NULL -> ${mid}`);
    } else {
      log(`handoff ${hid} source_domain_module_id already ${row.source_domain_module_id} — left untouched`);
    }
  }
  // inbound: target_domain_module_id
  const tgtMap: Array<[number, number]> = [[222, 271], [223, 270]];
  for (const [hid, mid] of tgtMap) {
    const cur = await cli("GET", `/handoffs?id=eq.${hid}&select=id,target_domain_module_id`);
    const row = Array.isArray(cur) ? cur[0] : cur;
    if (row.target_domain_module_id === null) {
      await cli("PATCH", `/handoffs?id=eq.${hid}`, { target_domain_module_id: mid });
      log(`handoff ${hid} target_domain_module_id NULL -> ${mid}`);
    } else {
      log(`handoff ${hid} target_domain_module_id already ${row.target_domain_module_id} — left untouched`);
    }
  }

  // ---------------------------------------------------------------------------
  // B1A-APQC-H221 — ensure handoff_processes row for handoff 221 (idempotent)
  // ---------------------------------------------------------------------------
  const hp221 = await cli("GET", `/handoff_processes?handoff_id=eq.221&process_id=eq.275&select=id`);
  if (Array.isArray(hp221) && hp221.length > 0) {
    log(`handoff_processes for h.221 -> already exists (id ${hp221[0].id}); no insert`);
  } else {
    const ins = await cli("POST", "/handoff_processes", [
      { handoff_id: 221, process_id: 275, proposal_source: "agent_curated", role: "implements" },
    ]);
    const id = Array.isArray(ins) ? ins[0].id : ins.id;
    log(`handoff_processes created: h.221 -> process 275 (id ${id})`);
  }

  log("DONE");
}

main().catch((e) => {
  console.error("LOADER ERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
