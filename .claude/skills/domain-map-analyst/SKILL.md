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

Only ever stamp `approved` when the user explicitly says "I've reviewed these, mark them approved" or the equivalent. The same applies to `pending` — that's a human-workflow state, not a default.

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

---

## The module at a glance

21 entities. Read [references/module-shape.md](references/module-shape.md) for the per-entity field shapes, enums, and FK formats before doing any write that touches a field you haven't used recently.

### Core concepts (9 entities)

| Table | Holds | Hierarchical? |
|---|---|---|
| `industries` | Industries the catalog cares about (Banking, Healthcare, Manufacturing) | yes |
| `jurisdictions` | Geographic & supranational scopes for regulations (EU, USA, Germany) | yes |
| `business_functions` | Functional roles in an org (Sales, HR, Finance, IT) | yes |
| `domains` | System-type domains (CRM, ITSM, HRIS, MDM) | yes |
| `capabilities` | What an org *can do* (Lead Mgmt, Vulnerability Scanning) | yes |
| `data_objects` | Canonical data subjects (Customer, Order, Asset, Invoice) | no |
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
| `domain_data_objects` | domains ↔ data_objects | role (master / contributor / consumer / derived) |
| `domain_regulations` | domains ↔ regulations | applicability |
| `solution_domains` | solutions ↔ domains | coverage_level (primary / secondary / partial) |
| `solution_capabilities` | solutions ↔ capabilities | delivery_strength (native / partial / via_extension / not_supported) |
| `solution_data_objects` | solutions ↔ data_objects | ownership role |
| `data_object_relationships` | data_objects ↔ data_objects | cardinality + kind |
| `cross_domain_handoffs` | domains → domains (via data_object) | trigger_event + integration_pattern + friction_level. Cross-domain only — source ≠ target enforced by validation rule. Signal 2 of platform-vs-silos analysis (Signal 1 is the multi-master count on `domain_data_objects.role`) |

### Aliases (1 entity)

| Table | Purpose |
|---|---|
| `data_object_aliases` | Synonym, industry term, or solution-specific name for a data object (e.g. Customer → Patient in Healthcare, Customer → Account in Salesforce) |

---

## Workflow for any research task

For any task that fits this skill — "research vendors for X", "is Y a domain?", "load this list of competitors", "find capabilities for Z" — work in this order. Don't skip steps; each one prevents a class of mistake.

> **Domain research without the data-object phase is half a load. Without the function-axis phase it's two-thirds of a load.** Phase A (market shape — domains/capabilities/vendors/solutions), Phase B (data-object footprint — data_objects + Signal 1 + Signal 2), and Phase C (organisational-function coverage — `business_function_domains` + `business_function_capabilities`) are all default. Skipping B kills the platform-vs-silos analysis (Signals 1 & 2). Skipping C kills the buyer-persona / RACI axis (Signal 3 — *who in the org owns, contributes to, or consumes this market?*).

