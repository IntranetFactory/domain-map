/**
 * BEN-ADMIN b1 continuation, technical-only fixes (2026-05-31).
 *
 * Scope (truly mechanical, no judgment required):
 *
 *   B1-S1: PATCH British spelling to American on
 *     - domains.id=61.description ("enrolment" -> "enrollment")
 *     - capabilities.id=40.capability_name ("Enrolment" -> "Enrollment")
 *
 *   B1-S2: PATCH event_category on 10 trigger_events rows (413-422) per the
 *     audit's pre-specified enum mapping (lifecycle / state_change / threshold).
 *
 *   B1-S3: DELETE the SCOPE-CREEP DMDO row (72, 3, consumer, required) for
 *     candidates on BEN-ENROLLMENT, plus the skill_tool row linking skill 178
 *     to tool 14 (query_candidates). The audit names both rows by ID
 *     (DMDO id=518, skill_tool id=1638).
 *
 *   B1-S5: INSERT outbound user-edges on data_object_relationships per Rule
 *     #10. The audit pre-specifies one verb per actor role per master across
 *     7 masters (benefit_plans, benefit_open_enrollments, benefit_enrollments,
 *     life_events, benefit_dependents, benefit_carriers, carrier_feeds).
 *     All shape (many_to_many, reference, owner_side=source) mirrors the
 *     existing outbound user-edge pattern in the catalog.
 *
 *   B1-S8: APQC tagging on handoff_processes. Apply only the audit rows
 *     where the proposed PCF external_id resolves to a live processes row
 *     whose process_name matches the audit's intent. FLIP existing
 *     discovery_* rows to agent_curated when the live process_id already
 *     matches; REPLACE process_id when the audit pre-specifies a different
 *     resolvable PCF node; INSERT new rows for cross-domain handoffs that
 *     have no existing handoff_processes row.
 *
 *     Holdbacks (deferred):
 *       - 418, 367, 420, 1119: audit cites unresolvable placeholders
 *         ("APQC L3 child of 10510", "APQC L3 child of 10517",
 *         "APQC L4 under 10520"). 420 and 1119 already carry agent_curated
 *         rows pointing at process_id 1051 (10504 Deliver employee benefits
 *         program); leave alone.
 *       - 413: audit cites external_id 10510 with process_name "Develop and
 *         manage compensation, rewards, and benefits", but live 10510
 *         resolves to "Review engagement and retention indicators". The
 *         external_id resolves but the intent does not. Defer to user.
 *
 *     record_status stays at "new" on every INSERT (Rule #1).
 *
 * Deferred to user judgment (NOT applied here):
 *   - B1-S4: SCOPE-CREEP on hr_cases (72, 192) - gated on B2-S1.
 *   - B1-S6: report-only (ERP-FIN owes module-layer master on legal_entities).
 *   - B1-S7: report-only (PAYROLL / ERP-FIN / HCM owe target_module_id
 *     backfills on inbound handoffs; B10b asymmetry rule means it is not
 *     BEN-ADMIN's fix).
 *   - B1-S9: workflow-gate role bundling - gated on B2-S5.
 *   - B1-S10: new aca_filings / affordability_snapshots masters - gated on
 *     B2-S4 (new entities, deferred per task scope).
 *   - B1-S11: HR / Payroll / Finance business_function_domains - per task
 *     scope, new business_function_domains contributors/consumers are
 *     DEFER items.
 *
 * Run from project root (c:/dev/domain-map):
 *   bun run .tmp_deploy/fix_ben_admin_b1_technical_2026_05_31.ts            # dry-run
 *   bun run .tmp_deploy/fix_ben_admin_b1_technical_2026_05_31.ts --apply    # apply
 */

const APPLY = process.argv.includes("--apply");

async function pg(method: string, path: string, body?: any): Promise<any> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(
      `${method} ${path} (${code}): ${(stderr || stdout).slice(0, 800)}`,
    );
  }
  return stdout.trim() ? JSON.parse(stdout) : null;
}

// ----- B1-S1: British spelling -----
const DOMAIN_DESC_NEW =
  "Open enrollment, life-event handling, carrier connectivity, ACA compliance, and benefits decision support.";
const CAPABILITY_NAME_NEW = "Annual Benefits Enrollment";

