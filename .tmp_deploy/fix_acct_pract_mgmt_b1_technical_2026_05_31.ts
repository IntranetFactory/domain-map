// Technical-only B1 fixes for ACCT-PRACT-MGMT (domain id=152).
// Applies items the prompt's TECHNICAL filter authorizes:
//   1. PATCH handoff 339 target_domain_module_id to CLM-REPOSITORY (id=127). [B1-B2]
//   2. INSERT 5 user-edges in data_object_relationships (Rule #10). [B1-S4]
//   3. INSERT 3 agent_curated handoff_processes rows. [B1-H1]
// Defers anything gated on modules (M1), user picks (module shape, payload review),
// or new entities (lifecycle states, missing trigger events, full schema additions).
//
// Run from c:/dev/domain-map project root:
//   bun run "c:/dev/domain-map/.tmp_deploy/fix_acct_pract_mgmt_b1_technical_2026_05_31.ts"

type Json = unknown;

async function call(path: string, method: string, body?: Json): Promise<any> {
  const args = ["call", "crud", "postgrestRequest"];
  const payload: Record<string, Json> = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", ...args, JSON.stringify(payload)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) {
    throw new Error(`semantius ${method} ${path} exit=${code}\nstderr: ${err}\nstdout: ${out}`);
  }
  try {
    return out.trim() ? JSON.parse(out) : null;
  } catch {
    return out;
  }
}

function jwtCheck(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  if (/required audience not found/i.test(msg)) {
    console.error("JWT ERROR (verbatim, halt):");
    console.error(msg);
    process.exit(2);
  }
}