1. **Read the existing catalog first.** Always query the live module before researching new entries. Duplicates and inconsistent naming hurt the catalog more than gaps do. Pull the relevant subset (domains in this area, vendors already present, solutions covering related markets, capabilities already on the relevant domains) and skim before you research.

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

   **Phase B — Data-object footprint** (load second, against the same domain):
   - `data_objects` that the domain masters (3–8 noun-plural snake_case names; apply the "what would a flagship vendor build their schema around?" test)
   - `domain_data_objects` rows: `master` for the new objects, plus `contributor` and `consumer` rows where the new domain enriches or reads existing cluster-owned objects (almost always `contacts` / `customers` / `campaigns` / `audience_segments` exist already — link to them rather than re-mastering)
   - `cross_domain_handoffs` from this domain outbound (and inbound where the partner domain is loaded) — apply the high-friction shape recognition in the "Data-object research" section below
   - Reference Phase-B loader: [.tmp_deploy/load_smm_data_objects.ts](.tmp_deploy/load_smm_data_objects.ts). Full procedure: see [Data-object research and cross-domain-handoff discovery](#data-object-research-and-cross-domain-handoff-discovery) below.

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

- `data_object_name` is the **natural key** and must follow Semantius entity-naming conventions: snake_case, plural (`job_requisitions`, `recruitment_sources`, `background_checks`). Treat it as if you were naming the entity in a new Semantius module — because that's exactly what the catalog claims it represents.
- `display_label` is the **human-friendly** form (`Job Requisition`, `Recruitment Source`, `Background Check`). It can drift from `data_object_name` (e.g. industry-specific renames) — that's the column's job.
- Industry-specific or solution-specific variants (`Patient` for `customers` in Healthcare, `Account` for `customers` in Salesforce) live in `data_object_aliases`, never as new `data_objects` rows.
- **Buyer-side vs seller-side: distinct data_objects, not multi-master rows.** When two domains see the same kind of artifact from opposite sides of a transaction, model them as separate `data_objects`. They have different lifecycles, owners, and integration paths. Established pairs:
  - `saas_subscriptions` (SMP, buyer-side) ↔ `customer_subscriptions` (SUB-MGMT, seller-side)
  - `invoices` (S2P, AP-side, supplier-issued) ↔ `customer_invoices` (SUB-MGMT, AR-side, seller-issued)
  - Future candidates: `suppliers` vs `customers` (already distinct), `vendor_contracts` vs `customer_contracts` (avoid — `contracts` is one CLM-mastered object with both flavors as contributors).
- **Audience filtering, not duplicated-per-audience data_objects.** When modern vendor stacks unify a shape with audience tags at the application layer (`knowledge_articles` serves both internal IT and customer-facing KBs in ServiceNow / Salesforce Knowledge), prefer one `data_object` + multi-domain consumers over a separate `external_knowledge_articles` under CSM. Default rule: if at least one credible vendor unifies the underlying record, the catalog should too.

### Phase 1 — propose the domain's data objects

1. **Find the domain.** Pull `domains` by `domain_code`. Confirm it exists and check its description.
2. **Master at the sub-domain, not the umbrella, when both exist.** If the target has sub-domains in the catalog (ITAM → HAM/SAM/SMP/FINOPS; CRM → CDP/MA/SALES-ENG/CPQ/LOYALTY/B2C-COMM), data_objects master at the most-specific sub-domain that owns them. The umbrella retains only genuinely cross-cutting objects (`asset_contracts`, `asset_lifecycle_events` for ITAM-umbrella; the CRM-umbrella keeps `customers`, `contacts`, `leads`, `opportunities`, `pipeline_stages`, `sales_activities` because no sub-domain claims them). This rule was learned the hard way: `software_licenses` and `software_installations` were initially proposed at ITAM-umbrella and had to be re-homed to SAM before load.
3. **List candidate data objects.** Apply the "what does THIS domain primarily master?" test. The candidate list is what an ATS-like / CRM-like / ITSM-like vendor would build their schema around — not what the domain *touches*.
4. **Exclude foreign masters.** If a candidate is mastered by another already-loaded domain (e.g. `positions` is HCM's master, not ATS's), drop it from the primary set. Flag it for later as a *secondary*-style link once both sides are loaded; don't invent it in the wrong domain.
5. **Exclude handoff targets that belong elsewhere.** Some objects look like they belong to the domain because the domain triggers their creation — but their master lives in another domain. Onboarding Task is the canonical example: ATS triggers it via `offer.accepted`, but Onboarding (or HRSD) masters it. These become `cross_domain_handoffs` rows in Phase 3, not `data_objects` under the source domain.
6. **Surface descriptions for review.** Always show name + display_label + description in a single table before loading. The description column is where AI research goes wrong silently; reviewers need to see it.
7. **Load idempotently.** Pattern: read by `data_object_name`, insert missing only, re-read for the id map, insert `domain_data_objects` with `role: master` for the linking domain. Reference loaders covering every variation we've shipped are listed in [references/loader-idiom.md](references/loader-idiom.md).

### Phase 2 — identify multi-master (Signal 1)

For each data object you just loaded, ask: **which other domains in the catalog also legitimately master a slice of this?** Multi-master is normal and is one of the two strongest indicators of integration value.

- The schema allows multiple `role='master'` rows per data_object; this is by design, not an integrity bug.
- Each domain that co-masters should explain *which slice* it owns in the junction's `notes` column. "Recruiting execution: stages, candidates, interviews, offers" vs "Headcount intent: position approval, budget alignment, plan-to-actual" makes the multi-master row useful instead of ambiguous.
- **Look for the cluster flagship first.** Every cluster we've loaded has produced a structural multi-master flagship: `employees` (HR cluster), `configuration_items` (IT-ops cluster), `customers` (customer-facing cluster). The flagship is 3-4 masters + contributors + at least one consumer, and it anchors the rest of the load. When you start a new cluster, *expect* this pattern — find the flagship first, then everything else decomposes around it. See [references/canonical-examples.md](references/canonical-examples.md) for the full catalog of landmark rows and their slice decomposition.
- If a co-master domain isn't in the catalog yet (Workforce Planning was missing when ATS shipped), add the domain via Phase 1 first, then link.
- Beyond `master`, the same data_object often has `contributor` rows (writes some fields without being authoritative), `consumer` rows (read-only), and `derived` rows (analytics/projections). Add these as they become known — they don't drive Signal 1 but enrich the model.
- **Boundary-object pattern.** When two adjacent domains have a fuzzy cost / value / state handoff, *invent a data_object that lives at the boundary* and assign single mastery on the upstream side. `workforce_cost_projections` (SWP-mastered, EPM-consumed) is the case study: without it, the SWP↔EPM boundary is "the workforce plan somehow becomes a budget line"; with it, SWP masters the workforce-driven cost build, EPM consumes for the consolidated budget. Look for boundary-object candidates whenever a high-friction handoff exists between two domains that "should" share a concept but don't.

### Phase 3 — discover cross-domain handoffs (Signal 2)

For each data object, identify the **event-driven flows between two distinct domains** that involve this object. Every such flow is a pipeline / API call / human handoff today; an integrated platform would absorb them. These are the rows in `cross_domain_handoffs`.

The discovery questions, in order:

1. **What state changes on the data object?** `offer.accepted`, `incident.resolved`, `requisition.approved`, `case.closed`, `task.completed`, `application.hired`. Use dotted-lowercase noun.verb naming. These are the candidate `trigger_event` values.
2. **For each state change, which other domain reacts?** The reactor is the `target_domain`. If the reactor is the same domain (`incident.created` → `change.requested` both in ITSM), it's intra-domain — out of scope, do not record. The `cross_domain_only` validation rule enforces this and will reject the insert with a 23514.
3. **What's the integration_pattern today?** `event_stream` (Kafka/EventBridge/etc.), `api_call` (direct webhook/REST), `batch_sync` (nightly ETL), `manual_handoff` (someone copies a value), `file_drop` (CSV exchange). When unknown, default to `api_call` and flag in notes.
4. **What's the friction_level today?** `high` if the handoff regularly breaks, requires custom maintenance, or has measurable error rate. `medium` for stable but bespoke integrations. `low` for native event streams within a shared platform. Friction is the cost an integrated platform would eliminate — it's the value-quantification column.
5. **Describe what actually happens.** The `description` column should name the payload, the downstream consequences, and known failure modes. "Offer accepted in ATS triggers a workflow in Onboarding that generates a task list per template; failure modes: late-bound position changes invalidate the template selection."

**Fan-out is normal — don't collapse it.** One trigger event often hits multiple target domains simultaneously. `employee.created` fires from HCM to Onboarding, Payroll, IGA, and Talent-Mgmt as four separate handoff rows sharing one trigger; `offer.accepted` similarly fans ATS → Onboarding plus implicit feeds to HCM and Payroll. Each fan-out arm is its own row by design — they have different integration patterns, friction levels, and failure modes. Don't try to merge them into a single record.

**Recognize the high-friction patterns.** After ~80 handoffs the consistent `friction_level: high` cases cluster into five recognisable shapes:
- **Identity reconciliation across systems** — HCM→IGA, SMP→IGA, CDP→SALES-ENG: same logical person/customer, different identifier spaces, no canonical resolver
- **Leaver / cancellation recall** — HCM→ITAM asset recall on termination, CSM→SUB-MGMT churn-risk feedback: the "going away" event is harder to catch than the "arriving" event
- **Probabilistic signal becomes deterministic action** — CDP→SALES-ENG intent signal, AIOPS→ITSM correlation: the upstream is a scored guess, the downstream needs a yes/no
- **Shadow-data emerges from off-channel transactions** — EXPENSE→SMP shadow-IT detection, B2C-COMM→SUB-MGMT direct-purchase: the official catalog finds out from a side channel
- **Cross-vendor stack with same logical entity** — OBS→ITSM SLO breach when SLO and incident tools are different vendors

When a new handoff matches one of these shapes, default `friction_level` to `high`.

### Phase 4 — score and surface

After loading any meaningful chunk of `cross_domain_handoffs`, the platform-candidacy view falls out:

- **Per data_object:** `count(role='master') + count(handoffs)` is the integration-burden score. High score = strong candidate for an integrated platform.
- **Per (domain_a, domain_b) pair:** `count(handoffs WHERE {source,target} = {a,b})` is the bilateral integration weight. High weight = these two domains are effectively one platform's problem already.

Both queries are one-line cube DSL once the data is in — surface them to the user along with the UI links after each load.

### Anti-patterns specific to this workflow

- ❌ Putting `Onboarding Task` (or any other handoff target) under the *trigger* domain's data_objects. It belongs to the *master* domain; the relationship is a `cross_domain_handoffs` row, not a `domain_data_objects` row.
- ❌ Recording intra-domain events in `cross_domain_handoffs`. The validation rule will reject them; if you bypass it by routing through different ids, you're polluting the integration-burden score with internal workflow.
- ❌ Filling `domain_data_objects.notes` with nothing on multi-master rows. The whole point of allowing multi-master is to surface *which slice* each domain owns; an empty `notes` hides that.
- ❌ Inventing a co-master domain in the catalog just to make a multi-master row work. Apply the point-solution-market test first; if Workforce Planning genuinely passes (it does), add the domain. If it doesn't, the data_object probably belongs to one master, not two.
- ❌ Naming `data_object_name` in human form (`Job Requisition`, `Background Check`). That's `display_label`'s job. The natural key is snake_case_plural.

---

## Classification heuristics

Beyond the point-solution-market test, these heuristics resolve the ambiguous cases that came up most often:

- **Umbrella vs sub-domain.** Both can be valid simultaneously. ITAM is an umbrella with its own market (Flexera One, Ivanti Neurons for ITAM). HAM, SAM, FinOps, EAM are sub-domains, each with their own point-solution markets. Model both levels via `parent_domain_id` — but only when both levels have independent vendor competition. AIOps as a sub-domain of ITOM is borderline; left top-level because the vendor list (BigPanda, Moogsoft, Dynatrace Davis) is distinct enough.

- **Vendor identity after acquisitions.** Use the *current legal owner* in `vendors.vendor_name`. Mention the predecessor in `description` or `notes`. Examples to remember: LeanIX → SAP SE, ServiceMax → PTC, MuleSoft → Salesforce Inc, Lightstep → ServiceNow Inc, Apptio → IBM, Plex → Rockwell Automation, CloudHealth → Broadcom, Reflexis → Zebra Technologies, Sapling → Kallidus, Blue Prism → SS&C, Signavio → SAP SE, Splunk → Cisco (the vendor is still Splunk; Cisco is the parent).

- **Product re-brands.** A renamed product gets a single solution row under its current name; the old name belongs in `description` or `notes`. Don't double-row: ServiceNow GRC and ServiceNow IRM are the same product, model once as IRM.

- **Same product, multiple domains.** A solution can legitimately cover many domains — one solution row, multiple `solution_domains` rows with the right `coverage_level`. ServiceNow IRM has `primary` on GRC and `secondary` on AUDIT, BCM, OP-RES, TPRM, PRIV-MGMT, ESG.

- **Platform vs product granularity.** The schema has no `parent_solution_id` column, so don't try to model an umbrella platform *plus* every sub-product. Pick one level. For ServiceNow we picked per-product (40-ish rows); for competitors we picked their flagship per domain. Don't mix levels arbitrarily — pick a rule per vendor.

- **Capabilities vs sub-domains.** When a concept fails the domain test, decide between modelling it as a sub-domain (rare) or as a capability (common). A capability is something an org *can do* expressed as a noun (Lead Management, Vulnerability Scanning, Automated Invoice Matching). It is independent of which solution delivers it.

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
- ❌ Loading `domain_data_objects` master rows with empty `notes`. Even when the data_object has a single master today, write a one-sentence slice description in `notes` — it's the column reviewers read first when a second master shows up later. The "empty notes on multi-master rows" anti-pattern is the stricter form; the relaxed form applies to all master rows.
- ❌ Loading a market with `min_org_size` of `xs`/`s` but only enterprise-tier solutions. If the stated minimum buyer is SMB/mid-market, the solution list must include at least 1–2 vendors that actually sell into that band. A list of pure enterprise solutions under an SMB-minimum domain is internally inconsistent and misleads downstream filters.
- ❌ Predicting numeric IDs inside a script. Always re-read after insert to build the id map.
- ❌ Trying to fit a large insert into a single command-line argument on Windows. Use stdin or chunk.
- ❌ `cd`ing into the skill folder, `.tmp_deploy/`, or any subdirectory before running `semantius` or a loader script. Silently routes to the wrong tenant. See rule #6.
- ❌ Writing project state, lessons learned, or "remember this for next time" notes to your memory system. Every persistent note about this project lives in committed files (SKILL.md, CLAUDE.md, references/). Memory is off-limits for this repo.

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
