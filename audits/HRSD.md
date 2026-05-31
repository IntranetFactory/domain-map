---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 10
---

# HRSD - Audit History

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 3 full modules (`HRSD-CASE-MGMT` id 75, `HRSD-EMPLOYEE-PORTAL` id 76, `HRSD-KNOWLEDGE` id 77); 2 masters (`hr_cases` id 192 on module 75, `case_categories` id 193 on module 75); 4 capabilities (all cross-cutting domain-neutral: `KNOWLEDGE-MGMT`, `AI-TRIAGE-CLASSIFICATION`, `SELF-SERVICE-PORTAL`, `APPROVAL-WORKFLOW`); 8 solutions (7 primary, 1 secondary); 6 trigger_events on HRSD-mastered entities (events 21, 454, 1218, 1225, 1226, 1227); 9 outbound cross-domain handoffs + 12 inbound cross-domain handoffs + 3 intra-domain handoffs = 24 total; 5 aliases on the 2 masters; 8 lifecycle states on `hr_cases` (5 with `requires_permission=true`), 0 lifecycle states on `case_categories` (config-shape exempt per existing `data_objects.notes` row); 2 regulations (GDPR, EU Whistleblower Protection Directive); 1 business function owner (HR Service Delivery) + 1 contributor (IT Operations); 3 roles (HRSD-AGENT, HRSD-MANAGER, HRSD-KNOWLEDGE-MANAGER) with 8 role_modules + 10 role_permissions; 3 system skills (one per module, naming convention `hrsd_<module>_agent`); 22 skill_tools rows (19 platform-tier, 3 external for compute primitives).
- **Vendor-surface basis:** ServiceNow HR Service Delivery, Workday Help, Workday Journeys, Applaud, Enboarder, Sapling (Kallidus), Leena AI, Workgrid Software. Pure-play HRSD platforms (ServiceNow HRSD, Workday Help) plus employee-portal-shaped adjacents (Applaud, Workgrid) and conversational AI (Leena AI). Compliance-specialist coverage thin (no dedicated whistleblower-intake vendor like NAVEX Ethics & Compliance flagged as solution row, though EU Whistleblower Protection Directive IS linked as a regulation).
- **Bucket 1 (in-scope, agent fixable):** 3 items.
- **Bucket 2 (surface-for-user, judgment):** 4 items.
- **Bucket 3 (Phase 0 pending, speculative):** 3 items.
- **Candidates queued to `audits/_missing-domains.md`:** 0 (HRSD-adjacent markets EMP-EXP, KMS, ITSM, HCM, ONBOARDING, IGA all exist; `EMP-LISTENING` already queued from prior EMP-EXP audit).

### Pass 1 - Structural (per-domain completeness checklist)

#### S. Structural coverage sweep

**S1 - FK coverage to `domains` for HRSD (id=22):**

| Table | FK column | HRSD rows | Expected non-zero? | Status |
|---|---|---|---|---|
| `domain_data_objects` | `domain_id` | 5 | yes | pass |
| `solution_domains` | `domain_id` | 8 | yes | pass |
| `business_function_domains` | `domain_id` | 2 | yes | pass |
| `capability_domains` | `domain_id` | 4 | yes | pass |
| `domain_regulations` | `domain_id` | 2 | optional | pass |
| `domains.parent_domain_id` | self | 0 children | optional | pass (no sub-domains) |
| `handoffs.source_domain_id` | source | 12 (9 cross-domain + 3 intra) | yes | pass |
| `handoffs.target_domain_id` | target | 15 (12 cross-domain + 3 intra) | yes | pass |
| `skills.domain_id` | (legacy) | 0 with `skill_type=system AND domain_module_id IS NULL` | zero expected | pass (F1) |
| `domain_modules.domain_id` | primary host | 3 | yes (M1) | pass |
| `domain_module_host_domains.domain_id` | additional host | 0 | optional | pass |
| `domain_aliases.domain_id` | aliases | 0 | optional | thin (recommend ≥2 for catalog search) |

**S2 - Per-module indirect coverage:**

| Module | data_objects | capabilities |
|---|---|---|
| `HRSD-CASE-MGMT` (75) | 15 (2 master + 1 consumer-req + 12 consumer-opt) | 2 (`AI-TRIAGE-CLASSIFICATION`, `APPROVAL-WORKFLOW`) |
| `HRSD-EMPLOYEE-PORTAL` (76) | 4 (all consumer-req) | 1 (`SELF-SERVICE-PORTAL`) |
| `HRSD-KNOWLEDGE` (77) | 2 (both consumer) | 1 (`KNOWLEDGE-MGMT`) |

M6 (every module realizes ≥1 capability) passes.

**S3 - Per-master indirect-table coverage:**

| data_object | states | events | aliases |
|---|---|---|---|
| `hr_cases` (192) | 8 | 5 | 3 |
| `case_categories` (193) | 0 (config-shape exempt per notes) | 1 | 2 |

#### A. Phase A - Market shape

