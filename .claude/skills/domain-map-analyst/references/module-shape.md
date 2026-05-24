# Domain Map — module shape reference

Per-entity field shapes for the `domain_map` module (Semantius slug `domain_map`, id `1001`). Verified against the live schema; auto-generated fields (`id`, `created_at`, `updated_at`, `search_vector`, label columns like `vendor_name`/`solution_name`/`domain_name`) are omitted — never set them on insert, they're managed by the platform.

`record_status` is on every entity, is an enum (`new` / `pending` / `approved` / `rejected`), and **defaults to `"new"`**. Omit it on insert unless explicitly setting a different value the user has signed off on.

If anything here conflicts with the live schema, trust the live schema and update this file:

```bash
semantius call crud postgrestRequest '{"method":"GET","path":"/fields?table_name=eq.<name>&is_core=eq.false&select=field_name,format,reference_table,enum_values,is_nullable,default_value&order=field_order.asc"}'
```

---

## Core concepts

### `domains`

| Field | Format | Required | Notes |
|---|---|---|---|
| `domain_code` | string | yes | Natural key. SHOUTY-KEBAB-CASE (`ITSM`, `VULN-MGMT`, `OP-RES`) |
| `description` | multiline | yes | Capture sub-features here when they don't justify their own row |
| `parent_domain_id` | reference → `domains` | no | Use only when both levels have independent vendor competition |
| `industry_id` | reference → `industries` | no | Set when the domain is specific to one industry (BANK-OPS → Banking, HC-PATIENT → Healthcare Providers). Leave null for horizontal/cross-industry domains. Single-FK on purpose — migrate to a junction if a domain ever needs to span multiple top-level industries |
| `certification_required` | boolean | yes | Default `false`. TRUE when either (a) the **product** needs formal certification or regulator approval to enter the market (German Finanzamt-certified accounting / GoBD; FDA 510(k) for CLIN-DEV; banking regulator for BANK-OPS; NERC-CIP for UTIL-OPS) **or** (b) the **vendor / implementation partner** must be certified, so the domain cannot be served OOTB — only via a certified delivery. Use as a quick filter for constraint-heavy domains |
| `crud_percentage` | number (int, 0–100) | yes | Share of the domain expressible as CRUD + state-based workflows + computed fields + ABAC — i.e. everything declarable in JsonLogic. The remainder is the part needing custom code; describe that remainder in `business_logic`. Existing rows cluster at 95 (pure forms-and-workflow markets like HRSD, AUDIT, CMDB) down to ~50 (CCaaS, RevRec). 0 means "not assessed" — always assess on insert |
| `business_logic` | multiline | yes | Describes what in the domain goes **beyond** the JsonLogic-expressible slice — the non-declarative computation. Empty string only acceptable when `crud_percentage >= 95` (the whole market fits the JsonLogic-declarable shape). Examples: TPRM "Risk scoring rules over questionnaire responses"; EAM "Preventive-maintenance scheduling rules driven by meter readings"; CCaaS "ACD/routing engine, IVR runtime, real-time analytics"; SUB-MGMT "Revenue recognition under ASC 606/IFRS 15, proration, dunning" |
| `min_org_size` | enum | yes | Smallest realistic buyer org by headcount. Values: `10 xs <50`, `20 s <500`, `30 m <2500`, `40 l <10000`, `50 xl 10000+`. The number prefix is a sort key, the t-shirt size is the conventional label, the `<N` / `N+` is the headcount upper bound. Examples: VIS-MGMT → `10 xs <50` (tiny offices buy Envoy); HRSD/CMDB → `30 m <2500` (mid-market and up); core banking → `50 xl 10000+`. Empty string means "not assessed" — always assess on insert |
| `cost_band` | enum | yes | Estimated yearly TCO for a 500-user org. Values: `$` (<$25k), `$$` ($25k–$100k), `$$$` ($100k–$500k), `$$$$` ($500k–$2M), `$$$$$` (>$2M). The 500-user anchor is fixed so bands stay comparable across markets — do **not** quote a different headcount. Examples: VIS-MGMT → `$`; HAM (Lansweeper) → `$$`; SUB-MGMT (Zuora) → `$$$`; major CCaaS (NICE/Genesys), large CRM (Salesforce), ServiceNow ITSM → `$$$$`; tier-1 ERP (S/4HANA), core banking → `$$$$$`. Empty string means "not assessed" — always assess on insert |
| `usa_market_size_usd_m` | number (int, millions USD) | yes | US-only TAM in millions of USD. Source from public analyst figures (Gartner, IDC, Forrester) or triangulate from vendor public-revenue disclosures. 0 means "not assessed" — try to fill; only legitimate to leave at 0 if no credible figure exists and that's been explicitly noted |
| `market_size_source_year` | number (int, YYYY) | yes | Calendar year of the market-size figure (e.g. 2024). Always pair with `usa_market_size_usd_m`; never set one without the other. 0 means "not assessed" |
| `record_status` | enum | yes | Default `new` |

