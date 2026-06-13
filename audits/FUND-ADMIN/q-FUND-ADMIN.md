# Fund Administration (FUND-ADMIN): questions waiting for you

## What this domain is
Run private-capital funds end-to-end: LP onboarding, capital calls, partner accounting, and waterfall distributions, on the same general ledger.

Onboard limited partners and their subscriptions through KYC, schedule and issue capital calls and track each LP's response, keep the fund ledger and quarterly partner-capital statements, run the close, and calculate and pay out distributions through the waterfall. The headline objects span four modules today: the fund ledger, LP commitments, capital calls, and distributions.

---

q1: (answer this first) Should each FUND-ADMIN module materialize its own workflow-gate permissions (capital-call approval, distribution-waterfall approval, fund-close approval, subscription execution, PCAP publish, default handling), or should approvals live in one shared abstraction?

- a) Per-module gates: each module owns its own approval permissions.
- b) Shared abstraction: one APPROVAL-WORKFLOW module owns the cross-cutting gate.
- c) Hybrid: a shared core with per-module specializations.

Recommended: a. There are 8+ requires_permission states spread across the four modules; this choice cascades into the role design and unblocks the whole role-and-permission layer, so it gates the rest of the build.

a1:

---

q2: How should trigger_event 955 (lp_subscription.executed) be fixed? It currently sits on limited_partners (an entity outside this domain) with an empty category and target state, which blocks the matching event on lp_subscriptions.

- a) Re-attribute 955 to lp_subscriptions (set the right entity, category state_change, target state executed).
- b) Rename 955 to a limited-partners-anchored name and free up the lp_subscription.executed name.
- c) Leave it as-is.

Recommended: a. The name belongs to lp_subscriptions in this domain and re-attributing it unblocks the missing lifecycle event. This overwrites a non-empty value and touches another domain's entity, so it needs your sign-off.

a2:

---

q3: Should Close be split off as a fifth module (FUND-ADMIN-CLOSE-AND-AUDIT), pulling fund-close periods and audit-support out of the fund-ledger module?

- a) Split it into its own module.
- b) Keep the current four-module shape.

Recommended: b. Keep four modules for now; both Carta and Allvue expose Close separately, but a split re-points the fund-close lifecycle states already authored under the fund-ledger module, so only do it if you want that surface as a deployable product.

a3:

---

q4: Should the LP portal be promoted from a capability to its own deployable module?

- a) Promote it to a fifth module.
- b) Keep it as a capability of LP-COMMITMENTS.

Recommended: a. Juniper Square sells the LP portal as a standalone product and many GPs buy the portal first, so promoting it suits portal-first buyers; note it re-points the partner-capital-statement lifecycle states currently under LP-COMMITMENTS.

a4:

---

q5: Which pattern-flag flips should I apply on the approval masters?

- a) Approve all suggested flips (waterfall has-single-approver and submit-lock, single-approver on capital calls and fund distributions, submit-lock on fund-close periods).
- b) Approve only waterfall has-single-approver.
- c) Decline all.
- d) Other (specify a subset).

Recommended: b at minimum. CFO/COO sign-off on the distribution waterfall is universal, so default-false there is almost certainly wrong; the rest are weaker calls. Each flip overwrites an existing flag value, so it needs your confirmation.

a5:

---

q6: Should I run the deep pairwise reconciliation with PORT-MONIT and INV-CRM inline now, or defer it to separate per-neighbor passes?

- a) Run it inline now.
- b) Defer to per-neighbor Validate runs.

Recommended: b. The gap list does not change either way, so deferring keeps this pass moving; run inline only if you want the cross-domain depth immediately.

a6:

---

q7: For the fund-close handoff into INV-CRM (handoff 1040), should the legacy auto-discovered process tag be replaced?

- a) Replace it with PCF 10751 (Perform capital planning and project approval).
- b) Add PCF 10751 as a second tag alongside the legacy one.
- c) Keep the current tag.

Recommended: a. PCF 10751 fits "fund close locks the commitment book" better than the generic legacy tag. Replacing a tag is destructive, so it needs your call.

a7:

---

q8: For the exit-to-distribution handoff from CAP-TABLE (handoff 1044), should the two strategy-development tags be replaced with a payments-side process?

- a) Replace them with a payments-side PCF (10911 family).
- b) Keep the current strategy-development tags.
- c) Attach both.

Recommended: a. A post-exit distribution maps more precisely to payment processing than to strategy development. Replacing the tags is destructive, so it needs your call.

a8:

