# Plan — Tools catalog (side-effect tools for agent skills) + "100% Semantius" identification

> Drafted 2026-05-20. Sibling plan to [`plan-process-skill-discovery.md`](plan-process-skill-discovery.md). Intended to be picked up cold in a fresh session.

## Goal

Model the **external side-effect tools** an agent skill needs beyond Semantius CRUD + analytics + JsonLogic. Same structural shape as the `domain_map`, but for *operational tools* rather than *enterprise software markets*.

Two outcomes:
1. Per skill (system or process), a list of required tools and candidate vendors.
2. A derived "**is this skill 100% Semantius-feasible?**" query — i.e. does the skill need *anything* beyond Semantius core + JsonLogic to do its job? Domains whose skills come out 100% Semantius are the cheapest to ship, the easiest to package, and the highest commercial-leverage candidates.

## Why a separate Semantius module

The `domain_map` answers *"what enterprise software markets exist and what do they deliver?"* — market-research view.

The `tool_catalog` answers *"what side-effect operations does an agent skill need to perform, and which concrete tools deliver each one?"* — integration-architecture view.

Different audiences (market researcher vs. integration architect), different decision contexts, different update cadences. Should live as a **sibling Semantius module** named `tool_catalog`, not as additions to `domain_map`.

## Context — what to read before starting

| File | Why |
|---|---|
| [`.claude/skills/domain-map-analyst/SKILL.md`](.claude/skills/domain-map-analyst/SKILL.md) | Patterns for module design, idempotent loads, classification heuristics. |
| [`CLAUDE.md`](CLAUDE.md) | Project-wide rules (CLI only, no MCP, cwd discipline). |
| [`.agents/skills/use-semantius/SKILL.md`](.agents/skills/use-semantius/SKILL.md) | Semantius layer model — what counts as "Semantius core" (Layer 1 typed tools + Layer 2 postgrestRequest + Layer 3 cube + JsonLogic). |
| [`.tmp_deploy/load_research.ts`](.tmp_deploy/load_research.ts) | Reference loader idiom. |

## Conceptual model — `tool_catalog` module

Tools are **JSON-RPC function signatures** (MCP-server-shaped primitives) that an agent invokes to execute a skill. They're a distinct conceptual layer from `domain_map.capabilities` (which are business-shaped abilities). Mixing them would bloat `capabilities` with infrastructure-flavored rows like `transcribe_audio` that don't belong in a business catalog.

### Core entities

| Entity | Holds | Examples |
|---|---|---|
| `tools` | A single JSON-RPC function the agent can call. Verb-shaped, abstract — *not* a concrete vendor API. Classified by `operation_kind` (see below). One row per function signature. | `send_email`, `query_invoices`, `transcribe_audio`, `create_calendar_event`, `post_chat_message`, `update_employee_record`, `execute_payment`, `sign_document`, `extract_entities`, `web_scrape` |
| `skills` | The skills that have tool requirements. First-class entity in `tool_catalog` (per q1 — skill catalog is a planned site surface). `skill_name`, `skill_type` enum (`system` / `process` / `role`), `description`, optional FK to `domain_map.domains` for system skills. | `domain-map-analyst`, `itsm-analyst`, `onboarding-process`, `lead-to-cash` |

### Junctions

| Junction | Purpose | Qualifier columns |
|---|---|---|
| `tool_solutions` | **N:M between `tools` and `domain_map.solutions`.** Which solutions provide which tools — i.e. "the org has M365 in their portfolio, so they can use `send_email` via the M365 MCP server." | `delivery_strength` enum (`native` / `partial` / `via_extension` / `not_supported`); `delivery_method` enum (`mcp_server` / `rest_api` / `sdk` / `cli`); optional `endpoint_url` (MCP server URL or API base when known) |
| `skill_tools` | Which skills require which tools | `requirement_level` enum (`required` / `optional` / `fallback`); `notes` for workflow context |

### Discriminator enums

#### `tools.operation_kind` — what the JSON-RPC function does

| Value | Semantics | Has `data_object_id` FK? | Examples |
|---|---|---|---|
| `query` | Read structured business data | yes | `query_invoices`, `read_employees`, `get_contract_status`, `search_orders` |
| `mutate` | Write/update structured business data | yes | `update_invoice_status`, `create_employee`, `write_contract_terms` |
| `side_effect` | External action with no business-data return; verb-shaped | no | `send_email`, `post_chat_message`, `sign_document`, `make_phone_call`, `execute_payment` |
| `compute` | Pure computation / AI / web automation — no persistent business side-effect | no | `extract_entities`, `transcribe_audio`, `web_scrape`, `generate_image` |

