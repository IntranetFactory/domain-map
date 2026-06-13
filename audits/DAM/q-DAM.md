# Digital Asset Management (DAM): questions waiting for you

## What this domain is

A central library for your brand's images, video, and creative files, where teams store, organize, find, and share approved assets.

Run the full life of a creative asset: upload it, sort it into a taxonomy and curated collections, track its versions and per-format renditions, record the rights and model releases that say how it may be used, route it through review and approval, then publish and share it (via expiring share links and brand portals) to the channels and partners that consume it. DAM is unbuilt today: it has no modules yet, so the first decision below shapes everything that follows.

---

q1: (answer this first) How should Digital Asset Management be split into modules (the sub-areas of the product)?

- a) Two modules: Asset Library (the asset master plus renditions, versions, collections, taxonomy, rights, and model releases) and Distribution (share links and channel publications).
- b) Three modules: same as (a) plus Creative Review (review rounds, comments, and approval workflow).
- c) Four modules: same as (b) plus Rights Management (asset rights, model releases, and license agreements split out as their own module).

Recommended: a. The two-module split is the minimal shape that gets DAM deployable and unblocks every fix below; (b) and (c) only pay off once the review-workflow or rights-management objects are actually confirmed. This choice drives every module, capability binding, lifecycle owner, handoff FK, and entity routing below it, so it unlocks the rest of the build.

a1:

---

q2: PIM already masters its own digital-asset table (pim_digital_assets) in parallel with DAM's digital_assets, so the catalog has two masters for the same concept. How should that seam be handled?

- a) Keep them as parallel masters (the deliberate v1 seam) for now.
- b) Demote the PIM table to an embedded shell that consumes the DAM master.
- c) Merge the two tables into one (heavy refactor).

Recommended: a. Keeping the parallel seam avoids a cross-domain refactor before DAM is even built; consolidation can come later once DAM modules exist. This spans DAM and PIM, so it is your call rather than the agent's.

a2:

---

q3: Creative briefs and deliverables are mastered in the agency-management domain. When DAM modules exist, should DAM reference them read-only or ship its own local copy?

- a) Consumer: reference them read-only, with the master staying in agency management.
- b) Embedded master: DAM ships a local shell so it deploys standalone without an agency tier.

Recommended: b. Most brand-led DAMs ship without an agency tier, so a local shell keeps DAM deployable on its own; pick (a) if your DAM users always read through to the agency-management master.

a3:

---

q4: Which compliance regulations should be attached to DAM now?

- a) GDPR plus CCPA plus Copyright/DMCA (broad: personal content, model releases, and third-party-licensed assets)
- b) GDPR plus CCPA only
- c) Add HIPAA as well (healthcare-vertical imagery)
- d) Defer all regulations to a later compliance audit

Recommended: a. GDPR and CCPA cover personal content and model releases, and Copyright/DMCA covers third-party-licensed assets that every rights-tracking DAM holds. Add HIPAA only for a healthcare vertical; defer all only if you want it lean for now.

a4:

---

q5: Several candidate DAM capabilities (brand management, digital rights management) could be shared across other domains rather than DAM-only. Which scope should they take?

- a) Make brand management and digital rights management cross-cutting (reusable by HCMS, PIM, MRM, and agency management), and keep the rest domain-prefixed (asset library, asset taxonomy, brand portal, asset distribution, dynamic delivery).
- b) Keep all of them domain-prefixed (DAM-only).
- c) Other (you name the cross-cutting set).

Recommended: a. Brand management and digital rights management genuinely recur in neighboring domains, so making just those two cross-cutting maximizes reuse while keeping the storage-specific capabilities local. This also raises DAM's capability count past the minimum.

a5:

---

q6: Should the Brand and Creative roles (brand manager, creative ops, photographer / content creator) be authored now, or deferred until after the modules ship?

- a) Author the roles now.
- b) Defer until the modules exist.

