---
name: domain-map-analyst
description: >-
  Research, classify, and load enterprise software-market knowledge into the live
  Semantius `domain_map` module (slug `domain_map`, id 1001) — domains, capabilities,
  vendors, point solutions, and the relationships between them. Trigger whenever the
  user wants to extend the domain map with new research, classify entries as domains
  versus sub-features, find point-solution competitors for a market, audit what's
  already loaded, or push market research into the live module. Specific trigger
  phrases include "extend the domain map", "research vendors for X", "what point
  solutions exist in X", "is X a domain?", "add capabilities to Y", "load this
  research into domain_map", "what's in our domain map", "find competitors for Z".
  Also trigger when the user names a vendor, platform, or market category (e.g.
  ServiceNow, Salesforce, IGA, FinOps, vulnerability management) and wants to
  position it in the catalog or compare its coverage. Use the `use-semantius` skill
  alongside this one for the Semantius CLI mechanics.
---

# domain-map-analyst

This skill is for extending the **Domain Map** — Semantius module slug `domain_map`, id `1001`, type `master`. The Domain Map is the organisation's master catalog of enterprise software markets: domains, capabilities, vendors, point solutions, regulations, industries, data objects, and the relationships between them. It is a *master module*, meaning shared reference data that other modules build on, so every row added becomes load-bearing for downstream analysis. Take additions seriously.

For platform mechanics (CLI auth, PostgREST encoding, filter syntax, sqlToRest, cube queries), defer to the `use-semantius` skill which is expected to load alongside this one.

---

## Hard rules (read before any write)

These rules exist because they have already been broken in this project. They are non-negotiable; explain them to the user if there's pushback, don't quietly bypass them.

### 0. Use the `semantius` CLI for every Semantius call. Never the MCP tools.

The project's API key is configured for the `semantius` CLI (reads `.env` from cwd; see rule #6). The MCP server tools (`mcp__claude_ai_deno__*`, `mcp__claude_ai_tests-ops__*`, and any other MCP-exposed Semantius surface) authenticate against a **different** scope and **will not work** with this project's API key — they fail with JWT-audience errors or silently hit the wrong tenant.

**Always shell out to the CLI:**

```bash
semantius call crud postgrestRequest '{"method":"GET","path":"/<table>?..."}'
semantius call crud read_entity     '{"filters":"table_name=eq.<name>"}'
semantius call crud read_field      '{"filters":"table_name=eq.<name>","order":"field_order.asc"}'
```

**Never call:**
- `mcp__claude_ai_deno__*` (read_entity, read_field, postgrestRequest, create_*, update_*, …)
- `mcp__claude_ai_tests-ops__*` (same surface, different MCP server)
- Any other `mcp__*` tool that wraps Semantius

This applies to *every* read and write in this project, including ad-hoc schema lookups during a debugging session. If you reach for an MCP tool out of habit, stop and re-invoke the CLI instead.

### 1. `record_status` on newly-researched records is `"new"`. Never `"approved"`.

