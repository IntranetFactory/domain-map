# Go-to-Market Planning (GTM-PLAN): questions waiting for you

## What this domain is
Plan your year. Decide where to play, how much capacity to invest, and which segments to lead with, then push the locked plan to Sales, Marketing, and Finance.

Go-to-Market Planning runs the cross-functional planning that decides how you enter and grow markets. Define your ICP, carve segments, score and tier accounts, draft territories and quotas, and model capacity-to-coverage against your revenue targets. Run what-if scenarios across geographies, channels, and segments, layer launch orchestration on top, and when the plan locks, push the artifacts downstream: territories to Sales Performance Management, target accounts to CRM and Marketing Automation, capacity numbers to Finance and EPM. Built for Sales Ops and RevOps teams who own the annual GTM motion, partnering with Marketing Ops, Product, and Finance.

---

q1: (answer this first) How should Go-to-Market Planning be split into modules (the sub-areas of the product)?

- a) Eight modules, one per capability: ICP and segmentation; account targeting; territory; capacity; channel mix; launch orchestration; scenario modeling; plan-to-execution handoff.
- b) Five modules: a combined planning core (ICP, account targeting, territory, channel mix) plus capacity, launch orchestration, scenario modeling, and plan-to-execution handoff.
- c) Three modules: plan design, scenario modeling, and plan lock and push.

Recommended: a. The granular per-capability shape mirrors how Anaplan and Pigment lay out plan-modeling tabs and maps cleanly onto the eight existing capabilities. This choice drives the whole build (every module, master placement, and the promotion calls below depend on it), so it unlocks the rest.

a1:

---

q2: Should the launch-orchestration and channel-mix capabilities carry their own ownership overrides instead of inheriting Sales Operations?

- a) Override both (launch orchestration to Product Management, channel mix to Marketing).
- b) Leave both inherited under Sales Operations (it owns the whole cross-functional shell).
- c) Override launch orchestration only, leave channel mix inherited.
- d) Wait until PMM is promoted (q4) and relocate launch orchestration there entirely.

Recommended: a. Launch orchestration is naturally PMM-owned and channel mix is naturally Marketing-Ops-owned, so explicit overrides match reality. If you lean toward promoting PMM in q4, option (d) becomes the cleaner path for launch orchestration.

a2:

---

q3: Which compliance frameworks should be tagged onto Go-to-Market Planning?

- a) None (it is a planning shell, regulations apply downstream at CRM and Marketing Automation).
- b) GDPR only (account-scoring may include EU-resident intent data).
- c) GDPR plus CCPA (US plus EU intent-data coverage).
- d) GDPR plus CCPA plus SOX (full conservative set).

Recommended: a. The planning shell has no statutory anchor of its own; regulation exposure exists only if account-scoring carries contact-level data, and that risk lands in the consuming systems. Pick (b) or (c) if your account scores include EU or US contact-level intent data.

a3:

---

q4: Should PMM (Product Marketing Management) be promoted as its own domain, taking the launch-orchestration capability and its module out of Go-to-Market Planning?

- a) Promote PMM and relocate launch orchestration (cleanest market shape, matches the Klue, Crayon, and Aha! Roadmaps Create vendor boundary).
- b) Keep launch orchestration in Go-to-Market Planning and let PMM be the launch-readiness consumer downstream.
- c) Wait until PMM is mentioned in more domains before deciding (cross-domain blast radius).

Recommended: a. The PMM buyer is distinct from Sales Ops and RevOps, and promoting it resolves the launch-orchestration ownership question while shrinking the module set. PMM is already queued at mention count 2.

a4:

---

q5: Should ABM-PLATFORM be promoted as its own domain, taking the market-segmentation and account-scoring capabilities (the ICP and account-targeting modules) out of Go-to-Market Planning?

- a) Promote ABM-PLATFORM and relocate both modules (Gartner has consistently treated ABM as its own platform market with a Marketing-Ops buyer).
- b) Keep ICP and account targeting in Go-to-Market Planning as the Sales-Ops-owned planning side, and let ABM-PLATFORM run the Marketing-Ops-owned engagement side downstream (the planning vs engagement cut).
- c) Defer until ABM-PLATFORM is mentioned in more domains.

Recommended: b. The defensible cut is that Go-to-Market Planning authors ICPs and named account lists once per planning cycle, while ABM-PLATFORM ingests those lists and runs engagement (intent scoring, ad targeting, web personalization). ABM-PLATFORM is only at mention count 1.

a5:

---

q6: If both PMM (q4) and ABM-PLATFORM (q5) are promoted, the domain description will need a rewrite to narrow its scope to the territory, quota, capacity, and scenario planning core. Should I rewrite it once those two are settled? (yes/no)

Recommended: yes, but only after q4 and q5 are answered. The new description then goes through your review. If neither promotion happens, keep the current broad description.

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

q8: Should SALES-PLANNING-PLATFORM be researched and promoted as its own domain, absorbing the territory-carving, capacity-planning, and scenario-modeling capabilities? This is the largest blast radius: if it lands, Go-to-Market Planning may shrink to a thin Sales-Ops shell. (yes/no)

Recommended: yes to research it (Phase 0 against Anaplan Sales Planning, Pigment, and Fullcast), but it is non-blocking and the call is whether the planning surface and the commission surface have one buyer or two. Already queued at mention count 2.

a8:

---

q9: Should I research where channel-mix planning truly belongs (Sales-Ops-owned inside Go-to-Market Planning, Marketing-Ops-owned in Marketing Automation, or split across both)? (yes/no)

Recommended: yes, but it is the least urgent candidate and non-blocking. There is no clean pure-play: Anaplan and Pigment model it inline with plan modeling, while Demandbase, 6sense, and the marketing-automation vendors model it as engagement budget allocation.

a9:

---

<!-- agent map, ignore: q1=B2-M1 q2=B2-C1 q3=B2-R1 q4=B2-S1 q5=B2-S2 q6=B2-D1 q7=B2-P1 q8=B3-SALES-PLANNING-PLATFORM q9=B3-CHANNEL-MIX-SCOPE | domain_id=104 -->
