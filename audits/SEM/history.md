# SEM audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 3 full modules (`SEM-STRATEGY-DEFINITION` 105, `SEM-EXECUTION-TRACKING` 106, `SEM-OPERATING-RHYTHM` 107), 0 starter modules, 0 cross-cutting host junctions. 4 SEM-owned masters (`strategy_maps` 808 in module 105, `strategic_initiatives` 274 in 106, `operating_reviews` 809 + `strategy_decisions` 810 in 107) plus 1 embedded master (`okr_objectives` 245 in 105; canonical master lives in WORK-MGMT-GOALS-OKR 150). 7 capabilities (6 SEM-specific + 1 cross-cutting `GOAL-MGMT` 25). 13 solutions (10 primary, 3 secondary). 11 trigger_events. 4 intra-domain cross-module handoffs (1201, 1202, 1203, 1204). 4 outbound cross-domain handoffs (1205, 1206, 1207, 1208 to SPM and EPM), **0 inbound** cross-domain handoffs. 22 lifecycle-state rows across 4 masters (`strategy_maps` exempt per Rule #12 as config-shape; `okr_objectives` lifecycle is realised on modules 51 and 150, not on SEM module 105). 3 system skills (166, 167, 168) with 27 `skill_tools` rows total. 9 baseline permissions (3 per module) + 9 workflow-gate permissions. 3 SEM-only roles (`Chief of Staff` 10055, `Strategy Office Analyst` 10056, `Head of Department` 10057). 13 aliases. 0 regulations. 0 industries (no `domain_industries` table available in catalog). 0 APQC tags on the 4 cross-domain handoffs.

- **Vendor-surface basis (Pass 2 flagship enumeration):** Cascade Strategy, AchieveIt, ClearPoint Strategy, KPI Fire, OnStrategy, ESM Strategy Management, Spider Strategies (Spider Impact), i-nexus, Quantive (formerly Gtmhub) Results, Mooncamp, Workboard, Profit.co, Perdoo, Weekdone. Of these, Cascade (852), ClearPoint (853), AchieveIt (854), Quantive (855), WorkBoard (856), Profit.co (857), i-nexus (858), Spider Impact (859), Envisio (860), Microsoft Viva Goals (861) are loaded as primary coverage; Lattice (240), 15Five (241), Leapsome (517) as secondary (HR-led tools whose OKR feature overlaps but whose primary domain is TALENT-MGMT). KPI Fire, OnStrategy, ESM, Mooncamp, Perdoo, Weekdone are not in the catalog yet. SEM is the strategy-office market (OKR / Hoshin / KPI-execution tooling, balanced-scorecard cascading), distinct from Search Engine Marketing (which is not represented in the catalog under this code). Compliance anchor is minimal: SEM does not carry statutory exposure beyond SOX-style internal-controls discipline for publicly-listed companies that disclose strategic-initiative status to investors. No regulations are loaded; that is consistent with the market shape.

- **Bucket 1 (in-scope, agent fixable):** 9 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 6 items.

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO + cross-domain data_object_relationships, ranked by edge weight):

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| SPM | 2 | 0 | 0 | 0 (in this audit) | 2 | Pairwise (full) |
| EPM | 2 | 0 | 0 | 0 (in this audit) | 2 | Pairwise (full) |
| WORK-MGMT | 0 | 0 | 1 (WORK-MGMT-TASK-EXEC consumer on strategic_initiatives 274; WORK-MGMT-GOALS-OKR masters okr_objectives 245) | 5 (okr_objectives mastered in WORK-MGMT; SEM embeds; okr_key_results 966 + okr_check_ins 967 belong_to okr_objectives) | 6 | Pairwise (full) |
| TALENT-MGMT | 0 | 0 | 1 (TALENT-PERFORMANCE-MGMT 51 embedded_master on okr_objectives) | 2 (performance_reviews 174 evaluates okr_objectives 245; performance_goals 175 aligns_to okr_objectives 245) | 3 | Pairwise (full) |
| EXECUTIVE roles | n/a | n/a | n/a | n/a | n/a | Roles-only neighbor (Chief of Staff, Strategy Office Analyst, Head of Department live on SEM modules exclusively; no role-bridge to other domains) |
| ERP-FIN | 0 | 0 | 0 | 0 | 0 | (No edge; surface as expected-missing inbound for actuals feed) |
| HCM | 0 | 0 | 0 | 0 | 0 | (No edge; surface as expected-missing inbound for org_unit / employee changes) |
| PSA / SPM downstream initiatives | 0 | 0 | 0 | 0 | 0 | Lightweight |

**Structural pass bands.**

- **A / C / D / E (positive checks): partial pass.** A1-A3 (domain rows + capability coverage): pass; domain row carries full metadata (crud_percentage 80, min_org_size 30 m, cost_band $$$, market size 600M USD 2024, business_logic prose). C1 (cross-domain DMDO consumers exist): only 1 cross-domain consumer (WORK-MGMT-TASK-EXEC 149 consumes strategic_initiatives); thin but not a fail. D1 (deployment shape): 3 modules, each with a master, each with a system skill, each with role_modules rows; pass. E1 (roles): 3 SEM-only roles, role_modules cover all 3 modules; pass. E6 (permission-bundle coherence): bundles look tier-coherent (Chief of Staff `:admin` on all 3 modules; Strategy Office Analyst `:manage` STRATEGY-DEFINITION + `:read` others + explicit `cascade_objective` workflow-gate; Head of Department `:manage` EXECUTION-TRACKING + explicit `approve_initiative` + `complete_initiative` gates + `:read` others). `permission_hierarchy` not introspected.

- **M-band: pass.** M1 (>=1 full module per domain): 3 full modules. M2-M6: each module has at least one master; pass. M7 (within-domain incoherence): clean, no data_object carries `role=master` in one SEM module while also carrying `role IN (consumer, contributor)` in a sibling SEM module. `strategy_maps` is master in 105 + consumer in 106; that is the only cross-module consumer DMDO inside SEM and it is the correct shape (Execution-Tracking reads the strategy map, does not master it). `okr_objectives` is embedded_master in 105 + consumer in 106 + consumer in 107; canonical master sits in WORK-MGMT 150, so SEM does not duplicate-master. **B11 cross-module reference graph:** all 4 intra-domain handoffs are present, integration_pattern `lifecycle_progression`. The expected `okr_progress.rolled_up` STRATEGY-DEFINITION <-> EXECUTION-TRACKING loop is missing (see B1-S3).

