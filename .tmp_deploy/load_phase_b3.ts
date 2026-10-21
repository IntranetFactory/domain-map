#!/usr/bin/env bun
// Phase B3 loader — lifecycle states + pattern flags
//
// Parses the 7 cluster draft markdown files (p_b3_<X>_draft.md) and:
//   1. PATCHes data_objects.has_personal_content / has_submit_lock / has_single_approver
//   2. INSERTs data_object_lifecycle_states rows (chunked bulk insert per loader-idiom)
//
// Idempotent: reads existing lifecycle states first; skips any (data_object_id, state_name)
// already present. PATCH is unconditional (overwrites) since flags are booleans.
//
// Pass --execute to actually write; default is dry-run.

export {};

import { readFileSync, existsSync } from "node:fs";

const ROOT = "c:/dev/domain-map";
const DRAFT_DIR = `${ROOT}/.tmp_deploy`;
const CLUSTERS = [
  "A_core_people",
  "B_people_programs",
  "C_recruiting",
  "D_it",
  "E_customer",
  "F_commerce",
  "G_procurement_signing",
];

const EXECUTE = process.argv.includes("--execute");
const DRY_RUN = !EXECUTE;

type Row = Record<string, unknown>;

async function pg(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Row = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${method} ${path}: ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map((r) => {
    const out: Row = {};
    for (const k of keys) out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return out;
  });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const result = await pg("POST", path, slice);
    if (Array.isArray(result)) out.push(...result);
  }
  return out;
}

// ---- parse a draft file ----

type ParsedEntity = {
  data_object_name: string;
  has_personal_content: boolean;
  has_submit_lock: boolean;
  has_single_approver: boolean;
  justification: string;
  is_static_reference: boolean;
  lifecycle_states: ParsedState[];
  source_cluster: string;
};

type ParsedState = {
  state_name: string;
  state_order: number;
  is_initial: boolean;
  is_terminal: boolean;
  requires_permission: boolean;
  permission_verb_override: string;
  description: string;
};

function parseBool(s: string): boolean {
  return s.trim().toLowerCase() === "true";
}

function parseDraft(cluster: string, text: string): ParsedEntity[] {
  // Split on lines beginning with `### `
  const lines = text.split(/\r?\n/);
  const entities: ParsedEntity[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const heading = /^###\s+([a-z0-9_]+)\s*$/.exec(line);
    if (!heading) {
      i++;
      continue;
    }
    const name = heading[1];
    i++;
    // Read until next `### ` or end of file
    const block: string[] = [];
    while (i < lines.length && !/^###\s+[a-z0-9_]+\s*$/.test(lines[i])) {
      block.push(lines[i]);
      i++;
    }
    const blockText = block.join("\n");

    const isStatic = /\*\*\(static-reference: no lifecycle\)\*\*/i.test(blockText);

    // Pattern flags line: **Pattern flags:** has_personal_content=true; has_submit_lock=false; has_single_approver=false
    const flagsMatch = /\*\*Pattern flags:\*\*\s*has_personal_content=([a-z]+)\s*;\s*has_submit_lock=([a-z]+)\s*;\s*has_single_approver=([a-z]+)/i.exec(
      blockText,
    );
    if (!flagsMatch) {
      console.warn(`  [WARN] ${cluster}/${name}: missing Pattern flags line`);
      continue;
    }
    const has_personal_content = parseBool(flagsMatch[1]);
    const has_submit_lock = parseBool(flagsMatch[2]);
    const has_single_approver = parseBool(flagsMatch[3]);

    const justMatch = /\*\*Justification:\*\*\s*(.+?)(?:\n\n|\n\*\*|$)/s.exec(blockText);
    const justification = justMatch ? justMatch[1].trim() : "";

    const entity: ParsedEntity = {
      data_object_name: name,
      has_personal_content,
      has_submit_lock,
      has_single_approver,
      justification,
      is_static_reference: isStatic,
      lifecycle_states: [],
      source_cluster: cluster,
    };

    if (!isStatic) {
      // Parse the lifecycle table. Rows look like:
      // | state_name | order | initial | terminal | requires_perm | verb_override | description |
      const tableRe =
        /\|\s*([a-z][a-z0-9_]*)\s*\|\s*(\d+)\s*\|\s*([a-zA-Z]+)\s*\|\s*([a-zA-Z]+)\s*\|\s*([a-zA-Z]+)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|/g;
      let m: RegExpExecArray | null;
      while ((m = tableRe.exec(blockText)) !== null) {
        // skip header divider rows — they have non-snake_case 'state_name'
        if (m[1] === "state_name") continue;
        const vo = m[6].trim();
        entity.lifecycle_states.push({
          state_name: m[1],
          state_order: parseInt(m[2], 10),
          is_initial: parseBool(m[3]),
          is_terminal: parseBool(m[4]),
          requires_permission: parseBool(m[5]),
          permission_verb_override: vo === "_" || vo === "" ? "" : vo,
          description: m[7].trim(),
        });
      }
      if (entity.lifecycle_states.length === 0) {
        console.warn(`  [WARN] ${cluster}/${name}: marked non-static but no lifecycle states parsed`);
      }
    }

    entities.push(entity);
  }
  return entities;
}

// ---- main ----

console.log(`Phase B3 loader — ${DRY_RUN ? "DRY RUN" : "EXECUTE"}`);
console.log("");

