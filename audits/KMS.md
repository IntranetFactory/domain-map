---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 16
---

# KMS - Audit History

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- Current footprint: `domains` row id 33, `domain_code='KMS'`, `domain_name='Knowledge Management'`. **No `domain_modules` rows on KMS** and no `domain_module_host_domains` rows hosting other-domain modules on KMS, so M1 fails outright. KMS masters 6 data_objects (`knowledge_base_articles`, `knowledge_categories`, `article_revisions`, `article_feedback`, `knowledge_search_queries`, `knowledge_collections`) via the legacy `domain_data_objects` table only, with zero `domain_module_data_objects` rows on KMS-owned modules and one stray `consumer` link from `HRSD-CASE-MGMT` on `knowledge_base_articles`. 1 capability linked (`KNOWLEDGE-MGMT`), 9 solutions linked, 4 business_function_domains rows, 1 regulation (ISO/IEC 27001).
- The catalog also carries three peer "knowledge" modules hosted on adjacent domains: `ITSM-KNOWLEDGE` (id 43, masters `knowledge_articles` id 51), `HRSD-KNOWLEDGE` (id 77, consumes `knowledge_articles`), `CSM-KNOWLEDGE` (id 114, contributes to `knowledge_articles`). None of them host on KMS via `domain_module_host_domains`. This is the central structural question of this audit: should KMS canonically master one knowledge-article entity that the three service-management modules embed, or should each service-management domain keep its own knowledge module and KMS retreat to enterprise-knowledge concerns (collections, search analytics, gap analysis)? See Bucket 2 item 1.
- Vendor-surface basis: pure-play knowledge / enterprise-search platforms (ServiceNow Knowledge Management as the primary, Notion, Coda, iManage Cloud, Atlassian Confluence / Jira Service Management adjuncts) per existing `solution_domains` rows, plus the flagship enterprise-search / RAG / agent-assist anchors that surface in any knowledge-management market read (Glean, Coveo, Algolia, Elastic, Lucidworks, Cresta, ASAPP, Forethought, Aisera). The existing solution list under-represents the modern enterprise-search and RAG-platform tier and over-weights the document-management adjacency (iManage); see Bucket 3.
- 13 cross-domain handoffs touch KMS (5 outbound, 8 inbound). Of the 13, exactly **2 handoffs carry an APQC `handoff_processes` row** (handoff 630 `agent_curated` -> "Maintain service support knowledge repository", handoff 826 `discovery_substring` -> "Document trade", neither yet approved). H1 volume expectation against the 13-handoff baseline is 6-10 newly proposed `agent_curated` tags this audit; the audit drafts 11 (see Bucket 1 APQC TAGGING).
- All 13 handoffs have at least one NULL module FK (Section B10b on every row). Both `source_domain_module_id` and `target_domain_module_id` are NULL on every KMS-side leg because KMS has no `domain_modules` row to resolve to. This is a derived defect downstream of M1 - **resolving M1 unblocks B10b on every KMS-side leg automatically.**
- **Bucket 1 (in-scope, agent fixable):** 5 items.
- **Bucket 2 (surface-for-user, judgment):** 7 items.
- **Bucket 3 (Phase 0 pending, speculative):** 4 items.
- Candidates queued to `audits/_missing-domains.md`: 2 (new ENTERPRISE-SEARCH and new AGENT-ASSIST). The cross-domain knowledge-article ownership question (Bucket 2 item 1) is a within-catalog routing question and does not become a `_missing-domains.md` candidate.

### Pass 1 - Structural (per-domain completeness checklist)

