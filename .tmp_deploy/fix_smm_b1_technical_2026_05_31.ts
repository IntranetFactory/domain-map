#!/usr/bin/env bun
/**
 * SMM b1 — technical fixes (2026-05-31 continuation).
 *
 * Audit: audits/SMM.md (## 2026-05-30 — Validate b1 (full 4-pass)).
 *
 * In-scope (technical, no judgment):
 *   1. B1-S6: PATCH `event_category` on trigger_events 522 / 523 / 524
 *      (audit pre-specifies enum value per row).
 *   2. B1-S12: INSERT 6 `handoff_processes` rows where the audit pre-specifies
 *      handoff_id + PCF external_id AND the PCF resolves cleanly. Handoffs
 *      90 and 91 are deferred per the audit's own "needs PCF re-lookup" note.
 *
 * Out of scope this run (deferred to the user / a later pass):
 *   - B1-S1 (new modules), B1-S2 (depends on S1), B1-S3 (new lifecycle states),
 *     B1-S4 (users edges; verb shape not exactly pre-specified),
 *     B1-S5 (intra-domain rels; tuples not exactly pre-specified),
 *     B1-S7 (depends on S3), B1-S8 (cross-domain rels; verbs not finalized),
 *     B1-S9 (depends on S1), B1-S10 (user judgment on re-target vs DELETE),
 *     B1-S11 (bulk aliases; exact tuples not pre-specified),
 *     handoff_processes for handoffs 90 / 91 (audit flagged "re-lookup at fix time"),
 *     B1-S15 (domain_regulations; audit asks "which set" — user picks),
 *     B1-S13 (no action, pass), B1-S14 (folded into B2 judgment),
 *     B1-S16 (report-only, owed by other domains).
 *
 * Run from project root:
 *   bun run "C:/dev/domain-map/.tmp_deploy/fix_smm_b1_technical_2026_05_31.ts"
 */

type Row = Record<string, unknown>;

async function semCall(tool: string, payload: Row): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`${tool} (exit ${code}): ${stderr || stdout}`);
  }
  const t = stdout.trim();
  return t ? JSON.parse(t) : null;
}

const get = (path: string) =>
  semCall("postgrestRequest", { method: "GET", path }) as Promise<any[]>;
const post = (path: string, body: Row | Row[]) =>
  semCall("postgrestRequest", { method: "POST", path, body }) as Promise<any[]>;
const patch = (path: string, body: Row) =>
  semCall("postgrestRequest", { method: "PATCH", path, body }) as Promise<any[]>;

// ---------------------------------------------------------------------------
// B1-S6: PATCH 3 trigger_events with empty event_category.
// Audit pre-specifies values per row.
// ---------------------------------------------------------------------------
const ENUM_FIX: Array<{ id: number; category: string }> = [
  { id: 522, category: "lifecycle" },  // social_account.connected
  { id: 523, category: "signal" },     // social_listening_topic.alert
  { id: 524, category: "signal" },     // influencer.engagement_recorded
];

async function fixEventCategories() {
  console.log("\n[B1-S6] PATCH trigger_events.event_category for 3 rows");
  for (const { id, category } of ENUM_FIX) {
    const before = await get(`/trigger_events?id=eq.${id}&select=id,event_name,event_category`);
    if (!before.length) {
      console.log(`  - id=${id}: not found, skipping`);
      continue;
    }
    if (before[0].event_category === category) {
      console.log(`  - id=${id} (${before[0].event_name}): already '${category}', skipping`);
      continue;
    }
    if (before[0].event_category !== "") {
      console.log(
        `  - id=${id} (${before[0].event_name}): event_category='${before[0].event_category}' (not empty), skipping`,
      );
      continue;
    }
    await patch(`/trigger_events?id=eq.${id}`, { event_category: category });
    console.log(`  - id=${id} (${before[0].event_name}): '' -> '${category}'`);
  }
}