// ----- B1-S2: trigger_events.event_category -----
const TRIGGER_EVENT_PATCHES: Array<{ id: number; event_category: string }> = [
  { id: 413, event_category: "state_change" }, // benefit_plan.published
  { id: 414, event_category: "state_change" }, // benefit_plan.deprecated
  { id: 415, event_category: "lifecycle" },    // benefit_dependent.added
  { id: 416, event_category: "threshold" },    // benefit_dependent.aged_out
  { id: 417, event_category: "lifecycle" },    // life_event.reported
  { id: 418, event_category: "state_change" }, // life_event.approved
  { id: 419, event_category: "state_change" }, // benefit_open_enrollment.opened
  { id: 420, event_category: "state_change" }, // benefit_open_enrollment.closed
  { id: 421, event_category: "state_change" }, // carrier_feed.transmitted
  { id: 422, event_category: "state_change" }, // carrier_feed.reconciled
];

// ----- B1-S3: SCOPE-CREEP DELETE on candidates consumer -----
const DELETE_DMDO_ID = 518;     // (72, 3, consumer, required)
const DELETE_SKILL_TOOL_ID = 1638; // skill 178 -> tool 14 (query_candidates)

// ----- B1-S5: outbound user-edges from BEN-ADMIN masters to users (748) -----
//
// Shape mirrors the existing catalog pattern for master->users edges:
//   relationship_type=many_to_many, relationship_kind=reference,
//   owner_side=source (the master row owns the FK column),
//   verb = "<actor> by" (space separated), inverse = "<actor>"
//
// Verbs are taken directly from B1-S5's per-master parenthetical list.
const USERS_DO_ID = 748;
const USER_EDGES: Array<{
  master_id: number;
  master_name: string;
  verbs: Array<{ verb: string; inverse: string }>;
}> = [
  {
    master_id: 146,
    master_name: "benefit_plans",
    verbs: [
      { verb: "created by", inverse: "creates" },
      { verb: "deactivated by", inverse: "deactivates" },
    ],
  },
  {
    master_id: 150,
    master_name: "benefit_open_enrollments",
    verbs: [
      { verb: "opened by", inverse: "opens" },
      { verb: "closed by", inverse: "closes" },
      { verb: "processed by", inverse: "processes" },
    ],
  },
  {
    master_id: 147,
    master_name: "benefit_enrollments",
    verbs: [
      { verb: "elected by", inverse: "elects" },
      { verb: "approved by", inverse: "approves" },
    ],
  },
  {
    master_id: 149,
    master_name: "life_events",
    verbs: [
      { verb: "submitted by", inverse: "submits" },
      { verb: "approved by", inverse: "approves" },
      { verb: "processed by", inverse: "processes" },
    ],
  },
  {
    master_id: 148,
    master_name: "benefit_dependents",
    verbs: [
      { verb: "declared by", inverse: "declares" },
      { verb: "verified by", inverse: "verifies" },
    ],
  },
  {
    master_id: 151,
    master_name: "benefit_carriers",
    verbs: [
      { verb: "managed by", inverse: "manages" },
      { verb: "suspended by", inverse: "suspends" },
    ],
  },
  {
    master_id: 152,
    master_name: "carrier_feeds",
    verbs: [
      { verb: "transmitted by", inverse: "transmits" },
      { verb: "owned by", inverse: "owns" },
    ],
  },
];

// ----- B1-S8: APQC tagging, only PCF-resolvable rows -----
//
// Per audit table, mapped to live process_ids that match the audit's intent:
//   external_id 10505 -> process_id 1052 ("Administer benefit enrollment")
//   external_id 20599 -> process_id   41 ("Manage employee onboarding,
//                                          training, and development")
//   external_id 10733 -> process_id   59 ("Process accounts payable and
//                                          expense reimbursements")
//
// Holdbacks (deferred): 418 / 367 / 420 / 1119 / 413 - see header.
const APQC_ADMIN_BENEFIT_ENROLLMENT = 1052; // external_id 10505
const APQC_ONBOARDING = 41;                  // external_id 20599
const APQC_AP_EXPENSE = 59;                  // external_id 10733

