# Phase B3 cluster brief — D_it

**Domains:** ITSM, CMDB, ITAM, KMS — author lifecycle states + pattern flags for every master+required data_object listed below.

## Task

For every entity in this brief, return: (a) lifecycle states (snake_case state_name; state_order; is_initial; is_terminal; requires_permission; permission_verb_override only when needed; one-line description), OR `(static-reference: no lifecycle)` if it's pure reference data (e.g. tax_authorities, recruitment_sources, salary_bands, pricing_rules); AND (b) pattern flags has_personal_content / has_submit_lock / has_single_approver (true/false with one-line justification).

## Output format (strict — the loader parses this)

Use this exact shape per entity:

````
### <data_object_name>

**Pattern flags:** has_personal_content=<true|false>; has_submit_lock=<true|false>; has_single_approver=<true|false>

**Justification:** <one-line rationale covering any flag set to true; if all false write `no behavioral pattern applies`>

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| <snake_case> | <int> | <true|false> | <true|false> | <true|false> | <verb or _> | <one line> |
````

Or, for reference data:

````
### <data_object_name>

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false
````

## Decision guidance

- **`has_personal_content=true`** when row content is per-user-scoped and visibility/edit is row-author-only by default (e.g. `interview_scorecards`, `csat_responses`, `merit_recommendations`, `pay_slips`).
- **`has_submit_lock=true`** when the entity follows draft → submit-then-lock (e.g. `interview_scorecards` lock on submit, `tax_filings` lock once filed, `merit_recommendations` lock on submit).
- **`has_single_approver=true`** when an explicit single approver gates a transition (e.g. `job_offers` need hiring-manager approval, `discount_approvals` need a deal-desk approver, `purchase_requisitions` need a budget approver).
- **`requires_permission=true`** on a lifecycle state when reaching that state needs a workflow gate (`approved`, `submitted`, `hired`, `resolved`, `closed`). The state's verb derives the permission name (`approved → ats:approve_<entity>`, `hired → ats:hire_<entity>`); set `verb_override` only when the natural verb differs from the state name.
- **State naming:** snake_case, past-tense or status-noun (`draft`, `submitted`, `approved`, `active`, `closed`, `cancelled`). Stay consistent across sibling entities in a domain.
- **Static-reference test:** if the entity has no meaningful state transitions beyond `active/inactive` and exists primarily to be referenced as configuration (codes, rules, catalogs, banded data), mark it `static-reference`. Don't invent CRUD states.

## Entities in scope

### Domain ITSM — IT Service Management (id 1)

> Workflows for managing IT requests, incidents, problems, changes, and knowledge in support of internal business users.

#### knowledge_articles

- **Plural label:** Knowledge Articles · **Singular:** Knowledge Article
- **Description:** KB content backing both self-service portals and agent-assist tooling. Lifecycle: draft → review → published → retired. Quality and freshness are the silent ITSM KPIs that drive deflection rate.
- **Aliases:** KB article (synonym)
- **Relationships (≤12):** hr_cases —references→ knowledge_articles (many_to_many); users —authors→ knowledge_articles (one_to_many); service_problems —documented_in→ knowledge_articles (one_to_many); service_incidents —resolved_with→ knowledge_articles (many_to_many); users —authored articles→ knowledge_articles (one_to_many, req); knowledge_articles —publishes_to→ knowledge_base_articles (one_to_one); customer_cases —references→ knowledge_articles (many_to_many); users —authored→ knowledge_articles (one_to_many); users —approved→ knowledge_articles (one_to_many); knowledge_base_articles —sources→ knowledge_articles (one_to_many); intent_definitions —informs→ knowledge_articles (one_to_many)

#### service_catalog_items

- **Plural label:** Service Catalog Items · **Singular:** Service Catalog Item
- **Description:** Definition of what can be requested: the form schema, fulfilment workflow, approval routing, SLA, and the price/charge-back rules. Each service request instance references a catalog item.
- **Aliases:** catalog offering (synonym)
- **Relationships (≤12):** service_catalog_items —spawns→ service_requests (one_to_many); users —owned catalog items→ service_catalog_items (one_to_many); service_catalog_items —exposes→ iga_entitlement_definitions (one_to_many)

