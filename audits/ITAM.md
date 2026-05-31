---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 25
---

# ITAM (IT Asset Management) Audit History

## 2026-05-30 Validate b1 (full 4-pass)

### Summary

- Current footprint: 4 full modules (ITAM-NORMALIZATION-CATALOG, ITAM-CONTRACTS, ITAM-LIFECYCLE, ITAM-PORTFOLIO-REPORTING); 5 capabilities; 7 solutions (5 primary + 2 secondary); 2 regulations (SOX mandatory, GDPR conditional); 2 masters (`asset_contracts`, `asset_lifecycle_events`); 5 trigger events; 4 outbound cross-domain handoffs + 4 intra-domain handoffs + 6 inbound cross-domain handoffs; 4 roles + 11 role_modules + 13 role_permissions; 4 system skills + 38 skill_tools links.
- Vendor-surface basis (flagship vendors): ServiceNow IT Asset Management, Flexera One, Snow Atlas, Ivanti Neurons for ITAM, USU IT Asset Management (primary); Certero for Enterprise ITAM, Eracent ITMC (secondary). All position as cross-asset umbrella platforms unifying HAM/SAM/SaaS/Cloud/EAM.
- Domain Semantius score (strict, across all 4 modules): platform=33, total=38, so 33/38 = **87%**. Non-platform tools driving the gap: `normalize_software_title`, `reconcile_asset_identity` (compute, required on `itam-normalization-catalog-system`); `sign_document` (side_effect, required on `itam-contracts-system`); `compute_tco_rollup`, `compute_portfolio_metrics` (compute, required on `itam-portfolio-reporting-system`).
- **Bucket 1 (in-scope, agent fixable):** 10 items.
- **Bucket 2 (surface-for-user, judgment):** 8 items.
- **Bucket 3 (Phase 0 pending, speculative):** 7 items.

Structural pass: A1, A2, A3, M1, M2, M4, M5, M6, M7, B1, B2, B3, B4, B5 (local), B6, B7, B9, B9b, B10b, B11, B12, C1, C2, E1, E2, E3, E4, E5, F1, F2, F3, F4, F5 PASS. A4 FAILS (catalog UX fields empty). F7 FAILS (`send_email` linked directly on contracts + lifecycle skills without workflow justification). H1 FAILS (8 of 10 cross-domain handoffs untagged).

Candidates queued to `audits/_missing-domains.md`: 0 (every adjacent sub-domain ITAM unifies is already in the catalog: HAM, SAM, SMP, FINOPS, EAM, IWMS, RMM).

### Vendor surface basis

ITAM is positioned as the **umbrella domain** that unifies HAM (hardware), SAM (software), SMP (SaaS), FINOPS (cloud), and EAM (enterprise / industrial). The flagship ITAM-pure-plays each compete on the cross-asset substrate: a unified contract object (one contract often covers hardware leases plus software licenses plus SaaS bundles plus cloud commitments), a unified lifecycle event log (acquisition, assignment, transfer, retirement, disposal across asset types), normalization (model recognition, software-title normalization, SaaS app catalog), and portfolio TCO reporting. The current footprint matches this shape: 2 masters at the cross-asset layer (`asset_contracts`, `asset_lifecycle_events`) plus consumer / embedded references into HAM / SAM / SMP / IWMS / HCM / S2P. The four modules cleanly partition the umbrella surface.

### Bucket 1 In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | A4 | `domains.catalog_tagline` and `domains.catalog_description` both empty for ITAM. Rule #20 says draft both per the buyer-voice rule, surface to user for review BEFORE writing. | Draft buyer-voice tagline + 1-3 paragraph description (workflow + value). Surface drafts; load only on user OK. |
| B1-S2 | F7 | Two skill_tools rows link `send_email` (tool 37) directly with empty `skill_tools.notes`: skill 149 (`itam-contracts-system`, required) and skill 150 (`itam-lifecycle-system`, optional). Per F7, generic notifications use `notify_person` / `notify_team` unless the workflow requires the specific channel. Renewal reminders, expiry alerts, and lifecycle notifications are exactly the substitutable-channel case. | PATCH the two skill_tools rows to point at `notify_person` instead of `send_email`. If a `notify_person` link already exists on either skill, DELETE the duplicate instead of PATCHing. |
| B1-S3 | data_objects.notes | `asset_contracts` (id 54) and `asset_lifecycle_events` (id 55) both carry `notes` content authored by a prior audit ("Audit 2026-05-24: ..."). Per Rule #15 (the prior write-time license is RESCINDED), notes are off-limits without user-approved wording. The B12 config-shape exemption no longer licenses populating `notes`. | Surface the existing strings to the user. Either preserve as-is (with explicit per-row approval of the exact text now retroactively), or revert to empty. Default proposal: revert to empty and track the config-shape exemption + submit-lock reasoning in this audit file instead. |

