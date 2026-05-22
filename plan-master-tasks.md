# Master task list — synchronises plan-process-skill-discovery.md + plan-tools-catalog.md

> **Operational status for the two-plan effort.** Plan files are the design intent (stable); this file is the volatile state.
>
> The plan files own *what we're building* and *why*. This file owns *what's done* and *what's next*. Don't duplicate status into the plan files — they're pure design docs.

## How to use this file

- Tick checkboxes here as work completes
- Update only this file for status; the plan files are stable design docs
- The wave structure shows cross-plan staging. The asymmetric dependency (P2.5B depends on P1.7) is the only hard cross-plan blocker — everything else parallelises

Status legend: `[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Live state checkpoint (2026-05-22 end-of-session, after Phase-B Lite batch 1 + EAM boundary resolution)

> **Read this first if you're starting a fresh session.** Counts may have moved — verify with the queries below before acting on them.

| Entity | Count | Last verification |
|---|---|---|
| `domains` | 130 | `semantius call crud postgrestRequest '{"method":"GET","path":"/domains?select=id&limit=10000"}'` |
| `data_objects` | 465 (+73 batch 1, +3 EAM) | `/data_objects?select=id&limit=10000` |
| `tools` | 280 | `/tools?select=id&limit=10000` |
| `skills` | 23 (all `skill_type='system'`) | `/skills?select=skill_name,domain_id` |
| `skill_tools` | 317 | `/skill_tools?select=id&limit=10000` |
| `cross_domain_handoffs` | 330 | `/cross_domain_handoffs?select=id&limit=10000` |
| `domain_data_objects` | 537 (+73 batch 1, +3 EAM master rows) | `/domain_data_objects?select=id&limit=20000` |

**Next un-blocked task:** [P2.5A.iii — mid-confidence remainder](#p25a--systemskill-skill_tools-independent-of-plan-1). ~55 candidate domains. Read the **Session handoff** subsection inside that task before starting.

**Phase-B Lite audit status — what's loaded vs what's still pending (added 2026-05-22):**

The 86-domain Phase-B audit started but only batch 1 (12 domains) completed before context budget required stopping. State below.

| Group | Count | Status |
|---|---|---|
| **Loaded with master data_objects (batch 1, Phase-B Lite)** | 11 | PROD-MGMT, KMS, CPQ, OMS, ECM, DI, DXP, KUBE-PLAT, APIM, APP-PAAS, IPAAS. trigger_events + handoffs deferred. |
| **EAM (loaded 2026-05-22 after boundary resolution)** | 1 | EAM — 3 masters: `industrial_assets`, `eam_work_orders`, `equipment_pm_schedules`. REAL-EST `maintenance_work_orders` renamed to `facility_work_orders` (id 349) + 3 trigger_events renamed to `facility_work_order.*`. Loader: [.tmp_deploy/load_eam_phase_b.ts](.tmp_deploy/load_eam_phase_b.ts). |
| **Zero-master, audit not yet run** | 24 | RPA, IDP, NPMD, DCIM, UEM, WSC, TEST-MGMT, PROC-MIN, DEM, IWMS, CAFM, MFG-OPS, BANK-OPS, CLIN-DEV, HC-PATIENT, INS-CLAIMS, LSD, PS-LIC, RET-STORE, TELCO-BSS, UTIL-OPS, VIS-MGMT, VSDP, WEB-CONTOPS |
| **Thin coverage (1-4 masters), audit not yet run** | 33 | BI, DAM, HAM, ACCT-PRACT-MGMT, AP-AUTO, CONV-AI, FLEET-MAINT, FSM, HRSD, IGA, ITAM, KGP, METRICS-LAYER, NCDB, REMOTE-ACCESS, CCAAS, DISCOVERY, LCAP, LOYALTY, RE-CRE, SPEND-MGMT, AIOPS, BPA, CSM, ITOM, LEGAL-PRACT-MGMT, PSA, RE-INVEST, SALES-ENG, SAM, SUP-LIFE, TELEMATICS, WORK-MGMT |
| **Leadership-tier (no Phase-B needed by design)** | 16 | REV-INTEL, SALES-PERF, GTM-PLAN, ACCT-PLAN, PRM, OP-RES, BCM, SECOPS, SOAR, THREAT-INTEL, TPRM, VULN-MGMT, PRIV-MGMT, FINOPS, INTRANET, COLLAB-GOV — see SKILL.md "Leadership-layer domains have no system skill" |
| **Single-master legit** | 1 | ESIGN (envelopes IS the whole domain) |
| **Already have system skills** | 23 | See `skills` table |

**Recommended next-session order:**
1. Resume the Phase-B Lite audit for the 57 remaining domains (24 zero-master + 33 thin). Pattern: spawn subagents in batches of ≤12 with explicit "produce a structured masters table; trigger_events/handoffs OPTIONAL" prompts (the inconsistency on those two was what stopped batch 1's full load). Then load masters via [.tmp_deploy/load_batch1_phase_b_lite.ts](.tmp_deploy/load_batch1_phase_b_lite.ts) pattern.
2. ~~Resolve EAM boundary decisions explicitly with user, then load.~~ ✓ Done 2026-05-22 — see live-state row above.
3. Then proceed to P2.5A.iii — system skills for the 86-23 = 63 candidates (after Phase-B is broadly complete). EAM now in the candidate pool with 3 masters.

**Re-runnable killer-hypothesis-test query** lives at the bottom of [.tmp_deploy/load_p25a_i.ts](.tmp_deploy/load_p25a_i.ts) and [.tmp_deploy/load_p25a_ii.ts](.tmp_deploy/load_p25a_ii.ts) — copy-paste the rollup block when P2.5A.iii is done to certify the full catalog.

**Recent session activity (2026-05-22):**
- P2.5A.0 (Phase-B backfill): 4 new domains (DLP, DSPM, REAL-EST, CAFM) + 1 IWMS PATCH + 725 inserts across 8 entity classes; 11 parallel research subagents drove the consolidation.
- P2.5A.i (12 hypothesis candidates): 12 system skills loaded; **killer hypothesis confirmed: 11/12 = 100% Semantius**, PA = 86% (compute + side_effect required for surveys + attrition narratives).
- P2.5A.ii (10 obvious-non-Semantius + B2C-COMM): 11 system skills; **all confirmed below 100%** as predicted; LMS and B2C-COMM at 91% (single missing primitive `send_email` / `execute_payment` respectively).
- SKILL.md gained a System-skill tool derivation section + Cross-tranche external-tool patterns section.
- **Phase-B Lite batch 1 (11 zero-master domains):** PROD-MGMT, KMS, CPQ, OMS, ECM, DI, DXP, KUBE-PLAT, APIM, APP-PAAS, IPAAS. **73 new master `data_objects` + 73 master `domain_data_objects` rows.** All `record_status='new'`. Trigger_events and cross_domain_handoffs **deliberately deferred** — agent outputs were too inconsistent in shape to load programmatically. The masters alone unblock system-skill drafting for these 11 domains in a future P2.5A.iii pass. Loader: [.tmp_deploy/load_batch1_phase_b_lite.ts](.tmp_deploy/load_batch1_phase_b_lite.ts).
- **EAM Phase-B (boundary resolution + load, 2026-05-22):** 3 boundary decisions made with user — (1) HAM keeps `hardware_assets`, EAM gets new `industrial_assets`; (2) rename id 349 `maintenance_work_orders` → `facility_work_orders` (REAL-EST), add new `eam_work_orders` (EAM); (3) FLEET-MAINT keeps vehicle `preventive_maintenance_schedules`, EAM gets new `equipment_pm_schedules`. Loaded: **3 new EAM master data_objects + 3 master ddo rows + 1 data_object PATCH + 3 trigger_event renames** (`maintenance_work_order.{created,dispatched,completed}` → `facility_work_order.*`). Loader: [.tmp_deploy/load_eam_phase_b.ts](.tmp_deploy/load_eam_phase_b.ts). Trigger_events + handoffs for EAM itself deferred (consistent with batch-1 pattern).

---

## Wave 0 — SKILL.md prep (do before Wave 1)

> The `domain-map-analyst` SKILL.md is the contract a fresh session opens. Today it doesn't know about `processes`, `trigger_events`, Phase D, the trigger-event ownership rule, the custom-process naming convention, the APQC PCF framework, or the future `solution_kind` column. Without these updates, the Wave-1 agent will reproduce avoidable friction. All edits here are to [`.claude/skills/domain-map-analyst/SKILL.md`](.claude/skills/domain-map-analyst/SKILL.md) and its [`references/`](.claude/skills/domain-map-analyst/references/) folder.

### S0.1 — Add new entities to "Module at a glance"
- [x] Add `processes` row to the Core concepts table (hierarchical, source_framework discriminator, APQC PCF backbone)
- [x] Add `trigger_events` row to the Core concepts table (controlled vocabulary tied to data_objects, used by `cross_domain_handoffs`)
- [x] Update the entity count in the section header (currently "21 entities" → 23)

### S0.2 — Add Phase D (substrate-level discovery) alongside the per-market phases
- [x] Extend the workflow intro: distinguish **per-market load phases** (A+B+C, all default for every market load) from **substrate-level analytics** (Phase D — process-skill discovery — run across the catalog once enough markets have shipped Phase B). Phase D is not a fourth per-market step.
- [x] Add Phase D as a separate top-level section (sibling to "Workflow for any research task", not a fifth bullet under it). Covers the discovery procedure that derives ranked process-skill candidates from handoff clusters + APQC PCF mapping. Point at [`plan-process-skill-discovery.md`](../../../plan-process-skill-discovery.md) for the full procedure. Note that Phase D is **re-runnable across the catalog**, not per-market.
- [x] Update the anti-pattern list: add "Treating Phase D as a per-market load step" — Phase D runs across the catalog after Phase B is broadly complete; running it after every single market load is wasted work.

### S0.3 — Codify trigger-event ownership rule + custom-process naming
- [x] Add to data-object research section: **"One event, many subscribers"** named pattern. When a single trigger fires from one domain to multiple targets, all subscriber handoff rows reference the SAME `trigger_events.id`. Event semantics live in one place; integration metadata lives on the per-edge handoff row.
- [x] Add to classification heuristics: **Custom process naming convention** — `CUSTOM-<CLUSTER>-<SHORT-NAME>` for any `processes` row with `source_framework='custom'`.

### S0.4 — Add APQC PCF reference subsection
- [x] New subsection under "Function spine" (or sibling-level): "Process framework — APQC PCF"
- [x] Document the `source_framework` enum values (`apqc_pcf_cross_industry`, industry placeholders, `custom`)
- [x] Document the `external_id` field (carries the PCF ID for any `apqc_pcf_*` row)
- [x] Point at the repo-level `LICENSE-APQC-PCF.md` for attribution handling
- [x] Note: the cross-industry PCF v8 is loaded; industry-specific PCFs (Banking, Pharma, Telecom) are placeholder enum values for future loads

*(Documenting the forthcoming `solution_kind` column on `solutions` is deferred to S2.2 — at the moment the column actually lands. Adding "this column will exist later" to the docs in Wave 0 just couples Wave 0 to Wave 2 unnecessarily.)*

---

## Wave 1 — Foundations (Plan 1 only; no cross-plan dependencies)

### P1.1 — Entity design (processes, trigger_events)
- [x] Add `processes` entity to `domain_map` module with the schema from [`plan-process-skill-discovery.md` § processes entity](plan-process-skill-discovery.md#processes-entity--concrete-schema)
- [x] Add `trigger_events` entity to `domain_map` module
- [x] Verify in UI: `https://tests.semantius.app/domain_map/processes` and `/trigger_events` render
- [x] Update [`module-shape.md`](.claude/skills/domain-map-analyst/references/module-shape.md) with the two new entities

