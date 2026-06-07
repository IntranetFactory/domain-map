# Social Media Management (SMM): questions waiting for you

## What this domain is
Manage your whole social presence from one place: schedule and publish across every network, work all your incoming messages and mentions in a single inbox, listen for what people say about your brand, and run your influencer and advocacy programs.

Plan and publish posts across Facebook, Instagram, LinkedIn, X, TikTok, YouTube, Pinterest, and Reddit; route every comment, mention, and direct message into a unified inbox so your team can respond fast; track sentiment and share of voice as people talk about you; and recruit, brief, and pay the creators who post on your behalf. Turn day-to-day social activity into measured, governed marketing.

---

q1: (answer this first) For the five workflow-bearing social objects (scheduled posts, direct messages, mentions, and influencer records), how should the workflow-shape flags be set?

- a) Set them per the recommendation: lock a post once its schedule fires, require a single approver on published copy, and treat direct messages, mentions, and influencer records as carrying personal data.
- b) Go flag by flag and tell me yes or no for each.
- c) Leave them all off (no lock, no required approver, no personal-data handling) and record that this was a deliberate review.

Recommended: a. These match how regulated brands run social, and they set the permission gates on the post, message, and influencer lifecycles. This choice drives the lifecycle states and events below it, so it unlocks the rest of the build.

a1:

---

q2: Several legacy rollup rows for SMM carry hand-written notes describing each object's role. Were those notes deliberately approved when the data was first loaded, or were they auto-filled by the loader (in which case they get cleared)?

- a) They were approved at load time, leave them in place.
- b) They were auto-filled, clear them to empty.

Recommended: a if you remember signing off on the wording; otherwise b. Clearing non-empty notes is a destructive change, so it needs your call.

a2:

---

q3: Social Media Management is currently filed as a child of CRM. Flagship social platforms treat it as a sibling of CRM, not a child. How should the parent be set?

- a) Detach it so Social Media Management stands on its own.
- b) Re-parent it under a marketing-leadership domain, if one exists.
- c) Keep CRM as the parent (it is intentional).

Recommended: a. The major vendors position social as a peer of CRM, and the current link looks like a leftover from before the domain was split out. Detaching overwrites the current parent, so it needs your sign-off.

a3:

---

q4: Which compliance frameworks should be tagged onto Social Media Management?

- a) FTC influencer disclosure plus GDPR plus CCPA (the conservative core)
- b) That core plus COPPA and the EU Digital Services Act
- c) Leave it empty until a vendor pass confirms what applies per market

Recommended: a. FTC disclosure covers paid creators, and GDPR and CCPA cover the personal data flowing through direct messages and engagement signals. Add (b) only if you have under-13 audiences or operate platforms in scope of the DSA.

a4:

---

## Optional (will not hold up the build)

q5: Four deeper market areas are not modeled yet: employee advocacy (per-employee share tracking and gamification), the full influencer workflow (briefs, contracts, deliverables, payments), a richer social-listening substrate (queries, alerts, share of voice, crisis signals), and paid social (ad campaigns, creatives, targeting, budget pacing). Should I research these and either extend the existing modules or stand them up as their own domains where the market justifies it? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Each one has flagship pure-play vendors, so several likely deserve their own domain rather than just a module extension; they still want a verification pass first.

a5:

---

<!-- agent map, ignore: q1=B2-PATTERN-FLAGS q2=B2-NOTES-DDO q3=B2-PARENT-DOMAIN q4=B2-REGULATION-SET q5=B3-EMPLOYEE-SHARE-RECORDS+B3-INFLUENCER-WORKFLOW+B3-SOCIAL-LISTENING-SUBSTRATE+B3-PAID-SOCIAL | domain_id=106 -->
