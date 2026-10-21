// SMP Bucket-1 fix loader (2026-06-02 Validate run)
// Closes the agent-solvable backlog for SMP (domain 85, 4 modules: 30/31/184/185).
// Idempotent: PATCHes are re-runnable; inserts pre-check live state by natural key.
//
// Covers:
//   B13  entity_type classification on 21 SMP masters
//   B5   promote orphan embedded_masters 988/998 -> master (Rule #11)
//   M6   reattribute capabilities 522/523 -> SMP-OPTIMIZATION (184), 524 -> SMP-AUTOMATION (185)
//   B9b  7 intra-domain (cross-module) handoffs (lifecycle_progression)
//   B7   9 users-actor edges (Rule #10)
//   H1   4 handoff_processes APQC tags on untagged cross-domain handoffs
//   prior b1a: event_category backfill on 5 SMP trigger_events
//   prior b1a: 3 Rule #18 vendor-name-in-description rewrites (module 185, data_objects 988/998)
//
// A4/M8 (catalog UX copy) intentionally NOT loaded here — Rule #20 requires user review before write.

type Json = any;

async function call(method: string, path: string, body?: unknown): Promise<Json> {
  const arg: Json = { method, path };
  if (body !== undefined) arg.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(arg));
  proc.stdin.end();
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  await proc.exited;
  if (proc.exitCode !== 0) {
    throw new Error(`semantius ${method} ${path} failed (exit ${proc.exitCode}):\n${err}\n${out}`);
  }
  try {
    return JSON.parse(out);
  } catch {
    return out; // PATCH/POST without representation returns empty body
  }
}

const get = (path: string) => call("GET", path);
const patch = (path: string, body: unknown) => call("PATCH", path, body);

function uniformize(rows: Json[]): Json[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map((r) => {
    const out: Json = {};
    for (const k of keys) out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return out;
  });
}

async function insert(path: string, rows: Json[]): Promise<number> {
  if (rows.length === 0) return 0;
  const CHUNK = 50;
  let n = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    await call("POST", path, slice);
    n += slice.length;
  }
  return n;
}

// ---------------------------------------------------------------------------
// B13 — entity_type classification (grouped bulk PATCH by target value)
// ---------------------------------------------------------------------------
const ENTITY_TYPE_GROUPS: Record<string, number[]> = {
  operational_workflow: [61, 62, 65, 985, 987, 988, 989, 990, 992, 993, 994, 995, 996, 999],
  junction: [63, 984],
  catalog: [986, 997],
  computed: [64, 991],
  operational_record: [998],
};

async function fixB13() {
  for (const [etype, ids] of Object.entries(ENTITY_TYPE_GROUPS)) {
    await patch(`/data_objects?id=in.(${ids.join(",")})`, { entity_type: etype });
    console.log(`  B13: ${etype} -> ${ids.length} data_objects (${ids.join(",")})`);
  }
}

// ---------------------------------------------------------------------------
// B5 — promote orphan embedded_masters to master
// ---------------------------------------------------------------------------
async function fixB5() {
  await patch(`/domain_module_data_objects?domain_module_id=eq.30&data_object_id=eq.988`, {
    role: "master",
    necessity: "required",
  });
  console.log("  B5: smp_app_lifecycle_stages (988) embedded_master -> master in SMP-DISCOVERY (30)");
  await patch(`/domain_module_data_objects?domain_module_id=eq.185&data_object_id=eq.998`, {
    role: "master",
    necessity: "required",
  });
  console.log("  B5: smp_workflow_runs (998) embedded_master -> master in SMP-AUTOMATION (185)");
}

// ---------------------------------------------------------------------------
// M6 — reattribute capabilities (filter targets the CURRENT host; no-op once moved)
// ---------------------------------------------------------------------------
async function fixM6() {
  const moves: [number, number][] = [
    [522, 184], // SMP-USAGE-ANALYTICS -> SMP-OPTIMIZATION
    [523, 184], // SMP-LICENSE-OPT     -> SMP-OPTIMIZATION
    [524, 185], // SMP-APP-LIFECYCLE   -> SMP-AUTOMATION
  ];
  for (const [capId, toModule] of moves) {
    await patch(`/domain_module_capabilities?domain_module_id=eq.30&capability_id=eq.${capId}`, {
      domain_module_id: toModule,
    });
    console.log(`  M6: capability ${capId} relinked from module 30 -> ${toModule}`);
  }
}

