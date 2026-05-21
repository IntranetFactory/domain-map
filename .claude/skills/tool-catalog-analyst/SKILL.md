---
name: tool-catalog-analyst
description: >-
  Manage the live Semantius `tool_catalog` module (slug `tool_catalog`, id 1002) — tools (JSON-RPC
  function signatures), skills (agent capabilities), and the matrices linking each tool to the
  solutions that deliver it and each skill to the tools it requires. Trigger whenever the user
  wants to add or research tools, draft a vendor coverage matrix, declare what an agent skill
  requires, run the "100% Semantius" derivation, or audit which skills depend on which vendor
  solutions. Specific trigger phrases include "add tool to catalog", "what delivers send_email",
  "is this skill 100% Semantius", "which tools does <skill> need", "draft tool_solutions for
  <vendor>", "find gaps in tool coverage". Use the `use-semantius` skill alongside this one for
  Semantius CLI mechanics.
---

# tool-catalog-analyst

This skill is for extending the **Tool Catalog** — Semantius module slug `tool_catalog`, id `1002`, type `domain`. The Tool Catalog records the side-effect operations agent skills need beyond Semantius core (CRUD + analytics + JsonLogic), and which concrete vendor solutions deliver each one. It sits alongside the `domain_map` master module: tools point at `domain_map.data_objects`, skills point at `domain_map.domains`, and the `tool_solutions` junction points at `domain_map.solutions`.

For platform mechanics (CLI auth, PostgREST encoding, filter syntax, sqlToRest, cube queries), defer to the `use-semantius` skill. For domain / vendor / solution research, defer to the `domain-map-analyst` skill. Design rationale lives in [`plan-tools-catalog.md`](../../../plan-tools-catalog.md).

---

## Hard rules (read before any write)

### 0. Use the `semantius` CLI for every Semantius call. Never the MCP tools.

Same as `domain-map-analyst` rule #0. The project's API key is configured for the `semantius` CLI; MCP-exposed Semantius surfaces (`mcp__claude_ai_deno__*`, `mcp__claude_ai_tests-ops__*`) authenticate against a different scope and hit the wrong tenant. Always shell out to the CLI.

### 1. `record_status` on AI-derived records is `"new"`. Never `"approved"`.

Same as `domain-map-analyst` rule #1. The default is `"new"` — omit the field on insert and let the default kick in. Any non-default value (`approved`, `pending`, `rejected`) requires explicit user confirmation per load. AI-derived tool / skill / junction rows are draft research; the user is the one who marks them reviewed.

### 2. Tools are verb-shaped and vendor-independent.

A tool is a **JSON-RPC function signature**, not a vendor product. Name it in lowercase snake_case as a verb: `send_email`, `query_invoices`, `transcribe_audio`, `create_calendar_event`. Never `microsoft_graph_mail` or `twilio_sms` — those are the *solutions* that deliver the tool, recorded in `tool_solutions`. A correctly-named tool can be delivered by many independent solutions; a vendor-shaped tool name forecloses that.

When in doubt, ask: *can I name three independent solutions that deliver this verb?* If yes, the verb is the tool. If no, it's probably either a sub-capability of a broader verb or a vendor-specific endpoint that doesn't belong as a catalog row.

### 3. `operation_kind` drives the data_object FK.

The four `operation_kind` values split tools into two camps:

- `query` and `mutate` → **read or write structured business data**. These must set `data_object_id` (resolves to `domain_map.data_objects`). The 100% Semantius derivation joins through this FK.
- `side_effect` and `compute` → **no business-data return value**. `data_object_id` must be null.

Enforced by paired validation rules `data_object_only_when_query_or_mutate` and `data_object_required_when_query_or_mutate`. Both fire on every write; setting `data_object_id` on a `side_effect` tool or omitting it on a `query` tool throws at insert time. Decide `operation_kind` first, then the FK follows.

### 4. `solution_kind` is the bridge to the 100% Semantius derivation.

`domain_map.solutions` carries a column `solution_kind` that the Tool Catalog reads:

| Value | Meaning |
|---|---|
| `semantius_native` | The solution IS Semantius itself (a single row, vendor: Semantius). |
| `external_connector` | System of record. Examples: SAP S/4HANA, Oracle NetSuite, Salesforce CRM, Workday HCM. |
| `action` | Side-effect service. Examples: Microsoft 365 (mail / calendar / Teams), Twilio, DocuSign, Stripe. |
| `compute_service` | Compute / AI / web-automation service. Examples: OpenAI Platform, Anthropic API, Playwright. |
| `standard_solution` | Default. Used for solutions not yet integrated as a tool source. |

**A skill is 100% Semantius iff every required tool has at least one `tool_solutions` row pointing at a `semantius_native` solution.** A single `external_connector` / `action` / `compute_service` requirement breaks the certification. Promote a solution out of `standard_solution` only when at least one `tool_solutions` row references it — otherwise it stays at the default.

### 5. Junctions are unique per natural-key pair, but the platform doesn't enforce it.

`(tool_id, solution_id)` on `tool_solutions` and `(skill_id, tool_id)` on `skill_tools` should each appear at most once. The platform's native unique constraint is single-column; multi-column unique is a forward-looking item in §7.2 of the model file. Until then, **caller-side dedup is the contract**: always read by the natural key (or by both FK ids) before inserting a junction row. The reference loaders in [.tmp_deploy/](../../../.tmp_deploy/) follow this pattern.

