# Digital Adoption Platform (DAP): questions waiting for you

## What this domain is
A Digital Adoption Platform overlays guidance on top of software people already use, your own product or enterprise apps like Salesforce, Workday, and SAP, to drive adoption and time-to-value. It delivers in-app guided walkthroughs, tooltips and hotspots, onboarding checklists, in-app microsurveys, resource centers, and announcements, targets them to the right audience, and measures whether the guidance worked. It serves both customer-facing (product-led growth) and employee-facing (internal-app enablement) use.

DAP is not in the catalog yet. These questions decide whether to build it and how to bound it against Employee Onboarding, LMS, Knowledge Management, the SOP-MGMT candidate, and a possible future Product-Analytics domain. Nothing has been written to the catalog.

---

q1: (answer this first) Should Digital Adoption Platform be created as its own domain, rather than folded into an existing domain or left queued?

- a) Promote it as a domain: create DAP and have it master the in-app guidance, engagement, targeting, and adoption surface, relating to Employee Onboarding by handoff (DAP delivers the learn-the-tools slice), consuming knowledge articles from KMS, and consuming how-to documents from SOP-MGMT.
- b) Fold it into an existing domain: treat in-app guidance as a module or capability of Employee Onboarding, LMS, or Customer Service.
- c) Keep it queued in the backlog and revisit later.

Recommended: a. Six pure-play flagships sell a product built around overlaying guidance on existing apps, WalkMe (enterprise employee-facing), Whatfix (employee and customer), Pendo (PLG, DAP fused with product analytics), Userpilot and Appcues (PLG customer-facing onboarding), and Userlane (EU enterprise adoption), plus Chameleon and Gainsight PX. The artifact (live in-app overlays) and the buyer (product, customer success, or PLG team, or IT enablement) are distinct from every neighbor: Employee Onboarding orchestrates the HR new-hire journey, LMS delivers graded out-of-app courseware, and Customer Service handles support cases. Promotion is additive; nothing is written to the catalog until you approve this.

a1:

---

q2: Should DAP master only its distinctive in-app surface and consume/hand-off the adjacent records, or also re-master knowledge articles, how-to documents, and onboarding journeys itself?

- a) Bounded: DAP masters walkthroughs, guided flows, tooltips, onboarding checklists, resource centers, microsurveys, user segments, and tracked users across its modules (guidance authoring; engagement and feedback; targeting and segmentation), consumes knowledge articles from KMS and how-to documents from SOP-MGMT, and hands off to Employee Onboarding for the learn-the-tools slice.
- b) Broad: DAP additionally re-masters knowledge articles, how-to documents, and onboarding journeys, keeping its own copies alongside KMS, SOP-MGMT, and Employee Onboarding.

Recommended: a. Across WalkMe, Whatfix, Pendo, Userpilot, Appcues, and Userlane the overlay, checklist, survey, and segment objects are the system of record, while reference articles and the source how-to document are referenced from adjacent systems. DAP's resource centers embed KMS knowledge articles rather than re-mastering them, and its in-app task lists are guidance lists, not the HR onboarding task lists Employee Onboarding owns. Collision-safe names were verified live (user_segments, because audience_segments is marketing-owned; microsurveys, because survey_responses is owned by employee engagement). Re-mastering those layers would duplicate KMS, SOP-MGMT, and Employee Onboarding records and collide with the single-master rule. The Scribe/Tango capture seam (capture once, publish as a document or push as an overlay) is modeled as a consumer edge here and resolves together with the matching SOP-MGMT question.

a2:

---

q3: Adoption analytics (feature-usage events, funnels, paths, retention cohorts, goals) overlaps a product-analytics market that has no domain yet. Should DAP ship an adoption-analytics module now, or leave the deep engine to a future Product-Analytics domain?

- a) In-scope now: DAP ships an adoption-analytics module (feature events, usage funnels, user paths, retention cohorts, goals, flow engagement stats), flagged as the extraction candidate. When a Product-Analytics domain is built, the deep engine re-homes there and DAP keeps flow engagement stats plus consumed funnels.
- b) Defer to Product-Analytics: DAP masters only flow engagement stats (per-flow completion and drop-off, intrinsic to DAP content) and the analytics engine waits for a dedicated Product-Analytics domain.

Recommended: a. Pendo proves the fusion is real, it sells DAP and product analytics as one product, and Whatfix and Userlane bundle adoption analytics into the DAP offering, so the same DAP buyer measures whether the guidance worked. The trade-off is real: the deep event-pipeline market is owned by pure-play vendors (Amplitude, Mixpanel) that have no domain in the catalog yet, so a thin analytics module here risks duplicating that domain later. Flow engagement stats stay in DAP either way. If you would rather hold the analytics engine for a dedicated Product-Analytics domain, choose b.

a3:

---

q4: DAP serves both employee-facing internal-app adoption (overlays on Workday/SAP) and customer-facing product adoption (overlays on your own product). Should this be one domain with an audience tag, or two separate domains?

- a) One domain with an audience tag: a single DAP domain with an audience setting (employee-facing / customer-facing) on the target application and at the flow and segment level.
- b) Two domains: split into an employee-adoption domain and a customer-adoption domain.

Recommended: a. Every core entity (walkthroughs, checklists, microsurveys, segments, feature events) is identical in shape regardless of audience; only the buyer and host app differ. WalkMe and Userlane lean employee-facing, Appcues and Userpilot lean customer-facing, and Whatfix and Pendo serve both from a single product, which is the strongest signal that this is one market with an audience dimension rather than two. Splitting would duplicate every entity per audience for no structural gain.

a4:

---

<!-- agent map, ignore: q1=B2-DAP-PROMOTE q2=B2-DAP-SCOPE q3=B2-DAP-ANALYTICS-SPLIT q4=B2-DAP-AUDIENCE | domain_id=null (unbuilt candidate) -->
