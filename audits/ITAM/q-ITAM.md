# IT Asset Management (ITAM): questions waiting for you

## What this domain is
ITAM is the umbrella domain that unifies asset management across hardware, software, SaaS, cloud, and enterprise or industrial assets. It masters only the cross-asset substrate, a single unified contract object and a single lifecycle event log spanning acquisition, assignment, transfer, retirement, and disposal, while the sub-domains (HAM, SAM, SMP, FINOPS, EAM) own their asset-type-specific records. The four modules partition that umbrella surface: normalization and catalog, contracts, lifecycle, and portfolio reporting.

---

q1: (answer this first) Module 57 (Normalization and Catalog) masters no data of its own, yet two inbound cross-domain handoffs land on it (a technology platform registered from APM, a Kubernetes cluster provisioned from KUBE-PLAT). How should module 57 be shaped?

- a) Re-route both inbounds to the Lifecycle module, which masters the lifecycle event log and can record each registration as a lifecycle event; module 57 stays a derived analytical layer with no master.
- b) Give module 57 a real master (asset taxonomies or normalization rules) so the inbounds have somewhere to write.
- c) Re-classify module 57 as a starter module, since it has no master surface.

Recommended: a. The two inbounds map naturally onto the existing lifecycle event log, and keeping module 57 a derived layer avoids inventing a master just to receive them. This choice also gates the related normalization-rules and cost-allocation ideas below, so it unlocks the rest of the build.

a1:

---

q2: Module 60 (Portfolio Reporting) has one consumer reference and no master of its own. Should it get a master?

- a) Add a portfolio snapshots master that captures point-in-time TCO and portfolio-position rows.
- b) Keep module 60 as a derived analytical layer over upstream masters, with no master.

Recommended: a. Flagship platforms ship snapshot tables so historical rollup reporting does not have to recompute on every read; a snapshots master gives the module a place to store its derivations.

a2:

---

q3: Approve wiping the forbidden annotation strings off 12 handoff rows (8 cross-domain plus 4 intra-domain)? All 12 still carry notes that the current rules no longer license (cross-domain "source/target NULL until X is modularized" markers and intra-domain restatements of schema already captured in structured columns). (yes/no)

Recommended: yes, as a single loader across all 12 rows. The information either already lives in structured columns or is tracked in the audit follow-ups, so the notes add nothing. This overwrites non-empty values, so it needs your sign-off.

a3:

---

q4: One portfolio-reporting reference points at SaaS applications, an entity another domain (SMP) owns, and it is marked required, which breaks module self-containment. How should it be fixed?

- a) Set that reference to optional, so portfolio TCO rollup degrades gracefully when SaaS feeds are absent.
- b) Convert it to an embedded master and carry a local SaaS-applications shell on module 60.

Recommended: a. Marking it optional is the lighter fix and matches reality: the rollup can render without SaaS rows present. This rewrites an existing non-empty row, so it needs your sign-off.

a4:

---

q5: Rewrite the ITAM domain business-logic text to remove a forbidden em-dash and change the British spelling "Normalisation" to American "Normalization"? (yes/no)

Recommended: yes. Both the em-dash and the British spelling violate project rules, and the em-dash is still live in the database. This overwrites a non-empty value, so it needs your OK on the exact wording.

a5:

---

q6: The Purchase Orders entity that the Lifecycle module consumes has no canonical master anywhere in the catalog; the owning domain (S2P) never modularized it. How should this gap be handled?

- a) Schedule an S2P audit to author the master; the ITAM consumer reference is already correct and stays valid once S2P models it.
- b) Accept it as a long-standing legacy gap; the ITAM consumer keeps pointing at an entity with no module-level owner.

Recommended: a. The ITAM side is already correct, so only an S2P pass can close the gap properly rather than leaving a dangling consumer.

a6:

---

q7: GDPR applicability on ITAM is currently marked conditional. Should it be tightened?

- a) Upgrade GDPR applicability to mandatory.
- b) Keep it conditional; deployments outside EU jurisdictions may legitimately not trigger GDPR.

Recommended: b, unless product or legal tells you EU coverage is universal. Asset records can hold personal data (assigned-employee names, device locations), but keeping it conditional leaves room for non-EU-only deployments; tightening to mandatory propagates compliance signals everywhere.

a7:

---

q8: Should the two substrate capabilities (Normalization and Reconciliation) be renamed to domain-neutral names and linked as cross-cutting across the five sub-domains (HAM, SAM, SMP, FINOPS, EAM)?

- a) Rename to Asset Normalization and Asset Reconciliation and add cross-cutting links to all five sub-domains.
- b) Keep them ITAM-prefixed; the behavior is genuinely scoped to the umbrella domain.

Recommended: a. Both describe substrate behaviors the sub-domains share, and spanning five domains clears the cross-cutting threshold. The rename overwrites existing values, so it needs your call.

a8:

---

q9: The lifecycle event log was classified as an operational record, which makes "no lifecycle states" a structural pass (every state is captured by the event row itself). Confirm this framing? (yes/no)

Recommended: yes. The classification is already in place; an append-only event log does not need a separate state machine. Answer no only if you want a small lifecycle state machine added instead.

a9:

---

## Optional (will not hold up the build)

q10: Beyond today's two substrate masters, flagship ITAM platforms model several more entities that could become masters here: current-holder asset assignments, periodic physical asset audits, cost allocations over asset spend, first-class contract renewal events, and software or SaaS usage metrics. Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the module shapes (q1, q2) are settled. Some (cost allocations, usage metrics) have ownership boundaries with FINOPS, SAM, or SMP that want a verification pass first.

a10:

---

<!-- agent map, ignore: q1=B2-MOD57 q2=B2-MOD60 q3=B2-CONFIRM-N-FIXES q4=B1A-SELF-CONTAIN q5=B1B-S4 q6=B2-S2P-PO q7=B2-GDPR q8=B2-CROSS-CUT-CAPS q9=B2-LIFECYCLE-EXEMPT q10=B3-ASSET-ASSIGN+B3-ASSET-AUDITS+B3-COST-ALLOC+B3-CONTRACT-RENEWALS+B3-USAGE-METRICS | domain_id=3 -->