### 6. NEVER change cwd before invoking `semantius`. Run everything from the project root.

Same as `domain-map-analyst` rule #6 (see [`CLAUDE.md`](../../../CLAUDE.md)). The CLI reads `.env` from cwd; subfolders silently route to the wrong tenant.

### 7. Surface the UI link after any meaningful write.

URL pattern uses the lowercase module slug `tool_catalog`:

```
https://tests.semantius.app/tool_catalog/<table_name>
```

Example: `https://tests.semantius.app/tool_catalog/tools`. Without this link reviewers have no clickable starting point.

---

## Module at a glance

`tool_catalog` is a 4-entity module: two cores plus two junctions.

| Entity | Role | Natural key |
|---|---|---|
| `tools` | JSON-RPC function signatures the agent invokes | `tool_name` |
| `skills` | Agent capabilities that depend on a set of tools | `skill_name` |
| `tool_solutions` | Junction: tool ↔ solution (M:N), with delivery strength + method | `(tool_id, solution_id)` |
| `skill_tools` | Junction: skill ↔ tool (M:N), with requirement level + workflow note | `(skill_id, tool_id)` |

Two-permission baseline: `tool_catalog:read` (every entity's view_permission) and `tool_catalog:manage` (every entity's edit_permission). No admin tier, no workflow tiers, no per-row read scoping. The whole module is reference data curated by hand.

Per-field shapes live in [`references/module-shape.md`](references/module-shape.md). Read that first when drafting any insert.

**Cross-module references** to `domain_map` (id 1001):

| FK | Target | Resolved by |
|---|---|---|
| `tools.data_object_id` | `domain_map.data_objects` | `data_object_name` |
| `skills.domain_id` | `domain_map.domains` | `domain_code` |
| `tool_solutions.solution_id` | `domain_map.solutions` | `solution_name` |

`domain_map.solutions.solution_kind` is the platform-side flag the 100% Semantius derivation joins through.

---

## Workflow for any research task

Three phases, applied to every catalog extension:

### Phase A — Draft the catalog rows

For tools: pick the verb, set `operation_kind`, link the data_object if `query`/`mutate`, write a one-sentence description. For skills: pick the slug, set `skill_type`, link the domain if `system`, write the description.

### Phase B — Wire up the matrices

For each new tool, enumerate the solutions that deliver it and insert `tool_solutions` rows with `delivery_strength` (`native`/`partial`/`via_extension`/`not_supported`) and `delivery_method` (`mcp_server`/`rest_api`/`sdk`/`cli`). Prefer `mcp_server` when an MCP endpoint exists; degrade gracefully through `rest_api`/`sdk`/`cli`.

For each new skill, enumerate the tools it requires and insert `skill_tools` rows with `requirement_level` (`required`/`optional`/`fallback`) and a one-line workflow context note. The matrix of `skill_tools` rows is the input to the 100% Semantius derivation.

### Phase C — Promote `solution_kind` on `domain_map.solutions`

When a `tool_solutions` row points at a `domain_map.solutions` row whose `solution_kind` is still `standard_solution`, PATCH the solution to its right kind (`semantius_native` / `external_connector` / `action` / `compute_service`). This is the only mutation this skill makes outside its own module; it's safe because the column is additive metadata, but **always read the solution first** and confirm with the user before promoting — a tool-source promotion changes how every coverage query reads that solution.

---

## The "100% Semantius" query

A skill is 100% Semantius iff every `skill_tools.tool_id` (where `requirement_level = 'required'`) has at least one `tool_solutions` row whose `solution_id` resolves to a `domain_map.solutions` row with `solution_kind = 'semantius_native'`.

Two saved queries live in `references/` (added in [plan-master-tasks.md P2.6](../../../plan-master-tasks.md)):

- **Certification query** — returns the certified-100%-Semantius skill list.
- **Diagnostic query** — for each non-100% skill, names the specific tool that forces it out (the tool with no `semantius_native` delivery option).

Use the diagnostic when the user asks *why* a skill they expected to be 100% Semantius isn't certified.

---

## Anti-patterns

- ❌ **Vendor-shaped tool names.** `microsoft_graph_send_mail` is a delivery method for `send_email`, not a separate tool. The vendor lives on the `tool_solutions` row.
- ❌ **Setting `data_object_id` on a `side_effect` or `compute` tool.** Validation rule throws at insert. The FK is meaningless for tools with no business-data return.
- ❌ **Omitting `data_object_id` on a `query` or `mutate` tool.** Validation rule throws at insert. The 100% Semantius derivation can't resolve coverage without it.
- ❌ **Loading tool-shaped capability rows in `domain_map.capabilities`.** Capabilities describe what a *solution* covers in a *market*; tools describe what an *agent* can *invoke*. Don't conflate them — the Tool Catalog stays code-shaped (verbs and signatures), the Domain Map stays business-shaped (markets and coverage).
- ❌ **Skipping the read-before-insert step on junctions.** `(tool_id, solution_id)` and `(skill_id, tool_id)` aren't enforced unique by the platform; duplicate junction rows pollute coverage counts silently.
- ❌ **Promoting a `domain_map.solutions` row's `solution_kind` without a tool reference.** Only promote when at least one `tool_solutions` row depends on the new classification. A speculative promotion drifts the field away from its observable use.
- ❌ **Hand-coding numeric ids into a script.** Always resolve by natural key (`tool_name`, `skill_name`, `solution_name`, `data_object_name`, `domain_code`) and capture the id from the read response.
