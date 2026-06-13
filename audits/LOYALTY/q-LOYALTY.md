# Loyalty Management (LOYALTY): questions waiting for you

## What this domain is
Reward repeat customers with points, tiers, and personalized perks that grow customer lifetime value.

Enroll members and keep their profiles current, then move them up tiers as they engage. Run the points ledger end to end: accrual rules, a rewards catalog you control, and redemption workflows. Layer on bonus campaigns, partner coalitions, and a self-service member portal, and wire the program into your commerce, CRM, and marketing-automation systems.

---

q1: (answer this first) Four follow-up loaders (member and master aliases, intra-domain relationships, the users / actor edges, and the cross-domain edges that mirror your four outbound handoffs) need the exact tuples authored before they can run. Who should write those cluster-drafts?

- a) Delegate to an agent Phase-B draft, which returns the proposed tuples for your review before anything loads.
- b) You author the cluster-drafts markdown yourself.

Recommended: a. The agent can draft all four sets and bring them back for sign-off, which unblocks the bulk of the remaining build without putting authoring work on you. This decision feeds the alias, relationship, users-edge, and cross-domain-edge loaders, so it unlocks the most downstream work.

a1:

---

q2: The buyer-voice catalog tagline and description have been drafted for the LOYALTY domain and all three modules and are sitting unapproved. Should the drafted wording be approved as written?

- a) Approve the drafted wording as-is.
- b) Rewrite (you supply the exact text).
- c) Delegate to marketing.

Recommended: a. The drafts follow buyer voice (workflow plus value) and are ready to stand; rewrite only if a specific phrase is off.

a2:

---

q3: loyalty_tiers is a config table (a program designer sets tiers up once and occasionally edits thresholds, with no per-row workflow). Should it be exempt from lifecycle states?

- a) Accept the exemption: no lifecycle states authored, no notes written.
- b) Load minimal states (draft, active, retired) for audit traceability anyway.
- c) Defer.

Recommended: a. A config-shape master with no per-row workflow is the textbook exemption case, so skipping states keeps the model honest.

a3:

---

q4: Two capabilities look like they belong to a different owner than the domain default (Marketing). Should the member portal go to Customer Success and the points ledger go to Finance?

- a) Confirm both (member portal to Customer Success, points ledger to Finance).
- b) Confirm the member portal only.
- c) Confirm the points ledger only.
- d) Propose an alternative split.

Recommended: a. The member portal is a service surface (Customer Success) and the points ledger carries accrual-liability accounting (Finance), so both overrides fit.

a4:

---

q6: Core Financial Management forwards loyalty transaction to Customer Loyalty Management to monitor customer loyalty program benefits to the enterprise and the customer, but Customer Loyalty Management does not yet have anyone assigned to monitor customer loyalty program benefits to the enterprise and the customer, so this step has no owner. How should it be handled?
- a) Record it now as work Customer Loyalty Management owns, and assign a named owner once Customer Loyalty Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Customer Loyalty Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a6:

---

q7: Marketing Automation forwards loyalty member to Customer Loyalty Management to develop and manage marketing plans, but Customer Loyalty Management does not yet have anyone assigned to develop and manage marketing plans, so this step has no owner. How should it be handled?
- a) Record it now as work Customer Loyalty Management owns, and assign a named owner once Customer Loyalty Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Customer Loyalty Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a7:

---

## Optional (will not hold up the build)

q5: Six extra masters show up across the flagship loyalty vendors (promotion campaigns, partner programs, member referrals, tier-qualification periods, gamification badges, point-expiration policies), several of which would give the engagement module its own in-domain master. Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the current build settles. Promotion campaigns and partner programs back capabilities that already exist with no entity, so they are the strongest; the rest want a verification pass first.

a5:

---

<!-- agent map, ignore: q1=B2-CLUSTER-DRAFTS q2=B2-CATALOG-UX q3=B2-LIFECYCLE-EXEMPT q4=B2-CAP-OWNERSHIP q5=B3-PROMOTION-CAMPAIGNS+B3-PARTNER-PROGRAMS+B3-MEMBER-REFERRALS+B3-TIER-QUAL-PERIODS+B3-GAMIFICATION-BADGES+B3-POINT-EXPIRATION-POLICIES q6=B2-B9D-OWN-643 q7=B2-B9D-OWN-23 | domain_id=78 -->
