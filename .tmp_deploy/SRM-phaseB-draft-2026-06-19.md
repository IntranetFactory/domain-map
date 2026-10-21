# SRM Phase-B draft: new masters proposal (review before load)

Status: PROPOSAL ONLY. Nothing here is loaded. Per Rule #21 (expansive additions) and
Rule #22, the new-masters list is surfaced for user review in q-SRM.md before any
Phase-A/B load. Source surface: `.tmp_deploy/SRM-phase0-2026-06-19.md` (the flagship-vendor
union matrix: HI=HICX, AP=apexanalytix, GR=Graphite, AR=Ariba SLP, IV=Ivalua).

Necessity applies Rule #16 at insert time:
- (B) statute-prefixed or sector/geography-bound compliance entity -> optional.
- (C) Phase 0 showed at least one flagship vendor without the entity -> optional.
- (D) none of the above and the workflow halts without it -> required.

Count note: the audit shorthand says "17 new masters"; the Phase 0 surface matrix actually
flags 20 entities as NEW (the existing 6 masters are excluded). All 20 are drafted below so
the user reviews the complete list. The 6 compliance entities sit in SRC and are
regulation-driven (needed by every regulated buyer regardless of vendor surface), but Rule #16
still lands them `optional` because they are statute/sector-bound: the module is the activation
gate, the tenant enables by jurisdiction.

## Supplier Lifecycle Management (SLM)

| data_object_name | module | role | necessity | basis | one-line purpose |
| --- | --- | --- | --- | --- | --- |
| supplier_contacts | SLM | master | required | 5/5 vendors; D (workflow needs named contacts) | Per-supplier contact roster (procurement, AP, legal, certification contacts) as a structured collection. |
| supplier_locations | SLM | master | optional | 4/5 (apexanalytix lacks); C | Physical/operating sites per supplier (ship-from, remit-to, manufacturing locations). |
| supplier_bank_accounts | SLM | master | required | 5/5; D (banking is core onboarding) | Validated remittance bank accounts per supplier, the payment-detail record AP consumes. |
| supplier_documents | SLM | master | required | 5/5; D | Supplier-uploaded documents (W-9, tax forms, certificates, agreements) with metadata. |
| supplier_relationships | SLM | master | optional | 4/5 (apexanalytix lacks); C | Parent/child and affiliate hierarchies between supplier records. |
| supplier_registrations | SLM | master | required | 5/5; D (distinct from onboarding intake) | Self-service registration record a prospective supplier submits before onboarding. |
| supplier_segmentation_tiers | SLM | master | optional | 3/5 (apexanalytix, Graphite lack); C | Category/strategic tier classification used to prioritize supplier management effort. |
| supplier_information_requests | SLM | master | required | 5/5; D | Data-refresh campaigns asking suppliers to update or re-attest their information. |
| supplier_tasks | SLM | master | optional | 4/5 (apexanalytix lacks); C | Workflow tasks/to-dos assigned across the supplier-management lifecycle. |
| supplier_questionnaires | SLM | master | optional | 4/5 (HICX lacks named); C | Reusable questionnaire templates/instances; mastered in SLM, consumed by SPM/SRC (single-master, Rule M7). |

## Supplier Performance Management (SPM)

| data_object_name | module | role | necessity | basis | one-line purpose |
| --- | --- | --- | --- | --- | --- |
| supplier_kpis | SPM | master | optional | 3/5 (apexanalytix, Graphite lack); C | Defined performance metrics (delivery, quality, responsiveness, savings) tracked per supplier. |
| supplier_performance_reviews | SPM | master | optional | 3/5 (apexanalytix, Graphite lack); C | Periodic review records rolling KPIs into a shared assessment with the supplier. |
| supplier_corrective_actions | SPM | master | optional | 3/5 (apexanalytix, Graphite lack); C | Corrective-action plans (CAPAs) opened against underperformance and tracked to closure. |
| supplier_issues | SPM | master | optional | 2/5 (Common); C | Logged supplier issues/complaints feeding performance and corrective-action workflows. |

## Supplier Risk & Compliance (SRC)

| data_object_name | module | role | necessity | basis | one-line purpose |
| --- | --- | --- | --- | --- | --- |
| supplier_screening_records | SRC | master | optional | 3/5 (Comp); B (sanctions/PEP: OFAC, UN, EU, HMT; FATF Rec.17) | Time-stamped sanctions/denied-party/PEP screening events per supplier with audit trail. |
| supplier_beneficial_owners | SRC | master | optional | 2/5 (Comp); B (KYC/UBO: AML Act 2020, FinCEN CTA, FATF) | Beneficial-ownership records (>=25% UBO) for know-your-business diligence. |
| supplier_esg_assessments | SRC | master | optional | 3/5 (Comp); B (ESG: CSRD, EU CSDDD, EcoVadis) | Sustainability/ESG scoring records per supplier. |
| supplier_diversity_classifications | SRC | master | optional | 2/5 (Comp); B (diversity: FAR small-business subcontracting, NMSDC/WBENC) | Diversity/Tier-1/Tier-2 spend certifications (MBE, WBE, VBE, etc.) with expiry. |
| supplier_insurance_certificates | SRC | master | optional | 2/5 (Comp); C (only 2 vendors surface it) | Certificate-of-insurance tracking with coverage limits and expiry alerts. |
| supplier_attestations | SRC | master | optional | 4/5 (Comp); B (modern-slavery acts, Dodd-Frank 1502 conflict minerals) | Code-of-conduct, modern-slavery, and conflict-minerals declarations the supplier signs. |

## Notes for the load pass (when approved)

- `supplier_questionnaires` is mastered once in SLM and consumed by SPM/SRC via `domain_module_data_objects` consumer rows (do not double-master; Rule M7).
- Every entity is `entity_type='operational_workflow'` unless review reclassifies; pattern flags
  (has_personal_content/has_submit_lock/has_single_approver) are set per master at load time after
  the same Rule #12 per-flag review applied to the 6 headline masters (supplier_contacts is a clear
  has_personal_content=true candidate).
- Lifecycle states, aliases, and DMDO role/necessity rows are authored at insert time in the
  Phase-B loader, anchored to the realizing module.
