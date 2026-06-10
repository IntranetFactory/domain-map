# Platform provenance fields (hand-off spec)

## Purpose

Add catalog-lineage columns to the deployment-side platform built-in tables so skill
discovery can map a deployed module/entity back to its catalog concept **deterministically**,
instead of guessing by name/slug and asking the user. This turns rename detection, omission
detection, and custom-vs-known classification from heuristics into a join.

## How these are applied

These are **not** zod or hand-written DDL. In Semantius the schema is data: a column is a
`fields` row. Each item below is added with the `semantius` CLI against a built-in table:

```
semantius call crud create_field '{ "table_name": "...", "field_name": "...", ... }'
```

Run from the project root (the CLI reads `.env` from cwd). Field vocabulary follows the
platform `fields` model (`format`, `input_type`, `default_value`, `enum_values`,
`unique_value`, `is_core`, ...).

Conventions used here:
- **Nullability:** `input_type: "default"` leaves the column nullable. `"required"` would force
  NOT NULL. All provenance fields are nullable (empty = "no provenance / custom").
- **Uniqueness:** `unique_value: true` creates a partial unique index that already excludes
  null/empty values.
- **Enums:** `format: "enum"` plus `enum_values`.
- **System fields:** `is_core: true` (these are platform provenance fields on built-in tables).

All fields are additive and default to empty, so existing rows read empty and discovery falls
back to today's heuristic matching for them. The heuristic layer stays as the fallback.

---

## Tier 1 - required (deterministic discovery)

| table_name | field_name | title | format | input_type | default_value | unique_value | is_core |
|---|---|---|---|---|---|---|---|
| `modules` | `catalog_module_code` | Catalog Module Code | `string` | `default` | `""` | `true` | `true` |
| `entities` | `catalog_entity_code` | Catalog Entity Code | `string` | `default` | `""` | `false` | `true` |

**`modules.catalog_module_code`** - stable catalog `domain_module_code` this module was
provisioned from (e.g. `ATS-CANDIDATE-CRM`; for a starter, the starter code such as
`REAL-ESTATE-AGENT`). Discovery joins on this instead of `module_slug`, so renaming the slug or
name no longer breaks scoping and starters are found regardless of packaging. Empty = locally
created, not catalog-provisioned. Unique per tenant (a catalog module deploys at most once; the
partial index excludes empty).

**`entities.catalog_entity_code`** - stable catalog `data_object_name` (e.g. `job_applications`).
The back-reference that makes a rename deterministic: a row's `table_name` may be `applications`
while this stays `job_applications`. Empty = custom entity. Not unique (a shared entity like
`users` recurs across modules).

```json
{
  "table_name": "modules",
  "field_name": "catalog_module_code",
  "title": "Catalog Module Code",
  "description": "Stable catalog domain_module_code this module was provisioned from (e.g. ATS-CANDIDATE-CRM; for a starter, the starter code). Discovery joins on this instead of module_slug. Empty = locally created, not catalog-provisioned.",
  "format": "string",
  "input_type": "default",
  "default_value": "",
  "unique_value": true,
  "searchable": false,
  "is_core": true
}
```

```json
{
  "table_name": "entities",
  "field_name": "catalog_entity_code",
  "title": "Catalog Entity Code",
  "description": "Stable catalog data_object_name this entity was provisioned from (e.g. job_applications). Back-reference for rename detection: table_name may differ. Empty = custom entity.",
  "format": "string",
  "input_type": "default",
  "default_value": "",
  "unique_value": false,
  "searchable": false,
  "is_core": true
}
```

---

## Tier 2 - recommended

| table_name | field_name | title | format | enum_values | input_type | default_value | is_core |
|---|---|---|---|---|---|---|---|
| `entities` | `entity_class` | Entity Class | `enum` | `["master","reference","transaction","log","junction"]` | `default` | `""` | `true` |
| `modules` | `catalog_domain_code` | Catalog Domain Code | `string` | - | `default` | `""` | `true` |

**`entities.entity_class`** - intrinsic data class, mainly to auto-classify **custom** entities
(where `catalog_entity_code` is empty) without asking each time. Orthogonal to the catalog's
per-module `role` (master/embedded_master/consumer); do not overload them. Empty = unclassified.
Values:
- `master` - core business entity the module is about (candidates, requisitions)
- `reference` - relatively static lookup data (locations, sources, categories)
- `transaction` - operational records with a lifecycle (applications, offers)
- `log` - append-only audit/history/event rows, not user-edited
- `junction` - M:N link table

**`modules.catalog_domain_code`** - owning catalog `domain_code` (e.g. `ATS`) for single-domain
modules. **Leave empty for cross-domain starters/bundles** (e.g. REAL-ESTATE-AGENT spans
CLM + CRM + RE-BROKERAGE); resolve those from `catalog_module_code`. Convenience denormalization
only; `catalog_module_code` is the real key.

