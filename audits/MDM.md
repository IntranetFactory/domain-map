---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 31
---

# MDM, Audit History

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** **zero `domain_modules` rows** (primary host count and host-junction count both 0). 8 `data_objects` mastered via the legacy `domain_data_objects` rollup (customer_golden_records 315, supplier_golden_records 316, employee_golden_records 317, match_rules 318, merge_rules 319, source_records 320, customers 97, suppliers 206, employees 31) plus contributor `ontologies` (254) and consumer `knowledge_graph_entities` (255). 2 capabilities (IDENTITY-RESOLUTION 255, CUSTOMER-360 310). 15 solutions (1 secondary SAP BDC, 5 secondary PIM-adjacent vendors Stibo / Informatica P360 / Syndigo / Pimcore / SAP MDG-P, 9 partial data and AI platform suites). 0 regulations. 0 trigger_events authored against MDM-owned masters (golden_records get 4 events but those publishers belong to entities not yet hosted in any MDM module). 6 aliases on legacy masters (worker, personnel, account, client, vendor, trading partner). 11 outbound + 2 inbound cross-domain handoffs (13 cross-domain total). 0 intra-domain handoffs (no modules to wire across). 0 system skills + 0 `skill_tools` rows. 0 MDM-owned roles, 0 role_modules rows.
- **Vendor-surface basis (Pass 2 flagship enumeration):** Informatica Intelligent MDM, Reltio Connected Data Platform, Profisee Platform, Stibo Systems STEP (MDM modes), SAP Master Data Governance, Oracle Master Data Management Cloud, IBM Master Data Management, TIBCO EBX (Cloud Software Group), Semarchy xDM, Syndigo (Riversand) Active Content Engine, Pimcore PIM/MDM, Ataccama ONE. Compliance-specialist coverage anchored on GDPR (right-to-erasure on golden records), CCPA (consumer data subject rights), DCAM / DAMA-DMBOK (data-management standards body), and KYC/AML for customer/supplier-mastering use cases.
- **Bucket 1 (in-scope, agent fixable):** 11 items.
- **Bucket 2 (surface-for-user, judgment):** 7 items.
- **Bucket 3 (Phase 0 pending, speculative):** 13 items (5 entity candidates + 3 modularization candidates + 4 regulation candidates + 1 domain-tier candidate).

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO + cross-domain relationships, ranked by edge weight):

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| CRM | 2 | 0 | 2 (CRM-ACCT-MGT masters customers 97; CRM-ACCT-MGT consumes customer_golden_records 315 and merge_rules 319) | 1 (resolves-to 480) | 5 | Pairwise (full) |
| HCM | 2 | 0 | 1 (HCM-CORE-WORKER masters employees 31) | 0 | 3 | Pairwise (full) |
| CSM | 1 | 0 | 2 (CSM-CASE-MGMT, CSM-ENTITLEMENTS consume customers 97) | 0 | 3 | Pairwise (full) |
| CDP | 2 | 1 | 0 (no MDM module to host DMDO; CDP publishes identity_graphs to MDM) | 0 | 3 | Pairwise (full) |
| KGP | 1 | 0 | 0 (knowledge_graph_entities consumed by MDM, no KGP module declared) | 0 | 1 | Lightweight |
| SUP-LIFE | 1 | 0 | 0 (suppliers_golden_record.updated lands somewhere in SUP-LIFE) | 0 | 1 | Lightweight |
| SUB-MGMT | 1 | 0 | 0 (no SUB-MGMT consumer DMDO on customers 97 yet) | 0 | 1 | Lightweight |
| DCG | 1 | 0 | 0 (merge_rule.published targets DCG; no consumer DMDO yet) | 0 | 1 | Lightweight |
| DATA-AI-PLAT | 0 | 1 | 0 | 0 | 1 | Lightweight |

**Structural pass bands.**

