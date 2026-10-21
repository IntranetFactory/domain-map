#!/usr/bin/env bun
// FLEET-MAINT b1a execution (domain id 149).
//
// Executes the agent-solvable portion of:
//   B1A-SYSTEM-SKILLS   (Phase S / Rule #17): author 3 module-scoped system skills
//                        and link the existing query_* tools + notify_person.
//                        NOTE: sign_document (skill_tools row 547) and the final
//                        DELETE of legacy skill 59 are BLOCKED on user_decision B2-6
//                        and are NOT touched here.
//   B1A-CATALOG-UX-COPY (Rule #20): write buyer-voice catalog_tagline /
//                        catalog_description into the EMPTY fields on the domain row
//                        and the 3 modules (empty-guard per field; never overwrite).
//
// Idempotent: dedups skills by skill_name, skill_tools by (skill_id, tool_id),
// and only writes a catalog field when its current value is empty.

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

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  return call({ method: "POST", path, body: rows });
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

const DOMAIN_ID = 149;

// ============================================================
// B1A-SYSTEM-SKILLS: author 3 module-scoped system skills
// ============================================================

// One system skill per module (Rule #17). description is analyst voice (not a notes field).
const skillSpecs = [
  {
    domain_module_id: 249,
    skill_name: "fleet_maint_work_order_agent",
    description:
      "System skill for the vehicle work order module. Opens work orders from inspection defects, telematics faults, and driver reports, composes labor and parts task lines, assigns mechanics and shops, triages maintenance defects, and drives each repair through completion sign-off.",
  },
  {
    domain_module_id: 250,
    skill_name: "fleet_maint_pm_agent",
    description:
      "System skill for the preventive maintenance scheduling module. Defines and queries PM schedules per vehicle class, evaluates mileage, engine-hour, calendar, and fault-code triggers, and generates work orders ahead of due dates while tracking deferred maintenance.",
  },
  {
    domain_module_id: 251,
    skill_name: "fleet_maint_parts_agent",
    description:
      "System skill for the parts inventory and warranty module. Queries parts stock and reorder thresholds, records parts consumption against work orders, identifies OEM-warranty-eligible repairs per vehicle, and tracks recall coverage and completion across the fleet.",
  },
];

// Tool linkage per module skill.
//   query_* tools already exist catalog-wide (reused, not re-created):
//     470 query_vehicle_work_orders, 471 query_preventive_maintenance_schedules,
//     807 query_vehicle_parts_inventory, 808 query_maintenance_defects
//   913 notify_person substitutes the legacy send_email (B1B-S14): generic operational
//     notification (PM-due reminders, defect alerts, work-order-completion, parts-low).
const toolLinksByModule: Record<number, { tool_id: number; requirement_level: string }[]> = {
  249: [
    { tool_id: 470, requirement_level: "required" }, // query_vehicle_work_orders
    { tool_id: 808, requirement_level: "required" }, // query_maintenance_defects
    { tool_id: 913, requirement_level: "optional" }, // notify_person (defect alerts, completion)
  ],
  250: [
    { tool_id: 471, requirement_level: "required" }, // query_preventive_maintenance_schedules
    { tool_id: 913, requirement_level: "optional" }, // notify_person (PM-due reminders)
  ],
  251: [
    { tool_id: 807, requirement_level: "required" }, // query_vehicle_parts_inventory
    { tool_id: 913, requirement_level: "optional" }, // notify_person (parts-low alerts)
  ],
};

console.log("=== B1A-SYSTEM-SKILLS ===");

// 1) author skills (dedup by skill_name)
const existingSkills = await get(
  `/skills?domain_module_id=in.(249,250,251)&skill_type=eq.system&select=id,skill_name,domain_module_id`,
);
const existingByName = new Map(existingSkills.map(s => [String(s.skill_name), Number(s.id)]));

const skillsToInsert = skillSpecs
  .filter(s => !existingByName.has(s.skill_name))
  .map(s => ({
    skill_name: s.skill_name,
    skill_type: "system",
    domain_id: DOMAIN_ID,
    domain_module_id: s.domain_module_id,
    description: s.description,
    // record_status omitted -> DB default "new" (Rule #1)
  }));

if (skillsToInsert.length > 0) {
  const inserted = await insert("/skills", skillsToInsert);
  for (const s of inserted) {
    existingByName.set(String(s.skill_name), Number(s.id));
    console.log(`  + skills #${s.id} ${s.skill_name} (module ${s.domain_module_id})`);
  }
} else {
  console.log("  skills: all 3 already present");
}

// module_id -> skill_id
const skillIdByModule = new Map<number, number>();
for (const s of skillSpecs) {
  const id = existingByName.get(s.skill_name);
  if (id === undefined) throw new Error(`skill ${s.skill_name} missing after insert`);
  skillIdByModule.set(s.domain_module_id, id);
}

// 2) author skill_tools (dedup by (skill_id, tool_id))
const skillIds = [...skillIdByModule.values()];
const existingLinks = await get(
  `/skill_tools?skill_id=in.(${skillIds.join(",")})&select=id,skill_id,tool_id`,
);
const linkKey = (skill_id: number, tool_id: number) => `${skill_id}|${tool_id}`;
const existingLinkKeys = new Set(
  existingLinks.map(l => linkKey(Number(l.skill_id), Number(l.tool_id))),
);

