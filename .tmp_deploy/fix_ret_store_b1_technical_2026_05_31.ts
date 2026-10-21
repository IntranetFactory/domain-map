#!/usr/bin/env bun
// RET-STORE B1 technical fixes, 2026-05-31
//
// Applies the truly-technical subset of Bucket 1 from audits/RET-STORE.md:
//   Phase S1, PATCH 8 trigger_events.event_category enum values
//             (B1-S4, all 8 RET-STORE trigger_events sit at event_category=''
//             which violates the Rule #13 enum check-constraint; the audit
//             fully specifies each row's intended enum value).
//   Phase H1, INSERT 5 new agent_curated handoff_processes rows
//             (B1-S12, each row's handoff_id + PCF external_id is pre-specified
//             by the audit; all 5 PCFs verified resolvable).
//
// Deferred from B1 (not applied by this loader):
//   - B1-S1  (M1 module load): creates NEW modules, deferred per task rule.
//   - B1-S2  (A4 catalog UX): Rule #20, requires per-row user approval of wording.
//   - B1-S3  (A2 capabilities): creates NEW entities, deferred per task rule.
//   - B1-S5  (B12 lifecycle states): gated on B1-S1 + B2-S1 + B2-S2.
//   - B1-S6  (missing events): post-S5, user picks which events to add.
//   - B1-S7  (B10b source_domain_module_id PATCH): zero modules exist to
//             derive from, so not FK-derivable per task rule.
//   - B1-S8  (B10b target_domain_module_id): report-only, owed by WFM/HCM.
//   - B1-S9  (B4 pattern flag flips): task rule defers pattern flag flips.
//   - B1-S10 (B7 user-edge verb-shape rename): audit pre-specifies only 2 of 7
//             target verb names ("assigned_to_user, created_by_user, etc.");
//             the remaining 5 require judgment on the verb form, deferred.
//   - B1-S11 (F1 retire legacy skill): gated on B2-S4 retire vs rehome choice.
//
// Idempotency: pre-reads existing handoff_processes for the target handoffs and
// only inserts rows whose (handoff_id, process_id) pair is missing; pre-reads
// trigger_events and only patches rows still at event_category=''. Re-running
// the script is free.
//
// Rule discipline:
//   - record_status omitted on every INSERT (DB default 'new') per Rule #1.
//   - Zero writes to any `notes` column per Rule #15.
//   - APQC tags use proposal_source='agent_curated' (agent-authored work).
//   - No vendor or product names in any text field per Rule #18.

const SEMANTIUS = "semantius";

async function call(method: string, path: string, body?: unknown): Promise<unknown> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const p = Bun.spawn([SEMANTIUS, "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  p.stdin.write(JSON.stringify(payload));
  await p.stdin.end();
  const stdout = await new Response(p.stdout).text();
  const stderr = await new Response(p.stderr).text();
  const code = await p.exited;
  if (code !== 0) {
    throw new Error(`semantius exit ${code}: ${stderr}\nstdout: ${stdout}`);
  }
  if (!stdout.trim()) return null;
  try {
    return JSON.parse(stdout);
  } catch {
    return stdout;
  }
}

const get = (path: string) => call("GET", path);
const post = (path: string, body: unknown) => call("POST", path, body);
const patch = (path: string, body: unknown) => call("PATCH", path, body);

type Row = Record<string, unknown>;

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map((r) => {
    const out: Row = {};
    for (const k of keys) {
      out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    }
    return out;
  });
}

async function insertChunked(table: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const result = (await post(`/${table}`, slice)) as Row[] | null;
    if (result) out.push(...result);
  }
  return out;
}

// Phase S1, trigger_events.event_category enum backfill

interface EventEnumFix {
  id: number;
  event_name: string;
  event_category: "lifecycle" | "state_change" | "threshold" | "signal";
}

const EVENT_ENUM_FIXES: EventEnumFix[] = [
  { id: 1069, event_name: "store_task.assigned",                       event_category: "lifecycle"    },
  { id: 1070, event_name: "store_task.completed",                      event_category: "state_change" },
  { id: 1071, event_name: "retail_labour_schedule.published",          event_category: "state_change" },
  { id: 1072, event_name: "retail_labour_schedule.shortfall_detected", event_category: "threshold"    },
  { id: 1073, event_name: "store_audit.failed",                        event_category: "state_change" },
  { id: 1074, event_name: "mystery_shopper_record.submitted",          event_category: "lifecycle"    },
  { id: 1075, event_name: "planogram_compliance_record.violation",     event_category: "signal"       },
  { id: 1076, event_name: "store_associate_checklist.overdue",         event_category: "threshold"    },
];

