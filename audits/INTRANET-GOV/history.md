# INTRANET-GOV — audit history

## 2026-06-10 — Audit (first review under schema v2)

Domain id 171, "Intranet Governance". Built earlier the same day as a deliberately-thin
white-space MVP (a platform-agnostic governance overlay over existing intranets; build
evidence at `.tmp_deploy/INTRANET-GOV-phase0-2026-06-10.md`). 2 full modules: INTGOV-INVENTORY
(335), INTGOV-GOVERNANCE (336). No prior audit directory existed; this is the first pass.

### Summary

Structurally the domain is in strong shape. The S/A/M/B/C/E/F bands pass; the only structural
fixes needed were one untagged cross-domain handoff (H1) and an empty `domain_regulations`
despite an Accessibility Governance capability. Both were executed this pass (`record_status='new'`).
The substantive output is the market (semantic) pass: the MVP is thinner than the flagship
substrate in three related places (recertification-campaign + policy engine, first-class findings,
statute-anchored accessibility conformance). Those are depth decisions for the user (b2), grounded
in `.tmp_deploy/INTRANET-GOV-market-surface-2026-06-10.md`.

### Bands run (structural pass)

- **S1-S3 (coverage sweep):** FK coverage healthy. business_function_domains 4, capability_domains 8,
  domain_modules 2, solution_domains 6, skills 1 (domain-grain system skill), handoffs present.
  `domain_regulations` was 0 (fixed below). Per-module and per-master indirect coverage clean.
- **A1 metadata:** all 7 business-metadata fields populated (crud_percentage 70, min_org_size
  `30 m <2500`, cost_band `$$`, usa_market_size_usd_m 120 / 2025, certification_required false,
  business_logic present). PASS.
- **A2 capabilities:** 8 capabilities, all realized by a module (INTGOV-CONNECT/INV/QUAL/A11Y on 335;
  INTGOV-OWN/ATTEST/LIFE/PLAN on 336). PASS.
- **A3 solutions:** 6 solutions (Siteimprove, Acquia Optimize, Orchestry, AvePoint Confidence Platform,
  SharePoint Advanced Management, Powell Governance), ALL `coverage_level='partial'`, zero `primary`.
  Strictly an A3 failure, but **accepted as a deliberate white-space exception**: the build's phase0
  established that no pure-play vendor occupies this agnostic-overlay market - the named tools are
  M365-bound governance suites (COLLAB-GOV neighbors) or accessibility specialists, each honestly only
  partial. Marking any of them `primary` would contradict the build evidence (Rule #22: existing
  evidence wins). No change made; documented here, not raised as a q.
- **A4 catalog UX:** tagline + description present, buyer-voice. PASS.
- **M1-M8:** 2 full modules (>=2 required since 8 capabilities). Every capability has a realizing
  module (M4); every module realizes >=1 capability (M6). Single-master integrity holds catalog-wide
  (M7). Module-level catalog UX present on both (M8). Lifecycle gate states carry domain_module_id 336 (M5).
- **M9 self-containment:** clean. The only cross-module dependency is `work_items` (243), held as
  `embedded_master + optional` in 336 (canonical master WORK-MGMT-TASK-EXEC 149) - self-contained.
- **B1-B14 (data-object footprint):** 6 masters - connected_intranets (catalog), 
  intranet_content_inventory_records (operational_record), intranet_content_types (catalog),
  intranet_content_health_scores (computed), intranet_content_ownership_assignments (junction),
  intranet_content_attestations (operational_workflow, has_single_approver). All labelled (B2),
  prefixed/named cleanly (B3), entity_type classified (B13), pattern flags considered (B4). embedded_master
  integrity holds (B5). Intra-domain relationships present (B6); users edges present (B7: owner on
  assignments, attester on attestations). Aliases on the non-self-explanatory masters (B11). Lifecycle on
  the one operational_workflow master is a clean 5-state machine: pending(initial) ->
  attested_current / flagged_stale -> remediated -> archived(terminal), gates wired to custom process
  2022 (B12). No statute-prefixed masters (B14). PASS with two minor notes (below).
