// Fix 2 (TALENT-MGMT audit, 2026-05-24): B4 (pattern flags) + B11 (aliases).

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

// ---- Pattern flag patches ----
type FlagPatch = {
  id: number;
  has_personal_content?: boolean;
  has_submit_lock?: boolean;
  has_single_approver?: boolean;
};
const flagPatches: FlagPatch[] = [
  { id: 174, has_personal_content: true, has_submit_lock: true, has_single_approver: true }, // performance_reviews
  { id: 175, has_personal_content: true }, // performance_goals
  { id: 176, has_personal_content: true, has_submit_lock: true }, // succession_plans
  { id: 177, has_personal_content: true, has_submit_lock: true }, // talent_calibrations
  { id: 178, has_personal_content: true }, // nine_box_placements
  { id: 179, has_personal_content: true }, // career_aspirations
  { id: 180, has_personal_content: true }, // feedback_records
  { id: 245, has_personal_content: true }, // okr_objectives
];

// ---- Aliases ----
type AliasRow = { data_object_id: number; alias_name: string; alias_type: "synonym" | "industry_term" | "solution_term"; is_preferred?: boolean; solution_id?: number };

const aliases: AliasRow[] = [
  // performance_reviews (174)
  { data_object_id: 174, alias_name: "Annual Review", alias_type: "synonym" },
  { data_object_id: 174, alias_name: "Appraisal", alias_type: "synonym" },
  { data_object_id: 174, alias_name: "Performance Appraisal", alias_type: "synonym" },
  { data_object_id: 174, alias_name: "Evaluation", alias_type: "synonym" },
  { data_object_id: 174, alias_name: "Review Cycle", alias_type: "synonym" },
  // performance_goals (175)
  { data_object_id: 175, alias_name: "Goal", alias_type: "synonym" },
  { data_object_id: 175, alias_name: "Target", alias_type: "synonym" },
  { data_object_id: 175, alias_name: "Performance Target", alias_type: "synonym" },
  // succession_plans (176)
  { data_object_id: 176, alias_name: "Succession Bench", alias_type: "synonym" },
  { data_object_id: 176, alias_name: "Talent Pipeline", alias_type: "synonym" },
  { data_object_id: 176, alias_name: "Bench Plan", alias_type: "synonym" },
  // talent_calibrations (177)
  { data_object_id: 177, alias_name: "Calibration Session", alias_type: "synonym" },
  { data_object_id: 177, alias_name: "Rating Calibration", alias_type: "synonym" },
  // nine_box_placements (178)
  { data_object_id: 178, alias_name: "9-Box Grid", alias_type: "synonym", is_preferred: true },
  { data_object_id: 178, alias_name: "Talent Grid", alias_type: "synonym" },
  { data_object_id: 178, alias_name: "Performance-Potential Matrix", alias_type: "synonym" },
  // career_aspirations (179)
  { data_object_id: 179, alias_name: "Career Plan", alias_type: "synonym" },
  { data_object_id: 179, alias_name: "Career Interest", alias_type: "synonym" },
  { data_object_id: 179, alias_name: "Individual Development Plan", alias_type: "synonym" },
  // feedback_records (180)
  { data_object_id: 180, alias_name: "Continuous Feedback", alias_type: "synonym", is_preferred: true },
  { data_object_id: 180, alias_name: "1-on-1 Note", alias_type: "synonym" },
  { data_object_id: 180, alias_name: "Praise", alias_type: "synonym" },
  { data_object_id: 180, alias_name: "Kudos", alias_type: "synonym" },
  { data_object_id: 180, alias_name: "360 Feedback", alias_type: "synonym" },
  { data_object_id: 180, alias_name: "Peer Recognition", alias_type: "synonym" },
];

async function main() {
  // pattern flags
  for (const p of flagPatches) {
    const body: Record<string, boolean> = {};
    if (p.has_personal_content !== undefined) body.has_personal_content = p.has_personal_content;
    if (p.has_submit_lock !== undefined) body.has_submit_lock = p.has_submit_lock;
    if (p.has_single_approver !== undefined) body.has_single_approver = p.has_single_approver;
    await pg("PATCH", `/data_objects?id=eq.${p.id}`, body);
    console.log(`patched flags on data_object id=${p.id} -> ${JSON.stringify(body)}`);
  }

  // aliases (idempotent by data_object_id + alias_name)
  let inserted = 0;
  let skipped = 0;
  for (const a of aliases) {
    const existing = await pg(
      "GET",
      `/data_object_aliases?data_object_id=eq.${a.data_object_id}&alias_name=eq.${encodeURIComponent(a.alias_name)}&select=id`,
    );
    if (existing && existing.length) {
      skipped++;
      continue;
    }
    await pg("POST", "/data_object_aliases", [a]);
    inserted++;
  }
  console.log(`aliases: ${inserted} inserted, ${skipped} already present`);
}

await main();
