---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 16
---

# LEGAL-PRACT-MGMT — Audit History

## 2026-05-30 — Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 5 full modules (`LEGAL-MATTER-MGMT` 132, `LEGAL-INTAKE-CONFLICT` 133, `LEGAL-TIME-BILLING` 134, `LEGAL-TRUST-ACCT` 135, `LEGAL-COURT-DOCKETING` 136); 6 LEGAL-mastered data_objects (`legal_matters` 391, `conflict_checks` 393, `engagement_letters` 394, `trust_accounts` 392, `client_invoices` 739, `external_court_filings` 738) + 2 cross-domain contributors (`crm_contacts` 98, `time_entries` 162); 7 capabilities (6 LEGAL-prefixed market-specific + `LEGAL-COURT-DOCKETING`); 8 primary-coverage solutions (Clio Manage, MyCase, PracticePanther, Filevine, Smokeball, CosmoLex, Centerbase, Aderant Expert); 9 trigger_events (5 well-categorized, 4 empty `event_category`); 7 outbound + 0 inbound cross-domain handoffs; 25 `data_object_relationships` (intra-domain + users edges + 1 cross-domain to `legal_contracts`); 25 aliases across all 6 masters; 33 lifecycle states across all 6 masters; 5 system skills + 47 `skill_tools` rows; 5 roles (Attorney, Paralegal, Conflicts Partner, Office Manager, Legal Bookkeeper) + 17 `role_modules` + 27 `role_permissions`.
- **Vendor surface basis:** Clio Manage, MyCase, PracticePanther, Filevine, Smokeball, CosmoLex, Centerbase, Aderant Expert. Compliance specialists implicit (every flagship ships IOLTA trust-accounting per ABA Model Rule 1.15). 8 primary-coverage solutions all loaded.
- **Bucket 1 (in-scope, agent fixable):** 8 items.
- **Bucket 2 (surface-for-user, judgment):** 4 items.
- **Bucket 3 (Phase 0 pending, speculative):** 4 items.

**Neighbor discovery** (auto-derived from `handoffs` + cross-domain DMDO + `data_object_relationships`, ranked by edge weight):

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| ERP-FIN | 2 | 0 | 0 | 0 | 2 | Lightweight |
| CLM | 1 | 0 | 0 | 1 (`engagement_letters flows_into legal_contracts`) | 2 | Lightweight |
| ECM | 1 | 0 | 0 | 1 (`content_documents archives external_court_filings`) | 2 | Lightweight |
| AUDIT | 1 | 0 | 0 | 1 (`audit_findings tracks external_court_filings`) | 2 | Lightweight |
| GRC | 1 | 0 | 0 | 0 | 1 | Lightweight |
| KMS | 1 | 0 | 0 | 0 | 1 | Lightweight |
| CRM | 0 | 0 | 1 (`crm_contacts` contributor in 132 and 133) | 0 | 1 | Lightweight |

All neighbors are edge-weight <3, so the full 5-section pairwise pass is not run per neighbor. Lighter neighbors get a one-line summary in the Report-only section below: the dominant boundary pattern is **zero non-LEGAL module declares `consumer / contributor / embedded_master` on any of the 6 LEGAL masters**, captured once as **B1-S7** below rather than duplicated per-neighbor.

