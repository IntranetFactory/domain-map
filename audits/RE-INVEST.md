---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 26
---

# RE-INVEST audit history

## 2026-05-30 Validate b1 (full 4-pass)

### Summary

- Current footprint counts (entities by category):
  - Modules: **0** (structural blocker, M1 fail)
  - Capabilities (via `capability_domains`): 6 (`RE-INV-FUND-ACCOUNTING`, `RE-INV-INVESTOR-REPORTING`, `RE-INV-PORTFOLIO-VALUATION`, `RE-INV-ACQ-UNDERWRITING`, `RE-INV-CAPITAL-CALLS`, `RE-INV-NAV-NOI-MODELING`)
  - Data objects (legacy `domain_data_objects`): 7 master + 2 consumer (`investment_properties`, `capital_calls`, `fund_distributions`, `property_valuations`, `investment_funds`, `limited_partners`, `asset_management_fees`; consumers `commercial_leases`, `rental_leases`)
  - Solutions: 7 (5 primary, 2 secondary)
  - Regulations linked: 0
  - Outbound handoffs: 4 (all with NULL module FKs on both sides)
  - Inbound handoffs: 5 (all with NULL `target_domain_module_id`)
  - Trigger events: 10
  - Lifecycle states: 4 rows on 1 master only (`fund_distributions`); zero on the other 6 masters
  - Aliases: 0
  - Skills: 1 legacy domain-level system skill (`re-invest-system`, `domain_module_id=null`)
  - Skill tools: 9 rows on the legacy skill (includes a `send_email` channel-primitive linked instead of `notify_person`)
  - Roles, role_modules, role_permissions: 0
  - APQC handoff_processes coverage: 2 of 9 cross-domain handoffs tagged (1 `discovery_substring` on 857, 1 `agent_curated` on 862); 0 `approved`
- Vendor-surface basis (flagship vendors enumerated): Yardi Investment Management, MRI Investment Management, Juniper Square, ARGUS Enterprise (Altus Group), AppFolio Investment Manager, Accruent Lucernex.
- **Bucket 1 (in-scope, agent fixable):** 13 items.
- **Bucket 2 (surface-for-user, judgment):** 7 items.
- **Bucket 3 (Phase 0 pending, speculative):** 6 items.

### Vendor surface basis

