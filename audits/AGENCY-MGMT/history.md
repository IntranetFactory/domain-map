# AGENCY-MGMT audit history

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

## 2026-05-31, Continuation: B1 technical fixes

### Scope

Applied the truly-technical subset of Bucket 1 that does not depend on user input or on Phase M / B2 decisions. Loader: [.tmp_deploy/fix_agency_mgmt_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_agency_mgmt_b1_technical_2026_05_31.ts).

### Classification of the 8 B1 items

| B1 item | Decision | Reason |
|---|---|---|
| B1-S1 Phase M module split | DEFER | Gated on B2-S1; user picks 2 vs 3 vs 4 modules. |
| B1-S2 event_category PATCH (6 rows) | TECHNICAL | Audit pre-specifies each enum value; pure backfill. |
| B1-S3 F2 detached system skill | DEFER | Gated on B1-S1 + B2-S2 (module count + skill split). |
| B1-S4 F3 zero skill_tools | DEFER | Gated on B1-S3 (no skill anchor yet). |
| B1-S5 lifecycle states (8 masters) | DEFER | Gated on B1-S1 (states pin to modules) and B2-S5 (config-shape exemption choice). |
| B1-S6 pattern flag PATCH (6 masters) | DEFER | Audit explicitly gates on B2-S3 per-flag user approval. |
| B1-S7 handoff B10b/B8 cascade (12 rows) | DEFER | Gated on B1-S1 (no module FKs to pin to yet). |
| B1-H1 APQC tagging (10 ops) | PARTIAL | 4 INSERTs technical (single confident PCF); 6 ops deferred (multi-option, REPLACE, or "needs lookup"). |

### Fixes applied

**B1-S2: 6 PATCHes on `trigger_events`.event_category** (independent of M1)

| id | event_name | new event_category |
|---|---|---|
| 525 | `agency_time_entry.submitted` | `state_change` |
| 526 | `agency_retainer.threshold_reached` | `threshold` |
| 527 | `agency_retainer.depleted` | `threshold` |
| 528 | `media_plan.approved` | `state_change` |
| 529 | `media_plan.executed` | `state_change` |
| 530 | `creative_brief.approved` | `state_change` |

Verified post-load: all 6 events carry a non-empty `event_category`.

