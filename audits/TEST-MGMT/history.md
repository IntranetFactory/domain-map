# TEST-MGMT audit history

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

## 2026-05-31, Audit

### Summary

Validate b1 structural pass, repeat of the 2026-05-30 audit after the 2026-05-31 B1-S6 and B1-H1 fix loads. Live state confirms both fixes stuck: 12/12 trigger_event categories now populated per Rule 13 enum; 9/9 cross-domain handoffs carry agent_curated `handoff_processes` rows at `record_status='new'`. Structural gate M1 remains the dominant blocker: still zero `domain_modules`, which propagates failure to M2 through M8, B9b, B10b, B12 (`domain_module_id` anchoring), E1 through E5, F2 through F5. A2 (capabilities), A4 (catalog UX), B4 (pattern flag review), B12 (lifecycle states), and the catalog-wide `automation_scripts` collision (B1-M4 / M7) remain unresolved from the prior audit and are re-surfaced unchanged. No new findings introduced; no neighbor or pairwise pass run in this structural-only repeat.

Counts:
- Current footprint: 8 master data_objects, 0 modules, 0 capabilities, 5 solutions, 0 regulations, 1 owner business_function (Quality Engineering, id 62), 0 roles, 1 legacy `domain_id`-only `system` skill (id 113, `test-mgmt-system`) with 8 platform-covered `query` `skill_tools` rows.
- 12 trigger_events on masters, all `event_category` populated.
- 6 outbound cross-domain handoffs (782, 778, 780, 802, 779, 781) + 3 inbound (752, 768, 771); all 9 carry agent_curated APQC PCF tags at `record_status='new'`.
- Per-master indirect coverage (S3): 0 lifecycle_states across all 8 masters; trigger_events present on every master; 2 aliases per master.
- Bucket 1 (in-scope, agent fixable): 9 items.
- Bucket 2 (surface-for-user, judgment): 4 items.
- Bucket 3 (Phase 0 pending, speculative): 7 items.

### Band check results