type ApqcAction = "INSERT" | "FLIP" | "REPLACE";
const APQC_ACTIONS: Array<{
  handoff_id: number;
  action: ApqcAction;
  process_id: number;
  existing_hp_id?: number; // for FLIP / REPLACE
  comment: string;
}> = [
  // FLIPs (existing discovery_* row with correct process_id, just retag)
  { handoff_id: 108, action: "FLIP",    process_id: APQC_ADMIN_BENEFIT_ENROLLMENT, existing_hp_id: 15, comment: "BEN-ENROLLMENT -> PAYROLL enrollment.changed" },
  { handoff_id: 109, action: "FLIP",    process_id: APQC_ADMIN_BENEFIT_ENROLLMENT, existing_hp_id: 14, comment: "BEN-ENROLLMENT -> ERP-FIN enrollment.changed" },
  { handoff_id: 188, action: "FLIP",    process_id: APQC_ADMIN_BENEFIT_ENROLLMENT, existing_hp_id: 13, comment: "BEN-ENROLLMENT -> PAYROLL-RUN enrollment.changed" },
  { handoff_id: 371, action: "FLIP",    process_id: APQC_ONBOARDING,                existing_hp_id: 40, comment: "HCM -> BEN-ENROLLMENT employee.created" },

  // REPLACEs (existing row with wrong process_id; switch process_id + retag)
  { handoff_id: 122, action: "REPLACE", process_id: APQC_ADMIN_BENEFIT_ENROLLMENT, existing_hp_id: 27, comment: "HCM -> BEN-ENROLLMENT employee.terminated (was 20599)" },
  { handoff_id: 395, action: "REPLACE", process_id: APQC_ONBOARDING,                existing_hp_id: 66, comment: "ATS -> BEN-ENROLLMENT candidate.hired (was 10440)" },

  // INSERTs (no existing handoff_processes row)
  { handoff_id: 110,  action: "INSERT", process_id: APQC_ADMIN_BENEFIT_ENROLLMENT, comment: "BEN-PLAN-DESIGN -> PAYROLL benefit_open_enrollment.closed" },
  { handoff_id: 417,  action: "INSERT", process_id: APQC_ADMIN_BENEFIT_ENROLLMENT, comment: "BEN-ENROLLMENT -> PAYROLL life_event.approved" },
  { handoff_id: 419,  action: "INSERT", process_id: APQC_AP_EXPENSE,               comment: "BEN-CARRIER-INTEG -> ERP-FIN carrier_feed.transmitted" },
  { handoff_id: 100,  action: "INSERT", process_id: APQC_ADMIN_BENEFIT_ENROLLMENT, comment: "PAYROLL -> BEN-ENROLLMENT pay_cycle.closed" },
  { handoff_id: 120,  action: "INSERT", process_id: APQC_ONBOARDING,               comment: "ATS -> BEN-ENROLLMENT job_offer.accepted" },
  { handoff_id: 379,  action: "INSERT", process_id: APQC_ADMIN_BENEFIT_ENROLLMENT, comment: "HCM -> BEN-ENROLLMENT employment_event.recorded" },
  { handoff_id: 1075, action: "INSERT", process_id: APQC_ADMIN_BENEFIT_ENROLLMENT, comment: "ATS -> BEN-ENROLLMENT job_offer.rescinded" },
  { handoff_id: 1156, action: "INSERT", process_id: APQC_ADMIN_BENEFIT_ENROLLMENT, comment: "PAYROLL -> BEN-ENROLLMENT payroll_journal.reversed" },
];

async function fixBritishSpelling(): Promise<void> {
  console.log("B1-S1: PATCH British spelling -> American");
  console.log("-----------------------------------------");

  const domBefore = await pg("GET", "/domains?id=eq.61&select=id,description");
  if (domBefore && domBefore.length > 0) {
    const cur = domBefore[0].description;
    if (cur === DOMAIN_DESC_NEW) {
      console.log(`  = domains.id=61.description already American`);
    } else {
      console.log(
        `  ${APPLY ? "->" : "DRY"} domains.id=61.description: rewriting "enrolment" -> "enrollment"`,
      );
      if (APPLY) {
        await pg("PATCH", "/domains?id=eq.61", { description: DOMAIN_DESC_NEW });
      }
    }
  }

  const capBefore = await pg("GET", "/capabilities?id=eq.40&select=id,capability_name");
  if (capBefore && capBefore.length > 0) {
    const cur = capBefore[0].capability_name;
    if (cur === CAPABILITY_NAME_NEW) {
      console.log(`  = capabilities.id=40.capability_name already American`);
    } else {
      console.log(
        `  ${APPLY ? "->" : "DRY"} capabilities.id=40.capability_name: "${cur}" -> "${CAPABILITY_NAME_NEW}"`,
      );
      if (APPLY) {
        await pg("PATCH", "/capabilities?id=eq.40", {
          capability_name: CAPABILITY_NAME_NEW,
        });
      }
    }
  }
  console.log("");
}

