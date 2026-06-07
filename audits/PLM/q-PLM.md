# Product Lifecycle Management (PLM): questions waiting for you

## What this domain is
Manage a product from first engineering concept through every revision, change, and retirement, with one controlled record of truth. Track engineering parts, their revisions and bills of material, CAD files and drawings under vault control, manufacturing process data, regulatory and substance compliance, and the requirements each design has to meet. Drive the changes through governed workflows (review, change orders, CAB approval, release) and hand the released results off to manufacturing, ERP, procurement, and the product catalog.

---

q1: (answer this first) For CAD drawings, should we treat them as a workflow item with a real state machine (draft, in review, released, obsolete), or as plain catalog config? CAD drawings already publish a "released" event and feed two downstream handoffs, but have no workflow today.

- a) Operational workflow: author the draft / in review / released / obsolete state machine.
- b) Catalog: treat them as config-shape with no workflow.
- c) Defer this one for now.

Recommended: a. CAD drawings already fire a released event and are the publish side of a CAD-to-manufacturing handoff and an outbound handoff to field service, so they behave like a controlled, releasable artifact. This is the lead classification call and sets the pattern for the other two below.

a1:

---

q2: For CAD models, should we treat them as a workflow item (vault check in / check out / released), or as plain catalog config?

- a) Operational workflow: author the check in / check out / released state machine.
- b) Catalog: treat them as vault config with no workflow.
- c) Defer this one for now.

Recommended: a. CAD models live in a vault where check in, check out, and release are the real lifecycle, so a state machine matches how engineers actually work with them.

a2:

---

q3: For manufacturing routings, should we treat them as a workflow item (draft, released, superseded), or as plain catalog config?

- a) Operational workflow: author the draft / released / superseded state machine.
- b) Catalog: treat them as config-shape with no workflow.
- c) Defer this one for now.

Recommended: a. A manufacturing routing already publishes a released event, which is the signal of a controlled, releasable record rather than static config.

a3:

---

q4: Right now only 1 of 17 workflow-gate permissions (release manufacturing BOM) is granted to any role, and there is no permission hierarchy to roll the rest up automatically. How should the other 16 gates be handled?

- a) Add the 16 explicit workflow-gate grants across the 4 PLM roles, so Design Engineers, the Engineering Change Manager, and the Regulatory Affairs Specialist can actually run their workflow steps.
- b) Treat the single existing grant as a deliberate exception and leave the other 16 gates unassigned by design.

Recommended: a. Without these grants the roles cannot perform their own release, change, and compliance steps, so the workflows are not actually operable. This adds role power, so it needs your sign-off before it is applied.

a4:

---

q5: Sixteen suggested process tags on PLM's cross-domain handoffs are sitting at "new" and none are approved yet. Should they be approved?

- a) Approve all 16.
- b) Approve a named subset (tell me which handoffs or processes).
- c) Defer to a later reviewer pass.

Recommended: a, if you agree the process mappings look right. Approving these is a sign-off step reserved for you, so it is not done automatically. Today the approved count is 0.

a5:

---

## Optional (will not hold up the build)

q6: Every major PLM vendor ships a program and portfolio surface above engineering core (engineering projects, deliverables, program milestones), which PLM does not have today. Should I research and add a 6th module for this program / portfolio surface? (yes/no)

Recommended: yes in principle, but it needs a vendor-research pass first, and it is additive, so it never blocks the build. It could also be a deliberate scope choice to leave program management to a separate domain.

a6:

---

<!-- agent map, ignore: q1=B2-LIFECYCLE-STATES-6-MASTERS.cad_drawings q2=B2-LIFECYCLE-STATES-6-MASTERS.cad_models q3=B2-LIFECYCLE-STATES-6-MASTERS.manufacturing_routings q4=B2-E6-RBAC-CONVENTION q5=B2-H1-APPROVE-TAGS q6=B3-PLM-PORTFOLIO | domain_id=165 -->
