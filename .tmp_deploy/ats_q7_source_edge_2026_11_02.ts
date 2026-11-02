#!/usr/bin/env bun
// Applies q7 (B2-HS-SOURCE-EDGE), answered yes by the user on 2026-11-02: a candidate can be saved
// without a known source. Sets is_required false on relationship 812, recruitment_sources attributes
// candidates. The audit record named rel 810 by mistake; 810 is candidates submits job_applications and
// must stay required, so the verb and both endpoints are checked before the write.
// Backs up the row to backups/ first. record_status is never sent. Idempotent.
// Dry-run by default; pass --apply to write.
import { writeFileSync, existsSync } from "node:fs";
import { preflightRelationships } from "../scripts/lib/catalog_invariants.ts";

type Row = Record<string, any>;
const APPLY = process.argv.includes("--apply");
const BACKUP = "backups/ats-q7-source-edge-2026-11-02.json";
const REL = 812;
const RECRUITMENT_SOURCES = 5;
const CANDIDATES = 3;
const USERS = 748;

async function semantius(tool: string, body: unknown): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`semantius ${tool} failed: ${stderr || stdout}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}
const pg = (body: Row) => semantius("postgrestRequest", body);
const read = async (): Promise<Row> => (await pg({ method: "GET", path: `/data_object_relationships?id=eq.${REL}&select=*` }))[0];

const row = await read();
if (!row) throw new Error(`relationship ${REL} not found`);
if (row.data_object_id !== RECRUITMENT_SOURCES || row.related_data_object_id !== CANDIDATES || row.relationship_verb !== "attributes") {
  throw new Error(`relationship ${REL} is not recruitment_sources attributes candidates: ${JSON.stringify(row)}`);
}
if (row.is_required === false) {
  console.log(`  done     relationship ${REL}: already optional`);
  process.exit(0);
}
console.log(`  pending  relationship ${REL} recruitment_sources attributes candidates: is_required true -> false`);

const pre = preflightRelationships([{ ...row, is_required: false }] as any[], { usersId: USERS });
for (const w of pre.warnings) console.log(`  warn ${typeof w === "string" ? w : JSON.stringify(w)}`);
if (pre.errors.length > 0) {
  for (const e of pre.errors) console.error(`  ERROR ${typeof e === "string" ? e : JSON.stringify(e)}`);
  process.exit(1);
}

if (!APPLY) {
  console.log("\nDry run. Pass --apply to write.");
  process.exit(0);
}

if (!existsSync(BACKUP)) writeFileSync(BACKUP, JSON.stringify({ taken_at: new Date().toISOString(), rows: [row] }, null, 2));
await pg({ method: "PATCH", path: `/data_object_relationships?id=eq.${REL}`, body: { is_required: false } });

const after = await read();
if (after.is_required !== false) {
  console.error(`relationship ${REL} did not verify: ${JSON.stringify(after)}`);
  process.exit(1);
}
console.log(`  ok  relationship ${REL}: is_required false, owner_side ${after.owner_side}, kind ${after.relationship_kind}`);
console.log("https://tests.semantius.app/domain_map/data_object_relationships");
