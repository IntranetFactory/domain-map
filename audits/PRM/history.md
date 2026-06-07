# PRM audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 0 mastered data objects, 0 modules, 0 capabilities, 0 solutions, 0 regulations, 0 trigger_events authored from this domain, 2 outbound handoffs (both into CRM with `source_domain_module_id` NULL), 0 inbound handoffs, 0 system skills, 0 roles, 0 `domain_data_objects` rows, 0 `domain_module_data_objects` rows, 0 `domain_aliases` rows.
- Domain metadata: A1 passes (crud_percentage 92, business_logic empty which is acceptable at >=95 but PRM is 92, see Bucket 1 B1-A2; min_org_size `30 m <2500`, cost_band `$$`, usa_market_size_usd_m 700, source year 2025, parent_domain_id 69 = CRM). A4 fails: both `catalog_tagline` and `catalog_description` are empty.
- PRM is a sub-domain of CRM (`parent_domain_id=69`). It is not in the leadership-tier B1 exemption list, so masters are expected to be non-zero. Today the master count is zero. The whole M-band fails (no modules), which gates B / E / F.
- Vendor-surface basis: 3 pure-play PRM-platform leaders (Impartner PRM, Zift Solutions, ZINFI Unified Channel Management), plus the Salesforce-native Partner Cloud (formerly Salesforce PRM / Communities), plus partner-ecosystem-platform adjacents (Crossbeam, Reveal, PartnerTap for account mapping and co-sell), plus through-channel marketing automation adjacents (Sproutloud, Mindmatrix, Structured Web), plus affiliate-management adjacents (Impact.com, PartnerStack, Everflow). The four buyer profiles do not collapse cleanly: classic PRM (channel chief, ops-led portal), TCMA (channel marketing manager), partner-ecosystem ops (partnerships lead, co-sell-focused), affiliate manager (DTC marketing).
- **Bucket 1 (in-scope, agent fixable):** 12 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 4 items.
- Candidates queued to `audits/_missing-domains.md`: 3 (`TCMA` new, `ECOSYSTEM-LED-GROWTH` new, `AFFILIATE-MGMT` new).

Structural pass: A1 mostly passes (one nuance on `business_logic`, see B1-A2), A2 FAILS (zero capabilities), A3 FAILS (zero solutions), A4 FAILS (empty catalog UX fields). M-band FAILS catastrophically: zero modules, the entire B-band collapses (B1 NOT exempt since PRM is a sub-domain of CRM, not leadership-tier; B2 through B12 vacuous given zero masters), C passes (owner Channel Sales, contributor Marketing). E-band cannot apply. F-band cannot apply. H-band: 2 cross-domain handoffs (211, 212) both into CRM, both `record_status='new'`, both with `source_domain_module_id` NULL (B10b fail on the source side; the loader that authored them could not pick a PRM module because none exist), both untagged for APQC.

### Vendor surface basis

The PRM market spans four buyer profiles that map onto loosely-coupled sub-markets, none of which is currently modeled in the catalog. The classic PRM surface (channel-chief / channel-ops buyer) is anchored by Impartner PRM (the Gartner Magic Quadrant leader for several cycles), Zift Solutions, and ZINFI Unified Channel Management; Salesforce Partner Cloud (built on Experience Cloud, formerly Communities, and the Salesforce PRM SKU) and Oracle Partner Relationship Management are the suite-aligned alternatives. The entity union across the classic-PRM vendors is consistent: partner-organization records, partner-user records, deal-registration workflow, MDF (Market Development Funds) request and claim workflow, co-op funds, partner-training enrollment and certification, partner-tier and partner-program assignment, deal-protection rules, partner business plans, partner scorecards, indirect-revenue analytics.

The through-channel marketing automation tier (TCMA, Gartner has called this category out since 2017) sits adjacent and sometimes overlaps: Sproutloud, Mindmatrix, Structured Web, Impartner TCMA, Zift TCMA. The entity surface is distinct: campaign templates, co-branded asset distribution, partner-email syndication, partner-social syndication, lead-distribution-to-partner workflow, partner-led-campaign attribution.

The partner-ecosystem-platform tier (Crossbeam, Reveal, PartnerTap, Partnered) is a newer category that emerged 2020 to 2024 around co-sell and account-mapping motions. Entities: partner-account-map records, overlap-analysis runs, co-sell signals, partner-sourced pipeline attribution, ecosystem-revenue rollups. The buyer is the partnerships lead (often a VP Partnerships role distinct from the channel chief).

The affiliate-management tier (Impact.com, PartnerStack, Everflow, Refersion, CJ Affiliate, Awin, Rakuten Advertising) is itself a distinct market with a DTC-marketing buyer: affiliate-recruitment workflow, tracking-link generation, conversion-attribution rules, commission-and-payout automation, affiliate-fraud detection. PartnerStack straddles classic-PRM and affiliate because it serves SaaS partner programs that look more like affiliate-network ops than traditional channel-partner ops.

The union entity surface across the four sub-markets is too broad for a single domain to host cleanly; modularization will need to choose what stays in PRM and what gets queued as candidate sub-domains.

### Pass 1, Structural sweep

#### S1, Direct FKs to `domains` for PRM (id 96)

