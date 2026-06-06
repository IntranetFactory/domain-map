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

## Authoring discipline for this skill

SKILL.md and its `references/` files are loaded on every invocation of this skill (or, for the references, fetched on-demand and read in full). Every word costs context, on every run, forever. When editing the skill, follow these rules; they are why the file is the size it is and not double that.

1. **Rules state what to do. Not when or why we decided.** A rule like "every domain has ≥1 module" stands on its own. "Rule added 2026-05-23 after the ATS audit miss" adds nothing to how the agent applies it. Drop the trailer.
2. **No dates inline.** No `2026-XX-XX`, no "as of last month", no "recently retired". If a rule changed, the rule's current text is what matters. The *when* and *why-then* belong in [references/skill-changelog.md](references/skill-changelog.md).
3. **No session jargon.** Project phase codes (`P2.5A`, `Wave 2`, `batch 1`, `first run`), internal sprint names, and "the X load on date Y" are unreadable to a future agent with no session memory. Strip them; restate the abstract finding.
4. **No empirical snapshots that drift.** "As of <date> this query returns 11 rows" is wrong by the next morning. Tell the agent to run the query; the query is the source of truth.
5. **Empirical *patterns* are fine.** Tables of recurring shapes (high-friction handoff archetypes, cross-tranche external tools) transfer regardless of when they were observed. Keep the table, drop the date trailer.
6. **The rationale that earns its place** is the kind that helps edge-case judgment: *"This rule exists because X collapses into Y when Z, so when you hit Z, prefer Y."* Not: *"We had a bad time on date D."*
7. **When you make a meaningful change to the skill — adding a rule, rescinding a license, splitting a phase — append a Decisions entry to [references/skill-changelog.md](references/skill-changelog.md).** That's the canonical home for war stories, dated context, and "why we decided this and not the alternative". The skill stays lean; the log carries the audit trail.
8. **Same rules apply to `references/*.md`.** They're loaded in full when consulted; bloat costs context the same way.

If you find yourself writing "rule added because…" or "when X happened on Y…", stop. The rule itself is what the agent runs on. The story goes to the changelog.

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

Every loader in this project is a `.ts` file run with `bun run <path>`. **Where the file lives:**

- **Reusable patterns referenced from SKILL.md / `references/`** live in **`scripts/loaders/`** (committed).
- **Read-only analytics** (and analytics with persistence side effects, like `discovery_query.ts`) live in **`scripts/analytics/`** (committed).
- **Dated one-off work** (per-domain audit fixes, frozen backfills, drafts in flight) lives in **`.tmp_deploy/`** (gitignored). When a one-off earns repeated reference, promote it to `scripts/loaders/` and update the cite in SKILL.md / `references/`.

Stick to that stack:

- **Use TypeScript + Bun** (`Bun.spawn`, `await new Response(...).text()`, top-level `await`). Reference patterns in [scripts/loaders/load_research.ts](scripts/loaders/load_research.ts) and the loader index in [references/loader-idiom.md](references/loader-idiom.md).
- **Do NOT use Python.** Python on Windows in this project fails in messy ways: encoding mismatches on stdin/stdout when piping JSON into `semantius`, venv/path drift between PowerShell and bash invocations, indentation errors that hide for whole runs, `subprocess` plumbing that swallows stderr, brittle `requests`/`httpx` pinning. The user has been burned enough times by this that "use Python" is not an acceptable suggestion regardless of context. If you think Python is the right tool, you're wrong — write the TypeScript instead.
- **Don't use Bash/PowerShell scripts** for anything beyond one-liner reads. Multi-step orchestration (read → diff → POST → re-read → POST) belongs in a `.ts` loader, not a shell pipeline. Shell is fine for `semantius call crud postgrestRequest '...'` smoke tests; everything else goes in TypeScript.
- **One-line semantius reads from the agent's tool call are fine** — `semantius call crud postgrestRequest '{"method":"GET","path":"/..."}'` via Bash is the canonical read pattern. The rule is about *loaders* (multi-step write orchestration), not about every CLI invocation.
- **No Python for verification / count summaries either.** "Just piping JSON into `python -c '...'` for a quick count" is exactly the door the rule slams. If a count or per-key tally is worth seeing, do it in TypeScript (`bun run -e '...'` or a `.ts` file), via `jq`, or with PostgREST aggregation params (`Prefer: count=exact`, `select=count(*)`). Never reach for Python "just this once."

When a subagent is given a research/load task, instruct it explicitly to produce TypeScript output and to never propose Python. Slam the door explicitly in the prompt; relying on the subagent to "know" Python is off-limits has failed in the past.

### 5. Use stdin or chunked inserts on Windows.

`semantius call crud postgrestRequest '...'` with a large JSON body hits the Windows command-line length limit (~32KB). The PostgREST POST in a typical load can easily blow past that. Two fixes:

- **Pipe via stdin** to the CLI: `semantius call crud postgrestRequest` reads JSON from stdin when no inline argument is supplied. Use this from Bun's `Bun.spawn` with `stdin: "pipe"`.
- **Chunk inserts** into batches of ≤50 rows. Simpler when the script is in a hurry.

The reference loader at [scripts/loaders/load_research.ts](scripts/loaders/load_research.ts) does both — and the canonical `insert()` helper lives in [references/loader-idiom.md](references/loader-idiom.md) (around line 110). **Start from one of those for any greenfield bulk insert.** Common failure mode: copying a per-row pattern (e.g. from `rename_data_object.ts`, which has its own pre-flight per row) into a greenfield loader. That turns N inserts into N subprocess spawns at ~300ms each — 1,000 rows = 5+ minutes when it should be sub-second. Per-row patterns are correct only when each row needs its own pre-flight against live state; for plain "insert a list of new rows," always use the chunked array-body POST.

### 6. JWT-audience errors: STOP, surface the verbatim error, wait for the user.

When a `semantius` call fails with `Error: This JWT does not have authorization to access this resource: required audience not found, received [...]`, this is a known server-side bug. Do not diagnose, do not retry in a loop, do not silently swallow.

**Do this, in order:**

1. **Stop.** Don't proceed with the next step of whatever you were doing.
2. **Surface the complete error string verbatim** to the user, including the `tenant://<id>` value and the command that triggered it.
3. **Wait for user confirmation** before continuing. The user decides whether to retry, switch approach, or abort.

Do not append the error to any file. The incidents are logged server-side.

**Other rules (still apply):**

- Never `cd` into `.claude/skills/...` or `.tmp_deploy/` before running anything that calls `semantius` — the CLI reads `.env` from cwd.
- **Never prefix any Bash command with `cd c:/dev/domain-map &&` (or any case variant: `cd C:/dev/domain-map &&`, `cd "c:/dev/domain-map" &&`, `cd /c/dev/domain-map &&`, etc.).** Your shell's cwd is already the project root. The `cd-into-the-root` prefix is pure ceremony that forces a permission prompt for the user and adds zero value. Call `semantius`, `bun`, `yq`, etc. directly with no `cd` prefix.
- Invoke loader scripts with an absolute path from the project root: `bun run "<absolute-path-to-loader>"`.
- If you ever need to sanity-check the tenant: `semantius call crud getCurrentUser '{}'` and confirm `email` and `semantius_org` match the project.

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
2. **Loader hard-fail.** Any script that inserts into `domains` must validate the payload against the manifest before the POST. If `crud_percentage === 0 || min_org_size === '' || cost_band === '' || (business_logic === '' && crud_percentage < 95) || usa_market_size_usd_m === 0 || market_size_source_year === 0`, throw — don't write. Convert silent omission into loud failure. See `validateDomainRow()` in [scripts/loaders/load_research.ts](scripts/loaders/load_research.ts) for the canonical implementation.
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

### 12. Lifecycle states are gated by `data_objects.entity_type`.

Every master data_object MUST have `entity_type` classified (default `unclassified` is treated as an audit failure). The classification determines whether lifecycle states are required:

| `entity_type` | Lifecycle states | Audit |
|---|---|---|
| `operational_workflow` | required | fail if missing |
| `operational_record` | not required | pass |
| `catalog` | not required (permitted; templates with publishing flows like `offer_letter_templates` DO have lifecycle) | pass |
| `junction` | not required (permitted; qualifier-carrying junctions like `talent_pool_memberships` DO have lifecycle) | pass |
| `computed` | not required | pass |
| `unclassified` | indeterminate | fail |

**Write tier by `entity_type` (B2).** Beyond lifecycle, `entity_type` also selects which existing module baseline governs an entity's WRITES (read is uniformly `:read`). This is DERIVED at emit time by `deriveWriteTier` in `scripts/emit_fact_sheet.ts` and rendered as the section-3 "write tier" column; no new permission is minted and nothing is stored on `data_objects`.

| `entity_type` | write tier | notes |
|---|---|---|
| `operational_workflow` | `:manage` | plus the workflow gates on `requires_permission` transitions |
| `operational_record` | `:manage` | |
| `catalog` | `:admin` | reference data; reconfiguring it is an admin act |
| `junction` | `:admin` if a linked endpoint is `catalog`, else `:manage` | resolved from the relationship endpoints |
| `computed` | none (read-only) | no write permission emitted |
| `unclassified` | `:manage` _(pending)_ | graceful fallback (m2); the emitter never aborts, the hard check is audit band B13 |

**The exemption is structural now, not prose.** If a master is genuinely config / record / junction / computed, classify it via `entity_type` and move on. The earlier practice of recording the config-shape exemption in `data_objects.notes` is RESCINDED at every layer: Rule #15 removed the license for the notes write; this rule moves the classification itself to a typed column. There is no notes-based exemption surface.

