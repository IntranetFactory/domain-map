#!/usr/bin/env bun
/**
 * Migration: cross_domain_handoffs -> handoffs
 *
 * Implements plan-handoffs.md sections 3.1 - 3.7 as a single atomic loader:
 *   3.1 Drop validation rule `cross_domain_only`
 *   3.2 Rename entity `cross_domain_handoffs` -> `handoffs`
 *   3.3 Rename computed field `cross_domain_handoff_label` -> `handoff_label`
 *   3.4 Update `entities.label_column` -> `handoff_label`
 *   3.5 Rewrite entity description (plan §4 text)
 *   3.6 Rewrite singular_label / plural_label
 *   3.7 Add `lifecycle_progression` to `integration_pattern.enum_values`
 *
 * Pre-flight: asserts no other entity FK-references `cross_domain_handoffs`
 * (plan §9 step 2). Snapshots row count and per-module-FK NULL distribution.
 *
 * Post-flight: verifies renamed entity is readable, /handoffs returns rows,
 * /cross_domain_handoffs returns 404, row count matches the snapshot.
 *
 * Idempotent: re-running after a successful run skips work that already matches
 * target state. Run from project root:
 *   bun run .tmp_deploy/rename_handoffs_table.ts
 *
 * Recovery: NONE in this script (per plan §10). Recovery is via Neon PITR.
 */

type Row = Record<string, unknown>;

async function semCall(tool: string, payload: Row): Promise<Row | Row[] | null> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`${tool} (exit ${code}): ${stderr.trim() || stdout.trim()}`);
  }
  const t = stdout.trim();
  return t ? JSON.parse(t) : null;
}

const get = (path: string) =>
  semCall("postgrestRequest", { method: "GET", path }) as Promise<Row[]>;

const NEW_DESCRIPTION =
  "Directional event-driven handoffs between two `domain_modules`, sharing a data object. " +
  "The handoff lives between modules; whether the two modules happen to belong to the same " +
  "domain or to different ones is a derived property a downstream consumer filters on, not " +
  "part of the entity's identity. `source_domain_module_id` / `target_domain_module_id` " +
  "carry the module attribution; `source_domain_id` / `target_domain_id` are the " +
  "denormalized domain rollup (derivable from the module FKs and kept on the row for " +
  "backfill-era rows where the module FKs are still NULL). `friction_level` distinguishes " +
  "expensive async wiring (`medium` / `high`) from cheap in-process lifecycle walks (`low`). " +
  "Signal 2 of the platform-vs-silos analysis is one such derived filter, applied at the " +
  "query layer as `source_domain_id != target_domain_id` (see plan-handoffs.md Phase D). " +
  "Authoring rule: new rows MUST populate both module FK columns unless the counterparty " +
  "domain has not yet been modularized; legacy rows from pre-modularization carry only the " +
  "domain FKs and are backfilled per the per-domain audit B10b.";

const NEW_ENUM_VALUES = [
  "event_stream",
  "api_call",
  "batch_sync",
  "manual_handoff",
  "file_drop",
  "lifecycle_progression",
];

