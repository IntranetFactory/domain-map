# Domain full-build research task (read-only; produce a draft, do NOT load)

You are researching ONE enterprise-software domain and producing a complete, load-ready
**draft** for a full Phase A->S build. You do NOT write to the database. You write two files:

- `c:/dev/domain-map/.tmp_deploy/<CODE>-build.json` (the structured draft, schema below)
- `c:/dev/domain-map/.tmp_deploy/<CODE>-build.md` (a <=600-word human summary for review)

## Absolute rules (violating any of these makes your output unusable)

1. **Never call any `mcp__*` tool.** Not `mcp__claude_ai_deno__*`, not `mcp__claude_ai_tests-ops__*`,
   not any MCP-wrapped Semantius surface. They authenticate against the wrong tenant.
2. If you must verify live catalog state, use **read-only** `semantius call crud postgrestRequest '{"method":"GET","path":"/..."}'`
   via the Bash tool ONLY. Do not POST/PATCH/DELETE. Prefer reading the provided footprint file first.
3. **Never use Python.** Not for anything. If you write a helper, it is TypeScript on Bun.
4. **American English. No em-dashes (the long dash). Use commas/colons/parentheses instead.**
5. **You do not load.** No inserts, no loaders that write. Output is the two draft files only.
6. Output strict, parseable JSON (no trailing commas, no comments inside the JSON file).

## Read first

- `c:/dev/domain-map/.tmp_deploy/<CODE>-existing.json` — the domain's CURRENT catalog footprint
  (domain row + metadata, existing capabilities, solutions+vendors, modules, data_objects with
  their role/necessity/entity_type, lifecycle states, trigger_events, in/out handoffs, skills,
  business-function ownership). This is ground truth. **Reuse what exists; never duplicate it.**
- Optionally `c:/dev/domain-map/.claude/skills/domain-map-analyst/references/vendor-research-protocol.md`
  for the Phase 0 vendor-surface method.

## What "full build" means here (only fill the GAPS; the footprint shows what already exists)

Most of these domains already have data_objects, handoffs, vendors/solutions, and a system skill,
but are MISSING capabilities and modules. A few are under-built (few/no masters) and need Phase B too.
Produce only the deltas needed to make the domain complete. For each section, if the footprint already
has it, say so and don't re-propose.

### Phase 0 — vendor surface (research, informs everything below)
Identify 3-5 flagship vendors for this market (include >=1 compliance specialist for regulated markets).
Enumerate the entity surface they model. Use this as a subtraction list when proposing data_objects.

### Phase A — capabilities + vendors/solutions
- **capabilities**: 5-8 noun-phrase market features the domain delivers (e.g. "Event Correlation",
  "Anomaly Detection"). These are NOUNS, not tools/verbs (NOT "send alert"). Code = `<CODE>-<SHORT>`
  (domain-prefixed). If a capability genuinely spans >=3 other domains and vendors market the same
  shape across them, flag it `cross_cutting: true` and propose a domain-neutral code (no prefix).
- **vendors / solutions**: propose ONLY if the footprint has none or is thin (<3 solutions). Reuse an
  existing `vendor_name` where the vendor is already in the catalog (the footprint lists current ones;
  assume common vendors like ServiceNow Inc, Microsoft, etc. may already exist). One flagship product
  row per vendor for this market, each with `coverage_level` = primary|secondary|partial.

### Phase M — modules (Rule #14)
- If the domain will have >=3 capabilities -> propose >=2 `module_kind:"full"` modules. If <3 -> exactly 1.
- Each module: `domain_module_code` (`<CODE>-<SHORT>`), `domain_module_name`, `description` (analyst voice),
  `catalog_tagline` (one buyer-facing sentence), `catalog_description` (1-2 SHORT buyer-facing paragraphs, ~120 words max; never 3),
  `capability_codes` (which caps it realizes; every capability must be realized by >=1 module),
  and `data_objects`: assign EVERY existing master (from the footprint) plus any new ones to a module,
  with `role` (master|embedded_master|consumer|contributor|derived) and `necessity` (required|optional).
  Keep existing consumer/contributor links (don't promote another domain's object to master here).
