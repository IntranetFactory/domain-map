#!/usr/bin/env bun
// Applies the description fix for bug-47 of audits/ATS/hiring-starter-blueprint-review-2026-11-03.md, approved by the user on 2026-11-03.
//   domain_modules 154 (HIRING-STARTER): the last sentence of `description` drops "embedded-master demotion path",
//   a term no Semantius skill defines, and says what happens in the template's own words.
// The row is checked against its expected value before any write and backed up to backups/ first.
// record_status is never sent. Idempotent. Dry-run by default; pass --apply to write.
import { writeFileSync, existsSync } from "node:fs";

type Row = Record<string, any>;
const APPLY = process.argv.includes("--apply");
const BACKUP = "backups/hiring-starter-description-2026-11-03.json";
const MODULE = 154;
const OLD_SENTENCE = "Upgrades to the full ATS modules without tenant data migration via the embedded-master demotion path.";
const NEW_SENTENCE = "When the full ATS modules are installed, its entities move to them without data migration.";

async function pg(body: Row): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`postgrestRequest failed: ${stderr || stdout}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}
const readModule = async (): Promise<Row> => (await pg({ method: "GET", path: `/domain_modules?id=eq.${MODULE}&select=*` }))[0];

const before = await readModule();
if (!before || before.domain_module_code !== "HIRING-STARTER") throw new Error(`module ${MODULE} is not HIRING-STARTER: ${JSON.stringify(before)}`);
const description: string = before.description;
const done = description.endsWith(NEW_SENTENCE);
if (!done && !description.endsWith(OLD_SENTENCE)) throw new Error(`description does not end with the expected sentence: ${description}`);
const target = done ? description : description.slice(0, -OLD_SENTENCE.length) + NEW_SENTENCE;

console.log(`  ${done ? "done   " : "pending"}  HIRING-STARTER description`);
console.log(`  old: ${OLD_SENTENCE}`);
console.log(`  new: ${NEW_SENTENCE}`);

if (!APPLY) {
  console.log("\nDry run. Pass --apply to write.");
  process.exit(0);
}

if (!existsSync(BACKUP)) {
  writeFileSync(BACKUP, JSON.stringify({ taken_at: new Date().toISOString(), domain_modules: [before] }, null, 2));
}

if (!done) await pg({ method: "PATCH", path: `/domain_modules?id=eq.${MODULE}`, body: { description: target } });

// Verify: the row holds the new value, and no other column moved.
const after = await readModule();
const IGNORE = new Set(["updated_at", "search_vector", "description"]);
const problems: string[] = [];
if (after.description !== target) problems.push(`description is ${after.description}`);
for (const k of Object.keys(before)) {
  if (!IGNORE.has(k) && JSON.stringify(after[k]) !== JSON.stringify(before[k])) problems.push(`${k} changed`);
}
if (problems.length > 0) {
  console.error(`did not verify:\n${problems.join("\n")}`);
  process.exit(1);
}
console.log(`  ok  ${after.domain_module_code}: record_status ${after.record_status}, updated ${after.updated_at}`);
console.log(after.description);
console.log("https://domain-map.semantius.app/domain_map/domain_modules");
