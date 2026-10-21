# SPEND-ANALYTICS Phase 0 — Vendor Surface

Research only. No inserts proposed, no DB writes. Catalog confirmed: no `SPEND-ANALYTICS`
domain exists yet (GET `/domains?domain_code=eq.SPEND-ANALYTICS` returned `[]`).

Neighbor masters already loaded (do NOT re-master these):
- SRM masters `suppliers`, `supplier_onboardings`, `supplier_qualifications`, `supplier_scorecards`, `supplier_risk_assessments`, `supplier_certifications`.
- FIN masters `journal_entries`, `general_ledger_accounts`, `cost_centers`, `legal_entities`, `accounting_periods`.
- SPEND-MGMT masters `corporate_card_accounts`, `card_authorizations`, `spend_requests`, `spend_policies`.
- S2P / AP-AUTO have no modules loaded yet, but POs, invoices, goods receipts, and contracts conceptually belong to them and are CONSUMED here.

## Flagship vendors

| Vendor | URL | Specialist in | Why included |
|---|---|---|---|
| Sievo | https://sievo.com | Enterprise spend analytics: AI classification to customer taxonomy, cross-customer supplier database (100M+ mapped, D&B-enriched), spend cube, savings lifecycle | Reference pure-play; deepest published data-model surface (classification, normalization, savings tracking) |
| SpendHQ | https://www.spendhq.com | Spend intelligence + procurement performance management; closed-loop opportunity-to-realized-savings; ESG features | Pure-play; acquired Per Angusta (2022, $65M Pamlico) adding performance/initiative management. Confirms savings-initiative masters belong in the domain |
| Simfoni | https://simfoni.com | Spend intelligence, tail-spend management, closed-loop push-to-source; Strategic Spend Hub on Snowflake | Pure-play; strongest tail-spend / addressable-spend segmentation surface |
| SAP Ariba Spend Analysis | https://www.sap.com/products/spend-management/spend-analytics-software.html | Spend visibility, AI classification + enrichment (benchmarking, parent-company, industry codes) over SAP + 3rd-party data | The single diversified suite. "Spend Analysis" is a discrete Ariba module, confirming the market is modeled standalone even inside a suite |

(GEP SMART Spend, Coupa Spend Analysis cross-checked for matrix coverage; not separate columns to keep one-suite cap.)

## Surface matrix

| Entity | Category | Master/Consumer | Sievo | SpendHQ | Simfoni | SAP Ariba SA | Classification | Proposed module |
|---|---|---|---|---|---|---|---|---|
| spend_classification_taxonomies | Config/templates | Master | x | x | x | x | Core | CLASSIFICATION |
| spend_categories | Master records | Master | x | x | x | x | Core | CLASSIFICATION |
| classification_rules | Config/templates | Master | x | x | x | x | Core | CLASSIFICATION |
| classified_spend_transactions | Master records | Master | x | x | x | x | Core | CLASSIFICATION |
| spend_classification_overrides | Junctions/transitions | Master | x | x | x | x | Core | CLASSIFICATION |
| spend_cube_snapshots | Master records | Master | x | x | x | x | Core | CLASSIFICATION |
| supplier_normalization_mappings | Junctions/transitions | Master | x | x | x | x | Core | NORMALIZATION |
| supplier_parent_hierarchies | Master records | Master | x | x | . | x | Common | NORMALIZATION |
| supplier_enrichment_records | Master records | Master | x | x | . | x | Common | NORMALIZATION |
| data_source_loads | Config/templates | Master | x | x | x | x | Core | NORMALIZATION |
| data_quality_exceptions | Audit/compliance | Master | x | x | x | x | Core | NORMALIZATION |
| purchase_orders | (source) | Consumer (S2P) | x | x | x | x | Core | (consumed) |
| supplier_invoices | (source) | Consumer (AP-AUTO/S2P) | x | x | x | x | Core | (consumed) |
| general_ledger_postings | (source) | Consumer (FIN) | x | x | x | x | Core | (consumed) |
| card_transactions | (source) | Consumer (SPEND-MGMT) | x | x | x | x | Common | (consumed) |
| contracts | (source) | Consumer (S2P) | x | x | . | x | Common | (consumed) |
| savings_opportunities | Master records | Master | x | x | x | x | Core | OPPORTUNITY |
| savings_initiatives | Master records | Master | x | x | x | . | Core | OPPORTUNITY |
| initiative_milestones | Junctions/transitions | Master | . | x | x | . | Common | OPPORTUNITY |
| realized_savings_records | Master records | Master | x | x | x | x | Core | OPPORTUNITY |
| addressable_spend_segments | Master records | Master | x | x | x | x | Core | OPPORTUNITY |
| tail_spend_segments | Master records | Master | x | . | x | . | Common | OPPORTUNITY |
| spend_benchmarks | Master records | Master | x | . | x | x | Common | OPPORTUNITY |
| spend_dashboards | Config/templates | Master | x | x | x | x | Core | OPPORTUNITY |
| spend_kpi_definitions | Config/templates | Master | x | x | x | x | Core | OPPORTUNITY |
| opportunity_assignments | Engagement/outreach | Master | . | x | x | . | Common | OPPORTUNITY |
| stakeholder_alerts | Engagement/outreach | Master | x | x | . | . | Common | OPPORTUNITY |
| diverse_spend_records | Audit/compliance | Master | x | x | . | x | Compliance | DIVERSITY-ESG |
| supplier_diversity_classifications | Audit/compliance | Master | x | x | . | x | Compliance | DIVERSITY-ESG |
| tier2_diverse_spend_submissions | Audit/compliance | Master | . | x | . | . | Compliance | DIVERSITY-ESG |
| scope3_spend_emissions | Audit/compliance | Master | x | x | . | x | Compliance | DIVERSITY-ESG |
| classification_audit_logs | Audit/compliance | Master | x | x | x | x | Core | NORMALIZATION |

