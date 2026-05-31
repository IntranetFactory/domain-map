# OP-RES audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 0 entities across 0 modules; 0 capabilities; 3 solutions (all coverage_level=secondary); 5 regulations (mandatory); 3 business_function_domains rows (owner GRC, contributors IT Operations + Security); 0 trigger_events on OP-RES-mastered objects; 0 outbound handoffs; 1 inbound handoff (252, from GRC, both module FKs NULL, payload `risk_assessments`); 0 skills; 0 sub-domains. OP-RES is itself a sub-domain of GRC (parent_domain_id=15).
- OP-RES is listed in SKILL.md as a leadership-tier domain (B1 exception list). The catalog state (zero masters, zero modules, zero capabilities) matches that label. Unlike BCM however, the solution mix carries no pure-play OP-RES specialists at `coverage_level='primary'`: all three linked solutions (ServiceNow IRM, Fusion Framework System, Riskonnect Platform) are secondary, mapped at primary on adjacent GRC / BCM markets. The leadership-tier label is therefore better supported here than on BCM and is the Bucket 2 question (B2-1) at lower stakes.
- Market surface basis: Fusion Framework System (pure-play resilience specialist with strong DORA-readiness surface), Castellan (pure-play resilience specialist), Riskonnect (IRM-suite, important-business-service mapping), ServiceNow IRM (operational-risk-management module), Archer Suite (IRM-suite, third-party resilience), plus regulator-driven DORA / NIS2 substrate from Fusion's DORA-ready offering.
- **Bucket 1 (in-scope, agent fixable):** 8 items.
- **Bucket 2 (surface-for-user, judgment):** 4 items.
- **Bucket 3 (Phase 0 pending, speculative):** 11 items.

Structural pass: M1 fails outright (0 modules) which blocks the M-band entirely; A2 fails (0 capabilities); A4 fails (catalog_tagline and catalog_description empty); A1 passes (all seven business-metadata fields populated); A3 passes (3 solutions linked, though all secondary, not the typical >=1 primary shape); B1 passes by leadership-tier exception; B2-B12 vacuously pass (no masters to check); C1 passes (owner GRC); D1 deferred (nothing rendered yet); E1 vacuously passes (no modules, so the 2-module floor cannot be tested); F1-F5 fail because no skills exist for the zero modules; H1 has 1 cross-domain inbound handoff already carrying an APQC tag (1/1 covered, `record_status='new'`, sole tag is `discovery_substring`).

The single inbound handoff (id 252, GRC to OP-RES) is structurally defective on multiple axes (see B1-S5), with the same root cause noted in the BCM audit against handoff 253 (defective trigger 227, both module FKs NULL).

### Pass 1, Structural findings

S-band sweep (S1, S2, S3): S2 and S3 are vacuous (no modules and no masters). S1 zero-row anomalies route into A2, A4, M1, F2.

A1 PASS, A2 FAIL (0 capabilities), A3 PASS with caveat (no `coverage_level='primary'` row exists), A4 FAIL, A5 not run.

M1 FAIL (0 modules, see B1-S1 below). M2-M7 are vacuous given M1 fail.

B1 PASS by leadership-tier exception (OP-RES is listed in SKILL.md B1 exception list). B2-B12 vacuous.

C1 PASS (owner GRC, contributors IT Operations + Security).

E1 vacuously PASS (no modules).

F1-F5 FAIL (no module-level system skills exist because no modules exist; rolls up into B1-S1 fix).

H1 PASS in coverage (1 of 1 inbound handoff has a `handoff_processes` row), but the row is `discovery_substring` with `record_status='new'`, and the trigger event itself is the defective trigger 227 (see B1-S5).

### Pass 2, Market audit (semantic)

The catalog declares OP-RES as leadership-tier (no masters expected). The solution mix supports that label more cleanly than BCM does: no flagship pure-play vendor is recorded at `coverage_level='primary'`, and the three linked solutions are diversified suites mapped at secondary. The vendor surface for the broader operational-resilience market (Fusion, Castellan, Riskonnect, ServiceNow IRM, Archer Suite) does carry first-class important-business-service mapping, dependency graphs, third-party resilience registers, and tolerance-setting workflow, which is borderline for the SKILL.md rule #2 point-solution-market test. The market is regulator-driven (DORA, NIS2) more than vendor-driven; the regulator forces every financial-sector buyer to load this substrate even if no pure-play vendor sells exclusively into it.

Vendor surface (union of Fusion Framework, Castellan, Riskonnect, ServiceNow IRM, Archer, focused on the operational-resilience slice distinct from BCM's planning-and-exercise slice and from TPRM's third-party slice):

Core master records the operational-resilience market expects:

- `important_business_services` (the regulator-anchored register of services whose disruption would harm clients / market integrity, owns tolerance levels and DORA / NIS2 reporting)
- `impact_tolerances` (per-service maximum tolerable disruption thresholds, the regulator-facing artifact for DORA Article 11 and the UK PRA / FCA operational-resilience rules)
- `service_dependency_maps` (the graph mapping important business services to people, processes, technology, and third parties, distinct from BCM's per-plan dependency view because the OP-RES view is regulator-facing and cross-service)
- `resilience_scenarios` (severe-but-plausible scenario library used for scenario testing; DORA Article 25 TLPT artifacts plug in here)
- `resilience_tests` (per-scenario execution records, distinct from BCM's continuity_exercises because OP-RES tests are scenario-driven against tolerances, not plan-walkthroughs)
- `vulnerability_findings` (cross-cuts SECOPS / VULN-MGMT; in OP-RES the cut is "findings against an important business service" not the per-asset vulnerability)
- `ict_third_party_register_entries` (DORA Article 28 ICT third-party register; strong ownership claim from TPRM is the Bucket 2 question B2-3)
- `resilience_incidents` (the regulator-facing operational-resilience incident, distinct from ITSM incidents; DORA major-incident-reporting artifacts plug in here)
- `resilience_remediation_actions` (per-finding remediation, distinct from BCM exercise_findings because OP-RES remediation feeds the regulator)

Junctions / transitions: `service_to_tolerance_links`, `service_to_dependency_links`, `test_scenario_executions`, `incident_to_service_links`.

Compliance entities driven by DORA, NIS2, ISO 22301, NIST CSF: `dora_major_incident_reports`, `dora_threat_led_pen_tests`, `nis2_significant_incident_reports`, `regulatory_resilience_disclosures`.

Modularization hypothesis (if OP-RES is promoted to non-leadership): two full modules at a minimum, `OP-RES-MAPPING` (important_business_services, impact_tolerances, service_dependency_maps) and `OP-RES-TESTING-AND-INCIDENT` (resilience_scenarios, resilience_tests, resilience_incidents, resilience_remediation_actions). Plus optional `OP-RES-DORA` if the DORA-mandated reporting substrate justifies its own module (likely yes given mention in BCM audit's B2-3 around cross-host DORA module via `domain_module_host_domains`).

### Pass 3, Neighbor discovery

Edge weight derived from handoffs and DMDO cross-references:

| Neighbor | Outbound | Inbound | DMDO cross | Edge weight | Pass-4 treatment |
| --- | --- | --- | --- | --- | --- |
| GRC | 0 | 1 (handoff 252) | 0 (no DMDOs at all) | 1 | one-line summary |

No neighbor at weight >= 3 exists. OP-RES has no DMDO rows of any kind, no outbound handoffs, no other inbound handoffs. The single boundary that exists (GRC, weight 1) gets a one-line summary in Pass 4. Adjacency to BCM, TPRM, SECOPS, VULN-MGMT, AUDIT is implied by shared regulations (DORA, NIS2) and shared solutions (ServiceNow IRM, Fusion, Riskonnect), but no handoffs or DMDOs link these domains to OP-RES today (every one of those edges is owed by Bucket 3 + Bucket 1 once OP-RES gains a landing module).

### Pass 4, Pairwise reconciliation (none at weight >= 3)

GRC, OP-RES (weight 1, one-line summary): inbound handoff 252 publishes `assessment.completed` (trigger 227, defective per SKILL.md and per the BCM audit, points at `risk_assessments` not a payload keyed to operational-resilience consumption) from GRC to OP-RES. Both module FK columns NULL on both sides. OP-RES has no DMDO row declaring any role on `risk_assessments`. The cross-domain relationship mirror is absent (`risk_assessments` has zero rows in `data_object_relationships`). The payload `risk_assessments` (id 291, kind=domain_owned) has NO canonical `role='master'` row in any module catalog-wide, which is a B5 integrity failure routed back to GRC (the implied owner). Section 1 (fully wired): 0 rows. Section 2 (NULL module FK): 1 row (handoff 252). Section 3 (missing handoffs): cannot evaluate (OP-RES has no DMDOs at all). Section 4 (boundary integrity): payload `risk_assessments` lacks a canonical master anywhere, route to GRC as report-only. Section 5 (relationship mirror): absent. The entire boundary is owed by report-only follow-ups on both sides; nothing in this pass produces in-scope OP-RES fixes beyond what Bucket 1 already lists (B1-S5, B1-S6).

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures (M1, A2, A4, F2)

| ID | Band | Finding | Fix |
| --- | --- | --- | --- |
| B1-S1 | M1 | Zero `domain_modules` rows. Even leadership-tier domains require >=1 `module_kind='full'` row per Rule #14 (a "derived-signals" or "landing" module preserving the deploy-target contract). | Author 1 landing module, code `OP-RES-LANDING` (or similar), `domain_id=18`, `module_kind='full'`, empty `domain_module_data_objects` set is acceptable for a leadership-tier landing surface. Cascades into F2 (one system skill on the new module). |
| B1-S2 | A2 | Zero `capability_domains` rows. Even leadership-tier domains usually carry 2-4 capability links describing what the market does at the capability level. | Draft 3-5 capabilities aligned to the OP-RES vendor surface (e.g. `important-business-service-mapping`, `impact-tolerance-setting`, `scenario-testing`, `dependency-graph-management`, `resilience-incident-reporting`) and link via `capability_domains`. Apply the cross-cutting capability convention (Rule on naming) given likely overlap with BCM and TPRM. |
| B1-S3 | A4 | `catalog_tagline` and `catalog_description` are empty strings on the OP-RES row (Rule #20). | Draft buyer-voice tagline and description per Rule #20, surface for user review BEFORE writing. Voice rule: workflow + value, not analyst voice. |
| B1-S4 | F2 | Zero `skills` rows on OP-RES at any level (`domain_id=18` returns nothing, no `domain_module_id`-anchored rows). After B1-S1 lands, the landing module needs exactly one `skill_type='system'` skill per Rule #17. | Author 1 system skill on the new landing module, with the minimal tool set the leadership-tier surface needs (typically `query_*` over consumed masters once the module declares its consumer DMDOs). Defer this until B2-1 resolves, since the answer to B2-1 changes whether the skill is on `OP-RES-LANDING` alone or on `OP-RES-MAPPING` + `OP-RES-TESTING-AND-INCIDENT`. |

#### BOUNDARY findings

| ID | Finding | Fix |
| --- | --- | --- |
| B1-S5 | Handoff 252 (GRC to OP-RES) carries the defective `trigger_event` 227 (`assessment.completed`, points at `risk_assessments` not at an OP-RES-relevant payload, per the same defect noted in SKILL.md and the BCM audit). Both `source_domain_module_id` and `target_domain_module_id` are NULL. OP-RES has no DMDO row declaring any role on `risk_assessments`, so target-side attribution cannot resolve without B1-S6 too. | Two-step: (a) repoint handoff 252's `trigger_event_id` to a non-defective trigger keyed against a payload OP-RES should consume (existence of such a trigger needs verification; if absent, this becomes a GRC B9 fix, surface in report-only). (b) After B1-S1 lands, set `source_domain_module_id` to the GRC module that holds the publishing data_object (currently no GRC modules exist, so this side is GRC B10b report-only) and `target_domain_module_id` to the new OP-RES landing module after B1-S6 adds a consumer DMDO. |
| B1-S6 | OP-RES declares no role on `risk_assessments` (the payload it receives), and no role on any other data_object the OP-RES market would consume to compute derived signals (e.g. `business_services` from CMDB, `incidents` from ITSM, `compliance_risks` from GRC). A leadership-tier landing module should still declare consumer DMDOs for the masters it reads from. | After B1-S1 lands, add `domain_module_data_objects` rows on `OP-RES-LANDING` with `role='consumer'` for at least the payload of handoff 252 once B1-S5 repointing resolves which data_object that is. Likely additional consumer rows on related CMDB, ITSM, and SECOPS masters once B2-1 is resolved. |

#### APQC TAGGING (per-handoff PCF activity classification)

OP-RES has 1 cross-domain handoff total (inbound 252; 0 outbound). The existing tag on handoff 252 is a `discovery_substring` row at `record_status='new'` pointing at process 271 ("Conduct and analyze IT compliance assessments", external_id 20743, hierarchy_level 3). The agent reviewed this against the trigger semantics (the event is a compliance-assessment completion firing a `risk_assessments` payload to OP-RES) and the substring tag is plausible but not ideal: process 271 is about IT compliance assessment execution on the source side, while the OP-RES target side reads the result to update operational-resilience posture, which fits process 272 ("Develop and execute IT resilience and continuity operations", 20749, L3) or process 49 ("Develop and manage IT resilience and risk", 20706, L2 parent) better.

| handoff_id | source to target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
| --- | --- | --- | --- | --- | --- | --- |
| 252 | GRC to OP-RES | assessment.completed (defective trigger 227, see B1-S5) | risk_assessments | Develop and execute IT resilience and continuity operations | 20749 | medium L3 (better fit than the existing discovery_substring tag); blocked on B1-S5 trigger-event repointing |

Volume expectation: with N=1 cross-domain handoff, the 0.5N to 0.8N target rounds to "between 0 and 1 NEW `agent_curated` tags". The proposed B1-A1 row is 1 NEW `agent_curated` row, but it is blocked on B1-S5 resolution (the existing substring tag should not be replaced until the trigger event is repointed, otherwise we are tagging a relationship that the handoff itself does not correctly express).

| ID | Action | Status |
| --- | --- | --- |
| B1-A1 | Author `(handoff_id=252, process_id=272, proposal_source='agent_curated', record_status='new')`, leaving the existing `discovery_substring` row in place (the natural composed key allows both). Block on B1-S5. | Blocked on B1-S5. |

### Bucket 2, Surface-for-user (judgment calls)

1. **Is OP-RES correctly classified as leadership-tier?** The SKILL.md B1 exception list includes OP-RES, and the catalog state matches that label (zero masters, zero modules, zero capabilities until Bucket 1 lands). Unlike BCM, the linked `solution_domains` rows are all secondary (no pure-play vendor at primary coverage), which strengthens the leadership-tier label. However, the regulator-driven substrate (DORA Article 11 impact tolerances, DORA Article 25 TLPT scenarios, DORA Article 28 third-party register, NIS2 significant-incident reporting) imposes mandatory data shapes that look like masters, not derived signals; pure-play resilience specialists (Fusion, Castellan) ship the substrate as first-class entities and the broader IRM suites carry it as named modules. **Options:** (a) keep leadership-tier label, author `OP-RES-LANDING` only, declare consumer DMDOs on GRC, BCM, ITSM, and SECOPS masters and treat regulator artifacts as derived-signal views; (b) promote OP-RES to a non-leadership domain, author `OP-RES-MAPPING` and `OP-RES-TESTING-AND-INCIDENT` modules with masters for `important_business_services`, `impact_tolerances`, `service_dependency_maps`, `resilience_scenarios`, `resilience_tests`, `resilience_incidents`; (c) hybrid: author `OP-RES-LANDING` now as a thin landing surface while deferring the master-bearing modules to a follow-up Phase 0 vendor-research load aligned with the parallel BCM B2-1 decision. Has a cross-bucket dependency on Bucket 3 (the speculative master list is itself the substrate for option b) and a coupling with the BCM audit's B2-1 (resolving BCM and OP-RES jointly avoids overlap on continuity_exercises versus resilience_tests).

2. **Important Business Service register, OP-RES master or shared host with CMDB / SVC-CAT?** The important-business-service register under DORA / UK PRA rules is the regulator-facing view of the same underlying `business_services` substrate that lives in CMDB / SVC-CAT for operational use. Pure-play resilience vendors (Fusion, Castellan) master it themselves; ServiceNow IRM embeds from the platform CMDB. **Options:** (a) OP-RES masters `important_business_services` as a separate data_object distinct from CMDB `business_services`, with regulator-facing fields (tolerance, criticality, regulator-mapping); (b) OP-RES consumes CMDB `business_services` and adds a per-service regulator overlay as a junction; (c) a shared cross-cutting module (`IMPORTANT-BUSINESS-SERVICES`) hosted on OP-RES + CMDB + SVC-CAT via `domain_module_host_domains`. Has a cross-bucket dependency on B2-1 (option a only applies if OP-RES is promoted to master-bearing).

3. **DORA and NIS2 substrate ownership, OP-RES versus BCM versus TPRM.** The BCM audit (Bucket 2 item 3) raised the same question: DORA mandates an ICT third-party register, regulatory continuity reporting, TLPT artifacts, and major-incident reporting. The ICT register has strong TPRM claim; the TLPT artifacts span OP-RES (scenario testing) and SECOPS (red-team execution); the major-incident reports span OP-RES (operational-resilience side) and ITSM / SECOPS (incident-management side). **Options:** (a) split the DORA substrate by artifact across OP-RES, BCM, TPRM, SECOPS with each domain mastering its slice; (b) author a single `DORA-COMPLIANCE` cross-cutting module hosted on OP-RES + BCM + TPRM + SECOPS via `domain_module_host_domains`; (c) defer until both BCM B2-3 and TPRM B-band audits land so the DORA split is decided once. Independent of B2-1 (the question still applies if OP-RES stays leadership-tier).

4. **Catalog UX wording for B1-S3.** Rule #20 requires user approval on the exact `catalog_tagline` and `catalog_description` wording before write. The agent will draft both in buyer voice (workflow + value) after Bucket 1 resolution; this row asks the user to confirm that buyer-voice drafting and review is the preferred flow vs the user supplying the wording directly. Independent of other items.

### Bucket 3, Phase 0 pending (speculative; vendor-research vetting needed)

These are candidate masters surfaced by the vendor-surface enumeration above. They are not loadable until Phase 0 vendor research vets each one against the 4-5 flagship surfaces and B2-1 resolves whether OP-RES stays leadership-tier or promotes to a master-bearing market. All eleven are gated on B2-1.

| Candidate | Proposed module (if B2-1 = promote) | Vendor evidence |
| --- | --- | --- |
| `important_business_services` | OP-RES-MAPPING (or shared cross-cutting module per B2-2) | Fusion, Castellan, Riskonnect; regulator-mandated under DORA Article 11 |
| `impact_tolerances` | OP-RES-MAPPING | Fusion, Castellan; regulator-mandated under DORA Article 11 and UK PRA / FCA operational-resilience rules |
| `service_dependency_maps` | OP-RES-MAPPING | Fusion, Castellan, ServiceNow IRM (depends on CMDB integration); distinct from BCM's per-plan dependency view |
| `resilience_scenarios` | OP-RES-TESTING-AND-INCIDENT | Fusion, Castellan, Archer; DORA Article 25 TLPT scenario libraries |
| `resilience_tests` | OP-RES-TESTING-AND-INCIDENT | Fusion, Castellan; scenario-driven testing distinct from BCM `continuity_exercises` |
| `resilience_incidents` | OP-RES-TESTING-AND-INCIDENT | Fusion, Castellan, ServiceNow IRM; regulator-facing operational-resilience incidents |
| `resilience_remediation_actions` | OP-RES-TESTING-AND-INCIDENT | Universal across IRM suites |
| `ict_third_party_register_entries` | OP-RES-DORA (new) or embedded_master from TPRM per B2-3 | DORA Article 28; Fusion has the most mature surface |
| `dora_major_incident_reports` | OP-RES-DORA (new) or shared cross-cutting module per B2-3 | DORA Article 19; emerging vendor surface |
| `dora_threat_led_pen_tests` | OP-RES-DORA (new) or shared cross-cutting module per B2-3 | DORA Article 25; small-vendor surface (Fusion, plus dedicated TLPT specialists) |
| `nis2_significant_incident_reports` | OP-RES-DORA (new) or shared cross-cutting module per B2-3 | NIS2 Article 23; vendor surface emerging |

### Cross-bucket dependencies

- B2-1 (leadership-tier vs promote) gates all 11 Bucket 3 items. If B2-1 = keep leadership-tier, every Bucket 3 candidate stays in Bucket 3 pending a separate market load; if B2-1 = promote, the survivors of Phase 0 vendor research become Bucket 1 in a follow-up audit run.
- B2-1 also gates B1-S4 (whether the system skill lives on `OP-RES-LANDING` alone or on the master-bearing modules), and the scope of B1-S6 (consumer DMDOs are minimal under (a) leadership-tier, broader under (b) promote).
- B2-1 is coupled with the BCM audit's B2-1: both leadership-tier domains share regulators (DORA, NIS2) and overlap on the resilience-versus-continuity boundary; resolving them jointly avoids overlap on `continuity_exercises` versus `resilience_tests`.
- B2-2 (important-business-service register ownership) depends on B2-1 resolution.
- B2-3 (DORA substrate split) is independent of B2-1; applies to either leadership-tier or promote outcome.
- B1-S5 (defective trigger 227) and B1-S6 (OP-RES consumer DMDOs) are tightly coupled: B1-S5 cannot fully resolve without the target module FK, which depends on B1-S1 plus B1-S6.
- B1-A1 (APQC re-tagging on handoff 252) is blocked on B1-S5 (do not tag what the trigger does not correctly express).

### Per-bucket prompts

- **After Bucket 1:** Fix these now? Reply "all", "just B1-S1, S2, S3, S4", "skip the boundary items (S5, S6) until B2-1 resolves", or "skip".
- **After Bucket 2:** What is your call on B2-1 (leadership-tier vs promote)? This decision shapes Bucket 3 vetting and B1-S4 / B1-S6 scope. Also B2-2 (important-business-service register ownership), B2-3 (DORA substrate split), and B2-4 (catalog UX wording flow). Consider resolving B2-1 jointly with the BCM audit's B2-1 to avoid resilience-vs-continuity overlap.
- **After Bucket 3:** Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates ring true; named candidates become Bucket 1 items immediately in a follow-up pass once B2-1 lands.

### Report-only follow-ups (owed by other domains)

- **GRC B9 owes** a non-defective `trigger_event` keyed against a payload OP-RES should consume so handoff 252 can be repointed off trigger 227. The same defect surfaced on handoff 253 (GRC to BCM, same trigger 227) in the BCM audit and on ATS rows 1180 / 1181 (SKILL.md), which suggests a wider trigger-event audit on GRC is owed.
- **GRC B10b owes** `source_domain_module_id` resolution on handoff 252. GRC currently has zero modules (same M1 fail as OP-RES and BCM), so this is blocked on GRC's M-band audit. Surface to user as a candidate next audit (GRC).
- **GRC B5 owes** a canonical `role='master'` row on `risk_assessments` (id 291, kind=domain_owned). No module in the catalog masters this data_object today, which leaves the inbound handoff payload structurally orphaned. Surface as a candidate next audit (GRC).
- **TPRM B-band check** (if B2-3 resolves to "ICT third-party register lives in TPRM"), TPRM owes a master DMDO on `ict_third_party_register_entries`. Surface as a candidate next audit (TPRM).
- **BCM boundary** (if B2-3 resolves to "shared DORA cross-cutting module"), BCM owes a `domain_module_host_domains` row linking the cross-cutting module. The same item appears as a report-only follow-up on the BCM audit pointing to OP-RES; converged resolution is to author the cross-cutting module once with hosts on both. Surface as a candidate next audit (BCM, joint with OP-RES).
- **SECOPS boundary** (if B2-3 resolves to "DORA TLPT artifacts span OP-RES + SECOPS"), SECOPS owes a `domain_module_host_domains` row or a consumer DMDO on TLPT-related data_objects. Surface as a candidate next audit (SECOPS).

### Candidates queued

None. Every market the OP-RES audit surfaced (OP-RES itself, plus DORA-compliance and important-business-services as cross-cutting concerns) is either already represented in the catalog (OP-RES as the current domain) or is a sub-feature of OP-RES / BCM / TPRM / SECOPS rather than a candidate domain in its own right. If the user resolves B2-3 to "promote DORA-COMPLIANCE as a separate cross-cutting domain", the helper will be run in the follow-up pass after that decision lands.

## 2026-05-31, Continuation: B1 technical fixes

### Scope check

Continuation subagent run under the "truly-technical B1 fixes" mandate. OP-RES is a leadership-tier domain: zero modules, zero capabilities, zero masters, zero DMDOs, zero skills. Live state re-verified against the 2026-05-30 audit and matches exactly: `domain_modules` for `domain_id=18` returns `[]`, `capability_domains` for `domain_id=18` returns `[]`, handoff 252 still carries `trigger_event_id=227` with both module FKs NULL and `data_object_id=291`, the OP-RES `domains` row still has empty `catalog_tagline` and `catalog_description`.

### Fixes applied

None. Every B1 item in the 2026-05-30 audit fails at least one technical-eligibility gate per the subagent prompt. Summary table below.

| ID | Type | Classification | Reason |
| --- | --- | --- | --- |
| B1-S1 | M1 landing module | DEFER | Authors a new `domain_modules` row. New modules are explicitly excluded from the technical list. |
| B1-S2 | A2 capabilities | DEFER | Authors new `capabilities` + `capability_domains` rows requiring naming judgment, overlap arbitration with BCM and TPRM, and the cross-cutting capability convention; not a derivable enum/FK backfill. |
| B1-S3 | A4 catalog UX wording | DEFER | `catalog_tagline` / `catalog_description` are Rule #20 user-approval columns, called out as not-technical in the subagent prompt. |
| B1-S4 | F2 system skill | DEFER | Audit explicitly says "Defer this until B2-1 resolves" (gated on the leadership-vs-promote judgment). |
| B1-S5 | B-band handoff repoint | DEFER | Requires picking a non-defective trigger event (user judgment) and depends on B1-S1 (target module FK) and on a GRC-side trigger that may not exist (report-only to GRC). Not a derivable FK. |
| B1-S6 | B10b consumer DMDOs | DEFER | Depends on B1-S1 (no module to attach DMDOs to) and on B1-S5 resolving which payload data_object the consumer DMDO should reference. |
| B1-A1 | APQC handoff_processes | DEFER | Audit explicitly marks it "Blocked on B1-S5". Per subagent prompt, `handoff_processes` inserts are only technical when audit pre-specifies both the handoff_id and a resolvable PCF AND the row is not blocked on upstream items; this row is blocked. |

### Truly-technical categories considered and discarded

The subagent prompt enumerates eight categories of truly-technical work. Each was checked against the OP-RES surface:

- **Enum backfills (`event_category`, `integration_pattern`):** Audit does not flag any OP-RES-owned enum gaps. The defective trigger 227 is GRC-owned.
- **B10b FK derivations from existing modules:** OP-RES has zero modules and zero DMDOs, so no FK is currently derivable. Handoff 252's `target_domain_module_id` cannot be set without B1-S1 first creating the landing module.
- **`domain_regulations` inserts linking to existing regulations:** 5 regulation links already exist (audit Pass 1 line 14: "5 regulations (mandatory)"); audit does not flag any missing regulation linkage as a B1 gap.
- **Stale-row deletions with named IDs:** None named in the audit.
- **Naming-convention renames (FKs unaffected):** None named in the audit.
- **`data_object_relationships` user-edges per Rule #10:** OP-RES has zero data_objects of its own, so no Rule #10 edges apply.
- **`permission_verb_override` state+verb fixes:** None named in the audit (no masters, so no workflow-gate permissions exist).
- **`handoff_processes` APQC inserts:** Only B1-A1, which is explicitly blocked (see table above).

### JWT errors

None encountered. The four verification reads (`/domain_modules`, `/capability_domains`, `/handoffs?id=eq.252`, `/domains?id=eq.18`) all succeeded.

### Loader path

None created. The continuation produced zero writes, so no `.tmp_deploy/` loader was authored.

### UI spot-checks

No writes to spot-check. Reviewers reaching this section can confirm the unchanged state at:

- https://tests.semantius.app/domain_map/domains (filter `domain_code = OP-RES`, expect empty `catalog_tagline` and `catalog_description`)
- https://tests.semantius.app/domain_map/domain_modules (filter `domain_id = 18`, expect zero rows)
- https://tests.semantius.app/domain_map/capability_domains (filter `domain_id = 18`, expect zero rows)
- https://tests.semantius.app/domain_map/handoffs (filter `id = 252`, expect `trigger_event_id = 227`, both module FKs NULL)

### Status

The audit's existing `status: feedback_needed` and `open_questions: 23` count remain accurate. Per instructions, frontmatter was not touched. Every B1 item remains owed; B2-1 resolution (leadership-tier vs promote) is the lever that unblocks the structural band.

## 2026-05-31, Audit

### Summary

Structural Validate b1 audit, re-run against live state. OP-RES (id 18, parent_domain_id 15, sub-domain of GRC) remains on the SKILL.md leadership-tier exception list. Every gap identified in the 2026-05-30 audit is still present verbatim. Bucket 1 = 6 items (carried), Bucket 2 = 4 items (carried), Bucket 3 = 11 items (carried). No fixes applied; the 2026-05-31 continuation already confirmed every Bucket-1 item fails at least one truly-technical eligibility gate, so this Validate run is a structural confirmation pass rather than an action pass.

### Live-state verification (pre-pass)

| Query | Result |
| --- | --- |
| `/domains?domain_code=eq.OP-RES` | id=18, parent_domain_id=15, `catalog_tagline=''`, `catalog_description=''`, all 7 business-metadata fields populated (A1 passes) |
| `/domain_modules?domain_id=eq.18` | 0 rows (M1 fail) |
| `/domain_module_host_domains?domain_id=eq.18` | 0 rows |
| `/capability_domains?domain_id=eq.18` | 0 rows (A2 fail) |
| `/solution_domains?domain_id=eq.18` | 3 rows, all `coverage_level='secondary'` (ServiceNow IRM, Fusion Framework System, Riskonnect Platform); A3 passes by count but no primary coverage |
| `/domain_data_objects?domain_id=eq.18` | 0 rows (B1 passes by leadership-tier exception) |
| `/business_function_domains?domain_id=eq.18` | 3 rows: owner GRC, contributor IT Operations, contributor Security (C1 passes) |
| `/domain_regulations?domain_id=eq.18` | 5 mandatory: ISO/IEC 27001, SOC 2, NIST CSF, NIS2, DORA |
| `/handoffs` source or target 18 | 1 row (id 252, GRC to OP-RES, trigger 227, payload `risk_assessments` id 291, both module FKs NULL, integration_pattern `api_call`, friction_level `medium`) |
| `/skills?domain_id=eq.18` | 0 rows (F1/F2 vacuously consistent given M1 fail) |
| `/handoff_processes?handoff_id=eq.252` | 1 row, `discovery_substring`, `record_status='new'`, process_id 271 (Conduct and analyze IT compliance assessments, external_id 20743, L3) |

### Pass 1, Structural findings (A, M, B [B5/B7/B9/B9b/B10b/B11/B12], C, D, E [E1-E5], F [F1-F5], H)

**A1 PASS.** All seven business-metadata fields populated (crud_percentage=92, business_logic set, min_org_size=`40 l <10000`, cost_band=`$$$`, certification_required=false, usa_market_size_usd_m=250, market_size_source_year=2025).

**A2 FAIL.** Zero `capability_domains` rows.

**A3 PASS-with-caveat.** 3 solution_domains rows but no `coverage_level='primary'`. Acceptable shape for a leadership-tier domain; the caveat is that the typical >=1 primary expectation does not hold here.

**A4 FAIL.** `catalog_tagline` and `catalog_description` both empty.

**M1 FAIL.** Zero `domain_modules` rows. Even leadership-tier domains require >=1 `module_kind='full'` landing module per Rule #14.

**M2-M7 vacuous** (no modules to test). M8 vacuous (no modules to carry catalog UX fields).

**B5 vacuous PASS.** No `embedded_master` rows to validate.

**B7 vacuous PASS.** No domain-owned masters, so no Rule #10 user-edges expected.

**B9 PASS for outbound** (0 outbound handoffs, 0 trigger_events on OP-RES-mastered objects — vacuous).

**B9b vacuous PASS.** Domain has 0 modules, so the >=2-module precondition does not apply.

**B10b FAIL on inbound handoff 252.** `target_domain_module_id` is NULL but cannot be resolved without an OP-RES landing module first (blocked on M1) and consumer DMDO on the payload (blocked on M1 + the trigger-event repointing in B-band).

**B11 vacuous PASS.** No masters, no alias expectation.

**B12 vacuous PASS.** No `master + required` data_objects, no lifecycle states expected.

**C1 PASS.** Owner GRC + 2 contributors (IT Operations, Security).

**D1 deferred.** No writes this pass, no UI render to spot-check beyond the unchanged-state links below.

**E1 vacuous PASS** (no modules means the 2-module floor cannot be tested; no roles expected).

**E2-E5 vacuous** (no roles loaded).

**F1 PASS** (no legacy `domain_id`-only system skill rows).

**F2 FAIL.** Zero `skills` rows on OP-RES. After M1 lands the landing module needs exactly one `skill_type='system'` skill per Rule #17.

**F3, F4, F5 vacuous** (no skills to evaluate).

**H1 partial.** 1 cross-domain handoff (inbound 252) carrying 1 `handoff_processes` row (`discovery_substring`, process 271, `record_status='new'`). Coverage headline: 0 approved (no human sign-off yet), 0 `agent_curated`. The substring tag is plausible but the agent-curated re-tag proposed in the 2026-05-30 audit (process 272, "Develop and execute IT resilience and continuity operations", L3) is the better fit for the OP-RES target-side semantics. Per the 2026-05-31 continuation, the re-tag is blocked on B1-S5 (defective trigger 227 must be repointed first).

### Pass 2, Market audit

Vendor surface enumerated in the 2026-05-30 audit stands unchanged: Fusion Framework System (pure-play DORA-ready specialist), Castellan, Riskonnect, ServiceNow IRM, Archer Suite. No pure-play vendor at `coverage_level='primary'` exists in the catalog; the leadership-tier label remains defensible. The candidate master surface (`important_business_services`, `impact_tolerances`, `service_dependency_maps`, `resilience_scenarios`, `resilience_tests`, `resilience_incidents`, `resilience_remediation_actions`, `ict_third_party_register_entries`, `dora_major_incident_reports`, `dora_threat_led_pen_tests`, `nis2_significant_incident_reports`) all remain Bucket 3 pending B2-1 resolution.

### Pass 3, Neighbor discovery

Identical to 2026-05-30: GRC at edge weight 1 (handoff 252) is the only neighbor. No neighbor reaches the weight-3 threshold for a deep pairwise pass. Adjacency to BCM, TPRM, SECOPS, VULN-MGMT, AUDIT is implied by shared regulators (DORA, NIS2) and shared solutions but no handoffs or DMDOs link those domains to OP-RES today.

### Pass 4, Pairwise reconciliation (GRC, weight 1, one-line summary)

Handoff 252 publishes `assessment.completed` (trigger 227, defective per SKILL.md and the BCM audit) from GRC to OP-RES. Both module FKs NULL. OP-RES has zero DMDO rows. Payload `risk_assessments` (id 291) has no canonical `role='master'` row anywhere in the catalog (a GRC B5 integrity failure, report-only). Section 1 (fully wired): 0 rows. Section 2 (NULL module FK): 1 row (handoff 252). Section 3 (missing handoffs): cannot evaluate without DMDOs. Section 4 (boundary integrity): payload lacks canonical master, route to GRC. Section 5 (relationship mirror): absent. No in-scope OP-RES fixes beyond the existing B1-S5 and B1-S6.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
| --- | --- | --- | --- |
| B1-S1 | M1 | Zero `domain_modules` rows. | Author 1 landing module, code `OP-RES-LANDING`, `domain_id=18`, `module_kind='full'`; empty `domain_module_data_objects` set is acceptable for a leadership-tier landing surface. Cascades into F2. |
| B1-S2 | A2 | Zero `capability_domains` rows. | Draft 3-5 capabilities aligned to the OP-RES vendor surface (e.g. `important-business-service-mapping`, `impact-tolerance-setting`, `scenario-testing`, `dependency-graph-management`, `resilience-incident-reporting`). Apply the cross-cutting capability convention. |
| B1-S3 | A4 | `catalog_tagline` and `catalog_description` empty (Rule #20). | Draft both in buyer voice (workflow + value), surface for user review BEFORE writing per Rule #20. |
| B1-S4 | F2 | Zero `skills` rows on OP-RES at any level. | After B1-S1 lands, author 1 system skill on the new landing module with minimal `query_*` tools over consumed masters once the module declares its consumer DMDOs. Defer until B2-1 resolves. |

#### BOUNDARY findings

| ID | Finding | Fix |
| --- | --- | --- |
| B1-S5 | Handoff 252 (GRC to OP-RES) carries defective `trigger_event` 227. Both module FK columns NULL. No DMDO row on OP-RES declares any role on `risk_assessments`. | Two-step: (a) repoint handoff 252's `trigger_event_id` to a non-defective trigger keyed against a payload OP-RES should consume (GRC owes the trigger if it does not exist). (b) After B1-S1 lands, set `source_domain_module_id` to the GRC module (currently no GRC modules exist, so GRC B10b owes this side; report-only) and `target_domain_module_id` to the new OP-RES landing module after B1-S6 adds a consumer DMDO. |
| B1-S6 | OP-RES declares no role on `risk_assessments` and no role on any data_object the market would consume. | After B1-S1 lands, add `domain_module_data_objects` rows on `OP-RES-LANDING` with `role='consumer'` for the payload of handoff 252 once B1-S5 repointing resolves the data_object. Likely additional consumer rows on CMDB, ITSM, SECOPS masters once B2-1 is resolved. |

#### APQC TAGGING

OP-RES has 1 cross-domain handoff. Existing tag on handoff 252 is `discovery_substring` at `record_status='new'`, process 271 (Conduct and analyze IT compliance assessments, L3). Better fit on the OP-RES target side is process 272 ("Develop and execute IT resilience and continuity operations", external_id 20749, L3) but the re-tag is blocked on B1-S5.

| handoff_id | source to target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
| --- | --- | --- | --- | --- | --- | --- |
| 252 | GRC to OP-RES | assessment.completed (defective trigger 227, see B1-S5) | risk_assessments | Develop and execute IT resilience and continuity operations | 20749 (process_id 272) | medium L3; blocked on B1-S5 |

| ID | Action | Status |
| --- | --- | --- |
| B1-A1 | Author `(handoff_id=252, process_id=272, proposal_source='agent_curated', record_status='new')`, leaving the existing `discovery_substring` row in place. | Blocked on B1-S5. |

Volume expectation: with N=1 cross-domain handoff, the 0.5N to 0.8N target rounds to "between 0 and 1 NEW `agent_curated` tags". One row proposed, blocked.

### Bucket 2, Surface-for-user (judgment calls)

1. **Is OP-RES correctly classified as leadership-tier?** The catalog state matches the SKILL.md exception list, no pure-play vendor at primary coverage. Regulator-driven substrate (DORA Articles 11, 25, 28; NIS2 significant-incident reporting) imposes mandatory data shapes that look like masters. Options: (a) keep leadership-tier, author `OP-RES-LANDING` only, declare consumer DMDOs on GRC / BCM / ITSM / SECOPS masters, treat regulator artifacts as derived signals; (b) promote OP-RES to master-bearing, author `OP-RES-MAPPING` + `OP-RES-TESTING-AND-INCIDENT` with masters for the 7+ candidates in Bucket 3; (c) hybrid: thin `OP-RES-LANDING` now, master-bearing modules deferred to a Phase 0 vendor-research follow-up, jointly with the parallel BCM B2-1 decision. Has a Bucket 3 dependency (option b's master list IS Bucket 3) and a coupling with BCM B2-1.

2. **Important Business Service register, OP-RES master or shared host with CMDB / SVC-CAT?** Pure-play resilience vendors master it; ServiceNow IRM embeds from platform CMDB. Options: (a) OP-RES masters `important_business_services` as a separate data_object distinct from CMDB `business_services`; (b) OP-RES consumes CMDB `business_services` with a per-service regulator overlay junction; (c) shared cross-cutting module `IMPORTANT-BUSINESS-SERVICES` hosted on OP-RES + CMDB + SVC-CAT via `domain_module_host_domains`. Depends on B2-1 (option a only applies if OP-RES is promoted).

3. **DORA and NIS2 substrate ownership, OP-RES versus BCM versus TPRM.** DORA mandates an ICT third-party register (TPRM claim), TLPT artifacts (OP-RES scenario testing + SECOPS red-team execution), major-incident reporting (OP-RES versus ITSM / SECOPS). Options: (a) split by artifact across the four domains; (b) author a single `DORA-COMPLIANCE` cross-cutting module hosted on OP-RES + BCM + TPRM + SECOPS via `domain_module_host_domains`; (c) defer until BCM B2-3 and TPRM B-band audits land so the split is decided once. Independent of B2-1.

4. **Catalog UX wording for B1-S3.** Rule #20 requires user approval on the exact `catalog_tagline` and `catalog_description` wording before write. Asking whether the user wants the agent to draft in buyer voice for review or supply the wording directly. Independent of other items.

### Bucket 3, Phase 0 pending (speculative)

These eleven candidate masters all gate on B2-1. They are not loadable until Phase 0 vendor research vets each one against 4-5 flagship surfaces AND B2-1 resolves to "promote".

| Candidate | Proposed module (if B2-1 = promote) | Vendor evidence |
| --- | --- | --- |
| `important_business_services` | OP-RES-MAPPING (or shared cross-cutting per B2-2) | Fusion, Castellan, Riskonnect; DORA Article 11 |
| `impact_tolerances` | OP-RES-MAPPING | Fusion, Castellan; DORA Article 11 plus UK PRA / FCA |
| `service_dependency_maps` | OP-RES-MAPPING | Fusion, Castellan, ServiceNow IRM (CMDB-integrated) |
| `resilience_scenarios` | OP-RES-TESTING-AND-INCIDENT | Fusion, Castellan, Archer; DORA Article 25 TLPT |
| `resilience_tests` | OP-RES-TESTING-AND-INCIDENT | Fusion, Castellan; distinct from BCM `continuity_exercises` |
| `resilience_incidents` | OP-RES-TESTING-AND-INCIDENT | Fusion, Castellan, ServiceNow IRM |
| `resilience_remediation_actions` | OP-RES-TESTING-AND-INCIDENT | Universal across IRM suites |
| `ict_third_party_register_entries` | OP-RES-DORA (new) or embedded_master from TPRM per B2-3 | DORA Article 28; Fusion has the most mature surface |
| `dora_major_incident_reports` | OP-RES-DORA (new) or shared cross-cutting per B2-3 | DORA Article 19; emerging vendor surface |
| `dora_threat_led_pen_tests` | OP-RES-DORA (new) or shared cross-cutting per B2-3 | DORA Article 25; small-vendor surface |
| `nis2_significant_incident_reports` | OP-RES-DORA (new) or shared cross-cutting per B2-3 | NIS2 Article 23; emerging vendor surface |

### Cross-bucket dependencies

- B2-1 gates all 11 Bucket 3 items.
- B2-1 gates B1-S4 (skill placement) and the scope of B1-S6 (minimal under (a) leadership-tier, broader under (b) promote).
- B2-1 is coupled with the BCM B2-1; resolve jointly to avoid resilience-versus-continuity overlap.
- B2-2 depends on B2-1.
- B2-3 is independent of B2-1.
- B1-S5 and B1-S6 are tightly coupled with B1-S1 (no target module FK without a module).
- B1-A1 is blocked on B1-S5.

### Per-bucket prompts

- **After Bucket 1:** Fix these now? Reply "all", "just B1-S1, S2, S3, S4", "skip the boundary items (S5, S6) until B2-1 resolves", or "skip".
- **After Bucket 2:** What is your call on B2-1 (leadership-tier vs promote)? This decision shapes Bucket 3 vetting and the scope of B1-S4 / B1-S6. Also B2-2, B2-3, B2-4. Consider resolving B2-1 jointly with the BCM B2-1.
- **After Bucket 3:** Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates ring true.

### Report-only follow-ups (owed by other domains)

- **GRC B9** owes a non-defective `trigger_event` keyed against a payload OP-RES should consume so handoff 252 can be repointed off trigger 227. The same defect surfaced on handoff 253 (GRC to BCM, same trigger) in the BCM audit and on ATS rows 1180 / 1181 in SKILL.md.
- **GRC B10b** owes `source_domain_module_id` resolution on handoff 252. GRC currently has zero modules, blocked on GRC's M-band audit.
- **GRC B5** owes a canonical `role='master'` row on `risk_assessments` (id 291, kind=domain_owned). No module in the catalog masters this data_object today.
- **TPRM B-band check** (if B2-3 resolves to "ICT third-party register lives in TPRM"), TPRM owes a master DMDO on `ict_third_party_register_entries`.
- **BCM boundary** (if B2-3 resolves to "shared DORA cross-cutting module"), BCM owes a `domain_module_host_domains` row linking the cross-cutting module.
- **SECOPS boundary** (if B2-3 resolves to "DORA TLPT artifacts span OP-RES + SECOPS"), SECOPS owes a `domain_module_host_domains` row or a consumer DMDO on TLPT-related data_objects.

### JWT errors

None encountered. All ten verification reads succeeded (`/domains`, `/domain_modules`, `/domain_module_host_domains`, `/capability_domains`, `/solution_domains`, `/domain_data_objects`, `/business_function_domains`, `/handoffs`, `/domain_regulations`, `/skills`, `/handoff_processes`).

### Fixes applied

None. Per the 2026-05-31 continuation, every B1 item fails at least one truly-technical eligibility gate (new modules excluded, naming-judgment capabilities excluded, Rule #20 wording excluded, B2-1-gated skill excluded, judgment-gated boundary fixes excluded, APQC re-tag blocked). This Validate run produced zero writes.

### UI spot-checks

No writes. Reviewers can confirm unchanged state at:

- https://tests.semantius.app/domain_map/domains (filter `domain_code = OP-RES`, expect empty `catalog_tagline` and `catalog_description`)
- https://tests.semantius.app/domain_map/domain_modules (filter `domain_id = 18`, expect zero rows)
- https://tests.semantius.app/domain_map/capability_domains (filter `domain_id = 18`, expect zero rows)
- https://tests.semantius.app/domain_map/handoffs (filter `id = 252`, expect `trigger_event_id = 227`, both module FKs NULL)
- https://tests.semantius.app/domain_map/handoff_processes (filter `handoff_id = 252`, expect 1 row, `discovery_substring`, `record_status = new`)

### Bucket classification (b1a / b1b / b2 / b3)

- **b1a** (agent-solvable next pass): empty. No B1 item is truly-technical (all are gated on naming judgment, Rule #20 wording, new-module creation, or B2-1).
- **b1b** (blocked technical): B1-S1, B1-S2, B1-S3, B1-S4, B1-S5, B1-S6, B1-A1.
- **b2** (user judgment): B2-1, B2-2, B2-3, B2-4.
- **b3** (research pending): 11 candidate masters.

`next_action_by = user` (b1a empty, b2 non-empty; user must resolve B2-1 before any structural progress).
