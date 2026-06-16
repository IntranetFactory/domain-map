/**
 * Add `domain_modules.specification_requirements` to `domain_map`.
 *
 * Authored build directives for the modeler/deployer: implementation requirements a
 * deployable's promise depends on that are NOT derivable from the entity graph. The
 * motivating case is a starter / bundle that collapses a multi-entity pattern from the
 * full module into a flat field on a surviving embedded shell (e.g. showback-lite cost:
 * the full SMP/ITAM modules carry spend across separate entities the starter omits, so
 * the starter must denormalize a flat cost field onto asset_contracts / saas_subscriptions
 * or its renewal/cost view cannot resolve). The full field contract still lives on the
 * deployed entities; this column carries the architect's intent, not a field-level copy.
 *
 * Typically populated only on `module_kind='starter'` rows; empty on full modules.
 * Rendered as a dedicated `## Additional Requirements Specification` blueprint section at the
 * overview-to-detail boundary (after the Entity summary, before the Entities catalog) by
 * generate_blueprints.ts. Governed like any authored prose: written into the empty
 * field freely, never overwritten without explicit user approval (cf. Rule #20 shape).
 *
 * Idempotent: skips the field if it already exists.
 *
 * Run from project root: bun run scripts/loaders/add_specification_requirements_2026_06_16.ts
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
  console.log("Add domain_modules.specification_requirements - 2026-06-16");
  console.log("=========================================================\n");

  await ensureField("domain_modules", "specification_requirements", {
    title: "Specification Requirements",
    description:
      "Authored build directives for the modeler/deployer: implementation requirements this deployable's promise depends on that are NOT derivable from the entity graph. Used mainly by starters/bundles that collapse a multi-entity pattern from the full module into a flat field on a surviving embedded shell. Prose intent, not a field-contract copy; the deployer honors it at spec time. Empty by default; never overwrite without explicit user approval.",
    format: "text",
    field_order: 1000028,
  });

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