**Pattern flags** (`has_personal_content`, `has_submit_lock`, `has_single_approver`) still need to be considered for any master with `entity_type='operational_workflow'`. Auto-populating `notes` to explain a flag remains forbidden (Rule #15). If a flag's reasoning is non-obvious, surface in chat so the user can decide whether and how to record it.

**Why this matters mechanically.** Lifecycle states are the source from which workflow-gate permissions materialize, one row with `requires_permission=true` ⇒ one `<module>:<verb>_<entity>` permission via Rule #14's module-permission derivation. Skipping them on an `operational_workflow` entity silently hollows the entire role-bundling layer for that domain. The `entity_type` enum makes "should this have lifecycle?" deterministic at audit time and stops the audit from re-asking the same per-row question every pass.

**Gate (and override) prefix and re-prefix (plan-4).** A derived permission's prefix is the realizing module's `domain_module_code` (M14): `<realizing-module>:<verb>_<entity>` for a gate, `<module>:view_all_<entity>` etc. for a pattern-flag override. But when a module carries an entity as `embedded_master` and that entity's canonical realizing module is NOT in the deploying unit, the permission RE-PREFIXES to the installing unit instead of dangling at (or being pruned with) the absent realizer: a hiring starter embedding `job_offers` mints `hiring-starter:approve_offer` (gate) and `hiring-starter:view_all_offers` (override), not `ats-offers:...`. This applies UNIFORMLY to all three derived kinds an embedded entity carries: workflow gates, pattern-flag overrides (`view_all_` / `manage_all_` / `submit_`), and the §8.2 business rules that reference them. The shared `deriveGate` and `deriveWorkflowGatesAndRules` in the emitter keep the §7 label and the §8.1 mint in agreement; see [references/modules.md](references/modules.md) §4 "State realization at deploy". This is why a starter is no longer "baseline-permissions-only" (Rule #19, revised by plan-4): it materializes the full re-prefixed governance of the entities it embeds. (Plan 5 proposes replacing the re-prefix with deployment-stable entity-scoped identity; design only, not yet executed.)

**Classification heuristic** (use at insert time):

- `operational_workflow` — real-world business object with a workflow (candidates, incidents, job_offers, employees, change_requests)
- `operational_record` — per-X record without business workflow (notes, files, acknowledgements, log entries, append-only trails, audit logs)
- `catalog` — config / template / taxonomy / rule definition referenced by other entities (templates, question banks, taxonomies, configured bundles)
- `junction` — N:M link, may carry a qualifier (`<a>_<b>_assignments`, `<a>_<b>_memberships`)
- `computed` — derived rollup or projection (workloads, aggregate ratings)
- `unclassified` — fallback only; surfaces as an audit failure (B13)

### 13. Catalog enums to know without rediscovering them.

The Semantius platform enforces enum check-constraints on several catalog columns. Guessing values that "sound right" wastes a round-trip and a re-run. **The live `/fields` definitions are the only source of truth for these vocabularies.** The table below is a convenience cache, not hand-authored truth: it is re-derived and verified against live by the enum-drift review-band check (which fails when any hand-maintained copy disagrees with `/fields`), so treat it as a generated artifact. If it ever disagrees with a live constraint, live wins and the check will flag the drift. The non-obvious ones:

| Table.field | Allowed values | Common wrong guesses |
|---|---|---|
| `trigger_events.event_category` | `lifecycle`, `state_change`, `threshold`, `signal` | `state_transition` ❌ |
| `handoffs.integration_pattern` | `event_stream`, `api_call`, `batch_sync`, `manual_handoff`, `file_drop`, `lifecycle_progression` | `event_driven` ❌ |
| `handoffs.friction_level` | `low`, `medium`, `high` | (none) |
| `domain_data_objects.role` / `domain_module_data_objects.role` | `master`, `embedded_master`, `contributor`, `consumer`, `derived` | `owned`, `referenced` ❌ |
| `domain_data_objects.necessity` / `domain_module_data_objects.necessity` | `required`, `optional` | `mandatory` ❌ |
| `handoff_processes.proposal_source` | `human_curated`, `agent_curated`, `discovery_override`, `discovery_substring` | (none) |
| `handoff_processes.role` | `implements` | (none) |
| `*.record_status` | `new`, `pending`, `approved`, `rejected` | (none) |

When adding a new column to this catalog with an enum, copy the value vocabulary from an existing analogous column rather than inventing a new one (e.g. `domain_module_data_objects.necessity` deliberately mirrors `domain_data_objects.necessity` — same two values, same default `required`). If a loader fails with `(23514) violates check constraint "<table>_<field>_check"`, re-query `/fields?table_name=eq.<table>&field_name=eq.<field>` to see the allowed values; don't guess again. Run `bun run scripts/analytics/enum_drift_probe.ts` to verify this whole table against live; it exits non-zero if any row drifted (and `--list` shows live enums not yet in the table).

### 14. Every domain has at least one full `domain_modules` row. Domains with ≥3 capabilities need ≥2 full modules.

A `domains` row is a market entry, useful for SEO and analysis but **not deployable** on its own. The deployable unit is the **module** (`domain_modules`):

- **Every `domains` row MUST have ≥1 `domain_modules` row with `module_kind='full'`.** No exceptions. If a market warrants a `domains` row at all, it has at least one full module: for narrowly-scoped domains that's a single module covering the whole market. A genuine derive/overlay domain (one that persists no records of its own; see the overlay test in § "Master-bearing vs derive/overlay domains") still ships a real module whose `domain_module_data_objects` carries the `consumer` / `embedded_master` / `derived` rows for what it reads and republishes. A `domain_modules` row with an entirely empty `domain_module_data_objects` set is a smell, not a valid shape: it means the domain is either unbuilt (run Phase B) or not actually a distinct market. "Preserves the deploy-target contract" is not a license to ship an empty module: an empty module deploys nothing (no tables, no permissions, no agent surface).

- **Domains with ≥3 `capabilities` (per `capability_domains`) MUST have ≥2 `module_kind='full'` `domain_modules` rows.** A 3-capability market has enough surface to be a meaningful split.

- **Domains with <3 capabilities have exactly 1 full `domain_modules` row.** The single module IS the whole market.

- **Starter kits (`module_kind='starter'`) are a separate, optional class.** Not subject to the ≥1 floor per domain, not counted toward the ≥2 floor for ≥3-capability domains. Starters never master data_objects (they embed / consume only) and have no host-domain requirement (`domain_id` may be NULL). See Rule #19 for the starter contract.

**This is a Phase-A obligation, not Phase E.** When loading a new market, `domain_modules` ship in the same load as `domains` + `capabilities` + `solutions`. Phase E (roles) extends modules but it's a separate concern, see the per-domain checklist Phase M (modules) below.

**Cross-cutting modules.** A module can host on multiple domains (e.g. `KNOWLEDGE-MGMT` lives in ITSM, CSM, HRSD, LSD). The primary host is `domain_modules.domain_id` (nullable for genuinely-no-home cases like `APPROVAL-WORKFLOW`); additional hosts go in `domain_module_host_domains`. Both shapes are valid; see [references/modules.md](references/modules.md) for the full mechanics.

**Permission materialization scope.** Workflow-gate permissions (Rule #12 lifecycle states with `requires_permission=true`) are prefixed with the **realizing module's** `domain_module_code`, not the domain's `domain_code`. Same lifecycle state realized in two modules = two permissions, one per module. `data_object_lifecycle_states.domain_module_id` (nullable) says which module realizes the state; NULL means "always reachable when the master is installed". See [references/modules.md](references/modules.md) for the per-module permission derivation rules.

**Audit blocker.** A `domains` row with zero `domain_modules` rows fails the per-domain completeness checklist outright (check M1). This blocks every downstream concern — fix the M-band first, then audit B / C / E.

### 15. **Every `notes` column on every table is empty by default. NEVER populate any `notes` field without first surfacing the specific proposed text to the user and getting explicit per-row approval.**

This rule has been violated repeatedly. Earlier versions were scoped too narrowly (only DMDO + relationships) while other SKILL.md passages actively told the agent to populate notes elsewhere (handoffs, starter modules, aliases, data_objects, skill_tools, solutions). All of those passages are now subordinate to this rule. **When Rule #15 contradicts any other instruction in SKILL.md or any `references/*.md` file, Rule #15 wins.**

**Scope: columns whose name is exactly `notes`.** Not `_notes`-suffix columns like `condition_notes` — those are load-bearing schema content (the column's value IS the data), not commentary. The list below is every catalog column the rule covers today; new columns named `notes` join automatically.

- `handoffs.notes` (NEVER add "until X is modularized" annotations on backfills or on new inserts without user approval; the prior write-time rule that licensed this is RESCINDED)
- `domain_data_objects.notes`, `domain_module_data_objects.notes`
- `data_object_relationships.notes`
- `data_object_aliases.notes`
- `data_object_lifecycle_states.notes`
- `data_objects.notes` (including the prior "config-shape exemption" annotation — RESCINDED)
- `domain_modules.description` is NOT a notes field, but watch the boundary: descriptions describe the row's content; notes are commentary about the row. If in doubt, treat as a notes field.
- `solutions.notes`, `vendors.notes` (including the prior "acknowledge predecessor after acquisition" carve-out — RESCINDED unless user approves the specific string)
- `role_modules.notes` (no `notes` column on `domain_roles` or `process_raci`)
- `skill_tools.notes`, `tool_solutions.notes`
- `solution_domains.notes`
- any other `notes` column added to the catalog in the future

If a column is named `notes`, the default is empty string. Period.

**Why.** Mechanical notes pollute the catalog with restated schema facts (which a reader can already see from the structured columns), invented annotations (whose form drifts session-by-session), and freeform commentary that rots in place because no audit query reads it as actionable state. Real notes need to be discussed: they're load-bearing prose that a future reviewer will read out of context, so the user wants to approve the exact wording, not delegate it.

**Forbidden patterns** (every one of these has shipped at least once and is banned):

- "until X is modularized" / "until X consumes Y" / any provenance trailer about why a column is NULL
- "auto-flipped from many_to_one" / any system-mutation-history annotation
- "Reads from X when integrated; standalone keeps the embedded shell" / "X local-masters Y when Z absent" / any restatement of `role` + `necessity`
- "<scope> | <cluster> | <DOMAIN> | ..." prefixes from cluster-drafts work
- Single-sentence cardinality narration ("A part has many revisions") / actor labels ("Cashier-user") that restate the structured columns
- Channel-justification prose on skill_tools rows
- Pattern-flag context ("Submit-lock engages on activation: once active, ...")
- Vendor terminology context on aliases ("ConnectWise PSA terminology")

**The discussion shape** (the only way notes get populated):

1. Agent identifies a specific row that warrants a note (a non-obvious business rule, a load-bearing constraint the schema can't express, a true editorial line).
2. Agent surfaces in chat: *"For row X, I'd propose `notes = '...'`. Reason: ..."*
3. User approves the exact text (or rewrites it).
4. Agent loads only the approved string. No batch-populating with templated wording.

**Audit obligation.** When this rule is violated (and it WILL be violated again unless something changes), the first action is to revert the polluting writes and append an entry to the Incidents section of [references/skill-changelog.md](references/skill-changelog.md). Surface what was written, on which rows, and which contradicting passage of SKILL.md (if any) was the rationalization. Then update SKILL.md to remove that passage's license.

**Where the prior carve-outs went** (each used to license writes; all rescinded):

- Lifecycle exemption for config-shape masters used to require `data_objects.notes`; now: surface to user, do NOT auto-populate.
- handoffs.notes write-time policy ("target NULL until <DOMAIN> is modularized") is gone; surface the NULL counter-party as a gap-report follow-up, never as a notes annotation.
- multi-master `domain_data_objects.notes` slice-decomposition prose: never auto-write; if the user wants slice context, they'll author the wording.
- skill_tools workflow-context notes: never auto-write.
- Predecessor mention in `solutions.notes` after acquisition: only with explicit user approval of the wording.

**If you find yourself reaching for prose to fill any column whose name is exactly `notes`, stop.** That impulse is the bug. The audit query for whether your load polluted notes is: `SELECT table_name, count(*) FROM all_notes_columns WHERE notes != '' AND created_at > '<load_start>'`. If that returns anything you didn't get user approval on, revert.

### 16. Necessity is sector- / vendor- / deployment-shape-conditional.

`necessity` on `domain_module_data_objects` and `domain_data_objects` signals what the deployer must install. Three classes of `optional` rows exist; only one of them keeps `required` as the universal default for masters.

**A. Non-master rows on infrastructure masters → optional.**

`locations`, `org_units`, `cost_centers`, and any future reference-data masters (currencies, calendars, fiscal periods, GL accounts, tax codes, job grades, job families) follow this rule. The criterion: "if a smaller org could plausibly inline the data as a text field, country code, or single-value attribute, the consumer row is optional."

- A smaller org with one office, one cost center, or one flat org structure doesn't need the master deployed at all.
- A larger org deploying the master unlocks **features** (site-scoped change windows, RBAC by org unit, cost-center-scoped reporting). Features are not workflow-blockers.
- "X local-masters when Y not deployed" is implicit on every `embedded_master` row by definition; marking such a row `required` is false friction.

Applies to: `embedded_master`, `contributor`, `consumer`. The mastering module's own `master` row is governed by B or C below.

**B. Master rows that are sector / jurisdiction-conditional → optional.**

A `master` row is `optional` when the entity is bound to a specific legal framework, regulatory regime, or industry sector and a deployment outside that scope would not use it. Test: *"Could a tenant in a different jurisdiction or sector legitimately install the module without this entity?"* If yes → `master + optional`.

Recurring examples:

| Statute / regime | Scope | Example entities |
|---|---|---|
| FCRA | US consumer-report law (employment background checks) | `fcra_disclosures`, `adverse_action_notices`, `pre_adverse_action_notices`, `fcra_summary_of_rights_acknowledgements` |
| OFCCP | US federal contractors (Internet Applicant Rule) | `applicant_flow_records`, `voluntary_self_identifications`, `ofccp_audit_trails`, `application_dispositions` |
| HIPAA | US healthcare | `hipaa_training_records`, `phi_access_logs` |
| OSHA | US occupational safety | `osha_training_records`, `safety_incidents` |
| SOX | US public-company financial controls | `sox_training_evidence`, `sox_control_evidence` |
| FERPA | US education records | `ferpa_training_records` |
| FINRA | US securities-industry continuing education | `finra_ce_records` |
| GDPR / CCPA | EU / California data subject rights | `data_subject_requests`, `gdpr_consent_records`, `ccpa_opt_outs` |
| EEOC | US equal-opportunity self-id | `eeo_responses`, `voluntary_self_identifications` |

When in doubt, check whether the entity's name is statute-prefixed (`fcra_*`, `ofccp_*`, `hipaa_*`, etc.). Statute-prefixed entities are nearly always sector-conditional and ship `master + optional` even within their canonical module. The module itself is the activation gate; the tenant enables based on jurisdiction.

**C. Master rows that ≥1 flagship vendor doesn't model → optional.**

A `master` row is `optional` when the Phase 0 vendor surface shows ≥1 flagship vendor (out of 4-5 surveyed) without the entity as a first-class master AND the workflow degrades gracefully without it. Test: *"If a flagship vendor's schema doesn't have this entity AND its workflow still works, the entity is an organizational choice on the tenant side, not a module requirement."* If yes → `master + optional`. The deployer asks the tenant at install time whether to include it.

Examples: `candidate_consents` (some ATS vendors don't formalize consent into a typed record), `referral_campaigns` (organic referrals work without formal campaign structures), `recruitment_events` (event-based sourcing isn't universal), `disclosure_documents` (real estate disclosures vary by state but the universe of forms is jurisdiction-shaped).

The 80% threshold is a heuristic, not a hard cutoff. If 4 of 5 flagship vendors model the entity but the 5th explicitly relies on a different shape (e.g. consent as an attribute, not a record), the entity is still `optional` because the deployer must decide.

**D. Workflow-bearing universal masters → required.**

Entities the module cannot operate without, regardless of jurisdiction or vendor: `job_offers`, `incidents`, `change_requests`, `assets`, `employees`, `candidates`, `job_requisitions`. The workflow halts without them. These ship `master + required`.

**Authoring summary at insert time.**

For every new master row, before writing `necessity`:

1. **Is the entity name statute-prefixed?** (fcra_, ofccp_, hipaa_, osha_, sox_, ferpa_, finra_, gdpr_, ccpa_, eeo_, etc.) → `optional` (B).
2. **Is the entity bound to a specific industry sector or geography?** (US healthcare, EU privacy, US federal contractor, US securities) → `optional` (B).
3. **Did Phase 0 show ≥1 flagship vendor without this entity?** → `optional` (C).
4. **None of the above and the workflow halts without it?** → `required` (D).

For non-master rows on infrastructure masters, rule A still applies.

**Install-necessity / edge-requiredness bridge (plan-4): `necessity` and `is_required` are orthogonal.**

`necessity` (this rule, the install axis) governs whether an entity INSTALLS in a deploying unit. `data_object_relationships.is_required` (the edge axis) governs whether a FK to it is mandatory. They are independent, and a required edge NEVER forces an install:

- A `required` edge into an install-optional target (the target is `necessity=optional`, or simply not in the deploying unit's scope) is **required-only-when-present**: the FK is mandatory if and when the target is installed, and carries no constraint otherwise. It does not drag the target in.
- The genuine "this entity must always be present wherever the source is installed" case is expressed by the TARGET's own `necessity=required` in that scope, NOT by the edge. A required edge is about FK shape; a required install is about `necessity`.
- The emitter renders this in §5: a required cross-scope edge shows `none (required-if-present)` (reference / association) or a `⚠ audit` finding (composition); the M9 relationship-layer band (M9 in the per-domain checklist) flags required edges whose other endpoint is out of scope so the author picks embed-vs-optional-vs-target-required. Full delete-mode table in [references/module-shape.md](references/module-shape.md); deploy semantics in [references/modules.md](references/modules.md) §4 / §5.

### 17. Every `domain_modules` row has exactly one `skill_type='system'` skill, and that skill has ≥1 `skill_tools` row.

A `domain_modules` row defines a deployable unit; a `system` skill defines what an agent can do against that unit. The two are 1:1 (mirroring `domain_modules` exactly, per the transitional-note in the at-a-glance table). Without the skill, the module exists in the catalog but has no agent surface, and the Semantius score, the metric the entire tools/skills layer exists to compute, is uncomputable for that module.

- **One `system` skill per `domain_modules` row.** `skills.skill_type='system'` AND `skills.domain_module_id=<module_id>`. Authoring more than one system skill per module is a rule violation: if the module's surface needs two distinct skills, the module itself needs to be split.
- **That skill has ≥1 `skill_tools` row.** Typical shape is 5–20 tools per module (required + optional). Required tools are the irreducible set the agent needs to perform the module's primary workflow; optional tools cover degraded modes (lower-tier ML, alternate channels).
- **Tool `operation_kind` invariants** (enforced platform-side via JsonLogic `input_type_rule` on `fields.tools.data_object_id`; loader pre-flight mirrors): `query` and `mutate` REQUIRE `data_object_id`; `fetch`, `side_effect`, and `compute` REQUIRE `data_object_id` to be NULL; `inbound` makes `data_object_id` OPTIONAL. `fetch` is the read-side counterpart of `side_effect`: agent calls an external vendor API and gets data back (hotel offers, currency rates, stock quotes, web search results) where Semantius doesn't own the source schema.

**This is a Phase-A obligation, not Phase E**, parallel to Rule #14. When loading a new market, system skills + tools + skill_tools ship in the same load as `domains` + `capabilities` + `domain_modules` + `solutions`. The Phase-S step in the workflow (§ "Workflow for any research task") is the canonical authoring procedure.

**Audit blockers.** A `domain_modules` row with zero or >1 system skills fails F2; a system skill with zero `skill_tools` fails F3; a tool with an invalid `operation_kind` ↔ `data_object_id` pairing fails F4; an uncomputable Semantius score is the F5 rollup. Each blocks the per-domain audit until cured. See F2–F5 in the per-domain completeness checklist.

**Why this rule exists:** before F2-F5 became positive-existence checks, the per-domain audit could tick green on a domain with zero system skills (the F-band only carried a legacy-cleanup check). The Semantius score was then uncomputable but the gap went silent. F2-F5 close that.

### 18. Third-party names and trademarks belong only on commerce-shaped entities.

Vendor names, product names, brand names, and trademarks (Salesforce, ServiceNow, Workday, KnowBe4, OneTrust, MetricStream, etc.) describe **who sells into a market**, not **what the market is**. They belong on the entities that exist to model commerce, and nowhere else.

**✅ Allowed — commerce-shaped entities (vendor/product names are these tables' whole purpose):**

- `vendors` — `vendor_name`, `description`, `notes`. Legal entities by definition.
- `solutions` — `solution_name`, `description`, `notes`. Products by definition.
- `data_object_aliases` — `alias_name`, `notes`. Explicitly designed for vendor-specific synonyms (`customers → Account in Salesforce`, `customers → Patient in Healthcare`).
- `tool_solutions` — `endpoint_url`, `notes`. Vendor MCP endpoints and per-vendor delivery details by construction.

**✅ Allowed — statutory / standards-body names (categorically distinct from commercial trademarks):**

- `regulations` — `regulation_name`, `description`. HIPAA, GDPR, SOX, PCI-DSS, OSHA, etc. are statutory frameworks issued by regulators or standards bodies, not commercial brands. They're fine to name in prose.

**❌ Forbidden everywhere else.** No vendor or product names in any text field on any entity not listed above. Specifically including:

- `domains` — `domain_name`, `description`, `business_logic`. *This is where the rule got violated and triggered the rule write.*
- `domain_modules` — `domain_module_name`, `description`.
- `data_objects` — `data_object_name`, `singular_label`, `plural_label`, `description`, `notes`.
- `handoffs` — `description`, `notes`.
- `capabilities` — `capability_name`, `description`.
- `trigger_events` — `event_name`, `description`.
- `processes` — `process_name`, `description`.
- `tools` — `tool_name`, `description`.
- `skills` — `skill_name`, `description`.
- All junctions — `domain_data_objects.notes`, `domain_module_data_objects.notes`, `data_object_relationships.notes`, `solution_domains.notes`, `role_modules.notes`, `skill_tools.notes`, etc.
- `domain_roles`, `role_modules`, `process_raci` (catalog-owned personas + RACI; the `_core` `roles` / `permissions` / `role_permissions` are platform RBAC, not catalog-written).
- `industries`, `jurisdictions`, `business_functions`.

The single legitimate exception is acknowledging a predecessor inside `solutions.notes` after a re-brand or acquisition (e.g. "formerly LeanIX, acquired by SAP SE 2023"). That's metadata about the same product, not a competitor mention; it stays in the commerce layer.

**Why this matters.** The catalog deliberately separates *what the market is* (the semantic substrate: domains, capabilities, data_objects, handoffs, processes) from *who serves it* (the commerce layer: vendors, solutions, the tool/solution junctions). Putting vendor names in domain descriptions ("Specialised vendor market: KnowBe4, NAVEX, EVERFI, MetricStream, OneTrust, plus all general LMSs") collapses the two: the substrate stops being vendor-neutral and starts reading like a marketing snippet. The vendor list belongs in `solution_domains` rows joining to `solutions`, where it's structured data the UI can render, filter, and update as the market shifts (acquisitions, exits, re-brands). Narrating it in a description column makes it unmaintainable and visually noisy in every downstream render (blueprints, fact sheets, the marketing site).

**Description columns describe the domain itself: capability shape, scope, distinctions from adjacent domains, statutory anchors.** Buyer-side characteristics belong in the structured `min_org_size` / `cost_band` / `certification_required` columns.

**No vendor-landscape prose, in any form.** This forbids both named lists ("Vendors: Salesforce, ServiceNow, Workday") and anonymized variants ("Vendor landscape spans enterprise CRM suites, mid-market sales-cloud bundles, and SMB-focused pipeline tools" / "Served by a dedicated X vendor market, with adjacent coverage from broader Y suites" / "Pure-play vendors compete with suite-aligned modules"). The fix is to **delete the entire sentence**, not rewrite it generically. Who serves the market is structured data on `solutions` × `solution_domains`; it is never narrated in a description.

**Anti-pattern (real):** "Specialised vendor market: KnowBe4, NAVEX, EVERFI, MetricStream, OneTrust, plus all general LMSs." The vendor list is exactly what `solution_domains → solutions` is for. Strip it from the description; the substrate stays vendor-neutral and the same information lives in the commerce layer where it can be updated structurally.

**Authoring discipline.** Before any insert or PATCH on a forbidden-zone field, scan the proposed text for vendor and product names. The pattern is easy to fall into when paraphrasing a Gartner / Forrester market summary back into the description column — those summaries lead with the leader quadrant by name. Re-write to characterise the market by its capability shape and statutory anchors instead. When auditing existing rows, scan `description` / `notes` / `business_logic` columns for proper-noun company names; flag anything that isn't a regulator or a generic market term.

### 19. Starter kits are a first-class deployable unit that masters zero data_objects.

Starter kits used to be an editorial junction (`domain_starter_modules`) recommending an install order over full modules. That shape did not work: installing a starter still meant installing N full modules with everything they carry (data_objects, lifecycle states, workflow-gate permissions, system skills), which is too heavy for a small org and offers no "lite" path. The new shape: starter kits are deployable units themselves, distinguished from full modules by a `module_kind` discriminator on `domain_modules`.

**Definition.** A `domain_modules` row with `module_kind='starter'`. Behaves like any other module for the deployer, the emitter, the loader idiom, and the skill / tool / permission layers, with the six invariants below.

**Use cases.**

- **Lite variants of a full module.** `<DOMAIN>-LITE` for a 10-person org wanting basic HR or basic CRM without the full module's breadth: it embeds a subset of entities. Any gated entity it does embed still carries its lifecycle and a re-prefixed gate (invariant #4); a lite variant stays light by embedding fewer entities, not by stripping gates off the ones it keeps.
- **Onboarding starter kits.** Bundle the embedded shells from 2–3 adjacent modules into a single deployable for first-time buyers.
- **Persona / use-case bundles.** Cross-domain personas like `REAL-ESTATE-AGENT` (CRM + CLM + light project tracking) that don't belong to any single market. `domain_modules.domain_id` is NULL for these; `domain_module_host_domains` lists every touched domain.

**Six invariants.** Every loader inserting a `module_kind='starter'` row MUST validate before any POST:

1. **Role restricted, two patterns only.** Either `embedded_master` on a `kind='domain_owned'` data_object (canonical master must exist somewhere in a full module, per invariant 2), or `consumer` on a `kind='platform_builtin'` data_object (today only `users`). Never `master`, never `derived`, never `contributor`, never `consumer + domain_owned`. Why: the starter must be deployable standalone. `consumer + domain_owned` points at a master that may not be installed at the deployment where the starter is the entry point; `contributor` has the same defect for writes. The only substrate a standalone starter can safely depend on beyond its own embedded shells is the platform itself. For any domain-owned data_object the starter needs, `embedded_master` ships a local shell and defers to the canonical master via the demotion path when the full module installs alongside. Enforced platform-side by the `starter_no_master` validation_rule on `domain_module_data_objects` for the `master`/`derived` slice (uses `set_record` to read the parent `module_kind`); the broader restriction (no `contributor`, no `consumer + domain_owned`) lives in the loader pre-flight `validateStarterDataObjectJunction()` (see [references/loader-idiom.md](references/loader-idiom.md)).
2. **Canonical master exists.** Every `embedded_master` row points at a data_object that has a `role='master'` row in some full module somewhere in the catalog, OR the data_object is `kind='platform_builtin'`. Rule #11 already covers this for full modules; it applies identically to starters.
3. **No lifecycle states authored.** No inserts into `data_object_lifecycle_states` from a starter load. Lifecycle is the canonical master's contract; the starter's blueprint cross-references the master's states via the emitter, the catalog rows live on the master only.
4. **Baseline permissions, PLUS the full re-prefixed governance of every embedded entity (plan-4 revises the old "exactly three rows").** A starter ships the three baseline rows `<starter_code>:read` / `:manage` / `:admin` (tiers `baseline-read` / `baseline-manage` / `baseline-admin`), and ALSO carries, re-prefixed to the starter, the complete derived governance of every entity it embeds whose canonical realizing module is outside the deploying unit: the **workflow gates** (e.g. `hiring-starter:approve_offer`), the **pattern-flag overrides** (`view_all_` / `manage_all_` / `submit_`, e.g. `hiring-starter:view_all_candidates`), and the matching **§8.2 business rules**. Governance follows the entity, not the role: when the canonical master is absent the starter IS the local master and must govern the entity fully, exactly as it would if it mastered it. All of it is DERIVED by the emitter (`deriveWorkflowGatesAndRules` + the shared `deriveGate`), not authored by the loader, and materialized by the deployer; the loader still inserts NO derived permission rows (the catalog stores no derived permissions, see [references/modules.md](references/modules.md) §4 / Plan 3). Rationale: a gated transition (or a personal-content row-scope) reachable standalone with no permission is ungoverned (anyone with `:manage` fires it / reads every row), so the installing unit must realize it. See Rule #12 "Gate prefix and re-prefix".
5. **`domain_module_capabilities` allowed.** A starter realizes a subset of capabilities, same shape as full modules. This is the marketing surface that makes a starter discoverable.
6. **Exactly one `system` skill** (Rule #17 applies identically to starters). The starter's `skills` row has `skill_type='system'`, `domain_module_id` set, and ≥1 `skill_tools` row. Floor: `query_<entity>` for each embedded master plus light mutates where the workflow supports them. The skill MAY carry workflow-gate tools for the standalone-reachable, re-prefixed gates its embedded entities expose (plan-4 revises the prior "no workflow-gate tools" floor: per invariant #4 those gates now exist on the starter).

**Naming convention.** Free-form. Authors pick `<DOMAIN>-LITE`, `<DOMAIN>-STARTER`, `REAL-ESTATE-AGENT`, `SMB-CRM`, etc. The `module_kind` discriminator carries the structural signal; the code is free to be marketing-shaped.

**Upgrade behavior.** When a tenant later installs the full module whose data_objects the starter embedded, the embedded shells deterministically demote via the existing rule for `embedded_master` rows with a canonical master elsewhere. No tenant-side data migration (same `data_object_id`, same table). The starter's baseline permissions stick around after upgrade; its re-prefixed workflow gates (invariant #4) are superseded by the full module's canonical-prefixed gates once it installs (provisional cleanup, revisit after first real starter ships). The tenant manages skill cleanup; catalog ships both the starter's system skill and the full module's system skill side-by-side.

**Audit blocker.** A starter row violating any of the six invariants fails the per-domain checklist on F2 / F3 (system skill) or a Rule-#11 / Rule-#12 cross-check depending on which invariant is violated. The platform-side validation_rule throws on the master-role violation independently of the audit.

### 20. Catalog UX fields are buyer-shaped; never overwrite a non-empty value without explicit user approval.

Two columns each on **both** `domains` and `domain_modules` serve the public catalog and the site generator, not the analyst surface:

- `catalog_tagline` (string): one buyer-facing sentence for catalog list cards. Workflow-shaped, not market-shaped.
- `catalog_description` (text): 1-3 buyer-facing paragraphs for the catalog detail page. Describes what the buyer can do; does not enumerate handoffs, parent domains, or position in the catalog taxonomy.

`domains` carries the market-grain copy (whole-domain landing pages). `domain_modules` carries the module-grain copy (per-module cards and detail pages). Buyers select modules in a deployment, not whole domains, so the module-grain copy is the surface a deploy chooser renders. Both grains follow the same rules.

A third surface, `domain_aliases` (separate table), feeds both the catalog's search index and the per-domain skill's runtime trigger phrases. Aliases are universal synonyms (`recruiting`, `hiring`, `talent acquisition`) the agent should match against in either surface.

**Voice rule.** Buyer voice (workflow + value): *"Track candidates from first contact through hire. Manage requisitions, interviews, and offers in one place, with seamless handoff to onboarding."* Analyst voice (what `domains.description` and `domain_modules.description` carry): *"Software market for recruiting, sourcing, evaluating, and hiring candidates. Anchors the candidate-to-employee transition handoff to HCM and Onboarding."* The two are not interchangeable; do not paste one into the other column.

**Backfill empty fields by writing them (no pre-write gate).** On any domain audit where A4 fails (empty `domains.catalog_tagline` / `domains.catalog_description`) or M8 fails (empty `domain_modules.catalog_tagline` / `domain_modules.catalog_description`), author the buyer-voice copy and **write it straight into the empty column**. The row's `record_status` carries the review signal: freshly written copy lands on a `new` (or otherwise unreviewed) record and the user reviews it **in the record / catalog UI**, exactly as Rule #1 handles fresh research. Do **not** pre-surface the draft to chat for approval, and do **not** park the draft in `history.md` (or any audit file) as a stand-in for writing the column. An empty field with its copy hidden in history is the exact bug this rule exists to prevent: the user reviews text stored in records (state `new`), never text buried in an audit log. Apply an empty-guard per field: write a column only when its current value is empty; a non-empty column is governed by the overwrite rule below. This applies to subagents too, never instruct a subagent to "draft and leave open" an empty catalog UX field; instruct it to write the field.

**Overwrite is forbidden without explicit per-row user approval.** Once a non-empty value exists in either column on either table, do NOT regenerate, "improve", normalize, or rewrite it, even when the existing value reads like a draft. Marketing routinely fine-tunes the original; an unapproved overwrite destroys their edits. The acceptable forms of human approval:

- *"Rewrite catalog_tagline for ATS to <new wording>"*: specific text + specific row (domain or module).
- *"Refresh all catalog_descriptions on ATS modules"*: explicit batch authorization. Surface the diff per row before each write.

Forbidden patterns:
- Auto-overwriting on every audit pass because the existing value "doesn't match the current template."
- Bulk-regenerating during an unrelated load.
- "Cleaning up" wording during a different fix-loop.
- Leaving an empty `catalog_tagline` / `catalog_description` empty while parking the drafted copy in `history.md` or a chat message. Empty fields are written (see the backfill rule above); only non-empty values are overwrite-protected.

**Why.** Marketing copy is the buyer-facing surface and ages on a different cycle than the analyst-facing catalog. The catalog tables can be re-derived from live state; marketing voice cannot. Treating these four columns (two each on `domains` and `domain_modules`) with the same overwrite-on-emit habit as analyst columns erases human work that's not visible in the agent's draft.

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
| `trigger_events` | Controlled vocabulary of state-change events on data_objects (`offer.accepted`, `employee.created`, `incident.resolved`). Referenced by `handoffs.trigger_event_id`. | no |
| `solutions` | Specific products/platforms (Salesforce, ServiceNow, SAP S/4HANA) | no |
| `vendors` | Legal vendor entities (Salesforce Inc, SAP SE) | no |
| `regulations` | Compliance frameworks (HIPAA, GDPR, SOX, PCI-DSS) | no |

### Module concept (1 entity)

| Table | Holds | Hierarchical? |
|---|---|---|
| `domain_modules` | Autonomous deployable units inside a domain (`ATS-CANDIDATE-CRM`, `ITSM-INCIDENT-MGMT`, `KNOWLEDGE-MGMT`). Natural key `domain_module_code`. `domain_id` is the primary host (nullable for genuinely-cross-cutting modules); see `domain_module_host_domains` for additional hosts. | no |

### Junctions with qualifiers (13 entities)

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
| `handoffs` | domain_modules → domain_modules (via data_object) | `trigger_event_id` (FK to `trigger_events`) + integration_pattern + friction_level. Covers both cross-domain handoffs (source ≠ target; the Signal 2 substrate for platform-vs-silos analysis, where Signal 1 is the multi-master count on `domain_data_objects` where `role ∈ {master, embedded_master}` AND `necessity = required`) and intra-domain handoffs (source = target, typically `integration_pattern: lifecycle_progression`). The cross-domain filter is applied at query time, not by a validation rule. |
| `handoff_processes` | handoffs ↔ processes | `role` (`implements`) + `proposal_source` (provenance) + `record_status`; links a handoff to the APQC PCF activity it realizes |
| `domain_module_capabilities` | domain_modules ↔ capabilities | which capabilities a module realizes; one capability may realize in multiple modules |
| `domain_module_data_objects` | domain_modules ↔ data_objects | role (same 5-value enum as `domain_data_objects`) + necessity + `notes`. Once a domain has modules, `domain_data_objects` is a **derived rollup** from this junction (group by data_object_id, strongest role wins). The single-master rule applies at this layer: exactly one row per `data_object_id` may have `role=master`; the blueprint emitter throws if it sees more. `notes` is empty by default — see Rule #15. |
| `domain_module_host_domains` | domain_modules ↔ domains | additional hosts beyond `domain_modules.domain_id`. Cross-cutting modules use this to declare every domain they install on. |

### Aliases (1 entity)

| Table | Purpose |
|---|---|
| `data_object_aliases` | Synonym, industry term, or solution-specific name for a data object (e.g. Customer → Patient in Healthcare, Customer → Account in Salesforce) |

### Agent tooling layer (4 entities)

> These entities live in `domain_map` because their FKs are too tightly coupled to the catalog to justify a separate module: `tools.data_object_id → data_objects`, `skills.domain_id → domains`, `tool_solutions.solution_id → solutions`. One module, one analyst skill.

| Table | Holds | Qualifier / discriminator |
|---|---|---|
| `tools` | JSON-RPC-shaped capability primitives an agent skill can call (`send_email`, `query_invoices`, `search_web`, `transcribe_audio`, `receive_webhook`). Includes two abstraction primitives, `notify_person` (single-recipient outbound) and `notify_team` (broadcast), that capture the substitutable-channel pattern; skills link these by default for generic notifications and link concrete channels only when the workflow requires a specific channel | `operation_kind` enum (`query` / `mutate` / `fetch` / `side_effect` / `compute` / `inbound`). The six values pair as: internal-read = `query`, external-read = `fetch`; internal-write = `mutate`, external-write = `side_effect`; pure-transform = `compute`; event-receive = `inbound`. `coverage_tier` enum (`platform` / `external` / `integration`) drives the Semantius score; read this column, not `operation_kind`. `data_object_id` FK is **required** when `operation_kind ∈ {query, mutate}`, **must be NULL** for `fetch` / `side_effect` / `compute`, **optional** for `inbound`. The pairing is enforced platform-side by a JsonLogic `input_type_rule` on `fields.tools.data_object_id` |
| `skills` | Agent skills (system / process / role). `system` skills mirror **one module 1:1** (`skill_type='system'`, `domain_module_id` set) — target state per Rule #14. `process` skills wrap a cross-domain handoff cluster; `role` wraps a user-role workflow. **Transitional note:** the catalog still carries domain-level system skills (`domain_id` set, `domain_module_id` null) from the pre-modular era — these are migration targets, not the pattern for new authoring. | `skill_type` enum + `domain_module_id` (required when `system`, per Rule #14) |
| `tool_solutions` | N:M between `tools` and `solutions` — which non-Semantius solutions deliver this tool, and how | `delivery_strength` + `delivery_method` (`mcp_server` preferred) + optional `endpoint_url`. Computed label `<tool> via <solution>`. **No Semantius row** — its coverage is read from `tools.coverage_tier` directly |
| `skill_tools` | N:M between `skills` and `tools` — which tools a skill needs to function | `requirement_level` (`required` / `optional`). `notes` exists on the row but is off-limits without user-approved wording per Rule #15. Computed label `<skill> needs <tool>` |

These four tables coexist with `domain_map.solutions`, which gained `solution_kind` enum (`external_connector` / `action` / `compute_service` / `standard_solution`) to classify which solutions are tool-delivery sources. The killer hypothesis the layer exists to test: **how many of the loaded domains have a system skill where every required tool is Semantius-covered (i.e. `coverage_tier='platform'` for every required `skill_tools` row)?**

#### Semantius score

The **Semantius score** of a skill (and the module realised by that skill) reads from `tools.coverage_tier`, not from `operation_kind`. Two scores are reported together:

```
strict_score(skill) =
   count(skill_tools WHERE tools.coverage_tier = 'platform')
 / count(skill_tools)

operational_score(skill) =
   count(skill_tools WHERE tools.coverage_tier IN ('platform', 'integration'))
 / count(skill_tools)
```

`strict_score` is the share served by the platform alone (what runs on Semantius with no external glue). `operational_score` adds curated OOTB integrations the platform maintains (e.g. an MCP server in the Semantius catalog for a vendor). The gap between the two is the value of the integration catalog.

`tools.coverage_tier` flips from `external` to `platform` only when the capability is shipped on BOTH the `crud` MCP server AND the `semantius` CLI; shipping one without the other does not count. When the platform adds native email (or any other capability), one UPDATE on the relevant `tools` rows re-scores the entire catalog — no formula rewrite needed.

Conventions:

- **Denominator is all `skill_tools` rows**, both `required` and `optional`. The score answers "what share of this skill's needs can the platform serve" — optional tools count because they're still real needs (lower-tier AI matching, optional notifications).
- For a per-module score, join via `skills.domain_module_id` (one system skill per module under Rule #14). Modules without a system skill row have no score.
- For a per-domain score, aggregate `skill_tools` across all system skills for modules where `domain_modules.domain_id = X` (i.e. union the numerators and denominators, then divide). Do not average per-module scores — that biases toward small modules.
- A score below 100% always points at specific tool rows: `SELECT tool_id, tool_name, coverage_tier FROM skill_tools JOIN tools WHERE coverage_tier != 'platform'`. Surface those tools by name when reporting the score — the gap is the actionable information, not the percentage.

### Role layer (1 new entity + 3 extended built-ins)

Personas and responsibility are **catalog-owned** (module 1001). `domain_roles` holds operational personas (job-shaped workflows spanning modules); `process_raci` holds RACI responsibility with a polymorphic actor (a persona OR an agent skill). A persona's permission **bundle is DERIVED** (emitter §9) from reach + RACI + the entity-type tier policy, NOT stored. Plan 3 (2026-06-02) deleted the `_core` `roles` / `role_permissions` / `permission_hierarchy` persona layer (it had rotted) and re-homed personas here. Long-form rules in [references/roles.md](references/roles.md); schemas in [module-shape.md § Role layer](references/module-shape.md#role-layer).

| Table | Holds | Built-in vs. catalog | Qualifier |
|---|---|---|---|
| `domain_roles` | Operational persona: job-shaped workflow spanning ≥2 modules. `role_code`, `role_name`, `description`, `business_function_id` (nullable, NULL = cross-functional), `record_status`. No `slug`. | Catalog-owned (module 1001) | Replaces deleted `_core` `roles` persona rows (origin `model` / `model_master`). |
| `role_modules` | REACH junction: which modules a persona touches, at what `interaction_level` (`primary` / `secondary`). `role_id` re-pointed to `domain_roles` (Plan 3). | Catalog-owned | Read-only-ness is captured by the derived bundle holding only `:read`, not a separate axis. |
| `process_raci` | RESPONSIBILITY junction: process ↔ polymorphic actor (`actor_role_id` persona XOR `actor_skill_id` skill), `raci` letter, `consultation_blocking`. | Catalog-owned (NEW, Plan 3) | Hard `exactly_one_actor` validation_rules trigger. R can be an agent while A is human. |
| `data_object_lifecycle_states.process_id` | The process-to-permission edge: which gate realizes which process. Authored per-domain. | Catalog (column, Plan 3) | Distinct from `process_raci.process_id`; lets an R/A assignment resolve to concrete gates. |

**Hard invariants:**

- **2-module floor.** Every `domain_roles` persona MUST have ≥2 `role_modules` entries. A single-module persona is just a permission tier on that module, not a persona.
- **Flat personas.** No `parent_role_id`, no composition, no DAGs. Manager-of-IC is expressed by upgrading the DERIVED tier (`:manage` to `:admin`) via reach/responsibility, not by chaining personas.
- **Function-scoped naming.** `role_code` = `<FUNCTION-CODE>-<ROLE-NAME>` (`RECRUITING-RECRUITER`); cross-functional drops the prefix (`HIRING-MANAGER`). Domain prefixes (`ATS-RECRUITER`) are an anti-pattern. No `slug` / `valid_role_slug` constraint (that was a `_core` artifact, now gone).
- **Exactly-one-actor.** Every `process_raci` row sets exactly one of `actor_role_id` / `actor_skill_id`, enforced by a hard validation_rules trigger (`check_violation` raised on neither/both).
- **Bundle is derived, never stored (HARD RULE).** No catalog loader writes the `_core` `roles` / `role_permissions` / `permission_hierarchy` / `permissions` tables. You author reach (`role_modules`) + responsibility (`process_raci`); the emitter derives the bundle, hierarchy, and permission names into the blueprint (§9) and the deployer provisions from it. The 6 surviving `_core` permissions are platform RBAC for the catalog app, not catalog content.

**Reach reconciliation** (replaces the old two-path check): there is no stored bundle to disagree with reach. The review band reconciles `role_modules` reach against the DERIVED permissions: every reached module gets a derived tier, and every granted gate traces to a reach row or a `process_raci` R/A row whose process has a `process_id`-wired lifecycle gate.

**Cross-functional vs. cross-domain** are different concepts:
- **Cross-functional** = `domain_roles.business_function_id IS NULL` (explicit, e.g. Hiring Manager).
- **Cross-domain** = `role_modules` spanning ≥2 `domain_modules.domain_id` values. Not stored; aggregate at query time.

---

## Workflow for any research task

For any task that fits this skill — "research vendors for X", "is Y a domain?", "load this list of competitors", "find capabilities for Z" — work in this order. Don't skip steps; each one prevents a class of mistake.

> **Domain research without the module + data-object + function phases is incomplete.** Phase 0 (vendor surface research — flagship vendors + entity surface matrix + compliance entities + modularization hypothesis), Phase A (market shape — domains/capabilities/modules/vendors/solutions), Phase B (data-object footprint — data_objects + Signal 1 + Signal 2), Phase C (organisational-function coverage — `business_function_domains` + `business_function_capabilities`), and Phase E (personas + RACI: `domain_roles` reach + `process_raci` responsibility, the permission bundle DERIVED not authored, universal under Rule #14) are all per-market defaults. Skipping Phase 0 ships modules that have the headline master and miss the workflow substrate (engagement, compliance, transitions, approvals). Skipping B kills the platform-vs-silos analysis (Signals 1 & 2). Skipping C kills the buyer-persona / RACI axis (Signal 3 — *who in the org owns, contributes to, or consumes this market?*). Skipping E leaves modules without deployable personas or a RACI / responsibility layer.
>
> [Phase D — process-skill discovery](#phase-d--process-skill-discovery-substrate-level) is a **substrate-level analytic**, not a per-market step. It runs across the catalog once Phase B has shipped for enough clusters, and is re-runnable on demand. See the dedicated section below.

1. **Read the existing catalog first — audit by link, not by name.** Always query the live module before researching new entries. Duplicates and inconsistent naming hurt the catalog more than gaps do. Pull the relevant subset (domains in this area, vendors already present, solutions covering related markets, capabilities already on the relevant domains) and skim before you research.

   **The audit query that works:** for a domain `X`, query `/solution_domains?domain_id=eq.<X>&select=coverage_level,solutions(solution_name)` and `/capability_domains?domain_id=eq.<X>&select=capabilities(capability_code)`. This returns every solution and capability already linked to that domain, regardless of what they're named.

   **🛑 Verify against live state, NEVER infer from deploy scripts.** The catalog evolves; `.tmp_deploy/*.ts` loader scripts capture a snapshot at write-time and immediately drift. Cluster-inventory work that reads from a deploy script (instead of querying `/domains` + `/domain_data_objects` + `/handoffs` live) will systematically over-report missing entities — a sub-domain may have been loaded after the script was written. The rule: **`postgrestRequest` against live tables is the only authoritative inventory source.** Deploy scripts are useful for understanding *intent at write-time* but never for current state.

   **The audit query that fails silently:** searching `/solutions?or=(solution_name.ilike.*foo*,solution_name.ilike.*bar*,...)` for vendor names you happen to think of. This only catches names you already had in mind — it will miss every solution whose name doesn't match your pattern list. Always audit by `domain_id`, then cross-reference against Gartner / Forrester leader lists for the market to find any genuine gaps.

2. **Classify before naming.** When the user introduces a new concept, apply the point-solution-market test (rule #2) before deciding which table it belongs in. State your classification reasoning briefly so the user can correct it before you start writing.

3. **Draft, don't load.** For any non-trivial addition — more than ~3 rows — draft the proposed rows as a short table or list and surface them to the user before inserting. AI research goes wrong silently; a one-message preview almost always catches at least one mistake (wrong vendor parent, wrong domain attribution, duplicate-with-different-spelling).

4. **Use natural keys, never numeric IDs.** Inside the script: build `Map<naturalKey, id>` after each insert by re-reading the table. Don't try to predict IDs.

5. **Load via the script idiom — in multiple phases, each surfaced separately.** Even for ~20 rows, prefer extending [scripts/loaders/load_research.ts](scripts/loaders/load_research.ts) over one-off CLI calls. The script is idempotent (safe to re-run), chunked (no Windows command-line issues), and produces a row-count summary you can paste back to the user. Dated drafts in `.tmp_deploy/` are gitignored, so iteration is free; reusable patterns graduate to `scripts/loaders/`.

   Surface each phase as a **separate draft** before loading — reviewers check Phase 0 (vendor surface enumeration), Phase A (vendors/capabilities/modules), Phase B (data-object footprint), Phase C (functional ownership), and Phase S (system skills + tools) with different mental models. Bundling them into one preview means one of them gets a shallower review.

   **Phase 0 — Vendor surface research** (load zero; no DB writes — produces a research artifact). For any new domain load or module-set extension, enumerate the domain's flagship vendors and their entity surfaces **before** Phase A. Phase 0 produces a markdown report at `.tmp_deploy/<DOMAIN>-phase0-<date>.md` containing the flagship vendors (3–5 leaders, including ≥1 compliance specialist for regulated markets), the union surface matrix (entities × vendors, classified Core / Common / Specialist / Compliance), required compliance entities for regulated markets (FCRA / HIPAA / GDPR / SOX / FDA Part 11 / PCI / KYC-AML), and a modularization hypothesis (which entity belongs in which module). Phase A and B then work against the matrix as a **subtraction list**: every Core / Common / Compliance entity gets loaded or carries a one-line skip justification. This closes the headline-noun-only failure mode where modules ship with the headline master and miss the workflow substrate (engagement, compliance, transitions, approvals). Skippable only for hot-fix patches, single-entity additions, single-relationship additions, or "is X a domain?" classification. Full procedure + subagent prompt template: [references/vendor-research-protocol.md](references/vendor-research-protocol.md).

   **Phase A — Market shape** (load first):
   - `domains` (the market itself)
   - `capabilities` for that market (5–8 noun-phrase capabilities that define what the market does — e.g. for PROD-MGMT: roadmap visualization, feature prioritization, customer feedback aggregation, release planning, product strategy, opportunity management)
   - `capability_domains` linking each capability to its semantic-home domain
   - **`domain_modules`** — at least 1 row per Rule #14. For domains with ≥3 capabilities: ≥2 full modules (`module_kind='full'`). For domains with <3 capabilities: exactly 1 full module. Cross-cutting modules use the optional `domain_module_host_domains` to declare additional hosts. Starter kits (`module_kind='starter'`, per Rule #19) are optional and not subject to the floor.
   - **`domain_module_capabilities`** — link each capability to the module(s) that realize it. A capability with no realizing module is a Phase-A failure (M4 in the checklist).
   - `vendors` (legal entities, reusing existing rows by `vendor_name`)
   - `solutions` (one row per flagship product per market)
   - `solution_domains` with `coverage_level` (primary / secondary / partial). A reference Phase-A loader is [scripts/loaders/load_prod_mgmt.ts](scripts/loaders/load_prod_mgmt.ts); the SMM load also follows this exact shape ([scripts/loaders/load_smm.ts](scripts/loaders/load_smm.ts)).

   **Phase B — Data-object footprint** (load second, against the same domain). The Phase-B contract ships seven deliverables:

   1. **`data_objects`** that the domain masters (3–8 noun-plural snake_case names; apply the "what would a flagship vendor build their schema around?" test). Each row populates `singular_label`, `plural_label`, and — per Rule #12 — the pattern flags `has_personal_content` / `has_submit_lock` / `has_single_approver` where the master entity matches the pattern. Apply Rule #9 (naming arbitration) before insert.
   2. **`domain_module_data_objects`** rows on the modules from Phase A: `master` for the new objects, plus `embedded_master`, `contributor`, and `consumer` rows where a module enriches or reads existing cluster-owned objects (almost always `contacts` / `customers` / `campaigns` / `audience_segments` exist already — link to them rather than re-mastering). Validate Rule #11 before inserting any `embedded_master` row. **Apply Rule #16 at insert time to decide `necessity`** — every new `master` row passes through the four-question check (statute-prefixed name? sector-bound? Phase 0 vendor surface shows ≥1 missing? workflow halts without it?); `necessity='optional'` is the answer whenever the first three are yes. **The legacy `domain_data_objects` rollup is derived from this junction** (group by data_object_id, strongest role wins); do not hand-write `domain_data_objects` for modularized domains.
   3. **`handoffs`** from this domain outbound (and inbound where the partner domain is loaded) — apply the high-friction shape recognition in the "Data-object research" section below.
   4. **`data_object_relationships`** — intra-domain edges + `users`-edge entries (Rule #10) + cross-domain edges for every `handoffs` row with a clean payload→target mapping (e.g. `candidates →becomes→ employees`). Each row carries `relationship_verb`, `inverse_verb`, `relationship_type` (cardinality), `relationship_kind`, `is_required`, and `owner_side`. Drafts MUST surface the relationship graph as a mermaid block in the Phase-B preview before loading.
   5. **`data_object_aliases`** — ≥1 alias per non-self-explanatory master (industry synonyms, vendor-specific labels). The fact sheet generator embeds these directly.
   6. **`data_object_lifecycle_states`** — for every `master + required` data_object with a real workflow (Rule #12). Each row carries `state_name`, `state_order`, `is_initial` / `is_terminal`, `requires_permission` (true = derive a `<module>:<verb>_<entity>` workflow gate prefixed with the realizing module's `domain_module_code`), `permission_verb_override` (when auto-derivation is wrong — e.g. `hired → hire_candidate`), and `domain_module_id` (nullable; NULL = state always reachable when the master is installed). Config / record / catalog / junction / computed masters with no workflow are exempt structurally by carrying the matching `entity_type` value (Rule #12); there is no notes-based exemption surface (Rule #15).
   7. **`handoff_processes`** — **active deliverable, not opt-in.** For each cross-domain handoff the analyst is authoring, do the PCF lookup and draft a `handoff_processes` row pointing at the matching `processes.id`. The same mental model that lets the analyst pick the right `trigger_event`, payload, source/target modules, and friction level is what's needed to pick the right PCF activity — same context, one extra lookup. All rows ship as `record_status='new'`, `proposal_source='agent_curated'` per Rule #1 (the human still reviews; provenance flags confidence, doesn't bypass approval). **`proposal_source='human_curated'` is reserved for cases where the user explicitly typed *"add tag X for handoff Y"*** — agent-authored work always uses `agent_curated`. PCF lookup pattern: `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry`. **Untagged-deferred is allowed** only for handoffs with no clean PCF match (`data_asset.*`, `dlp_incident.*`, industry-specific workflows) — these become custom-process candidates in Discover Pass 3. The same rule applies during Validate b1's audit pass (see [references/domain-audit-procedure.md](references/domain-audit-procedure.md) § APQC TAGGING). The motivation: substring inference recovers ~60% of the analyst's intent; capturing at author time is lossless and free (you're already reading the handoff).

   Field-level constraints on embedded shells (which columns the local copy must include when a module embedded_masters another domain's data_object) are NOT a domain-map concern. The deployer validates embedded shells against the canonical entity's `fields` metadata at deploy time. The catalog does not duplicate that field-level contract.

   Reference Phase-B loader: [scripts/loaders/load_smm_data_objects.ts](scripts/loaders/load_smm_data_objects.ts). Full procedure: see [Data-object research and cross-domain-handoff discovery](#data-object-research-and-cross-domain-handoff-discovery) below.

   Phase B is **not optional** for genuine domain research. The only legitimate reasons to skip it: (a) the task is narrowly scoped to "find competitors for X" or "is Y a domain?" without an actual load; (b) the user explicitly defers it. In every other case — including any "research the X domain" or "load the X market" ask — all three phases are part of the work.

   **Phase C — Organisational-function coverage** (load third, against the same domain):
   - `business_function_domains` rows linking the domain to the function(s) that **own / contribute-to / consume** it (`responsibility_type` enum). For most domains 2–4 rows: one `owner`, one or two `contributor`s, optionally one `consumer`.
   - `business_function_capabilities` rows where a capability has a different functional owner than the domain (e.g. capability `COMPLIANCE-TRAIN` under domain `LMS` is owned by `Compliance`, not `L&D`). Only add when the capability-level RACI **diverges** from the domain-level RACI — otherwise the domain row is sufficient.
   - Reference Phase-C loader: TBD (the function spine and per-domain links were loaded together; see [scripts/loaders/load_business_functions.ts](scripts/loaders/load_business_functions.ts) once it exists).

   Phase C answers *"who in the org buys / runs / consumes this market?"* and powers buyer-persona filtering, RACI overlays, and the org-side analogue of the data-object signals. If the function spine is empty (only true at the very start of the catalog), populate it once before adding `business_function_domains` rows — see "Function spine" below for the canonical 20-function shape.

   **Phase S — System skills + tools** (load fourth, against the same domain). Under Rule #17 every `domain_modules` row needs exactly one `skill_type='system'` skill, and that skill needs ≥1 `skill_tools` rows. Phase S delivers:

   1. **`skills`** — one row per module with `skill_type='system'`, `domain_module_id` set, and a short `skill_name` like `<module_code>_agent` (e.g. `crm_acct_mgt_agent`). The skill encodes what an agent can do against that module's data and lifecycle.
   2. **`tools`** — JSON-RPC-shaped capability primitives keyed verb-first against the module's masters: `query_<entity>`, `create_<entity>`, `update_<entity>` for CRUD; `send_<message>`, `parse_<artifact>`, `match_<thing>_to_<thing>` for side-effect / compute work; `receive_<channel>` / `ingest_<source>` for inbound channels. Set `operation_kind` per the invariant in Rule #17 (`query`/`mutate` ⇒ `data_object_id` required; `side_effect`/`compute` ⇒ `data_object_id` null; `inbound` ⇒ `data_object_id` optional). Reuse existing tool rows where the same primitive already exists (the `tools` table is catalog-wide, not per-module). **Authoring default for notifications**: link the abstraction tools `notify_person` / `notify_team` rather than channel-specific primitives (`send_email`, `send_sms`, `post_chat_message`) — see § "Channel vs capability authoring rule" below.
   3. **`skill_tools`** — one row per (skill, tool) pair the skill calls. Carry `requirement_level` (`required` for irreducible workflow tools, `optional` for degraded modes). **Do NOT auto-populate `notes`** per Rule #15. The set of `requirement_level='required'` rows is the irreducible surface; `optional` rows raise the ceiling without raising the floor.
   4. **`tool_solutions`** (where applicable) — for any tool whose `coverage_tier != 'platform'`, link the non-Semantius solutions that deliver it. Platform-covered tools (today: every `query`/`mutate` row plus `receive_webhook`; more once the platform ships natively) don't need `tool_solutions` rows for the platform itself; vendor-alternative rows on those tools remain valid.

   Phase S is **not optional** per Rule #17. The killer hypothesis of the entire tools/skills layer (*"how many of the loaded domains have a system skill where every required tool is Semantius-covered?"*) is uncomputable without it. Reference Phase-S loader pattern: the ATS / SMP / TALENT-MGMT / EMP-EXP loads set the shape; mirror them when authoring for other domains.

6. **Verify and share.** After each phase, query counts on the affected tables, compare against expected, and link the user to the UI tables that changed. **For any new market load OR any time the user says "review domain X" / "audit domain X" / "what's missing for X", run the per-domain completeness checklist below** — it is the single source of truth for what "done" means.

---

## Channel vs capability authoring rule

Applies to every Phase-S skill_tools authoring pass.

The catalog distinguishes two kinds of `tools` rows the agent can call:

- **Channel primitives** — concrete JSON-RPC functions: `send_email`, `send_sms`, `post_chat_message`, `make_phone_call`, `receive_webhook`, `receive_email`, etc. Each maps to a specific vendor capability via `tool_solutions`.
- **Capability abstractions** — intent-shaped rows that route to whichever channel the deployment wires up: `notify_person` (single recipient), `notify_team` (broadcast), `receive_external_event` (any inbound channel, planned).

**Authoring rules:**

1. **Default to the abstraction.** For generic notifications, link `notify_person` or `notify_team` on the skill. The deployment chooses the channel (email, SMS, chat, WhatsApp, push) without rewriting the skill.
2. **Link the channel directly only when the workflow requires that specific channel.** CCAAS-VOICE-AGENT needs `make_phone_call` (voice IS the workflow); ESIGN needs `receive_webhook` (envelope-completion callback is the contract); EDI partners need `receive_edi_message` / `transmit_edi_message` by trading-partner contract.
3. **Multi-channel rows mean broadcast (AND), not at-least-one (OR).** A skill that links both `send_email` and `post_chat_message` is asserting that BOTH channels fire on every event (the broadcast pattern — ITSM family). If the workflow tolerates either channel alone, use `notify_person` instead (one row, deployment chooses).
4. **`requirement_level` stays on workflow-necessity semantics.** `required` = the workflow gates without this tool. `optional` = the workflow degrades gracefully but proceeds.

**Why the abstraction layer exists.** Empirically, `notify_person` / `notify_team` are the only substitutable-channel patterns in the catalog: skills use multi-channel notifications, but none need multi-text-generation or multi-extraction tools. Adding a heavyweight capability table for one pattern was over-engineering; two abstraction tool rows with the same shape as everything else solves the problem. Channels stay in `tools` for vendor delivery via `tool_solutions` and for skills that genuinely need a specific channel.

**Score behavior.** When `tools.coverage_tier='platform'` on `notify_person` (i.e., the platform ships an outbound dispatcher), every skill linking `notify_person` is platform-covered on the notification axis with one UPDATE — no per-skill retrofit needed. That's the entire reason this layer exists; if we'd kept channel-specific links everywhere, every platform-ships-email event would have required N skill_tools rewrites.

---

## Per-domain completeness checklist

The catalog has 13 categories of per-domain content that determine whether a market is loaded "completely". A new market load is "done" only when every applicable check passes; a domain review (audit) is the same checklist run against an already-loaded domain. The same gates apply both directions.

**Fact-sheet emission is not part of this checklist.** The [fact sheet generator](../../../scripts/emit_fact_sheet.ts) is an explicit, user-triggered step — see § "Fact sheets (explicit step, not part of any sequence)" below. The audit reads live state from PostgREST, not from on-disk fact sheets, so the rendered files can sit stale through any audit pass and that's fine.

**This section exists because gaps repeatedly shipped silently:** Salesforce / Workday loads missed `domains` metadata (Rule #8), the ITSM-area review missed `business_function_domains` (Backfill gap #2), the Step-5 cluster pass loaded clusters A–F but missed ATS's own intra-domain relationships (the very gap that surfaced this checklist). The pattern is the same: every gap looked "obvious in retrospect, easy to skip in flight". The checklist closes that.

> **How to run.** For each check below: run the query, compare against the pass criterion, take the fix action if it fails. The numbered IDs (`A1`, `B6`, etc.) are stable — refer to them in PR descriptions and gap reports. **An audit pass produces a gap report listing the failed IDs;** the user reviews the report before any fix loads, per Rule #1.

Substitute `<id>` with the target `domains.id`. Derive `<masters>` from the **module junction**: the distinct `data_object_id`s with `role='master'` in `domain_module_data_objects` across the domain's modules (primary host + `domain_module_host_domains`). Fall back to `domain_data_objects.role='master'` **only** when the domain has no modules. Never read `<masters>` from `domain_data_objects` for a modularized domain: it is a stale hand-maintained rollup that under-reports masters once modules exist (a domain can show 15 masters there and master 60 at module grain). `domain_data_objects` is being retired as modularization completes; see [references/skill-changelog.md](references/skill-changelog.md).

### S. Structural coverage sweep (run first)

The S-band is a single coverage sweep that runs **before** any band-level check. It exists because each downstream band asks about one or two tables in isolation; an empty FK that the band-shape happens not to test slips through. The sweep produces a coverage table the gap report leads with, then routes each failure into the owning band (A / M / B / C / E / F).

**S1. Every direct FK to `domains` has the expected row count.**

- Schema query: `/fields?reference_table=eq.domains&select=table_name,field_name`. The query is the source of truth — run it to get the current list of `(table, field)` pairs across tables that reference `domains`.
- For each pair, count rows for the audited domain via PostgREST. Surface as:

  | Table | FK column | ATS rows | Expected non-zero? |
  | --- | --- | --- | --- |

- Expected-non-zero call (the schema doesn't carry this; it follows from catalog rules):
  - Always non-zero: `business_function_domains` (C1), `capability_domains` (A2), `domain_data_objects` (B1; for a derive/overlay domain the rows are `consumer`/`derived` rather than `master`, but the set is still non-zero), `domain_modules` (M1), `solution_domains` (A3), `handoffs.source_domain_id` (B9 for any non-leaf domain), `skills` (F2 — exactly one `skill_type='system'` row per `domain_modules` row).
  - Non-zero when applicable: `domain_regulations` (most domains have ≥1 regulation in scope), `handoffs.target_domain_id` (most non-leaf domains receive at least one inbound handoff).
  - Routinely zero: `domain_module_host_domains` (only when cross-cutting modules host on this domain), `domains.parent_domain_id` (only when this domain has sub-domains).
- Fix: zero-row anomalies on "expected non-zero" rows are blocking. The fix routes back into the owning band — S1 just makes the gap legible at a glance and catches cases the band's own pass test missed.

**S2. Indirect-table per-module coverage.**

For every `domain_modules` row hosted on this domain (primary host + `domain_module_host_domains` entries), count `domain_module_capabilities` and `domain_module_data_objects`. Surface as:

  | Module | data_objects | capabilities |
  | --- | --- | --- |

- Zero `domain_module_capabilities` on a module routes to M6 (the reverse-orphan check added below). Zero `domain_module_data_objects` on a module is a smell (Rule #14): a derive/overlay module still carries `consumer`/`derived` rows, so an empty set means the module is unbuilt. Routes to the relevant Phase-A or Phase-B band.

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
- Fix: PATCH the row via `validateDomainRow()` in [scripts/loaders/load_research.ts](../../../scripts/loaders/load_research.ts).

**A2. Capabilities linked.**
- Query: `/capability_domains?domain_id=eq.<id>&select=capabilities(capability_code)`
- Pass: ≥3 rows (typical: 5–8). For narrowly-scoped domains, may be lower.
- Fix: extend Phase A loader for this market; apply Cross-cutting capability convention (§ below) for any capability that spans ≥3 domains.

**A3. Solutions linked with coverage_level.**
- Query: `/solution_domains?domain_id=eq.<id>&select=coverage_level,solutions(solution_name)`
- Pass: ≥3 solutions; ≥1 `primary`; coverage_level set on every row (never null).
- Fix: extend Phase A loader.

**A4. Catalog UX fields populated.** (Rule #20.)
- Query: `/domains?id=eq.<id>&select=catalog_tagline,catalog_description`
- Pass: `catalog_tagline` is a non-empty single-sentence buyer-facing one-liner; `catalog_description` is a non-empty 1-3 paragraph buyer-facing long-form description. Both are written in buyer voice (workflow + value), NOT analyst voice (market position + handoffs).
- Fix: author the buyer-voice copy and write it straight into the empty field(s) per Rule #20. The row's `record_status` carries the review signal (the user reviews the written copy in-record / in the catalog UI), so do NOT pre-surface to chat as a gate and do NOT park the draft in `history.md`. Once a non-empty value exists, never overwrite without explicit per-row user approval; marketing may have fine-tuned the original.

**A5. Vendor records reflect current legal ownership.** *(Opt-in only — not part of the routine audit pass.)*

#### Phase M precursor

Phase M (modules) runs immediately after Phase A and gates everything else. The M-band checks live in the section below; resolve any M-band failures before working through B / C / D / E.


- **Skip by default.** Re-evaluating every vendor for current legal owner requires external research (M&A news, vendor sites, recent acquisition press releases) and routinely takes hours per market. The catalog stays good-enough between explicit refresh cycles.
- **Run only when:** the user asks ("refresh vendors", "re-check ownership for X", "audit acquisitions"), OR you have specific evidence a vendor changed hands (e.g., a press release in the user's prompt), OR the user explicitly approves the scope after you've flagged it as an open question.
- Query (when running): `/solutions?id=in.(<solIds>)&select=solution_name,vendors(vendor_name)`
- Pass: every `vendor_name` matches the current legal owner (no LeanIX-as-LeanIX after the SAP acquisition, etc.).
- Fix: PATCH `vendor_id`. The predecessor-mention in `solutions.notes` is RESCINDED as an automatic action per Rule #15 — surface the rename/acquisition fact to the user; they decide whether and how to record it.

### M. Phase M — Modules (Rule #14)

A `domains` row is not deployable on its own. Modules are. The M-band is a structural gate — a failure here blocks every downstream concern.

**M1. ≥1 `domain_modules` row exists for this domain.**
- Query: `/domain_modules?domain_id=eq.<id>&select=id,domain_module_code,domain_module_name` UNION `/domain_module_host_domains?domain_id=eq.<id>&select=domain_module:domain_modules(id,domain_module_code,domain_module_name)` (the second query catches cross-cutting modules hosted on this domain via the host junction).
- Pass: combined result ≥1.
- Fix: hand-author the module set. For domains with <3 capabilities the answer is one full module covering the whole market. For a genuine derive/overlay domain that masters nothing (see § "Master-bearing vs derive/overlay domains"), the module is a derived-signals surface whose `domain_module_data_objects` carries the `consumer`/`embedded_master`/`derived` rows for what it reads and republishes (NOT an empty set). If the domain actually persists records of its own, it is master-bearing and unbuilt: run Phase B and author the masters rather than shipping a thin module.

**M2. Domains with ≥3 capabilities have ≥2 modules.**
- Capability count query: `/capability_domains?domain_id=eq.<id>&select=capability_id` (count the rows).
- Module count query: same as M1 (union of primary + host-junction modules).
- Pass: `capability_count < 3` (M2 vacuously passes) OR `module_count ≥ 2`.
- Fix: split the single module into ≥2 meaningful modules. If the capability count is borderline (exactly 3) and only one module makes sense, document why in `domain_modules.description` and revisit when the capability count grows.

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

**M7. Single-master integrity — every data_object has exactly one `role='master'` row across the whole catalog, and within a domain no master coexists with consumer/contributor on the same data_object.**

Catches catalog-internal inconsistencies the market audit can miss. The single-master rule applies catalog-wide: exactly one `role='master'` row per `data_object_id`, regardless of which domain or module holds it. The blueprint emitter throws if it sees more, but multi-master rows can sit in `domain_module_data_objects` undetected until then; M7 surfaces them at audit time.

Modules within a domain are **autonomous deployable units** (per § "The module at a glance"). A full module that's deployable standalone holds `embedded_master` shells of any data_object mastered elsewhere — including data_objects mastered by sibling modules of the same domain. That's the correct shape under autonomous-deployable-units, not a redundancy: when a customer deploys only module B without module A, the embedded shell is the only `work_items` (or whatever) row in the deployment. M7 does NOT flag this case.

- Query 1 (catalog-wide single-master): pull every `master` row for each of this domain's mastered data_objects:
  `/domain_module_data_objects?data_object_id=in.(<masters>)&role=eq.master&select=data_object_id,domain_module_id,necessity,data_objects(data_object_name),domain_modules(domain_module_code,domain_id,domains(domain_code))`
  In script: count rows per `data_object_id`. >1 is a hard fail.
- Query 2 (within-domain role coherence): pull every DMDO row across the domain's modules:
  `/domain_module_data_objects?domain_module_id=in.(<modIds>)&select=domain_module_id,data_object_id,role,necessity,data_objects(data_object_name),domain_modules(domain_module_code)`
  In script: for each `data_object_id` with >1 row in the result, classify the role combination.
- Pass criteria, in order of severity:
  - **Hard fail (catalog-wide single-master)** — same `data_object_id` has `role='master'` in two or more modules, anywhere in the catalog (same domain or different domains). Surface the conflicting rows by (`data_object_name`, `domain_module_code`, `domain_code`) and stop. The deployer / blueprint emitter cannot pick a canonical owner.
  - **Hard fail (within-domain incoherence)** — same `data_object_id` has `role='master'` in module A AND `role IN ('consumer', 'contributor')` in module B of this domain. A master coexisting with consumer/contributor in the same domain is incoherent — you don't consume what you also master in the same scope.
  - **Pass** — same `data_object_id` has `role='master'` in module A AND `role='embedded_master'` in module B of this domain. Expected under autonomous-deployable-units: B ships its own shell to be installable without A; when both are co-deployed the runtime demotion (embedded_master → consumer of A's master) takes over. No action.
  - **Pass with note** — same `data_object_id` has `role='consumer'` (or `contributor`) in multiple modules of this domain. Allowed (different modules may legitimately consume the same external master), but flag as "consider deduplicating" if the modules share scope.
  - **Pass** — same `data_object_id` has `role='embedded_master'` in multiple modules of this domain. Standard pattern when several modules of the same domain each need a standalone-deployable shell of an external master.
- Fix:
  - Catalog-wide hard fail: surface to user. The decision is which module owns canonical mastery; the other side demotes to `embedded_master` (preserving its standalone-deploy story) or `consumer` (defers entirely). Lifecycle states on the demoting side may need re-anchoring or deletion depending on the demotion target.
  - Within-domain hard fail: DELETE the `consumer`/`contributor` DMDO row in the sibling module; the master row is authoritative for the whole domain.
  - Pass with note / consolidation hint: design decision, not a structural fix. Surface in the gap report's recommendations section, not as a blocking finding.

**M8. Module-level catalog UX fields populated on every `domain_modules` row hosted on this domain.** (Rule #20.)
- Module set query: `/domain_modules?domain_id=eq.<id>&select=id,domain_module_code,catalog_tagline,catalog_description` UNION `/domain_module_host_domains?domain_id=eq.<id>&select=domain_module:domain_modules(id,domain_module_code,catalog_tagline,catalog_description)` (covers cross-cutting modules hosted here).
- Pass: every module's `catalog_tagline` is a non-empty single-sentence buyer-facing one-liner; every module's `catalog_description` is a non-empty 1-3 paragraph buyer-facing long-form description. Both are written in buyer voice (workflow + value), NOT analyst voice. A4 is the equivalent check at the domain grain; M8 is the per-module rollup.
- Fix: author the buyer-voice copy and write it straight into the empty field(s) per Rule #20. The row's `record_status` carries the review signal (the user reviews the written copy in-record / in the catalog UI), so do NOT pre-surface to chat as a gate and do NOT park the draft in `history.md`. Once a non-empty value exists, never overwrite without explicit per-row user approval; marketing may have fine-tuned the original.

**M9. Module self-containment — every module is independently deployable (no hard prerequisites).**
- The invariant: a module deploys standalone. Every data_object it touches must be `master` (it owns), `embedded_master` (it carries a local shell, so the canonical owner is NOT required, it defers to it only if installed; see [references/modules.md](references/modules.md#5-embedded-shell-contracts-live-at-deploy-time-not-in-the-catalog)), `necessity=optional` (degrades gracefully, Rule #16), or a `consumer` of a platform built-in / shared master that is always present (`users`, master-data). Self-containment has TWO layers; M9 audits both.

*Part 1 — entity layer (`domain_module_data_objects`).*
- Query: `/domain_module_data_objects?domain_module_id=in.(<modIds>)&select=role,necessity,data_object:data_objects(data_object_name,kind)`. Flag any row that is `role=contributor`, or `role=consumer AND necessity=required`, whose data_object is mastered by ANOTHER domain module (not a platform built-in / master-data) and is NOT also `embedded_master` here.
- Pass: no flagged rows. A flagged row is a self-containment VIOLATION: the module cannot deploy without co-installing another module.
- Fix: convert the relationship to `embedded_master` (carry a local shell), or set `necessity=optional` (presence-conditional). Do NOT "document" the dependency: a hard prerequisite is a modeling failure, not a deploy fact. (This replaces the abandoned "deployable closure / required modules" idea: related modules are an informational hint in the blueprint front-matter `related_modules`, never a requirement.)

*Part 2 — relationship layer (`data_object_relationships`), plan-4.* Entity membership is not enough: an in-scope entity can still carry an `is_required=true` FK to an entity that is NOT in scope, which under the old unconditional reading was a broken non-null restrict (the module could not deploy without the absent target). Presence-conditional `is_required` (the Rule #16 install-necessity / edge-requiredness bridge) neutralizes the constraint, but a REQUIRED edge into a genuinely-needed absent entity is still surfaced so the author decides.
- In-scope set: the data_objects with any `domain_module_data_objects` row for the audited modules (§3 of each module's blueprint). Pull `data_object_relationships` touching either endpoint.
- Flag every `data_object_relationships` row with `is_required=true` whose OTHER endpoint is NOT in that in-scope set, is NOT `kind='platform_builtin'` / shared master-data, and is NOT also `embedded_master` in scope.
- Pass: no flagged rows. Under presence-conditional semantics the flagged edges carry no constraint (the emitter renders them `none (required-if-present)` for reference / association, `⚠ audit: required composed child out of scope` for composition), but each is surfaced so the author picks embed-vs-optional-vs-target-required.
- Fix per finding (user-reviewed, Rule #1; NEVER a bulk auto-rewrite): embed the target (`embedded_master`), relax to presence-conditional (the new default reading, no write needed), or — when the workflow genuinely needs the target present wherever the source installs — set the TARGET's `necessity=required` in this scope. A required COMPOSITION edge to an absent child is the strongest signal (the child is owned by the parent): embed it or relax.
- Catalog-wide probe (read-only): [scripts/analytics/required_edge_presence_probe.ts](../../../scripts/analytics/required_edge_presence_probe.ts) counts `is_required=true` edges whose target is `necessity=optional` (a catalog-wide signal, distinct from the per-scope membership check above). Re-derive at run time (Policy 4); do not assume the prior 531 / 143 / 19 figures.

### B. Phase B — Data-object footprint

**B1. ≥1 `master` data_object exists.**
- Query: `/domain_data_objects?domain_id=eq.<id>&role=eq.master&select=data_object_id`
- Pass: ≥1 row. **EXCEPTION (narrow, evidence-based, NOT a fixed domain list):** a domain passes B1 with zero masters ONLY if it is a genuine derive/overlay domain (persists no record of its own; computes its entire output at query time from other domains' masters). Apply the overlay test in § "Master-bearing vs derive/overlay domains". An overlay that passes B1 by this exception is NOT a free pass: it MUST instead carry ≥1 `consumer`/`derived`/`embedded_master` row (B5) and a real non-empty module (M1). Note: there is no hard-coded "leadership-tier" list of zero-master domains. A domain that persists records no other domain masters (deal scores, forecasts, quotas, partner deal registrations, vulnerabilities, DSARs, account plans, etc.) is master-bearing and fails B1 with zero masters; if it has none, it is unbuilt, not exempt.
- Fix: run Phase 1 of the data-object research workflow (§ below).

**B2. Every master has `singular_label` and `plural_label`.**
- Query: `/data_objects?id=in.(<masters>)&select=data_object_name,singular_label,plural_label&or=(singular_label.is.null,singular_label.eq.,plural_label.is.null,plural_label.eq.)`
- Pass: empty result (every master has both labels).
- Fix: PATCH the missing labels; irregular plurals (see plan §9.1 Note A) are hand-correctable.

**B3. Naming arbitration applied on every master.** (Rule #9.)
- Query: `/data_objects?id=in.(<masters>)&select=data_object_name,is_canonical_bare_word,naming_authority_rationale`
- Pass: every bare-word name (no `_` separator, common noun) has `is_canonical_bare_word=true` with a non-empty `naming_authority_rationale`. Prefixed names pass automatically.
- Fix: rename to `<slug>_<noun>` via [scripts/loaders/rename_data_object.ts](../../../scripts/loaders/rename_data_object.ts), OR PATCH the canonical claim with rationale.

**B4. Pattern flags considered on every master.** (Rule #12.)
- Query: `/data_objects?id=in.(<masters>)&select=data_object_name,has_personal_content,has_submit_lock,has_single_approver`
- Pass: every master row exists (the flags default to false; `false` is a valid considered answer). What the checklist actually verifies is whether *any* of the three is true OR a notes/audit trail confirms the consideration. **An audit MUST positively re-evaluate** — false-by-default is not the same as false-after-review.
- Fix: PATCH flags to `true` where applicable. Record the audit pass in the gap report / PR description / chat exchange, **not** as a `notes` annotation (Rule #15).

**B5. `embedded_master` integrity.** (Rule #11.)
- Query: pull all `embedded_master` rows for this domain (`/domain_data_objects?domain_id=eq.<id>&role=eq.embedded_master&select=data_object_id`), then for each `data_object_id` verify either (a) ≥1 `master` row exists somewhere in `domain_data_objects`, or (b) `data_objects.kind='platform_builtin'`.
- Pass: every embedded_master has a canonical owner OR is built-in.
- Fix: either add the missing canonical `master` row in the owner domain, OR drop the orphan `embedded_master`.

**B6. Intra-domain `data_object_relationships` populated.**
- Query: `/data_object_relationships?and=(data_object_id.in.(<masters>),related_data_object_id.in.(<masters>))&select=data_object_id,relationship_verb,related_data_object_id`
- Pass: every master that participates in the domain's primary workflow has ≥1 edge to another in-domain master. For ATS: `candidates ↔ job_applications`, `job_applications → interviews`, `interviews → interview_scorecards`, `job_applications → job_offers`, `candidate_referrals → candidates`, `recruitment_sources → candidates`, `job_requisitions → job_applications` must all exist. An isolated master is allowed only if a `data_object_relationships.notes` entry explicitly justifies it.
- Fix: draft edges (verb + cardinality + necessity + owner_side) and load via the cluster-drafts loader (see plan §9.1 Step 5 + [scripts/loaders/load_cluster_drafts.ts](../../../scripts/loaders/load_cluster_drafts.ts) for the markdown→loader pipeline).

**B6b. `data_object_relationships` shape invariants** (owner_side, cardinality, verbs). (M7, m5, m4b; soft, surfaced as warnings, never a hard block.)
- Query: `/data_object_relationships?data_object_id=in.(<masters>)&select=data_object_id,related_data_object_id,relationship_type,relationship_kind,relationship_verb,inverse_verb,is_required,owner_side`
- Pass (re-derive each offending set at run time, never trust a stale count):
  - **inverse_verb non-empty (m4b):** every row has a non-empty `inverse_verb`. The 2026-06-01 audit saw 6 empty rows.
  - **one_to_many parent fixed (m5):** for `relationship_type='one_to_many'`, `owner_side` names the "one" / parent side and the forward `relationship_verb` reads parent-to-child (after the loader auto-flips `many_to_one`, the parent is the canonical side).
  - **composition parent = owner_side (M7):** for `relationship_kind='composition'`, `owner_side` equals the cardinality "one" side and the forward verb reads parent-to-child.
  - **composition ownership coherence (M7):** the composed child is mastered by the same module / domain that masters the composing parent, or is a non-shared dependent. Cross-check against `domain_module_data_objects` master roles; a composition edge must not point a master at a child mastered by an unrelated module.
- Fix: `owner_side` names the **parent** (lifecycle owner / cascade root). Set it to whichever side is actually the parent, NOT a blanket flip to `source`: a child-first edge (`child belongs_to parent`) already has the parent on the `target` side, so `owner_side=target` is correct and must NOT be flipped (flipping it inverts the delete semantics). Only flip to `source` when the parent is genuinely the source (e.g. `transaction requires disclosures`). The verb-direction half of the invariant (forward verb reads parent-to-child) is fixed separately by swapping `relationship_verb` with `inverse_verb`, leaving `owner_side` alone. Fill empty `inverse_verb`. Snapshot before any `owner_side` change.

**B7. `users` edges populated.** (Rule #10.)
- Query: `/data_object_relationships?and=(data_object_id.in.(<masters>),related_data_object_id.eq.<users_id>)&select=data_object_id,relationship_verb` — and the symmetric `users → masters` direction.
- Pass: every master with a user-typed actor (assignee, creator, approver, panelist, owner, hiring_manager, recruiter, author) has ≥1 edge to `users`. ATS example: `users` should edge to `job_requisitions` (recruiter, hiring_manager), `job_applications` (recruiter), `interviews` (coordinator), `interview_scorecards` (interviewer), `job_offers` (approver), `candidate_referrals` (referring_employee), `application_notes` (author).
- Fix: load per Rule #10. The `users` row is `kind='platform_builtin'`, always at `data_objects.data_object_name='users'`.

**B8. Cross-domain `data_object_relationships` populated (payload→target) — OUTBOUND only.**
- **Asymmetry rule.** A cross-domain relationship row mirrors a cross-domain handoff. The **outbound** side (this domain's master → another domain's payload) is this domain's responsibility because it owns the source of the verb. The **inbound** side (another domain's master → this domain's payload) is the other domain's responsibility and gets audited on **its** B8 pass — recording it here would mean this domain authoring relationship edges outside its own scope.
- Query: `/data_object_relationships?and=(data_object_id.in.(<masters>),related_data_object_id.not.in.(<masters>))&select=data_object_id,relationship_verb,related_data_object_id,is_required,notes`
- Pass: every **outbound** `handoffs` row (from B9) with a clean payload→target mapping has a corresponding `data_object_relationships` row in this direction (e.g., outbound handoff `ATS → ONBOARDING` on `job_offer.accepted` with payload `onboarding_journeys` ⇒ relationship `job_offers spawns onboarding_journeys`, source = ATS master, target = ONBOARDING master).
- Fix: same loader pattern as B6. Do **not** load inbound-direction rows here — they belong to the source domain's B8 pass.
- Report-only (no fix from this domain): inbound cross-domain edges that would correspond to handoffs from OTHER domains into this one. Surface them in the gap report as "owed by `<source_domain_code>` B8" so the user can decide whether to also kick off that domain's audit.

**B9. Outbound `trigger_events` + `handoffs` complete.**
- Outbound events query: `/trigger_events?data_object_id=in.(<masters>)&select=id,event_name,description`
- Outbound handoffs query: `/handoffs?source_domain_id=eq.<id>&select=trigger_event_id,target_domain_id,integration_pattern,friction_level`
- Pass: every master with an observable state transition (anything that changes the row's `status` or `state` column) has a `trigger_events` row. Every `trigger_events` row for this domain's masters has ≥1 `handoffs` row. B9 covers cross-domain handoffs (source ≠ target); intra-domain handoffs use the same table with `integration_pattern: lifecycle_progression` and are surfaced by their own module-pair queries (see the new authoring rule below for the write-time policy). Fan-out targets (one event → many subscribers) each get their own handoff row sharing the same `trigger_event_id`. **The pass test for "complete" is: list the master's lifecycle states (B11), and for every state with `requires_permission=true` OR every state name reading like a published verb (`approved`, `signed`, `accepted`, `cancelled`, `closed`, `hired`, `terminated`), there is a matching `trigger_events.event_name` of the shape `<entity>.<state>`.**
- Fix: draft the missing events + handoffs per § Phase 3 of the data-object research workflow.

**Authoring rule for new `handoffs` rows (write-time policy).** New rows MUST populate both `source_domain_module_id` and `target_domain_module_id`. The only legitimate NULL is when the counterparty domain has not yet been modularized at insert time. **Do NOT annotate the NULL in `notes`** — per Rule #15 (RESCINDED prior license), notes are off-limits without user-approved wording. Surface the NULL counterparty as a gap-report follow-up to the user (named source / target domain + payload + reason) and let them decide how to track it. Loader pre-flight in any new handoff-touching loader MUST validate this before the POST and throw on a NULL module FK whose counterparty domain is already modularized. The deferred `NOT NULL` flip on these columns is tracked separately as a catalog-wide backfill gate.

**B9b. Intra-domain cross-module `handoffs` complete.**

For any domain with ≥2 `domain_modules`, the catalog requires explicit `handoffs` rows for every cross-module lifecycle progression — these are first-class rows with `source_domain_id = target_domain_id` and (typically) `integration_pattern: lifecycle_progression`. The Signal-2 cross-domain filter excludes them at query time, so they don't pollute the platform-vs-silos analysis, but their absence leaves the deployer / fact-sheet emitter with no way to answer "what fires from `<MODULE-A>` into `<MODULE-B>` within this domain" without re-deriving it from `data_object_relationships`. **B9 can tick green on a multi-module domain that has zero intra-domain handoff rows — every checked trigger_event has ≥1 handoff somewhere, but the intra-domain event chain stays uncaptured.** B9b closes that gap. **This check is non-skippable on any domain with ≥2 modules. If it doesn't have its own query result in your audit transcript, the audit is incomplete.**

- Pre-check: skip B9b if `domain_modules` count for this domain is <2 (no cross-module surface to model). Otherwise run the queries below.
- Intra-domain handoff query (what's loaded): `/handoffs?source_domain_id=eq.<id>&target_domain_id=eq.<id>&select=id,trigger_event_id,source_domain_module_id,target_domain_module_id,data_object_id,integration_pattern,friction_level,notes,trigger_event:trigger_events(event_name,data_object_id)&order=source_domain_module_id.asc,target_domain_module_id.asc`
- Module-pair derivation: surface as the cross-product `(source_module, target_module)` and tally rows per pair. Build the **expected** set of pairs from three sources:
  1. **`data_object_relationships` between masters on different modules.** For every relationship row where both ends are this domain's masters, check whether the source-master's realizing module differs from the target-master's realizing module (resolve via `domain_module_data_objects.role='master'`). Each cross-module relationship implies at least one intra-domain handoff candidate (the verb's lifecycle expression — e.g. `job_offers spawns pre_employee_records` on `offer.accepted` ⇒ ATS-OFFERS → ATS-PRE-EMPLOYEE-RECORD).
  2. **Trigger events with no `handoffs` row anywhere.** The B9 sub-result already lists these; re-examine each one's published `data_object_id` against `domain_module_data_objects` to find which module masters it. Every state-transition event on a multi-module domain MUST have either a cross-domain handoff (covered by B9) or an intra-domain one (B9b) — or a positive justification (the event is genuinely a leaf with no in-domain or cross-domain subscriber, e.g. terminal `archived` states that exist only for query-time filtering).
  3. **Lifecycle states with `requires_permission=true` that span modules.** A state with `domain_module_id` set (per M5) on a master mastered by a different module is, by construction, a cross-module transition; the corresponding event needs an intra-domain handoff row.
- Pass: every expected pair from sources 1-3 above has ≥1 intra-domain handoff row, OR the user has explicitly approved skipping it (recorded in the gap report or a cluster-drafts annotation, NOT in `handoffs.notes` per Rule #15). No expected pair sits silently uncovered.
- Fix: draft the missing rows with `source_domain_id = target_domain_id = <id>`, `source_domain_module_id` and `target_domain_module_id` per the master-resolution rule, `integration_pattern: lifecycle_progression` as the default (use `api_call` or `event_stream` only when a real out-of-process message moves between modules, e.g. background-check rescind callbacks), `friction_level: low` as the default (intra-domain rows rarely break — bump to `medium` only with a concrete failure mode in `notes`). Load via the standard handoffs loader pattern.
- Report-only follow-ups: intra-domain handoffs sit entirely within this domain — there is no other-domain side to defer to. Every B9b miss is an in-scope fix for this domain's audit.

**B9c. `trigger_events` state fields resolve to the lifecycle state machine.** (M14; soft cross-check, never a hard FK — `to_state` is free text today.)
- Query: `/trigger_events?data_object_id=in.(<masters>)&select=event_name,data_object_id,from_state,to_state,event_category` plus each master's `data_object_lifecycle_states` state_names.
- Pass (surface mismatches, do not block): every `trigger_events.to_state` resolves to a real `data_object_lifecycle_states.state_name` on the SAME `data_object_id`; and an event firing a gated transition corresponds to a `requires_permission` lifecycle state. A `to_state` matching no state_name is a drift signal (the event and the state machine are two unjoined models of the same transition).
- Fix: align `to_state` to the lifecycle `state_name` (or add the missing lifecycle state). Report-only when the publisher entity is mastered out of this domain's scope.

**B10. Inbound `handoffs` — REPORT ONLY (the fix lives on the source domain).**
- **Asymmetry rule.** Inbound handoffs to this domain are outbound handoffs from someone else's perspective. They are **published** by the source domain's `trigger_events` + `handoffs` rows (its own B9 work). When researching or loading this domain, you can only legitimately produce *outbound* handoff rows (events this domain publishes). Authoring inbound handoffs from this domain would mean inventing rows on behalf of a source domain you haven't audited; that's how the catalog accumulates wrong-looking handoffs without provenance.
- Query (what's already loaded): `/handoffs?target_domain_id=eq.<id>&select=source_domain_id,trigger_event_id,data_object_id`
- Pass: report the inbound coverage as-is. Missing inbound rows are **not a failure of this domain's audit** — they're a B9 gap on the source domain.

  **Discovering inbound candidates (which other domains owe me coverage).** The catalog deterministically tells you which other domains *should* be publishing into this domain. For every dependency this domain holds (`embedded_master` / `contributor` / `consumer` rows), the canonical master row on the same `data_object_id` names the owner — and that owner's B9 owes outbound handoffs to this domain whenever the shared record transitions state.

  Two-query discovery procedure:

  1. **List this domain's non-master dependencies:**
     `/domain_data_objects?domain_id=eq.<id>&role=in.(embedded_master,contributor,consumer)&select=data_object_id,role,necessity,data_objects(data_object_name)`
  2. **For each dependency's `data_object_id`, list the canonical owner(s):**
     `/domain_data_objects?data_object_id=in.(<deps>)&role=eq.master&select=data_object_id,domain_id,domains(domain_code)`

  Cross-join (in script) on `data_object_id` to produce the candidate list: `(owner_domain_code, data_object_name, my_role, my_necessity)`. Then for each candidate row, check whether `/handoffs?source_domain_id=eq.<owner_id>&target_domain_id=eq.<id>&data_object_id=eq.<dep_id>` already has a row. If it does, the inbound is covered. If it doesn't, the candidate joins the **report-only follow-ups** subsection.

- Report shape (during audit):
  - **Covered inbound** — list the rows that already exist (positive-finding sanity check).
  - **Owed by other domains** — list each missing inbound as `<owner_code> B9 owes outbound on \`<data_object_name>\` → <this_code> (this domain's <role> + <necessity>)`. User decides whether to also audit those source domains; the missing rows are **not** loaded from this domain's pass.
  - **Unowned dependencies** — if a dependency has no canonical master anywhere in the catalog AND isn't `kind='platform_builtin'`, surface as a B5 integrity failure (different category, blocks this domain's pass).

- Example: ATS embedded-masters `hcm_positions` (id 32). Discovery query 1 returns `(32, embedded_master, required)`. Discovery query 2 returns `(32, 54, HCM)` — HCM canonically masters positions. Then check `/handoffs?source_domain_id=eq.54&target_domain_id=eq.56&data_object_id=eq.32` — if empty, the report writes "HCM B9 owes outbound on `hcm_positions` → ATS (this domain's embedded_master + required)". The fix happens when HCM is reviewed.

**B10b. Per-module attribution on `handoffs`.**

The `handoffs` table carries two per-module FK columns that are routinely null because the modularization-era backfill never ran across pre-modular rows. **An audit that fails to check these columns will pass a domain whose handoff rows have zero module attribution**, which then makes every downstream fact sheet over-attribute events to every module in the source / target domain. **This check is non-skippable. If it doesn't have its own query result in your audit transcript, the audit is incomplete.**

- Outbound query (sets `source_domain_module_id` for this domain): `/handoffs?source_domain_id=eq.<id>&source_domain_module_id=is.null&select=id,trigger_event_id,data_object_id,target_domain_id,trigger_events(event_name,data_object_id)`
- Inbound query (sets `target_domain_module_id` for this domain): `/handoffs?target_domain_id=eq.<id>&target_domain_module_id=is.null&select=id,trigger_event_id,data_object_id,source_domain_id,trigger_events(event_name,data_object_id)`
- Pass: both queries return zero rows. **Null on the opposite side (e.g. `target_domain_module_id` for an outbound row leaving this domain) is the target domain's B10b — report it for that domain's audit but don't block on it here.**
- Fix: deterministic derivation, then patch. See [scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts](../../../scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts) as the reference loader.
  - **source_domain_module_id** = the module in `source_domain_id` that holds `trigger_events.data_object_id` (the event's data_object, NOT the handoff's payload — these can differ when the event fires on a source-mastered object and the payload is the target-mastered object) with the strongest role. Role order: `master` > `embedded_master` > `contributor` > `consumer` > `derived`.
  - **target_domain_module_id** = the module in `target_domain_id` that holds the handoff's `data_object_id` (the payload) with the strongest role.
  - **Tie** (multiple modules at the same strongest role): leave NULL, surface as ambiguous in the gap report. Don't pick arbitrarily.
  - **No candidate** (no module in the relevant domain holds the data_object): this is itself a deeper gap. Two sub-cases:
    1. *Domain-level legacy row.* The data_object sits in legacy `domain_data_objects` for the domain but no `domain_module_data_objects` row exists. Fix is **upstream**: load the `domain_module_data_objects` row (B-band Phase 2), then re-run the backfill.
    2. *No-role row.* The handoff names a payload the target domain doesn't model at all (e.g. ATS receives `position_demand_forecast.updated` but no ATS module declares any role on `position_demand_forecasts`). Decide: either load a `consumer` row on the receiving module (preferred — captures the dependency in the catalog), or accept that the handoff is a domain-level signal with no module owner (rare; usually means the handoff itself is mis-modeled).
- Also surface: any handoff row where `trigger_events.data_object_id` differs from `handoffs.data_object_id` AND neither side resolves to a module. This is the diagnostic for trigger-event data quality bugs (e.g. duplicate / mis-pointed events). The ATS audit found `trigger_event.id=227` (`assessment.completed`) pointing at `risk_assessments` instead of `candidate_assessments`; rows 1180 / 1181 (`candidate_assessment.passed` / `.failed`) are the modern replacements.
- Why this matters: without per-module attribution, fact sheets attribute outbound events to every module in the source domain and inbound events to every module in the target domain — a single outbound event then appears duplicated across every module page in the source domain. The columns exist precisely so this can't happen.

The legacy B9 / B10 queries deliberately did not include these columns. Future audits MUST run B10b in addition. The structural sweep (S1) covers FKs to `domains`; per-module FKs to `domain_modules` are NOT swept there. **B10b is the home for module-level FK coverage on `handoffs`.**

**B11. `data_object_aliases` populated for non-self-explanatory masters.**
- Query: `/data_object_aliases?data_object_id=in.(<masters>)&select=data_object_id,alias_name,alias_type`
- Pass: every master that has any cross-vendor / cross-industry synonym has ≥1 alias row. Self-explanatory masters (e.g. `hcm_employees` for "employee", `job_postings` for "job posting") are exempt — record the exemption decision in the audit conversation / gap report, not in `notes` (Rule #15).
- Fix: draft alias rows; bundle into the cluster-drafts pattern.

**B12. `data_object_lifecycle_states` loaded on every `operational_workflow` master.** (Rule #12.)
- Query: `/data_objects?id=in.(<masters>)&entity_type=eq.operational_workflow&select=id,data_object_name` then `/data_object_lifecycle_states?data_object_id=in.(<workflow_masters>)&select=data_object_id`
- Pass: every master with `entity_type='operational_workflow'` has ≥1 lifecycle state row. Masters with `entity_type ∈ (operational_record, catalog, junction, computed)` pass regardless of whether lifecycle rows exist. Masters with `entity_type='unclassified'` are flagged under B13, not B12.
- Pass (state-machine shape, M4): for every master with lifecycle rows, exactly one state has `is_initial=true`, at least one has `is_terminal=true`, and `state_order` is unique and monotonic within the state set. The emitter annotates violations at emit time (M4-emit); this band is the authoring-time gate. The 2026-06-01 catalog audit found duplicate `state_order` on `customers`, two initial states on `okr_objectives`, and no terminal state on `lp_commitments`.
- Fix: either author the missing lifecycle states (initial state + workflow gates marked `requires_permission=true` + `permission_verb_override` for non-obvious verbs + `domain_module_id` when the state belongs to a specific module), OR PATCH `entity_type` to the correct value if the master was mis-classified.

**B13. `entity_type` classified on every master.** (Rule #12.)
- Query: `/data_objects?id=in.(<masters>)&entity_type=eq.unclassified&select=id,data_object_name,description`
- Pass: empty result (every master carries a typed `entity_type`).
- Fix: PATCH each row to the correct value per Rule #12's enum (`operational_workflow` / `operational_record` / `catalog` / `junction` / `computed`). Classification is deterministic from the description for nearly every master; if a row genuinely doesn't fit any value, surface to the user before forcing a classification.

**B14. Sector- / vendor-conditional masters flagged `master + optional`.** (Rule #16 cases B + C.)
- Query (statute-prefix scan): `/domain_module_data_objects?role=eq.master&necessity=eq.required&domain_module_id=in.(<modIds>)&data_objects.data_object_name=in.(<prefixed>)&select=id,data_objects(data_object_name),domain_modules(domain_module_code)` where `<prefixed>` enumerates names matching `fcra_*` / `ofccp_*` / `hipaa_*` / `osha_*` / `sox_*` / `ferpa_*` / `finra_*` / `gdpr_*` / `ccpa_*` / `eeo_*` / `*adverse_action*` / `*data_subject*` / `*self_id*` / `*applicant_flow*` etc. Run as a single `data_object_name=ilike.*<token>*` set per token.
- Query (vendor-shape scan): cross-reference the domain's `master + required` rows against the Phase 0 vendor surface matrix; flag any row where ≥1 flagship vendor lacks the entity as a first-class master.
- Pass: every `master + required` row in this domain's modules is either (a) genuinely universal (workflow halts without it), (b) flagged optional, or (c) the user has explicitly recorded a "kept required" decision.
- Fix: PATCH the failing rows to `necessity='optional'`. Re-emit the affected blueprints. Surface the decision rationale in the audit's gap report (the entity name + statute/vendor reasoning, NOT in `notes` per Rule #15).
- Why this is its own check: B1 only enforces ≥1 master; B4 only enforces pattern flags. Neither asks the necessity-conditional question. Without B14, statute-prefixed masters land `required` by default and propagate as "every tenant must install this" downstream. Catalog-wide audit on 2026-06-01 found 12 such rows across ATS / LMS / RE-BROKERAGE; B14 closes the recurrence.

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

### E. Personas, RACI & responsibilities (review band)

Personas (`domain_roles`) capture the job-shaped workflows that span a domain's modules; `process_raci` captures who is Responsible / Accountable / Consulted / Informed for each process (polymorphic actor: persona or agent skill). The permission bundle is DERIVED (emitter §9), NOT stored, so this band checks AUTHORED reach + responsibility and reconciles them against the derivation, never a stored bundle. Under Rule #14 every domain has ≥1 module, but a single-module domain can't host multi-module personas (the 2-module floor), so E1's threshold is qualified by capability/module count. Replaces the former roles / permission-bundle E-band (Plan 3, 2026-06-02; the `_core` `roles` / `role_permissions` layer was deleted). Long-form rules in [references/roles.md](references/roles.md).

**E1. Persona coverage matches the domain's module shape (ZERO-PERSONA COVERAGE EXPECTATION).**
- Query: `/domain_roles?business_function_id=eq.<fn_id>&select=id,role_code,role_name` UNION cross-functional personas touching any of the domain's modules: `/role_modules?domain_module_id=in.(<modIds>)&select=role:domain_roles!inner(id,role_code,business_function_id)`.
- Pass: **single-module domains** (capability_count < 3, exactly 1 module) — E1 vacuously passes; the 2-module floor blocks persona authoring. **Multi-module domains** (≥2 modules / capability_count ≥ 3) — ≥1 persona, and this check **FIRES a finding on ZERO**. This is the forcing function behind the Plan-3 throwaway: after the deletion every qualifying domain reads zero personas until authored, so absence is LOUD, never silently "done". Typical when authored: 3-5 personas tightly-scoped, 5-7 broad.
- Fix: author the personas (function-scoped naming) + their `role_modules` reach + `process_raci` assignments via Phase E / a focused loader.

**E2. 2-module floor on every persona.**
- Query: for each persona from E1, count `/role_modules?role_id=eq.<id>` rows.
- Pass: every persona has ≥2 entries.
- Fix: add the missing reach row (if the persona legitimately spans more modules), or delete the persona (single-module = a permission tier, not a persona).

**E3. Every `role_modules` row has `interaction_level` set.**
- Query: `/role_modules?role_id=in.(<ids>)&interaction_level=is.null&select=id`
- Pass: empty result. Only `primary` / `secondary` are valid (read-only is captured by the derived bundle holding only `:read`).
- Fix: PATCH the missing values.

**E4. RACI coverage: the domain's gated processes have `process_raci` assignments.**
- Query: the domain's processes whose masters carry gated lifecycle states (`data_object_lifecycle_states.process_id` set), then `/process_raci?process_id=in.(<procIds>)&select=process_id,raci,actor_role_id,actor_skill_id`.
- Pass: each gated process has ≥1 Responsible and ≥1 Accountable assignment. Exactly-one-actor is hard-enforced by the `exactly_one_actor` trigger, so it needs no audit. Skill actors are deferred, so persona actors are expected today.
- Fix: author the missing `process_raci` rows; ensure each gated lifecycle transition has its `process_id` wired (E6 reconciles this).

**E5. `has_single_approver` ↔ Accountable consistency (soft-warn, Policy 1).**
- For each master with `has_single_approver=true`, its approve process should carry exactly one `process_raci` Accountable row.
- Pass: agreement, or a recorded reason for divergence. Never blocks the load.
- Fix: reconcile the flag with the RACI Accountable, or note why they differ (the legacy flag is a human-only RACI fragment this layer generalizes).

**E6. Reach reconciles against the DERIVED permissions + `entity_type` is classified (B13 folded in).**
- Reach: regenerate the blueprint and confirm §9 resolves — every module in a persona's `role_modules` gets a derived tier (no dropped reach), and every granted gate traces to a reach row or a `process_raci` R/A row whose process has a `process_id`-wired lifecycle gate (no grant from nowhere). A `process_raci` R/A row whose process has no wired gate derives nothing — that is the new drift signal (the old stored-bundle drift cannot occur, since the bundle is recomputed every emit).
- entity_type: every master has `entity_type` set (not `unclassified`); the write-tier derivation depends on it.
- Fix: wire the missing lifecycle `process_id`, or classify the master, then re-emit.

### F. Skill-layer integrity

The `skills` table sits next to `roles` but represents agent skills, not user roles. The F-band enforces Rule #17's positive-existence requirement (one `system` skill per `domain_modules` row, with ≥1 `skill_tools` row) as well as a legacy-cleanup check (F1).

**F1. No legacy domain-level system skills remain once module-level skills exist.**
- Query: `/skills?domain_id=eq.<id>&skill_type=eq.system&domain_module_id=is.null&select=id,skill_name`.
- Pass: empty result. Acceptable transitional state ONLY when no module-level system skill has been authored for this domain yet — once any `domain_module_id`-anchored system skill exists for the domain, every remaining `domain_id`-only legacy row is obsolete.
- Fix: retire the legacy row (DELETE). Only convert if a genuine domain-level need is distinct from the per-module skills, which is rare — the per-module skills are the catalog's target state per Rule #14.

**F2. Every `domain_modules` row for this domain has exactly one `skill_type='system'` skill.** (Rule #17.)
- Module set: `/domain_modules?domain_id=eq.<id>&select=id,domain_module_code` UNION `/domain_module_host_domains?domain_id=eq.<id>&select=domain_module:domain_modules(id,domain_module_code)` (covers cross-cutting modules hosted here).
- Skill set query: `/skills?domain_module_id=in.(<modIds>)&skill_type=eq.system&select=domain_module_id,id,skill_name`.
- Pass: every module id from the module set appears **exactly once** in the skill set. Zero is a Phase-S gap; >1 is a rule violation (split the module instead of stacking system skills).
- Fix: author the missing system skill per Phase S in the workflow. Use `skill_name='<module_code_lower>_agent'` (e.g. `crm_acct_mgt_agent`); load alongside the module's tools and `skill_tools` in the same loader.

**F3. Every module-level system skill has ≥1 `skill_tools` row.** (Rule #17.)
- Query: for the skill ids from F2, `/skill_tools?skill_id=in.(<skillIds>)&select=skill_id,tool_id,requirement_level`.
- Pass: every skill returns ≥1 row. Typical shape is 5–20 tools (mix of `required` + `optional`).
- Fix: extend the Phase-S loader to author the missing tools + `skill_tools` rows. A `required` floor of ≥3 tools is the practical minimum: at least one `query`, one `mutate`, one workflow gate.

**F4. Tool `operation_kind` ↔ `data_object_id` invariant holds on every linked tool.** (Rule #17 sub-invariant.)
- Query: `/skill_tools?skill_id=in.(<skillIds>)&select=tools(id,tool_name,operation_kind,data_object_id)`.
- Pass: for every tool, `operation_kind ∈ {query, mutate}` implies `data_object_id` set; `operation_kind ∈ {fetch, side_effect, compute}` implies `data_object_id` is null; `operation_kind = inbound` allows either (NULL or set). Any row that violates this pairing is a tool-row defect. The constraint is enforced platform-side via JsonLogic on `fields.tools.data_object_id`, but the F4 audit verifies on the read path in case a row got in before the rule was installed.
- Fix: PATCH the offending `tools` row (either set / clear `data_object_id`, or correct the `operation_kind`). Re-PATCH the catalog, not the junction.

**F5. Semantius score is computable for every module of this domain.**
- Derivation: per the formulas in § "Semantius score", `strict_score(skill) = count(skill_tools WHERE tools.coverage_tier='platform') / count(skill_tools)` and `operational_score(skill) = count(WHERE tools.coverage_tier IN ('platform','integration')) / count(skill_tools)`, joined via `skills.domain_module_id`. Per-domain: union the numerators and denominators across all system skills for modules hosted here, then divide. Do not average per-module scores (see the convention in the at-a-glance section).
- Pass: every module returns both scores (numbers in [0, 1], including 0 if every linked tool is `external`). The metric must be computable, not high. A low score is information about the gap, not a failure.
- Fix: F5 cannot fail independently. F2 + F3 + F4 cure every F5 failure. The check is here as a rollup so the audit gap report leads with the score (or the literal "uncomputable, see F2/F3").

**F6. (Future) The `tools` catalog is deduplicated.** *(reserved — not part of routine audit.)* A tool with the same `tool_name` and `operation_kind` and `data_object_id` linked from multiple skills is the same primitive and should be a single `tools` row. The deduplication pass runs catalog-wide, not per-domain; F6 reserves the ID for when it ships.

**F7. Channel primitives are only linked when the workflow requires a specific channel; otherwise the skill uses the `notify_person` / `notify_team` abstraction.** (Per the § "Channel vs capability authoring rule".)
- Query: `/skill_tools?skill_id=in.(<skillIds>)&select=skill_id,notes,tools!inner(tool_name)&tools.tool_name=in.(send_email,send_sms,post_chat_message,make_phone_call,send_push_notification,send_whatsapp_message)`
- Pass: every returned row carries a workflow-specific justification in `skill_tools.notes` explaining why the channel can't be substituted (e.g. "voice IS the workflow", "envelope-completion webhook is the contract", "EDI message exchange per trading-partner contract"). Rows with empty `notes` OR with generic notification-shaped notes ("enrollment confirmations", "due-date reminders", "completion notifications", "assignee notification") fail. The default for generic notifications is `notify_person`; the default for broadcast is `notify_team`.
- Fix: PATCH the offending `skill_tools.tool_id` to point at `notify_person` (or `notify_team` for broadcast). Idempotency-safe: if the same skill already links the abstraction, DELETE the channel-primitive row instead of PATCHing. Multi-channel rows mean broadcast (AND), not at-least-one (OR); if the skill genuinely needs to fire on BOTH email and chat, keep both with notes justifying each.
- Why this is here: the rule was stated in the authoring section but missed at audit time on at least three loads. The abstraction's structural value is that when the platform ships outbound, `notify_person.coverage_tier` flips to `platform` with one UPDATE and every skill using it re-scores; channel-specific links don't ride that flip and have to be hand-patched.

### H. Handoff APQC coverage (per-domain checklist)

This band closes the gap that produced two consecutive ITSM audits with zero APQC tagging. The procedure-level docs say APQC tagging is required; the checklist now enforces it as a routine pass alongside the structural checks. Audits that skip H1 are not complete.

**H1. Every cross-domain handoff this domain publishes or receives has either a `handoff_processes` row OR an explicit deferral entry in the audit.**

- Query (outbound): `/handoffs?source_domain_id=eq.<id>&target_domain_id=neq.<id>&select=id,trigger_event:trigger_events(event_name),payload:data_objects!handoffs_data_object_id_fkey(data_object_name),target_domain:domains!handoffs_target_domain_id_fkey(domain_code)`
- Query (inbound): `/handoffs?target_domain_id=eq.<id>&source_domain_id=neq.<id>&select=id,trigger_event:trigger_events(event_name),payload:data_objects!handoffs_data_object_id_fkey(data_object_name),source_domain:domains!handoffs_source_domain_id_fkey(domain_code)`
- Existing tags: `/handoff_processes?handoff_id=in.(<all handoff ids>)&select=handoff_id,process_id,proposal_source,record_status,process:processes(process_name,external_id,hierarchy_level)`
- Pass (coverage): for every cross-domain handoff in the outbound + inbound set, either (a) ≥1 `handoff_processes` row exists (any `proposal_source`, any `record_status`), OR (b) the audit's Bucket 1 APQC TAGGING section lists the handoff with a defer-to-Discover reason. **Zero of either = audit incomplete.**
- Volume expectation (process target): for N cross-domain handoffs, expect 0.5N to 0.8N NEW `agent_curated` tags proposed in this audit + ~0.2N deferred. If the audit produces 0 new tags and 0 deferrals, the H-band is failed and the audit is not done.
- Fix: APQC TAGGING finding type in Bucket 1. Per-handoff procedure: [references/domain-audit-procedure.md](references/domain-audit-procedure.md) § APQC TAGGING. Author rows with `proposal_source='agent_curated'`, `record_status='new'`. The composed key `(handoff_id, process_id)` prevents duplicates. Use `proposal_source='human_curated'` ONLY when the user explicitly typed *"add tag X for handoff Y"* — never as a default for agent-authored work.

**H-band reports two distinct numbers; don't confuse them.**

| Number | Column | Meaning | When to use |
|---|---|---|---|
| **Coverage (catalog quality)** | `record_status='approved'` count | How many handoffs have a tag a reviewer signed off on | The headline quality measure. *"How much of ITSM's APQC mapping is trustworthy?"* |
| **Provenance (process health)** | `(agent_curated + human_curated)` count | How many tags came from a context-rich author (the AI agent during fix-loop, or the user explicitly) vs the machine substring matcher | Workflow regression test + review-time triage hint. *"Did our layered-ownership process actually fire?"* Sort by source so reviewers fast-track context-rich rows. |

A `discovery_substring` row that the reviewer approves IS high-quality (column 1). An `agent_curated` row that sits at `record_status='new'` is NOT yet high-quality (column 1) — it's high-confidence-pending-review. The audit's headline quality flag is the approved count; the agent_curated count is a secondary process side-bar. Conflating them was a recurring mistake in the first ITSM re-audit (called it a "quality indicator" when it was actually a process indicator).

**H1 anti-pattern** (the first 2026-05-29 ITSM audit): rigorous structural pass through B-band findings + 5 Bucket-1 sub-sections + Bucket 2 + Bucket 3, but zero APQC TAGGING section. The analyst built the full mental model needed to tag (reading every cross-domain handoff in detail) and discarded it at the end. The H1 band now forces the section into Bucket 1 so this can't recur.

- Why H, not extension of B or F: B-band is per-handoff structural (B9/B10b focus on FKs and attribution); F-band is per-skill / per-module. APQC linkage is a parallel concern that needs its own band so it doesn't get optimised away during refactors of the structural bands.

### Audit recipe — structural pass of the Validate mode

> **This is one of four passes in the Validate mode** (see [README.md](../../../README.md) § "Validate a domain"). When a user says *"validate / audit / review / verify `<DOMAIN>`"* or *"is `<DOMAIN>` fully loaded"* or *"what's missing for `<DOMAIN>`"*, you run all four passes: market audit (§ below), this structural pass, neighbor discovery (auto-derive related domains from `handoffs` + cross-domain DMDO rows), and pairwise reconciliation against each neighbor (§ "Pairwise handoff reconciliation" further below). Running just one pass is the failure pattern that lets gaps fall through — structural says "every junction has its qualifier" while semantic gaps go undetected, market audit says "you're missing FCRA disclosures" while internal inconsistencies go undetected, and skipping neighbor reconciliation leaves cross-domain edges half-wired. The triggers route to ALL four passes; never to one alone.

1. Resolve `<DOMAIN_CODE>` to `<id>` and `<masters>` once at the start. Cache for reuse across queries.
2. **Run the S-band sweep first** (S1 + S2 + S3). It produces the coverage tables the gap report leads with and surfaces zero-row anomalies the band checks may not specifically test.
3. Run every **in-scope** band check (A / M / B / C / D / E / F / **H**) in order. Skip A5 unless the user has explicitly asked for a vendor-ownership refresh. **H1 is NOT optional** — audits that skip the H-band are incomplete; do not surface the gap report until H1 has been worked.
4. Classify each result:
   - **Structural gate** — M1–M7 failures block every downstream concern. A domain with no modules (or with capability-orphaned modules) can't be modeled in Phase B/E correctly until the M-band is clean. Resolve M-band first. (M8 is a content-quality check, not a structural gate.)
   - **In-scope fix** — this domain can fix locally (S1–S3 zero-row anomalies, A1–A4, M1–M8, B1–B9, B9b, B10b, B11–B13, C1–C2, D1, E1–E6, F1–F5, F7, **H1**). Goes into the **gap report** as actionable. Fact-sheet emission is **not** an audit step — see § "Fact sheets" below.
   - **Report-only follow-up** — the symmetric side is owned by another domain (B8 inbound direction, all of B10). Goes into a separate **"report-only follow-ups"** subsection of the report, naming the source domain + the missing check ID on that side (e.g. "HCM B9 owes outbound on `hcm_positions`"). **Do not author fixes for these from this domain's audit.** These items NEVER block the audited domain's green status; they are observations the user can act on by scheduling audits of the source domains.
4. Surface the gap report to the user **before** authoring any fixes. Include the failing query output snippet so the user can sanity-check. Ask whether to also kick off audits on the source domains in the report-only section.
5. For each accepted in-scope fix, author it (markdown draft, or directly in a loader); never load AI-generated content without a user review pass (Rule #1).
6. Load fixes with `record_status='new'`. User bulk-approves per category after review.
7. Re-run the audit. The acceptance criterion is zero failed **in-scope** IDs (modulo the documented exceptions in B1, B12). Report-only follow-ups remain visible until the source domains are themselves audited; they are not blockers for this domain's pass.

A well-run audit produces two artifacts: the gap report (with in-scope and report-only subsections) and, if the user agrees to load, the fix drafts. Fact-sheet emission is not part of the audit deliverable; if the user wants refreshed fact sheets after fixes land, that's a separate explicit step (see § "Fact sheets" below).

**Output discipline — three-bucket surface with explicit per-bucket prompts.** Every Validate run categorizes findings into three buckets — **Bucket 1: in-scope confirmed gaps** (agent-fixable), **Bucket 2: surface-for-user** (judgment calls), **Bucket 3: Phase 0 pending** (speculative gaps from semantic pass with no vendor-surface baseline). After surfacing each bucket the agent **explicitly prompts** for action ("fix these now?" / "what's your call on each?" / "vet via Phase 0 research or eyeball-mode?") rather than dumping the report and waiting. Unclear next steps are the main reason domain audits stall; the explicit-prompt discipline prevents this. Cross-bucket dependencies (a Bucket 2 question whose answer would shift if Bucket 3 research lands) are called out at surface time. Full template + per-bucket prompt scripts: [references/domain-audit-procedure.md](references/domain-audit-procedure.md) § "Step 3 — Surface the gap report to the user, categorized into three buckets".

### Domain-level market audit — semantic pass of the Validate mode

> **This is one of four passes in the Validate mode** (paired with the structural Audit recipe above and the neighbor-discovery + pairwise passes below). When a user says *"validate / audit / review / verify `<DOMAIN>`"* or any of the trigger phrases listed in [README.md](../../../README.md) § "Validate a domain", you run all four passes and combine. Never invoke the market audit alone — running just the semantic pass leaves structural inconsistency and cross-domain edge drift undetected. The user's trigger is mode-level ("validate X"), not pass-level ("just run market audit on X").

The per-domain completeness checklist above verifies **structural** correctness: every domain has ≥1 master, every junction has its qualifier, every module has its system skill, every handoff has both module FKs. A domain can pass A/M/B/C/D/E/F **and still be semantically incomplete** — a module with the right structure but missing half its workflow substrate (engagement, compliance, transitions, approvals) ticks every structural box while shipping a thin point-solution surface. The structural audit doesn't ask *"does this footprint match what a flagship vendor in this market actually masters?"*.

The market audit closes that gap. It is the **regression test for Phase 0**: when a load violated Phase 0 (or pre-dates it, since pre-modular and early-modular loads ran before Phase 0 existed), the next market audit catches the drift. Re-runnable on demand; cheap to invoke per domain.

**What it surfaces** (four findings categories):

- **MISSING entities** — in the market surface, not in the current footprint. Workflow substrate gaps, missing compliance entities, missing junctions / transitions.
- **WRONG-OWNERSHIP** — entity is in the catalog but in a different module than market practice suggests (e.g. ATS-CANDIDATE-CRM carrying `skill_profiles` when that entity belongs in `skills-mgmt-profile`).
- **SCOPE-CREEP** — entity is in the current footprint but not in the market surface (e.g. ATS-RECRUITMENT-PIPELINE consuming `predictive_models` mastered in some workforce-planning domain with no handoff between them).
- **MODULARIZATION ISSUES** — the module split itself doesn't cleanly cover the surface (overlap, gap, misnamed scope). Distinct from wrong-ownership: wrong-ownership means "right entity, wrong module"; modularization issue means "the module set itself needs to be refactored".

**Procedure (high-level; full detail in [references/domain-audit-procedure.md](references/domain-audit-procedure.md)):**

1. Pull current state from live tables — `domains`, `domain_modules`, `domain_module_host_domains`, `domain_module_data_objects`. Never from blueprints, never from deploy scripts (Rule: live state only).
2. Spawn a `general-purpose` subagent to generate the market surface fresh, with the prompt template in the reference doc. Subagent produces JSON + markdown at `.tmp_deploy/<DOMAIN>-market-surface-<date>.json` / `.md` containing the vendor surface matrix and a diff against the current footprint.
3. Surface a one-table summary (MISSING / WRONG-OWNERSHIP / SCOPE-CREEP / MODULARIZATION counts) to the user, then offer to drill into any category.
4. Write TWO outputs to the per-domain audit directory:
   - **Append** a new dated `## YYYY-MM-DD — Audit` section to `audits/<DOMAIN_CODE>/history.md` (append-only, git-tracked) carrying the full narrative.
   - **Rewrite in place** `audits/<DOMAIN_CODE>/state.yaml` in `schema_version: 2` format (see [audits/README.md](../../../../audits/README.md)) with current open `b1a` (agent-solvable) / `b1b` (blocked) / `b2` (user-judgment) / `b3` (research-pending) items. Resolved items live ONLY in `history.md`, not in `state.yaml`.

   The raw subagent JSON drafts stay in `.tmp_deploy/` (ephemeral).
5. Schedule fix loads per finding type: MISSING → Phase B insert; WRONG-OWNERSHIP → DELETE + INSERT in right module; SCOPE-CREEP → DELETE + cascade; MODULARIZATION → separate refactor conversation (don't fold into the fix-loop).
6. Re-run after fixes land. Acceptance criterion: zero MISSING / WRONG-OWNERSHIP / SCOPE-CREEP (modulo user-accepted exceptions).

**Hard rules:**
- Never auto-load fixes from a market audit (Rule #1). The audit produces a triage list; the user decides.
- Cap subagent scope to **one domain per invocation**. Market audit is per-domain; cluster-batched audits produce shallow per-domain results.
- The audit is complementary to, not a replacement for, the structural completeness checklist. Run the structural audit too; both are needed before a domain is "done".

**Output discipline:** market audit is read-only by construction. The output is the gap report; loads happen separately on user approval, using existing loader patterns (e.g. [scripts/loaders/fix_ats_modules.ts](../../../scripts/loaders/fix_ats_modules.ts) for the FIX shape).

### Pairwise handoff reconciliation — per-neighbor pass of the Validate mode

> **This is the third and fourth passes of the Validate mode** (see [README.md](../../../README.md) § "Validate a domain", passes 3 + 4). The neighbor set for domain X is **auto-discovered** from the catalog, not user-supplied. Query `handoffs?source_domain_id=eq.<X-id>` UNION `handoffs?target_domain_id=eq.<X-id>` UNION `domain_module_data_objects` rows on X's modules whose `data_object_id` is mastered in another domain. Rank by edge weight (number of handoffs + dependency count). Run the four-leg analysis below against every neighbor with edge weight ≥3 by default; lighter neighbors get a one-table summary unless the user asks for the deep dive on all of them. **Manual bilateral form** (user names two specific domain codes) is a fallback for "I just want to check one boundary": triggers *"validate `<A>` ↔ `<B>` boundary"*, *"reconcile `<A>` and `<B>`"*, *"check the handoff boundary between `<A>` and `<B>`"*, *"is the `<A>` ↔ `<B>` boundary fully wired"*. Either form runs the same four-leg analysis below.

The per-domain audit is **necessarily one-sided**: it surfaces what *this* domain owes (in-scope B-band failures) and what *other* domains owe *this* domain (B10 report-only). Closing a cross-domain handoff requires both sides — the producer authors `trigger_events` + `handoffs` rows, the consumer declares `domain_module_data_objects` (DMDO) consumer/contributor coverage. Per-domain audit catches the two halves separately and you converge by intersecting two report-only sections; pairwise reconciliation walks the boundary in one pass and produces a single diff.

**When to invoke** (never as part of routine audit — always targeted):

- Just finished auditing one side and the report-only inbound section flagged the partner. Reconcile before scheduling a second full audit on the partner.
- About to load a new cross-domain handoff and want to verify both ends are ready before the POST.
- Cleanup pass on a long-standing high-traffic boundary (HCM↔ATS, ITSM↔CMDB, CRM↔CPQ) where both sides have shipped many independent loads and drift is plausible.

**Inputs.** Two domain codes — `<A>` and `<B>`. Resolve both to ids + master sets at the start; cache them.

**The four legs of every cross-domain handoff A→B** (and symmetrically B→A):

1. **Producer master + lifecycle state.** A has the master `data_object` whose state change fires the event (verify via `domain_module_data_objects.role='master'` for the trigger_event's `data_object_id`). Without this leg, the event is mis-attributed at source.
2. **Trigger event row.** `trigger_events` carries an `event_name` keyed against A's master, with `data_object_id` pointing at the publishing master. One row per event — never per subscriber (Phase D rule).
3. **Handoff row with both module FKs resolved.** `handoffs` carries source side `(source_domain_id=A, source_domain_module_id=<A-module-that-masters-the-event-data_object>)` and target side `(target_domain_id=B, target_domain_module_id=<B-module-that-holds-the-payload>)`. Both module FKs are NOT NULL once both sides are modularized.
4. **Consumer DMDO on the target.** B has a `domain_module_data_objects` row declaring `role IN ('consumer','contributor','embedded_master')` on the handoff's payload `data_object_id`, anchored at the target module. Without this leg, the B10b backfill leaves `target_domain_module_id` NULL (sub-case 2).

**Procedure (run as a TypeScript loader; never Python).**

1. **Pull both sides' shape.**
   - A's masters with workflow-bearing lifecycle states: `/data_object_lifecycle_states?data_object_id=in.(<A-masters>)&requires_permission=eq.true&select=data_object_id,state_name,domain_module_id` plus all of A's `trigger_events`.
   - B's DMDO coverage on data_objects A masters: `/domain_module_data_objects?data_object_id=in.(<A-masters>)&domain_module_id=in.(<B-modules>)&select=domain_module_id,data_object_id,role,necessity`.
   - Existing A→B handoffs: `/handoffs?source_domain_id=eq.<A-id>&target_domain_id=eq.<B-id>&select=id,trigger_event_id,data_object_id,source_domain_module_id,target_domain_module_id,trigger_events(event_name,data_object_id)`.
2. **Repeat symmetrically for B→A.**
3. **Diff in four sections** (per direction):
   - **Section 1 — Existing handoffs, fully wired.** Pass — informational sanity check only.
   - **Section 2 — Existing handoffs with NULL module FK.** Run the B10b derivation locally; if the row is now resolvable (the other side has DMDO coverage that didn't exist when the handoff was first loaded), surface as a one-row PATCH. If not resolvable, identify which side needs the upstream fix (missing DMDO row on the consumer ⇒ that side's load; missing master row on the publisher ⇒ that side's Phase-B gap).
   - **Section 3 — Missing handoffs the catalog implies should exist.** For every (publisher master state with `requires_permission=true`) × (consumer DMDO row on that master's data_object on the other side), check that a handoff row exists. Each missing combination is a candidate handoff — surface with proposed `trigger_event`, payload, and the modules it would wire to. User decides which to load.
   - **Section 4 — Boundary integrity gaps.** Any DMDO row on one side referencing a data_object the other side doesn't master (and isn't `kind='platform_builtin'`) — that's a B5 integrity failure routed back to whichever domain owes the canonical master.
   - **Section 5 — Cross-domain `data_object_relationships`.** These are the structural mirror of cross-domain handoffs: a handoff says *"event X fires from A to B"*; a relationship row says *"A's master has a verb to B's master"* (e.g. `job_offers spawns onboarding_journeys`). The relationship graph drives the mermaid renderer in blueprints and the navigation hints in the architect view — missing relationships leave both silently incomplete.
     - Query: `/data_object_relationships?and=(data_object_id.in.(<A-masters>),related_data_object_id.in.(<B-masters>))&select=data_object_id,relationship_verb,related_data_object_id,is_required,owner_side` plus the symmetric B→A direction.
     - Diff: for every cross-domain handoff with a clean payload→target mapping (handoff's `data_object_id` ≠ trigger_event's `data_object_id` — payload is on B's side, event source on A's), the catalog should carry a corresponding relationship row. If the handoff exists but the relationship row doesn't, surface as **MISSING-RELATIONSHIP**. If a relationship row exists but its mirror handoff doesn't, surface as **ORPHAN-RELATIONSHIP** (relationship without an event-driven realization — possibly intentional for derived/synthetic links, but worth flagging).
     - Fix: author the missing `data_object_relationships` row per the B6/B8 shape (verb + inverse_verb + relationship_type + relationship_kind + is_required + owner_side). Surgical CLI for ≤5; loader for more.
4. **Produce the diff**. For the auto-discovery form (per-neighbor pass inside a single-domain Validate), the per-neighbor findings append to the host domain's `audits/<DOMAIN>.md` section under "Bucket 1 — Boundary findings per neighbor". For the manual bilateral form (user names A and B directly), draft the ten-section diff in `.tmp_deploy/reconcile_<A>_<B>_<YYYY_MM_DD>.md` (working file), then on user approval **append a section to BOTH `audits/<A>.md` AND `audits/<B>.md`** — each file gets the direction it owns (A→B in A's file, B→A in B's file), plus a shared summary count. Keeps the per-domain timeline complete on both sides.
5. **Each accepted fix is loaded as a normal Phase-B / Phase-M update on the side that owes it.** Reconciliation never produces fixes for both sides simultaneously in one loader — keep the audit-trail per side clean.

**Output discipline.** Pairwise reconciliation is read-only by construction. The diff goes to a tmp file and the user approves loads one side at a time. Never bulk-patch both sides from a single reconciliation invocation — that erases the "who owes what" provenance the audit trail depends on.

**Anti-patterns.**

- ❌ Running pairwise reconciliation on every (A, B) combo "to be thorough". It's N×N and almost all pairs have zero cross-domain edges. Run only on pairs the per-domain audit explicitly surfaced.
- ❌ Loading the missing handoffs and the missing DMDO rows from the reconciliation script itself. The procedure produces a diff; loaders live on the side that owes the fix.
- ❌ Treating reconciliation as a replacement for the per-domain audit. The per-domain audit catches all 28 checks; reconciliation only walks the handoff boundary. Always audit first, then reconcile if the report-only section warrants it.

### Validate cross-domain substrate (mode b2 — catalog-wide)

> **This is mode b2** — the catalog-wide scope of Validate. See [README.md § b2](../../../README.md). Distinct from mode b1 (per-domain Validate, the 4-pass structural / market / neighbor / pairwise audit). b2 is a single read-only pass over the cross-domain slice of `handoffs` (`source_domain_id != target_domain_id`), unfiltered by source/target domain. Discover (mode c) invokes b2 as its Pass 0 pre-flight; the user can also invoke b2 directly without entering Discover.

**Triggers:** *"validate cross-domain"*, *"validate cross-domain substrate"*, *"audit catalog handoffs"*, *"is the handoff DAG clean"*, *"check every cross-domain handoff"*. Also implicit at the start of every mode c invocation (Discover Pass 0 IS b2).

**Five queries**, all read-only, run against live state:

1. **B10b — NULL `source_domain_module_id` on a cross-domain handoff whose source domain has modules.** `/handoffs?source_domain_id=neq.target_domain_id&source_domain_module_id=is.null` filtered against `/domain_modules?domain_id=in.(<source_domain_ids>)` to confirm the source domain *has* modules (so the NULL is a defect, not legitimately-NULL-by-virtue-of-the-domain-being-unmodularized).
2. **B10b — NULL `target_domain_module_id`** symmetric to #1.
3. **B9 attribution defect — `trigger_events.data_object_id` is not mastered on the source side.** The publisher of the event is not in fact the publisher; the event is mis-attributed at source.
4. **B8 reverse-direction consumer DMDO gap — handoff payload `data_object_id` is not declared on the target side** via `domain_module_data_objects` with `role IN ('consumer', 'contributor', 'embedded_master')` on any of the target domain's modules.
5. **Orphaned `trigger_events`** — a row that no handoff references AND no `data_object_lifecycle_states` row whose `permission_verb_override` matches the event's verb suffix. Possible mis-attribution or stale entry.

**Output discipline.** Read-only by construction. Defects are grouped by the domain that owes the fix; each becomes a per-domain b1 Validate input on that domain. b2 never fixes defects directly — it surfaces them.

**Where the output goes:**

- When invoked as mode b2 directly: append a dated section to [audits/_validate-cross-domain.md](../../../audits/_validate-cross-domain.md).
- When invoked as Discover Pass 0: append to [audits/_discover.md](../../../audits/_discover.md) under the *"Pass 0 — Substrate sanity"* sub-section of that run's section.

**Anti-patterns.**

- ❌ Running b2 *after* a per-domain b1 Validate to "double-check" the cross-domain edges. b1's Pass 3+4 already audits the same edges for each touched domain; b2 only adds value when run across multiple domains' worth of substrate, NOT after a single-domain pass.
- ❌ Loading fixes from b2 itself. Each defect routes to per-domain b1 on the owning domain; that's where the fix loads from.
- ❌ Marking defects "accepted as known" in `audits/_validate-cross-domain.md` without a follow-up. Track them as gap items the user has accepted, not as silently-tolerated drift. If an "accepted" defect sits across 3+ b2 runs, escalate to user: this is no longer "we'll fix soon", it's "we shouldn't be flagging".

### Fact sheets (explicit step, not part of any sequence)

Fact-sheet emission is a deliberate, user-triggered action. **Do not run it as part of any load, audit, fix-loop, or "verify and share" step.** The audit reads live state via PostgREST; the on-disk fact sheets can sit stale across many audit passes and that's the intended state.

Emit only when the user explicitly asks. Triggers: "emit the ATS blueprint", "regenerate the blueprints", "refresh `<MODULE-CODE>-semantic-blueprint.md`", "run the blueprint generator". Do not infer the user wants blueprints from phrases like "audit X" or "load Y was that successful" — confirm first.

The emitter at [scripts/emit_fact_sheet.ts](../../../scripts/emit_fact_sheet.ts) produces one kind of semantic blueprint:

- **Per-module blueprints** → `catalog/blueprints/<module-code>-semantic-blueprint.md`, one per `domain_modules` row regardless of `module_kind`. Both `module_kind='full'` and `module_kind='starter'` rows are emitted in the same flat directory. The deployable-unit view: data_objects assigned to this module, lifecycle states on this module's masters (starters render *inherited* lifecycle states from their embedded_masters' canonical-master rows, cross-referencing into the master's blueprint), the system skill + tools + Semantius coverage %, module-scoped permissions, capabilities realized, outbound / inbound handoffs, architect handoff hints.

Per-domain "starter kit" blueprints (the prior `catalog/blueprints/starter-kits/<DOMAIN-CODE>-...md` shape backed by the now-deleted `domain_starter_modules` junction) are gone (Rule #19 made starter kits first-class deployable units, so they emit as ordinary per-module blueprints). Any legacy `domain-fact-sheets/` or `catalog/blueprints/starter-kits/` directories on disk are no longer regenerated; treat them as historical.

Commands:
- `bun run scripts/emit_fact_sheet.ts --regenerate` — **the default.** Refreshes ONLY the blueprint files already on disk (`catalog/blueprints/*.md`), mapping each filename back to its module. "Regenerate" means refresh what exists; it never creates a file for a module that has no committed blueprint. This is what "regen / regenerate the blueprints / refresh the blueprints" always means.
- `bun run scripts/emit_fact_sheet.ts --regenerate --check` — CI drift check over the existing files; exits non-zero if any would change.
- `bun run scripts/emit_fact_sheet.ts --module <MODULE_CODE>` — regenerates one module's page (works for both `module_kind` values).
- `bun run scripts/emit_fact_sheet.ts --all` — **rarely what you want.** Walks EVERY `domain_modules` row and writes a blueprint for each, including modules with no committed file. Far wider and slower than `--regenerate`. Use ONLY when the user explicitly says "all" / "the entire corpus". Never reach for `--all` to "regenerate the blueprints" — that is `--regenerate`.

> ⚠️ Regenerate trap (do not repeat): a plain "regenerate the blueprints" request means `--regenerate`, NOT `--all`. Reaching for `--all` re-emits the whole catalog (many more files than the curated committed set) and is slow enough to look like a hang. Default to `--regenerate` every time; only escalate to `--all` when the user literally asks for all modules.

When the user does ask for an emit, the quality check on the output is: every `_(no … loaded)_` placeholder in the generated file is justified by (a) a genuine derive/overlay domain that masters nothing (B1 narrow exception; the module still carries `consumer`/`derived` rows), (b) a master classified as config / record / catalog / junction / computed via `entity_type` with no workflow (B12, per Rule #12), or (c) an explicit "self-explanatory masters" / "isolated master" justification recorded in the audit / gap report (B6, B11). Unjustified placeholders signal a real gap in live state — fix the gap and re-emit. Never hand-edit the rendered files to silence a placeholder.

### Cross-cutting capability convention

`capability_domains` is many-to-many — a single capability *can* belong to multiple domains, and the cube documentation explicitly anticipates this ("Customer 360 spans CRM and Data Platform; Workforce Scheduling spans HR Operations and Field Service"). In practice the catalog has drifted to ~99% single-domain capabilities because every Phase-A loader produces market-scoped capabilities with **domain-prefixed codes** (`PM-ROADMAP`, `CDP-INGEST`, `ITSM-INCIDENT`, `COMM-CART-CHECKOUT`).

The prefix is helpful for readability and prevents accidental collisions, but it locks the capability to one domain by naming — "`CDP-INGEST` also applies to MDM" reads as a contradiction. The catalog therefore systematically under-represents the cross-cutting capabilities that vendors actually compete on across multiple markets (ServiceNow Knowledge spans ITSM/CSM/HRSD; Workday Forecasting spans FP&A/Workforce-Planning; Reltio Identity Resolution spans CDP/MDM/IGA).

**Naming rule:**

- **Domain-prefixed code** (default for new market loads): use when the capability is genuinely market-specific and would not make sense in another domain (`PM-ROADMAP`, `ITSM-INCIDENT`, `CDP-IDENT-RES`).
- **Domain-neutral code** (no prefix, plural-noun-only): use when the capability genuinely spans **≥3 domains** and vendors market the same shape across those markets. Examples: `KNOWLEDGE-MGMT`, `SLA-MGMT`, `SELF-SERVICE-PORTAL`, `AI-TRIAGE-CLASSIFICATION`, `IDENTITY-RESOLUTION`, `CUSTOMER-360`, `APPROVAL-WORKFLOW`, `WORKFORCE-SCHEDULING`, `TIME-TRACKING`, `COMPLIANCE-TRAINING`.

**Decision test when authoring a capability:**

1. Can I name **three independent vendors that explicitly market this capability across at least three of the candidate domains?** If yes → domain-neutral. If no → domain-prefixed.
2. If a domain-prefixed capability later turns out to span ≥3 domains, **rename it** (update `capability_code`; capability_id stays stable, so `capability_domains` rows survive). Then add the missing `capability_domains` rows. See [scripts/loaders/load_cross_cutting_capabilities.ts](scripts/loaders/load_cross_cutting_capabilities.ts) for the loader pattern.

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

The canonical 20-function top-level spine:

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

This is the catalog's most analytically loaded workflow — the combination of `domain_data_objects` (Signal 1) and `handoffs` (Signal 2) is what drives the **platform-vs-silos** question: *which clusters of domains would benefit from running on an integrated platform versus staying as point-solution silos?* Every row you add or omit here shifts that answer. Follow these steps when a user asks "create the data objects for the X domain", "what does X master", "what handoffs does X have to Y", or anything in that shape.

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
- **Generic names invite cross-domain boundary collisions — scope-qualify at creation.** A `data_object_name` like `maintenance_work_orders` reads plausibly as REAL-EST, EAM, FLEET-MAINT, or FSM ownership. When a new master sits in a domain that overlaps several adjacent operational domains, prefix or qualify the name to its scope at insert time: `facility_work_orders` (REAL-EST), `eam_work_orders` (EAM industrial plant), `vehicle_work_orders` (FLEET-MAINT), `tenant_maintenance_requests` (RE-PROP-MGMT). Past precedent: a row originally loaded as `maintenance_work_orders` had to be renamed to `facility_work_orders` once an adjacent domain's Phase-B surfaced its own work-order need; the rename cascaded into the matching `trigger_events`. Apply the same prefix-at-creation rule to: PM schedules (`equipment_pm_schedules` vs `preventive_maintenance_schedules` vehicle-scoped), assets (`industrial_assets` vs `hardware_assets` vs `fixed_assets`), inventory (`spare_parts` vs warehouse `stock_items`). When in doubt, ask which other domain would also plausibly claim this name and prefix accordingly.

### Phase 1 — propose the domain's data objects

1. **Find the domain.** Pull `domains` by `domain_code`. Confirm it exists and check its description.
2. **Master at the sub-domain, not the umbrella, when both exist.** If the target has sub-domains in the catalog (ITAM → HAM/SAM/SMP/FINOPS; CRM → CDP/MA/SALES-ENG/CPQ/LOYALTY/B2C-COMM), data_objects master at the most-specific sub-domain that owns them. The umbrella retains only genuinely cross-cutting objects (`asset_contracts`, `asset_lifecycle_events` for ITAM-umbrella; the CRM-umbrella keeps `customers`, `contacts`, `leads`, `opportunities`, `pipeline_stages`, `sales_activities` because no sub-domain claims them). This rule was learned the hard way: `software_licenses` and `software_installations` were initially proposed at ITAM-umbrella and had to be re-homed to SAM before load.
3. **List candidate data objects.** Apply the "what does THIS domain primarily master?" test. The candidate list is what an ATS-like / CRM-like / ITSM-like vendor would build their schema around — not what the domain *touches*.
4. **Exclude foreign masters.** If a candidate is mastered by another already-loaded domain (e.g. `positions` is HCM's master, not ATS's), drop it from the primary set. Flag it for later as a *secondary*-style link once both sides are loaded; don't invent it in the wrong domain.
5. **Exclude handoff targets that belong elsewhere.** Some objects look like they belong to the domain because the domain triggers their creation — but their master lives in another domain. Onboarding Task is the canonical example: ATS triggers it via `offer.accepted`, but Onboarding (or HRSD) masters it. These become `handoffs` rows in Phase 3, not `data_objects` under the source domain.
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
- Rule #15 covers both `domain_data_objects.notes` and `domain_module_data_objects.notes` — every `notes` column is empty by default, populate only with explicit per-row user approval. The older "slice each domain owns" prose on multi-master rows was a license that has been RESCINDED. If a multi-master configuration is ambiguous in a way that the structured columns (`role`, `necessity`, the canonical-master row elsewhere) can't disambiguate, surface to the user during the load draft so they decide how to capture it (chat exchange, gap report, or — only with user-approved exact wording — a notes write).

**Look for the cluster flagship first.** Every cluster we've loaded has produced a structural multi-master flagship: `employees` (HR cluster), `configuration_items` (IT-ops cluster), `customers` (customer-facing cluster). The flagship is 3-4 canonical masters + contributors + at least one consumer + (with embedded_master modelling) several point-solution embedded_masters. The flagship anchors the rest of the load. When you start a new cluster, *expect* this pattern — find the flagship first, then everything else decomposes around it. See [references/canonical-examples.md](references/canonical-examples.md) for the full catalog of landmark rows and their slice decomposition.

If a co-master domain isn't in the catalog yet (Workforce Planning was missing when ATS shipped), add the domain via Phase 1 first, then link.

**Boundary-object pattern.** When two adjacent domains have a fuzzy cost / value / state handoff, *invent a data_object that lives at the boundary* and assign single mastery on the upstream side. `workforce_cost_projections` (SWP-mastered, EPM-consumed) is the case study: without it, the SWP↔EPM boundary is "the workforce plan somehow becomes a budget line"; with it, SWP masters the workforce-driven cost build, EPM consumes for the consolidated budget. Look for boundary-object candidates whenever a high-friction handoff exists between two domains that "should" share a concept but don't.

### Phase 3 — discover cross-domain handoffs (Signal 2)

For each data object, identify the **event-driven flows that involve this object**, both between distinct domains (the cross-domain integration pressure points an integrated platform would absorb) and between modules of the same domain (in-process lifecycle progressions and intra-domain async wiring). These are the rows in `handoffs`.

The discovery questions, in order:

1. **What state changes on the data object?** `offer.accepted`, `incident.resolved`, `requisition.approved`, `case.closed`, `task.completed`, `application.hired`. Use dotted-lowercase noun.verb naming. These are the candidate `trigger_event` values.
2. **For each state change, which domain or module reacts?** The reactor is the `target_domain` (and ideally `target_domain_module_id`). Intra-domain handoffs are first-class catalog rows; the `cross_domain_only` validation rule is gone. When the reactor is the same domain (`incident.created` → `change.requested` both in ITSM, or any cross-module flow within one domain), record the row and classify with `integration_pattern: lifecycle_progression` when no message moves (in-process FK + state transition), otherwise pick from the existing five values per the friction the integration involves. The Signal-2 cross-domain filter is applied at the query layer (`source_domain_id != target_domain_id`), not at insert time.
3. **What's the integration_pattern today?** `event_stream` (Kafka/EventBridge/etc.), `api_call` (direct webhook/REST), `batch_sync` (nightly ETL), `manual_handoff` (someone copies a value), `file_drop` (CSV exchange), `lifecycle_progression` (in-process state transition; the consumer reads producer state directly, no message moves; the canonical pick for intra-domain cross-module rows). When unknown for an out-of-process handoff, default to `api_call` and surface the uncertainty to the user; do NOT auto-populate `notes` (Rule #15).
4. **What's the friction_level today?** `high` if the handoff regularly breaks, requires custom maintenance, or has measurable error rate. `medium` for stable but bespoke integrations. `low` for native event streams within a shared platform. Friction is the cost an integrated platform would eliminate — it's the value-quantification column.
5. **Describe what actually happens.** The `description` column should name the payload, the downstream consequences, and known failure modes. "Offer accepted in ATS triggers a workflow in Onboarding that generates a task list per template; failure modes: late-bound position changes invalidate the template selection."

**Fan-out is normal — don't collapse it.** One trigger event often hits multiple target domains simultaneously. `employee.created` fires from HCM to Onboarding, Payroll, IGA, and Talent-Mgmt as four separate handoff rows sharing one trigger; `offer.accepted` similarly fans ATS → Onboarding plus implicit feeds to HCM and Payroll. Each fan-out arm is its own row by design — they have different integration patterns, friction levels, and failure modes. Don't try to merge them into a single record.

**Task fan-out (templated workflow) is a distinct shape from event fan-out.** When `HCM.employee.terminated` produces a fan-out of offboarding-task tickets in ITSM (workspace cleanup, mail-forwarding, equipment return, exit interview), each downstream ticket is per a template, not per a subscriber domain. The handoff is recorded once (HCM→ITSM on `employee.terminated`) but the downstream effect is N tickets correlated by the termination event. Don't model each template as its own `handoffs` row — that explodes the count and dilutes the signal. The same pattern shows up on ATS `offer.accepted` → Onboarding (N template tasks per role) and FSM `work_order.dispatched` → ITAM (N inventory updates per part used).

**Master-bearing vs derive/overlay domains.** Some domains read mostly from upstream and feel "analytical", but that feeling is NOT a reason to file them as zero-master. Apply this test per domain:

- **The overlay test:** *Does this domain persist any record that no other domain canonically masters?* If yes → it is **master-bearing**: author those masters in Phase B, give it modules and a system skill like any other domain. If it persists nothing and recomputes its entire output at query time from other domains' masters → it is a **genuine derive/overlay domain**.
- A derive/overlay domain still ships a **non-empty** module: `consumer` / `embedded_master` rows for what it reads, `derived` rows for the signals it republishes. Its events fire on the upstream data_objects (the handoff's `data_object_id` is the payload, not an ownership claim). Don't scaffold *synthetic* masters to "give it ownership" — but do author *real* masters when the records are real.
- **The tells of a master-bearing domain:** a high `crud_percentage` (a forms-and-records market by definition), and a vendor surface where flagship products persist the entity as a first-class, historized record (Gong deal scores, Clari forecasts, Xactly quotas, OneTrust DSARs, Tenable vulnerabilities, partner deal registrations, account plans). Computed records (`entity_type='computed'`) are still *mastered* by the domain that produces them — "derived from upstream" ≠ "owned by upstream".
- There is **no fixed list** of zero-master domains. The genuinely-overlay case is rare (a pure umbrella that consumes from its own sub-domains, e.g. a security-operations umbrella over SOAR / VULN-MGMT / THREAT-INTEL). A domain stub with capabilities and handoffs but zero data_objects of any role is **unbuilt**, not overlay-by-design — run Phase B.

**Trigger-event ownership: "one event, many subscribers".** All fan-out rows for a single event reference the **same** `trigger_events.id` via `handoffs.trigger_event_id`. Event semantics (publisher, data object, state transition, description) live in one `trigger_events` row; per-edge integration metadata lives on each handoff row. Never duplicate `trigger_events` rows per subscriber, it breaks the trigger-event-prefix clustering signal that Phase D depends on. Full rationale in [Phase D — Process-skill discovery](#phase-d--process-skill-discovery-substrate-level).

**Recognize the high-friction patterns.** Across the catalog's loaded handoffs, the consistent `friction_level: high` cases cluster into seven recognisable shapes:
- **Identity reconciliation across systems** — HCM→IGA, SMP→IGA, CDP→SALES-ENG, CCAAS→CRM: same logical person/customer, different identifier spaces, no canonical resolver. Note: identifier reconciliation is also frequent across loyalty/CRM (loyalty_member_id vs customer_id) and across partner/CRM (partner_id vs account_owner_id)
- **Leaver / cancellation recall** — HCM→ITAM asset recall on termination, CSM→SUB-MGMT churn-risk feedback, FSM→CSM dispatch.failed, LOYALTY tier-rollback-on-churn: the "going away" event is harder to catch than the "arriving" event; the going-away signal often arrives via a different channel than the original arrival
- **Probabilistic signal becomes deterministic action** — CDP→SALES-ENG intent signal, AIOPS→ITSM correlation, SUP-LIFE→GRC risk-score elevation, CCAAS→CSM sentiment.negative, REV-INTEL→CRM deal_risk.escalated: the upstream is a scored guess, the downstream needs a yes/no. AI/ML scoring is the typical source; false-positive volume is the typical failure mode
- **Shadow-data emerges from off-channel transactions** — EXPENSE→SMP shadow-IT detection, B2C-COMM→SUB-MGMT direct-purchase: the official catalog finds out from a side channel
- **Cross-vendor stack with same logical entity** — OBS→ITSM SLO breach when SLO and incident tools are different vendors; COMP-MGMT→PAYROLL merit-cycle propagation when comp planning and payroll execution live in different vendors; SUP-LIFE→ERP-FIN supplier onboarding when supplier-master and AP live in different vendors
- **Period/cycle-close coupling** — ERP-FIN.accounting_period.closed → EPM consolidation; COMP-MGMT.merit_cycle.approved → PAYROLL execution; pay_cycle.closed → multiple subscribers. Tight timing coupling: downstream must complete within a fixed window or the next cycle fails; backdated entries arriving after period close cascade across systems. Distinct from cross-vendor-stack: friction here comes from calendar coordination, not identifier reconciliation
- **Alert/escalation without feedback loop** — AP-AUTO→ERP-FIN payment.exception, SUB-MGMT→CSM dunning.escalation, EXPENSE→HR-cases policy violation, FINOPS→S2P cloud_spend.threshold_breached: source publishes the alert expecting the target to act, but no acknowledgment, no retry policy, no completion signal back to source. Silently fails when the alert is missed or misrouted; manual follow-up is the canonical workaround

When a new handoff matches one of these shapes, default `friction_level` to `high`. **Multi-shape handoffs** (a single edge that matches 2+ shapes) are reliably the highest-friction integration points in the catalog — the COMP-MGMT→PAYROLL handoff matches both cross-vendor-stack AND period-cycle-close, for example, and is a textbook source of retro-adjustment work.

### Phase 4 — score and surface

After loading any meaningful chunk of `handoffs`, the platform-candidacy view falls out:

- **Signal 1 — Per data_object (canonical multi-master):** `count(role='master' AND necessity='required')`. High count = same logical record has multiple canonical owners across the catalog; integration platform absorbs the reconciliation. Canonical example: `employees` (HCM + Payroll + IGA all master required slices).
- **Signal 1b — Per data_object (embedded-master footprint):** `count(role='embedded_master' AND necessity='required')`. High count = many point-solution domains would *also* hold this record locally if deployed standalone. Distinct from Signal 1 — captures silos that *would* exist in a point-solution world, not just the canonical authority split. `cost_centers`, `customers`, `positions`, `products`, `departments` are the prototypes.
- **Integration-burden score per data_object:** `count(role IN ('master', 'embedded_master') AND necessity='required') + count(handoffs)`. Signal 1 + Signal 1b (the structural half) plus Signal 2 (the operational half — wires already firing between systems).
- **Signal 3 — Per (domain_a, domain_b) pair:** `count(handoffs WHERE {source,target} = {a,b})` is the bilateral integration weight. High weight = these two domains are effectively one platform's problem already.

`necessity='optional'` rows are deliberately excluded from the burden score — they represent convenience modelling, not load-bearing ownership. They surface separately as the "extended footprint" view (which point solutions *can* hold this record, even if many don't bother).

All queries are one-line cube DSL once the data is in — surface them to the user along with the UI links after each load.

### Anti-patterns specific to this workflow

- ❌ Putting `Onboarding Task` (or any other handoff target) under the *trigger* domain's data_objects. It belongs to the *master* domain; the relationship is a `handoffs` row, not a `domain_data_objects` row.
- ✅ Intra-domain events are now first-class catalog rows in `handoffs`. Capture cross-module flows within one domain (typically with `integration_pattern: lifecycle_progression`) so module-level deployment manifests can read them. The cross-domain platform-vs-silos signal (Signal 2) is computed at query time by filtering `source_domain_id != target_domain_id`; intra-domain rows do not pollute that signal because they are excluded by the filter, not by an insert-time rule.
- ❌ Auto-populating `domain_data_objects.notes` (or any other `notes` column) — Rule #15. Notes default to empty. If a multi-master slice or demotion path is ambiguous, surface to the user during the load draft; never auto-write prose.
- ❌ Inventing a co-master domain in the catalog just to make a multi-master row work. Apply the point-solution-market test first; if Workforce Planning genuinely passes (it does), add the domain. If it doesn't, the data_object probably belongs to one master, not two.
- ❌ Naming `data_object_name` in human form (`Job Requisition`, `Background Check`). That's `singular_label` (and `plural_label`)'s job. The natural key is snake_case_plural.
- ❌ Defaulting every `domain_data_objects` row to `necessity='required'` without thinking. The default is a *fail-safe*, not the right answer. Convenience fields a point-solution may or may not model (cost_centers on ATS, departments on LMS, salary_bands on most non-HR domains) belong on `optional` rows. Required vs optional is the second classification axis, not a checkbox.
- ❌ Using `master` when the domain only holds a local copy that defers to a canonical owner. ATS does not `master` cost_centers — it `embedded_master`s them. The distinction drives Signal 1 vs Signal 1b separation; conflating them inflates the canonical multi-master count with point-solution noise.
- ❌ Using `embedded_master` when the domain is genuinely the canonical authority. HCM `master`s `employees` (canonical) even though it is a point solution — because no other catalog domain has a stronger ownership claim. The test: in a fully-integrated reference deployment, who does *every* other domain defer to for this record? That domain is `master`; everyone else who holds it locally is `embedded_master`.
- ❌ Modelling holistic-deployment-only consumer rows when an embedded_master row already captures the same dependency. ATS↔positions is `embedded_master + required`, not a separate `consumer + required` row — the runtime demotion handles the holistic case from the single embedded_master row. Don't double-count.
- ❌ Counting `embedded_master + optional` rows toward Signal 1. The Phase-4 formula explicitly excludes them via `necessity='required'`. Optional rows appear in the separate "extended footprint" view.
- ❌ Creating two rows on the same `(domain_id, data_object_id)` pair to capture two roles (e.g. `embedded_master` + `derived` for the same domain × data_object). The schema doesn't enforce a unique constraint here, but duplicates are consistently misclassification. **Convention: one row per pair.** Pick the dominant role and capture the secondary slice in `notes` (e.g. "IDP embedded_masters documents and additionally derives extracted_fields signals against them"). The 3 existing duplicates on DCG×{data_products, metric_definitions, ontologies} are cleanup targets — they had a contributor row authored before the canonical master row landed on the same pair, and never got reconciled.

---

## Phase D — Process-skill discovery (Discover mode mechanics)

Phase D answers *"which clusters of cross-domain handoffs are coherent business processes that an agent skill could orchestrate?"* It is the payoff of Phase B — once enough domains have shipped `handoffs`, the substrate supports a deterministic discovery query that ranks process-skill candidates. The discovery query operates on the cross-domain slice of `handoffs` (`source_domain_id != target_domain_id`); intra-domain rows live in the same table but are excluded by the Signal-2 filter at query time.

**Phase D is the engine inside Discover mode** (README mode c). Discover wraps Phase D with four additional passes: a cross-domain handoff substrate sanity pre-flight (Pass 0 = mode b2), a `PCF_OVERRIDES` drift audit (Pass 1), a coverage gap audit comparing authored vs discovered `handoff_processes` (Pass 1.5), the substring discovery persistence pass that fills only the untagged gaps (Pass 2 — narrowed scope from the historical "tag everything" behavior), and a review queue + process-skill authoring (Pass 3). Full mode mechanics: [references/discover-cross-domain-processes.md](references/discover-cross-domain-processes.md).

**Phase D is not per-market.** It runs **once across the catalog** when Phase B is broadly complete (or per-cluster once that cluster's handoffs are loaded), and is re-runnable on demand. Don't run it after every market load — that's wasted work.

**Layered APQC ownership.** Both Research Phase B (handoff load time) AND Validate b1 (audit fix-loop, APQC TAGGING finding type) write `handoff_processes` rows with `proposal_source='agent_curated'` when the analyst knows the implementing PCF activity. These are the primary capture surfaces. Discover Pass 2's substring matcher fills the gaps left untagged — it runs ONLY against handoffs with no existing `handoff_processes` row. Human-curated rows are never overwritten. The substring matcher is a backstop, not the primary source. See [references/domain-audit-procedure.md](references/domain-audit-procedure.md) § APQC TAGGING for the b1 procedure and volume expectation (0.5N to 0.8N tags per N cross-domain handoffs).

**Pass 0 dependency on Validate.** Phase D inputs come from cross-domain handoffs that Validate's per-domain Pass 4 (pairwise reconciliation) has verified. Running Phase D against handoffs with NULL module FKs, missing consumer DMDOs, or orphaned trigger_events produces clusters built on broken edges. Discover's Pass 0 catalog-wide sanity gate is the explicit hand-off: pairwise validation runs per-domain in Validate, Phase D rolls up the same checks catalog-wide as the entry gate to the mode.

**Rule #1 has no exceptions across Phase D.** Every `handoff_processes` row the agent writes, whether human-curated at Phase B / Validate-b1 time or substring-inferred by Discover Pass 2, ships as `record_status='new'`. Provenance flags confidence but does not bypass review. Discover Pass 3 reviews both human-curated-pending and discovered-pending rows in the same batch, with provenance surfaced so the user can weight human-curated rows higher.

### Inputs Phase D depends on

| Entity | Why |
|---|---|
| `processes` | Reference catalog of named industry-standard processes (APQC PCF) that discovery maps clustered handoffs against. See [Process framework — APQC PCF](#process-framework--apqc-pcf) below. |
| `trigger_events` | Controlled vocabulary on `handoffs.trigger_event_id`. The trigger-event prefix is the primary clustering signal — `offer.*`, `employee.*`, `incident.*`. |
| `handoffs` | Phase-B substrate. Discovery operates on the cross-domain slice of the handoff DAG (`source_domain_id != target_domain_id`). |

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
bun run scripts/analytics/discovery_query.ts --top 25       # ranked candidate table
bun run scripts/analytics/discovery_query.ts --bucket employee   # drill-down on one bucket
```

Full doc + interpretation guide: [references/discovery-query.md](references/discovery-query.md). The query implements signal #1 (trigger-event prefix) as the bucketing rule; signals #2-5 are scored as metrics within each bucket but don't subdivide it further in v1.

### How to interpret discovery output

The query prints one row per prefix bucket with `rank_score = friction_score × distinct_function_count`. A high rank means **wide function spread + high integration friction** — the orchestrations where an agent skill removes the most coordination overhead.

Two worked examples:

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

When a single trigger fires from one domain to multiple targets (e.g. `employee.created` → Onboarding + Payroll + IGA + Talent-Mgmt), **all four subscriber rows in `handoffs` reference the SAME `trigger_events.id`.** Event semantics (publisher, data object, state transition, description) live in **one** `trigger_events` row. Integration metadata (`friction_level`, `integration_pattern`, `notes`) lives on the **per-edge** handoff row.

This is the standard pub/sub model and the only shape that keeps the trigger-event-prefix clustering signal (signal #1 above) clean for discovery. Never create separate `trigger_events` rows per subscriber.

---

## Classification heuristics

Beyond the point-solution-market test, these heuristics resolve the ambiguous cases that came up most often:

- **Umbrella vs sub-domain.** Both can be valid simultaneously. ITAM is an umbrella with its own market (Flexera One, Ivanti Neurons for ITAM). HAM, SAM, FinOps, EAM are sub-domains, each with their own point-solution markets. Model both levels via `parent_domain_id` — but only when both levels have independent vendor competition. AIOps as a sub-domain of ITOM is borderline; left top-level because the vendor list (BigPanda, Moogsoft, Dynatrace Davis) is distinct enough.

- **Vendor identity after acquisitions.** Use the *current legal owner* in `vendors.vendor_name`. The predecessor MAY be mentioned in `description` (which is the row's content column, not a notes column). Do **not** auto-write to `notes` per Rule #15; surface the rename to the user and let them decide the wording for either `description` or `notes`. Examples to remember: LeanIX → SAP SE, ServiceMax → PTC, MuleSoft → Salesforce Inc, Lightstep → ServiceNow Inc, Apptio → IBM, Plex → Rockwell Automation, CloudHealth → Broadcom, Reflexis → Zebra Technologies, Sapling → Kallidus, Blue Prism → SS&C, Signavio → SAP SE, Splunk → Cisco (the vendor is still Splunk; Cisco is the parent).

- **Product re-brands.** A renamed product gets a single solution row under its current name; the old name MAY go in `description` (subject to Rule #18's vendor-name carve-out for commerce-shaped entities, which `solutions` is). The old name does NOT belong in `notes` without user-approved wording per Rule #15. Don't double-row: ServiceNow GRC and ServiceNow IRM are the same product, model once as IRM.

- **Same product, multiple domains.** A solution can legitimately cover many domains — one solution row, multiple `solution_domains` rows with the right `coverage_level`. ServiceNow IRM has `primary` on GRC and `secondary` on AUDIT, BCM, OP-RES, TPRM, PRIV-MGMT, ESG.

- **Platform vs product granularity.** The schema has no `parent_solution_id` column, so don't try to model an umbrella platform *plus* every sub-product. Pick one level. For ServiceNow we picked per-product (40-ish rows); for competitors we picked their flagship per domain. Don't mix levels arbitrarily — pick a rule per vendor.

- **Capabilities vs sub-domains.** When a concept fails the domain test, decide between modelling it as a sub-domain (rare) or as a capability (common). A capability is something an org *can do* expressed as a noun (Lead Management, Vulnerability Scanning, Automated Invoice Matching). It is independent of which solution delivers it.

- **Custom processes use the `CUSTOM-<CLUSTER>-<SHORT-NAME>` prefix.** Any `processes` row with `source_framework='custom'` (i.e. not an APQC PCF import) must use this convention — `CUSTOM-ONBOARD-DAY-1`, `CUSTOM-HR-OFFBOARDING-EXIT-INTERVIEW`. The prefix keeps custom rows trivially filterable. Full convention in [Phase D — Custom-process naming convention](#custom-process-naming-convention).

- **`solution_kind` — classify only when a solution actually sources tools.** The enum on `solutions` has four values; the default `standard_solution` is the right answer for the vast majority of rows. Only promote to a non-default value when at least one `tool_solutions` row points at the solution. When-to-set guidance:

  | Value | When to set | Examples |
  |---|---|---|
  | `external_connector` | Solution is a **system of record OR an external data source** the agent reads from / writes to via API. Pairs with `tools` whose `operation_kind ∈ {query, mutate}` (Semantius-mastered, `data_object_id` set) OR `operation_kind = fetch` (external data, no Semantius schema, `data_object_id` NULL — e.g. Booking.com search, Amadeus, market-data feeds) | Salesforce CRM, SAP S/4HANA, Oracle NetSuite, Workday HCM, ServiceNow ITSM, HubSpot, Booking.com Partner API, Amadeus, Plaid |
  | `action` | Solution provides a **side-effect** (does something in the world; returns ack-not-data). Pairs with `tools` whose `operation_kind='side_effect'` | Microsoft 365 (email/calendar), Google Workspace, Slack, Twilio, DocuSign, Stripe |
  | `compute_service` | Solution provides **compute / AI / web automation** (pure transformation; no business-state ownership). Pairs with `tools` whose `operation_kind='compute'` | OpenAI Platform, Anthropic API, Playwright, AWS Bedrock, ElevenLabs |
  | `standard_solution` | **Default.** The solution is in the catalog as a market entrant / vendor offering, but it has not (yet) been wired up as a tool source for any skill | Most of the ~600 solutions in the catalog |

  **Semantius is NOT in the enum.** Semantius's own coverage is read from `tools.coverage_tier` directly — never from a `tool_solutions` row pointing at a `semantius_native` solution (that value was deliberately dropped). If you find yourself wanting to model "this tool is also delivered by Semantius", stop: that's already encoded by `tools.coverage_tier='platform'`.

  **Promotion is one-way and driven by usage.** Only promote a `standard_solution` row to a non-default `solution_kind` when you're about to insert at least one `tool_solutions` row referencing it. Don't pre-classify "this looks like an action vendor" speculatively — empty `tool_solutions` rows behind a non-default `solution_kind` create a misleading rollup.

---

## System-skill tool derivation

### Session bootstrap — always verify catalog state first

When you start a session that involves drafting / loading `skills` or `skill_tools`, the **first action** is to verify live counts. The catalog is multi-session and **users add domains between sessions** — assume the row counts you remembered from a prior conversation are wrong.

### Subagent prompt discipline for Phase-B research

If you spawn `Explore`-type subagents to research Phase-B for multiple domains in parallel, prompt construction directly determines loader-usability of the output:

- **Demand a structured table** of `data_object_name | singular_label | plural_label | description` and **require** snake_case_plural names. Open-ended "produce a Phase-B draft" prompts produce essays with embedded prose tables that need manual parsing.
- **Forbid MCP tools explicitly** — include in every subagent prompt: *"Do NOT call any `mcp__claude_ai_deno__*`, `mcp__claude_ai_tests-ops__*`, or other `mcp__*` Semantius tool. Use the `semantius` CLI via Bash only (rule #0)."* Subagents inherit access to MCP servers and reach for them out of habit; rule #0 in this SKILL.md is not enough — it must be restated in the prompt. Subagents have been observed silently using MCP reads despite prompts citing CLI-only patterns, producing outputs sourced from the wrong tenant or from MCP-cached resources rather than the live `tests` org.
- **Make trigger_events + handoffs OPTIONAL, not required.** Empirically, agents inconsistently produce them in parseable form (some use plain markdown tables, some YAML frontmatter, some prose). Masters alone are sufficient for Phase-B Lite (data_objects + master `domain_data_objects` only); trigger_events + handoffs can be a separate focused pass.
- **State boundary alerts explicitly in the prompt** ("don't propose X, it's mastered by Y; use Z naming instead"). Without this, agents re-propose entities that already exist or use colliding names.
- **Tell agents to defer to the user when boundaries are unresolved.** Better to get a "needs decision" flag than wrong-mastered rows.
- **Cap word count aggressively** (≤1000 words). Verbose drafts hide the load-ready content under analysis.
- **Use `general-purpose` (not `Explore`) when the subagent must write files.** The `Explore` subagent type lacks the `Write` tool — it can read state and reason, but cannot persist JSON/markdown to disk. Reserve `Explore` for read-only research questions whose result fits in a 250-word reply summary.
- **Cap cluster size to ~10 domains per agent.** Agents lose the plot at roughly the 12-domain mark — large clusters hang or produce partial output. Split into halves when in doubt.
- **For file outputs, dictate the exact path in the prompt** (`Write the JSON to .tmp_deploy/<name>.json`). Agents that "remember" the path often emit it in the reply or write to an arbitrary location.
- **Demand Phase 0 vendor surface enumeration before any Phase B drafting.** When delegating Phase B research, the prompt MUST either (a) include the loaded Phase 0 surface matrix from `.tmp_deploy/<DOMAIN>-phase0-<date>.md`, OR (b) instruct the subagent to run Phase 0 first and produce the matrix before drafting masters. Empirically, subagents asked open-endedly "what does this domain master?" ship the headline noun and miss the workflow substrate; subagents handed (or producing) a vendor surface matrix produce coherent module-shaped loads. Closing the headline-noun-only failure mode is precisely the reason Phase 0 exists. See [references/vendor-research-protocol.md](references/vendor-research-protocol.md).

Observed anti-patterns in subagent output (one bad shape each):
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
3. **The domain's outbound `handoffs`** — when a handoff says "this domain triggers an event that creates a record in another domain", the system skill needs the mutate tool on the receiving side. Canonical examples: CMDB → ITSM `create_incident` for `ci.unauthorized_change_detected`; SWP → ATS `create_candidate` for `headcount.approved`; AUDIT → GRC `close_follow_up_action` for finding-closure cascades. These are `required`.

### The 100%-Semantius hypothesis test

For each system skill the killer-hypothesis rollup is: `% = (required tools with coverage_tier='platform') / (total required tools)`. **100% means every workflow primitive the skill needs is delivered by the platform OOTB — no external connector required.**

Empirical result across 12 candidate domains:

| Tranche | 100% Semantius? |
|---|---|
| **Pure governance / register / lifecycle** — GRC (16/16), AUDIT (17/17), DCG (15/15), DQ (10/10), MDM (11/11) | ✅ 100% |
| **Pure planning / portfolio / catalog** — APM (9/9), SPM (17/17), SWP (13/13), EPM (8/8), ESG (15/15) | ✅ 100% |
| **Pure operational substrate** — CMDB (7/7) | ✅ 100% |
| **Analytics + comms** — PA (12/14) | ❌ 86% — `generate_text` (compute, attrition narratives) and `send_email` (side_effect, engagement-survey distribution) are non-negotiable for PA's core workflow |

The reliable predictor of *not* being 100% Semantius: the domain's core workflow involves **(a)** generating narrative/explanation text the user reads, **(b)** distributing artefacts to recipients via external channels (email, SMS, mailers), or **(c)** running ML/statistical scoring beyond what computed_fields express. PA hits (a) + (b). When you encounter a system-skill draft that looks like it needs LLM generation or external comms in the *required* set, that's the signal to expect a sub-100% result — and the signal that the domain genuinely benefits from non-Semantius tool delivery.

### Cross-tranche external-tool patterns

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

The highest non-100% are **LMS and B2C-COMM, both at 91%** — each with only two non-covered tools (LMS: `send_email`; B2C-COMM: `send_email` + `execute_payment`). When Semantius ships native email (= `notify_person` flips to `coverage_tier='platform'` once both the `crud` MCP server AND the `semantius` CLI carry the dispatcher), LMS flips to 100% via a single UPDATE, and B2C-COMM moves to ~95%. These are the "almost-Semantius" canaries — watch for them when scanning for skills near the 100% boundary.

### When a domain has no system skill

A domain has no system skill ONLY when it is a genuine derive/overlay domain (per § "Master-bearing vs derive/overlay domains") that masters nothing AND has no actionable consumed/derived surface to operate on. This is rare. Most analytical-feeling domains are master-bearing and DO get a system skill once their masters are loaded.

**There is no fixed "leadership-tier" list of skill-less domains.** The earlier version of this rule named 16 "verified zero-master" domains (REV-INTEL, SALES-PERF, GTM-PLAN, ACCT-PLAN, PRM, OP-RES, BCM, SECOPS, SOAR, THREAT-INTEL, TPRM, VULN-MGMT, PRIV-MGMT, FINOPS, INTRANET, COLLAB-GOV) and told you to NOT scaffold Phase-B for them. That was wrong: ~14 of those persist real records by their own descriptions and `crud_percentage` (e.g. partner deal registrations, vulnerabilities, DSARs, quotas, account plans, deal scores, forecasts) and are simply unbuilt. Do NOT treat a domain as skill-less because it appears on an old list. Apply the overlay test instead. EPM is the canonical illustration: it reads ERP-FIN journal entries and SWP cost projections but **masters** `financial_plans` / `budgets` / `forecasts` / `variance_analyses` / `financial_scenarios`, so it is master-bearing and gets a system skill.

Quick check before drafting any system skill: `semantius call crud postgrestRequest '{"method":"GET","path":"/domain_data_objects?domain_id=eq.<id>&role=eq.master"}'`. Zero masters means one of two things, and you must decide which via the overlay test: (a) the domain is a genuine overlay (masters nothing, recomputes at query time) — skip the system skill but still author its `consumer`/`derived` footprint and module; or (b) the domain is master-bearing but **unbuilt** — that's a Phase-B gap; run Phase B and author the masters, then draft the skill. Don't paper over a Phase-B gap by inventing skill_tools that reference data_objects from other domains — that produces a skill whose entire required-tool set is consumer-reads, which is not a system skill.

### Anti-patterns specific to system-skill derivation

- ❌ Marking every `tool_solutions` candidate as `required`. If something is "nice to have but the workflow proceeds without it", it's `optional`. Inflating `required` breaks the hypothesis test by hiding real coverage gaps.
- ❌ Adding tools for every `consumer` data_object the catalog records. Many consumer relationships are analytical (dashboards roll up) and don't drive the core operational workflow. Only required when the workflow can't proceed without the read.
- ❌ Creating a generic `mutate_<data_object>` tool for every master. The existing convention is verb-driven (`update_budget`, `create_audit_finding`, `approve_headcount_plan`). Generic `mutate_*` names are not searchable and lose the workflow semantics.
- ❌ Using `vendors` as a `data_object_id` target for query tools. `vendors` is the catalog's vendor reference table (legal entities); it is **not** a Semantius data_object. Read vendor-shaped records via `query_suppliers` (the `suppliers` data_object).
- ❌ Re-creating query tools that already exist. Always read `/tools` and dedupe by `tool_name` before drafting. Past loads have surfaced multiple duplicates (`query_employees`, `query_journal_entries`, `query_suppliers`) that the dedup pre-check catches.
- ❌ Drafting a system skill for a domain with zero masters. The skill would have nothing to query/mutate, which means either (a) the domain is a genuine derive/overlay that masters nothing and has no actionable consumed/derived surface (rare — apply the overlay test), or (b) Phase-B is incomplete and needs backfilling first (the common case). **Don't paper over a Phase-B gap by inventing skill_tools that reference data_objects from other domains** — that produces a skill whose entire required-tool set is consumer-reads, which is not a system skill.
- ❌ Stamping `record_status='approved'` on freshly-loaded skills/tools/skill_tools without an explicit user review pass. Rule #1 applies to these entities the same as to any other catalog row.

---

## Process-skill tool derivation

Process skills (`skill_type='process'`) span multiple domains and orchestrate cross-domain workflows. Tool requirements derive from the candidate's involved domains, not from a single domain's masters:

1. **Identify the cluster's domains** from the Phase D discovery query output ([references/discovery-query.md](references/discovery-query.md)). Each candidate bucket lists its source + target domains (via the underlying `handoffs` rows). Decompose into two sets:
   - `query_domains` — domains the process reads from (every domain in the bucket, source or target).
   - `mutate_domains` — domains the process writes to (target domains of write-shaped handoffs; source domains for rollback/correction handoffs).
   Surface the two sets to the user before drafting tools; they're the editorial input that determines the skill's surface.
2. **Auto-derive query tools** — every master `data_object` across `query_domains` contributes its existing `query_<master>` tool as REQUIRED. The catalog already has these from the system-skill derivation pass; no new query tools needed. Dedupe by `tool_name`.
3. **Auto-derive mutate tools** — for each `mutate_domain`, link any existing `update_<master>` / `create_<master>` / verb-driven mutate tool as REQUIRED. Mutates are sparser than queries — skip the master if no mutate exists yet (don't auto-generate generic ones).
4. **Add cross-cutting externals** — apply the recurring patterns from [§ Cross-tranche external-tool patterns](#cross-tranche-external-tool-patterns). Email + sign_document + chat are the most common; if the process involves customer-facing comms or contract execution, add the relevant external tool as REQUIRED.
5. **Apply the coverage rollup** ([references/semantius-coverage-rollup.md](references/semantius-coverage-rollup.md)) — process skills sit at 92-97% by design (every workflow needs at least `send_email`). 100% is rare and usually means the skill is mis-modeled as a process skill when it's actually a system skill.

Reference loader: [scripts/loaders/load_p25b_process_skills.ts](../../../scripts/loaders/load_p25b_process_skills.ts). It reads the involved-domain sets from a hard-coded map (one entry per process skill), pulls live master sets, links tools idempotently.

---

## Anti-patterns

- ❌ Marking AI-researched rows as `approved` because they "look right". See rule #1.
- ❌ Adding a solution row for every sub-module of a vendor's platform when the vendor already has a flagship row. Inflates counts, fragments coverage, loses the comparison.
- ❌ Importing ServiceNow's marketing taxonomy verbatim as domains. Run each entry through the point-solution test first.
- ❌ Loading rows without first reading the existing catalog. Produces duplicates with inconsistent capitalisation that are painful to clean up.
- ❌ Putting qualifiers (coverage level, ownership, applicability) on the core entity instead of the junction. See rule #3.
- ❌ Writing one-off CLI calls for more than ~5 rows. Extend [scripts/loaders/load_research.ts](scripts/loaders/load_research.ts) instead — it's why the script exists.
- ❌ Loading a new market with `domains` + `vendors` + `solutions` + `solution_domains` and stopping there. Capabilities (+ `capability_domains`) are part of the Phase-A load shape, not an optional follow-up. See workflow step 5.
- ❌ Stopping after Phase A (market shape) and not running Phase B (data-object footprint — data_objects, domain_data_objects, handoffs). A market without its mastered/contributed data objects and its outbound handoffs contributes zero to Signal 1 and Signal 2, which is what the catalog exists to support. See workflow step 5.
- ❌ Stopping after Phase A+B and not running Phase C (business_function_domains, optionally business_function_capabilities). A market without functional ownership contributes zero to the buyer-persona / RACI axis (Signal 3). The function-axis spine is small, but the per-domain links are part of every market load.
- ❌ Skipping Phase M (modules) on a new domain load. Every domain has ≥1 module per Rule #14 — no exceptions. A domain row without modules is non-deployable; it's a market-research stub, not a working catalog entry.
- ❌ Loading a multi-module domain (≥3 capabilities) without Phase E. A domain with modules but no personas is half-loaded: the deployer can install the modules but can't provision the users or their responsibilities. Run E1-E6 before declaring the load done. See the E section of the completeness checklist.
- ❌ Authoring a persona (`domain_roles`) with `role_modules` on only 1 module. Single-module personas are a permission tier on that module, not a persona. The 2-module floor (E2) is the structural justification for a row existing in `domain_roles` at all.
- ❌ Domain-prefixing role codes (`ATS-RECRUITER`, `ITSM-AGENT`). Roles are function-scoped, not domain-scoped — a Recruiter belongs to Recruiting, not to ATS. Use `<FUNCTION-CODE>-<ROLE-NAME>` (`RECRUITING-RECRUITER`) or, for cross-functional roles, drop the prefix entirely (`HIRING-MANAGER`).
- ❌ Trying to author a stored permission bundle for a persona. There is no `role_permissions` for `domain_roles` (Plan 3): the bundle is DERIVED by the emitter (§9) from `role_modules` reach + `process_raci` responsibility + the entity-type tier policy. Author reach + RACI, never a permission list. To give a persona a specific gate (e.g. offer approval), add the `process_raci` Responsible row for that process and wire the gate's lifecycle `process_id`; the emitter grants it.
- ❌ Treating [Phase D](#phase-d--process-skill-discovery-substrate-level) as a fourth per-market load step. Phase D is a **substrate-level analytic** that runs across the catalog once Phase B is broadly complete. Running it after every single market load is wasted work; skipping it entirely once enough clusters have shipped Phase B is the actual failure mode.
- ❌ Creating one `trigger_events` row per subscriber when a single event fans out. All subscribers of `employee.created` share **one** `trigger_events.id`; only the handoff rows differ. Duplicating events per subscriber breaks Phase D's primary clustering signal.
- ❌ Treating `handoffs.data_object_id` as the publisher's data_object. It's the **per-edge payload** — the artifact in flight on that specific handoff. The publisher's data_object lives on `trigger_events.data_object_id` and is shared across every subscriber of the event. These two columns ARE allowed to differ (HCM publishes `employee.created` on `employees`; the HCM→Onboarding handoff carries `onboarding_journeys` as the payload). Reviewers regularly conflate them when reading a handoff row in isolation.
- ❌ Scaffolding *synthetic* `data_objects` for a genuine derive/overlay domain just so it "owns something". A true overlay reads upstream and republishes derived signals; the handoff's `data_object_id` references the upstream cluster's data_object directly, and inventing fake masters creates dead rows nothing references. **But the inverse error is now the more common one:** filing a master-bearing domain as "overlay" and leaving it empty. If the domain persists real records (apply the overlay test in § "Master-bearing vs derive/overlay domains"), author the *real* masters in Phase B — don't park it as zero-master because it appeared on an old "leadership-tier" list.
- ❌ Inferring catalog state from any deploy script (`scripts/loaders/*.ts` or `.tmp_deploy/*.ts`). They drift the moment they ship. Cluster inventories MUST query live `postgrestRequest` endpoints — see workflow step 1.
- ❌ Treating `domain_data_objects.notes` as a required field on every master row. `notes` is for research details / decisions worth preserving (slice ownership on multi-master rows per Rule #3 and the anti-pattern above, point-solution-vs-holistic carve-outs, classification rationale a future reviewer would otherwise have to re-derive). Empty `notes` on a single-master row with no decision worth recording is the right shape, not a gap. Do **not** write demotion-path prose on embedded_master rows: `role=embedded_master` + the canonical master's existence already conveys it; notes that restate the schema are noise. The blueprint emitter and the per-domain checklist both treat this column as opt-in metadata, not a populate-on-every-row obligation. For the module-level junction (`domain_module_data_objects.notes`), see Rule #15: empty by default unless the user explicitly asks for a note.
- ❌ Loading a market with `min_org_size` of `xs`/`s` but only enterprise-tier solutions. If the stated minimum buyer is SMB/mid-market, the solution list must include at least 1–2 vendors that actually sell into that band. A list of pure enterprise solutions under an SMB-minimum domain is internally inconsistent and misleads downstream filters.
- ❌ Declaring a load or audit "done" without running the Per-domain completeness checklist (§ above). Every silent gap in this catalog's history followed the same pattern — someone shipped a market, the count of new rows looked right, no one ran the full checklist, and a category (`business_function_domains`, intra-domain `data_object_relationships`, lifecycle states) sat empty for weeks. Running the checklist is the gate; "I think I covered everything" is not a substitute. Specifically: do not declare ATS-shaped loads done until B6 (intra-domain relationships) and B7 (`users` edges) pass — those two were silently empty for ATS through Step-5's cluster pass and only surfaced when the fact sheet's mermaid rendered with disconnected nodes.
- ❌ Predicting numeric IDs inside a script. Always re-read after insert to build the id map.
- ❌ Trying to fit a large insert into a single command-line argument on Windows. Use stdin or chunk.
- ❌ `cd`ing into the skill folder, `.tmp_deploy/`, `scripts/loaders/`, or any subdirectory before running `semantius` or a loader script. Silently routes to the wrong tenant. See rule #6.
- ❌ Writing project state, lessons learned, or "remember this for next time" notes to your memory system. Every persistent note about this project lives in committed files (SKILL.md, CLAUDE.md, references/). Memory is off-limits for this repo.
- ❌ Loading tool-shaped capability rows into `capabilities`. `Send Email`, `Transcribe Audio`, `Sign Document`, `Make Phone Call`, `Run Shell Command` — those are **`tools`** (lowercase snake_case verbs: `send_email`, `transcribe_audio`, `sign_document`), not `capabilities`. The `capabilities` table stays business-shaped: noun-phrase market features an org *can do* (`Lead Management`, `Vulnerability Scanning`, `Roadmap Visualization`, `Automated Invoice Matching`). If the row reads as a JSON-RPC function with an obvious verb-object shape, it belongs in `tools` with the right `operation_kind` and (for `query`/`mutate`) a `data_object_id` pointer. This anti-pattern is easy to fall into when a vendor's marketing page lists capabilities like "AI Voice Synthesis" — that's a *tool* the vendor delivers, not a *capability* of a domain.
- ❌ Linking channel primitives (`send_email`, `send_sms`, `post_chat_message`, `make_phone_call`) on a skill without a documented channel-specific workflow justification. The Channel vs capability authoring rule is explicit: **default to the abstraction** (`notify_person` for single recipient, `notify_team` for broadcast). Link the channel directly only when the workflow REQUIRES that specific channel (CCAAS voice agent, ESIGN webhook callback, EDI message exchange) and the reason is captured in `skill_tools.notes`. Easy to miss in two situations: (a) cargo-culting an authoring template from a domain whose workflow legitimately needs the channel (CRM sales-activity skill correctly links `send_email`; LMS course-delivery does not), and (b) extending an existing skill that already has the channel primitive linked from a prior load — audit the inherited rows; don't treat them as authoritative. Cost of the mistake: when the platform ships native outbound, `notify_person` flips to `coverage_tier='platform'` with one UPDATE and every skill using the abstraction re-scores. Channel-specific links don't benefit; each one has to be hand-patched. Recurred at least three times across catalog loads; F7 in the per-domain audit catches it positively.
- ❌ Authoring a `module_kind='starter'` row with a `role='master'` (or `role='derived'`) `domain_module_data_objects` entry. Starters never master. The platform's `starter_no_master` validation_rule rejects the write; the loader's `validateStarterDataObjectJunction()` rejects it author-side. If the module genuinely needs to master a data_object, it is not a starter, promote to `module_kind='full'`. See Rule #19.
- ❌ Authoring a `consumer` or `contributor` `domain_module_data_objects` row on a `module_kind='starter'` against a domain-owned data_object. Starters must be deployable standalone. A consumer row points at a master that may not be installed at the deployment where the starter is the entry point; a contributor row writes to a target that may not exist. The only legitimate `consumer` rows on a starter are against `kind='platform_builtin'` data_objects (today only `users`). For any domain-owned data_object the starter needs, use `embedded_master`. See Rule #19 invariant 1.
- ❌ Authoring `data_object_lifecycle_states` rows from a starter load. Lifecycle is the canonical master's contract; the starter's blueprint inherits and renders the master's states via the emitter. Lifecycle rows in the catalog live on the master only.
- ❌ INSERTING `workflow-gate` permission rows into the catalog from a starter load (or any load). No module authors derived permissions: they are emitted from lifecycle states and the deployer materializes them (modules.md §4 / Plan 3). NOTE (plan-4): a starter is no longer "exactly three permissions". Its emitted §8.1 also carries the re-prefixed workflow gates of the entities it embeds whose realizing module is out of scope (e.g. `hiring-starter:approve_offer`), DERIVED by the emitter and materialized by the deployer (Rule #19 invariant #4; Rule #12 "Gate prefix and re-prefix"). The anti-pattern is the catalog INSERT, not the existence of the gate.

---

## Quick reference

UI base: `https://tests.semantius.app/domain_map/<table_name>`

Reference loader: [scripts/loaders/load_research.ts](scripts/loaders/load_research.ts)

Module-shape reference: [references/module-shape.md](references/module-shape.md)

Fact-sheet emitter (explicit, user-triggered only): [scripts/emit_fact_sheet.ts](../../../scripts/emit_fact_sheet.ts). See § "Fact sheets (explicit step, not part of any sequence)".

**Tool selection for the question you're asking:**

- **Loading rows / writing data** → `semantius call crud postgrestRequest` (Layer 2). Every `scripts/loaders/load_*.ts` script uses it.
- **Analytical questions — top-N, distribution, count-by, rank-by, "which domain has the most…", "how many capabilities per…"** → `semantius call cube discover` + `load` (Layer 3). Do **not** stream junction rows back with PostgREST and aggregate them in client code — that's the wrong layer and produces wrong-looking results (truncation, missed joins, manual GROUP BY in Bun).
- **One-off schema lookup** → `semantius call crud read_entity` / `read_field`.

See [`use-semantius` Decision Guide](../use-semantius/SKILL.md#quick-decision-guide) row 4 for the canonical guidance. The domain-map is heavy on ranking/aggregation questions ("which domains have the most capabilities", "owner-function distribution", "platform-vs-silos signals") — reach for cube by default on those, not PostgREST + post-processing.
