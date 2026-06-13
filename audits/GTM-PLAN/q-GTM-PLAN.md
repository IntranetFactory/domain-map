# Go-to-Market Planning (GTM-PLAN): questions waiting for you

## What this domain is
Plan your year. Decide where to play, how much capacity to invest, and which segments to lead with, then push the locked plan to Sales, Marketing, and Finance.

Go-to-Market Planning runs the cross-functional planning that decides how you enter and grow markets. Define your ICP, carve segments, score and tier accounts, draft territories and quotas, and model capacity-to-coverage against your revenue targets. Run what-if scenarios across geographies, channels, and segments, layer launch orchestration on top, and when the plan locks, push the artifacts downstream: territories to Sales Performance Management, target accounts to CRM and Marketing Automation, capacity numbers to Finance and EPM. Built for Sales Ops and RevOps teams who own the annual GTM motion, partnering with Marketing Ops, Product, and Finance.

---

q1: (answer this first) How should Go-to-Market Planning be split into modules (the sub-areas of the product)?

- a) Eight modules, one per capability: ICP and segmentation; account targeting; territory; capacity; channel mix; launch orchestration; scenario modeling; plan-to-execution handoff.
- b) Five core modules along the lines real planning vendors draw: planning core (segmentation, ICP, named-account lists, account scoring together); territory and quota; capacity; scenario modeling; plan lock and handoff. (Channel mix and launch orchestration are then decided by q9 and q4 respectively, rather than getting their own up-front module.)
- c) Three modules: plan design, scenario modeling, and plan lock and push.

Recommended: b. Vendor reality, not tidiness, sets this. Anaplan Sales Planning ships discrete apps (Account Segmentation; Territory and Quota; Sales Capacity; Crediting; Incentive Comp), which proves territory and quota travel together as one surface and capacity as another, but it does NOT split segmentation, ICP, and account scoring into three separate products: they are one segmentation app. Pigment bundles the same way (territory plus quota together; capacity and scenario as surfaces inside one platform). The CRM-native vendors collapse even further: Salesforce Sales Planning is a single product whose tabs are Segment/Hierarchy, Territory Carving, Quota Allocation, and Collaboration, and Fullcast unifies plan plus handoff in one plan-to-pay surface. So eight (a) over-splits: no vendor sells segmentation, ICP, and scoring as three products. Three (c) under-splits: it would fuse capacity with scenario against Anaplan's explicit app boundary. The five-module seam matches what Anaplan, Pigment, Fullcast, and Salesforce actually expose. This choice drives the whole build, so it unlocks the rest.

a1:

---

q2: Should the launch-orchestration and channel-mix capabilities carry their own ownership overrides instead of inheriting Sales Operations?

- a) Override both (launch orchestration to Product Management, channel mix to Marketing).
- b) Leave both inherited under Sales Operations (it owns the whole cross-functional shell).
- c) Override launch orchestration only, leave channel mix inherited.
- d) Wait until PMM is promoted (q4) and relocate launch orchestration there entirely.

Recommended: d for launch orchestration, with channel mix overridden to Marketing. The Phase 0 surface shows launch plans, launch milestones, readiness checklists, and battlecards are mastered only by the PMM/CI tools (Klue, Crayon, Aha!), never by the GTM-planning vendors, so the cleaner move is to relocate launch orchestration into a promoted PMM domain (q4) rather than leave it as a Sales-Ops capability with an override. Channel mix is claimed by Marketing-Ops budget tools (HubSpot Marketing Hub, Salesforce Marketing Cloud Account Engagement) for its spend-allocation half, so a Marketing override on the channel-mix capability matches the buyer. If you decline to promote PMM in q4, fall back to (a) and override launch orchestration to Product Management.

a2:

---

q3: Which compliance frameworks should be tagged onto Go-to-Market Planning?

- a) None (it is a planning shell, regulations apply downstream at CRM, Marketing Automation, and the ABM platform).
- b) GDPR only (account-scoring may include EU-resident intent data).
- c) GDPR plus CCPA (US plus EU intent-data coverage).
- d) GDPR plus CCPA plus SOX (full conservative set).

Recommended: a. The Phase 0 surface confirms GTM-PLAN masters cohort-level segments, ICPs, and named-account lists, not contact-level PII. The contact-level intent surface that actually triggers GDPR/CCPA exposure (person-level scoring, intent signals) lives in Demandbase and 6sense, the downstream ABM engagement system, not in the planning domain. If account scores ever ingest EU or US contact-level intent, the consent and subject-access entities belong with that data in the promoted ABM-PLATFORM (q5), not here. So no regulation rows on GTM-PLAN.

a3:

---

q4: Should PMM (Product Marketing Management) be promoted as its own domain, taking the launch-orchestration capability and its module out of Go-to-Market Planning?

- a) Promote PMM and relocate launch orchestration.
- b) Keep launch orchestration in Go-to-Market Planning and let PMM be the launch-readiness consumer downstream.
- c) Wait until PMM is mentioned in more domains before deciding (cross-domain blast radius).

Recommended: a. None of the GTM-planning vendors (Anaplan, Pigment, Fullcast, Salesforce, Varicent) master launch plans, launch milestones, readiness checklists, or battlecards; those surfaces are absent from their products entirely. They are mastered by a distinct market with a distinct buyer: Klue and Crayon (competitive intelligence and launch support, bought by Product Marketing) and Aha! (cross-functional product-launch orchestration, bought by Product/PMM). Highspot and Seismic sit enablement-adjacent, confirming launch lives in a PMM/PM neighborhood, not the Sales-Ops/RevOps planning neighborhood. The buyer split is clean, so launch orchestration is not a feature the GTM-planning vendors carry; promote PMM and move the launch entities there.