// ---------------------------------------------------------------------------
// B1-S12: INSERT handoff_processes for 6 of 8 handoffs.
// Audit pre-specifies (handoff_id, PCF external_id) tuples; all 3 PCFs
// were verified resolvable. Handoffs 90 and 91 are deferred (audit
// labelled "needs PCF re-lookup at fix time").
// ---------------------------------------------------------------------------
type Tag = { handoff_id: number; pcf_external_id: string; note?: string };

const APQC_TAGS: Tag[] = [
  { handoff_id: 86, pcf_external_id: "16627", note: "Monitor and respond to social media activity" },
  { handoff_id: 87, pcf_external_id: "16627", note: "Monitor and respond to social media activity" },
  { handoff_id: 88, pcf_external_id: "10189", note: "Identify/receive leads/opportunities" },
  { handoff_id: 89, pcf_external_id: "16613", note: "Analyze and respond to customer insight" },
  { handoff_id: 511, pcf_external_id: "16627", note: "Monitor and respond to social media activity" },
  { handoff_id: 512, pcf_external_id: "16613", note: "Analyze and respond to customer insight" },
];

async function loadHandoffProcesses() {
  console.log("\n[B1-S12] INSERT handoff_processes (agent_curated) for 6 SMM handoffs");

  // Resolve PCF external_id -> process.id once.
  const externalIds = [...new Set(APQC_TAGS.map((t) => t.pcf_external_id))];
  const inList = externalIds.map((x) => `"${x}"`).join(",");
  const pcfRows = await get(
    `/processes?external_id=in.(${inList})&select=id,external_id,process_name,hierarchy_level`,
  );
  const pcfMap = new Map<string, { id: number; name: string; level: number }>();
  for (const r of pcfRows) {
    pcfMap.set(r.external_id, {
      id: r.id,
      name: r.process_name,
      level: r.hierarchy_level,
    });
  }
  for (const ext of externalIds) {
    if (!pcfMap.has(ext)) {
      throw new Error(
        `PCF external_id=${ext} did not resolve in /processes; cannot proceed without an explicit user-supplied alternate.`,
      );
    }
  }

  // Verify each handoff exists and has no existing handoff_processes row for the target process.
  const handoffIds = APQC_TAGS.map((t) => t.handoff_id);
  const handoffRows = await get(
    `/handoffs?id=in.(${handoffIds.join(",")})&select=id`,
  );
  const handoffSet = new Set(handoffRows.map((r) => r.id));
  for (const t of APQC_TAGS) {
    if (!handoffSet.has(t.handoff_id)) {
      throw new Error(`handoff id=${t.handoff_id} not found in /handoffs`);
    }
  }

  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=handoff_id,process_id`,
  );
  const existingKey = new Set(
    existing.map((r: any) => `${r.handoff_id}.${r.process_id}`),
  );

  const rowsToInsert: Row[] = [];
  for (const t of APQC_TAGS) {
    const pcf = pcfMap.get(t.pcf_external_id)!;
    const key = `${t.handoff_id}.${pcf.id}`;
    if (existingKey.has(key)) {
      console.log(
        `  - handoff_id=${t.handoff_id} -> process_id=${pcf.id} (PCF ${t.pcf_external_id} L${pcf.level}): already present, skipping`,
      );
      continue;
    }
    rowsToInsert.push({
      handoff_id: t.handoff_id,
      process_id: pcf.id,
      proposal_source: "agent_curated",
      // role omitted -> defaults to 'implements'
      // record_status omitted -> defaults to 'new' (Rule #1)
      // notes omitted -> empty (Rule #15)
    });
    console.log(
      `  - queued handoff_id=${t.handoff_id} -> process_id=${pcf.id} (PCF ${t.pcf_external_id} L${pcf.level}: ${pcf.name})`,
    );
  }

  if (!rowsToInsert.length) {
    console.log("  (nothing to insert; all 6 rows already present)");
    return;
  }
  const inserted = await post("/handoff_processes", rowsToInsert);
  console.log(`  inserted ${Array.isArray(inserted) ? inserted.length : 0} row(s)`);
}

// ---------------------------------------------------------------------------
async function main() {
  await fixEventCategories();
  await loadHandoffProcesses();
  console.log("\nDone. Spot-check:");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
