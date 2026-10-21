// B1A-ENTITY-TYPE-64: classify entity_type on all 64 LMS masters (Rule #12 / B13).
// REFACTOR-B declined on inspection: 935 (continuing_education_credits) is a credit-value
// DEFINITION master (definition/instance pair with 936 ceu_records), not a duplicate -> classify
// 935=catalog, 936=operational_workflow; both kept.
// Idempotent: PATCH is naturally idempotent. Run: bun run "<abs path>"

const GROUPS: Record<string, number[]> = {
  // real-world objects with a gated workflow (all verified to HAVE lifecycle states)
  operational_workflow: [
    167, 168, 169, 171, 173, 906, 910, 913, 915, 923, 924, 925, 926, 928, 929,
    934, 936, 937, 938, 939, 940, 941, 943, 944, 945, 946, 947, 948, 949, 950,
    951, 952, 955, 956, 962,
  ],
  // per-X records / logs / append-only / UGC (no business workflow)
  operational_record: [170, 911, 912, 916, 920, 921, 922, 927, 960],
  // config / template / taxonomy / rule / definition (incl. publishable definitions)
  catalog: [907, 908, 909, 914, 917, 918, 919, 930, 931, 932, 933, 935, 942, 954, 957, 958, 959, 961, 963],
  // N:M / composition link rows
  junction: [953],
};

const ALL = Object.values(GROUPS).flat();
if (ALL.length !== 64) throw new Error(`expected 64 masters, got ${ALL.length}`);
if (new Set(ALL).size !== 64) throw new Error(`duplicate id in groups`);

async function pg(method: string, path: string, body?: unknown): Promise<string> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn({
    cmd: ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  const blob = `${out}\n${err}`;
  if (blob.includes("required audience not found")) {
    console.error("JWT-AUDIENCE ERROR (Rule #6) — STOP and surface verbatim:\n" + blob);
    process.exit(2);
  }
  if (proc.exitCode !== 0) throw new Error(`pg ${method} ${path} failed: ${err || out}`);
  return out;
}

for (const [et, ids] of Object.entries(GROUPS)) {
  await pg("PATCH", `/data_objects?id=in.(${ids.join(",")})`, { entity_type: et });
  console.log(`set entity_type=${et} on ${ids.length} masters`);
}

const remaining = await pg(
  "GET",
  `/data_objects?id=in.(${ALL.join(",")})&entity_type=eq.unclassified&select=id`,
);
const left = JSON.parse(remaining) as unknown[];
console.log(`remaining unclassified among the 64: ${left.length}`);
if (left.length !== 0) throw new Error(`classification incomplete: ${remaining}`);
console.log("OK: all 64 LMS masters classified.");