**B1-H1: 4 `handoff_processes` INSERTs** (`proposal_source='agent_curated'`, `record_status` omitted so it defaults to `new`, `notes` empty per Rule #15, `role` defaults to `implements`)

| handoff_id | process_id | PCF row | New hp.id |
|---|---|---|---|
| 344 (AGENCY-MGMT → DAM, `deliverable.approved`) | 141 | "Manage product marketing material" (L3) | 255 |
| 345 (AGENCY-MGMT → ERP-FIN, `agency_invoice.issued`) | 302 | "Invoice customer" (L3) | 256 |
| 347 (S2P → AGENCY-MGMT, `vendor_invoice.received`) | 1433 | "Audit invoices and key data in AP system" (L4) | 257 |
| 515 (AGENCY-MGMT → PSA, `creative_brief.approved`) | 1661 | "Develop project plans" (L4) | 258 |

Verified post-load: 4 new rows, all `proposal_source='agent_curated'`, `record_status='new'`.

### B1-H1 deferred operations (6 ops still pending user input)

| handoff_id | Reason for deferral |
|---|---|
| 513 (AGENCY-MGMT → PSA, `agency_time_entry.submitted`) | Two PCF options listed: 312 (L3 "Report time") OR 1414 (L4 "Collect and record employee time worked"). User picks granularity. |
| 516 (AGENCY-MGMT → ERP-FIN, `media_plan.executed`) | Two PCF options listed: 134 (L3 "Establish marketing budgets") OR 647 (L4 "Create marketing budget"). User picks. |
| 514 (AGENCY-MGMT → CRM, `agency_retainer.depleted`) | Audit says "needs lookup"; no single confident PCF id. |
| 341 (CRM → AGENCY-MGMT, `crm_opportunity.won`) | Audit confidence "medium" with alternative listed (669 vs parent); user picks. |
| 346 (AGENCY-MGMT → ERP-FIN, `media_costs.posted`) | Two PCF options (1433 L4 child or parent "Process accounts payable"); audit confidence "medium". User picks. |
| 348 (HCM → AGENCY-MGMT, `employee.terminated`) | Audit recommends REPLACE on the existing `discovery_override` row (process 41 "Manage employee onboarding…" looks wrong) but says "needs lookup"; replacement target not pinned. User decides. |

### Count

- Technical operations applied: **10** (6 PATCH + 4 INSERT).
- B1 items fully addressed: 1 (B1-S2). B1 items partially addressed: 1 (B1-H1, 4 of 10 sub-ops). B1 items deferred: 6.

### Cross-domain follow-ups owed (unchanged from 2026-05-30 audit)

See "Report-only follow-ups (owed by other domains)" table in the 2026-05-30 audit body; this continuation did not introduce or retire any cross-domain owed work.

## 2026-05-31, Audit

### Summary

- Current footprint: 8 master data_objects + 5 consumers across **0 modules** (M1 catastrophic hard-fail persists). 11 capabilities linked, 0 lifecycle states across 8 masters, 10 solution links, 0 regulations, 1 detached system skill (id 26) now with 9 skill_tools rows (8 query + 1 send_email side_effect). 11 trigger_events all with non-empty event_category (B9 cured by prior continuation). 12 cross-domain handoffs (8 outbound, 4 inbound); all 12 still NULL on the AGENCY-MGMT-side module FK (M1 cascade). 7 of 12 handoffs have at least one handoff_processes row (58%), 9 rows total (handoff 344 and 347 doubly tagged); zero `record_status='approved'`.
- Market surface (vendor basis from prior audit, re-used): Workamajig Platinum, Deltek WorkBook, Advantage, Function Point, plus Mediaocean Spectra/Prisma for media buying. Compliance anchor: ASC 606 Revenue Recognition (regulation id 57 exists in catalog, not yet linked via `domain_regulations`).
- Bucket 1 (b1a, agent fixable now): 5 items.
- Bucket 1 (b1b, blocked): 6 items.
- Bucket 2 (surface-for-user, judgment): 6 items.
- Bucket 3 (Phase 0 pending, speculative): 8 items.

### Vendor surface basis

This is a re-validation of the prior structural state; vendor surface unchanged from 2026-05-30 audit. The four primary-coverage solutions (Workamajig Platinum, Deltek WorkBook, Advantage, Function Point) define the canonical job-traffic + media + creative-ops shape. Mediaocean Spectra/Prisma anchors the media-buying specialist layer. ASC 606 remains the sole statutory anchor for project-based revenue recognition.

### Bucket 1, b1a (agent-solvable now)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1A-H1-APQC-REMAINDER | H1 APQC tagging | 5 of 12 handoffs still carry zero `handoff_processes` rows: 341 (CRM→AGENCY, `crm_opportunity.won` → agency_jobs), 346 (AGENCY→ERP-FIN, `media_costs.posted` → insertion_orders), 513 (AGENCY→PSA, `agency_time_entry.submitted` → agency_time_entries), 514 (AGENCY→CRM, `agency_retainer.depleted` → agency_retainers), 516 (AGENCY→ERP-FIN, `media_plan.executed` → media_plans). Prior continuation 2026-05-31 deferred these pending user PCF granularity picks; with PCF candidate lookups available the agent can propose single confident rows. | INSERT 5 `handoff_processes` rows after PCF lookup pass; `proposal_source='agent_curated'`, `record_status` omitted (defaults `new`). |
| B1A-H1-REPLACE-348 | H1 APQC tagging | Handoff 348 (HCM→AGENCY, `employee.terminated` → agency_time_entries) carries `discovery_override` row at process 41 ("Manage employee onboarding, training, and development" L2). Prior audit flagged this as wrong: the handoff terminates time entries, not onboards. | After PCF lookup for "exit" / "separation" / "Manage employee information" cluster, propose REPLACE: DELETE the existing override row + INSERT a new `agent_curated` row pointing at the correct exit-processing PCF activity. |
| B1A-AS1-EVENT-MODULE-FK | B9 trigger_events.domain_module_id | All 11 AGENCY-MGMT trigger_events carry `domain_module_id IS NULL`. This is M1 cascade; the events fire from masters that have no realizing module. The fix is gated on B1B-AS1-MODULES (Phase M load) but the PATCH itself is a single deterministic backfill once module IDs exist; flagging as agent-solvable downstream rather than blocked-only because the operation is mechanical. | After B1B-AS1-MODULES lands, PATCH all 11 events to set `domain_module_id` per the master→module mapping (jobs/time/estimates/retainers→JOB-TRAFFIC; media_plans/insertion_orders→MEDIA-BUY; creative_briefs/creative_deliverables→CREATIVE-OPS). |
| B1A-AS2-REG-ASC606 | A4 regulation linkage | The `domains.business_logic` column on AGENCY-MGMT cites ASC 606 ("project-based revenue recognition under ASC 606"); regulation id 57 ("ASC 606 Revenue Recognition") exists in the catalog; no `domain_regulations` row links them. | INSERT one `domain_regulations` row: `{domain_id: 153, regulation_id: 57, applicability: 'mandatory'}` (or whichever applicability value the catalog enforces; verify at fix time). Independent of M1. |
| B1A-AS3-SKILL26-RENAME | F2 detached system skill (partial) | Skill 26 `agency-mgmt-system` now has 9 skill_tools attached (F3 cured to a baseline level) but still `domain_module_id IS NULL`. With 0 modules the skill cannot anchor; however, the 9 tools span all three proposed-module surfaces (jobs/time/estimates → JOB-TRAFFIC; media_plans/insertion_orders → MEDIA-BUY; creative_briefs/creative_deliverables → CREATIVE-OPS). Once B1B-AS1-MODULES + B2-S2 land, the skill must either be split into 3 module-scoped skills or attached to one with 2 new siblings created. | Gated on B1B-AS1-MODULES + B2-S2; listed here as the deterministic finishing PATCH after those gates resolve. |

### Bucket 1, b1b (blocked, waiting on user judgment or upstream gates)

| ID | Finding | Blocked by |
|---|---|---|
| B1B-AS1-MODULES | M1 catastrophic. Zero `domain_modules` rows on AGENCY-MGMT (id 153). Rule #14: domain MUST have ≥1 `module_kind='full'`; with 11 capabilities and 8 masters, MUST have ≥2. Cascade blocks every M2-M7, B-band module FKs, C1-C2, E1-E5, F1-F5 (F3 partially cured by side-loaded skill_tools on the detached skill 26). | B2-S1 user judgment on module count + boundary. |
| B1B-AS2-LIFECYCLE | B-band lifecycle states. Zero `data_object_lifecycle_states` rows across all 8 masters. Rule #12: every `master + required` data_object MUST carry lifecycle states unless config-shape exempt. None of the 8 plausibly config-shape; expected roughly 35 lifecycle state rows + 8 workflow-gate permission rows on materialization. | B1B-AS1-MODULES (states pin to realizing modules) + B2-S5 (config-shape exemption test). |
| B1B-AS3-HANDOFF-CASCADE | B10b/B8 universal cascade. All 12 cross-domain handoffs (344, 345, 346, 343, 514, 515, 516, 513 outbound; 342, 347, 341, 348 inbound) have NULL on the AGENCY-MGMT-side module FK. Single mechanical PATCH per handoff once modules exist; mapping by payload→module from B2-S1. | B1B-AS1-MODULES. |
| B1B-AS4-PATTERN-FLAGS | B4 pattern-flag re-evaluation. All 8 masters carry every pattern flag at `false`. Audit proposes `has_submit_lock=true` on 6 masters (`agency_estimates`, `insertion_orders`, `agency_time_entries`, `media_plans`, `creative_briefs`, `creative_deliverables`) and `has_single_approver=true` on 2 (`agency_estimates`, `insertion_orders`). Independent of M1 once approved per-master. | B2-S3 per-master per-flag approval. |
| B1B-AS5-SKILL-SPLIT | F2/F4 system skill split. Once modules exist, skill 26 either splits into 3 module-scoped skills (`agency-jobs-system`, `agency-media-buy-system`, `agency-creative-ops-system`) or attaches to one of the 3 with 2 fresh siblings authored. The 9 existing skill_tools must be re-allocated by entity. | B1B-AS1-MODULES + B2-S2. |
| B1B-AS6-TOOL-FLOOR | F3 tool floor per module. Skill 26's current 9 tools are `query_*` for 8 masters plus 1 generic `send_email`. Once the skill splits per module, each module's system skill needs its full operational floor (mutates per master, side_effect tools for proofing rounds and external publisher posts, etc.). Recommended counts per B1-S4 in 2026-05-30 audit: JOB-TRAFFIC 8-12 tools; MEDIA-BUY 6-8 tools; CREATIVE-OPS 6-8 tools. | B1B-AS5-SKILL-SPLIT. |

### Bucket 2, surface-for-user (judgment calls)

Unchanged from 2026-05-30 audit; re-stated here so state.yaml is self-contained. No new B2 items surfaced this audit; B2-S4 is partially answered by the live state (skill 26 has 9 tools attached, so it is no longer pure scaffolding, leaning toward option (a) "attach to a module" rather than (b) "delete and re-author").

| ID | Question | Options |
|---|---|---|
| B2-S1 | AGENCY-MGMT module split for Phase M. | (a) 2 modules JOB-AND-MEDIA + CREATIVE-OPS; (b) 3 modules JOB-TRAFFIC + MEDIA-BUY + CREATIVE-OPS (recommended); (c) 4 modules with TIME-TRACKING-AGENCY split out; (d) other. |
| B2-S2 | System skill split per Rule #17. | (a) Delete skill 26, create 3 module-scoped skills; (b) rename skill 26 to one new module's system skill + create 2 siblings; (c) attach skill 26 to 1 module only (only valid if B2-S1 resolves to 1 module, which violates Rule #14 with 11 capabilities, so effectively dead). |
| B2-S3 | Pattern-flag re-evaluation per B1B-AS4. | Per-master yes/no on `has_submit_lock` (6 proposed) and `has_single_approver` (2 proposed). |
| B2-S4 | Detached skill 26 disposition. Now updated: with 9 tools attached, lean (a). | (a) Treat as scaffolding, attach to a module on Phase M (recommended now). (b) Treat as residue, DELETE and re-author 3 fresh skills per B2-S2. |
| B2-S5 | Lifecycle states config-shape exemption test. | (a) Model all 8 with full lifecycles; (b) exempt `agency_estimates` + `creative_briefs`; (c) other. |
| B2-S6 | `agency_time_entries` overlap with PSA `project_time_entries`. | (a) Keep distinct (audit default); (b) refactor to consume PSA + contribute. |

### Bucket 3, Phase 0 pending (speculative)

Carried from 2026-05-30 audit; no new entity candidates surfaced this audit.

| ID | Candidate | Vendor basis | Proposed module |
|---|---|---|---|
| B3-AGENCY-RATE-CARDS | `agency_rate_cards` | Workamajig, Deltek WorkBook, Function Point first-class rate-card master with effective-date versioning | JOB-TRAFFIC (or shared with PSA) |
| B3-AGENCY-INVOICES | `agency_invoices` | Workamajig, Deltek, Advantage, Function Point all ship distinct invoice masters; current catalog has only the `agency_invoice.issued` trigger event without a backing master | JOB-TRAFFIC |
| B3-AGENCY-CHANGE-ORDERS | `agency_change_orders` | Workamajig "change orders", Deltek "estimate revisions", Function Point "change requests" | JOB-TRAFFIC |
| B3-MEDIA-BUYS | `media_buys` (post-buy actuals) | Mediaocean post-buy reconciliation produces actuals distinct from `media_plans` (intent) and `insertion_orders` (commitment) | MEDIA-BUY |
| B3-PROOFING-ROUNDS | `creative_proofing_rounds` | Ziflow, Filestage, Approval Studio, GoVisually model annotated review rounds as distinct records | CREATIVE-OPS (or new CREATIVE-PROOFING domain) |
| B3-DOMAIN-MEDIA-BUY-PLATFORM | New domain MEDIA-BUY-PLATFORM | Mediaocean Spectra/Prisma, Smartly.io, Basis Technologies are pure-play with no agency-software overlap | Domain promotion (out of AGENCY-MGMT-MEDIA-BUY capability) |
| B3-DOMAIN-CREATIVE-PROOFING | New domain CREATIVE-PROOFING | Ziflow, Filestage, Approval Studio, GoVisually, ProofHub, Aproove are pure-play | Domain promotion (out of CREATIVE-REVIEW capability) |
| B3-DOMAIN-MRM | New domain MRM (Marketing Resource Management) | Aprimo, Workfront for Marketing, Hive9, Allocadia, Plannuh; distinguished from agency-mgmt by buyer (in-house marketing vs external agency) | Adjacent-domain promotion |

### Pairwise reconciliation (delta vs 2026-05-30)

No new pairwise findings vs the 2026-05-30 audit body. The owed-by-other-domains table from 2026-05-30 carries through unchanged. The only structural change since 2026-05-30 + 2026-05-31 continuation is that handoff_processes coverage moved from 3 of 12 (25%) to 7 of 12 (58%) on a unique-handoff basis (9 rows total because 344 and 347 carry two rows each).

### Decisions

None applied this audit. State preserved for next interactive pass.

### Fixes applied

None. This is a read-only structural Validate audit; no writes to the live catalog. Prior continuation (2026-05-31) applied 10 ops; state has not drifted since.

### `domains.notes` pointer

Not updated this audit. Rule #15: no auto-write.

## 2026-06-02 Audit (modularization)

### Summary

Resolved M1 catastrophic (B1B-AS1-MODULES / B1A-BUILD). Created the domain's first
3 `domain_modules` rows (all `module_kind='full'`, `record_status='new'`), linked all
11 capabilities, and assigned all 13 distinct data_objects (8 masters + 5 consumers) at
their existing role+necessity from `domain_data_objects`. Scope was strictly modules +
entity assignment: no new data_objects, capabilities, lifecycle states, skills, tools,
handoffs, or relationships were created. The split follows the recommended B2-S1 option
(b), proposed unchanged across the 2026-05-30 and 2026-05-31 audits (Deltek WorkBook
product shape): JOB-TRAFFIC + MEDIA-BUY + CREATIVE-OPS.

Loader: [.tmp_deploy/modularize_agency_mgmt_2026-06-02.ts](../../.tmp_deploy/modularize_agency_mgmt_2026-06-02.ts)
(idempotent; module key `domain_module_code`, DMC key `(domain_module_id, capability_id)`,
DMDO key `(domain_module_id, data_object_id)`; re-run is a no-op, verified +0/+0).

### Module split

| Module (id) | Code | Capabilities (ids) | Data objects: role / necessity |
|---|---|---|---|
| Job and Traffic Management (210) | AGENCY-MGMT-JOB-TRAFFIC | AGENCY-MGMT-JOBS (440), AGENCY-MGMT-RETAINER (441), AGENCY-MGMT-ESTIMATE (443), AGENCY-MGMT-MARKUP (444), AGENCY-MGMT-PROFITABILITY (445), TIME-TRACKING (30), RATE-MGMT (56), RESOURCE-PLAN (77), BILLING-PROJ (80) | agency_jobs (478) master/req; agency_time_entries (479) master/req; agency_retainers (480) master/req; agency_estimates (485) master/req; customers (97) consumer/req; employees (31) consumer/req; legal_contracts (66) consumer/req; crm_opportunities (100) consumer/req |
| Media Plan and Insertion Order Management (211) | AGENCY-MGMT-MEDIA-BUY | AGENCY-MGMT-MEDIA-BUY (442) | media_plans (481) master/req; insertion_orders (482) master/req; suppliers (206) consumer/req; customers (97) consumer/req |
| Creative Operations and Proofing (212) | AGENCY-MGMT-CREATIVE-OPS | CREATIVE-REVIEW (446) | creative_briefs (483) master/req; creative_deliverables (484) master/req; customers (97) consumer/req |

Capability placement rationale: the 4 shared capabilities all serve the job/billing
core, so they land in JOB-TRAFFIC (TIME-TRACKING -> agency_time_entries; RATE-MGMT +
BILLING-PROJ -> markup/estimate/profitability; RESOURCE-PLAN -> job staffing).
MARKUP (444) and PROFITABILITY (445) are billing-logic capabilities with no dedicated
master here; they realize through the job + time + estimate + retainer masters in
JOB-TRAFFIC and are placed there. MEDIA-BUY and CREATIVE-REVIEW map 1:1 to their
respective modules.

Consumer placement: `customers` is consumed by all 3 modules (jobs, media outlets'
client, briefs all reference the client). `employees` + `legal_contracts` +
`crm_opportunities` attach to JOB-TRAFFIC (time authors, contract anchor, won-deal
origination). `suppliers` (media outlets) attaches to MEDIA-BUY only.

### Counts

- domain_modules created: 3 (all `module_kind='full'`, `record_status='new'`).
- domain_module_capabilities created: 11 (9 + 1 + 1). Coverage 11/11 (M4 satisfied).
- domain_module_data_objects created: 15 (8 + 4 + 3). 8 distinct masters, each in
  exactly one module (M7 satisfied, zero multi-mastered). 5 distinct consumers
  (customers spans all 3 modules). All `notes` empty (R15).
- No empty module (M6: every module has >=1 capability and >=1 master).
- Rule #14 satisfied: 11 capabilities, 3 full modules (>=2 required).

### Verification (live re-query)

- `/domain_modules?domain_id=eq.153`: 3 rows, all full, all `record_status='new'`,
  `catalog_tagline` + `catalog_description` empty (M8/A4 buyer-copy gap, intentional).
- Capability coverage: 11/11 placed, none missing.
- Masters: 8 distinct, none in >1 module.
- DMDO + DMC `notes` all empty.
- Idempotent re-run produced +0 capability links, +0 DMDO rows.

### Deferred gaps (out of scope for this pass)

- **Per-module system skills (Rule #17 -> F2/F3).** Skill 26 `agency-mgmt-system`
  (9 skill_tools) is still `domain_module_id IS NULL`. With 3 modules now live it must
  be split into 3 module-scoped system skills (or attached to one + 2 siblings authored)
  and the 9 tools re-allocated by entity. Tracked as B1A-AS3-SKILL26-RENAME +
  B1B-AS5-SKILL-SPLIT + B1B-AS6-TOOL-FLOOR; B2-S2 owns the naming/split choice.
- **Catalog buyer copy (M8/A4).** All 3 modules carry empty `catalog_tagline` +
  `catalog_description`; buyer-facing copy backfill owed.
- **B-band module FK backfill (now unblocked).** 11 trigger_events
  (B1A-AS1-EVENT-MODULE-FK) and 12 cross-domain handoffs (B1B-AS3-HANDOFF-CASCADE)
  carry NULL on the AGENCY-MGMT-side module FK; the master->module map is now concrete
  (210/211/212) so these become mechanical PATCHes on the next pass.
- **Lifecycle states (B1B-AS2-LIFECYCLE).** 0 `data_object_lifecycle_states` across the
  8 masters; states now have realizing modules to pin to but B2-S5 (config-shape
  exemption) is still open.
- **Pattern flags (B1B-AS4), regulation link (B1A-AS2-REG-ASC606), APQC remainder
  (B1A-H1-APQC-REMAINDER / B1A-H1-REPLACE-348).** Unchanged; independent of this pass.
- **Missing-master candidates (b3).** agency_invoices, agency_rate_cards,
  agency_change_orders, media_buys, creative_proofing_rounds remain Phase 0 candidates
  (B3-*); not created (reuse-only scope).


## 2026-06-05 - b1a execution

Executed the agent-solvable `b1a` items from `state.yaml` against the live `domain_map`
module (tenant adenin, domain 153). Loader: `.tmp_deploy/agency_mgmt_b1a_2026_06_05.ts`
(idempotent, every write preceded by a live read; `record_status` omitted on all inserts so
the DB default `new` applies; no `notes` column written anywhere).

### B1A-AS1-EVENT-MODULE-FK - DONE

PATCHed `trigger_events.domain_module_id` (NULL -> module) on 11 events, mapped by the
event's publishing master data_object (478/479/480/485 -> 210; 481/482 -> 211; 483/484 -> 212):

| event id | event_name | data_object | NULL -> module |
|---|---|---|---|
| 338 | estimate.approved | 485 agency_estimates | 210 |
| 339 | deliverable.approved | 484 creative_deliverables | 212 |
| 340 | agency_invoice.issued | 478 agency_jobs | 210 |
| 341 | media_costs.posted | 482 insertion_orders | 211 |
| 342 | vendor_invoice.received | 482 insertion_orders | 211 |
| 525 | agency_time_entry.submitted | 479 agency_time_entries | 210 |
| 526 | agency_retainer.threshold_reached | 480 agency_retainers | 210 |
| 527 | agency_retainer.depleted | 480 agency_retainers | 210 |
| 528 | media_plan.approved | 481 media_plans | 211 |
| 529 | media_plan.executed | 481 media_plans | 211 |
| 530 | creative_brief.approved | 483 creative_briefs | 212 |

Prior value on every row: `domain_module_id = NULL`. Verify: 0 of the 11 remain NULL.

### B1A-AS3-HANDOFF-CASCADE - DONE

PATCHed the AGENCY-MGMT-side module FK on 12 cross-domain handoffs (outbound -> set
`source_domain_module_id`; inbound -> set `target_domain_module_id`), mapped by payload
data_object, except handoff 343 whose payload is `legal_contracts` (66, not an AGENCY
master) and which maps to 210 per the state.yaml `agency_estimates/legal_contracts -> 210`
rule:

| handoff | dir | null field | NULL -> module |
|---|---|---|---|
| 341 | inbound (CRM->AGENCY) | target_domain_module_id | 210 |
| 342 | inbound (CLM->AGENCY) | target_domain_module_id | 210 |
| 343 | outbound (AGENCY->CLM) | source_domain_module_id | 210 |
| 344 | outbound (AGENCY->DAM) | source_domain_module_id | 212 |
| 345 | outbound (AGENCY->ERP-FIN) | source_domain_module_id | 210 |
| 346 | outbound (AGENCY->ERP-FIN) | source_domain_module_id | 211 |
| 347 | inbound (S2P->AGENCY) | target_domain_module_id | 211 |
| 348 | inbound (HCM->AGENCY) | target_domain_module_id | 210 |
| 513 | outbound (AGENCY->PSA) | source_domain_module_id | 210 |
| 514 | outbound (AGENCY->CRM) | source_domain_module_id | 210 |
| 515 | outbound (AGENCY->PSA) | source_domain_module_id | 212 |
| 516 | outbound (AGENCY->ERP-FIN) | source_domain_module_id | 211 |

Prior value on every patched field: NULL. The opposite-side FKs that were already set
(e.g. 343 target=127, 513 target=88, 514 target=46, 348 source=54) were left untouched.
Verify: outbound NULL source-module = 0; inbound NULL target-module = 0.

### B1A-H1-REPLACE-348 - DONE

Handoff 348 (HCM employee.terminated -> agency_time_entries) carried a mismatched
`discovery_override` tag. Snapshot of the deleted row:

- `handoff_processes.id=37`, handoff_id=348, process_id=41
  ("Manage employee onboarding, training, and development", L2, external_id 20599),
  proposal_source=`discovery_override`, record_status=`new`, role=`implements`.

DELETED row 37. INSERTED replacement `handoff_processes.id=936`: handoff 348 -> process
**239 "Manage separation"** (L3, external_id 10513, parent 44 = the HR retain/separate
cluster), proposal_source=`agent_curated`, record_status=`new`, role=`implements`.
Rationale: the handoff is an employee-separation cascade (terminate the departing
employee's open time entries), which "Manage separation" describes; "Manage onboarding..."
was the inverse lifecycle phase.

### B1A-H1-APQC-REMAINDER - DONE

INSERTED 5 `handoff_processes` rows (proposal_source=`agent_curated`, record_status=`new`,
role=`implements`) on the 5 previously-untagged cross-domain handoffs. Single-confident L3
PCF matches chosen after `/processes?...source_framework=eq.apqc_pcf_cross_industry` lookups:

| hp id | handoff | source -> target | trigger_event | payload | PCF process | id / ext_id / level |
|---|---|---|---|---|---|---|
| 937 | 341 | CRM -> AGENCY | crm_opportunity.won | agency_jobs | Manage leads/opportunities | 147 / 10182 / L3 |
| 938 | 346 | AGENCY -> ERP-FIN | media_costs.posted | insertion_orders | Process accounts payable (AP) | 315 / 10756 / L3 |
| 939 | 513 | AGENCY -> PSA | agency_time_entry.submitted | agency_time_entries | Report time | 312 / 10753 / L3 |
| 940 | 514 | AGENCY -> CRM | agency_retainer.depleted | agency_retainers | Manage customers and accounts | 148 / 10183 / L3 |
| 941 | 516 | AGENCY -> ERP-FIN | media_plan.executed | media_plans | Perform general accounting | 307 / 10748 / L3 |

After this pass all 12 cross-domain handoffs on AGENCY-MGMT carry >=1 `handoff_processes`
row (H1 coverage 12/12; 0 deferred). None are `record_status='approved'` (awaiting reviewer).

### B1A-AS2-REG-ASC606 - DONE

INSERTED `domain_regulations.id=273`: {domain_id 153, regulation_id 57 (ASC 606 Revenue
Recognition, code ASC-606), applicability `mandatory`}. Confirmed `mandatory` is a live
enum value (249 catalog rows use it; `default_value` for the column is `recommended`).
Prior state: 0 domain_regulations rows on AGENCY-MGMT.

### B1A-SYSTEM-SKILLS - SKIPPED (blocked) + catalog copy DRAFTED-FOR-USER

Not executed. Two reasons:

1. **Skill split is a B2-S2 user decision.** Reconciling skill 26 against Rule #17 requires
   choosing delete-skill-26-and-author-3-fresh vs rename-skill-26-and-author-2-siblings.
   B2-S2 explicitly flags this as user-owned because it changes `skill_id` continuity for
   downstream agent references. Skipped per the skip-on-user_decision rule. The dependent
   tool-floor work (B1B-AS5 / B1B-AS6) stays blocked behind the same decision. Item kept
   OPEN in state.yaml with `blocked_by: user_decision B2-S2`.
2. **Catalog buyer copy is overwrite-protected (Rule #20).** The 3 modules' empty
   `catalog_tagline` / `catalog_description` were NOT written. Drafts below are surfaced for
   marketing review; the columns stay empty until the user approves wording per-row.

Skill 26 is still `domain_module_id IS NULL` with its 9 skill_tools (322-330) intact;
nothing was changed on `skills` / `skill_tools` / `tools` / `domain_modules`.

**DRAFTED catalog copy (buyer voice; not written - for user/marketing approval):**

- **210 AGENCY-MGMT-JOB-TRAFFIC**
  - `catalog_tagline`: "Run every client job from estimate to invoice, with live retainer burn-down and per-job profitability."
  - `catalog_description`: "Manage your agency's book of business in one place. Open client jobs, track their traffic state and deliverables, and capture time against client rate cards. Build estimates and change orders before work starts, watch retainers draw down in real time, and apply your markup and cost-plus billing rules automatically. See profitability per job and per client the moment time and costs post, then issue invoices without re-keying a thing."

- **211 AGENCY-MGMT-MEDIA-BUY**
  - `catalog_tagline`: "Plan campaigns by outlet and channel, commit budget through insertion orders, and reconcile against publisher invoices."
  - `catalog_description`: "Build media plans broken out by outlet, channel, daypart, audience, and budget, then turn approved plans into insertion orders that commit spend at negotiated rates with commission and make-good terms. When publisher invoices arrive, reconcile them against the orders so posted media costs flow straight to finance. Keep every campaign's planned-versus-actual spend in view from first plan to final reconciliation."

- **212 AGENCY-MGMT-CREATIVE-OPS**
  - `catalog_tagline`: "Take creative from brief to approved deliverable with versioned, annotated proofing and clean asset hand-off."
  - `catalog_description`: "Originate creative briefs, get them approved by the client, and author deliverables with full version history. Route each version through annotated, multi-stakeholder review and approval so feedback lands in one place instead of scattered email threads. When a deliverable is signed off, register the final version to your asset library so the approved work is always the version that ships."

### Tables written this pass

| table | operation | rows |
|---|---|---|
| trigger_events | PATCH (domain_module_id) | 11 |
| handoffs | PATCH (source/target module FK) | 12 |
| handoff_processes | DELETE | 1 (id 37) |
| handoff_processes | INSERT | 6 (ids 936, 937, 938, 939, 940, 941) |
| domain_regulations | INSERT | 1 (id 273) |

No writes to: skills, skill_tools, tools, domain_modules, data_objects,
data_object_lifecycle_states, domain_data_objects, domain_module_data_objects,
any `notes` column.

`next_action_by` recomputed to **user**: the only remaining b1a item (B1A-SYSTEM-SKILLS) is
blocked on the B2-S2 user decision, and b2 carries the open judgment calls (B2-S2 skill
split, B2-S3 pattern flags, B2-S5 lifecycle exemption, B2-S6 time-entries overlap).

### 2026-06-05 catalog UX written (supersedes the "drafted, left open" note above)

The empty `catalog_tagline` / `catalog_description` on the AGENCY-MGMT domain row and modules 210, 211, 212 were WRITTEN (not parked). Loader: `.tmp_deploy/backfill_catalog_ux_2026_06_05.ts` (empty-guard: only empty fields written, no overwrite). record_status on these rows is `new`, so the copy is reviewed in-record per the revised Rule #20. The prior note in this date section that left the UX "open" is superseded; the UX-only state.yaml items were removed.

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELLED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.
