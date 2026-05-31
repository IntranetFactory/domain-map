---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 42
---

# AUDIT, Audit History

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 8 masters (`audit_plans`, `audit_engagements`, `audit_findings`, `work_papers`, `control_tests`, `audit_recommendations`, `audit_reports`, `follow_up_actions`) plus 4 consumers (`journal_entries`, `financial_forecasts`, `audit_issues`, `employees`) and 2 embedded masters (`org_units`, `locations`). **Zero `domain_modules` rows** (M1 hard fail, blocks every M / E / F band). **Zero `capability_domains` rows** (A2 hard fail). 7 solutions (3 primary, 4 secondary). 3 regulations (SOX, ISO/IEC 27001, SOC 2). 15 trigger events. 9 outbound + 32 inbound cross-domain handoffs. 1 legacy domain-level system skill (`audit-system`, id 9) with 18 `skill_tools` rows but `domain_module_id` is NULL so F2 cannot pass without modules. Zero `roles` linked to Internal Audit (business_function id 46). 10 of 41 cross-domain handoffs carry APQC tags (all `discovery_substring`, all `record_status='new'`); 31 untagged.
- Vendor-surface basis: AuditBoard (modern internal-audit specialist), Workiva (financial-reporting + audit), Wolters Kluwer TeamMate+ (Big-4 fieldwork heritage), Diligent One (board / governance + audit), ServiceNow IRM (suite competitor), Archer Suite (legacy GRC + audit module), MetricStream Connected GRC (regulated-industry GRC + audit). AuditBoard, Workiva, TeamMate+ are the three pure-play anchors; the other four are suite competitors that cover audit as one workflow.
- **Bucket 1 (in-scope, agent fixable):** 23 items.
- **Bucket 2 (surface-for-user, judgment):** 9 items.
- **Bucket 3 (Phase 0 pending, speculative):** 10 items.

Structural pass: A1 passes, A2 hard fails (zero capabilities), A4 hard fails (empty catalog_tagline + catalog_description). M1 hard fails (zero modules), which vacuously fails M2, M4, M5, M6 and blocks E1 to E6, F2 to F5, F7. B1, B2, B5, B7, B11 pass; B3 needs review (8 prefixed names so vacuously pass, but the bare-word `work_papers` and `control_tests` may warrant the canonical-claim path); B4 pass-by-default (every flag is false-by-default, no positive consideration recorded); B6 passes (10 intra-domain edges); B8 mostly populated (31 outbound cross-domain relationships from `audit_findings`); B9 has 1 trigger event with no handoff (`work_paper.completed`, id 605) and 2 duplicate-shape events (the second `audit_finding.created` id 349 versus `finding.created` id 230, both on data_object 294); B9b passes vacuously (single, zero-module domain); B10b massive fail (40 of 41 handoffs have NULL `source_domain_module_id` and `target_domain_module_id`, blocked upstream by M1). C1 passes. D1 not run (no UI labels to check on missing modules). H1: 10 of 41 cross-domain handoffs tagged (24%), all `discovery_substring`, zero `agent_curated`, zero `approved`.

Semantius score: uncomputable (F5 rollup) because F2 cannot pass without `domain_modules` rows. The legacy `audit-system` skill exists with 18 tools (15 platform, 1 external) but is not anchored to any module so the per-module derivation has no denominator.

### Bucket 1, In-scope confirmed gaps

#### MODULARIZATION (structural gate, blocks every downstream load)

| ID | Finding | Proposed fix |
|---|---|---|
| B1-MOD1 | M1 hard fail: zero `domain_modules` rows for AUDIT. Eight masters and 41 cross-domain handoffs sit on the legacy `domain_data_objects` rollup with no deployable host. The market shape (vendor-confirmed) supports a clean two-module split: **AUDIT-PLAN-ENGAGE** (planning, scoping, engagements, work papers, control tests) and **AUDIT-FINDINGS-REPORTING** (findings, recommendations, reports, follow-up actions). Both AuditBoard and TeamMate+ split planning / fieldwork from issue management this way. | Author 2 `domain_modules` rows with `module_kind='full'`, then load 1 `domain_module_capabilities` row per realizing capability and 1 `domain_module_data_objects` row per master per module. Domain has more than 3 capabilities under any realistic shape, so M2's 2-module floor is required anyway. |

#### MISSING (compliance-mandated and universal-vendor entities)