const linksToInsert: Row[] = [];
for (const [moduleId, links] of Object.entries(toolLinksByModule)) {
  const skillId = skillIdByModule.get(Number(moduleId))!;
  for (const l of links) {
    if (existingLinkKeys.has(linkKey(skillId, l.tool_id))) continue;
    linksToInsert.push({
      skill_id: skillId,
      tool_id: l.tool_id,
      requirement_level: l.requirement_level,
      // notes omitted -> empty (Rule #15); record_status omitted -> "new" (Rule #1)
    });
  }
}

if (linksToInsert.length > 0) {
  const inserted = await insert("/skill_tools", linksToInsert);
  for (const l of inserted) {
    console.log(`  + skill_tools #${l.id} skill ${l.skill_id} -> tool ${l.tool_id} (${l.requirement_level})`);
  }
} else {
  console.log("  skill_tools: all links already present");
}

console.log(
  "  NOTE: sign_document (row 547) + legacy skill 59 DELETE deferred (blocked on user_decision B2-6).",
);

// ============================================================
// B1A-CATALOG-UX-COPY: buyer-voice copy into EMPTY fields only (Rule #20)
// ============================================================

console.log("\n=== B1A-CATALOG-UX-COPY ===");

type UxCopy = {
  label: string;
  path: string; // PostgREST PATCH path targeting the single row
  catalog_tagline: string;
  catalog_description: string;
};

const domainCopy: UxCopy = {
  label: "domains#149 FLEET-MAINT",
  path: `/domains?id=eq.${DOMAIN_ID}`,
  catalog_tagline:
    "Keep every vehicle on the road and control what each mile costs to maintain.",
  catalog_description:
    "Run your whole maintenance operation from one place. Schedule preventive service so it lands before a breakdown does, turn driver reports and inspection findings into tracked repairs, and dispatch the right mechanic to the right shop. Keep parts on the shelf when you need them and off the books when you don't, and recover every dollar of warranty and recall coverage you are owed. See cost per mile and uptime by vehicle so you know when to keep fixing and when to replace.",
};

const moduleCopy: UxCopy[] = [
  {
    label: "domain_modules#249 FLEET-MAINT-WORK-ORDER",
    path: `/domain_modules?id=eq.249`,
    catalog_tagline:
      "Turn every defect, fault, and driver report into a tracked repair from intake to sign-off.",
    catalog_description:
      "Open a work order the moment a problem shows up, whether it comes from a failed inspection, a telematics fault, or a driver's note. Build the job with labor and parts lines, assign it to the right mechanic and shop, and decide what stays in-house and what goes out. Triage incoming defects by severity, keep each repair moving through its stages, and close it out with a completion sign-off and a quality check so the vehicle goes back into service ready to run.",
  },
  {
    label: "domain_modules#250 FLEET-MAINT-PM",
    path: `/domain_modules?id=eq.250`,
    catalog_tagline:
      "Service every vehicle on time by mileage, hours, or calendar, and let the work orders write themselves.",
    catalog_description:
      "Set up a preventive maintenance plan for each vehicle class and let the right triggers fire it, whether that is miles driven, engine hours, time elapsed, or a fault code from the road. Work orders generate automatically ahead of each due date so nothing slips, and anything you choose to put off is tracked as deferred maintenance instead of being forgotten. Stay ahead of wear instead of reacting to breakdowns.",
  },
  {
    label: "domain_modules#251 FLEET-MAINT-PARTS",
    path: `/domain_modules?id=eq.251`,
    catalog_tagline:
      "Keep the right parts on hand and claim every warranty and recall dollar you are owed.",
    catalog_description:
      "Track parts stock and reorder points by location so a job never stalls waiting on a part, and tie every part used back to the work order that consumed it. Know which repairs are covered by an OEM warranty before you pay for them, and flag eligible claims as the work happens. Pull in recall notices and match them to your VINs, then track each recall through to completion across the whole fleet.",
  },
];

async function applyUxCopy(c: UxCopy) {
  const select = "select=id,catalog_tagline,catalog_description";
  const sep = c.path.includes("?") ? "&" : "?";
  const cur = (await get(`${c.path}${sep}${select}`))[0];
  if (!cur) {
    console.log(`  ! ${c.label}: row not found, skipping`);
    return;
  }
  const body: Row = {};
  if (String(cur.catalog_tagline ?? "") === "") body.catalog_tagline = c.catalog_tagline;
  else console.log(`  = ${c.label}: catalog_tagline already set, NOT overwriting`);
  if (String(cur.catalog_description ?? "") === "") body.catalog_description = c.catalog_description;
  else console.log(`  = ${c.label}: catalog_description already set, NOT overwriting`);

  if (Object.keys(body).length === 0) {
    console.log(`  ${c.label}: nothing to write`);
    return;
  }
  await patch(c.path, body);
  console.log(`  + ${c.label}: wrote ${Object.keys(body).join(", ")}`);
}

await applyUxCopy(domainCopy);
for (const m of moduleCopy) await applyUxCopy(m);

console.log("\nDone.");
