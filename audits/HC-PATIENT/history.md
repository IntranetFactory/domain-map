# HC-PATIENT audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 6 masters (`patient_appointments`, `clinical_encounters`, `care_plans`, `patient_referrals`, `clinical_orders`, `clinical_notes`), 0 modules, 0 capabilities, 0 capability_domains, 0 domain_module_data_objects rows, 4 solutions, 4 regulations, 7 trigger_events, 5 outbound handoffs, 2 inbound handoffs, 0 data_object_aliases, 0 data_object_lifecycle_states, 0 user-edge relationships, 4 intra/inbound data_object_relationships, 2 business_function_domains rows, 1 legacy domain-level system skill (id 66 `hc-patient-system`, 8 skill_tools).
- Vendor-surface basis: Epic, Oracle Health (Cerner), Athenahealth, eClinicalWorks, NextGen Healthcare, Innovaccer, Salesforce Health Cloud, ServiceNow Healthcare and Life Sciences. Pure-play ambulatory EHRs anchor the workflow surface; Innovaccer anchors care coordination; Salesforce Health Cloud anchors longitudinal patient relationship management.
- HC-PATIENT is severely under-loaded versus a flagship patient-operations vendor surface. The domain is at Phase A skeleton plus a partial Phase B (6 masters loaded, no modules, no capabilities, no lifecycle states, no aliases, no APQC tagging, no module-level skill).
- **Bucket 1 (in-scope, agent fixable):** 16 items.
- **Bucket 2 (surface-for-user, judgment):** 7 items.
- **Bucket 3 (Phase 0 pending, speculative):** 20 items.

Structural pass: A4 fails (catalog UX fields empty); A1 passes; A2 fails (zero capabilities). M1 fails hard (zero modules), which cascades into M2/M4/M5/M6 vacuous failures, M7 vacuous pass (no DMDO rows), B10b cannot be cured without modules, B12 deferred. B band: B1 passes (6 masters), B2 passes, B3 passes (all 6 use snake_case prefixed forms; no bare-word claims), B4 fails (zero pattern flags considered, PHI masters), B5 vacuously passes (zero embedded_master rows), B6 fails (no intra-domain relationships among the 6 masters), B7 fails (zero `users` edges), B8 fails (no cross-domain payload relationships authored), B9 partial fail (1 trigger_event has no handoff row, plus 7 events carry empty `event_category`), B9b not applicable (single-domain, modules absent), B10b fails (every outbound handoff has NULL `source_domain_module_id`; inbound handoffs from CLIN-DEV have NULL `target_domain_module_id`), B11 fails (zero aliases), B12 fails (zero lifecycle states). C1 passes (Business Operations owner, Finance contributor) but ownership choice is dubious for a clinical-workflow domain (see B2-2). E1 vacuously passes (zero modules blocks role authoring). F1 will fail (legacy `hc-patient-system` with `domain_id=45`, `domain_module_id=null`) once module-level skill is authored. F2-F5 cannot be evaluated without modules. H1 fails (7 cross-domain handoffs, zero `handoff_processes` rows).

### Vendor surface basis

Patient-operations is the clinician-facing front-of-house slice of healthcare delivery: scheduling, encounter capture, care coordination, ordering, and clinical documentation. Six vendors were enumerated for surface diff:

- **Epic Systems**, **Oracle Health (Cerner)**, **MEDITECH**, **Athenahealth**, **eClinicalWorks**: full-stack EHR/ambulatory platforms whose patient-operations surface is the reference shape.
- **Salesforce Health Cloud**: longitudinal patient relationship management, care plans, and care-team coordination on top of CRM.
- **Innovaccer**: care coordination and population-health workflows on top of an EHR-agnostic patient record.
- **ServiceNow Healthcare and Life Sciences**: workflow orchestration and clinical engineering, lighter on the master record.

The surface deliberately scopes out: ancillary departmental systems (LIS, RIS, PACS), revenue-cycle systems (billing, claims, denials), payer-side systems (eligibility, prior auth fulfillment), pharmacy dispensing, and inpatient care management. Those are adjacent markets (see candidates queued in `audits/_missing-domains.md`) and explain several SCOPE-CREEP findings and inbound handoff gaps below.

### Bucket 1, In-scope confirmed gaps

