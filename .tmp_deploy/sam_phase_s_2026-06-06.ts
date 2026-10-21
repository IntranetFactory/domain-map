#!/usr/bin/env bun
// SAM Phase-S: author one system skill per module (201/202/203) with its tool floor
// (Rule #17 three-source derivation), folding the 4 legacy sam-system (105) query tools
// into the module skills, then retire skill 105 (B1A-LEGACY-SKILL-RETIRE / F1 path).
//
// Idempotent: reads existing rows by natural key, inserts only the missing ones.
// Run from project root: bun run "c:/dev/domain-map/.tmp_deploy/sam_phase_s_2026-06-06.ts"

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

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    out.push(...(await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) })));
  }
  return out;
}

// ---- tool data-object ids (verified live) ----
const DO = {
  software_titles: 57,
  software_licenses: 58,
  software_installations: 59,
  license_audits: 60,
};

// ---- Module specs (Rule #17 three-source derivation) ----
// Generic/reusable tools are dedup-linked by existing tool_name (never re-created):
//   notify_person 913, notify_team 914, send_email 37, sign_document 42, receive_webhook 896
// Existing query tools (from the legacy sam-system fold): 67, 695, 694, 696
// New domain-specific mutate tools are created here (query_<entity>/mutate are SAM's to own).

type ToolSpec = {
  tool_name: string;
  // when present, this tool must be CREATED if missing (domain-specific mutate)
  create?: {
    description: string;
    operation_kind: "mutate";
    coverage_tier: "platform";
    data_object_id: number;
  };
  requirement_level: "required" | "optional";
};

type SkillSpec = {
  skill_name: string;
  domain_module_id: number;
  description: string;
  tools: ToolSpec[];
};

const SKILLS: SkillSpec[] = [
  {
    skill_name: "sam_catalog_discovery_agent",
    domain_module_id: 201,
    description:
      "System skill for the Software Catalog and Installation Discovery module: maintains the normalized software product catalog, ingests discovered installation signals from inventory sources, and reconciles installed software against the catalog.",
    tools: [
      { tool_name: "query_software_titles", requirement_level: "required" },
      { tool_name: "query_software_installations", requirement_level: "required" },
      {
        tool_name: "create_software_title",
        requirement_level: "required",
        create: {
          description: "Add a new normalized software product entry to the SAM catalog via Semantius CRUD.",
          operation_kind: "mutate",
          coverage_tier: "platform",
          data_object_id: DO.software_titles,
        },
      },
      {
        tool_name: "update_software_title",
        requirement_level: "required",
        create: {
          description: "Update a normalized software product entry in the SAM catalog via Semantius CRUD.",
          operation_kind: "mutate",
          coverage_tier: "platform",
          data_object_id: DO.software_titles,
        },
      },
      {
        tool_name: "update_software_installation",
        requirement_level: "required",
        create: {
          description: "Update a discovered software installation record (verification, normalization match, removal) via Semantius CRUD.",
          operation_kind: "mutate",
          coverage_tier: "platform",
          data_object_id: DO.software_installations,
        },
      },
      // discovery ingestion channel (action text: receive_webhook / notify_team)
      { tool_name: "receive_webhook", requirement_level: "required" },
      { tool_name: "notify_team", requirement_level: "optional" },
    ],
  },
  {
    skill_name: "sam_entitlement_mgmt_agent",
    domain_module_id: 202,
    description:
      "System skill for the Entitlement Reconciliation and Renewal module: reconciles deployments and usage against purchased entitlements, manages renewal and true-up windows, and drives reclamation of unused licenses.",
    tools: [
      { tool_name: "query_software_licenses", requirement_level: "required" },
      {
        tool_name: "create_software_license",
        requirement_level: "required",
        create: {
          description: "Create a software license entitlement record via Semantius CRUD.",
          operation_kind: "mutate",
          coverage_tier: "platform",
          data_object_id: DO.software_licenses,
        },
      },
      {
        tool_name: "update_software_license",
        requirement_level: "required",
        create: {
          description: "Update a software license entitlement record (activation, renewal, expiry, retirement) via Semantius CRUD.",
          operation_kind: "mutate",
          coverage_tier: "platform",
          data_object_id: DO.software_licenses,
        },
      },
      // renewal / over-consumption notifications (abstraction default, Rule #20 channel-vs-capability)
      { tool_name: "notify_person", requirement_level: "required" },
    ],
  },
  {
    skill_name: "sam_audit_defense_agent",
    domain_module_id: 203,
    description:
      "System skill for the Audit Defense and Compliance Reporting module: gathers deployment and usage evidence, assembles audit response packages, and submits counsel-reviewed responses to publisher audit demands.",
    tools: [
      { tool_name: "query_license_audits", requirement_level: "required" },
      {
        tool_name: "create_license_audit",
        requirement_level: "required",
        create: {
          description: "Open a license audit / true-up case record via Semantius CRUD.",
          operation_kind: "mutate",
          coverage_tier: "platform",
          data_object_id: DO.license_audits,
        },
      },
      {
        tool_name: "update_license_audit",
        requirement_level: "required",
        create: {
          description: "Update a license audit case (evidence gathered, submitted, negotiating, resolved) via Semantius CRUD.",
          operation_kind: "mutate",
          coverage_tier: "platform",
          data_object_id: DO.license_audits,
        },
      },
      // external-channel tools for publisher audit-response submission (action text)
      { tool_name: "send_email", requirement_level: "required" },
      { tool_name: "sign_document", requirement_level: "required" },
    ],
  },
];