async function phaseS1() {
  console.log("\n=== Phase S1, trigger_events event_category enum backfill ===");
  const ids = EVENT_ENUM_FIXES.map((f) => f.id).join(",");
  const before = (await get(
    `/trigger_events?id=in.(${ids})&select=id,event_name,event_category`,
  )) as Row[];
  const byId = new Map(before.map((r) => [Number(r.id), r]));
  let patched = 0;
  let skipped = 0;
  for (const fix of EVENT_ENUM_FIXES) {
    const live = byId.get(fix.id);
    if (!live) {
      console.log(`  (skip) id=${fix.id} not found in live state`);
      skipped++;
      continue;
    }
    if (String(live.event_name) !== fix.event_name) {
      throw new Error(
        `id=${fix.id} event_name mismatch: live='${live.event_name}' fix='${fix.event_name}'; aborting to avoid patching the wrong row`,
      );
    }
    if (live.event_category !== "") {
      console.log(
        `  (skip) id=${fix.id} ${fix.event_name} already at event_category='${live.event_category}'`,
      );
      skipped++;
      continue;
    }
    await patch(`/trigger_events?id=eq.${fix.id}`, { event_category: fix.event_category });
    console.log(`  patched id=${fix.id} ${fix.event_name} -> ${fix.event_category}`);
    patched++;
  }
  console.log(`  Phase S1 summary: patched=${patched} skipped=${skipped}`);
}

// Phase H1, APQC handoff_processes inserts

interface ApqcTag {
  handoff_id: number;
  process_external_id: string;
  mnemonic: string;
}

const APQC_BATCH: ApqcTag[] = [
  { handoff_id: 934, process_external_id: "21623", mnemonic: "RET-STORE->WFM retail_labour_schedule.published, Create resourcing plan and schedule L5" },
  { handoff_id: 935, process_external_id: "11187", mnemonic: "RET-STORE->HCM store_audit.failed, Conduct health and safety and environmental audits L4" },
  { handoff_id: 936, process_external_id: "11687", mnemonic: "RET-STORE->CRM mystery_shopper_record.submitted, Solicit customer feedback on customer service experience L4" },
  { handoff_id: 937, process_external_id: "10527", mnemonic: "RET-STORE->WFM store_associate_checklist.overdue, Develop and manage time and attendance systems L3" },
  { handoff_id: 938, process_external_id: "10854", mnemonic: "RET-STORE->WFM store_task.completed, Collect and record employee time worked L4" },
];

async function phaseH1() {
  console.log("\n=== Phase H1, APQC handoff_processes inserts ===");

  const externalIds = [...new Set(APQC_BATCH.map((t) => t.process_external_id))];
  const processes = (await get(
    `/processes?source_framework=eq.apqc_pcf_cross_industry&external_id=in.(${externalIds.join(",")})&select=id,external_id`,
  )) as { id: number; external_id: string }[];
  const procByExt = new Map(processes.map((p) => [String(p.external_id), Number(p.id)]));
  for (const e of externalIds) {
    if (!procByExt.has(e)) {
      throw new Error(`PCF process external_id=${e} not found; aborting`);
    }
  }
  console.log(`  resolved ${procByExt.size} PCF process ids`);

  const handoffIds = APQC_BATCH.map((t) => t.handoff_id).join(",");
  const existing = (await get(
    `/handoff_processes?handoff_id=in.(${handoffIds})&select=handoff_id,process_id`,
  )) as { handoff_id: number; process_id: number }[];
  const existingKey = new Set(existing.map((e) => `${e.handoff_id}.${e.process_id}`));
  console.log(`  existing handoff_processes rows for target handoffs: ${existing.length}`);

  const rows: Row[] = [];
  for (const t of APQC_BATCH) {
    const pid = procByExt.get(t.process_external_id)!;
    const key = `${t.handoff_id}.${pid}`;
    if (existingKey.has(key)) {
      console.log(`  (skip) ${key} already exists, ${t.mnemonic}`);
      continue;
    }
    rows.push({
      handoff_id: t.handoff_id,
      process_id: pid,
      proposal_source: "agent_curated",
      // record_status omitted, DB default 'new' per Rule #1
      // notes omitted per Rule #15
    });
  }
  console.log(`  inserting ${rows.length} handoff_processes rows`);
  const created = await insertChunked("handoff_processes", rows);
  console.log(`  created ${created.length} rows`);
}

// Main

await phaseS1();
await phaseH1();

console.log("\nAll phases complete.");
console.log("\nUI spot-checks:");
console.log("  https://tests.semantius.app/domain_map/trigger_events");
console.log("  https://tests.semantius.app/domain_map/handoff_processes");