| Band | Result | Notes |
|---|---|---|
| S1, FK-to-domains sweep | mixed | Expected-non-zero FKs that fail: `capability_domains` (A2), `domain_modules` (M1). `domain_regulations` zero, acceptable. Other expected-non-zero FKs (`business_function_domains`, `solution_domains`, `domain_data_objects`, `handoffs.source_domain_id`) all populated. |
| S2, per-module indirect | n/a | Zero modules, S2 vacuous. Routes to M1. |
| S3, per-master indirect | partial | 0 states / 8 masters (B12); events present on all 8 masters; aliases present on all 8 masters. |
| A1, domain metadata | PASS | All 7 fields populated: `crud_percentage=92`, `min_org_size='20 s <500'`, `cost_band='$$'`, `usa_market_size_usd_m=700`, `market_size_source_year=2025`, `business_logic` non-empty, `certification_required=false`. |
| A2, capabilities | FAIL | Zero `capability_domains` rows. |
| A3, solutions | PASS | 5 solutions, all `coverage_level='primary'`. |
| A4, catalog UX | FAIL | `catalog_tagline=''`, `catalog_description=''`. |
| M1, modules | FAIL | Zero `domain_modules` on this domain; zero `domain_module_host_domains` rows targeting it. Structural gate. |
| M2 to M8 | BLOCKED | All gated on M1. |
| M7, cross-domain master collision | FAIL | `automation_scripts` (id 225) carries `role='master'` in BOTH RMM (130) and TEST-MGMT (8) via the legacy `domain_data_objects` table. Once both sides modularize, the catalog-wide single-master rule applies. |
| B1, masters present | PASS | 8 masters: test_cases (572), test_suites (573), test_plans (574), test_runs (575), test_defects (576), test_environments (577), requirements_to_test_traceability (578), automation_scripts (225). |
| B2, labels | PASS | `singular_label` and `plural_label` populated on all 8. |
| B3, naming arbitration | PASS | All 8 use prefixed or compound names; `is_canonical_bare_word=false` on all 8 is consistent with no canonical claim. |
| B4, pattern flags | FAIL | All 8 masters at default `false` across the 3 pattern flags with no positive consideration record. |
| B5, embedded_master integrity | n/a | Zero `embedded_master` rows from this domain (no modules to embed onto). |
| B6, intra-domain relationships | PASS | 8 intra-domain edges (rows 385 to 392) cover plans / suites / cases / runs / defects / automation_scripts / environments / traceability. |
| B7, users edges | PASS | 8 user-edge rows from `users` (748): rows 393 to 400 cover plans, cases, runs, defects, automation_scripts, suites, environments, traceability with explicit role verbs. |
| B9, outbound events + handoffs | PASS | 12 `trigger_events` cover the published transitions; 6 outbound handoffs cover the 4 active outbound publishers. |
| B9b, intra-domain cross-module handoffs | n/a | Pre-check: zero modules. B9b vacuous; routes to M1. |
| B10b, per-module FK on handoffs | FAIL | All 6 outbound rows carry `source_domain_module_id IS NULL`; 3 outbound rows already have `target_domain_module_id` set (780 to 149, 779 to 38, 781 to 131); 3 outbound NULL on target (782 / 778 to VSDP, 802 to GRC). All 3 inbound rows carry both module FKs NULL (752 / 768 / 771; source FK owed by APIM / IPAAS / VSDP, target FK by TEST-MGMT M1). |
| B11, aliases | PASS | 14 alias rows cover all 8 masters; 2 per master typical. |
| B12, lifecycle states | FAIL | Zero `data_object_lifecycle_states` rows across all 8 masters. `test_environments` is a config-shape candidate worth surfacing; the other 7 carry clear lifecycle progressions visible in their trigger_events. |
| C1, owner function | PASS | 1 owner row (Quality Engineering, id 62). |
| C2, capability overrides | n/a | A2 fails first; no capabilities to evaluate. |
| D1, UI spot-check | not run | Audit is read-only; spot-check is an explicit user-triggered step. |
| E1 to E5 | BLOCKED | All gated on M1 (zero modules ⇒ no `role_modules` surface; 2-module floor unreachable). |
| F1, legacy domain skill | TRANSITIONAL PASS | skill 113 is the only system skill; flips to retire-and-replace once M1 lands. |
| F2 to F5 | BLOCKED | All gated on M1 (no modules ⇒ no module-level skills to score). |
| H1, APQC tagging | PASS | All 9 cross-domain handoffs carry agent_curated `handoff_processes` rows at `record_status='new'`. Catalog-quality (approved count) is 0 across all 9, expected for a fresh load awaiting user sign-off; provenance (agent_curated count) is 9 (plus 1 extra row on handoff 771 mapping to process 1939). |

### Pass 3 and Pass 4

Not re-run in this structural-only Validate b1 audit. The 2026-05-30 neighbor map (VSDP edge weight 3, then WORK-MGMT / ITSM / GRC / PROD-MGMT / APIM / IPAAS / RMM at weight 1) is unchanged because the B1-S6 / B1-H1 fixes added no new cross-domain edges. Pairwise reconciliation with VSDP also unchanged: VSDP itself is still unmodularized, so all 3 VSDP-touching handoffs (782 / 778 / 771) remain with `target_domain_module_id IS NULL` pending VSDP's own M-band.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL (S / A / M / B / C / E / F band failures)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | A2 | Zero `capability_domains` rows for TEST-MGMT. Market reads as 5 to 7 capabilities (test case authoring, test execution orchestration, defect lifecycle, automation script management, test environment management, traceability and coverage analytics, release-readiness gating). | Author 5 to 7 capabilities + `capability_domains`. Cross-cutting convention check for `TRACEABILITY` and `RELEASE-READINESS`. |
| B1-S2 | A4 | `catalog_tagline=''`, `catalog_description=''`. | Draft both per Rule 20 in buyer voice; surface for approval BEFORE writing. |
| B1-S3 | B4 | All 8 masters at default `false` across the 3 pattern flags with no positive consideration record. | Re-evaluate per master; PATCH where applicable. Record the consideration in the audit, NOT in `notes` (Rule 15). |
| B1-S4 | B12 | Zero `data_object_lifecycle_states` across all 8 masters. Trigger events imply at least 7 of the 8 carry real workflows. | Author state machines per master after M1. `test_environments` is the strongest config-shape exemption candidate; surface to user. |
| B1-S5 | F1 | Legacy `domain_id`-only system skill 113 still present. Transitional pass today; retire-and-replace once M1 lands. | After M1, DELETE skill 113 and re-anchor the 8 `query_*` `skill_tools` rows to the per-module successor skills. |

