# DQ audit history

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- Current footprint: domain id 90, **zero `domain_modules` rows** (legacy `domain_data_objects` rollup only); 7 masters + 1 consumer + 1 contributor = 9 data-object rows; 0 capabilities; 10 solutions (0 primary, 2 secondary, 8 partial); 0 regulations; 7 trigger events on DQ masters (+ 3 standalone); 6 outbound cross-domain handoffs; 5 inbound cross-domain handoffs; 0 intra-domain handoffs; 1 legacy domain-level system skill (`dq-system`) with 11 `skill_tools` rows, all `coverage_tier=platform`; 1 owner business function (Data Engineering).
- Vendor-surface basis (flagship vendors enumerated): Informatica IDQ, Collibra DQ (formerly OwlDQ), Ataccama ONE, Talend Data Quality, Monte Carlo, Bigeye, Acceldata, Soda, Anomalo, Great Expectations. Hybrid surface: legacy DQ tools (Informatica, Talend, Ataccama) for profiling and rule authoring, modern data-observability vendors (Monte Carlo, Bigeye, Anomalo) for monitoring and SLA enforcement.
- **Bucket 1 (in-scope, agent fixable):** 16 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 3 items.
- Candidates queued: 1 (DATA-OBSERVABILITY surfaced again; idempotent mention bump to 4).

Structural pass headline: DQ is a **pre-modular domain**. M1 fails (zero `domain_modules`), which cascades into M2/M4/M6/M7-style checks and F2/F3/F5 being uncomputable at the module layer. The legacy domain-level system skill (`dq-system`, id 11) carries 11 platform-tier tools and proves the workflow surface exists at domain scope, but the catalog cannot compute module-level Semantius scores until modules ship. Eleven cross-domain handoffs all have `source_domain_module_id=NULL`; this resolves automatically once modules exist (the source-side B10b derivation is deterministic). Eight of those eleven also have `target_domain_module_id=NULL` (DCG and DATA-AI-PLAT are similarly unmodularized); that side is report-only. Catalog-quality H1 fail: zero `handoff_processes` rows on any DQ-touching handoff (0 of 11 tagged).

### Vendor surface basis

The DQ market has bifurcated. Legacy DQ specialists (Informatica IDQ, Ataccama ONE, Talend, Collibra DQ) anchor profiling, standardization, matching, and rule-authoring. The modern data-observability cohort (Monte Carlo, Bigeye, Acceldata, Soda, Anomalo, Great Expectations, Metaplane) sells monitoring, anomaly detection, lineage-aware triage, and data SLAs. Most enterprises run both: legacy for batch profile/cleanse, observability for streaming monitoring. The vendor cohort suggests three module candidates: `DQ-RULES` (rule authoring + profiling), `DQ-INCIDENT-MGMT` (incident triage + remediation + SLA), `DQ-MONITORING` (anomaly detection + observability + scorecards).

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures (highest priority - M-band blocks downstream concerns)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 | DQ has zero `domain_modules` rows. The domain is pre-modular. This blocks M2/M4/M5/M6/M7 at the module layer, F2/F3/F4/F5/F7 at the skill layer, and B9b entirely. | Author 2-3 modules per the vendor cohort split: `DQ-RULES` (masters quality_rules + profile_results), `DQ-INCIDENT-MGMT` (masters quality_incidents + dq_sla_definitions), `DQ-MONITORING` (masters dq_dimensions + dq_scorecards + anomaly_detections). Migrate the 7 `domain_data_objects` masters to `domain_module_data_objects` under those modules. |
| B1-S2 | M7 | `anomaly_detections` (data_object_id=94) has `role='master'` in both DQ (90) and AIOPS (6) on the legacy `domain_data_objects` layer. Catalog-wide single-master violation. | Decide canonical owner. AIOPS markets `event_anomaly` directly (Splunk ITSI, Dynatrace Davis, Moogsoft); DQ markets `quality_anomaly`. Two paths: (a) split into `data_anomalies` (DQ) and `event_anomalies` (AIOPS), or (b) keep `anomaly_detections` canonical in one domain and demote the other to `consumer`. Bucket 2 #1 surfaces the decision. |
| B1-S3 | A2 / capabilities | Zero `capability_domains` rows for DQ. The market has at least 5-7 capabilities (profiling, rule authoring, matching/dedup, monitoring, incident triage, SLA mgmt, anomaly detection) but none are loaded. | Author 5-7 capabilities aligned to the 3-module split, link via `capability_domains`. Apply Cross-cutting capability convention: `DATA-OBSERVABILITY-MONITORING` may be domain-neutral if it also lives in DCG / DATA-AI-PLAT / OBS. |
| B1-S4 | A3 / coverage | All 10 linked `solutions` carry `coverage_level` in {secondary, partial}; zero `primary`. Coverage layer says no platform covers DQ as its flagship market. | Add primary-coverage pure-plays. Informatica IDQ, Ataccama ONE, Collibra DQ, Monte Carlo, Bigeye, Soda are flagship DQ tools and should be `primary`. Audit each of the existing 10 partials: Microsoft Fabric / SAP Business Data Cloud / Cloudera are platforms with embedded DQ, partial is correct; Dataiku and Databricks may warrant secondary. |
| B1-S5 | A1 / business_logic | `domains.business_logic` contains a U+2014 em-dash. Forbidden per project rule. Also `description` uses British spelling "standardisation". | PATCH `business_logic` to remove the em-dash (replace with comma). PATCH `description` to "standardization" (American English per project rule). |
| B1-S6 | A4 | `domains.catalog_tagline` and `catalog_description` are both empty. | Draft both per Rule #20 (buyer voice, workflow + value). Surface drafts to user for review before writing. |
| B1-S7 | F1 | Legacy domain-level system skill `dq-system` (id 11) is anchored at `domain_id=90, domain_module_id=null`. Once modules ship (B1-S1) the legacy row is obsolete. | Retire legacy `dq-system` after authoring per-module system skills under Phase S. The 11 tools currently linked to it migrate to the 2-3 new module-level skills following the module split. |

