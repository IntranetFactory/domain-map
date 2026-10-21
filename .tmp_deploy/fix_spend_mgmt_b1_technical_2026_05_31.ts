#!/usr/bin/env bun
// SPEND-MGMT B1 technical fixes, 2026-05-31
//
// Applies the truly-technical subset of Bucket 1 from audits/SPEND-MGMT.md.
//
// Applied here:
//   Phase S2, PATCH 6 trigger_events to set event_category
//     (B1-S2, B9 enum-constraint backfill, audit pre-specifies each value)
//     - 577 card_authorization.declined           -> state_change
//     - 578 card_authorization.high_value         -> threshold
//     - 579 vendor_payment_authorization.approved -> state_change
//     - 580 vendor_payment_authorization.rejected -> state_change
//     - 581 spend_policy.updated                  -> state_change
//     - 582 corporate_card_account.balance_threshold -> threshold
//
// Deferred from B1 (not applied by this loader):
//   - B1-S1: 4 full domain_modules + 1 starter + DMDOs. Gated on B2-S1
//     (SPEND-REIMBURSEMENT vs EXPENSE boundary judgment) and creates new
//     entities / modules (outside technical scope).
//   - B1-S3: lifecycle states on 4 masters. Gated on B1-S1 (needs the
//     realizing module's id).
//   - B1-S4: PATCH 14 outbound handoffs' source_domain_module_id. Gated on
//     B1-S1 (target modules do not exist yet).
//   - B1-S5: PATCH 5 inbound handoffs' target_domain_module_id. Gated on
//     B1-S1 (target modules do not exist yet).
//   - B1-S8: 5 system skills + tools + skill_tools. Gated on B1-S1 and
//     creates new entities (outside technical scope).
//   - B1-H1: 19 APQC handoff_processes proposals. Each row says
//     "needs PCF lookup" and the audit's PCF labels disagree with the
//     external_ids it cites: every external_id (10744, 10770, 10746,
//     10864, 10222, 16439, 16466) resolves to a different process_name
//     than the audit's prose claims, and external_id 16438 is not found
//     in the apqc_pcf_cross_industry framework. Per the technical-fix
//     procedure rule, INSERT handoff_processes only when the audit
//     pre-specifies handoff_id + resolvable PCF. Verification fails,
//     defer to user judgment.
//   - B1-S6 / B1-S7: explicitly other-domain audit work (Report-only).
//
// Idempotency: each PATCH re-reads the row and only writes when
// event_category is still the empty string. Re-running is free.
//
// Rule discipline:
//   - record_status omitted on every INSERT (n/a, no inserts here), Rule #1.
//   - Zero writes to any `notes` column, Rule #15.
//   - No vendor or product names in any text field, Rule #18 (n/a here).
//   - Loader invoked from project root only, Rule #6.

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
const patch = (path: string, body: unknown) => call("PATCH", path, body);

type Row = Record<string, unknown>;

// Phase S2, trigger_events.event_category backfill

interface EventPatch {
  id: number;
  event_name: string;
  event_category: "lifecycle" | "state_change" | "threshold" | "signal";
}

const EVENT_PATCHES: EventPatch[] = [
  { id: 577, event_name: "card_authorization.declined", event_category: "state_change" },
  { id: 578, event_name: "card_authorization.high_value", event_category: "threshold" },
  { id: 579, event_name: "vendor_payment_authorization.approved", event_category: "state_change" },
  { id: 580, event_name: "vendor_payment_authorization.rejected", event_category: "state_change" },
  { id: 581, event_name: "spend_policy.updated", event_category: "state_change" },
  { id: 582, event_name: "corporate_card_account.balance_threshold", event_category: "threshold" },
];

async function phaseS2() {
  console.log("\n=== Phase S2, trigger_events.event_category backfill (6 rows) ===");

  const ids = EVENT_PATCHES.map((p) => p.id).join(",");
  const before = (await get(
    `/trigger_events?id=in.(${ids})&select=id,event_name,event_category&order=id.asc`,
  )) as Row[];
  const beforeById = new Map<number, Row>(
    before.map((r) => [Number(r.id), r] as const),
  );

  let patched = 0;
  let skipped = 0;
  for (const p of EVENT_PATCHES) {
    const row = beforeById.get(p.id);
    if (!row) {
      console.log(`  (skip) id=${p.id} ${p.event_name}, row missing`);
      skipped++;
      continue;
    }
    if (row.event_name !== p.event_name) {
      console.log(
        `  (skip) id=${p.id}, event_name drift: live='${row.event_name}', audit='${p.event_name}'`,
      );
      skipped++;
      continue;
    }
    if (row.event_category !== "") {
      console.log(
        `  (skip) id=${p.id} ${p.event_name}, already '${row.event_category}'`,
      );
      skipped++;
      continue;
    }
    await patch(`/trigger_events?id=eq.${p.id}`, {
      event_category: p.event_category,
    });
    console.log(`  patched id=${p.id} ${p.event_name} -> ${p.event_category}`);
    patched++;
  }
  console.log(`  summary: patched=${patched} skipped=${skipped}`);
}

await phaseS2();

console.log("\nall phases complete");
console.log("\nUI spot-check:");
console.log("  https://tests.semantius.app/domain_map/trigger_events");
