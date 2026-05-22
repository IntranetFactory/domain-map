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

`solution_domains.coverage_level` (`primary` / `secondary` / `partial`), `solution_capabilities.delivery_strength` (`native` / `partial` / `via_extension` / `not_supported`), `domain_regulations.applicability`, `domain_data_objects.role` (`master` / `contributor` / `consumer` / `derived`), `business_function_capabilities.responsibility` — these go on the junction rows, never on the parent entity. A solution covers many domains with different strengths; collapsing that onto the solution table would mean either duplicating the solution row per domain or losing the qualifier altogether. Both are wrong.

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

When a subagent is given a research/load task, instruct it explicitly to produce TypeScript output and to never propose Python. Phase-B Lite batch 1 (2026-05-22) had no Python issues only because the prompts didn't open the door to it; future prompts should slam the door explicitly.

### 5. Use stdin or chunked inserts on Windows.

`semantius call crud postgrestRequest '...'` with a large JSON body hits the Windows command-line length limit (~32KB). The PostgREST POST in a typical load can easily blow past that. Two fixes:

- **Pipe via stdin** to the CLI: `semantius call crud postgrestRequest` reads JSON from stdin when no inline argument is supplied. Use this from Bun's `Bun.spawn` with `stdin: "pipe"`.
- **Chunk inserts** into batches of ≤50 rows. Simpler when the script is in a hurry.

The reference loader at [.tmp_deploy/load_research.ts](.tmp_deploy/load_research.ts) does both. Start from it.

### 6. NEVER change cwd before invoking `semantius`. Run everything from the project root.

The `semantius` CLI reads `SEMANTIUS_API_KEY` / `SEMANTIUS_ORG` from `.env` in the **current working directory**. The project root has the correct `.env`; subfolders like `.claude/skills/domain-map-analyst/` do not. If you `cd` away from the project root before invoking the CLI (or before `bun run`-ing a loader script that spawns it), the CLI silently falls back to a default config pointing at a different tenant. Reads and writes succeed against the wrong org.

The symptoms are:

- `PGRST205 Could not find the table 'public.<table>' in the schema cache` on the first request
- `JWT audience not found, received ["tenant://<id>"]` where the tenant id doesn't match the project's tenant
- Different audience IDs on consecutive calls (load-balanced across wrong tenants)
- `getCurrentUser` returns an unexpected `email` / `semantius_org` (e.g. `admin@test.com` instead of the project user)

**Rules:**

- Never `cd` into `.claude/skills/...` or `.tmp_deploy/` before running anything that calls `semantius`.
- Invoke loader scripts with an absolute path from the project root: `bun run "<absolute-path-to-loader>"`. Never `cd <skill-folder> && bun run ...`.
- If a `semantius` call returns the symptoms above, suspect cwd before suspecting auth rotation, transient routing, or a stale schema cache.
- When in doubt, sanity-check with `semantius call crud getCurrentUser '{}'` and confirm the `email` and `semantius_org` fields match the expected project tenant.

This rule was added after the Salesforce platform load: changing cwd into the skill folder routed every call to the `tests` org user (`admin@test.com`) instead of the project's tenant. The user pushed back hard. **The skill exists to make sure this doesn't happen again — do not rediscover this gotcha.**

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

### 12. Lifecycle states and pattern flags are part of Phase B.

Every new domain load MUST include lifecycle states (rows in `data_object_lifecycle_states`) and pattern flags on `data_objects` (`has_personal_content`, `has_submit_lock`, `has_single_approver`) for its `master + required` data_objects — OR the domain code MUST be added to the lifecycle-states-pending tracking section of [plan-done-master-tasks.md](../../../plan-done-master-tasks.md) with an explicit backfill commitment.

Defaulting to "I'll do it later" without the tracking entry is not permitted: undocumented gaps silently degrade the per-domain fact sheets that `semantius-architect` consumes. The Phase B3 initial backfill (top 20 implementation-relevant domains, see [plan-domain-fact-sheets.md § 6.3](../../../plan-domain-fact-sheets.md)) is a one-time catchup; from then on every market load adds these contemporaneously.

