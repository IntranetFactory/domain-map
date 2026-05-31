---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 19
---

# ONBOARDING, Audit History

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 3 full modules (`ONB-JOURNEY-MGMT` 35, `ONB-DOCUMENT-INTAKE` 36, `ONB-WELCOME-EXPERIENCE` 37). No starters. No cross-host. 8 masters: `onboarding_plans` (15), `onboarding_journeys` (16), `onboarding_stages` (17), `onboarding_tasks` (18), `buddy_assignments` (19), `onboarding_cohorts` (20), `welcome_communications` (21), `onboarding_document_collections` (22). 4 embedded_masters across the modules: `employees` (31) on all three, `hcm_positions` (32) and `org_units` (34) on ONB-JOURNEY-MGMT and ONB-WELCOME-EXPERIENCE, `locations` (795) on ONB-WELCOME-EXPERIENCE. 2 contributors (`service_requests` 48, `asset_lifecycle_events` 55) on ONB-JOURNEY-MGMT, 2 consumers (`candidates` 3 and `hardware_assets` 56) on ONB-JOURNEY-MGMT, plus `onboarding_journeys` consumer rows on the two non-mastering modules. 6 capabilities (`ONBOARDING-JOURNEY-DESIGN`, `ONBOARDING-PROVISIONING-ORCHESTRATION`, `ONBOARDING-DOCUMENT-COLLECTION`, `ONBOARDING-WELCOME-EXPERIENCE`, `ONBOARDING-BUDDY-MENTORING`, `ONBOARDING-MILESTONE-TRACKING`). 14 solutions (8 primary, 6 secondary). 3 regulations (GDPR mandatory, I-9 mandatory, E-Verify conditional). 12 trigger_events on ONBOARDING masters (all `event_category='state_change'`, B9 passes). 13 outbound cross-domain handoffs (to LMS x2, ITSM x2, IGA x2, PAYROLL x2, HRSD, IWMS, EMP-EXP x2, HCM), 4 inbound cross-domain handoffs (HCM x1, ATS x3), and 5 intra-domain `lifecycle_progression` rows (1227-1230, 1232). 36 lifecycle states across the 8 masters. 9 permissions: 9 baseline (3 per module), 0 workflow-gate. 5 roles (Administrator, Hiring Manager, Onboarding Coordinator, Onboarding HR Partner, Onboarding Program Manager). 3 system skills (one per module): `onb_journey_mgmt_agent` (203) with 16 tools, `onb_document_intake_agent` (204) with 6 tools, `onb_welcome_experience_agent` (205) with 9 tools, 31 `skill_tools` rows total. 16 aliases across 8 masters. 11 `handoff_processes` rows (8 `discovery_override` + 3 `discovery_substring`; 0 `agent_curated`; 0 `record_status='approved'`).

- **Vendor-surface basis (Pass 2 flagship enumeration):** Workday Journeys, BambooHR Onboarding, HiBob Onboarding, Rippling Onboarding, iCIMS Onboard, Enboarder, Sapling (Kallidus), Talmundo, Click Boarding, Appical, Greenhouse Onboarding, SmartRecruiters Onboarding. Secondary / adjacent: Workday HCM (broader-suite onboarding bundles), ServiceNow Employee Workflows (the cross-departmental orchestration play that competes upmarket), WorkBright (compliance-heavy I-9 / E-Verify specialist), Eddy and HROnboard (SMB end of the market). The vendor list spans pure-play journey-orchestration (Enboarder, Talmundo, Click Boarding, Appical), ATS-bundled onboarding (Greenhouse, iCIMS, SmartRecruiters), HCM-bundled onboarding (Workday, BambooHR, HiBob, Rippling), and compliance specialists (WorkBright, the I-9 / E-Verify-heavy end). Coverage of the WorkBright / ServiceNow / Eddy / HROnboard slice is missing from `solutions` and surfaced in Bucket 3.

- **Bucket 1 (in-scope, agent fixable):** 7 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 7 items.

**Neighbor discovery** (ranked by edge weight: outbound + inbound + DMDO touch points + cross-relationships):

| Neighbor | Out | In | DMDO touch | Weight | Pass shape |
|---|---|---|---|---|---|
| HCM | 1 (onboarding_document_collection.completed → HCM-CORE-WORKER) | 1 (employee.created → ONB-JOURNEY-MGMT) | embedded_master `employees`, `hcm_positions`, `org_units` on multiple ONB modules | 9 | Pairwise (full) |
| ATS | 0 | 3 (candidate.hired, job_offer.accepted, job_offer.rescinded → ONB-JOURNEY-MGMT) | consumer `candidates` on ONB-JOURNEY-MGMT | 5 | Pairwise (full) |
| ITSM | 2 (task.it_provisioning_required, task.workplace_setup_required → ITSM module 39) | 0 | contributor `service_requests` on ONB-JOURNEY-MGMT | 4 | Pairwise (full) |
| IGA | 2 (task.access_provisioning_required, task.it_provisioning_required → IGA module 144) | 0 | none direct (IGA tasks land via `service_requests`) | 3 | Pairwise (full) |
| PAYROLL | 2 (journey.day_one_reached → PAYROLL module 90, onboarding_document_collection.completed → 90) | 0 | none | 3 | Pairwise (full) |
| LMS | 2 (task.compliance_training_required, onboarding_cohort.activated → LMS module 33) | 0 | none | 2 | Pairwise (full) |
| EMP-EXP | 2 (journey.day_one_reached, onboarding_stage.completed → EMP-EXP module 64) | 0 | none | 2 | Pairwise (full) |
| HRSD | 1 (task.escalation_required → HRSD module 75) | 0 | none | 1 | Lightweight |
| IWMS | 1 (task.workplace_setup_required → IWMS module 101) | 0 | none | 1 | Lightweight |
| ITAM (via lifecycle) | 0 (asset_lifecycle_events authored by ONBOARDING tasks as contributor; no explicit handoff) | 0 | contributor `asset_lifecycle_events`, consumer `hardware_assets` on ONB-JOURNEY-MGMT | 2 | Lightweight |