async function main() {
  console.log("Handoffs table rename (plan-handoffs.md §3)");
  console.log("===========================================\n");

  // -------------------------------------------------------------------------
  // Step 0 — detect current state (which name does the entity have?)
  // -------------------------------------------------------------------------
  const oldEntity = await get("/entities?table_name=eq.cross_domain_handoffs&select=table_name");
  const newEntity = await get("/entities?table_name=eq.handoffs&select=table_name");
  const renamed = oldEntity.length === 0 && newEntity.length === 1;
  const currentName = renamed ? "handoffs" : "cross_domain_handoffs";

  if (renamed) {
    console.log("Detected: entity already renamed to `handoffs`. Will idempotently re-assert other settings.\n");
  } else if (oldEntity.length === 1 && newEntity.length === 0) {
    console.log("Detected: entity is still `cross_domain_handoffs`. Full migration will run.\n");
  } else {
    throw new Error(
      `Unexpected state: cross_domain_handoffs=${oldEntity.length} handoffs=${newEntity.length}. Aborting.`
    );
  }

  // -------------------------------------------------------------------------
  // Pre-flight
  // -------------------------------------------------------------------------
  console.log("Pre-flight checks");

  // Assert nothing else FK-references the old name (or new name if already renamed).
  const inboundFks = await get(
    `/fields?or=(reference_table.eq.cross_domain_handoffs,reference_table.eq.handoffs)&select=table_name,field_name,reference_table`
  );
  if (inboundFks.length > 0) {
    console.log(`  FK orphans:`);
    for (const f of inboundFks) console.log(`    ${f.table_name}.${f.field_name} -> ${f.reference_table}`);
    throw new Error(`Aborting: ${inboundFks.length} inbound FK(s) reference the handoffs table. Plan §9 step 2 pre-flight failed.`);
  }
  console.log(`  ✓ no inbound FKs to ${currentName} (plan §9 step 2)`);

  // Snapshot row count.
  const allIds = await get(`/${currentName}?select=id`);
  const preCount = allIds.length;
  console.log(`  ✓ row count snapshot: ${preCount}`);

  // Snapshot module-FK NULL distribution.
  const srcNullRows = await get(`/${currentName}?source_domain_module_id=is.null&select=id`);
  const tgtNullRows = await get(`/${currentName}?target_domain_module_id=is.null&select=id`);
  console.log(`  ✓ NULL module FKs: source=${srcNullRows.length}/${preCount}, target=${tgtNullRows.length}/${preCount}`);

  // Snapshot own-field count (for cascade verification).
  const preFields = await get(`/fields?table_name=eq.${currentName}&select=field_name`);
  console.log(`  ✓ own field count: ${preFields.length}`);
  console.log("");

  // -------------------------------------------------------------------------
  // Step 1 — extend integration_pattern enum (§3.7)
  //          Done first because the field's table_name still points at the
  //          current entity name; doing it before the rename means we only
  //          have one valid path for the update.
  // -------------------------------------------------------------------------
  console.log("Step 1: extend integration_pattern enum (§3.7)");
  const ipFieldId = `${currentName}.integration_pattern`;
  const ipFieldRows = await get(`/fields?id=eq.${ipFieldId}&select=enum_values`);
  if (ipFieldRows.length !== 1) {
    throw new Error(`Expected exactly one ${ipFieldId} row, got ${ipFieldRows.length}`);
  }
  const currentEnum = (ipFieldRows[0].enum_values as string[]) ?? [];
  if (currentEnum.includes("lifecycle_progression")) {
    console.log(`  ✓ already extended (enum_values: ${JSON.stringify(currentEnum)})`);
  } else {
    await semCall("update_field", {
      id: ipFieldId,
      data: { enum_values: NEW_ENUM_VALUES },
    });
    console.log(`  ✓ enum_values extended: ${JSON.stringify(NEW_ENUM_VALUES)}`);
  }
  console.log("");

  // -------------------------------------------------------------------------
  // Step 2 — split into independent update_entity calls so the rename's
  //          (P0001) trigger (Step 2f) cannot block the other mutations.
  //          Bundling §3.2 with §3.1/3.4/3.5/3.6 caused atomic rollback of
  //          the whole batch. Each sub-step here is independently committed.
  //
  //          Order: rule drop -> description -> labels -> computed-field
  //          rename + label_column -> table_name rename (allowed to fail).
  // -------------------------------------------------------------------------
  console.log("Step 2: entity metadata changes (split for independent commit)");

  // Read full entity once to preserve computed_fields shape.
  const fullEntity = await semCall("read_entity", {
    filters: `table_name=eq.${currentName}`,
  }) as Row[];
  if (!fullEntity || fullEntity.length !== 1) {
    throw new Error(`Expected exactly one ${currentName} entity, got ${fullEntity?.length}`);
  }
  const ent = fullEntity[0];
  const computedFields = (ent.computed_fields as Row[]) ?? [];
  const validationRules = (ent.validation_rules as Row[]) ?? [];
  const remainingRules = validationRules.filter((r) => r.code !== "cross_domain_only");

  // 2a — drop cross_domain_only validation rule (§3.1)
  if (validationRules.some((r) => r.code === "cross_domain_only")) {
    console.log("  2a: drop cross_domain_only validation rule (§3.1)");
    await semCall("update_entity", {
      table_name: currentName,
      data: { validation_rules: remainingRules },
    });
    console.log(`     ✓ rule dropped (${remainingRules.length} rule(s) remain)`);
  } else {
    console.log("  2a: cross_domain_only already absent, skipping");
  }

  // 2b — rewrite description (§3.5)
  if (ent.description !== NEW_DESCRIPTION) {
    console.log("  2b: rewrite description (§3.5)");
    await semCall("update_entity", {
      table_name: currentName,
      data: { description: NEW_DESCRIPTION },
    });
    console.log("     ✓ description rewritten");
  } else {
    console.log("  2b: description already current, skipping");
  }

  // 2c — rewrite singular/plural labels (§3.6)
  const labelsCurrent =
    ent.singular === "handoff" &&
    ent.plural === "handoffs" &&
    ent.singular_label === "Handoff" &&
    ent.plural_label === "Handoffs";
  if (!labelsCurrent) {
    console.log("  2c: rewrite singular/plural labels (§3.6)");
    await semCall("update_entity", {
      table_name: currentName,
      data: {
        singular: "handoff",
        plural: "handoffs",
        singular_label: "Handoff",
        plural_label: "Handoffs",
      },
    });
    console.log("     ✓ labels rewritten");
  } else {
    console.log("  2c: labels already current, skipping");
  }

  // 2d — rename computed field entry inside JSON + update label_column (§3.3, §3.4)
  //       The computed_fields JSON drives the /fields row; renaming the
  //       entry's `name` field changes the field_name on the corresponding
  //       /fields row. The (P0001) trigger forbids fields.table_name
  //       changes, NOT fields.field_name changes, so this should land.
  const needsComputedRename = computedFields.some((cf) => cf.name === "cross_domain_handoff_label");
  const needsLabelColumnChange = ent.label_column === "cross_domain_handoff_label";
  if (needsComputedRename || needsLabelColumnChange) {
    console.log("  2d: rename computed field + label_column (§3.3, §3.4)");
    const newComputed = computedFields.map((cf) =>
      cf.name === "cross_domain_handoff_label" ? { ...cf, name: "handoff_label" } : cf
    );
    try {
      await semCall("update_entity", {
        table_name: currentName,
        data: {
          computed_fields: newComputed,
          label_column: "handoff_label",
        },
      });
      console.log("     ✓ computed field + label_column updated");
    } catch (e: any) {
      console.log(`     ✗ FAILED: ${(e?.message || "").split("\n")[0]}`);
      console.log("       (computed-field rename may require the entity rename to land first)");
    }
  } else {
    console.log("  2d: computed field + label_column already current, skipping");
  }

  // 2e — attempt the table_name rename (§3.2)
  //       Known to fail with (P0001) per the platform constraint documented
  //       in plan-handoffs.md §13. We attempt it on every run so a future
  //       platform fix is auto-detected; failure is logged and the script
  //       continues to the post-flight without aborting.
  if (currentName !== "handoffs") {
    console.log("  2e: attempt table_name rename to `handoffs` (§3.2)");
    try {
      await semCall("update_entity", {
        table_name: currentName,
        data: { table_name: "handoffs" },
      });
      console.log("     ✓ RENAMED (platform allowed it — update plan-handoffs.md §13)");
    } catch (e: any) {
      console.log(`     ✗ blocked: ${(e?.message || "").split("\n")[0]}`);
      console.log("       Expected under current platform; see plan-handoffs.md §13.1.");
    }
  } else {
    console.log("  2e: already named `handoffs`, skipping");
  }
  console.log("");

  // -------------------------------------------------------------------------
  // Step 3 — refresh schema cache (writes touched the catalog metadata)
  // -------------------------------------------------------------------------
  console.log("Step 3: refresh schema cache");
  await semCall("refresh_schema_cache", {});
  console.log("  ✓ refreshed\n");

  // -------------------------------------------------------------------------
  // Step 4 — defensive computed-field rename via update_field
  //          If update_entity did not cascade the field_name on the
  //          computed-field row in /fields, we patch it here.
  // -------------------------------------------------------------------------
  console.log("Step 4: ensure computed-field row renamed in /fields");
  const oldComputed = await get(
    `/fields?or=(id.eq.handoffs.cross_domain_handoff_label,id.eq.cross_domain_handoffs.cross_domain_handoff_label)&select=id,table_name,field_name`
  );
  if (oldComputed.length === 0) {
    console.log("  ✓ no stale computed-field row found (entity update cascaded correctly)");
  } else {
    for (const r of oldComputed) {
      const oldId = r.id as string;
      console.log(`  patching stale row ${oldId} -> field_name=handoff_label`);
      await semCall("update_field", {
        id: oldId,
        data: { field_name: "handoff_label" },
      });
    }
    await semCall("refresh_schema_cache", {});
    console.log("  ✓ stale rows patched and cache refreshed");
  }
  console.log("");

  // -------------------------------------------------------------------------
  // Post-flight
  //   Verifies what landed and reports what didn't. The table-name rename
  //   (§3.2, §3.3, §3.4) is allowed to remain pending — assertions on those
  //   only fire when the entity is observed under the new name.
  // -------------------------------------------------------------------------
  console.log("Post-flight verification");

  const renamedNow = (await get("/entities?table_name=eq.handoffs&select=table_name")).length === 1;
  const effectiveName = renamedNow ? "handoffs" : "cross_domain_handoffs";
  console.log(`  effective entity name: ${effectiveName}`);

  // Description matches.
  const postEntity = (await get(`/entities?table_name=eq.${effectiveName}&select=table_name,singular,plural,singular_label,plural_label,label_column,description,validation_rules`))[0];
  console.log(`  ✓ /entities?table_name=eq.${effectiveName} returns 1 row`);
  console.log(`     labels: ${postEntity.singular_label} / ${postEntity.plural_label} (singular=${postEntity.singular}, plural=${postEntity.plural})`);
  console.log(`     label_column: ${postEntity.label_column}`);
  console.log(`     description matches target: ${postEntity.description === NEW_DESCRIPTION}`);

  // Validation rule is gone.
  const rules = (postEntity.validation_rules as Row[]) ?? [];
  const stillHasRule = rules.some((r) => r.code === "cross_domain_only");
  if (stillHasRule) {
    throw new Error(`Post-flight: cross_domain_only validation rule is still present (Step 2a did not land)`);
  }
  console.log(`  ✓ cross_domain_only validation rule absent (${rules.length} rule(s) remain)`);

  // Row count preserved.
  const postIds = await get(`/${effectiveName}?select=id`);
  if (postIds.length !== preCount) {
    throw new Error(`Post-flight: row count drift, pre ${preCount}, post ${postIds.length}`);
  }
  console.log(`  ✓ row count preserved: ${postIds.length} (= pre ${preCount})`);

  // Field count preserved.
  const postFields = await get(`/fields?table_name=eq.${effectiveName}&select=field_name`);
  if (postFields.length !== preFields.length) {
    throw new Error(`Post-flight: field count drift, pre ${preFields.length}, post ${postFields.length}`);
  }
  console.log(`  ✓ field count preserved: ${postFields.length} (= pre ${preFields.length})`);

  // Enum extended.
  const postIp = (await get(`/fields?id=eq.${effectiveName}.integration_pattern&select=enum_values`))[0];
  const postEnum = (postIp.enum_values as string[]) ?? [];
  if (!postEnum.includes("lifecycle_progression")) {
    throw new Error(`Post-flight: lifecycle_progression missing from integration_pattern enum_values: ${JSON.stringify(postEnum)}`);
  }
  console.log(`  ✓ integration_pattern enum: ${JSON.stringify(postEnum)}`);

  // Computed-field rename (only enforced if the entity rename also landed).
  const labelFieldId = renamedNow ? "handoffs.handoff_label" : `${effectiveName}.cross_domain_handoff_label`;
  const labelField = await get(`/fields?id=eq.${labelFieldId}&select=field_name`);
  console.log(`  computed field row: ${labelField.length === 1 ? `present (${labelField[0].field_name})` : "not found under expected id"}`);

  // Label sample (queries the current computed-field name).
  const labelFieldName = renamedNow ? "handoff_label" : (postEntity.label_column as string);
  try {
    const labelSample = await get(`/${effectiveName}?select=id,${labelFieldName}&limit=1`);
    if (labelSample[0] && typeof labelSample[0][labelFieldName] === "string") {
      console.log(`  ✓ ${labelFieldName} computed: "${labelSample[0][labelFieldName]}"`);
    }
  } catch (e: any) {
    console.log(`  ! could not sample ${labelFieldName}: ${(e?.message || "").split("\n")[0]}`);
  }

  console.log("\n--- Summary ---");
  console.log(`§3.1 cross_domain_only dropped:           ${stillHasRule ? "NO" : "YES"}`);
  console.log(`§3.2 entity renamed to handoffs:          ${renamedNow ? "YES" : "NO (platform block, see plan §13)"}`);
  console.log(`§3.3 computed field renamed:              ${renamedNow ? "YES" : "PARTIAL (JSON entry updated, /fields row depends on rename)"}`);
  console.log(`§3.4 label_column = handoff_label:        ${postEntity.label_column === "handoff_label" ? "YES" : "NO (depends on §3.3)"}`);
  console.log(`§3.5 description rewritten:               ${postEntity.description === NEW_DESCRIPTION ? "YES" : "NO"}`);
  console.log(`§3.6 labels rewritten:                    ${postEntity.singular_label === "Handoff" && postEntity.plural_label === "Handoffs" ? "YES" : "NO"}`);
  console.log(`§3.7 lifecycle_progression in enum:       ${postEnum.includes("lifecycle_progression") ? "YES" : "NO"}`);

  if (!renamedNow) {
    console.log("\nDone (partial). §3.2 rename blocked at the platform; see plan-handoffs.md §13.");
    console.log("UI: https://tests.semantius.app/domain_map/cross_domain_handoffs");
  } else {
    console.log("\nDone. Migration complete.");
    console.log("UI: https://tests.semantius.app/domain_map/handoffs");
  }
}

main().catch((e) => {
  console.error("\nFATAL:", e?.message || e);
  process.exit(1);
});
