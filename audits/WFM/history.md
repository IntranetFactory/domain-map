# WFM audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** **ZERO `domain_modules` rows** for WFM (domain id 59); 7 masters at the legacy `domain_data_objects` level (`work_schedules`, `work_shifts`, `time_entries`, `absence_requests`, `absence_balances`, `time_off_policies`, `meal_break_records`); 5 embedded_master rows (`employees`, `hcm_positions`, `job_profiles`, `org_units`, `cost_centers`); 5 capabilities + 1 cross-domain capability (`WORKFORCE-SCHEDULING`, id 312); 12 solutions (10 primary, 2 secondary, including UKG Dimensions, Workday Time Tracking, Workday Absence Management, Quinyx, Replicon, Deputy, WorkJam, When I Work, Legion WFM, Verint Workforce Management); 10 trigger_events; 8 outbound + 6 inbound cross-domain handoffs; 0 intra-domain handoffs; ZERO `data_object_aliases` rows; ZERO `data_object_lifecycle_states` rows on any of the 7 masters; ZERO pattern flags set on any master; 1 legacy domain-level `system` skill (`wfm-system`, id 121, `domain_module_id` NULL) + 9 `skill_tools` rows; ZERO WFM-prefixed roles; ZERO WFM-prefixed permissions; 5 regulations linked (FLSA, GDPR, EU Working Time Directive, Fair Workweek, BIPA); 2 business_function_domains rows (Accounting, Workforce Management).
- **Vendor-surface basis:** UKG Dimensions, Workday Time and Absence, Dayforce, Quinyx, Deputy, When I Work, Legion WFM, Verint WFM, Replicon, WorkJam (already linked); plus Reflexis, Branch, NICE IEX (specialty CCWFM) considered for the market-surface pass.
- **Bucket 1 (in-scope, agent fixable):** 13 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 8 items.
- **Candidates queued in `audits/_missing-domains.md`:** 2 (CCWFM, FRONTLINE-COMMS).

**Structural pass headline:** M1 hard-fails (zero `domain_modules`). Per Rule #14 and the per-domain checklist's structural gate, this blocks every downstream concern: F2 (one system skill per module) is uncomputable, F3 / F4 / F5 (skill-tools + score) likewise, E1 (multi-module role coverage) gated, B10b on every outbound row (no `source_domain_module_id` to populate), B9b not applicable until ≥2 modules, B12 (lifecycle states by realizing module) cannot resolve a `domain_module_id`. **Fixing M1 by loading the WFM module split is the precondition for every other fix.** The agent does NOT load that here (audit only); the audit names the proposed split so the orchestrator can dispatch a Phase A fix-load with explicit user approval.

**Neighbor discovery (auto-derived from handoffs + cross-domain DMDO, ranked by edge weight):**

| Neighbor | Out | In | DMDO cross-refs | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| PAYROLL | 2 | 0 | 2 (consumer + required on `time_entries`, `absence_requests`) | 0 | 4 | Pairwise (full) |
| HCM | 2 | 1 | 1 (consumer + optional on `absence_requests`) | 4 (`employees`, `hcm_positions`, etc. embedded by WFM) | 8 | Pairwise (full) |
| PSA | 2 | 0 | 2 (consumer on `work_schedules` opt + `time_entries` req) | 0 | 4 | Pairwise (full) |
| RET-STORE | 0 | 3 | 0 | 3 (`work_shifts` materialized from `retail_labour_schedules`, etc.) | 6 | Pairwise (full) |
| HRSD | 1 | 0 | 1 (consumer + optional on `work_shifts`) | 0 | 2 | Lightweight |
| SWP | 1 | 0 | 0 | 0 | 1 | Lightweight |
| PA | 0 | 0 | 2 (consumer on `time_entries`, derived on `absence_requests`) | 0 | 2 | Lightweight |
| LEGAL-PRACT-MGMT | 0 | 0 | 2 (contributor + required on `time_entries` from 2 modules) | 0 | 2 | Lightweight |
| CCAAS | 0 | 2 | 0 | 0 | 2 | Lightweight |

**The dominant cross-domain finding:** every outbound `handoffs` row has `source_domain_module_id` NULL (forced by M1), and every inbound row has `source_domain_module_id` non-NULL only when the source domain has modules (e.g., inbound HCM handoff 134 references HCM-LIFECYCLE-WORKFLOWS id 54). Once WFM modules exist, every WFM outbound handoff needs a B10b PATCH. That's a single mechanical follow-up sweep, captured as B1-S6 below.

