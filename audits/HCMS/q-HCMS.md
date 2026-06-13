# Headless Content Management (HCMS): questions waiting for you

## What this domain is
An API-first content platform: model your content once, author and review it without code, and deliver it to any channel through APIs, decoupled from any single front end. It covers structured content types, the editorial and translation workflow, scheduled releases, and the events that notify downstream channels when content goes live.

---

q1: (answer this first) Which HCMS masters should get an explicit workflow lifecycle (the states a record moves through), and which should be left as author-once configuration?

- a) Give a lifecycle only to content entries and content releases (the two records that really move through draft, review, scheduled, published); treat content types, environments, locales, and the editorial-workflow definition as author-once configuration.
- b) Give a lifecycle to all six masters.

Recommended: a. Only entries and releases actually move through workflow states; the other four are configuration records, so a lifecycle on them adds permissions and gates that buy nothing. This choice decides how many publish, review, and schedule permissions get generated at deploy, so it shapes the rest of the build.

a1:

---

q2: Should a content entry be frozen once it is published, so editing a live entry requires unpublishing it or creating a new version? (yes/no)

Recommended: yes. A published entry is what every downstream channel is reading, so changes should go through an explicit unpublish or version rather than silently editing the live record.

a2:

---

q3: Should a content release be frozen once it is published, so a published release stays a fixed snapshot? (yes/no)

Recommended: yes. A release is a point-in-time bundle of what shipped; keeping it immutable preserves an accurate record of what went live.

a3:

---

q4: Should content entries be treated as potentially holding personal data (author bylines, form submissions, comments, personalization attributes)? (yes/no)

Recommended: yes. Entries routinely carry personal data, which brings GDPR retention and privacy handling into scope.

a4:

---

q5: Should the editorial workflow assume a single named approver per entry, or allow multiple reviewers? (yes/no)

Recommended: no (do not force a single approver). Editorial review is sometimes one person and sometimes a multi-reviewer chain, so leaving it flexible fits more teams.

a5:

---

q6: If a dedicated translation-jobs record is added later, should localization become its own fourth module, moving content locales (and translation jobs) out of Authoring?

- a) Keep content locales in the Authoring module and do not split (current state).
- b) When a translation-jobs record lands, create a Localization module and move content locales plus translation jobs into it.

Recommended: a for now. Content locales alone are just configuration and do not justify a standalone module; revisit only once a real translation-workflow record exists.

a6:

---

q9: Digital Asset Management forwards content entry to Headless Content Management to develop and manage content, but Headless Content Management does not yet have anyone assigned to develop and manage content, so this step has no owner. How should it be handled?
- a) Record it now as work Headless Content Management owns, and assign a named owner once Headless Content Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Headless Content Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a9:

---

q10: Marketing Automation forwards content entry to Headless Content Management to develop and manage marketing plans, but Headless Content Management does not yet have anyone assigned to develop and manage marketing plans, so this step has no owner. How should it be handled?
- a) Record it now as work Headless Content Management owns, and assign a named owner once Headless Content Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Headless Content Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a10:

---

## Optional (will not hold up the build)

q7: Several content objects that the flagship vendors expose as first-class records are not yet modeled. Should I research and add the ones that hold up (webhook subscriptions and delivery logs, preview environments, content revisions, reusable content components, translation jobs, taxonomies, API tokens, audit log entries, space memberships, personalization audiences)? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Several back capabilities that are already placed (webhooks, visual preview, versioning, localization) but have no record behind them; each still wants a verification pass first.

a7:

---

q8: Two adjacent markets show up around HCMS and may deserve their own domains: Translation Management (TMS) and Digital Personalization. Should I research and queue these as candidate domains? (yes/no)

Recommended: yes, as research only. Both are already noted as missing-domain candidates and connect to HCMS through translation and personalization, but standing up a new domain is a separate, non-blocking decision.

a8:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2.entrylock q3=B2-S2.releaselock q4=B2-S2.entrypii q5=B2-S2.singleapprover q6=B2-LOCALIZATION-SPLIT q7=B3-MASTER-WEBHOOKS+B3-MASTER-VISUAL+B3-E1+B3-E2+B3-E6+B3-E7+B3-E4+B3-E8+B3-E9+B3-E10 q8=B3-D1+B3-D2 q9=B2-B9D-OWN-428 q10=B2-B9D-OWN-23 | domain_id=93 -->
