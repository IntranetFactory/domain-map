# GRC (Governance, Risk and Compliance) — domain completeness review

- **Domain:** `GRC`, `domains.id = 15` (`Governance, Risk and Compliance`)
- **Date:** 2026-06-06
- **Mode:** READ-ONLY structural completeness audit (per-domain checklist, SKILL.md). No writes performed. No `record_status` touched.
- **A5 (vendor-ownership refresh):** skipped per instructions.
- **Market/semantic pass, neighbor-discovery, pairwise reconciliation:** NOT run (this was a structural-pass-only request).

## Headline

**GRC is structurally a stub: it has ZERO `domain_modules` rows (M1 hard fail).** Its 10 masters live only in the legacy `domain_data_objects` rollup; none has a `role='master'` row in the authoritative module junction `domain_module_data_objects`. Under Rule #14 a `domains` row is not deployable — modules are. The M1 failure is a **structural gate** that blocks M2/M4/M5/M6/M8/M9, F3/F4/F5, and the module-attribution half of B10b/E1. Almost every other band that passes does so against the legacy domain-level surface, not a deployable module surface.

`<masters>` was resolved via the documented fallback (`domain_data_objects?domain_id=eq.15&role=eq.master`) because GRC has no modules. The 10 masters (ids): 282 `compliance_risks`, 283 `compliance_controls`, 284 `control_assessments`, 285 `compliance_policies`, 286 `policy_attestations`, 287 `compliance_obligations`, 288 `compliance_evidence`, 289 `audit_issues`, 290 `remediation_plans`, 291 `risk_assessments`.

Context: GRC is a **non-leaf parent domain** — it has 6 child domains (AUDIT id 16, BCM 17, OP-RES 18, TPRM 19, PRIV-MGMT 20, ESG 21). Much of the operational GRC surface is modularized inside those children; the GRC parent row itself was never modularized.

---

## S-band — structural coverage sweep

### S1. Direct FK coverage on `domains` (domain 15)

| Table | FK column | GRC rows | Expected non-zero? | Verdict |
| --- | --- | --- | --- | --- |
| `business_function_domains` | domain_id | 1 | yes (C1) | PASS |
| `capability_domains` | domain_id | 1 | yes (A2, ≥3) | **FAIL** (only 1, see A2) |
| `domain_aliases` | domain_id | 0 | no | ok |
| `domain_data_objects` | domain_id | 13 | yes (B1) | PASS |
| `domain_module_host_domains` | domain_id | 0 | routinely zero | ok |
| `domain_modules` | domain_id | 0 | yes (M1) | **FAIL** (structural gate) |
| `domain_regulations` | domain_id | 5 | when applicable | PASS |
| `domains.parent_domain_id` | parent_domain_id | 6 | only if sub-domains | ok (GRC has 6 children) |
| `handoffs` | source_domain_id | 10 | yes for non-leaf | PASS |
| `handoffs` | target_domain_id | 60 | usually | PASS |
| `skills` | domain_id | 1 | yes (F2) | PASS |
| `solution_domains` | domain_id | 10 | yes (A3) | PASS |

Two zero-row anomalies on expected-non-zero rows: `domain_modules` (routes to M1, the gate) and `capability_domains` under-count (routes to A2).

### S2. Indirect-table per-module coverage