a4:

---

q5: Should ABM-PLATFORM be promoted as its own domain, taking the market-segmentation and account-scoring capabilities (the ICP and account-targeting modules) out of Go-to-Market Planning?

- a) Promote ABM-PLATFORM and relocate both capabilities and their entities (ICP, target lists, all account scoring).
- b) Promote ABM-PLATFORM as the downstream engagement platform, but keep ICP, named account lists, and planning-grade account scoring in Go-to-Market Planning (the planning-vs-engagement cut).
- c) Defer until ABM-PLATFORM is mentioned in more domains.

Recommended: b. The vendors draw a clean planning-vs-engagement line themselves. Demandbase and 6sense do model ICP definition, target-account lists, and account scoring with a Marketing-Ops buyer, but their differentiator is engagement: 6sense predictive intent (in-market detection before a hand is raised), Demandbase's multi-trillion monthly signals, ad targeting, and web personalization. The planning side (ICPs and named account lists authored once per planning cycle, segment-level scoring) is also natively present in Anaplan, Pigment, Fullcast, and Salesforce Sales Planning, which proves it belongs to the planning domain. The engagement-only entities (intent signals, web-personalization rules, ad-campaign targets, contact-level scoring) sit only on the ABM side. So GTM-PLAN authors the ICPs, target lists, and planning-grade scores; ABM-PLATFORM ingests them and runs engagement. Promote ABM-PLATFORM owning intent/ad/personalization, not the planning-side ICP authoring.

a5:

---

q6: If PMM (q4) and ABM-PLATFORM (q5) are promoted, the domain description will need a light rewrite to reflect that launch orchestration moved to PMM and the engagement side moved to ABM-PLATFORM (the ICP and named-list authoring stays). Should I rewrite it once those two are settled? (yes/no)

Recommended: yes, but only after q4 and q5 are answered. With the recommended answers (promote PMM, keep ICP/lists in GTM-PLAN while ABM takes engagement) the rewrite is small: drop launch orchestration, clarify GTM-PLAN authors ICPs and named lists that the ABM platform then engages against. The new wording goes through your review. If neither promotion happens, keep the current broad description.

a6:

---

q7: When should the pairwise reconciliation against neighbors (CRM, Marketing Automation, EPM, Product Management, and the peer leadership-tier domains) be scheduled?

- a) Run pairwise passes against each non-leadership-tier neighbor (CRM, Marketing Automation, EPM, Product Management) right after the build lands.
- b) Wait for the full leadership-tier wave (Go-to-Market Planning, Sales Performance, Revenue Intelligence, Account Planning, PRM) to settle, then run all bilateral diffs in one campaign.
- c) Run only the highest-priority pair first (Go-to-Market Planning to Sales Performance, since territory drafts hand off cleanly).

Recommended: a. Reconciling against the non-leadership-tier neighbors as soon as the build exists catches handoff gaps early without waiting on the whole leadership-tier wave.

a7:

---

## Optional (will not hold up the build)

q8: Should SALES-PLANNING-PLATFORM be promoted as its own domain, absorbing the territory-carving, capacity-planning, and scenario-modeling capabilities? (yes/no)

Recommended: no, do not promote it. The premise was that Gartner named a distinct "Sales Planning Platforms" category in 2024 to 2025; Phase 0 could not verify that. What Gartner actually publishes is the Sales Performance Management Market Guide / Magic Quadrant (which explicitly contains territory planning and quota planning) plus the xP&A Market Guide (where Anaplan sits). The asserted standalone category is not substantiated, so do not carve out a domain on a category that cannot be cited. The market behavior is real (Anaplan, Pigment, Fullcast, Salesforce, Varicent compete as a sales-planning cluster, and Anaplan and Varicent do sell Incentive Comp as a separate app from Territory and Quota, confirming a buyer split from commissions), so keep territory, capacity, and scenario inside Go-to-Market Planning as its Sales-Ops planning core for now. Revisit only if a Gartner document title for the category surfaces.

a8:

---

q9: Where should channel-mix planning live: stay whole in Go-to-Market Planning, relocate entirely to Marketing Automation, or split?

- a) Keep it whole in Go-to-Market Planning.
- b) Relocate it entirely to Marketing Automation.
- c) Split: keep the planning-grade channel-mix master (which channels carry which segments, a Sales-Ops coverage decision) in Go-to-Market Planning, and relocate paid-media and campaign budget allocation downstream to Marketing Automation / the promoted ABM-PLATFORM.

Recommended: c. There is no clean pure-play; the surface is claimed three ways by three buyers. Anaplan and Pigment model channel mix inline with plan modeling as a Sales-Ops coverage decision (which routes carry which segments). Demandbase and 6sense treat channel allocation as ABM engagement spend (ad budget by account tier), a Marketing-Ops decision. HubSpot Marketing Hub and Salesforce Marketing Cloud Account Engagement treat it as marketing-automation campaign budget with ROI dashboards. Because the entity bifurcates by buyer, keep the thin strategic channel-mix master here and let the spend-execution allocation live downstream.

a9:

---

<!-- agent map, ignore: q1=B2-M1 q2=B2-C1 q3=B2-R1 q4=B2-S1 q5=B2-S2 q6=B2-D1 q7=B2-P1 q8=B3-SALES-PLANNING-PLATFORM q9=B3-CHANNEL-MIX-SCOPE | domain_id=104 -->