Label column: `domain_name` (auto-managed by `create_entity`; set it once at entity creation, not on inserts).

**Domain-row populate-on-insert checklist.** Every new `domains` row must have all of: `domain_code`, `domain_name`, `description`, `crud_percentage`, `business_logic` (or `""` only if `crud_percentage >= 95`), `min_org_size`, `cost_band`, `certification_required`, `usa_market_size_usd_m`, `market_size_source_year`. The first three are obvious; the latter seven are easy to miss because the API accepts defaults. They drive analytical filters (which markets are SMB-only, which are JsonLogic-friendly, which need certification) — leaving them at zero/empty silently corrupts those filters. See SKILL.md rule #8.

### `vendors`

| Field | Format | Required | Notes |
|---|---|---|---|
| `description` | multiline | yes | |
| `vendor_url` | url | yes | Canonical homepage. Empty string acceptable |
| `headquarters_country` | string | yes | E.g. "USA", "Germany", "Netherlands" |
| `notes` | multiline | yes | Acquisition history goes here |
| `record_status` | enum | yes | Default `new` |

Label column: `vendor_name`.

### `solutions`

| Field | Format | Required | Notes |
|---|---|---|---|
| `description` | multiline | yes | |
| `solution_url` | url | yes | Empty string acceptable |
| `vendor_id` | reference → `vendors` | no | Nullable for internal builds / manual processes |
| `solution_type` | enum | yes | `saas` / `on_prem` / `hybrid` / `open_source` / `internal_build` / `manual_process` |
| `is_active_in_market` | boolean | yes | `false` for sunset / retired products |
| `solution_kind` | enum | yes | Default `standard_solution`. Classifies non-Semantius solutions by integration role. Values: `external_connector` (system of record — SAP, NetSuite, Salesforce CRM), `action` (side-effect service — M365, Twilio, DocuSign, Stripe), `compute_service` (compute / AI / web-automation — OpenAI Platform, Anthropic API, Playwright), `standard_solution` (default; not yet integrated as a tool source). **Semantius itself is NOT in this enum** — Semantius coverage is intrinsic to `tools.operation_kind`, not modeled as a solution row. Promote a row out of `standard_solution` only when at least one `tool_solutions` row references it |
| `notes` | multiline | yes | |
| `record_status` | enum | yes | Default `new` |

Label column: `solution_name`.

### `capabilities`

| Field | Format | Required | Notes |
|---|---|---|---|
| `capability_code` | string | yes | Natural key. SHOUTY-KEBAB-CASE |
| `description` | multiline | yes | |
| `parent_capability_id` | reference → `capabilities` | no | |
| `record_status` | enum | yes | Default `new` |

Label column: `capability_name`.

### `industries`

| Field | Format | Required | Notes |
|---|---|---|---|
| `description` | multiline | yes | |
| `naics_code` | string | yes | NAICS classification code. Empty string if unknown |
| `parent_industry_id` | reference → `industries` | no | E.g. Banking → Retail Banking |
| `record_status` | enum | yes | Default `new` |

Label column: `industry_name`.

### `jurisdictions`

| Field | Format | Required | Notes |
|---|---|---|---|
| `jurisdiction_code` | string | yes | ISO code or similar (`DE`, `US-CA`, `EU`) |
| `jurisdiction_type` | enum | yes | `country` / `region` / `state_or_province` / `supranational` / `international` / `municipal`. Default `country`. Use `international` for global frameworks (ISO, SOC 2, PCI-DSS, IFRS, TCFD) — distinct from `supranational` which is for regional blocs like EU |
| `description` | multiline | yes | |
| `parent_jurisdiction_id` | reference → `jurisdictions` | no | EU → Germany → Bavaria |
| `record_status` | enum | yes | Default `new` |

Label column: `jurisdiction_name`.

### `business_functions`

| Field | Format | Required | Notes |
|---|---|---|---|
| `description` | multiline | yes | |
| `parent_business_function_id` | reference → `business_functions` | no | Engineering → Frontend / Backend / Platform |
| `record_status` | enum | yes | Default `new` |

Label column: `business_function_name`.

### `processes`

