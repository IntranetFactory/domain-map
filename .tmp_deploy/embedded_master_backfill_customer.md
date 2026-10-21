# Embedded-master + necessity backfill: customer cluster

Cluster: customer (14 domains). Per SKILL.md Phase 2/4. Read-only audit; no Semantius writes yet.

Cluster flagship per SKILL.md ("Look for the cluster flagship first") = **`customers` (data_object_id 97)**. Decomposed slices today: CRM (sales view, master), CDP (identity-resolved unified profile, master), CSM (service view, master), + contributors from MA / LOYALTY / B2C-COMM / SMM. Many of those contributors should be promoted to `embedded_master + required` because every standalone customer-facing point-solution holds its own customer table when deployed alone — that's the structural silos signal Signal 1b was designed to surface.

## 1. Cluster scope

| domain_code | domain_name | domain_id |
|---|---|---|
| CRM | Customer Relationship Management | 69 |
| CDP | Customer Data Platform | 72 |
| MA | Marketing Automation | 70 |
| CPQ | Configure-Price-Quote | 73 |
| SALES-ENG | Sales Engagement | 95 |
| LOYALTY | Customer Loyalty Management | 78 |
| B2C-COMM | Digital Commerce | 71 |
| PRM | Partner Relationship Management | 96 |
| SMM | Social Media Management | 106 |
| REV-INTEL | Revenue Intelligence | 103 |
| SALES-PERF | Sales Performance Management | 102 |
| GTM-PLAN | Go-to-Market Planning | 104 |
| ACCT-PLAN | Strategic Account Planning | 105 |
| CSM | Customer Service Management | 30 |

Total: 14. Five (PRM, REV-INTEL, SALES-PERF, GTM-PLAN, ACCT-PLAN) currently have **zero** `domain_data_objects` rows — they are leadership / aggregation-tier per SKILL.md Phase 3 and need `derived` / `consumer` rows authored from scratch (Section 3).

## 2. Existing rows snapshot

Total existing rows in cluster: **78**. (CSM=9, CRM=15, MA=11, B2C-COMM=14, CDP=10, CPQ=9, LOYALTY=4, SALES-ENG=5, SMM=11; PRM/REV-INTEL/SALES-PERF/GTM-PLAN/ACCT-PLAN=0.)

