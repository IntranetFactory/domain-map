# EHS audit history

## 2026-06-14 - Build

### Summary

EHS (Environmental, Health and Safety Management) built from scratch and loaded live at
`record_status='new'`. Phase 0 verdict (`.tmp_deploy/EHS-MGMT-phase0-2026-06-14.md`) was
promote-as-domain (decisive pass: 5+ independent flagship vendors with EHS as their primary product,
distinct regulated entity set, distinct buyer, operationally upstream of ESG). Built with
`domain_code='EHS'` (the candidate was queued EHS-MGMT; EHS is shorter and matches the catalog
short-code convention like ESG / GRC). `domain_id=174`.

Adjacent domains resolved live: ESG (21), GRC (15), IWMS (23), REAL-EST (141), FSQM (157),
HC-PATIENT (45). No standalone EHS / occupational-health-and-safety domain existed; the gap was clean.

### Phase A - Market shape

- `domains`: EHS row with all 7 business-metadata fields (crud 80, business_logic populated,
  min_org_size `30 m <2500`, cost_band `$$$`, certification_required true, usa 2500, year 2025) plus
  catalog_tagline + catalog_description (buyer voice). validateDomainRow passed; A1 post-load audit
  returns zero zero-metadata rows.
- 11 `capabilities` + 11 `capability_domains`: incident management, hazard/risk assessment, corrective
  actions (CAPA), permit tracking, inspection/audit, chemical/SDS, occupational health surveillance,
  contractor safety, environmental compliance, EHS training, industrial hygiene.
- 4 full `domain_modules`: EHS-SAFETY-INCIDENT (352), EHS-INDUSTRIAL-HYGIENE (353),
  EHS-ENV-COMPLIANCE (354), EHS-AUDIT-INSPECTION (355). 11 `domain_module_capabilities`. Each module
  carries catalog_tagline + catalog_description (buyer voice).
- 5 new `vendors` (Cority, Intelex, Enablon, VelocityEHS, Benchmark Digital Partners) + 2 reused by
  name (Sphera 57, Wolters Kluwer 47 for the Enablon brand). 6 `solutions` + 11 `solution_domains`
  (6 primary on EHS, 5 secondary on ESG / GRC). All vendors/solutions at `record_status='new'`.

### Phase B - Data-object footprint

