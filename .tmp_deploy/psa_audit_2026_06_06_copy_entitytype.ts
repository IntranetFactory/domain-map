#!/usr/bin/env bun
// .tmp_deploy/psa_audit_2026_06_06_copy_entitytype.ts
//
// PSA state-driven audit 2026-06-06, EXECUTE items 1, 2, 3:
//   1. B1A-A4   : domain 68 catalog_tagline + catalog_description (empty -> buyer voice)
//   2. B1A-M8   : 4 PSA modules (86/87/88/89) catalog_tagline + catalog_description (empty)
//   3. B1A-ENTITY-TYPE : classify entity_type on the 6 PSA masters (currently unclassified)
//
// PATCH-empty-only on catalog copy (never overwrite a non-empty value). entity_type PATCH
// only where still 'unclassified'/null. Idempotent: reads live before every write.
// Buyer voice, no vendor names (Rule #18), no em-dash, American English.
import { pg } from "../scripts/lib/catalog";

// ---- item 1 + 2: catalog copy (buyer voice) ----
type CopySpec = { tagline: string; description: string };

const DOMAIN_COPY: CopySpec = {
  tagline: "Run client work profitably from sold engagement to recognized revenue.",
  description:
    "Plan and staff billable engagements, track every hour and expense against the right project, and turn delivered work into invoices and recognized revenue. You get one connected place to scope projects, match the right people to the work, watch utilization and margin in real time, and bill milestones or time and materials with confidence. Forecast demand against available capacity, flag at-risk projects before they slip, and keep finance, delivery, and resourcing working from the same numbers.",
};

const MODULE_COPY: Record<number, CopySpec> = {
  86: {
    tagline: "Scope, structure, and deliver client engagements on time.",
    description:
      "Stand up a new engagement from an approved opportunity or signed contract, break it into tasks and milestones, and drive it to completion. Track scope, schedule, and delivery status in one place, see when a project needs staffing, and close out the work cleanly when it is done. Keep delivery teams aligned on what is committed and what is at risk so nothing falls through the cracks.",
  },
  87: {
    tagline: "Match the right people to the right work, and keep them utilized.",
    description:
      "See who is available, what they are skilled in, and where demand is going, then commit and confirm assignments against it. Plan resource allocations ahead of need, fill staffing requests as projects ramp, and release people back to the bench when work wraps. Forecast utilization, surface skill gaps early, and keep your billable workforce productive without overbooking or idle time.",
  },
  88: {
    tagline: "Capture time and expenses against projects and get them approved fast.",
    description:
      "Let consultants log billable and non-billable time and submit expenses against the projects and tasks they are working, then route everything through the right approvals. Clean, approved time and cost flow straight into billing and project accounting, so invoices are accurate and margin is real. Cut the chase at period close and give delivery and finance trustworthy actuals.",
  },
  89: {
    tagline: "Bill accurately and recognize project revenue with confidence.",
    description:
      "Manage project budgets and rate cards, generate invoices against reached milestones and approved time, and recognize revenue using percentage-of-completion or milestone methods. Track billing status from planned to paid, flag slipped or written-off milestones, and keep recognized revenue tied to delivered work. Hand finance a clean, auditable bridge from project delivery to the general ledger.",
  },
};

async function patchEmptyCopy(
  table: string,
  id: number,
  label: string,
  copy: CopySpec,
): Promise<void> {
  const [row] = await pg(
    "GET",
    `/${table}?id=eq.${id}&select=catalog_tagline,catalog_description`,
  );
  if (!row) {
    console.log(`  ${label} (#${id}): NOT FOUND, skipped`);
    return;
  }
  const body: Record<string, string> = {};
  if (!row.catalog_tagline || String(row.catalog_tagline).trim() === "") {
    body.catalog_tagline = copy.tagline;
  }
  if (!row.catalog_description || String(row.catalog_description).trim() === "") {
    body.catalog_description = copy.description;
  }
  if (Object.keys(body).length === 0) {
    console.log(`  ${label} (#${id}): already populated, skipped (no overwrite)`);
    return;
  }
  await pg("PATCH", `/${table}?id=eq.${id}`, body);
  console.log(`  ${label} (#${id}): PATCHed [${Object.keys(body).join(", ")}]`);
}

console.log("== item 1: domain 68 catalog copy ==");
await patchEmptyCopy("domains", 68, "PSA domain", DOMAIN_COPY);

console.log("== item 2: 4 PSA modules catalog copy ==");
for (const [idStr, copy] of Object.entries(MODULE_COPY)) {
  await patchEmptyCopy("domain_modules", Number(idStr), "module", copy);
}

// ---- item 3: entity_type classification ----
// 5 stateful operational masters -> operational_workflow; resource_skill_inventories
// (config-shape, no lifecycle, skills taxonomy referenced by assignments) -> catalog.
const ENTITY_TYPE: Record<number, string> = {
  216: "operational_workflow", // service_projects
  217: "operational_workflow", // project_tasks
  218: "operational_workflow", // project_assignments
  219: "operational_workflow", // project_billing_milestones
  726: "operational_workflow", // project_resource_allocations
  725: "catalog", // resource_skill_inventories (skills taxonomy / config-shape)
};

console.log("== item 3: entity_type classification ==");
for (const [idStr, et] of Object.entries(ENTITY_TYPE)) {
  const id = Number(idStr);
  const [row] = await pg(
    "GET",
    `/data_objects?id=eq.${id}&select=data_object_name,entity_type`,
  );
  if (!row) {
    console.log(`  data_object #${id}: NOT FOUND, skipped`);
    continue;
  }
  if (row.entity_type && row.entity_type !== "unclassified") {
    console.log(
      `  ${row.data_object_name} (#${id}): already '${row.entity_type}', skipped (no overwrite)`,
    );
    continue;
  }
  await pg("PATCH", `/data_objects?id=eq.${id}`, { entity_type: et });
  console.log(`  ${row.data_object_name} (#${id}): entity_type -> ${et}`);
}

console.log("\ndone.");
console.log("UI: https://tests.semantius.app/domain_map/domains");
console.log("UI: https://tests.semantius.app/domain_map/domain_modules");
console.log("UI: https://tests.semantius.app/domain_map/data_objects");
