# APM (Application Portfolio Management) — Domain Completeness Audit

- **Domain:** APM, `domains.id = 10`, `domain_code = APM`
- **Domain name:** Application Portfolio Management (verified — NOT Application Performance Monitoring)
- **Description:** "Inventory and rationalisation of the enterprise application landscape, including business capabilities, technology fit, and lifecycle." (British spelling "rationalisation" present in live data; content note only, not an audit-band finding.)
- **Audit date:** 2026-06-06
- **Mode:** READ-ONLY structural completeness pass (per-domain checklist). No writes, no record_status changes, no loads.
- **Master catalog:** module slug `domain_map`, id 1001.

## Resolved scope (cached)

- **`<id>` = 10**
- **Modules (`<modIds>`):** `103` APM-PORTFOLIO-REGISTRY (full), `104` APM-RATIONALIZATION (full). No `domain_module_host_domains` rows (no cross-cutting modules hosted on APM).
- **Masters (`<masters>`):** resolved from `domain_module_data_objects` role='master' across modules 103/104 — `(267, 271, 269, 248, 268, 272, 270)` = 7 masters:
  - 267 enterprise_applications (mod 103)
  - 271 application_interfaces (mod 103)
  - 269 technology_platforms (mod 103)
  - 248 business_capability_maps (mod 103)
  - 268 application_costs (mod 104)
  - 272 application_value_scores (mod 104)
  - 270 technology_fit_assessments (mod 104)
- **users data_object id:** 748 (platform_builtin in this catalog).

---

## S. Structural coverage sweep

### S1 — Direct FK coverage to `domains` (domain_id=10)

| Table | FK column | APM rows | Expected non-zero? | Verdict |
| --- | --- | --- | --- | --- |
| business_function_domains | domain_id | 2 | yes (C1) | PASS |
| capability_domains | domain_id | 7 | yes (A2) | PASS |
| domain_aliases | domain_id | 0 | no (optional) | ok |
| domain_data_objects | domain_id | 12 | yes (B1; legacy rollup) | PASS |
| domain_module_host_domains | domain_id | 0 | routinely zero | ok |
| domain_modules | domain_id | 2 | yes (M1) | PASS |
| domain_regulations | domain_id | 0 | when applicable | note (APM is a lightly-regulated horizontal market; zero is plausible, not blocking) |
| domains.parent_domain_id | — | 0 | only if sub-domains | ok |
| handoffs.source_domain_id | — | 12 | yes for non-leaf (B9) | PASS |
| handoffs.target_domain_id | — | 2 | usually non-zero | PASS |
| skills | domain_id | 1 | yes (F2) | PASS |
| solution_domains | domain_id | 10 | yes (A3) | PASS |

No "expected non-zero" anomalies.

### S2 — Indirect per-module coverage

| Module | data_objects | capabilities | Verdict |
| --- | --- | --- | --- |
| 103 APM-PORTFOLIO-REGISTRY | 9 | 5 | PASS |
| 104 APM-RATIONALIZATION | 5 | 2 | PASS |

Both modules carry data_objects and capabilities; no empty modules.

### S3 — Per-master indirect coverage

| data_object | states | events | aliases | Notes |
| --- | --- | --- | --- | --- |
| 248 business_capability_maps | 3 | 1 | 2 | event 357 has no handoff (see B9) |
| 267 enterprise_applications | 5 | 2 | 2 | full |
| 268 application_costs | 0 | 1 | 2 | zero states (B12/B13) |
| 269 technology_platforms | 4 | 2 | 1 | full |
| 270 technology_fit_assessments | 3 | 1 | 1 | full |
| 271 application_interfaces | 3 | 1 | 2 | full |
| 272 application_value_scores | 0 | 1 | 2 | zero states (B12/B13) |

No master is all-zero. Two masters (268, 272) carry zero lifecycle states; both are currently `entity_type='unclassified'`, routing the state question through B13 first (then B12). All 7 masters have ≥1 alias and ≥1 trigger_event.

---

## A. Phase A — Market shape

