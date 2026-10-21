#!/usr/bin/env bun
// REMOTE-ACCESS (domain 132) b1a execution, 2026-06-06.
// Executes: B1A-SYSTEM-SKILLS (Phase S per-module skills + skill_tools, retire legacy skill 100),
//           B1A-CATALOG-UX (write buyer-voice copy into EMPTY catalog fields, empty-guard per field),
//           B1A-B10b (backfill module FKs on handoffs).
// Skips: B1A-B6 (cardinality user pick), B1A-B11 (alias tuple user approval), B1A-B9-EVENT-CATEGORY (already correct live).
//
// Idempotent. semantius CLI only, JSON via stdin (Windows cmdline limit).

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
const post = (path: string, body: Row[]) => call({ method: "POST", path, body });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });
const del = (path: string) => call({ method: "DELETE", path });

const assertNoEmDash = (s: string, where: string) => {
  if (s.includes("—")) throw new Error(`em-dash in ${where}: ${s}`);
};

async function main() {
  // ================================================================
  // B1A-SYSTEM-SKILLS — author 2 per-module system skills + skill_tools
  // ================================================================
  // Tool ids (pre-verified live; reused, NOT created):
  //   query_remote_sessions = 672, query_session_recordings = 673,
  //   query_rmm_agents = 680, query_incidents = 16 (service_incidents 47),
  //   notify_person = 913.
  const skillSpecs = [
    {
      skill_name: "remote_access_session_agent",
      domain_module_id: 294,
      domain_id: 132,
      description:
        "System skill for the Remote Session Control module. Runs live remote-control session workflows over the remote_sessions master, reading RMM agent liveness and the linked service incident, and notifies the relevant person on session events.",
      tools: [
        { tool_id: 672, requirement_level: "required" }, // query_remote_sessions
        { tool_id: 680, requirement_level: "required" }, // query_rmm_agents
        { tool_id: 16, requirement_level: "optional" }, // query_incidents (service_incidents read)
        { tool_id: 913, requirement_level: "optional" }, // notify_person
      ],
    },
    {
      skill_name: "remote_access_recording_audit_agent",
      domain_module_id: 295,
      domain_id: 132,
      description:
        "System skill for the Session Recording and Audit module. Runs recording and audit workflows over the session_recordings master, and notifies the relevant person on recording and retention events.",
      tools: [
        { tool_id: 673, requirement_level: "required" }, // query_session_recordings
        { tool_id: 913, requirement_level: "optional" }, // notify_person
      ],
    },
  ];

  for (const spec of skillSpecs) {
    assertNoEmDash(spec.description, `skill ${spec.skill_name}`);
    // Idempotent: skip if a system skill already exists on this module.
    const existing = await get(
      `/skills?skill_type=eq.system&domain_module_id=eq.${spec.domain_module_id}&select=id,skill_name`,
    );
    let skillId: number;
    if (existing.length > 0) {
      skillId = Number(existing[0].id);
      console.log(`skill exists for module ${spec.domain_module_id}: id=${skillId} (${existing[0].skill_name})`);
    } else {
      const inserted = await post("/skills", [
        {
          skill_name: spec.skill_name,
          skill_type: "system",
          domain_id: spec.domain_id,
          domain_module_id: spec.domain_module_id,
          description: spec.description,
          // record_status omitted -> DB default "new"
        },
      ]);
      skillId = Number(inserted[0].id);
      console.log(`INSERTED skill id=${skillId} (${spec.skill_name}) on module ${spec.domain_module_id}`);
    }
    // skill_tools, dedup by (skill_id, tool_id)
    const haveTools = await get(`/skill_tools?skill_id=eq.${skillId}&select=tool_id`);
    const haveSet = new Set(haveTools.map(r => Number(r.tool_id)));
    const toAdd = spec.tools
      .filter(t => !haveSet.has(t.tool_id))
      .map(t => ({ skill_id: skillId, tool_id: t.tool_id, requirement_level: t.requirement_level }));
    if (toAdd.length > 0) {
      const st = await post("/skill_tools", toAdd);
      console.log(`  INSERTED ${st.length} skill_tools: ${st.map(r => r.id).join(",")}`);
    } else {
      console.log(`  skill_tools all present for skill ${skillId}`);
    }
  }

  // Retire legacy domain-level skill 100 (+ its skill_tools 791-794) ONLY after both per-module skills exist.
  const m294skill = await get(`/skills?skill_type=eq.system&domain_module_id=eq.294&select=id`);
  const m295skill = await get(`/skills?skill_type=eq.system&domain_module_id=eq.295&select=id`);
  if (m294skill.length === 1 && m295skill.length === 1) {
    const legacy = await get(`/skills?id=eq.100&select=id`);
    if (legacy.length > 0) {
      const legacyTools = await get(`/skill_tools?skill_id=eq.100&select=id,tool_id`);
      console.log(`DELETING legacy skill_tools for skill 100: ${legacyTools.map(r => r.id).join(",")}`);
      await del(`/skill_tools?skill_id=eq.100`);
      await del(`/skills?id=eq.100`);
      console.log("DELETED legacy skill 100");
    } else {
      console.log("legacy skill 100 already deleted");
    }
  } else {
    console.log("NOT deleting skill 100: both per-module skills not confirmed");
  }

  // ================================================================
  // B1A-CATALOG-UX — write buyer-voice copy into EMPTY fields only
  // ================================================================
  const uxTargets: { path: string; label: string; fields: Record<string, string> }[] = [
    {
      path: "/domains?id=eq.132",
      label: "domain 132 REMOTE-ACCESS",
      fields: {
        catalog_tagline:
          "Take control of any workstation or server, with the privilege, recording, and file-transfer controls your auditors expect.",
        catalog_description:
          "Connect to attended and unattended endpoints and operate them as if you were sitting in front of them. Start a session with end-user consent or reach an always-on device, traverse firewalls and NAT without opening inbound ports, transfer files both ways, and elevate to administrator rights only when the work demands it.\n\nEvery session is recorded and audited, so you can prove who did what, on which machine, and when. Retain that evidence for as long as your policy or regulator requires, and hand the right details to your service desk, billing, or compliance team automatically when the session ends.",
      },
    },
    {
      path: "/domain_modules?id=eq.294",
      label: "module 294 REMOTE-ACCESS-SESSION",
      fields: {
        catalog_tagline:
          "Run live attended and unattended remote-control sessions on any endpoint, with file transfer and just-in-time privilege elevation built in.",
        catalog_description:
          "Establish a remote-control session to a workstation or server, whether a technician is invited in by the end user or you reach an unattended device on your own schedule. Work across firewalls and NAT without opening inbound ports, move files in both directions, share the clipboard, and step up to administrator rights only for the task at hand.\n\nSee live device health while you work, link the session to the open service ticket, and close it cleanly so downstream teams pick up exactly where you left off.",
      },
    },
    {
      path: "/domain_modules?id=eq.295",
      label: "module 295 REMOTE-ACCESS-RECORDING-AUDIT",
      fields: {
        catalog_tagline:
          "Capture, store, and retain a tamper-evident record of every remote session, ready for any audit.",
        catalog_description:
          "Record full-session video alongside a keystroke and command audit trail for every remote-control session, then keep it safe and unaltered for as long as your retention policy or regulator requires.\n\nFind the recording behind any session in seconds, control who can view it, redact sensitive content where needed, and release the evidence to your compliance and governance teams when they need proof of exactly what happened.",
      },
    },
  ];

  for (const t of uxTargets) {
    const idPart = t.path.split("?")[0];
    const filter = t.path.split("?")[1];
    const current = await get(`/${idPart.replace(/^\//, "")}?${filter}&select=catalog_tagline,catalog_description`);
    const cur = current[0] ?? {};
    const writeBody: Row = {};
    for (const [field, value] of Object.entries(t.fields)) {
      assertNoEmDash(value, `${t.label}.${field}`);
      const existingVal = String(cur[field] ?? "").trim();
      if (existingVal === "") {
        writeBody[field] = value;
      } else {
        console.log(`  SKIP ${t.label}.${field}: already non-empty (empty-guard)`);
      }
    }
    if (Object.keys(writeBody).length > 0) {
      await patch(t.path, writeBody);
      console.log(`PATCHED ${t.label} catalog fields: ${Object.keys(writeBody).join(", ")}`);
    } else {
      console.log(`  ${t.label}: nothing to write (all non-empty)`);
    }
  }

  // ================================================================
  // B1A-B10b — backfill module FKs on handoffs (prior values snapshotted in history.md)
  // ================================================================
  const b10b: { path: string; body: Row; label: string }[] = [
    { path: "/handoffs?id=eq.162", body: { source_domain_module_id: 294 }, label: "162 source->294" },
    { path: "/handoffs?id=eq.163", body: { source_domain_module_id: 294 }, label: "163 source->294" },
    { path: "/handoffs?id=eq.646", body: { source_domain_module_id: 294 }, label: "646 source->294" },
    { path: "/handoffs?id=eq.647", body: { source_domain_module_id: 294 }, label: "647 source->294" },
    { path: "/handoffs?id=eq.648", body: { source_domain_module_id: 294 }, label: "648 source->294" },
    { path: "/handoffs?id=eq.164", body: { source_domain_module_id: 295 }, label: "164 source->295" },
    { path: "/handoffs?id=eq.160", body: { target_domain_module_id: 294 }, label: "160 target->294" },
  ];
  for (const p of b10b) {
    await patch(p.path, p.body);
    console.log(`PATCHED handoff ${p.label}`);
  }

  // ================================================================
  // Verification re-queries
  // ================================================================
  console.log("\n=== VERIFY ===");
  const skillsAfter = await get(
    "/skills?domain_module_id=in.(294,295)&select=id,skill_name,skill_type,domain_module_id,domain_id&order=domain_module_id",
  );
  console.log("per-module system skills:", JSON.stringify(skillsAfter));
  for (const s of skillsAfter) {
    const st = await get(`/skill_tools?skill_id=eq.${s.id}&select=tool_id,requirement_level,tools(tool_name,coverage_tier)`);
    console.log(`  skill ${s.id} (${s.skill_name}) tools:`, JSON.stringify(st));
  }
  const legacyAfter = await get("/skills?id=eq.100&select=id");
  console.log("legacy skill 100 remaining:", legacyAfter.length);
  const legacyToolsAfter = await get("/skill_tools?skill_id=eq.100&select=id");
  console.log("legacy skill_tools 791-794 remaining:", legacyToolsAfter.length);

  const ux = await get(
    "/domains?id=eq.132&select=catalog_tagline,catalog_description",
  );
  console.log("domain 132 tagline len:", String(ux[0].catalog_tagline ?? "").length, "desc len:", String(ux[0].catalog_description ?? "").length);
  const uxm = await get(
    "/domain_modules?id=in.(294,295)&select=id,catalog_tagline,catalog_description&order=id",
  );
  for (const m of uxm) {
    console.log(`module ${m.id} tagline len:`, String(m.catalog_tagline ?? "").length, "desc len:", String(m.catalog_description ?? "").length);
  }

  const ho = await get(
    "/handoffs?id=in.(160,162,163,164,646,647,648)&select=id,source_domain_module_id,target_domain_module_id&order=id",
  );
  console.log("handoffs after B10b:", JSON.stringify(ho));
}

await main();
console.log("\nDONE");
