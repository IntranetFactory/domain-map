# LOYALTY audit history

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
| FIN | 1 (`loyalty_transaction.posted`) | 0 | 1 | no, light summary |

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
| B1-S8 | B8 outbound / Rule #10 | Zero cross-domain `data_object_relationships` rows for the 4 outbound handoffs. Each outbound handoff needs a mirror relationship row from LOYALTY's master to the target's master / payload. | Phase-B loader, four edges to author: (`loyalty_tiers signals CRM.customers`) for tier.upgraded; (`loyalty_members triggers_winback_on MA.audience_segments` or similar) for member.lapsed; (`loyalty_transactions accrues_to FIN.gl_journal_entries` or similar) for loyalty_transaction.posted; (`redemption_transactions fulfills_via B2C-COMM.commerce_orders`) for redemption_transaction.completed. Final verbs reviewed by user during loader draft. |
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
| 497 | LOYALTY → FIN | loyalty_transaction.posted | loyalty_transactions | Monitor customer loyalty program benefits to the enterprise and the customer | 643 (16633) | confident L4 |
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
| FIN | 1 | Light summary: outbound loyalty_transaction.posted carries the liability journal signal. FIN owes a consumer DMDO on `loyalty_transactions` or an embedded payload pattern. Reported only; not LOYALTY's audit. |

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
- **FIN consumer DMDO** on `loyalty_transactions` (264): no FIN module declares `consumer` / `contributor` on this data_object today, yet handoff 497 (`loyalty_transaction.posted` → FIN) implies one. Route to FIN's next audit for B10b inbound resolution.

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
| INSERT `handoff_processes` | handoff 497 (LOYALTY loyalty_transaction.posted -> FIN) -> process 643 (PCF 16633, "Monitor customer loyalty program benefits ...") | new (hp.id=564) |

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

## 2026-05-31, Audit

### Summary

- **Current footprint:** domain id 78, 0 `domain_modules` (M1 hard fail), 8 capabilities, 5 masters (`loyalty_members` 263, `loyalty_transactions` 264, `loyalty_tiers` 265, `redemption_rewards` 717, `redemption_transactions` 718) + 1 contributor (`customers` 97), 8 solutions (7 primary + 1 partial), 2 regulations (GDPR, CPRA), 5 trigger events, 7 cross-domain handoffs (4 outbound: 231, 232, 497, 498; 3 inbound: 324, 478, 505), 0 lifecycle states, 0 aliases, 0 `data_object_relationships` rows touching any LOYALTY master, 1 legacy domain-level system skill (`loyalty-system` id 81, `domain_module_id=NULL`) with 6 `skill_tools` rows, 0 module-level skills. APQC tags exist on 7 of 7 cross-domain handoffs (4 `agent_curated`, 3 `discovery_substring`), 0 `approved`.
- **Vendor-surface basis:** Pure-play loyalty specialists (Antavo, LoyaltyLion, Yotpo, Annex Cloud, Marigold) plus enterprise suites (Salesforce Loyalty Management, SAP Emarsys Loyalty) already linked. Compliance anchor: GDPR Articles 7/15/17 for consent and erasure on member profiles; US state escheatment for unredeemed balances.
- **Bucket 1 (in-scope, agent fixable):** 13 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 5 items.

**Structural verdict:** M-band still fails outright (M1 hard fail, zero modules). Every downstream band cascades from this: Rule #14 is violated, F2 cannot pass, B10b cannot resolve on either side of any handoff, lifecycle states have no realizing module to anchor to, the Semantius score for LOYALTY is uncomputable in the module-level form. Two `handoff_processes` rows were added in the prior fix pass (handoffs 231 + 497), so APQC coverage by volume is now complete (7 of 7), but the catalog-quality headline remains 0% (no `approved` rows).

**Semantic verdict:** unchanged from prior audit. Five MISSING entities (gdpr_consent_records, data_subject_requests, unclaimed_property_records, promotion_campaigns, member_communications_preferences) still candidate; all five remain gated on Bucket 2 item 1 (module split).

### Correction to prior audit

The 2026-05-30 audit Bucket 2 item 5 claimed `customers` (data_object 97) has 5 `role='master'` rows across CRM, CSM, SUB-MGMT, CDP, MDM. Live query at audit time returns **only one** `master` row, in CRM-ACCT-MGT (module 46, domain CRM). M7 catalog-wide single-master on `customers` PASSES. The prior claim was incorrect; no catalog-wide cleanup needed for the `customers` master, and Bucket 2 item 5 from the prior audit is dropped.

### Pass 1 - Structural (S/A/M/B/C/D/E/F/H bands)