- 15 EHS-owned `data_objects` (1073-1087), each with singular/plural labels, classified `entity_type`,
  and pattern flags considered. Naming arbitration applied (Rule #9): `ehs_risk_assessments` prefixed
  to avoid the existing `risk_assessments` (291, GRC); `ehs_audits` / `ehs_inspections` /
  `ehs_training_records` prefixed to avoid existing audit / osha_training / inspection masters;
  `environmental_permits` distinct from existing `permit_applications` (PS-LIC).
- 16 `domain_module_data_objects`: 15 master rows + 1 `consumer` row on `emissions_records` (321,
  ESG-owned) for EHS-ENV-COMPLIANCE. Necessity per Rule #16: statute-bound masters ship
  master+optional (osha_300_logs, osha_301_reports, sds_records), sector/jurisdiction-conditional ship
  master+optional (industrial_hygiene_samples, occupational_health_records, environmental_permits,
  contractor_safety_records); universal workflow masters ship master+required (safety_incidents,
  hazards, ehs_risk_assessments, corrective_actions, chemical_inventory, ehs_inspections, ehs_audits,
  ehs_training_records). M7 single-master integrity verified.
- 25 `data_object_relationships`: intra-domain edges (incidents->corrective_actions,
  hazards<->risk_assessments, inspections/audits->corrective_actions, chemicals->SDS, IH
  samples->chemicals, incidents->OSHA logs/reports, etc.) + 10 `users` edges (Rule #10: reporter,
  investigator, action owner, inspector, auditor, approver, IH collector, trainee, contractor contact)
  + 2 cross-domain edges (safety_incidents feeds esg_metrics, environmental_permits governs
  emissions_records).
- 16 `data_object_aliases` (industry/vendor synonyms: JHA/JSA, CAPA, material safety data sheets,
  hazardous substance register, etc.).
- 28 `data_object_lifecycle_states` on the 8 operational_workflow masters; 5 gated transitions with
  `requires_permission=true` (incident close, risk assessment approve, corrective action verify,
  permit active, audit close), each carrying `domain_module_id`.
- 5 `regulations` inserted (none existed): OSHA, ISO-45001, ISO-14001, REACH, EPA-EPCRA; 5
  `domain_regulations` (OSHA / REACH / EPCRA conditional, ISO 45001 / 14001 recommended). Statutory
  names used in regulations + descriptions per Rule #18 (standards bodies, not commercial brands).
- 8 `trigger_events` (incident reported/closed, corrective action verified, permit renewal_due/expired,
  audit closed, IH sample limit_exceeded, emissions_record recorded) with valid event_category.
- 5 `handoffs`: 3 cross-domain (safety_incident -> ESG, emissions_record -> ESG, permit renewal_due
  intra) and 2 intra-domain cross-module (audit close -> safety corrective_actions, IH over-limit ->
  safety hazard). 2 `handoff_processes` PCF tags (`agent_curated`) on the two ESG-bound handoffs
  (13.9.2.4 Record and manage EHS events; 13.9.3.2 Measure and report EHS performance).

### Phase C - Functional ownership

- 5 `business_function_domains`: owner Facilities and Real Estate (33, per the spine which lists EH&S
  under it); contributors Human Resources (3), Manufacturing Operations (48), GRC (31); consumer ESG
  and Sustainability (36).

### Phase S - System skill + tools

- 1 `skills` row: `ehs-system` (461), `skill_type='system'`, `domain_id=174`, `domain_module_id` NULL
  (Rule #17 one domain-grain system skill). 20 new `tools` (12 query + 8 mutate, all coverage_tier
  platform) + reused notify_person (913) / notify_team (914). 24 `domain_module_tools` rolled up across
  the 4 modules. F4 invariant verified (query/mutate carry data_object_id + platform tier; notify
  side_effects carry null). Strict Semantius score is computable (F5).

### Phase E - Personas, reach, RACI

- 4 `domain_roles`: EHS Safety Manager (86), Industrial Hygienist (87), Environmental Compliance
  Manager (88), all under Facilities and Real Estate; EHS Site Manager (89) cross-functional
  (business_function_id NULL). 11 `role_modules`, every persona >= 2 modules (E2 floor met).
- 5 gated lifecycle states wired to real cross-industry PCF nodes via
  `data_object_lifecycle_states.process_id` (13.9.2.4 / 6.4.2 / 13.9.3 / 13.9.1 / 13.9.1.2). 11
  `process_raci` rows; each gated process has >= 1 Responsible + 1 Accountable persona (E4), plus a
  consulted Industrial Hygienist on the hazard-assessment process. No net-new APQC processes authored;
  all five PCF nodes are real cross-industry rows under category 13.9 (Manage Environmental Health and
  Safety) and 6.4.

### Post-load audit results

- A1 (Rule #8 metadata): pass (zero zero-metadata rows).
- M1 / M2 (modules): 4 full modules, >= 2 for an 11-capability domain. Pass.
- M7 (single-master): each of the 15 masters has exactly one master row, correct attribution. Pass.
- B12 / B13 (lifecycle + entity_type): all 8 operational_workflow masters carry lifecycle; all 15
  masters classified (no unclassified). Pass.
- B14 (statute/sector necessity): osha_300_logs, osha_301_reports, sds_records, industrial_hygiene_
  samples, occupational_health_records, environmental_permits, contractor_safety_records all
  master+optional. Pass.
- E2 / E4 (reach floor + RACI): pass. F4 (tool invariant): pass.
- record_status sweep: zero non-`new` rows across modules, data_objects, vendors, solutions, all
  junctions. Rule #1 held.
- notes sweep: zero non-empty `notes` on EHS handoffs / DMDO / relationships. Rule #15 held.

### Decisions surfaced (open, in state.yaml)

Three market-shape `b2` forks carried to the user (none gated the build; all surfaced with
named-vendor evidence per Rule #22): confirm the 4-module split (B2-S1), confirm owner function =
Facilities vs Operations/Manufacturing (B2-S2), confirm the EHS -> ESG upstream disclosure edge
(B2-S3, emissions-feed boundary overlaps REAL-EST). Three `b3` additive ideas (permit-to-work as a
first-class entity; MOC + SIF-precursor records for process industries; shared-master review for
sites/contractors/chemicals). Candidate-code note recorded (queued EHS-MGMT, built EHS).