- **A1 — domains business metadata.** PASS. crud_percentage=90, business_logic non-empty ("TIME (tolerate/invest/migrate/eliminate) scoring rules..."), min_org_size="40 l <10000", cost_band="$$$", usa_market_size_usd_m=400, market_size_source_year=2025, certification_required=false. All 7 fields populated.
- **A2 — capabilities linked.** PASS. 7 capabilities (BUSINESS-CAPABILITY-MAP, REFERENCE-FRAME-LIBRARY, APM-APP-INVENTORY, APM-TIME-SCORING, APM-COST-VISIBILITY, APM-INTERFACE-MAP, APM-TECH-LIFECYCLE).
- **A3 — solutions + coverage_level.** PASS. 10 solutions (8 primary, 2 secondary), coverage_level set on every row. Includes ServiceNow APM, LeanIX, MEGA HOPEX, Software AG Alfabet, Ardoq, Apptio, Software AG ARIS, Mavim, BiZZdesign Horizzon, Essential Cloud.
- **A4 — catalog UX fields.** **FAIL.** `catalog_tagline=""` and `catalog_description=""` on the domain row. Both buyer-voice fields empty.
- **A5 — vendor ownership refresh.** SKIPPED (opt-in only, not requested).

---

## M. Phase M — Modules (structural gate)

- **M1 — ≥1 module.** PASS (2 modules).
- **M2 — ≥3 capabilities ⇒ ≥2 modules.** PASS (7 caps, 2 modules).
- **M4 — every capability has ≥1 realizing module.** PASS. All 7 caps mapped: 343,344,562,565,566 → mod 103; 563,564 → mod 104.
- **M5 — gate states carry domain_module_id.** PASS. All 7 `requires_permission=true` states have `domain_module_id` set to the realizing module (267/sunsetting, 269/declining+retired, 248/published, 271/deprecated+retired → 103; 270/approved → 104).
- **M6 — every module realizes ≥1 capability.** PASS (103 → 5 caps, 104 → 2 caps).
- **M7 — single-master integrity.** **FAIL (structural gate — within-domain incoherence).**
  - Catalog-wide single-master (Query 1): PASS. Each of the 7 masters has exactly one role='master' row across the whole catalog.
  - Within-domain coherence (Query 2): **HARD FAIL.** Two data_objects are simultaneously `master` in module 103 and `consumer/necessity=required` in sibling module 104 of the SAME domain:
    - 267 enterprise_applications — master in 103, consumer+required in 104.
    - 269 technology_platforms — master in 103, consumer+required in 104.
  - Per the checklist this is "a master coexisting with consumer/contributor in the same domain is incoherent." It is NOT the allowed `master`+`embedded_master` pattern (neither row is `embedded_master`). Fix candidate: in module 104 demote to `embedded_master` (preserve standalone-deploy story) or otherwise re-model; user decides. Blocks the domain's structural green.
- **M8 — module-level catalog UX fields.** **FAIL.** Both modules have `catalog_tagline=""` and `catalog_description=""` (103 and 104). Content-quality check, not a structural gate.
- **M9 — module self-containment.** **FAIL (Part 1, entity layer).** Module 104 APM-RATIONALIZATION carries `role=consumer, necessity=required` rows on 267 enterprise_applications and 269 technology_platforms, both mastered by sibling module 103 and NOT embedded_master in 104. Under M9 Part 1 this is a self-containment violation: module 104 cannot deploy standalone without co-installing module 103. (Same two rows that drive the M7 within-domain incoherence.) Fix candidate: convert to `embedded_master` or set `necessity=optional`.
  - Part 2 (relationship layer): no `is_required=true` relationship edge among the APM masters points at an out-of-scope target. The only required edges are the two `users` edges (267, 269, 270 — users is platform_builtin, in scope) and they are fine. Part 2 PASS.

---

## B. Phase B — Data-object footprint