`tools.data_object_id` is an optional FK to `domain_map.data_objects` — populated when `operation_kind` is `query` or `mutate`, null otherwise. This is what lets an agent reason about "I need to read invoices" abstractly without knowing whether they live in Semantius or in SAP.

#### `domain_map.solutions.solution_kind` — new column on the existing solutions table

This is **the only schema change in `domain_map` required by this plan**. Adds a column to classify solutions from the agent-execution perspective:

| Value | What the solution is, agent-side | Counts as "Semantius core"? |
|---|---|---|
| `semantius_native` | The solution IS Semantius itself — its `tool_solutions` rows expose semantius_crud / semantius_cube / semantius_jsonlogic | yes |
| `external_connector` | The solution is a system of record (SAP, NetSuite, Salesforce, Workday). Agent reads/writes via an MCP server or REST API wrapping it. | no |
| `action` | The solution provides side-effect operations (Microsoft Graph Mail, Twilio SMS, DocuSign, Stripe). No business data store. | no |
| `compute_service` | The solution provides compute/AI/automation (OpenAI, Anthropic, Playwright, AWS Textract). No persistent data. | no |
| `standard_solution` | Default — a normal enterprise software solution from `domain_map` that isn't (yet) integrated as a tool source. | n/a |

Most existing `domain_map.solutions` rows stay `standard_solution`. A growing subset will be promoted to `external_connector` / `action` / `compute_service` as their MCP servers / API tools are loaded into `tool_solutions`.

### Why this shape

**Tools are 1:N solutions, naturally.** A single `send_email` tool is provided by an M365 MCP server, a Gmail MCP server, a SendGrid REST endpoint, an AWS SES SDK, etc. Each is a separate `tool_solutions` row. An org with M365 in their portfolio (a `solutions` row in their deployment) can satisfy `send_email` via that row — the portfolio check is just a join.

**Vendor is reachable via solution.** Don't duplicate vendor on `tools`. Every solution has `vendor_id` already; queries that need "who makes the tool that delivers send_email for our M365 deployment?" join through `solutions.vendor_id`.

**MCP-native.** `delivery_method='mcp_server'` + `endpoint_url` captures the JSON-RPC-over-MCP model directly. Tools not yet MCP-exposed get `delivery_method='rest_api'` / `'sdk'` and degrade gracefully.

**No capabilities bloat.** Business capabilities (`Lead Management`, `Incident Management`) stay in `domain_map.capabilities`. JSON-RPC tool primitives (`transcribe_audio`, `send_email`) live in `tool_catalog.tools`. Different concept, different table.

### Worked example — Zylo-style SaaS Spend Optimization skill

A skill that scans AP invoices for SaaS-vendor charges to flag unmanaged subscriptions. Required tools:

| Tool | operation_kind | data_object | Notes |
|---|---|---|---|
| `query_invoices` | `query` | `invoices` | Read AP invoice lines |
| `query_saas_subscriptions` | `query` | `saas_subscriptions` | Cross-check against known subs |
| `query_contracts` | `query` | `contracts` | Tie spend back to contracts |
| `mutate_saas_subscriptions` | `mutate` | `saas_subscriptions` | Create newly-discovered sub records |
| `send_email` | `side_effect` | — | Notify SaaS owner of unmanaged spend |

Whether this skill is "100% Semantius" depends on *which solutions in the deployed org's portfolio* provide each tool — checkable via `tool_solutions` joined to the org's solution inventory:

| Org configuration | 100% Semantius? |
|---|---|
| Accounting (`invoices`), SMP (`saas_subscriptions`), CLM (`contracts`) all hosted as Semantius modules — `send_email` optional | ✅ Yes (all `query`/`mutate` tools provided by `semantius_native` solutions; `send_email` excluded as optional) |
| Same as above but `send_email` is `required` | ❌ No — `send_email` only has `action` solutions (Microsoft Graph Mail, etc.) |
| `invoices` in SAP, others in Semantius | ❌ No — `query_invoices` only has `external_connector` solutions (SAP S/4HANA) |
| `invoices` and `contracts` in Semantius, `saas_subscriptions` in Zylo (external) | ❌ No — `query_saas_subscriptions` needs Zylo Connector (`external_connector`) |