| Band | Check | Result |
|---|---|---|
| S1 | FK coverage to `domains` | `domain_modules`=0 (FAIL via M1), `capability_domains`=8, `solution_domains`=8, `business_function_domains`=2, `domain_regulations`=2, `domain_data_objects`=6, `handoffs` source=4, target=3, `skills`=1 (legacy, F1). |
| S2 | Per-module DMDO + capability coverage | Vacuous (0 modules). |
| S3 | Per-master indirect coverage (states / events / aliases) | `loyalty_members`: 0 / 1 / 0. `loyalty_transactions`: 0 / 1 / 0. `loyalty_tiers`: 0 / 1 / 0. `redemption_rewards`: 0 / 1 / 0. `redemption_transactions`: 0 / 1 / 0. All masters have 0 lifecycle states (B12), 0 aliases (B11), and the only trigger event per master is the one carrying the existing outbound handoff. |
| A1 | `domains` business metadata | PASS. crud_percentage=88, business_logic set, min_org_size=`10 xs <50`, cost_band=`$$$`, certification_required=false, usa_market_size_usd_m=800, market_size_source_year=2025. |
| A2 | Capabilities | PASS. 8 rows (LOY-PROGRAM-MGT, LOY-MEMBER-MGT, LOY-POINTS-LEDGER, LOY-REWARDS-CAT, LOY-TIER-MGT, LOY-PROMOTION-ENG, LOY-PARTNER-ECO, LOY-MEMBER-PORTAL). |
| A3 | Solutions + coverage_level | PASS. 7 primary, 1 partial, every row has `coverage_level`. |
| A4 | `catalog_tagline` / `catalog_description` (Rule #20) | FAIL. Both empty. Routes to Bucket 1 STRUCTURAL B1-S10; wording goes via Bucket 2 item 2. |
| M1 | ≥1 `domain_modules` row | HARD FAIL. Zero modules. Gates B / C / D / E / F. |
| M2 | ≥2 modules for ≥3-capability domain | HARD FAIL by inheritance from M1 (8 capabilities, 0 modules). |
| M4 | Every capability has a realizing module | FAIL. All 8 capabilities orphaned. |
| M5 | Workflow-gate states have `domain_module_id` | Vacuous (0 states). |
| M6 | Every module realizes ≥1 capability | Vacuous (0 modules). |
| M7 | Catalog-wide single-master + within-domain coherence | PASS. `customers` (97) has exactly one master row (CRM-ACCT-MGT). All 5 LOYALTY masters have exactly one `role='master'` row each. |
| M8 | Module-level catalog UX fields | Vacuous (0 modules). |
| B1 | ≥1 master | PASS. 5 masters. |
| B2 | `singular_label` + `plural_label` on every master | PASS. All 5 masters carry both. |
| B3 | Naming arbitration (Rule #9) | PASS. All 5 names prefixed (`loyalty_*`, `redemption_*`); no bare-word claim needed. |
| B4 | Pattern flags considered (Rule #12) | FAIL (consideration not recorded). All flags default-false on all 5 masters. Re-evaluation required per Bucket 2 item 4 (likely candidate: `loyalty_members.has_personal_content=true`). |
| B5 | `embedded_master` integrity | Vacuous (no embedded_master rows). |
| B6 | Intra-domain `data_object_relationships` | FAIL. Zero rows touching any LOYALTY master. Expected ≥6 edges. |
| B7 | `users` edges (Rule #10) | FAIL. Zero rows. Expected ≥5 actor labels across 5 masters. |
| B8 | Cross-domain outbound `data_object_relationships` | FAIL. Zero outbound rows for the 4 outbound handoffs (231, 232, 497, 498). |
| B9 | Outbound `trigger_events` + `handoffs` | PARTIAL. 5 events / 5 masters present, but events 497/498/499 have `event_category=''` (FAIL Rule #13 catalog enum check; only event 204 and 205 carry `lifecycle`). 4 outbound handoffs present. |
| B9b | Intra-domain cross-module handoffs | Vacuous (0 modules). |
| B10 | Inbound coverage (report-only) | 3 inbound from B2C-COMM (324, 505) and CDP (478). Coverage as-is. |
| B10b | Per-module attribution on handoffs | FAIL on all 7. Every handoff touching LOYALTY has at least one NULL among `source_domain_module_id` / `target_domain_module_id`. Outbound 4 have NULL source (gated on M1). Inbound 3 have NULL target (gated on M1). Outbound 231 has target=46 (CRM-ACCT-MGT set); outbound 232, 497, 498 have NULL targets owed by MA, FIN, B2C-COMM respectively. |
| B11 | `data_object_aliases` | FAIL. 0 alias rows on any of 5 masters. |
| B12 | Lifecycle states + pattern flags (Rule #12) | FAIL. 0 states on any master. `loyalty_tiers` is the only config-shape exemption candidate (Bucket 2 item 3). |
| C1 | `business_function_domains` owner | PASS. Marketing owner + Customer Success contributor. |
| C2 | Capability overrides | FAIL (gap). Zero `business_function_capabilities` rows; two capabilities likely diverge (`LOY-MEMBER-PORTAL` toward Customer Success, `LOY-POINTS-LEDGER` toward Finance). |
| D1 | UI spot-check | Deferred until fixes load. |
| E1-E6 | Roles + bundling | Vacuous (0 modules; E1 requires ≥3 modules for non-trivial pass). |
| F1 | No legacy domain-level system skills once module-level exists | TRANSITIONAL PASS. Skill 81 (`loyalty-system`, `domain_id=78`, `domain_module_id=NULL`) is the only system skill; no module-level skill exists yet, so the transitional state is acceptable per F1 wording. Becomes a DELETE after module-level skills land. |
| F2 | Every module has exactly one `skill_type='system'` skill | Vacuous (0 modules). Becomes FAIL after M1 cures. |
| F3 | Every module-level system skill has ≥1 `skill_tools` row | Vacuous. |
| F4 | Tool `operation_kind` ↔ `data_object_id` invariant | PASS on the 6 legacy tools (5 `query` rows with `data_object_id` set; 1 `side_effect` with NULL). |
| F5 | Semantius score computable per module | Vacuous. |
| F7 | Channel primitives only when channel is the workflow | FAIL. `send_email` (tool 37) is linked to skill 81 with no `skill_tools.notes` justification. Generic notification shape; default should be `notify_person`. Routes to Bucket 2 (judgment on whether to revert or annotate). |
| H1 | Every cross-domain handoff has a `handoff_processes` row OR explicit deferral | PASS by volume. 7 of 7 handoffs carry tags (4 `agent_curated`: 231/324/497/498; 3 `discovery_substring`: 232/478/505). Quality headline 0% approved. |

### Pass 2 - Neighbor discovery

Auto-derived from `handoffs` (source = LOYALTY or target = LOYALTY).

| Neighbor | Outbound rows | Inbound rows | Edge weight | Deep-dive needed |
|---|---|---|---|---|
| B2C-COMM (71) | 1 (`redemption_transaction.completed`) | 2 (`commerce_order.placed`, `fulfillment.delivered`) | 3 | yes (deferred, gated on M1) |
| CRM (69) | 1 (`tier.upgraded`) | 0 | 2 | no, light |
| CDP (72) | 0 | 1 (`segment.activated`) | 1 | no, light |
| MA (70) | 1 (`member.lapsed`) | 0 | 1 | no, light |
| FIN (65) | 1 (`loyalty_transaction.posted`) | 0 | 1 | no, light |

Pass 4 deep-dives for B2C-COMM remain queued as Bucket 1 follow-up after M1 cures.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL (S / A / M / B / C / E / F / H bands)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 / M2 / M4 / M6 (hard fail) | LOYALTY has 8 capabilities and zero `domain_modules` rows. Every downstream band cascades. | Phase-M loader authoring the 4-module shape proposed in Bucket 2 item 1 (LOY-PROGRAM-MGT, LOY-MEMBER-MGT, LOY-LEDGER-REWARDS, LOY-PARTNER-PROMO) plus `domain_module_capabilities` for all 8 capabilities and `domain_module_data_objects` for the 5 masters. |
| B1-S2 | F2 | Once modules exist, no module-level `skill_type='system'` skill exists. | Phase-S loader: author one `<module_code_lower>_agent` skill per new module with ≥1 `skill_tools` row each. Migrate the 6 legacy tool links from skill 81. Gated on B1-S1. |
| B1-S3 | F1 | Legacy `loyalty-system` (id 81, `domain_module_id=NULL`) becomes obsolete once module skills land. | DELETE skill 81 + its 6 `skill_tools` rows AFTER B1-S2 lands (strict ordering). |
| B1-S4 | B12 / Rule #12 | Zero `data_object_lifecycle_states` on any master. | Phase-B loader: author states per master + `requires_permission` on workflow gates + `domain_module_id` per realizing module. `loyalty_tiers` is the config-shape exemption candidate (Bucket 2 item 3). Gated on B1-S1. |
| B1-S5 | B11 | Zero `data_object_aliases`. | Phase-B loader, 2-3 alias rows per master (cluster-drafts pattern). Tuples not pre-specified in this audit; surface to user for cluster-drafts draft. |
| B1-S6 | B6 | Zero intra-domain `data_object_relationships`. Expected edges enumerated in `extra_expected_edges`. | Phase-B loader, cluster-drafts pattern. Verb + inverse_verb + cardinality + owner_side per Rule #10. Tuples pending user-side cluster draft. |
| B1-S7 | B7 / Rule #10 | Zero `users` edges. Expected actors enumerated in `extra_expected_actors`. | Phase-B loader: author 5 `data_object_relationships` rows against `data_objects.id` for `users` (built-in). Tuples pending user-side cluster draft. |
| B1-S8 | B8 outbound / Rule #10 | Zero cross-domain `data_object_relationships` for the 4 outbound handoffs (231 to CRM, 232 to MA, 497 to FIN, 498 to B2C-COMM). | Phase-B loader: author 4 mirror edges. Final verbs reviewed by user. Gated on B1-S1. |
| B1-S9 | B10b outbound | All 4 outbound handoffs (231, 232, 497, 498) have `source_domain_module_id = NULL`. | Re-run B10b backfill AFTER M1 lands. |
| B1-S10 | A4 / Rule #20 | `catalog_tagline` and `catalog_description` both empty. | Draft per Rule #20 wording; gated on Bucket 2 item 2 user approval. |
| B1-S11 | C2 | Two capability ownership overrides expected: `LOY-MEMBER-PORTAL` to Customer Success, `LOY-POINTS-LEDGER` to Finance. | Add 2 `business_function_capabilities` rows. Gated on Bucket 2 item 4. |
| B1-S12 | B9 / Rule #13 | Trigger events 497 (`loyalty_transaction.posted`), 498 (`redemption_reward.published`), 499 (`redemption_transaction.completed`) carry `event_category=''`. Rule #13 enum check: allowed values are `lifecycle`, `state_change`, `threshold`, `signal`. All three are lifecycle events. | PATCH `event_category='lifecycle'` on `trigger_events.id` in (497, 498, 499). Surgical CLI. Not gated. |
| B1-S13 | F7 | `send_email` (tool 37) linked to skill 81 with empty `skill_tools.notes`. Default should be `notify_person` unless workflow needs the channel. | Either PATCH `skill_tools.tool_id` to `notify_person` (idempotency-safe DELETE if it duplicates) or surface workflow justification. Gated on Bucket 2 item 5 + B1-S3 ordering (skill 81 may be deleted entirely). |

#### MISSING (compliance + engagement surface, carried forward from 2026-05-30)

| ID | Entity | Proposed module | Basis |
|---|---|---|---|
| B1-M1 | `gdpr_consent_records` | LOY-MEMBER-MGT | GDPR Art. 7 + CPRA |
| B1-M2 | `data_subject_requests` | LOY-MEMBER-MGT | GDPR Art. 15-22 + CPRA |
| B1-M3 | `unclaimed_property_records` | LOY-LEDGER-REWARDS | US state escheatment |
| B1-M4 | `promotion_campaigns` | LOY-PARTNER-PROMO | LOY-PROMOTION-ENG capability has no entity backing |
| B1-M5 | `member_communications_preferences` | LOY-MEMBER-MGT | CAN-SPAM + GDPR + CPRA |

All five carried forward unchanged; all gated on Bucket 2 item 1 module split.

#### APQC TAGGING (H1)

H1 PASSES by volume (7 of 7 handoffs tagged). No new `agent_curated` rows proposed in this audit; coverage is complete. The open question is **quality headline** (0 of 7 `approved`). The three `discovery_substring` rows on handoffs 232 (PCF 18925, acquire-members), 478 (PCF 10148 channel/segment), 505 (PCF 10197 fulfillment) await reviewer flip per Rule #1. The four `agent_curated` rows on handoffs 231, 324, 497, 498 likewise need review. Routes to Bucket 2 item 5 (legacy F7 question) as a deferred catalog-quality flip; not a new tag insert.

#### BOUNDARY findings per neighbor

| Neighbor | Edge weight | Findings |
|---|---|---|
| B2C-COMM (71) | 3 | Pass-4 deep-dive blocked by M1. After M1: verify `loyalty_members` (or `loyalty_program_enrollments`) is loaded as a B2C-COMM consumer DMDO; verify `redemption_transaction.completed` payload module-FK after B2C-COMM accepts the inbound. |
| CRM (69) | 2 | Outbound 231 target=46 (CRM-ACCT-MGT) already wired. Once LOYALTY modules exist, source FK backfill + mirror `data_object_relationships` row on the CRM side. |
| CDP (72) | 1 | Inbound 478 arrives with no LOYALTY-side consumer DMDO. After M1, declare LOYALTY-MEMBER-MGT as `consumer` on `audience_segments` or `embedded_master` if LOYALTY ships a local shell. |
| MA (70) | 1 | Outbound 232 NULL target. Resolves on MA's next audit. |
| FIN (65) | 1 | Outbound 497 NULL target. FIN owes a consumer DMDO on `loyalty_transactions`. Reported only. |

### Bucket 2 - Surface-for-user (judgment calls)

1. **Module split proposal (carried forward from 2026-05-30).** 4-module proposal: LOY-PROGRAM-MGT (LOY-PROGRAM-MGT + LOY-TIER-MGT capabilities, masters `loyalty_tiers`), LOY-MEMBER-MGT (LOY-MEMBER-MGT + LOY-MEMBER-PORTAL, masters `loyalty_members`), LOY-LEDGER-REWARDS (LOY-POINTS-LEDGER + LOY-REWARDS-CAT, masters `loyalty_transactions`, `redemption_rewards`, `redemption_transactions`), LOY-PARTNER-PROMO (LOY-PARTNER-ECO + LOY-PROMOTION-ENG, masters `promotion_campaigns` per B1-M4). Alternatives: (a) 3 modules folding PARTNER+PROMO into LEDGER, (b) 2 modules (LOY-CORE + LOY-ENGAGEMENT), (c) other split. Gating decision for nearly all Bucket 1 STRUCTURAL items.
2. **Catalog UX wording (A4 / Rule #20).** Wording was drafted in the 2026-05-30 audit and not approved. Re-surfacing: tagline "Reward repeat customers with points, tiers, and personalized perks that grow customer lifetime value." Description 3 paragraphs on enrollment + tier progression + member profiles, accrual + catalog + redemption + partner coalitions, program analytics + portal + integrations. Approve, rewrite, or delegate.
3. **`loyalty_tiers` lifecycle exemption (B12 config-shape).** Decide: (a) accept exemption (no states, no notes per Rule #15), (b) load minimal states (`draft`, `active`, `retired`), (c) defer.
4. **Pattern flags on masters (B4).** Re-evaluate per Rule #12: likely `loyalty_members.has_personal_content=true` (loyalty profiles carry preferences + communication history + partner data-share consent). Other flags likely remain false. Decide which to flip.
5. **`send_email` (tool 37) on legacy skill 81 (F7).** Generic notification shape, no `skill_tools.notes` justification. Three options: (a) wait (skill 81 is slated for DELETE after B1-S2, so this concern dissolves with the legacy skill), (b) PATCH the link to `notify_person` now if any module-level migration would otherwise carry the violation forward, (c) the skill genuinely needs the channel; supply the workflow-specific note for `skill_tools.notes` (Rule #15 user-approved wording).

### Bucket 3 - Phase 0 pending (speculative; carried forward unchanged)

| Candidate | Proposed module | Vendor evidence |
|---|---|---|
| `member_referrals` | LOY-MEMBER-MGT (or REFERRAL-MKT if promoted) | LoyaltyLion, Yotpo, Antavo |
| `partner_programs` | LOY-PARTNER-PROMO | Annex Cloud, Marigold, Salesforce Loyalty |
| `tier_qualification_periods` | LOY-PROGRAM-MGT | Salesforce Loyalty, Antavo |
| `gamification_badges` | LOY-MEMBER-MGT | Antavo (specialist) |
| `point_expiration_policies` | LOY-LEDGER-REWARDS | Universal; shape (separate master vs. fields on `loyalty_tiers`) unclear |

### Cross-bucket dependencies

- Bucket 1 STRUCTURAL items B1-S1, B1-S2, B1-S3, B1-S4, B1-S6, B1-S7, B1-S8, B1-S9, B1-S11, B1-S13 + all five B1-M items depend on Bucket 2 item 1 (module split).
- B1-S10 depends on Bucket 2 item 2 (catalog UX wording).
- B1-S4 (states on `loyalty_tiers`) depends on Bucket 2 item 3 (exemption).
- B1-S13 depends on Bucket 2 item 5 and may dissolve via B1-S3.
- B1-S5 (aliases) and B1-S12 (event_category enum PATCH) are independent of every other item and can ship now.

### Report-only follow-ups (owed by other domains)

- B2C-COMM B9 ownership on inbound `fulfillment.delivered` (505) and `commerce_order.placed` (324) into LOYALTY: NULL `target_domain_module_id` resolves on LOYALTY's side after B1-S1; source side `source_domain_module_id` likewise NULL, owed by B2C-COMM B10b.
- CDP B9 ownership on inbound `segment.activated` (478) into LOYALTY: same pattern.
- MA B10b on `member.lapsed` (232) outbound: `target_domain_module_id=NULL` on MA's side.
- FIN B10b on `loyalty_transaction.posted` (497): no FIN module declares `consumer` / `contributor` on `loyalty_transactions` today; FIN owes the inbound coverage row.
- CRM Pass-4 mirror relationship for `tier.upgraded`: CRM-ACCT-MGT consumes `loyalty_tiers` via DMDO 46 already, but the `data_object_relationships` row is missing on both sides.

### Per-bucket prompts

**Bucket 1:** Two items can ship now without any user judgment: B1-S5 (alias drafts pending user cluster-drafts) and B1-S12 (PATCH `event_category='lifecycle'` on trigger_events 497/498/499). The remaining 11 STRUCTURAL items + 5 MISSING items gate on Bucket 2 item 1. Apply B1-S12 now? Reply 'yes', 'no', or 'with B1-S5 too'.

**Bucket 2:** Five items. Item 1 (module split) is the gating decision; pick a shape. Items 2 (catalog UX), 3 (lifecycle exemption), 4 (pattern flags), 5 (`send_email` disposition) can be answered independently.

**Bucket 3:** Vet via formal Phase 0 research, or eyeball-mode? If eyeball, name which of the five ring true.

## 2026-06-02 Audit (modularization)

### Scope

Modularization-only pass: authored the LOYALTY `domain_modules` set, linked existing capabilities, and assigned existing data_objects at their established role and necessity. Reuse-only: no new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships were created. This cures the long-standing M1 hard fail (B1-S1 / B1B-S1, gating block) using a 3-module shape rather than the prior 4-module proposal, because the 4th proposed module (LOY-PARTNER-PROMO) had no in-domain master to anchor it (its intended master `promotion_campaigns` is an unbuilt B1B-M4 entity, out of scope for a reuse-only pass). The partner and promotion capabilities fold into a single member-engagement module instead.

### Module shape authored (3 full modules)

| Module | id | module_kind | Capabilities | Data objects (role, necessity) |
|---|---|---|---|---|
| LOYALTY-PROGRAM-CORE | 272 | full | LOY-PROGRAM-MGT (286), LOY-MEMBER-MGT (287), LOY-TIER-MGT (290) | loyalty_members (263, master, required); loyalty_tiers (265, master, required); customers (97, contributor, required) |
| LOYALTY-POINTS-REWARDS | 273 | full | LOY-POINTS-LEDGER (288), LOY-REWARDS-CAT (289) | loyalty_transactions (264, master, required); redemption_rewards (717, master, required); redemption_transactions (718, master, required) |
| LOYALTY-ENGAGEMENT | 274 | full | LOY-PROMOTION-ENG (291), LOY-PARTNER-ECO (292), LOY-MEMBER-PORTAL (293) | loyalty_members (263, consumer, required) |

Totals: 3 modules, 8 DMC rows (every capability placed exactly once, M4 pass), 7 DMDO rows.

### Deviation from prior 4-module proposal

The 2026-05-30 and 2026-05-31 audits proposed a 4-module split with a dedicated LOY-PARTNER-PROMO module mastering `promotion_campaigns` (B1B-M4). That entity does not exist, and entity creation is out of scope for a reuse-only modularization pass. Rather than ship an empty module (no in-domain master, would violate the no-empty-module rule and M6 if it also lacked a data_object), the partner-ecosystem and promotions capabilities were folded together with the member-portal capability into LOYALTY-ENGAGEMENT. LOYALTY-ENGAGEMENT carries `loyalty_members` as a `consumer` (portal and promotions read member identity and balances) so the module is non-empty while the single master copy of `loyalty_members` stays in LOYALTY-PROGRAM-CORE.

### Master pre-check (catalog-wide, MANDATORY)

Ran `/domain_module_data_objects?data_object_id=in.(263,264,265,717,718,97)&role=eq.master` before any write.

- customers (97): one foreign master row in module 46 (CRM-ACCT-MGT). Assigned `contributor` here (its existing LOYALTY role). No demotion needed, never promoted.
- loyalty_members (263), loyalty_transactions (264), loyalty_tiers (265), redemption_rewards (717), redemption_transactions (718): zero existing master rows anywhere. Each safely mastered in exactly one LOYALTY module. No demotions via the pre-check.

The loader also re-runs the pre-check defensively and aborts if any foreign master claim appears on the five in-domain masters.

### Verification (live, post-load)

- M4: all 8 capabilities placed exactly once across the 3 modules. PASS.
- M6 / no-empty-module: every module has >=1 capability and >=1 data_object (272: 3 caps / 3 DMDO; 273: 2 caps / 3 DMDO; 274: 3 caps / 1 DMDO). PASS.
- M7 in-domain: each of the 5 masters appears as `master` in exactly one LOYALTY module. PASS.
- M7 catalog-wide: re-query confirms each master has exactly one `master` row catalog-wide (263->272, 264->273, 265->272, 717->273, 718->273). `customers` master remains solely in module 46. PASS.
- Rule #14: 8 capabilities -> 3 full modules. PASS.
- Idempotency: loader re-run made zero changes.

### Loader

`c:/dev/domain-map/.tmp_deploy/modularize_loyalty_2026-06-02.ts` (idempotent; module key = domain_module_code, DMC key = (domain_module_id, capability_id), DMDO key = (domain_module_id, data_object_id)).

### Unblocked / changed downstream items

M1 now passes, which unblocks the module-dependent items previously parked behind B1B-S1 (the `{type: prerequisite_entity, ref: B1B-S1}` chain). The module id map for those items is now: PROGRAM-CORE 272 (masters loyalty_members 263, loyalty_tiers 265), POINTS-REWARDS 273 (masters loyalty_transactions 264, redemption_rewards 717, redemption_transactions 718), ENGAGEMENT 274 (no in-domain master). Note the prior 4-module module-name assumptions in those items (e.g. LOY-MEMBER-MGT, LOY-LEDGER-REWARDS, LOY-PARTNER-PROMO) now map onto this 3-module shape; downstream loaders should target module ids 272/273/274, not the old proposed codes.

### Deferred (out of scope for this pass)

All non-module work remains for later passes: per-module system skills + legacy skill 81 retirement (F2/F3/F1, was B1B-S2/S3), lifecycle states (B1B-S4), aliases (B1B-S5), intra/cross-domain and users relationships (B1B-S6/S7/S8), handoff source-module backfill (B1B-S9, now unblocked), catalog UX (A4, B1B-S10), capability ownership overrides (C2, B1B-S11), and the five missing-master candidates (B1B-M1..M5). B1B-M4 (`promotion_campaigns`) is now the natural master for LOYALTY-ENGAGEMENT (id 274), which currently has no in-domain master; flagged as the priority missing-master for this domain.

## 2026-06-06 - b1a execution

### Scope

Executed the agent-solvable `b1a` task list for LOYALTY against the live `domain_map` module (adenin org, module 1001). Three of four `b1a` items fully resolved; one skipped (user-decision gated). No new data_objects, capabilities, relationships, lifecycle states, aliases, or handoffs created (those remain in `b1b`). Loader: `c:/dev/domain-map/.tmp_deploy/loyalty_system_skills_2026-06-06.ts`.

### B1A-S12 - DONE (PATCH trigger_events)

Set `event_category='lifecycle'` on three trigger_events that carried `event_category=''` (Rule #13 enum: lifecycle, state_change, threshold, signal).

| trigger_event id | event_name | prior event_category | new event_category |
|---|---|---|---|
| 497 | loyalty_transaction.posted | "" | lifecycle |
| 498 | redemption_reward.published | "" | lifecycle |
| 499 | redemption_transaction.completed | "" | lifecycle |

### B1A-S9 - DONE (PATCH handoffs.source_domain_module_id)

B10b backfill on the 4 outbound LOYALTY handoffs. Derivation: source module = the LOYALTY module that masters `trigger_events.data_object_id` with the strongest role (verified against `domain_module_data_objects` master rows: 263->272, 264->273, 265->272, 717->273, 718->273).

| handoff id | trigger_event | event data_object | prior source_domain_module_id | new source_domain_module_id |
|---|---|---|---|---|
| 231 | tier.upgraded (204) | loyalty_tiers (265) | NULL | 272 |
| 232 | member.lapsed (205) | loyalty_members (263) | NULL | 272 |
| 497 | loyalty_transaction.posted (497) | loyalty_transactions (264) | NULL | 273 |
| 498 | redemption_transaction.completed (499) | redemption_transactions (718) | NULL | 273 |

`target_domain_module_id` remains NULL on handoffs 497 (FIN) and 498 (B2C-COMM); those are the target domains' B10b (report-only, owed by FIN and B2C-COMM), not LOYALTY's to resolve. Handoffs 231 (target 46 CRM-ACCT-MGT) and 232 (target 198 MA) already carried target module FKs.

### B1A-SYSTEM-SKILLS - DONE (skills + skill_tools inserts, legacy DELETE)

Authored one `skill_type='system'` skill per LOYALTY module (Rule #17 / F2), each with >=1 reused platform-covered `query` tool (F3), then retired legacy skill 81 (F1) strictly AFTER the module skills + tools were verified live. All inserts omitted `record_status` (DB default `new`); `skill_tools.notes` left empty (Rule #15). No new `tools` rows created (reused existing catalog-wide query tools; dedup by tool_name).

New skills:

| skill id | skill_name | domain_module_id | record_status |
|---|---|---|---|
| 365 | loyalty_program_core_agent | 272 | new |
| 366 | loyalty_points_rewards_agent | 273 | new |
| 367 | loyalty_engagement_agent | 274 | new |

New skill_tools (6 rows, all `requirement_level=required`, `record_status=new`):

| skill_tools id | skill_id | tool_id | tool_name |
|---|---|---|---|
| 3070 | 365 | 571 | query_loyalty_members |
| 3071 | 365 | 573 | query_loyalty_tiers |
| 3072 | 366 | 572 | query_loyalty_transactions |
| 3073 | 366 | 826 | query_redemption_rewards |
| 3074 | 366 | 827 | query_redemption_transactions |
| 3075 | 367 | 571 | query_loyalty_members (consumer read; module 274 has no in-domain master) |

Legacy DELETEs (prior values snapshotted for reversibility):

- DELETE skill 81: `{id:81, skill_name:"loyalty-system", skill_type:"system", domain_id:78, domain_module_id:NULL}`.
- DELETE 6 skill_tools on skill 81: id 666 (tool 571 query_loyalty_members), 667 (572 query_loyalty_transactions), 668 (573 query_loyalty_tiers), 669 (37 send_email, side_effect), 988 (826 query_redemption_rewards), 989 (827 query_redemption_transactions). All were `requirement_level=required`.

F7 / B2-SEND-EMAIL resolution: the `send_email` (tool 37) channel-primitive link (skill_tools 669) was the F7 violation on skill 81. It dissolved with the legacy skill delete; no new module skill carries `send_email` (channel-vs-capability default is `notify_person`/`notify_team`, and no LOYALTY module workflow requires the email channel specifically). B2-SEND-EMAIL is therefore moot; left in `b2` for the record but no separate fix needed.

Post-load verification (live): module 272 -> 1 system skill / 2 skill_tools; 273 -> 1 / 3; 274 -> 1 / 1. Legacy domain-level system skills for domain 78 with `domain_module_id IS NULL` = 0 (F1 pass). F2 (exactly one system skill per module) and F3 (>=1 skill_tools per skill) pass on all three modules.

### B1A-M8-MODULE-UX - SKIPPED (blocked_by user_decision)

The item carries `blocked_by: {type: user_decision, ref: B2-CATALOG-UX}`. Per the execution contract, any `b1a` item whose `blocked_by` contains a `user_decision` is skipped, not executed. The three modules (272/273/274) and the LOYALTY domain row do have empty `catalog_tagline` / `catalog_description`, and the revised Rule #20 would normally have empty catalog UX fields written straight into the column. The two directives conflict for this specific row: the item is explicitly gated by a `user_decision` blocker AND its own `action` text (written under the prior Rule #20) says to surface drafts via B2-CATALOG-UX rather than auto-write. Resolving conservatively on load-bearing master data, the `user_decision`-gated skip takes precedence: the empty catalog UX fields were left untouched and the item remains in `b1a`. Flag for the user: confirm whether the agent should write buyer-voice taglines/descriptions for modules 272/273/274 and the LOYALTY domain row directly into the empty fields (revised Rule #20 backfill), which would resolve B1A-M8-MODULE-UX and supersede the B2-CATALOG-UX gate.

### State changes

- Removed resolved items from `state.yaml` `b1a`: B1A-S12, B1A-S9, B1A-SYSTEM-SKILLS. Kept B1A-M8-MODULE-UX (skipped).
- `next_action_by`: agent -> user. The sole remaining `b1a` item is gated on a `user_decision` (B2-CATALOG-UX) and `b2` has open items, so the next actionable step is the user's.
- `last_audit`: "2026-06-06".

### UI

- https://tests.semantius.app/domain_map/skills
- https://tests.semantius.app/domain_map/skill_tools
- https://tests.semantius.app/domain_map/trigger_events
- https://tests.semantius.app/domain_map/handoffs

### B1A-M8-MODULE-UX - DONE (follow-up, catalog UX backfill written)

Superseded the earlier SKIP above. Under the REVISED Rule #20 (and the batch-policy correction), an EMPTY `catalog_tagline` / `catalog_description` is WRITTEN directly with buyer-voice copy; the row's `record_status` (`new`) carries the review signal. The stale `blocked_by: user_decision B2-CATALOG-UX` annotation was written under the OLD Rule #20 and is moot for EMPTY fields. Executed the write now. Loader: `c:/dev/domain-map/.tmp_deploy/loyalty_catalog_ux_2026-06-06.ts` (re-reads each live row, per-field empty-guard, omits `record_status`, refuses any em-dash, idempotent on re-run).

Re-read confirmed all 8 fields (2 columns x 4 rows) were empty strings immediately before the PATCH; all four rows carried `record_status='new'`. Prior values snapshotted for reversibility (all empty):

| table | row id | code | catalog_tagline (prior) | catalog_description (prior) |
|---|---|---|---|---|
| domains | 78 | LOYALTY | "" | "" |
| domain_modules | 272 | LOYALTY-PROGRAM-CORE | "" | "" |
| domain_modules | 273 | LOYALTY-POINTS-REWARDS | "" | "" |
| domain_modules | 274 | LOYALTY-ENGAGEMENT | "" | "" |

Fields written (buyer voice: workflow + value; no vendor/product names; no em-dashes; American English). Both columns written on all four rows (every prior value was empty, so the empty-guard wrote each one; zero non-empty values overwritten):

- domains 78 (LOYALTY): tagline "Reward repeat customers with points, tiers, and personalized perks that grow customer lifetime value." + 3-paragraph description (enrollment/profiles/tiers; accrual rules/rewards catalog/redemption/coalitions; member portal/analytics/integration).
- domain_modules 272 (LOYALTY-PROGRAM-CORE): tagline "Enroll members, keep their profiles current, and move them up tiers as they engage." + 2-paragraph description (member profiles + enrollment; tier design + automatic progression).
- domain_modules 273 (LOYALTY-POINTS-REWARDS): tagline "Track every point earned and spent, and let members redeem rewards from a catalog you control." + 2-paragraph description (points ledger + accrual rules; rewards catalog lifecycle + redemption fulfillment).
- domain_modules 274 (LOYALTY-ENGAGEMENT): tagline "Run bonus campaigns, partner offers, and a self-service member portal that keeps people coming back." + 2-paragraph description (promotions + partner coalitions; member portal + ongoing engagement).

`record_status` left as-is (`new`) on every row; nothing approved/pending/rejected. No column named `notes` touched.

### State changes (follow-up)

- Removed B1A-M8-MODULE-UX from `state.yaml` `b1a` (resolved by writing the fields; the stale `user_decision` block was moot for empty fields under revised Rule #20). `b1a` is now empty.
- Recomputed `next_action_by`: b1a empty -> b2 non-empty -> `user`. (Precedence: agent if b1a non-empty > user if b2 > research if b3 > blocked if b1b.) Unchanged at `user`, now justified by open `b2` items rather than the (removed) gated `b1a` item.
- `last_audit`: "2026-06-06".

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
