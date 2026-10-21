# Bare-word triage proposal (Phase B1, Step 4 task 2) — v2

> **Revised principle (2026-05-22):** prefixing is the **default** when the bare term has any cross-domain ambiguity in the wider SaaS landscape (not just in this catalog today). Canonical bare-word claims are reserved for terms that genuinely mean one thing across all business software contexts (e.g. `influencers`, `courses`, `ontologies`, `milkings`). The earlier draft over-claimed canonical authority for many CRM/ITSM/GRC concepts that are widely overloaded across SaaS.
>
> **Reviewer action:** edit any row where my recommendation is wrong. Decision grammar:
> - `rename:<new_name>` — cascade via `rename_data_object.ts`
> - `canonical:<rationale>` — set `is_canonical_bare_word=true` + rationale
> - `defer` — leave unresolved (sparingly)
>
> **Side note (not blocking Step 4):** `invoices` is currently mastered by S2P; user feedback was "I think of invoices as ERP." This is a **master-attribution** issue (the `domain_data_objects` role row) that's separate from the naming question — flagged in Tier B notes below. Suggest a follow-on review of S2P/ERP-FIN/ERP-AR boundaries once Step 4 lands.

---

## Tier A — Canonical (12 rows)

The bare term means one thing across business software. No cross-domain ambiguity even when imagined outside this catalog's current scope.

| id | bare name | master | rationale (becomes `naming_authority_rationale`) |
|---|---|---|---|
| 130 | `influencers` | SMM | Social media management owns "influencers" as the canonical creator-relationship concept. No competing meaning in business software. |
| 167 | `courses` | LMS | LMS owns "courses" as the canonical training-course concept. No competing meaning in business software. |
| 254 | `ontologies` | DATA-AI-PLAT, DCG | Data catalog/governance owns "ontologies" as the canonical controlled-vocabulary concept. |
| 501 | `milkings` | DAIRY-MGMT | Dairy management owns "milkings" as the canonical milking-event concept. Domain-unique. |
| 251 | `envelopes` | ESIGN | E-signature platforms own "envelopes" as the canonical signature-package concept (DocuSign convention adopted industry-wide). |
| 386 | `checkouts` | B2C-COMM | Commerce owns "checkouts" as the canonical purchase-flow concept. |
| 388 | `fulfillments` | B2C-COMM | Commerce owns "fulfillments" as the canonical order-fulfillment concept. |
| 383 | `carts` | B2C-COMM | Commerce owns "carts" as the canonical shopping-cart concept. |
| 390 | `coupons` | B2C-COMM | Commerce owns "coupons" as the canonical discount-code concept. |
| 3 | `candidates` | ATS | ATS owns "candidates" as the canonical job-applicant concept in business software. |
| 8 | `interviews` | ATS | ATS owns "interviews" as the canonical hiring-interview concept in business software. |
| 97 | `customers` | CRM, CDP, CSM, MDM, SUB-MGMT | Customer is the unambiguous canonical term across business software. Multi-master is a metadata reality (federated across CRM-sales / CDP-marketing / CSM-success / MDM-golden-record / SUB-MGMT-subscription views), not a naming problem; future master-data promotion to a shared module is an orthogonal deployer concern. |
| 31 | `employees` | HCM, MDM, PAYROLL, IGA | Employee is the unambiguous canonical term across business software. Multi-master is a metadata reality (HCM system-of-record + slices held by MDM/PAYROLL/IGA + embedded_master in ATS/BEN-ADMIN/COMP-MGMT/EMP-EXP/LMS/ONBOARDING/TALENT-MGMT/WFM), not a naming problem. |
| 206 | `suppliers` | SUP-LIFE, MDM | Supplier is the unambiguous canonical term across business software. Multi-master is a metadata reality (SUP-LIFE lifecycle + MDM master record); staffing_suppliers is an HCM-side niche sibling that justifies its own prefix without dispossessing the bare term. |

---

## Tier B — Rename (46 rows)

Default to prefix. The new name is the master domain's natural prefix (e.g. `crm_*`, `itsm_*`, `marketing_*`, `commerce_*`, `service_*`, `compliance_*`, `financial_*`). For multi-master cases (customers, suppliers), use the `master_*` prefix to signal master-data status — the deployer's master-data-promotion path can later move them to a shared master module.

### B.1 — From original Tier 1 (prefix-clash, all 25)