- **B9 events / B9b intra-domain / B10b attribution:** events registered/attested/flagged_stale present;
  intra-domain handoff 1432 (registered, 335->336 -> ownership assignment, lifecycle_progression);
  cross-domain handoff 1433 (flagged_stale, 336 -> WORK-MGMT 149, payload work_items, api_call/medium).
  Both handoffs carry both module FKs (B10b clean). Two minor gaps deferred to B1B-EVENTS (archived
  event missing; attestation-outcome -> inventory-record 336->335 feedback not modeled).
- **C1-C2 functions:** owners HR + IT Operations, contributor Marketing Communications, consumer
  Executive. >=1 owner (PASS). Dual-owner (HR + IT) is slightly unusual for a digital-workplace
  governance market but defensible (the parent INTRANET domain is comms-led); noted, not changed.
  C2 empty - no capability-level RACI divergence enumerated (acceptable; A11Y could diverge to a
  Compliance owner, minor/optional).
- **E1-E6 personas:** 3 personas, each spanning both modules (PASS 2-module floor): Digital Workplace
  Governance Lead (66, cross-functional), Content Owner (67, cross-functional), Intranet Platform
  Administrator (68, IT Ops). interaction_level set on all (E3). RACI on the recertification process
  (2022): R = Content Owner, A = Gov Lead, C = Intranet Admin (E4). has_single_approver on attestations
  agrees with the single Accountable (E5). Reach reconciles against derived permissions; all masters
  entity_type-classified (E6). PASS.
- **F1-F7 skills/tools:** exactly one domain-grain system skill `intranet-gov-system` (F2); no
  full-module-anchored skill (F1). 20 distinct domain_module_tools (F3), all operation_kind <->
  data_object_id invariants hold (F4). Notifications use the `notify_person` abstraction, not a channel
  primitive (F7). Semantius score computable (F5): strict = operational = 17/20 = **0.85**; the 3 external
  tools are `crawl_intranet_source` (fetch), `scan_content_quality` (compute), `scan_content_accessibility`
  (compute) - genuinely external (crawling third-party intranets, running a11y/quality scans).
- **H1 APQC:** 1 cross-domain handoff (1433); was untagged. Tagged this pass (below).

### Bucket 1 — in-scope confirmed gaps (FIXED this pass)

- **H1 / handoff_processes:** handoff 1433 (content flagged stale -> create improvement work item in
  WORK-MGMT) had no APQC tag. Authored `handoff_processes` (handoff 1433 -> process 1753 "Track content
  non-compliance resolution", APQC 13.6.4.6 under Manage content infrastructure; proposal_source
  `agent_curated`, record_status `new`). Best-fit: stale content = non-compliant content, the work item
  tracks its resolution. Row id 1228.
- **domain_regulations (S1 / accessibility):** was empty despite INTGOV-A11Y. Loaded ADA (61) and
  Section 508 (62) at `applicability='conditional'` (they apply by sector/jurisdiction - federal,
  public-accommodation, contractor - not universally). Rows 286, 287, record_status `new`. WCAG / EN 301
  549 / EAA regulation rows are NOT yet in the catalog and are folded into B2-S3 (added there if the user
  blesses the accessibility-conformance depth, to avoid minting standards-body reference rows unilaterally).

### Bucket 2 — surfaced for the user (q-INTRANET-GOV.md)

