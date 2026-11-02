#!/usr/bin/env bun
// Step 5 of plans/blueprint-external-links-plan.md (confirmed by the user 2026-11-02): delete the
// old necessity column from domain_module_data_objects and domain_data_objects, after checking no
// row differs from is_install_optional and backing the values up. The delete is permanent.
// Dry-run by default; pass --apply to write.
import { existsSync, writeFileSync } from "node:fs";

const APPLY = process.argv.includes("--apply");
const BACKUP = "backups/necessity-column-2026-11-02.json";
const TABLES = ["domain_module_data_objects", "domain_data_objects"];

async function semantius(tool: string, body: unknown): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`semantius ${tool} failed: ${stderr || stdout}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}
const get = (path: string) => semantius("postgrestRequest", { method: "GET", path });

const existing = await get("/fields?select=id&field_name=eq.necessity");
if (existing.length === 0) {
  console.log("necessity is already gone on both tables");
  process.exit(0);
}

const backup: Record<string, unknown> = { taken_at: new Date().toISOString() };
for (const table of TABLES) {
  const rows = await get(`/${table}?select=id,necessity,is_install_optional&order=id&limit=100000`);
  const differ = rows.filter((r: any) => (r.necessity === "optional") !== Boolean(r.is_install_optional));
  const optional = rows.filter((r: any) => r.necessity === "optional").length;
  console.log(`${table}: ${rows.length} rows, ${optional} optional, ${differ.length} differ`);
  if (differ.length) throw new Error(`${table}: rows differ, not deleting: ${differ.slice(0, 10).map((r: any) => r.id).join(",")}`);
  backup[table] = rows;
}
if (!APPLY) process.exit(0);

if (!existsSync(BACKUP)) {
  writeFileSync(BACKUP, JSON.stringify(backup));
  console.log(`backup written: ${BACKUP}`);
}
await semantius("delete_field", { id: TABLES.map((t) => `${t}.necessity`) });
console.log("necessity fields left:", (await get("/fields?select=id&field_name=eq.necessity")).length);
console.log("is_install_optional fields:", (await get("/fields?select=id&field_name=eq.is_install_optional")).length);
for (const table of TABLES) console.log(table, "true rows:", (await get(`/${table}?select=count()&is_install_optional=eq.true`))[0]?.count);
