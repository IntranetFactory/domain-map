---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 23
---

# SPM — Audit History

## 2026-05-30 — Validate b1 (full 4-pass)

### Summary

- **Current footprint:** **0 `domain_modules`** (M1 hard fail, blocks the entire M / B / E / F band cascade). Legacy `domain_data_objects` rollup carries 9 masters (`strategic_portfolios`, `strategic_initiatives`, `roadmap_items`, `business_value_assessments`, `resource_allocations`, `demand_intake_requests`, `scenario_plans`, `dependency_chains`, `benefits_tracking_records`) plus 5 non-master rows (`work_items` consumer, `financial_scenarios` consumer, `workforce_scenarios` consumer, `position_demand_forecasts` contributor, `service_projects` consumer). 1 capability only (`SEM-PORTFOLIO-ALIGN`, dual-linked to SEM and SPM). 9 solutions (5 primary, 2 secondary, 2 partial). 15 trigger_events; 13 outbound + 13 inbound cross-domain handoffs (every outbound row has NULL `source_domain_module_id` because no modules exist; 5 events carry empty `event_category`). 0 aliases. 0 lifecycle states owned by any SPM module (the 5 states on `strategic_initiatives` are owned by `SEM-EXECUTION-TRACKING`, not SPM). 0 `users` edges. 1 legacy domain-level `system` skill (id 6, `spm-system`, `domain_id=9`, `domain_module_id=NULL`) with 17 `skill_tools` rows (strict Semantius score 100%, but F2 still fails because no module-anchored skill exists). 3 `business_function_domains` (Executive owner, Finance contributor, IT Operations contributor). 0 roles. 3 APQC tags on 26 cross-domain handoffs, all `discovery_substring`, zero `agent_curated`.
- **Bucket 1 (in-scope, agent fixable):** **11 items.**
- **Bucket 2 (surface-for-user, judgment):** **3 items.**
- **Bucket 3 (Phase 0 pending, speculative):** **9 items.**
- **Candidates queued to `_missing-domains.md`:** 0 (every candidate adjacency surfaced by SPM, e.g. SEM, EPM, PROD-MGMT, SWP, WORK-MGMT, VSDP, ITOM, BPA, HAM, DCIM, APM, already exists in the catalog).

**Vendor-surface basis.** Flagship-vendor enumeration for SPM (Gartner SPM Magic Quadrant + Forrester Wave + public schema docs): ServiceNow Strategic Portfolio Management (loaded, primary), Planview Portfolios (loaded, primary), Broadcom Clarity PPM (loaded, primary), Atlassian Jira Align (loaded, primary), Microsoft Project for the Web (loaded, primary), Apptio IT Planning Foundation (loaded, secondary), Dragonboat (loaded, secondary). All five Gartner leaders are present in `solutions`; the partial-coverage Asana + Smartsheet rows are correctly classified as `partial` since they cover the work-management slice only.

**Headline structural verdict.** The SPM domain row is a market entry with no deployable surface. Every Phase-M / Phase-B / Phase-E / Phase-F band tied to modules fails by absence. The legacy `domain_data_objects` rollup paints a 9-master picture that does not survive translation to `domain_module_data_objects`: at the DMDO layer, `strategic_initiatives` is mastered by `SEM-EXECUTION-TRACKING` (module 106, SEM domain 166), `roadmap_items` is held only as a `consumer` of `PM-ROADMAP-DELIVERY` (module 131, PROD-MGMT domain 101), and the other 7 declared masters have NO DMDO rows anywhere. Phase A loaded correctly (A1 metadata, A3 solutions), but Phase M / Phase B were never executed, leaving the domain in a structurally hollow state. Compounding this, a separate domain row SEM (id 166, `Strategy Execution Management`) carries three full modules (`SEM-STRATEGY-DEFINITION`, `SEM-EXECUTION-TRACKING`, `SEM-OPERATING-RHYTHM`) covering the strategic-initiative / OKR / operating-rhythm surface that SPM also claims, and the single shared capability `SEM-PORTFOLIO-ALIGN` is dual-linked to both domains. The duplication-versus-modularization question (Bucket 2) is the highest-impact judgment call in this audit.

