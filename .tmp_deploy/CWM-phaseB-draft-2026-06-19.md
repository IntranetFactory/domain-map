# CWM Phase-B draft: module expansion + new masters (FOR REVIEW, NOT LOADED)

Date: 2026-06-19. This is a DRAFT produced from the a-CWM.md answers (a1=a "5 modules",
a12=yes "add the masters that hold up"). Per Rule #21, net-new modules and net-new masters
are expansive market structure: they are surfaced here and in q-CWM.md for the user to
approve BEFORE any catalog write. Nothing in this file has been loaded. No `domain_modules`
rows and no new `data_objects` rows were created. The actual load is a later pass, gated on
the user approving this module + master list.

Grounding: `.tmp_deploy/CWM-phase0-2026-06-19.md` (8 flagship vendors: SAP Fieldglass,
Beeline, Workday VNDLY, Magnit, Prosperix, Worksuite, ADP WorkMarket, Stoke).

## Target structure: 5 modules

| # | Module (proposed code) | Status | Realizes capability |
|---|---|---|---|
| 1 | VMS / Staff Augmentation (existing `VMS-WORKER-SOURCING`, 315) | KEEP (lightly relabel) | WORKER-REQ, STAFFING-SUPPLIER, RATE-MGMT, WORKER-CLASS |
| 2 | Contingent Time and Invoicing (existing `VMS-TIME-INVOICING`, 316) | KEEP | CONTINGENT-TIME |
| 3 | Services Procurement / SOW (`CWM-SOW-MGMT`) | NEW | SOW-MGMT (new capability) |
| 4 | Direct Sourcing / Freelance Management (`CWM-DIRECT-SOURCING`) | NEW | DIRECT-SOURCE (new capability) |
| 5 | Worker Classification and Compliance (`CWM-WORKER-COMPLIANCE`) | NEW | WORKER-CLASS (existing, expanded) |

`contingent_workers` (186) stays the shared spine, multi-module linked (as it already is across 315/316).
Two new capabilities are implied (SOW-MGMT, DIRECT-SOURCE); plus an ENGAGEMENT-MGMT capability
covering submission/assignment may be split out of WORKER-REQ. Capability rows are themselves
expansive structure and are part of this same approve-before-load gate.

## New masters (14 candidates), with Rule #16 necessity