| Table | FK column | PRM rows | Expected non-zero? |
| --- | --- | --- | --- |
| `business_function_domains` | `domain_id` | 2 (owner Channel Sales, contributor Marketing) | yes, pass |
| `capability_domains` | `domain_id` | 0 | yes, FAIL (A2) |
| `domain_data_objects` | `domain_id` | 0 | yes for non-leadership-tier, FAIL (B1) |
| `domain_modules` | `domain_id` | 0 | yes, FAIL (Rule #14 M1) |
| `domain_module_host_domains` | `domain_id` | 0 | routinely zero, OK |
| `domain_regulations` | `domain_id` | 0 | optional (see Bucket 2 B2-R1) |
| `handoffs.source_domain_id` | source | 2 (211, 212; both `source_domain_module_id` NULL) | yes, B10b fail on source side |
| `handoffs.target_domain_id` | target | 0 | yes for non-leaf, anomalous (no neighbor publishes into PRM today) |
| `skills` | `domain_id` | 0 | yes (Rule #17 F2), FAIL once modules exist; vacuous today |
| `solution_domains` | `domain_id` | 0 | yes, FAIL (A3) |
| `domain_aliases` | `domain_id` | 0 | optional (see Bucket 2 B2-A1) |
| `domains.parent_domain_id` | self | 69 (CRM) | non-zero is intentional for a sub-domain, OK |

#### S2, Per-module coverage

Vacuous (zero modules).

#### S3, Per-master indirect-table coverage

Vacuous (zero masters; B1 fails for a non-leadership-tier sub-domain).

#### A-band

- **A1, domains metadata.** Mostly pass. `crud_percentage=92`, `min_org_size='30 m <2500'`, `cost_band='$$'`, `certification_required=false`, `usa_market_size_usd_m=700`, `market_size_source_year=2025`. Subtle issue: `business_logic` is an empty string; the Rule #8 contract is `business_logic` non-empty unless `crud_percentage >= 95`. PRM is at 92, below the threshold, so `business_logic` should carry the non-JsonLogic-expressible work. See Bucket 1 `B1-A2`.
- **A2, capabilities linked.** FAIL. Zero `capability_domains` rows. See Bucket 1 `B1-A3`.
- **A3, solutions linked.** FAIL. Zero `solution_domains` rows. See Bucket 1 `B1-A4`.
- **A4, catalog UX fields.** FAIL. Both `catalog_tagline` and `catalog_description` are empty. See Bucket 1 `B1-A1`.
- **A5, vendor ownership refresh.** Skipped (opt-in, not requested). Notable potential refresh once vendors land: Salesforce Communities was rebranded to Experience Cloud in 2021, and the Salesforce PRM SKU was repositioned as Partner Cloud; Impartner acquired TCMA capabilities; Channeltivity was acquired by Magnitude Software. Surface to user if vendor-ownership pass is requested.

#### M-band

- **M1, at least 1 `domain_modules` row.** FAIL. Zero rows. PRM is a sub-domain of CRM, not leadership-tier; Rule #14 requires at least 1 full module. See Bucket 1 `B1-M1`.
- **M2, at least 3 capabilities implies at least 2 modules.** Vacuous (zero capabilities), resolved by `B1-M1` and `B1-A3` together.
- **M4, every capability has at least 1 realizing module.** Vacuous (zero capabilities).
- **M5, lifecycle states have `domain_module_id` when module-scoped.** Vacuous.
- **M6, every module realizes at least 1 capability.** Vacuous.
- **M7, single-master and within-domain coherence.** Vacuous.

#### B-band

- **B1, at least 1 master.** FAIL. Zero `domain_data_objects` rows. PRM is NOT in the leadership-tier exemption list; the rule requires at least 1 master.
- **B2 through B7.** Vacuous (zero masters).
- **B8 outbound `data_object_relationships`.** Vacuous (no masters to source verbs from).
- **B9 outbound `trigger_events` and `handoffs`.** Two outbound handoffs (211 fires `co_sell.opportunity_created` to CRM-PIPELINE-MGT; 212 fires `partner_referral.qualified` to CRM-LEAD-MGT). Both events point at CRM-owned data objects (`crm_opportunities`, `crm_leads`), not at PRM masters; PRM masters none of its own trigger_events today.
- **B9b intra-domain cross-module handoffs.** Vacuous (zero modules).
- **B10 inbound handoffs (report only).** Zero rows. Anomalous for a PRM market: CRM should publish `account.created` (for the partner-organization sync side), HCM or some training-feed should publish `enrollment.completed` (for partner training records), CPQ should publish `quote.partner_resold` (for deal-protection lookups). None modeled today. Report-only to the corresponding neighbors.
- **B10b per-module attribution on `handoffs`.** FAIL on the source side for both 211 and 212: `source_domain_module_id` is NULL because PRM has no modules. Per Rule #15 do NOT add an annotation in `handoffs.notes`; surface as a fix that lands once `B1-M1` resolves. The target side is correctly populated (48 = CRM-PIPELINE-MGT, 47 = CRM-LEAD-MGT).
- **B11, aliases for non-self-explanatory masters.** Vacuous (zero masters).
- **B12, lifecycle states.** Vacuous.

#### C-band

- **C1, at least 1 `business_function_domains` owner.** Pass. Owner = Channel Sales; contributor = Marketing. RACI matches the classic-PRM buyer profile (channel chief / channel-ops). The other three sub-markets (TCMA, ecosystem-led, affiliate) have different functional owners (Marketing for TCMA and affiliate, Partnerships / RevOps for ecosystem-led); if any of those promote out of PRM the RACI will need a fresh look on this side.
- **C2, capability-level RACI overrides.** Vacuous (zero capabilities).

#### D-band

- **D1, UI spot-check.** Deferred until after fix loads land.

#### E-band

Vacuous: no modules, no role-modules surface. Natural personas once modules exist: Channel Chief, Channel Ops Manager, Channel Account Manager (CAM), Channel Marketing Manager, Partner Operations Analyst, Partner Portal Admin. Most are multi-module and would satisfy the 2-module floor; CAM in particular spans deal-registration, MDF, training, and analytics modules.

#### F-band

Vacuous: no modules, no system skills. Becomes applicable once `B1-M1` resolves.

#### H-band, APQC coverage

Two cross-domain handoffs in the catalog today, both outbound to CRM, both `record_status='new'`, both untagged in `handoff_processes`. The H-band on PRM is thin but not vacuous. Catalog quality (approved tags) is 0 of 2 = 0%. Process health (agent_curated count among existing tags) is 0 of 0 = N/A (no tags exist at all). The audit volume target (0.5N to 0.8N agent_curated rows on N cross-domain handoffs, N=2 here) calls for 1 to 2 new agent_curated tags during this audit pass. Draft tags below in Bucket 1 APQC TAGGING. The substrate is shallow because PRM itself owns nothing today; once `B1-M1` and `B1-V1` through `B1-V4` resolve, the inbound side from CRM / HCM / CPQ will become a real tagging surface.

### Pass 2, Market audit (semantic)

The PRM market is a composite of four sub-markets that flagship vendors increasingly treat as distinct buyer surfaces. The choice of how much of the composite to keep inside PRM versus split out as candidate sub-domains is the central modularization decision.

**Master records (classic PRM core, channel-chief / channel-ops buyer):**

- `channel_partners` (partner-organization records: legal entity, partner tier, region, contract status, primary CAM)
- `partner_users` (named users at partner orgs with portal access; FK to `channel_partners`)
- `partner_programs` (named program definitions: roles, benefits, requirements per tier)
- `partner_tiers` (tier definitions per program: Gold / Silver / Authorized / Premier; criteria and benefits)
- `partner_agreements` (executed contracts: master agreement, addendums, NDA, term)
- `deal_registrations` (the headline workflow entity: opportunity registered by a partner for protection and approval)
- `mdf_requests` (Market Development Fund requests: budget ask plus campaign plan)
- `mdf_claims` (MDF claim submissions with proof-of-spend; settle against approved requests)
- `co_op_funds` (co-operative-marketing funds, accrual-based, distinct from MDF)
- `partner_certifications` (per-partner-user certification records: cert ID, completion date, expiry)
- `partner_training_enrollments` (enrollments in partner LMS courses; FK to LMS if integrated)
- `partner_business_plans` (annual joint business plans: targets, marketing investment, milestones)
- `partner_scorecards` (computed scorecards per partner per period: revenue, growth, certification compliance, MDF utilization)
- `partner_qbr_records` (Quarterly Business Review notes and outcomes, per partner)

**Master records (TCMA tier, channel-marketing buyer):**

- `partner_campaign_templates` (co-brandable campaign assets: emails, landing pages, social posts)
- `partner_campaign_runs` (per-partner instantiation of a template; tracks deployment per partner per template)
- `partner_lead_distributions` (leads assigned from vendor to partner with SLA on follow-up)
- `co_branded_assets` (logo lockups, approved imagery, brand-compliance state per partner)

**Master records (ecosystem-led growth, partnerships buyer):**

- `partner_account_maps` (overlap-analysis runs between vendor CRM and partner CRM, typically via Crossbeam or Reveal)
- `ecosystem_co_sell_signals` (qualified co-sell signals: vendor and partner both have the account, vendor wants intro)
- `ecosystem_revenue_attribution` (partner-influenced-pipeline rollups, sourced-and-influenced distinction)

**Master records (affiliate-management tier, DTC-marketing buyer):**

- `affiliate_accounts` (affiliate publishers / influencers / SaaS partners: payout method, tracking-link prefix)
- `affiliate_tracking_links` (per-affiliate-per-campaign tracking URLs)
- `affiliate_conversions` (attributed conversions with cookie-based or postback-based source attribution)
- `affiliate_payouts` (commission accrual and payout runs)

**Junctions, transitions, audit:**

- `deal_registration_approvals` (vendor approval workflow on submitted registrations)
- `mdf_claim_approvals`
- `partner_user_role_assignments` (portal-side RBAC inside the partner org)
- `partner_program_enrollments` (which partner is in which program at which tier over time)
- `partner_scorecard_periods` (per-period scorecard snapshots)

**Configuration / templates:**

- `partner_onboarding_workflows`, `mdf_budget_pools`, `commission_tiers`, `deal_protection_rules`

**Compliance / regulation:**

PRM intersects multiple regulatory regimes when handling partner data and channel financials: GDPR (partner_users typically include EU contacts), CCPA / CPRA (US partner contacts), anti-bribery / FCPA (partner due diligence on commission-eligible partners, anti-bribery clauses in partner_agreements), SOX (MDF and commission accruals feed financial statements; ICFR controls apply if the vendor is public), HIPAA / HITECH (only when partners in healthcare channels handle PHI). Industry-specific: ITAR and EAR for technology export channels, FCA / FinCEN for financial-services channel referrals, DEA registration for pharma distribution channels. The B2-R1 question is which of these to model at the domain level.

**Modularization hypothesis (proposed module set, classic-PRM-only assumption, 4 modules):**

| Module code | Scope | Capabilities |
|---|---|---|
| `PRM-PARTNER-PORTAL` | `channel_partners`, `partner_users`, `partner_programs`, `partner_tiers`, `partner_agreements`, portal-side RBAC | PARTNER-ONBOARDING, PARTNER-PROGRAM-MGMT, PARTNER-PORTAL-RBAC |
| `PRM-DEAL-REGISTRATION` | `deal_registrations`, `deal_registration_approvals`, deal-protection rules, conflict-resolution workflow | DEAL-REGISTRATION, DEAL-PROTECTION |
| `PRM-MDF-COOP` | `mdf_requests`, `mdf_claims`, `co_op_funds`, `mdf_budget_pools`, claim-approval workflow | MDF-MGMT, CO-OP-FUND-MGMT |
| `PRM-PARTNER-ANALYTICS` | `partner_business_plans`, `partner_scorecards`, `partner_qbr_records`, partner-revenue rollups, certification compliance | PARTNER-SCORECARDING, PARTNER-QBR, PARTNER-ANALYTICS |

If the user keeps TCMA and ecosystem-led inside PRM rather than promoting them as candidate sub-domains, two more modules surface: `PRM-PARTNER-MARKETING` (TCMA-flavored: campaign templates, lead distribution, co-branded assets) and `PRM-PARTNER-CO-SELL` (ecosystem-led: account mapping, co-sell signals, partner-influenced pipeline). Affiliate is the cleanest carve-out and probably should not stay in PRM under any scenario; the DTC affiliate-marketing buyer is genuinely distinct.

Partner training and certification (`partner_training_enrollments`, `partner_certifications`) is a cross-domain question: it can sit inside PRM as `PRM-PARTNER-TRAINING`, or it can be a consumer relationship on LMS, with LMS mastering the enrollment and certification entities and PRM consuming them on partner scorecards. The cleaner model is LMS-mastered with PRM as consumer; see Bucket 2 `B2-T1`.

**Findings categories:**

- **MISSING entities:** ALL of the surface entities listed above. PRM has zero masters today; everything is missing. The dominant finding type.
- **WRONG-OWNERSHIP:** N/A (no entities currently owned).
- **SCOPE-CREEP:** PRM's current description ("Channel partner portals, deal registration, MDF management, partner training, and indirect-revenue analytics.") implicitly claims partner training as a PRM concern. The cleaner architectural call is LMS-mastered training with PRM-consumed enrollment / certification. Surface as `B2-T1`.
- **MODULARIZATION ISSUE:** the union surface across the four sub-markets is too broad for a single domain. The proposed 4-module classic-PRM shape above is the conservative cut; the TCMA / ecosystem-led / affiliate carve-outs (Bucket 3 candidates #1, #2, #3) are real and Gartner-recognized markets. Decide the carve-out before authoring the modules to avoid load-and-then-relocate churn.

### Pass 3, Neighbor discovery

Cross-edges with other domains, ranked by edge weight (handoff count plus DMDO dependency count). Two outbound handoffs to CRM today; everything else is semantic-only.

| Neighbor | Outbound handoffs | Inbound handoffs | DMDO deps | Edge weight | Notes |
|---|---|---|---|---|---|
| CRM | 2 (211, 212) | 0 | n/a (no DMDO surface on PRM side) | 2 today, semantic 6+ | Largest edge. Joint opportunities and partner-sourced referrals already wired outbound. Once PRM masters `channel_partners`, CRM accounts should carry a `partner_channel_partner_id` consumer link; co-sell signals from `PRM-PARTNER-CO-SELL` (if kept in PRM) feed CRM as `account.partner_co_sell_signal`. The two NULL-source-module handoffs are a fix once `B1-M1` resolves. |
| MA | 0 | 0 | n/a | 0 today, semantic 4+ | TCMA tier overlap: partner-led campaigns, co-branded asset distribution, partner-email syndication. If TCMA stays in PRM, MA receives partner-campaign runs as ingest. If TCMA promotes as its own domain, the edge becomes TCMA-MA. |
| LMS | 0 | 0 | n/a | 0 today, semantic 3+ | Partner training and certification side: LMS should master `enrollments` and `certifications` if PRM consumes them per B2-T1; otherwise PRM masters its own training enrollment shell. |
| CPQ | 0 | 0 | n/a | 0 today, semantic 3+ | Deal-protection lookup at quote time: CPQ should query PRM for active deal registrations before allowing a partner-resold quote at non-protected pricing. |
| SALES-PERF | 0 | 0 | n/a | 0 today, semantic 2+ | Partner-channel commission accruals: when partners are commission-eligible (typical for SaaS partner programs), commission events flow PRM (deal closed-with-partner) to SALES-PERF (accrual record). |
| S2P | 0 | 0 | n/a | 0 today, semantic 2+ | MDF and commission payouts settle through procurement / AP. `mdf_claim.approved` flows to S2P for vendor-payment processing. |
| SUB-MGMT | 0 | 0 | n/a | 0 today, semantic 2+ | Partner-resold subscriptions: indirect billing through partner-of-record carries SUB-MGMT subscription records with `partner_channel_partner_id` consumer link. |
| LOYALTY | 0 | 0 | n/a | 0 today, semantic 1+ | Adjacent for affiliate / influencer programs if AFFILIATE-MGMT is not split out. Same engagement-vs-financial split as the GTM-PLAN / ABM-PLATFORM cut. |
| SPM | 0 | 0 | n/a | 0 today, semantic 1+ | Partner-program strategy at the portfolio level (which partner segments, which markets, which investments). Light edge. |

Default deep-dive threshold (edge weight at least 3) is met by CRM today; MA, LMS, and CPQ are at semantic-3+ but zero on the wire. Pairwise reconciliation against CRM in Pass 4 below; the others are blocked on `B1-M1` and on the corresponding domain audits.

### Pass 4, Pairwise reconciliation per neighbor

Run for CRM (edge weight 2 today, semantic 6+). All others (MA, LMS, CPQ, SALES-PERF, S2P, SUB-MGMT, LOYALTY, SPM) are deferred to a re-run once `B1-M1` lands; their semantic edges are real but unactionable until PRM has modules.

#### PRM to CRM (edge weight 2 today, semantic 6+)

1. **Existing handoffs, fully wired.** None. Both 211 and 212 have `source_domain_module_id` NULL.

2. **Existing handoffs with NULL module FK (potential PATCH candidate).** Both 211 and 212.

   | Handoff | Direction | Trigger event | Source module | Target module | Friction |
   | --- | --- | --- | --- | --- | --- |
   | 211 | PRM to CRM | co_sell.opportunity_created (FK 171, data_object crm_opportunities) | NULL (B10b) | 48 CRM-PIPELINE-MGT | medium |
   | 212 | PRM to CRM | partner_referral.qualified (FK 172, data_object crm_leads) | NULL (B10b) | 47 CRM-LEAD-MGT | medium |

   Once `PRM-PARTNER-CO-SELL` (or whichever module owns co-sell signals) and `PRM-PARTNER-PORTAL` (or the equivalent for referral submission) exist, these two NULL FKs become a single PATCH each. Surface as `B1-H1` and `B1-H2`.

3. **Missing handoffs the catalog implies should exist.**
   - **CRM to PRM, account.linked_to_partner.** When a CRM account is associated with a channel partner (e.g. closed via a partner deal registration that converted), CRM should fire an event PRM consumes to update partner scorecard rollups. Not modeled today. Inbound to PRM, blocked on PRM mastering `channel_partners`.
   - **CRM to PRM, opportunity.closed_won_with_partner.** When a co-sell opportunity closes won, the event drives PRM revenue attribution and commission accrual. Inbound to PRM, blocked on PRM masters and on `B2-T2` (commission ownership: PRM vs SALES-PERF).
   - **PRM to CRM, channel_partner.created (or updated).** When PRM creates or updates a channel partner record, CRM may need to mirror as an account of type `Partner`. Outbound from PRM, blocked on PRM mastering `channel_partners`.
   - **PRM to CRM, deal_registration.approved.** When a deal registration is approved, an opportunity should auto-create in CRM with the partner attribution carried. Outbound, blocked on PRM mastering `deal_registrations`.

4. **Boundary integrity gaps (B5 routing).** Vacuous (no modules to route against).

5. **Cross-domain `data_object_relationships` mirror check.** Vacuous (no PRM masters). Once `channel_partners` lands, expected relationships: `crm_accounts referenced_by channel_partners` (CRM-side mirror), `crm_opportunities sourced_by channel_partners` (when partner-sourced or co-sold).

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures (A1, A2, A3, A4, M1)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-M1 | M1 / M2 / M4 | Zero `domain_modules` rows on a non-leadership-tier sub-domain. Blocks the entire B / E / F surface and the B10b source-side fixes on the existing handoffs. The modularization hypothesis in Pass 2 proposes 4 classic-PRM modules; 5 or 6 if TCMA / ecosystem-led stay in PRM rather than promoting. | Author 4 to 6 `domain_modules` rows per the chosen shape from `B2-M1`. Each carries `module_kind='full'`. Bundle with the corresponding capabilities (B1-A3) and `domain_module_capabilities` rows. Decide carve-outs (`B2-S1`, `B2-S2`, `B2-S3`) first. |
| B1-A1 | A4 | Empty `catalog_tagline` and `catalog_description`. Per Rule #20 the audit may draft both; surface to user for review BEFORE writing. | Drafts authored below; user approves wording, then PATCH. |
| B1-A2 | A1 | `business_logic` empty while `crud_percentage=92` (< 95 threshold). Per Rule #8, when `crud_percentage < 95` the column should carry the non-JsonLogic-expressible work. The candidates are: deal-protection conflict resolution (overlapping registrations from competing partners), MDF spend-cap allocation with rollover rules, partner-scorecard composite weighting, channel-commission-tier computation when commissions are PRM-owned. | Draft a 1-2-sentence `business_logic` value covering the deal-protection-conflict and partner-scorecard-composite cases, surface to user, then PATCH. Draft authored below. |
| B1-A3 | A2 | Zero capabilities. Per the modularization hypothesis the realistic capability set is 7 to 11 depending on carve-outs. | Author 7 to 11 `capabilities` rows + matching `capability_domains` rows. Conditioned on `B2-M1` shape choice. Draft list authored below. |
| B1-A4 | A3 | Zero solutions. Realistic flagship set is 6 to 12 across the four sub-markets. If carve-outs promote, the solution set per remaining-PRM shrinks. | Author `solutions` rows (de-duping against existing `solutions.solution_name` per Rule #4) + `solution_domains` rows with `coverage_level`. Conditioned on carve-out decisions. Draft list authored below. |

Drafts for `B1-A1` (per Rule #20 voice rule, buyer voice, workflow plus value):

- `catalog_tagline` draft: "Run your channel program end-to-end. Recruit and tier partners, register and protect joint deals, fund partner-led marketing through MDF, and score partner performance against revenue and growth targets."
- `catalog_description` draft (3 short paragraphs):
  - "Partner Relationship Management runs the indirect-revenue motion. Onboard channel partners into tiered programs, give them a branded portal with role-based access, and operate the day-to-day workflows that hold the program together: deal registration with conflict-resolution, MDF requests and claims with proof-of-spend, co-op fund accrual, partner training and certification enrollment, and joint business planning."
  - "Track every dollar of partner-influenced pipeline. Score partners on revenue, growth, certification compliance, and MDF utilization. Run quarterly business reviews against the joint plan. Surface co-sell signals from CRM when the vendor and a partner overlap on the same prospect."
  - "Built for Channel Sales leaders and the channel-ops teams that run the program, with handoffs to Marketing for through-channel campaign syndication, Finance for MDF settlement and partner-channel commission accruals, and Customer Success for the post-sale partner-of-record motion."

Draft for `B1-A2` (`business_logic` value):
- "Deal-protection conflict resolution between competing partner registrations on the same prospect requires tie-break logic that combines first-to-register, partner tier, and CAM judgment. Partner-scorecard composite scoring weights revenue, growth, MDF utilization, and certification compliance against tier-specific thresholds. Neither shape collapses to a JsonLogic check on a single record."

Draft for `B1-A3` (capabilities, classic-PRM scope, conditioned on `B2-S1` / `B2-S2` / `B2-S3` keeping the carve-outs out):
- `PARTNER-ONBOARDING` (recruitment, vetting, contract execution, portal provisioning)
- `PARTNER-PROGRAM-MGMT` (program definitions, tier criteria, enrollment lifecycle)
- `PARTNER-PORTAL-RBAC` (partner-side user management, role-based portal access)
- `DEAL-REGISTRATION` (submission, vendor approval, expiration, conflict resolution)
- `DEAL-PROTECTION` (price-protection policies, protection-period enforcement)
- `MDF-MGMT` (request, approval, claim, proof-of-spend, budget pool accounting)
- `CO-OP-FUND-MGMT` (accrual based on partner sales, claim against accrued balance)
- `PARTNER-TRAINING-ENROLLMENT` (if PRM-owned; otherwise LMS-consumed per B2-T1)
- `PARTNER-CERTIFICATION-TRACKING` (same caveat as above)
- `PARTNER-SCORECARDING` (composite scoring per period per partner)
- `PARTNER-QBR` (quarterly business review records and joint planning)
- `PARTNER-ANALYTICS` (indirect-revenue rollups, partner-influenced pipeline)

If TCMA stays in PRM: add `THROUGH-CHANNEL-CAMPAIGN-SYNDICATION` and `PARTNER-LEAD-DISTRIBUTION`. If ecosystem-led stays: add `PARTNER-ACCOUNT-MAPPING` and `PARTNER-CO-SELL-ORCHESTRATION`. Affiliate should not stay in PRM under any scenario.

Draft for `B1-A4` (solutions, classic-PRM-only, 6 primary + 4 secondary):
- Primary: Impartner PRM, Zift Solutions (PRM platform side), ZINFI Unified Channel Management, Salesforce Partner Cloud, Oracle Partner Relationship Management, Channeltivity. All `coverage_level='primary'`.
- Secondary (suite-aligned or adjacent): HubSpot Partner Hub, Allbound (PRM lite, SMB-focused), Magentrix Partner Portal, PartnerStack (overlap with classic PRM for SaaS partner programs). `coverage_level='secondary'` or `'partial'` depending on coverage shape.

Solution authoring is conditioned on the carve-out decisions; if TCMA promotes, Sproutloud and Mindmatrix go to TCMA, not PRM. If affiliate promotes, Impact.com and PartnerStack relocate (PartnerStack stays partially on PRM because of the SaaS-PRM crossover).

#### MISSING (vendor-surface entities, gated on `B1-M1`)

These are placeholder entries. Every entity in Pass 2's market surface is missing because zero masters exist. The audit lists the top 4 most-impactful per-master candidates here so the user has a per-entity decision surface; the full set goes to Bucket 3 pending Phase 0 vetting.

| ID | Entity | Proposed module | Vendor evidence |
|---|---|---|---|
| B1-V1 | `channel_partners` | PRM-PARTNER-PORTAL | 6 of 6 flagship PRM platforms; the headline master |
| B1-V2 | `deal_registrations` | PRM-DEAL-REGISTRATION | 6 of 6 flagship PRM platforms; the operationally-load-bearing workflow |
| B1-V3 | `mdf_requests` + `mdf_claims` | PRM-MDF-COOP | 5 of 6 flagship PRM platforms; the financial control surface |
| B1-V4 | `partner_scorecards` | PRM-PARTNER-ANALYTICS | 4 of 6 flagship PRM platforms surface scorecards prominently; the analytical anchor |

Bucket 3 carries the speculative list (TCMA-side entities, ecosystem-led entities, affiliate entities; routed via the candidate-promotion decisions).

#### APQC TAGGING

Two existing cross-domain handoffs (211, 212), zero tagged today. The volume target (0.5N to 0.8N agent_curated rows on N=2) calls for 1 to 2 new agent_curated rows. PCF lookup for each:

| Handoff | Source to target | Trigger event | Payload | Proposed PCF process | Confidence |
| --- | --- | --- | --- | --- | --- |
| 211 | PRM to CRM-PIPELINE-MGT | co_sell.opportunity_created | crm_opportunities | Manage opportunities (APQC PCF 3.5.2, "Manage sales opportunities" or the closest cross-industry equivalent) | medium; "co-sell" is partner-specific and APQC PCF is generic on opportunity creation |
| 212 | PRM to CRM-LEAD-MGT | partner_referral.qualified | crm_leads | Manage leads (APQC PCF 3.5.1, "Develop and manage marketing plans" lead-handoff sub-step, or "Generate leads") | medium-low; partner-sourced leads are a distinct flow and may warrant deferral to Discover Pass 3 |

Both proposed for `record_status='new'`, `proposal_source='agent_curated'`. The actual `process_id` resolution against the live `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry` query needs to run at load time (not at audit-draft time); if the lookup misses, defer to Discover Pass 3 as custom-process candidate. Both rows are surface-for-user, not auto-load.

Catalog quality headline: 0 of 2 cross-domain handoffs approved-tagged (0%). Process health secondary: 0 agent_curated tags exist today. Net after this audit: 0 new tags loaded (audit is read-only), 1-2 proposed for approval.

#### BOUNDARY findings per neighbor

| ID | Neighbor | Direction | Finding | Fix |
|---|---|---|---|---|
| B1-H1 | CRM | outbound | Handoff 211 (co_sell.opportunity_created PRM to CRM-PIPELINE-MGT) has `source_domain_module_id=NULL`. The fix is to PATCH the FK to the module that owns co-sell signal authoring once `B1-M1` lands. | PATCH `handoffs.source_domain_module_id = <PRM-PARTNER-CO-SELL or whichever module owns the workflow>` after `B1-M1`. |
| B1-H2 | CRM | outbound | Handoff 212 (partner_referral.qualified PRM to CRM-LEAD-MGT) has `source_domain_module_id=NULL`. | PATCH `handoffs.source_domain_module_id = <PRM-PARTNER-PORTAL or whichever module owns partner referral submission>` after `B1-M1`. |

Both fixes are deferred to land after `B1-M1`. No notes additions on these rows per Rule #15; do NOT annotate "until PRM is modularized" or any provenance trailer.

### Bucket 2, Surface-for-user (judgment calls)

1. **B2-M1, Modularization shape (carve-outs aside).** Pass 2 proposes 4 classic-PRM modules (PORTAL, DEAL-REGISTRATION, MDF-COOP, ANALYTICS). Alternative shapes: (a) 4 modules as proposed (cleanest, matches the four-workflow-pillar shape vendors converge on), (b) 5 modules adding `PRM-PARTNER-TRAINING` (if PRM-owned per `B2-T1`), (c) 6 modules adding `PRM-PARTNER-MARKETING` (TCMA stays in PRM per `B2-S1`), (d) 7 modules adding `PRM-PARTNER-CO-SELL` (ecosystem-led stays in PRM per `B2-S2`). Decide before authoring masters. Has cross-dependencies with `B2-T1`, `B2-S1`, `B2-S2`.

2. **B2-R1, Regulation coverage.** Zero `domain_regulations` rows. Realistic candidates: GDPR (partner_users include EU contacts), CCPA / CPRA (US partner contacts), FCPA / UK Bribery Act (anti-bribery on commission-eligible partners), SOX (MDF and commission accruals feed financial statements). Industry-vertical: ITAR / EAR (tech-export channels), HIPAA (healthcare channels). Options: (a) baseline 4: GDPR + CCPA + FCPA + SOX, (b) baseline 4 plus UK Bribery Act, (c) extended: baseline plus ITAR / EAR plus HIPAA flagged as industry-scoped, (d) none and defer to industry-specific overlays.

3. **B2-T1, Partner training and certification ownership: PRM-mastered vs LMS-mastered with PRM-consumed.** The cleaner architectural call is LMS-mastered (LMS already owns `enrollments` and `courses`; partner training is just LMS with an external-user audience). PRM consumes `partner_training_enrollments` and `partner_certifications` for scorecard inputs. The opposing view is that classic-PRM platforms (Impartner, Zift, ZINFI) ship their own LMS-lite specifically because the partner LMS needs different controls (branded portal, multi-tenant per partner org, cert-expiry-driven re-enablement). Options: (a) LMS-mastered with PRM-consumed (architecturally cleanest, requires LMS to add an "external learner" mode if not present), (b) PRM-mastered with own training module (matches vendor reality but duplicates LMS surface), (c) PRM-mastered for cert-tracking only, LMS-mastered for course delivery (the hybrid; partner cert is PRM's, course completion is LMS's). Strongly informs `B2-M1`.

4. **B2-T2, Commission and incentive ownership: PRM vs SALES-PERF.** Partner-channel commissions (rebates, SPIFs, tiered margin) are sometimes PRM-owned (channel team operates them, treats them as a partner-program lever) and sometimes SALES-PERF-owned (treated as a sales-compensation variant). Options: (a) PRM-owned (matches Impartner / ZINFI feature set; treats commissions as a program control), (b) SALES-PERF-owned with PRM-consumed (architecturally cleaner; commission ICP / accrual / payout sits in one place across direct and partner sales), (c) split: program-level rules and rebate accrual sit in PRM, individual payout settlement sits in SALES-PERF. Cross-dependency: if (b), then `commission_tiers` is a SALES-PERF master with PRM consumer; if (a), PRM masters `commission_tiers` and the partner-channel-commission entities.

5. **B2-S1, Promote TCMA and relocate the through-channel marketing capabilities.** TCMA (Through-Channel Marketing Automation) is queued newly by this audit at mention count 1. Gartner has tracked TCMA as a distinct market since 2017; flagship pure-plays (Sproutloud, Mindmatrix, Structured Web) compete with PRM-platform-bundled TCMA (Impartner TCMA, Zift TCMA). Options: (a) promote TCMA and relocate the `PARTNER-CAMPAIGN-TEMPLATES` / `PARTNER-LEAD-DISTRIBUTION` / `CO-BRANDED-ASSETS` entity surface, (b) keep TCMA inside PRM as `PRM-PARTNER-MARKETING` (matches buyer reality at orgs that haven't separated channel-marketing from channel-ops), (c) defer until TCMA mention count grows. Cross-dependency: `B2-M1` shape choice.

6. **B2-S2, Promote ECOSYSTEM-LED-GROWTH and relocate the co-sell / account-mapping capabilities.** ECOSYSTEM-LED-GROWTH (covering Crossbeam, Reveal, PartnerTap, Partnered) is queued newly by this audit at mention count 1. The category name varies (Partner Co-Sell, Nearbound, ELG, Partner Ecosystem Platform); the buyer is the partnerships lead, often distinct from the channel chief. Options: (a) promote and relocate `PARTNER-ACCOUNT-MAPPING` and `PARTNER-CO-SELL-ORCHESTRATION` (matches buyer-distinct test; Crossbeam and Reveal don't compete with Impartner), (b) keep in PRM as `PRM-PARTNER-CO-SELL` (the Salesforce Partner Cloud / Oracle PRM model that bundles co-sell with classic PRM), (c) defer until mention count grows. Cross-dependency: `B2-M1` and the existing handoffs 211 / 212 ownership.

### Bucket 3, Phase 0 pending (speculative)

| # | Candidate | Vendor knowledge basis | Recommended verification |
|---|---|---|---|
| 1 | TCMA as its own domain, absorbing PRM's through-channel marketing capabilities | Sproutloud, Mindmatrix, Structured Web, Impartner TCMA, Zift TCMA; Gartner has called this category out since 2017. Buyer is Channel Marketing Manager, distinct from Channel Chief. Queued newly by this audit at mention count 1. | Phase 0 against Sproutloud and Mindmatrix product docs, Impartner TCMA feature set vs Impartner PRM feature set (test whether the bundled vendor still treats them as one product or two), Gartner Magic Quadrant for TCMA if it still exists (last published around 2020 to 2022). Confirm vendor consensus on the entity surface (`partner_campaign_templates`, `partner_campaign_runs`, `partner_lead_distributions`, `co_branded_assets`) and whether `PARTNER-CAMPAIGN-TEMPLATES` cleanly relocates. |
| 2 | ECOSYSTEM-LED-GROWTH as its own domain, absorbing PRM's co-sell / account-mapping capabilities | Crossbeam, Reveal, PartnerTap, Partnered. Newer category (2020 to 2024). Buyer is VP Partnerships / Head of Ecosystem, distinct from Channel Chief. Queued newly by this audit at mention count 1. | Phase 0 against Crossbeam and Reveal docs; test the buyer-distinct hypothesis. Confirm the entity surface (`partner_account_maps`, `ecosystem_co_sell_signals`, `ecosystem_revenue_attribution`) and whether classic-PRM vendors (Impartner, Zift) market co-sell as a feature or as a separately-licensed add-on. The defensible cut: classic PRM owns the partner relationship and program; ecosystem platforms own the data-sharing and account-mapping mechanics that the partnership runs on top of. |
| 3 | AFFILIATE-MGMT as its own domain, absorbing the affiliate-specific entity surface | Impact.com, PartnerStack, Everflow, Refersion, CJ Affiliate, Awin, Rakuten Advertising. Distinct DTC-marketing buyer (Performance Marketing Manager / Affiliate Manager). Queued newly by this audit at mention count 1. | Phase 0 against Impact.com (the market leader) and PartnerStack (the SaaS-affiliate crossover). Test whether PartnerStack belongs to AFFILIATE-MGMT, to PRM, or carries dual coverage. Confirm entity surface (`affiliate_accounts`, `affiliate_tracking_links`, `affiliate_conversions`, `affiliate_payouts`). The defensible cut: AFFILIATE-MGMT owns publisher / influencer / affiliate-network mechanics; classic PRM owns B2B reseller / VAR / SI relationships. PartnerStack is the awkward middle. |
| 4 | Partner-marketplace operations as a candidate sub-domain or capability | Tackle.io, AppDirect, Mirakl B2B (when used for indirect channels), AWS Marketplace / Azure Marketplace / Google Cloud Marketplace operations side. Co-sell-through-marketplace is a fast-growing workflow distinct from both classic PRM and ecosystem-led co-sell. Not yet queued (mention count 0). | Phase 0 against Tackle.io platform docs (the cloud-marketplace-ops specialist). Test whether marketplace co-sell is a fifth PRM module, a feature of ECOSYSTEM-LED-GROWTH if that promotes, or a distinct domain. Less urgent than candidates 1 to 3. |

### Cross-bucket dependencies

- `B1-A1` (catalog UX drafts) is independent of all other items and can land first. The drafted prose intentionally avoids enumerating sub-markets so it survives any of the Bucket 2 / Bucket 3 carve-out outcomes.
- `B1-A2` (`business_logic` value) is independent. Can land first.
- `B1-A3` (capabilities) is informed by `B2-M1`, `B2-S1`, `B2-S2`, `B2-T1`. Resolve those first; the capability list shrinks if carve-outs promote.
- `B1-A4` (solutions) is informed by `B2-S1`, `B2-S2` (TCMA / ecosystem-led solutions relocate if promoted); affiliate-specific solutions definitely go to AFFILIATE-MGMT if `B3-#3` is promoted.
- `B1-M1` (4 to 7 modules) is the load-bearing decision: gates `B1-V1` through `B1-V4`, every B-band-and-below check, all Pass 4 pairwise work past the existing 211/212 fixes, and the F-band positive-existence checks. Informed by `B2-M1`, `B2-T1`, `B2-T2`, `B2-S1`, `B2-S2`.
- `B1-V1` through `B1-V4` (top 4 missing masters) follow `B1-M1` plus `B2-M1`.
- `B1-H1` and `B1-H2` (the two NULL source_domain_module_id PATCHes) follow `B1-M1` (need the modules to exist before the FK can point at them) and the specific module-ownership choice from `B2-S2` for the co-sell handoff.
- `B2-M1` (modularization shape) is mutually informed by `B2-T1`, `B2-T2`, `B2-S1`, `B2-S2`, and Bucket 3 candidates #1, #2, #3.
- `B2-T1` (training ownership) cross-cuts `B2-M1` (training module count) and the LMS audit's view of external-learner support.
- `B2-T2` (commission ownership) cross-cuts `B2-M1` and the SALES-PERF audit's commission entity surface.
- `B2-R1` (regulations) is independent of all other items.
- Bucket 3 candidates 1 and 2 are independent of each other; both inform `B2-S1` / `B2-S2` and `B2-M1`.
- Bucket 3 candidate 3 (AFFILIATE-MGMT) is the cleanest carve-out: under any scenario the affiliate entities don't belong in PRM. Decision is just promote-or-defer.
- Bucket 3 candidate 4 (marketplace ops) is the least urgent; can wait through several audit cycles.

### Per-bucket prompts

**After Bucket 1 (12 items):**

> Bucket 1 has 12 surfaces: `B1-A1` (catalog UX drafts ready, can apply now), `B1-A2` (business_logic draft ready, can apply now), `B1-A3` (capabilities, blocked on Bucket 2 carve-out decisions), `B1-A4` (solutions, blocked on Bucket 2 carve-outs), `B1-M1` (4 to 7 modules per the chosen shape, gates everything), `B1-V1` through `B1-V4` (top 4 missing masters, must follow `B1-M1` plus `B2-M1`), the APQC TAGGING surface (1 item covering the two proposed agent_curated rows on handoffs 211 / 212), `B1-H1` and `B1-H2` (PATCH source_domain_module_id on handoffs 211 / 212, must follow `B1-M1`). Fix these now? Reply 'A1 and A2 only' (immediate-actionable UX drafts and business_logic), 'all' (commits to a module shape and carve-out path), 'just A1', 'just M1 with shape X' (X = 4 / 5 / 6 / 7 per `B2-M1`), or 'skip until Bucket 2 and Bucket 3 resolve'.

**After Bucket 2 (6 items):**

> Bucket 2 has 6 judgment calls: B2-M1 (4 to 7 module shape), B2-R1 (regulations), B2-T1 (partner training ownership: PRM-mastered vs LMS-mastered), B2-T2 (commission ownership: PRM vs SALES-PERF vs split), B2-S1 (promote TCMA and relocate through-channel marketing), B2-S2 (promote ECOSYSTEM-LED-GROWTH and relocate co-sell). What is your call on each? I will wait for your decision per item before acting. Consider resolving B2-S1 and B2-S2 together since they jointly rewrite the module set, and resolving B2-T1 / B2-T2 alongside since both shrink or grow the module count.

**After Bucket 3 (4 items):**

> Bucket 3 has 4 candidates. Vet via Phase 0 research, or eyeball-mode? If eyeball, name which to treat as confirmed. Candidate #1 (TCMA, mention count 1) and #2 (ECOSYSTEM-LED-GROWTH, mention count 1) jointly rewrite the PRM module set if promoted; candidate #3 (AFFILIATE-MGMT, mention count 1) is the cleanest carve-out and probably promotes regardless; candidate #4 (marketplace ops) is the least urgent and can defer.

### Report-only follow-ups (owed by other domains)

- **CRM B9 owes outbound on `account.linked_to_partner` and `opportunity.closed_won_with_partner` to PRM.** Cannot author from this side; surfaces when CRM is next validated, blocked on PRM mastering `channel_partners`. Today: CRM has no edge to PRM in either direction.
- **LMS B9 owes outbound on `enrollment.completed` and `certification.issued` to PRM** (if `B2-T1` resolves to LMS-mastered). Cannot author until LMS has an "external learner" mode for partner training. Surfaces when LMS is next validated.
- **CPQ B9 owes consumer reference to PRM's `deal_registrations` for protected-pricing lookup at quote time.** Today CPQ doesn't model the partner-resold case. Surfaces in the next CPQ audit.
- **SALES-PERF B9 owes either inbound consumer of PRM `partner_channel_commission_runs` (if `B2-T2` resolves to PRM-owned) or outbound `commission_accrual.created` to PRM for scorecard inputs (if `B2-T2` resolves to SALES-PERF-owned).** Surfaces in the next SALES-PERF audit.
- **S2P B9 owes inbound `mdf_claim.approved` consumer or outbound `payment.disbursed` to PRM.** Surfaces in the next S2P audit, blocked on PRM mastering `mdf_claims`.
- **SUB-MGMT B9 owes inbound `subscription.partner_of_record_changed` to PRM** for partner-resold subscription tracking. Surfaces in the next SUB-MGMT audit, blocked on PRM mastering `channel_partners`.
- **TCMA as a candidate domain** (mention count 1, newly queued by this audit). If promoted, PRM's through-channel marketing capabilities and proposed `PRM-PARTNER-MARKETING` module relocate. Surfaces in the next TCMA triage decision.
- **ECOSYSTEM-LED-GROWTH as a candidate domain** (mention count 1, newly queued by this audit). If promoted, PRM's co-sell and account-mapping capabilities and proposed `PRM-PARTNER-CO-SELL` module relocate. Surfaces in the next ECOSYSTEM-LED-GROWTH triage decision. Also rewires the ownership of handoff 211 (the co_sell.opportunity_created event would route from ECOSYSTEM-LED-GROWTH, not PRM).
- **AFFILIATE-MGMT as a candidate domain** (mention count 1, newly queued by this audit). If promoted, the affiliate entity surface (which is not in PRM today) lands cleanly outside PRM. Independent of the existing PRM gaps.

## 2026-05-31, Continuation: B1 technical fixes

Re-classified the 12 Bucket 1 items against the strict technical-fix charter (PATCH backfills derivable from existing state, deletes/PATCHes with row IDs named in the audit, inserts the audit pre-specifies in full). **Zero items qualify as technical-now; all 12 remain deferred.** No live writes, no loader authored.

Live re-verification ran before classification:

- `GET /domain_modules?domain_id=eq.96` returned `[]` (zero PRM modules, B1-M1 still open).
- `GET /handoffs?or=(id.eq.211,id.eq.212)` confirmed both rows still carry `source_domain_module_id=NULL` (B1-H1 / B1-H2 still open on the source side, target side correctly populated at 48 / 47).
- `GET /domains?id=eq.96` confirmed `business_logic=''`, `catalog_tagline=''`, `catalog_description=''` (B1-A2 and B1-A1 unchanged).

Per-item classification:

| ID | Classification | Reason |
|---|---|---|
| B1-A1 | DEFER | `catalog_tagline` and `catalog_description` are Rule #20 fields; never authored without user review of the wording. |
| B1-A2 | DEFER | `business_logic` is a description-class field whose wording must be user-approved before PATCH; the audit explicitly says "draft authored below ... then PATCH" pending user signoff. |
| B1-A3 | DEFER | 7-11 new `capabilities` rows; new entities and gated on B2-M1 / B2-S1 / B2-S2 / B2-T1 carve-out decisions. |
| B1-A4 | DEFER | 6-12 new `solutions` rows; new entities and gated on the same carve-out decisions. |
| B1-M1 | DEFER | 4-7 new `domain_modules` rows; new modules and gated on B2-M1 shape choice plus the four cross-cutting Bucket 2 calls. |
| B1-V1 | DEFER | New `data_objects` master (`channel_partners`); gated on B1-M1. |
| B1-V2 | DEFER | New `data_objects` master (`deal_registrations`); gated on B1-M1. |
| B1-V3 | DEFER | New `data_objects` masters (`mdf_requests` + `mdf_claims`); gated on B1-M1. |
| B1-V4 | DEFER | New `data_objects` master (`partner_scorecards`); gated on B1-M1. |
| B1-H1 | DEFER | PATCH target FK (`PRM-PARTNER-CO-SELL` or equivalent) does not exist in `domain_modules`; cannot resolve without B1-M1 first. |
| B1-H2 | DEFER | PATCH target FK (`PRM-PARTNER-PORTAL` or equivalent) does not exist in `domain_modules`; cannot resolve without B1-M1 first. |
| APQC TAGGING | DEFER | The audit marks both proposed `handoff_processes` rows as "surface-for-user, not auto-load" with medium / medium-low confidence; PCF resolution is explicitly unverified ("needs to run at load time") and the charter requires PCF lookup verified against live `/processes` before insert. Judgment call, not a technical fix. |

Net: 0 fixes applied, 12 deferred. No loader file created.

## 2026-05-31, Audit

### Summary

- Structural Validate b1 pass (bands A, M, B [B5/B7/B9/B9b/B10b/B11/B12], C, D, E [E1-E5], F [F1-F5], H). Re-verified live state against the 2026-05-30 audit findings.
- Current footprint unchanged since 2026-05-31 continuation: 0 modules, 0 capabilities, 0 solutions, 0 mastered data_objects, 0 `domain_data_objects` rows, 0 `domain_regulations`, 0 `domain_aliases`, 0 skills, 0 trigger_events authored from PRM masters, 0 roles scoped to Channel Sales (business_function_id 53) and 0 cross-functional roles touching PRM modules (vacuous: no PRM modules). 2 outbound handoffs (211, 212) both `record_status=new`, both `source_domain_module_id=NULL`, both untagged in `handoff_processes`. 0 inbound handoffs.
- Domain id 96, parent_domain_id 69 (CRM). `crud_percentage=92`, `business_logic=""`, `catalog_tagline=""`, `catalog_description=""`, `min_org_size="30 m <2500"`, `cost_band="$$"`, `usa_market_size_usd_m=700`, `market_size_source_year=2025`, `certification_required=false`.
- C-band still passes (owner Channel Sales 53, contributor Marketing). All other bands collapse on the M-band failure (zero modules gates B/E/F per Rule #14).
- **Bucket 1 (in-scope, agent fixable):** 12 items, all DEFER per the 2026-05-31 continuation classification (gated on B2 carve-out decisions or Rule #20 / Rule #8 user wording approval).
- **Bucket 2 (surface-for-user, judgment):** 6 items unchanged.
- **Bucket 3 (Phase 0 pending, speculative):** 4 items unchanged.

### Structural pass bands

**S1, Direct FKs to `domains`.** `business_function_domains` 2 (owner + contributor, pass). `capability_domains` 0 (FAIL A2). `domain_data_objects` 0 (FAIL B1 for non-leadership-tier sub-domain). `domain_modules` 0 (FAIL M1). `domain_module_host_domains` 0 (routinely zero, OK). `domain_regulations` 0 (optional, see B2-R1). `handoffs.source_domain_id` 2 (211, 212; both source_module NULL, FAIL B10b). `handoffs.target_domain_id` 0. `skills.domain_id` 0 (vacuous on F2, gated on M1). `solution_domains` 0 (FAIL A3). `domain_aliases` 0 (optional). `domains.parent_domain_id` 69 (CRM, intentional sub-domain).

**S2 / S3.** Vacuous (zero modules, zero masters).

**A-band.** A1 borderline: 7 metadata fields populated but `business_logic=""` with `crud_percentage=92 < 95` (FAIL per Rule #8). A2 FAIL. A3 FAIL. A4 FAIL (empty catalog_tagline and catalog_description per Rule #20). A5 skipped (opt-in).

**M-band.** M1 FAIL (zero modules; gates everything downstream). M2 / M4 / M5 / M6 / M7 / M8 vacuous on zero modules.

**B-band (B5, B7, B9, B9b, B10b, B11, B12 as scoped).**
- B5 vacuous (zero `embedded_master` rows on PRM).
- B7 vacuous (zero PRM masters from which user-edges would emanate).
- B9 partial: 2 outbound handoffs exist (211, 212) sourced via CRM-owned trigger_events 171 (`co_sell.opportunity_created` on `crm_opportunities` 100) and 172 (`partner_referral.qualified` on `crm_leads` 99). Both trigger_events are CRM-mastered, not PRM-mastered. PRM authors zero of its own trigger_events. The outbound events PRM should publish (`channel_partner.created`, `deal_registration.approved`, `mdf_request.approved`, `mdf_claim.approved`, `partner_scorecard.finalized`) are unmodeled and gated on B1-M1 plus the PRM masters landing.
- B9b vacuous (zero PRM modules; intra-domain cross-module surface is empty).
- B10b FAIL on the source side for both 211 and 212: `source_domain_module_id=NULL`. Target side correctly populated (48 = CRM-PIPELINE-MGT for 211, 47 = CRM-LEAD-MGT for 212). The source-side fix requires PRM modules first.
- B11 vacuous (zero masters means no alias surface).
- B12 vacuous (zero masters means no lifecycle states).

**C-band.** C1 pass (owner Channel Sales 53, contributor Marketing). C2 vacuous (zero capabilities).

**D-band.** D1 deferred (UI spot-check is a manual step; no fixes applied this pass).

**E-band.** E1 / E2 / E3 / E4 / E5 vacuous (zero modules means no `role_modules` surface; zero PRM-scoped Channel Sales roles confirmed via `/roles?business_function_id=eq.53` returning empty). Becomes applicable once B1-M1 lands.

**F-band.** F1 / F2 / F3 / F4 / F5 vacuous (zero PRM-scoped skills, zero modules). Becomes applicable once B1-M1 lands.

**H-band (H1).** 2 cross-domain handoffs in scope (both outbound to CRM), 0 tagged in `handoff_processes`. Catalog quality headline: 0 of 2 approved (0%). Process health: 0 agent_curated rows exist. Volume target on N=2 is 1 to 2 NEW `agent_curated` rows during this audit; both proposed below but classified as DEFER (the PCF resolution call is medium-confidence and the audit charter surfaces, does not auto-load). Substantive APQC lookup ran live: `processes?process_name=ilike.*partner*&source_framework=eq.apqc_pcf_cross_industry` returns candidates including process 151 ("Manage sales partners and alliances", L3, external_id 10187), process 143 ("Develop sales partner/alliance relationships", L3, external_id 10130), process 147 ("Manage leads/opportunities", L3, external_id 10182), process 712 ("Manage opportunity pipeline", L4, external_id 20011). Best L3 anchor for 211 (`co_sell.opportunity_created`): 147 "Manage leads/opportunities" (parent), with secondary 151 "Manage sales partners and alliances" (partner-anchored framing) and 712 as the L4 child. Best L3 anchor for 212 (`partner_referral.qualified`): 147 "Manage leads/opportunities" (the partner-referral fork of lead intake), with secondary 151. Both rows surface-for-user, not auto-loaded.

### Pass classification, all items rolled forward

The 2026-05-31 continuation already classified all 12 Bucket 1 items as DEFER (none qualify as technical-now under the strict technical-fix charter: every B1-A* requires user-approved wording per Rule #8 or Rule #20; B1-M1 is gated on the four cross-cutting Bucket 2 carve-out calls; B1-V1 through B1-V4 are gated on B1-M1; B1-H1 / B1-H2 cannot resolve without modules to PATCH against; APQC TAGGING is surface-for-user with medium confidence). No live state has changed since that continuation. All 12 carry through to this audit unchanged.

### v2 schema reclassification

For `state.yaml schema_version: 2`, the prior `record_status: new` flat list maps onto the b1a / b1b / b2 / b3 buckets as follows:

- **b1a (agent-solvable, next-pass technical action with no pending blockers):** zero items. Every Bucket 1 item is either gated on user-approved wording (B1-A1, B1-A2 per Rule #20 / Rule #8 / Rule #15) or on a structural prerequisite that itself depends on user judgment (B1-A3, B1-A4, B1-M1, B1-V*, B1-H1, B1-H2 all gated on B2-M1 plus B2-S1 plus B2-S2 plus B2-T1 plus B2-T2). APQC TAGGING is gated on user approval of the PCF tag (medium-confidence call, per Rule #1).
- **b1b (blocked, parked on a named blocker):** 10 items. B1-A1 and B1-A2 blocked on user-approved wording. B1-A3 and B1-A4 blocked on the Bucket 2 carve-out decisions. B1-M1 blocked on the same Bucket 2 carve-out decisions. B1-V1 through B1-V4 blocked on B1-M1. B1-H1 and B1-H2 blocked on B1-M1. APQC TAGGING blocked on user approval of the PCF cite.
- **b2 (user judgment required):** 6 items unchanged (B2-M1 / B2-R1 / B2-T1 / B2-T2 / B2-S1 / B2-S2).
- **b3 (vendor research pending, Phase 0):** 4 items unchanged (TCMA, ECOSYSTEM-LED-GROWTH, AFFILIATE-MGMT, marketplace-ops). The three named carve-out candidates also remain queued in `audits/_missing-domains.md` from the 2026-05-30 run.

`next_action_by` derives `user` (b1a empty, b2 non-empty per the priority chain).

### Report-only follow-ups (owed by other domains, unchanged from 2026-05-30)

- CRM B9 owes outbound on `account.linked_to_partner` and `opportunity.closed_won_with_partner` to PRM (blocked on PRM mastering `channel_partners`).
- LMS B9 owes outbound on `enrollment.completed` and `certification.issued` to PRM (gated on B2-T1 resolution).
- CPQ B9 owes consumer reference to PRM `deal_registrations` for protected-pricing quote-time lookup.
- SALES-PERF B9 owes either inbound consumer of PRM `partner_channel_commission_runs` (if B2-T2 resolves to PRM-owned) or outbound `commission_accrual.created` to PRM (if B2-T2 resolves to SALES-PERF-owned).
- S2P B9 owes inbound consumer of `mdf_claim.approved` or outbound `payment.disbursed` to PRM (gated on PRM mastering `mdf_claims`).
- SUB-MGMT B9 owes inbound `subscription.partner_of_record_changed` to PRM (gated on PRM mastering `channel_partners`).
- Three candidate-domain triage decisions remain queued in `audits/_missing-domains.md` (TCMA, ECOSYSTEM-LED-GROWTH, AFFILIATE-MGMT). If any promotes, PRM's proposed module set and capability list rewrite accordingly.

### JWT errors

None encountered this pass.

### Files written

- Appended this section to `audits/PRM/history.md`.
- Rewrote `audits/PRM/state.yaml` in `schema_version: 2` (PENDING only; resolved items live only here).

## 2026-06-07 - Audit (state-driven execute, bulk batch)

### Summary

State-driven Validate execute per SKILL.md Rule #21. Worked only the open items in `audits/PRM/state.yaml`; no fresh from-scratch audit. Domain id 96 resolved and re-verified live against the state snapshot (`/domains?domain_code=eq.PRM` -> id 96, parent_domain_id 69 = CRM). Overlay test confirms PRM is master-bearing (partner deal registrations, MDF requests / claims, partner scorecards are real persisted records), but the domain is UNBUILT: live re-verify returned 0 `domain_modules` (M1 hard fail), 0 `capability_domains`, 0 `domain_data_objects` masters, 0 `solution_domains`. Only structure present: the domain row, 2 `business_function_domains` rows (owner Channel Sales / business_function_id 53, contributor Marketing / business_function_id 22, both already present), and 2 outbound handoffs (211, 212) to CRM with `source_domain_module_id` NULL.

Per the UNBUILT clause (do not scaffold; surface the build; leave the cascade), the only EXECUTE-classified item was the domain-level catalog UX. Everything structural is left for the build, which is gated on the six b2 decisions.

Notable live finding: **B1B-APQC-211-212 is already done.** `handoff_processes` already carries (211, 151) and (212, 151), both `proposal_source='agent_curated'`, `record_status='new'` (the partner-anchored framing, process 151 "Manage sales partners and alliances", L3, ext 10187). The state's alternative "default 147" was never the loaded value. There is no clean additive PCF match remaining (the 147-vs-151 fork is a genuine judgment call, and 151 already covers both handoffs well), so nothing to insert. This item is closed as already-done and dropped from `state.yaml`.

### Executed (counts)

- **Catalog UX (Rule #20 / A4): 1 PATCH.** `domains.id=96` `catalog_tagline` + `catalog_description` authored in buyer voice (workflow + value; no vendor names; no em-dash; American English) and written into the two empty fields. Row stays `record_status='new'`. This was state item B1B-A1, whose `blocked_by: user_decision` was exactly the stale surface-before-write gate that Rule #20 / Rule #21 / the execute charter direct us to ignore. Module-grain catalog UX (M8) is N/A (0 modules). Loader: `.tmp_deploy/2026-06-07_prm_state_driven_execute.ts`.

No other writes. `business_logic` (B1B-A2) was deliberately NOT written: it is a Rule #8 description-class field, not a Rule #20 catalog UX field, and stays user-wording-gated as part of the build cascade.

### Surfaced (no write; for the user)

- **B1A-BUILD (the build).** PRM is unbuilt (0 modules / 0 caps / 0 masters / 0 solutions). Build Phase A -> M -> B -> S, shape gated on b2. Not scaffolded per the UNBUILT clause.
- **6 b2 decisions, all open:** B2-M1 (4 to 7 module shape), B2-R1 (regulation scope), B2-T1 (partner training / certification ownership: PRM-mastered vs LMS-mastered), B2-T2 (partner-channel commission ownership: PRM vs SALES-PERF vs split), B2-S1 (promote TCMA out of PRM), B2-S2 (promote ECOSYSTEM-LED-GROWTH out of PRM). B2-S1 / B2-S2 jointly rewrite the module set and are splits, not b3.
- **B1B-A2 (business_logic):** Rule #8 description-class field, empty while crud_percentage=92 (< 95). User-approved wording required before PATCH; draft is in the 2026-05-30 B1-A2 section.

### Left (untouched)

- **Blocked b1b cascade (9 items):** B1B-A2 (user wording), B1B-A3 (caps) / B1B-A4 (solutions, Phase-A market shape) / B1B-M1 (modules) all blocked on the build + b2 carve-outs; B1B-V1..V4 (masters) blocked on B1B-M1; B1B-H1 / B1B-H2 (source_domain_module_id backfill on handoffs 211 / 212) unresolvable because the target PRM module does not exist (0 modules). These clear as the build lands.
- **b3 backlog (4 candidates):** B3-1 (TCMA), B3-2 (ECOSYSTEM-LED-GROWTH), B3-3 (AFFILIATE-MGMT), B3-4 (partner-marketplace ops). Non-blocking ideas; B3-1 / B3-2 / B3-3 are also queued in `audits/_missing-domains.md`.
- **B1B-APQC-211-212:** closed as already-done (see Summary); dropped from state.

### JWT errors

None encountered this pass.

### Files written

- `.tmp_deploy/2026-06-07_prm_state_driven_execute.ts` (the execute loader; 1 catalog-UX PATCH).
- Appended this section to `audits/PRM/history.md`.
- Rewrote `audits/PRM/state.yaml` (schema_version 2): dropped executed B1B-A1 and closed B1B-APQC-211-212; kept B1A-BUILD, the 9-item blocked b1b cascade, 6 b2, 4 b3; set `last_audit` 2026-06-07, `next_action_by` user.

### UI links (tables written)

- https://tests.semantius.app/domain_map/domains?id=eq.96
