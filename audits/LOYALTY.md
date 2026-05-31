---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 24
---

# LOYALTY (Customer Loyalty Management) - Audit History

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 5 masters (`loyalty_members`, `loyalty_transactions`, `loyalty_tiers`, `redemption_rewards`, `redemption_transactions`) + 1 contributor (`customers`). **ZERO `domain_modules` rows** (M1 hard fail). 8 capabilities. 8 solutions (7 primary + 1 partial). 2 regulations (GDPR, CPRA). 4 outbound handoffs. 3 inbound handoffs. 5 trigger events. 0 lifecycle states. 0 aliases. 0 intra-domain or cross-domain `data_object_relationships`. 0 `users` edges. 1 legacy domain-level system skill (`loyalty-system`, id 81) with 6 `skill_tools` rows, no module-level skill exists. APQC: 3 of 7 cross-domain handoffs carry a `discovery_substring` tag (record_status `new`), 0 `approved`, 0 `agent_curated`.
- **Vendor-surface basis:** Pure-play loyalty specialists (Antavo, LoyaltyLion, Yotpo, Annex Cloud, Marigold) plus enterprise suites (Salesforce Loyalty Management, SAP Emarsys Loyalty), aligned with the eight capabilities already linked. Compliance anchor: GDPR Articles 7/15/17 for consent and erasure on member profiles (member data is PII; loyalty profiles routinely carry preference signals beyond transactional fields).
- **Bucket 1 (in-scope, agent fixable):** 14 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 5 items.

**Structural verdict:** M-band fails outright (M1 hard fail, zero modules). Per the audit recipe, M-band gates every downstream concern (B / E / F all cascade). The catalog has loaded 5 masters + a system skill + handoffs + capabilities + solutions but no `domain_modules` row to anchor them, so Rule #14 is violated, F1/F2 cannot pass, B10b cannot resolve on either side of any cross-domain handoff, lifecycle states have no realizing module to anchor to, and the Semantius score for LOYALTY is uncomputable in the module-level form. The cure is a Phase-M load that authors at least two `domain_modules` rows (eight capabilities means ≥2 by Rule #14 M2), migrates the legacy skill to a module-level skill per Phase-S, and re-anchors the existing trigger events and handoffs.

**Semantic verdict:** the current footprint is sound on the transactional core (members, transactions, tiers, redemptions) but thin on the engagement and compliance surfaces flagship vendors actually ship. Five MISSING entities surfaced: GDPR consent records, data subject requests, unclaimed-property records (state escheatment for unredeemed balances), promotion campaigns (LOY-PROMOTION-ENG capability has no entity), and member referrals (sits on the LOYALTY ↔ REFERRAL-MKT boundary, queued as candidate market).

### Pass 3 - Neighbor discovery

Auto-derived from `handoffs` (source = LOYALTY or target = LOYALTY) plus contributor / consumer DMDOs on LOYALTY masters (LOYALTY is contributor on `customers` mastered in CRM / CSM / SUB-MGMT / CDP / MDM, see report-only follow-ups for the multi-master issue on `customers`).

| Neighbor | Outbound rows | Inbound rows | Edge weight | Deep-dive needed |
|---|---|---|---|---|
| B2C-COMM | 1 (`redemption_transaction.completed`) | 2 (`commerce_order.placed`, `fulfillment.delivered`) | 3 | yes |
| CRM | 1 (`tier.upgraded`) | 0 (LOYALTY is contributor on `customers`) | 2 | no, light summary |
| CDP | 0 | 1 (`segment.activated`) | 1 | no, light summary |
| MA | 1 (`member.lapsed`) | 0 | 1 | no, light summary |
| ERP-FIN | 1 (`loyalty_transaction.posted`) | 0 | 1 | no, light summary |