#### service_changes

- **Plural label:** Changes · **Singular:** Change
- **Description:** Planned modification to a service or configuration item. Carries change type (standard, normal, emergency), risk score, CAB approval state, implementation window, and back-out plan. The boundary object between ITSM and CMDB — CIs are updated as a result of an executed change.
- **Aliases:** change ticket (synonym); RFC (synonym)
- **Relationships (≤12):** service_problems —results_in→ service_changes (one_to_many); service_changes —generates→ asset_lifecycle_events (one_to_many); service_changes —impacts→ configuration_items (many_to_many, req); users —owned changes→ service_changes (one_to_many); service_changes —is_approved_by→ users (many_to_many); service_changes —updates→ configuration_items (many_to_many); configuration_items —changed_by→ service_changes (many_to_many)

#### service_incidents

- **Plural label:** Incidents · **Singular:** Incident
- **Description:** Unplanned interruption of, or quality reduction to, a service. Carries severity, priority, category, assignee, affected CI(s), and the MTTR clock. The flagship ITSM work item. ITOM and SECOPS feed in (events become incidents, security alerts become incidents).
- **Aliases:** ticket (synonym); incident ticket (synonym)
- **Relationships (≤12):** onboarding_tasks —emits→ service_incidents (one_to_many); service_requests —routes_to→ service_incidents (one_to_many); service_requests —triggers→ service_incidents (one_to_many); service_problems —is investigated by→ service_incidents (one_to_many); service_incidents —references→ configuration_items (many_to_many); service_slas —governs incident→ service_incidents (one_to_many, req); service_incidents —resolved_with→ knowledge_articles (many_to_many); service_incidents —correlates_to→ monitoring_alerts (many_to_many); service_incidents —correlates_to→ error_groups (many_to_many); users —assigned incidents→ service_incidents (one_to_many); users —reported incidents→ service_incidents (one_to_many, req); service_incidents —triggers→ remediation_plans (one_to_many)

#### service_problems

- **Plural label:** Problems · **Singular:** Problem
- **Description:** Root-cause record for one or more incidents that recur or share a pattern. Carries known-error workaround, permanent fix candidate, and links to the change that will resolve it. Problem management is a discipline mature ITSM tools support but most orgs underuse.
- **Aliases:** known error (synonym)
- **Relationships (≤12):** service_problems —is investigated by→ service_incidents (one_to_many); service_problems —results_in→ service_changes (one_to_many); service_problems —documented_in→ knowledge_articles (one_to_many); users —owned problems→ service_problems (one_to_many)

#### service_requests

- **Plural label:** Service Requests · **Singular:** Service Request
- **Description:** Planned, catalog-driven request: access, hardware, software, information. Distinct from incidents — incidents are reactive, service requests are proactive. The fulfilment for many requests crosses domains (provisioning ↔ IGA, asset assignment ↔ ITAM, HR exception ↔ HRSD).
- **Aliases:** service ticket (synonym); request fulfillment (synonym)
- **Relationships (≤12):** employees —triggers→ service_requests (one_to_many); onboarding_tasks —emits→ service_requests (one_to_many); hr_cases —spawns→ service_requests (one_to_many); users —requests→ service_requests (one_to_many, req); users —fulfills→ service_requests (one_to_many); service_requests —routes_to→ service_incidents (one_to_many); service_catalog_items —spawns→ service_requests (one_to_many); service_requests —triggers→ service_incidents (one_to_many); service_slas —governs request→ service_requests (one_to_many, req); users —assigned requests→ service_requests (one_to_many); users —submitted requests→ service_requests (one_to_many, req); audit_engagements —triggers→ service_requests (one_to_many)

#### service_slas

- **Plural label:** SLAs · **Singular:** SLA
- **Description:** Service-level agreement record: response-time, resolution-time, and availability targets per priority / category / customer tier. SLAs attach to incidents, service requests, and changes; breach metrics roll up to operational KPIs.
- **Aliases:** service level agreement (synonym)
- **Relationships (≤12):** service_slas —governs incident→ service_incidents (one_to_many, req); service_slas —governs request→ service_requests (one_to_many, req); service_slas —aligns_with→ service_level_objectives (many_to_many); users —owned SLAs→ service_slas (one_to_many)

