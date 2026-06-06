# SECOPS audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 0 mastered entities across 0 modules; 0 capabilities; 2 solutions (ServiceNow Security Incident Response, ServiceNow Vulnerability Response, both `coverage_level=secondary`); 7 regulations (ISO-27001, SOC-2, NIST-CSF, NIS2, DORA, NERC-CIP, CMMC, all `applicability=mandatory`); 1 business_function_domains row (owner Security Operations Center); 0 outbound handoffs; 5 inbound handoffs (3 from DLP, 2 from DSPM, every row has both `source_domain_module_id` and `target_domain_module_id` NULL); 0 skills; 3 `domain_data_objects` rows (`service_incidents` contributor/required, `monitoring_events` contributor/required, `org_units` embedded_master/optional); 0 sub-domains.
- SECOPS is flagged by SKILL.md as a leadership-tier domain (B1 exception list, alongside SOAR, THREAT-INTEL, VULN-MGMT). The catalog state matches that label literally (zero masters) but the SECOPS solution and vendor surface is enormous and dominated by pure-play specialists (SIEM, EDR, XDR, MDR, NDR, UEBA, DFIR) that each carry their own first-class schemas. The leadership-tier classification is itself a Bucket 2 question, with a strong case that SECOPS should anchor a small landing surface (cases, detections, playbook executions) while each detection vertical (SIEM, EDR, XDR, ...) loads as its own sibling domain.
- Market surface basis: Splunk Enterprise Security (pure-play SIEM), Microsoft Sentinel (cloud-native SIEM), CrowdStrike Falcon (EDR/XDR), Palo Alto Cortex XSIAM (next-gen SIEM/SOAR-XDR convergence), IBM QRadar (SIEM), Chronicle Google SecOps (SIEM), SentinelOne Singularity (EDR/XDR), Microsoft Defender XDR, Trellix XDR (multi-vector), Securonix (UEBA-anchored SIEM), Exabeam (UEBA-led SIEM), Arctic Wolf (MDR/SOC-AAS), plus DFIR specialists (Magnet AXIOM, Cellebrite, Velociraptor) and NDR (Darktrace, ExtraHop, Vectra).
- **Bucket 1 (in-scope, agent fixable):** 6 items.
- **Bucket 2 (surface-for-user, judgment):** 4 items.
- **Bucket 3 (Phase 0 pending, speculative):** 13 items.

Structural pass: M1 FAIL (0 modules) which blocks the M-band entirely; A2 FAIL (0 capabilities); A3 FAIL (2 solutions both `coverage_level=secondary`, A3 requires >=3 and >=1 `primary`); A4 FAIL (`catalog_tagline` and `catalog_description` empty); A1 PASS (all 7 business-metadata fields populated, `crud_percentage=35` correctly reflects the detection-rules / correlation / ML-anomaly slice); B1 PASS by leadership-tier exception; B2-B12 vacuously pass (no masters to check directly); C1 PASS (owner Security Operations Center function exists); D1 deferred (nothing rendered yet); E1 vacuously passes (no modules, so the 2-module floor cannot be tested); F1-F5 FAIL because no skills exist for the zero modules; H1 has 5 cross-domain inbound handoffs with 0 APQC tags (0/5 covered).

The 5 inbound handoffs (from DLP and DSPM) are structurally defective on the module-FK axis (every row has both source and target module FK NULL, see B1-S5 / report-only). The contributor DMDOs on `service_incidents` (ITSM-mastered, id 47) and `monitoring_events` (ITOM-mastered domain-level but with NO `domain_module_data_objects` master row anywhere in the catalog, surfaced as a B5 cross-domain integrity gap routed back to ITOM).

### Pass 1, Structural findings

S-band sweep (S1, S2, S3): S2 and S3 are vacuous (no modules and no masters). S1 zero-row anomalies route into A2, A3, A4, M1, F2.

A1 PASS, A2 FAIL (0 capabilities), A3 FAIL (only 2 solutions and both are `secondary`, no `primary`), A4 FAIL, A5 not run.

M1 FAIL (0 modules, see B1-S1 below). M2-M7 are vacuous given M1 fail.

B1 PASS by leadership-tier exception. B2-B12 vacuous. B5 cross-domain integrity gap surfaced: `monitoring_events` (id 84) carries a `role='master'` row in `domain_data_objects` (domain-level, ITOM, id 2) but no `domain_module_data_objects` `role='master'` row exists anywhere in the catalog. SECOPS contributes to it; the canonical master-module pointer is missing. Routed to ITOM as a report-only follow-up.

C1 PASS (owner Security Operations Center; no contributors or consumers loaded yet).

E1 vacuously PASS (no modules).

F1-F5 FAIL (no module-level system skills exist because no modules exist; rolls up into B1-S1 fix).

H1 FAIL in coverage (0 of 5 inbound cross-domain handoffs has a `handoff_processes` row, no outbound cross-domain handoffs exist).

### Pass 2, Market audit (semantic)

The catalog declares SECOPS as leadership-tier (no masters expected). The live `solution_domains` rows carry only ServiceNow Security Incident Response and ServiceNow Vulnerability Response at `coverage_level=secondary`, both ServiceNow-suite consumption of the SECOPS surface rather than pure-play SECOPS flagship products. The SECOPS market in practice is a polycentric cluster: each detection vertical (SIEM, EDR, XDR, MDR, NDR, UEBA, DFIR, BAS, SOC-AAS) is a real point-solution market under SKILL.md Rule #2 (>=3 independent pure-play vendors), and the umbrella SECOPS row functions as a coordinating layer where security cases consolidate across the verticals. The structural shape closest to current catalog precedent is the ITAM umbrella (HAM, SAM, SMP, FINOPS sub-domains with ITAM holding only genuinely cross-cutting masters like `asset_contracts`, `asset_lifecycle_events`).

Vendor surface (union of SIEM-led, EDR-led, XDR-led, MDR-led, UEBA-led, DFIR-led, BAS-led platforms):

Core master records the umbrella SECOPS market expects (the layer above the detection verticals):

