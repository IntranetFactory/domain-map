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
- [ ] Add per-value semantics + when-to-set guidance to the `domain-map-analyst` SKILL.md classification heuristics
- [ ] Add an anti-pattern: "don't load tool-shaped capability rows in `domain_map.capabilities` — those are `tools` (in the same module), not `capabilities`; the capabilities table stays business-shaped"
- [ ] Add the 4 new entities (`tools`, `skills`, `tool_solutions`, `skill_tools`) to `module-shape.md` and SKILL.md's "Module at a glance" section (folded in from the deleted `tool-catalog-analyst` skill)

### P2.3 — `tools` vocabulary
> **Revised 2026-05-21:** see [plan-tools-catalog.md § Decision record](plan-tools-catalog.md#decision-record--2026-05-21-authoritative-overrides-the-body-below-where-they-conflict). No pseudo-tools; Semantius coverage is intrinsic to `operation_kind`.
- [ ] Draft ~40 `tools` (JSON-RPC functions) with `operation_kind` set: `send_email`, `query_invoices`, `create_calendar_event`, `post_chat_message`, `make_phone_call`, `send_sms`, `run_shell_command`, `transcribe_audio`, `search_web`, `read_pdf`, `execute_payment`, `sign_document`, `generate_image`, `store_blob`, `extract_entities`, `web_scrape`, etc.
- [ ] Set `data_object_id` FK for `query`/`mutate` operations (e.g. `query_invoices` → `invoices` data_object). Required when `operation_kind ∈ {query, mutate}`; null otherwise — enforced by validation rules.
- [ ] ~~Include three Semantius pseudo-tools~~ — dropped 2026-05-21. Semantius coverage lives on `operation_kind`, not on individual tool rows.
- [ ] Surface draft for review before bulk insert
- [ ] Load idempotently
- [ ] Stamp `record_status='approved'` once review confirms vocab is clean

### P2.4 — `tool_solutions` matrix + `solution_kind` promotions
> **Revised 2026-05-21:** no Semantius row in `solutions`; no `semantius_native` value in `solution_kind` enum (4 values now). `tool_solutions` matrix is for non-Semantius solutions only.
- [ ] List the ~30 solutions that source tools: Microsoft 365 (`action`), Google Workspace (`action`), Slack (`action`), Twilio (`action`), DocuSign (`action`), Stripe (`action`), OpenAI Platform (`compute_service`), Anthropic API (`compute_service`), Playwright (`compute_service`), SAP S/4HANA (`external_connector`), Oracle NetSuite (`external_connector`), Workday HCM (`external_connector`), Salesforce CRM (`external_connector`), etc.
- [ ] ~~Add a Semantius solution row~~ — dropped 2026-05-21. Semantius isn't in `solutions`.
- [ ] PATCH existing `domain_map.solutions` rows to their right `solution_kind` (most stay `standard_solution`; the ~30-50 in the list above get promoted to `external_connector` / `action` / `compute_service`); add new solutions for tool sources not yet in the catalog (AWS SES, Playwright, etc.)
- [ ] For each tool, insert `tool_solutions` rows linking to every solution that delivers it, with `delivery_strength` + `delivery_method` + optional `endpoint_url`. Do not author Semantius-side rows; Semantius coverage is read from `operation_kind`.
- [ ] Surface draft for review before bulk insert

### P2.5A — System-skill `skill_tools` (independent of Plan 1)
> Process in three tranches so the killer hypothesis ("which domains are 100% Semantius?") is confirmed/refuted fastest, and so the S2.5A pattern-capture happens while each tranche's lessons are fresh.

- [ ] **P2.5A.i — 100%-Semantius hypothesis candidates:** GRC, AUDIT, APM, CMDB, SPM, DCG, DQ, MDM, PA, SWP, EPM, ESG. Draft `skill_tools` rows derived from the domain's `data_objects` masters + outbound handoffs + typical workflow patterns. Insert with `requirement_level` (`required` / `optional` / `fallback`) and a one-line workflow-context note.
- [ ] **P2.5A.ii — Obvious-non-Semantius:** ITSM, HCM, ATS, MA, SMM, CCAAS, ESIGN, PAYROLL, S2P, B2C-COMM, LMS. Same shape; expected to surface `action` and `compute_service` tool requirements.
- [ ] **P2.5A.iii — Mid-confidence remainder:** every other `domain_map` domain (~75 of the ~100 total). Apply patterns learned in tranches i and ii.

### P2.6A — Semantius coverage rollup query (system skills only)
> **Revised 2026-05-21:** rollup is computed from `tools.operation_kind` membership in the Semantius-covered set (today: `{query, mutate}`), not from `tool_solutions` rows pointing at Semantius. See [plan-tools-catalog.md § Decision record](plan-tools-catalog.md#decision-record--2026-05-21-authoritative-overrides-the-body-below-where-they-conflict).
- [ ] Author the saved cube/SQL query: for each skill, % = (count of required tools whose `operation_kind` ∈ Semantius-covered set) / (total required tools). Per-tool aggregation; not per-operation_kind.
- [ ] Decide how to source the Semantius-covered set (option 1 hardcode is the recommended starting point; option 2 config table is the upgrade path)
- [ ] Verify ≥5 system skills land at 100% (every required tool's operation_kind is Semantius-covered)
- [ ] Also save the diagnostic query: for each skill <100%, list the specific tools whose `operation_kind` is NOT Semantius-covered (the side_effect / compute tools dragging the % down)
- [ ] Save both queries to a `references/` folder for reuse

### S2.5A — Codify tool-requirement derivation patterns in `domain-map-analyst` SKILL.md (per tranche)
- [ ] **After P2.5A.i (100%-Semantius tranche):** document the internal-only derivation patterns ("system skill against own data_objects → `query`/`mutate` only, no side_effects"). Validate or refute the 100%-Semantius hypothesis for each candidate; record which flipped.
- [ ] **After P2.5A.ii (obvious-non-Semantius tranche):** document the recurring external-tool patterns ("HR/customer-comm domains → email + calendar `action` tools"; "AI-flavored domains → `compute_service` tools"; "domains mastering external data_objects → `external_connector` tools").
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
