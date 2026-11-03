#!/usr/bin/env bun
// Removes two handoff claims from the Hiring Starter description, approved by the user on 2026-11-03.
//   domain_modules 154: nothing acts on a handoff, so "it reacts when a background check is flagged" and
//   "an accepted offer hands the new hire to HCM" promise behavior that does not exist.
// The row is checked against its expected value before any write and backed up to backups/ first.
// record_status and notes are never sent. Idempotent. Dry-run by default; pass --apply to write.
import { writeFileSync, existsSync } from "node:fs";
import { preflightAuthoredText } from "../scripts/lib/catalog_invariants.ts";

type Row = Record<string, any>;
const APPLY = process.argv.includes("--apply");
const BACKUP = "backups/hiring-starter-overview-handoff-claims-2026-11-03.json";
const ID = 154;
const CODE = "HIRING-STARTER";
const FROM = "Entry-tier deployable for a basic hiring workflow: post jobs, capture applications, run interviews, and make offers. Embeds the canonical masters from the full ATS modules and inherits their lifecycle states and gated steps, which it governs under its own permission prefix. Leaves out the requisition approval chain, background-check processing (it reacts when a background check is flagged), and the pre-employee record (an accepted offer hands the new hire to HCM). When the full ATS modules are installed, its entities move to them without data migration.";
const TO = "Entry-tier deployable for a basic hiring workflow: post jobs, capture applications, run interviews, and make offers. Embeds the canonical masters from the full ATS modules and inherits their lifecycle states and gated steps, which it governs under its own permission prefix. Leaves out the requisition approval chain, background-check processing, and the pre-employee record. When the full ATS modules are installed, its entities move to them without data migration.";

async function pg(body: Row): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`postgrestRequest failed: ${stderr || stdout}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}
const read = async (): Promise<Row> => (await pg({ method: "GET", path: `/domain_modules?id=eq.${ID}&select=*` }))[0];

const before = await read();
const problems: string[] = [];
if (!before || before.domain_module_code !== CODE) problems.push(`domain_modules ${ID} is not ${CODE}: ${JSON.stringify(before?.domain_module_code)}`);
const pending = before?.description === FROM;
if (before?.description === TO) console.log(`  done     ${CODE}.description`);
else if (pending) console.log(`  pending  ${CODE}.description\n    old: ${FROM}\n    new: ${TO}`);
else problems.push(`${CODE}.description holds an unexpected value: ${before?.description}`);

const text = preflightAuthoredText([{ id: ID, description: TO }], { table: "domain_modules" });
for (const err of text.errors) problems.push(typeof err === "string" ? err : JSON.stringify(err));
if (TO.includes(String.fromCharCode(0x2014))) problems.push(`${CODE}.description contains an em-dash`);
if (problems.length > 0) {
  console.error(`refusing to write:\n${problems.join("\n")}`);
  process.exit(1);
}

if (!APPLY) {
  console.log("\nDry run. Pass --apply to write.");
  process.exit(0);
}

if (!existsSync(BACKUP)) {
  writeFileSync(BACKUP, JSON.stringify({ taken_at: new Date().toISOString(), rows: [{ key: `domain_modules#${ID}`, row: before }] }, null, 2));
}

if (pending) await pg({ method: "PATCH", path: `/domain_modules?id=eq.${ID}`, body: { description: TO } });

// Verify: the row holds the new value, and no other column moved.
const after = await read();
const failed: string[] = [];
if (after.description !== TO) failed.push(`${CODE}.description is ${after.description}`);
for (const k of Object.keys(before)) {
  if (k === "updated_at" || k === "search_vector" || k === "description") continue;
  if (JSON.stringify(after[k]) !== JSON.stringify(before[k])) failed.push(`${CODE}.${k} changed`);
}
console.log(`  ok  ${CODE}: record_status ${after.record_status}`);
if (failed.length > 0) {
  console.error(`did not verify:\n${failed.join("\n")}`);
  process.exit(1);
}
console.log("https://domain-map.semantius.app/domain_map/domain_modules");
