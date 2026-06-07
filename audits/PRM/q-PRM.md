# Partner Relationship Management (PRM): questions waiting for you

## What this domain is
Run your channel program end-to-end. Recruit and tier partners, register and protect joint deals, fund partner-led marketing through MDF, and score partner performance against revenue and growth targets.

Partner Relationship Management runs the indirect-revenue motion. Onboard channel partners into tiered programs, give them a branded portal with role-based access, and operate the day-to-day workflows that hold the program together: deal registration with conflict resolution, MDF requests and claims with proof-of-spend, co-op fund accrual, partner training and certification enrollment, and joint business planning. Track every dollar of partner-influenced pipeline, score partners on revenue, growth, certification compliance, and MDF utilization, and surface co-sell signals from CRM when you and a partner overlap on the same prospect. Built for Channel Sales leaders and the channel-ops teams that run the program, with handoffs to Marketing for through-channel campaign syndication and Finance for MDF settlement and partner-channel commission accruals.

---

q1: (answer this first) How should Partner Relationship Management be split into modules (the sub-areas of the product)?

- a) 4 modules: Partner Portal (partner orgs, users, programs, tiers, agreements), Deal Registration (registrations and deal protection), MDF and Co-op (fund requests, claims, proof-of-spend), and Partner Analytics (scorecards, QBRs, indirect-revenue rollups). This is the cleanest shape and assumes training, through-channel marketing, and co-sell all move out of PRM (see q2, q3, q4).

- b) 5 modules: the four above plus a Partner Training module (only if training stays inside PRM, see q4).

- c) 6 modules: the four above plus a Partner Marketing module (only if through-channel marketing stays inside PRM, see q2).

- d) 7 modules: the four above plus Partner Training, Partner Marketing, and Partner Co-Sell (only if training, through-channel marketing, and co-sell all stay inside PRM, see q2, q3, q4).

Recommended: a. The four-workflow-pillar shape matches how flagship PRM vendors converge, and it is consistent with promoting through-channel marketing and co-sell out (q2, q3) and treating partner training as a consumed surface (q4). This choice gates the modules, capabilities, masters, and every link below it, so it unlocks the rest of the build.

a1:

---

q2: Should Through-Channel Marketing Automation (partner campaign templates, lead distribution to partners, co-branded assets) become its own domain instead of living inside PRM?

- a) Promote it to its own domain and move the through-channel marketing surface (and vendors like Sproutloud, Mindmatrix, Structured Web) out of PRM.

- b) Keep it inside PRM as a Partner Marketing module (matches organizations that have not separated channel marketing from channel ops).

- c) Defer the decision until it comes up more often.

Recommended: a. Through-channel marketing is a distinct market with a different buyer (a Channel Marketing Manager, not the Channel Chief), so promoting it keeps PRM focused. Picking (a) here is what makes the 4-module shape in q1 work.

a2:

---

q3: Should ecosystem-led growth (partner account mapping and co-sell orchestration, the Crossbeam / Reveal / PartnerTap space) become its own domain instead of living inside PRM?

- a) Promote it to its own domain and move the co-sell and account-mapping surface out of PRM.

- b) Keep it inside PRM as a Partner Co-Sell module (the bundled model used by Salesforce Partner Cloud and Oracle PRM).

- c) Defer the decision until it comes up more often.

Recommended: a. The buyer is distinct (a partnerships or ecosystem lead), and account-mapping tools like Crossbeam and Reveal do not compete with classic PRM platforms. Note that (a) re-homes the existing co-sell handoff into CRM onto the new domain.

a3:

---

q4: Where should partner training and certification be mastered?

- a) Mastered in the LMS domain, with PRM consuming enrollments and certifications for scorecard inputs (architecturally cleanest; LMS already owns courses and enrollments).

- b) Mastered in PRM with its own Partner Training module (matches what Impartner, Zift, and ZINFI ship, but duplicates the LMS surface).

- c) Hybrid: PRM masters certifications, LMS masters training enrollments and course completions.

Recommended: a. Partner training is essentially the LMS with an external-learner audience, so letting LMS own it avoids a duplicate training surface. This keeps PRM at the 4-module shape in q1 (it needs LMS to support an external-learner mode).

a4:

---

q5: Where should partner-channel commissions (rebates, SPIFs, tiered margin) be mastered?

- a) PRM-owned (the channel team operates commissions as a partner-program lever; matches the Impartner / ZINFI feature set).

- b) Owned by the sales-performance domain with PRM consuming them (cleaner; commission setup, accrual, and payout sit in one place across direct and partner sales).

- c) Split: program-level rules and rebate accrual in PRM, individual payout settlement in the sales-performance domain.

Recommended: b. Keeping all commission accrual and payout in the sales-performance domain avoids two places computing pay, and PRM just consumes the results for partner scorecards.

a5:

---

q6: Which regulations should be tagged onto Partner Relationship Management?

- a) Baseline four: GDPR, CCPA / CPRA, FCPA, SOX.

- b) Baseline four plus the UK Bribery Act.

- c) Extended: baseline plus ITAR / EAR plus HIPAA, flagged as industry-scoped.

- d) None, defer to industry-specific overlays.

Recommended: a. The baseline four cover partner contact data (GDPR, CCPA), anti-bribery on commission-eligible partners (FCPA), and the financial-statement impact of MDF and commission accruals (SOX). Add (b) or (c) only for specific channels. Low stakes, does not block the build.

a6:

---

## Optional (will not hold up the build)

q7: Two further carve-outs sit outside classic PRM: affiliate management (publisher / influencer / affiliate-network mechanics, the Impact.com / PartnerStack space) and partner-marketplace operations (cloud-marketplace co-sell, the Tackle.io / AppDirect space). Should I research these and stand them up as their own domains where they hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Affiliate management is the cleanest carve-out (its entity surface does not belong in PRM under any scenario); partner-marketplace operations is the least urgent and can wait. PartnerStack is the one crossover case worth a closer look.

a7:

---

<!-- agent map, ignore: q1=B2-M1 q2=B2-S1 q3=B2-S2 q4=B2-T1 q5=B2-T2 q6=B2-R1 q7=B3-3+B3-4 | domain_id=96 -->
