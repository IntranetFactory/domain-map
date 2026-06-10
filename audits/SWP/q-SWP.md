# Strategic Workforce Planning (SWP): questions waiting for you

## What this domain is
Plan the right number and shape of people your organization will need, and cost it before you commit. Forecast demand by position, model supply against attrition and skills gaps, run what-if and reorg scenarios, and reconcile the workforce plan against the financial budget. It is the planning layer that sits between HR, recruiting, and finance: headcount plans, scenarios, org designs, labor-market benchmarks, and per-role cost projections.

---

q1: (answer this first) Which business functions should anchor SWP's 8 capabilities (the owner / contributor split)?

- a) Workforce Planning owns all 8; FP&A contributes on Workforce Costing and Plan Reconciliation; Finance contributes on Workforce Costing.
- b) Workforce Planning owner only, no contributors.
- c) A mapping you specify.

Recommended: a. It matches the business-function ownership already recorded (Workforce Planning as owner, FP&A and Finance as contributors) and unblocks the capability-to-function anchoring that the rest of the catalog structure builds on.

a1:

---

q2: For the labor-market benchmark refresh event, should its category be "state change" (consistent with the other SWP published events) or "threshold" (treating a refresh as an external signal arriving)?

- a) state change
- b) threshold

Recommended: a. It keeps the convention coherent with the other SWP and EPM events and with downstream consumers, and unblocks the empty category on that event.

a2:

---

q3: Four SWP planning records can carry named-person detail (workforce scenarios, org designs, per-role cost projections, and skills-gap analyses). Should they be flagged as containing personal content for PII access control?

- a) flag all four
- b) flag scenarios, org designs, and cost projections only (skip skills-gap analyses)
- c) keep all four unflagged
- d) decide each one individually

Recommended: a. RIF and restructure scenarios, pre-announcement org redesigns, per-role compensation projections, and skill-by-skill gap lists all routinely identify named employees, so the flag should be on. Each flag is a value you own, so it is your call. This overwrites the current setting.

a3:

---

q4: Two requisition-creation handoffs publish from the SWP planning side on an event whose payload is mastered by the recruiting domain. Should they keep the SWP source, or be re-anchored to the recruiting module that owns the data?

- a) keep the SWP source and record the co-mastering (Signal-1) exception in the audit notes
- b) re-anchor both handoffs to the recruiting pipeline module

Recommended: a. SWP co-masters requisitions as the canonical Signal-1 example, which licenses it to publish requisition-creation events from planning, and keeping the source avoids overwriting a non-empty value. Option (b) re-anchors a value, so it needs your call.

a4:

---

q5: A fifth SWP role, Org Design Practitioner, was in a prior design but is not live today (four roles exist now). Was it intentionally dropped, or should it be re-authored?

- a) confirm the four-role posture is intentional and close the drift
- b) re-author Org Design Practitioner (reaching the supply-planning and scenario-modeling modules, with the cost-projections module secondary)

Recommended: b. The scenario-modeling module already carries dedicated approve-org-design and publish-org-design permissions, which plausibly want their own role. This is editorial input for the persona layer, which stays deferred until you decide.

a5:

---

q6: Three SWP-boundary process mappings were auto-tagged by substring matching and point at the wrong process. A closer look (the payload-realization pass) pinned down the exact fix for each. Should I apply them?

- a) approve all three: re-point the attrition-forecast mapping to "perform strategic workforce planning"; delete the initiative-kickoff mapping (a more precise one already exists on that handoff); and delete the resource-allocation mapping (its record has no owning home anywhere yet, so it must wait for the strategic-portfolio side to take ownership first)
- b) approve a subset (say which)
- c) leave them as-is

Recommended: a. The attrition-forecast row points at a customer-attrition process and is clearly wrong for a workforce-planning payload. The initiative-kickoff row is a too-coarse duplicate of a precise mapping already on the same handoff, so it should just be removed. The resource-allocation row points at a sales-resource process and its underlying record is not owned by any domain today, so the honest fix is to drop the bad mapping and let the strategic-portfolio domain establish ownership before re-tagging. Each is a delete or overwrite of an existing row, so it needs your sign-off.

a6:

---

q7: Twelve module records consume entities mastered by other domains (employees, positions, job profiles, attrition forecasts, requisitions) while marked required, which breaks module self-containment. How should this be resolved?

- a) relax each to optional (presence-conditional), since SWP genuinely reads these from other domains
- b) embed a local shell copy of each so every module stands alone
- c) a mix you specify per entity

Recommended: a. These are true cross-domain reads, so marking them optional reflects reality without duplicating masters. Either fix overwrites an existing role or necessity value, so it is a destructive change that needs your sign-off.

a7:

---

q10: Applicant Tracking and Recruiting sends Strategic Workforce Planning an automatically calculated position demand forecast that feeds perform strategic workforce planning, but Strategic Workforce Planning does not yet have anyone assigned to that work, so this step has no owner. How should it be handled?
- a) Record it now as work Strategic Workforce Planning owns, and assign a named owner once Strategic Workforce Planning sets up who does this work.
- b) Treat it as an automatically calculated figure with no one to own, and leave it off the list.

Recommended: a. Recording it now means that the moment Strategic Workforce Planning decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a10:

---

## Optional (will not hold up the build)

q8: Three supply-side planning inputs show up across the flagship vendors (workforce segments, succession plans, and internal-mobility intents). Should I research and add the ones that hold up, as consumer records on the supply-planning module? (yes/no)

Recommended: yes, but additive and can happen after the open decisions above are settled. Workforce segments already have an upstream master in the people-analytics domain; the other two need a verification pass first.

a8:

---

q9: SWP currently links to no regulations. Should I research and add the candidates that apply (EU Pay Transparency Directive, the WARN Act for mass-layoff scenarios, and pay-equity / AI-bias rules touching cost projections and skills-gap analysis)? (yes/no)

Recommended: yes, but additive and non-blocking. Each candidate needs a quick check that the regulatory tie is real before linking.

a9:

---

<!-- agent map, ignore: q1=B2-S5 q2=B2-S1 q3=B2-S2 q4=B2-S3 q5=B2-S4 q6=B2-S6 q7=B1A-SELF-CONTAIN q8=B3-S1+B3-S2+B3-S3 q9=B3-S4 q10=B2-B9D-OWN-980 | domain_id=100 -->
