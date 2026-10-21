#!/usr/bin/env bun
// Migration:
//   1. domain_data_objects.mastery_role → domain_data_objects.role
//      Enum: {primary, secondary, derived} → {master, contributor, consumer, derived}
//      Data: primary → master (the 14 ATS rows just loaded)
//      Default: "" → "master"
//   2. Create new entity cross_domain_handoffs with fields + cross-domain constraint
//
// Idempotent: each step checks current state before acting. Safe to re-run.

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

async function semCall(tool: string, payload: Row, opts: { single?: boolean } = {}): Promise<Row | Row[] | null> {
  const args = ["semantius"];
  if (opts.single) args.push("--single");
  args.push("call", "crud", tool);
  const proc = Bun.spawn(args, {
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
    if (opts.single && code === 1) return null; // not found
    throw new Error(`${tool} (exit ${code}): ${stderr || stdout}`);
  }
  const t = stdout.trim();
  return t ? JSON.parse(t) : null;
}

const get = (path: string) => semCall("postgrestRequest", { method: "GET", path }) as Promise<Row[]>;
const patch = (path: string, body: Row) => semCall("postgrestRequest", { method: "PATCH", path, body }) as Promise<Row[]>;
const post = (path: string, body: Row | Row[]) => semCall("postgrestRequest", { method: "POST", path, body }) as Promise<Row[]>;

const MODULE_ID = 1001;
const MODULE_SLUG = "domain_map";
const READ_PERM = `${MODULE_SLUG}:read`;
const MANAGE_PERM = `${MODULE_SLUG}:manage`;

// =============================================================================
// PART 1 — mastery_role → role on domain_data_objects
// =============================================================================
async function migrateRoleField() {
  console.log("\n=== Part 1: mastery_role → role on domain_data_objects ===");

  // Current state lookup (handles re-runs)
  const fields = await get("/fields?table_name=eq.domain_data_objects&or=(field_name.eq.mastery_role,field_name.eq.role)&select=id,field_name,enum_values,default_value,title");
  if (fields.length === 0) {
    throw new Error("Neither mastery_role nor role exists on domain_data_objects — schema is unexpected");
  }
  const current = fields[0];
  const currentName = current.field_name as string;
  const currentId = current.id as string;
  console.log(`  current field: ${currentName} (enum=${JSON.stringify(current.enum_values)}, default="${current.default_value}")`);

  const SUPERSET = ["primary", "secondary", "derived", "master", "contributor", "consumer"];
  const FINAL = ["master", "contributor", "consumer", "derived"];

  // Step A: expand enum to superset so existing 'primary' rows stay valid during remap
  console.log("  step A: expand enum to superset (keeps existing rows valid)");
  await semCall("update_field", {
    id: currentId,
    data: { enum_values: SUPERSET },
  });

  // Step B: remap data primary → master, secondary → contributor (latter is precautionary; no rows currently)
  console.log("  step B: remap data primary→master, secondary→contributor");
  const remap1 = await patch(`/domain_data_objects?${currentName}=eq.primary`, { [currentName]: "master" });
  console.log(`    ${remap1.length} rows: primary → master`);
  const remap2 = await patch(`/domain_data_objects?${currentName}=eq.secondary`, { [currentName]: "contributor" });
  console.log(`    ${remap2.length} rows: secondary → contributor`);

  // Verify no rows still hold legacy values
  const stragglers = await get(`/domain_data_objects?or=(${currentName}.eq.primary,${currentName}.eq.secondary)&select=id`);
  if (stragglers.length > 0) {
    throw new Error(`step B: ${stragglers.length} rows still hold legacy values — aborting`);
  }

  // Step C: restrict enum to final set + set default
  console.log("  step C: restrict enum to final set + default 'master'");
  await semCall("update_field", {
    id: currentId,
    data: {
      enum_values: FINAL,
      default_value: "master",
      description: "The domain's role with respect to this data object: master (authoritative owner of some slice), contributor (writes some fields without being authoritative), consumer (reads only), derived (produces computed projections only).",
    },
  });

  // Step D: rename field_name and title
  if (currentName === "mastery_role") {
    console.log("  step D: rename mastery_role → role (and title 'Mastery Role' → 'Role')");
    await semCall("update_field", {
      id: currentId,
      data: { field_name: "role", title: "Role" },
    });
  } else {
    console.log("  step D: field already named 'role', skipping rename");
  }

  // Final verification
  const verify = await get("/fields?table_name=eq.domain_data_objects&field_name=eq.role&select=field_name,enum_values,default_value,title");
  console.log(`  ✓ final state: ${JSON.stringify(verify[0])}`);
  const rowsCheck = await get("/domain_data_objects?domain_id=eq.56&select=role&limit=20");
  console.log(`  ✓ ${rowsCheck.length} ATS junction rows, role values: ${[...new Set(rowsCheck.map(r => r.role))].join(", ")}`);
}

// =============================================================================
// PART 2 — cross_domain_handoffs entity
// =============================================================================
async function createCrossDomainHandoffs() {
  console.log("\n=== Part 2: cross_domain_handoffs entity ===");

  const existing = await get("/entities?table_name=eq.cross_domain_handoffs&select=table_name");
  if (existing.length === 0) {
    console.log("  creating entity cross_domain_handoffs");
    const computedLabel = {
      name: "cross_domain_handoff_label",
      description: "Composed: <source_domain> → <target_domain> : <trigger_event>. Recomputed on every write so parent renames flow through.",
      source_module: MODULE_SLUG,
      jsonlogic: {
        set_record: ["s", "domains", { var: "source_domain_id" },
          { set_record: ["t", "domains", { var: "target_domain_id" },
            { cat: [{ var: "s.domain_name" }, " → ", { var: "t.domain_name" }, " : ", { var: "trigger_event" }] }
          ] }
        ],
      },
    };
    const validationRule = {
      code: "cross_domain_only",
      message: "source_domain and target_domain must be different — intra-domain events are not handoffs",
      description: "Enforces the cross-domain-only invariant. A handoff exists *between* domains; an event whose source and target are the same domain is internal workflow, captured elsewhere.",
      source_module: MODULE_SLUG,
      jsonlogic: {
        "!=": [{ "var": "source_domain_id" }, { "var": "target_domain_id" }],
      },
    };
    await semCall("create_entity", {
      data: {
        table_name: "cross_domain_handoffs",
        singular: "cross_domain_handoff",
        plural: "cross_domain_handoffs",
        singular_label: "Cross-Domain Handoff",
        plural_label: "Cross-Domain Handoffs",
        label_column: "cross_domain_handoff_label",
        description: "Directional event-driven handoffs between two distinct domains, sharing a data object. Captures the integration friction that an integrated platform would absorb: each row is a pipeline / API call / human handoff that exists today because the source and target domains live in separate systems. Signal 2 of the platform-vs-silos analysis (Signal 1 is the multi-master count on domain_data_objects.role). Intra-domain events are out of scope by design — see the cross_domain_only validation rule.",
        module_id: MODULE_ID,
        view_permission: READ_PERM,
        edit_permission: MANAGE_PERM,
        audit_log: false,
        computed_fields: [computedLabel],
        validation_rules: [validationRule],
      },
    });
    console.log("  ✓ entity created");
  } else {
    console.log("  entity already exists, skipping create");
  }

  // Fields
  const existingFields = new Set(
    (await get("/fields?table_name=eq.cross_domain_handoffs&select=field_name")).map(r => String(r.field_name)),
  );
  console.log(`  existing fields: ${[...existingFields].join(", ")}`);

  type FieldSpec = {
    field_name: string;
    title: string;
    format: string;
    description?: string;
    enum_values?: string[];
    default_value?: string;
    reference_table?: string;
    reference_delete_mode?: string;
    relationship_label?: string;
    input_type?: string;
    field_order?: number;
  };

  const fieldSpecs: FieldSpec[] = [
    {
      field_name: "source_domain_id",
      format: "parent",
      title: "Source Domain",
      description: "The domain that emits the trigger event.",
      reference_table: "domains",
      reference_delete_mode: "cascade",
      relationship_label: "emits handoff to",
      field_order: 1000005,
    },
    {
      field_name: "target_domain_id",
      format: "parent",
      title: "Target Domain",
      description: "The domain that receives the event and creates / mutates state in response.",
      reference_table: "domains",
      reference_delete_mode: "cascade",
      relationship_label: "receives handoff from",
      field_order: 1000007,
    },
    {
      field_name: "data_object_id",
      format: "parent",
      title: "Data Object",
      description: "The data object that flows or is created as a result of the handoff.",
      reference_table: "data_objects",
      reference_delete_mode: "cascade",
      relationship_label: "is transferred via",
      field_order: 1000009,
    },
    {
      field_name: "trigger_event",
      format: "text",
      title: "Trigger Event",
      description: "The named event the source domain emits, in dotted-lowercase (e.g. 'offer.accepted', 'incident.resolved', 'requisition.approved'). Acts as the row's discriminator when a (source, target, data_object) triple has multiple legitimate handoffs.",
      input_type: "required",
      field_order: 1000011,
    },
    {
      field_name: "integration_pattern",
      format: "enum",
      title: "Integration Pattern",
      description: "How the handoff is implemented today across the silo boundary.",
      enum_values: ["event_stream", "api_call", "batch_sync", "manual_handoff", "file_drop"],
      default_value: "api_call",
      field_order: 1000013,
    },
    {
      field_name: "friction_level",
      format: "enum",
      title: "Friction Level",
      description: "Proxy for the cost of maintaining this handoff today. High friction is where integrated-platform value is greatest.",
      enum_values: ["low", "medium", "high"],
      default_value: "medium",
      field_order: 1000015,
    },
    {
      field_name: "description",
      format: "multiline",
      title: "Description",
      description: "What actually happens at the handoff: payload, downstream consequences, known failure modes.",
      input_type: "required",
      field_order: 1000017,
    },
    {
      field_name: "notes",
      format: "multiline",
      title: "Notes",
      field_order: 1000019,
    },
    {
      field_name: "record_status",
      format: "enum",
      title: "Record Status",
      enum_values: ["new", "pending", "approved", "rejected"],
      default_value: "new",
      field_order: 1000021,
    },
  ];

  for (const f of fieldSpecs) {
    if (existingFields.has(f.field_name)) {
      console.log(`    field ${f.field_name}: already exists, skipping`);
      continue;
    }
    console.log(`    creating field ${f.field_name}`);
    await semCall("create_field", {
      data: { ...f, table_name: "cross_domain_handoffs" },
    });
  }

  console.log("  ✓ fields synced");
}

await migrateRoleField();
await createCrossDomainHandoffs();

console.log("\n✓ Migration complete.");
console.log("UI:");
console.log("  https://tests.semantius.app/domain_map/domain_data_objects");
console.log("  https://tests.semantius.app/domain_map/cross_domain_handoffs");
