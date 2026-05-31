# GRC audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** GRC (`id=15`, domain code `GRC`) is loaded with **0 `domain_modules` rows** (hard M1 fail), 10 master `data_objects` (`compliance_risks` 282, `compliance_controls` 283, `control_assessments` 284, `compliance_policies` 285, `policy_attestations` 286, `compliance_obligations` 287, `compliance_evidence` 288, `audit_issues` 289, `remediation_plans` 290, `risk_assessments` 291), 1 cross-domain consumer (`contract_obligations` 67 from CLM), 1 cross-domain `consumer` on employees (31), 1 `embedded_master` on `org_units` (34, canonical master in HCM, B5 OK), 1 linked capability (`COMPLIANCE-TRAIN` 21, owned by LMS), 10 solutions (7 primary, 3 secondary), 5 regulations (SOX, ISO 27001, SOC 2, NIST CSF, EU Whistleblower Directive), 1 business-function owner row (`Governance, Risk and Compliance`, fn_id 31), 12 trigger_events, 10 outbound + 58 inbound cross-domain handoffs, 0 intra-domain handoffs, 1 legacy domain-level system skill (`grc-system`, id 8) with 17 skill_tools, 0 GRC-specific roles in the catalog (the 2 roles tagged with `business_function_id=31` are GRC-REGULATORY-AFFAIRS on PLM-Compliance and GRC-COMPLIANCE-TRAINING-MANAGER on LMS-Compliance-Training, not on any GRC module), 0 `data_object_aliases` rows, 0 `data_object_lifecycle_states` rows, 0 cross-domain `data_object_relationships` rows from GRC masters to neighbor masters (22 relationship rows touch GRC masters but all are inbound-direction from neighbor masters).
- **Vendor-surface basis:** flagship enumerated for the semantic pass: ServiceNow Integrated Risk Management, Archer Suite (formerly RSA Archer), MetricStream Connected GRC, OneTrust GRC, LogicGate Risk Cloud, AuditBoard, Workiva Platform, Riskonnect Platform, MEGA HOPEX, Diligent One Platform.
- **Bucket 1 (in-scope, agent fixable):** 13 items.
- **Bucket 2 (surface-for-user, judgment):** 7 items.
- **Bucket 3 (Phase 0 pending, speculative):** 4 items.
- **Candidates queued to `_missing-domains.md`:** 4 (CRQ, ETHICS-HOTLINE, POLICY-MGMT, REG-CHANGE-MGMT).