## Tool discovery procedure (per skill)

```
For each skill (system, process, or role):
  1. Enumerate the workflows the skill owns

  2. For each workflow, identify every tool (JSON-RPC function) it needs,
     classified by operation_kind:
     a. query / mutate operations against a data_object:
        - "Scan AP invoices for SaaS charges" → query_invoices (query on `invoices`)
        - "Create a newly-discovered subscription record" → mutate_saas_subscriptions
        - "Look up the contract for this vendor" → query_contracts
     b. side_effect operations:
        - "Send confirmation email" → send_email
        - "Create day-1 calendar invite" → create_calendar_event
        - "Trigger DocuSign envelope" → sign_document
     c. compute operations:
        - "Extract vendor name from invoice PDF" → extract_entities
        - "Transcribe a customer call recording" → transcribe_audio

  3. Map each function to a `tools` row (create if missing).
     Set operation_kind + data_object_id (for query/mutate) correctly so
     the 100% Semantius derivation works.

  4. Insert `skill_tools` row with requirement_level + notes.

  5. For each tool, surface candidate solutions from `tool_solutions`:
     - query/mutate tools: candidate solutions are those that master the
       data_object (cross-reference with `domain_map.solution_data_objects`).
       The org's portfolio decides:
         - Semantius accounting module in portfolio → semantius_native solution wins
         - SAP S/4HANA in portfolio → SAP solution (external_connector)
         - NetSuite in portfolio → NetSuite (external_connector)
     - side_effect / compute tools: candidate solutions are always external
       (action or compute_service kind) — M365 / Gmail / Twilio / OpenAI / etc.
```

The workflow-enumeration step is the analyst-judgment part. For **system skills** the workflows are derivable from the module's `data_objects` masters + `cross_domain_handoffs` outbound. For **process skills** they come directly from the handoff cluster surfaced by [`plan-process-skill-discovery.md` step 7](plan-process-skill-discovery.md).

## "100% Semantius" identification

A skill is 100% Semantius **iff every required tool has at least one `tool_solutions` row where the solution has `solution_kind='semantius_native'`** (and the delivery_strength is native or partial).

The query:

```sql
-- Skills where every required tool has at least one semantius_native delivery
SELECT s.skill_name
FROM skills s
WHERE NOT EXISTS (
  -- Find any required tool that does NOT have a semantius_native solution
  SELECT 1
  FROM skill_tools st
  WHERE st.skill_id = s.id
    AND st.requirement_level = 'required'
    AND NOT EXISTS (
      SELECT 1
      FROM tool_solutions ts
      JOIN domain_map.solutions sol ON sol.id = ts.solution_id
      WHERE ts.tool_id = st.tool_id
        AND sol.solution_kind = 'semantius_native'
        AND ts.delivery_strength IN ('native','partial')
    )
);
```

The diagnostic query — *why* a skill isn't 100% Semantius:

```sql
-- For each non-Semantius skill, surface tools that have no semantius_native solution
SELECT s.skill_name, t.tool_name, t.operation_kind,
       -- What solution_kinds CAN deliver this tool?
       (SELECT string_agg(DISTINCT sol.solution_kind, ', ')
        FROM tool_solutions ts
        JOIN domain_map.solutions sol ON sol.id = ts.solution_id
        WHERE ts.tool_id = t.id) AS available_via
FROM skill_tools st
JOIN skills s ON s.id = st.skill_id
JOIN tools t ON t.id = st.tool_id
WHERE st.requirement_level = 'required'
  AND NOT EXISTS (
    SELECT 1 FROM tool_solutions ts
    JOIN domain_map.solutions sol ON sol.id = ts.solution_id
    WHERE ts.tool_id = t.id AND sol.solution_kind = 'semantius_native'
  );
```

This tells you **which tools** force a skill out of "100% Semantius" and which solution kinds (`external_connector`, `action`, `compute_service`) are the alternatives. The "what would we need to integrate?" gap-analysis falls out directly.

### Likely 100% Semantius candidates (initial hypothesis to validate)

Domains whose corresponding system skill would need **CRUD + analytics + JsonLogic only**, no external side-effects:

