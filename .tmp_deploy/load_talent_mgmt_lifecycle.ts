// Fix 4 (TALENT-MGMT audit, 2026-05-24): B12 lifecycle states for 8 masters,
// with domain_module_id set to the realizing module from Fix 1.

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

const MODULES = { PM: 51, SC: 52, CF: 53 };
const D = {
  performance_reviews: 174,
  performance_goals: 175,
  succession_plans: 176,
  talent_calibrations: 177,
  nine_box_placements: 178,
  career_aspirations: 179,
  feedback_records: 180,
  okr_objectives: 245,
};

type State = {
  data_object_id: number;
  name_singular: string; // for label
  state_name: string;
  state_order: number;
  description: string;
  is_initial?: boolean;
  is_terminal?: boolean;
  requires_permission?: boolean;
  permission_verb_override?: string;
  domain_module_id: number;
};

const states: State[] = [
  // performance_reviews — PM
  { data_object_id: D.performance_reviews, name_singular: "Performance Review", state_name: "draft", state_order: 1, is_initial: true,
    description: "Cycle opens; review record created with employee and reviewing manager assigned.", domain_module_id: MODULES.PM },
  { data_object_id: D.performance_reviews, name_singular: "Performance Review", state_name: "self_assessment", state_order: 2,
    requires_permission: true, permission_verb_override: "submit_self_assessment_performance_review",
    description: "Employee fills in self-assessment.", domain_module_id: MODULES.PM },
  { data_object_id: D.performance_reviews, name_singular: "Performance Review", state_name: "manager_assessment", state_order: 3,
    requires_permission: true, permission_verb_override: "submit_manager_assessment_performance_review",
    description: "Reviewing manager writes rating and narrative.", domain_module_id: MODULES.PM },
  { data_object_id: D.performance_reviews, name_singular: "Performance Review", state_name: "submitted", state_order: 4,
    requires_permission: true, permission_verb_override: "submit_performance_review",
    description: "Both sides signed off; locked for calibration.", domain_module_id: MODULES.PM },
  { data_object_id: D.performance_reviews, name_singular: "Performance Review", state_name: "calibrated", state_order: 5,
    requires_permission: true, permission_verb_override: "calibrate_performance_review",
    description: "Rating adjusted in calibration session; final rating set.", domain_module_id: MODULES.PM },
  { data_object_id: D.performance_reviews, name_singular: "Performance Review", state_name: "published", state_order: 6,
    requires_permission: true, permission_verb_override: "publish_performance_review",
    description: "Final rating released to employee.", domain_module_id: MODULES.PM },
  { data_object_id: D.performance_reviews, name_singular: "Performance Review", state_name: "acknowledged", state_order: 7,
    description: "Employee acknowledged the review outcome.", domain_module_id: MODULES.PM },
  { data_object_id: D.performance_reviews, name_singular: "Performance Review", state_name: "closed", state_order: 8, is_terminal: true,
    description: "Cycle closed; review is read-only.", domain_module_id: MODULES.PM },

  // performance_goals — PM
  { data_object_id: D.performance_goals, name_singular: "Performance Goal", state_name: "drafted", state_order: 1, is_initial: true,
    description: "Goal authored by employee or manager.", domain_module_id: MODULES.PM },
  { data_object_id: D.performance_goals, name_singular: "Performance Goal", state_name: "approved", state_order: 2,
    requires_permission: true, permission_verb_override: "approve_performance_goal",
    description: "Manager approves the goal; it becomes part of the cycle.", domain_module_id: MODULES.PM },
  { data_object_id: D.performance_goals, name_singular: "Performance Goal", state_name: "in_progress", state_order: 3,
    description: "Goal is being worked.", domain_module_id: MODULES.PM },
  { data_object_id: D.performance_goals, name_singular: "Performance Goal", state_name: "completed", state_order: 4,
    requires_permission: true, permission_verb_override: "complete_performance_goal",
    description: "Outcome recorded; counts toward review rating.", domain_module_id: MODULES.PM },
  { data_object_id: D.performance_goals, name_singular: "Performance Goal", state_name: "cancelled", state_order: 5, is_terminal: true,
    requires_permission: true, permission_verb_override: "cancel_performance_goal",
    description: "Goal abandoned (role change, priority shift, etc.).", domain_module_id: MODULES.PM },

  // okr_objectives — PM
  { data_object_id: D.okr_objectives, name_singular: "OKR Objective", state_name: "drafted", state_order: 1, is_initial: true,
    description: "Objective drafted by the owner.", domain_module_id: MODULES.PM },
  { data_object_id: D.okr_objectives, name_singular: "OKR Objective", state_name: "committed", state_order: 2,
    requires_permission: true, permission_verb_override: "commit_okr_objective",
    description: "Owner and manager commit to the objective for the cycle.", domain_module_id: MODULES.PM },
  { data_object_id: D.okr_objectives, name_singular: "OKR Objective", state_name: "in_progress", state_order: 3,
    description: "Objective is being pursued; key results updated.", domain_module_id: MODULES.PM },
  { data_object_id: D.okr_objectives, name_singular: "OKR Objective", state_name: "graded", state_order: 4,
    requires_permission: true, permission_verb_override: "grade_okr_objective",
    description: "End-of-cycle score (0.0-1.0) recorded.", domain_module_id: MODULES.PM },
  { data_object_id: D.okr_objectives, name_singular: "OKR Objective", state_name: "closed", state_order: 5, is_terminal: true,
    description: "Cycle closed; objective archived.", domain_module_id: MODULES.PM },

  // talent_calibrations — PM
  { data_object_id: D.talent_calibrations, name_singular: "Talent Calibration", state_name: "scheduled", state_order: 1, is_initial: true,
    requires_permission: true, permission_verb_override: "schedule_talent_calibration",
    description: "Calibration meeting scheduled; population scope and participants assigned.", domain_module_id: MODULES.PM },
  { data_object_id: D.talent_calibrations, name_singular: "Talent Calibration", state_name: "in_session", state_order: 2,
    description: "Managers debate and normalise ratings.", domain_module_id: MODULES.PM },
  { data_object_id: D.talent_calibrations, name_singular: "Talent Calibration", state_name: "ratings_locked", state_order: 3,
    requires_permission: true, permission_verb_override: "lock_talent_calibration",
    description: "Final ratings locked; no further adjustments.", domain_module_id: MODULES.PM },
  { data_object_id: D.talent_calibrations, name_singular: "Talent Calibration", state_name: "published", state_order: 4, is_terminal: true,
    requires_permission: true, permission_verb_override: "publish_talent_calibration",
    description: "Outcomes pushed to downstream consumers (COMP-MGMT merit-cycle, performance_reviews calibrated state).", domain_module_id: MODULES.PM },

  // succession_plans — SC
  { data_object_id: D.succession_plans, name_singular: "Succession Plan", state_name: "draft", state_order: 1, is_initial: true,
    description: "Succession plan authored for a critical role.", domain_module_id: MODULES.SC },
  { data_object_id: D.succession_plans, name_singular: "Succession Plan", state_name: "reviewed", state_order: 2,
    requires_permission: true, permission_verb_override: "review_succession_plan",
    description: "Plan reviewed by leadership / talent council.", domain_module_id: MODULES.SC },
  { data_object_id: D.succession_plans, name_singular: "Succession Plan", state_name: "published", state_order: 3,
    requires_permission: true, permission_verb_override: "publish_succession_plan",
    description: "Plan published; successors visible to HR-business-partner workflows.", domain_module_id: MODULES.SC },
  { data_object_id: D.succession_plans, name_singular: "Succession Plan", state_name: "archived", state_order: 4, is_terminal: true,
    requires_permission: true, permission_verb_override: "archive_succession_plan",
    description: "Superseded by a newer plan (annual refresh, role change, incumbent change).", domain_module_id: MODULES.SC },

  // nine_box_placements — SC
  { data_object_id: D.nine_box_placements, name_singular: "Nine-Box Placement", state_name: "initial", state_order: 1, is_initial: true,
    description: "Manager's first placement before calibration.", domain_module_id: MODULES.SC },
  { data_object_id: D.nine_box_placements, name_singular: "Nine-Box Placement", state_name: "reviewed", state_order: 2,
    description: "Reviewed by talent council / peer managers.", domain_module_id: MODULES.SC },
  { data_object_id: D.nine_box_placements, name_singular: "Nine-Box Placement", state_name: "confirmed", state_order: 3, is_terminal: true,
    requires_permission: true, permission_verb_override: "confirm_nine_box_placement",
    description: "Placement locked after calibration session finalises ratings.", domain_module_id: MODULES.SC },

  // career_aspirations — SC
  { data_object_id: D.career_aspirations, name_singular: "Career Aspiration", state_name: "declared", state_order: 1, is_initial: true,
    description: "Employee records target roles, mobility preferences, time horizon.", domain_module_id: MODULES.SC },
  { data_object_id: D.career_aspirations, name_singular: "Career Aspiration", state_name: "discussed", state_order: 2,
    description: "Reviewed in a 1-on-1 with the manager.", domain_module_id: MODULES.SC },
  { data_object_id: D.career_aspirations, name_singular: "Career Aspiration", state_name: "in_pursuit", state_order: 3,
    description: "Active development plan in place.", domain_module_id: MODULES.SC },
  { data_object_id: D.career_aspirations, name_singular: "Career Aspiration", state_name: "fulfilled", state_order: 4, is_terminal: true,
    description: "Aspiration achieved (role move, promotion, lateral).", domain_module_id: MODULES.SC },
  { data_object_id: D.career_aspirations, name_singular: "Career Aspiration", state_name: "withdrawn", state_order: 5, is_terminal: true,
    description: "Employee withdraws the aspiration (priorities changed).", domain_module_id: MODULES.SC },

  // feedback_records — CF
  { data_object_id: D.feedback_records, name_singular: "Feedback Record", state_name: "drafted", state_order: 1, is_initial: true,
    description: "Feedback authored but not yet shared.", domain_module_id: MODULES.CF },
  { data_object_id: D.feedback_records, name_singular: "Feedback Record", state_name: "shared", state_order: 2,
    requires_permission: true, permission_verb_override: "share_feedback_record",
    description: "Feedback delivered to recipient (and any cc'd reviewers).", domain_module_id: MODULES.CF },
  { data_object_id: D.feedback_records, name_singular: "Feedback Record", state_name: "acknowledged", state_order: 3, is_terminal: true,
    description: "Recipient acknowledged or responded to the feedback.", domain_module_id: MODULES.CF },
];

async function ensureState(s: State) {
  const existing = await pg(
    "GET",
    `/data_object_lifecycle_states?data_object_id=eq.${s.data_object_id}&state_name=eq.${encodeURIComponent(s.state_name)}&select=id`,
  );
  if (existing && existing.length) return { skipped: true };
  const label = `${s.name_singular}: ${s.state_name}`;
  await pg("POST", "/data_object_lifecycle_states", [
    {
      data_object_lifecycle_state_label: label,
      data_object_id: s.data_object_id,
      state_name: s.state_name,
      state_order: s.state_order,
      description: s.description,
      is_initial: s.is_initial ?? false,
      is_terminal: s.is_terminal ?? false,
      requires_permission: s.requires_permission ?? false,
      permission_verb_override: s.permission_verb_override ?? "",
      domain_module_id: s.domain_module_id,
      notes: "",
    },
  ]);
  return { skipped: false };
}

async function main() {
  let inserted = 0;
  let skipped = 0;
  for (const s of states) {
    const { skipped: sk } = await ensureState(s);
    if (sk) skipped++;
    else inserted++;
  }
  console.log(`lifecycle states: ${inserted} inserted, ${skipped} already present (total ${states.length})`);
}

await main();