Structural pass bands: **M1 hard-fails** (zero modules); A1 passes (full metadata on the WFM `domains` row); A2 passes (5 + 1 capabilities); A3 passes (12 solutions); **B1 / B2 / B3 / B4 / B5 cannot be fully evaluated** under the legacy `domain_data_objects` rollup but the masters are present; **B7 partial-fail** (only 3 of 7 masters have a `users` edge, no `time_off_policies` / `absence_balances` / `meal_break_records` / `work_schedules` user edges; some verbs use the noun-phrase legacy form, e.g. `requested by`); **B8 partial** (4 inbound payload-to-master relationships present from CCAAS / RET-STORE, but `agent_states` and `queue_statistics` source verbs absent from this domain's perspective; outbound payload-to-target relationships rare); **B9 partial-fail** (6 of 10 trigger_events have empty `event_category`, Rule #13 enum violation); **B9b not applicable** until ≥2 modules; **B10b partial** (8 outbound rows, every one has `source_domain_module_id` NULL because M1; 6 of 8 outbound rows also have `target_domain_module_id` populated, 2 have it NULL); **B11 hard-fail** (zero `data_object_aliases` for non-self-explanatory masters; `meal_break_records` and `absence_balances` are exactly the synonym-heavy masters the band targets); **B12 hard-fail** (zero `data_object_lifecycle_states` on 7 masters with obvious state machines: `absence_requests` (draft -> submitted -> approved -> taken -> closed), `time_entries` (open -> submitted -> approved -> exported -> locked), `work_schedules` (draft -> published -> in_progress -> closed), `work_shifts` (assigned -> swapped / dropped / completed -> paid), etc.); **C1 passes** (2 business function rows); **E1 vacuously gated** (cannot author multi-module roles without modules); **F1 fail by structure** (the legacy `wfm-system` skill exists at domain level with `domain_module_id` NULL; Rule #17 demands one system skill per module, and per F1 once module-level skills exist the legacy must be retired); **F2 / F3 / F4 / F5 uncomputable** (M1 blocker); **F7 vacuously passes** (no channel primitives linked); **H1 partial-fail** (2 of 14 cross-domain handoffs tagged; 1 `discovery_substring` + 1 `discovery_override`; zero `agent_curated`; volume expectation 7-11 agent_curated rows).

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 (hard fail), structural gate** | **WFM domain has ZERO `domain_modules` rows.** With 5 (+1) capabilities, Rule #14 demands ≥2 `module_kind='full'` rows. Proposed split (based on the 5 capabilities and the 7 mastered entities): (a) `WFM-TIME-ATTENDANCE` masters `time_entries`, `meal_break_records`; realizes `TIME-TRACKING` + `LABOR-COMPLIANCE` capabilities. (b) `WFM-SCHEDULING` masters `work_schedules`, `work_shifts`; realizes `SCHEDULING` + `LABOR-FORECAST` + `WORKFORCE-SCHEDULING` (id 312) capabilities. (c) `WFM-ABSENCE` masters `absence_requests`, `absence_balances`, `time_off_policies`; realizes `ABSENCE-MGMT` capability. Three full modules, embedded_master shells of `employees`, `hcm_positions`, `job_profiles`, `org_units`, `cost_centers` on each. Per Rule #17 each module gets one `system` skill + ≥1 `skill_tools` row; legacy `wfm-system` (id 121) gets either remapped to one of the three modules or retired (F1). | Phase A fix-load: insert 3 `domain_modules` rows; remap the 7 legacy `domain_data_objects` rows into `domain_module_data_objects` rows on the right module; insert ≥1 `domain_module_capabilities` row per module-capability pair; remap or split the legacy `wfm-system` skill per Rule #17 (one system skill per module); migrate the existing 9 `skill_tools` rows accordingly. Recommend a tightly-scoped fix-loader in `.tmp_deploy/`. |
| B1-S2 | **B11 (hard fail), no aliases** | Zero `data_object_aliases` rows for any of the 7 WFM masters. `meal_break_records`, `absence_balances`, `absence_requests`, `time_off_policies` are exactly the synonym-heavy masters B11 targets. Common aliases vendors use: `absence_requests` -> Leave Request / Vacation Request / PTO Request / Time Off Request; `absence_balances` -> Leave Balance / PTO Balance / Vacation Balance / Time Off Balance; `time_off_policies` -> Leave Policy / PTO Plan / Accrual Plan / Holiday Policy; `meal_break_records` -> Meal Break / Rest Break / Compliance Break / Break Attestation; `work_schedules` -> Roster / Shift Schedule / Workforce Schedule / Roster Plan; `work_shifts` -> Shift / Rostered Shift / Scheduled Shift / Workblock; `time_entries` -> Time Punch / Clock Event / Time Card Line / Punch Record. | Insert 20-30 `data_object_aliases` rows once user confirms the alias inventory (loaders that insert aliases mechanically without user review pollute the catalog with vendor-marketing terms; surface the list above and let the user prune). |
| B1-S3 | **B12 (hard fail), no lifecycle states** | Zero `data_object_lifecycle_states` rows on the 7 WFM masters. The state machines are obvious from the descriptions and the trigger_events. Proposed states per master: (a) `absence_requests`: draft / submitted (requires_permission true) / approved (requires_permission true) / rejected / taken / canceled / closed. (b) `time_entries`: open / submitted / approved (requires_permission true) / exported / locked. (c) `work_schedules`: draft / published (requires_permission true) / in_progress / closed. (d) `work_shifts`: assigned / accepted / swapped / dropped / no_show / completed / paid. (e) `meal_break_records`: recorded / waived / violated (signal-only). (f) `absence_balances`: active (single-state, recalculated by event). (g) `time_off_policies`: draft / active / superseded. Per Rule #12 each `requires_permission=true` state materializes a `workflow-gate` permission scoped to the realizing module. Rule #12 also names the config-shape exemption, candidate here: `absence_balances` is recalculated continuously, single-state. | After M1 fix-load (B1-S1), insert the lifecycle-state rows with `domain_module_id` pointing at the realizing module per Rule #14. Surface the per-state `requires_permission` flag for user review before insert; do NOT auto-populate state-level `notes` (Rule #15). |
| B1-S4 | **B9 (partial-fail), invalid event_category** | 6 of 10 trigger_events have empty string `event_category` (Rule #13 demands one of `lifecycle / state_change / threshold / signal`). Failing rows: 429 `work_schedule.published` (state_change), 432 `absence_balance.recalculated` (signal), 433 `time_off_policy.changed` (state_change), 434 `meal_break_record.violated` (signal), 431 `work_shift.no_show` (signal), 430 `work_shift.swapped` (state_change). | PATCH the 6 rows with the proposed enum values. Six small PATCH calls. |
| B1-S5 | **B9 missing events** | When B1-S3 (lifecycle states) lands, several state transitions will need matching `trigger_events` rows that don't exist today. Already missing per the state-machine proposal: `absence_request.submitted`, `absence_request.rejected`, `absence_request.canceled`, `absence_request.closed`, `time_entry.submitted`, `time_entry.exported`, `time_entry.locked`, `work_schedule.draft_saved`, `work_schedule.closed`, `work_shift.assigned`, `work_shift.accepted`, `work_shift.dropped`, `work_shift.completed`, `work_shift.paid`, `meal_break_record.waived`, `time_off_policy.activated`, `time_off_policy.superseded`. About 17 candidate events; the user picks which are interesting subscribers (cross-domain consumers exist only for a subset). | Insert ~10 high-priority `trigger_events` rows after B1-S3 confirms the state list. `event_category='state_change'` for most, `signal` for the value-change shapes. |
| B1-S6 | **B10b (in-scope after M1)** | Every one of the 8 outbound `handoffs` rows carries `source_domain_module_id` NULL today. After B1-S1 lands the WFM modules, every outbound row needs a B10b PATCH to its realizing module. Mapping: handoffs 103, 104, 426 -> WFM-TIME-ATTENDANCE (`time_entries`, `meal_break_records`); handoffs 428, 429 -> WFM-SCHEDULING (`work_schedules`, `work_shifts`); handoffs 135, 136, 427 -> WFM-ABSENCE (`absence_requests`, `absence_balances`). | 8 PATCH calls after B1-S1. Mechanical. |
| B1-S7 | **B10b (in-scope after M1)** | 2 outbound rows also have `target_domain_module_id` NULL (rows 426 `meal_break_record.violated` -> PAYROLL, 427 `absence_balance.recalculated` -> HCM). Target side is owned by the target domain's B10b, surfaced in the report-only section. | Schedule a PAYROLL b1 audit + an HCM b1 audit to backfill the target-side FK. |
| B1-S8 | **B7 user-edges partial** | 4 of 7 WFM masters have NO `users` edge in `data_object_relationships`: `work_schedules` (no `published_by` / `owner_id` user edge), `absence_balances` (no `tracked_for` user edge), `time_off_policies` (no `owned_by_hr_admin` user edge), `meal_break_records` (no `worker_id` user edge). Existing edges on `time_entries` and `absence_requests` are present but verb shape mixes noun-phrase (`requested by`, id 9) and verb-shape (`is_requested_by`, id 20) forms. | Insert 4 missing user edges (verb-shape: `worker_logs_meal_break`, `published_by_scheduler`, `tracks_balance_for`, `owned_by_hr_admin`); rename or DELETE the legacy noun-phrase row id 9 (`requested by`) once the canonical verb-shape row is confirmed. |
| B1-S9 | **F1 (in-scope after M1)** | Legacy domain-level `wfm-system` skill (id 121, `domain_module_id` NULL) is exactly the F1 anti-pattern. Per Rule #17, once module-level skills exist, the legacy single domain-level skill must be retired in favor of one `skill_type='system'` skill per `domain_modules` row. The current 9 `skill_tools` rows split cleanly across the three proposed modules: `query_work_schedules` + `query_shifts` -> WFM-SCHEDULING skill; `query_time_entries` + `query_meal_break_records` -> WFM-TIME-ATTENDANCE skill; `query_absence_requests` + `query_absence_balances` + `query_time_off_policies` -> WFM-ABSENCE skill. The two `side_effect` rows (`send_email`, `sign_document`) duplicate to all three skills since they're cross-cutting primitives. | After B1-S1: insert 3 new `skills` rows (one `skill_type='system'` per module); re-anchor the 9 `skill_tools` rows; DELETE skill id 121 last. |
| B1-S10 | **B8 missing outbound relationship** | Handoff 136 (`actuals.posted` -> SWP) has payload `time_entries` but no `data_object_relationships` row from `time_entries` (162) to any SWP-mastered target. Same for handoff 428 (`work_schedule.published` -> PSA) payload `work_schedules`, no outbound relationship row to PSA's `resource_assignments` or similar. Same for handoff 103 (`pay_period.closed` -> PAYROLL) payload `time_entries`, no edge to a PAYROLL-mastered target. | Identify the canonical PAYROLL / PSA / SWP target masters at fix time, then insert 3-5 outbound payload-to-target `data_object_relationships` rows. Defer until the target-side masters are confirmed via the pairwise pass. |
| B1-S11 | **APQC TAGGING (H1 partial-fail)** | Only 2 of 14 cross-domain handoffs (1 of 8 outbound + 1 of 6 inbound) carry `handoff_processes` rows. Zero `agent_curated`. Volume expectation: 7-11 agent_curated tags. Proposals below (table). | Insert ~10 `handoff_processes` rows after the proposals are user-vetted. |
| B1-S12 | **B10b report-only on inbound NULL FKs** | Inbound rows 499 (CCAAS -> WFM, `agent_state.changed`), 500 (CCAAS -> WFM, `queue_statistics.threshold_breached`), 934 (RET-STORE -> WFM, `retail_labour_schedule.published`), 937 (RET-STORE -> WFM, `store_associate_checklist.overdue`), 938 (RET-STORE -> WFM, `store_task.completed`) carry `target_domain_module_id` NULL. The target side is WFM's own B10b but it cannot be populated until WFM has modules (M1). Once the modules exist, every one of these 5 inbound rows needs `target_domain_module_id` set to (most likely) WFM-SCHEDULING for the CCAAS rows (agent intraday data feeding scheduling) and WFM-SCHEDULING + WFM-TIME-ATTENDANCE for the RET-STORE rows. | 5 PATCH calls after B1-S1. |
| B1-S13 | **B10 inbound source FK report-only (handoff 134)** | Inbound handoff 134 (HCM -> WFM, `employee.created`) already has `source_domain_module_id=54` (HCM-LIFECYCLE-WORKFLOWS), so its source side is clean. Target side (`target_domain_module_id`) is NULL on this row; same B10b as B1-S12 once modules exist. | Same PATCH as B1-S12. |

#### APQC TAGGING

12 of 14 cross-domain handoffs carry NO `handoff_processes` row at all. The 2 existing tags: handoff 135 (HCM, `absence.approved`) -> `Manage leave of absence` (10515 L4, discovery_substring); handoff 134 (HCM -> WFM, `employee.created`) -> `Manage employee onboarding, training, and development` (20599 L2, discovery_override). The L2 catch on 134 is too coarse for a leaf event and a candidate to REPLACE with a more specific L3/L4 in this audit.

Proposed agent_curated rows (high-confidence, all `record_status='new'`):

| handoff_id | source -> target | trigger_event | payload | Proposed PCF (process_name / external_id) | PCF id | Confidence |
|---|---|---|---|---|---|---|
| 103 | WFM -> PAYROLL | `pay_period.closed` | `time_entries` | Enter employee time worked into payroll system (10858 L4) | 1418 | confident L4 |
| 104 | WFM -> PSA | `time_entry.approved` | `time_entries` | Collect and record employee time worked (10854 L4) | 1414 | confident L4 |
| 426 | WFM -> PAYROLL | `meal_break_record.violated` | `meal_break_records` | Monitor regular, overtime, and other hours (10856 L4) | 1416 | confident L4 |
| 427 | WFM -> HCM | `absence_balance.recalculated` | `absence_balances` | Analyze and report paid and unpaid leave (10855 L4) | 1415 | confident L4 |
| 428 | WFM -> PSA | `work_schedule.published` | `work_schedules` | Create resourcing plan and schedule (10327 L5) or parent (10321 L4 `Identify and schedule resources to meet service requirements`) | 951 | confident L4 (prefer parent for clustering) |
| 429 | WFM -> HRSD | `work_shift.no_show` | `work_shifts` | Develop and manage time and attendance systems (10527 L3) | 246 | confident L3 |
| 135 | WFM -> HCM | `absence.approved` | `absence_requests` | Manage leave of absence (10515 L4) | 1058 | confident L4 (REPLACES existing discovery_substring row, same target) |
| 136 | WFM -> SWP | `actuals.posted` | `time_entries` | Track workforce utilization (10392 L4) | 923 | confident L4 |
| 499 | CCAAS -> WFM | `agent_state.changed` | `agent_states` | Schedule customer service workforce (10391 L4) | 922 | confident L4 |
| 500 | CCAAS -> WFM | `queue_statistics.threshold_breached` | `queue_statistics` | Plan and manage customer service workforce (10387 L3) | 195 | confident L3 |
| 934 | RET-STORE -> WFM | `retail_labour_schedule.published` | `retail_labour_schedules` | Develop and manage time and attendance systems (10527 L3) | 246 | confident L3 |
| 938 | RET-STORE -> WFM | `store_task.completed` | `store_tasks` | Collect and record employee time worked (10854 L4) | 1414 | confident L4 |
| 134 | HCM -> WFM | `employee.created` | `employees` | Develop and manage time and attendance systems (10527 L3) | 246 | confident L3 (REPLACES the L2 discovery_override) |

Deferred to Discover Pass 3 (no clean PCF match):

| handoff_id | source -> target | trigger_event | reason |
|---|---|---|---|
| 937 | RET-STORE -> WFM | `store_associate_checklist.overdue` | Frontline task-checklist concept not in cross-industry PCF; defer to custom process. |

Combined APQC count: **13 proposed + 1 deferred = 14 total**, expanding the headline `record_status='approved'` count from 0 to 0 (`agent_curated` still requires user approval).

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 (deferred to Bucket 3) |
| WRONG-OWNERSHIP | 0 (no modules to mis-own) |
| SCOPE-CREEP | 0 |
| STRUCTURAL (M1 + B7 + B9 + B11 + B12 + F1 + B10b post-fix) | 10 |
| BOUNDARY (B8 missing outbound rel, B10b inbound NULL FKs) | 2 |
| APQC TAGGING | 1 (consolidated header per Rule #10) |
| MODULARIZATION ISSUES | 0 in Bucket 1 (the M1 fix IS the modularization decision; surfaced inline in B1-S1) |
| **Bucket 1 total** | **13** |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent cannot answer alone | Options |
|---|---|---|---|
| B2-S1 | **Module split shape (informs B1-S1).** The proposed 3-module split (WFM-TIME-ATTENDANCE / WFM-SCHEDULING / WFM-ABSENCE) maps cleanly to UKG Dimensions, Workday, and Replicon's product taxonomies but Quinyx and Deputy collapse SCHEDULING + TIME-ATTENDANCE into a single product surface. Should the split be 3 modules (semantic clarity, mirror the heaviest vendors) or 2 modules (`WFM-LABOR-OPS` (scheduling + time + breaks) + `WFM-ABSENCE`)? | Editorial decision: trade off semantic clarity against operational coherence. 3 modules is the safer default (capability count justifies it; ≥3 capabilities map to ≥2 modules floor cleanly satisfied; embedded_master shells can repeat across modules without conflict) but a 2-module shape is defensible. | (a) 3 modules per the proposal. (b) 2 modules collapsing scheduling and time-attendance. (c) Alternate shape the user names. |
| B2-S2 | **Lifecycle config-shape exemption for `absence_balances` (informs B1-S3).** Rule #12 names the config-shape exemption: continuously-recalculated single-state masters can skip lifecycle states. `absence_balances` is the canonical example (a single `active` state, balance moves under it as accrual / consumption events fire). Should the audit treat `absence_balances` as exempt? | Per Rule #12 / Rule #15, the exemption used to require a `data_objects.notes` annotation; that's rescinded. The audit-conversation IS the persistence surface. User confirms here, the audit records the decision; no notes write. | (a) Confirm exemption: `absence_balances` lifecycle skipped, recorded in Decisions section of this audit. (b) Author full lifecycle states anyway (e.g., `current` / `frozen` / `closed_period`). |
| B2-S3 | **Pattern flag re-evaluation per Rule #12 (informs B1-S3).** All 7 WFM masters carry `has_personal_content=false / has_submit_lock=false / has_single_approver=false`. The all-false default deserves a positive review per Rule #12. Specifically: should `absence_requests.has_personal_content=true` (carries FMLA medical reason / parental leave reasons)? `absence_requests.has_single_approver=true` (manager approval is the canonical workflow)? `time_entries.has_submit_lock=true` (once a pay period is closed, the row is immutable)? `meal_break_records.has_personal_content=true` (waiver attestation carries worker signature)? | Pattern flags are workflow-shape judgments the user owns; the false-by-default does not confirm review. Per Rule #15 the rationale must NOT go to notes. | Per-flag yes/no captured in Decisions. |
| B2-S4 | **Alias inventory pruning (informs B1-S2).** The candidate alias list at B1-S2 reads like a vendor terminology snapshot. Vendors lump and split synonyms differently (UKG: PTO; Workday: Time Off Plan; Quinyx: Schedule; Deputy: Shift). Should the audit load every candidate alias, or pick a tight set (3-5 per master) the user explicitly approves? | Rule #18 forbids vendor-brand names in catalog entity text fields except for `solutions / vendors / aliases / regulations` rows. The `data_object_aliases.alias_name` field is on the allowed list, so vendor terminology IS permitted here, but unconstrained insertion still risks marketing-tier sprawl. | (a) User approves the full list. (b) User prunes to a tight set (3-5 per master). (c) User skips B11 entirely (vacuously-pass posture, with `data_object_aliases` deliberately empty). |
| B2-S5 | **Legacy `wfm-system` skill, retire or rehome (informs B1-S9).** Skill id 121 (`wfm-system`) with 9 `skill_tools` rows exists today at domain level. Per Rule #17 and F1, once module-level skills exist the legacy must be retired. Two routes: (a) DELETE the legacy after re-anchoring tools to 3 new module-level skills (clean F1 pass). (b) Repurpose the legacy as one of the 3 module skills (rename / re-target `domain_module_id`) and only add 2 new skills (minimizes churn). | Editorial: agent cannot prefer (a) over (b) without architectural intent input from the user. | (a) Retire legacy after migration. (b) Rehome legacy as one of the 3 module skills, add 2 new. |

### Bucket 3, Phase 0 pending (speculative, from market-audit reasoning)

Flagship vendor surface (UKG Dimensions, Workday Time/Absence, Dayforce, Quinyx, Deputy, Legion WFM, Verint WFM, Replicon, When I Work, WorkJam, plus specialty: Reflexis, Branch, NICE IEX) implies several MISSING entities not yet in the WFM footprint. These are subagent-style inferences without a formal Phase 0 sweep; each candidate's vendor knowledge basis is noted.

| # | Candidate entity | Vendor basis | Proposed module | Recommended verification |
|---|---|---|---|---|
| B3-S1 | `time_clocks` (physical or virtual device records: badge readers, mobile geofence punches) | UKG Dimensions InTouch DX, Workday Clock-In, Deputy mobile, Quinyx Punch | WFM-TIME-ATTENDANCE | Phase 0 against UKG / Deputy device-management APIs. |
| B3-S2 | `clock_punch_corrections` (manager-edited or worker-edited punch corrections, audit trail required by FLSA) | UKG, Workday, Replicon, Dayforce all have explicit audit-trail records distinct from `time_entries` | WFM-TIME-ATTENDANCE | Phase 0; check FLSA recordkeeping requirements. |
| B3-S3 | `labor_demand_forecasts` (forecasted required labor hours per day-part / department, the input to scheduling optimization) | Legion, UKG, Quinyx, WorkJam, Verint all master this entity separately from `work_schedules` | WFM-SCHEDULING | Phase 0 against Legion + Quinyx forecast APIs. |
| B3-S4 | `shift_swap_offers` / `shift_swap_requests` (worker-initiated swap market) | Deputy, When I Work, WorkJam, Quinyx all have a distinct swap-marketplace entity | WFM-SCHEDULING | Phase 0; vendor product docs. |
| B3-S5 | `availability_preferences` (worker-declared availability windows per day-of-week) | UKG, Workday, Deputy, When I Work, Quinyx; Fair Workweek statutes (B3-S6 candidate) make this a legal requirement | WFM-SCHEDULING | Phase 0; vendor + Fair Workweek statutes. |
| B3-S6 | `predictive_schedule_advance_notices` / `predictive_schedule_change_notices` (statutory written notice records under Fair Workweek / Predictive Scheduling laws) | Required by NYC / Seattle / SF / Chicago / Oregon Fair Workweek; UKG Dimensions, Legion, Dayforce all master | WFM-SCHEDULING or WFM-LABOR-COMPLIANCE (if user splits) | Phase 0 against Fair Workweek statutes + vendor compliance modules. |
| B3-S7 | `accrual_grant_events` / `accrual_carryover_events` (the underlying ledger that drives `absence_balances`) | Workday Absence, UKG, Dayforce all have an explicit ledger; the balance is the running sum | WFM-ABSENCE | Phase 0; vendor docs. |
| B3-S8 | `labor_law_jurisdiction_rules` (per-state / per-country break-meal-overtime rules driving compliance enforcement at scheduling and time-entry time) | UKG Pay Rule Library, Dayforce Compliance, Replicon Labor Law Compliance | WFM-SCHEDULING or new WFM-LABOR-COMPLIANCE | Phase 0; against vendor compliance libraries + jurisdictional rule lists. |

**Modularization commentary.** Beyond the B1-S1 split, the market-audit pass surfaces one candidate further split: **`WFM-LABOR-COMPLIANCE`** as a 4th module dedicated to the compliance surface (`meal_break_records`, `labor_law_jurisdiction_rules`, `predictive_schedule_advance_notices`). The compliance entities are heavy enough to overload WFM-SCHEDULING and have a distinct regulatory driver (FLSA, Fair Workweek, BIPA, EU WTD); pulling them out is the same architectural move as APM-TECH-RISK or HCM compliance modules in adjacent domains. Recommended only if B3-S6 and B3-S8 land as confirmed entities; otherwise stays folded into WFM-SCHEDULING.

**Candidates queued in `audits/_missing-domains.md`.** Two adjacent point-solution markets surfaced as candidates for the cross-domain catalog and queued via the helper (NOT loaded into `domains`):

- **CCWFM, Contact Center Workforce Management.** Verint, NICE IEX, Calabrio, Genesys WFM, Aspect, Playvox. Specialty WFM for contact centers with Erlang-C forecasting, intraday adherence, multi-channel scheduling. Pure-play market distinct from general WFM. Adjacency: WFM, CCAAS, PA. Mention count 1.
- **FRONTLINE-COMMS, Frontline / Deskless Worker Communication Platform.** WorkJam, Beekeeper, Crew, Yoobic, Microsoft Teams Frontline, Workvivo. Adjacency: WFM, INTRANET, EMP-EXP, RET-STORE. Mention count 1.

### Cross-bucket dependencies

- B1-S1 (M1 fix-load) is the **gate** for B1-S3 (lifecycle states need a realizing module), B1-S5 (events follow lifecycle), B1-S6 / B1-S7 / B1-S12 / B1-S13 (B10b PATCH needs source/target modules), B1-S9 (Rule #17 module-level skills), and B1-S10 (B8 outbound relationships often anchor on a module-level concept). The orchestrator should approve B1-S1 first, then the rest of Bucket 1 can flow.
- B1-S3 (lifecycle states) depends on B2-S2 (config-shape exemption for `absence_balances`) and B2-S3 (pattern flags) for content; B2-S3's answers also drive B1-S3 row count.
- B1-S2 (aliases) is independent of B1-S1 (aliases attach to data_objects, not modules) but gated on B2-S4 (alias inventory pruning).
- B1-S9 (F1 / Rule #17 retire-legacy-skill) depends on B2-S5 (route a/b).
- Bucket 3 (B3-S1 through B3-S8) is independent of Bucket 1 and Bucket 2; the user picks eyeball-mode or formal Phase 0 vetting separately. If Phase 0 confirms B3-S6 + B3-S8, the 4th `WFM-LABOR-COMPLIANCE` module candidate may retroactively change B1-S1's split.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply `all`, list (e.g. `S1, S2, S4, H1-top8`), or `skip`.

- **B1-S1 (M1 fix-load):** decide 2-module vs 3-module shape (B2-S1) first. Loader scaffold in `.tmp_deploy/` proposed.
- **B1-S2 (B11 aliases):** depends on B2-S4 (inventory pruning).
- **B1-S3 (B12 lifecycle):** depends on B2-S2 + B2-S3 + module shape from B2-S1.
- **B1-S4 (event_category PATCH x 6):** trivial; mechanical.
- **B1-S5 (B9 missing events):** post-S3.
- **B1-S6 / B1-S7 / B1-S12 / B1-S13 (B10b PATCH):** post-S1; mechanical.
- **B1-S8 (B7 user-edges):** four inserts + one rename; mostly independent.
- **B1-S9 (F1 legacy skill retire):** depends on B2-S5.
- **B1-S10 (B8 missing outbound relationships):** identify target masters at fix time.
- **B1-S11 (APQC tagging top 13):** load now or with the next batch?

**Bucket 2, what's your call on each?** Per-item decision.

- **B2-S1 (module split):** 2 modules / 3 modules / alternate?
- **B2-S2 (absence_balances exemption):** confirm exempt / author full lifecycle?
- **B2-S3 (pattern flags):** per-flag yes/no on the 4 candidates.
- **B2-S4 (alias pruning):** full list / pruned 3-5 per master / skip B11?
- **B2-S5 (legacy skill route):** retire / rehome?

**Bucket 3, Phase 0 vet or eyeball-mode?** Will run the formal Phase 0 vendor-surface subagent for `<DOMAIN>` next pass if vetting; otherwise name which of B3-S1 to B3-S8 ring true.

### Report-only follow-ups (owed by other domains)

- **PAYROLL B10b owed** on outbound row 426 (`meal_break_record.violated` -> PAYROLL): `target_domain_module_id` NULL on PAYROLL's side. Schedule PAYROLL b1 audit.
- **HCM B10b owed** on outbound row 427 (`absence_balance.recalculated` -> HCM): `target_domain_module_id` NULL on HCM's side. Schedule HCM b1 audit.
- **CCAAS B9 + B10b owed** on inbound rows 499 (`agent_state.changed`) and 500 (`queue_statistics.threshold_breached`): `source_domain_module_id` NULL on CCAAS's side; both rows also carry empty `event_category` on the trigger event (Rule #13 violation on CCAAS's trigger_events rows 503 and 501). Schedule CCAAS b1 audit.
- **RET-STORE B9 + B10b owed** on inbound rows 934, 937, 938: `source_domain_module_id` NULL on RET-STORE's side; trigger events 1071, 1076, 1070 all carry empty `event_category`. Schedule RET-STORE b1 audit.
- **HCM B9** owes the `employee.created` event already exists and is well-formed (trigger event 47, `event_category='lifecycle'`); the row itself is clean. Only HCM's B10b on the target side (`target_domain_module_id` NULL after WFM gets modules) remains, which is WFM's own fix per B1-S12.

### Decisions

_(empty; awaiting user response per per-bucket prompts)_

### Fixes applied

_(empty; this audit is report-only)_

## 2026-05-31, Continuation: B1 technical fixes (residual)

Loader: [.tmp_deploy/fix_wfm_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_wfm_b1_technical_2026_05_31.ts).

### Applied

| ID | Type | Action | Rows |
|---|---|---|---|
| B1-S4 | PATCH enum backfill (Rule #13) | `trigger_events.event_category` set on 6 rows: 429 `work_schedule.published` -> `state_change`; 430 `work_shift.swapped` -> `state_change`; 431 `work_shift.no_show` -> `signal`; 432 `absence_balance.recalculated` -> `signal`; 433 `time_off_policy.changed` -> `state_change`; 434 `meal_break_record.violated` -> `signal`. | 6 |
| B1-S8a | INSERT `data_object_relationships` user-edges (Rule #10) | 4 missing `users` (id 748) edges inserted on WFM masters with no prior user-edge: id 1672 users -> work_schedules (160) `published_by_scheduler` / `scheduled_by`; id 1673 users -> absence_balances (164) `tracks_balance_for` / `balance_tracked_for`; id 1674 users -> time_off_policies (165) `owns_time_off_policy` / `owned_by`; id 1675 users -> meal_break_records (166) `worker_logs_meal_break` / `logged_by`. All `record_status` omitted (DB default `new`); `notes` omitted (Rule #15). | 4 |
| B1-S8b | PATCH naming rename | Row id 9 (`employees(31) -> absence_requests(163)`): `inverse_verb` `requested by` -> `is_requested_by` (noun-phrase -> snake_case verb-shape). `relationship_verb='requests'` was already verb-shape; only the inverse needed correction. Row 9 is NOT the `users` user-edge (that's id 20); the rename is independent of B7 user-edge coverage. | 1 |
| B1-S11 | INSERT `handoff_processes` (agent_curated) | 8 of the 13 audit-proposed tags landed where no `handoff_processes` row pre-existed: id 484 handoff 103 -> process 1418 (10858); id 485 handoff 104 -> 1414 (10854); id 486 handoff 136 -> 923 (10392); id 487 handoff 426 -> 1416 (10856); id 488 handoff 427 -> 1415 (10855); id 489 handoff 428 -> 951 (10321); id 490 handoff 499 -> 922 (10391); id 491 handoff 500 -> 195 (10387). All `proposal_source='agent_curated'`, `record_status` omitted (DB default `new`), `role` omitted (DB default `implements`), `notes` omitted (Rule #15). | 8 |

**Total applied:** 19 catalog writes (6 PATCH + 4 INSERT + 1 PATCH + 8 INSERT).

### Deferred (residual, recorded for next pass)

| ID | Reason for deferral |
|---|---|
| B1-S1 (M1 module split) | New `domain_modules` rows; gated on B2-S1 user decision (2-module vs 3-module shape). |
| B1-S2 (B11 aliases) | Gated on B2-S4 user pruning; alias inserts mechanically without user review pollute the catalog. |
| B1-S3 (B12 lifecycle states) | New entities; gated on B2-S2 + B2-S3 + module shape from B2-S1. |
| B1-S5 (B9 missing trigger_events) | New entities; gated on B1-S3 (lifecycle states first). |
| B1-S6 (B10b source FK PATCH x 8 outbound) | Gated on B1-S1 (modules don't exist yet, no `source_domain_module_id` to populate). |
| B1-S7 (B10b target NULL on 2 outbound rows) | Owed by other domains (PAYROLL, HCM); already named as report-only follow-ups. |
| B1-S9 (F1 legacy `wfm-system` skill retire) | Gated on B1-S1 + B2-S5 (rehome vs retire route). |
| B1-S10 (B8 missing outbound payload->target relationships) | Audit explicitly says "defer until target masters confirmed via pairwise pass". |
| B1-S11 handoff 134 (REPLACES discovery_override -> process 41) | Delete-and-replace requires user judgment; existing row 29 stays. |
| B1-S11 handoff 135 (REPLACES discovery_substring -> process 1058, same target) | Delete-and-replace requires user judgment; existing row 144 stays. |
| B1-S11 handoff 429 (existing agent_curated row 228 -> process 42; audit proposed 246) | Existing agent_curated row points at a different process; delete-replace requires user judgment. |
| B1-S11 handoff 934 (existing agent_curated row 390 -> process 1886; audit proposed 246) | Same as above; existing agent_curated row points at a different process. |
| B1-S11 handoff 937 (RET-STORE `store_associate_checklist.overdue` -> WFM) | No clean PCF match per audit; explicitly deferred to Discover Pass 3. |
| B1-S11 handoff 938 (existing agent_curated row 394 -> process 1414; audit proposal matched) | Existing row already carries the audit's exact proposal; no action needed. |
| B1-S12 (B10b inbound target NULL on 5 rows) | Gated on B1-S1 (no WFM modules to assign as `target_domain_module_id`). |
| B1-S13 (B10b inbound row 134 target NULL) | Same gating as B1-S12. |
| B2-S1..B2-S5 | All user judgment questions; untouched. |
| B3-S1..B3-S8 | Bucket 3 speculative; untouched. |

**Total deferred:** 18 items.

### JWT errors

None observed during the run.

## 2026-05-31, Audit

### Summary

- **Current footprint:** 7 masters (`work_schedules`, `work_shifts`, `time_entries`, `absence_requests`, `absence_balances`, `time_off_policies`, `meal_break_records`); 5 embedded_master (`employees`, `hcm_positions`, `job_profiles`, `org_units`, `cost_centers`); 6 capabilities; 12 solutions; 14 cross-domain handoffs (8 outbound, 6 inbound); 5 regulations; 2 business_function_domains; **ZERO `domain_modules` rows**; ZERO `data_object_aliases`; ZERO `data_object_lifecycle_states`; 1 legacy domain-level `system` skill (`wfm-system`, id 121); 9 `skill_tools` rows. APQC tagging: **14 of 14 handoffs tagged**, 0 approved, 12 agent_curated, 1 discovery_substring, 1 discovery_override.
- **Bucket 1 (in-scope, agent-fixable now):** 1 item (b1a).
- **Bucket 1 (blocked):** 10 items (b1b).
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 8 items (carried).
- **next_action_by:** `agent` (b1a non-empty: B1-S8-A).

### Structural pass bands

| Band | Status | Notes |
|---|---|---|
| A1 (domain metadata) | partial-fail | `business_logic` contains an em-dash (CLAUDE.md em-dash ban); `description` and `business_logic` use British spellings (`Labour`, `optimisation`) against the CLAUDE.md American-English rule; `notes` carries dated 2026-05-20 reanalysis prose (Rule #15 territory). |
| A2 (capabilities) | pass | 6 capabilities (5 + cross-domain `WORKFORCE-SCHEDULING`). |
| A3 (solutions) | pass | 12 solutions linked. |
| M1 (modules) | hard-fail | Zero `domain_modules` rows. Blocks E, F2-F5, B9b, B10b (source-side), B12 module attribution. |
| B5 (masters present) | pass | 7 `domain_owned` masters via legacy `domain_data_objects`. |
| B7 (user-edges) | partial-fail | 6 of 7 masters carry a `users` edge; `work_shifts` (id 161) still has none. Residual from the 2026-05-31 Continuation's B1-S8a (missed). |
| B9 (event_category) | pass for WFM-owned | All 10 WFM-owned `trigger_events` carry a Rule #13 enum. Two inbound-payload events (501 `queue_statistics.threshold_breached`, 503 `agent_state.changed`) carry empty `event_category`, but they are CCAAS-owned (owed by CCAAS). |
| B9b (module-scoped events) | N/A | Gated by M1. |
| B10b (handoff module FKs) | partial-fail | 8 outbound rows have `source_domain_module_id` NULL (M1-gated). 2 outbound rows have `target_domain_module_id` NULL: 427 (HCM-side), 426 (PAYROLL-side). 6 inbound rows have `target_domain_module_id` NULL (WFM-side, M1-gated): 499, 500, 934, 937, 938, 134. |
| B11 (aliases) | hard-fail | Zero `data_object_aliases` on any of the 7 WFM masters (B2-S4 gated). |
| B12 (lifecycle states) | hard-fail | Zero `data_object_lifecycle_states` on any of the 7 WFM masters (B2-S2 + module-shape gated). |
| C1 (business functions) | pass | 2 rows (Accounting, Workforce Management). |
| D1 (regulations) | pass | 5 rows (FLSA, GDPR, EU WTD, Fair Workweek, BIPA). |
| E1-E5 (roles + permissions) | vacuous-gated | Zero WFM-prefixed roles, zero WFM-prefixed permissions. Blocked by M1. |
| F1 (one system skill per module) | structural-fail | Legacy `wfm-system` skill (id 121, `domain_module_id` NULL) is the Rule #17 anti-pattern. Retire or rehome after the M1 fix-load. |
| F2-F5 (system skill per module, tools, score) | uncomputable | M1-gated. |
| H1 (APQC tagging) | partial-pass on count, fail on quality headline | 14 of 14 handoffs tagged (100% coverage). Quality headline = 0 `record_status='approved'`. Process side-bar = 12 `agent_curated` (good throughput; layered-ownership process firing). |

### Bucket 1, In-scope confirmed gaps

#### Agent-fixable now (b1a)

| ID | Band | Finding | Fix |
|---|---|---|---|
| **B1-S8-A** | B7 user-edge residual | `work_shifts` (data_object 161) has no `users` edge in `data_object_relationships`. The 2026-05-31 Continuation's B1-S8a inserted edges for `work_schedules`, `absence_balances`, `time_off_policies`, `meal_break_records` but missed `work_shifts`. A manager or scheduler assigns or supervises a shift; a worker is assigned to a shift. | INSERT one row: `users` (748) -> `work_shifts` (161), `relationship_kind='reference'`, `relationship_verb='assigned_to_shift'`, `inverse_verb='shift_assignee'`, `is_required=true`. Omit `record_status` (Rule #1 default `new`) and `notes` (Rule #15). |

#### Blocked (b1b)

| ID | Band | Blocked by |
|---|---|---|
| **B1-S1** | M1 module split (insert 2-3 `domain_modules` + remap DMDOs) | B2-S1 (module-shape decision). |
| **B1-S2** | B11 aliases (~20-30 inserts across 7 masters) | B2-S4 (alias inventory pruning). |
| **B1-S3** | B12 lifecycle states across 7 masters | B2-S1 (modules) + B2-S2 (absence_balances exemption) + B2-S3 (pattern flags). |
| **B1-S5** | B9 missing `trigger_events` for new lifecycle states | B1-S3 (lifecycle states first). |
| **B1-S6** | B10b PATCH `source_domain_module_id` on 8 outbound rows | B1-S1 (modules do not exist yet). |
| **B1-S7** | B10b target NULL on outbound rows 426 (PAYROLL), 427 (HCM) | PAYROLL b1 + HCM b1 audits owe the target-side FK. |
| **B1-S9** | F1 / Rule #17 retire-or-rehome `wfm-system` skill, split into module-level | B1-S1 + B2-S5 (retire vs rehome). |
| **B1-S10** | B8 missing payload-to-target relationships on outbound rows 103, 136, 428 | Pairwise pass with PAYROLL / SWP / PSA to confirm target masters. |
| **B1-S12** | B10b inbound `target_domain_module_id` NULL on 5 rows (499, 500, 934, 937, 938) | B1-S1 (modules). |
| **B1-S13** | B10b inbound 134 `target_domain_module_id` NULL | B1-S1 (modules). |

#### APQC tagging

Coverage 14 / 14, but **0 approved**. The H1 headline is 0 until a reviewer approves the 12 `agent_curated` rows. Reviewer-controlled replacements still owed (carried from the 2026-05-31 Continuation, routed to Bucket 2 since each is a delete-and-replace requiring user judgment):

| handoff_id | source -> target | trigger_event | existing | audit proposal |
|---|---|---|---|---|
| 134 | HCM -> WFM | employee.created | discovery_override -> process 41 (L2 `Manage employee onboarding, training, and development`) | process 246 (L3 `Develop and manage time and attendance systems`) |
| 429 | WFM -> HRSD | work_shift.no_show | agent_curated -> process 42 (L2 `Manage employee relations`) | process 246 (L3 `Develop and manage time and attendance systems`) |
| 934 | RET-STORE -> WFM | retail_labour_schedule.published | agent_curated -> process 1886 | process 246 (L3 `Develop and manage time and attendance systems`) |

Handoff 135 (`absence.approved`) was earlier flagged for replacement; the existing `discovery_substring` row 144 already points at process 1058, which is the audit's exact proposal. No replacement needed; closing out.

| Finding type | b1a count | b1b count |
|---|---|---|
| MISSING | 0 | 0 |
| WRONG-OWNERSHIP | 0 | 0 |
| SCOPE-CREEP | 0 | 0 |
| STRUCTURAL | 1 (B7 work_shifts user edge) | 10 |
| BOUNDARY | 0 | 0 |
| APQC TAGGING | 0 | 0 (replacements routed to Bucket 2) |
| MODULARIZATION | 0 | 0 |
| **Bucket 1 total** | **1** | **10** |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent cannot answer alone | Options |
|---|---|---|---|
| **B2-S1** | Module-split shape: 2 modules (`WFM-LABOR-OPS` + `WFM-ABSENCE`) or 3 modules (`WFM-TIME-ATTENDANCE` + `WFM-SCHEDULING` + `WFM-ABSENCE`)? | Editorial trade-off; vendor taxonomies are mixed (UKG, Workday, Replicon favour 3; Quinyx, Deputy collapse to 2). | (a) 3 modules. (b) 2 modules. (c) Alternate the user names. |
| **B2-S2** | `absence_balances` lifecycle config-shape exemption per Rule #12? | Workflow-shape judgment; persistence is the audit conversation per Rule #15 (no `notes` write). | (a) Confirm exempt (no lifecycle states). (b) Author `current` / `frozen` / `closed_period`. |
| **B2-S3** | Pattern-flag review per Rule #12 across 7 WFM masters: `absence_requests.has_personal_content=true`? `absence_requests.has_single_approver=true`? `time_entries.has_submit_lock=true`? `meal_break_records.has_personal_content=true`? | Workflow-shape judgment; per-flag yes/no captured in Decisions. | Per-flag yes/no. |
| **B2-S4** | Alias inventory: load the full vendor-terminology list (~20-30 across 7 masters) or a pruned 3-5 per master? | Rule #18 permits vendor terms on `data_object_aliases.alias_name`, but unconstrained insertion risks sprawl. | (a) Full list. (b) Pruned (3-5 per master). (c) Skip B11. |
| **B2-S5** | Legacy `wfm-system` skill (id 121): retire after module-skill migration or rehome as one of the new module skills? | Architectural intent; agent cannot prefer without input. | (a) Retire. (b) Rehome (minimises churn). |
| **B2-S6** | A1 hygiene: `domains.business_logic` carries an em-dash (CLAUDE.md ban); `description` + `business_logic` use British spellings (`Labour`, `optimisation`) against the CLAUDE.md American-English rule; `notes` carries dated 2026-05-20 reanalysis prose against Rule #15. Approve cleanup PATCH? | Rule #15 forbids notes writes without user-approved text. The em-dash and American-English rules are deterministic, but the `notes` rewrite or clear still requires user approval per Rule #15. | (a) Approve clearing `notes` + rewriting `business_logic` / `description` in American English with no em-dash (agent supplies replacement text for approval). (b) Skip; keep as-is. (c) User supplies exact replacement. |
| **B2-S7** | APQC replacement on handoffs 134, 429, 934 (delete existing `handoff_processes` row and insert proposed L3 / L4 substitute)? | Each is a delete-and-replace; the existing row may already be the right call per a future reviewer. | (a) Replace all 3. (b) Pick a subset. (c) Keep all existing rows. |

### Bucket 3, Phase 0 pending (speculative, carried)

Carried verbatim from the 2026-05-30 Bucket 3; not re-vetted this pass.

| # | Candidate entity | Vendor basis | Proposed module |
|---|---|---|---|
| **B3-S1** | `time_clocks` | UKG, Workday, Deputy, Quinyx | WFM-TIME-ATTENDANCE |
| **B3-S2** | `clock_punch_corrections` | UKG, Workday, Replicon, Dayforce | WFM-TIME-ATTENDANCE |
| **B3-S3** | `labor_demand_forecasts` | Legion, UKG, Quinyx, WorkJam, Verint | WFM-SCHEDULING |
| **B3-S4** | `shift_swap_offers` / `shift_swap_requests` | Deputy, When I Work, WorkJam, Quinyx | WFM-SCHEDULING |
| **B3-S5** | `availability_preferences` | UKG, Workday, Deputy, When I Work, Quinyx | WFM-SCHEDULING |
| **B3-S6** | `predictive_schedule_advance_notices` / `predictive_schedule_change_notices` | UKG, Legion, Dayforce | WFM-SCHEDULING or new WFM-LABOR-COMPLIANCE |
| **B3-S7** | `accrual_grant_events` / `accrual_carryover_events` | Workday, UKG, Dayforce | WFM-ABSENCE |
| **B3-S8** | `labor_law_jurisdiction_rules` | UKG, Dayforce, Replicon | WFM-SCHEDULING or new WFM-LABOR-COMPLIANCE |

### Cross-bucket dependencies

- B1-S1 is the gate for B1-S3, B1-S5, B1-S6, B1-S9, B1-S10, B1-S12, B1-S13.
- B1-S2 depends on B2-S4.
- B1-S3 depends on B2-S2 + B2-S3 + module shape from B2-S1.
- B1-S9 depends on B2-S5.
- Bucket 3 confirmation of B3-S6 + B3-S8 may retroactively justify a 4th `WFM-LABOR-COMPLIANCE` module, modifying B2-S1's option set.
- B2-S6 is independent of all other items (A1 hygiene; pure text cleanup).
- B2-S7 is independent of all other items (APQC replacement; no module gate).

### Report-only follow-ups (owed by other domains)

- **PAYROLL b1 owed**: outbound 426 (`meal_break_record.violated`) `target_domain_module_id` NULL on PAYROLL side.
- **HCM b1 owed**: outbound 427 (`absence_balance.recalculated`) `target_domain_module_id` NULL on HCM side.
- **CCAAS b1 owed**: inbound 499, 500 `source_domain_module_id` NULL; trigger_events 501 + 503 carry empty `event_category` (Rule #13 violation on CCAAS rows).
- **RET-STORE b1 owed**: inbound 934, 937, 938 `source_domain_module_id` NULL.
- **HCM b1**: inbound 134 source side already clean (`source_domain_module_id=54`); target-side NULL is WFM's own M1 problem (B1-S13).

### JWT errors

None observed during the run.

### Decisions

_(empty; awaiting user response per per-bucket prompts)_

### Fixes applied

_(empty; this audit is report-only)_

## 2026-06-02 — Audit (modularization)

### Summary

WFM went from ZERO `domain_modules` to a 3-module `module_kind='full'` split, resolving the long-standing M1 hard-fail and closing B1-S1 / B1B-S1 (and superseding the B2-S1 module-shape question, which is now decided in favor of the 3-module shape). Scope this pass was modules + entity assignment ONLY: no new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships were created. All existing roles + necessities were preserved verbatim from `domain_data_objects`.

The 3-module shape (WFM-TIME-ATTENDANCE / WFM-SCHEDULING / WFM-ABSENCE) was adopted as proposed across the 2026-05-30 and 2026-05-31 audits; it mirrors the UKG Dimensions / Workday / Replicon product taxonomies and maps cleanly to the 6 capabilities and 7 WFM-owned masters.

Loader: [.tmp_deploy/modularize_wfm_2026-06-02.ts](../../.tmp_deploy/modularize_wfm_2026-06-02.ts) (idempotent; re-run confirmed no-op).

### Module split

| Module (code, id) | Capabilities realized | data_objects (role / necessity) |
|---|---|---|
| **WFM-TIME-ATTENDANCE** (194) | TIME-TRACKING (30), LABOR-COMPLIANCE (34) | time_entries (master / required), meal_break_records (master / required), employees (embedded_master / required), hcm_positions (embedded_master / required), org_units (embedded_master / required), cost_centers (embedded_master / optional) |
| **WFM-SCHEDULING** (195) | SCHEDULING (31), LABOR-FORECAST (33), WORKFORCE-SCHEDULING (312) | work_schedules (master / required), work_shifts (master / required), employees (embedded_master / required), hcm_positions (embedded_master / required), job_profiles (embedded_master / required), org_units (embedded_master / required) |
| **WFM-ABSENCE** (196) | ABSENCE-MGMT (32) | absence_requests (master / required), absence_balances (master / required), time_off_policies (master / required), employees (embedded_master / required), org_units (embedded_master / required) |

**M7 single-master check:** each of the 7 WFM-owned masters lands as `master` in exactly one module (time_entries, meal_break_records -> 194; work_schedules, work_shifts -> 195; absence_requests, absence_balances, time_off_policies -> 196). The 5 shared embedded masters (employees, org_units, hcm_positions, job_profiles, cost_centers) are HCM/Finance-owned and repeat across modules where genuinely consumed, retaining their `embedded_master` role and original necessity.

**M4 / M6 check:** all 6 capabilities placed (M4); every module realizes >=1 capability and holds >=1 data_object, no empty module (M6).

### Counts created

| Table | Rows inserted |
|---|---|
| domain_modules | 3 |
| domain_module_capabilities | 6 |
| domain_module_data_objects | 17 |

`record_status` omitted on every insert (Rule #1, DB default `new`). `notes` left empty on every DMC + DMDO row (Rule #15). No vendor/product names in module name or description (Rule #18). `catalog_tagline` / `catalog_description` deliberately left empty -> M8/A4 buyer-copy gap recorded below.

### Deferred gaps (recorded, not filled this pass)

- **M8 / A4 catalog UX copy backfill** (new b1a B1A-CATALOG-COPY): all 3 modules carry empty `catalog_tagline` + `catalog_description`. Buyer-facing copy was intentionally not invented this pass.
- **Phase-S system skills** (new b1a B1A-MODULE-SKILLS): Rule #17 now demands one `skill_type='system'` skill per module (3 needed). The legacy domain-level `wfm-system` skill (id 121, `domain_module_id` NULL) is still the F1 anti-pattern and must be retired or rehomed (carried B2-S5 route question). Now unblocked structurally (modules exist).
- **B10b handoff module FKs** (carried b1b B1B-S6 / S12 / S13): the 8 outbound + 6 inbound handoffs can now be PATCHed with the realizing module FKs (modules exist). Mapping in those items still holds against the realized module ids: 194 WFM-TIME-ATTENDANCE, 195 WFM-SCHEDULING, 196 WFM-ABSENCE.
- **B12 lifecycle states** (carried b1b B1B-S3): now able to point `domain_module_id` at the realizing module.
- **B11 aliases** (carried b1b B1B-S2), **B9 events** (B1B-S5), **B7 work_shifts user edge** (carried b1a B1A-S8-A), **B8 outbound relationships** (B1B-S10): unchanged by this pass.
- **Missing-master candidates** (Bucket 3, carried as b3): time_clocks, clock_punch_corrections, labor_demand_forecasts, shift_swap_offers/requests, availability_preferences, predictive_schedule_notices, accrual_grant/carryover_events, labor_law_jurisdiction_rules. Each maps to one of the 3 realized modules per its proposed_module.

### JWT errors

None observed during the run.

## 2026-06-06 — b1a execution

### Scope

Executed the two agent-solvable b1a items for WFM. Skipped the one item blocked by a user decision. No full audit, no fact-sheet emission. Tenant confirmed `adenin` / `adenin.semantius.ai` before any write.

Loader: [.tmp_deploy/wfm_b1a_2026-06-06.ts](../../.tmp_deploy/wfm_b1a_2026-06-06.ts) (idempotent; per-field empty-guard on the catalog copy, dedup pre-flight on the relationship edge).

### B1A-CATALOG-COPY — DONE

Backfilled empty `catalog_tagline` + `catalog_description` on all 3 WFM modules. Per the revised Rule #20 empty-guard: every field was empty before the write (no overwrite occurred, 0 fields guarded). Buyer-voice copy (workflow + value), no vendor/product names (Rule #18), no em-dash, American English. `record_status` left at existing `new`.

| Module (id) | Field | Action |
|---|---|---|
| WFM-TIME-ATTENDANCE (194) | catalog_tagline | written (prior value: empty) |
| WFM-TIME-ATTENDANCE (194) | catalog_description | written (prior value: empty) |
| WFM-SCHEDULING (195) | catalog_tagline | written (prior value: empty) |
| WFM-SCHEDULING (195) | catalog_description | written (prior value: empty) |
| WFM-ABSENCE (196) | catalog_tagline | written (prior value: empty) |
| WFM-ABSENCE (196) | catalog_description | written (prior value: empty) |

Table written: `domain_modules` (3 rows PATCHed, 6 fields total).

### B1A-S8-A — DONE

Inserted the missing `users` (data_object 748) -> `work_shifts` (data_object 161) edge into `data_object_relationships`. Dedup pre-flight confirmed no existing (748,161) row. New row **id 2083**: `owner_side='source'`, `relationship_type='one_to_many'`, `relationship_kind='reference'`, `relationship_verb='assigned_to_shift'`, `inverse_verb='shift_assignee'`, `is_required=true`. `record_status` omitted (DB default `new`); `notes` left empty (Rule #15). Shape taken verbatim from the b1a action text; note `is_required=true` per that action, vs the sibling users->work_schedules edge (id 1672) which carries `is_required=false`.

Table written: `data_object_relationships` (1 row inserted, id 2083). All 7 WFM masters now carry a `users` edge.

### Skipped

- **B1A-MODULE-SKILLS — SKIPPED.** `blocked_by` is `{type: user_decision, ref: B2-S5}` (retire skill 121 vs rehome it as one of the 3 module-level system skills). Per the task's Rule #7 (skip any b1a blocked by a user_decision) and the finding's own statement that the agent cannot prefer route (a) over (b) without architectural intent, this item is left open in `b1a` for the user to resolve via B2-S5.

### next_action_by

Recomputed to `user`. The only remaining `b1a` item (B1A-MODULE-SKILLS) is blocked by user_decision B2-S5, so it is not agent-actionable; the `b2` queue (B2-S5 plus B2-S2/S3/S4/S6/S7) is the effective next step and is owned by the user.

### JWT errors

None observed during the run.

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELLED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.
