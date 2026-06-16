/**
 * Add catalog-UX schema to `domain_map`:
 *   - `domains.catalog_tagline`     (string, nullable)  — one-sentence buyer-facing tagline
 *   - `domains.catalog_description` (text, nullable)    — 1-3 paragraph buyer-facing description
 *   - new entity `domain_aliases` (mirrors data_object_aliases shape)
 *     - domain_id       (parent FK to domains)
 *     - alias           (string, required)
 *     - alias_type      (enum: synonym / industry_term / solution_term, default synonym)
 *     - record_status   (enum: new / pending / approved / rejected, default new)
 *     - notes           (text, nullable) — per Rule #15, populated only with user approval
 *
 * Rule #20 governs the two catalog_* columns: buyer voice, never overwrite without
 * explicit user approval. Per-domain audit gains check A4 to flag empties.
 *
 * Aliases are NOT globally unique. Composite uniqueness on (domain_id, alias) is
 * loader-enforced; the catalog schema does not currently expose multi-column
 * unique constraints via create_field's single-field unique_value flag.
 *
 * Idempotent: skips any field/entity that already exists.
 *
 * Run from project root: bun run scripts/loaders/add_catalog_ux_schema.ts
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
  payload: Record<string, any>
): Promise<void> {
  const existing = await get(
    `/fields?table_name=eq.${table}&field_name=eq.${field}&select=field_name`
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

async function ensureEntity(table: string, payload: Record<string, any>): Promise<void> {
  const existing = await get(`/entities?table_name=eq.${table}&select=table_name`);
  if (existing.length > 0) {
    console.log(`  = entity ${table} already exists, skipped`);
    return;
  }
  const result = await call("crud", "create_entity", {
    data: { table_name: table, ...payload },
  });
  if (!result.ok) throw new Error(`create_entity ${table} failed: ${result.stderr}`);
  console.log(`  + entity ${table} created`);
}

async function main() {
  console.log("Add catalog UX schema — 2026-05-30");
  console.log("====================================\n");

  console.log("Step 1: ensure domains.catalog_tagline");
  await ensureField("domains", "catalog_tagline", {
    title: "Catalog Tagline",
    description:
      "One buyer-facing sentence for catalog list cards. Workflow + value framing, not analyst voice. See Rule #20.",
    format: "string",
    field_order: 1000022,
  });

  console.log("\nStep 2: ensure domains.catalog_description");
  await ensureField("domains", "catalog_description", {
    title: "Catalog Description",
    description:
      "1-3 paragraph buyer-facing marketing description for catalog detail page. Buyer voice, not analyst voice. See Rule #20.",
    format: "text",
    field_order: 1000025,
  });

  console.log("\nStep 3: ensure entity domain_aliases");
  await ensureEntity("domain_aliases", {
    singular: "domain_alias",
    plural: "domain_aliases",
    singular_label: "Domain Alias",
    plural_label: "Domain Aliases",
    module_id: 1001,
    description:
      "Universal trigger phrases for a domain. Industry synonyms, vendor-specific terms, colloquial names. Feeds catalog search index and per-domain skill runtime triggering. Mirrors data_object_aliases shape.",
  });

  console.log("\nStep 4: ensure domain_aliases fields");
  await ensureField("domain_aliases", "domain_id", {
    title: "Domain",
    format: "parent",
    reference_table: "domains",
    field_order: 10,
  });

  await ensureField("domain_aliases", "alias", {
    title: "Alias",
    description:
      "The synonym, industry term, or vendor-specific name for this domain.",
    format: "string",
    field_order: 20,
  });

  await ensureField("domain_aliases", "alias_type", {
    title: "Alias Type",
    description: "Discriminator: which kind of alias this is",
    format: "enum",
    enum_values: ["synonym", "industry_term", "solution_term"],
    default_value: "synonym",
    field_order: 30,
  });

  await ensureField("domain_aliases", "record_status", {
    title: "Record Status",
    format: "enum",
    enum_values: ["new", "pending", "approved", "rejected"],
    default_value: "new",
    field_order: 40,
  });

  await ensureField("domain_aliases", "notes", {
    title: "Notes",
    description:
      "Optional free-form notes. Empty by default. Per Rule #15, populate only with explicit per-row user approval.",
    format: "text",
    field_order: 50,
  });

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
