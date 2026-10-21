// HCMS B1 technical fixes, 2026-05-31
//
// Scope: only items the orchestrator classifies as TECHNICAL for B1 continuation.
//
// Applied:
//   B1-S2: PATCH event_category on 9 trigger_events (886-894)
//          Audit pre-specifies state+verb per row.
//
// Deferred (gated on B2 judgment or other-domain M1):
//   B1-S1, B1-S3, B1-S4, B1-S5, B1-S6, B1-S7, B1-H1 (see audits/HCMS.md continuation section).

const PATCHES: Array<{ id: number; event_name: string; event_category: string }> = [
  { id: 886, event_name: "content_entry.created",          event_category: "lifecycle" },
  { id: 887, event_name: "content_entry.scheduled",        event_category: "lifecycle" },
  { id: 888, event_name: "content_entry.unpublished",      event_category: "state_change" },
  { id: 889, event_name: "content_entry.translated",       event_category: "state_change" },
  { id: 890, event_name: "content_release.failed",         event_category: "state_change" },
  { id: 891, event_name: "editorial_workflow.review_required", event_category: "signal" },
  { id: 892, event_name: "content_locale.added",           event_category: "lifecycle" },
  { id: 893, event_name: "content_environment.promoted",   event_category: "state_change" },
  { id: 894, event_name: "content_type.deprecated",        event_category: "state_change" },
];

async function semantius(method: string, path: string, body?: unknown): Promise<unknown> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(`semantius ${method} ${path} failed (exit ${exitCode}): ${stderr || stdout}`);
  }
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

// Allowed enum values for trigger_events.event_category (Rule #13)
const ALLOWED = new Set(["lifecycle", "state_change", "threshold", "signal"]);

async function main() {
  // 1. Pre-flight: read the 9 rows live and confirm event_category is empty (so we are not overwriting curated values).
  const ids = PATCHES.map((p) => p.id).join(",");
  const live = (await semantius(
    "GET",
    `/trigger_events?select=id,event_name,event_category&id=in.(${ids})&order=id.asc`,
  )) as Array<{ id: number; event_name: string; event_category: string }>;

  if (live.length !== PATCHES.length) {
    throw new Error(`Pre-flight: expected ${PATCHES.length} rows, got ${live.length}`);
  }
  const liveById = new Map(live.map((r) => [r.id, r]));
  for (const want of PATCHES) {
    const got = liveById.get(want.id);
    if (!got) throw new Error(`Pre-flight: row ${want.id} missing`);
    if (got.event_name !== want.event_name) {
      throw new Error(
        `Pre-flight: row ${want.id} event_name mismatch (live='${got.event_name}', audit='${want.event_name}')`,
      );
    }
    if (got.event_category !== "") {
      throw new Error(
        `Pre-flight: row ${want.id} event_category already set to '${got.event_category}'; refusing to overwrite`,
      );
    }
    if (!ALLOWED.has(want.event_category)) {
      throw new Error(`Pre-flight: row ${want.id} proposed category '${want.event_category}' not in enum`);
    }
  }
  console.log(`Pre-flight OK: ${PATCHES.length} rows ready for PATCH`);

  // 2. PATCH each row.
  let applied = 0;
  for (const p of PATCHES) {
    await semantius(
      "PATCH",
      `/trigger_events?id=eq.${p.id}`,
      { event_category: p.event_category },
    );
    console.log(`  PATCH id=${p.id} (${p.event_name}) -> ${p.event_category}`);
    applied++;
  }

  // 3. Re-read for verification.
  const after = (await semantius(
    "GET",
    `/trigger_events?select=id,event_name,event_category&id=in.(${ids})&order=id.asc`,
  )) as Array<{ id: number; event_name: string; event_category: string }>;
  const stillEmpty = after.filter((r) => r.event_category === "");
  if (stillEmpty.length > 0) {
    throw new Error(`Post-PATCH: ${stillEmpty.length} rows still empty: ${stillEmpty.map((r) => r.id).join(",")}`);
  }
  console.log(`Applied ${applied} PATCHes; all rows now carry an event_category.`);
}

await main();
