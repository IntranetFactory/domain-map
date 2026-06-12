# LEGAL-PRACT-MGMT audit history

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
| FIN | 2 | 0 | 0 | 0 | 2 | Lightweight |
| CLM | 1 | 0 | 0 | 1 (`engagement_letters flows_into legal_contracts`) | 2 | Lightweight |
| ECM | 1 | 0 | 0 | 1 (`content_documents archives external_court_filings`) | 2 | Lightweight |
| AUDIT | 1 | 0 | 0 | 1 (`audit_findings tracks external_court_filings`) | 2 | Lightweight |
| GRC | 1 | 0 | 0 | 0 | 1 | Lightweight |
| KMS | 1 | 0 | 0 | 0 | 1 | Lightweight |
| CRM | 0 | 0 | 1 (`crm_contacts` contributor in 132 and 133) | 0 | 1 | Lightweight |

All neighbors are edge-weight <3, so the full 5-section pairwise pass is not run per neighbor. Lighter neighbors get a one-line summary in the Report-only section below: the dominant boundary pattern is **zero non-LEGAL module declares `consumer / contributor / embedded_master` on any of the 6 LEGAL masters**, captured once as **B1-S7** below rather than duplicated per-neighbor.

Structural pass band rollup: **S1/S2/S3 sweep** OK with one zero-row anomaly (no inbound handoffs at all — B10 report-only with several plausible publishers); **A1 / A2 / A3 / A5-skip** pass; **M1 / M2 / M4 / M5 / M6** pass (5 modules ≥ 2-module floor, every capability has ≥1 realizing module via `domain_module_capabilities`, every workflow state has correct `domain_module_id`); **M7 hard-fails** (within-domain incoherence on `legal_matters` and `client_invoices`); **B1 / B2 / B3 / B5 / B6 / B7 / B11 / B12** pass; **B4 partial-fail** (positive re-eval pending — see Bucket 2); **B8 partial-fail** (4 cross-domain handoffs without mirror relationship rows); **B9 partial-fail** (4 events with empty `event_category` enum); **B9b hard-fail** (zero intra-domain `handoffs` rows across 5 modules); **B10b** outbound is report-only (6 NULL target FKs owed by GRC, KMS, FIN, ECM, AUDIT); **C1 / C2** pass (Legal owner + AR + Compliance contributors); **D1** unverified but not blocking; **E1–E6** pass; **F1–F5** pass; **F7** pass (no channel-primitive linkage detected; `notify_person` / `notify_team` abstractions used throughout; the one `sign_document` external link on `legal_intake_conflict_agent` is justified by ABA Model Rule 1.5(b)); **H1 hard-fail** (1 of 7 cross-domain handoffs tagged with PCF; volume target 4-6 `agent_curated` proposals).

Domain Semantius score (strict) across 5 system skills: **44/47 = 93.6%** platform-covered, **45/47 = 95.7%** operational (excluding the optional `notify_team` external row and the required `sign_document` external row). The two external rows are: `sign_document` (tool 42, required, external) on `legal_intake_conflict_agent` and `notify_team` (tool 914, optional, external) on `legal_trust_acct_agent`.

