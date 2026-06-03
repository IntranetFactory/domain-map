# VMS audit history

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- Current footprint: domain id 64, **0 `domain_modules` rows** (M1 hard fail), 6 master `data_objects` (`contingent_workers` 186, `pm_work_orders` 187, `staffing_suppliers` 188, `rate_cards` 189, `contingent_timesheets` 190, `contingent_invoices` 191) loaded against the legacy `domain_data_objects` rollup only, 5 capabilities (WORKER-REQ, STAFFING-SUPPLIER, RATE-MGMT, CONTINGENT-TIME, WORKER-CLASS), 7 solutions (Workday VNDLY, SAP Fieldglass, Beeline, Magnit, Utmost, KellyOCG Helix UX, Deel), 3 regulations (IR35, California AB5, EU Platform Work Directive), 8 trigger events, 7 outbound handoffs (all `source_domain_module_id IS NULL`), 0 inbound handoffs, 12 data_object_aliases, 0 lifecycle states, 1 legacy domain-level system skill (`vms-system`, id 118) with 8 `skill_tools` rows, 0 roles authored against an Indirect Procurement business function (no `roles.business_function_id=68` rows exist).
- Vendor-surface basis (this audit, no separate subagent): Workday VNDLY (acquired-VNDLY, modern marketplace), SAP Fieldglass (enterprise VMS leader, deep SOW + services procurement), Beeline (independent MSP-friendly), Magnit (managed-services + tech), Utmost (modern total-talent), KellyOCG Helix UX (MSP-aligned), plus Deel as adjacent contractor-payment (already on the domain as secondary). All 7 already loaded as `solution_domains`.
- **Bucket 1 (in-scope, agent fixable):** 17 items.
- **Bucket 2 (surface-for-user, judgment):** 4 items.
- **Bucket 3 (Phase 0 pending, speculative):** 3 items.

Structural pass: M-band fails hard (M1 + M2 + M4 + M6 + M7 collateral). B-band cannot be cleanly graded without modules: B2 / B3 / B4 evaluate against `data_objects` directly and fail on every master (no labels validated? labels exist but pattern flags all default-false uninspected, no canonical-bare-word rationale, no lifecycle states). B6 partially passes (8 intra-domain relationship rows). B7 passes (users-edges loaded for 6 of 6 masters via verbs `sponsors`, `owns`, `manages`, `approves` x2, `dispatches`, `approves`). B9 has events for 5 of 6 masters but `rate_card.published` event 596 has no `handoffs` row, and every loaded handoff is missing `source_domain_module_id` because the source domain has no modules (B10b sub-case 1: upstream M1 gap). C-band passes (3 `business_function_domains` rows: Indirect Procurement owner, Procurement + HR contributors). A1 passes; A2 passes (5 capabilities); A3 passes (7 solutions); A4 fails (both catalog UX fields empty). E-band vacuously fails: no `roles` rows exist for Indirect Procurement, no `role_modules` rows, no `role_permissions` rows; this rolls into a structural-blocker after Bucket 1 #M1 lands. F1 fails (legacy domain-level system skill present); F2 cannot evaluate without modules.

Domain Semantius score (across the 1 legacy skill): 7/8 platform = 87.5%. The 1 non-platform tool is `sign_document` (id 42, external, required) consistent with the SOW-signing leg.

**Data-quality finding (highest severity).** `data_objects.id=187` is named `pm_work_orders` with `singular_label='Preventive Maintenance Work Order'` and aliases `preventive maintenance order`, `PM WO`, but its `description` says *"Staff-augmentation or statement-of-work requisition: scope, role, rate range, duration, location, hiring manager, supplier-tier rules. Drives supplier distribution and candidate submission."* The trigger event 146 (`pm_work_order.invoiced`) and outbound handoff 117 (VMS to S2P) both treat it as a Preventive Maintenance work order, but the description and the contingent-labor workflow attached to it (relationship 186 `executes` 187, 191 `rolls up` 187) treat it as the staffing-request work order. **Either the name and aliases are wrong (the data is contingent-labor SOW / staff-aug requisitions and got mis-labeled as Preventive Maintenance during load), or the entity belongs in EAM (Enterprise Asset Management) and was wrongly placed in VMS.** Pure-play VMS vendors universally master a `work_orders` / `staffing_requests` / `requisitions` entity that is NOT preventive maintenance. Surfaced as Bucket 2 #B2-1 (judgment call); it cascades into many Bucket 1 items below.

### Pass 1 - Structural findings (per-domain completeness checklist)

#### S - Structural coverage sweep

**S1. Direct FKs to `domains` for VMS (id 64):**