async function main() {
  // === 1. B1-B2 : PATCH handoff 339 target_domain_module_id -> 127 ===
  console.log("[B1-B2] PATCH handoff 339 target_domain_module_id=127 (CLM-REPOSITORY)");
  const beforeHandoff = await call(
    "/handoffs?id=eq.339&select=id,target_domain_module_id",
    "GET",
  );
  console.log("  before:", JSON.stringify(beforeHandoff));
  if (beforeHandoff[0]?.target_domain_module_id === 127) {
    console.log("  already set, skipping PATCH");
  } else {
    await call("/handoffs?id=eq.339", "PATCH", { target_domain_module_id: 127 });
    const afterHandoff = await call(
      "/handoffs?id=eq.339&select=id,target_domain_module_id",
      "GET",
    );
    console.log("  after :", JSON.stringify(afterHandoff));
  }

  // === 2. B1-S4 : INSERT 5 user-edges in data_object_relationships ===
  // tax_returns (400), client_engagements (401), users (748).
  // Per Rule #10, every cross-edge to platform_builtin 'users' must be recorded.
  console.log("\n[B1-S4] INSERT user-edges to data_objects.users (id=748)");
  const userEdges = [
    {
      data_object_id: 400, // tax_returns
      related_data_object_id: 748, // users
      relationship_verb: "is prepared by",
      inverse_verb: "prepares",
      relationship_type: "one_to_many", // a return has one preparer; a user prepares many
      relationship_kind: "reference",
      is_required: true,
      owner_side: "source",
      data_object_relationship_label: "tax_returns prepared_by users",
    },
    {
      data_object_id: 400, // tax_returns
      related_data_object_id: 748, // users
      relationship_verb: "is reviewed by",
      inverse_verb: "reviews",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      is_required: true,
      owner_side: "source",
      data_object_relationship_label: "tax_returns reviewed_by users",
    },
    {
      data_object_id: 401, // client_engagements
      related_data_object_id: 748, // users
      relationship_verb: "is led by engagement partner",
      inverse_verb: "leads engagement as partner",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      is_required: true,
      owner_side: "source",
      data_object_relationship_label:
        "client_engagements led_by_partner users",
    },
    {
      data_object_id: 401, // client_engagements
      related_data_object_id: 748, // users
      relationship_verb: "is managed by engagement manager",
      inverse_verb: "manages engagement",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      is_required: true,
      owner_side: "source",
      data_object_relationship_label: "client_engagements managed_by users",
    },
    {
      data_object_id: 401, // client_engagements
      related_data_object_id: 748, // users
      relationship_verb: "is staffed by",
      inverse_verb: "is assigned to engagement",
      relationship_type: "many_to_many",
      relationship_kind: "reference",
      is_required: false,
      owner_side: "source",
      data_object_relationship_label: "client_engagements staffed_by users",
    },
  ];
  // record_status omitted to take default 'new' per Rule #1.
  const existingEdges = await call(
    "/data_object_relationships?or=(and(data_object_id.eq.400,related_data_object_id.eq.748),and(data_object_id.eq.401,related_data_object_id.eq.748))&select=relationship_verb",
    "GET",
  );
  const existingVerbs = new Set<string>(
    (existingEdges as any[]).map((r: any) => r.relationship_verb),
  );
  const newEdges = userEdges.filter((e) => !existingVerbs.has(e.relationship_verb));
  console.log(`  existing user-edges by verb: ${existingEdges.length}, inserting ${newEdges.length}`);
  if (newEdges.length) {
    const inserted = await call("/data_object_relationships", "POST", newEdges);
    console.log(`  inserted ${(inserted as any[])?.length ?? 0} rows`);
  }

  // === 3. B1-H1 : INSERT 3 agent_curated handoff_processes rows ===
  // Audit pre-specifies handoff_id + PCF mapping for all 3, supplementing existing rows.
  console.log("\n[B1-H1] INSERT 3 agent_curated handoff_processes rows");
  const hpRows = [
    { handoff_id: 338, process_id: 328, proposal_source: "agent_curated" }, // tax_return.filed -> GRC
    { handoff_id: 339, process_id: 807, proposal_source: "agent_curated" }, // engagement_letter.signed -> CLM
    { handoff_id: 340, process_id: 315, proposal_source: "agent_curated" }, // tax_return.filed -> AP-AUTO
  ];
  // record_status omitted to take default 'new'.
  // Pre-flight: skip any (handoff_id, process_id, proposal_source) that already exists.
  const existingHp = await call(
    "/handoff_processes?handoff_id=in.(338,339,340)&select=handoff_id,process_id,proposal_source",
    "GET",
  );
  const seen = new Set<string>(
    (existingHp as any[]).map(
      (r: any) => `${r.handoff_id}|${r.process_id}|${r.proposal_source}`,
    ),
  );
  const newHp = hpRows.filter(
    (r) => !seen.has(`${r.handoff_id}|${r.process_id}|${r.proposal_source}`),
  );
  console.log(
    `  existing rows on these handoffs: ${(existingHp as any[]).length}, inserting ${newHp.length}`,
  );
  if (newHp.length) {
    const inserted = await call("/handoff_processes", "POST", newHp);
    console.log(`  inserted ${(inserted as any[])?.length ?? 0} rows`);
  }

  // === Verification ===
  console.log("\n=== Verification ===");
  const v1 = await call(
    "/handoffs?id=eq.339&select=id,target_domain_module_id",
    "GET",
  );
  console.log("handoff 339:", JSON.stringify(v1));
  const v2 = await call(
    "/data_object_relationships?or=(and(data_object_id.eq.400,related_data_object_id.eq.748),and(data_object_id.eq.401,related_data_object_id.eq.748))&select=id,data_object_id,relationship_verb,relationship_type,is_required",
    "GET",
  );
  console.log("user-edges count:", (v2 as any[]).length);
  for (const r of v2 as any[]) console.log("  ", JSON.stringify(r));
  const v3 = await call(
    "/handoff_processes?handoff_id=in.(338,339,340)&select=id,handoff_id,process_id,proposal_source,record_status",
    "GET",
  );
  console.log("handoff_processes count:", (v3 as any[]).length);
  for (const r of v3 as any[]) console.log("  ", JSON.stringify(r));

  console.log("\nUI spot-checks:");
  console.log("  https://tests.semantius.app/domain_map/handoffs");
  console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes");
}

try {
  await main();
} catch (e) {
  jwtCheck(e);
  console.error("FAIL:", e instanceof Error ? e.message : String(e));
  process.exit(1);
}