### P1.2 — APQC PCF reference load
- [x] `K016808_APQC Process Classification Framework (PCF) - Cross-Industry - Excel Version 8.0.xlsx` lives at **repo root** (project convention; not `references/` as the plan originally said). Absolute path passed to the parser.
- [x] Create [`LICENSE-APQC-PCF.md`](LICENSE-APQC-PCF.md) at the repo root with the full APQC attribution text (verbatim from the workbook's own "Copyright and Attribution" sheet)
- [x] Write Excel parser ([.tmp_deploy/load_apqc_pcf.ts](.tmp_deploy/load_apqc_pcf.ts)). Flattens the 5-level hierarchy. Sets `source_framework='apqc_pcf_cross_industry'`, `external_id=<PCF ID>`, `hierarchy_level=<1-5>`, `parent_process_id=<resolved level-by-level>`
- [x] Run parser. **Count: 2017 rows** (plan estimate of ~250-300 was wrong by ~7× — PCF Cross-Industry v8.0 has 13 categories × deep hierarchy). Spot-checked L1/L2/L3/L5; parent FKs resolve through every level.
- [x] Bulk-stamp `record_status='approved'` — verified all 2017 rows against the xlsx (process_name, hierarchy_level, parent structure via external_id graph); 0 discrepancies; bulk-approved. Verification script: [.tmp_deploy/verify_apqc_pcf.ts](.tmp_deploy/verify_apqc_pcf.ts).
- [x] Audit query: `SELECT hierarchy_level, COUNT(*) FROM processes GROUP BY hierarchy_level ORDER BY hierarchy_level` → L1:13, L2:74, L3:362, L4:1353, L5:215, total 2017. Every non-top-level row has `parent_process_id` set.

### P1.3 — Trigger-events vocabulary
> Snapshot at start of P1.3 (2026-05-21): **173 handoffs**, 163 unique `(event_name, data_object_id)` pairs, 147 distinct event_names, 16 name-collisions across data_objects (vs the plan's outdated "~11 rows" / "~80 events" estimate). Per user decision, going with **Option 1**: keep `event_name` unique by renaming the 16 collisions (Patterns A/C); collapse Pattern-B duplicates to one event with publisher-side `data_object_id`.
- [x] Inventory the `trigger_event` strings on existing `cross_domain_handoffs` rows ([.tmp_deploy/analyze_trigger_events.ts](.tmp_deploy/analyze_trigger_events.ts))
- [x] Draft the controlled vocabulary — **147 canonical events** after disambiguation. Generator: [.tmp_deploy/draft_trigger_events.ts](.tmp_deploy/draft_trigger_events.ts). Draft markdown: `c:/tmp/trigger_events_draft.md` (23KB)
- [x] Disambiguate the colliders — **9 renames** (Pattern A: `hardware_endpoint.discovered` / `software_endpoint.discovered` / `ci_endpoint.discovered`, `rmm_ticket.escalated` / `msp_ticket.escalated`, `support_session.completed` / `msp_session.completed`; Pattern C: `payroll_period.closed` / `accounting_period.closed`). The other 12 colliders were Pattern B (one event, many subscribers) — collapsed to a single canonical row with publisher-side `data_object_id`
- [x] Surfaced draft for review; user approved; bulk insert ran. **147 rows in `trigger_events`**, all `record_status='new'`. Spot-checked 5 key events (categories + publisher data_objects correct). UI: https://tests.semantius.app/domain_map/trigger_events

### P1.4 — Migrate existing handoffs to FK
> **Important: the old `trigger_event` text column is preserved during P1.4.** It stays as a safety net alongside the new FK until end-of-program review. The drop is a separately-tracked deferred task (see [Deferred — held until end-of-program review](#deferred--held-until-end-of-program-review) below).
> Snapshot at start of P1.4: handoffs had grown 173 → **178** (5 added between P1.3 and P1.4), trigger_events vocab 147 → 151 (4 new events: `work_item.completed`, `work_item.status_changed`, `okr_objective.created`, `work_project.completed`). All 178 cleanly mapped (`unmapped: 0`).
- [x] Add `trigger_event_id` column (FK to `trigger_events`, `reference_delete_mode: restrict`) on `cross_domain_handoffs` — done via [.tmp_deploy/migrate_handoffs_to_fk.ts](.tmp_deploy/migrate_handoffs_to_fk.ts)
- [x] Map each of the **178** existing handoffs to its `trigger_events.id` — Pattern B handoffs all collapse onto one event row even when their `cross_domain_handoffs.data_object_id` differs from the publisher's `trigger_events.data_object_id` (handoff column = per-edge payload, event column = publisher; allowed to differ)
- [x] Update the `cross_domain_handoff_label` computed field to render the event part via the new FK (`set_record` lookup on `trigger_events`), with a `(no event)` fallback so unset rows degrade gracefully. Verified rendering: e.g. `"Applicant Tracking and Recruiting → Employee Onboarding : offer.accepted"`
- [x] Verify: 0 rows with NULL `trigger_event_id`; sample labels confirmed rendering through the new FK chain. UI: https://tests.semantius.app/domain_map/cross_domain_handoffs

---

## Wave 2 — Substrate completion + tools-catalog parallel start

> Wave 2 items run in parallel once Wave 1 is done. **P1.5* and P2.* are mutually independent** — only P2.5B (Wave 4) depends on P1.7 (Wave 3).

### P1.5a–e — Phase-B handoff backfill (per cluster)
- [x] **P1.5a** HR cluster — 4 new high-friction handoffs inserted (HCM→IGA `employee.terminated`, HCM→ITSM `employee.terminated`, COMP-MGMT→PAYROLL `merit_cycle.approved`, BEN-ADMIN→PAYROLL `enrollment.changed`). 2 of 6 proposed gaps were already in catalog. Succession/engagement extras deferred to optional follow-up pass.
- [x] **P1.5b** Finance cluster — 8 new trigger_events (`journal_entry.posted`, `invoice.duplicate_detected`, `payment.exception`, `dunning.escalation`, `subscription.renewal_required`, `subscription.downgraded`, `cloud_spend.threshold_breached`, `variance.threshold_breached`) + 11 new high-friction handoffs (GL audit, payment exceptions fan-out, dunning escalation, subscription downgrades, cloud spend thresholds, forecast→audit).
- [x] **P1.5c** Procurement cluster — verified live state showed only ESIGN needed scaffolding (SUP-LIFE/VMS already had master data_objects despite the agent report's stale-script-based claim). Added `envelopes` data_object (ESIGN master), 5 new trigger_events (`supplier.onboarded`, `supplier.risk_elevated`, `contract.expired`, `contract.amended`, `envelope.completed`), 5 new handoffs.
- [x] **P1.5d** Sales cluster — 13 new trigger_events (lead/opportunity lifecycle, leadership-layer signals: `pipeline_health.degraded`, `deal_risk.escalated`, `account_health.declined`, `whitespace.identified`, `co_sell.opportunity_created`, etc.) + 13 new handoffs. Resolved leadership-layer blackout for REV-INTEL, ACCT-PLAN, PRM by routing through existing publisher data_objects (`opportunities`, `customers`, `leads`). SALES-PERF / GTM-PLAN data_object scaffolding deferred to a future P1.5+ pass.
- [x] **P1.5e** Customer cluster — Phase-1 scaffolding: 10 new data_objects across CCAAS (support_sessions, contact_records, queue_statistics), CONV-AI (conversation_transcripts, intent_detections), FSM (field_visits, dispatch_records), LOYALTY (loyalty_members, loyalty_transactions, loyalty_tiers); all linked via domain_data_objects role=master. Phase-B: 11 new trigger_events + 11 new handoffs covering health-score, call-escalation, sentiment, intent routing, field-service completion/dispatch, loyalty tier/member lifecycle, churn confirmation, expansion signaling.
- *(each cluster pass also creates missing `trigger_events` rows for events not yet in the vocabulary)*

### S1.5 — Capture handoff-load patterns in SKILL.md (after each cluster)
- [x] **High-friction shapes:** expanded from 5 to 7 canonical shapes. Added **Period/cycle-close coupling** (Finance + HR pay-cycle cascades) and **Alert/escalation without feedback loop** (Finance exception handling, Customer escalations, Procurement risk events). Existing 5 shapes annotated with new examples from across all 5 clusters.
- [x] **Trigger-event categories:** no new categories needed. All 37 new events fit the existing `lifecycle` / `state_change` / `threshold` / `signal` enum.
- [x] **Cluster-specific anti-patterns** captured in SKILL.md anti-patterns section: (a) don't conflate handoff `data_object_id` (per-edge payload) with `trigger_events.data_object_id` (publisher's master); (b) don't scaffold synthetic data_objects for leadership-layer / aggregation-tier domains; (c) verify live state, never infer from `.tmp_deploy/*.ts` deploy scripts (a P1.5c discovery).
- [x] **Added "Task fan-out vs event fan-out" distinction** to data-object research section — one trigger spawns N template-driven downstream tickets but is still one `cross_domain_handoffs` row.
- [x] **Added "Leadership-layer / aggregation-tier domains often master nothing"** rule to data-object research section — REV-INTEL/SALES-PERF/GTM-PLAN/ACCT-PLAN/PRM/EPM read upstream and publish derived signals; leave them data-object-empty.

### P2.1 — Tools catalog model design
- [x] Use `semantic-model-analyst` skill to produce [tool-catalog-semantic-model.md](tool-catalog-semantic-model.md) (analyst v3.6, two-permission baseline per pure-reference module rule)
- [x] Confirm entities: `tools` (with `operation_kind` enum + optional `data_object_id` FK + paired `data_object_only_when_query_or_mutate` / `data_object_required_when_query_or_mutate` validation rules) + `skills` (first-class entity with `skill_type` enum + optional `domain_id` FK + `domain_required_when_skill_type_is_system` rule)
- [x] Confirm junctions: `tool_solutions` (N:M to `domain_map.solutions`, with `delivery_strength` + `delivery_method` + optional `endpoint_url`); `skill_tools` (with `requirement_level` + notes). Both junctions use computed-field labels (`tool_solution_label`, `skill_tool_label`) composed via `set_record` to render `<tool> via <solution>` / `<skill> needs <tool>`
- [x] Include in the spec: §8 step 8 explicitly adds `solution_kind` enum column to `domain_map.solutions`. **Revised 2026-05-21**: 4 values (`external_connector` / `action` / `compute_service` / `standard_solution`); `semantius_native` removed because Semantius is not classified here — its coverage is intrinsic to `tools.operation_kind`. Default `standard_solution`.
- [x] All other open questions resolved in [`plan-tools-catalog.md` § Closed questions](plan-tools-catalog.md#closed-questions); the only §7.2 items in the new spec are platform-level forward-looking questions (multi-column uniqueness on the two junctions, future auth/tenancy modeling)

### P2.2 — Deploy tools catalog entities into `domain_map`
> **Design reversal 2026-05-21:** Originally deployed as a sibling module `tool_catalog` (id 1002), then merged into `domain_map` (id 1001) the same day. The 4 entities have too tight an FK coupling to `domain_map` to justify being a separate module. See [`plan-tools-catalog.md` § "Why these entities live in `domain_map`"](plan-tools-catalog.md#why-these-entities-live-in-domain_map-revised-2026-05-21) and the merge note in [`tool-catalog-semantic-model.md`](tool-catalog-semantic-model.md).
- [x] Deployed 4 entities (`tools`, `skills`, `tool_solutions`, `skill_tools`) into `domain_map` (module_id=1001), reusing `domain_map:read` / `domain_map:manage`. No new module / permissions / roles. All fields + validation_rules + computed_fields per v3.6 spec.
- [x] Added `solution_kind` enum to `domain_map.solutions` (5 values, default `standard_solution`); backfilled all 629 rows.
- [x] Verified in UI: https://tests.semantius.app/domain_map/tools, `/skills`, `/tool_solutions`, `/skill_tools` all render. Cross-table FKs resolved (now intra-module: `tools.data_object_id`, `skills.domain_id`, `tool_solutions.solution_id`).
- [x] Updated [`domain-map-analyst/references/module-shape.md`](.claude/skills/domain-map-analyst/references/module-shape.md) with the `solution_kind` column and the 4 new entities (folded in from the separate skill that was scrapped).
- [x] Folded `tool-catalog-analyst` content into `domain-map-analyst` SKILL.md (operation_kind / solution_kind / 100% Semantius derivation sections + anti-patterns). The standalone `tool-catalog-analyst` skill folder was removed — one module, one analyst skill.

### S2.2 — Document `solution_kind` + new entities in `domain-map-analyst` SKILL.md + references
> Revised 2026-05-21 after the `tool_catalog` → `domain_map` merge. The cross-module reference item is moot (intra-module now); the rest still applies.
- [x] Add `solution_kind` to the `solutions` entry in `references/module-shape.md` (done as part of P2.2 — enum values, default, per-value usage)
- [x] Add per-value semantics + when-to-set guidance to the `domain-map-analyst` SKILL.md classification heuristics
- [x] Add an anti-pattern: "don't load tool-shaped capability rows in `domain_map.capabilities` — those are `tools` (in the same module), not `capabilities`; the capabilities table stays business-shaped"
- [x] Add the 4 new entities (`tools`, `skills`, `tool_solutions`, `skill_tools`) to `module-shape.md` and SKILL.md's "Module at a glance" section (folded in from the deleted `tool-catalog-analyst` skill). Entity count updated 23 → 27.

### P2.3 — `tools` vocabulary
> **Revised 2026-05-21:** see [plan-tools-catalog.md § Decision record](plan-tools-catalog.md#decision-record--2026-05-21-authoritative-overrides-the-body-below-where-they-conflict). No pseudo-tools; Semantius coverage is intrinsic to `operation_kind`.
- [x] Drafted **52 `tools`** (23 query + 7 mutate + 10 side_effect + 12 compute) with `operation_kind` set. Loader: [.tmp_deploy/load_tools.ts](.tmp_deploy/load_tools.ts).
- [x] `data_object_id` FK set for all 30 query/mutate tools (resolved against 23 distinct data_objects); null on all 22 side_effect/compute tools. Both validation rules verified.
- [x] ~~Include three Semantius pseudo-tools~~ — dropped 2026-05-21. Semantius coverage lives on `operation_kind`, not on individual tool rows.
- [x] Surfaced draft for review; user approved as-is (2026-05-21). Emails/SMS/calendar stay as `side_effect` (no Semantius-mastered messaging data_objects).
- [x] Loaded idempotently (52 inserted, 0 existing). RLS issue on the 4 new entities surfaced during the run; user fixed and retry succeeded.
- [ ] Stamp `record_status='approved'` once review confirms vocab is clean

### P2.4 — `tool_solutions` matrix + `solution_kind` promotions
> **Revised 2026-05-21:** no Semantius row in `solutions`; no `semantius_native` value in `solution_kind` enum (4 values now). `tool_solutions` matrix is for non-Semantius solutions only.
- [x] Listed and added the tool-source solutions. **10 new vendors** (OpenAI, Anthropic PBC, Adyen NV, Vonage, Cohere, AssemblyAI, Deepgram, Brave Software, DeepL, Tavily) + **25 new solutions** (15 `action` + 10 `compute_service`).
- [x] ~~Add a Semantius solution row~~ — dropped 2026-05-21. Semantius isn't in `solutions`.
- [x] PATCHed **23 existing `domain_map.solutions` rows** to non-default `solution_kind` (20 → `external_connector`, 3 chat → `action`); added 25 new solutions for tool sources not yet in the catalog. Loader: [.tmp_deploy/load_tool_solutions.ts](.tmp_deploy/load_tool_solutions.ts).
- [x] Inserted **117 `tool_solutions` rows** linking each tool to its delivery solutions, with `delivery_strength` + `delivery_method` + `endpoint_url`. No Semantius-side rows authored — coverage reads from `operation_kind`.
- [x] Surfaced draft via dry-run; user approved as-is (2026-05-21). RLS issue on `tool_solutions` surfaced on first apply; user fixed and retry succeeded.

*Follow-up gaps (not blockers, captured for future passes):* `query_subscriptions` (SMP buyer-side) and `query_projects` have no `tool_solutions` rows yet — no canonical SMP/PPM connector solutions loaded.

### P2.5A — System-skill `skill_tools` (independent of Plan 1)
> Process in three tranches so the killer hypothesis ("which domains are 100% Semantius?") is confirmed/refuted fastest, and so the S2.5A pattern-capture happens while each tranche's lessons are fresh.

#### P2.5A.0 — Phase-B prerequisite backfill (added 2026-05-21, completed 2026-05-22)
Discovered while drafting P2.5A.i: only 4 of the 12 candidates (CMDB, EPM, PA, SWP) had credible Phase-B coverage. APM/SPM were thin (1 master each); GRC/AUDIT/DCG/DQ/MDM/ESG had zero masters. DLP/DSPM/REAL-EST were missing entirely.

- [x] 11 parallel `Explore` subagents (8 Phase-B research + 3 full Phase-A+B research for DLP/DSPM/REAL-EST). Drafts consolidated; 23 cross-cutting overlap-resolution decisions applied (golden-record modeling, classification-taxonomy ownership, data_lineage ownership, REAL-EST sub-domain shape, etc.).
- [x] Loader: [.tmp_deploy/load_phase_b_full.ts](.tmp_deploy/load_phase_b_full.ts). Applied 2026-05-22: 4 new domains (DLP, DSPM, REAL-EST, CAFM) + IWMS PATCH (parent_domain_id → REAL-EST) + 26 vendors + 33 solutions + 47 solution_domains + 22 capabilities + 32 capability_domains + **221 solution_capabilities** + 85 data_objects + 116 domain_data_objects + 78 trigger_events + 61 cross_domain_handoffs. **725 inserts total.** Largest single load to date.
- [x] All 12 P2.5A.i candidates now have credible Phase-B coverage. Ready to resume tranche work.

- [x] **P2.5A.i — 100%-Semantius hypothesis candidates:** GRC, AUDIT, APM, CMDB, SPM, DCG, DQ, MDM, PA, SWP, EPM, ESG. Loader: [.tmp_deploy/load_p25a_i.ts](.tmp_deploy/load_p25a_i.ts). Added **128 new tools** (101 query + 29 mutate; one query per master / required-consumer data_object; selective mutates per workflow); created **12 `skills` rows** (`skill_type='system'`, one per candidate domain); inserted **165 `skill_tools`** rows with `requirement_level ∈ {required, optional}`.
- [x] **Killer hypothesis test ran (built into the loader). Result: 11 of 12 domains = 100% Semantius-covered.** APM 9/9, CMDB 7/7, EPM 8/8, SPM 17/17, SWP 13/13, GRC 16/16, AUDIT 17/17, DCG 15/15, DQ 10/10, MDM 11/11, ESG 15/15. **PA = 86% (12/14)** — drops because `generate_text` (compute, for attrition narratives) and `send_email` (side_effect, for engagement-survey distribution) are required tools the workflow legitimately needs. Clean structural separation: pure-CRUD-and-workflow domains are fully Semantius-coverable; analytics+comms domains are not.
- [x] **P2.5A.ii — Obvious-non-Semantius:** ITSM, HCM, ATS, MA, SMM, CCAAS, ESIGN, PAYROLL, S2P, LMS (10 of 11; B2C-COMM skipped initially pending its Phase-B backfill — Phase-B-incomplete, had no master data_objects). Loader: [.tmp_deploy/load_p25a_ii.ts](.tmp_deploy/load_p25a_ii.ts). Added 81 tools (49 query + 31 mutate + 1 new side_effect `post_social_message`) + 10 system skills + 129 skill_tools. **All 10 confirmed NOT 100% Semantius as predicted.** Distribution: LMS 91% (only `send_email` missing), ITSM 87%, ATS+PAYROLL 86%, S2P 85%, HCM 83%, MA 82%, SMM 80%, ESIGN 67%, CCAAS 60% (voice+SMS+transcription+sentiment all required).
- [x] **B2C-COMM follow-up** — Phase-B backfilled (1 subagent) + b2c-comm-system skill loaded. Loader: [.tmp_deploy/load_b2ccomm_phase_b_and_skill.ts](.tmp_deploy/load_b2ccomm_phase_b_and_skill.ts). 10 new master data_objects + 16 trigger_events + 10 handoffs + 19 tools + 1 skill + 23 skill_tools. **b2c-comm-system landed at 91% Semantius** (`execute_payment` + `send_email` non-covered), joining LMS as a second "almost-Semantius" candidate.
- [ ] **P2.5A.iii — Mid-confidence remainder.** Apply patterns learned in tranches i and ii to every other domain that has master `data_objects`. **Live state checkpoint 2026-05-22 end-of-session:** 130 domains, 78 with at least one master, 23 system skills loaded → **~55 candidate domains remaining for this tranche.**

  **Session handoff (read before starting):**
  - **Verify catalog state first.** Counts may have moved since this note was written: `semantius call crud postgrestRequest '{"method":"GET","path":"/domains?select=id&limit=10000"}'` and same for `/skills`, `/skill_tools`, `/tools`. Users add domains between sessions (this session itself ran while 7 new domains were added — see below).
  - **7 new domains added by user 2026-05-22 after Phase-A loads** (all have Phase-B masters, all need P2.5A.iii treatment):
    - **Fleet cluster:** `FLEET-MGMT` (id 147), `FLEET-MAINT` (id 149), `TELEMATICS` (id 148)
    - **Real-estate cluster:** `RE-BROKERAGE` (id 143), `RE-PROP-MGMT` (id 144), `RE-CRE` (id 145), `RE-INVEST` (id 146)
  - **Approach for the 55 candidates.** A hand-curated per-domain `skill_tools` matrix at this volume is prohibitive (~1000+ skill_tools rows). The pragmatic path is a **generator** that:
    1. Pulls each candidate domain's masters from live state.
    2. Auto-adds `query_<master_name>` for every master without an existing query tool (~150 new query tools across the 55).
    3. Auto-adds a generic `update_<master_name>` mutate per master where writes are part of the workflow (~80 new mutates).
    4. Applies a **per-domain category heuristic** for the REQUIRED external tools, drawn from the cross-tranche patterns codified in [SKILL.md § Cross-tranche external-tool patterns](.claude/skills/domain-map-analyst/SKILL.md):
       - **Pure-Semantius candidates (expect 100%):** BI, DATA-AI-PLAT, METRICS-LAYER, KGP, NCDB, LCAP, DAM, BPA, PSA, WORK-MGMT, DISCOVERY, HAM, SAM, ITAM, IGA → no required external tools beyond query/mutate.
       - **Operational with email (~85-95%):** CRM, SALES-ENG, CDP, CSM, LOYALTY, SUB-MGMT, HRSD, AP-AUTO, EXPENSE, SPEND-MGMT → require `send_email`.
       - **Talent / contract domains (~83-86%):** TALENT-MGMT, BEN-ADMIN, COMP-MGMT, EMP-EXP, WFM, ONBOARDING, HCMS, CLM → require `send_email` + `sign_document`.
       - **IT-ops cluster (~85-90%):** AIOPS, ITOM, OBS, RMM, REMOTE-ACCESS, MSP-PSA → require `send_email` + `post_chat_message` (ChatOps).
       - **Field service / dispatch (~85%):** FSM → require `send_email` + `send_sms`.
       - **Finance / payments-heavy (~80-86%):** ERP-FIN → require `send_email` (no `execute_payment` unless treasury workflow).
       - **Real-estate / fleet (~80-85%):** RE-CRE, RE-BROKERAGE, RE-INVEST, RE-PROP-MGMT, FLEET-MGMT, FLEET-MAINT → require `send_email` + `sign_document` (leases, vehicle contracts).
       - **Telematics / vehicle data (~95-100%):** TELEMATICS → likely pure-CRUD (events from devices).
       - **AI-conversational (~70-80%):** CONV-AI → require `transcribe_audio` + `generate_text` + `detect_sentiment`.
       - **Supplier-facing (~85%):** SUP-LIFE, VMS → require `send_email` + `sign_document`.
    5. Inserts skills + skill_tools with the same idempotency pattern as [load_p25a_i.ts](.tmp_deploy/load_p25a_i.ts) / [load_p25a_ii.ts](.tmp_deploy/load_p25a_ii.ts).
    6. Runs the built-in hypothesis-test rollup at the end.
  - **DO NOT** add system skills for **leadership-layer / aggregation-tier** domains that legitimately master nothing (per the SKILL.md "Leadership-layer / aggregation-tier domains often master nothing" rule): REV-INTEL, SALES-PERF, GTM-PLAN, ACCT-PLAN, PRM, EPM is allowed (has masters). Quick check before drafting: `/domain_data_objects?domain_id=eq.<id>&role=eq.master`; zero masters = skip.
  - **`vendors` is not a `data_object`.** It's the catalog's vendor reference table. Tools needing "vendor" reads should use `query_suppliers` (P2.5A.i discovered this; codified in SKILL.md anti-patterns).
  - **Dedupe before insert.** P2.5A.i discovered 3 existing query tools (`query_employees`, `query_journal_entries`, `query_suppliers`) that already shipped in P2.3. Always `refresh` the tool map before generating `query_<name>` candidates.

### P2.6A — Semantius coverage rollup query (system skills only)
> **Revised 2026-05-21:** rollup is computed from `tools.operation_kind` membership in the Semantius-covered set (today: `{query, mutate}`), not from `tool_solutions` rows pointing at Semantius. See [plan-tools-catalog.md § Decision record](plan-tools-catalog.md#decision-record--2026-05-21-authoritative-overrides-the-body-below-where-they-conflict).
- [ ] Author the saved cube/SQL query: for each skill, % = (count of required tools whose `operation_kind` ∈ Semantius-covered set) / (total required tools). Per-tool aggregation; not per-operation_kind.
- [ ] Decide how to source the Semantius-covered set (option 1 hardcode is the recommended starting point; option 2 config table is the upgrade path)
- [ ] Verify ≥5 system skills land at 100% (every required tool's operation_kind is Semantius-covered)
- [ ] Also save the diagnostic query: for each skill <100%, list the specific tools whose `operation_kind` is NOT Semantius-covered (the side_effect / compute tools dragging the % down)
- [ ] Save both queries to a `references/` folder for reuse

### S2.5A — Codify tool-requirement derivation patterns in `domain-map-analyst` SKILL.md (per tranche)
- [x] **After P2.5A.i (100%-Semantius tranche):** SKILL.md gained a new "System-skill tool derivation" section codifying the 3-source derivation procedure (masters → contributor/consumer reads → handoff-driven mutates), the hypothesis-test rollup, and 5 anti-patterns surfaced during the load. The reliable predictor of *not* being 100% Semantius — narrative generation OR external distribution OR ML scoring beyond computed_fields — is captured explicitly. 11/12 candidates landed at 100%; PA flipped to 86% as predicted.
- [x] **After P2.5A.ii (obvious-non-Semantius tranche):** SKILL.md gained a "Cross-tranche external-tool patterns" subsection cataloguing the 9 recurring external-tool shapes (universal `send_email`, talent+contract `sign_document`, ChatOps `post_chat_message`, voice/SMS telephony, audio+sentiment analytics, external payments, social-platform actions, ML-scoring beyond computed_fields, calendar scheduling). Lowest-% skills (CCAAS 60%, ESIGN 67%) explained by pattern stacking; highest-non-100% (LMS 91%) flagged as the canonical "almost-Semantius — flips to 100% if Semantius gains native email primitive."
- [ ] **After P2.5A.iii (mid-confidence remainder):** document anything that surprised — domains that flipped from one hypothesis to the other, or that needed unexpected tool kinds.

---

## Wave 3 — Process discovery payoff (Plan 1)

### P1.6 — Discovery cube query
- [ ] Author the saved cube view per the [Discovery procedure](plan-process-skill-discovery.md#discovery-procedure-the-payoff) (trigger-event-prefix bucketing + APQC PCF name-match + aggregate metrics)
- [ ] Validate output structure: ranked list with `process_name`, `apqc_pcf_id`, `handoff_count`, `domain_count`, `function_count`, `friction_score`
- [ ] Add the saved query to `.claude/skills/domain-map-analyst/references/` for reuse

### S1.6 — Capture discovery query as SKILL.md reference
- [ ] Reference the saved query from `domain-map-analyst` SKILL.md's Phase D section (S0.2)
- [ ] Add a "How to interpret discovery output" subsection with one or two illustrated examples

### P1.7 — First discovery run + candidate selection
- [ ] Run the discovery query against the loaded substrate
- [ ] Verify ≥10 candidates, ≥3 with the top-3 success-criteria shape (≥3 domains, ≥3 functions, ≥4 handoffs, ≥1 high-friction handoff)
- [ ] Surface the ranked list with proposed top 2-3 to materialise as process skills
- [ ] Document the chosen top 2-3 in a follow-up plan file (e.g. `plan-process-skill-<name>.md`, one per chosen process)

### S1.7 — Capture discovery patterns in SKILL.md
- [ ] After the first run, document patterns that emerged: which clustering signals dominated; which APQC mappings were clean vs needed manual review; which buckets needed `custom` process rows; any cluster that surprised
- [ ] Refine the clustering-signal section if any signal proved unreliable in practice

---

## Wave 4 — Process-skill tool requirements + final roadmap

### P2.5B — Process-skill tool requirements (depends on P1.7)
- [ ] [!] **Blocked until P1.7 surfaces candidate list**
- [ ] For each top-N process candidate, enumerate the workflows the process skill would own
- [ ] For each workflow, identify required tools (query/mutate/side_effect/compute) — create new `tools` rows if needed
- [ ] Insert `skill_tools` rows for each process skill
- [ ] Surface the per-process tool-requirement maps for review

### P2.6B — "100% Semantius" re-run with process skills
- [ ] Re-run the saved query after P2.5B is populated
- [ ] Produce the final certified list (system skills + process skills)

### P2.7 — Tool gap roadmap
- [ ] Query: which `tools` have the most dependent `skill_tools` rows? (highest-leverage tools to integrate)
- [ ] Query: which `tools` have many dependent skills but **few candidate solutions delivering them**? (gaps)
- [ ] Surface top 5 gaps for next-step tool-integration decision

### S2.7 — Final knowledge capture in `domain-map-analyst` SKILL.md
> Revised 2026-05-21: there's only one analyst skill after the merge.
- [ ] Document the tool-gap heuristics (which tool kinds are usually under-represented; which solutions tend to be missing)
- [ ] Add saved-query snippets for the domain-shaped joins to `tools` / `skills` / `tool_solutions` / `skill_tools` (e.g. "show me domains whose system skill is 100% Semantius certified")
- [ ] Update `module-shape.md` with anything that emerged late in the load

---

## Cross-cutting (any phase)

> Wave 0 (S0.*) + the post-phase **S** items above are the **scheduled** SKILL.md maintenance points. These below are the **opportunistic** maintenance: things you do *while* you're in the file for another reason.

- [ ] Update [`SKILL.md`](.claude/skills/domain-map-analyst/SKILL.md) anti-patterns when an unexpected mistake surfaces (don't wait for a scheduled S-item)
- [ ] Update [`module-shape.md`](.claude/skills/domain-map-analyst/references/module-shape.md) immediately when fields/enums change

---

## Dependency notes

- **Wave 0 (S0.*) blocks Wave 1.** Without the SKILL.md updates, the agent doing Wave 1 work doesn't know the `processes`/`trigger_events` entities or the new conventions. Run S0.1–S0.4 first.
- **P2.* (Wave 2) runs in parallel with P1.5* (Wave 2).** P2.1–P2.4 don't depend on any handoff data. P2.5A derives system-skill tool requirements from existing `domain_map` data (`data_objects` + `cross_domain_handoffs`), so it only needs Wave 1 done.
- **P2.5B is the only hard cross-plan dependency.** It requires P1.7 (process candidates surfaced) before workflows can be enumerated per process skill.
- **P2.6 ("100% Semantius") is re-runnable.** P2.6A runs after P2.5A.iii (certified system skills); P2.6B re-runs after P2.5B (adds process skills).
- **S-items** (SKILL.md maintenance) are interspersed: S1.5 (after each P1.5 cluster), S2.2 (after the tool-catalog entities deploy into `domain_map`), S1.6 / S1.7 (after discovery), S2.5A (after system-skill tool requirements), S2.7 (final). They're each small but cumulative — skipping them strands hard-won patterns.
- **Recommended start order:** Wave 0 (~0.5 session for SKILL.md prep) → Wave 1 (~3 sessions) → Wave 2 in parallel (P1.5* + P2.1-2.5A + interspersed S-items, ~8-9 sessions total) → Wave 3 (~2 sessions) → Wave 4 (~2-3 sessions). **Total: ~16-21 sessions across both plans.**

---

## Deferred — held until end-of-program review

> Destructive or irreversible operations that are explicitly held until the final program review. Each item requires fresh explicit user confirmation when its turn comes; standing approvals do not carry over (per the project rule that any non-default status change / destructive action requires per-load confirmation). Surface this section to the user during end-of-program review.

- [ ] **Drop `cross_domain_handoffs.trigger_event` (text column)** — superseded by the `trigger_event_id` FK added in [P1.4](#p14--migrate-existing-handoffs-to-fk). The text column is kept as a safety net (original strings preserved alongside the FK) until end-of-program review confirms the migration was correct. Drop only after the user explicitly says so.

---

## Source documents

- [`plan-process-skill-discovery.md`](plan-process-skill-discovery.md) — Plan 1 design intent (entities, schema, sequence, success criteria)
- [`plan-tools-catalog.md`](plan-tools-catalog.md) — Plan 2 design intent (originally a sibling `tool_catalog` module; 2026-05-21 reversed and folded into `domain_map`. Entity schema, sequence, and success criteria still valid; module structure superseded by the merge.)