Deep-dive is gated on LOYALTY first acquiring modules (M1). Until then, every cross-domain edge sits with NULL `source_domain_module_id` (outbound) and the four-leg analysis cannot resolve `producer master + lifecycle state` (LOYALTY has no lifecycle states authored). Pass 4 deep-dives for B2C-COMM are queued as Bucket 1 follow-up after M1 cures.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL (S / A / M / B / C / E / F bands)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 / M2 / M6 (hard fail) | LOYALTY has 8 capabilities and zero `domain_modules` rows. Rule #14 requires ≥1 module per domain and ≥2 modules for domains with ≥3 capabilities. Every downstream band (B / E / F / handoff module-FKs) cascades from this. | Author the module split (proposal in Bucket 2 item 1): minimum 4 modules (`LOY-PROGRAM-MGT`, `LOY-MEMBER-MGT`, `LOY-LEDGER-REWARDS`, `LOY-PARTNER-PROMO`) with `domain_module_capabilities` covering all 8 existing capabilities, plus `domain_module_data_objects` for the 5 masters anchored at the right module. Phase-M loader pattern from `scripts/loaders/load_research.ts`. |
| B1-S2 | F2 | LOYALTY has zero module-level `skill_type='system'` skills (only the legacy domain-level `loyalty-system` id 81, `domain_module_id` NULL). Rule #17 requires exactly one system skill per module. | Phase-S loader: author one `<module_code_lower>_agent` skill per new module (e.g. `loy_member_mgt_agent`), each with ≥1 `skill_tools` row. Migrate the existing 6 tool links from skill 81 to the matching module skills (`query_loyalty_members` → `loy_member_mgt_agent`; `query_loyalty_transactions` + `query_loyalty_tiers` → `loy_ledger_rewards_agent`; etc.). |
| B1-S3 | F1 | Once module-level system skills exist, the legacy `loyalty-system` row (id 81, `domain_id=78`, `domain_module_id=NULL`) is obsolete. | DELETE skill id 81 and its 6 `skill_tools` rows AFTER the module-level skills + tools are in place. Strict ordering: deploy new first, then retire old. |
| B1-S4 | B12 / Rule #12 | Zero `data_object_lifecycle_states` rows on any of the 5 masters. Workflow-bearing masters: `loyalty_members` (active / lapsed / opted-out / closed), `loyalty_transactions` (pending / posted / reversed / expired), `loyalty_tiers` (config-shape, no workflow), `redemption_rewards` (draft / published / paused / discontinued), `redemption_transactions` (initiated / fulfilled / delivered / cancelled / refunded). | Phase-B loader: author state machines per master + `requires_permission` flags on workflow gates + `domain_module_id` per realizing module (M5). `loyalty_tiers` is the only config-shape exemption candidate; surface to user per Bucket 2 item 4. |
| B1-S5 | B11 | Zero `data_object_aliases` rows. Cross-vendor synonyms: `loyalty_members` ↔ `program_members` / `loyalty_program_subscribers`, `loyalty_transactions` ↔ `point_transactions` / `accrual_events`, `loyalty_tiers` ↔ `member_tiers` / `program_levels`, `redemption_rewards` ↔ `reward_catalog_items` / `redeemables`, `redemption_transactions` ↔ `reward_redemptions` / `burns`. | Phase-B loader: author 2 to 3 alias rows per master (cluster-drafts pattern). |
| B1-S6 | B6 | Zero intra-domain `data_object_relationships`. Expected edges: `loyalty_members has loyalty_transactions`, `loyalty_members belongs_to loyalty_tiers`, `loyalty_transactions accrues_to loyalty_members`, `redemption_transactions consumes loyalty_transactions`, `redemption_transactions redeems redemption_rewards`, `redemption_transactions issued_to loyalty_members`. | Phase-B loader, cluster-drafts pattern. Verb + inverse_verb + cardinality + owner_side per Rule #10. |
| B1-S7 | B7 / Rule #10 | Zero `users` edges. Expected actors: `loyalty_members` (account_manager when B2B2C), `loyalty_tiers` (config_author), `redemption_rewards` (catalog_owner), `loyalty_transactions` (adjustment_author for manual point adjustments), `redemption_transactions` (fulfillment_owner). | Phase-B loader: author 5 `data_object_relationships` rows against `data_objects.id=748` (`users` built-in). |
| B1-S8 | B8 outbound / Rule #10 | Zero cross-domain `data_object_relationships` rows for the 4 outbound handoffs. Each outbound handoff needs a mirror relationship row from LOYALTY's master to the target's master / payload. | Phase-B loader, four edges to author: (`loyalty_tiers signals CRM.customers`) for tier.upgraded; (`loyalty_members triggers_winback_on MA.audience_segments` or similar) for member.lapsed; (`loyalty_transactions accrues_to ERP-FIN.gl_journal_entries` or similar) for loyalty_transaction.posted; (`redemption_transactions fulfills_via B2C-COMM.commerce_orders`) for redemption_transaction.completed. Final verbs reviewed by user during loader draft. |
| B1-S9 | B10b outbound | All 4 outbound handoffs (ids 231, 232, 497, 498) have `source_domain_module_id = NULL`. Per the B10b derivation rule the missing module is the LOYALTY module that masters each event's `data_object_id`, which today is undefined because LOYALTY has zero modules. Resolves automatically AFTER B1-S1 cures. | Re-run B10b backfill (`backfill_*_handoff_modules` loader pattern) AFTER M1 lands. |
| B1-S10 | A4 / Rule #20 | `catalog_tagline` and `catalog_description` are both empty strings. Buyer-shaped fields are required by Rule #20 for the catalog UI. | Draft in buyer voice (workflow + value), surface to user for approval per Rule #20 (see Bucket 2 item 2 for proposed wording). |
| B1-S11 | C2 | LOYALTY business function ownership is Marketing (owner) + Customer Success (contributor). Two capabilities likely diverge: `LOY-MEMBER-PORTAL` (Customer Success owner more natural than Marketing) and `LOY-POINTS-LEDGER` (Finance ownership for accrual liability accounting). | Add 2 `business_function_capabilities` rows where capability ownership differs from domain RACI. User reviews proposed function assignments. |

