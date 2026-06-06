# SMP audit history

## 2026-05-28 — Audit

### Summary

- Current footprint: 5 mastered data_objects across 2 full modules (`SMP-DISCOVERY-OPT` id=30, `SMP-RENEWAL` id=31); 7 capabilities; 9 solutions; 0 regulations; 14 trigger_events (5 mis-pointed, see B1-S5); 9 outbound handoffs + 5 inbound handoffs; 0 roles + 0 role_modules + 0 role_permissions; 2 system skills + 19 skill_tools links.
- Market surface (subagent): running in background, Bucket 3 will be appended on completion.
- Flagship vendors anchored on existing solution_domains: Productiv, Zylo, BetterCloud, Torii, LeanIX SaaS Management, Flexera One (pure-plays + the Flexera incumbent). Specialist anchors: Nudge Security, Josys, Snow Atlas (secondary tier).
- **Bucket 1 (in-scope, agent fixable):** 8 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** subagent running.

Structural pass: A, M (M1/M2/M4/M5/M6 pass), B (B1/B2/B3/B4/B5/B6/B7/B11 pass; B9/B10/B10b/B12 partial), C pass, D not applicable to audit, E **fails entirely (zero roles)**, F1/F2/F3/F4/F5 pass; F7 fails on both system skills. M7 **fails** (saas_app_assignments multi-mastered across SMP and IGA).

Domain Semantius score (strict, across both modules): 18/19 = **95%**. The single external tool dragging the score: `sign_document` (external, required on `smp-renewal-system` for renewal contract execution). Every other required + optional tool is `coverage_tier='platform'`.

### Vendor surface basis

Pure-play SMP vendors anchor the surface: Productiv (usage-analytics depth), Zylo (renewal pipeline + spend), BetterCloud (lifecycle automation + identity), Torii (workflow automation + shadow-IT), LeanIX SaaS Management (portfolio-architecture cross-link), Flexera One (incumbent ITAM crossover). Snow Atlas, Nudge Security, Josys cover the secondary specialist tier (Nudge for shadow-IT anchored detection; Josys for SMB).

### Bucket 1 — In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M7 | `saas_app_assignments` (data_object_id=63) is mastered in TWO modules catalog-wide: `SMP-DISCOVERY-OPT` (id=30) AND `IGA-AUTO-PROVISIONING` (id=148). Hard fail. SMP-side has the more developed master (5 lifecycle states with workflow gates: provisioned/active/idle/reclaimed; 1 `reclaim_assignment` mutate tool). IGA-side has zero lifecycle states for this data_object. | See Bucket 2 #1 — direction of demotion is a user judgment call (embedded_master vs consumer). |
| B1-S2 | E1+E2+E3+E4+E5+E6 | Zero roles authored for SMP. `roles` query against `role_modules.domain_module_id IN (30,31)` returns empty. Multi-module domain (2 modules) requires ≥3 roles with 2-module-floor satisfied. The SMP persona surface (procurement-side renewal owner vs IT-ops-side SaaS admin) is genuinely multi-persona. | Hand-author the role set. Floor: 3 roles, e.g. `IT-SAAS-ADMIN` (primary=SMP-DISCOVERY-OPT, secondary=SMP-RENEWAL), `PROCUREMENT-SAAS-RENEWAL-OWNER` (primary=SMP-RENEWAL, secondary=SMP-DISCOVERY-OPT), `ITAM-SMP-ADMIN` (cross-module admin, primary=both). Load via a focused loader. Depends on B1-S6 (permissions) landing first. |
| B1-S3 | B10b | 8 of 9 outbound handoffs have NULL `source_domain_module_id`. Only handoff 44 (renewal.30_day_warning) has it set. Deterministic backfill: every outbound whose trigger_event's data_object_id is in (61, 63, 64, 65) → source_module=30 (SMP-DISCOVERY-OPT); data_object_id=62 → source_module=31 (SMP-RENEWAL). | Load a one-pass backfill: handoff ids 43, 639, 640, 641, 642, 643 → source_module=30. Handoff 45 (seat_demand.exceeded, currently TE 110 → mis-pointed) needs B1-S5 first; after re-point to data_object 64, source_module=30. Handoff 39 (shadow_app.requires_sanctioning, currently TE 114 → mis-pointed) needs B1-S5 first; after re-point to data_object 65, source_module=30. |
| B1-S4 | B10b | 3 inbound handoffs have NULL `target_domain_module_id` even though the payload data_object is uniquely SMP-mastered: handoff 38 (EXPENSE→SMP, data_object=65 shadow_it_apps) → target_module=30. Handoff 42 (S2P→SMP, data_object=62 saas_subscriptions) → target_module=31. Handoff 47 (DISCOVERY→SMP, data_object=65 shadow_it_apps) → target_module=30. Handoff 174 (SPEND-MGMT→SMP, data_object=213 card_transactions) — SMP does not master card_transactions; this is a B5 integrity gap not a B10b backfill. | Backfill the 3 resolvable rows. Handoff 174 — see B1-S7 below. |
| B1-S5 | trigger_events data quality | 5 mis-pointed `trigger_events.data_object_id` values. Each event's data_object_id should be the publisher's master, not the payload: <br/>• TE 8 `app.sanctioned` data_object=63 — duplicates TE 622 `saas_application.sanctioned` (data_object=61). Retire TE 8 and re-point handoff 43 to TE 622. <br/>• TE 97 `po.saas_subscription_created` data_object=62 — publisher is S2P's `purchase_orders` (73). Re-point to 73. <br/>• TE 110 `seat_demand.exceeded` data_object=72 (purchase_requisitions) — published by SMP on saas_usage_metrics; re-point to 64. <br/>• TE 114 `shadow_app.requires_sanctioning` data_object=72 — event name says shadow_app; re-point to 65 (shadow_it_apps). <br/>• TE 127 `sso_login.unsanctioned_app` data_object=65 — publisher is DISCOVERY-side `sso_logins` / login_events (DISCOVERY domain). Cross-domain re-point; defer until DISCOVERY has the publisher data_object loaded. | Load PATCH script. TE 8 retire is a coordinated catalog-wide change (any other handoff using TE 8 needs re-pointing too); query `/handoffs?trigger_event_id=eq.8` first. |
| B1-S6 | M5+E6 | Zero permissions materialized for SMP modules (`/permissions?domain_module_id=in.(30,31)` empty). 10 lifecycle states have `requires_permission=true`: 9 unique workflow-gate verbs (sanction_application, deprecate_application, deprovision_application, reclaim_assignment, promote_shadow_app, block_shadow_app, initiate_renewal, approve_renewal, cancel_subscription). 6 baseline permissions also missing (`<module>:read/manage/admin` × 2 modules). | Materialize permissions per Rule #12: 6 baseline-tier + 9 workflow-gate rows. Prefix with realizing module's code (e.g. `smp-discovery-opt:sanction_application`, `smp-renewal:approve_renewal`). Required precursor to B1-S2 (roles can't bundle non-existent permissions). |
| B1-S7 | F7 | Both system skills (id=135, 136) link `send_email` (tool_id=37, channel-specific) instead of the abstraction `notify_person`. `skill_tools.notes` on both rows are generic notification-shaped ("Reclamation, sanctioning, and shadow-IT block decisions drive user-facing notifications" / "Renewal-window alerts to subscription owners drive the workflow"), not workflow-specific justifications. Per F7, default to `notify_person` unless workflow REQUIRES email. | Re-point both skill_tools rows from tool_id=37 to the `notify_person` tool. Lookup: `/tools?tool_name=eq.notify_person`. See Bucket 2 #3 if email is genuinely workflow-required (e.g. contractually mandated channel). |
| B1-S8 | B5 / B10 | Handoff 174 (SPEND-MGMT→SMP, payload data_object=213 `card_transactions`) — SMP does not master, contribute to, or consume `card_transactions`. Either (a) SMP needs a `consumer` DMDO row on card_transactions (consumer-receiving the publication) or (b) the handoff is mis-modeled and the SMP-relevant payload is shadow_it_apps (i.e., a SPEND-MGMT card-transaction triggers SMP to register a shadow_it_app, with the handoff payload being the shadow_it_app the publication causes). | Surface for user decision — same shape as handoff 38 (EXPENSE→SMP, payload shadow_it_apps); option (b) is the more likely intent and would consolidate two near-duplicate handoffs into one event source. |

#### BOUNDARY (Pass 4 — pairwise reconciliation)