### Domain CMDB — Configuration Management Database (id 4)

> Authoritative record of configuration items and their relationships, underpinning ITSM and ITOM.

#### ci_baselines

- **Plural label:** CI Baselines · **Singular:** CI Baseline
- **Description:** Captured configuration state at a point in time, used for drift detection, approved-state validation, and audit evidence. Triggers an unauthorized-change incident when current state diverges.
- **Aliases:** configuration baseline (synonym)
- **Relationships (≤12):** configuration_items —baselined_in→ ci_baselines (many_to_many); users —authored baselines→ ci_baselines (one_to_many); ci_baselines —triggers→ service_incidents (one_to_many)

#### ci_classes

- **Plural label:** CI Classes · **Singular:** CI Class
- **Description:** The CI type hierarchy (Computer → Linux Server → Web Server, Application → Microservice → REST API) defining schema, inherited attributes, and class-level monitoring/discovery policies. The schema-of-schemas for the CMDB.
- **Aliases:** CI type (synonym); CI category (synonym)
- **Relationships (≤12):** ci_classes —classifies→ configuration_items (one_to_many, req); users —owned classes→ ci_classes (one_to_many)

#### ci_relationships

- **Plural label:** CI Relationships · **Singular:** CI Relationship
- **Description:** Edges in the CI graph: depends-on, runs-on, contains, member-of, hosted-by, communicates-with. The topology that makes service mapping, impact analysis, and event correlation possible.
- **Aliases:** CI dependency (synonym); CI link (synonym)
- **Relationships (≤12):** configuration_items —related_via→ ci_relationships (one_to_many); ci_relationships —forms→ service_maps (many_to_many); users —created relationships→ ci_relationships (one_to_many)

#### configuration_items

- **Plural label:** Configuration Items · **Singular:** Configuration Item
- **Description:** Canonical record of an IT thing under management: server, container, application, business service, network device, database, cloud resource. The flagship CMDB entity, referenced by changes, incidents, problems, and topology. Multi-feed: DISCOVERY auto-populates, HAM provides the physical-asset overlay for hardware CIs, SAM/SMP overlay for software/SaaS CIs.
- **Aliases:** CI (synonym); config item (synonym)
- **Relationships (≤12):** service_incidents —references→ configuration_items (many_to_many); service_changes —impacts→ configuration_items (many_to_many, req); service_changes —updates→ configuration_items (many_to_many); enterprise_applications —mapped_to→ configuration_items (many_to_many); enterprise_applications —onboards_into→ configuration_items (one_to_one); ci_classes —classifies→ configuration_items (one_to_many, req); configuration_items —related_via→ ci_relationships (one_to_many); configuration_items —baselined_in→ ci_baselines (many_to_many); configuration_items —composes→ service_maps (many_to_many); configuration_items —backed_by→ hardware_assets (one_to_one); configuration_items —changed_by→ service_changes (many_to_many); users —owned CIs→ configuration_items (one_to_many)

#### service_maps

- **Plural label:** Service Maps · **Singular:** Service Map
- **Description:** Business-service-to-CI mapping: which CIs underlie a named business service. The bridge between technical topology (CMDB / DISCOVERY) and business impact (used by ITSM, SECOPS, OBS).
- **Aliases:** application service map (synonym); dependency map (synonym)
- **Relationships (≤12):** configuration_items —composes→ service_maps (many_to_many); ci_relationships —forms→ service_maps (many_to_many); users —owned service maps→ service_maps (one_to_many); service_maps —refreshes→ service_incidents (many_to_many)

### Domain ITAM — IT Asset Management (id 3)

> Umbrella domain covering hardware, software, cloud-cost, and enterprise-asset management.

#### asset_contracts

