#!/usr/bin/env bun
// rename_data_object.ts — Step 3 of plan-generate-blueprints.md.
//
// Renames a single `data_objects.data_object_name` and cascades the impact to
// downstream string references. Foreign-key references (domain_data_objects,
// solution_data_objects, cross_domain_handoffs.data_object_id,
// data_object_relationships, data_object_aliases, data_object_lifecycle_states,
// trigger_events.data_object_id) point by id and need no FK update; the
// load-bearing string cascade is `trigger_events.event_name`, whose dotted
// prefix is the singular form of the data_object_name.
//
// Usage:
//   bun run c:/dev/domain-map/.tmp_deploy/rename_data_object.ts \
//     --old <old_name> --new <new_name> [--execute]
//
// Default is dry-run (prints the cascade plan, no writes). Pass --execute to
// apply the patches. Pre-flight validates that the new name and any rewritten
// event_names do not collide with existing rows.

export {};

import { argv } from "node:process";

const args = new Map<string, string | true>();
for (let i = 2; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith("--")) {
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args.set(key, next);
      i++;
    } else {
      args.set(key, true);
    }
  }
}

const OLD = args.get("old");
const NEW = args.get("new");
const EXECUTE = args.get("execute") === true;

if (typeof OLD !== "string" || typeof NEW !== "string") {
  console.error("Usage: bun run rename_data_object.ts --old <old_name> --new <new_name> [--execute]");
  process.exit(2);
}

console.log(`mode: ${EXECUTE ? "EXECUTE (writes)" : "DRY-RUN (no writes)"}`);
console.log(`rename: ${OLD} → ${NEW}`);
console.log();

type Row = Record<string, unknown>;

async function postgrest(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Row = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path}: ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

function singularize(plural: string): string {
  // Mirror of naivePluralize. Snake_case-aware: only the trailing token matters.
  if (/ies$/.test(plural)) return plural.replace(/ies$/, "y");
  if (/(s|x|z|ch|sh)es$/.test(plural)) return plural.replace(/es$/, "");
  if (/s$/.test(plural)) return plural.replace(/s$/, "");
  return plural; // already singular / irregular
}

// ----- look up source row -----
const rows = await postgrest(
  "GET",
  `/data_objects?data_object_name=eq.${OLD}&select=id,data_object_name,singular_label,plural_label,kind`,
) ?? [];
if (rows.length === 0) {
  console.error(`✗ no data_objects row with data_object_name='${OLD}'`);
  process.exit(3);
}
if (rows.length > 1) {
  console.error(`✗ multiple data_objects with data_object_name='${OLD}' (impossible if natural key holds)`);
  process.exit(3);
}
const srcId = rows[0].id as number;
console.log(`source row: id=${srcId}, kind=${rows[0].kind}, singular_label=${JSON.stringify(rows[0].singular_label)}, plural_label=${JSON.stringify(rows[0].plural_label)}`);

// ----- verify the new name is free -----
const collision = await postgrest("GET", `/data_objects?data_object_name=eq.${NEW}&select=id`) ?? [];
if (collision.length > 0) {
  console.error(`✗ new name '${NEW}' is already used by data_object id=${collision[0].id}`);
  process.exit(4);
}

// ----- derive singular prefixes for event-name rewrite -----
const oldSingular = singularize(OLD);
const newSingular = singularize(NEW);
console.log(`singular prefix: ${oldSingular} → ${newSingular}`);
console.log();

// ----- gather cascade impact -----
const affectedEvents = (await postgrest(
  "GET",
  `/trigger_events?data_object_id=eq.${srcId}&select=id,event_name`,
)) ?? [];
const ddoCount = ((await postgrest(
  "GET",
  `/domain_data_objects?data_object_id=eq.${srcId}&select=id`,
)) ?? []).length;
const sdoCount = ((await postgrest(
  "GET",
  `/solution_data_objects?data_object_id=eq.${srcId}&select=id`,
)) ?? []).length;
const cdhCount = ((await postgrest(
  "GET",
  `/cross_domain_handoffs?data_object_id=eq.${srcId}&select=id`,
)) ?? []).length;
const aliasCount = ((await postgrest(
  "GET",
  `/data_object_aliases?data_object_id=eq.${srcId}&select=id`,
)) ?? []).length;
const lcsCount = ((await postgrest(
  "GET",
  `/data_object_lifecycle_states?data_object_id=eq.${srcId}&select=id`,
)) ?? []).length;
const relSrcCount = ((await postgrest(
  "GET",
  `/data_object_relationships?data_object_id=eq.${srcId}&select=id`,
)) ?? []).length;
const relTgtCount = ((await postgrest(
  "GET",
  `/data_object_relationships?related_data_object_id=eq.${srcId}&select=id`,
)) ?? []).length;