- **A1** (domain metadata): pass. All 7 fields populated except `business_logic` which is `""`; acceptable since `crud_percentage=95` (Rule #8 exemption: `business_logic` non-empty UNLESS `crud_percentage >= 95`).
- **A2** (capabilities): pass (4 capabilities, threshold ≥3; typical 5-8 - HRSD is at the floor and could plausibly extend - see Bucket 3).
- **A3** (solutions): pass (8 solutions, 7 primary, all coverage_level set).
- **A4** (catalog UX): **FAIL** - `catalog_tagline=""` and `catalog_description=""`. Both empty. Goes to **Bucket 1** as drafting task.
- **A5** (vendor ownership refresh): skipped (opt-in only).

#### M. Phase M - Modules

- **M1**: pass (3 modules).
- **M2**: pass (4 capabilities → ≥2 modules required; HRSD has 3).
- **M4** (every capability has ≥1 realizing module): pass. `KNOWLEDGE-MGMT` → 77; `AI-TRIAGE-CLASSIFICATION` → 75; `SELF-SERVICE-PORTAL` → 76; `APPROVAL-WORKFLOW` → 75.
- **M5** (lifecycle state `domain_module_id` set): pass. All 8 `hr_cases` states have `domain_module_id=75`.
- **M6**: pass (all 3 modules realize ≥1 capability).
- **M7** (single-master integrity): pass. `hr_cases` and `case_categories` each have exactly one `role=master` row (both in module 75). No within-domain master/consumer conflict; `hr_cases` shows up as `consumer` in modules 76 and 77, which is the autonomous-deployable-units pattern (siblings consume the master in module 75). `case_categories` shows up as `consumer` in module 77, same pattern.

#### B. Phase B - Data-object footprint

- **B1**: pass (2 masters, threshold ≥1).
- **B2**: pass (`hr_cases` has `singular_label='HR Case' / plural_label='HR Cases'`; `case_categories` has both labels).
- **B3** (naming arbitration): pass for `hr_cases` (prefixed). `case_categories` is a bare-word noun, but `is_canonical_bare_word=false` is OK because the prefixed form `hrsd_case_categories` wasn't chosen and `case_categories` is sufficiently HRSD-specific that no collision exists today. Worth verifying.
- **B4** (pattern flags considered): `hr_cases` has `has_personal_content=true` (HRSD masters sensitive ER data, correct), other two flags false. `case_categories` all false (config row, correct). Positive re-eval needed for `hr_cases.has_submit_lock` (does a triaged case freeze field values until reopened?). Goes to **Bucket 2**.
- **B5** (embedded_master integrity): no `embedded_master` rows on HRSD masters; vacuously pass.
- **B6** (intra-domain master relationships): pass. `case_categories classifies hr_cases` (193→192) is loaded; `case_categories parent_of case_categories` (self-loop hierarchy) loaded; `hr_cases references knowledge_articles` (192→51, cross-master link). `hr_cases spawns service_requests` (192→48) loaded.
- **B7** (users edges): pass. `users → hr_cases` rows: `owns`, `raises`, `works on`, `approves` (4 actor verbs covering owner, requester, assignee, approver). `users → case_categories`: `manages` (admin role). Good coverage.
- **B8** (outbound cross-domain `data_object_relationships`): partial. Loaded: `hr_cases spawns iga_access_requests` (192→704), `case_categories drives knowledge_base_articles` (193→410), `case_categories drives employees` (193→31, semantically reads as a config-relationship not a workflow-spawn but acceptable). Missing for outbound handoffs to PAYROLL (`hr_case.escalated_to_payroll`), BEN-ADMIN (`hr_case.escalated_to_benefits`), KMS (`hr_case.resolved`). Each could carry a `hr_cases triggers <payload>` relationship row, but the payload IS hr_cases itself in all three cases (signal handoffs, not payload-distinct), so the cross-domain relationship isn't strictly required. Pass with note. (Inbound side is report-only per asymmetry rule.)
- **B9** (outbound `trigger_events` + `handoffs`): partial. `hr_cases` lifecycle states with `requires_permission=true`: triaged, assigned, pending_approval, resolved, reopened. Trigger events keyed against `hr_cases`: case.access_required (21), hr_case.resolved (1218), hr_case.escalated_to_payroll (1225), hr_case.escalated_to_benefits (1226), hr_case.intake_submitted (1227). Direct mapping: `resolved` → 1218 (covered); `triaged`, `assigned`, `pending_approval`, `reopened` have no matching `<entity>.<state>` event. Per B9 these are intra-domain transitions that don't fire externally, so no external event needed. Pass with note. BUT `trigger_events.id=454` (`case_category.updated`) has `event_category=""` (empty), which violates the enum constraint `lifecycle | state_change | threshold | signal`. **Goes to Bucket 1 as B1-S1.**
- **B9b** (intra-domain cross-module handoffs): pass. 3 intra-domain handoff rows loaded: 1122 (76→75 on `hr_case.intake_submitted`), 1123 (75→77 on `hr_case.resolved`), 1124 (75→77 on `case_category.updated`). Expected pairs: portal→case-mgmt (covered), case-mgmt→knowledge (covered via resolved + taxonomy). No further pairs implied by cross-master relationships.
- **B10** (inbound handoffs - REPORT ONLY): pass (12 inbound rows loaded). Discovery procedure: HRSD's non-master dependencies are 14 data_objects; for 11 we have a canonical master row in another domain (ATS for background_checks, IGA for iga_access_requests, LMS for compliance_assignments, ONBOARDING for onboarding_tasks, ITSM for service_requests + knowledge_articles, BEN-ADMIN for carrier_feeds, PA for engagement_surveys, COMP-MGMT for compensation_statements, PAYROLL for garnishment_orders, HCM for employees). All 11 have ≥1 inbound handoff loaded except `service_requests` (48) and `knowledge_articles` (51) which are inverse-direction (HRSD-EMPLOYEE-PORTAL → ITSM via 29, and HRSD-KNOWLEDGE consumes from KMS via 721 on `knowledge_base_articles` 410 - different data_object). Two HRSD-consumer dependencies have no inbound handoff: `policy_attestations` (286, mastered in GRC - covered by inbound 250) and `knowledge_articles` (51, mastered in ITSM module 43 - HRSD reads via DMDO consumer, no explicit event handoff needed since portal-side read). Pass.
- **B10b** (per-module FK on handoffs):
  - **Outbound** (HRSD source side, sets `source_domain_module_id`): pass. All 12 source rows have `source_domain_module_id` populated (75 or 76).
  - **Inbound** (HRSD target side, sets `target_domain_module_id`): pass. All 12 inbound rows have `target_domain_module_id=75` (HRSD-CASE-MGMT receives every external escalation).
  - **Other side report-only**: 6 outbound rows have NULL `target_domain_module_id` even though the target domain is modularized. These are the target domain's B10b (`HCM` 446 + 448, `KMS` 447 + 1120, `PAYROLL` 1118, `LMS` 1121). See Report-only follow-ups section.
- **B11** (aliases on non-self-explanatory masters): pass. `hr_cases` has 3 aliases (HR ticket, employee case, employee inquiry); `case_categories` has 2 (HR case taxonomy, HR case type).
- **B12** (lifecycle states + pattern flags): pass. `hr_cases` has full 8-state machine. `case_categories` is config-shape exempt with an existing `data_objects.notes` entry justifying. **Note**: that notes annotation was loaded before Rule #15 RESCINDED the config-shape license; the existing wording stays per the do-not-overwrite discipline, but its persistence is a Bucket 2 question.

#### C. Phase C - Functional ownership

- **C1**: pass. `HR Service Delivery` is the owner business function; `IT Operations` is a contributor (employee portal touches IT helpdesk integration).
- **C2**: pass. No capability-level RACI overrides loaded; the 4 cross-cutting capabilities (`KNOWLEDGE-MGMT`, `AI-TRIAGE-CLASSIFICATION`, `SELF-SERVICE-PORTAL`, `APPROVAL-WORKFLOW`) inherit the domain RACI. Acceptable.

#### D. UI spot-check

- **D1**: not run by audit subagent; orchestrator can do post-fix.

#### E. Roles & permission bundling

- **E1** (role coverage): pass. 3 roles cover the domain: HRSD-AGENT (function `HR Service Delivery`), HRSD-MANAGER (same), HRSD-KNOWLEDGE-MANAGER (same). 3 roles for a 3-module domain meets the floor.
- **E2** (2-module floor): pass. HRSD-AGENT covers 3 modules, HRSD-MANAGER covers 3 modules, HRSD-KNOWLEDGE-MANAGER covers 2 modules.
- **E3** (interaction_level set): pass. Every row has `primary` or `secondary`.
- **E4** (bundles non-empty): pass. AGENT has 5 perms (manage on 75, triage + resolve workflow gates on 75, read on 76 + 77), MANAGER has 3 (admin on 75, manage on 76 + 77), KNOWLEDGE-MANAGER has 2 (read on 75, admin on 77).
- **E5** (Path A / Path B agreement): pass. Both paths resolve to `{75, 76, 77}` for HRSD-AGENT; `{75, 76, 77}` for HRSD-MANAGER; `{75, 77}` for HRSD-KNOWLEDGE-MANAGER.
- **E6** (permission-bundle drift): pass. The workflow gates `triage_hr_case`, `resolve_hr_case` are in HRSD-AGENT; `assign_hr_case`, `approve_hr_case`, `reopen_hr_case` are not enumerated but acceptable since AGENT has tier `manage` and MANAGER has tier `admin`, both of which expand via permission_hierarchy.

#### F. Skill-layer integrity

- **F1**: pass (zero legacy `domain_id`-only system skills).
- **F2**: pass (each of 3 modules has exactly one `skill_type=system` skill: 182, 183, 184).
- **F3**: pass. Skill 182 (case_mgmt_agent) has 9 skill_tools, skill 183 (employee_portal_agent) has 6, skill 184 (knowledge_agent) has 7.
- **F4** (operation_kind ↔ data_object_id invariant): pass. All `query` and `mutate` tools have `data_object_id` set; all `compute` and `side_effect` tools have NULL.
- **F5** (Semantius score computable): pass.
  - skill 182 (`hrsd_case_mgmt_agent`): 7 / 9 platform (≈78%); 2 external (`classify_text` id 53, `generate_text` id 49).
  - skill 183 (`hrsd_employee_portal_agent`): 6 / 6 platform (100%).
  - skill 184 (`hrsd_knowledge_agent`): 6 / 7 platform (≈86%); 1 external (`generate_text` id 49).
  - **Domain strict_score**: 19 / 22 = ≈86%.
  - **Domain operational_score**: same 86% (no integration-tier tools).
- **F7** (channel primitive justification): pass. Only `notify_person` (abstraction, platform-tier) is linked; no `send_email` / `send_sms` / `post_chat_message` channel primitives on any HRSD skill. Clean.

#### H. APQC coverage

- **H1**: **FAIL**. 21 cross-domain handoffs (9 outbound + 12 inbound). Existing `handoff_processes` rows: 6 (all `discovery_*`, zero `agent_curated`). Coverage = 6 / 21 = ≈29%. Process health metric: 0 agent_curated rows; volume expectation 0.5N to 0.8N = 11 to 17 `agent_curated` rows expected. **Goes to Bucket 1 as B1-H1.** See APQC TAGGING proposals below.

### Pass 2 - Market audit (semantic)

**Vendor surface basis re-cap**: ServiceNow HRSD, Workday Help, Workday Journeys, Applaud, Enboarder, Sapling, Leena AI, Workgrid.

**MISSING entities** (in the vendor surface, not in HRSD's footprint):

1. **`hr_documents` / `employee_documents`** - HR document management is a substantive part of every HRSD platform (Workday Documents, ServiceNow Document Templates, ESS portal doc cabinets). Not currently mastered or even consumed by HRSD. Likely belongs in a separate `HCMS` (HR document management) market that already exists (id=?) - check whether HRSD should DMDO-consume documents from there. Goes to Bucket 3.
2. **`employee_journeys`** - Workday Journeys, Enboarder, Applaud all sell journey-orchestration (multi-step employee experiences spanning days/weeks: onboarding, return-from-leave, location change). Currently `onboarding_journeys` (16) exists under ONBOARDING; the HRSD-mastered version would be a journey class for non-onboarding events (leave-return, role-change, exit). Goes to Bucket 3.
3. **`case_audit_trail` / `case_communications`** - ServiceNow HRSD models the case communication thread as a first-class entity (every email/chat exchange linked to the case). Today `hr_cases.notes` carries some of this implicitly, and the platform UI likely surfaces a separate audit-log table. Worth surfacing as a Phase-B extension. Goes to Bucket 3.

**WRONG-OWNERSHIP**: none surfaced. The two HRSD masters (`hr_cases`, `case_categories`) are correctly anchored.

**SCOPE-CREEP**: none. All 13 consumer DMDOs on HRSD-CASE-MGMT correspond to genuine inbound escalation flows.

**MODULARIZATION ISSUE**: the 3-module split is conventional and matches ServiceNow's HRSD breakdown (Case Management, Employee Center, Knowledge). The cross-cutting `KNOWLEDGE-MGMT` capability anchors `HRSD-KNOWLEDGE` to the `KMS` market (Rule: capability ↔ domain dual modeling). No restructuring required.

### Pass 3 - Neighbor discovery

Auto-derived from outbound + inbound handoffs + cross-domain DMDO consumers, ranked by edge weight:

| Neighbor | Out | In | DMDO (HRSD consumes) | DMDO (other side consumes HRSD) | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|---|
| HCM (54) | 2 | 1 | 1 (`employees` consumer-req) | 0 | 0 | 4 | Pairwise (full) |
| KMS (33) | 2 | 1 | 1 (`knowledge_base_articles` consumer-opt) | 0 | 0 | 4 | Pairwise (full) |
| ITSM (1) | 1 | 0 | 2 (`service_requests` consumer-req on 76, `knowledge_articles` consumer-req on 76/77) | 0 | 1 (`hr_cases spawns service_requests`) | 4 | Pairwise (full) |
| IGA (35) | 1 | 1 | 1 (`iga_access_requests` consumer-opt) | 0 | 1 (`hr_cases spawns iga_access_requests`) | 4 | Pairwise (full) |
| PAYROLL (55) | 1 | 1 | 1 (`garnishment_orders` consumer-opt) | 0 | 0 | 3 | Pairwise (full) |
| BEN-ADMIN (61) | 1 | 1 | 1 (`carrier_feeds` consumer-opt) | 0 | 0 | 3 | Pairwise (full) |
| LMS (57) | 1 | 1 | 1 (`compliance_assignments` consumer-opt) | 0 | 0 | 3 | Pairwise (full) |
| ATS (56) | 0 | 1 | 1 (`background_checks` consumer-opt) | 0 | 0 | 2 | Lightweight |
| GRC (15) | 0 | 1 | 1 (`policy_attestations` consumer-opt) | 0 | 0 | 2 | Lightweight |
| PA (63) | 0 | 1 | 1 (`engagement_surveys` consumer-opt) | 0 | 0 | 2 | Lightweight |
| ONBOARDING (99) | 0 | 1 | 1 (`onboarding_tasks` consumer-opt) | 0 | 0 | 2 | Lightweight |
| WFM (59) | 0 | 1 | 1 (`work_shifts` consumer-opt) | 0 | 0 | 2 | Lightweight |
| COMP-MGMT (60) | 0 | 1 | 1 (`compensation_statements` consumer-opt) | 0 | 0 | 2 | Lightweight |
| ITSM-service-request (intra cluster) | also routes to ITSM-SERVICE-REQUEST module 39 | | | | | | covered above |

### Pass 4 - Pairwise reconciliation (weight ≥3)

Per-neighbor 5-section diff for the 7 full-pass neighbors. Short form below; deeper boundary analysis only when defect found.

#### HRSD ↔ HCM (weight 4)

1. Fully wired: inbound 369 (`employee.terminated` → HRSD-CASE-MGMT on `employees`).
2. NULL module FK: outbound 446 (`case.access_required` → HCM, target_module=NULL) + 448 (`case_category.updated` → HCM, target_module=NULL). The handoff notes say "no HCM module materially acts on... target_domain_module_id intentionally NULL". Per B10b sub-case "no candidate" routing: HCM has 8 modules; HCM-CORE-WORKER (54) holds `employees` master but doesn't logically consume `hr_cases`. The NULL is legitimate, but the notes annotations are Rule #15 violations (RESCINDED license). **Goes to Report-only** (HCM B10b on its own audit if user wants to consume HR case events).
3. Missing handoffs: candidate: `employee.position_changed` (HCM) → HRSD if role-change triggers a learning-journey HR case. Speculative.
4. Boundary integrity: pass (employees is canonical-mastered in HCM-CORE-WORKER).
5. Cross-relationships: 1 row (`employees spawns hr_cases` 31→192, `employees raises hr_cases` 31→192). Adequate.

#### HRSD ↔ KMS (weight 4)

1. Fully wired: inbound 721 (`knowledge_base_article.published` → HRSD-CASE-MGMT on `knowledge_base_articles`).
2. NULL module FK: outbound 447 + 1120 (`case_category.updated` and `hr_case.resolved` → KMS, target_module=NULL). KMS is modularized (id=33); needs target_module attribution. **Report-only** for KMS B10b.
3. Missing handoffs: none implied beyond what's loaded.
4. Boundary integrity: pass.
5. Cross-relationships: missing `hr_cases triggers knowledge_base_articles` row (the resolved case feeds KB authoring). Adequate via existing `case_categories drives knowledge_base_articles` (193→410).

#### HRSD ↔ ITSM (weight 4)

1. Fully wired: outbound 29 (`case.it_assistance_required` → ITSM-SERVICE-REQUEST on `service_requests`).
2. NULL module FK: none.
3. Missing handoffs: candidate inbound from ITSM-INCIDENT-MGMT to HRSD-CASE-MGMT when an incident affects an employee (e.g. broken laptop turns into HR experience case). Speculative.
4. Boundary integrity: pass.
5. Cross-relationships: pass (`hr_cases spawns service_requests` 192→48).

#### HRSD ↔ IGA (weight 4)

1. Fully wired: outbound 119 (`case.access_required` → IGA on `hr_cases`) + inbound 467 (`iga_access_request.submitted` → HRSD-CASE-MGMT).
2. NULL module FK: none.
3. Missing handoffs: none.
4. Boundary integrity: pass.
5. Cross-relationships: pass (`hr_cases spawns iga_access_requests` 192→704).

#### HRSD ↔ PAYROLL (weight 3)

1. Fully wired: inbound 416 (`garnishment_order.received`).
2. NULL module FK: outbound 1118 (`hr_case.escalated_to_payroll` → PAYROLL, target_module=NULL). Per the handoff notes "data_object 192 not in any PAYROLL module" - this is sub-case 2 of B10b. PAYROLL would need a `consumer` DMDO on hr_cases (or accept domain-level signal). **Report-only** for PAYROLL audit.
3. Missing handoffs: none additional.
4. Boundary integrity: pass.
5. Cross-relationships: none required (`hr_cases` is both source and payload).

#### HRSD ↔ BEN-ADMIN (weight 3)

1. Fully wired: outbound 1119 (`hr_case.escalated_to_benefits` → BEN-ENROLLMENT module 72) + inbound 420 (`carrier_feed.reconciled`).
2. NULL module FK: none.
3. Missing handoffs: none.
4. Boundary integrity: pass.
5. Cross-relationships: none required.

#### HRSD ↔ LMS (weight 3)

1. Fully wired: inbound 1048 (`compliance_assignment.due` → HRSD-CASE-MGMT).
2. NULL module FK: outbound 1121 (`case_category.updated` → LMS, target_module=NULL). **Report-only** for LMS audit.
3. Missing handoffs: none.
4. Boundary integrity: pass.
5. Cross-relationships: none.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-A4 | A4 | `domains.catalog_tagline` and `domains.catalog_description` both empty. Per Rule #20 these are buyer-shaped fields needed by the public catalog and site generator. | Draft both fields in buyer voice (workflow + value, not analyst voice). Surface drafts to user for review BEFORE writing. Suggested tagline shape: "Manage employee HR requests, knowledge, and case routing in one workspace." Suggested description: 1-3 paragraphs describing case intake from the employee portal, AI-assisted triage and routing, knowledge-base self-service, and resolution workflows for HRBP / specialist teams. Once user approves wording, PATCH the row. Never overwrite a non-empty value without explicit per-row approval. |
| B1-S1 | B9 (enum violation) | `trigger_events.id=454` (`case_category.updated`) has `event_category=""` (empty string). Per Rule #13 the enum allows `lifecycle | state_change | threshold | signal`. Empty is not valid. Three handoffs ride this event (447 to KMS, 448 to HCM, 1121 to LMS, 1124 intra-HRSD), so the data path is live but the metadata is malformed. | PATCH `trigger_events?id=eq.454` setting `event_category='state_change'` (the category-update is a config-mastered state transition, signaled to downstream knowledge/routing consumers). One-line surgical PATCH. |

#### APQC TAGGING (B1-H1)

21 cross-domain handoffs; 6 currently tagged (all `discovery_*`); volume expectation = 11-17 `agent_curated` rows. Proposing 15 new agent_curated rows + replacing the 4 discovery_override rows that landed semantically correct tags with no provenance upgrade needed (leave them as-is unless user wants the source flipped). Tagging strategy: `Manage employee inquiry process` (10523 L3) is the canonical HRSD-CASE-MGMT anchor for general case routing; specialty escalations get specific PCF rows.

| handoff_id | source → target | trigger_event | payload | Proposed PCF (process_name / external_id / level) | Confidence | Status |
|---|---|---|---|---|---|---|
| 29 | HRSD-EMPLOYEE-PORTAL → ITSM-SERVICE-REQUEST | `case.it_assistance_required` | `service_requests` | `Manage customer service problems, requests, and inquiries` (10388 L3) | confident L3 | KEEP existing discovery_override; semantically correct |
| 119 | HRSD-CASE-MGMT → IGA-ACCESS-REQUEST | `case.access_required` | `hr_cases` | `Manage user identity and access` (no clean PCF; closest is `Manage employee inquiry process` 10523 L3) | medium | REPLACE with `Manage employee inquiry process` (10523 L3) as agent_curated; the existing 10388 row is customer-service-shaped, not internal-access |
| 446 | HRSD-CASE-MGMT → HCM | `case.access_required` | `hr_cases` | `Manage employee information and analytics` (17056 L2) | confident L2 | REPLACE existing 10388 with 17056 (FYI broadcast to HCM about access cases) as agent_curated |
| 447 | HRSD-CASE-MGMT → KMS | `case_category.updated` | `case_categories` | `Develop and manage enterprise-wide knowledge management (KM) capability` (11073 L2) | confident L2 | NEW agent_curated |
| 448 | HRSD-CASE-MGMT → HCM | `case_category.updated` | `case_categories` | `Manage employee information and analytics` (17056 L2) | confident L2 | NEW agent_curated |
| 1118 | HRSD-CASE-MGMT → PAYROLL | `hr_case.escalated_to_payroll` | `hr_cases` | `Respond to employee payroll inquiries` (10865 L4) | confident L4 | NEW agent_curated |
| 1119 | HRSD-CASE-MGMT → BEN-ADMIN | `hr_case.escalated_to_benefits` | `hr_cases` | `Deliver employee benefits program` (10504 L4) | confident L4 (alt: `Manage employee inquiry process` 10523 L3) | NEW agent_curated |
| 1120 | HRSD-CASE-MGMT → KMS | `hr_case.resolved` | `hr_cases` | `Develop and manage enterprise-wide knowledge management (KM) capability` (11073 L2) | confident L2 | NEW agent_curated |
| 1121 | HRSD-CASE-MGMT → LMS | `case_category.updated` | `case_categories` | `Manage employee onboarding, training, and development` (20599 L2) | confident L2 | NEW agent_curated |
| 250 | GRC → HRSD-CASE-MGMT | `compliance_policy.updated` | `policy_attestations` | `Manage employee inquiry process` (10523 L3) (alt: `Manage compliance` 17467 L2) | confident L3 | NEW agent_curated |
| 721 | KMS → HRSD-CASE-MGMT | `knowledge_base_article.published` | `knowledge_base_articles` | `Manage employee inquiry process` (10523 L3) | confident L3 | NEW agent_curated |
| 467 | IGA → HRSD-CASE-MGMT | `iga_access_request.submitted` | `iga_access_requests` | `Manage employee inquiry process` (10523 L3) | confident L3 | NEW agent_curated |
| 369 | HCM → HRSD-CASE-MGMT | `employee.terminated` | `employees` | KEEP existing 20599 `Manage employee onboarding, training, and development` (L2) is acceptable but `Manage employee inquiry process` 10523 L3 is more precise (terminated employees may raise final-pay / benefits / exit cases) | medium | KEEP or upgrade to agent_curated 10523 L3 (user decision) |
| 416 | PAYROLL → HRSD-CASE-MGMT | `garnishment_order.received` | `garnishment_orders` | `Respond to employee payroll inquiries` (10865 L4) | confident L4 | NEW agent_curated |
| 402 | ATS → HRSD-CASE-MGMT | `background_check.flagged` | `background_checks` | `Manage employee relations` (17052 L2) (alt: `Manage employee grievances` 10531 L3) | confident L2 | NEW agent_curated |
| 1048 | LMS → HRSD-CASE-MGMT | `compliance_assignment.due` | `compliance_assignments` | `Manage employee inquiry process` (10523 L3) | confident L3 | NEW agent_curated |
| 429 | WFM → HRSD-CASE-MGMT | `work_shift.no_show` | `work_shifts` | `Manage employee relations` (17052 L2) | confident L2 | NEW agent_curated |
| 1137 | COMP-MGMT → HRSD-CASE-MGMT | `compensation_statement.issued` | `compensation_statements` | `Administer compensation and rewards to employees` (no clean PCF; `Manage employee inquiry process` 10523 L3 covers the case flow) | confident L3 | NEW agent_curated |
| 420 | BEN-ADMIN → HRSD-CASE-MGMT | `carrier_feed.reconciled` | `carrier_feeds` | `Deliver employee benefits program` (10504 L4) | confident L4 | NEW agent_curated |
| 1109 | PA → HRSD-CASE-MGMT | `engagement.declining` | `engagement_surveys` | `Manage employee assistance and retention` (21439 L3) | confident L3 | KEEP existing discovery_substring 16944; either KEEP or REPLACE with 21439 (more direct fit) |
| 9 | ONBOARDING → HRSD-CASE-MGMT | `task.escalation_required` | `onboarding_tasks` | `Manage employee onboarding` (10469 L3) | confident L3 | KEEP existing discovery_override 10469 |

**Deferred-to-Discover-Pass-3:** 0 rows. Every cross-domain handoff has a defensible PCF anchor under `Manage employee relations` (17052), `Manage employee inquiry process` (10523), or the specialty L2 / L3 / L4 rows above. The HRSD workflow space is well-covered by the HR-Operations PCF subtree.

#### Bucket 1 sub-categorization

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 (Bucket 3 territory) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL | 2 (B1-A4, B1-S1) |
| BOUNDARY (in-scope HRSD-side) | 0 (all NULL target_module rows are report-only on the target side) |
| APQC TAGGING | 1 line, 21 underlying rows (15 new agent_curated + 4 KEEP / replace decisions + 2 conditional) |
| **Bucket 1 total** | **3** |

### Bucket 2 - Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-1 | **Rule #15 notes pollution on existing HRSD rows.** Several rows carry auto-shaped notes loaded under the prior write-time license: handoff 446 ("Domain-level FYI 2026-05-26..."), handoff 448 (same shape), handoff 1118 ("data_object 192 not in any PAYROLL module"), handoff 1119 ("B10b attribution 2026-05-26..."), 10 DMDO rows on module 75 ("Consumed by HRSD-CASE-MGMT when an inbound handoff escalates..."), and the two `data_objects.notes` on `hr_cases` (192) and `case_categories` (193). Per Rule #15 these are now forbidden patterns. Were they user-approved at load time, or auto-populated? | Audit cannot distinguish; the wording is templated and shape-matches the RESCINDED license patterns. | (a) Confirm user-approved at load; leave in place (do-not-overwrite rule applies). (b) Confirm auto-written; PATCH all to empty string and append a Rule-#15 incident entry to `references/skill-changelog.md`. (c) Per-row review (recommended): the substantive ones (e.g. `case_categories` config-shape exemption) may stay, the templated B10b backfill notes get cleared. |
| B2-2 | **B4 positive re-evaluation for `hr_cases`.** Current flags: `has_personal_content=true` (correct, ER data is sensitive); `has_submit_lock=false`; `has_single_approver=false`. Should `has_submit_lock=true`? When a case enters `closed` (or `resolved`?) the master fields likely should freeze to preserve audit trail; reopen creates a new revision. Should `has_single_approver=true`? Cases routed for `pending_approval` typically go to one HRBP / Director; the platform model implies single-approver. Per Rule #12 default-false is not the same as false-after-review. | Workflow-shape judgment owned by user. | Per-flag yes/no. Recording the decision in `notes` is FORBIDDEN per Rule #15; capture as Decision below. |
| B2-3 | **Trigger event 21 (`case.access_required`) naming and semantics.** Event keyed on `hr_cases` (192) but the verb "access_required" reads as a derived condition rather than a lifecycle state. Two handoffs ride this event (119 → IGA, 446 → HCM). The semantic is "this case requires access-management follow-up". Is the event well-formed, or should it be repointed at a derived signal entity (similar to EMP-EXP-S8 `attrition_risk.high`)? | Architectural question about derived-signal modeling. | (a) Leave as-is, treat as conditional flag on hr_cases. (b) Rename to `hr_case.access_required` (align with naming convention `<entity>.<state>`). (c) Introduce a derived `hr_case_signals` entity. |
| B2-4 | **Role naming convention check.** Roles use prefix `HRSD-` (HRSD-AGENT, HRSD-MANAGER, HRSD-KNOWLEDGE-MANAGER). The role-naming rule (`<FUNCTION-CODE>-<ROLE-NAME>`) makes this ambiguous: `HRSD` reads as a domain code but also matches the business_function `HR Service Delivery` (id 76). Rule explicitly warns "Domain prefixes (`ATS-RECRUITER`) are an anti-pattern", but the function code IS `HRSD` (matches function name initials). Is this function-scoped (intentional, function-name initials = HRSD) or domain-scoped (accidental, anti-pattern)? | Naming ambiguity; the function `HR Service Delivery` doesn't have an enforced short code; loaders may have used the domain code as a stand-in. | (a) Confirm HRSD is the intended function code (function-scoped naming); leave as-is. (b) Rename to `HR-AGENT`, `HR-MANAGER`, `HR-KB-MGR` (or similar) to disambiguate. The role IDs and bundle rows survive on rename. |

### Bucket 3 - Phase 0 pending (speculative)

| ID | Candidate | Vendor knowledge basis | Recommended verification |
|---|---|---|---|
| B3-1 | **`employee_journeys` master + `HRSD-JOURNEY-MGMT` module candidate.** Workday Journeys, Enboarder, Applaud all sell journey-orchestration (multi-step employee experiences spanning days/weeks). Currently `onboarding_journeys` (16) exists under ONBOARDING. Non-onboarding journeys (return from leave, role change, location change, exit) have no HRSD master today. The HRSD-mastered version would be a journey class for general-purpose employee moments. | Workday Help bundles Journeys as a separate licensable surface adjacent to Help; ServiceNow has "Employee Journey Management" as a packaged offering. | Phase 0 research: confirm journey-orchestration is HRSD-mastered (vs ONBOARDING-mastered or EMP-EXP-mastered). If yes, add `employee_journeys` data_object + `HRSD-JOURNEY-MGMT` module + Phase-B / C / E / S work. |
| B3-2 | **`hr_documents` consumer footprint.** HR document management (offer letters, contract amendments, exit letters, leave letters, signed acknowledgments) is a substantive cross-cutting surface. Workday Documents, Applaud, Enboarder all carry document-cabinet shapes. HCMS market exists in the catalog (id?) but HRSD likely consumes documents from it. No DMDO links today. | Every flagship HRSD platform has a documents tab on the employee record. The document master lives in HCMS or ESIGN; HRSD-CASE-MGMT should consumer-link it (case attachments) and HRSD-EMPLOYEE-PORTAL should consumer-link it (employee self-service file access). | Phase 0 research: confirm canonical owner is HCMS (or a separate `EE-DOC-MGMT` market). Add consumer DMDOs and inbound handoffs on document publish / amendment events. |
| B3-3 | **Whistleblower / ER case sub-class capability.** EU Whistleblower Protection Directive is loaded as a regulation; NAVEX EthicsPoint, OneTrust EthicsHub, AllVoices are pure-play vendors. HRSD-CASE-MGMT today does not declare a specialty handling shape (no `whistleblower_cases` data_object, no anonymization flag, no special-routing capability). Vendors mix ER (employee relations) cases with general HRSD; some treat ethics intake as a separate domain. | The pure-play vendors are real markets; ServiceNow HRSD and Workday Help both have ER specialty workflows but don't explicitly market a whistleblower lane. Question is whether HRSD-CASE-MGMT should add a `case_subtype` discriminator or whether a new domain candidate `ETHICS-INTAKE` belongs in `_missing-domains.md`. | Phase 0 research: enumerate NAVEX / OneTrust / AllVoices / People Intouch flagship surface; decide promote-as-domain vs fold-into-HRSD. May queue `ETHICS-INTAKE` if surface differs from HRSD-CASE-MGMT enough to warrant a separate market. |

### Cross-bucket dependencies

- **B2-1 (notes pollution review) blocks Decision wording on Bucket 1 fixes.** If user picks (b) `PATCH all to empty`, the agent will need to surface a Rule-#15 incident log entry alongside the fix loader.
- **B2-2 (pattern flags) feeds into a possible B1-A4 narrative.** Buyer voice for `catalog_description` could mention "every case has a defined approver" if `has_single_approver=true`.
- **B2-3 (event 21 semantics) interacts with B1-H1 row 119.** If user reclassifies event 21, the IGA-bound APQC tag may shift (currently proposed `Manage employee inquiry process` 10523 L3 stays correct under either semantic).
- **B3-1 / B3-2 / B3-3 are independent.** Each can be vetted alone or batched.

### Per-bucket prompts

**Bucket 1 prompt:** *"Three structural fixes for HRSD: (1) draft `catalog_tagline` and `catalog_description` for review, (2) PATCH `trigger_events.id=454` to set `event_category='state_change'`, (3) load 15 new `agent_curated` APQC tags + decide on 4 KEEP / replace candidates. Approve all three or pick a subset?"*

**Bucket 2 prompt:** *"Four judgment calls: (B2-1) the notes pollution on B10b backfill rows - were they user-approved at load time? (B2-2) `hr_cases` should have `has_submit_lock=true` and `has_single_approver=true`, or stay as-is? (B2-3) `case.access_required` event semantics, leave / rename / repoint? (B2-4) HRSD role prefix function-scoped (keep) or domain-scoped (rename)?"*

**Bucket 3 prompt:** *"Three speculative gaps surfaced from the market audit: (B3-1) employee_journeys + HRSD-JOURNEY-MGMT module, (B3-2) hr_documents consumer footprint, (B3-3) whistleblower / ethics-intake specialty workflow. Vet via Phase 0 research or eyeball-mode based on which vendors you already know?"*

### Report-only follow-ups (owed by other domains)

| Owner domain | Check | Detail |
|---|---|---|
| HCM | B10b (target side) | Outbound HRSD handoffs 446 (`case.access_required`) + 448 (`case_category.updated`) have `target_domain_module_id=NULL` with notes saying "no HCM module materially acts on..." Decide whether HCM should declare a consumer DMDO on `hr_cases` (id 192) or `case_categories` (id 193) for any HCM module, or accept the NULL as a domain-level signal. |
| KMS | B10b (target side) | Outbound handoffs 447 (`case_category.updated`) + 1120 (`hr_case.resolved`) have `target_domain_module_id=NULL`. KMS is modularized (id=33); the resolved case feeds KB authoring and the taxonomy update affects classification, both should have a target module attribution. |
| PAYROLL | B10b (target side) | Outbound 1118 (`hr_case.escalated_to_payroll`) has `target_domain_module_id=NULL` with notes "data_object 192 not in any PAYROLL module". PAYROLL likely needs a consumer DMDO on `hr_cases` on whichever module handles employee inquiries (probably PAYROLL-EARNINGS-DEDUCTIONS id 92 or a `PAYROLL-EMPLOYEE-INQUIRIES` module if one exists). |
| LMS | B10b (target side) | Outbound 1121 (`case_category.updated`) has `target_domain_module_id=NULL`. LMS could consume the taxonomy update on `LMS-COMPLIANCE-TRAINING` (id 33) since case categories influence training assignment routing. |
| ITSM | B8 inbound-relationship | HRSD's outbound to ITSM (handoff 29) implies an inverse `service_requests inherits_context_from hr_cases` relationship; today only the forward `hr_cases spawns service_requests` (192→48) is loaded. ITSM-side B8 audit would pick this up. |
| HCM | B8 inbound-relationship | The HCM `employee.terminated` inbound (369) implies a cross-domain relationship; today HRSD has `employees raises hr_cases` (31→192) which covers the inverse. Adequate, no action. |
| All targets with NULL target_module | Rule #15 audit | The `notes` annotations on handoffs 446, 448, 1118, 1119 + the 10 DMDO notes on module 75 + the `data_objects.notes` on hr_cases (192) and `case_categories` (193) all match the RESCINDED-license templates from prior loads. They are HRSD-internal rows so HRSD's own audit owns the revert decision (B2-1 above); no other-domain follow-up needed. |
