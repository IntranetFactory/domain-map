#!/usr/bin/env bun
// State-driven ONBOARDING audit execute pass (2026-06-07).
// Three EXECUTE items from audits/ONBOARDING/state.yaml:
//   1. B1A-ENTITY-TYPE: PATCH 8 masters entity_type unclassified -> operational_workflow (Rule #12).
//   2. B2-CATALOG-UX-FIELDS (Rule #20): author + write buyer-voice catalog_tagline/description
//      on the domain row (99) and the 3 modules (35/36/37) where currently empty.
//   3. B1A-APQC-COVERAGE (H1): INSERT 1 clean handoff_processes row for handoff 1233
//      (ONBOARDING cohort.activated -> LMS) -> PCF 1039 "Develop, conduct, and manage
//      employee training programs" (external_id 10493, L4). agent_curated, role implements.
//
// Idempotent: reads live before each write, only writes the unclassified / empty / missing.
// Never overwrites a non-empty catalog value. record_status omitted on new rows (Rule #1).

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
const post = (path: string, body: Row[]) => call({ method: "POST", path, body });

// ------------------------------------------------------------------
// 1. entity_type classification (B1A-ENTITY-TYPE)
// ------------------------------------------------------------------
// Every master carries a multi-state lifecycle with active transition states,
// so each is operational_workflow per Rule #12.
const MASTER_IDS = [15, 16, 17, 18, 19, 20, 21, 22];

async function classifyEntityTypes() {
  console.log("\n=== 1. entity_type classification ===");
  const live = await get(
    `/data_objects?id=in.(${MASTER_IDS.join(",")})&select=id,data_object_name,entity_type`,
  );
  const toFix = live.filter(
    r => r.entity_type === "unclassified" || r.entity_type === null,
  );
  if (toFix.length === 0) {
    console.log("  all 8 masters already classified; nothing to do");
    return 0;
  }
  for (const r of toFix) {
    await patch(`/data_objects?id=eq.${r.id}`, { entity_type: "operational_workflow" });
    console.log(`  PATCH data_objects ${r.id} (${r.data_object_name}) -> operational_workflow`);
  }
  return toFix.length;
}

// ------------------------------------------------------------------
// 2. Catalog UX copy (B2-CATALOG-UX-FIELDS, Rule #20)
// ------------------------------------------------------------------
// Buyer-voice copy: workflow + value, no vendor/product names, no em-dash, American English.

const DOMAIN_COPY: { tagline: string; description: string } = {
  tagline: "Turn an accepted offer into a productive, welcomed employee by day one.",
  description:
    "Employee onboarding orchestrates everything that has to happen between a signed offer and a new hire who is set up, compliant, and engaged. It instantiates a structured journey the moment a candidate is hired or an employee record is created, then drives the pre-boarding, day-one, and 30/60/90 milestones from a single plan. " +
    "Task lists are generated conditionally by role, location, and employment type, and the right work is routed automatically to IT for provisioning, to facilities for workspace setup, to payroll for activation, to learning for compliance training, and to identity for access. " +
    "Document intake captures and validates new-hire paperwork, while welcome experiences and buddy pairings make the first weeks feel intentional. The result is a faster time to productivity, fewer dropped handoffs across departments, and an auditable record that every compliance step was completed on time.",
};

const MODULE_COPY: Record<number, { tagline: string; description: string }> = {
  35: {
    tagline: "Design onboarding journeys once and run them for every new hire automatically.",
    description:
      "The orchestration core of onboarding. Build reusable plan templates, then spin up a journey instance for each new hire that sequences stages, tasks, and cohort programs from pre-boarding through the 30/60/90 milestones. " +
      "Tasks are generated conditionally by role, location, and employment type and routed to the teams that own them, so IT provisioning, workspace setup, access requests, and training enrollments all kick off from one journey without manual chasing. " +
      "Coordinators and program managers track progress in real time, catch stalled steps before day one, and prove that every new hire was ready to work on schedule.",
  },
  36: {
    tagline: "Collect, validate, and route every new-hire document without the paper chase.",
    description:
      "A focused workspace for new-hire paperwork. Gather and verify the documents a hire must complete, including eligibility, tax, agreements, and direct-deposit forms, with a clear submission, review, and approval flow that locks records once they are filed. " +
      "Approved collections hand off automatically to the systems that depend on them so worker records and payroll activate without re-keying. " +
      "Built-in status tracking and an auditable trail keep compliance teams confident that every required form was collected, reviewed, and retained correctly.",
  },
  37: {
    tagline: "Make every new hire feel expected, connected, and supported from day one.",
    description:
      "The human side of onboarding. Schedule pre-boarding and day-one welcome communications, pair each new hire with a buddy or mentor, and coordinate the introductions that turn a start date into a sense of belonging. " +
      "Welcome cadences are timed to the journey and routed through the channel each workplace prefers, while buddy assignments are tracked from pairing through completion. " +
      "Stronger first impressions lift early engagement, speed up ramp time, and improve new-hire retention through the critical first weeks.",
  },
};