async function main() {
  // ---- Pre-flight: load all existing tools, dedup by tool_name ----
  const allTools = await get("/tools?select=id,tool_name,operation_kind,coverage_tier,data_object_id&limit=10000");
  const toolByName = new Map<string, Row>();
  for (const t of allTools) toolByName.set(String(t.tool_name), t);

  // 1) Create any missing domain-specific mutate tools (dedup by tool_name).
  const toolsToCreate: Row[] = [];
  for (const s of SKILLS) {
    for (const t of s.tools) {
      if (t.create && !toolByName.has(t.tool_name)) {
        toolsToCreate.push({
          tool_name: t.tool_name,
          description: t.create.description,
          operation_kind: t.create.operation_kind,
          coverage_tier: t.create.coverage_tier,
          data_object_id: t.create.data_object_id,
          // record_status OMITTED (DB default 'new', Rule #1/#4)
        });
      }
    }
  }
  // dedup the create list itself (same tool_name twice across modules would not happen, but be safe)
  const seen = new Set<string>();
  const uniqueCreate = toolsToCreate.filter(t => {
    const n = String(t.tool_name);
    if (seen.has(n)) return false;
    seen.add(n);
    return true;
  });
  if (uniqueCreate.length) {
    const created = await insert("/tools", uniqueCreate);
    for (const t of created) toolByName.set(String(t.tool_name), t);
    console.log(`Created ${created.length} tools: ${created.map(t => t.tool_name).join(", ")}`);
  } else {
    console.log("No new tools needed (all present).");
  }

  // Verify every referenced tool now resolves.
  for (const s of SKILLS) {
    for (const t of s.tools) {
      if (!toolByName.has(t.tool_name)) {
        throw new Error(`Tool ${t.tool_name} for skill ${s.skill_name} did not resolve.`);
      }
    }
  }

  // 2) Create the 3 system skills (idempotent by skill_name).
  const existingSkills = await get("/skills?select=id,skill_name,domain_module_id&limit=10000");
  const skillByName = new Map<string, Row>();
  for (const sk of existingSkills) skillByName.set(String(sk.skill_name), sk);

  const skillsToCreate: Row[] = [];
  for (const s of SKILLS) {
    if (!skillByName.has(s.skill_name)) {
      skillsToCreate.push({
        skill_name: s.skill_name,
        skill_type: "system",
        domain_id: 52,
        domain_module_id: s.domain_module_id,
        description: s.description,
        // record_status OMITTED (DB default 'new')
      });
    }
  }
  if (skillsToCreate.length) {
    const created = await insert("/skills", skillsToCreate);
    for (const sk of created) skillByName.set(String(sk.skill_name), sk);
    console.log(`Created ${created.length} skills: ${created.map(sk => `${sk.skill_name}(${sk.id})`).join(", ")}`);
  } else {
    console.log("No new skills needed (all present).");
  }

  // 3) Link skill_tools (idempotent by (skill_id, tool_id)).
  const skillIds = SKILLS.map(s => Number(skillByName.get(s.skill_name)!.id));
  const existingLinks = await get(
    `/skill_tools?skill_id=in.(${skillIds.join(",")})&select=skill_id,tool_id&limit=10000`,
  );
  const linkKey = (skillId: number, toolId: number) => `${skillId}|${toolId}`;
  const haveLinks = new Set(existingLinks.map(l => linkKey(Number(l.skill_id), Number(l.tool_id))));

  const linksToCreate: Row[] = [];
  for (const s of SKILLS) {
    const skillId = Number(skillByName.get(s.skill_name)!.id);
    for (const t of s.tools) {
      const toolId = Number(toolByName.get(t.tool_name)!.id);
      if (!haveLinks.has(linkKey(skillId, toolId))) {
        linksToCreate.push({
          skill_id: skillId,
          tool_id: toolId,
          requirement_level: t.requirement_level,
          // notes OMITTED (Rule #15); record_status OMITTED (default 'new')
        });
      }
    }
  }
  if (linksToCreate.length) {
    const created = await insert("/skill_tools", linksToCreate);
    console.log(`Created ${created.length} skill_tools rows.`);
  } else {
    console.log("No new skill_tools needed (all present).");
  }

  // ---- Verification summary ----
  console.log("\n=== Verification ===");
  for (const s of SKILLS) {
    const skillId = Number(skillByName.get(s.skill_name)!.id);
    const links = await get(
      `/skill_tools?skill_id=eq.${skillId}&select=requirement_level,tools(tool_name,coverage_tier)&order=id.asc`,
    );
    const reqd = links.filter((l: Row) => l.requirement_level === "required");
    const platformReqd = reqd.filter((l: Row) => (l.tools as Row).coverage_tier === "platform");
    const strict = `${platformReqd.length}/${reqd.length}`;
    console.log(
      `skill ${s.skill_name} (id ${skillId}, module ${s.domain_module_id}): ` +
        `${links.length} tools (${reqd.length} required) strict=${strict}`,
    );
    for (const l of links) {
      const tl = l.tools as Row;
      console.log(`    - ${tl.tool_name} [${l.requirement_level}, ${tl.coverage_tier}]`);
    }
  }
}

await main();
