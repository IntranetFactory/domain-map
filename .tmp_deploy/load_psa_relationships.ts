// PSA audit phase 2: B6 intra-domain + B7 users edges.
// Idempotent on (data_object_id, related_data_object_id, relationship_verb).
// B8 cross-domain payload->target rows are skipped: most PSA outbound handoffs
// publish PSA-mastered objects that target domains consume (no new artifact in
// the target), so no payload->target rows are warranted.

type Json = unknown;

async function pg(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: Json): Promise<any> {
  const args: Record<string, unknown> = { method, path };
  if (body !== undefined) args.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(args));
  await proc.stdin.end();
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`pg ${method} ${path} failed (${code}): ${err || out}`);
  const t = out.trim();
  return t ? JSON.parse(t) : null;
}

type Rel = {
  source: number;
  source_name: string;
  verb: string;
  inverse_verb: string;
  target: number;
  target_name: string;
  relationship_type: "one_to_one" | "one_to_many" | "many_to_many";
  relationship_kind: "composition" | "reference" | "association" | "inheritance";
  is_required: boolean;
  owner_side: "source" | "target";
  notes?: string;
};

const D = {
  users: 748,
  service_projects: 216,
  project_tasks: 217,
  project_assignments: 218,
  project_billing_milestones: 219,
  resource_skill_inventories: 725,
  project_resource_allocations: 726,
};

const intraDomain: Rel[] = [
  {
    source: D.service_projects, source_name: "service_projects",
    verb: "contains", inverse_verb: "belongs_to",
    target: D.project_tasks, target_name: "project_tasks",
    relationship_type: "one_to_many", relationship_kind: "composition", is_required: true, owner_side: "source",
    notes: "A project breaks down into many delivery tasks; deleting the project cascades the tasks.",
  },
  {
    source: D.service_projects, source_name: "service_projects",
    verb: "staffs", inverse_verb: "staffs_for",
    target: D.project_assignments, target_name: "project_assignments",
    relationship_type: "one_to_many", relationship_kind: "composition", is_required: true, owner_side: "source",
    notes: "A project is staffed via many resource assignments. Assignments belong to one project; deleting the project releases them.",
  },
  {
    source: D.service_projects, source_name: "service_projects",
    verb: "bills_via", inverse_verb: "bills_for",
    target: D.project_billing_milestones, target_name: "project_billing_milestones",
    relationship_type: "one_to_many", relationship_kind: "composition", is_required: true, owner_side: "source",
    notes: "A project recognises revenue through many contractual billing milestones.",
  },
  {
    source: D.service_projects, source_name: "service_projects",
    verb: "plans_resources_via", inverse_verb: "plans_for",
    target: D.project_resource_allocations, target_name: "project_resource_allocations",
    relationship_type: "one_to_many", relationship_kind: "composition", is_required: false, owner_side: "source",
    notes: "Forward-looking resource demand is captured at the project level via allocation records before assignments are firmed up.",
  },
  {
    source: D.project_tasks, source_name: "project_tasks",
    verb: "performed_by", inverse_verb: "performs",
    target: D.project_assignments, target_name: "project_assignments",
    relationship_type: "many_to_many", relationship_kind: "association", is_required: false, owner_side: "target",
    notes: "Tasks may be worked by one or more assigned resources; an assignment may execute many tasks across the project plan.",
  },
  {
    source: D.project_assignments, source_name: "project_assignments",
    verb: "requires_skills_from", inverse_verb: "qualifies_for",
    target: D.resource_skill_inventories, target_name: "resource_skill_inventories",
    relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "source",
    notes: "Assignments match against the resource's certified skills inventory; the inventory governs which roles a consultant can fill.",
  },
  {
    source: D.project_resource_allocations, source_name: "project_resource_allocations",
    verb: "confirms_into", inverse_verb: "is_confirmed_from",
    target: D.project_assignments, target_name: "project_assignments",
    relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source",
    notes: "Tentative allocations firm up into named assignments once the resource is committed. The transition is captured by trigger project_assignment.confirmed.",
  },
];

const usersEdges: Rel[] = [
  {
    source: D.users, source_name: "users",
    verb: "project_manager_of", inverse_verb: "managed_by",
    target: D.service_projects, target_name: "service_projects",
    relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "target",
    notes: "The accountable owner of project delivery: scope, schedule, quality, customer relationship.",
  },
  {
    source: D.users, source_name: "users",
    verb: "assigned_to", inverse_verb: "assignee",
    target: D.project_tasks, target_name: "project_tasks",
    relationship_type: "many_to_many", relationship_kind: "association", is_required: false, owner_side: "target",
    notes: "The user(s) responsible for completing the task. Tasks may have multiple assignees on collaborative deliverables.",
  },
  {
    source: D.users, source_name: "users",
    verb: "staffed_on", inverse_verb: "staffed_resource",
    target: D.project_assignments, target_name: "project_assignments",
    relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "target",
    notes: "The consultant or named employee filling the assignment; their HCM identity grounds the staffing.",
  },
  {
    source: D.users, source_name: "users",
    verb: "approves", inverse_verb: "approved_by",
    target: D.project_billing_milestones, target_name: "project_billing_milestones",
    relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "target",
    notes: "The customer-side approver (or internal PM countersigning) for milestone signoff that gates billing.",
  },
  {
    source: D.users, source_name: "users",
    verb: "has_skill_profile", inverse_verb: "profiles",
    target: D.resource_skill_inventories, target_name: "resource_skill_inventories",
    relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "target",
    notes: "The consultant whose certified skills, proficiencies and certifications this row records.",
  },
  {
    source: D.users, source_name: "users",
    verb: "allocates", inverse_verb: "allocated_by",
    target: D.project_resource_allocations, target_name: "project_resource_allocations",
    relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "target",
    notes: "The resource manager / staffing coordinator who authors the allocation plan.",
  },
];

async function ensureRel(r: Rel): Promise<{ skipped: boolean }> {
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

async function main(): Promise<void> {
  console.log("PSA relationships loader (B6 + B7)");
  let inserted = 0;
  let skipped = 0;
  for (const r of [...intraDomain, ...usersEdges]) {
    const { skipped: s } = await ensureRel(r);
    if (s) {
      skipped++;
      console.log(`  SKIP ${r.source_name} ${r.verb} ${r.target_name}`);
    } else {
      inserted++;
      console.log(`  INSERT ${r.source_name} ${r.verb} ${r.target_name}`);
    }
  }
  console.log(`\n${inserted} inserted, ${skipped} already present (total ${intraDomain.length + usersEdges.length})`);
}

await main();
