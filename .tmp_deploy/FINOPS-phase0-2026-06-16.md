# FINOPS Phase 0 — Vendor Surface (Cloud Financial Operations, domain_id=41)

Research only. Zero inserts. This report feeds a human q-file (market-shape decisions in section "Market-shape decisions").

## Current catalog state (verified 2026-06-16 via semantius CLI)

- `domains` id=41, code=FINOPS, name="Cloud Financial Operations", `parent_domain_id=3` (child of ITAM, alongside SAM and SMP).
- Metadata today: `crud_percentage=70`, `min_org_size="30 m <2500"`, `cost_band="$$$"`, `usa_market_size_usd_m=1500`, `market_size_source_year=2025`, `certification_required=false`, `business_logic` populated.
- Modules: **ZERO**. Capabilities: **ZERO**. Masters: **ZERO** (the domain only `consumer`s `supplier_invoices`). This is an UNBUILT stub.
- Solutions linked (5): Apptio Cloudability (primary), CloudHealth (primary), Finout (primary), ServiceNow Cloud Insights (primary), Flexera One (secondary).

What adjacent domains already master (verified, for boundary analysis):
- **FIN** (id=65): `general_ledger_accounts`, `journal_entries`, `cost_centers`, `accounting_periods`, `legal_entities`, `bank_accounts`, `cash_transactions`, `fixed_assets`, `revenue_recognition_records`, `intercompany_transactions`, `asset_depreciation_schedules`. The accounting system of record.
- **EPM** (id=66): `financial_plans`, `financial_budgets`, `financial_forecasts`, `financial_scenarios`, `variance_analyses`. FP&A above the GL.
- **SMP** (id=85): `saas_applications`, `saas_subscriptions`, `saas_usage_metrics`, `shadow_it_apps`, `smp_license_seat_assignments`. SaaS portfolio spend.
- **SPEND-MGMT** (id=133): `corporate_card_accounts`, `card_authorizations`, `vendor_payment_authorizations`, `spend_policies`, `spend_requests`. Employee-initiated spend at the card-network layer.
- **SAM** (id=52): `software_titles`, `software_licenses`, `software_installations`, `license_audits`. Installed-license entitlement reconciliation.
- **ITAM** (id=3, umbrella): `asset_contracts`, `asset_lifecycle_events`.

**Crucially: nothing in the catalog masters cloud usage/cost records, cloud cost allocations, cloud commitments (RIs/SPs/CUDs), cloud anomaly alerts, or cloud rightsizing/optimization recommendations.** That gap is the whole FINOPS thesis.

## Flagship vendors

| Vendor | URL | Tier | Specialist in | Why included |
| --- | --- | --- | --- | --- |
| Apptio Cloudability (IBM) | apptio.com/products/cloudability | Enterprise | Allocation/business-mapping, showback/chargeback, RI/SP planning, rightsizing, container cost allocation | 2025 Gartner CFM MQ Leader; the reference enterprise pure-play; user-named primary |
| CloudHealth (Broadcom / Tanzu) | techdocs.broadcom.com/.../tanzu-cloudhealth | Enterprise | Perspectives (allocation groups), policy-driven governance, reservation + savings-plan management, rightsizing, realized-savings reporting | Long-standing MSP/enterprise leader; user-named primary; rich public data model |
| Finout | finout.io | Mid-market / Enterprise | MegaFilter allocation, virtual tags, cost guard (anomaly), shared-cost splitting, k8s + Datadog/Snowflake spend | Modern pure-play; user-named primary; multi-cloud + SaaS cost in one view |
| ProsperOps | prosperops.com | Mid-market | Autonomous commitment management (ADM): RI/SP/CUD purchase, exchange, rebalance, adaptive laddering | Pure-play *rate-optimization* specialist; savings-share pricing; isolates the commitment master cleanly |
| nOps | nops.io | Mid-market | Automated commitment mgmt + rightsizing + k8s allocation + anomaly + scheduling, single platform | Mid-market pure-play; widens the union surface (scheduling, k8s) and anchors the SMB/mid honesty check |
| Flexera One (Cloud Cost) | flexera.com | Enterprise | Multi-cloud cost + ITAM/SAM convergence, policy automation | 2025 Gartner CFM MQ Leader; secondary; shows the ITAM-suite framing |
| Native (AWS Cost Explorer / CUR, Azure Cost Management, GCP Billing/CUD) | — | All tiers | First-party billing export, budgets, anomaly detection, commitment recommendations | The "do nothing / use the console" baseline competitor; defines the floor the pure-plays must beat |