**Structural pass bands:**

- **A1-A3 pass.** `domains.crud_percentage=92`, `min_org_size='20 s <500'`, `cost_band='$$'`, `usa_market_size_usd_m=500`, `market_size_source_year=2024`. All seven Rule #8 fields populated. (`certification_required` not separately verified but not zero by default.)
- **M1-M7 pass.** 3 full modules on a 6-capability domain (Rule #14 floor of ≥2 modules satisfied). Each module has ≥1 master role. No starters, but starters are optional. ONB-JOURNEY-MGMT carries 5 masters, ONB-DOCUMENT-INTAKE 1 master, ONB-WELCOME-EXPERIENCE 2 masters. Module-capability assignments cover all 6 capabilities.
- **B1-B5 pass.** Lifecycle states present for every `master + required` data_object (36 states across 8 masters). Pattern flags populated. **B4 partial-fail:** `onboarding_journeys.has_personal_content=true` (correct) but no `has_submit_lock` / `has_single_approver` set; `onboarding_tasks.has_personal_content=true` but flags otherwise mostly false; `welcome_communications.has_personal_content=true`; `buddy_assignments.has_personal_content=true`. Re-evaluation surfaced as B2-S3.
- **B6-B8 pass.** Aliases populated (16 rows on 8 masters), relationships populated.
- **B9 pass.** All 12 trigger_events carry valid `event_category='state_change'`. No NULL or empty enums.
- **B9b pass.** 5 intra-domain `lifecycle_progression` rows present on a 3-module domain (≥2 expected for cross-module progression coverage; satisfied).
- **B10 partial-fail (in-scope).** Of 13 outbound + 4 inbound cross-domain handoffs, all 17 carry populated `source_domain_module_id` and `target_domain_module_id`. No NULL FK on either side. B10b clean.
- **C1-C2 pass.** Domain has solutions in `solution_domains` (14), and vendors map cleanly.
- **D1 pass.** 3 regulations attached with `applicability` set.
- **E1-E6 partial-fail.** 5 roles defined and attached via `role_modules`. 9 baseline permissions exist (one read / manage / admin per module) and are mapped to the Administrator role. The 5 ONBOARDING roles carry partial baseline coverage (Hiring Manager reads ONB-JOURNEY-MGMT and ONB-WELCOME-EXPERIENCE; Onboarding Coordinator reads ONB-WELCOME-EXPERIENCE + manages ONB-JOURNEY-MGMT; Onboarding HR Partner manages ONB-JOURNEY-MGMT + admins ONB-DOCUMENT-INTAKE; Onboarding Program Manager admins all three). **E6 hard-fail: zero workflow-gate permissions** despite 36 lifecycle states (22 of which carry `requires_permission=true`). Rule #12 mandates one `<module>:<verb>_<entity>` permission per `requires_permission=true` lifecycle state; ONBOARDING has 0 of the expected ~22. Surfaced as B1-S5.
- **F1-F5 pass.** 3 system skills (one per module, Rule #17 satisfied). Each skill has multiple `skill_tools` rows: 16 / 6 / 9. Operation_kind ↔ data_object_id invariants hold (queries / mutates carry data_object_id; side_effects do not). Semantius score (platform share of skill_tools): 27 of 31 tools on `coverage_tier='platform'` (87%); 4 on `external` (sign_document, notify_team x3). Slightly below the HCM benchmark of 92%; acceptable since e-signature and team-broadcast are workflow primitives without native substrates.
- **F7 partial-fail (Rule #15 boundary).** 16 of 31 `skill_tools` rows carry populated `notes` (justification-style strings: "cohort and team-wide announcements", "lookup ATS candidate context on candidate.hired", "I-9, NDA, offer-letter and tax-form e-signature is the workflow for this module; channel cannot be substituted", etc.). Per Rule #15 these need explicit per-row user approval at load time; same boundary call surfaced on HCM and CLM. Surfaced as B2-S2.
- **H1 hard-fail (catalog quality, headline).** 0 of 17 cross-domain handoffs carry `record_status='approved'`. 11 handoffs tagged via `discovery_*` (8 `discovery_override` mapping the IT-provisioning / HR-escalation / IWMS / HCM-doc-collection / PAYROLL handoffs to PCF 224 "Manage employee onboarding" L3 external_id 10469; 3 `discovery_substring` including the wrong mapping of `journey.day_one_reached → EMP-EXP` and `task.compliance_training_required → LMS` to PCF 1814 "Create customer journey maps" L5 external_id 19965, a CRM journey-mapping process unrelated to HR onboarding journeys). **H1 process health (side-bar):** 0 `proposal_source='agent_curated'` rows; the layered-ownership process did not fire during prior ONBOARDING work. Volume expectation per H1: 0.5N to 0.8N for N=17 → 9 to 14 `agent_curated` tags. The audit proposes 17 candidates plus 3 REPLACE candidates (where existing `discovery_*` rows are present but warrant correction). Surfaced as B1-S7.

**ONBOARDING Semantius score (strict):** ~**87%** (27 of 31 `skill_tools` rows on `coverage_tier='platform'`). The 4 external rows: `sign_document` (id 42) for I-9 / NDA / tax-form e-signature on ONB-DOCUMENT-INTAKE, `notify_team` (id 914) three times for cohort and team broadcasts on ONB-JOURNEY-MGMT and ONB-WELCOME-EXPERIENCE. Both are workflow primitives the platform has no native surface for (e-signature, group chat broadcast).

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **Rule #15 pollution on `domain_data_objects`, 6 rows** | The domain-level rollup carries notes on 6 rows: 51 (`employees` embedded_master, "Writes onboarding-state fields (pre-board start, Day-1 reached, milestones) during the journey window. Does not master core HR fields."), 92 (`service_requests` contributor, "Onboarding provisioning tasks open ITSM service requests for IT fulfilment (laptop, accounts, access)."), 98 (`asset_lifecycle_events` contributor, "Onboarding provisioning tasks generate asset-assignment lifecycle events."), 879 (`hcm_positions` embedded_master, "ONBOARDING local-masters positions for first-day-readiness checks (workstation, manager, location) when no HCM is integrated. Reads from HCM when present."), 880 (`org_units` embedded_master, "ONBOARDING local-masters org_units to scope journeys to a department/location and assign location-specific tasks; reads from HCM when integrated."), 881 (`hardware_assets` consumer, "ONBOARDING consumes hardware_assets to confirm Day-1 laptop/peripheral readiness via the ITAM lifecycle handoff."). All six restate structured `role` + `necessity` (the "local-masters when X not deployed" pattern is implicit on every embedded_master row per Rule #16) or narrate cross-domain provenance the schema already encodes. Per Rule #15 every `notes` column is empty by default and may only be populated with explicit per-row user approval. | Surface as B2-S1 (cannot resolve without user input). Default on auto-populated: PATCH all 6 rows' `notes` to empty string and append a Rule #15 incident entry to `references/skill-changelog.md`. |
| B1-S2 | **Rule #15 pollution on `skill_tools`, 16 rows** | 16 of 31 `skill_tools` rows carry populated `notes` of the F7 channel-justification / context-reminder shape. Examples: 1876 (`query_employees` on ONB-JOURNEY-MGMT, "read embedded employee shell + canonical HCM employee fields"), 1877 (`query_candidates`, "lookup ATS candidate context on candidate.hired"), 1879 (`query_hardware_assets`, "confirm Day-1 laptop/peripheral readiness via ITAM"), 1890 (`sign_document`, "I-9, NDA, offer-letter and tax-form e-signature is the workflow for this module; channel cannot be substituted"), 1895/1896 (`query_org_units` / `query_locations`, "scope welcome to department/location" / "location-specific welcome content"), 1899 (`notify_person`, "new-hire welcome cadence routed through the deployment's preferred channel"), 1900 (`notify_team`, "cohort orientation broadcasts"), 1901 (`query_positions`, "first-day-readiness check"), 1878 (`query_service_requests`, "track ITSM provisioning ticket status"), 1882 (`update_onboarding_task` on the journey skill), 1884 (`notify_person`, "new-hire / manager nudges per task"), 1885 (`notify_team`, "cohort and team-wide announcements"), 1887 (`query_employees` on ONB-DOCUMENT-INTAKE, "match doc set to employee identity"), 1891 (`notify_person` on intake), 1892 (`query_onboarding_journeys` on welcome, "read journey context for welcome scheduling"). Same boundary call as on HCM (B2-S3) and CLM (B2-S3). | Surface as B2-S2. Default on auto-populated: PATCH all 16 rows' `notes` to empty string and append a Rule #15 incident entry. |
| B1-S3 | **B10b report-only, NULL `source_domain_module_id` candidates owed by source domains** | Audit confirms 0 NULL on the source-FK column across ONBOARDING-inbound handoffs (HCM and ATS both populate the source module FK). No report-only routing for source-FK NULLs. | n/a, ONBOARDING-inbound is clean on this band. |
| B1-S4 | **Pairwise, missing consumer DMDOs on downstream domains (report-only)** | Several ONBOARDING-outbound handoffs imply consumer DMDOs on the target side that may not exist. The pattern: ONBOARDING publishes `task.it_provisioning_required` to ITSM, `task.access_provisioning_required` and `task.it_provisioning_required` to IGA, `task.escalation_required` to HRSD, `task.workplace_setup_required` to IWMS and ITSM, `task.compliance_training_required` and `onboarding_cohort.activated` to LMS, `journey.day_one_reached` and `onboarding_document_collection.completed` to PAYROLL, `journey.day_one_reached` and `onboarding_stage.completed` to EMP-EXP, `onboarding_document_collection.completed` to HCM. Each target domain's b1 audit should declare a consumer DMDO on `onboarding_tasks`, `onboarding_journeys`, `onboarding_cohorts`, or `onboarding_document_collections` per the inbound payload. | Schedule b1 audits on ITSM, IGA, HRSD, IWMS, LMS, PAYROLL, EMP-EXP so they declare the consumer DMDO. HCM's b1 audit (2026-05-30) already covered this (`onboarding_document_collections` consumer on HCM-CORE-WORKER, DMDO row exists). Not ONBOARDING's fix to make. |
| B1-S5 | **E6 hard-fail, missing workflow-gate permissions** | 22 of 36 lifecycle states carry `requires_permission=true` (state transitions: `onboarding_plans.approved/active/retired`, `onboarding_journeys.completed/cancelled`, `onboarding_stages.completed/skipped`, `onboarding_tasks.completed/skipped/cancelled`, `buddy_assignments.active/completed/cancelled`, `onboarding_cohorts.active/completed/cancelled`, `welcome_communications.sent/delivered/failed/cancelled`, `onboarding_document_collections.submitted/approved/rejected/archived`). Per Rule #12 each warrants a workflow-gate permission `<domain_module_code>:<verb>_<entity>` on the realizing module. Currently 0 of these permissions exist. The 5 ONBOARDING roles (Hiring Manager / Onboarding Coordinator / Onboarding HR Partner / Onboarding Program Manager / Administrator) carry baseline-only role_permissions. | INSERT ~22 workflow-gate permissions per the lifecycle-state → permission derivation in Rule #12. Mechanical loader (per-module: derive verbs from state transitions, prefix with `domain_module_code`, INSERT row). Then INSERT role_permission rows mapping the workflow gates to the appropriate roles (Onboarding HR Partner → `approve_onboarding_document_collection`, Onboarding Coordinator → `complete_onboarding_stage` / `complete_onboarding_task`, Onboarding Program Manager → all admin gates, etc.). |
| B1-S6 | **B4 pattern-flag re-evaluation** | Current flags: `onboarding_plans.has_single_approver=true` (correct, plans go through HR-Partner approval); `onboarding_journeys.has_personal_content=true` (correct, journey state carries hire identity / contact / Day-1 readiness fields); `onboarding_tasks.has_personal_content=true` (correct, tasks reference personal info like home-address verification, banking, NDAs); `welcome_communications.has_personal_content=true` (correct); `buddy_assignments.has_personal_content=true` (correct, buddy is a person and mentee carries new-hire personal context); `onboarding_document_collections.has_personal_content=true`, `has_submit_lock=true`, `has_single_approver=true` (correct, doc collection is the highest-sensitivity entity, locks on submit, single HR approver). Likely gaps: `onboarding_journeys.has_submit_lock` should likely be `true` once the journey activates (in_progress / completed states are append-only operationally), and `onboarding_journeys.has_single_approver=true` for the final completion gate. `onboarding_tasks.has_submit_lock=true` once completed. | Surface specifics as B2-S3. PATCH flags after user confirmation. |
| B1-S7 | **H1 (hard fail), APQC tagging** | Of 17 cross-domain handoffs, 11 carry `handoff_processes` rows. **All 11 are `proposal_source ∈ ('discovery_override', 'discovery_substring')`; zero `agent_curated`; zero `record_status='approved'`.** Catalog quality = 0 approved. Process health side-bar: 0 `agent_curated`. The 8 `discovery_override` rows map provisioning / escalation / workplace-setup handoffs to PCF 224 "Manage employee onboarding" L3 external_id 10469, which is broadly correct but coarse. The 3 `discovery_substring` rows include 2 **wrong tags**: handoff 7 (`journey.day_one_reached → PAYROLL`) and handoff 409 (`journey.day_one_reached → EMP-EXP`) both map to PCF 1814 "Create customer journey maps" L5 external_id 19965, a CRM customer-journey-mapping process unrelated to HR onboarding (the substring matcher caught "journey" without the HR context). 1 row (handoff 394 `candidate.hired → ONBOARDING` mapped to "Recruit/Source candidates" 10440) is reasonable but warrants `agent_curated` confirmation. Volume expectation per H1: 0.5N to 0.8N for N=17 → 9 to 14 agent_curated tags. The audit proposes the candidates in the H1 sub-table below. | Insert / replace `handoff_processes` rows per the candidate table. Each new row: `(handoff_id, process_id, proposal_source='agent_curated', record_status='new', role='implements')`. The PCF `process_id` lookup happens at fix time via `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry`. |

#### B1-S7 APQC TAGGING (proposed candidates)

H1 is a single Bucket 1 item even though it proposes ~20 row inserts. Counts as one B1 row in the bucket summary.

**Strategy.** All outbound handoffs sit under the L2 ancestor PCF 41 "Manage employee onboarding, training, and development" (20599). The audit proposes L3 / L4 children that more specifically describe each target. The PCF `external_id` hints below are best-effort; the loader's substring-first matcher resolves them at fix time.

**Outbound (ONBOARDING-published, target = downstream domain):**

| handoff_id | source → target (module → domain) | trigger_event | Proposed PCF row | Confidence |
|---|---|---|---|---|
| 4 | ONB-JOURNEY-MGMT → ITSM module 39 | `task.it_provisioning_required` | Manage IT services (subprocess of Manage IT 10566 L2; "Manage IT service requests" L4) | confident L4, REPLACE existing 10469 mapping |
| 408 | ONB-JOURNEY-MGMT → ITSM module 39 | `task.workplace_setup_required` | Manage IT services (subprocess of 10566) | confident L4, REPLACE existing 10469 mapping |
| 5 | ONB-JOURNEY-MGMT → IGA module 144 | `task.access_provisioning_required` | Provision user access (subprocess of Manage IT security 10566) | confident L4, REPLACE existing 10469 mapping |
| 407 | ONB-JOURNEY-MGMT → IGA module 144 | `task.it_provisioning_required` | Provision user access (subprocess of 10566) | confident L4, REPLACE existing 10469 mapping |
| 6 | ONB-JOURNEY-MGMT → IWMS module 101 | `task.workplace_setup_required` | Manage workplace facilities (10778 L3 Real Estate Management) | confident L3, REPLACE existing 10469 mapping |
| 9 | ONB-JOURNEY-MGMT → HRSD module 75 | `task.escalation_required` | Manage employee inquiries (10550 L3 HR Service Delivery) | confident L3, REPLACE existing 10469 mapping |
| 8 | ONB-JOURNEY-MGMT → LMS module 33 | `task.compliance_training_required` | Deliver employee training (10546 L3) | confident L3, REPLACE existing 10469 mapping |
| 1233 | ONB-JOURNEY-MGMT → LMS module 33 | `onboarding_cohort.activated` | Deliver employee training (10546 L3) | confident L3, INSERT new tag |
| 7 | ONB-JOURNEY-MGMT → PAYROLL module 90 | `journey.day_one_reached` | Manage payroll (10539 L3) | confident L3, REPLACE wrong 19965 "Create customer journey maps" mapping |
| 411 | ONB-DOCUMENT-INTAKE → PAYROLL module 90 | `onboarding_document_collection.completed` | Manage payroll (10539 L3) | confident L3, INSERT new tag |
| 410 | ONB-DOCUMENT-INTAKE → HCM module 54 | `onboarding_document_collection.completed` | Onboard new employees (10543 L4 under Manage employee onboarding 10469) | confident L4, INSERT new tag |
| 1231 | ONB-JOURNEY-MGMT → EMP-EXP module 64 | `onboarding_stage.completed` | Manage employee engagement (subprocess of 10545 Develop and counsel employees) | medium L4, INSERT new tag |
| 409 | ONB-JOURNEY-MGMT → EMP-EXP module 64 | `journey.day_one_reached` | Manage employee engagement (subprocess of 10545) | medium L4, REPLACE wrong 19965 "Create customer journey maps" mapping |

**Inbound (ONBOARDING-received, source = upstream domain):**

| handoff_id | source → target | trigger_event | Proposed PCF row | Confidence |
|---|---|---|---|---|
| 3 | HCM → ONB-JOURNEY-MGMT | `employee.created` | Onboard new employees (10543 L4 under 10469 Manage employee onboarding) | confident L4, REPLACE existing L2 20599 mapping with tighter L4 |
| 394 | ATS → ONB-JOURNEY-MGMT | `candidate.hired` | Onboard new employees (10543 L4) | confident L4, REPLACE existing 10440 "Recruit/Source candidates" with the receiving-side onboarding L4 |
| 2 | ATS → ONB-JOURNEY-MGMT | `job_offer.accepted` | Onboard new employees (10543 L4) | confident L4, INSERT new tag |
| 1074 | ATS → ONB-JOURNEY-MGMT | `job_offer.rescinded` | Onboard new employees (10543 L4) or Manage attrition events L4 | medium, INSERT new tag |

**Intra-domain handoffs (lifecycle_progression, source_domain = target_domain = 99):** 5 rows (1227, 1228, 1229, 1230, 1232). Intra-domain handoffs typically don't require PCF tagging (no cross-domain process to map), per the H1 convention. Excluded from the H1 count.

**Total H1 candidates:** 17 outbound + inbound rows. 9 are REPLACE candidates (where existing `discovery_*` rows are coarse or wrong) and 8 are INSERT candidates.

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 (routes to Bucket 3 per market-audit Pass 2 candidates) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (B-band, E6) | 2 (B1-S5 workflow-gate permissions, B1-S6 pattern flags) |
| BOUNDARY (NULL FK or missing handoff) | 0 (B10 clean on ONBOARDING side) |
| Rule #15 incident (notes pollution) | 2 (B1-S1 DDO rows, B1-S2 skill_tools rows; surfaced for user approval via B2-S1 / B2-S2) |
| **APQC TAGGING** (per-handoff PCF activity classification) | 1 (B1-S7, covers ~17 row inserts / replaces) |
| MODULARIZATION ISSUES | 0 (route to Bucket 3 if surfaced) |
| **Bucket 1 total** | **7 line items** (S1, S2, S4, S5, S6, S7, plus S3 = clean placeholder) |

#### Boundary findings per neighbor (Pass 4 pairwise reconciliation)

The 5-section pairwise diff produces these per-neighbor findings for the 7 heavy neighbors (edge weight ≥3).

**HCM ↔ ONBOARDING (weight 9).** Wired pairs: 2 (handoff 3 HCM→ONB `employee.created`, handoff 410 ONB→HCM `onboarding_document_collection.completed`). Section 2 (NULL FK): clean. Section 3 (missing handoffs): a likely missing handoff is HCM-ORG-POSITIONS → ONB-JOURNEY-MGMT on `hcm_position.approved_for_creation` (drives pre-board orchestration scoped to a confirmed position). Surface as B2-S4. Section 4 (boundary integrity): ONBOARDING embedded-masters `employees` / `hcm_positions` / `org_units` correctly point at HCM masters (canonical masters exist on HCM-CORE-WORKER and HCM-ORG-POSITIONS, satisfying Rule #11). HCM's b1 audit (2026-05-30) declared the consumer DMDO `onboarding_document_collections` on HCM-CORE-WORKER (clean). Section 5 (cross-relationships): `employees onboarded by onboarding_journeys` (relationship 60), `employees finalized by onboarding_document_collections` (78), `employees spawns onboarding_journeys` (49). All wired.

**ATS ↔ ONBOARDING (weight 5).** Wired pairs: 3 (handoff 2 `job_offer.accepted`, 394 `candidate.hired`, 1074 `job_offer.rescinded`). Section 2: clean. Section 3: clean. Section 4: ONB-JOURNEY-MGMT carries `consumer + required` on `candidates` (DMDO 515). Clean. Section 5: clean.

**ITSM ↔ ONBOARDING (weight 4).** Wired pairs: 2 (handoff 4 `task.it_provisioning_required`, 408 `task.workplace_setup_required`). Section 2: clean. Section 3: clean. Section 4: ONB-JOURNEY-MGMT carries `contributor + required` on `service_requests` (DMDO 129) reflecting that ONBOARDING tasks open ITSM service requests. Clean. Section 5: clean.

**IGA ↔ ONBOARDING (weight 3).** Wired pairs: 2 (handoff 5 `task.access_provisioning_required`, 407 `task.it_provisioning_required`). Section 2: clean. Section 3: clean. Section 4: ONBOARDING does not declare a contributor DMDO on `iga_access_requests` (704) despite handoffs 5 / 407 implying ONBOARDING-task-driven access requests. **Boundary candidate, in-scope** (could be added as B1-S8 but routes through judgment). Section 5: relationship 77 `onboarding_tasks spawns iga_access_requests` is wired. Surface as B2-S5.

**PAYROLL ↔ ONBOARDING (weight 3).** Wired pairs: 2 (handoff 7 `journey.day_one_reached`, 411 `onboarding_document_collection.completed`). Section 2: clean. Section 3: clean. Section 4: clean (PAYROLL declares no consumer on ONBOARDING masters today; surfaces as B1-S4 follow-up under PAYROLL audit). Section 5: relationship 79 `pay_runs activated by onboarding_journeys`, 80 `pay_runs finalized by onboarding_document_collections` already wired.

**LMS ↔ ONBOARDING (weight 2).** Wired pairs: 2 (handoff 8 `task.compliance_training_required`, 1233 `onboarding_cohort.activated`). Section 2: clean. Section 3: a likely missing handoff is LMS → ONB-JOURNEY-MGMT on `course_completion.recorded` so compliance-training task closures auto-close the matching `onboarding_tasks` row. Surface as B2-S4. Section 4: ONBOARDING does not declare a contributor / consumer DMDO on `course_enrollments` (169). Boundary candidate. Section 5: relationship 81 `onboarding_tasks spawns course_enrollments` is wired.

**EMP-EXP ↔ ONBOARDING (weight 2).** Wired pairs: 2 (handoff 409 `journey.day_one_reached`, 1231 `onboarding_stage.completed`). Section 2: clean. Section 3: clean (EMP-EXP receives surveys and engagement signals from ONBOARDING; no reverse). Section 4: clean. Section 5: relationship 82 `onboarding_journeys spawns survey_campaigns` is wired.

**Lighter neighbors (weight 1, one-line summaries):**

- **HRSD ↔ ONBOARDING (1).** Outbound 9 wired. ONB-JOURNEY-MGMT could declare consumer DMDO on `hr_cases` (192) to consume escalations back; surface as B3 candidate.
- **IWMS ↔ ONBOARDING (1).** Outbound 6 wired (manual_handoff, high friction). Boundary call: should ONBOARDING declare consumer DMDO on `workplace_service_requests` (592)? Relationship 75 `onboarding_tasks emits workplace_service_requests` already wired.
- **ITAM (via lifecycle, 2).** No explicit handoff; the contributor `asset_lifecycle_events` (DMDO 130) declares the write-side and consumer `hardware_assets` (131) declares the read-side. Clean.

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Rule #15 notes-pollution on 6 `domain_data_objects` rows.** Polluted rows: DDO 51 (employees embedded_master), 92 (service_requests contributor), 98 (asset_lifecycle_events contributor), 879 (hcm_positions embedded_master), 880 (org_units embedded_master), 881 (hardware_assets consumer). The notes describe provenance / cross-domain context ("Writes onboarding-state fields during the journey window", "ONBOARDING local-masters positions for first-day-readiness checks when no HCM is integrated", "Onboarding provisioning tasks open ITSM service requests for IT fulfilment"). Were these user-approved at load time, or auto-populated? | Cannot tell from audit alone; load-time approval status unknown. Same boundary call as HCM B2-S2 and CLM B2-S1. | (a) Confirm user-approved at load time; leave in place. (b) Confirm auto-populated; PATCH all 6 rows' `notes` to empty string and log the Rule #15 incident per the audit obligation in `references/skill-changelog.md`. |
| B2-S2 | **Rule #15 notes-pollution on 16 `skill_tools` rows.** F7 channel-justification / context strings on `query_candidates`, `query_employees`, `query_hardware_assets`, `sign_document`, `query_org_units`, `query_locations`, `notify_person`, `notify_team`, `query_positions`, `query_service_requests`, `update_onboarding_task`, etc. Mostly look like F7 justifications, but Rule #15 says no `skill_tools.notes` should be populated without per-row user approval. Same boundary as HCM B2-S3. | Rule #15 vs F7 boundary judgment; user owns the call. | (a) Confirm user-approved at load time; leave the notes in place. (b) Confirm auto-populated; PATCH `notes=''` on all 16 and log Rule #15 incident. (c) Treat F7 as satisfied via the audit conversation, leave `skill_tools` rows clean (PATCH `notes=''`). |
| B2-S3 | **B4 pattern-flag positive re-evaluation per Rule #12.** Proposed flips: `onboarding_journeys.has_submit_lock=true` (journey state machine moves are append-only once `in_progress`), `onboarding_journeys.has_single_approver=true` for the final `completed` gate (an HR-Partner / Coordinator signs off). `onboarding_tasks.has_submit_lock=true` once `completed`. `onboarding_plans.has_personal_content` stays `false` (templates do not embed PII). | Pattern flags are workflow-shape judgments the user owns. | Per-flag yes/no from user; capture in Decisions. |
| B2-S4 | **Missing handoff candidates (judgment).** Two candidates surfaced by pairwise: (1) HCM-ORG-POSITIONS → ONB-JOURNEY-MGMT on `hcm_position.approved_for_creation` so pre-board orchestration can scope to a confirmed position; today the wiring is HCM-CORE-WORKER `employee.created` only. (2) LMS → ONB-JOURNEY-MGMT on `course_completion.recorded` so compliance-training task closures auto-close matching `onboarding_tasks`. | Editorial / product-design call; user decides whether to author. | (a) Skip, both can be handled via cross-domain reads. (b) Author handoff 1 only. (c) Author handoff 2 only. (d) Author both. |
| B2-S5 | **Boundary, missing DMDO on `iga_access_requests`.** ONBOARDING outbound handoffs 5 / 407 to IGA imply ONBOARDING tasks generate / track IGA access requests, and relationship 77 says `onboarding_tasks spawns iga_access_requests`. But no DMDO row declares ONB-JOURNEY-MGMT's relationship to `iga_access_requests` (704). Similar candidate boundary on `course_enrollments` (169) for the LMS edge and `hr_cases` (192) for the HRSD edge. | Architecture call: contributor (write-side) on the tasks-spawn entities, or consumer (read-side) to track downstream completion? User decides. | (a) Add contributor + required on `iga_access_requests`, `course_enrollments`, `hr_cases` on ONB-JOURNEY-MGMT. (b) Add consumer + optional. (c) Skip, the relationship rows are enough. |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 ran semantic enumeration against the flagship vendor list (Workday Journeys, BambooHR, HiBob, Rippling, iCIMS Onboard, Enboarder, Sapling, Talmundo, Click Boarding, Appical, Greenhouse Onboarding, SmartRecruiters Onboarding). Statutory coverage today on ONBOARDING: 3 regulations (GDPR mandatory, I-9 mandatory, E-Verify conditional). Additional regulations and entities below are speculative until vetted by formal Phase 0.

The subagent recipe was not spawned (single-pass audit per orchestrator instruction); the candidates below come from the analyst's flagship-vendor knowledge.

#### MISSING entity candidates surfaced by flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module | Recommended verification |
|---|---|---|---|
| `onboarding_documents` (individual document records) | Workday "Onboarding Documents", Enboarder "Documents", Talmundo "Documents", Click Boarding "Document Tracking". Today `onboarding_document_collections` is the collection wrapper, but vendor flagship products model each document (I-9, W-4, NDA, direct-deposit, state tax) as its own record with retention / expiry / re-signature rules. The collection-only shape limits retention reporting and re-signature triggers. | ONB-DOCUMENT-INTAKE (master) | Workday docs / Enboarder docs |
| `provisioning_tasks` or differentiated task subtypes | Workday Journeys, ServiceNow Employee Workflows, Click Boarding separate IT-provisioning tasks (laptop, accounts, network) from HR-provisioning tasks (badge, parking, payroll setup) from compliance tasks (I-9 verification, background check). Currently a single `onboarding_tasks` master carries all task subtypes; the distinct workflow-routing logic per subtype is hidden in task `category` text. | ONB-JOURNEY-MGMT (sub-typing or master split) | Workday Journeys, Enboarder, Click Boarding docs |
| `onboarding_check_ins` or `pulse_check_ins` | Enboarder "Check-ins", BambooHR "30/60/90 surveys", Workday "Onboarding Check-Ins", HiBob "Check-Ins". Most flagship vendors model the 30/60/90-day check-ins as first-class records (different from generic engagement surveys, owned by the hiring manager). Currently absent on ONBOARDING; EMP-EXP carries the generic `survey_campaigns` but the 30/60/90 cadence is a journey concern. | ONB-JOURNEY-MGMT (master) or stays as derived on EMP-EXP | Enboarder, BambooHR docs |
| `manager_actions` or `manager_tasks` | Click Boarding "Manager Tasks", Workday "Manager Onboarding Activities", Enboarder "Manager Nudges". Manager-side action items (pre-board outreach, intro meeting, equipment confirmation) are modeled separately from new-hire tasks in most flagship products because they have different ownership and SLA. Currently rolled into the unified `onboarding_tasks` master. | ONB-JOURNEY-MGMT (subtype or new master) | Workday, Enboarder, Click Boarding docs |
| `background_check_records` | Most flagship onboarding products embed a `background_checks` integration point (Checkr, HireRight, Sterling), and the record itself (consent, result, adjudication, hire eligibility) is first-class. Could sit on ATS instead but the lifecycle is post-offer / pre-Day-1 which is the ONBOARDING window. | ATS or ONB-DOCUMENT-INTAKE (master) | Checkr API docs, Enboarder background-check integration |
| `equipment_orders` or `provisioning_orders` | Rippling Onboarding, Workday Procurement-linked Journeys, Enboarder "Equipment". Equipment orders to be ready on Day-1 are modeled as first-class records on flagship platforms. Could sit on PROCUREMENT / ITAM instead. | ONB-JOURNEY-MGMT (contributor) or ITAM (master) | Rippling docs, Workday Procurement docs |
| `onboarding_buddies_program` or richer `buddy_assignments` | The current `buddy_assignments` master is thin: it captures buddy-mentee pairing but does not capture program-level configuration (eligibility criteria, training, recognition, buddy pool). Workday "Mentor Programs" and Enboarder "Buddy Programs" model the program as a separate first-class entity. | ONB-WELCOME-EXPERIENCE (master) or capability extension | Workday, Enboarder docs |

#### MODULARIZATION candidates

- **ONB-JOURNEY-MGMT is over-loaded.** The module currently masters 5 entities (plans, journeys, stages, tasks, cohorts) and consumes / contributes 4 more, hosting 3 of the 6 capabilities. A plausible split: `ONB-JOURNEY-ORCHESTRATION` (plans, journeys, stages) and `ONB-TASK-EXECUTION` (tasks, cohorts, provisioning contributors). Trade-off: increased modularization vs. simpler intra-domain coupling (tasks are conceptually inside stages).
- **Compliance separation.** If `background_check_records`, refined `onboarding_documents`, and audit-trail entities get loaded, a fourth full module (`ONB-COMPLIANCE-INTAKE`) makes sense to isolate the high-sensitivity / regulatory entities. Would push ONBOARDING from 3 full modules to 4, still consistent with the 6 capabilities and per-domain ≥2 module floor.

#### Compliance regulation candidates (no entity proposed)

- **W-4 / W-2 (US federal payroll tax filings)** typically sit on PAYROLL but the form intake is in ONBOARDING. Currently uncovered.
- **OSHA new-hire safety training (US, applies to specific industries)** typically sits on LMS but cross-references onboarding compliance status.
- **State-specific new-hire reporting (US, varies by state)** typically a PAYROLL concern but ONBOARDING is the source of the new-hire signal.

### Cross-bucket dependencies

- **Bucket 2 ↔ Bucket 3 dependency.** B2-S3 pattern-flag re-evaluation may shift if Bucket 3's `onboarding_documents` (per-document records) or `provisioning_tasks` (sub-typed) get loaded: the flag matrix moves to the new entities. Recommend resolving Bucket 3 first if the user picks the vetted route; otherwise B2-S3 is independent.
- **Bucket 1 ↔ Bucket 2 dependency.** B1-S5 (workflow-gate permissions) materialization depends on the lifecycle-state matrix being stable. If Bucket 2's B2-S3 (pattern flags) leads to additional `requires_permission=true` states, the workflow-gate permission generation should defer until B2-S3 is resolved.
- **B2-S4 / B2-S5 independent** of Bucket 3; user can decide on the missing-handoff / DMDO judgment calls without waiting for vendor research.

### Per-bucket prompts

- **Bucket 1, fix these now?** Reply "all", "just S5, S6, S7", or "skip". S5 (workflow-gate permissions) is the heaviest fix and unblocks Phase E coverage. S7 (APQC tagging) materializes 17 new H1 rows that lift catalog quality.
- **Bucket 2, what's your call on each?** Reply per item. For B2-S1 / B2-S2 (Rule #15 wording asks), the agent must NOT proceed without explicit per-row approval, or explicit blanket "revert all to empty string".
- **Bucket 3, vet via Phase 0 research, or eyeball-mode?** If eyeball-mode, name which candidates to treat as confirmed (e.g. "background_check_records and onboarding_check_ins ring true; rest defer").

### Report-only follow-ups (owed by other domains)

These items route to source / target domains as per Rule #11; ONBOARDING does not own the fix.

- **PAYROLL b1 audit:** add consumer DMDO on `onboarding_journeys` (16) or `onboarding_document_collections` (22), or `pay_runs` mastership context relative to ONBOARDING handoffs 7 and 411.
- **ITSM b1 audit:** add consumer DMDO on `onboarding_tasks` (18) for handoffs 4 / 408. Today ONBOARDING-side carries contributor on `service_requests` but ITSM-side does not declare consumer on `onboarding_tasks`.
- **IGA b1 audit:** add consumer DMDO on `onboarding_tasks` for handoffs 5 / 407. Pairwise B2-S5 candidate to also add ONBOARDING contributor on `iga_access_requests` (704).
- **LMS b1 audit:** add consumer DMDO on `onboarding_tasks` for handoff 8 and on `onboarding_cohorts` (20) for handoff 1233. Consider authoring LMS → ONBOARDING `course_completion.recorded` handoff (B2-S4 candidate).
- **HRSD b1 audit:** add consumer DMDO on `onboarding_tasks` for handoff 9.
- **IWMS b1 audit:** add consumer DMDO on `onboarding_tasks` for handoff 6.
- **EMP-EXP b1 audit:** add consumer DMDO on `onboarding_journeys` for handoffs 409 / 1231.
- **HCM b1 audit (already 2026-05-30):** declared the consumer DMDO `onboarding_document_collections` on HCM-CORE-WORKER (DMDO 678 confirmed). The B1-S4 routing item on the HCM audit also captured the upstream HCM→ATS / HCM→ONBOARDING wiring.
- **ATS b1 audit:** confirm consumer / contributor pattern around `onboarding_journeys` (16) for handoffs 2, 394, 1074. The ATS source-FK populates correctly.

## 2026-05-31, Continuation: B1 technical fixes

Subagent pass under the technical-only mandate (PATCH enum backfills audit specifies; B10b FK PATCHes derivable from existing modules; INSERT `domain_regulations` to existing rows; DELETE stale rows audit names with IDs; PATCH naming renames; INSERT `data_object_relationships` user-edges per Rule #10; PATCH `permission_verb_override` audit names state+verb; INSERT `handoff_processes` APQC rows ONLY when audit pre-specifies handoff_id + resolvable PCF). Reviewed all 7 B1 items.

### Fixes applied

| Item | Action | Rows |
|---|---|---|
| (none) | — | 0 |

No writes performed. Live state unchanged.

### Deferred

| Item | Reason |
|---|---|
| B1-S1 (notes pollution on 6 DDO rows) | Rule #15 (never write `notes`). Audit explicitly routes resolution to B2-S1 ("cannot resolve without user input"). User picks revert-to-empty vs leave-in-place. |
| B1-S2 (notes pollution on 16 `skill_tools` rows) | Same shape as S1. Audit routes to B2-S2. User picks. |
| B1-S3 | Clean placeholder; no fix needed. |
| B1-S4 (consumer DMDOs on downstream domains) | Report-only; owed by ITSM / IGA / HRSD / IWMS / LMS / PAYROLL / EMP-EXP b1 audits. Not ONBOARDING's fix. |
| B1-S5 (~22 workflow-gate permissions + role mappings) | Two blockers: (1) Bucket 1 ↔ Bucket 2 dependency in audit body explicitly defers S5 materialization until B2-S3 (pattern flags) resolves, since B2-S3 may flip additional states to `requires_permission=true`. (2) Role-to-permission mapping ("Onboarding HR Partner → `approve_onboarding_document_collection`", etc.) is editorial judgment, not derivable mechanically from existing state. |
| B1-S6 (B4 pattern-flag re-evaluation) | Audit explicitly routes to B2-S3. User owns workflow-shape judgments. |
| B1-S7 (APQC tagging, 17 candidate rows) | Per-row resolvability check against `/processes`: 16 of 17 audit-named PCFs are not present in the live `apqc_pcf_cross_industry` catalog with the proposed name. Only h9 → "Manage employee inquiries" resolves cleanly to process_id 242 (`Manage employee inquiry process`, external_id 10523). The audit treats the 17 rows as a single editorial unit (REPLACE + INSERT mix); applying 1 of 17 splits the H1 fix mid-flight. Surface PCF-name unresolvability to user (audit's external_id hints 10566 / 10550 / 10546 / 10539 / 10543 / 10778 do not exist; closest matches by name: `Process payroll` 58, `Administer Payroll` 236, `Provide workspace and facilities` 345, `Manage IT user identity and authorization` 273, `Develop, conduct, and manage employee training programs` 1039, `Manage employee onboarding` 224, `Conduct employee engagement surveys` 250). |

### JWT errors

None.

### Loader path

No loader written (zero applicable fixes).

### UI links

- https://tests.semantius.app/domain_map/handoff_processes
- https://tests.semantius.app/domain_map/permissions
- https://tests.semantius.app/domain_map/role_permissions
- https://tests.semantius.app/domain_map/domain_data_objects
- https://tests.semantius.app/domain_map/skill_tools
- https://tests.semantius.app/domain_map/data_objects