async function authorCatalogCopy() {
  console.log("\n=== 2. Catalog UX copy ===");
  let domainWrites = 0;
  let moduleWrites = 0;

  // Domain row 99
  const [dom] = await get(
    "/domains?id=eq.99&select=id,catalog_tagline,catalog_description",
  );
  const domTag = (dom?.catalog_tagline ?? "") as string;
  const domDesc = (dom?.catalog_description ?? "") as string;
  const domBody: Row = {};
  if (domTag.trim() === "") domBody.catalog_tagline = DOMAIN_COPY.tagline;
  if (domDesc.trim() === "") domBody.catalog_description = DOMAIN_COPY.description;
  if (Object.keys(domBody).length > 0) {
    await patch("/domains?id=eq.99", domBody);
    console.log(`  PATCH domain 99 catalog (${Object.keys(domBody).join(", ")})`);
    domainWrites = 1;
  } else {
    console.log("  domain 99 catalog already populated; skipped");
  }

  // Modules 35/36/37
  const mods = await get(
    "/domain_modules?id=in.(35,36,37)&select=id,domain_module_code,catalog_tagline,catalog_description",
  );
  for (const m of mods) {
    const copy = MODULE_COPY[Number(m.id)];
    if (!copy) continue;
    const tag = (m.catalog_tagline ?? "") as string;
    const desc = (m.catalog_description ?? "") as string;
    const body: Row = {};
    if (tag.trim() === "") body.catalog_tagline = copy.tagline;
    if (desc.trim() === "") body.catalog_description = copy.description;
    if (Object.keys(body).length > 0) {
      await patch(`/domain_modules?id=eq.${m.id}`, body);
      console.log(
        `  PATCH module ${m.id} (${m.domain_module_code}) catalog (${Object.keys(body).join(", ")})`,
      );
      moduleWrites += 1;
    } else {
      console.log(`  module ${m.id} (${m.domain_module_code}) catalog already populated; skipped`);
    }
  }
  return { domainWrites, moduleWrites };
}

// ------------------------------------------------------------------
// 3. APQC tag for handoff 1233 (B1A-APQC-COVERAGE, clean PCF match)
// ------------------------------------------------------------------
async function tagHandoff1233() {
  console.log("\n=== 3. APQC handoff_processes (handoff 1233) ===");
  // Resolve PCF id live (idempotent, never hardcode unseen).
  const pcf = await get(
    "/processes?source_framework=eq.apqc_pcf_cross_industry&external_id=eq.10493&select=id,process_name,external_id",
  );
  if (pcf.length !== 1) {
    throw new Error(
      `Expected exactly 1 PCF row for external_id 10493, got ${pcf.length}`,
    );
  }
  const processId = Number(pcf[0].id);
  console.log(`  resolved PCF: ${processId} "${pcf[0].process_name}" (${pcf[0].external_id})`);

  const existing = await get(
    `/handoff_processes?handoff_id=eq.1233&process_id=eq.${processId}&select=id`,
  );
  if (existing.length > 0) {
    console.log(`  handoff_processes (1233 -> ${processId}) already present; skipped`);
    return 0;
  }
  await post("/handoff_processes", [
    {
      handoff_id: 1233,
      process_id: processId,
      proposal_source: "agent_curated",
      role: "implements",
    },
  ]);
  console.log(`  INSERT handoff_processes (handoff 1233 -> process ${processId})`);
  return 1;
}

// ------------------------------------------------------------------
async function main() {
  const entityCount = await classifyEntityTypes();
  const { domainWrites, moduleWrites } = await authorCatalogCopy();
  const apqcCount = await tagHandoff1233();

  console.log("\n=== SUMMARY ===");
  console.log(`  entity_type PATCHed:        ${entityCount} data_objects`);
  console.log(`  domain catalog PATCHed:     ${domainWrites} row`);
  console.log(`  module catalog PATCHed:     ${moduleWrites} rows`);
  console.log(`  handoff_processes INSERTed: ${apqcCount} row`);
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects");
  console.log("  https://tests.semantius.app/domain_map/domains");
  console.log("  https://tests.semantius.app/domain_map/domain_modules");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