#### MISSING (compliance and engagement surface)

| ID | Entity | Proposed module (per Bucket 2 item 1) | Basis | Notes |
|---|---|---|---|---|
| B1-M1 | `gdpr_consent_records` | LOY-MEMBER-MGT | GDPR Art. 7 + CPRA | Loyalty profiles routinely carry preference signals (channel opt-in, partner data-share consent, behavioral tracking). The current model has no consent capture surface. Antavo, LoyaltyLion, Salesforce Loyalty all ship this. |
| B1-M2 | `data_subject_requests` | LOY-MEMBER-MGT | GDPR Art. 15-22 + CPRA | Erasure / access / rectification request tracking. Universal across all flagship vendors. |
| B1-M3 | `unclaimed_property_records` | LOY-LEDGER-REWARDS | State escheatment laws (US) | Unredeemed balances may be subject to state escheatment if the program qualifies as stored value. Material for any sizeable program. Surfaces in Antavo and SAP Emarsys documentation. |
| B1-M4 | `promotion_campaigns` | LOY-PARTNER-PROMO (or LOY-PROGRAM-MGT) | LOY-PROMOTION-ENG capability already exists | Capability `LOY-PROMOTION-ENG` (id 291) has no entity backing it. Vendors universally ship a promotions/campaigns master (bonus points campaigns, tier acceleration windows, reward boost periods). |
| B1-M5 | `member_communications_preferences` | LOY-MEMBER-MGT | CAN-SPAM + GDPR + CPRA | Channel-level opt-in/opt-out is required at the program level (loyalty is opt-in commerce; consent withdrawal must propagate). Salesforce Marketing Cloud Engagement (the partial-coverage solution already in the catalog) signals this gap. |

#### APQC TAGGING (H1)

7 cross-domain handoffs to tag. 3 already carry `discovery_substring` rows at `record_status='new'` (handoff 232 → PCF 18925 acquire-members; handoff 478 → PCF 10148 channel-segment-measures; handoff 505 → PCF 10197 fulfillment). All require reviewer approval; flagged for human triage. 4 untagged handoffs need new `agent_curated` proposals.

**Proposed agent_curated tags (new rows):**

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id (external_id) | confidence |
|---|---|---|---|---|---|---|
| 231 | LOYALTY → CRM | tier.upgraded | loyalty_tiers | Build engagement and relationship with members | 642 (18926) | confident L4 |
| 497 | LOYALTY → ERP-FIN | loyalty_transaction.posted | loyalty_transactions | Monitor customer loyalty program benefits to the enterprise and the customer | 643 (16633) | confident L4 |
| 498 | LOYALTY → B2C-COMM | redemption_transaction.completed | redemption_transactions | Optimize loyalty program value to both the enterprise and the customer | 644 (18927) | confident L4 |
| 324 | B2C-COMM → LOYALTY | commerce_order.placed | commerce_orders | Acquire members to customer loyalty program | 641 (18925) | confident L4 (members earn on orders; acquisition / engagement trigger) |