async function patchTriggerEvents(): Promise<void> {
  console.log("B1-S2: PATCH trigger_events.event_category (10 rows)");
  console.log("----------------------------------------------------");
  for (const row of TRIGGER_EVENT_PATCHES) {
    const before = await pg(
      "GET",
      `/trigger_events?id=eq.${row.id}&select=id,event_name,event_category`,
    );
    if (!before || before.length === 0) {
      console.log(`  ! id=${row.id} not found`);
      continue;
    }
    const cur = before[0];
    if (cur.event_category === row.event_category) {
      console.log(
        `  = id=${row.id} (${cur.event_name}) already ${row.event_category}`,
      );
      continue;
    }
    console.log(
      `  ${APPLY ? "->" : "DRY"} id=${row.id} (${cur.event_name}): "${cur.event_category}" -> "${row.event_category}"`,
    );
    if (APPLY) {
      await pg("PATCH", `/trigger_events?id=eq.${row.id}`, {
        event_category: row.event_category,
      });
    }
  }
  console.log("");
}

async function deleteScopeCreep(): Promise<void> {
  console.log("B1-S3: DELETE SCOPE-CREEP (candidates consumer + skill_tool)");
  console.log("------------------------------------------------------------");

  const dmdoBefore = await pg(
    "GET",
    `/domain_module_data_objects?id=eq.${DELETE_DMDO_ID}&select=id,domain_module_id,data_object_id,role,necessity,data_objects(data_object_name)`,
  );
  if (!dmdoBefore || dmdoBefore.length === 0) {
    console.log(`  = DMDO id=${DELETE_DMDO_ID} already gone`);
  } else {
    const r = dmdoBefore[0];
    console.log(
      `  ${APPLY ? "->" : "DRY"} DELETE DMDO id=${DELETE_DMDO_ID} (module=${r.domain_module_id}, do=${r.data_objects?.data_object_name}, ${r.role}+${r.necessity})`,
    );
    if (APPLY) {
      await pg(
        "DELETE",
        `/domain_module_data_objects?id=eq.${DELETE_DMDO_ID}`,
      );
    }
  }

  const stBefore = await pg(
    "GET",
    `/skill_tools?id=eq.${DELETE_SKILL_TOOL_ID}&select=id,skill_id,tool_id,tools(tool_name)`,
  );
  if (!stBefore || stBefore.length === 0) {
    console.log(`  = skill_tool id=${DELETE_SKILL_TOOL_ID} already gone`);
  } else {
    const r = stBefore[0];
    console.log(
      `  ${APPLY ? "->" : "DRY"} DELETE skill_tool id=${DELETE_SKILL_TOOL_ID} (skill=${r.skill_id}, tool=${r.tools?.tool_name})`,
    );
    if (APPLY) {
      await pg("DELETE", `/skill_tools?id=eq.${DELETE_SKILL_TOOL_ID}`);
    }
  }
  console.log("");
}

