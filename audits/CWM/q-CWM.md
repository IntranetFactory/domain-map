# Contingent Workforce Management (CWM): questions waiting for you

## What this domain is
Source contingent workers through approved staffing suppliers, manage rate cards, and reconcile timesheets and invoices end-to-end.

Manage the full contingent-workforce cycle, requisitions, supplier distribution, candidate submissions, worker assignments, timesheets, and invoices, in one system. Approve rate cards by role and region; classify each worker against IR35, California AB5, and EU Platform Work rules; and feed approved timesheets to payroll and project accounting automatically. Procurement and HR run it jointly: procurement governs the supplier panel, HR governs the worker classification.

> Done 2026-06-19: your last round of answers is applied. The 5 pattern flags are set (contingent workers now flagged as holding personal data; staffing suppliers, rate cards, the work-order, and invoices now each require a single named approver). The domain tagline, description, and business-logic note are written. The two unowned handoff steps (process accounts payable; manage supplier information) now have named owners (the Contingent Labor Coordinator and the Staffing Supplier Manager). The only thing left is your sign-off on the module expansion before I load any of it.

> Update 2026-06-19: SOW is now its own domain. You decided that the statement-of-work cluster lives in a new emerging-market domain, Services Procurement (SVCS-PROC, domain_id 192), which masters statements_of_work, services_engagements, sow_milestones, milestone_invoices, and the optional SOW masters. That changes the CWM expansion below: the "Services Procurement / SOW" module is DROPPED from CWM (CWM does not master the SOW cluster), so the expansion is now 2 new modules (Direct Sourcing / Freelance Management + Worker Classification and Compliance), not 3. CWM instead embedded_masters the SVCS-PROC SOW masters if and when a SOW-adjacent surface is deployed (CWM links SOW engagements to its contingent-workforce spine; it never re-masters them). Entity 187 is therefore a CWM staffing requisition / work-order (rename target staffing_requisitions or staffing_work_orders), NOT a SOW work-order; its rename and re-home stays inside CWM's VMS / Staff Augmentation surface.

---

## Optional (will not hold up the build)

q1: Should I load the (now 2-module) expansion you approved in principle, as drafted minus the SOW module? You picked the expansion last round; SOW has since been split out to its own SVCS-PROC domain (domain_id 192), so the Services Procurement / SOW module and its SOW masters are no longer CWM's to load. The remaining draft (Direct Sourcing / Freelance Management + Worker Classification and Compliance, with their non-SOW masters) is in `.tmp_deploy/CWM-phaseB-draft-2026-06-19.md`. Nothing is loaded yet.

- a) Load the draft minus SOW: add Direct Sourcing / Freelance Management and Worker Classification and Compliance as 2 new modules, plus their masters (worker assignments required; classification, compliance, and freelance masters optional where statute-, jurisdiction-, or channel-bound), and rename + re-home entity 187 inside CWM as the staffing requisition / work-order (staffing_requisitions / staffing_work_orders), NOT a SOW work-order. CWM embedded_masters the SVCS-PROC SOW masters only if a SOW-adjacent surface is later deployed.
- b) Load a subset: tell me which modules or masters to include in the first load, and I will stage the rest.
- c) Hold: keep the two existing modules only for now, and revisit the expansion later.

Recommended: a. The flagship vendors package this as more than agency staffing: SAP Fieldglass, Beeline, and Workday VNDLY all separate sourcing/assignment from time/invoice (which is why the two existing modules stay); Beeline, Prosperix, Worksuite, ADP WorkMarket, and Stoke ship Direct Sourcing / Freelance Management; Magnit and Worksuite ship worker-classification engines. Beeline and Fieldglass also bundle Services Procurement / SOW as a VMS tab, which is exactly why SOW is now modeled as its own SVCS-PROC domain that CWM embeds rather than a CWM-owned module: hosting the SOW masters on CWM would bake in the contingent-workforce framing the pure-play services-procurement vendor exists to deny. The remaining masters are drawn from where those vendors actually model each entity, and each one is marked required only where every vendor masters it and the workflow halts without it (worker assignments); the rest are optional. Pick (b) for a leaner first load, or (c) to stop at the two modules.

a1:

---

<!-- agent map, ignore: q1=B2-CWM-MODULES | domain_id=64 | phase0=.tmp_deploy/CWM-phase0-2026-06-19.md | phaseB_draft=.tmp_deploy/CWM-phaseB-draft-2026-06-19.md | restructure: VMS->CWM rename executed 2026-06-19; a-CWM.md processed 2026-06-19 (5 flags + catalog copy + business_logic written, B9D owners assigned, B2-1 decided=staffing/SOW deferred to Phase-B); module expansion (B2-CWM-MODULES) drafted not loaded; 2026-06-19 SOW split to SVCS-PROC (domain 192) -> CWM SOW module DROPPED, expansion now 2 modules, CWM embedded_masters SVCS-PROC SOW cluster, entity 187 = CWM staffing requisition (not SOW work-order) -->
