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
| `display_label` | text | yes | Human-friendly display label. Distinct from `data_object_name` (which acts as the natural key) |
| `description` | multiline | yes | |
| `record_status` | enum | yes | Default `new` |

Label column: `data_object_name` (natural key, e.g. `Job Requisition`). `display_label` is the presentation-friendly variant. Other variants (industry/solution synonyms) live in `data_object_aliases`, not here.

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

### `solution_capabilities`

| Field | Format | Required | Notes |
|---|---|---|---|
| `solution_id` | parent → `solutions` | yes | |
| `capability_id` | parent → `capabilities` | yes | |
| `delivery_strength` | enum | yes | `native` / `partial` / `via_extension` / `not_supported` |
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

| Field | Format | Required | Notes |
|---|---|---|---|
| `domain_id` | parent → `domains` | yes | |
| `data_object_id` | parent → `data_objects` | yes | |
| `role` | enum | yes | `master` / `contributor` / `consumer` / `derived`. Default `master`. Multi-master rows are allowed and expected — different domains often master different *slices* of a shared data object (`job_requisitions` mastered by ATS + Workforce Planning, `customers` by CRM + MDM + Billing). Capture the slice in `notes`. The count of `role='master'` rows per data_object is **Signal 1** of the platform-vs-silos analysis (see [[#cross_domain_handoffs]] for Signal 2) |
| `notes` | multiline | yes | Free-text: which slice of the data object this domain masters/contributes/consumes |
| `record_status` | enum | yes | Default `new` |

Migrated from `mastery_role` (values `primary` / `secondary` / `derived`) on 2026-05-18. `primary` mapped to `master`. The old `secondary` value was a junk drawer covering three distinct situations (consumes / contributes / co-masters); the new enum forces an explicit choice.

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
| `data_object_id` | parent → `data_objects` | yes | What flows / is created / mutated |
| `trigger_event` | text | yes | Dotted-lowercase event name (`offer.accepted`, `incident.resolved`, `requisition.approved`, `case.closed`). Acts as the row's discriminator when a (source, target, data_object) triple has multiple legitimate handoffs |
| `integration_pattern` | enum | yes | `event_stream` / `api_call` / `batch_sync` / `manual_handoff` / `file_drop`. Default `api_call` |
| `friction_level` | enum | yes | `low` / `medium` / `high`. Default `medium`. Proxy for today's maintenance cost — high friction = highest integrated-platform value |
| `description` | multiline | yes | What actually happens at the handoff: payload, downstream consequences, known failure modes |
| `notes` | multiline | yes | |
| `record_status` | enum | yes | Default `new` |

Label column (auto-computed): `cross_domain_handoff_label` = `<source_domain> → <target_domain> : <trigger_event>`.

**Hard invariant — `source_domain_id != target_domain_id`.** Enforced by validation rule `cross_domain_only`. Inserts with equal source/target return PostgREST 23514 with the rule's message. Intra-domain events (internal workflow inside one domain) are out of scope by design: they describe a domain's internal complexity, not integration friction, and would dilute the platform-candidacy score. If you later need to catalog intra-domain events for vendor-comparison purposes, add a separate `domain_events` entity rather than relaxing this constraint.

Inserts are **not** loaded yet — entity ships empty. Onboarding Task is the motivating first load (ATS → Onboarding on `offer.accepted`, Onboarding → ITSM on `task.it_provisioning_required`, etc.).

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