Necessity legend (Rule #16): D = workflow-universal -> required; B = statute / jurisdiction /
sector-conditional -> optional; C = >=1 flagship vendor (of 8) does not master it AND workflow
degrades gracefully -> optional. The module itself is the activation gate for channel-bound masters.

| data_object_name | new module | role | necessity | basis (Rule #16) | one-line purpose |
|---|---|---|---|---|---|
| worker_requisitions | VMS / Staff Augmentation (1) | master | required | D: universal spine; 5/5 agency-staffing vendors master it; the engagement cycle cannot start without it | The staffing request (scope, role, rate range, duration, location, supplier-tier rules) that opens the sourcing cycle. |
| candidate_submissions | VMS / Staff Augmentation (1) | master | optional | C: SF/BL/VN/PX master it but the FMS/direct vendors (WS, WM, ST) skip the slate step; degrades gracefully in agency-less channels | Supplier slates a candidate against a requisition; carries scoring, hide-from-hiring-manager, withdrawal reason. |
| worker_assignments | VMS / Staff Augmentation (1) | master | required | D: engagement core; all 8 vendors master it; timesheets and invoices bind to it | 1:1 with a winning candidate; carries start / end / billable rate / project / WBS / location. |
| worker_onboardings | VMS / Staff Augmentation (1) | master | optional | C: 7/8 master it, SF treats onboarding as a non-record step; workflow runs without a typed record | Pre-assignment onboarding gate (documents, system access, attestations) before a worker starts. |
| worker_offboardings | VMS / Staff Augmentation (1) | master | optional | C: 4/8 (BL, VN, WS, ST) master it; the others fold offboarding into termination state, graceful | End-of-assignment offboarding (access removal, asset return, final timesheet) closing the engagement. |
| vendor_scorecards | VMS / Staff Augmentation (1) | master | optional | C: 5/8 (SF, BL, VN, MG, PX) master it; WS/WM/ST run without supplier-performance scoring | Supplier performance record (fill rate, time-to-submit, quality) feeding panel-tier decisions. |
| statements_of_work | Services Procurement / SOW (3) | master | optional | C + channel-bound: 6/8 master it (PX, WM lack); the SOW module is the activation gate, services procurement is an opt-in channel | Deliverable-based services engagement (scope, fee schedule, milestones) distinct from hourly labor. |
| sow_milestones | Services Procurement / SOW (3) | master | optional | C: 4/8 (SF, BL, VN, ST) master milestone-based payment; others bill SOW as a flat or T&M line | Milestone within an SOW; gates milestone-based payment and progress tracking. |
| sow_deliverables | Services Procurement / SOW (3) | master | optional | C: 3/8 (BL, VN, WM, ST partial) master deliverables as records; may fold into sow_milestones at modeling time | Discrete deliverable under an SOW or milestone; acceptance gates payment. |
| talent_pools | Direct Sourcing / FMS (4) | master | optional | C + channel-bound: 6/8 master it (SF, WS lack); direct sourcing is an opt-in channel, the module is the gate | Curated pool of known / past / referred workers for agency-less direct sourcing. |
| freelancer_profiles | Direct Sourcing / FMS (4) | master | optional | C + channel-bound: 5/8 master it (SF, VN, MG lack); FMS is an opt-in channel | Self-managed freelancer / independent-contractor profile (skills, rate, history, compliance docs). |
| worker_classifications | Worker Classification and Compliance (5) | master | optional | B: statute-bound (UK IR35, CA AB5, IRS 20-factor); a tenant outside those regimes installs the module without it | Typed IR35 / AB5 / EU PWD determination per worker per engagement; drives payroll withholding rules. |
| tenure_records | Worker Classification and Compliance (5) | master | optional | B: jurisdiction / policy-conditional (co-employment caps, Vizcaino-style limits); not universal | Cumulative tenure per worker against co-employment / tenure-limit policy; fires the conversion threshold. |
| compliance_documents | Worker Classification and Compliance (5) | master | optional | B: statute-artifact set (NDAs, ICAs, W-9 / W-8BEN, 1099-NEC, certifications); jurisdiction-shaped | Repository of contingent-worker compliance artifacts with type, validity window, and renewal state. |

Counts: 14 new masters; 2 required (worker_requisitions, worker_assignments), 12 optional.
`sow_deliverables` may collapse into `sow_milestones` at modeling time (firm count is a load-time decision).
`co_employment_assessments` and `right_to_work_verifications` (from the Phase 0 compliance table) are
NOT proposed as separate masters here; the recommendation folds them into `worker_classifications`
and `worker_onboardings` field-sets respectively, keeping the count at 14 (Phase 0 open question 6).

## Entity 187 (pm_work_orders) rename + re-home (decided, rides this pass)

a2 = a: entity 187 is the staffing / SOW work-order, NOT preventive maintenance. The decision is
recorded, but its execution is DEFERRED to this Phase-B / SOW build because:
- renaming a `data_object` cascades to its `trigger_events` (146 `pm_work_order.invoiced`),
  aliases (`preventive maintenance order`, `PM WO`), labels, description, and search_vector;
- the re-home target (the new Services Procurement / SOW module) does not exist yet.

Planned execution as part of the SOW-module build (after the user approves this draft):
- rename `pm_work_orders` (187) -> `sow_work_orders` (or `statement_of_work_orders`);
- relabel `Preventive Maintenance Work Order` -> `Statement of Work Order` (and plural);
- re-alias to `SOW`, `staffing work order`, `work order`; retire the PM aliases;
- rewrite description + catalog_description to the staffing / SOW shape (the description field
  already reads as staffing/SOW; the labels, aliases, and catalog_description are the stale PM parts);
- re-home the DMDO master row from module 315 to the new SOW module (3);
- align trigger event 146 and handoff 117 payload (the B1B-B1 mismatch resolves with the rename).

The a6 pattern flag (has_single_approver=true on 187) was already applied in this pass and is
independent of the future rename.

## Boundary verdicts carried from Phase 0 (no new masters, consume-only)

- `staffing_suppliers` (CWM) vs `suppliers` (SRM): DISTINCT; CWM keeps its own, hands off to SRM. Do not merge.
- `contingent_workers` (CWM) vs `employees` (HCM): DISTINCT; CWM masters non-employees, consumes/embeds employee identity from HCM only.
- `background_checks`: CWM CONSUMES (mastered by ATS/BGV today); never re-mastered. Module 5 links it.

## What the load pass will create (ONLY after user approval of this list)

- 3 `domain_modules` rows (CWM-SOW-MGMT, CWM-DIRECT-SOURCING, CWM-WORKER-COMPLIANCE) + module catalog UX (M8) + 1 system skill each (Rule #17).
- up to 2 new `capabilities` (SOW-MGMT, DIRECT-SOURCE) + `capability_domains` + `domain_module_capabilities`.
- up to 14 new `data_objects` + their `domain_module_data_objects` master rows at the necessity above.
- the entity-187 rename + re-home cascade.
- lifecycle states, trigger_events, relationships, handoffs, aliases, roles/RACI for the new masters.

None of this is written yet. This draft + the q-CWM.md proposal are the review gate.
