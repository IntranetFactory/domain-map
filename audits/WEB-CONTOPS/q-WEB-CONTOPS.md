# Web Content Operations and Governance (WEB-CONTOPS): questions waiting for you

## What this domain is
Govern every page on your public website from one place.

The people-and-process layer that sits over your delivery platform and content store: run content audits and keep a live inventory of every page, scan for accessibility and brand-voice problems, watch technical SEO and broken links, and plan content refreshes on a calendar everyone can see. It is the Web team's and Marketing's control surface for external, customer-facing web properties, distinct from the internal intranet, the delivery platform itself, and the asset store.

---

q1: Should a completed content audit be frozen, so a finished audit reads as an immutable signed report? (yes/no)

Recommended: yes. A completed audit is a point-in-time record, so locking it keeps the report trustworthy.

a1:

---

q2: Should accessibility scan findings be treated as possibly containing personal data, because a finding can quote scanned page content that includes visitor PII? (yes/no)

Recommended: yes. Findings can capture user-supplied or visitor content, so treating them as personal data is the safe default.

a2:

---

q3: Should accessibility scan findings require a single named approver, so the accessibility lead signs off the wont-fix and verified transitions? (yes/no)

Recommended: yes. Accessibility sign-off should rest with one accountable lead.

a3:

---

q4: Should technical SEO findings require a single named approver, so the SEO lead signs off the wont-fix transition? (yes/no)

Recommended: yes. A single SEO owner keeps wont-fix decisions accountable.

a4:

---

q5: Should brand-voice violations be treated as possibly containing personal data, because a violation can quote scanned copy that carries PII? (yes/no)

Recommended: yes. Violation quotes can include PII-adjacent copy, so treat them as personal data.

a5:

---

q6: Should content lifecycle plans require a single named approver, so the content owner is the sign-off for retire and archive decisions? (yes/no)

Recommended: yes. Retire and archive are consequential, so a single content owner should own the call.

a6:

---

q7: Should web content inventory records be treated as possibly containing personal data, because URL paths can embed user IDs or PII tokens? (yes/no)

Recommended: yes. URL paths sometimes carry identifiers, so the safe default is to treat them as personal data.

a7:

---

q8: Which compliance regulations should be linked to Web Content Operations?

- a) Link ADA and Section 508 only, marked required, and defer the European Accessibility Act for now.
- b) Add the European Accessibility Act as a new regulation entry first, then link all three.
- c) Also include the GDPR cookie-consent edge, marked conditional.

Recommended: a. ADA and Section 508 are already in the catalog and clearly apply to the accessibility findings; the European Accessibility Act needs a new catalog entry before it can be linked, and the GDPR cookie-consent edge is a secondary, out-of-scope-leaning concern. This call belongs to you because it writes regulation links with applicability qualifiers.

a8:

---

q11: Knowledge Management forwards web content inventory record to Web Content Operations & Governance to manage content infrastructure, but Web Content Operations & Governance does not yet have anyone assigned to manage content infrastructure, so this step has no owner. How should it be handled?
- a) Record it now as work Web Content Operations & Governance owns, and assign a named owner once Web Content Operations & Governance sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Web Content Operations & Governance decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a11:

---

q12: Knowledge Management forwards content lifecycle plan to Web Content Operations & Governance to control delivered content, but Web Content Operations & Governance does not yet have anyone assigned to control delivered content, so this step has no owner. How should it be handled?
- a) Record it now as work Web Content Operations & Governance owns, and assign a named owner once Web Content Operations & Governance sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Web Content Operations & Governance decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a12:

---

## Optional (will not hold up the build)

q9: Four extra entities show up across the flagship vendors that the seven current masters do not yet cover (editorial briefs and tasks for production workflow, scanner runs as a first-class scan job separate from the audit report, rule catalogs the scanners check against, and URL redirects for retired pages). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the current masters are in place. The editorial-task and scanner-run substrates are the strongest signals across the vendor set, though each still wants a verification pass first.

a9:

---

q10: Editorial planning and content lifecycle plans may really belong to a separate Content Marketing Platform domain that the flagship vendors position as its own market. Should I queue a Content Marketing Platform domain candidate for later triage? (yes/no)

Recommended: yes, queue it as a non-blocking candidate. Optimizely Content Marketing Platform (formerly Welcome Software) positions editorial workflow and content-marketing operations as its own market, forming the editorial pole of the vendor surface alongside GatherContent and distinct from the compliance-and-audit and technical-SEO poles, so editorial planning plausibly belongs in a separate Content Marketing Platform domain. If it later promotes, the editorial-planning area either moves out or becomes a consumer of that domain; queuing it now does not change today's build.

a10:

---

<!-- agent map, ignore: q1=B2-2.content_audits_submit_lock q2=B2-2.a11y_personal_content q3=B2-2.a11y_single_approver q4=B2-2.seo_single_approver q5=B2-2.brand_personal_content q6=B2-2.lifecycle_single_approver q7=B2-2.inventory_personal_content q8=B2-4 q9=B3-1+B3-3+B3-4+B3-5 q10=B3-7 q11=B2-B9D-OWN-427 q12=B2-B9D-OWN-430 | domain_id=128 -->
