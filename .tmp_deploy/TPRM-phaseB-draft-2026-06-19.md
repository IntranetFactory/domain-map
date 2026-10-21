# TPRM Phase B build draft (draft only, NOTHING loaded)

Date: 2026-06-19. Domain id 19 (TPRM), parent GRC (15). Source: a-TPRM.md answers (a1 = 5-module shape decided) plus the Phase 0 vendor surface at `.tmp_deploy/TPRM-phase0-2026-06-19.md`. This file is the build-on-approval plan referenced by the q-file. It LOADS NOTHING. The build proceeds only once the SRM/TPRM boundary cluster (q2-q5 in the q-file) is settled, because several ownership rows below are contingent on it (flagged CONTINGENT).

TPRM is UNBUILT today (verified live 2026-06-19): 0 `domain_modules`, 0 mastered `data_objects`, 0 `capability_domains`. This draft is the shape the build would author.

## Module shape (DECIDED, a1 = a)

Five `module_kind='full'` `domain_modules` rows. Rule #14 satisfied: 8 capabilities (>=3) mandates >=2 full modules; five proposed.

| # | domain_module_code | Purpose (one line) |
| --- | --- | --- |
| 1 | TPRM-ONBOARDING-INTAKE | Register the broad third party, scope engagements, classify criticality before diligence starts. |
| 2 | TPRM-DUE-DILIGENCE | Questionnaires, document collection, certification/attestation checks, the pre-contract go/no-go. |
| 3 | TPRM-CONTINUOUS-MONITORING | Re-assessment cadence, ingest external security ratings and breach signals, recompute internal score. |
| 4 | TPRM-REMEDIATION | Turn findings into tracked remediation that closes before renewal; risk acceptances with expiry. |
| 5 | TPRM-SUPPLY-CHAIN-RISK | Subcontractor / fourth-party visibility, concentration risk, the DORA register. |

## Masters mapped to modules (role + necessity + one-line purpose)

`necessity` per Rule #16: statute-prefixed / sector-bound masters ship `optional` (the module is the activation gate); workflow-universal masters ship `required`. CONSUMED rows are `consumer`/`embedded_master` and carry the SOLE-MASTER caveat (M7): TPRM never writes a `role='master'` row for them.

### Module 1: TPRM-ONBOARDING-INTAKE

| Entity | role | necessity | Purpose |
| --- | --- | --- | --- |
| `third_parties` | master | required | The broad third-party inventory record (the umbrella superset; suppliers are a consumed subtype). |
| `third_party_engagements` | master | required | The per-service, contract-scoped relationship instance. |
| `third_party_tiers` | master | required | Criticality classification driving cadence and required-control depth. |
| `third_party_contacts` | master | optional | Vendor-side respondents/owners (config-shape; small orgs inline). |
| `onboarding_requests` | master | required | Business-sponsor intake request that starts the lifecycle. |
| `offboarding_records` | master | optional | Termination / exit due diligence (not every program formalizes). |
| `critical_function_designations` | master | optional | DORA critical-or-important-function flag (sector-bound: DORA). |
| `suppliers` | consumer | optional | CONSUMED from SRM (28). The procurement supplier identity; never re-mastered. CONTINGENT on q3. |
| `contracts` | consumer | optional | CONSUMED from CLM. TPRM gates on the contract; does not master it. CONTINGENT on q-CLM-exists. |

### Module 2: TPRM-DUE-DILIGENCE

| Entity | role | necessity | Purpose |
| --- | --- | --- | --- |
| `third_party_assessments` | master | required | The deep, engagement/contract-gated diligence record. DISTINCT from SRM `supplier_risk_assessments` and GRC `risk_assessments`. CONTINGENT on q2/q4. |
| `due_diligence_questionnaires` | master | required | Template library (SIG / CAIQ / VSAQ instances). |
| `assessment_responses` | master | required | Per-question answers plus evidence attachments. |
| `assessment_campaigns` | master | optional | Periodic re-assessment cadence batch (some orgs run ad hoc). |
| `vendor_documents` | master | required | Collected SOC2 / ISO / cert artifacts gathered during diligence. |
| `business_associate_agreements` | master | optional | HIPAA (vendors handling PHI); sector-bound. |
| `data_processing_agreements` | master | optional | GDPR Art. 28 processor agreements; jurisdiction-bound. |
| `attestation_records` | master | optional | SOC2 / ISO report receipt + expiry. Distinct from GRC `policy_attestations`. |
| `pci_vendor_compliance_records` | master | optional | PCI-DSS service-provider AOC tracking; sector-bound. |
| `regulatory_oversight_records` | master | optional | OCC/FFIEC/FRB interagency third-party guidance; sector-bound (US FI). |
| `compliance_controls` | consumer | optional | CONSUMED from GRC (15). |
| `control_assessments` | consumer | optional | CONSUMED from GRC (15). |
| `risk_categories` | consumer | optional | CONSUMED from GRC taxonomy where possible (local config master only if it must diverge; see Phase 0 open Q5). |

### Module 3: TPRM-CONTINUOUS-MONITORING