| Finding type | Count |
| --- | --- |
| MISSING (entity gap) | 0 (entity gaps live in Bucket 3 pending Phase 0 vetting) |
| WRONG-OWNERSHIP | 0 (no DMDO rows exist; the question is vacuous until M1 ships modules) |
| SCOPE-CREEP | 0 (escalated to Bucket 2 because all candidates depend on adjacent-domain decisions) |
| STRUCTURAL | 15 |
| BOUNDARY | 0 (every cross-domain finding is a NULL FK that B10b covers; counted under STRUCTURAL) |
| APQC TAGGING | 1 |

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1, M2 | Zero `domain_modules` rows. The domain holds 6 masters but no deployable unit; nothing is shippable per Rule #14. M2 will then require >=2 modules once >=3 capabilities (A2) ship. | Author a module set (default proposal: 2 full modules. `HC-PATIENT-SCHED` covering `patient_appointments`, `patient_referrals`; `HC-PATIENT-CLINICAL` covering `clinical_encounters`, `care_plans`, `clinical_orders`, `clinical_notes`). Resolve B2-1 first. Load `domain_modules` + `domain_module_data_objects` (master role on the owning module for each of the 6 masters, `necessity=required`) in the same Phase-A loader. |
| B1-S2 | A2 | Zero `capability_domains` rows; the domain has no declared capabilities. Per Rule #14 + checklist A2 (typical 5-8). | Draft 5-8 capabilities (proposal: `HC-PAT-SCHED` patient scheduling, `HC-PAT-DOC` clinical documentation, `HC-PAT-CARE-COORD` care coordination, `HC-PAT-ORDERS` clinical order entry, `HC-PAT-REFERRAL-MGMT` referral management, `HC-PAT-INTAKE` patient intake). Link via `capability_domains` and `domain_module_capabilities` against the modules from B1-S1. |
| B1-S3 | A4 | `domains.catalog_tagline` and `domains.catalog_description` are both empty. | Draft both fields in buyer voice per Rule #20, surface to user for review BEFORE writing. Do not auto-write. |
| B1-S4 | B4 | Pattern flags `has_personal_content`, `has_submit_lock`, `has_single_approver` are all `false` on every master. Every master in this domain holds PHI (HIPAA scope is identified on the domain), so `has_personal_content=true` is correct on all 6 masters. `clinical_notes` and `clinical_orders` are both submit-lock candidates (signed notes are immutable; placed orders cannot be retroactively edited). `clinical_notes` has a single-approver shape (the responsible provider signs). | PATCH the flags. Recommended values: all 6 masters get `has_personal_content=true`; `clinical_notes` and `clinical_orders` get `has_submit_lock=true`; `clinical_notes` gets `has_single_approver=true`. |
| B1-S5 | B6 | Zero intra-domain `data_object_relationships` among the 6 masters. The current workflow chain is implicit: `patient_appointments` -> `clinical_encounters` -> `clinical_orders` + `clinical_notes`; `patient_referrals` -> `clinical_encounters`; `care_plans` references multiple encounters. | Author at least 6 edges: `patient_appointments produces clinical_encounters`, `clinical_encounters produces clinical_orders`, `clinical_encounters produces clinical_notes`, `patient_referrals triggers clinical_encounters`, `care_plans guides clinical_encounters`, `clinical_orders informs clinical_notes`. Each row carries `relationship_verb`, `inverse_verb`, cardinality, `is_required`, `owner_side`. |
| B1-S6 | B7 | Zero `data_object_relationships` edges between any HC-PATIENT master and the platform built-in `users` (id 748). Per Rule #10 every master with a user-typed actor needs this edge. | Author 6 edges per Rule #10 (each master has at least one user role: appointment scheduler, encountering provider, ordering clinician, signing provider, care coordinator, referring provider). Load as `data_object_relationships` rows pointing at `users` (id 748). |
| B1-S7 | B8 | Five outbound handoffs (ids 899, 900, 901, 902, 903) but zero corresponding outbound cross-domain `data_object_relationships` rows from HC-PATIENT masters to the target domains' masters. | Author 4 outbound relationship rows for the clean payload-target mappings: `patient_appointments triggers customer_cases` (handoff 899 to CSM), `clinical_encounters informs invoices` or equivalent ERP-FIN row (handoff 900), `patient_referrals creates customer_cases` (handoff 902), `clinical_notes informs invoices` (handoff 903). Handoff 901 (`clinical_order.placed` -> ITSM `service_incidents`) is semantically suspect: routed to Bucket 2 (B2-3). |
| B1-S8 | B9 | Trigger event 1022 `patient_appointment.scheduled` has zero `handoffs` rows. The scheduling event is the canonical signal for downstream patient-communication, calendar holds, payer eligibility checks, and care-team notifications; loading the event without any subscriber leaves the publish leg orphaned. | Author at least 1 outbound handoff per published event. Candidates: HC-PATIENT-SCHED -> CSM (case create for prep), HC-PATIENT-SCHED -> TELEHEALTH (virtual-visit setup, blocked on Phase 0 candidate). Minimum: a no-target stub is not acceptable; resolve B1-S8 by either loading the missing handoff or removing the event row. |
| B1-S9 | B9 (enum) | All 7 `trigger_events` rows for HC-PATIENT masters carry `event_category=""` (empty). The enum requires one of `lifecycle`, `state_change`, `threshold`, `signal` per Rule #13. | PATCH each event: `patient_appointment.scheduled` = `lifecycle`; `patient_appointment.no_show` = `state_change`; `clinical_encounter.completed` = `state_change`; `clinical_order.placed` = `lifecycle`; `patient_referral.created` = `lifecycle`; `clinical_note.signed` = `state_change`; `care_plan.activated` = `state_change`. |
| B1-S10 | B10b outbound | All 5 outbound handoffs (ids 899, 900, 901, 902, 903) have `source_domain_module_id=null`. The source side cannot be backfilled until B1-S1 ships modules; once it does, the derivation in `backfill_ats_handoff_modules_2026_05_23.ts` applies. | After B1-S1 lands, run the standard backfill: pick the source module that masters the event's `data_object_id`. Expected wiring: 899/1023 -> HC-PATIENT-SCHED (patient_appointments); 900/1024 -> HC-PATIENT-CLINICAL (clinical_encounters); 901/1025 -> HC-PATIENT-CLINICAL (clinical_orders); 902/1026 -> HC-PATIENT-SCHED (patient_referrals); 903/1027 -> HC-PATIENT-CLINICAL (clinical_notes). |
| B1-S11 | B10b inbound | Two inbound handoffs from CLIN-DEV (ids 896 `device_recall.issued`, 897 `sterilization_cycle.failed`) have `target_domain_module_id=null`. Cannot be filled until HC-PATIENT modularizes. | After B1-S1 lands, pick the consuming module. Both events affect ongoing clinical operations, target module probably HC-PATIENT-CLINICAL. Requires loading `consumer` DMDO rows for `device_recalls` (612) and `sterilization_cycles` (616) on HC-PATIENT-CLINICAL first, then PATCH. |
| B1-S12 | B11 | Zero `data_object_aliases` rows for any of the 6 masters. Every master has at least one cross-vendor or cross-industry synonym in healthcare: `patient_appointment` -> visit (Epic), appointment slot (legacy); `clinical_encounter` -> visit, episode (Cerner), event (HL7); `care_plan` -> treatment plan, plan of care; `patient_referral` -> consult (Epic), order (HL7 v2 OBR); `clinical_orders` -> order (HL7), CPOE order; `clinical_notes` -> chart note, progress note, SOAP note, encounter note. | Author 2-3 aliases per master (12-18 total). Loader idiom: chunked insert against `/data_object_aliases`. |
| B1-S13 | B12 | Zero `data_object_lifecycle_states` rows on any of the 6 masters. Every one has a workflow with multiple distinct states. Required per Rule #12. | Draft lifecycle states for each master. Minimum shape: `patient_appointments` (scheduled, checked_in, in_progress, completed, no_show, cancelled); `clinical_encounters` (open, in_progress, completed, signed, locked); `care_plans` (draft, active, on_hold, completed, withdrawn); `patient_referrals` (created, sent, accepted, declined, completed, expired); `clinical_orders` (placed, in_progress, resulted, completed, cancelled, discontinued); `clinical_notes` (draft, signed, addended, amended). Set `requires_permission=true` on the workflow gates (`signed`, `locked`, `cancelled`, `discontinued`, `addended`, `amended`). Per Rule #12 this MUST land in Phase B, not deferred. |
| B1-S14 | F2 | After B1-S1 ships modules, the legacy `hc-patient-system` skill (id 66, `domain_module_id=null`) leaves every module with zero module-level system skills. F2 will fail. | Author one `skill_type='system'` skill per module per Rule #17. Naming: `hc_patient_sched_agent`, `hc_patient_clinical_agent` (snake, lowercased module code + `_agent`). Same load as B1-S1. |
| B1-S15 | F3 | The legacy skill 66 carries 8 `skill_tools` rows (6 query primitives, send_email, send_sms). Once split per module the new skills need their own `skill_tools` rows. The current set is read-only plus channel-specific notifications; missing mutate primitives (`create_patient_appointment`, `update_clinical_note`, etc.) and the abstraction `notify_person` / `notify_team` per the Channel vs capability authoring rule. | Phase-S authoring: per module, add CRUD primitives for the module's masters, plus `notify_person` as the default for generic notifications. Keep `send_email` only if a specific workflow (e.g. patient appointment confirmation) requires email as the contract. F7 also flagged: `send_sms` (coverage_tier external) needs either a workflow-specific justification OR replacement with `notify_person`. |
| B1-S16 | F1 | The legacy `hc-patient-system` skill (id 66) carries `domain_id=45`, `domain_module_id=null`. Once any module-level system skill ships under B1-S14, F1 requires the legacy row to be retired. | DELETE skill id 66 after B1-S14 lands. The 8 `skill_tools` rows are reused by the module-level skills (re-linked, not duplicated). |