async function insertUserEdges(): Promise<void> {
  console.log("B1-S5: INSERT outbound user-edges (master -> users)");
  console.log("---------------------------------------------------");

  // Pre-read existing outbound rows so the load is idempotent.
  const existing: Array<{
    data_object_id: number;
    related_data_object_id: number;
    relationship_verb: string;
  }> = await pg(
    "GET",
    `/data_object_relationships?and=(data_object_id.in.(146,147,148,149,150,151,152),related_data_object_id.eq.${USERS_DO_ID})&select=data_object_id,related_data_object_id,relationship_verb`,
  );
  const existingKeys = new Set(
    (existing || []).map(
      (r) => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`,
    ),
  );

  const newRows: any[] = [];
  for (const m of USER_EDGES) {
    for (const v of m.verbs) {
      const k = `${m.master_id}|${USERS_DO_ID}|${v.verb}`;
      if (existingKeys.has(k)) {
        console.log(`  = ${m.master_name} ${v.verb} users already present`);
        continue;
      }
      console.log(
        `  ${APPLY ? "->" : "DRY"} INSERT ${m.master_name} "${v.verb}" users (inverse "${v.inverse}")`,
      );
      newRows.push({
        data_object_id: m.master_id,
        related_data_object_id: USERS_DO_ID,
        relationship_verb: v.verb,
        inverse_verb: v.inverse,
        relationship_type: "many_to_many",
        relationship_kind: "reference",
        is_required: false,
        owner_side: "source",
      });
    }
  }

  if (newRows.length === 0) {
    console.log("  (nothing to insert)");
  } else if (APPLY) {
    await pg("POST", "/data_object_relationships", newRows);
    console.log(`  -> POSTed ${newRows.length} rows`);
  } else {
    console.log(`  DRY would POST ${newRows.length} rows`);
  }
  console.log("");
}

async function applyApqcTags(): Promise<void> {
  console.log("B1-S8: APQC tagging on handoff_processes");
  console.log("----------------------------------------");

  // Pull existing rows for every handoff in scope (idempotency, plus we
  // assert against the existing_hp_id we recorded earlier).
  const handoffIds = APQC_ACTIONS.map((a) => a.handoff_id);
  const existing: Array<{
    id: number;
    handoff_id: number;
    process_id: number;
    proposal_source: string;
  }> = await pg(
    "GET",
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=id,handoff_id,process_id,proposal_source`,
  );
  const byHandoff = new Map<number, typeof existing>();
  for (const r of existing || []) {
    if (!byHandoff.has(r.handoff_id)) byHandoff.set(r.handoff_id, []);
    byHandoff.get(r.handoff_id)!.push(r);
  }

  const inserts: any[] = [];

  for (const a of APQC_ACTIONS) {
    const rows = byHandoff.get(a.handoff_id) || [];

    if (a.action === "INSERT") {
      // Skip insert if any agent_curated row already covers this handoff.
      const dup = rows.find(
        (r) => r.process_id === a.process_id && r.proposal_source === "agent_curated",
      );
      if (dup) {
        console.log(
          `  = handoff ${a.handoff_id} already agent_curated -> process ${a.process_id} (hp_id=${dup.id})`,
        );
        continue;
      }
      console.log(
        `  ${APPLY ? "->" : "DRY"} INSERT handoff_processes(handoff_id=${a.handoff_id}, process_id=${a.process_id}, proposal_source=agent_curated)   // ${a.comment}`,
      );
      inserts.push({
        handoff_id: a.handoff_id,
        process_id: a.process_id,
        proposal_source: "agent_curated",
        // record_status omitted: defaults to "new" per Rule #1.
      });
      continue;
    }

    // FLIP / REPLACE: PATCH the named existing row.
    const target = rows.find((r) => r.id === a.existing_hp_id);
    if (!target) {
      console.log(
        `  ! handoff ${a.handoff_id}: existing hp_id=${a.existing_hp_id} not found (${a.action}) - skipping`,
      );
      continue;
    }

    const patchBody: any = {};
    if (target.process_id !== a.process_id) patchBody.process_id = a.process_id;
    if (target.proposal_source !== "agent_curated") patchBody.proposal_source = "agent_curated";

    if (Object.keys(patchBody).length === 0) {
      console.log(
        `  = handoff ${a.handoff_id} hp_id=${a.existing_hp_id} already agent_curated -> process ${a.process_id}`,
      );
      continue;
    }

    console.log(
      `  ${APPLY ? "->" : "DRY"} ${a.action} hp_id=${target.id} (handoff ${a.handoff_id}): ${JSON.stringify(patchBody)}   // ${a.comment}`,
    );
    if (APPLY) {
      await pg("PATCH", `/handoff_processes?id=eq.${target.id}`, patchBody);
    }
  }

  if (inserts.length > 0) {
    if (APPLY) {
      await pg("POST", "/handoff_processes", inserts);
      console.log(`  -> POSTed ${inserts.length} new handoff_processes rows`);
    } else {
      console.log(`  DRY would POST ${inserts.length} new handoff_processes rows`);
    }
  }
  console.log("");
}

async function main(): Promise<void> {
  console.log(`BEN-ADMIN b1 technical continuation (apply=${APPLY})`);
  console.log("===================================================\n");

  await fixBritishSpelling();
  await patchTriggerEvents();
  await deleteScopeCreep();
  await insertUserEdges();
  await applyApqcTags();

  console.log("Done.");
  console.log("");
  console.log("Verify in the UI:");
  console.log("  https://tests.semantius.app/domain_map/domains");
  console.log("  https://tests.semantius.app/domain_map/capabilities");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
  console.log("  https://tests.semantius.app/domain_map/domain_module_data_objects");
  console.log("  https://tests.semantius.app/domain_map/skill_tools");
  console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
