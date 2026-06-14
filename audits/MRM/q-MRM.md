# Marketing Resource Management (MRM): questions waiting for you

## What this domain is
Plan your marketing, allocate the budget, and reconcile every dollar of spend back to the plan.

Build the annual and quarterly marketing plan as a hierarchy of plan lines, then allocate budget top-down across plans, campaigns, and channels. Track committed and actual spend against every plan line so you always know what is left to spend and where it went. Lay the whole program out on a shared marketing calendar, route budget allocations and spend through approval, and measure plan-level performance and marketing ROI. Connects to your work-management tasks, your asset library, and your campaign-execution tools without duplicating them.

> Grounding: these recommendations are backed by a Phase 0 vendor-surface study saved at `.tmp_deploy/MRM-phase0-2026-06-14.md` (TrustRadius/Gartner/Forrester market reads plus named-vendor product docs). MRM was a deliberate BORDERLINE promote: it was built scoped tightly to the marketing planning + budget kernel that no existing domain owns, and everything that converges into Work Management, Digital Asset Management, or Marketing Automation is referenced rather than re-implemented.

---

q1: (answer this first) Should Marketing Resource Management stay as its own narrow domain, or should its planning-and-budget kernel be folded into Work Management instead?

- a) Keep MRM as its own domain, scoped tightly to marketing planning and budgeting (the two modules just built: a planning-and-calendar module and a budget-and-spend module).
- b) Fold the kernel into Work Management as a marketing extension, lean on Digital Asset Management for brand assets, and retire the MRM domain.

Recommended: a. The marketing-budget object (the plan-line hierarchy, top-down allocation, and committed-versus-actual spend reconciled to plan) is the one part of classic MRM that no current domain owns, and at least one independent flagship sells exactly it. Uptempo (the company formed from BrandMaker, Allocadia, and Hive9) is the lone unambiguous independent vendor whose product IS marketing planning, budget allocation, and spend-to-plan orchestration. Planful for Marketing (formerly Plannuh) sells the same budget kernel but now as a module of the Planful FP&A platform, and Aprimo still carries the MRM planning/budget lineage even though it has repositioned its flagship toward content/DAM. The convergence is real, which is why this was borderline: Adobe markets Workfront as "Work Management" not MRM, and DAM-led suites (Aprimo, Sitecore Content Hub) are pulling the asset and content halves their way. So the work, asset, and execution halves correctly belong to Work Management, Digital Asset Management, and Marketing Automation (this build references all three rather than re-mastering them), and the budget kernel is the residue that resists folding. Work Management has no marketing-budget-allocation or spend-to-plan semantics today, so folding the kernel into it would still mean building this budget object somewhere. This choice gates the whole domain, so answer it first.

a1:

---

q2: Approve the kernel boundary as built: Marketing Resource Management references campaign execution, generic work, and brand assets from neighboring domains rather than owning them? (yes/no)

Recommended: yes. The build deliberately keeps MRM thin: it consumes marketing campaigns from Marketing Automation (which masters them via its campaign-authoring module), consumes work items and projects from Work Management (which masters them via its task-execution module), and references brand assets in Digital Asset Management through a relationship only, with no MRM copy of any of them. This matches how the flagships actually divide: Phase 0 classes brand assets as owned by DAM and campaign execution as the Marketing Automation layer, with MRM sitting upstream on plan and budget. Re-mastering any of these would duplicate another domain's system of record and is exactly the over-reach the narrow scoping avoids.

a2:

---

q3: Which compliance frameworks, if any, should attach to Marketing Resource Management?

- a) None: leave it with no attached regulations.
- b) SOX only, because marketing spend records can be financial-controls evidence for public companies.
- c) GDPR plus SOX.

Recommended: a. Phase 0 concluded MRM needs no dedicated compliance entity: it is an internal planning and operations market, not a regulated-data category. Personal-data handling lives in Marketing Automation and CRM where audience data sits; brand and legal review is a Digital Asset Management and workflow concern; and budget approval chains are lightweight governance modeled as approval workflow on budget lines, not a regulated regime. SOX (option b) is the only plausible attach because spend records can serve as financial-controls evidence, and even that is conditional on the organization being a public company. Low stakes; does not block the build.

a3:

---

## Optional (will not hold up the build)

q4: Should I run a separate Phase 0 and triage for Product Marketing Management as its own domain? (yes/no)

Product Marketing Management was named as a separate candidate in the original triage metadata and is not in the catalog. It is a different buyer (product marketers) from MRM (marketing ops and finance), so it deserves its own vendor-surface study rather than being attached to MRM.

Recommended: yes, but separately and later. It is non-blocking and does not affect the MRM kernel; it is a fresh research task.

a4:

---

q5: Should I open a catalog-hygiene check on ADV-AD-TECH, which was queried during the overlap check but is absent from the catalog? (yes/no)

ADV-AD-TECH appeared in the candidate-metadata adjacency list but has no catalog row. If it is a real intended candidate it needs its own row and triage; this is flagged only as a data-hygiene note.

Recommended: yes, but separately and later. Non-blocking.

a5:

---

q6: Should I research and add the deeper MRM substrate entities the flagship vendors model beyond the seven objects built today? (yes/no)

Uptempo, Aprimo, and Planful for Marketing model substrate beneath the kernel-seven: marketing forecast and scenario records (the re-plan math), light vendor and purchase-order rows for spend attribution, and reusable marketing plan templates. These are additive and fit the two modules already built (forecasts/scenarios and vendor/PO into the budget module, plan templates into the planning module); they can land after the gate is answered without changing the kernel.

Recommended: yes, but additive and after the gate. The substrate is real and uniform across the flagships; it is non-blocking because the two-module kernel can stand first and absorb these masters per the surface matrix.

a6:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2 q3=B2-S3 q4=B3-S1 q5=B3-S2 q6=B3-S3 | domain_id=173 | phase0=.tmp_deploy/MRM-phase0-2026-06-14.md | reversed: none -->