// ---------------------------------------------------------------------------
// B9b — intra-domain (cross-module) handoffs
// ---------------------------------------------------------------------------
const INTRA_HANDOFFS = [
  {
    trigger_event_id: 622, source_domain_module_id: 30, target_domain_module_id: 184, data_object_id: 63,
    description: "A sanctioned SaaS application becomes eligible for license seat provisioning and usage metering in the optimization module.",
  },
  {
    trigger_event_id: 1404, source_domain_module_id: 30, target_domain_module_id: 185, data_object_id: 999,
    description: "Publishing an app to the self-service catalog opens employee app-access requests in the automation module.",
  },
  {
    trigger_event_id: 1441, source_domain_module_id: 185, target_domain_module_id: 184, data_object_id: 63,
    description: "Fulfilling a self-service app request provisions a license seat assignment.",
  },
  {
    trigger_event_id: 1195, source_domain_module_id: 31, target_domain_module_id: 184, data_object_id: 990,
    description: "Cancelling a subscription triggers reclamation of its license seats.",
  },
  {
    trigger_event_id: 1412, source_domain_module_id: 184, target_domain_module_id: 31, data_object_id: 993,
    description: "A rightsizing or downgrade recommendation feeds the renewal engagement decision.",
  },
  {
    trigger_event_id: 623, source_domain_module_id: 30, target_domain_module_id: 184, data_object_id: 63,
    description: "Deprovisioning an application reclaims all of its license seat assignments.",
  },
  {
    trigger_event_id: 1432, source_domain_module_id: 31, target_domain_module_id: 30, data_object_id: 987,
    description: "A vendor risk assessment requiring remediation raises a portfolio alert on the application.",
  },
];

async function fixB9b() {
  const existing: Json[] = await get(
    `/handoffs?source_domain_id=eq.85&target_domain_id=eq.85&select=data_object_id,trigger_event_id`,
  );
  const seen = new Set(existing.map((r) => `${r.data_object_id}|${r.trigger_event_id}`));
  const rows = INTRA_HANDOFFS.filter(
    (h) => !seen.has(`${h.data_object_id}|${h.trigger_event_id}`),
  ).map((h) => ({
    source_domain_id: 85,
    target_domain_id: 85,
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
    ...h,
  }));
  const n = await insert("/handoffs", rows);
  console.log(`  B9b: inserted ${n} intra-domain handoffs (${INTRA_HANDOFFS.length - n} already present)`);
}

// ---------------------------------------------------------------------------
// B7 — users-actor edges (Rule #10). users data_object id = 748.
// Shape mirrors existing SMP user edges: one_to_many, owner_side=target (master holds the FK).
// ---------------------------------------------------------------------------
const USER_EDGES = [
  { related: 985, verb: "configures", inverse: "configured_by", required: true },
  { related: 986, verb: "curates", inverse: "curated_by", required: false },
  { related: 987, verb: "triages", inverse: "triaged_by", required: false },
  { related: 989, verb: "reviews", inverse: "reviewed_by", required: false },
  { related: 990, verb: "executes", inverse: "executed_by", required: false },
  { related: 993, verb: "leads", inverse: "led_by", required: true },
  { related: 994, verb: "negotiates", inverse: "negotiated_by", required: true },
  { related: 996, verb: "assesses", inverse: "assessed_by", required: true },
  { related: 997, verb: "authors", inverse: "authored_by", required: true },
];

async function fixB7() {
  const ids = USER_EDGES.map((e) => e.related).join(",");
  const existing: Json[] = await get(
    `/data_object_relationships?data_object_id=eq.748&related_data_object_id=in.(${ids})&select=related_data_object_id`,
  );
  const seen = new Set(existing.map((r) => Number(r.related_data_object_id)));
  const rows = USER_EDGES.filter((e) => !seen.has(e.related)).map((e) => ({
    data_object_id: 748,
    related_data_object_id: e.related,
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    relationship_verb: e.verb,
    inverse_verb: e.inverse,
    is_required: e.required,
    owner_side: "target",
  }));
  const n = await insert("/data_object_relationships", rows);
  console.log(`  B7: inserted ${n} users edges (${USER_EDGES.length - n} already present)`);
}

