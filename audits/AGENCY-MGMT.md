---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 23
---

# AGENCY-MGMT, Audit History

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 0 `domain_modules` rows (Rule #14 M1 hard-fail, blocks every downstream band). 0 host-junction modules. 11 capabilities linked via `capability_domains` (8 AGENCY-MGMT-specific: AGENCY-MGMT-JOBS, AGENCY-MGMT-RETAINER, AGENCY-MGMT-MEDIA-BUY, AGENCY-MGMT-ESTIMATE, AGENCY-MGMT-MARKUP, AGENCY-MGMT-PROFITABILITY, CREATIVE-REVIEW; plus 4 shared: TIME-TRACKING, RATE-MGMT, RESOURCE-PLAN, BILLING-PROJ). 8 masters loaded via `domain_data_objects` (`agency_jobs`, `agency_time_entries`, `agency_retainers`, `media_plans`, `insertion_orders`, `creative_briefs`, `creative_deliverables`, `agency_estimates`), all `role=master, necessity=required, kind=domain_owned`. 5 consumers (`customers`, `employees`, `legal_contracts`, `crm_opportunities`, `suppliers`). 0 lifecycle states across all 8 masters (Rule #12 universal violation, cascade from M1). 0 pattern flags set anywhere (all 8 masters carry `has_personal_content=false, has_submit_lock=false, has_single_approver=false`). 0 aliases. 3 `data_object_relationships` involving AGENCY-MGMT masters (employees feeds agency_time_entries; legal_contracts seeds agency_jobs; creative_deliverables registers_as digital_assets). 11 `trigger_events` published from the 8 masters; 5 of 11 (45%) carry empty `event_category`. 8 outbound + 4 inbound = 12 cross-domain handoffs. 10 solutions linked (4 primary: Workamajig Platinum, Deltek WorkBook, Advantage, Function Point; 3 secondary: Mediaocean Spectra/Prisma, Scoro, Aprimo; 3 partial: ProWorkflow, Magnetic, Forecast). 0 `domain_regulations`. 1 `skills` row with `skill_type='system'` (id 26 `agency-mgmt-system`) but `domain_module_id IS NULL` (Rule #17 detached system skill, cannot link to a module that does not exist). 3 of 12 cross-domain handoffs carry `handoff_processes` rows (handoff 343 to CLM, 342 from CLM, 348 from HCM); 2 are `proposal_source='agent_curated'` and 1 is `discovery_override`; zero `record_status='approved'`.

- **Vendor-surface basis (Pass 2 flagship enumeration):** Function Point, Workamajig Platinum, Deltek WorkBook, Advantage, Synergist, Scoro, Productive.io, Streamtime, FunctionFox, Magnetic, Forecast.app, Aprimo Marketing Productivity, ProWorkflow, BigTime for Agencies, Avaza, plus the media-buying specialist Mediaocean Spectra/Prisma (already linked secondary), and the agency-positioned configurations of Workfront and Wrike. Compliance-specialist surface: none distinctly required for the agency-management market itself (ASC 606 revenue recognition is the primary anchor for project-based revenue, plus 4A's MSA standards as a soft anchor for media buying). Creative-proofing specialists (Ziflow, Filestage, Approval Studio, GoVisually) addressed as a candidate adjacent market.

- **Bucket 1 (in-scope, agent fixable):** 8 items (1 STRUCTURAL gate (M1) + 1 STRUCTURAL (B9 event_category) + 1 STRUCTURAL (F2 detached system skill) + 1 STRUCTURAL (F3 zero skill_tools) + 1 BOUNDARY (B10b/B8 universal cascade) + 1 APQC TAGGING (H1) + 2 STRUCTURAL (B-band lifecycle states + pattern flags re-evaluate)).
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 9 items (5 entity / capability candidates + 1 modularization choice + 3 domain candidates queued).

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO + cross-domain relationships, ranked by edge weight):

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| ERP-FIN | 3 | 0 | 0 | 0 | 3 | Pairwise (full) |
| CLM | 1 | 1 | 1 (consumer on `legal_contracts`) | 1 (legal_contracts seeds agency_jobs) | 4 | Pairwise (full) |
| CRM | 1 | 1 | 1 (consumer on `crm_opportunities`) | 0 | 3 | Pairwise (full) |
| PSA | 2 | 0 | 0 | 0 | 2 | Lightweight |
| DAM | 1 | 0 | 0 | 1 (creative_deliverables registers_as digital_assets) | 2 | Lightweight |
| HCM | 0 | 1 | 1 (consumer on `employees`) | 1 (employees feeds agency_time_entries) | 3 | Pairwise (full) |
| S2P | 0 | 1 | 1 (consumer on `suppliers`) | 0 | 2 | Lightweight |

**Structural pass bands (cascade-fail rollup):**

- **M1 hard-fail (catastrophic).** Zero `domain_modules` rows. Per Rule #14 every domain MUST have ≥1 `module_kind='full'` row; a domain with ≥3 capabilities (AGENCY-MGMT has 11) MUST have ≥2 full modules. AGENCY-MGMT has neither. This blocks M2-M7, B1-B12 partial, C1-C2, E1-E6, F1-F5 from yielding any positive check because there is no module surface to evaluate against.
- **B9 partial-fail.** 5 of 11 trigger_events carry empty `event_category` (must be one of `lifecycle / state_change / threshold / signal`): 525 `agency_time_entry.submitted`, 526 `agency_retainer.threshold_reached`, 527 `agency_retainer.depleted`, 528 `media_plan.approved`, 529 `media_plan.executed`, 530 `creative_brief.approved`. (Recount: 6 events with empty category, not 5; correcting.) The other 5 events (338, 339, 340, 341, 342) carry valid categories.
- **B-band lifecycle states.** Zero `data_object_lifecycle_states` rows for any of the 8 masters. Per Rule #12, every `master + required` data_object MUST carry lifecycle states OR be a config-shape exemption surfaced for user approval. None of the 8 masters here is config-shape (agency_jobs has a clear lifecycle: estimated → active → delivered → invoiced → closed; insertion_orders flow draft → approved → placed → reconciled; agency_estimates flow draft → submitted → approved / declined; creative_deliverables flow drafted → in_review → revisions_requested → approved). All 8 need lifecycle modeling. Cannot proceed until M1 is resolved (lifecycle states pin to the realizing module).
- **B4 pattern-flag positive re-evaluation.** All 8 masters carry every flag at `false`. Almost certainly wrong: `creative_deliverables` and `creative_briefs` carry creative IP and proprietary positioning (probably `has_submit_lock=true`); `agency_estimates` once sent to the client should lock (probably `has_submit_lock=true`); `insertion_orders` once issued lock (`has_submit_lock=true`); `agency_time_entries` once submitted are payroll-grade evidence and lock (`has_submit_lock=true`). None looks like it carries personal content per se (the data is commercial work product, not employee personal data). The single-approver flag is plausible for `agency_estimates` (one account director sign-off) and `insertion_orders` (one media director sign-off).
- **B9b.** Cannot evaluate (zero modules means zero intra-domain cross-module handoffs possible by construction).
- **B10b cascade.** All 8 outbound handoffs carry NULL `source_domain_module_id` and all 4 inbound carry NULL `target_domain_module_id` because AGENCY-MGMT has no module surface to point at. These are not B10b defects per se; they are M1 cascade. Once modules exist, every handoff will need PATCH to point at the realizing module. The fix surface is M1 first, then the cascade backfill.
- **F2 hard-fail.** The single `skills` row (id 26 `agency-mgmt-system`, `skill_type='system'`) has `domain_module_id IS NULL`. Per Rule #17 every `domain_modules` row carries exactly one `system` skill, and AGENCY-MGMT has neither modules nor a module-attached skill. The skill exists as a detached artifact; on M1 resolution it must be pointed at one of the new modules (or split if the system surface decomposes per module).
- **F3 hard-fail.** No `skill_tools` rows exist for the detached system skill (`/skill_tools?skill_id=eq.26` returns empty, inferred; not directly queried, but no Phase F load can have run without a module to anchor it).
- **F5 rollup.** Semantius score is uncomputable for AGENCY-MGMT (no modules ⇒ no per-module score, no domain rollup).
- **H1 partial.** 3 of 12 cross-domain handoffs tagged (25%): handoff 343 ↔ process 148 ("Manage customers and accounts" L3, `agent_curated`); handoff 342 ↔ process 32 ("Manage and Operate Service Delivery System" L2, `agent_curated`); handoff 348 ↔ process 41 ("Manage employee onboarding, training, and development" L2, `discovery_override`). Zero `record_status='approved'`. Volume expectation per SKILL: 0.5N to 0.8N for N=12 → 6 to 10 `agent_curated` tags total, of which 2 are already in place; this audit proposes 7 more to bring coverage to 9 of 12 (75%), plus reviewing the existing `discovery_override` row on handoff 348.

AGENCY-MGMT Semantius score (strict): **uncomputable** (M1 cascade).

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 hard fail, catastrophic** | Zero `domain_modules` rows on AGENCY-MGMT (id 153). Per Rule #14 the domain MUST have ≥1 `module_kind='full'` row; with 11 capabilities and 8 masters, it MUST have ≥2 full modules. Every downstream band cascades from this. The 8 already-loaded masters cannot be associated with a realizing module; the detached system skill (id 26) cannot anchor; cross-domain handoffs cannot pin to a realizing module on the AGENCY-MGMT side. Phase A was completed without Phase M; this is the same gap pattern called out in references/skill-changelog.md for ERP-FIN / GRC / AUDIT / EPM / S2P. The fix surface is a Phase M load that introduces the module skeleton, populates `domain_module_data_objects` from the existing `domain_data_objects` (migrating master / consumer rows), and attaches the system skill (id 26) to one of the new modules. A natural module split anchored on the capability map: **AGENCY-MGMT-JOB-TRAFFIC** (jobs, time entries, estimates, profitability), **AGENCY-MGMT-MEDIA-BUY** (media plans, insertion orders), and **AGENCY-MGMT-CREATIVE-OPS** (creative briefs, creative deliverables, proofing). Surface the proposed split as B2-S1 for user approval before any Phase M load; the agent cannot pick the boundary unilaterally because the module count drives every downstream load. | Phase M loader after B2-S1 decision: insert 2 or 3 `domain_modules` rows (`module_kind='full'`); INSERT `domain_module_data_objects` rows mirroring the existing `domain_data_objects` rollup with `domain_module_id` pinned to the chosen module; PATCH `skills.id=26` to set `domain_module_id`; cascade-PATCH the 12 handoffs' `source_domain_module_id` / `target_domain_module_id`. |
| B1-S2 | **B9 missing event_category** | 6 trigger_events carry empty `event_category` (Rule #13 enum must be one of `lifecycle / state_change / threshold / signal`): 525 `agency_time_entry.submitted`, 526 `agency_retainer.threshold_reached`, 527 `agency_retainer.depleted`, 528 `media_plan.approved`, 529 `media_plan.executed`, 530 `creative_brief.approved`. | PATCH: 525 → `state_change`; 526 → `threshold`; 527 → `threshold`; 528 → `state_change`; 529 → `state_change`; 530 → `state_change`. Independent of M1; can be applied immediately. |
| B1-S3 | **F2 hard-fail, detached system skill** | `skills.id=26` (`agency-mgmt-system`, `skill_type='system'`) carries `domain_module_id IS NULL`. Per Rule #17 every `domain_modules` row carries exactly one system skill. Currently there are zero modules and one detached skill. | Cannot fix independently; the skill needs a module to attach to (B1-S1). On B2-S1 module choice, PATCH skill 26 `domain_module_id` to the most workflow-central new module (most likely the JOB-TRAFFIC module). If the split yields 3 modules, decide whether to split the system skill into 3 (one per module per Rule #17) or attach the existing one to a single module and create 2 more system skills. The 3-module split with 3 system skills is the clean shape; surfaced as B2-S2. |
| B1-S4 | **F3 hard-fail, zero skill_tools** | The detached system skill (id 26) has zero `skill_tools` rows. Per Rule #17 every system skill ships with ≥1 tool. With no module surface, no Phase F load could have populated tools. | Cannot fix independently; gated on B1-S1 + B1-S3 resolution. On module creation, author the tools floor per module: `query_<entity>` + `mutate_<entity>` + `compute_<entity>` for each module's masters. Recommended floor counts: JOB-TRAFFIC roughly 8-12 tools (agency_jobs, agency_time_entries, agency_estimates each get query + mutate); MEDIA-BUY roughly 6-8 tools (media_plans, insertion_orders); CREATIVE-OPS roughly 6-8 tools (creative_briefs, creative_deliverables, plus the proofing side_effect tools `request_review`, `record_approval`). |
| B1-S5 | **B-band lifecycle states for all 8 masters** | Zero `data_object_lifecycle_states` rows. Per Rule #12 every `master + required` data_object MUST carry lifecycle states. The 8 masters all have natural lifecycles; none plausibly qualifies for the config-shape exemption. Proposed shape per master: `agency_jobs` (draft 10, estimated 20, active 30, delivered 40, invoiced 50, closed 60, cancelled 90); `agency_estimates` (draft 10, submitted 20, approved 30, declined 40, superseded 90); `agency_time_entries` (draft 10, submitted 20, approved 30, billed 40, rejected 90); `agency_retainers` (active 10, threshold_warned 20, depleted 30, replenished 40, closed 90); `media_plans` (draft 10, approved 20, executed 30, reconciled 40, closed 60); `insertion_orders` (draft 10, issued 20, placed 30, reconciled 40, voided 90); `creative_briefs` (draft 10, in_review 20, approved 30, archived 90); `creative_deliverables` (drafted 10, in_review 20, revisions_requested 30, approved 40, delivered 50, archived 90). | Cannot insert until B1-S1 resolves (lifecycle states pin to realizing modules). After Phase M, Phase B (B-band) inserts roughly 35 lifecycle state rows total, plus the 8 corresponding workflow-gate permission rows materialized per Rule #14's per-module derivation. |
| B1-S6 | **B4 pattern-flag positive re-evaluation** | All 8 masters carry every pattern flag at `false`. Proposed re-evaluation: `agency_estimates.has_submit_lock=true` and `has_single_approver=true` (one account-director sign-off, locks after client sees it); `insertion_orders.has_submit_lock=true` and `has_single_approver=true` (one media-director sign-off, locks after vendor accepts); `agency_time_entries.has_submit_lock=true` (payroll evidence locks on submission); `media_plans.has_submit_lock=true` (locks after client approval); `creative_briefs.has_submit_lock=true` (locks on client approval); `creative_deliverables.has_submit_lock=true` (locks per round once client sees). None of the 8 plausibly carries personal data (`has_personal_content=false` is correct across the board, this is commercial work product). | PATCH 6 `data_objects` rows to set flags as above. Independent of M1; can be applied immediately. Per Rule #15, do NOT write `notes` justifying the flags; surface in chat if non-obvious. |
| B1-S7 | **Universal B10b/B8 cascade (BOUNDARY)** | All 12 cross-domain handoffs on AGENCY-MGMT have NULL `source_domain_module_id` (8 outbound) or NULL `target_domain_module_id` (4 inbound). This is not a per-handoff defect; it is a single M1 cascade. On B1-S1 resolution, every one of the 12 handoff rows needs a one-time PATCH to pin to the realizing module. Module-to-handoff mapping based on the chosen split: handoffs whose payload is `agency_jobs` (345 outbound, 342/341 inbound) → JOB-TRAFFIC module; handoff whose payload is `agency_time_entries` (513 outbound, 348 inbound) → JOB-TRAFFIC; handoff whose payload is `agency_estimates` (343 outbound) → JOB-TRAFFIC; handoff whose payload is `agency_retainers` (514 outbound) → JOB-TRAFFIC; handoff whose payload is `media_plans` (516 outbound) → MEDIA-BUY; handoff whose payload is `insertion_orders` (346 outbound, 347 inbound) → MEDIA-BUY; handoff whose payload is `creative_briefs` (515 outbound) → CREATIVE-OPS; handoff whose payload is `creative_deliverables` (344 outbound) → CREATIVE-OPS. | Cascade-PATCH 12 handoffs in the same Phase M load as B1-S1. |
| B1-H1 | **APQC TAGGING** | 3 of 12 cross-domain handoffs carry `handoff_processes` rows (handoffs 342, 343, 348); volume expectation per SKILL is 6 to 10 tags, so 4 to 7 additional `agent_curated` tags are owed. The existing tag on 348 is `discovery_override` (process 41 "Manage employee onboarding, training, and development" L2) which looks weak (the handoff is `employee.terminated` → terminating an agency time entry, not onboarding / training); flag for REPLACE review. Proposed tags below. | INSERT or REPLACE 8 `handoff_processes` rows per the proposal table; all rows `proposal_source='agent_curated'`, `record_status='new'`. |

#### APQC TAGGING proposals (B1-H1 detail)

The analyst's structural-pass model of each handoff produces the following PCF activity candidates. Several need a fresh `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry` lookup at fix time; the column lists the proposed name + a confidence hint.

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id | Confidence |
|---|---|---|---|---|---|---|
| 344 | AGENCY-MGMT → DAM | `deliverable.approved` | `creative_deliverables` | "Manage product marketing material" or child | 141 (L3) | confident L3 |
| 345 | AGENCY-MGMT → ERP-FIN | `agency_invoice.issued` | `agency_jobs` | "Invoice customer" | 302 (L3) | confident L3 |
| 346 | AGENCY-MGMT → ERP-FIN | `media_costs.posted` | `insertion_orders` | "Process accounts payable" or "Audit invoices and key data in AP system" child | 1433 (L4) | medium |
| 343 | AGENCY-MGMT → CLM | `estimate.approved` | `legal_contracts` | (existing `agent_curated` row at PCF 148 L3 "Manage customers and accounts" looks reasonable; KEEP) | 148 | confident L3 |
| 514 | AGENCY-MGMT → CRM | `agency_retainer.depleted` | `agency_retainers` | "Manage customer accounts" (within "Manage sales partners / accounts" cluster) | needs lookup | medium |
| 515 | AGENCY-MGMT → PSA | `creative_brief.approved` | `creative_briefs` | "Develop project plans" | 1661 (L4) | confident L4 |
| 516 | AGENCY-MGMT → ERP-FIN | `media_plan.executed` | `media_plans` | "Establish marketing budgets" or "Create marketing budget" | 134 (L3) or 647 (L4) | confident L3 |
| 513 | AGENCY-MGMT → PSA | `agency_time_entry.submitted` | `agency_time_entries` | "Report time" or "Collect and record employee time worked" | 312 (L3) or 1414 (L4) | confident L3 |
| 342 | CLM → AGENCY-MGMT | `legal_contract.signed` | `agency_jobs` | (existing `agent_curated` row at PCF 32 L2 "Manage and Operate Service Delivery System"; KEEP, L2 acceptable, downstream L3 child preferred at review time) | 32 | medium |
| 347 | S2P → AGENCY-MGMT | `vendor_invoice.received` | `insertion_orders` | "Audit invoices and key data in AP system" or parent "Process accounts payable" | 1433 (L4) | confident L4 |
| 341 | CRM → AGENCY-MGMT | `crm_opportunity.won` | `agency_jobs` | "Manage customer accounts" or "Determine customer lifetime value" parent | 669 (L4) | medium |
| 348 | HCM → AGENCY-MGMT | `employee.terminated` | `agency_time_entries` | (existing `discovery_override` row at PCF 41 "Manage employee onboarding, training, and development" L2 looks WRONG; the handoff is employee termination affecting time entries; PROPOSE REPLACE with "Manage employee information" or "Process employee exit" cluster) | needs lookup | REPLACE recommended |

Proposed `agent_curated` action summary: 8 INSERTs (344, 345, 346, 514, 515, 516, 513, 347, 341 = 9 INSERTs) + 1 REPLACE (348) + 2 KEEP (342, 343). Net new rows: 9 INSERT + 1 REPLACE = 10 PCF tagging operations; coverage after: 12 of 12 (100%).

#### Bucket 1 count summary

| ID | Finding type | Count |
|---|---|---|
| MISSING (entity gap) | 0 (entity gaps surface in Bucket 3) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (M1 + B9 events + F2 + F3 + B-band lifecycle + B4 pattern flags) | 6 |
| BOUNDARY (B10b/B8 universal cascade) | 1 |
| APQC TAGGING | 1 (per the count convention; 10 row operations queued under H1) |
| MODULARIZATION ISSUES | 0 in Bucket 1 (the M1 module-split conversation surfaces as B2-S1) |
| **Bucket 1 total** | **8 items** |

#### Boundary findings per neighbor (Pass 4 pairwise reconciliation)

Most pairwise neighbors are short because AGENCY-MGMT's substrate is M1-degenerate. Sections 1 + 2 collapse into the universal B1-S7 cascade. Sections 3-5 are below per neighbor.

**ERP-FIN ↔ AGENCY-MGMT (weight 3, full).** Wired pairs: 3 outbound (345 `agency_invoice.issued` → `agency_jobs`; 346 `media_costs.posted` → `insertion_orders`; 516 `media_plan.executed` → `media_plans`). Section 2: all 3 have NULL `source_domain_module_id` (AGENCY-MGMT M1 cascade) and NULL `target_domain_module_id` (ERP-FIN's B10b: ERP-FIN has 0 DMDO data per the catalog-wide b2 baseline). Section 3: missing handoff candidate ERP-FIN → AGENCY-MGMT on `invoice.paid` for the agency to mark `agency_jobs` as `paid`, closing the cash cycle. Section 4: ERP-FIN should declare consumer DMDOs on `agency_jobs`, `insertion_orders`, `media_plans` once ERP-FIN's Phase B lands. Section 5: zero cross-relationship rows exist between AGENCY-MGMT masters and ERP-FIN entities; on Phase B, propose `agency_jobs feeds_revenue_recognition revenue_recognition_records` (ASC 606 anchor), `insertion_orders generate accounts_payable_items`.

**CLM ↔ AGENCY-MGMT (weight 4, full).** Wired pairs: 1 outbound (343 `estimate.approved` → `legal_contracts`), 1 inbound (342 `legal_contract.signed` → `agency_jobs`). DMDO: AGENCY-MGMT consumes `legal_contracts` (already loaded). Section 2: both handoffs have NULL FK on AGENCY-MGMT side (M1 cascade). 343 has NULL `source_domain_module_id`; 342 has NULL `target_domain_module_id` and its CLM-side `source_domain_module_id=127` is populated. Section 3: clean. Section 4: clean. Section 5: cross-relationship `legal_contracts seeds agency_jobs` (id 513) exists, healthy.

**CRM ↔ AGENCY-MGMT (weight 3, full).** Wired pairs: 1 outbound (514 `agency_retainer.depleted` → `crm_opportunities`), 1 inbound (341 `crm_opportunity.won` → `agency_jobs`). DMDO: AGENCY-MGMT consumes `crm_opportunities`. Section 2: 341 has NULL `target_domain_module_id` (AGENCY-MGMT M1 cascade); 341's CRM-side `source_domain_module_id=48` is populated. 514 has NULL `source_domain_module_id` (AGENCY-MGMT M1 cascade) and `target_domain_module_id=46` is populated. Section 3: clean. Section 4: clean. Section 5: zero cross-relationship rows between `agency_retainers` / `agency_jobs` and `crm_opportunities`; propose `crm_opportunities seeds agency_jobs` and `agency_retainers tied_to crm_opportunities` once Phase M lands.

**HCM ↔ AGENCY-MGMT (weight 3, full).** Wired pairs: 1 inbound (348 `employee.terminated` → `agency_time_entries`). DMDO: AGENCY-MGMT consumes `employees`. Section 2: 348 has NULL `target_domain_module_id` (AGENCY-MGMT M1 cascade); HCM-side `source_domain_module_id=54` is populated. Section 3: missing handoff candidate HCM → AGENCY-MGMT on `employee.rate_changed` so rate cards stay in sync. Section 4: clean. Section 5: cross-relationship `employees feeds agency_time_entries` (id 52) exists, healthy.

**PSA ↔ AGENCY-MGMT (weight 2, lightweight).** 2 outbound (513 time_entry.submitted, 515 creative_brief.approved). All NULL on AGENCY-MGMT side. PSA-side `target_domain_module_id` is populated on both (88 for 513, no for 515). Section 5: zero cross-relationships between `agency_time_entries` / `creative_briefs` and PSA entities. Potential overlap concern: the substrate of agency time entries is conceptually identical to PSA time tracking; the rationale for two separate entities (`agency_time_entries` vs PSA `project_time_entries`) is the agency-specific rate-card semantics (cost rate, bill rate, multi-rate billing) that PSA covers only partially. Surface this overlap as B2-S6.

**DAM ↔ AGENCY-MGMT (weight 2, lightweight).** 1 outbound (344 deliverable.approved). Section 5: `creative_deliverables registers_as digital_assets` (id 644) exists, healthy.

**S2P ↔ AGENCY-MGMT (weight 2, lightweight).** 1 inbound (347 vendor_invoice.received). AGENCY-MGMT consumes `suppliers`. Section 5: no cross-relationship between `insertion_orders` and `suppliers` / `vendor_invoices`; propose `insertion_orders generates supplier_invoices` once both sides have Phase B coverage.

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **AGENCY-MGMT module split for Phase M.** B1-S1 needs a module boundary decision. Proposed shape: 3 full modules (JOB-TRAFFIC, MEDIA-BUY, CREATIVE-OPS) matching the natural capability decomposition. Alternative shapes: (a) 2 modules (JOB-TRAFFIC-AND-MEDIA, CREATIVE-OPS) reflecting Workamajig / Function Point's typical single-platform pattern; (b) 3 modules per the proposed split (matches Deltek WorkBook's product surface); (c) 4 modules splitting JOB-TRAFFIC into JOBS + TIME-TRACKING-AGENCY (matches Advantage / Synergist). 3-module split per proposal is the recommended default because it aligns with capability boundaries (AGENCY-MGMT-JOBS / AGENCY-MGMT-MEDIA-BUY / CREATIVE-REVIEW), and per Rule #14 a domain with ≥3 capabilities requires ≥2 modules so even 3 is conservative. | Architectural design decision the user owns: drives Phase M, B-band, F-band loads. | (a) 2 modules JOB-AND-MEDIA + CREATIVE-OPS, (b) 3 modules per proposal, (c) 4 modules with TIME-TRACKING-AGENCY split out, (d) other shape (specify). |
| B2-S2 | **System skill split (Rule #17).** Per Rule #17 each `domain_modules` row carries exactly one system skill. If the user picks the 3-module B2-S1 (a) option, the existing skill 26 `agency-mgmt-system` must either be deleted and replaced with 3 module-scoped system skills, or repurposed for one of the modules with 2 additional skills created. Recommendation: 3 system skills (`agency-jobs-system`, `agency-media-buy-system`, `agency-creative-ops-system`); rename / delete the existing skill 26. | Naming / authoring decision. | (a) Delete skill 26, create 3 new module-scoped skills (recommended). (b) Rename skill 26 to one of the new module-scoped skills, create the other 2. (c) Keep skill 26 attached to one module (violates the 1-skill-per-module shape if the count is wrong). |
| B2-S3 | **Pattern-flag positive re-evaluation (B1-S6).** Audit proposes `has_submit_lock=true` on 6 of the 8 masters and `has_single_approver=true` on 2 (`agency_estimates`, `insertion_orders`). None proposed for `has_personal_content`. Confirm per master before PATCH? | Pattern flags are workflow-shape judgments the user owns. | Per-master yes/no on each proposed flag; capture in Decisions. |
| B2-S4 | **Detached system skill resolution.** Skill 26 `agency-mgmt-system` exists with `domain_module_id IS NULL` and zero `skill_tools`. Was this an aborted Phase F load, or an intentional Phase A placeholder waiting for Phase M? | Load-time history not introspected; the audit cannot tell whether the skill row is residue or scaffolding. | (a) Treat as scaffolding, attach to a module on Phase M. (b) Treat as residue, DELETE and re-author 3 fresh skills per B2-S2. |
| B2-S5 | **Lifecycle states config-shape exemption test.** The audit asserts none of the 8 masters qualifies for the Rule #12 config-shape exemption; all 8 carry real workflows. Confirm? `agency_estimates` and `creative_briefs` are the closest to author-once / occasionally-edit (the estimate gets approved and then becomes the contract anchor; the brief is approved and rarely edited after). The fully-fledged lifecycle modeling for all 8 is non-trivial Phase B work (estimated 35 lifecycle state rows + 8 workflow-gate permission rows). | Editorial / workflow-intent decision. | (a) Model all 8 with full lifecycles (audit recommendation). (b) Mark `agency_estimates` and `creative_briefs` as config-shape and model only the other 6. (c) Mark more as config-shape (specify). |
| B2-S6 | **`agency_time_entries` overlap with PSA `project_time_entries`.** The two entities are conceptually adjacent: both are time captured against a project / job by an employee for billing. AGENCY-MGMT carries multi-rate billing semantics (cost rate vs bill rate, rate-card-driven), retainer-burn semantics, and media-commission overlays that PSA's time tracking doesn't carry. Question: is `agency_time_entries` correctly a distinct master, or should AGENCY-MGMT consume PSA's `project_time_entries` and extend via DMDO contributor rows for the agency-specific columns? Workamajig and Function Point keep the entity distinct; Deltek WorkBook extends from PSA-like time tracking. | Modeling philosophy decision; both shapes are defensible. | (a) Keep distinct (audit default). (b) Refactor to consume PSA `project_time_entries` and surface agency-specific columns via a contributor relationship. |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 ran the semantic enumeration against Workamajig Platinum, Deltek WorkBook, Advantage, Function Point, Synergist, Scoro, Productive.io, Streamtime, FunctionFox, Magnetic, Forecast.app, Aprimo Marketing Productivity, ProWorkflow, BigTime for Agencies, plus Mediaocean Spectra/Prisma as the media-buying specialist. ASC 606 (revenue recognition) is the primary regulatory anchor for project-based agencies; 4A's MSA conventions are a soft anchor for media-buying agreements but not a statutory framework.

#### MISSING (5) entity / capability candidates from flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `agency_rate_cards` | Workamajig, Deltek WorkBook, Function Point all model rate cards as first-class records distinct from rate-overrides on time entries (per-client rate sheets, role-and-seniority-indexed bill rates, effective-date versioning). Currently `RATE-MGMT` is a shared capability link but no AGENCY-MGMT master records the rate card itself. | new master in JOB-TRAFFIC or shared with PSA |
| `agency_invoices` | Every flagship vendor (Workamajig, Deltek, Advantage, Function Point) ships an invoice master distinct from the underlying time + media + materials line items. Currently the catalog implies invoicing via the `agency_invoice.issued` trigger event but has no `agency_invoices` master. Each invoice rolls up time entries, media costs, and out-of-pocket items into a deliverable to client AR. | new master in JOB-TRAFFIC |
| `agency_change_orders` | Workamajig "change orders", Deltek WorkBook "estimate revisions", Function Point "change requests" all model scope-change records distinct from the original estimate (amount delta, narrative, client approval). Currently `agency_estimates` carries no amendment / change record. | new master in JOB-TRAFFIC |
| `media_buys` (post-buy actuals) | Distinct from `media_plans` (intent) and `insertion_orders` (commitment) in Mediaocean, Smartly.io. Post-buy actuals come back from publishers as different from the plan, and reconciliation produces the `media_costs.posted` event. Currently the catalog has no `media_buys` master; the actuals are implicitly tracked on `insertion_orders`. | new master in MEDIA-BUY |
| `creative_proofing_rounds` | Ziflow, Filestage, Approval Studio, GoVisually model proofing rounds as distinct records carrying annotated review threads, version comparisons, per-round approval records. Currently `creative_deliverables` rolls all rounds onto one record. | new master in CREATIVE-OPS, OR fold into the proposed CREATIVE-PROOFING domain candidate. |

#### MODULARIZATION (1) candidate

- **Module-split decision converges with B2-S1.** The B3 candidates (`agency_invoices`, `agency_change_orders`, `agency_rate_cards` in JOB-TRAFFIC; `media_buys` in MEDIA-BUY; `creative_proofing_rounds` in CREATIVE-OPS) all fall cleanly into the proposed 3-module split, which strengthens the case for (b) in B2-S1. If `creative_proofing_rounds` ends up in a separate CREATIVE-PROOFING domain (Bucket 3 candidate domain), CREATIVE-OPS shrinks and the 2-module shape (JOB-AND-MEDIA + CREATIVE-LITE) becomes more defensible.

#### Compliance regulation candidates (no entity proposed, regulation rows missing)

- **ASC 606** (US GAAP project-based revenue recognition). The `domain.business_logic` field already mentions ASC 606 but no `domain_regulations` row is loaded.

#### Candidate-domain queue

This audit surfaced 3 domain-tier candidates appended to `audits/_missing-domains.md`:

- **MEDIA-BUY-PLATFORM** (Mediaocean Spectra/Prisma, Smartly.io, Basis Technologies). Distinct point-solution market spanning media plan authoring, IO management, vendor reconciliation, commission accounting. Currently folded into AGENCY-MGMT capability AGENCY-MGMT-MEDIA-BUY; pure-play vendors exist with no agency-software overlap (Mediaocean is the canonical example).
- **CREATIVE-PROOFING** (Ziflow, Filestage, Approval Studio, GoVisually, ProofHub, Aproove). Distinct point-solution market for annotated review workflows. Currently folded into AGENCY-MGMT capability CREATIVE-REVIEW; pure-play vendors compete independently of agency-management software.
- **MRM (Marketing Resource Management)** (Aprimo Marketing Productivity, Workfront for Marketing, Hive9, Allocadia, Plannuh). Adjacent to AGENCY-MGMT but distinguished by the buyer (in-house marketing department vs external agency) and the scope (marketing-operations orchestration vs agency-client delivery). The Aprimo row already linked to AGENCY-MGMT as `secondary` is suggestive of the boundary blur; pure-play MRM vendors compete independently.

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (which produces a Phase 0 markdown at `c:/tmp/AGENCY-MGMT-phase0-<date>.md` confirming per-entity vendor coverage) or eyeball-mode (user names which of the 9 to treat as confirmed and we proceed via Phase B inserts after M1 is resolved).

### Cross-bucket dependencies

- B1-S1 (Phase M module split) is **gated on B2-S1**: the user picks the module count before the Phase M load.
- B1-S3 (F2 detached system skill) is **gated on B2-S1 + B2-S2**: needs to know how many modules and how many system skills first.
- B1-S4 (F3 zero skill_tools) is **gated on B1-S3** (no skill anchor = no tools).
- B1-S5 (lifecycle states for all 8 masters) is **gated on B1-S1** (states pin to realizing modules).
- B1-S7 (B10b/B8 universal cascade) is **gated on B1-S1** (handoffs need module FKs).
- B1-S2 (event_category PATCH for 6 events) is **independent** of M1; can be applied immediately.
- B1-S6 (pattern flag PATCH for 6 masters) is **independent** of M1; can be applied immediately.
- B1-H1 (APQC TAGGING) is **independent** of M1 (PCF activities tag handoffs regardless of module attribution).
- Bucket 2 items B2-S1 through B2-S6 are sequential where B2-S1 drives B2-S2, B2-S4 may converge with B2-S2; the rest (B2-S3, B2-S5, B2-S6) are independent.
- Bucket 3 entity candidates may inform B2-S1 (e.g. if `creative_proofing_rounds` moves out to a CREATIVE-PROOFING domain, the CREATIVE-OPS module shrinks). Calling this out per the surface-time discipline.
- Bucket 3 domain candidates (MEDIA-BUY-PLATFORM, CREATIVE-PROOFING, MRM) might inform B2-S1 if the user decides one or more should be promoted as a separate domain rather than folded as AGENCY-MGMT modules.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S2, S6, H1-confident-only`), or `skip`.

- **S1 (M1 catastrophic, Phase M load)** is gated on B2-S1; resolve that first.
- **S2 (event_category PATCH on 6 trigger_events)** is trivial; one PATCH each. Independent of M1.
- **S3 (F2 detached system skill)** is gated on S1 + B2-S2.
- **S4 (F3 zero skill_tools)** is gated on S1 + S3.
- **S5 (lifecycle states for 8 masters)** is gated on S1; 35 rows + 8 permissions.
- **S6 (pattern-flag PATCH on 6 masters)** depends on B2-S3 per-flag approval; 6 PATCH ops.
- **S7 (B10b/B8 cascade PATCH on 12 handoffs)** is gated on S1.
- **H1 (10 APQC operations)** can apply now (independent of M1).

**Bucket 2, what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (module split):** (a) 2 modules, (b) 3 modules per proposal (recommended), (c) 4 modules with TIME-TRACKING-AGENCY split, (d) other.
- **B2-S2 (system skill split):** (a) 3 new module-scoped skills, (b) rename skill 26 + create 2, (c) other.
- **B2-S3 (pattern-flag re-evaluation):** per-master yes/no on `has_submit_lock` (6 proposed) and `has_single_approver` (2 proposed).
- **B2-S4 (detached skill 26):** (a) treat as scaffolding, attach. (b) treat as residue, DELETE.
- **B2-S5 (config-shape exemption test):** (a) model all 8 with full lifecycles, (b) exempt `agency_estimates` + `creative_briefs`, (c) other.
- **B2-S6 (agency_time_entries vs PSA project_time_entries):** (a) keep distinct, (b) refactor to consume PSA + contribute.

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** Will surface candidates when the subagent returns. If eyeball-mode, name which of the 5 entity candidates + 1 regulation (ASC 606) + 3 domain candidates (MEDIA-BUY-PLATFORM, CREATIVE-PROOFING, MRM, queued in `audits/_missing-domains.md`) to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain for routing.

| Owing domain | Owed work |
|---|---|
| ERP-FIN | B10b: populate `target_domain_module_id` on outbound handoffs 345 / 346 / 516. Phase B (no DMDO data exists on ERP-FIN per the catalog-wide b2 baseline): declare consumer DMDOs on `agency_jobs` (478), `insertion_orders` (482), `media_plans` (481) in whichever ERP-FIN module subscribes (likely the billing / revenue-recognition module). |
| CRM | B10b: populate `target_domain_module_id` on outbound handoff 514 (already populated at 46). Confirm 46 is the intended target module. CRM-side cross-relationship: propose `crm_opportunities seeds agency_jobs` on CRM's next audit. |
| HCM | B10b: populate `target_domain_module_id` on inbound handoff 348 is owed by AGENCY-MGMT (NULL is on AGENCY-MGMT side, this is M1 cascade), not HCM. HCM's source side (`source_domain_module_id=54`) is populated. No HCM-side owed work. |
| CLM | B10b: populate `source_domain_module_id` on handoff 343 is owed by AGENCY-MGMT (M1 cascade). CLM's `target_domain_module_id=127` is populated. CLM previously surfaced this in its own audit (CLM B1-S6); CLM owes nothing further. |
| S2P | B10b: populate `source_domain_module_id` on handoff 347; populate `target_domain_module_id` is AGENCY-MGMT's M1 cascade. Phase B: declare consumer DMDO on `insertion_orders` once S2P's Phase B lands. |
| DAM | B10b: populate `target_domain_module_id` on inbound handoff 344. Phase B: declare consumer DMDO on `creative_deliverables` once DAM's Phase B lands. |
| PSA | B10b: populate `target_domain_module_id` on inbound handoffs 513 (already 88) and 515 (NULL). 88 should be verified. PSA-side cross-relationship: B2-S6 raises whether AGENCY-MGMT `agency_time_entries` should consume PSA `project_time_entries` instead. |
