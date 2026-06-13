# Digital Experience Platform (DXP): questions waiting for you

## What this domain is
Build, personalize, and deliver branded digital experiences from one platform: web content management, audience personalization and A/B testing, customer and partner portals, and headless content delivery. It pulls the authoring, experimentation, and journey-orchestration surfaces together so marketing and engineering teams can ship and tune the experiences your visitors see.

---

q1: (answer this first) Should a published web page be locked once published, so it cannot be edited until someone re-drafts it? (yes/no)

Recommended: yes. A published page is the live, public version, so changes should go through a fresh draft rather than silent edits. This turns on a review gate and its derived permissions, so it needs your call.

a1:

---

q2: Should a published content component be locked once published, so it cannot be edited until someone re-drafts it? (yes/no)

Recommended: yes. Components are reused across many pages, so freezing the published version keeps every page that embeds it stable.

a2:

---

q3: Should a digital experience (the campaign-tied surface) be frozen once it is activated? (yes/no)

Recommended: yes. An active experience is live to visitors and tied to a running campaign, so changes should not happen in place.

a3:

---

q4: Should a published segment definition be locked once published, so it cannot be edited until someone re-drafts it? (yes/no)

Recommended: yes. Personalization and journey rules target these segments, so a frozen published definition keeps targeting predictable.

a4:

---

q5: Should a running A/B test be config-frozen, so its setup cannot change while it is live? (yes/no)

Recommended: yes. Changing test configuration mid-run invalidates the results, so the standard practice is to lock a running test.

a5:

---

q6: Should activating a personalization rule require a single named approver to sign off? (yes/no)

Recommended: yes. Rule activation changes what visitors see, so a single accountable approver is the normal control.

a6:

---

q7: Should journey steps be treated as carrying personal content (visitor timing data and identifiers under ADA and privacy law)? (yes/no)

Recommended: yes. Journey timing and visitor identifiers are personal data and fall under privacy and accessibility rules.

a7:

---

q8: How should the segment master (segments_dxp) be handled, given a future Digital Personalization domain that may take over segments and personalization rules?

- a) Leave segments_dxp as-is; the suffix already flags it as distinct from the customer-data-platform segment master.
- b) Rename segments_dxp to personalization_segments now, to disambiguate it from the customer-data-platform market and a future Digital Personalization market.
- c) Wait until Digital Personalization is promoted, then decide whether segments_dxp (and personalization_rules) move out, become a consumer, or embed that domain's segment master.

Recommended: c. The right home for these masters depends on whether the future Digital Personalization domain actually lands, which is your timing call; waiting avoids a rename or move that a later promotion would undo.

a8:

---

q10: Customer Data Platform forwards dxp segment to Digital Experience Platform to develop customer experience strategy, but Digital Experience Platform does not yet have anyone assigned to develop customer experience strategy, so this step has no owner. How should it be handled?
- a) Record it now as work Digital Experience Platform owns, and assign a named owner once Digital Experience Platform sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Digital Experience Platform decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a10:

---

## Optional (will not hold up the build)

q9: Flagship DXP vendors carry deeper authoring and capture substrate that DXP does not yet model: a multi-site or multi-brand master (site definitions), page templates and layouts and content blocks, a split of A/B tests into experiment, variant, and result, a form-authoring stack (forms, fields, submissions), and a B2B portal stack (portal pages, widgets, user profiles). Should I research these and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Site definitions and page templates are the strongest signals (first-class in every flagship vendor) and land in the authoring module regardless of how the rest resolves.

a9:

---

<!-- agent map, ignore: q1=B2-2.weblock q2=B2-2.complock q3=B2-2.dxlock q4=B2-2.seglock q5=B2-2.ablock q6=B2-2.ruleapprover q7=B2-2.journeypii q8=B2-4+B3-7 q9=B3-1+B3-2+B3-3+B3-4+B3-5 q10=B2-B9D-OWN-100 | domain_id=77 -->