Structural pass bands: A1 passes (all 7 domain metadata fields populated); A2 borderline pass (1 capability linked, below typical 5-8 floor); A3 passes (10 solutions, mix of primary/secondary, coverage_level set). **M1 hard-fails (zero modules)** which cascades to M2, M4, M5, M6, M7 (vacuous), E1-E6 (no domain roles can target modules that do not exist), F2-F5 (no module-level system skills can exist without modules), F1 fails (legacy domain-level `grc-system` skill is loaded). **B1 passes** (10 masters), B2 mostly passes (one irregular plural surface), **B3 passes** (no bare-word names, no naming arbitration needed), **B4 fails as routine audit-time re-evaluation** (all flags false-by-default on every master, never positively re-considered), **B5 passes** (embedded_master `org_units` resolves to HCM canonical master), B6 not assessable until modules ship, **B7 hard-fails** (zero `users` edges in either direction across all 10 masters), B8 partial-fails (zero outbound cross-domain relationship rows; only inbound-direction edges exist), **B9 partial-fails** (6 of 12 trigger_events carry empty `event_category` violating Rule #13 enum), B9b vacuously passes (no modules so no module-pair surface to model, but routes into the M-band fix), **B10b hard-fails** (10 outbound handoffs with NULL `source_domain_module_id`, 58 inbound with NULL `target_domain_module_id`), **B11 hard-fails** (zero aliases across 10 masters), **B12 hard-fails** (zero `data_object_lifecycle_states` across all 10 masters), **C1 passes** (1 business_function owner row), C2 fails by report (LMS contributor row on COMPLIANCE-TRAIN exists, the override is in place; the question is whether GRC should own this capability at all, routed to Bucket 2), D1 not assessed (no UI page to spot-check without modules), **E1-E6 all fail** (no GRC-module roles authored), F1 fails (legacy domain-level `grc-system` skill), F2-F5 not assessable until modules ship, F7 fails (1 `send_email` row on the legacy skill_tools without a workflow-specific justification, just generic policy-update notification text), **H1 partial-fails** (10 outbound handoffs, 12 existing tags but ZERO `record_status='approved'`; provenance: 2 `agent_curated`, 9 `discovery_substring`, 1 `discovery_override`; 0 tags on 5 of the 10 outbound handoffs).

Domain Semantius score: computable on the legacy `grc-system` skill only (17/17 platform tools = strict 100%), but F1 requires retirement of that skill once F2 module-level skills exist, so the legacy 100% is not an enduring measure.

#### Neighbor discovery (auto-derived from handoffs + cross-domain DMDO, ranked by edge weight)

| Neighbor | Out | In | DMDO (GRC -> N or N -> GRC) | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| AUDIT | 1 | 4 | 1 (audit_issues consumer in AUDIT) | 6 | 12 | Pairwise (full) |
| LMS | 1 | 4 | 0 | 0 | 5 | Pairwise (full) |
| ITSM | 2 | 0 | 0 | 1 (control.failed -> incidents) | 3 | Pairwise (full) |
| HCM | 1 | 0 | 1 (org_units embedded_master, employees consumer) | 0 | 3 | Pairwise (full) |
| HRSD | 1 | 0 | 0 | 0 | 1 | Lightweight |
| OP-RES | 1 | 0 | 0 | 0 | 1 | Lightweight |
| BCM | 1 | 0 | 0 | 0 | 1 | Lightweight |
| CLM | 0 | 1 | 1 (contract_obligations consumer in GRC) | 1 | 3 | Pairwise (full) |
| SUP-LIFE | 0 | 2 | 0 | 2 (supplier risk escalations) | 4 | Pairwise (full) |
| ERP-FIN | 0 | 2 | 0 | 0 | 2 | Lightweight |
| ESG | 0 | 2 | 0 | 0 | 2 | Lightweight |
| IGA | 0 | 2 | 0 | 0 | 2 | Lightweight |
| REMOTE-ACCESS | 0 | 2 | 0 | 0 | 2 | Lightweight |
| PAYROLL | 0 | 2 | 0 | 0 | 2 | Lightweight |
| BANK-OPS | 0 | 3 | 0 | 0 | 3 | Pairwise (full) |
| FOOD-TRACE | 0 | 2 | 1 (compliance_obligations contributor) | 0 | 3 | Pairwise (full) |
| FSQM | 0 | 2 | 1 (compliance_obligations contributor) | 0 | 3 | Pairwise (full) |
| PS-LIC | 0 | 2 | 0 | 2 (permit + code violations -> obligations / risks) | 4 | Pairwise (full) |
| CLIN-DEV | 0 | 2 | 0 | 2 (device recall + incident -> obligations) | 4 | Pairwise (full) |
| LEGAL-PRACT-MGMT | 0 | 1 | 0 | 0 | 1 | Lightweight |
| (other 22 neighbors with weight 1-2) | | | | | 1-2 | Lightweight |

The dominant cross-domain pattern is that GRC's lack of modularization blocks 58 inbound handoffs from setting their `target_domain_module_id` and silently inflates inbound-edge counts on every neighbor's fact sheet. Modularizing GRC (B1-S1) is the single biggest unlock for the catalog's per-module attribution accuracy.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 hard fail** | **GRC has zero `domain_modules` rows.** Confirmed: `/domain_modules?domain_id=eq.15` returns `[]` and `/domain_module_host_domains?domain_id=eq.15` returns `[]`. Every downstream Phase M / B / E / F band that depends on a module FK collapses on top of this. The market substrate naturally splits into three modules: (a) **GRC-RISK-MGMT** mastering `compliance_risks` + `risk_assessments`, (b) **GRC-COMPLIANCE-MGMT** mastering `compliance_obligations` + `compliance_controls` + `control_assessments` + `compliance_evidence` + `audit_issues` + `remediation_plans`, (c) **GRC-POLICY-ATTESTATION** mastering `compliance_policies` + `policy_attestations`. Three modules satisfies M2 (capability count >= 3 expected after Bucket 3 capability backfill). Each module needs `module_kind='full'`. | Author 3 `domain_modules` rows + `domain_module_data_objects` rows assigning the 10 masters per the split. Load via a focused TypeScript loader pattern. |
| B1-S2 | **M4** | The only linked capability `COMPLIANCE-TRAIN` (id 21) has zero realizing module on the GRC side. M4 cannot pass until either (a) a module realizes it via `domain_module_capabilities`, or (b) the capability is removed from GRC. This entangles with Bucket 2 question B2-5 about whether GRC should own this capability at all. | Resolution depends on B2-5. If GRC keeps the capability, link it to GRC-POLICY-ATTESTATION (closest fit). If LMS owns it cleanly, DELETE the `capability_domains` row for `(domain_id=15, capability_id=21)`. |
| B1-S3 | **B12 hard fail** | Zero `data_object_lifecycle_states` rows exist for any of the 10 GRC masters. Each master has a real workflow (risks: identified -> assessed -> treated -> accepted / mitigated / closed; policies: drafted -> reviewed -> approved -> published -> retired; attestations: required -> completed / waived / expired; obligations: identified -> in-scope -> attested -> evidenced -> closed; controls: defined -> tested -> certified; evidence: submitted -> validated -> accepted / rejected; issues: opened -> in-progress -> closed; remediation_plans: created -> in-progress -> completed -> overdue; risk_assessments: scheduled -> in-progress -> completed; control_assessments: scheduled -> tested -> findings -> closed). All 10 carry state-implying event names already (`compliance_risk.identified`, `compliance_policy.updated`, `policy_attestation.required` / `.completed`, `obligation.overdue`, `assessment.completed`, `compliance_evidence.submitted`, `audit_issue.created`, `remediation_plan.created` / `.overdue`, `compliance_control.passed`, `control.failed`), so the substrate is implicit; lifecycle states need to be authored explicitly. None of the 10 GRC masters fit the config-shape exemption test from Rule #12. | Author lifecycle states for all 10 masters; assign workflow-gate states to the realizing modules per B1-S1's split. Pattern: focused TypeScript loader inserting `data_object_lifecycle_states` rows with `state_order`, `is_initial`, `is_terminal`, `requires_permission`, `permission_verb_override`, and `domain_module_id` set per M5. |
| B1-S4 | **B7 hard fail** | Zero `data_object_relationships` rows exist between `users` (748) and any of the 10 GRC masters in either direction. Every master has clear user-typed actors: risks have an owner; controls have an owner and a tester; policies have an author and an approver; obligations have an accountable owner; evidence has a submitter; remediation_plans have an owner; risk_assessments have an assessor; control_assessments have an assessor; audit_issues have an owner; policy_attestations have an attester. Per Rule #10 these MUST be explicit relationship rows on the `users` (`kind='platform_builtin'`) row. | Author `data_object_relationships` rows in both directions: `users owns <master>` (verb shapes: `owns_risk`, `owns_control`, `authors_policy`, `attests_to_policy`, `owns_obligation`, `submits_evidence`, `owns_remediation_plan`, `conducts_risk_assessment`, `conducts_control_assessment`, `owns_audit_issue`) and the inverse master-side `<master>.owned_by users` shape. Use the existing GRC loader idiom. |
| B1-S5 | **B11 hard fail** | Zero `data_object_aliases` rows exist for any GRC master. The 10 masters all carry cross-vendor synonyms not derivable from the canonical name: `compliance_risks` <-> Risk Issue / Risk Item / Risk Register Entry; `compliance_controls` <-> Control Objective / Safeguard / Control Activity; `control_assessments` <-> Control Test / Control Walkthrough / Continuous Control Monitoring; `compliance_policies` <-> Policy Document / Standard / Procedure; `policy_attestations` <-> Acknowledgement / Sign-off / Affirmation; `compliance_obligations` <-> Requirement / Regulatory Citation / Citation / Control Objective; `compliance_evidence` <-> Evidence Artefact / Evidence Item / Compliance Artifact; `audit_issues` <-> Finding / Observation / Deficiency / Gap; `remediation_plans` <-> Action Plan / Corrective Action / CAPA Plan; `risk_assessments` <-> Risk Review / Risk Analysis. Aliases unlock the cross-vendor terminology layer. | Author `data_object_aliases` rows. Per Rule #18 only the alias_name itself can carry vendor terms; `alias_type` distinguishes statutory / vendor / industry. |
| B1-S6 | **trigger_events.event_category** | 6 of 12 `trigger_events` rows on GRC masters carry empty `event_category` (Rule #13 enum violation): id 922 `policy_attestation.required`, id 923 `policy_attestation.completed`, id 924 `compliance_evidence.submitted`, id 925 `remediation_plan.created`, id 926 `remediation_plan.overdue`, id 921 `compliance_control.passed`. Per the enum the values are `lifecycle / state_change / threshold / signal`. | PATCH each: 922 -> `threshold` (due-date triggered), 923 -> `state_change` (attestation completion), 924 -> `lifecycle` (evidence submission), 925 -> `lifecycle` (plan creation), 926 -> `threshold` (deadline-passed), 921 -> `state_change` (control-test pass). |
| B1-S7 | **F1** | Legacy domain-level system skill `grc-system` (id 8) exists with `domain_module_id=null`. Per F1 it is obsolete once any module-level skill exists. Today no module-level skills exist (because no modules exist), so F1 is in the acceptable transitional state. Once B1-S1 ships modules and B1-S12 authors module-level skills, the legacy row MUST be retired. | DELETE `skills` row id=8 + 17 `skill_tools` rows AFTER B1-S1 and B1-S12 land. Sequenced dependency. |
| B1-S8 | **B10b outbound** | All 10 GRC outbound handoffs (`source_domain_id=15`, ids 247, 248, 249, 250, 251, 252, 253, 840, 841, 842) carry `source_domain_module_id=null`. Until B1-S1 ships, these cannot be backfilled. Once modules exist, each outbound handoff's payload (`data_object_id`) resolves to a single module via the role-strongest rule. | After B1-S1: PATCH each outbound row's `source_domain_module_id` per the module that masters the handoff's payload data_object. Pattern from [scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts](../../../scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts). |
| B1-S9 | **B8 missing outbound relationships** | 10 outbound handoffs but only the inbound-direction cross-domain `data_object_relationships` rows exist (22 rows where a neighbor master points at a GRC master). The catalog has zero rows where a GRC master points at a neighbor master. Outbound handoffs that imply outbound relationships: handoff 248 (`control.failed` -> ITSM service_incidents 47) implies `compliance_controls escalates_to service_incidents`; handoff 841 (`remediation_plan.created` -> ITSM service_incidents 47) implies `remediation_plans triggers service_incidents`; handoff 247 (`audit_issue.created` -> AUDIT findings) implies `audit_issues mirrors audit_findings`; handoff 251 (`obligation.overdue` -> AUDIT) implies `compliance_obligations escalates_to audit_findings`; handoff 252/253 (`assessment.completed` -> OP-RES / BCM) implies `risk_assessments informs operational_resilience_scenarios` / `risk_assessments informs bcm_business_impact_analyses`; handoff 250 (`compliance_policy.updated` -> HRSD policy_attestations) implies the HRSD-target side; handoff 249 (`compliance_policy.updated` -> LMS compliance_assignments) implies `compliance_policies drives compliance_assignments`; handoff 842 (`policy_attestation.required` -> HCM employees) implies `policy_attestations targets employees`. | Author 10 outbound `data_object_relationships` rows (one per outbound handoff). Resolution may need to defer rows whose target-side master is not yet loaded (CLM-Privacy not yet modularized, etc.). |
| B1-S10 | **B2 plural label** | `compliance_evidence` (288) carries `singular_label='Compliance Evidence'` and `plural_label='Compliance Evidences'`. "Evidences" is grammatically valid (the plural of "evidence" when treated as a count noun) but jars against the catalog norm of mass-noun "evidence" (Workiva, OneTrust, MetricStream all use the singular form for the catalog item). Audit decision: confirm whether the plural should stay as-is (matches the master-record-per-artefact intent of the data_object) or normalize to "Evidence Artefacts" / "Evidence Items". | PATCH `data_objects.id=288.plural_label` per the decision. Default recommendation: leave as `Compliance Evidences` (it is a count of artefact rows and the catalog convention is plural-noun labels). |
| B1-S11 | **F7** | `skill_tools` row on legacy skill 8 linking `send_email` (tool 37) carries notes "Policy-update re-attestation notifications (Semantius can drive via in-app workflow instead)". This is the generic-notification anti-pattern F7 rejects; the workflow does not require email specifically. Per F7 the row should be PATCHed to `notify_person`. Since B1-S7 will retire the legacy skill once B1-S12 authors module-level skills, this finding is preempted by the F1 retirement, but the same pattern (`send_email` over `notify_person`) MUST NOT recur in the module-level skill drafts. | (a) DELETE the `send_email` link via the F1 retirement (B1-S7), and (b) draft the module-level skills (B1-S12) to use `notify_person`. |
| B1-S12 | **F2 / F3 / F4 / F5** | Once B1-S1 ships 3 modules, exactly 3 `skill_type='system'` skills MUST exist (one per module) each with >= 5 `skill_tools` rows. Floors: each skill needs >= 1 `query_*` tool per mastered data_object plus >= 1 `mutate_*` for the module's primary lifecycle gate plus optional integration tools (notify_person for attestation reminders, integration tool for SOX evidence push, etc.). Tool `operation_kind` invariants per F4 (`query` / `mutate` require `data_object_id`; `side_effect` / `compute` must NOT have one). | Author 3 `skills` rows with `skill_type='system'`, `domain_module_id` set per the split + per-module `tools` + `skill_tools` rows. Sequenced after B1-S1. |
| B1-S13 | **E1 / E2 / E3 / E4 / E5** | Once B1-S1 ships, the GRC module set needs >= 3 distinct roles with the 2-module floor satisfied. The 2 roles tagged with `business_function_id=31` today (`GRC-REGULATORY-AFFAIRS` 10035 on PLM-Compliance, `GRC-COMPLIANCE-TRAINING-MANAGER` 10038 on LMS-Compliance-Training) do NOT touch any GRC module (because no GRC modules exist) so they do not satisfy E2 for the GRC domain. Personas to author: `RISK-MANAGER` (RISK-MGMT primary, COMPLIANCE-MGMT secondary), `COMPLIANCE-OFFICER` (COMPLIANCE-MGMT primary, POLICY-ATTESTATION secondary, RISK-MGMT secondary), `POLICY-OWNER` (POLICY-ATTESTATION primary, COMPLIANCE-MGMT secondary), `CONTROL-OWNER` (COMPLIANCE-MGMT primary, RISK-MGMT secondary), `ATTESTATION-CAMPAIGN-MGR` (POLICY-ATTESTATION primary, COMPLIANCE-MGMT secondary, optionally LMS as cross-functional touch). Each role: >=4 `role_modules` rows total across the 2-module floor + permission bundle of 4-8 entries. | Author 4-5 role rows + `role_modules` + `role_permissions`. Sequenced after B1-S1 and B1-S12 (so workflow-gate permissions exist to bundle). |

#### APQC TAGGING (Bucket 1, single line per audit run)

10 GRC outbound handoffs, 12 existing tags but **zero `record_status='approved'`** (the headline coverage measure). Provenance: 2 `agent_curated`, 9 `discovery_substring`, 1 `discovery_override`. Five outbound handoffs have zero tags. Per the volume expectation (0.5N to 0.8N for N=10), expect 5 to 8 new `agent_curated` tags from this audit.

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | Confidence |
|---|---|---|---|---|---|---|
| 247 | GRC -> AUDIT | `audit_issue.created` | `audit_issues` | Manage Enterprise Risk, Compliance, Remediation, and Resiliency, child Manage findings and remediation | needs PCF lookup at fix time; existing discovery row on handoff 254 points at "Report audit findings" 11043, candidate same | confident L3 |
| 248 | GRC -> ITSM | `control.failed` | `service_incidents` | Manage IT incidents, 10570 child; existing discovery_substring on 248 / 840 already points at "Manage internal controls" 10735 which fits the source side better than the target side | reuse 10735 OR refine to 10570 child | confident L2 |
| 249 | GRC -> LMS | `compliance_policy.updated` | `policy_attestations` | Develop and manage employees (10535) family, child Deliver employee compliance training | needs PCF lookup | confident L3 |
| 250 | GRC -> HRSD | `compliance_policy.updated` | `policy_attestations` | Manage employee inquiries and case management (10571 family), or Deliver policy compliance to employees | needs PCF lookup | confident L3 |
| 251 | GRC -> AUDIT | `obligation.overdue` | `compliance_obligations` | Existing discovery_substring on 251 already points at "Evaluate enterprise regulatory and compliance obligations" 20722, well-fitted | confirm 20722 (promote to agent_curated) | confident L4 |
| 252 | GRC -> OP-RES | `assessment.completed` | `risk_assessments` | Existing discovery_substring on 252 / 253 points at "Conduct and analyze IT compliance assessments" 20743, an OK fit but L3 parent "Conduct enterprise compliance" or "Manage enterprise risk" preferred | refine to L2/L3 parent | confident L3 |
| 253 | GRC -> BCM | `assessment.completed` | `compliance_risks` | Same family as 252; payload diverges (risks vs assessments) but the PCF parent is the same | reuse same | confident L3 |
| 840 | GRC -> AUDIT | `control.failed` | `compliance_controls` | Existing discovery_substring already points at "Manage internal controls" 10735, good fit | confirm 10735 | confident L2 |
| 841 | GRC -> ITSM | `remediation_plan.created` | `service_incidents` | Existing discovery_substring on 841 points at "Create remediation plans" 11201, a good direct fit; consider parent "Manage IT change" if remediation is implemented via change | confirm 11201 | confident L3 |
| 842 | GRC -> HCM | `policy_attestation.required` | `policy_attestations` | "Develop and manage employees" family, child for policy attestation; no clean L4 match, candidate L3 parent acceptable | needs PCF lookup; defer to Discover Pass 3 if no clean L3 fit | needs lookup |

Inbound handoffs are **report-only** (the source domains' B9 / H1 owe outbound tags on their own audits). 58 inbound handoffs route to 39 distinct source domains' H1 work.

#### Finding-type sub-tally

| Finding type | Count |
| --- | --- |
| MISSING (entity gap) | 0 (routed to Bucket 3) |
| WRONG-OWNERSHIP | 0 (routed to Bucket 3) |
| SCOPE-CREEP | 0 (routed to Bucket 3) |
| STRUCTURAL (S/A/M/B/C/E/F band failures) | 12 (B1-S1 through B1-S13 minus the APQC line) |
| BOUNDARY (NULL FK or missing handoff) | counted within STRUCTURAL above (B1-S8, B1-S9) |
| APQC TAGGING | 1 (single Bucket 1 line covering 10 outbound handoffs; ~7 high-confidence tags + 3 deferred to Discover) |
| **Bucket 1 total** | **13** |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent cannot answer | Options |
|---|---|---|---|
| B2-1 | **Rule #15 notes pollution on `domain_data_objects`.** All 11 `domain_data_objects` rows for GRC carry populated `notes` text restating role / necessity / co-mastering intent ("Enterprise risk register (single-master v1; multi-master with OP-RES/TPRM/SECOPS/PRIV-MGMT deferred to follow-up)", "Control definitions", "Control ownership, risk scoping, and policy attestation all follow the org tree; GRC local-masters when no HCM is present.", etc.). Per Rule #15 these are the kind of mechanical / restated-schema annotations the rule rescinds. Were these user-approved at load time or auto-populated? | Cannot tell from audit alone. | (a) Confirm user-approved, leave in place. (b) Confirm auto-population, PATCH all 11 rows to empty string and log the Rule-#15 incident in `references/skill-changelog.md`. |
| B2-2 | **Rule #15 notes pollution on `skill_tools`.** 4 of 17 skill_tools rows on legacy skill `grc-system` carry populated notes ("Consumer from CLM", "For policy-attestation targeting", "Fires on control.failed -> ITSM handoff", "Policy-update re-attestation notifications (Semantius can drive via in-app workflow instead)"). The F7 line "Policy-update re-attestation notifications" also flags this row as the F7 anti-pattern (B1-S11). | Same as B2-1, plus the legacy skill is being retired in B1-S7 anyway, so the notes-revert may be moot. | (a) Auto-population confirmed, PATCH to empty string and log the incident, then proceed with B1-S7 retirement. (b) Leave them, retirement under B1-S7 deletes the rows anyway. |
| B2-3 | **Rule #15 notes pollution on inbound `handoffs`.** Two inbound rows carry the explicit "target NULL until GRC is modularized" provenance trailer (handoff 634 from ITAM, handoff 1195 from APM), and several more carry workflow-shape context that is not user-approved wording ("Companion to handoff 416", "Multi-shape: cross-vendor-stack + alert-without-feedback", "Probabilistic-to-deterministic: risk scoring is heuristic", "Shape: leaver / cancellation recall", "Period/cycle-close coupling", "One event, many subscribers: AUDIT and GRC subscribe to the same journal_entry.posted event with different downstream effects", "Companion to handoff 416 (PAYROLL -> HRSD)", "Fan-out arm of `recall_event.initiated`, the GRC side handles regulatory reporting", "DOT-audit-relevant; missing violations can trigger CSA score downgrade"). The "target NULL until GRC is modularized" trailer is the explicitly forbidden pattern from Rule #15. | Same load-time approval question, but the source-domain B9 owner (ITAM, APM, REMOTE-ACCESS, ERP-FIN, etc.) owns these rows, not GRC. Cross-domain notes revert is owed by source-domain audits. | (a) Strictly report-only; flag in the report-only follow-ups section to be addressed when each source domain is audited. (b) Surgical PATCH of the 2 "target NULL until GRC is modularized" trailers now (they specifically restate the structural state about to be fixed by B1-S1) and defer the rest. Default: (a). |
| B2-4 | **B4 pattern flag re-evaluation.** All 10 GRC masters carry every flag false. Audit-time re-evaluation per Rule #12 must positively consider each flag. Candidates: `compliance_policies.has_submit_lock=true` (policies should freeze at `published` so attestations point at an immutable version), `policy_attestations.has_single_approver=true` (the user themselves attest, no separate approver, but the attestation submit-locks once recorded), `policy_attestations.has_submit_lock=true`, `compliance_evidence.has_submit_lock=true` (submitted evidence is immutable for audit-trail reasons), `compliance_evidence.has_personal_content=true` (evidence often includes PII screenshots / employee names in attestation records), `risk_assessments.has_submit_lock=true` (a quarterly assessment must be immutable once recorded), `control_assessments.has_submit_lock=true`, `audit_issues.has_single_approver=true` (closure requires one signoff), `remediation_plans.has_single_approver=true` (closure signoff), `compliance_risks.has_personal_content=true` (risk owners are users), `compliance_controls.has_personal_content=true` (control owners are users), `compliance_obligations.has_personal_content=true` (accountable owners are users). | Pattern flags are workflow-shape judgments the user owns; recording the consideration in `notes` is forbidden per Rule #15. | Per-flag yes/no answers. Decisions captured below. |
| B2-5 | **COMPLIANCE-TRAIN capability ownership.** The single capability linked to GRC is `COMPLIANCE-TRAIN` (21, `Compliance Training`), with LMS as `contributor` on the business_function_capabilities row. None of the flagship GRC vendors (ServiceNow IRM, Archer, MetricStream, OneTrust GRC, AuditBoard, Workiva, Riskonnect, LogicGate, MEGA HOPEX, Diligent) primarily own training delivery; they all integrate with LMS. Compliance Training is fundamentally an LMS capability that GRC consumes as evidence (the policy_attestation completion record is the GRC-side artifact). | This is a domain-ownership policy decision, not a structural one. | (a) Keep COMPLIANCE-TRAIN on GRC as a contributor capability (loaded module realizes it). (b) Move COMPLIANCE-TRAIN exclusively to LMS, DELETE the `capability_domains` row for `(domain_id=15, capability_id=21)`, GRC ends up with the capabilities it ACTUALLY masters (RISK-MGMT, POLICY-MGMT, CONTROL-MGMT, EVIDENCE-MGMT, OBLIGATION-MGMT, ATTESTATION, REMEDIATION, etc. authored in Bucket 3). Default: (b), but (b) hinges on Bucket 3 capability authoring landing first. |
| B2-6 | **Multi-master deferral on `compliance_risks`.** The current notes column on `domain_data_objects` for `compliance_risks` states "single-master v1; multi-master with OP-RES/TPRM/SECOPS/PRIV-MGMT deferred to follow-up". This is an architectural design intent that has not been explicitly approved. M7 today passes (only one `master` row). The 4 candidate co-masters: OP-RES (Operational Resilience risks), TPRM (vendor / third-party risks), SECOPS (cyber risks), PRIV-MGMT (privacy risks). Each is a real separate concept in their respective vendor surfaces. The catalog-level choice: (i) keep single-master with GRC as the canonical risk register and each adjacent domain consumes via embedded_master, or (ii) promote each adjacent domain's risk slice to its own data_object (cyber_risks, supplier_risks, operational_risks, privacy_risks) consumed by GRC, or (iii) embrace true multi-master per autonomous deployable units. Different vendor stacks model this differently (ServiceNow IRM v Archer GRC v MetricStream all unify; OneTrust splits Privacy Risk; Bitsight / RiskLens split Cyber Risk via CRQ which is now a queued candidate). | Architectural intent question with multi-domain blast radius. | (a) Keep single-master, GRC stays canonical. (b) Move to per-adjacent-domain risk slices via separate data_objects (largest refactor; affects 4 neighbor audits). (c) Promote `compliance_risks` to a `master` package whose adjacent domains hold `master` rows of slice data_objects (separates concerns cleanly). Default: (a) until the 4 neighbor audits land. |
| B2-7 | **GRC-domain role authoring.** The 2 roles currently tagged with `business_function_id=31` (GRC) target other modules' compliance surfaces, not GRC's own modules. Should they stay with their current business_function tagging (they are arguably reporting into GRC's accountability tree even when working on LMS / PLM modules) or be re-tagged to LMS / PLM? Independently, does GRC need ~5 new persona roles (RISK-MANAGER, COMPLIANCE-OFFICER, POLICY-OWNER, CONTROL-OWNER, ATTESTATION-CAMPAIGN-MGR) as proposed in B1-S13? | RBAC editorial / RACI design call. | (a) Leave the 2 cross-functional roles tagged with GRC business function (they ARE compliance roles even when operating on LMS / PLM modules), author 5 new GRC-module roles per B1-S13. (b) Re-tag the 2 cross-functional roles to LMS / PLM, GRC's role inventory restarts from zero per B1-S13's set. Default: (a). |

### Bucket 3, Phase 0 pending (speculative)

The semantic pass against flagship vendors surfaced four kinds of substrate gap that need formal Phase 0 vetting before any load.

#### Bucket 3 items

| ID | Category | Finding | Notes |
|---|---|---|---|
| B3-1 | MISSING entities | Vendor-substrate likely-missing masters across the 10 flagship vendors: `risk_treatments` (every flagship has a risk treatment record separate from the risk itself; Archer / ServiceNow IRM / MetricStream all have it), `control_libraries` and `risk_libraries` (template / framework reference data; LogicGate / OneTrust / AuditBoard all have it), `kri_metrics` (key risk indicators; Archer / Riskonnect / ServiceNow IRM), `control_tests` distinct from `control_assessments` (the exercise-time test record vs the continuous assessment record; AuditBoard / Workiva), `gap_assessments` (framework-coverage gap analysis; OneTrust / LogicGate), `audit_findings` v `audit_issues` distinction (AuditBoard, Workiva), `disclosure_filings` (Workiva's flagship surface), `risk_appetite_statements` (Archer / Riskonnect / MEGA HOPEX), `regulatory_change_events` (overlaps with the queued REG-CHANGE-MGMT candidate), `policy_exceptions` (NAVEX / OneTrust / MetricStream). | Phase 0 vendor research per Discover Pass 1 procedure. Substrate is wide; trim per relevance after vendor study. |
| B3-2 | MODULARIZATION | Proposed split for B1-S1: 3 full modules (GRC-RISK-MGMT, GRC-COMPLIANCE-MGMT, GRC-POLICY-ATTESTATION) with the mapping in B1-S1. Alternative splits: (a) 2-module (RISK / COMPLIANCE-AND-POLICY combined), (b) 4-module (RISK / COMPLIANCE / POLICY / EVIDENCE-AND-AUDIT). The choice affects which masters travel where and downstream Phase E permission scope. The 3-module split is the cleanest mirror of the flagship taxonomy (ServiceNow IRM splits Risk Management, Policy and Compliance, Audit Management; MetricStream splits Risk, Compliance, Policy, Internal Audit; OneTrust GRC splits Risk, Compliance, Policy, Vendor Risk; Riskonnect splits Risk, Compliance, Policy / Procedure, Internal Audit). | Vet via Phase 0 with the proposed 3-module split as the candidate. Each alternative needs its own module-level lifecycle / permission story. |
| B3-3 | WRONG-OWNERSHIP candidate | `audit_issues` (289): is this GRC's mastery or AUDIT's? The existing notes say "GRC issue register; receives AUDIT findings via handoff" which is the current single-master story. The four flagship GRC vendors all carry an Issues / Findings master; the four flagship Audit vendors (AuditBoard, Workiva, Diligent, MEGA) also carry one. Some catalogs (ServiceNow) merge them; others (Workiva, AuditBoard) split AUDIT.findings from GRC.issues. Vet which side master should land. | Phase 0 + cross-domain audit pairing with AUDIT. May result in slice-split: AUDIT masters `audit_findings`, GRC masters `audit_issues` (the corrective-action register), edge between them. |
| B3-4 | Candidates queued (separate from this audit's body) | 4 new domain candidates surfaced to `_missing-domains.md` for triage: `CRQ` (Cyber Risk Quantification, Bitsight / SecurityScorecard / RiskLens / Kovrr / Safe Security / X-Analytics), `ETHICS-HOTLINE` (NAVEX EthicsPoint / OneTrust Ethics / Convercent / Whispli / Speakfully / EQS Integrity Line), `POLICY-MGMT` (NAVEX PolicyTech / OneTrust Policy / ConvergePoint / MetricStream Policy / PowerDMS / Mitratech PolicyHub), `REG-CHANGE-MGMT` (Thomson Reuters Reg Intelligence / Wolters Kluwer OneSumX / RegEd / Compliance.ai / Ascent RegTech). Each passed the point-solution-market test on enumeration; final triage is human. | None of these are loaded as GRC sub-modules in this audit. The queue is the canonical record. |

### Cross-bucket dependencies

- **B1-S1 (modularization) is the prerequisite** for B1-S7, B1-S8, B1-S11, B1-S12, B1-S13. Until the 3 modules land, the F-band cannot be authored, the E-band cannot be authored, the legacy skill cannot be retired, the B10b backfill cannot run.
- **B2-5 (COMPLIANCE-TRAIN ownership) blocks B1-S2 (M4 resolution).** If the user keeps the capability, link it; if not, DELETE the capability_domains row. The same answer also affects what capabilities Bucket 3 needs to author for GRC.
- **B2-6 (multi-master deferral on `compliance_risks`) is independent of Bucket 3 in the near term** but the full resolution depends on the 4 neighbor audits (OP-RES, TPRM, SECOPS, PRIV-MGMT) producing their own risk substrate.
- **B3-2 (modularization choice) feeds B1-S1.** If the user picks a 2-module or 4-module split instead of the proposed 3-module, the entity-to-module assignment in B1-S1 changes.
- **B3-3 (audit_issues ownership) is dependent on AUDIT's audit.** Resolution may flip B1-S8's outbound relationship row design.
- **Buckets 2 and 3 are otherwise independent** of each other; you can resolve them in any order beyond the dependencies named above.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S1, S3, S6`), or `skip`. Note the sequence: S1 must land before S7, S8, S11, S12, S13 can ship; S6 and S10 are independent and can ship at any time; S2 is dependent on B2-5.

**Bucket 2, what's your call on each?** Per-item decision needed. For B2-1, B2-2, B2-3 the question is "auto-populated or user-approved at load time?". For B2-4 the per-flag yes/no per master. For B2-5 the (a)/(b) call on COMPLIANCE-TRAIN. For B2-6 the (a)/(b)/(c) call on `compliance_risks` multi-master. For B2-7 the (a)/(b) call on role tagging.

**Bucket 3, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball, name which substrate gaps from B3-1 ring true, which modularization shape from B3-2 you accept, and which side of the B3-3 split you prefer. The 4 queued candidates in `_missing-domains.md` triage independently.

### Report-only follow-ups (owed by other domains)

| Domain | Owed | Detail |
|---|---|---|
| AUDIT | H1 outbound APQC tags | 4 inbound handoffs into GRC originate from AUDIT (`audit_findings.created`, `control_test.deficient`, `audit_plan.approved`, `follow_up_action.closed`). Each needs `agent_curated` APQC tags from AUDIT's audit, none exist today on the inbound side. |
| LMS | H1 outbound APQC tags + B10b source_domain_module_id check | 4 inbound from LMS (`compliance_assignment.overdue`, `compliance_assignment.completed`, `compliance_assignment.expired`, `compliance_assignment.due`, `training_evidence_record.submitted`). LMS has `source_domain_module_id=33` set, so B10b source side is OK; only H1 / APQC is owed. |
| ITAM | Rule #15 notes revert | Handoff 634 carries the legacy "target NULL until GRC is modularized" trailer. ITAM B-band owes the revert (once GRC is modularized in B1-S1, the target side is also fixable from this side). |
| APM | Rule #15 notes revert | Handoff 1195 carries the legacy "target NULL until target domain is modularized" trailer. APM B-band owes the revert. |
| All 39 source domains with inbound handoffs into GRC | B10b target_domain_module_id backfill | 58 inbound handoffs into GRC currently have NULL `target_domain_module_id`. After B1-S1 ships GRC modules, the 58 rows can be backfilled. The target-side BACKFILL is the audited-side of each handoff: per B10b's asymmetry rule, the row owner is determined by which side's module FK is the null. For inbound rows, the source domain owns NULL target backfill (since they own the row's authoring), but the GRC audit can also surface a deterministic candidate per row once GRC has modules. |
| HCM | DMDO declaration | HCM masters `employees` (31) which GRC consumes; HCM should also have a `consumer` DMDO row on `policy_attestations` (286) since handoff 842 targets HCM with `policy_attestation.required` payload. M7 pairwise miss. |
| AUDIT | DMDO declaration | AUDIT masters several entities that GRC handoffs into (`audit_findings`, `audit_plans`, `control_tests`, `follow_up_actions`). AUDIT does not declare a consumer DMDO on `audit_issues` (289, GRC-mastered) despite receiving handoffs 247 and 251. AUDIT's b1 audit owes the DMDO. |
| OP-RES / BCM / ITSM / HRSD | DMDO declarations | Each receives GRC outbound handoffs but does not declare a `consumer` DMDO on the relevant GRC master (`risk_assessments`, `compliance_risks`, `compliance_controls`, `compliance_policies`). Each domain's b1 audit owes the DMDO row. |
| ITSM | B10b target backfill | Handoffs 248, 841 both have `target_domain_module_id=38` set (ITSM-Incident-Mgmt), so this is OK. |
| LMS | B10b target backfill | Handoff 249 has `target_domain_module_id=33` set. OK. |
| HRSD | B10b target backfill | Handoff 250 has `target_domain_module_id=75` set. OK. |

## 2026-05-31, Continuation: B1 technical fixes

Subagent pass to apply the truly-technical subset of the B1 bucket from the 2026-05-30 audit. Loader: [.tmp_deploy/fix_grc_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_grc_b1_technical_2026_05_31.ts). Run from project root (`c:/dev/domain-map`) so `semantius` reads the correct `.env`. All writes idempotent.

### Applied

- **B1-S6 (trigger_events.event_category enum backfill)**: 6 PATCHes against ids 921-926. Mapping per audit: 921 `compliance_control.passed` -> `state_change`; 922 `policy_attestation.required` -> `threshold`; 923 `policy_attestation.completed` -> `state_change`; 924 `compliance_evidence.submitted` -> `lifecycle`; 925 `remediation_plan.created` -> `lifecycle`; 926 `remediation_plan.overdue` -> `threshold`. **B9 enum violation cleared on the 6 named rows.**
- **B1-S4 (Rule #10 users edges)**: 20 INSERTs on `data_object_relationships` (10 GRC masters x 2 directions). New ids 1622-1641. Audit pre-specified the verb shapes per master; inserts mirror the catalog convention (user-as-source row with `one_to_many` + `reference` + `is_required=false`; master-as-source row with `many_to_many` + `reference` + `is_required=true`, `owner_side='source'` in both cases, matching existing user-edges). **B7 hard-fail cleared.**

### Deferred (out of scope for this technical pass, 11 items)

- **B1-S1** (modularization): new `domain_modules` entities; also gated on B2-5 (COMPLIANCE-TRAIN ownership) and B3-2 (user picks 2 vs 3 vs 4 modules).
- **B1-S2** (M4 capability link): gated on B2-5.
- **B1-S3** (B12 lifecycle states): depends on B1-S1 modules.
- **B1-S5** (B11 aliases): bulk `data_object_aliases` not pre-specified as exact tuples; needs user-approved per-row strings per Rule #15 boundary.
- **B1-S7** (F1 retire legacy skill): explicitly sequenced after B1-S1 and B1-S12.
- **B1-S8** (B10b outbound FK): not derivable from existing modules (GRC has zero modules).
- **B1-S9** (B8 outbound rels): targets not user-edges in the Rule #10 sense; several targets unresolvable until neighbor domains modularize.
- **B1-S10** (B2 plural label `Compliance Evidences`): "default recommendation" requires user pick between leave-as-is and rename.
- **B1-S11** (F7 send_email PATCH): audit says preempted by F1 retirement (deferred B1-S7).
- **B1-S12** (F2-F5 module skills): depends on B1-S1.
- **B1-S13** (E1-E6 roles): depends on B1-S1 and B1-S12.

Bucket 1 status after this pass: **2 of 13 fixes applied (B1-S6, B1-S4)**, 11 deferred pending user decisions, modularization, or other entity creation. Bucket 2 and Bucket 3 unchanged.

No JWT errors. No Rule #15 writes (no `notes` columns touched). No vendor names introduced (the new relationship rows carry only generic role nouns).

## 2026-05-31, Audit

### Summary

- **Current footprint:** GRC (`id=15`) carries 10 master `data_objects` (`compliance_risks` 282, `compliance_controls` 283, `control_assessments` 284, `compliance_policies` 285, `policy_attestations` 286, `compliance_obligations` 287, `compliance_evidence` 288, `audit_issues` 289, `remediation_plans` 290, `risk_assessments` 291), 1 cross-domain consumer (`contract_obligations` 67 from CLM), 1 cross-domain consumer (`employees` 31), 1 `embedded_master` on `org_units` (34), 1 capability link (`COMPLIANCE-TRAIN` 21), 10 solutions, 12 trigger_events (all `event_category` now populated post-B1-S6), 10 outbound and 60 inbound cross-domain handoffs, 22 user-edge `data_object_relationships` rows (ids 1622-1641 plus 1822-1823) authored on the 2026-05-31 continuation, the legacy domain-level system skill `grc-system` (id 8) with 17 `skill_tools` rows. Zero `domain_modules` rows, zero `data_object_lifecycle_states` rows, zero `data_object_aliases` rows, zero GRC-module roles. Two `business_function_id=31` roles target other modules (PLM-Compliance, LMS-Compliance-Training), not GRC's own modules.
- **Structural pass bands.** A1 pass (all 7 domain metadata fields populated), A2 borderline (1 capability, below typical floor of 3+), A3 pass (10 solutions, mix of coverage levels). **M1 hard-fail (0 modules)** cascading M2/M4/M5/M6/M7 vacuous. **B1 pass** (10 masters), B2 borderline (`compliance_evidence` retains plural `Compliance Evidences`, B1-S10 still open), B3 pass, **B4 fail** (all pattern flags false-by-default on all 10 masters, not positively re-evaluated), B5 pass (org_units canonical master in HCM), B7 **pass** (B1-S4 user edges applied, 22 rows authored), **B9 pass** (12/12 trigger_events have a valid `event_category` post-B1-S6 backfill), B9b vacuous (no modules to pair), **B10b hard-fail** (10/10 outbound rows with NULL `source_domain_module_id`; report-only inbound: 56/60 inbound rows with NULL `target_domain_module_id`), **B11 hard-fail** (0 aliases across 10 masters), **B12 hard-fail** (0 lifecycle states across 10 masters), C1 pass, C2 routed to Bucket 2 (COMPLIANCE-TRAIN ownership), D1 not assessable. **E1-E6 fail** (no GRC-module roles), **F1 fail** (legacy `grc-system` skill still loaded with `domain_module_id=null`, transitional state until B1-S1 + B1-S12 land), F2-F5 not assessable (no modules), F7 fail (1 `send_email` row on legacy skill_tools, id 92).
- **Validate b1 deltas vs 2026-05-30 audit:** B9 was partial-fail (6/12 missing categories); after B1-S6 backfill, all 12 trigger_events now carry valid categories, B9 passes. B7 was hard-fail (0 user edges); after B1-S4 load, 20 new rows on `data_object_relationships` (1622-1641) plus 2 pre-existing edges on 287 (1822, 1823), B7 passes. All other bands unchanged from 2026-05-30 audit.
- **Bucket counts:** 1 (in-scope, agent fixable) **11**, 2 (surface-for-user) **7**, 3 (Phase 0 pending) **4**.
- **APQC TAGGING coverage:** 8 of 10 outbound handoffs carry a `handoff_processes` tag (handoffs 247, 248, 249, 250, 251, 252, 253, 840, 841 covered; 249 and 842 still untagged). All 8 tags are `record_status='new'`; 0 approved. Provenance: 6 `discovery_substring`, 2 `agent_curated`. H1 quality headline: 0 approved.

### Bucket 1, In-scope confirmed gaps (carried forward, less B1-S6 and B1-S4 which landed)

| ID | Band | Finding | Fix surface |
|---|---|---|---|
| B1-S1 | **M1 hard fail** | GRC has zero `domain_modules`. Proposed 3-module split: GRC-RISK-MGMT (282, 291), GRC-COMPLIANCE-MGMT (283, 284, 287, 288, 289, 290), GRC-POLICY-ATTESTATION (285, 286). Modularization choice itself is B3-2 (Bucket 3 chooses split shape; default 3-module). | Author 3 `domain_modules` rows + 10 `domain_module_data_objects` after B3-2 / B2-5 land. |
| B1-S2 | **M4** | The only linked capability `COMPLIANCE-TRAIN` (21) has no realizing module. Blocked by B2-5. | Either link to GRC-POLICY-ATTESTATION or DELETE the `capability_domains` row (15, 21). |
| B1-S3 | **B12 hard fail** | 0 lifecycle states on 10 GRC masters. Per Rule #12 each is workflow-bearing. | TypeScript loader inserting `data_object_lifecycle_states` rows with `domain_module_id` set per the B1-S1 split. Blocked by B1-S1. |
| B1-S5 | **B11 hard fail** | 0 `data_object_aliases` rows across 10 masters. Cross-vendor terminology gap (Finding/Observation/Deficiency for audit_issues; Acknowledgement/Sign-off for policy_attestations; etc.). | Author per-row, exact `alias_name` strings to user-approve. |
| B1-S7 | **F1** | Legacy domain-level `grc-system` skill (id 8) + 17 `skill_tools`. Acceptable transitional state until module-level skills exist. Retire after B1-S1 + B1-S12. | DELETE skill 8 + cascading skill_tools rows. |
| B1-S8 | **B10b outbound** | 10/10 outbound handoffs (ids 247-253, 840-842) carry NULL `source_domain_module_id`. Backfill the FK per the payload data_object's mastering module after B1-S1. | PATCH 10 rows. |
| B1-S9 | **B8 missing outbound relationships** | 22 inbound-direction cross-domain rows touching GRC masters exist, but only a handful of outbound rows from GRC masters to neighbor masters. Outbound handoffs without a matching `data_object_relationships` row: compliance_controls -> service_incidents (handoff 248), remediation_plans -> service_incidents (841) exists (1640 pattern), audit_issues -> AUDIT findings (247), risk_assessments -> OP-RES / BCM (252, 253), policy_attestations -> employees (842). | Author 5-8 cross-domain `data_object_relationships` rows. Some targets unresolvable until neighbor domains modularize (AUDIT, OP-RES, BCM modules absent). |
| B1-S10 | **B2 plural label** | `compliance_evidence` (288) plural is `Compliance Evidences`. Audit-decision deferred from 2026-05-30. Default recommendation: leave as-is. | PATCH `data_objects.id=288.plural_label` if user picks rename. |
| B1-S11 | **F7** | Legacy `skill_tools` row 92 (skill 8, tool 37 `send_email`) carries the generic-notification F7 anti-pattern. Preempted by B1-S7 retirement, but the module-level skills (B1-S12) MUST use `notify_person` not `send_email`. | (a) Delete via B1-S7 retirement and (b) draft module skills with `notify_person`. |
| B1-S12 | **F2 / F3 / F4 / F5** | 3 `skill_type='system'` skills required, one per B1-S1 module, each with >= 5 `skill_tools` rows. Blocked by B1-S1. | Author 3 skills + tools + skill_tools. |
| B1-S13 | **E1 / E2 / E3 / E4 / E5** | The 2 `business_function_id=31` roles target other modules' compliance surfaces (PLM-Compliance, LMS-Compliance-Training), not GRC modules. ~5 new persona roles needed (RISK-MANAGER, COMPLIANCE-OFFICER, POLICY-OWNER, CONTROL-OWNER, ATTESTATION-CAMPAIGN-MGR). Blocked by B1-S1 and B1-S12. | Author 4-5 role rows + `role_modules` + `role_permissions`. |

#### APQC TAGGING progress

8 of 10 outbound handoffs have a `handoff_processes` tag. Two outstanding tags from the 2026-05-30 audit plan:

| handoff_id | source -> target | trigger_event | payload | Proposed PCF | confidence |
|---|---|---|---|---|---|
| 249 | GRC -> LMS | `compliance_policy.updated` | `policy_attestations` (286) | "Deliver employee compliance training" family under 10535 | confident L3 |
| 842 | GRC -> HCM | `policy_attestation.required` | `policy_attestations` (286) | No clean L4 / L5 PCF cross-industry match; candidate L3 parent under HCM "Develop and manage employees" or defer to Discover custom-process | needs lookup, defer if no fit |

Existing 8 tags are all `record_status='new'`. Promotion to `approved` is a user-curation step.

#### Finding-type sub-tally

| Finding type | Count |
| --- | --- |
| MISSING | 0 (routed to Bucket 3) |
| WRONG-OWNERSHIP | 0 (routed to Bucket 3) |
| SCOPE-CREEP | 0 (routed to Bucket 3) |
| STRUCTURAL | 10 (B1-S1, S2, S3, S5, S7, S8, S9, S10, S12, S13) |
| BOUNDARY | counted under STRUCTURAL (B1-S8, B1-S9) |
| APQC TAGGING | 1 (single Bucket 1 line covering the 2 outstanding tags + promotion of 8 to approved) |
| **Bucket 1 total** | **11** |

### Bucket 2, Surface-for-user (judgment calls)

Carried forward from 2026-05-30 unchanged; no user decisions logged since:

1. **B2-1 Rule #15 notes pollution on `domain_data_objects`.** 11 rows on GRC's `domain_data_objects` (`compliance_risks`, `compliance_controls`, ... org_units, employees, contract_obligations) carry populated `notes` text restating role / necessity / co-mastering intent. Auto-populated or user-approved at load time?
2. **B2-2 Rule #15 notes pollution on `skill_tools`.** 4 of 17 legacy-skill `skill_tools` rows carry populated notes (ids 89, 90, 91, 92). Preempted by B1-S7 retirement but the question stands as a Rule-#15 incident-log candidate.
3. **B2-3 Rule #15 notes pollution on inbound `handoffs`.** 2 explicit "target NULL until GRC is modularized" trailers (handoffs 634 from ITAM, 1195 from APM); 6+ further inbound rows carry workflow-shape context that is not user-approved.
4. **B2-4 B4 pattern flag re-evaluation.** Per-master flags on all 10 GRC masters all false. Candidates: `compliance_policies.has_submit_lock`, `policy_attestations.has_single_approver` / `has_submit_lock`, `compliance_evidence.has_submit_lock` / `has_personal_content`, `risk_assessments.has_submit_lock`, `control_assessments.has_submit_lock`, `audit_issues.has_single_approver`, `remediation_plans.has_single_approver`, `compliance_risks.has_personal_content`, `compliance_controls.has_personal_content`, `compliance_obligations.has_personal_content`.
5. **B2-5 COMPLIANCE-TRAIN capability ownership.** Default (b) recommended: DELETE the `capability_domains` row (15, 21). Capability is fundamentally LMS-owned; GRC consumes the attestation record as evidence.
6. **B2-6 Multi-master deferral on `compliance_risks`.** Architectural intent question with multi-domain blast radius (OP-RES, TPRM, SECOPS, PRIV-MGMT). Default (a): keep single-master until 4 neighbor audits land.
7. **B2-7 GRC-domain role authoring.** The 2 cross-functional `business_function_id=31` roles stay tagged, plus 5 new GRC-module roles per B1-S13. Default (a).

### Bucket 3, Phase 0 pending (speculative)

Carried forward from 2026-05-30 unchanged:

1. **B3-1 MISSING entities (vendor substrate gaps).** Candidates: `risk_treatments`, `control_libraries`, `risk_libraries`, `kri_metrics`, `control_tests` (distinct from `control_assessments`), `gap_assessments`, `audit_findings` (vs `audit_issues` distinction), `disclosure_filings`, `risk_appetite_statements`, `regulatory_change_events`, `policy_exceptions`.
2. **B3-2 MODULARIZATION choice.** 3-module proposed (GRC-RISK-MGMT, GRC-COMPLIANCE-MGMT, GRC-POLICY-ATTESTATION) vs 2-module (RISK / COMPLIANCE-AND-POLICY) vs 4-module (RISK / COMPLIANCE / POLICY / EVIDENCE-AND-AUDIT). Feeds B1-S1.
3. **B3-3 WRONG-OWNERSHIP candidate.** `audit_issues` (289) GRC vs AUDIT mastery split. Vet via Phase 0 + cross-domain audit pairing with AUDIT.
4. **B3-4 Domain candidates queued.** 4 candidates in `_missing-domains.md`: CRQ, ETHICS-HOTLINE, POLICY-MGMT, REG-CHANGE-MGMT.

### Cross-bucket dependencies

- B1-S1 (modularization) gates B1-S3, B1-S7, B1-S8, B1-S12, B1-S13. B1-S2 gates on B2-5. B1-S1's split shape is decided by B3-2.
- B2-5 blocks B1-S2 (M4 resolution).
- B2-6 is independent in the near term; final resolution waits on 4 neighbor audits.
- B3-3 may flip B1-S9's outbound relationship row design.
- Buckets 2 and 3 are otherwise independent of each other.

### Per-bucket prompts

- **Bucket 1**: reply `all`, `S1, S3, S5`, or `skip`. Sequence: S1 lands first; S3, S7, S8, S12, S13 depend on S1. S5 and S10 ship independently.
- **Bucket 2**: per-item answer; B2-1 / B2-2 / B2-3 are "auto-populated or user-approved at load time?", B2-4 per-flag yes/no per master, B2-5 (a)/(b), B2-6 (a)/(b)/(c), B2-7 (a)/(b).
- **Bucket 3**: vet via formal Phase 0 research or eyeball-mode. If eyeball, name which B3-1 substrate gaps ring true, which B3-2 split, which side of the B3-3 split, and which B3-4 candidates to triage.

### JWT errors

None encountered during this audit pass.