| ID | Entity | Proposed module | Basis | Notes |
|---|---|---|---|---|
| B1-M1 | `audit_universe_entities` | AUDIT-PLAN-ENGAGE | Universal (AuditBoard, TeamMate+, Workiva, Archer) | The "auditable units" master from which annual planning samples. Today AUDIT has no risk-rated population to plan from. |
| B1-M2 | `risk_assessments` (audit-scoped) | AUDIT-PLAN-ENGAGE | Universal | Audit-side risk scoring per universe entity, distinct from GRC's enterprise risk register. AuditBoard `RiskOversight`, TeamMate+ `Risk`, Workiva `Risk`. Note: data_object_id 291 already exists in catalog (used by ATS audit's stale row 833). Confirm it isn't already mastered elsewhere before claiming it. |
| B1-M3 | `audit_evidence` | AUDIT-PLAN-ENGAGE | Universal | Files / screenshots / attestations attached to work papers and control tests. Distinct from `work_papers` (the analytical doc) versus the raw evidence collected. |
| B1-M4 | `audit_programs` | AUDIT-PLAN-ENGAGE | Universal (AuditBoard, TeamMate+) | Reusable templates of audit steps and procedures applied per engagement. Today `audit_engagements` has no template upstream. |
| B1-M5 | `audit_samples` | AUDIT-PLAN-ENGAGE | Universal | Sample selections per control test or finding (population, sample size, methodology, sampled records). Critical for testing reproducibility. |
| B1-M6 | `management_responses` | AUDIT-FINDINGS-REPORTING | Universal | Auditee's response to each finding. Today `audit_recommendations` collapses recommendation + response into one entity; market shape separates them. |
| B1-M7 | `audit_committee_meetings` | AUDIT-FINDINGS-REPORTING | Universal (Diligent, AuditBoard board-pack flow) | Board-level reporting cadence. Audit committee meeting is where `audit_reports.issued` lands. |

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | A2 | Zero `capability_domains` rows for AUDIT. Domain has eight masters and a vendor-confirmed multi-pillar surface; expected count is 5 to 8 capabilities. | Author capabilities (proposed codes: `AUDIT-UNIVERSE-MGMT`, `AUDIT-PLAN-RISK-ASSESS`, `AUDIT-FIELDWORK-EXEC`, `AUDIT-EVIDENCE-MGMT`, `AUDIT-CONTROLS-TESTING`, `AUDIT-FINDINGS-MGMT`, `AUDIT-RECOMMENDATIONS-FOLLOWUP`, `AUDIT-REPORTING-COMMITTEE`) and link via `capability_domains`. |
| B1-S2 | A4 | `domains.catalog_tagline` and `domains.catalog_description` both empty (Rule #20). | Draft buyer-voice copy describing audit-plan-to-report flow and surface to user before writing. |
| B1-S3 | B3 | `work_papers` and `control_tests` are bare-word names but `is_canonical_bare_word=false` with empty `naming_authority_rationale`. The names are not collision-prone today but Rule #9 wants the canonical claim recorded once the audit owns them as the canonical home. | Either PATCH to `is_canonical_bare_word=true` with a rationale, or rename to `audit_work_papers` and `audit_control_tests`. Surface to user; default is rename when the noun has plausible homonyms in other domains, e.g. `control_tests` overlaps GRC's control-test concept. |
| B1-S4 | B4 | Pattern flags on all 8 masters are all false-by-default with no recorded positive consideration. `audit_reports` likely needs `has_single_approver=true` (audit-committee chair signs off); `work_papers` and `audit_findings` likely need `has_submit_lock=true` (signoff locks the row); none have `has_personal_content=true` (audit data is corporate, not personal). | PATCH `has_single_approver=true` on `audit_reports`; `has_submit_lock=true` on `work_papers` and `audit_findings`. Surface to user for sign-off. |
| B1-S5 | F1 | Legacy domain-level system skill: skill id 9, `audit-system`, `domain_module_id=null`. Once B1-MOD1 lands and per-module system skills are authored, the legacy row is obsolete (F1). | DELETE skill 9 after the per-module skills (one per new module) are authored under B1-MOD1's load. |
| B1-S6 | F2/F3 | Once modules ship, each of the two new modules needs exactly one `skill_type='system'` skill with at least one `skill_tools` row (Rule #17). Suggested names: `audit_plan_engage_agent` and `audit_findings_reporting_agent`. The 18 existing `skill_tools` rows on legacy skill 9 partition cleanly between the two new modules. | Author 2 system skills under B1-MOD1's load; re-link `skill_tools` rows to the new skill ids. Floor of 3 required tools per skill (at least one query, one mutate, one workflow gate). |
| B1-S7 | E1 | Once two modules ship, expected role coverage is 3 to 5 roles under Internal Audit (business_function id 46). Today the function has zero roles. Suggested: `AUDIT-MANAGER`, `AUDIT-DIRECTOR`, `STAFF-AUDITOR`, `AUDIT-COMMITTEE-MEMBER`. | Author 4 `roles` rows scoped to function 46; each gets at least 2 `role_modules` rows once both modules exist; bundle `role_permissions` per Rule #14 derivation. |
| B1-S8 | C2 | Zero `business_function_capabilities` rows for any AUDIT capability. Once capabilities load under B1-S1, every capability whose owning function diverges from Internal Audit (likely `AUDIT-CONTROLS-TESTING` and `AUDIT-REPORTING-COMMITTEE`, both share with Finance / Risk & Compliance) needs an override row. | Author overrides when capabilities load. |
| B1-S9 | regulations | PCAOB AS 2201 (Audit of Internal Control Over Financial Reporting) and IIA Standards (International Standards for the Professional Practice of Internal Auditing) are absent from `regulations` despite being the defining frameworks for external SOX audits and internal-audit practice respectively. | Add 2 `regulations` rows + 2 `domain_regulations` links (mandatory). |
| B1-S10 | B6 | `data_object_relationships` row 294 to 294 with verb `imports` is a self-loop on `audit_findings` whose verb is non-obvious. Likely intent: "finding imports from prior finding" or merge / consolidate. The verb does not match any documented pattern and the row is invisible to all downstream tooling. | Surface the row to user; default is DELETE unless a specific intent (carry-forward findings across engagements) is documented and reauthored with a clearer verb. |
| B1-S11 | B9 | Trigger event 605 (`work_paper.completed`) has zero `handoffs` rows. Either it is a leaf (work-paper completion is internal-only, audit progresses to signed-off via event 606) or it owes a subscriber (ERP-FIN, GRC for evidence locking). Likely a leaf, but the audit must positively justify it. | Confirm leaf status; if confirmed, no fix. If subscriber needed, author handoff row. Default classification: leaf. |
| B1-S12 | B9 | Duplicate trigger events on data_object 294 (`audit_findings`): id 230 `finding.created` and id 349 `audit_finding.created`. Both exist; both fire to GRC (handoffs 254 and 357 respectively). One is canonical, the other is drift from a cluster load. | Surface to user; default is to keep id 230 (matches the unprefixed verb pattern used by 229 `audit_engagement.completed`, 232 `audit_report.issued`), DELETE event 349 after re-pointing handoff 357 to event 230. |

#### B10b BOUNDARY, per-module attribution on handoffs

| ID | Finding | Fix |
|---|---|---|
| B1-B1 | 9 outbound handoffs (254, 255, 256, 257, 258, 592, 593, 594, 595) all have `source_domain_module_id=null`. Once B1-MOD1 lands, run the standard B10b backfill: derive `source_domain_module_id` from the module that holds the event's `data_object_id` with role `master`. Handoff 257 is anomalous: its `data_object_id=47` (`service_incidents`, ITSM-owned) but its `trigger_event.data_object_id=293` (`audit_engagements`, AUDIT-owned). The payload is the receiver's mastered entity; the event is the sender's. | After B1-MOD1, backfill `source_domain_module_id` deterministically. Already correct: handoff 257 has `target_domain_module_id=38` (ITSM module). |
| B1-B2 | 32 inbound handoffs (189, 199, 247, 251, 275, 276, 357, 531, 536, 538, 539, 541, 544, 550, 554, 558, 564, 710, 737, 738, 825, 840, 849, 852, 860, 914, 916, 920, 973, 974, 980, 1029) all have `target_domain_module_id=null`. Once B1-MOD1 lands, derive each from the module that holds the payload `data_object_id` with the strongest role on the receiving (AUDIT) side. For consumer-side payloads not in the AUDIT footprint at all (e.g. `building_certifications` 721, `card_authorizations` 745, `data_lineage_relationships` 301, `rpa_executions` 524), decide first whether to load a `consumer` DMDO on the receiving module or accept the handoff as a domain-level signal. | After B1-MOD1, backfill `target_domain_module_id`. Surface the no-role payloads in Bucket 2 (item Q3). |

#### APQC TAGGING (B1-H1)

| ID | Finding | Fix |
|---|---|---|
| B1-H1 | 10 of 41 cross-domain handoffs are tagged (24% coverage, all `discovery_substring`, all `record_status='new'`). Per the volume expectation (0.5N to 0.8N new tags), the audit owes roughly 16 to 25 new agent-curated tags. 15 agent-curated proposals are listed below; 6 handoffs defer to Discover Pass 3 (no clean PCF anchor). 2 existing `discovery_substring` tags look semantically wrong (handoff 256, 825) and are surfaced in Bucket 2 item 5. | Author 15 `handoff_processes` rows with `proposal_source='agent_curated'`, `record_status='new'`. Defer 6 to Discover Pass 3 custom-process authoring. |

##### Agent-curated proposals (15 rows under B1-H1)

| # | handoff_id | source to target | trigger_event | payload | Proposed PCF row | PCF id | Confidence |
|---|---|---|---|---|---|---|---|
| 1 | 255 | AUDIT to GRC | follow_up_action.closed | follow_up_actions | Remediate control deficiencies | 1496 | confident L4 |
| 2 | 257 | AUDIT to ITSM | audit_engagement.completed | service_incidents | Report audit findings | 389 | confident L3 |
| 3 | 592 | AUDIT to GRC | control_test.deficient | control_tests | Manage internal controls | 61 | confident L2 |
| 4 | 593 | AUDIT to ERP-FIN | control_test.deficient | control_tests | Operate controls and monitor compliance with internal controls policies and procedures | 325 | confident L3 |
| 5 | 594 | AUDIT to GRC | audit_plan.approved | audit_plans | Manage internal audits | 1598 | confident L4 |
| 6 | 595 | AUDIT to ERP-FIN | work_paper.signed_off | work_papers | Support external audits and reports | 1187 | confident L4 |
| 7 | 247 | GRC to AUDIT | audit_issue.created | audit_issues | Report on internal controls compliance | 326 | confident L3 |
| 8 | 539 | ERP-FIN to AUDIT | fixed_asset.disposed | fixed_assets | Audit invoices and key data in AP system | 1433 | confident L4 |
| 9 | 544 | AP-AUTO to AUDIT | invoice_match.manual_override | invoice_matches | Audit invoices and key data in AP system | 1433 | confident L4 |
| 10 | 554 | EXPENSE to AUDIT | expense_line.policy_violation | expense_lines | Audit invoices and key data in AP system | 1433 | likely L4 |
| 11 | 550 | SUP-LIFE to AUDIT | supplier_risk_assessment.completed | supplier_risk_assessments | Manage business unit and function risk | 367 | likely L3 |
| 12 | 558 | SPEND-MGMT to AUDIT | card_authorization.high_value | card_authorizations | Audit invoices and key data in AP system | 1433 | likely L4 |
| 13 | 1029 | LSD to AUDIT | in_house_legal_matter.closed | in_house_legal_matters | Respond to audit inquiries | 1616 | confident L4 |
| 14 | 920 | LEGAL-PRACT-MGMT to AUDIT | court_filing.served | external_court_filings | Respond to audit inquiries | 1616 | likely L4 |
| 15 | 914 | LSD to AUDIT | regulatory_inquiry.received | regulatory_inquiries | Report incidents and risks to regulatory bodies | 199 | confident L3 |

##### Deferred to Discover Pass 3 (custom-process authoring, 6 rows under B1-H1)

| handoff_id | source to target | trigger_event | payload | Deferral reason |
|---|---|---|---|---|
| 275 | ESG to AUDIT | emissions_record.ingested | emissions_records | ESG assurance is a modern audit motion; APQC PCF cross-industry has no clean L3 anchor for emissions-data assurance. Discover Pass 3 candidate: `audit-esg-assurance`. |
| 276 | ESG to AUDIT | esg_disclosure.submitted_for_assurance | esg_disclosures | Same as above; ISSB / ESRS assurance is post-2024 PCF coverage. |
| 710 | DCG to AUDIT | data_lineage_relationship.broken | data_lineage_relationships | Data-lineage assurance is a modern audit motion; no clean PCF anchor. Discover Pass 3 candidate: `audit-data-lineage-assurance`. |
| 849 | DSPM to AUDIT | cloud_database.discovered | cloud_databases | Cloud-asset audit is post-2024 PCF coverage. |
| 737, 738 | RPA to AUDIT | rpa_execution.completed, rpa_activity_log.exception_captured | rpa_executions, rpa_activity_logs | Bot-audit motion (auditing RPA bots) has no PCF anchor. Discover Pass 3 candidate: `audit-rpa-controls`. |

##### Possibly already-tagged-correctly via existing discovery_substring rows

These 10 handoffs already carry a `discovery_substring` proposal. Per Rule #1, none are `approved`. The audit does not re-tag them, but flags two where the existing tag looks suspect and surfaces as Bucket 2:

- Handoff 256 (AUDIT to EPM, `recommendation.accepted`, `audit_recommendations`) currently tagged `Provide warranty-related recommendations` (id 573). This is a substring miss (the matcher grabbed "recommendations" out of a warranty process). Better: id 11185 `Manage remediation efforts` or 11201 `Create remediation plans`. Surface as Bucket 2 Q5.
- Handoff 825 (ECM to AUDIT, `document.retention_expired`, `records_retention_policies`) currently tagged `Document trade` (id 339). Substring miss. Better: a records-retention process (DCG-side) or defer. Surface as Bucket 2 Q5.

### Bucket 2, Surface-for-user (judgment calls)

1. **Module split: 2-module versus 3-module shape.** Proposed default is 2 modules (`AUDIT-PLAN-ENGAGE`, `AUDIT-FINDINGS-REPORTING`). AuditBoard's surface arguably supports a 3-module split (`AUDIT-UNIVERSE-RISK`, `AUDIT-FIELDWORK`, `AUDIT-ISSUES-REPORTING`). 3 modules give cleaner role surfaces (staff auditor versus audit director) but increase the cross-module handoff count from roughly 3 (B9b) to roughly 8. Decide: 2-module (lighter, recommended) or 3-module (cleaner role separation). Independent of Bucket 3.
2. **Scope of audit versus GRC.** Three Bucket 1 entities (`management_responses`, `audit_committee_meetings`, `risk_assessments`) plausibly belong in GRC rather than AUDIT. The vendor surface puts them in audit-focused products, but enterprise-scale buyers run GRC and AUDIT as separate domains and GRC may already master them. Confirm before authoring; this is a placement question, not a load-or-skip question. Independent of Bucket 3.
3. **No-role inbound payloads (B10b sub-decision).** 13 inbound handoffs carry payloads AUDIT does not currently model as DMDO rows (`building_certifications` 721, `card_authorizations` 745, `data_lineage_relationships` 301, `rpa_executions` 524, `rpa_activity_logs` 527, `cloud_databases` 337, `external_court_filings` 738, `emissions_records` 321, `esg_disclosures` 326, `key_data_elements` 496, `critical_tracking_events` 495, `haccp_plans` 507, `supplier_risk_assessments` 730). Options per row: (a) author a `consumer` DMDO on the receiving module (preferred, captures the dependency) (b) accept as a domain-level signal with no module owner (rare). The default (a) means roughly 13 `consumer` DMDOs added. Independent of Bucket 3.
4. **Skill name convention on legacy skill 9.** `audit-system` is kebab-cased; Phase-S convention is snake `<module_code_lower>_agent`. Even before B1-S5's eventual DELETE, decide whether to rename to `audit_agent` as an interim (and then re-allocate to per-module skills) or keep as-is until the per-module skills land. Default: keep until per-module skills replace it. Independent of Bucket 3.
5. **Discovery-substring tag corrections (per APQC TAGGING anti-pattern note).** Handoffs 256 and 825 carry substring-derived tags that look semantically wrong (`Provide warranty-related recommendations` on an audit recommendation, `Document trade` on records retention). Options: (a) DELETE the bad tags and surface to Discover Pass 3 for re-tagging, (b) leave them at `record_status='new'` and let a human reviewer reject during the review pass. Default (a). Independent of Bucket 3.
6. **Pattern flags on `audit_engagements`.** Vendor surface is split: AuditBoard models engagements as edit-lockable post-completion (`has_submit_lock=true`), TeamMate+ allows ongoing edits to engagement metadata. Decide intent. Default: `has_submit_lock=true` aligned with `work_papers` and `audit_findings` lock semantics. Independent of Bucket 3.
7. **Self-loop on `audit_findings` (B1-S10).** The `imports` self-loop is undocumented. Options: (a) DELETE (default), (b) keep as a carry-forward concept and PATCH the verb to `carries_forward_from` or similar. Independent of Bucket 3.
8. **Pairwise reconciliation scope.** AUDIT has 5 neighbors at edge weight 3 or higher: GRC (8), ERP-FIN (8), EPM (3), ESG (3), LSD (3). Plus 11 lighter neighbors (weight 1 to 2). Decide: run the 5-section pairwise diff for all five heavy neighbors inline now, defer pairwise to a follow-up audit, or only run for the two heaviest (GRC, ERP-FIN). Default: defer pairwise to a follow-up audit, ship the structural-and-market findings now. Independent of Bucket 3.
9. **AUDIT as a domain at all.** Audit Management is sometimes folded under GRC as a "sub-module" rather than a peer domain (Archer, ServiceNow IRM treat it that way). The pure-plays (AuditBoard, TeamMate+, Workiva) keep it as a first-class market. Current catalog treats it as a separate domain, which is correct per Rule #2 (3+ independent point-solution vendors). Decide: confirm AUDIT stays as a peer domain (default, recommended) or fold into GRC. Independent of Bucket 3.

### Bucket 3, Phase 0 pending (speculative; vendor-research vetting needed)

Universal-or-near-universal vendor entities surfaced by AuditBoard / Workiva / TeamMate+ / Diligent. Phase 0 vetting would confirm or filter:

| # | Candidate | Proposed module | Vendor evidence |
|---|---|---|---|
| 1 | `audit_questionnaires` | AUDIT-PLAN-ENGAGE | AuditBoard, TeamMate+ (interview prep templates) |
| 2 | `audit_walkthroughs` | AUDIT-PLAN-ENGAGE | TeamMate+, Workiva (process narratives + flowcharts) |
| 3 | `internal_control_narratives` | AUDIT-PLAN-ENGAGE | Workiva (SOX-strong), TeamMate+ |
| 4 | `audit_assertions` | AUDIT-PLAN-ENGAGE | Workiva (financial-assertion strong), TeamMate+ (existence / completeness / accuracy / cutoff / valuation) |
| 5 | `audit_sampling_methods` | AUDIT-PLAN-ENGAGE | TeamMate+ (statistical sampling), config table per audit standard |
| 6 | `audit_time_entries` | AUDIT-PLAN-ENGAGE | AuditBoard, TeamMate+ (audit hours per engagement; chargeback model) |
| 7 | `qar_assessments` | AUDIT-FINDINGS-REPORTING | IIA Standard 1300 Quality Assurance and Improvement Program; AuditBoard, TeamMate+ |
| 8 | `audit_metrics` | AUDIT-FINDINGS-REPORTING | AuditBoard, Workiva (committee-pack KPIs: cycle time, finding aging, plan completion rate) |
| 9 | `engagement_workflows` | AUDIT-PLAN-ENGAGE | All four flagships; configurable per audit-type (operational / financial / IT / compliance) |
| 10 | `auditee_contacts` | AUDIT-PLAN-ENGAGE | AuditBoard, TeamMate+ (audit-specific contact directory distinct from HCM employees) |

### Cross-bucket dependencies

- **B1-MOD1 (Bucket 1) blocks roughly half of Bucket 1.** No `domain_modules` row means B10b backfill (B1-B1, B1-B2) cannot complete, F2 / F3 cannot pass, E1 cannot be authored. Sequence B1-MOD1 first, then load every other Bucket 1 item against the new module ids.
- **Bucket 2 item 1 (2-module versus 3-module) is upstream of B1-MOD1.** The agent's recommendation is 2 modules; the user's decision determines which module each MISSING entity (B1-M1 to B1-M7) and Bucket 3 candidate lands in.
- **Bucket 2 item 2 (audit versus GRC scoping) is upstream of B1-M2, B1-M6, B1-M7.** If `management_responses` etc. belong in GRC, those Bucket 1 items become "GRC audit follow-ups" instead of AUDIT loads.
- **Bucket 3 items 7 and 8 depend on Bucket 2 item 2.** QAR and audit-metrics' module placement depends on the AUDIT-versus-GRC scoping decision.
- **Bucket 3 item 5 (`audit_sampling_methods`) intersects with B1-M5 (`audit_samples`).** If Bucket 3 #5 vets in, it becomes the config table referenced by `audit_samples`; otherwise `audit_samples` carries a `methodology` enum directly.

### Per-bucket prompts

- **Bucket 1.** Approve all? Reply 'all', 'just MOD1 + S1 + S2', 'all except H1' (etc.), or 'skip'. Default sequence on 'all': MOD1, then S1 / S2 / S9 / regulations, then M1 to M7 entities, then S3 to S6 (naming / flags / skill), then S7 (roles), then S10 to S12 (cleanups), then B1 / B2 (B10b backfill, automatic after MOD1), then H1 APQC tagging (15 agent-curated rows plus 6 Discover Pass 3 deferrals).
- **Bucket 2.** What's your call on each of the 9 items? I'll wait per item. Item 1 (module count) is sequenced first because it shapes everything else.
- **Bucket 3.** Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates to treat as confirmed.

### Pass 3, Neighbor discovery

Cross-domain handoff and DMDO edges to other domains, ranked by edge weight. AUDIT's outbound DMDO consumers (`journal_entries` from ERP-FIN, `financial_forecasts` from EPM, `audit_issues` from GRC, `employees` from HCM, `org_units` from HCM, `locations` from IWMS) add edge weight per direct dependency.

| Neighbor | Handoff edges | DMDO edges | Total weight | Pairwise depth (recommended) |
|---|---|---|---|---|
| GRC | 8 (5 out + 3 in) | 1 (consumer of `audit_issues`) | 9 | Full 5-section diff |
| ERP-FIN | 8 (2 out + 6 in) | 1 (consumer of `journal_entries`) | 9 | Full 5-section diff |
| EPM | 3 (1 out + 2 in) | 1 (consumer of `financial_forecasts`) | 4 | Full 5-section diff |
| ESG | 3 (3 in) | 0 | 3 | Full 5-section diff |
| LSD | 3 (3 in) | 0 | 3 | Full 5-section diff |
| HCM | 0 handoffs | 2 (consumer of `employees`, embedded master of `org_units`) | 2 | 1-line summary |
| ERP-FIN, FOOD-TRACE, FSQM, AP-AUTO, EXPENSE, SUP-LIFE, SPEND-MGMT, DCG, RPA, DSPM, RE-CRE, ITSM, TPRM, ECM, LEGAL-PRACT-MGMT, IWMS | 1 or 2 each | varies | 1 to 2 | 1-line summary |

Per Bucket 2 item 8, the pairwise reconciliation for heavy neighbors is **deferred to a follow-up audit run**. Below is the 1-line summary for lighter neighbors and the indicative shape for heavy neighbors.

### Pass 4, Pairwise reconciliation per neighbor

Per Bucket 2 item 8 the deep pairwise diff is deferred to a follow-up audit (no `domain_modules` rows means cross-module attribution can't run yet). Below is the diagnostic snapshot:

| Pair | null_fk on this side | Missing handoffs (catalog implies) | Boundary integrity | Cross-domain rel mirror |
|---|---|---|---|---|
| AUDIT <-> GRC | All 8 (blocked by M1) | None obvious; the audit-to-GRC publish set is dense | OK (B5 passes for `audit_issues` since GRC masters it) | 5 rels present (`audit_findings` to `audit_issues`, `audit_recommendations` to `financial_scenarios`, `control_tests` to `audit_issues`, `audit_plans` to `compliance_controls`, `follow_up_actions` to `audit_issues`). Likely complete. |
| AUDIT <-> ERP-FIN | All 8 (blocked by M1) | None | OK | 9 outbound rels from `audit_findings` to ERP-FIN entities (`journal_entries`, `legal_entities`, `fixed_assets`, `cash_transactions`, `intercompany_transactions`, `invoice_matches`, `accounting_periods`). Complete. |
| AUDIT <-> EPM | All 3 (blocked by M1) | None | OK | 2 outbound rels (`audit_recommendations` to `financial_scenarios`, `audit_findings` to `variance_analyses`, `audit_findings` to `financial_forecasts`). Complete. |
| AUDIT <-> ESG | All 3 (blocked by M1) | None | Inbound payloads not modeled as DMDO (Bucket 2 item 3) | 2 outbound rels (`audit_engagements` to `esg_disclosures`, `audit_plans` to `esg_initiatives`). Complete on outbound side. |
| AUDIT <-> LSD | All 3 (blocked by M1) | None | Inbound payloads not modeled as DMDO (Bucket 2 item 3) | 0 outbound rels (none expected; LSD is publisher) |

Lighter neighbors (weight 1 to 2): all have null_fk on the AUDIT side blocked by M1. No missing handoffs spotted on the structural pass.

### Report-only follow-ups (owed by other domains)

These items the audit identifies but other domains own. They route to those domains' future audits, never to AUDIT's Bucket 1.

- **GRC B10b owes target-side module attribution** on handoffs 247, 251, 840 (AUDIT publishes / receives, GRC is the other side). Once GRC modules are stable, GRC's B10b backfill sets `target_domain_module_id` on these.
- **ERP-FIN B10b owes target-side module attribution** on handoffs 539, 531, 536, 538, 541 (ERP-FIN publishes to AUDIT).
- **ERP-FIN B10b owes source-side module attribution** on handoffs 593, 595 (AUDIT publishes to ERP-FIN; the source side is AUDIT's responsibility, will be fixed in B1-B1 once AUDIT has modules; ERP-FIN owes the `target_domain_module_id`).
- **EPM B9 candidate**: `financial_forecast.refreshed` (handoff 199) already exists, but the symmetric pair `forecast.refreshed` -> AUDIT for variance-review work-paper trigger is not modeled. Surface when EPM is next audited.
- **GRC B8 owes outbound `data_object_relationships` mirrors** on `audit_issues` -> `follow_up_actions` (close direction) and `audit_issues` -> `control_tests` (open direction). The AUDIT side has the 4 owner_side=target rels (B1 already shows them). GRC's B8 owes the `audit_issues` to AUDIT-master mirrors when it's next validated.
- **ESG B10b owes source-side module attribution** on handoffs 275, 276, 852 (ESG publishes to AUDIT). AUDIT side will be fixed in B1-B2 once AUDIT has modules.
- **LSD B10b owes source-side module attribution** on handoffs 914, 916, 1029.
- **All other inbound source domains** (AP-AUTO, EXPENSE, SUP-LIFE, SPEND-MGMT, FOOD-TRACE, FSQM, DCG, RPA, DSPM, RE-CRE, ECM, LEGAL-PRACT-MGMT) owe source-side module attribution on their respective inbound-to-AUDIT handoffs.
- **HCM**: catalog-wide M7 note for the user. `employees` (id 31) has `role='master'` rows at the legacy `domain_data_objects` level for HCM, PAYROLL, IGA, MDM (4 domains). At the `domain_module_data_objects` level only HCM-CORE-WORKER (id 54) holds master, so the deployer / blueprint emitter does not break, but the legacy rollup is incoherent. Routes to HCM / PAYROLL / IGA / MDM future audits.

### Candidates queued (missing domains)

The audit surfaced 1 candidate adjacent market not present in `domains`: **AUDIT-MGMT-PLATFORM-MODERN** is already covered by AUDIT itself, so no new candidate. The Discover-Pass-3 deferrals (`audit-esg-assurance`, `audit-data-lineage-assurance`, `audit-rpa-controls`) are custom-process candidates, not domain candidates. No `append_missing_domain.ts` invocation is required for this audit.

### Decisions

_(empty; user-driven, populated as decisions are made)_

### Fixes applied

_(none; audit is report-only per Rule #1)_

### `domains.notes` pointer (if updated)

_(not yet written; will require user-approved wording per Rule #15)_

## 2026-05-31, Continuation: B1 technical fixes (residual)

Residual-pass loader: [.tmp_deploy/fix_audit_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_audit_b1_technical_2026_05_31.ts).

### Applied

**B1-H1 partial (13 of 15 agent-curated rows).** Inserted 13 `handoff_processes` rows, all `proposal_source='agent_curated'`, `record_status='new'` (DB default per Rule #1). Pre-flight verified all 13 handoffs and all 10 distinct PCF processes exist:

| handoff_id | process_id | PCF activity |
|---|---|---|
| 255 | 1496 | Remediate control deficiencies |
| 257 | 389 | Report audit findings |
| 592 | 61 | Manage internal controls |
| 593 | 325 | Operate controls and monitor compliance with internal controls policies and procedures |
| 594 | 1598 | Manage internal audits |
| 595 | 1187 | Support external audits and reports |
| 247 | 326 | Report on internal controls compliance |
| 539 | 1433 | Audit invoices and key data in AP system |
| 544 | 1433 | Audit invoices and key data in AP system |
| 554 | 1433 | Audit invoices and key data in AP system |
| 550 | 367 | Manage business unit and function risk |
| 558 | 1433 | Audit invoices and key data in AP system |
| 920 | 1616 | Respond to audit inquiries |

H1 coverage moves from 10 / 41 (24%) to 23 / 41 (56%). UI: https://tests.semantius.app/domain_map/handoff_processes.

### Deferred (residual-pass rationale)

- **B1-H1 handoffs 914 (regulatory_inquiry.received) and 1029 (in_house_legal_matter.closed)**: both already carry an `agent_curated` `handoff_processes` row pointing at a *different* `process_id` than the audit's proposal (914 -> 369 versus proposed 199; 1029 -> 373 versus proposed 1616). Overwriting an existing agent-curated tag is a judgment call, not a technical fix. Surface to user.
- **B1-H1 6 deferred-to-Discover-Pass-3 handoffs** (275, 276, 710, 849, 737, 738): no clean PCF anchor; audit explicitly defers to custom-process authoring in Discover Pass 3.
- **B1-MOD1 (modules), B1-S6 (per-module skills), B1-B1 / B1-B2 (B10b backfill)**: blocked by zero `domain_modules` rows on AUDIT. B10b derivation has nothing to derive from until modules ship.
- **B1-M1 through B1-M7 (7 new master data_objects)**: new-entity loads are out of scope for a residual technical pass.
- **B1-S1 (capabilities), B1-S7 (roles), B1-S8 (business_function_capabilities overrides)**: new-entity loads, out of scope.
- **B1-S2 (catalog_tagline / catalog_description)**: Rule #20 requires user review of buyer-voice drafts before write.
- **B1-S3 (naming: `work_papers`, `control_tests` canonical-claim versus rename)**: Rule #9 / Bucket 2 judgment; user picks.
- **B1-S4 (pattern flags on `audit_reports` / `work_papers` / `audit_findings`)**: audit says "Surface to user for sign-off"; not auto-applied.
- **B1-S5 (DELETE legacy skill 9)**: gated on B1-S6 (per-module skills must exist first).
- **B1-S9 (PCAOB AS 2201, IIA Standards regulations)**: instructions allow `domain_regulations` INSERTs only against *existing* regulations rows; neither row exists in `regulations` today (verified: `regulation_name ilike *PCAOB* OR *IIA* OR *AS 2201*` returns 0). Creating new `regulations` rows is a new-entity load, deferred.
- **B1-S10 (self-loop `imports` on `audit_findings`, `data_object_relationships` id=356)**: audit default is DELETE but explicitly says "surface to user"; judgment, not technical.
- **B1-S11 (trigger 605 `work_paper.completed` zero handoffs)**: audit default classification is "leaf"; "Confirm leaf status" is a judgment, not a technical fix.
- **B1-S12 (DELETE duplicate trigger 349, re-point handoff 357)**: stale audit reference; verified both row 349 and row 357 no longer exist in live state (`trigger_events?data_object_id=eq.294` returns only id 230 + id 231; `handoffs?trigger_event_id=eq.349` returns empty). Nothing to delete.
- **Enum backfill candidates (trigger_events 601-606 have empty `event_category`)**: not enumerated as a B1 item by the audit; deferred to a dedicated enum-sweep pass rather than guessed under this scope.
- **`notes=''` reverts**: audit does not name any specific notes-polluted rows; nothing to revert.
- **`data_object_relationships` user-edges (Rule #10), `permission_verb_override`**: audit does not pre-specify any tuples; nothing to insert.
- **Bucket 3 entities (10 candidates)**: Phase 0 vetting, out of scope.

### Counts

- Fixes applied: 13 INSERTs into `handoff_processes`.
- Deferred B1 items: ~22 (counting MOD1, M1-M7, S1-S12, B1, B2, H1 partial, plus stale S12).

No JWT errors. No `notes` writes. Frontmatter unchanged (still `feedback_needed`).