- `security_incidents` (canonical SECOPS case shape; distinct from ITSM `service_incidents` since the lifecycle states, evidence chain, legal hold, and regulator-notification surface diverge sharply)
- `security_cases` (long-running investigations spanning multiple incidents, typically what DFIR teams open; sub-cases roll up under one case)
- `security_alerts` (the SIEM/EDR/XDR-source-agnostic alert shape that closes into incidents)
- `detections` (rule-derived or model-derived detections; the substrate that publishes alerts)
- `detection_rules` (the authored rules with versioning, suppression windows, tuning history)
- `playbook_executions` (instantiated SOAR playbook runs against incidents, lives at SECOPS-SOAR boundary; SOAR domain may master if promoted)
- `containment_actions` (per-asset actions taken: host isolation, account disable, network block; carries approval state, reversion path)
- `threat_indicators` / `iocs` (file hashes, IPs, domains, certificates; THREAT-INTEL domain likely canonical master, SECOPS embedded_master)
- `mitre_attack_tags` (junction tagging detections, incidents, and rules to ATT&CK techniques)
- `investigation_timelines` (per-incident reconstructed timeline of events, often DFIR-driven)
- `evidence_artifacts` (forensic acquisitions, memory dumps, disk images; DFIR canonical master)
- `regulator_notifications` (GDPR Article 33, HIPAA Breach Notification, SEC Form 8-K, NIS2, DORA; legal-hold and breach-clock entities)
- `runbook_documents` (the human-readable IR runbooks; possible KMS embedded_master)
- `security_metrics` (MTTD, MTTC, MTTR, dwell time; derived analytics)

Junctions / transitions: `incident_assets` (CMDB / ITAM consumed), `incident_users` (HCM / IGA consumed), `case_incidents`, `alert_detections`, `detection_rule_versions`, `incident_evidence`, `incident_notifications`.

Compliance entities driven by the 7 mandatory regulations on SECOPS (ISO-27001, SOC-2, NIST-CSF, NIS2, DORA, NERC-CIP, CMMC):

- `breach_clock_entries` (per-incident regulator-clock state, multi-jurisdiction)
- `nis2_significant_incident_reports` (NIS2 mandated structure)
- `dora_major_incident_reports` (DORA mandated, financial sector EU)
- `nerc_cip_reportable_events` (NERC-CIP for US electrical sector)
- `cmmc_incident_records` (CMMC for US defense contractors; CUI-spill specific)
- `iso27001_incident_register_entries` (ISO 27001 Annex A.16, A.5.24-5.28 incident management controls)
- `soc2_security_event_records` (SOC 2 CC7 series, evidence for the audit)

Modularization hypothesis (if SECOPS is promoted off leadership-tier or treated as an umbrella):

- `SECOPS-LANDING` (the slim leadership-tier landing surface, declares consumer DMDOs on ITSM `service_incidents`, ITOM `monitoring_events`, DLP `dlp_incidents`, DSPM `sensitive_data_incidents`; option a in B2-1)
- `SECOPS-CASE-MGMT` (the case / incident / alert umbrella that consolidates across the detection verticals; masters `security_incidents`, `security_cases`, `security_alerts`; option b in B2-1)
- `SECOPS-DETECTION-ENG` (authors and tunes `detection_rules`, owns `detections`, `mitre_attack_tags`; option b)
- `SECOPS-RESPONSE-OPS` (owns `playbook_executions`, `containment_actions`, `runbook_documents`; option b)
- `SECOPS-IR-COMPLIANCE` (owns `regulator_notifications`, `breach_clock_entries`, and the 5 per-regulation report entities; cross-cutting with GRC and PRIV-MGMT via `domain_module_host_domains`)

The detection verticals themselves (SIEM, EDR, XDR, MDR, NDR, UEBA, DFIR, BAS, SOC-AAS, plus already-queued CSPM, CNAPP, CIEM, EASM, ASPM, CTEM, DRP) sit underneath the umbrella as sibling domains, not as SECOPS modules. Each candidate is queued via `append_missing_domain.ts` (see Candidates queued below).

### Pass 3, Neighbor discovery

Edge weight derived from handoffs and DMDO cross-references:

| Neighbor | Outbound | Inbound | DMDO cross | Edge weight | Pass-4 treatment |
| --- | --- | --- | --- | --- | --- |
| DLP | 0 | 3 (handoffs 280, 282, 284) | 0 | 3 | full 5-section diff |
| DSPM | 0 | 2 (handoffs 287, 290) | 0 | 2 | one-line summary |
| ITSM | 0 | 0 | 1 (SECOPS contributor on `service_incidents` id 47, ITSM master) | 1 | one-line summary |
| ITOM | 0 | 0 | 1 (SECOPS contributor on `monitoring_events` id 84, ITOM domain-level master with B5 gap) | 1 | one-line summary |
| HCM | 0 | 0 | 1 (SECOPS embedded_master/optional on `org_units` id 34, HCM-HCM-ORG-POSITIONS master) | 1 | one-line summary |

No neighbor at weight >= 4. DLP at weight 3 gets the full 5-section diff in Pass 4. DSPM, ITSM, ITOM, HCM each get a one-line summary.

### Pass 4, Pairwise reconciliation

#### DLP, SECOPS (weight 3, full 5-section diff on DLP -> SECOPS direction)

Inbound handoffs from DLP to SECOPS:

| Handoff id | Trigger event | Payload | Pattern | Friction | Module FKs |
| --- | --- | --- | --- | --- | --- |
| 280 | dlp_incident.violation_detected | dlp_incidents | event_stream | medium | both NULL |
| 282 | dlp_incident.escalated | dlp_incidents | event_stream | high | both NULL |
| 284 | data_exfiltration_attempt.initiated | data_exfiltration_attempts | event_stream | medium | both NULL |

Section 1 (Existing handoffs, fully wired): 0 rows. Every DLP to SECOPS handoff has both module FKs NULL.