Flagship vendors selected against the point-solution-market test (SKILL.md rule #2):

- **Yardi Investment Management** (Yardi) and **MRI Investment Management** (MRI Software): incumbent enterprise platforms covering fund accounting, investor reporting, and property-level rollup for institutional asset managers and REITs.
- **Juniper Square** (Juniper Square): pure-play investor reporting + LP portal + capital call automation, widely adopted by RE-PE sponsors.
- **ARGUS Enterprise** (Altus Group): valuation and underwriting model authority, owns the cap-rate / DCF / NOI modeling pattern; data feed into the platforms above.
- **AppFolio Investment Manager** (AppFolio): mid-market RE syndicate operations.
- **Accruent Lucernex**: corporate / lease-accounting overlap (secondary; primarily a tenant of REAL-EST / RE-CRE, surfaces here for LP-reporting fund overlay).

The compliance specialist axis is shared with FUND-ADMIN (160) for partner accounting (LP K-1s, FATCA, AIFMD, SEC custody) and with REAL-EST / RE-CRE for property compliance.

### Pass 3, Neighbor discovery

Auto-derived from `handoffs` (source / target) and cross-domain DMDO references. Edge weight = handoff count + dependency count.

| Neighbor | Handoffs out | Handoffs in | DMDO refs | Edge weight | Notes |
|---|---|---|---|---|---|
| ERP-FIN (65) | 3 | 0 | 0 | 3 | Financial GL handoffs (capital calls issued, distributions declared, asset fee charged). |
| REAL-EST (141) | 0 | 1 | 0 | 1 | `property.updated` inbound on `real_estate_properties` (RE-INVEST does not declare a DMDO consumer row). |
| RE-CRE (145) | 0 | 2 | 1 | 3 | Inbound `commercial_lease.executed`, `tenant_credit.assessed`; RE-INVEST consumes `commercial_leases`. |
| RE-PROP-MGMT (144) | 0 | 1 | 1 | 2 | Inbound `rent_payment.received` on `rental_leases`; consumer DMDO present. |
| RE-BROKERAGE (143) | 0 | 1 | 0 | 1 | Inbound `listing.sold` on `real_estate_listings`. |
| FINOPS (41) | 1 | 0 | 0 | 1 | Outbound `property_valuation.refreshed` (low fit, see B-pass). |
| FUND-ADMIN (160) | 0 | 0 | 0 | 0 (structural) | Latent conflict: FUND-ADMIN masters `funds`, `capital_calls`, `fund_distributions`, `waterfall_calculations`, `capital_call_responses` at the module level. RE-INVEST also masters `capital_calls` and `fund_distributions` at the legacy `domain_data_objects` level. **Catalog-wide single-master M7 hard fail; pairwise reconciliation below.** |
| PORT-MONIT (161) | 0 | 0 | 0 | 0 (structural) | Embedded-masters `funds`; structurally adjacent for portfolio valuation rollup. |
| INV-CRM (159) | 0 | 0 | 0 | 0 (structural) | Masters `vc_deals` which references `capital_calls` (rel 874). RE / VC adjacency. |
| CAP-TABLE (162) | 0 | 0 | 0 | 0 (structural) | Masters `exit_scenarios` which references `fund_distributions` (rel 875). |

Deep-dive (Pass 4) below covers FUND-ADMIN, ERP-FIN, RE-CRE. The remaining neighbors get one-line summaries.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL, Phase M (Rule #14, blocking)

| ID | Finding | Fix surface | Evidence |
|---|---|---|---|
| B1-M1 | RE-INVEST has zero `domain_modules` rows. Every domain must have at least one full module; with 6 capabilities the floor is two full modules. | Phase A loader extension: author 2 to 3 modules (proposed: `RE-INVEST-FUND-ACCT`, `RE-INVEST-INVESTOR-REPORTING`, `RE-INVEST-PORTFOLIO-VAL`) plus a starter (`RE-INVEST-LITE`) if SMB fit warrants. Module set MUST be drafted with Bucket 2 decision on FUND-ADMIN consolidation locked first. | `/domain_modules?domain_id=eq.146` returns `[]`; `/capability_domains?domain_id=eq.146` returns 6 rows. |
| B1-M2 | Vacuous; M2 enforces 2-module floor when capability count is at least 3. RE-INVEST has 6 capabilities and 0 modules. Cured by B1-M1. | Same as B1-M1. | Capability count 6. |
| B1-M4 | All 6 capabilities are unrealized (zero `domain_module_capabilities` rows). | Author `domain_module_capabilities` rows alongside the module load in B1-M1. | `/domain_module_capabilities?capability_id=in.(398,399,400,401,402,403)` returns `[]`. |
| B1-M7a | **Catalog-wide single-master HARD FAIL** on `capital_calls` (367): RE-INVEST has it at `domain_data_objects.role='master'` AND FUND-ADMIN has it at `domain_module_data_objects.role='master'` on module `FUND-ADMIN-CAPITAL-CALLS` (id 14). Two masters for one data_object. | Bucket 2 design decision required before fix: which domain owns canonical mastery (FUND-ADMIN is the more granular, modularized owner). Likely outcome: RE-INVEST demotes its DDO row to `embedded_master` or `consumer` once a RE-INVEST module exists. See Bucket 2 #1. | `/domain_data_objects?data_object_id=eq.367&role=eq.master` returns RE-INVEST; `/domain_module_data_objects?data_object_id=eq.367&role=eq.master` returns FUND-ADMIN-CAPITAL-CALLS. |
| B1-M7b | **Catalog-wide single-master HARD FAIL** on `fund_distributions` (368): same shape as M7a. RE-INVEST masters at the legacy DDO level; FUND-ADMIN masters at module `FUND-ADMIN-DISTRIBUTIONS` (id 15). | Same as B1-M7a, see Bucket 2 #1. | `/domain_data_objects` vs `/domain_module_data_objects` cross-check. |

#### STRUCTURAL, Phase B (Rule #12, Rule #10, Rule #11)

| ID | Finding | Fix surface | Evidence |
|---|---|---|---|
| B1-B3 | Naming arbitration not applied. All 7 masters have `is_canonical_bare_word=false` and bare `naming_authority_rationale`. The data_object_name set is already prefix-shaped (`investment_*`, `capital_*`, `fund_*`, `property_*`, `asset_management_*`, `limited_*`), so no claim is needed; B3 PASSES IMPLICITLY. **However**: `investment_funds` (727) collides with `funds` (755) mastered by FUND-ADMIN (same concept under two names). See Bucket 2 #2 on the rename / merge decision; loader fix flows from that decision. | Per Bucket 2 #2 resolution. | DDO + DMDO cross-check; `funds` aliases `investment vehicles`, `partnerships`. |
| B1-B4 | Pattern flags not positively re-evaluated. All 7 masters have `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false` by default. `fund_distributions` realistically wants `has_submit_lock=true` (once declared the waterfall is locked) and `has_single_approver=true` (CFO sign-off). `capital_calls` wants `has_single_approver=true` (GP signs the call). `limited_partners` warrants `has_personal_content=true` (LP PII, tax IDs, accreditation status). | PATCH the flags via a focused loader once modules exist. Do not auto-write `notes` per Rule #15. | `/data_objects?id=in.(366,367,368,369,727,728,729)` shows all flags false. |
| B1-B6 | **Zero intra-domain master-master relationships.** No `investment_funds → investment_properties` (owns), `investment_funds → capital_calls` (issues), `investment_funds → fund_distributions` (declares), `investment_funds → limited_partners` (subscribed_by), `investment_funds → asset_management_fees` (accrues), `fund_distributions → capital_calls` (offsets), `investment_properties → property_valuations` (revalued_by). A 7-master domain with zero in-domain edges is an isolated-master pattern. | Draft `data_object_relationships` rows (verb + inverse_verb + cardinality + necessity + owner_side) and load. | `/data_object_relationships?and=(data_object_id.in.(<masters>),related_data_object_id.in.(<masters>))` returns `[]`. |
| B1-B7 | `users` edges incomplete. Only `users approves capital_calls` and `users approves fund_distributions` exist. Missing: `users manages investment_funds` (fund_manager), `users acquires investment_properties` (portfolio_manager), `users values property_valuations` (analyst / appraiser), `users owns limited_partners` (investor_relations). | Author 4 to 6 missing `data_object_relationships` rows against `users` (id 748). | `/data_object_relationships` with `data_object_id` or `related_data_object_id` in `(748)` x RE-INVEST masters. |
| B1-B11 | Zero aliases on every master. RE-INVEST is a heavily-aliased market (`LP` for `limited_partners`, `GP` for general partner role, `NAV`/`net asset value` for `property_valuations`, `IRR`/`internal rate of return`, `AUM`, `REIT` for `investment_funds`, `K-1` for distribution tax form). | Author `data_object_aliases` rows: 2 to 4 per master (industry + vendor synonyms). | `/data_object_aliases?data_object_id=in.(366,367,368,369,727,728,729)` returns `[]`. |
| B1-B12 | Lifecycle states missing on 6 of 7 masters. Only `fund_distributions` has 4 states (`drafted`, `declared`, `executed`, `completed`). `capital_calls` warrants `drafted → issued → funded` (trigger events 295 and 1186 already exist for the issued and funded transitions). `investment_properties` warrants `pipeline → under_contract → acquired → owned → disposed`. `investment_funds` warrants `forming → open → closing → harvest → liquidated` (events 953 `fund.created` and 954 `fund.closed` already exist). `property_valuations` is config-shape (refresh cadence, no workflow). `limited_partners` warrants `prospective → subscribed → active → redeemed`. `asset_management_fees` is config / ledger-shape. | Draft lifecycle state rows (initial / terminal / requires_permission + permission_verb_override) per master; load after modules exist so `domain_module_id` is populated. Surface config-shape exemption decisions for `property_valuations` and `asset_management_fees` (Rule #12 exemption is user-decided; do NOT auto-populate `notes` per Rule #15). | `/data_object_lifecycle_states?data_object_id=in.(<masters>)` returns 4 rows total, all on 368. |

#### STRUCTURAL, Phase A (Rule #20)

| ID | Finding | Fix surface | Evidence |
|---|---|---|---|
| B1-A4 | Catalog UX fields empty. `catalog_tagline` and `catalog_description` both blank. Per Rule #20 the agent may draft both and surface for user review before write; never overwrite once non-empty. | Surface drafted text in Bucket 2 #6 for explicit user approval, then PATCH. | `/domains?id=eq.146&select=catalog_tagline,catalog_description` returns empty strings. |

#### STRUCTURAL, Phase F (Rule #17)

| ID | Finding | Fix surface | Evidence |
|---|---|---|---|
| B1-F1 | Legacy domain-level system skill `re-invest-system` (id 97) exists with `domain_module_id=null`. Conditional pass today (no module-level skills yet) but the row must be retired once Rule #14 modules ship. Plan to DELETE on the same load that introduces the module-level system skills (Phase S in the eventual fix-loop). | DELETE id 97 in the module load. | `/skills?domain_id=eq.146&skill_type=eq.system&domain_module_id=is.null` returns one row. |
| B1-F7 | `send_email` channel-primitive linked to the legacy system skill instead of the `notify_person` abstraction. The current `re-invest-system` does not justify a channel-specific send (LP capital-call notifications are exactly the substitutable-channel pattern: email today, in-app or SMS tomorrow). | Once modules exist, the per-module system skills replace `send_email` with `notify_person`. DELETE the old `skill_tools` row or PATCH to point at `notify_person`. | `/skill_tools?skill_id=eq.97` includes `send_email`. |

#### BOUNDARY (Pass 4, Pairwise per neighbor)

The full per-leg diff per neighbor below. All four legs of the cross-domain handoff contract (producer master + lifecycle state, trigger event, handoff with both module FKs, consumer DMDO) are evaluated.

##### Boundary findings: RE-INVEST ↔ ERP-FIN (edge weight 3)

| ID | Finding | Fix surface | Evidence |
|---|---|---|---|
| B1-PR-EF-1 | Three outbound handoffs to ERP-FIN (306 `fund_distribution.declared`, 307 `capital_call.issued`, 863 `asset_fee.charged`) all have `source_domain_module_id=NULL` and `target_domain_module_id=NULL`. RE-INVEST has zero modules so the source side is legitimately NULL until B1-M1 is cured. The target side: ERP-FIN has modules and these payloads belong on `ERP-FIN-GL-JOURNAL` (or equivalent receivables module). | After B1-M1, backfill source FKs via the canonical derivation in B10b. Target FKs depend on ERP-FIN's module shape; defer to RE-INVEST's next pass after B1-M1 lands. | Three rows from outbound query. |

##### Boundary findings: RE-INVEST ↔ FUND-ADMIN (edge weight 0 today, latent M7 conflict)

| ID | Finding | Fix surface | Evidence |
|---|---|---|---|
| B1-PR-FA-1 | Zero handoffs exist between the two domains today, yet they catalog-master the same `capital_calls` and `fund_distributions` entities (B1-M7a / M7b). Either FUND-ADMIN is the canonical owner (RE-INVEST demotes to `embedded_master` and gets inbound handoffs from FUND-ADMIN), or RE-INVEST is the RE-specific owner and FUND-ADMIN is the PE/VC-specific owner (split by industry vertical, requires data_object renames). Resolution gates the entire fix-loop. | Bucket 2 #1 decides the demotion direction; loader follows. | M7 query cross-check above. |

##### Boundary findings: RE-INVEST ↔ RE-CRE (edge weight 3)

| ID | Finding | Fix surface | Evidence |
|---|---|---|---|
| B1-PR-RC-1 | Two inbound handoffs from RE-CRE (303 `commercial_lease.executed`, 859 `tenant_credit.assessed`) have `target_domain_module_id=NULL` (correctly; RE-INVEST has no modules to attribute to). After B1-M1, the target FK will resolve to the portfolio-valuation / fund-accounting module that consumes the lease income stream. | Backfill after B1-M1. | Inbound query rows 303 and 859. |

#### APQC TAGGING (H1)

9 cross-domain handoffs total (4 outbound + 5 inbound). 2 currently tagged (1 `discovery_substring` row at `record_status='new'` on handoff 857; 1 `agent_curated` row at `record_status='new'` on handoff 862). Volume target: 0.5N to 0.8N new `agent_curated` rows, i.e. 4 to 7 proposals on this audit.

| ID | handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id | external_id | confidence |
|---|---|---|---|---|---|---|---|---|
| B1-H1-a | 305 | RE-INVEST → FINOPS | property_valuation.refreshed | property_valuations | Process and record fixed-asset adjustments, enhancements, revaluations, and transfers | 1390 | 10831 | confident L4 (revaluation activity) |
| B1-H1-b | 306 | RE-INVEST → ERP-FIN | fund_distribution.declared | fund_distributions | Process and distribute payments | 1422 | 10862 | confident L4 |
| B1-H1-c | 307 | RE-INVEST → ERP-FIN | capital_call.issued | capital_calls | Manage and reconcile cash positions | 1461 | 10893 | medium L4 (alternative: 1717 Develop funding models if treated as planning) |
| B1-H1-d | 863 | RE-INVEST → ERP-FIN | asset_fee.charged | asset_management_fees | Post AR activity to the general ledger | 1359 | 10803 | medium L4 (alternative: 1383 Reconcile general ledger accounts) |
| B1-H1-e | 303 | RE-CRE → RE-INVEST | commercial_lease.executed | commercial_leases | Confirm alignment of property requirements with business strategy | 1511 | 10955 | medium L4 (lease execution feeds NOI rollup; alternative defer) |
| B1-H1-f | 301 | RE-PROP-MGMT → RE-INVEST | rent_payment.received | rental_leases | Receive/Deposit customer payments | 1356 | 10800 | confident L4 |
| B1-H1-g | 857 | REAL-EST → RE-INVEST | property.updated | real_estate_properties | Confirm alignment of property requirements with business strategy | 1511 | 10955 | medium (existing `discovery_substring` row 343 `Develop property strategy and long term vision` is too strategic; this L4 is the operational match) |
| B1-H1-h | 862 | RE-BROKERAGE → RE-INVEST | listing.sold | real_estate_listings | Already tagged `Close the sale` (1860) `agent_curated`. Defer additional tag. | n/a | n/a | already tagged |
| B1-H1-i | 859 | RE-CRE → RE-INVEST | tenant_credit.assessed | tenant_credit_records | Defer-to-Discover: no clean APQC PCF match for tenant credit assessment in cross-industry framework; candidate custom process. | n/a | n/a | defer |

Catalog quality headline: **0 of 9 handoffs at `record_status='approved'`** (column 1, the headline). Process health side-bar: 1 `agent_curated` row (handoff 862) on the second column today; this audit proposes 7 new `agent_curated` rows + 1 deferral.

### Bucket 2, Surface-for-user (judgment calls)

1. **M7 demotion direction: who owns canonical mastery of `capital_calls` and `fund_distributions`?** Three options:
   - (a) **FUND-ADMIN owns** (the more modularized side already has master rows on `FUND-ADMIN-CAPITAL-CALLS` and `FUND-ADMIN-DISTRIBUTIONS`). RE-INVEST demotes to `embedded_master` once the RE-INVEST modules exist; gains inbound handoffs from FUND-ADMIN per Phase B contract. Recommended on coherence grounds (FUND-ADMIN already realizes the master-shape correctly).
   - (b) **Industry split**: RE-INVEST owns the RE-specific capital-call shape (RE fund mechanics), FUND-ADMIN owns the PE/VC shape; both keep `master` but with renames to `re_capital_calls` and `pe_capital_calls`. Heavy lift; questionable since both flows use the same waterfall mechanics.
   - (c) **Consolidate domains**: RE-INVEST becomes a vertical of FUND-ADMIN; rename data_objects survive on FUND-ADMIN. Deepest change. The user has signaled "RE-INVEST is distinct from generic fund-accounting platforms by RE-specific asset modeling" in the existing `domains.description`, so this option is the least likely fit but worth surfacing.
   - **Dependency:** This decision gates B1-M1 (the module shape depends on which entities RE-INVEST canonically masters).

2. **Naming consolidation: `investment_funds` (727) vs `funds` (755).** Both are `domain_owned`; `funds` is mastered by FUND-ADMIN at module FUND-ADMIN-FUND-LEDGER and is the catalog's bare-word root; `investment_funds` is mastered only by RE-INVEST at the legacy DDO level and has zero DMDO rows. Three options:
   - (a) **Merge into `funds`**: DELETE `investment_funds` (727), retarget RE-INVEST DDO + future DMDO rows to 755, port the legacy relationships (846, 847) to RE-INVEST scope. The bare-word `funds` already covers RE / PE / VC by industry tag.
   - (b) **Keep `investment_funds` for RE-specific subclass**, prefix it: `re_investment_funds`. Adds a relationship `funds is_specialized_by re_investment_funds`. Heavier model.
   - (c) **Keep both as-is**, accept the duplicate as a transitional state. Anti-pattern; do not recommend.
   - **Dependency:** Resolution flows from Bucket 2 #1.

3. **`limited_partners` (728) vs FUND-ADMIN's LP commitment model.** FUND-ADMIN has a `FUND-ADMIN-LP-COMMITMENTS` module (id 13). Does RE-INVEST's `limited_partners` master belong on RE-INVEST (because RE funds have RE-specific LP onboarding flows, accreditation, ERISA pension considerations), or should RE-INVEST consume FUND-ADMIN's LP shape? Likely depends on the answer to #1; surface as separate question because the answer might differ.

4. **`asset_management_fees` (729) ownership.** Asset-management-fee accounting is a generic GP-LP mechanic (not RE-specific). Strong fit on FUND-ADMIN. Options:
   - (a) move mastery to FUND-ADMIN (likely an existing module FUND-ADMIN-FEE-ACCT or extend FUND-ADMIN-FUND-LEDGER);
   - (b) keep on RE-INVEST as an RE-specific fee schedule (acquisition fees, AUM-based fees with RE quirks);
   - (c) keep but rename `fee_schedules` to make the cross-industry meaning explicit. Surface to user.

5. **Pattern-flag confirmation per Rule #12.** For each master, agent proposes:
   - `investment_properties`: defaults fine; consider `has_single_approver` for acquisitions.
   - `capital_calls`: `has_single_approver=true` (GP signature).
   - `fund_distributions`: `has_submit_lock=true` (declared waterfall is immutable) + `has_single_approver=true` (CFO approves).
   - `property_valuations`: defaults fine; config-shape candidate (no workflow beyond refresh cadence).
   - `investment_funds`: `has_single_approver=true` (fund formation approval).
   - `limited_partners`: `has_personal_content=true` (LP PII, tax IDs, accreditation).
   - `asset_management_fees`: defaults fine; config-shape candidate.
   - Each TRUE flag needs explicit user approval before PATCH per Rule #12. Per-row decisions, not batch.

6. **Catalog UX field drafts (Rule #20).**
   - **Proposed `catalog_tagline`**: *"Run fund accounting, investor reporting, and portfolio valuation for real estate funds and REITs in one place."*
   - **Proposed `catalog_description`**: *"Manage capital calls, distribution waterfalls, and LP statements alongside property-level NOI, cap-rate models, and acquisition underwriting. Roll up portfolio valuations across funds and assets, with audit-ready accounting that connects to your operating property managers and your corporate GL."*
   - Surface both to user; write only on per-row approval.

7. **Lifecycle exemption decisions.** `property_valuations` and `asset_management_fees` are config-shape candidates per B1-B12. Approve exempting them from full lifecycle authoring? Or surface a minimal three-state machine (`refresh_scheduled → calculated → published`) on `property_valuations`? Per Rule #12 the exemption is user-decided; do not auto-populate `notes` for the justification.

### Bucket 3, Phase 0 pending (speculative)

Candidates from market-surface knowledge that lack a vetted Phase 0 baseline. Recommended verification: run a focused Phase 0 (vendor surface enumeration) on RE-INVEST before any insert.

1. **Missing data_object: `re_acquisition_pipeline_deals`.** Vendor evidence: ARGUS, Yardi Investment Manager, and Juniper Square all model the acquisition pipeline as a first-class entity with stages (sourced → underwriting → LOI → due_diligence → closed). Currently RE-INVEST has `investment_properties` only with no upstream pipeline. Verification path: ARGUS Enterprise schema docs + Yardi Investment Manager acquisition module reference.
2. **Missing data_object: `rent_rolls`.** Vendor evidence: every flagship platform models the rent roll as the bridge between leases and NOI rollup. Lives at the property level. Verification: Yardi rent-roll API reference.
3. **Missing data_object: `noi_calculations` / `operating_statements`.** NOI is the load-bearing metric for both valuation and distribution forecasting; flagship platforms model it as a queryable entity, not a computed report. Verification: ARGUS NOI schema, Juniper Square distribution-driver docs.
4. **Missing data_object: `debt_facilities` / `loans`.** RE funds carry property-level and fund-level debt; covenant breaches trigger distribution holdbacks. Verification: ARGUS debt module, Yardi Mortgage / Lender Management.
5. **Missing data_object: `tax_lots` / `cost_basis_lots`.** Required for tax-deferred-exchange (Section 1031) accounting at the LP level. Verification: Juniper Square 1031 module, Yardi Tax module.
6. **Missing regulation linkages.** Zero `domain_regulations` rows on RE-INVEST. Candidates worth verifying: SEC Custody Rule (PE/RE fund custody), AIFMD (EU fund managers), GAAP ASC 946 (Investment Companies), IFRS 9 / IFRS 13 (financial instruments + fair value), FATCA / FBAR (foreign LPs), state Blue Sky laws (private fund offerings). Verification: Juniper Square compliance docs, MRI regulatory matrix.

### Cross-bucket dependencies

- **Bucket 2 #1 (M7 demotion) gates Bucket 1 M1, M4, M7a, M7b, B12, and all BOUNDARY items.** No module shape can land until the demotion direction is fixed.
- **Bucket 2 #2 (investment_funds vs funds) flows from #1.** If FUND-ADMIN owns canonical mastery, `investment_funds` probably DELETEs and retargets to `funds` (755). If RE-INVEST stays canonical for the RE vertical, `investment_funds` keeps mastery, gets renamed or kept, and gains DMDO rows.
- **Bucket 2 #3 (`limited_partners`) and #4 (`asset_management_fees`) flow from #1.** Same root.
- **Bucket 2 #5 (pattern flags) is independent of #1; can be resolved standalone**, but the PATCH only lands after B1-M1 cures so that the module-level system skills can derive permissions correctly.
- **Bucket 2 #6 (catalog UX drafts) is independent of all other items**; agent can write on per-row user approval today.
- **Bucket 2 #7 (lifecycle exemptions) is independent of #1** but depends on B1-M1 so that any non-exempt states can attach to the realizing module via `domain_module_id`.
- **Bucket 3 candidates are independent of Bucket 2 #1**; even if RE-INVEST shrinks to a vertical of FUND-ADMIN, the RE-specific entities (rent_rolls, acquisition_pipeline_deals, NOI calculations, debt facilities, tax lots) still belong somewhere on the RE side. They would just attach to a differently-scoped owner.

### Per-bucket prompts

- **After Bucket 1:** *"13 in-scope items. Most of Bucket 1 is gated on the Bucket 2 #1 decision (M7 demotion direction). Once that lands, would you like me to author the loader covering B1-M1 + B1-M4 + B1-M7a/b + B1-B3/B4/B6/B7/B11/B12 in a single pass, plus the Pass-4 backfills (B1-PR-EF-1, B1-PR-RC-1) as the second loader? B1-A4 (catalog UX) and B1-F1 / B1-F7 (skill cleanup) can ride along once #6 and #1 land respectively. Reply 'all', 'just <list>', or 'wait on Bucket 2'."*
- **After Bucket 2:** *"Seven judgment calls. Please answer each in order:*
  - *#1 M7 demotion direction: (a) FUND-ADMIN owns, RE-INVEST demotes, (b) industry split with renames, (c) consolidate RE-INVEST into FUND-ADMIN. Recommended (a).*
  - *#2 `investment_funds` vs `funds` after #1.*
  - *#3 `limited_partners` ownership after #1.*
  - *#4 `asset_management_fees` ownership after #1.*
  - *#5 Pattern-flag set per master, per-row approve or rewrite.*
  - *#6 Catalog UX drafts: approve as-is, rewrite, or hold.*
  - *#7 Lifecycle exemptions: `property_valuations` exempt? `asset_management_fees` exempt? Or author minimal state machines?*
  - *I will wait for your decision per item before acting."*
- **After Bucket 3:** *"Six speculative candidates plus a regulation linkage cluster. Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates ring true. Note: Bucket 3 is independent of the Bucket 2 #1 decision; the RE-specific entities still belong somewhere on the RE side regardless of the consolidation outcome."*

### Report-only follow-ups (owed by other domains)

- **FUND-ADMIN B10b (target module attribution).** Once RE-INVEST has modules, the four outbound handoffs to ERP-FIN need ERP-FIN B10b to derive `target_domain_module_id`. Tracked there.
- **FUND-ADMIN B8 outbound on `capital_calls`, `fund_distributions`, `funds`.** Per the M7 resolution: if (a), FUND-ADMIN owes outbound handoffs to RE-INVEST whenever a master row transitions state (capital call funded, distribution executed, fund closed). Add to FUND-ADMIN's next audit checklist.
- **ERP-FIN B10b (target module attribution).** Three outbound handoffs from RE-INVEST (306, 307, 863) carry NULL `target_domain_module_id`. ERP-FIN's audit owes the backfill.
- **REAL-EST B9 outbound.** Inbound handoff 857 `property.updated` is owned by REAL-EST. The trigger event `property.updated` (data_object_id 344) is a real edge; REAL-EST is responsible for any module attribution on its source side.
- **RE-CRE B9 outbound.** Inbound handoffs 303 `commercial_lease.executed`, 859 `tenant_credit.assessed` are owned by RE-CRE. RE-CRE audit owes the source-side module FKs.
- **RE-PROP-MGMT B9 outbound.** Inbound handoff 301 `rent_payment.received` is owned by RE-PROP-MGMT (note: trigger event points at data_object 360 `rent_payments` but the handoff payload is 362 `rental_leases`; suggests a payload mismatch worth flagging on the RE-PROP-MGMT audit).
- **RE-BROKERAGE B10b.** Inbound handoff 862 has `source_domain_module_id=151` (set) but `target_domain_module_id=NULL` (RE-INVEST has no module to attribute to); cures when B1-M1 lands here.
- **INV-CRM B8 / B6.** `vc_deals` (750) relationship to RE-INVEST `capital_calls` (rel 874) is an INV-CRM-owned cross-domain edge; INV-CRM should carry an outbound handoff if the relationship is event-driven.
- **CAP-TABLE B8.** `exit_scenarios` (777) relationship to RE-INVEST `fund_distributions` (rel 875) is a CAP-TABLE-owned cross-domain edge; same pattern.
- **PORT-MONIT structural.** PORT-MONIT embeds `funds` (755). If Bucket 2 #1 lands on FUND-ADMIN-owns, PORT-MONIT's existing embedded_master shape is correct; no action. If the resolution is to keep `investment_funds` (727) separate, PORT-MONIT may also need a shell for the RE subclass.

## 2026-05-31, Continuation: B1 technical fixes

Applied the narrow technical slice of the 2026-05-30 audit that does not require user judgment or new modules.

### Applied (10 writes)

- **B1-B7, four user-edges into `data_object_relationships`** (Rule #10 explicit platform-builtin edges; audit pre-specified all four verbs and targets):
  - id 1888: `users manages investment_funds` (748 -> 727)
  - id 1889: `users acquires investment_properties` (748 -> 366)
  - id 1890: `users values property_valuations` (748 -> 369)
  - id 1891: `users owns limited_partners` (748 -> 728)
  - All `owner_side=target`, `relationship_type=one_to_many`, `relationship_kind=reference`, `record_status=new` (default), `notes=''` (default).
- **B1-H1, six new `handoff_processes` agent_curated rows** (audit pre-specified each `handoff_id` + APQC PCF `external_id`; verified PCFs are live before insert):
  - id 755: handoff 305 (`property_valuation.refreshed` -> FINOPS) -> PCF 1390 (external 10831).
  - id 756: handoff 306 (`fund_distribution.declared` -> ERP-FIN) -> PCF 1422 (external 10862).
  - id 757: handoff 307 (`capital_call.issued` -> ERP-FIN) -> PCF 1461 (external 10893).
  - id 758: handoff 863 (`asset_fee.charged` -> ERP-FIN) -> PCF 1359 (external 10803).
  - id 759: handoff 301 (`rent_payment.received` from RE-PROP-MGMT) -> PCF 1356 (external 10800).
  - id 760: handoff 857 (`property.updated` from REAL-EST) -> PCF 1511 (external 10955). Existing row 169 (`discovery_substring` -> PCF 343) is left in place; user can resolve which tag survives at review.
  - B1-H1-e (handoff 303 -> PCF 1511) skipped: already present as id 454 (`agent_curated`).
  - B1-H1-h (handoff 862) skipped: already tagged id 192 (`agent_curated`).
  - B1-H1-i (handoff 859) deferred per audit (no clean APQC PCF match).
- Loader: `c:/dev/domain-map/.tmp_deploy/fix_re_invest_b1_technical_2026_05_31.ts`.

### Deferred (judgment, or gated on a prior fix)

- **B1-M1, B1-M2, B1-M4 (new `domain_modules` + `domain_module_capabilities`):** new entities, gated on Bucket 2 #1 (M7 demotion direction). Defer until user picks owner.
- **B1-M7a, B1-M7b (dual-master `capital_calls`, `fund_distributions`):** user picks demotion direction (Bucket 2 #1).
- **B1-B3 (naming arbitration on `investment_funds` vs `funds`):** flows from Bucket 2 #2; user picks merge / rename / keep.
- **B1-B4 (pattern flag flips on six masters):** per Rule #12 + Rule #15, each TRUE flag needs explicit per-row user approval (Bucket 2 #5).
- **B1-B6 (intra-domain master-master `data_object_relationships`):** audit lists seven candidate edges but only as prose, not exact `(verb, inverse_verb, cardinality, necessity, owner_side)` tuples. Defer until audit pre-specifies the tuple set.
- **B1-B11 (aliases on every master):** audit names example aliases (`LP`, `NAV`, `IRR`, `AUM`, `REIT`, `K-1`) as prose; no exact `data_object_aliases` tuples specified. Per agent contract, bulk aliases inserts require pre-specified tuples.
- **B1-B12 (lifecycle states on 6 masters):** per audit, "load after modules exist so `domain_module_id` is populated", gated on B1-M1. Plus Bucket 2 #7 user-decides the config-shape exemptions for `property_valuations` and `asset_management_fees`.
- **B1-A4 (`catalog_tagline` / `catalog_description`):** Rule #20 requires user approval of drafted text before write (Bucket 2 #6).
- **B1-F1 (DELETE legacy `re-invest-system` skill id 97), B1-F7 (replace `send_email` on the legacy skill):** both gated on the module-level system skills landing first, which requires B1-M1.
- **B1-PR-EF-1, B1-PR-RC-1 (handoff source/target module FK backfills):** require B1-M1 (RE-INVEST has zero modules; source FKs cannot resolve), and the target side depends on neighboring-domain B10b.
- **B1-PR-FA-1 (zero handoffs to FUND-ADMIN despite shared masters):** gated on Bucket 2 #1.

### Notes on rule compliance

- No `notes` columns written on any inserted row (Rule #15).
- No `record_status` set explicitly; all rows fall back to the `new` default (Rule #1).
- No vendor names written into any non-commerce text (Rule #18).
- Loader run from project root, `semantius` CLI invoked directly (Rule #0, Rule #6).
- No JWT errors during the run.
