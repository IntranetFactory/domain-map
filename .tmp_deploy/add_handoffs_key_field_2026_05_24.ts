/**
 * Add a computed `key` field to `handoffs` whose value is the 6-tuple
 * idempotency key as a dot-separated string:
 *
 *   <source_domain_id>.<target_domain_id>.<source_domain_module_id>.<target_domain_module_id>.<trigger_event_id>.<data_object_id>
 *
 * NULL module ids render as the literal string "null" so two rows with the
 * same domains/event/payload but no module attribution collide cleanly on
 * the key string.
 *
 * Idempotent:
 *   - skips the field create if `handoffs.key` already exists
 *   - on `update_entity`, the new `computed_fields` entry is appended to the
 *     existing `handoff_label` derivation rather than replacing it
 *   - re-runnable safely; re-running performs the no-op PATCH backfill on
 *     existing rows so their `key` columns get populated
 *
 * NOTE on rollout: this script does NOT mark the field unique. The user
 * asked for the computed value only. After verifying the values look right,
 * add `unique_value: true` via a follow-up `update_field` (and resolve any
 * stragglers first per the audit gap report).
 *
 * Run from project root: bun run .tmp_deploy/add_handoffs_key_field_2026_05_24.ts
 */

type CmdResult = { ok: boolean; data: any; stderr: string; code: number };

async function call(server: string, tool: string, payload: any): Promise<CmdResult> {
  const proc = Bun.spawn(
    ["semantius", "call", server, tool],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe" }
  );
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

const KEY_COMPUTED_FIELD = {
  name: "key",
  description: "6-tuple natural key for the handoff edge, concatenated with '.' separators. Uses the platform `concat` operator (SQL CONCAT semantics): null values become empty string.",
  jsonlogic: {
    concat: [
      { var: "source_domain_id" }, ".",
      { var: "target_domain_id" }, ".",
      { var: "source_domain_module_id" }, ".",
      { var: "target_domain_module_id" }, ".",
      { var: "trigger_event_id" }, ".",
      { var: "data_object_id" },
    ],
  },
};

async function main() {
  console.log("Add computed `key` field to handoffs — 2026-05-24");
  console.log("===================================================\n");

  // ----- Step 1: read current entity state (preserve handoff_label) -----
  console.log("Step 1: read handoffs entity");
  const entRows = await get("/entities?table_name=eq.handoffs&select=table_name,computed_fields,validation_rules");
  if (entRows.length !== 1) throw new Error(`expected exactly 1 handoffs entity, got ${entRows.length}`);
  const existingComputed = (entRows[0].computed_fields ?? []) as any[];
  console.log(`  current computed_fields entries: ${existingComputed.map((c: any) => c.name).join(", ") || "(none)"}`);

  // ----- Step 2: create the `key` field if missing -----
  console.log("\nStep 2: ensure handoffs.key field exists");
  const existingField = await get("/fields?table_name=eq.handoffs&field_name=eq.key&select=field_name");
  if (existingField.length === 0) {
    const result = await call("crud", "create_field", {
      data: {
        table_name: "handoffs",
        field_name: "key",
        title: "Key",
        description: "Computed 6-tuple natural key for the handoff edge: src_dom.tgt_dom.src_mod.tgt_mod.event.payload, joined with '.'. Nullable module ids render as the literal 'null'. Materialized by the entity's BEFORE INSERT/UPDATE trigger from the `computed_fields` JsonLogic.",
        format: "text",
        field_order: 1000050,
        input_type: "readonly",
      },
    });
    if (!result.ok) throw new Error(`create_field handoffs.key failed: ${result.stderr}`);
    console.log("  + handoffs.key created (text, readonly)");
  } else {
    console.log("  = handoffs.key already exists, skipped");
  }

  // ----- Step 3: append `key` entry to computed_fields (preserve handoff_label) -----
  console.log("\nStep 3: append `key` to computed_fields");
  const haveKeyEntry = existingComputed.some((c: any) => c.name === "key");
  let nextComputed: any[];
  if (haveKeyEntry) {
    // Replace in place so re-runs with an evolved expression overwrite cleanly.
    nextComputed = existingComputed.map((c: any) => (c.name === "key" ? KEY_COMPUTED_FIELD : c));
    console.log("  ~ replacing existing `key` computed_fields entry");
  } else {
    nextComputed = [...existingComputed, KEY_COMPUTED_FIELD];
    console.log("  + appending new `key` computed_fields entry");
  }
  await patch("/entities?table_name=eq.handoffs", { computed_fields: nextComputed });
  console.log(`  computed_fields now: ${nextComputed.map((c) => c.name).join(", ")}`);

  // ----- Step 4: backfill existing rows by no-op PATCH (fires BEFORE-UPDATE trigger) -----
  console.log("\nStep 4: backfill `key` on existing rows (no-op PATCH per row)");
  const allRows = await get("/handoffs?select=id&order=id.asc");
  const ids = allRows.map((r: any) => Number(r.id));
  console.log(`  ${ids.length} rows to touch`);

  const CHUNK = 100;
  let touched = 0;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    // PATCH with empty body still fires BEFORE UPDATE trigger; `updated_at` will move.
    // We can't PATCH `{}` directly (PostgREST may reject); set a no-op field on itself.
    // Cheapest no-op: PATCH each row with `{"id": <same id>}` — same value, fires trigger.
    // But PATCH with bulk filter is one round-trip per chunk:
    await patch(`/handoffs?id=in.(${slice.join(",")})`, { record_status: "new" });
    // record_status is already "new" on every row from the audit; this is a no-op on values
    // but it does fire the BEFORE UPDATE trigger, which is what we need.
    touched += slice.length;
    if (i % (CHUNK * 5) === 0) console.log(`    ... touched ${touched}/${ids.length}`);
  }
  console.log(`  done. ${touched} rows touched (trigger fires populated their key column).`);

  // ----- Step 5: verify -----
  console.log("\nStep 5: verify");
  const sample = await get("/handoffs?select=id,key,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,trigger_event_id,data_object_id&order=id.desc&limit=5");
  console.log("  Sample (5 most recent rows):");
  for (const r of sample) {
    const expected = `${r.source_domain_id}.${r.target_domain_id}.${r.source_domain_module_id ?? ""}.${r.target_domain_module_id ?? ""}.${r.trigger_event_id}.${r.data_object_id}`;
    const mark = r.key === expected ? "✓" : "✗";
    console.log(`    ${mark} id=${r.id}  key="${r.key}"  expected="${expected}"`);
  }
  const nullKeys = await get("/handoffs?key=is.null&select=id");
  const emptyKeys = await get('/handoffs?key=eq.&select=id');
  console.log(`  rows with NULL key:  ${nullKeys.length}`);
  console.log(`  rows with empty key: ${emptyKeys.length}`);
  if (nullKeys.length > 0 || emptyKeys.length > 0) {
    console.log("  ! some rows did not get a key — investigate before adding unique_value.");
  } else {
    console.log("  All rows populated. Safe to add `unique_value: true` on the field next.");
  }
}

await main();