Section 2 (Existing handoffs with NULL module FK): 3 rows (280, 282, 284). The `source_domain_module_id` resolution sits on DLP's side (DLP B10b owes; check if DLP has DMDO master rows on `dlp_incidents` and `data_exfiltration_attempts`). The `target_domain_module_id` resolution sits on SECOPS' side and is blocked on B1-S1 (no SECOPS modules exist) plus B1-S6 (no SECOPS DMDO declares consumer/embedded_master on these payloads).

Section 3 (Missing handoffs the catalog implies should exist): Cannot fully evaluate, because SECOPS has 0 DMDO rows declaring consumer/contributor coverage on any DLP-mastered data_object. If SECOPS' future landing module declares consumer on `dlp_incidents`, then `dlp_incident.suppressed` and `dlp_incident.policy_updated` are likely candidate missing trigger events (depends on the DLP lifecycle states, owed by DLP).

Section 4 (Boundary integrity): `dlp_incidents` (id 330) and `data_exfiltration_attempts` (id 332) are assumed DLP-mastered; if they are not (DLP itself may have M1/M5 gaps), the B5 integrity check on SECOPS' future consumer DMDO would fail. This is a DLP-side report-only check.

Section 5 (Cross-domain `data_object_relationships` mirror): no `data_object_relationships` rows exist between DLP masters and SECOPS payloads (SECOPS has no masters). Once SECOPS masters `security_incidents` (per B2-1 option b), the catalog should carry `dlp_incidents triggers security_incidents` or `dlp_incidents escalates_to security_incidents`. Surfaced as MISSING-RELATIONSHIP candidate, blocked on B2-1.

#### DSPM, SECOPS (weight 2, one-line summary)

Inbound handoffs 287 and 290 from DSPM (`sensitive_data_incident.detected` medium friction, `sensitive_data_incident.resolved` low friction), both with NULL module FKs on both sides. Same shape as DLP at lower volume. Section 2 has 2 rows (NULL FKs); Section 5 carries the same MISSING-RELATIONSHIP candidate (`sensitive_data_incidents escalates_to security_incidents`) blocked on B2-1.

#### ITSM, SECOPS (weight 1, one-line summary)

SECOPS contributes (role=contributor, necessity=required) to ITSM-mastered `service_incidents` (id 47). No handoffs in either direction. The contributor edge implies SECOPS should be publishing `security_incident.linked_to_service_incident` style events into ITSM once SECOPS has its own master; today the substrate is one-way (SECOPS writes contributor fields directly onto the ITSM-mastered row). Section 5 mirror candidate (SECOPS->ITSM `security_incidents links_to service_incidents`) blocked on B2-1.

#### ITOM, SECOPS (weight 1, one-line summary)

SECOPS contributes to ITOM-mastered (domain-level only, NO `domain_module_data_objects` master row anywhere) `monitoring_events` (id 84). The missing canonical master-module pointer is a B5 cross-domain integrity gap routed back to ITOM as report-only. SECOPS' contributor role is a noop until ITOM's M1/M5 resolves on its side.

#### HCM, SECOPS (weight 1, one-line summary)

SECOPS embedded_masters (optional) on `org_units` (id 34, HCM-HCM-ORG-POSITIONS canonical master). Per Rule #16, infrastructure masters are correctly `necessity: optional` on non-master rows; this row is structurally clean and routes to no further work.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures (M1, A2, A3, A4, F2)