- **B-band:** mixed.

  - **B1-B7 (basic shape per master):** masters all have singular_label, plural_label, description; pass.
  - **B8 (lifecycle states per master + required):** `strategic_initiatives` 274 has 5 states on module 106; `operating_reviews` 809 has 3 states on module 107; `strategy_decisions` 810 has 4 states on module 107 (proposed/decided/deferred/withdrawn); pass. `okr_objectives` 245 has 5 states each on modules 51 and 150 but **zero on SEM module 105 where SEM embeds**. Per Rule #12, lifecycle is the canonical master's contract, not the embedder's, so this is the intended shape (SEM reads okr lifecycle from WORK-MGMT). `strategy_maps` 808 has zero lifecycle states; per Rule #12 config-shape exemption this is intended (the data_objects.notes column records the exemption, see B2-S2 Rule #15 pollution).
  - **B9 (trigger_event coverage):** 11 events; categories populated on every event (lifecycle or state_change). Pass.
  - **B9b (intra-domain cross-module handoffs):** 4 intra-domain handoffs on a 3-module domain; reasonable for the workflow shape. Pass.
  - **B10b (cross-domain handoff FK populated):** **fail.** All 4 outbound handoffs (1205, 1206, 1207, 1208) carry NULL `target_domain_module_id`. SEM's own `source_domain_module_id` is populated on every outbound. The target NULLs are the target domains' work per the B10b asymmetry rule. Confounding factor: SPM (domain 9) and EPM (domain 66) **have zero `domain_modules` rows loaded** at all. Phase B never ran on them; until SPM and EPM modules exist there is no module to point at. This is therefore a SCHEDULING fix (queue SPM and EPM for Phase B and then b1 audits, after which the FKs can be backfilled). Reported as B1-S4 + Bucket 1 report-only.
  - **B11 (intra-domain references):** as above; 1 missing intra-domain handoff (okr scoring rollup STRATEGY-DEFINITION <-> EXECUTION-TRACKING).
  - **B12 (zero-inbound asymmetry):** **fail.** SEM has 0 inbound cross-domain handoffs. A strategy-office tool that publishes initiative status downstream but receives nothing from finance (actuals), HR (org or workforce changes), or work-execution (OKR scoring, KR check-ins) is missing its sensor surface. See B1-S2.

- **C-band (cross-domain consumer DMDOs):** 1 cross-domain consumer DMDO (WORK-MGMT-TASK-EXEC 149 on strategic_initiatives). Expected additions from natural-cascade reasoning: SPM modules (when loaded) should consume strategic_initiatives; EPM modules (when loaded) should consume strategic_initiatives + okr_objectives for benefits realisation; ERP-FIN modules should consume strategic_initiatives for variance reporting; HCM modules should consume okr_objectives if the org rolls performance reviews against OKRs (some catalogs already wire this via TALENT-MGMT 51 embedded_master). C-band failure is downstream domains' work, surfaced as report-only.

- **F-band (skills + tools):** **pass.** F1 (>=1 system skill per module): 3/3. F2 (exactly 1 system skill per module): 3/3 (166 on 105, 167 on 106, 168 on 107). F3 (>=1 skill_tools per system skill): 9 / 7 / 11 rows respectively. F4 (operation_kind invariants): every `query` / `mutate` tool has a `data_object_id`; every `side_effect` / `compute` tool has NULL `data_object_id` (notify_person 913, create_calendar_event 41, generate_text 49). Pass. F5 (Semantius score): all 27 tool rows look catalog-resident (`query_*`, `create_*`, `update_*`, plus channel primitives `notify_person`, `create_calendar_event`, `generate_text`); score approximately 100% platform-tier on the strict reading. F7 (channel-primitive justification): `notify_person`, `create_calendar_event`, `generate_text` carry `notes` recording the workflow context, which is a Rule #15 pollution per the rescinded license; see B2-S2.

- **H1 (APQC tagging on cross-domain handoffs):** **hard fail.** 0 / 4 cross-domain handoffs carry a `handoff_processes` row (verified via direct query). Catalog quality (approved): 0; process health (agent_curated): 0. Volume target per SKILL.md H1: 0.5N to 0.8N for N=4 = 2 to 3 agent_curated tags. Audit proposes 4 (tag all 4 outbound). See B1-H1.

- **Rule #15 notes pollution:** present on:
  - `data_objects.notes` for `strategy_maps` 808 (config-shape exemption rationale).
  - `skill_tools.notes` on all 27 rows (auto-populated workflow context per the rescinded license).
  - `domains.notes` empty (clean).
  See B2-S1.

