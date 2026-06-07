# CLM audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 5 full modules (`CLM-AUTHORING`, `CLM-NEGOTIATION`, `CLM-REPOSITORY`, `CLM-OBLIGATION-MGMT`, `CLM-RENEWAL`) + 1 starter hosted via `domain_module_host_domains` (`REAL-ESTATE-AGENT`, primary host RE-BROKERAGE). 5 masters (`legal_contracts`, `contract_obligations`, `contract_clauses`, `contract_templates`, `signature_records`). 8 capabilities (1 cross-cutting: `APPROVAL-WORKFLOW`). 12 solutions (8 primary, 1 secondary, 3 partial). 12 trigger_events. 13 outbound + 13 inbound cross-domain handoffs (26 cross-domain total). 2 intra-domain cross-module handoffs (1209, 1210). 12 aliases. 33 lifecycle states across all 5 masters. 5 system skills + 49 `skill_tools` rows in CLM proper (strict Semantius score approximately 90%). 5 CLM roles + 1 cross-functional role (SALES-TRANSACTION-COORDINATOR) using CLM-REPOSITORY for the real-estate brokerage flow.
- **Vendor-surface basis (Pass 2 flagship enumeration):** Icertis Contract Intelligence, Ironclad, DocuSign CLM, Agiloft CLM, ContractPodAi Leah, Sirion CLM, LinkSquares Finalize and Analyze, Onit Enterprise Legal Management, Workday Evisort, plus the integrated CLM modules inside Salesforce Revenue Cloud, ServiceNow Contract Management Pro, and DealHub CPQ. Compliance-specialist coverage anchored on eIDAS (electronic signatures) and ASC 606 (revenue recognition) per loaded regulations.
- **Bucket 1 (in-scope, agent fixable):** 11 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 9 items.

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO + cross-domain relationships, ranked by edge weight):

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| S2P | 2 | 2 | 0 | 1 (sourcing_events consumed by CLM-AUTH) | 5 | Pairwise (full) |
| CPQ | 1 | 3 | 0 | 2 (contract_drafts, quote_discounts flow into legal_contracts) | 6 | Pairwise (full) |
| CRM | 1 | 1 | 1 (CRM-PIPELINE-MGT consumer on legal_contracts) | 2 | 5 | Pairwise (full) |
| SUB-MGMT | 2 | 0 | 0 | 2 (backs / renewed_into customer_subscriptions) | 4 | Pairwise (full) |
| PSA | 1 | 1 | 1 (PSA-PROJECT-DELIVERY consumer on legal_contracts) | 2 (seeds service_projects, project_billing_milestones updates obligations) | 5 | Pairwise (full) |
| SMP | 1 | 1 | 1 (SMP-RENEWAL-VENDOR contributor on legal_contracts) | 2 (renewal_warns / activates saas_subscriptions) | 5 | Pairwise (full) |
| CSM | 1 | 0 | 1 (CSM-ENTITLEMENTS contributor on legal_contracts) | 2 (governs customer_entitlements, alerts customer_cases) | 4 | Pairwise (full) |
| AGENCY-MGMT | 1 | 1 | 0 | 1 (seeds agency_jobs; estimate.approved → legal_contracts) | 3 | Pairwise (full) |
| ESIGN | 0 | 1 | 0 | 1 (envelope → signature_record) | 2 | Lightweight |
| GRC | 1 | 0 | 0 | 1 (breaches_into audit_issues) | 2 | Lightweight |
| ERP-FIN | 1 | 0 | 0 | 0 | 1 | Lightweight |
| AP-AUTO | 1 | 0 | 0 | 1 (propagates_terms_to invoice_matches) | 2 | Lightweight |
| LEGAL-PRACT-MGMT | 0 | 1 | 0 | 1 (engagement_letters → legal_contracts) | 2 | Lightweight |
| ACCT-PRACT-MGMT | 0 | 1 | 0 | 1 (engagement_letters → legal_contracts) | 2 | Lightweight |
| RE-CRE | 0 | 1 | 0 | 1 (commercial_leases → legal_contracts) | 2 | Lightweight |
| RE-BROKERAGE | 0 | 1 | 0 | 0 (starter host only) | 1 | Lightweight |
| LMS | 0 | 0 | 2 (2 modules embed signature_records) | 0 | 2 | Lightweight |

**Structural pass bands:** A / C / D / E / F all pass on positive checks. **M7 hard-fails** (catalog-wide within-domain incoherence across 3 masters; 8 consumer DMDO rows coexisting with sibling-module master rows). **B9 partial-fail** (5 trigger_events with empty `event_category`). **B9b partial-fail** (only 2 intra-domain cross-module handoff rows on a 5-module domain). **H1 hard-fail** (3 of 26 cross-domain handoffs tagged; all 3 `discovery_substring`; zero `agent_curated`; zero `record_status='approved'`). **E2 advisory** (one duplicate `role_modules` row for SALES-TRANSACTION-COORDINATOR on CLM-REPOSITORY). Pattern-flag positive re-evaluation (B4) confirms `has_submit_lock=true` on 4 of 5 masters, but Rule #15 notes-pollution exists on every master, every lifecycle decision was recorded in `data_objects.notes` rather than surfaced for user-approved wording.