**Neighbor discovery** (auto-derived from `handoffs` + cross-domain DMDO rows, ranked by edge weight):

| Neighbor | Out | In | DMDO touch | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| WORK-MGMT | 3 | 3 | 3 (initiatives + portfolios + business value consumer) | 1 | 10 | Pairwise (full) |
| EPM | 3 | 1 | 0 | 1 (financial_scenarios consumer in SPM) | 5 | Pairwise (full) |
| SEM | 0 | 2 | 1 (`strategic_initiatives` master in SEM, claimed by SPM legacy rollup) | shared capability + state ownership | 5 | Pairwise (full) — duplication audit |
| SWP | 2 | 0 | 1 (workforce_scenarios consumer in SPM) | 0 | 3 | Pairwise (full) |
| PROD-MGMT | 1 | 0 | 1 (roadmap_items consumer in PROD-MGMT) | 0 | 2 | Lightweight |
| APM | 0 | 1 | 0 | 0 | 1 | Lightweight |
| VSDP | 1 | 1 | 0 | 0 | 2 | Lightweight |
| TALENT-MGMT | 1 | 0 | 1 (business_value_assessments consumer in TALENT-MGMT) | 0 | 2 | Lightweight |
| ITOM | 0 | 1 | 0 | 0 | 1 | Lightweight |
| HAM | 0 | 1 | 0 | 0 | 1 | Lightweight |
| DCIM | 0 | 1 | 0 | 0 | 1 | Lightweight |
| BPA | 0 | 1 | 0 | 0 | 1 | Lightweight |

**S-band coverage sweep.** S1 routes every per-FK count back to its owning band. S2 is vacuously empty (no modules ⇒ no rows). S3 (per-master indirect coverage) returns 0 / 0 / 0 across every SPM master for states / events / aliases except `strategic_initiatives` (5 states owned by SEM-EXECUTION-TRACKING, 4 events) and a handful of events on other masters with zero aliases. The cumulative reading is: nothing routine survives module absence.

### Bucket 1 — In-scope confirmed gaps

