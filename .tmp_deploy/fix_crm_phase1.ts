#!/usr/bin/env bun
// CRM audit Phase 1 fixes (2026-05-25):
//   B4 — set has_personal_content=true on crm_contacts (98) and crm_leads (99).
//   B7 — add a CRM-flavored users→customers ownership edge.
//
// Idempotent: PATCHes are no-ops if values already match; the B7 insert checks
// for an existing CRM-flavored row before posting.

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  return call({ method: "POST", path, body: rows });
}

// ============================================================
// B4 — pattern flags
// ============================================================
console.log("B4: setting has_personal_content=true on crm_contacts (98) and crm_leads (99)");

const b4Targets = [98, 99] as const;
for (const id of b4Targets) {
  await patch(`/data_objects?id=eq.${id}`, { has_personal_content: true });
}

// Verify
const b4Verify = await get(
  `/data_objects?id=in.(98,99)&select=id,data_object_name,has_personal_content`,
);
console.log("  verify:", JSON.stringify(b4Verify));
const allFlipped = b4Verify.every(r => r.has_personal_content === true);
if (!allFlipped) {
  throw new Error(`B4 PATCH did not stick: ${JSON.stringify(b4Verify)}`);
}

// ============================================================
// B7 — users → customers (CRM-flavored)
// ============================================================
console.log("\nB7: ensuring CRM-flavored users→customers ownership edge exists");

const existing = await get(
  `/data_object_relationships?and=(data_object_id.eq.748,related_data_object_id.eq.97)&select=id,relationship_verb,notes`,
);
console.log(`  existing users→customers edges: ${existing.length}`);
for (const e of existing) console.log(`    - id=${e.id} verb=${e.relationship_verb} notes=${e.notes}`);

const crmFlavored = existing.find(e =>
  typeof e.notes === "string" && /\| CRM \|/.test(e.notes),
);

if (crmFlavored) {
  console.log("  CRM-flavored edge already present, skipping");
} else {
  await insert("/data_object_relationships", [
    {
      data_object_id: 748,
      related_data_object_id: 97,
      relationship_verb: "owns",
      inverse_verb: "is_owned_by",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      is_required: true,
      owner_side: "source",
      notes: "users | CRM | account owner (AE / sales rep)",
    },
  ]);
  console.log("  inserted new edge");
}

const afterB7 = await get(
  `/data_object_relationships?and=(data_object_id.eq.748,related_data_object_id.eq.97)&select=id,relationship_verb,notes,is_required`,
);
console.log("  final users→customers edges:");
for (const r of afterB7) console.log(`    - id=${r.id} verb=${r.relationship_verb} is_required=${r.is_required} notes=${r.notes}`);

console.log("\nPhase 1 complete.");
console.log("UI:");
console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(97,98,99)");
console.log("  https://tests.semantius.app/domain_map/data_object_relationships?data_object_id=eq.748&related_data_object_id=eq.97");