#### APQC TAGGING (Bucket 1, H1 closure)

Cross-domain handoff inventory for ITAM: 4 outbound + 6 inbound = 10 cross-domain rows. Current tags: 2 rows (handoff 633 carries a `discovery_substring` proposal on PCF 19207; handoff 34 carries a `discovery_override` on PCF 20599). 8 cross-domain handoffs untagged. Volume target per H1: 0.5N to 0.8N new `agent_curated` proposals (5 to 8) plus deferrals.

Agent-curated proposals (load with `proposal_source='agent_curated'`, `record_status='new'`):

| ID | Handoff | Source -> Target | Trigger event | Payload | Proposed PCF | PCF id | Confidence |
|---|---|---|---|---|---|---|---|
| B1-H1 | 634 | ITAM-CONTRACTS -> GRC | `asset_contract.expired` | `asset_contracts` | Manage contracts | 807 (10291) | high |
| B1-H2 | 635 | ITAM-CONTRACTS -> ERP-FIN | `asset_contract.renewed` | `asset_contracts` | Manage contracts | 807 (10291) | high |
| B1-H3 | 632 | ITAM-LIFECYCLE -> ERP-FIN | `asset_lifecycle_event.recorded` | `asset_lifecycle_events` | Process and record fixed-asset adjustments, enhancements, revaluations, and transfers | 1390 (10831) | medium |
| B1-H4 | 633 (existing `discovery_substring` already proposed) | ITAM-LIFECYCLE -> HAM | `asset.retired_for_disposal` | `asset_lifecycle_events` | Process and record fixed-asset additions and retires | 1389 (10830) | high (more specific than the existing PCF 10) |
| B1-H5 | 853 | APM -> ITAM-NORMALIZATION-CATALOG | `technology_platform.registered` | `technology_platforms` | Maintain IT asset records | 1312 (20918) | high |
| B1-H6 | 462 | IGA -> ITAM-LIFECYCLE | `iga_provisioning_event.completed` | `iga_provisioning_events` | Manage asset resource deployment and utilization | 1335 (10781) | medium |
| B1-H7 | 645 | RMM -> ITAM-LIFECYCLE | `automation_script.executed` | `automation_scripts` | Update work and asset records | 1552 (19249) | medium |

Deferred to Discover Pass 3 (no confident PCF match):

| ID | Handoff | Source -> Target | Trigger event | Defer reason |
|---|---|---|---|---|
| B1-H8 | 31 | ITSM -> ITAM-LIFECYCLE | `service_incident.asset_failure` | Sits between incident management (PCF 20903 family) and asset-record maintenance (1552). The current substring tagger may already attach an ITSM-side PCF; let Discover Pass 3 reconcile the cross-domain attribution before this audit force-tags it. |
| B1-H9 | 799 | KUBE-PLAT -> ITAM-NORMALIZATION-CATALOG | `kubernetes_cluster.provisioned` | Kubernetes container registration is closer to platform-discovery than fixed-asset accounting; APQC has no clean cloud-platform-registration entry. Defer pending KUBE-PLAT audit decisions about whether kube clusters belong in the asset register at all. |

### Bucket 2 Surface-for-user (judgment calls)