#### APQC TAGGING

7 cross-domain handoffs (5 outbound, 2 inbound) carry zero `handoff_processes` rows. The audit volume target is 0.5N to 0.8N tags = roughly 4-6 proposed agent-curated rows; the rest (1-3) defer to Discover Pass 3 where a clean PCF match does not exist.

| ID | handoff_id | source -> target | trigger_event | payload | Proposed PCF row | hierarchy_level | confidence |
|---|---|---|---|---|---|---|---|
| B1-H1.1 | 899 | HC-PATIENT -> CSM | patient_appointment.no_show | patient_appointments | Manage customer service requests / inquiries (candidate; verify against `/processes` lookup at fix-load time) | L3-L4 candidate | medium |
| B1-H1.2 | 900 | HC-PATIENT -> ERP-FIN | clinical_encounter.completed | clinical_encounters | Process accounts receivable (AR) / Manage revenue accounting (candidate; the encounter completion is the charge-capture trigger) | L2-L3 candidate | medium |
| B1-H1.3 | 901 | HC-PATIENT -> ITSM | clinical_order.placed | service_incidents (foreign payload) | DEFER, semantically suspect handoff modeling (see B2-3); APQC tagging would lock in a wrong shape | n/a | defer |
| B1-H1.4 | 902 | HC-PATIENT -> CSM | patient_referral.created | patient_referrals | Manage customer inquiries / Track and route customer cases (candidate) | L3 candidate | medium |
| B1-H1.5 | 903 | HC-PATIENT -> ERP-FIN | clinical_note.signed | clinical_notes | Capture and process financial transactions (charge capture lock on signature; candidate) | L2-L3 candidate | medium |
| B1-H1.6 | 896 | CLIN-DEV -> HC-PATIENT | device_recall.issued | device_recalls | Manage patient safety / Manage product safety and recalls (candidate; PCF cross-industry has product safety; healthcare-specific recall may need custom) | L3 or custom | low |
| B1-H1.7 | 897 | CLIN-DEV -> HC-PATIENT | sterilization_cycle.failed | sterilization_cycles | DEFER, no clean PCF match (sterile-processing failure is industry-specific; Discover Pass 3 likely routes to custom process) | n/a | defer |

**Procedure:** at fix-load time, run `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry` per row, pick the strongest L2/L3 hit, INSERT `(handoff_id, process_id, proposal_source='agent_curated', record_status='new')`. The 2 DEFER rows wait for Discover Pass 3.

### Bucket 2, Surface-for-user (judgment calls)

1. **B2-1, Module split decision.** HC-PATIENT has 6 masters and likely 5-8 capabilities, putting it over the M2 >=3-capability threshold (>=2 full modules required). Proposed split: (a) `HC-PATIENT-SCHED` covering `patient_appointments`, `patient_referrals`, (b) `HC-PATIENT-CLINICAL` covering `clinical_encounters`, `care_plans`, `clinical_orders`, `clinical_notes`. Alternative: 4-module split SCHED + ORDERS + CARE-COORD + CLINICAL-DOC for finer-grained deployability (each can ship as a starter for SMB practices). Which split do you want? Dependency: blocks B1-S1 (cannot author modules until shape is approved). Independent of Bucket 3.

2. **B2-2, Owner business function.** Currently `business_function_domains` lists Business Operations as owner, Finance as contributor. Healthcare delivery is owned by clinical operations (providers, nurses, care coordinators), not by Business Operations. The canonical 20-function spine does not include a Healthcare or Clinical Operations function. Options: (a) keep Business Operations as a generic placeholder, (b) add a new top-level `Clinical Operations` business_function, (c) re-attribute to Customer Service (providers serve patients but the framing is unusual). Recommendation: (b) but it sets precedent (industry-specific function on a generic 20-function spine). Independent of Bucket 3.

3. **B2-3, Handoff 901 semantic correctness.** `clinical_order.placed` (event 1025) targets ITSM with payload `service_incidents` (id 47). Clinical orders route to lab / imaging / pharmacy fulfillment systems, not IT service incidents. The current modeling reads as a placeholder. Options: (a) keep as a degraded interim model until EHR / HC-PHARM-MGMT / HC-LAB ship (Phase 0 queue items), (b) DELETE the handoff row and rely on B1-S10 to reconstruct, (c) re-author to target a TBD healthcare fulfillment domain. Recommendation: (b), DELETE and re-author after Phase 0 vetting of EHR / HC-PHARM-MGMT. Has Bucket 3 dependency (rewrite path depends on EHR / HC-PHARM-MGMT landing as real domains).

4. **B2-4, A1 cost_band sanity check.** Current `cost_band=$$$$` ($500k-$2M yearly TCO for 500-user org). Patient-operations as scoped here (scheduling + documentation + orders + referrals, no full EHR, no RCM, no payer side) is plausibly $$$ ($100k-$500k) for an ambulatory practice. Full hospital EHR is $$$$$. Confirm: keep $$$$, drop to $$$, or split when modules ship (lite SMB ambulatory module at $$ vs full-suite at $$$$). Independent of Bucket 3.