| Finding type | Count |
| --- | --- |
| STRUCTURAL (M / B / F band failures) | 7 |
| BOUNDARY (B9b deferred to M1 resolution; B10b NULL FKs on outbound) | 2 |
| APQC TAGGING (proposed `agent_curated` rows; some deferred until module owner clear) | 1 (rolled-up table) |
| MISSING (Phase-B masters never declared at module layer) | 1 (rolled-up bullet) |
| **Bucket 1 total** | **11** |

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 (hard fail) + downstream M2/M4/M6** | **SPM has zero `domain_modules` rows.** The legacy `domain_data_objects` rollup names 9 masters and 5 non-master rows but Phase M was never executed, so nothing is deployable. Every M-band, F-band, and E-band failure below is a downstream effect of this. The fix is upstream: hand-author the SPM module set per Rule #14. **Until Bucket 2 question B2-S1 (SPM vs. SEM duplication) is resolved, the module shape itself is open** (either SPM is its own 2-module domain with its own portfolio + rationalization-style split, or SPM folds into SEM as a 4th module, or SPM becomes a leadership-tier landing-only domain pointing at SEM and EPM). Recommended provisional shape pending B2-S1: 2 full modules `SPM-PORTFOLIO-PLANNING` (mastering `strategic_portfolios`, `roadmap_items`, `demand_intake_requests`, `dependency_chains`) and `SPM-RESOURCE-CAPACITY` (mastering `resource_allocations`, `scenario_plans`, `business_value_assessments`, `benefits_tracking_records`), with `strategic_initiatives` consumed from `SEM-EXECUTION-TRACKING` rather than re-mastered (M7 single-master rule). | Block until B2-S1 lands. Then INSERT the chosen `domain_modules` rows, the `domain_module_capabilities` linking `SEM-PORTFOLIO-ALIGN` to whichever module realizes investment-alignment, the `domain_module_data_objects` rows promoting 8 of the 9 legacy masters to module-level masters, and one `consumer` row on `strategic_initiatives` pointing at the chosen SPM module. |
| B1-S2 | **B9 `event_category` enum violation (Rule #13)** | 5 `trigger_events` on SPM masters carry `event_category=""` (Rule #13 requires `lifecycle / state_change / threshold / signal`). Affected: 872 `business_value_assessment.completed`, 873 `dependency_chain.identified`, 874 `benefits_tracking_record.realized`, 875 `benefits_tracking_record.at_risk`. Also inbound from neighbors: 635 `capacity_record.forecast_exhaustion`, 683 `hardware_model.eol_announced`, 695 `dc_capacity_plan.refreshed`, 855 `value_stream_metric.published`, 867 `process_simulation_run.completed`, 870 `work_automation.triggered`, 585 `financial_scenario.modeled` — those 7 are **report-only** because the owning domain is not SPM. SPM owns the 4 outbound events. | PATCH the 4 SPM-owned events: 872 → `lifecycle` (assessment is a lifecycle completion), 873 → `signal` (dependency identification is a discovery signal), 874 → `lifecycle` (realization is a lifecycle terminal), 875 → `threshold` (at-risk is a threshold-crossing). |
| B1-S3 | **B7 (hard fail) — zero `users` edges** | No `data_object_relationships` rows link any of the 9 SPM masters to `users` (data_object_id 748). Every SPM master has user actors (portfolio owner, initiative sponsor, demand requester, scenario planner, allocation approver), and Rule #10 requires these built-in edges be recorded explicitly because architect agents cannot guess them from naming alone. | Author 9+ relationship rows linking `users → strategic_portfolios` (owner), `users → strategic_initiatives` (sponsor + approver), `users → roadmap_items` (planner), `users → business_value_assessments` (assessor + approver), `users → resource_allocations` (allocator + approver), `users → demand_intake_requests` (requester + approver), `users → scenario_plans` (planner + reviewer), `users → benefits_tracking_records` (owner). Standard verb-form `<entity>_<actor>` per the catalog convention. Block until B1-S1 lands (the relationship verbs are clean before-vs-after-modules; the rows themselves are correct in either resolution). |
| B1-S4 | **B11 — zero aliases on every master** | None of the 9 SPM masters has a `data_object_aliases` row. Each has well-known vendor / industry synonyms (Planview *Strategies*, Jira Align *Initiatives*, Asana *Portfolios*, ServiceNow *Demands*, Apptio *Investment Categories*, Clarity *Investments*, etc.). | Author 1+ alias per master at fix-time (typical 2-3 aliases each). Apply Rule #18: alias_name carries the vendor synonym, never narrated in `description` or `notes`. |
| B1-S5 | **F1 + F2 — legacy domain-level system skill, zero module-level skill** | Skill id 6 (`spm-system`, `skill_type=system`, `domain_id=9`, `domain_module_id=NULL`) is the legacy pre-modular system skill for SPM. Per F1 it is obsolete the moment any module-level system skill exists; per F2 every `domain_modules` row needs exactly one `skill_type=system` skill. SPM has neither (no modules), and the legacy skill carries 17 `skill_tools` rows that need to be split or re-anchored once modules exist. | Block until B1-S1 lands. Then either (a) re-anchor skill 6 onto the new module (if the single-module shape wins) and split tools by module realization, or (b) DELETE skill 6, author one `system` skill per new module, and migrate the 17 tools by module. |
| B1-S6 | **B12 — zero SPM-owned lifecycle states** | `data_object_lifecycle_states` rows on SPM masters: 5 rows on `strategic_initiatives` (states 694-698), every one of them owned by SEM module 106 (`SEM-EXECUTION-TRACKING`), not by SPM. The other 8 SPM masters have zero lifecycle states. This is a downstream effect of B1-S1; the rule expects every workflow-bearing `master + required` data_object to ship lifecycle states. | Block until B1-S1 lands. Author state machines for `strategic_portfolios` (proposed / active / under_review / rebalanced / sunset), `strategic_initiatives` (if SPM masters it, otherwise consume from SEM and skip), `roadmap_items` (planned / committed / in_development / released / cancelled), `business_value_assessments` (draft / submitted / approved), `demand_intake_requests` (submitted / screened / approved / rejected / fulfilled), `resource_allocations` (proposed / approved / committed / consumed), `scenario_plans` (draft / evaluated / approved / archived), `benefits_tracking_records` (baseline / tracking / realized / at_risk / written_off). `dependency_chains` is likely config-shape (no workflow), surface in Bucket 2 for explicit user judgment. |
| B1-S7 | **B4 pattern flags — all false-by-default, no positive consideration** | Every SPM master has `has_personal_content = has_submit_lock = has_single_approver = false`. Per Rule #12 and B4, false-by-default is not the same as false-after-review. Several candidates warrant `true` after consideration: `business_value_assessments.has_submit_lock=true` (a published assessment should freeze so dependents can rely on it), `business_value_assessments.has_single_approver=true` (PMO / sponsor approval gate), `scenario_plans.has_submit_lock=true` (an evaluated scenario should freeze for downstream what-if comparisons), `demand_intake_requests.has_single_approver=true` (intake-board approval), `resource_allocations.has_single_approver=true` (resource committee approval), `strategic_initiatives.has_single_approver=true` (executive sponsor). | Surface to Bucket 2 because the decision is a workflow-shape judgment the user owns. Note: positive-consideration recording goes in the audit conversation per Rule #15, NOT in `data_objects.notes`. |

#### BOUNDARY findings

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S8 | **B10b — NULL `source_domain_module_id` on every outbound row (in-scope after B1-S1)** | All 13 outbound handoffs (793, 178, 240, 244, 243, 245, 246, 242, 792, 794, 795, 796, 241) carry `source_domain_module_id=NULL` because no SPM modules exist. The 5 outbound rows with NULL `target_domain_module_id` (245 → EPM, 246 → EPM, 792 → EPM, 794 → VSDP, 795 → EPM) are **report-only** owed by the target domain's B10b. | Block until B1-S1 lands. Then re-run the deterministic B10b derivation (`source_domain_module_id` = SPM module mastering the trigger event's data_object): for the 4 outbound rows with event on `strategic_initiatives` (274) and one on `business_value_assessments` (276) the resolution waits on which SPM module masters which entity. |
| B1-S9 | **B9b — zero intra-domain cross-module `handoffs` rows (deferred to B1-S1)** | Pre-check: SPM currently has 0 modules, so B9b's "≥2 modules" precondition is false and B9b is vacuously skipped. Once B1-S1 lands the chosen module shape, B9b becomes mandatory and several intra-domain handoffs become expected (`demand_intake.approved` → portfolio module → resource module; `scenario_plan.evaluated` → portfolio module → planning module; `business_value_assessment.completed` → planning module → benefits module). | Block until B1-S1 lands. Then enumerate cross-module handoffs per B9b's three-source procedure. |