Tier read: **ProsperOps and nOps are the mid-market anchors** (self-serve, performance/usage pricing, no implementation project). **Cloudability, CloudHealth, Flexera One are enterprise** (allocation-governance projects, MSP/partner-led). Finout straddles. Native tools cover everyone but stop at single-cloud visibility + naive optimization.

## Surface matrix

Columns: CL=Cloudability, CH=CloudHealth, FO=Finout, PO=ProsperOps, nO=nOps, NA=Native cloud tools. Entity names are neutral snake_case_plural (Rule #18: no vendor names).

| Entity | Category | CL | CH | FO | PO | nO | NA | Classification | Proposed module |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | --- | --- |
| `cloud_billing_accounts` | Master | x | x | x | x | x | x | Core | cost-ingestion |
| `cloud_cost_records` | Master | x | x | x | x | x | x | Core | cost-ingestion |
| `cloud_usage_records` | Master | x | x | x | x | x | x | Core | cost-ingestion |
| `cloud_service_resources` | Master | x | x | x | x | x | x | Core | cost-ingestion |
| `cost_data_ingestion_runs` | Junction/audit | x | x | x | x | x | x | Core | cost-ingestion |
| `resource_tags` | Config | x | x | x | x | x | x | Core | cost-allocation |
| `tag_normalization_rules` | Config | x | x | x | . | . | . | Common | cost-allocation |
| `cost_allocation_rules` | Config | x | x | x | x | x | . | Core | cost-allocation |
| `allocation_dimensions` (perspectives/business mappings/virtual tags) | Master | x | x | x | . | x | . | Core | cost-allocation |
| `cost_allocations` (showback/chargeback rows) | Master | x | x | x | . | x | . | Core | cost-allocation |
| `shared_cost_split_rules` | Config | x | x | x | . | x | . | Core | cost-allocation |
| `container_cost_allocations` (k8s) | Master | x | x | x | . | x | . | Core | cost-allocation |
| `cost_centers` (consumed) | Consumer | x | x | x | . | . | . | Common | cost-allocation |
| `budgets` | Master | x | x | x | . | x | x | Core | budgeting-forecast |
| `budget_alerts` | Junction | x | x | x | . | x | x | Core | budgeting-forecast |
| `cost_forecasts` | Master | x | x | x | . | x | x | Core | budgeting-forecast |
| `unit_economics_metrics` (cost-per-unit / cost-per-customer) | Master | x | . | x | . | x | . | Common | budgeting-forecast |
| `cost_anomalies` | Master | x | x | x | . | x | x | Core | anomaly-governance |
| `anomaly_alerts` | Junction | x | x | x | . | x | x | Core | anomaly-governance |
| `governance_policies` (best-practice/policy rules) | Master | x | x | x | . | x | x | Core | anomaly-governance |
| `policy_evaluations` | Junction/audit | x | x | . | . | x | x | Common | anomaly-governance |
| `optimization_recommendations` (rightsizing/idle/terminate) | Master | x | x | x | . | x | x | Core | optimization-recs |
| `rightsizing_recommendations` | Master | x | x | . | . | x | x | Common | optimization-recs |
| `idle_resource_findings` | Master | x | x | x | . | x | x | Core | optimization-recs |
| `optimization_actions` (implement/track) | Junction | x | x | . | . | x | . | Common | optimization-recs |
| `realized_savings_records` | Master/derived | x | x | x | x | x | . | Core | optimization-recs |
| `resource_schedules` (start/stop) | Config | . | . | . | . | x | x | Specialist | optimization-recs |
| `commitment_plans` (RI/SP/CUD inventory) | Master | x | x | x | x | x | x | Core | commitment-mgmt |
| `commitment_recommendations` | Master | x | x | x | x | x | x | Core | commitment-mgmt |
| `commitment_purchases` | Junction | x | x | . | x | x | x | Core | commitment-mgmt |
| `commitment_utilization_records` | Master/derived | x | x | x | x | x | x | Core | commitment-mgmt |
| `commitment_exchanges` (rebalance/ladder) | Junction | . | . | . | x | x | . | Common | commitment-mgmt |
| `cost_reports` | Config/Master | x | x | x | x | x | x | Core | (cross-module; cost-ingestion) |
| `scheduled_report_deliveries` | Engagement | x | x | x | . | . | . | Common | (cross-module) |
| `cloud_accounts_invoices` (provider invoice / reconciliation) | Master | x | x | x | . | x | x | Core | cost-ingestion |
| `currency_exchange_rates` (consumed) | Consumer | x | x | x | . | . | . | Common | cost-ingestion |
| `finops_personas_assignments` (team/owner mapping) | Config | x | x | x | . | x | . | Common | cost-allocation |

Notes on coverage marks: ProsperOps is deliberately narrow (commitment-only), which is *why* it is in the list: it proves the commitment master stands alone as a sellable product. Native tools (NA) cover most Core masters but at a shallow, single-cloud, no-cross-account-allocation depth, which is what every pure-play exists to beat.

## Compliance entities (non-optional)

FinOps is **not** a statutorily regulated market in the FCRA/HIPAA/GDPR/SOX-mandated sense. There are no FinOps-specific compliance entities the way background checks carry `fcra_disclosures`. Two adjacent obligations are worth a one-line note, but **neither lands as a FINOPS master**:

| Entity | Regulation/regime | Decision |
| --- | --- | --- |
| `sox_audit_trails` | SOX (US public co.) over the cost-allocation -> chargeback -> GL journal path | Belongs to **FIN** (financial close), not FINOPS. FINOPS produces the allocation inputs; the auditable close trail is FIN's. Do NOT master here. |
| `chargeback_journal_entries` | Internal-control / audit over showback->chargeback posting | This is FIN's `journal_entries`. FINOPS hands an allocation file to FIN; it does not master the GL posting. Out of scope. |

Net: **FINOPS carries no compliance masters.** `certification_required=false` is correct.

## Modularization hypothesis

Six candidate modules, each with >=1 master, satisfying Rule #14 (>=3 capabilities -> >=2 full modules; this domain easily clears that). The six map almost 1:1 to the FinOps Framework capability domains, which is the strongest possible grounding that the split is market-shaped, not invented:

1. **cost-ingestion** ("Understand: data ingestion"). Masters: `cloud_billing_accounts`, `cloud_cost_records`, `cloud_usage_records`, `cloud_service_resources`, `cloud_accounts_invoices`. Junction: `cost_data_ingestion_runs`. The FOCUS-normalized billing substrate every other module reads.
2. **cost-allocation** ("Understand: allocation"). Masters: `allocation_dimensions`, `cost_allocations`, `container_cost_allocations`. Config: `cost_allocation_rules`, `shared_cost_split_rules`, `tag_normalization_rules`, `resource_tags`. The showback/chargeback engine (Cloudability Business Mapping, CloudHealth Perspectives, Finout virtual tags).
3. **budgeting-forecast** ("Quantify: planning/forecasting/budgeting"). Masters: `budgets`, `cost_forecasts`, `unit_economics_metrics`. Junction: `budget_alerts`. Cloud-spend budgets/forecasts at the *resource/tag* grain (distinct from EPM's GL-grain plans, see boundary 5b).
4. **anomaly-governance** ("Understand: anomaly management" + "Manage: policy & governance"). Masters: `cost_anomalies`, `governance_policies`. Junctions: `anomaly_alerts`, `policy_evaluations`.
5. **optimization-recs** ("Optimize: workload optimization"). Masters: `optimization_recommendations`, `rightsizing_recommendations`, `idle_resource_findings`, `realized_savings_records`. Junction: `optimization_actions`. Config: `resource_schedules`.
6. **commitment-mgmt** ("Optimize: rate optimization"). Masters: `commitment_plans`, `commitment_recommendations`, `commitment_utilization_records`. Junctions: `commitment_purchases`, `commitment_exchanges`. This is ProsperOps' *entire* product, which is the cleanest possible proof the module is a standalone market unit.

`cost_reports` / `scheduled_report_deliveries` are cross-cutting; park them in cost-ingestion or treat as a thin reporting overlay in Phase A rather than their own module (a reporting-only module would have no master of its own and fail Rule #14). Six modules is comfortably above the 2-module floor; Phase A may merge anomaly-governance and optimization-recs if the master counts feel thin, but the FinOps Framework keeps them as distinct capability domains, so the default is to keep them split.

## Market-shape decisions (feeds the q-file; each grounded in named vendors)

### 5(a) Build FINOPS as a full domain, fold into ITAM, or leave a thin overlay?

**Recommendation: BUILD IT OUT as a full sub-domain under ITAM (keep `parent_domain_id=3`), with its own modules and masters. Do NOT leave it a thin consume-only overlay, and do NOT collapse it into a generic ITAM module.**

Named-vendor grounding:
- **Flagship vendors sell standalone pure-play products.** Apptio Cloudability and CloudHealth are standalone FinOps platforms, not features bolted onto an asset register. **ProsperOps' entire company is one FINOPS module** (commitment-mgmt) sold by itself on savings-share pricing. nOps and Finout are independent venture-funded pure-plays. The "name three independent vendors whose flagship product is this" test (Rule #2) passes overwhelmingly. **Gartner publishes a dedicated 2025 Magic Quadrant for Cloud Financial Management Tools** (Leaders include IBM/Cloudability and Flexera): a named, recognized software category, which is the canonical signal for a domain row.
- **What it masters that nothing else in the catalog does.** Verified above: no catalog domain masters `cloud_cost_records`, `cost_allocations`, `commitment_plans`/`commitment_recommendations`, `cost_anomalies`, or `optimization_recommendations`. SAM masters *installed licenses*, SMP masters *SaaS subscriptions*, FIN masters the *GL*, EPM masters *GL-grain plans*. None touch FOCUS-normalized cloud usage/cost at the resource/tag grain. FINOPS is the unique owner of that surface.
- **Why sub-domain, not top-level, and not folded in.** SKILL.md Rule #6 explicitly names "HAM, SAM, FinOps, EAM" as sub-domains of the ITAM umbrella, each with its own point-solution market, and the row already carries `parent_domain_id=3`. That is the correct shape: it is a real market (so not a folded-in feature) but it sits under the ITAM umbrella alongside SAM and SMP (so not top-level). Flexera One framing (cost + ITAM/SAM convergence) is exactly why the ITAM parentage holds while the FinOps-native masters justify the standalone module set.

### 5(b) Boundaries: what FINOPS masters that the neighbors do NOT, by name

- **FINOPS <-> SMP (SaaS spend).** SMP masters `saas_applications`, `saas_subscriptions`, `saas_usage_metrics`, `shadow_it_apps`, `smp_license_seat_assignments`: the *SaaS* portfolio (Zylo/Productiv-shaped: who's paying for which app, seat utilization, shadow IT). FINOPS masters `cloud_cost_records`, `cloud_service_resources`, `commitment_plans`, `container_cost_allocations`: *IaaS/PaaS* consumption (EC2/RDS/S3/Kubernetes), not app subscriptions. Finout blurs this by ingesting SaaS bills too, but the FINOPS-native masters (resource-level usage, RIs/SPs/CUDs, k8s allocation) have no SMP equivalent. Boundary: **SMP owns the subscription/seat; FINOPS owns the metered cloud resource and its commitment.**
- **FINOPS <-> FIN (general ledger).** FIN masters `general_ledger_accounts`, `journal_entries`, `cost_centers`, `accounting_periods`: the accounting system of record. FINOPS masters `cost_allocations` (showback/chargeback rows at the *tag/resource* grain) and `allocation_dimensions`. The handoff: FINOPS *produces* an allocated chargeback file; FIN *posts* it as `journal_entries` against `cost_centers`. FINOPS does **not** master GL accounts, journals, or the period close. Boundary: **FIN owns the posted, audited GL; FINOPS owns the pre-GL cloud cost allocation that feeds it.** SOX audit trails over the close stay in FIN (see compliance section).
- **FINOPS <-> EPM (FP&A / planning).** EPM masters `financial_budgets`, `financial_forecasts`, `financial_plans`, `financial_scenarios`, `variance_analyses` at the *GL/cost-center/management-reporting* grain (Anaplan/Pigment-shaped). FINOPS masters `budgets`, `cost_forecasts`, `unit_economics_metrics` at the *cloud resource/service/tag* grain, driven off `cloud_usage_records` (Cloudability/CloudHealth forecast from billing telemetry, not from a driver-based FP&A model). Boundary: **EPM plans the enterprise P&L; FINOPS forecasts cloud spend bottom-up from usage.** FINOPS budgets are consumed by / roll up into EPM, not the reverse.
- **FINOPS <-> SPEND-MGMT (corporate spend).** SPEND-MGMT masters `corporate_card_accounts`, `card_authorizations`, `vendor_payment_authorizations`, `spend_requests`, `spend_policies`: *employee-initiated* spend at the card-network/approval layer (Ramp/Brex-shaped). FINOPS has zero overlap: it never sees a card swipe or an expense approval. The only shared noun is "policy", but `governance_policies` in FINOPS are *cloud-resource* rules (untagged-resource alerts, idle-EC2 termination), whereas `spend_policies` in SPEND-MGMT are *purchase-approval* rules. Boundary: **SPEND-MGMT governs people buying things; FINOPS governs machines consuming cloud.** No master moves between them.

### 5(c) Proposed Rule #8 metadata

| Field | Proposed value | Rationale |
| --- | --- | --- |
| `crud_percentage` | **65** (current 70 is close; nudge down) | Allocation rules, budgets, policies, recommendations-tracking are forms+workflow (CRUD-able), but unit-cost allocation, anomaly detection, rightsizing math, and commitment optimization (ProsperOps ADM/adaptive laddering) are algorithm-led and live *beyond* JsonLogic. The existing `business_logic` text already says "Algorithm-led; the rest is reporting." 65 reflects that the optimization/anomaly engines are the differentiated, non-declarable core. |
| `business_logic` | "Unit-cost allocation across shared resources, statistical/ML anomaly detection on usage, rightsizing and idle-resource analysis, and commitment-portfolio optimization (RI/SP/CUD purchase, exchange, rebalance). The CRUD-declarable slice is ingestion config, allocation rules, budgets, and policy CRUD; the optimization and anomaly engines are not JsonLogic-expressible." | Names the non-declarable core. Keep current text or replace with this fuller version. No em-dashes (per project rule). |
| `min_org_size` | **`30 m <2500`** (keep) | Honest call. The FinOps *tooling* buyer is a cloud-heavy org with enough monthly cloud spend (commonly cited threshold ~$100k+/yr, often $1M+) to justify a platform. The 50-250 segment is mostly served by **native tools (AWS Cost Explorer, Azure Cost Management) for free**, or by self-serve mid-market pure-plays (ProsperOps/nOps on savings-share) only once spend is material. A genuine 50-employee SaaS startup with heavy AWS spend exists but is the exception; `30 m <2500` (mid-market floor) is the right minimum. Do NOT drop to `20 s` or `10 xs`: that would misrepresent the buyer and trip the Rule #8 consistency check (no `xs`/`s` floor without SMB-tier solutions, and our solution list is enterprise/mid, not SMB). |
| `cost_band` | **`$$$`** (keep; $100k-$500k TCO for a 500-user org) | Enterprise platforms (Cloudability, CloudHealth, Flexera One) land here at the 500-user anchor. ProsperOps/nOps savings-share can be lower for small footprints but a 500-user-org cloud estate typically pushes annual platform TCO into the $100k-$500k band. `$$$` is correct. |
| `certification_required` | **`false`** (keep) | No statutory product certification; no mandated certified-partner-only delivery. Pure-plays sell and deploy self-serve or partner-assisted but not certification-gated. |
| `usa_market_size_usd_m` | **1500** (keep) with `market_size_source_year=2025` | Caution: third-party "Cloud FinOps market" reports cite ~$14-15B global for 2025, but those bundle services, internal practice headcount, and managed-services revenue. The **tooling-software** slice (what this column tracks) is a fraction of that; the US share of the FinOps *tools* TAM triangulates to roughly $1.5-2B (Gartner CFM Tools MQ vendor revenue base). Keep 1500 as a defensible US tools-only figure; 2000 is the upper bound if a broader software definition is preferred. Do NOT import the $14B headline: it is the wrong denominator. |
| `market_size_source_year` | **2025** (keep) | Gartner 2025 Magic Quadrant for Cloud Financial Management Tools is the anchor. |

## Proposed capabilities (6, mapped to FinOps Framework capability domains)

Drafted as the domain's capability set (Phase A would assign `capability_code`s). Six is within the 5-8 target and each anchors at least one module:

1. **Cloud cost data ingestion & normalization** — ingest multi-cloud billing/usage exports (CUR/Cost Management/Billing), normalize to a FOCUS-style schema, build the resource inventory. (module: cost-ingestion)
2. **Cost allocation, showback & chargeback** — tag-and-rule-driven allocation to teams/products/cost-centers, shared-cost splitting, container/k8s allocation. (module: cost-allocation)
3. **Cloud budgeting, forecasting & unit economics** — resource-grain budgets, usage-driven forecasts, cost-per-unit / cost-per-customer metrics. (module: budgeting-forecast)
4. **Cost anomaly detection & policy governance** — statistical/ML anomaly alerting and cloud-resource governance policies (untagged-resource, idle, best-practice). (module: anomaly-governance)
5. **Workload & resource optimization** — rightsizing, idle/orphan detection, scheduling, recommendation tracking, realized-savings measurement. (module: optimization-recs)
6. **Commitment (rate) optimization** — RI/SP/CUD inventory, purchase recommendations, utilization tracking, autonomous exchange/rebalance. (module: commitment-mgmt)

(Optional 7th if Phase A wants to split governance from anomaly: **FinOps practice operations** — onboarding, persona/owner mapping, accountability reporting. Borderline; the FinOps Framework lists it as a "Manage" capability but it is thin on mastered records, so it is folded into anomaly-governance/cost-allocation by default rather than given its own capability.)

## Sources
- [FinOps Framework Domains & Capabilities](https://www.finops.org/framework/domains/)
- [FOCUS spec (FinOps Open Cost & Usage Specification) v1.2/1.3/1.4](https://focus.finops.org/focus-specification/)
- [Apptio Cloudability — Business Mapping / Rightsizing / Container Cost Allocation](https://www.apptio.com/products/cloudability/)
- [VMware Tanzu CloudHealth tech docs — Perspectives, Policies, Reservations, Rightsizing, Realized Savings](https://techdocs.broadcom.com/us/en/vmware-tanzu/cloudhealth/tanzu-cloudhealth/saas/tnz-cloudhealth/using-and-managing-tanzu-cloudhealth-using-and-managing-index.html)
- [ProsperOps — Autonomous Discount Management (RI/SP/CUD)](https://www.prosperops.com/)
- [nOps — automated cloud cost optimization platform](https://www.nops.io/)
- [Finout — cost management overview](https://www.finout.io/)
- [2025 Gartner Magic Quadrant for Cloud Financial Management Tools (via Apptio / Flexera)](https://www.apptio.com/resources/analyst-reports/2025-gartner-magic-quadrant-for-cloud-financial-management-tools/)
- [Cloud FinOps market size reports (Straits/Precedence/MarketsandMarkets) — note: global, services-inclusive, NOT the tools-only TAM]