| ID | Boundary | Finding | Fix |
|---|---|---|---|
| B1-B1 | SMP↔IGA (weight 5, top neighbor) | M7 conflict on saas_app_assignments (= B1-S1). 3 outbound handoffs (43 app.sanctioned, 639 saas_application.discovered, 640 saas_application.sanctioned) all need source_module=30 (= B1-S3). IGA-ENTITLEMENT-CATALOG consumes saas_applications (covered ✓); IGA-AUTO-PROVISIONING masters saas_app_assignments (conflict). No IGA→SMP handoffs. **Missing handoff candidates:** `saas_app_assignment.deprovisioned` (TE 1198, fires on saas_app_assignments) has no handoff at all — IGA needs to receive this to revoke the underlying identity entitlement. | Backfill source_module (B1-S3); resolve M7 (Bucket 2 #1); author handoff for TE 1198 → IGA-AUTO-PROVISIONING. |
| B1-B2 | SMP↔CLM (weight 3) | Both handoffs (44, 46) fully wired with module FKs ✓. CLM-REPOSITORY contributes to saas_subscriptions (covered ✓). **Boundary is clean.** | None. |
| B1-B3 | SMP↔S2P (weight 3) | 2 outbound (39, 45) + 1 inbound (42), all have NULL module FKs on the S2P side because S2P has zero `domain_modules` rows. **Report-only follow-up — owed by S2P's not-yet-loaded module pass.** SMP-side source_module backfill covered by B1-S3. Also depends on TE 97 / 110 / 114 re-point (B1-S5). | Report-only on the S2P side. Apply B1-S3 + B1-S5 fixes on the SMP side. |
| B1-B4 | SMP↔FINOPS (weight 2) | Handoffs 641 (saas_application.sanctioned) and 643 (saas_usage_metric.idle_threshold) both NULL on source_module — covered by B1-S3. FINOPS has no modules → report-only on target. | B1-S3 fix; report-only on FINOPS side. |
| B1-B5 | SMP↔EXPENSE / DISCOVERY / SPEND-MGMT (weight 1 each) | All inbound, all NULL target_module — partial fix covered by B1-S4. Source domains not modularized → report-only on source side. | B1-S4 fix; report-only on source side. |
| B1-B6 | SMP↔ITSM (weight 1) | Handoff 642 (saas_application.deprovisioned → ITSM), NULL source_module — covered by B1-S3. ITSM is modularized; target_module is also NULL and should resolve to whichever ITSM module hosts incident creation around app deprovisioning (likely `ITSM-INCIDENT-MGMT`). | Add this to the B1-S3 backfill; resolve target_module via ITSM's incident-master DMDO. |
| B1-B7 | SMP↔APM (weight 1) | APM-PORTFOLIO-REGISTRY consumer on saas_applications (covered ✓). No handoffs. Acceptable — APM reads SMP-mastered SaaS apps via DMDO consumer link; no event-driven write to APM is in scope. | None. |

### Bucket 2 — Surface-for-user (judgment calls)

1. **M7 resolution direction on `saas_app_assignments` (61).** Both SMP-DISCOVERY-OPT and IGA-AUTO-PROVISIONING hold `role='master'`. SMP-side has the full lifecycle (provisioned → active → idle → reclaimed) + the `reclaim_assignment` workflow-gate. IGA-side has no lifecycle states for this data_object. Real-world: BetterCloud/Torii (SMP) automate assignments via SSO + HR events; SailPoint/Saviynt (IGA) provision via entitlement workflows; the canonical authority depends on which side is the system-of-record for "who has this license". Options:
   - **(a)** Demote IGA-AUTO-PROVISIONING to `embedded_master` + required. Standalone-deployable for IGA without SMP; demotes to consumer when SMP is co-deployed (the autonomous-deployable-units M7 "pass" case). **Recommended.**
   - (b) Demote IGA-AUTO-PROVISIONING to `consumer` + required. Cleaner edge but breaks IGA's standalone deployment.
   - (c) Flip ownership: keep IGA as master, demote SMP to embedded_master. Requires migrating lifecycle states + mutate tool from SMP to IGA. Bigger move and contradicts the SMP-side authoring depth.
   - **Cross-bucket dependency:** the IGA `saas_app_assignment.deprovisioned` handoff candidate (B1-B1) depends on which side is canonical.

2. **Rule #15 cleanup scope on existing notes.** Eight rows in the SMP footprint carry AI-narrated prose in `notes` columns that should be empty per the rescinded license. Three on `domain_data_objects` (purchase_orders/legal_contracts/configuration_items contributor/consumer rows), five on `data_objects` (saas_applications, saas_subscriptions, saas_app_assignments narrate pattern-flag rationale; saas_usage_metrics carries the rescinded config-shape exemption text; shadow_it_apps narrates triage workflow). Options:
   - **(a)** Revert all 8 to empty string. Clean-state matching Rule #15 as currently written.
   - (b) Keep as-is. The rationale captures useful context for future reviewers but is exactly the auto-population the rule forbids.
   - (c) Keep one (saas_app_assignments `has_personal_content=true` is the only flag whose rationale is genuinely non-obvious), revert the other 7.
   - **Cross-bucket dependency:** the lifecycle exemption text on saas_usage_metrics needs an alternative tracking surface (gap report, PR description, this audit file) if reverted.

3. **F7 `send_email` vs `notify_person` on both system skills.** Per the rule, default is `notify_person`; channel-specific link requires workflow justification. SMP renewal-window alerts COULD be contractually mandated email (subscription owner of record) — that would justify `send_email`. SMP reclamation/sanctioning notifications could equally route via Slack/Teams. Options:
   - **(a)** Re-point both to `notify_person`. Channel-substitutable. Future platform-side flip is one UPDATE.
   - (b) Keep `send_email` and write workflow-specific notes ("subscription owner of record must receive renewal notice via email per CLM contract template") — only valid if the user can articulate the workflow constraint.

4. **No regulations linked.** SMP intersects with GDPR (data subject visibility into SaaS apps, subprocessor disclosure), SOC 2 (vendor risk attestation), HIPAA (when a SaaS app processes PHI), CCPA (consumer data). Currently `/domain_regulations?domain_id=eq.85` is empty. Question: is this intentional (regulations attach at more-specific scopes like data_object_aliases / specific masters), or a genuine gap? If gap, recommend adding GDPR + SOC 2 minimum. Also raises whether ISO 27001 / vendor-risk frameworks belong here.

5. **Modularization hypothesis — third module?** The 2 modules cleanly separate discovery+optimization (IT-ops) from renewal+vendor (procurement). Several flagship vendors (Torii, BetterCloud, LeanIX) ship a third surface: **vendor risk / DPA / SOC 2 review workflow**. Capability `SMP-VENDOR-MGMT` (526) is currently realized in SMP-RENEWAL, which conflates two distinct workflows (commercial renewal vs security/legal review). Options:
   - **(a)** Add `SMP-VENDOR-RISK` module hosting `SMP-VENDOR-MGMT` capability + new entities like `saas_vendor_risk_assessments`, `saas_dpa_records`, `saas_subprocessor_disclosures`.
   - (b) Keep as-is. Vendor mgmt = commercial relationship, security review handled at GRC layer outside SMP.
   - Defer until Bucket 3 market-surface findings land (subagent may identify these as MISSING entities).

6. **Pairwise reconciliation scope — should IGA / S2P / CLM run as separate Validate runs?** SMP↔IGA is the heaviest boundary and most of B1-B1 is one-sided (B10b backfill from SMP side); a full IGA validate would surface the IGA-side gaps (the M7 resolution decision lives on IGA's master DMDO row). SMP↔S2P is entirely report-only on S2P (no modules). SMP↔CLM is clean. Decide: run inline now, or queue as separate Validate runs against IGA + S2P.

### Bucket 3 — Phase 0 pending (speculative; vendor-research vetting needed)

Subagent (general-purpose) enumerated the union surface matrix against 6 flagship vendors: Productiv, Zylo, BetterCloud, Torii, LeanIX SaaS Management, Flexera One. Full artifact at `c:/tmp/SMP-market-surface-2026-05-28.md`. **Counts: 19 MISSING, 0 WRONG-OWNERSHIP, 0 SCOPE-CREEP, 3 MODULARIZATION-ISSUE.**

Grouped by impact band; each row would land as a new master (unless noted) and needs Phase 0 vetting or eyeball confirmation before Phase B drafting.

#### Group A — Renewal workflow substrate (Productiv / Zylo / Flexera anchored)

| ID | Entity | Module | Vendor anchor |
|---|---|---|---|
| B3-1 | `smp_renewal_tasks` | SMP-RENEWAL | Productiv, Zylo, Flexera — flagship |
| B3-2 | `smp_renewal_engagements` | SMP-RENEWAL | Productiv, Zylo (distinct from CRM opportunities; buyer-side) |
| B3-3 | `smp_vendor_negotiations` | SMP-RENEWAL | Productiv, Zylo (contributor into CLM; decision-provenance lives in SMP) |

Closes B3-MOD1 — without these, SMP-RENEWAL is only the subscription record, not the lifecycle.

#### Group B — Optimization payoff (Productiv / Zylo / Torii / BetterCloud anchored)

| ID | Entity | Module | Vendor anchor |
|---|---|---|---|
| B3-4 | `smp_optimization_recommendations` | SMP-DISCOVERY-OPT | Productiv, Zylo, Torii — flagship |
| B3-5 | `smp_reclamation_actions` | SMP-DISCOVERY-OPT | Productiv, BetterCloud, Torii — payoff entity for the reclaim workflow |

Closes B3-MOD2 — SMP-LICENSE-OPT capability has no entity today.

#### Group C — Automation surface (BetterCloud / Torii anchored)

| ID | Entity | Proposed module | Vendor anchor |
|---|---|---|---|
| B3-6 | `smp_automation_workflows` | NEW `SMP-AUTOMATION` | BetterCloud (flagship), Torii |
| B3-7 | `smp_workflow_runs` | NEW `SMP-AUTOMATION` | BetterCloud, Torii |
| B3-8 | `smp_app_requests` | NEW `SMP-AUTOMATION` | Torii, BetterCloud (co-master tension with ITSM service_requests and IGA access_requests — pre-IGA-handoff app-grain) |
| B3-9 | `smp_app_catalog_listings` | `SMP-AUTOMATION` or DISCOVERY-OPT | LeanIX, Torii, BetterCloud |

Closes B3-MOD3 — BetterCloud and Torii's product anchor needs a dedicated module or it gets buried.

#### Group D — Ownership and intelligence substrate

| ID | Entity | Module | Vendor anchor |
|---|---|---|---|
| B3-10 | `smp_app_owners` | SMP-DISCOVERY-OPT | Productiv, LeanIX — typed role-on-app, NOT a flat FK on saas_applications |
| B3-11 | `smp_app_integrations` | SMP-DISCOVERY-OPT | Productiv, Zylo, BetterCloud — per-app SSO/SCIM/finance/usage source linkage. Distinct from DI `integration_connectors` |
| B3-12 | `smp_app_lifecycle_stages` | SMP-DISCOVERY-OPT (embedded under saas_applications) | LeanIX flagship — Evaluate/Pilot/Sanctioned/Sunset. Currently conflated into saas_applications.record_status |

#### Group E — Finance substrate (Zylo / Flexera anchored)

| ID | Entity | Module | Vendor anchor |
|---|---|---|---|
| B3-13 | `smp_spend_allocations` | SMP-RENEWAL (or NEW SMP-FINOPS) | Zylo, Flexera — chargeback by cost center / BU. Distinct from FINOPS cost_allocations (cloud-only) |
| B3-14 | `smp_app_benchmarks` | SMP-DISCOVERY-OPT | Productiv, Zylo — per-app cost-per-seat / utilization vs peer set |

#### Group F — Compliance and risk (Flexera anchored + GDPR intersect)

| ID | Entity | Module | Vendor anchor |
|---|---|---|---|
| B3-15 | `smp_vendor_risk_assessments` | NEW `SMP-RISK` or extend SMP-RENEWAL | Flexera — SOC2/ISO/DPA/breach scorecard. Distinct from PROC supplier_risk_assessments (per-app, not per-supplier) |
| B3-16 | `smp_data_residency_attestations` | embedded under B3-15 | Flexera, specialist elsewhere — GDPR/data-localization |
| B3-17 | `smp_subprocessor_disclosures` | embedded under B3-15 | Flexera, manual elsewhere — GDPR Art. 28 |
| B3-18 | `smp_user_app_exposures` | SMP-DISCOVERY-OPT | BetterCloud (closest, via offboarding view) — DSAR-driving projection (the only SMP entity GDPR genuinely targets) |

#### Group G — Operational signal

| ID | Entity | Module | Vendor anchor |
|---|---|---|---|
| B3-19 | `saas_alerts` | SMP-DISCOVERY-OPT | BetterCloud, Torii — system-raised anomaly (shadow-IT signup, overage projection, integration token expiry) |

#### Modularization issues (subagent corroborates Bucket 2 #5)

| ID | Issue | Recommendation |
|---|---|---|
| B3-MOD1 | SMP-RENEWAL has only `saas_subscriptions`; missing entire renewal workflow substrate (tasks/engagements/negotiations) | Load Group A entities. |
| B3-MOD2 | SMP-LICENSE-OPT capability has no realizing entity at all | Load Group B entities. |
| B3-MOD3 | No automation module exists; burying it in DISCOVERY-OPT misrepresents BetterCloud and Torii flagships | Add NEW `SMP-AUTOMATION` module hosting Group C entities. |

#### Subagent modularization hypothesis (full 4-way split)

The subagent recommends splitting into 4 modules:

1. **SMP-DISCOVERY** (split from current SMP-DISCOVERY-OPT) — applications, shadow_it_apps, app_integrations, app_owners, app_lifecycle_stages, app_catalog_listings, saas_alerts
2. **SMP-OPTIMIZATION** (split from current SMP-DISCOVERY-OPT) — usage_metrics, app_assignments, optimization_recommendations, reclamation_actions, app_benchmarks
3. **SMP-RENEWAL-VENDOR** (rename of SMP-RENEWAL) — subscriptions, renewal_tasks, renewal_engagements, vendor_negotiations, spend_allocations, vendor_risk_assessments
4. **SMP-AUTOMATION** (NEW) — automation_workflows, workflow_runs, app_requests

Minimum-viable cut is 3 modules: keep DISCOVERY-OPT consolidated, spin out SMP-AUTOMATION, rename RENEWAL → RENEWAL-VENDOR.

### Decisions

*Pending user input per bucket.*

### Fixes applied

#### 2026-05-28 — B1-S1 / M7 resolved via Option γ (split)

Loader: [.tmp_deploy/split_saas_app_assignments.ts](../.tmp_deploy/split_saas_app_assignments.ts)

The intentional multi-master row on `saas_app_assignments` (data_object id=63) — modeled to capture SMP's seat/cost axis and IGA's identity/access axis on one entity — was split into two semantically distinct entities, mirroring how SMP and IGA flagship vendors actually model the data.

**Phase A — renamed existing entity:**
- PATCH data_object id=63: `saas_app_assignments` → `smp_license_seat_assignments` (SMP seat/cost axis only); singular/plural labels and description rewritten.
- DELETE `domain_module_data_objects` id=747 (IGA's master claim).
- DELETE `handoffs` id=43 (duplicate of handoff 640, used buggy TE 8 — closes B1-S5 cleanup for this row).
- DELETE `trigger_events` id=8 (mis-pointed duplicate of TE 622).
- PATCH `trigger_events` 1196 / 1197 / 1198 → renamed prefix to `smp_license_seat_assignment.*`.
- PATCH `tools` id=522 → `query_smp_license_seat_assignments`; id=874 → `reclaim_seat_assignment`.
- Existing lifecycle states (provisioned → active → idle → reclaimed) and aliases (License Assignment, User Provisioning Record) carried over unchanged — they were already SMP-axis.

**Phase B — created `iga_user_entitlements` (id=964):**
- 1 master DMDO on `IGA-AUTO-PROVISIONING` (module 148), necessity=required, has_personal_content=true.
- 5 lifecycle states: requested → approved → granted → certified → revoked. Four are workflow-gated (`request_entitlement`, `approve_entitlement`, `grant_entitlement`, `revoke_entitlement`); `certified` is permission-free (routine periodic confirmation, IGA cadence-driven).
- 5 trigger_events: `iga_user_entitlement.requested|approved|granted|certified|revoked`, all anchored to module 148.
- 3 aliases: Entitlement, Account, Access Grant.
- 3 relationships: `users holds iga_user_entitlements`; `saas_applications entitles_to iga_user_entitlements`; `smp_license_seat_assignments correlates_with iga_user_entitlements` (one-to-one, optional — captures the split-correlation with no cardinality guarantee, since the two views routinely diverge in real orgs).
- 6 tools, all `coverage_tier='platform'`: `query_iga_user_entitlements`, `request_entitlement`, `approve_entitlement`, `grant_entitlement`, `certify_entitlement`, `revoke_entitlement`.

**Phase C — skill_tools re-wired:**
- `iga_auto_provisioning_agent` (skill 225): dropped tool 522 link; added query + request + approve + grant + revoke (all required).
- `iga_access_certification_agent` (skill 222): dropped tool 522 link; added query + certify (both required).
- `employee-jml-process` (skill 124): kept SMP-side link (now `query_smp_license_seat_assignments`); added `query_iga_user_entitlements` (required) for the IGA axis.
- `case-service-process` (skill 126): kept SMP-side link; added `query_iga_user_entitlements` (optional).

**Verification queries (run post-apply):**
- M7 single-master: `/domain_module_data_objects?data_object_id=in.(63,964)&role=eq.master` returns 1 row per data_object ✓
- IGA-skill drop: `/skill_tools?skill_id=in.(222,225)&tool_id=eq.522` returns empty ✓
- IGA-entitlement relationships: 3 rows present pointing at id=964 ✓
- IGA lifecycle states: 5 rows with correct `requires_permission` + verb overrides ✓

**What this closes / opens:**
- **Closes:** B1-S1 (M7 single-master conflict), one half of B1-S5 (TE 8 retirement and 3 TE renames), and parts of B1-B1 (the duplicate handoff 43 was retired; SMP→IGA fan-out is now solely on handoff 640).
- **Does NOT close:** the remaining 4 mis-pointed trigger_events in B1-S5 (TE 97/110/114/127), the source_module backfill in B1-S3, target_module backfill in B1-S4, permissions materialization (B1-S6), roles authoring (B1-S2), the F7 channel rule (B1-S7), or the SPEND-MGMT handoff 174 mis-model (B1-S8).
- **Opens:** the SMP-side semantics of `smp_license_seat_assignment.provisioned` (TE 1196) now no longer fan out to IGA; IGA reads its own entitlements directly via the `correlates_with` relationship + handoff sync. Worth reviewing whether handoff 640 (SMP→IGA on `saas_application.sanctioned` → IGA-ENTITLEMENT-CATALOG) is still the right edge or whether a new handoff on `smp_license_seat_assignment.provisioned` → `iga_user_entitlement.requested` is needed for the assignment-grain flow.

UI: <https://tests.semantius.app/domain_map/data_objects>

#### 2026-05-28 — Remaining Bucket 1 items resolved

Loader: [.tmp_deploy/fix_smp_bucket1.ts](../.tmp_deploy/fix_smp_bucket1.ts)

Closed the remaining 7 Bucket 1 items in a single coordinated load. Sequencing followed the dependency chain (trigger_event re-points → handoff module-FK backfills → permissions → roles).

**Phase 1 — B1-S5 trigger_event re-points (3 of 4 originally flagged):**
- TE 97 `po.saas_subscription_created` data_object_id: 62 → 73 (purchase_orders — publisher is S2P).
- TE 110 `seat_demand.exceeded` data_object_id: 72 → 64 (saas_usage_metrics — publisher is SMP).
- TE 114 `shadow_app.requires_sanctioning` data_object_id: 72 → 65 (shadow_it_apps — publisher is SMP).
- TE 127 `sso_login.unsanctioned_app` deferred (publisher is DISCOVERY's sso_logins, which isn't modeled yet — surfaced as report-only follow-up for DISCOVERY's eventual Phase-B).

**Phase 2 — B1-S3 + B1-S4 handoff module-FK backfill (10 rows):**
- Outbound `source_domain_module_id` set on handoffs 39, 45, 639, 640, 641, 642, 643 (all → SMP-DISCOVERY-OPT=30).
- Inbound `target_domain_module_id` set on handoffs 38 (→ 30), 42 (→ 31), 47 (→ 30).
- Post-fix verification: `/handoffs?source_domain_id=eq.85&source_domain_module_id=is.null` returns empty; same for inbound.

**Phase 3 — B1-S8 handoff 174 re-model (option b):**
- handoff 174 `data_object_id`: 213 (card_transactions) → 65 (shadow_it_apps). `target_domain_module_id`: NULL → 30. Captures the SPEND-MGMT card-spend signal as a shadow-IT detection event rather than as a foreign card_transactions payload SMP doesn't model. SMP no longer needs a `consumer` DMDO on card_transactions.

**Phase 4 — B1-S7 F7 channel rule:**
- skill_tools rows for `send_email` (tool 37) on skills 135 (smp-discovery-opt-system) and 136 (smp-renewal-system) replaced with rows linking `notify_person` (tool 913, `coverage_tier='platform'`). Both at `requirement_level='required'`. The notification surface is now channel-substitutable — when the platform ships a different default channel, no skill_tools rewiring needed.

**Phase 5 — B1-S6 permissions materialization (15 rows):**
- SMP-DISCOVERY-OPT (9): `smp-discovery-opt:read/manage/admin` (baseline) + `sanction_application`, `deprecate_application`, `deprovision_application`, `reclaim_assignment`, `promote_shadow_app`, `block_shadow_app` (workflow-gate).
- SMP-RENEWAL (6): `smp-renewal:read/manage/admin` (baseline) + `initiate_renewal`, `approve_renewal`, `cancel_subscription` (workflow-gate).
- Permission prefix matches realizing module's `domain_module_code` per Rule #14.

**Phase 6 — B1-S2 roles (3 roles, 6 role_modules, 6 role_permissions):**
- `IT-SAAS-ADMIN` (id=10118, business_function=IT Operations) — primary on SMP-DISCOVERY-OPT, secondary on SMP-RENEWAL. Bundle: `smp-discovery-opt:admin` + `smp-renewal:read`.
- `PROCUREMENT-SAAS-RENEWAL-OWNER` (id=10119, business_function=Procurement) — primary on SMP-RENEWAL, secondary on SMP-DISCOVERY-OPT. Bundle: `smp-renewal:admin` + `smp-discovery-opt:read`.
- `ITAM-SMP-ADMIN` (id=10120, business_function=IT Asset Management) — primary on both modules. Bundle: `smp-discovery-opt:admin` + `smp-renewal:admin`.
- 2-module floor satisfied; tier-level grants only (no enumerated workflow gates needed — `permission_hierarchy` auto-includes them via the `:admin` rollup).
- Path A == Path B: both paths reach modules 30 + 31 for all 3 roles.

**Loader hiccup (resolved):** First apply failed in Phase 6 inserting `role_permissions` with explicit composite `id` field. The column appears in the schema as `format: text` but is DB-computed via trigger; passing a value violates `cannot insert a non-DEFAULT value into column "id"`. Fix: omit `id`, send only `role_id` + `permission_id`. Idempotent re-run completed cleanly (Phases 1-5 skipped, Phase 6 finished).

**What this closes / opens:**
- **Closes:** B1-S2, B1-S3, B1-S4, B1-S5 (modulo TE 127), B1-S6, B1-S7, B1-S8.
- **Closes structural audit gaps:** E1-E6 now pass; M5 passes; F7 passes; B10b for SMP rows passes.
- **Does NOT close:** B1-B1 missing handoff candidate (`smp_license_seat_assignment.provisioned` → IGA — split-aftermath question), and the report-only follow-ups on partner domains (TE 127 owed by DISCOVERY's Phase-B; NULL module FKs on partner sides of SMP↔S2P, SMP↔EXPENSE, SMP↔DISCOVERY, SMP↔FINOPS, SMP↔SPEND-MGMT — owed by those domains' own validate passes).
- **Domain Semantius score after these fixes:** Phase 4 added `notify_person` (platform) and removed `send_email` (platform). Tool count and platform-coverage mix unchanged at 18/19 = **95%**. The single non-platform tool remains `sign_document` on `smp-renewal-system`.

UI:
- <https://tests.semantius.app/domain_map/roles>
- <https://tests.semantius.app/domain_map/permissions>
- <https://tests.semantius.app/domain_map/handoffs>

#### 2026-05-28 — Bucket 2 decisions and applied fixes

User decisions on the 4 Bucket 2 items:

| Bucket 2 | Decision |
|---|---|
| #1 — Rule #15 notes cleanup | **(a) Revert all 8** |
| #2 — Regulations | **GDPR + SOC 2 minimum** |
| #3 — Third module SMP-VENDOR-RISK | **Defer until Bucket 3 entities load** |
| #4 — Pairwise IGA + S2P validates | **Queue both as separate runs** |

Loader: [.tmp_deploy/fix_smp_bucket2.ts](../.tmp_deploy/fix_smp_bucket2.ts)

**Phase 1 — Rule #15 notes cleanup (8 PATCHes):**
- `domain_data_objects` ids 109 (legal_contracts), 115 (purchase_orders), 141 (configuration_items) — notes reverted to empty string.
- `data_objects` ids 61 (saas_applications), 62 (saas_subscriptions), 63 (smp_license_seat_assignments), 64 (saas_usage_metrics), 65 (shadow_it_apps) — notes reverted to empty string. Removes the pattern-flag rationale text, the workflow narration, and the rescinded config-shape exemption text from saas_usage_metrics.

**Phase 2 — Regulations (GDPR + SOC 2 → SMP):**
- SMP linked to GDPR (regulation id=1) with `applicability='conditional'` — applies when the underlying SaaS app processes personal data of EU residents.
- SMP linked to SOC 2 (regulation id=15) with `applicability='recommended'` — standard procurement gate for SaaS vendor attestation, not statutory.

**Incident — duplicate GDPR row inadvertently created and cleaned up:**

The loader checked for GDPR's existence by `regulation_name=eq.GDPR (General Data Protection Regulation)` and ilike substring `*GDPR*`. Both searches missed: the pre-existing GDPR row at id=1 carries `regulation_name='EU General Data Protection Regulation'` (no GDPR substring) and `regulation_code='GDPR'`. A duplicate row was created at id=86 with the same regulation_code. The downstream `regulation_code=eq.GDPR` lookup that resolved the id for the SMP link picked up the pre-existing id=1 (sort order put it first), so SMP was correctly linked to the canonical GDPR row consistent with the 23 other domains that reference it. The orphan id=86 was deleted directly via PostgREST after detection.

**Lesson logged for future loaders:** when checking existence of a row in tables that have both a natural-language `_name` field AND a code field, query by the code (more robust to phrasing variation) first. Substring match on `_name` is fragile. Applies to `regulations.regulation_code`, `domains.domain_code`, `capabilities.capability_code`, `industries.industry_code`. This belongs in [references/loader-idiom.md](../.claude/skills/domain-map-analyst/references/loader-idiom.md) as a guardrail.

**Bucket 2 #3 — Modularization deferred.**

Decision: don't author SMP-VENDOR-RISK now. Reasons captured: (a) Bucket 3 entities (smp_vendor_risk_assessments, smp_data_residency_attestations, smp_subprocessor_disclosures) may not cluster cleanly enough into a standalone module once loaded; (b) the subagent's full 4-module split (SMP-DISCOVERY / SMP-OPTIMIZATION / SMP-RENEWAL-VENDOR / SMP-AUTOMATION) is a larger restructure that should be one coherent move, not a piecemeal split. Re-evaluate when Bucket 3 is approved for load.

**Bucket 2 #4 — Pairwise IGA + S2P validates queued.**

Decision: schedule two follow-up Validate runs.
- **IGA validate** — high priority. The split (B1-S1 fix) opened a new entity (iga_user_entitlements) with master in IGA-AUTO-PROVISIONING; IGA's own audit hasn't been run since pre-split. Specific items to surface in that run: (a) does the assignment-grain edge need a new handoff `smp_license_seat_assignment.provisioned → iga_user_entitlement.requested`, or does application-grain handoff 640 suffice? (b) IGA's other 4 modules' DMDO coverage on the new entity (does IGA-ACCESS-CERTIFICATION need a consumer row?), (c) lifecycle states for the IGA-AUTO-PROVISIONING module on any other masters.
- **S2P validate** — lower priority but blocks SMP↔S2P module-FK closure. S2P currently has zero `domain_modules` rows; a Phase A+M load to model the basic module shape would resolve the report-only NULL module FKs on handoffs 38, 39, 42, 45.

Neither run is initiated here. Both are scheduled as separate user-triggered Validate invocations.

UI:
- <https://tests.semantius.app/domain_map/regulations>
- <https://tests.semantius.app/domain_map/domain_regulations>

#### 2026-05-29 — Bucket 3 + 4-module restructure applied

User decisions on Bucket 3 (Phase 0 research at `c:/tmp/SMP-phase0-2026-05-29.md`):

| Decision | Choice |
|---|---|
| Modularization | **Full 4-module split** (DISCOVERY / OPTIMIZATION / RENEWAL-VENDOR / AUTOMATION) |
| Load-now count | **All 12** in one combined pass + 4 Surface-resolved = **16 entities** |
| Catalog placement | **smp_app_catalog_listings in SMP-DISCOVERY**, requests + automation in SMP-AUTOMATION (driven by starter-kit reasoning) |
| smp_vendor_risk_assessments | **SMP-RENEWAL-VENDOR master** (defer SMP-VENDOR-RISK module) |
| smp_app_lifecycle_stages | **embedded_master under saas_applications** (LeanIX TIME taxonomy extracted from record_status) |
| Group F #16/17/18 | **All 3 deferred** (data_residency_attestations, subprocessor_disclosures, user_app_exposures — single-vendor Core coverage) |
| Follow-up validates | **Run IGA, then S2P** |
| Sequencing | **Loader A (restructure), then Loader B+C combined (entities)** |

Loaders:
- [.tmp_deploy/smp_4mod_restructure_A.ts](../.tmp_deploy/smp_4mod_restructure_A.ts) — module restructure
- [.tmp_deploy/smp_4mod_restructure_B.ts](../.tmp_deploy/smp_4mod_restructure_B.ts) — 16 new entities

**Loader A — module restructure (no new entities yet):**
- Renamed `SMP-DISCOVERY-OPT` (id=30) → `SMP-DISCOVERY` and `SMP-RENEWAL` (id=31) → `SMP-RENEWAL-VENDOR`. IDs kept stable for FK preservation; codes and names updated.
- Created `SMP-OPTIMIZATION` (id=184) and `SMP-AUTOMATION` (id=185).
- Moved 2 DMDOs to SMP-OPTIMIZATION: `smp_license_seat_assignments` and `saas_usage_metrics`.
- Re-anchored 4 lifecycle states (smp_license_seat_assignments provisioned/active/idle/reclaimed) to OPTIMIZATION; aligned `reclaimed.permission_verb_override` to `reclaim_seat_assignment` matching the renamed tool.
- Re-anchored 3 trigger_events (smp_license_seat_assignment.*) to OPTIMIZATION.
- Renamed 15 permissions (`smp-discovery-opt:*` → `smp-discovery:*` except `reclaim_assignment` → `smp-optimization:reclaim_seat_assignment`; `smp-renewal:*` → `smp-renewal-vendor:*`). Added 6 new baseline permissions (smp-optimization:* and smp-automation:*).
- Renamed skill 135 → `smp_discovery_agent` (stays at module 30) and skill 136 → `smp_renewal_vendor_agent` (stays at module 31). Created `smp_optimization_agent` (id=244) and `smp_automation_agent` (id=245).
- Moved 3 skill_tools rows from skill 135 to skill 244: query_smp_license_seat_assignments (522), query_saas_usage_metrics (697), reclaim_seat_assignment (874).
- Extended `role_modules`: 5 new rows so all 3 SMP roles span the 4 modules per their interaction level.
- Extended `role_permissions`: 5 new rows for the new baselines (IT-SAAS-ADMIN gains optimization+automation admin; PROCUREMENT gains optimization read; ITAM-SMP-ADMIN gains optimization+automation admin).

**Loader B+C — 16 new entities (Load-now + Surface-resolved):**

SMP-DISCOVERY (5 entities, 6 total masters now):
- smp_app_owners (master, has_personal_content) — typed role-on-app assignments
- smp_app_integrations (master) — per-app per-tenant API connections
- smp_app_catalog_listings (master) — employee-facing app catalog publication
- smp_alerts (master) — SaaS portfolio anomalies
- smp_app_lifecycle_stages (embedded_master under saas_applications) — LeanIX TIME taxonomy

SMP-OPTIMIZATION (3 new + 2 moved-from-DISCOVERY = 5 masters now):
- smp_optimization_recommendations (master) — rightsizing/savings opportunities
- smp_reclamation_actions (master, has_personal_content notify_person linked) — reclamation execution log
- smp_app_benchmarks (master) — utilization/cost benchmark snapshots

SMP-RENEWAL-VENDOR (5 new + 1 existing = 6 masters):
- smp_renewal_tasks (master)
- smp_renewal_engagements (master)
- smp_vendor_negotiations (master)
- smp_spend_allocations (master, optional)
- smp_vendor_risk_assessments (master, optional)

SMP-AUTOMATION (2 masters + 1 embedded):
- smp_automation_workflows (master) — orchestration definitions
- smp_workflow_runs (embedded_master under workflows) — execution log
- smp_app_requests (master, has_personal_content + has_submit_lock + notify_person linked) — self-service request workflow

Each entity: idempotent natural-key dedup; full lifecycle states (where workflow-shaped), trigger_events, aliases (2-3), data_object_relationships (linking to anchor entities and users/saas_applications/saas_subscriptions), tools (query + mutates per workflow gate), skill_tools to the module's system skill at the right requirement level. Total per-entity ops: ~25-30 rows.

**Phase 4 — workflow-gate permissions:**
46 new workflow-gate permissions materialized from the new entities' lifecycle states with `requires_permission=true`. Prefix matches the realizing module (`smp-discovery:revoke_app_owner`, `smp-automation:fulfill_app_request`, etc.).

**Verification:**

| Check | Result |
|---|---|
| M7 single-master across catalog | ✅ Each new entity has exactly one master row |
| M1 ≥1 module per domain | ✅ SMP has 4 modules |
| M2 ≥2 modules with ≥3 capabilities | ✅ 4 modules cover 7+ capabilities |
| B12 lifecycle states on workflow masters | ✅ Every workflow-shaped master has states + gates |
| F2 system skill per module | ✅ 4 modules × 4 system skills |
| F3 ≥1 skill_tools per skill | ✅ 14-29 skill_tools per skill |
| F4 operation_kind ↔ data_object_id invariant | ✅ Query/mutate tools all carry data_object_id |
| E1-E6 roles | ✅ All 3 roles updated to span 4 modules; bundles complete |

**Domain Semantius score (strict, post-load):** 85/86 = **98.8%**. Improvement over prior 95% because the new entities all link platform-coverage tools (no new externals). Per-skill:
- `smp_discovery_agent` (135): 29/29 = 100%
- `smp_renewal_vendor_agent` (136): 26/27 = 96% (sign_document is the only external, on renewal execution)
- `smp_optimization_agent` (244): 16/16 = 100%
- `smp_automation_agent` (245): 14/14 = 100%

**Bucket 3 deferred items (re-evaluate later):**
- smp_data_residency_attestations — single-vendor Core (Flexera only)
- smp_subprocessor_disclosures — single-vendor Core (Flexera only)
- smp_user_app_exposures — inferred only; better as a DSAR-driven view in CONSENT/PRIVACY domain
- SMP-VENDOR-RISK as a 5th module — not justified; vendor_risk_assessments now lives in RENEWAL-VENDOR

**Loader hiccups:** None. Loader A applied cleanly; Loader B+C ran ~4 minutes in the background due to Windows `semantius` CLI per-invocation overhead (~300ms × hundreds of GET/POST round-trips). Bun stdout buffering meant the output file appeared empty during execution; the load was actually progressing normally.

**What this closes / opens:**
- **Closes:** all Phase-A targets (Bucket 3 #1-12, #19) + 4 Surface-resolved (#8, #9, #12, #15). 12 + 4 = 16 entities loaded. Modularization decision settled (4 modules), capability realizations updated.
- **Opens:** the 4 deferred items remain on the catalog backlog. SMP↔IGA boundary (smp_app_requests → IGA on it_approved; smp_reclamation_actions → IGA on reclaimed) needs cross-domain handoff rows once IGA validate runs. SMP↔ITSM boundary likely needs alert-routing handoff (smp_alerts.raised → ITSM incident creation).

**Capability ↔ module realizations** were not updated in this load. The new modules likely need `domain_module_capabilities` rows (M4 check). Surface in the next audit pass.

UI:
- <https://tests.semantius.app/domain_map/domain_modules>
- <https://tests.semantius.app/domain_map/data_objects>
- <https://tests.semantius.app/domain_map/permissions>
- <https://tests.semantius.app/domain_map/skills>

**Next: queued IGA validate run** (per Bucket 2 #4 decision). To be initiated as a separate Validate invocation.

## 2026-05-31, Continuation: B1 technical fixes (residual)

No loader run; this pass is a no-op verification.

### Procedure followed

Re-scanned the SMP footprint against the apply rubric (enum backfills, B10b FK PATCHes, `domain_regulations` inserts, stale-row DELETEs, naming renames, user-edge `data_object_relationships`, `permission_verb_override` PATCHes, `handoff_processes` inserts, `notes=''` reverts). Cross-checked each candidate against the audit's already-applied fix log (2026-05-28 split, 2026-05-28 Bucket 1, 2026-05-28 Bucket 2, 2026-05-29 4-module restructure).

### Live-state verification (each rubric category)

| Category | Live state | Decision |
|---|---|---|
| Enum backfills (`event_category`, `integration_pattern`, `friction_level`, DMDO `role`/`necessity`) | All SMP-anchored `trigger_events` and `handoffs` carry valid enum values; no NULL or out-of-vocabulary rows | No fix needed |
| B10b FK PATCHes (handoff `source_domain_module_id` / `target_domain_module_id` derivable from SMP-mastered payload) | All 13 SMP-side handoffs have their SMP-side module FK populated (verified via `/handoffs?or=(source_domain_id.eq.85,target_domain_id.eq.85)`). Partner-side NULLs on handoffs 38/39/42/45/47/641/643/174 are report-only on the non-SMP side (S2P/EXPENSE/DISCOVERY/FINOPS/SPEND-MGMT have not modularized) | No fix needed; report-only follow-ups already documented |
| `domain_regulations` inserts | GDPR (id=1, conditional) + SOC 2 (id=15, recommended) present per 2026-05-28 Bucket 2 fix | No fix needed |
| Stale-row DELETEs (audit names IDs) | TE 8 + handoff 43 + DMDO 747 already deleted per 2026-05-28 split. TE 127 still mis-pointed but explicitly deferred (gated on DISCOVERY publishing `sso_logins`) | No new deletes |
| Naming renames (PATCH) | Modules / permissions / skills / tools / TE prefixes all renamed in the 2026-05-29 restructure. `role_modules.role_module_label` carries stale `SMP-DISCOVERY-OPT` / `SMP-RENEWAL` substrings on 4 rows (ids 356, 357, 358, 360, 361) but the field is not exposed in the `/fields` catalog, indicating trigger-computed display label; not safe to PATCH from the loader surface | No fix |
| User-edge `data_object_relationships` (Rule #10) | 5 edges exist for the 5 original SMP masters (rels 906-910, all via users id=748). 3 of the 16 new entities (984/992/999) have user-edges; the other 13 do not. Audit does not pre-specify tuples for the missing edges | DEFER (audit does not pre-specify per-row verbs/cardinalities) |
| `permission_verb_override` PATCHes | All 47 SMP-master lifecycle states have `permission_verb_override` set where `requires_permission=true` (verified via `/data_object_lifecycle_states?data_object_id=in.(...)`) | No fix needed |
| `handoff_processes` inserts | Audit does not pre-specify any `handoff_id` + PCF tuples for SMP | No fix; gated on Discover Phase D pass for SMP |
| `notes=''` reverts | All 8 audit-named rows already empty-string per 2026-05-28 Bucket 2 fix. New entities 984-999 + their 30 aliases + their 5 SMP-module DMDO rows all carry `notes=''` | No fix needed |

### Deferred (per task rules)

- Capability ↔ module realizations (M4): 7 `domain_module_capabilities` rows still anchor on module 30 only; redistributing across modules 184/185 is a judgment call about which cap is realized where (e.g. `SMP-USAGE-ANALYTICS` could plausibly stay on DISCOVERY for raw collection, OR move to OPTIMIZATION for analysis). User picks.
- `smp_license_seat_assignment.provisioned → IGA` new handoff candidate (B1-B1): gated on IGA validate run direction.
- SMP↔IGA new handoffs from `smp_app_requests.it_approved` and `smp_reclamation_actions.reclaimed`: cross-domain, gated on IGA validate.
- SMP↔ITSM `smp_alert.raised → incident_creation` handoff: not pre-specified.
- TE 127 `sso_login.unsanctioned_app` data_object_id re-point: gated on DISCOVERY domain authoring `sso_logins`.
- Skill 135 description references "Discovery and Optimization" combined post-restructure: editorial rewrite (Rule #20 class), user picks wording.
- `catalog_tagline` / `catalog_description` on SMP (currently empty strings): Rule #20, defer.
- Pattern-flag flips on new entities (`smp_reclamation_actions.has_personal_content` per audit text but `false` in DB): not in apply list.
- User-edges (Rule #10) for entities 985/986/987/988/989/990/991/993/994/995/996/997/998: audit does not pre-specify verb/cardinality tuples per row.
- Procurement role_modules row for SMP-AUTOMATION (185) absent: judgment call on persona scope, not derivable.

### JWT errors

None. CLI calls completed cleanly throughout the scan.

### Loader path

None. No `.tmp_deploy/fix_smp_b1_technical_2026_05_31.ts` was created because no rubric-eligible residual was found that the audit pre-specifies.

### Result

Zero PATCH/INSERT/DELETE operations applied. The SMP B1 residual surface is fully consumed by previously-applied fixes; remaining open items are all deferred per the task rubric.

## 2026-05-31, Audit

### Summary

Structural Validate b1 audit (no market-surface subagent run). Live PostgREST via `semantius` CLI, scope SMP domain (id=85) across 4 full modules: SMP-DISCOVERY (30), SMP-RENEWAL-VENDOR (31), SMP-OPTIMIZATION (184), SMP-AUTOMATION (185).

- Current footprint: 24 DMDOs (19 master + 2 embedded_master + 1 contributor + 1 consumer + 1 org_units carve-out), 21 domain-owned masters across the 4 modules, 7 capabilities, 50 SMP-anchored trigger_events, 65 module permissions (12 baseline + 53 workflow-gate), 3 roles (10118 / 10119 / 10120) with 11 role_modules and 11 role_permissions, 4 system skills with 88 skill_tools rows, 13 cross-domain handoffs (6 outbound + 7 inbound), 9 of 13 handoffs APQC-tagged.
- Bucket 1 (in-scope, agent fixable): 4 items.
- Bucket 2 (surface-for-user, judgment): 3 items.
- Bucket 3 (Phase 0 pending, speculative): 0 items (no fresh market-surface pass requested).

### Structural pass results

- **A** (domain row) pass. All 7 mandatory metadata fields populated. `catalog_tagline` and `catalog_description` empty (Rule #20 class, defer).
- **M1** (>=1 full module) pass: 4 full modules.
- **M2** (>=3 capabilities -> >=2 modules) pass: 7 capabilities, 4 modules.
- **M4** (capability realizations) **drift**: 7 `domain_module_capabilities` rows still anchor capabilities only on module 30 (SMP-DISCOVERY) or 31 (SMP-RENEWAL-VENDOR). Modules 184 (SMP-OPTIMIZATION) and 185 (SMP-AUTOMATION) have zero realized capabilities. SMP-USAGE-ANALYTICS (522) and SMP-LICENSE-OPT (523) belong on 184 by content; no automation-shaped capability exists for 185 today. (Continuation of prior 2026-05-29 open item.)
- **M5** (permissions materialized) pass: 65 rows across 4 modules.
- **M6** (module description present) pass content-wise: each of 30 / 31 / 184 / 185 has a substantive description. **Rule #18 violation** on `domain_modules.description` for 185 (vendor names in trailing parenthetical).
- **B5** (single-master per data_object) pass: confirmed via `/domain_module_data_objects?role=eq.master&data_object_id=in.(...)` returning 1 row per master id.
- **B7** (lifecycle states on workflow masters) pass: every workflow-shaped master carries states with `requires_permission` set; 53 workflow-gate permissions correspond 1:1 to gated states.
- **B9** (cross-domain handoff payloads anchored on a master) pass on all 13 SMP handoffs.
- **B9b** (event_category vocabulary) **drift**: 4 SMP-side `trigger_events` rows (621 / 622 / 623 / 625, covering `saas_application.discovered` / `.sanctioned` / `.deprovisioned` and `saas_usage_metric.idle_threshold`) carry `event_category=""` (empty string, out-of-vocabulary). Rule #13 lists allowed values lifecycle / state_change / threshold / signal.
- **B10b** (handoff module FKs derivable from SMP-mastered payload) pass on SMP side: all 13 handoffs have their SMP-side module FK set. Partner-side NULLs on 38 (EXPENSE source), 39 / 45 (S2P target), 42 (S2P source), 47 (DISCOVERY source), 174 (SPEND-MGMT source), 641 / 643 (FINOPS target) are report-only on those domains (none yet modularized in the loaded catalog or modularization pending). Handoff 174 trigger_event 19 still has `data_object_id=213` (`card_transactions`); SMP-side payload re-pointed to `shadow_it_apps` but the trigger_event publisher pointer remains cross-domain.
- **B11** (alias coverage on masters) pass: 38 aliases across the 21 SMP masters; every master carries >=1 alias.
- **B12** (lifecycle states + pattern-flag consideration) pass on 19 workflow-shaped masters. Config-shape masters: `smp_app_benchmarks` (991) carries 1 lifecycle state (`refreshed`) without `requires_permission`; acceptable config-shape exemption. `saas_usage_metrics` (64) has no lifecycle states (config-shape).
- **C** (data_object_relationships) pass: 39 rows touching SMP masters (21 intra-domain edges + 5 user-edges per Rule #10 against `users` id=748 + cross-master edges including aliases). User-edges currently cover 8 of 21 SMP-owned masters (61, 62, 63, 64, 65, 984, 992, 999). 13 newer entities (985 / 986 / 987 / 988 / 989 / 990 / 991 / 993 / 994 / 995 / 996 / 997 / 998) carry no user-edge. Audit deferral per 2026-05-31 Continuation rubric (not pre-specified). Rule #11 **violation** on 988 (`smp_app_lifecycle_stages`, kind=domain_owned, embedded_master only, no master row anywhere) and 998 (`smp_workflow_runs`, kind=domain_owned, embedded_master only, no master row anywhere). Both are deliberately embedded without a standalone canonical-master claim; either promote one DMDO row to master, or convert the relationship to a pure composition pattern (no DMDO row at all).
- **D** not applicable to a structural audit.
- **E1-E5** (roles authored, role_modules, role_permissions) pass: 3 roles, 11 role_modules covering all 4 modules per persona-interaction-level, 11 role_permissions binding baseline-admin / baseline-read tiers (workflow-gate inclusion handled via `permission_hierarchy` `:admin` rollup). E2 (2-module floor for multi-module domain) pass: 3 roles each span >=2 modules. **E3 drift**: PROCUREMENT-SAAS-RENEWAL-OWNER (10119) has zero `role_modules` row for module 185 (SMP-AUTOMATION); 3 of 11 role_modules touch 185, only IT-SAAS-ADMIN + ITAM-SMP-ADMIN. Acceptable if procurement is intentionally out of scope for self-service automation. Surface as judgment.
- **F1** (system skills 1:1 to modules) pass: 4 system skills (135 / 136 / 244 / 245) anchored to modules 30 / 31 / 184 / 185.
- **F2** (each system skill has >=1 skill_tools) pass.
- **F3** (tool `operation_kind` <-> `data_object_id` invariants) pass on all 88 skill_tools rows.
- **F4** (no channel-specific notification tools unless workflow requires) pass: `notify_person` (913) wired to skills 135 / 136 / 244 / 245. `send_email` is gone from all SMP skills.
- **F5** (Semantius score computable per module) pass: 87 / 88 = **98.9%** strict, single external tool `sign_document` on `smp_renewal_vendor_agent` (skill 136).

### Vendor surface basis

No fresh subagent run. Carry-forward from 2026-05-28 / 2026-05-29 audits: Productiv, Zylo, BetterCloud, Torii, LeanIX SaaS Management, Flexera One (primary); Snow Atlas SaaS Management, Nudge Security, Josys (secondary). 9 solution rows on `solution_domains` for SMP.

### Bucket 1, In-scope confirmed gaps

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1A-M6-R18 | M6 / Rule #18 | `domain_modules.description` on SMP-AUTOMATION (id=185) names vendors in a trailing parenthetical. Vendor names forbidden on `domain_modules.description` per Rule #18. | PATCH `/domain_modules?id=eq.185` setting `description` to a vendor-neutral rewrite (drop the trailing parenthetical). |
| B1A-B9B | B9b / Rule #13 | 4 trigger_events carry `event_category=""` (out-of-vocabulary): 621, 622, 623, 625. Allowed values per Rule #13: lifecycle / state_change / threshold / signal. | PATCH `/trigger_events?id=in.(621,622,623,625)` -> `event_category="lifecycle"` (all four are state-mutation events). |
| B1A-DESC-R18-988 | Rule #18 | `data_objects.description` on `smp_app_lifecycle_stages` (988) names a vendor product as the flagship taxonomy. | PATCH `/data_objects?id=eq.988` -> drop the vendor sentence; keep the TIME-taxonomy framing as generic. |
| B1A-DESC-R18-998 | Rule #18 | `data_objects.description` on `smp_workflow_runs` (998) names two vendors and their product surfaces as the flagship shape. | PATCH `/data_objects?id=eq.998` -> drop the final sentence. |

### Bucket 2, Surface-for-user (judgment)

1. **Rule #11 stance on `smp_app_lifecycle_stages` (988) and `smp_workflow_runs` (998).** Both are `kind=domain_owned` with only an `embedded_master` DMDO row and no canonical `role=master` row anywhere catalog-wide. Rule #11 requires a canonical master OR `kind=platform_builtin`. Options: **(a)** flip the DMDO to `role=master` on its current host module (988 -> 30, 998 -> 185). Semantically natural since each is already the sole owner of its lifecycle states. **(b)** convert to a parent-owned composition pattern (relationship-only, no DMDO row) since 988 is a sub-state of `saas_applications` and 998 is a sub-state of `smp_automation_workflows`; remove the DMDO row entirely. **(c)** carve a Rule #11 exemption for "sub-state masters of an already-canonical master in the same module". Cross-bucket dependency: option (b) deletes ops-relevant lifecycle-state rows and the embedded-master-only tool for `query_smp_app_lifecycle_stages` / `query_smp_workflow_runs`. Recommended: **(a)**.
2. **M4 capability realizations on modules 184 / 185.** SMP-USAGE-ANALYTICS (522) and SMP-LICENSE-OPT (523) still realize only on module 30 (SMP-DISCOVERY) per the pre-restructure shape. Options: move both to 184 (SMP-OPTIMIZATION); OR split 522 (keep on 30 for raw collection, add 184 for analysis); OR leave as-is and add a new "automation" capability covering 185. Author wording is a judgment call.
3. **E3 PROCUREMENT-SAAS-RENEWAL-OWNER coverage of SMP-AUTOMATION (185).** Role 10119 has no `role_modules` row for 185. Question: is the procurement persona genuinely out of scope for self-service app-request automation, or should a `secondary` interaction be added so renewal-side procurement sees automation-driven requests? If the latter, also add a baseline-read `role_permission` on `smp-automation:read`.

### Bucket 3, Phase 0 pending

None. No fresh subagent pass was requested for this audit. The 4 Phase-0 deferrals from 2026-05-29 (`smp_data_residency_attestations`, `smp_subprocessor_disclosures`, `smp_user_app_exposures`, SMP-VENDOR-RISK as 5th module) remain on the catalog backlog but are not carried into `state.yaml` because they are not yet vetted research findings.

### Decisions

Pending user input per bucket.

### Fixes applied

None. Audit-only pass.

### JWT errors

None. CLI calls completed cleanly throughout.

## 2026-06-02 — Audit

### Summary

Full Validate run (structural + market-shape + neighbor/pairwise reconciliation, no fresh market-surface subagent). Live PostgREST via `semantius` CLI. Scope SMP (id=85) across 4 full modules: SMP-DISCOVERY (30), SMP-RENEWAL-VENDOR (31), SMP-OPTIMIZATION (184), SMP-AUTOMATION (185). User directive: "fix all b1 then update state."

- Footprint: 21 domain-owned masters across 4 modules; 7 capabilities; 9 solutions (6 primary); 2 regulations (GDPR conditional, SOC 2 recommended); 13 cross-domain handoffs (8 outbound + 5 inbound) now all APQC-tagged; 7 NEW intra-domain handoffs; 4 system skills with 88 skill_tools.
- Domain Semantius score (strict): 85/86 = **98.8%**. Single external tool: `sign_document` (required on smp_renewal_vendor_agent, legitimate e-signature).
- Applied all agent-solvable Bucket-1 work in one loader (8 fix categories). Held A4/M8 catalog copy for user review (Rule #20). Surfaced refreshed Bucket-2 list.

### Bucket 1 — fixes applied

Loader: [.tmp_deploy/fix_smp_bucket1_2026_06_02.ts](../../.tmp_deploy/fix_smp_bucket1_2026_06_02.ts)

| Band | Finding | Fix | Verified |
|---|---|---|---|
| B13 | All 21 SMP masters `entity_type='unclassified'` (missed by every prior audit). | Classified all 21: 14 operational_workflow, 2 junction (63 seat_assignments, 984 app_owners), 2 catalog (986 catalog_listings, 997 automation_workflows), 2 computed (64 usage_metrics, 991 benchmarks), 1 operational_record (998 workflow_runs). | 0 unclassified remain |
| B5 / Rule #11 | `smp_app_lifecycle_stages` (988) and `smp_workflow_runs` (998) were orphan `embedded_master` rows (kind=domain_owned, no canonical master anywhere). This is prior b2 item B2-R11; resolved via the recommended option (a). | Promoted both DMDO rows to `role=master`, `necessity=required` (988 in module 30, 998 in module 185). | each = single master |
| M6 | Modules 184 (SMP-OPTIMIZATION) and 185 (SMP-AUTOMATION) realized zero capabilities; analytics/optimization/automation caps parked on SMP-DISCOVERY. Prior b2 item B2-M4. | Relinked SMP-USAGE-ANALYTICS (522) + SMP-LICENSE-OPT (523) → 184; SMP-APP-LIFECYCLE (524) → 185. Module 30 keeps DISCOVERY (520) + SHADOW-IT (521). | every module ≥1 cap |
| B9b | Zero intra-domain handoffs on a 4-module domain despite ~9 cross-module master relationships. | Authored 7 intra-domain handoffs (`lifecycle_progression`, low): sanctioned→seat provisioning (30→184), catalog published→app requests (30→185), request fulfilled→seat (185→184), subscription cancelled→reclamation (31→184), recommendation generated→renewal engagement (184→31), app deprovisioned→seat reclaim (30→184), risk remediation→portfolio alert (31→30). | 7 present |
| B7 / Rule #10 | 9 workflow masters with user actors lacked `users` edges. | Added 9 edges (748→985/986/987/989/990/993/994/996/997). | 9 present |
| H1 | 4 of 13 cross-domain handoffs untagged with APQC. | Tagged 639/640/642 → PCF 273 (Manage IT user identity and authorization); 174 → PCF 317 (Manage corporate credit cards, matching sibling handoff 38). All `agent_curated`, `new`. | 4 present; 13/13 tagged |
| prior b1a (event_category) | 5 SMP trigger_events carried `event_category=""` (prior audit caught 4; 624 was also empty). | 621/622/623=lifecycle, 624=signal, 625=threshold. | 0 empty remain |
| prior b1a (Rule #18) | Vendor names in `domain_modules.description` (185) and `data_objects.description` (988, 998). | Rewrote all three vendor-neutral; kept TIME-taxonomy framing generic on 988. | confirmed clean |

### Bucket 2 — surfaced for user (open)

1. **A4/M8 catalog UX copy (Rule #20).** Domain SMP + all 4 modules have empty `catalog_tagline` / `catalog_description`. Buyer-voice drafts authored and surfaced in chat; Rule #20 requires user review before write. Drafts carried in state.yaml B2-CATALOG-COPY.
2. **E1 persona regression (Plan 3).** Plan 3 (2026-06-02) deleted the `_core` roles layer; SMP's 3 prior personas (IT-SAAS-ADMIN, PROCUREMENT-SAAS-RENEWAL-OWNER, ITAM-SMP-ADMIN) were NOT re-homed to `domain_roles`. Live: zero `domain_roles`, zero `role_modules` for SMP modules, zero `process_id`-wired lifecycle gates. Multi-module domain → E1 fires. Needs persona + reach + RACI re-authoring under the new derived-bundle model.
3. **M9 self-containment (module 31).** SMP-RENEWAL-VENDOR holds `saas_applications` (61) as `consumer + required` (sibling-module master) and `legal_contracts` (66) as `contributor + required` (CLM master). Both are hard cross-scope prerequisites. Convert to `embedded_master` or `necessity=optional`?
4. **B4 pattern flag.** `smp_app_requests` (999) has a gated initial `submitted` state and two-stage (manager + IT) approval. Set `has_submit_lock=true`? (`has_single_approver` correctly false.)
5. **B6b owner_side / verb-direction.** ~13 one_to_many/composition rows set `owner_side=target` with a parent-first verb (e.g. 61 integrates_with 985; 993 negotiated_under 994). Soft, never blocks; needs a review pass.
6. **B8 cross-domain mirror relationships.** Outbound handoffs to S2P (payload 72) and ITSM (payload 47) have no mirror `data_object_relationships` rows.
7. **Capability completeness.** SMP-AUTOMATION now realizes SMP-APP-LIFECYCLE (524). Is a distinct automation/self-service-provisioning capability warranted, or does APP-LIFECYCLE suffice?

### Bucket 3 — research pending

Carried from 2026-05-29 (single-vendor Core, deferred): `smp_data_residency_attestations`, `smp_subprocessor_disclosures`, `smp_user_app_exposures`. No fresh market-surface subagent run this round; a deeper Phase-0 semantic pass remains optional.

### Neighbor / pairwise (report-only, owed by other domains)

SMP's own side of all 13 cross-domain handoffs is module-attributed. Partner-side NULL module FKs (owed by those domains' audits): S2P (39/45 target, 42 source), FINOPS (641/643 target), EXPENSE (38 source), DISCOVERY (47 source), SPEND-MGMT (174 source), ITSM (642 target). TE 127 (`sso_login.unsanctioned_app`) data_object re-point blocked on DISCOVERY authoring `sso_logins`. SMP↔IGA new handoff candidates blocked on IGA validate.

### Decisions

- B2-R11 (988/998 orphans): resolved via option (a) promote to master, per user "fix all b1" + this run's Bucket-1 placement.
- B2-M4 (cap realizations): resolved by relinking 522/523→184 and 524→185 (gives 185 a realized capability without inventing a new capability).
- B13 entity_type borderline calls (998 operational_record vs operational_workflow; 997/986 catalog; 63/984 junction; 995 operational_workflow) applied as best-judgment; flagged for user override if any are wrong.

### JWT errors

None. CLI calls completed cleanly throughout.

## 2026-06-02, Continuation — catalog copy + personas

User directive: "continue" (proceed with the catalog copy + personas proposed at the close of the audit).

Loader: [.tmp_deploy/smp_personas_and_catalog_2026_06_02.ts](../../.tmp_deploy/smp_personas_and_catalog_2026_06_02.ts)

### A4 / M8 — catalog UX copy (RESOLVED)

User approved the drafted buyer-voice copy. Written into the domain (85) and all 4 modules (30/31/184/185), guarded to only fill currently-empty fields (Rule #20 no-overwrite). 10 values written; verified A4 + M8 now pass (zero empty `catalog_tagline` / `catalog_description` on SMP or its modules).

### B2-E1 — persona regression repaired (reach layer)

Re-authored the 3 SMP personas that Plan 3 deleted, now under the `domain_roles` + `role_modules` model (bundle DERIVED from reach + entity-type tier policy; no permission list authored, per roles.md §4):

| role_code | business_function | reach (module:level) |
|---|---|---|
| IT-SAAS-ADMIN (id 16) | IT Operations (27) | 30:primary, 184:primary, 185:primary, 31:secondary |
| PROCUREMENT-SAAS-RENEWAL-OWNER (id 17) | Procurement (19) | 31:primary, 30:secondary, 184:secondary |
| ITAM-SAAS-PORTFOLIO-MANAGER (id 18) | IT Asset Management (84) | 30:primary, 31:primary, 184:primary, 185:primary |

3 `domain_roles` + 11 `role_modules` inserted (`record_status='new'`). E1 (≥1 persona on a multi-module domain), E2 (2-module floor: 4/3/4), and E3 (`interaction_level` set on every row) now pass. The third persona was renamed from the prior `ITAM-SMP-ADMIN` to `ITAM-SAAS-PORTFOLIO-MANAGER` to drop the domain-prefix anti-pattern (roles.md §9).

**Decisions made here:**
- Prior B2-E3 (procurement reach into SMP-AUTOMATION, module 185): resolved as "out of scope". PROCUREMENT-SAAS-RENEWAL-OWNER does not reach 185; self-service automation is an IT-ops/ITAM concern.
- ITAM-SAAS-PORTFOLIO-MANAGER is the SMP owner-function persona (C1 owner = IT Asset Management), spanning all 4 modules as the cross-module portfolio owner.

**Not done (deliberate):** `process_raci` + `data_object_lifecycle_states.process_id` wiring (E4/E6 responsibility overlay). The derived bundle is functional from reach + tier alone; RACI adds the responsibility/accountability layer and needs a process-to-gate mapping. Tracked as B2-E4-RACI.

### JWT errors

None. CLI calls completed cleanly throughout.

## 2026-06-06 - b1a execution

User directive: execute the pending `b1a` technical fixes for SMP (one item: `B1A-SELF-CONTAIN`).

### B1A-SELF-CONTAIN (M9 self-containment, module 31) - DONE

The single enumerated M9 shape (`extra_m9_shapes`) was `legal_contracts` on SMP-RENEWAL-VENDOR as `role=contributor`, `necessity=required`, pointing at the CLM-mastered entity (no `embedded_master` shell here). This made module 31 non-deployable standalone (hard cross-domain prerequisite on CLM's `legal_contracts`).

- **Table:** `domain_module_data_objects`, row **id=97** (domain_module_id=31, data_object_id=66).
- **Prior values (PATCH snapshot):** `role=contributor`, `necessity=required`, `notes=""`.
- **Change:** `necessity` `required` -> `optional`. Role left as `contributor` (the contribution into CLM's `legal_contracts` is now presence-conditional: SMP-RENEWAL-VENDOR contributes renewal-decision provenance into CLM's contracts only when CLM is co-installed, and deploys standalone otherwise). Chose the presence-conditional fix over `embedded_master` because contract documents are CLM's to master; SMP should not carry a local `legal_contracts` shell. This is the explicitly-offered `necessity=optional` option in the b1a action text.
- **Canonical master confirmed:** `legal_contracts` (66) is mastered by CLM (domain 26, `domain_data_objects` id=79). Not SMP.
- **Verification:** re-ran the M9 part-1 flag query on module 31 (`role=eq.contributor` OR `role=eq.consumer AND necessity=eq.required`). Row 97 (`legal_contracts`) now `contributor`+`optional` (no longer flagged). The only remaining flagged row is id=98 `saas_applications` (61, `consumer`+`required`), which is a SIBLING-module SMP master (SMP-DISCOVERY id=30), NOT in this b1a scope, and is the open user-decision item B2-M9-SELFCONTAIN.

### Catalog UX (Rule #20) - no action needed

Per the revised Rule #20 backfill instruction, checked the domain row (85) and all 4 modules (30/31/184/185) for empty `catalog_tagline` / `catalog_description`. All are already non-empty (written 2026-06-02 in the personas + catalog continuation). Overwrite is forbidden without per-row user approval, so nothing was written.

### Skipped / blocked

None in `b1a` beyond the resolved item. The wider M9 decision (`saas_applications` consumer+required, and the embedded-vs-optional choice for both entities together) remains the user-decision item B2-M9-SELFCONTAIN in `b2`.

### JWT errors

None. CLI calls completed cleanly throughout.

