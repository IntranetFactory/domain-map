# MDM audit history

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

## 2026-05-31, Continuation: B1 technical fixes (residual)

### Scope

Residual-pass focused on truly-technical B1 items only. The Fixes-applied table on the original audit run was empty (`_(empty until reviewed)_`), so every Bucket 1 item is residual by definition. Classification below per the orchestrator's TECHNICAL vs DEFER matrix.

### Live-state verification before fixes

- `trigger_events` 749 / 750 / 751 / 752 / 753: confirmed `event_category=''` on all five (Rule #13 enum gap).
- `domains` row 87 `business_logic`: confirmed em-dash (U+2014) still present.
- `domains` row 87 `description`: confirmed em-dash NOT present (audit's re-scan note holds).

### Fixes applied (technical)

| Audit ID | Action | Rows touched | Mechanism |
|---|---|---|---|
| B1-S3 | PATCH `trigger_events.event_category` per audit-pre-specified mapping (749 / 750 → `state_change`; 751 → `lifecycle`; 752 → `state_change`; 753 → `lifecycle`). | 5 | Loader `c:/dev/domain-map/.tmp_deploy/fix_mdm_b1_technical_2026_05_31.ts`. Post-flight verified all 5 rows now carry the expected category. |

Loader behavior: idempotent (skips already-populated rows), fails loudly on id-vs-name mismatch or unexpected pre-existing value, runs from project-root cwd per Rule #6.

### Deferred (per orchestrator residual-pass rules)

| Audit ID | Reason for deferral |
|---|---|
| B1-S1 | New `domain_modules` rows; explicitly gated on B2-S2 user split choice ("user picks"). DEFER per orchestrator "new entities/DMDOs/modules" + "gated on B2-X". |
| B1-S2 | M7 multi-master reconciliation; explicitly gated on B2-S1 architectural path choice (a/b/c). DEFER per "user picks" + "decide". |
| B1-S4 | B10b own outbound `source_domain_module_id` PATCH; transitively gated on B1-S1 (no MDM module exists to attribute the 11 outbound handoffs to). Not derivable from existing modules. DEFER per "gated on B2-X" via B1-S1 → B2-S2. |
| B1-S5 | B10b report-only inbound, owed by DATA-AI-PLAT and CDP audits. Out-of-scope (other domain). |
| B1-S6 | B10b report-only outbound target_module, owed by KGP / SUP-LIFE / CSM / CDP / HCM / DCG / SUB-MGMT audits. Out-of-scope (other domain). |
| B1-S7 | `data_object_relationships` user-edges (Rule #10). Audit estimates "~12 to 18 missing relationships" but does NOT pre-specify exact (data_object_id, related_id, relationship_type) tuples; the steward/approver/author role model is gated on B2-S6. DEFER per orchestrator "Rule #10 audit pre-specifies" criterion (not met) + B2-S6 gating. |
| B1-S8 | INSERT 9 new `trigger_events` for missing workflow-gate states; gated on B1-S1 (modules) and B2-S5 (lifecycle state names). DEFER per "new entities" + "gated on B2-X". |
| B1-S9 | PATCH `domains.business_logic` em-dash. Audit's wording proposal is explicitly gated on B2-S3 user approval ("Rule #15 wording boundary; user owns the exact text"). DEFER per "user picks" / "surface to user". (Note: catalog_tagline / description column writes are also Rule #20 deferred per orchestrator.) |
| B1-S10 | F-band system skill + skill_tools; gated on B1-S1. DEFER. |
| B1-S11 | E-band roles + role_modules + permissions; gated on B1-S1 and B2-S6. DEFER. |
| B1-H1 | `handoff_processes` APQC tagging. Per orchestrator: "INSERT `handoff_processes` ONLY when audit pre-specifies `handoff_id` + resolvable PCF (verify before insert)." The audit explicitly states "PCF ids require lookup at fix time per the standard procedure" and gives only candidate PCF names with confidence labels, not resolved PCF row ids. Of 13 candidates, 9 are confident/medium but unresolved, 4 are explicitly "defer to Discover Pass 3". DEFER all 13 per orchestrator criterion (resolvable PCF row ids not pre-specified). |

Deferred count: **11 of 11 residual B1 items**. Only B1-S3 was both technical and self-contained.

### Other categories per orchestrator checklist (none applied)

- **DELETE stale rows:** none. Audit does not name row IDs flagged for deletion (the legacy `domain_data_objects` deletes under B1-S2 are gated on B2-S1).
- **PATCH naming renames:** none specified in audit.
- **PATCH `permission_verb_override`:** none specified.
- **PATCH `notes=''` reverts:** none specified (audit-history scan surfaced no `notes`-pollution row IDs to revert).
- **INSERT `domain_regulations`:** B2-S7 surfaces GDPR / CCPA / KYC-AML / DCAM as candidates but gates on user approval ("approve set, subset, or defer"). DEFER per "user picks".

### JWT errors

None encountered.

### Loader

`c:/dev/domain-map/.tmp_deploy/fix_mdm_b1_technical_2026_05_31.ts`

## 2026-05-31, Audit

### Summary

- **Current footprint (live):** Domain row 87 (`MDM`, `Master Data Management`). **Still zero `domain_modules` rows** (primary host count and host-junction count both 0). 11 `data_objects` declared via legacy `domain_data_objects` rollup: 6 MDM-owned masters (customer_golden_records 315, supplier_golden_records 316, employee_golden_records 317, match_rules 318, merge_rules 319, source_records 320) plus 3 cross-domain masters claimed under MDM (customers 97, suppliers 206, employees 31), 1 contributor (ontologies 254) and 1 consumer (knowledge_graph_entities 255). 2 capabilities (IDENTITY-RESOLUTION 255, CUSTOMER-360 310). 15 solutions (1 secondary SAP BDC, 5 secondary PIM-adjacent vendors, 9 partial data and AI platform suites). 0 regulations. 10 `trigger_events` on MDM-owned masters (247, 248, 249, 250, 251, 749, 750, 751, 752, 753), all now carry populated `event_category` (B1-S3 from prior audit landed). 2 cross-domain `data_object_relationships` (315 → 97, 316 → 206). 6 aliases on legacy masters (worker, personnel, account, client, vendor, trading partner). 11 outbound + 2 inbound cross-domain handoffs (13 cross-domain total, IDs 155, 222, 269, 270, 271, 272, 273, 274, 481, 716, 717, 718, 719). 0 intra-domain handoffs (no modules to wire across). 1 legacy `skills` row (12 `mdm-system`, `domain_id=87`, `domain_module_id=NULL` — F1 hard-fail). 12 `skill_tools` rows attached to that legacy skill. 0 MDM-owned roles, 0 role_modules rows, 0 MDM-prefixed permissions. 1 `data_object_relationships` row 31 → 748 (`employees is_linked_to users`); 0 such edges on customer/supplier/employee golden_records or rules/source_records.
- **Vendor-surface basis:** carried forward from 2026-05-30 (Informatica Intelligent MDM, Reltio Connected Data Platform, Profisee Platform, Stibo Systems STEP, SAP Master Data Governance, Oracle Master Data Management Cloud, IBM Master Data Management, TIBCO EBX, Semarchy xDM, Syndigo Active Content Engine, Pimcore PIM/MDM, Ataccama ONE). No fresh subagent pass run this audit (single-pass Validate b1 per orchestrator instruction).
- **Bucket 1 (in-scope, agent fixable):** 11 items (all carried over; B1-S3 resolved by prior continuation, dropped; **2 of 13 APQC tags now landed** for handoffs 273 and 719 reducing H1 surface).
- **Bucket 2 (surface-for-user, judgment):** 7 items (all carried over, none resolved).
- **Bucket 3 (Phase 0 pending, speculative):** 13 items (5 entity candidates + 3 modularization candidates + 4 regulation candidates + 1 domain-tier candidate). Unchanged.

**Delta versus 2026-05-30:**

- B1-S3 (5 `trigger_events.event_category` PATCHes) resolved by the 2026-05-31 continuation loader, confirmed live: events 749/750/752 = `state_change`, 751/753 = `lifecycle`. Drops from `state.yaml`.
- H1 APQC TAGGING shifted from 0/13 tagged to 2/13: handoff 273 (MDM → SUP-LIFE `supplier_golden_record.updated`) tagged to PCF process 815 (`Monitor/Manage supplier information`, external_id 10299, hierarchy_level 4), `agent_curated` / `new`. Handoff 719 (MDM → DCG `merge_rule.published`) tagged to PCF process 115 (`Manage product and service master data`, external_id 11740, hierarchy_level 3), `agent_curated` / `new`. Both are `record_status='new'`, awaiting reviewer sign-off for catalog-quality (approved) lift.
- All other Bucket 1 items still gated on B2-S1 + B2-S2.
- One opportunistic `data_object_relationships` row found: 31 → 748 (`employees is_linked_to users`). This partially covers B1-S7 for the `employees` master (1 of an expected ~12 to 18 edges across the 6 MDM-owned + 3 cross-domain masters); still hard-fail rollup.

### Structural pass bands (re-verified live)

- **M1 hard-fails** (still). Zero `domain_modules` for `domain_id=87`. Blocks downstream concerns. Re-run query: `/domain_modules?domain_id=eq.87` returns `[]`. `/domain_module_host_domains?domain_id=eq.87` returns `[]`.
- **M2 vacuous pass.** 2 capabilities < 3 threshold.
- **M4, M5, M6 vacuous** (no modules to evaluate). Capabilities IDENTITY-RESOLUTION (255) and CUSTOMER-360 (310) carry no realizing module on the MDM side — converts to a Phase-A gap that will surface once B1-S1 lands.
- **M7 catalog-wide multi-master hard-fail** (still). Customers (97) `role=master` in CRM-ACCT-MGT (module 46) AND in MDM legacy rollup. Employees (31) `role=master` in HCM-CORE-WORKER (module 54) AND in MDM legacy rollup. Suppliers (206) `role=master` in MDM legacy rollup only (no DMDO master row anywhere). Resolution path b recommended (carried as B2-S1).
- **M8 vacuous** (no `domain_modules` rows to check). Will surface as soon as B1-S1 lands.
- **A1 pass.** Domains.id=87 has all 7 metadata fields populated (`crud_percentage=45`, `min_org_size='30 m <2500'`, `cost_band='$$$$'`, `usa_market_size_usd_m=3500`, `market_size_source_year=2025`, `business_logic` non-empty, `certification_required=false`).
- **A2 pass.** 2 capabilities linked. Below the >=3 typical floor but acceptable for an MDM-shaped domain.
- **A3 pass.** 15 solutions linked with `coverage_level` set on every row.
- **A4 hard-fail.** `domains.catalog_tagline=''` and `catalog_description=''`. Rule #20 backfill candidate, gated on user-approved buyer-voice wording.
- **B-band positive-existence checks (B1, B2, B3, B4, B5).** B1 passes (6 MDM-owned masters). B2 passes (singular_label + plural_label populated on all 6). B3 needs review: every master uses prefixed snake_case (`customer_golden_records`, `supplier_golden_records`, `employee_golden_records`, `match_rules`, `merge_rules`, `source_records`); `match_rules` and `merge_rules` and `source_records` are bare-words (no domain prefix). Cross-check: are any of these in collision with other domains? `match_rules` and `merge_rules` are MDM-bespoke; `source_records` is generic enough that a cross-domain collision is plausible. **B3 audit: surface to user as B2-S8 (new) to confirm naming choice.** B4 passes formally (all flags default false). B5 vacuous (no embedded_master rows). B6 partial: intra-master edges weak (only 2 rows: 315 → 97, 316 → 206; missing 317 → 31, missing rules/source_records edges); routes to fix once modules land.
- **B7 hard-fails (still).** Only 1 of expected ~12 to 18 `users` relationship edges loaded (31 → 748). The 6 MDM-owned masters carry 0 edges to `users`. Per Rule #10 every master with a steward/approver/author semantics MUST have a `data_object_relationships` row pointing at `users` (748). Gated on B1-S1 + B2-S6 role catalog.
- **B9 partial-pass** (now). Previously empty `event_category` on 5 events is now populated post-2026-05-31 continuation. Event coverage is still thin (10 trigger_events on 4 of 6 MDM masters; nothing on `customer_golden_record.deleted` for erasure cascade, nothing on `match_rule.deprecated`, nothing on `source_record.rejected/quarantined/steward_approved` — see B1-S8 carry-over).
- **B9b skip.** No intra-domain handoff surface (no modules).
- **B10b hard-fails (still).** All 11 outbound handoffs carry NULL `source_domain_module_id`; 9 of 11 outbound carry NULL `target_domain_module_id`. Both inbound (155 from DATA-AI-PLAT, 481 from CDP) NULL on both sides. Exception: 269 and 716 have `target_domain_module_id=46` (CRM-ACCT-MGT) populated; 274 has `target_domain_module_id=54` (HCM-CORE-WORKER) populated. 718 NULL target despite HCM-CORE-WORKER existing (could be patched once B1-S1 lands and we attribute MDM side).
- **B11 mixed.** Customers 97, suppliers 206, employees 31 all have aliases (2 each, expected). MDM-owned masters (315, 316, 317, 318, 319, 320) carry 0 aliases. Not all are non-obvious (customer_golden_record is descriptive) but vendor-specific labels would help (Informatica "Best Record", Reltio "Golden Record" canonical, Stibo "Master Object"). Surface as a low-priority gap; user discretion.
- **B12 hard-fails.** 0 `data_object_lifecycle_states` rows on any of the 6 MDM-owned masters. Per Rule #12 the workflow-bearing masters (5 of the 6, source_records / match_rules / merge_rules / customer_golden_records / supplier_golden_records / employee_golden_records, all have observable state transitions) MUST have lifecycle states authored. Gated on B1-S1 + B2-S5.
- **C1 pass.** 5 `business_function_domains` rows (1 owner Data Engineering, 1 contributor IT Operations, 3 consumers Sales/Marketing/Finance). C2 acceptable (no diverging-capability override needed).
- **D1 advisory.** Em-dash still present in `domains.business_logic` (U+2014). Description is em-dash free on re-scan. Gated on B2-S3 wording approval.
- **E1, E2, E3, E4, E5, E6 hard-fails.** No MDM-owned roles, no role_modules, no MDM-prefixed permissions. Vacuously gated on B1-S1.
- **F1 hard-fails.** Legacy domain-level system skill row id 12 (`mdm-system`, `domain_id=87`, `domain_module_id=NULL`) still exists. Per F1 this is acceptable transitional state only while no module-level system skill exists; once B1-S1 lands MDM modules and module-level system skills are authored (B1-S10), this row must be RETIRED. Track as B1-S12 (new line item, was previously implicit under B1-S10).
- **F2, F3, F4 hard-fails** (still). No `domain_modules` to validate against. F3 partially seeded (the legacy `skill_id=12` has 12 `skill_tools` rows; those will need re-pointing or rebuilding when the module-level skill replaces it).
- **F5 uncomputable** (still).
- **F7 not-applicable** (no `skill_tools` rows on a non-existent module-level system skill).
- **H1 partial.** 2 of 13 cross-domain handoffs now carry `handoff_processes` rows (handoff 273 → process 815, handoff 719 → process 115; both `agent_curated`/`new`). 11 of 13 still untagged. `record_status='approved'` count: 0 (catalog quality measure). Volume expectation per H1: 0.5N to 0.8N of 13 = 7 to 11 tags. Audit produces 0 new tags this pass (2 already tagged carry over from prior, no new authoring) because Rule #20-style "PCF row IDs not pre-resolved at fix time" deferral and Rule #15-style "user picks the tag" gating apply: the prior audit pre-specified candidates but the PCF row IDs require live `/processes` lookup at fix time per the orchestrator residual-pass rules. Surface remaining 11 as B1-H1 (continuing).

MDM Semantius score (strict, current): **uncomputable** (still). No `domain_modules` row exists to compute against.

### Bucket 1, In-scope confirmed gaps (carried + delta)

| ID | Band | Finding (post-2026-05-31 audit) | Fix |
|---|---|---|---|
| B1-S1 | M1 hard-fail | Domain has no `domain_modules`. Gated on B2-S2. | Phase B reload once B2-S2 lands. |
| B1-S2 | M7 hard-fail | `customers` (97) and `employees` (31) multi-master; `suppliers` (206) sole-master claim in MDM legacy rollup. Gated on B2-S1. | Path-b load: DELETE legacy rollup masters; INSERT `consumer + required` rows on MDM module(s). |
| B1-S4 | B10b own outbound NULL `source_domain_module_id` | All 11 outbound. Gated on B1-S1. | PATCH on all 11 once MDM module exists. |
| B1-S5 | B10b report-only | Inbound 155 (DATA-AI-PLAT) + 481 (CDP) NULL source. | Schedule DATA-AI-PLAT and CDP b1 audits. |
| B1-S6 | B10b report-only target_module on outbound | 9 of 11 outbound NULL on target (`target_domain_module_id` set for 269 + 716 → CRM-ACCT-MGT, 274 → HCM-CORE-WORKER). | Schedule b1 audits for KGP / SUP-LIFE / CSM / CDP / HCM (718) / DCG / SUB-MGMT / CDP (272 + 717). |
| B1-S7 | C1/Rule #10 | 1 of expected ~12 to 18 `users` edges present (31 → 748). 11 to 17 missing. Gated on B1-S1 + B2-S6. | INSERT relationships once steward/approver/author model lands. |
| B1-S8 | B9 missing trigger_events | 9 candidate workflow-gate events still missing. Gated on B1-S1 + B2-S5. | INSERT 9 trigger_events post-lifecycle authoring. |
| B1-S9 | Rule #9 em-dash | `business_logic` em-dash unchanged. Gated on B2-S3 wording. | PATCH on user approval. |
| B1-S10 | F-band skills + tools | Legacy `mdm-system` skill at domain-level only; no module-level system skill. Gated on B1-S1. | Author module-level skill(s) + skill_tools once modules land. |
| B1-S11 | E-band roles + permissions | No MDM-owned roles / role_modules / permissions. Gated on B1-S1 + B2-S6. | Author per role catalog. |
| B1-S12 (new) | F1 legacy skill retirement | Legacy `skills.id=12` (`mdm-system`, `domain_id=87`, `domain_module_id=NULL`) must be retired once the module-level system skill exists (B1-S10). Currently transitional-acceptable per F1 because no module-level skill exists. | DELETE row 12 once B1-S10 lands the module-level replacement; re-point or rebuild the 12 attached `skill_tools` rows. Gated on B1-S1 + B1-S10. |
| B1-A4 (new) | A4 catalog UX | `domains.catalog_tagline=''` and `domains.catalog_description=''` per Rule #20. Buyer-voice backfill candidate. Surface for user review before write. | Draft buyer-voice tagline + 1 to 3 paragraph description, surface for review, PATCH after user approves wording. |
| B1-H1 | H1 APQC | 11 of 13 cross-domain handoffs untagged after this audit. 2 landed (273 → 815, 719 → 115). 7 confident or medium candidates from prior audit unresolved (269, 270, 271, 272, 274, 481, 718) + 4 defer-to-Discover (155, 716, 717, the 4th was 719 now resolved). | Per orchestrator residual rules: resolvable PCF row IDs must be pre-specified or live-lookup. Re-attempt with explicit `/processes` lookup per candidate in next pass; surface defer set to Discover Pass 3. |
| B1-B6 (new) | B6 weak intra-master edges | Only 2 cross-domain `resolves_to` edges (315→97, 316→206) and 1 user edge (31→748). Missing 317→31, missing 318/319/320 internal edges + steward/approver edges. Gated on B1-S1. | Phase B intra-domain relationship draft + load once modules land. |

#### Bucket 1 count summary

| Finding type | Count |
| --- | --- |
| MISSING (entity gap) | 0 (deferred to Bucket 3) |
| WRONG-OWNERSHIP | 0 (the multi-master question stays as B2-S1) |
| SCOPE-CREEP | 0 |
| STRUCTURAL (S/A/M/B/C/E/F band failures) | 10 (S1, S2, S4, S7, S8, S9, S10, S11, S12, B6, A4) |
| BOUNDARY (NULL FK or missing handoff) | 2 report-only (S5, S6) |
| APQC TAGGING | 1 (H1 partial, 11 untagged remaining) |
| MODULARIZATION ISSUES | 0 (gated on B2-S2) |
| Bucket 1 total | 13 in-scope items (S5 + S6 are report-only follow-ups, not blockers for MDM green status) |

### Bucket 2, Surface-for-user (judgment calls) — carried + delta

| ID | Question | Notes |
|---|---|---|
| B2-S1 | M7 multi-master reconciliation. Carried. Path-b recommended. | Unchanged. |
| B2-S2 | Module split: 1-module vs 2-module vs >2. Carried. Single MDM-GOLDEN-RECORD-MGMT recommended. | Unchanged. |
| B2-S3 | Em-dash replacement wording for `business_logic`. Carried. | Unchanged. |
| B2-S4 | Customer-360 vs Identity-Resolution capability scope split with CDP. Carried. | Unchanged. |
| B2-S5 | Lifecycle state names per master. Carried. | Unchanged. |
| B2-S6 | Stewardship role catalog shape. Carried. | Unchanged. |
| B2-S7 | Compliance regulation linkage (GDPR / CCPA / KYC-AML / DCAM). Carried. | Unchanged. |
| B2-S8 (new) | B3 bare-word naming arbitration. `match_rules` / `merge_rules` / `source_records` are bare-words. Should MDM claim canonical bare-word authority (set `is_canonical_bare_word=true` with `naming_authority_rationale`) or rename to `mdm_match_rules` / `mdm_merge_rules` / `mdm_source_records`? Per Rule #9 the cleaner default is to prefix, but MDM is the natural canonical authority for match / merge / survivorship terminology. | Options: (a) Claim canonical authority on all three with rationale. (b) Rename all three with `mdm_` prefix. (c) Mixed (e.g., keep `match_rules` and `merge_rules` canonical; rename `source_records` to `mdm_source_records` due to higher collision risk with system-of-record terminology in other domains). |
| B2-A4 (new) | Rule #20 buyer-voice copy for `domains.catalog_tagline` and `catalog_description`. Agent to draft, user to approve before write. | Surface drafts in next pass. |
| B2-B11 (new) | Vendor-specific aliases on MDM-owned masters (`customer_golden_records` etc.). Stibo "Master Object", Informatica "Best Record", Reltio "Golden Record". Worth loading? Or skip as self-explanatory? | Options: (a) Load 1 to 2 vendor aliases per master. (b) Skip as self-explanatory. |

### Bucket 3, Phase 0 pending (speculative) — carried

Unchanged from 2026-05-30. 5 entity candidates (match_candidates, stewardship_tasks, survivorship_rules, data_quality_rules, golden_record_hierarchies), 3 modularization candidates (MDM-STEWARDSHIP-WORKFLOW, MDM-DATA-QUALITY, MDM-HIERARCHY-MGMT), 4 regulation candidates (GDPR, CCPA, KYC-AML, DCAM), 1 domain-tier candidate (RDM). Vendor-surface basis: Informatica / Reltio / Profisee / Stibo / Semarchy / Ataccama. No formal Phase 0 vendor research run; eyeball or vetted route awaits user direction.

### Cross-bucket dependencies (unchanged)

- B1-S1 gated on B2-S2.
- B1-S2 gated on B2-S1.
- B1-S4 / S7 / S8 / S10 / S11 / S12 / B6 transitively gated on B1-S1.
- B1-S9 / A4 gated on user-approved wording (B2-S3 / B2-A4).
- B1-H1 independent (handoff_processes attach by handoff_id), but requires per-handoff PCF lookup.
- B3 entity candidates inform B2-S2 (would shift toward larger module split if all land).
- B3 RDM domain candidate informs B2-S4 (capability scope).
- B2-S8 independent (naming arbitration).
- B2-B11 independent (alias load).

### Report-only follow-ups (owed by other domains)

| Owing domain | Owed work |
|---|---|
| CRM | B10b: confirm `target_domain_module_id=46` on 269 and 716. Possible `consumer + required` DMDO on customer_golden_records (315) post-B2-S1 path-b. |
| HCM | B10b: populate target on 718. Confirm 274 target=54. Possible `consumer + required` on employee_golden_records (317). |
| CSM | B10b: populate target on 270. Possible `consumer + required` on customer_golden_records (315). |
| CDP | B10b: populate target on 272 + 717; populate source on 481. Architectural overlap on identity_graphs (112) vs customer_golden_records (315) is B2-S4 dependency. |
| KGP | B10b: populate target on 222. Reconsider whether KGP should master `knowledge_graph_entities` (255) rather than MDM consuming. |
| SUP-LIFE | B10b: populate target on 273. Possible `consumer + required` on supplier_golden_records (316) once SUP-LIFE has modules. |
| SUB-MGMT | B10b: populate target on 271. Possible `consumer + required` on customer_golden_records (315) once SUB-MGMT has modules. |
| DCG | B10b: populate target on 719. Possible `consumer` on merge_rules (319) once DCG has the relevant module. |
| DATA-AI-PLAT | B10b: populate source on 155. Confirm payload (`data_products` vs `golden_records`) attribution; event name `golden_record.synced` suggests inversion. |

### Decisions

_(empty until reviewed)_

### Fixes applied

_(empty until reviewed)_

### JWT errors

None encountered this pass.

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

---

## 2026-06-06 - Audit (state-driven execute, bulk batch)

### Summary

State-driven Validate pass against MDM's open state.yaml items (no fresh from-scratch
audit). Live re-verification confirmed domain_id=87 is still an UNBUILT domain (0
domain_modules, 2 capabilities), so per the unbuilt-domain discipline the build itself was
NOT scaffolded; it stays a user decision (B2-S2 module split + B2-S1 master path). The
state snapshot (last_audit 2026-05-31) was stale on two items: 5 additional APQC handoff
tags had landed since (H1 was at 7/13 live, not 2/13), and all 6 masters were still
`entity_type='unclassified'`. Every genuinely-unblocked, agent-doable item was executed;
everything else is blocked on B1B-S1 (module authoring) or a user decision. next_action_by
flips to **user** (the domain cannot advance without the B2-S1 + B2-S2 decisions).

### Executed (record_status='new', idempotent, verify-live-then-write)

| Fix | Type | Rows |
|---|---|---|
| entity_type classification (Rule #12) | PATCH `data_objects` | 6: golden_records 315/316/317 + source_records 320 -> `operational_workflow`; match_rules 318 + merge_rules 319 -> `catalog` |
| APQC handoff tags (H1) | INSERT `handoff_processes` (proposal_source='agent_curated', role='implements') | 5: 269->719 + 270->719 (Manage customer master data, L4); 716->771 (Maintain master data, L4); 274->243 + 718->243 (Manage and maintain employee data, L3) |
| Catalog UX backfill (Rule #20) | PATCH `domains` (empty-guarded) | 2 fields on domain 87: `catalog_tagline` + `catalog_description` (buyer-voice, no vendor names, no em-dash) |

H1 result: cross-domain handoff_processes coverage now **12 of 13** (only 222 MDM->KGP
`kg_entity.linked` remains untagged, correctly deferred to Discover: no clean cross-industry
PCF master-data row for knowledge-graph entity linking). Above the 7-11 floor.

Loader: `c:/dev/domain-map/.tmp_deploy/fix_mdm_state_driven_2026_06_06.ts`. Idempotent
(reads live before every write, skips already-classified/already-tagged/non-empty), runs
from project-root cwd. Post-flight verified: all touched rows carry `record_status='new'`;
no row stamped approved.

UI links:
- https://tests.semantius.app/domain_map/data_objects?id=in.(315,316,317,318,319,320)
- https://tests.semantius.app/domain_map/handoff_processes?handoff_id=in.(269,270,274,716,718)
- https://tests.semantius.app/domain_map/domains?id=eq.87

### Surfaced (no write: user decision or destructive)

- **B2-S1** master reconciliation path (a-mdm-canonical / b-mdm-consumer [recommended] / c-mixed). Realizing it is a DESTRUCTIVE DELETE/demote of the legacy rollup master rows on customers/employees/suppliers.
- **B2-S2** module split, the unbuilt-domain build (a-single MDM-GOLDEN-RECORD-MGMT [recommended] / b-two-modules / c-larger). Gates the entire B1B-S1 cascade.
- **B2-S3** business_logic em-dash replacement wording (DESTRUCTIVE overwrite of a non-empty value; Rule #15 user-owns-wording). Proposed comma replacement carried.
- **B2-S4** CUSTOMER-360 vs IDENTITY-RESOLUTION capability scope between MDM and CDP.
- **B2-S5** lifecycle state names per operational_workflow master (315/316/317/320).
- **B2-S6** stewardship persona catalog shape (unified data_steward + match_curator + merge_approver + mdm_admin [recommended] / per-master / other).
- **B2-S7** compliance regulation linkage (GDPR / CCPA / KYC-AML / DCAM; load all / subset / defer).
- **B2-S8** bare-word naming arbitration for match_rules / merge_rules / source_records (claim canonical / rename mdm_* [DESTRUCTIVE restructure] / mixed).
- **B2-B11** vendor/generic aliases on MDM-owned masters (editorial: load small synonym set vs skip self-explanatory).
- **Personas/RACI (B1B-PERSONAS)** deferred to a focused persona pass that runs AFTER the domain is built; candidate personas: data_steward, match_curator, merge_approver, mdm_admin.

### Left (not actionable this pass)

- **b1b blocked on B1B-S1 (module authoring) / user decisions:** B1B-S1, S2, S4, S6, S7, S8, B6, B12 (lifecycle states; entity_type now classified). B1B-S9 (em-dash) is destructive + B2-S3-gated.
- **b1b report-only owed by other domains:** B1B-S5 (inbound 155 source owed by DATA-AI-PLAT, 481 by CDP); B1B-S6 (outbound target_domain_module_id owed by SUP-LIFE/CSM/CDP/HCM/DCG/SUB-MGMT).
- **Superseded grain (reframed as note, B1B-SKILL-NOTE):** former B1B-S10 (per-module system skill + skill_tools) and B1B-S12 (legacy skills.id=12 retirement) are CANCELED per the 2026-06-06 per-domain-skill restoration; tool requirements move to domain_module_tools once built, the domain-grain skills.id=12 needs no retirement.
- **b3 backlog:** 5 entity candidates, 3 modularization candidates, 4 regulation candidates, 1 RDM domain candidate. Unchanged.

### JWT errors

None encountered this pass.
