// Fix 3 (TALENT-MGMT audit, 2026-05-24): B6 intra-domain + B7 users edges.
// B8 (cross-domain payload->target) is vacuous: all outbound handoffs from TALENT-MGMT
// carry TALENT-MGMT masters as the payload that target domains *consume*; none create
// a new artifact in the target domain, so no payload->target relationship rows are warranted.

type Json = unknown;

async function pg(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: Json): Promise<any> {
  const args: Record<string, unknown> = { method, path };
  if (body !== undefined) args.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(args)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`pg ${method} ${path} failed (${code}): ${err || out}`);
  const trimmed = out.trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed);
}

type Rel = {
  source: number;        // data_object_id (from)
  source_name: string;   // for label
  verb: string;
  inverse_verb: string;
  target: number;        // related_data_object_id (to)
  target_name: string;
  relationship_type: "one_to_one" | "one_to_many" | "many_to_many";
  relationship_kind: "composition" | "reference" | "association" | "inheritance";
  is_required: boolean;
  owner_side: "source" | "target";
  notes?: string;
};

// id reference (TALENT-MGMT masters + users)
const D = {
  users: 748,
  performance_reviews: 174,
  performance_goals: 175,
  succession_plans: 176,
  talent_calibrations: 177,
  nine_box_placements: 178,
  career_aspirations: 179,
  feedback_records: 180,
  okr_objectives: 245,
};

const intraDomain: Rel[] = [
  {
    source: D.performance_reviews, source_name: "performance_reviews", verb: "evaluates", inverse_verb: "is_evaluated_in",
    target: D.performance_goals, target_name: "performance_goals",
    relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target",
    notes: "A review cycle assesses many goals set for the same employee/cycle. Goals exist independently of any single review.",
  },
  {
    source: D.performance_reviews, source_name: "performance_reviews", verb: "evaluates", inverse_verb: "is_evaluated_in",
    target: D.okr_objectives, target_name: "okr_objectives",
    relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target",
    notes: "Reviews also assess OKR outcomes when the org runs OKRs inside the performance cycle.",
  },
  {
    source: D.feedback_records, source_name: "feedback_records", verb: "informs", inverse_verb: "incorporates",
    target: D.performance_reviews, target_name: "performance_reviews",
    relationship_type: "many_to_many", relationship_kind: "association", is_required: false, owner_side: "target",
    notes: "Continuous-feedback notes feed forward into the annual / semi-annual review when both modules are deployed.",
  },
  {
    source: D.talent_calibrations, source_name: "talent_calibrations", verb: "calibrates", inverse_verb: "is_calibrated_in",
    target: D.performance_reviews, target_name: "performance_reviews",
    relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source",
    notes: "A calibration session normalises ratings across many reviews within the same population.",
  },
  {
    source: D.nine_box_placements, source_name: "nine_box_placements", verb: "derived_from", inverse_verb: "drives",
    target: D.performance_reviews, target_name: "performance_reviews",
    relationship_type: "one_to_one", relationship_kind: "reference", is_required: false, owner_side: "target",
    notes: "Placement on the grid is read off the calibrated performance rating for the cycle.",
  },
  {
    source: D.nine_box_placements, source_name: "nine_box_placements", verb: "finalized_by", inverse_verb: "finalizes",
    target: D.talent_calibrations, target_name: "talent_calibrations",
    relationship_type: "many_to_one", relationship_kind: "reference", is_required: false, owner_side: "target",
    notes: "Placements are confirmed during the calibration session that locks ratings for the cycle.",
  } as any,
  {
    source: D.succession_plans, source_name: "succession_plans", verb: "considers", inverse_verb: "informs",
    target: D.nine_box_placements, target_name: "nine_box_placements",
    relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target",
    notes: "Successor selection draws on hi-potential placements (the top row / right column of the grid).",
  },
  {
    source: D.succession_plans, source_name: "succession_plans", verb: "considers", inverse_verb: "informs",
    target: D.career_aspirations, target_name: "career_aspirations",
    relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target",
    notes: "Successor selection respects employee-declared aspirations and mobility preferences.",
  },
  {
    source: D.performance_goals, source_name: "performance_goals", verb: "aligns_to", inverse_verb: "is_aligned_with",
    target: D.okr_objectives, target_name: "okr_objectives",
    relationship_type: "many_to_many", relationship_kind: "association", is_required: false, owner_side: "source",
    notes: "Goals and OKRs align bidirectionally when the org runs both. A goal can roll up to an OKR; an OKR can be measured by goals.",
  },
];