5. **B2-5, `patients` master question.** HC-PATIENT does not currently master a `patients` data_object. The 6 existing masters reference patients implicitly via appointments, encounters, notes, orders, referrals, plans. EHR vendors universally master a patient demographic record at the EHR level. Options: (a) HC-PATIENT masters `patients` now (preempts EHR domain), (b) wait until EHR is loaded and HC-PATIENT becomes a `consumer` + `embedded_master` of `patients`, (c) load `patients` now as a placeholder + flag for re-attribution when EHR ships. Recommendation: (b) but blocks several Bucket 3 candidates (`medical_problems`, `allergies`, `medications`) that all FK to `patients`. Has Bucket 3 dependency.

6. **B2-6, customer_cases as outbound payload.** Handoffs 899 (no_show) and 902 (referral.created) target CSM with payload `customer_cases` (id 103, CSM-mastered). Healthcare patient-ops typically does not flow into a CRM case queue; it flows into the EHR's task queue or a dedicated patient-engagement system. Options: (a) keep current CSM routing (acceptable when CSM/CRM is the provider's patient-engagement layer, e.g. Salesforce Health Cloud deployments), (b) re-target to a new HC-PATIENT-INTAKE module's own `patient_inquiries` master, (c) defer to EHR + TELEHEALTH domains landing. Independent of Bucket 3 if Salesforce Health Cloud is treated as the canonical patient-engagement layer.

7. **B2-7, DMDO migration.** All current HC-PATIENT data_object rows live in legacy `domain_data_objects` (the pre-modular rollup), with zero rows in `domain_module_data_objects`. Per SKILL.md the rollup is derived from DMDO once modules ship; the migration must happen in the same load that authors modules. Confirm: author DMDO rows for all 6 masters at B1-S1 load time (default), or stage in two loads (modules first, DMDO second). Recommendation: single load. Independent of Bucket 3.

### Bucket 3, Phase 0 pending (speculative)

Entity-level candidates surfaced by vendor knowledge but not yet anchored to a Phase 0 vendor-surface document. Each needs vetted research or eyeball-mode user confirmation before loading.

#### Entity candidates (15)

| ID | Candidate entity | Proposed module | Vendor evidence | Notes |
|---|---|---|---|---|
| B3-E1 | `patients` | HC-PATIENT-CLINICAL or shared between both modules as master | Epic, Cerner, Athenahealth, eClinicalWorks, Salesforce Health Cloud, Innovaccer | Central demographic record. Boundary with EHR (Phase 0 candidate). |
| B3-E2 | `medical_problems` (problem list) | HC-PATIENT-CLINICAL | Epic, Cerner, eClinicalWorks | Chronic conditions per patient; tied to ICD-10. Likely EHR-mastered once EHR domain loads. |
| B3-E3 | `patient_allergies` | HC-PATIENT-CLINICAL | Epic, Cerner | Drug-allergy decision support input; safety-critical. |
| B3-E4 | `patient_medications` (active medication list) | HC-PATIENT-CLINICAL | All EHR vendors | Active med list, reconciliation source. Boundary with HC-PHARM-MGMT. |
| B3-E5 | `immunization_records` | HC-PATIENT-CLINICAL | Epic, Cerner, public-health registries | Vaccination history; jurisdictional registry reporting. |
| B3-E6 | `vital_signs_readings` | HC-PATIENT-CLINICAL | All EHR vendors | Per-encounter vitals. |
| B3-E7 | `clinical_diagnoses` | HC-PATIENT-CLINICAL | Epic, Cerner, eClinicalWorks | ICD-10 coded diagnoses per encounter; billing input. |
| B3-E8 | `clinical_procedures` | HC-PATIENT-CLINICAL | Epic, Cerner | CPT coded procedures per encounter; billing input. |
| B3-E9 | `patient_consents` | HC-PATIENT-SCHED or HC-PATIENT-INTAKE | All EHR vendors, HIPAA-mandated | HIPAA authorization, informed consent, treatment consent. |
| B3-E10 | `care_team_assignments` | HC-PATIENT-CLINICAL | Innovaccer, Salesforce Health Cloud, Epic | Per-patient care team membership (primary, specialists, coordinators). |
| B3-E11 | `patient_communications` | HC-PATIENT-SCHED or HC-PATIENT-PORTAL | All EHR portals, Salesforce Health Cloud | Secure portal messages, appointment reminders. |
| B3-E12 | `clinical_results` (lab + imaging) | HC-PATIENT-CLINICAL | All EHR vendors | Result delivery, abnormal flags. Boundary with future HC-LAB / HC-IMAGING domains. |
| B3-E13 | `prior_authorizations` | HC-PATIENT-CLINICAL | EHR vendors, payer integrations | Payer-required pre-approval. Boundary with HC-PAYER (Phase 0 candidate). |
| B3-E14 | `charge_captures` (superbills) | HC-PATIENT-CLINICAL | EHR vendors | Billing seed. Boundary with HC-RCM (Phase 0 candidate). |
| B3-E15 | `appointment_slot_templates` | HC-PATIENT-SCHED | Epic Cadence, Athenahealth | Provider availability blocks. Configuration shape, may be config-shaped exempt. |

#### Modularization candidates (2)

| ID | Candidate | Notes |
|---|---|---|
| B3-M1 | 4-module split (SCHED + ORDERS + CLINICAL-DOC + CARE-COORD) instead of 2-module | Finer-grained deployability for SMB ambulatory practices. Decision dependency on B2-1. |
| B3-M2 | `HC-PATIENT-PORTAL` starter module | Patient self-service: appointment booking, secure messaging, results viewing. Per Rule #19 a starter; never masters, always embedded_master + consumer. |

#### Regulation candidates (3)

| ID | Candidate | Notes |
|---|---|---|
| B3-R1 | 42 CFR Part 2 | Confidentiality of substance use disorder treatment records. US federal regulation. Mandatory for any HC-PATIENT deployment touching SUD records. |
| B3-R2 | 21st Century Cures Act, ONC information blocking rule | US federal interoperability mandate. Information-blocking penalties on EHR vendors and providers. |
| B3-R3 | CMS Interoperability and Patient Access Final Rule | US federal payer-provider data exchange (FHIR APIs). Mandatory for CMS-payable providers. |

### Cross-bucket dependencies