- **B2-S1 (gate):** add the recertification-campaign + governance-policy engine (the cadence driver the
  domain's "run recertification cycles" value needs), with an optional module-split sub-choice. Gates the rest.
- **B2-S2:** add `content_governance_findings` as a first-class entity (vs score-only).
- **B2-S3:** add `accessibility_conformance_records` + WCAG/EN 301 549/EAA regs (statute-anchored, EAA-bound).

All grounded in `.tmp_deploy/INTRANET-GOV-market-surface-2026-06-10.md`. These are depth decisions
because the market is white-space (substrate borrowed from M365-bound neighbors), not forced adds.

### Bucket 3 — optional (non-blocking)

- **B3-S1:** typed `intranet_improvement_items` remediation master (the build's dropped original). Add only
  if B2-S2 findings lands.

### Pairwise reconciliation — INTRANET-GOV <-> WORK-MGMT (135), light neighbor

Single cross-domain edge: handoff 1433 (flagged_stale -> create work_item in WORK-MGMT-TASK-EXEC 149).
- **Phase 1 (structural gate):** all four legs sound. Producer master 1047 + flagged_stale gate state;
  trigger_event 1659; handoff row with both module FKs (336, 149); the payload work_items is mastered by
  the target (149) and embedded_master+optional in 336. PASS. WORK-MGMT declares no role on any INTGOV
  master (correct - the flow is one-directional, INTGOV creates work in WORK-MGMT).
- **Phase 2 (semantic):** payload now tagged 13.6.4.6 "Track content non-compliance resolution". On the
  WORK-MGMT side the created work item executes through ordinary task management (WORK-MGMT-TASK-EXEC has
  its own personas), i.e. ROLL-UP to generic task execution rather than a content-non-compliance-specific
  realized process. For a single low-weight edge this is the honest verdict; no cross-domain persona
  authored. No ORPHAN/MIS-TAG. Boundary reconciled (light-neighbor condensed verdict).

### Minor observations (not open items)

- **B6b verb direction (soft):** three composition edges on the inventory record read child-to-parent
  ("intranet_content_inventory_records is governed by / is attested by / is scored by ..."). owner_side=source
  is correct (1043 is the parent); only the forward-verb phrasing is inverted. Soft warning, never blocks;
  left as-is (the fix is an overwrite of existing verb columns - not done unprompted).
- **B9c (soft):** trigger_event 1657 to_state "registered" does not resolve to a lifecycle state (1043 is an
  operational_record with no state machine). Acceptable - free-text event on a non-workflow master.

### Fixes applied (record_status='new', awaiting your review in-record)

| Table | Row | Change |
|---|---|---|
| handoff_processes | 1228 | handoff 1433 -> PCF 13.6.4.6 (1753), agent_curated |
| domain_regulations | 286 | INTRANET-GOV -> ADA (61), conditional |
| domain_regulations | 287 | INTRANET-GOV -> Section 508 (62), conditional |

Outcome: **waiting on user** for B2-S1/S2/S3 (engine depth) and the B3-S1 optional. No open b1a.

## 2026-06-16 — a-file processed (all answers were questions; nothing executed, all items loop back)

The user renamed q-INTRANET-GOV.md to a-INTRANET-GOV.md and answered. Three of the four
answers were the user's OWN questions (not decisions), and the fourth is a recommendation
blocked on the unresolved gate, so under Rule #22 ("a question or request keeps that item
open") no catalog write was authorized this pass. Verified the live catalog first: domain 171
present; none of content_governance_findings / governance_policies / recertification_campaigns
/ accessibility_conformance_records / intranet_improvement_items exist yet (nothing to reconcile
or de-dup). All four items stay OPEN and were folded into a regenerated q-file.

- **a1 -> B2-S1 (gate):** Question, not a decision: "could one part of the split become an
  optional module, used when volume justifies it?" Kept OPEN. Answer folded in: yes, the
  Policy & Campaign config layer is the natural volume-gated opt-in (module_kind='starter'),
  leaving day-to-day attestation in the base module; added as new option (c) to B2-S1. Still a
  B2 structural decision for the user to confirm.
- **a2 -> B2-S2:** Empty = recommended = option (a) (add content_governance_findings, health
  score aggregates it). Recorded as the user's preference, but NOT executed: B2-S2 is blocked on
  B2-S1 (the findings master's home depends on whether/how Governance splits, which a1 reopened).
  Added blocked_by B2-S1 + user_preference; it auto-applies once B2-S1 lands. Kept OPEN.
- **a3 -> B2-S3:** Question, not a decision: "would that be an optional module?" Kept OPEN.
  Answer folded in: the conformance record's natural home is the base Inventory module (335)
  where the INTGOV-A11Y scan already lives; an optional accessibility module only pays off if
  a11y governance is deployed selectively. Surfaced as options (a) base module vs (b) optional module.
- **a4 -> B3-S1:** Question/request, not a decision: "can we have a basic embedded Work
  Management?" Kept OPEN. Answer folded in: a basic embedded Work Management ALREADY exists,
  work_items (243, mastered by WORK-MGMT-TASK-EXEC 149) is held embedded_master + optional in
  Governance (336); B3-S1 is the discretionary question of adding a domain-typed
  intranet_improvement_items master on top, only if B2-S2 findings lands.

No additive/corrective or destructive catalog work was performed (no rows inserted, updated, or
deleted). No record_status flips. Deleted a-INTRANET-GOV.md; the q-file was already absent on
disk, so it was regenerated fresh (4 questions). Domain stays **feedback_needed / user**.
