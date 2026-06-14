# INSIDER-RISK audit history

## 2026-06-14 - Build

Promoted the queued candidate **Insider Risk Management** (queue code `IRM`, mention count 2 from the DLP and OBS audits) to a new domain after Phase 0 vendor-surface research.

### Code-collision resolution (IRM is overloaded)

`IRM` most commonly means **Integrated Risk Management** (the ServiceNow IRM / GRC rebrand) in enterprise software. Live `/domains` check: no domain is literally coded `IRM`, but domain `GRC` (id 15, "Governance, Risk and Compliance") already carries the description "Integrated risk management spanning policy, controls, risk assessment, and compliance evidence." The Integrated-Risk-Management meaning is therefore already occupied conceptually by GRC, so reusing `IRM` for *Insider* Risk Management would collide semantically. Chosen non-colliding code: **`INSIDER-RISK`**. System skill named `insider-risk-system` accordingly. Phase 0 report: `.tmp_deploy/IRM-phase0-2026-06-14.md` (uses IRM in the filename per the brief; chosen code noted inside).

### Triage verdict: promote-as-domain

Point-solution-market test PASSES: at least three INDEPENDENT vendors run insider risk / insider threat as their FLAGSHIP product (DTEX InTERCEPT, Teramind, Proofpoint Insider Threat Management), plus Code42/Mimecast Incydr (data-exfil / departing-user focus) and Microsoft Purview Insider Risk Management (suite). Gartner publishes a dedicated Market Guide for Insider Risk Management Solutions (March 12, 2025) and a Peer Insights market. M&A noted: Code42 acquired by Mimecast in 2024 (now Mimecast Incydr); Forcepoint's insider/gov unit spun out as Everfox (2023); Proofpoint built ITM on the ObserveIT acquisition. Distinct from DLP (egress enforcement), DSPM (data at rest), and UEBA (generic anomaly scoring): insider risk is the human-centric case-and-investigation discipline that fuses those signals around the person.

### What was loaded (all `record_status='new'`, zero `notes`)

- **Domain** `INSIDER-RISK` (id 178) with all 7 metadata fields: crud_percentage 55, business_logic populated (ML scoring / anomaly detection / lineage beyond JsonLogic), min_org_size `40 l <10000`, cost_band `$$$`, certification_required false, usa_market_size_usd_m 1500 (2025). Catalog tagline + description authored in buyer voice (Rule #20).
- **7 capabilities**: user behavior risk scoring, anomalous data movement detection, risk indicator correlation, insider threat investigation, evidence collection for HR/Legal, file lineage tracking, departing-user / exit risk monitoring. All linked via `capability_domains` and `domain_module_capabilities`.
- **2 full modules** (Rule #14, 7 capabilities => >=2 modules): `INSIDER-RISK-MONITORING-DETECTION` (362) and `INSIDER-RISK-INVESTIGATION-CASE-MGMT` (363), each with catalog UX copy.
- **Vendors**: created DTEX Systems, Teramind, Mimecast; reused Microsoft (25), Forcepoint (545), Proofpoint (547), Code42 (550), Cyberhaven (552). The Code42->Mimecast acquisition fact lives in the Incydr `solutions.description` (Rule #15 keeps it out of `notes`).
- **7 solutions** (DTEX InTERCEPT, Mimecast Incydr, Proofpoint ITM, Microsoft Purview Insider Risk Management, Teramind, Forcepoint Risk-Adaptive Protection, Cyberhaven), all `coverage_level='primary'` via `solution_domains`.
- **7 masters** (Phase B): `user_risk_scores` (1123, computed), `monitored_activities` (1124, operational_record, has_personal_content), `risk_indicators` (1125, catalog), `insider_risk_alerts` (1126, operational_workflow), `insider_risk_cases` (1127, operational_workflow, has_personal_content + has_single_approver), `investigation_evidence` (1128, operational_record, has_personal_content + has_submit_lock), `exit_risk_assessments` (1129, operational_workflow). Single-master integrity verified: exactly one master row per data_object catalog-wide.
- **14 DMDO rows**: 7 master rows on the two modules + consumer rows for `users` (748), HCM `employees` (31), DLP `dlp_incidents` (330) and `dlp_user_activity_logs` (335), DSPM `data_risk_scores` (342). Consumed signals are `necessity=optional` (graceful degradation per Rule #16); `exit_risk_assessments` master is optional (departing-user feature not every deployment runs).
- **19 `data_object_relationships`**: intra-domain workflow edges, `users` edges (Rule #10: monitored subject, investigator, disposition approver, evidence collector, exit reviewer), and cross-domain payload edges to DLP/DSPM signals and HCM employees.
- **9 `data_object_aliases`** (insider threat case, insider investigation, risk alert, behavioral risk score, user activity event, detection rule, indicator of compromise, evidence package, departing-user risk assessment).
- **17 lifecycle states** on the 3 operational_workflow masters (`insider_risk_alerts`, `insider_risk_cases`, `exit_risk_assessments`) with `requires_permission` gates on the meaningful transitions; the case escalation override verb is `escalate_case`.
- **6 `trigger_events`** (alert escalated, score threshold breached, case escalated to HR/Legal, case substantiated, exit assessment flagged/initiated) and **4 outbound handoffs**: case -> SECOPS (incident response), exit-flag -> HCM (offboarding), case-substantiated -> IGA (access revocation), score-breach -> DLP (risk-adaptive enforcement, targets DLP-ENFORCEMENT-RUNTIME 232).
- **Phase C**: `business_function_domains` Security (28) owner, Human Resources (3) contributor, Legal (7) consumer.
- **Phase S**: `insider-risk-system` (skill 465, skill_type=system, domain_id=178, domain_module_id=NULL). 12 tools authored (7 query, 4 mutate, 1 fetch for external endpoint telemetry) + reused `notify_person` (913), `notify_team` (914), `search_web` (56). 15 `domain_module_tools` rows; every tool carries `coverage_tier`.
- **Phase E**: 3 personas (Insider Risk Analyst, Insider Threat Investigator, Insider Risk Program Manager), 6 `role_modules` (>=2 per persona), 3 `process_raci` rows (Investigator=R, Manager=A, Analyst=C) anchored to PCF 8.3.5 "Develop and manage IT security, privacy, and data protection" (id 270).

### Open items surfaced to user (state.yaml)

- B2-S1: confirm distinct domain vs fold into DLP/DSPM (built as distinct).
- B2-S2: confirm the consume-not-master boundary against DLP/DSPM/UEBA/HCM.
- B2-S3: confirm the PCF anchor (8.3.5 L3 vs the narrower 8.7.6.7 L4).

### Notes on NULL handoff targets (gap, not a notes annotation per Rule #15)

Three of the four outbound handoffs carry NULL `target_domain_module_id`: case -> SECOPS (SECOPS has zero modules / unbuilt), exit-flag -> HCM, case-substantiated -> IGA (the specific consuming module on those domains was not resolved at build time). These backfill once the counterparty domains expose the relevant module grain. The DLP handoff correctly targets module 232.

### Loader

`.tmp_deploy/load_insider_risk_2026_06_14.ts` (idempotent, run from project root).
