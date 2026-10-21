// MSP-PSA b1 technical fixes, 2026-05-31.
//
// Scope (technical only, per Rule #15 revert + audit pre-specified IDs):
//   B1-S2: PATCH handoff 835 set notes='' (stale Rule #15 provenance prose,
//          "target NULL until MSP-PSA is modularized"; MSP-PSA IS modularized,
//          target_domain_module_id=137 is already populated).
//
// Deferred (gated on user judgment or unverifiable):
//   B1-S1 (gated on B2-S1 DELETE vs PROMOTE choice)
//   B1-S3 / B1-S4 / B1-S5 (report-only, other domains' fixes)
//   B1-S6 (gated on B2-S5 role list)
//   B1-S7 (depends on B1-S6)
//   B1-S8 (gated on B2-S4 retire-vs-repurpose)
//   B1-S9 (gated on B1-S8 / B2-S4)
//   B1-H1 (audit pre-specifies PCF id 10388 for handoff 523, but
//          /processes?id=eq.10388 returns empty; the other 9 candidates
//          say "needs PCF lookup" which is judgment. All 10 deferred.)
//
// Run from project root:
//   bun run "c:/dev/domain-map/.tmp_deploy/fix_msp_psa_b1_technical_2026_05_31.ts"

type PostgrestResp<T> = { ok: boolean; status: number; body: T | string };

async function semantius<T = unknown>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<PostgrestResp<T>> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) {
    payload.body = body; // must be a record/array, NOT a JSON string
    payload.headers = { "Content-Type": "application/json", Prefer: "return=representation" };
  }

  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" },
  );
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`semantius ${method} ${path} failed (exit ${code}):\nstderr: ${stderr}\nstdout: ${stdout}`);
  }
  let parsed: T | string = stdout;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    // leave as string
  }
  return { ok: true, status: 200, body: parsed };
}

// --- B1-S2: PATCH handoff 835 notes='' ---

async function preflight() {
  const r = await semantius<Array<{ id: number; notes: string; target_domain_module_id: number | null }>>(
    "GET",
    "/handoffs?id=eq.835&select=id,notes,target_domain_module_id",
  );
  const rows = r.body as Array<{ id: number; notes: string; target_domain_module_id: number | null }>;
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error(`Pre-flight: handoff 835 not found (got ${JSON.stringify(rows)})`);
  }
  const h = rows[0];
  if (h.target_domain_module_id !== 137) {
    throw new Error(
      `Pre-flight: handoff 835.target_domain_module_id=${h.target_domain_module_id}, expected 137 (MSP-PSA SVC-DESK). Audit assumption broken; aborting before PATCH.`,
    );
  }
  console.log(`Pre-flight OK: handoff 835.notes=${JSON.stringify(h.notes)}, target_module=137`);
  if (h.notes === "") {
    console.log("notes already empty; nothing to do.");
    return false;
  }
  return true;
}

async function patchHandoff835() {
  const r = await semantius<Array<{ id: number; notes: string }>>(
    "PATCH",
    "/handoffs?id=eq.835",
    { notes: "" },
  );
  const rows = r.body as Array<{ id: number; notes: string }>;
  if (!Array.isArray(rows) || rows.length !== 1 || rows[0].id !== 835 || rows[0].notes !== "") {
    throw new Error(`PATCH returned unexpected body: ${JSON.stringify(rows)}`);
  }
  console.log(`PATCH OK: handoff 835.notes='' (returned ${JSON.stringify(rows[0])})`);
}

async function main() {
  console.log("=== MSP-PSA b1 technical fixes, 2026-05-31 ===");
  console.log("Scope: B1-S2 (PATCH handoff 835 notes='')");
  const needsPatch = await preflight();
  if (needsPatch) await patchHandoff835();
  console.log("Done.");
}

await main();
