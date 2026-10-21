# HCM Software Architecture — Phase-0 Vendor-Surface Research

Date: 2026-06-09. Scope: ESS/MSS module shape, internal mobility, absence ownership, modularization/compliance/lifecycle packaging. Flagship vendors: Workday HCM, SAP SuccessFactors, Oracle Cloud HCM, UKG Pro, ADP Workforce Now, Dayforce, BambooHR, HiBob, Rippling, Personio.

## Executive summary

- **Self-service is request-owning, not a thin UI.** Every flagship gates ESS/MSS edits behind first-class, workflow-tracked request objects (Workday "business process" / inbox event, SuccessFactors "workflow request" + to-do, Oracle "transaction/approval", Rippling "change request", BambooHR/Personio time-off request). A "Lifecycle & Workflows" module that masters nothing and carries only baseline permissions is the WRONG shape: it should master self-service request entities and own their submit/approve gates.
- **Internal mobility is an HRIS→ATS handoff, modeled explicitly.** Workday, SuccessFactors, and Oracle all spin up an *internal candidate* record sourced from the worker record and fire a recruiting-side application/transition event. Model an explicit HCM→ATS handoff on an internal-mobility trigger; the ATS does not silently read the worker record.
- **Absence requests are mastered by the absence/leave module (a WFM-adjacent surface), and core HCM consumes the outcome.** Recommend HCM remain a consumer of an absence-mastered request, and a 4th HCM-COMPLIANCE module is marginal (fold statutory records into core HR) while an onboarding/offboarding lifecycle split is only worth it at SuccessFactors/enterprise scale, not as a default.

## Q1 — Employee/Manager Self-Service module shape

Across flagships, ESS/MSS is emphatically **not** a thin UI writing straight to the core worker record. Each vendor interposes a workflow-gated request object that the employee or manager *creates*, which then carries its own approval routing and audit trail.

- **Workday:** ESS/MSS tasks are *business processes*. An employee initiating a personal-data change, one-time payment, or "Change Benefits for Life Event" launches a business-process instance that routes to approvers via the Workday Inbox; the change does not commit until the gated steps complete. The life-event/change-request is a tracked object, not an inline field write.
- **SAP SuccessFactors Employee Central:** Self-service edits in ESS/MSS (hire, promotion, org reassignment, personal data) generate a **workflow request** object. Participants get to-do alerts and Home-page notifications as Approvers/Contributors; the request has its own state (pending/approved/rejected) and the data change is held until approval. This is an explicit request entity, not a direct write.
- **Oracle Cloud HCM:** Self-service "transactions" generate approval objects routed via BPM; the pending change is a tracked item awaiting approval before it lands on the person record.
- **Rippling:** Documents an explicit **change request** object with custom approval logic (multi-approver, tenure/department routing, re-route on approver absence). The request is a first-class automation entity.
- **BambooHR / Personio / HiBob:** Even at the SMB tier, the time-off / absence action is a discrete *request* record an employee creates, with balance check and manager approve/reject — not an inline edit of the worker row.

So a self-service surface does **not** make sense as a permission-only layer over data mastered elsewhere. The gated "request" entities (life event, change request, absence request, onboarding/offboarding task) ARE the self-service surface's reason to exist; the worker record is updated only as a downstream effect of an approved request.

**Recommendation:** Model the self-service surface as a module that **masters its own request objects** — `change_requests`, `absence_requests` (see Q3 caveat), `life_events`, `onboarding_tasks`, `offboarding_tasks` — each carrying submit/approve permission gates and a state lifecycle. Reject the "masters-no-data, baseline-permissions-only Lifecycle & Workflows" shape; it does not reflect any flagship.

## Q2 — Internal mobility

When an internal employee applies to a posting, all three enterprise flagships create a **candidate-side record derived from the worker** and treat the application as a recruiting-module event, not an in-place worker edit.

- **Workday Recruiting:** The "Jobs Hub" / Internal Mobility experience lets a worker apply to a requisition; the application **auto-pulls from the worker profile** (career/experience sections link to the application) and a candidate/application record is created and dispositioned by the Search Recruiter alongside external candidates. The worker→candidate transition is real and produces a tracked candidate record; the eventual hire flows back through recruit-to-hire/onboarding.
- **SuccessFactors:** When hired/applied internally the person has an **internal candidate profile** (minimal data, mirroring the external candidate profile unless "Candidate to Employee Conversion" is configured). RCM and Employee Central integrate via **Manage Pending Hires**, the explicit transaction where candidate/application/offer data maps back into EC. The candidate is a distinct object from the worker, with a configured handoff in both directions.
- **Oracle Cloud HCM (Oracle Recruiting):** Tracks "internal mobility in one centralized place," delivers skill recommendations to internal candidates, and adds them to requisitions as candidate records (questionnaires prefilled). Internal applicants become candidate records in ORC, distinct from the HR person record.

