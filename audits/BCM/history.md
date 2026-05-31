# BCM audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 0 entities across 0 modules; 0 capabilities; 5 solutions; 4 regulations; 0 trigger_events on BCM-mastered objects; 0 outbound handoffs; 1 inbound handoff (from GRC, both module FKs NULL); 2 business_function_domains rows (owner GRC, contributor IT Operations); 0 skills; 0 sub-domains.
- BCM is flagged by SKILL.md as a leadership-tier domain (B1 exception list). The catalog state is consistent with that label (zero masters, zero modules), but the live solution mix (Fusion Framework System primary, Castellan primary, Riskonnect, ServiceNow IRM, Archer Suite) shows pure-play BCM specialists, which is the test for a real point-solution market with its own mastered substrate. The leadership-tier label is itself a Bucket 2 question.
- Market surface basis: Fusion Framework System (pure-play BCM specialist), Castellan (pure-play BCM specialist), Riskonnect (IRM-suite with strong BCM module), Archer Continuity (IRM-suite), Everbridge / OnSolve (mass-notification + critical-event-mgmt overlap with BCM exercise comms).
- **Bucket 1 (in-scope, agent fixable):** 8 items.
- **Bucket 2 (surface-for-user, judgment):** 4 items.
- **Bucket 3 (Phase 0 pending, speculative):** 12 items.

Structural pass: M1 fails outright (0 modules) which blocks the M-band entirely; A2 fails (0 capabilities); A4 fails (catalog_tagline and catalog_description empty); A1 passes (all seven business-metadata fields populated); A3 passes (5 solutions, 2 primary); B1 passes by leadership-tier exception; B2-B12 vacuously pass (no masters to check); C1 passes; D1 deferred (nothing rendered yet); E1 vacuously passes (no modules, so the 2-module floor cannot be tested); F1-F5 fail because no skills exist for the zero modules; H1 has 1 cross-domain inbound handoff already carrying an APQC tag (1/1 covered, all `record_status='new'`, sole tag is `discovery_substring`).

The single inbound handoff (id 253, GRC to BCM) is structurally defective on multiple axes (see B1-S5).

### Pass 1, Structural findings

S-band sweep (S1, S2, S3): S2 and S3 are vacuous (no modules and no masters). S1 zero-row anomalies route into A2, A4, M1, F2.

A1 PASS, A2 FAIL (0 capabilities), A3 PASS, A4 FAIL, A5 not run.

M1 FAIL (0 modules, see B1-S1 below). M2-M7 are vacuous given M1 fail.

B1 PASS by leadership-tier exception (BCM is listed in SKILL.md B1 exception list). B2-B12 vacuous.

C1 PASS (owner GRC, contributor IT Operations).

E1 vacuously PASS (no modules).

F1-F5 FAIL (no module-level system skills exist because no modules exist; rolls up into B1-S1 fix).

H1 PASS in coverage (1 of 1 inbound handoff has an `handoff_processes` row), but the row is `discovery_substring` with `record_status='new'`, and the trigger event itself is the defective trigger 227 (see B1-S5).

### Pass 2, Market audit (semantic)

The catalog declares BCM as leadership-tier (no masters expected), but the solution mix carries two flagship pure-play BCM specialists (Fusion Framework System, Castellan) and three IRM-suites with first-class BCM modules. Pure-play vendors with their own schema is the SKILL.md rule #2 point-solution-market test for promoting a market from sub-feature to its own domain. The current zero-master footprint is therefore inconsistent with the solution evidence; the leadership-tier label is the Bucket 2 question (B2-1).

Vendor surface (union of Fusion Framework System, Castellan, Riskonnect, Archer Continuity, ServiceNow BCM, plus Everbridge / OnSolve for exercise comms and the regulatory surface for ISO 22301, NIS2, DORA, NIST CSF):

Core master records the BCM market expects:

- `business_continuity_plans` (the top-level BCP document, owns RTO / RPO targets, lifecycle states draft / approved / active / superseded)
- `business_impact_analyses` (the BIA artifact, scopes a business process or service, drives RTO / RPO)
- `business_services` (the BCM-anchored view of business services, often shared as embedded_master from a CMDB or service-portfolio master)
- `dependency_maps` (service-to-app-to-infra mapping that drives recovery sequencing)
- `recovery_strategies` (the per-asset / per-service strategy: hot site, warm site, manual workaround)
- `disaster_recovery_plans` (the IT-side recovery plan, distinct from a BCP; some catalogs split DRP into its own domain)
- `continuity_exercises` (tabletop, walkthrough, full-interruption test records with scheduled / executed / closed lifecycle)
- `exercise_findings` (per-exercise gaps and action items, fed back to plans)
- `crisis_events` (the live invocation of a plan, owns activation / stand-down lifecycle)
- `crisis_communications` (per-event outbound communications log, often delivered via Everbridge / OnSolve)
- `emergency_contacts` (the crisis-call-tree / mass-notification roster)
- `rto_rpo_targets` (often inlined as fields on business_services or BIAs; vendor-shape varies)

Junctions / transitions: `plan_versions`, `bia_business_service_links`, `exercise_participants`, `crisis_event_actions`, `plan_review_cycles`.

Compliance entities driven by DORA, NIS2, ISO 22301, NIST CSF: `dora_third_party_register_entries` (third-party ICT dependency register), `regulatory_continuity_reports`, `ict_third_party_incidents`.

Modularization hypothesis (if BCM is promoted to non-leadership): two full modules at a minimum, `BCM-PLANNING` (BIAs, BCPs, DRPs, recovery strategies, business_services consumption) and `BCM-EXERCISE-AND-CRISIS` (exercises, findings, crisis events, communications, contacts). Plus optional `BCM-DORA-RESILIENCE` if the DORA / NIS2 substrate justifies its own module.

### Pass 3, Neighbor discovery

Edge weight derived from handoffs and DMDO cross-references:

| Neighbor | Outbound | Inbound | DMDO cross | Edge weight | Pass-4 treatment |
| --- | --- | --- | --- | --- | --- |
| GRC | 0 | 1 (handoff 253) | 0 (no DMDOs at all) | 1 | one-line summary |

No neighbor at weight >= 3 exists. BCM has no DMDO rows of any kind, no outbound handoffs, no other inbound handoffs. The single boundary that exists (GRC, weight 1) gets a one-line summary in Pass 4.

### Pass 4, Pairwise reconciliation (none at weight >= 3)

GRC, BCM (weight 1, one-line summary): inbound handoff 253 publishes `assessment.completed` (trigger 227, defective per SKILL.md, points at `risk_assessments` not the payload `compliance_risks`) from GRC to BCM. Both module FK columns NULL on both sides. BCM has no DMDO row declaring any role on `compliance_risks`. The cross-domain relationship mirror is absent. Section 1 (fully wired): 0 rows. Section 2 (NULL module FK): 1 row (handoff 253). Section 3 (missing handoffs): cannot evaluate (BCM has no DMDOs at all). Section 4 (boundary integrity): the payload `compliance_risks` is mastered by GRC (id 282, role=master) so B5 holds, but BCM declares no role on it. Section 5 (relationship mirror): no `data_object_relationships` row exists from a GRC master into a BCM master (there are none on BCM to mirror into). The entire boundary is owed by report-only follow-ups on both sides; nothing in this pass produces in-scope BCM fixes beyond what Bucket 1 already lists (B1-S5).

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures (M1, A2, A4, F2)

