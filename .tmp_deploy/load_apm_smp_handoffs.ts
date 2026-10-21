// One-off loader: wire the missing APM <-> SMP edges (both directions) plus
// their mirroring data_object_relationships. All rows land at record_status='new'
// (DB default) per Rule #1. Idempotent: pre-checks before every insert.
//
// Run: bun run "c:/dev/domain-map/.tmp_deploy/load_apm_smp_handoffs.ts"

async function pg(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`semantius exit ${code}: ${err || out}`);
  const trimmed = out.trim();
  return trimmed ? JSON.parse(trimmed) : null;
}

// --- handoffs ---------------------------------------------------------------
const handoffs = [
  {
    // SMP sanctions a SaaS app -> APM registers it in the portfolio for TIME scoring
    source_domain_id: 85,
    target_domain_id: 10,
    trigger_event_id: 622, // saas_application.sanctioned (data_object 61)
    data_object_id: 267, // enterprise_applications (APM payload)
    source_domain_module_id: 30, // SMP-DISCOVERY (masters saas_applications)
    target_domain_module_id: 103, // APM-PORTFOLIO-REGISTRY (masters enterprise_applications)
    integration_pattern: "api_call",
    friction_level: "medium",
    description:
      "A SaaS application sanctioned in SMP is registered in the APM portfolio as an enterprise application, so it is scored for redundancy and rationalization (TIME) against the existing application landscape. Friction: reconciling the SaaS app identity to a portfolio application entry, the same vendor/product normalization APM already faces with SAM.",
    notes: "",
  },
  {
    // APM marks an app Eliminate/retire -> SMP cancels the SaaS subscription
    source_domain_id: 10,
    target_domain_id: 85,
    trigger_event_id: 209, // application.lifecycle_state_changed (data_object 267)
    data_object_id: 62, // saas_subscriptions (SMP payload)
    source_domain_module_id: 103, // APM-PORTFOLIO-REGISTRY (masters enterprise_applications)
    target_domain_module_id: 31, // SMP-RENEWAL-VENDOR (masters saas_subscriptions)
    integration_pattern: "api_call",
    friction_level: "high",
    description:
      "When APM marks an application for elimination or retirement (TIME 'Eliminate'), SMP cancels the corresponding SaaS subscription(s) to stop the spend and triggers deprovisioning. High friction: the portfolio-level decision must reconcile to the specific SaaS subscription(s) to cancel, and the cancellation must complete or the org keeps paying for a retired app.",
    notes: "",
  },
];

// --- mirroring cross-domain data_object_relationships -----------------------
const rels = [
  {
    // saas_applications is registered in the APM portfolio as enterprise_applications
    data_object_id: 61, // saas_applications (SMP-owned source)
    related_data_object_id: 267, // enterprise_applications (APM)
    relationship_type: "one_to_one",
    relationship_kind: "reference",
    relationship_verb: "is registered as",
    inverse_verb: "is sourced from",
    is_required: false,
    owner_side: "source",
    notes: "",
  },
  {
    // enterprise_applications is delivered via one or more saas_subscriptions
    data_object_id: 267, // enterprise_applications (APM-owned source / parent)
    related_data_object_id: 62, // saas_subscriptions (SMP)
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    relationship_verb: "is delivered via",
    inverse_verb: "delivers",
    is_required: false,
    owner_side: "source",
    notes: "",
  },
];

// --- load -------------------------------------------------------------------
const insertedHandoffs: string[] = [];
for (const h of handoffs) {
  const existing = await pg(
    "GET",
    `/handoffs?source_domain_id=eq.${h.source_domain_id}&target_domain_id=eq.${h.target_domain_id}&trigger_event_id=eq.${h.trigger_event_id}&data_object_id=eq.${h.data_object_id}&select=id`,
  );
  if (existing && existing.length) {
    console.log(`handoff exists (id ${existing[0].id}): ${h.source_domain_id}->${h.target_domain_id} ev${h.trigger_event_id} do${h.data_object_id}`);
    continue;
  }
  const res = await pg("POST", "/handoffs?select=id,handoff_label", h);
  insertedHandoffs.push(JSON.stringify(res?.[0] ?? res));
}

const insertedRels: string[] = [];
for (const r of rels) {
  const existing = await pg(
    "GET",
    `/data_object_relationships?data_object_id=eq.${r.data_object_id}&related_data_object_id=eq.${r.related_data_object_id}&select=id`,
  );
  if (existing && existing.length) {
    console.log(`relationship exists (id ${existing[0].id}): ${r.data_object_id}->${r.related_data_object_id}`);
    continue;
  }
  const res = await pg("POST", "/data_object_relationships?select=id,data_object_relationship_label", r);
  insertedRels.push(JSON.stringify(res?.[0] ?? res));
}

console.log("\n=== inserted handoffs ===");
console.log(insertedHandoffs.length ? insertedHandoffs.join("\n") : "(none)");
console.log("\n=== inserted relationships ===");
console.log(insertedRels.length ? insertedRels.join("\n") : "(none)");

// verify
const verify = await pg(
  "GET",
  "/handoffs?or=(and(source_domain_id.eq.85,target_domain_id.eq.10),and(source_domain_id.eq.10,target_domain_id.eq.85))&select=id,handoff_label,integration_pattern,friction_level,record_status",
);
console.log("\n=== APM<->SMP handoffs now in catalog ===");
console.log(JSON.stringify(verify, null, 2));
