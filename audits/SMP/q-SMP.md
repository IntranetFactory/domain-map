# SaaS Management Platform (SMP): questions waiting for you

## What this domain is
See every SaaS app your company pays for, cut wasted licenses, and never miss a renewal.

Discover every SaaS application in use, sanctioned or not, see who owns each one, and track real usage against what you pay for. Reclaim idle licenses automatically, run renewals on a schedule instead of in a panic, and give employees a self-service catalog to request the apps they need. One place to manage your whole SaaS portfolio, from first sign-up to final offboarding.

---

q1: (answer this first) The SMP-RENEWAL-VENDOR module needs the shared "SaaS applications" master to deploy, but that master lives in another module. How should that dependency be handled?

- a) Carry a local embedded shell of SaaS applications inside SMP-RENEWAL-VENDOR and keep it required (so the module can deploy on its own).
- b) Make SaaS applications optional in SMP-RENEWAL-VENDOR (the module deploys standalone, and consumes the shared master only when it is co-installed).
- c) Leave it as a hard cross-module prerequisite (SMP-RENEWAL-VENDOR can only deploy when the discovery module is also present).

Recommended: a. SaaS applications is SMP's own master in the discovery module, so carrying an embedded shell keeps SMP-RENEWAL-VENDOR independently deployable, which is the standard autonomous-deployable-unit shape. This decision sets the deployment shape for the renewal module, so settle it first.

a1:

---

q2: Should we add the responsibility overlay now (spelling out who is Responsible, Accountable, Consulted, and Informed for each gated SMP process, and wiring it to the workflow gates), or defer it?

- a) Author the full RACI overlay and wire it to the gated SMP transitions now.
- b) Defer the RACI overlay; the current reach-based personas are enough for now.

Recommended: b. The three SMP personas already work from their module reach, and the RACI overlay is an enhancement that needs a process-to-gate mapping first, so it adds value but does not block the build.

a2:

---

q3: Should the self-service app request be locked once submitted, so it cannot be edited while it waits for manager and IT approval? (yes/no)

Recommended: yes. The request has a gated submit step and a two-stage manager-plus-IT approval, so locking it on submit keeps the approved content stable.

a3:

---

q4: On about 13 relationship rows the "owning side" and the parent-to-child wording point in opposite directions (for example "SaaS applications integrates with app integrations" but the ownership is set on the child). Should I run a correction pass to align them? (yes/no)

Recommended: yes. This is a soft issue that never blocks the build, but it affects delete behavior and how the relationship diagrams render, so a cleanup pass is worth it. Each row will be surfaced for you before any change.

a4:

---

q5: Two outbound handoffs (to procurement for purchase requisitions, and to ITSM for incidents on app deprovisioning) have no matching cross-domain relationship rows. Should I author those mirror relationships, or treat the handoffs as event-only?

- a) Author the mirror relationships (the payload-to-target link, with verb, inverse, cardinality, and owning side).
- b) Treat them as event-only handoffs with no relationship row.

Recommended: a. Authoring the mirror relationships keeps the cross-domain links symmetric with the other handoffs and makes the data flow explicit.

a5:

---

q6: The automation module now masters both the app-lifecycle surface and the self-service requests plus workflow runs. Should I add a dedicated workflow-automation capability for the declarative-automation surface, or keep app-lifecycle as the single capability there? (yes/no)

Recommended: yes, add a dedicated workflow-automation capability. The declarative-automation and self-service-provisioning surface is distinct from app-lifecycle, so giving it its own capability describes the module more accurately. Low stakes either way.

a6:

---

## Optional (will not hold up the build)

q7: Three compliance-flavored entities were deferred earlier as single-vendor surface (SaaS data-residency attestations, subprocessor disclosures, and per-user app exposures). Should I re-vet them against the current vendor set and add the ones that hold up? (yes/no)

Recommended: no for now. The first two appeared on only one vendor (Flexera One), and per-user app exposures is better modeled as a privacy or consent view, so they want fresh evidence before any load. Additive and non-blocking.

a7:

---

q8: There has been no fresh market-surface research pass this round. Should I run a new pass against the flagship vendors (Zylo, Productiv, Torii, BetterCloud, LeanIX SaaS Management, Flexera One) to catch anything missing, mis-owned, or scope-creeping? (yes/no)

Recommended: yes, but it is optional and additive; the last full surface ran 2026-05-29 and the structural and handoff passes already covered the live state.

a8:

---

<!-- agent map, ignore: q1=B2-M9-SELFCONTAIN q2=B2-E4-RACI q3=B2-B4-SUBMITLOCK q4=B2-B6B-OWNERSIDE q5=B2-B8-XREL q6=B2-CAP-AUTOMATION q7=B3-DEFERRED-COMPLIANCE-ENTITIES q8=B3-MARKET-SURFACE-REFRESH | domain_id=85 -->
