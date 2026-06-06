# LCAP audit history

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- **Current footprint:** **0** `domain_modules` rows (M1 / M2 hard-fail catalog-wide); 5 `domain_data_objects` masters (`extend_apps` 220, `extend_business_objects` 221, `extend_workflows` 222, `extend_pages` 715, `extend_data_sources` 716); 7 capabilities (`LCAP-VISUAL-MODELING`, `LCAP-MANAGED-RUNTIME`, `LCAP-INTEGRATION-CONNECTORS`, `LCAP-WORKFLOW-AUTO`, `LCAP-LIFECYCLE-MGMT`, `LCAP-AI-ASSIST`, cross-cutting `OPERATIONAL-DATA-APPS`); 16 solutions (15 primary, 1 secondary); 7 trigger_events on LCAP masters (all `event_category=""`); 4 outbound + 1 inbound cross-domain handoffs; **0** lifecycle states; **0** data_object_aliases; **0** data_object_relationships (intra or cross-domain on LCAP masters); 1 legacy `domain_id`-anchored `system` skill (`lcap-system`, id 79) with 5 `query_*` skill_tools and no module attribution; 0 roles; 0 `domain_module_capabilities` rows for any LCAP capability anywhere in the catalog.
- **Vendor-surface basis:** flagship LCAP / enterprise low-code vendors enumerated in Pass 2 - OutSystems, Mendix, Microsoft Power Platform, ServiceNow App Engine / Now Platform, Appian, Salesforce Platform, Pega, Oracle APEX, Quickbase, Retool, Zoho Creator, Kissflow, Creatio, Workday Extend. All 14 are already in `solutions` and linked via `solution_domains` (15 primary + 1 secondary).
- **Bucket 1 (in-scope, agent fixable):** 15 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 11 items.

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO, ranked by edge weight):

| Neighbor | Out | In | DMDO cross-refs | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| APP-PAAS | 1 | 0 | 0 | 0 | 1 | Lightweight |
| IPAAS | 1 | 0 | 0 | 0 | 1 | Lightweight |
| DCG | 1 | 0 | 0 | 0 | 1 | Lightweight |
| ITSM | 1 | 0 | 0 | 0 | 1 | Lightweight |
| NCDB | 0 | 1 | 0 | 0 | 1 | Lightweight |

No neighbor reaches edge weight >=3, so no pairwise deep-dive runs in this audit. The handoff substrate is too thin to warrant full 5-section reconciliation against any single neighbor; this is itself a finding (see B3-M5).