| id | bare name | master(s) | rename to | notes |
|---|---|---|---|---|
| 85 | `alerts` | ITOM, RMM | `monitoring_alerts` | network_performance_alerts is sibling; security alerts, financial alerts also exist. |
| 4 | `applications` | ATS | `job_applications` | Plan §6.1. |
| 10 | `assessments` | ATS | `candidate_assessments` | Plan §6.1. |
| 116 | `campaigns` | MA | `marketing_campaigns` | survey_campaigns, ad campaigns, donation campaigns all real. |
| 171 | `certifications` | LMS | `learner_certifications` | building/data/IGA-access/supplier certifications are distinct concepts. |
| 471 | `connectors` | IPAAS | `integration_connectors` | "connectors" overloads with DB connectors, MCP connectors, hardware connectors broadly. |
| 66 | `contracts` | CLM | `legal_contracts` | asset/employment/msp/service contracts all live in adjacent domains. |
| 429 | `documents` | ECM | `content_documents` | "documents" is universally overloaded; disclosure_documents is a regulatory sibling. |
| 371 | `drivers` | FLEET-MGMT | `fleet_drivers` | engagement_drivers (CSM/EPM metric) is a real different concept. |
| 84 | `events` | ITOM | `monitoring_events` | 19+ sibling rows (asset_lifecycle, breeding, cow_health, critical_tracking, …). Canonical claim indefensible. |
| 486 | `fields` | FMIS | `farm_fields` | overloads with form fields / extracted fields. |
| 39 | `forecasts` | EPM | `financial_forecasts` | attrition/harvest/position_demand forecasts are first-class peers. |
| 120 | `forms` | MA | `marketing_forms` | "forms" is hugely overloaded (form-builders, gov forms, nocode_forms sibling). |
| 47 | `incidents` | ITSM | `service_incidents` | dlp/food_safety/loss/quality incident siblings all real; "incidents" overloads in GitHub/PagerDuty/etc. |
| 75 | `invoices` | S2P | `supplier_invoices` | **Master-attribution flag:** S2P models AP-side (vendor sends to us). If ERP-FIN/ERP-AR should be the master for invoices generally, that's a separate `domain_data_objects` cleanup; this rename scopes the existing row to its accurate AP semantics. |
| 345 | `leases` | REAL-EST | `property_leases` | vehicle leases, equipment leases, IT leases all common. |
| 381 | `orders` | B2C-COMM | `commerce_orders` | 16+ sibling order types (butcher, clinical, eam_work, …). |
| 285 | `policies` | GRC | `compliance_policies` | IAM/network/DLP/insurance/device policies all real; "policies" is one of the most overloaded SaaS terms. |
| 384 | `products` | B2C-COMM | `commerce_products` | data_products is fundamentally different. |
| 216 | `projects` | PSA | `service_projects` | CAPEX projects, work_projects, R&D projects all exist outside PSA. |
| 6 | `referrals` | ATS | `candidate_referrals` | Plan §6.1; patient_referrals is a real healthcare sibling. |
| 389 | `shipments` | B2C-COMM | `commerce_shipments` | bulk_milk_shipments is a vertical sibling; freight/parcel/intercompany shipments also common. |
| 385 | `storefronts` | B2C-COMM | `commerce_storefronts` | farm_storefronts is a vertical sibling. |
| 206 | `suppliers` — **moved to Tier A** | | | (supplier = supplier; staffing_suppliers is a niche sibling that doesn't dispossess the bare term) |
| 254 | `ontologies` — **moved to Tier A** | | | |

### B.2 — From original Tier 2 (multi-domain, all 9)

| id | bare name | master(s) | rename to | notes |
|---|---|---|---|---|
| 50 | `changes` | ITSM | `service_changes` | "changes" is generic; git changes, change orders, ECN/PCN, etc. |
| 98 | `contacts` | CRM | `crm_contacts` | "contacts" overloads with phone contacts, point-of-contact, etc. |
| 97 | `customers` — **moved to Tier A** | | | (customer = customer; multi-master is metadata not naming) |
| 31 | `employees` — **moved to Tier A** | | | (same rationale) |
| 289 | `issues` | GRC | `audit_issues` | "issues" overloads massively (ITSM, GitHub, Jira, etc.); GRC's "issues" are audit/compliance findings — scope the name accordingly. |
| 99 | `leads` | CRM | `crm_leads` | "leads" overloads with sales-development-rep leads, lead-time, lead-paint, etc. |
| 100 | `opportunities` | CRM | `crm_opportunities` | "opportunities" overloads with general business opportunities, M&A opportunities, etc. |
| 32 | `positions` | HCM | `hcm_positions` | "positions" overloads heavily (trading positions, GPS positions, board positions). |
| 370 | `vehicles` | FLEET-MGMT | `fleet_vehicles` | Multi-domain (FLEET-MAINT/TELEMATICS consume); prefix anchors authority. |

### B.3 — From original Tier 3 (single-domain but term-ambiguous)

| id | bare name | master | rename to | notes |
|---|---|---|---|---|
| 38 | `budgets` | EPM | `financial_budgets` | project budgets, ad budgets, marketing budgets all real. |
| 121 | `cadences` | SALES-ENG | `sales_cadences` | Marketing automation also uses "cadences"; medical dosing has "cadences". |
| 283 | `controls` | GRC | `compliance_controls` | "controls" overloads hugely (HVAC controls, UI controls, internal controls, etc.). |
| 443 | `experiences` | DXP | `digital_experiences` | "experiences" overloads heavily (customer experience, user experience, work experience). |
| 11 | `offers` | ATS | `job_offers` | Plan §6.1; promotional offers, terms-of-offer, etc. |
| 273 | `portfolios` | SPM | `strategic_portfolios` | investment portfolios, work portfolios, design portfolios. |
| 49 | `problems` | ITSM | `service_problems` | "problems" too generic to claim canonical. |
| 416 | `quotes` | CPQ | `sales_quotes` | insurance quotes, legal-fee quotes, contractor quotes. |
| 480 | `retainers` | AGENCY-MGMT | `agency_retainers` | User pushback: retainers in CLM/purchasing context (buyer-side) are legitimate; agency_ prefix scopes to the sell-side. |
| 282 | `risks` | GRC | `compliance_risks` | insurance risks, project risks, security risks, supply-chain risks all first-class elsewhere. |
| 161 | `shifts` | WFM | `work_shifts` | phase shifts, paradigm shifts; even within business: shifts in priorities. |
| 53 | `slas` | ITSM | `service_slas` | SLAs also live in CLM (as contract terms) and in vendor agreements. |
| 347 | `spaces` | REAL-EST | `property_spaces` | parking spaces, office spaces, namespace "spaces", design spaces. |
| 358 | `tenants` | RE-PROP-MGMT | `property_tenants` | User pushback: SaaS multi-tenancy is the dominant meaning of "tenants" today. |

---

## Summary

| Decision | Count | Mechanism |
|---|---|---|
| Canonical | 14 | PATCH `is_canonical_bare_word=true` + rationale |
| Rename | 43 | `rename_data_object.ts` per row |
| Defer | 0 | — |

Renames in execution order (alphabetical):

1. `alerts` (85) → `monitoring_alerts`
2. `applications` (4) → `job_applications`
3. `assessments` (10) → `candidate_assessments`
4. `budgets` (38) → `financial_budgets`
5. `cadences` (121) → `sales_cadences`
6. `campaigns` (116) → `marketing_campaigns`
7. `certifications` (171) → `learner_certifications`
8. `changes` (50) → `service_changes`
9. `connectors` (471) → `integration_connectors`
10. `contacts` (98) → `crm_contacts`
11. `contracts` (66) → `legal_contracts`
12. `controls` (283) → `compliance_controls`
13. `documents` (429) → `content_documents`
14. `drivers` (371) → `fleet_drivers`
15. `events` (84) → `monitoring_events`
16. `experiences` (443) → `digital_experiences`
17. `fields` (486) → `farm_fields`
18. `forecasts` (39) → `financial_forecasts`
19. `forms` (120) → `marketing_forms`
20. `incidents` (47) → `service_incidents`
21. `invoices` (75) → `supplier_invoices`
22. `issues` (289) → `audit_issues`
23. `leads` (99) → `crm_leads`
24. `leases` (345) → `property_leases`
25. `offers` (11) → `job_offers`
26. `opportunities` (100) → `crm_opportunities`
27. `orders` (381) → `commerce_orders`
28. `policies` (285) → `compliance_policies`
29. `portfolios` (273) → `strategic_portfolios`
30. `positions` (32) → `hcm_positions`
31. `problems` (49) → `service_problems`
32. `products` (384) → `commerce_products`
33. `projects` (216) → `service_projects`
34. `quotes` (416) → `sales_quotes`
35. `referrals` (6) → `candidate_referrals`
36. `retainers` (480) → `agency_retainers`
37. `risks` (282) → `compliance_risks`
38. `shifts` (161) → `work_shifts`
39. `shipments` (389) → `commerce_shipments`
40. `slas` (53) → `service_slas`
41. `spaces` (347) → `property_spaces`
42. `storefronts` (385) → `commerce_storefronts`
43. `vehicles` (370) → `fleet_vehicles`

Canonical claims (alphabetical):

1. `candidates` (3) — ATS owns
2. `carts` (383) — commerce owns
3. `checkouts` (386) — commerce owns
4. `coupons` (390) — commerce owns
5. `courses` (167) — LMS owns
6. `customers` (97) — federated master (CRM/CDP/CSM/MDM/SUB-MGMT); name unambiguous
7. `employees` (31) — federated master (HCM/MDM/PAYROLL/IGA); name unambiguous
8. `envelopes` (251) — ESIGN owns
9. `fulfillments` (388) — commerce owns
10. `influencers` (130) — SMM owns
11. `interviews` (8) — ATS owns
12. `milkings` (501) — dairy owns
13. `ontologies` (254) — data/AI owns
14. `suppliers` (206) — federated master (SUP-LIFE/MDM); name unambiguous