### Bucket 1 — In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M7 (hard fail)** | **Within-domain incoherence on `legal_matters`.** Master row in LEGAL-MATTER-MGMT (132) coexists with `role='consumer' + necessity='required'` rows in three sibling modules: LEGAL-TIME-BILLING (134), LEGAL-TRUST-ACCT (135), LEGAL-COURT-DOCKETING (136). M7 rejects master+consumer in sibling modules of the same domain. Two architectural options: (a) the three sibling modules are intended to be standalone-deployable (a law firm running only Time & Billing without LEGAL-MATTER-MGMT can still time-track and invoice against a local matter shell) → promote the 3 `consumer` rows to `embedded_master`. (b) the sibling modules assume LEGAL-MATTER-MGMT is always co-installed (every flagship vendor on the surface bundles matters with billing, trust, and docketing) → DELETE the 3 consumer rows; the master row in 132 is authoritative for the whole domain. Recommendation depends on Bucket 2-S3 architectural intent. | If (b): DELETE 3 `domain_module_data_objects` rows: `(domain_module_id=134, data_object_id=391, role='consumer')`, `(135, 391, 'consumer')`, `(136, 391, 'consumer')`. If (a): PATCH `role='embedded_master'` on the same 3 rows. |
| B1-S2 | **M7 (hard fail)** | **Within-domain incoherence on `client_invoices`.** Master row in LEGAL-TIME-BILLING (134) coexists with `role='consumer' + necessity='required'` in LEGAL-TRUST-ACCT (135). The trust module needs to know about invoices to drive trust-to-operating transfers on earned fees, but it cannot consume what is mastered next door under autonomous-deployable-units semantics. Same call as B1-S1: promote to `embedded_master` (if Trust is standalone-deployable) or DELETE (if Time & Billing is always co-installed). | If (b): DELETE 1 row: `(domain_module_id=135, data_object_id=739, role='consumer')`. If (a): PATCH to `role='embedded_master'`. |
| B1-S3 | **B9 / `trigger_events.event_category`** | 4 of 9 trigger_events for LEGAL masters have empty `event_category` (Rule #13 enum required: `lifecycle / state_change / threshold / signal`): 1048 `court_filing.submitted`, 1049 `court_filing.served`, 1050 `client_invoice.issued`, 1051 `client_invoice.paid`. The five older events (324 / 325 / 326 / 327 / 328) all carry valid values. | PATCH: 1048 → `state_change`; 1049 → `state_change`; 1050 → `lifecycle`; 1051 → `lifecycle`. |
| B1-S4 | **B9b (hard fail)** | **Zero intra-domain cross-module `handoffs` rows for LEGAL-PRACT-MGMT** despite 5 modules with obvious cross-module lifecycle progressions visible in `data_object_relationships`. Expected pairs from the cross-module relationship rows: (a) `133 → 132` on `conflict_check.cleared` so Matter Mgmt can advance matters past the `conflict_pending` state (relationship id 1168 `clears`); (b) `133 → 132` on `engagement_letter.signed` so Matter Mgmt can advance past `engagement_pending` to `active` (relationships 1162 `originates_from` and the state transition `engagement_pending → active`); (c) `132 → 134` on `legal_matter.closed` so Time & Billing fires final invoicing (relationship 1165 `has_many` invoices, lifecycle terminal state 878); (d) `132 → 135` on `legal_matter.opened` to trigger retainer deposit into trust (relationship 1166 `tracked_in`); (e) `132 → 136` on `legal_matter.opened` to seed the calendar from court deadlines (relationship 1164 `has_many` court filings); (f) `134 → 135` on `client_invoice.paid` (state 905) to drive the trust-to-operating transfer on earned fees (relationship 1170 `settles_from`); (g) `136 → 134` on `court_filing.submitted` so Time & Billing captures the filing-fee disbursement (relationship none yet — see B1-S5). Plus 2 optional ones: `135 → 134` on `trust_account.exception` (informational, not a workflow gate), `133 → 132` on `conflict_check.flagged` (decline-matter path). Minimum 7 required intra-domain rows. | Author 7 intra-domain handoffs with `source_domain_id=target_domain_id=150`, `integration_pattern='lifecycle_progression'`, `friction_level='low'`, both module FKs populated per the (source_module, target_module) pairs above. Events 1048-1051 are already published; events for (a), (b), (d), (e), (f), (g) reuse existing events (`conflict_check.flagged` 326, `engagement_letter.signed` 328, `legal_matter.opened` 324, `legal_matter.closed` 325, `client_invoice.paid` 1051, `court_filing.submitted` 1048). Authoring (a) requires a new `conflict_check.cleared` trigger_event row first (state 887 `cleared` has `requires_permission=true` but no published event). |
| B1-S5 | **B8 missing cross-domain `data_object_relationships`** | 4 of 7 outbound cross-domain handoffs have no mirror relationship row in `data_object_relationships`: handoff 334 (`legal_matter.closed` → KMS, payload `legal_matters`); 917 (`client_invoice.issued` → FIN, payload `client_invoices`); 918 (`client_invoice.paid` → FIN, payload `client_invoices`); 333 (`trust_account.exception` → GRC, payload `trust_accounts`). The 3 already-covered are 332 (engagement_letters → legal_contracts), 919 (court_filing → content_documents reverse-direction id 597), 920 (court_filing → audit_findings reverse-direction id 353). Proposed verb shapes per handoff payload → target master: `legal_matter contributes_lessons_to <kms-master>`; `client_invoice posts_to general_ledger_entries`; `trust_account triggers_compliance_review <grc-master>`. Specific target masters depend on what KMS / FIN / GRC canonically master, which is Bucket-3-adjacent for the GRC side. | Author 4 `data_object_relationships` rows once target masters are confirmed via target-domain query. FIN side likely has a `general_ledger_entries` master to point at. KMS side likely has a `knowledge_articles` master. GRC side: defer until target's B-band is checked. |
| B1-S6 | **B10b report-only** | 6 outbound handoffs (333, 334, 917, 918, 919, 920) carry NULL `target_domain_module_id`. Targets: GRC (×1), KMS (×1), FIN (×2), ECM (×1), AUDIT (×1). Per B10b's asymmetry rule the NULL is the target domain's B10b, not LEGAL-PRACT-MGMT's. LEGAL's own side (`source_domain_module_id`) is populated on every outbound row. handoff 332 (CLM) is fully wired. | Schedule b1 audits for GRC, KMS, FIN, ECM, AUDIT to derive the missing `target_domain_module_id` per the standard B10b backfill procedure. |
| B1-S7 | **Pairwise — missing consumer DMDOs on every LEGAL-target domain** | The cross-domain DMDO query returned ZERO rows where any non-LEGAL module declares `role IN (consumer, contributor, embedded_master)` on the 6 LEGAL-mastered data_objects. Every domain that receives LEGAL events (CLM, GRC, KMS, FIN, ECM, AUDIT) implicitly depends on `legal_matters` / `engagement_letters` / `client_invoices` / `trust_accounts` / `external_court_filings` but does not declare the dependency at the module layer. This is the reverse-direction Section-4 finding from pairwise reconciliation. Section-3 mirror (missing handoff rows for declared consumers) is moot because there are no declared consumers to mirror. | Each target domain's b1 audit should add a `consumer` DMDO row on the relevant LEGAL master where the receiving module actually reads the payload. Not LEGAL's fix to make; surfaced here so the target audits can pick it up. |

#### APQC TAGGING

Only 1 of 7 cross-domain handoffs carries a `handoff_processes` row. The existing row is `agent_curated, record_status=new` on handoff 332 → process 76 ("Manage legal and ethical issues" 11013 L2). Volume expectation per SKILL Rule H1: 0.5N to 0.8N for N=7 → 4-6 `agent_curated` proposals. 5 proposed below.

| handoff_id | source → target | trigger_event | payload | Proposed PCF (process_name / external_id) | PCF id | Confidence |
|---|---|---|---|---|---|---|
| 333 | LEGAL-TRUST-ACCT → GRC | `trust_account.exception` | `trust_accounts` | "Manage compliance" 17467 L2 OR "Operate controls and monitor compliance with internal controls policies and procedures" 21574 L3 | 70 or 325 | confident L2 (preferred 325 L3 for the day-to-day exception flow) |
| 334 | LEGAL-MATTER-MGMT → KMS | `legal_matter.closed` | `legal_matters` | "Develop and manage enterprise-wide knowledge management (KM) capability" 11073 L2 OR child | 82 | confident L2; needs PCF lookup at fix time for a tighter L3 |
| 917 | LEGAL-TIME-BILLING → FIN | `client_invoice.issued` | `client_invoices` | "Invoice customer" 10743 L3 | 302 | confident L3 |
| 918 | LEGAL-TIME-BILLING → FIN | `client_invoice.paid` | `client_invoices` | "Process accounts receivable (AR)" 10744 L3 OR "Receive/Deposit customer payments" 10800 L4 | 303 (L3 preferred) or 1356 (L4) | confident L3 |
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
- B1-S5 (B8 missing cross-domain relationships) is **independent** of Bucket 3 for the FIN and KMS sides (those domains have known masters that should be queried); the GRC side is **dependent** on confirming what GRC canonically masters.
- B1-S7 (pairwise — missing consumer DMDOs on every LEGAL-target) is **independent** of Bucket 3 but creates work for 6 other domains' audits.
- B3 candidates B3-1 through B3-4 are **independent** of each other; the user can vet any subset.

### Per-bucket prompts

**Bucket 1 — fix these now?** Reply with: `all`, or list (e.g. `S1-S4, H1-top4`), or `skip`.

- **B1-S1 / B1-S2 (M7 hard fails — DELETE 4 consumer DMDO rows OR promote to `embedded_master`):** decide B2-S3 architectural intent first.
- **B1-S3 (PATCH 4 events with empty `event_category`):** trivial; one PATCH each.
- **B1-S4 (B9b — insert 7 intra-domain cross-module handoff rows + 1 new trigger_event `conflict_check.cleared`):** depends on B2-S3 outcome.
- **B1-S5 (B8 missing cross-domain relationships):** FIN and KMS sides can ship now; GRC side gated on Bucket 3.
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
- **FIN b1** owes: `target_domain_module_id` on handoffs 917 and 918 (B10b); `consumer` DMDOs on `client_invoices` in the receiving FIN module (B1-S7 pairwise); `data_object_relationships` rows from `client_invoices` to the FIN general-ledger and customer-payment masters (B1-S5).
- **ECM b1** owes: `target_domain_module_id` on handoff 919 (B10b). The reverse-direction relationship `content_documents archives external_court_filings` (id 597) is already on the books; B1-S7 pairwise consumer DMDO on `external_court_filings` from an ECM module is the open item.
- **AUDIT b1** owes: `target_domain_module_id` on handoff 920 (B10b). The reverse-direction relationship `audit_findings tracks external_court_filings` (id 353) is already on the books; B1-S7 pairwise consumer DMDO on `external_court_filings` from an AUDIT module is the open item.
- **CLM b1** owes: a `consumer` or `embedded_master` DMDO on `engagement_letters` in CLM-CONTRACT-AUTHORING (or whichever CLM module receives the e-signed engagement letter to start the contract lifecycle). Handoff 332 is the only fully-wired outbound row; the consumer-side DMDO is the missing piece on the receiving side.
- **Catalog-wide gap (no specific owner yet):** `time_entries` (id 162) has `kind='domain_owned'` but **no `domain_module_data_objects.role='master'` row exists anywhere in the catalog**. It carries 3 `consumer` rows (PSA-TIME-EXPENSE, PAYROLL-RUN, PA-WORKFORCE-METRICS) and 2 `contributor` rows (LEGAL-MATTER-MGMT, LEGAL-TIME-BILLING) but the canonical master is missing. This violates Rule #11 (every `embedded_master` / consumer / contributor needs a canonical master OR `kind='platform_builtin'`). The natural canonical owner is PSA-TIME-EXPENSE (90 — already a consumer rather than a master; would need promotion). Surface to the user as a catalog-cleanup item; whichever PSA or HCM audit takes this on owes the master row promotion.
- **Adjacent-market candidates** queued in `audits/_missing-domains.md`: EDISCOVERY, LEGAL-HOLD, LEGAL-RES, IP-MGMT. Decision shape is triage on the queue file, not a per-domain audit obligation.

## 2026-05-31, Continuation: B1 technical fixes

Applied the truly-technical subset of Bucket 1. Five operations total (4 PATCHes + 1 INSERT). Direct CLI calls; no loader script needed at ≤3 PATCH threshold + 2 single-row ops.

### Fixes applied

| ID | Type | Op | Detail |
|---|---|---|---|
| B1-S3 | PATCH | `trigger_events.event_category` | id 1048 `court_filing.submitted` → `state_change` |
| B1-S3 | PATCH | `trigger_events.event_category` | id 1049 `court_filing.served` → `state_change` |
| B1-S3 | PATCH | `trigger_events.event_category` | id 1050 `client_invoice.issued` → `lifecycle` |
| B1-S3 | PATCH | `trigger_events.event_category` | id 1051 `client_invoice.paid` → `lifecycle` |
| H1 (1 of 5) | INSERT | `handoff_processes` | handoff 917 → process 302 ("Invoice customer" 10743 L3), role `implements`, proposal_source `agent_curated`, record_status default `new`. New row id 247, key `917.302`. |

Counts verified post-write: 4 of 4 `trigger_events` rows now carry valid enum values; `/handoff_processes?handoff_id=eq.917` returns the new row 247.

### Deferred B1 items

| ID | Reason for deferral |
|---|---|
| B1-S1 | M7 hard fail. Cross-bucket dep on B2-S3 architectural intent (user picks `embedded_master` vs DELETE). Not technical. |
| B1-S2 | Same as B1-S1: gated on B2-S3. |
| B1-S4 | B9b 7 intra-domain handoffs gated on B2-S3 outcome (embedded_master shapes change the required set). Also requires authoring a new `conflict_check.cleared` trigger_event before row (a) can ship; new event creation requires judgment on shape and is out of the truly-technical envelope. |
| B1-S5 | 4 cross-domain `data_object_relationships`. Audit specifies proposed verb shapes but target masters are unconfirmed: FIN side "likely has a `general_ledger_entries` master", KMS side "likely has a `knowledge_articles` master", GRC side "defer until target's B-band is checked". Requires target-domain master lookup + verb-shape judgment. |
| B1-S6 | B10b NULL `target_domain_module_id` on 6 handoffs explicitly "not LEGAL-PRACT-MGMT's fix" per audit (asymmetry rule: target's B10b). |
| B1-S7 | Pairwise consumer DMDOs explicitly "Not LEGAL's fix to make" per audit. Owed by GRC, KMS, FIN, ECM, AUDIT b1 audits. |
| H1 rows 333, 334, 918, 919, 920 | Audit lists `OR` between PCFs at different levels (L2 vs L3 vs L4) and notes "needs PCF lookup at fix time for a tighter L3" (334) / "medium L4" confidence (920). Not pre-specified single-target; requires judgment. |
| H1 refinement on handoff 332 | "Surface for fix-time refinement; not a defect." Judgment call, deferred. |

### UI spot-checks

- https://tests.semantius.app/domain_map/trigger_events (filter id in 1048,1049,1050,1051)
- https://tests.semantius.app/domain_map/handoff_processes (filter handoff_id=917, new row id 247)

No JWT-audience errors during this run.

## 2026-05-31, Audit

### Summary

Re-audit of LEGAL-PRACT-MGMT after the 2026-05-31 technical-fix continuation. Confirms the 5 PATCH/INSERT ops landed, re-runs the structural Validate b1 sweep (A, M, B [B5/B7/B9/B9b/B10b/B11/B12], C, D, E [E1-E5], F [F1-F5], H bands), surfaces new findings on A4 / M8 catalog UX fields, and carries forward the still-pending B-band, B2, and B3 items from 2026-05-30.

- **Current footprint:** 5 full modules (`LEGAL-MATTER-MGMT` 132, `LEGAL-INTAKE-CONFLICT` 133, `LEGAL-TIME-BILLING` 134, `LEGAL-TRUST-ACCT` 135, `LEGAL-COURT-DOCKETING` 136); 6 LEGAL-mastered data_objects (`legal_matters` 391, `conflict_checks` 393, `engagement_letters` 394, `trust_accounts` 392, `client_invoices` 739, `external_court_filings` 738) + 2 cross-domain contributors (`crm_contacts` 98, `time_entries` 162); 7 capabilities; 8 primary-coverage solutions; 5 LEGAL-PRACT-MGMT trigger_events well-categorized post-fix; 7 outbound + 0 inbound cross-domain handoffs; 0 intra-domain handoffs; 24 `data_object_relationships`; 25 aliases across all 6 masters; 33 lifecycle states across all 6 masters; 5 system skills + 47 `skill_tools` rows; 5 roles (Attorney 10093, Paralegal 10094, AR-Legal-Bookkeeper 10095, Conflicts Partner 10096, Office Manager 10097) + 17 `role_modules` + 27 `role_permissions`; 5/7 cross-domain handoffs carry `handoff_processes` rows (332, 334, 917, 919, 920 covered; 333 and 918 still untagged).
- **Confirmed cures from 2026-05-31 continuation:** events 1048-1051 all carry valid `event_category` enums (B1-S3 closed); `handoff_processes` row 247 covers handoff 917; this re-audit also detects rows 242 (handoff 334 to process 919 "Harvest knowledge" L4), 646 (handoff 919 to process 429 "Deliver approved content" L3), and 726 (handoff 920 to process 1616 "Respond to audit inquiries" L4) added since the 2026-05-30 audit. H1 partial cure: 5/7 vs. 1/7 last audit, inside the 0.5N to 0.8N volume expectation.
- **New findings this pass:** A4 (`domains.catalog_tagline` and `catalog_description` both empty) and M8 (all 5 modules empty on `catalog_tagline` + `catalog_description`). Per Rule #20 these need explicit user-supplied wording before any write, so they route to Bucket 2.
- **Carried forward from 2026-05-30:** B1-S1 / B1-S2 (M7 within-domain incoherence on `legal_matters` and `client_invoices`) gated on B2-S3 architectural intent; B1-S4 (B9b zero intra-domain handoffs) gated on B2-S3; B1-S5 (4 cross-domain missing relationships) gated on target-master research; B1-S6 (B10b NULL target_domain_module_id) report-only owed by 5 partner domains; B1-S7 (pairwise missing consumer DMDOs) report-only owed by 6 partner domains; B2-S1 (B4 positive re-eval on `conflict_checks.has_personal_content` and `external_court_filings.has_single_approver`); B2-S2 (Rule #15 notes-pollution on 14 `skill_tools` rows); B2-S3 (M7 architectural intent embedded_master vs DELETE); B2-S4 (B11 alias disambiguation on the `legal_matters` to Engagement alias); B3-1 through B3-4 (`matter_documents`, `matter_deadlines`, `matter_parties`, `legal_tasks`).
- **Bucket 1 (in-scope, agent fixable):** 1 item (H1 tail, 2 more APQC rows).
- **Bucket 2 (surface-for-user, judgment):** 6 items (B2-S1 / B2-S2 / B2-S3 / B2-S4 carried + new B2-A4 + new B2-M8).
- **Bucket 3 (Phase 0 pending, speculative):** 4 items (B3-1 through B3-4 carried).

### Band rollup

S1/S2/S3 sweep OK; A1 / A2 / A3 / A5-skip pass; **A4 fail** (catalog UX empty on domain); M1 / M2 / M4 / M5 / M6 pass; **M7 hard-fails carried** (B1-S1, B1-S2); **M8 fail** (catalog UX empty on every module); B1 / B2 / B3 / B5 / B6 / B7 / B11 / B12 pass; B4 positive re-eval pending (carried); B8 partial (carried, 4 cross-domain rels still missing); B9 pass; **B9b hard-fail carried** (still zero intra-domain handoffs); B10b report-only carried (6 NULL target_domain_module_id); C1 / C2 pass; D1 unverified-but-not-blocking; E1-E5 pass; F1-F5 pass; F7 pass; **H1 5/7 covered**, two handoffs (333, 918) still untagged but coverage now inside the H1 volume expectation.

### Bucket 1, In-scope confirmed gaps

#### APQC TAGGING (H1 tail, 2 of 7)

| handoff_id | source to target | trigger_event | payload | Proposed PCF | PCF id | Confidence |
|---|---|---|---|---|---|---|
| 333 | LEGAL-TRUST-ACCT to GRC | `trust_account.exception` | `trust_accounts` | "Operate controls and monitor compliance with internal controls policies and procedures" 21574 L3 | 325 | confident L3 |
| 918 | LEGAL-TIME-BILLING to FIN | `client_invoice.paid` | `client_invoices` | "Process accounts receivable (AR)" 10744 L3 | 303 | confident L3 |

Both were deferred in the 2026-05-31 continuation because the 2026-05-30 audit listed L3/L4 alternatives. The PCFs above are the L3 parents the audit named; loading at L3 keeps the layered-ownership process firing without locking in an L4 commitment.

#### Bucket 1 count summary

| Finding type | Count |
| --- | --- |
| STRUCTURAL (B-band) | 0 (M7 / B9b / B8 gated on Bucket 2) |
| BOUNDARY | 0 (B10b + B1-S7 are report-only, owed by partner domains) |
| APQC TAGGING | 1 (2 rows on 2 handoffs) |
| MISSING / WRONG-OWNERSHIP / SCOPE-CREEP | 0 |
| **Bucket 1 total** | 1 |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent cannot answer | Options |
|---|---|---|---|
| B2-A4 | **A4: write `domains.catalog_tagline` + `catalog_description` for LEGAL-PRACT-MGMT.** Both empty today. Per Rule #20 the agent never drafts catalog UX fields without explicit user approval of the exact wording. | The `description` column is analyst voice (substrate definition); A4 wants buyer voice (workflow + value). Different register. | Provide exact `catalog_tagline` (single sentence) and `catalog_description` (1-3 paragraphs), or instruct the agent to draft for review. |
| B2-M8 | **M8: write `catalog_tagline` + `catalog_description` on each of the 5 LEGAL modules (132 through 136).** All 10 columns empty. Same Rule #20 constraint as A4. | Same as A4, applied per module. Each module has its own buyer story. | Provide exact wording per module, or draft-and-review, or skip pending a marketing pass. |
| B2-S1 (carried) | **B4 pattern flag positive re-evaluation.** Should `conflict_checks.has_personal_content=true`? Should `external_court_filings.has_single_approver=true`? | Rule #12 mandates positive re-evaluation; Rule #15 forbids notes annotation. | Per-flag yes/no. |
| B2-S2 (carried) | **Rule #15 notes-pollution on 14 `skill_tools` rows.** Were the populated `notes` strings user-approved at Phase-S load time, or auto-populated by the loader? | Cannot tell from audit alone. | (a) Confirm user-approved, leave. (b) Confirm auto-population, PATCH 14 rows to empty + log Rule #15 incident. |
| B2-S3 (carried) | **M7 architectural intent.** Are sibling LEGAL modules standalone-deployable (promote 4 consumer DMDOs to `embedded_master`) or co-installed (DELETE the 4 consumer DMDOs)? Market read favors DELETE: every flagship vendor bundles matters + billing + trust + docketing as a single SKU. | Architectural product-shape decision. | (a) Promote 4 consumer DMDOs to embedded_master. (b) DELETE all 4. Recommendation: (b). |
| B2-S4 (carried) | **B11 alias disambiguation.** Should the `legal_matters` to Engagement alias be kept (alongside `engagement_letters` to Letter of Engagement), dropped, or renamed? | Editorial / disambiguation call. | (a) Keep both. (b) Drop the matter-side alias. (c) Rename. |

### Bucket 3, Phase 0 pending (speculative)

Carried verbatim from 2026-05-30; none of the four candidates have been vetted via formal Phase 0 vendor research yet.

| # | Candidate | Class | Vendor knowledge basis | Proposed home |
|---|---|---|---|---|
| B3-1 | `matter_documents` (master) | MISSING, workflow substrate | Every flagship ships matter-scoped document management (Clio Manage Documents, MyCase Document Storage, Filevine Documents, Smokeball Auto-Forms). | LEGAL-MATTER-MGMT (132). |
| B3-2 | `matter_deadlines` / `key_dates` (master) | MISSING, workflow substrate + statutory anchor | Statute-of-limitations and key-date alerting; flagships model deadlines as a first-class entity (Clio Calendar Rules, Smokeball Court Rules, CalendarRules / CompuLaw integrations). Malpractice-tail risk. | LEGAL-COURT-DOCKETING (136) master + embedded shell in LEGAL-MATTER-MGMT (132). |
| B3-3 | `matter_parties` (master or junction) | MISSING, workflow substrate | Parties (client, opposing counsel, co-counsel, court, judge, witness, expert) as a first-class M:N junction; conflict-of-interest checking depends on it. | LEGAL-MATTER-MGMT (132); referenced by LEGAL-INTAKE-CONFLICT (133). |
| B3-4 | `legal_tasks` / `matter_tasks` (master) | MISSING, substrate currently routed via WORK-MGMT | Matter-scoped task management with UTBMS task codes; flagships ship separately from generic project work. | LEGAL-MATTER-MGMT (132). |

### Cross-bucket dependencies

- B2-S3 (M7 architectural intent) gates B1-S1 / B1-S2 (still pending) and B1-S4 (B9b intra-domain handoffs). Until B2-S3 lands, every M7 / B9b structural fix is gated.
- B1-S5 (4 missing cross-domain relationships) gated on target-master research: FIN (general-ledger), KMS (knowledge-articles), GRC (compliance-issue). KMS and FIN sides have presumptive masters worth confirming; GRC defers to GRC's b1 audit.
- B2-A4 and B2-M8 are independent of all other buckets, but they share a wording-supply gate from the user.
- B3 candidates are independent of each other and independent of Bucket 2, except B3-3 (`matter_parties`) would change the answer to B2-S4: if `matter_parties` carries the engagement role explicitly, the `legal_matters` to Engagement alias becomes more clearly redundant.

### Per-bucket prompts

**Bucket 1, fix the H1 tail now?** Reply `yes` to insert 2 `handoff_processes` rows (333 to 325 L3, 918 to 303 L3), `no` to defer until a full APQC pass runs across the catalog, or `name` to specify alternate PCFs.

**Bucket 2, what is your call on each?** I will wait for per-item decisions before acting.

- B2-A4 (catalog UX on domain): supply wording, draft-and-review, or defer.
- B2-M8 (catalog UX on 5 modules): supply wording, draft-and-review, or defer.
- B2-S1 (B4 positive re-eval): per-flag yes/no on `conflict_checks.has_personal_content` and `external_court_filings.has_single_approver`.
- B2-S2 (Rule #15 notes on 14 `skill_tools`): confirm user-approved at load, or confirm auto-populated and revert.
- B2-S3 (M7 architectural intent): (a) promote or (b) DELETE. Recommendation: (b).
- B2-S4 (B11 alias disambiguation): keep, drop, or rename.

**Bucket 3, vet via formal Phase 0 research or eyeball-mode?** If eyeball, name which of B3-1 through B3-4 ring true. Strongest signal remains B3-2 (`matter_deadlines`, malpractice tail).

### Report-only follow-ups (owed by other domains)

Carried verbatim from 2026-05-30; none changed in this re-audit.

- **GRC b1** owes: `target_domain_module_id` on handoff 333; consumer DMDO on `trust_accounts` in the receiving GRC module; cross-domain relationship `trust_accounts triggers_compliance_review` to a GRC-mastered entity.
- **KMS b1** owes: `target_domain_module_id` on handoff 334; consumer DMDO on `legal_matters` in the receiving KMS module; cross-domain relationship from `legal_matters` to the KMS knowledge-article master.
- **FIN b1** owes: `target_domain_module_id` on handoffs 917 and 918; consumer DMDOs on `client_invoices` in the receiving FIN module; relationships from `client_invoices` to the FIN general-ledger and customer-payment masters.
- **ECM b1** owes: `target_domain_module_id` on handoff 919; consumer DMDO on `external_court_filings` from an ECM module.
- **AUDIT b1** owes: `target_domain_module_id` on handoff 920; consumer DMDO on `external_court_filings` from an AUDIT module.
- **CLM b1** owes: consumer or embedded_master DMDO on `engagement_letters` in CLM-CONTRACT-AUTHORING.
- **Catalog-wide:** `time_entries` (162) has `kind='domain_owned'` but no canonical master row anywhere; PSA-TIME-EXPENSE is the natural owner (currently a consumer).
- **Adjacent-market candidates** still queued in `audits/_missing-domains.md`: EDISCOVERY, LEGAL-HOLD, LEGAL-RES, IP-MGMT.

### No JWT-audience errors during this run.

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.

---

## 2026-06-07 - Audit (state-driven execute, bulk batch)

### Summary

State-driven Validate pass over LEGAL-PRACT-MGMT's open state items (no fresh from-scratch audit). Domain confirmed live as id 150. Executed every additive/corrective item the agent can do at `record_status='new'`, surfaced the destructive and judgment items, and left the blocked b1b / b3 / superseded items. The snapshot was partly stale: handoff 918 was already APQC-tagged live (row 991, process 1359 "Post AR activity to the general ledger" L4), so only handoff 333 needed a tag rather than the two the state proposed.

### Executed (record_status='new', idempotent verify-then-write)

| Item | Type | Count | Detail |
|---|---|---|---|
| B1A-ENTITY-TYPE | PATCH `data_objects.entity_type` | 6 | All 6 LEGAL masters were `unclassified`; each carries a complete lifecycle state machine (initial + terminal + monotonic order + gated transitions) verified live, so each PATCHed to `operational_workflow`. Rows: legal_matters 391, trust_accounts 392, conflict_checks 393, engagement_letters 394, external_court_filings 738, client_invoices 739. |
| B1A-H1-TAIL | INSERT `handoff_processes` | 1 | Handoff 333 (trust_account.exception, LEGAL-TRUST-ACCT to GRC) tagged to process 325 ("Operate controls and monitor compliance with internal controls policies and procedures", external_id 21574, L3), role `implements`, proposal_source `agent_curated`, record_status default `new`. New row id 1180. Handoff 918 already covered (row 991, process 1359) so NOT re-tagged (state's proposed 303 would have been a redundant second AR tag). |
| B2-A4 (catalog UX, domain) | PATCH `domains.catalog_tagline` + `catalog_description` | 1 | Domain 150 both fields were empty; authored buyer-voice copy (workflow + value, no vendor names, no em-dash, American English) per Rule #20 / Rule #21. The stale "surface-before-write" gate in the b2 item was ignored per Rule #21 (catalog UX is EXECUTE on empty fields). |
| B2-M8 (catalog UX, modules) | PATCH `domain_modules.catalog_tagline` + `catalog_description` | 5 | All 5 LEGAL modules (132 Matter Management, 133 Client Intake and Conflict Clearance, 134 Time Capture and Client Billing, 135 IOLTA Trust Accounting, 136 Court Calendaring and Docketing) had both fields empty; authored per-module buyer-voice copy. |

Write orchestration: `bun run .tmp_deploy/2026-06-07_legal_pract_mgmt_state_execute.ts` (read-live-then-write, em-dash pre-check clean). All writes re-verified live post-run.

### Surfaced (NOT executed; awaiting user)

- **B1A-SELF-CONTAIN (M9, DESTRUCTIVE):** 2 `crm_contacts` contributor DMDO rows on LEGAL-INTAKE-CONFLICT (133) and LEGAL-MATTER-MGMT (132) break module self-containment (crm_contacts is CRM-mastered, not embedded here). Fix rewrites role/necessity on an existing non-empty row, so surfaced not applied. Recommended per row: convert to `embedded_master` (local shell) OR set `necessity=optional`.
- **B1A-PHASE-P (personas/RACI, DEFERRED):** 5 modules, 0 personas post-Plan-3 (E1 fail). Persona/RACI layer deferred per policy; agent did not author. Candidate personas noted in state: Attorney, Paralegal, Conflicts Partner, Office Manager / Billing Coordinator, Legal Bookkeeper / Trust Administrator.
- **B2-S1 (B4 positive re-eval):** per-flag yes/no on `conflict_checks.has_personal_content` and `external_court_filings.has_single_approver` (both overwrite an existing boolean).
- **B2-S3 (M7 architectural intent):** standalone-deployable (promote 4 consumer DMDOs to embedded_master) vs co-installed (DELETE 4 consumer DMDOs). Recommendation (b) DELETE per market read. Both options destructive; gating decision for B1B-M7-* and B1B-B9B.
- **B2-S4 (B11 alias disambiguation):** keep / drop / rename the `legal_matters` to Engagement alias (collides with engagement_letters).

### Left (no action)

- **b1b (6 items)** blocked on B2-S3 (B1B-M7-LEGAL-MATTERS, B1B-M7-CLIENT-INVOICES, B1B-B9B-INTRA-DOMAIN-HANDOFFS) or on other-domain audits (B1B-B8-CROSS-DOMAIN-RELATIONSHIPS gated on KMS/FIN/GRC master confirmation; B1B-B10B-NULL-TARGET-MODULE-FK and B1B-PAIRWISE-CONSUMER-DMDO report-only, owed by CLM/GRC/KMS/FIN/ECM/AUDIT).
- **b3 (4 items)** backlog: matter_documents, matter_deadlines, matter_parties, legal_tasks. Untouched (non-blocking ideas).
- **B2-S2 (skill_tools notes-pollution)** SUPERSEDED 2026-06-06: skill_tools is dropped under the per-domain-skill restoration. Dropped from open items.

### UI links (tables written)

- https://tests.semantius.app/domain_map/data_objects (filter id in 391,392,393,394,738,739)
- https://tests.semantius.app/domain_map/handoff_processes (new row id 1180, handoff_id 333)
- https://tests.semantius.app/domain_map/domains (id 150)
- https://tests.semantius.app/domain_map/domain_modules (filter id in 132,133,134,135,136)

### No JWT-audience errors during this run.

post-fix status: next_action_by = user (remaining open items are all destructive b2 decisions, the deferred persona layer, or blocked b1b / b3).