`approved` means *a human has looked at this record and decided it's correct*. AI-derived research has not been looked at — it's a draft, even when it looks polished. The canonical state for freshly-loaded research is `new` (or `pending` once it's been formally surfaced for review). The default value on every `record_status` column in this module is already `"new"`, so the cleanest pattern is to **omit the field entirely** when inserting and let the database default kick in.

**Any `record_status` value other than `new` requires explicit user confirmation.** That applies uniformly to `approved`, `pending`, and `rejected` — none of them are something the loader, the parser, the bulk-update script, or you on your own should ever stamp. Only ever change `record_status` when the user has explicitly said "I've reviewed these, mark them approved / rejected / pending" or the equivalent for that specific load. Re-confirm per load — a single past approval is not a standing permission.

**Why this matters:** AI-generated research contains real mistakes — vendor ownership after acquisitions, product renames, market boundaries, ESG-platform vs ESG-tooling overlap. The `record_status` column is the only signal a reviewer has that a row needs eyes on it. Pre-approving everything destroys that signal and silently embeds errors into a master module that other modules build on. This rule was added after every row in the initial ServiceNow load was incorrectly marked `approved`; the user pushed back hard.

### 2. Classify by the "point-solution market" test, not by a vendor's product taxonomy.

Something is a **domain** if and only if independent point-solution vendors compete in it as a recognised software category. APM is a domain (LeanIX, Ardoq, MEGA, Software AG Alfabet, Apptio all sell into it). "Demand Management" usually isn't — it's a feature of an SPM/PPM tool. Don't promote every named workflow inside a large platform to a domain row.

When unsure, ask yourself: *can I name three independent vendors whose flagship product is this?* If yes, it's a domain. If no, capture it as a capability under a parent domain, or fold the concept into the parent domain's description.

The same test applies to ServiceNow's own taxonomy: ServiceNow markets dozens of "workflows" — some are real domains (ITSM, CSM, HRSD), some are sub-features bundled into a larger workflow (DevOps Change inside ITSM, Demand Management inside SPM, Now Assist as cross-cutting AI). Don't import the marketing taxonomy verbatim; classify each entry against the test.

### 3. Junction qualifiers live on the edges, not the cores.

`solution_domains.coverage_level` (`primary` / `secondary` / `partial`), `domain_regulations.applicability`, `domain_data_objects.role` (`master` / `contributor` / `consumer` / `derived`), `business_function_capabilities.responsibility` — these go on the junction rows, never on the parent entity. A solution covers many domains with different strengths; collapsing that onto the solution table would mean either duplicating the solution row per domain or losing the qualifier altogether. Both are wrong.

### 4. Idempotent loads via natural keys.

Every loadable entity in this module has a stable natural key:

| Entity | Natural key |
|---|---|
| `domains` | `domain_code` |
| `vendors` | `vendor_name` |
| `solutions` | `solution_name` |
| `capabilities` | `capability_code` |
| `industries` | `industry_name` (or `industry_code` if present) |
| `regulations` | `regulation_name` (or `regulation_code` if present) |
| `data_objects` | `data_object_name` |

Always follow this pattern:

1. Read existing rows by the natural key
2. Insert only the missing ones
3. Re-read to build a complete `<natural_key> → id` map for downstream foreign-key resolution

This makes re-running a load safe. Numeric IDs are only valid post-insert; never hard-code them into a script.

### 4b. Loaders are TypeScript on Bun. Never Python. Never Bash for anything non-trivial.

Every loader in this project is a `.ts` file run with `bun run <path>`. Stick to that stack:

- **Use TypeScript + Bun** (`Bun.spawn`, `await new Response(...).text()`, top-level `await`). Reference patterns in [.tmp_deploy/load_research.ts](../../../.tmp_deploy/load_research.ts) and the loader index in [references/loader-idiom.md](references/loader-idiom.md).
- **Do NOT use Python.** Python on Windows in this project fails in messy ways: encoding mismatches on stdin/stdout when piping JSON into `semantius`, venv/path drift between PowerShell and bash invocations, indentation errors that hide for whole runs, `subprocess` plumbing that swallows stderr, brittle `requests`/`httpx` pinning. The user has been burned enough times by this that "use Python" is not an acceptable suggestion regardless of context. If you think Python is the right tool, you're wrong — write the TypeScript instead.
- **Don't use Bash/PowerShell scripts** for anything beyond one-liner reads. Multi-step orchestration (read → diff → POST → re-read → POST) belongs in a `.ts` loader, not a shell pipeline. Shell is fine for `semantius call crud postgrestRequest '...'` smoke tests; everything else goes in TypeScript.
- **One-line semantius reads from the agent's tool call are fine** — `semantius call crud postgrestRequest '{"method":"GET","path":"/..."}'` via Bash is the canonical read pattern. The rule is about *loaders* (multi-step write orchestration), not about every CLI invocation.
- **No Python for verification / count summaries either.** "Just piping JSON into `python -c '...'` for a quick count" is exactly the door the rule slams. If a count or per-key tally is worth seeing, do it in TypeScript (`bun run -e '...'` or a `.ts` file), via `jq`, or with PostgREST aggregation params (`Prefer: count=exact`, `select=count(*)`). Never reach for Python "just this once."

When a subagent is given a research/load task, instruct it explicitly to produce TypeScript output and to never propose Python. Phase-B Lite batch 1 (2026-05-22) had no Python issues only because the prompts didn't open the door to it; future prompts should slam the door explicitly.

### 5. Use stdin or chunked inserts on Windows.

`semantius call crud postgrestRequest '...'` with a large JSON body hits the Windows command-line length limit (~32KB). The PostgREST POST in a typical load can easily blow past that. Two fixes:

- **Pipe via stdin** to the CLI: `semantius call crud postgrestRequest` reads JSON from stdin when no inline argument is supplied. Use this from Bun's `Bun.spawn` with `stdin: "pipe"`.
- **Chunk inserts** into batches of ≤50 rows. Simpler when the script is in a hurry.

The reference loader at [.tmp_deploy/load_research.ts](.tmp_deploy/load_research.ts) does both — and the canonical `insert()` helper lives in [references/loader-idiom.md](references/loader-idiom.md) (around line 110). **Start from one of those for any greenfield bulk insert.** Common failure mode: copying a per-row pattern (e.g. from `rename_data_object.ts`, which has its own pre-flight per row) into a greenfield loader. That turns N inserts into N subprocess spawns at ~300ms each — 1,000 rows = 5+ minutes when it should be sub-second. Per-row patterns are correct only when each row needs its own pre-flight against live state; for plain "insert a list of new rows," always use the chunked array-body POST.

### 6. JWT-audience errors: surface the full response verbatim, including the failing tenant ID. Then diagnose.

When a `semantius` call fails with `JWT does not have authorization to access this resource: required audience not found, received ["tenant://<id>"]`, the agent's first obligation is to **show the user the complete error string verbatim, including the `tenant://<id>` value the server received.** Do not summarize, paraphrase, or drop the tenant ID. The tenant ID is the only piece of evidence that distinguishes the possible root causes; eliding it forces the user to re-run the call themselves to see it.

**Mandatory capture format** (paste into the response on every JWT-audience failure):

```
JWT-audience failure
  ts: <ISO timestamp>
  call: semantius call crud <method> '<args>'
  received audience: tenant://<id-from-error>
  full error: <verbatim error string>
```

Also append the same entry to [references/jwt-routing-incidents.md](references/jwt-routing-incidents.md) (create the file with a brief header if it doesn't exist yet) so the incident history is committed and reviewable. Memory is off-limits per [CLAUDE.md](../../../CLAUDE.md) — committed file or nothing.

**Then** diagnose. The known causes, in order of historical frequency:

1. **Wrong cwd.** The CLI reads `SEMANTIUS_API_KEY` / `SEMANTIUS_ORG` from `.env` in the **current working directory**. The project root has the correct `.env`; subfolders like `.claude/skills/domain-map-analyst/`, `.tmp_deploy/`, etc. do not. If you `cd` into a subfolder before invoking the CLI (or before `bun run`-ing a loader script that spawns it), the CLI falls back to a default config pointing at a different tenant. Confirm by checking `pwd` and `ls .env`.
2. **Intermittent server-side routing.** The CLI's MCP transport sometimes routes a request to a tenant the project's API key does not authorize, even when cwd is correct and the `.env` is unchanged. Confirmed pattern (2026-05-23): consecutive `getCurrentUser` calls from the project root with a valid `.env` failed against tenant `1VLl6gULTCGtac6NXImwJewYEqEy061J`, while calls minutes earlier and later succeeded against the project tenant. A simple retry after a short pause is the usual fix; if it keeps failing, surface to the user — don't quietly retry in a loop.
3. **Stale schema cache.** Different audience IDs on consecutive calls (load-balanced across wrong tenants) point at a routing issue rather than cache, but a single `PGRST205 Could not find the table 'public.<table>' in the schema cache` on the first request after a tenant misroute can also surface. Re-running usually clears it.
4. **API-key rotation.** Rare. If `getCurrentUser` succeeds but returns the wrong `email` / `semantius_org` (e.g. `admin@test.com` instead of the project user), the `.env` has been pointed at a different org — check `.env` contents.

**Rules:**

- **Never silently swallow a JWT error.** The full error string (with the `tenant://<id>` value) goes into the user-visible response on the first occurrence in any session. Repeated occurrences in the same session need at minimum the new tenant ID and timestamp.
- Never `cd` into `.claude/skills/...` or `.tmp_deploy/` before running anything that calls `semantius`.
- Invoke loader scripts with an absolute path from the project root: `bun run "<absolute-path-to-loader>"`. Never `cd <skill-folder> && bun run ...`.
- Sanity-check ambiguous cases with `semantius call crud getCurrentUser '{}'` and confirm the `email` and `semantius_org` match the expected project tenant.

**History:** rule originally added after the Salesforce platform load, where `cd`-ing into the skill folder routed every call to the `tests` org user (`admin@test.com`). Expanded 2026-05-23 after JWT failures recurred from the correct cwd with a valid `.env`, against tenant `1VLl6gULTCGtac6NXImwJewYEqEy061J` — the original rule's "always cwd" framing was misleading. The agent at the time also failed to surface the tenant ID in its first user-visible report, which is why the capture format is now mandatory.

### 7. Surface the UI link after any meaningful write.

After loading anything, link the user to the UI for spot-checking. The URL pattern uses the lowercase module slug `domain_map`, **not** the display name "Domain Map":

```
https://tests.semantius.app/domain_map/<table_name>
```

Example: `https://tests.semantius.app/domain_map/solutions`. Without this link reviewers have no clickable starting point.

### 8. `domains` rows need full metadata — never insert with defaults.

The `domains` table has seven business-meaningful columns beyond `domain_code` / `domain_name` / `description` that the API silently accepts as defaults (zeros and empty strings). They are **not** optional metadata — downstream filters and the platform-vs-silos analysis read them. Every new `domains` row must populate:

| Field | What good looks like |
|---|---|
| `crud_percentage` | int 0–100. Share of the domain expressible in JsonLogic (CRUD + state-based workflows + computed fields + ABAC). High = forms-and-workflow market (HRSD/CMDB at 95); low = heavy custom computation (CCaaS, RevRec at ~50). |
| `business_logic` | Text. What goes **beyond** the JsonLogic-declarable slice. May be `""` only when `crud_percentage >= 95`. |
| `min_org_size` | One of: `10 xs <50`, `20 s <500`, `30 m <2500`, `40 l <10000`, `50 xl 10000+`. Smallest realistic buyer by headcount. |
| `cost_band` | One of: `$` (<$25k), `$$` ($25k–$100k), `$$$` ($100k–$500k), `$$$$` ($500k–$2M), `$$$$$` (>$2M). **Estimated yearly TCO for a 500-user org — that anchor is fixed across the catalog.** |
| `certification_required` | Boolean. TRUE when either the *product* needs formal certification (Finanzamt/GoBD, FDA 510(k), banking regulator) or the *vendor / implementation partner* must be certified, i.e. the domain cannot be served OOTB. |
| `usa_market_size_usd_m` | Int, US TAM in millions USD. Source from Gartner / IDC / Forrester or triangulate from public vendor revenue. |
| `market_size_source_year` | Int, YYYY. Always paired with `usa_market_size_usd_m`. |

Full definitions and examples live in [references/module-shape.md](references/module-shape.md) under `domains`.

**Three prevention mechanisms — apply all three on every domain load:**

1. **Read the manifest before drafting.** Open the `domains` row in [references/module-shape.md](references/module-shape.md) and the populate-on-insert checklist before writing a single row. Don't trust memory — the table grows over time.
2. **Loader hard-fail.** Any script that inserts into `domains` must validate the payload against the manifest before the POST. If `crud_percentage === 0 || min_org_size === '' || cost_band === '' || (business_logic === '' && crud_percentage < 95) || usa_market_size_usd_m === 0 || market_size_source_year === 0`, throw — don't write. Convert silent omission into loud failure. See `validateDomainRow()` in [.tmp_deploy/load_research.ts](.tmp_deploy/load_research.ts) for the canonical implementation.
3. **Post-load audit.** As the last step of Phase A, run `semantius call crud postgrestRequest '{"method":"GET","path":"/domains?select=domain_code,crud_percentage,min_org_size,cost_band,usa_market_size_usd_m&crud_percentage=eq.0&order=id.desc&limit=50"}'` and surface the result. If any row from this load appears, fix before declaring the phase done. The query also catches drift from older loads.

**Why this rule exists:** the original ServiceNow / Salesforce / Workday / SAP / PROD-MGMT / SMM / SWP / ONBOARDING / ATS / ACCT-PLAN / GTM-PLAN / REV-INTEL / SALES-PERF / INTRANET / COLLAB-GOV / WEB-CONTOPS loads all inserted `domains` rows without populating these seven fields. The user discovered this in the UI and pushed back hard. 11 rows were sitting at zeros across the catalog with no signal that they needed backfill. The fields were even missing from [references/module-shape.md](references/module-shape.md) at the time — that gap was the upstream cause, and is closed now.

### 9. Naming arbitration at insert time.

Every proposed `data_object_name` MUST be checked against existing `data_objects.data_object_name` for collision patterns before any insert. A collision is any of:

- The proposed name is a substring of an existing name (`offers` ⊂ `job_offers`)
- An existing name is a substring of the proposed name (`applications` ⊃ existing `job_applications`)
- The proposed name shares its singular form with an existing name (`assessment` ↔ `candidate_assessment`)

On a collision, the loader MUST stop and surface the conflict. The user picks one of:

- **(a) prefix the new name** (the default — `<domain_slug>_<noun>` keeps the bare-word path open for whoever earns the canonical claim)
- **(b) claim canonical authority** by setting `is_canonical_bare_word=true` with a `naming_authority_rationale` explaining why this domain owns the unprefixed name catalog-wide
- **(c) abort** and rename the proposal

No silent inserts of collision-prone names. The naming-choice table below (§ "Naming rules for `data_objects`") arbitrates which of the three forms to use up front.

### 10. Built-in edges are first-class.

When a domain's data_objects reference platform built-ins (currently only `users` — as assignee, creator, approver, author, etc.), the relationship MUST be recorded in `data_object_relationships` against the seeded `users` row (`data_objects.kind='platform_builtin'`). Architect agents cannot guess these from naming alone; without explicit edges, the relationship graph the architect renders for a domain is incomplete. The same rule applies if additional `kind='platform_builtin'` rows are seeded in the future. The seed list today is `users` only — see § "The module at a glance" for the kind-discriminator definition.

### 11. Embedded-master integrity.

Every `domain_data_objects` row with `role='embedded_master'` requires that the same `data_object_id` has a `master` row somewhere in `domain_data_objects`, OR the data_object has `kind='platform_builtin'`. The deployer relies on this to find the canonical owner at deploy time; an `embedded_master` row pointing at a data_object that no domain canonically masters is a broken pointer. Loaders MUST validate before inserting any `embedded_master` row — pull the existing `master` rows for that `data_object_id` first; if none exist and the data_object isn't a built-in, fail loudly.

### 12. Lifecycle states and pattern flags are part of Phase B. No deferrals.

Every `master + required` data_object MUST have:

- Rows in `data_object_lifecycle_states` describing the state machine the entity travels through, AND
- Pattern flags on `data_objects` (`has_personal_content`, `has_submit_lock`, `has_single_approver`) considered (and `notes` annotation when any flag is non-obvious).

**The only exemption** is a config-shaped master with no workflow (e.g. `service_catalog_items`, `service_slas`, `knowledge_articles` to some extent) — author-once / occasionally-edit records whose `record_status` is the only state worth tracking. Exempt rows MUST carry a one-sentence justification in `data_objects.notes` (e.g. *"Config-shaped; no workflow. Authored once, edited inline; no per-state permissions needed."*). Without that annotation, the master is treated as a B12 failure.

There is **no deferral surface**. There used to be language about adding a domain to a "lifecycle-states-pending tracking section" of some plan file — that surface was always phantom (no plan file ever owned it, and skill files don't store mutable state). The rule is now unconditional: load the states, or annotate the config-shape exemption. Lifecycle states are the source from which workflow-gate permissions are materialized (one row per state with `requires_permission=true` ⇒ one `<module>:<verb>_<entity>` permission via Rule #14's module-permission derivation) — skipping them silently hollows the entire role-bundling layer for that domain.

### 13. Catalog enums to know without rediscovering them.

The Semantius platform enforces enum check-constraints on several catalog columns. Guessing values that "sound right" wastes a round-trip and a re-run. The non-obvious ones, sourced from the live `/fields` definitions:

| Table.field | Allowed values | Common wrong guesses |
|---|---|---|
| `trigger_events.event_category` | `lifecycle`, `state_change`, `threshold`, `signal` | `state_transition` ❌ |
| `cross_domain_handoffs.integration_pattern` | `event_stream`, `api_call`, `batch_sync`, `manual_handoff`, `file_drop` | `event_driven` ❌ |
| `cross_domain_handoffs.friction_level` | `low`, `medium`, `high` | — |
| `domain_data_objects.role` / `domain_module_data_objects.role` | `master`, `embedded_master`, `contributor`, `consumer`, `derived` | `owned`, `referenced` ❌ |
| `domain_data_objects.necessity` / `domain_module_data_objects.necessity` | `required`, `optional` | `mandatory` ❌ |
| `*.record_status` | `new`, `pending`, `approved`, `rejected` | — |

When adding a new column to this catalog with an enum, copy the value vocabulary from an existing analogous column rather than inventing a new one (e.g. `domain_module_data_objects.necessity` deliberately mirrors `domain_data_objects.necessity` — same two values, same default `required`). If a loader fails with `(23514) violates check constraint "<table>_<field>_check"`, re-query `/fields?table_name=eq.<table>&field_name=eq.<field>` to see the allowed values; don't guess again.

### 14. Every domain has at least one `domain_modules` row. Domains with ≥3 capabilities need ≥2 modules + a starter junction.

A `domains` row is a market entry — useful for SEO and analysis but **not deployable** on its own. The deployable unit is the **module** (`domain_modules`). Per project decision 2026-05-23:

- **Every `domains` row MUST have ≥1 `domain_modules` row.** No exceptions, including leadership-tier / aggregation-tier domains. If a market warrants a `domains` row at all, it has at least one module — for narrowly-scoped domains that's a single module covering the whole market; for leadership-tier domains it's a "derived-signals" or "landing" module whose `domain_module_data_objects` may be empty but whose existence preserves the deploy-target contract.

- **Domains with ≥3 `capabilities` (per `capability_domains`) MUST have ≥2 `domain_modules` rows AND a populated `domain_starter_modules` junction.** A 3-capability market has enough surface that "starter kit" vs "additional modules" is a meaningful split, and the starter-junction is the SEO/onboarding signal the catalog uses to recommend an entry point. `domain_starter_modules` carries `(domain_id, domain_module_id, position int, notes text)` — one recommended ordered list per domain.

- **Domains with <3 capabilities have exactly 1 `domain_modules` row, no `domain_starter_modules` junction.** The single module IS the whole market; recommending "where to start" is meaningless when there's only one place to start.

**This is a Phase-A obligation, not Phase E.** When loading a new market, `domain_modules` + (optionally) `domain_starter_modules` ship in the same load as `domains` + `capabilities` + `solutions`. Phase E (roles) extends modules but it's a separate concern — see the per-domain checklist Phase M (modules) below.

**Cross-cutting modules.** A module can host on multiple domains (e.g. `KNOWLEDGE-MGMT` lives in ITSM, CSM, HRSD, LSD). The primary host is `domain_modules.domain_id` (nullable for genuinely-no-home cases like `APPROVAL-WORKFLOW`); additional hosts go in `domain_module_host_domains`. Both shapes are valid; see [references/modules.md](references/modules.md) for the full mechanics.

**Permission materialization scope.** Workflow-gate permissions (Rule #12 lifecycle states with `requires_permission=true`) are prefixed with the **realizing module's** `domain_module_code`, not the domain's `domain_code`. Same lifecycle state realized in two modules = two permissions, one per module. `data_object_lifecycle_states.domain_module_id` (nullable) says which module realizes the state; NULL means "always reachable when the master is installed". See [references/modules.md](references/modules.md) for the per-module permission derivation rules.

**Audit blocker.** A `domains` row with zero `domain_modules` rows fails the per-domain completeness checklist outright (check M1). This blocks every downstream concern — fix the M-band first, then audit B / C / E.

---

## The module at a glance

33 entities (11 core concepts + 1 module concept + 13 junctions + 1 alias + 4 agent-tooling + 3 role layer). Read [references/module-shape.md](references/module-shape.md) for the per-entity field shapes, enums, and FK formats before doing any write that touches a field you haven't used recently. The two long-form rule sets — modules and roles — live in [references/modules.md](references/modules.md) and [references/roles.md](references/roles.md).

### Core concepts (11 entities)

| Table | Holds | Hierarchical? |
|---|---|---|
| `industries` | Industries the catalog cares about (Banking, Healthcare, Manufacturing) | yes |
| `jurisdictions` | Geographic & supranational scopes for regulations (EU, USA, Germany) | yes |
| `business_functions` | Functional roles in an org (Sales, HR, Finance, IT) | yes |
| `domains` | System-type domains (CRM, ITSM, HRIS, MDM) | yes |
| `capabilities` | What an org *can do* (Lead Mgmt, Vulnerability Scanning) | yes |
| `processes` | Industry-standard business processes (APQC PCF + `custom` org-specific). Backbone for Phase D process-skill discovery. Discriminated by `source_framework`. | yes |
| `data_objects` | Canonical data subjects (Customer, Order, Asset, Invoice) | no |
| `trigger_events` | Controlled vocabulary of state-change events on data_objects (`offer.accepted`, `employee.created`, `incident.resolved`). Referenced by `cross_domain_handoffs.trigger_event_id`. | no |
| `solutions` | Specific products/platforms (Salesforce, ServiceNow, SAP S/4HANA) | no |
| `vendors` | Legal vendor entities (Salesforce Inc, SAP SE) | no |
| `regulations` | Compliance frameworks (HIPAA, GDPR, SOX, PCI-DSS) | no |

### Module concept (1 entity)

| Table | Holds | Hierarchical? |
|---|---|---|
| `domain_modules` | Autonomous deployable units inside a domain (`ATS-CANDIDATE-CRM`, `ITSM-INCIDENT-MGMT`, `KNOWLEDGE-MGMT`). Natural key `domain_module_code`. `domain_id` is the primary host (nullable for genuinely-cross-cutting modules); see `domain_module_host_domains` for additional hosts. | no |

### Junctions with qualifiers (15 entities)

| Table | Connects | Qualifier column |
|---|---|---|
| `industry_business_functions` | industries ↔ business_functions | presence |
| `business_function_domains` | business_functions ↔ domains | responsibility |
| `business_function_capabilities` | business_functions ↔ capabilities | responsibility (owner / contributor / consumer) |
| `capability_domains` | capabilities ↔ domains | semantic home |
| `domain_data_objects` | domains ↔ data_objects | role (master / embedded_master / contributor / consumer / derived) + necessity (required / optional) |
| `domain_regulations` | domains ↔ regulations | applicability |
| `solution_domains` | solutions ↔ domains | coverage_level (primary / secondary / partial) |
| `data_object_relationships` | data_objects ↔ data_objects | cardinality + kind |
| `cross_domain_handoffs` | domains → domains (via data_object) | `trigger_event_id` (FK to `trigger_events`) + integration_pattern + friction_level. Cross-domain only — source ≠ target enforced by validation rule. Signal 2 of platform-vs-silos analysis (Signal 1 is the multi-master count on `domain_data_objects` where `role ∈ {master, embedded_master}` AND `necessity = required`) |
| `domain_module_capabilities` | domain_modules ↔ capabilities | which capabilities a module realizes; one capability may realize in multiple modules |
| `domain_module_data_objects` | domain_modules ↔ data_objects | role (same 5-value enum as `domain_data_objects`) + necessity. Once a domain has modules, `domain_data_objects` is a **derived rollup** from this junction (group by data_object_id, strongest role wins). |
| `domain_module_host_domains` | domain_modules ↔ domains | additional hosts beyond `domain_modules.domain_id`. Cross-cutting modules use this to declare every domain they install on. |
| `domain_starter_modules` | domains ↔ domain_modules | editorial recommendation: position int + notes. ≥1 row REQUIRED on every domain with ≥3 capabilities (Rule #14). |

### Aliases (1 entity)

| Table | Purpose |
|---|---|
| `data_object_aliases` | Synonym, industry term, or solution-specific name for a data object (e.g. Customer → Patient in Healthcare, Customer → Account in Salesforce) |

### Agent tooling layer (4 entities, added 2026-05-21)

> These entities live in `domain_map` because their FKs are too tightly coupled to the catalog to justify a separate module: `tools.data_object_id → data_objects`, `skills.domain_id → domains`, `tool_solutions.solution_id → solutions`. One module, one analyst skill. (An earlier `tool_catalog` sibling-module experiment was rolled back for this reason — decision 2026-05-21.)

| Table | Holds | Qualifier / discriminator |
|---|---|---|
| `tools` | JSON-RPC-shaped capability primitives an agent skill can call (`send_email`, `query_invoices`, `transcribe_audio`) | `operation_kind` enum (`query` / `mutate` / `side_effect` / `compute`) — drives the **100% Semantius derivation** (today: `{query, mutate}` are Semantius-covered intrinsically; `side_effect` + `compute` need external solutions). Optional `data_object_id` FK is **required** when `operation_kind ∈ {query, mutate}` and **must be null** otherwise |
| `skills` | Agent skills (system / process / role). `system` skills mirror **one module 1:1** (`skill_type='system'`, `domain_module_id` set) — target state per Rule #14. `process` skills wrap a cross-domain handoff cluster; `role` wraps a user-role workflow. **Transitional note:** the catalog still carries domain-level system skills (`domain_id` set, `domain_module_id` null) from the pre-modular era — these are migration targets, not the pattern for new authoring. | `skill_type` enum + `domain_module_id` (required when `system`, per Rule #14) |
| `tool_solutions` | N:M between `tools` and `solutions` — which non-Semantius solutions deliver this tool, and how | `delivery_strength` + `delivery_method` (`mcp_server` preferred) + optional `endpoint_url`. Computed label `<tool> via <solution>`. **No Semantius row** — its coverage is intrinsic to `operation_kind` |
| `skill_tools` | N:M between `skills` and `tools` — which tools a skill needs to function | `requirement_level` (`required` / `optional` / `fallback`) + workflow-context `notes`. Computed label `<skill> needs <tool>` |

These four tables coexist with `domain_map.solutions`, which gained `solution_kind` enum (`external_connector` / `action` / `compute_service` / `standard_solution`) to classify which solutions are tool-delivery sources. The killer hypothesis the layer exists to test: **how many of the loaded domains have a system skill where every required tool is Semantius-covered (i.e. `operation_kind ∈ {query, mutate}` for every required `skill_tools` row)?**

### Role layer (1 new entity + 3 extended built-ins, added 2026-05-23)

Roles are the first-class home for **cross-module permission bundling** — what per-module `:admin` / `:manage` / `:read` rollups can't express. A Recruiter touches 6 ATS modules; a Service Desk Agent touches 4+ ITSM modules. The catalog captures both the role and its access bundle. Long-form rules and worked examples live in [references/roles.md](references/roles.md).

| Table | Holds | Built-in vs. catalog | Qualifier |
|---|---|---|---|
| `roles` | User persona / job-shaped role whose workflow spans modules. Semantius built-in extended with `role_code`, `business_function_id` (nullable — NULL = cross-functional), `record_status` | Semantius built-in (extended) | `business_function_id` (NULL = cross-functional, e.g. Hiring Manager) |
| `role_modules` | Junction: which modules each role touches, at what `interaction_level` (`primary` / `secondary`). Carries optional `notes`. | Catalog (NEW) | `interaction_level`. Read-only-ness is captured by the role's bundle holding only `:read`, not a separate axis. |
| `role_permissions` | Junction: the cross-module permission bundle the deployer provisions. Each role declares its complete bundle directly — no role-level inheritance, no role composition. | Semantius built-in (extended) | Tier-level entries (`:read`/`:manage`/`:admin`) auto-expand via Semantius's existing `permission_hierarchy` at request time |
| `permissions` (extended) | Catalog-derived permissions following `<domain_module_code>:<verb>`. Gained `domain_module_id` FK and `tier` enum (`baseline-read` / `baseline-manage` / `baseline-admin` / `workflow-gate` / `override`). Materialized from lifecycle states + pattern flags. | Semantius built-in (extended) | Permission prefix is the **realizing module's** code, not the domain's. See [references/modules.md](references/modules.md) on permission materialization. |

**Hard invariants** (loader-enforced):

- **2-module floor.** Every `roles` row MUST have ≥2 `role_modules` entries. A single-module persona is just a permission tier on that module, not a role.
- **Flat roles.** No `parent_role_id`, no role composition, no DAGs. Inheritance lives at the **permission** layer via Semantius's existing `permission_hierarchy`. Manager-of-IC distinction is expressed by upgrading the permission tier (`:manage` → `:admin`), not by chaining roles.
- **Function-scoped naming.** `role_code` = `<FUNCTION-CODE>-<ROLE-NAME>` (`RECRUITING-RECRUITER`, `IT-SERVICE-DESK-AGENT`). Cross-functional roles drop the prefix entirely (`HIRING-MANAGER`). Domain prefixes (`ATS-RECRUITER`) are an anti-pattern — roles are function-scoped, not domain-scoped.
- **`roles.slug` is snake_case.** The built-in `valid_role_slug` check constraint rejects kebab — slugify `role_code` to lowercase + underscores (`RECRUITING-RECRUITER` → `recruiting_recruiter`).
- **Permission-bundle minimum.** Every role has ≥1 `role_permissions` row (typical: 4–8). Prefer tier-level grants (`<module>:admin`) over enumerating every workflow gate — `permission_hierarchy` auto-includes lifecycle gates at request time. Only list specific gates when an IC-tier role needs them explicitly (e.g. `ats-offers:approve_offer` for Recruiter, who otherwise has `:manage` not `:admin`).

**Two equivalent paths from `roles` to `domains` exist** — they should agree, divergence is a bug:

- Path A: `roles → role_modules → domain_modules.domain_id` (carries `interaction_level`) — **authoritative**.
- Path B: `roles → role_permissions → permissions.domain_module_id → domain_modules.domain_id` (carries actual granted access) — drift cross-check.

Divergence means either a `role_modules` entry without a matching bundle row on that module, or a bundle row on a module not declared in `role_modules`.

**Cross-functional vs. cross-domain** are different concepts:
- **Cross-functional** = `roles.business_function_id IS NULL` (explicit, e.g. Hiring Manager).
- **Cross-domain** = derived from `role_modules` spanning ≥2 `domain_modules.domain_id` values. Not stored; aggregate at query time.

---

## Workflow for any research task

For any task that fits this skill — "research vendors for X", "is Y a domain?", "load this list of competitors", "find capabilities for Z" — work in this order. Don't skip steps; each one prevents a class of mistake.

> **Domain research without the module + data-object + function phases is incomplete.** Phase A (market shape — domains/capabilities/modules/vendors/solutions), Phase B (data-object footprint — data_objects + Signal 1 + Signal 2), Phase C (organisational-function coverage — `business_function_domains` + `business_function_capabilities`), and Phase E (roles & permission bundling — universal under Rule #14) are all per-market defaults. Skipping B kills the platform-vs-silos analysis (Signals 1 & 2). Skipping C kills the buyer-persona / RACI axis (Signal 3 — *who in the org owns, contributes to, or consumes this market?*). Skipping E leaves modules without deployable user personas.
>
> [Phase D — process-skill discovery](#phase-d--process-skill-discovery-substrate-level) is a **substrate-level analytic**, not a per-market step. It runs across the catalog once Phase B has shipped for enough clusters, and is re-runnable on demand. See the dedicated section below.

1. **Read the existing catalog first — audit by link, not by name.** Always query the live module before researching new entries. Duplicates and inconsistent naming hurt the catalog more than gaps do. Pull the relevant subset (domains in this area, vendors already present, solutions covering related markets, capabilities already on the relevant domains) and skim before you research.

   **The audit query that works:** for a domain `X`, query `/solution_domains?domain_id=eq.<X>&select=coverage_level,solutions(solution_name)` and `/capability_domains?domain_id=eq.<X>&select=capabilities(capability_code)`. This returns every solution and capability already linked to that domain, regardless of what they're named.

   **🛑 Verify against live state, NEVER infer from deploy scripts.** The catalog evolves; `.tmp_deploy/*.ts` loader scripts capture a snapshot at write-time and immediately drift. Cluster-inventory work that reads from a deploy script (instead of querying `/domains` + `/domain_data_objects` + `/cross_domain_handoffs` live) will systematically over-report missing entities — a sub-domain may have been loaded after the script was written. The Wave 2 P1.5c Procurement pass surfaced this: an inventory agent reported SUP-LIFE and VMS as having "zero mastered data_objects" by reading `load_itsm_itam_saas_clm_s2p.ts`; live state showed both already had 4–6 master `data_objects`. The rule: **`postgrestRequest` against live tables is the only authoritative inventory source.** Deploy scripts are useful for understanding *intent at write-time* but never for current state.

   **The audit query that fails silently:** searching `/solutions?or=(solution_name.ilike.*foo*,solution_name.ilike.*bar*,...)` for vendor names you happen to think of. This only catches names you already had in mind — it will miss every solution whose name doesn't match your pattern list. The LCAP backfill of 2026-05-21 discovered that ServiceNow App Engine and Salesforce Platform were already linked to LCAP but had been missed by the initial name-pattern audit, leaving their capability matrices empty. Always audit by `domain_id`, then cross-reference against Gartner / Forrester leader lists for the market to find any genuine gaps.

2. **Classify before naming.** When the user introduces a new concept, apply the point-solution-market test (rule #2) before deciding which table it belongs in. State your classification reasoning briefly so the user can correct it before you start writing.

3. **Draft, don't load.** For any non-trivial addition — more than ~3 rows — draft the proposed rows as a short table or list and surface them to the user before inserting. AI research goes wrong silently; a one-message preview almost always catches at least one mistake (wrong vendor parent, wrong domain attribution, duplicate-with-different-spelling).

4. **Use natural keys, never numeric IDs.** Inside the script: build `Map<naturalKey, id>` after each insert by re-reading the table. Don't try to predict IDs.

5. **Load via the script idiom — in two phases, both default.** Even for ~20 rows, prefer extending [.tmp_deploy/load_research.ts](.tmp_deploy/load_research.ts) over one-off CLI calls. The script is idempotent (safe to re-run), chunked (no Windows command-line issues), and produces a row-count summary you can paste back to the user. `.tmp_deploy/` is gitignored, so iteration is free.

   Surface each phase as a **separate draft** before loading — reviewers check Phase A (which vendors/capabilities to include) and Phase B (which records the domain masters vs contributes to, and where the integration pressure points are) with different mental models. Bundling them into one preview means one of the two gets a shallower review.

   **Phase A — Market shape** (load first):
   - `domains` (the market itself)
   - `capabilities` for that market (5–8 noun-phrase capabilities that define what the market does — e.g. for PROD-MGMT: roadmap visualization, feature prioritization, customer feedback aggregation, release planning, product strategy, opportunity management)
   - `capability_domains` linking each capability to its semantic-home domain
   - **`domain_modules`** — at least 1 row per Rule #14. For domains with ≥3 capabilities: ≥2 modules + populated `domain_starter_modules` junction. For domains with <3 capabilities: exactly 1 module, no starter junction. Cross-cutting modules use the optional `domain_module_host_domains` to declare additional hosts.
   - **`domain_module_capabilities`** — link each capability to the module(s) that realize it. A capability with no realizing module is a Phase-A failure (M4 in the checklist).
   - `vendors` (legal entities, reusing existing rows by `vendor_name`)
   - `solutions` (one row per flagship product per market)
   - `solution_domains` with `coverage_level` (primary / secondary / partial). A reference Phase-A loader is [.tmp_deploy/load_prod_mgmt.ts](.tmp_deploy/load_prod_mgmt.ts); the SMM load also follows this exact shape ([.tmp_deploy/load_smm.ts](.tmp_deploy/load_smm.ts)).

   **Phase B — Data-object footprint** (load second, against the same domain). The Phase-B contract ships seven deliverables:

   1. **`data_objects`** that the domain masters (3–8 noun-plural snake_case names; apply the "what would a flagship vendor build their schema around?" test). Each row populates `singular_label`, `plural_label`, and — per Rule #12 — the pattern flags `has_personal_content` / `has_submit_lock` / `has_single_approver` where the master entity matches the pattern. Apply Rule #9 (naming arbitration) before insert.
   2. **`domain_module_data_objects`** rows on the modules from Phase A: `master` for the new objects, plus `embedded_master`, `contributor`, and `consumer` rows where a module enriches or reads existing cluster-owned objects (almost always `contacts` / `customers` / `campaigns` / `audience_segments` exist already — link to them rather than re-mastering). Validate Rule #11 before inserting any `embedded_master` row. **The legacy `domain_data_objects` rollup is derived from this junction** (group by data_object_id, strongest role wins); do not hand-write `domain_data_objects` for modularized domains.
   3. **`cross_domain_handoffs`** from this domain outbound (and inbound where the partner domain is loaded) — apply the high-friction shape recognition in the "Data-object research" section below.
   4. **`data_object_relationships`** — intra-domain edges + `users`-edge entries (Rule #10) + cross-domain edges for every `cross_domain_handoffs` row with a clean payload→target mapping (e.g. `candidates →becomes→ employees`). Each row carries `relationship_verb`, `inverse_verb`, `relationship_type` (cardinality), `relationship_kind`, `is_required`, and `owner_side`. Drafts MUST surface the relationship graph as a mermaid block in the Phase-B preview before loading.
   5. **`data_object_aliases`** — ≥1 alias per non-self-explanatory master (industry synonyms, vendor-specific labels). The fact sheet generator embeds these directly.
   6. **`data_object_lifecycle_states`** — for every `master + required` data_object with a real workflow (Rule #12). Each row carries `state_name`, `state_order`, `is_initial` / `is_terminal`, `requires_permission` (true = derive a `<module>:<verb>_<entity>` workflow gate prefixed with the realizing module's `domain_module_code`), `permission_verb_override` (when auto-derivation is wrong — e.g. `hired → hire_candidate`), and `domain_module_id` (nullable; NULL = state always reachable when the master is installed). Config-shaped masters with no workflow are exempt only when annotated in `data_objects.notes`.

   Field-level constraints on embedded shells (which columns the local copy must include when a module embedded_masters another domain's data_object) are NOT a domain-map concern. The deployer validates embedded shells against the canonical entity's `fields` metadata at deploy time. The catalog does not duplicate that field-level contract.

   Reference Phase-B loader: [.tmp_deploy/load_smm_data_objects.ts](.tmp_deploy/load_smm_data_objects.ts). Full procedure: see [Data-object research and cross-domain-handoff discovery](#data-object-research-and-cross-domain-handoff-discovery) below.

   Phase B is **not optional** for genuine domain research. The only legitimate reasons to skip it: (a) the task is narrowly scoped to "find competitors for X" or "is Y a domain?" without an actual load; (b) the user explicitly defers it. In every other case — including any "research the X domain" or "load the X market" ask — all three phases are part of the work.

   **Phase C — Organisational-function coverage** (load third, against the same domain):
   - `business_function_domains` rows linking the domain to the function(s) that **own / contribute-to / consume** it (`responsibility_type` enum). For most domains 2–4 rows: one `owner`, one or two `contributor`s, optionally one `consumer`.
   - `business_function_capabilities` rows where a capability has a different functional owner than the domain (e.g. capability `COMPLIANCE-TRAIN` under domain `LMS` is owned by `Compliance`, not `L&D`). Only add when the capability-level RACI **diverges** from the domain-level RACI — otherwise the domain row is sufficient.
   - Reference Phase-C loader: TBD (the function spine and per-domain links were loaded together; see [.tmp_deploy/load_business_functions.ts](.tmp_deploy/load_business_functions.ts) once it exists).

   Phase C answers *"who in the org buys / runs / consumes this market?"* and powers buyer-persona filtering, RACI overlays, and the org-side analogue of the data-object signals. If the function spine is empty (only true at the very start of the catalog), populate it once before adding `business_function_domains` rows — see "Function spine" below for the canonical 20-function shape.

6. **Verify and share.** After each phase, query counts on the affected tables, compare against expected, and link the user to the UI tables that changed. **For any new market load OR any time the user says "review domain X" / "audit domain X" / "what's missing for X", run the per-domain completeness checklist below** — it is the single source of truth for what "done" means.

---

## Per-domain completeness checklist

The catalog has 13 categories of per-domain content that determine whether a market is loaded "completely". A new market load is "done" only when every applicable check passes; a domain review (audit) is the same checklist run against an already-loaded domain. The same gates apply both directions.

**Fact-sheet emission is not part of this checklist.** The [fact sheet generator](../../../scripts/emit_fact_sheet.ts) is an explicit, user-triggered step — see § "Fact sheets (explicit step, not part of any sequence)" below. The audit reads live state from PostgREST, not from on-disk fact sheets, so the rendered files can sit stale through any audit pass and that's fine.

**This section exists because gaps repeatedly shipped silently:** Salesforce / Workday loads missed `domains` metadata (Rule #8), the ITSM-area review missed `business_function_domains` (Backfill gap #2), the Step-5 cluster pass loaded clusters A–F but missed ATS's own intra-domain relationships (the very gap that surfaced this checklist). The pattern is the same: every gap looked "obvious in retrospect, easy to skip in flight". The checklist closes that.

> **How to run.** For each check below: run the query, compare against the pass criterion, take the fix action if it fails. The numbered IDs (`A1`, `B6`, etc.) are stable — refer to them in PR descriptions and gap reports. **An audit pass produces a gap report listing the failed IDs;** the user reviews the report before any fix loads, per Rule #1.

Substitute `<id>` with the target `domains.id`, `<masters>` with the comma-separated list of `data_object_id`s for which `domain_data_objects.role='master'` in this domain.

### S. Structural coverage sweep (run first)

The S-band is a single coverage sweep that runs **before** any band-level check. It exists because each downstream band asks about one or two tables in isolation; an empty FK that the band-shape happens not to test slips through. The sweep produces a coverage table the gap report leads with, then routes each failure into the owning band (A / M / B / C / E / F).

**S1. Every direct FK to `domains` has the expected row count.**

- Schema query: `/fields?reference_table=eq.domains&select=table_name,field_name`. As of 2026-05-23 this returns 12 `(table, field)` pairs across 11 tables: `business_function_domains`, `capability_domains`, `cross_domain_handoffs.source_domain_id`, `cross_domain_handoffs.target_domain_id`, `domain_data_objects`, `domain_module_host_domains`, `domain_modules`, `domain_regulations`, `domain_starter_modules`, `domains.parent_domain_id`, `skills`, `solution_domains`.
- For each pair, count rows for the audited domain via PostgREST. Surface as:

  | Table | FK column | ATS rows | Expected non-zero? |
  | --- | --- | --- | --- |

- Expected-non-zero call (the schema doesn't carry this; it follows from catalog rules):
  - Always non-zero: `business_function_domains` (C1), `capability_domains` (A2), `domain_data_objects` (B1 except leadership-tier), `domain_modules` (M1), `solution_domains` (A3), `cross_domain_handoffs.source_domain_id` (B9 for any non-leaf domain), `skills` (≥1 module-level system skill per module).
  - Non-zero when applicable: `domain_starter_modules` (M3 — only when `capability_count ≥ 3`), `domain_regulations` (most domains have ≥1 regulation in scope), `cross_domain_handoffs.target_domain_id` (most non-leadership domains receive at least one inbound handoff).
  - Routinely zero: `domain_module_host_domains` (only when cross-cutting modules host on this domain), `domains.parent_domain_id` (only when this domain has sub-domains).
- Fix: zero-row anomalies on "expected non-zero" rows are blocking. The fix routes back into the owning band — S1 just makes the gap legible at a glance and catches cases the band's own pass test missed.

**S2. Indirect-table per-module coverage.**

For every `domain_modules` row hosted on this domain (primary host + `domain_module_host_domains` entries), count `domain_module_capabilities` and `domain_module_data_objects`. Surface as:

  | Module | data_objects | capabilities |
  | --- | --- | --- |

- Zero `domain_module_capabilities` on a module routes to M6 (the reverse-orphan check added below). Zero `domain_module_data_objects` is usually a leadership-tier landing module (Rule #14) and acceptable; otherwise routes to the relevant Phase-A or Phase-B band.

**S3. Per-master indirect-table coverage.**

For every `master + required` data_object in this domain, count `data_object_lifecycle_states`, `trigger_events`, and `data_object_aliases`. Surface as:

  | data_object | states | events | aliases |
  | --- | --- | --- | --- |

- Zero states route to B12 (lifecycle states or config-shape exemption note). Zero `trigger_events` on a master with a published state machine routes to B9. Zero aliases on a non-self-explanatory master routes to B11.
- Run the per-master sweep even when the band checks all pass — a master where states + events + aliases are *all* zero or near-zero signals a quietly-incomplete load that no single band catches.

### A. Phase A — Market shape

**A1. `domains` row has all 7 business-metadata fields populated.** (Rule #8.)
- Query: `/domains?id=eq.<id>&select=crud_percentage,business_logic,min_org_size,cost_band,certification_required,usa_market_size_usd_m,market_size_source_year`
- Pass: `crud_percentage > 0`, `min_org_size != ''`, `cost_band != ''`, `usa_market_size_usd_m > 0`, `market_size_source_year > 0`; `business_logic` non-empty UNLESS `crud_percentage >= 95`.
- Fix: PATCH the row via `validateDomainRow()` in [.tmp_deploy/load_research.ts](../../../.tmp_deploy/load_research.ts).

**A2. Capabilities linked.**
- Query: `/capability_domains?domain_id=eq.<id>&select=capabilities(capability_code)`
- Pass: ≥3 rows (typical: 5–8). For leadership-tier domains, may be lower.
- Fix: extend Phase A loader for this market; apply Cross-cutting capability convention (§ below) for any capability that spans ≥3 domains.

**A3. Solutions linked with coverage_level.**
- Query: `/solution_domains?domain_id=eq.<id>&select=coverage_level,solutions(solution_name)`
- Pass: ≥3 solutions; ≥1 `primary`; coverage_level set on every row (never null).
- Fix: extend Phase A loader.

**A5. Vendor records reflect current legal ownership.** *(Opt-in only — not part of the routine audit pass.)*

#### Phase M precursor

Phase M (modules) runs immediately after Phase A and gates everything else. The M-band checks live in the section below; resolve any M-band failures before working through B / C / D / E.


- **Skip by default.** Re-evaluating every vendor for current legal owner requires external research (M&A news, vendor sites, recent acquisition press releases) and routinely takes hours per market. The catalog stays good-enough between explicit refresh cycles.
- **Run only when:** the user asks ("refresh vendors", "re-check ownership for X", "audit acquisitions"), OR you have specific evidence a vendor changed hands (e.g., a press release in the user's prompt), OR the user explicitly approves the scope after you've flagged it as an open question.
- Query (when running): `/solutions?id=in.(<solIds>)&select=solution_name,vendors(vendor_name)`
- Pass: every `vendor_name` matches the current legal owner (no LeanIX-as-LeanIX after the SAP acquisition, etc.).
- Fix: PATCH `vendor_id`; mention predecessor in `solutions.notes` (see Classification heuristics).

### M. Phase M — Modules (Rule #14)

A `domains` row is not deployable on its own. Modules are. The M-band is a structural gate — a failure here blocks every downstream concern.

**M1. ≥1 `domain_modules` row exists for this domain.**
- Query: `/domain_modules?domain_id=eq.<id>&select=id,domain_module_code,domain_module_name` UNION `/domain_module_host_domains?domain_id=eq.<id>&select=domain_module:domain_modules(id,domain_module_code,domain_module_name)` (the second query catches cross-cutting modules hosted on this domain via the host junction).
- Pass: combined result ≥1.
- Fix: hand-author the module set. For domains with <3 capabilities the answer is one starter module covering the whole market. For leadership-tier domains with no masters, the module is a "derived-signals" landing surface — it exists for the deploy contract even if its `domain_module_data_objects` set is empty.

**M2. Domains with ≥3 capabilities have ≥2 modules.**
- Capability count query: `/capability_domains?domain_id=eq.<id>&select=capability_id` (count the rows).
- Module count query: same as M1 (union of primary + host-junction modules).
- Pass: `capability_count < 3` (M2 vacuously passes) OR `module_count ≥ 2`.
- Fix: split the single module into ≥2 meaningful modules. If the capability count is borderline (exactly 3) and only one module makes sense, document why in `domain_modules.description` and revisit when the capability count grows.

**M3. Domains with ≥3 capabilities have a populated `domain_starter_modules` junction.**
- Query: `/domain_starter_modules?domain_id=eq.<id>&select=domain_module_id,position,notes&order=position.asc`
- Pass: `capability_count < 3` (M3 vacuously passes) OR ≥1 row.
- Fix: author 1–3 `domain_starter_modules` rows naming the recommended entry-point modules in order, with editorial notes the fact sheet emits verbatim.

**M4. Every capability of this domain has ≥1 realizing module.**
- Query: for each `capability_id` in `capability_domains` for this domain, check `/domain_module_capabilities?capability_id=eq.<cap_id>&domain_module_id=in.(<modIds>)` returns ≥1 row.
- Pass: zero capabilities with no realizing module.
- Fix: link the orphan capability to whichever module it best belongs to, OR drop the capability if it shouldn't be in the catalog. An orphan capability is a Phase-A gap that propagates into the system-skill derivation.

**M5. Every lifecycle state with `requires_permission=true` has `domain_module_id` set when it belongs to a specific module.**
- Query: `/data_object_lifecycle_states?requires_permission=eq.true&data_object_id=in.(<masters>)&select=data_object_id,state_name,domain_module_id`
- Pass: every workflow-gate state either has `domain_module_id` set to the realizing module, OR `domain_module_id` is NULL because the gate is always reachable when the master is installed (single-module domains, cross-cutting states).
- Fix: PATCH `domain_module_id` per the module shape. The realizing module's `domain_module_code` becomes the permission prefix at materialization time — wrong/missing `domain_module_id` produces wrong-prefixed permissions.

**M6. Every module realizes ≥1 capability.**
- Query: for each `domain_modules.id` hosted on this domain, check `/domain_module_capabilities?domain_module_id=eq.<mid>&select=id` returns ≥1 row.
- Pass: zero capability-orphaned modules. M4 enforces the converse direction (every catalog capability ↦ ≥1 realizing module); M6 enforces this direction (every module ↦ ≥1 realized capability) — the two together close the bipartite-coverage loop.
- Fix: create the missing capability (apply the Cross-cutting capability convention to decide prefixed vs. domain-neutral) plus the `capability_domains` row and the `domain_module_capabilities` link. Orphan modules with no capability are a real gap — load the capability rather than annotating around it.

### B. Phase B — Data-object footprint

**B1. ≥1 `master` data_object exists.**
- Query: `/domain_data_objects?domain_id=eq.<id>&role=eq.master&select=data_object_id`
- Pass: ≥1 row. **EXCEPTION:** leadership-tier domains (REV-INTEL, SALES-PERF, GTM-PLAN, ACCT-PLAN, PRM, OP-RES, BCM, SECOPS, SOAR, THREAT-INTEL, TPRM, VULN-MGMT, PRIV-MGMT, FINOPS, INTRANET, COLLAB-GOV — see § "Leadership-layer domains") are expected to have zero masters; checklist passes by exception.
- Fix: run Phase 1 of the data-object research workflow (§ below).

**B2. Every master has `singular_label` and `plural_label`.**
- Query: `/data_objects?id=in.(<masters>)&select=data_object_name,singular_label,plural_label&or=(singular_label.is.null,singular_label.eq.,plural_label.is.null,plural_label.eq.)`
- Pass: empty result (every master has both labels).
- Fix: PATCH the missing labels; irregular plurals (see plan §9.1 Note A) are hand-correctable.

**B3. Naming arbitration applied on every master.** (Rule #9.)
- Query: `/data_objects?id=in.(<masters>)&select=data_object_name,is_canonical_bare_word,naming_authority_rationale`
- Pass: every bare-word name (no `_` separator, common noun) has `is_canonical_bare_word=true` with a non-empty `naming_authority_rationale`. Prefixed names pass automatically.
- Fix: rename to `<slug>_<noun>` via [.tmp_deploy/rename_data_object.ts](../../../.tmp_deploy/rename_data_object.ts), OR PATCH the canonical claim with rationale.

**B4. Pattern flags considered on every master.** (Rule #12.)
- Query: `/data_objects?id=in.(<masters>)&select=data_object_name,has_personal_content,has_submit_lock,has_single_approver`
- Pass: every master row exists (the flags default to false; `false` is a valid considered answer). What the checklist actually verifies is whether *any* of the three is true OR a notes/audit trail confirms the consideration. **An audit MUST positively re-evaluate** — false-by-default is not the same as false-after-review.
- Fix: PATCH flags to `true` where applicable; record the audit pass somewhere (this plan's checklist completion, a `notes` annotation, etc.).

**B5. `embedded_master` integrity.** (Rule #11.)
- Query: pull all `embedded_master` rows for this domain (`/domain_data_objects?domain_id=eq.<id>&role=eq.embedded_master&select=data_object_id`), then for each `data_object_id` verify either (a) ≥1 `master` row exists somewhere in `domain_data_objects`, or (b) `data_objects.kind='platform_builtin'`.
- Pass: every embedded_master has a canonical owner OR is built-in.
- Fix: either add the missing canonical `master` row in the owner domain, OR drop the orphan `embedded_master`.

**B6. Intra-domain `data_object_relationships` populated.**
- Query: `/data_object_relationships?and=(data_object_id.in.(<masters>),related_data_object_id.in.(<masters>))&select=data_object_id,relationship_verb,related_data_object_id`
- Pass: every master that participates in the domain's primary workflow has ≥1 edge to another in-domain master. For ATS: `candidates ↔ job_applications`, `job_applications → interviews`, `interviews → interview_scorecards`, `job_applications → job_offers`, `candidate_referrals → candidates`, `recruitment_sources → candidates`, `job_requisitions → job_applications` must all exist. An isolated master is allowed only if a `data_object_relationships.notes` entry explicitly justifies it.
- Fix: draft edges (verb + cardinality + necessity + owner_side) and load via the cluster-drafts loader (see plan §9.1 Step 5 + [.tmp_deploy/load_cluster_drafts.ts](../../../.tmp_deploy/load_cluster_drafts.ts) for the markdown→loader pipeline).

**B7. `users` edges populated.** (Rule #10.)
- Query: `/data_object_relationships?and=(data_object_id.in.(<masters>),related_data_object_id.eq.<users_id>)&select=data_object_id,relationship_verb` — and the symmetric `users → masters` direction.
- Pass: every master with a user-typed actor (assignee, creator, approver, panelist, owner, hiring_manager, recruiter, author) has ≥1 edge to `users`. ATS example: `users` should edge to `job_requisitions` (recruiter, hiring_manager), `job_applications` (recruiter), `interviews` (coordinator), `interview_scorecards` (interviewer), `job_offers` (approver), `candidate_referrals` (referring_employee), `application_notes` (author).
- Fix: load per Rule #10. The `users` row is `kind='platform_builtin'`, always at `data_objects.data_object_name='users'`.

**B8. Cross-domain `data_object_relationships` populated (payload→target) — OUTBOUND only.**
- **Asymmetry rule.** A cross-domain relationship row mirrors a cross-domain handoff. The **outbound** side (this domain's master → another domain's payload) is this domain's responsibility because it owns the source of the verb. The **inbound** side (another domain's master → this domain's payload) is the other domain's responsibility and gets audited on **its** B8 pass — recording it here would mean this domain authoring relationship edges outside its own scope.
- Query: `/data_object_relationships?and=(data_object_id.in.(<masters>),related_data_object_id.not.in.(<masters>))&select=data_object_id,relationship_verb,related_data_object_id,is_required,notes`
- Pass: every **outbound** `cross_domain_handoffs` row (from B9) with a clean payload→target mapping has a corresponding `data_object_relationships` row in this direction (e.g., outbound handoff `ATS → ONBOARDING` on `job_offer.accepted` with payload `onboarding_journeys` ⇒ relationship `job_offers spawns onboarding_journeys`, source = ATS master, target = ONBOARDING master).
- Fix: same loader pattern as B6. Do **not** load inbound-direction rows here — they belong to the source domain's B8 pass.
- Report-only (no fix from this domain): inbound cross-domain edges that would correspond to handoffs from OTHER domains into this one. Surface them in the gap report as "owed by `<source_domain_code>` B8" so the user can decide whether to also kick off that domain's audit.

**B9. Outbound `trigger_events` + `cross_domain_handoffs` complete.**
- Outbound events query: `/trigger_events?data_object_id=in.(<masters>)&select=id,event_name,description`
- Outbound handoffs query: `/cross_domain_handoffs?source_domain_id=eq.<id>&select=trigger_event_id,target_domain_id,integration_pattern,friction_level`
- Pass: every master with an observable state transition (anything that changes the row's `status` or `state` column) has a `trigger_events` row. Every `trigger_events` row for this domain's masters has ≥1 `cross_domain_handoffs` row (intra-domain events are not in scope; cross-domain only by validation rule). Fan-out targets (one event → many subscribers) each get their own handoff row sharing the same `trigger_event_id`. **The pass test for "complete" is: list the master's lifecycle states (B11), and for every state with `requires_permission=true` OR every state name reading like a published verb (`approved`, `signed`, `accepted`, `cancelled`, `closed`, `hired`, `terminated`), there is a matching `trigger_events.event_name` of the shape `<entity>.<state>`.**
- Fix: draft the missing events + handoffs per § Phase 3 of the data-object research workflow.

**B10. Inbound `cross_domain_handoffs` — REPORT ONLY (the fix lives on the source domain).**
- **Asymmetry rule.** Inbound handoffs to this domain are outbound handoffs from someone else's perspective. They are **published** by the source domain's `trigger_events` + `cross_domain_handoffs` rows (its own B9 work). When researching or loading this domain, you can only legitimately produce *outbound* handoff rows (events this domain publishes). Authoring inbound handoffs from this domain would mean inventing rows on behalf of a source domain you haven't audited — that's how the catalog accumulates wrong-looking handoffs without provenance.
- Query (what's already loaded): `/cross_domain_handoffs?target_domain_id=eq.<id>&select=source_domain_id,trigger_event_id,data_object_id`
- Pass: report the inbound coverage as-is. Missing inbound rows are **not a failure of this domain's audit** — they're a B9 gap on the source domain.

  **Discovering inbound candidates (which other domains owe me coverage).** The catalog deterministically tells you which other domains *should* be publishing into this domain. For every dependency this domain holds (`embedded_master` / `contributor` / `consumer` rows), the canonical master row on the same `data_object_id` names the owner — and that owner's B9 owes outbound handoffs to this domain whenever the shared record transitions state.

  Two-query discovery procedure:

  1. **List this domain's non-master dependencies:**
     `/domain_data_objects?domain_id=eq.<id>&role=in.(embedded_master,contributor,consumer)&select=data_object_id,role,necessity,data_objects(data_object_name)`
  2. **For each dependency's `data_object_id`, list the canonical owner(s):**
     `/domain_data_objects?data_object_id=in.(<deps>)&role=eq.master&select=data_object_id,domain_id,domains(domain_code)`

  Cross-join (in script) on `data_object_id` to produce the candidate list: `(owner_domain_code, data_object_name, my_role, my_necessity)`. Then for each candidate row, check whether `/cross_domain_handoffs?source_domain_id=eq.<owner_id>&target_domain_id=eq.<id>&data_object_id=eq.<dep_id>` already has a row. If it does, the inbound is covered. If it doesn't, the candidate joins the **report-only follow-ups** subsection.

- Report shape (during audit):
  - **Covered inbound** — list the rows that already exist (positive-finding sanity check).
  - **Owed by other domains** — list each missing inbound as `<owner_code> B9 owes outbound on \`<data_object_name>\` → <this_code> (this domain's <role> + <necessity>)`. User decides whether to also audit those source domains; the missing rows are **not** loaded from this domain's pass.
  - **Unowned dependencies** — if a dependency has no canonical master anywhere in the catalog AND isn't `kind='platform_builtin'`, surface as a B5 integrity failure (different category, blocks this domain's pass).

- Example: ATS embedded-masters `hcm_positions` (id 32). Discovery query 1 returns `(32, embedded_master, required)`. Discovery query 2 returns `(32, 54, HCM)` — HCM canonically masters positions. Then check `/cross_domain_handoffs?source_domain_id=eq.54&target_domain_id=eq.56&data_object_id=eq.32` — if empty, the report writes "HCM B9 owes outbound on `hcm_positions` → ATS (this domain's embedded_master + required)". The fix happens when HCM is reviewed.

**B10b. Per-module attribution on `cross_domain_handoffs`.** *(added 2026-05-23 after a catastrophic audit miss)*

The `cross_domain_handoffs` table carries two per-module FK columns that are routinely null because the modularization-era backfill never ran across pre-modular rows. **An audit that fails to check these columns will pass a domain whose handoff rows have zero module attribution**, which then makes every downstream fact sheet over-attribute events to every module in the source / target domain. As of 2026-05-23, 1019 of 1029 catalog handoffs (99%) sat with null `source_domain_module_id` and 1020 with null `target_domain_module_id`; the original ATS audit on 2026-05-23 ticked B9/B10 green and missed all 34 ATS-touching rows. **This check is non-skippable. If it doesn't have its own query result in your audit transcript, the audit is incomplete.**

- Outbound query (sets `source_domain_module_id` for this domain): `/cross_domain_handoffs?source_domain_id=eq.<id>&source_domain_module_id=is.null&select=id,trigger_event_id,data_object_id,target_domain_id,trigger_events(event_name,data_object_id)`
- Inbound query (sets `target_domain_module_id` for this domain): `/cross_domain_handoffs?target_domain_id=eq.<id>&target_domain_module_id=is.null&select=id,trigger_event_id,data_object_id,source_domain_id,trigger_events(event_name,data_object_id)`
- Pass: both queries return zero rows. **Null on the opposite side (e.g. `target_domain_module_id` for an outbound row leaving this domain) is the target domain's B10b — report it for that domain's audit but don't block on it here.**
- Fix: deterministic derivation, then patch. See [.tmp_deploy/backfill_ats_handoff_modules_2026_05_23.ts](../../../.tmp_deploy/backfill_ats_handoff_modules_2026_05_23.ts) as the reference loader.
  - **source_domain_module_id** = the module in `source_domain_id` that holds `trigger_events.data_object_id` (the event's data_object, NOT the handoff's payload — these can differ when the event fires on a source-mastered object and the payload is the target-mastered object) with the strongest role. Role order: `master` > `embedded_master` > `contributor` > `consumer` > `derived`.
  - **target_domain_module_id** = the module in `target_domain_id` that holds the handoff's `data_object_id` (the payload) with the strongest role.
  - **Tie** (multiple modules at the same strongest role): leave NULL, surface as ambiguous in the gap report. Don't pick arbitrarily.
  - **No candidate** (no module in the relevant domain holds the data_object): this is itself a deeper gap. Two sub-cases:
    1. *Domain-level legacy row.* The data_object sits in legacy `domain_data_objects` for the domain but no `domain_module_data_objects` row exists. Fix is **upstream**: load the `domain_module_data_objects` row (B-band Phase 2), then re-run the backfill.
    2. *No-role row.* The handoff names a payload the target domain doesn't model at all (e.g. ATS receives `position_demand_forecast.updated` but no ATS module declares any role on `position_demand_forecasts`). Decide: either load a `consumer` row on the receiving module (preferred — captures the dependency in the catalog), or accept that the handoff is a domain-level signal with no module owner (rare; usually means the handoff itself is mis-modeled).
- Also surface: any handoff row where `trigger_events.data_object_id` differs from `cross_domain_handoffs.data_object_id` AND neither side resolves to a module. This is the diagnostic for trigger-event data quality bugs (e.g. duplicate / mis-pointed events). The ATS audit found `trigger_event.id=227` (`assessment.completed`) pointing at `risk_assessments` instead of `candidate_assessments`; rows 1180 / 1181 (`candidate_assessment.passed` / `.failed`) are the modern replacements.
- Why this matters: without per-module attribution, fact sheets attribute outbound events to every module in the source domain and inbound events to every module in the target domain. The Wave-2 ATS fact sheets (2026-05-23, pre-backfill) had `candidate.hired` outbound rows duplicated across all 8 ATS module pages because the attribution fell back to "any module in the source domain". The columns exist precisely so this can't happen.

The legacy B9 / B10 queries deliberately did not include these columns. Future audits MUST run B10b in addition. The structural sweep (S1) covers FKs to `domains`; per-module FKs to `domain_modules` are NOT swept there. **B10b is the home for module-level FK coverage on `cross_domain_handoffs`.**

**B11. `data_object_aliases` populated for non-self-explanatory masters.**
- Query: `/data_object_aliases?data_object_id=in.(<masters>)&select=data_object_id,alias_name,alias_type`
- Pass: every master that has any cross-vendor / cross-industry synonym has ≥1 alias row. Self-explanatory masters (e.g. `hcm_employees` for "employee", `job_postings` for "job posting") are exempt — record the exemption decision in the load notes if challenged.
- Fix: draft alias rows; bundle into the cluster-drafts pattern.

**B12. `data_object_lifecycle_states` + pattern flags loaded.** (Rule #12.)
- Query: `/data_object_lifecycle_states?data_object_id=in.(<masters>)&select=data_object_id,state_name,state_order,is_initial,is_terminal,requires_permission,permission_verb_override,domain_module_id`
- Pass: every `master + necessity=required` data_object with a real workflow has lifecycle states loaded. Config-shaped masters with no workflow are exempt only when `data_objects.notes` carries an explicit justification (e.g. *"Config-shaped; no workflow"*). No catalog-wide tracking surface for deferrals — load it or annotate the exemption.
- Fix: draft state machines (initial state + workflow gates marked `requires_permission=true` + `permission_verb_override` for non-obvious verbs + `domain_module_id` when the state belongs to a specific module); load via a focused loader.

### C. Phase C — Functional ownership

**C1. ≥1 `business_function_domains` owner row.**
- Query: `/business_function_domains?domain_id=eq.<id>&select=responsibility_type,business_functions(business_function_name)`
- Pass: ≥1 row with `responsibility_type='owner'`. Most domains also need 1–2 contributors or consumers.
- Fix: link to the canonical 20-function spine (§ Function spine).

**C2. `business_function_capabilities` overrides where capability diverges.**
- Query: `/business_function_capabilities?capability_id=in.(<capIds>)&select=responsibility_type,business_functions(business_function_name),capabilities(capability_code)`
- Pass: rows exist ONLY when a capability's owning function differs from the domain's owning function (e.g., `COMPLIANCE-TRAIN` under domain LMS owned by Compliance, not L&D). Pure overlap with domain RACI is *not* required to be enumerated.
- Fix: add the override row for any diverging capability.

### D. UI spot-check

**D1. UI spot-check.**
- Visit `https://tests.semantius.app/domain_map/<table>` for every table touched.
- Pass: rows render with the expected labels; row counts match the loader summary; no `record_status='approved'` on freshly-loaded research (Rule #1).
- Fix: re-PATCH; never bulk-approve.

> Fact-sheet emission used to live here as D1 / D2 of the checklist. It has been pulled out of every sequence (load, audit, fix-loop) and is now an explicit, user-triggered step. See § "Fact sheets (explicit step, not part of any sequence)" below the audit recipe.

### E. Roles & permission bundling (universal under Rule #14)

Roles capture the user personas whose workflows span the domain's modules and bundle their cross-module permissions. Under Rule #14 every domain has ≥1 module — but a single-module domain may not have any natural multi-module personas (the 2-module floor would block authoring them), so E1's threshold is qualified by capability count. Long-form rules in [references/roles.md](references/roles.md).

**E1. Role coverage matches the domain's module shape.**
- Query: `/roles?business_function_id=eq.<fn_id>&select=id,role_code,role_name` UNION cross-functional roles touching any of the domain's modules: `/role_modules?domain_module_id=in.(<modIds>)&select=role:roles!inner(id,role_code,business_function_id)&role.business_function_id=is.null`
- Pass: **single-module domains** (capability_count < 3, exactly 1 module) — E1 vacuously passes; no roles needed since the 2-module floor blocks role authoring anyway. **Multi-module domains** (≥2 modules) — ≥3 distinct roles across both queries. Typical: 3–5 for tightly-scoped, 5–7 for broad.
- Fix: hand-author the roles using the function-scoped naming pattern; load via a focused loader.

**E2. 2-module floor satisfied on every loaded role for this domain.**
- Query: for each role from E1, count `/role_modules?role_id=eq.<role_id>` rows.
- Pass: every role has ≥2 entries. Loader pre-flight should already block this; this check catches drift from manual edits.
- Fix: either add the missing `role_modules` row (if the role legitimately spans more modules) or delete the role (single-module persona = permission tier, not a role).

**E3. Every `role_modules` row has `interaction_level` set.**
- Query: `/role_modules?role_id=in.(<roleIds>)&select=interaction_level&interaction_level=is.null`
- Pass: empty result. Only `primary` / `secondary` are valid — no `read_only` (captured implicitly by the role's bundle).
- Fix: PATCH the missing values.

**E4. Every role has a non-empty `role_permissions` bundle.**
- Query: for each role from E1, count `/role_permissions?role_id=eq.<role_id>` rows.
- Pass: every role has ≥1 row (typical: 4–8). Tier-level entries (`:read`/`:manage`/`:admin`) expand via `permission_hierarchy` at request time — bundles stay short by design.
- Fix: author the bundle; prefer tier-level grants and specific lifecycle gates over enumerating every workflow-gate / override.

**E5. Path A / Path B agree on the role's domain footprint.**
- Query A: `/role_modules?role_id=eq.<role_id>&select=domain_module:domain_modules(domain_id)`
- Query B: `/role_permissions?role_id=eq.<role_id>&select=permission:permissions(domain_module:domain_modules(domain_id))`
- Pass: the set of distinct `domain_id` values reachable via each path agree. Divergence = drift (a `role_modules` entry without a matching bundle row on that module, or a bundle row on a module not declared in `role_modules`).
- Fix: add the missing junction row on whichever side is incomplete.

**E6. Permission-bundle drift audit.** When a module adds a new `workflow-gate` permission (a new lifecycle state with `requires_permission=true`), every role touching that module potentially needs the gate. Surface drift as a warning, not a load-blocker: "every permission generated by a module is either in at least one role's bundle, OR explicitly marked admin-only via `permission_hierarchy` edges to `<module>:admin`."

### F. Skill-layer integrity

The `skills` table sits next to `roles` but represents agent skills, not user roles. The audit runs one cleanup check here; the rest of the skill / tool layer is covered transitively via S1's `skills.domain_id` row count and the system-skill derivation procedure in the body of the SKILL.md.

**F1. No legacy domain-level system skills remain once module-level skills exist.**
- Query: `/skills?domain_id=eq.<id>&skill_type=eq.system&domain_module_id=is.null&select=id,skill_name`.
- Pass: empty result. Acceptable transitional state ONLY when no module-level system skill has been authored for this domain yet — once any `domain_module_id`-anchored system skill exists for the domain, every remaining `domain_id`-only legacy row is obsolete.
- Fix: retire the legacy row (DELETE). Only convert if a genuine domain-level need is distinct from the per-module skills, which is rare — the per-module skills are the catalog's target state per Rule #14.

### Audit recipe (for "review domain X" / "audit X" / "what's missing for X")

1. Resolve `<DOMAIN_CODE>` to `<id>` and `<masters>` once at the start. Cache for reuse across queries.
2. **Run the S-band sweep first** (S1 + S2 + S3). It produces the coverage tables the gap report leads with and surfaces zero-row anomalies the band checks may not specifically test.
3. Run every **in-scope** band check (A / M / B / C / D / E / F) in order. Skip A5 unless the user has explicitly asked for a vendor-ownership refresh.
4. Classify each result:
   - **Structural gate** — M1–M6 failures block every downstream concern. A domain with no modules (or with capability-orphaned modules) can't be modeled in Phase B/E correctly until the M-band is clean. Resolve M-band first.
   - **In-scope fix** — this domain can fix locally (S1–S3 zero-row anomalies, A1–A4, M1–M6, B1–B9, B11–B12, C1–C2, D1, E1–E6, F1). Goes into the **gap report** as actionable. Fact-sheet emission is **not** an audit step — see § "Fact sheets" below.
   - **Report-only follow-up** — the symmetric side is owned by another domain (B8 inbound direction, all of B10). Goes into a separate **"report-only follow-ups"** subsection of the report, naming the source domain + the missing check ID on that side (e.g. "HCM B9 owes outbound on `hcm_positions`"). **Do not author fixes for these from this domain's audit.** These items NEVER block the audited domain's green status; they are observations the user can act on by scheduling audits of the source domains.
4. Surface the gap report to the user **before** authoring any fixes. Include the failing query output snippet so the user can sanity-check. Ask whether to also kick off audits on the source domains in the report-only section.
5. For each accepted in-scope fix, author it (markdown draft, or directly in a loader); never load AI-generated content without a user review pass (Rule #1).
6. Load fixes with `record_status='new'`. User bulk-approves per category after review.
7. Re-run the audit. The acceptance criterion is zero failed **in-scope** IDs (modulo the documented exceptions in B1, B12). Report-only follow-ups remain visible until the source domains are themselves audited; they are not blockers for this domain's pass.

A well-run audit produces two artifacts: the gap report (with in-scope and report-only subsections) and, if the user agrees to load, the fix drafts. Fact-sheet emission is not part of the audit deliverable; if the user wants refreshed fact sheets after fixes land, that's a separate explicit step (see § "Fact sheets" below).

### Fact sheets (explicit step, not part of any sequence)

Fact-sheet emission is a deliberate, user-triggered action. **Do not run it as part of any load, audit, fix-loop, or "verify and share" step.** The audit reads live state via PostgREST; the on-disk fact sheets can sit stale across many audit passes and that's the intended state.

Emit only when the user explicitly asks. Triggers: "emit the ATS fact sheet", "regenerate the fact sheets", "refresh `<MODULE-CODE>.md`", "run the fact sheet generator". Do not infer the user wants fact sheets from phrases like "audit X" or "load Y was that successful" — confirm first.

The emitter at [scripts/emit_fact_sheet.ts](../../../scripts/emit_fact_sheet.ts) produces two kinds of fact sheet:

- **Per-module fact sheets** → `domain-fact-sheets/modules/<MODULE-CODE>.md`, one per `domain_modules` row. The deployable-unit view: data_objects assigned to this module, lifecycle states on this module's masters, the system skill + tools + Semantius coverage %, module-scoped permissions, capabilities realized, outbound / inbound handoffs, architect handoff hints.
- **Per-starter-kit fact sheets** → `domain-fact-sheets/starter-kits/<DOMAIN-CODE>.md`, one per domain with a `domain_starter_modules` junction. The buyer-facing market entry point: market overview, the editorial on-ramp, every module installable on this domain, combined view across the starter modules, capabilities, solutions, vendors, RACI, regulations, architect handoff hints.

There is no per-domain fact sheet in the current emitter — the starter-kit page replaces it as the market entry point. Any legacy `domain-fact-sheets/<DOMAIN-CODE>.md` files on disk are no longer regenerated; treat them as historical.

Commands:
- `bun run scripts/emit_fact_sheet.ts --starter-kit <DOMAIN_CODE>` — regenerates the domain's starter-kit page.
- `bun run scripts/emit_fact_sheet.ts --module <MODULE_CODE>` — regenerates one module's page.
- `bun run scripts/emit_fact_sheet.ts --all` — regenerates every module page and every starter-kit page in one pass.

When the user does ask for an emit, the quality check on the output is: every `_(no … loaded)_` placeholder in the generated file is justified by (a) the leadership-tier exception list (B1), (b) a `data_objects.notes` config-shape exemption on a master with no workflow (B12, per Rule #12), or (c) an explicit "self-explanatory masters" / "isolated master" justification recorded in the catalog notes (B6, B11). Unjustified placeholders signal a real gap in live state — fix the gap and re-emit. Never hand-edit the rendered files to silence a placeholder.

### Backfill gaps to watch for

The catalog has had four known backfill gaps where a category was scaffolded but not loaded as the workflow grew. Each was discovered after several markets had shipped without it. When working in any market loaded before the listed date, expect to backfill:

| Category | Empty until | What to check on touched markets |
|---|---|---|
| `business_function_domains` + `business_function_capabilities` (RACI axis) | Pre–ITSM-review backfill (2026-05-20) | Every domain has at least one `owner` row; every domain has at least one `contributor` or `consumer` row when cross-functional. |
| `business_functions` spine itself | Pre–2026-05-20 | If the table is empty when starting Phase C, load the 20-function canonical spine first. |
| `cross_domain_handoffs.source_domain_module_id` + `target_domain_module_id` (per-module attribution on handoffs) | Pre-2026-05-23 ATS backfill | Run B10b. 99% of handoff rows still sit at NULL on these columns. Backfill is deterministic by payload→master derivation; ties leave NULL with a manual-review note. |

Don't ship a new market without closing all four gaps for it. Doing so makes the historical drift worse.

### Cross-cutting capability convention

`capability_domains` is many-to-many — a single capability *can* belong to multiple domains, and the cube documentation explicitly anticipates this ("Customer 360 spans CRM and Data Platform; Workforce Scheduling spans HR Operations and Field Service"). In practice the catalog has drifted to ~99% single-domain capabilities because every Phase-A loader produces market-scoped capabilities with **domain-prefixed codes** (`PM-ROADMAP`, `CDP-INGEST`, `ITSM-INCIDENT`, `COMM-CART-CHECKOUT`).

The prefix is helpful for readability and prevents accidental collisions, but it locks the capability to one domain by naming — "`CDP-INGEST` also applies to MDM" reads as a contradiction. The catalog therefore systematically under-represents the cross-cutting capabilities that vendors actually compete on across multiple markets (ServiceNow Knowledge spans ITSM/CSM/HRSD; Workday Forecasting spans FP&A/Workforce-Planning; Reltio Identity Resolution spans CDP/MDM/IGA).

**Naming rule:**

- **Domain-prefixed code** (default for new market loads): use when the capability is genuinely market-specific and would not make sense in another domain (`PM-ROADMAP`, `ITSM-INCIDENT`, `CDP-IDENT-RES`).
- **Domain-neutral code** (no prefix, plural-noun-only): use when the capability genuinely spans **≥3 domains** and vendors market the same shape across those markets. Examples: `KNOWLEDGE-MGMT`, `SLA-MGMT`, `SELF-SERVICE-PORTAL`, `AI-TRIAGE-CLASSIFICATION`, `IDENTITY-RESOLUTION`, `CUSTOMER-360`, `APPROVAL-WORKFLOW`, `WORKFORCE-SCHEDULING`, `TIME-TRACKING`, `COMPLIANCE-TRAINING`.

**Decision test when authoring a capability:**

1. Can I name **three independent vendors that explicitly market this capability across at least three of the candidate domains?** If yes → domain-neutral. If no → domain-prefixed.
2. If a domain-prefixed capability later turns out to span ≥3 domains, **rename it** (update `capability_code`; capability_id stays stable, so `capability_domains` rows survive). Then add the missing `capability_domains` rows. See [.tmp_deploy/load_cross_cutting_capabilities.ts](.tmp_deploy/load_cross_cutting_capabilities.ts) for the loader pattern.

**Anti-pattern:** creating parallel domain-prefixed capabilities for the same concept (`ITSM-KNOWLEDGE`, `CSM-KNOWLEDGE`, `HRSD-KNOWLEDGE`) when one cross-cutting capability + three `capability_domains` rows captures the same thing better. If you find yourself drafting `<DOMAIN>-KNOWLEDGE` for the second time, switch to `KNOWLEDGE-MGMT`.

**Capability ↔ domain dual modelling (gray zone).** A concept can legitimately exist as **both** a capability AND a domain when the same noun names two different things:
- The **domain** captures the *standalone software market* where pure-play vendors sell flagship products (e.g. `KMS` is the Knowledge Management market — Bloomfire, Guru, Tettra, Document360).
- The **capability** captures the *embedded feature use* inside larger platforms (e.g. `KNOWLEDGE-MGMT` is the KB feature inside ITSM, CSM, HRSD, LSD).

The two surfaces are reconciled via `capability_domains`: the cross-cutting capability links to **both** its standalone-market domain *and* every platform-market domain where it's a feature. So `KNOWLEDGE-MGMT` links to `KMS` (the market) plus `ITSM`, `CSM`, `HRSD`, `LSD` (the platforms where it's bundled).

When you create a cross-cutting capability, always check: **does a same-concept domain already exist?** If yes, add the `capability_domains` row to it — don't quietly omit it. Apply this lens to `TIME-TRACKING` ↔ `WFM`, `IDENTITY-RESOLUTION` ↔ `MDM`/`IGA`, `WORKFORCE-SCHEDULING` ↔ `WFM` — these are existing pairs.

---

## Function spine (canonical shape)

The `business_functions` table represents the **organisational axis** orthogonal to domains and data_objects. It's a hierarchical tree (`parent_business_function_id`) that anchors `business_function_domains` (RACI per market) and `business_function_capabilities` (RACI per capability when it diverges from the parent domain).

The `business_functions` table has **no code column** — the natural key is `business_function_name`. The slugs below are script-side aliases (loader variables, doc references); they are not stored in the DB.

The canonical 20-function top-level spine (loaded 2026-05-20):

| Slug *(script-side)* | `business_function_name` | Notes |
|---|---|---|
| `SALES` | Sales | Pipeline, accounts, quota carriers, sales ops |
| `MARKETING` | Marketing | Demand gen, brand, content, MarComms |
| `CUSTOMER-SUCCESS` | Customer Success | Post-sale account health, expansion, retention |
| `CUSTOMER-SERVICE` | Customer Service | Support, contact centre, field service |
| `PRODUCT-MGMT` | Product Management | Product strategy, roadmap, discovery |
| `ENGINEERING` | Software Engineering | App dev, platform, SRE, QA |
| `IT` | IT Operations | Infrastructure, end-user computing, service desk |
| `SECURITY` | Security | InfoSec, SecOps, IAM, GRC-security |
| `DATA-ANALYTICS` | Data and Analytics | Data engineering, BI, ML/AI platforms |
| `HR` | Human Resources | All-people functions (sub-tree: recruiting, payroll, L&D, …) |
| `FINANCE` | Finance | All-money functions (sub-tree: accounting, FP&A, treasury, tax, AP, AR) |
| `PROCUREMENT` | Procurement | Sourcing, supplier mgmt, S2P |
| `SUPPLY-CHAIN` | Supply Chain | Planning, manufacturing, warehouse, logistics |
| `LEGAL` | Legal | Contracts, litigation, IP, regulatory |
| `GRC` | Governance, Risk and Compliance | Enterprise risk, audit, compliance ops, privacy |
| `EXECUTIVE` | Executive | CEO office, corporate strategy, communications, M&A |
| `FACILITIES` | Facilities and Real Estate | Workplace, real estate, EH&S |
| `OPERATIONS` | Business Operations | Cross-functional ops, RevOps when not under Sales |
| `RESEARCH-DEV` | Research and Development | Industry R&D outside software engineering (pharma, chem, materials) |
| `ESG` | ESG and Sustainability | Sustainability reporting, climate accounting |

Sub-functions (`parent_business_function_id` set to a top-level function) extend the tree. Currently loaded sub-functions include: HR → Recruiting, Payroll, L&D, Benefits, Workforce-Mgmt, Employee-Relations; Finance → Accounting, FP&A, Treasury, Tax, AP, AR, Internal-Audit; Supply Chain → Planning, Manufacturing, Warehouse, Logistics, Field-Service; Sales → Sales-Ops, Channel-Sales; Marketing → Demand-Gen, Brand, MarComms; IT → Service-Desk, Infrastructure, End-User-Computing; Engineering → Platform, SRE, QA; Procurement → Indirect-Procurement, Direct-Procurement; CS → Support, Field-Service-Customer.

**How Phase C uses the spine.** When loading a new market, identify the **primary owner function** (1 row, `responsibility_type: owner`), the **contributor functions** (0–2 rows, `responsibility_type: contributor`), and the **consumer functions** (0–2 rows, `responsibility_type: consumer`). Example for `CRM`: owner = `SALES`, contributor = `MARKETING`, consumer = `CUSTOMER-SUCCESS`. Example for `ITSM`: owner = `IT`, contributor = `SECURITY`, consumer = everyone (don't list every domain as consumer — pick the function that materially *uses* it, not every employee with a laptop).

---

## Data-object research and cross-domain-handoff discovery

This is the catalog's most analytically loaded workflow — the combination of `domain_data_objects` (Signal 1) and `cross_domain_handoffs` (Signal 2) is what drives the **platform-vs-silos** question: *which clusters of domains would benefit from running on an integrated platform versus staying as point-solution silos?* Every row you add or omit here shifts that answer. Follow these steps when a user asks "create the data objects for the X domain", "what does X master", "what handoffs does X have to Y", or anything in that shape.

### Naming rules for `data_objects`

**Naming-choice table — pick one of three forms at insert time** (see Rule #9 for arbitration mechanics):

| Naming choice | When to use | Example |
|---|---|---|
| **Domain-prefixed** (default) | New market loads, anything not crossing ≥3 domains, anything that collides with an existing name | `job_applications` (ATS), `candidate_assessments` (ATS), `vehicle_work_orders` (FLEET-MAINT) |
| **Domain-neutral cross-cutting** (no prefix, plural-noun-only) | The data_object spans ≥3 domains AND vendors model the same shape across those markets — needs explicit user confirmation | `attachments`, `comments`, `tags` (if ever loaded as cross-cutting masters) |
| **Canonical bare-word** (requires `is_canonical_bare_word=true` + `naming_authority_rationale`) | This domain holds the catalog-wide canonical authority for the bare noun — every adjacent domain defers to it | `customers` (CRM), `employees` (HCM), `incidents` (ITSM), `assets` (ITAM) — each authored before the rule existed; new claims need explicit confirmation |

The same three-form choice also informs capability code naming (§ "Cross-cutting capability convention" below) — but only data_objects carry the `is_canonical_bare_word` claim; capabilities arbitrate the analogous concept via `capability_code` prefix only.

- `data_object_name` is the **natural key** and must follow Semantius entity-naming conventions: snake_case, plural (`job_requisitions`, `recruitment_sources`, `background_checks`). Treat it as if you were naming the entity in a new Semantius module — because that's exactly what the catalog claims it represents.
- `singular_label` (and `plural_label`) is the **human-friendly** form (`Job Requisition` / `Job Requisitions`, `Recruitment Source` / `Recruitment Sources`, `Background Check` / `Background Checks`). The labels can drift from `data_object_name` (e.g. industry-specific renames) — that's the column's job. The legacy `display_label` column is retained transitionally pending an end-of-program destructive cleanup; every new write goes to `singular_label` / `plural_label`.
- Industry-specific or solution-specific variants (`Patient` for `customers` in Healthcare, `Account` for `customers` in Salesforce) live in `data_object_aliases`, never as new `data_objects` rows.
- **Buyer-side vs seller-side: distinct data_objects, not multi-master rows.** When two domains see the same kind of artifact from opposite sides of a transaction, model them as separate `data_objects`. They have different lifecycles, owners, and integration paths. Established pairs:
  - `saas_subscriptions` (SMP, buyer-side) ↔ `customer_subscriptions` (SUB-MGMT, seller-side)
  - `invoices` (S2P, AP-side, supplier-issued) ↔ `customer_invoices` (SUB-MGMT, AR-side, seller-issued)
  - Future candidates: `suppliers` vs `customers` (already distinct), `vendor_contracts` vs `customer_contracts` (avoid — `contracts` is one CLM-mastered object with both flavors as contributors).
- **Audience filtering, not duplicated-per-audience data_objects.** When modern vendor stacks unify a shape with audience tags at the application layer (`knowledge_articles` serves both internal IT and customer-facing KBs in ServiceNow / Salesforce Knowledge), prefer one `data_object` + multi-domain consumers over a separate `external_knowledge_articles` under CSM. Default rule: if at least one credible vendor unifies the underlying record, the catalog should too.
- **Generic names invite cross-domain boundary collisions — scope-qualify at creation.** A `data_object_name` like `maintenance_work_orders` reads plausibly as REAL-EST, EAM, FLEET-MAINT, or FSM ownership. When a new master sits in a domain that overlaps several adjacent operational domains, prefix or qualify the name to its scope at insert time: `facility_work_orders` (REAL-EST), `eam_work_orders` (EAM industrial plant), `vehicle_work_orders` (FLEET-MAINT), `tenant_maintenance_requests` (RE-PROP-MGMT). Catalog precedent (2026-05-22): id 349 was loaded as `maintenance_work_orders` and had to be renamed to `facility_work_orders` once EAM Phase-B surfaced its own work-order need; the rename also cascaded into 3 `trigger_events` (event-name prefix had to follow). Apply the same prefix-at-creation rule to: PM schedules (`equipment_pm_schedules` vs `preventive_maintenance_schedules` vehicle-scoped), assets (`industrial_assets` vs `hardware_assets` vs `fixed_assets`), inventory (`spare_parts` vs warehouse `stock_items`). When in doubt, ask which other domain would also plausibly claim this name and prefix accordingly.

### Phase 1 — propose the domain's data objects

1. **Find the domain.** Pull `domains` by `domain_code`. Confirm it exists and check its description.
2. **Master at the sub-domain, not the umbrella, when both exist.** If the target has sub-domains in the catalog (ITAM → HAM/SAM/SMP/FINOPS; CRM → CDP/MA/SALES-ENG/CPQ/LOYALTY/B2C-COMM), data_objects master at the most-specific sub-domain that owns them. The umbrella retains only genuinely cross-cutting objects (`asset_contracts`, `asset_lifecycle_events` for ITAM-umbrella; the CRM-umbrella keeps `customers`, `contacts`, `leads`, `opportunities`, `pipeline_stages`, `sales_activities` because no sub-domain claims them). This rule was learned the hard way: `software_licenses` and `software_installations` were initially proposed at ITAM-umbrella and had to be re-homed to SAM before load.
3. **List candidate data objects.** Apply the "what does THIS domain primarily master?" test. The candidate list is what an ATS-like / CRM-like / ITSM-like vendor would build their schema around — not what the domain *touches*.
4. **Exclude foreign masters.** If a candidate is mastered by another already-loaded domain (e.g. `positions` is HCM's master, not ATS's), drop it from the primary set. Flag it for later as a *secondary*-style link once both sides are loaded; don't invent it in the wrong domain.
5. **Exclude handoff targets that belong elsewhere.** Some objects look like they belong to the domain because the domain triggers their creation — but their master lives in another domain. Onboarding Task is the canonical example: ATS triggers it via `offer.accepted`, but Onboarding (or HRSD) masters it. These become `cross_domain_handoffs` rows in Phase 3, not `data_objects` under the source domain.
6. **Surface descriptions for review.** Always show `data_object_name` + `singular_label` (+ `plural_label`) + description in a single table before loading. The description column is where AI research goes wrong silently; reviewers need to see it.
7. **Load idempotently.** Pattern: read by `data_object_name`, insert missing only, re-read for the id map, insert `domain_data_objects` with `role: master` for the linking domain. Reference loaders covering every variation we've shipped are listed in [references/loader-idiom.md](references/loader-idiom.md).

### Phase 2 — identify multi-master + standalone-vs-holistic authority (Signal 1)

For each data object you just loaded, ask **two distinct questions**: (1) which other domains *in a holistic deployment* legitimately master a slice of this (canonical `master` rows)? (2) which point-solution domains *would* master a local copy of this if deployed standalone, but defer to a canonical master when one is present (`embedded_master` rows)? Multi-master plus embedded-master coverage is the structural fingerprint of integration burden — Signal 1.

**The five roles, when to use each:**

- `master` — canonical, holistic-deployment authority. Multiple domains *can* share this role on the same data_object when each owns a genuinely distinct slice (HCM owns identity/employment slice of `employees`; Payroll owns comp slice; IGA owns access-identity slice).
- `embedded_master` — point-solution local master. The domain holds its own copy when deployed standalone, but the same record is canonically owned by another domain in a holistic deployment. At query time, the holistic demotion to `consumer` is rule-derived (when a `master` exists for the same data_object, `embedded_master` rows for it are treated as consumers in the holistic view). Examples: ATS embedded-masters `positions` (HCM canonical), LMS embedded-masters `employees` (HCM canonical), OMS embedded-masters `customers` (CRM/CDP canonical), CCAAS embedded-masters `customers` (CRM canonical).
- `contributor` — writes some fields on someone else's master without being authoritative for the whole record.
- `consumer` — read-only dependency. The domain reads from the canonical master.
- `derived` — produces computed projections / analytics on top of someone else's master. Distinct from `consumer`: derived domains *republish* signals against the upstream object (REV-INTEL derives on CRM `opportunities`; FINOPS derives on cloud-spend records; PA derives on `employees`).

**The `necessity` column — separate, orthogonal axis:**

- `required` — the domain cannot function in any realistic deployment without this relationship being active. Default for all `master` rows (you don't master something optionally). Also true for most `embedded_master` rows (ATS needs local positions to write a requisition; OMS needs local customers to write an order). Also true for any `consumer` read the workflow can't proceed without.
- `optional` — the domain tolerates absence. The relationship exists in some deployments / for some workflows but the rest of the domain functions fine without it. Common shape: `embedded_master + optional` for "convenience" fields a point-solution may or may not bother to model (ATS embedded-masters `cost_centers` only when finance integration is absent; many ATS deployments skip cost_centers entirely).

**Decision recipe — when authoring a `domain_data_objects` row:**

1. Is this domain the canonical owner of the record in a holistic enterprise deployment? → `master` + `required`.
2. Does this domain need its own copy of the record to function as a point solution, but defer to a canonical master when one exists? → `embedded_master`. Then ask: would a real point-solution deployment of this domain *always* model this record (even minimally)? `required`. Or do many real deployments skip it? `optional`.
3. Does this domain write some fields without being authoritative? → `contributor`. Necessity = required if the contribution is part of the workflow; optional if it only happens in some deployment shapes.
4. Does this domain read the record but never write? → `consumer`. Required if the workflow fails without the read; optional if it tolerates absence.
5. Does this domain republish derived signals against the record? → `derived`. Almost always `required` (the derived analytics is the domain's purpose).

**Multi-master vs multi-embedded-master:**

- The schema allows multiple `master` rows per data_object (the original multi-master pattern); this is by design, not an integrity bug.
- The schema *also* allows multiple `embedded_master` rows per data_object — common for foundational records that almost every point-solution local-masters (`employees`, `positions`, `cost_centers`, `customers`, `products`, `departments`). High embedded-master count alongside a canonical master is itself a strong silos signal: "this object would live in N point solutions if they were deployed standalone, integration debt absorbs it once a canonical master ships."
- Each domain that co-masters (canonical *or* embedded) should explain *which slice* it owns in the junction's `notes` column. "Recruiting execution: stages, candidates, interviews, offers" vs "Headcount intent: position approval, budget alignment, plan-to-actual" makes the multi-master row useful instead of ambiguous. For embedded_master rows, the notes should also state the demotion path: "ATS local-masters positions when no HCM is deployed; reads from HCM when present."

**Look for the cluster flagship first.** Every cluster we've loaded has produced a structural multi-master flagship: `employees` (HR cluster), `configuration_items` (IT-ops cluster), `customers` (customer-facing cluster). The flagship is 3-4 canonical masters + contributors + at least one consumer + (with embedded_master modelling) several point-solution embedded_masters. The flagship anchors the rest of the load. When you start a new cluster, *expect* this pattern — find the flagship first, then everything else decomposes around it. See [references/canonical-examples.md](references/canonical-examples.md) for the full catalog of landmark rows and their slice decomposition.

If a co-master domain isn't in the catalog yet (Workforce Planning was missing when ATS shipped), add the domain via Phase 1 first, then link.

**Boundary-object pattern.** When two adjacent domains have a fuzzy cost / value / state handoff, *invent a data_object that lives at the boundary* and assign single mastery on the upstream side. `workforce_cost_projections` (SWP-mastered, EPM-consumed) is the case study: without it, the SWP↔EPM boundary is "the workforce plan somehow becomes a budget line"; with it, SWP masters the workforce-driven cost build, EPM consumes for the consolidated budget. Look for boundary-object candidates whenever a high-friction handoff exists between two domains that "should" share a concept but don't.

### Phase 3 — discover cross-domain handoffs (Signal 2)

For each data object, identify the **event-driven flows between two distinct domains** that involve this object. Every such flow is a pipeline / API call / human handoff today; an integrated platform would absorb them. These are the rows in `cross_domain_handoffs`.

The discovery questions, in order:

1. **What state changes on the data object?** `offer.accepted`, `incident.resolved`, `requisition.approved`, `case.closed`, `task.completed`, `application.hired`. Use dotted-lowercase noun.verb naming. These are the candidate `trigger_event` values.
2. **For each state change, which other domain reacts?** The reactor is the `target_domain`. If the reactor is the same domain (`incident.created` → `change.requested` both in ITSM), it's intra-domain — out of scope, do not record. The `cross_domain_only` validation rule enforces this and will reject the insert with a 23514.
3. **What's the integration_pattern today?** `event_stream` (Kafka/EventBridge/etc.), `api_call` (direct webhook/REST), `batch_sync` (nightly ETL), `manual_handoff` (someone copies a value), `file_drop` (CSV exchange). When unknown, default to `api_call` and flag in notes.
4. **What's the friction_level today?** `high` if the handoff regularly breaks, requires custom maintenance, or has measurable error rate. `medium` for stable but bespoke integrations. `low` for native event streams within a shared platform. Friction is the cost an integrated platform would eliminate — it's the value-quantification column.
5. **Describe what actually happens.** The `description` column should name the payload, the downstream consequences, and known failure modes. "Offer accepted in ATS triggers a workflow in Onboarding that generates a task list per template; failure modes: late-bound position changes invalidate the template selection."

**Fan-out is normal — don't collapse it.** One trigger event often hits multiple target domains simultaneously. `employee.created` fires from HCM to Onboarding, Payroll, IGA, and Talent-Mgmt as four separate handoff rows sharing one trigger; `offer.accepted` similarly fans ATS → Onboarding plus implicit feeds to HCM and Payroll. Each fan-out arm is its own row by design — they have different integration patterns, friction levels, and failure modes. Don't try to merge them into a single record.

**Task fan-out (templated workflow) is a distinct shape from event fan-out.** When `HCM.employee.terminated` produces a fan-out of offboarding-task tickets in ITSM (workspace cleanup, mail-forwarding, equipment return, exit interview), each downstream ticket is per a template, not per a subscriber domain. The handoff is recorded once (HCM→ITSM on `employee.terminated`) but the downstream effect is N tickets correlated by the termination event. Don't model each template as its own `cross_domain_handoffs` row — that explodes the count and dilutes the signal. The same pattern shows up on ATS `offer.accepted` → Onboarding (N template tasks per role) and FSM `work_order.dispatched` → ITAM (N inventory updates per part used).

**Leadership-layer / aggregation-tier domains often master nothing of their own.** REV-INTEL, SALES-PERF, GTM-PLAN, ACCT-PLAN, PRM (Sales cluster) typically don't master their own `data_objects` — they read from CRM (`opportunities`, `customers`, `leads`) and publish derived signals against those upstream data_objects. EPM (Finance cluster) is the same shape: it reads ERP-FIN journal entries, payroll cycles, and SWP cost projections, and publishes `forecast.refreshed` / `variance.threshold_breached` events against `forecasts` / `financial_plans`. When loading such a domain, don't scaffold synthetic data_objects to "give it ownership" — leave it data-object-empty and have its events publish via the upstream cluster's data_objects (handoff row's `data_object_id` is the payload, not the publisher's ownership claim).

**Trigger-event ownership: "one event, many subscribers".** All fan-out rows for a single event reference the **same** `trigger_events.id` via `cross_domain_handoffs.trigger_event_id`. Event semantics (publisher, data object, state transition, description) live in one `trigger_events` row; per-edge integration metadata lives on each handoff row. Never duplicate `trigger_events` rows per subscriber — it breaks the trigger-event-prefix clustering signal that Phase D depends on. Full rationale in [Phase D — Process-skill discovery](#phase-d--process-skill-discovery-substrate-level).

**Recognize the high-friction patterns.** After ~230 handoffs (Wave 2 P1.5a–e complete) the consistent `friction_level: high` cases cluster into seven recognisable shapes:
- **Identity reconciliation across systems** — HCM→IGA, SMP→IGA, CDP→SALES-ENG, CCAAS→CRM: same logical person/customer, different identifier spaces, no canonical resolver. Note: identifier reconciliation is also frequent across loyalty/CRM (loyalty_member_id vs customer_id) and across partner/CRM (partner_id vs account_owner_id)
- **Leaver / cancellation recall** — HCM→ITAM asset recall on termination, CSM→SUB-MGMT churn-risk feedback, FSM→CSM dispatch.failed, LOYALTY tier-rollback-on-churn: the "going away" event is harder to catch than the "arriving" event; the going-away signal often arrives via a different channel than the original arrival
- **Probabilistic signal becomes deterministic action** — CDP→SALES-ENG intent signal, AIOPS→ITSM correlation, SUP-LIFE→GRC risk-score elevation, CCAAS→CSM sentiment.negative, REV-INTEL→CRM deal_risk.escalated: the upstream is a scored guess, the downstream needs a yes/no. AI/ML scoring is the typical source; false-positive volume is the typical failure mode
- **Shadow-data emerges from off-channel transactions** — EXPENSE→SMP shadow-IT detection, B2C-COMM→SUB-MGMT direct-purchase: the official catalog finds out from a side channel
- **Cross-vendor stack with same logical entity** — OBS→ITSM SLO breach when SLO and incident tools are different vendors; COMP-MGMT→PAYROLL merit-cycle propagation when comp planning and payroll execution live in different vendors; SUP-LIFE→ERP-FIN supplier onboarding when supplier-master and AP live in different vendors
- **Period/cycle-close coupling** *(added 2026-05-21 from Wave 2 cross-cluster patterns)* — ERP-FIN.accounting_period.closed → EPM consolidation; COMP-MGMT.merit_cycle.approved → PAYROLL execution; pay_cycle.closed → multiple subscribers. Tight timing coupling: downstream must complete within a fixed window or the next cycle fails; backdated entries arriving after period close cascade across systems. Distinct from cross-vendor-stack: friction here comes from calendar coordination, not identifier reconciliation
- **Alert/escalation without feedback loop** *(added 2026-05-21 from Wave 2)* — AP-AUTO→ERP-FIN payment.exception, SUB-MGMT→CSM dunning.escalation, EXPENSE→HR-cases policy violation, FINOPS→S2P cloud_spend.threshold_breached: source publishes the alert expecting the target to act, but no acknowledgment, no retry policy, no completion signal back to source. Silently fails when the alert is missed or misrouted; manual follow-up is the canonical workaround

When a new handoff matches one of these shapes, default `friction_level` to `high`. **Multi-shape handoffs** (a single edge that matches 2+ shapes) are reliably the highest-friction integration points in the catalog — the COMP-MGMT→PAYROLL handoff matches both cross-vendor-stack AND period-cycle-close, for example, and is a textbook source of retro-adjustment work.

### Phase 4 — score and surface

After loading any meaningful chunk of `cross_domain_handoffs`, the platform-candidacy view falls out:

- **Signal 1 — Per data_object (canonical multi-master):** `count(role='master' AND necessity='required')`. High count = same logical record has multiple canonical owners across the catalog; integration platform absorbs the reconciliation. Canonical example: `employees` (HCM + Payroll + IGA all master required slices).
- **Signal 1b — Per data_object (embedded-master footprint):** `count(role='embedded_master' AND necessity='required')`. High count = many point-solution domains would *also* hold this record locally if deployed standalone. Distinct from Signal 1 — captures silos that *would* exist in a point-solution world, not just the canonical authority split. `cost_centers`, `customers`, `positions`, `products`, `departments` are the prototypes.
- **Integration-burden score per data_object:** `count(role IN ('master', 'embedded_master') AND necessity='required') + count(handoffs)`. Signal 1 + Signal 1b (the structural half) plus Signal 2 (the operational half — wires already firing between systems).
- **Signal 3 — Per (domain_a, domain_b) pair:** `count(handoffs WHERE {source,target} = {a,b})` is the bilateral integration weight. High weight = these two domains are effectively one platform's problem already.

`necessity='optional'` rows are deliberately excluded from the burden score — they represent convenience modelling, not load-bearing ownership. They surface separately as the "extended footprint" view (which point solutions *can* hold this record, even if many don't bother).

All queries are one-line cube DSL once the data is in — surface them to the user along with the UI links after each load.

### Anti-patterns specific to this workflow

- ❌ Putting `Onboarding Task` (or any other handoff target) under the *trigger* domain's data_objects. It belongs to the *master* domain; the relationship is a `cross_domain_handoffs` row, not a `domain_data_objects` row.
- ❌ Recording intra-domain events in `cross_domain_handoffs`. The validation rule will reject them; if you bypass it by routing through different ids, you're polluting the integration-burden score with internal workflow.
- ❌ Filling `domain_data_objects.notes` with nothing on multi-master or embedded_master rows. The whole point of allowing multi-master / embedded_master is to surface *which slice* each domain owns; an empty `notes` hides that. For embedded_master rows the notes should also explicitly state the demotion path ("ATS local-masters positions when no HCM is deployed; reads from HCM when present").
- ❌ Inventing a co-master domain in the catalog just to make a multi-master row work. Apply the point-solution-market test first; if Workforce Planning genuinely passes (it does), add the domain. If it doesn't, the data_object probably belongs to one master, not two.
- ❌ Naming `data_object_name` in human form (`Job Requisition`, `Background Check`). That's `singular_label` (and `plural_label`)'s job. The natural key is snake_case_plural.
- ❌ Defaulting every `domain_data_objects` row to `necessity='required'` without thinking. The default is a *fail-safe*, not the right answer. Convenience fields a point-solution may or may not model (cost_centers on ATS, departments on LMS, salary_bands on most non-HR domains) belong on `optional` rows. Required vs optional is the second classification axis, not a checkbox.
- ❌ Using `master` when the domain only holds a local copy that defers to a canonical owner. ATS does not `master` cost_centers — it `embedded_master`s them. The distinction drives Signal 1 vs Signal 1b separation; conflating them inflates the canonical multi-master count with point-solution noise.
- ❌ Using `embedded_master` when the domain is genuinely the canonical authority. HCM `master`s `employees` (canonical) even though it is a point solution — because no other catalog domain has a stronger ownership claim. The test: in a fully-integrated reference deployment, who does *every* other domain defer to for this record? That domain is `master`; everyone else who holds it locally is `embedded_master`.
- ❌ Modelling holistic-deployment-only consumer rows when an embedded_master row already captures the same dependency. ATS↔positions is `embedded_master + required`, not a separate `consumer + required` row — the runtime demotion handles the holistic case from the single embedded_master row. Don't double-count.
- ❌ Counting `embedded_master + optional` rows toward Signal 1. The Phase-4 formula explicitly excludes them via `necessity='required'`. Optional rows appear in the separate "extended footprint" view.
- ❌ Creating two rows on the same `(domain_id, data_object_id)` pair to capture two roles (e.g. `embedded_master` + `derived` for the same domain × data_object). The schema doesn't enforce a unique constraint here, but duplicates are consistently misclassification. **Convention: one row per pair.** Pick the dominant role and capture the secondary slice in `notes` (e.g. "IDP embedded_masters documents and additionally derives extracted_fields signals against them"). The 3 existing duplicates on DCG×{data_products, metric_definitions, ontologies} are cleanup targets — they had a contributor row authored before the canonical master row landed on the same pair, and never got reconciled.

---

## Phase D — Process-skill discovery (substrate-level)

Phase D answers *"which clusters of cross-domain handoffs are coherent business processes that an agent skill could orchestrate?"* It is the payoff of Phase B — once enough domains have shipped `cross_domain_handoffs`, the substrate supports a deterministic discovery query that ranks process-skill candidates.

**Phase D is not per-market.** It runs **once across the catalog** when Phase B is broadly complete (or per-cluster once that cluster's handoffs are loaded), and is re-runnable on demand. Don't run it after every market load — that's wasted work.

### Inputs Phase D depends on

| Entity | Why |
|---|---|
| `processes` | Reference catalog of named industry-standard processes (APQC PCF) that discovery maps clustered handoffs against. See [Process framework — APQC PCF](#process-framework--apqc-pcf) below. |
| `trigger_events` | Controlled vocabulary on `cross_domain_handoffs.trigger_event_id`. The trigger-event prefix is the primary clustering signal — `offer.*`, `employee.*`, `incident.*`. |
| `cross_domain_handoffs` | Phase-B substrate. Discovery operates on the handoff DAG. |

### Discovery procedure

Five clustering signals drive discovery:

1. **Trigger-event prefix** (`offer.*`, `employee.*`, `incident.*`) — **primary signal** (the bucketing rule in v1).
2. **Data-object lifecycle trace** (chain of handoffs an object travels through) — secondary, scored within bucket.
3. **Domain-graph community detection** (densely connected subgraphs in the handoff DAG) — secondary.
4. **High-friction subset** (`friction_level=high` cluster) — secondary.
5. **Business-function involvement** (≥3 functions in a handoff cluster ⇒ process candidate) — filter.

Per-bucket metrics: `handoff_count`, `distinct_domain_count`, `distinct_function_count`, `friction_score` (high=3, medium=2, low=1, summed), `friction_high_count`, top 3 trigger events, and the auto-matched APQC PCF row (a hint, not authority — verify the PCF parent before committing). Ranking formula: `rank_score = friction_score × distinct_function_count`. Quality bar for top candidates: ≥3 domains, ≥3 functions, ≥4 handoffs, ≥1 high-friction. Target volume: ≥10 candidates total.

Each candidate cluster is matched against `processes` (APQC PCF) on name/description substring similarity. Unmatched clusters become candidates for `source_framework='custom'` process rows using the [custom-process naming convention](#custom-process-naming-convention) below.

### Running discovery

Use the saved query. Re-runnable against current substrate any time:

```sh
bun run .tmp_deploy/discovery_query.ts --top 25       # ranked candidate table
bun run .tmp_deploy/discovery_query.ts --bucket employee   # drill-down on one bucket
```

Full doc + interpretation guide: [references/discovery-query.md](references/discovery-query.md). The query implements signal #1 (trigger-event prefix) as the bucketing rule; signals #2-5 are scored as metrics within each bucket but don't subdivide it further in v1.

### How to interpret discovery output

The query prints one row per prefix bucket with `rank_score = friction_score × distinct_function_count`. A high rank means **wide function spread + high integration friction** — the orchestrations where an agent skill removes the most coordination overhead.

Two worked examples from the 2026-05-22 first run:

- **`employee` (rank 437):** 12 handoffs, 12 domains, 19 functions, 3 high-friction. The cross-cutting Joiner-Mover-Leaver orchestration: HCM publishes `employee.created` → Onboarding + Payroll + IGA + Talent-Mgmt all subscribe via one shared `trigger_events.id`. High function spread because HR + IT + Finance + Workplace all touch it. The single largest opportunity in the catalog; the rank confirms the intuition.
- **`opportunity` (rank 190):** 9 handoffs, 10 domains, 10 functions, 3 high-friction. The lead-to-cash motion — CRM → SALES-ENG → CPQ → CLM → ERP-FIN. Lower domain count than `employee` but comparable friction. Classic revenue process.

The PCF auto-matcher prefers low-`hierarchy_level` substring matches but often lands on weak L4/L5 leaves. **Treat the matched `process_name` as a hint and verify against the actual PCF parents before committing.** Some buckets (modern digital concepts like `data_asset`, `dlp_incident`, `customer_golden_record`) genuinely have no PCF match and should be promoted to `source_framework='custom'`.

### Process framework — APQC PCF

`processes.source_framework` is the discriminator enum:

| Value | What it holds |
|---|---|
| `apqc_pcf_cross_industry` | APQC's cross-industry PCF v8 (~250-300 rows, 5-level hierarchy). **The current loaded framework.** |
| `apqc_pcf_banking`, `apqc_pcf_consumer_products`, `apqc_pcf_electric_utilities`, `apqc_pcf_pharmaceutical`, `apqc_pcf_telecom` | Industry-specific PCFs. **Placeholder enum values** — not yet loaded. |
| `custom` | Org-specific or discovery-derived processes not in any PCF. |

`processes.external_id` carries the framework's own identifier — the PCF ID (e.g. `6.1.1`, `8.4.2.1`) for any `apqc_pcf_*` row; empty string for `custom`.

`processes.hierarchy_level` is 1–5 matching APQC's level scheme for PCF rows; 1–N for custom.

License: the APQC PCF is licensed perpetually, royalty-free, with attribution. Attribution is handled by a repo-level [`LICENSE-APQC-PCF.md`](../../../LICENSE-APQC-PCF.md) — no per-row attribution field needed.

### Custom-process naming convention

Any `processes` row with `source_framework='custom'` follows the convention:

```
CUSTOM-<CLUSTER>-<SHORT-NAME>
```

Examples: `CUSTOM-ONBOARD-DAY-1`, `CUSTOM-ACME-INTRA-LEGAL`, `CUSTOM-HR-OFFBOARDING-EXIT-INTERVIEW`. Keep `<SHORT-NAME>` to a handful of dash-separated tokens. The prefix makes custom rows trivially filterable and distinguishes them from PCF imports.

### Trigger-event ownership — "one event, many subscribers"

When a single trigger fires from one domain to multiple targets (e.g. `employee.created` → Onboarding + Payroll + IGA + Talent-Mgmt), **all four subscriber rows in `cross_domain_handoffs` reference the SAME `trigger_events.id`.** Event semantics (publisher, data object, state transition, description) live in **one** `trigger_events` row. Integration metadata (`friction_level`, `integration_pattern`, `notes`) lives on the **per-edge** handoff row.

This is the standard pub/sub model and the only shape that keeps the trigger-event-prefix clustering signal (signal #1 above) clean for discovery. Never create separate `trigger_events` rows per subscriber.

---

## Classification heuristics

Beyond the point-solution-market test, these heuristics resolve the ambiguous cases that came up most often:

- **Umbrella vs sub-domain.** Both can be valid simultaneously. ITAM is an umbrella with its own market (Flexera One, Ivanti Neurons for ITAM). HAM, SAM, FinOps, EAM are sub-domains, each with their own point-solution markets. Model both levels via `parent_domain_id` — but only when both levels have independent vendor competition. AIOps as a sub-domain of ITOM is borderline; left top-level because the vendor list (BigPanda, Moogsoft, Dynatrace Davis) is distinct enough.

- **Vendor identity after acquisitions.** Use the *current legal owner* in `vendors.vendor_name`. Mention the predecessor in `description` or `notes`. Examples to remember: LeanIX → SAP SE, ServiceMax → PTC, MuleSoft → Salesforce Inc, Lightstep → ServiceNow Inc, Apptio → IBM, Plex → Rockwell Automation, CloudHealth → Broadcom, Reflexis → Zebra Technologies, Sapling → Kallidus, Blue Prism → SS&C, Signavio → SAP SE, Splunk → Cisco (the vendor is still Splunk; Cisco is the parent).

- **Product re-brands.** A renamed product gets a single solution row under its current name; the old name belongs in `description` or `notes`. Don't double-row: ServiceNow GRC and ServiceNow IRM are the same product, model once as IRM.

- **Same product, multiple domains.** A solution can legitimately cover many domains — one solution row, multiple `solution_domains` rows with the right `coverage_level`. ServiceNow IRM has `primary` on GRC and `secondary` on AUDIT, BCM, OP-RES, TPRM, PRIV-MGMT, ESG.

- **Platform vs product granularity.** The schema has no `parent_solution_id` column, so don't try to model an umbrella platform *plus* every sub-product. Pick one level. For ServiceNow we picked per-product (40-ish rows); for competitors we picked their flagship per domain. Don't mix levels arbitrarily — pick a rule per vendor.

- **Capabilities vs sub-domains.** When a concept fails the domain test, decide between modelling it as a sub-domain (rare) or as a capability (common). A capability is something an org *can do* expressed as a noun (Lead Management, Vulnerability Scanning, Automated Invoice Matching). It is independent of which solution delivers it.

- **Custom processes use the `CUSTOM-<CLUSTER>-<SHORT-NAME>` prefix.** Any `processes` row with `source_framework='custom'` (i.e. not an APQC PCF import) must use this convention — `CUSTOM-ONBOARD-DAY-1`, `CUSTOM-HR-OFFBOARDING-EXIT-INTERVIEW`. The prefix keeps custom rows trivially filterable. Full convention in [Phase D — Custom-process naming convention](#custom-process-naming-convention).

- **`solution_kind` — classify only when a solution actually sources tools.** The enum on `solutions` has four values; the default `standard_solution` is the right answer for the vast majority of rows. Only promote to a non-default value when at least one `tool_solutions` row points at the solution. When-to-set guidance:

  | Value | When to set | Examples |
  |---|---|---|
  | `external_connector` | Solution is a **system of record** the agent reads/writes business data against (CRUD reaches the solution's API, the solution owns the row's lifecycle). Pairs with `tools` whose `operation_kind ∈ {query, mutate}` and whose `data_object_id` points at the data_object that solution masters | Salesforce CRM, SAP S/4HANA, Oracle NetSuite, Workday HCM, ServiceNow ITSM, HubSpot |
  | `action` | Solution provides a **side-effect** (does something in the world; returns ack-not-data). Pairs with `tools` whose `operation_kind='side_effect'` | Microsoft 365 (email/calendar), Google Workspace, Slack, Twilio, DocuSign, Stripe |
  | `compute_service` | Solution provides **compute / AI / web automation** (pure transformation; no business-state ownership). Pairs with `tools` whose `operation_kind='compute'` | OpenAI Platform, Anthropic API, Playwright, AWS Bedrock, ElevenLabs |
  | `standard_solution` | **Default.** The solution is in the catalog as a market entrant / vendor offering, but it has not (yet) been wired up as a tool source for any skill | Most of the ~600 solutions in the catalog |

  **Semantius is NOT in the enum.** Semantius's own coverage is read from `tools.operation_kind` directly — never from a `tool_solutions` row pointing at a `semantius_native` solution (that value was deliberately dropped). If you find yourself wanting to model "this tool is also delivered by Semantius", stop: that's already implicit in the tool's `operation_kind` being in the Semantius-covered set (`{query, mutate}` today).

  **Promotion is one-way and driven by usage.** Only promote a `standard_solution` row to a non-default `solution_kind` when you're about to insert at least one `tool_solutions` row referencing it. Don't pre-classify "this looks like an action vendor" speculatively — empty `tool_solutions` rows behind a non-default `solution_kind` create a misleading rollup.

---

## System-skill tool derivation (P2.5A.i + P2.5A.ii patterns, 2026-05-22)

### Session bootstrap — always verify catalog state first

When you start a session that involves drafting / loading `skills` or `skill_tools`, the **first action** is to verify live counts. The catalog is multi-session and **users add domains between sessions** (during one 2026-05-22 session, 7 new domains were loaded by the user while the assistant was processing other work).

### Subagent prompt discipline for Phase-B research

If you spawn `Explore`-type subagents to research Phase-B for multiple domains in parallel (the pattern P2.5A.0 introduced and the 2026-05-22 Phase-B Lite batch 1 expanded), prompt construction directly determines loader-usability of the output:

- **Demand a structured table** of `data_object_name | singular_label | plural_label | description` and **require** snake_case_plural names. Open-ended "produce a Phase-B draft" prompts produce essays with embedded prose tables that need manual parsing.
- **Forbid MCP tools explicitly** — include in every subagent prompt: *"Do NOT call any `mcp__claude_ai_deno__*`, `mcp__claude_ai_tests-ops__*`, or other `mcp__*` Semantius tool. Use the `semantius` CLI via Bash only (rule #0)."* Subagents inherit access to MCP servers and reach for them out of habit; rule #0 in this SKILL.md is not enough — it must be restated in the prompt. Discovered 2026-05-22 batch 3: multiple subagents silently used MCP reads despite the prompt citing CLI-only patterns, producing outputs sourced from the wrong tenant or from MCP-cached resources rather than the live `tests` org.
- **Make trigger_events + cross_domain_handoffs OPTIONAL, not required.** Empirically, agents inconsistently produce them in parseable form (some use plain markdown tables, some YAML frontmatter, some prose). Masters alone are sufficient for Phase-B Lite (data_objects + master `domain_data_objects` only); trigger_events + handoffs can be a separate focused pass.
- **State boundary alerts explicitly in the prompt** ("don't propose X, it's mastered by Y; use Z naming instead"). Without this, agents re-propose entities that already exist or use colliding names.
- **Tell agents to defer to the user when boundaries are unresolved.** Better to get a "needs decision" flag than wrong-mastered rows. The EAM batch-1 audit returned blockers instead of bad rows — that's the correct failure mode.
- **Cap word count aggressively** (≤1000 words). Verbose drafts hide the load-ready content under analysis.
- **Use `general-purpose` (not `Explore`) when the subagent must write files.** The `Explore` subagent type lacks the `Write` tool — it can read state and reason, but cannot persist JSON/markdown to disk. The handoff backfill (2026-05-22) lost 8 of 10 first-round outputs when Explore agents "wrote the JSON" only in their reply text, which was discarded. `general-purpose` has the full toolset including Write. Reserve `Explore` for read-only research questions whose result fits in a 250-word reply summary.
- **Cap cluster size to ~10 domains per agent.** The same backfill's cluster J (17 domains) hung twice and had to be killed; splitting into J1 (8 domains) + J2 (9 domains) completed cleanly. Agents seem to lose plot at roughly the 12-domain mark.
- **For file outputs, dictate the exact path in the prompt** (`Write the JSON to c:/tmp/<name>.json`). Agents that "remember" the path often emit it in the reply or write to an arbitrary location.

The batch-1 anti-pattern catalogue (one bad shape each, all from 2026-05-22):
- ❌ Agent wraps proposal in `---artifact: phase-b-research\nsystem_name: ...` YAML frontmatter — looks like a different tool's output format; not parseable.
- ❌ Agent restates the entire SKILL.md guidance back at you before its proposal — burns tokens, doesn't add anything.
- ❌ Agent classifies entities by confidence (High/Medium/Low) instead of committing — useful for review but not load-ready.
- ❌ Agent refuses to commit and asks for a stakeholder meeting / cross-domain alignment call.

```bash
semantius call crud postgrestRequest '{"method":"GET","path":"/domains?select=id&limit=10000"}'   # count
semantius call crud postgrestRequest '{"method":"GET","path":"/skills?select=skill_name,domain_id&order=domain_id.asc"}'  # who already has a system skill
semantius call crud postgrestRequest '{"method":"GET","path":"/tools?select=tool_name&order=tool_name.asc&limit=10000"}'  # what queries/mutates already exist (dedupe!)
```

Always query live state (counts, existing skills, existing tools) before drafting — the catalog is multi-session and rows are added between sessions. Past discovery: 3 existing query tools would have been duplicated without a dedup pre-check. Always dedupe `tools` by `tool_name` before inserting.

### Three-source derivation procedure

When authoring a `skills` row with `skill_type='system'` (one-to-one with a domain), the required-tool set is derived from three sources, in order:

1. **The domain's `data_objects` masters** — every master gets at minimum `query_<data_object_name>`, and for any master with an obvious write workflow also a representative mutate tool (verb-driven name like `create_incident`, `update_budget`, `approve_headcount_plan`). Both are `requirement_level='required'`. This alone usually gets you to ~80% of the required-tool set.
2. **The domain's `contributor` / `consumer` `data_objects`** — query tools for the cross-domain reads the workflow can't function without (e.g. PA `query_employees` reads HCM; EPM `query_journal_entries` reads ERP-FIN). Mark `required` only when the workflow demonstrably needs the read, not for every consumer relationship the catalog records.
3. **The domain's outbound `cross_domain_handoffs`** — when a handoff says "this domain triggers an event that creates a record in another domain", the system skill needs the mutate tool on the receiving side. Canonical examples: CMDB → ITSM `create_incident` for `ci.unauthorized_change_detected`; SWP → ATS `create_candidate` for `headcount.approved`; AUDIT → GRC `close_follow_up_action` for finding-closure cascades. These are `required`.

### The 100%-Semantius hypothesis test

For each system skill the killer-hypothesis rollup is: `% = (required tools with operation_kind ∈ {query, mutate}) / (total required tools)`. **100% means every workflow primitive the skill needs is delivered by Semantius CRUD + cube — no external connector, no side_effect, no compute tool required.**

Empirical result across 12 candidates (P2.5A.i, 2026-05-22):

| Tranche | 100% Semantius? |
|---|---|
| **Pure governance / register / lifecycle** — GRC (16/16), AUDIT (17/17), DCG (15/15), DQ (10/10), MDM (11/11) | ✅ 100% |
| **Pure planning / portfolio / catalog** — APM (9/9), SPM (17/17), SWP (13/13), EPM (8/8), ESG (15/15) | ✅ 100% |
| **Pure operational substrate** — CMDB (7/7) | ✅ 100% |
| **Analytics + comms** — PA (12/14) | ❌ 86% — `generate_text` (compute, attrition narratives) and `send_email` (side_effect, engagement-survey distribution) are non-negotiable for PA's core workflow |

The reliable predictor of *not* being 100% Semantius: the domain's core workflow involves **(a)** generating narrative/explanation text the user reads, **(b)** distributing artefacts to recipients via external channels (email, SMS, mailers), or **(c)** running ML/statistical scoring beyond what computed_fields express. PA hits (a) + (b). When you encounter a system-skill draft that looks like it needs LLM generation or external comms in the *required* set, that's the signal to expect a sub-100% result — and the signal that the domain genuinely benefits from non-Semantius tool delivery.

### Cross-tranche external-tool patterns (P2.5A.ii, 2026-05-22)

After running 22 system-skill drafts across the catalog (12 hypothesis-candidates + 10 obvious-non-Semantius), the external tools that appear in REQUIRED sets cluster into recognisable shapes:

| Pattern | Tool | Where it appears as required | Why |
|---|---|---|---|
| **Universal external dependency** | `send_email` | ITSM, HCM, ATS, MA, ESIGN, PAYROLL, S2P, LMS, PA (9 of 22 skills) | Operational systems all need notifications to humans. The most-frequent reason a skill drops below 100% Semantius. |
| **Talent + contract domains** | `sign_document` | HCM, ATS, ESIGN, S2P (4 of 22) | Contracts, offer letters, supplier agreements all need e-signature. |
| **Calendar-driven scheduling** | `create_calendar_event` | ATS (interview scheduling) | Anywhere a human appointment is part of the workflow. |
| **ChatOps for operational systems** | `post_chat_message` | ITSM (major-incident bridge) | Slack/Teams integration for real-time ops coordination. |
| **Voice / SMS / telephony domains** | `make_phone_call`, `send_sms` | CCAAS | When the channel itself is the workflow. |
| **Audio + sentiment analytics** | `transcribe_audio`, `detect_sentiment` | CCAAS (call recordings), PA (engagement surveys), SMM (mentions) | "Listen to humans at scale" workflows. |
| **External payment processors** | `execute_payment` | PAYROLL | Bank transfers / ACH always external. |
| **External social platforms** | `post_social_message` | SMM | LinkedIn/X/Meta/TikTok/Instagram publish APIs. |
| **ML scoring beyond computed_fields** | `classify_text`, `generate_text` | MA (lead scoring), PA (attrition narratives) | When the domain's workflow involves AI-driven text classification or generation that exceeds what JsonLogic computed_fields can express. |

The lowest-% skills in the catalog are the ones that combine multiple of these patterns:
- **CCAAS at 60%** — voice + SMS + transcription + sentiment (4 external requirements)
- **ESIGN at 67%** — `sign_document` IS the workflow; small required-tool set magnifies the ratio
- **HCM / ATS / S2P at 83-86%** — email + e-signature combo for talent/supplier comms

The highest non-100% are **LMS and B2C-COMM, both at 91%** — each with only two non-covered tools (LMS: `send_email`; B2C-COMM: `send_email` + `execute_payment`). If Semantius gains a native email primitive (a future `operation_kind` value), LMS flips to 100% with a single reclassification, and B2C-COMM moves to ~95%. These are the "almost-Semantius" canaries — watch for them when scanning for skills near the 100% boundary.

### Leadership-layer domains have no system skill

Domains that the catalog marks as leadership-layer / aggregation-tier (per the SKILL.md "Leadership-layer / aggregation-tier domains often master nothing" rule) do **not** get a system skill. They read upstream and publish derived signals; there's no domain-owned data_object surface for a system skill to operate on.

**Verified leadership-tier (by-design zero masters; do NOT scaffold Phase-B for these):** REV-INTEL, SALES-PERF, GTM-PLAN, ACCT-PLAN, PRM, OP-RES, BCM, SECOPS, SOAR, THREAT-INTEL, TPRM, VULN-MGMT, PRIV-MGMT, FINOPS, INTRANET, COLLAB-GOV — **16 domains**. They read from upstream cluster data_objects (CRM `opportunities`, CMDB `configuration_items`, ESG `emissions_records`, ERP-FIN `journal_entries`, etc.) and publish derived signals via `cross_domain_handoffs` with `data_object_id` pointing at the upstream master.

EPM is a partial exception — it has the leadership-layer character but does master `financial_plans`/`budgets`/`forecasts`/`variance_analyses`/`financial_scenarios`, so EPM does get a system skill.

Quick check before drafting any system skill: `semantius call crud postgrestRequest '{"method":"GET","path":"/domain_data_objects?domain_id=eq.<id>&role=eq.master"}'`. Zero masters = skip. If the domain genuinely is supposed to have masters (and you're not skipping for the leadership-layer reason), that's a Phase-B gap — backfill before drafting the skill. Don't paper over a Phase-B gap by inventing skill_tools that reference data_objects from other domains — that produces a skill whose entire required-tool set is consumer-reads, which is not a system skill.

### Anti-patterns specific to system-skill derivation

- ❌ Marking every `tool_solutions` candidate as `required`. If something is "nice to have but the workflow proceeds without it", it's `optional`. Inflating `required` breaks the hypothesis test by hiding real coverage gaps.
- ❌ Adding tools for every `consumer` data_object the catalog records. Many consumer relationships are analytical (dashboards roll up) and don't drive the core operational workflow. Only required when the workflow can't proceed without the read.
- ❌ Creating a generic `mutate_<data_object>` tool for every master. The existing convention is verb-driven (`update_budget`, `create_audit_finding`, `approve_headcount_plan`). Generic `mutate_*` names are not searchable and lose the workflow semantics.
- ❌ Using `vendors` as a `data_object_id` target for query tools. `vendors` is the catalog's vendor reference table (legal entities); it is **not** a Semantius data_object. Read vendor-shaped records via `query_suppliers` (the `suppliers` data_object).
- ❌ Re-creating query tools that already exist. Always read `/tools` and dedupe by `tool_name` before drafting. P2.5A.i discovered 3 existing query tools that would have duplicated (`query_employees`, `query_journal_entries`, `query_suppliers`).
- ❌ Drafting a system skill for a domain with zero masters. The skill would have nothing to query/mutate, which means either (a) the domain is leadership-layer and shouldn't have a skill at all, or (b) Phase-B is incomplete and needs backfilling first. **Don't paper over a Phase-B gap by inventing skill_tools that reference data_objects from other domains** — that produces a skill whose entire required-tool set is consumer-reads, which is not a system skill.
- ❌ Stamping `record_status='approved'` on freshly-loaded skills/tools/skill_tools without an explicit user review pass. Rule #1 applies to these entities the same as to any other catalog row.

---

## Process-skill tool derivation (P2.5B pattern, 2026-05-22)

Process skills (`skill_type='process'`) span multiple domains and orchestrate cross-domain workflows. Tool requirements derive from the candidate's involved domains, not from a single domain's masters:

1. **Identify the cluster's domains** from the Phase D discovery query output ([references/discovery-query.md](references/discovery-query.md)). Each candidate bucket lists its source + target domains (via the underlying `cross_domain_handoffs` rows). Decompose into two sets:
   - `query_domains` — domains the process reads from (every domain in the bucket, source or target).
   - `mutate_domains` — domains the process writes to (target domains of write-shaped handoffs; source domains for rollback/correction handoffs).
   Surface the two sets to the user before drafting tools; they're the editorial input that determines the skill's surface.
2. **Auto-derive query tools** — every master `data_object` across `query_domains` contributes its existing `query_<master>` tool as REQUIRED. The catalog already has these from the system-skill derivation pass; no new query tools needed. Dedupe by `tool_name`.
3. **Auto-derive mutate tools** — for each `mutate_domain`, link any existing `update_<master>` / `create_<master>` / verb-driven mutate tool as REQUIRED. Mutates are sparser than queries — skip the master if no mutate exists yet (don't auto-generate generic ones).
4. **Add cross-cutting externals** — apply the recurring patterns from [§ Cross-tranche external-tool patterns](#cross-tranche-external-tool-patterns-p25aii-2026-05-22). Email + sign_document + chat are the most common; if the process involves customer-facing comms or contract execution, add the relevant external tool as REQUIRED.
5. **Apply the coverage rollup** ([references/semantius-coverage-rollup.md](references/semantius-coverage-rollup.md)) — process skills sit at 92-97% by design (every workflow needs at least `send_email`). 100% is rare and usually means the skill is mis-modeled as a process skill when it's actually a system skill.

Reference loader: [.tmp_deploy/load_p25b_process_skills.ts](../../../.tmp_deploy/load_p25b_process_skills.ts). It reads the involved-domain sets from a hard-coded map (one entry per process skill), pulls live master sets, links tools idempotently.

---

## Anti-patterns

- ❌ Marking AI-researched rows as `approved` because they "look right". See rule #1.
- ❌ Adding a solution row for every sub-module of a vendor's platform when the vendor already has a flagship row. Inflates counts, fragments coverage, loses the comparison.
- ❌ Importing ServiceNow's marketing taxonomy verbatim as domains. Run each entry through the point-solution test first.
- ❌ Loading rows without first reading the existing catalog. Produces duplicates with inconsistent capitalisation that are painful to clean up.
- ❌ Putting qualifiers (coverage level, ownership, applicability) on the core entity instead of the junction. See rule #3.
- ❌ Writing one-off CLI calls for more than ~5 rows. Extend [.tmp_deploy/load_research.ts](.tmp_deploy/load_research.ts) instead — it's why the script exists.
- ❌ Loading a new market with `domains` + `vendors` + `solutions` + `solution_domains` and stopping there. Capabilities (+ `capability_domains`) are part of the Phase-A load shape, not an optional follow-up. See workflow step 5.
- ❌ Stopping after Phase A (market shape) and not running Phase B (data-object footprint — data_objects, domain_data_objects, cross_domain_handoffs). A market without its mastered/contributed data objects and its outbound handoffs contributes zero to Signal 1 and Signal 2, which is what the catalog exists to support. See workflow step 5.
- ❌ Stopping after Phase A+B and not running Phase C (business_function_domains, optionally business_function_capabilities). A market without functional ownership contributes zero to the buyer-persona / RACI axis (Signal 3). The function-axis spine is small, but the per-domain links are part of every market load from 2026-05-20 onward.
- ❌ Skipping Phase M (modules) on a new domain load. Every domain has ≥1 module per Rule #14 — no exceptions. A domain row without modules is non-deployable; it's a market-research stub, not a working catalog entry.
- ❌ Loading a multi-module domain (≥3 capabilities) without Phase E. A domain with modules but no roles is half-loaded — the deployer can install the modules but can't provision the users. Run E1–E6 before declaring the load done. See the E section of the completeness checklist.
- ❌ Authoring a role with `role_modules` on only 1 module. Single-module personas are a permission tier on that module, not a role. The 2-module floor (E2) is the structural justification for a row existing in `roles` at all.
- ❌ Domain-prefixing role codes (`ATS-RECRUITER`, `ITSM-AGENT`). Roles are function-scoped, not domain-scoped — a Recruiter belongs to Recruiting, not to ATS. Use `<FUNCTION-CODE>-<ROLE-NAME>` (`RECRUITING-RECRUITER`) or, for cross-functional roles, drop the prefix entirely (`HIRING-MANAGER`).
- ❌ Enumerating every workflow gate in a role's `role_permissions` bundle. Use the tier-level grant (`<module>:admin`) and let Semantius's `permission_hierarchy` auto-include the gates — bundles stay short, new gates auto-flow to admin-tier roles. Only list specific gates that an IC-tier role needs explicitly (e.g. `ats-offers:approve_offer` for Recruiter, who otherwise has `:manage` not `:admin`).
- ❌ Treating [Phase D](#phase-d--process-skill-discovery-substrate-level) as a fourth per-market load step. Phase D is a **substrate-level analytic** that runs across the catalog once Phase B is broadly complete. Running it after every single market load is wasted work; skipping it entirely once enough clusters have shipped Phase B is the actual failure mode.
- ❌ Creating one `trigger_events` row per subscriber when a single event fans out. All subscribers of `employee.created` share **one** `trigger_events.id`; only the handoff rows differ. Duplicating events per subscriber breaks Phase D's primary clustering signal.
- ❌ Treating `cross_domain_handoffs.data_object_id` as the publisher's data_object. It's the **per-edge payload** — the artifact in flight on that specific handoff. The publisher's data_object lives on `trigger_events.data_object_id` and is shared across every subscriber of the event. These two columns ARE allowed to differ (HCM publishes `employee.created` on `employees`; the HCM→Onboarding handoff carries `onboarding_journeys` as the payload). Reviewers regularly conflate them when reading a handoff row in isolation.
- ❌ Scaffolding synthetic `data_objects` for leadership-layer / aggregation-tier domains (REV-INTEL, SALES-PERF, GTM-PLAN, ACCT-PLAN, PRM, EPM) just so they "own something". These domains read upstream and publish derived signals; the handoff's `data_object_id` references the upstream cluster's data_object directly. Forcing ownership via synthetic objects creates dead rows that nothing else references.
- ❌ Inferring catalog state from `.tmp_deploy/*.ts` deploy scripts. They drift the moment they ship. Cluster inventories MUST query live `postgrestRequest` endpoints — see workflow step 1.
- ❌ Treating `domain_data_objects.notes` as a required field on every master row. `notes` is for research details / decisions worth preserving (slice ownership on multi-master / embedded_master rows per Rule #3 and the anti-pattern above, demotion-path explanations, point-solution-vs-holistic carve-outs, classification rationale that a future reviewer would otherwise have to re-derive). Empty `notes` on a single-master row with no decision worth recording is the right shape, not a gap. The fact-sheet emitter and the per-domain checklist both treat this column as opt-in metadata, not a populate-on-every-row obligation.
- ❌ Loading a market with `min_org_size` of `xs`/`s` but only enterprise-tier solutions. If the stated minimum buyer is SMB/mid-market, the solution list must include at least 1–2 vendors that actually sell into that band. A list of pure enterprise solutions under an SMB-minimum domain is internally inconsistent and misleads downstream filters.
- ❌ Declaring a load or audit "done" without running the Per-domain completeness checklist (§ above). Every silent gap in this catalog's history followed the same pattern — someone shipped a market, the count of new rows looked right, no one ran the full checklist, and a category (`business_function_domains`, intra-domain `data_object_relationships`, lifecycle states) sat empty for weeks. Running the checklist is the gate; "I think I covered everything" is not a substitute. Specifically: do not declare ATS-shaped loads done until B6 (intra-domain relationships) and B7 (`users` edges) pass — those two were silently empty for ATS through Step-5's cluster pass and only surfaced when the fact sheet's mermaid rendered with disconnected nodes.
- ❌ Predicting numeric IDs inside a script. Always re-read after insert to build the id map.
- ❌ Trying to fit a large insert into a single command-line argument on Windows. Use stdin or chunk.
- ❌ `cd`ing into the skill folder, `.tmp_deploy/`, or any subdirectory before running `semantius` or a loader script. Silently routes to the wrong tenant. See rule #6.
- ❌ Writing project state, lessons learned, or "remember this for next time" notes to your memory system. Every persistent note about this project lives in committed files (SKILL.md, CLAUDE.md, references/). Memory is off-limits for this repo.
- ❌ Loading tool-shaped capability rows into `capabilities`. `Send Email`, `Transcribe Audio`, `Sign Document`, `Make Phone Call`, `Run Shell Command` — those are **`tools`** (lowercase snake_case verbs: `send_email`, `transcribe_audio`, `sign_document`), not `capabilities`. The `capabilities` table stays business-shaped: noun-phrase market features an org *can do* (`Lead Management`, `Vulnerability Scanning`, `Roadmap Visualization`, `Automated Invoice Matching`). If the row reads as a JSON-RPC function with an obvious verb-object shape, it belongs in `tools` with the right `operation_kind` and (for `query`/`mutate`) a `data_object_id` pointer. This anti-pattern is easy to fall into when a vendor's marketing page lists capabilities like "AI Voice Synthesis" — that's a *tool* the vendor delivers, not a *capability* of a domain.

---

## Quick reference

UI base: `https://tests.semantius.app/domain_map/<table_name>`

Reference loader: [.tmp_deploy/load_research.ts](.tmp_deploy/load_research.ts)

Module-shape reference: [references/module-shape.md](references/module-shape.md)

Fact-sheet emitter (explicit, user-triggered only): [scripts/emit_fact_sheet.ts](../../../scripts/emit_fact_sheet.ts). See § "Fact sheets (explicit step, not part of any sequence)".

**Tool selection for the question you're asking:**

- **Loading rows / writing data** → `semantius call crud postgrestRequest` (Layer 2). Every `.tmp_deploy/load_*.ts` script uses it.
- **Analytical questions — top-N, distribution, count-by, rank-by, "which domain has the most…", "how many capabilities per…"** → `semantius call cube discover` + `load` (Layer 3). Do **not** stream junction rows back with PostgREST and aggregate them in client code — that's the wrong layer and produces wrong-looking results (truncation, missed joins, manual GROUP BY in Bun).
- **One-off schema lookup** → `semantius call crud read_entity` / `read_field`.

See [`use-semantius` Decision Guide](../use-semantius/SKILL.md#quick-decision-guide) row 4 for the canonical guidance. The domain-map is heavy on ranking/aggregation questions ("which domains have the most capabilities", "owner-function distribution", "platform-vs-silos signals") — reach for cube by default on those, not PostgREST + post-processing.
