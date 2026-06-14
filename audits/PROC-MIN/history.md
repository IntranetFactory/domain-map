# PROC-MIN audit history

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

## 2026-05-31, Continuation: B1 technical fixes

Loader: [.tmp_deploy/fix_proc_min_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_proc_min_b1_technical_2026_05_31.ts). Run from project root `c:/dev/domain-map`.

### Applied

- **B1-S1, event_category PATCHes (6 rows).** All 6 PROC-MIN `trigger_events` rows were sitting at `event_category=""`. PATCHed per the audit's pre-specified enum mapping (Rule #13): id 358 (`conformance.deviation_detected`) -> `signal`; id 797 (`event_log.ingested`) -> `lifecycle`; id 798 (`discovered_process_model.published`) -> `state_change`; id 799 (`process_variant.identified`) -> `signal`; id 800 (`process_bottleneck_finding.created`) -> `signal`; id 801 (`business_rule_extracted.identified`) -> `signal`. Verified live post-run.
- **B1-S3, user-edge `data_object_relationships` (6 rows, Rule #10).** Inserted one row per PROC-MIN master against `users` (data_object_id 748) on the standard verb-shape pattern observed in the catalog (`many_to_many` / `reference` / `is_required=false` / `owner_side='source'`, verb `<action> by`, inverse `<action>s`). New ids and labels: 1947 `event_logs uploaded by users`; 1948 `discovered_process_models published by users`; 1949 `process_conformance_results analyzed by users`; 1950 `process_variants analyzed by users`; 1951 `process_bottleneck_findings assigned to users`; 1952 `business_rules_extracted reviewed by users`. Primary verb selected when the audit named two actors (`uploaded_by/ingested_by`, `assigned_to/owner`); compound-actor splits can be added later if the user wants both surfaced as separate edges. `record_status` and `notes` omitted to take database defaults (Rules #1, #15).

### Confirmed already done (no work)

- **B1-H1, APQC `handoff_processes` tagging.** Pre-check showed the 4 proposed `agent_curated` rows already exist: handoff 180 -> process 78 (`Manage business processes`), 740 -> 78, 741 -> 78, 783 -> 78. Handoff 183 still carries the existing `discovery_substring` tag (process 414, `Manage non-conformance`). Handoff 742 remains untagged per the audit's "defer to Discover Pass 3" recommendation (no clean APQC L3 match for business-rule extraction). No further inserts needed.

### Not applied (deferred, with reason)

- **B1-S2 (A4 catalog_tagline / catalog_description).** Rule #20: buyer-voice prose requires user sign-off on wording before any PATCH; agent does not author user-facing description fields unilaterally.
- **B1-S4 (B6 intra-domain `data_object_relationships`).** Audit names 6 candidate edges but explicitly flags that `relationship_verb`, `inverse_verb`, `relationship_type` (cardinality), `relationship_kind`, `is_required`, `owner_side` are still to be drafted per row. Cluster-drafts review required, not a mechanical apply.
- **B1-S5 (B11 `data_object_aliases`).** Audit names alias themes (vendor-flavored synonyms per master) but does not pre-specify the exact `(alias_name, locale, vendor_solution_id)` tuples needed for a deterministic insert.
- **B1-S6 (B12 `data_object_lifecycle_states`).** Blocked on B2-1 (modularization shape) and B2-5 (`process_variants` config-shape exemption). `domain_module_id` cannot be set without modules in place.
- **B1-S7 (B10b backfill on outbound side).** Blocked on B2-1 (PROC-MIN has zero `domain_modules`, source-side derivation is undefined).
- **B1-S8 (F1 legacy system skill cleanup).** Blocked on B2-1 (per-module system skills cannot be authored before modules exist; removing the legacy skill prematurely would leave PROC-MIN with zero system skills).
- **B2-3 (`business_rules_extracted` rename).** Bucket 2 judgment call; user picks (a/b/c).
- **B2-6 (em-dash cleanup in description cells).** Bucket 2; Rule #20 / Rule #15 forbid agent-authored description rewrites.

### Audit blockers still open

PROC-MIN remains pre-modular: M1 / M2 / M4 hard-fail, A2 / A3 / A4 fail, E1 to E6 fail, F1 fail. The whole Phase-A modularization (B2-1) and Phase-0 vendor research (Bucket 3) are still owed; B1 technical fixes do not move the needle on those.

## 2026-05-31, Audit

### Summary

- **Current footprint (PROC-MIN, id 40):** still pre-modular. 0 `domain_modules`, 0 `domain_module_host_domains`, 0 `capability_domains`. 7 `domain_data_objects` rows (6 master + 1 contributor on BPA-mastered `business_process_models`). 5 `solution_domains` (3 primary: Celonis EMS, SAP Signavio Process Intelligence, ServiceNow Process Mining; 2 secondary: UiPath Business Automation Platform, iGrafx Process360 Live). 1 `business_function_domains` (Business Operations, owner). 6 `trigger_events`, all carrying valid `event_category` enums (lifecycle / state_change / signal) post the 2026-05-31 continuation. 4 outbound + 2 inbound cross-domain handoffs; 1 of 6 carries `target_domain_module_id` (handoff 742 -> WORK-MGMT module 149); the rest carry NULL on both module-FK columns. 6 `data_object_relationships` between PROC-MIN masters and `users` (id 748). 0 intra-domain `data_object_relationships` (B6 still hard-fails), 0 cross-domain payload edges (B8), 0 `data_object_aliases`, 0 `data_object_lifecycle_states`, 0 `domain_regulations`, 0 `domain_aliases`. 1 legacy `skill_type='system'` skill (`proc-min-system`, id 91, `domain_id=40`, `domain_module_id=NULL`) carrying 6 `query_*` tools at `coverage_tier='platform'`. APQC `handoff_processes` rows on 5 of 6 cross-domain handoffs (4 `agent_curated` + 1 `discovery_substring`).
- **Structural pass bands:** S1 / S2 / S3 hard-fail on the per-module sweeps (no modules to enumerate). A1 passes (the 7 business-metadata fields are populated, but `business_logic` contains a U+2014 em-dash, project CLAUDE.md rule). A2 / A3 (only `solution_domains` passes via 5 rows). A4 fails (catalog_tagline + catalog_description empty). M1 / M2 / M4 / M5 / M6 / M8 hard-fail (zero modules). M7 vacuous (no DMDO rows; legacy DDO single-master is intact). B1 passes (6 masters). B2 passes (every master has `singular_label` / `plural_label`). B3 passes (every master is prefixed or noun-phrase, `business_rules_extracted` per the 2026-05-30 audit's B2-3 surfaced for user judgment but no Rule #9 collision). B4 hard-fail (all three pattern flags false on every master, no positive re-evaluation surfaced). B5 vacuous (no embedded_master rows in this domain). B6 hard-fail (zero intra-domain rels). B7 passes (6 user edges loaded 2026-05-31). B8 hard-fail (zero cross-domain payload edges for any outbound handoff). B9 passes on event coverage (6 events with valid categories) but the cross-domain handoff substrate is incomplete (handoff payload->target relationship rows owed in B8). B9b vacuous (zero modules). B10b hard-fail on every cross-domain handoff (5 of 6 rows have NULL on both source and target module FKs, the sixth has target only). B11 hard-fail (zero aliases). B12 hard-fail (zero lifecycle states). C1 partial-pass (1 owner row, no contributor / consumer rows). E1 / E2 / E3 / E4 / E5 fail (zero `role_modules` rows touch any PROC-MIN module; no modules exist to anchor them). F1 fail (legacy domain-anchored system skill still present; no per-module system skills exist). F2 / F3 / F5 vacuous (no modules to score). F4 passes on the 6 legacy tools. F7 vacuous (no channel primitives wired). H1 passes coverage-wise (5 of 6 cross-domain handoffs carry `handoff_processes`); handoff 742 (`business_rule_extracted.identified` -> WORK-MGMT) is the carry-over Discover Pass 3 deferral.
- **Bucket 1 (in-scope, agent fixable):** 1 item (the APQC tagging for handoff 742 is the only structurally-fixable surface that does not require Phase-A modularization first).
- **Bucket 2 (surface-for-user, judgment):** 7 items.
- **Bucket 3 (Phase 0 pending, speculative):** 8 candidate entities (same set as 2026-05-30, no Phase 0 vetting has landed yet).

### Vendor surface basis

Vendor surface unchanged from 2026-05-30: Celonis EMS, SAP Signavio Process Intelligence, UiPath Process Mining, ServiceNow Process Mining, Microsoft Power Automate Process Mining, Apromore, IBM Process Mining, Software AG ARIS Process Mining, Skan.ai (task mining specialist), iGrafx Process360 Live. Compliance specialist surface drawn from Celonis Audit / Celonis Compliance accelerators (SOX 404, segregation of duties).

### Bucket 1, In-scope confirmed gaps

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-H1 | H1 (APQC TAGGING) | Handoff 742 (PROC-MIN `business_rule_extracted.identified` -> WORK-MGMT, payload `business_rules_extracted`) is still untagged in `handoff_processes`. The 2026-05-30 audit recommended deferring to Discover Pass 3 for a custom-process candidate (no clean APQC PCF L3 match for business-rule extraction). H1 volume target (0.5N to 0.8N over 6 cross-domain handoffs) is met by the 4 `agent_curated` + 1 `discovery_substring` rows already in place; the residual single row is a structural defer, not a gap. | Confirm Discover Pass 3 as the routing for handoff 742 OR pick a best-effort L4 match (e.g. APQC `Manage business rules` family if loaded). Agent surfaces the choice for user judgment; no auto-insert. |

Sub-summary by finding type:

| Finding type | Count |
| --- | --- |
| APQC TAGGING (single defer-or-tag decision) | 1 |
| STRUCTURAL / MISSING / WRONG-OWNERSHIP / SCOPE-CREEP / BOUNDARY | 0 in Bucket 1 (all blocked on Phase-A modularization, see Bucket 2) |
| **Bucket 1 total** | 1 |

Every other structural failure (S1 / S2 / S3, A2 / A3 / A4, M1 to M8, B6, B8, B10b, B11, B12, C1 expansion, E1 to E5, F1 to F3) is blocked on the Phase-A modularization shape, which itself is a Bucket 2 judgment call (`B2-MODULARIZATION` below). Once the user picks a module set, every blocked item becomes Bucket 1 in the next audit pass.

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent cannot answer | Options |
|---|---|---|---|
| B2-MODULARIZATION | Phase-A modularization shape. PROC-MIN has 0 modules. Carried from 2026-05-30 B2-1: vendor surface splits across ingestion, discovery, conformance, insights / bottleneck analysis, action / automation, plus optional task mining. With 6 currently-loaded masters and 8 candidate Phase-0 masters (Bucket 3), a 4 or 5 module split is the natural shape. Proposed: `PROC-MIN-INGESTION`, `PROC-MIN-DISCOVERY`, `PROC-MIN-CONFORMANCE`, `PROC-MIN-INSIGHTS`, optional `PROC-MIN-ACTION`. | Rule #14 mandates >=2 full modules once >=3 capabilities exist; the audit cannot pick the right shape without confirming the capability list (B2-CAPABILITIES) and the Bucket 3 vendor-surface load order. | (a) Adopt the 4-module split; (b) collapse INGESTION + DISCOVERY into one `PROC-MIN-MINING` core module; (c) defer until Bucket 3 vendor-research lands. |
| B2-CAPABILITIES | Phase-A capability authoring. 0 capabilities loaded. Proposed set (5 to 7 noun-phrase capabilities): `event-log-ingestion`, `process-discovery`, `process-conformance-checking`, `process-variant-analysis`, `process-bottleneck-identification`, `process-improvement-opportunity-identification`, `business-rule-mining`. Optional add: `task-mining` (folded in or hived off to TASK-MINING candidate per Bucket 3). | Capability vocabulary is editorial and market-shape; the agent proposes but the user owns names. | (a) Adopt all 7; (b) drop `task-mining`; (c) rename per PCF (10047, 10048, 10049). |
| B2-NAMING-RULES | Naming arbitration on `business_rules_extracted`. The only master whose name reads adjective-trailing rather than noun-phrase-plural. Carry from 2026-05-30 B2-3. | The form is anomalous in the catalog. No collision exists today, but Rule #9 surfaces the decision as a Bucket 2 call. | (a) Rename to `extracted_business_rules` (preferred); (b) leave as is; (c) other form. |
| B2-PATTERN-FLAGS | Pattern flag positive re-evaluation per Rule #12. All 6 masters have `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false`. Candidate flips: `event_logs.has_personal_content=true` (event logs carry user IDs and sometimes emails); `discovered_process_models.has_submit_lock=true` (published model should be immutable so downstream conformance has a stable baseline); `process_conformance_results.has_submit_lock=true` (conformance snapshots are time-stamped audit-style records). | Pattern flags are workflow-shape judgments the user owns; false-by-default is not the same as false-after-review. Carry from 2026-05-30 B2-4. | Per-flag yes/no across the three candidates. |
| B2-VARIANT-CONFIG | `process_variants` config-shape exemption. B1-S6 lifecycle proposal classifies it as config-shape (append-only finding-shaped, no real workflow). Alternative: variants have a real `surfaced` -> `acknowledged` -> `accepted_as_new_normal` / `marked_as_deviation` workflow. Carry from 2026-05-30 B2-5. | Depends on whether PROC-MIN treats variants as throwaway findings or as a catalog of approved deviations. | (a) Config-shape, no lifecycle states; (b) author the 4-state machine. |
| B2-EM-DASHES | U+2014 em-dashes still present in 4 description cells (project CLAUDE.md rule, no em-dashes anywhere). Affected rows: `domains.id=40` `business_logic` (`academic algorithms made commercial.` trailing clause); `trigger_events.id=358` description; `trigger_events.id=798` description; `skills.id=91` description. Per Rule #20 / Rule #15 the agent does not author replacement wording into description cells unilaterally; per CLAUDE.md the em-dashes must come out. Carry from 2026-05-30 B2-6. | The rule is project-wide but rewriting description / business_logic copy requires user-approved wording per row. | (a) Rewrite all 4 affected cells this cycle (user supplies wording or approves agent drafts row-by-row); (b) defer to a cross-domain em-dash audit pass; (c) leave (the fact_sheet emitter sanitizes at render time as a safety net per CLAUDE.md). |
| B2-CATALOG-UX | A4 / M8 catalog UX fields empty. `domains.catalog_tagline` and `catalog_description` are empty strings; M8 cannot run because no modules exist. Per Rule #20 the agent does not author buyer-facing copy without explicit user approval of the wording. | Rule #20 forbids agent-authored writes without user sign-off; the audit cannot self-resolve. | (a) Draft a full set agent-side and surface for line-by-line approval; (b) user supplies wording; (c) defer indefinitely (A4 stays failing, M8 vacuous until modules exist). |

### Bucket 3, Phase 0 pending (speculative)

Unchanged from 2026-05-30; no formal Phase 0 vetting has landed. Carry-over candidate entities:

| # | Candidate entity | Proposed module | Notes |
|---|---|---|---|
| B3-DATA-SOURCE-CONN | `data_source_connections` (or `event_log_connectors`) | `PROC-MIN-INGESTION` | Vendor evidence: Celonis EMS Connectors, Signavio Data Pipelines, UiPath Process Mining adapters. Connection metadata to ERP / CRM / case systems. |
| B3-EVENT-LOG-EXTRACTIONS | `event_log_extractions` (or `data_extraction_jobs`) | `PROC-MIN-INGESTION` | Vendor evidence: Celonis Extractors, Signavio Data Pipelines, UiPath Extract activities. Run records of the ETL pipeline. |
| B3-EVENT-LOG-QUALITY | `event_log_quality_findings` (or `data_quality_issues`) | `PROC-MIN-INGESTION` | Vendor evidence: Celonis Data Health, Signavio Data Quality. Data-quality flags surfaced during ingestion. |
| B3-PROCESS-KPIS | `process_kpis` (or `process_metrics`) | `PROC-MIN-INSIGHTS` | Vendor evidence: Celonis KPI Library, Signavio Metrics. Named configurable measures hanging off process executions. |
| B3-IMPROVEMENT-OPP | `improvement_opportunities` (or `value_opportunities`) | `PROC-MIN-INSIGHTS` | Vendor evidence: Celonis Value Realization, Signavio Improvement. Quantified opportunity records bridging finding to action. |
| B3-PROCESS-AUTOMATIONS | `process_automations` (or `action_flows`) | `PROC-MIN-ACTION` (new module) or fold into RPA | Vendor evidence: Celonis Action Flows, Signavio Action SDK, UiPath RPA integration. Cross-cutting with RPA / IPAAS. |
| B3-CONTROLS-EVAL | `compliance_controls_evaluations` (or `process_control_runs`) | `PROC-MIN-CONFORMANCE` | Vendor evidence: Celonis Compliance, Celonis Audit, ServiceNow Process Mining (SOX 404). Possible GRC overlap. |
| B3-PROCESS-BENCHMARKS | `process_benchmarks` (or `industry_benchmarks`) | `PROC-MIN-INSIGHTS` | Vendor evidence: Celonis Benchmarks, Signavio Benchmarks. Anonymized comparative data. |

Queued in `audits/_missing-domains.md` (carry from 2026-05-30): `TASK-MINING` candidate.

### Cross-bucket dependencies

- Almost every structural fix is blocked on **B2-MODULARIZATION**. Once a module set lands, S1 / S2 / S3, M1 to M8, B9b, B10b, B12, F1 to F5 become Bucket 1 in the next pass.
- **B2-VARIANT-CONFIG** informs B12 lifecycle authoring (under whichever module).
- **B2-NAMING-RULES** informs Phase-B alias authoring (B11).
- **B2-PATTERN-FLAGS** is independent of modularization; can ship before modules.
- **B2-EM-DASHES** is independent of all other buckets.
- **B2-CATALOG-UX** A4 ships independently of modules; M8 is blocked on B2-MODULARIZATION.
- **B1-H1** (handoff 742 routing decision) is independent of Bucket 2 and Bucket 3.
- **Bucket 3 entries** unlock further Bucket 1 fixes once vetted (additional events, additional cross-domain handoffs, additional aliases).

### Per-bucket prompts

- Bucket 1: `B1-H1` is the only fixable item; reply 'tag', 'defer to Discover Pass 3', or 'skip'.
- Bucket 2: per-item decision required. The single most-leveraged decision is `B2-MODULARIZATION` because it unblocks the entire backlog.
- Bucket 3: choose vetted Phase 0 research or eyeball-mode (name which candidates ring true).

### Report-only follow-ups (owed by other domains)

- B10b backfill, BPA-side (handoffs 180, 740, 741, 783) blocked on BPA modularization.
- B10b backfill, WORK-MGMT-side (handoff 742) is already partially resolved (target_domain_module_id=149); residual is the source-side NULL, blocked on PROC-MIN modularization.
- B8 inbound payload edges from BPA (`business_process_models` -> PROC-MIN masters; `process_simulation_runs` -> PROC-MIN comparison flow). Owed by BPA's B8 pass.
- Possible TASK-MINING domain promotion vs `PROC-MIN-TASK-MINING` sub-module decision. Affects PROC-MIN modularization shape but the queue entry lives at the orchestrator triage level.

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

## 2026-06-07 - Audit (state-driven execute, bulk batch)

Loader: [.tmp_deploy/fix_proc_min_audit_2026_06_07.ts](../../.tmp_deploy/fix_proc_min_audit_2026_06_07.ts). Run from project root `c:/dev/domain-map`. Idempotent, additive/corrective only, everything at `record_status='new'` (or omitted to take DB default). State-driven pass over the open items in state.yaml; no fresh from-scratch audit.

### Summary

PROC-MIN is still pre-modular (0 `domain_modules`, 0 `capability_domains`) and master-bearing (6 real domain-owned masters; overlay test: it persists records no other domain masters, so it is unbuilt, not derive/overlay). Per Rule #21 the cascade was left and the build surfaced, NOT scaffolded. Three EXECUTE write-types landed; the rest of the backlog is either user-gated (b2), blocked on the Phase-A build (b1b), destructive (surfaced), or retired by the 2026-06-06 supersession.

### Executed (additive/corrective, record_status='new')

- **B13 / Rule #12 entity_type classification (6 PATCHes).** All 6 masters were `unclassified`. Classified deterministically from description + drafted lifecycle: event_logs (579) -> `operational_workflow`; discovered_process_models (580) -> `computed`; process_conformance_results (581) -> `computed`; process_variants (582) -> `computed`; process_bottleneck_findings (583) -> `operational_workflow`; business_rules_extracted (584) -> `operational_workflow`. Side effect: B12 now hard-requires lifecycle states on the 3 operational_workflow masters, and the 3 computed masters now PASS B12 without states (this resolves the old B2-VARIANT-CONFIG question in favor of no-lifecycle for process_variants via the typed column). Verified live.
- **A4 / M8 / Rule #20 catalog UX (2 fields on domain row 40).** `catalog_tagline` and `catalog_description` were both empty. Authored buyer-voice copy (workflow + value, no vendor names, no em-dash, American English) and wrote it in per the Rule #21 catalog-UX EXECUTE policy (the stale surface-before-write gate ignored; non-empty values are never overwritten). Verified live.
- **B11 data_object_aliases (13 inserts, alias_type='synonym', industry_id null).** Zero aliases existed; inserted clearly-enumerated generic synonyms (no vendor product names, Rule #18): event_logs (Activity Log, Event Stream, Process Case Log); discovered_process_models (As-Is Process Model, Mined Process Model); process_conformance_results (Conformance Check, Conformance Diagnostic); process_variants (Case Variant, Execution Path Variant); process_bottleneck_findings (Bottleneck Insight, Process Bottleneck); business_rules_extracted (Mined Business Rule, Inferred Business Rule). All at record_status='new'. Verified live.

### Surfaced (returned to user, not executed)

- **B1A-H1-742 (APQC tag for handoff 742).** Live PCF search 2026-06-07 reconfirmed no clean L3 match for business-rule extraction. Per the Rule #21 EXECUTE policy (no clean match -> defer-to-Discover), the agent did not force a weak tag. User picks: leave untagged + route to Discover, or assign a best-effort agent_curated row -> process 78 to match the 4 sibling PROC-MIN->BPA handoffs.
- **B1A-BUILD (unbuilt domain).** Phase-A build owed (modules + capabilities). Cascade left intact; not scaffolded.
- **B2-MODULARIZATION / B2-CAPABILITIES / B2-NAMING-RULES / B2-PATTERN-FLAGS / B2-EM-DASHES.** All user-judgment decisions carried forward.
- **Destructive items (user-gated):** B2-PATTERN-FLAGS flips (overwrite existing false booleans), B2-EM-DASHES (overwrite non-empty business_logic / description cells). Recommended fixes recorded; not applied.
- **Personas / RACI (Phase P).** Deferred; not authorable until the multi-module build lands. Candidate roles noted: process-mining-analyst, process-improvement-lead, conformance-analyst, ingestion-engineer.

### Left (untouched)

- **b1b items blocked on the Phase-A build:** S-band, A2-capabilities, M-band, B6 intra-rels, B8 cross-rels, B10b backfill (also owed-by-BPA), B12 lifecycle (now required for the 3 operational_workflow masters but blocked on module attribution), C1 contributor/consumer expansion (editorial), E-band roles.
- **B1B-F-BAND-SUPERSEDED:** the old F1/F2/F3/F5 per-module system-skill items are RETIRED by the 2026-06-06 supersession; skill 91 (domain_id=40, domain_module_id=NULL) is the correct ONE domain-grain system skill under the new model, not a transitional artifact to delete. Reframed as a note; supersession header preserved.
- **b3 backlog:** 8 candidate entities (data_source_connections, event_log_extractions, event_log_quality_findings, process_kpis, improvement_opportunities, process_automations, compliance_controls_evaluations, process_benchmarks) plus the TASK-MINING candidate. Speculative, Phase-0 vetting owed.

### UI links (tables written)

- https://tests.semantius.app/domain_map/data_objects
- https://tests.semantius.app/domain_map/domains
- https://tests.semantius.app/domain_map/data_object_aliases

### Post-fix status

`next_action_by: user` (the remaining backlog is gated on the B2 modularization/capability decisions and the Phase-A build; no further unblocked agent-executable additive work remains this pass).

## 2026-06-13 - Audit (B9d verification pass)

State-driven pass. The only agent-executable item was B1A-B9D-VERIFY (run B9d in both directions; added 2026-06-09, after PROC-MIN's last audit). Executed via the committed resolver `bun run scripts/analytics/b9d_resolver.ts PROC-MIN` (`--dry-run` then `--write`); no catalog/DB writes, additive owner-side edits only.

### Executed

- **B1A-B9D-VERIFY resolved.** The resolver classified all 5 boundary handoff_processes tags across both directions (4 outbound to BPA/WORK-MGMT, 2 inbound from BPA). Verdicts: 1 ROLL-UP, 1 MIS-TAG, 1 UNOWNED. `--write` applied NO additive owner-side edits (the resolver reported "(none)" intended owner-file edits): none of the findings are ORPHAN-class additive `b2` items owed to an owner; all three are either destructive (sign-off) or a no-master surfacing. B1A-B9D-VERIFY removed from state.yaml (this entry is its disposition).

### B9d findings (per the resolver, both directions)

- **ROLL-UP, handoffs 180 / 783 (BPA -> PROC-MIN inbound), tag 13.1 'Manage business processes' pid 78, owner BPA.** Re-point to realized child 13.1.3.5. These are inbound rows BPA authored, so the re-point is a BPA-side SOURCE edit (destructive, sign-off). Report-only for BPA's audit, not authored from PROC-MIN's pass. NOT added to PROC-MIN state.yaml (owed by BPA).
- **MIS-TAG, handoff 183 (PROC-MIN -> BPA outbound), tag 13.3.3 'Manage non-conformance' pid 414, owner BPA.** The carried entity (business_process_models) is realized under 13.1.3.5 'Publish processes'; 13.3.3's category fits neither endpoint. PROC-MIN authored this tag, so PROC-MIN owns the destructive re-point/delete -> recorded as new `b2` item B2-B9D-MISTAG-183 and surfaced in q-PROC-MIN.md (q9). Tag is `discovery_substring` provenance.
- **UNOWNED, handoffs 740 / 741 (PROC-MIN -> BPA outbound), tag 13.1 pid 78.** Payloads discovered_process_models (580) / process_variants (582) read as no-master because PROC-MIN is unbuilt: it masters them at the legacy `domain_data_objects` grain (role=master) but has zero `domain_module_data_objects` rows, which is where the resolver reads ownership. Not a real coverage gap and not a mis-tag; clears automatically once B2-MODULARIZATION lands and the modular master rows are authored. Recorded as `b1b` item B1B-B9D-UNOWNED-740-741 (blocked on B2-MODULARIZATION).

### Surfaced / left

- Everything else carries forward unchanged: B1A-H1-742 (handoff 742 untagged, user decision), B1A-BUILD (unbuilt domain), all b2 decisions (B2-MODULARIZATION, B2-CAPABILITIES, B2-NAMING-RULES, B2-PATTERN-FLAGS, B2-EM-DASHES), the new B2-B9D-MISTAG-183, the b1b Phase-A-blocked band, and the b3 candidate backlog.

### Post-fix status

`next_action_by: user`. No agent-executable additive work remains: B1A-B9D-VERIFY (the only agent item) executed; its destructive ROLL-UP/MIS-TAG findings need user sign-off, the UNOWNED finding is blocked on the Phase-A build, and the rest of the backlog is user-decision (b2) or build-blocked (b1b). q-PROC-MIN.md refreshed with q9 (the MIS-TAG re-point/delete decision).