- **B1 — ≥1 master.** PASS (7 masters; master-bearing domain).
- **B2 — singular_label + plural_label on every master.** PASS. All 7 have both.
- **B3 — naming arbitration.** PASS. All 7 names are compound/prefixed (`enterprise_applications`, `application_interfaces`, `technology_platforms`, `business_capability_maps`, `application_costs`, `application_value_scores`, `technology_fit_assessments`) — none is a bare common-noun, so `is_canonical_bare_word=false` + empty rationale passes automatically.
- **B4 — pattern flags considered.** PASS (positively re-evaluated). `technology_fit_assessments.has_single_approver=true` (matches its `approved` gate). The other 6 masters legitimately carry no personal content, submit-lock, or single-approver pattern.
- **B5 — embedded_master integrity.** PASS (vacuous). APM holds zero `embedded_master` rows; nothing to validate.
- **B6 — intra-domain data_object_relationships.** PASS. Every master participates in ≥1 in-domain master↔master edge: 267 hub (→268 incurs, →272 scored_by, →270 assessed_in, ↔248 supports, →271 integrates_via, ↔269 runs_on); 269→270 assessed_in. All 7 masters reachable.
- **B6b — relationship shape invariants (soft).** PASS. Every relationship row has a non-empty `inverse_verb`. No `composition` edges among the masters (all `reference`); `owner_side` orientation is consistent (child-first edges correctly use `owner_side=target`).
- **B7 — users edges.** PASS. users (748) edges to all 7 masters (owns_application/267, evaluates_application_value/272, owns_application_interface/271, owns_business_capability_map/248, assesses_technology_fit/270, owns_technology_platform/269, records_application_cost/268).
- **B8 — cross-domain OUTBOUND relationships.** PASS (outbound direction). APM masters carry outbound relationship edges to foreign payloads consistent with the outbound handoffs: 267→76 configuration_items, 267→61 saas_applications, 267→57 software_titles, 271→232 data_products, 271→47 service_incidents, 269→55 asset_lifecycle_events, 269→282 compliance_risks, 248→247 business_process_models. (Inbound-direction edges from other domains are report-only — see follow-ups.)
- **B9 — outbound trigger_events + handoffs.** **FAIL.** 9 trigger_events exist across the masters; 12 outbound handoffs cover events 208, 209, 212, 936, 937, 211, 210, 213. **Event 357 `capability_map.updated` (data_object 248) has ZERO handoff rows** in either direction from APM as source. It is a `state_change` event with no subscriber. Either it is a genuine leaf (no downstream consumer of capability-map changes) and should carry a positive justification, or a missing outbound handoff. Surface for decision.
- **B9b — intra-domain cross-module handoffs.** **FAIL (non-skippable; APM has 2 modules).** Query returned ZERO handoff rows with source_domain_id=10 AND target_domain_id=10. Expected pairs derived from cross-module master relationships (registry module 103 ↔ rationalization module 104):
  - 267 (103) → 268 application_costs (104) `incurs`
  - 267 (103) → 272 application_value_scores (104) `scored_by`
  - 267 (103) → 270 technology_fit_assessments (104) `assessed_in`
  - 269 (103) → 270 (104) `assessed_in`
  These cross-module relationships imply at least one REGISTRY↔RATIONALIZATION lifecycle-progression handoff (e.g. `application.lifecycle_state_changed` driving a re-score in 104). None is loaded. In-scope fix for APM.
