---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 22
---

# TEST-MGMT, Audit History

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 8 master data_objects (`test_cases`, `test_suites`, `test_plans`, `test_runs`, `test_defects`, `test_environments`, `requirements_to_test_traceability`, `automation_scripts`); 0 capabilities; 0 modules; 5 solutions (all `primary` coverage); 0 regulations; 12 trigger_events on masters; 6 outbound handoffs + 3 inbound handoffs; 1 owner business_function (Quality Engineering); 0 roles; 1 legacy `domain_id`-only system skill (`test-mgmt-system`, id 113) with 8 `skill_tools` rows (all `query`, all `coverage_tier='platform'`).
- Market surface basis: 6 flagship vendors. Test management pure-plays (Xray for Jira / Xpand IT, Zephyr Scale / SmartBear, TestRail / Idera, Tricentis qTest, ServiceNow Test Management). Adjacent execution-automation specialists referenced for surface comparison (mabl, BrowserStack Automate, Applitools, Tricentis Tosca) but those belong in the proposed TEST-AUTOMATION-PLATFORM candidate, not TEST-MGMT.
- **Bucket 1 (in-scope, agent fixable):** 11 items.
- **Bucket 2 (surface-for-user, judgment):** 4 items.
- **Bucket 3 (Phase 0 pending, speculative):** 7 items.

Structural pass: A1 / B1 / B2 / B3 / B6 / B7 / B9 / B11 / C1 pass. **M1 hard-fails** (zero `domain_modules` rows on a domain with 8 masters); every M / E / F2-F5 / B9b / B12 (lifecycle states) check is blocked or empty pending modularization. **M7 catalog-wide hard-fail** on `automation_scripts` (id 225, dual-mastered in TEST-MGMT and RMM via the legacy `domain_data_objects` table). **A2 hard-fails** (zero `capabilities`). **A4 fails** (empty `catalog_tagline`, `catalog_description`). **B10b fails** on every handoff (all 9 carry `source_domain_module_id IS NULL` because TEST-MGMT itself is unmodularized). **B12 fails** (zero `data_object_lifecycle_states` across all 8 masters). **F1 fails** (legacy domain-level system skill still present, but acceptable transitional state since no module-level skill exists yet, F1 flips to a fix once Phase A modules ship). **H1 fails** (zero `handoff_processes` tags across 9 cross-domain handoffs).

Domain Semantius score: uncomputable. The legacy `test-mgmt-system` skill (id 113) has 8 platform-covered `query` tools (8/8 = 100% on the skill itself), but Rule #17 wants the score per module, and there are no modules. The score becomes computable as soon as Phase A modules ship and the skill is re-anchored to a module via `domain_module_id`.

### Vendor surface basis

Pure-play test management specialists chosen, anchored against schemas these vendors expose publicly (Xray API, Zephyr Scale REST API, TestRail API v2, qTest Pulse, ServiceNow Test Management Module). The flagship surface is a small canonical set of nouns: test_cases, test_suites, test_plans, test_runs, test_steps, test_executions, defects, test_environments, requirements, test_data_sets, automation_scripts, test_execution_logs, traceability_links, attachments. The current TEST-MGMT footprint already covers the load-bearing 8 of those; gaps are predominantly modularization (M-band) and lifecycle (B12), not entity-shape.

### Pass 3, Neighbor discovery

| Neighbor | Edge weight | Edge basis |
|---|---|---|
| VSDP (id 80) | 3 | 2 outbound (`test_run.completed`, `test_run.failed`) + 1 inbound (`ci_pipeline_run.failed`). Both directions touch `test_runs` and `ci_pipeline_runs`. |
| WORK-MGMT (id 135) | 1 | 1 outbound (`test_defect.created` to module 149) + `data_object_relationships` row 402 (`test_defects spawns work_items`). |
| ITSM (id 1) | 1 | 1 outbound (`test_defect.created` to module 38) + relationship row 401 (`test_defects escalates_to service_incidents`). |
| GRC (id 15) | 1 | 1 outbound (`test_run.completed` feeds `compliance_evidence`, relationship row 403). |
| PROD-MGMT (id 101) | 1 | 1 outbound (`requirements_to_test_traceability.linked` to module 131). |
| APIM (id 79) | 1 | 1 inbound (`api_specification.updated`, relationship row 408 reverse direction). |
| IPAAS (id 36) | 1 | 1 inbound (`integration_data_mapping.updated`, relationship row 407 reverse direction). |
| RMM (id 130) | 1 | Shared master `automation_scripts` (id 225), no handoff row. M7 catalog-wide conflict (see B1-M4). |