## Compliance / regulatory-adjacent entities

This is NOT a heavily-regulated market (no FCRA/HIPAA/GDPR-subject/SOX-close/FDA/PCI core).
The only genuine regulatory adjacency is supplier-diversity and ESG/scope-3 spend reporting,
both voluntary/contractual disclosure rather than statutory licensing.

| Entity | Driver | Proposed module |
|---|---|---|
| diverse_spend_records | US supplier-diversity programs (Tier-1 certified MBE/WBE/SDB spend) | DIVERSITY-ESG |
| supplier_diversity_classifications | Diversity-certification status on normalized suppliers | DIVERSITY-ESG |
| tier2_diverse_spend_submissions | Tier-2 indirect diverse-spend reporting to enterprise customers / federal contractors | DIVERSITY-ESG |
| scope3_spend_emissions | ESG / scope-3 category spend emissions reporting | DIVERSITY-ESG |

These are real but light. DIVERSITY-ESG is a discretionary module, not a mandatory compliance
spine; the domain is "finished" without it.

## Modularization hypothesis

Rule #14: every module has >=1 master; a domain with >=3 capabilities needs >=2 full modules.
Four candidate masters cleanly separate, three are clearly full modules:

- **CLASSIFICATION** (full). Masters: `spend_classification_taxonomies`, `spend_categories`,
  `classification_rules`, `classified_spend_transactions`, `spend_classification_overrides`,
  `spend_cube_snapshots`. The category tree and the classified-and-normalized spend cube. This
  is the irreducible core; if the domain exists, this module exists.

- **NORMALIZATION** (full). Masters: `supplier_normalization_mappings`,
  `supplier_parent_hierarchies`, `supplier_enrichment_records`, `data_source_loads`,
  `data_quality_exceptions`, `classification_audit_logs`. Maps dirty transaction-supplier
  strings to the SRM `suppliers` master and to D&B parent hierarchies. Masters the MAPPING, never
  the supplier record itself (SRM owns that).

- **OPPORTUNITY** (full). Masters: `savings_opportunities`, `savings_initiatives`,
  `realized_savings_records`, `addressable_spend_segments`, `tail_spend_segments`,
  `spend_benchmarks`, `spend_dashboards`, `spend_kpi_definitions`, plus `initiative_milestones`,
  `opportunity_assignments`, `stakeholder_alerts`. Savings funnel
  identified -> approved -> in-sourcing -> realized -> validated, addressable/tail segmentation,
  and the analytical presentation layer.

- **DIVERSITY-ESG** (full but discretionary). Masters: `diverse_spend_records`,
  `supplier_diversity_classifications`, `tier2_diverse_spend_submissions`,
  `scope3_spend_emissions`. Reporting overlay; non-blocking.

All transaction sources (`purchase_orders`, `supplier_invoices`, `general_ledger_postings`,
`card_transactions`, `contracts`) are CONSUMED, never mastered here. The domain reads them and
writes only its own classification, normalization-mapping, and analytical records over them.

## Domain-vs-capability verdict

SPEND-ANALYTICS is a standalone DOMAIN, best classified as a derive-heavy established_market. The
deciding test is master-vs-consume, not vendor count: although every source transaction (PO,
invoice, GL posting, card line, contract) is consumed from S2P/FIN/AP-AUTO/SPEND-MGMT, the domain
persists a substantial body of records that no neighbor owns: the spend classification taxonomy
and category tree, the classified-and-normalized spend cube, supplier-normalization and
parent-hierarchy mappings (distinct from SRM's `suppliers` master), and the savings
opportunity/initiative/realized funnel with addressable and tail-spend segmentation. Three full
modules each anchored on >=1 unique master clear Rule #14 comfortably, and the fact that even the
diversified suite (SAP Ariba) ships "Spend Analysis" as a discrete, separately-licensed module
confirms the market treats it as its own surface rather than an S2P feature. It is not a
capability of S2P: S2P masters the operational buying chain (requisition->PO->receipt->invoice),
whereas this domain masters the retrospective analytical layer built on top of that chain and on
FIN/card data S2P never touches.
