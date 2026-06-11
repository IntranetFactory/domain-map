# FINOPS audit history

## 2026-05-30 (Validate b1, full 4-pass)

### Summary

- **Current footprint:** **0 `domain_modules` rows** (M1 hard fail, dominant blocker), **0 capabilities** (A2 hard fail), **5 solutions** linked (4 primary + 1 secondary: ServiceNow Cloud Insights, Apptio Cloudability, CloudHealth, Finout, Flexera One), **0 regulations**, **0 master data_objects** (expected per SKILL.md B1 leadership-tier exception), 1 consumer dependency on `supplier_invoices` (S2P-mastered, id 75) at the legacy `domain_data_objects` level only, no `domain_module_data_objects` coverage anywhere, 1 outbound + 8 inbound cross-domain handoffs (9 total cross-domain), 0 trigger_events authored from FINOPS (the one outbound row borrows S2P-mastered `supplier_invoices` as its event publisher, which is a B9 attribution defect, see B1-S6 below), 0 lifecycle states, 0 data_object_aliases on the consumed entity, **0 system skills** (F2 hard fail), 0 `skill_tools` rows, 0 roles, 0 `data_object_relationships` rows authored by FINOPS, and 0 `handoff_processes` (APQC) rows on any of the 9 cross-domain handoffs (H1 hard fail).
- **Vendor-surface basis** (Bucket 3): Apptio Cloudability (IBM), CloudHealth (Broadcom), Flexera One Cloud, Finout, ServiceNow Cloud Insights, plus pure-play FinOps specialists Vantage, Kubecost (for Kubernetes-scoped FinOps), CloudZero (unit economics), and AWS Cost Explorer / Azure Cost Management / GCP Billing as cloud-native baselines. Sample is the leader quadrant per current `solution_domains` plus four additional pure-plays (Vantage, Kubecost, CloudZero, ProsperOps) drawn from FinOps Foundation member directory. The FinOps Foundation (Linux Foundation) FOCUS specification (v1.0, 2024) is the industry-wide spec for billing-data normalization and is the regulation-shaped anchor for the domain.
- **Bucket 1 (in-scope, agent fixable):** **15 items** (11 STRUCTURAL band failures + 1 APQC TAGGING line covering 9 individual tag proposals + 1 BOUNDARY + 1 WRONG-OWNERSHIP + 1 MISSING-RELATIONSHIP entry routed inbound; counted per Rule #10/#11 of the subagent prompt as one B1 entry per `B1-S*` / `B1-H*` line item).
- **Bucket 2 (surface-for-user, judgment):** **5 items.**
- **Bucket 3 (Phase 0 pending, speculative):** **6 items.**
- **Candidates queued (`audits/_missing-domains.md`):** **4** (`KUBE-COST`, `CARBON-FOOTPRINT`, `CLOUD-COMMIT-OPTIM`, `FINOPS-UNIT-ECON`).

**Structural pass bands.** M1 hard-fail (0 modules), M2/M4/M5/M6 cascade (no modules to evaluate), A2 hard-fail (0 capabilities, below floor of ≥3), A3 partial-pass (5 solutions ≥3, but coverage_level set on all rows), A4 hard-fail (catalog_tagline and catalog_description both empty per A4 query), B1 vacuous-pass (FINOPS is leadership-tier per SKILL.md § Phase B, no masters expected), B5/B6/B7/B9/B9b/B10b/B11/B12 vacuous on FINOPS-mastered objects (nothing to attach), B8 vacuous-pass (no outbound masters to publish relationships from), C1 partial-pass (an owner row exists but on `Cloud Financial Operations`, a non-spine business_function, see B1-S3 below), C2 vacuous, D1 cannot be evaluated until modules ship, E1 vacuous (no modules, no roles possible), F1/F2/F3/F4/F5 hard-fail (no system skill exists for any module; no module exists at all), F7 vacuous, **H1 hard-fail** (zero `handoff_processes` on 9 cross-domain handoffs; volume target 5-7 `agent_curated` tags; this audit proposes 9).

**Pass 3 — Neighbor discovery** (auto-derived from outbound + inbound handoffs and cross-domain DMDO on the one consumer row):

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| S2P | 1 (198) | 0 | FINOPS consumer on `supplier_invoices` (mastered by S2P) | 0 | 2 | Lightweight |
| SMP | 0 | 2 (641, 643) | 0 | 0 | 2 | Lightweight |
| SPEND-MGMT | 0 | 1 (173) | 0 | 0 | 1 | Lightweight |
| SAM | 0 | 1 (637) | 0 | 0 | 1 | Lightweight |
| BI | 0 | 1 (691) | 0 | 0 | 1 | Lightweight |
| ESG | 0 | 1 (851) | 0 | 0 | 1 | Lightweight |
| APM | 0 | 1 (1196) | 0 | 0 | 1 | Lightweight |
| RE-INVEST | 0 | 1 (305) | 0 | 0 | 1 | Lightweight |

**No neighbor passes the edge-weight ≥3 threshold for the pairwise 5-section diff.** All 8 neighbors land in the lightweight summary section at the bottom (Report-only follow-ups). The dominant cross-cutting finding is that **FINOPS has zero deployable modules**, so every inbound handoff carries a NULL `target_domain_module_id` and the one outbound carries a NULL `source_domain_module_id`. These are also B10b failures the inbound handoffs surface against THIS domain (target side), so they cannot be resolved until M1 is cured. Pairwise reconciliation is collapsed below into the "post-modularization wiring sketch" inside B1-S5.

**Domain Semantius score (strict):** **uncomputable** per F5 (no system skill, no `skill_tools` rows). Will become computable once B1-S7 (Phase-S skill + tools) loads.

**Project hygiene flag (Rule #15 / no em-dash / American English).** The current `domains` row for FINOPS (id 41) carries an em-dash (U+2014) and three British spellings in `description` and `business_logic`:
- `description`: `Visibility, allocation, optimisation, and accountability for cloud spending across business units.` (British `optimisation`).
- `business_logic`: `Unit-cost allocation, anomaly detection, rightsizing recommendations, and commitment optimisation <U+2014> algorithm-led; the rest is reporting.` (British `optimisation` x1, em-dash x1).

Both columns fall under the no-em-dash and American English project rules (CLAUDE.md). Surfaced as B1-S11.

### Bucket 1 (in-scope confirmed gaps)

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 (hard fail, dominant blocker)** | Zero `domain_modules` rows for FINOPS (`domain_id=41`); zero `domain_module_host_domains.domain_id=41` rows. Rule #14 requires every `domains` row to host ≥1 `module_kind='full'` module. Leadership-tier domains (per SKILL.md B1 exception list) still need a module to preserve the deploy-target contract, typically a single landing module whose `domain_module_data_objects` set may be empty. FINOPS has 0 capabilities so falls under the M2 single-module-acceptable case (`capability_count < 3`). Recommended minimum: one full module `FINOPS-COST-MGMT` (the catch-all) realizing the 3-5 capabilities drafted in B1-S2, OR a 2-module split `FINOPS-COST-ANALYTICS` + `FINOPS-OPTIM` if the capability count after B1-S2 lands at ≥3 (Rule #14 M2 kicks in). The split is the recommended default since flagship vendors (Cloudability, CloudHealth, Vantage) all separate the visibility / allocation surface from the optimization / commitment-management surface. | Author the module shape (1 or 2 modules), load via a focused loader; after B1-S2's capabilities ship, link via `domain_module_capabilities`; add `domain_module_data_objects` rows for the consumer / derived dependencies enumerated in B1-S5 below. Pre-flight per Rules #14 and #17. |
| B1-S2 | **A2 (hard fail)** | Zero `capability_domains` rows for FINOPS. Without capabilities the M4/M6 bipartite-coverage loop is unenforceable and the system-skill derivation has no surface to anchor against. Vendor-surface capabilities (drafted, pure-play union, snake_case-ish kebab codes per the cross-cutting convention): `FINOPS-COST-VISIBILITY` (Cloudability, CloudHealth, Finout, Vantage, ServiceNow Cloud Insights, native cost explorers, all five sample vendors), `FINOPS-COST-ALLOCATION` (chargeback, showback, tag-based allocation; 5/5 vendors), `FINOPS-ANOMALY-DETECTION` (5/5 vendors), `FINOPS-COMMITMENT-OPTIM` (Reserved Instance / Savings Plan management; 5/5 vendors plus ProsperOps), `FINOPS-RIGHTSIZING` (5/5 vendors), `FINOPS-FORECASTING` (Cloudability, CloudHealth, Vantage; 3/5 vendors), `FINOPS-UNIT-ECONOMICS` (CloudZero specialist + Vantage + Finout; 3/5 vendors with growing footprint), `FINOPS-KUBE-COST-ALLOC` (Kubecost specialist + native CloudHealth/Cloudability extensions; 3/5 vendors). | Draft 6-8 capability rows + `capability_domains` links; load via a focused loader. Decide domain-prefixed vs. domain-neutral per the Cross-cutting capability convention; `FINOPS-COST-ALLOCATION` is borderline domain-neutral (could span EPM, ERP-FIN reporting) but defer the cross-cutting decision until at least one more domain claims it. |
| B1-S3 | **C1 (partial fail)** | `business_function_domains` for FINOPS has one `responsibility_type='owner'` row pointing at a business_function `Cloud Financial Operations` (id 83, `parent_business_function_id=4`). The canonical 20-function spine (SKILL.md § Function spine) does NOT include `Cloud Financial Operations` as a top-level function; the spine for FinOps ownership is either `FINANCE` (cloud-cost is FP&A / IT finance) or `IT` (IT-cost-management lineage). The current owner row is a **bespoke business_function** outside the spine, which makes Phase-C semantics unstable: downstream RACI consumers cannot rely on `Cloud Financial Operations` appearing across other domains. Two contributor rows (`Software Engineering`, `IT Operations`) are spine-aligned. | Two valid fixes: (a) re-anchor the owner row to a spine function — `Finance` if the FinOps practice reports up through CFO (modern flagship pattern: FinOps Foundation 2024 State of FinOps report names CFO/Finance as the most common reporting line) OR `IT Operations` if the practice reports up through CIO (legacy pattern, ~30% of orgs). (b) Keep `Cloud Financial Operations` as a sub-function under `Finance` (set `parent_business_function_id` to the Finance id, currently the row has `parent=4` which is `Software Engineering` per the function_spine, also wrong), and add a spine-anchored owner row. **Surfaced to Bucket 2 (item 1) because the choice is org-pattern specific**, not a deterministic fix. |
| B1-S4 | **A4 (hard fail)** | `domains.catalog_tagline` and `domains.catalog_description` are both empty strings on FINOPS (id 41). Per Rule #20 these are buyer-facing required fields once a domain has any solutions linked. FINOPS has 5 solutions in `solution_domains` and is therefore in-scope for A4. | Draft buyer-voice tagline + 1-3 paragraph description; surface to the user before writing (Rule #20 once-only authoring). Draft tagline: "See, allocate, and optimize cloud spend before it surprises you at month-end." Draft description below in Bucket 2 item 2 for explicit user approval (A4 once-only). |
| B1-S5 | **B-band coverage rebuild (vacuous-pass → must-load)** | FINOPS today has ONE `domain_data_objects` row (consumer on `supplier_invoices` from S2P). Per the leadership-tier pattern (EPM, REV-INTEL, SALES-PERF, PA, ACCT-PLAN, GTM-PLAN), FINOPS derives signals against upstream data_objects rather than mastering its own. After the FINOPS modules ship (B1-S1), the following `domain_module_data_objects` rows are the floor for a deployable surface: **consumer rows** — `supplier_invoices` (S2P-mastered, today's existing dependency, migrate from legacy `domain_data_objects` to `domain_module_data_objects`), `software_licenses` (SAM-mastered, the inbound `software_license.under_consumed` handoff payload), `saas_applications` (SMP-mastered, the `saas_application.sanctioned` payload), `saas_usage_metrics` (SMP-mastered, the `saas_usage_metric.idle_threshold` payload), `card_transactions` (SPEND-MGMT-mastered, the `card_transaction.posted` payload), `bi_queries` (BI-mastered, the `bi_query.cost_threshold_breached` payload), `activity_data_records` (ESG-mastered, the `activity_data.recorded` payload — the carbon-impact view of cloud cost), `application_costs` (APM-mastered, the `application_cost.updated` payload). **derived rows** — none today; FINOPS could legitimately publish derived `cost_anomalies` or `commitment_recommendations` objects but these belong in Bucket 3 (Phase 0 vendor research required to confirm the catalog should master them rather than treat them as transient signals). Each consumer row gets `necessity` per the inbound handoff's friction-criticality: `required` for handoffs at `friction_level='high'`, `optional` otherwise. | Draft 8 `domain_module_data_objects` consumer rows distributed between `FINOPS-COST-MGMT` (or the split `FINOPS-COST-ANALYTICS` / `FINOPS-OPTIM` per B1-S1), load via a focused loader. Pre-flight per Rule #11 (every consumer points at a canonical master row that exists, which is already true for all 8 candidates). |
| B1-S6 | **B9 attribution defect (specific row)** | Trigger event id 158 (`cloud_spend.threshold_breached`) has `data_object_id=75` (`supplier_invoices`), which is **S2P-mastered, not FINOPS-mastered**. The event semantics in `trigger_events.description` are FinOps-native ("Cloud-provider spend exceeded a configured threshold (monthly, daily, per-account, per-service)"), and `supplier_invoices` is a wrong attribution choice: a cloud-cost threshold breach is published against a `cloud_cost_records` (or `cloud_spend_records`) object, not against an AP-side invoice. The correct upstream data_object does not yet exist in `data_objects`. This is a **multi-step fix**: (1) decide whether FINOPS should master a `cloud_cost_records` (Bucket 2 item 3 — leadership-tier domains usually do not master their own data, but cloud cost is unusual because no upstream vendor masters it canonically; raw cloud-provider billing exports are the source, normalized via the FinOps Foundation FOCUS spec), (2) if yes, author the master and re-point trigger_event 158 to it; (3) if no, deprecate trigger_event 158 + handoff 198 as mis-modeled and replace with a different shape. | Surface to the user as Bucket 2 item 3. The downstream handoff (198, FINOPS → S2P) hangs on the same decision. |
| B1-S7 | **F2/F3/F4/F5 (cascading vacuous-fail)** | FINOPS has 0 `skills.skill_type='system'` rows (filter by `domain_id=41` and `domain_module_id` either NULL or in-set). Per Rule #17 every `domain_modules` row needs exactly one system skill; FINOPS has no modules so the count is vacuously 0, but once B1-S1 ships the module, the system skill becomes obligatory in the same load. Phase-S floor: one system skill per module with ≥1 `skill_tools` row, mixing `query_<entity>` per consumed data_object plus the FinOps-specific compute primitives (anomaly detection, commitment optimization, rightsizing recommendation). Skill naming per the convention: `finops_cost_mgmt_agent` (or per-split-module `finops_cost_analytics_agent` + `finops_optim_agent`). Tool floor (operation_kind invariants per Rule #17 sub-invariant): `query_supplier_invoices`, `query_software_licenses`, `query_saas_applications`, `query_saas_usage_metrics`, `query_card_transactions`, `query_application_costs` (all `query` requiring `data_object_id`); `detect_cost_anomaly` (`compute`, no `data_object_id`), `recommend_rightsizing` (`compute`, no `data_object_id`), `recommend_commitment_purchase` (`compute`, no `data_object_id`), `fetch_cloud_provider_billing_data` (`fetch`, no `data_object_id`), `notify_person` (`side_effect`, no `data_object_id` — use the abstraction per Rule #F7, not raw channels). | Author 1-2 system skills + 10-14 tools + skill_tools in the same load as B1-S1's modules. |
| B1-S8 | **B10b — outbound NULL FK (FINOPS-owned side)** | Outbound handoff id 198 (FINOPS → S2P) carries `source_domain_module_id=null`. Per B10b this is FINOPS's side to fix once the module exists. Once B1-S1 ships `FINOPS-COST-MGMT` (or the split), patch handoff 198's source-module to the FINOPS module that masters the event's data_object. **Cross-blocked on B1-S6**: until trigger_event 158 is re-pointed at a FINOPS-mastered data_object (or the handoff itself is deprecated), the source-module derivation has no anchor. | Sequenced: cure B1-S6 first, then B1-S8 backfill. |
| B1-S9 | **B10b — inbound NULL FK (FINOPS target side)** | All 8 inbound handoffs (173, 637, 641, 643, 691, 851, 1196, 305) carry `target_domain_module_id=null`. Per B10b this is FINOPS's side to fix once the modules exist. Derivation per the strongest-role rule: each payload (`card_transactions`, `software_licenses`, `saas_applications`, `saas_usage_metrics`, `bi_queries`, `activity_data_records`, `application_costs`, `property_valuations`) becomes a consumer (or derived) DMDO row on the appropriate FINOPS module per B1-S5, and the target-module backfill follows the consumer DMDO row's `domain_module_id`. **`property_valuations` (handoff 305, payload 369, source RE-INVEST) is a borderline case**: a `property_valuation.refreshed` event flowing INTO FINOPS implies FINOPS does real-estate cost-tracking, which is non-canonical (real-estate is REAL-EST / IWMS / RE-INVEST territory, not cloud-FinOps). Likely WRONG-OWNERSHIP routed to Bucket 2 item 5 (does FINOPS legitimately consume property valuations, or was this inbound mis-routed during the load that created the handoff?). | After B1-S5 lands the consumer DMDOs, backfill `target_domain_module_id` on the 7 confirmed inbound handoffs; surface handoff 305 for explicit user decision (Bucket 2 item 5). |
| B1-S10 | **STRUCTURAL (project hygiene, em-dash + American English)** | The `domains` row for FINOPS (id 41) carries 1 em-dash (U+2014) and 3 British-spelling violations in user-visible columns. (1) `description`: `optimisation` → `optimization`. (2) `business_logic`: `optimisation` → `optimization` and ` <U+2014> ` (em-dash) → `; ` (semicolon-space) or `. ` (period-space). The em-dash sits between `commitment optimization` and `algorithm-led`, so a period-space and capitalization is the cleanest rewrite (`Unit-cost allocation, anomaly detection, rightsizing recommendations, and commitment optimization. Algorithm-led; the rest is reporting.`). | PATCH `domains` id=41, `description` and `business_logic` columns. Both columns are user-visible; the em-dash also fails the project rule's source-data clause (CLAUDE.md says em-dashes must not be in source data even though `generate_blueprints.ts` sanitizes at render time). |
| B1-S11 | **A3 (informational)** | 5 solutions linked, 4 `primary` + 1 `secondary`. Passes the A3 floor (≥3 solutions, ≥1 primary). Recommended additions to widen the surface: Vantage (pure-play FinOps, gaining share), CloudZero (unit economics specialist), Kubecost (Kubernetes-scoped FinOps specialist), AWS Cost Explorer + Azure Cost Management + GCP Billing (cloud-native baselines, often deployed alongside or instead of pure-plays). | Optional Bucket 1 (not blocking); load 3-6 additional `solutions` + `solution_domains` rows; verify against current vendor list (Vantage was independent at last check; CloudZero same; Kubecost was acquired by IBM in late 2024 alongside Apptio, so vendor ownership PATCH may be needed). |

#### APQC TAGGING (Rule H1: zero `handoff_processes` rows across 9 cross-domain handoffs)

FINOPS has **9 cross-domain handoffs** (1 outbound + 8 inbound). **Zero** carry `handoff_processes` rows of any `proposal_source`. Volume target per the H-band: 0.5N to 0.8N agent_curated tags for N=9, i.e. 4-7. This audit proposes **9 high-confidence agent_curated tags** (one per handoff), of which 1 (handoff 305 inbound from RE-INVEST) is marked **defer-to-Discover** pending the Bucket 2 routing decision on whether the inbound is legitimate at all.

| B1 ID | handoff_id | source → target | trigger_event | payload | Proposed PCF (`process_name` / `external_id` / L) | Confidence |
|---|---|---|---|---|---|---|
| B1-H1-01 | 198 | FINOPS → S2P | `cloud_spend.threshold_breached` | `supplier_invoices` | Monitor and analyze IT financial performance / `20686` / L4 (id 1132) | confident L4 (the breach-notification is the IT-financial-performance signal that prompts procurement action; existing event mis-attribution per B1-S6 does not affect the PCF mapping since the activity is the same regardless of which data_object publishes) |
| B1-H1-02 | 173 | SPEND-MGMT → FINOPS | `card_transaction.posted` | `card_transactions` | Monitor and analyze IT financial performance / `20686` / L4 (id 1132) | confident L4 (corporate-card cloud spend lands in FINOPS for unit-cost allocation) |
| B1-H1-03 | 637 | SAM → FINOPS | `software_license.under_consumed` | `software_licenses` | Optimize IT resource allocation / `20688` / L4 (id 1134) | confident L4 (under-consumed-license is a SAM observation that triggers FINOPS rightsizing) |
| B1-H1-04 | 641 | SMP → FINOPS | `saas_application.sanctioned` | `saas_applications` | Manage IT portfolio strategy / `20660` / L3 (id 260) | confident L3 (sanctioning a SaaS app brings it into the cost-managed portfolio; L3 parent preferred over a too-specific L4 since the activity is the strategy-level portfolio decision) |
| B1-H1-05 | 643 | SMP → FINOPS | `saas_usage_metric.idle_threshold` | `saas_usage_metrics` | Optimize IT resource allocation / `20688` / L4 (id 1134) | confident L4 (idle-license-detection drives FINOPS rightsizing same as B1-H1-03) |
| B1-H1-06 | 691 | BI → FINOPS | `bi_query.cost_threshold_breached` | `bi_queries` | Monitor and analyze IT financial performance / `20686` / L4 (id 1132) | confident L4 (BI-query cost is one of the modern unit-economics inputs; mapping is identical to B1-H1-01 / B1-H1-02 — IT financial performance) |
| B1-H1-07 | 851 | ESG → FINOPS | `activity_data.recorded` | `activity_data_records` | Perform sustainability reporting / `21601` / L4 (id 1802) | confident L4 (carbon-cost data flow from ESG into FINOPS supports the emerging "green FinOps" practice; the ESG side activity is sustainability reporting, which is what triggers the FINOPS consumption) |
| B1-H1-08 | 1196 | APM → FINOPS | `application_cost.updated` | `application_costs` | Monitor and analyze IT financial performance / `20686` / L4 (id 1132) | confident L4 (application-cost rollup feeds the IT-financial-performance view; identical activity classification to B1-H1-01/02/06) |
| B1-H1-09 | 305 | RE-INVEST → FINOPS | `property_valuation.refreshed` | `property_valuations` | **DEFER-TO-DISCOVER** | Deferral reason: the inbound is itself in doubt (see B1-S9 and Bucket 2 item 5). A property-valuation refresh flowing INTO a cloud-FinOps domain has no plausible PCF activity unless FINOPS is being used as a generic "tech-cost" umbrella, which is not the SKILL.md description scope. If Bucket 2 item 5 confirms WRONG-OWNERSHIP, the handoff is removed and no APQC tag is needed; if it stays, route to Discover Pass 3 for custom-process authoring. |

Combined APQC TAGGING line: 8 `agent_curated` proposals + 1 deferred = **9 items**, all under the single B1-H1 bullet. This satisfies the H1 volume target (0.5N to 0.8N = 4-7 for N=9; the audit ships 8 + 1 deferred which is at the upper end).

#### BOUNDARY findings

| ID | Finding | Fix |
|---|---|---|
| B1-B1 | The single legacy `domain_data_objects` row for FINOPS (`data_object_id=75` `supplier_invoices`, role `consumer`, necessity `required`) is anchored at the domain level only; there is no `domain_module_data_objects` row anywhere because there are no modules. Per the per-domain checklist's S1 sweep, this is a count-level pass (1 row exists), but the indirect-table (S2) coverage is zero because no module hosts the consumer. Once B1-S1 ships the module(s), migrate this row to the module-level `domain_module_data_objects` table alongside the 7 other consumer rows from B1-S5. | Cascade onto B1-S5's loader; pre-flight that the legacy `domain_data_objects` row stays in place during the transition (Rule #11 still relies on it for the canonical-owner lookup) and is only removed after the module-level row is verified to render correctly. |

#### WRONG-OWNERSHIP / MISSING-RELATIONSHIP (router only; no inserts from this domain)

None to record at this audit. All cross-domain payloads that flow into FINOPS already master on the source side per the `domain_data_objects.role='master'` queries (verified per payload). The one exception is handoff 305 (`property_valuations` from RE-INVEST), routed to Bucket 2 item 5 as a judgment call.

### Bucket 2 — Surface-for-user (judgment calls)

1. **C1 owner business_function arbitration.** `business_function_domains` for FINOPS lists `Cloud Financial Operations` (a non-spine business_function, id 83, currently parented at id 4 which is `Software Engineering` in the spine) as `owner`. Options: (a) **Re-anchor to `Finance`** (spine id, lookup needed) — matches FinOps Foundation 2024 State of FinOps majority-reporting pattern (CFO/Finance). (b) **Re-anchor to `IT Operations`** (spine id, lookup needed) — matches legacy CIO-reporting pattern (~30% of orgs). (c) **Keep `Cloud Financial Operations` as a sub-function but re-parent under `Finance`** (id needed) instead of `Software Engineering` (id 4) where it currently lives wrongly. (d) **Keep as-is** (do nothing; accept the bespoke spine departure as intentional). The choice is org-pattern specific and not deterministic from the catalog alone. Independent of Bucket 3. Recommended: (c) — preserves the FinOps semantic distinction while restoring spine alignment.

2. **A4 buyer-facing copy approval (once-only authoring).** Per Rule #20, `catalog_tagline` and `catalog_description` are once-only writes; subsequent edits require explicit per-row user approval since marketing may fine-tune. Draft for explicit user approval before write:
   - **Tagline (proposed):** "See, allocate, and optimize cloud spend before it surprises you at month-end."
   - **Description (proposed, 2 paragraphs, buyer voice):**
     > Cloud Financial Operations (FinOps) is how engineering, finance, and product owners turn cloud bills into a controllable cost line. The practice gives every team the visibility, allocation, and accountability to stop surprises, attribute spend to the work that caused it, and act on rightsizing, commitment, and unit-economics signals before the next billing cycle closes.
     >
     > A FinOps tool ingests raw cost data from every cloud provider, normalizes it (typically against the FinOps Foundation FOCUS specification), allocates spend by tag, account, team, product, or unit (per-customer, per-feature, per-workload), detects anomalies the moment they happen, and recommends commitment purchases, rightsizing, and idle-resource cleanup. The output is a shared cost view every stakeholder agrees on, with the operational primitives to actually move the number.
   - Approve verbatim, edit, or supply your own. Independent of Bucket 3.

3. **B9 attribution: does FINOPS master `cloud_cost_records`?** Trigger event id 158 (`cloud_spend.threshold_breached`) is published against `supplier_invoices` (S2P-mastered), which is wrong-attribution per B1-S6. The clean fix is to author a FINOPS-mastered `cloud_cost_records` (or `cloud_spend_records`) data_object and re-point the event. **But FINOPS is on the SKILL.md leadership-tier list** (B1 exception, masters nothing of its own); per the leadership-tier pattern (REV-INTEL, SALES-PERF, EPM, PA) the domain reads from upstream and publishes derived signals, it does not master canonical records. The decision is: (a) **author `cloud_cost_records` as a FINOPS master** — breaks the leadership-tier convention but is empirically right because no upstream domain canonically owns normalized FOCUS-shaped cloud-cost rows (cloud-provider billing exports are external feeds, not Semantius-mastered). (b) **leave the event mis-attributed** — accepts the catalog inconsistency in exchange for keeping FINOPS leadership-tier-pure. (c) **deprecate trigger_event 158 + handoff 198** as mis-modeled and replace with a `supplier_invoice.cloud_provider` event published from S2P (or AP-AUTO) instead, with FINOPS as the target rather than source. Recommended: (a), with `cloud_cost_records` mastered by FINOPS as the structural exception that proves the leadership-tier rule (the rule's wording is "typically don't master", not "never"). **Dependent on Bucket 3 item 1** (the same Phase-0 vendor-research pass would confirm whether `cloud_cost_records` is a canonical FinOps master or a transient signal).

4. **FOCUS spec as `regulations` row.** The FinOps Foundation FOCUS specification (v1.0 published 2024, v1.1 in draft) is the industry-wide spec for billing-data normalization, formally backed by the Linux Foundation. It is not a statutory regulation (no government enforcement), but the catalog uses `regulations` for industry standards that constrain how a domain operates (e.g. `PCI-DSS` is industry-standard, not statutory, and is in `regulations`). Decision: (a) **Add FOCUS as a `regulations` row** with `applicability='industry_standard'` and link via `domain_regulations` to FINOPS — captures the spec's role as the de-facto interchange format; supports Bucket 3 item 1's `cloud_cost_records` schema decision. (b) **Skip** — keep `regulations` strictly statutory + standards-body. The catalog already mixes the two per `regulations.regulation_name` ILIKE search across PCI-DSS / SOX / FedRAMP, so (a) is consistent with the existing convention. Recommended: (a). Independent of Bucket 3.

5. **Inbound handoff 305 (RE-INVEST → FINOPS on `property_valuation.refreshed`) is suspicious.** A real-estate-investment property-valuation refresh flowing into a cloud-FinOps domain has no plausible workflow tie unless FINOPS is being used as a generic "tech-cost" umbrella, which contradicts the FINOPS `domains.description` ("Visibility, allocation, optimisation, and accountability for cloud spending across business units"). Options: (a) **Delete handoff 305** — likely scope-creep that survived a cluster-load (REAL-EST cluster may have batch-fanned out without scope-checking). (b) **Keep handoff 305** and add a FINOPS consumer DMDO row on `property_valuations` — accept that FINOPS is expanding to "tech + real-estate cost overlay" in some orgs (rare but documented in CRE-cloud-overlap papers). (c) **Re-route handoff 305 to a different target** — likely IWMS or RE-CRE if the event was intended for a building-asset-cost surface. Recommended: (a). Independent of Bucket 3.

### Bucket 3 — Phase 0 pending (speculative; vendor-research vetting needed)

Universal-or-near-universal candidates surfaced by the vendor sample. Phase 0 vetting (formal vendor-research protocol) would confirm or filter:

| # | Candidate | Proposed module | Vendor evidence |
|---|---|---|---|
| 1 | `cloud_cost_records` (or `cloud_spend_records`) as FINOPS master, normalized per FOCUS v1.0 schema | `FINOPS-COST-ANALYTICS` | Universal — every flagship vendor builds the platform around this normalized shape (Cloudability `cost_records`, CloudHealth `Detail Records`, Vantage `cost_reports`, CloudZero `cost_data`, Finout `MegaBill`). The FinOps Foundation FOCUS spec formalizes the columns (`BilledCost`, `EffectiveCost`, `ChargeCategory`, `ServiceName`, `ResourceId`, `Tag`s, etc.). Decides Bucket 2 item 3. |
| 2 | `commitment_recommendations` as FINOPS master | `FINOPS-OPTIM` | Universal (Cloudability, CloudHealth, Vantage, ProsperOps-specialist, native AWS Cost Explorer recommendations). Workflow: agent generates a recommendation, finance reviews, finance commits, the recommendation lifecycle tracks acceptance and realized savings. Distinct from the transient `recommend_commitment_purchase` tool output (B1-S7). |
| 3 | `cost_anomalies` as FINOPS master | `FINOPS-COST-ANALYTICS` | Universal (5/5 sample vendors). Lifecycle: detected → triaged → routed → resolved (action taken) | suppressed (false positive). Similar shape to `dlp_incidents` (DLP master) or `siem_alerts` (SIEM-mastered). Workflow-bearing; needs lifecycle states. |
| 4 | `cost_budgets` as FINOPS master | `FINOPS-COST-ANALYTICS` | Universal (5/5 sample vendors). Per-team, per-product, per-tag rolling cost budgets that drive the threshold-breach event. **Naming risk**: collides with `financial_budgets` (EPM-mastered). Disambiguation per Rule #9: prefix as `cloud_cost_budgets` (FINOPS-prefixed) to avoid the substring collision with EPM. |
| 5 | `unit_cost_definitions` as FINOPS master | `FINOPS-COST-ANALYTICS` | Specialist (CloudZero, Vantage, Finout — strong specialist signal). The unit-economics overlay: definitions like "cost per customer", "cost per ride", "cost per transaction" that aggregate raw cost records into business-meaningful KPIs. Modern flagship pattern; the 2024 State of FinOps survey marks unit-economics as the fastest-growing FinOps practice. |
| 6 | `kubernetes_cost_allocations` as FINOPS master | `FINOPS-OPTIM` (or a future `FINOPS-KUBE-COST` split) | Specialist (Kubecost flagship; CloudHealth and Cloudability cover via extensions). Workload-level cost allocation inside a shared Kubernetes cluster. Belongs as a master if FINOPS adopts a Kube-specific module; otherwise could be folded into `cloud_cost_records` with a `resource_kind='kubernetes_workload'` discriminator. **Naming risk**: prefix `cloud_*` to avoid collisions with broader cluster-cost concepts. |

Bucket 3 items 1, 2, 3, 4, 5 are mutually-coherent and would be loaded as one Phase-0-vetted batch. Item 6 is a per-vendor-specialist signal that may collapse into item 1 with a discriminator column rather than a separate master. Vendor-research path: read FOCUS v1.0 spec, read the OpenAPI / GraphQL schemas of Cloudability + Vantage + CloudZero, build the union surface, diff against current footprint.

### Cross-bucket dependencies

- **Bucket 2 item 3 (does FINOPS master `cloud_cost_records`?) depends on Bucket 3 item 1.** Phase-0 vendor research on the FOCUS spec + flagship-vendor schemas would deterministically answer whether `cloud_cost_records` is a canonical FinOps master or a transient signal. If user picks the **vetted route** on Bucket 3, hold Bucket 2 item 3 until research lands. If **eyeball route** or **skip**, Bucket 2 item 3 is independent and decides standalone.
- **Bucket 1 B1-S6 (re-pointing trigger_event 158) cascades into B1-S8** (outbound NULL FK can only be cured after the trigger_event's data_object is FINOPS-anchored).
- **Bucket 1 B1-S1 (M1 fix) cascades into B1-S2, B1-S5, B1-S7, B1-S8, B1-S9** (every other Bucket 1 item that requires a module to attach to).
- **Bucket 2 item 1 (C1 owner-function) is independent** of the rest; can decide and PATCH at any time.
- **Bucket 2 items 2 (A4 copy), 4 (FOCUS regulation), 5 (handoff 305) are independent** of each other and of Bucket 3.

### Per-bucket prompts

After surfacing this audit, the orchestrator should explicitly prompt the user, one bucket at a time:

- **Bucket 1 (15 items, 11 STRUCTURAL + 1 APQC TAGGING + 1 BOUNDARY + 2 cascaded routing items, all in-scope agent-fixable but cascading on B1-S1):** "Approve the full Bucket 1 fix-load? Reply 'all', 'just B1-S1 first then re-plan', or 'just <ids>'." Recommended order: B1-S1 + B1-S2 + B1-S10 (independent quick wins) first; then B1-S5 + B1-S7 + B1-S8 + B1-S9 (depend on B1-S1); then B1-S3 + B1-S4 (depend on Bucket 2 items 1 and 2); B1-S6 (depend on Bucket 2 item 3); B1-S11 (optional).
- **Bucket 2 (5 items, all judgment):** "What's your call on each of the five? I'll wait for the answer per item before acting; A4 (item 2) and the FOCUS regulation (item 4) need your exact wording per Rule #15 and Rule #20."
- **Bucket 3 (6 items, all Phase-0 speculative):** "Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates ring true."

### Report-only follow-ups (owed by other domains)

These items are inbound-side findings that THIS audit catches but the FIX belongs to another domain's audit. Surfaced for the user to optionally schedule per-source-domain audits.

| ID | Finding | Owing domain | Owing band |
|---|---|---|---|
| R1 | Handoff 173 (`card_transaction.posted`) has `source_domain_module_id=null` despite SPEND-MGMT being modularized. | SPEND-MGMT | B10b (its outbound side) |
| R2 | Handoff 637 (`software_license.under_consumed`) has `source_domain_module_id=null` despite SAM being modularized. | SAM | B10b |
| R3 | Handoffs 641 (`saas_application.sanctioned`) and 643 (`saas_usage_metric.idle_threshold`) have `source_domain_module_id=30` already set (SMP, good); these are not B10b failures on SMP's side, no action. | (none) | (none — informational) |
| R4 | Handoff 691 (`bi_query.cost_threshold_breached`) has `source_domain_module_id=null` despite BI being modularized. | BI | B10b |
| R5 | Handoff 851 (`activity_data.recorded`) has `source_domain_module_id=null`. ESG may or may not be modularized; verify on ESG's next audit. | ESG | B10b (conditional on ESG having modules) |
| R6 | Handoff 1196 (`application_cost.updated`) has `source_domain_module_id=104` already set (APM, good); not a B10b failure on APM's side. | (none) | (none — informational) |
| R7 | Handoff 305 (`property_valuation.refreshed`) source-side NULL is moot because Bucket 2 item 5 may delete the handoff entirely. | RE-INVEST | B10b (conditional on Bucket 2 item 5 keeping the handoff) |
| R8 | The S2P → FINOPS direction is empty (`/handoffs?source_domain_id=eq.27&target_domain_id=eq.41` returns 0 rows). Per Rule B10's owed-by-other-domain discovery, FINOPS is `consumer + required` on `supplier_invoices` (S2P-mastered), so an inbound on `supplier_invoice.*` events (cloud-provider invoice received, invoice approved, invoice paid) is conceptually owed by S2P. The current outbound from FINOPS to S2P (handoff 198) is the reverse direction (threshold breach signal). Surface as: "S2P B9 may owe outbound on `supplier_invoices` → FINOPS for FOCUS-aligned cloud-provider invoice ingestion when FINOPS authors `cloud_cost_records` per Bucket 2 item 3." | S2P | B9 (conditional on Bucket 2 item 3) |

### Candidates queued (audits/_missing-domains.md)

The following 4 candidates surfaced from the vendor sample, all queued via `scripts/analytics/append_missing_domain.ts`:

1. **KUBE-COST — Kubernetes Cost Allocation Platform** (Kubecost specialist, plus extensions in CloudHealth / Cloudability). Likely fold-into-existing FINOPS as a sub-module once FINOPS modularizes; flagged for human triage.
2. **CARBON-FOOTPRINT — Cloud Carbon Footprint Accounting** (Watershed, Persefoni, plus AWS / Azure / GCP native carbon dashboards). Sits between FINOPS and ESG; the inbound handoff 851 from ESG suggests the catalog already half-models this.
3. **CLOUD-COMMIT-OPTIM — Cloud Commitment Optimization** (ProsperOps specialist, ZestyCloud, Spot by NetApp, Archera). Specialist pure-plays focused on Reserved Instance / Savings Plan management as an algorithmic service. Likely fold-into-existing FINOPS as a capability (`FINOPS-COMMITMENT-OPTIM`) per Bucket 1 B1-S2; raised as a candidate so the human triage can confirm.
4. **FINOPS-UNIT-ECON — Unit Economics Platform** (CloudZero specialist, plus Vantage / Finout coverage). Pure-play unit-economics SaaS that overlaps with FINOPS but markets a distinct "cost per business unit" surface. Likely fold-into-existing FINOPS as a capability (`FINOPS-UNIT-ECONOMICS`); raised as a candidate so the human triage can confirm whether it is its own domain.

## 2026-05-31, Continuation: B1 technical fixes

Subagent continuation pass that applied only the truly-technical B1 items the orchestrator pre-classified as agent-runnable without user judgment. All judgment-bearing fixes (new modules, new capabilities, new DMDOs, new system skill + tools, C1 spine arbitration, A4 catalog copy, B9 trigger-event re-pointing, FK backfills gated on those, optional new solutions) remain deferred per the original Bucket 1 cascade.

**Loader:** [.tmp_deploy/fix_finops_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_finops_b1_technical_2026_05_31.ts) (run from project root via `bun run`).

### Applied

| B1 ID | Op | Detail |
|---|---|---|
| B1-S10 | PATCH | `domains` id=41: `description` and `business_logic` rewritten to remove the em-dash (U+2014) and three British-spelling `optimisation` instances. Final text matches the audit's recommended rewrite (period-space + re-capitalization between `commitment optimization` and `Algorithm-led`). 2 columns patched. |
| B1-H1-01 | INSERT | `handoff_processes` handoff_id=198 (FINOPS -> S2P `cloud_spend.threshold_breached`) -> process_id=1132 (Monitor and analyze IT financial performance, PCF 8.2.5.4 L4), `agent_curated`. id=668. |
| B1-H1-02 | INSERT | handoff_id=173 (SPEND-MGMT -> FINOPS `card_transaction.posted`) -> process_id=1132 (PCF 8.2.5.4 L4), `agent_curated`. id=669. |
| B1-H1-03 | INSERT | handoff_id=637 (SAM -> FINOPS `software_license.under_consumed`) -> process_id=1134 (Optimize IT resource allocation, PCF 8.2.5.6 L4), `agent_curated`. id=670. |
| B1-H1-04 | INSERT | handoff_id=641 (SMP -> FINOPS `saas_application.sanctioned`) -> process_id=260 (Manage IT portfolio strategy, PCF 8.2.2 L3), `agent_curated`. id=671. |
| B1-H1-05 | INSERT | handoff_id=643 (SMP -> FINOPS `saas_usage_metric.idle_threshold`) -> process_id=1134 (PCF 8.2.5.6 L4), `agent_curated`. id=672. |
| B1-H1-06 | INSERT | handoff_id=691 (BI -> FINOPS `bi_query.cost_threshold_breached`) -> process_id=1132 (PCF 8.2.5.4 L4), `agent_curated`. id=673. |
| B1-H1-07 | INSERT | handoff_id=851 (ESG -> FINOPS `activity_data.recorded`) -> process_id=1802 (Perform sustainability reporting, PCF 13.10.2.3 L4), `agent_curated`. id=674. |
| B1-H1-08 | INSERT | handoff_id=1196 (APM -> FINOPS `application_cost.updated`) -> process_id=1132 (PCF 8.2.5.4 L4), `agent_curated`. id=675. |

Totals: 1 PATCH op (2 columns) on `domains`, 8 INSERTs on `handoff_processes`. H1 volume now 8 of 9 cross-domain handoffs tagged (the 9th, handoff 305 RE-INVEST -> FINOPS, is DEFER-TO-DISCOVER pending Bucket 2 item 5).

### Deferred (carried forward unchanged)

- **B1-S1** (M1 zero modules): new entity creation, not technical.
- **B1-S2** (A2 zero capabilities): new entity creation; capability name borderline cross-cutting per audit.
- **B1-S3** (C1 spine arbitration): Bucket 2 item 1, user-picks.
- **B1-S4** (A4 catalog_tagline + catalog_description): Rule #20 once-only authoring, user judgment.
- **B1-S5** (B-band DMDO rebuild): new DMDOs, gated on B1-S1.
- **B1-S6** (B9 trigger_event 158 attribution): gated on Bucket 2 item 3 decision.
- **B1-S7** (F-band system skill + tools): new entities, gated on B1-S1.
- **B1-S8** (B10b outbound NULL FK on handoff 198 source-module): cross-blocked on B1-S6 + B1-S1.
- **B1-S9** (B10b inbound NULL FK on 8 handoffs target-module): gated on B1-S5 + B1-S1.
- **B1-S11** (A3 optional new solutions): new entities, user judgment.
- **B1-H1-09** (handoff 305 PCF tag): DEFER-TO-DISCOVER per audit Bucket 2 item 5.
- All of Bucket 2 (5 items) and Bucket 3 (6 items): judgment / Phase 0 vendor research, untouched.

No JWT errors encountered. No `notes` columns written. No new entities, modules, capabilities, skills, or DMDOs created.

## 2026-05-31, Audit

Validate b1 structural re-audit. Diffs live state against the prior 2026-05-30 narrative + the 2026-05-31 Continuation. Confirms what the technical-fixes pass resolved, restates what remains pending, refreshes the band-by-band reading, and corrects one factual error from the prior audit.

### Summary

- **Current footprint (live):** 0 `domain_modules` rows (M1 hard fail still dominant), 0 `capability_domains` rows (A2 hard fail), 5 solutions linked (4 primary + 1 secondary, unchanged: ServiceNow Cloud Insights, Apptio Cloudability, CloudHealth, Finout, Flexera One), 0 `domain_regulations`, 0 master data_objects (leadership-tier vacuous), 1 consumer at the legacy `domain_data_objects` level on `supplier_invoices` (id 75, S2P-mastered), 0 `domain_module_data_objects` (no modules to host), 1 outbound + 8 inbound cross-domain handoffs (9 total, unchanged), 0 system skills, 0 `skill_tools`, 0 roles, and 10 `handoff_processes` rows across all 9 cross-domain handoffs (every handoff including 305 now tagged `agent_curated` at `record_status=new`; handoff 198 carries 2 PCF rows, one IT-financial-performance + one AP-process).
- **Resolved since 2026-05-30:** B1-S10 (em-dash + British-spelling violations on `domains` id=41) PATCHed in the 2026-05-31 continuation; live `description` reads "optimization" and `business_logic` reads "commitment optimization. Algorithm-led; the rest is reporting." with no em-dashes. B1-H1-01 through B1-H1-08 (8 confident APQC tags) loaded as `handoff_processes` rows; B1-H1-09 (handoff 305 RE-INVEST -> FINOPS on `property_valuation.refreshed`) was loaded as `process_id=1390` ("Process and record fixed-asset adjustments, enhancements, revaluations, and transfers", PCF 9.3.2 L4) despite the prior audit flagging it DEFER-TO-DISCOVER; the row is in the catalog at `record_status=new`. The H1 band is now fully covered (10 rows for 9 handoffs).
- **Carried forward (still pending):** B1-S1 (M1 zero modules, dominant blocker), B1-S2 (A2 zero capabilities), B1-S3 (C1 owner business_function arbitration), B1-S4 (A4 catalog_tagline + catalog_description empty), B1-S5 (B-band DMDO consumer rebuild), B1-S6 (B9 trigger_event 158 attribution), B1-S7 (F2/F3/F4/F5 cascading vacuous-fail, no system skill), B1-S8 (B10b outbound NULL FK on handoff 198 source-module), B1-S9 (B10b inbound NULL FK on 8 handoffs target-module), B1-S11 (A3 optional new solutions), all 5 Bucket 2 items, all 6 Bucket 3 items. Bucket 2 item 5 (handoff 305 routing legitimacy) and Bucket 1 B1-H1-09 are now coupled: the 305 PCF row was loaded against the prior audit's deferral, so if the user picks "delete handoff 305" the corresponding `handoff_processes` row also needs removal.

### Band-by-band reading

- **M1 (hard fail, dominant blocker).** Zero modules for `domain_id=41`. Cascade: M2, M4, M5, M6 cannot be evaluated; B-band DMDO rebuild (B1-S5), F2/F3/F4/F5 (B1-S7), B10b NULL FK backfills on 9 handoffs (B1-S8 + B1-S9), E1, D1 all gated.
- **A2 (hard fail).** Zero `capability_domains` rows. Capability draft (B1-S2) ships alongside the module(s).
- **A3 (partial pass, informational).** 5 solutions ≥3, ≥1 primary, A3 floor met. B1-S11 carries the optional widening (Vantage, CloudZero, Kubecost, native cloud providers).
- **A4 (hard fail).** `catalog_tagline` and `catalog_description` empty per live read. B1-S4 carries the Rule #20 once-only authoring; draft text sits in the 2026-05-30 Bucket 2 item 2.
- **B1, B5, B7, B9, B9b, B10b, B11, B12:** B1 vacuous-pass (leadership-tier, no masters expected). B5/B7/B9/B9b/B11/B12 vacuous on FINOPS-mastered data_objects. B9 still carries the specific attribution defect on trigger_event id 158 (B1-S6). B10b is the inbound-and-outbound NULL FK pattern, all 9 cross-domain handoffs carry `target_domain_module_id=null` on the FINOPS-target side (8 inbound) or `source_domain_module_id=null` on the FINOPS-source side (1 outbound), gated on B1-S1.
- **C1 (partial pass + factual correction to prior audit).** `business_function_domains` for `domain_id=41` has 1 owner row (`Cloud Financial Operations`, id 83, parent id 4) and 2 contributors (`Software Engineering`, `IT Operations`). The 2026-05-30 audit said `parent_business_function_id=4` was `Software Engineering` from the function spine; live `/business_functions?id=eq.4` confirms id 4 is `Finance`. So `Cloud Financial Operations` is already a sub-function under `Finance`, which is the recommended (c) option from the prior Bucket 2 item 1. C1 is therefore closer to a pass than the prior audit suggested. The remaining decision (Bucket 2 item 1) is whether to add a second spine-anchored owner row directly on `Finance` (or `IT Operations`) or accept the sub-function-of-Finance arrangement as the sole owner. Surfaced as a corrected Bucket 2 item 1 below.
- **C2 vacuous** (no module-level RACI yet).
- **D1 cannot be evaluated** until modules ship.
- **E1 to E5 vacuous** (no modules, no roles possible).
- **F1 to F5 hard fail** (no system skill, no `skill_tools`, no module surface to host any of it). F5 (Semantius score) uncomputable.
- **H1 pass.** 10 `handoff_processes` rows across 9 cross-domain handoffs, all `agent_curated` at `record_status=new`. Volume target was 0.5N to 0.8N = 4 to 7; the catalog ships at 10 (well above the upper end, because handoff 198 carries 2 rows). Approval signal (the headline H1 quality measure) is 0 of 10 at `approved`; the side-bar process-health measure is 10 of 10 `agent_curated`. Reviewer triage of the agent_curated batch is the next H-band move, but it is not a hard-fail blocker.

### Bucket 1 (in-scope confirmed gaps, still pending)

Carried forward unchanged from 2026-05-30 unless noted.

| ID | Band | Status | Detail |
|---|---|---|---|
| B1-S1 | M1 | pending | Author 1 or 2 `domain_modules` rows (`FINOPS-COST-MGMT` catch-all OR split `FINOPS-COST-ANALYTICS` + `FINOPS-OPTIM`). Recommended split if Bucket 1 B1-S2 capability count lands at ≥3 (Rule #14 M2). Cascades: B1-S5, B1-S7, B1-S8, B1-S9. |
| B1-S2 | A2 | pending | Draft 6 to 8 `capabilities` + `capability_domains` rows. Draft union per 2026-05-30: `FINOPS-COST-VISIBILITY`, `FINOPS-COST-ALLOCATION`, `FINOPS-ANOMALY-DETECTION`, `FINOPS-COMMITMENT-OPTIM`, `FINOPS-RIGHTSIZING`, `FINOPS-FORECASTING`, `FINOPS-UNIT-ECONOMICS`, `FINOPS-KUBE-COST-ALLOC`. |
| B1-S3 | C1 | pending (re-scoped) | Live `business_functions` confirms id 4 is `Finance`, so `Cloud Financial Operations` (id 83) already sits under `Finance`. Remaining choice surfaced as Bucket 2 item 1 (corrected): accept the sub-function-of-Finance owner, or add a second spine-anchored owner row on `Finance` directly (or on `IT Operations` for the CIO-reporting org). |
| B1-S4 | A4 | pending | Author `catalog_tagline` + `catalog_description`. Draft sits in 2026-05-30 Bucket 2 item 2; Rule #20 once-only; user approval required. |
| B1-S5 | B-band coverage | pending | 8 consumer DMDOs on `supplier_invoices`, `software_licenses`, `saas_applications`, `saas_usage_metrics`, `card_transactions`, `bi_queries`, `activity_data_records`, `application_costs`; distribute between B1-S1's module(s). Gated on B1-S1. |
| B1-S6 | B9 | pending | trigger_event 158 (`cloud_spend.threshold_breached`) data_object_id=75 (`supplier_invoices`, S2P-mastered) is wrong attribution. Decision gated on Bucket 2 item 3 (does FINOPS master `cloud_cost_records`). |
| B1-S7 | F2/F3/F4/F5 | pending | Author 1 to 2 system skills + 10 to 14 `skill_tools` per Rule #17 floor; gated on B1-S1. |
| B1-S8 | B10b | pending | Outbound handoff 198 `source_domain_module_id=null`; gated on B1-S6 + B1-S1. |
| B1-S9 | B10b | pending | 8 inbound handoffs (173, 637, 641, 643, 691, 851, 1196, 305) `target_domain_module_id=null`; gated on B1-S5 + B1-S1. Handoff 305 secondary-gated on Bucket 2 item 5 (legitimacy). |
| B1-S11 | A3 informational | pending optional | Add Vantage, CloudZero, Kubecost, AWS Cost Explorer, Azure Cost Management, GCP Billing as `solutions` + `solution_domains`. Verify Kubecost vendor ownership (IBM acquired Apptio + Kubecost late 2024). |

### Bucket 2 (surface-for-user, judgment, still pending)

1. **C1 owner business_function (corrected).** Live state: id 4 is `Finance` (not Software Engineering as the prior audit said), so `Cloud Financial Operations` already sub-parents under Finance, which is the prior (c) option already in effect. Remaining options: (a) accept as-is and close C1 (the spine-aligned ancestry is sufficient), (b) add a second spine-anchored owner row directly on `Finance` for explicit spine alignment, (c) add a second owner row on `IT Operations` for the CIO-reporting pattern. Recommended: (a). Independent of Bucket 3.
2. **A4 buyer-facing copy approval.** Draft tagline and 2-paragraph description in 2026-05-30 Bucket 2 item 2; user approval verbatim or edit. Independent of Bucket 3.
3. **B9 attribution: does FINOPS master `cloud_cost_records`?** Same trade-off as 2026-05-30: leadership-tier-pure (no master) versus empirically-correct (FINOPS-mastered `cloud_cost_records` normalized per FOCUS). Dependent on Bucket 3 item 1.
4. **FOCUS spec as a `regulations` row.** Live `/regulations?regulation_name=ilike.*FOCUS*` returns 0 rows. Add FOCUS as `industry_standard` (recommended) or skip. Independent of Bucket 3.
5. **Inbound handoff 305 (RE-INVEST -> FINOPS) legitimacy.** Live: handoff 305 now carries a `handoff_processes` row pointing at PCF 10831 (fixed-asset adjustments). If the user picks "delete handoff 305", the `handoff_processes` row also needs deletion. Options: (a) delete handoff 305 and its PCF row, (b) keep handoff 305 and add a FINOPS consumer DMDO on `property_valuations`, (c) re-route handoff 305 to IWMS or RE-CRE. Recommended: (a). Independent of Bucket 3.

### Bucket 3 (Phase 0 pending, speculative, still pending)

All 6 items carried forward unchanged from 2026-05-30. Vetting decision: vetted route (formal Phase 0 vendor research on FOCUS v1.0 + Cloudability + Vantage + CloudZero schemas) or eyeball route (user names which candidates ring true). Bucket 3 items: `cloud_cost_records`, `commitment_recommendations`, `cost_anomalies`, `cloud_cost_budgets` (prefixed to avoid collision with EPM `financial_budgets`), `unit_cost_definitions`, `kubernetes_cost_allocations`.

### Cross-bucket dependencies (updated)

- B1-S6 (trigger_event 158 attribution) gated on Bucket 2 item 3, which depends on Bucket 3 item 1.
- B1-S1 (M1) cascades into B1-S5, B1-S7, B1-S8, B1-S9.
- Bucket 1 B1-H1-09 (handoff 305 PCF row already loaded) is now coupled to Bucket 2 item 5; deletion path requires cleanup.
- Bucket 2 item 1 (C1 owner) is independent.
- Bucket 2 items 2, 4, 5 are independent of each other and of Bucket 3.

### Counts

- Bucket 1: 10 items pending (B1-S1, B1-S2, B1-S3, B1-S4, B1-S5, B1-S6, B1-S7, B1-S8, B1-S9, B1-S11).
- Bucket 2: 5 items.
- Bucket 3: 6 items.
- next_action_by: agent (b1a non-empty, several items are agent-solvable assuming the user pre-approves the bundle; the bulk are routed to b1a per the cascade-from-B1-S1 dependency model, with B1-S6, B1-S4, B1-S11 routed to b1b/b2 per the gating).

### Report-only follow-ups (owed by other domains)

Unchanged from 2026-05-30:

| ID | Finding | Owing domain | Owing band |
|---|---|---|---|
| R1 | Handoff 173 source-module NULL despite SPEND-MGMT modularized | SPEND-MGMT | B10b |
| R2 | Handoff 637 source-module NULL despite SAM modularized | SAM | B10b |
| R4 | Handoff 691 source-module NULL despite BI modularized | BI | B10b |
| R5 | Handoff 851 source-module NULL (ESG modularization conditional) | ESG | B10b |
| R7 | Handoff 305 source-module NULL (moot if Bucket 2 item 5 deletes) | RE-INVEST | B10b |
| R8 | S2P may owe outbound on `supplier_invoices` to FINOPS for FOCUS-aligned cloud-provider invoice ingestion (gated on Bucket 2 item 3) | S2P | B9 |

### Notes on this run

No JWT errors. No writes to any `notes` column. No new modules, capabilities, skills, or DMDOs created in this audit pass; the only mutation since 2026-05-30 was the prior 2026-05-31 Continuation. The structural picture is unchanged in its dominant blocker (M1) but materially cleaner on B1-S10 and H1, and the C1 reading is correctly recomputed against live spine state.

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.

---

## 2026-06-07 - Audit (state-driven execute, bulk batch)

### Summary

State-driven Validate pass (Rule #21), working only the open items in state.yaml. Live
verification (2026-06-07) confirmed the snapshot exactly: FINOPS (domain id=41) is UNBUILT,
0 domain_modules, 0 domain_module_host_domains, 0 capability_domains, 0 master data_objects
(only 1 legacy consumer on supplier_invoices id 75), 5 solutions (A3 passes). Per Rule #21 /
SKILL.md line 1498, an UNBUILT domain is NOT scaffolded by an audit pass: the build is a user
decision. The only cascade-independent, agent-doable additive item was the A4 catalog UX
backfill, which was executed. The whole module + capability + master + DMDO + skill + FK
cascade stays surfaced as the post-build work plan and clears once the build lands.

Loader: [.tmp_deploy/finops_state_execute_2026_06_07.ts](../../.tmp_deploy/finops_state_execute_2026_06_07.ts)
(run from project root via `bun run`; idempotent, re-run skips both fields).

### Executed (counts)

| Item | Op | Detail |
|---|---|---|
| B1A-A4 / B2-A4-COPY | PATCH | domains id=41 catalog_tagline + catalog_description (both were empty). Authored buyer-voice copy (workflow + value, no vendor/product names per Rule #18, no em-dash, American English) and written straight in at record_status='new' per the revised Rule #20 backfill rule (the prior "surface-before-write" b2 gate is obsolete). 2 columns. |

Totals: 1 PATCH op (2 columns) on `domains`. No new entities, modules, capabilities,
masters, DMDOs, skills, handoffs, or handoff_processes created. No `notes` column written.
No `record_status` flipped to approved. No JWT errors.

Vacuous (nothing to do):
- entity_type (Rule #12): FINOPS masters nothing; 0 owned data_objects.
- APQC H1: all 9 cross-domain handoffs already carry handoff_processes rows.
- event_category (Rule #13): the only related trigger_event (158) is mis-attributed to
  supplier_invoices (a b2 fork) and already carries event_category='threshold'.
- module-level catalog copy: no modules exist.

### Surfaced (carried to state.yaml as b2 / build)

- B2-BUILD: FINOPS is UNBUILT; decide module shape (2 modules / 1 module / defer). Gates the
  entire b1a cascade (B1A-M1, B1A-A2, B1A-B-DMDO, B1A-DOMAIN-SKILL, B1A-B10B-*, B1A-PHASE-P).
- B2-C1-OWNER: owner=Cloud Financial Operations (id 83) under Finance (id 4), spine-aligned;
  accept as-is vs add a second owner row on Finance / IT Operations.
- B2-CLOUD-COST-MASTER: does FINOPS master cloud_cost_records and re-point trigger_event 158?
  Option (c) deprecation is destructive.
- B2-FOCUS-REG: add the FinOps cost-data interchange spec as an industry_standard regulation?
- B2-HANDOFF-305 (DESTRUCTIVE): delete handoff 305 + handoff_processes id 755 (-> process 1390),
  keep + add a consumer DMDO, or re-route to IWMS / RE-CRE.
- B2-A3-WIDEN: optional widening of the solutions surface.
- Personas / RACI (B1A-PHASE-P): DEFERRED (does not apply to an UNBUILT domain). Candidate
  personas noted for after the build: FinOps Practitioner / Cloud Cost Analyst (owner),
  Engineering Cost Owner (contributor), Finance / FP&A Reviewer (commitment approver).

### Left (untouched)

- b1a cascade (B1A-M1, B1A-A2, B1A-B-DMDO, B1A-DOMAIN-SKILL, B1A-B10B-OUTBOUND/INBOUND,
  B1A-PHASE-P): all blocked on B2-BUILD; retained as the post-build work plan.
- b1b B1B-A3-SOLUTIONS: optional, blocked on B2-A3-WIDEN.
- b3 (6 entries): vendor-research masters backlog (cloud_cost_records, commitment_recommendations,
  cost_anomalies, cloud_cost_budgets, unit_cost_definitions, kubernetes_cost_allocations).
- Superseded per-module-skill / skill_tools model: retired per the 2026-06-06 supersession
  header; the F-band item was reshaped into B1A-DOMAIN-SKILL (one domain-grain system skill).

### Post-fix status

next_action_by: user (UNBUILT; the build is a b2 decision plus 5 other open b2 forks, one of
which is destructive). No b1a item is currently agent-actionable: every one is blocked on
B2-BUILD or another b2.
