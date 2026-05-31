---
domain_code: FSQM
status: feedback_needed
open_questions: 19
last_updated_by: agent
last_updated_at: 2026-05-30
---

# FSQM (Food Safety and Quality Management) audit history

## 2026-05-30 — Validate b1 (full 4-pass)

### Summary

- **Domain id:** 157. **Owner business function:** Governance, Risk and Compliance (contributors: Business Operations, Procurement; consumer: Executive).
- **Current footprint counts.** 7 master data_objects (`haccp_plans`, `critical_control_points`, `ccp_measurements`, `food_safety_incidents`, `allergen_programs`, `environmental_monitoring_samples`, `sanitation_records`), 4 contributor (`supplier_certifications`, `audit_findings`, `recall_events`, `compliance_obligations`), 1 consumer (`suppliers`). 6 capabilities. 8 solutions (6 primary, 2 secondary). **0 modules**, **0 lifecycle states**, **0 aliases**, **0 regulations**, **0 user-edges in `data_object_relationships`**, **0 intra-domain `data_object_relationships`**. 9 outbound + 5 inbound handoffs, all with NULL module FKs on both sides. 1 system skill at the legacy `domain_id`-only anchor; no module-anchored skill; 8 `skill_tools`.
- **Vendor-surface basis.** Flagship vendors enumerated for the semantic pass: TraceGains, Safefood 360, SafetyChain, Icicle, Intelex Food Safety, FoodReady, Trustwell Connect (in catalog as solutions). Wider FSQM market shape cross-checked against MasterControl, ETQ Reliance, AssurX, Veeva QualityOne (positioned as EQMS-shaped general QMS rather than food-specific, surfaced as a separate candidate market) and Cority / Sphera / Enablon (positioned as EHS rather than food-specific). Statutory anchors: FSMA Preventive Controls Rule (21 CFR 117), FDA Food Traceability Rule (21 CFR 1 Subpart S), Codex Alimentarius HACCP, USDA FSIS HACCP, GFSI-recognized schemes (SQF, BRC GS, FSSC 22000, IFS Food).
- **Bucket 1 (in-scope, agent fixable):** 12 items.
- **Bucket 2 (surface-for-user, judgment):** 4 items.
- **Bucket 3 (Phase 0 pending, speculative):** 3 items.

### Pass 1 — Structural findings (per-domain completeness checklist)

S-band sweep first, then per-band routing.

#### S1. Direct FKs to `domains` (FSQM = id 157)

| Table | FK column | FSQM rows | Expected non-zero? | Status |
| --- | --- | --- | --- | --- |
| `domain_modules` | `domain_id` | 0 | yes | **FAIL (M1)** |
| `domain_module_host_domains` | `domain_id` | 0 | routinely zero | pass |
| `capability_domains` | `domain_id` | 6 | yes | pass |
| `solution_domains` | `domain_id` | 8 | yes | pass |
| `business_function_domains` | `domain_id` | 4 | yes | pass |
| `domain_data_objects` | `domain_id` | 12 | yes | pass |
| `domain_regulations` | `domain_id` | 0 | usually non-zero | **FAIL (Bucket 1, regulations gap)** |
| `handoffs.source_domain_id` | n/a | 9 | yes | pass on count, fails B10b |
| `handoffs.target_domain_id` | n/a | 5 | usually non-zero | pass on count, fails B10b |
| `skills.domain_id` | n/a | 1 (legacy) | pass becomes obsolete once M1 cured | **F1 transitional** |
| `domains.parent_domain_id` | n/a | 0 | routinely zero | pass |

#### S2. Indirect per-module coverage — not applicable

No `domain_modules` rows; coverage table empty. Every module-anchored check (S2 / M2 / M4 / M5 / M6 / M7 within-domain / B10b per-module attribution / F2 / F3 / F4 / F5) cascades from M1.

#### S3. Per-master indirect coverage

| data_object | states | events | aliases |
| --- | --- | --- | --- |
| `haccp_plans` | 0 | 1 (`haccp_plan.approved`) | 0 |
| `critical_control_points` | 0 | 1 (`critical_control_point.deviation`) | 0 |
| `ccp_measurements` | 0 | 1 (`ccp_measurement.deviation`) | 0 |
| `food_safety_incidents` | 0 | 1 (`food_safety_incident.escalated`) | 0 |
| `allergen_programs` | 0 | 1 (`allergen_program.violation_detected`) | 0 |
| `environmental_monitoring_samples` | 0 | 1 (`environmental_monitoring_sample.positive`) | 0 |
| `sanitation_records` | 0 | 1 (`sanitation_record.completed`) | 0 |

Every master has events but zero lifecycle states (B12 fail) and zero aliases (B11 fail for cross-vendor-synonym candidates).

#### Per-band classification

