// Backfill entity_type on the remaining 38 ATS masters (37 with lifecycle states + 1 missed in the prior pass).
// Pairs with backfill_ats_entity_type_2026_05_31.ts which covered the first 22.
// Result: all 60 ATS masters classified; ATS B13 returns zero unclassified.

const BACKFILL: Array<{ id: number; name: string; entity_type: string }> = [
  // operational_workflow (30) — has real workflow lifecycle
  { id: 1, name: "job_requisitions", entity_type: "operational_workflow" },
  { id: 2, name: "job_postings", entity_type: "operational_workflow" },
  { id: 3, name: "candidates", entity_type: "operational_workflow" },
  { id: 4, name: "job_applications", entity_type: "operational_workflow" },
  { id: 6, name: "candidate_referrals", entity_type: "operational_workflow" },
  { id: 7, name: "talent_pools", entity_type: "operational_workflow" },
  { id: 8, name: "interviews", entity_type: "operational_workflow" },
  { id: 9, name: "interview_scorecards", entity_type: "operational_workflow" },
  { id: 10, name: "candidate_assessments", entity_type: "operational_workflow" },
  { id: 11, name: "job_offers", entity_type: "operational_workflow" },
  { id: 12, name: "background_checks", entity_type: "operational_workflow" },
  { id: 13, name: "recruitment_agencies", entity_type: "operational_workflow" },
  { id: 14, name: "recruitment_events", entity_type: "operational_workflow" },
  { id: 749, name: "pre_employees", entity_type: "operational_workflow" },
  { id: 867, name: "candidate_nurture_campaigns", entity_type: "operational_workflow" },
  { id: 870, name: "candidate_consents", entity_type: "operational_workflow" },
  { id: 875, name: "referral_payouts", entity_type: "operational_workflow" },
  { id: 876, name: "referral_campaigns", entity_type: "operational_workflow" },
  { id: 878, name: "background_check_components", entity_type: "operational_workflow" },
  { id: 879, name: "fcra_disclosures", entity_type: "operational_workflow" },
  { id: 880, name: "background_check_adjudications", entity_type: "operational_workflow" },
  { id: 881, name: "adverse_action_notices", entity_type: "operational_workflow" },
  { id: 882, name: "background_check_disputes", entity_type: "operational_workflow" },
  { id: 885, name: "requisition_approvals", entity_type: "operational_workflow" },
  { id: 886, name: "job_posting_distributions", entity_type: "operational_workflow" },
  { id: 889, name: "eeo_responses", entity_type: "operational_workflow" },
  { id: 894, name: "interviewer_availability_slots", entity_type: "operational_workflow" },
  { id: 895, name: "offer_versions", entity_type: "operational_workflow" },
  { id: 896, name: "offer_approvals", entity_type: "operational_workflow" },
  { id: 897, name: "offer_letter_documents", entity_type: "operational_workflow" },

  // catalog (5) — config / template / taxonomy / rule definition
  { id: 5, name: "recruitment_sources", entity_type: "catalog" },
  { id: 872, name: "talent_segments", entity_type: "catalog" },
  { id: 890, name: "interview_kits", entity_type: "catalog" },
  { id: 892, name: "candidate_assessment_templates", entity_type: "catalog" },
  { id: 1004, name: "offer_letter_templates", entity_type: "catalog" },

  // junction (3) — N:M link with qualifier
  { id: 868, name: "recruiting_event_attendances", entity_type: "junction" },
  { id: 871, name: "talent_pool_memberships", entity_type: "junction" },
  { id: 891, name: "interview_panels", entity_type: "junction" },
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

async function patchWithRetry(id: number, entity_type: string, maxAttempts = 3): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await semantius("PATCH", `/data_objects?id=eq.${id}`, { entity_type });
      return;
    } catch (e) {
      lastErr = e;
      if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw lastErr;
}

let patched = 0;
for (const row of BACKFILL) {
  await patchWithRetry(row.id, row.entity_type);
  console.log(`  patched ${row.id.toString().padStart(4)} ${row.name.padEnd(40)} ${row.entity_type}`);
  patched++;
}

console.log(`\nBackfilled ${patched} rows.\n`);

// Verify: all 60 ATS masters now classified, zero unclassified.
const allAtsMasters = (await semantius(
  "GET",
  "/domain_module_data_objects?role=eq.master&domain_module_id=in.(1,2,3,4,5,6,7,8,154)&select=data_objects(id,entity_type)&limit=200",
)) as Array<{ data_objects: { id: number; entity_type: string } | null }>;

const counts: Record<string, number> = {};
const seen = new Set<number>();
for (const r of allAtsMasters) {
  if (!r.data_objects || seen.has(r.data_objects.id)) continue;
  seen.add(r.data_objects.id);
  counts[r.data_objects.entity_type] = (counts[r.data_objects.entity_type] || 0) + 1;
}
console.log(`ATS-wide verification (${seen.size} distinct masters):`);
for (const [k, v] of Object.entries(counts).sort()) console.log(`  ${k.padEnd(22)} ${v}`);