---

q9: Should the nine agent-curated handoff process tags for FUND-ADMIN be promoted from new to approved? (yes/no)

Recommended: yes, per row, if you agree the process mappings are correct. None are approved today; promotion to approved is a sign-off step, so it is not applied automatically.

a9:

---

q12: Cap Table Management and Equity Administration forwards fund distribution to Private Capital Fund Administration to develop merger or demerger or acquisition or exit strategy, but Private Capital Fund Administration does not yet have anyone assigned to develop merger or demerger or acquisition or exit strategy, so this step has no owner. How should it be handled?
- a) Record it now as work Private Capital Fund Administration owns, and assign a named owner once Private Capital Fund Administration sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Private Capital Fund Administration decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a12:

---

q13: Real Estate Investment Management forwards fund distribution to Private Capital Fund Administration to process and distribute payments, but Private Capital Fund Administration does not yet have anyone assigned to process and distribute payments, so this step has no owner. How should it be handled?
- a) Record it now as work Private Capital Fund Administration owns, and assign a named owner once Private Capital Fund Administration sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Private Capital Fund Administration decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a13:

---

q14: Real Estate Investment Management forwards capital call to Private Capital Fund Administration to manage and reconcile cash positions, but Private Capital Fund Administration does not yet have anyone assigned to manage and reconcile cash positions, so this step has no owner. How should it be handled?
- a) Record it now as work Private Capital Fund Administration owns, and assign a named owner once Private Capital Fund Administration sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Private Capital Fund Administration decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a14:

---

q15: Investor Relationship and Deal Flow Management forwards capital call to Private Capital Fund Administration to perform capital planning and project approval, but Private Capital Fund Administration does not yet have anyone assigned to perform capital planning and project approval, so this step has no owner. How should it be handled?
- a) Record it now as work Private Capital Fund Administration owns, and assign a named owner once Private Capital Fund Administration sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Private Capital Fund Administration decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a15:

---

q16: Investor Relationship and Deal Flow Management forwards capital call to Private Capital Fund Administration to manage debt and investment, but Private Capital Fund Administration does not yet have anyone assigned to manage debt and investment, so this step has no owner. How should it be handled?
- a) Record it now as work Private Capital Fund Administration owns, and assign a named owner once Private Capital Fund Administration sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Private Capital Fund Administration decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a16:

---

q17: Investor Relationship and Deal Flow Management forwards lp commitment to Private Capital Fund Administration to process and oversee debt and investment transactions, but Private Capital Fund Administration does not yet have anyone assigned to process and oversee debt and investment transactions, so this step has no owner. How should it be handled?
- a) Record it now as work Private Capital Fund Administration owns, and assign a named owner once Private Capital Fund Administration sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Private Capital Fund Administration decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a17:

---

## Optional (will not hold up the build)

q10: Several extra entities show up across the flagship fund-admin vendors (GP carry allocations, LP side letters, NAV revaluations, recallable distributions, fund expenses, LP commitment transfers). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the module shape is settled; LP side letters, fund expenses, and NAV revaluations are universal across the four flagship vendors and are the safest to add first.

a10:

---

q11: Handoff 1046 (fund formation into the fund ledger) has no clean process tag. Should I run a Phase 0 search across the APQC financial-services and insurance frameworks for a fund-launch process row? (yes/no)

Recommended: yes. The cross-industry framework has no dedicated fund-launch row, so a targeted search may surface a closer match; additive and non-blocking.

a11:

---

<!-- agent map, ignore: q1=B2-APPROVAL-WORKFLOW q2=B2-EVENT-955-REATTRIB q3=B2-CLOSE-MODULE q4=B2-LP-PORTAL q5=B2-PATTERN-FLAGS q6=B2-PAIRWISE-RECONCILIATION q7=B2-H1A-OVERRIDE q8=B2-H1E-OVERRIDE q9=B1A-H2 q10=B3-GP-CARRY-ALLOCATIONS+B3-LP-SIDE-LETTERS+B3-NAV-REVALUATIONS+B3-RECALLABLE-DISTRIBUTIONS+B3-FUND-EXPENSES+B3-LP-COMMITMENT-TRANSFERS q11=B3-PCF-FUND-LAUNCH q12=B2-B9D-OWN-491 q13=B2-B9D-OWN-1422 q14=B2-B9D-OWN-1461 q15=B2-B9D-OWN-310 q16=B2-B9D-OWN-321 q17=B2-B9D-OWN-1480 | domain_id=160 -->