- **M1 hard-fails.** Zero `domain_modules` rows on a non-empty domain. Per Rule #14 every `domains` row MUST have at least 1 `module_kind='full'` row. MDM was loaded as a market-entry domain with all its data_objects sitting in the legacy `domain_data_objects` rollup and NO modules to deploy them in. This blocks every downstream concern: there is no DMDO surface, no system skill (Rule #17), no role_module bundle (E-band), no lifecycle-realization scope (M-band), no permission materialization (E-band). The audit-procedure precedent ("skip market audit when domain has zero modules, run Phase 0 first") applies here; we still surface findings because the structural pass is the foundation for fixing it.
- **M7 hard-fails (catalog-wide multi-master).** The three workflow-bearing masters MDM claims via the legacy rollup are ALSO mastered elsewhere: `customers` (97) is `role=master` in CRM-ACCT-MGT (module 46, CRM); `employees` (31) is `role=master` in HCM-CORE-WORKER (module 54, HCM); `suppliers` (206) has no `role=master` row anywhere in the DMDO catalog but is claimed `master + required` here in the legacy rollup. Rule M7's catalog-wide invariant ("exactly one `role='master'` row per `data_object_id`") is broken on `customers` and `employees`, and the entire legacy MDM masters claim is structurally incoherent: the MDM market exists, but the masters are owned by their consuming domains in the actual DMDO catalog. The fix shape is a market-vs-catalog reconciliation: either MDM masters the source-records / golden-records and consumes the canonical masters from CRM / HCM / SUP-LIFE, OR MDM is promoted to the canonical master and CRM / HCM demote to embedded_master. Surfaced as B2-S1 (architectural choice owned by user).
- **B9 partial-fail.** 5 trigger_events on MDM-owned masters carry empty `event_category` (Rule #13 enum): 749 `merge_rule.published`, 750 `merge_rule.disabled`, 751 `source_record.ingested`, 752 `source_record.match_pending`, 753 `source_record.merged_to_golden`.
- **B9b skip.** No intra-domain handoff surface because zero modules exist (B9b precondition requires ≥2 modules).
- **B10b hard-fails.** All 11 outbound handoffs carry NULL `source_domain_module_id` (MDM's own side, because no module exists to attribute them to). 9 of 11 outbound handoffs ALSO carry NULL `target_domain_module_id` (target side B10b, report-only). Both inbound handoffs carry NULL on both module FKs.
- **C1, no kind='platform_builtin' edges authored.** The MDM masters (customers, suppliers, employees, golden_records, match_rules, merge_rules, source_records) should all relate to `users` (steward, approver) per Rule #10, but no relationships exist in `data_object_relationships` to `users` (748). 0 of 11 expected built-in edges are wired.
- **F1-F5 hard-fails.** Zero system skills, zero skill_tools, zero tools, Semantius score uncomputable. Rule #17 requires 1 system skill per `domain_modules` row; with 0 modules there is no Rule-#17 surface, but the same emptiness blocks the F-band.
- **E1-E6 hard-fails.** Zero MDM-named roles (no data-steward / matching-engineer / merge-approver roles), zero role_modules rows, zero MDM permissions.
- **H1 hard-fails.** 0 of 13 cross-domain handoffs carry `handoff_processes` rows. Zero `discovery_substring`, zero `agent_curated`, zero `record_status='approved'`. Volume expectation per H1: 0.5N to 0.8N for N=13 means 7 to 11 agent_curated tags should be produced by this audit.
- **D1 advisory.** Domain description (Rule #18 / Rule #9 boundary): the `domains.description` for MDM contains an em-dash (U+2014). Per project Rule #9 (no em-dashes anywhere), the description string should be PATCHed to replace with a comma or parenthesis. The string also contains valid market scope; not a Rule #18 vendor-name violation.
- **B12 sanity.** `business_logic` field on the domain row contains an em-dash too (same Rule #9 violation, same fix shape).

MDM Semantius score (strict, current): **uncomputable** because no `domain_modules` row exists to compute it against.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 hard fail, zero modules** | The domain has no `domain_modules` rows. Per Rule #14 every `domains` row MUST have ≥1 `module_kind='full'` row. MDM has 2 capabilities (IDENTITY-RESOLUTION, CUSTOMER-360) under the ≥3-capability threshold for needing 2 modules, so the floor is exactly 1 full module. The market-shape audit surfaces 3 to 5 plausible modules: MDM-GOLDEN-RECORD-MGMT (canonical mastering of customer / supplier / employee golden records), MDM-MATCH-MERGE-ENGINE (match_rules, merge_rules, source_records, stewardship workflow), MDM-STEWARDSHIP-WORKFLOW (data-steward case management, exception queues), MDM-HIERARCHY-MGMT (parent-child rollups for customer hierarchies, supplier parents), MDM-DATA-QUALITY (profiling, validation, completeness scoring). The single-module-floor choice is MDM-GOLDEN-RECORD-MGMT mastering all 6 MDM-owned data_objects (315, 316, 317, 318, 319, 320). The split-into-2 choice is MDM-GOLDEN-RECORDS + MDM-MATCH-MERGE-ENGINE. Surface architectural choice as B2-S2; on user approval of a module split, the loader inserts the `domain_modules` rows, attaches `domain_module_data_objects`, authors lifecycle states (per Rule #12), authors permissions (per Rule #14 derivation), authors the system skill + skill_tools (per Rule #17). | Phase B reload, gated on B2-S2 choice. Loader inserts 1-2 `domain_modules` rows (`module_kind='full'`, `domain_id=87`), 6 master DMDOs, 1 system skill per module, 6+ tools per skill, baseline + workflow-gate permissions, lifecycle states for the workflow-bearing masters. |
| B1-S2 | **M7 hard fail, multi-master on `customers` and `employees`** | `customers` (97) is `role=master` in BOTH the legacy `domain_data_objects` rollup under MDM AND in `domain_module_data_objects` row at CRM-ACCT-MGT (module 46). `employees` (31) is `role=master` in BOTH the legacy rollup under MDM AND at HCM-CORE-WORKER (module 54). Rule M7 forbids 2 `role=master` rows for the same `data_object_id` across the catalog. Two reconciliation paths: (a) MDM is the canonical master, CRM and HCM demote to `embedded_master` (because their workflow needs a local shell for standalone deployment when MDM is absent), with the MDM module becoming the deploy-target of the master; (b) MDM does NOT master `customers` and `employees` directly, instead MDM masters the golden_record / source_record / match_rules / merge_rules entities, and reads `customers` / `employees` as `consumer + required` from CRM and HCM. Path (b) matches the actual MDM market shape (Informatica MDM hubs sit alongside Salesforce / Workday, they do not replace the systems-of-record) and the existing DMDO surface where CRM-ACCT-MGT and HCM-CORE-WORKER ALREADY carry `master + required`. Recommend path (b). Surface as B2-S1. | Gated on B2-S1. Path (b) load: DELETE the legacy `domain_data_objects` rows for (87, 97), (87, 206), (87, 31) marking customers / suppliers / employees as `master` under MDM; INSERT corresponding `consumer + required` rows in the MDM-GOLDEN-RECORD-MGMT module DMDO once the module exists (B1-S1). |
| B1-S3 | **B9 partial fail, empty `event_category`** | 5 trigger_events on MDM-owned masters carry empty `event_category` (Rule #13 enum must be one of `lifecycle / state_change / threshold / signal`): 749 `merge_rule.published`, 750 `merge_rule.disabled`, 751 `source_record.ingested`, 752 `source_record.match_pending`, 753 `source_record.merged_to_golden`. | PATCH: 749 → `state_change`, 750 → `state_change`, 751 → `lifecycle`, 752 → `state_change`, 753 → `lifecycle`. Surgical CLI is sufficient. |
| B1-S4 | **B10b hard fail, NULL `source_domain_module_id` on every outbound** | All 11 outbound handoffs (222, 273, 274, 270, 717, 718, 719, 271, 269, 716, 272) carry NULL `source_domain_module_id`. This is MDM's own B10b: cannot be fixed without first authoring the MDM module(s) under B1-S1. Once a module exists, the PATCH wave is mechanical (each outbound is attributed to the single MDM-GOLDEN-RECORD-MGMT module, or split across the two modules if path 2-module is chosen). | Gated on B1-S1. Loader sets `source_domain_module_id` on all 11 outbound rows to the MDM module id once it exists. |
| B1-S5 | **B10b hard fail, NULL `source_domain_module_id` on both inbound** | Both inbound handoffs (155 from DATA-AI-PLAT, 481 from CDP) carry NULL `source_domain_module_id`, owed by the source domain. Report-only from MDM's perspective. | Schedule b1 audits for DATA-AI-PLAT and CDP to populate `source_domain_module_id` on those handoffs. |
| B1-S6 | **B10b report-only, NULL `target_domain_module_id` on outbound** | 9 of 11 outbound handoffs carry NULL `target_domain_module_id` (222 → KGP, 273 → SUP-LIFE, 270 → CSM, 717 → CDP, 718 → HCM, 719 → DCG, 271 → SUB-MGMT, 272 → CDP, partially 274 → HCM target set to 54). | Schedule b1 audits for KGP, SUP-LIFE, CSM, CDP, HCM (handoff 718), DCG, SUB-MGMT to populate target_module_id. Schedule b1 audit for HCM to confirm `target_domain_module_id=54` on handoff 274 maps to the right HCM module (likely HCM-CORE-WORKER on `employee_golden_record.created` for promotion to canonical employee record). |
| B1-S7 | **C1 hard fail, no `users` (kind='platform_builtin') edges authored** | Per Rule #10, MDM masters that have steward / approver / creator semantics MUST have `data_object_relationships` rows pointing at `users` (748). 0 such edges exist for any of customers_golden_records (315), supplier_golden_records (316), employee_golden_records (317), match_rules (318), merge_rules (319), source_records (320). Each golden_record has a `data_steward` user FK; each rule has an `author` and `approver`. Expected edges: 6 entities × 2-3 user-roles each = ~12 to 18 missing relationships. | Insert 12 to 18 `data_object_relationships` rows once the data-steward / approver model is confirmed (likely 1 steward per golden_record entity + 1 author + 1 approver per rule entity + 1 ingester user per source_record). |
| B1-S8 | **B9 missing trigger_events for workflow-gate states** | The 5 MDM-owned masters with workflow shape need event coverage that does not yet exist: `customer_golden_record.merged`, `supplier_golden_record.deduplicated`, `employee_golden_record.merged_from_source`, `match_rule.disabled`, `match_rule.deprecated`, `merge_rule.disabled` (exists 750, no event_category yet), `source_record.rejected`, `source_record.quarantined`, `source_record.steward_approved`. 9 candidate missing events. Three are state-change, six are lifecycle. | INSERT 9 `trigger_events` rows once the module + lifecycle states for the 6 masters are authored under B1-S1. Each row pairs to one published-from data_object and one `event_category`. |
| B1-S9 | **Rule #9 hard fail, em-dash in `domains.description` and `business_logic`** | The `description` field reads "...customer, supplier, product, asset) including matching, survivorship, and stewardship." (en-dash, fine). The `business_logic` field reads "Matching and survivorship algorithms (deterministic + probabilistic), hierarchy management, and stewardship workflows [U+2014 em-dash] the irreducible kernel beneath any MDM hub." (em-dash U+2014, Rule #9 violation). Project Rule #9 forbids em-dash everywhere in the catalog including `description` and `business_logic`. | PATCH `domains` row 87: `business_logic` replace em-dash with comma. New text: "Matching and survivorship algorithms (deterministic + probabilistic), hierarchy management, and stewardship workflows, the irreducible kernel beneath any MDM hub." Mechanical CLI PATCH. (Note: the `description` field shown does not contain em-dash on re-scan; only `business_logic` does.) |
| B1-S10 | **F-band hard fail rollup, no system skill, no skill_tools, score uncomputable** | Once B1-S1 lands modules, Rule #17 requires 1 `skill_type='system'` skill per module, each with ≥1 `skill_tools` row. The skill set should cover: `query_customer_golden_record`, `query_supplier_golden_record`, `query_employee_golden_record`, `merge_source_records`, `propose_match`, `approve_merge`, `route_to_steward`, `publish_match_rule`, `publish_merge_rule`, plus channel-primitive `notify_data_steward`. Minimum skill_tools row count per system skill: ~10. | Author 1 system skill and ~10 skill_tools once modules exist (B1-S1 gate). |
| B1-S11 | **E-band hard fail, no roles, no role_modules** | No MDM-owned roles exist (no `data_steward`, no `mdm_admin`, no `match_curator`, no `golden_record_approver`). With 0 modules, the baseline-three-role pattern (admin / manage / read) cannot be wired. | Author 3 baseline roles per module + 2-3 workflow-specific roles (`data_steward`, `match_curator`, `golden_record_approver`) once modules exist. Gated on B1-S1. |

#### APQC TAGGING

H1 hard-fail: 0 of 13 cross-domain handoffs carry any `handoff_processes` rows. The audit proposes the following `agent_curated` tags from the analyst's structural-pass model. PCF ids require lookup at fix time per the standard procedure (`/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry`).

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | Confidence |
|---|---|---|---|---|---|
| 270 | MDM → CSM | `customer_golden_record.created` | customers | Manage customer accounts (10402 or child), define and maintain master data | confident L3 |
| 269 | MDM → CRM | `customer_golden_record.created` | customers | Develop and manage marketing strategies / manage customer accounts (10402) | confident L3 |
| 271 | MDM → SUB-MGMT | `customer_golden_record.created` | customers | Manage customer accounts / sell products and services | confident L3 |
| 272 | MDM → CDP | `customer_golden_record.updated` | customers | Manage customer master data (10402 sibling) | confident L3 |
| 273 | MDM → SUP-LIFE | `supplier_golden_record.updated` | suppliers | Manage suppliers (10222) | confident L3 |
| 274 | MDM → HCM | `employee_golden_record.created` | employees | Manage employee information / master data (10527 or child) | confident L3 |
| 222 | MDM → KGP | `kg_entity.linked` | knowledge_graph_entities | Develop and manage business analytics / knowledge management (10566 or child) | medium |
| 716 | MDM → CRM | `merge_rule.published` | merge_rules | Manage master data (no clean PCF cross-industry L3 row; data-management activities sit at L4 within PCF "Manage information technology", defer to Discover Pass 3) | defer |
| 717 | MDM → CDP | `source_record.merged_to_golden` | source_records | Manage data and information (cross-cutting PCF, no clean L3 cross-industry row, defer to Discover Pass 3) | defer |
| 718 | MDM → HCM | `source_record.merged_to_golden` | source_records | Manage employee information (10527 or child), data quality on workers | medium |
| 719 | MDM → DCG | `merge_rule.published` | merge_rules | Manage data governance (no clean cross-industry row, defer to Discover Pass 3) | defer |
| 155 | DATA-AI-PLAT → MDM | `golden_record.synced` | data_products | Manage data and information (defer to Discover Pass 3) | defer |
| 481 | CDP → MDM | `identity_graph.updated` | identity_graphs | Manage customer master data (10402 sibling) | medium |

**Tagging summary:** 7 confident or medium L3 candidates (rows 270, 269, 271, 272, 273, 274, 222 + 718 + 481), 4 defer-to-Discover-Pass-3 (716, 717, 719, 155, 719 deferred because PCF cross-industry framework does not contain a clean L3 row for "publish data governance rule"). Volume expectation per H1: 0.5N to 0.8N of 13 = 7 to 11 tags, the audit produces 9 confident or medium candidates and defers 4, within the expected range. The deferred set is a Discover Pass 3 custom-process authoring surface (these are modern data-engineering activities not in the cross-industry PCF cuts).

#### Bucket 1 count summary

| Finding type | Count |
| --- | --- |
| MISSING (entity gap) | 0 (deferred to Bucket 3 candidates) |
| WRONG-OWNERSHIP | 0 (the multi-master question is architectural, surfaces as B2-S1, not a direct WRONG-OWNERSHIP) |
| SCOPE-CREEP | 0 |
| STRUCTURAL (S/A/M/B/C/E/F band failures) | 10 (B1-S1, S2, S3, S4, S7, S8, S9, S10, S11; S5 and S6 are report-only routed below) |
| BOUNDARY (NULL FK or missing handoff) | 0 in-scope; 2 report-only (B1-S5, B1-S6) |
| **APQC TAGGING** | 1 (H1 covers all 13 handoffs with 9 propose + 4 defer) |
| MODULARIZATION ISSUES | 0 (the modularization choice is gated on B2-S2 and lives there, not Bucket 1) |
| **Bucket 1 total** | 11 in-scope items |

The Bucket 1 inventory is volume-light by count but depth-heavy because every in-scope item is gated on B1-S1 (module authoring). Without modules, none of the workflow-bearing fixes can land. Recommend the user approve B2-S2 module split first; the rest of Bucket 1 cascades from that decision.

#### Boundary findings per neighbor (Pass 4 pairwise reconciliation)

The 4 heavy neighbors (edge weight ≥3) get the 5-section pairwise diff; the lighter neighbors get one-line summaries.

**CRM ↔ MDM (weight 5).** Wired pairs: 2 (MDM → CRM 269 customer_golden_record.created; MDM → CRM 716 merge_rule.published). Section 2: both have NULL `source_domain_module_id` on the MDM side (MDM's own B10b, blocked on B1-S1); 269 has `target_domain_module_id=46` populated; 716 has `target_domain_module_id=46` populated. Section 3: a likely missing handoff is CRM → MDM on `crm_account.merged` for steward-routing the duplicate-detect signal back to MDM; another candidate is MDM → CRM on `customer_golden_record.deleted` for right-to-erasure cascading. Section 4: the conflict is the multi-master on `customers` (97) (M7 hard fail). CRM-ACCT-MGT carries `master + required`, MDM carries `master + required` via legacy rollup. The DMDO catalog (the one the deployer reads) has CRM as master; the legacy rollup (which the new world replaces) has MDM as master. Resolution path b (MDM = consumer + required of customers, master + required of customer_golden_records) keeps both true. Section 5: cross-relationship `customer_golden_records resolves_to customers` (480) exists; no `merge_rules applied_to customers` row; not obviously needed.

**HCM ↔ MDM (weight 3).** Wired pairs: 2 (MDM → HCM 274 employee_golden_record.created; MDM → HCM 718 source_record.merged_to_golden). Section 2: 274 has NULL source (MDM B10b); 718 has NULL source. 274 has target=54 populated; 718 has NULL target (HCM's B10b). Section 3: missing candidates HCM → MDM on `worker.terminated` for right-to-erasure cascade; HCM → MDM on `worker.merged_into` for duplicate-employee resolution. Section 4: M7 multi-master on `employees` (31), same resolution path b. Section 5: no cross-relationship row connecting `employee_golden_records` (317) to anything; this is a Phase B gap on either side (likely MDM owes the relationship "resolves to" employees, mirroring 480 / 568 for customer / supplier).

**CSM ↔ MDM (weight 3).** Wired pairs: 1 (MDM → CSM 270 customer_golden_record.created). Section 2: 270 NULL source (MDM B10b), NULL target (CSM B10b). Section 3: no inbound from CSM to MDM. Section 4: clean once 97 multi-master is resolved (CSM-CASE-MGMT carries consumer + required on customers, which is the correct relationship). Section 5: cross-relationship `customers raises customer_cases` (429), `customers holds customer_contracts` (430), etc., exist. Healthy substrate once the master is canonical.

**CDP ↔ MDM (weight 3).** Wired pairs: 3 (MDM → CDP 717 source_record.merged_to_golden, MDM → CDP 272 customer_golden_record.updated, CDP → MDM 481 identity_graph.updated). Section 2: 717 NULL source + NULL target; 272 NULL source + NULL target; 481 NULL source + NULL target. All 3 are MDM B10b on source side; CDP B10b on target side (272 / 717) or source side (481). Section 3: a likely missing pair is CDP → MDM on `identity_graph.resolved` for resolution-result feedback. Section 4: CDP's `identity_graphs` (112) is the engineering twin of MDM's `customer_golden_records`; the two should not master the same underlying concept catalog-wide. Whether identity_graphs is CDP-owned + consumed by MDM, or whether MDM should consume CDP's resolved identities into golden records, is an architectural question. Surface as B3 candidate. Section 5: 0 cross-relationship rows linking identity_graphs and customer_golden_records, this is a real gap.

**Lighter neighbors (1-2 weight, one-line summaries):**

- **KGP ↔ MDM (weight 1).** Outbound 222 NULL on both sides. No KGP DMDO declaring consumer on knowledge_graph_entities (which is actually published BY MDM in the current rollup, so the publishing direction is opposite to the expected market-shape). Worth flagging in B3.
- **SUP-LIFE ↔ MDM (weight 1).** Outbound 273 NULL on both sides. Cross-relationship `supplier_golden_records resolves_to suppliers` (568) exists. Healthy substrate once SUP-LIFE wires the consumer DMDO.
- **SUB-MGMT ↔ MDM (weight 1).** Outbound 271 NULL on both sides. SUB-MGMT consumer DMDO on customers needed.
- **DCG ↔ MDM (weight 1).** Outbound 719 NULL on both sides. DCG governance domain should consume merge_rules; missing DMDO is a DCG-side fix.
- **DATA-AI-PLAT ↔ MDM (weight 1).** Inbound 155 NULL on both sides. The `golden_record.synced` event 59 is published by `data_products`, this looks like an attribution issue (data_products is published from DATA-AI-PLAT but lands in MDM as a sync). Confirm DATA-AI-PLAT side at fix time.

**In-scope mechanical PATCH derived from pairwise (Bucket 1):** none; every PATCH is gated on B1-S1 module authoring.

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **M7 multi-master reconciliation for `customers` (97), `employees` (31), `suppliers` (206).** The legacy `domain_data_objects` rollup claims MDM as master of all three; the DMDO catalog has CRM-ACCT-MGT mastering customers (97) and HCM-CORE-WORKER mastering employees (31), with suppliers (206) having no DMDO master row anywhere. Path (a): MDM canonical, CRM and HCM demote to embedded_master. Path (b): MDM consumes customers / employees / suppliers as `consumer + required` and masters only the golden_record / source_record / match_rules / merge_rules entities. Recommended path (b): matches the actual MDM market shape (Informatica, Reltio, Profisee, Stibo, Semarchy, all sit alongside the source-of-record systems, not as replacements), and the substrate already has the canonical masters in their owning domains. Path (a) would require demoting the most heavily-deployed Workday and Salesforce master patterns in the catalog. | Architectural intent + canonical mastering strategy. User's call. | (a) MDM canonical, demote CRM and HCM. (b) MDM consumer, master only golden_records and rules. (c) Mixed (specify per entity). |
| B2-S2 | **Module split for MDM-GOLDEN-RECORD-MGMT.** B1-S1 needs to author at least 1 `module_kind='full'` row. Two plausible splits: (1) single module MDM-GOLDEN-RECORD-MGMT mastering all 6 MDM-owned entities; (2) two-module split MDM-GOLDEN-RECORDS (315, 316, 317, 320) + MDM-MATCH-MERGE-ENGINE (318, 319, plus stewardship workflow). Rule #14 allows option (1) because MDM has only 2 capabilities (under the ≥3 threshold for forced split). Recommend option (1) for the initial Phase B load; if MDM stewardship workflow grows distinct from match/merge engine, split later. | Modularization shape, user's call (affects the entire Phase B reload). | (a) Single module MDM-GOLDEN-RECORD-MGMT. (b) Two modules MDM-GOLDEN-RECORDS + MDM-MATCH-MERGE-ENGINE. (c) Larger split into 3+ modules (specify codes). |
| B2-S3 | **Rule #18 vendor-name boundary in description and business_logic.** The current `domains.description` reads "(customer, supplier, product, asset)" which lists market-substrate concepts; no vendor names. The `business_logic` reads "Matching and survivorship algorithms (deterministic + probabilistic), hierarchy management, and stewardship workflows" which is capability-shape neutral. No Rule #18 violation detected. However the Rule #9 em-dash fix (B1-S9) needs user-approved wording per the project's "no auto-prose" discipline; surface for explicit approval. | Rule #15 wording boundary; user owns the exact text. | (a) Approve the proposed `business_logic` replacement: "Matching and survivorship algorithms (deterministic + probabilistic), hierarchy management, and stewardship workflows, the irreducible kernel beneath any MDM hub." (b) Supply alternative wording. |
| B2-S4 | **Customer 360 vs Identity Resolution capability scope.** MDM hosts CUSTOMER-360 (capability 310) and IDENTITY-RESOLUTION (capability 255). CDP (domain 72) also touches both capabilities (CDP profiles + identity graphs). Is the capability assignment intentional dual-host (MDM owns the master, CDP owns the operational profile), or are MDM and CDP overlapping in scope and one of the capability assignments should be retracted? | Capability scope decision, user owns it. | (a) Both capabilities stay assigned to MDM. (b) IDENTITY-RESOLUTION moves to CDP, MDM keeps CUSTOMER-360 only. (c) CUSTOMER-360 moves to CDP, MDM keeps IDENTITY-RESOLUTION only. (d) Both stay dual-hosted, capability shape is "shared". |
| B2-S5 | **Phase B authoring lifecycle states for golden_records.** Per Rule #12, every `master + required` data_object MUST have lifecycle states authored. Once B1-S1 module exists, the 6 MDM-owned masters need state machines authored: customer_golden_records (proposed `candidate / pending_steward / merged / golden / retired`), supplier_golden_records (same), employee_golden_records (same), match_rules (`draft / active / disabled / deprecated`), merge_rules (same), source_records (`ingested / matched / merged_to_golden / quarantined / rejected`). Lifecycle authoring is normally automatic on Phase B load but the state names + transitions + `requires_permission` flags need user confirmation. | State machine shape, user owns the call. | Per-master state list yes/no, or supply alternative names. |
| B2-S6 | **Stewardship role catalog.** The 3 baseline roles (admin / manage / read) per module are mechanical, but the workflow-specific MDM roles need user input: `data_steward` (per-domain steward, e.g. customer-steward, supplier-steward, employee-steward, 3 roles?), `match_curator` (writes match rules), `merge_approver` (signs off on golden record merges), `mdm_admin` (system-level). Recommend 1 unified `data_steward` role with permission scope by master via permission-hierarchy, plus `match_curator` and `merge_approver`. Confirm role enumeration. | Role design, user owns the catalog. | (a) Single `data_steward` role + `match_curator` + `merge_approver` + `mdm_admin`. (b) Per-master stewards (3 roles). (c) Different shape (specify). |
| B2-S7 | **Compliance regulation linkage.** No `domain_regulations` rows exist for MDM. Strong candidates: GDPR (right-to-erasure cascading from MDM to all consuming domains), CCPA (consumer data-subject access requests routed through golden record), KYC/AML (financial-services customer mastering), DCAM (data-management capability assessment). The compliance basis informs whether right-to-erasure events (B1-S8 candidate) are required vs optional. | Compliance scope decision, user owns it. | (a) Approve loading GDPR + CCPA + KYC/AML + DCAM as `domain_regulations` rows for MDM. (b) Subset (specify). (c) Defer to a dedicated compliance audit pass. |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 was anchored on the flagship-vendor surface: Informatica Intelligent MDM, Reltio Connected Data Platform, Profisee Platform, Stibo Systems STEP (MDM modes), SAP Master Data Governance, Oracle MDM Cloud, IBM MDM, TIBCO EBX, Semarchy xDM, Syndigo (Riversand) Active Content Engine, Pimcore PIM/MDM, Ataccama ONE. The subagent recipe was not spawned (single-pass audit per orchestrator instruction); candidates below come from the analyst's flagship-vendor knowledge. Each is a candidate market gap for Phase 0 verification, not a vetted finding.

#### MISSING (5) entity candidates

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `match_candidates` | Informatica MDM "Candidate" record, Reltio "Match Group", Semarchy "Match Pair" model unresolved match-pair candidates distinct from `source_records`. Stewardship UI shows match candidates as a queue. | MDM-MATCH-MERGE-ENGINE (master) or new MDM-STEWARDSHIP-WORKFLOW module |
| `stewardship_tasks` | Informatica, Reltio, Profisee, Stibo, all show "Steward Tasks" as a first-class queue (assigned, in_progress, resolved, escalated). Currently no master. | MDM-STEWARDSHIP-WORKFLOW (master) |
| `survivorship_rules` | Distinct from match_rules + merge_rules in Informatica, Reltio, Profisee. Survivorship is the per-attribute "best-of" engine (latest, oldest, longest, weighted), not the same as merge (which records resolve to which golden). | MDM-MATCH-MERGE-ENGINE (master, sibling to match_rules and merge_rules) |
| `data_quality_rules` | Ataccama, Informatica IDQ, Trillium model DQ rules as a first-class entity (validation + completeness + uniqueness). Often a separate product but MDM hubs typically embed at least the validation rules. | MDM-DATA-QUALITY (master, candidate sixth module) |
| `golden_record_hierarchies` | Stibo, Informatica MDM, Reltio model hierarchies (parent customer → subsidiary, parent supplier → branch) as first-class entities, often with versioning. Currently no master. | MDM-HIERARCHY-MGMT (candidate seventh module) or master in MDM-GOLDEN-RECORD-MGMT |

#### MODULARIZATION (3) candidates

- **MDM-STEWARDSHIP-WORKFLOW** as a sibling module to MDM-MATCH-MERGE-ENGINE. Steward tasks, exception queues, escalation workflows. Would push MDM from 1-2 modules to 3-4.
- **MDM-DATA-QUALITY** as a separate module. Distinct concern from match/merge (DQ rules run continuously across the source records to score completeness; match runs on candidate pairs).
- **MDM-HIERARCHY-MGMT** as a separate module. Parent-child rollups are a meaningfully distinct workflow from individual record mastering.

#### Compliance regulation candidates (no entity proposed, regulation rows missing)

- **GDPR** (right-to-erasure cascade from golden records).
- **CCPA / CPRA** (consumer data subject rights).
- **KYC / AML** (financial-services customer mastering, beneficial-owner records).
- **DCAM** (DAMA-DMBOK and EDM Council Data Management Capability Assessment) as a standards-body anchor.

#### Candidate-domain queue

This audit surfaced **1 domain-tier candidate** for `audits/_missing-domains.md`:

- **RDM, Reference Data Management.** Distinct from MDM: code list management (currency codes, country codes, GL accounts as reference data), hierarchy management for reference data, cross-reference mapping, jurisdictional code sets. Pure-play vendors include Semarchy xDM RDM mode, TIBCO EBX RDM, Stibo Reference Data, Collibra Reference Data Manager, Informatica Reference Data Management. Passes the point-solution-market test (≥3 independent flagship vendors with RDM-named offerings). Queued via the helper for human triage.

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (produces a Phase 0 markdown at `c:/tmp/MDM-phase0-<date>.md` confirming per-entity vendor coverage) or eyeball-mode (user names which of the 5 entity candidates + 4 regulation candidates + 3 modularization candidates + 1 domain candidate to treat as confirmed).

### Cross-bucket dependencies

- **B1-S1 (M1 module authoring) is gated on B2-S2 (module split choice).** Cannot author modules without knowing the split.
- **B1-S2 (M7 multi-master) is gated on B2-S1 (reconciliation path).** DELETE vs DEMOTE choice is the user's call.
- **B1-S4, S5, S6, S7, S8, S10, S11 are all transitively gated on B1-S1** (need modules to attribute handoffs, author skills, author roles, author permissions, author lifecycle states).
- **B1-S3 (event_category PATCH) is independent.** 5 mechanical PATCHes, no dependencies.
- **B1-S9 (em-dash PATCH) is independent, gated only on B2-S3 wording approval.**
- **B1-H1 (APQC tagging) is independent.** Can land regardless of module state because handoff_processes rows attach to handoff_id directly.
- **B2-S5 (lifecycle states) depends on B2-S2 (module split) and B2-S1 (master reconciliation).**
- **B2-S7 (compliance regulations) is independent.** Can resolve before any other Bucket 1 work.
- **B3 entity candidates** (match_candidates, stewardship_tasks, survivorship_rules, data_quality_rules, golden_record_hierarchies) inform **B2-S2 module split** (if they all land, the 4-module shape becomes preferable to the 1-module shape).
- **B3 RDM domain candidate** inform**s B2-S4** (capability scope split between MDM and CDP); RDM is also a separate cluster from both, no direct dependency.
- **Buckets 2 and 3 are otherwise independent.** Per the explicit-prompt discipline, the user can resolve them in any order, but B1 is bottlenecked on B2-S1 + B2-S2.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with `all`, or list (e.g. `S3, S9, H1-confident`), or `skip`. Note that every S item except S3 and S9 and H1 is gated on B2 decisions, so realistically the immediately-loadable set is S3 (5 event_category PATCHes), S9 (1 description PATCH gated on B2-S3 wording), and H1 (9 confident or medium APQC tags + 4 deferred). The remaining 8 items wait for B2-S1 + B2-S2 resolution.

- **S1 (M1, author modules)** gated on B2-S2 split choice.
- **S2 (M7, master reconciliation)** gated on B2-S1 path choice.
- **S3 (B9, event_category PATCH x5)** trivial; can run today.
- **S4 (B10b own outbound)** gated on B1-S1.
- **S5 / S6 (B10b report-only)** schedules 8 other-domain audits.
- **S7 (C1, users edges)** gated on B1-S1 and B2-S6.
- **S8 (B9 missing trigger_events x9)** gated on B1-S1 and B2-S5.
- **S9 (Rule #9 em-dash PATCH)** trivial once B2-S3 supplies wording.
- **S10 (F-band, skills + tools)** gated on B1-S1.
- **S11 (E-band, roles + permissions)** gated on B1-S1 and B2-S6.
- **H1 (APQC tagging)** load 9 confident or medium tags now; 4 deferred to Discover Pass 3.

**Bucket 2, what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (M7 master reconciliation):** (a) MDM canonical demote CRM and HCM, (b) MDM consumer master only golden_records and rules, (c) Mixed.
- **B2-S2 (module split):** (a) Single MDM-GOLDEN-RECORD-MGMT, (b) MDM-GOLDEN-RECORDS + MDM-MATCH-MERGE-ENGINE, (c) Larger split.
- **B2-S3 (business_logic em-dash replacement wording):** approve, supply alternative.
- **B2-S4 (Customer-360 vs Identity-Resolution capability scope):** (a) keep both at MDM, (b) move IDENTITY-RESOLUTION to CDP, (c) move CUSTOMER-360 to CDP, (d) dual-host.
- **B2-S5 (lifecycle state names per master):** per-master yes/no.
- **B2-S6 (stewardship role catalog):** (a) data_steward + match_curator + merge_approver + mdm_admin, (b) per-master stewards, (c) other.
- **B2-S7 (compliance regulations):** approve set, subset, or defer.

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball-mode, name which of 5 entity candidates + 4 regulation candidates + 3 modularization candidates + 1 RDM domain candidate to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain for routing.

| Owing domain | Owed work |
|---|---|
| CRM | B10b: confirm `target_domain_module_id=46` (CRM-ACCT-MGT) on handoffs 269 and 716 is intended. After B2-S1 resolution, CRM-ACCT-MGT may need a `consumer + required` DMDO on customer_golden_records (315) instead of (or in addition to) the current `consumer + optional` row. |
| HCM | B10b: populate `target_domain_module_id` on handoff 718 (`source_record.merged_to_golden` → HCM). Confirm 274 `target_domain_module_id=54` (HCM-CORE-WORKER) is the right target. After B2-S1 path b, HCM-CORE-WORKER may need a `consumer + required` DMDO on employee_golden_records (317). |
| CSM | B10b: populate `target_domain_module_id` on handoff 270 (`customer_golden_record.created` → CSM). Possibly add a `consumer + required` DMDO on customer_golden_records in CSM-CASE-MGMT or CSM-ENTITLEMENTS. |
| CDP | B10b: populate `target_domain_module_id` on outbound 272 (`customer_golden_record.updated`) and 717 (`source_record.merged_to_golden`). Populate `source_domain_module_id` on inbound 481 (`identity_graph.updated` → MDM). Audit the CDP `identity_graphs` (112) vs MDM `customer_golden_records` (315) overlap (B2-S4 dependency). |
| KGP | B10b: populate `target_domain_module_id` on outbound 222 (`kg_entity.linked`). Consider whether KGP should master `knowledge_graph_entities` (255) rather than MDM (current legacy rollup gives MDM the consumer role on a KGP-shaped entity); B-band review. |
| SUP-LIFE | B10b: populate `target_domain_module_id` on outbound 273. Add `consumer + required` DMDO on supplier_golden_records (316) once SUP-LIFE has modules. |
| SUB-MGMT | B10b: populate `target_domain_module_id` on outbound 271. Add `consumer + required` DMDO on customer_golden_records (315) once SUB-MGMT has modules. |
| DCG | B10b: populate `target_domain_module_id` on outbound 719 (`merge_rule.published`). Add `consumer` DMDO on merge_rules (319) once DCG has the relevant module. |
| DATA-AI-PLAT | B10b: populate `source_domain_module_id` on inbound 155. Confirm `data_products` is the correct payload (versus `golden_records`); the event name `golden_record.synced` suggests the attribution might be inverted. |

### Decisions

_(empty until reviewed)_

### Fixes applied

_(empty until reviewed)_