| Band | Result | Evidence / next step |
|---|---|---|
| S1 (FK sweep to domains) | PARTIAL | `capability_domains` 1 row (pass), `solution_domains` 9 rows (pass), `business_function_domains` 4 rows (pass), `domain_regulations` 1 row (pass), `domain_modules` 0 rows (FAIL M1), `domain_data_objects` 6 rows (legacy table; pass on count but Phase B rollup belongs in `domain_module_data_objects` per Rule #14), `handoffs.source_domain_id` 5 rows (pass), `handoffs.target_domain_id` 8 rows (pass), `skills` 1 row (`kms-system`, `domain_module_id=null` - legacy F1 fail per Rule #14 / #17). |
| S2 (per-module DMDO + capability coverage) | N/A | no `domain_modules` on KMS to sweep. The S2 sweep effectively routes to M1. |
| S3 (per-master indirect coverage) | EVIDENCE | 6 masters; pulled per-master counts inline below. |
| A1 (domains row metadata) | PASS | `crud_percentage=75`, `business_logic` non-empty (Search/RAG retrieval, ranking, embeddings), `min_org_size='10 xs <50'`, `cost_band='$$'`, `usa_market_size_usd_m=1000`, `market_size_source_year=2025`, `certification_required=false`. All seven Rule #8 fields populated. |
| A2 (capabilities) | FAIL | Only 1 `capability_domains` row (`KNOWLEDGE-MGMT`). For a market with the breadth implied by Glean / Coveo / ServiceNow KM / Notion (authoring, taxonomy, federated search, analytics, governance, AI gap-analysis, agent-assist), 1 capability is under-modeled. Pass criterion is >=3 (typical 5-8). |
| A3 (solutions with coverage_level) | PASS | 9 solutions: 3 `primary` (ServiceNow Knowledge Management, Notion, Coda), 5 `secondary` (Salesforce Sales Cloud, Salesforce Experience Cloud, Jira Service Management, iManage Cloud, Salesforce Service Cloud), 1 `partial` (Slack). Above 3-row floor with >=1 primary. |
| A4 (catalog UX fields) | FAIL | `catalog_tagline=''`, `catalog_description=''`. Draft proposed in Bucket 1 / Bucket 2; per Rule #20 needs user-approved wording BEFORE writing. |
| A5 (vendor ownership refresh) | SKIPPED | opt-in only per the audit recipe. Coda was acquired by Grammarly Inc.; verified in solutions table (vendor_name='Grammarly Inc.'). Workvivo / Confluence M&A details not investigated this pass. |
| M1 (>=1 module per domain) | FAIL | 0 `domain_modules` rows for KMS, 0 `domain_module_host_domains` rows targeting KMS. Rule #14 requires >=1 full module per `domains` row, no exception. |
| M2 (>=2 modules when >=3 capabilities) | VACUOUS | Only 1 capability today (`KNOWLEDGE-MGMT`); M2 vacuously passes against the current capability set. If Bucket 2 item 1 routes to "KMS is the canonical knowledge market", A2 should grow to 5-8 capabilities, at which point M2 promotes to >=2 full modules. |
| M4 (every capability has a realizing module) | FAIL | 1 orphan capability `KNOWLEDGE-MGMT` - no `domain_module_capabilities` row links it to a realizing module on KMS (because no module exists). |
| M5 (workflow-gate states have domain_module_id) | FAIL | `data_object_id=410` state `published` has `requires_permission=true`, `permission_verb_override='publish_article'`, `domain_module_id=NULL`. The state's realizing module is undefined, so the materialized permission has no prefix. Once M1 lands and a KMS module exists, this FK gets set. |
| M6 (every module realizes >=1 capability) | N/A | no modules. |
| M7 (single-master integrity) | EVIDENCE | `data_object_id=410` (`knowledge_base_articles`) and `data_object_id=51` (`knowledge_articles`) are TWO different data_objects sharing the same concept ("an authored knowledge article"), each canonically mastered: 410 by KMS via `domain_data_objects` (no module), 51 by `ITSM-KNOWLEDGE` via `domain_module_data_objects`. Rule #9 collision: `knowledge_articles` is a substring of `knowledge_base_articles`. M7 hard-fail condition (same `data_object_id` mastered in two modules) does not strictly apply because they are different ids; **but the catalog has two canonical owners for the same business concept**, which is the underlying defect M7 exists to catch. See Bucket 2 item 1 for the architectural decision. |
| B1 (>=1 master data_object) | PASS | 6 master rows in `domain_data_objects` (knowledge_base_articles, knowledge_categories, article_revisions, article_feedback, knowledge_search_queries, knowledge_collections). |
| B2 (singular / plural labels on every master) | PARTIAL | All 6 masters have non-empty labels; one suspect plural: `article_feedback` -> `Article Feedbacks` (English-uncountable noun should plural as `Article Feedback` or `Article Feedback Records`). PATCH proposed in Bucket 1. |
| B3 (naming arbitration applied) | PASS-BY-PREFIX | All 6 masters use prefixed shape (`knowledge_*`, `article_*`) so no bare-word claim is needed. `naming_authority_rationale` blank is correct. |
| B4 (pattern flags considered) | PARTIAL | `knowledge_base_articles.has_submit_lock=true`, `article_feedback.has_personal_content=true`. The other four masters all `false` on every flag - false-by-default counted as considered for `knowledge_categories` / `knowledge_collections` (config-shaped masters with no personal content); `knowledge_search_queries` might warrant `has_personal_content=true` because search queries can carry personal information (PII in the query string itself). See Bucket 2 item 6. |
| B5 (embedded_master integrity) | PASS | 0 `embedded_master` rows on KMS; vacuous. |
| B6 (intra-domain `data_object_relationships`) | FAIL | Only 1 intra-KMS edge: `knowledge_articles (51) -> publishes_to -> knowledge_base_articles (410)` (which is across the M7 collision boundary, not actually intra-KMS). Missing edges between KMS-mastered data_objects: `knowledge_base_articles <-> knowledge_categories` (categorization), `knowledge_base_articles <-> article_revisions` (versioning), `knowledge_base_articles <-> article_feedback` (rating), `knowledge_search_queries <-> knowledge_base_articles` (result hits), `knowledge_collections <-> knowledge_base_articles` (membership). Five canonical edges absent. |
| B7 (`users` edges populated) | FAIL | 0 edges between any KMS master and `users` (id 748). Rule #10 requires at least `knowledge_base_articles.author -> users`, `article_revisions.editor -> users`, `article_feedback.submitter -> users`, `knowledge_collections.curator -> users`. Five missing edges minimum. |
| B8 (outbound cross-domain `data_object_relationships`) | PARTIAL | Of the 5 outbound handoffs, none have a corresponding cross-domain `data_object_relationships` row from a KMS master onto a partner master. The 2 existing cross-domain edges on KMS data_objects originate from the partner side (`case_categories (193) -> drives -> knowledge_base_articles (410)`, `document_versions (430) -> mirrors_to -> knowledge_base_articles (410)`), so they count toward those partners' B8 audits, not KMS's. Missing KMS-side outbound edges: `knowledge_base_articles -> updates -> hr_cases` (downstream HRSD self-service), `knowledge_base_articles -> trains -> conversation_flows` (CONV-AI RAG corpus), `knowledge_search_queries -> reveals_gap_in -> content_lifecycle_plans` (WEB-CONTOPS feedback loop). |
| B9 (outbound `trigger_events` + `handoffs` complete) | PASS | 8 `trigger_events` rows cover the lifecycle vocabulary (`knowledge_base_article.published`, `.deprecated`, `.updated`; `knowledge_category.restructured`; `article_revision.approved`; `article_feedback.negative`; `knowledge_search_query.no_result`; `knowledge_collection.published`). 5 outbound `handoffs` rows wire to HRSD / CSM / CCAAS / CONV-AI. The full vocabulary has subscribers. |
| B9b (intra-domain cross-module handoffs) | VACUOUS | Skipped per the B9b pre-check: KMS has fewer than 2 `domain_modules`. Will become non-vacuous if Bucket 2 item 1 routes to a multi-module KMS shape. |
| B10 (inbound handoffs - REPORT-ONLY) | EVIDENCE | 8 inbound handoffs: HRSD `hr_case.resolved` -> KMS (payload `hr_cases`), HRSD `case_category.updated` -> KMS (payload `case_categories`), LEGAL-PRACT-MGMT `legal_matter.closed` -> KMS (payload `legal_matters`), ITSM `knowledge_article.published` -> KMS (payload `knowledge_articles` id 51), CONV-AI `conversation_flow.fallback_triggered` -> KMS (payload `conversation_flows`), WEB-CONTOPS `content_lifecycle.review_due` -> KMS (payload `content_lifecycle_plans`), WEB-CONTOPS `content_inventory.refreshed` -> KMS (payload `web_content_inventory_records`), ECM `document.version_published` -> KMS (payload `document_versions`). All 8 currently lack a `consumer` DMDO on a KMS module - the dependency is unrecorded on KMS's side because KMS has no module to put it on. Resolving M1 unblocks the consumer-DMDO loads. |
| B10b (per-module attribution on handoffs) | FAIL | All 13 handoffs touching KMS have NULL on the KMS side: 5 outbound rows have `source_domain_module_id=NULL` (KMS owns no module), 8 inbound rows have `target_domain_module_id=NULL`. Two inbound rows additionally have `source_domain_module_id=NULL` on the partner side (CONV-AI 745, ECM 826 - partner-side B10b on those domains' audits). Resolving M1 unblocks all 13 KMS-side legs. |
| B11 (`data_object_aliases` populated for non-self-explanatory masters) | FAIL | 0 alias rows on any of the 6 KMS masters. Industry synonyms: `knowledge_base_articles` -> `kb article` / `support article` / `help center article` / `wiki page`; `knowledge_categories` -> `kb taxonomy` / `category` / `topic`; `article_revisions` -> `article version` / `draft` / `edit history`; `knowledge_search_queries` -> `kb search` / `help search query`; `knowledge_collections` -> `kb space` / `playbook` / `knowledge pack`. Minimum 1 per master; some (search_queries especially) merit 2-3. |
| B12 (`data_object_lifecycle_states` + pattern flags) | PARTIAL | 4 states on `knowledge_base_articles` (draft / in_review / published / retired) and 3 states on `article_feedback` (submitted / triaged / closed). Other 4 masters have zero states. `article_revisions` plausibly has a workflow (`draft` / `submitted_for_approval` / `approved` / `published`) and a `requires_permission=true` gate at `approved`. `knowledge_collections` plausibly has `draft` / `published` / `archived`. `knowledge_categories` and `knowledge_search_queries` are arguably config-shaped (Rule #12 exemption) but the exemption per Rule #15 cannot be auto-annotated in `notes`; if no states, surface the exemption to user. |
| C1 (`business_function_domains` owner row) | PASS | 1 `owner` (Business Operations), 1 `contributor` (Customer Service), 2 `consumer` (IT Operations, Sales). Reasonable surface; not every consumer (HR, Legal, Marketing Communications) is enumerated but the rule is "at least one owner". |
| C2 (BF-capability overrides) | PASS-BY-ALLOWANCE | 1 capability today, no overrides needed; if A2 grows on the Bucket 2 item 1 "KMS as canonical knowledge market" route, the new capabilities (compliance content governance, AI gap-analysis) plausibly diverge from Business Operations and would need overrides. |
| D1 (UI spot-check) | DEFERRED | nothing loaded yet; D1 runs after fix loads land. |
| E1 (role coverage matches module shape) | N/A | E1 vacuously passes per the rule on single-module domains; KMS doesn't even have a single module, so this routes to M1. If KMS goes multi-module on Bucket 2 item 1, the Knowledge Author / Knowledge Steward / Knowledge Manager personas would need to be authored on the function-scoped pattern. The three knowledge modules on ITSM / HRSD / CSM already carry domain-specific knowledge roles (`IT-KNOWLEDGE-AUTHOR`, `HRSD-KNOWLEDGE-MANAGER`); a cross-domain enterprise knowledge persona is missing. |
| E2-E6 | N/A | no roles to evaluate. |
| F1 (no legacy domain-level system skills) | FAIL | `skills.id=77`, `skill_name='kms-system'`, `skill_type='system'`, `domain_id=33`, `domain_module_id=NULL`. Legacy domain-level row. The skill nonetheless has 6 `skill_tools` rows (all `coverage_tier='platform'` queries on the 6 KMS masters), so it is wired and computable but at the wrong layer per Rule #17. Once M1 lands and a KMS module exists, the legacy skill DELETEs and is re-authored as `<module_code>_agent` per Phase S. |
| F2 (system skill per module) | FAIL | 0 modules so 0 module-level system skills, automatic fail. Same M1 root cause as M4 / E1 / F5. |
| F3 (>=1 skill_tools per system skill) | PARTIAL | The legacy skill 77 has 6 tools, all platform-covered. Once F2 resolves, the new module-level skill inherits the same 6 (and may add `update_*` / lifecycle-gate tools per Phase S). |
| F4 (tool operation_kind vs data_object_id invariant) | PASS | All 6 tools on legacy skill 77 are `operation_kind='query'` with `data_object_id` set; invariant holds. |
| F5 (Semantius score is computable per module) | UNCOMPUTABLE | 0 modules; F5 rolls up M1 + F2. |
| F7 (channel primitives only when workflow demands) | PASS-BY-ALLOWANCE | The legacy skill links zero channel primitives. When the module-level skill is authored, generic "knowledge update notifications" should link `notify_team` (broadcast to subscribed audience), not `send_email` directly. |
| H1 (APQC tagging on cross-domain handoffs) | FAIL | 13 cross-domain handoffs (5 outbound, 8 inbound), 2 with existing `handoff_processes` rows (handoff 630 -> process 1293 `agent_curated`; handoff 826 -> process 339 `discovery_substring`). Both `record_status='new'`. Volume expectation 6-10 new `agent_curated` tags this audit; 11 are drafted in Bucket 1 APQC TAGGING. |

### Pass 2 - Market audit (semantic)

No subagent JSON was generated because the audit is dominated by the M1 + Rule #9 collision question (Bucket 2 item 1) on top of which every Phase B / E / F / H decision depends. Running a market-surface subagent before the canonical-ownership-of-knowledge-article question is settled would generate a "KMS masters these flagship-vendor entities" surface, but the routing of those entities (KMS canonical vs ITSM-KNOWLEDGE canonical vs both) is the upstream architectural decision. Vendor surface enumerated inline below as the substitute for the subagent run.

#### Vendor-surface basis (manual enumeration)

Pure-play KM and adjacent enterprise-search anchors selected from the 9 `solutions` rows already linked plus the modern enterprise-search / RAG tier that is missing from the current solution list:

- **ServiceNow Knowledge Management** (`primary`, in catalog) - ITSM / HRSD / CSM-anchored knowledge base; tightly integrated with service-management cases. Masters knowledge_articles, knowledge_drafts, knowledge_categories, kb_taxonomy, article_feedback, knowledge_owners.
- **Notion** (`primary`, in catalog) - block-based modern wiki; pages, databases, sub-pages, comments, page properties. Strong on team-internal docs, weaker on customer-facing KB delivery.
- **Coda** (`primary`, in catalog, vendor recently changed to Grammarly Inc.) - hybrid doc / database; tables-in-docs, automations, packs.
- **Atlassian Confluence** (not in catalog, surfaced via Jira Service Management adjacency) - traditional wiki anchor; spaces, pages, templates, page-tree hierarchy. The default enterprise wiki in many orgs.
- **iManage Cloud** (`secondary`, in catalog) - document management anchored at legal practice; knowledge module is adjunct.
- **Bloomfire** / **Guru** / **Document360** (not in catalog) - dedicated customer-facing KB platforms; cards, decks, AI-assisted authoring, verification cycles.
- **Glean** / **Coveo** / **Elastic Enterprise Search** / **Algolia** / **Lucidworks Fusion** / **Sinequa** (not in catalog) - the enterprise-search / RAG tier; **none of these vendors are linked to KMS today**. They sit at the boundary between KMS and a candidate ENTERPRISE-SEARCH domain (queued to `_missing-domains.md`). Glean specifically is the modern flagship and would dominate the KMS solution list if added.
- **Cresta** / **ASAPP** / **Forethought** / **Aisera** / **Espressive** (not in catalog) - the AI agent-assist tier; knowledge-surfacing into case workspaces. Queued as candidate AGENT-ASSIST domain.

Compliance / personal-content specialists: ISO/IEC 27001 is the only `domain_regulations` row today; the actual market also intersects ISO 30401 (Knowledge Management Systems standard), GDPR (when knowledge articles carry customer-personal examples or when search queries log PII), and HIPAA / FERPA / SEC 17a-4 where knowledge corpora touch regulated content. None are loaded.

The four market-audit categories:

- **MISSING entities** (in market surface, not in current footprint):
  - `knowledge_owners` (per-article steward / SME assignment; ServiceNow KM, Document360, Bloomfire, Guru all carry).
  - `knowledge_subscriptions` (per-user follows on articles / categories; Notion, Confluence, Guru).
  - `article_verification_cycles` (mandatory accuracy review on cadence; Guru "trust score", Bloomfire verifications, Document360 review reminders).
  - `knowledge_taxonomies` (the schema itself, separate from category instances; ServiceNow KB schema, Document360 categories templates).
  - `search_synonyms` / `search_dictionaries` (Glean, Coveo, Algolia, Lucidworks all carry; under-modeled today).
  - `external_knowledge_sources` (federated search source connectors; Glean's whole proposition).
  - `rag_query_logs` / `rag_response_evals` (RAG-platform specific; the modern enterprise-search tier).
- **WRONG-OWNERSHIP**: the `data_objects.id=51` `knowledge_articles` row is canonically mastered by `ITSM-KNOWLEDGE`. If KMS is the canonical knowledge market, it should master, not ITSM-KNOWLEDGE. If KMS is a derived analytics layer on top of per-domain knowledge modules, the current ownership is correct and KMS should not master `knowledge_base_articles` either. See Bucket 2 item 1.
- **SCOPE-CREEP**: `knowledge_search_queries` (id 414) being mastered on KMS rather than on an ENTERPRISE-SEARCH domain is borderline - Glean and Coveo are the canonical homes for search-query logs. This routes to the ENTERPRISE-SEARCH candidate triage.
- **MODULARIZATION-ISSUES**: KMS has no modules at all. The catalog's three `*-KNOWLEDGE` modules (ITSM-KNOWLEDGE, HRSD-KNOWLEDGE, CSM-KNOWLEDGE) are domain-specific consumers of one shared `knowledge_articles` master; the question is whether they should consume a KMS-mastered article entity instead of one ITSM-KNOWLEDGE-mastered article entity. Either shape is defensible; the current shape is incoherent (KMS masters one article entity, ITSM-KNOWLEDGE masters a different one, two cross-domain `data_object_relationships` rows mediate between them with `publishes_to` / `sources` verbs). See Bucket 2 item 1.

### Pass 3 - Neighbor discovery

Auto-derived from the 13 cross-domain handoffs and the cross-domain `data_object_relationships`:

| Neighbor | Edge weight signal | Why |
|---|---|---|
| HRSD | 3 (1 outbound handoff to HRSD `hr_case`, 2 inbound from HRSD `hr_case.resolved` and `case_category.updated`) | HRSD modules consume `knowledge_base_articles` (HRSD-CASE-MGMT has a stray consumer row on KMS-410); HRSD publishes case resolutions for knowledge harvest. |
| ITSM | 1 (1 inbound handoff on `knowledge_article.published`, plus the cross-domain `publishes_to`/`sources` relationship between articles 51 and 410) | Source of the M7-adjacent canonical ownership question; ITSM-KNOWLEDGE masters `knowledge_articles` id 51 directly. |
| CSM | 1 outbound `knowledge_base_article.published` to CSM | CSM-KNOWLEDGE contributes to `knowledge_articles` id 51; KMS publishes articles to CSM. Reciprocal half of the ownership question. |
| CCAAS | 1 outbound `knowledge_base_article.updated` | CCAAS uses KB articles as agent-assist context. |
| CONV-AI | 2 (1 outbound `knowledge_base_article.published` to CONV-AI, 1 inbound `conversation_flow.fallback_triggered`) | CONV-AI uses KMS articles as RAG retrieval corpus and routes fallbacks back to KMS for gap analysis. |
| WEB-CONTOPS | 2 inbound (`content_lifecycle.review_due` and `content_inventory.refreshed`) | WEB-CONTOPS treats KB articles as one content surface among many; review-due signals propagate. |
| LEGAL-PRACT-MGMT | 1 inbound (`legal_matter.closed`) | Closed legal matters become knowledge artifacts (precedent records). |
| ECM | 1 inbound (`document.version_published`) | ECM publishes document versions into KMS as authoritative sources. |

Pass 4 runs the 5-section diff against all 8 (treating CCAAS / LEGAL-PRACT-MGMT / ECM as edge-weight-2-equivalents because each one's one inbound is the heart of a real cross-domain workflow, not noise). All KMS-side legs share the same M1-rooted defect on B10b; the per-pair diffs land in Bucket 1 as the BOUNDARY block below.

### Pass 4 - Pairwise reconciliation per neighbor

Compressed per-neighbor: every KMS-side leg of every cross-domain handoff has NULL on its KMS-side module FK (M1). Resolving M1 with a KMS module (or KMS module set per Bucket 2 item 1) unblocks every B10b leg on KMS's side. The partner-side gaps below are routed to Report-only follow-ups; the KMS-side fixes are in the BOUNDARY block of Bucket 1.

| Neighbor | Section 2: NULL FK candidates (KMS side) | Section 3: missing handoffs the catalog implies | Section 4: boundary integrity gaps | Section 5: missing cross-domain relationships |
|---|---|---|---|---|
| HRSD | h-721 (`knowledge_base_article.published` -> HRSD-CASE-MGMT) `source_domain_module_id=NULL`; h-1120 (`hr_case.resolved` -> KMS) `target_domain_module_id=NULL`; h-447 (`case_category.updated` -> KMS) `target_domain_module_id=NULL`. All three NULLs resolve when a KMS module exists. | KMS has no consumer DMDO on `hr_cases` (192) or `case_categories` (193) - resolving M1 unlocks consumer DMDO loads. | `case_categories (193) -> drives -> knowledge_base_articles (410)` exists from HRSD side; symmetric on KMS side missing. | KMS->HRSD: `knowledge_base_articles -> resolves -> hr_cases` candidate row. |
| ITSM | h-630 (`knowledge_article.published` -> KMS) `target_domain_module_id=NULL`. | Catalog implies KMS should publish `knowledge_base_article.published` -> ITSM-KNOWLEDGE; not loaded. | ITSM-KNOWLEDGE masters `knowledge_articles` id 51; KMS masters `knowledge_base_articles` id 410. M7 collision-adjacent. | `knowledge_base_articles -> sources -> knowledge_articles` exists (relationship row); the reverse `publishes_to` exists as well. Both are workarounds for the M7-adjacent dual mastership. |
| CSM | h-720 (`knowledge_base_article.published` -> CSM) `source_domain_module_id=NULL`, `target_domain_module_id=NULL`. | Missing inbound `case.resolved` -> KMS for knowledge harvest (symmetric to HRSD's pattern). | CSM-KNOWLEDGE contributes to `knowledge_articles` id 51 (not 410), so the published article event from KMS routes via the publishes_to relationship. | `knowledge_base_articles -> resolves -> customer_cases` candidate; not loaded. |
| CCAAS | h-722 (`knowledge_base_article.updated` -> CCAAS) `source_domain_module_id=NULL`, `target_domain_module_id=NULL`. | None obvious. | None. | `knowledge_base_articles -> assists -> contact_center_agents` candidate; speculative. |
| CONV-AI | h-723 (`knowledge_base_article.published` -> CONV-AI) NULL both sides; h-724 (`knowledge_search_query.no_result` -> CONV-AI) NULL both sides; h-745 (`conversation_flow.fallback_triggered` -> KMS) NULL both sides. | None new. | None. | `knowledge_base_articles -> trains -> conversation_flows` candidate; the RAG-corpus relationship. `knowledge_search_queries -> reveals_gap_in -> conversation_flows` candidate. |
| WEB-CONTOPS | h-818, h-819 (NULL both sides) | None new. | None. | `web_content_inventory_records -> overlaps_with -> knowledge_base_articles` candidate (existing scope-control gap). |
| LEGAL-PRACT-MGMT | h-334 (`legal_matter.closed` -> KMS) `target_domain_module_id=NULL`. | None new. | None. | `legal_matters -> spawns -> knowledge_base_articles` candidate. |
| ECM | h-826 (`document.version_published` -> KMS) NULL both sides. | None new. | None. | `document_versions -> mirrors_to -> knowledge_base_articles` row EXISTS already. |

Every NULL above resolves with one M1 fix on KMS (Bucket 1 B1-S1). The missing relationships (Section 5) are tracked in Bucket 1 BOUNDARY; the missing handoffs are flagged for the partner domain's audits.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures (deterministically fixable on KMS alone)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 / M4 / M5 / F1 / F2 / B10b | KMS has zero `domain_modules` rows. Every M-band / F-band / B10b failure rolls up to this single defect. The fix shape depends on Bucket 2 item 1 (canonical-vs-derived ownership). On the "KMS canonical" route: load 2 modules (e.g. `KMS-AUTHORING` and `KMS-DELIVERY`) or 3 (`KMS-AUTHORING`, `KMS-TAXONOMY`, `KMS-ANALYTICS`). On the "derived layer" route: load 1 landing module `KMS-CORE` whose DMDOs `consumer` from the per-domain knowledge masters. Either way, every NULL FK on the 13 handoffs and every M-band failure resolves once the module(s) exist. | Decide the module split (Bucket 2 item 1), then load `domain_modules` rows + matching `domain_module_capabilities` + `domain_module_data_objects` (master / embedded_master / consumer per the route) + workflow-gate lifecycle states with `domain_module_id` set + module-level `skills` + `skill_tools`. Backfill the 13 handoffs' KMS-side module FKs deterministically. |
| B1-S2 | A4 | `catalog_tagline` and `catalog_description` are empty on the `domains` row. Rule #20 requires both, written in buyer voice. | Draft both fields per Rule #20, surface to user for explicit per-row approval BEFORE writing. Proposed drafts: `catalog_tagline = "Capture, govern, and surface organizational know-how across teams, channels, and AI assistants."`; `catalog_description = "Author knowledge articles, organize them into categories and curated collections, and version every revision through review and publication. Track which articles answer real questions, which fail to retrieve, and where the gaps are. Power help centers, agent-assist surfaces, and RAG retrieval for AI assistants from one governed corpus, with category taxonomies, feedback loops, and content-lifecycle policies in one place."` These are agent drafts; user owns final wording. |
| B1-S3 | B2 | `article_feedback.plural_label='Article Feedbacks'` - English-uncountable noun. PATCH to `'Article Feedback'` or rename to `feedback_submissions` with plural `'Feedback Submissions'`. Surgical PATCH preferred to avoid rename cascade. | PATCH `/data_objects?id=eq.413` with `plural_label='Article Feedback'`. |
| B1-S4 | B6 | Five intra-KMS `data_object_relationships` edges missing: `knowledge_base_articles -> classified_under -> knowledge_categories` (one_to_many, source); `knowledge_base_articles -> has_revisions -> article_revisions` (one_to_many, source); `knowledge_base_articles -> receives -> article_feedback` (one_to_many, source); `knowledge_base_articles -> appears_in -> knowledge_collections` (many_to_many via membership, source); `knowledge_search_queries -> resolved_by -> knowledge_base_articles` (many_to_many via search results, source). | Load via the cluster-drafts loader; 5 rows with verb + inverse_verb + relationship_type + relationship_kind + is_required + owner_side. |
| B1-S5 | B7 | Missing `users` edges (Rule #10): `knowledge_base_articles -> authored_by -> users`, `knowledge_base_articles -> owned_by -> users` (steward / SME), `article_revisions -> edited_by -> users`, `article_revisions -> approved_by -> users`, `article_feedback -> submitted_by -> users`, `knowledge_collections -> curated_by -> users`. | 6 rows + reciprocal `users -> authors / owns / edits / approves / submits / curates -> *` direction. |

#### MISSING (entity gaps) - moved to Bucket 3 (Phase 0 pending)

Every entity-shaped MISSING from the market audit (knowledge_owners, knowledge_subscriptions, article_verification_cycles, knowledge_taxonomies, search_synonyms, external_knowledge_sources) routes to Bucket 3 because each depends on Bucket 2 item 1's routing decision: on the "derived layer" route they don't belong on KMS at all (they belong on the per-domain knowledge modules or on ENTERPRISE-SEARCH). The vendor-research vetting also needs to confirm whether `article_verification_cycles` is a real reusable entity or a single-vendor (Guru) feature.

#### WRONG-OWNERSHIP - one candidate, routes to Bucket 2

`knowledge_articles` (id 51, mastered by `ITSM-KNOWLEDGE`) vs `knowledge_base_articles` (id 410, mastered by KMS) is the single most consequential WRONG-OWNERSHIP question on the KMS surface. Routes to Bucket 2 item 1 because the user owns the architectural decision.

#### SCOPE-CREEP - one candidate, routes to Bucket 3

`knowledge_search_queries` (id 414) potentially belongs on an ENTERPRISE-SEARCH domain rather than KMS. Routes to Bucket 3 because it depends on the ENTERPRISE-SEARCH candidate triage (queued in `_missing-domains.md` during this audit).

#### BOUNDARY band failures (in-scope on KMS)

| ID | Finding | Fix |
|---|---|---|
| B1-S4-cont. | B8 outbound cross-domain relationships missing on KMS side: `knowledge_base_articles -> resolves -> hr_cases` (KMS->HRSD); `knowledge_base_articles -> resolves -> customer_cases` (KMS->CSM); `knowledge_base_articles -> trains -> conversation_flows` (KMS->CONV-AI); `knowledge_search_queries -> reveals_gap_in -> conversation_flows` (KMS->CONV-AI); `knowledge_base_articles -> assists -> contact_center_agents` (KMS->CCAAS, speculative pending CCAAS master enumeration). | 5 rows; load as Phase B cross-domain edges per the B8 outbound rule. |

(B1-S4 covers both intra-KMS and outbound cross-domain edges in one ticket; consolidated for the loader pass.)

#### APQC TAGGING - new `agent_curated` rows proposed (volume target 6-10, drafted 11)

##### Existing tags (not regenerated)

| handoff_id | source -> target | trigger_event | payload | existing tag | source | status |
|---|---|---|---|---|---|---|
| 630 | ITSM -> KMS | `knowledge_article.published` | `knowledge_articles` | "Maintain service support knowledge repository" (PCF 20898) | agent_curated | new |
| 826 | ECM -> KMS | `document.version_published` | `document_versions` | "Document trade" (PCF 14095) | discovery_substring | new |

The PCF 14095 ("Document trade") tag on handoff 826 reads like a discovery-substring false positive (the "trade" is unrelated to inter-domain trading); a more accurate tag would be PCF 21679 ("Deliver approved content") or 21683 ("Control delivered content"). Surfaced in Bucket 2 item 5 for user review of whether to override.

##### Proposed new `agent_curated` tags

| # | handoff_id | source -> target | trigger_event | payload | proposed PCF process | PCF id | confidence |
|---|---|---|---|---|---|---|---|
| 1 | 720 | KMS -> CSM | `knowledge_base_article.published` | `knowledge_base_articles` | Maintain service support knowledge repository | 20898 | high |
| 2 | 721 | KMS -> HRSD | `knowledge_base_article.published` | `knowledge_base_articles` | Maintain service support knowledge repository | 20898 | high |
| 3 | 722 | KMS -> CCAAS | `knowledge_base_article.updated` | `knowledge_base_articles` | Deliver approved content | 21679 | high |
| 4 | 723 | KMS -> CONV-AI | `knowledge_base_article.published` | `knowledge_base_articles` | Deliver approved content | 21679 | medium |
| 5 | 724 | KMS -> CONV-AI | `knowledge_search_query.no_result` | `knowledge_search_queries` | Harvest knowledge | 20083 | medium |
| 6 | 1120 | HRSD -> KMS | `hr_case.resolved` | `hr_cases` | Harvest knowledge | 20083 | high |
| 7 | 334 | LEGAL-PRACT-MGMT -> KMS | `legal_matter.closed` | `legal_matters` | Harvest knowledge | 20083 | high |
| 8 | 745 | CONV-AI -> KMS | `conversation_flow.fallback_triggered` | `conversation_flows` | Harvest knowledge | 20083 | medium |
| 9 | 818 | WEB-CONTOPS -> KMS | `content_lifecycle.review_due` | `content_lifecycle_plans` | Control delivered content | 21683 | medium |
| 10 | 819 | WEB-CONTOPS -> KMS | `content_inventory.refreshed` | `web_content_inventory_records` | Manage content infrastructure | 21663 | medium |
| 11 | 447 | HRSD -> KMS | `case_category.updated` | `case_categories` | Define content taxonomies | 21658 | medium |

All 11 ship as `proposal_source='agent_curated'`, `record_status='new'` per Rule #1. Approval is the user's call.

##### Deferred-to-Discover-Pass-3 (none)

Every cross-domain handoff has at least one plausible PCF candidate above the medium-confidence floor; no deferrals needed this pass.

### Bucket 2 - Surface-for-user (judgment calls)

1. **Canonical knowledge-article ownership: KMS vs ITSM-KNOWLEDGE vs both.** The catalog today has `data_objects.id=410 knowledge_base_articles` (KMS-mastered) AND `data_objects.id=51 knowledge_articles` (ITSM-KNOWLEDGE-mastered, also contributed by CSM-KNOWLEDGE, consumed by HRSD-KNOWLEDGE). Two cross-domain `data_object_relationships` rows (`publishes_to` / `sources`) paper over the duplication. Three plausible resolutions:
   - **(a) KMS canonical.** Keep id 410 as the single canonical `knowledge_articles` master under KMS. DELETE the `master` row on id 51 in ITSM-KNOWLEDGE; demote ITSM-KNOWLEDGE / HRSD-KNOWLEDGE / CSM-KNOWLEDGE to `consumer` (or `embedded_master` for standalone-deploy) on id 410. Migrate or merge id 51 -> id 410 (rename, then point existing handoffs and relationships at the merged id). Rename id 410's `data_object_name` from `knowledge_base_articles` to `knowledge_articles` to match the dominant vocabulary. This makes KMS the substrate; the three `*-KNOWLEDGE` modules become specialized consumer surfaces.
   - **(b) Per-domain canonical (current de-facto shape).** Keep id 51 mastered by ITSM-KNOWLEDGE; demote KMS to a derived-analytics layer that does not master articles itself. DELETE the `master` row on id 410 in `domain_data_objects`; KMS keeps mastering `article_feedback`, `knowledge_search_queries`, `knowledge_collections` (the analytics + cross-corpus layer) but consumes `knowledge_articles` from the per-domain `*-KNOWLEDGE` modules. KMS modules might be `KMS-FEEDBACK`, `KMS-SEARCH-ANALYTICS`, `KMS-COLLECTIONS`. Drops `knowledge_base_articles` and `knowledge_categories` and `article_revisions` from KMS's master set entirely.
   - **(c) Hybrid / two-tier.** KMS masters an "enterprise knowledge corpus" entity (under a renamed scope - e.g. `enterprise_knowledge_articles`) and the per-domain `*-KNOWLEDGE` modules continue to master their domain-specific cases (`itsm_knowledge_articles`, `hrsd_knowledge_articles` - real rename of id 51). The two layers have an explicit `promoted_from` relationship.

   **Gate**: this decision drives Bucket 1 B1-S1's module shape and gates every Bucket 3 entity. Without it, M1 cannot land coherently. Recommended default: option (a) on the basis that the flagship vendor pattern (ServiceNow, Glean, Confluence, Notion) treats the knowledge corpus as a single substrate that service-management modules embed - but the catalog has been built the other way and the migration cost of (a) is non-trivial. Option (b) is the cheapest reconciliation. Option (c) is the most architecturally pure but slowest to land.

2. **Catalog UX text approval (Bucket 1 B1-S2).** Approve, edit, or reject the proposed `catalog_tagline` and `catalog_description` drafts in B1-S2. Rule #20 forbids the agent from writing without explicit per-row approval. If Bucket 2 item 1 routes to option (b) "derived analytics layer", the buyer voice should pivot from "system of record" to "knowledge analytics on top of your existing wikis".

3. **Capabilities expansion (A2 fail).** Only `KNOWLEDGE-MGMT` is linked today. Decide which of the following capability codes to add (each maps to a flagship-vendor surface area):
   - `KM-AUTHORING` (article creation, templates, AI-drafting; Notion / Confluence / Document360).
   - `KM-TAXONOMY` (categories, tagging, taxonomies; ServiceNow KB schema, Bloomfire).
   - `KM-PUBLICATION-WORKFLOW` (draft -> review -> approve -> publish gates; ServiceNow KM, Document360).
   - `KM-VERIFICATION-CYCLES` (mandatory cadence-based accuracy review; Guru, Bloomfire).
   - `KM-FEEDBACK-LOOP` (article rating, SME re-route; ServiceNow KM, ZenDesk Help Center).
   - `KM-ANALYTICS` (search-gap analysis, deflection rates, article performance; Glean, Coveo, ServiceNow KB Analytics).
   - `KM-GOVERNANCE` (ownership, retention, compliance review; Box Governance, Document360 Governance).
   - `KM-AI-ASSIST` (RAG-style answer generation, AI search; Glean, Coveo, Aisera, Espressive). Independent of Bucket 2 item 1 routing but the right subset depends on the route. Recommend approving 5-8 of these.

4. **Regulations scope.** `domain_regulations` has 1 row (ISO/IEC 27001). Decide whether to attach:
   - ISO 30401 Knowledge Management Systems (recommended - the named-after-the-market regulation; voluntary management-system standard).
   - GDPR (KB articles can carry personal-data examples; search queries log PII).
   - HIPAA (KB on clinical workflows; PHI in articles).
   - SEC 17a-4 (regulated knowledge corpora in financial services).
   - FERPA (educational-institution KMs).
   Independent of Bucket 2 item 1.

5. **APQC tag override on handoff 826.** The existing `discovery_substring` tag on handoff 826 (ECM `document.version_published` -> KMS) points at PCF 14095 ("Document trade"). This is almost certainly a false positive of the substring matcher (the "Trade" in "Document Trade" refers to trade documents, not the verb). The proposed override is PCF 21679 ("Deliver approved content") or PCF 21683 ("Control delivered content"). Decide whether to override (load an `agent_curated` row for the new candidate and let the user retire the substring one) or to leave both (the user reviewer can approve the better candidate at review time).

6. **Pattern flags on `knowledge_search_queries`.** Decide whether `knowledge_search_queries.has_personal_content=true` should flip. Search query strings can carry PII directly typed by the user (e.g., "how do I update Jane Doe's home address in Workday"). Flagship vendors treat this as personal data subject to retention controls. The user owns the call.

7. **Lifecycle states on `article_revisions`, `knowledge_collections`, `knowledge_categories`, `knowledge_search_queries`.** Of the 4 masters without states today, two (`article_revisions`, `knowledge_collections`) plausibly have a workflow; two (`knowledge_categories`, `knowledge_search_queries`) are arguably config-shaped. Proposed:
   - `article_revisions`: `draft` (initial) -> `in_review` -> `approved` (requires_permission, verb `approve_revision`) -> `published` -> `superseded` (terminal).
   - `knowledge_collections`: `draft` (initial) -> `published` -> `archived` (terminal).
   - `knowledge_categories`: config-shaped, no states (the Rule #12 exemption applies; per Rule #15 the exemption cannot be auto-annotated in `notes`, surfacing here for user record).
   - `knowledge_search_queries`: config-shaped event-stream entity (every search is an immutable record), no states.
   Approve, edit, or reject per master.

### Bucket 3 - Phase 0 pending (speculative)

The 4 candidates below need vendor-research vetting before loading. Each is keyed against Bucket 2 item 1 - on option (b) "derived layer" route, several drop entirely; on option (a) "KMS canonical" route, all four are likely candidates.

| # | Candidate | Proposed module / scope | Vendor evidence basis | Recommended verification |
|---|---|---|---|---|
| B3-1 | `knowledge_owners` (per-article steward / SME assignment) | KMS-AUTHORING or KMS-GOVERNANCE | Universal (ServiceNow KM, Document360, Bloomfire, Guru, Notion all model "page owner" / "SME"). Drives Verification Cycles and Feedback escalation. | Pull `/owners` (Document360 API) and `/article_owners` (ServiceNow KMF table). Confirm common attributes (user, escalation_role, sla). |
| B3-2 | `knowledge_subscriptions` (per-user follows on articles / categories) | KMS-DELIVERY | Universal across modern wikis (Notion, Confluence, Guru). | Vendor doc walk; confirm whether KMS owns this or whether it lives in an INTRANET / NOTIFICATION layer. |
| B3-3 | `article_verification_cycles` (mandatory cadence-based accuracy review) | KMS-GOVERNANCE | Specialist (Guru "Trust Score" / Verifications, Document360 Review Reminders, Bloomfire Verifications). Borderline single-vendor pattern; verify universality before loading. | Confirm in >=3 vendors. Check ServiceNow KB has an analogous concept. |
| B3-4 | `search_synonyms` / `search_dictionaries` (controlled vocabulary on the search layer) | Belongs on ENTERPRISE-SEARCH (queued in `_missing-domains.md`) rather than KMS, on the modern enterprise-search architecture. If ENTERPRISE-SEARCH gets promoted, this set moves there. If KMS absorbs enterprise search itself, lives here. | Depends on the ENTERPRISE-SEARCH triage outcome. |

### Cross-bucket dependencies

- **Bucket 2 item 1 gates Bucket 1 B1-S1 module shape entirely.** Without the routing decision, the M1 fix cannot be authored coherently.
- **Bucket 2 item 1 also gates the loaded subset of Bucket 2 item 3 capabilities** (option (a) likely loads 7-8 capabilities including AI-ASSIST; option (b) loads only the analytics-and-collections subset).
- **Bucket 3 B3-4 depends on the ENTERPRISE-SEARCH candidate triage** in `_missing-domains.md` (mention_count=1 after this audit). If promoted, search-synonyms and search-dictionaries move to ENTERPRISE-SEARCH; if not, they stay candidate-on-KMS.
- **Bucket 3 B3-1 through B3-3 are conditional on Bucket 2 item 1 picking option (a) or (c)** - on option (b), KMS does not master articles so these entities don't belong on KMS.
- **Bucket 2 item 5 (APQC override on h-826) is independent** of every other Bucket 2 item; it can be settled in isolation.
- **Bucket 1 B1-S2 (catalog UX text) depends on Bucket 2 item 1's routing** (buyer voice changes between "system of record" and "analytics layer").
- **The 11 APQC TAGGING rows in Bucket 1 are independent of Bucket 2 item 1.** The tagging is on the handoff layer, not the master ownership layer.

### Per-bucket prompts

- **After Bucket 1:** "Approve the 5 STRUCTURAL fixes (B1-S1 module shape is gated by Bucket 2 item 1, but the other four - catalog UX, label fix, intra-KMS relationships, users edges - are independent and ready to load). Approve or edit the 11 proposed APQC `agent_curated` tags for handoffs 720-724, 1120, 334, 745, 818, 819, 447."
- **After Bucket 2:** "Pick one for item 1: (a) KMS canonical (most aligned with flagship vendor architecture; highest migration cost), (b) per-domain canonical (cheapest reconciliation; KMS retreats to derived layer), or (c) hybrid two-tier (most pure; longest). Then answer items 2-7: catalog UX wording (depends on item 1), capability expansion (which of 8 codes to add), regulation set, APQC override on h-826, search-query personal-content flag, lifecycle-state decisions per master."
- **After Bucket 3:** "If you chose option (a) or (c) on Bucket 2 item 1, pick the verification route: vetted Phase 0 vendor research subagent now, OR eyeball-mode (you call out which B3-1 through B3-4 candidates ring true and they become Bucket 1 items in the follow-up audit). Also decide on the ENTERPRISE-SEARCH and AGENT-ASSIST candidate triage in `_missing-domains.md`."

### Report-only follow-ups (owed by other domains)

- **HRSD B10b**: handoffs 1120, 447 have `target_domain_module_id=NULL` on KMS side (resolves with M1). Source side (`source_domain_module_id`) is already populated (HRSD-CASE-MGMT id 75).
- **ITSM B10b**: handoff 630 has `target_domain_module_id=NULL` on KMS side (resolves with M1).
- **CONV-AI B10b**: handoff 745 has both sides NULL. CONV-AI's audit owes its `source_domain_module_id` fix; KMS owns its target side via M1.
- **WEB-CONTOPS B10b**: handoffs 818, 819 NULL both sides. WEB-CONTOPS B10b owes the source side.
- **ECM B10b**: handoff 826 NULL both sides. ECM B10b owes the source side.
- **CSM B9 follow-up**: KMS publishes `knowledge_base_article.published` to CSM (h-720); CSM has no reciprocal `customer_case.resolved` -> KMS handoff for knowledge harvest. CSM's next b1 audit should consider authoring it.
- **CSM B10b**: handoff 720 has both module FKs NULL on its CSM (target) side; CSM's audit owes the target side fix.
- **CCAAS B10b**: handoff 722 has both module FKs NULL on its CCAAS (target) side; CCAAS's audit owes the target side fix.
- **CONV-AI B10b**: handoffs 723, 724 have both module FKs NULL on CONV-AI (target) side.
- **WEB-CONTOPS B10b**: handoffs 818, 819 target_domain_module_id NULL (KMS-side, KMS owns).
- **B8 inbound mirrors owed by partner B8 audits**: HRSD's `case_categories -> drives -> knowledge_base_articles` and ECM's `document_versions -> mirrors_to -> knowledge_base_articles` exist; the symmetric outbound side `knowledge_base_articles -> sources -> hr_case` etc. is owned by partner domains' B8 outbound pass when KMS becomes their consumer/contributor.

### Candidate domains queued during this audit

Routed to `audits/_missing-domains.md` via `scripts/analytics/append_missing_domain.ts`:

| Candidate code | Action | New mention_count |
|---|---|---|
| ENTERPRISE-SEARCH | New entry (Glean, Coveo, Algolia, Elastic Enterprise Search, Sinequa, Lucidworks Fusion, GoSearch, AlphaSense) | 1 |
| AGENT-ASSIST | New entry (Cresta, ASAPP, Forethought, Espressive, Aisera, ServiceNow Now Assist, Salesforce Einstein Service Replies) | 1 |

The ENTERPRISE-SEARCH candidate is the most consequential for KMS - if promoted, `knowledge_search_queries` and `search_synonyms` plausibly move there, and KMS's vendor surface (currently weighted at ServiceNow KM + Notion + Coda) gains a Glean / Coveo flank that the catalog is missing today. The AGENT-ASSIST candidate is a clear cross-domain market (CSM + CCAAS + HRSD + ITSM all have agent-assist needs, none host the entity canonically).
