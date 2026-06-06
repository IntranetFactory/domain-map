# EM-FUND-PLATFORM audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 3 master entities (`fund_formations`, `spvs`, `spv_subscriptions`) and 5 embedded-master shells (`funds`, `lp_subscriptions`, `lp_commitments`, `capital_calls`, `cap_tables`) across 4 full modules (`EM-FUND-FORMATION`, `EM-FUND-SPV`, `EM-FUND-OPS-LITE`, `EM-FUND-CAPTABLE-LITE`). 6 capabilities all prefixed `EMFUND-*`. 4 primary solutions (Sydecar, AngelList Stack, Allocations, Vauban). 0 regulations linked. 1 trigger event (`fund_formation.operational`). 1 outbound + 0 inbound cross-domain handoffs. 0 intra-domain handoffs. 0 roles + 0 role_modules + 0 role_permissions. 0 system skills + 0 skill_tools links.
- Vendor-surface basis: Sydecar (SPV-led emerging-manager platform), AngelList Stack (originator of the rolling-fund + SPV bundle for solo GPs), Allocations (SPV + small fund bundling), Vauban (Carta's emerging-manager bundle). Cross-checked against Carta GP Books, Sydecar Fund, and the Republic Capital / Republic Fund layer for SPV-led raises; also checked against pure-play SPV bookers (Assure Holdings legacy, Republic).
- Catalog UX fields: empty (`catalog_tagline=''`, `catalog_description=''`).
- Domain Semantius score: **uncomputable**, F2/F3 fail (zero system skills across all 4 modules).
- Bundle-as-market status: this domain is the canonical case of the "bundle-only" classification (the description references the 5-criterion test). Architecturally a single-bundle deployable rather than four separately-purchasable products. Audit interprets the modules as **internal slices of the bundle** rather than independently-deployable shapes. Phase E roles still need to be loaded because the **operator personas** (solo GP, fund operations lead, LP-portal-only viewer) are real.
- **Bucket 1 (in-scope, agent fixable):** 18 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 6 items.

Structural pass: A1 pass; A2 pass; A3 pass; A4 fail (empty catalog UX). M1 + M2 + M4 + M6 + M7 pass; M5 partial fail (every lifecycle state has `domain_module_id=NULL`, including on master `fund_formations` which clearly belongs to module 26). B1 + B2 + B3 + B5 + B10b pass; B4 (pattern flags) partial pass; B6 + B7 + B8 + B9 + B9b + B11 + B12 all partial fail. C1 pass; C2 vacuously pass. D1 deferred (UI link in the per-bucket prompts). E1 through E6 all fail (zero roles loaded). F1 + F4 + F7 vacuously pass; F2 + F3 + F5 fail. H1 fails (1 of 1 cross-domain handoffs untagged).

### Vendor surface basis

Flagship picks track the "bundle-only" architecture this domain represents:

- **Sydecar.** Pure-play SPV-and-fund admin for solo GPs and microfunds. Single bundle; LPA, banking, SPV docs, capital calls, LP portal all under one umbrella. Schema reference for fund_formation, spv, spv_subscription, capital_call shapes.
- **AngelList Stack (now Republic Capital).** Originator of the rolling-fund + small-fund + SPV combo. The bundle that defined the market category.
- **Allocations.** SPV-led raise platform with light fund admin overlay. Reinforces the SPV-as-first-class entity (`spvs` master) and the SPV-subscription pattern.
- **Vauban (Carta).** Carta's emerging-manager bundle, paired with Carta's cap-table backbone. Validates the inclusion of `cap_tables` as an embedded shell (not full mastery) under `EM-FUND-CAPTABLE-LITE`.

Two adjacent shapes deliberately excluded: (a) full FUND-ADMIN suites (Allvue, eFront), which compete from above on the same workflows but at a different price-band and complexity tier (separate domain, already in catalog); (b) standalone cap-table tools (Carta, Pulley, AngelList Equity), which compete from below on a narrower workflow (separate domain CAP-TABLE).

### Bucket 1: In-scope confirmed gaps

#### MISSING (compliance-mandated regulations and references)

| ID | Entity | Proposed module | Notes |
|---|---|---|---|
| B1-M1 | `domain_regulations` rows linking EM-FUND-PLATFORM to: SEC Investment Advisers Act (Form ADV exempt reporting adviser regime), Reg D 506(b)/506(c) (private placement exemptions), FATCA, CRS, AML/BSA, state blue-sky filings | n/a (link rows) | Empty `domain_regulations`. ERA filing is universally applicable to emerging-manager GPs under the Adviser Act; Reg D governs the actual private placement of fund interests + SPV interests; FATCA/CRS governs LP tax-status during onboarding; AML/BSA is the KYC backbone; blue-sky is the per-state filing obligation. Verify each regulation exists in `/regulations` before linking. |

#### MISSING (workflow substrate the current footprint omits)

| ID | Entity | Proposed module | Vendor evidence |
|---|---|---|---|
| B1-W1 | `entity_filings` (or `formation_filings`) | EM-FUND-FORMATION | Universal in Sydecar, AngelList, Allocations. The state-level + IRS filings (Delaware certificate of formation, EIN application, blue-sky filings) are the durable artifacts of the formation workflow; separate from `fund_formations` (the case-shaped record) so multiple filings per formation can be tracked. |
| B1-W2 | `banking_onboardings` | EM-FUND-FORMATION | Universal. The Mercury / Brex / SVB banking-application step is a separately-tracked case with its own status, KYC checks, and approver. Sydecar and AngelList both expose this as a first-class entity in the GP dashboard. |
| B1-W3 | `lp_kyc_records` (shared shell with FUND-ADMIN) | EM-FUND-OPS-LITE | KYC/AML output + sanctions screening artifact for LP onboarding under the lite ops shape. Pattern from Sydecar's "investor verification" tab. Embedded shell (mastered by FUND-ADMIN if the customer ever migrates up the stack); load as `embedded_master` linked to canonical `lp_kyc_records` in FUND-ADMIN-LP-COMMITMENTS. |
| B1-W4 | `spv_kyc_records` | EM-FUND-SPV | Sydecar, Allocations, AngelList all run KYC per SPV subscription separately from fund-level KYC; the SPV-subscriber pool tends to be a wider, looser group than the LP base. Distinct entity to avoid conflating with `spv_subscriptions` (the legal commitment) and with `lp_kyc_records` (fund-level KYC). |
| B1-W5 | `templated_documents` (or `legal_templates`) | EM-FUND-FORMATION | The value-engineering of every flagship in this market is the templated LPA, side letter library, and SPV agreement set. Sydecar markets this explicitly. Worth modeling as a master so versioning and per-deployment overrides are queryable. |

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | A4 | `domains.catalog_tagline` and `catalog_description` are empty strings. Per Rule #20 buyer-voice surface is required; absence blocks the catalog UX. | Draft `catalog_tagline` (single-sentence buyer-voice one-liner) + `catalog_description` (1-3 buyer-voice paragraphs covering the bundle's workflow + value). Surface to user BEFORE writing per A4 fix discipline. |
| B1-S2 | B4 | Pattern flags partial pass. `spv_subscriptions` has `has_personal_content=true` (correct) but is missing `has_submit_lock=true` (sub docs lock on signature, universal in this market). `lp_subscriptions` (embedded shell from FUND-ADMIN) is fine since it inherits flags from the canonical master. `fund_formations` and `spvs` warrant `has_single_approver=true` (GP signs off on entity formation and SPV launch decisions). Re-evaluate per master and PATCH where the flag is genuinely true. | PATCH flags after re-confirmation; record the audit pass in the audit decisions, not in `notes` (Rule #15). |
| B1-S3 | B7 | Missing user-typed actor edges. `spv_subscriptions` has `has_personal_content=true` but no `users -> spv_subscriptions` edge for subscriber-of-record / reviewer-of-record. Existing user edges cover `fund_formations` (forms) and `spvs` (organizes) only. Three actor edges to add: `users -> spv_subscriptions` (verb: subscribes_via or invests_through), `users -> fund_formations` as reviewer/approver (distinct from forms), and once B1-W2/W4 land, `users -> banking_onboardings` (applies), `users -> spv_kyc_records` (verifies). | Author 3 to 5 edges per Rule #10 into `data_object_relationships` with `related_data_object_id` set to the actor's data_object and verb describing the role. |
| B1-S4 | M5 | All 6 `data_object_lifecycle_states` rows for `fund_formations` (3 states) and `spvs` (3 states) have `domain_module_id=NULL`. No states are `requires_permission=true` today, but the formation workflow has clear approval gates (GP sign-off, banking approval); once gates are loaded the prefix needs to resolve. Even without gates, M5 says non-gate states benefit from attribution. | PATCH `domain_module_id` per master: `fund_formations` states -> 26 (EM-FUND-FORMATION), `spvs` states -> 27 (EM-FUND-SPV). |
| B1-S5 | B11 | Aliases missing on 2 of 3 masters. `fund_formations` has 0 aliases (warrants `fund vehicle setup`, `entity formation`, `gp entity formation`). `spv_subscriptions` has 0 aliases (warrants `syndicate subscriptions`, `deal subscriptions`, `co-invest commitments`). `spvs` has 2 aliases (pass). | Author 3 to 4 alias rows on `fund_formations` + 3 alias rows on `spv_subscriptions`. |
| B1-S6 | F1 / F2 / F3 / F5 | Zero `skill_type='system'` skills exist for any of the 4 modules. Rule #17: every `domain_modules` row needs exactly one system skill with >= 1 `skill_tools` row. Semantius score uncomputable. | Author 4 system skills: `em_fund_formation_agent`, `em_fund_spv_agent`, `em_fund_ops_lite_agent`, `em_fund_captable_lite_agent`. Each gets 5-15 tools (query/mutate per master + workflow-gate tools per lifecycle state once B1-L gaps close). Skip channel primitives in favor of `notify_person` / `notify_team` abstractions per F7. |

#### MISSING (lifecycle states + trigger events)

| ID | Master | Missing states | Missing events |
|---|---|---|---|
| B1-L1 | `fund_formations` (781) | states present (3); needs `domain_module_id` per B1-S4. Workflow-gate: consider `requires_permission=true` on `filed` (legal review gate) or `operational` (banking + EIN gate). Add events: `fund_formation.filed`, `fund_formation.drafted` (existing event `.operational` is loaded). | `fund_formation.filed`, `fund_formation.drafted` (state-change events for the non-terminal transitions). |
| B1-L2 | `spvs` (782) | states present (3); needs `domain_module_id` per B1-S4. Workflow-gate consideration on `active` (deal-launch sign-off). | All three state transitions are unrepresented in `trigger_events`. Author: `spv.forming`, `spv.active`, `spv.wound_down`. |
| B1-L3 | `spv_subscriptions` (783) | 0 lifecycle states. Real workflow exists: `drafted`, `signed`, `funded`, `confirmed`. Per B12 a config-shape exemption is unlikely (the workflow IS the value). | After states load: `spv_subscription.signed`, `spv_subscription.funded`. |

#### BOUNDARY

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-B6 | B6 | Intra-domain `data_object_relationships` thin. Only 1 row exists: `spvs is subscribed via spv_subscriptions`. Missing high-confidence intra-domain edges: `fund_formations spawns spvs` (or `fund_formations parents spvs`; once a fund vehicle is operational the GP can launch SPVs under it), `fund_formations spawns cap_tables` (the GP entity needs its cap-table on day 1), `fund_formations spawns funds` (embedded shell becomes the runtime artifact). | Author 3 intra-domain edges as draft rows under `data_object_relationships` with verb + relationship_kind + is_required + owner_side. |
| B1-B9b | B9b | EM-FUND-PLATFORM has 4 modules and zero intra-domain `handoffs` rows. From the relationship graph and lifecycle states, expected intra-domain handoff candidates exist on at least: (EM-FUND-FORMATION -> EM-FUND-OPS-LITE) on `fund_formation.operational` (the existing event needs an intra-domain row paralleling the cross-domain row 1046, or the event implies the OPS-LITE module activates locally); (EM-FUND-FORMATION -> EM-FUND-CAPTABLE-LITE) on `fund_formation.operational` (cap-table provisioned at fund-vehicle ready); (EM-FUND-FORMATION -> EM-FUND-SPV) on `fund_formation.operational` (SPV launches gated on parent fund being live); (EM-FUND-SPV -> EM-FUND-OPS-LITE) on `spv.active` (SPV capital calls fold into the lite ops workflow). | Draft 3 to 4 intra-domain handoff rows with `source_domain_id = target_domain_id = 163`, `integration_pattern = lifecycle_progression`, `friction_level = low`. Resolve `source_domain_module_id` and `target_domain_module_id` per the master-resolution rule. |

#### APQC TAGGING

**Coverage (catalog quality):** 0 of 1 cross-domain handoffs has a `record_status='approved'` `handoff_processes` row.
**Provenance (process health):** 0 of 1 has any tag at all.

`agent_curated` proposals (B1-H1, one sub-table per handoff):

| Sub-id | Handoff | Direction | Trigger | Payload | Proposed APQC | PCF id | Confidence |
|---|---|---|---|---|---|---|---|
| B1-H1a | 1046 | EM-FUND-PLATFORM (EM-FUND-FORMATION) -> FUND-ADMIN (FUND-ADMIN-FUND-LEDGER) | `fund_formation.operational` | `funds` | `10737 Manage international funds/consolidation` *(low confidence; placeholder)*, OR defer to Discover Pass 3 for a closer fit such as a fund-launch / new-vehicle PCF row (none cleanly maps in cross-industry PCF). | 63 (low) | low: generic PCF match. The handoff is the migration-path signal from emerging-manager bundle to full FUND-ADMIN; PCF cross-industry has no direct row for fund-formation-to-fund-admin handoff. Recommend deferring to Discover Pass 3 with a custom-process candidate `private_capital.fund_formation_to_administration`. |

Deferred to Discover Pass 3 (1 of 1): handoff 1046 has only a low-confidence generic PCF match; the cleaner answer is a custom process row authored later. Volume against the 0.5N to 0.8N target (N=1 cross-domain handoff): 1 proposal at low confidence + 1 deferral candidate. With N=1 the volume math is uninformative; the substantive call is to surface 1046 for custom-process authoring.

### Bucket 2: Surface-for-user (judgment calls)

1. **Catalog UX content (A4).** `catalog_tagline` and `catalog_description` are empty. Per Rule #20 the agent drafts buyer-voice copy + surfaces for review BEFORE writing. Draft proposal: tagline = *"Stand up a microfund or SPV in days, run capital calls, and manage your LP portal, all from a single bundle priced for solo GPs."* Description (1-3 paras) needs user direction on tone (operator-led vs. brand-led) and whether to call out the upgrade path to full FUND-ADMIN. Surface for user choice; this audit produces no copy until the user approves.

2. **Modularization recommendation: collapse `EM-FUND-CAPTABLE-LITE` into `EM-FUND-FORMATION`?** `cap_tables` is the only embedded master in module 29 (EM-FUND-CAPTABLE-LITE), with a single capability (`EMFUND-CAPTABLE-LITE`). All flagship vendors in this market ship cap-table as a tab inside the fund-formation surface, not as a deployable on its own. Decide: keep current 4-module shape, or merge module 29 into module 26 (drops module count to 3, capabilities stay 6). Rule #14 still satisfied (3 modules >= 2 floor for 3-cap+ domains).

3. **Promote `EM-FUND-PLATFORM` to a `starter` kit pattern (Rule #19)?** The domain's own description calls it bundle-only and architecturally not separately-purchasable. The starter-kit shape (`module_kind='starter'`) explicitly models this case. Currently all 4 modules are `module_kind='full'`. Decide: convert 3 of 4 to `starter` (keeping FUND-FORMATION as the full anchor) or keep all 4 as full with a documented "bundle deploys atomically" understanding. The starter classification has implications for permissions materialization (3 baseline permissions per starter vs. lifecycle-gated permissions per full).

4. **`spv_subscriptions` pattern flags.** This master holds personal financial data + signed subscription docs + LP-side capital commitments. Default-false on `has_submit_lock` is almost certainly wrong (subscription docs lock once signed, universal in private placement law). Confirm `has_submit_lock=true`. Also possibly `has_single_approver=true` (GP signs the SPV-subscription accept).

5. **Pairwise reconciliation scope.** Cross-domain neighbors discovered: **FUND-ADMIN** (weight 1: 1 outbound handoff, no inbound; embedded shells of 4 FUND-ADMIN-mastered entities), **CAP-TABLE** (weight 1: 0 handoffs, embedded shell of `cap_tables`). Audit procedure says deep-dive at weight >= 3; neither neighbor crosses that bar. One-line summary suffices unless the user requests a deeper look. Recommendation: defer pairwise reconciliation.

### Bucket 3: Phase 0 pending (speculative; vendor-research vetting needed)

Candidate entities surfaced from flagship vendors but not yet confirmed by full Phase 0 vendor research:

| Candidate | Proposed module | Vendor evidence |
|---|---|---|
| `rolling_fund_periods` | EM-FUND-OPS-LITE | AngelList's rolling-fund product is the canonical case: quarterly subscription windows for a continuous fund vehicle. Distinct from `lp_subscriptions` (per-period vs. per-LP). |
| `gp_management_fees` | EM-FUND-OPS-LITE | Universal across Sydecar, AngelList, Vauban; the management fee schedule and accrual record. May overlap with FUND-ADMIN-level GP accounting; the lite version is simpler (single-class, flat fee). |
| `spv_carry_distributions` | EM-FUND-SPV | Sydecar, Allocations; per-SPV distribution event with embedded carry split. Distinct from any fund-level distribution row. |
| `lp_communication_log` | EM-FUND-OPS-LITE | LP portal vendors expose a per-LP communication history (notices, replies, document downloads). Configurable as embedded shell of a CRM-style communication entity. |
| `regulatory_filings` (Form D, Form ADV) | EM-FUND-FORMATION | Universal at the GP-startup workflow. Form D within 15 days of first sale of fund interest; Form ADV annual for ERA filers. May fold into `entity_filings` (B1-W1) depending on the user's scoping call. |
| `fund_class_terms` (LP-facing economic terms) | EM-FUND-OPS-LITE | Templated mgmt fee + carry + hurdle for the lite single-class shape. Vauban (Carta) and AngelList both expose this as a settable template. |

### Cross-bucket dependencies

- Bucket 1 B1-M1 (regulation links) is independent of every other bucket.
- Bucket 1 B1-W1/W2/W3/W4/W5 (substrate entities) interact with Bucket 2 #2 (collapse EM-FUND-CAPTABLE-LITE): the destination module for B1-W5 (`templated_documents`) shifts if the collapse happens.
- Bucket 1 B1-S6 (system skills) depends on B1-L1/L2/L3 (lifecycle states + events) because the skill's workflow-gate tools need the gates to exist first. Sequence: load lifecycle states (B1-L) before system skills (B1-S6).
- Bucket 2 #3 (starter-kit conversion) interacts with Bucket 1 B1-S6 (system skills) and the E-band (role design): starter kits ship 3 baseline permissions instead of lifecycle-gated permissions; the skill scope shifts accordingly. Sequence: settle Bucket 2 #3 before loading skills + roles.
- Bucket 3 candidates are mostly independent of Buckets 1 and 2. Exception: Bucket 3 `regulatory_filings` overlaps with Bucket 1 B1-W1 (`entity_filings`) and may collapse depending on the user's choice.
- Bucket 2 #1 (catalog UX copy) is independent of every other bucket and can be resolved standalone.

### Per-bucket prompts

**Bucket 1 prompt:** "Approve which of B1-M1, B1-W1..W5, B1-S1..S6, B1-L1..L3, B1-B6, B1-B9b, B1-H1a (defer-to-Discover-Pass-3)? The standard default is approve-all on B1-W and B1-S; B1-L sequences after Bucket 2 #3 decision; B1-H1a is a defer-to-Discover proposal, not a load."

**Bucket 2 prompt:** "Your call on each of the five judgment items: (1) catalog UX copy direction (tone + emphasis); (2) collapse EM-FUND-CAPTABLE-LITE into EM-FUND-FORMATION? (3) convert 3 of 4 modules to `module_kind='starter'` (Rule #19), or keep as full and document bundle-atomicity? (4) confirm `spv_subscriptions.has_submit_lock=true` (and possibly `has_single_approver=true`); (5) accept the one-line summary for pairwise neighbors FUND-ADMIN + CAP-TABLE, or request a deep-dive?"

**Bucket 3 prompt:** "Phase 0 formal vendor research on six candidates, eyeball-confirm, or skip-for-now? Default recommendation: eyeball-confirm `rolling_fund_periods` + `fund_class_terms` + `lp_communication_log` (all directly visible in 2+ flagship UIs), defer `gp_management_fees` and `spv_carry_distributions` until the Bucket 2 modularization + starter-kit decisions are settled, and merge `regulatory_filings` into B1-W1's `entity_filings` rather than carrying separately."

### Report-only follow-ups (owed by other domains)

| Owing domain | Owed item | Notes |
|---|---|---|
| FUND-ADMIN | B8 inbound relationship rows mirroring the outbound handoff 1046 (`fund_formation.operational` -> `funds`). The relationship `fund_formations becomes funds` already exists (verified above). Confirm during the next FUND-ADMIN audit pass. Also: when EM-FUND-PLATFORM publishes additional events (per B1-L gaps), FUND-ADMIN may owe new inbound relationships. | Routes to FUND-ADMIN's Pass-3 / Pass-4. Not a blocker here. |
| CAP-TABLE | If EM-FUND-CAPTABLE-LITE stays as its own module (Bucket 2 #2 = keep), CAP-TABLE may owe a defined cross-domain handoff for the upgrade path (microfund cap-table -> full ASC-718 cap-table). Currently 0 handoffs between the two; not necessarily a gap if the upgrade is via data migration rather than event. | Routes to CAP-TABLE's Pass-3 / Pass-4. Not a blocker here. |
| FUND-ADMIN, CAP-TABLE | B10b target_domain_module_id for handoff 1046 is already set (target_module_id=12). No outstanding module-FK gaps from EM-FUND-PLATFORM's side. | Pass on this row. |

### Candidate domains queued

No new candidate domains were surfaced by this audit. The "missing" markets adjacent to EM-FUND-PLATFORM (`AIFMD-DEPOSITARY`, `PRIV-CREDIT-LOAN-ADMIN`, `MGMT-CO-ACCT`, `REG-FUND-RPT`, `K1-TAX-DOCS`) were all already queued by the FUND-ADMIN audit pass and remain in `audits/_missing-domains.md` pending triage. The emerging-manager bundle pattern this domain represents is itself a previously-recognized market category (the existing `EM-FUND-PLATFORM` row); no further bundle-as-market candidates emerged from this pass.

### Decisions

_(empty until user reviews; agent flips status to feedback_needed below)_

### Fixes applied

_(none in this pass; read-only audit only)_

## 2026-05-31, Continuation: B1 technical fixes (residual)

### Scope

Residual B1 pass over `audits/EM-FUND-PLATFORM.md` (Validate b1, 2026-05-30). Applied only the subset of Bucket 1 findings that are truly technical: PATCHes derivable from existing modules and INSERTs to existing rows where the audit pre-specifies exact tuples. No new entities, no DMDOs, no module reshuffle, no judgment items.

Loader: [.tmp_deploy/fix_em_fund_platform_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_em_fund_platform_b1_technical_2026_05_31.ts) (8 writes, all idempotency-checked, all verified post-load).

### Fixes applied

| Audit ID | Fix type | Target | Result |
|---|---|---|---|
| B1-S4 | PATCH `data_object_lifecycle_states.domain_module_id` | rows 482 / 483 / 484 (`fund_formations` drafted / filed / operational) -> module 26 (EM-FUND-FORMATION); rows 479 / 480 / 481 (`spvs` forming / active / wound_down) -> module 27 (EM-FUND-SPV) | 6/6 PATCHed (all previously NULL) |
| B1-M1 (partial) | INSERT `domain_regulations` | (163, 49, mandatory) Bank Secrecy Act; (163, 50, mandatory) Foreign Account Tax Compliance Act | 2/2 inserted (new domain_regulations rows id=259, 260; `record_status='new'` per Rule #1) |

### Deferred (NOT in this technical pass)

| Audit ID | Reason |
|---|---|
| B1-M1 (remaining 4 of 6 candidates) | SEC Investment Advisers Act / Reg D 506(b)/506(c) / CRS / state blue-sky filings: regulation rows do not exist in `/regulations`. New `regulations` entities are out of B1-technical scope. |
| B1-W1..W5 | New substrate `data_objects` (`entity_filings`, `banking_onboardings`, `lp_kyc_records`, `spv_kyc_records`, `templated_documents`). "New entities" deferral. |
| B1-S1 (A4) | `catalog_tagline` / `catalog_description`: Rule #20 forbids load without surface-to-user. |
| B1-S2 | Pattern-flag PATCHes (`has_submit_lock`, `has_single_approver`): "pattern flag flips" deferral. |
| B1-S3 | `users -> spv_subscriptions` / `users -> fund_formations` reviewer edges: audit uses "verb: subscribes_via or invests_through" and "reviewer/approver" (user picks); not exact-tuple pre-specified. Tranche 2 (`users -> banking_onboardings`, `users -> spv_kyc_records`) gated on B1-W2/W4 entity creation. |
| B1-S5 | `data_object_aliases`: audit lists candidate forms (e.g. "fund vehicle setup", "syndicate subscriptions") but not exact (alias_name, alias_type) tuples for `fund_formations` / `spv_subscriptions`. "No bulk data_object_aliases unless audit pre-specifies exact tuples." |
| B1-S6 | System skills (`em_fund_formation_agent` etc.): full Phase-S load; gated on Bucket 2 #3 starter-kit conversion decision. |
| B1-L1..L3 | New `trigger_events` (`fund_formation.filed/.drafted`, `spv.forming/.active/.wound_down`, `spv_subscription.signed/.funded`) and new `data_object_lifecycle_states` on `spv_subscriptions`: new entities + audit notes "after states load" sequencing. |
| B1-B6 | Intra-domain `data_object_relationships` (`fund_formations spawns spvs / cap_tables / funds`): master-to-master edges, not user-edges. Out of "user-edges Rule #10" scope. |
| B1-B9b | Intra-domain `handoffs` (EM-FUND-FORMATION -> EM-FUND-OPS-LITE / -CAPTABLE-LITE / -SPV; EM-FUND-SPV -> EM-FUND-OPS-LITE): new `handoffs` rows, not PATCHes on existing rows. No pre-existing `handoff_id`. |
| B1-H1a | Defer-to-Discover-Pass-3 proposal on handoff 1046; not a load. |

Total: 8 writes applied across 2 finding types. 10 finding categories deferred per scope (new entities, judgment items, user-pick verb choices, pattern-flag flips, catalog UX, gating on Bucket 2 decisions).

### Verification

Post-load read-back confirms:
- `data_object_lifecycle_states` rows 479..484 each carry the expected `domain_module_id` (26 or 27 per master).
- `domain_regulations` rows 259, 260 link EM-FUND-PLATFORM to BSA + FATCA with `applicability='mandatory'` and `record_status='new'`.

UI: https://tests.semantius.app/domain_map/data_object_lifecycle_states
UI: https://tests.semantius.app/domain_map/domain_regulations

## 2026-05-31, Audit

### Summary

- Current footprint: 3 mastered entities (`fund_formations`, `spvs`, `spv_subscriptions`) and 5 embedded shells (`funds`, `lp_subscriptions`, `lp_commitments`, `capital_calls`, `cap_tables`) across 4 full modules (`EM-FUND-FORMATION`, `EM-FUND-SPV`, `EM-FUND-OPS-LITE`, `EM-FUND-CAPTABLE-LITE`). 6 capabilities. 4 primary solutions. 2 regulations linked (BSA, FATCA). 4 trigger events. 1 outbound cross-domain handoff (1046 -> FUND-ADMIN). 0 intra-domain handoffs. 0 roles + 0 role_modules + 0 role_permissions. 0 system skills + 0 skill_tools. 0 of 1 cross-domain handoffs APQC-tagged.
- Validate b1 structural pass: A1/A2/A3 pass; A4 fail (catalog_tagline + catalog_description still empty). M1/M2/M4/M6/M7 pass; M5 pass (all mastered-entity lifecycle states now carry `domain_module_id` after 2026-05-31 technical pass). B5 partial (spv_subscriptions still has 0 lifecycle states); B7 partial (3 pattern-flag gaps remain on spv_subscriptions / fund_formations / spvs); B9 partial (no user actor edge on spv_subscriptions despite has_personal_content=true); B9b partial (B1-S5 aliases missing on fund_formations + spv_subscriptions + capital_calls); B10b pass (handoff 1046 has both module FKs set); B11 partial (5 of 6 expected state-change events absent across fund_formations / spvs / spv_subscriptions); B12 fail (0 intra-domain handoffs across 4 modules). C1 pass; C2 vacuously pass. D1 deferred to UI link surfacing in per-bucket prompts. E1-E5 fail (zero roles loaded). F1 vacuous-pass; F2/F3/F5 fail (zero system skills across all 4 modules; Semantius score uncomputable). H1 fail (1 of 1 cross-domain handoffs untagged).
- Bucket 1 (in-scope, agent fixable): 15 items.
- Bucket 2 (surface-for-user, judgment): 5 items (carried from 2026-05-30).
- Bucket 3 (Phase 0 pending, speculative): 6 items (carried from 2026-05-30).

### Vendor surface basis

No new vendor pass this audit (structural re-validation only). Prior surface basis (Sydecar / AngelList Stack / Allocations / Vauban) carried verbatim from 2026-05-30 audit.

### Bucket 1, In-scope confirmed gaps

#### MISSING (entities)

| ID | Entity | Proposed module | Vendor evidence |
|---|---|---|---|
| B1-W1 | `entity_filings` | EM-FUND-FORMATION | Sydecar, AngelList Stack, Allocations |
| B1-W2 | `banking_onboardings` | EM-FUND-FORMATION | Sydecar, AngelList Stack |
| B1-W3 | `lp_kyc_records` (embedded shell from FUND-ADMIN) | EM-FUND-OPS-LITE | Sydecar |
| B1-W4 | `spv_kyc_records` | EM-FUND-SPV | Sydecar, Allocations, AngelList Stack |
| B1-W5 | `templated_documents` | EM-FUND-FORMATION | Sydecar (markets templated LPA + side letters explicitly) |

#### STRUCTURAL (band failures)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | A4 | `catalog_tagline` + `catalog_description` empty. Rule #20 forbids load without surface-to-user. | Draft buyer-voice copy and surface for explicit user approval; PATCH only with approved exact text. |
| B1-S2 | B7 | spv_subscriptions.has_submit_lock still false (sub docs lock on signature, universal); fund_formations + spvs may warrant has_single_approver=true (GP sign-off). | Re-confirm each flag with user; PATCH only the approved ones. |
| B1-S3 | B9 | spv_subscriptions has has_personal_content=true but zero user actor edges; lp_subscriptions has the user edges (onboarded by / reviewed by users) but spv_subscriptions does not. | Author 1-2 user edges per Rule #10 once verb selected by user; B1-W2/W4 entity creation gates further user-edges. |
| B1-S5 | B10b | Aliases missing on fund_formations (0), spv_subscriptions (0), capital_calls (0). spvs has 2, funds 2, cap_tables 2, lp_commitments 1. | Author 3-4 alias rows per gap after user supplies exact (alias_name, alias_type) tuples. |
| B1-S6 | F2 / F3 / F5 | Zero system skills across all 4 modules; Semantius score uncomputable. | Author 4 system skills (em_fund_formation_agent, em_fund_spv_agent, em_fund_ops_lite_agent, em_fund_captable_lite_agent), each with 5-15 tools. Gated on Bucket 2 #3 starter-kit conversion. |
| B1-S7 | E1-E5 | Zero roles + zero role_modules + zero role_permissions across the domain. Operator personas (solo GP, fund-ops lead, LP-portal-only viewer) are real per 2026-05-30 audit. | Author baseline roles + role_modules + workflow-gate role_permissions per module after lifecycle gates exist. Gated on Bucket 2 #3 and on B1-L1/L2/L3. |

#### MISSING (lifecycle states + trigger events)

| ID | Master | Missing |
|---|---|---|
| B1-L1 | fund_formations (781) | `fund_formation.drafted` + `fund_formation.filed` events (state-change for non-terminal transitions); evaluate `requires_permission=true` on `filed` (legal review) and `operational` (banking gate). |
| B1-L2 | spvs (782) | `spv.forming`, `spv.active`, `spv.wound_down` state-change events; evaluate workflow-gate on `active` (deal-launch sign-off). |
| B1-L3 | spv_subscriptions (783) | 0 lifecycle states exist. Real workflow: `drafted`, `signed`, `funded`, `confirmed`. After states load: `spv_subscription.signed`, `spv_subscription.funded` events. |

#### BOUNDARY

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-B6 | B9 | Intra-domain relationship graph thin. Existing: `fund_formations becomes funds` (872), `spvs is subscribed via spv_subscriptions` (871). Missing intra-domain edges: `fund_formations spawns spvs`, `fund_formations spawns cap_tables`. | Author 2 intra-domain edges in data_object_relationships with relationship_verb + relationship_kind + is_required + owner_side. |
| B1-B9b | B12 | 4-module domain with zero intra-domain handoffs. Candidates: (EM-FUND-FORMATION -> EM-FUND-OPS-LITE) on fund_formation.operational; (EM-FUND-FORMATION -> EM-FUND-CAPTABLE-LITE) on fund_formation.operational; (EM-FUND-FORMATION -> EM-FUND-SPV) on fund_formation.operational; (EM-FUND-SPV -> EM-FUND-OPS-LITE) on spv.active. | Draft 3-4 intra-domain handoff rows with source_domain_id=target_domain_id=163, integration_pattern=lifecycle_progression, friction_level=low. |

#### APQC TAGGING

| ID | Handoff | Direction | Trigger | Payload | Proposed PCF | Confidence |
|---|---|---|---|---|---|---|
| B1-H1a | 1046 | EM-FUND-PLATFORM (EM-FUND-FORMATION) -> FUND-ADMIN (FUND-ADMIN-FUND-LEDGER) | fund_formation.operational | funds | Defer to Discover Pass 3 (no clean cross-industry PCF row for fund-formation-to-fund-admin handoff). Candidate custom process: `private_capital.fund_formation_to_administration`. | low (deferral) |

Coverage (catalog quality): 0 of 1 cross-domain handoffs approved. Provenance (process health): 0 of 1 has any tag. Volume math uninformative at N=1; correct call is to defer 1046 to Discover Pass 3.

### Bucket 2, Surface-for-user (judgment calls)

All 5 items carried verbatim from 2026-05-30 audit (no user decision since):

1. Catalog UX copy (A4): tagline + 1-3 description paragraphs need buyer-voice direction (operator-led vs brand-led; whether to mention the upgrade path to full FUND-ADMIN). Rule #20 blocks the load until user supplies exact wording.
2. Modularization: collapse `EM-FUND-CAPTABLE-LITE` into `EM-FUND-FORMATION`? `cap_tables` is the only embedded master in module 29; flagship vendors ship cap-table as a tab inside fund-formation. Collapse drops module count to 3 (still satisfies Rule #14 floor).
3. Promote 3 of 4 modules to `module_kind='starter'` (Rule #19)? Domain's own description calls it bundle-only and architecturally not separately-purchasable. Decide: convert 3 to starter (keeping FUND-FORMATION as full anchor) or keep all 4 as full with documented bundle-atomicity.
4. spv_subscriptions pattern flags: confirm `has_submit_lock=true` (sub docs lock on signature, universal in private placement law). Also possibly `has_single_approver=true` (GP signs SPV subscription accept).
5. Pairwise reconciliation scope: cross-domain neighbors FUND-ADMIN (weight 1) and CAP-TABLE (weight 1) both below the weight-3 deep-dive bar. Confirm one-line summary suffices.

### Bucket 3, Phase 0 pending (speculative)

All 6 candidates carried verbatim from 2026-05-30 audit (no user decision since): `rolling_fund_periods`, `gp_management_fees`, `spv_carry_distributions`, `lp_communication_log`, `regulatory_filings`, `fund_class_terms`.

### Cross-bucket dependencies

- B1-S6 (system skills) and B1-S7 (roles) both depend on Bucket 2 #3 (starter-kit conversion) and on B1-L1/L2/L3 (lifecycle gates + events).
- B1-W1 destination module shifts if Bucket 2 #2 (collapse EM-FUND-CAPTABLE-LITE) is accepted (templated_documents may host differently).
- Bucket 3 `regulatory_filings` overlaps with Bucket 1 B1-W1 (`entity_filings`); may collapse depending on user scoping call.
- Bucket 2 #1 (catalog UX copy) is independent of every other bucket.

### Per-bucket prompts

Bucket 1: "Approve which of B1-W1..W5, B1-S1..S7, B1-L1..L3, B1-B6, B1-B9b, B1-H1a (defer)? Default: approve-all on B1-W and approve B1-B6/B1-B9b; S6/S7/L sequence behind Bucket 2 #3."
Bucket 2: "Your call on (1) catalog UX copy direction, (2) collapse EM-FUND-CAPTABLE-LITE, (3) starter-kit conversion, (4) spv_subscriptions pattern flags, (5) pairwise summary-only for FUND-ADMIN + CAP-TABLE?"
Bucket 3: "Phase 0 formal vetting, eyeball-confirm, or skip? Default: eyeball `rolling_fund_periods` + `fund_class_terms` + `lp_communication_log`; defer `gp_management_fees` + `spv_carry_distributions` until Bucket 2 settled; merge `regulatory_filings` into B1-W1."

### Decisions

_(empty until user reviews)_

### Fixes applied

_(none in this pass; structural re-validation only)_

UI: https://tests.semantius.app/domain_map/domains
UI: https://tests.semantius.app/domain_map/domain_modules

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
