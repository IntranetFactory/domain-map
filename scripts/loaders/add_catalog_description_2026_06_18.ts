/**
 * Add `data_objects.catalog_description` to `domain_map`.
 *
 * A short, reader-facing one-to-two-sentence summary of a data object, distinct from
 * the analyst-facing `data_objects.description`. The blueprint Entity summary (§2 of
 * generate_blueprints.ts) renders this column, falling back to `description` when it is
 * empty, so the public catalog surface can read cleanly while `description` stays the
 * richer field that feeds the agent-facing domain skill spec (emit_skill_spec.ts) and the
 * B13 entity_type keyword heuristic.
 *
 * This mirrors the `catalog_description` pattern already on `domains` / `domain_modules`,
 * but the data_objects flavor is deliberately SHORTER: 1-2 sentences describing what the
 * entity is, not the 1-3 buyer-marketing paragraphs those tables carry.
 *
 * Governed like other authored prose (Rule #20 shape): the empty field is written freely;
 * a non-empty value is never overwritten without explicit user approval.
 *
 * Idempotent: skips the field if it already exists.
 *
 * Run from project root: bun run scripts/loaders/add_catalog_description_2026_06_18.ts
 */

type CmdResult = { ok: boolean; data: any; stderr: string; code: number };

async function call(server: string, tool: string, payload: any): Promise<CmdResult> {
  const proc = Bun.spawn(["semantius", "call", server, tool], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
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

async function ensureField(
  table: string,
  field: string,
  payload: Record<string, any>,
): Promise<void> {
  const existing = await get(
    `/fields?table_name=eq.${table}&field_name=eq.${field}&select=field_name`,
  );
  if (existing.length > 0) {
    console.log(`  = ${table}.${field} already exists, skipped`);
    return;
  }
  const result = await call("crud", "create_field", {
    data: { table_name: table, field_name: field, ...payload },
  });
  if (!result.ok) throw new Error(`create_field ${table}.${field} failed: ${result.stderr}`);
  console.log(`  + ${table}.${field} created`);
}

async function main() {
  console.log("Add data_objects.catalog_description - 2026-06-18");
  console.log("================================================\n");

  await ensureField("data_objects", "catalog_description", {
    title: "Catalog Description",
    description:
      "Short reader-facing summary of this data object (1 to 2 sentences) for the catalog Entity summary surface. Plain descriptive voice (what the entity is), distinct from the analyst-facing `description`. Empty by default; fill the empty field freely, but never overwrite a non-empty value without explicit user approval (Rule #20 shape).",
    format: "text",
    field_order: 1000010,
  });

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