| Domain | Why it's likely 100% Semantius |
|---|---|
| **GRC** | Policy / control / risk records; assessments; audit-evidence tracking — all internal |
| **AUDIT** | Audit plans, findings, remediation tracking — internal |
| **APM** | Application portfolio records, lifecycle ratings — internal |
| **CMDB** | Configuration items + relationships — internal |
| **SPM** | Strategic portfolio, investment selection — internal |
| **DCG / DQ / MDM** | Data catalog, data quality, master data — internal metadata |
| **PA** | People analytics — internal aggregation |
| **SWP** | Strategic workforce planning — internal modelling |
| **EPM** | Financial planning, consolidation — internal |
| **ESG** | Sustainability reporting records — internal |

### Domains that are NOT 100% Semantius (always need external tools)

| Domain | Required external tool(s) |
|---|---|
| **ITSM** | Notifications / paging — email + chat + maybe phone |
| **HCM / Onboarding** | Email + calendar + IGA-provisioning callouts |
| **ATS** | Candidate email + interview calendar |
| **MA / SMM** | External send/post — THAT IS THE CAPABILITY |
| **CCAAS** | Real-time voice — Twilio/Genesys/etc. |
| **ESIGN** | Signature ceremony — DocuSign-class vendor |
| **PAYROLL** | Bank ACH integration |
| **S2P** | Supplier electronic exchange / EDI |
| **B2C-COMM** | Payment processing + shipping integrations |
| **LMS** | Video hosting + SCORM playback |

The full classification emerges from running the discovery procedure across every domain.

## Deliverable

1. A `tool_catalog` Semantius module with the entities (`tools`, `skills`) and junctions (`tool_solutions`, `skill_tools`)
2. One added column on existing `domain_map.solutions`: `solution_kind` enum (`semantius_native` / `external_connector` / `action` / `compute_service` / `standard_solution`)
3. ~40-50 `tools` (JSON-RPC function signatures, the controlled vocabulary)
4. ~30-50 solutions classified into the tool-relevant `solution_kind` values (most existing solutions stay `standard_solution`; a subset get promoted to `external_connector` / `action` / `compute_service`); ~100-200 `tool_solutions` rows
5. Populated `skill_tools` for each `domain_map` domain's hypothetical system skill (the discovery exercise per domain)
6. The "**100% Semantius certified**" view as a saved query

## Sequence

| # | Work | Output | Est |
|---|---|---|---|
| 1 | Design the `tool_catalog` semantic model (`tools` + `skills` entities; `tool_solutions` + `skill_tools` junctions). Use `semantic-model-analyst` to produce the `*-semantic-model.md` spec. Also include the `solution_kind` enum column addition for `domain_map.solutions`. | Schema spec | ~1 session |
| 2 | Deploy the model. Use `semantic-model-deployer` against the spec from step 1. Apply the `solution_kind` enum addition to `domain_map.solutions` and backfill all existing rows to `solution_kind='standard_solution'`. | Live module | ~1 hr |
| 3 | Load `tools` vocabulary (~40 rows) — JSON-RPC function signatures with `operation_kind` + optional `data_object_id`. Start from the verb list in the conceptual model above. Include the three Semantius pseudo-functions (`semantius_crud`, `semantius_cube`, `semantius_jsonlogic`) as `tools` rows so they participate in the matrix. | Tool vocabulary | ~1 session |
| 4 | Load `tool_solutions` rows + promote relevant `solutions` to the right `solution_kind`. For each tool, identify the solutions that deliver it: M365 (action) for `send_email`, OpenAI Platform (compute_service) for `transcribe_audio`, NetSuite (external_connector) for `query_invoices`, Semantius (semantius_native) for any `query_<x>` where x is a Semantius-hosted data_object, etc. Cross-link to existing `domain_map.solutions` where the solution already exists. Add new solution rows for tool sources not yet in the catalog (AWS SES, Playwright, etc.). | Reference matrix | ~1 session |
| 5A | For each **system skill** (one per `domain_map` domain), draft the `skill_tools` rows. Derive from the domain's data_object masters + outbound handoffs + typical workflow patterns. **Runs independently of process-skill discovery** — only needs `domain_map` data that already exists. | System-skill tool requirements (~10-30 domains × 1-5 tools each) | ~3-5 sessions (one per cluster) |
| 5B | For each **process skill** (from the top candidates surfaced by Plan 1 step 7), enumerate workflows and identify required tools. Insert `skill_tools` rows per process. **Depends on [`plan-process-skill-discovery.md`](plan-process-skill-discovery.md) step 7 being complete.** | Process-skill tool requirements | ~1 session per candidate process skill |
| 6 | Run the "100% Semantius" query. Produce the certified list. Re-runnable any time; a preview after 5A alone is meaningful for system skills. | Strategic output | ~1 hr |
| 7 | Identify the highest-impact tool gaps (tools needed by many skills but with few candidate solutions delivering them) and prioritise the next tool integrations. | Roadmap | ~1 session |