- **Pattern flag positive re-evaluation:** `okr_objectives.has_personal_content=true` is plausible (owner identity); `operating_reviews.has_submit_lock=true` is correct (closed reviews lock); `strategy_decisions.has_submit_lock=true` + `has_single_approver=true` is correct (one decision-maker, then locked except by explicit revert). `strategic_initiatives` has no flags set; possible candidate: `has_submit_lock` should be `true` once `completed` or `cancelled` state is reached (workflow shape implies this). See B2-S5.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| **B1-S1** | **B12 hard fail (zero inbound asymmetry)** | SEM has 4 outbound handoffs and 0 inbound. The strategy-office workflow assumes a sensor surface: financial actuals (ERP-FIN.financial_period.closed; EPM.financial_plan.approved or variance_analysis.material_variance) inform initiative health; HR / SWP events (org_unit.restructured; resource_allocation.committed) re-balance OKR cascades; work-execution events (WORK-MGMT.okr_objective.scored; WORK-MGMT.work_project.completed) roll progress up to corporate OKRs and into operating_reviews; TALENT-MGMT.performance_review.completed flows insights into strategy_decisions. None are wired. Candidate inbound handoffs to load: (a) WORK-MGMT.okr_objective.scored -> SEM-EXECUTION-TRACKING (event 1375 already exists, target NULL); (b) WORK-MGMT.okr_objective.committed -> SEM-STRATEGY-DEFINITION (event 1374 exists); (c) EPM.financial_plan.approved -> SEM-EXECUTION-TRACKING (event id needs lookup, anchors initiative funding); (d) EPM.variance_analysis.material_variance -> SEM-OPERATING-RHYTHM (anchor for QBR escalation); (e) ERP-FIN.financial_period.closed -> SEM-EXECUTION-TRACKING (anchor for monthly rollup); (f) TALENT-MGMT.performance_review.completed -> SEM-OPERATING-RHYTHM (insights into people decisions). | Author 4 to 6 inbound handoff rows. Two of the source events already exist (1374, 1375 on okr_objectives). The remaining 4 need either an existing event in the source domain or a new trigger_event row in the source domain (which is NOT SEM's fix; Rule on event ownership: events belong on the source domain). Recommend: author the 2 readily-available rows (a, b) in this audit's load; queue (c)-(f) as Phase 0 plus cross-domain coordination with EPM / ERP-FIN / TALENT-MGMT audits. |
| **B1-S2** | **B11 missing intra-domain handoff** | The `okr_objectives` rollup from EXECUTION-TRACKING back to STRATEGY-DEFINITION is missing. When module 106 rolls up child-OKR progress to the parent strategy map, no handoff fires. Existing 4 intra-domain handoffs cover: cascade (105 -> 106), initiative.approved (106 -> 107), initiative.completed (106 -> 107), decision.decided (107 -> 106). Missing: `okr_objective.scored` (1375) 106 -> 105 (re-publishes scored OKR to the strategy map view) and possibly `strategic_initiative.completed` (1266) 107 -> 105 (benefits realisation feeds strategy map). | Author 2 intra-domain handoff rows: (a) `source_domain_module_id=106, target_domain_module_id=105, trigger_event_id=1375, data_object_id=245, integration_pattern='lifecycle_progression'`; (b) `source_domain_module_id=107, target_domain_module_id=105, trigger_event_id=1266, data_object_id=274, integration_pattern='lifecycle_progression'`. |
| **B1-S3** | **B11 missing trigger_event** | No trigger_event for `okr_objective.cascaded` rollback (when the strategy map is re-baselined and child OKRs are obsoleted) or for `strategic_initiative.benefits_realized` (the EPM-relevant outbound that should drive the missing inbound from B1-S1). Two new events needed: `okr_objective.deprecated` (state_change on `okr_objectives`) for re-baselining cascades, `strategic_initiative.benefits_realized` (state_change on `strategic_initiatives`) for the EPM benefits-realisation feed. | Insert 2 `trigger_events` rows: `okr_objective.deprecated` (event_category='state_change', data_object_id=245); `strategic_initiative.benefits_realized` (event_category='state_change', data_object_id=274). Unblocks B1-S2-related outbound additions. |
| **B1-S4** | **B10b report-only (outbound NULLs owed by target domains)** | All 4 outbound handoffs (1205, 1206, 1207, 1208) have NULL `target_domain_module_id`. Both target domains (SPM=9, EPM=66) have **zero `domain_modules` rows loaded**, so the FK has nothing to point at until Phase B runs on SPM and EPM. Per the B10b asymmetry rule this is the target domains' work; queue them. | Schedule Phase B on SPM and EPM (no DMDO data exists; same situation noted in audits/_validate-cross-domain.md 2026-05-29). After Phase B on each target, run b1 audit and backfill `target_domain_module_id` on these 4 handoffs. |
| **B1-S5** | **B-band, asymmetric event 150 ownership** | trigger_event 150 `okr_objective.created` is loaded on `data_object_id=245` and is consumed by SPM handoff 178 (SPM -> WORK-MGMT). This event sits in SEM's substrate (okr_objectives is embedded_master here), but the publishing domain in handoff 178 is SPM (which has zero modules). This is a data-integrity oddity: the event is published by a domain that does not master the data_object AND does not have modules. Two reads: (a) the event is in the wrong source domain (it belongs to WORK-MGMT-GOALS-OKR which DOES master okr_objectives), surface as report-only on WORK-MGMT; (b) SPM is the right publisher because in some workflows SPM declares portfolio-level OKRs first, which is plausible. Without SPM modules loaded the question cannot be settled here. Report-only to WORK-MGMT and SPM b1 audits. | Report-only on WORK-MGMT (consider re-homing event 150 to be published from WORK-MGMT-GOALS-OKR 150 surface) and SPM (when Phase B lands, decide whether SPM publishes `okr_objective.created` from its own module or consumes WORK-MGMT's version). |
| **B1-S6** | **C-band report-only (downstream consumer DMDOs)** | Cross-domain consumers of SEM masters are sparse: only WORK-MGMT-TASK-EXEC (149) consumes `strategic_initiatives` (274). Expected additions from the workflow shape: (a) SPM modules (when loaded) should declare `consumer + optional` on `strategic_initiatives`; (b) EPM modules (when loaded) should declare `consumer + required` on `strategic_initiatives` (for variance attribution) and possibly `consumer + required` on `okr_objectives` (already embedded by TALENT 51); (c) ERP-FIN modules should declare `consumer + optional` on `strategic_initiatives` for revenue attribution; (d) HCM may declare `consumer + optional` on `okr_objectives` if performance reviews tie to OKRs. None are SEM's fix; queue to the respective domains' b1 audits. | Report-only on SPM, EPM, ERP-FIN, HCM b1 audits. Each adds a `consumer` DMDO row on the relevant SEM master in its receiving module. |
| **B1-S7** | **Rule #15 notes-pollution remediation queue** | `data_objects.notes` on `strategy_maps` (808) carries config-shape rationale prose (`"Config-shaped; no workflow. Authored once per planning cycle, edited inline; no per-state permissions needed."`). 27 `skill_tools.notes` rows carry auto-populated workflow context prose. Rule #15 forbids both. The audit can revert these to empty string deterministically; the user can approve specific wording if any of the strings is load-bearing for documentation. The audit DOES NOT auto-revert without user approval per the standing rule. | On B2-S1 user approval, PATCH `data_objects.notes` on 808 to empty string; PATCH all 27 `skill_tools.notes` rows to empty string. Two surgical UPDATEs (or one small loader). |
| **B1-S8** | **B-band, possible duplicate event_category mismatch on cascaded event** | Event 1264 `strategic_objective.cascaded` is categorised `lifecycle` and is used by handoff 1208 (SEM-STRATEGY-DEFINITION -> EPM, manual_handoff, high friction) AND by intra-domain handoff 1201 (105 -> 106). The cascade is more accurately a `state_change` on the okr_objectives lifecycle (the OKR transitions from a top-level state to a cascaded child state), not a recurring `lifecycle` rhythm. Both readings are defensible, surface as judgment call. Not a hard fail. | Optionally PATCH `trigger_events.event_category` on 1264 from `lifecycle` to `state_change`. Surface as Bucket 2 (judgment) if the user prefers. Reclassified here as Bucket 1 because the structural fix is mechanical, but only after user confirms. |

#### APQC TAGGING

The volume target for N=4 cross-domain handoffs is 2 to 3 `agent_curated` rows. The audit proposes tagging **all 4** since the cross-industry PCF covers the SEM market cleanly (the strategy-office market is exactly what APQC PCF 1.0 "Develop Vision and Strategy" describes). All proposed rows ship `proposal_source='agent_curated'`, `record_status='new'`.

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | Confidence |
|---|---|---|---|---|---|---|
| 1205 | SEM-EXECUTION-TRACKING -> SPM | `strategic_initiative.approved` | `strategic_initiatives` | Select strategic initiatives (10059) or Execute strategic initiatives (19507); the approval is the gate, so prefer "Select strategic initiatives" | 104 (or 106) | confident L3 |
| 1206 | SEM-EXECUTION-TRACKING -> SPM | `strategic_initiative.cancelled` | `strategic_initiatives` | Refine strategic initiatives and project plans as needed (21423) | 108 | confident L3 |
| 1207 | SEM-EXECUTION-TRACKING -> EPM | `strategic_initiative.approved` | `strategic_initiatives` | Establish portfolio strategy (16402), EPM context (funding alignment) | 1652 | confident L4 (or use parent Manage portfolio 16401, id 409) |
| 1208 | SEM-STRATEGY-DEFINITION -> EPM | `strategic_objective.cascaded` | `okr_objectives` | Develop and set organizational objectives (10042) or Identify organizational objectives (19953) | 98 (preferred L3) or 504 (L4) | confident L3 |

Lookup notes: PCF parent for SEM is "1 Develop Vision and Strategy" (id 1, external_id 10002, L1). Children "2 Develop business strategy" (15, 10015, L2), "3 Develop and measure strategic initiatives" (16, 10016, L2), "3.1 Develop strategic initiatives" (102, 10057, L3), "3.2 Evaluate strategic initiatives" (103, 10058, L3), "3.3 Select strategic initiatives" (104, 10059, L3), "3.4 Execute strategic initiatives" (106, 19507, L3), "3.5 Review execution of strategic initiatives" (107, 21422, L3), "3.6 Refine strategic initiatives and project plans as needed" (108, 21423, L3). All four candidate rows resolve confidently to L3 children of 10016, no Discover Pass 3 deferral needed.