- B2-1 (module split) BLOCKS every B1 item that touches modules: B1-S1, B1-S10, B1-S11, B1-S14, B1-S15, B1-S16. Resolve B2-1 first.
- B2-3 (handoff 901 ITSM correctness) is informed by Bucket 3 Phase 0 vetting of EHR + HC-PHARM-MGMT candidates (queued in `audits/_missing-domains.md`). If you choose Bucket 3 vetted route, hold B2-3 until research lands; if eyeball-mode, resolve immediately by DELETE + queue for re-author.
- B2-5 (patients master) blocks Bucket 3 items B3-E1 through B3-E8, B3-E10, B3-E12, B3-E13, B3-E14 (each FK-references `patients`). Resolve B2-5 to unblock those.
- B2-6 (customer_cases as outbound payload) is informed by Bucket 3 candidates EHR + TELEHEALTH landing. Same dependency shape as B2-3.
- B2-2 (owner business function) is independent.
- B2-4 (cost_band sanity) is independent.
- B2-7 (DMDO migration timing) is technical, independent.
- B1-H1 (APQC tagging) can proceed in parallel with B1-S1..S16 since the 7 candidate `handoff_processes` rows do not depend on modules or DMDO.
- Bucket 3 Phase 0 vetting of EHR, HC-RCM, HC-PAYER, TELEHEALTH, HC-PHARM-MGMT (queued in `_missing-domains.md`) gates re-authoring decisions for handoffs 901, 899, 902, 900, 903.

### Per-bucket prompts

**After Bucket 1:** "Fix these now? Reply 'all', 'just S1, S2, S3 first as the structural gate', or 'skip'. Note that B1-S10, B1-S11, B1-S14, B1-S15, B1-S16 are blocked by B1-S1 and B2-1; the rest are parallelizable. B1-S3 (catalog UX) requires drafted text user-approved BEFORE write per Rule #20."

**After Bucket 2:** "What is your call on each of B2-1 through B2-7? I will wait for your decision per item. B2-1 is the critical gate. For B2-3 and B2-6, name 'vetted' or 'eyeball' to align with the Bucket 3 vendor-research direction. For B2-2 owner function I will need explicit naming of the function (existing or new)."

**After Bucket 3:** "Vet via Phase 0 research, or eyeball-mode? If eyeball, name which of B3-E1 through B3-E15 ring true. Phase 0 vendor research scope: Epic, Cerner, Athenahealth ambulatory schema docs plus Innovaccer + Salesforce Health Cloud data dictionaries. Also confirm whether to load any of B3-M1, B3-M2, B3-R1, B3-R2, B3-R3 immediately or hold until Phase 0 lands."

### Pass 3, Neighbor discovery

Auto-discovered neighbors from `handoffs` (outbound + inbound) and DMDO cross-references. Zero DMDO cross-references exist (HC-PATIENT has zero `domain_module_data_objects` rows), so the neighbor graph is handoff-only.

| Neighbor | Outbound edges | Inbound edges | Total edge weight | Pass-4 deep dive? |
|---|---|---|---|---|
| CSM (id 30) | 2 (handoffs 899, 902) | 0 | 2 | No (below threshold >=3) |
| ERP-FIN (id 65) | 2 (handoffs 900, 903) | 0 | 2 | No |
| ITSM (id 1) | 1 (handoff 901, semantically suspect) | 0 | 1 | No |
| CLIN-DEV (id 50) | 0 | 2 (handoffs 896, 897) | 2 | No |

No neighbor reaches the weight-3 threshold for the full 5-section pairwise diff. Light summaries:

- **HC-PATIENT <-> CSM (weight 2):** Both outbound handoffs target CSM's `customer_cases` (id 103) as payload. Healthcare patient-engagement via CRM is a valid pattern (Salesforce Health Cloud) but degraded compared to a dedicated patient-engagement domain. Inbound CSM coverage is zero, expected for one-way reporting flow. No B5 integrity gap surfaced (CSM masters `customer_cases`).
- **HC-PATIENT <-> ERP-FIN (weight 2):** Both outbound handoffs are charge-capture / billing triggers. The payload mismatch (`clinical_encounters`, `clinical_notes` as payload while ERP-FIN does not master either) is acceptable if ERP-FIN consumes them via a downstream RCM-style flow. Once HC-RCM is loaded (Phase 0 candidate), these handoffs should route to HC-RCM as the intermediate domain, not directly to ERP-FIN.
- **HC-PATIENT <-> ITSM (weight 1):** Single outbound handoff (901) with semantically suspect modeling. See Bucket 2 B2-3.
- **HC-PATIENT <-> CLIN-DEV (weight 2):** Two inbound handoffs (device_recall.issued, sterilization_cycle.failed) from CLIN-DEV. B10b cannot fix target_domain_module_id until HC-PATIENT modularizes (B1-S11). HC-PATIENT also lacks consumer DMDO rows for `device_recalls` (612) and `sterilization_cycles` (616): loading those is the upstream fix.

### Pass 4, Pairwise reconciliation per neighbor (edge weight >= 3)

No neighbor reached the threshold. Skipped. If user later requests deep pairwise reconciliation on CSM or ERP-FIN (the two weight-2 neighbors closest to the threshold), run the 5-section diff on demand.

### Report-only follow-ups (owed by other domains)