| domain_code | data_object_name | role | necessity | notes (first 80 chars) |
|---|---|---|---|---|
| CSM | knowledge_articles | contributor | required | Customer-facing audience for the same KB — same underlying article record, … |
| CSM | contracts | contributor | required | Service / support contracts contribute their CSM-specific terms (SLA tier, … |
| CSM | customers | master | required | Service view — owns the case history, entitlements, SLAs, CSAT, support … |
| CSM | customer_cases | master | required | (empty) |
| CSM | customer_entitlements | master | required | (empty) |
| CSM | csat_responses | master | required | (empty) |
| CSM | customer_subscriptions | consumer | required | Drives the customer_entitlements record on activation; reads subscription … |
| CSM | customer_events | contributor | required | Case-creation, escalation, resolution, and CSAT events feed CDP for unifie… |
| CRM | customers | master | required | (empty) |
| CRM | contacts | master | required | (empty) |
| CRM | leads | master | required | (empty) |
| CRM | opportunities | master | required | (empty) |
| CRM | pipeline_stages | master | required | (empty) |
| CRM | sales_activities | master | required | (empty) |
| CRM | customer_cases | consumer | required | Account-health signal: case volume, critical-severity count, recent CSAT, … |
| CRM | customer_subscriptions | consumer | required | Account-health view: which subscriptions are active, MRR by account, expan… |
| CRM | customer_invoices | consumer | required | Payment-status overlay on the account: overdue invoices, write-offs, recen… |
| CRM | customer_events | contributor | required | Sales activities (call, email, meeting, demo) and opportunity-stage transi… |
| CRM | audience_segments | consumer | required | Account-level segment overlay (e.g. 'high-LTV', 'expansion-candidate') sur… |
| CRM | customer_attributes | consumer | required | Account view surfaces CDP-derived attributes (LTV, churn-likelihood, prefe… |
| CRM | lead_scores | consumer | required | MQL threshold drives lead routing and rep assignment in CRM. |
| CRM | sales_emails | contributor | required | Rep-sent emails are logged into the account activity timeline; CRM is the … |
| CRM | conversation_intelligence_records | consumer | required | Deal-context overlay: competitor mentions, sentiment shifts, commitments v… |
| MA | customers | contributor | required | Contributes marketing engagement: email opens, clicks, campaign participat… |
| MA | contacts | contributor | required | Contributes engagement state, score deltas, opt-in/preferences. |
| MA | customer_events | contributor | required | Campaign delivery, open, click, bounce, unsubscribe events feed CDP's even… |
| MA | audience_segments | consumer | required | Segments target campaigns and nurture journeys. |
| MA | customer_attributes | consumer | required | Segment criteria and personalization token resolution read from customer_a… |
| MA | campaigns | master | required | (empty) |
| MA | marketing_emails | master | required | (empty) |
| MA | lead_scores | master | required | (empty) |
| MA | nurture_journeys | master | required | (empty) |
| MA | forms | master | required | (empty) |
| B2C-COMM | customers | contributor | required | Contributes storefront purchase history, cart abandonment, browse behavior… |
| B2C-COMM | leads | contributor | required | Contributes first-party purchase-intent signals (high-value abandons, prod… |
| B2C-COMM | customer_subscriptions | consumer | required | Reads SUB-MGMT subscriptions for replenish-style recurring-purchase coordi… |
| B2C-COMM | customer_invoices | consumer | required | Reads SUB-MGMT customer invoices for AR reconciliation on recurring orders |
| B2C-COMM | customer_events | contributor | required | Storefront browse, cart, checkout, return events feed CDP. |
| B2C-COMM | audience_segments | consumer | required | Personalized storefront rendering driven by segment membership. |
| B2C-COMM | campaigns | consumer | required | Reads MA campaign targeting for cart-abandonment follow-up + promotional m… |
| B2C-COMM | orders | master | required | (empty) |
| B2C-COMM | order_lines | master | required | (empty) |
| B2C-COMM | carts | master | required | (empty) |
| B2C-COMM | products | master | required | (empty) |
| B2C-COMM | storefronts | master | required | (empty) |
| B2C-COMM | checkouts | master | required | (empty) |
| B2C-COMM | payment_transactions | master | required | (empty) |
| B2C-COMM | fulfillments | master | required | (empty) |
| B2C-COMM | shipments | master | required | (empty) |
| B2C-COMM | coupons | master | required | (empty) |
| CDP | customers | master | required | Unified resolved profile — owns the identity-resolved behavioral view acro… |
| CDP | contacts | contributor | required | CDP-resolved attributes (identity match, behavioral score, lifecycle stage… |
| CDP | customer_events | master | required | (empty) |
| CDP | identity_graphs | master | required | (empty) |
| CDP | audience_segments | master | required | (empty) |
| CDP | customer_attributes | master | required | (empty) |
| CDP | customer_journeys | master | required | (empty) |
| CDP | campaigns | consumer | required | Reads campaign metadata to enrich campaign-event records with attribution … |
| CDP | lead_scores | consumer | required | Lead scores enrich the resolved customer profile for use across channels. |
| CDP | sales_emails | consumer | required | Open/reply/click events feed CDP as sales-touch engagement signals. |
| CPQ | opportunities | consumer | required | Reads opportunity context to generate quotes; awarded quotes feed back as … |
| CPQ | quotes | master | required | Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred t… |
| CPQ | quote_lines | master | required | Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred t… |
| CPQ | product_configurations | master | required | Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred t… |
| CPQ | pricing_rules | master | required | Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred t… |
| CPQ | quote_discounts | master | required | Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred t… |
| CPQ | discount_approvals | master | required | Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred t… |
| CPQ | product_bundles | master | required | Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred t… |
| CPQ | contract_drafts | master | required | Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred t… |
| LOYALTY | customers | contributor | required | Contributes loyalty tier, points balance, redemption history, rewards enga… |
| LOYALTY | loyalty_members | master | required | LOYALTY-side identity; CRM contributor when customer_id resolves. |
| LOYALTY | loyalty_transactions | master | required | LOYALTY master; finance contributor for liability accrual. |
| LOYALTY | loyalty_tiers | master | required | LOYALTY master; reference data shared with marketing for personalisation. |
| SALES-ENG | contacts | contributor | required | Contributes cadence touchpoint history, call recordings, sales-email engag… |
| SALES-ENG | cadences | master | required | (empty) |
| SALES-ENG | call_recordings | master | required | (empty) |
| SALES-ENG | sales_emails | master | required | (empty) |
| SALES-ENG | conversation_intelligence_records | master | required | (empty) |
| SMM | customers | contributor | required | Contributes social-channel engagement signals (likes, shares, replies, vid… |
| SMM | contacts | contributor | required | Contributes social handles per network, public profile data, social engage… |
| SMM | leads | consumer | required | Reads CRM-mastered leads to match social interactions back to known leads … |
| SMM | audience_segments | consumer | required | Reads CDP-mastered segments for targeted organic posts and paid amplificat… |
| SMM | campaigns | contributor | required | Contributes the social-channel and influencer-marketing slice of multi-cha… |
| SMM | social_posts | master | required | (empty) |
| SMM | social_accounts | master | required | (empty) |
| SMM | social_messages | master | required | Owns inbound on-channel conversations (comments, DMs, mention-replies, rev… |
| SMM | social_mentions | master | required | Owns off-channel brand/keyword mentions surfaced by listening. CDP is a co… |
| SMM | social_listening_topics | master | required | (empty) |
| SMM | influencers | master | required | (empty) |

## 3. NEW rows to add

Sorted by domain_code. data_object_id shown for loader convenience. All necessity defaults assume "required" unless flagged optional.

### CRM (id 69) — flagship; canonical authority already complete. Adds: small set of consumer reads currently missing.

| domain_code | data_object_name | role | necessity | proposed notes | reasoning |
|---|---|---|---|---|---|
| CRM | products | consumer | optional | Reads product catalog for opportunity/line-item context; only required in product-led CRM deployments — service-led CRMs skip. | CRM workflows reference products on opportunity line items, but many CRM-only deployments don't model products at all (the deal amount lives at opp level). |
| CRM | quotes | consumer | required | Reads awarded quotes from CPQ to update opportunity amount/close-date and to attach the quote to the account record. | CPQ-on-CRM (Salesforce CPQ, DealHub) feeds quote-accepted back as the source-of-truth for opportunity amount; required when CPQ deployed. Optional only if no CPQ — but the data_object existing implies CPQ presence in catalog. Mark required. |
| CRM | orders | consumer | optional | Reads booked orders for account-health overlay (recent purchases, churn risk). Only present when OMS/B2C-COMM integrated. | Many B2B CRM-only deployments never see orders (sales stops at contract). Optional. |
| CRM | loyalty_members | consumer | optional | Reads loyalty tier / points overlay on the account record for retention plays. | Optional — only B2C CRMs care. |
| CRM | social_messages | consumer | optional | Inbound social DMs / mentions converted to CRM tasks when sales-relevant. | Optional — only when SMM integrated. |

### CDP (id 72) — canonical for unified profile / identity / segments. Adds: reads/derives missing.

| domain_code | data_object_name | role | necessity | proposed notes | reasoning |
|---|---|---|---|---|---|
| CDP | leads | consumer | optional | Reads CRM-mastered leads for identity stitching when lead identifiers are the only key available pre-conversion. | Lead-stage identity is fuzzy; not every CDP processes lead records. Optional. |
| CDP | opportunities | consumer | optional | Reads opportunity events as high-value B2B signals to enrich the unified profile (deal-in-progress flag, deal-won lifecycle stage). | B2B CDPs (6sense-style) consume opportunities; B2C CDPs skip. Optional. |
| CDP | orders | consumer | optional | Reads order events for transactional signals into the unified profile (frequency, AOV, last-purchase). | Optional — B2C CDPs care; B2B CDPs may skip. |
| CDP | loyalty_members | consumer | optional | Reads loyalty member state for tier-aware personalization rules. | Optional — only B2C CDPs. |
| CDP | social_mentions | consumer | optional | Reads SMM-mastered listening mentions for sentiment signals tied to identity-resolved profiles. | Optional. |
| CDP | customer_subscriptions | consumer | optional | Reads subscription state as a lifecycle attribute for the unified profile. | Optional — subscription-business CDPs only. |

### MA (id 70) — promote contributor → embedded_master on customers/contacts/leads. MA standalone always local-masters a marketable list.

| domain_code | data_object_name | role | necessity | proposed notes | reasoning |
|---|---|---|---|---|---|
| MA | leads | embedded_master | required | MA local-masters a marketing-qualified lead list in standalone deployments (Mailchimp, Mautic). When CRM present, reads CRM leads and contributes engagement back. | Every MA point-solution maintains a list of marketable people that can include net-new leads not yet promoted to CRM. The standalone-vs-holistic split is the textbook embedded_master pattern. Existing row is contributor only — that captures back-flow but not local mastery. See Section 4 for the change. |

(Note: the customers/contacts/leads rows are role changes, not new rows. They appear in Section 4. No additional brand-new MA rows beyond the leads embedded_master here.)

| MA | sales_activities | contributor | optional | Email-open / form-fill events optionally pushed back as sales_activities into CRM's activity timeline. | Optional — many MA tools just publish customer_events; only Marketo-style deployments push true sales_activities back. |

### B2C-COMM (id 71) — major demotions; OMS/PIM/PSP are canonical for several rows currently marked master.

| domain_code | data_object_name | role | necessity | proposed notes | reasoning |
|---|---|---|---|---|---|
| B2C-COMM | contacts | embedded_master | optional | B2C storefronts often capture contact-shaped data (email, name) only at checkout — local-mastered when no CRM is integrated; demotes to consumer on CRM contact when present. | Headless / DTC commerce with light account models may skip a contacts table altogether — they store everything on the customer. Optional. |
| B2C-COMM | opportunities | contributor | optional | High-AOV / quote-request flows from B2C storefronts may write opportunity rows back to CRM for sales-assist hand-off. | Optional — only B2B-flavored storefronts or quote-to-cart shapes. |
| B2C-COMM | customer_cases | contributor | optional | Storefront-initiated return / order-issue flows may write a CSM case directly from the order page. | Optional — many commerce sites route returns to a separate RMA flow without touching CSM. |
| B2C-COMM | order_allocations | master | required | Owns storefront-side inventory allocation against the order (reserved-on-cart, deallocated-on-abandonment). OMS canonical when integrated. | The data_object exists (id 424). Storefront cart-to-checkout allocation is a B2C-COMM concern. Mark master for now — flag in Section 5 (might want embedded_master when OMS catalog entry surfaces). |
| B2C-COMM | return_authorizations | embedded_master | optional | Storefront-initiated returns; OMS / order-mgmt canonical when integrated. | Optional — many storefronts hand off RMAs to a separate returns tool. |

### CPQ (id 73) — missing customer-side reads.

| domain_code | data_object_name | role | necessity | proposed notes | reasoning |
|---|---|---|---|---|---|
| CPQ | customers | consumer | required | Reads CRM-mastered customers for the account context the quote attaches to. CPQ standalone (rare) would embedded_master. | Default CPQ pattern (CPQ-on-CRM) is consumer; standalone is too rare to justify embedded_master. Required — no quote can be authored without a customer reference. |
| CPQ | contacts | consumer | required | Reads contacts for quote recipient / signer routing. | Required — quote needs a target. |
| CPQ | products | embedded_master | required | CPQ local-masters its own sellable-product catalog (configurable bundles, attribute models, pricing intelligence) — distinct from PIM master. PIM canonical for catalog facts; CPQ adds the configuration / pricing overlay. | Every CPQ tool maintains its own product catalog augmented with config rules and price logic that PIM doesn't model. Classic embedded_master shape. |
| CPQ | leads | consumer | optional | Lead-stage quotes (configure-to-lead) read lead context; rare. | Optional — most CPQ flows start post-opportunity. |
| CPQ | sales_activities | contributor | optional | Quote-sent, quote-viewed, quote-signed events may be logged back into CRM's activity timeline. | Optional — many CPQs publish their own quote events to MA / CDP, not into CRM activity. |

### LOYALTY (id 78) — promote customers contributor → embedded_master. Add transactional reads.

| domain_code | data_object_name | role | necessity | proposed notes | reasoning |
|---|---|---|---|---|---|
| LOYALTY | contacts | embedded_master | optional | Loyalty programs hold marketing-opt-in / channel preference state per member — often modelled as a contact row in standalone tools. | Optional — many loyalty tools hold this on `loyalty_members` directly and skip a contacts table. |
| LOYALTY | orders | consumer | required | Reads commerce orders to compute points-earned, tier-progress, and redemption-eligible spend. | Required — without an order signal the loyalty program has nothing to award against. Many loyalty tools accept this via webhook from POS / commerce; the read is load-bearing. |
| LOYALTY | order_lines | consumer | optional | Line-level point earning (category multipliers, SKU-specific promos) requires line detail. | Optional — many loyalty programs award flat per-order points. |
| LOYALTY | customer_events | contributor | optional | Tier-up, points-earned, points-expired events published to CDP for unified profile + cross-channel marketing. | Optional — only loyalty programs integrated with CDP publish back. |
| LOYALTY | campaigns | contributor | optional | Loyalty-targeted campaigns (e.g. tier-specific promos) contribute to MA umbrella campaigns. | Optional. |
| LOYALTY | coupons | consumer | optional | Reward redemptions issued as coupons in commerce. | Optional — some loyalty tools mint their own redemption codes; others use commerce-side coupons. |

### SALES-ENG (id 95) — promote contributor → embedded_master on contacts. Add customer / opportunity reads.

| domain_code | data_object_name | role | necessity | proposed notes | reasoning |
|---|---|---|---|---|---|
| SALES-ENG | customers | embedded_master | optional | Account-based sales engagement tools (6sense Engage, Outreach) local-master account-level constructs when ABM is the deployment shape; consumer on CRM customers in classic CRM-on-engagement deployments. | Optional — pure sequence-based tools (SalesLoft basic) may skip accounts entirely. |
| SALES-ENG | leads | consumer | required | Reads CRM-mastered leads to populate cadence enrollments. | Required — without leads / contacts a cadence has no target. |
| SALES-ENG | opportunities | consumer | optional | Reads opportunity context to enrol opp-bound cadences (post-meeting follow-up, late-stage nurture). | Optional — many engagement tools work at the contact / lead level and ignore opportunities. |
| SALES-ENG | sales_activities | contributor | required | Cadence touchpoints (call, email, meeting) write back as sales_activities in CRM's activity timeline. | Required — the round-trip into CRM is the whole point of engagement-tool deployment. |
| SALES-ENG | customer_events | contributor | optional | Touchpoint events (call.placed, email.opened, meeting.held) optionally fed to CDP for cross-channel attribution. | Optional. |

### CSM (id 30) — promote contributor on customers note (already master multi-master OK). Add contacts embedded_master + product / order reads.

| domain_code | data_object_name | role | necessity | proposed notes | reasoning |
|---|---|---|---|---|---|
| CSM | contacts | embedded_master | required | CSM standalone (Zendesk, Freshdesk) local-masters contact records keyed on email; reads CRM contacts when present. | Every standalone helpdesk maintains its own contact table — classic embedded_master. Required because no case can be opened without a requester. |
| CSM | products | consumer | optional | Reads PIM-mastered products for entitlement scoping (product-specific support). | Optional — service-only CSM deployments without product entitlement may skip. |
| CSM | orders | consumer | optional | Reads orders to scope warranty / order-specific support entitlements. | Optional — many CSM deployments don't tie cases to orders directly. |
| CSM | leads | contributor | optional | Negative-experience signals (case-spike-with-NPS-drop) may surface as anti-leads in CRM. | Optional — speculative integration. |
| CSM | sales_activities | contributor | optional | Customer-success-team touchpoints may double-publish into CRM activity timeline. | Optional — depends on tool overlap with SALES-ENG vs CSM. |
| CSM | conversation_intelligence_records | consumer | optional | Reads support-call CI records for case context (when CI extended beyond sales). | Optional. |
| CSM | knowledge_base_articles | master | required | Customer-facing KB (knowledge_base_articles, id 410) is the CSM-owned variant of the article corpus, distinct from the IT-ops knowledge_articles row already present. | The existing CSM row is on `knowledge_articles` (id 51, IT-ops KB). The customer-facing data_object is `knowledge_base_articles` (id 410). CSM canonically masters the customer-facing one. |
| CSM | customer_feedback_items | master | required | Owns inbound feedback items captured from case-resolution surveys, in-product feedback widgets, support-driven NPS follow-ups. | Customer feedback is a CSM concern when not handled by a dedicated VoC tool. Flag in Section 5 — could move to PROD-MGMT canonical instead. |

### SMM (id 106) — promote contributor → embedded_master on contacts (social handles ARE a contact slice).

| domain_code | data_object_name | role | necessity | proposed notes | reasoning |
|---|---|---|---|---|---|
| SMM | opportunities | contributor | optional | Social-sourced opportunities (social-selling) may write opp records into CRM. | Optional — only sales-led SMM deployments. |
| SMM | sales_emails | contributor | optional | DM-to-email handoff: social DMs occasionally bridge into sales email cadences. | Optional. |

(Plus role change on contacts in Section 4.)

### PRM (id 96) — currently empty. Partner Relationship Management is operational (deal registration, MDF, partner portals) — local-masters multiple records when standalone.

| domain_code | data_object_name | role | necessity | proposed notes | reasoning |
|---|---|---|---|---|---|
| PRM | customers | embedded_master | required | PRM local-masters partner organizations (which present as account-shaped records) — partner companies, tiering, regions. CRM canonical for direct-customer accounts; PRM holds the partner sub-population. | Partner accounts ARE accounts; CRM hosts them in some deployments, PRM hosts them when partner program is large enough to warrant a dedicated tool (Impartner, PartnerStack). Required — no PRM works without partner records. |
| PRM | contacts | embedded_master | required | Partner contacts (partner reps, channel managers, partner principals) local-mastered in PRM; CRM canonical in fully-integrated deployments. | Required — partner portal needs login-bearing contact records. |
| PRM | leads | embedded_master | required | Deal-registration leads submitted by partners are first-classed in PRM; CRM canonical lead store eats them on approval. | Required — deal registration is core PRM and the resulting lead lives in PRM until promoted. |
| PRM | opportunities | embedded_master | required | Partner-sourced opportunities (registered deals) local-mastered through approval; CRM canonical post-promotion. | Required. |
| PRM | sales_activities | contributor | optional | Partner-team touchpoints occasionally published back to CRM. | Optional. |
| PRM | campaigns | consumer | optional | Partner-targeted MDF campaigns read MA-mastered campaign defs. | Optional. |
| PRM | quotes | consumer | optional | Partner-issued quotes (channel quoting) read CPQ-mastered records. | Optional — only PRM deployments with partner-CPQ integration. |
| PRM | customer_events | contributor | optional | Partner-portal interaction events fed into CDP unified profile. | Optional. |

### REV-INTEL (id 103) — pure derived/analytics tier per SKILL.md Phase 3. Currently empty. All rows derived against CRM upstream.

| domain_code | data_object_name | role | necessity | proposed notes | reasoning |
|---|---|---|---|---|---|
| REV-INTEL | opportunities | derived | required | Republishes deal-risk, deal-momentum, win-likelihood scores against the CRM-mastered opportunity. | REV-INTEL (Gong Forecast, Clari) derives its core signals against opportunities — definitive derived per SKILL.md. |
| REV-INTEL | leads | derived | optional | Lead-velocity / lead-quality scoring derived against CRM-mastered leads. | Optional — some REV-INTEL platforms focus on late-stage only. |
| REV-INTEL | customers | derived | required | Account-health / account-engagement scores derived against CRM/CDP customer master. | Required — account view is core. |
| REV-INTEL | pipeline_stages | derived | required | Stage-conversion rates / aging signals derived against CRM-mastered stages. | Required — pipeline analytics core. |
| REV-INTEL | sales_activities | derived | required | Activity-density / activity-quality scoring against CRM-mastered activities. | Required — core signal. |
| REV-INTEL | conversation_intelligence_records | derived | required | Coaching scores / talk-ratio / topic-mention derivations against SALES-ENG-mastered CI records. | Required — Gong-style derivations. |
| REV-INTEL | sales_emails | derived | required | Reply-rate / engagement scoring derived against SALES-ENG-mastered emails. | Required. |
| REV-INTEL | call_recordings | derived | required | Sentiment / topic detection derived against SALES-ENG-mastered call recordings. | Required. |
| REV-INTEL | forecasts | derived | required | Republishes rolling forecasts derived from opportunity-stage + activity signals; EPM (Finance) consumes the consolidated forecast. | Forecasts (data_object id 39) live in the finance data set; REV-INTEL derives the sales-cycle forecast against opportunities. |

### SALES-PERF (id 102) — sales performance / ICM tier. Currently empty.

| domain_code | data_object_name | role | necessity | proposed notes | reasoning |
|---|---|---|---|---|---|
| SALES-PERF | opportunities | derived | required | Quota-attainment / commission-eligible-revenue derived against won opportunities. | Required — quotas attach to opps. |
| SALES-PERF | sales_activities | derived | optional | Activity-based incentive components derived against logged activities (SPIFs, MBOs). | Optional — many comp plans are pure revenue-based. |
| SALES-PERF | customers | derived | optional | Account-level performance attribution (named-account quotas, share-of-wallet). | Optional. |
| SALES-PERF | quotes | consumer | optional | Reads booked quotes for revenue recognition timing in comp calc. | Optional — some plans compute on quote close, others on invoice / payment. |
| SALES-PERF | customer_invoices | consumer | optional | Reads paid invoices for "commission on collection" plans. | Optional — common in services-led businesses, rare in subscription. |

### GTM-PLAN (id 104) — go-to-market / territory / segment planning. Currently empty.

| domain_code | data_object_name | role | necessity | proposed notes | reasoning |
|---|---|---|---|---|---|
| GTM-PLAN | customers | derived | required | Account scoring / segmentation / territory assignment derived against CRM customers. | Required — territory planning core. |
| GTM-PLAN | opportunities | derived | required | Pipeline-coverage / capacity-vs-target derived against opportunities. | Required. |
| GTM-PLAN | leads | derived | required | Lead-coverage / source-mix planning derived against leads. | Required. |
| GTM-PLAN | audience_segments | derived | required | Republishes CDP segment shapes as GTM segments (ICP, named-account list, persona). | Required. |
| GTM-PLAN | pipeline_stages | consumer | required | Reads stage definitions to compute coverage / velocity benchmarks. | Required. |
| GTM-PLAN | campaigns | consumer | optional | Reads MA campaign mix to align GTM plan with marketing spend. | Optional. |

### ACCT-PLAN (id 105) — strategic account planning. Currently empty.

| domain_code | data_object_name | role | necessity | proposed notes | reasoning |
|---|---|---|---|---|---|
| ACCT-PLAN | customers | derived | required | Account plans, whitespace maps, growth scenarios derived against CRM-mastered accounts. | Required — the entire domain operates per account. |
| ACCT-PLAN | opportunities | derived | required | Pursuit plans, deal-strategy artifacts derived against opportunities tied to the account. | Required. |
| ACCT-PLAN | contacts | consumer | required | Relationship maps / org-chart capture reads CRM contacts. | Required — relationship maps are core. |
| ACCT-PLAN | sales_activities | consumer | optional | Activity rollups (touchpoints-per-stakeholder) inform plan execution. | Optional. |
| ACCT-PLAN | conversation_intelligence_records | consumer | optional | Reads CI records for stakeholder-sentiment / commitment-tracking inputs to the plan. | Optional. |
| ACCT-PLAN | customer_subscriptions | consumer | optional | Active subscriptions per account inform expansion / renewal planning. | Optional. |

## 4. CHANGES to existing rows

| domain_code | data_object_name | from | to | reasoning |
|---|---|---|---|---|
| MA | customers | contributor + required | embedded_master + required | MA standalone (Mailchimp, Mautic) local-masters a customer / subscriber list when no CRM is present. The existing contributor description (engagement back-flow) is the demotion path when CRM is canonical — that's the textbook embedded_master shape, not contributor. Re-author the notes to combine both: "MA local-masters its own subscriber list in standalone deployments; when CRM is present, reads CRM customers and contributes engagement back (opens, clicks, opt-ins, campaign participation)." |
| MA | contacts | contributor + required | embedded_master + required | Same logic — every MA point-solution maintains its own marketable contact list. Re-note as "MA local-masters marketing-qualified contacts in standalone deployments; demotes to consumer on CRM contact when present; contributes engagement state / score deltas / opt-ins back to CRM canonical." |
| B2C-COMM | customers | contributor + required | embedded_master + required | Every commerce platform local-masters customer accounts (Shopify, BigCommerce, custom DTC). The existing contributor row only describes back-flow; the standalone reality is full local mastery. Re-note: "B2C-COMM local-masters customer / shopper accounts in standalone deployments (DTC); when CRM/CDP integrated, reads canonical customers and contributes storefront purchase + browse signals back." |
| B2C-COMM | leads | contributor + optional | embedded_master + optional | Commerce-sourced anonymous-shopper-to-known-shopper transitions create lead-shaped records in standalone deployments. Optional — many storefronts don't model leads, they go anonymous → customer. |
| B2C-COMM | orders | master + required | embedded_master + required | OMS (Order Management System) is the canonical owner of orders in any holistic deployment; B2C-COMM (storefront commerce) local-masters orders only when no separate OMS is deployed. OMS is missing from the catalog today, so the multi-master count today over-credits B2C-COMM. Flag in Section 5 (OMS catalog gap). Re-note: "B2C-COMM local-masters storefront orders; OMS canonical when deployed (currently not in catalog). Headless commerce deployments increasingly defer to OMS." |
| B2C-COMM | order_lines | master + required | embedded_master + required | Same reasoning as orders. |
| B2C-COMM | products | master + required | embedded_master + required | PIM (Product Information Management) is canonical for the product catalog; B2C-COMM local-masters storefront-side products (storefront-specific descriptions, channel-specific pricing, SEO copy) but defers to PIM for catalog facts. PIM is not in catalog today — flag in Section 5. Re-note: "B2C-COMM local-masters storefront-side product overlay (channel-specific copy, pricing, merchandising); PIM canonical for master catalog facts when deployed." |
| B2C-COMM | payment_transactions | master + required | embedded_master + required | Payment processors / PSPs (Stripe, Adyen) are canonical for payment transaction records; B2C-COMM holds a local copy of authorized / captured payments tied to orders. PSPs are not in catalog as a domain — flag in Section 5. |
| B2C-COMM | fulfillments | master + required | embedded_master + optional | WMS (Warehouse Management) / TMS (Transportation Management) / OMS canonical when integrated; B2C-COMM local-masters fulfillment status visible from the storefront's order detail page. Optional — many headless commerce deployments don't model fulfillment locally at all (read directly from WMS API). WMS/TMS not in catalog — flag in Section 5. |
| B2C-COMM | shipments | master + required | embedded_master + optional | Same as fulfillments — TMS canonical, often externalised. Many deployments just show a tracking number and never local-master shipments. |
| LOYALTY | customers | contributor + required | embedded_master + required | Loyalty programs (Punchh, Yotpo Loyalty, Smile.io) local-master member / customer records keyed on email or phone when commerce / CRM integration is absent. The existing contributor row captures the back-flow; the standalone reality is full local mastery. Re-note: "LOYALTY local-masters program members (often distinct from CRM customers — phone-keyed at POS, email-keyed online); when CRM / CDP integrated, demotes to consumer on the canonical customer and contributes tier / points / redemption history back." |
| SALES-ENG | contacts | contributor + required | embedded_master + required | Sales engagement standalones (Outreach, SalesLoft) absolutely local-master a contact / prospect list — that's where the engagement state lives. The existing contributor row only describes back-flow. Re-note: "SALES-ENG local-masters prospect / contact records keyed on email; when CRM present, reads CRM contacts and contributes cadence touchpoint history, call recordings, sales-email engagement back." |
| SMM | contacts | contributor + required | embedded_master + required | SMM standalones (Hootsuite, Sprout Social, Sprinklr) local-master a social-handle-keyed contact list (social profiles, network-specific handles, engagement state). When CRM integrated, demotes to consumer-on-contact + contributor-of-social-attributes. |
| CSM | customers | master + required | master + required (notes refresh) | Keep master (cluster-flagship multi-master pattern). Refresh notes to explicitly state slice: "CSM canonically masters the service slice of customer (cases, entitlements, CSAT, support contracts). Co-master alongside CRM (sales slice), CDP (identity-resolved profile), and SUB-MGMT (financial slice). Standalone CSM (Zendesk, Freshdesk) is the sole customer master; demotes to slice-master when CRM / CDP / SUB-MGMT present." |
| CSM | customer_cases | master + required | master + required (notes added) | Backfill notes: "Canonical owner of the support case record — lifecycle, severity, SLA timing, agent assignment, resolution, customer-facing comments. No demotion path; CSM is sole canonical owner." |
| CSM | customer_entitlements | master + required | master + required (notes added) | Backfill notes: "Canonical owner of the entitlement record (what support tier the customer is entitled to, expiry, named contacts). Driven by customer_subscriptions activation; consumed by case-routing rules." |
| CSM | csat_responses | master + required | master + required (notes added) | Backfill notes: "Canonical owner of post-case survey responses; contributes to CDP (engagement signal) and feeds REV-INTEL (account-health derivation)." |
| CRM | customers | master + required | master + required (notes added) | Backfill notes: "Sales view — canonically owns account record, ownership / territory, deal pipeline, contract relationships. Co-master alongside CDP (unified profile), CSM (service view), SUB-MGMT (financial view)." |
| CRM | contacts | master + required | master + required (notes added) | Backfill notes: "Sales view — canonically owns contact record (relationship-mgmt slice, sales-owned attributes). Co-master with CDP (identity-resolved attributes), MA (engagement state), SMM (social handles)." |
| CRM | leads | master + required | master + required (notes added) | Backfill notes: "Canonical owner of the pre-opportunity lead record; sourced by MA (form fills), SMM (social), B2C-COMM (high-intent shoppers), PRM (deal registration)." |
| CRM | opportunities | master + required | master + required (notes added) | Backfill notes: "Canonical owner of the sales-cycle opportunity; CPQ contributes awarded quote amounts; REV-INTEL derives risk / momentum scores; SALES-PERF derives commission eligibility." |
| CRM | pipeline_stages | master + required | master + required (notes added) | Backfill notes: "Canonical owner of stage definitions / exit criteria; consumed by GTM-PLAN, REV-INTEL." |
| CRM | sales_activities | master + required | master + required (notes added) | Backfill notes: "Canonical owner of the activity timeline; SALES-ENG / SMM / MA contribute touchpoints back." |
| MA | campaigns | master + required | master + required (notes added) | Backfill notes: "Canonical owner of the campaign record (umbrella + per-asset metadata); SMM contributes social-channel slice, B2C-COMM consumes for cart-abandonment / promotional triggering." |
| MA | marketing_emails | master + required | master + required (notes added) | Backfill notes: "Canonical owner of marketing email content + send / open / click telemetry; CDP consumes events." |
| MA | lead_scores | master + required | master + required (notes added) | Backfill notes: "Canonical owner of MQL scoring rules + per-lead score; CRM consumes for routing thresholds; CDP enriches unified profile." |
| MA | nurture_journeys | master + required | master + required (notes added) | Backfill notes: "Canonical owner of multi-step automated journeys; distinct from CDP customer_journeys (CDP-mastered, identity-resolved cross-channel journey)." |
| MA | forms | master + required | master + required (notes added) | Backfill notes: "Canonical owner of marketing form definitions + submission records; submissions write into leads / contacts master at CRM." |
| CPQ (all 8 master rows) | quotes, quote_lines, product_configurations, pricing_rules, quote_discounts, discount_approvals, product_bundles, contract_drafts | master + required | master + required (notes added) | Backfill notes per row (suggested in Section 5 follow-up). Existing notes flag "Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred" — those notes should be retained but augmented with slice-ownership descriptions on the next pass. Not a role / necessity change. |
| SALES-ENG (all 4 master rows) | cadences, call_recordings, sales_emails, conversation_intelligence_records | master + required | master + required (notes added) | Backfill notes: "Canonical owner of cadence definitions / per-prospect enrollment; REV-INTEL derives engagement scores; CDP consumes events." (analogous notes for the other three). Not a role / necessity change. |
| LOYALTY (all 3 master rows) | loyalty_members, loyalty_transactions, loyalty_tiers | master + required | master + required (notes already present, fine) | No change. Existing notes already capture co-master / contributor relationships. |
| SMM (4 master rows w/o notes) | social_posts, social_accounts, social_listening_topics, influencers | master + required | master + required (notes added) | Backfill notes per existing slice-owned semantics (the 2 already-noted SMM rows — social_messages, social_mentions — are good models). Not a role / necessity change. |
| CDP (5 master rows w/o notes) | customer_events, identity_graphs, audience_segments, customer_attributes, customer_journeys | master + required | master + required (notes added) | Backfill notes: "Canonical owner of [slice]; consumed by MA, B2C-COMM, SMM, CRM for [purpose]." Not a role / necessity change. |

## 5. Boundary observations

1. **OMS / WMS / TMS / PIM / PSP catalog gap.** B2C-COMM currently masters `orders`, `order_lines`, `products`, `payment_transactions`, `fulfillments`, `shipments` because no canonical domain exists for these in the cluster. The proposed embedded_master demotions in Section 4 are written *against the assumption that those canonical domains will exist*. If those domains are not on the roadmap (cluster plan lists OMS in the industry-b cluster — `OMS` is there), then the demotions need to be conditional on the canonical row landing. **Action for human review**: confirm OMS will surface in industry-b and decide demotion timing. Same for PIM (no PIM domain in catalog — possible new gap in customer or master-data clusters), PSP/payment-processor (no domain), WMS/TMS (no domain — possibly in field-facilities or industry-b).

2. **`fulfillments` / `shipments` are likely WMS/TMS-canonical, but those aren't in the customer cluster.** Recommend deferring the role flip on these two until WMS/TMS domains exist. Marked them embedded_master + optional in Section 4 as a placeholder; safer might be to leave as master + required for now and flag.

3. **CDP `customers` master is genuinely a distinct slice from CRM `customers` master.** The cluster flagship pattern works as designed here — multi-master with each domain owning a distinct slice (sales view / service view / unified profile / financial view). No change to CDP master rows for customers / contacts authority. The contributor row on CDP `contacts` could be debated — CDP could embedded_master contacts too — but the existing note ("CDP-resolved attributes enrich the operational contact record back in CRM") is genuinely contributor-shaped: CDP doesn't local-master a contact list, it enriches an existing one. Keep contributor.

4. **REV-INTEL / SALES-PERF / GTM-PLAN / ACCT-PLAN as derived-only.** Per SKILL.md Phase 3 leadership-tier rule, none of these get synthetic master rows. The proposed rows are all `derived` or `consumer`. This is the correct shape but means these four domains contribute **zero** to Signal 1 / Signal 1b regardless of how many derived rows are added — by design, they live on the *signal-consumer* side of the burden score, not the *master / embedded_master* side.

5. **PRM as embedded_master-heavy is unusual for the "aggregation tier" framing in SKILL.md.** SKILL.md lists PRM alongside REV-INTEL / SALES-PERF / GTM-PLAN / ACCT-PLAN as leadership-tier domains. But standalone PRM platforms (Impartner, PartnerStack, ZINFI) absolutely local-master partner accounts, contacts, leads, opportunities — they're operational point solutions, not pure analytics. The Section 3 proposal treats PRM as embedded_master-heavy. **Open question for review** (also in Section 6): is PRM mis-classified in the SKILL.md leadership-tier list, or should it stay analytics-only for catalog purposes despite the standalone reality?

6. **MA `leads` vs `customers` vs `contacts` overlap.** MA standalone deployments may local-master only one of these three (typically "subscribers" or "contacts" — a single mailable record). Modelling all three as embedded_master + required risks over-counting. The proposal puts `leads` as embedded_master (new) and `customers` + `contacts` as embedded_master (role change). If a vendor only has "contacts", that's still 3 separate Signal 1b counts. **Defensible answer**: the catalog tracks logical data_objects, not vendor-specific tables — every MA tool has *something* representing each of contacts (engageable), leads (pre-conversion-marketable), and customers (post-conversion-marketable for retention nurture). Three rows is structurally correct.

7. **Boundary object opportunity: `customer_golden_records` (id 315).** Exists as a data_object but no customer-cluster domain claims it. CDP could plausibly master it (golden record = identity-resolved canonical). Could surface as a CDP master row in a follow-up pass. Same for `match_rules` (318), `merge_rules` (319), `source_records` (320) — classic MDM boundary objects. Flag for MDM-cluster authoring, not this cluster.

8. **`knowledge_articles` (51) vs `knowledge_base_articles` (410).** Two parallel data_objects; CSM currently has a contributor row on the IT-ops `knowledge_articles` (51). Section 3 proposes adding CSM as canonical master on `knowledge_base_articles` (410) for the customer-facing KB. Open question: should `knowledge_articles` (51) be reserved for IT-ops only, and CSM moved entirely to `knowledge_base_articles` (410)? Or keep CSM contributor on 51 for the shared corpus pattern described in the existing notes?

9. **`customer_feedback_items` (407) ownership.** Proposed CSM master. But PROD-MGMT (Productboard-style) could equally claim it. Flag.

10. **Cluster flagship verification:** the `customers` data_object (id 97) currently has 3 canonical masters (CRM, CDP, CSM) plus this pass adds 5+ embedded_master rows (MA, LOYALTY, B2C-COMM, SALES-ENG ABM, possibly CPQ, PRM). That's the predicted "3-4 canonical masters + multiple embedded_masters" flagship shape per SKILL.md — the customer cluster's flagship hypothesis holds.

## 6. Open questions for human review

1. **OMS catalog timing**: confirm OMS surfaces in industry-b cluster as planned, then decide whether to ship B2C-COMM order/order_line demotions now (pre-OMS) or hold until OMS lands. Same question for PIM (no domain yet), PSP (no domain).
2. **PRM classification**: leadership-tier (per SKILL.md current text) or operational point-solution (per the embedded_master proposal in Section 3)? If the latter, SKILL.md Phase 3 wording should be updated to drop PRM from the aggregation-tier list.
3. **WMS / TMS demotion timing for B2C-COMM `fulfillments` / `shipments`**: hold as master until WMS/TMS domains exist, or demote now with the open-canonical caveat in notes?
4. **CSM `knowledge_articles` (51) vs `knowledge_base_articles` (410)**: is the existing contributor row on 51 correct, or should CSM be the master on 410 and drop the row on 51 entirely?
5. **`customer_feedback_items` master**: CSM (proposed) vs PROD-MGMT vs a dedicated VoC domain not yet in catalog?
6. **CDP `contacts`: contributor (current) vs embedded_master**: do we have CDP scenarios where CDP local-masters a contact table independently? Reverse-IP-lookup based CDPs (Demandbase, 6sense) arguably do. If yes, role-change to embedded_master. If only enrichment shape, keep contributor.
7. **MA `customer_events` contributor (id 203) — vs CDP `customer_events` master (id 189)**: the existing setup is correct (CDP canonical, MA contributes), but the same event payload is the basis for several other contributor rows (B2C-COMM, SMM, CRM, CSM). Worth verifying that the contributor-vs-publisher distinction is consistent. Not an open question for this cluster pass per se — flag for catalog-wide audit.
8. **Existence of a `salesperson` / `quota` data_object for SALES-PERF**: the catalog has `commission_splits` (354) and `compensation_plans` (153) but no obvious `quotas` row. SALES-PERF in a holistic deployment likely needs a quota data_object — gap to flag.
9. **GTM-PLAN territory / account-coverage data_object gap**: catalog has no `territories`, `coverage_plans`, `gtm_segments` data_objects. GTM-PLAN currently can only derive against existing CRM data_objects. Recommend authoring `territories` + `coverage_plans` as GTM-PLAN-mastered (would make GTM-PLAN no longer derived-only, contradicting SKILL.md Phase 3). Open question.
10. **ACCT-PLAN core data_objects (`account_plans`, `whitespace_maps`, `relationship_maps`) missing**: same gap as GTM-PLAN. ACCT-PLAN tools (Altify, DemandFarm, Revegy) clearly local-master these. Catalog scaffold gap.
11. **Convention on `master + required` notes backfill**: Section 4 lists many "notes added" rows where the role / necessity don't change — just notes. Should this go into the same load script as the role / necessity changes, or be a separate cosmetic pass? Recommend same script for atomicity.

## 7. Summary counts

- Existing rows in cluster: **78** (CSM 9, CRM 15, MA 11, B2C-COMM 14, CDP 10, CPQ 9, LOYALTY 4, SALES-ENG 5, SMM 11; PRM / REV-INTEL / SALES-PERF / GTM-PLAN / ACCT-PLAN 0)
- NEW rows proposed in Section 3: **63**
  - CRM: 5
  - CDP: 6
  - MA: 2 (one embedded_master leads + one contributor sales_activities)
  - B2C-COMM: 5
  - CPQ: 5
  - LOYALTY: 6
  - SALES-ENG: 5
  - CSM: 8
  - SMM: 2
  - PRM: 8 (was empty)
  - REV-INTEL: 9 (was empty)
  - SALES-PERF: 5 (was empty)
  - GTM-PLAN: 6 (was empty)
  - ACCT-PLAN: 6 (was empty)
  - = 5+6+2+5+5+6+5+8+2+8+9+5+6+6 = **78** new rows (recount). Numeric typo above corrected: total **78 new rows**.
- CHANGES to existing rows in Section 4: **41** (4 role-changes with notes refresh: MA customers, MA contacts, LOYALTY customers, SALES-ENG contacts, SMM contacts → 5; B2C-COMM customers + leads + 6 master→embedded_master demotions → 8; plus 28 notes-only backfills on existing canonical master rows including CRM 6, CDP 5, MA 5, CSM 4, CPQ 8 (notes augment), SALES-ENG 4, SMM 4). Recount: 5 role-changes-with-notes + 8 B2C-COMM demotions + 28 notes-only ≈ **41**.
  - Role / necessity actually changing: **13** (5 contributor→embedded_master, 8 master→embedded_master on B2C-COMM)
  - Notes-only refresh / backfill (no role change): **28**
- Open questions: **11**
- Boundary observations: **10**

**Net Signal 1b impact (count(role='embedded_master' AND necessity='required') projected after this pass), per data_object:**

| data_object | embedded_master+required count after pass |
|---|---|
| customers (97) | 5 (MA, B2C-COMM, LOYALTY, CSM contacts not counted here — only customers; B2C-COMM yes, LOYALTY yes, MA yes, SALES-ENG `customers` is optional so excluded, PRM yes; CPQ customers is consumer not embedded_master) → MA + B2C-COMM + LOYALTY + PRM = 4; if SALES-ENG `customers` is bumped to required, 5. |
| contacts (98) | 5 (MA, B2C-COMM optional — excluded, SALES-ENG, SMM, PRM, CSM = 5 required) |
| leads (99) | 3 (MA, PRM, B2C-COMM optional — excluded) |
| opportunities (100) | 1 (PRM) |
| orders (381) | 1 (B2C-COMM) — pre-OMS; will be 2 once OMS canonical lands |
| order_lines (382) | 1 (B2C-COMM) |
| products (384) | 2 (B2C-COMM, CPQ) — pre-PIM |
| payment_transactions (387) | 1 (B2C-COMM) |
| return_authorizations (427) | 0 (B2C-COMM is optional) |

The customer cluster's flagship `customers` reaches 4-5 embedded_master + required rows, **co-resident with** 3 canonical masters (CRM, CDP, CSM) and several contributors. Total integration-burden Signal 1 + 1b count for `customers` after this pass = **3 master + 4-5 embedded_master = 7-8** structural-ownership rows — that's the highest single-record integration burden of any data_object in the catalog so far, which matches the killer-hypothesis prediction for the customer-facing cluster.