// ----- compute event-name rewrites & check for downstream collisions -----
type EventRewrite = { id: number; from: string; to: string; rewritten: boolean; warning?: string };
const rewrites: EventRewrite[] = [];
for (const ev of affectedEvents) {
  const from = String(ev.event_name);
  const expectedPrefix = `${oldSingular}.`;
  if (!from.startsWith(expectedPrefix)) {
    rewrites.push({ id: ev.id, from, to: from, rewritten: false, warning: `does not start with '${expectedPrefix}' — left untouched` });
    continue;
  }
  const to = `${newSingular}.${from.slice(expectedPrefix.length)}`;
  // collision check
  const cExisting = await postgrest("GET", `/trigger_events?event_name=eq.${to}&id=neq.${ev.id}&select=id`) ?? [];
  rewrites.push({
    id: ev.id,
    from,
    to,
    rewritten: true,
    warning: cExisting.length > 0 ? `collision: trigger_events.id=${cExisting[0].id} already uses '${to}'` : undefined,
  });
}

const collisions = rewrites.filter((r) => r.warning?.startsWith("collision"));

// ----- print the plan -----
console.log("CASCADE PLAN");
console.log("============");
console.log(`  data_objects                 1 row  UPDATE data_object_name = '${NEW}'`);
console.log(`  domain_data_objects          ${ddoCount} row(s)  (no change — FK by id)`);
console.log(`  solution_data_objects        ${sdoCount} row(s)  (no change — FK by id)`);
console.log(`  cross_domain_handoffs        ${cdhCount} row(s)  (no change — FK by id)`);
console.log(`  data_object_relationships    ${relSrcCount} as source, ${relTgtCount} as target  (no change — FK by id)`);
console.log(`  data_object_aliases          ${aliasCount} row(s)  (no change — FK by id)`);
console.log(`  data_object_lifecycle_states ${lcsCount} row(s)  (no change — FK by id)`);
console.log(`  trigger_events.event_name    ${affectedEvents.length} candidate row(s)`);

for (const r of rewrites) {
  const tag = r.warning
    ? r.warning.startsWith("collision") ? "✗ COLLISION" : "⚠ skipped"
    : r.rewritten ? "→ rewrite" : "  no-op";
  const detail = r.warning ?? `${r.from} → ${r.to}`;
  console.log(`    id=${r.id}  ${tag}  ${detail}`);
}

if (collisions.length > 0) {
  console.error(`\n✗ ${collisions.length} event-name collision(s). Aborting; resolve manually.`);
  process.exit(5);
}

// ----- execute -----
if (!EXECUTE) {
  console.log(`\n(dry-run — pass --execute to apply)`);
  process.exit(0);
}

console.log("\nEXECUTING patches");

// 1. Rename data_object
await postgrest("PATCH", `/data_objects?id=eq.${srcId}`, { data_object_name: NEW });
console.log(`  ✓ data_objects.id=${srcId} → name='${NEW}'`);

// 2. Rewrite trigger events
let rewrittenCount = 0;
for (const r of rewrites) {
  if (!r.rewritten) continue;
  await postgrest("PATCH", `/trigger_events?id=eq.${r.id}`, { event_name: r.to });
  console.log(`  ✓ trigger_events.id=${r.id} → event_name='${r.to}'`);
  rewrittenCount++;
}

// 3. Verify post-state
const verify = await postgrest("GET", `/data_objects?id=eq.${srcId}&select=data_object_name`) ?? [];
if (verify.length !== 1 || verify[0].data_object_name !== NEW) {
  console.error(`✗ post-rename verification failed: ${JSON.stringify(verify)}`);
  process.exit(6);
}

console.log(`\n✓ rename complete: ${OLD} → ${NEW}, ${rewrittenCount} trigger_events rewritten.`);