**Existing discovery_substring tags awaiting review:** handoff 232 (PCF 18925, acquire-members; aligns well, recommend approve), handoff 478 (PCF 10148 channel/segment measures, looser fit, recommend re-tag to PCF 642 build-engagement on review), handoff 505 (PCF 10197 fulfillment, reasonable as redemption fulfillment, recommend approve).

**Coverage rollup (per Rule #15 / H1 reporting discipline):**

- **Catalog quality (headline):** 0 of 7 cross-domain handoffs carry an `approved` APQC tag. 0% coverage.
- **Process health (side-bar):** 0 `agent_curated` exist today; this audit proposes 4 new `agent_curated` rows (rounded to 0.57N = 4 of 7, within the 0.5N to 0.8N audit-target window).

No handoffs are deferred to Discover Pass 3 for custom processes; APQC PCF "Manage customer loyalty program" cluster (18924) covers the LOYALTY surface adequately.

#### BOUNDARY findings per neighbor

| Neighbor | Edge weight | Findings |
|---|---|---|
| B2C-COMM | 3 | Pass-4 deep-dive blocked by M1. After M1 cures: verify `loyalty_members` (or `loyalty_program_enrollments`) is loaded as a B2C-COMM consumer DMDO so commerce_order.placed can deterministically resolve to a member balance update. Verify redemption_transaction.completed payload module-FK after B2C-COMM modules accept the inbound. |
| CRM | 2 | LOYALTY contributes to CRM-mastered `customers`. tier.upgraded outbound exists. Once LOYALTY modules exist, ensure CRM-ACCT-MGT (which already carries `loyalty_tiers` as consumer per DMDO row in module 46) gets an explicit `data_object_relationships` mirror per Pass-4 Section 5. |
| CDP | 1 | Light summary: inbound segment.activated arrives with no LOYALTY-side consumer DMDO. After M1, declare LOYALTY-MEMBER-MGT as a `consumer` on `audience_segments` (or `embedded_master` if LOYALTY local-masters the segment shell). |
| MA | 1 | Light summary: outbound member.lapsed delivers to MA. After M1, MA-side B10b should resolve target_domain_module_id to the lifecycle / win-back module. |
| ERP-FIN | 1 | Light summary: outbound loyalty_transaction.posted carries the liability journal signal. ERP-FIN owes a consumer DMDO on `loyalty_transactions` or an embedded payload pattern. Reported only; not LOYALTY's audit. |

### Bucket 2 - Surface-for-user (judgment calls)

1. **Module split proposal.** LOYALTY has 8 capabilities and zero modules. Eight capabilities cleanly group into 4 modules:
   - **LOY-PROGRAM-MGT** (capabilities: LOY-PROGRAM-MGT, LOY-TIER-MGT): masters `loyalty_tiers`. Houses program design, tier rules, configuration.
   - **LOY-MEMBER-MGT** (capabilities: LOY-MEMBER-MGT, LOY-MEMBER-PORTAL): masters `loyalty_members`. Houses enrollment, profile, portal, consent.
   - **LOY-LEDGER-REWARDS** (capabilities: LOY-POINTS-LEDGER, LOY-REWARDS-CAT): masters `loyalty_transactions`, `redemption_rewards`, `redemption_transactions`. Houses accrual, ledger, catalog, redemption.
   - **LOY-PARTNER-PROMO** (capabilities: LOY-PARTNER-ECO, LOY-PROMOTION-ENG): masters `promotion_campaigns` (proposed in B1-M4). Houses partner coalitions, promotions, bonus campaigns.
   - **Question:** approve the 4-module shape, or prefer (a) 3 modules with PARTNER and PROMO folded into LEDGER, (b) 2 modules (LOY-CORE + LOY-ENGAGEMENT) to satisfy minimum Rule #14 floor, (c) some other split? Dependency: every B1 STRUCTURAL fix that needs a `domain_module_id` (B1-S4 lifecycle anchors, B1-S2 system skills, B1-S9 handoff source FK backfill) waits on this answer.
2. **Catalog UX wording (Rule #20).** Proposed drafts (please review and rewrite as needed, per Rule #20 no auto-write):
   - **catalog_tagline (single sentence, buyer-facing):** "Reward repeat customers with points, tiers, and personalized perks that grow customer lifetime value."
   - **catalog_description (3 short paragraphs, buyer voice):** Paragraph 1: enrollment, member profiles, tier progression. Paragraph 2: points accrual rules, rewards catalog, redemption workflows, partner coalitions. Paragraph 3: program analytics, member portal / mobile app, integration with commerce, CRM, marketing automation. Approve, rewrite, or delegate to marketing.
3. **`loyalty_tiers` lifecycle exemption (B12 config-shape).** `loyalty_tiers` is a config table (program designer authors tiers once, occasionally edits qualifying thresholds; no per-row workflow). Per Rule #12, config-shape masters are exempt from lifecycle states; per Rule #15 the exemption used to require a `data_objects.notes` annotation but that license is rescinded. Decide: (a) accept the exemption, no lifecycle states authored, no notes written; (b) load minimal states (`draft`, `active`, `retired`) for audit traceability anyway; (c) defer until program-of-records pattern is reviewed.
4. **Pattern flags on masters (B4).** Default-false flags on all 5 masters. Re-evaluate per Rule #12: `loyalty_members.has_personal_content` is likely TRUE (loyalty profiles carry preferences, communication history, partner data-share consent). Others (submit_lock, single_approver) probably remain FALSE for all masters. Decide which to flip.
5. **`customers` (data_object 97) multi-master conflict.** LOYALTY is `contributor + required` on `customers` (97). Catalog-wide query shows 5 domains claim `role='master'` on this same `data_object_id`: CRM (canonical), CSM, SUB-MGMT, CDP, MDM. This is a catalog-wide M7 hard fail that LOYALTY did not cause (LOYALTY only contributes). Report-only for LOYALTY (the fix lives in whichever domain agrees to demote). Flagging because the LOYALTY audit observed it; the cure routes to a catalog-wide MDM / CDP audit, not this domain's fix-loop.

### Bucket 3 - Phase 0 pending (speculative; vendor-research vetting needed)

| Candidate | Proposed module | Vendor evidence |
|---|---|---|
| `member_referrals` | LOY-MEMBER-MGT (or new REFERRAL-MKT domain if candidate is promoted) | LoyaltyLion, Yotpo, Antavo (built-in referral programs); also covered by referral-specialist queued candidate `REFERRAL-MKT` in `_missing-domains.md` |
| `partner_programs` | LOY-PARTNER-PROMO | LOY-PARTNER-ECO capability points at this gap; vendor coverage: Annex Cloud, Marigold, Salesforce Loyalty (partner / coalition modules) |
| `tier_qualification_periods` | LOY-PROGRAM-MGT | Tier earn/maintain windows (12-month rolling, calendar year, lifetime). Salesforce Loyalty + Antavo; vendor-shape varies |
| `gamification_badges` | LOY-MEMBER-MGT | Antavo (badges, missions, achievements); not universal; flag as specialist |
| `point_expiration_policies` | LOY-LEDGER-REWARDS | Universal (Annex Cloud, LoyaltyLion, Antavo, SAP Emarsys) but unclear whether shipped as a separate config master or fields on `loyalty_tiers` |

### Cross-bucket dependencies

- **Bucket 1 STRUCTURAL items B1-S1 through B1-S9 depend on Bucket 2 item 1.** Until the module split is approved, the Phase-M loader cannot draft. B1-S4 (lifecycle states), B1-S2 (system skills), B1-S9 (B10b source-FK backfill) all need a stable `domain_module_id` map.
- **Bucket 1 B1-M5 (`member_communications_preferences`) overlaps Bucket 3 candidate `member_referrals`** if the user routes referrals to a separate LOY-MEMBER-COMMS module (alternative split). Resolution path: confirm Bucket 2 item 1's 4-module split first.
- **Bucket 1 B1-M3 (`unclaimed_property_records`) depends on Bucket 2 item 1 routing decision** for whether the entity sits in LOY-LEDGER-REWARDS or in a hypothetical compliance module. Default proposal: LOY-LEDGER-REWARDS.
- **Bucket 3 candidates may shift to Bucket 1** if user picks the "eyeball-mode" route (per audit-procedure Step 3). Most-likely-confirmed-on-eyeball: `partner_programs` (capability already exists), `point_expiration_policies` (universal).
- **Bucket 2 item 5 (`customers` multi-master)** is independent of every other LOYALTY item; it routes to a catalog-wide cleanup audit.

### Per-bucket prompts

**After Bucket 1:** "Fourteen STRUCTURAL + MISSING + APQC fixes queued, of which 9 depend on the Bucket 2 item 1 module split decision. Approve all that are independent now (B1-S5, B1-S7 partial, B1-S10, B1-S11, APQC tags) and hold the 9 module-dependent items until Bucket 2 item 1 resolves? Or batch everything and approve in one go after the module split is settled?"

**After Bucket 2:** "Item 1 (module split) is the gating decision; please pick a shape (4-module proposal, 3-module fold, 2-module minimum, or other). Items 2 (catalog UX wording), 3 (loyalty_tiers exemption), 4 (pattern flags) can be answered independently. Item 5 (`customers` multi-master) is report-only, no LOYALTY action expected. Please answer per item."

**After Bucket 3:** "Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates ring true and they become Bucket 1 items in a follow-up pass. If formal Phase 0 vetting preferred, I will dispatch a vendor-surface subagent focused on these 5 candidates."

### Report-only follow-ups (owed by other domains)

- **`customers` (data_object 97) multi-master** (Bucket 2 item 5 detail): 5 domains carry `role='master'` on the same data_object id. Catalog-wide M7 hard fail. Not LOYALTY's responsibility to cure; surfaces here only because the LOYALTY audit observed it via the `customers` contributor DMDO. Route to a catalog-wide audit covering CRM / CSM / SUB-MGMT / CDP / MDM ownership negotiation.
- **B2C-COMM B9 ownership on the inbound `fulfillment.delivered` (505) and `commerce_order.placed` (324) handoffs into LOYALTY:** target_domain_module_id is NULL on both. Resolves on LOYALTY's side only after B1-S1 (Bucket 1 module split). Source-side `source_domain_module_id` should already be wired by B2C-COMM; verify on next B2C-COMM audit.
- **CDP B9 ownership on inbound `segment.activated` (478) into LOYALTY:** same NULL target_domain_module_id pattern. Resolves after B1-S1.
- **CRM Pass-4 mirror relationship:** when CRM-ACCT-MGT is re-audited, verify it carries a `data_object_relationships` row mirroring the LOYALTY `tier.upgraded` outbound (CRM consumes `loyalty_tiers` via DMDO 46 already, but the relationship row is missing on both sides).
- **MA B10b inbound target_module_id resolution** on `member.lapsed` (232) handoff. Currently target_domain_module_id is NULL; resolves on MA's next audit.
- **ERP-FIN consumer DMDO** on `loyalty_transactions` (264): no ERP-FIN module declares `consumer` / `contributor` on this data_object today, yet handoff 497 (`loyalty_transaction.posted` → ERP-FIN) implies one. Route to ERP-FIN's next audit for B10b inbound resolution.

### Candidate domains queued

Two candidates queued via `scripts/analytics/append_missing_domain.ts`:

1. **PROMO-ENGINE - Promotion and Coupon Engine** (Talon.One, Voucherify, Cheetah Digital Promotions, SessionM Promotions). Adjacent to LOYALTY (LOY-PROMOTION-ENG capability overlaps) but a distinct point-solution market on cart-level rule evaluation, coupon code lifecycle, fraud detection. Pure-play vendors compete independently of loyalty suites.
2. **REFERRAL-MKT - Referral Marketing** (Friendbuy, ReferralCandy, Yotpo Referrals, Mention Me, Talkable, Extole). Often bundled into LOYALTY suites (Yotpo Loyalty & Referrals, LoyaltyLion Refer-a-Friend) but multiple pure-play vendors exist. Triage decision: promote-as-domain, fold-into-LOYALTY, or reject.

Both entries appended to `audits/_missing-domains.md` for human triage per the queue's promotion / fold / reject workflow.

## 2026-05-31, Continuation: B1 technical fixes

### Scope

Applied truly-technical B1 fixes only (audit-pre-specified tuples that do not require user judgment). Module-split-gated and judgment items deferred.

### Applied (2 inserts via `.tmp_deploy/fix_loyalty_b1_technical_2026_05_31.ts`)

| Action | Row | Status |
|---|---|---|
| INSERT `handoff_processes` | handoff 231 (LOYALTY tier.upgraded -> CRM) -> process 642 (PCF 18926, "Build engagement and relationship with members"), proposal_source=agent_curated | new (hp.id=563) |
| INSERT `handoff_processes` | handoff 497 (LOYALTY loyalty_transaction.posted -> ERP-FIN) -> process 643 (PCF 16633, "Monitor customer loyalty program benefits ...") | new (hp.id=564) |

### Deferred (16 items)

| Audit ID | Reason for defer |
|---|---|
| B1-S1 (4-module split) | Gated on Bucket 2 item 1 user pick; new entities (modules). |
| B1-S2 (module-level system skills) | Gated on B1-S1 (needs module IDs); new entities (skills + skill_tools). |
| B1-S3 (DELETE legacy skill 81 + 6 skill_tools) | Strict ordering per audit: must follow B1-S2 cure; defer until module-level skills exist. |
| B1-S4 (lifecycle states across 5 masters) | Gated on B1-S1 (needs `domain_module_id` per state); Bucket 2 item 3 user pick for `loyalty_tiers` exemption. |
| B1-S5 (data_object_aliases, 5 masters) | Audit gives candidate forms ("2-3 alias rows per master") but does not pre-specify exact tuples (Rule per prompt: bulk aliases require pre-specified tuples). |
| B1-S6 (intra-domain `data_object_relationships`, 6 edges) | Out of B1-technical scope (only `users` edges in scope); also no full tuples (no verb / inverse_verb / cardinality / owner_side specified). |
| B1-S7 (`users` edges, 5 actor labels) | Actor labels named (account_manager, config_author, catalog_owner, adjustment_author, fulfillment_owner) but no verb / inverse_verb / cardinality / owner_side tuples. Not pre-specified per Rule #10. |
| B1-S8 (cross-domain relationships, 4 edges) | Audit explicitly states "Final verbs reviewed by user during loader draft"; also gated on B1-S1. |
| B1-S9 (B10b source FK backfill) | Audit explicitly states "Resolves automatically AFTER B1-S1 cures". |
| B1-S10 (catalog_tagline / catalog_description) | Rule #20: surface to user before write (Bucket 2 item 2 wording already drafted, awaiting approval). |
| B1-S11 (`business_function_capabilities` for LOY-MEMBER-PORTAL, LOY-POINTS-LEDGER) | Audit explicitly states "User reviews proposed function assignments"; new contributors / consumers excluded per prompt. |
| B1-M1 .. B1-M5 (5 missing entities: gdpr_consent_records, data_subject_requests, unclaimed_property_records, promotion_campaigns, member_communications_preferences) | New entities (DMDOs / data_objects) excluded per prompt; also gated on B1-S1 module split. |
| APQC tag for handoff 324 (LOYALTY <- B2C-COMM commerce_order.placed -> PCF 641) | Existing handoff_processes row (hp.id=442) already points at PCF 132 / 18924 parent cluster. Replacement / coexistence is judgment, not mechanical. |
| APQC tag for handoff 498 (LOYALTY redemption_transaction.completed -> B2C-COMM -> PCF 644) | Existing handoff_processes row (hp.id=443) already points at PCF 132 / 18924 parent cluster. Same reason. |
| APQC `record_status` flips on handoffs 232, 478, 505 (discovery_substring -> approved or re-tag) | Rule #1: never flip record_status without explicit per-load user approval. |

### Audit accuracy note

Audit Coverage rollup states "0 `agent_curated` exist today" for LOYALTY's 7 cross-domain handoffs. Live state at fix-pass time shows 2 pre-existing `agent_curated` rows (hp.id=442, hp.id=443 on handoffs 324, 498, pointing at PCF 132 / 18924). After this pass: 4 `agent_curated` rows on 4 distinct handoffs (231, 324, 497, 498), 0 `approved`. Catalog quality headline remains 0%.

### Loader

`c:/dev/domain-map/.tmp_deploy/fix_loyalty_b1_technical_2026_05_31.ts`

### UI

- https://tests.semantius.app/domain_map/handoff_processes