1. **`ITAM-NORMALIZATION-CATALOG` has zero own data_objects.** Module 57's description explicitly says "Computed/reconciliation layer over HAM/SAM/SMP/FINOPS/EAM masters; intentionally has no own data_objects". But the module receives two inbound cross-domain handoffs (`technology_platform.registered` from APM, `kubernetes_cluster.provisioned` from KUBE-PLAT) that arrive at a module with no master to write into. Options: (a) keep as-is and re-route the two inbound handoffs to ITAM-LIFECYCLE (which masters `asset_lifecycle_events` and can record the registration as a lifecycle event); (b) add a real master to module 57 (`asset_taxonomies` / `normalization_rules` / `vendor_normalizations`, modeled after Flexera Technopedia or Snow SLM); (c) re-classify module 57 as a `module_kind='starter'` since it has no master surface. Recommended default: (a) the two inbounds route to `asset_lifecycle_events`, module 57 stays a derived analytical layer.
2. **Module 60 `ITAM-PORTFOLIO-REPORTING` has 1 DMDO (consumer `saas_applications`) and no masters.** Same architectural pattern as module 57 (derived layer). Question: should the module master a `portfolio_snapshots` entity that captures point-in-time TCO and portfolio-position rows? Flagship vendors (Flexera One, ServiceNow ITAM) ship snapshot tables for historical rollup reporting. Option to add `portfolio_snapshots` (master + required) to module 60 surfaces here for the user.
3. **`purchase_orders` (id 73) consumer dependency.** ITAM-LIFECYCLE declares `consumer + required` on `purchase_orders`. The canonical master sits in S2P per legacy `domain_data_objects`, but no `domain_module_data_objects` row anywhere has `role='master'` on data_object 73. This is a B5 integrity gap owed by S2P (its Phase B never modularized `purchase_orders`). Report-only here. Question for the user: also schedule an S2P b1 audit to close the upstream master gap.
4. **`domains.business_logic` contains an em-dash.** ITAM row 3 has `business_logic` text "Normalisation tables (the same hardware/software model expressed inconsistently across feeds) are the small irreducible kernel <U+2014> they require maintained reference data, not a runtime engine." (The `<U+2014>` here marks the live em-dash in the database for the user; the audit prose itself uses ASCII per the project rule.) Also note: `Normalisation` is British spelling. Both should be corrected per the project's no-em-dash rule and American English rule. Options: (a) PATCH to remove the em-dash and switch to "Normalization" (recommended); (b) leave as-is.
5. **Permission verb override coverage.** Lifecycle states 277 (active) and 280 (terminated) on `asset_contracts` carry overrides `activate_contract` and `terminate_contract`. Both are clear. No question here for `asset_contracts`. But `asset_lifecycle_events` has zero lifecycle states (config-shape exemption). The B12 exemption is recorded only in `data_objects.notes` (B1-S3 already flags the notes issue). Question: do we positively confirm the config-shape exemption in this audit file (acceptable) instead of in `data_objects.notes` (Rule #15 violation)? Recommended answer: yes, exemption stands and lives in this audit going forward.
6. **GDPR conditional applicability.** `domain_regulations` row marks GDPR conditional on ITAM. Asset records sometimes contain personal data (assigned-employee names, employee IDs, location of personal device). Question: is "conditional" the right value, or should the team upgrade to "mandatory" given that the typical EU deployment will trigger GDPR coverage on the embedded `users` edges and `hcm_positions` references? Tradeoff: tightening this propagates compliance signals through the catalog.
7. **Cross-cutting capability candidates.** ITAM's 5 capabilities are all domain-prefixed (`ITAM-NORMALIZATION`, `ITAM-CONTRACT-MGMT`, `ITAM-LIFECYCLE-LOG`, `ITAM-TCO-REPORTING`, `ITAM-RECONCILIATION`). Two of these likely span >=3 sub-domains (HAM + SAM + SMP + FINOPS + EAM): `ITAM-NORMALIZATION` and `ITAM-RECONCILIATION` describe substrate behaviors the sub-domains share. Question: rename to domain-neutral `ASSET-NORMALIZATION` / `ASSET-RECONCILIATION` per the cross-cutting capability convention, and add `capability_domains` rows linking them to HAM, SAM, SMP, FINOPS, EAM?
8. **Pairwise reconciliation scope.** ITAM has 9 cross-domain neighbors total, each at edge weight 1 or 2 (no neighbor reaches the >=3 threshold for deep dive). The pairwise pass below uses the one-line summary format. Question: does the user want a deep pairwise pass on any specific boundary anyway (`ITAM <-> ERP-FIN` for fixed-asset ledger, `ITAM <-> HAM` for the disposal handoff, `ITAM <-> ITSM` for incident-driven failure events)?

### Bucket 3 Phase 0 pending (speculative)

Candidate entities surfaced from flagship ITAM platform research that may belong as masters on this domain. Phase 0 vetting (formal vendor-research protocol) would confirm or filter.

| Candidate | Proposed module | Vendor evidence (informal) |
|---|---|---|
| `asset_assignments` | ITAM-LIFECYCLE | ServiceNow ITAM, Snow, Flexera all model current-holder (employee, location, cost center) distinct from lifecycle events. |
| `asset_audits` | ITAM-LIFECYCLE | Snow Atlas, Flexera; periodic physical-asset audit records. Distinct from `asset_lifecycle_events` (events are point-in-time, audits are scoped reconciliations). |
| `normalization_rules` / `asset_taxonomies` | ITAM-NORMALIZATION-CATALOG | Flexera Technopedia, Snow SLM ship vendor + product taxonomies; ITAM platforms host customer-side overrides. |
| `portfolio_snapshots` | ITAM-PORTFOLIO-REPORTING | ServiceNow ITAM, Flexera One; point-in-time portfolio + TCO snapshots for historical rollup reporting. |
| `cost_allocations` | ITAM-PORTFOLIO-REPORTING | Snow Atlas, ServiceNow; cost-center / cost-allocation rules over asset spend. Boundary with FINOPS. |
| `contract_renewal_events` | ITAM-CONTRACTS | Many ITAM platforms model renewal as a first-class event distinct from contract state changes. Could fold into `asset_lifecycle_events` instead. |
| `usage_metrics` | ITAM-PORTFOLIO-REPORTING | SAM-adjacent: usage metering for software / SaaS. May belong in SAM / SMP rather than ITAM umbrella. |

### Cross-bucket dependencies

- **Bucket 2 #1 (module 57 normalization data_objects) and Bucket 3 row 3 (`normalization_rules`)** are the same architectural question approached from two sides. Resolve Bucket 2 #1 first; if (b) "add a master" wins, the Bucket 3 candidate becomes the implementation.
- **Bucket 2 #2 (module 60 portfolio_snapshots) and Bucket 3 row 4** likewise. Resolve Bucket 2 #2 first.
- **Bucket 2 #3 (S2P purchase_orders master gap)** depends on whether the user also schedules an S2P audit; the ITAM-side fix here is a no-op until S2P modularizes the master.
- **Bucket 2 #7 (cross-cutting capabilities)** is independent of Bucket 1 and Bucket 3.

### Per-bucket prompts

- **Bucket 1:** Approve the 9 items? B1-S1 needs the user to review the buyer-voice draft tagline + description first (per Rule #20, never overwrite once a non-empty value exists). B1-S2 and B1-H1 to B1-H7 are mechanical loads on user OK. B1-S3 needs the user to choose preserve-as-is vs revert-to-empty on the two `data_objects.notes` strings. B1-H8 and B1-H9 are explicit deferrals to Discover Pass 3.
- **Bucket 2:** Eight judgment calls awaiting decision. Items #1, #2, and Bucket 3 rows 3 and 4 cluster around "do the derived modules acquire their own masters?". Items #4, #5, #6 are independent edits. Item #7 is a capability rename + extra links. Item #8 is a deep-pairwise-pass scope decision.
- **Bucket 3:** Vet via Phase 0 research (formal vendor surface protocol) or eyeball mode against the flagship vendors listed in the table? Recommended: defer until Bucket 2 #1 and #2 land, since the answers there shrink the Bucket 3 list materially.

### Pass 3 Neighbor discovery

Auto-derived from `handoffs` plus cross-domain `domain_module_data_objects` references.

| Neighbor | Outbound handoffs | Inbound handoffs | DMDO cross-refs (consumer/embedded on neighbor's masters) | Edge weight |
|---|---|---|---|---|
| ERP-FIN | 2 (`asset_contract.renewed`, `asset_lifecycle_event.recorded`) | 0 | 0 | 2 |
| GRC | 1 (`asset_contract.expired`) | 0 | 0 | 1 |
| HAM | 1 (`asset.retired_for_disposal`) | 0 | 0 | 1 |
| KUBE-PLAT | 0 | 1 (`kubernetes_cluster.provisioned`) | 0 | 1 |
| APM | 0 | 1 (`technology_platform.registered`) | 0 | 1 |
| ITSM | 0 | 1 (`service_incident.asset_failure`) | 0 | 1 |
| HCM | 0 | 1 (`employee.terminated`) | 1 (org_units embedded) | 2 |
| IGA | 0 | 1 (`iga_provisioning_event.completed`) | 0 | 1 |
| RMM | 0 | 1 (`automation_script.executed`) | 0 | 1 |
| SMP | 0 | 0 | 1 (saas_applications consumer) | 1 |
| IWMS | 0 | 0 | 1 (locations embedded) | 1 |
| S2P | 0 | 0 | 1 (purchase_orders consumer, legacy domain_data_objects only) | 1 |

No neighbor reaches edge weight >=3. Per the per-domain audit recipe, lighter neighbors get a one-line summary. Pass 4 is performed in the abbreviated form below.

### Pass 4 Pairwise reconciliation (abbreviated, edge weight < 3 for every neighbor)

- **ITAM <-> ERP-FIN (weight 2):** Two outbound handoffs (renewals, lifecycle events). Both fully wired (`target_domain_module_id` populated). No consumer DMDO on ERP-FIN side declaring `asset_contracts` or `asset_lifecycle_events` (ERP-FIN consumes the events as ledger inputs; consumer DMDO rows on ERP-FIN's `fixed_asset_register` module would be the symmetric coverage). Report-only: **ERP-FIN B8 owed** on `asset_contracts -> ?_asset_register` and `asset_lifecycle_events -> ?_asset_register`.
- **ITAM <-> HCM (weight 2):** Inbound `employee.terminated` -> `asset_lifecycle_events` (handoff 34) is fully wired and already tagged (PCF 20599). ITAM embeds `org_units` from HCM (id 34, optional). No outbound. Clean.
- **ITAM <-> GRC (weight 1):** Outbound `asset_contract.expired` to GRC (no `target_domain_module_id`, see B10b note in Pass 1 summary: B10b actually passes here because the GRC module FK is fully resolved). Report-only: **GRC B8 owed** for the relationship row mirror.
- **ITAM <-> HAM (weight 1):** Outbound `asset.retired_for_disposal` carries already-tagged PCF 19207 (improvable to 10830 per B1-H4). HAM-side consumer DMDO on `asset_lifecycle_events` would close the symmetric leg. Report-only: **HAM B8 / B10 owed** on the consumer DMDO row.
- **ITAM <-> APM (weight 1):** Inbound `technology_platform.registered` lands at module 57 which has no master to write to (Bucket 2 #1). Wiring depends on Bucket 2 #1 resolution.
- **ITAM <-> KUBE-PLAT (weight 1):** Same situation as APM. Inbound to module 57 awaits Bucket 2 #1.
- **ITAM <-> ITSM (weight 1):** Inbound `service_incident.asset_failure` from ITSM-INCIDENT-MGMT to ITAM-LIFECYCLE. Fully wired. APQC tag deferred (B1-H8). Clean structurally.
- **ITAM <-> IGA (weight 1):** Inbound `iga_provisioning_event.completed` fully wired. Clean structurally.
- **ITAM <-> RMM (weight 1):** Inbound `automation_script.executed` fully wired. Clean structurally.
- **ITAM <-> SMP (weight 1, no handoff):** ITAM-PORTFOLIO-REPORTING consumes `saas_applications` (mastered in SMP-DISCOVERY). Currently no handoff to refresh consumer state. May or may not need an event-driven sync depending on portfolio reporting cadence.
- **ITAM <-> IWMS (weight 1, no handoff):** ITAM-LIFECYCLE embeds `locations` (mastered in IWMS-LOCATION-MASTER). Single-direction embedded shell; no handoff necessary unless `locations` lifecycle changes need to invalidate cached asset placement.
- **ITAM <-> S2P (weight 1, missing master):** ITAM-LIFECYCLE consumes `purchase_orders`. S2P legacy `domain_data_objects` says S2P masters, but no `domain_module_data_objects` row implements that mastery. B5 owed by S2P, surfaced in Bucket 2 #3.

### Report-only follow-ups (owed by other domains)

- **ERP-FIN B8 owed:** consumer DMDO + relationship-row mirror for `asset_contracts -> ?_asset_register` and `asset_lifecycle_events -> ?_asset_register`. Reflects the two outbound handoffs ITAM publishes into ERP-FIN.
- **GRC B8 owed:** consumer DMDO + relationship-row mirror for `asset_contracts -> ?_compliance_evidence` (`asset_contract.expired` outbound).
- **HAM B8 / B10 owed:** consumer DMDO on `asset_lifecycle_events` for the disposal route (`asset.retired_for_disposal` outbound).
- **S2P B5 owed:** modularize `purchase_orders` master into a real `domain_module_data_objects` row. Until then, ITAM-LIFECYCLE's `consumer + required` row points at a data_object with no module-level canonical owner.
- **APM / KUBE-PLAT B10b note:** their inbound handoffs into ITAM-NORMALIZATION-CATALOG (module 57) target a module that masters nothing. Routing decision belongs to Bucket 2 #1 on ITAM's side (re-target to ITAM-LIFECYCLE) but the source-side `target_domain_module_id` may need updating in either case.

### `domains.notes` pointer (if updated)

_not yet written; requires user-approved wording per Rule #15_

## 2026-05-31, Continuation: B1 technical fixes

Applied the technical subset of the 2026-05-30 Bucket 1 inventory via [.tmp_deploy/fix_itam_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_itam_b1_technical_2026_05_31.ts) (loader run from project root per Rule #6).

### Applied (9 of 10 B1 items)

| ID | Type | Action |
|---|---|---|
| B1-S2 | PATCH skill_tools | `id=1370` (skill 149, required) and `id=1383` (skill 150, optional) re-pointed from `send_email` (tool 37) to `notify_person` (tool 913). No pre-existing 913 row on either skill, so no DELETE needed. |
| B1-S3 | PATCH notes='' | `data_objects.id=54` (`asset_contracts`) and `data_objects.id=55` (`asset_lifecycle_events`) reverted to `''`. Audit named the row ids; Rule #15 permits the revert. Config-shape exemption for `asset_lifecycle_events` and the submit-lock pattern reasoning for `asset_contracts` continue to live in this audit file, not in `data_objects.notes`. |
| B1-H1 | INSERT handoff_processes | handoff 634 (ITAM-CONTRACTS to GRC, `asset_contract.expired`) tagged process 807 (PCF 10291 `Manage contracts`), `agent_curated`. |
| B1-H2 | INSERT handoff_processes | handoff 635 (ITAM-CONTRACTS to ERP-FIN, `asset_contract.renewed`) tagged process 807 (PCF 10291), `agent_curated`. |
| B1-H3 | INSERT handoff_processes | handoff 632 (ITAM-LIFECYCLE to ERP-FIN, `asset_lifecycle_event.recorded`) tagged process 1390 (PCF 10831 `Process and record fixed-asset adjustments, enhancements, revaluations, and transfers`), `agent_curated`. |
| B1-H4 | INSERT handoff_processes | handoff 633 (ITAM-LIFECYCLE to HAM, `asset.retired_for_disposal`) tagged process 1389 (PCF 10830 `Process and record fixed-asset additions and retires`), `agent_curated`. Coexists with the prior discovery_substring row pointing at process 10 (PCF 19207); user reconciles during review. |
| B1-H5 | INSERT handoff_processes | handoff 853 (APM to ITAM-NORMALIZATION-CATALOG, `technology_platform.registered`) tagged process 1312 (PCF 20918 `Maintain IT asset records`), `agent_curated`. |
| B1-H6 | INSERT handoff_processes | handoff 462 (IGA to ITAM-LIFECYCLE, `iga_provisioning_event.completed`) tagged process 1335 (PCF 10781 `Manage asset resource deployment and utilization`), `agent_curated`. |
| B1-H7 | INSERT handoff_processes | handoff 645 (RMM to ITAM-LIFECYCLE, `automation_script.executed`) tagged process 1552 (PCF 19249 `Update work and asset records`), `agent_curated`. |

### Deferred (3 items)

| ID | Reason |
|---|---|
| B1-S1 | `domains.catalog_tagline` and `catalog_description` drafts require user review BEFORE writing per Rule #20. Defer pending the draft + review loop. |
| B1-H8 | Audit itself defers to Discover Pass 3 (ITSM-side PCF attribution to reconcile first). |
| B1-H9 | Audit itself defers pending KUBE-PLAT scoping decision. |

### Verification

- 8 handoff_processes rows confirmed present across handoffs 462, 632, 633 (two rows now), 634, 635, 645, 853; all new agent rows carry `record_status='new'`, `proposal_source='agent_curated'`.
- skill_tools 1370 and 1383 confirmed pointing at tool 913 (`notify_person`).
- data_objects 54 and 55 `notes` confirmed empty.
- UI spot-check: https://tests.semantius.app/domain_map/handoff_processes, https://tests.semantius.app/domain_map/skill_tools, https://tests.semantius.app/domain_map/data_objects.