In every case there is a worker→candidate materialization plus a recruiting-side application event; the ATS does not merely read the live worker record in place. SuccessFactors makes the bidirectional handoff most explicit (Manage Pending Hires + Candidate-to-Employee Conversion).

**Recommendation:** Model an explicit **HCM→ATS handoff on an internal-mobility trigger event** (e.g. `employee.applied_internally`), creating/refreshing an internal candidate in the ATS from the worker record, with a reciprocal "ready-to-hire / transferred" handoff back to HCM. Do not model internal mobility as the ATS silently reading the worker record; the vendor pattern is a materialized candidate plus an event.

## Q3 — Absence / leave request ownership

The absence/leave **request** is mastered in the dedicated absence-management surface (a WFM-adjacent module), with core HCM as a consumer of the result.

- **Workday:** Absence Management is its own functional area, distinct from Time Tracking ("absence management focuses on approving time away from work; time tracking records actual hours worked"). The worker creates an absence request (time off or leave of absence) on the Absence Calendar; the request object and its approval live in Absence, and approved absence then reflects on the worker.
- **Oracle Cloud HCM:** Absence Management is a **specialized module**; the REST API exposes a dedicated `absences` resource ("Create an absence record"). It integrates with Core HR, Payroll, and Time and Labor — i.e. the absence record is mastered in Absence and *aligned* into the person/payroll records, confirming HCM-core is a consumer.
- **SuccessFactors / UKG / Dayforce / ADP:** Leave/time-off requests live in the time-off / absence / WFM surface (Dayforce and UKG center this in WFM; ADP in its time/attendance surface), with the resulting leave posted to the worker and to payroll.
- **SMB tier (BambooHR, Personio, HiBob):** The time-off request is owned by the time-off/absence feature; core profile only reflects balances and approved leave.

The consistent pattern: the *request* (with its submit/approve gate and balance check) is mastered by absence/leave/WFM; core HCM ingests an "absence approved" outcome and records leave on the worker. HCM is the master of the *worker* and the *leave-of-record reflection*, not of the request workflow.

**Recommendation:** HCM should **remain a consumer** of a WFM/absence-mastered `absence_requests` record, ingesting an "absence approved" event and recording the resulting leave on the worker. Do not master `absence_requests` inside core HCM. (If the catalog's self-service module per Q1 is itself the absence/leave-admin surface, then absence_requests is mastered there — but it is still NOT mastered by the core worker-record module.)

## Q4 — Modularization / packaging

**(a) Compliance / statutory records.** No flagship ships a standalone "compliance" data module for I-9, national IDs, work eligibility, and pay equity; these are **folded into core HR and the onboarding/recruiting surfaces**.
- **Workday:** Government IDs / National IDs are core-HR tasks ("Change My Government IDs"); I-9 / E-Verify runs inside the hire/onboarding business process; no separate compliance object store.
- **SuccessFactors:** I-9 and E-Verify live **inside the Onboarding module** (Section 1 as an onboarding task); not a separate compliance product.
- **Rippling:** I-9, W-4, state forms are prebuilt into hiring/onboarding and HR document management; compliance is a cross-cutting behavior, not a distinct data module.

Pay equity is analytics/reporting (Workday, Oracle), not a master-data module. So a 4th HCM-COMPLIANCE *data* module would be inventing a boundary no vendor draws.

**(b) Onboarding vs offboarding split.** Two camps:
- **Split:** **SuccessFactors** ships **Onboarding 2.0** as a distinct, independently-licensable module (works even without EC/Recruiting) that *also* handles offboarding/cross-boarding — i.e. one onboarding-class product, separate from core, rather than two separate onboarding-vs-offboarding products.
- **Unified lifecycle:** **Workday** treats onboarding plans and offboarding checklists as business processes *within* core HCM (one lifecycle surface). **Rippling** is the strongest unified case: one employee graph where hire/promote/offboard flow through connected workflows spanning HR/IT/Finance — explicitly one lifecycle surface, not two products.

No major vendor splits onboarding-intake and offboarding-coordination into two separate *products*; the real split (SuccessFactors) is "lifecycle/onboarding as a separable module" vs "lifecycle inside core" (Workday, Rippling).

**Recommendation:** **Do not** create a 4th HCM-COMPLIANCE data module; fold I-9 / national IDs / work eligibility into core HR (as fields/documents on the worker) and treat pay equity as analytics. **Do not** split onboarding-intake vs offboarding-coordination into two modules; keep a single lifecycle/self-service surface (Workday/Rippling pattern). A *separable* onboarding-class module (SuccessFactors pattern) is only worth pursuing at enterprise scale where onboarding is licensed/deployed independently of core — not as the catalog default.