CLM Semantius score (strict, CLM proper): approximately **90%** (approximately 44 / 49 `skill_tools` rows on `coverage_tier='platform'`). The gap is concentrated in three external tools: `detect_clause_risk`, `generate_redline`, `extract_obligations`, and the channel primitives `sign_document` (the e-signature side-effect) which is `external`. Operational score adds nothing further since none of the externals are `integration`-tier yet.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M7 (hard fail), within-domain incoherence** | Three masters carry `role='master'` in their owning module AND `role IN ('consumer','contributor')` in sibling CLM modules. `legal_contracts` (66, master in CLM-REPOSITORY 127) is `consumer + required` in CLM-AUTHORING (125), CLM-NEGOTIATION (126), CLM-OBLIGATION-MGMT (128), CLM-RENEWAL (129), 4 sibling rows. `contract_clauses` (68, master in CLM-AUTHORING 125) is `consumer + required` in CLM-NEGOTIATION (126), CLM-REPOSITORY (127), 2 sibling rows. `contract_templates` (69, master in CLM-AUTHORING 125) is `consumer + required` in CLM-NEGOTIATION (126), CLM-RENEWAL (129), 2 sibling rows. M7 rejects master + consumer in sibling modules of the same domain: you don't consume what you also master in the same scope. The agent default is DELETE the 8 consumer rows (Repository / Authoring are the authoritative homes for their respective masters; the other modules read via the canonical reference). The alternative is to promote each sibling `consumer` row to `embedded_master` if the user wants every CLM module to be standalone-deployable without its sibling. Standalone Negotiation without Repository, or standalone Obligation-Mgmt without Repository, both have no contracts to negotiate or extract obligations from, so the embedded-master path looks weak here. Surface the architectural choice as B2-S1; on user approval of DELETE, proceed in Bucket 1. | DELETE 8 `domain_module_data_objects` rows: (125, 66, consumer), (126, 66, consumer), (128, 66, consumer), (129, 66, consumer), (126, 68, consumer), (127, 68, consumer), (126, 69, consumer), (129, 69, consumer). |
| B1-S2 | **B9 missing event_category** | 5 trigger_events carry empty `event_category` (Rule #13 enum must be one of `lifecycle / state_change / threshold / signal`): 531 `contract_obligation.due`, 532 `contract_obligation.breached`, 533 `contract_clause.flagged`, 534 `contract_template.published`, 535 `signature_record.completed`. | PATCH: 531 → `lifecycle` (due is a recurring lifecycle stage on the obligation), 532 → `state_change`, 533 → `state_change`, 534 → `state_change`, 535 → `state_change`. |
| B1-S3 | **B9b (partial fail), missing intra-domain cross-module handoffs** | A 5-module domain has only 2 intra-domain handoffs loaded (1209 NEGOTIATION → REPOSITORY on `signature_record.completed`; 1210 NEGOTIATION → AUTHORING on `contract_clause.flagged`). Expected from the master relationship graph and the lifecycle state machine on `legal_contracts`: (a) AUTHORING → NEGOTIATION on contract draft → in_review (verb `contract.in_review`, no event row yet, see B1-S6), (b) NEGOTIATION → REPOSITORY on `legal_contract.approved` (state 40, `domain_module_id=126` realizes, but the contract then activates in REPOSITORY context), (c) REPOSITORY → OBLIGATION-MGMT on `legal_contract.signed` (38) so obligations are auto-extracted into module 128, (d) REPOSITORY → RENEWAL on `legal_contract.active` (state 70, anchor for renewal countdown), (e) RENEWAL → REPOSITORY on `legal_contract.renewed` (37) feeding the repository with the renewal record, (f) RENEWAL → AUTHORING on `renewal.30_day_warning` if the renewal kicks off a new draft from the existing template. | Author 5 intra-domain handoff rows with `source_domain_id=target_domain_id=26`, `integration_pattern='lifecycle_progression'`, `friction_level='low'`. Three of the five lean on the existing `legal_contract.signed` (38), `legal_contract.renewed` (37), `renewal.30_day_warning` (104) events; the AUTHORING → NEGOTIATION and NEGOTIATION → REPOSITORY pairs need new state-change events (`legal_contract.submitted_for_review` and `legal_contract.approved` respectively, see B1-S6). |
| B1-S4 | **B9, missing trigger_events for workflow-gate states** | 4 lifecycle states have `requires_permission=true` and realize on a specific module but no matching `trigger_events` row exists: `legal_contract.approved` (state 40, module 126), `legal_contract.amended` (state 75, module 127 - existing event 176 covers this), `legal_contract.terminated` (state 90, module 127), `contract_clause.approved` (state 30, module 125, existing event 533 is `flagged` not approved), `contract_clause.deprecated` (state 50, module 125), `contract_template.approved` (state 30, module 125), `contract_template.deprecated` (state 50, module 125), `contract_obligation.satisfied` (state 40, module 128), `contract_obligation.waived` (state 60, module 128), `signature_record.voided` (state 60, module 127). 9 missing events confirmed; the existing `legal_contract.amended` (176) covers state 75. | Insert 9 `trigger_events` rows, each `event_category='state_change'`, `data_object_id` pointing at the publishing master. Use the new `legal_contract.approved` event as the trigger for B1-S3's NEGOTIATION → REPOSITORY intra-domain handoff. |
| B1-S5 | **B10b report-only (outbound NULLs owed by other domains)** | 9 outbound handoffs carry NULL `target_domain_module_id`: 63 (SUB-MGMT), 342 (AGENCY-MGMT), 517 (CPQ), 518 (ERP-FIN), 519 (SUB-MGMT), 520 (CSM), 521 (GRC), 41 (S2P), 215 (S2P), 216 (AP-AUTO). Per B10b's asymmetry rule the target module is the target domain's audit work. CLM's own side (`source_domain_module_id`) is populated on every outbound row. | Schedule b1 audits for SUB-MGMT, AGENCY-MGMT, CPQ, ERP-FIN, CSM, GRC, S2P, AP-AUTO to derive their `target_domain_module_id` per the standard B10b backfill procedure. |
| B1-S6 | **B10b report-only (inbound NULLs owed by source domains)** | 9 inbound handoffs carry NULL `source_domain_module_id`: 62 (CPQ), 217 (ESIGN), 309 (RE-CRE), 339 (ACCT-PRACT-MGMT), 343 (AGENCY-MGMT), 602 (S2P), 40 (S2P), 469 (CRM, source_domain_module_id IS populated to 48, scratch this one), 482 (CPQ), 1014 (CPQ). Re-counting: 62, 217, 309, 339, 343, 602, 40, 482, 1014, 9 inbounds with NULL source FK; CLM's `target_domain_module_id` is populated on every one. | Schedule b1 audits for CPQ, ESIGN, RE-CRE, ACCT-PRACT-MGMT, AGENCY-MGMT, S2P to populate their `source_domain_module_id` on the relevant handoffs. |
| B1-S7 | **E2 advisory, duplicate role_modules row** | `SALES-TRANSACTION-COORDINATOR` (10100) has 2 identical rows on CLM-REPOSITORY (127), both `interaction_level='secondary'`. Likely a duplicate insert during the RE-BROKERAGE starter load. | DELETE one of the two duplicate rows. The fix is mechanical, surgical CLI is sufficient. |
| B1-S8 | **Pairwise, missing consumer DMDOs on downstream domains** | Several CLM-targeted handoffs imply consumer DMDOs on the target side that do not exist: SUB-MGMT consumes `legal_contracts` (handoffs 63, 519) but no SUB-MGMT module declares the dependency; AGENCY-MGMT consumes `legal_contracts` (342) but no AGENCY-MGMT module declares; CPQ consumes `contract_templates` (517) but no CPQ module declares; ERP-FIN consumes `legal_contracts` (518) but no ERP-FIN module declares; CSM consumes `contract_obligations` (520) but no CSM module declares; GRC consumes `contract_obligations` (521) but no GRC module declares; AP-AUTO consumes `legal_contracts` (216) but no AP-AUTO module declares. | Each target domain's b1 audit adds a `consumer` DMDO row on the relevant CLM master in the receiving module. Not CLM's fix to make; surface in this audit so the target audits can pick it up. |

#### APQC TAGGING (matches the SKILL anti-pattern: prior CLM phase shipped structural and tooling fixes but zero APQC tagging)

Only 3 of 26 cross-domain handoffs carry `handoff_processes` rows. **All 3 are `proposal_source='discovery_substring'`; zero `agent_curated`; zero `record_status='approved'`.** Volume expectation per SKILL H1: 0.5N to 0.8N for N=26 → 13 to 21 agent_curated tags. The audit proposes the following candidates from the analyst's structural-pass model:

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id (lookup needed) | Confidence |
|---|---|---|---|---|---|---|
| 138 | CLM-REPOSITORY → PSA (PROJECT-DELIVERY) | `legal_contract.signed` | `legal_contracts` | Manage project portfolio / Initiate engagement | needs PCF lookup at fix time | confident L3 |
| 41 | CLM-REPOSITORY → S2P | `legal_contract.signed` | `purchase_orders` | Order materials and services (10218) or child | needs PCF lookup | confident L3 |
| 215 | CLM-REPOSITORY → S2P | `legal_contract.expired` | `legal_contracts` | Manage suppliers (10222) - contract expiry resync | needs PCF lookup | confident L3 |
| 216 | CLM-REPOSITORY → AP-AUTO | `legal_contract.amended` | `legal_contracts` | Process accounts payable (10744 or child) | needs PCF lookup | confident L3 |
| 517 | CLM-AUTHORING → CPQ | `contract_template.published` | `contract_templates` | Develop and manage sales proposals (10395 or child) | needs PCF lookup | confident L3 |
| 518 | CLM-REPOSITORY → ERP-FIN | `legal_contract.signed` | `legal_contracts` | Process revenue accounting (10796 or child) | needs PCF lookup | confident L3 |
| 519 | CLM-REPOSITORY → SUB-MGMT | `legal_contract.signed` | `legal_contracts` | Manage subscriptions / Order materials | needs PCF lookup | confident L3 |
| 520 | CLM-OBLIGATION-MGMT → CSM | `contract_obligation.due` | `contract_obligations` | Manage customer service requests / Service quality (10408) | needs PCF lookup | confident L3 |
| 521 | CLM-OBLIGATION-MGMT → GRC | `contract_obligation.breached` | `contract_obligations` | Manage business unit ethics and compliance (16437) | needs PCF lookup | confident L3 |
| 522 | CLM-RENEWAL → CRM | `renewal.30_day_warning` | `legal_contracts` | Manage sales partners (10401) or Develop business strategy | needs PCF lookup | medium |
| 46 | CLM-REPOSITORY → SMP | `legal_contract.renewed` | `saas_subscriptions` | Manage suppliers (10222) - vendor lifecycle | needs PCF lookup | confident L3 |
| 63 | CLM-REPOSITORY → SUB-MGMT | `legal_contract.signed` | `customer_subscriptions` | Manage customer accounts / Process subscriptions | needs PCF lookup | medium |
| 342 | CLM-REPOSITORY → AGENCY-MGMT | `legal_contract.signed` | `agency_jobs` | Manage service delivery (10408) | needs PCF lookup | confident L3 |
| 44 | SMP (RENEWAL-VENDOR) → CLM-REPOSITORY | `renewal.30_day_warning` | `legal_contracts` | Manage suppliers (10222) | needs PCF lookup | confident L3 |
| 62 | CPQ → CLM-REPOSITORY | `quote.accepted` | `legal_contracts` | (existing `discovery_substring` row points at "Develop and manage sales proposals" 11779 L3; this looks like a reasonable match, propose REPLACE with `agent_curated` confirmation) | 149 | confident L3 |
| 217 | ESIGN → CLM-REPOSITORY | `envelope.completed` | `envelopes` | Manage IT services (10566.x) or Process documents (10401.x) | needs PCF lookup | medium |
| 309 | RE-CRE → CLM-REPOSITORY | `commercial_lease.executed` | `commercial_leases` | Manage real estate (10778 or child) | needs PCF lookup | confident L3 |
| 332 | LEGAL-PRACT-MGMT → CLM-AUTHORING | `engagement_letter.signed` | `engagement_letters` | Manage legal counsel and services (16513 or child) | needs PCF lookup | confident L3 |
| 339 | ACCT-PRACT-MGMT → CLM | `engagement_letter.signed` | `engagement_letters` | Manage accounting and reporting (10741) | needs PCF lookup | confident L3 |
| 343 | AGENCY-MGMT → CLM-REPOSITORY | `estimate.approved` | `legal_contracts` | (existing `discovery_substring` row at 11788 L4 "Develop pricing and scheduling estimates" looks weak, the activity is in fact "Manage customer accounts"; propose REPLACE with `agent_curated`) | needs PCF lookup | medium |
| 602 | S2P → CLM-AUTHORING | `sourcing_event.awarded` | `sourcing_events` | Develop sourcing strategies (10277 or child) | needs PCF lookup | confident L3 |
| 40 | S2P → CLM-REPOSITORY | `sourcing.contract_drafted` | `legal_contracts` | (existing `discovery_substring` row at 10277 L3 "Provide sourcing governance" looks reasonable; propose REPLACE with `agent_curated`) | 163 | confident L3 |
| 469 | CRM → CLM | `crm_opportunity.closed_won` | `crm_opportunities` | Sell products and services (10004) or child | needs PCF lookup | confident L3 |
| 482 | CPQ → CLM-AUTHORING | `contract_draft.generated` | `contract_drafts` | Develop and manage sales proposals (11779) | needs PCF lookup | confident L3 |
| 1014 | CPQ → CLM | `quote_discount.approved` | `quote_discounts` | Develop and manage sales proposals (11779) | needs PCF lookup | confident L3 |
| 1020 | PSA → CLM | `project_billing_milestone.reached` | `project_billing_milestones` | Manage project finances (10773) or child | needs PCF lookup | medium |

26 candidate APQC tags total. The 3 existing `discovery_substring` rows are recommended for REPLACE / approve action: 62 keeps its pointer with `agent_curated` confirmation, 343 likely needs a different PCF row, 40 keeps its pointer with `agent_curated` confirmation. The PCF id column requires `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry` lookups at fix time; the structural pass produced the proposed-row names and confidence ratings.

#### Bucket 1 count summary

| ID | Finding type | Count |
|---|---|---|
| STRUCTURAL (M7 + B9 events + B9b + B10b report-only x2) | 7 |
| E2 advisory | 1 |
| Pairwise consumer DMDOs report-only | 1 |
| BOUNDARY findings per neighbor (see Pass 4) | 2 |
| APQC TAGGING (high-confidence) | 26 |
| **Bucket 1 total** | 11 in-scope + 26 APQC tags (in-scope but volume-heavy) |

#### Boundary findings per neighbor (Pass 4 pairwise reconciliation)

For each of the 8 heavy neighbors (edge weight ≥3) the 5-section pairwise diff produced the following per-neighbor findings. Section 1 (existing handoffs fully wired) is a sanity check, reported as counts only. Section 2 covers NULL FK candidates (deferred to other domains' audits per B10b asymmetry). Section 3 surfaces missing handoffs the catalog implies. Section 4 surfaces boundary integrity gaps. Section 5 covers cross-domain relationship mirror checks.

**S2P ↔ CLM (weight 5).** Wired pairs: 4 (CLM→S2P 41 signed→PO; CLM→S2P 215 expired→legal_contracts; S2P→CLM 40 sourcing.contract_drafted; S2P→CLM 602 sourcing_event.awarded). Section 2: handoffs 41 / 215 have NULL `target_domain_module_id` on the S2P side (S2P's B10b); 40 / 602 have NULL `source_domain_module_id` on the S2P side. Section 3: a likely missing handoff is CLM-REPOSITORY → S2P on `legal_contract.amended` (176) for purchase-order re-issue. Section 4: clean. Section 5: cross-relationship `legal_contracts triggers_creation_of purchase_orders` (502) exists; `legal_contracts triggers_review_in purchase_requisitions` (503) exists; `sourcing_events originates legal_contracts` (492) exists. All in order.

**CPQ ↔ CLM (weight 6).** Wired pairs: 4 (CLM→CPQ 517 template.published; CPQ→CLM 62 quote.accepted; CPQ→CLM 482 contract_draft.generated; CPQ→CLM 1014 quote_discount.approved). Section 2: all 3 CPQ-source rows have NULL `source_domain_module_id` (CPQ's B10b); 517 has NULL `target_domain_module_id` (CPQ's B10b). Section 3: no obvious missing handoff. Section 4: clean. Section 5: cross-relationship `contract_drafts drafts legal_contracts` (516), `sales_quotes drafts legal_contracts` (515), `contract_templates published_to contract_drafts` (511), `quote_discounts flows into legal_contracts` (517) all exist. Healthy boundary.

**CRM ↔ CLM (weight 5).** Wired pairs: 2 (CLM→CRM 522 renewal.30_day_warning; CRM→CLM 469 crm_opportunity.closed_won). Section 2: both fully populated on both module FKs. Section 3: missing handoff CLM-REPOSITORY → CRM on `legal_contract.expired` (175) to update opportunity stages. Section 4: clean. Section 5: cross-relationship `legal_contracts renewal_warns crm_opportunities` (507), `crm_opportunities drafts legal_contracts` (514) exist. Healthy.

**SUB-MGMT ↔ CLM (weight 4).** Wired pairs: 2 (CLM→SUB-MGMT 63 signed→customer_subscriptions; CLM→SUB-MGMT 519 signed→legal_contracts). Section 2: both have NULL `target_domain_module_id` (SUB-MGMT's B10b). Section 3: no inbound from SUB-MGMT to CLM — possible candidate: `customer_subscription.cancelled` → CLM-RENEWAL for the renewal record. Section 4: clean (legal_contracts is `consumer + contributor` not declared on any SUB-MGMT module; that surfaces as Pairwise consumer DMDO report-only, see B1-S8). Section 5: cross-relationship `legal_contracts backs customer_subscriptions` (436), `legal_contracts renewed_into customer_subscriptions` (512) exist.

**PSA ↔ CLM (weight 5).** Wired pairs: 2 (CLM→PSA 138 signed→legal_contracts; PSA→CLM 1020 project_billing_milestone.reached). Section 2: 138 has both FKs populated (target_domain_module_id=86 PSA-PROJECT-DELIVERY); 1020 has NULL target FK on CLM side, this IS CLM's fix, propose to populate `target_domain_module_id=128` CLM-OBLIGATION-MGMT since milestone-reached updates an obligation. **B1-S9 candidate (in-scope, mechanical PATCH):** PATCH handoff 1020 set `target_domain_module_id=128`. Section 3: clean. Section 4: clean. Section 5: `legal_contracts seeds service_projects` (506), `project_billing_milestones updates contract_obligations` (521) exist.

**SMP ↔ CLM (weight 5).** Wired pairs: 2 (CLM→SMP 46 legal_contract.renewed→saas_subscriptions; SMP→CLM 44 renewal.30_day_warning). Section 2: both populated on both FKs. Section 3: clean. Section 4: clean. Section 5: `legal_contracts renewal_warns saas_subscriptions` (508), `legal_contracts activates saas_subscriptions` (490) exist.

**CSM ↔ CLM (weight 4).** Wired pairs: 1 (CLM→CSM 520 contract_obligation.due). Section 2: 520 has NULL `target_domain_module_id` (CSM's B10b). Section 3: missing handoff CSM → CLM on `customer_complaint_filed` if a customer issue triggers obligation review (judgment call; surface for Phase 0). Section 4: CSM-ENTITLEMENTS declares `legal_contracts` as `contributor + required`, which mirrors the catalog: clean. Section 5: `legal_contracts governs customer_entitlements` (435), `contract_obligations alerts customer_cases` (510) exist.

**AGENCY-MGMT ↔ CLM (weight 3).** Wired pairs: 2 (CLM→AGENCY-MGMT 342 signed→agency_jobs; AGENCY-MGMT→CLM 343 estimate.approved→legal_contracts). Section 2: 342 has NULL `target_domain_module_id` (AGENCY-MGMT's B10b); 343 has NULL `source_domain_module_id` (AGENCY-MGMT's B10b). Section 3: clean. Section 4: clean. Section 5: `legal_contracts seeds agency_jobs` (513) exists.

**Lighter neighbors (1-2 weight, one-line summaries):**

- **ESIGN ↔ CLM (weight 2).** Inbound 217 has NULL source_domain_module_id (ESIGN's B10b). Cross-relationship `envelopes yields signature_records` (518) exists.
- **GRC ↔ CLM (weight 2).** Outbound 521 has NULL target_domain_module_id (GRC's B10b). Cross-relationship `contract_obligations breaches_into audit_issues` (509) exists.
- **ERP-FIN ↔ CLM (weight 1).** Outbound 518 has NULL target. Cross-relationship `legal_contracts feeds_revrec_in revenue_recognition_records` (505) exists.
- **AP-AUTO ↔ CLM (weight 2).** Outbound 216 has NULL target. Cross-relationship `legal_contracts propagates_terms_to invoice_matches` (504) exists.
- **LEGAL-PRACT-MGMT ↔ CLM (weight 2).** Inbound 332 fully populated. Cross-relationship `engagement_letters flows into legal_contracts` (520) exists.
- **ACCT-PRACT-MGMT ↔ CLM (weight 2).** Inbound 339 has NULL on both FKs. Cross-relationship absent for ACCT-PRACT-MGMT specifically (the 520 row points at LEGAL-PRACT-MGMT engagement_letters; ACCT-PRACT-MGMT may share data_object 394 since both source the same trigger_event 328); confirm at fix time.
- **RE-CRE ↔ CLM (weight 2).** Inbound 309 has NULL on both FKs. Cross-relationship `commercial_leases flows into legal_contracts` (519) exists.
- **LMS ↔ CLM (weight 2).** Zero handoffs, only DMDO embedded_master on signature_records from 2 LMS modules. No boundary surface to wire.
- **RE-BROKERAGE ↔ CLM (weight 1).** Starter `REAL-ESTATE-AGENT` hosts on CLM via host junction; relationship is a starter-kit dependency, not a cross-domain handoff. SALES-TRANSACTION-COORDINATOR role bridges. No handoff work owed in either direction.

**In-scope mechanical PATCH derived from pairwise (Bucket 1):**

- **B1-S9:** PATCH handoff 1020 set `target_domain_module_id=128` (CLM-OBLIGATION-MGMT). PSA → CLM `project_billing_milestone.reached` resolves cleanly to the obligation-management module on CLM's side. Pairwise Section 2 finding, deterministic patch.

#### Final Bucket 1 inventory

| ID | Description |
|---|---|
| B1-S1 | M7 hard fail, DELETE 8 sibling consumer DMDO rows after B2-S1 architectural choice |
| B1-S2 | PATCH 5 trigger_events to set `event_category` |
| B1-S3 | Author 5 new intra-domain cross-module handoff rows |
| B1-S4 | Insert 9 missing `trigger_events` for workflow-gate states |
| B1-S5 | Report-only, 9 outbound NULL target_module_id, schedule audits on SUB-MGMT / AGENCY-MGMT / CPQ / ERP-FIN / CSM / GRC / S2P / AP-AUTO |
| B1-S6 | Report-only, 9 inbound NULL source_module_id, schedule audits on CPQ / ESIGN / RE-CRE / ACCT-PRACT-MGMT / AGENCY-MGMT / S2P |
| B1-S7 | DELETE duplicate role_modules row for SALES-TRANSACTION-COORDINATOR on CLM-REPOSITORY |
| B1-S8 | Report-only, 7 downstream domains need consumer DMDOs on CLM masters, schedule those audits |
| B1-S9 | PATCH handoff 1020 set `target_domain_module_id=128` |
| B1-H1 | APQC TAGGING, propose 26 `agent_curated` rows (REPLACE 3 weak `discovery_substring` rows + INSERT 23 new) |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **M7 architectural choice for CLM module deployability.** B1-S1 surfaces 8 sibling consumer DMDO rows that violate M7 within-domain incoherence. The agent default is DELETE (the 8 rows go away; sibling modules read `legal_contracts` / `contract_clauses` / `contract_templates` via the canonical master). The alternative is PROMOTE-to-`embedded_master` (each sibling module ships a standalone-deployable shell of the master so the module is installable without its master sibling). The choice depends on whether CLM modules are intended to be standalone-deployable in isolation. Standalone CLM-NEGOTIATION without CLM-AUTHORING (clauses + templates) has nothing to negotiate, the embedded path looks weak; standalone CLM-OBLIGATION-MGMT without CLM-REPOSITORY (legal_contracts) has nothing to extract obligations from, also weak. Recommendation: DELETE all 8 rows. | Architectural intent + deployability strategy decision; user's call. | (a) DELETE all 8 sibling consumer rows. (b) PROMOTE to embedded_master per row (specify which ones). (c) Mixed (DELETE some, PROMOTE others; specify per row). |
| B2-S2 | **Rule #15 notes-pollution on every `data_objects` row.** All 5 CLM masters (66, 67, 68, 69, 70) carry populated `notes` recording the B4 pattern-flag reasoning (`has_submit_lock` rationale, `has_single_approver=false` rationale, multi-approver context). Rule #15 forbids auto-populated notes; the prior Rule #12 license for config-shape / pattern-flag context in `data_objects.notes` is RESCINDED. Were these notes user-approved at load time, or were they auto-populated by the loader? | Cannot tell from audit alone; load-time approval status unknown. | (a) Confirm user-approved at load time; leave in place. (b) Confirm auto-populated; PATCH all 5 rows' `notes` to empty string and log the Rule #15 incident per the audit obligation in references/skill-changelog.md. |
| B2-S3 | **F7 channel-primitive justification.** `sign_document` (tool 42, side_effect, external) is linked on CLM-REPOSITORY system skill (198) and on the REAL-ESTATE-AGENT starter skill (220), both with empty `notes`. F7 requires the channel-primitive link be justified in `skill_tools.notes` (signing IS the workflow for these skills). Per Rule #15 the agent cannot auto-populate; per F7 the row needs the justification recorded. Two routes: (a) confirm sign_document IS the workflow and supply exact wording for `skill_tools.notes` to record the justification, or (b) the catalog supports `sign_document` as a workflow primitive without a per-skill note (treat F7 as satisfied for these two rows since the workflow-shape is self-evident). | Rule #15 vs F7 boundary judgment; user owns the call. | (a) Supply user-approved `notes` text per the 2 rows. (b) Treat F7 as satisfied via the audit conversation (record decision in this audit file, leave the skill_tools rows clean). |
| B2-S4 | **B4 pattern-flag positive re-evaluation per Rule #12.** Current flags read: `legal_contracts.has_submit_lock=true`, `contract_obligations.has_submit_lock=false`, `contract_clauses.has_submit_lock=true`, `contract_templates.has_submit_lock=true`, `signature_records.has_submit_lock=true`. None has `has_personal_content=true` or `has_single_approver=true`. Questions: (a) `legal_contracts.has_personal_content` should probably be `true` since contracts carry counterparty contact info, signatory names, possibly personal addresses; (b) `signature_records.has_personal_content` could be `true` (signer names, possibly signature images / IP addresses captured at signing); (c) `contract_obligations.has_single_approver` could be `true` for the obligation owner closing the record (a single user typed action), though the audit notes say it isn't. | Pattern flags are workflow-shape judgments the user owns; the audit re-evaluates and proposes, the user decides. | Per-flag yes/no from user; capture in Decisions. |
| B2-S5 | **E6 permission-bundle drift.** Current bundles look tier-level coherent: CONTRACT-OPS-MANAGER has `:admin` on REPOSITORY / OBLIGATION-MGMT / RENEWAL and `:manage` on AUTHORING / NEGOTIATION; LEGAL-COUNSEL has `:admin` on AUTHORING / NEGOTIATION and `:manage` on REPOSITORY. None of the workflow-gate permissions derived from lifecycle states (`approve_legal_contract`, `execute_legal_contract`, `amend_legal_contract`, `terminate_legal_contract`, `renew_legal_contract`, `approve_contract_clause`, `approve_contract_template`, `close_contract_obligation`, `mark_obligation_breached`, `waive_contract_obligation`, `void_signature_record`, `deprecate_contract_clause`, `deprecate_contract_template`) is explicitly granted, the bundles rely on `permission_hierarchy` to expand `:manage` / `:admin` to include the gates. Question: is the implicit-grant pattern intentional, or should specific gates be enumerated (e.g. `approve_legal_contract` on LEGAL-COUNSEL even though they already have `clm-negotiation:admin`)? | Hierarchy seeding state isn't introspected here; the audit can't tell whether `permission_hierarchy` already expands the gates. | (a) Confirm hierarchy expands gates, leave bundles as-is. (b) Add explicit gate grants for LEGAL-COUNSEL on `approve_*` gates. (c) Leave drift, expectation is `permission_hierarchy` covers everything. |
| B2-S6 | **REAL-ESTATE-AGENT starter notes invariants.** Per Rule #19 invariant 1, starter `REAL-ESTATE-AGENT` (id 153) carries 7 embedded_master rows + 1 platform_builtin consumer (users 748). Both legal_contracts and signature_records appear as `embedded_master`, but the starter does NOT host the canonical master for either (they live in CLM-REPOSITORY, modules 125 / 127). The starter is hosted via `domain_module_host_domains` on CLM (host_domain_id=26) as well as on primary host RE-BROKERAGE (143). The invariant is satisfied (the canonical masters exist somewhere in CLM full modules), but the audit should confirm that the starter's lite path is intentional: should the real-estate agent's contract authoring use the full CLM-AUTHORING module's clauses / templates, or does the starter ship a simplified flow that bypasses the full clause library? | Editorial / product intent question, the audit can't decide whether the starter's lite path is correct or whether it should escalate to the full module. | (a) Starter intentionally embeds and the user accepts the lite-flow. (b) Starter should consume the full CLM-REPOSITORY rather than embedded_master (refactor needed). |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 ran the semantic enumeration against Icertis, Ironclad, DocuSign CLM, Agiloft, ContractPodAi Leah, Sirion, LinkSquares, Onit, Workday Evisort, and the CLM modules inside Salesforce Revenue Cloud / ServiceNow / DealHub. The compliance anchor is eIDAS (e-signature) and ASC 606 (revenue recognition); broader regulatory anchors that should be considered for CLM include FAR / DFARS (US federal contracting), UCC Article 2 (US goods contracts), GDPR (data processing addenda), HIPAA (BAA-class contracts), and SOX (significant-contract attestations). The loaded `domain_regulations` rows cover only eIDAS + ASC 606, narrower than the flagship vendor surface suggests.

The subagent recipe was not spawned (this is a single-pass audit per orchestrator instruction); the candidates below come from the analyst's flagship-vendor knowledge. Each is a candidate market gap for Phase 0 verification, not a vetted finding.

#### MISSING (9) entity candidates surfaced by flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `contract_amendments` | Icertis, Ironclad, Sirion model amendments as first-class records distinct from `contract_clauses` (modify existing terms, retain audit-trail). Current `legal_contract.amended` event has no master amendment record; the amendment lives implicitly inside `legal_contracts`. | new entity in CLM-REPOSITORY (master) or extension of repository |
| `contract_renewal_records` | Ironclad, LinkSquares, Workday Evisort model the renewal record as distinct from the original contract (one parent, many renewal records). Currently `legal_contract.renewed` (event 37) transitions the original record's state but produces no new master. | CLM-RENEWAL (master) |
| `clause_libraries` | Icertis, Sirion, ContractPodAi maintain library entities distinct from individual clauses (versioned clause sets, jurisdictional libraries). Current `contract_clauses` master conflates the library with individual clauses. | CLM-AUTHORING (master, or alias / category column on clauses) |
| `playbooks` | Ironclad's "Playbooks" feature distinct from contract templates (negotiation guidance, fallback positions). LinkSquares "Playbooks" similar. Current `contract_templates` alias includes "playbook" but the entity may warrant its own master. | CLM-NEGOTIATION (master), promote alias to entity |
| `risk_assessments` (CLM-scoped) | Icertis "Risk Score", Sirion "Compliance Score", ContractPodAi "Risk Detection" produce structured risk records per clause / per contract. Currently the `detect_clause_risk` tool is linked to CLM-NEGOTIATION but no `clause_risk_assessments` master records the output. | CLM-NEGOTIATION (master) |
| `counterparties` | Icertis, LinkSquares, Agiloft model counterparties as a first-class master distinct from `crm_accounts`. Currently no counterparty entity, the relationship lives via `crm_accounts` or `vendors`. | CLM-REPOSITORY (master) or master in master module, consumer in CLM |
| `contract_milestones` | Distinct from `contract_obligations` in Sirion, Icertis (milestones are date-driven checkpoints; obligations are deliverables). Currently the catalog folds milestones into obligations. | CLM-OBLIGATION-MGMT (potential split / sibling master) |
| `data_protection_addenda` | GDPR / DPA compliance requires DPAs as first-class records with their own renewal cycle. Icertis, Ironclad, OneTrust have specialized DPA modules. | new compliance module candidate |
| `contract_negotiation_threads` | Ironclad / DocuSign CLM model negotiation rounds and counterparty exchanges as structured threads (separate from clauses, separate from the contract). Currently no thread entity, the negotiation history is opaque. | CLM-NEGOTIATION (master) |

#### MODULARIZATION (2) candidates

- **CLM-COMPLIANCE / CLM-PRIVACY module candidate.** If DPAs + risk_assessments + counterparty obligations get loaded, a sixth module (`CLM-COMPLIANCE`) makes more sense than overloading CLM-OBLIGATION-MGMT. Would push CLM from 5 full modules to 6, still consistent with the capability count.
- **CLM-NEGOTIATION may warrant split.** Negotiation threads + redlining + AI risk detection + approval workflow could split into two modules (`CLM-REDLINING` for the markup mechanics and `CLM-CLAUSE-RISK-DETECT` for the AI overlay). Current single module mixes a workflow surface with an AI-overlay surface.

#### Compliance regulation candidates (no entity proposed, regulation rows missing)

- **GDPR DPA** applicability (mandatory for EU data subjects).
- **HIPAA BAA** applicability (mandatory for US healthcare).
- **SOX significant-contract attestation** (mandatory for US publicly-listed companies).
- **FAR / DFARS** (mandatory for US federal contracting).

#### Candidate-domain queue

This audit surfaced 0 domain-tier candidates for `audits/_missing-domains.md`; every MISSING candidate above is an entity / capability extension of CLM rather than a new domain.

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (which produces a Phase 0 markdown at `c:/tmp/CLM-phase0-<date>.md` confirming per-entity vendor coverage) or eyeball-mode (user names which of the 9 to treat as confirmed and we proceed via Phase B inserts).

### Cross-bucket dependencies

- B1-S1 is **gated on B2-S1**: the DELETE vs PROMOTE choice for the 8 sibling consumer rows must come from the user before the M7 fix loads.
- B1-S3 (intra-domain handoffs) **partially depends on B1-S4** (the new `legal_contract.approved` and `legal_contract.submitted_for_review` events from B1-S4 are used by B1-S3 handoffs).
- B2-S5 (permission-bundle drift) is **independent** of all other buckets.
- B3 MISSING entities (`contract_amendments`, `contract_renewal_records`, `risk_assessments`) might inform B2-S3 (`detect_clause_risk` justification). Calling this out per the surface-time discipline.
- B2-S6 (REAL-ESTATE-AGENT starter intent) is **independent** of Bucket 3 but creates work for the RE-BROKERAGE domain audit if the starter needs refactoring.
- Buckets 2 and 3 are otherwise independent of each other; you can resolve them in any order.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S2, S3, S4, S7, S9, H1-top10`), or `skip`.

- **S1 (M7 hard fail, DELETE or PROMOTE 8 sibling consumer DMDOs)** is gated on B2-S1; resolve that first.
- **S2 (event_category PATCH on 5 events)** is trivial; one PATCH each.
- **S3 (5 new intra-domain handoffs)** depends on S4 (needs 2 new events first).
- **S4 (9 missing `trigger_events`)** is structural; no other dependencies.
- **S5 / S6 (B10b report-only outbound + inbound NULLs)** schedules 6 + 6 = 12 distinct other-domain audits; not CLM's fix.
- **S7 (DELETE duplicate role_modules row)** is mechanical; one DELETE.
- **S8 (Pairwise missing consumer DMDOs on 7 target domains)** schedules 7 other-domain audits; not CLM's fix.
- **S9 (PATCH handoff 1020 target_module_id=128)** is mechanical; one PATCH.
- **H1 (26 APQC tags including 3 REPLACE candidates)** load now or in a follow-up batch?

**Bucket 2, what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (M7 architectural choice):** (a) DELETE all 8, (b) PROMOTE all 8 to embedded_master, (c) mixed (specify per row).
- **B2-S2 (Rule #15 notes-pollution on 5 data_objects):** the audit can revert if you confirm auto-population. If they were approved, say so and I leave them.
- **B2-S3 (F7 sign_document justification):** (a) supply user-approved wording for 2 skill_tools rows, (b) treat F7 as satisfied via this audit conversation.
- **B2-S4 (pattern flag re-evaluation):** per-flag yes/no on `has_personal_content` for legal_contracts / signature_records and `has_single_approver` for contract_obligations.
- **B2-S5 (permission-bundle drift):** which option (a / b / c)?
- **B2-S6 (REAL-ESTATE-AGENT starter intent):** lite-flow accepted, or refactor needed?

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** Will surface candidates when the subagent returns. If eyeball-mode, name which of the 9 entity candidates + 4 regulation candidates + 2 modularization candidates to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain for routing.

| Owing domain | Owed work |
|---|---|
| SUB-MGMT | B10b: populate `target_domain_module_id` on inbound handoffs 63, 519 (both `legal_contract.signed` → SUB-MGMT). Add `consumer + required` DMDO on `legal_contracts` (66) in whichever SUB-MGMT module subscribes. |
| AGENCY-MGMT | B10b: populate `target_domain_module_id` on 342 (legal_contract.signed → agency_jobs) and `source_domain_module_id` on 343 (estimate.approved → legal_contracts). Add `consumer` DMDO on `legal_contracts` if AGENCY-MGMT subscribes. |
| CPQ | B10b: populate `source_domain_module_id` on inbound 62, 482, 1014; populate `target_domain_module_id` on outbound 517. Add `consumer` DMDO on `contract_templates` (69) on the receiving CPQ module. |
| ERP-FIN | B10b: populate `target_domain_module_id` on 518. Add `consumer` DMDO on `legal_contracts`. |
| CSM | B10b: populate `target_domain_module_id` on 520. Add `consumer` DMDO on `contract_obligations` (67). |
| GRC | B10b: populate `target_domain_module_id` on 521. Add `consumer` DMDO on `contract_obligations`. |
| S2P | B10b: populate `target_domain_module_id` on 41, 215; populate `source_domain_module_id` on 40, 602. |
| AP-AUTO | B10b: populate `target_domain_module_id` on 216. Add `consumer` DMDO on `legal_contracts`. |
| ESIGN | B10b: populate `source_domain_module_id` on 217. |
| RE-CRE | B10b: populate `source_domain_module_id` on 309. |
| ACCT-PRACT-MGMT | B10b: populate both `source_domain_module_id` and `target_domain_module_id` on 339; confirm whether `engagement_letters` (394) needs a parallel cross-relationship row (currently row 520 covers LEGAL-PRACT-MGMT only). |
| LEGAL-PRACT-MGMT | Confirm `source_domain_module_id` on 332 is the intended source module. |

### Decisions

#### 2026-05-30

**Bucket 1 (4 of 11 resolved):**

- **D1 (B1-S2):** APPLIED. 5 trigger_events PATCHed with `event_category`: 531 `contract_obligation.due` → `lifecycle`; 532 `contract_obligation.breached`, 533 `contract_clause.flagged`, 534 `contract_template.published`, 535 `signature_record.completed` → `state_change`.
- **D2 (B1-S7):** APPLIED. Deleted duplicate `role_modules` row id=392 for SALES-TRANSACTION-COORDINATOR x CLM-REPOSITORY; kept id=294.
- **D3 (B1-S9):** APPLIED. `handoffs.id=1020` (PSA `project_billing_milestone.reached` → CLM) PATCHed: `target_domain_module_id` NULL → 128 (CLM-OBLIGATION-MGMT).
- **D4 (B1-S4):** APPLIED. 9 trigger_events inserted (ids 1456-1464, all `record_status='new'`): `legal_contract.approved`, `legal_contract.terminated`, `contract_clause.approved`, `contract_clause.deprecated`, `contract_template.approved`, `contract_template.deprecated`, `contract_obligation.satisfied`, `contract_obligation.waived`, `signature_record.voided`. Unblocks B1-S3 (intra-domain handoffs depend on the new `legal_contract.approved` event).

Loader: [.tmp_deploy/fix_clm_2026_05_30.ts](../.tmp_deploy/fix_clm_2026_05_30.ts).

**Bucket 2 (1 of 6 resolved):**

- **D5 (B2-S1):** RESOLVED as option (a) DELETE. Market practice (Icertis, Ironclad, DocuSign CLM, Sirion, ContractPodAi, Workday Evisort, Agiloft, LinkSquares, Onit, Salesforce Revenue Cloud CLM, ServiceNow Contract Mgmt Pro) is one canonical contract record per platform; sibling modules read by reference, not via local shells. Embedded-master path has no real deployment story for any of the 8 rows. Approval of D5 = a authorized B1-S1 execution simultaneously.

**Bucket 1 (5 of 11 resolved with D5):**

- **B1-S1:** APPLIED via D5. 8 sibling consumer DMDO rows deleted (CLM-AUTHORING/NEGOTIATION/OBLIGATION-MGMT/RENEWAL × `legal_contracts`; CLM-NEGOTIATION/REPOSITORY × `contract_clauses`; CLM-NEGOTIATION/RENEWAL × `contract_templates`). Post-state verified: each of `legal_contracts`, `contract_clauses`, `contract_templates` has exactly 1 master row in CLM, 0 sibling rows. Loader: [.tmp_deploy/fix_clm_d5_m7_delete.ts](../.tmp_deploy/fix_clm_d5_m7_delete.ts).

**Bucket 1 (D6 + D7 resolved, 7 of 11):**

- **D6 (B1-S3):** APPLIED. 5 intra-domain handoffs inserted (1331-1335), plus 2 supporting trigger_events (1465 `legal_contract.submitted_for_review`, 1466 `legal_contract.active`). CLM intra-domain handoff count: 2 → 7. Closes B9b structural partial-fail. Loader: [.tmp_deploy/fix_clm_d6_intra_handoffs.ts](../.tmp_deploy/fix_clm_d6_intra_handoffs.ts).
- **D7 (B1-H1):** PARTIAL. 22 of 26 cross-domain handoffs tagged (19 INSERTs + 2 FLIPs + 1 REPLACE), all `proposal_source='agent_curated'`, all `record_status='new'`. 4 lookups failed: 138 (project portfolio), 520/342 (external_id 10408 not in catalog), 332 (external_id 16513 not in catalog). **Review-time triage needed**: the audit's external_id hints (10218, 10222, 10778, etc.) often landed on PCF rows whose `process_name` differs from the audit's proposed parent name — see loader output. UI review is the safety net; re-tag wrong matches at review time. Loader: [.tmp_deploy/fix_clm_d7_apqc_tags.ts](../.tmp_deploy/fix_clm_d7_apqc_tags.ts).

**Bucket 1 (D8 decision recorded — schedules other-domain audit waves):**

- **D8 (B1-S5 + B1-S6 + B1-S8):** RECORDED. Decision: schedule b1 audits on 11 other domains to fix their NULL FKs on CLM-touching handoffs and missing consumer DMDOs on CLM masters. **Queued domains:** SUB-MGMT, AGENCY-MGMT, CPQ, ERP-FIN, CSM, GRC, S2P, AP-AUTO, ESIGN, RE-CRE, ACCT-PRACT-MGMT. Spawn cadence: 3 waves of 4-4-3 parallel subagents using [.claude/skills/domain-map-analyst/references/mass-audit-subagent-prompt.md](../.claude/skills/domain-map-analyst/references/mass-audit-subagent-prompt.md). Each wave produces audit files in `feedback_needed`. Not CLM's load; this is wave kickoff.

**D7 follow-up (B1-H1 closed):** APPLIED. 4 previously-failed handoffs tagged via substring-first PCF matcher:

- 138 (CLM-REPOSITORY → PSA) → process 1661 L4 "Develop project plans" (external_id 16413)
- 520 (CLM-OBLIGATION-MGMT → CSM) → process 196 L3 "Manage customer service problems, requests, and inquiries" (10388)
- 342 (CLM-REPOSITORY → AGENCY-MGMT) → process 32 L2 "Manage and Operate Service Delivery System" (21634) — L2 match, may warrant a more-specific L3 child at UI review
- 332 (LEGAL-PRACT-MGMT → CLM-AUTHORING) → process 76 L2 "Manage legal and ethical issues" (11013) — L2 match, similarly

All 26 of 26 cross-domain handoffs now tagged `agent_curated`, `record_status='new'`. H1 hard-fail closed (subject to UI review per Rule #1). Loader: [.tmp_deploy/fix_clm_d7_followup.ts](../.tmp_deploy/fix_clm_d7_followup.ts).

**Remaining open on CLM:**

- **B1-S3 / B9b**: closed by D6.
- **B1-H1**: closed by D7 + follow-up.
- Bucket 2 remaining: B2-S2, B2-S3, B2-S4, B2-S5, B2-S6 (5 items).
- Bucket 3: 15 candidates (entities + modularization + regulations).

## 2026-05-31, Continuation: B1 technical fixes

### Status

All 11 Bucket 1 items in scope for CLM are already resolved. No new technical writes required. Live verification confirmed each prior decision against the database:

- **B1-S1 (M7 hard fail, D5):** verified. `domain_module_data_objects` for `data_object_id IN (66, 68, 69)` across CLM modules (125, 126, 127, 128, 129) returns exactly 3 rows, each `role='master'` (legal_contracts on 127, contract_templates on 125, contract_clauses on 125). All 8 sibling consumer rows deleted as intended.
- **B1-S2 (event_category PATCH, D1):** verified. Events 531=`lifecycle`, 532/533/534/535=`state_change`.
- **B1-S3 (intra-domain handoffs, D6):** verified. 7 intra-CLM handoffs present (1209, 1210, 1331-1335), all `source_domain_id=target_domain_id=26`.
- **B1-S4 (9 trigger_events, D4):** verified. Rows 1456-1464 present, all `event_category='state_change'`.
- **B1-S7 (duplicate role_modules, D2):** verified. Single row id=294 for role_id=10100 x domain_module_id=127 remains.
- **B1-S9 (handoff 1020 target, D3):** verified. `target_domain_module_id=128`.
- **B1-H1 (APQC tagging, D7 + follow-up):** verified. All 26 CLM-touching handoffs carry `handoff_processes` rows with `proposal_source='agent_curated'` and `record_status='new'`.
- **B1-S5, B1-S6, B1-S8:** report-only by B10b asymmetry rule; scheduled via D8 for downstream domain audits (SUB-MGMT, AGENCY-MGMT, CPQ, ERP-FIN, CSM, GRC, S2P, AP-AUTO, ESIGN, RE-CRE, ACCT-PRACT-MGMT).

### Deferred (out of technical scope)

- **B2-S2 (data_objects.notes revert on rows 66, 67, 68, 69, 70):** audit pre-specifies the row IDs, but the revert is conditioned on user confirming the notes were auto-populated rather than user-approved at load time. The audit explicitly asks the user to choose (a) leave / (b) revert. No technical license to act without that confirmation; this is a judgment call, not a technical fix. Defer to Bucket 2 resolution.
- **B2-S1, B2-S3, B2-S4, B2-S5, B2-S6:** all Bucket 2, judgment-required (architectural, editorial, workflow-shape choices). Not in this continuation's technical scope.
- **Bucket 3 (15 entity / modularization / regulation candidates):** Phase 0 vendor-verification gated. Not in technical scope.

### Result

Zero new writes applied this run. No loader produced (nothing to load). CLM's B1 band is fully closed pending the downstream-domain B10b waves that D8 scheduled.

## 2026-05-31, Audit

### Summary

Fresh structural Validate b1 pass against live state. CLM-proper footprint: 5 full modules (CLM-AUTHORING 125, CLM-NEGOTIATION 126, CLM-REPOSITORY 127, CLM-OBLIGATION-MGMT 128, CLM-RENEWAL 129) plus 1 starter hosted via cross-host junction (REAL-ESTATE-AGENT 153, primary host RE-BROKERAGE). 5 masters (legal_contracts 66, contract_obligations 67, contract_clauses 68, contract_templates 69, signature_records 70). 8 capabilities (1 cross-cutting APPROVAL-WORKFLOW). 33 lifecycle states. 23 trigger_events on the 5 masters. 35 total handoffs touching CLM (26 cross-domain + 7 intra-domain + 2 already-loaded intra). 6 system skills + 72 skill_tools across CLM-proper and the starter.

| Band | Status | Detail |
|---|---|---|
| A (Phase A market shape) | pass | 5 modules, 8 capabilities, 5 masters, vendor surface intact |
| M (Phase M modules) | pass | M1 satisfied (≥1 full module); M2 satisfied (8 capabilities, 5 full modules ≥2 floor); M7 clean (every master appears exactly once across CLM full modules; sibling consumer rows deleted in D5) |
| B5 (embedded_master integrity) | pass | starter 153 embedded_masters all point to canonical masters or platform_builtin |
| B7 (users edges) | pass | starter has consumer row on users (DMDO 1115) |
| B9 (outbound trigger_events + event_category) | partial fail | event 589 sourcing_event.awarded has empty event_category (S2P-owned event; reported via B10b asymmetry, CLM is the receiver) |
| B9b (intra-domain handoffs) | pass | 7 intra-CLM handoffs cover authoring, negotiation, repository, obligation, renewal progressions |
| B10b (per-module attribution) | partial fail | 10 cross-domain handoffs carry NULL on the other-domain side: outbound NULL target on 41, 215, 216, 342, 518, 519, 520, 521 (8 rows); inbound NULL source on 217, 309, 469, 1014 (4 rows); inbound NULL on both FKs 309, 339 (subset); CLM-side FKs always populated |
| B11 (aliases) | pass (carry-over) |  |
| B12 (lifecycle states + pattern flags) | partial fail | 33 lifecycle states loaded across all 5 masters with workflow-gate `requires_permission=true`. Pattern flags populated. Rule #15 pollution persists on all 5 masters (rows 66, 67, 68, 69, 70 carry templated submit-lock and multi-approver commentary in `data_objects.notes`). Defaults that the audit rules now forbid auto-populating. |
| C (functional ownership) | pass (carry-over) |  |
| D (UI spot-check) | not run | structural audit only |
| E1 (≥1 role per module) | pass | 6 distinct roles across CLM-AUTHORING (5), CLM-NEGOTIATION (4), CLM-REPOSITORY (6 incl. SALES-TRANSACTION-COORDINATOR cross-bundle), CLM-OBLIGATION-MGMT (2), CLM-RENEWAL (2) |
| E2 (no duplicate role_modules) | pass | duplicate row 392 deleted in D2; only single row 294 remains on SALES-TRANSACTION-COORDINATOR x CLM-REPOSITORY |
| E3 (workflow-gate role distribution) | pass (carry-over) |  |
| E4 (permission bundles) | partial | per B2-S5 prior audit, implicit hierarchy expansion unresolved (judgment call carry-over) |
| E5 (cross-cutting consistency) | pass |  |
| F1 (≥1 skill_tool per system skill) | pass | 6 system skills, all linked to skill_tools (72 rows total across CLM scope) |
| F2 (1 system skill per domain_module) | pass | each of 6 domain_modules has exactly 1 `skill_type='system'` row |
| F3 (skill_tools floor) | pass | typical 5-20 tools, all CLM skills sit in band |
| F4 (operation_kind ↔ data_object_id invariants) | pass on sampled rows (query/mutate have data_object_id) |  |
| F5 (Semantius score computable) | pass (carry-over ~90% strict CLM proper) |  |
| H1 (APQC tagging) | pass on process-health; advisory on catalog quality | 26 of 26 cross-domain handoffs tagged via `handoff_processes`, all `proposal_source='agent_curated'`, all `record_status='new'`. Zero `approved`. The headline catalog-quality measure is 0 of 26; the process-health measure is 26 of 26. Per audit-procedure.md, lead with quality; review is the gate. |

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S10 | **B9 missing event_category** | trigger_event 589 `sourcing_event.awarded` (data_object_id=71 sourcing_events) still carries empty `event_category`. The event is published by S2P (sourcing) and consumed by CLM-AUTHORING via handoff 602; S2P owns the trigger_event row per Rule #18 (events live with the publisher's domain). | Report-only on CLM's side. Schedule S2P b1 audit (already queued under D8); fix happens on S2P's pass via PATCH event 589 `event_category` to `state_change`. |

(B1-S1 through B1-S9, plus B1-H1, were closed in 2026-05-30 + 2026-05-31 Continuation; the verification on those rows held against the fresh structural pass.)

#### B10b report-only carry-over

8 outbound CLM handoffs still carry NULL `target_domain_module_id` (owed by target domains' B10b passes): 41 (S2P), 215 (S2P), 216 (AP-AUTO), 342 (AGENCY-MGMT), 518 (ERP-FIN), 519 (SUB-MGMT), 520 (CSM), 521 (GRC). 4 inbound CLM handoffs still carry NULL `source_domain_module_id` (owed by source domains' B10b passes): 217 (ESIGN), 309 (RE-CRE, also NULL on target side), 469 (CRM, target side NULL), 1014 (CPQ). Handoff 339 (ACCT-PRACT-MGMT) carries NULL `source_domain_module_id`. Handoff 339 has populated `target_domain_module_id=127`; 309 carries NULL on both FKs (RE-CRE source + CLM target wasn't populated by this audit because RE-CRE's source-module is unknown until that audit runs). All 12 backfills are scheduled via D8 (b1b carry-over).

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (B9 event_category) | 1 (B1-S10 report-only owed by S2P) |
| BOUNDARY (B10b NULL FKs) | 12 owed by other domains' audits |
| APQC TAGGING | 0 new (26 prior agent_curated rows persist; advisory: catalog quality 0 of 26 approved) |
| MODULARIZATION ISSUES | 0 |
| **Bucket 1 agent-actionable** | **0** |

### Bucket 2, Surface-for-user (judgment calls)

Carry-over from 2026-05-30:

| ID | Question |
|---|---|
| B2-S2 | Rule #15 notes-pollution on 5 master data_objects (66, 67, 68, 69, 70): verified still present. Notes restate `has_submit_lock` rationale + multi-approver workflow context in templated wording. User to confirm whether to (a) leave (load-time approval) or (b) PATCH to empty string and log a Rule #15 incident per the audit obligation. |
| B2-S3 | F7 channel-primitive justification for `sign_document` on rows 1953 (skill 198) and 2049 (skill 220): (a) supply user-approved wording, (b) treat F7 satisfied via this audit. |
| B2-S4 | B4 pattern flag re-evaluation: `legal_contracts.has_personal_content`, `signature_records.has_personal_content`, `contract_obligations.has_single_approver`. |
| B2-S5 | E6 permission-bundle drift: implicit hierarchy expansion vs explicit gate grants on LEGAL-COUNSEL / CONTRACT-OPS-MANAGER. |
| B2-S6 | REAL-ESTATE-AGENT starter intent: lite-flow accepted, or refactor to consume full CLM-REPOSITORY? |

### Bucket 3, Phase 0 pending (speculative)

Carry-over from 2026-05-30, no fresh enumeration on this pass (single-pass structural audit; subagent not spawned). 9 entity candidates (`contract_amendments`, `contract_renewal_records`, `clause_libraries`, `playbooks`, `risk_assessments`, `counterparties`, `contract_milestones`, `data_protection_addenda`, `contract_negotiation_threads`), 4 compliance regulation candidates (GDPR DPA, HIPAA BAA, SOX significant-contract attestation, FAR/DFARS), 2 modularization candidates (CLM-COMPLIANCE module split, CLM-NEGOTIATION redlining/risk-detect split). All await formal Phase 0 vendor verification or user eyeball-mode acceptance.

### Cross-bucket dependencies

- B1-S10 (event 589 event_category) is gated on S2P b1 audit (D8 queued domain).
- B2-S2 (Rule #15 notes revert) is independent and the highest-leverage Bucket-2 item: catalog hygiene only the user can authorize.
- Other Bucket 2 / Bucket 3 dependencies are unchanged from 2026-05-30.

### Per-bucket prompts

- **Bucket 1:** zero agent-actionable items this pass. The 1 STRUCTURAL row (B1-S10) is owed by S2P; the 12 B10b NULL backfills are owed by the 11 D8-queued downstream domains. Nothing to apply on CLM.
- **Bucket 2:** still awaiting per-item user decisions on B2-S2 through B2-S6 (5 carry-over judgment calls). The B2-S2 Rule #15 notes-pollution decision is the highest-leverage hygiene call.
- **Bucket 3:** still awaiting Phase 0 vetted-vs-eyeball choice on 15 candidates.

### Result

CLM structural Validate b1 audit clean on the in-scope agent surface. All prior decisions (D1-D8) verified against live state. Outstanding work is judgment-routed (Bucket 2) and research-routed (Bucket 3); both queues are stable across the 2026-05-30 and 2026-05-31 passes. `next_action_by` rolls forward to `user` because b1a is empty and b2 is non-empty.

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

## 2026-06-06 - Audit (state-driven execute)

### Summary

State-driven Validate execute (SKILL.md Rule #21): worked ONLY the open items in `audits/CLM/state.yaml`,
verified each against live before acting. CLM footprint unchanged: 5 full modules (CLM-AUTHORING 125,
CLM-NEGOTIATION 126, CLM-REPOSITORY 127, CLM-OBLIGATION-MGMT 128, CLM-RENEWAL 129) + 1 starter
(REAL-ESTATE-AGENT 153); 5 masters (66/67/68/69/70). All three agent-actionable b1a items addressed; the
one destructive b1a item (M9) reclassified to awaiting-approval. Loader:
[.tmp_deploy/fix_clm_2026_06_06.ts](../../.tmp_deploy/fix_clm_2026_06_06.ts) (idempotent; re-run = 0 writes).
Everything landed at `record_status='new'`.

### Executed (all `record_status='new'`)

- **B1A-ENTITY-TYPE (B13):** verified all 5 masters were `entity_type='unclassified'`, then PATCHed
  `data_objects.entity_type`: legal_contracts (66) -> `operational_workflow`, contract_obligations (67) ->
  `operational_workflow`, contract_clauses (68) -> `catalog` (reusable clause library / reference language),
  contract_templates (69) -> `catalog` (pre-approved templates with a publish flow; Rule #12 templates-are-catalog),
  signature_records (70) -> `operational_workflow` (e-signature envelope state machine). 5 PATCHes.
- **B1A-PHASE-P (E1):** verified live that 0 personas reached the 5 CLM modules via `role_modules`, then authored
  the missing persona/RACI layer FRESH under the DERIVED (Plan 3) model (reach + RACI only; no _core
  roles/permissions/role_permissions/permission_hierarchy):
  - **4 `domain_roles` personas** (function-anchored on the owner/contributor functions that touch CLM):
    CONTRACT-OPS-MANAGER (#31, fn 74 Contract Operations), CONTRACT-OPS-SPECIALIST (#32, fn 74),
    LEGAL-COUNSEL (#33, fn 7 Legal), PROCUREMENT-CONTRACT-LIAISON (#34, fn 19 Procurement).
  - **15 `role_modules` reach rows** (each persona >=2 modules; primary/secondary mix): manager reaches all 5
    (REPOSITORY/OBLIGATION/RENEWAL primary, AUTHORING/NEGOTIATION secondary); specialist 4 (all primary);
    counsel 3 (AUTHORING/NEGOTIATION primary, REPOSITORY secondary); liaison 3 (all secondary). Every CLM
    module now has >=1 persona -> E1 passes.
  - **12 `data_object_lifecycle_states.process_id` wirings** on the gated transitions that cleanly map to a PCF
    process: 398 "Negotiate and document agreements/contracts" -> legal_contracts.approved; 807 "Manage contracts"
    -> legal_contracts.signed/terminated/renewed + signature_records.voided; 397 "Provide legal advice/counseling"
    -> contract_clauses.approved/deprecated + contract_templates.approved/deprecated; 1163 "Evaluate enterprise
    regulatory and compliance obligations" -> contract_obligations.satisfied/breached/waived.
  - **13 `process_raci` rows** across those 4 processes (exactly one actor each): R = LEGAL-COUNSEL on the two
    legal processes, CONTRACT-OPS-SPECIALIST on manage-contracts + obligations; A = CONTRACT-OPS-MANAGER on all
    four; plus C (PROCUREMENT-CONTRACT-LIAISON / LEGAL-COUNSEL) and I rows. Every R/A row resolves to a
    `process_id`-wired gate (no grant-from-nowhere; no R/A row without a wired gate). Reach-vs-derived
    reconciliation (roles.md section 8) holds.
- **Catalog UX (Rule #20, A4 + M8):** verified domain 26 and all 5 modules carried empty
  `catalog_tagline`/`catalog_description`, then authored buyer-voice copy (workflow + value, no vendor names,
  no em-dash, American English) and PATCHed straight in. 6 rows (1 domain + 5 modules), 12 fields. Empty-guarded
  per field; no non-empty value overwritten.

### Surfaced (no write; for user)

- **B1A-SELF-CONTAIN (M9, destructive):** the 1 row saas_subscriptions (SMP-mastered) as
  role=contributor/necessity=required on CLM-REPOSITORY. Converting role->embedded_master or
  necessity->optional rewrites an existing non-empty row (destructive), so left for approval. Recommended:
  set necessity=optional (lighter, truer than carrying a local SaaS-subscription shell). Moved to
  `b1a_destructive_awaiting_approval` in state.yaml.
- **B2-S2:** Rule #15 notes-pollution on the 5 masters (66/67/68/69/70 carry templated submit-lock /
  multi-approver notes). Reverting is a destructive overwrite; needs user confirm the notes were
  auto-populated at load (not user-approved).
- **B2-S3 (REFRAMED):** F7 sign_document justification. The old surface (skill_tools.notes on per-module
  skills 198/220) is RETIRED; under the current model it would live on `domain_module_tools.notes`
  (CLM-REPOSITORY 127 + the REAL-ESTATE-AGENT starter 153, the only CLM unit that still carries a skill).
  Rule #15 still forbids auto-authoring it. Question stands as (a) supply wording / (b) F7 satisfied via audit.
- **B2-S4:** pattern-flag re-evaluation per flag: legal_contracts.has_personal_content (counterparty +
  signatory PII), signature_records.has_personal_content (signer names / IP / signature images),
  contract_obligations.has_single_approver. Per-flag yes/no from user.
- **B2-S5 (SUPERSEDED -> closed):** permission-bundle drift referenced the retired _core stored bundle.
  Under Plan 3 the bundle is DERIVED, so there is nothing stored to drift; the personas authored in
  B1A-PHASE-P use the derived model. No action; closed as superseded.
- **B2-S6:** REAL-ESTATE-AGENT starter (153) intent: intentional lite path (embedded_master) vs refactor to
  consume full CLM-REPOSITORY when both deploy together.

### Left (report-only / backlog, not CLM's load)

- **b1b (report-only, owed by other domains):** B1B-S10-EVENT-CAT (event 589 owned by S2P),
  B1B-B10B-OUTBOUND (8 outbound NULL target FKs owed by target domains), B1B-B10B-INBOUND (5 inbound NULL
  source FKs owed by source domains; 309/469 CLM-side target gated on the source audits), B1B-CONSUMER-DMDO
  (7 downstream consumer DMDOs). All scheduled via the prior D8 wave; no CLM-side write.
- **b3 (15 backlog candidates):** entity candidates (contract_amendments, contract_renewal_records,
  clause_libraries, playbooks, risk_assessments, counterparties, contract_milestones, data_protection_addenda,
  contract_negotiation_threads), 4 regulation candidates (GDPR DPA, HIPAA BAA, SOX, FAR/DFARS), 2
  modularization candidates (CLM-COMPLIANCE, CLM-NEGOTIATION split). Await Phase 0 vetting / eyeball-mode.

### Result

3 of 3 agent-actionable b1a items executed (entity_type, persona layer, catalog UX); 1 destructive b1a
(M9) and 4 open b2 surfaced for the user (B2-S5 closed as superseded). `next_action_by` rolls to `user`:
b1a is empty and the remaining work is judgment-routed (destructive M9 + b2) or owed by other domains (b1b)
or research-routed (b3).
