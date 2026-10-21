// Fixes for ATS audit 2026-05-23
//   B12.1 — config-shape note on recruitment_sources (id 5)
//   B12.2-4 — lifecycle states for talent_pools (7), recruitment_agencies (13), recruitment_events (14)
//   F1     — retire legacy ats-system skill (id 16) + its 21 skill_tools rows
//   B8     — add pre_employees (749) -> employees (31) edge
//   C1     — add Legal (fn 7) as contributor on ATS (domain 56)

const ATS_DOMAIN_ID = 56;
const LEGAL_FN_ID = 7;
const LEGACY_SKILL_ID = 16;
const PRE_EMPLOYEES = 749;
const EMPLOYEES = 31;

type Req = { method: string; path: string; body?: unknown };

async function call(req: Req): Promise<unknown> {
  const payload = JSON.stringify(req);
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(payload);
  await proc.stdin.end();
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`semantius exit ${code}: ${err}\nreq: ${payload}`);
  return out.trim() ? JSON.parse(out) : null;
}

async function main() {
  console.log("=== B12.1 config-shape note on recruitment_sources ===");
  await call({
    method: "PATCH",
    path: "/data_objects?id=eq.5",
    body: {
      notes:
        "Config-shaped; no per-record workflow. Sources are configured once (job_board, employee_referral, agency, career_fair, social, etc.) and edited inline. The meaningful state transitions live as attribution events on candidates, not on the source record itself.",
    },
  });
  console.log("  patched id=5");

  console.log("=== B12.2-4 lifecycle states ===");
  const states: Array<{
    data_object_id: number;
    state_name: string;
    state_order: number;
    is_initial: boolean;
    is_terminal: boolean;
    requires_permission: boolean;
    description: string;
  }> = [
    // talent_pools (7)
    { data_object_id: 7, state_name: "active", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, description: "Pool is open for additions and nurture campaigns." },
    { data_object_id: 7, state_name: "paused", state_order: 2, is_initial: false, is_terminal: false, requires_permission: false, description: "Pool nurture is temporarily halted (off-season, budget freeze) but membership is retained." },
    { data_object_id: 7, state_name: "archived", state_order: 3, is_initial: false, is_terminal: true, requires_permission: false, description: "Pool is closed; membership is retained for historical attribution but no further outreach occurs." },
    // recruitment_agencies (13)
    { data_object_id: 13, state_name: "prospective", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, description: "Agency under evaluation; contract not yet executed." },
    { data_object_id: 13, state_name: "active", state_order: 2, is_initial: false, is_terminal: false, requires_permission: false, description: "Agency has executed agreement and is engaged on one or more requisitions." },
    { data_object_id: 13, state_name: "on_hold", state_order: 3, is_initial: false, is_terminal: false, requires_permission: false, description: "Engagement paused (performance review, contractual dispute, hiring freeze)." },
    { data_object_id: 13, state_name: "terminated", state_order: 4, is_initial: false, is_terminal: true, requires_permission: false, description: "Relationship ended; no further requisitions are routed to this agency." },
    // recruitment_events (14)
    { data_object_id: 14, state_name: "planned", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, description: "Event scoped and budgeted; date, venue, target audience set; registration not yet open." },
    { data_object_id: 14, state_name: "open_for_registration", state_order: 2, is_initial: false, is_terminal: false, requires_permission: false, description: "Registration is accepting attendees; promotion campaigns active." },
    { data_object_id: 14, state_name: "held", state_order: 3, is_initial: false, is_terminal: false, requires_permission: false, description: "Event has been executed; attendee lists captured, leads ingested into talent pool." },
    { data_object_id: 14, state_name: "closed", state_order: 4, is_initial: false, is_terminal: true, requires_permission: false, description: "Post-event activities complete; cost accounting and source-attribution finalized." },
    { data_object_id: 14, state_name: "cancelled", state_order: 5, is_initial: false, is_terminal: true, requires_permission: false, description: "Event called off before it happens; sunk costs recognized, attendees notified." },
  ];
  await call({ method: "POST", path: "/data_object_lifecycle_states", body: states });
  console.log(`  inserted ${states.length} lifecycle states`);

  console.log("=== F1 retire legacy ats-system skill ===");
  await call({ method: "DELETE", path: `/skill_tools?skill_id=eq.${LEGACY_SKILL_ID}` });
  console.log("  deleted skill_tools rows");
  await call({ method: "DELETE", path: `/skills?id=eq.${LEGACY_SKILL_ID}` });
  console.log("  deleted skill id 16");

  console.log("=== B8 add pre_employees -> employees edge ===");
  await call({
    method: "POST",
    path: "/data_object_relationships",
    body: [
      {
        data_object_id: PRE_EMPLOYEES,
        related_data_object_id: EMPLOYEES,
        relationship_verb: "promotes to",
        inverse_verb: "is promoted from",
        relationship_type: "one_to_one",
        relationship_kind: "reference",
        is_required: true,
        owner_side: "source",
        notes: "cross | ATS->HCM | pre_employee.activated converts the pre-hire record into the canonical HCM employee record",
      },
    ],
  });
  console.log("  inserted relationship");

  console.log("=== C1 add Legal contributor on ATS ===");
  await call({
    method: "POST",
    path: "/business_function_domains",
    body: [
      {
        domain_id: ATS_DOMAIN_ID,
        business_function_id: LEGAL_FN_ID,
        responsibility_type: "contributor",
        notes: "EEO/ADA/AI Act/FCRA compliance overlays on hiring decisions; adverse-action review on background checks; pay-transparency disclosure review.",
      },
    ],
  });
  console.log("  inserted RACI row");

  console.log("\nall fixes loaded.");
}

await main();
