# HAM audit history

## 2026-05-30 — Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 2 full modules (`HAM-ASSET-REGISTRY` id 169, `HAM-WARRANTY-PARTS` id 170) + 1 starter (`HVAC-SVC-MGMT` id 171, hosted via `domain_module_host_domains`). 5 masters (`hardware_assets` 56, `hardware_models` 695, `hardware_warranties` 696, `hardware_disposal_records` 697, `spare_parts_inventory` 698). 5 capabilities (HAM-DISCOVERY, HAM-LIFECYCLE, HAM-FINANCIAL, HAM-WARRANTY, HAM-DISPOSAL). 14 solutions (2 primary, 9 secondary, 3 partial). 9 trigger_events on HAM masters. 6 outbound + 6 inbound cross-domain handoffs. 10 aliases. **0 lifecycle states across all 5 masters.** 1 legacy domain-level system skill (id 65 `ham-system`, 5 query tools, all platform tier). HVAC starter has 1 system skill (id 236, 23 platform-tier tools, strict score 100%). **0 roles** touching the two full modules. 3 `business_function_domains` (Procurement, Finance contributors; ITAM owner). 0 `domain_regulations` rows.
- **Vendor-surface basis (Pass 2):** ServiceNow Hardware Asset Management, Lansweeper, Flexera One IT Asset Management, NinjaOne Endpoint Management, Snipe-IT (open-source).
- **Bucket 1 (in-scope, agent fixable):** 14 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 10 items.

**Neighbor discovery (Pass 3) — auto-derived from handoffs + cross-domain DMDO + cross-domain `data_object_relationships`, ranked by edge weight:**

| Neighbor | Out | In | DMDO consumer/embedded | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| S2P | 2 | 0 | 0 | 2 | 4 | Pairwise (full) |
| RMM | 1 | 1 | 0 | 1 | 3 | Pairwise (full) |
| MSP-PSA | 0 | 1 | 2 (hardware_assets consumer in MSP-PSA-SVC-DESK, MSP-PSA-DISPATCH) | 0 | 3 | Pairwise (full) |
| ITAM | 0 | 1 | 0 | 1 | 2 | Lightweight |
| GRC | 1 | 0 | 0 | 1 | 2 | Lightweight |
| FIN | 1 | 0 | 0 | 1 | 2 | Lightweight |
| SPM | 1 | 0 | 0 | 1 | 2 | Lightweight |
| DISCOVERY | 0 | 2 | 0 | 0 | 2 | Lightweight |
| CMDB | 0 | 0 | 1 (hardware_assets contributor in CMDB-CORE) | 0 | 1 | Lightweight |
| ONBOARDING | 0 | 0 | 1 (hardware_assets consumer in ONB-JOURNEY-MGMT) | 0 | 1 | Lightweight |
| UEM | 0 | 1 | 0 | 0 | 1 | Lightweight |
| FSM | 0 | 0 | 1 (hardware_assets embedded_master in FSM-DISPATCH-OPS) | 0 | 1 | Lightweight |

Structural pass bands: A / C pass; **B9b hard-fails** (zero intra-domain cross-module handoffs); **B10b hard-fails** (6/6 outbound + 6/6 inbound handoffs carry NULL module FKs); **B12 hard-fails** (zero lifecycle states across all 5 masters); **F2 hard-fails** (zero system skills on HAM-ASSET-REGISTRY and HAM-WARRANTY-PARTS); **E1 hard-fails** (zero roles touching the two full modules); **H1 hard-fails** (2/12 cross-domain handoffs tagged, both `discovery_substring` at L1 root; zero `agent_curated`); trigger_events.event_category invalid on 6 events; one mis-attributed trigger_event (140 `ticket.created` keyed on hardware_assets); one duplicate trigger_event pair (44 vs 60 same shape on hardware_assets); one structurally suspect outbound handoff (150 publishes `asset.retired` whose event data_object is rmm_agents, not a HAM master); one legacy domain-level system skill (id 65) still present but transitionally tolerated until module-level skills land.

Domain Semantius score: **uncomputable for HAM-ASSET-REGISTRY and HAM-WARRANTY-PARTS** (F5 blocked by F2). HVAC starter strict score = 100% (23 platform / 23 total).

The dominant pairwise finding: every HAM-target domain (S2P, RMM, GRC, FIN, SPM, MSP-PSA, DISCOVERY, UEM, ITAM) leaves the HAM-side module FK NULL on every cross-domain handoff. Symmetrically, every HAM-receiving domain produces inbound handoffs without source-side module attribution. Both sides need B10b fixes; HAM owns its own outbound `source_domain_module_id` backfill (S5 below), the inbound `target_domain_module_id` backfill is also HAM-owed because HAM is the target.

