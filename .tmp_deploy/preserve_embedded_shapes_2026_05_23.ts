// Preserve minimum_embedded_shape into data_objects.notes before dropping the column.
// 9 known rows as of 2026-05-23.

type Req = { method: string; path: string; body?: unknown };

async function call(req: Req): Promise<unknown> {
  const payload = JSON.stringify(req);
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(payload);
  await proc.stdin.end();
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`semantius exit ${code}: ${err}\nreq: ${payload}`);
  return out.trim() ? JSON.parse(out) : null;
}

const rows = (await call({
  method: "GET",
  path: "/data_objects?minimum_embedded_shape=neq.&select=id,data_object_name,notes,minimum_embedded_shape&order=id.asc",
})) as Array<{ id: number; data_object_name: string; notes: string; minimum_embedded_shape: string }>;

console.log(`preserving ${rows.length} shapes`);

for (const r of rows) {
  const header = `### Authoring note: minimum embedded-shape contract (archived 2026-05-23)\n\nThis contract was originally stored in the (removed) \`minimum_embedded_shape\` column. Field-level constraints on embedded shells are now enforced by the deployer at deploy time against the canonical entity's \`fields\` metadata; this note is preserved as authoring intent only.\n\n`;
  const mergedNotes = r.notes && r.notes.trim()
    ? `${r.notes}\n\n${header}${r.minimum_embedded_shape}`
    : `${header}${r.minimum_embedded_shape}`;
  await call({
    method: "PATCH",
    path: `/data_objects?id=eq.${r.id}`,
    body: { notes: mergedNotes },
  });
  console.log(`  patched id=${r.id} (${r.data_object_name})`);
}

console.log("\nall shapes preserved.");