- **Plural label:** Asset Contracts · **Singular:** Asset Contract
- **Description:** Lease, maintenance, support, or warranty contract governing an asset or pool of assets. Distinct from contract templates / signature artifacts (CLM-mastered): this is the ITAM-side index of contracts attached to physical or software assets. ITAM contributes the asset-pool linkage; CLM masters the contract document itself.
- **Aliases:** IT contract (synonym); support contract (synonym); maintenance agreement (synonym)
- **Relationships (≤12):** asset_contracts —triggered by→ asset_lifecycle_events (one_to_many); asset_contracts —governs→ asset_lifecycle_events (one_to_many); asset_contracts —fulfilled_by→ purchase_orders (one_to_many); asset_contracts —covers→ saas_applications (many_to_many); users —owned contracts→ asset_contracts (one_to_many); asset_contracts —feeds→ compliance_risks (one_to_many); asset_contracts —accrues_in→ journal_entries (one_to_many)

#### asset_lifecycle_events

- **Plural label:** Asset Lifecycle Events · **Singular:** Asset Lifecycle Event
- **Description:** Cross-cutting lifecycle audit log applicable to hardware, software, and SaaS assets: procurement, deployment, transfer, retirement, disposal. ITSM (incident-driven failure events), HCM (employee termination → recall), and Onboarding (provisioning) all contribute events.
- **Aliases:** asset event (synonym); asset transition (synonym)
- **Relationships (≤12):** employees —triggers→ asset_lifecycle_events (one_to_many); users —assigned→ asset_lifecycle_events (one_to_many); asset_contracts —triggered by→ asset_lifecycle_events (one_to_many); onboarding_tasks —triggers→ asset_lifecycle_events (one_to_many); hardware_assets —delivered by→ asset_lifecycle_events (one_to_many); service_changes —generates→ asset_lifecycle_events (one_to_many); users —logged events→ asset_lifecycle_events (one_to_many); fixed_assets —impacted by lifecycle→ asset_lifecycle_events (one_to_many); technology_platforms —registers_as→ asset_lifecycle_events (one_to_many); asset_contracts —governs→ asset_lifecycle_events (one_to_many); saas_applications —lifecycle events for→ asset_lifecycle_events (one_to_many); users —recorded events→ asset_lifecycle_events (one_to_many)

### Domain KMS — Knowledge Management (id 33)

> Authoring, governance, and retrieval of organisational knowledge for internal and external audiences.

#### article_feedback

- **Plural label:** Article Feedbacks · **Singular:** Article Feedback
- **Description:** User satisfaction signals: rating, helpful/not-helpful votes, comments.
- **Master slice notes:** Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred to follow-up audit pass

#### article_revisions

- **Plural label:** Article Revisions · **Singular:** Article Revision
- **Description:** Audit trail of article edits: prior_version_id, author, timestamp, change_summary, revert capability.
- **Master slice notes:** Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred to follow-up audit pass

#### knowledge_base_articles

- **Plural label:** Knowledge Base Articles · **Singular:** Knowledge Base Article
- **Description:** Authored, versioned content unit. The KMS standalone-market master, distinct from ITSM/CSM/HRSD/LSD bundled `knowledge_articles` (which are platform-embedded). Lifecycle: draft → published → archived.
- **Master slice notes:** Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred to follow-up audit pass
- **Relationships (≤12):** case_categories —drives→ knowledge_base_articles (one_to_many); knowledge_articles —publishes_to→ knowledge_base_articles (one_to_one); knowledge_base_articles —sources→ knowledge_articles (one_to_many); document_versions —mirrors_to→ knowledge_base_articles (one_to_many)

#### knowledge_categories

- **Plural label:** Knowledge Categories · **Singular:** Knowledge Category
- **Description:** Hierarchical organisation of articles (topics, sections, tags, search facets).
- **Master slice notes:** Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred to follow-up audit pass

#### knowledge_collections

- **Plural label:** Knowledge Collections · **Singular:** Knowledge Collection
- **Description:** Curated groupings of articles (product docs, process guides, FAQs, onboarding playbooks). Audience tags + expiration.
- **Master slice notes:** Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred to follow-up audit pass

#### knowledge_search_queries

- **Plural label:** Knowledge Search Queries · **Singular:** Knowledge Search Query
- **Description:** Logged search events for analytics; identifies gaps (zero-result queries).
- **Master slice notes:** Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred to follow-up audit pass