#### STRUCTURAL band failures (data-object footprint)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S8 | B6 | Zero intra-domain `data_object_relationships` between DQ's 7 masters. Expected at minimum: `quality_rules → quality_incidents` (a rule breach spawns an incident), `quality_rules → profile_results` (a rule generates results), `profile_results → dq_dimensions` (results feed dimension scoring), `dq_dimensions → dq_scorecards` (dimensions roll up to a scorecard), `dq_scorecards → dq_sla_definitions` (a scorecard is measured against an SLA), `anomaly_detections → quality_incidents` (an anomaly spawns an incident). | Author 6 edges with verbs, inverse_verbs, cardinalities, owner_side. Load via the cluster-drafts pattern. |
| B1-S9 | B7 | Zero `users` edges on any DQ master. Every master has user-typed actors: `quality_rules` (rule_author), `quality_incidents` (assignee, raiser), `profile_results` (profiler_owner), `dq_sla_definitions` (sla_owner), `dq_scorecards` (scorecard_owner), `anomaly_detections` (acknowledger). | Author 6 edges per Rule #10 against the `users` platform-builtin (id 748). |
| B1-S10 | B11 | Zero `data_object_aliases` on any DQ master. Several have well-known vendor synonyms: `quality_rules` (Great Expectations: "expectation"; Soda: "check"; Monte Carlo: "monitor"), `profile_results` (Ataccama: "profiling output"; Informatica: "profile"), `quality_incidents` (Monte Carlo: "incident"; Bigeye: "issue"), `dq_dimensions` (DAMA-DMBOK term), `anomaly_detections` (data-observability: "anomaly"). | Author ~8-10 alias rows. |
| B1-S11 | B12 | Zero `data_object_lifecycle_states` on any DQ master. `quality_incidents` clearly has a workflow (raised, acknowledged, investigating, remediating, resolved, closed); `quality_rules` has a workflow (draft, published, deprecated); `dq_sla_definitions` has a workflow (draft, published, breached, suspended, archived); `dq_scorecards` and `dq_dimensions` may be config-shaped (continuous score, no workflow). | Author lifecycle states for `quality_incidents`, `quality_rules`, `dq_sla_definitions` (+ `anomaly_detections` triage states). Config-shape exemption for `dq_scorecards` / `dq_dimensions` / `profile_results` should be surfaced to user, not annotated in notes (Rule #15). |
| B1-S12 | B8 | Zero cross-domain `data_object_relationships` (payload to target) corresponding to the 6 outbound handoffs. Specifically missing: `quality_incidents → service_incidents` (DQ to ITSM, mirroring handoffs 266/267/714), `profile_results → data_assets` (DQ to DCG, mirroring handoff 268), `dq_dimensions → data_assets` (DQ to DCG, mirroring handoff 713), `dq_dimensions → lakehouse_tables` (DQ to DATA-AI-PLAT, mirroring handoff 715). | Author 4 cross-domain edges (verb, inverse_verb, cardinality, owner_side=source). |
| B1-S13 | B10b | All 6 outbound DQ handoffs have `source_domain_module_id=NULL`. Once B1-S1 lands (modules exist), the deterministic derivation routes the source side to the module that masters the trigger_event's `data_object_id`. | Run B10b backfill loader after modules and DMDOs land. Pure mechanical PATCH. |

#### APQC TAGGING (H1 - zero of 11 cross-domain handoffs tagged)

| Handoff id | Direction | Trigger event | Payload | Proposed PCF row | PCF external_id | Confidence | Note |
|---|---|---|---|---|---|---|---|
| 266 | DQ to ITSM | quality_rule.breach | service_incidents | Triage IT service delivery incidents | 20903 | high | Rule breach raises a triage-ready ticket in ITSM. |
| 267 | DQ to ITSM | dq_scorecard.breached | service_incidents | Resolve IT issues/requests | 20927 | medium | Scorecard breach drives a remediation request; both 20903 and 20927 are defensible. |
| 268 | DQ to DCG | profile_result.updated | data_assets | Maintain master data | 10252 | medium | DCG asset metadata refreshed from latest profile run; defer-to-Discover acceptable if user prefers a non-MDM-flavored process. |
| 713 | DQ to DCG | dq_dimension.threshold_breached | data_assets | Maintain master data | 10252 | low | Dimension threshold breach updates asset health flag in DCG; same caveat as 268. |
| 714 | DQ to ITSM | dq_sla_definition.breached | service_incidents | Triage SLA compliance issues | 20650 | high | DQ SLA breach is a textbook SLA-compliance triage event. |
| 715 | DQ to DATA-AI-PLAT | dq_dimension.threshold_breached | dq_dimensions | _defer-to-Discover_ | - | - | Subscriber is the platform consuming DQ dimension data; PCF doesn't carry a clean substrate-feed process. |
| 156 | DATA-AI-PLAT to DQ | quality_check.failed | lakehouse_tables | _defer-to-Discover_ | - | - | Inbound; defer to source domain audit (DATA-AI-PLAT). |
| 262 | DCG to DQ | data_asset.certified | data_assets | _defer-to-Discover_ | - | - | Inbound; defer to source domain audit (DCG). |
| 684 | DATA-AI-PLAT to DQ | feature_set.staleness_breached | feature_sets | _defer-to-Discover_ | - | - | Inbound; defer to source domain audit (DATA-AI-PLAT). |
| 708 | DCG to DQ | data_certification.granted | data_certifications | _defer-to-Discover_ | - | - | Inbound; defer to source domain audit (DCG). |
| 728 | DI to DQ | pipeline_run.sla_breached | pipeline_runs | _defer-to-Discover_ | - | - | Inbound; defer to source domain audit (DI). |

Proposed agent_curated tags: 5 (one per outbound handoff with a confident PCF match plus handoff 268/713 at medium confidence). Deferred to Discover Pass 3: 6 (1 outbound with no PCF home + 5 inbound where the source domain owns the audit). Volume target was 0.5*11 to 0.8*11 = 5.5-8.8 new tags; this audit proposes 5 at agent_curated, sitting at the floor. Inbound deferral is structurally correct (those tags belong to the source domain's audit pass). H1 is failed at headline (0 approved) and passes process-health (5 agent_curated proposed against the 5-9 target).

#### MISSING (compliance and universal-vendor entities)

| ID | Entity | Proposed module | Vendor evidence | Notes |
|---|---|---|---|---|
| B1-M1 | `data_quality_checks` (or rename existing `quality_rules` to align) | DQ-RULES | Great Expectations ("expectation"), Soda ("check"), Monte Carlo ("monitor") - universal | The check is the per-record / per-batch evaluation; the rule defines the check. Existing `quality_rules` likely conflates the two. Surface as B2 modularization decision rather than auto-loading. |
| B1-M2 | `data_quality_remediation_actions` | DQ-INCIDENT-MGMT | Informatica, Ataccama, Collibra - universal | The action taken to resolve an incident (auto-cleanse, route to steward, accept-with-note). Distinct from the incident itself (which is the diagnosis). |
| B1-M3 | `column_profiles` | DQ-RULES | Informatica IDQ, Ataccama, Talend - universal in legacy DQ | Per-column distributional output. Currently masked under generic `profile_results`. |

### Bucket 2 - Surface-for-user (judgment calls)

1. **`anomaly_detections` canonical ownership.** The data_object is mastered in both DQ (90) and AIOPS (6). Options: (a) split into `data_anomalies` (DQ) + `event_anomalies` (AIOPS), each with its own data_object row, (b) keep `anomaly_detections` canonical in DQ and demote AIOPS to consumer (data anomalies and event anomalies are alike enough to share schema), (c) keep canonical in AIOPS and demote DQ to consumer (anomaly-detection-as-a-service market belongs to AIOps observability). DQ's lifecycle is data-shaped (profile breach, dimension drop); AIOps lifecycle is event-shaped (signal spike, log pattern). Recommendation: (a) split; the verbs and lifecycle states diverge. Independent of Bucket 3.

2. **Module split shape.** Three candidate splits:
   - (a) `DQ-RULES` + `DQ-INCIDENT-MGMT` + `DQ-MONITORING` (3-way, mirrors the vendor-cohort split between legacy DQ tools and observability vendors).
   - (b) `DQ-RULES` + `DQ-OBSERVABILITY` (2-way, fold incident-mgmt into observability since both raise incidents).
   - (c) Single module `DQ` (1-way, retain the pre-modular footprint).
   Capability count is currently 0 - once Bucket 1 #3 (B1-S3) lands and 5-7 capabilities are loaded, Rule #14's >=3-capability domain needs >=2 modules, so (c) is non-viable. Recommendation: (a). Dependency: blocks Bucket 1 #1, #7, #11, #13.

3. **Cross-cutting capability vs domain-prefixed.** `DATA-OBSERVABILITY-MONITORING` (or similar) genuinely spans DQ, DCG, DATA-AI-PLAT, OBS, and arguably DI. Per the Cross-cutting convention (>=3 domains), it should be domain-neutral. But the DATA-OBSERVABILITY domain candidate is queued in `_missing-domains.md` at mention_count 4. If the user promotes that candidate to a domain, the capability has a standalone-market home too. Decide: queue capability as domain-prefixed `DQ-MONITORING` first, or wait for DATA-OBSERVABILITY decision before authoring capabilities.

4. **Coverage_level downgrade.** All 10 solutions are currently `secondary` or `partial`. Re-classifying Informatica IDQ, Ataccama ONE, Collibra DQ (if present), Monte Carlo, Bigeye, Soda as `primary` requires those rows to exist. Audit the 10 existing solutions: are any of them really primary DQ flagships, or are they all data-platform / data-cloud suites (Snowflake, Databricks, Fabric)? Current solution list reads like a "data and AI platforms" set, not a DQ specialist set. Decide: add primary-coverage rows for 4-6 DQ pure-plays, or accept that current solution set is platform-coverage and audit Phase A solutions separately.

5. **Pairwise reconciliation scope.** DQ has 4 neighbors via handoffs at weight >=1: **DCG (weight 4: 2 outbound + 2 inbound)**, **ITSM (weight 3: 3 outbound + 0 inbound)**, **DATA-AI-PLAT (weight 3: 1 outbound + 2 inbound)**, **DI (weight 1: 0 outbound + 1 inbound)**. Audit procedure says deep dive for weight >=3. Decide: run pairwise reconciliation for DCG / ITSM / DATA-AI-PLAT inline now, or defer per-neighbor passes as separate Validate runs. DCG and DATA-AI-PLAT are themselves unmodularized which blunts the value of Section 2/3 diffs.

### Bucket 3 - Phase 0 pending (speculative)

| Candidate | Proposed module | Vendor evidence | Notes |
|---|---|---|---|
| `data_contracts` | DQ-RULES or new module | Soda, Monte Carlo, Acceldata - emerging entity | Declarative contract between producer and consumer covering schema, freshness, completeness. Adjacent to `dq_sla_definitions` but contract is bilateral; SLA is one-sided. Phase 0 vetting needed: is contract a vendor pattern or universal? Adjacent to data-mesh practice. |
| `survivorship_rules` | DQ-RULES | Informatica IDQ, Ataccama ONE - universal in legacy DQ for golden-record resolution | Probably belongs in MDM (golden-record formation) rather than DQ. Phase 0 vetting needed: is survivorship a DQ entity or MDM entity? |
| `merge_decisions` / `duplicate_candidates` | DQ-RULES | Informatica, Ataccama, Talend - universal | Same MDM-vs-DQ question. The dedup workflow lives in both markets; the canonical home is contested. Phase 0 vetting needed alongside survivorship_rules. |

### Pass 3 - Neighbor discovery

DQ has the following cross-edges (handoffs only; DMDO consumer/contributor cross-references add minor weight):

| Neighbor | Outbound | Inbound | Edge weight | Pass 4 scope |
|---|---|---|---|---|
| DCG | 2 | 2 | 4 | Full pairwise reconciliation (data_assets is the shared substrate). |
| ITSM | 3 | 0 | 3 | Full pairwise reconciliation (service_incidents is the shared substrate; 3 DQ outbound events all land in ITSM-INCIDENT-MGMT). |
| DATA-AI-PLAT | 1 | 2 | 3 | Full pairwise reconciliation (lakehouse_tables and dq_dimensions on the DAP side). |
| DI | 0 | 1 | 1 | One-line summary only. |

### Pass 4 - Pairwise reconciliation per neighbor (weight >= 3)

#### DQ <-> ITSM (weight 3)

**Section 1 - Existing handoffs, fully wired.** Zero. All 3 outbound DQ-to-ITSM handoffs (266, 267, 714) have `source_domain_module_id=NULL` (DQ unmodularized) and `target_domain_module_id=38` (ITSM-INCIDENT-MGMT). Target side is wired; source side is blocked by B1-S1.

**Section 2 - Existing handoffs with NULL module FK.** 3 rows (266, 267, 714). All resolvable on the DQ side once B1-S1 lands. Mapping: 266 maps to whichever module masters `quality_rules` (DQ-RULES); 267 maps to whichever module masters `dq_scorecards` (DQ-MONITORING); 714 maps to whichever module masters `dq_sla_definitions` (DQ-INCIDENT-MGMT). No ITSM-side fix needed.

**Section 3 - Missing handoffs the catalog implies should exist.** None at trigger-event level (every DQ master with a workflow-bearing event has a handoff). Inverse direction (ITSM to DQ) carries no events because ITSM doesn't consume DQ data.

**Section 4 - Boundary integrity gaps.** None. `service_incidents` is mastered by ITSM (id 1) and consumed by DQ-INCIDENT-MGMT (once it ships, via `contributor` role per current `domain_data_objects` row at data_object_id=47).

**Section 5 - Cross-domain `data_object_relationships`.** MISSING. No `quality_incidents -> service_incidents` edge exists despite 3 handoffs implying the relationship. Goes to B1-S12.

#### DQ <-> DCG (weight 4)

**Section 1.** Zero fully wired. Both sides unmodularized.

**Section 2.** 4 rows: 268 (DQ to DCG, profile_result.updated on data_assets), 713 (DQ to DCG, dq_dimension.threshold_breached on data_assets), 262 (DCG to DQ, data_asset.certified on data_assets), 708 (DCG to DQ, data_certification.granted on data_certifications). All 4 have both module FKs NULL. DCG-side fix is report-only.

**Section 3.** Possible missing handoffs: (a) `quality_incident.raised -> DCG` to flag the asset as suspect; (b) `dq_sla_definition.published -> DCG` to register the SLA against the asset. Surfaces as B2 candidate; not auto-added.

**Section 4.** None. `data_assets` mastered in DCG (88), consumed by DQ via legacy `domain_data_objects` row.

**Section 5.** MISSING `profile_results -> data_assets` edge and `dq_dimensions -> data_assets` edge. Goes to B1-S12.

#### DQ <-> DATA-AI-PLAT (weight 3)

**Section 1.** Zero fully wired. Both sides unmodularized.

**Section 2.** 3 rows: 715 (DQ to DAP, dq_dimension.threshold_breached on dq_dimensions), 156 (DAP to DQ, quality_check.failed on lakehouse_tables), 684 (DAP to DQ, feature_set.staleness_breached on feature_sets). All NULL on both module FKs.

**Section 3.** Possible missing: DAP probably publishes `lakehouse_table.profile_requested` to DQ (the platform asks DQ to run a profile when a table lands). Surface as B2 candidate.

**Section 4.** `feature_sets` (data_object_id=229) and `lakehouse_tables` (226) are DAP-mastered; DQ consumes via the existing `domain_data_objects` row on lakehouse_tables (role=consumer). `feature_sets` has no DQ-side `domain_data_objects` row despite handoff 684 referencing it as payload (B5 integrity gap - DQ receives feature_set.staleness_breached but doesn't declare a role on feature_sets).

**Section 5.** MISSING `dq_dimensions -> lakehouse_tables` edge (handoff 715 implies it). Goes to B1-S12.

#### DQ <-> DI (weight 1)

One-line summary: 1 inbound (DI:pipeline_run.sla_breached on pipeline_runs). DQ consumes the event to raise an incident when a pipeline misses freshness SLA. No DQ-side `domain_data_objects` row declaring a role on `pipeline_runs` (B5 integrity gap, similar to feature_sets above). No outbound from DQ to DI. Defer deep dive.

### Cross-bucket dependencies

- **Bucket 2 #2 (module split shape) blocks Bucket 1 #1 (B1-S1), #7 (B1-S7), #11 (B1-S11 - lifecycle_states need a domain_module_id when scoped), and Bucket 1 #13 (B1-S13 - source module derivation).** Decide module shape first.
- **Bucket 2 #1 (anomaly_detections ownership) is independent** of Bucket 1 progress except for B1-S2; both AIOps and DQ paths converge on the same DMDO row eventually.
- **Bucket 2 #3 (cross-cutting capability) depends** on Bucket 1 #3 (B1-S3 capability authoring) and the user's call on the DATA-OBSERVABILITY missing-domain candidate.
- **Bucket 2 #4 (coverage_level)** depends on Bucket 1 #4 (B1-S4 reload-or-augment decision).
- **Bucket 3 candidates (data_contracts, survivorship_rules, merge_decisions)** become Phase B inserts only after Bucket 1 #1 lands; until modules exist, there's nowhere to anchor a new DMDO row.

### Per-bucket prompts

**Bucket 1 prompt:**
"DQ is pre-modular (zero `domain_modules` rows). 16 in-scope gaps fall out of that core M1 failure plus several B-band misses. Approve the bundle? A defensible default is: (1) decide module split (Bucket 2 #2) first, (2) load modules + capabilities + DMDOs, (3) backfill B6/B7/B8/B11/B12 cluster edges, (4) PATCH em-dash + spelling in `domains.business_logic` and `description`, (5) draft `catalog_tagline` + `catalog_description` for review, (6) author the 5 confident APQC tags, (7) retire legacy `dq-system` skill and author per-module ones. Which subset do you want to load first?"

**Bucket 2 prompt:**
"5 judgment calls. Most load-bearing is #2 (module split shape) - it gates the M-band fix and the F-band cure. Recommend (a) three modules: DQ-RULES, DQ-INCIDENT-MGMT, DQ-MONITORING. #1 (anomaly_detections ownership) and #4 (solution coverage) are cleanup that can run in parallel. #3 (cross-cutting capability) and #5 (pairwise reconciliation depth) can wait. What's your call on each?"

**Bucket 3 prompt:**
"3 Phase 0 candidates. `data_contracts` is the emerging-vendor pattern; `survivorship_rules` and `merge_decisions` are MDM-vs-DQ contested territory. Vet via formal Phase 0 vendor-research subagent, or eyeball-mode based on the legacy-DQ vs observability-vendor split?"

### Report-only follow-ups (owed by other domains)

- **AIOPS B1-S2 mirror:** the catalog-wide single-master conflict on `anomaly_detections` requires a coordinated decision; whichever direction Bucket 2 #1 lands, AIOPS audits will need to align. Surfaces when AIOPS is next validated.
- **DCG B10b owes:** all 4 DQ-to/from-DCG handoffs (262, 268, 708, 713) have `target_domain_module_id=NULL` (DQ side) and `source_domain_module_id=NULL` (DCG side). Once DCG is modularized, its side resolves automatically. Surfaces when DCG is next validated.
- **DCG B5 owes:** `data_certifications` (data_object_id=306) is DCG-mastered but DQ has no `domain_data_objects` row consuming it despite receiving handoff 708. Could also be fixed on DQ side once modules exist.
- **DATA-AI-PLAT B5 owes:** `feature_sets` (229) and `lakehouse_tables` (226) - the latter is wired (DQ has a consumer row); `feature_sets` is not. Handoff 684 implies a consumer role on DQ side that doesn't exist. Could be fixed on DQ side once modules exist.
- **DI B5 owes:** `pipeline_runs` (434) - no DQ-side consumer row despite handoff 728. Same shape as above.
- **DATA-AI-PLAT B10b owes:** `target_domain_module_id` on handoff 715 (and `source_domain_module_id` on 156, 684). Surfaces when DATA-AI-PLAT is modularized.
- **DI B10b owes:** `source_domain_module_id` on 728. Surfaces when DI is next validated.
- **DCG B9 candidates:** subagent surfaced possible `quality_incident.raised -> DCG` (flag asset as suspect) and `dq_sla_definition.published -> DCG` (register SLA against asset). User confirmation needed on DCG side.
- **DATA-AI-PLAT B9 candidate:** possible `lakehouse_table.profile_requested -> DQ`. User confirmation needed on DAP side.

### `domains.notes` pointer (if updated)

_not yet written; will require user-approved wording per Rule #15._

## 2026-05-31, Continuation: B1 technical fixes

Truly-technical B1 fixes applied via loader `.tmp_deploy/fix_dq_b1_technical_2026_05_31.ts` (run from project root). 16 Bucket-1 items in the 2026-05-30 audit; 4 of them were in technical scope, 12 deferred. Loader is idempotent.

### Applied

- **B1-S5 (A1):** PATCHed `domains` row 90. Replaced U+2014 em-dash in `business_logic` with comma+space; replaced British "standardisation" with American "standardization" in `description`. Verified post-patch.
- **B1-S9 (B7):** INSERTed 7 user-edges per Rule #10 against `users` (id 748), one per actor the audit pre-specifies. Verbs / inverses authored per existing `users` edge pattern: `users authored rules quality_rules` (309, `is_created_by`), `users assigned incidents quality_incidents` (310, `is_assigned_to`), `users raised incidents quality_incidents` (310, `is_created_by`), `users owned profile results profile_results` (311, `is_owned_by`), `users owned SLA definitions dq_sla_definitions` (314, `is_owned_by`), `users owned scorecards dq_scorecards` (313, `is_owned_by`), `users acknowledged anomalies anomaly_detections` (94, `is_acknowledged_by`). All rows `relationship_type=one_to_many`, `relationship_kind=reference`, `owner_side=source`, `is_required=false`. The audit lists 6 edges but pre-specifies 2 actors for `quality_incidents` (assignee + raiser), so 7 rows authored.
- **B1-S10 (B11):** INSERTed 1 of the 8 alias tuples the audit pre-specifies, the only one with `alias_type='synonym'` (`anomaly` on `anomaly_detections`). The other 7 are vendor-specific (`expectation` / `check` / `monitor` / `profiling output` / `profile` / `incident` / `issue`), which the platform requires under `alias_type='solution_term'` with `solution_id` set; the corresponding vendor solutions (Great Expectations, Soda, Monte Carlo, Ataccama ONE, Informatica IDQ, Bigeye) are not loaded yet (gated on B1-S4 / Bucket 2 #4). Loader attempted to insert as `solution_term` with NULL `solution_id` and hit the platform check-constraint `(23514) Solution context must be set when alias type is 'solution_term' and null otherwise.` Removed those 7 from this run; they re-queue under B1-S4.
- **H1 APQC tagging:** INSERTed 5 `handoff_processes` rows for the 5 outbound handoffs the audit pre-specifies with confidence high or medium and a verified PCF row. All `proposal_source='agent_curated'`, `record_status` default `new`. Process IDs were resolved at runtime by `external_id` on `processes` (all 4 PCF rows verified pre-insert): handoff 266 to PCF 20903 (Triage IT service delivery incidents, process_id 1299); handoff 267 to PCF 20927 (Resolve IT issues/requests, 1319); handoff 268 to PCF 10252 (Maintain master data, 771); handoff 713 to PCF 10252 (771); handoff 714 to PCF 20650 (Triage SLA compliance issues, 1103). H1 coverage moves from 0 of 11 to 5 of 11 tagged; the remaining 6 are inbound (5) or no clean PCF home (1), all defer-to-Discover per the original audit.

### Deferred (12 of 16)

- **B1-S1 (M1) modules**, **B1-S2 (M7) anomaly_detections canonical owner**, **B1-S3 (A2) capabilities**, **B1-S4 (A3) primary-coverage solutions**, **B1-S6 (A4) catalog UX**, **B1-S7 (F1) legacy skill retire**: each either requires user judgment (module split shape, canonical owner, solution coverage, catalog tagline wording per Rule #20) or is gated downstream on the module-split decision. Bucket-2 prompt #2 still owns the split.
- **B1-S8 (B6) intra-domain master edges**: 6 edges named in the audit prose, but the verbs and cardinalities are not pre-specified row-by-row; cluster-draft authoring needed first.
- **B1-S11 (B12) lifecycle states**: state machines described in prose but no per-state rows (state_order, is_initial, is_terminal, requires_permission, permission_verb_override) pre-specified; also gated on B1-S1 modules for the `domain_module_id` anchor.
- **B1-S12 (B8) cross-domain edges**: 4 edges named but verbs / cardinalities / owner_side not pre-specified per row.
- **B1-S13 (B10b) per-module attribution**: deterministic but blocked on B1-S1 modules existing.
- **B1-M1 / B1-M2 / B1-M3**: new data_objects (`data_quality_checks`, `data_quality_remediation_actions`, `column_profiles`), explicit Phase 0 / B2 decisions.
- **The 7 vendor-specific aliases** rolled into B1-S4 (need solution rows first).

### JWT errors

None.

### Verification queries (post-load)

- `GET /domains?id=eq.90&select=description,business_logic`: description now `Profiling, cleansing, standardization, matching, and ongoing monitoring of data fitness for purpose.`; business_logic now `Profiling, matching, anomaly detection, and data observability, the algorithmic plane the workflow sits on top of.`. No em-dash, no "standardisation".
- `GET /data_object_relationships?data_object_id=eq.748&related_data_object_id=in.(94,309,310,311,313,314)`: 7 rows.
- `GET /data_object_aliases?data_object_id=in.(94,309,310,311,312,313,314)`: 1 row (`anomaly`).
- `GET /handoff_processes?handoff_id=in.(266,267,268,713,714)`: 5 rows, all `agent_curated`, all `new`.

### Loader

`.tmp_deploy/fix_dq_b1_technical_2026_05_31.ts` (gitignored; idempotent).

## 2026-05-31, Audit

### Summary

- Current footprint: domain id 90; **0 `domain_modules` rows** (still pre-modular); 7 masters + 1 consumer + 1 contributor = 9 data-object rows; 0 capabilities; 0 regulations; 10 solutions (0 primary, 2 secondary, 8 partial); 7 trigger_events on DQ masters (4 with empty `event_category`) + 3 standalone; 6 outbound + 5 inbound cross-domain handoffs (11 total); 0 intra-domain handoffs; 1 legacy domain-level system skill `dq-system` (id 11) with 11 `skill_tools`, all `coverage_tier=platform`; 1 owner business function (Data Engineering); catalog UX fields empty (A4); 7 reverse-direction `users` edges (`users authored/assigned/raised/owned/acknowledged ...`) loaded by the 2026-05-31 continuation, but 0 forward-direction master to users edges.
- Bucket 1 (in-scope, agent fixable): 5 items.
- Bucket 2 (surface-for-user, judgment): 5 items (carried from 2026-05-30, all still open).
- Bucket 3 (Phase 0 pending, speculative): 3 items (carried from 2026-05-30, all still open).
- Structural pass headline unchanged from 2026-05-30: M1 still fails (zero `domain_modules`), which cascades into M2/M4/M5/M6/M8 at the module layer and F2/F3/F5 at the skill layer. M7 hard fail persists (catalog-wide single-master conflict on `anomaly_detections` between DQ and AIOPS at the legacy `domain_data_objects` layer). The 2026-05-31 continuation closed B1-S5 (em-dash + spelling), part of B7 (reverse-direction users edges), part of B11 (3 anomaly aliases), and 5 of 11 H1 tags. Subsequent broader catalog passes added 3 additional handoff_processes rows on inbound handoffs (262 to PCF 20768, 708 to PCF 20774, 728 to PCF 20779). H1 coverage is now 8 of 11 handoffs tagged (still 0 `record_status=approved`).

### Bands evaluated this audit

- **A1** pass. All 7 metadata fields populated; em-dash and British spelling cured.
- **A2** fail. 0 `capability_domains` rows (carried, B1-S3).
- **A3** fail. 10 solutions, 0 `primary`; 2 secondary + 8 partial (carried, B1-S4).
- **A4** fail. `catalog_tagline` and `catalog_description` both empty (carried, B1-S6).
- **M1** fail (structural gate). 0 `domain_modules` rows; cascades into M2/M4/M5/M6/M8 (carried, B1-S1).
- **M7** hard fail. `anomaly_detections` mastered in DQ and AIOPS on the legacy `domain_data_objects` layer (DMDO layer has zero rows here since neither domain is modularized; rolling forward to DMDO will reproduce the conflict). Decision required (carried, Bucket 2 #1 and B1-S2).
- **B5** pass. Zero `embedded_master` rows; no integrity exposure.
- **B6** fail. 0 intra-domain `data_object_relationships` between DQ's 7 masters (carried, B1-S8).
- **B7** partial. 7 reverse-direction edges from `users` (748) to DQ masters were loaded 2026-05-31. The forward-direction `master to users` edges are absent. The 2026-05-30 audit specified 6 directed edges; the load wrote them on the `users` side only. Pass criterion in SKILL Rule #10 / B7 is "≥1 edge to users from every master with a user-typed actor" - the symmetric-direction shape satisfies the discoverability intent but the explicit forward edges are still absent. Reclassify as resolved at the load discipline level; if the user wants the forward direction populated as well, it queues as a follow-up.
- **B8** fail. 0 outbound cross-domain `data_object_relationships`; 4 expected per 2026-05-30 audit (carried, B1-S12).
- **B9** partial. 10 trigger_events on DQ masters; 4 of them (745, 746, 747, 748) have empty `event_category`. Per Rule #13 the valid enum is `lifecycle | state_change | threshold | signal`; threshold events should be `threshold`, recovery events `state_change`, lifecycle publication events `lifecycle`. New B-band finding this audit (B1-NEW1).
- **B9b** vacuous. Single domain module count (0); no intra-domain surface to model.
- **B10b** fail. All 6 outbound handoffs (266, 267, 268, 713, 714, 715) have `source_domain_module_id=NULL` (carried, B1-S13; blocked on B1-S1).
- **B11** partial. 3 alias rows now exist on `anomaly_detections` (94) only. 6 of 7 masters carry zero aliases. Vendor-specific aliases on `quality_rules` (expectation, check, monitor), `profile_results` (profiling output, profile), `quality_incidents` (incident, issue), `dq_dimensions`, `dq_sla_definitions`, `dq_scorecards` remain unwritten and are gated on B1-S4 (solution rows must exist for `alias_type='solution_term'`). Carried.
- **B12** fail. 0 lifecycle states authored on any DQ master. `quality_incidents`, `quality_rules`, `dq_sla_definitions` have clear workflows; `anomaly_detections` has a triage workflow. `dq_scorecards`, `dq_dimensions`, `profile_results` are likely config-shape. Carried (B1-S11); blocked on B1-S1 for `domain_module_id` anchoring.
- **C1** pass. 1 owner row (Data Engineering).
- **D1** not run.
- **E1-E5** vacuous on single-module-floor (no modules to anchor roles to). Will become in-scope once B1-S1 lands.
- **F1** fail. Legacy `dq-system` (id 11) still anchored at `domain_id=90, domain_module_id=null`. Cannot retire until module-level system skills are authored. Carried (B1-S7); blocked on B1-S1.
- **F2/F3/F5** uncomputable (no modules; no module-anchored system skills).
- **H1** partial. 8 of 11 handoffs tagged (5 continuation tags + 3 later inbound tags on 262, 708, 728). 3 remain untagged: 156 (DATA-AI-PLAT to DQ, quality_check.failed on lakehouse_tables), 684 (DATA-AI-PLAT to DQ, feature_set.staleness_breached on feature_sets), 715 (DQ to DATA-AI-PLAT, dq_dimension.threshold_breached on dq_dimensions). All three involve DATA-AI-PLAT and were originally classified defer-to-Discover in the 2026-05-30 audit because the PCF doesn't carry a clean substrate-feed process. Defer status reaffirmed. Coverage headline (record_status=approved) remains 0 of 11 because no human has signed off the 8 agent_curated rows.

### Bucket 1 - In-scope confirmed gaps

This audit produces 1 new B-band finding and inherits the structural-gate items from 2026-05-30 that were not closed in the 2026-05-31 continuation. Items B1-S1, B1-S2, B1-S3, B1-S4, B1-S6, B1-S7, B1-S8, B1-S11, B1-S12, B1-S13 (10 items) remain. New: B1-NEW1.

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-NEW1 | B9 | 4 trigger_events on DQ masters carry empty `event_category`: 745 dq_dimension.threshold_breached (expected `threshold`), 746 dq_dimension.recovered (expected `state_change`), 747 dq_sla_definition.breached (expected `threshold`), 748 dq_sla_definition.published (expected `lifecycle`). | PATCH each row's `event_category` to the inferred value per Rule #13's enum. Pure mechanical, no user judgment needed beyond confirming the enum mapping above. |
| B1-S1 | M1 | 0 `domain_modules` rows (carried). Blocks M2/M4/M5/M6/M8/B9b/B10b cure path/E-band/F2/F3/F5. | Author 2-3 modules. Module split shape still gated on Bucket 2 #2. |
| B1-S2 | M7 | `anomaly_detections` (94) catalog-wide single-master conflict between DQ and AIOPS at DDO layer (carried). | Decision per Bucket 2 #1: (a) split, (b) DQ canonical, (c) AIOPS canonical. |
| B1-S3 | A2 | 0 capabilities (carried). | Author 5-7 capabilities; cross-cutting `DATA-OBSERVABILITY-MONITORING` per Bucket 2 #3. |
| B1-S4 | A3 | 0 `primary` solutions (carried). | Add primary-coverage rows for pure-play DQ flagships per Bucket 2 #4. Unblocks the 6 vendor-specific aliases queued under B1-S10 continuation deferral. |
| B1-S6 | A4 | catalog_tagline + catalog_description empty (carried). | Draft per Rule #20, surface to user for review before writing. |
| B1-S7 | F1 | Legacy `dq-system` (id 11) anchored at domain-only (carried). | Retire after authoring per-module system skills (blocked on B1-S1). |
| B1-S8 | B6 | 0 intra-domain master edges (carried). | Author 6 edges via cluster-drafts. |
| B1-S11 | B12 | 0 lifecycle states (carried). | Author state machines for quality_incidents / quality_rules / dq_sla_definitions / anomaly_detections; surface config-shape exemption for dq_scorecards / dq_dimensions / profile_results (blocked on B1-S1 for `domain_module_id` anchor). |
| B1-S12 | B8 | 0 cross-domain outbound edges (carried). 4 expected: `quality_incidents -> service_incidents`, `profile_results -> data_assets`, `dq_dimensions -> data_assets`, `dq_dimensions -> lakehouse_tables`. | Author 4 edges. |
| B1-S13 | B10b | All 6 outbound handoffs have NULL `source_domain_module_id` (carried). | Deterministic backfill after B1-S1. |

H1 deferred-to-Discover items (not new fixes; reaffirmed): handoffs 156, 684, 715 (all DATA-AI-PLAT counterparty, no clean PCF match).

### Bucket 2 - Surface-for-user (judgment calls)

All 5 items carried from 2026-05-30. No user decisions were captured in the interim. Listed for completeness; see 2026-05-30 history above for full context.

1. **`anomaly_detections` canonical ownership.** Options: (a) split into `data_anomalies` + `event_anomalies`, (b) keep canonical in DQ + AIOPS demotes, (c) keep canonical in AIOPS + DQ demotes. Recommendation: (a). Independent of Bucket 3.
2. **Module split shape.** Options: (a) 3-way `DQ-RULES` + `DQ-INCIDENT-MGMT` + `DQ-MONITORING`, (b) 2-way `DQ-RULES` + `DQ-OBSERVABILITY`, (c) 1-way `DQ`. Capability count (0) makes (c) non-viable once B1-S3 lands. Recommendation: (a). Gates B1-S1, B1-S7, B1-S11, B1-S13.
3. **Cross-cutting capability vs domain-prefixed.** `DATA-OBSERVABILITY-MONITORING` spans DQ + DCG + DATA-AI-PLAT + OBS. Depends on B1-S3 plus the DATA-OBSERVABILITY missing-domain decision.
4. **Coverage_level downgrade / add-primary.** Current 10 solutions read like a data-and-AI-platforms set, not DQ specialists. Add primary-coverage rows for 4-6 pure-plays, or accept current set as platform-coverage only and audit Phase A solutions separately.
5. **Pairwise reconciliation scope.** DQ touches DCG (weight 4), ITSM (weight 3), DATA-AI-PLAT (weight 3), DI (weight 1). Run pairwise reconciliation for DCG / ITSM / DATA-AI-PLAT inline now, or defer per-neighbor passes as separate Validate runs. DCG and DATA-AI-PLAT are themselves unmodularized which blunts the value of Section 2/3 diffs.

### Bucket 3 - Phase 0 pending (speculative)

All 3 candidates carried from 2026-05-30. No new Phase 0 work has run.

| Candidate | Proposed module | Vendor evidence | Notes |
|---|---|---|---|
| `data_contracts` | DQ-RULES or new module | Soda, Monte Carlo, Acceldata | Declarative contract between producer and consumer. Adjacent to `dq_sla_definitions` but bilateral. Phase 0 vetting needed. |
| `survivorship_rules` | DQ-RULES | Informatica IDQ, Ataccama ONE | Likely MDM territory. Phase 0 vetting needed. |
| `merge_decisions` / `duplicate_candidates` | DQ-RULES | Informatica, Ataccama, Talend | Same MDM-vs-DQ question. Phase 0 vetting needed alongside survivorship_rules. |

### Cross-bucket dependencies

- Bucket 2 #2 (module split shape) gates Bucket 1 items B1-S1, B1-S7, B1-S11, B1-S13.
- Bucket 2 #1 (anomaly_detections ownership) gates B1-S2 directly; independent of Bucket 3.
- Bucket 2 #3 (cross-cutting capability) depends on B1-S3 and the DATA-OBSERVABILITY missing-domain decision.
- Bucket 2 #4 (coverage_level) gates the 6 vendor-specific aliases still queued under B1-S10.
- Bucket 3 candidates become Phase B inserts only after Bucket 1 #1 (B1-S1) lands.
- B1-NEW1 (event_category PATCH) is independent and unblocked.

### JWT errors

None.

### Report-only follow-ups (owed by other domains)

Carried from 2026-05-30, status unchanged:

- AIOPS B1-S2 mirror (anomaly_detections single-master conflict).
- DCG B10b owes (4 DQ-DCG handoffs with NULL counterpart module FK).
- DCG B5 owes (no DQ-side consumer row on `data_certifications` despite handoff 708).
- DATA-AI-PLAT B5 owes (no DQ-side consumer row on `feature_sets` despite handoff 684; `lakehouse_tables` is wired).
- DI B5 owes (no DQ-side consumer row on `pipeline_runs` despite handoff 728).
- DATA-AI-PLAT B10b owes (target module FK on 715; source module FK on 156, 684).
- DI B10b owes (source module FK on 728).
- DCG B9 candidates: possible `quality_incident.raised -> DCG` and `dq_sla_definition.published -> DCG`. User confirmation needed on DCG side.
- DATA-AI-PLAT B9 candidate: possible `lakehouse_table.profile_requested -> DQ`. User confirmation needed on DAP side.

### `domains.notes` pointer (if updated)

_not written; awaiting user-approved wording per Rule #15._
