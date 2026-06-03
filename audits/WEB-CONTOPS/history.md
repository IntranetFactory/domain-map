# WEB-CONTOPS audit history

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- **Current footprint:** **0 `domain_modules` rows** (M1 hard fail, cascades through M-band and F-band); 7 masters (`content_audits`, `web_content_inventory_records`, `accessibility_scan_findings`, `broken_link_findings`, `technical_seo_findings`, `brand_voice_violations`, `content_lifecycle_plans`) all loaded only in the legacy `domain_data_objects` rollup at `role=master / necessity=required`; 8 capabilities (`WCO-AUDIT`, `WCO-EDITORIAL`, `WCO-QUALITY`, `WCO-ACCESS`, `WCO-SEO-GOV`, `WCO-LINKS`, `WCO-CALENDAR`, `WCO-BRAND-VOICE`), all orphaned of any realizing module; 10 solutions (8 primary, 2 partial); 7 `trigger_events` on the 7 masters, all 7 with empty `event_category` (Rule #13 enum violation); 6 outbound + 3 inbound cross-domain handoffs (9 total), every single one with NULL `source_domain_module_id` AND NULL `target_domain_module_id`; 0 intra-domain handoffs; 0 lifecycle states; 0 aliases; 0 `users` edges; 3 inbound intra-cluster `data_object_relationships` from HCMS / DXP into WEB-CONTOPS masters (relationship ids 623-625, all `data_object_id` on the HCMS / DXP side) and 0 outbound rows; 1 legacy domain-level system skill `web-contops-system` (id 120) with 7 `query_*` tools (zero `mutate`, zero workflow gates, zero side-effect / compute / inbound) and `domain_module_id=NULL`; 0 `handoff_processes` rows; 0 regulations linked (ADA + Section 508 + EAA structurally relevant, none attached); 0 roles authored.
- **Vendor-surface basis:** flagship vendors enumerated below.
- **Bucket 1 (in-scope, agent fixable):** 11 items.
- **Bucket 2 (surface-for-user, judgment):** 4 items.
- **Bucket 3 (Phase 0 pending, speculative):** 7 items.

**Neighbor discovery** (auto-derived from `handoffs` + cross-domain `data_object_relationships`, ranked by edge weight):

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| DXP | 2 (accessibility, SEO findings) | 2 (web_page.published, .unpublished) | 0 (DXP has 0 modules either) | 0 | 4 | Pairwise (full) |
| HCMS | 2 (broken_link, brand_violation) | 1 (content_locale.added) | 0 | 3 (HCMS-side rels touching WEB-CONTOPS payloads) | 6 | Pairwise (full) |
| KMS | 2 (content_lifecycle.review_due, content_inventory.refreshed) | 0 | 0 | 0 | 2 | Lightweight |

Edge weights aggregated by `(handoff out + handoff in + DMDO + cross-rels)`. DXP is dominant by issue density (both sides have zero modules so every NULL FK is structural-cascade, not a fixable drift), HCMS carries the only existing cross-domain relationship edges, KMS is lightweight.

The dominant finding across every neighbor pass: **WEB-CONTOPS has zero modules**, mirroring DXP's audit posture. Every cross-domain edge therefore has a NULL `target_domain_module_id` on the WEB-CONTOPS receiving side and a NULL `source_domain_module_id` on the WEB-CONTOPS publishing side by structural necessity. Pairwise reconciliation cannot legitimately diff Section 2 (NULL module FKs) until B1-S1 (module split) is cured.

Structural pass bands: A1 / A2 / A3 / C1 / C2 pass; **A4 fail** (`catalog_tagline` and `catalog_description` both empty); **M1 / M2 / M4 / M6 hard-fail** (zero modules, 8 capabilities orphaned); **B4 hard-fail** (all seven masters have all three pattern flags false-by-default with no positive re-evaluation); **B6 / B7 / B8 hard-fail** (zero intra-domain master-to-master edges, zero `users` edges, zero outbound cross-domain relationship rows mirroring the 6 outbound handoffs); **B9 partial-fail** (7 events exist but `event_category` is empty on every row, Rule #13 enum violation); **B9b vacuously passes** (zero intra-domain handoffs but also zero modules to host them); **B10b hard-fail** (every cross-domain handoff has NULL on BOTH `source_domain_module_id` AND `target_domain_module_id`, cascade of M1 on this side plus cascade of DXP's M1 on the other side); **B11 hard-fail** (zero aliases across all 7 masters); **B12 hard-fail** (zero lifecycle states across all 7 masters); **F1 / F2 / F3 hard-fail** (one legacy domain-level system skill with seven `query` tools, no module-anchored skill, no mutate / workflow-gate / side-effect / compute / inbound tools); **F4 pass** (all 7 linked tools satisfy the `operation_kind` ↔ `data_object_id` invariant); **F5 uncomputable** (F2 fails); **F7 vacuously passes** (no channel primitives linked); **H1 hard-fail** (0 of 9 cross-domain handoffs carry any `handoff_processes` row); **E1 / E2 / E3 / E4 / E5** vacuously pass (no modules, no roles); **C1 / C2** pass (Marketing as `owner`, Software Engineering as `contributor`).

Semantius score is **uncomputable** for WEB-CONTOPS because F2 fails (no module-anchored system skill). The legacy `web-contops-system` skill scores `strict=7/7=100%` and `operational=7/7=100%` against its own 7 `skill_tools` rows (every linked tool is `coverage_tier='platform'` , all `query_<entity>` primitives), but per the score definition this number is module-anchored, and the legacy domain-level skill is a migration target per Rule #14 / #17.

### Vendor surface basis

Flagship vendors enumerated for the market audit pass (analyst-knowledge basis; the mass-audit subagent constraint blocks recursive subagent spawning, so the vendor list draws from the analyst's own domain knowledge of the market, anchored against the 10 solutions already in the catalog):

- **Siteimprove** (catalog id 478) - the canonical full-stack WEB-CONTOPS suite: accessibility (WCAG), technical SEO, content quality, brand-voice scoring, broken-link monitoring, content audit, and policy management. Anchors the union surface and the regulated-compliance side (Section 508 / ADA / EAA).
- **Acquia Optimize** (catalog id 485, formerly Monsido) - direct accessibility + SEO + content quality competitor to Siteimprove; anchors the open-source-DXP-adjacent buyer (Drupal shops on Acquia).
- **AudioEye** (catalog id 484) - accessibility-specialist; anchors the deep-accessibility-only buyer (no SEO / content quality scope), often layered alongside a separate SEO tool.
- **Conductor** (catalog id 481) - enterprise SEO platform; anchors the SEO-led buyer (content-strategy + technical SEO + topic gap analysis), distinct from Siteimprove's compliance lead.
- **Lumar** (catalog id 482, formerly DeepCrawl) - technical SEO crawler; anchors the deep-SEO-engineering buyer (site architecture, crawl budget, structured-data validation).
- **Acrolinx** (catalog id 480) - brand voice / writing quality enforcement; anchors the regulated-content-quality buyer (financial services, pharma, technical communications).
- **GatherContent** (catalog id 479) - editorial workflow / content briefs / production calendar; anchors the editorial-process buyer distinct from compliance scanning.
- **Optimizely Content Marketing Platform** (catalog id 483, formerly Welcome Software) - editorial workflow + content marketing operations; overlap with GatherContent on production workflow plus content-marketing-specific orchestration.

Compliance-specialist anchors: **Siteimprove**, **Acquia Optimize**, and **AudioEye** all stake their primary positioning on WCAG / Section 508 / EAA compliance. **Acrolinx** carries the brand-and-legal-language compliance layer (regulated-industry copy review). None of the regulatory anchors (ADA, Section 508, EAA, GDPR cookie-banner / privacy-text compliance) are currently linked via `domain_regulations`, which is itself a gap (see B2-4).

The split across the vendor surface produces a clean three-pole shape: **compliance-and-audit** (Siteimprove / Acquia Optimize / AudioEye / Acrolinx), **technical-SEO governance** (Conductor / Lumar; Siteimprove also overlaps), and **editorial-workflow / content-planning** (GatherContent / Optimizely CMP). This shape drives the module-split recommendation in B1-S1.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 / M2 / M4 / M6 (hard fail)** | **Zero `domain_modules` rows for WEB-CONTOPS** (`/domain_modules?domain_id=eq.128` returns `[]`; `/domain_module_host_domains?domain_id=eq.128` returns `[]`). 8 capabilities are linked via `capability_domains` (`WCO-AUDIT`, `WCO-EDITORIAL`, `WCO-QUALITY`, `WCO-ACCESS`, `WCO-SEO-GOV`, `WCO-LINKS`, `WCO-CALENDAR`, `WCO-BRAND-VOICE`), so the >=3 -> >=2 modules rule under M2 applies. Every downstream M / F / B-band failure cascades from this one: no module to attribute lifecycle states to (M5), no module to realize any of the 8 capabilities (M4 / M6 , all 8 orphaned), no module to anchor a system skill (F2), no module to populate `source_domain_module_id` on the 6 outbound handoffs (B10b on this side), no module to populate `target_domain_module_id` on the 3 inbound handoffs (B10b on the receiving side), no module to write DMDO rows against (the catalog-wide `domain_module_data_objects` query for all 7 WEB-CONTOPS masters returns 0 rows). | Propose a 3-module split before any other fix loads. Recommended starting shape (open to B2-1 decision, matches the three-pole vendor-surface above): **`WCO-AUDIT-COMPLIANCE`** (mastering `content_audits`, `accessibility_scan_findings`, `brand_voice_violations`; realizing `WCO-AUDIT`, `WCO-ACCESS`, `WCO-QUALITY`, `WCO-BRAND-VOICE`); **`WCO-SEO-LINKS`** (mastering `technical_seo_findings`, `broken_link_findings`, `web_content_inventory_records`; realizing `WCO-SEO-GOV`, `WCO-LINKS`); **`WCO-EDITORIAL-PLANNING`** (mastering `content_lifecycle_plans`; realizing `WCO-EDITORIAL`, `WCO-CALENDAR`). All three `module_kind='full'`. `web_content_inventory_records` is a cross-module joiner (every other module reads it for surface-under-scan) , recommend `master` on `WCO-SEO-LINKS` and `embedded_master` on `WCO-AUDIT-COMPLIANCE` + `WCO-EDITORIAL-PLANNING`. |
| B1-S2 | **B12 (hard fail)** | **Zero `data_object_lifecycle_states` for all 7 masters.** Every master has an observable workflow ladder per flagship vendor docs: `content_audits` (scheduled -> running -> completed -> archived); `web_content_inventory_records` (discovered -> classified -> in_review -> retained -> retired); `accessibility_scan_findings` (detected -> triaged -> in_remediation -> resolved -> wont_fix -> verified); `broken_link_findings` (detected -> in_remediation -> resolved -> ignored); `technical_seo_findings` (detected -> triaged -> in_remediation -> resolved -> wont_fix); `brand_voice_violations` (detected -> in_review -> accepted -> dismissed); `content_lifecycle_plans` (draft -> active -> review_due -> revised -> retired). Without lifecycle states, no workflow-gate permissions are derivable; B9 has no published-verb anchors; the finding-triage workflows that anchor every flagship product cannot be modeled. Per Rule #12 every `master + required` data_object needs lifecycle states unless config-shape (none of the 7 qualifies , every one carries a real state machine). | Author lifecycle state rows for the 7 masters; mark `requires_permission=true` on the transition states (`resolve`, `retain`, `retire`, `dismiss`, `verify`, `ignore`); set `domain_module_id` to the realizing module from B1-S1. Load via a focused loader after B1-S1 lands. |
| B1-S3 | **B4 (hard fail)** | **Pattern flags false-by-default across all 7 masters with no positive re-evaluation recorded.** Specifically: should `accessibility_scan_findings.has_personal_content=true` (findings may quote screen-reader output that includes user-content PII)? Should `content_audits.has_submit_lock=true` (a completed audit is immutable, like a signed report)? Should `content_lifecycle_plans.has_single_approver=true` (the content owner is typically the single approver for retire / archive decisions)? Should `brand_voice_violations.has_personal_content=true` (violation quotes may include user-supplied or PII-adjacent copy)? Should `accessibility_scan_findings.has_single_approver=true` (the accessibility lead typically signs off `wont_fix` and `verified` transitions)? | Per-flag PATCH from B2-2 answers. Do NOT auto-populate `data_objects.notes` to explain the flags (Rule #15). |
| B1-S4 | **B7 (hard fail)** | **Zero `users` edges** between any WEB-CONTOPS master and the `users` built-in (id=748). Each of the 7 masters has user-typed actors: `content_audits` (audit owner, audit reviewer); `web_content_inventory_records` (content owner, classifier); `accessibility_scan_findings` (assignee, accessibility lead approver); `broken_link_findings` (assignee); `technical_seo_findings` (assignee, seo lead); `brand_voice_violations` (assignee, brand reviewer); `content_lifecycle_plans` (plan owner, content steward). None are captured as `data_object_relationships` rows. The relationship graph rendered for WEB-CONTOPS today shows zero human actors. | Author 12-to-16 user-edge `data_object_relationships` rows: `users owns content_audits`, `users reviews content_audits`, `users owns web_content_inventory_records`, `users assignees accessibility_scan_findings`, `users approves accessibility_scan_findings` (accessibility lead, single-approver path), `users assignees broken_link_findings`, `users assignees technical_seo_findings`, `users approves technical_seo_findings` (seo lead), `users assignees brand_voice_violations`, `users reviews brand_voice_violations`, `users owns content_lifecycle_plans`. Each row carries the standard `relationship_verb` / `inverse_verb` / `relationship_type='many_to_many'` / `relationship_kind='reference'` / `is_required=false` / `owner_side='target'` shape per Rule #10. |
| B1-S5 | **B6 (hard fail)** | **Zero intra-domain `data_object_relationships` between WEB-CONTOPS masters.** Query `/data_object_relationships?and=(data_object_id.in.(684,685,686,687,688,689,690),related_data_object_id.in.(684,685,686,687,688,689,690))` returns empty. Expected edges (every flagship vendor schema carries these): `content_audits scans web_content_inventory_records` (one-to-many; an audit run produces many inventory snapshots); `web_content_inventory_records anchors accessibility_scan_findings` (one-to-many; each finding references the URL row that produced it); `web_content_inventory_records anchors broken_link_findings` (one-to-many); `web_content_inventory_records anchors technical_seo_findings` (one-to-many); `web_content_inventory_records anchors brand_voice_violations` (one-to-many); `content_audits produces accessibility_scan_findings` (one-to-many , an audit run emits the findings batch); `content_audits produces broken_link_findings` (one-to-many); `content_audits produces technical_seo_findings` (one-to-many); `content_audits produces brand_voice_violations` (one-to-many); `content_lifecycle_plans governs web_content_inventory_records` (one-to-many; a plan covers many inventory rows). | Author 9-to-12 intra-domain relationship rows after B1-S1 and B1-S2 land (so rows can carry meaningful `is_required` against the lifecycle state shapes). |
| B1-S6 | **B11 (hard fail)** | **Zero `data_object_aliases` across all 7 masters.** Flagship vendors use clearly different terminology that the WEB-CONTOPS architect-view today cannot render: `content_audits` -> Site Audit (Siteimprove), Crawl (Lumar / Conductor), Optimization Job (Acquia Optimize); `accessibility_scan_findings` -> Issue (Siteimprove Accessibility), Violation (axe-core / Acquia Optimize), Defect (AudioEye); `broken_link_findings` -> Broken Link Issue (Siteimprove), 404 (Lumar), Dead Link (Conductor); `technical_seo_findings` -> SEO Issue (Conductor / Lumar), Recommendation (Acquia Optimize SEO), Audit Issue (Siteimprove SEO); `brand_voice_violations` -> Flag (Acrolinx), Issue (Writer), Style Violation (Acquia Optimize Quality); `web_content_inventory_records` -> Asset (Siteimprove Inventory), Page (Conductor / Lumar), URL Item (Acquia Optimize); `content_lifecycle_plans` -> Editorial Plan (GatherContent), Content Plan (Optimizely CMP), Lifecycle Plan (Acquia Optimize). | Author 14-to-21 alias rows after B1-S1. |
| B1-S7 | **B9 (Rule #13 enum violation)** | **All 7 `trigger_events` for WEB-CONTOPS masters have empty `event_category`** (Rule #13 enum must be one of `lifecycle / state_change / threshold / signal`). Event ids and current names: 902 `content_audit.completed`, 903 `accessibility_finding.detected`, 904 `broken_link.detected`, 905 `seo_finding.created`, 906 `brand_violation.detected`, 907 `content_lifecycle.review_due`, 908 `content_inventory.refreshed`. | PATCH each row: 902 `content_audit.completed` -> `lifecycle` (run boundary, not state change on a state machine , the audit job completes); 903 `accessibility_finding.detected` -> `signal` (new finding emitted from an outside scanner); 904 `broken_link.detected` -> `signal`; 905 `seo_finding.created` -> `signal`; 906 `brand_violation.detected` -> `signal`; 907 `content_lifecycle.review_due` -> `threshold` (date-based threshold, fires when planned review date is reached); 908 `content_inventory.refreshed` -> `lifecycle` (crawl-batch boundary). |
| B1-S8 | **B9 (missing events)** | **Coverage gap on workflow-gate state transitions.** Once B1-S2 lands, lifecycle states like `accessibility_finding.resolved`, `accessibility_finding.wont_fix`, `broken_link.resolved`, `technical_seo_finding.resolved`, `brand_violation.dismissed`, `web_content_inventory.retired`, `content_lifecycle_plan.retired`, `content_lifecycle_plan.revised`, `content_audit.archived` will be flagged `requires_permission=true` but have no matching `trigger_events` row. The B9 pass test says every workflow-gate state needs a published verb event. | Insert 6-to-9 additional `trigger_events` rows after B1-S2 lands; each `event_category='state_change'`, `data_object_id` pointing at the publishing master. The current outbound handoffs already imply some published verbs (e.g. resolved findings feeding back to DXP / HCMS as `<finding>.resolved` clear-signals); none exist yet. |
| B1-S9 | **B8 (hard fail)** | **Zero outbound cross-domain `data_object_relationships` rows from WEB-CONTOPS masters.** Query `/data_object_relationships?and=(data_object_id.in.(684,685,686,687,688,689,690),related_data_object_id.not.in.(684,685,686,687,688,689,690))` returns empty. The 6 outbound handoffs imply 6 corresponding payload-target relationship rows: handoff 815 (`accessibility_finding.detected` -> DXP, payload `accessibility_scan_findings`) -> relationship `accessibility_scan_findings flags web_pages` (DXP master 441); handoff 816 (`brand_violation.detected` -> HCMS, payload `brand_voice_violations`) -> relationship `brand_voice_violations flags content_entries` (HCMS master 132); handoff 817 (`broken_link.detected` -> HCMS, payload `broken_link_findings`) -> relationship `broken_link_findings flags content_entries` (HCMS master 132); handoff 818 (`content_lifecycle.review_due` -> KMS, payload `content_lifecycle_plans`) -> relationship `content_lifecycle_plans governs knowledge_articles` (KMS master TBD-after-KMS-load-check); handoff 819 (`content_inventory.refreshed` -> KMS, payload `web_content_inventory_records`) -> relationship `web_content_inventory_records informs knowledge_articles` (KMS master TBD); handoff 820 (`seo_finding.created` -> DXP, payload `technical_seo_findings`) -> relationship `technical_seo_findings flags web_pages` (DXP master 441). | Surface to user; load the 4 cross-domain relationship rows whose target-side masters are already in the catalog (DXP `web_pages` id 441; HCMS `content_entries` id 132); defer KMS-side rows until target identification is confirmed during the KMS audit or this audit's follow-up. |
| B1-S10 | **F1 / F2 / F3 (hard fail)** | **Legacy domain-level system skill only, no module-anchored skill.** `skills.id=120, skill_name='web-contops-system', skill_type='system', domain_id=128, domain_module_id=NULL`. Carries 7 `skill_tools` rows, all `query_*` shape (`query_content_audits`, `query_web_content_inventory_records`, `query_accessibility_scan_findings`, `query_broken_link_findings`, `query_technical_seo_findings`, `query_brand_voice_violations`, `query_content_lifecycle_plans`), all `coverage_tier='platform'`. **Zero mutate tools, zero workflow-gate tools, zero side_effect / compute / fetch / inbound tools.** Per Rule #17 every module needs exactly one `skill_type='system'` skill with `domain_module_id` set and >=1 `skill_tools` row; the legacy domain-level skill is the migration target, not the target state. The mutate / workflow-gate floor (Rule #17 sub-invariant on F3 , typically >=3 required tools per system skill) is unmet. | After B1-S1 lands, author one system skill per new module with `skill_type='system'` and `domain_module_id` set. Authoring floor per module: 4-to-8 tools mixing `query`, `mutate` (e.g. `create_content_audit`, `resolve_accessibility_finding`, `dismiss_brand_violation`, `retire_inventory_record`), `side_effect` (e.g. `trigger_external_a11y_rescan`, `submit_redirect_request`), `fetch` (e.g. `fetch_wcag_rules`, `fetch_seo_serp_data`), and `inbound` (e.g. `receive_scanner_callback`, `receive_crawler_completion`). Once module-anchored skills ship, DELETE the legacy `web-contops-system` row (F1). |
| B1-S11 | **H1 (hard fail)** | **0 of 9 cross-domain handoffs carry any `handoff_processes` row.** Volume expectation per SKILL.md: 0.5N to 0.8N -> 5 to 7 `agent_curated` tags. Authoring proposals below in B1-S11 detail. |

##### APQC TAGGING proposals (B1-S11 detail)

| handoff_id | source -> target | trigger_event | payload | Proposed PCF (process_name, hierarchy_level) | Confidence |
|---|---|---|---|---|---|
| 815 | WEB-CONTOPS -> DXP | `accessibility_finding.detected` | `accessibility_scan_findings` | Manage IT compliance / Manage regulatory compliance (accessibility leg) | possibly defer (modern digital-compliance leaf, no clean cross-industry PCF) |
| 820 | WEB-CONTOPS -> DXP | `seo_finding.created` | `technical_seo_findings` | Manage digital marketing (technical SEO leg) | defer to Discover Pass 3 (no clean PCF match for technical SEO governance) |
| 816 | WEB-CONTOPS -> HCMS | `brand_violation.detected` | `brand_voice_violations` | Manage brand (PCF "Manage and develop brand") | confident L3 (after lookup) |
| 817 | WEB-CONTOPS -> HCMS | `broken_link.detected` | `broken_link_findings` | Manage web content (link maintenance leg) | needs PCF lookup at fix time |
| 818 | WEB-CONTOPS -> KMS | `content_lifecycle.review_due` | `content_lifecycle_plans` | Manage knowledge / Conduct knowledge content review | confident L3 (after lookup) |
| 819 | WEB-CONTOPS -> KMS | `content_inventory.refreshed` | `web_content_inventory_records` | Manage knowledge / Maintain knowledge inventory | confident L3 (after lookup) |
| 814 | DXP -> WEB-CONTOPS | `web_page.published` | `web_pages` | Manage web content (publishing leg, triggers post-publish audit) | needs PCF lookup at fix time |
| 838 | DXP -> WEB-CONTOPS | `web_page.unpublished` | `web_pages` | Manage web content (unpublishing leg) | needs PCF lookup at fix time |
| 837 | HCMS -> WEB-CONTOPS | `content_locale.added` | `content_locales` | Manage translations / Manage multilingual content | possibly defer (multilingual-content leaf) |

Bucket 1 finding-type rollup:

| Finding type | Count |
| --- | --- |
| STRUCTURAL (M / B / F bands) | 10 |
| APQC TAGGING (single sub-section) | 1 |
| WRONG-OWNERSHIP | 0 (deferred to Bucket 3) |
| SCOPE-CREEP | 0 |
| BOUNDARY | 0 in Bucket 1 (all routed to report-only since WEB-CONTOPS has no modules to anchor target_domain_module_id) |
| MISSING | 0 in Bucket 1 (entity gaps routed to Bucket 3 pending Phase 0) |
| **Bucket 1 total** | **11** |

#### Boundary findings per neighbor

##### HCMS (weight 6, pairwise full)

- Section 1: 1 inbound HCMS->WEB-CONTOPS handoff (id 837, `content_locale.added` -> `content_locales`), 2 outbound WEB-CONTOPS->HCMS handoffs (816 `brand_violation.detected`, 817 `broken_link.detected`). 3 existing `data_object_relationships` from HCMS masters to WEB-CONTOPS finding tables (relationship ids 623-625): `content_locales expands_scope_of content_audits` (623); `content_entries receives brand_voice_violations` (624); `content_entries receives broken_link_findings` (625). HCMS-owned authoring of those rows is correct per B8's asymmetry rule (`data_object_id` on the HCMS side). These give us the canonical verbs to mirror on the outbound side from WEB-CONTOPS (B1-S9).
- Section 2: every WEB-CONTOPS<->HCMS handoff has NULL `source_domain_module_id` AND NULL `target_domain_module_id`. The WEB-CONTOPS side of every NULL cures only after B1-S1 lands. The HCMS side (`hcms-content-mgmt` or whichever module masters `content_entries` + `content_locales`) is HCMS's B10b , report-only.
- Section 3: missing relationship rows on the WEB-CONTOPS side: `brand_voice_violations flags content_entries` (already inferred from existing rel 624 in the reverse direction) and `broken_link_findings flags content_entries` (already inferred from rel 625 in the reverse direction). The B8 outbound-only rule says we still owe the forward edge on this audit even though the partner side already has the reverse edge , both rows are independent statements about ownership and necessity. Surface as part of B1-S9.
- Section 4: no integrity gaps detected.
- Section 5: HCMS already mirrors the cross-domain edges from its side; WEB-CONTOPS owes the symmetric outbound rows (B1-S9, 2 of the 4 mappable ones land here).

##### DXP (weight 4, pairwise full)

- Section 1: 2 outbound (815 `accessibility_finding.detected`, 820 `seo_finding.created`) and 2 inbound (814 `web_page.published`, 838 `web_page.unpublished`). All 4 have NULL on BOTH module FKs. Both sides (DXP and WEB-CONTOPS) have zero modules , every NULL is a structural cascade of M1 on each side, not a fixable drift.
- Section 2: B10b NULL on both ends cannot be fixed without B1-S1 here AND B1-S1 on DXP (already an open finding in `audits/DXP.md`).
- Section 3: missing relationship rows on the WEB-CONTOPS side: `accessibility_scan_findings flags web_pages` (DXP master 441) and `technical_seo_findings flags web_pages` (DXP master 441). Both are in B1-S9.
- Section 4: no integrity gaps beyond M1 cascade.
- Section 5: cross-relationship coverage is zero in both directions on the DXP<->WEB-CONTOPS boundary. DXP's audit already flagged the missing outbound from DXP toward WEB-CONTOPS payloads (its B1-S9, for handoffs 814/838 cross-domain rows targeting `page_audits` or `web_lifecycle_plans` , note that DXP's audit used candidate WEB-CONTOPS payload names that differ from the actual masters; the canonical mapping is `web_pages` -> `accessibility_scan_findings` / `technical_seo_findings` / `web_content_inventory_records`).

##### KMS (weight 2, lightweight)

- 2 outbound (818 `content_lifecycle.review_due`, 819 `content_inventory.refreshed`), 0 inbound. No DMDO on either side. No cross-domain relationship rows in either direction. KMS-side consumer DMDOs on `content_lifecycle_plans` and `web_content_inventory_records` would be the right shape , report-only on KMS's audit, do not author here.

### Bucket 2 - Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-1 | **Module split shape** , the proposed 3-module split in B1-S1 (`WCO-AUDIT-COMPLIANCE` + `WCO-SEO-LINKS` + `WCO-EDITORIAL-PLANNING`) is one of several defensible shapes. Alternatives: (a) the 3-module split as proposed (matches the three-pole vendor surface: compliance-and-audit, technical SEO, editorial); (b) a 2-module split (`WCO-FINDINGS` covering all 5 finding masters + `web_content_inventory_records` + `content_audits`; `WCO-EDITORIAL` covering `content_lifecycle_plans` only) , matches the "scanner output" vs "editorial process" line that Siteimprove + GatherContent represent at the two extremes; (c) a 4-module split (split `WCO-ACCESS` from `WCO-QUALITY` to track separate accessibility-specialist buyers like AudioEye); (d) defer until Phase 0 produces the formal vendor surface and the module set comes back from the subagent. | Module split is a design call the user owns. The market-audit pass produced enough information to draft a defensible split, but committing to one before Phase 0 ratifies the surface risks a re-do. | (a) / (b) / (c) / (d) , user picks. |
| B2-2 | **Pattern flag positive re-evaluation** (B4): which of the following should flip to `true`? Each affects derived permissions and the workflow-gate surface: `content_audits.has_submit_lock` (a completed audit is an immutable report); `accessibility_scan_findings.has_personal_content` (findings quote scanned page content which may include user-supplied or visitor PII); `accessibility_scan_findings.has_single_approver` (the accessibility lead signs off `wont_fix` and `verified` transitions); `technical_seo_findings.has_single_approver` (the SEO lead signs off `wont_fix`); `brand_voice_violations.has_personal_content` (violations quote scanned copy which may carry PII); `content_lifecycle_plans.has_single_approver` (the content owner is the single sign-off for retire / archive decisions); `web_content_inventory_records.has_personal_content` (inventory rows may capture URL paths that embed user IDs or PII tokens). | Pattern-flag judgments are workflow-shape decisions the user owns; the false-by-default doesn't establish review. | Per-flag yes / no from user. |
| B2-3 | **Vendor-name scan on WEB-CONTOPS description text** (Rule #18 check). WEB-CONTOPS's `domains.description` reads clean of vendor names ("Editorial workflow, content audit and inventory, accessibility scanning, content quality / brand-voice enforcement, technical SEO governance, broken-link monitoring, and content-lifecycle planning for external / customer-facing web properties. The people-and-process layer over DXP and HCMS. Buyer is Marketing or the Web team. Distinct from INTRANET (internal audience), DXP (the delivery platform), and DAM (the asset store)."). `business_logic` clean. `notes` empty. `catalog_tagline` and `catalog_description` are both empty (A4 fail) and need authoring per Rule #20. | Catalog UX field authoring (`catalog_tagline`, `catalog_description`) needs user approval per Rule #20 , even on greenfield writes the draft must be surfaced before the write. | Draft proposed wording, surface to user before any PATCH; user supplies / approves the exact text. |
| B2-4 | **Regulation linkage**: ADA (id 61) and Section 508 (id 62) exist in the `regulations` catalog but `domain_regulations` has zero rows for WEB-CONTOPS. The accessibility-finding master is the literal substrate of WCAG / Section 508 / EAA compliance scanning. Should this audit also surface European Accessibility Act (EAA) as a missing regulation entry to add to the `regulations` catalog before linking? GDPR-cookie-banner / cookie-consent content scanning is a secondary edge (OneTrust / Cookiebot territory) , out-of-scope for WEB-CONTOPS proper or in-scope? | Regulation-mapping calls fall on the user; the audit can identify the gap but not unilaterally write `domain_regulations` rows with `applicability` qualifiers. | (a) link ADA + Section 508 with `applicability='required'`, defer EAA until the regulation is loaded into `regulations`; (b) also queue EAA via a new `regulations` insert and link it; (c) include the GDPR cookie-consent edge as `applicability='conditional'`; (d) defer entirely until B2-1 module split lands so the linkage is module-scoped. |

### Bucket 3 - Phase 0 pending (speculative)

The market-audit semantic pass (using the analyst's own flagship-vendor knowledge , no separate subagent invocation per the mass-audit constraint) identifies the following candidates against the union surface of Siteimprove, Acquia Optimize, AudioEye, Conductor, Lumar, Acrolinx, GatherContent, and Optimizely Content Marketing Platform.

| ID | Finding | Type | Vendor knowledge basis | Recommended verification |
|---|---|---|---|---|
| B3-1 | **`editorial_tasks` / `editorial_briefs`** , the production-workflow substrate. GatherContent and Optimizely CMP both master "content brief" (the editorial assignment definition) and "task" (the per-stage step) as first-class. WEB-CONTOPS today carries `content_lifecycle_plans` (the calendar) but no production substrate. Backs `WCO-EDITORIAL`. Without these, `WCO-EDITORIAL-PLANNING` is a planning-only module with no orchestration shape. | MISSING (2 entities) | GatherContent, Optimizely CMP, Welcome (legacy), Skyword | Phase 0 vendor research: confirm whether `editorial_briefs` is a master in WEB-CONTOPS or part of a separate Content Marketing Platform domain (see B3-7); confirm `editorial_tasks` field set (assignee, stage, due_date, status). |
| B3-2 | **`content_calendar_entries`** , the canonical calendar row distinct from `content_lifecycle_plans`. GatherContent + Optimizely CMP + Trello-for-content tools all model calendar entries as separate from lifecycle plans (a calendar entry is one publish event; a lifecycle plan governs many calendar entries over time). Backs `WCO-CALENDAR`. | MISSING (1 entity) | GatherContent, Optimizely CMP, ContentCal | Phase 0 verification: confirm whether `content_calendar_entries` lives in WEB-CONTOPS or in a separate CMP (Content Marketing Platform) domain. |
| B3-3 | **`scanner_runs` / `scan_jobs`** , the orchestration substrate for the four scanner-output masters (accessibility, broken-link, technical-SEO, brand-voice). Every flagship vendor (Siteimprove, Acquia Optimize, AudioEye, Conductor, Lumar) models the scan job (the crawl run that produces findings) as a first-class master separate from the findings it emits. The current `content_audits` master partly covers this (the run boundary) but conflates the audit report with the underlying scan execution. | MISSING (1-2 entities) , possible refactor of `content_audits` | All scanner vendors | Phase 0 verification: confirm whether `scanner_runs` should be a separate master from `content_audits`, or whether the conflation in `content_audits` is the intent. May land as a relabel + field-set extension rather than a new master. |
| B3-4 | **`a11y_rules` / `seo_rules` / `brand_rules`** , the rule-catalog substrate the scanners use. WCAG 2.1 has ~78 success criteria; Acrolinx ships hundreds of brand rules; Conductor / Lumar carry SEO best-practice rules. Each finding row points at the violating rule. Without rule catalogs, findings can't be deduplicated or scored by severity. May land as a single `scan_rules` master with a `rule_kind` discriminator, or as three separate masters per scan type. | MISSING (1-3 entities) | Siteimprove (rule catalog), Acrolinx (rules editor), Acquia Optimize (policy editor), axe-core (open-source rule library) | Phase 0 verification: confirm one-table-with-discriminator vs three-separate-masters; confirm rule-catalog ownership (is this WEB-CONTOPS-mastered, or a `consumer` of a separate WCAG-catalog domain?). |
| B3-5 | **`content_redirects` / `redirect_rules`** , the URL-redirect master. Siteimprove + Acquia Optimize + Lumar all surface redirect management as part of the link-and-inventory governance surface (the answer to "when an inventory record retires, where does its URL redirect?"). Without redirects, `web_content_inventory_records` retirement workflow has no terminal-state target. | MISSING (1 entity) | Siteimprove, Acquia Optimize, Lumar | Phase 0 verification: confirm whether `content_redirects` masters in WEB-CONTOPS or in DXP / HCMS as a sibling of `web_pages` / `content_entries`. |
| B3-6 | **MODULARIZATION** , the proposed 3-module split (B1-S1) needs Phase 0 ratification. If a separate Content Marketing Platform (CMP) domain promotes (see B3-7), the `WCO-EDITORIAL-PLANNING` module shrinks or disappears. If accessibility splits as a specialist sub-domain (AudioEye-shaped buyer), `WCO-AUDIT-COMPLIANCE` may split into `WCO-ACCESS` + `WCO-AUDIT-QUALITY`. Net plausible end states: 2 modules (findings + planning), 3 modules (as proposed), or 4 modules (split accessibility specialist out). | MODULARIZATION | The vendor split (Siteimprove suite vs accessibility-specialist vs CMP-specialist) | Phase 0 subagent pass per the standard procedure; output to `c:/tmp/WEB-CONTOPS-phase0-2026-05-30.md` listing each entity's vendor surface and proposed module. |
| B3-7 | **WRONG-OWNERSHIP candidate** , `content_lifecycle_plans` (and the proposed B3-1 / B3-2 editorial substrate) may belong to a separate **Content Marketing Platform (CMP)** domain, candidate to be queued. Optimizely CMP / Welcome Software / Skyword position the editorial+production workflow as a distinct point-solution market from accessibility/SEO governance. If CMP promotes, `WCO-EDITORIAL-PLANNING` module either disappears (editorial moves out) or becomes a consumer of CMP masters. CMP is NOT currently in `_missing-domains.md` , propose queuing it. | WRONG-OWNERSHIP (potential) + new domain candidate | Optimizely CMP (Welcome), Skyword, ContentCal, NewsCred, Contently | Phase 0 + CMP triage decision. CMP candidate to be queued via `append_missing_domain.ts`. |

### Cross-bucket dependencies

- **B1-S1 (modules) gates almost everything in Bucket 1.** B1-S2 (lifecycle states need `domain_module_id`), B1-S5 (intra-domain relationships need a stable cross-module diagram), B1-S8 (workflow-gate events depend on lifecycle states), B1-S10 (module-anchored system skills), B1-S11 partial (some PCF tags depend on which module is the publisher) all wait on B1-S1.
- **B1-S1 is itself shaped by B2-1 (which module split).** Recommend resolving B2-1 first; then load B1-S1; then queue B1-S2 / S4 / S5 / S6 / S8 / S10 / S11 as a single follow-up batch.
- **B1-S3 (pattern flags) depends on B2-2.** Independent of B2-1.
- **B1-S7 (event_category PATCHes) is independent.** Can land first as a quick win (7 PATCHes).
- **B1-S4 (users edges) is independent of B1-S1** structurally; can land alongside the event_category fixes. Once B1-S5 lands, the relationship graph becomes legible.
- **Bucket 3 informs B2-1 (the module split).** If B3-7 resolves toward CMP promotion, the WEB-CONTOPS module set shrinks (editorial moves out); if it folds back in or stays here, the module set stays at 3. Recommend running formal Phase 0 before committing to B2-1.
- **B1-S11 APQC TAGGING can ship independently of every other Bucket 1 item.** PCF lookup is read-only against the catalog; tag rows are pure inserts on `handoff_processes`.
- **B2-4 (regulation linkage) is independent of B2-1** structurally but cleaner if module-scoped after B1-S1 lands (the linkage is at the domain level today; future-rule may want a module-level shape).

### Per-bucket prompts

**Bucket 1 - fix these now?** Reply with: `all`, or list (e.g. `S7, S11`), or `skip`.

- **S1 (M-band hard fail - author 3 `domain_modules` with capability + DMDO links, depends on B2-1):** decide B2-1 first.
- **S2 (B12 lifecycle states):** depends on S1.
- **S3 (B4 pattern flags):** independent; needs B2-2 answers.
- **S4 (B7 users edges, 12-to-16 rows):** independent of S1.
- **S5 (B6 intra-domain relationships, 9-to-12 rows):** depends on S1+S2.
- **S6 (B11 aliases, 14-to-21 rows):** depends on S1.
- **S7 (B9 event_category PATCH, 7 rows):** independent; quick win.
- **S8 (B9 missing workflow events, 6-to-9 rows):** depends on S2.
- **S9 (B8 outbound cross-domain relationships, 4-to-6 rows):** independent of S1.
- **S10 (F2 module-anchored system skills + mutate / workflow-gate / side-effect / fetch / inbound tools):** depends on S1.
- **S11 (H1 APQC TAGGING, 4-to-6 high-confidence rows + 3 deferred):** independent; can ship immediately.

**Bucket 2 - what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-1 (module split):** (a) 3-module / (b) 2-module / (c) 4-module split-accessibility / (d) defer to Phase 0.
- **B2-2 (pattern flags):** per-flag yes / no for each of the 7 candidates listed in B1-S3.
- **B2-3 (catalog UX fields, A4):** I will draft proposed `catalog_tagline` and `catalog_description` for review before any PATCH (Rule #20).
- **B2-4 (regulation linkage):** (a) link ADA + 508 only / (b) add EAA first then link all three / (c) include GDPR cookie-consent edge / (d) defer until S1 lands.

**Bucket 3 - Phase 0 pending - vet via formal Phase 0 vendor research or eyeball-mode?**

The strongest signals are the editorial-task substrate (B3-1) and the scanner-run substrate (B3-3) , both are Core class across every flagship vendor and would land in their respective modules regardless of which 2 / 3 / 4 module split lands. If you commit to part of the work, that's the highest-leverage cluster. Recommend running formal Phase 0 to ratify the full surface before committing to B2-1 module-split shape.

Candidates queued in `audits/_missing-domains.md` from this audit: **CMP** (new candidate , Content Marketing Platform; first surfaced).

### Report-only follow-ups (owed by other domains)

| Owed by | Check | Detail |
|---|---|---|
| DXP | B10b (`source_domain_module_id`) | 2 inbound DXP->WEB-CONTOPS handoffs (814 `web_page.published`, 838 `web_page.unpublished`) have NULL `source_domain_module_id`. DXP owes the fix as part of its own B10b (currently blocked by DXP M1, see `audits/DXP.md`). |
| DXP | B10b (`target_domain_module_id` on DXP receiver side) | 2 outbound WEB-CONTOPS->DXP handoffs (815 `accessibility_finding.detected`, 820 `seo_finding.created`) have NULL `target_domain_module_id`. DXP owes the receive-side fix as part of its own B10b (blocked by DXP M1). |
| DXP | B8 inbound mirror | DXP audit already flagged the missing cross-domain `data_object_relationships` rows mirroring WEB-CONTOPS's outbound handoffs in DXP's own B1-S9. |
| HCMS | B10b (`source_domain_module_id`) | 1 inbound HCMS->WEB-CONTOPS handoff (837 `content_locale.added`) has NULL `source_domain_module_id`. HCMS owes the fix once HCMS modules are confirmed and the source module is identified. |
| HCMS | B10b (`target_domain_module_id` on HCMS receiver side) | 2 outbound WEB-CONTOPS->HCMS handoffs (816 `brand_violation.detected`, 817 `broken_link.detected`) have NULL `target_domain_module_id`. HCMS owes the receive-side fix as part of its own B10b. |
| KMS | B10b + DMDO + B8 inbound mirror | 2 outbound WEB-CONTOPS->KMS handoffs (818 `content_lifecycle.review_due`, 819 `content_inventory.refreshed`) have NULL `target_domain_module_id`. KMS has no consumer DMDO row on `content_lifecycle_plans` or `web_content_inventory_records` either. KMS owes the full receive-side wiring as part of its own audit. KMS also owes the B8 mirror rows (inbound relationship rows on the KMS side referencing the WEB-CONTOPS payloads). |

## 2026-05-31, Continuation: B1 technical fixes

Applied the in-scope, pre-specified B1 fixes via [.tmp_deploy/fix_web_contops_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_web_contops_b1_technical_2026_05_31.ts).

### Applied (2 of 11 B1 items)

- **B1-S7 (B9 enum backfill, 7 PATCHes).** PATCHed `trigger_events.event_category` on ids 902-908 to the audit-specified values: 902 `content_audit.completed` -> `lifecycle`; 903 `accessibility_finding.detected` -> `signal`; 904 `broken_link.detected` -> `signal`; 905 `seo_finding.created` -> `signal`; 906 `brand_violation.detected` -> `signal`; 907 `content_lifecycle.review_due` -> `threshold`; 908 `content_inventory.refreshed` -> `lifecycle`. All 7 rows previously empty (Rule #13 violation cleared). 0 skipped.
- **B1-S4 (B7 users edges, 11 INSERTs).** Inserted the 11 user-edge `data_object_relationships` rows the audit pre-specifies (Rule #10). New row ids 1576-1586, all with `data_object_id=748` (users), `relationship_type='many_to_many'`, `relationship_kind='reference'`, `is_required=false`, `owner_side='target'`, `record_status='new'` (default), `notes=''` (default). Verbs taken verbatim from the audit text (`owns`, `reviews`, `assignees`, `approves`); inverse verbs follow the standard passive pattern (`is_owned_by`, `is_reviewed_by`, `is_assigned_to`, `is_approved_by`). B7 hard-fail cleared on user-edge count.

### Deferred (9 of 11 B1 items)

- **B1-S1 (M-band, modules).** Gated on B2-1 (user must pick the 2/3/4-module split shape). New entities and DMDOs not auto-authored.
- **B1-S2 (lifecycle states).** Depends on S1 (requires `domain_module_id` on each `data_object_lifecycle_states` row).
- **B1-S3 (pattern flags).** Gated on B2-2 (user must answer 7 per-flag yes/no questions). Per Rule #15 no `notes` writes regardless.
- **B1-S5 (intra-domain `data_object_relationships`).** Depends on S1+S2 per the audit's cross-bucket dependencies.
- **B1-S6 (data_object aliases).** Depends on S1; audit gives candidate vendor terminology but does not pre-specify exact alias tuples per row.
- **B1-S8 (workflow-gate `trigger_events`).** Depends on S2 (states must exist before published-verb events can be authored).
- **B1-S9 (outbound cross-domain `data_object_relationships`).** Per task scope these are entity-to-entity cross-domain INSERTs (not user-edges per Rule #10); the audit itself says "Surface to user" for the load decision. Deferred.
- **B1-S10 (module-anchored system skills + tools).** Depends on S1; new skills/tools/skill_tools rows are new-entity authoring.
- **B1-S11 (H1 APQC tagging, handoff_processes).** Every PCF mapping in the B1-S11 table is flagged "needs PCF lookup at fix time", "possibly defer", or "confident L3 (after lookup)" - none are pre-resolved with a concrete `process_id`. Deferred per task rule (insert only when `handoff_id` + resolvable PCF pre-specified and verified).

### Post-load spot-check

- `https://tests.semantius.app/domain_map/trigger_events`
- `https://tests.semantius.app/domain_map/data_object_relationships`

No JWT-audience errors encountered.

## 2026-05-31, Audit

### Summary

- **Current footprint:** **0 `domain_modules` rows** for WEB-CONTOPS (`/domain_modules?domain_id=eq.128` returns `[]`; `/domain_module_host_domains?domain_id=eq.128` returns `[]`); 8 capabilities still all orphaned of any realizing module (`WCO-AUDIT`, `WCO-EDITORIAL`, `WCO-QUALITY`, `WCO-ACCESS`, `WCO-SEO-GOV`, `WCO-LINKS`, `WCO-CALENDAR`, `WCO-BRAND-VOICE`); 7 masters intact (`content_audits` 684, `web_content_inventory_records` 685, `accessibility_scan_findings` 686, `broken_link_findings` 687, `technical_seo_findings` 688, `brand_voice_violations` 689, `content_lifecycle_plans` 690), all 7 still at `role=master / necessity=required` in the legacy rollup only (0 `domain_module_data_objects` rows for the master set); 10 solutions (8 primary + 2 partial) unchanged; 2 BFD rows (Marketing owner, Software Engineering contributor); 0 `domain_regulations` rows; 7 `trigger_events` rows on the 7 masters with `event_category` now properly set (902 lifecycle, 903 signal, 904 signal, 905 signal, 906 signal, 907 threshold, 908 lifecycle) per the 2026-05-31 continuation fix; 6 outbound + 3 inbound cross-domain handoffs (9 total: 814, 815, 816, 817, 818, 819, 820, 837, 838), every single one still with NULL `source_domain_module_id` AND NULL `target_domain_module_id`; 0 intra-domain handoffs; 0 `data_object_lifecycle_states`; 0 `data_object_aliases`; **11 `users` edges now present** (relationship rows 1576-1586 from the 2026-05-31 continuation, all `data_object_id=748 users`, `owner_side=target`, `relationship_kind=reference`) covering owns / reviews / assignees / approves verbs across the 7 masters; 3 inbound cross-domain `data_object_relationships` from HCMS / DXP into WEB-CONTOPS masters (623, 624, 625) unchanged; 0 outbound cross-domain `data_object_relationships`; 0 intra-domain master-to-master `data_object_relationships`; 1 legacy domain-level system skill `web-contops-system` (id 120, `domain_module_id=NULL`) with 7 `query_*` tools (zero mutate / fetch / side_effect / compute / inbound); **2 `handoff_processes` rows now present** (818 -> 430 `Control delivered content` L3 agent_curated new; 819 -> 427 `Manage content infrastructure` L3 agent_curated new); 0 roles authored.
- **Vendor-surface basis:** carry-over from the 2026-05-30 audit (Siteimprove 478, Acquia Optimize 485, AudioEye 484, Conductor 481, Lumar 482, Acrolinx 480, GatherContent 479, Optimizely CMP 483). No re-derivation this pass since this is a structural Validate b1, not a market-surface re-run.
- **Bucket 1 (in-scope, agent fixable):** 9 items (down from 11; B1-S4 user edges and B1-S7 event_category fixes cleared in the 2026-05-31 continuation).
- **Bucket 2 (surface-for-user, judgment):** 4 items (B2-1 module split shape, B2-2 pattern flag re-eval, B2-3 catalog UX wording, B2-4 regulation linkage; all four still pending).
- **Bucket 3 (Phase 0 pending, speculative):** 7 items (unchanged from 2026-05-30).

Structural pass bands (current state):

- **A1 pass** (7/7 metadata fields populated, `crud_percentage=70`, `business_logic` non-empty, `min_org_size='20 s <500'`, `cost_band='$$$'`, `usa_market_size_usd_m=700`, `market_size_source_year=2024`).
- **A2 pass** (8 capabilities linked).
- **A3 pass** (10 solutions linked, all coverage_level set, 8 primary).
- **A4 hard fail** (`catalog_tagline=''`, `catalog_description=''`).
- **M1 / M2 / M4 / M5 / M6 / M8 hard fail** (zero modules; 8 capabilities orphaned; module-level UX vacuous).
- **M7 vacuous pass** (zero DMDOs to inspect catalog-wide for the 7 masters).
- **B5 hard fail** (zero `domain_module_data_objects` rows across all 7 masters; cascade of M1).
- **B7 pass** (11 user-edge rows on the 7 masters, Rule #10 satisfied for the actor edges the audit pre-specified; could still grow when lifecycle states author more transition approvers, but the floor is cleared).
- **B9 partial pass** (7/7 `event_category` populated and valid per Rule #13; coverage gap on state-change events remains pending lifecycle states - tracked as B1-S8).
- **B9b vacuous pass** (zero intra-domain handoffs; also zero modules to host them).
- **B10b hard fail** (9/9 cross-domain handoffs have NULL on BOTH `source_domain_module_id` AND `target_domain_module_id`; cascade of M1 on this side AND M1 on every counter-party side - DXP, HCMS, KMS).
- **B11 hard fail** (zero `data_object_aliases` across all 7 masters).
- **B12 hard fail** (zero `data_object_lifecycle_states` across all 7 masters; none are config-shape exempt).
- **C1 / C2 pass** (Marketing owner, Software Engineering contributor).
- **D - 2/9 handoffs tagged** (handoffs 818 and 819 carry agent_curated `handoff_processes` rows; remaining 7 handoffs are untagged; 0 approved).
- **E1-E5 vacuous pass** (no modules, no roles).
- **F1 / F2 / F3 hard fail** (1 legacy domain-level system skill, no module-anchored skill, only 7 query_* tools - zero mutate / workflow-gate / side_effect / compute / fetch / inbound).
- **F4 pass** (all 7 linked tools satisfy the `operation_kind` <-> `data_object_id` invariant).
- **F5 uncomputable** (F2 fails; Semantius score cannot be reported per-module).
- **H1 partial** (2/9 handoffs tagged at `record_status='new'`, 0 approved; 7 still untagged - all of these have proposed targets in the 2026-05-30 B1-S11 table but were deferred for PCF lookup at fix time).

### Bucket 1 - In-scope confirmed gaps

| ID | Band | Finding (current state) | Fix surface |
|---|---|---|---|
| B1-S1 | M1 / M2 / M4 / M5 / M6 / M8 hard fail | Zero `domain_modules` rows for domain 128. Cascades through M-band and into B5, B10b (this side), F2, F3. 8 capabilities orphaned. Proposed 3-module split (`WCO-AUDIT-COMPLIANCE`, `WCO-SEO-LINKS`, `WCO-EDITORIAL-PLANNING`) carried from 2026-05-30 still gated on B2-1. | Loader after B2-1 resolution; authors modules + `domain_module_capabilities` + `domain_module_data_objects` (master/embedded_master mix per the 2026-05-30 cross-module joiner mapping for `web_content_inventory_records`). |
| B1-S2 | B12 hard fail | Zero lifecycle states across all 7 masters. State machines pre-specified in 2026-05-30 audit (content_audits scheduled->running->completed->archived; web_content_inventory_records discovered->classified->in_review->retained->retired; accessibility_scan_findings detected->triaged->in_remediation->resolved->wont_fix->verified; broken_link_findings detected->in_remediation->resolved->ignored; technical_seo_findings detected->triaged->in_remediation->resolved->wont_fix; brand_voice_violations detected->in_review->accepted->dismissed; content_lifecycle_plans draft->active->review_due->revised->retired). Depends on B1-S1 for `domain_module_id` anchoring. | Focused loader after B1-S1; `requires_permission=true` on transition states; `domain_module_id` set per the realizing module from B1-S1. |
| B1-S3 | B4 hard fail | All 7 masters carry pattern flags `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false` with no positive re-evaluation recorded. Gated on B2-2. | PATCH on the masters once B2-2 answers land. Rule #15: no `notes` annotations. |
| B1-S5 | B6 hard fail | Zero intra-domain `data_object_relationships` between the 7 WEB-CONTOPS masters. 9-to-12 edges pre-specified in 2026-05-30 (content_audits scans / produces; web_content_inventory_records anchors; content_lifecycle_plans governs). Depends on B1-S1 + B1-S2. | Loader after B1-S2 lands. |
| B1-S6 | B11 hard fail | Zero `data_object_aliases` across all 7 masters. Vendor-terminology candidates pre-specified in 2026-05-30 (Siteimprove Site Audit, Lumar Crawl, axe-core Violation, Acrolinx Flag, etc.). Depends on B1-S1 for alias scoping. | Loader after B1-S1. |
| B1-S8 | B9 missing events | Workflow-gate state transitions (`accessibility_finding.resolved`, `broken_link.resolved`, `brand_violation.dismissed`, etc.) have no matching `trigger_events` rows. Depends on B1-S2 for the state catalog. | Loader after B1-S2; each row `event_category='state_change'`. |
| B1-S9 | B8 hard fail | Zero outbound cross-domain `data_object_relationships` from the 7 masters. 6 corresponding payload-target rows pre-specified in 2026-05-30 (`accessibility_scan_findings flags web_pages` 441; `brand_voice_violations flags content_entries` 132; `broken_link_findings flags content_entries` 132; `content_lifecycle_plans governs knowledge_articles`; `web_content_inventory_records informs knowledge_articles`; `technical_seo_findings flags web_pages` 441). KMS-side target identification still open. | Load the 4 cross-domain relationship rows whose target masters are confirmed (DXP 441, HCMS 132). Defer the 2 KMS-side rows. |
| B1-S10 | F1 / F2 / F3 hard fail | Legacy domain-level system skill `web-contops-system` (id 120, `domain_module_id=NULL`) with 7 query-only tools. Module-anchored system skill missing; mutate / workflow-gate / side_effect / fetch / inbound floor unmet. Depends on B1-S1 + B1-S2. | After B1-S1 lands, author one `skill_type='system'` skill per new module with `domain_module_id` set + 4-to-8 mixed tools per module. DELETE legacy skill 120 + its skill_tools once module-anchored skills ship (F1 cleanup). |
| B1-S11 | H1 partial | 7 of 9 cross-domain handoffs still untagged in `handoff_processes`. Handoff 818 (-> KMS, content_lifecycle.review_due) and handoff 819 (-> KMS, content_inventory.refreshed) now carry agent_curated rows (process_id 430, 427); the other 7 (814, 815, 816, 817, 820, 837, 838) require PCF lookup at fix time per the 2026-05-30 B1-S11 table. APQC TAGGING quality headline: 0 approved out of 9; process health: 2 agent_curated rows. | Per-handoff PCF lookup, then INSERT into `handoff_processes` as `(handoff_id, process_id, proposal_source='agent_curated', record_status='new')`. Defer handoffs with no clean PCF match (815, 820, 837 candidates from 2026-05-30) to Discover Pass 3. |

Bucket 1 finding-type rollup:

| Finding type | Count |
| --- | --- |
| MISSING | 0 in Bucket 1 (entity gaps route to Bucket 3 pending Phase 0) |
| WRONG-OWNERSHIP | 0 in Bucket 1 (routes to Bucket 3) |
| SCOPE-CREEP | 0 |
| STRUCTURAL (M / B / F bands) | 8 |
| BOUNDARY | 0 in Bucket 1 (all 9 NULL FK cases blocked by B1-S1 + counter-party M1) |
| APQC TAGGING | 1 (covers 7 deferred handoffs) |
| MODULARIZATION | 0 in Bucket 1 (routes to Bucket 2 / 3) |
| **Bucket 1 total** | **9** |

### Bucket 2 - Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-1 | **Module split shape.** The 2026-05-30 proposal of a 3-module split (`WCO-AUDIT-COMPLIANCE` + `WCO-SEO-LINKS` + `WCO-EDITORIAL-PLANNING`) carries forward. Alternatives: 2-module (findings vs editorial), 4-module (split accessibility specialist), or defer to Phase 0. | Module split is a design call the user owns and gates B1-S1 / S2 / S5 / S6 / S8 / S10. | (a) 3-module / (b) 2-module / (c) 4-module / (d) defer to Phase 0 (B3-6). |
| B2-2 | **Pattern flag positive re-evaluation** (B4). Which of `content_audits.has_submit_lock`, `accessibility_scan_findings.has_personal_content`, `accessibility_scan_findings.has_single_approver`, `technical_seo_findings.has_single_approver`, `brand_voice_violations.has_personal_content`, `content_lifecycle_plans.has_single_approver`, `web_content_inventory_records.has_personal_content` should flip to true? | Pattern-flag judgments are workflow-shape calls; false-by-default isn't a review signal. Rule #15 forbids `notes` annotations to explain the choice. | Per-flag yes / no answer. |
| B2-3 | **Catalog UX fields** (A4). `domains.catalog_tagline=''` and `domains.catalog_description=''`. M8 has no targets yet (no modules). | Rule #20: drafts must be surfaced before any write; user supplies / approves wording. | Approve draft once surfaced; supply alternative wording. |
| B2-4 | **Regulation linkage.** Zero `domain_regulations` rows. ADA (61) + Section 508 (62) exist; EAA absent from `regulations` catalog; GDPR cookie-consent edge an open question. | Regulation applicability calls and adding new `regulations` rows are user-scoped. | (a) link ADA + 508 only / (b) load EAA first then link all 3 / (c) include GDPR cookie-consent edge / (d) defer until B1-S1 lands so linkage is module-scoped. |

### Bucket 3 - Phase 0 pending (speculative)

Carry-over from the 2026-05-30 audit; no new candidates this pass and none retired.

| ID | Finding | Type | Vendor knowledge basis | Recommended verification |
|---|---|---|---|---|
| B3-1 | `editorial_tasks` / `editorial_briefs` - production-workflow substrate. | MISSING (2 entities) | GatherContent, Optimizely CMP, Skyword | Phase 0 vendor research. |
| B3-2 | `content_calendar_entries` - canonical calendar row distinct from `content_lifecycle_plans`. | MISSING (1 entity) | GatherContent, Optimizely CMP, ContentCal | Phase 0 verification. |
| B3-3 | `scanner_runs` / `scan_jobs` - orchestration substrate distinct from `content_audits`. | MISSING (1-2 entities) or refactor | Siteimprove, Acquia Optimize, AudioEye, Conductor, Lumar | Phase 0 verification. |
| B3-4 | `a11y_rules` / `seo_rules` / `brand_rules` - rule-catalog substrate. | MISSING (1-3 entities) | Siteimprove, Acrolinx, Acquia Optimize, axe-core | Phase 0 verification. |
| B3-5 | `content_redirects` / `redirect_rules` - URL-redirect master. | MISSING (1 entity) | Siteimprove, Acquia Optimize, Lumar | Phase 0 verification (vs DXP / HCMS ownership). |
| B3-6 | MODULARIZATION ratification of the 2 / 3 / 4 module split shape. | MODULARIZATION | All 8 flagships | Phase 0 subagent pass. |
| B3-7 | CMP (Content Marketing Platform) candidate domain - editorial workflow may belong in a separate market. | WRONG-OWNERSHIP (potential) + new domain candidate | Optimizely CMP, Skyword, ContentCal, NewsCred, Contently | Phase 0 + CMP triage decision. Queued in `audits/_missing-domains.md`. |

### Cross-bucket dependencies

- **B1-S1 still gates B1-S2 / S5 / S6 / S8 / S10** (modules need to exist before lifecycle states can be `domain_module_id`-anchored, intra-domain relationships are surfaced, aliases are scoped, workflow-gate events are authored, and module-anchored skills are authored).
- **B2-1 still gates B1-S1.** The 2 / 3 / 4 module split must be picked before any module loader runs.
- **B2-2 gates B1-S3** (pattern flag PATCHes need user answers).
- **B1-S11 (APQC TAGGING for remaining 7 handoffs) is independent** of every other Bucket 1 item; can ship immediately once PCF lookups are resolved.
- **B1-S9 (outbound cross-domain relationships) is independent** of B1-S1 for the 4 DXP / HCMS rows where target masters are confirmed; KMS-side rows depend on KMS audit progress.
- **Bucket 3 still informs B2-1** (B3-7 CMP promotion would shrink the WEB-CONTOPS editorial scope; B3-1 / B3-2 affect WCO-EDITORIAL-PLANNING shape).

### Per-bucket prompts

**Bucket 1 - fix these now?** Reply with `all`, list (e.g. `S9, S11`), or `skip`.

- S1 (modules): blocked on B2-1.
- S2 (lifecycle states): blocked on S1.
- S3 (pattern flags): blocked on B2-2.
- S5 (intra-domain relationships): blocked on S1 + S2.
- S6 (aliases): blocked on S1.
- S8 (workflow-gate events): blocked on S2.
- S9 (outbound cross-domain relationships, 4 mappable rows): independent.
- S10 (module-anchored skills + tools): blocked on S1.
- S11 (APQC TAGGING for 7 remaining handoffs): independent; needs PCF lookup at fix time.

**Bucket 2 - per-item answers?**

- B2-1: (a) 3-module / (b) 2-module / (c) 4-module / (d) defer to Phase 0.
- B2-2: per-flag yes / no for the 7 flags in B1-S3.
- B2-3: I'll draft proposed `catalog_tagline` and `catalog_description` for review before any PATCH (Rule #20).
- B2-4: (a) ADA + 508 only / (b) load EAA first / (c) include GDPR cookie-consent / (d) defer.

**Bucket 3 - vet via Phase 0 or eyeball-mode?**

The 2026-05-30 recommendation still stands: B3-1 (editorial_tasks / briefs) and B3-3 (scanner_runs) are the highest-leverage candidates and land in their respective modules regardless of B2-1 shape. Recommend formal Phase 0 before committing to B2-1.

### Report-only follow-ups (owed by other domains)

Unchanged from 2026-05-30:

| Owed by | Check | Detail |
|---|---|---|
| DXP | B10b (source + target on 2 handoffs each direction) | 814 / 838 source side; 815 / 820 target side. Blocked by DXP M1. |
| DXP | B8 inbound mirror | DXP's own B1-S9 still owes the reverse-direction rows. |
| HCMS | B10b (source + target) | 837 source side; 816 / 817 target side. |
| KMS | B10b + DMDO + B8 inbound mirror | 818 / 819 target side; KMS has no consumer DMDO on `content_lifecycle_plans` or `web_content_inventory_records` and owes the inbound B8 rows. |

### Post-load spot-check

- `https://tests.semantius.app/domain_map/domain_modules`
- `https://tests.semantius.app/domain_map/data_object_lifecycle_states`
- `https://tests.semantius.app/domain_map/handoff_processes`

No JWT-audience errors encountered during this audit run.

## 2026-06-02 Audit (modularization)

### Summary

WEB-CONTOPS was modularized from 0 modules to a 4-module `full` set. This resolves the M1 / M2 / M4 / M5 / M6 / M8 cascade that had blocked the domain since 2026-05-30 and supersedes the standing B2-1 user decision (the 3-module proposal in `WCO-AUDIT-COMPLIANCE` / `WCO-SEO-LINKS` / `WCO-EDITORIAL-PLANNING`). An eyeball-mode 4-module split was authored instead, aligned to the four distinct buyer surfaces in the vendor field (full-estate audit / inventory, editorial production and planning, quality-and-accessibility scanning, technical SEO and link governance). Scope of this pass: `domain_modules` + capability links + data_object assignment ONLY. No new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships were created; those remain open per the b1b items carried forward.

### Module set authored

| id | code | module_kind | capabilities | masters |
|---|---|---|---|---|
| 317 | WEB-CONTOPS-AUDIT-INVENTORY | full | 155 (WCO-AUDIT) | 684 content_audits, 685 web_content_inventory_records |
| 318 | WEB-CONTOPS-EDITORIAL-PLANNING | full | 156 (WCO-EDITORIAL), 161 (WCO-CALENDAR) | 690 content_lifecycle_plans |
| 319 | WEB-CONTOPS-QUALITY-ACCESS | full | 157 (WCO-QUALITY), 158 (WCO-ACCESS), 162 (WCO-BRAND-VOICE) | 686 accessibility_scan_findings, 689 brand_voice_violations |
| 320 | WEB-CONTOPS-SEO-LINKS | full | 159 (WCO-SEO-GOV), 160 (WCO-LINKS) | 688 technical_seo_findings, 687 broken_link_findings |

Loader: [.tmp_deploy/modularize_web_contops_2026-06-02.ts](../../.tmp_deploy/modularize_web_contops_2026-06-02.ts) (idempotent, safe to re-run).

### Design rationale (departure from the 3-module proposal)

- The 2026-05-30 audit proposed `web_content_inventory_records` (685) as a cross-module joiner: `master` on `WCO-SEO-LINKS`, `embedded_master` on the other two. This pass instead masters 685 cleanly in `WEB-CONTOPS-AUDIT-INVENTORY` alongside `content_audits` (684), because the inventory record is the output of the audit / crawl rather than of the SEO surface. No `embedded_master` is required: every master sits in exactly one module, and the catalog-wide pre-check confirmed none of the 7 are mastered elsewhere, so no demotion was needed.
- The 3-module proposal folded WCO-QUALITY + WCO-ACCESS + WCO-BRAND-VOICE into a single `WCO-AUDIT-COMPLIANCE` module sharing the audit run. The 4-module split separates the audit / inventory surface (the crawl that enumerates the estate) from the scanning surface (the findings the scan produces). This keeps `content_audits` (the run boundary) and `web_content_inventory_records` (the page-level estate) in one module while the two finding masters that share a remediation-queue workflow (`accessibility_scan_findings`, `brand_voice_violations`) sit together in `WEB-CONTOPS-QUALITY-ACCESS`, and the two crawl-derived technical masters (`technical_seo_findings`, `broken_link_findings`) sit together in `WEB-CONTOPS-SEO-LINKS`.

### Structural verification (post-load)

- M1 / M2: 4 `full` modules for domain 128 (was 0). Rule #14 satisfied (8 capabilities so >=2 full modules required; 4 authored).
- M4 / M6: all 8 capabilities placed in exactly one module each; no orphaned capability; every module carries >=1 capability.
- M7 (single-master, in-domain AND catalog-wide): each of the 7 masters appears as `role=master` in exactly one module. Catalog-wide re-check `/domain_module_data_objects?data_object_id=in.(684..690)&role=eq.master` returns exactly 7 rows, all in domain 128 modules.
- No empty module: every module has >=1 capability and >=1 DMDO row.
- Existing role+necessity preserved: all 7 masters retained `role=master / necessity=required` from the legacy `domain_data_objects` rollup. No promotions or demotions.

### Not done this pass (carried forward as b1b)

The following remain open and are now unblocked by the module set landing: lifecycle states for the 7 masters (was B1B-S2), intra-domain master-to-master relationships (was B1B-S5), aliases (was B1B-S6), workflow-gate `trigger_events` (was B1B-S8), and module-anchored system skills + tools with deletion of legacy domain-level skill 120 (was B1B-S10). Per Rule #17 each of the 4 new modules now needs exactly one `skill_type='system'` skill with `domain_module_id` set; none exist yet (F2 still fails). The B8 outbound cross-domain relationship rows (was B1B-S1's sibling B1A-S9) and the catalog UX fields (`catalog_tagline` / `catalog_description` at both domain and module level, M8 / A4) are also still open.

### Post-load spot-check

- `https://tests.semantius.app/domain_map/domain_modules?domain_id=eq.128`
- `https://tests.semantius.app/domain_map/domain_module_data_objects`
- `https://tests.semantius.app/domain_map/domain_module_capabilities`

No JWT-audience errors encountered during this audit run.
