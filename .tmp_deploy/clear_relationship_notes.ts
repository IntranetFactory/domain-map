#!/usr/bin/env bun
// Clear loader-noise from data_object_relationships.notes.
// All 995 non-empty values are loader-provenance tags or schema restatement, none
// editorially requested. Per project doctrine (CLAUDE.md, SKILL.md Rule #15 spirit):
// notes must carry information the schema cannot express. Empty is the default.

export {};

async function pg(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Record<string, unknown> = { method, path };
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
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path}: ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

const rows: { id: number; notes: string }[] = await pg(
  "GET",
  "/data_object_relationships?notes=neq.&select=id,notes&limit=10000",
);
console.log(`fetched ${rows.length} non-empty notes`);

const ids = rows.map((r) => r.id);
const CHUNK = 200;
let cleared = 0;
for (let i = 0; i < ids.length; i += CHUNK) {
  const chunk = ids.slice(i, i + CHUNK);
  await pg(
    "PATCH",
    `/data_object_relationships?id=in.(${chunk.join(",")})`,
    { notes: "" },
  );
  cleared += chunk.length;
  console.log(`  patched ${cleared}/${ids.length}`);
}

const remaining: any[] = await pg(
  "GET",
  "/data_object_relationships?notes=neq.&select=id&limit=10",
);
console.log(`remaining non-empty notes after clear: ${remaining.length}`);
if (remaining.length !== 0) {
  console.log("sample remaining ids:", remaining.map((r) => r.id));
  process.exit(1);
}
console.log("done.");
