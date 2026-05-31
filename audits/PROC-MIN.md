---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 23
---

# PROC-MIN, Audit History

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint (PROC-MIN, id 40):** 0 `domain_modules`, 0 `capabilities` (M1 / M2 / M4 / A2 all hard-fail). 6 master `data_objects` linked only via legacy `domain_data_objects` (`event_logs`, `discovered_process_models`, `process_conformance_results`, `process_variants`, `process_bottleneck_findings`, `business_rules_extracted`) plus 1 `contributor` row on BPA-mastered `business_process_models`. 5 solutions (3 primary: Celonis EMS, SAP Signavio Process Intelligence, ServiceNow Process Mining; 2 secondary: UiPath Business Automation Platform, iGrafx Process360 Live). 1 `business_function_domains` row (Business Operations, owner). 6 `trigger_events`, all with empty `event_category` (Rule #13). 4 outbound + 2 inbound cross-domain handoffs, every row with NULL `source_domain_module_id` and 5 of 6 with NULL `target_domain_module_id`. 0 `data_object_lifecycle_states` (B12), 0 `data_object_aliases` (B11), 0 `data_object_relationships` of any kind (B6, B7, B8), 0 `domain_regulations`, 0 `domain_aliases`. 1 legacy `skill_type='system'` skill (`proc-min-system`, id 91, anchored on `domain_id` with `domain_module_id` NULL) carrying 6 `query_*` tools at `coverage_tier='platform'`.
- **Vendor-surface basis (flagship vendors for the semantic pass):** Celonis EMS (leader), SAP Signavio Process Intelligence, Microsoft Power Automate Process Mining (formerly Minit), UiPath Process Mining (formerly ProcessGold), ServiceNow Process Mining, IBM Process Mining (formerly myInvenio), Apromore (open-source / commercial), QPR ProcessAnalyzer, Software AG ARIS Process Mining, Skan.ai (task mining specialist), iGrafx Process360 Live. Compliance / audit specialist surface drawn from Celonis Audit and Celonis Compliance accelerators (SOX 404 controls, segregation of duties).
- **Bucket 1 (in-scope, agent fixable):** 9 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 8 items.

**Neighbor discovery** (auto-derived from `handoffs` + cross-domain DMDO, ranked by edge weight):

| Neighbor | Outbound | Inbound | Cross-rels | Cross-DMDO | Weight | Pass shape |
|---|---|---|---|---|---|---|
| BPA (id 136) | 3 | 2 | 0 | 1 (contributor on `business_process_models`) | 6 | Pairwise (full) |
| WORK-MGMT (id 135) | 1 | 0 | 0 | 0 | 1 | Lightweight |

The dominant cross-domain finding is the **wholesale absence of modularization on both sides**, BPA and PROC-MIN: BPA is itself pre-modular (0 `domain_modules` for `domain_id=136`), so every handoff between the two is forced to NULL `source_domain_module_id` / `target_domain_module_id`. Captured below as B1-H4 / B1-H5; surfaced as a domain pair that needs joint Phase A before any pairwise reconciliation can produce module-attributed handoff rows.

**Structural pass bands:** S1 / S2 / S3 hard-fail (zero rows on `domain_modules`, `capability_domains`, lifecycle states, aliases). A1 passes (the 7 metadata fields are populated). **A2 / A3 / A4 fail** (zero capabilities, `catalog_tagline` and `catalog_description` empty). **M1 / M2 / M4 hard-fail** (zero modules and zero capabilities); M5 / M6 / M7 vacuous. **B1 / B2 pass** (6 masters with `singular_label` / `plural_label`); **B3 needs review** (the 6 names are prefixed and pass automatically, but `business_rules_extracted` is unconventionally adjective-trailing, see Bucket 2); **B4 / B6 / B7 / B8 / B11 / B12 hard-fail** (no pattern-flag review, zero intra-domain rels, zero `users` edges, zero cross-domain rels, zero aliases, zero lifecycle states); **B9 partial-fail** (6 events exist but all carry empty `event_category`); **B9b vacuous** (zero modules makes intra-domain cross-module handoffs undefined); **B10b hard-fail** on every cross-domain handoff; **B5 vacuous** (no embedded_master rows). **C1 partial-pass** (1 owner row, no contributor / consumer rows). **E1 / E2 / E3 / E4 / E5 / E6 fail** (zero roles for `business_function_id=<Business Operations id>` touching any PROC-MIN module, plus the 2-module floor cannot be satisfied at all). **F1 fail** (legacy `domain_id`-anchored system skill present, no module-level system skill exists); **F2 / F3 / F5 vacuous** (no modules to score); **F4 passes** on the legacy skill's 6 tools; F7 vacuously passes. **H1 partial-fail**: 1 of 6 cross-domain handoffs (handoff 183) carries a `discovery_substring` PCF tag pointing at "Manage non-conformance" (17492 L3) which is a credible match; the other 5 are untagged.

The whole audit is dominated by one fact: PROC-MIN is a pre-modular domain that was loaded with masters + solutions + a single legacy system skill, but never received its Phase-A modules, Phase-A capabilities, Phase-B substrate (relationships, aliases, lifecycle states), Phase-C contributor / consumer rows, or Phase-E roles. The Bucket 1 list reflects the in-scope structural fixes that do not require user judgment on substance (event_category enums, single-line label fields, queue-the-candidate); Bucket 2 holds the judgment calls (modularization shape, capability naming, single-name-vs-rename); Bucket 3 holds the speculative vendor-surface gaps that need Phase 0 vendor research before loading.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **B9 / Rule #13 (enum)** | All 6 `trigger_events` rows for PROC-MIN masters carry an empty string in `event_category`. Allowed values are `lifecycle`, `state_change`, `threshold`, `signal`. Proposed mapping per event: `event_log.ingested` (797) -> `lifecycle`; `discovered_process_model.published` (798) -> `state_change`; `process_variant.identified` (799) -> `signal`; `process_bottleneck_finding.created` (800) -> `signal`; `business_rule_extracted.identified` (801) -> `signal`; `conformance.deviation_detected` (358) -> `signal`. | PATCH each `trigger_events.id` with the proposed `event_category`. Surgical CLI (6 PATCHes). |
| B1-S2 | **A4** | `domains.catalog_tagline` and `catalog_description` are empty. Rule #20 requires buyer-voice drafts surfaced for user review BEFORE writing. Proposed `catalog_tagline` (draft, awaiting user approval): *"See how your processes actually run. Mine event logs from ERP, CRM, and case systems to surface bottlenecks, deviations, and improvement opportunities."* Proposed `catalog_description` (draft, awaiting user approval): a 2-paragraph buyer-voice description of event-log ingestion, discovery, conformance, and bottleneck detection workflow. | Author both fields per Rule #20 voice rule, surface to user for sign-off, then PATCH on approval. |
| B1-S3 | **B7** | Zero `data_object_relationships` rows between any PROC-MIN master and `users` (id 748). Rule #10 mandates `users` edges for every master with a user-typed actor. Proposed edges: `event_logs` -> `users` (uploaded_by / ingested_by), `discovered_process_models` -> `users` (published_by), `process_conformance_results` -> `users` (analyst), `process_variants` -> `users` (analyst), `process_bottleneck_findings` -> `users` (assigned_to / owner), `business_rules_extracted` -> `users` (reviewed_by). | Author 6 `data_object_relationships` rows on the standard verb-shape pattern; load via the cluster-drafts loader. |
| B1-S4 | **B6** | Zero intra-domain `data_object_relationships` rows. Expected edges (recovered from the trigger_event chain): `event_logs` -> `discovered_process_models` (the algorithmic output), `event_logs` -> `process_variants`, `discovered_process_models` -> `process_conformance_results` (model is the reference of conformance), `discovered_process_models` -> `process_variants` (a variant is a deviation from the discovered baseline), `process_conformance_results` -> `process_bottleneck_findings` (a bottleneck is a specialization of a conformance finding in many vendors), `event_logs` -> `business_rules_extracted` (rule mining outputs). Each row needs `relationship_verb`, `inverse_verb`, `relationship_type` (cardinality), `relationship_kind`, `is_required`, `owner_side`. | Draft 6 intra-domain rels; load via cluster-drafts. |
| B1-S5 | **B11** | Zero `data_object_aliases` rows for any PROC-MIN master. Non-self-explanatory masters that deserve aliases per the Phase-B contract: `event_logs` (vendor aliases: Celonis "Activity Tables", SAP Signavio "Process Cases", UiPath "Event Streams"), `discovered_process_models` ("As-Is Models"), `process_conformance_results` ("Conformance Checks"), `process_variants` ("Process Variants" is industry-standard; alias adds "Case Variants"), `process_bottleneck_findings` ("Bottleneck Insights"), `business_rules_extracted` ("Mined Business Rules"). | Author 6+ alias rows per cluster-drafts pattern. |
| B1-S6 | **B12 / Rule #12** | Zero `data_object_lifecycle_states` for any of the 6 `master + required` masters. `event_logs` has a real workflow: `uploaded` -> `ingested` -> `validated` -> `available` -> `archived`. `discovered_process_models` workflow: `running` -> `discovered` -> `published` -> `superseded`. `process_conformance_results` workflow: `pending` -> `running` -> `completed` -> `reviewed`. `process_variants` are append-only finding-shaped (config-shape exemption candidate, Bucket 2). `process_bottleneck_findings` workflow: `open` -> `acknowledged` -> `in_progress` -> `resolved` -> `dismissed`. `business_rules_extracted` workflow: `extracted` -> `reviewed` -> `codified` -> `rejected`. | Draft the 5 state machines (4 with workflow gates, 1 config-shape candidate), load via a focused loader, mark `requires_permission=true` on review / publish / acknowledged / resolved / codified gates. |
| B1-S7 | **B10b backfill on outbound side** | Every PROC-MIN outbound `handoff` row carries NULL `source_domain_module_id` (handoffs 183, 740, 741, 742). The standard B10b derivation cannot run because PROC-MIN itself has zero `domain_modules`. The fix is upstream: once the M-band modules ship (B1-M1), the backfill becomes deterministic. | Block on B1-M1; do not patch in isolation. |
| B1-S8 | **F1 (legacy)** | A legacy domain-level system skill exists (`proc-min-system`, id 91, `domain_id=40`, `domain_module_id=NULL`). Under Rule #14 / #17, system skills mirror modules 1:1; the legacy row is a pre-modular artifact. Acceptable transitional state only while no module-level skill exists; once modules ship per B1-M1, the legacy skill is obsolete. | After B1-M1 lands and per-module system skills are authored, DELETE skill id 91 (and cascade its 6 `skill_tools` rows; the tool rows themselves stay since they are catalog-wide primitives, just the skill_tools junction goes). |
| B1-H1 | **H1 (APQC TAGGING)** | 1 of 6 cross-domain handoffs carries a PCF tag: handoff 183 -> `Manage non-conformance` (17492 L3) via `discovery_substring`. Five untagged: 180 (BPA -> PROC-MIN, `process_model.published`), 740 (PROC-MIN -> BPA, `discovered_process_model.published`), 741 (PROC-MIN -> BPA, `process_variant.identified`), 742 (PROC-MIN -> WORK-MGMT, `business_rule_extracted.identified`), 783 (BPA -> PROC-MIN, `process_simulation_run.completed`). Volume expectation (Rule H1, 0.5N to 0.8N): 3 to 5 new `agent_curated` tags for the 5 untagged + 0 to 1 re-tag of 183. Proposed PCF rows (high-confidence at L3, drill into L4/L5 only if user requests): handoff 180 -> `Develop and manage business processes` (10031 L3 or child); handoff 740 -> `Manage business process management` (or `Define business process management strategy`, 10046 L3); handoff 741 -> `Manage business process management` (10046 L3, variant identification is a BPM operational concern); handoff 742 -> `Manage business rules` (no clean APQC PCF L3 match for business-rule extraction; **defer to Discover Pass 3** as a custom-process candidate); handoff 783 -> `Develop business process design` (simulation is a BPA-side authoring concern, simulation completion event consumed by PROC-MIN for actual-vs-simulated comparison). | After user-review of proposed mappings, INSERT 4 `handoff_processes` rows (180, 740, 741, 783) with `proposal_source='agent_curated'`, `record_status='new'`. Defer 742 to Discover Pass 3. Handoff 183's existing `discovery_substring` tag (`Manage non-conformance` 17492) is a credible L3 match; recommend it remain in place and surface in this audit for user sign-off rather than replacement. |

Sub-summary by finding type:

| Finding type | Count |
| --- | --- |
| STRUCTURAL (S/A/B/F band failures, queued behind M-band) | 8 |
| APQC TAGGING | 1 (rolls up 4 proposed inserts + 1 defer + 1 retain) |
| BOUNDARY (B10b) | covered inside B1-S7 |
| MISSING / WRONG-OWNERSHIP / SCOPE-CREEP | 0 in Bucket 1 (all market-derived gaps route to Bucket 3) |
| **Bucket 1 total** | 9 |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent cannot answer | Options |
|---|---|---|---|
| B2-1 | **M1 / Phase A, the modularization shape itself.** PROC-MIN has 0 modules. The market-vendor surface (Celonis, Signavio, UiPath, ServiceNow, Microsoft) splits the workflow across (a) ingestion, (b) discovery, (c) conformance, (d) insights and bottleneck analysis, (e) action and automation, plus optional (f) task mining. With 6 currently-loaded masters and 5 candidate Phase-0 masters (Bucket 3), a 4 or 5 module split is the natural shape. Proposed: `PROC-MIN-INGESTION` (event_logs, data extraction), `PROC-MIN-DISCOVERY` (discovered_process_models, process_variants, mining_jobs), `PROC-MIN-CONFORMANCE` (process_conformance_results, business_rules_extracted, compliance_controls_evaluations), `PROC-MIN-INSIGHTS` (process_bottleneck_findings, KPIs, cycle-time analyses), optional `PROC-MIN-ACTION` (process_automations / action_flows). | Rule #14 says >=3 capabilities mandates >=2 full modules; the audit cannot pick the right shape without confirming the capability list (B2-2) and resolving the Bucket 3 vendor-surface load order. | (a) Adopt the 4-module split above; (b) collapse INGESTION + DISCOVERY into one `PROC-MIN-MINING` core module; (c) defer modularization until Bucket 3 vendor-research lands and re-decide. |
| B2-2 | **A2 / capabilities authoring.** 0 capabilities loaded. Proposed capability set (5 to 7 noun-phrase capabilities): `event-log-ingestion`, `process-discovery`, `process-conformance-checking`, `process-variant-analysis`, `process-bottleneck-identification`, `process-improvement-opportunity-identification`, `business-rule-mining`. Optional add: `task-mining` (folded in or hived off to TASK-MINING candidate per Bucket 3). | Capability vocabulary is an editorial / market-shape decision; the agent can propose but the user owns the final names. | (a) Adopt all 7 above; (b) drop `task-mining`; (c) rename for tighter taxonomic alignment with PCF Process Improvement (10047, 10048, 10049). |
| B2-3 | **B3 / naming arbitration on `business_rules_extracted`.** This is the only master whose name reads adjective-trailing (noun + past participle) rather than the standard noun-phrase pattern; every other PROC-MIN master is noun-phrase-plural. Alternative names: `extracted_business_rules` (PCF-aligned), `mined_business_rules`, `inferred_business_rules`, or leave as `business_rules_extracted` and document. Naming arbitration matters because: (a) the noun-trailing form is unusual in the catalog; (b) `business_rules` without a prefix collides with the LCAP / decision-management literature where business rules are first-class. | This is the kind of naming arbitration Rule #9 calls a Bucket 2 decision: there is no collision (no other `business_rules*` data_object exists today), but the form is anomalous. | (a) Rename to `extracted_business_rules` (preferred); (b) leave as is; (c) other suggested form. |
| B2-4 | **B4 pattern-flag positive re-evaluation per Rule #12.** Every PROC-MIN master has `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false`. Positive re-evaluation needed: should `event_logs.has_personal_content=true`? Event logs often carry user IDs, sometimes email addresses (employee-case data, customer-case data). Should `discovered_process_models.has_submit_lock=true`? Once published, a discovered model should be immutable so downstream conformance results have a stable baseline. Should `process_conformance_results.has_submit_lock=true`? Conformance snapshots are time-stamped audit-style records. | Pattern flags are workflow-shape judgments the user owns; the false-by-default is not the same as false-after-review. | Per-flag yes/no. |
| B2-5 | **`process_variants` config-shape exemption.** The B1-S6 lifecycle draft above tentatively classifies `process_variants` as a config-shape exemption (append-only finding-shaped, no real workflow). Other interpretation: variants have a real `surfaced` -> `acknowledged` -> `accepted_as_new_normal` / `marked_as_deviation` workflow in the conformance-mining flow. | Decision depends on whether PROC-MIN treats variants as throwaway findings or as a catalog of "approved" deviations. | (a) Treat as config-shape, no lifecycle states; (b) Author the 4-state machine; surface the decision in the audit (per Rule #15, no auto-population of `data_objects.notes`). |
| B2-6 | **`domains.description`, `trigger_events.description`, and `skills.description` for PROC-MIN currently contain U+2014 em-dashes** (forbidden per CLAUDE.md project rule "No em-dashes"). Affected rows: `domains` id 40 description, `trigger_events` id 358 description, id 798 description, `skills` id 91 description. Per Rule #20 / Rule #15, the audit does NOT auto-rewrite the cells; it surfaces them for user-approved wording before any PATCH. | The rule is project-wide but the agent must not draft replacement wording into description fields unilaterally for this domain; the user should confirm whether to bulk-rewrite or treat each cell individually. | (a) Rewrite all affected cells in this audit cycle (provide replacement wording per row); (b) defer to a cross-domain em-dash audit pass; (c) leave (the fact_sheet emitter sanitizes at render time as a safety net, per CLAUDE.md). |

### Bucket 3, Phase 0 pending (speculative, market-surface gaps from vendor research)

Vendor-surface basis: Celonis EMS, SAP Signavio Process Intelligence, UiPath Process Mining, ServiceNow Process Mining, Microsoft Power Automate Process Mining, Apromore, IBM Process Mining, Software AG ARIS Process Mining, Skan.ai. No formal Phase 0 vendor-research document has been authored yet; these are candidates surfaced from the audit's own semantic pass and require Phase 0 vetting (vendor-by-vendor surface matrix) before any Phase B insert.

#### MISSING (candidate entities, 8 items)

| # | Candidate entity | Vendor evidence | Proposed module | Notes |
|---|---|---|---|---|
| B3-1 | `data_source_connections` (or `event_log_connectors`) | Celonis EMS Connectors, Signavio Process Intelligence Data Pipelines, UiPath Process Mining ingestion adapters | `PROC-MIN-INGESTION` | Connection metadata to ERP / CRM / case systems. Pre-requisite for event-log ingestion. |
| B3-2 | `event_log_extractions` (or `data_extraction_jobs`) | Celonis Extractors, Signavio Data Pipelines, UiPath Extract activities | `PROC-MIN-INGESTION` | Run records of the ETL pipeline that produces an event-log. Distinct from `event_logs` (the artifact). |
| B3-3 | `event_log_quality_findings` (or `data_quality_issues`) | Celonis Data Health, Signavio Process Intelligence Data Quality | `PROC-MIN-INGESTION` | Data-quality flags surfaced during ingestion (missing case_ids, timestamp anomalies, attribute skew). |
| B3-4 | `process_kpis` (or `process_metrics`) | Celonis KPI Library, Signavio Process Intelligence Metrics | `PROC-MIN-INSIGHTS` | Named, configurable measures that hang off process executions and feed dashboards. |
| B3-5 | `improvement_opportunities` (or `value_opportunities`) | Celonis Value Realization, Signavio Process Intelligence Improvement | `PROC-MIN-INSIGHTS` | Quantified opportunity records ($ value, frequency) that bridge a finding to an action. |
| B3-6 | `process_automations` (or `action_flows`) | Celonis Action Flows, Signavio Action SDK, UiPath integration into RPA | `PROC-MIN-ACTION` (new module) or fold into RPA | The automation hop that fires from a mining finding. Borderline cross-cutting with RPA / IPaaS; check Phase 0 before promoting. |
| B3-7 | `compliance_controls_evaluations` (or `process_control_runs`) | Celonis Compliance, Celonis Audit, ServiceNow Process Mining (SOX 404 use cases) | `PROC-MIN-CONFORMANCE` | Control-by-control conformance runs (segregation of duties, four-eye violations). Could overlap with GRC; check whether GRC already masters this. |
| B3-8 | `process_benchmarks` (or `industry_benchmarks`) | Celonis Benchmarks, Signavio Process Intelligence Benchmarks | `PROC-MIN-INSIGHTS` | Anonymized comparative data so users can position their cycle-time / FPY against industry medians. |

#### MODULARIZATION (candidate modules, see B2-1)

The modularization candidates above (4 to 5 modules) are themselves a Bucket 3 / Bucket 2 hybrid: the structural fact is "M1 hard-fails until a module set exists"; the substantive shape needs vendor-research vetting. Calling out so the orchestrator does not double-count.

#### Candidate queued in `audits/_missing-domains.md`

- `TASK-MINING` (Task Mining), surfaced for the first time by this audit. Vendor evidence: UiPath Task Mining, Skan.ai, Celonis Task Mining, Microsoft Power Automate Process Mining (desktop activity). Adjacency: PROC-MIN, RPA, EMP-EXP. Candidate capabilities: desktop activity capture, task variant discovery, automation candidate scoring, time-and-motion analytics. **Triage rule:** likely promotable as a distinct domain (3+ pure-play vendors), but could equally be folded into PROC-MIN as a sub-module (`PROC-MIN-TASK-MINING`). User decides at triage time; audit only queues.

### Cross-bucket dependencies

- **B1-S7 (B10b backfill)** is blocked on **B2-1 (modularization shape)**. Without modules, the backfill cannot derive `source_domain_module_id`.
- **B1-S8 (legacy F1 cleanup)** is blocked on **B2-1**. The legacy skill stays until per-module system skills can be authored.
- **B1-S6 (lifecycle states)** is blocked on **B2-1 + B2-5**. The states themselves are draftable, but `domain_module_id` on each state row needs the module set.
- **Bucket 3 entries (B3-1 through B3-8)** all unlock further Bucket 1 fixes once vetted (additional events, additional cross-domain handoffs, additional aliases). Treat the Bucket 3 vetting as a precondition for the next round of Bucket 1 work.
- **B1-H1 (APQC tagging)** is **independent** of Bucket 2 and Bucket 3. The 4 proposed `agent_curated` rows can ship in isolation as a focused load even before the M-band modules exist.
- **B2-6 (em-dashes in description cells)** is **independent** of the other buckets.

### Per-bucket prompts

**Bucket 1 ("Fix these now?"):** Reply `all`, list (e.g. `S1, S2, H1-top3`), or `skip`.

- **S1 (event_category PATCH on 6 events):** trivial, no dependencies. Recommend run first.
- **S2 (A4 catalog tagline / description):** drafts above need your sign-off on wording per Rule #20 before any PATCH.
- **S3 / S4 / S5 (B7 / B6 / B11 cluster-drafts):** mechanical once you bless the verb list and the alias list. Can ship as one focused loader.
- **S6 (B12 lifecycle states):** blocked on B2-1 + B2-5. Hold for now or accept the proposed states (5 machines) and let B2 decisions inform module attribution later.
- **S7 (B10b backfill):** hold; blocked on M-band.
- **S8 (F1 legacy skill cleanup):** hold; blocked on M-band.
- **H1 (4 APQC tags, 1 defer, 1 retain):** independent; recommend approve and ship.

**Bucket 2 ("What's your call on each?"):** I will wait for your per-item decision before acting.

- **B2-1 (modularization shape):** decide a, b, or c.
- **B2-2 (capability set):** decide a, b, or c.
- **B2-3 (`business_rules_extracted` rename):** a, b, or c.
- **B2-4 (pattern flags):** per-flag yes/no.
- **B2-5 (`process_variants` config-shape exemption):** a or b.
- **B2-6 (em-dash cleanup in description cells):** a, b, or c.

**Bucket 3 ("Vet via formal Phase 0 vendor research, or eyeball-mode?"):**

- **Vetted route:** spawn a focused Phase 0 subagent over Celonis / Signavio / UiPath / ServiceNow / Microsoft / Skan.ai to produce a tighter entity surface matrix; survivors become Bucket 1 in a follow-up pass.
- **Eyeball route:** name which of B3-1 through B3-8 ring true; named candidates become Bucket 1 immediately (with the caveat that they cannot be loaded until the modules from B2-1 exist).

Highest-leverage cluster if you only pick part of the work: **B3-1, B3-2, B3-3 (the ingestion layer)** is currently entirely invisible to the catalog despite being the operational entry point for every process-mining workflow. Cite the ingestion-side bottleneck as the audit's substrate finding.

### Report-only follow-ups (owed by other domains)

- **B10b backfill on outbound side**, target domain BPA (id 136). PROC-MIN outbound handoffs 740 and 741 carry NULL `target_domain_module_id`; the fix requires BPA modules to exist (BPA is itself pre-modular, see neighbor discovery). Schedule a BPA Phase A + b1 audit; the BPA target-side patches happen there.
- **B10b backfill on outbound side**, target domain WORK-MGMT (id 135). Handoff 742 carries `target_domain_module_id=149` already (WORK-MGMT-TASK-EXEC), so this row is mostly resolved on the target side; the residual NULL is `source_domain_module_id` and routes back to PROC-MIN once modules ship.
- **B10b backfill on inbound side**, source domain BPA. Handoffs 180 and 783 inbound to PROC-MIN carry NULL `source_domain_module_id` and `target_domain_module_id`. Source-side fix lives on BPA's b1 audit once BPA modules exist; target-side fix lives on PROC-MIN's b1 audit once PROC-MIN modules exist.
- **B8 inbound `data_object_relationships`**, owed by BPA (`business_process_models` -> PROC-MIN masters direction) and by BPA for `process_simulation_runs` -> PROC-MIN comparison flow. Source domain BPA's B8 owes these; PROC-MIN does not author them.
- **Possible TASK-MINING domain promotion**, owed by orchestrator triage of the queue file. Not PROC-MIN's responsibility to load, but PROC-MIN's modularization shape depends on whether task mining ends up inside PROC-MIN (as `PROC-MIN-TASK-MINING` module) or hived off as a separate domain.