| ID | Band | Finding | Fix |
| --- | --- | --- | --- |
| B1-S1 | M1 | Zero `domain_modules` rows. Even leadership-tier domains require >=1 `module_kind='full'` row per Rule #14 (a "derived-signals" or "landing" module preserving the deploy-target contract). | Author at minimum 1 landing module, code `SECOPS-LANDING`, `domain_id=11`, `module_kind='full'`, empty `domain_module_data_objects` set is acceptable for a leadership-tier landing surface under option (a) of B2-1. Under option (b) (umbrella with case-mgmt module), the landing collapses into 4 full modules per the Pass 2 modularization hypothesis. Cascades into F2 (one system skill per module). |
| B1-S2 | A2 | Zero `capability_domains` rows. Leadership-tier domains typically carry 2-4 capability links describing what the umbrella does. | Draft 3-5 capabilities aligned to the SECOPS umbrella scope. Candidates: `security-incident-mgmt`, `threat-detection-orchestration`, `security-case-mgmt`, `response-coordination`, `breach-notification-mgmt`. Consider cross-cutting domain-neutral codes for capabilities that span SECOPS plus future sibling detection-vertical domains (per the Cross-cutting capability convention). |
| B1-S3 | A3 | Only 2 solutions linked (both `coverage_level=secondary`, both ServiceNow Security Incident Response and ServiceNow Vulnerability Response). A3 requires >=3 solutions with >=1 `primary`. The catalog does not currently carry any pure-play SECOPS-umbrella product as `primary`. | Add solution rows for the pure-play umbrella-scoped flagship vendors (Splunk Enterprise Security, Microsoft Sentinel, CrowdStrike Falcon Complete, Palo Alto Cortex XSIAM, IBM QRadar) with appropriate `coverage_level`. Mark at least 1 as `primary`. Defer the sub-vertical solutions (Splunk SIEM proper, CrowdStrike Falcon Insight EDR proper) until the sibling SIEM and EDR domains land (Bucket 3). |
| B1-S4 | A4 | `catalog_tagline` and `catalog_description` are empty strings on the SECOPS row (Rule #20). | Draft buyer-voice tagline and description per Rule #20, surface for user review BEFORE writing. Voice rule: workflow plus value (detection, investigation, containment, regulator notification), not analyst voice. |
| B1-S5 | F2 | Zero `skills` rows on SECOPS at any level (`domain_id=11` returns nothing, no `domain_module_id`-anchored rows). After B1-S1 lands, each new module needs exactly one `skill_type='system'` skill per Rule #17. | Author 1 system skill per new SECOPS module. Under B2-1 option (a), 1 skill on `SECOPS-LANDING` with a minimal `query_*` tool set across consumed masters (ITSM `service_incidents`, ITOM `monitoring_events`, DLP `dlp_incidents`, DSPM `sensitive_data_incidents`). Under option (b), 4 skills, one per module. Defer until B2-1 resolves. |

#### BOUNDARY findings

| ID | Finding | Fix |
| --- | --- | --- |
| B1-S6 | SECOPS declares no DMDO consumer/embedded_master role on the 4 inbound payloads (`dlp_incidents`, `data_exfiltration_attempts`, `sensitive_data_incidents`). The 5 inbound handoffs (280, 282, 284, 287, 290) therefore have no resolvable `target_domain_module_id` even after B1-S1 lands. | After B1-S1 lands, add `domain_module_data_objects` rows on the landing module (or `SECOPS-CASE-MGMT` under option b) with `role='consumer'` (or `embedded_master` if the umbrella keeps its own local copy for cross-detection-source correlation) for `dlp_incidents`, `data_exfiltration_attempts`, `sensitive_data_incidents`. Necessity per Rule #16 considerations (likely `optional` since SECOPS can correlate without each individual DLP/DSPM source). |

#### APQC TAGGING (per-handoff PCF activity classification)

SECOPS has 5 cross-domain inbound handoffs (3 from DLP, 2 from DSPM) and 0 outbound. All 5 have zero existing `handoff_processes` rows. The analyst classified each against the APQC PCF cross-industry framework (process 270 "Develop and manage IT security, privacy, and data protection" L3, process 268 "Control IT risk, compliance, and security" L3, plus L4 children 1164 "Analyze IT security threat impact").

| handoff_id | source to target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
| --- | --- | --- | --- | --- | --- | --- |
| 280 | DLP to SECOPS | dlp_incident.violation_detected | dlp_incidents | Analyze IT security threat impact | 1164 (L4, parent process 268) | confident L4 |
| 282 | DLP to SECOPS | dlp_incident.escalated | dlp_incidents | Control IT risk, compliance, and security | 268 (L3) | confident L3 (escalation routes to the control-and-respond loop) |
| 284 | DLP to SECOPS | data_exfiltration_attempt.initiated | data_exfiltration_attempts | Analyze IT security threat impact | 1164 (L4) | confident L4 |
| 287 | DSPM to SECOPS | sensitive_data_incident.detected | sensitive_data_incidents | Analyze IT security threat impact | 1164 (L4) | confident L4 |
| 290 | DSPM to SECOPS | sensitive_data_incident.resolved | sensitive_data_incidents | Control IT risk, compliance, and security | 268 (L3) | confident L3 (resolution closes the control loop) |

Volume expectation: with N=5 cross-domain handoffs, the 0.5N to 0.8N target is 2.5 to 4 NEW `agent_curated` tags. The proposal above is 5 NEW `agent_curated` rows, exceeding the upper bound. The PCF surface for SECOPS-shaped detection-routing handoffs is unusually well-aligned to L3 268 / L4 1164, so the over-target is defensible; if Discover later wants to merge 280 and 284 under a shared L4 tag, that is editorial and not blocking.

| ID | Action | Status |
| --- | --- | --- |
| B1-A1 | Author 5 `handoff_processes` rows per the table above, all `proposal_source='agent_curated'`, `record_status='new'`, `role='implements'`. | Ready, independent of B1-S1 through B1-S6 (APQC tagging does not depend on module FKs). |

### Bucket 2, Surface-for-user (judgment calls)

1. **Is SECOPS correctly classified as leadership-tier, or should it be promoted to an umbrella with sub-modules?** The SKILL.md B1 exception list includes SECOPS, and the literal catalog state matches that label (0 masters, 0 modules). But the SECOPS market has flagship vendors with their own first-class schemas (Splunk ES masters cases, alerts, notable events, response actions; Microsoft Sentinel masters incidents, analytics rules, playbooks; CrowdStrike Falcon Complete masters detections, IOAs, containment actions; Palo Alto XSIAM masters cases, datasets, agents), which is the Rule #2 point-solution-market test. The `domains.business_logic` field on the SECOPS row already acknowledges algorithmic substance ("Detection rules, correlation, ML-based anomaly detection, and high-volume log analytics"). **Options:** (a) keep leadership-tier label, author `SECOPS-LANDING` only, declare consumer DMDOs on ITSM/ITOM/DLP/DSPM masters; (b) promote SECOPS to a master-bearing umbrella, author `SECOPS-CASE-MGMT`, `SECOPS-DETECTION-ENG`, `SECOPS-RESPONSE-OPS`, `SECOPS-IR-COMPLIANCE` modules, master the 14 candidate masters in Bucket 3; (c) hybrid: author `SECOPS-LANDING` and `SECOPS-CASE-MGMT` now (the umbrella shape, masters `security_incidents` plus 2-3 related), defer detection-engineering and response-ops modules until the SIEM and EDR sibling domains (Bucket 3) load and the boundary between SECOPS umbrella and detection-vertical specialists is clearer. Has a cross-bucket dependency on Bucket 3 (the 14 speculative master candidates and the 10 sibling detection-vertical candidates jointly determine what SECOPS itself should master vs delegate).

2. **SECOPS umbrella vs detection-vertical siblings, modeling choice.** The detection landscape has SIEM, EDR, XDR, MDR, NDR, UEBA, DFIR, BAS, SOC-AAS, plus already-queued EASM, CSPM, CNAPP, CIEM, ASPM, CTEM, DRP, all as distinct vendor markets with pure-play specialists. The catalog precedent (ITAM umbrella with HAM/SAM/SMP/FINOPS siblings) suggests modeling each detection vertical as its own sibling domain under a SECOPS umbrella. **Options:** (a) load all detection verticals as flat top-level domains (no parent-child link to SECOPS), let SECOPS umbrella keep its leadership-tier label and consume from each; (b) load detection verticals as top-level domains and set `domains.parent_domain_id=11` on each, exposing the umbrella relationship at query time; (c) defer until the user picks 2-3 highest-priority detection verticals (SIEM, EDR, XDR feels like the minimum coherent set) and load them in a focused wave. Cross-bucket dependency with B2-1.

3. **SOAR vs SECOPS-RESPONSE-OPS overlap.** SOAR is already a separate domain (id 12) with `THREAT-INTEL`. The proposed `SECOPS-RESPONSE-OPS` module under option (b) of B2-1 (masters `playbook_executions`, `containment_actions`, `runbook_documents`) overlaps materially with what a SOAR domain would master. **Options:** (a) let SOAR master `playbook_executions` and `containment_actions`, SECOPS embedded_master / consumer; (b) let SECOPS master case-correlated execution and SOAR master the orchestration engine itself (rule library, connector catalog, workflow templates); (c) consolidate SOAR into SECOPS as a module (would require deprecating the SOAR domain row, which is destructive). Independent of B2-1 mechanically, but the answer reshapes the scope of `SECOPS-RESPONSE-OPS`.

4. **Catalog UX wording for B1-S4.** Rule #20 requires user approval on the exact `catalog_tagline` and `catalog_description` wording before write. The agent will draft both in buyer voice (workflow plus value: detect, investigate, contain, recover, notify) after Bucket 1 resolution; this row asks the user to confirm that buyer-voice drafting and review is the preferred flow vs the user supplying the wording directly. Independent of other items.

### Bucket 3, Phase 0 pending (speculative; vendor-research vetting needed)

These are candidate masters surfaced by the vendor-surface enumeration above. They are not loadable until Phase 0 vendor research vets each one against the 5-6 flagship surfaces and B2-1 resolves whether SECOPS stays leadership-tier or promotes to a master-bearing umbrella. All 14 are gated on B2-1.

| Candidate | Proposed module (if B2-1 = promote) | Vendor evidence |
| --- | --- | --- |
| `security_incidents` (distinct from ITSM `service_incidents`) | SECOPS-CASE-MGMT | Splunk ES, Microsoft Sentinel, Palo Alto XSIAM, IBM QRadar, Chronicle, ServiceNow SIR (the secondary solutions already loaded all master this) |
| `security_cases` | SECOPS-CASE-MGMT | Splunk ES (Investigations), Microsoft Sentinel (Cases via M365 Defender), Palo Alto XSIAM, Chronicle |
| `security_alerts` | SECOPS-CASE-MGMT | Universal across all SIEM and XDR vendors; source-agnostic alert layer |
| `detections` | SECOPS-DETECTION-ENG (or SIEM sibling) | Splunk ES (Notables), Sentinel (Analytics Rules outputs), CrowdStrike (Detections), Chronicle (Detections); strong overlap with SIEM sibling candidate |
| `detection_rules` | SECOPS-DETECTION-ENG (or SIEM sibling) | All SIEM vendors; the authored rule artifact distinct from the runtime detection record |
| `playbook_executions` | SECOPS-RESPONSE-OPS (or SOAR per B2-3) | Splunk SOAR, Palo Alto XSOAR, Microsoft Sentinel Automation, ServiceNow SOAR; overlap with SOAR domain (B2-3 question) |
| `containment_actions` | SECOPS-RESPONSE-OPS | CrowdStrike (Host Isolation), Microsoft Defender (Live Response), SentinelOne; per-asset response actions with approval and reversion paths |
| `mitre_attack_tags` | SECOPS-DETECTION-ENG (junction) | Universal tagging substrate across all SIEM/XDR/EDR/MDR; not a master but a load-bearing junction |
| `investigation_timelines` | SECOPS-CASE-MGMT | Microsoft Sentinel (Investigation graph), CrowdStrike (Investigate), Palo Alto XSIAM (Incident Timeline), DFIR tools |
| `evidence_artifacts` | SECOPS-CASE-MGMT (or DFIR sibling) | Magnet AXIOM, Velociraptor, EnCase, Cellebrite; strong overlap with DFIR sibling candidate |
| `regulator_notifications` | SECOPS-IR-COMPLIANCE | Cross-vendor: OneTrust Breach Response, RadarFirst (Privacy + Security incident notification), built-in playbooks in Microsoft Sentinel and Splunk SOAR |
| `breach_clock_entries` | SECOPS-IR-COMPLIANCE | OneTrust, RadarFirst, BreachRX; per-jurisdiction regulator-clock entity (72-hour GDPR, 60-day HIPAA, 4-business-day SEC 8-K, 24h NIS2 early warning) |
| `nis2_significant_incident_reports` | SECOPS-IR-COMPLIANCE | Emerging: regulator-template-aligned; current vendor coverage is shallow but mandated for EU |
| `dora_major_incident_reports` | SECOPS-IR-COMPLIANCE | Emerging: DORA-mandated for EU financial sector; vendor support nascent |

### Cross-bucket dependencies

- B2-1 (leadership-tier vs umbrella vs hybrid) gates all 14 Bucket 3 items. If B2-1 = keep leadership-tier, every Bucket 3 candidate stays in Bucket 3 pending a separate sibling-domain load (the candidates queued below); if B2-1 = promote, the survivors of Phase 0 vendor research become Bucket 1 items in a follow-up audit run.
- B2-1 also gates B1-S5 (whether the system skill lives on `SECOPS-LANDING` alone or across 4 master-bearing modules), the scope of B1-S6 (consumer DMDOs are minimal under option a, broader under option b), and B1-S2 (capability set is umbrella-shaped vs umbrella-plus-sub-modules).
- B2-2 (umbrella vs sibling detection verticals modeling choice) determines whether the candidates queued below load as `parent_domain_id=11` children or as flat top-level domains. Independent of B2-1's option choice but interacts via Bucket 3 vetting (some Bucket 3 candidates like `detections` and `detection_rules` may land on a SIEM sibling instead of inside SECOPS).
- B2-3 (SOAR vs SECOPS-RESPONSE-OPS overlap) interacts with B2-1's option (b) and (c): the `playbook_executions` and `containment_actions` candidates in Bucket 3 may reroute to the SOAR domain depending on the answer.
- B1-S6 (SECOPS consumer DMDOs) is blocked on B1-S1 (landing module must exist first).
- B1-A1 (APQC tagging) is independent of every other Bucket 1 / 2 / 3 item. The PCF L3/L4 classification stands regardless of the module shape that ultimately resolves.

### Per-bucket prompts

- **After Bucket 1:** Fix these now? Reply "all", "just the structural items B1-S1 through B1-S5", "just APQC B1-A1", "skip the boundary item B1-S6 until B2-1 resolves", or "skip".
- **After Bucket 2:** What is your call on B2-1 (leadership-tier vs umbrella vs hybrid)? This decision shapes Bucket 3 vetting and B1-S1, S2, S5, S6 scope. Also B2-2 (sibling modeling), B2-3 (SOAR overlap), and B2-4 (catalog UX wording flow).
- **After Bucket 3:** Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates ring true; named candidates become Bucket 1 items immediately in a follow-up pass once B2-1 lands.

### Report-only follow-ups (owed by other domains)

- **DLP B10b owes** `source_domain_module_id` resolution on handoffs 280, 282, 284. The DLP audit (2026-05-30) will confirm whether DLP has DMDO master rows on `dlp_incidents` and `data_exfiltration_attempts` that allow the backfill to derive the source module. If DLP M1 also fails, this is blocked on DLP's M-band audit.
- **DSPM B10b owes** `source_domain_module_id` resolution on handoffs 287, 290. Same shape as DLP. Surface to user as a candidate next audit (DSPM).
- **ITOM B5 owes** a `domain_module_data_objects` `role='master'` row on `monitoring_events` (id 84). Currently ITOM has a `role='master'` row in legacy `domain_data_objects` (domain-level) but no module-level master row exists, which leaves SECOPS' contributor role with no resolvable canonical-owner module. Surface as a candidate next audit (ITOM); the gap is ITOM-side.
- **ITSM B8 owes** the inbound `data_object_relationships` mirror once SECOPS masters `security_incidents` (per B2-1 option b/c). The relationship `security_incidents links_to service_incidents` is SECOPS-side outbound, but ITSM's own B8 pass should verify the converse direction for completeness.
- **SOAR B-band check** (if B2-3 resolves to "SOAR masters playbook_executions"), SOAR owes a master DMDO on `playbook_executions` and `containment_actions`. Surface as a candidate next audit (SOAR), which is also currently in the leadership-tier B1 exception list with the same M1 fail shape as SECOPS.
- **THREAT-INTEL B-band check** (if `threat_indicators` / `iocs` candidate in Bucket 3 routes to THREAT-INTEL canonical master rather than SECOPS embedded_master), THREAT-INTEL owes the master DMDO. Surface as a candidate next audit (THREAT-INTEL), also currently leadership-tier with the same shape.

### Candidates queued

Queued via `scripts/analytics/append_missing_domain.ts` during this audit (10 candidates total, 7 new entries + 3 mention-count bumps on already-queued entries):

New (queued for the first time):

- `UEBA` (User and Entity Behavior Analytics; Exabeam, Securonix, Splunk UBA, Defender for Identity)
- `MDR` (Managed Detection and Response; CrowdStrike Falcon Complete, Arctic Wolf, Red Canary, Expel, Sophos MDR)
- `NDR` (Network Detection and Response; Darktrace, ExtraHop Reveal(x), Vectra AI, Corelight)
- `DFIR` (Digital Forensics and Incident Response; Magnet AXIOM, Cellebrite, EnCase, Cado, Velociraptor)
- `IR-MGMT` (Security Incident Response Management; ServiceNow SIR, Palo Alto XSOAR, Splunk SOAR, D3 Security, TheHive)
- `BAS` (Breach and Attack Simulation; AttackIQ, Cymulate, SafeBreach, Picus, XM Cyber)
- `SOC-AAS` (SOC as a Service; Arctic Wolf, eSentire, deepwatch, Trustwave, Critical Start)

Mention-count bumps (already queued from prior audits):

- `SIEM` (bumped from 1 to 2)
- `EDR` (bumped from 1 to 2)
- `XDR` (bumped from 1 to 2)

Additional already-queued candidates that this audit confirms as adjacent but did not bump (since they sit closer to data-security or vulnerability-management than SECOPS umbrella proper): CSPM, CNAPP, CIEM, EASM, ASPM (Application Security Orchestration / ASOC), CTEM, DRP, PTAAS. The user may choose to bump any of these as part of the SECOPS sibling-modeling decision under B2-2.

## 2026-05-31, Continuation: B1 technical fixes

Scope: applied truly-technical B1 fixes only (Rule definitions per skill). Total B1 items in 2026-05-30 audit: 7 (B1-S1 through B1-S6 plus B1-A1).

### Fixes applied

| ID | Type | Action | Result |
| --- | --- | --- | --- |
| B1-A1 | INSERT `handoff_processes` APQC rows (audit pre-specified handoff_id + resolvable PCF) | Inserted 5 rows linking handoffs 280, 282, 284, 287, 290 to APQC PCF processes 1164 (L4 Analyze IT security threat impact) and 268 (L3 Control IT risk, compliance, and security), all `role='implements'`, `proposal_source='agent_curated'`, `record_status='new'` (omitted on insert per Rule #1). | 5 new rows (ids 248-252). Verified via `/handoff_processes?handoff_id=in.(280,282,284,287,290)`: 5 of 5 SECOPS inbound handoffs now have APQC tagging coverage (0/5 -> 5/5). |

Direct CLI route used (single POST with 5 rows), no loader required. No JWT-audience errors encountered.

### Deferred

| ID | Reason |
| --- | --- |
| B1-S1 (M1, 0 modules) | Creates new `domain_modules`; gated on judgment item B2-1 (leadership-tier vs umbrella vs hybrid). DEFER per "New `data_objects`/DMDOs/modules" and "gated on B2-X" rules. |
| B1-S2 (A2, 0 capabilities) | Drafts new capabilities; shape depends on B2-1 (umbrella vs umbrella-plus-sub-modules). DEFER per "gated on B2-X". |
| B1-S3 (A3, only 2 secondary solutions) | New solutions research (Splunk Enterprise Security, Microsoft Sentinel, CrowdStrike Falcon, Cortex XSIAM, QRadar) is judgment-shaped market analysis with vendor-pick implications, not a deterministic backfill. DEFER per "decide / options:". |
| B1-S4 (A4, empty `catalog_tagline` / `catalog_description`) | Rule #20 forbids auto-populating these fields. DEFER per "`catalog_tagline`/`catalog_description` (Rule #20)". |
| B1-S5 (F2, 0 skills) | Explicitly blocked on B1-S1 (skill anchors on `domain_module_id`). DEFER. |
| B1-S6 (boundary: 0 consumer DMDOs on DLP/DSPM payloads) | Explicitly blocked on B1-S1; also introduces new DMDOs. DEFER per "New `data_objects`/DMDOs/modules". |

### UI spot-checks

- handoff_processes: <https://tests.semantius.app/domain_map/handoff_processes> (filter `handoff_id` in {280,282,284,287,290} to see the new 5 rows ids 248-252)
- handoffs: <https://tests.semantius.app/domain_map/handoffs> (rows 280, 282, 284, 287, 290; module FKs remain NULL pending B1-S1 / DLP B10b / DSPM B10b)

## 2026-05-31, Audit

### Summary
- Current footprint: 0 modules, 0 mastered entities, 0 capabilities, 2 solutions (both `coverage_level=secondary`), 7 mandatory regulations (ISO/IEC 27001, SOC 2, NIST CSF, NIS2, DORA, NERC-CIP, CMMC), 1 owner `business_function_domains` row (Security Operations Center, function id 64), 0 outbound handoffs, 5 inbound handoffs (3 from DLP id 139, 2 from DSPM id 140; every row both module FKs NULL), 0 skills, 3 `domain_data_objects` rollup rows (`service_incidents` contributor/required ITSM-mastered, `monitoring_events` contributor/required ITOM domain-level master, `org_units` embedded_master/optional HCM-mastered). 3 child domains via `domains.parent_domain_id=11`: SOAR (id 12), VULN-MGMT (id 13), THREAT-INTEL (id 14).
- Catalog ships 5 `handoff_processes` rows (ids 248 to 252 inserted 2026-05-31) covering 5 of 5 inbound cross-domain handoffs; all `proposal_source=agent_curated`, `record_status=new`.
- This audit is the structural Validate b1 pass (S, A, M [M1, M2, M4 to M8], B [B5, B7, B9, B9b, B10b, B11, B12], C, D, E [E1 to E5], F [F1 to F5], H [H1]). The semantic / market and pairwise passes already shipped in the 2026-05-30 audit narrative above and are not re-run here.
- Bucket 1 (in-scope, agent fixable): 1 NEW item (data hygiene em-dash patch in `business_logic`). All 5 prior B1-S findings remain DEFERRED, gated on B2-1 or B2-4.
- Bucket 2 (judgment): 4 prior items still open; 1 NEW item (B2-5, parent-child wiring observation).
- Bucket 3 (research-pending): 14 prior candidates still open.

### S-band coverage sweep

S1, every direct FK to `domains` has the expected row count. Expected-non-zero columns with zero rows for SECOPS: `domain_modules` (M1 fail, B1-S1, still pending), `capability_domains` (A2 fail, B1-S2, still pending), `domain_data_objects` master rows (B1 PASS by leadership-tier exception). `solution_domains` has 2 rows but A3 fails on the >=1 primary requirement (B1-S3). `business_function_domains` PASS (1 owner row). `handoffs.source_domain_id` PASS by leadership-tier (0 outbound is consistent with the umbrella receiving but not publishing). `handoffs.target_domain_id` PASS (5 inbound rows). `skills` zero rows is F2 fail and rolls into B1-S5. `domain_regulations` PASS (7 mandatory rows). `domains.parent_domain_id` is NULL (SECOPS is top-level); routinely zero per S1 expectations.

S2, indirect-table per-module coverage. Vacuous: SECOPS has 0 `domain_modules` rows. Routes to M1 (still B1-S1).

S3, per-master indirect-table coverage. Vacuous: SECOPS has 0 mastered data_objects.

### Band-by-band findings

A1 PASS. All 7 business-metadata fields populated (`crud_percentage=35`, `cost_band=$$$$$`, `usa_market_size_usd_m=15000`, `market_size_source_year=2025`, `min_org_size=30 m <2500`, `certification_required=true`, `business_logic` non-empty). HOWEVER `business_logic` contains an em-dash (the literal `U+2014` character before "the SIEM/EDR core"), which violates the project-wide ban in CLAUDE.md. New Bucket 1 item B1-D1 (data hygiene patch).

A2 FAIL, 0 capabilities. Same as 2026-05-30 B1-S2, still pending. Gated on B2-1.

A3 FAIL, only 2 solutions (both `coverage_level=secondary`, both ServiceNow-branded). Same as 2026-05-30 B1-S3, still pending. Gated on B2-1.

A4 FAIL, `catalog_tagline` and `catalog_description` both empty strings. Same as 2026-05-30 B1-S4, still pending. Rule #20 requires user-approved wording before any write; the user has not yet approved the buyer-voice flow (B2-4).

M1 FAIL, 0 `domain_modules` rows. Same as 2026-05-30 B1-S1, still pending. Gated on B2-1.

M2, M4, M5, M6, M7, M8 all vacuous (no modules, no capabilities, no masters to check).

B5 PASS by resolution, the single `embedded_master` row in the rollup (`org_units` id 34) is HCM-mastered and the integrity check resolves cleanly.

B7, B9, B11, B12 all vacuous, 0 mastered data_objects.

B9b vacuous, 0 modules.

B10b FAIL on the SECOPS-side `target_domain_module_id` column, all 5 inbound handoffs (280, 282, 284, 287, 290) carry NULL. The fix is owed by SECOPS once B1-S1 lands (the consumer module pointer can only be set after a SECOPS module exists). The `source_domain_module_id` NULLs on the same rows are REPORT-ONLY from SECOPS, owed by DLP and DSPM.

C1 PASS, 1 owner row for Security Operations Center.

C2 vacuous, 0 capabilities means no capability-RACI divergence to enumerate.

D1 deferred, no fix loaded this pass.

E1 vacuous, no modules to anchor roles on.

E2 to E5 all vacuous, no roles loaded for Security Operations Center.

F1 PASS, 0 legacy `domain_id=11` system skills.

F2 FAIL, 0 system skills. Same as 2026-05-30 B1-S5, still pending. Blocked on B1-S1.

F3, F4, F5 all vacuous, no skills means no skill_tools or score to compute.

H1 PASS on coverage, 5 of 5 inbound cross-domain handoffs carry a `handoff_processes` row (ids 248 to 252). Provenance side-bar: 5 of 5 `agent_curated`, 0 `approved`. The headline catalog-quality number (approved count) is 0 of 5 pending review; the process-health number (agent_curated count) is 5 of 5 (the layered-ownership process fired correctly). 0 outbound handoffs exist so the outbound coverage check is vacuous.

### Bucket 1, In-scope confirmed gaps

Only 1 NEW Bucket-1 item this pass. All other prior Bucket-1 items remain DEFERRED per the 2026-05-31 continuation; they sit in `state.yaml` under `b1b` because each is gated on a Bucket-2 judgment (B2-1 in most cases, B2-4 for the catalog UX wording flow).

| ID | Band | Finding | Fix |
| --- | --- | --- | --- |
| B1-D1 | A1 / data hygiene | `domains.business_logic` for SECOPS id 11 contains an em-dash before "the SIEM/EDR core", violating the project-wide ban in CLAUDE.md. Pre-existing value, predates the rule. | PATCH `business_logic` to replace the em-dash with a comma. Direct CLI route, no loader required. Proposed text: `"Detection rules, correlation, ML-based anomaly detection, and high-volume log analytics, the SIEM/EDR core."` Independent of every other open item. |

### Bucket 2, Surface-for-user (judgment calls)

All 4 prior B2 items remain open. 1 NEW item this pass.

1. (Carried from 2026-05-30) Is SECOPS correctly classified as leadership-tier, or should it be promoted to an umbrella with sub-modules? Options unchanged: (a) keep leadership-tier label, author `SECOPS-LANDING` only; (b) promote to master-bearing umbrella with 4 modules; (c) hybrid (`SECOPS-LANDING` plus `SECOPS-CASE-MGMT`). Cross-bucket dependency with all 14 B3 candidates and with B2-2.

2. (Carried) SECOPS umbrella vs detection-vertical siblings modeling choice. Options unchanged: (a) flat top-level domains; (b) `parent_domain_id=11` children; (c) defer until 2 to 3 priority detection verticals are picked.

3. (Carried) SOAR vs `SECOPS-RESPONSE-OPS` overlap. Options unchanged. Cross-bucket dependency with B2-5 (since SOAR is already a SECOPS child via `parent_domain_id`).

4. (Carried) Catalog UX wording for B1-S4 (Rule #20 buyer-voice draft / review flow).

5. NEW. The catalog already carries 3 child domains under SECOPS via `domains.parent_domain_id=11`: SOAR (id 12), VULN-MGMT (id 13), THREAT-INTEL (id 14). The 2026-05-30 audit framed the umbrella vs sibling question (B2-2) as if no parent-child wiring existed, but the umbrella to children link is already partially in the catalog. The remaining detection verticals already queued (SIEM, EDR, XDR, UEBA, MDR, NDR, DFIR, BAS, SOC-AAS) are not yet loaded as `domains` rows, so the parent-child wiring is only 3 of an eventual ~12. Question: does the existing wiring change the answer to B2-1 or B2-2? Specifically (a) does the existing umbrella-to-children evidence push toward leadership-tier (option a of B2-1), since the catalog already says SECOPS is a parent rather than a peer; (b) does it argue for promoting more detection verticals as `parent_domain_id=11` children before answering B2-1; (c) does it inform B2-3, since SOAR is already declared a SECOPS child and a `SECOPS-RESPONSE-OPS` module would duplicate that scope.

### Bucket 3, Phase 0 pending (speculative)

All 14 prior B3 candidates remain open. The 2026-05-30 audit's vendor-evidence and proposed-module mappings stand; no new vendor research was conducted this pass.

### Cross-bucket dependencies

- B2-1 gates B1-S1, B1-S2, B1-S3, B1-S5, B1-S6 and all 14 B3 candidates. (Unchanged.)
- B2-4 gates B1-S4 (Rule #20 requires user-approved wording for `catalog_tagline` and `catalog_description`).
- B2-5 (NEW) interacts with B2-1 and B2-2 via the existing `parent_domain_id` wiring. Independent of B1-D1.
- B1-D1 is independent of every other open item.

### Per-bucket prompts

- After Bucket 1: Apply B1-D1 now? Reply "yes" or "skip". Single PATCH, deterministic.
- After Bucket 2: What is your call on B2-1, B2-2, B2-3, B2-4, B2-5? Each shapes downstream Bucket-1 fix scope.
- After Bucket 3: Vet via Phase 0 research, or eyeball-mode?

### Report-only follow-ups (owed by other domains)

- DLP B10b owes `source_domain_module_id` on handoffs 280, 282, 284. Pending DLP audit.
- DSPM B10b owes `source_domain_module_id` on handoffs 287, 290. Pending DSPM audit.
- ITOM B5 still owes a `domain_module_data_objects` `role=master` row on `monitoring_events` (id 84). Pending ITOM audit.
- ITSM B8 inbound mirror is owed once SECOPS masters `security_incidents` (Bucket 3 candidate).
- SOAR, THREAT-INTEL, VULN-MGMT each carry leadership-tier shape with the same M1 fail pattern as SECOPS; each is a candidate next audit.

### UI spot-checks

- domains (after B1-D1 lands): <https://tests.semantius.app/domain_map/domains> (row id 11)
- handoff_processes (5 rows from 2026-05-31 continuation still pending reviewer approval): <https://tests.semantius.app/domain_map/handoff_processes>

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