| Table | FK column | VMS rows | Expected non-zero? | Status |
|---|---|---|---|---|
| `domain_data_objects` | `domain_id` | 6 | yes | pass |
| `solution_domains` | `domain_id` | 7 | yes | pass |
| `business_function_domains` | `domain_id` | 3 | yes | pass |
| `capability_domains` | `domain_id` | 5 | yes | pass |
| `domain_regulations` | `domain_id` | 3 | when applicable | pass (3 mandatory) |
| `handoffs` | `source_domain_id` | 7 | yes | pass |
| `handoffs` | `target_domain_id` | 0 | when applicable | flag (no inbound handoffs anywhere in catalog publish to VMS) |
| `skills` | `domain_id` | 1 (legacy, no module) | yes (one per module under Rule #14) | fail (legacy shape; routes to F1) |
| `domain_modules` | `domain_id` | **0** | yes | **HARD FAIL** (routes to M1) |
| `domain_module_host_domains` | `domain_id` | 0 | routinely zero | pass (no cross-cutting host) |
| `domains.parent_domain_id` | self | 0 | routinely zero | pass |
| `domain_aliases` | `domain_id` | n/a (column shape different in this catalog) | optional | skipped |

**S2. Indirect-table per-module coverage.** N/A: zero modules. The S2 sweep is vacuous; this is itself the M1 finding.

**S3. Per-master indirect-table coverage:**

| data_object | states | events | aliases |
|---|---|---|---|
| `contingent_workers` (186) | 0 | 1 (`worker.tenure_threshold`) | 3 |
| `pm_work_orders` (187) | 0 | 1 (`pm_work_order.invoiced`) | 2 |
| `staffing_suppliers` (188) | 0 | 1 (`staffing_supplier.activated`) | 2 |
| `rate_cards` (189) | 0 | 1 (`rate_card.published`) | 2 |
| `contingent_timesheets` (190) | 0 | 2 (`contingent_timesheet.approved`, `.rejected`) | 2 |
| `contingent_invoices` (191) | 0 | 2 (`contingent_invoice.received`, `.matched`) | 1 |

Every master has 0 lifecycle states. Routes to B12 on all 6 masters.

#### Bucket 1 - In-scope confirmed gaps

##### STRUCTURAL (M-band, blocks every downstream concern)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 | VMS has zero `domain_modules` rows. VMS has 5 capabilities, so M2 requires >=2 modules. Hand-author a modularization. Proposed split (subject to user confirmation in Bucket 2 #B2-1 because of the `pm_work_orders` ambiguity): (a) `VMS-WORKER-SOURCING` covering `contingent_workers`, work order / requisition (whatever 187 truly is), `staffing_suppliers`, `rate_cards`, capabilities WORKER-REQ + STAFFING-SUPPLIER + RATE-MGMT + WORKER-CLASS; (b) `VMS-TIME-INVOICING` covering `contingent_timesheets`, `contingent_invoices`, capability CONTINGENT-TIME. | Phase A loader: INSERT 2 `domain_modules` rows, INSERT 5 `domain_module_capabilities` rows, INSERT 6 `domain_module_data_objects` master rows distributing the 6 data_objects across the two modules. Drops the legacy `domain_data_objects` rollup behavior into derived-from-DMDO mode. |
| B1-S2 | M5 | Every workflow-bearing lifecycle state authored under B12 will need `domain_module_id` set to the realizing module. Today every `domain_module_id` is implicitly NULL because no modules exist; once B1-S1 lands and B12 lifecycle states are authored, attribute each state to the correct module. | Part of the B12 loader. |
| B1-S3 | M7 | After modularization, single-master check is mechanical: each of 6 data_objects gets exactly one `master` row in DMDO, anchored to one of the 2 new modules. No conflicting masters elsewhere (verified: `pm_work_orders` only has the VMS DMDO row catalog-wide, similarly for the other 5). | Part of the B1-S1 loader. |
| B1-S4 | F1 | Legacy `skills` row 118 (`vms-system`, kebab-cased, `domain_id=64`, `domain_module_id` NULL) is the pre-modular system skill. After modularization, retire it and author one `skill_type='system'` skill per new module per Rule #17 (e.g. `vms_worker_sourcing_agent`, `vms_time_invoicing_agent`). The current `skill_tools` set (8 tools) re-distributes naturally: 6 query tools per their `data_object_id`, plus `send_email` and `sign_document` as required on the worker-sourcing module (sign for SOW), `send_email` on time-invoicing. | Phase S loader: INSERT 2 new `skills` rows, INSERT new `skill_tools` rows mirroring the legacy ones, DELETE skill 118 (the 8 legacy `skill_tools` rows cascade or are deleted explicitly). |

##### STRUCTURAL (A / B / E bands)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S5 | A4 | `catalog_tagline` empty, `catalog_description` empty. Both required by Rule #20. | Draft both in buyer voice per Rule #20, surface to user BEFORE writing. Reminder: buyer voice (workflow + value), not analyst voice (market + handoffs). |
| B1-S6 | B2 | All 6 masters have `singular_label` + `plural_label`. Pass on B2 specifically. | No fix needed; recorded for completeness. |
| B1-S7 | B3 | None of the 6 masters carry `is_canonical_bare_word=true`, all 6 are prefixed names (`contingent_workers`, `pm_work_orders`, `staffing_suppliers`, `rate_cards` is bare but `rate_cards` is a generic phrase, `contingent_timesheets`, `contingent_invoices`). Verify `rate_cards` collision: PSA-billing might also use `rate_cards`. If collision-free, optionally claim canonical; otherwise prefix to `vms_rate_cards`. | Run Rule #9 arbitration on `rate_cards` (id 189) specifically: query `/data_objects?data_object_name=ilike.*rate_card*`. Other 5 names are prefixed and pass automatically. |
| B1-S8 | B4 | All 6 masters have `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false`. Re-evaluate each: `contingent_workers` PII (SSN, tax classification, I-9 / IR35 status) suggests `has_personal_content=true`; `rate_cards` and SOW (entity 187 if confirmed as SOW) plausibly have a single approver. | PATCH per data_object after user confirms which flags should flip (record decision in the audit; no `notes` writes per Rule #15). |
| B1-S9 | B6 | Intra-domain relationships: 8 edges loaded (verified above). Two issues: (a) row `contingent_workers 186 executes pm_work_orders 187` makes no sense if 187 really is preventive maintenance work orders (you don't have contingent workers execute PMs); blocks on Bucket 2 #B2-1. (b) row `contingent_invoices 191 rolls_up pm_work_orders 187` (`is_required=false`) is also semantically suspect for the same reason. | If user confirms 187 is mis-named (Bucket 2 #B2-1 = a), rename the entity to `staffing_work_orders` or `sow_work_orders` and fix the aliases + description in the same loader. If 187 truly is preventive-maintenance (b), DELETE both relationship rows and the DMDO master row on 187, and route 187 to EAM as a separate concern. |
| B1-S10 | B7 | Verified: all 6 masters have at least one `users` edge (verbs `sponsors`, `owns`, `manages`, `approves`, `dispatches`). | No fix needed; recorded for completeness. |
| B1-S11 | B9 | `rate_card.published` (event 596) has zero `handoffs` rows. The event description says PSA aligns project bill rates, ERP-FIN refreshes cost accruals, so two handoff subscribers are implied. | INSERT 2 `handoffs` rows: VMS to PSA on `rate_cards` (`integration_pattern: batch_sync` typical for rate refreshes), VMS to ERP-FIN on `rate_cards` (`integration_pattern: batch_sync`). |
| B1-S12 | B9b | N/A: VMS will have 2 modules after B1-S1 lands, but no current intra-domain handoffs. Once modules land, the chain `staffing_supplier.activated -> rate_card.published -> contingent_timesheet.approved -> contingent_invoice.received -> contingent_invoice.matched` likely crosses the VMS-WORKER-SOURCING to VMS-TIME-INVOICING boundary on at least `contingent_timesheet.approved` (sourcing produces the request, time-invoicing executes). Surface as a follow-up after B1-S1. | Re-run B9b derivation after B1-S1 lands; INSERT intra-domain `handoffs` rows with `integration_pattern: lifecycle_progression`. |
| B1-S13 | B10b | Every cross-domain outbound handoff (7 rows: 117, 118, 587, 588, 589, 590, 591) has `source_domain_module_id IS NULL` because VMS has no modules. Sub-case 1: upstream M1 gap. PATCH after B1-S1 lands. | Backfill loader (sibling shape to `backfill_ats_handoff_modules_2026_05_23.ts`). For each outbound row, set `source_domain_module_id` to the module that masters the trigger event's `data_object_id`. After B1-S1: events 147 (worker.tenure_threshold) and 146 (pm_work_order.invoiced) attribute to VMS-WORKER-SOURCING; 596 / 597 / 598 / 599 / 600 attribute to VMS-TIME-INVOICING; 595 (staffing_supplier.activated) attribute to VMS-WORKER-SOURCING. |
| B1-S14 | B11 | All 6 masters carry aliases (3 / 2 / 2 / 2 / 2 / 1). Pass. | No fix. |
| B1-S15 | B12 | Zero lifecycle states on any of the 6 masters. `contingent_workers` (worker has tenure threshold + termination), `staffing_suppliers` (draft / activated / suspended / terminated), `rate_cards` (draft / published / superseded / retired), `contingent_timesheets` (drafted / submitted / approved / rejected / billed), `contingent_invoices` (received / matched / disputed / paid). `pm_work_orders` (entity 187): lifecycle depends on Bucket 2 #B2-1 resolution. | Phase B loader: INSERT lifecycle states per master with `requires_permission=true` on workflow gates (approve, activate, publish, dispute). |
| B1-S16 | E1 | Zero roles authored against `business_function_id=68` (Indirect Procurement). Once B1-S1 lands (2 modules), at minimum: `INDIRECT-PROCUREMENT-VMS-PROGRAM-MGR` (primary on both modules), `INDIRECT-PROCUREMENT-SUPPLIER-MGR` (primary on VMS-WORKER-SOURCING), `INDIRECT-PROCUREMENT-CONTINGENT-LABOR-COORDINATOR` (primary on VMS-TIME-INVOICING). Plus cross-functional `HIRING-MANAGER` (cross-functional, secondary on VMS-WORKER-SOURCING, since hiring managers approve contingent worker requests) which already exists as role 10007. | Phase E loader: INSERT 3 roles + role_modules + role_permissions; PATCH `HIRING-MANAGER` role_modules to add `VMS-WORKER-SOURCING (secondary)`. |

##### BOUNDARY

| ID | Finding | Fix |
|---|---|---|
| B1-B1 | Cross-domain relationships incomplete in 2 directions: (i) `staffing_suppliers 188 bills_via contingent_invoices 191` is correctly modeled, but the outbound relationship corresponding to handoff 591 (VMS to SUP-LIFE on `staffing_supplier.activated`) implies a relationship `staffing_suppliers (VMS-mastered) onboards_into supplier_lifecycle_records (SUP-LIFE-mastered)`. Verify SUP-LIFE has a master that's the right target; if missing, route as report-only on SUP-LIFE B8. (ii) Handoff 117 (VMS to S2P on `contingent_invoices` payload, but trigger event 146 fires on `pm_work_orders` entity 187) implies a payload mismatch unless event 146's `data_object_id` should be 191 (the invoiced concept) and the event is mis-named. Surface to user; this is also Bucket 2 #B2-1's blast radius. | Part of the renaming / re-classifying decision; tracked under Bucket 2 #B2-1. |
| B1-B2 | Outbound handoff 118 (VMS to HCM on `worker.tenure_threshold`, `manual_handoff`, `high` friction): no corresponding `data_object_relationships` row in the catalog from `contingent_workers 186` to a HCM master (e.g. `employees 31`). One inbound row exists: `employees 31 reviewed_against contingent_workers 186` (`owner_side=target`), which is the wrong direction for the conversion handoff. Recommended add: relationship `contingent_workers converts_to employees`, `is_required=false`, `owner_side=source` (VMS owns the verb). | INSERT one `data_object_relationships` row. |

##### APQC TAGGING

The H1 band: 7 cross-domain outbound handoffs, 0 inbound. Existing `handoff_processes` rows: zero. Volume target: 0.5N to 0.8N agent_curated tags (3.5 to 5.6 rows), plus deferrals for any without a clean PCF match.

Per-handoff candidate PCF activities (sourced via `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry`):

| handoff_id | source > target | trigger_event | payload | Proposed PCF row | PCF id (external) | confidence |
|---|---|---|---|---|---|---|
| 117 | VMS > S2P | `pm_work_order.invoiced` (146) | `contingent_invoices` | Process accounts payable (AP) | 315 (10756) | confident L3 (assuming entity 187 resolves to SOW; if PM, the verb belongs to EAM and the handoff itself is mis-modeled) |
| 118 | VMS > HCM | `worker.tenure_threshold` (147) | `contingent_workers` | Manage new hire/re-hire | 222 (10443) | confident L3 (tenure threshold typically converts contractor to employee) |
| 587 | VMS > PSA | `contingent_timesheet.approved` (597) | `contingent_timesheets` | Track workforce utilization | 923 (10392) | confident L4 (PSA captures project actuals from approved timesheets) |
| 588 | VMS > AP-AUTO | `contingent_invoice.received` (599) | `contingent_invoices` | Process accounts payable (AP) | 315 (10756) | confident L3 |
| 589 | VMS > ERP-FIN | `contingent_invoice.matched` (600) | `contingent_invoices` | Process accounts payable (AP) | 315 (10756) | confident L3 (post liability after match) |
| 590 | VMS > PAYROLL | `contingent_timesheet.approved` (597) | `contingent_timesheets` | Enter employee time worked into payroll system | 1418 (10858) | confident L4 (contingent workers paid via payroll-adjacent flows when worker is W-2 from staffing supplier) |
| 591 | VMS > SUP-LIFE | `staffing_supplier.activated` (595) | `staffing_suppliers` | Manage suppliers | 167 (10280) | confident L3 |

All 7 land in the confident-tag bucket; no deferrals. Apply per the procedure: INSERT 7 `handoff_processes` rows with `proposal_source='agent_curated'`, `record_status='new'`, `role='implements'`.

| ID | Finding | Fix |
|---|---|---|
| B1-H1 | 7 outbound handoffs untagged; propose 7 `agent_curated` rows per the sub-table above. | Bulk INSERT 7 rows; the composed key `(handoff_id, process_id)` prevents duplicates. |

#### Bucket 1 sub-totals

| Finding type | Count |
|---|---|
| MISSING | 0 (no compliance-mandated entity gaps surfaced beyond what Bucket 2 #B2-1 resolves) |
| WRONG-OWNERSHIP | 0 (gated on Bucket 2 #B2-1) |
| SCOPE-CREEP | 0 (gated on Bucket 2 #B2-1) |
| STRUCTURAL | 15 (B1-S1 through B1-S16, excluding S6 / S10 / S14 which are passes recorded for completeness; net = 12 actionable; surface count = 15 including the 3 recorded-as-pass items because the audit still tracks them as items) |
| BOUNDARY | 2 (B1-B1, B1-B2) |
| APQC TAGGING | 1 row item (B1-H1 covers all 7 handoff tags as one item per the constraint #10 convention) |

Headline count: **17 Bucket 1 items** (15 structural recorded + 2 boundary + 1 APQC; treating B1-S6 / B1-S10 / B1-S14 as recorded-pass not action items reduces the actionable count to 14; the summary reports both).

### Pass 2 - Market audit (semantic)

No subagent spawn (this audit IS the subagent, per the prompt constraint). Vendor surface reasoned from direct knowledge of the flagship VMS vendors enumerated above.

**Vendor surface union** (entities pure-play VMS vendors universally master):

- Master records: contingent workers, staffing suppliers, statement-of-work / staffing requisitions, rate cards, contingent timesheets, contingent invoices.
- Junctions / lifecycle: requisition distributions to suppliers (1:N suppliers per requisition with submission deadlines), candidate submissions (suppliers submit candidate slates), interview slots (against submissions), worker assignments (workers anchored to a requisition with start / end dates), tenure rosters.
- Audit / compliance: IR35 / AB5 / EU PWD classifications, on-board / tenure / off-board attestations.
- Engagement: candidate engagements (during submission), supplier engagements (during scoring / award), MSP-tier escalations.
- Configuration / templates: SOW templates, supplier-tier configuration, rate-card seasons / regions / currencies.

**MISSING (in surface, not in current footprint):**

- `staffing_requisitions` or `worker_requisitions` (the request entity that starts the cycle). The catalog has `pm_work_orders` (id 187) whose description matches this but whose name and aliases say preventive maintenance. Either rename 187 (Bucket 2 #B2-1 = a) or insert a new master and demote 187 (Bucket 2 #B2-1 = b). Gated.
- `candidate_submissions` (suppliers submit candidate slates against a requisition). Universal across all flagship VMS. Surfaced as Bucket 3 #1.
- `worker_assignments` (anchors a contingent worker to a requisition with start / end / billable rate). Universal across all flagship VMS. Surfaced as Bucket 3 #2.
- `worker_classifications` (the typed IR35 / AB5 / EU PWD attestation row per worker per engagement). Required by WORKER-CLASS capability and the 3 regulations. Surfaced as Bucket 3 #3.

**WRONG-OWNERSHIP:**

- Gated on Bucket 2 #B2-1: if `pm_work_orders` (187) is genuinely Preventive Maintenance, it does not belong in VMS at all (route to EAM). If it is staffing requisitions / SOW, the name + aliases + label are wrong but the module placement is right.

**SCOPE-CREEP:**

- None confirmed independently of Bucket 2 #B2-1.

**MODULARIZATION ISSUES:**

- VMS has no modules at all (M1 hard fail), so there is nothing to audit for modularization coherence. The proposed two-module split (VMS-WORKER-SOURCING, VMS-TIME-INVOICING) is in B1-S1.

### Pass 3 - Neighbor discovery

Cross-edges via outbound `handoffs` (target_domain_id) for VMS:

| Neighbor | Outbound handoffs | Inbound handoffs | DMDO consumer/contributor on neighbor's masters | Edge weight | Verdict |
|---|---|---|---|---|---|
| HCM | 1 (118 worker.tenure_threshold) | 0 | 0 (no VMS module masters yet to consume) | 1 | light |
| S2P | 1 (117 pm_work_order.invoiced) | 0 | 0 | 1 | light (and gated on Bucket 2 #B2-1) |
| PSA | 1 (587 contingent_timesheet.approved) | 0 | 1 (PSA-TIME-EXPENSE consumes `contingent_timesheets`) | 2 | light |
| AP-AUTO | 1 (588 contingent_invoice.received) | 0 | 0 | 1 | light |
| ERP-FIN | 1 (589 contingent_invoice.matched) | 0 | 0 | 1 | light |
| PAYROLL | 1 (590 contingent_timesheet.approved) | 0 | 0 | 1 | light |
| SUP-LIFE | 1 (591 staffing_supplier.activated) | 0 | 0 | 1 | light |

No neighbor crosses the edge-weight-3 threshold for a full pairwise reconciliation. Lighter neighbors get one-line summaries (already in Pass 1 B1-S13 / B1-B1 / B1-B2 / B1-H1). The boundary that would warrant deeper inspection if anything (PSA edge-weight 2, due to the `PSA-TIME-EXPENSE` consumer row) is covered by the structural pass items.

### Pass 4 - Pairwise reconciliation per neighbor (edge weight >= 3)

No neighbor at edge weight >= 3. Pass 4 vacuous.

### Bucket 2 - Surface-for-user (judgment calls)

1. **B2-1: Entity 187 (`pm_work_orders`) identity.** The data_object's name, `singular_label` ("Preventive Maintenance Work Order"), and aliases (`preventive maintenance order`, `PM WO`) say Preventive Maintenance, but its description and every workflow attached (relationships, trigger event 146, handoff 117 routing to S2P with payload `contingent_invoices`) say staffing requisition / SOW. Options:
   - **(a) Rename + relabel + re-alias** (description was right; name was wrong): rename to `staffing_work_orders` or `sow_work_orders`, replace labels with "Statement of Work Requisition" or similar, replace aliases with `SOW`, `staffing requisition`, `work order`. Keep in VMS. This is the option most consistent with the existing relationships and handoffs.
   - **(b) Treat as Preventive Maintenance and remove from VMS**: DELETE the DMDO master row, DELETE the relationships connecting it to contingent-labor masters, route the entity to EAM as a separate concern. Then INSERT a fresh `staffing_requisitions` master in VMS (Bucket 3 #1 becomes Bucket 1).
   - **(c) Split**: keep `pm_work_orders` as Preventive Maintenance (route to EAM), INSERT a new `staffing_requisitions` master in VMS. Same outcome as (b) but explicit about retaining the entity vs deleting.
   This decision gates B1-S1's module-naming, B1-S9, B1-B1's handoff 117 payload, B1-S11 (rate cards' relationships), all of Bucket 3 #1, and the WRONG-OWNERSHIP / SCOPE-CREEP categories in the market audit. Highest-priority unblock.

2. **B2-2: `catalog_tagline` + `catalog_description` draft.** Both empty. Per Rule #20 draft both in buyer voice, surface to user BEFORE writing. Proposed tagline (for review): *"Source contingent workers through approved staffing suppliers, manage rate cards, and reconcile timesheets and invoices end-to-end."* Proposed description (for review, 3 sentences): *"Manage the full contingent-workforce cycle, requisitions, supplier distribution, candidate submissions, worker assignments, timesheets, and invoices, in one system. Approve rate cards by role and region; classify each worker against IR35, California AB5, and EU Platform Work rules; and feed approved timesheets to payroll and project accounting automatically. Procurement and HR run it jointly: procurement governs the supplier panel, HR governs the worker classification."* Authoritative wording is the user's call.

3. **B2-3: Pattern flags on the 6 masters.** Per B1-S8, none of the 6 masters carry any pattern flag = true. Re-evaluation proposals (each is one yes/no): (i) `contingent_workers.has_personal_content=true` (PII: SSN, tax classification, IR35 status); (ii) `staffing_suppliers.has_single_approver=true` (supplier activation is a single procurement approval); (iii) `rate_cards.has_single_approver=true` (procurement or finance signs off); (iv) staffing requisitions / SOW (entity 187 if resolved by Bucket 2 #B2-1 = a, or new entity if = b/c) `has_single_approver=true` (hiring manager approves); (v) `contingent_invoices.has_single_approver=true` (AP team approves payment). User confirms which.

4. **B2-4: Module naming.** Proposed module codes in B1-S1: `VMS-WORKER-SOURCING` and `VMS-TIME-INVOICING`. Alternates: `VMS-SOURCING-PIPELINE` + `VMS-TIME-INVOICE`. Or a three-module split if user wants finer granularity (VMS-REQUISITIONS, VMS-SUPPLIERS-RATES, VMS-TIME-INVOICING). User picks.

### Bucket 3 - Phase 0 pending (speculative)

| Candidate | Proposed module (post B1-S1) | Vendor evidence |
|---|---|---|
| `candidate_submissions` (suppliers slate candidates against a requisition; carries scoring, hide-from-hiring-manager flags, withdrawal reasons) | VMS-WORKER-SOURCING | Universal: Workday VNDLY, SAP Fieldglass, Beeline, Magnit, Utmost |
| `worker_assignments` (1:1 with a winning candidate; carries start / end / billable rate / project / WBS / location; separate from the master `contingent_workers` because a worker can re-engage on multiple assignments) | VMS-WORKER-SOURCING | Universal in the same five vendors |
| `worker_classifications` (typed IR35 status determination, AB5 ABC-test result, EU PWD platform-worker attestation per worker per engagement) | VMS-WORKER-SOURCING (or new VMS-CLASSIFICATION-COMPLIANCE) | Mandatory under WORKER-CLASS capability and the 3 loaded regulations; specialist depth varies by vendor (Fieldglass and Magnit have explicit classification engines; VNDLY ships an integration partner pattern) |

Eyeball recommendation: all 3 ring true on the regulated-VMS market shape; user can promote to Bucket 1 immediately or run a formal Phase 0 to triangulate. Formal Phase 0 would also check whether `interview_slots` and `supplier_score_cards` warrant first-class entities or sit inline.

### Cross-bucket dependencies

- **Bucket 2 #B2-1 gates almost everything in Bucket 1**: B1-S1 (module names depend on the resolution), B1-S9 (semantically-suspect relationship rows), B1-B1 (handoff 117 payload coherence), B1-S11 (rate_card.published target list), Bucket 3 #1 (`staffing_requisitions` becomes Bucket 1 if 187 is preserved as Preventive Maintenance). Resolve B2-1 first.
- **Bucket 2 #B2-3 is independent** of B2-1 (pattern flags evaluate against the master, regardless of what entity 187 turns out to be).
- **Bucket 2 #B2-4 (module naming) waits on B2-1** because the entity in module A changes the module's natural code.
- **Bucket 3 candidates are independent** of B2-2 / B2-3 but inter-dependent: `candidate_submissions` is upstream of `worker_assignments`; `worker_classifications` is parallel to both.

### Per-bucket prompts

- **After Bucket 1:** *"Fix these now? The 17-item Bucket 1 unpacks into: 4 M-band structural blockers (B1-S1 through B1-S4) that have to land first; 12 B-band / A-band / E-band items (B1-S5 through B1-S16) that depend on B1-S1; 2 boundary fixes (B1-B1, B1-B2); 1 APQC tagging insert (B1-H1, 7 rows). Approve the M-band first as a phase, then sequence the rest? Or all-at-once?"*
- **After Bucket 2:** *"Need your call on each, in this order: B2-1 (entity 187 identity) gates the whole module load, so answer this first; B2-2 (catalog UX text); B2-3 (5 pattern-flag decisions); B2-4 (module naming, depends on B2-1). I'll wait for B2-1 before sequencing anything else."*
- **After Bucket 3:** *"Vet via Phase 0 (formal vendor research on these 3 candidates plus interview_slots and supplier_score_cards), or eyeball-mode (all 3 ring true)? If eyeball, the candidates become Bucket 1 items in the next load loop."*

### Report-only follow-ups (owed by other domains)

- **HCM B8 owes:** `data_object_relationships` row `employees (31) <- contingent_workers (186)` already exists in the wrong direction (`employees 31 reviewed_against contingent_workers 186`, owner_side=target). The forward conversion relationship `contingent_workers converts_to employees` (or similar verb) is missing; it would be VMS-side (covered by B1-B2), but the inverse / mirror row from HCM's perspective `employees converted_from contingent_workers` is HCM's call. Surfaces when HCM is next validated.
- **S2P B10 (inbound side):** handoff 117 (VMS to S2P on `pm_work_order.invoiced`) targets S2P with payload `contingent_invoices`, but S2P's modules do not declare a consumer DMDO row on `contingent_invoices` (191). The target_domain_module_id is NULL on the row. Once VMS resolves Bucket 2 #B2-1 and re-attributes the handoff payload (or VMS's modules land), S2P will need to add the consumer row.
- **AP-AUTO B10:** handoff 588 (VMS to AP-AUTO on `contingent_invoice.received`) targets AP-AUTO; AP-AUTO does not declare a consumer DMDO row on `contingent_invoices` (191). Surface for AP-AUTO's B10 / Phase B pass.
- **ERP-FIN B10:** handoff 589 (VMS to ERP-FIN on `contingent_invoice.matched`) similarly lacks an ERP-FIN consumer DMDO row on `contingent_invoices`.
- **PAYROLL B10:** handoff 590 (VMS to PAYROLL on `contingent_timesheet.approved`) lacks a PAYROLL consumer DMDO row on `contingent_timesheets` (190).
- **SUP-LIFE B10:** handoff 591 (VMS to SUP-LIFE on `staffing_supplier.activated`) lacks a SUP-LIFE consumer DMDO row on `staffing_suppliers` (188). SUP-LIFE may legitimately keep its own master `suppliers` and treat `staffing_suppliers` as a specialization; if so, the inbound side could be a master / embedded_master cross-reference rather than a consumer.

### Notes on the audit run

- No `record_status='approved'` writes (Rule #1 / constraint #6); no `notes` writes anywhere (Rule #15 / constraint #7).
- No candidates queued in `audits/_missing-domains.md` for this audit: VMS is itself the market and the candidates surfaced are entities within VMS, not adjacent markets.
- The em-dash review was performed in-memory against the draft text before writing; no U+2014 characters appear in this file.

## 2026-05-31, Continuation: B1 technical fixes

### Loader

`c:/dev/domain-map/.tmp_deploy/fix_vms_b1_technical_2026_05_31.ts` (run from project root). Single-step apply; idempotent; safe to re-run.

### Applied (1 of 17 B1 items)

- **B1-H1 (6 of 7 rows): INSERT 6 `handoff_processes`** with `proposal_source='agent_curated'`, `role='implements'`, `record_status` defaulted to `'new'`, `notes` empty.
  - id=656 handoff_id=118 -> process_id=222 ("Manage new hire/re-hire", PCF 10443)
  - id=657 handoff_id=587 -> process_id=923 ("Track workforce utilization", PCF 10392)
  - id=658 handoff_id=588 -> process_id=315 ("Process accounts payable (AP)", PCF 10756)
  - id=659 handoff_id=589 -> process_id=315 ("Process accounts payable (AP)", PCF 10756)
  - id=660 handoff_id=590 -> process_id=1418 ("Enter employee time worked into payroll system", PCF 10858)
  - id=661 handoff_id=591 -> process_id=167 ("Manage suppliers", PCF 10280)
  - Pre-flight verified each handoff touches VMS (source_domain_id=64) and each PCF external_id matches the audit. No duplicates and no competing rows existed.
  - Handoff 117 (VMS -> S2P) skipped: the audit's own confidence note qualifies the tag as "assuming entity 187 resolves to SOW; if PM, the verb belongs to EAM and the handoff itself is mis-modeled". That conditional gates on Bucket 2 #B2-1, so the row is judgment, not pre-specified.

### Deferred (16 of 17 B1 items)

| Item | Band | Reason deferred |
|---|---|---|
| B1-S1 | M1 | New `domain_modules` rows (new entities); module naming and entity 187 identity are Bucket 2 #B2-1 / #B2-4 user picks. |
| B1-S2 | M5 | Lifecycle state module attribution; cascades from B1-S1. |
| B1-S3 | M7 | Single-master invariant post-modularization; cascades from B1-S1. |
| B1-S4 | F1 | Retire legacy skill 118 and author 2 new system skills; new entities, cascades from B1-S1. |
| B1-S5 | A4 | `catalog_tagline` / `catalog_description`; Rule #20 buyer-voice draft, surface to user BEFORE writing. |
| B1-S6 | B2 | Recorded pass; no action. |
| B1-S7 | B3 | Rule #9 naming arbitration on `rate_cards`; user picks canonical-bare-word vs prefix vs abort. |
| B1-S8 | B4 | Pattern flag flips on 5 masters; explicit "user confirms" surface (Bucket 2 #B2-3). |
| B1-S9 | B6 | Semantically-suspect relationship rows on entity 187; gated on Bucket 2 #B2-1. |
| B1-S10 | B7 | Recorded pass; no action. |
| B1-S11 | B9 | INSERT 2 new `handoffs` rows for `rate_card.published`; new entities, not in technical-scope. |
| B1-S12 | B9b | Intra-domain handoffs; gated on B1-S1. |
| B1-S13 | B10b | PATCH `handoffs.source_domain_module_id` for 7 rows; NOT derivable from existing modules (VMS has zero modules); cascades from B1-S1. |
| B1-S14 | B11 | Recorded pass; no action. |
| B1-S15 | B12 | Lifecycle states and workflow-gate permissions; new entities, gated on B1-S1. |
| B1-S16 | E1 | Roles, role_modules, role_permissions; new entities, gated on B1-S1. |
| B1-B1 | boundary | Cross-domain DOR mirrors; gated on Bucket 2 #B2-1. |
| B1-B2 | boundary | INSERT `data_object_relationships` `contingent_workers converts_to employees`; target=employees (id=31), NOT a Rule #10 user-edge (Rule #10 covers edges to `kind='platform_builtin'` rows only); verb selection is judgment. |

### Result

JWT errors: none. Loader exit 0. UI: https://tests.semantius.app/domain_map/handoff_processes

The 16 deferred items remain on the audit; none are silently absorbed. Headline counts:
- Applied: 1 item (6 rows in `handoff_processes`).
- Deferred to user: 16 items (gated on Bucket 2 / Rule #20 / new entities / cascades from B1-S1).

## 2026-05-31, Audit

### Summary

- Current footprint: domain id 64, **0 `domain_modules` rows** (M1 hard fail persists), 6 master `data_objects` (`contingent_workers` 186, `pm_work_orders` 187, `staffing_suppliers` 188, `rate_cards` 189, `contingent_timesheets` 190, `contingent_invoices` 191) on the legacy `domain_data_objects` rollup only, 5 capabilities (WORKER-REQ, STAFFING-SUPPLIER, RATE-MGMT, CONTINGENT-TIME, WORKER-CLASS), 7 solutions (Workday VNDLY primary, SAP Fieldglass primary, Beeline primary, Magnit primary, Utmost primary, KellyOCG Helix UX primary, Deel secondary), 3 regulations (IR35, California AB5, EU Platform Work Directive, all `mandatory`), 8 trigger events, 7 outbound handoffs (all `source_domain_module_id IS NULL`), 0 inbound handoffs, 12 data_object_aliases, 0 lifecycle states, 1 legacy domain-level system skill (`vms-system`, id 118) with 8 `skill_tools` rows, 0 roles authored against `business_function_id=68` (Indirect Procurement).
- **What changed since 2026-05-30:** Handoff 117 (VMS to S2P on `pm_work_order.invoiced`) is now APQC-tagged via `handoff_processes.id=797` (process 315, "Process accounts payable (AP)", PCF 10756, `agent_curated`/`new`). All 7 outbound VMS handoffs are now `agent_curated`-tagged (rows 656, 657, 658, 659, 660, 661, 797). The audit's prior conditional-tag gate on B2-1 has been overridden in catalog without B2-1 resolved; this is itself a finding (the tag presumes entity 187 resolves as SOW, which still requires the Bucket 2 #B2-1 call).
- **Otherwise unchanged from 2026-05-30:** zero modules, zero lifecycle states, zero VMS roles, legacy skill, empty `catalog_tagline` / `catalog_description`, suspect `pm_work_orders` identity, 6 trigger events with empty `event_category`.
- **Bucket 1 (in-scope, agent fixable):** 16 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 3 items.

### Vendor surface basis

Same enumeration as 2026-05-30 (Workday VNDLY, SAP Fieldglass, Beeline, Magnit, Utmost flagship pure-plays; KellyOCG Helix UX MSP-aligned; Deel adjacent contractor-payment). All 7 already loaded as `solution_domains`. No additional flagship vendors warrant inclusion at this pass.

### Pass 1, Structural findings

#### A band

| ID | Band | Finding |
|---|---|---|
| A1 | pass | `domain_code=VMS`, `domain_name=Vendor Management System` populated; `crud_percentage=92`, `min_org_size=30 m <2500`, `cost_band=$$$`, `usa_market_size_usd_m=1800`, `market_size_source_year=2025`, `certification_required=false`. |
| A2 | pass | 5 capabilities via `capability_domains`. |
| A3 | pass | 7 solutions via `solution_domains` (6 primary + 1 secondary). |
| A4 | fail | `catalog_tagline=""` and `catalog_description=""`. Rule #20 requires both, drafted in buyer voice with explicit user approval. Carries to Bucket 1 #B1-A4. |
| A5 | partial | `business_logic=""` but `crud_percentage=92` (<95), so Rule #8 requires non-empty `business_logic`. Carries to Bucket 1 #B1-A5. |

#### M band (HARD FAIL persists)

| ID | Band | Finding |
|---|---|---|
| M1 | hard fail | 0 `domain_modules` rows. Rule #14 floor: >=1 `module_kind='full'` per domain. With 5 capabilities (Rule #14 second clause), VMS needs >=2 full modules. Carries to Bucket 1 #B1-M1, but the module split is gated on Bucket 2 #B2-1 (`pm_work_orders` identity) and #B2-4 (module naming). |
| M2 | n/a | Vacuous: no modules to evaluate. |
| M4 | fail | `domain_module_data_objects` empty (everything sits on the legacy `domain_data_objects` rollup). Cascades from M1. |
| M5 | fail | Every workflow-bearing lifecycle state will need `domain_module_id`; today there are no states authored anywhere on the 6 masters. Cascades from M1 + B12. |
| M6 | fail | No `domain_module_host_domains` rows; cross-cutting nominally none, but cannot evaluate without modules. |
| M7 | n/a | Vacuous: no modules to verify single-master invariant. |

#### B band

| ID | Band | Finding |
|---|---|---|
| B5 | fail | 6 of 8 `trigger_events` carry `event_category=""`: ids 595 (`staffing_supplier.activated`), 596 (`rate_card.published`), 597 (`contingent_timesheet.approved`), 598 (`contingent_timesheet.rejected`), 599 (`contingent_invoice.received`), 600 (`contingent_invoice.matched`). All 6 are `state_change` per the SKILL.md enum (lifecycle / state_change / threshold / signal); each is a master transitioning. Carries to Bucket 1 #B1-B5. ids 146 (`pm_work_order.invoiced`, `state_change`) and 147 (`worker.tenure_threshold`, `threshold`) are correctly populated. |
| B7 | pass | All 6 masters have at least one `users` (data_object 748, `kind='platform_builtin'`) edge: sponsors+manages on 186, owns on 188, dispatches on 187, approves on 189, approves on 190, approves on 191. Rule #10 satisfied. |
| B9 | fail | `rate_card.published` (event 596) has zero `handoffs` rows downstream. Event description implies a PSA-side bill-rate refresh and an ERP-FIN-side cost accrual; 2 outbound handoffs missing. Carries to Bucket 1 #B1-B9. |
| B9b | n/a | Intra-domain handoffs cannot be evaluated, VMS has 0 modules. Re-derive after M1 lands. Carries to Bucket 1 #B1-B9b (deferred until B1-M1). |
| B10b | fail | All 7 outbound handoffs (117, 118, 587, 588, 589, 590, 591) have `source_domain_module_id IS NULL` because VMS has no modules. Sub-case 1: upstream M1 gap. Backfill after B1-M1 lands. Carries to Bucket 1 #B1-B10b. |
| B11 | pass | 12 aliases across 6 masters (3 / 2 / 2 / 2 / 2 / 1). Pass. |
| B12 | fail | 0 lifecycle states on any of the 6 masters. Each master is workflow-bearing (none qualifies for the config-shape exemption). Lifecycle states author after B1-M1 because `domain_module_id` is required. Carries to Bucket 1 #B1-B12. |

#### C band

3 `business_function_domains` rows: Indirect Procurement (BF 68) `owner`; Procurement (BF 19) `contributor`; Human Resources (BF 3) `contributor`. Pass.

#### D band

Not applicable, no `parent_domain_id`. Pass.

#### E band

| ID | Band | Finding |
|---|---|---|
| E1 | vacuous fail | 0 rows in `roles` with `business_function_id=68` (Indirect Procurement). Three VMS-specific roles need authoring after B1-M1 (program manager, supplier manager, contingent-labor coordinator). Carries to Bucket 1 #B1-E1, gated on B1-M1. |
| E2 | vacuous fail | 0 `role_modules` rows touching any (zero) VMS module. Plus the HIRING-MANAGER (role 10007) cross-functional binding to VMS-WORKER-SOURCING (secondary) is not yet PATCHED in; HIRING-MANAGER's 6 existing role_module rows cover ATS, ONB only. Carries to Bucket 1 #B1-E2, gated on B1-M1. |
| E3 | n/a | 0 `role_permissions` rows; vacuous. Gated on B1-M1 + B1-E1. |
| E4 | n/a | Vacuous. |
| E5 | n/a | Vacuous. |

#### F band

| ID | Band | Finding |
|---|---|---|
| F1 | fail | Legacy `skills.id=118` (`vms-system`, kebab-cased, `domain_module_id=NULL`) persists. Rule #17 requires one `skill_type='system'` per `domain_modules` row. After modularization, retire skill 118 and author 2 module-scoped system skills. Carries to Bucket 1 #B1-F1, gated on B1-M1. |
| F2 | n/a | Vacuous: 0 modules. After B1-M1, each new module needs exactly one system skill. |
| F3 | partial | Legacy skill 118 has 8 `skill_tools` rows: 6 query tools (one per master, `query_contingent_workers`, `query_work_orders`, `query_staffing_suppliers`, `query_rate_cards`, `query_contingent_timesheets`, `query_contingent_invoices`), `send_email` (side_effect), `sign_document` (side_effect). Post-modularization, redistribute across the 2 new system skills (6 queries by their `data_object_id`; `send_email` + `sign_document` on the worker-sourcing skill, `send_email` on the time-invoicing skill). Carries to Bucket 1 #B1-F3, gated on B1-M1 + B1-F1. |
| F4 | pass | All 8 `skill_tools` rows comply with the `operation_kind` invariant (Rule #17): `query` requires `data_object_id` (6 satisfy), `side_effect` requires `data_object_id=NULL` (2 satisfy). |
| F5 | uncomputable | Semantius score per module is uncomputable without modules. Recovers after B1-M1 + B1-F1. |

#### H band, APQC tagging

All 7 outbound handoffs are now `agent_curated`-tagged via `handoff_processes` (rows 656, 657, 658, 659, 660, 661, 797). None at `record_status='approved'`. Catalog quality headline: 0 approved. Process health: 7 agent_curated. No deferrals.

| handoff_id | source → target | trigger_event | payload | PCF tag | tag row | confidence |
|---|---|---|---|---|---|---|
| 117 | VMS → S2P | pm_work_order.invoiced | contingent_invoices | Process accounts payable (AP), 10756 | 797 | confident L3 (presumes entity 187 resolves to SOW; if PM, this tag and the handoff are mis-modeled) |
| 118 | VMS → HCM | worker.tenure_threshold | contingent_workers | Manage new hire/re-hire, 10443 | 656 | confident L3 |
| 587 | VMS → PSA | contingent_timesheet.approved | contingent_timesheets | Track workforce utilization, 10392 | 657 | confident L4 |
| 588 | VMS → AP-AUTO | contingent_invoice.received | contingent_invoices | Process accounts payable (AP), 10756 | 658 | confident L3 |
| 589 | VMS → ERP-FIN | contingent_invoice.matched | contingent_invoices | Process accounts payable (AP), 10756 | 659 | confident L3 |
| 590 | VMS → PAYROLL | contingent_timesheet.approved | contingent_timesheets | Enter employee time worked into payroll system, 10858 | 660 | confident L4 |
| 591 | VMS → SUP-LIFE | staffing_supplier.activated | staffing_suppliers | Manage suppliers, 10280 | 661 | confident L3 |

Bucket 1 item #B1-H1 is closed (was applied in the 2026-05-31 continuation). Surfaced here only for completeness; no new H-band action items in this audit.

### Pass 2, Market audit (semantic)

No fresh subagent spawn (this audit IS the structural Validate). Market diff from 2026-05-30 unchanged; vendor surface union still implies 3 MISSING candidates (`candidate_submissions`, `worker_assignments`, `worker_classifications`), routed to Bucket 3 below. WRONG-OWNERSHIP gated on Bucket 2 #B2-1. SCOPE-CREEP: none confirmed.

### Pass 3, Neighbor discovery

Edge weights unchanged from 2026-05-30: HCM, S2P, PSA, AP-AUTO, ERP-FIN, PAYROLL, SUP-LIFE all at weight 1, except PSA at weight 2 (PSA-TIME-EXPENSE consumes `contingent_timesheets`). No edge weight >= 3, Pass 4 vacuous.

### Pass 4, Pairwise reconciliation

Vacuous (no neighbor at edge weight >= 3).

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL (M / A / B / E / F bands)

| ID | Band | Finding | Fix surface |
|---|---|---|---|
| B1-M1 | M1 | VMS has 0 `domain_modules`. Need >=2 (Rule #14 second clause, 5 capabilities). Module names + entity 187 identity gated on Bucket 2 #B2-1 + #B2-4. | Phase A loader after Bucket 2 resolution: INSERT 2 `domain_modules`, 5 `domain_module_capabilities`, 6 `domain_module_data_objects` master rows distributing the masters. |
| B1-A4 | A4 | `catalog_tagline=""`, `catalog_description=""`. Rule #20 violation. | Draft in buyer voice, surface to user BEFORE PATCH (Rule #20, no `catalog_tagline` / `catalog_description` without approval). Carries to Bucket 2 #B2-2 for the user-approved wording. |
| B1-A5 | A5 | `business_logic=""` with `crud_percentage=92` (<95). Rule #8 requires non-empty `business_logic` whenever `crud_percentage < 95`. | Draft 1-2 sentences naming the non-JsonLogic slice (e.g., rate-card refresh recomputes accrued cost across active timesheets; classification engine cross-applies IR35 / AB5 / EU PWD precedence rules). Carries to Bucket 2 #B2-5. |
| B1-B5 | B5 | 6 trigger events with empty `event_category`: 595, 596, 597, 598, 599, 600. All 6 are `state_change`. | Direct PATCH on each row, `event_category='state_change'`. Safe, deterministic, no gating. |
| B1-B9 | B9 | `rate_card.published` (event 596) has no `handoffs` rows. PSA + ERP-FIN subscribers are implied by the rate-card refresh cycle. | INSERT 2 `handoffs` rows after B1-M1 lands (so `source_domain_module_id` is populatable): VMS to PSA on `rate_cards` (`integration_pattern: batch_sync`), VMS to ERP-FIN on `rate_cards` (`integration_pattern: batch_sync`). |
| B1-B9b | B9b | Intra-domain progression `staffing_supplier.activated -> rate_card.published -> contingent_timesheet.approved -> contingent_invoice.received -> contingent_invoice.matched` likely crosses the WORKER-SOURCING to TIME-INVOICING module boundary on `contingent_timesheet.approved`. | Re-derive after B1-M1 lands; INSERT intra-domain `handoffs` rows with `integration_pattern: lifecycle_progression`. Cascades from B1-M1. |
| B1-B10b | B10b | 7 outbound handoffs (117, 118, 587, 588, 589, 590, 591) have `source_domain_module_id IS NULL`. Sub-case 1 (upstream M1 gap). | Backfill loader after B1-M1; PATCH each row with the module that masters the trigger event's `data_object_id`. |
| B1-B12 | B12 | 0 lifecycle states on the 6 masters. None qualify for the config-shape exemption. | Phase B loader after B1-M1: INSERT states per master, `requires_permission=true` on workflow gates (approve, activate, publish, dispute). Cascades from B1-M1. Lifecycle authoring for entity 187 specifically gated on Bucket 2 #B2-1. |
| B1-E1 | E1 | 0 roles with `business_function_id=68`. Need >=3 VMS-specific roles (program manager, supplier manager, contingent-labor coordinator). | Phase E loader after B1-M1 + B1-E2. Cascades from B1-M1. |
| B1-E2 | E2 | 0 `role_modules` covering VMS modules. HIRING-MANAGER (role 10007) needs a secondary binding on VMS-WORKER-SOURCING. | Phase E loader after B1-M1; PATCH role_modules for role 10007 + new VMS roles. Cascades from B1-M1 + B1-E1. |
| B1-F1 | F1 | Legacy skill 118 (`vms-system`, kebab, `domain_module_id=NULL`). Rule #17 requires one system skill per module. | After B1-M1: INSERT 2 new `skills` rows (one per module), redistribute 8 existing `skill_tools` rows, DELETE skill 118. Cascades from B1-M1. |
| B1-F3 | F3 | 8 `skill_tools` on legacy skill 118 need redistribution across 2 new module-scoped system skills. | Part of the B1-F1 loader. |

#### BOUNDARY

| ID | Finding | Fix surface |
|---|---|---|
| B1-B1 | Outbound handoff 117 (VMS to S2P on `pm_work_order.invoiced`) has payload `contingent_invoices` but the trigger event's own `data_object_id=187`. Either the event's data_object_id is wrong (should be 191) or the handoff payload is wrong. Gated on Bucket 2 #B2-1 (entity 187 identity). | After B2-1 resolution: PATCH event 146 or handoff 117 to align. |
| B1-B2 | Handoff 118 (VMS to HCM on `worker.tenure_threshold`) has no `data_object_relationships` row from `contingent_workers (186)` to `employees (31)` in the forward conversion direction. Existing row 541 is `contingent_workers reviewed_against employees`, wrong direction. | INSERT one `data_object_relationships` row: `contingent_workers converts_to employees`, `is_required=false`, `owner_side=source`. Verb selection is judgment (Bucket 2 #B2-1's relationship cascade may inform). Not strictly gated; can ship standalone. |

#### APQC TAGGING

Closed. All 7 outbound handoffs have `agent_curated` `handoff_processes` rows. No new H-band items this audit. Catalog quality headline (approved count) remains 0; review pass would lift that.

### Bucket 1 sub-totals

| Finding type | Count |
|---|---|
| MISSING | 0 (gated on Bucket 2 #B2-1) |
| WRONG-OWNERSHIP | 0 (gated on Bucket 2 #B2-1) |
| SCOPE-CREEP | 0 (gated on Bucket 2 #B2-1) |
| STRUCTURAL | 12 (B1-M1, B1-A4, B1-A5, B1-B5, B1-B9, B1-B9b, B1-B10b, B1-B12, B1-E1, B1-E2, B1-F1, B1-F3) |
| BOUNDARY | 2 (B1-B1, B1-B2) |
| APQC TAGGING | 0 (closed in prior continuation) |
| MODULARIZATION | 0 (routes to Bucket 2 / cascades from B1-M1) |

**Headline: 14 Bucket 1 items** (excluding the 2 recorded-pass items B7 + B11). Counting recorded-pass items as audit items raises the surface count to 16.

### Bucket 2, Surface-for-user (judgment calls)

1. **B2-1: Entity 187 (`pm_work_orders`) identity, unresolved from 2026-05-30.** Name + labels say Preventive Maintenance, description + relationships + handoff routing say staffing requisition / SOW. Options:
   - **(a)** Rename + relabel + re-alias (description was right).
   - **(b)** Treat as Preventive Maintenance, remove from VMS, route to EAM, INSERT a fresh `staffing_requisitions` master.
   - **(c)** Split.
   Gates: B1-M1 (module-naming), B1-B1, B1-B9b, B1-B12 for entity 187 specifically, all Bucket 3 candidates. **Highest priority.**

2. **B2-2: `catalog_tagline` + `catalog_description` wording.** Drafts from the 2026-05-30 audit are awaiting user approval. Per Rule #20, no PATCH without explicit user-supplied wording. Tagline draft (for review): *"Source contingent workers through approved staffing suppliers, manage rate cards, and reconcile timesheets and invoices end-to-end."* Description draft (for review, 3 sentences): *"Manage the full contingent-workforce cycle, requisitions, supplier distribution, candidate submissions, worker assignments, timesheets, and invoices, in one system. Approve rate cards by role and region; classify each worker against IR35, California AB5, and EU Platform Work rules; and feed approved timesheets to payroll and project accounting automatically. Procurement and HR run it jointly: procurement governs the supplier panel, HR governs the worker classification."*

3. **B2-3: Pattern flags on the 6 masters.** Each is one yes/no:
   - (i) `contingent_workers.has_personal_content=true` (PII: SSN, tax classification, IR35 status)?
   - (ii) `staffing_suppliers.has_single_approver=true` (procurement approves activation)?
   - (iii) `rate_cards.has_single_approver=true` (procurement or finance signs off)?
   - (iv) entity 187 `has_single_approver=true` (hiring manager approves), gated on B2-1?
   - (v) `contingent_invoices.has_single_approver=true` (AP approves payment)?
   No `notes` writes for any of these (Rule #15).

4. **B2-4: Module naming.** Proposed `VMS-WORKER-SOURCING` and `VMS-TIME-INVOICING`. Alternates: `VMS-SOURCING-PIPELINE` + `VMS-TIME-INVOICE`; three-module split (`VMS-REQUISITIONS`, `VMS-SUPPLIERS-RATES`, `VMS-TIME-INVOICING`). Gated on B2-1.

5. **B2-5 (new): `business_logic` wording.** Per Rule #8 and B1-A5, `business_logic` field on the domains row needs 1-2 sentences naming the non-JsonLogic slice. Draft (for review): *"Rate-card refresh recomputes accrued cost across all active timesheets when a rate row supersedes; worker-classification engine applies IR35 / California AB5 / EU PWD precedence rules per engagement, producing a typed classification record that downstream payroll and AP-AUTO rely on for withholding rules."* Authoritative wording is the user's call.

### Bucket 3, Phase 0 pending (speculative)

| Candidate | Proposed module (post B1-M1) | Vendor evidence | Rationale |
|---|---|---|---|
| `candidate_submissions` | VMS-WORKER-SOURCING | Universal: Workday VNDLY, SAP Fieldglass, Beeline, Magnit, Utmost | Suppliers slate candidates against a requisition; carries scoring, hide-from-hiring-manager flags, withdrawal reasons. |
| `worker_assignments` | VMS-WORKER-SOURCING | Universal in the same five vendors | 1:1 with a winning candidate; carries start / end / billable rate / project / WBS / location; separate from `contingent_workers` because a worker can re-engage on multiple assignments. |
| `worker_classifications` | VMS-WORKER-SOURCING (or VMS-CLASSIFICATION-COMPLIANCE) | Mandatory under WORKER-CLASS capability + 3 loaded regulations | Typed IR35 / AB5 / EU PWD determination per worker per engagement. SAP Fieldglass and Magnit ship explicit classification engines; Workday VNDLY uses integration partners. |

User picks (a) vetted route (formal Phase 0 also checks `interview_slots` and `supplier_score_cards`) or (b) eyeball-mode (promote ringing candidates to Bucket 1 immediately).

### Cross-bucket dependencies

- **Bucket 2 #B2-1 gates** B1-M1 (module naming), B1-B1 (handoff 117 payload coherence), B1-B9b (intra-domain crossings), B1-B12 (lifecycle authoring on entity 187), all Bucket 3 candidates.
- **Bucket 2 #B2-2, #B2-3, #B2-5 are independent** of B2-1.
- **Bucket 2 #B2-4 (module naming)** depends on B2-1.
- **Bucket 3** is independent of B2-2 / B2-3 / B2-5 but inter-dependent within itself (`candidate_submissions` upstream of `worker_assignments`).
- **B1-B5 (event_category PATCH)** is independent of B1-M1 and B2-1; can ship standalone.
- **B1-B2 (forward conversion DOR)** is independent of B1-M1; verb selection touches B2-1 in spirit but not strictly gated.

### Per-bucket prompts

- **After Bucket 1:** *"14 actionable Bucket 1 items. B1-B5 (6 event_category PATCHes) and B1-B2 (1 DOR row) can ship standalone today. The other 12 are gated on B1-M1, which is itself gated on Bucket 2 #B2-1 + #B2-4. Approve the standalone fixes now? Reply 'standalone', 'all on hold', or per-item."*
- **After Bucket 2:** *"5 judgment calls. B2-1 is highest priority, it gates the whole M-band cascade. B2-2 / B2-3 / B2-5 can be answered independently. I'll wait for B2-1 before sequencing anything M-dependent."*
- **After Bucket 3:** *"Vet via Phase 0, or eyeball-mode? If eyeball, the 3 candidates become Bucket 1 items in the next pass."*

### Report-only follow-ups (owed by other domains)

- **HCM B8:** Forward conversion relationship `employees converted_from contingent_workers` is HCM's mirror of B1-B2.
- **S2P B10:** Handoff 117 lacks a S2P consumer DMDO row on `contingent_invoices` (191). Gated on B2-1.
- **AP-AUTO B10:** Handoff 588 lacks an AP-AUTO consumer DMDO row on `contingent_invoices`.
- **ERP-FIN B10:** Handoff 589 lacks an ERP-FIN consumer DMDO row on `contingent_invoices`.
- **PAYROLL B10:** Handoff 590 lacks a PAYROLL consumer DMDO row on `contingent_timesheets`.
- **SUP-LIFE B10:** Handoff 591 lacks a SUP-LIFE consumer DMDO row on `staffing_suppliers`. SUP-LIFE may keep its own `suppliers` master and cross-reference via `embedded_master`; resolution is SUP-LIFE's call.

### Notes on the audit run

- JWT errors: none.
- No writes performed in this audit (Validate only).
- No `record_status='approved'` flips; no `notes` writes (Rules #1 / #15).
- Rule #9 collision check on `rate_cards`: 0 collisions (substring matches `corporate_cards` / `corporate_card_accounts` are semantically distinct; no bare-word `rate_card` exists). `rate_cards` is prefix-free already, optionally claim canonical (judgment for the user; not surfaced as a Bucket 2 because the catalog impact is cosmetic).
- The em-dash review was performed in-memory against the draft text before writing; no U+2014 characters appear in this section.

## 2026-06-02 Audit (modularization)

### Summary

Built the VMS module set: VMS had 0 `domain_modules` (M1 hard fail since 2026-05-30). Created **2 `full` modules** and wired the existing entities. Scope was modules + entity assignment only: no new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships were created. Loader: [.tmp_deploy/modularize_vms_2026-06-02.ts](../../.tmp_deploy/modularize_vms_2026-06-02.ts), idempotent, run twice (clean re-run, zero duplicate inserts).

VMS confirmed from `domains.description`: Vendor Management System for the contingent workforce: contingent-worker sourcing, staffing-supplier management, rate cards, contingent timesheets, and worker-classification compliance. Run jointly by procurement and HR. Not a generic supplier-master or SRM domain.

### Modules created

| id | code | name | capabilities | masters |
|---|---|---|---|---|
| 315 | VMS-WORKER-SOURCING | Worker Sourcing and Supplier Management | WORKER-REQ (54), STAFFING-SUPPLIER (55), RATE-MGMT (56), WORKER-CLASS (58) | pm_work_orders (187), staffing_suppliers (188), rate_cards (189), contingent_workers (186) |
| 316 | VMS-TIME-INVOICING | Contingent Time and Invoicing | CONTINGENT-TIME (57) | contingent_timesheets (190), contingent_invoices (191) |

VMS-TIME-INVOICING additionally consumes contingent_workers (186, whose hours) and rate_cards (189, bill-rate basis) as `consumer`/`required` non-master rows.

This is the 2-way split proposed as B1B-M1 / B2-4-default in the 2026-05-31 audit. The module boundary follows the natural process seam: sourcing produces the requisition, supplier panel, rate card, and worker record; time-invoicing executes against them and reconciles billing.

### Catalog-wide master pre-check (mandatory)

Queried `/domain_module_data_objects?data_object_id=in.(186,187,188,189,190,191)&role=eq.master` before any write. **Empty result**: none of the 6 VMS masters is mastered in any module anywhere in the catalog. All 6 were assigned `master` here, each in exactly one VMS module (M7 single-master satisfied in-domain AND catalog-wide). **No demotions to embedded_master were required.**

### Verification (live, post-load)

- Every capability placed in >=1 module: 54, 55, 56, 57, 58 all present (M4 pass).
- Each module has >=1 capability (M6) and >=1 data_object (no empty module).
- Each of the 6 masters mastered exactly once, in-domain and catalog-wide.
- Rule #14: 5 capabilities (>=3) -> 2 `full` modules (satisfies both clauses).
- All inserts omit `record_status` (R1); all DMDO/DMC rows omit `notes` (R15); module descriptions carry no vendor/product names (R18); no em-dashes.

### pm_work_orders (187) caveat carried forward

Entity 187 is named `pm_work_orders` / "Preventive Maintenance Work Order" but its description and every attached workflow treat it as the staffing requisition / SOW. It was placed as a `master` in VMS-WORKER-SOURCING consistent with its description and the contingent-labor workflow. The identity question (B2-1) and any rename are out of scope for this modularization pass and remain open for user judgment. If B2-1 resolves to route the entity to EAM (options b/c), this master assignment moves with the replacement `staffing_requisitions` entity.

### Items resolved by this pass

- **B1A-BUILD** (unbuilt domain, 0 modules): resolved. 2 modules now exist.
- **B1B-M1** (insert 2 modules + 5 cap links + 6+ DMDO): resolved. Module names/codes used the default 2-way split (B2-4 default); placement of entity 187 followed its description without resolving B2-1. The 187 identity question stays open but no longer blocks the build.

### Items unblocked (now agent-actionable on the next pass)

The following 2026-05-31 b1b items were gated on B1B-M1 (prerequisite_entity) and are now executable, with `source_domain_module_id` resolvable from the new module ids (315 / 316):

- B1B-B9 (2 handoffs for rate_card.published), B1B-B9b (intra-domain progression handoffs across the 315/316 boundary), B1B-B10b (backfill source_domain_module_id on 7 outbound handoffs), B1B-B12 (lifecycle states + workflow-gate permissions on 6 masters), B1B-E1 (>=3 Indirect-Procurement roles), B1B-E2 (role_modules + HIRING-MANAGER secondary on 315), B1B-F1 (retire legacy skill 118, author 2 module-scoped system skills), B1B-F3 (redistribute 8 skill_tools).

These remain out of this pass's scope (modules + entity assignment only) but are recorded so the next audit picks them up. Several still also carry user-decision gates (B2-1 for 187 lifecycle states; B2-4 confirmation of the codes actually used).

### Notes on the run

- JWT errors: none.
- No `record_status` writes; no `notes` writes; no new entities/relationships/skills/handoffs.
- Module-to-master mapping written to `domain_module_data_objects` (module grain), not the deprecated `domain_data_objects` rollup. The legacy rollup still lists the 6 as domain-grain masters; it is a derived view and was not hand-edited.