| Field | Format | Required | Notes |
|---|---|---|---|
| `process_code` | string | yes | Natural key. PCF rows: literal PCF ID (`6.1.1`, `8.4.2.1`). Custom rows: `CUSTOM-<CLUSTER>-<SHORT-NAME>` (e.g. `CUSTOM-ONBOARD-DAY-1`). Per SKILL.md "Custom-process naming convention" |
| `description` | multiline | yes | PCF rows: verbatim from PCF Excel. Custom rows: authored description |
| `parent_process_id` | reference → `processes` | no | Self-ref; `reference_delete_mode: clear`. Null for level-1 categories |
| `source_framework` | enum | yes | **Discriminator.** `apqc_pcf_cross_industry` / `apqc_pcf_banking` / `apqc_pcf_consumer_products` / `apqc_pcf_electric_utilities` / `apqc_pcf_pharmaceutical` / `apqc_pcf_telecom` / `custom`. **No default — set explicitly so accidents are loud.** Only `apqc_pcf_cross_industry` is loaded today; industry-specific PCFs are placeholder enum values for future loads |
| `external_id` | string | yes | Framework's own identifier. PCF ID for any `apqc_pcf_*` row. Empty string for `custom` |
| `external_url` | url | yes | Optional pointer to source documentation. Empty string acceptable |
| `hierarchy_level` | number (int) | yes | 1–5 for PCF rows; 1–N for custom. Lets queries filter by depth without recursive CTEs |
| `record_status` | enum | yes | Default `new` |

Label column: `process_name` (human-friendly display, e.g. "Operate Procurement Operations"). The natural key is `process_code`.

License attribution for APQC PCF imports: see repo-level [`LICENSE-APQC-PCF.md`](../../../../LICENSE-APQC-PCF.md). No per-row attribution field needed.

### `data_objects`

| Field | Format | Required | Notes |
|---|---|---|---|
| `singular_label` | text | yes | Human-friendly singular form (`Job Requisition`, `Incident`). Distinct from `data_object_name` (snake_case_plural natural key). |
| `plural_label` | text | yes | Human-friendly plural form (`Job Requisitions`, `Incidents`). Irregular plurals are hand-correctable. |
| `display_label` | text | yes | Legacy column retained transitionally. Every new write goes to `singular_label`/`plural_label`. |
| `description` | multiline | yes | |
| `kind` | enum | yes | Default `domain_owned`. Values: `domain_owned`, `platform_builtin`. Seed today: `users` only as `platform_builtin`. |
| `is_canonical_bare_word` | boolean | yes | Default `false`. TRUE when this domain holds catalog-wide canonical authority for the bare-noun name (e.g. `customers`, `employees`, `incidents`, `assets`). Requires `naming_authority_rationale`. |
| `naming_authority_rationale` | text | yes | Empty string unless `is_canonical_bare_word=true`. Explains why this domain owns the unprefixed name catalog-wide. |
| `has_personal_content` | boolean | yes | Default `false`. TRUE when the data_object contains personal content where only the owner / specific actors see specific rows (e.g. interview scorecards, performance reviews, employee notes). Pattern-flag derivation produces `view_all_*` / `manage_all_*` permissions + edit-scope ABAC. |
| `has_submit_lock` | boolean | yes | Default `false`. TRUE when a state transition locks the record from further submitter edits (e.g. published knowledge_articles, submitted expense reports). Derivation produces `submit_<entity>` + restriction. |
| `has_single_approver` | boolean | yes | Default `false`. TRUE when one named approver field gates a workflow state (e.g. change approver, offer approver, request approver). Derivation produces `approve_<entity>_requires_approver` rule. |
| `record_status` | enum | yes | Default `new` |

Label column: `data_object_name` (natural key, snake_case_plural — `job_requisitions`, `incidents`). Industry/solution synonyms live in `data_object_aliases`, not here.

### `trigger_events`

| Field | Format | Required | Notes |
|---|---|---|---|
| `data_object_id` | reference → `data_objects` | yes | Which data_object's state changes. `reference_delete_mode: restrict` |
| `from_state` | string | yes | Originating state before the event. Free-text v1 (e.g. `submitted`, `pending`). Empty string for creation events |
| `to_state` | string | yes | Resulting state after the event. Free-text v1 (e.g. `accepted`, `closed`, `resolved`) |
| `description` | multiline | yes | What the event means: payload contents, downstream consequences, known failure modes |
| `event_category` | enum | yes | `lifecycle` / `state_change` / `threshold` / `signal`. New values appended as clusters surface them |
| `record_status` | enum | yes | Default `new` |

Label column: `event_name` (natural key AND human label — dotted snake-case, `offer.accepted`, `employee.created`, `incident.resolved`).

**One event, many subscribers** (per SKILL.md Phase D): a single `trigger_events` row is referenced by every `cross_domain_handoffs` row that has the same publisher event. Don't duplicate events per subscriber — it breaks the trigger-event-prefix clustering signal that Phase D depends on.

### `regulations`