- **CSM B8 owes inbound on `customer_cases` <- HC-PATIENT (handoffs 899 + 902).** CSM's next b1 audit should surface `customer_cases received_from patient_appointment.no_show` and `customer_cases received_from patient_referral.created` as inbound relationship rows. Not a fix for HC-PATIENT.
- **ERP-FIN B10b inbound module attribution.** Once HC-PATIENT modularizes (B1-S1), ERP-FIN's next b1 audit will need to set `target_domain_module_id` on handoffs 900 and 903 (the inbound side from ERP-FIN's perspective). Not a fix for HC-PATIENT.
- **CLIN-DEV B10b outbound module attribution.** Handoffs 896 + 897 carry `source_domain_module_id=null` (the source side, which is CLIN-DEV's responsibility). CLIN-DEV b1 audit needs to backfill once its modules are confirmed. Not a fix for HC-PATIENT.
- **CSM B10b inbound module attribution.** Once HC-PATIENT modularizes, CSM needs to set `target_domain_module_id` on 899 + 902.
- **ITSM B10b inbound module attribution.** Handoff 901 has `target_domain_module_id=38` already set but `source_domain_module_id=null`. ITSM is not the side that owes the source FK; HC-PATIENT owes it (covered under B1-S10). But the semantic correctness of the handoff itself (B2-3) is a joint concern: ITSM's next audit should also surface this as a potentially-orphan inbound.

### Candidates queued in `audits/_missing-domains.md`

Five adjacent healthcare markets surfaced during the market-audit pass that have no row in `domains` and would resolve several Bucket 2 / Bucket 3 dependencies:

- **EHR**, Electronic Health Record. Anchors `patients`, `medical_problems`, `clinical_diagnoses`, `vital_signs_readings`, `immunization_records`. Vendors: Epic, Oracle Health (Cerner), MEDITECH, Athenahealth, eClinicalWorks.
- **HC-RCM**, Healthcare Revenue Cycle Management. Anchors `charge_captures`, `claim_submissions`, `denial_management`, `patient_billing`. Vendors: Waystar, R1 RCM, Optum, Change Healthcare, Experian Health, FinThrive.
- **HC-PAYER**, Health Plan Payer Operations. Anchors `prior_authorizations`, `claims_adjudication`, `member_enrollment`, `benefit_configuration`. Vendors: HealthEdge HealthRules Payer, TriZetto QNXT, Cognizant Facets, Edifecs.
- **TELEHEALTH**, Telehealth and Virtual Care. Anchors `virtual_visit_sessions`, `virtual_waiting_room_entries`, `remote_monitoring_intakes`. Vendors: Teladoc Health, Amwell, Doxy.me, Zoom for Healthcare, MDLIVE.
- **HC-PHARM-MGMT**, Pharmacy Practice and Medication Management. Anchors `dispensed_prescriptions`, `medication_reconciliations`, `drug_utilization_reviews`, `controlled_substance_ledger`. Vendors: McKesson EnterpriseRx, Cardinal Health Cube Rx, Omnicell, BD Pyxis, Surescripts.

All five were appended via `scripts/analytics/append_missing_domain.ts` with `--surfaced-by "HC-PATIENT audit 2026-05-30"`. The orchestrator's triage queue is the canonical record.

## 2026-05-31, Continuation: B1 technical fixes

### Scope

Loader: `.tmp_deploy/fix_hc_patient_b1_technical_2026_05_31.ts`, run from project root (`c:/dev/domain-map`). Applied only the B1 items whose target values are pre-specified by the 2026-05-30 audit; deferred every judgment call, every flag-flip, and every item gated on B1-S1 module creation.

### Applied (2 items)

- **B1-S9 (enum backfill, 7 rows).** PATCHed `trigger_events.event_category` for ids 1022..1028 with the exact values the audit named: 1022=`lifecycle`, 1023=`state_change`, 1024=`state_change`, 1025=`lifecycle`, 1026=`lifecycle`, 1027=`state_change`, 1028=`state_change`. All 7 moved from empty string to the target enum value.
- **B1-S5 (intra-domain edges, 6 INSERTs).** Loaded 6 `data_object_relationships` rows (ids 1857..1862) among the 6 HC-PATIENT masters, exactly the audit's pre-specified shape: `patient_appointments produces clinical_encounters`, `clinical_encounters produces clinical_orders`, `clinical_encounters produces clinical_notes`, `patient_referrals triggers clinical_encounters`, `care_plans guides clinical_encounters`, `clinical_orders informs clinical_notes`. All carry `record_status=new` (per Rule #1 the field was omitted on insert and defaulted), `notes=''` (per Rule #15). The 3 `produces` edges are modeled as `composition` (encounter is the parent of the artifact); the other 3 as `reference`.

### Deferred (14 items, with reasons)

| Item | Reason for defer |
|---|---|
| B1-S1 | New `domain_modules` (judgment call, gated on B2-1 split decision). |
| B1-S2 | New `capabilities` (new entity drafts). |
| B1-S3 | `catalog_tagline` / `catalog_description` need user-approved wording per Rule #20. |
| B1-S4 | Pattern flag flips (out of scope for the technical pass). |
| B1-S6 | User-edges per Rule #10: audit lists actor roles per master but not concrete verb / inverse_verb tuples. Same defer pattern as CLIN-DEV. Surface to user before insert. |
| B1-S7 | Cross-domain payload rels: handoffs 899 / 902 already covered by existing rows 466 (`patient_appointments opens customer_cases`) and 467 (`patient_referrals opens customer_cases`); 900 / 903 target ERP-FIN with no `invoices` data_object and no pre-specified target; 901 (ITSM) is routed to Bucket 2 (B2-3) as semantically suspect. |
| B1-S8 | New outbound handoff for event 1022: audit candidates blocked on Phase 0 (TELEHEALTH). |
| B1-S10, B1-S11 | B10b FK PATCHes require modules to exist first (gated on B1-S1). |
| B1-S12 | Bulk `data_object_aliases`: audit does not pre-specify exact tuples; calls for "Author 2-3 aliases per master". |
| B1-S13 | Lifecycle states are new entity drafts. |
| B1-S14 | New module-level system skills (gated on B1-S1 modules). |
| B1-S15 | New `skill_tools` rows (gated on B1-S14). |
| B1-S16 | DELETE legacy skill 66 (gated on B1-S14). |
| B1-H1.1..1.7 | `handoff_processes` tagging: audit explicitly says "candidate; verify against `/processes` lookup at fix-load time", which is a judgment call. PCF row IDs are not pre-specified. |

### Verification

Re-read confirmed: all 7 trigger_events now carry the target enum value; all 6 inserted data_object_relationships rows are live with the expected source/target/verb/inverse/cardinality/kind/owner_side fields. No JWT-audience errors during the run.

## 2026-05-31, Audit

### Summary

- Current footprint: 6 masters (`patient_appointments`, `clinical_encounters`, `care_plans`, `patient_referrals`, `clinical_orders`, `clinical_notes`), 0 modules, 0 capabilities, 0 capability_domains, 0 domain_module_data_objects rows, 4 solutions (Epic, ServiceNow HLS, Salesforce Health Cloud, Innovaccer), 7 trigger_events (all `event_category` now populated), 5 outbound handoffs (4 NULL source module, 1 NULL source module + target module 38 set), 2 inbound handoffs (both NULL on both module FKs), 0 data_object_aliases, 0 data_object_lifecycle_states, 0 user-edge relationships, 6 intra-domain `data_object_relationships` rows (ids 1857-1862), 4 inbound/outbound cross-domain rows (466 `patient_appointments opens customer_cases`, 467 `patient_referrals opens customer_cases`, 665 `device_recalls affects patient_appointments`, 666 `sterilization_cycles impacts clinical_encounters`), 2 `business_function_domains` rows (Business Operations owner, Finance contributor), 1 legacy domain-level system skill (id 66 `hc-patient-system`, 8 skill_tools), 0 `handoff_processes` rows.
- This is a re-run of the Validate b1 structural audit after the 2026-05-31 Continuation applied B1-S9 (trigger_events.event_category backfill) and B1-S5 (6 intra-domain `data_object_relationships`). Every other deferred finding from the 2026-05-30 audit remains open.
- The structural state is unchanged in shape: M1 still hard-fails (zero modules), gating B1-S1, B1-S10, B1-S11, B1-S14, B1-S15, B1-S16. Every B2 (judgment) and B3 (Phase 0) item from the 2026-05-30 audit remains open.

### Structural pass (deltas vs 2026-05-30)

| Band | Status | Notes |
|---|---|---|
| A1 | pass | 7 metadata fields populated (cost_band $$$$, certification_required true, market 6000 / 2025). B2-4 still open (cost_band sanity). |
| A2 | fail | 0 capability_domains rows. Unchanged. |
| A3 | pass | 4 solutions linked, all coverage_level=primary. |
| A4 | fail | `catalog_tagline` and `catalog_description` both empty. Unchanged. Requires Rule #20 user-approved draft. |
| M1 | fail (hard) | 0 domain_modules rows. Gates everything downstream. |
| M2, M4, M5, M6 | vacuous fail | Cannot evaluate without modules. |
| M7 | vacuous pass | 0 DMDO rows; nothing to evaluate. |
| M8 | vacuous fail | No modules to evaluate. |
| B1 | pass | 6 master rows on legacy `domain_data_objects`. |
| B2 | pass | All 6 masters have `singular_label` + `plural_label`. |
| B3 | pass | All 6 masters use prefixed forms; no bare-word claims. |
| B4 | fail | All 6 masters carry `has_personal_content=false` / `has_submit_lock=false` / `has_single_approver=false`. PHI masters; per the 2026-05-30 audit recommendation, all 6 should set `has_personal_content=true`; `clinical_notes` + `clinical_orders` get `has_submit_lock=true`; `clinical_notes` gets `has_single_approver=true`. Unchanged. |
| B5 | vacuous pass | 0 embedded_master rows. |
| B6 | pass (newly) | 6 intra-domain edges loaded 2026-05-31 (ids 1857-1862). All 6 masters now participate. |
| B7 | fail | 0 user edges between any HC-PATIENT master and `users` (id 748). Unchanged. |
| B8 | partial | Of the 5 outbound handoffs: 899 (no_show -> CSM) covered by row 466 (`patient_appointments opens customer_cases`); 902 (referral.created -> CSM) covered by row 467 (`patient_referrals opens customer_cases`). Handoffs 900 (encounter.completed -> ERP-FIN), 901 (order.placed -> ITSM service_incidents), and 903 (note.signed -> ERP-FIN) still have no payload-target relationship row. Handoff 901 is semantically suspect (B2-3). |
| B9 | partial fail | All 7 trigger_events now carry valid `event_category` (post-2026-05-31 backfill). Event 1022 (`patient_appointment.scheduled`) still has zero handoffs rows; the publish leg is orphaned. |
| B9b | n/a | Single module count (0); skipped. |
| B10b | fail | All 5 outbound rows have `source_domain_module_id=null`; 4 of 5 also have `target_domain_module_id=null` (handoff 901 has target=38 set). Both inbound rows (896, 897) have NULL on both FKs (the source NULL is CLIN-DEV's responsibility per report-only). Cannot cure without M1. |
| B11 | fail | 0 aliases. Unchanged. |
| B12 | fail | 0 lifecycle_states. Unchanged. |
| C1 | pass | Business Operations owner + Finance contributor. B2-2 still open (clinical ownership semantic). |
| C2 | vacuous | No capabilities. |
| D | n/a until M1 + content lands. |
| E1-E5 | vacuous | Zero modules blocks role authoring. |
| F1 | will fail post-M1 | Legacy skill id 66 (`hc-patient-system`, `domain_module_id=null`). Retire once module-level skills ship. |
| F2-F5 | vacuous | No modules. |
| F7 | fail | Skill 66 links `send_sms` (`coverage_tier=external`) without workflow-specific justification; should be `notify_person` per the abstraction default. |
| H1 | fail | 7 cross-domain handoffs, 0 `handoff_processes` rows. Unchanged. |

### Bucket 1, In-scope confirmed gaps

The 2026-05-30 audit's Bucket 1 inventory still applies. B1-S5 and B1-S9 closed; B1-S1 through B1-S4, B1-S6 through B1-S8, B1-S10 through B1-S16, and B1-H1.1 through B1-H1.7 remain open in the exact shapes the prior audit specified. State.yaml carries them as b1a (or b1b when blocked).

### Bucket 2, Surface-for-user (judgment calls)

Unchanged from 2026-05-30. B2-1 through B2-7 remain open. B2-1 (module split) is the critical gate; without a user decision, B1-S1 + every dependent B1 item cannot proceed.

### Bucket 3, Phase 0 pending (speculative)

Unchanged from 2026-05-30. B3-E1 through B3-E15 (15 entity candidates), B3-M1 and B3-M2 (modularization), B3-R1 through B3-R3 (regulations).

### Cross-bucket dependencies

Unchanged from 2026-05-30. Critical gates: B2-1 -> B1-S1, B1-S10, B1-S11, B1-S14, B1-S15, B1-S16. B2-5 (`patients` master) -> most of Bucket 3 entity candidates. Bucket 3 EHR + HC-RCM + HC-PAYER + TELEHEALTH + HC-PHARM-MGMT (queued in `audits/_missing-domains.md`) gate B2-3, B2-5, B2-6 vetted-route resolution.

### Per-bucket prompts

- **Bucket 1:** "B1-S5 and B1-S9 are now closed (loaded 2026-05-31). Fix the rest now? Reply 'all', 'just B2-1 + B1-S1 first as the structural gate', or 'skip'. B1-S3 still requires user-approved wording per Rule #20."
- **Bucket 2:** "B2-1 through B2-7 still pending. B2-1 is the gate. For B2-3 / B2-6, name 'vetted' or 'eyeball' to align with the Bucket 3 vendor-research direction."
- **Bucket 3:** "Vet via Phase 0 research, or eyeball-mode? Phase 0 scope unchanged from 2026-05-30."

### Report-only follow-ups (owed by other domains)

Unchanged from 2026-05-30:
- CSM B8 owes inbound on `customer_cases` from HC-PATIENT (handoffs 899, 902).
- ERP-FIN B10b inbound module attribution on handoffs 900, 903 (once HC-PATIENT modularizes).
- CLIN-DEV B10b outbound module attribution on handoffs 896, 897.
- CSM B10b inbound module attribution on handoffs 899, 902 (once HC-PATIENT modularizes).
- ITSM: handoff 901's source module attribution is HC-PATIENT's (B1-S10); semantic correctness (B2-3) is a joint concern.

### JWT-audience errors

None during this audit pass.

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

## 2026-06-07 - Audit (state-driven execute, bulk batch)

### Summary

State-driven Validate execute pass over the open items in `audits/HC-PATIENT/state.yaml` (NOT a fresh from-scratch audit). Domain id 45 confirmed live (domain_code HC-PATIENT, "Healthcare Patient Operations"). Owner function confirmed live: business_function_domains rows 255 (owner = Business Operations, fn 34) + 256 (contributor = Finance, fn 4), so C1 already satisfied (no INSERT owed; the owner-semantic is the open B2-2 judgment call). The snapshot was stale on H1: live read showed 4 of the candidate `handoff_processes` rows already loaded (899 -> process 196, 900 -> 302, 902 -> 196, 903 -> 302, all proposal_source=agent_curated, role=implements), so H1 is now largely closed. Domain remains UNBUILT (0 domain_modules, 0 capability_domains confirmed live), so the build and every module-gated item stay blocked on B2-1.

Loader: `.tmp_deploy/fix_hc_patient_state_driven_2026_06_07.ts`, run from project root via `bun run`. Idempotent (read-live-then-insert-missing, never overwrite a non-empty value). No JWT-audience errors.

### Executed (additive/corrective, record_status=new where applicable)

- **B13 entity_type (6 PATCH).** All 6 masters were `entity_type='unclassified'` (audit failure per Rule #12). PATCHed 617-622 to `operational_workflow` (each description carries an explicit multi-state status workflow; deterministic classification). This also makes B12 lifecycle states required.
- **A4 Catalog UX (2 fields).** `domains.catalog_tagline` and `domains.catalog_description` on domain 45 were both empty. Authored buyer-voice copy (workflow + value, HIPAA framing allowed per Rule #18, no vendor names, no em-dash, American English) and wrote both. Idempotent guard would skip a non-empty value.
- **B11 aliases (19 INSERT).** Zero aliases existed for the 6 masters. Inserted generic cross-vendor / cross-industry synonyms (`alias_type='synonym'`, no industry_id available, record_status omitted -> defaulted to new): patient_appointments (Visit, Appointment Slot, Patient Visit Booking); clinical_encounters (Encounter, Episode of Care, Patient Visit Event); care_plans (Treatment Plan, Plan of Care, Care Pathway); patient_referrals (Consult, Specialist Referral, Consultation Request); clinical_orders (Order, CPOE Order, Provider Order Entry); clinical_notes (Chart Note, Progress Note, SOAP Note, Encounter Note).
- **B12 lifecycle states (32 INSERT).** Zero lifecycle rows existed. Loaded the audit's pre-specified state shapes for all 6 masters with `domain_module_id=null` (no modules yet; PATCH onto the realizing module at build time). M4 shape verified clean per master: exactly one `is_initial=true`, at least one `is_terminal=true`, unique monotonic `state_order`. `requires_permission=true` set on the workflow gates (appointment cancelled; encounter signed + locked; care_plan withdrawn; order cancelled + discontinued; note signed + addended + amended). record_status defaulted to new.

### Surfaced (returned to user; not written)

- **B1A-B7-USER-EDGES.** 6 `users`-edge `data_object_relationships` (Rule #10) not authored: the audit lists actor roles per master but not concrete verb / inverse_verb tuples, so the row shapes are not fully specified. Needs user-reviewed tuples before insert.
- **B1A-B4-PATTERN-FLAGS.** Recommended deterministic flips surfaced (overwrite of an existing boolean value, not an empty fill): all 6 masters `has_personal_content=true`; clinical_orders (621) + clinical_notes (622) `has_submit_lock=true`; clinical_notes (622) `has_single_approver=true`. Consistent with the 2026-05-31 pass deferring B1-S4.
- **B2-1 through B2-7.** All seven judgment calls remain open; B2-1 (module split) is the critical gate.
- **B1A-B9-ORPHAN-EVENT.** Event 1022 (patient_appointment.scheduled) still has zero handoffs (confirmed live). Fix = author a target handoff (blocked on Phase 0 TELEHEALTH/EHR) OR DELETE the event row (destructive, needs sign-off).
- **B1A-B8-CROSS-DOMAIN-RELS.** Handoffs 900/903 payload-target rows still need a named ERP-FIN / HC-RCM target master (blocked); 901 deferred to B2-3.

### Left (untouched)

- **Module-gated b1a:** B1A-BUILD, B1A-B10b-SOURCE-MODULES, B1A-B10b-TARGET-MODULES blocked on B2-1 / the build. UNBUILT domain - not scaffolded; the cascade is left for the build pass.
- **RETIRED per the 2026-06-06 supersession:** former B1A-S1-MODULES (per-module system skills + skill_tools), B1A-F1-LEGACY-SKILL, B1A-F7-CHANNEL-ABSTRACTION reframed as a note (per-module skill grain + skill_tools dropped; one domain-grain system skill derived from domain_module_tools, handled inside B1A-BUILD).
- **H1 defers:** handoff 896 (device_recall.issued, consume-side - no clean cross-industry PCF; the clean recall PCF hits describe the issuer process), 897 (sterilization_cycle.failed, industry-specific), 901 (B2-3 suspect) deferred to Discover Pass 3.
- **b3 backlog:** 15 entity candidates (B3-E1..E15), 2 modularization candidates (B3-M1, B3-M2), 3 regulation candidates (B3-R1..R3) - all Phase 0 pending.

### Verification

Re-read live confirmed: all 6 masters `entity_type='operational_workflow'`; domain 45 both catalog fields non-empty; 19 aliases present (all record_status=new); 32 lifecycle states present with correct initial/terminal/gate flags and clean M4 shape. No JWT-audience errors during the run.

### UI links (tables written)

- https://tests.semantius.app/domain_map/data_objects
- https://tests.semantius.app/domain_map/domains
- https://tests.semantius.app/domain_map/data_object_aliases
- https://tests.semantius.app/domain_map/data_object_lifecycle_states