| ID | Band | Finding | Fix |
| --- | --- | --- | --- |
| B1-S1 | M1 | Zero `domain_modules` rows. Even leadership-tier domains require >=1 `module_kind='full'` row per Rule #14 (a "derived-signals" or "landing" module preserving the deploy-target contract). | Author 1 landing module, code `BCM-LANDING` (or similar), `domain_id=17`, `module_kind='full'`, empty `domain_module_data_objects` set is acceptable for a leadership-tier landing surface. Cascades into F2 (one system skill on the new module). |
| B1-S2 | A2 | Zero `capability_domains` rows. Even leadership-tier domains usually carry 2-4 capability links describing what the market does at the capability level. | Draft 3-5 capabilities aligned to the BCM vendor surface (e.g. `business-impact-analysis`, `continuity-planning`, `exercise-execution`, `crisis-management`, `dependency-mapping`) and link via `capability_domains`. |
| B1-S3 | A4 | `catalog_tagline` and `catalog_description` are empty strings on the BCM row (Rule #20). | Draft buyer-voice tagline and description per Rule #20, surface for user review BEFORE writing. Voice rule: workflow + value, not analyst voice. |
| B1-S4 | F2 | Zero `skills` rows on BCM at any level (`domain_id=17` returns nothing, no `domain_module_id`-anchored rows). After B1-S1 lands, the landing module needs exactly one `skill_type='system'` skill per Rule #17. | Author 1 system skill on the new landing module, with the minimal tool set the leadership-tier surface needs (typically `query_*` over consumed masters once the module declares its consumer DMDOs). Defer this until B2-1 resolves, since the answer to B2-1 changes whether the skill is on `BCM-LANDING` alone or on `BCM-PLANNING` + `BCM-EXERCISE-AND-CRISIS`. |

#### BOUNDARY findings

| ID | Finding | Fix |
| --- | --- | --- |
| B1-S5 | Handoff 253 (GRC to BCM) carries the defective `trigger_event` 227 (`assessment.completed`, points at `risk_assessments` not the payload `compliance_risks` per the same defect noted in SKILL.md against ATS-related rows 1180 / 1181). Both `source_domain_module_id` and `target_domain_module_id` are NULL. BCM has no DMDO row declaring any role on `compliance_risks`, so target-side attribution cannot resolve without B1-S6 too. | Two-step: (a) repoint handoff 253's `trigger_event_id` to a non-defective trigger keyed against `compliance_risks` (existence of such a trigger needs verification; if absent, this becomes a GRC B9 fix, surface in report-only). (b) After B1-S1 lands, set `source_domain_module_id` to the GRC module that holds `compliance_risks` (currently no GRC modules exist, so this side is GRC B10b report-only) and `target_domain_module_id` to the new BCM landing module after B1-S6 adds a consumer DMDO. |
| B1-S6 | BCM declares no role on `compliance_risks` (the payload it receives), and no role on any other data_object the BCM market would consume to compute derived signals. A leadership-tier landing module should still declare consumer DMDOs for the masters it reads from. | After B1-S1 lands, add `domain_module_data_objects` rows on `BCM-LANDING` with `role='consumer'` for at least `compliance_risks` (id 282) so handoff 253 has a resolvable target module. Likely additional consumer rows on related GRC and IT Operations masters once B2-1 is resolved. |

#### APQC TAGGING (per-handoff PCF activity classification)

BCM has 1 cross-domain handoff total (inbound 253; 0 outbound). The existing tag on handoff 253 is a `discovery_substring` row at `record_status='new'` pointing at process 271 ("Conduct and analyze IT compliance assessments", external_id 20743, hierarchy_level 3). The agent reviewed this against the trigger semantics (the event is a compliance-assessment completion firing a compliance_risks payload to BCM for continuity-plan impact) and the substring tag is plausible but not ideal: process 271 is about IT compliance assessment execution, while the BCM target side reads the result to update continuity exposure, which fits process 1175 ("Manage IT business continuity", 20734, L4) or 269 ("Plan and manage IT continuity", 20731, L3) better.

| handoff_id | source to target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
| --- | --- | --- | --- | --- | --- | --- |
| 253 | GRC to BCM | assessment.completed (defective trigger 227, see B1-S5) | compliance_risks | Plan and manage IT continuity | 20731 | medium L3 (better fit than the existing discovery_substring tag); blocked on B1-S5 trigger-event repointing |

Volume expectation: with N=1 cross-domain handoff, the 0.5N to 0.8N target rounds to "between 0 and 1 NEW `agent_curated` tags". The proposed B1-A1 row is 1 NEW `agent_curated` row, but it is blocked on B1-S5 resolution (the existing substring tag should not be replaced until the trigger event is repointed, otherwise we are tagging a relationship that the handoff itself does not correctly express).

| ID | Action | Status |
| --- | --- | --- |
| B1-A1 | Author `(handoff_id=253, process_id=269, proposal_source='agent_curated', record_status='new')`, leaving the existing `discovery_substring` row in place (the natural composed key allows both). Block on B1-S5. | Blocked on B1-S5. |

### Bucket 2, Surface-for-user (judgment calls)

1. **Is BCM correctly classified as leadership-tier?** The SKILL.md B1 exception list includes BCM, and the catalog state matches that label (zero masters, zero modules, zero capabilities until Bucket 1 lands). But the live `solution_domains` rows include Fusion Framework System (primary, pure-play BCM specialist) and Castellan (primary, pure-play BCM specialist), and the BCM market has flagship vendors with their own schema (BIAs, BCPs, exercises, crisis events, dependency maps), which is the Rule #2 point-solution-market test for a non-leadership domain. The dependency mapping logic on `domains.business_logic` ("Dependency mapping between business services, applications, and infrastructure is the modest algorithmic layer") describes algorithmic substance, not pure derived signals. **Options:** (a) keep leadership-tier label, author `BCM-LANDING` only, declare consumer DMDOs on GRC and ITSM masters; (b) promote BCM to a non-leadership domain, author `BCM-PLANNING` and `BCM-EXERCISE-AND-CRISIS` modules with masters for `business_continuity_plans`, `business_impact_analyses`, `continuity_exercises`, `crisis_events`, etc; (c) hybrid: author `BCM-LANDING` now as a thin starter while deferring the master-bearing modules to a follow-up Phase 0 vendor-research load. Has a cross-bucket dependency on Bucket 3 (the speculative master list is itself the substrate for option b).

2. **DRP, separate domain or BCM sub-module?** Vendors split here: ServiceNow and Archer carry distinct DRP modules alongside BCM; Fusion and Castellan fold DR into BCM as a recovery-strategy slice. The catalog currently has no DRP domain. **Options:** (a) keep DR inside BCM as one or two `data_objects` (`disaster_recovery_plans`, `recovery_strategies`) on a future `BCM-PLANNING` module; (b) queue DRP as a separate candidate domain via `append_missing_domain.ts`; (c) defer until the DORA / NIS2 substrate is loaded (which forces an ICT-third-party register that lives more naturally in DRP). Has a cross-bucket dependency on B2-1 (if BCM stays leadership-tier under (a), DRP cannot live inside BCM).

3. **DORA and NIS2 surface ownership.** The four mandatory regulations on BCM include DORA and NIS2, both of which mandate an ICT third-party register, regulatory continuity reporting, and TLPT (threat-led penetration test) artifacts. **The ICT third-party register has stronger ownership claims in TPRM** (a separate domain in the catalog). **Options:** (a) BCM hosts the ICT register as embedded_master from TPRM; (b) BCM consumes from TPRM and the register lives in TPRM; (c) author a separate `OP-RES-DORA` or `BCM-DORA-RESILIENCE` module hosted on both BCM and OP-RES via `domain_module_host_domains`. Independent of B2-1 (the question still applies if BCM stays leadership-tier).

4. **Catalog UX wording for B1-S3.** Rule #20 requires user approval on the exact `catalog_tagline` and `catalog_description` wording before write. The agent will draft both in buyer voice (workflow + value) after Bucket 1 resolution; this row asks the user to confirm that buyer-voice drafting and review is the preferred flow vs the user supplying the wording directly. Independent of other items.

### Bucket 3, Phase 0 pending (speculative; vendor-research vetting needed)

These are candidate masters surfaced by the vendor-surface enumeration above. They are not loadable until Phase 0 vendor research vets each one against the 4-5 flagship surfaces and B2-1 resolves whether BCM stays leadership-tier or promotes to a master-bearing market. All twelve are gated on B2-1.

| Candidate | Proposed module (if B2-1 = promote) | Vendor evidence |
| --- | --- | --- |
| `business_continuity_plans` | BCM-PLANNING | Fusion, Castellan, Archer, Riskonnect, ServiceNow (universal) |
| `business_impact_analyses` | BCM-PLANNING | Universal across all 5 flagship vendors |
| `business_services` | BCM-PLANNING (likely embedded_master from a CMDB or service-portfolio master) | Universal |
| `dependency_maps` | BCM-PLANNING | Fusion, Castellan, ServiceNow (depends on CMDB integration) |
| `recovery_strategies` | BCM-PLANNING | Universal |
| `disaster_recovery_plans` | BCM-PLANNING (or separate DRP domain per B2-2) | Vendor split, see B2-2 |
| `continuity_exercises` | BCM-EXERCISE-AND-CRISIS | Universal |
| `exercise_findings` | BCM-EXERCISE-AND-CRISIS | Universal (Fusion, Castellan, Archer name them differently but same concept) |
| `crisis_events` | BCM-EXERCISE-AND-CRISIS | Universal in Fusion and Castellan; Archer + Riskonnect via "incident" framing |
| `crisis_communications` | BCM-EXERCISE-AND-CRISIS | Universal; specialist depth in Everbridge and OnSolve integrations |
| `emergency_contacts` | BCM-EXERCISE-AND-CRISIS (likely embedded_master from HCM `users`) | Universal call-tree concept |
| `dora_third_party_register_entries` | BCM-DORA-RESILIENCE (new) or embedded_master from TPRM | DORA-mandated for EU financial-sector tenants; vendor support emerging (Fusion has the most mature surface) |

### Cross-bucket dependencies

- B2-1 (leadership-tier vs promote) gates all 12 Bucket 3 items. If B2-1 = keep leadership-tier, every Bucket 3 candidate stays in Bucket 3 pending a separate market load; if B2-1 = promote, the survivors of Phase 0 vendor research become Bucket 1 in a follow-up audit run.
- B2-1 also gates B1-S4 (whether the system skill lives on `BCM-LANDING` alone or on the master-bearing modules), and the scope of B1-S6 (consumer DMDOs are minimal under (a) leadership-tier, broader under (b) promote).
- B2-2 (DRP) depends on B2-1's resolution.
- B2-3 (DORA / NIS2 surface ownership) is independent of B2-1; the ICT register question applies in both leadership-tier and promote scenarios.
- B1-S5 (defective trigger 227) and B1-S6 (BCM consumer DMDOs) are tightly coupled: B1-S5 cannot fully resolve without the target module FK, which depends on B1-S1 plus B1-S6.
- B1-A1 (APQC re-tagging on handoff 253) is blocked on B1-S5 (do not tag what the trigger does not correctly express).

### Per-bucket prompts

- **After Bucket 1:** Fix these now? Reply "all", "just B1-S1, S2, S3, S4", "skip the boundary items (S5, S6) until B2-1 resolves", or "skip".
- **After Bucket 2:** What is your call on B2-1 (leadership-tier vs promote)? This decision shapes Bucket 3 vetting and B1-S4 / B1-S6 scope. Also B2-2 (DRP), B2-3 (DORA ownership), and B2-4 (catalog UX wording flow).
- **After Bucket 3:** Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates ring true; named candidates become Bucket 1 items immediately in a follow-up pass once B2-1 lands.

### Report-only follow-ups (owed by other domains)

- **GRC B9 owes** a non-defective `trigger_event` keyed against `compliance_risks` so handoff 253 can be repointed off trigger 227. The corresponding fix is a GRC trigger-event load, not a BCM load. Same defect surfaced on ATS rows 1180 / 1181 (SKILL.md), which suggests a wider trigger-event audit on GRC is owed.
- **GRC B10b owes** `source_domain_module_id` resolution on handoff 253. GRC currently has zero modules (same M1 fail as BCM), so this is blocked on GRC's M-band audit. Surface to user as a candidate next audit (GRC).
- **GRC B10b owes** `source_domain_module_id` resolution on handoff 252 (GRC to OP-RES, also trigger 227). Same root cause as 253.
- **TPRM B-band check** (if B2-3 resolves to "ICT register lives in TPRM"), TPRM owes a master DMDO on `dora_third_party_register_entries`. Surface as a candidate next audit (TPRM).
- **OP-RES boundary** (if B2-3 resolves to "shared DORA module"), OP-RES owes a `domain_module_host_domains` row linking the cross-cutting module. Surface as a candidate next audit (OP-RES).

### Candidates queued

None. Every market the BCM audit surfaced (BCM itself, DRP) is already represented in the catalog (BCM as the current domain; DRP as a Bucket 2 question, not yet a separate candidate). DORA and NIS2 surface needs are sub-features of BCM / OP-RES / TPRM rather than candidate domains. If the user resolves B2-2 to "queue DRP as a separate candidate", the helper will be run in the follow-up pass after that decision lands.

## 2026-05-31, Continuation: B1 technical fixes

### Fixes applied

None. Every Bucket 1 item is gated on judgment calls (chiefly B2-1 leadership-tier vs promote) or requires authoring entities the subagent prompt classifies as DEFER (new `domain_modules`, new capabilities, catalog UX prose, system skills, DMDO masters). Verified pre-state via reads: BCM (domain 17) still has zero `domain_modules`, zero `capability_domains`, empty `catalog_tagline` / `catalog_description`; handoff 253 still carries `trigger_event_id=227` with both module FK columns NULL.

| B1 ID | Action | Row counts |
|---|---|---|
| (none) | (none) | (n/a) |

### Deferred B1 items

| B1 ID | Reason |
|---|---|
| B1-S1 | Creating a new `domain_modules` row (`BCM-LANDING`) is in the prompt's DEFER list. Requires user sign-off on the code, description, and `module_kind='full'` posture for a leadership-tier landing surface. Also gated on B2-1 (if BCM promotes, the modules become `BCM-PLANNING` + `BCM-EXERCISE-AND-CRISIS` instead). |
| B1-S2 | Authoring 3-5 new capabilities plus `capability_domains` links is a judgment task: capability code / name / description drafting, and the candidate list (`business-impact-analysis`, `continuity-planning`, `exercise-execution`, `crisis-management`, `dependency-mapping`) needs user vetting. Not in the prompt's technical-fix set. |
| B1-S3 | `catalog_tagline` and `catalog_description` drafts are explicitly in the prompt DEFER list (Rule #20 requires per-string user approval before write). |
| B1-S4 | Audit text itself defers this until B2-1 resolves (the host module differs between leadership-tier and promote scenarios). Also gated on B1-S1 landing first. System-skill authoring (Rule #17) is not in the technical-fix set. |
| B1-S5 | Two-part fix is not technical: (a) repointing `trigger_event_id` requires either an existing non-defective trigger keyed against `compliance_risks` (audit notes none is known to exist, becomes a GRC B9 follow-up) or authoring a new trigger event with judgment on naming / category. (b) Setting `source_domain_module_id` and `target_domain_module_id` is blocked because GRC has zero modules (GRC B10b) and BCM-LANDING does not yet exist (B1-S1). Audit derives no concrete FK IDs to backfill. |
| B1-S6 | Adding consumer DMDOs on `BCM-LANDING` is blocked on B1-S1 (target module does not exist). Also requires deciding the full consumer set under B2-1 (minimal under leadership-tier, broader under promote). New `domain_module_data_objects` rows are in the DEFER list. |
| B1-A1 | Audit explicitly marks "Blocked on B1-S5". The proposed `agent_curated` PCF tag (process 269) should not be written while the underlying handoff still mis-expresses the relationship via defective trigger 227. |

UI spot-checks:
- https://tests.semantius.app/domain_map/domain_modules?domain_id=17
- https://tests.semantius.app/domain_map/capability_domains?domain_id=17
- https://tests.semantius.app/domain_map/handoffs?id=253
- https://tests.semantius.app/domain_map/domains?id=17

## 2026-05-31, Audit

### Summary

- Current footprint, verified live: 0 `domain_modules`, 0 `capability_domains`, 0 `domain_data_objects`, 0 `domain_module_host_domains`, 0 `skills` anchored at `domain_id=17`, 5 `solution_domains` (Fusion Framework System primary, Castellan primary, ServiceNow IRM, Archer Suite, Riskonnect Platform secondary), 4 `domain_regulations` mandatory (ISO/IEC 27001, NIST CSF, NIS2, DORA), 2 `business_function_domains` (Governance Risk and Compliance owner, IT Operations contributor), 1 cross-domain handoff (id 253 GRC to BCM, trigger 227 `assessment.completed`, payload `compliance_risks`, both module FK columns NULL), 1 `handoff_processes` row on handoff 253 (`discovery_substring`, `record_status=new`, process 271 "Conduct and analyze IT compliance assessments" L3).
- Structural Validate b1 sweep: every Bucket 1 finding from the 2026-05-30 audit is still in the live catalog unchanged. No drift. The 2026-05-31 Continuation entry already documented that no B1 fixes were applied, since every Bucket 1 item requires either user judgment (B2-1 leadership-tier vs promote) or authoring entities the loader prompt classifies as DEFER (`domain_modules`, capabilities, catalog UX, system skill, DMDOs). This Validate b1 confirms that posture: zero technical fixes available without a B2-1 decision.
- Bucket 1 (in-scope, agent fixable): 7 items, all carried forward from 2026-05-30 (B1-S1, B1-S2, B1-S3, B1-S4, B1-S5, B1-S6, B1-A1). No new B1 findings.
- Bucket 2 (surface-for-user, judgment): 4 items carried forward (B2-1 leadership-tier classification, B2-2 DRP split, B2-3 DORA ownership, B2-4 catalog UX wording flow).
- Bucket 3 (Phase 0 pending, speculative): 12 candidates carried forward, all gated on B2-1.

### Structural band sweep (verbatim verification)

Each band re-evaluated against fresh live reads. Results identical to 2026-05-30.

- **A1 PASS.** All seven business-metadata fields populated: `crud_percentage=92`, `business_logic` populated, `min_org_size=30 m <2500`, `cost_band=$$`, `certification_required=false`, `usa_market_size_usd_m=300`, `market_size_source_year=2025`.
- **A2 FAIL.** Zero `capability_domains` rows. Carried as B1-S2.
- **A3 PASS.** Five `solution_domains`, two primary (Fusion Framework System, Castellan).
- **A4 FAIL.** `catalog_tagline` and `catalog_description` both empty strings. Carried as B1-S3.
- **A5 SKIPPED.** No vendor-ownership refresh requested.
- **M1 FAIL.** Zero `domain_modules`. Rule #14 violation, even for a leadership-tier domain. Carried as B1-S1. M2 through M7 vacuous given M1 fail.
- **B1 PASS by leadership-tier exception.** BCM is on the SKILL.md B1 exception list. The exception itself is the Bucket 2 question (B2-1).
- **B5, B7, B9, B9b, B10b, B11, B12 vacuous.** No masters on BCM, so embedded-master integrity, users-edges, outbound trigger/handoffs, intra-domain handoffs, per-module attribution, aliases, and lifecycle-states checks have no rows to evaluate.
  - B10b is also a target-side concern on the single inbound handoff 253: `target_domain_module_id` is NULL because BCM has zero modules. Carried as B1-S5 (composite with the source-side NULL).
- **C1 PASS.** Owner Governance Risk and Compliance, contributor IT Operations.
- **D1 NOT RUN.** Nothing renders yet (no masters, no modules).
- **E1 vacuously PASS.** No modules, so the >=2-module floor for >=3-capability domains is untestable. E2 to E5 vacuous.
- **F1 to F5 FAIL.** Zero `skills` rows at `domain_id=17`. F2 (system-skill per module) cannot be satisfied because no modules exist. F3 to F5 cascade from F2. All rolls up into B1-S1 plus B1-S4. Carried.
- **H1 EVALUATED.** One cross-domain handoff (253), one `handoff_processes` row (coverage 1 of 1). The row is `discovery_substring` at `record_status=new`, not `approved`, so catalog quality is zero approved. The proposed `agent_curated` re-tag (process 269 "Plan and manage IT continuity" L3) remains gated behind B1-S5 (trigger-event repointing on handoff 253). Carried as B1-A1.

### Bucket summaries (no changes from 2026-05-30, restated for explicit-prompt discipline)

#### Bucket 1, In-scope confirmed gaps (count by finding type)

| Finding type | Count | IDs |
| --- | --- | --- |
| STRUCTURAL (A2, A4, M1, F2 band failures) | 4 | B1-S1, B1-S2, B1-S3, B1-S4 |
| BOUNDARY (NULL FK on handoff, no consumer DMDO) | 2 | B1-S5, B1-S6 |
| APQC TAGGING | 1 | B1-A1 |
| MISSING / WRONG-OWNERSHIP / SCOPE-CREEP | 0 | (none, market audit already in Bucket 3) |
| MODULARIZATION ISSUES | 0 | (routed to Bucket 2 by procedure) |

All seven items have user-facing gating: each one either requires B2-1 to land first, or requires user-approved wording (B1-S3 per Rule #20), or requires a foreign-domain fix to unblock (B1-A1 on GRC trigger-event repointing). Per the 2026-05-31 Continuation entry above, zero of these are agent-solvable in their current state.

#### Bucket 2, Surface-for-user (judgment calls)

Four items carried forward:

1. **B2-1** Is BCM correctly classified as leadership-tier? Catalog state matches the label, but two pure-play specialists in `solution_domains` (Fusion Framework System, Castellan) suggest the Rule #2 point-solution-market test is met. Options: (a) keep leadership-tier with `BCM-LANDING` only, (b) promote to master-bearing with `BCM-PLANNING` and `BCM-EXERCISE-AND-CRISIS`, (c) hybrid landing-now plus deferred master-bearing modules.
2. **B2-2** DRP, separate domain or BCM sub-module? Vendor split: ServiceNow and Archer carry DRP modules alongside BCM; Fusion and Castellan fold DR into BCM. Depends on B2-1.
3. **B2-3** DORA and NIS2 ICT third-party register ownership: BCM, TPRM, or shared cross-cutting module. Independent of B2-1.
4. **B2-4** Catalog UX wording flow for B1-S3 (Rule #20): does the user prefer agent-drafted buyer-voice drafts for review, or supply the wording directly?

#### Bucket 3, Phase 0 pending (speculative)

Twelve candidates carried forward, all gated on B2-1: `business_continuity_plans`, `business_impact_analyses`, `business_services`, `dependency_maps`, `recovery_strategies`, `disaster_recovery_plans`, `continuity_exercises`, `exercise_findings`, `crisis_events`, `crisis_communications`, `emergency_contacts`, `dora_third_party_register_entries`. See the 2026-05-30 table for proposed module assignment and vendor evidence per candidate.

### b1a / b1b / b2 / b3 classification for state.yaml

- **b1a (agent-solvable now):** empty. Every Bucket 1 item has a blocker (user decision, prerequisite entity, or foreign-domain owed fix). Documented per item in the next list.
- **b1b (blocked):** all 7 Bucket 1 items. Each blocked_by entry is enumerated structurally in `state.yaml`.
- **b2:** 4 items.
- **b3:** 12 candidates.

### Per-bucket prompts (carry-forward, unchanged)

- **Bucket 1:** Every item blocked. Once B2-1 resolves, the items unblock in this order: B1-S1 (module authoring) clears the prerequisite for B1-S4 (system skill) and B1-S6 (consumer DMDOs). B1-S5 unblocks once the trigger-event repointing path lands (GRC B9 owed). B1-A1 unblocks once B1-S5 lands.
- **Bucket 2:** What is your call on B2-1, B2-2, B2-3, B2-4? B2-1 is the keystone.
- **Bucket 3:** Vet via Phase 0 research, or eyeball-mode? Decision is gated on B2-1 first.

### Report-only follow-ups (owed by other domains, restated)

- GRC B9: non-defective trigger keyed on `compliance_risks` (defective trigger 227 also appears on ATS rows 1180/1181, suggests wider GRC trigger-event audit).
- GRC B10b: `source_domain_module_id` resolution on handoffs 253 and 252, blocked on GRC M-band (GRC has zero modules).
- TPRM, conditional on B2-3 resolving to "ICT register in TPRM": master DMDO on `dora_third_party_register_entries`.
- OP-RES, conditional on B2-3 resolving to "shared DORA module": `domain_module_host_domains` row linking the cross-cutting module.

### JWT errors

None encountered in this audit run.

### Files written

- `audits/BCM/history.md` (this section appended).
- `audits/BCM/state.yaml` (rewritten in `schema_version: 2`, carrying only pending items).

UI spot-checks:
- https://tests.semantius.app/domain_map/domains?id=17
- https://tests.semantius.app/domain_map/domain_modules?domain_id=17
- https://tests.semantius.app/domain_map/capability_domains?domain_id=17
- https://tests.semantius.app/domain_map/handoffs?id=253
- https://tests.semantius.app/domain_map/handoff_processes?handoff_id=253