| Field | Format | Required | Notes |
|---|---|---|---|
| `regulation_code` | string | yes | Short code (`GDPR`, `HIPAA`, `SOX`) |
| `regulation_type` | enum | yes | `data_privacy` / `financial_reporting` / `security` / `country_localization` / `accounting_standard` / `industry_standard` / `environmental` / `labor_law` / `other`. Default `other` |
| `jurisdiction_id` | reference → `jurisdictions` | no | **Always set.** For global frameworks, use the `International` jurisdiction row (jurisdiction_code `INTL`); for regional blocs use `European Union` (`EU`). Project rule: never leave this null — implicit nulls are forbidden in favor of explicit jurisdiction rows |
| `issuing_body` | string | yes | E.g. "European Commission", "US Congress" |
| `effective_date` | date | no | |
| `regulation_url` | url | yes | Empty string acceptable |
| `description` | multiline | yes | |
| `certification_required` | boolean | yes | Default `false`. TRUE when the regulation acts as a certification gate — a vendor cannot legally sell or operate without obtaining the cert (FedRAMP, StateRAMP, CMMC, FDA 510(k), FDA 21 CFR Part 820, EU MDR, EU AI Act CE marking, EU CRA, eIDAS QTSP, DORA, NERC-CIP, ISO 27001, SOC 2, PCI-DSS, Section 508 VPAT) |
| `record_status` | enum | yes | Default `new` |

Label column: `regulation_name`.

---

## Junctions

All junction tables use the `parent` FK format on both sides (`reference_delete_mode: cascade`) — deleting a parent deletes the junction row. Insert as `{ "<left>_id": <id>, "<right>_id": <id>, <qualifier>: <value>, "notes": "" }`. `record_status` defaults to `new` — omit it.

### `solution_domains`

| Field | Format | Required | Notes |
|---|---|---|---|
| `solution_id` | parent → `solutions` | yes | |
| `domain_id` | parent → `domains` | yes | |
| `coverage_level` | enum | yes | `primary` / `secondary` / `partial` |
| `notes` | multiline | yes | |
| `record_status` | enum | yes | Default `new` |

### `solution_data_objects`

| Field | Format | Required | Notes |
|---|---|---|---|
| `solution_id` | parent → `solutions` | yes | |
| `data_object_id` | parent → `data_objects` | yes | |
| `ownership_role` | enum | yes | `system_of_record` / `system_of_reference` / `system_of_engagement` / `derived` |
| `notes` | multiline | yes | |
| `record_status` | enum | yes | Default `new` |

The data-silo map: rows here with the same `data_object_id` across multiple `solution_id`s are the silo.

### `domain_data_objects`

> **Under Rule #14**, once a domain has modules `domain_data_objects` is a **derived rollup** from `domain_module_data_objects` (group by `data_object_id`, strongest role wins). Don't hand-edit `domain_data_objects` for modularized domains; edit the module junction and let the rollup regenerate.

| Field | Format | Required | Notes |
|---|---|---|---|
| `domain_id` | parent → `domains` | yes | |
| `data_object_id` | parent → `data_objects` | yes | |
| `role` | enum | yes | `master` / `embedded_master` / `contributor` / `consumer` / `derived`. Default `master`. Multi-master rows are expected — different domains master different slices of shared objects. Capture the slice in `notes`. Multi-master count = Signal 1; embedded_master count = Signal 1b of the platform-vs-silos analysis. |
| `necessity` | enum | yes | `required` / `optional`. Default `required`. `master` rows always required. `embedded_master`/`contributor`/`consumer` rows are optional when the workflow tolerates absence in some deployments. |
| `notes` | multiline | yes | Free-text: which slice of the data object this domain masters/contributes/consumes. For `embedded_master` rows, also state the demotion path ("X local-masters Y when no Z is deployed; reads from Z when present"). |
| `record_status` | enum | yes | Default `new` |

Migrated from `mastery_role` (values `primary` / `secondary` / `derived`) on 2026-05-18. `primary` mapped to `master`. The old `secondary` value was a junk drawer; the new enum forces an explicit choice across five roles.

### `domain_regulations`

| Field | Format | Required | Notes |
|---|---|---|---|
| `domain_id` | parent → `domains` | yes | |
| `regulation_id` | parent → `regulations` | yes | |
| `applicability` | enum | yes | `mandatory` / `recommended` / `conditional` / `optional`. Default `recommended` |
| `condition_notes` | multiline | yes | Free text for *when* the regulation conditionally applies |
| `notes` | multiline | yes | |
| `record_status` | enum | yes | Default `new` |

### `capability_domains`

| Field | Format | Required | Notes |
|---|---|---|---|
| `capability_id` | parent → `capabilities` | yes | |
| `domain_id` | parent → `domains` | yes | |
| `notes` | multiline | yes | |
| `record_status` | enum | yes | Default `new` |

