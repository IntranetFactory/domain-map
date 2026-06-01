// Backfill entity_type on the 22 ATS masters without lifecycle states.
// Classification is deterministic per the discussion that produced Rule #12 v2 (entity_type-driven).
// Workflow-bearing compliance entities (5) still surface as Rule #12 gaps; the remaining 17 auto-pass.

const BACKFILL: Array<{ id: number; name: string; entity_type: string }> = [
  // operational_record — per-X record without business workflow
  { id: 866, name: "candidate_engagements", entity_type: "operational_record" },
  { id: 869, name: "recruiter_interactions", entity_type: "operational_record" },
  { id: 884, name: "application_stage_transitions", entity_type: "operational_record" },
  { id: 888, name: "application_screening_answers", entity_type: "operational_record" },
  { id: 900, name: "application_dispositions", entity_type: "operational_record" },
  { id: 904, name: "ofccp_audit_trails", entity_type: "operational_record" },
  { id: 1000, name: "candidate_documents", entity_type: "operational_record" },
  { id: 1001, name: "candidate_notes", entity_type: "operational_record" },

  // catalog — config / template / taxonomy referenced by other entities
  { id: 873, name: "recruiter_saved_searches", entity_type: "catalog" },
  { id: 874, name: "referral_rewards", entity_type: "catalog" },
  { id: 877, name: "background_check_packages", entity_type: "catalog" },
  { id: 883, name: "application_stages", entity_type: "catalog" },
  { id: 887, name: "application_screening_questions", entity_type: "catalog" },
  { id: 893, name: "interview_questions", entity_type: "catalog" },
  { id: 1002, name: "candidate_tags", entity_type: "catalog" },

  // junction — N:M link
  { id: 905, name: "hiring_team_assignments", entity_type: "junction" },
  { id: 1003, name: "candidate_tag_assignments", entity_type: "junction" },

  // operational_workflow — compliance entities; lifecycle states still owed (B12 gap)
  { id: 898, name: "pre_adverse_action_notices", entity_type: "operational_workflow" },
  { id: 899, name: "applicant_flow_records", entity_type: "operational_workflow" },
  { id: 901, name: "data_subject_requests", entity_type: "operational_workflow" },
  { id: 902, name: "fcra_summary_of_rights_acknowledgements", entity_type: "operational_workflow" },
  { id: 903, name: "voluntary_self_identifications", entity_type: "operational_workflow" },
];

async function semantius(method: string, path: string, body?: unknown): Promise<unknown> {
  const args = JSON.stringify({ method, path, body });
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  await proc.exited;
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  if (proc.exitCode !== 0) throw new Error(`semantius ${method} ${path} failed: ${err}`);
  return out.trim() ? JSON.parse(out) : null;
}

let patched = 0;
for (const row of BACKFILL) {
  await semantius("PATCH", `/data_objects?id=eq.${row.id}`, { entity_type: row.entity_type });
  console.log(`  patched ${row.id.toString().padStart(4)} ${row.name.padEnd(45)} ${row.entity_type}`);
  patched++;
}

console.log(`\nBackfilled ${patched} rows.`);

// Verify
const verify = (await semantius(
  "GET",
  `/data_objects?id=in.(${BACKFILL.map((r) => r.id).join(",")})&select=id,data_object_name,entity_type&order=id.asc`,
)) as Array<{ id: number; data_object_name: string; entity_type: string }>;
const counts: Record<string, number> = {};
for (const r of verify) counts[r.entity_type] = (counts[r.entity_type] || 0) + 1;
console.log("\nVerification:");
for (const [k, v] of Object.entries(counts).sort()) console.log(`  ${k.padEnd(22)} ${v}`);
