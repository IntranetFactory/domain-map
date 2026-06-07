# ITAM audit history

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

## 2026-05-31, Audit

### Summary

- Current footprint: 4 full modules (ITAM-NORMALIZATION-CATALOG, ITAM-CONTRACTS, ITAM-LIFECYCLE, ITAM-PORTFOLIO-REPORTING); 5 capabilities; 7 solutions (5 primary, 2 secondary); 2 regulations (SOX mandatory, GDPR conditional); 2 masters (`asset_contracts` id 54, `asset_lifecycle_events` id 55); 5 trigger events on those masters (4 with empty `event_category`, 1 with `state_change`); 4 outbound cross-domain handoffs + 4 intra-domain handoffs (ids 1083-1086 added since prior audit) + 6 inbound cross-domain handoffs; 10 handoff_processes rows covering 8 cross-domain handoffs (8 agent_curated `new`, 1 discovery_substring, 1 discovery_override); 4 roles + 11 role_modules + 13 role_permissions; 4 system skills + 38 skill_tools links.
- Vendor surface basis carried from 2026-05-30: ServiceNow IT Asset Management, Flexera One, Snow Atlas, Ivanti Neurons for ITAM, USU IT Asset Management (primary); Certero, Eracent ITMC (secondary). Unchanged this run.
- Bucket 1 (in-scope, agent fixable): 4 items.
- Bucket 2 (surface-for-user, judgment): 7 items.
- Bucket 3 (Phase 0 pending, speculative): 7 items (carried).

Structural pass: A1, A2, A3, M1, M2, M4, M5, M6, M7, B1, B2, B3, B4, B5 (local masters; 73 is owed by S2P), B6, B7, B9, B9b, B10b, B11, B12, C1, C2, D1, E1, E2, E3, E4, E5, F1, F2, F3, F4, F5, F7, H1 PASS. A4 FAILS (`domains.catalog_tagline`, `catalog_description` empty). M8 FAILS (every module `catalog_tagline` + `catalog_description` empty across modules 57, 58, 59, 60). Rule #15 pollution FAILS on 8 cross-domain `handoffs.notes` ("source/target NULL until X is modularized") plus 4 intra-domain `handoffs.notes` annotations (1083, 1084, 1085, 1086).

Carry-forward from 2026-05-30 + 2026-05-31 continuation:

- B1-S2 (skill_tools repointed to `notify_person`): APPLIED 2026-05-31, verified clean this run.
- B1-S3 (notes on data_objects 54, 55): APPLIED 2026-05-31, verified empty this run.
- B1-H1..H7 (APQC tagging): APPLIED 2026-05-31, all 7 rows present at `proposal_source=agent_curated`, `record_status=new`.
- B1-S1 (catalog UX backfill): still deferred pending user-approved drafts (Rule #20).
- B1-H8 (ITSM-side reconcile), B1-H9 (KUBE-PLAT scoping): still deferred to Discover Pass 3.

### Vendor surface basis

Unchanged from 2026-05-30 audit. ITAM remains positioned as the umbrella domain unifying HAM, SAM, SMP, FINOPS, EAM. The 4-module split (normalization, contracts, lifecycle, portfolio reporting) continues to match the flagship product shape.

### Bucket 1, in-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-N1 | Rule #15 (`handoffs.notes`) | 8 cross-domain handoff rows carry forbidden "source/target NULL until X is modularized" annotations: ids 462, 632, 633, 634, 635, 645, 799, 853. The prior write-time license is RESCINDED. | PATCH `notes=''` on each. Track unmodularized counter-parties (GRC, ERP-FIN, HAM, IGA, RMM, KUBE-PLAT, APM) in the report-only follow-ups section, not in notes. |
| B1-N2 | Rule #15 (`handoffs.notes`) | 4 intra-domain handoff rows (ids 1083, 1084, 1085, 1086) carry restated-schema notes ("Renewal generates renewed lifecycle events...", "Expiry marks support_expired lifecycle events...", "Recorded lifecycle events feed the portfolio TCO rollup."). These restate the trigger event + payload + module pair already in structured columns. | PATCH `notes=''` on each. The semantics already live in `trigger_event.description` and the DMDO master pair. |
| B1-E1 | `trigger_events.event_category` | Events 613, 614, 615, 616 carry `event_category=''` (empty); event 1209 carries `state_change`. Per Rule #13 the enum is `lifecycle, state_change, threshold, signal`. All five are state changes on their masters. | PATCH `event_category='state_change'` on 613, 614, 615, 616. |
| B1-S4 | `domains.business_logic` em-dash + British spelling (carried) | ITAM row 3 `business_logic` still contains a U+2014 em-dash and "Normalisation" (British). Project rules forbid em-dashes and require American English. | PATCH to "Normalization tables (the same hardware/software model expressed inconsistently across feeds) are the small irreducible kernel, they require maintained reference data, not a runtime engine." Requires user OK on the exact wording before write. |

#### APQC TAGGING

H1 coverage on cross-domain handoffs (10 rows, 4 outbound + 6 inbound):

| handoff_id | tagged | provenance | status |
|---|---|---|---|
| 31 | no | n/a | deferred to Discover Pass 3 (B1-H8 carried) |
| 34 | yes | discovery_override (PCF 20599) | covered |
| 462 | yes | agent_curated (PCF 10781) | covered |
| 632 | yes | agent_curated (PCF 10831) | covered |
| 633 | yes | discovery_substring (PCF 19207) + agent_curated (PCF 10830) | covered (duplicate pending reconcile) |
| 634 | yes | agent_curated (PCF 10291) | covered |
| 635 | yes | agent_curated (PCF 10291) | covered |
| 645 | yes | agent_curated (PCF 19249) | covered |
| 799 | no | n/a | deferred to Discover Pass 3 (B1-H9 carried) |
| 853 | yes | agent_curated (PCF 20918) | covered |

H1 PASS (8 covered + 2 deferred-in-audit = 10/10). No new agent_curated rows owed; carry the two deferrals.

### Bucket 2, surface-for-user (judgment calls)

1. **B1-S1, A4 + M8 buyer-voice copy drafts (carried).** ITAM `domains.catalog_tagline` + `catalog_description` empty; all four modules also empty. Rule #20 requires drafting both per the buyer-voice rule and surfacing for user review BEFORE writing. Five rows: 1 domain + 4 modules. Ask: drafts now for all five, or defer until a dedicated marketing pass?
2. **Module 57 `ITAM-NORMALIZATION-CATALOG` has zero own data_objects (carried).** Two inbound handoffs (799 from KUBE-PLAT, 853 from APM) target a module that masters nothing. Options unchanged: (a) re-route inbounds to ITAM-LIFECYCLE; (b) add a real master (`asset_taxonomies` / `normalization_rules`); (c) re-classify as `module_kind='starter'`. Recommended default (a).
3. **Module 60 `ITAM-PORTFOLIO-REPORTING` has 1 consumer DMDO and no masters (carried).** Add a `portfolio_snapshots` master, or accept as a derived analytical layer? Recommended: surface the trade-off, leave as-is unless the user pushes for snapshots.
4. **B5 owed by S2P on `purchase_orders` (73) (carried).** ITAM-LIFECYCLE consumes 73 but no `domain_module_data_objects` row anywhere has `role='master'` on 73. Legacy `domain_data_objects` row in S2P. Question: schedule an S2P b1 to close, or accept as a long-standing gap?
5. **GDPR applicability still `conditional` (carried).** Tightening propagates compliance signals through embedded `users` and `hcm_positions` edges.
6. **Cross-cutting capability candidates (carried).** `ITAM-NORMALIZATION` (533) and `ITAM-RECONCILIATION` (537) plausibly span HAM + SAM + SMP + FINOPS + EAM. Rename to domain-neutral `ASSET-NORMALIZATION` / `ASSET-RECONCILIATION` and link via `capability_domains`?
7. **`asset_lifecycle_events` config-shape exemption (carried).** The master has zero lifecycle states because every state is captured by the event row itself. Confirm exemption stands; recorded here in history.md, not in `data_objects.notes` (Rule #15).

### Bucket 3, Phase 0 pending (speculative)

Carried verbatim from 2026-05-30. No new candidates this run. Rows 3 and 4 depend on Bucket 2 #2 and #3 resolution.

| Candidate | Proposed module | Vendor evidence |
|---|---|---|
| `asset_assignments` | ITAM-LIFECYCLE | ServiceNow, Snow, Flexera all model current-holder |
| `asset_audits` | ITAM-LIFECYCLE | Snow Atlas, Flexera periodic physical-asset audits |
| `normalization_rules` / `asset_taxonomies` | ITAM-NORMALIZATION-CATALOG | Flexera Technopedia, Snow SLM |
| `portfolio_snapshots` | ITAM-PORTFOLIO-REPORTING | ServiceNow ITAM, Flexera One |
| `cost_allocations` | ITAM-PORTFOLIO-REPORTING | Snow Atlas, ServiceNow; boundary with FINOPS |
| `contract_renewal_events` | ITAM-CONTRACTS | Could fold into `asset_lifecycle_events` |
| `usage_metrics` | ITAM-PORTFOLIO-REPORTING | May belong in SAM / SMP rather than ITAM |

### Report-only follow-ups (owed by other domains, carried)

- ERP-FIN B8 owed: consumer DMDO + relationship mirror for `asset_contracts -> ?_asset_register` and `asset_lifecycle_events -> ?_asset_register`.
- GRC B8 owed: consumer DMDO + relationship mirror for `asset_contracts -> ?_compliance_evidence`.
- HAM B8 + B10 owed: consumer DMDO on `asset_lifecycle_events` for the disposal route.
- S2P B5 owed: modularize `purchase_orders` (73) master into a `domain_module_data_objects` row.
- KUBE-PLAT B5 owed: modularize `kubernetes_clusters` (448) master (today only legacy `domain_data_objects` in KUBE-PLAT).
- RMM B5 owed: modularize `automation_scripts` (225) master (legacy rows in RMM + TEST-MGMT).
- APM routing: outbound `technology_platform.registered` to ITAM module 57 still depends on Bucket 2 #2 resolution.

### Per-bucket prompts

- Bucket 1: PATCH B1-N1 + B1-N2 + B1-E1 now? B1-S4 needs user-approved exact wording first.
- Bucket 2: 7 judgment calls awaiting decision; #2, #3 cluster with Bucket 3 rows 3 and 4 (resolve Bucket 2 first).
- Bucket 3: vet via Phase 0 research or eyeball-mode? Recommended defer until Bucket 2 #2 and #3 land.

### Verification

- Domain row id=3; 4 modules (57-60); 2 masters (54, 55); B10b clean (zero null FK rows on `handoffs.source_domain_module_id` and `target_domain_module_id` when this domain is the source or target).
- 10 `handoff_processes` rows confirmed across handoffs 462, 632, 633 (two rows), 634, 635, 645, 799, 853, plus 34 (existing discovery_override).
- `skill_tools` 1370 and 1383 confirmed pointing at tool 913 (`notify_person`); no channel primitives remain in ITAM skills.
- data_objects 54 + 55 `notes` confirmed empty; pollution survives on 12 `handoffs.notes` rows (8 cross-domain + 4 intra-domain).
- 4 `trigger_events` with empty `event_category` surfaced as B1-E1.

### `domains.notes` pointer (if updated)

_not yet written; requires user-approved wording per Rule #15_

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

State-driven Validate pass (SKILL.md Rule #21) over the open items in
`audits/ITAM/state.yaml`. Worked the open items only; no fresh from-scratch audit.
Single loader: [.tmp_deploy/fix_itam_state_driven_2026_06_07.ts](../../.tmp_deploy/fix_itam_state_driven_2026_06_07.ts),
run from project root. Domain id 3; ITAM is the cross-asset umbrella over HAM / SAM /
SMP / FINOPS / EAM and masters only the two substrate entities (`asset_contracts` id 54,
`asset_lifecycle_events` id 55); the sub-domains master their own asset-type entities.

### Summary

Cleared the three agent-doable additive/corrective state items (entity_type
classification, event_category backfill, Rule #20 catalog UX backfill). Everything
remaining is user-gated: the destructive notes wipes, the M9 DMDO rewrite, the
business_logic em-dash fix, the deferred persona/RACI layer, two b1b handoffs blocked
on other domains, and the b3 backlog. `next_action_by` flips to `user`.

### Executed (all record_status='new', idempotent, verified live)

| State item | Type | Rows | Detail |
|---|---|---|---|
| B1A-ENTITY-TYPE | PATCH data_objects.entity_type | 2 | 54 `asset_contracts` -> `operational_workflow` (5 lifecycle states + submit_lock + single_approver); 55 `asset_lifecycle_events` -> `operational_record` (append-only cross-cutting audit log, zero lifecycle states is the structural config-shape per Rule #12). |
| B1A-E1 | PATCH trigger_events.event_category | 4 | 613, 614, 615, 616 empty -> `state_change` (Rule #13 enum; all four are state changes on their master). 1209 already `state_change`. |
| B1B-S1 | PATCH catalog_tagline + catalog_description | 5 | Rule #20 buyer-voice copy written into the empty domain row (3) + all 4 modules (57, 58, 59, 60). The prior "surface-before-write" gate is rescinded by Rule #20 / Rule #21: empty catalog UX fields are written, not surfaced. No vendor names, no em-dash, American English. Empty-guard per field; no non-empty value overwritten. |

Pre-existing carry-forward confirmed clean this pass: `data_objects` 54/55 `notes`
already empty (reverted 2026-05-31); skill_tools repointing is moot under the
per-domain-skill model (skill_tools dropped, see 2026-06-06 supersession header).

### Surfaced (user decisions / destructive, not executed)

- **B2-CONFIRM-N-FIXES (destructive):** wipe forbidden Rule #15 `handoffs.notes` on 12 rows (cross-domain 462, 632, 633, 634, 635, 645, 799, 853; intra-domain 1083, 1084, 1085, 1086). All still carry the forbidden strings. PATCH notes='' overwrites a non-empty value -> needs sign-off.
- **B1A-SELF-CONTAIN (M9, destructive):** DMDO id=224 on module 60, `saas_applications` (61, SMP-mastered) is consumer/required. Recommend set necessity='optional' (or embedded_master). Rewrite of an existing DMDO row -> needs sign-off.
- **B1B-S4 (destructive):** `domains.business_logic` on row 3 still has the U+2014 em-dash and British "Normalisation". Recommended ASCII / American replacement is in state.yaml; overwrite of a non-empty value -> needs wording confirmation.
- **B1A-PHASE-P (deferred):** persona / RACI layer not authored (dedicated worked pass). Candidate personas: Asset Manager, Contract/Renewal Administrator, Asset Data Steward.
- **b2 forks:** B2-MOD57 (module 57 masters nothing, 2 inbound handoffs), B2-MOD60 (portfolio_snapshots master?), B2-S2P-PO (purchase_orders 73 master gap owed by S2P), B2-GDPR (conditional vs mandatory), B2-CROSS-CUT-CAPS (rename 533/537 cross-cutting), B2-LIFECYCLE-EXEMPT (confirm the operational_record framing now in place).

### Left

- **b1b blocked:** B1B-H8 (handoff 31 ITSM PCF, Discover Pass 3), B1B-H9 (handoff 799 KUBE-PLAT scope).
- **b3 backlog (7, non-blocking):** asset_assignments, asset_audits, normalization_rules/asset_taxonomies, portfolio_snapshots, cost_allocations, contract_renewal_events, usage_metrics.
- **Superseded:** per-module skill-grain / skill_tools items remain retired per the 2026-06-06 supersession header above; not re-opened.

### Report-only follow-ups (owed by other domains, carried)

- ERP-FIN B8: consumer DMDO + relationship mirror for `asset_contracts` / `asset_lifecycle_events` into the fixed-asset register (reflects outbound handoffs 632, 635).
- GRC B8: consumer DMDO + relationship mirror for `asset_contracts` (outbound 634 `asset_contract.expired`).
- HAM B8 / B10: consumer DMDO on `asset_lifecycle_events` for the disposal route (outbound 633).
- S2P B5: modularize `purchase_orders` (73) master into a `domain_module_data_objects` row (B2-S2P-PO).
- KUBE-PLAT B5 / APM routing: inbound handoffs to module 57 await B2-MOD57.

### Verification

- data_objects 54 -> `operational_workflow`, 55 -> `operational_record` (record_status='new').
- trigger_events 613-616 -> `event_category='state_change'`.
- domains.id=3 + domain_modules 57-60 catalog_tagline + catalog_description populated, record_status='new'.
- UI: https://tests.semantius.app/domain_map/data_objects?id=in.(54,55) ,
  https://tests.semantius.app/domain_map/trigger_events ,
  https://tests.semantius.app/domain_map/domains?id=eq.3 ,
  https://tests.semantius.app/domain_map/domain_modules?domain_id=eq.3