| ID | Result | Routing |
| --- | --- | --- |
| A1 | pass (all 7 metadata fields populated) | n/a |
| A2 | pass (6 capabilities) | n/a |
| A3 | pass (8 solutions, 6 primary) | n/a |
| A4 | FAIL: `catalog_tagline = ""`, `catalog_description = ""` | Bucket 1 STRUCTURAL |
| M1 | FAIL: 0 modules | **Bucket 1 STRUCTURAL (gating)** |
| M2 / M4 / M5 / M6 / M7 | n/a until M1 cured | cascade |
| B1 | pass (7 masters) | n/a |
| B2 | pass (all masters carry singular + plural labels) | n/a |
| B3 | pass (every master is domain-prefixed compound, no bare-word claim needed) | n/a |
| B4 | FAIL: every master has all three pattern flags = false. Per Rule #12 a positive consideration is required; defaults are not the same as reviewed | Bucket 2 (per-flag review) |
| B5 | pass (no `embedded_master` rows in this domain) | n/a |
| B6 | FAIL: 0 intra-domain `data_object_relationships`; expected verbs include `haccp_plans → critical_control_points (defines)`, `critical_control_points → ccp_measurements (monitored_by)`, `food_safety_incidents → recall_events (escalates_to)`, `allergen_programs → environmental_monitoring_samples (verifies via)`, etc. | Bucket 1 STRUCTURAL |
| B7 | FAIL: 0 `users` edges on any FSQM master, both directions. Quality manager (HACCP author), CCP monitor (measurement recorder), incident commander, allergen-program owner, EMP technician, sanitation lead are all user-typed roles per FSMA Preventive Controls (1 PCQI per facility, plus operator roles) | Bucket 1 STRUCTURAL |
| B8 | FAIL (outbound): cross-domain relationship rows missing. Outbound handoff `food_safety_incident.escalated → FOOD-TRACE.recall_events` lacks the corresponding `data_object_relationships` (`food_safety_incidents spawns recall_events`). Same for the other 8 outbound handoffs once payload-target pairs are unambiguous | Bucket 1 STRUCTURAL |
| B9 | partial: 7 published events for 7 masters; deviation-shape events present. Missing: `food_safety_incident.opened`, `food_safety_incident.closed`, `haccp_plan.due_for_review`, `ccp_measurement.recorded` (normal-path informational), `environmental_monitoring_sample.adverse_trend` | Bucket 1 STRUCTURAL |
| B9b | n/a until M1 cured (single-module domain after split has cross-module candidates, but no modules to attribute) | cascade |
| B10 (inbound) | FAIL: 5 inbound rows exist (from FMIS, FOOD-TRACE, DAIRY-MGMT) but every row has NULL `target_domain_module_id` (cascade of M1) | Report-only follow-ups + cascade |
| B10b | FAIL: every outbound row in `handoffs` has NULL `source_domain_module_id` (cascade of M1); every inbound row has NULL `target_domain_module_id` (cascade). Additionally `trigger_event 349` (`audit_finding.created`) points at `data_object_id=294` (`audit_findings`), which is mastered by AUDIT, not FSQM — FSQM is publishing an event on a payload it does not master. Mis-attribution at source | Bucket 1 STRUCTURAL (event mis-attribution); B10b NULL FK cascade from M1 |
| B11 | FAIL: every master has 0 aliases. Vendor-specific synonyms exist (SafetyChain calls `ccp_measurements` "Check Records"; TraceGains uses "Quality Records"; Safefood 360 uses "Monitoring Forms") | Bucket 1 STRUCTURAL |
| B12 | FAIL: every `master + required` data_object has 0 lifecycle states. All seven masters carry real workflows (HACCP plan: draft → reviewed → approved → in_effect → superseded; food safety incident: opened → under_investigation → contained → corrected → closed → escalated; environmental sample: collected → in_lab → result_received → adverse → re-sampled; etc.) | Bucket 1 STRUCTURAL |
| C1 | pass (1 owner + 2 contributors + 1 consumer) | n/a |
| C2 | pass (no capability divergences observed; FSQM-AUDIT-PREP could plausibly be GRC-Audit-owned but that's a Bucket 2 review) | Bucket 2 (capability function-divergence review) |
| D1 | UI spot-check deferred until after fix loads | n/a |
| E1-E6 | E1 vacuously fails because M1 fails (no modules to anchor `role_modules` on); cascade | cascade from M1 |
| F1 | FAIL: legacy `skills.id = 64` (`fsqm-system`) at `domain_id = 157`, `domain_module_id = null`. Per Rule #14 + F1, this becomes obsolete once module-level system skills are authored, but **must not be deleted before** the module set lands | Bucket 1 STRUCTURAL (sequenced after M1) |
| F2 / F3 / F4 / F5 | cascade from M1 (no modules to anchor system skills on); F4 sub-finding: the legacy skill's 8 tools pass operation-kind invariants (`query_*` tools all have `data_object_id` set; `send_email` has NULL `data_object_id`); F7 sub-finding: the `send_email` link to the legacy skill is unjustified by the channel-vs-capability rule — most FSQM notification flows (incident escalation, deviation alert, sample-positive page-out) should use `notify_person` or `notify_team` unless the channel is contractually email-only | Bucket 1 STRUCTURAL (F7 specifically); rest cascade from M1 |
| H1 | FAIL: 14 cross-domain handoffs (9 outbound + 5 inbound); 1 `handoff_processes` row exists (id 357 → APQC 11043 "Report audit findings", `discovery_substring`, `new`). Per H1 volume expectation `0.5N to 0.8N` agent-curated tags = 7-11; this audit proposes APQC tags below | Bucket 1 APQC TAGGING |

### Pass 2 — Market audit (semantic) findings

Flagship vendor surface for FSQM: SafetyChain, TraceGains, Safefood 360, Icicle, Intelex Food Safety, FoodReady (already in catalog), plus Trustwell Connect, Sparta Systems Stratas (food-specific), iCheck.

#### MISSING entities

| Proposed master | Vendor evidence | Notes |
| --- | --- | --- |
| `food_safety_plans` (PCQI-authored umbrella plan above HACCP) | SafetyChain, Safefood 360 model FSMA-mandated Food Safety Plan distinct from a single HACCP plan (covers preventive controls, supply-chain program, recall plan, sanitation prerequisites) | One Food Safety Plan can govern multiple HACCP plans by product / process. Bucket 3 candidate (vet against PCQI workflow conventions). |
| `corrective_action_records` (CAR) | All flagship vendors carry CAR as first-class; today FSQM models `food_safety_incidents` but not the CAR documents that close out a CCP deviation, allergen control failure, or EMP positive | Bucket 1 MISSING |
| `verification_records` (HACCP verification activities: reviewing monitoring records, calibration checks, supplier-COA-review verifications) | SQF / BRC GS clauses require verification log distinct from monitoring | Bucket 1 MISSING |
| `mock_recalls` | TraceGains, SafetyChain, FoodReady all carry mock-recall scheduling and traceback-exercise records | Bucket 1 MISSING |
| `gfsi_audits` / `certification_audits` | Today FSQM consumes `audit_findings` (AUDIT-mastered) but doesn't master the audit event itself; SQF / BRC GS / FSSC certification audits have a specific shape distinct from generic compliance audits | Bucket 2 (decide whether FSQM masters or AUDIT continues to master with FSQM as contributor) |
| `food_fraud_assessments` (VACCP) | Safefood 360, TraceGains, FoodReady all model VACCP separately from HACCP and TACCP | Bucket 2 (could fold into a single `vulnerability_assessments` master with a type column, or separate) |
| `food_defense_plans` (TACCP, intentional adulteration) | FSMA Intentional Adulteration Rule (21 CFR 121) mandates a written Food Defense Plan | Bucket 2 (same fold-or-separate decision) |
| `training_records` | Every food-safety platform tracks PCQI / HACCP / allergen / sanitation training attestations. **Not FSQM-master, but FSQM-contributor on a TRAINING-RECORDS-MGMT / LMS-mastered master**. Today FSQM has no `training_records` consumer / contributor row | Bucket 3 (depends on whether LMS or a separate compliance-training master is the canonical owner) |
| `environmental_monitoring_programs` (the program shell that organizes EMP zones, sites, frequencies, and pathogens of concern) | Distinct from individual samples; SafetyChain, Safefood 360 carry EMP program separately | Bucket 1 MISSING |

#### WRONG-OWNERSHIP

| Entity | Current owner | Suggested owner | Vendor evidence |
| --- | --- | --- | --- |
| trigger_event `audit_finding.created` (id 349) | published from FSQM but data_object 294 (`audit_findings`) is AUDIT-mastered | should be published by AUDIT, not FSQM. FSQM should consume the event, not emit it | published by Trustwell / TraceGains as a cross-system signal from a QMS audit module, but in our catalog AUDIT owns audit_findings |
| Possibly `food_safety_incidents` master vs an incident-management generic master | FSQM masters today | confirm: food safety incidents are domain-specific enough (recall-trigger, FSMA Reportable Food Registry tie-in) that FSQM mastering is correct; flag as a positive sanity-check | TraceGains, SafetyChain master food incidents separately from generic IT-style incidents |

#### SCOPE-CREEP

None observed. FSQM's current 7 masters all fall inside the recognized food-safety-platform market boundary.

#### MODULARIZATION ISSUES

FSQM has 6 capabilities and 0 modules. Per Rule #14 a domain with >=3 capabilities needs >=2 `module_kind='full'` modules. Recommended module split (Bucket 2):

| Proposed module code | Scope | Masters it would anchor |
| --- | --- | --- |
| `FSQM-HACCP` | HACCP plan authoring, CCP setup, deviation-rule library, plan review and approval, supersession | `haccp_plans`, `critical_control_points` |
| `FSQM-CCP-MONITORING` | Real-time CCP measurement capture, deviation alerts, product holds, corrective actions | `ccp_measurements`, plus embedded shell of `critical_control_points` |
| `FSQM-INCIDENT-RECALL` | Food safety incident management, escalation to recall, mock recalls, Reportable Food Registry submissions | `food_safety_incidents`, plus the proposed `corrective_action_records` and `mock_recalls`, plus `recall_events` (contributor today, possibly embedded_master here for standalone shape) |
| `FSQM-ALLERGEN-CONTROL` | Allergen mapping, label review, line-changeover validation, cross-contact incidents | `allergen_programs` |
| `FSQM-EMP` | Environmental monitoring program, zone definitions, sample scheduling, positive-result trending | `environmental_monitoring_samples`, plus the proposed `environmental_monitoring_programs` |
| `FSQM-SANITATION` | Master sanitation schedule, sanitation-cycle records, pre-op inspection, sanitation chemical inventory | `sanitation_records` |
| `FSQM-AUDIT-PREP` | GFSI-scheme audit calendars, evidence binders, score forecasts, mock audits | (no new master; embedded shell of `gfsi_audits` if that becomes an FSQM master, or consumer if AUDIT keeps owning) |

A 6-module split is heavy for a $800M USA market; a 3-module starter (HACCP-MONITORING, INCIDENT-RECALL, AUDIT-PREP) plus a single `FSQM-CORE` covering allergen / EMP / sanitation could be the lighter alternative. Surface to user (Bucket 2).

### Pass 3 — Neighbor discovery (cross-edges)

Neighbor set derived from `handoffs` (outbound + inbound) and contributor / consumer DMDO cross-references.

| Neighbor | Outbound handoffs (FSQM → neighbor) | Inbound handoffs (neighbor → FSQM) | DMDO edges | Edge weight | Pairwise depth |
| --- | --- | --- | --- | --- | --- |
| FOOD-TRACE (155) | 4 (incident.escalated, ccp.deviation, EMP.positive, allergen.violation) | 2 (traceability_lot.created, supplier_certification.expired) | FSQM consumer/contributor on `recall_events`, `supplier_certifications` (both FOOD-TRACE-mastered) | 8 | full 5-section |
| MFG-OPS (47) | 2 (critical_control_point.deviation, sanitation_record.completed) | 0 | none observed | 2 | one-line |
| AUDIT (16) | 2 (audit_finding.created [mis-attributed], haccp_plan.approved) | 0 | FSQM contributor on `audit_findings` (AUDIT-mastered) | 3 | full 5-section |
| GRC (15) | 2 (ccp_measurement.deviation, allergen_program.violation_detected) | 0 | FSQM contributor on `compliance_obligations` (GRC-mastered) | 3 | full 5-section |
| DAIRY-MGMT (156) | 0 | 2 (milk_quality_test.failed, cow_health_event.treatment_administered) | none observed | 2 | one-line |
| FMIS (154) | 0 | 1 (field_application.recorded) | none observed | 1 | one-line |
| SUP-LIFE (28) | 0 | 0 | FSQM consumer on `suppliers`, contributor on `supplier_certifications` (catalog-wide single-master fail observed: `supplier_certifications` is mastered in both SUP-LIFE and FOOD-TRACE, `suppliers` in both SUP-LIFE and MDM, but that is owed by SUP-LIFE / MDM / FOOD-TRACE, not FSQM) | 2 (DMDO only) | report-only |

### Pass 4 — Pairwise reconciliation (edge weight >= 3)

#### Neighbor: FOOD-TRACE (weight 8)

1. **Existing handoffs, fully wired** — 0. Every cross-edge with FOOD-TRACE has NULL module FKs on both sides (cascade of FSQM M1 fail AND FOOD-TRACE's own modularization state, which this audit does not assert about). Pass: nothing to confirm.
2. **Existing handoffs with NULL module FK** — 4 outbound + 2 inbound, all NULL on both sides. Resolution blocked on M1 here. Once FSQM modules are loaded, `food_safety_incident.escalated → FOOD-TRACE.recall_events` should map source to `FSQM-INCIDENT-RECALL`; `critical_control_point.deviation → FOOD-TRACE` to `FSQM-CCP-MONITORING`; `allergen_program.violation_detected → FOOD-TRACE` to `FSQM-ALLERGEN-CONTROL`; `environmental_monitoring_sample.positive → FOOD-TRACE` to `FSQM-EMP`.
3. **Missing handoffs catalog implies** — likely missing: `food_safety_plan.approved → FOOD-TRACE` (if `food_safety_plans` is added per Bucket 3), `corrective_action.closed → FOOD-TRACE` (for traceability evidence closure), `mock_recall.executed → FOOD-TRACE`. Bucket 1 if those entities land.
4. **Boundary integrity gaps** — none for the FSQM side. FOOD-TRACE side carries a catalog-wide single-master conflict on `supplier_certifications` (also mastered by SUP-LIFE) and `suppliers` (also mastered by MDM); both are FOOD-TRACE / SUP-LIFE / MDM responsibilities, not FSQM's. Report-only follow-ups.
5. **Cross-domain `data_object_relationships` mirror** — 0 cross-domain relationship rows from FSQM masters to FOOD-TRACE masters (e.g. `food_safety_incidents spawns recall_events`, `critical_control_points exposes traceability_lots`). All MISSING-RELATIONSHIP. Bucket 1.

#### Neighbor: AUDIT (weight 3)

1. Existing fully-wired — 0 (NULL module FKs).
2. NULL FKs — 2 outbound. After M1, `audit_finding.created` should be PATCHed to publish from AUDIT (not FSQM); `haccp_plan.approved → AUDIT` should be source-mapped to `FSQM-HACCP`.
3. Missing handoffs — `gfsi_audit.scheduled` (if FSQM masters `gfsi_audits`), `internal_audit.scheduled` (if FSQM-AUDIT-PREP module is added), `corrective_action.evidence_attached → AUDIT`. Speculative until Bucket 2 modularization decided.
4. Boundary integrity — FSQM contributor row on `audit_findings` (AUDIT-mastered) is structurally valid. The mis-attribution defect is on the FSQM side (trigger_event 349 should be re-attributed to AUDIT or deleted from FSQM's emission set).
5. Relationships mirror — 0 cross-domain `data_object_relationships` from FSQM masters to AUDIT masters. Expected: `haccp_plans → audit_findings (raised_against)` (owner_side=target since AUDIT raises findings). MISSING-RELATIONSHIP. Bucket 1.

#### Neighbor: GRC (weight 3)

1. Existing fully-wired — 0 (NULL module FKs).
2. NULL FKs — 2 outbound. After M1, `ccp_measurement.deviation → GRC` should source-map to `FSQM-CCP-MONITORING`; `allergen_program.violation_detected → GRC` to `FSQM-ALLERGEN-CONTROL`.
3. Missing handoffs — `food_safety_incident.reportable_to_regulator` (FSMA Reportable Food Registry), `gfsi_audit.nonconformance_raised → GRC` (if `gfsi_audits` is FSQM-mastered). Bucket 1 once Bucket 2 modularization lands.
4. Boundary integrity — FSQM contributor on `compliance_obligations` is valid. GRC's responsibility, not FSQM's, to ensure obligations are correctly tagged with FSMA / FSIS / GFSI scope.
5. Relationships mirror — 0 cross-domain rows from FSQM masters to GRC masters. Expected: `food_safety_incidents triggers compliance_obligations` (FSMA reportable-food obligation); `haccp_plans subject_to compliance_obligations`. MISSING-RELATIONSHIP. Bucket 1.

### Bucket 1 — In-scope confirmed gaps

#### STRUCTURAL (cascading from M1)

| ID | Finding | Recommended fix |
| --- | --- | --- |
| B1-S1 | A4 fail: `catalog_tagline` and `catalog_description` are empty | Draft both per Rule #20 (buyer voice, workflow + value; not analyst voice). Surface drafts before writing per Rule #20. |
| B1-S2 | M1 fail (GATING): 0 `domain_modules` rows for a 6-capability domain. Rule #14 requires >=2 `module_kind='full'` modules | Author the module set per Bucket 2 selected shape (3-module starter vs 6-module split). Default recommendation: 4 modules (`FSQM-HACCP`, `FSQM-CCP-MONITORING`, `FSQM-INCIDENT-RECALL`, `FSQM-CORE` covering allergen / EMP / sanitation / audit-prep). |
| B1-S3 | B4 fail: pattern flags (`has_personal_content`, `has_submit_lock`, `has_single_approver`) on every master are default false with no audit confirmation. Per Rule #12, positive consideration is required | Re-evaluate per master. Likely true cases: `haccp_plans.has_submit_lock = true` (lock on activation), `haccp_plans.has_single_approver = true` (PCQI signs), `food_safety_incidents.has_submit_lock = true` (incidents lock on close), `corrective_action_records.has_single_approver = true`. Apply via PATCH after user confirms per row (no notes annotation per Rule #15). |
| B1-S4 | B6 fail: 0 intra-domain `data_object_relationships` | Load the cluster: `haccp_plans → critical_control_points (defines)`, `critical_control_points → ccp_measurements (monitored_by)`, `food_safety_incidents → recall_events (escalates_to)` (cross-domain), `allergen_programs → environmental_monitoring_samples (verified_by)`, `haccp_plans → food_safety_incidents (governs)`, `environmental_monitoring_samples → food_safety_incidents (triggers)` when EMP positive escalates. |
| B1-S5 | B7 fail: 0 `users` edges on any FSQM master | Author Rule #10 edges: `users → haccp_plans (authored_by:pcqi, approved_by:plant_manager)`, `users → ccp_measurements (recorded_by:operator)`, `users → food_safety_incidents (reported_by:any, owned_by:qa_manager)`, `users → allergen_programs (owned_by:qa_manager)`, `users → environmental_monitoring_samples (collected_by:emp_tech)`, `users → sanitation_records (performed_by:sanitor, verified_by:supervisor)`, `users → critical_control_points (assigned_monitor)`. Per Rule #10, both directions where applicable. |
| B1-S6 | B8 fail (outbound only): 9 outbound `handoffs` rows but 0 corresponding cross-domain `data_object_relationships`. Per Rule §B8, FSQM owes the outbound mirror | Author `food_safety_incidents spawns recall_events` (target = FOOD-TRACE), `haccp_plans subject_to audit_findings` (target = AUDIT), `food_safety_incidents triggers compliance_obligations` (target = GRC), etc. One row per cleanly-mapped outbound handoff payload. |
| B1-S7 | B9 partial: 7 events published, missing normal-lifecycle events. Specifically `haccp_plan.due_for_review` (annual review cycle is FSMA-mandated), `food_safety_incident.opened`, `food_safety_incident.closed`, `environmental_monitoring_sample.adverse_trend` (3 positives in 60 days at the same zone) | Author the missing events; pair each with at least one handoff per § B9 (intra-domain for due_for_review once modules land; cross-domain for incident.opened → GRC for early-warning, etc.). |
| B1-S8 | B10b mis-attribution: `trigger_event 349` (`audit_finding.created`) publishes from FSQM but `audit_findings` is AUDIT-mastered. FSQM is mis-emitting | Two options: (a) DELETE trigger_event 349 from FSQM emission and load an equivalent on AUDIT's side (AUDIT B9 work); (b) re-attribute the event to a FSQM-mastered payload (e.g. retire 349, replace with `food_safety_incident.escalated_to_audit`). Recommended: (a), since AUDIT already owns the audit_findings lifecycle. |
| B1-S9 | B11 fail: 0 aliases on any master. Vendor-specific synonyms: `ccp_measurements` ↔ "Check Records" (SafetyChain), "Monitoring Forms" (Safefood 360), "Quality Records" (TraceGains); `haccp_plans` ↔ "Food Safety Plan" (FSMA usage), "Quality Plan" (some QMS); `environmental_monitoring_samples` ↔ "EMP Swabs", "Pathogen Environmental Monitoring (PEM)" | Author cross-vendor and statutory alias rows; bundle into a cluster-drafts load. |
| B1-S10 | B12 fail: 0 lifecycle states on any of the 7 masters. Per Rule #12 every `master + required` data_object needs states; only config-shaped exemption applies and none of these qualify | Author state machines: `haccp_plans` (draft → reviewed → approved → in_effect → superseded → archived); `food_safety_incidents` (opened → under_investigation → contained → corrected → closed; escalated branch to recall); `ccp_measurements` (recorded → reviewed → in_deviation → corrected); `allergen_programs` (draft → approved → active → suspended); `environmental_monitoring_samples` (collected → in_lab → result_received → adverse → re-sampled → closed); `sanitation_records` (scheduled → in_progress → completed → verified → failed); `critical_control_points` (defined → active → deactivated). Mark workflow-gate states `requires_permission=true` and set `domain_module_id` per realizing module once M1 cured. |
| B1-S11 | F1 + F7 fail: legacy `skills.id=64` at `domain_id=157`, `domain_module_id=null`. Once module-level system skills are authored (per F2 after M1), this becomes obsolete. F7 sub-finding: the `send_email` linkage is unjustified channel-pinning for generic notification flows | Sequenced: (1) author module-level system skills, (2) link channel abstractions (`notify_person` / `notify_team`) on the per-module skills, (3) DELETE legacy skill 64. Do not delete legacy before per-module skills exist. |
| B1-S12 | C2 review: `FSQM-AUDIT-PREP` capability's responsibility may diverge from the domain's owning function (GRC). Audit prep is more a GRC-Audit than a GRC-Compliance function | Bucket 2 review (whether to add a `business_function_capabilities` override). |

#### MISSING (data-object surface gaps)

| ID | Finding | Recommended fix |
| --- | --- | --- |
| B1-M1 | MISSING master: `corrective_action_records` | Load as FSQM master under `FSQM-INCIDENT-RECALL` once modules exist. |
| B1-M2 | MISSING master: `verification_records` | Load as FSQM master, anchored on whichever module realizes verification (likely `FSQM-HACCP` or `FSQM-CORE`). |
| B1-M3 | MISSING master: `mock_recalls` | Load as FSQM master under `FSQM-INCIDENT-RECALL`. |
| B1-M4 | MISSING master: `environmental_monitoring_programs` | Load as FSQM master under `FSQM-EMP` / `FSQM-CORE`. |

#### APQC TAGGING

14 cross-domain handoffs total (9 outbound + 5 inbound). Existing tags: 1 (`discovery_substring`, `new`). H1 volume expectation: 7-11 agent_curated rows + 0-3 deferrals.

| ID | Finding | Recommended fix |
| --- | --- | --- |
| B1-H1 | APQC tagging for 14 cross-domain handoffs. Proposed `agent_curated` rows (record_status: `new`): | Load via the standard APQC tagging shape (see references/domain-audit-procedure.md § APQC TAGGING). |

Proposed agent-curated tags:

| handoff_id | source -> target | trigger_event | payload | proposed APQC | external_id | level | confidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 356 | FSQM -> FOOD-TRACE | food_safety_incident.escalated | recall_events | Initiate recall | 20111 | 3 | high |
| 358 | FSQM -> GRC | ccp_measurement.deviation | ccp_measurements | Perform quality testing | 10369 | 3 | medium |
| 975 | FSQM -> MFG-OPS | critical_control_point.deviation | critical_control_points | Eliminate quality and reliability problems | 10089 | 4 | high |
| 976 | FSQM -> FOOD-TRACE | critical_control_point.deviation | critical_control_points | Manage product recalls and regulatory audits | 20110 | 2 | medium |
| 977 | FSQM -> GRC | allergen_program.violation_detected | allergen_programs | Ensure compliance | 11047 | 3 | high |
| 978 | FSQM -> FOOD-TRACE | environmental_monitoring_sample.positive | environmental_monitoring_samples | Monitor and audit recall effectiveness | 20115 | 3 | medium |
| 979 | FSQM -> MFG-OPS | sanitation_record.completed | sanitation_records | Undertake quality control | 19248 | 4 | high |
| 980 | FSQM -> AUDIT | haccp_plan.approved | haccp_plans | Develop quality standards and procedures | 10368 | 3 | high |
| 352 | FMIS -> FSQM | field_application.recorded | field_applications | Manage compliance audits | 12183 | 4 | medium |
| 354 | DAIRY-MGMT -> FSQM | milk_quality_test.failed | milk_quality_tests | Perform quality testing | 10369 | 3 | high |
| 355 | DAIRY-MGMT -> FSQM | cow_health_event.treatment_administered | cow_health_events | Ensure compliance | 11047 | 3 | medium |
| 361 | FOOD-TRACE -> FSQM | supplier_certification.expired | supplier_certifications | Certify and validate suppliers | 10289 | 4 | high |
| 971 | FOOD-TRACE -> FSQM | traceability_lot.created | traceability_lots | Monitor quality of product delivered | 10302 | 4 | medium |

Handoff 357 (FSQM -> AUDIT, `audit_finding.created`) is excluded from the agent-curated proposals because of the B10b mis-attribution finding (B1-S8): the event should be re-attributed to AUDIT or deleted from FSQM emission before any APQC row is loaded against it. Existing `discovery_substring` tag (process 389, "Report audit findings") may itself become invalid depending on the B1-S8 decision. **Defer pending B1-S8.**

### Bucket 2 — Surface-for-user (judgment calls)

1. **Module split shape.** Recommended default: 4 modules (`FSQM-HACCP`, `FSQM-CCP-MONITORING`, `FSQM-INCIDENT-RECALL`, `FSQM-CORE`). Alternatives: (a) 6 modules per the larger enumeration in Pass 2; (b) 3-module starter set; (c) 1 starter module + 2 full modules. Decision unlocks every cascade (M2, M4, M5, M6, M7, B9b, B10b, E1-E6, F2-F5). **Decision needed.**
2. **`gfsi_audits` / `certification_audits` mastership.** Either FSQM masters them (and they become part of `FSQM-AUDIT-PREP`), or AUDIT continues to master them and FSQM is a contributor. Flagship vendors (SafetyChain, Safefood 360) lean toward FSQM mastering certification-audit specifics; generic IT-style audit-management leans toward AUDIT. **Decision needed.**
3. **VACCP / TACCP fold-or-separate.** Three options: (a) one `vulnerability_assessments` master with a `type` enum (VACCP / TACCP); (b) two masters (`food_fraud_assessments`, `food_defense_plans`); (c) defer entirely (most SMB food makers do not run formal VACCP/TACCP, only enterprise food brands do). **Decision needed.**
4. **`business_function_capabilities` override for `FSQM-AUDIT-PREP`.** The capability's owning function may diverge from the domain's GRC owner (audit prep maps better to GRC-Audit or to a `QUALITY` sub-function under Operations). **Decision needed.**

### Bucket 3 — Phase 0 pending (speculative)

1. **`food_safety_plans` (PCQI-authored umbrella).** FSMA Preventive Controls Rule mandates a Food Safety Plan that supersedes the legacy HACCP-only contract. Whether to add as a new FSQM master above `haccp_plans`, or to retroactively rename `haccp_plans` to `food_safety_plans`, depends on whether the catalog wants to model the FSMA terminology shift. Vet via Phase 0 vendor research (SafetyChain, Safefood 360, FoodReady explicit-vs-conflated treatment).
2. **`coa_records` / `certificates_of_analysis`.** Heavy in food-supplier programs; today suppliers carry `supplier_certifications` (mastered SUP-LIFE/FOOD-TRACE) but COAs per-shipment are a separate workflow. May belong in FOOD-TRACE or PROC-PARTNER, not FSQM, but several flagship FSQM products (TraceGains, Trustwell) include COA workflows. Vet via vendor research.
3. **`food_fraud_assessments` (VACCP) and `food_defense_plans` (TACCP).** Bucket 2 item #3 routes here for vendor confirmation that flagship FSQM products consistently separate the two from HACCP. Phase 0 worth: confirm that >=3 flagship vendors carry distinct VACCP and TACCP entities.

### Candidate domains queued (separate file)

Queued via `scripts/analytics/append_missing_domain.ts`:

- **EQMS** (Enterprise Quality Management System) — NEW. Surfaced because flagship general QMS vendors (MasterControl, ETQ Reliance, AssurX, Sparta Systems TrackWise, Veeva QualityOne, Honeywell QMS) compete in a clearly recognized market distinct from food-specific FSQM. Capabilities cover document control, nonconformance / CAPA, change control, training records, supplier quality, complaint handling, audit management, validation lifecycle.
- **EHS-MGMT** (Environmental, Health and Safety Management) — already queued by REAL-EST audit. Mention count bumped to 2 after this audit (Cority, Intelex, Sphera, Enablon, VelocityEHS). Adjacent to FSQM because Intelex sells both food-safety and EHS modules from one platform.

### Cross-bucket dependencies

- **Bucket 1 fixes cascade through Bucket 2 #1.** Most STRUCTURAL Bucket 1 items (M-band, B9b, B10b, E-band, F2-F5) cannot complete until the module split is decided. Sequence: Bucket 2 #1 first, then Bucket 1 module load, then the rest of Bucket 1.
- **Bucket 1 B1-S8 (event mis-attribution) blocks the existing APQC tag (handoff 357) and the proposed AUDIT-related agent-curated tags. Resolve B1-S8 before any further APQC TAGGING work on FSQM <-> AUDIT.**
- **Bucket 2 #2 (gfsi_audits mastership) gates Bucket 1 B1-S6 outbound `data_object_relationships`** for the `FSQM-AUDIT-PREP` slice; decide before authoring relationship rows that touch audit entities.
- **Bucket 3 #1 (food_safety_plans) and #3 (VACCP/TACCP)** unlock new MISSING entries in Bucket 1, both gated by Phase 0 vendor confirmation.
- **Candidate EQMS triage** has no FSQM-side fix dependency; surfaced for catalog completeness. If EQMS is promoted, expect a future review pass to mark several FSQM contributor entities (training_records, document_control) as EQMS-mastered consumers rather than FSQM-mastered.

### Per-bucket prompts

- **Bucket 1 (12 STRUCTURAL + MISSING + APQC items).** *"Approve Bucket 1 items B1-S1..S12, B1-M1..M4, B1-H1 for fix loads? Recommended order: (1) author Bucket 2 #1 module split, (2) load modules + lifecycle states + pattern-flag review + intra-domain relationships + users edges, (3) re-attribute or DELETE trigger_event 349 per B1-S8, (4) load APQC tags (excluding handoff 357 until B1-S8 decided), (5) load missing masters M1..M4. Confirm per-item approve / decline."*
- **Bucket 2 (4 judgment items).** *"Decisions needed: (1) module split shape (recommended: 4 modules HACCP / CCP-MONITORING / INCIDENT-RECALL / CORE; alternatives: 6-module or 3-module starter); (2) `gfsi_audits` mastership (FSQM vs AUDIT-with-FSQM-contributor); (3) VACCP/TACCP fold vs separate vs defer; (4) `FSQM-AUDIT-PREP` capability function-divergence override (yes/no). What's your call on each?"*
- **Bucket 3 (3 Phase-0 candidates).** *"Vet via Phase 0 vendor research, or eyeball-mode? Candidates: `food_safety_plans` (FSMA superseder of `haccp_plans`), `coa_records` (per-shipment COAs), VACCP+TACCP assessment masters. Eyeball-mode recommendation: `food_safety_plans` rings true (FSMA naming shift is real); `coa_records` defer (may belong in FOOD-TRACE); VACCP/TACCP defer (enterprise food only, vendor support uneven)."*

### Report-only follow-ups (owed by other domains)

| Owed by | Finding |
| --- | --- |
| AUDIT B9 | Should own emission of `audit_finding.created` (trigger_event 349 currently emitted from FSQM in violation of the source-mastership rule). Either re-attribute or AUDIT publishes its own. |
| FOOD-TRACE B10b | `target_domain_module_id` NULL on all 4 inbound rows from FSQM, plus the 1 row outbound from FOOD-TRACE -> FSQM (`traceability_lot.created`). Cascade until FOOD-TRACE itself modularizes. |
| FOOD-TRACE B5 / catalog-wide M7 | `supplier_certifications` (id 498) is mastered by BOTH SUP-LIFE (28) AND FOOD-TRACE (155). Single-master rule violated. Decide which side keeps the master; the other demotes to embedded_master. FSQM is a contributor on this entity, the conflict is upstream. |
| MDM / SUP-LIFE catalog-wide M7 | `suppliers` (id 206) is mastered by BOTH SUP-LIFE (28) AND MDM (87). Single-master rule violated. Decide which side keeps the master; the other demotes. FSQM is a consumer of `suppliers`, the conflict is upstream. |
| GRC B10b | `target_domain_module_id` NULL on the 2 inbound rows from FSQM (`ccp_measurement.deviation`, `allergen_program.violation_detected`). Cascade until GRC modularizes those specific receiving modules. |
| MFG-OPS B10b | `target_domain_module_id` NULL on the 2 inbound rows from FSQM (`critical_control_point.deviation`, `sanitation_record.completed`). Cascade. |
| DAIRY-MGMT B10b | `source_domain_module_id` NULL on the 2 outbound rows DAIRY-MGMT -> FSQM (`milk_quality_test.failed`, `cow_health_event.treatment_administered`). Cascade. |
| FMIS B10b | `source_domain_module_id` NULL on the 1 outbound row FMIS -> FSQM (`field_application.recorded`). Cascade. |

These items NEVER block FSQM's audit closure; they surface so the user can decide whether to also schedule audits on the source domains.

## 2026-05-31, Continuation: B1 technical fixes

Loader: [.tmp_deploy/fix_fsqm_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_fsqm_b1_technical_2026_05_31.ts). Ran from project root. Idempotent.

### Applied

- **B1-S8** DELETE stale `trigger_event` 349 (`audit_finding.created`) which mis-attributed an AUDIT-mastered payload to FSQM emission. Cascade order: `handoff_processes` id=143 -> `handoffs` id=357 -> `trigger_events` id=349.
- **B1-S5** INSERT 10 `data_object_relationships` user-edges (Rule #10) covering PCQI authoring, plant manager approval, CCP monitoring, operator-recorded measurements, incident reporting + QA ownership, allergen program ownership, EMP sample collection, sanitor performance + supervisor verification. All `<master> -> users (748)`, `many_to_many`, `reference`, `owner_side=source`. New ids 1805..1814.
- **B1-S4** INSERT 5 intra-domain `data_object_relationships` (verbs `defines`, `is monitored by`, `is verified by`, `governs`, `triggers`). New ids 1815..1819.
- **B1-S6** INSERT 4 cross-domain `data_object_relationships` (`food_safety_incidents spawns recall_events` to FOOD-TRACE, `haccp_plans is subject to audit_findings` to AUDIT with `owner_side=target`, `food_safety_incidents triggers compliance_obligations` to GRC, `haccp_plans is subject to compliance_obligations` to GRC with `owner_side=target`). New ids 1820..1823.
- **B1-H1** INSERT 10 `handoff_processes` rows (`agent_curated`) for handoffs 356, 358, 361, 971, 975, 976, 977, 978, 979, 980 against the audit's pre-specified PCF external_ids (20111, 10369, 10089, 20110, 11047, 20115, 19248, 10368, 10289, 10302). Pre-flight verified every (handoff_id, process_id) pair. New ids 606..615.

### Deferred (not applied by this loader)

- **B1-S1** A4 `catalog_tagline` / `catalog_description` (Rule #20: surface drafts to user first).
- **B1-S2** M1 module split: new entities; gated on Bucket 2 #1 module-shape decision (3-module starter vs 4-module default vs 6-module split).
- **B1-S3** B4 pattern-flag flips: per instructions, pattern flag flips deferred.
- **B1-S7** B9 missing trigger_events (`haccp_plan.due_for_review`, `food_safety_incident.opened`, `food_safety_incident.closed`, `environmental_monitoring_sample.adverse_trend`): new entities.
- **B1-S9** B11 aliases: audit lists candidates but does NOT pre-specify the `alias_type` / `solution_id` resolution required for vendor synonyms; vendor-specific terms need `solution_term` + `solution_id` arbitration before insert.
- **B1-S10** B12 lifecycle states: new entities, also cascade-blocked by M1 (per-state `domain_module_id` not resolvable until modules land).
- **B1-S11** F1/F7 legacy skill cleanup: sequenced after M1 (must not delete legacy skill 64 before module-level system skills exist).
- **B1-S12** C2 capability function-divergence override for `FSQM-AUDIT-PREP`: judgment.
- **B1-M1..M4** MISSING masters (`corrective_action_records`, `verification_records`, `mock_recalls`, `environmental_monitoring_programs`): new entities.
- **Regulations gap (S1)**: 0 `domain_regulations` rows but the food-safety regulations themselves (FSMA Preventive Controls, FDA Food Traceability, Codex HACCP, USDA FSIS HACCP, SQF, BRC GS, FSSC 22000, IFS Food) are not yet in the `regulations` table; can only link existing rows, and new regulation inserts are out of scope.
- **APQC tags for handoffs 352, 354, 355**: each already has an `agent_curated` `handoff_processes` row from a prior run with different `process_id` than this audit proposes (352 has 171 vs proposed 1570; 354 has 170 which matches proposed; 355 has 70 vs proposed 393). For 354 the proposed pair is identical to the existing row (skipped as already present); for 352 and 355 the divergent proposals would compete with the prior agent_curated rows and need user judgment.
- **Bucket 2** (4 judgment items) and **Bucket 3** (3 Phase-0 candidates) untouched per scope.

### JWT errors

None.