// 1. Parse all 7 drafts
const allEntities: ParsedEntity[] = [];
for (const c of CLUSTERS) {
  const path = `${DRAFT_DIR}/p_b3_${c}_draft.md`;
  if (!existsSync(path)) {
    console.error(`  [ERROR] missing draft: ${path}`);
    process.exit(1);
  }
  const text = readFileSync(path, "utf-8");
  const parsed = parseDraft(c, text);
  console.log(
    `  ${c}: ${parsed.length} entities (${parsed.filter((e) => e.is_static_reference).length} static, ${parsed.reduce((s, e) => s + e.lifecycle_states.length, 0)} states)`,
  );
  allEntities.push(...parsed);
}
console.log("");
console.log(`Total: ${allEntities.length} entities; ${allEntities.reduce((s, e) => s + e.lifecycle_states.length, 0)} lifecycle states; ${allEntities.filter((e) => e.has_personal_content || e.has_submit_lock || e.has_single_approver).length} with at least one pattern flag set.`);
console.log("");

// 2. Resolve data_object names → ids
const names = [...new Set(allEntities.map((e) => e.data_object_name))];
const namesPath = names.join(",");
const doRows: any[] = await pg(
  "GET",
  `/data_objects?data_object_name=in.(${namesPath})&select=id,data_object_name,has_personal_content,has_submit_lock,has_single_approver`,
);
const idByName = new Map<string, number>(doRows.map((r: any) => [r.data_object_name, r.id]));
const existingFlags = new Map<string, any>(doRows.map((r: any) => [r.data_object_name, r]));

const missing = names.filter((n) => !idByName.has(n));
if (missing.length) {
  console.error(`  [ERROR] data_objects not found in catalog: ${missing.join(", ")}`);
  process.exit(1);
}

// 3. Load existing lifecycle states for these data_objects (for idempotency)
const doIds = [...idByName.values()].join(",");
const existingStates: any[] = await pg(
  "GET",
  `/data_object_lifecycle_states?data_object_id=in.(${doIds})&select=data_object_id,state_name`,
);
const existingKey = new Set<string>(
  existingStates.map((s: any) => `${s.data_object_id}|${s.state_name}`),
);
console.log(`Existing lifecycle states already loaded for in-scope objects: ${existingStates.length}`);

// 4. Build PATCH set for pattern flags (only where flag differs from current)
const flagPatches: { id: number; name: string; payload: Row }[] = [];
for (const e of allEntities) {
  const id = idByName.get(e.data_object_name)!;
  const cur = existingFlags.get(e.data_object_name)!;
  const diff: Row = {};
  if (Boolean(cur.has_personal_content) !== e.has_personal_content) diff.has_personal_content = e.has_personal_content;
  if (Boolean(cur.has_submit_lock) !== e.has_submit_lock) diff.has_submit_lock = e.has_submit_lock;
  if (Boolean(cur.has_single_approver) !== e.has_single_approver) diff.has_single_approver = e.has_single_approver;
  if (Object.keys(diff).length > 0) flagPatches.push({ id, name: e.data_object_name, payload: diff });
}
console.log(`Pattern flag PATCHes to apply: ${flagPatches.length}`);

// 5. Build lifecycle state INSERTs (skip duplicates)
const lifecycleRows: Row[] = [];
let skippedExisting = 0;
for (const e of allEntities) {
  const id = idByName.get(e.data_object_name)!;
  for (const s of e.lifecycle_states) {
    const key = `${id}|${s.state_name}`;
    if (existingKey.has(key)) {
      skippedExisting++;
      continue;
    }
    lifecycleRows.push({
      data_object_id: id,
      state_name: s.state_name,
      state_order: s.state_order,
      is_initial: s.is_initial,
      is_terminal: s.is_terminal,
      requires_permission: s.requires_permission,
      permission_verb_override: s.permission_verb_override,
      description: s.description,
    });
  }
}
console.log(`Lifecycle state INSERTs to apply: ${lifecycleRows.length} (skipped ${skippedExisting} already present)`);
console.log("");

if (DRY_RUN) {
  console.log("[DRY RUN] re-run with --execute to apply.");
  // print first 5 of each as a preview
  console.log("");
  console.log("First 5 flag PATCHes:");
  for (const p of flagPatches.slice(0, 5)) {
    console.log(`  ${p.name} (id ${p.id}): ${JSON.stringify(p.payload)}`);
  }
  console.log("");
  console.log("First 5 lifecycle INSERTs:");
  for (const r of lifecycleRows.slice(0, 5)) {
    console.log(`  ${JSON.stringify(r)}`);
  }
  process.exit(0);
}

// 6. EXECUTE
console.log("Applying flag PATCHes...");
let patchN = 0;
for (const p of flagPatches) {
  await pg("PATCH", `/data_objects?id=eq.${p.id}`, p.payload);
  patchN++;
}
console.log(`  applied ${patchN} PATCHes.`);

console.log("Inserting lifecycle states (chunked)...");
const inserted = await insert("/data_object_lifecycle_states", lifecycleRows);
console.log(`  inserted ${inserted.length} rows.`);
console.log("");
console.log("UI links:");
console.log("  https://tests.semantius.app/domain_map/data_object_lifecycle_states");
console.log("  https://tests.semantius.app/domain_map/data_objects");