// Fix the bad row above (relationship_type "many_to_one" not in enum) -- replace with one_to_many on inverse direction.
intraDomain[5] = {
  source: D.talent_calibrations, source_name: "talent_calibrations", verb: "finalizes", inverse_verb: "is_finalized_by",
  target: D.nine_box_placements, target_name: "nine_box_placements",
  relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source",
  notes: "Placements are confirmed during the calibration session that locks ratings for the cycle.",
};

const usersEdges: Rel[] = [
  {
    source: D.users, source_name: "users", verb: "authors", inverse_verb: "is_authored_by",
    target: D.feedback_records, target_name: "feedback_records",
    relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "target",
    notes: "The user who gives the feedback (peer, manager, upward, 360 panelist).",
  },
  {
    source: D.users, source_name: "users", verb: "receives", inverse_verb: "is_about",
    target: D.feedback_records, target_name: "feedback_records",
    relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "target",
    notes: "The user the feedback is about / addressed to.",
  },
  {
    source: D.users, source_name: "users", verb: "is_reviewed_in", inverse_verb: "reviews",
    target: D.performance_reviews, target_name: "performance_reviews",
    relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "target",
    notes: "The reviewee — the employee whose performance is being assessed.",
  },
  {
    source: D.users, source_name: "users", verb: "reviews", inverse_verb: "is_reviewed_by",
    target: D.performance_reviews, target_name: "performance_reviews",
    relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "target",
    notes: "The reviewing manager who authors the rating and narrative.",
  },
  {
    source: D.users, source_name: "users", verb: "owns", inverse_verb: "is_owned_by",
    target: D.performance_goals, target_name: "performance_goals",
    relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "target",
    notes: "The employee whose goal it is.",
  },
  {
    source: D.users, source_name: "users", verb: "calibrates_in", inverse_verb: "involves_calibrator",
    target: D.talent_calibrations, target_name: "talent_calibrations",
    relationship_type: "many_to_many", relationship_kind: "association", is_required: true, owner_side: "target",
    notes: "Managers participating in the calibration session — typically a population manager and their peers.",
  },
  {
    source: D.users, source_name: "users", verb: "is_incumbent_in", inverse_verb: "has_incumbent",
    target: D.succession_plans, target_name: "succession_plans",
    relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target",
    notes: "The current role-holder the succession plan covers; nullable for vacant or yet-to-be-filled roles.",
  },
  {
    source: D.users, source_name: "users", verb: "is_successor_in", inverse_verb: "names_successor",
    target: D.succession_plans, target_name: "succession_plans",
    relationship_type: "many_to_many", relationship_kind: "association", is_required: true, owner_side: "target",
    notes: "Named ready-now / 1-2yr / 3-5yr successors on the plan.",
  },
  {
    source: D.users, source_name: "users", verb: "is_placed_in", inverse_verb: "places",
    target: D.nine_box_placements, target_name: "nine_box_placements",
    relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "target",
    notes: "The employee whose performance/potential placement this is.",
  },
  {
    source: D.users, source_name: "users", verb: "declares", inverse_verb: "is_declared_by",
    target: D.career_aspirations, target_name: "career_aspirations",
    relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "target",
    notes: "The employee whose aspirations these are.",
  },
];

async function ensureRel(r: Rel) {
  // existence check on (source, related, verb)
  const existing = await pg(
    "GET",
    `/data_object_relationships?data_object_id=eq.${r.source}&related_data_object_id=eq.${r.target}&relationship_verb=eq.${encodeURIComponent(r.verb)}&select=id`,
  );
  if (existing && existing.length) return { skipped: true };
  const label = `${r.source_name} ${r.verb} ${r.target_name}`;
  await pg("POST", "/data_object_relationships", [
    {
      data_object_relationship_label: label,
      data_object_id: r.source,
      related_data_object_id: r.target,
      relationship_verb: r.verb,
      inverse_verb: r.inverse_verb,
      relationship_type: r.relationship_type,
      relationship_kind: r.relationship_kind,
      is_required: r.is_required,
      owner_side: r.owner_side,
      notes: r.notes ?? "",
    },
  ]);
  return { skipped: false };
}

async function main() {
  let inserted = 0;
  let skipped = 0;
  for (const r of [...intraDomain, ...usersEdges]) {
    const { skipped: s } = await ensureRel(r);
    if (s) skipped++;
    else inserted++;
  }
  console.log(`relationships: ${inserted} inserted, ${skipped} already present`);
}

await main();