Only VSDP clears the weight `>=3` threshold for the full 5-section pairwise diff (Pass 4). Lighter neighbors get a one-line summary in Bucket 1.

### Pass 4, Pairwise reconciliation with VSDP (edge weight 3)

VSDP itself is not yet modularized either (the `target_domain_module_id` is NULL on every VSDP-bound TEST-MGMT handoff). Most legs cannot be patched from this domain's audit, the reconciliation only catalogues what each side will owe once both sides cross the modularization line.

1. **Existing handoffs, fully wired:** none. All three (782 `test_run.failed`, 778 `test_run.completed`, 771 `ci_pipeline_run.failed`) carry both module FKs NULL.
2. **Existing handoffs with NULL module FK:** all three. PATCH candidates become available the moment TEST-MGMT and VSDP each ship `domain_modules` rows.
3. **Missing handoffs the catalog implies:** none beyond the three already loaded. The cross-master verb pair (`test_runs gates software_deployments`, `test_runs blocks ci_pipeline_runs`) is captured in `data_object_relationships` rows 404 and 405; both are event-driven realizations of `test_run.completed` / `test_run.failed` to VSDP, already covered.
4. **Boundary integrity gaps:** `software_deployments` (id 682) and `ci_pipeline_runs` (id 680) are both referenced from TEST-MGMT relationship rows but TEST-MGMT does not declare a `consumer` DMDO row for either. Once TEST-MGMT modularizes, the chosen execution module should add `consumer + optional` DMDO rows on both data_objects.
5. **Cross-domain `data_object_relationships` mirror check:** test_runs/test_defects/ci_pipeline_runs/software_deployments relationships are loaded and mirror the handoffs. No ORPHAN-RELATIONSHIP, no MISSING-RELATIONSHIP.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL (S / A / M / B / C / E / F band failures)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | A2 | Zero `capability_domains` rows for TEST-MGMT. The market reads as 5-7 capabilities (test case authoring, test execution orchestration, defect lifecycle, automation script management, test environment management, traceability and coverage analytics, release-readiness gating). | Author 5-7 `TEST-MGMT-*` capabilities + `capability_domains` rows. Apply Cross-cutting capability convention for any capability that spans `>=3` domains (`TRACEABILITY` and `RELEASE-READINESS` may be cross-cutting candidates). |
| B1-S2 | A4 | `catalog_tagline` empty, `catalog_description` empty on a populated domain. | Draft both fields per Rule #20 in buyer voice (workflow + value), surface to user for approval BEFORE writing. |
| B1-S3 | B4 | Pattern flags on every TEST-MGMT master sit at the default `false` with no positive consideration record. | Re-evaluate `has_personal_content` / `has_submit_lock` / `has_single_approver` on each of the 8 masters during the next fix-load; PATCH where applicable. Record the consideration in the audit gap report (NOT in `notes`, Rule #15). |
| B1-S4 | B12 | Zero `data_object_lifecycle_states` rows across all 8 masters. `test_cases`, `test_suites`, `test_plans`, `test_runs`, `test_defects`, `requirements_to_test_traceability`, and `automation_scripts` all have published transition events (`*.created`, `*.published`, `*.approved`, `*.completed`, `*.failed`, `*.closed`, `*.linked`) implying workflow-bearing states. | Author state machines per master (initial / workflow gates with `requires_permission=true` / terminal). `test_environments` is the strongest config-shape candidate: surface as exemption to user during fix-load, do not auto-annotate `notes` (Rule #15). |
| B1-S5 | F1 | Legacy `domain_id`-only system skill `test-mgmt-system` (id 113) still present. Acceptable as a transitional state today (no module-level skill exists yet), but becomes a retire-and-replace once Phase A modules ship. | After M-band fix lands, DELETE skill 113 and replace with per-module `<module_code_lower>_agent` rows under Rule #14 / Rule #17. The 8 existing `skill_tools` rows can be re-anchored to the matching module's new skill (`query_test_cases` to the case-management module skill, `query_test_runs` to the execution module skill, etc.). |
| B1-S6 | B-events | All 12 trigger_events on TEST-MGMT masters carry `event_category=''` (empty), Rule 13's enum requires one of `lifecycle` / `state_change` / `threshold` / `signal`. | PATCH `event_category` per event (most fall into `state_change`; `*.created` is `lifecycle`). Schema query at audit time confirmed the enum constraint applies; the empty values are a backfill gap. |

#### MISSING (modules and capabilities)

| ID | Entity | Proposed module | Notes |
|---|---|---|---|
| B1-M1 | `domain_modules` rows | Multiple (see Bucket 2 #1 for the proposed split) | TEST-MGMT has 8 masters and zero modules; M1 is the structural gate that blocks every downstream band. Resolve before B / E / F fixes load. |
| B1-M2 | `source_domain_module_id` backfill on 6 outbound handoffs + `target_domain_module_id` on 3 inbound handoffs (B10b) | n/a, derives from M1 | All 9 cross-domain handoffs leave `source_domain_module_id IS NULL`; 7 of 9 also leave `target_domain_module_id IS NULL`. Patch via the reference loader pattern (see `scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts`) after both sides modularize. Sub-cases: 3 partner domains (WORK-MGMT, ITSM, PROD-MGMT) are already partially modularized so `target_domain_module_id` is already non-NULL on those rows; the source side is the consistent gap. |
| B1-M3 | Legacy `domain_data_objects` to `domain_module_data_objects` migration on 8 rows | Per the proposed split | TEST-MGMT pre-dates the modularization layer. The 8 `domain_data_objects.role='master'` rows need re-issuing as `domain_module_data_objects.role='master'` on the right module, then the legacy rollup becomes derived. Same shape as the SMM cluster migration. |
| B1-M4 | Catalog-wide M7 conflict on `automation_scripts` (id 225) | Decision needed in Bucket 2 #2 | The legacy `domain_data_objects` table has `automation_scripts` mastered by both TEST-MGMT and RMM. These are architecturally distinct concepts (CI / QA automation scripts vs RMM endpoint scripts) that collided on the data_object name. Once modularized, the catalog-wide single-master rule applies to `domain_module_data_objects` and one side has to demote, OR one side renames the data_object. User decides. |

#### APQC TAGGING

`TEST-MGMT` publishes 6 outbound and receives 3 inbound cross-domain handoffs (9 total). H1 expects `0.5N to 0.8N`, that is 5 to 7 `agent_curated` proposals + roughly 2 to 4 deferrals. None of the 9 currently has a `handoff_processes` row.

| handoff_id | source to target | trigger_event | payload | Proposed PCF row | PCF id | Confidence |
|---|---|---|---|---|---|---|
| 782 | TEST-MGMT to VSDP | `test_run.failed` | `test_runs` | Perform quality testing | 10369 | confident L3 |
| 778 | TEST-MGMT to VSDP | `test_run.completed` | `test_runs` | Perform quality testing | 10369 | confident L3 |
| 780 | TEST-MGMT to WORK-MGMT | `test_defect.created` | `test_defects` | Eliminate quality and reliability problems | 10089 | confident L4 |
| 802 | TEST-MGMT to GRC | `test_run.completed` | `test_runs` | Monitor and test regulatory compliance position and existing controls | 16469 | confident L4 |
| 779 | TEST-MGMT to ITSM | `test_defect.created` | `service_incidents` (payload retargets to ITSM master) | Eliminate quality and reliability problems | 10089 | confident L4 |
| 781 | TEST-MGMT to PROD-MGMT | `requirements_to_test_traceability.linked` | `requirements_to_test_traceability` | Evaluate performance to requirements | 17482 | confident L3 |
| 752 | APIM to TEST-MGMT | `api_specification.updated` | `api_specifications` | Test against quality plan | 17483 | medium L4 |
| 768 | IPAAS to TEST-MGMT | `integration_data_mapping.updated` | `integration_data_mappings` | Test against quality plan | 17483 | medium L4 |
| 771 | VSDP to TEST-MGMT | `ci_pipeline_run.failed` | `ci_pipeline_runs` | Perform quality testing | 10369 | medium L3 |

Deferred-to-Discover-Pass-3: none. All 9 handoffs land cleanly on cross-industry PCF activities under the Quality Management cluster (10369, 17483, 16469) or the Defect cluster (10089). The H1 process target (`0.5N to 0.8N = 5 to 7`) is met by 9 proposed tags.

### Bucket 2, Surface-for-user (judgment calls)

1. **B2-1 Module split shape.** TEST-MGMT has 8 masters and a clean lifecycle progression (cases to suites to plans to runs to defects, plus environments + automation_scripts + traceability as orthogonal masters). Options:
   - **(a)** Single starter-feel module `TEST-MGMT-PLATFORM` covering all 8 masters (M2 vacuous, only viable if capabilities <3).
   - **(b)** Two-module split: `TEST-MGMT-AUTHORING` (cases, suites, plans, traceability) + `TEST-MGMT-EXECUTION` (runs, defects, environments, automation_scripts). Vendor-aligned, mirrors the Xray vs TestRail authoring-tier vs execution-tier surface.
   - **(c)** Four-module split: `TEST-MGMT-CASE-MGT` (cases, suites) + `TEST-MGMT-PLAN-MGT` (plans, traceability) + `TEST-MGMT-EXECUTION` (runs, environments) + `TEST-MGMT-DEFECTS` (defects). Closest to qTest's marketing surface; probably over-modularized for a market of this size.
   - Recommended: **(b)**. Then the F1 retirement pairs cleanly: `test_mgmt_authoring_agent` owns query_test_cases / query_test_suites / query_test_plans / query_requirements_to_test_traceability; `test_mgmt_execution_agent` owns the rest. Independent of Bucket 3.

2. **B2-2 Canonical ownership of `automation_scripts` (id 225).** Catalog-wide M7 conflict. RMM masters endpoint scripts (PowerShell / Bash run on remote endpoints); TEST-MGMT masters CI / QA automation scripts (Selenium / Cypress / Playwright / pytest). These are architecturally distinct, the shared name is the collision. Options:
   - **(a)** Rename TEST-MGMT side to `qa_automation_scripts` (or similar), preserve RMM as the canonical `automation_scripts` (matches the alphabetical / temporal precedent: id 225 is in the 200s, suggesting it was loaded for RMM first). Update `data_object_aliases` rows 9 and 10 (`automated test`, `test automation`) to point at the new id.
   - **(b)** Rename RMM side to `rmm_automation_scripts`. RMM's market term is normally `remote scripts` or `RMM scripts`, both are plausible disambiguators.
   - **(c)** Keep the dual mastery via `embedded_master` demotion on one side. This is technically allowed but does not match the architecturally-distinct reality.
   - Recommended: **(a)**. Apply via `scripts/loaders/rename_data_object.ts`. Independent of Bucket 1 modularization.

3. **B2-3 Modularize VSDP first?** Pairwise reconciliation with VSDP (Pass 4) cannot resolve the 3 handoff rows until both sides ship `domain_modules`. The user can either schedule VSDP's b1 audit alongside TEST-MGMT's fix-load (so M-band fixes can pair) or accept that the 3 VSDP-touching handoff rows stay in the B10b backlog until VSDP audits separately. Independent of Bucket 1 / 3.

4. **B2-4 `has_personal_content` on `test_defects`?** Test defects routinely include screenshots, error logs, repro steps with customer data, and console output. In regulated industries (healthcare, banking) defects can carry PII / PHI. The pattern flag deserves a positive review, the auto-derive default of `false` is plausibly wrong. Options: (a) flip to `true` and add the personal-content workflow gates; (b) keep `false` because TEST-MGMT's market is dev-tooling and customer data in defects is incidental, not architectural. Independent of all other buckets.

### Bucket 3, Phase 0 pending (speculative)

Universal or near-universal vendor entities surfaced from market knowledge that were not anchored to a formal Phase 0 vendor-surface document for TEST-MGMT. Phase 0 vetting (formal vendor-research protocol) would confirm or filter.

| ID | Candidate | Proposed module | Vendor knowledge basis |
|---|---|---|---|
| B3-1 | `test_data_sets` | TEST-MGMT-EXECUTION | Tricentis, mabl, TestRail data-driven testing. Could be its own master or a field on `test_runs`. Phase 0 reads the vendor schemas to decide. |
| B3-2 | `test_execution_logs` | TEST-MGMT-EXECUTION | Every vendor. Often first-class master, sometimes rolled up into `test_runs` row's `output_blob`. Schema-driven decision. |
| B3-3 | `visual_test_baselines` | TEST-AUTOMATION-PLATFORM (queued candidate, not TEST-MGMT) | Applitools, Percy, mabl. Likely belongs in the TEST-AUTOMATION-PLATFORM candidate domain, not in TEST-MGMT itself. Verify by reading 3 of those vendors' core schemas. |
| B3-4 | `flaky_test_signals` | TEST-MGMT-EXECUTION or analytics layer | mabl, Datadog Test Optimization. Possibly a derived materialized view on `test_runs`, not a first-class master. Phase 0 inspects how vendors persist this. |
| B3-5 | `release_test_gates` | TEST-MGMT-EXECUTION or VSDP | Tricentis, qTest, Zephyr. Sometimes its own master (gate-record-per-release), sometimes derived from `test_plans` x `software_deployments`. Cross-domain placement question: lives in TEST-MGMT (the gate authority) or VSDP (the gate consumer)? |
| B3-6 | TEST-AUTOMATION-PLATFORM domain candidate | n/a (new domain) | Tricentis Tosca, mabl, BrowserStack Automate, Sauce Labs, Applitools, LambdaTest, Katalon. Pure-play test execution and AI / visual / cross-browser automation platforms. Distinct flagship surface from test management. Queued via `append_missing_domain.ts`. |
| B3-7 | API-TESTING domain candidate | n/a (new domain) | Postman, ReadyAPI (SmartBear), Insomnia, Bruno, Karate Labs, Apidog. Pure-play API contract / functional testing. Phase 0 decision: standalone domain, capability of APIM, or capability of TEST-MGMT? Queued via `append_missing_domain.ts`. |

### Cross-bucket dependencies

- B1-M1 (module split) is the structural gate for B1-M2, B1-M3, B1-S4 (lifecycle states are anchored to modules via `domain_module_id`), B1-S5 (F1 retirement), and B2-1 (the chosen split shape determines all of the above). Resolve B1-M1 first or schedule it inside the same fix-load as B2-1.
- B2-1 (module split shape) is the human decision that unblocks the entire downstream load. B1-S1 (capabilities) and B2-1 should be drafted together so that A2 capabilities and module-realization links are loaded in one pass.
- B2-2 (`automation_scripts` canonical) is independent of the TEST-MGMT module split but blocks any embedded_master decision in B1-M3.
- B3-3, B3-6, B3-7 are correlated: vetting TEST-AUTOMATION-PLATFORM as a separate domain re-routes B3-3 (`visual_test_baselines`) out of TEST-MGMT. Phase 0 on either of those candidates should run before B1-M1 finalizes if the user wants the TEST-MGMT module split to know whether automation-platform-shaped entities belong in TEST-MGMT or in the new domain.
- Buckets 1 and 2 cannot proceed without M-band decisions; Bucket 3 is independent of Bucket 1's fix-loads but informs Bucket 3's own resolution path.

### Per-bucket prompts

- **Bucket 1:** Fix these now? Reply `all`, `just <IDs>`, or `skip`. The recommended order is B1-M1 (with B2-1's chosen split) then B1-S1 (capabilities) then B1-M3 (legacy DMDO migration) then B1-S4 (lifecycle states) then B1-M2 (B10b backfill) then B1-S5 (F1 retirement) then B1-H1 (APQC tagging, 9 rows). B1-S2 / S3 / S6 can land in any later batch.
- **Bucket 2:** What is your call on each of B2-1 / B2-2 / B2-3 / B2-4? Each answer may unblock or re-shape a Bucket 1 fix.
- **Bucket 3:** Vet via Phase 0 research or eyeball-mode? If eyeball, name which of B3-1 to B3-7 to treat as confirmed. The two queued candidate domains (B3-6, B3-7) need separate triage on `audits/_missing-domains.md`.

### Report-only follow-ups (owed by other domains)

These items the audit identifies but another domain owns the fix, never load from TEST-MGMT's audit.

- **VSDP B9b / B10b**: 3 handoffs (782, 778, 771) touching VSDP cannot have `target_domain_module_id` patched until VSDP itself modularizes. Owed by VSDP's b1 audit.
- **WORK-MGMT B10b**: handoff 780's `target_domain_module_id` is already set (149) but `source_domain_module_id` waits on TEST-MGMT (this domain's own M1).
- **ITSM B10b**: handoff 779's `target_domain_module_id` is 38; same pattern as WORK-MGMT.
- **PROD-MGMT B10b**: handoff 781's `target_domain_module_id` is 131; same.
- **APIM B9 / B10b**: handoff 752's `source_domain_module_id` is owed by APIM's b1 audit (whichever APIM module masters `api_specifications`).
- **IPAAS B9 / B10b**: handoff 768's `source_domain_module_id` is owed by IPAAS's b1 audit.
- **RMM B-band on `automation_scripts`**: regardless of which side renames in B2-2, the other side's `domain_data_objects` row needs DELETE / re-insert. If RMM keeps the bare `automation_scripts` name, no RMM action; if RMM renames, RMM's b1 audit owns the rename and the alias-row migration.

These items do NOT block TEST-MGMT's green status; they are observations the user can act on by scheduling audits of the source domains.

## 2026-05-31, Continuation: B1 technical fixes

Subagent pass applying the truly-technical, pre-specified subset of Bucket 1. Loader: `.tmp_deploy/fix_test_mgmt_b1_technical_2026_05_31.ts`, run from project root.

### Applied (2 of 11 B1 items)

- **B1-S6 (12 PATCHes on `trigger_events.event_category`)**: backfilled all 12 TEST-MGMT-master trigger events from empty to the enum vocabulary per Rule #13. Classification follows the audit's "*.created is lifecycle; most fall into state_change" guidance and the established catalog precedent (`digital_asset.published`, `content_locale.added`, `pay_run.cancelled` are all `lifecycle`):
  - `lifecycle` (4): `test_case.created` (857), `test_suite.published` (859), `test_defect.created` (863), `test_environment.provisioned` (865).
  - `state_change` (8): `test_case.updated` (858), `test_plan.approved` (860), `test_run.completed` (861), `test_run.failed` (862), `test_defect.closed` (864), `requirements_to_test_traceability.linked` (866), `automation_script.executed` (651), `automation_script.failed` (652).
- **B1-H1 (9 INSERTs into `handoff_processes`)**: APQC PCF tagging on all 9 TEST-MGMT cross-domain handoffs. Each row carries `role='implements'`, `proposal_source='agent_curated'`, `record_status` omitted (defaults `new`), `notes` omitted (empty per Rule #15). The audit's 5-digit PCF codes (10369, 10089, 16469, 17482, 17483) are reference labels, not table IDs; resolved to live `processes.id` values 170 / 579 / 1605 / 413 / 1670 by activity name. Inserted pairs (handoff_id → process_id, PCF name): 782→170 (Perform quality testing), 778→170, 780→579 (Eliminate quality and reliability problems), 802→1605 (Monitor and test regulatory compliance position and existing controls), 779→579, 781→413 (Evaluate performance to requirements), 752→1670 (Test against quality plan), 768→1670, 771→170.

### Deferred (9 of 11 B1 items)

Out of scope for a technical-only continuation; each requires judgment, new entity authoring, or sits behind an unresolved gate:

- **B1-S1 (A2 capabilities)**: requires authoring 5–7 new `capabilities` rows; user-judgment-shaped (Cross-cutting convention check, capability naming).
- **B1-S2 (catalog UX fields)**: explicitly subject to Rule #20's surface-before-write discipline; draft never persisted without per-row user approval.
- **B1-S3 (pattern flags consideration)**: audit says "re-evaluate"; no pre-specified PATCH list.
- **B1-S4 (lifecycle states)**: new entity inserts spanning 8 masters; requires per-master state machine design and the `test_environments` config-shape exemption decision.
- **B1-S5 (F1 retirement / re-anchor skill 113)**: gated on B1-M1 (modules must ship first).
- **B1-M1 (`domain_modules` rows)**: blocked on B2-1 (split shape is a user decision: 1-module starter vs. 2-module authoring/execution vs. 4-module split).
- **B1-M2 (B10b handoff module FK backfill)**: derives from B1-M1; even for the 3 partner-modular handoffs (target FKs 149 / 38 / 131), the source-side FK requires TEST-MGMT's own modules to exist.
- **B1-M3 (legacy `domain_data_objects` to `domain_module_data_objects` migration)**: gated on B1-M1.
- **B1-M4 (catalog-wide M7 conflict on `automation_scripts` id 225)**: explicit Bucket 2 #2 user decision (rename TEST-MGMT side, rename RMM side, or `embedded_master` demotion).

### Verification

- 12/12 event_category patches applied (no rows skipped, no pre-existing non-empty values to refuse).
- 9/9 handoff_processes inserts succeeded (no idempotency hits — table was empty for these handoff_ids).
- All 5 cited PCF activity names verified against live `processes` rows by name before insert; loader fails loudly on mismatch.

No JWT errors. No writes to any `notes` column. No `record_status` overrides. No vendor names in any text field.