Structural pass bands: 
- **S band (sweep)**: zero-row anomalies on `domain_modules` (M1), `capability_domains` to `domain_module_capabilities` (M4), `data_object_lifecycle_states` (B12), `data_object_aliases` (B11), `data_object_relationships` (B6 / B7 / B8), `roles` (E1 vacuously passes only because M1 fails first).
- **A band**: A1 passes (all 7 domain metadata fields populated; note: `domains.business_logic` carries a pre-existing U+2014 em-dash from a prior load, flagged as a separate report-only cleanup for the catalog-wide em-dash sweep). A2 passes (7 capabilities). A3 passes (16 solutions). A5 skipped (not requested).
- **M band**: **M1 / M2 / M4 / M6 hard-fail**. Zero modules + 7 capabilities = the entire M-band is broken. Every downstream concern (Phase B per-module attribution, Phase E roles, Phase F skill / tools, Phase H APQC tagging at module granularity) inherits the gap. M5 vacuously passes (no states to attribute).
- **B band**: B1 passes (5 masters). B2 passes (every master has singular + plural labels). B3 needs decision (5 bare-word masters now prefixed `extend_*`, but the prefix is third-party product terminology, see Bucket 2). B4 hard-fail (every pattern flag is the false default with no positive re-evaluation). B5 vacuously passes (no embedded_masters). **B6 hard-fail** (zero intra-domain relationships). **B7 hard-fail** (zero `users` edges). B8 partial (4 outbound handoffs but zero cross-domain relationships authored, so no payload-target verbs exist). **B9 partial-fail** (7 trigger_events with empty `event_category`, violating Rule #13). **B9b hard-fail** (no intra-domain handoffs, but this is blocked behind M1 / M2). **B10b hard-fail** (3 of 4 outbound handoffs have NULL `target_domain_module_id`; all 4 have NULL `source_domain_module_id` because LCAP has no modules; inbound from NCDB has NULL on both sides). **B11 hard-fail** (zero aliases on any master; LCAP masters carry vendor-specific naming where aliases are essential). **B12 hard-fail** (zero lifecycle states; every master has an obvious state machine: draft / published / deprecated / retired).
- **C band**: C1 partial (1 owner but on "IT Infrastructure" which is NOT on the canonical 20-function spine: spine names "IT Operations"). C2 vacuous (no capability-level overrides loaded; expected if all capabilities follow the domain's RACI).
- **D band**: D1 not exercised (no fresh load).
- **E band**: E1 vacuous (single-module floor fails first; M2 blocks role authoring).
- **F band**: **F1 hard-fail** (legacy `domain_id`-anchored `system` skill `lcap-system` remains; per Rule #17 every module needs its own system skill, but no modules exist yet so F1 cannot be fully cured until M1 / M2 cure). **F2 hard-fail** (zero `domain_module_id`-anchored system skills, vacuously blocked by M1). F3 passes against the legacy skill (5 `query_*` tools, all `coverage_tier=platform`). F4 passes (all 5 tools are `operation_kind=query` with `data_object_id` set). F5 reads as 100% strict against the legacy skill, but the headline number is meaningless until the per-module system skills exist. F7 vacuous (no channel primitives linked).
- **H band**: **H1 hard-fail**. 5 cross-domain handoffs (4 out + 1 in); zero `handoff_processes` rows; zero agent_curated tags; zero deferrals recorded. Volume target for the audit: ~2.5 to 4 agent_curated tags proposed (0.5N to 0.8N for N=5). Audit proposes 4 below.

**The headline finding:** LCAP is a marketing-tier row. It carries `domains` metadata, capabilities, solutions, 5 data_objects with descriptions, 7 trigger events, and a domain-level system skill, but the **M / B / E / F / H structural layers are essentially empty**. Without `domain_modules` rows, every downstream layer is uncomputable. The deployable surface is zero. This is exactly the silently-thin Phase-A load pattern the per-domain completeness checklist exists to catch.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 / M2 / M4 / M6 hard fail** | **Zero `domain_modules` rows for LCAP, but 7 capabilities exist.** Rule #14 requires >=1 full module per domain, and >=2 modules for domains with >=3 capabilities. Rule #14 also requires every capability to have >=1 realizing module (M4). The LCAP catalog row currently presents as a marketing entry only: no deployable unit. Vendor surface implies a clean 2-module split: **LCAP-VISUAL-COMPOSITION** (visual modeling, page authoring, business object schema, data source binding, pre-built connectors; realizes `LCAP-VISUAL-MODELING`, `LCAP-INTEGRATION-CONNECTORS`, `LCAP-AI-ASSIST`, `OPERATIONAL-DATA-APPS`; masters `extend_apps`, `extend_pages`, `extend_business_objects`, `extend_data_sources`) and **LCAP-RUNTIME-LIFECYCLE** (managed runtime, workflow execution, app lifecycle management; realizes `LCAP-MANAGED-RUNTIME`, `LCAP-WORKFLOW-AUTO`, `LCAP-LIFECYCLE-MGMT`; masters `extend_workflows`). Modularization shape decision goes to Bucket 2 (B2-S1) because the user owns the split call. Once modules exist, every M-band check curates. | Author 2 `domain_modules` rows + 7 `domain_module_capabilities` rows + 5 `domain_module_data_objects` rows (one master DMDO per data_object, attributed to its owning module). See Bucket 2 B2-S1 for the proposed split that needs user sign-off before the loader runs. |
| B1-S2 | **Rule #18 violation (data_object names)** | **All 5 LCAP master data_objects are named `extend_*`**, which is Workday's product brand (`Workday Extend`). Rule #18 forbids third-party product or brand names on non-commerce entities; `data_objects.data_object_name` / `singular_label` / `plural_label` / `description` are all in the forbidden zone. Singular and plural labels also carry "Low-Code App" etc., which is fine; the entity names themselves are the violation. The vendor-neutral pattern across the LCAP market (OutSystems modules, Mendix apps, Power Apps canvas apps, Appian records, Pega case types, ServiceNow App Engine record producers) is to model these as `lcap_apps`, `lcap_business_objects`, `lcap_workflows`, `lcap_pages`, `lcap_data_sources`. The `lcap_` prefix mirrors the convention used across other domain-prefixed masters in the catalog (e.g. `hcm_employees`, `ats_candidates`). | Rename via [scripts/loaders/rename_data_object.ts](../scripts/loaders/rename_data_object.ts): `extend_apps` -> `lcap_apps`, `extend_business_objects` -> `lcap_business_objects`, `extend_workflows` -> `lcap_workflows`, `extend_pages` -> `lcap_pages`, `extend_data_sources` -> `lcap_data_sources`. Loader updates every junction FK + alias automatically. Approve before running. |
| B1-S3 | **B3 naming arbitration** | After the B1-S2 rename, every master carries a `<slug>_<noun>` shape so Rule #9 passes by prefix; `is_canonical_bare_word=false` is correct. No further B3 action needed beyond the rename. Surface here for traceability rather than as a separate fix. | No additional fix; covered by B1-S2. |
| B1-S4 | **B4 pattern flag re-evaluation (Rule #12)** | Every master has all three flags `false` (the default). Audit needs positive consideration. Candidate flips: `lcap_apps.has_submit_lock=true` (Once a published version is live, the version artifact is immutable; new edits create a new version) - but this is workflow-shape dependent on whether versioning is modeled as a state or as a separate object. `lcap_data_sources.has_personal_content=true` (connection metadata often carries auth credentials / API keys, which is personal-content-shaped). `lcap_business_objects.has_submit_lock=true` (schema changes shouldn't be silently reversible once dependent pages are deployed). | Surface the proposed flips as Bucket 2 (B2-S2) because pattern flags are workflow-shape judgments the user owns. |
| B1-S5 | **B6 hard fail - zero intra-domain `data_object_relationships`** | LCAP has 5 masters that all depend on each other. The minimum coherent edge set is: `lcap_apps` contains_pages `lcap_pages` (1:N, owner_side=lcap_apps), `lcap_apps` contains_workflows `lcap_workflows` (1:N), `lcap_apps` defines `lcap_business_objects` (1:N), `lcap_apps` binds_to `lcap_data_sources` (M:N), `lcap_pages` displays `lcap_business_objects` (M:N), `lcap_workflows` operates_on `lcap_business_objects` (M:N), `lcap_workflows` triggers_from `lcap_pages` (M:N), `lcap_business_objects` sources_from `lcap_data_sources` (M:N). | Author 8 `data_object_relationships` rows via the cluster-drafts pattern in [scripts/loaders/load_cluster_drafts.ts](../scripts/loaders/load_cluster_drafts.ts). Draft block goes through Bucket 1 approval before loading. |
| B1-S6 | **B7 hard fail - zero `users` edges (Rule #10)** | LCAP masters are author-and-deploy artifacts with obvious user roles, but no edge to the platform built-in `users` (id 748) exists anywhere. The minimum edge set: users `authors` lcap_apps, users `owns` lcap_apps, users `authors` lcap_pages, users `authors` lcap_business_objects, users `authors` lcap_workflows, users `configures` lcap_data_sources. | Insert 6 `data_object_relationships` rows pointing from `data_object_id=748` to each LCAP master, with verb-shape per the catalog convention (e.g. `authors_lcap_app`, `owns_lcap_app`). Bundle with B1-S5 in the same cluster-drafts load. |
| B1-S7 | **B9 - `event_category` empty on every LCAP trigger_event (Rule #13)** | All 7 trigger_events (ids 731-737) have `event_category=""`. Rule #13 enums require one of `lifecycle` / `state_change` / `threshold` / `signal`. Correct classifications: `extend_app.published` -> `state_change`, `extend_app.deployment_failed` -> `signal`, `extend_business_object.schema_changed` -> `state_change`, `extend_workflow.failed` -> `signal`, `extend_workflow.published` -> `state_change`, `extend_page.published` -> `state_change`, `extend_data_source.connection_failed` -> `signal`. Note: event_name strings still carry the `extend_*` prefix and need a rename pass paired with B1-S2. | PATCH `event_category` on 7 rows + rename `event_name` to `lcap_*` shape (`lcap_app.published`, etc.). One small loader covers both. |
| B1-S8 | **B11 hard fail - zero `data_object_aliases`** | LCAP masters carry strong vendor-specific synonyms: OutSystems uses "module" / "application" / "entity", Mendix uses "app" / "domain entity" / "microflow", Power Apps uses "canvas app" / "model-driven app" / "table" / "flow", Appian uses "record type" / "process model", Pega uses "case type". Without `data_object_aliases`, the architect agent can't bridge vendor terminology into the catalog's canonical names. Minimum aliases per master: 3-5 vendor synonyms. | Draft alias rows (5 masters x ~4 aliases = ~20 rows) and load via the cluster-drafts pattern. Bundle with B1-S5 / B1-S6. |
| B1-S9 | **B12 hard fail - zero `data_object_lifecycle_states` (Rule #12)** | Every LCAP master has an obvious state machine: `draft -> validated -> published -> deprecated -> retired` for `lcap_apps`, `lcap_pages`, `lcap_workflows`, `lcap_business_objects`; `configured -> tested -> active -> degraded -> retired` for `lcap_data_sources`. `requires_permission=true` on `published` (publish gate), `deprecated` (deprecation gate), `retired` (retirement gate). No config-shape exemption applies here, every master has workflow. Note: `domain_module_id` on each lifecycle row must point at the realizing module (M5), so this load depends on B1-S1 having authored the modules first. | Draft state machines (5 x ~5 states = ~25 rows) and load via a focused loader. Sequence behind B1-S1. |
| B1-S10 | **F1 hard fail - legacy domain-level system skill** | `skills` row id 79 (`lcap-system`, `skill_type=system`, `domain_id=37`, `domain_module_id=NULL`) is the legacy shape Rule #17 forbids once any module-level system skill exists. F1 currently passes only because no module-level skill has been authored (vacuous transitional state per F1's threshold). Once B1-S1 lands and module-level system skills are authored, F1 hard-fails until the legacy row is retired. The 5 linked `query_*` `skill_tools` (564, 565, 566, 822, 823) should be re-anchored to the new per-module skills (split: query_lcap_apps + query_lcap_business_objects + query_lcap_pages + query_lcap_data_sources -> LCAP-VISUAL-COMPOSITION skill; query_lcap_workflows -> LCAP-RUNTIME-LIFECYCLE skill). | After B1-S1: author 2 new module-anchored system skills (e.g. `lcap_visual_composition_agent`, `lcap_runtime_lifecycle_agent`), move the 5 `skill_tools` to the new skills, then DELETE the legacy skill 79 (cascade through `skill_tools` cleanup first). Plus add mutate + workflow-gate tools per Rule #17 (typical floor 5-20 per skill; current 5 query-only is below the floor). |
| B1-S11 | **C1 - business function ownership shape** | LCAP `business_function_domains` rows reference "IT Infrastructure" as owner and "Software Engineering" + "Business Operations" as contributors. The canonical 20-function spine (SKILL.md § Function spine) names the IT row as "IT Operations" not "IT Infrastructure"; "Business Operations" is not on the spine at all. Either the spine has new entries this audit doesn't know about, or these labels are out-of-spine and need re-anchoring. The semantic intent ("IT owns the platform, Engineering builds the apps") is sound; the labels just need to be confirmed against the live `business_functions` table. | PATCH `business_function_domains.business_function_id` to point at the canonical spine rows after verifying their current names via `/business_functions?select=id,business_function_name`. If "IT Infrastructure" and "Business Operations" are genuinely live business_functions rows, no fix is needed; surface as report-only. |
| B1-S12 | **B10b - NULL `source_domain_module_id` on every outbound handoff (in-scope)** | All 4 outbound LCAP handoffs (ids 704, 705, 706, 707) have `source_domain_module_id=NULL`. The inbound from NCDB (701) also has both module FKs NULL. After B1-S1 lands and `source_domain_module_id` becomes derivable per the B10b backfill rule (resolve via the source module mastering the trigger_event's data_object), these 4 outbound rows backfill cleanly: handoffs 704 (`extend_app.published`) + 706 (`extend_app.deployment_failed`) -> LCAP-VISUAL-COMPOSITION (masters `lcap_apps`); handoffs 705 (`extend_workflow.published`) + 707 (`extend_business_object.schema_changed`) -> LCAP-VISUAL-COMPOSITION for the business-object row, LCAP-RUNTIME-LIFECYCLE for the workflow row. | Single PATCH pass on 4 rows after B1-S1 lands. Reference: [scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts](../scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts). |
| B1-S13 | **B9b - intra-domain handoffs (blocked by S1)** | Once the 2-module split lands (B1-S1) and the data_object_relationships from B1-S5 are loaded, the cross-module pairs derive directly: workflow definitions edited in LCAP-VISUAL-COMPOSITION execute in LCAP-RUNTIME-LIFECYCLE -> `lcap_workflow.published` fires LCAP-VISUAL-COMPOSITION -> LCAP-RUNTIME-LIFECYCLE; business-object schema authored in LCAP-VISUAL-COMPOSITION drives runtime data layer in LCAP-RUNTIME-LIFECYCLE -> `lcap_business_object.schema_changed` fires VISUAL-COMPOSITION -> RUNTIME-LIFECYCLE; runtime errors should fire back -> LCAP-RUNTIME-LIFECYCLE -> LCAP-VISUAL-COMPOSITION on `lcap_workflow.failed`. | Author 3 intra-domain `handoffs` rows after B1-S1 + B1-S5 + B1-S7 (event_category fix). |
| B1-S14 | **B8 outbound - missing cross-domain `data_object_relationships`** | 4 outbound LCAP handoffs but zero cross-domain `data_object_relationships` exist where LCAP masters edge to the target domain's masters. Proposed verbs: handoff 704 (`extend_app.published` -> APP-PAAS) maps to `lcap_apps deploys_to <app_paas_master>` (target master TBD when APP-PAAS is audited); handoff 705 (`extend_workflow.published` -> IPAAS) maps to `lcap_workflows registers_with <ipaas_master>`; handoff 706 (`extend_app.deployment_failed` -> ITSM) maps to `lcap_apps opens <service_incidents>`; handoff 707 (`extend_business_object.schema_changed` -> DCG) maps to `lcap_business_objects publishes_to <dcg_catalog_master>`. Target-side masters need confirmation; some relationship rows may need to defer until the target domain's masters are vetted. | Author the 4 outbound `data_object_relationships` rows after B1-S5 lands; the 706 row (ITSM target) is directly resolvable (`service_incidents` is a known master); the other 3 need a one-query check of the target domain's current masters before authoring. |
| B1-H1 | **APQC TAGGING** | LCAP cross-domain handoffs have zero `handoff_processes` tags. Volume target 0.5N to 0.8N (N=5) is 2.5 to 4 tags. Audit proposes the 4 high-confidence tags below. | INSERT into `handoff_processes` with `proposal_source='agent_curated'`, `record_status='new'`. |

##### B1-H1 detail - proposed APQC tags

| handoff_id | source -> target | trigger_event | payload | Proposed PCF | PCF id | Confidence |
|---|---|---|---|---|---|---|
| 704 | LCAP -> APP-PAAS | extend_app.published | extend_apps | Deploy services/solutions (20824 L2) | id=52 | confident L2 |
| 705 | LCAP -> IPAAS | extend_workflow.published | extend_workflows | Develop service/solution and integration strategy (20785 L3) | id=278 | medium L3 |
| 706 | LCAP -> ITSM | extend_app.deployment_failed | service_incidents | Manage change deployment control (20840 L3) | id=285 | confident L3 |
| 707 | LCAP -> DCG | extend_business_object.schema_changed | extend_business_objects | Manage product and service master data (11740 L3) | id=115 | medium L3 |
| 701 | NCDB -> LCAP | nocode_record_definition.changed | nocode_record_definitions | (defer to NCDB audit) | - | defer |

The inbound from NCDB (handoff 701) is deferred: NCDB's `nocode_record_definitions` (data_object_id 242) has **no canonical master** anywhere in `domain_module_data_objects` (catalog-wide query returned empty). That is a B5 integrity gap on NCDB, not on LCAP; the right APQC classification depends on what NCDB ultimately models. Routed to the NCDB audit (see report-only follow-ups).

#### Bucket 1 count

| Finding type | Count |
| --- | --- |
| STRUCTURAL (M1/M2/M4/M6 hard-fails) | 1 |
| STRUCTURAL (Rule #18 data_object renames) | 1 |
| STRUCTURAL (B3 covered by S2) | 1 |
| STRUCTURAL (B4 covered in B2-S2) | 1 |
| STRUCTURAL (B6 + B7 + B11 + B12 + B9 event_category + B10b + B9b + B8 + F1 + C1) | 10 |
| APQC TAGGING (high-confidence + defer) | 1 |
| **Bucket 1 total** | 15 |

### Bucket 2 - Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Module split shape.** Proposed 2-module split: **LCAP-VISUAL-COMPOSITION** (masters `lcap_apps`, `lcap_pages`, `lcap_business_objects`, `lcap_data_sources`; realizes 4 capabilities including AI-assist and operational-data-apps cross-cutting) + **LCAP-RUNTIME-LIFECYCLE** (masters `lcap_workflows`; realizes 3 capabilities). Alternative: 3-module split adding **LCAP-INTEGRATION** (masters `lcap_data_sources`; realizes `LCAP-INTEGRATION-CONNECTORS`) as a starter for IT-driven integration buyers. Alternative: 4-module split breaking visual modeling, runtime, ALM, AI-assist apart. | Modularization is a deploy-shape decision the user owns. The vendor matrix supports several splits; the catalog convention so far on >=3-capability domains is to favor 2-3 functional modules over many narrow ones. | (a) 2-module split as proposed. (b) 3-module split with LCAP-INTEGRATION. (c) 4-module split. (d) different split: user proposes. |
| B2-S2 | **Pattern flag re-evaluation (B4 / Rule #12).** Per-master proposed flips: (i) `lcap_apps.has_submit_lock=true` once a version is published; (ii) `lcap_business_objects.has_submit_lock=true` once a schema is deployed and dependent pages exist; (iii) `lcap_data_sources.has_personal_content=true` because connection records carry API keys / credentials; (iv) `lcap_workflows.has_submit_lock=true` once active. | Pattern flags are workflow-shape judgments the user owns. The defaults of false don't establish review per Rule #12. Per Rule #15 the consideration cannot be recorded in `notes`; it goes here. | Per-flag yes/no per master from user. |
| B2-S3 | **Business function spine alignment (B1-S11).** "IT Infrastructure" and "Business Operations" are not on the canonical 20-function spine (the spine names "IT Operations"; there is no "Business Operations" spine row). Either these are valid live rows that exist outside the spine, or the LCAP load drifted away from the spine. Decision shape: re-anchor LCAP's `business_function_domains` to the spine names, or leave the existing references. | The agent can't tell whether the live `business_functions` table has been extended beyond the canonical spine without explicit confirmation. Re-anchoring without that signal could break existing analysis. | (a) Re-anchor to spine: owner -> "IT Operations", contributor -> "Software Engineering" (already on spine), drop "Business Operations" contributor row. (b) Leave as-is: spine is documentation, live data is authoritative. (c) Mixed: re-anchor to spine but ALSO add "Software Engineering" as a second owner, since low-code platforms straddle the IT / engineering boundary. |
| B2-S4 | **Should `OPERATIONAL-DATA-APPS` cross-cutting capability stay on LCAP?** The capability is genuinely cross-cutting (per § Cross-cutting capability convention, applies when >=3 domains share the same feature shape). Vendors that market operational data apps include LCAP (Power Platform, Mendix, OutSystems), NCDB (Airtable, Smartsheet, Notion DBs), and possibly APP-PAAS depending on definitional scope. Is the current single-domain `capability_domains` row correct, or should it expand to NCDB / APP-PAAS so the capability's cross-domain shape is captured? | Cross-cutting capability scope is a market-test decision the user owns; the vendor surface across LCAP / NCDB / APP-PAAS is borderline. | (a) Keep single-domain on LCAP. (b) Expand to NCDB + LCAP. (c) Expand to NCDB + LCAP + APP-PAAS. |
| B2-S5 | **`domains.business_logic` carries an em-dash from a prior load.** Quote: `Runtime, compiler, and visual modeller [U+2014] the entire platform is code. The end-user app surface is whatever the customer builds; the LCAP itself is platform.` Per CLAUDE.md no-em-dash rule, this needs to be rewritten on the next domains row PATCH. Suggested rewrite: `Runtime, compiler, and visual modeller. The entire platform is code, the end-user app surface is whatever the customer builds, and the LCAP itself is platform.` | The CLAUDE.md no-em-dash rule explicitly forbids U+2014 in catalog data; the user owns the editorial wording when fixing existing rows. | (a) Apply the suggested rewrite. (b) Provide alternative wording. (c) Defer to a catalog-wide em-dash cleanup pass. |

### Bucket 3 - Phase 0 pending (speculative)

Flagship LCAP vendors (`solutions` already loaded): OutSystems, Mendix, Microsoft Power Platform (Power Apps + Power Automate + Dataverse), ServiceNow App Engine + Now Platform, Appian Platform, Salesforce Platform, Pega Platform, Oracle APEX, Quickbase, Retool, Zoho Creator, Kissflow, Creatio, Workday Extend. The matrix is unusually broad (15 primary solutions, 1 secondary), making the surface union large.

The substrate finding: LCAP currently models 5 application-construct masters (apps, business objects, workflows, pages, data sources) but is missing the **lifecycle artifacts** (versions, deployments, environments), **packaging concepts** (solutions / projects), **runtime telemetry** (executions, audit logs), and **AI-assist substrate** (prompts, generated artifacts). Most flagship vendors model these as first-class entities.

#### MISSING entities (speculative; Phase 0 needed to verify)

| Entity | Proposed module | Vendor evidence (speculative) |
|---|---|---|
| `lcap_app_versions` | LCAP-VISUAL-COMPOSITION | Mendix model versions, Power Apps versions, OutSystems modules versions, ServiceNow update sets. Source for the `published` lifecycle. |
| `lcap_deployments` | LCAP-RUNTIME-LIFECYCLE | OutSystems deployment plan, Power Apps environments, Mendix deployment package, Appian deployment unit. Distinct from `lcap_apps` because one app has many deployments. |
| `lcap_environments` | LCAP-RUNTIME-LIFECYCLE | dev / test / acceptance / prod environments. Every flagship has explicit environment promotion. |
| `lcap_app_packages` | LCAP-RUNTIME-LIFECYCLE | ServiceNow update sets + scoped apps, Salesforce unmanaged + managed packages, OutSystems solution. The distribution unit, distinct from the app. |
| `lcap_role_definitions` | LCAP-VISUAL-COMPOSITION | Per-app roles authored inside the LCAP, distinct from platform-level RBAC. Every flagship has this (Mendix user roles, Power Apps security roles per Dataverse, Appian groups). |
| `lcap_workflow_executions` | LCAP-RUNTIME-LIFECYCLE | Run-time instance records. Audit / observability source. |
| `lcap_audit_logs` | LCAP-RUNTIME-LIFECYCLE | Cross-flagship: every LCAP records who-did-what for compliance. Distinct from runtime execution telemetry. |
| `lcap_integration_endpoints` | LCAP-VISUAL-COMPOSITION | External services exposed by an app (REST endpoints, webhook receivers). Distinct from `lcap_data_sources` which is inbound. |
| `lcap_ai_prompts` | LCAP-VISUAL-COMPOSITION | Power Apps Copilot, OutSystems AI Mentor, Mendix Maia, ServiceNow Now Assist. The AI-assist capability needs a backing entity. |
| `lcap_generated_artifacts` | LCAP-VISUAL-COMPOSITION | AI-generated pages / workflows / business objects from prompts; lineage for AI governance. |
| `lcap_compliance_assertions` | new LCAP-COMPLIANCE-RISK module | EU Cyber Resilience Act compliance assertions, accessibility (WCAG 2.1) compliance attestations per app. EU CRA is already linked at the domain level. |

Note: this set is speculative based on vendor-knowledge of the surface; a formal Phase 0 pass against OutSystems / Mendix / Power Platform / ServiceNow App Engine schema docs would tighten it. Estimated 6-9 of the 11 likely survive Phase 0 vetting; the others may collapse to capabilities or be folded into existing masters (e.g. `lcap_role_definitions` may be a junction rather than a master).

#### MODULARIZATION ISSUE (speculative)

- The 2-module split in B2-S1 covers the application-build vs application-run axis cleanly but does NOT carry the **compliance / risk** surface (EU CRA, accessibility, identity-and-access compliance). Several flagship vendors (ServiceNow App Engine, OutSystems, Mendix) model this as a third concern. If Bucket 3 lands, a **LCAP-COMPLIANCE-RISK** third module owning `lcap_compliance_assertions` (and possibly `lcap_audit_logs` if compliance-focused) may be warranted, mirroring the APM market's recommended `APM-TECH-RISK` split.

#### Bucket 3 prompt

Vet via formal Phase 0 vendor research (a second-pass subagent producing `c:/tmp/LCAP-phase0-<date>.md` with per-entity schema citations from OutSystems / Mendix / Power Platform / ServiceNow docs), or eyeball-mode (user names which of the 11 speculative entities ring true)?

If you only commit to part of the work, the **versions + deployments + environments + audit_logs** cluster is the highest-leverage: it's the runtime substrate every flagship treats as first-class, and missing it leaves LCAP's lifecycle management capability with no backing data.

### Cross-bucket dependencies

- **B1-S1 (M-band cure) gates almost everything downstream.** B1-S9 (lifecycle states, M5 needs module FKs), B1-S12 (B10b backfill needs source modules), B1-S13 (B9b needs modules), B1-S10 (F1 + F2 system skill restructure needs modules), and Bucket 3 module assignment all depend on B1-S1 resolving first.
- **B2-S1 (module split shape) gates B1-S1.** No `domain_modules` insert can happen until the user picks a, b, c, or d.
- **B1-S2 (Rule #18 rename) is independent** and can run before, after, or alongside the M-band cure. Recommend running first because every downstream label / event_name / skill_tool name references the master names.
- **Bucket 3 (Phase 0) is independent of Buckets 1 and 2 in principle**, but B2-S1's module shape decision affects how the new entities slot in. Recommend Bucket 2 -> Bucket 1 -> Bucket 3 ordering for the cleanest fix sequence.
- **B2-S4 (cross-cutting capability scope)** is independent of the other buckets and can be answered any time.

### Per-bucket prompts

**Bucket 1 - fix these now?** Reply with: `all` (after B2-S1 lands), or list specific items (e.g. `S2, S5, S6, S7, S8, H1`), or `skip`.

- **S1 (M1/M2/M4/M6 cure):** blocked behind B2-S1 (module split decision). Decide B2-S1 first.
- **S2 (Rule #18 rename):** standalone, run any time, mechanical via `rename_data_object.ts`.
- **S5 / S6 / S8 (B6 / B7 / B11 - intra-domain rels + users edges + aliases):** can run after B1-S2. Bundle in one cluster-drafts load.
- **S7 (B9 event_category PATCH + event_name rename):** standalone, bundle with S2 rename.
- **S9 (B12 lifecycle states):** blocked behind S1 (needs `domain_module_id`).
- **S10 (F1 / F2 skill restructure):** blocked behind S1.
- **S11 (C1 function spine):** answer B2-S3 first.
- **S12 (B10b PATCH 4 outbound handoffs):** blocked behind S1.
- **S13 (B9b intra-domain handoffs):** blocked behind S1 + S5 + S7.
- **S14 (B8 cross-domain rels):** can run after S5; some rows may defer pending target-domain audits.
- **H1 (APQC tagging):** 4 high-confidence rows are loadable now. Load now or in a follow-up batch?

**Bucket 2 - what's your call on each?**

- **B2-S1 (module split):** (a) 2-module, (b) 3-module with LCAP-INTEGRATION, (c) 4-module, (d) user-proposed?
- **B2-S2 (pattern flags):** per-master yes/no on the four flips.
- **B2-S3 (business function spine):** (a) re-anchor to spine, (b) leave as-is, (c) mixed?
- **B2-S4 (`OPERATIONAL-DATA-APPS` scope):** (a) LCAP only, (b) +NCDB, (c) +NCDB+APP-PAAS?
- **B2-S5 (`domains.business_logic` em-dash rewrite):** apply the suggested rewrite or provide alternative wording?

**Bucket 3 - Phase 0 vetting or eyeball?**

- Vet via formal Phase 0 vendor research, or eyeball-mode (name which of the 11 candidates to treat as confirmed)?
- If eyeball, the highest-leverage cluster is versions + deployments + environments + audit_logs.

### Report-only follow-ups (owed by other domains)

| Owing domain | Owed | Origin |
|---|---|---|
| **NCDB** | B5 integrity gap on `nocode_record_definitions` (data_object_id 242). No `master` row exists anywhere in `domain_module_data_objects` for this data_object, even though NCDB publishes `nocode_record_definition.changed` (trigger_event 726) into LCAP via handoff 701. NCDB owes either a `master` DMDO or, if the data_object is mis-attributed, retiring the trigger_event. | LCAP audit Pass 1 (B5 / B10b inbound) |
| **NCDB** | B10b backfill for inbound handoff 701 (`nocode_record_definition.changed` -> LCAP). After NCDB's own modularization, `source_domain_module_id` must be set; also `target_domain_module_id` on the LCAP side after B1-S1 lands. | LCAP audit Pass 1 (B10b inbound) |
| **NCDB** | APQC tagging for handoff 701 (deferred from B1-H1 because the source-domain canonical master is missing). | LCAP audit Pass 1 (H1) |
| **NCDB** | Whether `nocode_record_definitions` should be a separate `kind='platform_builtin'` data_object or remain `domain_owned` is an NCDB modeling question with downstream impact on LCAP and APP-PAAS embedded_master patterns. | LCAP audit Pass 3 (neighbor discovery) |
| **APP-PAAS** | B8 inbound consumer-DMDO on `lcap_apps` (LCAP's master, after B1-S2 rename) once APP-PAAS hosts the runtime. The LCAP outbound handoff 704 (`lcap_app.published` -> APP-PAAS) implies APP-PAAS consumes the published-app artifact; declare a `consumer` DMDO on the relevant APP-PAAS module. | LCAP audit Pass 4 (pairwise lite) |
| **IPAAS** | B8 inbound consumer-DMDO on `lcap_workflows` once IPAAS registers workflow-published triggers. Handoff 705 implies a consumer DMDO. | LCAP audit Pass 4 (pairwise lite) |
| **ITSM** | B8 inbound consumer-DMDO on `lcap_apps` (deployment_failed payload is `service_incidents`, an ITSM master, but the event source is `lcap_apps`). After B1-S14, the cross-domain relationship `lcap_apps opens service_incidents` reverse-mirrors as ITSM declaring a contributor relationship on `lcap_apps`. ITSM may already cover this generically via the `application.deployment_failed` shape from APM; verify in ITSM's next audit. | LCAP audit Pass 4 (pairwise lite) |
| **DCG** | B8 inbound consumer-DMDO on `lcap_business_objects` once DCG catalogs LCAP-produced schemas. Handoff 707 implies a `consumer` DMDO. | LCAP audit Pass 4 (pairwise lite) |
| **(Catalog-wide cleanup)** | Em-dash sweep across `domains.business_logic` and other `description` columns. The LCAP row carries one at the `Runtime, compiler, and visual modeller` clause and there may be others from pre-CLAUDE.md-rule loads. Surface for a catalog-wide cleanup pass, not LCAP's fix. | LCAP audit A-band review |

## 2026-05-31, Continuation: B1 technical fixes

Loader: [.tmp_deploy/fix_lcap_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_lcap_b1_technical_2026_05_31.ts) (run from project root c:/dev/domain-map).

### Applied

- **B1-S2 (Rule #18 rename)**: PATCHed 5 data_objects `extend_* -> lcap_*` (ids 220, 221, 222, 715, 716). Cascade rewrote 7 trigger_event names `extend_<sing>.X -> lcap_<sing>.X` on ids 731-737. FKs unchanged (all FK by id).
- **B1-S3**: covered by B1-S2 (no separate fix).
- **B1-S7 (B9 event_category enum backfill)**: PATCHed event_category on 7 trigger_events: 731/733/735/736 `state_change`, 732/734/737 `signal`. All categories per audit's pre-specified classification, all values legal per Rule #13.
- **B1-S6 (B7 Rule #10 users edges)**: INSERTed 6 `data_object_relationships` from users (748) to LCAP masters, verbs per audit pre-specification: `authors_lcap_app` (id 1735), `owns_lcap_app` (1736), `authors_lcap_page` (1737), `authors_lcap_business_object` (1738), `authors_lcap_workflow` (1739), `configures_lcap_data_source` (1740). Pattern mirrors existing user edges: owner_side=source, one_to_many, reference, is_required=false, notes='' (Rule #15), record_status default 'new' (Rule #1).
- **B1-H1 (APQC handoff_processes)**: 4 high-confidence pre-specified rows reduced to 3 inserts after verifying handoff 704 -> PCF 52 already existed (id 418). INSERTed 705 -> 278 (id 509), 706 -> 285 (id 510), 707 -> 115 (id 511). All 4 process_ids verified resolvable in `/processes` pre-flight. proposal_source=`agent_curated`, role=`implements`, record_status default 'new'. Handoff 701 deferred per audit (NCDB owns canonical-master gap).

### Deferred (and why)

- **B1-S1 (M1/M2/M4/M6 module creation)**: new entities; gated on B2-S1 user split decision.
- **B1-S4 (B4 pattern flag flips)**: pattern flag flips not licensed by the technical directive; rolled up into B2-S2 for user.
- **B1-S5 (intra-domain `data_object_relationships`, 8 rows)**: directive licenses only `users` edges from Rule #10; intra-domain rels remain for a later authoring pass.
- **B1-S8 (B11 aliases)**: audit does not pre-specify exact alias tuples; directive forbids bulk alias inserts without exact tuples.
- **B1-S9 (B12 lifecycle states)**: gated on B1-S1 (each lifecycle state row needs `domain_module_id`).
- **B1-S10 (F1 retire + F2 module-anchored skills)**: gated on B1-S1; new entities (system skills + skill_tools).
- **B1-S11 (C1 business function spine)**: gated on B2-S3 user judgment.
- **B1-S12 (B10b PATCH `source_domain_module_id`)**: not derivable from existing modules (LCAP has zero `domain_modules` rows); gated on B1-S1.
- **B1-S13 (B9b intra-domain handoffs)**: new handoffs gated on B1-S1; only allowed when audit pre-specifies handoff_id + resolvable PCF (these are new handoffs entirely).
- **B1-S14 (B8 cross-domain `data_object_relationships`)**: not on the technical apply list; some rows would require target-domain audits before resolving the target master.

### Verification post-load

- `/data_objects?id=in.(220,221,222,715,716)` returns all five with `lcap_*` names.
- `/trigger_events?id=in.(731-737)` returns all seven with `lcap_*.X` event_names and the pre-specified `event_category` values.
- `/data_object_relationships?data_object_id=eq.748&related_data_object_id=in.(220,221,222,715,716)` returns 6 rows (ids 1735-1740).
- `/handoff_processes?handoff_id=in.(704,705,706,707)` returns 4 rows: 418 (pre-existing 704->52), 509 (705->278), 510 (706->285), 511 (707->115).

UI link: https://tests.semantius.app/domain_map/data_objects, https://tests.semantius.app/domain_map/trigger_events, https://tests.semantius.app/domain_map/data_object_relationships, https://tests.semantius.app/domain_map/handoff_processes.

## 2026-05-31, Audit

### Summary

- **Current footprint:** **0** `domain_modules` rows (M1/M2/M4/M6 still hard-fail); 5 LCAP-owned masters (`lcap_apps` 220, `lcap_business_objects` 221, `lcap_workflows` 222, `lcap_pages` 715, `lcap_data_sources` 716, all `role=master`, `necessity=required`, `notes=""`); 7 capabilities (`LCAP-VISUAL-MODELING`, `LCAP-MANAGED-RUNTIME`, `LCAP-INTEGRATION-CONNECTORS`, `LCAP-WORKFLOW-AUTO`, `LCAP-LIFECYCLE-MGMT`, `LCAP-AI-ASSIST`, cross-cutting `OPERATIONAL-DATA-APPS`); 16 solutions (15 primary + 1 secondary `Bizagi Modeler and Studio`); 7 trigger_events on LCAP masters with `event_category` now populated per Rule #13 (state_change x4, signal x3); 4 outbound handoffs (704, 705, 706, 707) + 1 inbound (701 from NCDB); **0** intra-domain `data_object_relationships`; 6 `users` edges (ids 1735-1740, all `lcap_*` verbs); **0** lifecycle states on any master; **0** `data_object_aliases`; 1 legacy `domain_id`-anchored system skill `lcap-system` (id 79) with 5 `query_*` `skill_tools`; tools still carry **legacy `extend_*` names** (564, 565, 566, 822, 823); `business_function_domains` references "IT Infrastructure" (owner), "Software Engineering" + "Business Operations" (contributors) which are NOT on the canonical 20-function spine; `domains.business_logic` still carries U+2014 em-dash; `catalog_tagline` + `catalog_description` empty (A4 + M8 fail).
- **Bucket 1 (in-scope, agent fixable):** 8 items (carry-over from prior audit, mostly blocked behind B2-S1 module split decision).
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 11 items (unchanged from prior audit).

### Pass results (structural Validate b1)

| Band | Result | Notes |
|---|---|---|
| **S1** | partial | `domain_modules` count 0 (expected non-zero); `domain_data_objects` count 0 (legacy table empty for LCAP, but `domain_module_data_objects` would be the modern store once modules exist); routes failures into M1 / B1. |
| **S2** | n/a | no modules. |
| **S3** | hard-fail | 0 states, 7 events (now with categories), 0 aliases across 5 masters. Routes into B11, B12. |
| **A1** | pass-with-cleanup | all 7 metadata fields populated; `business_logic` still carries U+2014 em-dash (CLAUDE.md violation, B2-S5 still open). |
| **A2** | pass | 7 capabilities (>=3 floor met). |
| **A3** | pass | 16 solutions (>=3 floor met; >=1 primary). |
| **A4** | hard-fail | `catalog_tagline` and `catalog_description` empty per Rule #20. Buyer-voice copy needed. |
| **M1 / M2 / M4 / M6** | hard-fail | 0 `domain_modules`; carries every downstream uncomputable. |
| **M5** | vacuous | no lifecycle rows. |
| **M7** | vacuous | no DMDO rows to test single-master integrity within. |
| **M8** | hard-fail | (n/a vacuously since no modules; will fail real on first module insert). |
| **B1** | pass | 5 masters in `domain_data_objects` (legacy table); however B1 reads the legacy table that LCAP populated, so the row counts pass. After modularization the modern read should be `domain_module_data_objects`. |
| **B2** | pass | every master has `singular_label` + `plural_label`. |
| **B3** | pass | all 5 masters carry `lcap_*` prefix; `is_canonical_bare_word=false` is correct. |
| **B4** | hard-fail | all three flags `false` on every master with no positive re-evaluation (B2-S2 still open). |
| **B5** | vacuous | no `embedded_master` rows. |
| **B6** | hard-fail | zero intra-domain `data_object_relationships` (carry-over). |
| **B7** | pass | 6 `users` edges loaded in prior continuation (1735-1740). |
| **B8** | hard-fail | 4 outbound handoffs but zero cross-domain relationships. |
| **B9** | pass | every trigger_event has handoff(s); `event_category` populated. |
| **B9b** | blocked | needs >=2 modules (M2). |
| **B10b** | hard-fail | outbound handoffs 704, 705, 707 still `source_domain_module_id=NULL`; 706 has `target_domain_module_id=38` but `source_domain_module_id=NULL`; inbound 701 NULL on both. |
| **B11** | hard-fail | 0 aliases on any master. |
| **B12** | hard-fail | 0 lifecycle states on any master; no config-shape exemption applies. |
| **C1** | partial | owner row "IT Infrastructure" not on canonical 20-function spine ("IT Operations" is); B2-S3 still open. |
| **C2** | vacuous | no capability overrides loaded. |
| **D1** | n/a | not exercised. |
| **E1-E5** | blocked | E1 vacuous under single-module floor; all role authoring gated behind M2. |
| **F1** | partial | legacy `lcap-system` skill 79 still present and acceptable only because no module-level system skill exists yet. Hard-fail the moment B1-S1 lands. |
| **F2** | hard-fail | zero `domain_module_id`-anchored system skills; vacuously blocked by M1. |
| **F3** | pass (vs. legacy) | legacy skill has 5 `skill_tools`; floor met. Meaningless until per-module skills exist. |
| **F4** | pass | all 5 linked tools are `operation_kind=query` with `data_object_id` set; pairing legal. |
| **F5** | uncomputable per F2 | no module-level system skills. |
| **F7** | vacuous | no channel primitives linked. |
| **H1** | partial-pass | 4 of 5 cross-domain handoffs now carry `handoff_processes` with `proposal_source=agent_curated`, `record_status=new` (704->52, 705->278, 706->285, 707->115). Inbound 701 still deferred (NCDB owns canonical-master gap on `nocode_record_definitions`). 0 of 4 at `approved`; lead with that as the catalog-quality headline. |

**Headline finding (unchanged):** LCAP is still a marketing-tier row because zero `domain_modules` exist. The 2026-05-31 continuation cured B7 (users edges), B9 event_category, B3/Rule #18 master rename, and partial H1 (APQC tagging). Everything else remains pending. B2-S1 (module split decision) is the bottleneck for the rest of Bucket 1.

### Bucket 1 - In-scope confirmed gaps (8 items, mostly carry-over)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1/M2/M4/M6 | 0 `domain_modules` for LCAP. Audit's proposed split is in B2-S1. | Loader after B2-S1 approval. Blocked by B2-S1. |
| B1-S5 | B6 | 8 intra-domain `data_object_relationships` proposed (apps contains pages, contains workflows, defines business_objects, binds_to data_sources; pages displays business_objects; workflows operates_on business_objects, triggers_from pages; business_objects sources_from data_sources). | cluster-drafts loader. Independent of B1-S1. |
| B1-S8 | B11 | 0 aliases across 5 masters; proposed ~20 aliases (4 per master from OutSystems / Mendix / Power Apps / Appian / Pega vocab). | cluster-drafts loader. Tuples still need authoring before bulk insert. Independent of B1-S1. |
| B1-S9 | B12 | 0 lifecycle states across 5 masters; ~25 state rows (5 x ~5 states each). | focused loader. Blocked by B1-S1 (needs `domain_module_id` per M5). |
| B1-S10 | F1+F2 | retire legacy skill 79; author per-module system skills + skill_tools; also tools 564, 565, 566, 822, 823 still carry legacy `extend_*` names (not renamed in prior continuation). | focused loader. Blocked by B1-S1. |
| B1-S12 | B10b | PATCH `source_domain_module_id` on 4 outbound handoffs (704, 705, 706, 707) once modules exist. | small loader. Blocked by B1-S1. |
| B1-S13 | B9b | 3 intra-domain `handoffs` rows (lcap_workflow.published, lcap_business_object.schema_changed, lcap_workflow.failed) crossing the 2 modules. | focused loader. Blocked by B1-S1 + B1-S5 + B1-S7 already done. |
| B1-S14 | B8 | 4 cross-domain `data_object_relationships` for outbound handoffs. Target masters need verification for handoffs 704 (APP-PAAS), 705 (IPAAS), 707 (DCG); 706 (ITSM `service_incidents`) is directly resolvable. | cluster-drafts loader. Independent of B1-S1 for the ITSM row; others may defer pending target-domain audits. |

#### Bucket 1 count

| Finding type | Count |
| --- | --- |
| STRUCTURAL (M-band) | 1 |
| STRUCTURAL (B6, B11, B12, F1+F2, B10b, B9b, B8) | 7 |
| APQC TAGGING | 0 (carry-over inbound 701 routes to NCDB, not in this audit) |
| **Bucket 1 total** | **8** |

### Bucket 2 - Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | Module split shape for LCAP. | Modularization is a deploy-shape decision the user owns. | (a) 2-module: LCAP-VISUAL-COMPOSITION + LCAP-RUNTIME-LIFECYCLE. (b) 3-module add LCAP-INTEGRATION. (c) 4-module. (d) user-proposed. |
| B2-S2 | Pattern flag re-evaluation (B4 / Rule #12). Per-master proposed flips: lcap_apps.has_submit_lock=true on publish, lcap_business_objects.has_submit_lock=true on schema deploy, lcap_data_sources.has_personal_content=true for connection credentials, lcap_workflows.has_submit_lock=true once active. | Pattern flags are workflow-shape judgments the user owns. Per Rule #15 the rationale cannot be auto-written to notes. | Per-flag yes/no per master. |
| B2-S3 | Business function spine alignment for `business_function_domains`. Live owner is "IT Infrastructure", contributors "Software Engineering" + "Business Operations"; canonical 20-function spine names "IT Operations". | Agent can't tell if the live `business_functions` rows have been extended outside the spine deliberately or by drift. | (a) re-anchor to spine. (b) leave as-is. (c) mixed: re-anchor + add Software Engineering as second owner. |
| B2-S4 | Should `OPERATIONAL-DATA-APPS` cross-cutting capability stay LCAP-only, or expand to NCDB / APP-PAAS so the cross-domain shape is captured? | Cross-cutting capability scope is a market-test decision the user owns. | (a) keep LCAP-only. (b) +NCDB. (c) +NCDB + APP-PAAS. |
| B2-S5 | `domains.business_logic` carries U+2014 em-dash (CLAUDE.md violation). Suggested rewrite preserves meaning by splitting at comma. | Editorial wording on existing catalog rows is the user's call. | (a) apply suggested rewrite. (b) provide alternative. (c) defer to catalog-wide em-dash cleanup pass. |
| B2-S6 | A4 / M8 (Rule #20) `catalog_tagline` + `catalog_description` are empty on the LCAP domain row and will be empty on every module once authored. Per Rule #20 these need explicit user approval; agent cannot draft and insert without it. | Rule #20 forbids drafting and inserting catalog-tagline / catalog-description without user approval. | (a) user supplies wording. (b) agent drafts for review (one round only; no auto-insert). (c) defer until after B2-S1 lands so module-level copy can be drafted in the same pass. |

### Bucket 3 - Phase 0 pending (speculative, unchanged from prior audit)

Carries over from 2026-05-30 audit. 11 candidate entities (lcap_app_versions, lcap_deployments, lcap_environments, lcap_app_packages, lcap_role_definitions, lcap_workflow_executions, lcap_audit_logs, lcap_integration_endpoints, lcap_ai_prompts, lcap_generated_artifacts, lcap_compliance_assertions) and a speculative LCAP-COMPLIANCE-RISK 3rd module. Vendor evidence: OutSystems, Mendix, Microsoft Power Platform, ServiceNow App Engine, Appian. User has not picked vetted vs eyeball route.

### Cross-bucket dependencies

- B1-S1 (M-band cure) gates B1-S9, B1-S10, B1-S12, B1-S13, and Bucket 3 module assignment.
- B2-S1 (split shape) gates B1-S1.
- B1-S5 (intra-domain rels), B1-S8 (aliases), and B1-S14's ITSM row are independent of B1-S1 and can proceed any time.
- B2-S2, B2-S3, B2-S4, B2-S5, B2-S6 are independent of each other.

### Per-bucket prompts

- **Bucket 1:** "Approve the 3 independent items now (B1-S5 rels, B1-S8 aliases, B1-S14-ITSM cross-domain row)? Or wait until after B2-S1 lands to bundle everything?"
- **Bucket 2:** "Per-item decision needed on S1 / S2 / S3 / S4 / S5 / S6. S1 unlocks the most downstream work."
- **Bucket 3:** "Vetted Phase 0 vendor research, or eyeball route (name which of 11 candidates ring true)?"

### Report-only follow-ups (owed by other domains)

| Owing domain | Owed | Origin |
|---|---|---|
| NCDB | B5 integrity gap on `nocode_record_definitions` (data_object_id 242), no canonical master in `domain_module_data_objects`. Also blocks H1 tagging for inbound handoff 701. | LCAP audit (carry-over from 2026-05-30) |
| NCDB | B10b backfill for handoff 701 (`nocode_record_definition.changed` -> LCAP), both sides NULL. | LCAP audit (carry-over) |
| APP-PAAS | B8 inbound consumer-DMDO on `lcap_apps` once APP-PAAS modularizes. | LCAP audit (carry-over) |
| IPAAS | B8 inbound consumer-DMDO on `lcap_workflows`. | LCAP audit (carry-over) |
| ITSM | B8 inbound consumer-DMDO on `lcap_apps` (deployment_failed payload is `service_incidents`); verify in ITSM's next audit. | LCAP audit (carry-over) |
| DCG | B8 inbound consumer-DMDO on `lcap_business_objects` for the schema-changed handoff. | LCAP audit (carry-over) |
| Catalog-wide | Em-dash cleanup pass across `domains.business_logic` and other description columns. LCAP confirmed carrying U+2014. | LCAP audit A-band review (carry-over) |


## 2026-06-02 Audit (modularization)

### Summary

Built the LCAP domain's `domain_modules` for the first time. Prior state was 0 modules (M1/M2/M4/M6 hard-fail) against 7 capabilities and 5 masters. Applied the 2-module split that the prior audit proposed as B2-S1 option (a), which satisfies Rule #14 (>=3 caps => >=2 full modules). Scope was modules + entity assignment only: no new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships were created. Existing masters were reused at their existing master/required role + necessity.

### Modules created

| id | code | kind | capabilities | data_objects |
|---|---|---|---|---|
| 265 | LCAP-VISUAL-COMPOSITION | full | LCAP-VISUAL-MODELING (332), LCAP-INTEGRATION-CONNECTORS (334), LCAP-AI-ASSIST (337), OPERATIONAL-DATA-APPS (201) | lcap_apps (220, master/required), lcap_pages (715, master/required), lcap_business_objects (221, master/required), lcap_data_sources (716, master/required) |
| 266 | LCAP-RUNTIME-LIFECYCLE | full | LCAP-MANAGED-RUNTIME (333), LCAP-WORKFLOW-AUTO (335), LCAP-LIFECYCLE-MGMT (336) | lcap_workflows (222, master/required) |

### Master pre-check (catalog-wide, MANDATORY)

All 5 masters (220, 221, 222, 715, 716) queried before write: zero pre-existing `role='master'` rows anywhere in `domain_module_data_objects`. All assigned `master` here. No demotions to `embedded_master` were needed.

### Verification (live)

- M1/M2/M6: 2 full modules, each with >=1 capability and >=1 data_object. No empty module.
- M4: all 7 capabilities placed (4 on 265, 3 on 266).
- M7 in-domain + catalog-wide: each master appears in exactly one module (220/221/715/716 -> 265; 222 -> 266). Re-query of each data_object_id with `role=eq.master` returns exactly one row.
- Loader idempotent: second run inserted nothing ("modules already present").

### Fixes applied

- Cured B1A-BUILD and B1B-S1 (the M-band build). The 2-module split is now live, so all items blocked by `prerequisite_entity: B1B-S1` are unblocked for a future pass (B1B-S9 lifecycle states, B1B-S10 system skills, B1B-S12 handoff source-module backfill, B1B-S13 intra-domain handoffs).

### Deferred (out of scope for this modularization pass)

- B1B-S9 lifecycle states (~25 rows across 5 masters), now needing `domain_module_id` per M5.
- B1B-S10 system skills: legacy domain-level skill `lcap-system` (79) still present; per-module system skills (Rule #17 -> F2/F3) not authored.
- B1A-S5 intra-domain relationships, B1A-S8 aliases, B1A-S14-ITSM cross-domain relationship (independent of the build).
- B1B-S12 handoff `source_domain_module_id` backfill (704/705/706/707): now deterministically resolvable against modules 265/266.
- M8 / A4 (Rule #20) `catalog_tagline` + `catalog_description` on the 2 new module rows: omitted on insert per Rule #20 (needs user-approved copy).
- B3 master candidates (lcap_app_versions, lcap_deployments, lcap_environments, lcap_app_packages, etc.) carry over unchanged.

### Module-code -> capability/master mapping note for downstream backfill

Per B1B-S12, source-module resolution after this build: handoffs 704 (lcap_app.published) and 706 (lcap_app.deployment_failed) and 707 (lcap_business_object.schema_changed) -> LCAP-VISUAL-COMPOSITION (265); 705 (lcap_workflow.published) -> LCAP-RUNTIME-LIFECYCLE (266).

## 2026-06-06 - b1a execution

Executed all 6 `b1a` pending technical-fix items against the live `domain_map` master module for LCAP (domain 37). All loaders are gitignored one-offs in `.tmp_deploy/`. record_status omitted on every insert (DB default `new`, Rule #1); no `notes` column written anywhere (Rule #15); no em-dashes; American English.

### B1A-HANDOFF-SOURCE-MODULES (DONE)

PATCHed `source_domain_module_id` on 4 outbound LCAP handoffs (B10b derivation: module mastering the trigger_event's data_object, strongest role).

| handoff | trigger_event | event data_object | source_domain_module_id (was -> now) |
|---|---|---|---|
| 704 | lcap_app.published | 220 lcap_apps | NULL -> 265 |
| 705 | lcap_workflow.published | 222 lcap_workflows | NULL -> 266 |
| 706 | lcap_app.deployment_failed | 220 lcap_apps | NULL -> 265 |
| 707 | lcap_business_object.schema_changed | 221 lcap_business_objects | NULL -> 265 |

`target_domain_module_id` NOT touched (706 keeps 38 ITSM; 704/705/707 stay NULL pending counterparty audits, B1B-S14-OTHERS). Loader: `.tmp_deploy/lcap_b1a_handoff_source_modules_2026_06_06.ts`.

### B1A-LIFECYCLE-STATES (DONE)

First classified all 5 masters `entity_type='operational_workflow'` (prior value `unclassified` on every master; each has an obvious state machine per the finding, which is exactly the operational_workflow shape under Rule #12). Then INSERTed 25 `data_object_lifecycle_states` (5 masters x 5 states). `notes=''`, `domain_module_id` per M5 (220/221/715 -> 265, 222 -> 266, 716 -> 265).

| master (id, module) | states | requires_permission gates (verb_override) |
|---|---|---|
| lcap_apps (220, 265) | draft -> validated -> published -> deprecated -> retired | published(publish), deprecated(deprecate), retired(retire) |
| lcap_business_objects (221, 265) | draft -> validated -> published -> deprecated -> retired | published(publish), deprecated(deprecate), retired(retire) |
| lcap_pages (715, 265) | draft -> validated -> published -> deprecated -> retired | published(publish), deprecated(deprecate), retired(retire) |
| lcap_workflows (222, 266) | draft -> validated -> published -> deprecated -> retired | published(publish), deprecated(deprecate), retired(retire) |
| lcap_data_sources (716, 265) | configured -> tested -> active -> degraded -> retired | active(activate), retired(retire) |

Each machine has exactly one `is_initial` and one `is_terminal` with monotonic `state_order` (B12 shape passes). Prior `entity_type` value (all `unclassified`) snapshotted here. Loader: `.tmp_deploy/lcap_b1a_lifecycle_states_2026_06_06.ts`.

### B1A-S5 + B1A-S14-ITSM (DONE, bundled)

INSERTed 9 `data_object_relationships` (8 intra-domain B1A-S5 + 1 cross-domain B1A-S14-ITSM, per the action's "bundle if running together"). `is_required=false` (presence-conditional), `notes=''`.

| id | edge | type / kind / owner_side |
|---|---|---|
| 2089 | lcap_apps contains_pages lcap_pages | one_to_many / composition / source |
| 2090 | lcap_apps contains_workflows lcap_workflows | one_to_many / composition / source |
| 2091 | lcap_apps defines lcap_business_objects | one_to_many / composition / source |
| 2092 | lcap_apps binds_to lcap_data_sources | many_to_many / association / source |
| 2093 | lcap_pages displays lcap_business_objects | many_to_many / association / source |
| 2094 | lcap_workflows operates_on lcap_business_objects | many_to_many / association / source |
| 2095 | lcap_workflows triggers_from lcap_pages | many_to_many / association / source |
| 2096 | lcap_business_objects sources_from lcap_data_sources | many_to_many / association / source |
| 2097 | lcap_apps opens service_incidents (47, ITSM master) | many_to_many / association / source |

Loader: `.tmp_deploy/lcap_b1a_intra_relationships_2026_06_06.ts`.

### B1A-S8 (DONE)

INSERTed 21 `data_object_aliases` (4-5 vendor synonyms per master; `alias_type='synonym'`, solution_id resolution deferred per established cluster-drafts behavior; `is_preferred=false`, `notes=''`). Vendor / product names are allowed on `data_object_aliases` per Rule #18.

| master | aliases |
|---|---|
| lcap_apps (220) | Application, App, Canvas App, Model-Driven App |
| lcap_business_objects (221) | Entity, Domain Entity, Table, Record Type, Case Type |
| lcap_workflows (222) | Microflow, Cloud Flow, Process Model, Flow |
| lcap_pages (715) | Screen, Page, Interface, View |
| lcap_data_sources (716) | Integration, Connector, Connected System, Data Page |

Loader: `.tmp_deploy/lcap_b1a_aliases_2026_06_06.ts`.

### B1A-SYSTEM-SKILLS (DONE)

1. **Renamed 5 legacy tools** (PATCH `tool_name` + `description`, removing the `extend` product brand): 564 query_extend_apps -> query_lcap_apps, 565 query_extend_business_objects -> query_lcap_business_objects, 566 query_extend_workflows -> query_lcap_workflows, 822 query_extend_pages -> query_lcap_pages, 823 query_extend_data_sources -> query_lcap_data_sources.
2. **Created 17 new tools** (ids 1748-1764): CRUD mutates (create_/update_ for apps/pages/business_objects/data_sources/workflows) + workflow-gate mutates (publish_lcap_app/page/business_object, activate_lcap_data_source, publish_/deprecate_/retire_lcap_workflow). All `coverage_tier='platform'`, `operation_kind='mutate'`, `data_object_id` set (F4 pairing valid).
3. **Created 2 system skills**: 373 `lcap_visual_composition_agent` (module 265) and 374 `lcap_runtime_lifecycle_agent` (module 266). Both set `domain_id=37` (required by the platform `domain_required_when_skill_type_is_system` constraint) AND `domain_module_id` (Rule #17 anchor).
4. **Linked 24 skill_tools** (17 on skill 373, 7 on skill 374; both within the Rule #17 5-20 floor with >=1 query, >=1 mutate, >=1 gate; `notify_person` (913) reused as the optional notification abstraction). `notes` not written (Rule #15). Both modules: strict_score 1.00 (all tools platform-covered), F5 computable.
5. **Deleted legacy skill 79** (`lcap-system`). Prior row snapshot: `{id:79, skill_name:"lcap-system", skill_type:"system", domain_id:37, domain_module_id:null}`. Its 5 skill_tools (657->564, 658->565, 659->566, 984->822, 985->823, all `required`) were deleted with it. The renamed query tools are now linked from the new per-module skills instead.

Curing F1 (legacy domain-only skill retired), F2 (exactly one system skill per module), F3 (>=1 skill_tools each), F4 (operation_kind/data_object_id pairing valid), F5 (score computable). Loader: `.tmp_deploy/lcap_b1a_system_skills_2026_06_06.ts`.

### Not touched / out of scope

- Catalog UX (`catalog_tagline` / `catalog_description` empty on domain 37 + modules 265/266) is the **b2** item B2-MODULE-CATALOG-UX, not a b1a item, so it was NOT written this pass (directive scope is b1a only; the revised-Rule-#20 backfill in the directive applies only when a b1a item covers the empty field, which none did).
- b1b items (B1B-S13, B1B-S14-OTHERS, B1B-H1-NCDB) remain blocked per their `blocked_by`.
- b2 / b3 untouched.

### Post-load verification (live re-query)

- handoffs 704/705/706/707 `source_domain_module_id` = 265/266/265/265.
- 25 `data_object_lifecycle_states` across the 5 masters; all 5 masters `entity_type=operational_workflow`.
- 9 `data_object_relationships` forward from LCAP masters (8 intra + 1 ITSM); 21 `data_object_aliases`.
- skill 79 absent; zero orphan skill_tools on 79; zero `*extend*` tools remaining.
- system skills 373 (module 265, 17 tools) + 374 (module 266, 7 tools) live.

UI links: https://tests.semantius.app/domain_map/handoffs, https://tests.semantius.app/domain_map/data_object_lifecycle_states, https://tests.semantius.app/domain_map/data_object_relationships, https://tests.semantius.app/domain_map/data_object_aliases, https://tests.semantius.app/domain_map/skills, https://tests.semantius.app/domain_map/tools, https://tests.semantius.app/domain_map/skill_tools.

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
