/**
 * Add `data_object_lifecycle_states.is_high_risk` to `domain_map`.
 *
 * Marks a gated lifecycle state whose gate the admin role does not hold under the `raci`
 * access level, so only the process's Accountable role can take the step (gate permission
 * model, plans/gate-permission-model-plan.md section 3). Meaningful only when
 * `requires_permission=true`. It has no effect at the `gated` level, where the admin holds
 * every gate. The blueprint generator renders it as the §7 `high risk?` column.
 *
 * Additive schema change only: the column defaults to false, so every existing row reads
 * as not high-risk. Marking gates is later data work through the Validate loop.
 *
 * Idempotent: skips the field if it already exists. DRY-RUN by default: prints the
 * payload and writes nothing. Pass --apply to create the field.
 *
 * Run from project root:
 *   bun run scripts/loaders/add_lifecycle_is_high_risk_2026_11_01.ts            # dry run
 *   bun run scripts/loaders/add_lifecycle_is_high_risk_2026_11_01.ts --apply    # execute
 */

const APPLY = process.argv.includes("--apply");

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
  if (!APPLY) {
    console.log(`  ~ would create ${table}.${field}: ${JSON.stringify(payload)}`);
    return;
  }
  const result = await call("crud", "create_field", {
    data: { table_name: table, field_name: field, ...payload },
  });
  if (!result.ok) throw new Error(`create_field ${table}.${field} failed: ${result.stderr}`);
  console.log(`  + ${table}.${field} created`);
}

async function main() {
  console.log(`Add data_object_lifecycle_states.is_high_risk - 2026-11-01${APPLY ? "" : " (dry run)"}`);
  console.log("=====================================================================\n");

  await ensureField("data_object_lifecycle_states", "is_high_risk", {
    title: "Is High Risk",
    description:
      "TRUE when this gated state is high-risk: under the `raci` access level the admin role does not hold its gate, so only the process's Accountable role can take the step. Meaningful only when `requires_permission=true`; no effect at the `gated` level, where the admin holds every gate. Rendered as the `high risk?` column in blueprint §7. Typical high-risk gates: financial approvals, compliance sign-offs, hiring decisions.",
    format: "boolean",
    default_value: "false",
    field_order: 1000052,
  });

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
