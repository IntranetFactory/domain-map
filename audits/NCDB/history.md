# NCDB audit history

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- **Current footprint:** **0** `domain_modules` rows (M1 / M2 / M4 / M6 hard-fail catalog-wide); 5 `domain_data_objects` masters (`nocode_bases` 241, `nocode_record_definitions` 242, `nocode_forms` 712, `nocode_views` 713, `nocode_automations` 714); 8 capabilities (6 NCDB-prefixed `NCDB-FLEX-SCHEMA`, `NCDB-LINKED-RECORDS`, `NCDB-VIEWS`, `NCDB-FORMULAS`, `NCDB-FORM-CAPTURE`, `NCDB-SYNC-EXTERNAL`, plus 2 cross-cutting `OPERATIONAL-DATA-APPS`, `SEMANTIC-MODELING`); 8 solutions (5 primary, 3 secondary); 0 regulations; 7 trigger_events on NCDB masters; 4 outbound + 0 inbound cross-domain handoffs; **0** lifecycle states; **0** data_object_aliases; **0** data_object_relationships (intra or cross-domain on NCDB masters); 1 legacy `domain_id`-anchored `system` skill (`ncdb-system`, id 86) with 5 `query_*` skill_tools and no module attribution; 0 roles; 0 `domain_module_capabilities` rows for any NCDB capability anywhere in the catalog; 0 `domain_aliases`.
- **Vendor-surface basis:** flagship no-code-database vendors (Pass 2, semantic market audit): Airtable, Notion (Databases), Coda, SmartSuite, Smartsheet (database tier), Quickbase, Baserow, NocoDB, SeaTable, Grist, Fibery, Stackby, Rows. The catalog has 8 solutions linked (5 primary `Airtable / Baserow / NocoDB / Rows / Stackby`; 3 secondary `Notion / Coda / Quickbase`). `Smartsheet` (id 70) and `ClickUp` (id 598) already exist in the catalog but are not linked to NCDB. `SmartSuite`, `SeaTable`, `Grist`, `Fibery` are absent from `solutions` entirely.
- **Bucket 1 (in-scope, agent fixable):** 14 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 7 items.
- **Candidates queued to `audits/_missing-domains.md`:** 2 (FORM-BUILDER, SPREADSHEET-PLATFORM).

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO, ranked by edge weight):

| Neighbor | Out | In | DMDO cross-refs | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| WORK-MGMT | 1 | 0 | 0 | 0 | 1 | Lightweight |
| LCAP | 1 | 0 | 0 | 0 | 1 | Lightweight |
| DLP | 1 | 0 | 0 | 0 | 1 | Lightweight |
| ITSM | 1 | 0 | 0 | 0 | 1 | Lightweight |

No neighbor reaches edge weight >=3, so no pairwise deep-dive runs in this audit. The handoff substrate is too thin to warrant full 5-section reconciliation against any single neighbor; this is itself a finding (NCDB ships zero inbound handoffs despite being a known target of every iPaaS / DCG / DLP scan path). See Bucket 1 B1-S14 and the report-only follow-ups.

