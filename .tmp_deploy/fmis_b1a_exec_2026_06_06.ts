#!/usr/bin/env bun
// FMIS b1a execution (2026-06-06): three agent-solvable bands.
//   B1A-B10B-BACKFILL  -> PATCH source_domain_module_id on 10 outbound handoffs.
//   B1A-S7             -> INSERT intra-domain data_object_relationships among 8 FMIS masters.
//   B1A-SYSTEM-SKILLS  -> 4 per-module system skills, create/update mutate tools,
//                          rebind 8 platform query tools, DELETE legacy skill 61.
//
// All writes are idempotent (dedup by natural key / pre-flight). record_status omitted
// on every insert (DB default = "new"). notes never written. No em-dashes.

import {} from "bun";

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
    const msg = stderr.trim();
    if (/required audience not found/i.test(msg)) {
      throw new Error(`JWT_AUDIENCE_ERROR: ${msg}`);
    }
    throw new Error(`semantius call failed (exit ${exitCode}): ${msg}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (path: string) => call({ method: "GET", path });
async function post(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    out.push(...(await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) })));
  }
  return out;
}
async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

// ---- canonical entity / module map (verified against live before run) ----
const MASTER = {
  farm_fields: 486,
  crop_plans: 487,
  planting_records: 488,
  field_applications: 489,
  harvest_records: 490,
  ag_input_inventory: 491,
  variable_rate_prescriptions: 492,
  machinery_telemetry_records: 493,
} as const;
// module that masters each master (from domain_module_data_objects role=master)
const MASTER_MODULE: Record<number, number> = {
  486: 252, 487: 252,            // FMIS-FIELD-CROP-PLANNING
  488: 253, 489: 253, 490: 253,  // FMIS-FIELD-OPS-RECORDS
  492: 254, 493: 254,            // FMIS-PRECISION-AG
  491: 255,                       // FMIS-INPUT-INVENTORY-ANALYTICS
};
const NAME_BY_ID: Record<number, string> = Object.fromEntries(
  Object.entries(MASTER).map(([n, id]) => [id, n]),
);

const log: string[] = [];
const note = (s: string) => { console.log(s); log.push(s); };

// ===================================================================
// B1A-B10B-BACKFILL: set source_domain_module_id on outbound handoffs.
// source_domain_module_id = module mastering the trigger_event's data_object.
// ===================================================================
async function backfillHandoffs() {
  note("\n== B1A-B10B-BACKFILL ==");
  const handoffs = await get(
    "/handoffs?source_domain_id=eq.154&select=id,source_domain_module_id,data_object_id,trigger_events(event_name,data_object_id)&order=id.asc",
  );
  let patched = 0;
  for (const h of handoffs) {
    const id = Number(h.id);
    const eventDoid = Number((h.trigger_events as Row)?.data_object_id);
    const target = MASTER_MODULE[eventDoid];
    if (!target) {
      note(`  handoff ${id}: NO MODULE for event data_object ${eventDoid} -> SKIP`);
      continue;
    }
    if (h.source_domain_module_id !== null && h.source_domain_module_id !== undefined) {
      note(`  handoff ${id}: already set to ${h.source_domain_module_id} -> skip`);
      continue;
    }
    await patch(`/handoffs?id=eq.${id}`, { source_domain_module_id: target });
    patched++;
    note(`  handoff ${id} (${(h.trigger_events as Row)?.event_name}): source_domain_module_id NULL -> ${target}`);
  }
  note(`  patched ${patched} handoffs`);
}

// ===================================================================
// B1A-S7: intra-domain data_object_relationships among FMIS masters.
// Normalized parent-first one_to_many; owner_side=source (parent); reference kind.
// ===================================================================
type RelSpec = {
  parent: number; child: number; verb: string; inverse: string; required: boolean;
};
const REL_SPECS: RelSpec[] = [
  { parent: MASTER.farm_fields, child: MASTER.crop_plans, verb: "contains", inverse: "belongs to", required: true },
  { parent: MASTER.crop_plans, child: MASTER.planting_records, verb: "produces", inverse: "fulfills", required: true },
  { parent: MASTER.crop_plans, child: MASTER.field_applications, verb: "drives", inverse: "executes", required: true },
  { parent: MASTER.crop_plans, child: MASTER.harvest_records, verb: "produces", inverse: "realizes", required: true },
  { parent: MASTER.farm_fields, child: MASTER.field_applications, verb: "scopes", inverse: "is performed on", required: true },
  { parent: MASTER.farm_fields, child: MASTER.planting_records, verb: "scopes", inverse: "is performed on", required: true },
  { parent: MASTER.farm_fields, child: MASTER.harvest_records, verb: "scopes", inverse: "is performed on", required: true },
  { parent: MASTER.farm_fields, child: MASTER.variable_rate_prescriptions, verb: "is targeted by", inverse: "targets", required: true },
  { parent: MASTER.variable_rate_prescriptions, child: MASTER.field_applications, verb: "drives", inverse: "is guided by", required: true },
  { parent: MASTER.ag_input_inventory, child: MASTER.field_applications, verb: "supplies", inverse: "consumes from", required: true },
  { parent: MASTER.ag_input_inventory, child: MASTER.planting_records, verb: "supplies", inverse: "consumes from", required: true },
  { parent: MASTER.farm_fields, child: MASTER.machinery_telemetry_records, verb: "scopes", inverse: "is captured on", required: true },
  { parent: MASTER.machinery_telemetry_records, child: MASTER.planting_records, verb: "documents", inverse: "is documented by", required: true },
  { parent: MASTER.machinery_telemetry_records, child: MASTER.field_applications, verb: "documents", inverse: "is documented by", required: true },
  { parent: MASTER.machinery_telemetry_records, child: MASTER.harvest_records, verb: "documents", inverse: "is documented by", required: true },
];

async function loadRelationships() {
  note("\n== B1A-S7 intra-domain data_object_relationships ==");
  const masterIds = Object.values(MASTER);
  const existing = await get(
    `/data_object_relationships?or=(data_object_id.in.(${masterIds.join(",")}),related_data_object_id.in.(${masterIds.join(",")}))&select=id,data_object_id,related_data_object_id,relationship_verb`,
  );
  const seen = new Set(
    existing.map(r => `${r.data_object_id}|${r.related_data_object_id}`),
  );
  const rows: Row[] = [];
  for (const s of REL_SPECS) {
    const key = `${s.parent}|${s.child}`;
    if (seen.has(key)) {
      note(`  edge ${NAME_BY_ID[s.parent]} -> ${NAME_BY_ID[s.child]} already exists -> skip`);
      continue;
    }
    rows.push({
      data_object_id: s.parent,
      related_data_object_id: s.child,
      data_object_relationship_label: `${NAME_BY_ID[s.parent]} ${s.verb} ${NAME_BY_ID[s.child]}`,
      relationship_verb: s.verb,
      inverse_verb: s.inverse,
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      is_required: s.required,
      owner_side: "source",
    });
  }
  const inserted = await post("/data_object_relationships", rows);
  note(`  inserted ${inserted.length} intra-domain relationship rows (skipped ${REL_SPECS.length - rows.length})`);
}

// ===================================================================
// B1A-SYSTEM-SKILLS
// ===================================================================
type ModuleSkill = {
  module_id: number;
  module_code: string;
  skill_name: string;
  masters: number[]; // data_object ids this module masters
};
const MODULE_SKILLS: ModuleSkill[] = [
  { module_id: 252, module_code: "FMIS-FIELD-CROP-PLANNING", skill_name: "fmis_field_crop_planning_agent", masters: [486, 487] },
  { module_id: 253, module_code: "FMIS-FIELD-OPS-RECORDS", skill_name: "fmis_field_ops_records_agent", masters: [488, 489, 490] },
  { module_id: 254, module_code: "FMIS-PRECISION-AG", skill_name: "fmis_precision_ag_agent", masters: [492, 493] },
  { module_id: 255, module_code: "FMIS-INPUT-INVENTORY-ANALYTICS", skill_name: "fmis_input_inventory_analytics_agent", masters: [491] },
];
// tool-name stem per master, mirroring the existing query_* tool naming
const TOOL_STEM: Record<number, string> = {
  486: "fields",
  487: "crop_plans",
  488: "planting_records",
  489: "field_applications",
  490: "harvest_records",
  491: "ag_input_inventory",
  492: "variable_rate_prescriptions",
  493: "machinery_telemetry_records",
};

async function loadSystemSkills() {
  note("\n== B1A-SYSTEM-SKILLS ==");

  // --- snapshot legacy skill 61 + its skill_tools (for reversibility) ---
  const legacySkill = await get("/skills?id=eq.61&select=*");
  const legacyTools = await get(
    "/skill_tools?skill_id=eq.61&select=id,skill_id,tool_id,requirement_level&order=id.asc",
  );
  note(`  SNAPSHOT skill 61: ${JSON.stringify(legacySkill[0] ?? null)}`);
  note(`  SNAPSHOT skill_tools(61): ${JSON.stringify(legacyTools)}`);

  // --- 1. ensure query tools exist (they do: 477-484), build name->id map ---
  const queryTools = await get(
    "/tools?operation_kind=eq.query&data_object_id=in.(486,487,488,489,490,491,492,493)&select=id,tool_name,data_object_id,operation_kind",
  );
  const queryToolByDoid = new Map<number, number>();
  for (const t of queryTools) queryToolByDoid.set(Number(t.data_object_id), Number(t.id));

  // --- 2. create create_/update_ mutate tools per master (dedup by tool_name) ---
  const allMasters = Object.values(MASTER);
  const existingTools = await get(
    `/tools?data_object_id=in.(${allMasters.join(",")})&select=id,tool_name,operation_kind,data_object_id`,
  );
  const toolByName = new Map<string, number>();
  for (const t of existingTools) toolByName.set(String(t.tool_name), Number(t.id));

  const mutateSpecs: { tool_name: string; data_object_id: number }[] = [];
  for (const doid of allMasters) {
    const stem = TOOL_STEM[doid];
    for (const verb of ["create", "update"]) {
      const name = `${verb}_${stem}`;
      if (!toolByName.has(name)) mutateSpecs.push({ tool_name: name, data_object_id: doid });
    }
  }
  const mutateRows: Row[] = mutateSpecs.map(m => ({
    tool_name: m.tool_name,
    data_object_id: m.data_object_id,
    operation_kind: "mutate",
    coverage_tier: "platform",
    description: "",
  }));
  const insertedMutate = await post("/tools", mutateRows);
  note(`  inserted ${insertedMutate.length} mutate tools (skipped ${16 - mutateSpecs.length} pre-existing)`);

  // refresh tool map after insert
  const toolsNow = await get(
    `/tools?data_object_id=in.(${allMasters.join(",")})&select=id,tool_name,operation_kind,data_object_id`,
  );
  const toolByNameNow = new Map<string, number>();
  for (const t of toolsNow) toolByNameNow.set(String(t.tool_name), Number(t.id));

  // --- 3. create one system skill per module (dedup by skill_name+module) ---
  const existingSkills = await get(
    "/skills?domain_module_id=in.(252,253,254,255)&skill_type=eq.system&select=id,skill_name,domain_module_id",
  );
  const skillByModule = new Map<number, number>();
  for (const s of existingSkills) skillByModule.set(Number(s.domain_module_id), Number(s.id));

  const skillRows: Row[] = [];
  for (const ms of MODULE_SKILLS) {
    if (skillByModule.has(ms.module_id)) {
      note(`  skill for module ${ms.module_id} already exists (id ${skillByModule.get(ms.module_id)}) -> skip insert`);
      continue;
    }
    skillRows.push({
      skill_name: ms.skill_name,
      skill_type: "system",
      domain_id: 154,
      domain_module_id: ms.module_id,
      description: "",
    });
  }
  const insertedSkills = await post("/skills", skillRows);
  for (const s of insertedSkills) {
    const code = MODULE_SKILLS.find(m => m.skill_name === s.skill_name);
    if (code) skillByModule.set(code.module_id, Number(s.id));
    note(`  created skill ${s.skill_name} (id ${s.id}) on module ${s.domain_module_id}`);
  }

  // --- 4. skill_tools: bind query + create + update per master onto module skill ---
  // pull existing skill_tools for these skills to dedup by (skill_id, tool_id)
  const newSkillIds = MODULE_SKILLS.map(m => skillByModule.get(m.module_id)).filter(Boolean);
  const existingST = newSkillIds.length
    ? await get(
        `/skill_tools?skill_id=in.(${newSkillIds.join(",")})&select=skill_id,tool_id`,
      )
    : [];
  const stSeen = new Set(existingST.map(r => `${r.skill_id}|${r.tool_id}`));

  const stRows: Row[] = [];
  for (const ms of MODULE_SKILLS) {
    const skillId = skillByModule.get(ms.module_id);
    if (!skillId) { note(`  WARN no skill id for module ${ms.module_id}`); continue; }
    for (const doid of ms.masters) {
      const stem = TOOL_STEM[doid];
      const toolIds = [
        queryToolByDoid.get(doid),
        toolByNameNow.get(`create_${stem}`),
        toolByNameNow.get(`update_${stem}`),
      ].filter((x): x is number => typeof x === "number");
      for (const tid of toolIds) {
        if (stSeen.has(`${skillId}|${tid}`)) continue;
        stSeen.add(`${skillId}|${tid}`);
        stRows.push({ skill_id: skillId, tool_id: tid, requirement_level: "required" });
      }
    }
  }
  const insertedST = await post("/skill_tools", stRows);
  note(`  inserted ${insertedST.length} skill_tools rows across 4 module skills`);

  // --- 5. DELETE legacy skill 61 only after new rows exist ---
  // verify all 4 module skills now exist and each has >=1 skill_tool
  const verifySkills = await get(
    "/skills?domain_module_id=in.(252,253,254,255)&skill_type=eq.system&select=id,domain_module_id",
  );
  const verifyById = verifySkills.map(s => Number(s.id));
  const stCounts = await get(
    `/skill_tools?skill_id=in.(${verifyById.join(",")})&select=skill_id`,
  );
  const perSkill = new Map<number, number>();
  for (const r of stCounts) perSkill.set(Number(r.skill_id), (perSkill.get(Number(r.skill_id)) ?? 0) + 1);
  const allModulesCovered = [252, 253, 254, 255].every(m =>
    verifySkills.some(s => Number(s.domain_module_id) === m),
  );
  const allHaveTools = verifyById.every(id => (perSkill.get(id) ?? 0) >= 1);
  if (!allModulesCovered || !allHaveTools) {
    note(`  ABORT DELETE 61: modulesCovered=${allModulesCovered} allHaveTools=${allHaveTools}`);
    return;
  }
  // delete legacy skill_tools first (FK), then the skill
  await call({ method: "DELETE", path: "/skill_tools?skill_id=eq.61" });
  await call({ method: "DELETE", path: "/skills?id=eq.61" });
  note(`  DELETED legacy skill_tools(skill_id=61) [${legacyTools.length} rows] and skill 61`);
}

// ===================================================================
async function main() {
  await backfillHandoffs();
  await loadRelationships();
  await loadSystemSkills();
  note("\n== DONE ==");
}
main().catch(e => {
  console.error("LOADER FAILED:", e.message);
  process.exit(1);
});
