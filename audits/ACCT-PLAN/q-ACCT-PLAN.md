# Strategic Account Planning (ACCT-PLAN): questions waiting for you

## What this domain is
Plan, run, and review your strategic accounts the way the best account teams do. Map relationships, find white space, write joint plans, and close on QBR commitments, all in one place.

Strategic Account Planning gives account teams a structured surface to plan against named key accounts: who decides, who buys today, and where the next opportunity sits. Relationship maps make the org chart and the political reality visible, white-space maps show every product the account hasn't bought yet, and account plans hold the named objectives and strategies the team will pursue this year. Mutual action plans extend the surface to the buyer, QBR workflows close the loop on every quarterly review, and account health and growth metrics roll up across the portfolio. It sits on top of your CRM and CSM systems rather than replacing them.

---

q1: (answer this first) ACCT-PLAN persists its own records (account plans, mutual action plans, relationship maps, white-space maps), so should we treat it as a real master-bearing domain and build the full surface, or keep it as a thin overlay?

- a) Build it as a normal domain and load the full master surface (account plans, mutual action plans, relationship maps, white-space maps, QBRs, key-account metrics).
- b) Keep it as a pure overlay: the proposed masters move to a separate ABM-Planning or KAM domain, and the existing vendor solutions become coverage of the overlay.
- c) Hybrid: keep account health and growth metrics as derived signals, but load account plans, mutual action plans, relationship maps, white-space maps, and QBRs as real masters.

Recommended: a. The five loaded pure-plays (Upland Altify, Revegy, DemandFarm, Prolifiq CRUSH, Demandbase Account Planning) all master independently authored records (account plans, mutual action plans, relationship maps, white-space maps, QBRs) that reference the CRM substrate rather than being derived from it, which is why the early leadership-tier (derived-overlay) classification looks misapplied. The overlay test confirms it persists its own records, so this is a confirm of (a) versus (c), and it gates the module shape, every master load, the roles, and the handoff attribution below it.

a1:

---

q2: If you build it (q1 = a or c), how should the ACCT-PLAN module surface be split?

- a) 6 modules (granular): Core, Mutual Action, Relationship, Whitespace, QBR, Metrics.
- b) 4 modules (clustered): Core / Relationship-Whitespace / Execution / Metrics.
- c) 3 modules (lean): Core / Execution / Metrics (folds relationship and whitespace into core).

Recommended: a. The vendor surface splits along these lines: Altify and Revegy lead on the relationship and political map, DemandFarm leads on white-space, and Prolifiq and Demandbase position around the unified planning surface, so a granular 6-module shape mirrors how the specialists actually package the market and realizes all 7 capabilities. Pick (b) or (c) for a leaner deployment. This decides which module every master lands in.

a2:

---

q3: Two outbound events (account-health-declined and whitespace-identified) currently sit on CRM's customers record while ACCT-PLAN is the side that actually flags them. How should they be attributed?

- a) Move both events onto new ACCT-PLAN masters (account health scores, white-space maps) and have CRM subscribe instead.
- b) Keep both events on CRM's customers record and re-attribute the ACCT-PLAN handoffs so CRM is the source.
- c) Introduce derived-signal events that carry their own publisher independent of the underlying master (a catalog-wide shape change).

Recommended: a. One event should have one publishing master, and ACCT-PLAN is the surface that detects these signals, so anchoring them on its own masters once they exist is the cleanest fix. This also decides where the related handoff tag belongs.

a3:

---

q4: A duplicate health-decline event exists: health-score-declined and account-health-declined both fire on customers and describe the same signal. What's the call?

- a) Consolidate on account-health-declined, delete health-score-declined, and re-point its handoffs (destructive, and the event is CRM-owned).
- b) Keep both with distinct meanings: one is the analytics-side score drop (CRM-scored), the other is the planning-side detection (ACCT-PLAN-flagged).
- c) Keep both as a known catalog redundancy.