**Structural pass bands:**
- **S band (sweep):** zero-row anomalies on `domain_modules` (M1), `domain_module_capabilities` for every NCDB capability (M4), `data_object_lifecycle_states` (B12), `data_object_aliases` (B11), `data_object_relationships` (B6 / B7 / B8), `domain_regulations`, `domain_aliases`, `roles` (E1 vacuously passes only because M1 fails first), inbound `handoffs` (B10 report-only).
- **A band:** A1 passes (all 7 domain metadata fields populated: crud_percentage=80, business_logic non-empty, min_org_size=`10 xs <50`, cost_band=`$$`, certification_required=false, usa_market_size_usd_m=1000, market_size_source_year=2025). A2 passes (8 capabilities). A3 passes (8 solutions, 5 primary). **A4 hard-fail** (`catalog_tagline` and `catalog_description` are both empty strings; per Rule #20 these are buyer-facing surfaces that must be drafted, surfaced to the user, then loaded after review). A5 skipped (not requested).
- **M band:** **M1 / M2 / M4 / M6 hard-fail.** Zero modules + 8 capabilities = the entire M-band is broken. Every downstream concern (Phase B per-module attribution, Phase E roles, Phase F skill / tools, Phase H APQC tagging at module granularity) inherits the gap. M5 vacuously passes (no states to attribute). M7 vacuously passes (no master DMDO rows to check for catalog-wide single-master conflicts; the 5 masters live only in the legacy `domain_data_objects` rollup, not in `domain_module_data_objects`).
- **B band:** B1 passes (5 masters via legacy rollup). B2 passes (every master has singular + plural labels). **B3 hard-fail** (5 masters use the `nocode_` prefix which is fine as a `<slug>_<noun>` shape, so the prefix is acceptable per Rule #9, but `is_canonical_bare_word=false` is correct and `naming_authority_rationale=""` is correct). **B4 hard-fail** (every pattern flag is the false default with no positive re-evaluation; per Rule #12 the audit must positively re-evaluate). B5 vacuously passes (no embedded_masters in this domain's footprint). **B6 hard-fail** (zero intra-domain relationships across 5 masters that are all defined in terms of each other: a base contains tables / forms / views / automations). **B7 hard-fail** (zero `users` edges to platform built-in `users` id 748). B8 partial (4 outbound handoffs but zero cross-domain `data_object_relationships` rows authored). **B9 partial-fail** (7 trigger_events exist but `event_category` not checked individually in this pass; spot-check below). **B9b hard-fail** (no intra-domain handoffs, but vacuously blocked behind M1). **B10b hard-fail** (all 4 outbound handoffs have NULL `source_domain_module_id` because NCDB has no modules; 2 of 4 also have NULL `target_domain_module_id`). **B11 hard-fail** (zero aliases on any master; the no-code-database market carries strong vendor-specific synonyms where aliases are essential: Airtable says `base / table / record / view / automation`; Notion says `database / page / property / view / button`; SmartSuite says `solution / app / record / view`). **B12 hard-fail** (zero lifecycle states; every master has an obvious state machine: draft / published / archived for bases, draft / active / locked / archived for record definitions, draft / published / closed for forms, draft / shared / archived for views, draft / active / disabled / archived for automations).
- **C band:** C1 passes (1 owner `Business Operations`, 3 contributors `Marketing / Human Resources / Sales Operations`, 1 consumer `Data and Analytics`). C2 vacuous (no capability-level overrides loaded; expected unless a specific capability has a different functional owner than the domain).
- **D band:** D1 not exercised (no fresh load).
- **E band:** E1 vacuous (single-module floor fails first; M2 blocks role authoring entirely).
- **F band:** **F1 hard-fail** (legacy `domain_id`-anchored `system` skill `ncdb-system` id 86 remains; per Rule #17 every module needs its own system skill, but no modules exist yet so F1 cannot be fully cured until M1 / M2 cure). **F2 hard-fail** (zero `domain_module_id`-anchored system skills, vacuously blocked by M1). F3 passes against the legacy skill (5 `query_*` tools, all `coverage_tier=platform`). F4 passes (all 5 tools are `operation_kind=query` with `data_object_id` set). F5 reads as 100% strict against the legacy skill, but the headline number is meaningless until per-module system skills exist. F7 vacuous (no channel primitives linked).
- **H band:** **H1 hard-fail.** 4 cross-domain handoffs (4 out + 0 in); zero `handoff_processes` rows; zero agent_curated tags; zero deferrals recorded. Volume target for the audit: ~2 to ~3 agent_curated tags proposed (0.5N to 0.8N for N=4). Audit proposes 4 below.

**The headline finding:** NCDB is a marketing-tier row. It carries rich `domains` metadata (crud_percentage, market size, cost band), 8 capabilities, 8 solutions, 5 data_objects with descriptions, 7 trigger events, and a domain-level system skill, but the **M / B / E / F / H structural layers are essentially empty**. Without `domain_modules` rows, every downstream layer is uncomputable. The deployable surface is zero. This is the same silently-thin Phase-A load pattern caught on LCAP (audit 2026-05-30), DXP, and other early-modular domains. The semantic gap is also wider than LCAP: NCDB has no FCRA / GDPR / HIPAA regulatory entities even though `nocode_forms` is a standard PII intake surface and bidirectional sync makes the platform a DLP scan target.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 / M2 / M4 / M6 hard fail** | **Zero `domain_modules` rows for NCDB, but 8 capabilities exist.** Rule #14 requires >=1 full module per domain, and >=2 modules for domains with >=3 capabilities. Rule #14 also requires every capability to have >=1 realizing module (M4). Vendor surface implies a clean 3-module split: **NCDB-SCHEMA-BUILDER** (visual schema authoring, linked records, formulas, rich field types; realizes `NCDB-FLEX-SCHEMA`, `NCDB-LINKED-RECORDS`, `NCDB-FORMULAS`, `SEMANTIC-MODELING`; masters `nocode_bases`, `nocode_record_definitions`), **NCDB-VIEWS-FORMS** (multi-view presentation, form-based capture; realizes `NCDB-VIEWS`, `NCDB-FORM-CAPTURE`, `OPERATIONAL-DATA-APPS`; masters `nocode_views`, `nocode_forms`), and **NCDB-AUTOMATION-SYNC** (record-triggered automations, bidirectional external sync; realizes `NCDB-SYNC-EXTERNAL`; masters `nocode_automations`). Alternative 2-module split also defensible. Decision goes to Bucket 2 (B2-S1). | Author 3 `domain_modules` rows + 8 `domain_module_capabilities` rows + 5 `domain_module_data_objects` rows (one master DMDO per data_object). See Bucket 2 B2-S1 for the proposed split that needs user sign-off before the loader runs. |
| B1-S2 | **B4 pattern flag re-evaluation (Rule #12)** | Every master has all three flags `false` (default). Audit needs positive consideration. Candidate flips: `nocode_forms.has_personal_content=true` (forms are a standard PII intake surface across every flagship); `nocode_bases.has_submit_lock=false` (bases are continuously edited, no lock); `nocode_record_definitions.has_submit_lock=true` (once a base has live data, schema changes need a controlled migration path; SmartSuite and Quickbase enforce this with explicit schema-deploy gates); `nocode_automations.has_single_approver=false` (no approver pattern; trigger-action automations execute on the author's permissions). | Surface the proposed flips as Bucket 2 (B2-S2) because pattern flags are workflow-shape judgments the user owns. |
| B1-S3 | **B6 hard fail - zero intra-domain `data_object_relationships`** | NCDB has 5 masters that all depend on each other. Minimum coherent edge set: `nocode_bases` contains `nocode_record_definitions` (1:N, owner_side=nocode_bases, is_required=true), `nocode_record_definitions` referenced_by `nocode_views` (1:N, the view selects from a record definition), `nocode_record_definitions` referenced_by `nocode_forms` (1:N, the form writes into a record definition), `nocode_record_definitions` referenced_by `nocode_automations` (M:N, the automation triggers on a record definition and may write to others), `nocode_views` source_of `nocode_forms` (M:N, optional, some platforms let forms inherit a view's filter context). | Author 5 `data_object_relationships` rows via the cluster-drafts pattern in [scripts/loaders/load_cluster_drafts.ts](../scripts/loaders/load_cluster_drafts.ts). Draft block goes through Bucket 1 approval before loading. |
| B1-S4 | **B7 hard fail - zero `users` edges (Rule #10)** | NCDB masters are author-and-operate artifacts with obvious user roles, but no edge to the platform built-in `users` (id 748) exists anywhere. Minimum edge set: users `owns` nocode_bases (creator-owner), users `authors` nocode_record_definitions, users `authors` nocode_views (or `subscribes_to` for shared views with watch), users `authors` nocode_forms, users `authors` nocode_automations, users `submits` nocode_forms (anonymous-or-authenticated form responders). | Insert 6 `data_object_relationships` rows pointing from `data_object_id=748` (and back) to each NCDB master, with verb-shape per the catalog convention. Bundle with B1-S3 in the same cluster-drafts load. |
| B1-S5 | **B11 hard fail - zero `data_object_aliases`** | NCDB masters carry strong vendor-specific synonyms. Per master minimum: `nocode_bases` aliases `base` (Airtable), `workspace database` (Notion), `doc` (Coda), `solution` (SmartSuite), `app` (Quickbase); `nocode_record_definitions` aliases `table` (Airtable / SmartSuite / NocoDB), `database` (Notion), `app table` (Quickbase), `dataset`; `nocode_forms` aliases `form` (Airtable Forms / SmartSuite Forms), `intake form`, `data collection form`; `nocode_views` aliases `view` (Airtable, Notion, NocoDB), `report` (Quickbase), `layout` (SmartSuite); `nocode_automations` aliases `automation` (Airtable Automations), `button` (Notion), `pipeline` (Coda), `workflow` (SmartSuite Automations), `formula button` (Quickbase). Approximately 4-5 aliases per master, ~22 rows total. | Draft alias rows and load via the cluster-drafts pattern. Bundle with B1-S3 / B1-S4. |
| B1-S6 | **B12 hard fail - zero `data_object_lifecycle_states` (Rule #12)** | Every NCDB master has an obvious state machine. Proposed: `nocode_bases` (`draft` -> `active` -> `archived`); `nocode_record_definitions` (`draft` -> `published` -> `locked` -> `archived`, with `requires_permission=true` on `published` and `locked`); `nocode_forms` (`draft` -> `published` -> `closed` -> `archived`, `requires_permission=true` on `published` and `closed`); `nocode_views` (`draft` -> `shared` -> `archived`, `requires_permission=true` on `shared`); `nocode_automations` (`draft` -> `active` -> `disabled` -> `archived`, `requires_permission=true` on `active` and `disabled`). `domain_module_id` on each lifecycle row must point at the realizing module (M5), so this load depends on B1-S1 having authored the modules first. | Draft state machines (5 masters x ~4 states = ~20 rows) and load via a focused loader. Sequence behind B1-S1. |
| B1-S7 | **F1 hard fail - legacy domain-level system skill** | `skills` row id 86 (`ncdb-system`, `skill_type=system`, `domain_id=134`, `domain_module_id=NULL`) is the legacy shape Rule #17 forbids once any module-level system skill exists. F1 currently passes only because no module-level skill has been authored (vacuous transitional state). Once B1-S1 lands and module-level system skills are authored, F1 hard-fails until the legacy row is retired. The 5 linked `query_*` `skill_tools` (595, 596, 831, 832, 833) should be re-anchored to the new per-module skills (split per proposed module shape: `query_nocode_bases` + `query_nocode_record_definitions` -> NCDB-SCHEMA-BUILDER skill; `query_nocode_forms` + `query_nocode_views` -> NCDB-VIEWS-FORMS skill; `query_nocode_automations` -> NCDB-AUTOMATION-SYNC skill). | After B1-S1: author 3 new module-anchored system skills (e.g. `ncdb_schema_builder_agent`, `ncdb_views_forms_agent`, `ncdb_automation_sync_agent`), move the 5 `skill_tools` to the new skills, then DELETE the legacy skill 86 (cascade through `skill_tools` cleanup first). Plus add `mutate_*` and `side_effect` tools per Rule #17 (typical floor 5-20 per skill; current 5 query-only is below the floor). |
| B1-S8 | **A4 - `catalog_tagline` and `catalog_description` are empty (Rule #20)** | NCDB has rich analyst-voice `domains.description` but the two buyer-facing surfaces (`catalog_tagline` for catalog list cards and `catalog_description` for the catalog detail page) are empty strings. Rule #20 requires both, in buyer voice (workflow + value), not analyst voice. Proposed `catalog_tagline`: `Build a database without code. Model your data, capture it through forms, view it your way, and automate the rest.` Proposed `catalog_description` (3 paragraphs): paragraph 1 on the workflow (model entities, link records, build forms and views); paragraph 2 on the value (everyone in the team owns their data, no developer required); paragraph 3 on the boundary (when to graduate to a proper LCAP or warehouse). | Surface the draft to user for review BEFORE writing (Rule #20). Once approved, PATCH the two fields. Once non-empty, no further overwrite without explicit per-row user approval. |
| B1-S9 | **B10b - NULL `source_domain_module_id` on every outbound handoff (in-scope)** | All 4 outbound NCDB handoffs (700, 701, 702, 703) have `source_domain_module_id=NULL` because NCDB has no modules. After B1-S1 lands, these 4 outbound rows backfill cleanly per the B10b derivation rule (resolve via the source module mastering the trigger_event's data_object): handoff 700 (`nocode_automation.triggered`) -> NCDB-AUTOMATION-SYNC; handoff 701 (`nocode_record_definition.changed`) -> NCDB-SCHEMA-BUILDER; handoff 702 (`nocode_view.shared_externally`) -> NCDB-VIEWS-FORMS; handoff 703 (`nocode_automation.failed`) -> NCDB-AUTOMATION-SYNC. | Single PATCH pass on 4 rows after B1-S1 lands. Reference: [scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts](../scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts). |
| B1-S10 | **B10b - NULL `target_domain_module_id` on 2 outbound handoffs (in-scope only for the LCAP and DLP target rows)** | Handoff 701 (target LCAP id 37) and 702 (target DLP id 139) have `target_domain_module_id=NULL`. For 701, LCAP itself has zero modules (per LCAP audit 2026-05-30); the NULL is unresolvable until LCAP's M1 / M2 land. Report-only for LCAP. For 702, DLP module attribution is the responsibility of the DLP audit; verify by querying DLP modules and patching if a clear candidate emerges. | Defer 701 to LCAP audit's re-run; for 702 either resolve via the DLP module mastering `data_loss_incidents` or equivalent (single PATCH), or escalate to the DLP audit. |
| B1-S11 | **B8 outbound - missing cross-domain `data_object_relationships`** | 4 outbound NCDB handoffs but zero cross-domain `data_object_relationships` rows authored. Proposed verbs: handoff 700 (`nocode_automation.triggered` -> WORK-MGMT module 149) maps to `nocode_automations creates <work_mgmt_master>` (target-side master TBD: most likely `work_items` or `tasks`); handoff 701 (`nocode_record_definition.changed` -> LCAP) maps to `nocode_record_definitions publishes_to <lcap_business_objects>` if LCAP eventually models a counterpart, defer until LCAP modularizes; handoff 702 (`nocode_view.shared_externally` -> DLP) maps to `nocode_views observed_by <dlp_data_loss_incidents>`; handoff 703 (`nocode_automation.failed` -> ITSM module 38) maps to `nocode_automations opens <service_incidents>`. Targets for 700 and 703 are resolvable now; 701 and 702 depend on target-domain modeling. | Author the 2 resolvable cross-domain relationship rows (700 and 703) after B1-S3 lands; defer 701 (to LCAP next pass) and 702 (to DLP next pass) as report-only. |
| B1-S12 | **B9 - `event_category` on the 7 NCDB trigger_events (Rule #13 spot-check needed)** | The 7 trigger_events were not individually queried for `event_category` in this pass. Probable shapes: `nocode_base.created` -> `lifecycle`; `nocode_base.exported` -> `signal`; `nocode_record_definition.changed` -> `state_change`; `nocode_form.submitted` -> `signal` (or `state_change` if it represents a record creation); `nocode_view.shared_externally` -> `state_change`; `nocode_automation.failed` -> `signal`; `nocode_automation.triggered` -> `signal`. A query before PATCH is needed to confirm which are already correctly categorized vs which have empty values. | Read all 7 events with `select=id,event_name,event_category`, then PATCH the ones with empty / wrong values. Small loader. |
| B1-S13 | **B9b - intra-domain cross-module handoffs (blocked by S1)** | Once the 3-module split lands (B1-S1) and the data_object_relationships from B1-S3 are loaded, the cross-module pairs derive: a form submission writes to a record definition (NCDB-VIEWS-FORMS -> NCDB-SCHEMA-BUILDER on `nocode_form.submitted`); an automation triggered by a record change (NCDB-SCHEMA-BUILDER -> NCDB-AUTOMATION-SYNC on `nocode_record_definition.changed`); an automation failure surfaces in the schema-builder author view (NCDB-AUTOMATION-SYNC -> NCDB-SCHEMA-BUILDER on `nocode_automation.failed`). | Author 3 intra-domain `handoffs` rows after B1-S1 + B1-S3 + B1-S12. |
| B1-H1 | **APQC TAGGING** | NCDB cross-domain handoffs have zero `handoff_processes` tags. Volume target 0.5N to 0.8N (N=4) is 2 to 3 tags. Audit proposes the 4 tags below; 3 are confident, 1 defers to DLP. | INSERT into `handoff_processes` with `proposal_source='agent_curated'`, `record_status='new'`. |

##### B1-H1 detail - proposed APQC tags

| handoff_id | source -> target | trigger_event | payload | Proposed PCF | PCF lookup hint | Confidence |
|---|---|---|---|---|---|---|
| 700 | NCDB -> WORK-MGMT | nocode_automation.triggered | nocode_automations | Manage operations work execution | search `manage work` / `execute operations` in `processes` table | medium L3 |
| 701 | NCDB -> LCAP | nocode_record_definition.changed | nocode_record_definitions | Manage product and service master data | search `master data` / `manage data definition` | medium L3 (LCAP target NULL, defer to LCAP M1) |
| 702 | NCDB -> DLP | nocode_view.shared_externally | nocode_views | Manage data loss prevention | defer to DLP audit | defer |
| 703 | NCDB -> ITSM | nocode_automation.failed | service_incidents | Manage change deployment control | confirmed in LCAP audit 2026-05-30 at id=285 | confident L3 |

Notes on the table:
- 700 (`nocode_automation.triggered` -> WORK-MGMT) is high-confidence as a workflow execution category but the PCF id depends on whether `Manage business processes` (20827 family) or `Operate business processes` is the better L3 anchor; surface the candidate PCF rows for user pick.
- 701 is structurally similar to the LCAP -> DCG `Manage product and service master data` (PCF id 115) row in the LCAP audit. The NULL `target_domain_module_id` carries forward until LCAP modularizes; tag the handoff with the L3 PCF anyway because the activity classification does not depend on module attribution.
- 702 defers entirely because DLP's PCF mapping is owed by the DLP audit; loading an `agent_curated` tag here without a DLP-side companion would create a one-sided classification.
- 703 reuses the same PCF (id 285, Manage change deployment control L3) the LCAP audit assigned to `extend_app.deployment_failed -> ITSM`. Both are deployment-failure -> ITSM-incident classifications.

#### Bucket 1 count

| Finding type | Count |
| --- | --- |
| STRUCTURAL (M1/M2/M4/M6 hard-fails, single item) | 1 |
| STRUCTURAL (B4 pattern flags) | 1 |
| STRUCTURAL (B6 intra-domain relationships) | 1 |
| STRUCTURAL (B7 users edges) | 1 |
| STRUCTURAL (B11 aliases) | 1 |
| STRUCTURAL (B12 lifecycle states) | 1 |
| STRUCTURAL (F1 legacy system skill retirement) | 1 |
| STRUCTURAL (A4 catalog UX backfill) | 1 |
| BOUNDARY (B10b NULL source FKs) | 1 |
| BOUNDARY (B10b NULL target FKs in-scope subset) | 1 |
| BOUNDARY (B8 cross-domain relationships) | 1 |
| STRUCTURAL (B9 event_category PATCH pass) | 1 |
| BOUNDARY (B9b intra-domain handoffs) | 1 |
| APQC TAGGING | 1 |
| **Bucket 1 total** | **14** |

### Bucket 2 - Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Module split shape.** Proposed 3-module split: **NCDB-SCHEMA-BUILDER** (masters `nocode_bases`, `nocode_record_definitions`; realizes 4 capabilities), **NCDB-VIEWS-FORMS** (masters `nocode_views`, `nocode_forms`; realizes 3 capabilities including the `OPERATIONAL-DATA-APPS` cross-cutting), **NCDB-AUTOMATION-SYNC** (masters `nocode_automations`; realizes `NCDB-SYNC-EXTERNAL`). Alternatives: (b) 2-module split folding views-forms into schema-builder (since forms and views both bind to record definitions); (c) 4-module split breaking forms out of views entirely (some flagships like SmartSuite treat forms as a distinct product surface). | Modularization is a deploy-shape decision the user owns. The catalog convention so far on >=3-capability domains is 2-3 functional modules; vendor surface supports any of the three options. | (a) 3-module split as proposed. (b) 2-module split. (c) 4-module split. (d) different split: user proposes. |
| B2-S2 | **Pattern flag re-evaluation (B4 / Rule #12).** Per-master proposed flips: (i) `nocode_forms.has_personal_content=true` (forms are PII intake); (ii) `nocode_record_definitions.has_submit_lock=true` (live-data schema change needs a controlled migration path); (iii) `nocode_automations.has_personal_content=false` (workflow definitions are not PII themselves, but executions might be; flag stays false on the master, decide on a separate `nocode_automation_runs` if added); (iv) leave the other masters' flags at false (no submit-lock on bases, views, automations as masters; no single-approver pattern anywhere). | Pattern flags are workflow-shape judgments the user owns. The defaults of false don't establish review per Rule #12. Per Rule #15 the consideration cannot be recorded in `notes`; it goes here. | Per-flag yes/no per master from user. |
| B2-S3 | **Regulation coverage on NCDB.** Zero `domain_regulations` rows. NCDB is a known target of GDPR (personal data captured via forms, processed via automations, sometimes shared via external sync), HIPAA (when used for health intake by SMB clinics), CCPA, and SOC 2 (for the platform's own certification). Should at least GDPR and CCPA be linked as `applicability=mandatory` so the per-master compliance work surfaces (data subject requests, consent, retention)? | Regulation linkage is a market-scoping decision the user owns; the no-code-database market straddles many regulated industries without being itself a regulated category. | (a) Link GDPR + CCPA as mandatory. (b) Link GDPR + CCPA + HIPAA as mandatory. (c) Link none, leave compliance as cross-cutting via embedded master patterns. (d) User proposes set. |
| B2-S4 | **Should `OPERATIONAL-DATA-APPS` and `SEMANTIC-MODELING` cross-cutting capabilities stay on NCDB?** Both are cross-cutting (per § Cross-cutting capability convention). `OPERATIONAL-DATA-APPS` is also surfaced as a question in the LCAP audit 2026-05-30 (B2-S4) where the LCAP audit proposes expanding to NCDB + LCAP + APP-PAAS. `SEMANTIC-MODELING` overlaps with DI / DCG / MDM in the catalog. Confirm or adjust both `capability_domains` rows. | Cross-cutting capability scope is a market-test decision the user owns. | (a) Keep both on NCDB unchanged. (b) Keep `OPERATIONAL-DATA-APPS`, drop `SEMANTIC-MODELING` (it belongs to DI / MDM). (c) Keep both and expand each to its full domain set. |
| B2-S5 | **Form-builder boundary.** `nocode_forms` (id 712) is mastered by NCDB but the form-builder market (Typeform, Jotform, Tally, Google Forms, Microsoft Forms, Formstack, Wufoo) is a distinct point-solution market with its own buyers, pricing, and feature shape (conditional logic, payment collection, embedded forms, anti-spam). The candidate domain `FORM-BUILDER` has been queued to `audits/_missing-domains.md` (mention_count=1, surfaced by NCDB audit). Decide: keep `nocode_forms` mastered by NCDB and link `FORM-BUILDER` as a separate domain that `embedded_master`s `nocode_forms`, or master `nocode_forms` in FORM-BUILDER and embed in NCDB. | Naming arbitration plus market-boundary judgment the user owns. | (a) Keep NCDB mastering `nocode_forms`, FORM-BUILDER consumes / embeds when promoted. (b) FORM-BUILDER masters `nocode_forms` (rename to `forms` once it owns the bare-word), NCDB demotes to embedded_master. (c) Defer until FORM-BUILDER triage. |
| B2-S6 | **Inbound-handoff gap.** NCDB ships zero inbound handoffs despite being a natural target of: iPaaS pushes (Zapier, Make creating records), CRM / sales ops pushing into operational tables, DCG cataloging the schemas, DLP scanning the bases, BI reading them as a source. None of these are loaded. Either NCDB is genuinely a leaf (events fire out but nothing fires in) or the inbound surface has never been authored. | Surface the gap; user owns the scoping call. | (a) Author inbound handoffs from IPAAS / DCG / DLP / BI as a follow-up Phase B extension to NCDB. (b) Treat as report-only; each source domain owes the outbound on its own next audit. (c) Mixed: confirm IPAAS / DCG are obvious owners and route there; defer the others. |

### Bucket 3 - Phase 0 pending (speculative)

Flagship NCDB vendors (`solutions` loaded as primary): Airtable, Baserow, NocoDB, Rows, Stackby. Secondary: Notion, Coda, Quickbase. Missing-from-catalog flagships the audit would add via Phase 0: SmartSuite, SeaTable, Grist, Fibery. Plus already-existing catalog rows `Smartsheet` (id 70) and `ClickUp` (id 598) which should be linked via `solution_domains` (secondary).

The substrate finding: NCDB currently models 5 application-construct masters (bases, record definitions, forms, views, automations) but is missing the **integration substrate** (sync configs, external connections), **user-collaboration substrate** (comments, mentions, share links), **AI-assist substrate** (prompts, generated formulas), and **packaging substrate** (templates, marketplace listings). Most flagships model these as first-class entities.

#### MISSING entities (speculative; Phase 0 needed to verify)

| Entity | Proposed module | Vendor evidence (speculative) |
|---|---|---|
| `nocode_sync_connections` | NCDB-AUTOMATION-SYNC | Airtable Sync, NocoDB connections, SmartSuite sync, Grist Outgoing webhooks. Distinct from `nocode_automations` because connections are reusable. |
| `nocode_share_links` | NCDB-VIEWS-FORMS | Public share URL on a view or form. Airtable share view, Notion public page, Coda share link, NocoDB share view. The actual link record is the DLP-relevant artifact for handoff 702. |
| `nocode_record_comments` | NCDB-SCHEMA-BUILDER | Universal across Airtable, Notion, Coda, SmartSuite. Distinct from notes because comments thread on a specific record. |
| `nocode_templates` | NCDB-SCHEMA-BUILDER | Airtable Universe, Coda Doc Gallery, Notion Templates, SmartSuite App Library. The marketplace / template substrate. |
| `nocode_ai_field_outputs` | NCDB-SCHEMA-BUILDER | Airtable AI fields, Notion AI, Coda AI, SmartSuite AI. Distinct from formulas because outputs are LLM-generated. |
| `nocode_revision_history` | NCDB-SCHEMA-BUILDER | Record-level revision history (Airtable record history, Notion version history). Compliance-relevant. |
| `nocode_workspace_members` | NCDB-SCHEMA-BUILDER (or NCDB-AUTOMATION-SYNC) | Per-base membership / role / share scope. Distinct from platform-level `users` because workspace scope is the granted-access record. |

These would all map to existing flagship product features but were not authored in the original NCDB Phase A load. Phase 0 vendor research would confirm or filter.

### Cross-bucket dependencies

- **B2-S1 (module split)** unlocks B1-S1, B1-S6, B1-S7, B1-S9, B1-S13. Resolve B2-S1 first.
- **B2-S2 (pattern flags)** is independent of B2-S1; can resolve in any order.
- **B2-S3 (regulation coverage)** unlocks a separate compliance pass that would add `nocode_data_subject_requests`, `nocode_consents`, `nocode_retention_policies` to whichever module the user picks; resolve before authoring those entities.
- **B2-S4 (cross-cutting capability scope)** is co-dependent with the LCAP audit 2026-05-30 B2-S4 (`OPERATIONAL-DATA-APPS` cross-cutting). Resolve the two together to keep `capability_domains` consistent.
- **B2-S5 (FORM-BUILDER boundary)** has a downstream effect on B1-S5 (alias drafting): if FORM-BUILDER ends up mastering `nocode_forms`, the form-side aliases move with it. Resolve B2-S5 before B1-S5 loads.
- **B2-S6 (inbound-handoff gap)** is independent of all other Bucket 2 items.
- **Bucket 3** is independent of Bucket 1 and Bucket 2; resolution can wait until after Bucket 1 loads land.

### Per-bucket prompts

**After Bucket 1:** *"14 in-scope fixes. The chain is: B2-S1 must resolve first (module split) so the rest sequence behind it. Approve B1-S1 (modules + DMDOs) now? Reply with the split choice from B2-S1, then I can land B1-S2 through B1-S13 + B1-H1 as a single load."*

**After Bucket 2:** *"6 judgment calls. The split (B2-S1) gates Bucket 1; the rest are independent. Please answer each, especially: (a) the module split, (b) which pattern flags to flip, (c) which regulations to link, (d) the FORM-BUILDER boundary."*

**After Bucket 3:** *"7 speculative entities. Vet via formal Phase 0 vendor research, or eyeball-mode? If eyeball, name which candidates ring true. Note: `nocode_share_links` is likely the right payload for handoff 702 (DLP) and would unlock B1-S11 if loaded."*

### Report-only follow-ups (owed by other domains)

- **LCAP audit 2026-05-30** — owes M1 / M2 cure. Once LCAP modularizes, NCDB handoff 701 (`nocode_record_definition.changed` -> LCAP) backfills `target_domain_module_id` and the B1-H1 row for handoff 701 becomes loadable with a confirmed target module.
- **DLP audit (not yet run)** — owes module attribution for handoff 702 (`nocode_view.shared_externally` -> DLP) and the corresponding APQC PCF tag. DLP is the canonical owner of data-loss-incident classification; NCDB cannot author the cross-domain relationship row or the APQC tag without DLP's M-band footprint.
- **WORK-MGMT** — owes APQC PCF confirmation for handoff 700 (`nocode_automation.triggered`). The trigger fires into a WORK-MGMT module (149) but the PCF id depends on which of `Manage work execution` / `Operate business processes` is canonical; resolution belongs to the WORK-MGMT audit.
- **ITSM** — no owed items; handoff 703 is fully resolvable from NCDB's side (target module 38, PCF id 285).
- **IPAAS / DCG / BI** — likely owe outbound handoffs into NCDB (zero inbound handoffs currently loaded; see B2-S6 for the scoping decision).
- **Catalog-wide** — `Smartsheet` (solution id 70) and `ClickUp` (id 598) should likely be linked to NCDB via `solution_domains` (secondary coverage). This is a small catalog hygiene item, not a structural gap; surface in the gap report for user disposition.

### Candidates queued

Two market candidates surfaced by Pass 2 were queued to `audits/_missing-domains.md` via `scripts/analytics/append_missing_domain.ts`:

| Code | Name | Mention bumped to | Why surfaced |
|---|---|---|---|
| FORM-BUILDER | Form Builder and Online Forms | 1 (new) | Typeform, Jotform, Google Forms, Tally, Formstack, Cognito Forms compete on `nocode_forms` shape as a distinct point-solution market with different buyers (marketing / customer ops, not data modelers). |
| SPREADSHEET-PLATFORM | Online Spreadsheet Platform | 1 (new) | Google Sheets, Excel Online, Quip, Equals, Causal compete as a distinct market from NCDB; the boundary is "cell-grid first" vs "record-table first". Several catalog rows position themselves on the boundary (Rows, Stackby, Smartsheet). |

Neither candidate is loaded as a `domains` row; the queue file is the canonical record. The user triages per the rules in `audits/_missing-domains.md` (promote-as-domain / fold-into-existing / reject).

## 2026-05-31, Continuation: B1 technical fixes

Applied the residual-technical subset of Bucket 1 from the 2026-05-30 audit. Loader: [.tmp_deploy/fix_ncdb_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_ncdb_b1_technical_2026_05_31.ts).

### Applied (4 of 14 B1 items, 17 row writes total)

- **B1-S12** (B9 event_category PATCH) - PATCHed 6 of 7 NCDB trigger_events with the firm enum value the audit names: 724 nocode_base.created -> `lifecycle`; 725 nocode_base.exported -> `signal`; 726 nocode_record_definition.changed -> `state_change`; 728 nocode_view.shared_externally -> `state_change`; 729 nocode_automation.failed -> `signal`; 730 nocode_automation.triggered -> `signal`. Deferred 727 nocode_form.submitted because the audit explicitly hedges between `signal` and `state_change`.
- **B1-S4** (B7 Rule #10 user-edges) - INSERTed 6 `data_object_relationships` rows pointing from `users` (748) to each NCDB master, exactly as the audit pre-specifies. Verb conventions copied from existing user-edge rows (`owned bases`, `authored record definitions / views / forms / automations`, `submitted forms`). All `one_to_many`, `reference`, `owner_side='source'`. The `submitted forms` second edge for `nocode_forms` covers the responder pattern the audit calls out.
- **B1-S3** (B6 intra-domain DOR) - INSERTed 4 of the 5 audit-proposed intra-domain edges. Loaded: bases `contains record definitions` (composition, 1:N, owner=source, required); record_definitions `presented by views` (1:N reference); record_definitions `written to by forms` (1:N reference); record_definitions `triggers automations` (M:N association). Deferred the fifth edge (views `source_of` forms) because the audit text qualifies it with "optional, some platforms" which is a judgment call.
- **B1-H1** (APQC tagging) - INSERTed 1 of the 4 proposed `handoff_processes` rows: handoff 703 (NCDB -> ITSM `nocode_automation.failed`) -> process 285 (`Manage change deployment control`, PCF 8.6.3, `proposal_source='agent_curated'`). Audit names both the handoff id and the process id with confident reuse from the LCAP 2026-05-30 audit. Deferred 700 (PCF candidate set unresolved, audit says "surface candidate PCF rows for user pick"), 701 (LCAP `target_domain_module_id` NULL, defer to LCAP M1 cure), 702 (audit defers entirely to DLP audit).

### Deferred (10 of 14 B1 items)

- **B1-S1** (M1/M2/M4/M6 - 3 modules + 8 DMC + 5 DMDO rows) - new modules; gated on B2-S1 user pick (3 / 2 / 4-module split).
- **B1-S2** (B4 pattern flag flips) - audit routes to Bucket 2 (B2-S2); flag flips are workflow-shape judgment per Rule #12.
- **B1-S5** (B11 ~22 aliases) - bulk alias inserts without audit pre-specifying exact tuples per row, plus B2-S5 (FORM-BUILDER boundary) gates the form-side aliases.
- **B1-S6** (B12 ~20 lifecycle states) - depends on B1-S1 modules first (`domain_module_id` required per M5).
- **B1-S7** (F1 legacy skill retirement, 3 new module-anchored skills) - new skills + DELETE of skill 86; needs B1-S1 modules first.
- **B1-S8** (A4 catalog_tagline / catalog_description) - Rule #20 buyer-facing prose, surface to user first.
- **B1-S9** (B10b PATCH source FKs on 4 outbound handoffs) - depends on B1-S1 modules.
- **B1-S10** (B10b PATCH target FKs on handoffs 701, 702) - LCAP and DLP defers, no resolvable target modules.
- **B1-S11** (B8 cross-domain DOR) - audit hedges target masters ("TBD: most likely `work_items` or `tasks`"); not user-edges per Rule #10.
- **B1-S13** (B9b intra-domain handoffs) - blocked by B1-S1 modules.

No JWT errors. No `notes` writes. No `record_status` writes (all rows take DB default `new`). No vendor names in any text. Frontmatter unchanged.

## 2026-05-31, Audit

### Summary

- Current footprint: 0 `domain_modules` rows (primary or host-junction), 5 `domain_data_objects` masters (`nocode_bases` 241, `nocode_record_definitions` 242, `nocode_forms` 712, `nocode_views` 713, `nocode_automations` 714), 8 capabilities (6 NCDB-prefixed plus 2 cross-cutting), 8 solutions (5 primary, 3 secondary), 0 regulations, 7 trigger_events, 4 outbound + 0 inbound cross-domain handoffs, 0 lifecycle states, 0 data_object_aliases, 0 domain_aliases, 10 data_object_relationships (6 users-edges + 4 intra-domain DOR loaded in the 2026-05-31 continuation), 1 legacy `domain_id`-anchored `system` skill (`ncdb-system`, id 86) with 5 `query_*` skill_tools (all `coverage_tier=platform`), 0 roles, 0 `domain_module_capabilities` rows, 0 `handoff_processes` rows on handoffs 700, 701, 702 (handoff 703 carries 1 `agent_curated` tag at process 285).
- Market surface basis: prior 2026-05-30 vendor enumeration (Airtable, Notion, Coda, SmartSuite, Smartsheet, Quickbase, Baserow, NocoDB, SeaTable, Grist, Fibery, Stackby, Rows) stands; no new Phase 0 pass run in this Validate.
- Bucket 1 (in-scope, agent fixable): 10 items.
- Bucket 2 (surface-for-user, judgment): 6 items.
- Bucket 3 (Phase 0 pending, speculative): 7 items.
- next_action_by: `user` (B2-S1 module-split pick gates 6 Bucket 1 items; no b1a item is free of a Bucket 2 decision other than B1-S8 which itself is a Rule #20 user-approval gate).

### Structural pass bands

- **S band (sweep):** zero-row anomalies persist on `domain_modules` (M1), `domain_module_capabilities` (M4 catalog-wide for every NCDB capability), `data_object_lifecycle_states` (B12), `data_object_aliases` (B11), `domain_regulations`, `domain_aliases`, `roles` (E1 vacuously blocked by M1), inbound `handoffs` (B10 report-only).
- **A band:** A1 passes (all 7 metadata fields populated). A2 passes (8 capabilities). A3 passes (8 solutions, 5 primary). **A4 hard-fail** (`catalog_tagline=""` and `catalog_description=""`). A5 skipped.
- **M band:** **M1 / M2 / M4 / M6 hard-fail.** Zero modules + 8 capabilities. M5 vacuously passes. M7 vacuously passes (no `domain_module_data_objects` rows). M8 vacuous (no modules to score).
- **B band:** B1 passes (5 masters). B2 passes (all masters carry singular/plural labels). **B3 partial** (5 masters use `nocode_` prefix per Rule #9 `<slug>_<noun>` shape, `is_canonical_bare_word=false` correct, `naming_authority_rationale=""` correct, no canonical-bare-word collision). **B4 hard-fail** (every pattern flag remains false default; the 2026-05-30 audit re-routed flag re-evaluation to B2-S2 which has not been answered). B5 vacuous (no embedded_master rows). **B6 partial-pass** (4 of 5 audit-proposed intra-domain edges loaded 2026-05-31; the fifth edge `nocode_views source_of nocode_forms` was deferred as audit-hedged). **B7 passes** (6 users-edges loaded 2026-05-31, ids 1676-1681 covering `owns / authored bases, record_definitions, views, forms, automations` plus `submitted forms` for the responder pattern). **B8 hard-fail** (4 outbound handoffs but zero cross-domain `data_object_relationships` rows authored). **B9 partial-fail** (7 events; 6 of 7 PATCHed 2026-05-31 to firm enum values; event 727 `nocode_form.submitted` still `event_category=""` because the audit hedged between `signal` and `state_change`). **B9b hard-fail** (no intra-domain handoffs; vacuously blocked behind M1). **B10b hard-fail** (4 outbound handoffs all have NULL `source_domain_module_id` because NCDB has no modules; handoffs 701 + 702 also have NULL `target_domain_module_id`). **B11 hard-fail** (zero aliases on any master). **B12 hard-fail** (zero lifecycle states; gated on B1-S1 modules first per M5).
- **C band:** C1 passes (1 owner Business Operations, 3 contributors Marketing / Human Resources / Sales Operations, 1 consumer Data and Analytics). C2 vacuous (no capability-level overrides).
- **D band:** D1 not exercised (no fresh load).
- **E band:** E1 vacuous (M1 blocks role authoring; the 2-module floor cannot be tested without modules). E2-E5 vacuous.
- **F band:** **F1 partial-pass-by-transitional-license** (legacy `domain_id`-anchored skill 86 remains; F1 currently passes only because no module-level system skill has been authored yet, will hard-fail once B1-S1 lands modules + B1-S7 retires the legacy row). **F2 hard-fail** (zero `domain_module_id`-anchored system skills, vacuously blocked by M1). F3 passes against the legacy skill (5 `query_*` tools all `coverage_tier=platform`). F4 passes (all 5 tools are `operation_kind=query` with `data_object_id` set). F5 reads 100% strict against the legacy skill but is meaningless until per-module skills exist. F7 vacuous (no channel primitives).
- **H band:** **H1 partial-fail.** 4 cross-domain handoffs; 1 of 4 carries an `agent_curated` tag (handoff 703 -> process 285 `Manage change deployment control`, loaded 2026-05-31). 3 of 4 remain untagged (handoff 700 awaits PCF candidate pick per B2 surfacing; 701 defers to LCAP M-cure; 702 defers to DLP audit). Headline approved count: 0.

### Bucket 1 - In-scope confirmed gaps

The 2026-05-31 continuation cleared 4 of the 14 B1 items from the 2026-05-30 audit (B1-S12 event PATCH on 6 of 7, B1-S4 user-edges, B1-S3 4 of 5 intra-domain DOR, B1-H1 handoff 703 tag). The 10 deferred items below are carried forward verbatim. Items remain in Bucket 1 because each is structurally agent-fixable once the gating Bucket 2 decision (B2-S1 module split) lands; until then most are blocked.

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 / M2 / M4 / M6 hard-fail | Zero `domain_modules` rows; 8 capabilities. Rule #14 requires >=1 full module per domain and >=2 modules for domains with >=3 capabilities. Audit-proposed 3-module split: NCDB-SCHEMA-BUILDER (masters `nocode_bases`, `nocode_record_definitions`), NCDB-VIEWS-FORMS (masters `nocode_views`, `nocode_forms`), NCDB-AUTOMATION-SYNC (masters `nocode_automations`). Decision gated on B2-S1. | Author 3 `domain_modules` + 8 `domain_module_capabilities` + 5 `domain_module_data_objects` rows once B2-S1 resolves. |
| B1-S2 | B4 pattern flag re-evaluation (Rule #12) | All 5 masters have `has_personal_content / has_submit_lock / has_single_approver` at false default; Rule #12 requires positive re-evaluation. Audit proposes flips: `nocode_forms.has_personal_content=true`, `nocode_record_definitions.has_submit_lock=true`. Decision gated on B2-S2. | After B2-S2 user answer, PATCH the flips. |
| B1-S5 | B11 hard-fail | Zero `data_object_aliases`. Approximately 22 alias rows across 5 masters (4-5 per master). Gated on B2-S5 (FORM-BUILDER boundary) which determines whether form-side aliases attach to `nocode_forms` under NCDB or migrate with FORM-BUILDER. | After B2-S5, draft alias rows and load via cluster-drafts pattern. |
| B1-S6 | B12 hard-fail | Zero `data_object_lifecycle_states`. ~20 states across 5 masters. M5 requires `domain_module_id` per state, so depends on B1-S1 modules. | After B1-S1, draft state machines and load via focused loader. |
| B1-S7 | F1 legacy system skill retirement | Skill 86 (`ncdb-system`) is legacy domain-anchored. Once B1-S1 lands modules, F1 hard-fails until skill 86 is retired and 3 new module-anchored system skills are authored. The 5 existing `skill_tools` rows re-anchor to the new skills per audit-proposed split. Floor per Rule #17 is 5-20 tools per skill; current 5 query-only is below the floor. | After B1-S1, author 3 module-anchored skills, migrate the 5 `skill_tools` rows + add `mutate_*` and `side_effect` tools, DELETE skill 86. |
| B1-S8 | A4 hard-fail (Rule #20) | `catalog_tagline=""` and `catalog_description=""`. Rule #20 requires both in buyer voice. Audit-proposed wording exists in 2026-05-30 history but Rule #20 requires user review BEFORE write. | Draft per audit, surface to user for approval, PATCH after approval. |
| B1-S9 | B10b - NULL `source_domain_module_id` on 4 outbound handoffs | All 4 outbound NCDB handoffs (700, 701, 702, 703) carry NULL `source_domain_module_id`. After B1-S1 lands, derivation per B10b rule: 700 -> NCDB-AUTOMATION-SYNC (event data_object 714), 701 -> NCDB-SCHEMA-BUILDER (242), 702 -> NCDB-VIEWS-FORMS (713), 703 -> NCDB-AUTOMATION-SYNC (714). | Single PATCH pass on 4 rows after B1-S1 lands. |
| B1-S10 | B10b - NULL `target_domain_module_id` on handoffs 701, 702 | Handoff 701 target LCAP (37): LCAP has zero modules per LCAP audit; unresolvable until LCAP M1 cures. Handoff 702 target DLP (139): defer to DLP audit. | Defer 701 to LCAP, 702 to DLP. |
| B1-S11 | B8 hard-fail - missing cross-domain `data_object_relationships` | 4 outbound handoffs, zero cross-domain DOR rows authored. Targets for handoffs 700 and 703 resolvable now (`nocode_automations creates <work_mgmt_master>` and `nocode_automations opens service_incidents`); 701 and 702 defer to LCAP / DLP. Audit hedges target master for handoff 700 between `work_items` / `tasks`. | After B2 decision on handoff 700 target master, author 2 resolvable rows; defer 701 + 702 as report-only. |
| B1-S13 | B9b - intra-domain cross-module handoffs | Zero intra-domain handoffs. Once B1-S1 + the 4 loaded intra-domain DOR are settled, derive 3 cross-module pairs: form submission writes record definition (NCDB-VIEWS-FORMS -> NCDB-SCHEMA-BUILDER on `nocode_form.submitted`); automation triggered by record change (NCDB-SCHEMA-BUILDER -> NCDB-AUTOMATION-SYNC on `nocode_record_definition.changed`); automation failure surfaces in schema-builder author view (NCDB-AUTOMATION-SYNC -> NCDB-SCHEMA-BUILDER on `nocode_automation.failed`). | Author 3 intra-domain handoff rows after B1-S1. |

#### Residual B1 sub-items from the 2026-05-31 continuation

These are agent-solvable directly (no Bucket 2 gate); they finish work the continuation hedged on:

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S12-RES | B9 event_category for event 727 | Event 727 `nocode_form.submitted` still has `event_category=""`. The 2026-05-31 continuation deferred this single event because the audit hedged between `signal` and `state_change`. The form-submission shape semantically creates a record (the submitted form materializes as a new row in the record definition), which is closer to `state_change` (target master state advances), but a form submission also reads as a `signal` event for downstream observers. Single PATCH after a directional pick. | Single PATCH on row 727. |
| B1-S3-RES | B6 fifth intra-domain edge | The audit-hedged 5th intra-domain edge `nocode_views source_of nocode_forms` (M:N optional, only on platforms where forms inherit view filter context). The 2026-05-31 continuation deferred this single row. Either insert it as optional / not-required, or accept the omission as architectural correctness for the catalog's neutral substrate. | Single INSERT or explicit defer. |
| B1-H1-RES | H1 APQC tagging for handoff 700 | The 2026-05-30 audit calls out a candidate-PCF ambiguity between `Manage business processes` (PCF 20827 family) vs `Operate business processes`. A single read of `/processes?process_name=ilike.*operate%20business%20process*&source_framework=eq.apqc_pcf_cross_industry&select=id,process_name,external_id,hierarchy_level` plus the sibling family resolves the candidate set; pick the better L3, then INSERT one `handoff_processes` row. | Run the lookup, pick L3, INSERT one `handoff_processes` row. |

#### Bucket 1 count

| Finding type | Count |
| --- | --- |
| STRUCTURAL (M1/M2/M4/M6 single item) | 1 |
| STRUCTURAL (B4 pattern flags) | 1 |
| STRUCTURAL (B11 aliases) | 1 |
| STRUCTURAL (B12 lifecycle states) | 1 |
| STRUCTURAL (F1 legacy skill retirement) | 1 |
| STRUCTURAL (A4 catalog UX backfill) | 1 |
| BOUNDARY (B10b NULL source FKs) | 1 |
| BOUNDARY (B10b NULL target FKs in-scope subset) | 1 |
| BOUNDARY (B8 cross-domain relationships) | 1 |
| BOUNDARY (B9b intra-domain handoffs) | 1 |
| RESIDUAL (B9 event 727) | 1 |
| RESIDUAL (B6 fifth edge) | 1 |
| RESIDUAL (APQC tag handoff 700) | 1 |
| Bucket 1 total | 13 |

The 2026-05-30 audit counted 14 Bucket 1 items; the 2026-05-31 continuation cleared 4 (whole-item: B1-S4 user-edges, partial: B1-S12, B1-S3, B1-H1). The 3 partial-residuals re-enter as RESIDUAL items at finer granularity (the work was almost done, single PATCH / single INSERT to finish).

### Bucket 2 - Surface-for-user (judgment calls)

Carried forward from the 2026-05-30 audit; none resolved in the 2026-05-31 continuation.

| ID | Question | Why agent cannot answer | Options |
|---|---|---|---|
| B2-S1 | Module split shape. Audit-proposed 3-module split (NCDB-SCHEMA-BUILDER, NCDB-VIEWS-FORMS, NCDB-AUTOMATION-SYNC) vs alternatives (2-module or 4-module). | Modularization is a deploy-shape decision the user owns. Vendor surface supports several splits. | (a) 3-module as proposed. (b) 2-module split. (c) 4-module split. (d) user proposes. |
| B2-S2 | Pattern flag re-evaluation per Rule #12 / B4. Audit-proposed flips: `nocode_forms.has_personal_content=true`, `nocode_record_definitions.has_submit_lock=true`. | Workflow-shape judgment the user owns. | Per-flag yes/no per master. |
| B2-S3 | Regulation coverage. Zero `domain_regulations`. Candidates: GDPR, CCPA, HIPAA, SOC 2. | Market-scoping decision the user owns; no-code-database market straddles many regulated industries without being itself a regulated category. | (a) GDPR + CCPA mandatory. (b) GDPR + CCPA + HIPAA mandatory. (c) None. (d) User proposes. |
| B2-S4 | Cross-cutting capability scope. Should `OPERATIONAL-DATA-APPS` and `SEMANTIC-MODELING` stay linked to NCDB? Co-dependent with LCAP 2026-05-30 audit B2-S4. | Cross-cutting capability scope is a market-test decision the user owns. | (a) Keep both unchanged. (b) Drop `SEMANTIC-MODELING`. (c) Expand each to full domain set. |
| B2-S5 | FORM-BUILDER boundary. Keep `nocode_forms` mastered by NCDB and let FORM-BUILDER `embedded_master`, or master `nocode_forms` in FORM-BUILDER and demote NCDB. | Naming arbitration plus market-boundary judgment the user owns. | (a) NCDB keeps mastery; FORM-BUILDER embeds. (b) FORM-BUILDER masters; NCDB embeds. (c) Defer until FORM-BUILDER triage. |
| B2-S6 | Inbound-handoff gap. Zero inbound handoffs to NCDB despite being a natural target of iPaaS / CRM / DCG / DLP / BI. | Scoping call the user owns. | (a) Extend NCDB Phase B with inbound handoffs. (b) Treat as report-only. (c) Mixed. |

### Bucket 3 - Phase 0 pending (speculative)

Carried forward verbatim from 2026-05-30 audit. No Phase 0 vendor research has been run; all items remain speculative.

| Entity | Proposed module | Vendor evidence (speculative) |
|---|---|---|
| `nocode_sync_connections` | NCDB-AUTOMATION-SYNC | Distinct from `nocode_automations` because connections are reusable across automations. |
| `nocode_share_links` | NCDB-VIEWS-FORMS | The public link record; DLP-relevant payload candidate for handoff 702. |
| `nocode_record_comments` | NCDB-SCHEMA-BUILDER | Universal collaboration substrate. |
| `nocode_templates` | NCDB-SCHEMA-BUILDER | Marketplace / template substrate. |
| `nocode_ai_field_outputs` | NCDB-SCHEMA-BUILDER | LLM-generated field outputs distinct from formula fields. |
| `nocode_revision_history` | NCDB-SCHEMA-BUILDER | Compliance-relevant. |
| `nocode_workspace_members` | NCDB-SCHEMA-BUILDER or NCDB-AUTOMATION-SYNC | Per-base membership distinct from platform-level `users`. |

### Cross-bucket dependencies

- B2-S1 (module split) gates B1-S1, B1-S6, B1-S7, B1-S9, B1-S13. Resolve B2-S1 first.
- B2-S2 (pattern flags) is independent of B2-S1.
- B2-S3 (regulation coverage) unlocks a separate compliance pass.
- B2-S4 is co-dependent with the LCAP 2026-05-30 audit B2-S4.
- B2-S5 (FORM-BUILDER boundary) gates B1-S5 (aliases) form-side.
- B2-S6 (inbound-handoff gap) is independent.
- The 3 RESIDUAL Bucket 1 items (B1-S12-RES, B1-S3-RES, B1-H1-RES) are independent of every Bucket 2 question.
- Bucket 3 is independent of Bucket 1 and Bucket 2.

### Report-only follow-ups (owed by other domains)

- LCAP audit owes M1 / M2 cure. Once LCAP modularizes, NCDB handoff 701 backfills `target_domain_module_id`.
- DLP audit owes module attribution for handoff 702 plus the corresponding APQC tag.
- WORK-MGMT audit owes APQC PCF confirmation for handoff 700 (`nocode_automation.triggered`).
- ITSM: no owed items; handoff 703 fully resolved.
- IPAAS / DCG / BI: likely owe outbound handoffs into NCDB (see B2-S6).
- Catalog-wide: `Smartsheet` (solution 70) and `ClickUp` (598) should likely be linked to NCDB via `solution_domains` (secondary).

No JWT errors. No `notes` writes. No `record_status` writes. No vendor names in any non-commerce text.

## 2026-06-02 Audit (modularization)

### Summary

NCDB is **No-Code Database** (id 134, crud 80): spreadsheet-database hybrids that let non-developers model structured data, link records across tables, build forms / views / dashboards, and automate without code. Bought self-serve by citizen developers in marketing, ops, HR, and PMO, expanding to enterprise via Business / Enterprise tiers. Explicitly distinct from LCAP (no managed app runtime / environments / version pipeline / compiled UI), from BI (no warehouse, no analytical semantic layer), and from work management (the data model is the buy reason, not the project view).

This pass executed the **modularization** scope only (B1A-BUILD / B1B-S1): authored the full `domain_modules` set, linked the existing capabilities, and assigned the existing master data_objects at their existing role + necessity. No new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships were created. The 2026-05-30 audit's B2-S1 option (a) 3-module split was the proven design and was adopted as-is.

### Modules authored (3 full)

| Module id | Code | Capabilities | Masters |
|---|---|---|---|
| 282 | NCDB-SCHEMA-BUILDER (Visual Schema and Linked Records) | NCDB-FLEX-SCHEMA (320), NCDB-LINKED-RECORDS (321), NCDB-FORMULAS (323), SEMANTIC-MODELING (197) | nocode_bases (241), nocode_record_definitions (242) |
| 283 | NCDB-VIEWS-FORMS (Views and Form Capture) | NCDB-VIEWS (322), NCDB-FORM-CAPTURE (324), OPERATIONAL-DATA-APPS (201) | nocode_views (713), nocode_forms (712) |
| 284 | NCDB-AUTOMATION-SYNC (Automation and External Sync) | NCDB-SYNC-EXTERNAL (325) | nocode_automations (714) |

All 3 modules are `module_kind=full`. `record_status`, `catalog_tagline`, `catalog_description` omitted on every insert. `notes` empty on every DMC and DMDO row. No vendor / product names in any module name or description.

### Master pre-check (catalog-wide, mandatory)

Queried `/domain_module_data_objects?data_object_id=eq.<id>&role=eq.master` for all 5 masters (241, 242, 712, 713, 714) before writing. **Zero pre-existing master rows for any of the 5** anywhere in the catalog, so each was assigned `master` here, each in exactly one NCDB module. No demotions to `embedded_master` were required. Roles + necessity preserved verbatim from the legacy `domain_data_objects` rollup (all master / required).

### Verification (live, post-load)

- M1 / M2 cured: 3 full modules (was 0).
- M4: every capability placed in exactly 1 module (8 of 8: 197/320/321/323 -> 282; 201/322/324 -> 283; 325 -> 284).
- M6: every module has >=1 capability AND >=1 data_object; no empty module.
- M7 (in-domain + catalog-wide): each of the 5 masters appears in exactly one master row, all under domain 134's modules. Single-master invariant holds.
- Rule #14: 7 native + cross-cutting capabilities -> 3 full modules (within the 2-4 aim).

### Deferred (out of this pass's scope, owed by a later NCDB pass)

The modularization unblocks but does not execute the following carried-forward items from the 2026-05-31 audit. They are now agent-solvable (the module gate is cleared):

- **B1B-S6** (~20 `data_object_lifecycle_states`): now unblocked, each state's `domain_module_id` resolves to the realizing module (242/241 -> 282, 712/713 -> 283, 714 -> 284).
- **B1B-S7** (3 module-anchored system skills per Rule #17 + retire legacy domain-anchored skill 86): now unblocked.
- **B1B-S9** (PATCH `source_domain_module_id` on 4 outbound handoffs): now derivable (700 -> 284, 701 -> 282, 702 -> 283, 703 -> 284).
- **B1B-S13** (3 intra-domain cross-module handoffs): now unblocked.
- **B1B-S2** (B4 pattern flags), **B1B-S5** (~22 aliases), **B1B-S8** (A4 catalog UX), **B1B-S11** (cross-domain DOR), **B2-S1..S6** judgment calls: unchanged by this pass.

### Flagged gaps (not filled this pass)

- Per-module **system skills** are absent (Rule #17 -> F2/F3): the 3 new modules each need exactly one `domain_module_id`-anchored system skill; legacy skill 86 must then be retired. Recorded as b1a B1A-MOD-SKILLS.
- **Catalog UX** (M8 / A4): `catalog_tagline` and `catalog_description` still empty; surface drafts to user before write (Rule #20). Recorded as b1a B1A-CATALOG-UX.
- **Missing-master candidates** (b3, carried forward from prior audit): nocode_sync_connections, nocode_share_links, nocode_record_comments, nocode_templates, nocode_ai_field_outputs, nocode_revision_history, nocode_workspace_members.

No JWT errors. No `notes` writes. No `record_status` writes. No vendor names in any non-commerce text. No em-dashes.


## 2026-06-06 - b1a execution

Executed the two agent-solvable b1a items against the live `domain_map` module (id 1001) for NCDB (domain 134). semantius CLI only; no MCP calls. No JWT errors. No `notes` writes. No `record_status` writes (every insert omitted it; DB default `new`). No vendor / product names in any non-commerce text. No em-dashes. American English.

### B1A-MOD-SKILLS - DONE

Authored 3 module-anchored system skills (one per module per Rule #17), migrated the 5 existing query `skill_tools`, added domain-specific mutate tools plus reusable side_effect/abstraction links to clear the floor, then retired legacy domain-anchored skill 86.

System skills created (`skills`, `skill_type=system`, `domain_id=134`):

| Skill id | skill_name | domain_module_id |
|---|---|---|
| 354 | ncdb_schema_builder_agent | 282 |
| 355 | ncdb_views_forms_agent | 283 |
| 356 | ncdb_automation_sync_agent | 284 |

New domain-specific tools created (`tools`, all `coverage_tier=platform`, `operation_kind=mutate`):

| Tool id | tool_name | data_object_id |
|---|---|---|
| 1733 | create_nocode_base | 241 |
| 1734 | create_nocode_record_definition | 242 |
| 1735 | update_nocode_record_definition | 242 |
| 1736 | create_nocode_view | 713 |
| 1737 | create_nocode_form | 712 |
| 1738 | publish_nocode_form | 712 |
| 1739 | create_nocode_automation | 714 |
| 1740 | update_nocode_automation | 714 |

Reusable catalog-wide tools LINKED (not created), re-read by tool_name immediately before linking per scope rule: `notify_person` (913, side_effect, platform), `invoke_webhook` (46, side_effect, external).

`skill_tools` result (16 rows across the 3 skills):
- Skill 354 (module 282): query_nocode_bases (595, req), query_nocode_record_definitions (596, req), create_nocode_base (1733, req), create_nocode_record_definition (1734, req), update_nocode_record_definition (1735, req). 5 tools.
- Skill 355 (module 283): query_nocode_forms (831, req), query_nocode_views (832, req), create_nocode_view (1736, req), create_nocode_form (1737, req), publish_nocode_form (1738, req), notify_person (913, opt). 6 tools.
- Skill 356 (module 284): query_nocode_automations (833, req), create_nocode_automation (1739, req), update_nocode_automation (1740, req), invoke_webhook (46, req), notify_person (913, opt). 5 tools.

Migration mechanics: the 5 existing query `skill_tools` rows were re-pointed by PATCH `skill_id` (preserving the rows), not deleted/recreated:
- skill_tool 696 (tool 595 query_nocode_bases): skill_id 86 -> 354.
- skill_tool 697 (tool 596 query_nocode_record_definitions): skill_id 86 -> 354.
- skill_tool 993 (tool 831 query_nocode_forms): skill_id 86 -> 355.
- skill_tool 994 (tool 832 query_nocode_views): skill_id 86 -> 355.
- skill_tool 995 (tool 833 query_nocode_automations): skill_id 86 -> 356.

Legacy skill 86 DELETED after its skill_tools were re-pointed away (zero remaining at delete time). Prior row snapshot (reversibility):
- `skills` id 86: skill_name `ncdb-system`, skill_type `system`, domain_id 134, domain_module_id NULL, process_id NULL, role_id NULL, record_status `new`, description "System skill for No-Code Database - runtime workflows over the domain's master data, derived from masters + cross-domain handoffs.", created_at 2026-05-22T16:38:14Z.

Verification: F2 = 3 system skills (one per module 282/283/284); F1 = 0 legacy `domain_id`-anchored system skills remaining; F3 = every skill >=1 skill_tool (5/6/5); F4 invariant holds (every query/mutate carries data_object_id, every side_effect carries NULL). Semantius scores now computable for all 3 modules.

### B1A-CATALOG-UX - DONE

Per revised Rule #20 (write buyer-voice copy straight into EMPTY catalog fields; record_status carries the review signal; do not park drafts in history; empty-guard per field), wrote `catalog_tagline` + `catalog_description` into the empty fields on the domain row and all 3 modules. All 4 rows / 8 fields were confirmed empty before write (empty-guard applied; no non-empty value was overwritten). record_status left at `new` on every row.

| Row | catalog_tagline written | catalog_description written |
|---|---|---|
| domains 134 (NCDB) | yes | yes (3 paragraphs) |
| domain_modules 282 (NCDB-SCHEMA-BUILDER) | yes | yes (2 paragraphs) |
| domain_modules 283 (NCDB-VIEWS-FORMS) | yes | yes (2 paragraphs) |
| domain_modules 284 (NCDB-AUTOMATION-SYNC) | yes | yes (2 paragraphs) |

Domain tagline written: "Build a database without code. Model your data, capture it through forms, view it your way, and automate the rest." (the audit-proposed candidate; buyer voice, no vendor names, no em-dashes). All copy in buyer voice (workflow + value), not analyst voice.

### Nothing skipped in b1a

Both b1a items fully resolved. The b1b / b2 / b3 items remain blocked / user-judgment / research-pending and were not touched this pass (out of scope: blocked by user_decision or by other domains' audits). B1B-S6 (lifecycle states) remains blocked-on-dependency in state.yaml; note it was previously sequenced behind the system-skill pass (now done) but its own gating note in state.yaml keeps it in b1b, so it was not executed here.