**B1-H1 total: 4 APQC tags (all 4 cross-domain handoffs).** Volume target hit at 4 / 4 = 100% (above the 0.5N to 0.8N target).

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| STRUCTURAL (B12 + B11 + B10b report-only + asymmetric event + C-band report-only + Rule #15 remediation + event_category) | 8 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| BOUNDARY | 0 (folded into pairwise Section 4) |
| APQC TAGGING | 1 (B1-H1; the 4 candidate rows count as one structural workstream per audit-counting convention) |
| MODULARIZATION ISSUES | 0 (routed to Bucket 2 per SKILL convention) |
| **Bucket 1 total** | **9** |

#### Final Bucket 1 inventory

| ID | Description |
|---|---|
| B1-S1 | B12 zero-inbound asymmetry; author 2 inbound handoffs deterministically (WORK-MGMT.okr_objective.scored -> 106; WORK-MGMT.okr_objective.committed -> 105); queue 4 more (c-f) for Phase 0 / cross-domain coordination |
| B1-S2 | B11 missing intra-domain handoffs; author 2 rows (106 -> 105 on okr_objective.scored; 107 -> 105 on strategic_initiative.completed) |
| B1-S3 | B11 missing trigger_events; insert 2 rows (`okr_objective.deprecated`; `strategic_initiative.benefits_realized`) |
| B1-S4 | Report-only B10b NULL target_module_id on all 4 outbound (SPM and EPM have zero modules); queue Phase B on SPM and EPM, then b1 audits |
| B1-S5 | Report-only B-band asymmetric event 150 ownership; queue WORK-MGMT and SPM b1 audits to settle whether event re-homes to WORK-MGMT |
| B1-S6 | Report-only C-band missing downstream consumer DMDOs on SPM / EPM / ERP-FIN / HCM; queue their b1 audits |
| B1-S7 | Rule #15 notes-pollution; PATCH `data_objects.notes` on 808 to empty + PATCH 27 `skill_tools.notes` rows to empty (gated on B2-S1) |
| B1-S8 | Optional event_category PATCH on 1264 from `lifecycle` to `state_change` (gated on user confirm) |
| B1-H1 | APQC TAGGING; INSERT 4 `handoff_processes` rows (`agent_curated`, `record_status='new'`) tagging handoffs 1205/1206/1207/1208 to PCF processes 104/108/1652/98 |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent cannot answer | Options |
|---|---|---|---|
| **B2-S1** | **Rule #15 notes-pollution remediation.** `data_objects.notes` on `strategy_maps` 808 reads `"Config-shaped; no workflow. Authored once per planning cycle, edited inline; no per-state permissions needed."` (Rule #12's prior license for the config-shape exemption in `data_objects.notes` is RESCINDED). Separately, all 27 `skill_tools.notes` rows carry workflow-context prose per the prior `skill_tools` channel-justification license, which is also RESCINDED. Were these notes user-approved at load time, or auto-populated by the loader? | The audit cannot tell from PostgREST whether the strings were typed by the user or by the loader. Empirically the wording reads as auto-populated (uniform tone, mechanical paraphrase of `operation_kind` and the master's role). | (a) Confirm auto-populated; PATCH all 28 rows' `notes` to empty string and log the Rule #15 incident per references/skill-changelog.md. (b) Confirm user-approved; leave in place but ack that prior licenses are rescinded for future loads. (c) Mixed: approve some specific rows' wording and revert the rest. |
| **B2-S2** | **B12 zero-inbound asymmetry, inbound authoring scope.** B1-S1 proposes 2 readily-available inbound handoffs (using already-loaded events 1374, 1375) plus 4 candidate inbounds (c-f) that need new source-domain events or coordination with EPM / ERP-FIN / TALENT-MGMT audits. Should the SEM audit author the 2 readily-available ones immediately, or queue all 6 together until the source-domain audits are run? | The 2 immediately-author candidates are mechanically clean (source events exist, target module is SEM, integration pattern obvious). The 4 coordination-required candidates need source-domain audits to land first. Question is workflow priority. | (a) Author 2 now, queue 4 with cross-domain coordination. (b) Queue all 6 until source-domain Phase 0 / b1 audits land (slower but tighter coordination). (c) Author 2 now AND queue a SEM follow-up audit for the 4 once source audits return. |
| **B2-S3** | **Multi-master pattern intent for `okr_objectives`.** The data_objects description claims `okr_objectives` is "canonical Signal-1 multi-master" across WORK-MGMT (team-level), SPM (portfolio), TALENT-MGMT (individual). Live state: WORK-MGMT-GOALS-OKR 150 is `master + required`; TALENT-PERFORMANCE-MGMT 51 is `embedded_master + optional`; SEM-STRATEGY-DEFINITION 105 is `embedded_master + required`. SPM does NOT have a row on okr_objectives (because SPM has zero modules). The description and the data drift: only one canonical master exists (WORK-MGMT), the other two are embeds. Is this the architectural intent (one canonical, others embed), or was the Signal-1 multi-master description aspirational and never realised? | The intent question is a product-architecture call. Both shapes are defensible: single-canonical with embeds is simpler, multi-canonical with reconciliation handles divergent lifecycles better. | (a) Confirm single-canonical; PATCH the description to drop "canonical Signal-1 multi-master" language and re-write as "domain-owned by WORK-MGMT, embedded in SEM and TALENT-MGMT". (b) Promote SEM's row from `embedded_master` to `master + optional` so the multi-master intent realises; add reconciliation handoffs. (c) Leave description as-is (aspirational); plan to promote when SPM's modules land. |
| **B2-S4** | **B12 zero-inbound, strategic intent or genuine gap.** Some strategy-office tools (Cascade, Quantive, OnStrategy) are write-mostly publishers: they push OKRs and initiatives outward, refresh by manual entry rather than pulling from EPM / ERP-FIN. Others (Workboard, ClearPoint, ESM) explicitly integrate with financial planning and pull actuals. SEM as a domain row could realistically be either, the catalog does not say. Should SEM model the integrated path (B1-S1 lists the 4-6 inbound candidates) or the write-mostly path (leave zero inbound, accept the asymmetry as workflow-correct)? | Product-shape choice. The flagship vendor surface is mixed; the answer determines whether B1-S1 is acted on. | (a) Integrated path; load the inbound handoffs (act on B1-S1). (b) Write-mostly path; accept zero inbound as the SEM market shape (decline B1-S1). (c) Mixed; load some inbounds (specify which of c-f) and skip others. |
| **B2-S5** | **Pattern-flag re-evaluation per Rule #12.** Current flags: `okr_objectives.has_personal_content=true` (owner identity); `strategic_initiatives` all flags false; `operating_reviews.has_submit_lock=true`; `strategy_decisions.has_submit_lock=true` + `has_single_approver=true`; `strategy_maps` all flags false. Candidates: (a) `strategic_initiatives.has_submit_lock` should probably be `true` for terminal states `completed` / `cancelled`; (b) `operating_reviews.has_personal_content` might be `true` (participant identities, structured commentary attributable to individual users); (c) `strategy_decisions.has_personal_content` might be `true` (decision-maker identity is load-bearing in the audit trail). | Workflow-shape judgments the user owns. | Per-flag yes / no from user; capture in Decisions. No `notes` annotation per Rule #15. |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 candidates are derived from analyst flagship-vendor knowledge of Cascade Strategy, AchieveIt, ClearPoint Strategy, Quantive Results, WorkBoard, Profit.co, Spider Impact, i-nexus, Microsoft Viva Goals, OnStrategy, Mooncamp, Perdoo, Weekdone. The subagent recipe was NOT spawned (single-pass audit per orchestrator instruction); candidates below are not vetted Phase 0 findings.

#### MISSING (5) entity candidates

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `kpis` (KPI registry) | Spider Impact, ClearPoint, i-nexus, Cascade all model KPIs as a first-class master distinct from key_results: KPIs are persistent measures with thresholds and red/amber/green status, attached to objectives but living independently across planning cycles. Currently `okr_key_results` 966 conflates the two, KPIs disappear when their parent OKR closes. | new SEM master, likely a fourth full module `SEM-KPI-MGMT` or extension of SEM-STRATEGY-DEFINITION |
| `strategic_themes` (Hoshin pillars) | Quantive, ClearPoint, OnStrategy, AchieveIt model strategic themes / pillars as a layer between strategy_maps and individual objectives (Customer / Process / Learning / Financial perspectives in balanced-scorecard; Hoshin pillars in Hoshin Kanri). Currently strategy_maps conflates the visualisation with the theme entity. | SEM-STRATEGY-DEFINITION |
| `okr_check_in_summaries` (period-level) | WorkBoard, Profit.co, Quantive produce period-level (weekly / monthly) check-in aggregates distinct from individual `okr_check_ins` records (which are per-OKR, per-update). The aggregate is the rollup that feeds the operating cadence. | SEM-OPERATING-RHYTHM (consumer; canonical master could be WORK-MGMT-GOALS-OKR) |
| `strategy_health_signals` (anomaly / drift detection) | Quantive Reflect, Cascade Insight, ClearPoint AI produce structured anomaly / drift / risk records at the strategy-map level (separate from initiative status). The `business_logic` column on the domain row references "anomaly detection on goal drift" but no master records it. | SEM-OPERATING-RHYTHM or SEM-EXECUTION-TRACKING |
| `benefits_tracking_records` (already exists in SPM) | EPM and SPM both already model benefits tracking. SEM strategy-office tools (Cascade, Workboard, ClearPoint) layer benefits against initiatives natively; current SEM treats benefits as inline `strategic_initiatives` columns. Whether SEM needs its own master or should consume SPM's `benefits_tracking_records` is a judgment call. | (consumer; benefits_tracking master lives in SPM) |

#### MODULARIZATION (1) candidate

- **SEM-KPI-MGMT or SEM-MEASURES module candidate.** If `kpis` and `strategy_health_signals` land, a fourth module separating measurement / KPI-management from strategy authoring / execution / rhythm makes shape sense. Spider Impact, ClearPoint, i-nexus are pure-play KPI-tracker vendors whose product is exactly this slice. Would push SEM from 3 to 4 full modules.

#### Capability candidates

- **Strategic Themes / Hoshin Pillars Capability** (alongside SEM-OBJECTIVES, SEM-STRATEGY-MAPS): currently no capability row for the pillar layer.

#### Compliance / regulation candidates

- No compelling missing regulation rows for SEM in scope. SOX touches strategy disclosures for publicly-listed firms but is bigger than SEM (lives in ERP-FIN / GRC / AUDIT). NIST CSF and ISO 22301 sometimes touch strategy continuity but are not core SEM regulations.

#### Candidate-domain queue

This audit surfaced **0 new domain-tier candidates** for `audits/_missing-domains.md`. The natural neighbors (SPM, EPM, WORK-MGMT, TALENT-MGMT, HCM, ERP-FIN, GRC, AUDIT) all already exist in the catalog. The helper was NOT run (no candidate codes to queue).

**Bucket 3 verification path:** (a) vetted route, agent runs Phase 0 vendor research on SEM producing `c:/tmp/SEM-phase0-2026-05-30.md` with per-entity vendor confirmation; survivors become Bucket 1 items in a follow-up audit. (b) eyeball route, user names which of the 5 entity candidates + 1 modularization candidate + 1 capability candidate to treat as confirmed.

### Cross-bucket dependencies

- **B1-S7** is gated on **B2-S1**: the user's call on whether notes were auto-populated or user-approved determines whether to PATCH to empty.
- **B1-S1 (act on 2 of 6 inbound handoffs)** is gated on **B2-S2**: which of the 2 / 4 / 6 split to use, and on **B2-S4**: whether the integrated path is the SEM intent at all. If B2-S4 chooses (b) write-mostly, B1-S1 is declined entirely.
- **B1-S2** is partially dependent on **B1-S3**: the second proposed intra-domain handoff (107 -> 105 on `strategic_initiative.completed`) uses an existing event (1266); the first (106 -> 105 on `okr_objective.scored`) uses 1375 which also exists. So B1-S2 is NOT actually dependent on B1-S3; the new events from B1-S3 (`okr_objective.deprecated`, `strategic_initiative.benefits_realized`) are needed for the 4 cross-domain coordination candidates in B1-S1, not for B1-S2.
- **B3 entity candidates** might inform **B2-S3** (multi-master intent): if `kpis` and `strategy_health_signals` land as SEM masters, the okr_objectives multi-master question changes shape (SEM gains canonical-mastery in its own slice). Calling out per the surface-time discipline.
- **B1-S4, B1-S5, B1-S6** are report-only and have no dependencies on SEM-side decisions; they queue other-domain b1 audits.
- **B1-S8** (event_category PATCH on 1264) is independent of all other items; mechanical confirm-then-PATCH.
- Buckets 2 and 3 are otherwise independent of each other; you can resolve them in any order.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or a list (e.g. `S2, S3, S7, S8, H1`), or `skip`.

- **S1 (B12 zero inbound, 2 readily-available inbounds)** is gated on B2-S2 + B2-S4; resolve those first.
- **S2 (2 missing intra-domain handoffs)** is structural; no other dependencies.
- **S3 (2 new trigger_events)** is structural; supports B1-S1's coordination set.
- **S4 (B10b report-only on 4 outbound)** is not SEM's fix; this is a "schedule Phase B on SPM and EPM" decision.
- **S5 (event 150 ownership)** is report-only; queues WORK-MGMT and SPM audit consideration.
- **S6 (cross-domain consumer DMDOs report-only)** is not SEM's fix; queues SPM / EPM / ERP-FIN / HCM audits.
- **S7 (Rule #15 notes-pollution remediation)** is gated on B2-S1.
- **S8 (event_category PATCH on 1264)** is mechanical; one PATCH after confirm.
- **H1 (4 APQC tags)** load now or in a follow-up batch?

**Bucket 2, what is your call on each?** I will wait for per-item decisions before acting.

- **B2-S1 (Rule #15 notes-pollution):** (a) confirm auto-populated and revert all 28 rows, (b) confirm approved and leave, (c) mixed (specify per row).
- **B2-S2 (inbound authoring scope):** (a) 2 now + 4 queued, (b) all 6 queued, (c) 2 now + follow-up audit for 4.
- **B2-S3 (okr_objectives multi-master intent):** (a) single-canonical, re-write description, (b) promote SEM to master, (c) leave aspirational.
- **B2-S4 (integrated vs write-mostly SEM intent):** (a) integrated (act on B1-S1), (b) write-mostly (decline B1-S1), (c) mixed (specify which inbounds to load).
- **B2-S5 (pattern flag re-evaluation):** per-flag yes / no on the 3 candidates.

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball, name which of the 5 entity candidates + 1 modularization candidate + 1 capability candidate to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit (or to that domain's Phase B if it has not run yet). Listed by owing domain for routing. Per Rule #11 (Hard Constraints), these are NOT duplicated in Bucket 1.

| Owing domain | Owed work |
|---|---|
| SPM | Run Phase B (zero `domain_modules` rows loaded). After modules exist: populate `target_domain_module_id` on inbound handoffs 1205, 1206 (from SEM-EXECUTION-TRACKING `strategic_initiative.approved` and `.cancelled`). Add `consumer + optional` DMDO on `strategic_initiatives` (274) in whichever SPM module governs the portfolio register. Reconsider whether event 150 `okr_objective.created` re-homes to SPM or stays with WORK-MGMT-GOALS-OKR. |
| EPM | Run Phase B (zero `domain_modules` rows loaded). After modules exist: populate `target_domain_module_id` on inbound handoffs 1207, 1208 (from SEM-EXECUTION-TRACKING `strategic_initiative.approved` and SEM-STRATEGY-DEFINITION `strategic_objective.cascaded`). Add `consumer + required` DMDO on `strategic_initiatives` (for variance attribution) and `consumer + optional` on `okr_objectives` (for benefits realisation). If the integrated-path B2-S4 (a) is chosen, also author 2 outbound EPM events to SEM (`financial_plan.approved`, `variance_analysis.material_variance`). |
| WORK-MGMT | If integrated-path B2-S4 (a) is chosen, author 2 outbound WORK-MGMT events to SEM (`okr_objective.scored` event 1375 already exists; new handoff rows needed to SEM module 106). Also: consider re-homing event 150 `okr_objective.created` to be published from WORK-MGMT-GOALS-OKR 150 module (currently sits on data_object 245 with publisher SPM in handoff 178). |
| ERP-FIN | Per audits/_validate-cross-domain.md 2026-05-29, ERP-FIN has zero DMDO data (Phase B never ran). After Phase B: consider whether ERP-FIN `financial_period.closed` should feed SEM-EXECUTION-TRACKING (B2-S4 (a) inbound (e)). Add `consumer + optional` DMDO on `strategic_initiatives` for revenue attribution. |
| TALENT-MGMT | If integrated-path B2-S4 (a) is chosen, consider whether `performance_review.completed` should feed SEM-OPERATING-RHYTHM as an inbound. Confirm `okr_objectives` 245 multi-master intent (B2-S3 ripple). |
| HCM | Consider whether HCM modules should declare `consumer + optional` on `okr_objectives` (245) if performance-review workflows tie to OKRs. |

### Decisions

(none yet, audit pending user review)

### Fixes applied

(none yet, audit is read-only by construction)

## 2026-05-31, Continuation: B1 technical fixes (residual)

### Scope

Truly-technical residual B1 pass. Applied items pre-specified by the 2026-05-30 audit that need no user judgment and meet the orchestrator's technical gates: PCF row resolvable, handoff_id named, no new entities created. All judgment-gated items remain pending.

### Fixes applied

**B1-H1, APQC tagging of cross-domain handoffs.** Inserted 4 `handoff_processes` rows tagging each SEM outbound cross-domain handoff to its pre-specified APQC PCF activity. All rows ship `proposal_source='agent_curated'`, `role='implements'`, `record_status='new'` (DB default per Rule #1), `notes=''` (Rule #15).

| handoff_processes.id | handoff_id | source -> target | trigger_event | PCF process_id | PCF external_id | PCF name |
|---|---|---|---|---|---|---|
| 832 | 1205 | SEM-EXECUTION-TRACKING (106) -> SPM | `strategic_initiative.approved` (1265) | 104 | 10059 | Select strategic initiatives |
| 833 | 1206 | SEM-EXECUTION-TRACKING (106) -> SPM | `strategic_initiative.cancelled` (1267) | 108 | 21423 | Refine strategic initiatives and project plans as needed |
| 834 | 1207 | SEM-EXECUTION-TRACKING (106) -> EPM | `strategic_initiative.approved` (1265) | 1652 | 16402 | Establish portfolio strategy |
| 835 | 1208 | SEM-STRATEGY-DEFINITION (105) -> EPM | `strategic_objective.cascaded` (1264) | 98 | 10042 | Develop and set organizational objectives |

Volume: 4 / 4 cross-domain handoffs tagged (100%, above the 0.5N to 0.8N H1 target). Loader: [.tmp_deploy/fix_sem_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_sem_b1_technical_2026_05_31.ts).

UI for review: https://tests.semantius.app/domain_map/handoff_processes

### Deferred (not applied in this pass)

All deferred per the orchestrator's technical gates. Re-evaluate after the listed gates clear.

| ID | Reason deferred |
|---|---|
| B1-S1 | New handoff inserts; gated on B2-S2 (authoring scope) and B2-S4 (integrated vs write-mostly SEM intent). |
| B1-S2 | New intra-domain handoff inserts; gated on B2-S4. |
| B1-S3 | New `trigger_events` inserts; gated on B2-S4 (only used by B1-S1 coordination set per audit's cross-bucket note). |
| B1-S4 | B10b FK PATCH on outbound `target_domain_module_id` is not derivable: SPM (9) and EPM (66) have zero `domain_modules` rows. Re-queue once Phase B lands on both targets. |
| B1-S5 | Report-only; no SEM-side write owed. Routes to WORK-MGMT and SPM b1 audits. |
| B1-S6 | Report-only; no SEM-side write owed. Routes to SPM / EPM / ERP-FIN / HCM b1 audits. |
| B1-S7 | `notes=''` reverts on `data_objects` 808 and 27 `skill_tools` rows; gated on B2-S1 user confirm. |
| B1-S8 | Optional `trigger_events.event_category` PATCH on 1264 from `lifecycle` to `state_change`; gated on user confirm. |

Deferred count: 8 of 9 Bucket 1 items. Applied: 1 of 9 (B1-H1).

### JWT errors

None.

## 2026-05-31, Audit

### Summary

Structural Validate b1 pass (no subagent, no market surface). Bands run: A, M, B (B5/B7/B9/B9b/B10b/B11/B12), C, D, E (E1-E5), F (F1-F5), H. Fresh live queries on PostgREST via `semantius` CLI.

- **Current footprint.** Domain 166 SEM, 3 full modules (105 STRATEGY-DEFINITION, 106 EXECUTION-TRACKING, 107 OPERATING-RHYTHM), 0 starters, 0 cross-cutting host junctions. 4 domain-owned masters (`strategy_maps` 808, `strategic_initiatives` 274, `operating_reviews` 809, `strategy_decisions` 810) plus 1 embedded master (`okr_objectives` 245). 7 capabilities. 13 solutions (10 primary + 3 secondary). 11 trigger_events. 4 intra-domain handoffs (1201-1204), 4 outbound cross-domain (1205-1208 to SPM, EPM), 0 inbound. 22 lifecycle states. 3 system skills (166, 167, 168) with 27 `skill_tools` rows. 9 baseline permissions + 9 workflow-gate permissions. 3 roles (`EXECUTIVE-CHIEF-OF-STAFF` 10055, `EXECUTIVE-STRATEGY-ANALYST` 10056, `HEAD-OF-DEPARTMENT` 10057). 13 aliases. 0 regulations. 4 APQC `handoff_processes` rows (832-835, all `agent_curated`, `new`).
- **Bucket 1 (in-scope, agent fixable):** 7 items.
- **Bucket 2 (surface-for-user, judgment):** 4 items.
- **Bucket 3 (Phase 0 pending, speculative):** 0 items in this pass (prior B3 candidates carry forward in `state.yaml`).
- **`next_action_by`:** `user` (B1-A4 / B1-S7 / B1-S1 all gated on Bucket 2 answers; agent-solvable B1-S2 / B1-S3 remain).

### Band-by-band results

| Band | Result | Note |
| --- | --- | --- |
| A1 (`domains` metadata) | pass | crud=80, biz_logic populated, min_org_size `30 m <2500`, cost_band `$$$`, US TAM 600M (2024). |
| A4 (`domains` catalog UX) | fail | `catalog_tagline` and `catalog_description` both empty. Routes to B1-A4 / B2-A4. |
| M1 / M2 (module floor) | pass | 3 full modules; 7 capabilities so the `>=3 caps -> >=2 modules` check passes. |
| M4 (every capability has realizing module) | pass | 7/7 capabilities linked via `domain_module_capabilities`. |
| M5 (workflow-gate state has `domain_module_id`) | pass | 9/9 SEM workflow-gate states carry the realizing module FK. The 10 `okr_objectives` states sit on modules 51 (TALENT) and 150 (WORK-MGMT) correctly; SEM embeds, doesn't author. |
| M6 (every module realizes >=1 capability) | pass | 105 -> 3 caps, 106 -> 3 caps, 107 -> 1 cap. 107 with a single capability is borderline thin; not a failure but surfaced for the user as a B2 note inside B2-A4. |
| M7 (single-master integrity) | pass | `strategy_maps` 808 master in 105 + consumer in 106 (cross-module read; structurally fine). `strategic_initiatives` 274 master in 106 + consumer in 107 (same pattern). `okr_objectives` 245 embedded_master in 105 + consumer in 106 / 107 (canonical lives in WORK-MGMT-GOALS-OKR 150). No multi-master collision. |
| M8 (module catalog UX) | fail | All 3 modules carry empty `catalog_tagline` and `catalog_description`. Routes to B1-A4 / B2-A4. |
| B5 (master pattern flags considered) | partial | `okr_objectives.has_personal_content=true`; `operating_reviews.has_submit_lock=true`; `strategy_decisions.has_submit_lock=true` + `has_single_approver=true`; `strategy_maps` all flags false (config-shape); `strategic_initiatives` all flags false (the prior B2-S5 candidate to flip `has_submit_lock` on terminal states still pending; folded into B2-A4 conversation). |
| B7 (data_object metadata complete) | pass | All 5 masters have `singular_label`, `plural_label`, `description`. |
| B9 (`trigger_events` cover state machine) | pass | 11 events with categories populated. Event 1264 `strategic_objective.cascaded` still `lifecycle` (B1-S8 carries forward). |
| B9b (intra-domain cross-module handoffs) | pass | 4 intra-domain rows: 105 -> 106 (cascade), 106 -> 107 (approved), 106 -> 107 (completed), 107 -> 106 (decision). |
| B10b (cross-domain handoff target_module FK) | fail | All 4 outbound (1205-1208) carry NULL `target_domain_module_id`. SPM (9) and EPM (66) still have zero `domain_modules` loaded. Re-queue once Phase B lands. Carries forward as B1-S4. |
| B11 (intra-domain reference graph) | partial | 19 `data_object_relationships` rows touch SEM masters (composition, reference, association edges; `users` edges clean). The 4 intra-domain handoffs are the structural minimum. Missing rollup loops carry forward as B1-S2. |
| B12 (zero-inbound asymmetry) | fail | 0 inbound cross-domain handoffs. Carries forward as B1-S1. |
| C1 (`business_function_domains`) | pass | 3 rows: `Executive` owner, `Business Operations` contributor, `Finance` consumer. |
| C1 (cross-domain consumer DMDOs) | partial | Only WORK-MGMT-TASK-EXEC consumes a SEM master (`strategic_initiatives`). Carries forward as B1-S6. |
| D1 (deployment shape) | pass | Each of 3 modules has at least one master + a system skill + role_modules entries. |
| E1 (`roles` exist + `role_code`) | pass | 3 roles bound to SEM modules: `EXECUTIVE-CHIEF-OF-STAFF` (10055), `EXECUTIVE-STRATEGY-ANALYST` (10056), `HEAD-OF-DEPARTMENT` (10057). |
| E2 (`role_modules` 2-module floor) | pass | Each role spans all 3 SEM modules. |
| E3 (`role_permissions` >=1 row per role) | pass | 10055 -> 3 rows (admin x3); 10056 -> 4 rows (manage / read / read + `cascade_objective` gate); 10057 -> 5 rows (read / manage / read + `approve_initiative` + `complete_initiative` gates). |
| E4 (permission tier alignment) | pass | Bundle tiers look workflow-coherent. |
| E5 (`permission_hierarchy` rollups present) | report-only | Zero `permission_hierarchy` rows reference SEM permissions. Tier rollups are platform-derived at request time. No catalog action; surfaced for visibility. |
| F1 (>=1 system skill per module) | pass | 3 system skills (166, 167, 168), one per module. |
| F2 (exactly 1 system skill per module) | pass | 1:1 mapping verified. |
| F3 (>=1 `skill_tools` per system skill) | pass | 9 / 7 / 11 rows respectively. |
| F4 (operation_kind / data_object_id invariants) | pass | Every `query` and `mutate` tool has `data_object_id`; every `side_effect` (`notify_person` 913, `create_calendar_event` 41) and `compute` (`generate_text` 49) has `data_object_id=NULL`. |
| F5 (Semantius score computability) | pass | Strict score: 24/27 = 88.9% `platform`. The 3 `external`-tier rows are `generate_text` (used twice as `optional`) and `create_calendar_event` (used once as `required` on skill 168). |
| H1 (APQC tagging) | pass | 4/4 cross-domain handoffs tagged at `record_status='new'`, `proposal_source='agent_curated'` (handoff_processes rows 832-835). Catalog-quality (approved) = 0; process-health (agent_curated) = 4. Quality headline awaits user review. |

### Bucket 1, In-scope confirmed gaps

#### Rule #15 notes-pollution (expanded scope)

| ID | Finding | Fix |
| --- | --- | --- |
| **B1-S7** | Pollution is wider than reported on 2026-05-30: (i) `data_objects.notes` on `strategy_maps` 808 still carries the config-shape rationale prose; (ii) 27 `skill_tools.notes` rows still carry workflow-context prose; (iii) **NEW:** 5 `domain_data_objects.notes` rows on domain 166 carry rationale prose (master / consumer annotations on `strategic_initiatives`, `users`, `org_units`, `employees`, `cost_centers`, `okr_objectives`); (iv) **NEW:** all 9 `role_modules.notes` rows carry per-role-per-module prose; (v) **NEW:** 3 `role_permissions.notes` rows on roles 10056 / 10057 carry workflow rationale ("Analyst executes the cascade once the Chief of Staff approves it.", "Heads approve initiatives within their department.", "Heads mark their own initiatives complete."). Total polluted rows: 1 + 27 + 5 + 9 + 3 = **45 rows** across 5 tables. Gated on B2-S1 user confirm. | On B2-S1 approval: PATCH `notes=''` on all 45 rows via a single chunked loader. |

#### STRUCTURAL band failures (carried forward)

| ID | Band | Finding | Fix |
| --- | --- | --- | --- |
| **B1-S2** | B11 missing intra-domain handoffs | Two rollup handoffs absent: (a) `source_domain_module_id=106, target=105, trigger_event_id=1375, data_object_id=245` (okr_objective.scored rollup to strategy map); (b) `source_domain_module_id=107, target=105, trigger_event_id=1266, data_object_id=274` (strategic_initiative.completed rollup to strategy map for benefits realisation). Both source events exist live (1375, 1266). | INSERT 2 `handoffs` rows. |
| **B1-S3** | B11 missing trigger_events | Two new events absent: `okr_objective.deprecated` (state_change on 245), `strategic_initiative.benefits_realized` (state_change on 274). Unblocks EPM inbound + re-baseline cascade scenarios. | INSERT 2 `trigger_events` rows. |
| **B1-S1** | B12 zero-inbound asymmetry | 0 inbound cross-domain handoffs. 2 readily-available source events exist (1374 `okr_objective.committed`, 1375 `okr_objective.scored`). 4 candidate inbounds need either coordination with EPM / ERP-FIN / TALENT-MGMT or B1-S3 to land first. Gated on B2-S2 / B2-S5. | INSERT 2-6 inbound `handoffs` rows per B2-S5 selection. |
| **B1-S4** | B10b report-only | All 4 outbound (1205-1208) carry NULL `target_domain_module_id`. SPM (9) and EPM (66) still have 0 `domain_modules`. Re-queue. | No SEM-side write. |
| **B1-S5** | Asymmetric event 150 ownership | Event 150 `okr_objective.created` published by SPM (zero modules) on data_object 245 (mastered by WORK-MGMT). Routes to WORK-MGMT + SPM. | No SEM-side write. |
| **B1-S6** | C-band downstream consumer DMDOs | SPM / EPM / ERP-FIN / HCM should add `consumer` DMDO on `strategic_initiatives` (and where relevant `okr_objectives`). | No SEM-side write. |
| **B1-S8** | Optional event_category PATCH on 1264 | `strategic_objective.cascaded` (1264) categorised `lifecycle`; arguable `state_change`. | Surgical PATCH on user confirm. |

#### A4 / M8 catalog UX

| ID | Band | Finding | Fix |
| --- | --- | --- | --- |
| **B1-A4** | A4 + M8 (Rule #20) | `domains.catalog_tagline` and `catalog_description` empty on SEM (166). All 3 modules (105 / 106 / 107) carry empty `catalog_tagline` and `catalog_description`. Total 8 empty buyer-facing fields. Rule #20 allows backfill via draft, surface, approve, write. | Draft 4 taglines + 4 descriptions per Rule #20 voice rule, surface to user, write after approval. Gated on B2-A4. |

#### Bucket 1 count summary

| Finding type | Count |
| --- | --- |
| Rule #15 remediation (B1-S7) | 1 |
| STRUCTURAL band failures (B1-S1 through B1-S6, B1-S8) | 7 |
| A4 / M8 catalog UX (B1-A4) | 1 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| BOUNDARY | 0 |
| APQC TAGGING | 0 (already applied 2026-05-31 continuation) |
| MODULARIZATION ISSUES | 0 |
| **Bucket 1 total** | **9 IDs, presented as 7 distinct workstreams since B1-S4 / B1-S5 / B1-S6 are report-only** |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent cannot answer | Options |
| --- | --- | --- | --- |
| **B2-S1** | Rule #15 notes-pollution remediation, scope expanded to **45 rows** across `data_objects` (1), `skill_tools` (27), `domain_data_objects` (5), `role_modules` (9), `role_permissions` (3). All wording reads as auto-populated by loaders (uniform tone, mechanical paraphrase of role / necessity). Were any user-approved? | PostgREST cannot reveal author provenance. | (a) confirm all auto-populated; PATCH all 45 rows to empty string and log Rule #15 incident; (b) confirm user-approved; leave in place; (c) per-row decision. |
| **B2-S2** | B12 inbound authoring scope. Author 2 readily-available now (events 1374, 1375), queue 4 coordination-required? | Workflow-priority call. | (a) 2 now + 4 queued; (b) all 6 queued; (c) 2 now + follow-up audit for the 4. |
| **B2-S5** | SEM intent: integrated-path publisher (B1-S1 acted on) or write-mostly (B1-S1 declined)? Merges old B2-S4 (intent) with old B2-S5 (pattern flags); the pattern-flag candidates on `strategic_initiatives` can be answered in the same exchange. | Product-shape call. | (a) integrated; (b) write-mostly; (c) mixed (specify inbounds). |
| **B2-A4** | Catalog UX backfill. SEM domain + all 3 modules have empty `catalog_tagline` and `catalog_description`. Rule #20 allows backfill via draft, surface, approve, write. Draft now? | Wording must be approved per row before write; Rule #20 forbids unapproved generation into buyer-facing surface. | (a) draft all 8 strings (1 tagline + 1 description x 4 grains) and surface in a follow-up message; (b) defer to a marketing pass; (c) draft module strings only and leave domain-grain for later. |

Note: prior B2-S3 (`okr_objectives` multi-master intent description rewording) is folded out for this pass since the live data is consistent with the single-canonical reading and the description states the multi-master intent. Re-raise if the user wants a follow-up rewording exchange.

### Bucket 3, Phase 0 pending (speculative)

No market-surface subagent was spawned for this pass. Prior Bucket 3 candidates (`kpis`, `strategic_themes`, `okr_check_in_summaries`, `strategy_health_signals`, `benefits_tracking_records` as consumer, SEM-KPI-MGMT module candidate, Hoshin Pillars capability candidate) carry forward in `state.yaml` as `b3` entries, each with the prior vendor-knowledge basis preserved.

### Cross-bucket dependencies

- B1-S7 gated on B2-S1.
- B1-S1 gated on B2-S2 AND B2-S5.
- B1-A4 gated on B2-A4.
- B1-S2 / B1-S3 / B1-S8 independent of Bucket 2.
- B1-S4 / B1-S5 / B1-S6 report-only, no SEM-side dependency.

### Report-only follow-ups (owed by other domains)

Carried over from 2026-05-30. No new entries this pass. Owing domains: SPM, EPM, WORK-MGMT, ERP-FIN, TALENT-MGMT, HCM (see prior section).

### Decisions

(none yet, audit pending user review)

### Fixes applied

(none yet, structural audit is read-only)

### JWT errors

None.

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