```json
{
  "table_name": "entities",
  "field_name": "entity_class",
  "title": "Entity Class",
  "description": "Intrinsic data class, primarily for classifying custom entities (catalog_entity_code empty). Orthogonal to the catalog per-module role. Empty = unclassified.",
  "format": "enum",
  "enum_values": ["master", "reference", "transaction", "log", "junction"],
  "input_type": "default",
  "default_value": "",
  "is_core": true
}
```

```json
{
  "table_name": "modules",
  "field_name": "catalog_domain_code",
  "title": "Catalog Domain Code",
  "description": "Owning catalog domain_code (e.g. ATS) when the module belongs to exactly one domain. Empty for cross-domain starters/bundles; resolve those via catalog_module_code.",
  "format": "string",
  "input_type": "default",
  "default_value": "",
  "searchable": false,
  "is_core": true
}
```

---

## Tier 3 - optional (field-level determinism, defer if scoping)

| table_name | field_name | title | format | input_type | default_value | is_core |
|---|---|---|---|---|---|---|
| `fields` | `catalog_field_code` | Catalog Field Code | `string` | `default` | `""` | `true` |

**`fields.catalog_field_code`** - stable catalog field name (e.g. `status`), so field
renames/omissions become detectable instead of learned on first runtime failure. Ship after
Tier 1.

```json
{
  "table_name": "fields",
  "field_name": "catalog_field_code",
  "title": "Catalog Field Code",
  "description": "Stable catalog field name this column was provisioned from. Back-reference for field-level rename detection. Empty = custom field.",
  "format": "string",
  "input_type": "default",
  "default_value": "",
  "searchable": false,
  "is_core": true
}
```

---

## Optional audit field (nice-to-have, not required)

| table_name | field_name | title | format | input_type | default_value | is_core |
|---|---|---|---|---|---|---|
| `modules` | `catalog_snapshot` | Catalog Snapshot | `string` | `default` | `""` | `true` |

**`modules.catalog_snapshot`** - catalog snapshot/version that last stamped this module's
provenance (e.g. `catalog-2026-06-08`), for drift audits and deployer re-stamp decisions. Skip
for the minimal set.

```json
{
  "table_name": "modules",
  "field_name": "catalog_snapshot",
  "title": "Catalog Snapshot",
  "description": "Catalog snapshot/version that last stamped this module's provenance (e.g. catalog-2026-06-08). For drift audits and deployer re-stamp decisions.",
  "format": "string",
  "input_type": "default",
  "default_value": "",
  "searchable": false,
  "is_core": true
}
```

---

## Dependencies (or the columns sit empty)

1. **Blueprint format** must carry the stable codes (`domain_module_code`, `data_object_name`,
   field names) so there is something to stamp.
2. **Deployer** (semantic-model-deployer) must write these onto `modules` / `entities` / `fields`
   at provision time.

Manual/admin-created tables leave the catalog code empty, which correctly marks them as custom.

## Notes

- These are platform-wide additions to **core built-in tables**, so this is a platform-team
  operation, not a per-tenant edit. Apply each `create_field` once.
- Discovery behavior once present: prefer the provenance join (deterministic); fall back to the
  existing name/alias/label heuristic only for rows where the catalog code is empty.
- Open question before running: confirm whether the deployer already stashes any lineage (in
  `modules.settings` or `description`) that could be promoted instead of adding fresh columns.

## Execution status (2026-06-10, tenant `adenin`)

Applied via `semantius call crud create_field`. 5 of 6 fields created and verified live:
`modules.catalog_module_code` (unique), `entities.catalog_entity_code`, `entities.entity_class`,
`modules.catalog_domain_code`, `modules.catalog_snapshot`. Existing rows backfilled to empty.

- **`fields.catalog_field_code` is blocked (Tier 3).** `create_field` cannot add a column to the
  `fields` meta-table itself: the call holds an open cursor on `fields` while validating, then
  fails to `ALTER` the same table in the same session with `(55006) cannot ALTER TABLE "fields"
  because it is being used by active queries in this session`. Deterministic, not transient; a
  standalone retry fails identically. Do **not** work around it with a raw `postgrestRequest`
  INSERT into `fields`, that records the metadata row without running the `ALTER TABLE`, leaving a
  phantom column. It needs a platform-team migration that runs the `ALTER TABLE fields ADD COLUMN
  catalog_field_code text NOT NULL DEFAULT ''` and inserts the matching `fields` row outside the
  self-referential request path.
- **Nullability:** the platform created all fields as `NOT NULL DEFAULT ''`, not nullable. Empty
  string still means "no provenance / custom" and the partial unique index excludes empty, so the
  intent holds; the convention note above (`input_type: "default"` leaves nullable) does not match
  observed behavior on this platform.
- **Scope:** applied to the `adenin` tenant only. Platform-wide rollout to other tenants / the
  platform image remains a separate platform-team step.
- **Open question resolved:** no pre-existing lineage was stashed in `modules.settings`
  (generic jsonb) for the only deployed-adjacent module (`domain_map`), so nothing to promote.