Structural pass band rollup: **S1/S2/S3 sweep** OK with one zero-row anomaly (no inbound handoffs at all — B10 report-only with several plausible publishers); **A1 / A2 / A3 / A5-skip** pass; **M1 / M2 / M4 / M5 / M6** pass (5 modules ≥ 2-module floor, every capability has ≥1 realizing module via `domain_module_capabilities`, every workflow state has correct `domain_module_id`); **M7 hard-fails** (within-domain incoherence on `legal_matters` and `client_invoices`); **B1 / B2 / B3 / B5 / B6 / B7 / B11 / B12** pass; **B4 partial-fail** (positive re-eval pending — see Bucket 2); **B8 partial-fail** (4 cross-domain handoffs without mirror relationship rows); **B9 partial-fail** (4 events with empty `event_category` enum); **B9b hard-fail** (zero intra-domain `handoffs` rows across 5 modules); **B10b** outbound is report-only (6 NULL target FKs owed by GRC, KMS, ERP-FIN, ECM, AUDIT); **C1 / C2** pass (Legal owner + AR + Compliance contributors); **D1** unverified but not blocking; **E1–E6** pass; **F1–F5** pass; **F7** pass (no channel-primitive linkage detected; `notify_person` / `notify_team` abstractions used throughout; the one `sign_document` external link on `legal_intake_conflict_agent` is justified by ABA Model Rule 1.5(b)); **H1 hard-fail** (1 of 7 cross-domain handoffs tagged with PCF; volume target 4-6 `agent_curated` proposals).

Domain Semantius score (strict) across 5 system skills: **44/47 = 93.6%** platform-covered, **45/47 = 95.7%** operational (excluding the optional `notify_team` external row and the required `sign_document` external row). The two external rows are: `sign_document` (tool 42, required, external) on `legal_intake_conflict_agent` and `notify_team` (tool 914, optional, external) on `legal_trust_acct_agent`.