- **necessity (Rule #16)**: statute-prefixed (fcra_/hipaa_/sox_/gdpr_...) or sector/jurisdiction-bound or
  "some flagship vendors omit it" -> `optional`. Workflow halts without it -> `required`.

### Phase B — only if under-built
If the domain masters few/no data_objects, propose the masters a flagship vendor builds around
(snake_case plural names, scope-qualified to avoid collisions). For each new master: `data_object_name`,
`singular_label`, `plural_label`, `entity_type` (operational_workflow|operational_record|catalog|junction|computed),
`description`, and pattern flags (`has_personal_content`/`has_submit_lock`/`has_single_approver`) where they apply.
Do NOT re-propose data_objects that already exist in the footprint.

### lifecycle states (Rule #12)
For every master with `entity_type:"operational_workflow"` that has NO lifecycle states in the footprint,
propose them: ordered `state_name`s, exactly one `is_initial`, >=1 `is_terminal`, `requires_permission:true`
on gated transitions (approvals, sign-offs). Skip non-workflow entity types.

### Phase S — tools (Rule #17)
- Propose verb-first `tools` keyed to masters: `query_<entity>` + a representative mutate per workflow master.
  `operation_kind`: query/mutate REQUIRE a `data_object_name`; fetch/side_effect/compute REQUIRE null; inbound optional.
- For generic notifications use the abstraction tools `notify_person` / `notify_team`, NOT channel primitives
  (`send_email`, `make_phone_call`), UNLESS a specific channel IS the workflow (then justify in `notes`).
- `module_tools`: which tools each module requires, `requirement_level` required|optional. The domain's
  existing system skill derives its toolset from these.

### Phase E — personas (only if >=2 modules)
Propose 3-6 job-shaped personas: `role_code` = `<FUNCTION-CODE>-<ROLE>` (or no prefix if cross-functional),
`role_name`, `business_function` (or null if cross-functional), `module_codes` (>=2 each, with
`interaction_level` primary|secondary).

### decisions (for the human q- file)
List genuine b2 forks the human must decide: alternative module splits, ownership questions
(e.g. "should X master move to a future domain"), destructive cleanups (re-attributing a mis-placed
trigger_event, overwriting a value), and pattern-flag freezes. Each: `question`, `options` (a/b/c),
`recommended`. Mark the single gating question. Do NOT put additive work here
(capabilities/modules just get loaded); only true decisions.

**Recommendation quality (HARD REQUIREMENT, this is graded).** Every `recommended` MUST be grounded
in EVIDENCE and state the real trade-off. For any decision about market shape (module splits, scope,
ownership, what belongs where), the recommendation MUST cite what flagship vendors actually do, by name:
how 2-3 of the Phase 0 vendors package the domain into products / editions / SKUs, or which vendors model
the entity vs not. Name them (vendor names are fine in audit q-files; Rule #18 only bars them from catalog
text fields). Surface the genuine open judgment honestly (e.g. "vendors disagree on where anomaly detection
sits"). NEVER recommend from build-convenience, "the minimal shape", "what unblocks the build", or "what is
already built" - those are reasons about us, not about the market, and they are unacceptable. A module-split
recommendation with no vendor evidence is a failed deliverable. Put the per-decision vendor evidence in a
`recommended` that a skeptical reviewer would find worth reading.

## JSON schema for `<CODE>-build.json`

```json
{
  "domain_code": "AIOPS",
  "phase0_vendors": [{ "vendor": "BigPanda", "flagship": "BigPanda AIOps", "surface": ["alerts","incidents","..."] }],
  "capabilities": [{ "capability_code": "AIOPS-EVENT-CORR", "capability_name": "Event Correlation", "description": "...", "cross_cutting": false }],
  "vendors_new": [{ "vendor_name": "..." }],
  "solutions_new": [{ "solution_name": "...", "vendor_name": "...", "coverage_level": "primary" }],
  "modules": [{
    "domain_module_code": "AIOPS-EVENT-CORR", "domain_module_name": "Event Correlation",
    "module_kind": "full", "description": "...", "catalog_tagline": "...", "catalog_description": "...",
    "capability_codes": ["AIOPS-EVENT-CORR"],
    "data_objects": [{ "data_object_name": "event_correlations", "role": "master", "necessity": "required", "existing": true }]
  }],
  "new_data_objects": [{ "data_object_name": "...", "singular_label": "...", "plural_label": "...", "entity_type": "...", "description": "...", "has_personal_content": false, "has_submit_lock": false, "has_single_approver": false }],
  "lifecycle_states": [{ "data_object_name": "root_cause_analyses", "states": [{ "state_name": "investigating", "state_order": 1, "is_initial": true, "is_terminal": false, "requires_permission": false }] }],
  "tools": [{ "tool_name": "query_event_correlations", "operation_kind": "query", "data_object_name": "event_correlations" }],
  "module_tools": [{ "domain_module_code": "AIOPS-EVENT-CORR", "tool_name": "query_event_correlations", "requirement_level": "required" }],
  "personas": [{ "role_code": "IT-OPS-SRE", "role_name": "Site Reliability Engineer", "business_function": "IT Operations", "modules": [{ "domain_module_code": "AIOPS-EVENT-CORR", "interaction_level": "primary" }] }],
  "decisions": [{ "id": "MODULE-SPLIT", "gating": true, "question": "How should X be split into modules?", "options": ["a) ...","b) ..."], "recommended": "a. ..." }]
}
```

Keep the markdown summary tight: domain one-liner, capability list, module split, what's new vs reused,
any vendor/solution additions, and the top 2-3 decisions. <=600 words.