---

## The module at a glance

27 entities (11 core concepts + 11 junctions + 1 alias + 4 agent-tooling). Read [references/module-shape.md](references/module-shape.md) for the per-entity field shapes, enums, and FK formats before doing any write that touches a field you haven't used recently.

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

### Junctions with qualifiers (11 entities)

| Table | Connects | Qualifier column |
|---|---|---|
| `industry_business_functions` | industries ↔ business_functions | presence |
| `business_function_domains` | business_functions ↔ domains | responsibility |
| `business_function_capabilities` | business_functions ↔ capabilities | responsibility (owner / contributor / consumer) |
| `capability_domains` | capabilities ↔ domains | semantic home |
| `domain_data_objects` | domains ↔ data_objects | role (master / embedded_master / contributor / consumer / derived) + necessity (required / optional) |
| `domain_regulations` | domains ↔ regulations | applicability |
| `solution_domains` | solutions ↔ domains | coverage_level (primary / secondary / partial) |
| `solution_capabilities` | solutions ↔ capabilities | delivery_strength (native / partial / via_extension / not_supported) |
| `solution_data_objects` | solutions ↔ data_objects | ownership role |
| `data_object_relationships` | data_objects ↔ data_objects | cardinality + kind |
| `cross_domain_handoffs` | domains → domains (via data_object) | `trigger_event_id` (FK to `trigger_events`) + integration_pattern + friction_level. Cross-domain only — source ≠ target enforced by validation rule. Signal 2 of platform-vs-silos analysis (Signal 1 is the multi-master count on `domain_data_objects` where `role ∈ {master, embedded_master}` AND `necessity = required`) |

### Aliases (1 entity)

| Table | Purpose |
|---|---|
| `data_object_aliases` | Synonym, industry term, or solution-specific name for a data object (e.g. Customer → Patient in Healthcare, Customer → Account in Salesforce) |

### Agent tooling layer (4 entities, added 2026-05-21)