Recommended: b. Roles attach to modules, so authoring them before any module exists creates orphaned records; deferring is the cleaner sequence. The owner and contributor function links are already in place, so nothing breaks by waiting.

a6:

---

q7: For symmetry, DAM should carry outbound asset-to-user relationship edges to mirror the three existing inbound ones (uploaded, owns, approves). How should those outbound edges be defined?

- a) Mirror the inbound edges (for example: was_uploaded_by, is_owned_by, was_approved_by).
- b) Provide your own explicit verb/inverse/owner-side wording.
- c) Skip them and let the existing inbound rows alone satisfy the symmetry rule.

Recommended: a. Mirroring the existing inbound edges is the standard, low-risk way to satisfy the symmetry rule; the agent will not load these rows until you confirm the exact wording.

a7:

---

q8: Should "personal content" be turned on for digital assets (so assets with model releases, employee photos, or other personal imagery trigger GDPR and privacy handling)? (yes/no)

Recommended: yes. Assets routinely contain personal imagery that needs model-release and GDPR handling. This overwrites a current value (the flag is off today), so it needs your confirmation.

a8:

---

q9: Should a "submit lock" be turned on for digital assets (so an asset freezes on the approved-to-published transition)? (yes/no)

Recommended: yes. Freezing on publish keeps a published asset from being quietly altered. This overwrites a current value (the flag is off today), so it needs your confirmation.

a9:

---

q10: Should a "single approver" be turned on for digital assets (so certain workflows route to one named approver)? (yes/no)

Recommended: yes, if your review process really has one accountable approver. This overwrites a current value (the flag is off today), so it needs your confirmation.

a10:

---

q11: Four process-mapping tags on DAM's handoffs (publish approved content, manage product marketing material, assess and approve content, develop and manage content) currently sit unapproved. Which should be promoted to approved?

- a) Approve all four.
- b) Approve a subset (name which).
- c) Reject some (name which).
- d) Leave all of them unapproved for now.

Recommended: a, if you agree the process mappings are correct. The tag rows already exist; only the approval flip is owed, and approval is a sign-off step the agent will not apply on its own.

a11:

---

q13: One of DAM's handoffs (when agency management approves a creative deliverable) carries two process tags: a broad one ("manage product marketing material") and a more specific one ("assess and approve content"). Should the broad tag be re-pointed to the specific one? (yes/no)

Recommended: yes. The specific tag better describes what actually happens on that handoff; this is a small cleanup. Because it edits an existing tag (and that handoff originates in agency management), it needs your sign-off rather than being applied automatically.

a13:

---

q14: When DAM publishes an approved asset to the content system, the "publish approved content" step currently has no owner, because DAM has no module that masters the asset yet (DAM is unbuilt). How should that be handled?

- a) Resolve it by building DAM: once you pick the module split (q1) and DAM masters its assets, this step gets an owner automatically.
- b) Accept it as a known gap until DAM is built.

Recommended: a. This is not a separate decision so much as another thing the DAM build unblocks; answering q1 and shipping the modules clears it on its own.

a14:

---

## Optional (will not hold up the build)

q12: Beyond the headline asset and distribution objects, the flagship DAM vendors model a deeper set of objects (review rounds and comments, downloadable brand guidelines, on-the-fly asset transformations, asset usage/analytics events, bulk upload sessions, creative workspaces/projects, and standalone license agreements). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Several are common across the vendor set, though each still wants a verification pass before loading.

a12:

---

<!-- agent map, ignore: q1=B2-1 q2=B2-2 q3=B2-3 q4=B2-4 q5=B2-5 q6=B2-6 q7=B2-7 q8=B2-S9.personal_content q9=B2-S9.submit_lock q10=B2-S9.single_approver q11=B2-H1 q12=B3-1+B3-2+B3-3+B3-4+B3-5+B3-6+B3-7 q13=B2-B9D-RETAG-344 q14=B2-B9D-DAM-UNOWNED | domain_id=92 -->