- **B9c — trigger_events state fields resolve (soft).** Mostly free-text `to_state` values that don't map 1:1 to lifecycle `state_name` (e.g. event 208 `application.onboarded` to_state="operate" vs lifecycle states planned/developing/operating/sunsetting/retired; event 209 to_state="any"; events 936/937 have empty from/to_state). Soft drift signals, surfaced not blocked. Recommend aligning `to_state` to the canonical lifecycle `state_name` set on 267/269.
- **B10 — inbound handoffs (REPORT ONLY).** 2 inbound handoffs exist, both from BPA (136): id 181 business_capability_maps (248), id 182 business_process_models (247). See report-only follow-ups for the discovered "owed-by" inbound gaps and the 248 attribution oddity.
- **B10b — per-module attribution on handoffs.** PASS for APM's own attribution.
  - Outbound NULL `source_domain_module_id` (source=10): ZERO rows — every outbound handoff has its source module set (103 or 104).
  - Inbound NULL `target_domain_module_id` (target=10): ZERO rows — both inbound handoffs have target_domain_module_id=103.
  - (Several outbound rows have NULL `target_domain_module_id` — 235/238→SAM, 855→GRC, 1195→GRC, 1196/1197→FINOPS/EPM, 1198→SPM — but that is the TARGET domain's B10b, report-only for those domains, not blocking here.)
- **B11 — aliases for non-self-explanatory masters.** PASS. All 7 masters carry ≥1 alias (e.g. enterprise_applications → "application"/"business application"; application_costs → "TCO"; application_value_scores → "TIME score"/"application rating").
- **B12 — lifecycle states on operational_workflow masters.** DEFERRED to B13. All 7 masters are `entity_type='unclassified'`, so none currently qualifies as `operational_workflow`; B12 cannot evaluate until B13 is fixed. After classification, 268 application_costs and 272 application_value_scores (currently 0 states) likely classify as `computed`/`operational_record` (refresh-driven scores/costs) and would pass B12 without states; the workflow masters (267/269/271/248/270) already carry state machines.
- **B13 — entity_type classified.** **FAIL.** All 7 masters are `entity_type='unclassified'`. Deterministic classifications from descriptions: enterprise_applications=operational_workflow (full lifecycle planned→retired), technology_platforms=operational_workflow (emerging→retired), application_interfaces=operational_workflow (active→retired), business_capability_maps=operational_workflow (draft→published→superseded), technology_fit_assessments=operational_workflow (draft→in_review→approved); application_costs=computed/operational_record (periodic cost aggregation), application_value_scores=computed (multi-dimensional time-series score). Needs PATCH (out of scope for this read-only pass).
- **B14 — sector/vendor-conditional masters flagged optional.** PASS. No statute-prefixed masters (no fcra_/hipaa_/sox_/gdpr_ etc.) in APM's footprint. The 7 masters are universal portfolio-management entities; `master+required` is appropriate for each.

---

## C. Phase C — Functional ownership

- **C1 — business_function_domains owner row.** PASS. owner = IT Infrastructure (id 58); contributor = Software Engineering (id 26). ≥1 owner present.
- **C2 — business_function_capabilities overrides.** PASS (no divergence). Zero override rows; acceptable since no APM capability is owned by a function other than the domain's owning function.

---

## D. UI spot-check

- **D1.** Not performed in this read-only catalog pass (would require visiting the live UI). No record_status anomalies observed in the data pulled (rows are research-state). Out of scope for the structural data audit; flag only if user wants a UI pass.

---

## E. Personas, RACI & responsibilities

- **E1 — persona coverage.** **FAIL.** APM is multi-module (2 modules, 7 capabilities ≥3), so E1 FIRES on zero. Zero `domain_roles` for the owning/contributing functions (58 IT Infrastructure, 26 Software Engineering) and zero `role_modules` rows on modules 103/104. No personas authored.
- **E2 — 2-module floor.** N/A (vacuous; no personas).
- **E3 — role_modules interaction_level set.** N/A (vacuous; no role_modules rows).
- **E4 — RACI coverage on gated processes.** **FAIL.** No `data_object_lifecycle_states.process_id` is wired on any APM master (all NULL), and zero `process_raci` assignments exist. The 7 gated lifecycle states have no process linkage and no Responsible/Accountable assignments.
- **E5 — has_single_approver ↔ Accountable (soft-warn).** Soft. technology_fit_assessments.has_single_approver=true but no RACI Accountable to reconcile against (consequence of E4). No block.
- **E6 — reach reconciles + entity_type classified.** **FAIL.** entity_type is `unclassified` on all 7 masters (B13 folded in); the write-tier derivation depends on it. Reach cannot reconcile because no personas/reach exist (E1).

---

## F. Skill-layer integrity

- **F1 — no system skill on a FULL module.** PASS (empty result).
- **F2 — exactly one domain system skill.** PASS. One row: `apm-system` (id 396), domain_id=10, domain_module_id NULL.
- **F3 — modules carry ≥1 domain_module_tools.** PASS. 20 `domain_module_tools` rows across 103/104; 18 distinct tools (mix of query + mutate; required floor satisfied with query, mutate, and a workflow gate `approve_technology_fit_assessment`).
- **F4 — operation_kind ↔ data_object_id invariant.** PASS. All 18 tools are `query` or `mutate`, every one with `data_object_id` set. No side_effect/compute/fetch/inbound tools; invariant holds on every row.
- **F5 — Semantius score computable.** PASS (computable). All 18 distinct tools are `coverage_tier='platform'`.
  - **strict_score = 18/18 = 1.00**
  - **operational_score = 18/18 = 1.00**
  The toolset is a pure query/mutate CRUD surface entirely served by the platform; no external glue. (Consistent with crud_percentage=90.)
- **F7 — channel primitives only when workflow-specific.** PASS (vacuous). No channel-primitive tools (send_email/send_sms/post_chat_message/etc.) linked to either module.

---

## H. Handoff APQC coverage

- **H1 — every cross-domain handoff has a handoff_processes row OR a deferral.** **FAIL (coverage incomplete).**
  - Cross-domain handoff set: 14 total (12 outbound: 235,236,237,238,239,853,854,855,1195,1196,1197,1198; 2 inbound: 181,182).
  - Tagged (≥1 handoff_processes row): 9 distinct handoffs — 235/236/237/238 (process 1180 "Review and monitor application security controls", discovery_substring), 853/854 (process 1312 "Maintain IT asset records", agent_curated), 181 (process 13, agent_curated), 182 (process 78, agent_curated), 1196 (process 1132 "Monitor and analyze IT financial performance", agent_curated).
  - **Untagged with no deferral entry (5):** 239 (application_interface.broken → ITSM service_incidents), 855 (technology_platform.sunset → GRC), 1195 (technology_fit.assessment_completed → GRC), 1197 (application_cost.updated → EPM), 1198 (application_value.recalculated → SPM).
  - **Two H-band measures:** headline catalog-quality (`record_status='approved'`) = **0** (every existing tag is still `new`); provenance side-bar = 5 `agent_curated` + 4 `discovery_substring`. The audit-quality flag is that 5 of 14 cross-domain handoffs have no APQC linkage at all, and zero existing tags are approved.
  - In-scope fix: author `handoff_processes` rows (`proposal_source='agent_curated'`, `record_status='new'`) for the 5 untagged handoffs, or record explicit defer-to-Discover reasons. (Read-only here — proposals only.)

---

## Verdict summary

**Total band checks run: 38** (S1, S2, S3, A1, A2, A3, A4, M1, M2, M4, M5, M6, M7, M8, M9, B1, B2, B3, B4, B5, B6, B6b, B7, B8, B9, B9b, B9c, B10, B10b, B11, B12, B13, B14, C1, C2, E1, E2, E3, E4, E5, E6, F1, F2, F3, F4, F5, F7, H1, D1) — counting A5 as SKIPPED, D1 as not-run, B9c/E5 as soft. Hard/scored bands evaluated below.

### FAILED bands

Structural gate (resolve first):
- **M7** — within-domain master/consumer incoherence on enterprise_applications (267) and technology_platforms (269): master in mod 103 + consumer+required in mod 104.

In-scope fixes (APM owns):
- **A4** — domain catalog_tagline + catalog_description empty.
- **M8** — both modules' catalog_tagline + catalog_description empty.
- **M9** — module 104 has consumer+required (not embedded_master) on 267 + 269 mastered by sibling 103: self-containment violation (same rows as M7).
- **B9** — trigger_event 357 `capability_map.updated` (do 248) has zero handoffs (leaf or missing handoff — decide).
- **B9b** — zero intra-domain handoff rows despite 4 cross-module master relationships (registry → rationalization).
- **B13** — all 7 masters `entity_type='unclassified'`.
- **E1** — zero personas on a multi-module domain (fires on zero).
- **E4** — zero `process_raci` and zero `data_object_lifecycle_states.process_id` wiring on gated states.
- **E6** — entity_type unclassified (folded B13) + no reach to reconcile.
- **H1** — 5 of 14 cross-domain handoffs untagged with no deferral; 0 tags approved.

Deferred/blocked-by-other-band:
- **B12** — cannot evaluate until B13 classifies entity_type (then expected to pass).

Soft-warn (never block): **B9c** (free-text to_state drift on events 208/209/936/937), **E5** (single-approver vs missing Accountable).

### PASSED bands

S1, S2, S3, A1, A2, A3, M1, M2, M4, M5, M6, B1, B2, B3, B4, B5, B6, B6b, B7, B8, B10b, B11, B14, C1, C2, F1, F2, F3, F4, F5, F7. (A5 skipped; D1 not run.)

### Semantius score

- **strict_score = 1.00** (18/18 tools `coverage_tier='platform'`)
- **operational_score = 1.00** (18/18 platform+integration)
- Computable; F3/F4 both pass. Pure CRUD query/mutate surface, fully platform-served.

---

## Report-only follow-ups (owned by other domains — do NOT fix from APM's audit)

These never block APM's green status. Discovered via the B10 two-query procedure (APM's non-master deps × their canonical owners) cross-checked against existing inbound handoffs.