### Bucket 1 — In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **B12 (hard fail)** | **Zero `data_object_lifecycle_states` rows across all 5 HAM masters.** Per Rule #12 every `master + necessity=required` data_object must have lifecycle states OR a config-shape exemption. All five HAM masters carry workflow: `hardware_assets` (procured → received → deployed → in_use → in_repair → retired → disposed), `hardware_models` (drafted → active → eol_announced → retired), `hardware_warranties` (active → expiring → expired → renewed), `hardware_disposal_records` (initiated → sanitized → certified → completed), `spare_parts_inventory` (in_stock → low_threshold → reordered → received → consumed). None are config-shaped; all need states. Without states the H-band permission materialization is hollowed: HAM-ASSET-REGISTRY and HAM-WARRANTY-PARTS will ship with only baseline tiers, no workflow-gate permissions. | Author state machines per master with `requires_permission=true` on the gates (deploy, retire, dispose, certify_sanitization, approve_warranty_renewal, threshold_breach_acknowledge), `permission_verb_override` for non-obvious verbs (`retired → retire_hardware_asset`, `disposed → dispose_hardware_asset`, `certified → certify_disposal_sanitization`), `domain_module_id` per Rule #14 (states on 56/695 → module 169; states on 696/697/698 → module 170). Load via a focused loader; pattern from any ATS or ITSM lifecycle loader. |
| B1-S2 | **F2 (hard fail)** | **HAM-ASSET-REGISTRY (169) and HAM-WARRANTY-PARTS (170) have zero `skill_type='system'` skills.** Rule #17 requires exactly one system skill per `domain_modules` row. The legacy domain-level skill `ham-system` (id 65, `domain_id=51`, `domain_module_id=null`, 5 platform-tier query tools) is the pre-modular shell and does not satisfy F2 for the modules. F5 (Semantius score) is uncomputable for both modules until F2 is cured. | Author 2 system skills: `ham_asset_registry_agent` (`domain_module_id=169`) covering hardware_assets, hardware_models discovery + lifecycle + financial workflow; `ham_warranty_parts_agent` (`domain_module_id=170`) covering hardware_warranties + hardware_disposal_records + spare_parts_inventory workflow. Each skill links ≥1 `skill_tools` row with `requirement_level=required` floor of ≥3 (query + mutate + workflow-gate). Reuse existing platform-tier `query_*` / `create_*` / `update_*` tools where present, add the missing workflow-gate mutates (`deploy_hardware_asset`, `retire_hardware_asset`, `dispose_hardware_asset`, `certify_disposal_sanitization`, `approve_warranty_renewal`, `acknowledge_low_stock_threshold`) once B1-S1 states exist. Phase S loader pattern. |
| B1-S3 | **F1 (transitional)** | Legacy domain-level system skill `ham-system` (id 65, `domain_id=51`, `domain_module_id=null`) is still present. F1 is transitionally tolerated only while no module-level system skill exists for the domain. Once B1-S2 authors the two module-level skills, the legacy row becomes obsolete. | DELETE skill id 65 + its 5 `skill_tools` rows AFTER B1-S2 lands. Sequencing matters: never delete the legacy first (creates a window where the catalog has zero system skill for HAM). |
| B1-S4 | **B9 event_category invalid** | 6 `trigger_events` on HAM masters carry empty `event_category` (Rule #13 enum must be `lifecycle / state_change / threshold / signal`): 682 `hardware_model.added` (lifecycle), 683 `hardware_model.eol_announced` (state_change), 684 `hardware_warranty.expiring` (threshold), 685 `hardware_warranty.expired` (state_change), 686 `hardware_disposal_record.completed` (state_change), 687 `spare_parts_inventory.low_threshold` (threshold). | PATCH `trigger_events.event_category` per the proposed values above. Trivial; one PATCH each. |
| B1-S5 | **B9 mis-attributed event** | Trigger event 140 `ticket.created` has `data_object_id=56` (hardware_assets). `ticket.created` is conceptually a service-ticket event (mastered in ITSM / MSP-PSA), not a hardware-asset state change. Inbound handoff 161 (MSP-PSA → HAM) references this event with payload `hardware_assets`, but the event's source-side data_object is wrong. Either (a) the event should be renamed and re-keyed against the correct source (likely a MSP-PSA service ticket), with handoff 161's `trigger_event_id` re-pointed; or (b) the event is a duplicate of a MSP-PSA-owned event and should be deleted with handoff 161 re-pointed at the canonical one. | Investigate the source-side master: query `/trigger_events?event_name=eq.ticket.created&select=id,data_object_id` catalog-wide; pick the canonical one and re-target handoff 161. If the canonical owner doesn't exist, that's a separate MSP-PSA / ITSM B9 gap. |
| B1-S6 | **B9 duplicate event** | Trigger events 44 `device.discovered` (event_category=signal) and 60 `hardware_endpoint.discovered` (event_category=signal) both carry `data_object_id=56` with near-identical descriptions ("Fired when a Hardware Asset is discovered. Publisher domain owns the state transition; subscribers may react by creating downstream artifacts."). They are duplicates. Also: `event_category=signal` is questionable on a discovery event (should be `state_change` or `lifecycle` since discovery materializes a new asset). | Pick one canonical event (recommendation: 44 `device.discovered`, the older / shorter name), re-point inbound handoffs 32 (DISCOVERY → HAM) and 144 (RMM → HAM) at it, then DELETE event 60. PATCH `event_category` on 44 from `signal` to `state_change`. |
| B1-S7 | **B9b (hard fail)** | **Zero intra-domain cross-module `handoffs` rows for HAM** despite 2 full modules with obvious cross-module lifecycle progressions. Expected pairs from cross-module `data_object_relationships`: hardware_assets (169) → hardware_warranties (170) [warranty registration on deployment]; hardware_assets (169) → hardware_disposal_records (170) [disposal on retirement]; hardware_assets (169) ↔ spare_parts_inventory (170) [parts consumption + reorder]; hardware_models (169) → spare_parts_inventory (170) [stock model compatibility update]. | Author 4 intra-domain handoff rows with `source_domain_id=target_domain_id=51`, `integration_pattern='lifecycle_progression'`, `friction_level='low'`: (a) 169 → 170 on `hardware_asset.deployed` payload `hardware_warranties` (warranty registration); (b) 169 → 170 on `hardware_asset.retired` payload `hardware_disposal_records` (disposal initiation); (c) 170 → 169 on `spare_parts_inventory.low_threshold` payload `hardware_models` (model-level supply visibility for refresh planning); (d) 169 → 170 on `hardware_model.eol_announced` payload `spare_parts_inventory` (parts stockpile decision). |
| B1-S8 | **B10b own-side (hard fail)** | **6/6 outbound handoffs from HAM carry NULL `source_domain_module_id`.** Per B10b's source-side derivation rule: `source_domain_module_id` = the HAM module that holds `trigger_events.data_object_id` with the strongest role. Derived attribution: handoff 668 (spare_parts.low_threshold) → 170; handoff 669 (warranty.expiring) → 170; handoff 670 (disposal.completed → FIN) → 170; handoff 671 (disposal.completed → GRC) → 170; handoff 672 (model.eol_announced → SPM) → 169; handoff 150 (asset.retired → RMM) is **structurally suspect** because its `trigger_event_id=9` carries `event_name='asset.retired'` with `data_object_id=223` (rmm_agents, NOT a HAM master), so the source attribution defaults to NULL — see B1-S9. | PATCH outbound rows 668/669/670/671/672 with the attributions above. Handoff 150 needs upstream cleanup (B1-S9) before its `source_domain_module_id` can be derived. |
| B1-S9 | **B9/B10b own-side (structural defect on handoff 150)** | Handoff 150 (HAM → RMM, friction=high) is wired to trigger event 9 (`asset.retired`, `data_object_id=223 → rmm_agents`). HAM does not master `rmm_agents`. The intent of this handoff is "when a HAM hardware_asset retires, RMM should unenroll its RMM agent." That belongs on a HAM-owned event `hardware_asset.retired` (target data_object 56), not on an RMM-owned event. Today the row is mis-attributed at source: HAM publishing an event whose source-side master is owned by RMM. | Author a new `trigger_events` row `hardware_asset.retired` with `data_object_id=56`, `event_category='state_change'`. Re-point handoff 150's `trigger_event_id` to the new event. Then PATCH `source_domain_module_id=169` per B1-S8. The legacy event 9 stays as RMM's own (it's a real RMM lifecycle event with its own subscribers); the issue is only that HAM was attached to it. |
| B1-S10 | **B10b own-side (hard fail)** | **6/6 inbound handoffs to HAM carry NULL `target_domain_module_id`.** HAM is the target side here; the fix is HAM's own. Per B10b's target-side derivation: `target_domain_module_id` = the HAM module that holds the handoff's payload `data_object_id` with the strongest role. Derived attribution: handoff 32 (DISCOVERY → HAM, payload hardware_assets) → 169; handoff 144 (RMM → HAM, payload hardware_assets) → 169; handoff 161 (MSP-PSA → HAM, payload hardware_assets) → 169 (also see B1-S5 mis-attributed source event); handoff 633 (ITAM → HAM, payload asset_lifecycle_events) → **ambiguous**, HAM doesn't model `asset_lifecycle_events` as a DMDO (it's mastered by ITAM-LIFECYCLE). The intent is that asset_lifecycle_events with `kind=retired_for_disposal` initiate a HAM disposal record, so the receiving HAM module is 170 (HAM-WARRANTY-PARTS). Either backfill `target_domain_module_id=170` or add a `consumer` DMDO on 170 for `asset_lifecycle_events` first. Recommendation: backfill the FK; the consumer DMDO is a Bucket 2 modeling decision. Handoff 622 (DISCOVERY → HAM, payload `discovery_scans`) and 657 (UEM → HAM, payload `enrolled_devices`) are **structurally suspect** — HAM doesn't model `discovery_scans` or `enrolled_devices` as DMDO targets at all. Either HAM adds consumer DMDO rows (decision deferred to Bucket 2) or the handoffs are mis-routed to HAM. | PATCH handoffs 32, 144, 161, 633 → `target_domain_module_id=169` (or 170 for 633). Defer 622 and 657 to Bucket 2 pending a modeling decision. |
| B1-S11 | **B7 user-edge naming consistency** | All 6 `users → HAM masters` rows carry noun-phrase `relationship_verb` values ("assigned hardware", "custodian of assets", "recorded disposals", "manages warranties", "manages stock", "curates models"). Catalog convention per the APM audit's B7 fix is verb-shape form (`assigned_to_hardware_asset`, `owns_hardware_asset`, etc.). Two of the six (256 "assigned hardware" + 257 "custodian of assets") are functionally duplicate edges on the same pair (users → hardware_assets) with similar verbs — possibly intentional (assignee vs custodian are different actors) but the verb-shape rewrite should clarify whether both belong. | PATCH the 6 `relationship_verb` values to verb-shape (e.g. `is_assigned_to_hardware_asset`, `is_custodian_of_hardware_asset`, `records_hardware_disposal_record`, `manages_hardware_warranty`, `manages_spare_parts_inventory`, `curates_hardware_model`). Decide whether rows 256 + 257 are both needed or whether the catalog wants a single `owns_hardware_asset` (Bucket 2). |
| B1-S12 | **Rule #15 violation on handoffs.notes** | Handoff 633 (ITAM → HAM) carries `notes='target NULL until HAM is modularized'`. HAM is now modularized (modules 169/170 exist). The note's stated condition is satisfied. Per Rule #15 the prior write-time license for this exact pattern was rescinded; the note shouldn't have been authored in the first place. The audit obligation under Rule #15 is to revert the polluting write. | PATCH `handoffs.notes` to empty string on handoff 633. Also append an entry to `references/skill-changelog.md` Incidents recording the violation (one line: row id, column, original text, the rescinded passage that licensed it). |
| B1-S13 | **E1 (hard fail)** | **Zero roles touching HAM-ASSET-REGISTRY (169) or HAM-WARRANTY-PARTS (170).** Multi-module domain → ≥3 roles required (typical 3-5 for tightly-scoped). The candidate role list from market practice: `IT-ITAM-ASSET-MANAGER` (touches 169 + 170, primary), `IT-ITAM-ASSET-OWNER` (touches 169 + relevant FSM/ITSM consumer modules, primary on 169), `IT-ITAM-DISPOSAL-COORDINATOR` (touches 170 + GRC + FIN consumer modules, primary on 170), `PROCUREMENT-HARDWARE-BUYER` (touches 170 + S2P modules, secondary on 170), `FINANCE-FIXED-ASSET-ACCOUNTANT` (touches 170 + FIN modules, secondary on 170). Each role authored function-scoped under the role-naming rule, with `business_function_id` per the function spine (ITAM, Procurement, Finance), `role_modules` ≥2 per Rule "2-module floor", `role_permissions` bundle with tier-level + workflow-gate grants. Gates depend on B1-S1 lifecycle states existing first. | Hand-author the 3-5 roles with `role_modules` and `role_permissions` rows; load via a focused loader after B1-S1 (states) and B1-S2 (skills) land. Sequencing: states → skill+tools → permissions → roles. |

#### APQC TAGGING

Of HAM's 12 cross-domain handoffs (6 outbound + 6 inbound), only 2 have `handoff_processes` rows: handoff 150 → process 10 ("Acquire, Construct, and Manage Assets", L1 root, external_id 19207) and handoff 633 → same process 10, both `proposal_source='discovery_substring'`, `record_status='new'`. The L1 root is a coverage placeholder, not a meaningful PCF activity classification. Volume expectation per SKILL: 0.5N to 0.8N where N=12 → 6-10 `agent_curated` tags from this audit. The 2 existing `discovery_substring` rows are weak fits and should be REPLACED by the targeted tags below per Discover Pass 1.5 (human/agent curated overrides discovery_substring).

PCF candidates I'm proposing here are drawn directly from live `/processes` lookups (filter `source_framework=eq.apqc_pcf_cross_industry`):

| handoff_id | source → target | trigger_event | payload | Proposed PCF (process_name / external_id) | PCF id | Confidence |
|---|---|---|---|---|---|---|
| 150 | HAM → RMM | (currently event 9 `asset.retired`; will become `hardware_asset.retired` after B1-S9) | rmm_agents (defect; should be hardware_assets after fix) | Manage asset end-of-life (21576 L2) — verify against L3 children once available | 68 | confident L2; **replace** existing `discovery_substring` row pointing at 19207 L1 |
| 668 | HAM-WARRANTY-PARTS → S2P | `spare_parts_inventory.low_threshold` | spare_parts_inventory | Manage raw material inventory (10310 L4) OR Establish inventory management constraints (10268 L4) | 826 or 784 | confident L4; suggest 826 |
| 669 | HAM-WARRANTY-PARTS → S2P | `hardware_warranty.expiring` | hardware_warranties | Process warranty claims (12669 L3) — vendor-warranty renewal is the upstream of claim handling | 201 | confident L3 |
| 670 | HAM-WARRANTY-PARTS → FIN | `hardware_disposal_record.completed` | hardware_disposal_records | Process and record fixed-asset additions and retires (10830 L4) | 1389 | confident L4 |
| 671 | HAM-WARRANTY-PARTS → GRC | `hardware_disposal_record.completed` | hardware_disposal_records | Manage disposition, disposal, reprocessing activities (12186 L4) — closest cross-industry PCF; the data-sanitization compliance angle is closer than the fixed-asset accounting one | 1573 | confident L4 |
| 672 | HAM-ASSET-REGISTRY → SPM | `hardware_model.eol_announced` | hardware_models | Monitor useful life of assets (18592 L4) | 1561 | confident L4 |
| 32 | DISCOVERY → HAM | `device.discovered` (after B1-S6 consolidation) | hardware_assets | Maintain IT asset records (20918 L4) | 1312 | confident L4 |
| 144 | RMM → HAM | `hardware_endpoint.discovered` (currently; will fold into 44 per B1-S6) | hardware_assets | Maintain IT asset records (20918 L4) | 1312 | confident L4 |
| 161 | MSP-PSA → HAM | `ticket.created` (mis-attributed per B1-S5; defer until cleanup) | hardware_assets | defer until B1-S5 resolves the source event | — | defer |
| 622 | DISCOVERY → HAM | `discovery_scan.completed` | discovery_scans | Perform discovery research (10065 L3) — note that HAM not modeling discovery_scans as DMDO is a separate gap (B1-S10 / Bucket 2) | 116 | confident L3 (route to L3; modeling gap is orthogonal) |
| 633 | ITAM → HAM | `asset.retired_for_disposal` | asset_lifecycle_events | Decommission productive assets (19258 L3) — **replace** existing `discovery_substring` row pointing at 19207 L1 | 355 | confident L3 |
| 657 | UEM → HAM | `enrolled_device.retired` | enrolled_devices | Manage asset end-of-life (21576 L2) — defer to Bucket 2 because the mis-routing question (does UEM → HAM make sense?) needs to settle first | 68 | confident L2 conditional |

Deferred (not enough information yet, route to Discover Pass 3 / Bucket 2):
- handoff 161 — depends on B1-S5 source-event resolution.
- handoff 657 — depends on Bucket 2 decision about UEM → HAM mis-routing.

Net APQC proposals: **10 confident `agent_curated` proposals** + 2 deferred. The 2 existing `discovery_substring` rows on handoffs 150 and 633 should be replaced (DELETE old + INSERT new) per the Discover Pass 1.5 override convention.

#### Bucket 1 finding-type breakdown

Per constraint #10 (APQC TAGGING is ONE Bucket 1 item even when it proposes many tags):

| Finding type | Count |
|---|---|
| STRUCTURAL (B12 / F2 / F1 transitional / B9 event_category / B9 mis-attributed / B9 duplicate / B9b / B10b own-side ×2 / B7 / Rule #15 revert / E1) — B1-S1 through B1-S13 | 13 |
| APQC TAGGING (B1-H1) — 10 confident agent_curated proposals + 2 deferred + 2 discovery_substring replacements, counted as 1 item | 1 |
| **Bucket 1 total** | **14** |

### Bucket 2 — Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **B4 pattern flags positive re-evaluation per Rule #12.** All 5 HAM masters currently have all three flags (`has_personal_content`, `has_submit_lock`, `has_single_approver`) at `false`. Candidates to flip: `hardware_disposal_records.has_submit_lock=true` (chain of custody freezes once disposal certificate is issued); `hardware_disposal_records.has_single_approver=true` (asset disposition officer signs off); `hardware_assets.has_personal_content=true` (assignment carries employee identity / location of last custodian; on disposal the record carries serial + MAC + last user); `hardware_warranties.has_submit_lock=true` (signed warranty contract); the other masters likely stay false. Per Rule #15 the rationale for each flag MUST NOT go in `notes` — record decisions in this audit file. | Pattern flags are workflow-shape judgments the user owns. Default false is not the same as false-after-review. | Per-flag yes/no per master. |
| B2-S2 | **Handoff 622 `discovery_scan.completed` from DISCOVERY → HAM (payload `discovery_scans`).** HAM does not model `discovery_scans` as a DMDO consumer on any module. Either (a) ADD a consumer DMDO row on 169 for `discovery_scans` (necessity=optional, role=consumer) so the consumption is captured catalog-wide, or (b) accept the handoff is mis-routed: discovery_scan completion is a DISCOVERY internal event whose downstream consumers are CMDB / SAM / HAM via the individual `discovered` payloads, not via the scan record itself; in that case DELETE handoff 622. | Modeling decision (is the scan record itself a HAM concept) the user owns. | (a) Add consumer DMDO row. (b) DELETE the handoff. (c) Keep as-is and defer to a Phase 0 follow-up. |
| B2-S3 | **Handoff 657 `enrolled_device.retired` from UEM → HAM (payload `enrolled_devices`).** UEM masters `enrolled_devices`; HAM masters `hardware_assets`. The UEM enrolled-device record is a separate entity that often points at the same physical device as a HAM asset. The handoff implies that when UEM retires an enrolled device, HAM should retire the underlying hardware asset, but the canonical source-of-truth direction in the IT-ops cluster is usually the opposite (HAM owns the asset lifecycle; UEM follows). Either (a) ACCEPT the bidirectional pattern (UEM retirement IS the trigger when an asset was UEM-only-managed and never independently registered in HAM), (b) DELETE the handoff as mis-routed, (c) FLIP the direction (HAM → UEM on `hardware_asset.retired`). | This is an IT-ops cluster modeling decision touching the larger HAM/UEM/MDM-EMM cluster reconciliation conversation. | (a) Keep. (b) DELETE. (c) FLIP direction (and author the corresponding HAM → UEM handoff). |
| B2-S4 | **Are users edges 256 (`assigned hardware`) and 257 (`custodian of assets`) intentionally distinct, or should they collapse to one `owns_hardware_asset` verb?** Same pair (users → hardware_assets), slightly different semantics: assigned-to (current end-user holder) vs custodian (the IT staff member who manages the asset on behalf of an owner). Some catalogs model both; others collapse. | Naming and cardinality decision. | (a) Keep both; rewrite to verb-shape `is_assigned_to_hardware_asset` + `is_custodian_of_hardware_asset` (per B1-S11). (b) Collapse to one `owns_hardware_asset`; DELETE the other. (c) Keep both AND add a third for `is_approver_for_hardware_asset_disposal` (matches the disposal-officer role on disposal records). |
| B2-S5 | **`asset_lifecycle_events` consumer DMDO on HAM-WARRANTY-PARTS (170).** Handoff 633 (ITAM → HAM) implies HAM consumes `asset_lifecycle_events` to trigger disposal flow. Today HAM has no DMDO on `asset_lifecycle_events`. Either (a) add `consumer + necessity=optional` on 170 (captures the dependency, mirrors B10's discovery procedure for inbound), or (b) accept that HAM's disposal trigger is internal (asset.retired self-triggers in 169 → 170) and the ITAM handoff is a side-channel that doesn't warrant DMDO modeling. | DMDO modeling decision; affects pairwise reconciliation cleanliness. | (a) Add consumer DMDO. (b) Accept side-channel only. |
| B2-S6 | **`domain_regulations` is empty for HAM.** Hardware disposal involves real statutory frameworks: RoHS (EU 2011/65/EU) restricting hazardous substances, WEEE (EU 2012/19/EU) governing e-waste, NIST SP 800-88 r1 (US guideline for media sanitization), GDPR Art 17 (right to erasure of personal data on retired devices that held it), HIPAA (where retired devices held PHI), R2v3 and e-Stewards (US recycler certifications). Should these be linked via `domain_regulations`? Each row requires looking up the regulation in `/regulations` first (and creating it if absent — a separate decision per regulation). | Compliance scoping is the user's call; the catalog can be aggressive (link all 6) or conservative (link RoHS + WEEE + NIST 800-88 only as the universally-applicable subset). | (a) Conservative: link RoHS, WEEE, NIST 800-88 only. (b) Comprehensive: link all 6. (c) Defer pending the Bucket 3 ITAD market candidate triage. |

### Bucket 3 — Phase 0 pending (speculative)

Market-audit semantic pass against ServiceNow Hardware Asset Management, Lansweeper, Flexera One IT Asset Management, NinjaOne Endpoint Management, and Snipe-IT (open-source) suggests the following gaps. These are inferred from my knowledge of the flagship products' surfaces, NOT from a formal Phase 0 subagent pass against vendor docs; they are candidates, not vetted gaps.

#### MISSING (10) — proposed module assignment

| Entity | Proposed module | Vendor knowledge basis | Rationale |
|---|---|---|---|
| `asset_categories` | HAM-ASSET-REGISTRY | All five flagships | Asset taxonomy (laptop, desktop, monitor, server, network, mobile, peripheral). Today `hardware_models` carries an implicit type but no category master. |
| `asset_assignments` | HAM-ASSET-REGISTRY | ServiceNow, Snipe-IT, Lansweeper | Time-bounded user-to-asset assignment record (vs the relationship row, which is a current-state edge). Enables history queries: who had laptop X in Q2 2024? |
| `asset_movements` | HAM-ASSET-REGISTRY | ServiceNow, Flexera, Snipe-IT | Chain-of-custody log: location changes, custodian handoffs, RMA shipments. Distinct from assignments. |
| `stock_rooms` | HAM-WARRANTY-PARTS | All five flagships | Warehouse / stockroom locations for spare_parts_inventory. Today `spare_parts_inventory` carries implicit location but no master. |
| `depreciation_schedules` | HAM-ASSET-REGISTRY | ServiceNow, Flexera | Per-asset financial depreciation curve (linear, declining-balance) tied to fixed-asset accounting. The HAM-FINANCIAL capability has no backing master. |
| `consumables` | HAM-WARRANTY-PARTS | Lansweeper, ServiceNow | Distinct from spare_parts (which are repair parts); printer toner, batteries, cables, dongles tracked separately because they don't carry serials. |
| `physical_inventory_audits` | HAM-ASSET-REGISTRY | ServiceNow, Flexera | Scheduled audit runs (annual / quarterly). Each audit produces a reconciliation report against the asset register. |
| `hardware_refresh_plans` | HAM-ASSET-REGISTRY | ServiceNow, Flexera | Forward-looking refresh schedule (laptop refresh cycle, server EOL replacement plan). Driven by `hardware_model.eol_announced`. |
| `data_sanitization_certificates` | HAM-WARRANTY-PARTS | Flexera, ServiceNow (via ITAD integrations) | NIST 800-88 / DoD 5220.22-M certified-erasure evidence per disposed device. Today `hardware_disposal_records` is the wrapper; the sanitization certificate is a distinct artifact. |
| `chain_of_custody_logs` | HAM-WARRANTY-PARTS | ServiceNow ITAD, Iron Mountain, Sims | Per-shipment custody log from departure from custodian → arrival at ITAD vendor → final disposition. Compliance evidence for HIPAA / GDPR. |

#### WRONG-OWNERSHIP (0)

No WRONG-OWNERSHIP findings in the current footprint: the 5 masters are split coherently between Registry (169) and Warranty/Parts (170).

#### SCOPE-CREEP (0)

No SCOPE-CREEP. Every master in the current footprint is something a HAM flagship would also master.

#### MODULARIZATION (0 in this audit)

The current 2-module split (Registry + Warranty/Parts) is coherent at the 5-master level. If the Bucket 3 disposal/compliance entities land (`data_sanitization_certificates`, `chain_of_custody_logs`, plus the regulatory linkage from B2-S6), the question whether to spin a third module `HAM-DISPOSAL-COMPLIANCE` becomes real, but it's downstream of the Bucket 3 fix-pack and goes to a separate refactor conversation.

#### Candidate domain queued

- **ITAD — IT Asset Disposition** queued in `audits/_missing-domains.md` via `append_missing_domain.ts`. Vendor evidence: Iron Mountain ITAD, Sims Lifecycle Services, Wisetek, ERI Direct, TES (an SK ecoplant company). Adjacency: HAM, ITAM, GRC, ESG. Candidate capabilities: secure data sanitization, chain of custody, e-waste recycling logistics, certificate of destruction generation, fair-market resale, regulatory disposal reporting. This is a real point-solution market downstream of HAM that today gets folded into HAM's disposal workflow but has its own vendor ecosystem. The point-solution-market test would pass.

### Cross-bucket dependencies

- **B2-S1 (pattern flags) is independent** of Buckets 1 and 3. Decision-only.
- **B2-S2 / B2-S3 (handoff 622 / 657 mis-routing decisions) are dependent on B1-S10** (B10b inbound `target_domain_module_id` backfill). Both decisions must settle before the PATCH can fire. If user chooses (b) DELETE for either, the corresponding B10b row goes away.
- **B2-S4 (users-edge collapse) is dependent on B1-S11** (verb-shape rewrite). Same rows touched; resolve together.
- **B2-S5 (`asset_lifecycle_events` consumer DMDO) is dependent on B1-S10** (handoff 633 target attribution). If user adds the consumer DMDO (option a), handoff 633 attributes to 170 deterministically; if not, target_domain_module_id stays NULL until upstream cleanup.
- **B2-S6 (regulations) might be informed by the ITAD candidate triage** (Bucket 3 queue entry). If ITAD becomes its own domain, RoHS/WEEE/NIST 800-88 might equally land on ITAD's `domain_regulations` and the HAM linkage becomes pointer-style. Recommend deferring (option c) until the queue is triaged.
- **Bucket 3 MISSING entities are independent of Bucket 1 / Bucket 2** in terms of the structural fixes (lifecycle states, system skills, role authoring) but the role authoring in B1-S13 will need re-extension when the entities land. Sequencing: B1 first, then Bucket 3 fix-pack, then re-author roles if scope grew.
- **B1-S1 (lifecycle states) is the upstream of B1-S2 (system skills) which is the upstream of B1-S13 (roles).** Load order: states → skill+tools → workflow-gate permissions (derived from states) → roles + role_permissions. Don't author roles until permissions exist.

### Per-bucket prompts

**Bucket 1 — fix these now?** Reply with: `all`, or list (e.g. `S1, S2, S4`), or `skip`.

- **S1 (B12 lifecycle states):** structural; upstream of S2 and S13. Recommend doing first.
- **S2 (F2 system skills):** depends on S1 for workflow-gate tools.
- **S3 (F1 legacy skill DELETE):** depends on S2 completing.
- **S4 (event_category PATCH on 6 events):** trivial; one PATCH each.
- **S5 (mis-attributed `ticket.created` event):** investigative; produces either a re-target or a delete.
- **S6 (duplicate event 44/60):** mechanical merge + PATCH.
- **S7 (B9b intra-domain handoffs):** 4 inserts, depends on S1 for lifecycle event names.
- **S8 (B10b outbound NULL FKs):** 5 PATCHes; handoff 150 depends on S9.
- **S9 (handoff 150 structural defect):** new event + handoff re-point + PATCH.
- **S10 (B10b inbound NULL FKs):** 4 PATCHes + 2 deferrals (depend on B2-S2/S3).
- **S11 (B7 user-edge verb-shape):** PATCH 6 verbs; depends on B2-S4 if collapse is chosen.
- **S12 (Rule #15 revert on handoff 633.notes):** PATCH 1 row + changelog entry.
- **S13 (E1 roles):** hand-author 3-5 roles + permissions; depends on S1 and S2.
- **H1 (APQC tagging — 10 confident + 2 deferred + 2 replacements):** load now or in a follow-up batch?

**Bucket 2 — what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (pattern flags):** per-flag yes/no per master.
- **B2-S2 (handoff 622):** (a) Add consumer DMDO. (b) DELETE handoff. (c) Defer.
- **B2-S3 (handoff 657):** (a) Keep. (b) DELETE. (c) FLIP direction.
- **B2-S4 (users-edge collapse):** (a) Keep both verb-shape. (b) Collapse to one. (c) Keep both + add disposal approver.
- **B2-S5 (`asset_lifecycle_events` consumer DMDO):** (a) Add. (b) Side-channel only.
- **B2-S6 (regulations linkage):** (a) RoHS + WEEE + NIST 800-88. (b) All 6. (c) Defer pending ITAD triage.

**Bucket 3 — Phase 0 pending — vet via formal Phase 0 vendor research, or eyeball-mode?** If eyeball, name which of the 10 missing entities to treat as confirmed. Strongest signals: `asset_categories`, `asset_assignments`, `asset_movements`, `depreciation_schedules`, `data_sanitization_certificates` (the last is also conditional on the ITAD market triage in `audits/_missing-domains.md`).

### Report-only follow-ups (owed by other domains)

These are findings the HAM audit surfaced but route to other domains for fix. They do NOT block HAM's audit green status; the user can choose to schedule audits on each.

| Owed by | Finding | Reference |
|---|---|---|
| **Every HAM-target domain** (S2P, RMM, GRC, FIN, SPM, MSP-PSA, ITAM, DISCOVERY, UEM) | Missing `domain_module_data_objects` rows declaring `consumer / contributor / embedded_master` on the relevant HAM master at the receiving module. Today every HAM-target domain implicitly consumes via the handoff payload without declaring the DMDO dependency. This is the catalog-wide reverse-direction Section-4 finding from pairwise reconciliation (mirrors the APM audit's B1-S9). Specifically: S2P needs consumer DMDO on `spare_parts_inventory` + `hardware_warranties`; RMM needs consumer DMDO on `hardware_assets`; GRC needs consumer DMDO on `hardware_disposal_records`; FIN needs consumer DMDO on `hardware_disposal_records`; SPM needs consumer DMDO on `hardware_models`. | Each receiving domain's own b1 audit. Not HAM's fix. |
| **ITAM** | Handoff 633 (`asset.retired_for_disposal` → HAM) carries a Rule #15 violating note ("target NULL until HAM is modularized") that this audit will revert (B1-S12). Recommend ITAM run its own b1 audit to surface any other notes-pollution rows. Also: ITAM should add a consumer DMDO on HAM masters where ITAM-LIFECYCLE consumes hardware_assets state, for the `B8 reverse direction` pairwise rule. | ITAM b1 audit. |
| **MSP-PSA** | Trigger event 140 `ticket.created` is mis-attributed to `data_object_id=56` (hardware_assets) but conceptually belongs on a MSP-PSA service ticket master. MSP-PSA's b1 audit should surface the canonical `ticket.created` event and the catalog can re-point handoff 161 at it. | MSP-PSA b1 audit (B1-S5). |
| **CMDB** | hardware_assets is `contributor` on CMDB-CORE (108) but no handoff exists from HAM to CMDB. Either the contribution flows via DMDO-only (no event) which is acceptable, or there's a missing `hardware_asset.created` / `hardware_asset.updated` handoff for CMDB sync. | CMDB b1 audit. |
| **FSM** | hardware_assets is `embedded_master + necessity=optional` on FSM-DISPATCH-OPS (161). The "embedded shell" pattern is correct under Rule #11 (canonical master is HAM 169). No HAM-side fix; mention here for FSM's own audit symmetry check. | FSM b1 audit. |
| **ONBOARDING** | hardware_assets is `consumer + necessity=required` on ONB-JOURNEY-MGMT (35). Onboarding journeys provision hardware on day-one; an `onboarding_journey.started` → HAM (provision) inbound handoff is plausibly missing on HAM's side, but the publishing side is onboarding's B9. | ONBOARDING b1 audit. |
| **DISCOVERY** | Handoff 622 (`discovery_scan.completed` payload `discovery_scans` → HAM) lands a payload HAM doesn't model. Either DISCOVERY's downstream consumers are the per-asset `device.discovered` events (32 and 144), and 622 is mis-routed — surface in DISCOVERY's b1 audit. | DISCOVERY b1 audit. |
| **UEM** | Handoff 657 (`enrolled_device.retired` payload `enrolled_devices` → HAM) is plausibly mis-routed or flipped — see B2-S3. The publishing side decision is UEM's. | UEM b1 audit. |

## 2026-05-31, Audit

### Summary

Validate b1 structural re-audit against live state. Footprint unchanged since 2026-05-30: 2 full modules (HAM-ASSET-REGISTRY 169, HAM-WARRANTY-PARTS 170) + 1 hosted starter (HVAC-SVC-MGMT 171), 5 HAM masters (`hardware_assets` 56, `hardware_models` 695, `hardware_warranties` 696, `hardware_disposal_records` 697, `spare_parts_inventory` 698), 9 HAM trigger events, 6 outbound + 6 inbound cross-domain handoffs, 6 users-edge `data_object_relationships`, 0 lifecycle states across all 5 masters, 0 roles touching modules 169 / 170, 0 `domain_regulations`, legacy domain-level system skill 65 (`ham-system`, 5 platform-tier `query_*` tools) still present.

**Drift since 2026-05-30** (all incremental, no regressions):

- APQC tagging partial progress: 6 `agent_curated` rows landed on handoffs 32 (process 1312 `Maintain IT asset records` L4), 622 (1312 L4), 633 (1389 `Process and record fixed-asset additions and retires` L4), 657 (355 `Decommission productive assets` L3), 668 (808 `Process/Review requisitions` L4), 669 (808 L4). Two `discovery_substring` legacy rows on 150 and 633 pointing at process 10 (L1 root `Acquire, Construct, and Manage Assets`) still present and still wanted-replaced per Discover Pass 1.5 override convention.
- Note that the `agent_curated` proposals that landed on 668 / 669 diverge from this audit's prior recommendation (826 `Manage raw material inventory` for 668; 201 `Process warranty claims` for 669). Both 668 and 669 now route to 808 `Process/Review requisitions`. That's a defensible PCF read (S2P requisition is the outcome) but loses the distinct-payload signal between low-stock and warranty-expiring. Resurfaced as B2-S7.

Every other 2026-05-30 finding remains live and verified against PostgREST. The dominant blockers chain unchanged: B12 (lifecycle states) → F2 (system skills) → E1 (roles). B10b own-side NULL FKs unchanged (6/6 outbound + 6/6 inbound). B9b unchanged (zero intra-domain cross-module handoffs). Handoff 633 still carries the Rule #15 violating note `target NULL until HAM is modularized` despite HAM now being modularized.

### Bucket re-classification

All 14 Bucket 1 items and all 6 Bucket 2 items from 2026-05-30 remain open in this audit. One additional Bucket 2 item (B2-S7) surfaces from the APQC drift above. Bucket 3 unchanged (10 candidate MISSING entities + ITAD market candidate queued).

Sequencing constraints from 2026-05-30 audit hold:

- B1-S1 (lifecycle states) upstream of B1-S2 (system skills) upstream of B1-S13 (roles). Each blocks the next; without states there is no workflow-gate verb to bind a tool to, without a tool there is no role permission to bundle.
- B1-S3 (legacy skill 65 DELETE) downstream of B1-S2 (never delete the legacy before module-level skills exist).
- B1-S7 (B9b intra-domain handoffs) depends on B1-S1 because the proposed triggers (`hardware_asset.deployed`, `hardware_asset.retired`, `hardware_model.eol_announced` already exist; `spare_parts_inventory.low_threshold` already exists) reference lifecycle events that the state machines will own.
- B1-S8 handoff 150 row depends on B1-S9 (event re-attribution must land first).
- B1-S10 rows for handoffs 622 / 657 depend on B2-S2 / B2-S3 user judgment.
- B1-S10 row for handoff 161 depends on B1-S5 (MSP-PSA's canonical `ticket.created` resolution, owed by MSP-PSA).
- B1-S11 verb rewrite shape depends on B2-S4 (collapse vs keep both).
- B2-S6 regulations linkage cross-informed by B3 ITAD candidate triage.

### Pass-through observations from live read

The five HAM masters carry zero lifecycle states (confirmed by query `data_object_lifecycle_states?data_object_id=in.(56,695,696,697,698)` returns `[]`). None of the five are config-shaped: all carry transitions (asset deploy / retire / dispose; warranty active / expiring / expired / renewed; disposal initiated / sanitized / certified / completed; parts low / reordered / received / consumed; model active / eol / retired). B12 remains the lever the rest of the audit hangs from.

No `domain_regulations` rows exist for HAM, even though disposal touches RoHS (EU 2011/65/EU), WEEE (EU 2012/19/EU), NIST SP 800-88 r1 sanitization guidelines, GDPR Art 17 for retired devices that held PII, HIPAA where retired devices held PHI, R2v3 and e-Stewards recycler certifications. Decision parked as B2-S6 pending ITAD-domain triage.

### Bucket 1 carry-over

All 13 STRUCTURAL items (B1-S1 through B1-S13) and the APQC TAGGING item (B1-H1) from 2026-05-30 carry forward. APQC item is partially drained (6/10 confident agent_curated landed; 4 remaining + 2 discovery_substring replacements + 2 deferred). Detail tables in the 2026-05-30 section above are the canonical source; state.yaml carries the structured remainder.

### Bucket 2 carry-over plus new

B2-S1 through B2-S6 carry forward unchanged. New:

- **B2-S7 — APQC routing on 668 / 669.** The agent_curated rows that landed both point at process 808 `Process/Review requisitions` (L4). This audit's prior recommendation was 826 `Manage raw material inventory` for 668 (spare-parts low threshold ⇒ inventory replenishment workflow) and 201 `Process warranty claims` for 669 (warranty expiring ⇒ warranty claim processing). Either pick is plausible PCF coverage. The user owns the call: leave both at 808, switch 668 → 826 and 669 → 201, or accept 808 as the umbrella and stack additional rows alongside (multi-process tags per handoff are allowed).

### Bucket 3 carry-over

Unchanged. 10 candidate MISSING entities (`asset_categories`, `asset_assignments`, `asset_movements`, `stock_rooms`, `depreciation_schedules`, `consumables`, `physical_inventory_audits`, `hardware_refresh_plans`, `data_sanitization_certificates`, `chain_of_custody_logs`). ITAD point-solution market still queued in `audits/_missing-domains.md`.

### Report-only follow-ups

Unchanged from 2026-05-30. The 8-domain ledger (S2P, RMM, GRC, FIN, SPM, MSP-PSA, ITAM, DISCOVERY, UEM, CMDB, FSM, ONBOARDING) remains accurate; verified via the live handoffs and DMDO queries above.

### JWT-audience errors

None encountered. All reads succeeded against the project tenant via the `semantius` CLI.

### Decisions

None. Awaiting user per-bucket decisions before any fix loads.

### Fixes applied

None this audit.

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

## 2026-06-07: Audit (state-driven execute, bulk batch)

### Summary

State-driven Validate run (SKILL.md Rule #21) against `audits/HAM/state.yaml` open items only; no
fresh from-scratch audit. Domain id 51, modules HAM-ASSET-REGISTRY (169) + HAM-WARRANTY-PARTS (170),
5 masters (56/695/696/697/698) confirmed live. Each recorded item was re-verified against PostgREST
before acting (snapshot drift since 2026-05-31 was incremental, no regressions). Executed every
additive/corrective item the agent owns at `record_status='new'`; surfaced destructive steps and
b2 decisions; left blocked-on-other-domain, deferred, and superseded items. No JWT-audience errors.

Drift observed vs snapshot: APQC partially drained further (handoff 144->1312, 670->1393, 633->1389
already landed; 150 already carries 355; the discovery_substring row on handoff 150 is already gone,
leaving only id 99 on handoff 633). business_function_domains (C1) already complete (owner = IT Asset
Management bf 84, contributors Procurement bf 19 + Finance bf 4; live owner differs from the task's
"IT Operations" suggestion but is non-empty and sensible, not overwritten). Aliases (B11) already
complete (10 generic synonyms across all 5 masters, no vendor names). Both C1 and B11 had nothing
clean to add.

### Executed (record_status='new', additive/corrective; via .tmp_deploy/2026-06-07_ham_state_driven_execute.ts)

- **entity_type classification (B1A-ENTITY-TYPE): 5 PATCHes.** hardware_assets (56) ->
  operational_workflow; hardware_models (695) -> catalog; hardware_warranties (696) ->
  operational_record; hardware_disposal_records (697) -> operational_workflow; spare_parts_inventory
  (698) -> operational_record. (All were `unclassified`.) Note: M5 now flags 56 + 697 as
  operational_workflow-without-states until B1A-S1 authors lifecycle states.
- **Catalog UX (Rule #20): 3 PATCHes** (all fields were empty; no overwrite). Domain 51 +
  module 169 + module 170 each got buyer-voice catalog_tagline + catalog_description (workflow +
  value, no vendor names, no em-dash, American English).
- **event_category (B1A-S4): 6 PATCHes** filling empty enum (Rule #13). 682 hardware_model.added
  -> lifecycle; 683 hardware_model.eol_announced -> state_change; 684 hardware_warranty.expiring ->
  threshold; 685 hardware_warranty.expired -> state_change; 686 hardware_disposal_record.completed
  -> state_change; 687 spare_parts_inventory.low_threshold -> threshold.
- **APQC handoff_processes (B1A-H1): 2 INSERTs** (agent_curated, role=implements, record_status new).
  handoff 671 (HAM->GRC, disposal completed) -> process 1573 (Manage disposition, disposal,
  reprocessing activities, L4); handoff 672 (HAM->SPM, model eol_announced) -> process 1561 (Monitor
  useful life of assets, L4). These were the only clean PCF matches still missing; 144/670/671/672
  are now all landed.
- **source_domain_module_id backfill (B1B-S8): 5 PATCHes** (deterministic, HAM-owned). 668->170,
  669->170, 670->170, 671->170, 672->169. (Handoff 150 left NULL, depends on B1A-S9.)
- **target_domain_module_id backfill (B1B-S10): 2 PATCHes** (deterministic). 32->169, 144->169.
  (161/633/622/657 left NULL, depend on user decisions / MSP-PSA audit.)

Total executed: 5 + 3 + 6 + 2 + 5 + 2 = 23 writes (21 PATCH + 2 INSERT).

### Surfaced (not executed; destructive or user-owned)

- **B2-S1..S7** (7 user decisions): pattern flags; handoff 622 routing; handoff 657 direction;
  users-edge 256/257 collapse; asset_lifecycle_events consumer DMDO; domain_regulations scope;
  APQC 668/669 routing (process 808 vs 826/201; option c is additive-stackable).
- **B1A-S6** (DESTRUCTIVE): merge duplicate trigger events 44 + 60 (DELETE event 60, overwrite
  event 44 category, re-point handoff 144). Surfaced, not applied.
- **B1A-S9** (DESTRUCTIVE re-attribution): handoff 150 wired to RMM-owned event 9; author new
  hardware_asset.retired (data_object 56) + re-point handoff 150. Surfaced.
- **B1A-S12** (DESTRUCTIVE overwrite): revert Rule #15 violating notes on handoff 633
  ("target NULL until HAM is modularized") + changelog Incident entry. Surfaced.
- **B1A-H1-RESIDUAL** (DESTRUCTIVE delete): remove stale discovery_substring row (handoff_processes
  id 99, handoff 633 -> process 10 L1 root; agent_curated 1389 already covers it). Surfaced.
- **B1B-S11** (DESTRUCTIVE overwrite): rewrite 6 users-edge relationship_verb values to verb-shape;
  shape depends on B2-S4. Surfaced.
- **Personas / RACI (B1A-PHASE-P) + roles (B1B-S13): DEFERRED** per batch instruction. Candidate
  personas noted: IT-ITAM-ASSET-MANAGER, IT-ITAM-DISPOSAL-COORDINATOR, PROCUREMENT-HARDWARE-BUYER,
  FINANCE-FIXED-ASSET-ACCOUNTANT.

### Left (untouched)

- **B1A-S1** (lifecycle states): additive but held; its requires_permission gate shape is
  entangled with the B2-S1 pattern-flag decision and it is upstream of the deferred persona layer.
  Resolve B2-S1 first.
- **Blocked on other domains:** B1B-S5 (MSP-PSA canonical ticket.created); B1B-S10-RESIDUAL rows
  for 161 (MSP-PSA), 622/657 (B2-S2/S3), 633 (B2-S5); B1B-S8-RESIDUAL row for 150 (B1A-S9);
  B1B-S7 intra-domain handoffs (depend on B1A-S1).
- **b3 backlog:** 10 candidate MISSING entities + ITAD domain-promotion candidate. Unchanged.
- **Superseded (2026-06-06 / Plan 3):** per-module system skills, skill_tools, _core roles model.
  Header retained; reframed as a note. Not re-authored.

### Decisions / Incidents

None stamped approved (Rule #1). No notes-column writes (Rule #15). No JWT-audience errors.
