// One-off (B15 remediation, decision A): clear the pattern flags that contradict
// entity_type on the 14 catalog/junction/computed masters the catalog-wide B15 sweep found.
// Decision A: keep the class (config/link/computed data legitimately carries a lifecycle per
// Rule #12); the flag is the error, so clear it. No reclassification.
// User-approved destructive overwrite (Rule #21): clearing a non-empty has_* flag to false.
// Touches ONLY the three flag columns. Never record_status.

const NAMES = [
  // catalog (8)
  "certification_definitions", "competency_models", "contract_clauses", "contract_templates",
  "credential_badges", "job_profiles", "offer_letter_templates", "skill_taxonomies",
  // junction (4)
  "recruiting_event_attendances", "talent_pool_memberships", "smp_app_owners", "smp_license_seat_assignments",
  // computed (2)
  "relationship_records", "work_user_workloads",
];

async function sem(req: any): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(req)], {
    stdout: "pipe", stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) throw new Error(`semantius failed (${proc.exitCode}): ${err || out}`);
  return out.trim() ? JSON.parse(out) : null;
}

const inList = NAMES.join(",");
const rows: any[] = await sem({
  method: "GET",
  path: `/data_objects?data_object_name=in.(${inList})&select=id,data_object_name,entity_type,has_personal_content,has_submit_lock,has_single_approver`,
});

console.log(`found ${rows.length} of ${NAMES.length} target rows`);
if (rows.length !== NAMES.length) {
  const got = new Set(rows.map((r) => r.data_object_name));
  console.log("MISSING:", NAMES.filter((n) => !got.has(n)).join(", ") || "(none)");
}

for (const r of rows) {
  const body: Record<string, boolean> = {};
  if (r.has_personal_content) body.has_personal_content = false;
  if (r.has_submit_lock) body.has_submit_lock = false;
  if (r.has_single_approver) body.has_single_approver = false;
  if (Object.keys(body).length === 0) {
    console.log(`  skip   ${r.data_object_name} (${r.entity_type}) - already clear`);
    continue;
  }
  await sem({ method: "PATCH", path: `/data_objects?id=eq.${r.id}`, body });
  console.log(`  clear  ${r.data_object_name} (${r.entity_type}): ${Object.keys(body).join(", ")}`);
}

// Verify: the full catalog-wide B15 predicate must now return zero.
const remaining: any[] = await sem({
  method: "GET",
  path: `/data_objects?entity_type=in.(catalog,junction,computed)&or=(has_personal_content.eq.true,has_submit_lock.eq.true,has_single_approver.eq.true)&select=data_object_name,entity_type`,
});
console.log(`\nB15 catalog-wide violations remaining: ${remaining.length}`);
if (remaining.length) console.log(remaining.map((r) => `${r.data_object_name}(${r.entity_type})`).join(", "));
console.log(remaining.length === 0 ? "OK - B15 clean catalog-wide" : "STILL DIRTY");