| Entity | role | necessity | Purpose |
| --- | --- | --- | --- |
| `third_party_risk_ratings` | master | required | Internal computed score per third party / engagement. |
| `security_ratings` | master | optional | Ingested external score (BitSight/SecurityScorecard/UpGuard are the source feeds). Snapshot master per Phase 0 Q3. |
| `monitoring_signals` | master | optional | Breach / sanctions / financial signals (named `monitoring_*` taken elsewhere; this is the TPRM-scoped junction). |

### Module 4: TPRM-REMEDIATION

| Entity | role | necessity | Purpose |
| --- | --- | --- | --- |
| `third_party_risk_findings` | master | required | Issue raised from assessment / monitoring. DISTINCT from GRC `compliance_risks`. CONTINGENT on q6. |
| `third_party_remediation_plans` | master | required | Vendor-scoped remediation, time-boxed to renewal / next cycle (GRC `remediation_plans` is taken; prefix required). |
| `risk_acceptances` | master | optional | Exception / accept decision with expiry (not every program formalizes acceptances). |
| `audit_findings` | consumer | optional | CONSUMED from AUDIT (16) on handoff 258 receipt, tied to remediation. CONTINGENT on q7 (a7 = a, deferred build step). |

### Module 5: TPRM-SUPPLY-CHAIN-RISK

| Entity | role | necessity | Purpose |
| --- | --- | --- | --- |
| `fourth_party_relationships` | master | optional | Nth-party subcontractor edges (not universal; SR feeds + Archer/UpGuard model it). |
| `concentration_risk_views` | master | optional | Concentration across shared fourth parties (derived/common). |
| `ict_provider_registers` | master | optional | DORA Art. 28(3) Register of Information; sector-bound (EU FI). a8 = a, deferred build step. |
| `subcontracting_chains` | master | optional | DORA RTS 2025/532 nth-party subcontracting; sector-bound. |
| `supply_chain_attestations` | master | optional | NIST 800-161 / CMMC supply-chain; sector-bound. |
| `suppliers` | consumer | optional | CONSUMED from SRM for chain roots. CONTINGENT on q3. |

## Master count

28 TPRM-mastered entities (excludes the 4 distinct CONSUMED cross-domain entities: `suppliers`, `contracts`, `compliance_controls`/`control_assessments`, `risk_categories`, `audit_findings`). Matches the Phase 0 count.

## Ownership rows CONTINGENT on the boundary decision (do NOT author until q2-q5 answered)

These rows change shape depending on the SRM/TPRM boundary answers:

- **`supplier_risk_assessments` (id 730, SRM-mastered).** a4 leaning = move mastery to TPRM. NOT in this draft as a TPRM master: moving it would undo part of the just-built SRM-RISK-COMPLIANCE. The recommended boundary call is that TPRM masters its OWN `third_party_assessments` (above) and SRM keeps `supplier_risk_assessments`. If the user instead confirms a4 (move mastery), the `third_party_assessments` master is replaced by a mastery-move of 730 with a rename. CONTINGENT.
- **`third_party_assessments` vs GRC `risk_assessments` (q2).** Draft assumes a (own distinct master). If b/c, this master collapses into a consumed GRC row.
- **`third_parties` vs SRM `suppliers` (q3).** Draft assumes b (own broad master, consume suppliers). If a, `third_parties` is dropped and TPRM consumes `suppliers` as its inventory.
- **`third_party_risk_findings` vs GRC `compliance_risks` (q6).** Draft assumes a (own master). If b, collapses into a consumed GRC row.

## Capabilities (8; Rule #14 -> >=2 modules)

| Capability | Realizing module |
| --- | --- |
| Third-party onboarding and intake | TPRM-ONBOARDING-INTAKE |
| Risk tiering and criticality classification | TPRM-ONBOARDING-INTAKE |
| Due-diligence questionnaire assessment | TPRM-DUE-DILIGENCE |
| Pre-contract go/no-go risk decisioning | TPRM-DUE-DILIGENCE |
| Continuous third-party risk monitoring | TPRM-CONTINUOUS-MONITORING |
| Security-ratings ingestion | TPRM-CONTINUOUS-MONITORING |
| Finding remediation and issue tracking | TPRM-REMEDIATION |
| Fourth-party and supply-chain risk mapping | TPRM-SUPPLY-CHAIN-RISK |

## Deferred build steps recorded from a-file (a7 / a8 = option a, deferred until a module exists)

- a7: TPRM consumes `audit_findings` (role=consumer, necessity=optional) once TPRM-REMEDIATION exists; PATCH handoff 258 `target_domain_module_id` to it (B1B-B10b-258).
- a8: author DORA records (`ict_provider_registers`, `subcontracting_chains`, `critical_function_designations`) in TPRM-SUPPLY-CHAIN-RISK / TPRM-ONBOARDING-INTAKE during the build (B2-8 = a).
- B1B-B10b-278: PATCH handoff 278 `target_domain_module_id` to TPRM-CONTINUOUS-MONITORING.

## What is NOT in this draft (and why)

- No `record_status` decisions (Rule #1, out of band).
- No B2-H1 DELETE (handoff_processes id 705): destructive, awaiting explicit yes/no in the q-file.
- Nothing is loaded. This is a plan; the build runs on the user's approval of the q-file boundary cluster.