### Bucket 1 — In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M7 (hard fail)** | **Within-domain incoherence on `legal_matters`.** Master row in LEGAL-MATTER-MGMT (132) coexists with `role='consumer' + necessity='required'` rows in three sibling modules: LEGAL-TIME-BILLING (134), LEGAL-TRUST-ACCT (135), LEGAL-COURT-DOCKETING (136). M7 rejects master+consumer in sibling modules of the same domain. Two architectural options: (a) the three sibling modules are intended to be standalone-deployable (a law firm running only Time & Billing without LEGAL-MATTER-MGMT can still time-track and invoice against a local matter shell) → promote the 3 `consumer` rows to `embedded_master`. (b) the sibling modules assume LEGAL-MATTER-MGMT is always co-installed (every flagship vendor on the surface bundles matters with billing, trust, and docketing) → DELETE the 3 consumer rows; the master row in 132 is authoritative for the whole domain. Recommendation depends on Bucket 2-S3 architectural intent. | If (b): DELETE 3 `domain_module_data_objects` rows: `(domain_module_id=134, data_object_id=391, role='consumer')`, `(135, 391, 'consumer')`, `(136, 391, 'consumer')`. If (a): PATCH `role='embedded_master'` on the same 3 rows. |
| B1-S2 | **M7 (hard fail)** | **Within-domain incoherence on `client_invoices`.** Master row in LEGAL-TIME-BILLING (134) coexists with `role='consumer' + necessity='required'` in LEGAL-TRUST-ACCT (135). The trust module needs to know about invoices to drive trust-to-operating transfers on earned fees, but it cannot consume what is mastered next door under autonomous-deployable-units semantics. Same call as B1-S1: promote to `embedded_master` (if Trust is standalone-deployable) or DELETE (if Time & Billing is always co-installed). | If (b): DELETE 1 row: `(domain_module_id=135, data_object_id=739, role='consumer')`. If (a): PATCH to `role='embedded_master'`. |
| B1-S3 | **B9 / `trigger_events.event_category`** | 4 of 9 trigger_events for LEGAL masters have empty `event_category` (Rule #13 enum required: `lifecycle / state_change / threshold / signal`): 1048 `court_filing.submitted`, 1049 `court_filing.served`, 1050 `client_invoice.issued`, 1051 `client_invoice.paid`. The five older events (324 / 325 / 326 / 327 / 328) all carry valid values. | PATCH: 1048 → `state_change`; 1049 → `state_change`; 1050 → `lifecycle`; 1051 → `lifecycle`. |
| B1-S4 | **B9b (hard fail)** | **Zero intra-domain cross-module `handoffs` rows for LEGAL-PRACT-MGMT** despite 5 modules with obvious cross-module lifecycle progressions visible in `data_object_relationships`. Expected pairs from the cross-module relationship rows: (a) `133 → 132` on `conflict_check.cleared` so Matter Mgmt can advance matters past the `conflict_pending` state (relationship id 1168 `clears`); (b) `133 → 132` on `engagement_letter.signed` so Matter Mgmt can advance past `engagement_pending` to `active` (relationships 1162 `originates_from` and the state transition `engagement_pending → active`); (c) `132 → 134` on `legal_matter.closed` so Time & Billing fires final invoicing (relationship 1165 `has_many` invoices, lifecycle terminal state 878); (d) `132 → 135` on `legal_matter.opened` to trigger retainer deposit into trust (relationship 1166 `tracked_in`); (e) `132 → 136` on `legal_matter.opened` to seed the calendar from court deadlines (relationship 1164 `has_many` court filings); (f) `134 → 135` on `client_invoice.paid` (state 905) to drive the trust-to-operating transfer on earned fees (relationship 1170 `settles_from`); (g) `136 → 134` on `court_filing.submitted` so Time & Billing captures the filing-fee disbursement (relationship none yet — see B1-S5). Plus 2 optional ones: `135 → 134` on `trust_account.exception` (informational, not a workflow gate), `133 → 132` on `conflict_check.flagged` (decline-matter path). Minimum 7 required intra-domain rows. | Author 7 intra-domain handoffs with `source_domain_id=target_domain_id=150`, `integration_pattern='lifecycle_progression'`, `friction_level='low'`, both module FKs populated per the (source_module, target_module) pairs above. Events 1048-1051 are already published; events for (a), (b), (d), (e), (f), (g) reuse existing events (`conflict_check.flagged` 326, `engagement_letter.signed` 328, `legal_matter.opened` 324, `legal_matter.closed` 325, `client_invoice.paid` 1051, `court_filing.submitted` 1048). Authoring (a) requires a new `conflict_check.cleared` trigger_event row first (state 887 `cleared` has `requires_permission=true` but no published event). |
| B1-S5 | **B8 missing cross-domain `data_object_relationships`** | 4 of 7 outbound cross-domain handoffs have no mirror relationship row in `data_object_relationships`: handoff 334 (`legal_matter.closed` → KMS, payload `legal_matters`); 917 (`client_invoice.issued` → ERP-FIN, payload `client_invoices`); 918 (`client_invoice.paid` → ERP-FIN, payload `client_invoices`); 333 (`trust_account.exception` → GRC, payload `trust_accounts`). The 3 already-covered are 332 (engagement_letters → legal_contracts), 919 (court_filing → content_documents reverse-direction id 597), 920 (court_filing → audit_findings reverse-direction id 353). Proposed verb shapes per handoff payload → target master: `legal_matter contributes_lessons_to <kms-master>`; `client_invoice posts_to general_ledger_entries`; `trust_account triggers_compliance_review <grc-master>`. Specific target masters depend on what KMS / ERP-FIN / GRC canonically master, which is Bucket-3-adjacent for the GRC side. | Author 4 `data_object_relationships` rows once target masters are confirmed via target-domain query. ERP-FIN side likely has a `general_ledger_entries` master to point at. KMS side likely has a `knowledge_articles` master. GRC side: defer until target's B-band is checked. |
| B1-S6 | **B10b report-only** | 6 outbound handoffs (333, 334, 917, 918, 919, 920) carry NULL `target_domain_module_id`. Targets: GRC (×1), KMS (×1), ERP-FIN (×2), ECM (×1), AUDIT (×1). Per B10b's asymmetry rule the NULL is the target domain's B10b, not LEGAL-PRACT-MGMT's. LEGAL's own side (`source_domain_module_id`) is populated on every outbound row. handoff 332 (CLM) is fully wired. | Schedule b1 audits for GRC, KMS, ERP-FIN, ECM, AUDIT to derive the missing `target_domain_module_id` per the standard B10b backfill procedure. |
| B1-S7 | **Pairwise — missing consumer DMDOs on every LEGAL-target domain** | The cross-domain DMDO query returned ZERO rows where any non-LEGAL module declares `role IN (consumer, contributor, embedded_master)` on the 6 LEGAL-mastered data_objects. Every domain that receives LEGAL events (CLM, GRC, KMS, ERP-FIN, ECM, AUDIT) implicitly depends on `legal_matters` / `engagement_letters` / `client_invoices` / `trust_accounts` / `external_court_filings` but does not declare the dependency at the module layer. This is the reverse-direction Section-4 finding from pairwise reconciliation. Section-3 mirror (missing handoff rows for declared consumers) is moot because there are no declared consumers to mirror. | Each target domain's b1 audit should add a `consumer` DMDO row on the relevant LEGAL master where the receiving module actually reads the payload. Not LEGAL's fix to make; surfaced here so the target audits can pick it up. |

#### APQC TAGGING

Only 1 of 7 cross-domain handoffs carries a `handoff_processes` row. The existing row is `agent_curated, record_status=new` on handoff 332 → process 76 ("Manage legal and ethical issues" 11013 L2). Volume expectation per SKILL Rule H1: 0.5N to 0.8N for N=7 → 4-6 `agent_curated` proposals. 5 proposed below.

| handoff_id | source → target | trigger_event | payload | Proposed PCF (process_name / external_id) | PCF id | Confidence |
|---|---|---|---|---|---|---|
| 333 | LEGAL-TRUST-ACCT → GRC | `trust_account.exception` | `trust_accounts` | "Manage compliance" 17467 L2 OR "Operate controls and monitor compliance with internal controls policies and procedures" 21574 L3 | 70 or 325 | confident L2 (preferred 325 L3 for the day-to-day exception flow) |
| 334 | LEGAL-MATTER-MGMT → KMS | `legal_matter.closed` | `legal_matters` | "Develop and manage enterprise-wide knowledge management (KM) capability" 11073 L2 OR child | 82 | confident L2; needs PCF lookup at fix time for a tighter L3 |
| 917 | LEGAL-TIME-BILLING → ERP-FIN | `client_invoice.issued` | `client_invoices` | "Invoice customer" 10743 L3 | 302 | confident L3 |
| 918 | LEGAL-TIME-BILLING → ERP-FIN | `client_invoice.paid` | `client_invoices` | "Process accounts receivable (AR)" 10744 L3 OR "Receive/Deposit customer payments" 10800 L4 | 303 (L3 preferred) or 1356 (L4) | confident L3 |
| 919 | LEGAL-COURT-DOCKETING → ECM | `court_filing.submitted` | `external_court_filings` | "Manage Content" 21646 L2 OR "Retain records" 10878 L4 | 83 (L2) or 1440 (L4) | confident L3-ish; prefer L2 parent 83 since the record-retention activity (1440) is downstream |
| 920 | LEGAL-COURT-DOCKETING → AUDIT | `court_filing.served` | `external_court_filings` | "Manage compliance audits" 12183 L4 OR "Manage internal controls" 10735 L2 | 1570 (L4) or 61 (L2) | medium L4; the served-filing is evidence in an audit, not the audit itself |

Existing tag on handoff 332 (PCF 76 "Manage legal and ethical issues" L2): the L2 parent fits the engagement-letter-signed event but a tighter L3 child ("Negotiate and document agreements/contracts" 11052 L3 id 398) might be more precise. Surface for fix-time refinement; not a defect.

#### Bucket 1 count summary

| Finding type | Count |
| --- | --- |
| STRUCTURAL (M7 × 2, B9 event_category, B9b zero intra-domain, B8 missing cross-rels) | 4 |
| BOUNDARY (B10b NULL FK report-only + B1-S7 pairwise consumer DMDO report-only) | 2 |
| APQC TAGGING (5 high-confidence proposals + 1 refinement on existing) | 1 |
| MISSING / WRONG-OWNERSHIP / SCOPE-CREEP | 0 (these route to Bucket 3 until Phase 0 confirmation) |
| **Bucket 1 total** | 8 |

### Bucket 2 — Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **B4 pattern flag positive re-evaluation per Rule #12.** Current flags: `legal_matters.has_personal_content=true`; `crm_contacts` inherited has_personal_content=true; `trust_accounts.has_personal_content=true` + `has_submit_lock=true`; `engagement_letters.has_submit_lock=true` + `has_single_approver=true`; `client_invoices.has_submit_lock=true` + `has_single_approver=true`; `external_court_filings.has_submit_lock=true`. Open re-eval: should `conflict_checks.has_personal_content=true`? (The conflict check stores adversary names, parties' personal identifiers, ethics-wall annotations; almost certainly yes by the same rationale as `legal_matters`.) Should `external_court_filings.has_single_approver=true`? (Court filings are typically signed by a single attorney of record; the submit_lock is on, but the single-approver dimension is currently false.) | False-by-default is not the same as false-after-review. Rule #12 mandates positive re-evaluation; Rule #15 forbids recording the consideration in `notes`. | Per-flag yes/no from user; the decisions are captured in the Decisions section after user response. |
| B2-S2 | **Rule #15 notes-pollution on `skill_tools`.** 14 of 47 `skill_tools` rows for LEGAL's 5 system skills carry populated `notes` text describing the workflow context (`"Matter activation gate after engagement letter signs and conflict clears."`, `"Triggers final invoicing and retention clock."`, `"Reads gate: matter cannot open without signed engagement letter."`, etc.). Rule #15 mandates `notes` columns are empty by default and only ever populated with explicit per-row user-approved wording. Same question as in the APM 2026-05-29 audit (B2-S1 there): were these user-approved at load time, or auto-populated by the Phase-S loader? | Cannot tell from audit alone; the notes might have been explicitly approved during the Phase-S load (in which case they stay) or auto-written (in which case Rule #15 mandates revert + Incidents log entry). | (a) Confirm user-approved at load; leave in place. (b) Confirm auto-population; PATCH all 14 rows to empty string and log the Rule-#15 incident in `references/skill-changelog.md`. |
| B2-S3 | **M7 architectural intent.** B1-S1 and B1-S2 surface within-domain incoherence (master+consumer in sibling modules). The fix depends on whether the sibling modules are intended to be standalone-deployable: (a) standalone-deployable → promote to `embedded_master` (every sibling ships a local shell of the master, with the runtime demotion to consumer kicking in when the master's module is co-installed); (b) co-installed → DELETE the consumer rows (the master in 132 / 134 is authoritative; standalone deployment of LEGAL-TRUST-ACCT without LEGAL-MATTER-MGMT or LEGAL-TIME-BILLING is not supported). The market read favors (b): every flagship vendor (Clio, MyCase, Filevine, Aderant) bundles matters + billing + trust + docketing in a single SKU and does not market standalone trust-only or standalone billing-only modules. SMB practice-management is a suite market, not a la carte. | Architectural product-shape decision; the rule allows either pattern. | (a) Promote 4 consumer DMDOs to embedded_master. (b) DELETE all 4. Recommendation: (b) per market read above. |
| B2-S4 | **B11 alias-quality follow-up.** `legal_matters` aliases include "Case", "Cause", "File", "Client Matter", "Engagement". The "Engagement" alias (type `industry_term`) collides semantically with `engagement_letters` (the formal document). In some bar associations and firms an "engagement" refers to the matter; in others it refers to the engagement letter; in yet others it refers to the audit-engagement at an accounting firm. Should the `legal_matters → Engagement` alias be retained (and clarified) or dropped to reduce ambiguity? | Editorial / disambiguation call. The catalog supports multiple aliases per master with no priority axis, so both can coexist if intentional. | (a) Keep both; rely on `alias_type` and downstream UI to disambiguate. (b) Drop `legal_matters → Engagement`; keep only `engagement_letters → Letter of Engagement`. (c) Re-label the alias (e.g. `Matter Engagement`) — but `alias_name` does not carry a context column, so this is just a rename. |

### Bucket 3 — Phase 0 pending (speculative)

This audit ran without a formal Phase-0 subagent surface generation (the user dispatched directly to Validate b1). The candidates below are surfaced from the auditor's own knowledge of the law-firm software market (Clio / MyCase / Filevine / Aderant / Smokeball / PracticePanther / CosmoLex / Centerbase docs), not vetted via a separate vendor research pass.

| # | Candidate | Class | Vendor knowledge basis | Proposed home |
|---|---|---|---|---|
| B3-1 | `matter_documents` (master) | MISSING — workflow substrate | Every flagship vendor ships matter-scoped document management as a first-class master (Clio Manage Documents, MyCase Document Storage, Filevine Documents, Smokeball Auto-Forms). Currently the catalog routes legal documents through `content_documents` (id 429) consumer in ECM, which is the generic content layer. Matter-scoped document storage is a market-distinguishing primary capability per `LEGAL-DOC-MGMT` (capability 426, currently realized only by LEGAL-MATTER-MGMT module without an owned data_object). | New LEGAL master in `LEGAL-MATTER-MGMT` (132). |
| B3-2 | `key_dates` / `matter_deadlines` (master) | MISSING — workflow substrate + statutory anchor | Statute-of-limitations and key-date alerting is a core LEGAL-MATTER-MGMT capability (per the `description`) and a separate published capability `LEGAL-COURT-DOCKETING` (594). Flagships model deadlines as a first-class entity (Clio Calendar Rules, Smokeball Court Rules, CalendarRules / CompuLaw integrations). Currently `external_court_filings` events drive deadline notifications, but the deadlines themselves are not modeled. The malpractice tail in law-firm software is missed deadlines, this entity is load-bearing. | New LEGAL master split between `LEGAL-MATTER-MGMT` (132) and `LEGAL-COURT-DOCKETING` (136) — likely mastered in 136 with embedded shell in 132. |
| B3-3 | `matter_parties` (master or junction) | MISSING — workflow substrate | Every flagship vendor models parties (client, opposing counsel, co-counsel, court, judge, witness, expert) as a first-class M:N junction or master against `legal_matters`. Currently the catalog routes parties through `crm_contacts` (id 98) contributor, which loses role context (the same person can be opposing counsel on one matter and client on another). Conflict-of-interest checking (the entire LEGAL-INTAKE-CONFLICT module) cannot function correctly without explicit `matter_parties` role-typed edges. | New LEGAL junction or master in `LEGAL-MATTER-MGMT` (132); referenced by `LEGAL-INTAKE-CONFLICT` (133) for the conflict graph. |
| B3-4 | `legal_tasks` / `matter_tasks` (master) | MISSING — substrate that's currently the WORK-MGMT consumer route | Flagships ship matter-scoped task management (Clio Tasks, MyCase Tasks, Filevine Tasks, Smokeball Tasks) as a separate entity from generic project work because the legal-task vocabulary (UTBMS task codes, billable vs. non-billable, write-down rules) does not fit the WORK-MGMT generic shape. Currently no `legal_tasks` master exists; matter work is implicit in `time_entries`. | New LEGAL master in `LEGAL-MATTER-MGMT` (132); may consume from WORK-MGMT if the catalog has a generic `tasks` master worth embedding. |

**Modularization commentary:** the current 5-module shape is coherent and matches the flagship vendor surface well. Two candidate refinements worth flagging:

- **Split or extend `LEGAL-MATTER-MGMT`** with explicit `matter_documents`, `matter_parties`, `matter_deadlines`, `legal_tasks` masters (the four B3 candidates above). This pushes the module from 1 mastered entity to 5 and brings its surface in line with Clio Manage's "Matters + Documents + Contacts + Calendar + Tasks" five-pillar pattern. No module split needed; the module's scope grows along the obvious axes.
- **Consider a `LEGAL-PRACT-DOC-AUTO` starter or sub-module** for document automation and template assembly (Smokeball, HotDocs, Documate). This is the document-assembly layer above raw document storage. May warrant a separate `module_kind='starter'` or a full module split off from LEGAL-MATTER-MGMT, depending on how much template / clause-library substrate is in play.

**Adjacent markets surfaced and queued in `audits/_missing-domains.md`** (helper run for each):

| Code | Name | Why queued |
|---|---|---|
| `EDISCOVERY` | eDiscovery Platform | Relativity / Everlaw / Logikcull / DISCO / Reveal — large pure-play market touched by LEGAL-PRACT-MGMT via litigation matters but not modeled in the catalog. |
| `LEGAL-HOLD` | Legal Hold and Preservation Management | Exterro / Onna / Zapproved — preservation-of-evidence market upstream of eDiscovery; touches LEGAL-PRACT-MGMT (matter-scoped holds) and HCM (custodian identification). |
| `LEGAL-RES` | Legal Research Platform | Westlaw / LexisNexis / Bloomberg Law / Fastcase / Casetext / Vincent AI — adjacent SaaS market every law firm consumes; potential KMS-adjacent integration point. |
| `IP-MGMT` | Intellectual Property Management | Anaqua / CPA Global / IPfolio / Clarivate — patent and trademark docketing market; distinct from generic matter management. |

**Bucket 3 prompt:** vet via formal Phase 0 vendor research (a follow-up subagent producing `c:/tmp/LEGAL-PRACT-MGMT-phase0-<date>.md` with vendor entity surfaces per row across Clio / MyCase / Filevine / Aderant / Smokeball), or eyeball-mode (the user names which of the 4 missing entities to treat as confirmed and they get added via Phase B to LEGAL-MATTER-MGMT)?

The strongest signal is **B3-2 (`matter_deadlines` / `key_dates`)** — its absence is a malpractice-tail risk in the substrate, and the existing `LEGAL-COURT-DOCKETING` module realizes a capability for it without owning a data_object. If you commit to part of the work, that's the highest-leverage candidate.

### Cross-bucket dependencies

- B2-S3 (M7 architectural intent) is the **prerequisite** for B1-S1 and B1-S2: until the user picks (a) embedded_master or (b) DELETE, the structural fix cannot proceed.
- B1-S4 (B9b intra-domain handoffs) is **partially dependent** on B1-S1 / B1-S2: if the user chooses (a) embedded_master, the intra-domain handoffs may not all be needed — some lifecycle progressions are intra-module under embedded_master semantics. If (b) DELETE, every intra-domain handoff in B1-S4 is required.
- B1-S5 (B8 missing cross-domain relationships) is **independent** of Bucket 3 for the ERP-FIN and KMS sides (those domains have known masters that should be queried); the GRC side is **dependent** on confirming what GRC canonically masters.
- B1-S7 (pairwise — missing consumer DMDOs on every LEGAL-target) is **independent** of Bucket 3 but creates work for 6 other domains' audits.
- B3 candidates B3-1 through B3-4 are **independent** of each other; the user can vet any subset.

### Per-bucket prompts

**Bucket 1 — fix these now?** Reply with: `all`, or list (e.g. `S1-S4, H1-top4`), or `skip`.

- **B1-S1 / B1-S2 (M7 hard fails — DELETE 4 consumer DMDO rows OR promote to `embedded_master`):** decide B2-S3 architectural intent first.
- **B1-S3 (PATCH 4 events with empty `event_category`):** trivial; one PATCH each.
- **B1-S4 (B9b — insert 7 intra-domain cross-module handoff rows + 1 new trigger_event `conflict_check.cleared`):** depends on B2-S3 outcome.
- **B1-S5 (B8 missing cross-domain relationships):** ERP-FIN and KMS sides can ship now; GRC side gated on Bucket 3.
- **B1-S6 / B1-S7 (B10b NULL FK + pairwise consumer DMDO report-only):** schedule b1 audits for the 6 other domains; not LEGAL's fix.
- **H1 (APQC tagging — 5 high-confidence rows above, plus 1 refinement on existing PCF tag for handoff 332):** load now or in a follow-up batch?

**Bucket 2 — what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (B4 pattern flag positive re-evaluation):** per-flag yes/no on `conflict_checks.has_personal_content` and `external_court_filings.has_single_approver`.
- **B2-S2 (Rule #15 notes-pollution on 14 `skill_tools` rows):** confirm user-approved at load, or confirm auto-population; if auto, revert + incident-log.
- **B2-S3 (M7 architectural intent: embedded_master vs DELETE):** (a) or (b)? Recommendation: (b).
- **B2-S4 (B11 alias disambiguation on `legal_matters → Engagement`):** keep, drop, or rename?

**Bucket 3 — Phase 0 pending — vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball, name which of B3-1 through B3-4 ring true. The candidate adjacent domains (EDISCOVERY, LEGAL-HOLD, LEGAL-RES, IP-MGMT) are queued in `audits/_missing-domains.md` for separate triage.

### Report-only follow-ups (owed by other domains)

The following items surfaced during the audit but are not LEGAL-PRACT-MGMT's to fix. Each routes to the named domain's next b1 audit.

- **GRC b1** owes: `target_domain_module_id` on handoff 333 (B10b); a `consumer` DMDO on `trust_accounts` (391 → 392 actually 392) in whichever GRC module receives compliance exceptions (B1-S7 pairwise); a `data_object_relationships` row from `trust_accounts` to the GRC-mastered exception or compliance-issue entity (B1-S5).
- **KMS b1** owes: `target_domain_module_id` on handoff 334 (B10b); a `consumer` DMDO on `legal_matters` in the receiving KMS module (B1-S7 pairwise); a `data_object_relationships` row from `legal_matters` to the KMS knowledge-article master (B1-S5).
- **ERP-FIN b1** owes: `target_domain_module_id` on handoffs 917 and 918 (B10b); `consumer` DMDOs on `client_invoices` in the receiving ERP-FIN module (B1-S7 pairwise); `data_object_relationships` rows from `client_invoices` to the ERP-FIN general-ledger and customer-payment masters (B1-S5).
- **ECM b1** owes: `target_domain_module_id` on handoff 919 (B10b). The reverse-direction relationship `content_documents archives external_court_filings` (id 597) is already on the books; B1-S7 pairwise consumer DMDO on `external_court_filings` from an ECM module is the open item.
- **AUDIT b1** owes: `target_domain_module_id` on handoff 920 (B10b). The reverse-direction relationship `audit_findings tracks external_court_filings` (id 353) is already on the books; B1-S7 pairwise consumer DMDO on `external_court_filings` from an AUDIT module is the open item.
- **CLM b1** owes: a `consumer` or `embedded_master` DMDO on `engagement_letters` in CLM-CONTRACT-AUTHORING (or whichever CLM module receives the e-signed engagement letter to start the contract lifecycle). Handoff 332 is the only fully-wired outbound row; the consumer-side DMDO is the missing piece on the receiving side.
- **Catalog-wide gap (no specific owner yet):** `time_entries` (id 162) has `kind='domain_owned'` but **no `domain_module_data_objects.role='master'` row exists anywhere in the catalog**. It carries 3 `consumer` rows (PSA-TIME-EXPENSE, PAYROLL-RUN, PA-WORKFORCE-METRICS) and 2 `contributor` rows (LEGAL-MATTER-MGMT, LEGAL-TIME-BILLING) but the canonical master is missing. This violates Rule #11 (every `embedded_master` / consumer / contributor needs a canonical master OR `kind='platform_builtin'`). The natural canonical owner is PSA-TIME-EXPENSE (90 — already a consumer rather than a master; would need promotion). Surface to the user as a catalog-cleanup item; whichever PSA or HCM audit takes this on owes the master row promotion.
- **Adjacent-market candidates** queued in `audits/_missing-domains.md`: EDISCOVERY, LEGAL-HOLD, LEGAL-RES, IP-MGMT. Decision shape is triage on the queue file, not a per-domain audit obligation.