**Vacuous — GRC has zero modules.** No `domain_module_capabilities` / `domain_module_data_objects` rows are anchored on a GRC module. (Other domains' modules — HRSD-CASE-MGMT, LMS-COMPLIANCE-TRAINING, FOOD-TRACE-RECALL-MGMT, FSQM-AUDIT-SUPPLIER — carry consumer/contributor rows on GRC masters `policy_attestations`/`compliance_obligations`; those are legitimate cross-domain consumption, not GRC module coverage.) Routes entirely to M1.

### S3. Per-master indirect-table coverage (master + required)

| data_object | lifecycle states | trigger_events | aliases |
| --- | --- | --- | --- |
| compliance_risks (282) | 0 | 1 (`compliance_risk.identified`) | 0 |
| compliance_controls (283) | 0 | 1 (`compliance_control.passed`) | 0 |
| control_assessments (284) | 0 | 1 (`control.failed`) | 0 |
| compliance_policies (285) | 0 | 1 (`compliance_policy.updated`) | 0 |
| policy_attestations (286) | 0 | 2 (`policy_attestation.required/.completed`) | 0 |
| compliance_obligations (287) | 0 | 1 (`obligation.overdue`) | 0 |
| compliance_evidence (288) | 0 | 1 (`compliance_evidence.submitted`) | 0 |
| audit_issues (289) | 0 | 1 (`audit_issue.created`) | 0 |
| remediation_plans (290) | 0 | 2 (`remediation_plan.created/.overdue`) | 0 |
| risk_assessments (291) | 0 | 1 (`assessment.completed`) | 0 |

- **States all zero** across every master → routes to B12. (B12 only hard-fails `operational_workflow` masters; all 10 are `unclassified` today, so the state gap is currently masked by the B13 failure — see B12/B13 dependency.)
- **Events present** (12 total across 8 masters) → B9 has real substrate.
- **Aliases all zero** → routes to B11.
- This master-set is a "states + aliases all zero" signal of a quietly-incomplete (pre-modular) load that the individual bands partly mask.

---

## A — Phase A (Market shape)

**A1. `domains` business-metadata — PASS.**
`crud_percentage=80`, `business_logic` non-empty ("Risk aggregation (Monte Carlo, qualitative-to-quantitative mapping) and control-effectiveness scoring..."), `min_org_size='30 m <2500'`, `cost_band='$$$'`, `usa_market_size_usd_m=3500`, `market_size_source_year=2025`, `certification_required=false` (valid considered value). All 7 fields populated.

**A2. Capabilities linked — FAIL.**
Only 1 `capability_domains` row: `COMPLIANCE-TRAIN` (Compliance Training). Pass criterion is ≥3 (typical 5–8). Worse, `COMPLIANCE-TRAIN` is a cross-cutting training capability that is arguably mis-homed as GRC's *only* capability — GRC's core capabilities (risk assessment, control management, policy management, compliance evidence/obligations, audit issue tracking, remediation) are entirely unrepresented. In-scope fix: author the missing GRC capabilities + `capability_domains` rows. NOTE: capability coverage feeds the system-skill derivation, so this gap propagates.

**A3. Solutions linked with coverage_level — PASS.**
10 solutions, `coverage_level` set on every row; 6 `primary` (ServiceNow IRM, Archer Suite, MetricStream Connected GRC, OneTrust GRC, LogicGate Risk Cloud, Diligent One, Riskonnect), 4 secondary (MEGA HOPEX, AuditBoard, Workiva). Strong flagship coverage.

**A4. Catalog UX fields — FAIL.**
`domains.catalog_tagline` and `domains.catalog_description` are both empty strings. In-scope fix: author buyer-voice tagline + 1–3 paragraph description per Rule #20 (write straight into the empty fields after user review; do not pre-surface as a chat gate beyond this report).

**A5. Vendor ownership — SKIPPED** (per instructions).

---

## M — Phase M (Modules) — STRUCTURAL GATE

**M1. ≥1 `domain_modules` row — FAIL (structural gate).**
`domain_modules?domain_id=eq.15` = 0; `domain_module_host_domains?domain_id=eq.15` = 0. GRC has no module on either the primary host or the host junction. This is the dominant finding. GRC persists records of its own (risks, controls, assessments, policies, attestations, obligations, evidence, audit issues, remediation plans, risk assessments) so it is master-bearing and **unbuilt at the module grain**, not a derive/overlay domain. Fix: hand-author the module set (GRC has enough surface for ≥2 modules — e.g. a risk/control management module and a policy/compliance-evidence module — but capability count must be raised first, see A2/M2).

**M2. ≥3 capabilities ⇒ ≥2 modules — vacuously PASS (today).**
Capability count = 1 (<3), so M2 passes vacuously. This is an artifact of the A2 under-count; once GRC's real capabilities are authored (≥3), M2 will require ≥2 modules and will fail until modules exist. Treat as blocked-on-M1+A2.

**M4. Every capability has ≥1 realizing module — FAIL (blocked on M1).**
The single capability `COMPLIANCE-TRAIN` has no realizing GRC module (GRC has none). Resolves when M1 is fixed.

**M5. requires_permission states have module FK — vacuously PASS.**
Zero lifecycle states exist on any GRC master, so there are no workflow-gate states to attribute. (Will need revisiting once B12 lifecycle states are authored.)

**M6. Every module realizes ≥1 capability — vacuously PASS** (no modules).

**M7. Single-master integrity — PASS.**
Catalog-wide: zero `role='master'` rows for GRC's 10 masters exist in `domain_module_data_objects` (they live only in legacy `domain_data_objects`), so there is no multi-master conflict and no within-domain incoherence. The only module-junction rows touching GRC masters are foreign-domain consumers/contributors (HRSD/LMS on `policy_attestations`; FOOD-TRACE/FSQM on `compliance_obligations`) — legitimate cross-domain consumption, not flagged by M7.

**M8. Module-level catalog UX — vacuously PASS** (no modules).

**M9. Module self-containment — vacuously PASS** (no modules).

---

## B — Phase B (Data-object footprint)

**B1. ≥1 master — PASS.** 10 masters (via legacy `domain_data_objects`, the documented fallback). GRC is master-bearing, not an overlay.

**B2. Every master has singular + plural label — PASS.** All 10 have both. NOTE (cosmetic, not a fail): `compliance_evidence` plural is "Compliance Evidences" (awkward; "evidence" is a mass noun). Worth a hand-correction if touched.

**B3. Naming arbitration — PASS.** All 10 names are prefixed (`compliance_*`, `control_*`, `policy_*`, `audit_*`, `remediation_*`, `risk_*`); no bare-word masters, so naming arbitration passes automatically.

**B4. Pattern flags considered — PASS (with mandatory re-evaluation note).**
All three flags (`has_personal_content`, `has_submit_lock`, `has_single_approver`) are `false` on all 10 masters. Per B4 an audit must POSITIVELY re-evaluate; recording that here:
- `policy_attestations` — plausibly `has_personal_content` (per-employee attestation rows) and/or `has_submit_lock` (attestation locks on completion). Candidate for `true`.
- `control_assessments` / `risk_assessments` — plausibly `has_single_approver` (a named assessor/approver gates sign-off).
- `compliance_evidence` — plausibly `has_submit_lock` (evidence locks once submitted for audit).
These are surfaced for user judgment (Bucket 2); not auto-patched. The remaining masters' `false` reads as a defensible considered answer.

**B5. embedded_master integrity — PASS.**
GRC's only `embedded_master` is `org_units` (34), canonically mastered by HCM (54). Non-master dependencies `employees` (31, consumer; mastered by HCM/PAYROLL/IGA/MDM) and `contract_obligations` (67, consumer; mastered by CLM) both have canonical owners. No orphans.

**B6. Intra-domain `data_object_relationships` — FAIL.**
Zero relationship edges among GRC's 10 masters. Expected workflow edges are entirely missing, e.g.: `compliance_controls → control_assessments`, `compliance_risks ↔ compliance_controls` (controls mitigate risks), `risk_assessments → compliance_risks`, `compliance_policies → policy_attestations`, `audit_issues → remediation_plans`, `compliance_obligations → compliance_evidence`, `compliance_controls → compliance_evidence`. In-scope fix: draft edges (verb + inverse_verb + cardinality + kind + owner_side) and load via the cluster-drafts loader.

**B6b. Relationship shape invariants — vacuously PASS** (no intra-domain edges to check; folds into B6).

**B7. `users` edges — PASS.**
All 10 masters carry a `users` edge (`users` id 748, platform_builtin): has owner / has assessor / has author / has attester / has accountable owner / has submitter. Excellent actor coverage.

**B8. Cross-domain `data_object_relationships` (outbound) — PARTIAL FAIL.**
Two outbound rows exist (`audit_issues tracks emissions_records`, `compliance_obligations tracked by compliance_assignments`). But outbound handoffs 248 (`control.failed → ITSM`, payload `service_incidents`) and 841 (`remediation_plan.created → ITSM`, payload `service_incidents`) have a clean payload→target mapping (service_incidents is ITSM-mastered, distinct from the event's data_object) and lack the corresponding relationship rows (`control_assessments spawns service_incidents`, `remediation_plans spawns service_incidents`). In-scope fix: author those outbound relationship rows. Most other GRC outbound handoffs ship GRC's own masters as the payload (not a target-spawned artifact), so they do not require a B8 outbound relationship row.
- *Report-only (inbound direction, owed by other domains' B8):* the 60 inbound handoffs imply inbound cross-domain relationship rows owned by ~40 source domains. Not GRC's responsibility; see B10.

**B9. Outbound `trigger_events` + `handoffs` — PASS.**
12 trigger_events across 8 masters; 10 outbound handoffs, every one with a `trigger_event_id`. Every outbound event has ≥1 handoff. Fan-out is correctly modeled (event 227 `assessment.completed` → OP-RES + BCM share one event row; event 224 `compliance_policy.updated` → HRSD + LMS). Minor gaps to note for completeness (not hard fails, no published state machine to gate against): `compliance_evidence.submitted` (924), `compliance_control.passed` (921), and `policy_attestation.completed` (923) have trigger_events but no handoff row — acceptable if they have no subscriber, but worth confirming there is no GRC-internal subscriber once modules exist.

**B9b. Intra-domain cross-module handoffs — NOT APPLICABLE (skip per pre-check).**
GRC has <2 modules (it has 0), so there is no cross-module surface to model. Skipped per the B9b pre-check. Will become required once GRC is modularized into ≥2 modules.

**B9c. trigger_events state fields resolve — FAIL (soft / report-only).**
No `data_object_lifecycle_states` exist on any GRC master, so every `trigger_events.to_state` (`active`, `fail`, `overdue`, `completed`, `republished`, `open`, and several empty) resolves to nothing — the event model and the (absent) state-machine model are unjoined. Soft signal; resolves when B12 lifecycle states are authored. Several events also have empty `from_state`/`to_state` (ids 921–926) which should be backfilled when the state machines land.

**B10. Inbound `handoffs` — REPORT ONLY.**
60 inbound cross-domain handoffs from ~40 source domains (covered list below). These are published by each source domain's own B9 and are NOT a failure of GRC's audit. The GRC-side obligation is the *consumer DMDO coverage* for these payloads (declaring `consumer`/`contributor` rows on a GRC module), which is **blocked on M1** — GRC has no module to anchor the consumer rows. See report-only follow-ups section.

**B10b. Per-module attribution on `handoffs` — FAIL (blocked on M1).**
- *Outbound (GRC's responsibility):* all 10 outbound handoffs have `source_domain_module_id = NULL`. Cannot be fixed until GRC has a module to attribute to (M1).
- *Inbound (GRC's responsibility):* all 60 inbound handoffs have `target_domain_module_id = NULL`. Same blocker — no GRC module to receive into.
Both halves are in-scope for GRC but un-resolvable until M1 lands. This is the canonical "no candidate → upstream gap" sub-case 1 (the data_object sits in legacy `domain_data_objects` but no `domain_module_data_objects` row exists).

**B11. `data_object_aliases` — FAIL.**
Zero alias rows on all 10 masters. Several are NOT self-explanatory and carry well-known cross-vendor synonyms, e.g.: `compliance_risks` → "risk register entry"; `compliance_controls` → "control objective" / "safeguard"; `control_assessments` → "control test" / "control evaluation"; `compliance_obligations` → "regulatory requirement" / "obligation register"; `compliance_evidence` → "audit evidence" / "artifact"; `audit_issues` → "finding" / "exception"; `risk_assessments` → "risk analysis". In-scope fix: draft alias rows (bundle into cluster-drafts). `compliance_policies`/`policy_attestations`/`remediation_plans` are arguably self-explanatory (exemption recordable here).

**B12. Lifecycle states on `operational_workflow` masters — PASS (today) but masked by B13.**
Query for `entity_type='operational_workflow'` masters returns empty (all 10 are `unclassified`), so B12 vacuously passes. THIS IS A FALSE PASS caused by B13: once the masters are classified (B13 fix), several (`compliance_risks`, `control_assessments`, `risk_assessments`, `audit_issues`, `remediation_plans`, `policy_attestations`) will become `operational_workflow` and will then FAIL B12 (zero lifecycle states — confirmed in S3). Treat as a deferred fail dependent on B13.

**B13. `entity_type` classified — FAIL.**
All 10 masters are `entity_type='unclassified'`. In-scope fix: PATCH each to the correct value per Rule #12 (likely: compliance_risks/control_assessments/risk_assessments/audit_issues/remediation_plans/policy_attestations → `operational_workflow`; compliance_controls/compliance_policies/compliance_obligations → `operational_record` or `catalog`; compliance_evidence → `operational_record`). Classification then unblocks B12.

**B14. Sector-/vendor-conditional masters flagged optional — PASS (vacuously).**
No GRC master name matches a statute prefix (`fcra_`/`hipaa_`/`sox_`/`gdpr_`/`ccpa_`/`osha_`/etc.) and there are no `master + required` rows in the module junction to scan (no modules). The legacy domain rows are all `master + required`, which is the correct default for GRC's universal masters. No conditional-optional candidates surfaced. Revisit once modularized (the vendor-shape scan needs the module surface).

---

## C — Phase C (Functional ownership)

**C1. ≥1 `business_function_domains` owner — PASS.** 1 row, `responsibility_type='owner'`, business function "Governance, Risk and Compliance" (id 31). (A contributor/consumer pair would be a nice-to-have but is not required.)

**C2. `business_function_capabilities` overrides — PASS.** `COMPLIANCE-TRAIN` carries an override pair: owner = GRC function, contributor = Learning and Development. This correctly enumerates the diverging-function case.

---

## D — UI spot-check

**D1. UI spot-check — NOT PERFORMED.** Read-only API audit only; no browser visit to `https://tests.semantius.app/domain_map/...`. Flagged as not-run rather than pass/fail. All audited rows were read live from PostgREST.

---

## E — Personas, RACI & responsibilities

**E1. Persona coverage matches module shape — vacuously PASS.**
GRC has 1 capability and 0 modules, so it is a single/zero-module domain; the 2-module floor blocks persona authoring and E1 vacuously passes (no zero-persona finding fires). NOTE: there IS one persona on GRC's function (id 25 `GRC-COMPLIANCE-TRAINING-MANAGER`), but its reach is entirely into LMS modules (see E2) — GRC itself has no deployable persona surface. Once GRC is modularized into ≥2 modules, E1 becomes a firing check and will fail until GRC-reaching personas are authored.

**E2. 2-module floor on every persona — PASS.**
Persona 25 has 5 `role_modules` rows (LMS-COMPLIANCE-TRAINING, LMS-AUTOMATION, TRAINING-RECORDS-STARTER, LMS-CREDENTIALS, LMS-CT-GDPR). ≥2 satisfied. OBSERVATION (not a fail): all 5 reach into domain 57 (LMS), none into GRC — this is really an LMS-area persona function-scoped to GRC's compliance-training function. Reasonable given GRC has no modules, but worth noting when GRC is modularized.

**E3. `role_modules.interaction_level` set — PASS.** All 5 rows on persona 25 have `interaction_level` (3 primary, 2 secondary); none null.

**E4. RACI coverage on gated processes — vacuously PASS.**
No GRC master carries a gated lifecycle state with `process_id` set (zero lifecycle states exist), so there are no gated processes to require `process_raci`. Blocked behind B12/B13; revisit once gates exist.

**E5. `has_single_approver` ↔ Accountable — PASS (soft).** No master has `has_single_approver=true`, so nothing to reconcile. (See B4 re-evaluation note — if `control_assessments`/`risk_assessments` get the flag, E5 will need a matching Accountable.)

**E6. Reach reconciles + entity_type classified — FAIL.**
The entity_type half fails directly: all 10 masters are `unclassified` (B13), and the write-tier derivation depends on it. The reach half cannot be exercised meaningfully (no GRC modules / no blueprint to emit). Resolves with B13 + M1.

---

## F — Skill-layer integrity

**F1. No system skill anchored to a FULL module — PASS.** The one GRC system skill (`grc-system`, id 8) has `domain_module_id = NULL`. No FULL-module-anchored system skill exists.

**F2. Exactly one domain-anchored system skill — PASS.** Exactly one row: `grc-system` (id 8, `skill_type='system'`, `domain_id=15`, `domain_module_id=NULL`). Correct shape.

**F3. Modules carry ≥1 `domain_module_tools` — FAIL (blocked on M1).**
GRC has zero modules, so the `domain_module_tools` union is empty by construction. The `grc-system` skill derives an EMPTY toolset. Fix is blocked on M1 (no module to author tools on). A `required` floor of ≥3 distinct tools (≥1 query, ≥1 mutate, ≥1 workflow gate) is owed once modules exist.

**F4. Tool operation_kind ↔ data_object_id invariant — vacuously PASS** (no tools to check).

**F5. Semantius score computable — FAIL (uncomputable, see F3).**
The score denominator is the union of `domain_module_tools` over GRC's modules; with 0 modules the set is empty. Per the formula's explicit "NO fallback" rule, a domain whose modules carry no `domain_module_tools` reads as **incomplete (F3)**, not as 0-of-0. **Semantius score: UNCOMPUTABLE (F3) — both strict_score and operational_score are undefined until GRC is modularized and tools are authored.**

**F7. Channel primitives only when workflow-specific — vacuously PASS** (no `domain_module_tools`/`process_tools` rows to scan for channel primitives).

---

## H — Handoff APQC coverage

**H1. Cross-domain handoffs tagged or deferred — FAIL.**
70 cross-domain handoffs total (10 outbound + 60 inbound). **55 distinct handoffs carry ≥1 `handoff_processes` tag; 15 are untagged with no deferral entry.** Per H1, every cross-domain handoff needs a tag OR an explicit deferral → the 15 untagged rows fail H1.

The 15 untagged cross-domain handoffs:

| handoff_id | direction | source → target | trigger_event | payload |
| --- | --- | --- | --- | --- |
| 249 | outbound | GRC → LMS | compliance_policy.updated | policy_attestations |
| 842 | outbound | GRC → HCM | policy_attestation.required | policy_attestations |
| 310 | inbound | RE-PROP-MGMT → GRC | rental_application.approved | property_tenants |
| 333 | inbound | LEGAL-PRACT-MGMT → GRC | trust_account.exception | trust_accounts |
| 415 | inbound | PAYROLL → GRC | tax_filing.submitted | tax_filings |
| 465 | inbound | IGA → GRC | iga_access_certification.completed | iga_access_certifications |
| 638 | inbound | SAM → GRC | software_title.eol_reached | software_titles |
| 671 | inbound | HAM → GRC | hardware_disposal_record.completed | hardware_disposal_records |
| 844 | inbound | DLP → GRC | dlp_incident.blocked | dlp_incidents |
| 848 | inbound | DSPM → GRC | saas_app_instance.detected | saas_app_instances |
| 855 | inbound | APM → GRC | technology_platform.sunset | technology_platforms |
| 894 | inbound | CLIN-DEV → GRC | device_recall.issued | device_recalls |
| 907 | inbound | INS-CLAIMS → GRC | siu_case.opened | siu_cases |
| 1153 | inbound | PAYROLL → GRC | garnishment_order.received | garnishment_orders |
| 1195 | inbound | APM → GRC | technology_fit.assessment_completed | technology_fit_assessments |

In-scope fix: per-handoff APQC PCF lookup → author `handoff_processes` rows (`proposal_source='agent_curated'`, `record_status='new'`), or record an explicit defer-to-Discover reason for digital-native payloads with no clean PCF match (e.g. `dlp_incidents`, `saas_app_instances`, `technology_fit_assessments`).

**Two H-band numbers (don't conflate):**
- **Coverage / catalog quality (headline):** `record_status='approved'` count = **0** of 70. None of the existing tags has been reviewer-approved. This is the headline quality measure: GRC's APQC mapping is currently 0% trustworthy-signed-off.
- **Provenance / process health (side-bar):** of the 55 tagged handoffs, the tags are predominantly `agent_curated` (the layered-ownership process fired in a prior pass) plus a handful of `discovery_substring`/`discovery_override`. Process health is fine; review has not happened.

---

## Classification of failures

### Structural gate (resolve FIRST — blocks downstream)
- **M1** — zero `domain_modules`. The root cause. Blocks M2/M4/M6/M8/M9, B9b (becomes applicable), B10b (both halves), E1/E6 reach, F3/F4/F5, and the Semantius score.

### In-scope fixes (GRC owns; fixable locally once unblocked)
- **A2** — capability under-count (1, need ≥3); GRC's core capabilities unrepresented.
- **A4** — empty `catalog_tagline` + `catalog_description`.
- **M4** — capability with no realizing module (blocked on M1).
- **B6** — zero intra-domain master relationships.
- **B8** — missing outbound relationship rows for handoffs 248/841 (→ ITSM `service_incidents`).
- **B10b** — all 10 outbound + 60 inbound handoffs have NULL module FK (blocked on M1).
- **B11** — zero aliases on non-self-explanatory masters.
- **B13** — all 10 masters `unclassified`.
- **B12** (deferred-fail) — will fail once B13 classifies workflow masters; lifecycle states owed.
- **B9c** (soft) — trigger_event to_state fields don't resolve to any state machine; backfill empty from/to_state on events 921–926.
- **E6** — entity_type unclassified (= B13) + reach un-emittable (= M1).
- **F3 / F4 / F5** — empty toolset / uncomputable score (blocked on M1).
- **H1** — 15 untagged cross-domain handoffs; 0 approved tags.
- **B4** (re-evaluation) — surfaced pattern-flag candidates for user judgment.

### Report-only follow-ups (owned by other domains — NEVER block GRC's status)
GRC receives 60 inbound cross-domain handoffs. Each represents an outbound owed by the source domain's B9 (already satisfied — the handoff rows exist) and an inbound consumer-DMDO row owed by GRC but blocked on M1. The distinct **source domains owing the cross-domain boundary** (for the user to optionally schedule audits / pairwise reconciliations against, once GRC is modularized): ITAM (3), TEST-MGMT (8), APM (10), AUDIT (16), ESG (21), VIS-MGMT (24), LSD (25), CLM (26), SUP-LIFE (28), IGA (35), BANK-OPS (43), INS-CLAIMS (44), PS-LIC (46), MFG-OPS (47), CLIN-DEV (50), HAM (51), SAM (52), EAM (53), PAYROLL (55), LMS (57), ERP-FIN (65), APIM (79), VSDP (80), KUBE-PLAT (81), ECM (91), REMOTE-ACCESS (132), DLP (139), DSPM (140), RE-BROKERAGE (143), RE-PROP-MGMT (144), TELEMATICS (148), LEGAL-PRACT-MGMT (150), VET-PRACT-MGMT (151), ACCT-PRACT-MGMT (152), FOOD-TRACE (155), DAIRY-MGMT (156), FSQM (157), INV-MGMT (164).

**Count: 38 source domains** with inbound cross-domain edges into GRC. These are observations, not GRC blockers.

---

## Semantius score

**UNCOMPUTABLE (F3).** GRC has zero `domain_modules` and therefore zero `domain_module_tools`; the strict_score and operational_score denominators are empty. Per the score formula's explicit "NO fallback" rule this reads as incomplete (band F3), not as a 0-of-0 covered. The score becomes computable only after M1 (modules) + F3 (tools authored) land.
