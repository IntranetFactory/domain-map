/**
 * Add `proposal_source` enum field to `handoff_processes` and backfill existing rows.
 *
 * Layered APQC ownership (README mode c) needs to distinguish rows authored at
 * Phase B from rows substring-inferred by Discover Pass 2 or curated via
 * PCF_OVERRIDES. The composed unique key on (handoff_id, process_id) already
 * prevents exact duplicates; this column gives Pass 1.5 the data it needs to
 * categorize rows at review time (authored-pending vs discovered-pending) and
 * lets QA tally coverage by phase.
 *
 * Enum values:
 *   - human_curated     — analyst tagged at handoff load time (highest confidence)
 *   - discovery_override — Discover Pass 2 resolved via curated PCF_OVERRIDES entry
 *   - discovery_substring — Discover Pass 2 resolved via substring fallback
 *
 * Backfill strategy for the 165 existing rows: every row in handoff_processes
 * today came from `discovery_query.ts --persist` (run on 2026-05-24). Classify
 * each row by whether its `process_id` matches a PCF_OVERRIDES-resolved process:
 *   - If yes → discovery_override
 *   - If no  → discovery_substring
 *
 * Idempotent: skips field creation if already present; backfill only touches
 * rows with NULL proposal_source.
 *
 * Run from project root: bun run scripts/loaders/add_handoff_processes_proposal_source_2026_05_29.ts
 */

type CmdResult = { ok: boolean; data: any; stderr: string; code: number };

async function call(server: string, tool: string, payload: any): Promise<CmdResult> {
  const proc = Bun.spawn(["semantius", "call", server, tool], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) return { ok: false, data: null, stderr: err.trim() || out.trim(), code };
  return { ok: true, data: out.trim() ? JSON.parse(out.trim()) : null, stderr: "", code };
}

async function get(path: string): Promise<any> {
  const r = await call("crud", "postgrestRequest", { method: "GET", path });
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.stderr}`);
  return r.data;
}

async function patch(path: string, body: any): Promise<any> {
  const r = await call("crud", "postgrestRequest", { method: "PATCH", path, body });
  if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.stderr}`);
  return r.data;
}

// Live PCF_OVERRIDES external_ids (after subscription fix on 2026-05-29).
// Sourced from scripts/analytics/discovery_query.ts; keep in sync.
const PCF_OVERRIDE_EXTS = ["20599", "10182", "10469", "10388", "10185", "10291", "20742", "10862", "10280", "10463"];

async function main() {
  console.log("Add handoff_processes.proposal_source — 2026-05-29");
  console.log("====================================================\n");

  // ----- Step 1: ensure proposal_source field exists -----
  console.log("Step 1: ensure handoff_processes.proposal_source field exists");
  const existingField = await get(
    "/fields?table_name=eq.handoff_processes&field_name=eq.proposal_source&select=field_name"
  );
  if (existingField.length === 0) {
    const result = await call("crud", "create_field", {
      data: {
        table_name: "handoff_processes",
        field_name: "proposal_source",
        title: "Proposal Source",
        description:
          "Which phase produced this proposal. human_curated = analyst tagged at handoff load time (highest confidence). discovery_override = Discover Pass 2 resolved via curated PCF_OVERRIDES entry (medium confidence; the override is hand-curated but the application is automated). discovery_substring = Discover Pass 2 resolved via substring fallback against process_name (lowest confidence; machine guess). Used at Pass 1.5 review time to weight rows and at QA time to tally coverage by phase.",
        format: "enum",
        enum_values: ["human_curated", "discovery_override", "discovery_substring"],
        default_value: "discovery_substring",
        field_order: 1000010,
      },
    });
    if (!result.ok) throw new Error(`create_field handoff_processes.proposal_source failed: ${result.stderr}`);
    console.log("  + handoff_processes.proposal_source created");
  } else {
    console.log("  = handoff_processes.proposal_source already exists, skipped");
  }

  // ----- Step 2: resolve override-derived process_ids -----
  console.log("\nStep 2: resolve PCF_OVERRIDES external_ids to process_ids");
  const overrideProcesses = await get(
    `/processes?external_id=in.(${PCF_OVERRIDE_EXTS.join(",")})&select=id,external_id,process_name`
  );
  const overrideProcessIds = new Set<number>(overrideProcesses.map((p: any) => Number(p.id)));
  console.log(`  ${overrideProcesses.length} override-derived processes:`);
  for (const p of overrideProcesses) {
    console.log(`    ${p.id}: ${p.external_id} - ${p.process_name}`);
  }

  // ----- Step 3: backfill rows where proposal_source IS NULL -----
  console.log("\nStep 3: backfill proposal_source on existing rows");
  const nullRows = await get(
    "/handoff_processes?proposal_source=is.null&select=id,process_id"
  );
  console.log(`  ${nullRows.length} rows need backfill`);

  if (nullRows.length === 0) {
    console.log("  (all rows already have proposal_source set; nothing to do)");
  } else {
    // Classify each by whether its process_id is in the override set.
    const overrideRowIds: number[] = [];
    const substringRowIds: number[] = [];
    for (const r of nullRows) {
      if (overrideProcessIds.has(Number(r.process_id))) {
        overrideRowIds.push(Number(r.id));
      } else {
        substringRowIds.push(Number(r.id));
      }
    }
    console.log(`  ${overrideRowIds.length} rows from PCF_OVERRIDES → discovery_override`);
    console.log(`  ${substringRowIds.length} rows from substring fallback → discovery_substring`);

    // Chunk PATCH the override rows.
    const CHUNK = 100;
    let touched = 0;
    if (overrideRowIds.length > 0) {
      for (let i = 0; i < overrideRowIds.length; i += CHUNK) {
        const slice = overrideRowIds.slice(i, i + CHUNK);
        await patch(`/handoff_processes?id=in.(${slice.join(",")})`, {
          proposal_source: "discovery_override",
        });
        touched += slice.length;
      }
      console.log(`    + ${touched}/${overrideRowIds.length} flipped to discovery_override`);
    }
    if (substringRowIds.length > 0) {
      let s = 0;
      for (let i = 0; i < substringRowIds.length; i += CHUNK) {
        const slice = substringRowIds.slice(i, i + CHUNK);
        await patch(`/handoff_processes?id=in.(${slice.join(",")})`, {
          proposal_source: "discovery_substring",
        });
        s += slice.length;
      }
      console.log(`    + ${s}/${substringRowIds.length} flipped to discovery_substring`);
    }
  }

  // ----- Step 4: verify -----
  console.log("\nStep 4: verify");
  const all = await get("/handoff_processes?select=proposal_source");
  const counts = new Map<string, number>();
  for (const r of all) counts.set(r.proposal_source, (counts.get(r.proposal_source) || 0) + 1);
  console.log(`  by proposal_source:`);
  for (const [src, n] of [...counts.entries()].sort()) {
    console.log(`    ${src}: ${n}`);
  }
  const stillNull = await get("/handoff_processes?proposal_source=is.null&select=id");
  if (stillNull.length > 0) {
    console.log(`  ⚠ ${stillNull.length} rows still NULL — investigate`);
  } else {
    console.log(`  ✓ no rows with NULL proposal_source`);
  }
}

await main();