Recommended: b. The two events carry distinct semantics (analytics signal versus planning detection), so keeping them avoids a destructive delete on a CRM-owned event. Option (a) is destructive and would need separate sign-off.

a4:

---

q5: How should a strategic key account be modeled?

- a) A separate key-accounts master that references customers (Altify, Revegy shape).
- b) Extra fields on the existing customers record (key-account tier plus assigned team), which needs cross-domain coordination with CRM (DemandFarm, Demandbase shape).
- c) A junction record linking customers to key-account segments (a compromise).

Recommended: a. A separate master makes the strategic subset legible to the teams that filter on it (CSM, Sales Operations) and keeps the cross-domain edge clean. Pick (b) for the lower-touch shape that piggybacks on CRM.

a5:

---

q6: Only Sales is loaded as the owning function today. Should Customer Success and Sales Operations be added as contributors?

- a) Add both Customer Success and Sales Operations as contributors.
- b) Add only Customer Success (the most reliable cross-functional pattern).
- c) Leave it Sales-only for now and revisit during role authoring.

Recommended: a. The flagship deployments show all three functions on the same account (Sales plans, Customer Success grows the installed base, Sales Operations rolls it into forecasts). Low stakes and can be applied any time.

a6:

---

q7: Once the modules exist, which account-planning roles should be authored?

- a) Four roles: Strategic Account Manager (cross-functional), Key Account Director (Sales), Customer Success Account Manager (CSM), Sales Operations Analyst (Metrics plus Sales Performance).
- b) Two roles only: Strategic Account Manager plus Customer Success Account Manager (the highest-traffic pair).
- c) Defer until a dedicated role-authoring pass.

Recommended: a. The four roles cover the real personas across the planning surface and satisfy the multi-module role floor. This is gated on the build and module-shape choices above.

a7:

---

q8: A more precise process tag (manage sales / key account plan) would replace the existing weaker tag on the account-health handoff to Customer Success. Should the weaker tag be replaced? (yes/no)

Recommended: yes, if the publisher stays with ACCT-PLAN. Replacing a non-empty tag is destructive, so it needs your sign-off, and if q3 re-attributes the publisher to CRM the tag belongs on CRM's handoff instead.

a8:

---

q9: Should Salesforce Industries Cloud's industry-flavored Strategic Account Plans surface be represented as a competing solution?

- a) Add Salesforce Sales Cloud or Industries Cloud as a secondary-coverage solution.
- b) Keep the 5-flagship pure-play list and treat CRM-suite competition as a per-industry concern.
- c) Add it only if a pure-play coverage gap shows up on industry-flavored deployments.

Recommended: b. The pure-play list is the cleaner market picture; the CRM-suite layer is a thin record-keeping shape rather than a competing point solution. Independent and low stakes.

a9:

---

## Optional (will not hold up the build)

q10: Several adjacent surfaces show up across the flagship and neighboring vendors (an ABM-Planning surface, sales-methodology overlays like TAS and Miller Heiman, digital sales rooms overlapping mutual action plans, an account-tier promotion lifecycle, a team-assignment shape, the QBR ownership boundary with CSM, and predictive whitespace scoring). Should I research these and add the ones that hold up? (yes/no)

Recommended: yes, but additive and best done after the modules exist; each still wants a verification pass first.

a10:

---

<!-- agent map, ignore: q1=B2-L1 q2=B2-M1 q3=B2-T1 q4=B2-D1 q5=B2-K1 q6=B2-C1 q7=B2-E1 q8=B1B-H1-209-REFINE q9=B2-V1 q10=B3-ABM-PLAN-SURFACE+B3-SALES-METHODOLOGY-OVERLAYS+B3-DIGITAL-SALES-ROOMS+B3-TIER-PROMOTION-LIFECYCLE+B3-TEAM-ASSIGNMENTS-SHAPE+B3-QBR-OWNERSHIP-BOUNDARY+B3-PREDICTIVE-WHITESPACE | domain_id=105 -->