#### MISSING (modules and capabilities)

| ID | Entity | Proposed module | Notes |
|---|---|---|---|
| B1-M1 | `domain_modules` rows | Multiple (see Bucket 2 #1 for the split) | Structural gate. Resolve before B / E / F fixes load. |
| B1-M2 | `source_domain_module_id` backfill on 6 outbound + `target_domain_module_id` on 3 inbound + 3 outbound; B10b | n/a, derives from M1 | All 6 outbound rows carry `source_domain_module_id IS NULL`; 3 inbound + 3 outbound rows carry `target_domain_module_id IS NULL`. Patch via the reference backfill loader after both sides modularize. Sub-cases: WORK-MGMT (149), ITSM (38), PROD-MGMT (131) already have `target_domain_module_id` set on the rows they receive; VSDP and GRC do not. |
| B1-M3 | Legacy `domain_data_objects` to `domain_module_data_objects` migration on 8 rows | Per the chosen split | TEST-MGMT pre-dates the modularization layer; the 8 `role='master'` legacy rows need re-issuing on the right module, then the rollup becomes derived. |
| B1-M4 | Catalog-wide M7 conflict on `automation_scripts` (id 225) | Decision in Bucket 2 #2 | Legacy `domain_data_objects` shows `automation_scripts` mastered by BOTH RMM (130) and TEST-MGMT (8). Architecturally distinct (CI / QA automation vs endpoint scripts). Once modularized, single-master rule applies; one side renames or demotes. |

#### APQC TAGGING

PASS. All 9 cross-domain handoffs already carry agent_curated `handoff_processes` rows at `record_status='new'` from the 2026-05-31 B1-H1 fix load. Catalog-quality count (approved) is 0 across all 9, expected for a fresh load awaiting user sign-off. No new tagging work. Surface the approved-count gap to the user at review time.

### Bucket 2, Surface-for-user (judgment calls)

All 4 items carried unchanged from the 2026-05-30 audit:

1. **B2-1 Module split shape.** Options (a) single `TEST-MGMT-PLATFORM`, (b) two-module split `TEST-MGMT-AUTHORING` + `TEST-MGMT-EXECUTION` (recommended; matches the authoring-tier vs execution-tier vendor surface), (c) four-module split (probably over-modularized). Independent of Bucket 3.
2. **B2-2 Canonical ownership of `automation_scripts` (id 225).** Options (a) rename TEST-MGMT side to `qa_automation_scripts` (recommended; RMM owns the bare term, lower id 225 suggests prior load), (b) rename RMM side to `rmm_automation_scripts`, (c) keep dual mastery via `embedded_master` demotion. Independent of Bucket 1 modularization, but blocks B1-M3.
3. **B2-3 Modularize VSDP first?** Schedule VSDP's b1 audit alongside TEST-MGMT's fix-load so the 3 VSDP-touching handoffs (782 / 778 / 771) can resolve `target_domain_module_id` in the same pass, or accept the B10b backlog item.
4. **B2-4 `has_personal_content` on `test_defects`?** Defects routinely include screenshots, error logs, repro steps with customer data, console output. In regulated industries the flag is plausibly `true`. Options (a) flip to `true` and add personal-content workflow gates, (b) keep `false` because the market is dev-tooling and customer data in defects is incidental.

### Bucket 3, Phase 0 pending (speculative)

All 7 candidates carried unchanged from the 2026-05-30 audit:

| ID | Candidate | Proposed module | Vendor knowledge basis |
|---|---|---|---|
| B3-1 | `test_data_sets` | TEST-MGMT-EXECUTION | data-driven testing pattern, common across vendors |
| B3-2 | `test_execution_logs` | TEST-MGMT-EXECUTION | universal across vendors; either first-class or rolled into `test_runs` output |
| B3-3 | `visual_test_baselines` | TEST-AUTOMATION-PLATFORM candidate, not TEST-MGMT | likely belongs in the queued automation-platform domain |
| B3-4 | `flaky_test_signals` | TEST-MGMT-EXECUTION or analytics layer | possibly derived materialized view on `test_runs` |
| B3-5 | `release_test_gates` | TEST-MGMT-EXECUTION or VSDP | placement question between gate authority (TEST-MGMT) and gate consumer (VSDP) |
| B3-6 | TEST-AUTOMATION-PLATFORM domain candidate | new domain | pure-play test execution / AI / visual / cross-browser automation; queued via `append_missing_domain.ts` |
| B3-7 | API-TESTING domain candidate | new domain | pure-play API contract / functional testing; queued via `append_missing_domain.ts` |

### Cross-bucket dependencies

- B1-M1 is the structural gate for B1-M2, B1-M3, B1-S4 (lifecycle state `domain_module_id` anchoring), B1-S5 (F1 retirement), and B2-1 (the chosen split shape determines all of the above).
- B2-1 unblocks the entire downstream load; B1-S1 (capabilities) should be drafted in the same pass so A2 capabilities and module-realization links land together.
- B2-2 is independent of TEST-MGMT module split but blocks any embedded_master decision in B1-M3.
- B3-3, B3-6, B3-7 are correlated; vetting TEST-AUTOMATION-PLATFORM as a separate domain re-routes B3-3 out of TEST-MGMT.
- Buckets 1 and 2 cannot proceed without M-band decisions; Bucket 3 is independent of Bucket 1's fix-loads.

### Per-bucket prompts

- **Bucket 1:** Fix these now? Reply `all`, `just <IDs>`, or `skip`. Recommended order: B1-M1 (with B2-1's chosen split), then B1-S1 (capabilities), then B1-M3 (legacy DMDO migration), then B1-S4 (lifecycle states), then B1-M2 (B10b backfill), then B1-S5 (F1 retirement). B1-S2 / S3 can land in any later batch.
- **Bucket 2:** What is your call on each of B2-1 / B2-2 / B2-3 / B2-4? Each answer may unblock or re-shape a Bucket 1 fix.
- **Bucket 3:** Vet via Phase 0 research or eyeball-mode? If eyeball, name which of B3-1 to B3-7 to treat as confirmed. B3-6 and B3-7 need separate triage on `audits/_missing-domains.md`.

### Report-only follow-ups (owed by other domains)

Unchanged from 2026-05-30:

- **VSDP B9b / B10b**: 3 handoffs (782, 778, 771) touching VSDP cannot have `target_domain_module_id` patched until VSDP itself modularizes. Owed by VSDP b1.
- **GRC B10b**: handoff 802 carries `target_domain_module_id IS NULL`; owed by GRC b1 (whichever module masters `compliance_evidence`).
- **APIM B9 / B10b**: handoff 752 `source_domain_module_id` owed by APIM b1.
- **IPAAS B9 / B10b**: handoff 768 `source_domain_module_id` owed by IPAAS b1.
- **RMM B-band on `automation_scripts`**: depending on B2-2 outcome, RMM's `domain_data_objects` may need DELETE / re-insert (RMM owns that fix only if RMM is the renaming side).

These items do NOT block TEST-MGMT's green status; they are observations the user can act on by scheduling audits of the partner domains.

No JWT errors. No writes to any `notes` column. No `record_status` overrides. No vendor names in any text field.

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