// ---------------------------------------------------------------------------
// H1 — APQC tags on untagged cross-domain handoffs
// ---------------------------------------------------------------------------
const H1_TAGS = [
  { handoff_id: 639, process_id: 273 }, // saas_application.discovered -> IGA : Manage IT user identity and authorization
  { handoff_id: 640, process_id: 273 }, // saas_application.sanctioned -> IGA
  { handoff_id: 642, process_id: 273 }, // saas_application.deprovisioned -> ITSM (access revocation)
  { handoff_id: 174, process_id: 317 }, // card_transaction.posted (SPEND-MGMT) -> shadow_it: Manage corporate credit cards (matches sibling handoff 38)
];

async function fixH1() {
  const existing: Json[] = await get(
    `/handoff_processes?handoff_id=in.(639,640,642,174)&select=handoff_id,process_id`,
  );
  const seen = new Set(existing.map((r) => `${r.handoff_id}|${r.process_id}`));
  const rows = H1_TAGS.filter((t) => !seen.has(`${t.handoff_id}|${t.process_id}`)).map((t) => ({
    handoff_id: t.handoff_id,
    process_id: t.process_id,
    role: "implements",
    proposal_source: "agent_curated",
    // record_status omitted -> defaults to 'new' (Rule #1)
  }));
  const n = await insert("/handoff_processes", rows);
  console.log(`  H1: inserted ${n} handoff_processes tags (${H1_TAGS.length - n} already present)`);
}

// ---------------------------------------------------------------------------
// prior b1a — event_category backfill on SMP trigger_events
// ---------------------------------------------------------------------------
async function fixEventCategory() {
  await patch(`/trigger_events?id=in.(621,622,623)`, { event_category: "lifecycle" });
  await patch(`/trigger_events?id=eq.624`, { event_category: "signal" });
  await patch(`/trigger_events?id=eq.625`, { event_category: "threshold" });
  console.log("  event_category: 621/622/623=lifecycle, 624=signal, 625=threshold");
}

// ---------------------------------------------------------------------------
// prior b1a — Rule #18 vendor-name removal from description fields
// ---------------------------------------------------------------------------
async function fixRule18Descriptions() {
  await patch(`/domain_modules?id=eq.185`, {
    description:
      "Declarative automation workflows, workflow run history, and employee-facing self-service app-access requests. The automation surface of an SMP deployment.",
  });
  await patch(`/data_objects?id=eq.988`, {
    description:
      "Portfolio-rationalization stage of a SaaS application (Evaluate, Pilot, Sanctioned, Sunset, Retired). Distinct from saas_applications.record_status (discovered, sanctioned, deprecated, deprovisioned), which tracks discovery state. The stage set follows the industry-standard TIME portfolio taxonomy (Tolerate, Invest, Migrate, Eliminate).",
  });
  await patch(`/data_objects?id=eq.998`, {
    description:
      "Execution log per automation workflow invocation. Carries trigger source, input payload, step-by-step status, output, duration, and error if failed.",
  });
  console.log("  Rule #18: rewrote descriptions for module 185, data_objects 988 + 998 (vendor names removed)");
}

// ---------------------------------------------------------------------------
async function main() {
  console.log("=== SMP Bucket-1 fix loader ===");
  console.log("B13 entity_type:");
  await fixB13();
  console.log("B5 orphan embedded_master -> master:");
  await fixB5();
  console.log("M6 capability reattribution:");
  await fixM6();
  console.log("B9b intra-domain handoffs:");
  await fixB9b();
  console.log("B7 users edges:");
  await fixB7();
  console.log("H1 APQC tags:");
  await fixH1();
  console.log("prior b1a event_category:");
  await fixEventCategory();
  console.log("prior b1a Rule #18 descriptions:");
  await fixRule18Descriptions();
  console.log("=== done ===");
}

await main();