1. **SAM B9 owes outbound on `software_titles` → APM** (APM's consumer + optional on do 57, mastered by SAM module SAM-CATALOG-DISCOVERY / domain 52). No inbound handoff exists.
2. **SMP B9 owes outbound on `saas_applications` → APM** (APM consumer + optional on do 61, mastered by SMP module SMP-DISCOVERY / domain 85). No inbound handoff exists.
3. **CMDB B9 owes outbound on `configuration_items` → APM** (APM consumer + optional on do 76, mastered by CMDB module CMDB-CORE / domain 4). No inbound handoff exists. (APM does publish enterprise_applications INTO CMDB via handoffs 236/237, but the reverse CI-sync inbound is not modeled.)
4. **DATA-AI-PLAT B9 owes outbound on `data_products` → APM** (APM consumer + optional on do 232, mastered by DATA-AI-PLAT module DATA-AI-PLAT-SEMANTIC-CATALOG / domain 129). No inbound handoff exists.
5. **BPA → APM `business_capability_maps` attribution oddity (B9c / B10b cross-domain).** Inbound handoff 181 (BPA source) uses `trigger_event 357 capability_map.updated`, whose `data_object_id=248` is an APM-mastered object. A handoff INTO APM should normally carry a payload APM does not master, or use an event published by the source domain. Either (a) BPA legitimately publishes/contributes to business_capability_maps and should hold a contributor/consumer DMDO + own publishing event, or (b) event 357 is APM's own outbound event mis-wired as an inbound row. Surface to user / owning-domain (BPA, domain 136) for resolution; not an APM in-scope fix. (BPA → APM `business_process_models` inbound handoff 182 with trigger_event 356 `process_model.published` is correctly attributed to BPA.)

**Count of report-only follow-ups: 5** — SAM, SMP, CMDB, DATA-AI-PLAT (inbound-handoff gaps), BPA (capability-map attribution oddity).

---

## Notes for the fix loop (if user approves loading)

- M7 + M9 are the same root cause (two consumer+required rows in mod 104). Resolving them together (demote to `embedded_master` in 104, or relax to optional) clears both the structural gate and the self-containment violation. User decision required (architectural intent).
- B13 is a prerequisite for a clean B12/E6; classify the 7 masters first, then re-evaluate B12.
- E1/E4/E6 form a cluster: author personas + role_modules reach + process_raci + wire lifecycle process_id together in a Phase-E load.
- A4/M8 (catalog UX copy) per Rule #20: author buyer-voice copy, write straight into the empty fields with user review BEFORE writing; do NOT pre-surface as a gate.
- All proposed fixes load with `record_status='new'`; no bulk-approve (Rule #1).