#### APQC TAGGING (matches the SKILL anti-pattern: prior audits ship structural findings but zero `agent_curated` tags)

Only 3 of 26 cross-domain handoffs (combined outbound 13 + inbound 13) carry `handoff_processes` rows. **All 3 are `proposal_source='discovery_substring'`; zero `agent_curated`.** Existing rows: handoff 241 + 245 → process 16 (`Develop and measure strategic initiatives`, L2 10016); handoff 242 → process 713 (`Determine sales resource allocation`, L4 10209 — wrong fit, SPM resource allocation is enterprise-wide, not sales-bound). Volume expectation per SKILL: 0.5N to 0.8N for N=26 → 13-21 `agent_curated` tags during this audit pass.

Routine high-confidence tags to author at fix time (covers outbound only; inbound tags belong to the source domain's audit per the asymmetry rule, listed under Report-only follow-ups):

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id | Confidence |
|---|---|---|---|---|---|---|
| 240 | SPM → WORK-MGMT | `demand_intake.approved` | `strategic_initiatives` | Select strategic initiatives (10059 L3) | 104 | confident L3 |
| 241 | SPM → SWP | `initiative.kickoff` | `strategic_initiatives` | Execute strategic initiatives (19507 L3) | 106 | confident L3 (replaces existing discovery_substring → 10016 L2 with a more precise child) |
| 242 | SPM → SWP | `resource_allocation.committed` | `resource_allocations` | Identify, select, and assign resources (20065 L4) OR Match resource demand with capacity (20053 L4) | 905 or 889 | confident L4 (replaces wrong-fit discovery_substring → 10209 sales-bound) |
| 243 | SPM → PROD-MGMT | `roadmap_item.released` | `roadmap_items` | Develop and manage execution roadmap (20005 L4) | 625 | confident L4 |
| 244 | SPM → WORK-MGMT | `strategic_portfolio.rebalanced` | `strategic_portfolios` | Monitor and control portfolio (16404 L4) | 1654 | confident L4 |
| 245 | SPM → EPM | `initiative.completed` | `strategic_initiatives` | Review execution of strategic initiatives (21422 L3) | 107 | confident L3 (replaces discovery_substring → 10016 L2 with a more precise child) |
| 246 | SPM → EPM | `scenario_plan.evaluated` | `scenario_plans` | Manage portfolio (16401 L3) OR Quantify value of IT service and project portfolio investments (20695 L4) | 409 or 1139 | needs PCF lookup at fix time |
| 792 | SPM → EPM | `benefits_tracking_record.realized` | `benefits_tracking_records` | Monitor and analyze IT value and benefits (20687 L4) | 1133 | confident L4 |
| 793 | SPM → TALENT-MGMT | `business_value_assessment.completed` | `business_value_assessments` | Determine business value for each strategic priority (19978 L4) | 517 | confident L4 |
| 794 | SPM → VSDP | `dependency_chain.identified` | `dependency_chains` | Manage IT projects and services interdependencies (20689 L4) | 1135 | confident L4 |
| 795 | SPM → EPM | `benefits_tracking_record.at_risk` | `benefits_tracking_records` | Monitor and analyze IT value and benefits (20687 L4) | 1133 | confident L4 (shares anchor with 792 since both events relate to the same PCF) |
| 796 | SPM → WORK-MGMT | `business_value_assessment.completed` | `business_value_assessments` | Determine business value for each strategic priority (19978 L4) | 517 | confident L4 |
| 178 | SPM → WORK-MGMT | `okr_objective.created` | `okr_objectives` | Develop strategic initiatives (10057 L3) — but really this event's data_object is OKRs, owned upstream by SEM; payload mis-attribution to SPM | defer | defer — payload review needed |

This whole table is a single Bucket 1 item per the SKILL count convention (one APQC TAGGING line). All 12 confident rows ship together via `handoff_processes` INSERT after B1-S1 unblocks (the rows are valid even if SPM ends up folded into SEM — the `handoff_id` survives, only the source-side module attribution changes). The 1 deferred row (178) routes to a payload-review conversation.

### Bucket 2 — Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **SPM vs. SEM domain duplication.** SPM (id 9, `Strategic Portfolio Management`) and SEM (id 166, `Strategy Execution Management`) overlap heavily: both claim `strategic_initiatives` as a master in their legacy `domain_data_objects` rollups, SEM has it as a real DMDO master in module 106 while SPM has only the legacy rollup; the single capability `SEM-PORTFOLIO-ALIGN` is dual-linked to both; the 5 lifecycle states for `strategic_initiatives` are owned by SEM module 106; SPM has zero modules while SEM has 3. The flagship vendors split: ServiceNow markets a single product called "Strategic Portfolio Management" that covers both surfaces; Planview Portfolios + Jira Align similarly cover both. The market-vs-catalog test: there is one Gartner Magic Quadrant ("Strategic Portfolio Management"), not two. Catalog options: (a) MERGE — SPM is the canonical domain, SEM's three modules re-host on SPM via `domain_module_host_domains` (or via re-parenting `domain_id`), SEM domain row is retired; (b) MERGE inverse — SEM is canonical, SPM domain row retired, the 9 legacy-rollup SPM masters land in new SEM modules; (c) KEEP SPLIT with clear boundary — SPM owns the planning / investment / scenario / capacity surface, SEM owns the execution / OKR / operating-rhythm surface, the shared `strategic_initiatives` master stays in SEM, SPM consumes it. The recommended default is (c) because it matches the actual catalog state and minimizes data movement; the structural cleanup is then "give SPM its own modules around planning / resource / value surface, leave SEM modules untouched". | The decision is editorial / architectural and depends on how the user thinks about the platform-vs-silos analysis for this market. The catalog evidence supports (c) most cleanly (SPM has unique masters SEM doesn't: `strategic_portfolios`, `roadmap_items`, `resource_allocations`, `demand_intake_requests`, `scenario_plans`, `dependency_chains`, `benefits_tracking_records`, `business_value_assessments`) but the vendor evidence is mixed. | (a) merge SPM→SEM; (b) merge SEM→SPM; (c) keep split, finish SPM's module shape per B1-S1 recommended-default. |
| B2-S2 | **B4 pattern flag positive re-evaluation per Rule #12.** Specific flags to consider: `business_value_assessments.has_submit_lock` (freeze on publish?), `business_value_assessments.has_single_approver` (PMO / sponsor approval?), `scenario_plans.has_submit_lock` (freeze on evaluation?), `demand_intake_requests.has_single_approver` (intake-board approval?), `resource_allocations.has_single_approver` (resource committee?), `strategic_initiatives.has_single_approver` (executive sponsor — but if `strategic_initiatives` ends up SEM-only per B2-S1 this becomes SEM's question). | Pattern flags are workflow-shape judgments the user owns; the default `false` doesn't establish review. Per Rule #15 the consideration record goes in the audit conversation, not `data_objects.notes`. | Per-flag yes/no from user. |
| B2-S3 | **`dependency_chains` config-shape exemption** (Rule #12). The master describes a network of inter-initiative dependencies which is typically refreshed-on-snapshot, not state-machined. Candidate exemption: config-shape, no workflow needed; track via `record_status` alone. The prior Rule #12 license to write the config-shape note to `data_objects.notes` is RESCINDED per Rule #15. | The decision is workflow-shape judgment. If user confirms exemption, no lifecycle state machine is loaded for 280; the audit conversation records the decision. | (a) confirm config-shape, skip lifecycle authoring; (b) author a small state machine (e.g. `identified / acknowledged / resolved`); (c) defer. |

### Bucket 3 — Phase 0 pending (speculative)

Phase 0 has not been run on SPM. The candidates below come from agent knowledge of flagship-vendor schemas (ServiceNow SPM, Planview Portfolios, Clarity PPM, Jira Align, Apptio IT Planning Foundation, Dragonboat). Each is a candidate entity needing Phase 0 vendor-research verification before promotion to Bucket 1.

1. **`program_increments`** (Jira Align, ServiceNow SAFe). SAFe / scaled-agile cadence rows that group initiatives into 8-12 week delivery quanta. Vendor basis: Jira Align is the SAFe canonical schema. Recommended verification: read Jira Align ART / PI docs.
2. **`okr_objectives` mastery clarification.** Currently consumed by SPM at the legacy rollup layer but not declared. In flagship SPM tools OKRs are often a separate master with its own lifecycle. Bucket 2 question B2-S1 changes this: if SPM/SEM merge, OKR mastery question changes shape.
3. **`investment_categories`** (Clarity PPM, Apptio "investment areas"). Buckets that aggregate initiatives by funding source, business unit, or strategic theme. Vendor basis: Clarity's investment hierarchy is its key conceptual model.
4. **`capacity_pools`** / **`resource_pools`**. ServiceNow + Planview model resource pools as a separate master from individual allocations. Currently `resource_allocations` is the only resource master, missing the pool-level rollup. Vendor basis: ServiceNow Resource Management API.
5. **`portfolio_funding_decisions`** (decision logs separate from initiative lifecycle). Apptio + Clarity model decision events for audit-traceability (who approved what, when, with what business case). Currently `business_value_assessments` carries the value side but not the decision side.
6. **`approval_workflows`** for portfolio gates. Cross-cutting capability already in the catalog (`APPROVAL-WORKFLOW`), but SPM doesn't link to it as a consumer. Vendor basis: ServiceNow's whole portfolio governance is approval-workflow-driven.
7. **`milestone_definitions`** / **`portfolio_milestones`**. Cross-initiative milestones tied to portfolio rollups (releases, financial close, exec reviews). Vendor basis: Microsoft Project for the Web + Smartsheet milestone semantics.
8. **`risk_registers`** (initiative-level risk tracking). ServiceNow's IRM integration with SPM, Clarity's risk module. Currently absent from SPM's footprint; may belong in GRC and be consumed here.
9. **`value_streams`** as a master separate from `dependency_chains`. Jira Align + ServiceNow VSDP both model value streams as first-class entities for SAFe portfolio mapping. Currently SPM consumes from VSDP via handoffs but doesn't declare. Note: VSDP (`Value Stream Delivery Platform`) is a sibling domain (id 80), so the right shape is likely consumer not master.

**Bucket 3 prompt:** vet via Phase 0 formal vendor research (a focused subagent producing `c:/tmp/SPM-phase0-<date>.md` reading the actual Jira Align / ServiceNow SPM / Planview / Clarity / Apptio schema docs), or eyeball-mode (name which candidates ring true and treat as confirmed)? Note: every Bucket 3 item is gated on Bucket 2 B2-S1, since the duplication decision changes whether each candidate lands in SPM or SEM modules.

### Cross-bucket dependencies

- **B1-S1 (M1 cascade) blocks B1-S3, B1-S5, B1-S6, B1-S8, B1-S9.** The module shape determines where masters land, which determines what edges, skills, states, and module FKs to author. No work on any of those can start until B2-S1 (duplication decision) resolves and the chosen module shape is loaded.
- **B2-S1 (SPM vs. SEM duplication) blocks every Bucket 3 item.** Each candidate's proposed module assignment depends on whether SPM keeps a 2-module shape or folds into SEM.
- **B2-S2 / B2-S3 (pattern flags + dependency_chains exemption) are independent of B2-S1 in the simple case** (the underlying masters survive the merge / split unchanged), so they can be answered now.
- **APQC tagging (B1-S6 rolled-up) is partially independent of B2-S1.** The `handoff_id`s and PCF candidates survive any duplication resolution; only the per-row module attribution changes. Safe to author the 12 confident rows immediately if user approves.
- **B1-S2 (event_category PATCH on 4 events) is fully independent.** Trivial, can land now.

### Per-bucket prompts

**Bucket 1 — fix these now?** Reply with: `all`, or list (e.g. `S2, APQC top-10`), or `skip`.

- **S1 (M1 hard fail + downstream cascade):** depends on B2-S1; block until that decision.
- **S2 (event_category PATCH on 4 events):** trivial; one PATCH each.
- **S3 (B7 users edges):** block until B2-S1 (verbs depend on module ownership of each master).
- **S4 (B11 aliases):** safe to author now; aliases are master-level and survive any duplication resolution.
- **S5 (F1 legacy system skill):** block until B2-S1.
- **S6 (B12 lifecycle states):** block until B2-S1 and B2-S3.
- **S7 (B4 pattern flags) :** depends on Bucket 2 B2-S2.
- **S8 / S9 (B10b NULL FKs + B9b intra-domain):** block until B2-S1.
- **APQC tagging (rolled-up):** load the 12 confident rows now or in a follow-up batch?

**Bucket 2 — what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (SPM vs. SEM duplication):** which option (a / b / c)? Recommended default is (c) split with clear boundary.
- **B2-S2 (pattern flag positive re-evaluation):** per-flag yes/no.
- **B2-S3 (dependency_chains config-shape exemption):** confirm / state-machine / defer.

**Bucket 3 — Phase 0 pending — vet via formal Phase 0 vendor research or eyeball-mode?** Will surface candidates when subagent returns.

### Report-only follow-ups (owed by other domains)

The asymmetry rule (B8 inbound, B10b counterparty side) routes the following items to OTHER domains' audits, not SPM's. They are NOT in-scope fixes for this audit.

- **SEM owes** lifecycle-state attribution: the 5 states on `strategic_initiatives` (694-698) owned by `SEM-EXECUTION-TRACKING` are correct in SEM but block SPM's B12 path. If B2-S1 lands as (c) keep-split, SEM's audit needs to confirm SEM owns canonical mastery and SPM consumes.
- **WORK-MGMT B9 owes outbound** on handoffs 176, 789, 1326, 1327 (`work_item.completed`, `work_automation.triggered`, `okr_objective.committed`, `work_project.completed`) — the source-side `event_category` and `source_domain_module_id` are already populated; the inbound APQC tags belong to WORK-MGMT's audit when it runs.
- **ITOM owes** B9 attribution: handoff 620 (`capacity_record.forecast_exhaustion`) has empty `event_category` (event 635) and NULL module FKs both sides.
- **EPM owes** B9 attribution: handoff 562 (`financial_scenario.modeled`) has empty `event_category` (event 585) and NULL module FKs.
- **HAM owes** B9 attribution: handoff 672 (`hardware_model.eol_announced`) — empty `event_category` + NULL module FKs.
- **DCIM owes** B9 attribution: handoff 680 (`dc_capacity_plan.refreshed`) — empty `event_category` + NULL module FKs.
- **VSDP owes** B9 attribution: handoff 772 (`value_stream_metric.published`) — empty `event_category` + NULL module FKs.
- **BPA owes** B9 attribution: handoff 785 (`process_simulation_run.completed`) — empty `event_category` + NULL module FKs.
- **APM owes** B10b target-side: handoff 1198 (`application_value.recalculated`) has `target_domain_module_id=NULL` (SPM target).
- **SEM owes** B10b target-side: handoffs 1205, 1206 (`strategic_initiative.approved/cancelled`) have `target_domain_module_id=NULL` (SPM target).
- **WORK-MGMT B8** owes inbound-direction `data_object_relationships` mirror: 3 inbound handoffs from WORK-MGMT into SPM have no mirroring relationship row.
- **B5 / B10b on target side of SPM's own outbound** (rows 245, 246, 792, 794, 795 with NULL `target_domain_module_id`) routes to EPM and VSDP audits.
- **APQC TAGGING — inbound side** (13 inbound handoffs) belongs to the source domain's audit per the asymmetry rule. Each of WORK-MGMT, EPM, SEM, APM, ITOM, HAM, DCIM, VSDP, BPA owes inbound-direction APQC classification for the row landing in SPM.

None of these block SPM's audit completion. The user may schedule audits on those domains to clear the cross-domain backlog.

## 2026-05-31, Continuation: B1 technical fixes

### Applied

- **B1-S2 (B9 `event_category` enum backfill, 4 SPM-owned events).** Per Rule #13's allowed values (`lifecycle / state_change / threshold / signal`), PATCHed the 4 `trigger_events` rows the audit pre-specified:
  - 872 `business_value_assessment.completed` -> `lifecycle`
  - 873 `dependency_chain.identified` -> `signal`
  - 874 `benefits_tracking_record.realized` -> `lifecycle`
  - 875 `benefits_tracking_record.at_risk` -> `threshold`

  Loader: `.tmp_deploy/fix_spm_b1_technical_2026_05_31.ts` (preflight read, PATCH per row, postflight verify, all four match intended values).

### Deferred (still gated, no live state change)

- **B1-S1 (M1 modules cascade).** Gated on B2-S1 (SPM vs. SEM duplication decision). User-owned editorial call.
- **B1-S3 (B7 `users` edges).** Audit lists target masters and actor roles in prose but explicitly blocks until B1-S1 lands so the verbs settle against the chosen module shape. Not pre-specified as exact `data_object_relationships` tuples per Rule #10.
- **B1-S4 (B11 aliases).** No exact `(data_object_id, alias_name)` tuples pre-specified in the audit, only vendor categories. Deferred per the "no bulk `data_object_aliases` without exact tuples" rule.
- **B1-S5 (F1 legacy `spm-system` skill).** Gated on B1-S1 / B2-S1; the re-anchor-or-delete choice depends on the chosen module shape.
- **B1-S6 (B12 lifecycle states).** Gated on B1-S1 and B2-S3 (`dependency_chains` config-shape exemption).
- **B1-S7 (B4 pattern flags).** Surfaced to Bucket 2 B2-S2 for per-flag user decision.
- **B1-S8 (B10b `source_domain_module_id` backfill).** Gated on B1-S1, no SPM modules exist yet.
- **B1-S9 (B9b intra-domain handoffs).** Gated on B1-S1, "≥2 modules" precondition currently false.
- **APQC tagging rolled-up table.** Per the audit, "All 12 confident rows ship together via `handoff_processes` INSERT after B1-S1 unblocks." Deferred until module shape lands.

### Frontmatter

Left untouched per the subagent contract; the open-questions count and status reflect Bucket 2 / Bucket 3 backlog, which is unchanged by this technical pass.