> Folded in from the rolled-back `tool_catalog` sibling-module experiment — see [plan-tools-catalog.md § Why these entities live in domain_map](../../../plan-tools-catalog.md#why-these-entities-live-in-domain_map-revised-2026-05-21). One module, one analyst skill.

| Table | Holds | Qualifier / discriminator |
|---|---|---|
| `tools` | JSON-RPC-shaped capability primitives an agent skill can call (`send_email`, `query_invoices`, `transcribe_audio`) | `operation_kind` enum (`query` / `mutate` / `side_effect` / `compute`) — drives the **100% Semantius derivation** (today: `{query, mutate}` are Semantius-covered intrinsically; `side_effect` + `compute` need external solutions). Optional `data_object_id` FK is **required** when `operation_kind ∈ {query, mutate}` and **must be null** otherwise |
| `skills` | Agent skills (system / process / role). `system` skills mirror one domain 1:1 (`skill_type='system'`, `domain_id` set); `process` skills wrap a cross-domain handoff cluster; `role` wraps a user-role workflow | `skill_type` enum + optional `domain_id` FK (required only for `system`) |
| `tool_solutions` | N:M between `tools` and `solutions` — which non-Semantius solutions deliver this tool, and how | `delivery_strength` + `delivery_method` (`mcp_server` preferred) + optional `endpoint_url`. Computed label `<tool> via <solution>`. **No Semantius row** — its coverage is intrinsic to `operation_kind` |
| `skill_tools` | N:M between `skills` and `tools` — which tools a skill needs to function | `requirement_level` (`required` / `optional` / `fallback`) + workflow-context `notes`. Computed label `<skill> needs <tool>` |

These four tables coexist with `domain_map.solutions`, which gained `solution_kind` enum (`external_connector` / `action` / `compute_service` / `standard_solution`) to classify which solutions are tool-delivery sources. The killer hypothesis the layer exists to test: **how many of the loaded domains have a system skill where every required tool is Semantius-covered (i.e. `operation_kind ∈ {query, mutate}` for every required `skill_tools` row)?**

---

## Workflow for any research task

For any task that fits this skill — "research vendors for X", "is Y a domain?", "load this list of competitors", "find capabilities for Z" — work in this order. Don't skip steps; each one prevents a class of mistake.

> **Domain research without the data-object phase is half a load. Without the function-axis phase it's two-thirds of a load.** Phase A (market shape — domains/capabilities/vendors/solutions), Phase B (data-object footprint — data_objects + Signal 1 + Signal 2), and Phase C (organisational-function coverage — `business_function_domains` + `business_function_capabilities`) are all default. Skipping B kills the platform-vs-silos analysis (Signals 1 & 2). Skipping C kills the buyer-persona / RACI axis (Signal 3 — *who in the org owns, contributes to, or consumes this market?*).
>
> **Phase A+B+C are per-market load defaults.** [Phase D — process-skill discovery](#phase-d--process-skill-discovery-substrate-level) is a **substrate-level analytic**, not a fourth per-market step. It runs across the catalog once Phase B has shipped for enough clusters, and is re-runnable on demand. See the dedicated section below.

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
   - `vendors` (legal entities, reusing existing rows by `vendor_name`)
   - `solutions` (one row per flagship product per market)
   - `solution_domains` with `coverage_level` (primary / secondary / partial)
   - `solution_capabilities` with `delivery_strength` (native / partial / via_extension / not_supported) — this is what makes per-vendor comparison possible; **don't skip it**, even if the matrix feels tedious. A reference Phase-A loader is [.tmp_deploy/load_prod_mgmt.ts](.tmp_deploy/load_prod_mgmt.ts); the SMM load also follows this exact shape ([.tmp_deploy/load_smm.ts](.tmp_deploy/load_smm.ts)).

   **Phase B — Data-object footprint** (load second, against the same domain). The Phase-B contract now ships six deliverables (expanded 2026-05-22 — see [plan-domain-fact-sheets.md § 5.4](../../../plan-domain-fact-sheets.md)):

   1. **`data_objects`** that the domain masters (3–8 noun-plural snake_case names; apply the "what would a flagship vendor build their schema around?" test). Each row populates `singular_label`, `plural_label`, and — per Rule #12 — the pattern flags `has_personal_content` / `has_submit_lock` / `has_single_approver` where the master entity matches the pattern. Apply Rule #9 (naming arbitration) before insert.
   2. **`domain_data_objects`** rows: `master` for the new objects, plus `embedded_master`, `contributor`, and `consumer` rows where the new domain enriches or reads existing cluster-owned objects (almost always `contacts` / `customers` / `campaigns` / `audience_segments` exist already — link to them rather than re-mastering). Validate Rule #11 before inserting any `embedded_master` row.
   3. **`cross_domain_handoffs`** from this domain outbound (and inbound where the partner domain is loaded) — apply the high-friction shape recognition in the "Data-object research" section below.
   4. **`data_object_relationships`** — intra-domain edges + `users`-edge entries (Rule #10) + cross-domain edges for every `cross_domain_handoffs` row with a clean payload→target mapping (e.g. `candidates →becomes→ employees`). Each row carries `relationship_label` (verb), `cardinality`, `necessity`, and `owner_side`. Drafts MUST surface the relationship graph as a mermaid block in the Phase-B preview before loading.
   5. **`data_object_aliases`** — ≥1 alias per non-self-explanatory master (industry synonyms, vendor-specific labels). The fact sheet generator embeds these directly.
   6. **`data_object_lifecycle_states`** — for every `master + required` data_object with a non-trivial workflow. Each row carries `state_name`, `state_order`, `is_initial` / `is_terminal`, and `requires_permission` (true = derive a `<slug>:<verb>_<entity>` workflow gate; override the verb via `permission_verb_override` when the auto-derivation is wrong, e.g. `hired → hire_candidate`). Required by Rule #12, or tracked as a deferred backfill.

   Reference Phase-B loader: [.tmp_deploy/load_smm_data_objects.ts](.tmp_deploy/load_smm_data_objects.ts). Full procedure: see [Data-object research and cross-domain-handoff discovery](#data-object-research-and-cross-domain-handoff-discovery) below.

   Phase B is **not optional** for genuine domain research. The only legitimate reasons to skip it: (a) the task is narrowly scoped to "find competitors for X" or "is Y a domain?" without an actual load; (b) the user explicitly defers it. In every other case — including any "research the X domain" or "load the X market" ask — all three phases are part of the work.

   **Phase C — Organisational-function coverage** (load third, against the same domain):
   - `business_function_domains` rows linking the domain to the function(s) that **own / contribute-to / consume** it (`responsibility_type` enum). For most domains 2–4 rows: one `owner`, one or two `contributor`s, optionally one `consumer`.
   - `business_function_capabilities` rows where a capability has a different functional owner than the domain (e.g. capability `COMPLIANCE-TRAIN` under domain `LMS` is owned by `Compliance`, not `L&D`). Only add when the capability-level RACI **diverges** from the domain-level RACI — otherwise the domain row is sufficient.
   - Reference Phase-C loader: TBD (the function spine and per-domain links were loaded together; see [.tmp_deploy/load_business_functions.ts](.tmp_deploy/load_business_functions.ts) once it exists).

   Phase C answers *"who in the org buys / runs / consumes this market?"* and powers buyer-persona filtering, RACI overlays, and the org-side analogue of the data-object signals. If the function spine is empty (only true at the very start of the catalog), populate it once before adding `business_function_domains` rows — see "Function spine" below for the canonical 20-function shape.

6. **Verify and share.** After each phase, query counts on the affected tables, compare against expected, and link the user to the UI tables that changed.

### Backfill gaps to watch for

The catalog has had three known backfill gaps where a category was scaffolded but not loaded as the workflow grew. Each was discovered after several markets had shipped without it. When working in any market loaded before the listed date, expect to backfill:

| Category | Empty until | What to check on touched markets |
|---|---|---|
| `solution_capabilities` (`delivery_strength` matrix) | PROD-MGMT load (2026-05-19) | Every solution × capability for the touched market has a row. Don't ship a new market without the matrix. |
| `business_function_domains` + `business_function_capabilities` (RACI axis) | Pre–ITSM-review backfill (2026-05-20) | Every domain has at least one `owner` row; every domain has at least one `contributor` or `consumer` row when cross-functional. |
| `business_functions` spine itself | Pre–2026-05-20 | If the table is empty when starting Phase C, load the 20-function canonical spine first. |

Don't ship a new market without closing all three gaps for it. Doing so makes the historical drift worse.

### Cross-cutting capability convention

`capability_domains` is many-to-many — a single capability *can* belong to multiple domains, and the cube documentation explicitly anticipates this ("Customer 360 spans CRM and Data Platform; Workforce Scheduling spans HR Operations and Field Service"). In practice the catalog has drifted to ~99% single-domain capabilities because every Phase-A loader produces market-scoped capabilities with **domain-prefixed codes** (`PM-ROADMAP`, `CDP-INGEST`, `ITSM-INCIDENT`, `COMM-CART-CHECKOUT`).

The prefix is helpful for readability and prevents accidental collisions, but it locks the capability to one domain by naming — "`CDP-INGEST` also applies to MDM" reads as a contradiction. The catalog therefore systematically under-represents the cross-cutting capabilities that vendors actually compete on across multiple markets (ServiceNow Knowledge spans ITSM/CSM/HRSD; Workday Forecasting spans FP&A/Workforce-Planning; Reltio Identity Resolution spans CDP/MDM/IGA).

**Naming rule:**

- **Domain-prefixed code** (default for new market loads): use when the capability is genuinely market-specific and would not make sense in another domain (`PM-ROADMAP`, `ITSM-INCIDENT`, `CDP-IDENT-RES`).
- **Domain-neutral code** (no prefix, plural-noun-only): use when the capability genuinely spans **≥3 domains** and vendors market the same shape across those markets. Examples: `KNOWLEDGE-MGMT`, `SLA-MGMT`, `SELF-SERVICE-PORTAL`, `AI-TRIAGE-CLASSIFICATION`, `IDENTITY-RESOLUTION`, `CUSTOMER-360`, `APPROVAL-WORKFLOW`, `WORKFORCE-SCHEDULING`, `TIME-TRACKING`, `COMPLIANCE-TRAINING`.

**Decision test when authoring a capability:**

1. Can I name **three independent vendors that explicitly market this capability across at least three of the candidate domains?** If yes → domain-neutral. If no → domain-prefixed.
2. If a domain-prefixed capability later turns out to span ≥3 domains, **rename it** (update `capability_code`; capability_id stays stable, so `solution_capabilities` and `capability_domains` rows survive). Then add the missing `capability_domains` rows. See [.tmp_deploy/load_cross_cutting_capabilities.ts](.tmp_deploy/load_cross_cutting_capabilities.ts) for the loader pattern.
3. When extending an existing cross-cutting capability into new domains, also extend its `solution_capabilities` matrix: vendors flagship-active in the new domain should get a row. Otherwise the matrix under-claims and the comparison view stays incomplete.

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
- `singular_label` (and `plural_label`) is the **human-friendly** form (`Job Requisition` / `Job Requisitions`, `Recruitment Source` / `Recruitment Sources`, `Background Check` / `Background Checks`). The labels can drift from `data_object_name` (e.g. industry-specific renames) — that's the column's job. The legacy `display_label` column is retained transitionally during the [plan-domain-fact-sheets.md § 9.1 Step 10](../../../plan-domain-fact-sheets.md) cleanup, but every new write goes to `singular_label` / `plural_label`.
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

The full procedure (cube DSL, clustering signals, ranking formula) lives in [`plan-process-skill-discovery.md` § Discovery procedure](../../../plan-process-skill-discovery.md#discovery-procedure-the-payoff). Summary of the five clustering signals:

1. **Trigger-event prefix** (`offer.*`, `employee.*`, `incident.*`) — primary signal
2. **Data-object lifecycle trace** (chain of handoffs an object travels through)
3. **Domain-graph community detection** (densely connected subgraphs in the handoff DAG)
4. **High-friction subset** (`friction_level=high` cluster)
5. **Business-function involvement** (≥3 functions in a handoff cluster ⇒ process candidate)

Each candidate cluster is matched against `processes` (APQC PCF) on name/description similarity. Unmatched clusters become candidates for `source_framework='custom'` process rows using the [custom-process naming convention](#custom-process-naming-convention) below.

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

Compare against the "Live state checkpoint" in [plan-master-tasks.md](../../../plan-master-tasks.md). If counts have moved, the candidate set may have changed — recompute "domains with masters but no system skill" before proceeding. P2.5A.i discovered 3 already-existing query tools that would have duplicated; always dedupe.

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

Quick check before drafting any system skill: `semantius call crud postgrestRequest '{"method":"GET","path":"/domain_data_objects?domain_id=eq.<id>&role=eq.master"}'`. Zero masters = skip. If the domain genuinely is supposed to have masters (and you're not skipping for the leadership-layer reason), that's a Phase-B gap — backfill before drafting the skill (see [P2.5A.0 — Phase-B prerequisite backfill](../../../plan-master-tasks.md) for the precedent).

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

1. **Identify the cluster's domains** — read from the candidate `plan-process-skill-<name>.md` file (one per candidate, surfaced by the discovery query at [references/discovery-query.md](references/discovery-query.md)). Each candidate plan file lists `query_domains` (read access required) and `mutate_domains` (write access required) sets.
2. **Auto-derive query tools** — every master `data_object` across `query_domains` contributes its existing `query_<master>` tool as REQUIRED. The catalog already has these from the P2.5A.iii pass; no new query tools needed.
3. **Auto-derive mutate tools** — for each `mutate_domain`, link any existing `update_<master>` / `create_<master>` / verb-driven mutate tool as REQUIRED. Mutates are sparser than queries — skip the master if no mutate exists yet (don't auto-generate generic ones).
4. **Add cross-cutting externals** — from the candidate plan file's "Tool requirements" section. Email + sign_document + chat are the recurring shapes (see [Cross-tranche external-tool patterns](#cross-tranche-external-tool-patterns-p25aii-2026-05-22)).
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
- ❌ Loading a new market with `domains` + `vendors` + `solutions` + `solution_domains` and stopping there. Capabilities (+ `capability_domains`) and `solution_capabilities` are part of the Phase-A load shape, not an optional follow-up. See workflow step 5.
- ❌ Stopping after Phase A (market shape) and not running Phase B (data-object footprint — data_objects, domain_data_objects, cross_domain_handoffs). A market without its mastered/contributed data objects and its outbound handoffs contributes zero to Signal 1 and Signal 2, which is what the catalog exists to support. See workflow step 5.
- ❌ Stopping after Phase A+B and not running Phase C (business_function_domains, optionally business_function_capabilities). A market without functional ownership contributes zero to the buyer-persona / RACI axis (Signal 3). The function-axis spine is small, but the per-domain links are part of every market load from 2026-05-20 onward.
- ❌ Treating [Phase D](#phase-d--process-skill-discovery-substrate-level) as a fourth per-market load step. Phase D is a **substrate-level analytic** that runs across the catalog once Phase B is broadly complete. Running it after every single market load is wasted work; skipping it entirely once enough clusters have shipped Phase B is the actual failure mode.
- ❌ Creating one `trigger_events` row per subscriber when a single event fans out. All subscribers of `employee.created` share **one** `trigger_events.id`; only the handoff rows differ. Duplicating events per subscriber breaks Phase D's primary clustering signal.
- ❌ Treating `cross_domain_handoffs.data_object_id` as the publisher's data_object. It's the **per-edge payload** — the artifact in flight on that specific handoff. The publisher's data_object lives on `trigger_events.data_object_id` and is shared across every subscriber of the event. These two columns ARE allowed to differ (HCM publishes `employee.created` on `employees`; the HCM→Onboarding handoff carries `onboarding_journeys` as the payload). Reviewers regularly conflate them when reading a handoff row in isolation.
- ❌ Scaffolding synthetic `data_objects` for leadership-layer / aggregation-tier domains (REV-INTEL, SALES-PERF, GTM-PLAN, ACCT-PLAN, PRM, EPM) just so they "own something". These domains read upstream and publish derived signals; the handoff's `data_object_id` references the upstream cluster's data_object directly. Forcing ownership via synthetic objects creates dead rows that nothing else references.
- ❌ Inferring catalog state from `.tmp_deploy/*.ts` deploy scripts. They drift the moment they ship. Cluster inventories MUST query live `postgrestRequest` endpoints — see workflow step 1.
- ❌ Loading `domain_data_objects` master rows with empty `notes`. Even when the data_object has a single master today, write a one-sentence slice description in `notes` — it's the column reviewers read first when a second master shows up later. The "empty notes on multi-master rows" anti-pattern is the stricter form; the relaxed form applies to all master rows.
- ❌ Loading a market with `min_org_size` of `xs`/`s` but only enterprise-tier solutions. If the stated minimum buyer is SMB/mid-market, the solution list must include at least 1–2 vendors that actually sell into that band. A list of pure enterprise solutions under an SMB-minimum domain is internally inconsistent and misleads downstream filters.
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

**Tool selection for the question you're asking:**

- **Loading rows / writing data** → `semantius call crud postgrestRequest` (Layer 2). Every `.tmp_deploy/load_*.ts` script uses it.
- **Analytical questions — top-N, distribution, count-by, rank-by, "which domain has the most…", "how many capabilities per…"** → `semantius call cube discover` + `load` (Layer 3). Do **not** stream junction rows back with PostgREST and aggregate them in client code — that's the wrong layer and produces wrong-looking results (truncation, missed joins, manual GROUP BY in Bun).
- **One-off schema lookup** → `semantius call crud read_entity` / `read_field`.

See [`use-semantius` Decision Guide](../use-semantius/SKILL.md#quick-decision-guide) row 4 for the canonical guidance. The domain-map is heavy on ranking/aggregation questions ("which domains have the most capabilities", "owner-function distribution", "platform-vs-silos signals") — reach for cube by default on those, not PostgREST + post-processing.
