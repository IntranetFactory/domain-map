# Tool Catalog — module shape reference

Per-entity field shapes for the `tool_catalog` module (Semantius slug `tool_catalog`, id `1002`). Verified against the live schema; auto-generated fields (`id`, `created_at`, `updated_at`, label columns) are omitted — never set them on insert, they're managed by the platform.

`record_status` is on every entity, is an enum (`new` / `pending` / `approved` / `rejected`), and **defaults to `"new"`**. Omit it on insert unless explicitly setting a different value the user has signed off on.

If anything here conflicts with the live schema, trust the live schema and update this file:

```bash
semantius call crud postgrestRequest '{"method":"GET","path":"/fields?table_name=eq.<name>&is_core=eq.false&select=field_name,format,reference_table,enum_values,is_nullable,default_value&order=field_order.asc"}'
```

---

## Core concepts

### `tools`

| Field | Format | Required | Notes |
|---|---|---|---|
| `description` | multiline | yes | |
| `operation_kind` | enum | yes | Default `query`. Values: `query` (read structured business data), `mutate` (write structured business data), `side_effect` (external action with no business-data return — send_email, create_calendar_event), `compute` (pure computation / AI / web automation). Drives the 100% Semantius derivation |
| `data_object_id` | reference → `domain_map.data_objects` | no | **Required when `operation_kind ∈ {query, mutate}`; must be null when `operation_kind ∈ {side_effect, compute}`.** Enforced by paired validation rules `data_object_only_when_query_or_mutate` and `data_object_required_when_query_or_mutate`. Resolve cross-module by `data_object_name` |
| `record_status` | enum | yes | Default `new` |

Label column: `tool_name` (lowercase snake_case verb form — `send_email`, `query_invoices`, `transcribe_audio`).

### `skills`

| Field | Format | Required | Notes |
|---|---|---|---|
| `description` | multiline | yes | |
| `skill_type` | enum | yes | Default `system`. Values: `system` (mirrors one Domain Map domain one-to-one), `process` (orchestrates a cross-domain handoff cluster), `role` (wraps a specific user-role workflow) |
| `domain_id` | reference → `domain_map.domains` | no | **Required when `skill_type = 'system'`; null otherwise.** Enforced by `domain_required_when_skill_type_is_system`. Resolve cross-module by `domain_code` |
| `record_status` | enum | yes | Default `new` |

Label column: `skill_name` (lowercase snake_case or kebab-case — `domain-map-analyst`, `onboarding-process`, `lead-to-cash`).

### `tool_solutions` (junction: `tools` ↔ `domain_map.solutions`)

| Field | Format | Required | Notes |
|---|---|---|---|
| `tool_id` | parent → `tools` | yes | Cascade on delete |
| `solution_id` | parent → `domain_map.solutions` | yes | Cascade on delete. Cross-module reference |
| `delivery_strength` | enum | yes | Default `native`. Values: `native` (first-class capability), `partial` (covers most but not all use cases), `via_extension` (requires add-on / marketplace plugin), `not_supported` (recorded for completeness; excluded from coverage queries) |
| `delivery_method` | enum | yes | Default `mcp_server`. Values: `mcp_server` (preferred shape), `rest_api`, `sdk`, `cli` |
| `endpoint_url` | url | yes | MCP server URL or API base when known. Empty string acceptable |
| `notes` | multiline | yes | |
| `record_status` | enum | yes | Default `new` |

Label column: `tool_solution_label` (computed: `<tool_name> via <solution_name>`; auto-disabled in the UI).

> **Uniqueness:** `(tool_id, solution_id)` is intended unique per junction row. The platform's native unique annotation is single-column; multi-column unique is a forward-looking §7.2 item. Until then, caller-side dedup is the contract — read before insert.

### `skill_tools` (junction: `skills` ↔ `tools`)

| Field | Format | Required | Notes |
|---|---|---|---|
| `skill_id` | parent → `skills` | yes | Cascade on delete |
| `tool_id` | parent → `tools` | yes | Cascade on delete |
| `requirement_level` | enum | yes | Default `required`. Values: `required` (tool must be available; without it the skill cannot function), `optional` (improves the skill; degrades gracefully without it), `fallback` (invoked only when a preferred tool is unavailable) |
| `notes` | multiline | yes | Workflow context for this requirement, e.g. "called per matched invoice to notify the SaaS owner" |
| `record_status` | enum | yes | Default `new` |

Label column: `skill_tool_label` (computed: `<skill_name> needs <tool_name>`; auto-disabled in the UI).

> **Uniqueness:** `(skill_id, tool_id)` is intended unique per junction row, same caveat as `tool_solutions`.

---

## Cross-module references (sibling: `domain_map`, id 1001)

| FK | Target | Resolved by |
|---|---|---|
| `tools.data_object_id` | `domain_map.data_objects` | `data_object_name` |
| `skills.domain_id` | `domain_map.domains` | `domain_code` |
| `tool_solutions.solution_id` | `domain_map.solutions` | `solution_name` |

`domain_map.solutions` carries a sibling field `solution_kind` (added with this module). Values: `semantius_native`, `external_connector`, `action`, `compute_service`, `standard_solution` (default). The 100% Semantius derivation joins through this column.

---

## Permissions

Two-permission baseline (no admin tier, no workflow tiers):

| Permission | Hierarchy parent | Used by |
|---|---|---|
| `tool_catalog:read` | `tool_catalog:manage` | every entity (view_permission) |
| `tool_catalog:manage` | — | every entity (edit_permission) |

Default roles: `tool_catalog_viewer` (carries `:read`), `tool_catalog_manager` (carries `:manage`).