No qualifier on this junction — the semantic-home relationship is binary.

### `business_function_domains`

| Field | Format | Required | Notes |
|---|---|---|---|
| `business_function_id` | parent → `business_functions` | yes | |
| `domain_id` | parent → `domains` | yes | |
| `responsibility_type` | enum | yes | `owner` / `contributor` / `consumer` (field is `responsibility_type`, not `responsibility`) |
| `notes` | multiline | yes | |
| `record_status` | enum | yes | Default `new` |

### `business_function_capabilities`

| Field | Format | Required | Notes |
|---|---|---|---|
| `business_function_id` | parent → `business_functions` | yes | |
| `capability_id` | parent → `capabilities` | yes | |
| `responsibility_type` | enum | yes | `owner` / `contributor` / `consumer` |
| `notes` | multiline | yes | |
| `record_status` | enum | yes | Default `new` |

### `industry_business_functions`

| Field | Format | Required | Notes |
|---|---|---|---|
| `industry_id` | parent → `industries` | yes | |
| `business_function_id` | parent → `business_functions` | yes | |
| `notes` | multiline | yes | |

No qualifier and no `record_status` on this junction — it's a pure presence-or-absence relationship.

### `cross_domain_handoffs`

Directional event-driven handoffs between two **distinct** domains, sharing a data object. Each row is an integration today (pipeline / API call / human handoff) that exists because source and target domains live in separate systems. Together with multi-master rows on [[#domain_data_objects]], this is the data the platform-vs-silos score reads.

| Field | Format | Required | Notes |
|---|---|---|---|
| `source_domain_id` | parent → `domains` | yes | Domain emitting the trigger event |
| `target_domain_id` | parent → `domains` | yes | Domain that receives and acts on the event |
| `data_object_id` | parent → `data_objects` | yes | The **per-edge payload** — the artifact in flight on this specific handoff. Distinct from `trigger_events.data_object_id` (the publisher's data_object). The two columns ARE allowed to differ. |
| `trigger_event_id` | reference → `trigger_events` | yes | FK to the published event (one event row, many subscribers). Per-edge integration metadata lives on this row; event semantics live on `trigger_events`. |
| `integration_pattern` | enum | yes | `event_stream` / `api_call` / `batch_sync` / `manual_handoff` / `file_drop`. Default `api_call` |
| `friction_level` | enum | yes | `low` / `medium` / `high`. Default `medium`. Proxy for today's maintenance cost — high friction = highest integrated-platform value |
| `description` | multiline | yes | What actually happens at the handoff: payload, downstream consequences, known failure modes |
| `notes` | multiline | yes | |
| `record_status` | enum | yes | Default `new` |

Label column (auto-computed): `cross_domain_handoff_label` = `<source_domain> → <target_domain> : <event_name>`.

**Hard invariant — `source_domain_id != target_domain_id`.** Enforced by validation rule `cross_domain_only`. Inserts with equal source/target return PostgREST 23514 with the rule's message. Intra-domain events (internal workflow inside one domain) are out of scope by design: they describe a domain's internal complexity, not integration friction, and would dilute the platform-candidacy score. If you later need to catalog intra-domain events for vendor-comparison purposes, add a separate `domain_events` entity rather than relaxing this constraint.

**Trigger-event ownership.** When a single trigger fires from one domain to multiple targets (e.g. `employee.created` → Onboarding + Payroll + IGA + Talent-Mgmt), **all four subscriber rows reference the SAME `trigger_events.id`** via `trigger_event_id`. Don't duplicate events per subscriber — it breaks the trigger-event-prefix clustering signal Phase D depends on.

### `data_object_relationships`

| Field | Format | Required | Notes |
|---|---|---|---|
| `data_object_id` | reference → `data_objects` | no | The "from" side. (Note: `reference` not `parent` — both sides) |
| `related_data_object_id` | reference → `data_objects` | no | The "to" side |
| `relationship_type` | enum | yes | `one_to_one` / `one_to_many` / `many_to_many`. Default `one_to_many` |
| `relationship_kind` | enum | yes | `composition` / `reference` / `association` / `inheritance`. Default `reference` |
| `relationship_verb` | string | yes | Forward verb phrase (e.g. "owns", "places", "is a") |
| `inverse_verb` | string | yes | Reverse phrase (e.g. "is owned by", "is placed by", "is supertype of") |
| `is_required` | boolean | yes | Whether the relationship is mandatory. Default `false` |
| `notes` | multiline | yes | |
| `record_status` | enum | yes | Default `new` |

Self-references allowed (`User` directly manages `User`).

### `data_object_aliases`

| Field | Format | Required | Notes |
|---|---|---|---|
| `data_object_id` | reference → `data_objects` | no | The canonical concept this is an alias for |
| `alias_type` | enum | yes | `synonym` / `industry_term` / `solution_term` (underscores, not hyphens). Default `synonym` |
| `industry_id` | reference → `industries` | no | Set when `alias_type = industry_term` |
| `solution_id` | reference → `solutions` | no | Set when `alias_type = solution_term` |
| `is_preferred` | boolean | yes | Whether this alias is the preferred display in its context. Default `false` |
| `notes` | multiline | yes | |
| `record_status` | enum | yes | Default `new` |

Label column: `alias_name`. Three flavors:
- **synonym**: pure synonym (`vendor` / `supplier` / `counterparty`), neither `industry_id` nor `solution_id` set.
- **industry_term**: `Customer` becomes `Patient` in Healthcare — set `industry_id`.
- **solution_term**: `Customer` becomes `Account` in Salesforce — set `solution_id`.

---

## Agent tooling layer

> Added 2026-05-21 (merged from the rolled-back `tool_catalog` sibling-module experiment). These four entities live in `domain_map` and join through `data_objects`, `domains`, and `solutions`. The 100% Semantius derivation reads through `solutions.solution_kind` (above).

### `tools`

| Field | Format | Required | Notes |
|---|---|---|---|
| `description` | multiline | yes | |
| `operation_kind` | enum | yes | Default `query`. Values: `query` (read structured business data), `mutate` (write structured business data), `side_effect` (external action with no business-data return — `send_email`, `create_calendar_event`), `compute` (pure computation / AI / web automation). Drives the 100% Semantius derivation |
| `data_object_id` | reference → `data_objects` | no | **Required when `operation_kind ∈ {query, mutate}`; must be null when `operation_kind ∈ {side_effect, compute}`.** Enforced by paired validation rules `data_object_only_when_query_or_mutate` and `data_object_required_when_query_or_mutate` |
| `record_status` | enum | yes | Default `new` |

Label column: `tool_name` (lowercase snake_case verb form — `send_email`, `query_invoices`, `transcribe_audio`).

### `skills`

| Field | Format | Required | Notes |
|---|---|---|---|
| `description` | multiline | yes | |
| `skill_type` | enum | yes | Default `system`. Values: `system` (mirrors one domain one-to-one), `process` (orchestrates a cross-domain handoff cluster), `role` (wraps a specific user-role workflow) |
| `domain_id` | reference → `domains` | no | **Required when `skill_type = 'system'`; null otherwise.** Enforced by `domain_required_when_skill_type_is_system` |
| `record_status` | enum | yes | Default `new` |

Label column: `skill_name` (lowercase snake_case or kebab-case — `domain-map-analyst`, `onboarding-process`, `lead-to-cash`).

### `tool_solutions` (junction: `tools` ↔ `solutions`)

| Field | Format | Required | Notes |
|---|---|---|---|
| `tool_id` | parent → `tools` | yes | Cascade on delete |
| `solution_id` | parent → `solutions` | yes | Cascade on delete |
| `delivery_strength` | enum | yes | Default `native`. Values: `native` (first-class capability), `partial` (covers most but not all use cases), `via_extension` (requires add-on / marketplace plugin), `not_supported` (recorded for completeness; excluded from coverage queries) |
| `delivery_method` | enum | yes | Default `mcp_server`. Values: `mcp_server` (preferred), `rest_api`, `sdk`, `cli` |
| `endpoint_url` | url | yes | MCP server URL or API base when known. Empty string acceptable |
| `notes` | multiline | yes | |
| `record_status` | enum | yes | Default `new` |

Label column: `tool_solution_label` (computed: `<tool_name> via <solution_name>`; auto-disabled in the UI). Intended-unique on `(tool_id, solution_id)` — caller-side dedup, platform's native unique annotation is single-column.

### `skill_tools` (junction: `skills` ↔ `tools`)

| Field | Format | Required | Notes |
|---|---|---|---|
| `skill_id` | parent → `skills` | yes | Cascade on delete |
| `tool_id` | parent → `tools` | yes | Cascade on delete |
| `requirement_level` | enum | yes | Default `required`. Values: `required` (skill cannot function without), `optional` (improves; degrades gracefully without), `fallback` (invoked only when a preferred tool is unavailable) |
| `notes` | multiline | yes | Workflow context, e.g. "called per matched invoice to notify the SaaS owner" |
| `record_status` | enum | yes | Default `new` |

Label column: `skill_tool_label` (computed: `<skill_name> needs <tool_name>`; auto-disabled in the UI). Intended-unique on `(skill_id, tool_id)` — caller-side dedup.

**Semantius coverage rollup (revised 2026-05-21):** Semantius coverage is intrinsic to `tools.operation_kind`. The enum partitions:

- **Semantius-covered (today):** `query`, `mutate` (delivered by CRUD + cube)
- **Not Semantius-covered (today):** `side_effect`, `compute` (no native email / SMS / AI / web-automation)

As Semantius gains new generic primitives, new `operation_kind` values are added (or existing ones split) and tools are reclassified. **Semantius is NOT a row in `solutions`. There are no pseudo-tools.** The `tool_solutions` matrix records non-Semantius deliveries only.

**Rollup query (per-tool aggregation):**

```
OOTB Semantius % for domain X =
  (count of X's required tools whose operation_kind ∈ {query, mutate})
  / (total required tools)
```

5 query tools + 1 send_email = 5/6 = 83% (not 50% — operation_kind classifies tools, but the tool is the unit of count).

**Customer Y coverage for skill Z:**

```
% = (count of Z's required tools where:
       operation_kind ∈ Semantius-covered set  OR
       at least one tool_solutions row links the tool to a solution Y has deployed)
    / (total required tools)
```

The diagnostic query (which tools force a skill below 100%) is the inverse: list Z's required tools whose `operation_kind` is NOT Semantius-covered AND has no `tool_solutions` row in Y's portfolio.

See [SKILL.md § Agent tooling layer](../SKILL.md#agent-tooling-layer-4-entities-added-2026-05-21) and [semantius-coverage-rollup.md](semantius-coverage-rollup.md) for the full rationale (per-tool aggregation, why no Semantius row in `solutions`).

---

## Module concept

> See [modules.md](modules.md) for the long-form rules (composability, lifecycle-permission materialization, minimum-shape contract, cross-cutting hosting). Schemas below.

### `domain_modules`

| Field | Format | Required | Notes |
|---|---|---|---|
| `domain_module_code` | text | yes | Natural key. SHOUTY-KEBAB-CASE, format `<DOMAIN>-<NOUN>` (`ATS-CANDIDATE-CRM`, `ITSM-INCIDENT-MGMT`) or bare-noun for cross-cutting (`KNOWLEDGE-MGMT`, `APPROVAL-WORKFLOW`) |
| `domain_module_name` | text | yes | Human-friendly label (`Candidate CRM`, `Incident Management`) |
| `domain_id` | reference → `domains` | no | Primary host. Nullable for genuinely-cross-cutting modules with no obvious home (`APPROVAL-WORKFLOW`). Cross-cutting modules with one obvious home use this column AND list additional hosts in `domain_module_host_domains`. |
| `description` | multiline | yes | |
| `record_status` | enum | yes | Default `new` |

### `domain_module_capabilities` (junction: `domain_modules` ↔ `capabilities`)

| Field | Format | Required | Notes |
|---|---|---|---|
| `domain_module_id` | parent → `domain_modules` | yes | |
| `capability_id` | parent → `capabilities` | yes | |
| `notes` | multiline | yes | |
| `record_status` | enum | yes | Default `new` |

Same capability can realize in multiple modules; same module can realize multiple capabilities. No qualifier.

### `domain_module_data_objects` (junction: `domain_modules` ↔ `data_objects`)

| Field | Format | Required | Notes |
|---|---|---|---|
| `domain_module_id` | parent → `domain_modules` | yes | |
| `data_object_id` | parent → `data_objects` | yes | |
| `role` | enum | yes | Same 5-value enum as `domain_data_objects`: `master` / `embedded_master` / `contributor` / `consumer` / `derived`. Default `master`. |
| `necessity` | enum | yes | `required` / `optional`. Default `required`. Narrower than the domain-layer column — only meaningful on `consumer`/`embedded_master` rows that gracefully degrade. |
| `notes` | multiline | yes | |
| `record_status` | enum | yes | Default `new` |

This is now the **authoritative** junction for module-level data_object ownership. `domain_data_objects` is a derived rollup once a domain has modules.

### `domain_module_host_domains` (junction: `domain_modules` ↔ `domains`)

| Field | Format | Required | Notes |
|---|---|---|---|
| `domain_module_id` | parent → `domain_modules` | yes | |
| `domain_id` | parent → `domains` | yes | The additional host (NOT the module's `domain_modules.domain_id`) |
| `notes` | multiline | yes | |
| `record_status` | enum | yes | Default `new` |

Records hosts beyond the primary `domain_modules.domain_id`. Convention: never both — if a module has a primary `domain_id`, host_domains rows name only the OTHER hosts.

### `domain_starter_modules` (junction: `domains` ↔ `domain_modules`)

| Field | Format | Required | Notes |
|---|---|---|---|
| `domain_id` | parent → `domains` | yes | |
| `domain_module_id` | parent → `domain_modules` | yes | |
| `position` | int | yes | 1-based ordering of the recommended-install sequence |
| `notes` | multiline | yes | Editorial copy emitted verbatim by the fact sheet generator ("Start here. Provides candidates, prospects, sourcing.") |
| `record_status` | enum | yes | Default `new` |

Editorial recommendation, not a gate, not a billing-package. Required on every domain with ≥3 capabilities per Rule #14. Domains with <3 capabilities have zero rows here.

---

## Lifecycle states

### `data_object_lifecycle_states`

| Field | Format | Required | Notes |
|---|---|---|---|
| `data_object_id` | reference → `data_objects` | yes | The master this state belongs to |
| `state_name` | text | yes | snake_case noun-form (`draft`, `submitted`, `approved`, `closed`). Used by `permission_verb_override` derivation. |
| `state_order` | int | yes | Ordering for the state machine; not a strict topological constraint, but the fact sheet emits states in this order |
| `is_initial` | boolean | yes | Default `false`. Exactly one state per data_object should have `is_initial=true`. |
| `is_terminal` | boolean | yes | Default `false`. Multiple terminal states are allowed (`closed`, `cancelled`, `rejected`). |
| `requires_permission` | boolean | yes | Default `false`. TRUE = transitioning *into* this state needs an explicit permission; produces a `<module>:<verb>_<entity>` workflow gate during permission materialization. |
| `permission_verb_override` | text | yes | Empty string unless auto-derivation produces a clumsy verb. Replaces `state_name` in the derived verb. Examples: `hired → hire_candidate`, `approved → approve_change`. |
| `domain_module_id` | reference → `domain_modules` | no | Nullable. NULL = state always reachable when the master is installed. Non-NULL = state realized only when that specific module is deployed (the deployer prunes unreachable states). The permission prefix at materialization time is the realizing module's `domain_module_code`. |
| `record_status` | enum | yes | Default `new` |

Permission materialization rule (per Rule #14 + Rule #12): for each row with `requires_permission=true`, the deployer creates `permissions.permission_name = <domain_module_code>:<verb>_<entity_singular>` where `<verb>` = `permission_verb_override` if set, else `state_name`. Override collisions (e.g. `candidates.hired` and `job_applications.hired` both overriding to `hire_candidate`) legitimately collapse to one permission fired by two transitions.

---

## Role layer

> See [roles.md](roles.md) for the long-form rules (hard invariants, two-path equivalence, bundling patterns). Schemas below.

### `roles` (Semantius built-in, extended)

| Field | Format | Required | Notes |
|---|---|---|---|
| `role_code` | text | yes | Natural key. `<FUNCTION-CODE>-<ROLE-NAME>` for function-scoped (`RECRUITING-RECRUITER`); bare for cross-functional (`HIRING-MANAGER`). |
| `role_name` | text | yes | Human-friendly label |
| `slug` | text | yes | snake_case (`recruiting_recruiter`). Enforced by built-in `valid_role_slug` check constraint. |
| `business_function_id` | reference → `business_functions` | no | Nullable. NULL = cross-functional. |
| `description` | multiline | yes | |
| `notes` | multiline | yes | |
| `record_status` | enum | yes | Default `new` |

### `role_modules` (junction: `roles` ↔ `domain_modules`, catalog-NEW)

| Field | Format | Required | Notes |
|---|---|---|---|
| `role_id` | parent → `roles` | yes | |
| `domain_module_id` | parent → `domain_modules` | yes | |
| `interaction_level` | enum | yes | `primary` / `secondary`. No `read_only` — bundle-only-read captures that case implicitly. |
| `notes` | multiline | yes | |
| `record_status` | enum | yes | Default `new` |

2-module floor: every role MUST have ≥2 `role_modules` entries. Single-module personas = permission tier, not a role.

### `role_permissions` (Semantius built-in, extended; junction: `roles` ↔ `permissions`)

| Field | Format | Required | Notes |
|---|---|---|---|
| `role_id` | parent → `roles` | yes | |
| `permission_id` | parent → `permissions` | yes | |
| `notes` | multiline | yes | |
| `record_status` | enum | yes | Default `new` |

Prefer tier-level grants (`<module>:admin`, `:manage`, `:read`) over enumerating every workflow gate. `permission_hierarchy` (Semantius built-in) auto-expands tier-level grants at request time.

### `permissions` (Semantius built-in, extended)

Catalog adds two columns to the built-in:

| Field | Format | Required | Notes |
|---|---|---|---|
| `domain_module_id` | reference → `domain_modules` | no | Nullable. NULL on built-in Semantius permissions. Set on catalog-derived permissions to record the realizing module. |
| `tier` | enum | yes | `baseline-read` / `baseline-manage` / `baseline-admin` / `workflow-gate` / `override`. Materialized from lifecycle states + pattern flags per the materialization rules in [modules.md](modules.md). |