## Open questions

*All open questions resolved before drafting v1. See "Closed questions" below.*

## Closed questions

- **q1 — `skills` is a first-class entity.** Lives in `tool_catalog` (skill catalog is a planned site surface). Columns: `skill_name` (natural key), `skill_type` enum (`system` / `process` / `role`), `description`, optional `domain_id` FK to `domain_map.domains` for system skills, optional links to processes (FK or notes) for process skills. Lifecycle status (`proposed` / `in_design` / `built` / `deployed` / `deprecated`) added when needed; v1 can ship without.
- **q2 — Tool ↔ solution is N:M via `tool_solutions` junction.** Resolved by your push: tools are abstract JSON-RPC functions; multiple solutions can provide the same tool (M365 / Gmail / SES all deliver `send_email`). Vendor is reachable via `domain_map.solutions.vendor_id` — no separate `tool_vendors` table, no redundant vendor FK on `tools`. The org's portfolio determines availability through a `tool_solutions` join.
- **q3 — Semantius core = three special `tools` rows.** Load `semantius_crud`, `semantius_cube`, `semantius_jsonlogic` as `tools` entries. A "Semantius" solution row exists in `domain_map.solutions` (or is added if missing) with `solution_kind='semantius_native'`. The three tools each have a `tool_solutions` row pointing at it. The "100% Semantius" check then becomes a uniform query — no special-case logic.
- **q4 — Operation-level granularity.** A skill that "sends onboarding kickoff email" is one `skill_tools` row pointing at the `send_email` tool with workflow context in `notes`. Templates / recipient resolution / personalisation are skill-internal concerns, not catalog concerns.
- **q5 — Tool authentication: deferred.** Auth shape varies wildly per vendor (OAuth2 with different scope namespaces, API keys with different rotation rules, service accounts, webhooks). Capturing it at catalog level is premature bloat for v1. Auth is the integrator's runtime concern. The catalog records *that* a tool exists; the integrator handles *how* it authenticates.
- **q6 — Tool tenancy: deferred.** Multi-tenant modelling (separate `tool_instance` per org tenant) is out of scope for v1. Tools are catalog-level abstract entries; tenant binding lives at deployment time.

## Success criteria

- The `tool_catalog` module is loaded and queryable via cube
- `domain_map.solutions.solution_kind` populated for all rows (most `standard_solution`, ~30-50 promoted to tool-relevant kinds)
- ≥40 `tools` loaded with `operation_kind` set
- ≥100 `tool_solutions` rows across the loaded tools and the corresponding solutions
- ≥50 `skill_tools` rows across ≥10 system skills
- Running the "100% Semantius" query returns ≥5 system skills certified
- Running "which tools have the most dependent skills?" + "which tools have many skills but few candidate solutions?" surfaces the prioritised integration roadmap

## Out of scope for this plan

- Actually integrating any of the tools (each integration is downstream work)
- Skill registry as a first-class module — that's a separate design
- Pricing / billing per tool usage (cost is captured as a band, not as an integration)
- Tool security / scope review — handled at integration time, not in the catalog

## Cross-reference

- [`plan-process-skill-discovery.md`](plan-process-skill-discovery.md) feeds this plan: process skills surfaced there get their tool requirements modelled here.
- Combined: Plan 1 produces *which skills to build*; Plan 2 produces *what each skill needs*. Together they answer the build-sequence question (100% Semantius first → Semantius + basic tools next → vendor-specific integrations last).
- **Cross-plan staging**: the dependency is asymmetric, not circular. Step 5A is independent of Plan 1; step 5B depends on Plan 1 step 7. See [`plan-master-tasks.md`](plan-master-tasks.md) for the staged, checklisted view across both plans.

---

## Operational status

This file is the **design intent only** — stable.
For task tracking, progress checkboxes, and cross-plan staging, see **[`plan-master-tasks.md`](plan-master-tasks.md)** (the single source of truth for operational state across both plans).
