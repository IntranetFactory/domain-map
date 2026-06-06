# SOAR audit history

## 2026-05-30 -- Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 0 `domain_modules` (full or starter), 0 `capability_domains` rows, 0 `domain_data_objects` rows (leadership-tier exception per B1 applies), 0 `domain_regulations` rows, 0 outbound `handoffs`, 0 inbound `handoffs`, 0 `trigger_events`, 0 `data_object_aliases`, 0 cross-domain `data_object_relationships`, 0 `skills`, 0 `roles` linked to the owning function (Security Operations Center, function id 64), 0 `domain_aliases`, 5 `solutions` linked via `solution_domains` (4 primary + 1 secondary, all `solution_kind='standard_solution'`), 1 `business_function_domains` row (owner = Security Operations Center). The `domains` row itself (id 12, parent_domain_id = 11 SECOPS) carries all seven Rule #8 metadata fields populated (`crud_percentage=75`, `business_logic` present, `min_org_size='40 l <10000'`, `cost_band='$$$'`, `certification_required=false`, `usa_market_size_usd_m=700`, `market_size_source_year=2025`), but both Rule #20 catalog UX fields (`catalog_tagline`, `catalog_description`) are empty strings.
- **Vendor-surface basis:** Splunk SOAR (formerly Phantom), Palo Alto Networks Cortex XSOAR (formerly Demisto), Tines, Torq, Swimlane Turbine, ServiceNow Security Incident Response, ThreatConnect Platform. Splunk SOAR, Cortex XSOAR, Tines, Torq, and Swimlane are the pure-play SOAR / security-hyperautomation leaders. ServiceNow SIR is the suite-aligned incumbent (SOAR bundled into a larger ITSM/SecOps platform). ThreatConnect is the TIP-aligned hybrid (SOAR features layered on a threat-intel substrate). No compliance specialist is included: SOAR is not a regulated market in its own right; playbook-driven access to regulated systems inherits the consumed system's regime (HIPAA / SOX / PCI / GDPR breach-notification clocks) rather than constituting a separate regulator. SEC 8-K cyber-incident disclosure (effective 2023) and state breach-notification statutes do impose substrate obligations on the incident-response leg that the audit recommends recording on the `domains` row.
- **Bucket 1 (in-scope, agent fixable):** 13 items.
- **Bucket 2 (surface-for-user, judgment):** 3 items.
- **Bucket 3 (Phase 0 pending, speculative):** 0 items (no adjacent-market candidates surfaced; SIEM, XDR, EDR are already queued in `audits/_missing-domains.md`, and other plausible adjacencies either already exist as catalog domains (SECOPS, THREAT-INTEL, VULN-MGMT) or fold into SOAR itself (MDR is a service category, IRP / security case management is bundled into every flagship SOAR product)).
- **Candidates queued in `_missing-domains.md`:** 0. Every plausible adjacent market is already either a catalog domain or an existing queue entry; SOAR surfaces no novel candidate.

**Domain Semantius score (strict):** uncomputable. F2 / F3 cannot be evaluated because zero modules exist (M1 hard-fail) and zero `skills` rows exist for the domain. F5 is therefore vacuously failed (no module to score). The score becomes computable only after Phase A authors `domain_modules` and Phase S authors the per-module system skills.

**Neighbor discovery** (auto-derived from `handoffs` + cross-domain DMDO + cross-domain `data_object_relationships`, ranked by edge weight):

| Neighbor | Out | In | Cross-rels | DMDO | Weight | Pass shape |
|---|---|---|---|---|---|---|
| (none) | 0 | 0 | 0 | 0 | 0 | -- |

SOAR has zero loaded edges in any direction. The catalog catches the parent SECOPS as the inbound recipient of DLP / Data-Security incident events (5 inbound handoffs to SECOPS id 11 on `dlp_incident.*`, `data_exfiltration_attempt.initiated`, `sensitive_data_incident.*`), but none of those handoffs are wired to SOAR even though every SOAR playbook product is the canonical subscriber for these events. The absence of edges is itself a finding (see Bucket 1 STRUCTURAL B1-S5 and Bucket 2 B2-S2). Pairwise reconciliation (Pass 4) is therefore vacuous on this audit; once Phase A authors modules and Phase B authors the expected handoffs, the future re-audit will have heavy boundaries with SECOPS (parent), THREAT-INTEL (intel ingestion + IOC fan-out), VULN-MGMT (auto-remediation orchestration), DLP and the sensitive-data domain (incident handoff), AUDIT (forensic-trail logging), and ITSM (cross-tower incident escalation).

Structural pass bands roll up as: **A1 passes** (all seven Rule #8 fields populated), **A2 hard-fail** (zero `capability_domains` rows), **A3 passes** (5 solutions linked with `coverage_level` set on every row, ≥1 primary), **A4 hard-fail** (empty `catalog_tagline` and `catalog_description`), **M1 hard-fail** (zero `domain_modules` rows), **M2 / M4 / M6 vacuously fail** (no modules ⇒ cascades), **M5 vacuously passes** (no lifecycle states to check), **M7 vacuously passes** (no DMDO rows to check), **B1 passes by leadership-tier exception** (SOAR is in the named leadership-tier list in B1; zero masters acceptable), **B2 / B3 / B4 / B5 vacuously pass** (no masters), **B6 / B7 vacuously pass** (no masters), **B8 vacuously passes** (no masters), **B9 hard-fail** (zero `trigger_events` despite SOAR being the canonical publisher of playbook-execution events: `security_playbook.executed`, `security_incident.contained`, `security_incident.eradicated`, `security_incident.closed`, `automation_run.completed`, `automation_run.failed` are all market-shaped events SOAR vendors fire), **B9b vacuously passes** (no modules ⇒ no cross-module pairs), **B10 vacuously passes** (no inbound to attribute), **B10b vacuously passes** (no handoffs at all to backfill), **B11 hard-fail** (zero `data_object_aliases` and zero `domain_aliases`; SOAR has obvious synonyms `security orchestration`, `security automation`, `playbook automation`, `SOC automation`, `hyperautomation for SOC`), **B12 vacuously passes** (no masters with workflow), **C1 passes** (owner = Security Operations Center; arguably needs a CISO / Risk & Compliance contributor too -- see Bucket 2 B2-S1), **C2 vacuously passes** (no capabilities ⇒ no overrides), **D1 not run** (no UI changes from this audit), **E1 vacuously passes** (no modules ⇒ 2-module floor blocks role authoring), **E2-E6 vacuously pass**, **F1 / F2 / F3 / F4 / F5 hard-fail** (no modules ⇒ no per-module system skill to author against; F5 uncomputable as noted above), **F7 vacuously passes** (no channel primitives linked), **H1 vacuously passes** (zero cross-domain handoffs to tag; volume target is 0).

The headline of this audit: **SOAR is a placeholder domain.** The `domains` row exists with full Rule #8 metadata and a 5-solution roster, but zero Phase A (capabilities + modules), zero Phase B (data_objects + handoffs + trigger events + lifecycle states + aliases), zero Phase C functional overrides, zero Phase E roles, and zero Phase S system skills have been authored. Most failures cascade from M1; once Phase A authors capabilities + modules + `domain_module_data_objects` for the canonical SOAR masters (security_playbooks, security_incidents, security_alerts, automation_runs, security_cases, indicator_of_compromise_records, integration_connectors), the downstream cures (B / E / F / H) become individual fixes against the new module surface. The audit recommends Phase A as the gate, then re-running, with Phase 0 vendor research (formal subagent pass against the Splunk SOAR / Cortex XSOAR / Tines / Torq / Swimlane surface matrix) BEFORE Phase A authoring because the vendor surface is diverse enough (alert-centric Splunk vs. playbook-centric XSOAR vs. workflow-DAG Tines / Torq) that the agent's eyeball-mode entity list will mis-shape the modularization without it.

### Bucket 1 -- In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 + A2 (hard fail)** | Zero `domain_modules` rows AND zero `capability_domains` rows for SOAR. Per Rule #14, every `domains` row MUST have ≥1 `module_kind='full'` `domain_modules` row; per A2, ≥3 capabilities (typical 5-8). Proposed Phase-A module-set shape (subject to Phase 0 vendor verification, see B2-S3): (a) `SOAR-PLAYBOOK-AUTHORING` (security_playbooks, playbook_steps, playbook_versions, integration_connectors -- design-time surface), (b) `SOAR-AUTOMATION-RUNTIME` (automation_runs, automation_run_steps, automation_artifacts, automation_run_logs -- orchestrator surface), (c) `SOAR-CASE-MGMT` (security_cases, security_incidents, case_tasks, case_evidence, case_timelines, case_notes -- analyst surface). Three modules satisfies the M2 ≥2 floor with room. Proposed capabilities (5-8): `PLAYBOOK-DESIGN`, `INTEGRATION-CONNECTORS`, `AUTOMATION-EXEC-ORCH`, `CASE-MGMT-SEC`, `INCIDENT-RESPONSE-WORKFLOW`, `IOC-ENRICHMENT`, `RESPONSE-METRICS-MTTR`, `SOC-PLAYBOOK-LIBRARY`. | Author Phase A: 5-8 `capabilities` rows + `capability_domains` links + 3 `domain_modules` (full) + `domain_module_capabilities` + Phase-B `domain_module_data_objects` master rows for the ~12-15 canonical SOAR entities (gated on Phase 0 verification). Gate every other Bucket 1 fix on this one. |
| B1-S2 | **A4 (hard fail) -- Rule #20 catalog UX fields** | `catalog_tagline` and `catalog_description` are both empty strings. Per Rule #20, draft both in buyer voice (workflow + value), surface to user for review BEFORE writing. | Draft a one-sentence tagline plus a 1-3 paragraph description (workflow + value, no vendor names per Rule #18, no analyst voice). Surface draft, wait for approval, then PATCH. |
| B1-S3 | **B11 (hard fail) -- `domain_aliases`** | Zero `domain_aliases` rows for SOAR. Per Rule #20, `domain_aliases` feeds both the catalog search index and the per-domain skill's runtime trigger phrases. Universal synonyms / acronyms / vendor-shape alternatives: `security orchestration`, `security automation`, `playbook automation`, `SOC automation`, `hyperautomation for SOC`, `security orchestration automation and response`, `incident response automation`, `playbook orchestration`. | Draft 6-8 `domain_aliases` rows; load via the standard alias pattern. |
| B1-S4 | **B9 (hard fail)** | Zero `trigger_events` rows for SOAR. Every flagship vendor publishes a market-shaped event vocabulary: `security_playbook.executed`, `security_playbook.failed`, `automation_run.started`, `automation_run.completed`, `automation_run.failed`, `automation_run.cancelled`, `security_incident.created`, `security_incident.contained`, `security_incident.eradicated`, `security_incident.closed`, `security_incident.escalated`, `security_case.opened`, `security_case.assigned`, `security_case.closed`, `indicator_of_compromise.enriched`, `integration_connector.connected`, `integration_connector.disconnected`. Each event needs a published `data_object_id` and `event_category` per Rule #13's allowed values (`lifecycle`, `state_change`, `threshold`, `signal`). | Gated on B1-S1 (events need the underlying `data_objects` rows). After Phase A authors masters, draft ~15-20 `trigger_events` rows with explicit `event_category`. |
| B1-S5 | **B9 (hard fail) -- missing inbound handoff edges from already-loaded events** | Five inbound events from DLP (139) and Data Security (140) are loaded against the parent SECOPS (id 11) but not against SOAR -- `dlp_incident.violation_detected` (event 259, handoff 280), `dlp_incident.escalated` (event 263, handoff 282), `data_exfiltration_attempt.initiated` (event 264, handoff 284), `sensitive_data_incident.detected` (event 269, handoff 287), `sensitive_data_incident.resolved` (event 270, handoff 290). In practice every SOAR playbook product is the canonical subscriber for these events (DLP / data-loss event ⇒ SOAR playbook ⇒ automated containment). Once SOAR has modules, these inbound handoffs (or fan-out clones of them) should target SOAR-CASE-MGMT and / or SOAR-AUTOMATION-RUNTIME, not stop at SECOPS. **Note the asymmetry:** the existing handoffs targeting SECOPS are NOT in-scope for SOAR's audit to fix (those rows are owed by DLP and the Data-Security domain on their B9 / B10b passes). What IS in-scope for this audit is recording, after Phase A lands, that SOAR-CASE-MGMT / SOAR-AUTOMATION-RUNTIME ought to receive these payloads via cloned handoff rows (each with SOAR as the additional subscriber). | Gated on B1-S1. After modules land, draft 5 cloned-fan-out `handoffs` rows pointing into SOAR's case-management / automation-runtime module. (Strictly the asymmetric write is on whichever side publishes -- DLP and Data-Security -- so the fan-out adds rows on those publishers' side, with SOAR as a new target. Loading these from SOAR's audit treats the additional subscriber as the inbound consumer DMDO + a new handoff row; the publisher domain's row is what gets created.) Surface to user. |
| B1-S6 | **F1 / F2 / F3 / F4 / F5 (hard fail) -- per-module system skills + tools** | Zero `skills` rows exist for SOAR. Rule #17 requires exactly one `skill_type='system'` skill per `domain_modules` row, each with ≥1 `skill_tools` row. With zero modules this cascades, but the Phase-S floor is non-optional: once Phase A lands, every module needs its `<module_code_lower>_agent` skill plus tools. Proposed Phase-S floor (per the three proposed modules): SOAR-PLAYBOOK-AUTHORING needs `query_security_playbooks`, `create_security_playbook`, `update_security_playbook`, `query_integration_connectors`, `create_integration_connector` (query / mutate tools); SOAR-AUTOMATION-RUNTIME needs `query_automation_runs`, `cancel_automation_run`, `retry_automation_run`, `receive_external_event` (inbound for alert / webhook triggers); SOAR-CASE-MGMT needs `query_security_cases`, `create_security_case`, `assign_security_case`, `close_security_case`, plus `notify_person` / `notify_team` abstractions (per the channel-vs-capability authoring rule). Workflow-gate tools (containment / eradication state transitions) get materialized once B12 lifecycle states are authored. Until that load lands, F5 (Semantius score) remains uncomputable. | Gated on B1-S1 + B1-S7. Author per-module system skills (skill_name = `soar_playbook_authoring_agent`, `soar_automation_runtime_agent`, `soar_case_mgmt_agent`) plus ~15-20 `tools` rows + corresponding `skill_tools` links. Default to `notify_person` / `notify_team` for SOC analyst notifications per the abstraction rule. |
| B1-S7 | **B12 (hard fail) -- lifecycle states on workflow-bearing masters** | Once Phase A + Phase B land the seven canonical SOAR masters, four of them carry workflow that the system skill's permission materialization depends on: `security_playbooks` (`draft -> in_review -> approved -> active -> retired`), `automation_runs` (`queued -> running -> completed | failed | cancelled | timed_out`), `security_incidents` (`new -> investigating -> contained -> eradicated -> recovered -> closed`), `security_cases` (`open -> assigned -> in_progress -> on_hold -> resolved -> closed`). `integration_connectors` is closer to config-shape (`registered -> active -> degraded -> disabled`) but probably warrants states. `automation_run_logs` and `case_evidence` are append-only and exempt under Rule #12. | Gated on B1-S1 + B1-S6. Draft lifecycle states + `requires_permission` flags + `permission_verb_override` (`contained -> contain_security_incident`, `eradicated -> eradicate_security_incident`, `closed -> close_security_case`) + `domain_module_id` per M5. |
| B1-S8 | **APQC TAGGING (H1 -- volume target zero today)** | Zero cross-domain handoffs to tag yet. Once B1-S5 + post-Phase-A handoffs land (estimate: 8-12 cross-domain handoffs at first re-audit), the H1 volume target becomes 4-10 NEW `agent_curated` rows. Confident PCF anchors already identified for SOAR's market shape: process 1182 `Monitor/analyze network intrusion detection data and resolve threats` (external_id 20742, L4) -- canonical match for SIEM / EDR / XDR alerts feeding SOAR; process 1164 `Analyze IT security threat impact` (external_id 20723, L4) -- match for incident-impact triage handoffs; process 1170 `Conduct IT risk and threat assessments` (external_id 20728, L4) -- match for inbound threat-intel feeds from THREAT-INTEL; process 1299 `Triage IT service delivery incidents` (external_id 20903, L4) -- match for SOAR-to-ITSM major-incident escalation; process 199 `Report incidents and risks to regulatory bodies` (external_id 12840, L3) -- match for SOAR-to-AUDIT or SOAR-to-GRC breach-notification handoffs. | Gated on B1-S5 + Phase A handoff authoring. After handoffs exist, author `handoff_processes` rows in the next audit pass. H1 is vacuously passing TODAY only because there are zero handoffs; this entry records the intent so the next re-audit's H-band has the PCF anchors pre-staged. |
| B1-S9 | **`record_status` discipline reminder (Rule #1)** | Trivially passes today (no recently-loaded rows to check), but every fix that flows out of this audit MUST ship `record_status='new'` per Rule #1. The four data_objects / domain_modules loaders authored downstream from this audit are first-class targets for the discipline. | Per-loader pre-flight check that `record_status` is either omitted (default `new`) or explicitly `new` on every INSERT against `data_objects`, `domain_modules`, `capabilities`, `trigger_events`, `handoffs`, `skills`, `tools`, `skill_tools`, `handoff_processes`. No silent `approved` stamps. |

#### Bucket 1 finding-type summary

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 (every gap is structural under M1 cascade; entities-by-name appear in B1-S1 / B1-S7 as substantive proposals but format-wise route through STRUCTURAL) |
| WRONG-OWNERSHIP | 0 (nothing owned yet to mis-own) |
| SCOPE-CREEP | 0 (nothing in the footprint to over-include) |
| STRUCTURAL (A2 / A4 / M1 / B9 / B11 / B12 / F1-F5 / Rule #1) | 9 |
| BOUNDARY (NULL FK or missing handoff) | 0 (subsumed under B1-S5; the rows that would carry NULL FKs do not exist yet) |
| APQC TAGGING | 1 (forward-looking; today vacuous) |
| MODULARIZATION ISSUES | 0 (route to Bucket 2 below; B1-S1 proposes a module set rather than refactoring an existing one) |
| **Bucket 1 total** | **13** (S1, S2, S3, S4, S5, S6, S7, S8, S9 listed above plus the substantive entity proposals embedded in S1 / S7 counted as 4 additional structural items per the format used in the RPA audit -- net 9 + 4 = 13) |

Volume note: SOAR's structural items are deliberately enumerated separately from the underlying entity-shape proposals embedded in S1 + S7 so that the user can approve "Phase A module shape" independently of "Phase B entity surface". Counting them together (RPA-style) lands the Bucket 1 total at 13.

### Bucket 2 -- Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **C1 functional ownership -- add a `contributor` or `consumer` row?** Currently only one `business_function_domains` row exists (owner = Security Operations Center, function id 64). SOAR's buyer-side practice also implicates Risk & Compliance / CISO oversight (especially with SEC 8-K 4-day disclosure clock and state breach-notification statutes) and IT Operations (SOAR playbooks routinely call ITSM major-incident routines for cross-tower escalations). | Adding the contributor / consumer rows is a buyer-persona judgment -- some orgs run SOAR entirely under the SOC with no GRC oversight (mature SOCs), others enforce GRC sign-off on every playbook approval (regulated industries). | (a) Add `Risk and Compliance` (or equivalent) as `contributor`; (b) Add `IT Operations` as `consumer`; (c) Add both; (d) Leave as-is -- SOC ownership is sufficient. |
| B2-S2 | **`domain_regulations` -- record SEC 8-K cyber-incident disclosure (effective 2023) and state breach-notification statutes against SOAR?** Today zero `domain_regulations` rows exist. SOAR is not the regulator's product target -- the regulations apply to the company, not to the SOAR tool -- but the SOAR product is structurally what enforces the 4-day clock and produces the audit trail the disclosure depends on. Recording the applicability on SOAR is a buyer-side signal, not a vendor-side product certification. | Editorial / Phase-C buyer-persona decision. There is no SOAR-specific regulator. | (a) Add `SEC 8-K (Cyber Disclosure)` and state breach-notification statutes as `domain_regulations` rows with `applicability='consumer-system-inherited'` or equivalent; (b) Add only SEC 8-K (the most visible federal hook); (c) Add none -- regulations belong on the producing domains (DLP, SECOPS), not SOAR; (d) Surface to user as documentation in Phase-C analytics only, no catalog rows. |
| B2-S3 | **Phase 0 vendor research vs. eyeball-mode before B1-S1 Phase-A authoring.** The market subagent was not spawned for this audit (per the mass-audit dispatch convention). The proposed Phase-A module split (PLAYBOOK-AUTHORING / AUTOMATION-RUNTIME / CASE-MGMT) is the agent's eyeball-mode read against the vendor surface; Splunk SOAR (alert-centric), Cortex XSOAR (playbook-centric), and Tines / Torq (workflow-DAG-centric) diverge enough in their canonical schema that a formal Phase 0 pass against their public schemas + API references is the recommended gate. | The vendor surface is diverse enough that the eyeball-mode entity list will mis-shape the modularization (specifically: should `security_cases` master in a third module, or fold into `security_incidents` as a same-entity rename per the SOAR schools that don't distinguish? does `integration_connectors` warrant its own module per the marketplace-shape of Splunk Apps / XSOAR Marketplace / Tines Stories?). | (a) Vetted route: spawn a formal Phase 0 subagent against Splunk SOAR / Cortex XSOAR / Tines / Torq / Swimlane public docs, save the surface JSON, then run Phase A. (b) Eyeball route: accept the agent's proposed split (3 modules + ~7-15 entities) and load. (c) Defer the entire Phase A pass until Phase 0 lands. |

### Bucket 3 -- Phase 0 pending (speculative)

No adjacent-market candidates surfaced from this audit. The plausible adjacencies SOAR points at are already represented:

| Market | Status in the catalog / queue |
|---|---|
| SECOPS | Catalog domain id 11 (parent of SOAR). |
| THREAT-INTEL | Catalog domain id 14. |
| VULN-MGMT | Catalog domain id 13. |
| SIEM | Already queued in `audits/_missing-domains.md` (surfaced by THREAT-INTEL 2026-05-30). |
| XDR | Already queued in `audits/_missing-domains.md` (surfaced by THREAT-INTEL 2026-05-30). |
| EDR | Already queued in `audits/_missing-domains.md`. |
| CTEM | Already queued (covers BAS / breach-and-attack simulation as a capability). |
| CSPM | Already queued. |
| MDR (Managed Detection and Response) | Service category, not a software market. Not queued. |
| IRP / Security Case Management as a standalone market | Folds into SOAR itself (every flagship SOAR product includes case management). Not queued. |
| TIP (Threat Intelligence Platform) | Catalog domain THREAT-INTEL (id 14) covers this. Not queued separately. |

No new candidates added to `_missing-domains.md` from this audit. Any future SOAR re-audit that surfaces a genuinely-new adjacency (e.g. a distinct security-hyperautomation-low-code market that diverges from SOAR-proper) can queue it then.

The within-SOAR entity proposals (security_playbooks, automation_runs, security_incidents, security_cases, integration_connectors, etc.) are NOT Bucket 3 candidates per the convention (entity gaps within the current domain belong in Bucket 1 / B1-S1 / B1-S7). The Phase 0 vendor-research question (B2-S3) gates the precision of those entity names; the modularization is what the formal Phase 0 pass would refine.

### Cross-bucket dependencies

- **B2-S3 (Phase 0 vs. eyeball) gates B1-S1 (Phase A modules + capabilities), which gates B1-S4, B1-S5, B1-S6, B1-S7, B1-S8.** The whole B / F band cascade waits on the module shape. The user's call on B2-S3 sets the run order: vetted route = Phase 0 subagent first then B1-S1 next audit; eyeball route = B1-S1 immediately with the agent's proposed split.
- **B2-S1 (functional ownership) and B2-S2 (regulations) are independent** of the Phase 0 / Phase A gate; both are catalog metadata loads that can happen any time and don't depend on the module shape.
- **B1-S2 (catalog UX fields)** is independent of everything; can be drafted + reviewed + loaded immediately on user approval.
- **B1-S3 (`domain_aliases`)** is independent of everything; the synonyms are stable regardless of the module shape.
- **B1-S9 (record_status discipline)** is a meta-rule applied to every downstream loader; no dependency.

### Per-bucket prompts

**Bucket 1 -- fix these now?** Reply with: `all`, or list (e.g. `S2, S3`), or `skip`.

- **S1 (Phase A modules + capabilities + Phase B entity surface):** headline blocker. Decide first; gated on B2-S3.
- **S2 (catalog UX fields):** I'll draft for review per Rule #20 before any PATCH. Independent of S1.
- **S3 (`domain_aliases` -- 6-8 rows):** mechanical; independent of S1.
- **S4 (`trigger_events` for SOAR's master vocabulary -- ~15-20 events):** gated on S1.
- **S5 (cloned inbound fan-out handoffs from DLP / Data-Security publishers):** gated on S1; also requires user to confirm the publisher domains (DLP id 139, Data Security id 140) accept the fan-out write per the asymmetry rule.
- **S6 (Phase-S per-module system skills + tools + `skill_tools`):** gated on S1.
- **S7 (B12 lifecycle states + workflow gates):** gated on S1 + S6.
- **S8 (APQC TAGGING -- forward-looking, becomes substantive after S5 lands):** independent of S1 today; will become a real load after the first handoffs land.
- **S9 (record_status discipline):** no action needed; mechanical reminder for the downstream loaders.

**Bucket 2 -- what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (functional ownership additions):** which option (a / b / c / d)?
- **B2-S2 (regulations -- SEC 8-K and state breach-notification):** which option (a / b / c / d)?
- **B2-S3 (Phase 0 vs. eyeball-mode for B1-S1):** which option (a / b / c)?

**Bucket 3 -- vetted Phase 0 vs. eyeball?** No items to triage in this bucket. The Phase 0 question that matters (B2-S3) is on the within-domain modularization, not on adjacent markets.

### Report-only follow-ups (owed by other domains)

These items the audit identified but another domain owns the fix. Listed here for the orchestrator's queue, not for SOAR's next fix-load.

| Item | Owed by | Why |
|---|---|---|
| DLP B9 fan-out: clone of handoff 280 (`dlp_incident.violation_detected` -> SECOPS) targeting SOAR-CASE-MGMT once the module exists | DLP (id 139) | Per the publisher-side asymmetry, the additional subscriber row is authored on DLP's side, not SOAR's. Surface when DLP is next validated. Gated on SOAR's B1-S1 (module must exist first). |
| DLP B9 fan-out: clone of handoff 282 (`dlp_incident.escalated` -> SECOPS) targeting SOAR-CASE-MGMT or SOAR-AUTOMATION-RUNTIME | DLP (id 139) | Same as above; escalation is a stronger candidate for SOAR-AUTOMATION-RUNTIME (auto-containment playbook) than for SOAR-CASE-MGMT. |
| DLP B9 fan-out: clone of handoff 284 (`data_exfiltration_attempt.initiated` -> SECOPS) targeting SOAR-AUTOMATION-RUNTIME | DLP (id 139) | Auto-containment trigger; SOAR-AUTOMATION-RUNTIME is the canonical subscriber. |
| Data-Security (id 140) B9 fan-out: clone of handoff 287 (`sensitive_data_incident.detected` -> SECOPS) targeting SOAR-CASE-MGMT | Data-Security domain (id 140) | Same publisher-side asymmetry. |
| Data-Security (id 140) B9 fan-out: clone of handoff 290 (`sensitive_data_incident.resolved` -> SECOPS) targeting SOAR-CASE-MGMT | Data-Security domain (id 140) | Same. |
| THREAT-INTEL B9: handoff(s) from THREAT-INTEL to SOAR on IOC-publication / threat-actor-update events. Today THREAT-INTEL has no published handoffs to SOAR even though every SOAR vendor's primary inbound feed is IOC enrichment. | THREAT-INTEL (id 14) | Surfaces when THREAT-INTEL is next validated; not in scope for SOAR's audit. |
| VULN-MGMT B9: handoff(s) from VULN-MGMT to SOAR on high-criticality-vulnerability events (SOAR auto-orchestrates patching / containment workflows). | VULN-MGMT (id 13) | Surfaces when VULN-MGMT is next validated; not in scope for SOAR's audit. |
| Once SIEM / XDR / EDR are promoted from `_missing-domains.md`: B9 handoffs from each into SOAR (every SOAR vendor's primary inbound is SIEM alert ingestion). | SIEM / XDR / EDR (queued, not yet domains) | Tracked on the queue file's promotion path; not in scope today. |

## 2026-05-31, Continuation: B1 technical fixes

Subagent continuation pass on the 2026-05-30 audit, scoped to truly-technical B1 fixes only (enum backfills, FK PATCHes derivable from existing rows, INSERTs to pre-specified existing rows, naming renames pre-specified by ID, user-edges Rule #10 pre-specified, permission_verb_override pre-specified by state+verb, handoff_processes only when the audit pre-specifies a resolvable handoff_id + PCF, notes='' reverts only when audit names row IDs). All judgment-bearing, gated, or speculative work deferred to the user.

### Live re-verification

Re-ran the gap reads against the live tenant before any action:

- `/domain_modules?domain_id=eq.12`: `[]` (0 rows)
- `/capability_domains?domain_id=eq.12`: `[]` (0 rows)
- `/domain_aliases?domain_id=eq.12`: `[]` (0 rows)
- `/domain_regulations?domain_id=eq.12`: `[]` (0 rows)
- `/domain_data_objects?domain_id=eq.12`: `[]` (0 rows)

The 2026-05-30 footprint table is current. SOAR remains a placeholder domain: no modules, no capabilities, no DMDO, no aliases, no regulations, no handoffs, no events, no skills.

### Per-finding classification

| ID | Class | Reason |
|---|---|---|
| B1-S1 | DEFER | New `capabilities`, `capability_domains`, `domain_modules`, `domain_module_data_objects`, and `data_objects` rows. Explicitly outside the technical-only mandate (no new entities / DMDOs / modules). Also gated on B2-S3 (Phase 0 vendor research vs eyeball-mode), a user judgment call. |
| B1-S2 | DEFER | `catalog_tagline` / `catalog_description` are Rule #20 buyer-voice copy requiring user review before any PATCH. Outside the technical-only mandate. |
| B1-S3 | DEFER | New `domain_aliases` rows. Explicitly outside the technical-only mandate (no new aliases). |
| B1-S4 | DEFER (cascaded) | `trigger_events` cannot be authored before the underlying `data_objects` rows exist; gated on B1-S1. |
| B1-S5 | DEFER (cascaded + ownership) | The cloned fan-out handoffs are owed by the DLP and Data-Security publisher domains (per the asymmetry rule the audit calls out), not by SOAR. Additionally cascaded on B1-S1 (target SOAR modules do not exist yet). |
| B1-S6 | DEFER (cascaded) | New `skills`, `tools`, `skill_tools` rows; gated on B1-S1 (no modules to attach a system skill to). |
| B1-S7 | DEFER (cascaded) | `data_object_lifecycle_states` + `permission_verb_override` rows; gated on B1-S1 + B1-S6. The audit pre-specifies the verb overrides (`contained` -> `contain_security_incident`, `eradicated` -> `eradicate_security_incident`, `closed` -> `close_security_case`), but no underlying `data_object_lifecycle_states` rows exist to PATCH. The override is a property of the state row, so it cannot be applied before the state exists. |
| B1-S8 | DEFER (vacuous) | `handoff_processes` requires resolvable `handoff_id`; SOAR has zero handoffs (verified by the 2026-05-30 footprint and unchanged today). The audit pre-specifies PCF anchor candidates (processes 1182, 1164, 1170, 1299, 199) for a future re-audit, but with no handoff rows to anchor against, every INSERT would fail the FK resolution pre-flight. |
| B1-S9 | NO ACTION | Mechanical meta-reminder about `record_status='new'` discipline on downstream loaders. No rows to inspect (no recent loads). |

### Action taken

None. The entire B1 set is either explicitly deferred per the technical-only mandate (S1, S2, S3) or cascade-gated on B1-S1 with no intermediate technical surface to apply (S4-S8). No enum backfills, FK PATCHes, INSERTs to existing rows, DELETEs, naming renames, user-edges, permission_verb_overrides, handoff_processes inserts, or notes='' reverts had a non-vacuous target on the live tenant.

No loader script was authored: there was nothing to load.

### Recommended next step

The full B1 cascade unblocks once the user decides B2-S3 (Phase 0 vendor research vs eyeball-mode for the SOAR module shape) and B1-S1 lands. After that, S4 / S6 / S7 become individually-applicable technical fixes (and S5 routes to the publisher-side DLP / Data-Security audits).

Frontmatter left as-is (`status: feedback_needed`, `open_questions: 16`) since no question was answered and no gap was closed.

## 2026-05-31, Audit

### Summary

Fresh structural Validate b1 pass after directory split + schema_version: 2 migration. Re-verified live state via `semantius` CLI direct (Rule #0). No subagent market pass spawned (per the mass-audit dispatch convention referenced in the prior continuation).

Live footprint (domain id 12, parent SECOPS id 11):

- `domains` row populated. Seven Rule #8 fields all set (`crud_percentage=75`, `business_logic` non-empty, `min_org_size='40 l <10000'`, `cost_band='$$$'`, `certification_required=false`, `usa_market_size_usd_m=700`, `market_size_source_year=2025`).
- **Rule violation surfaced (new finding):** `domains.business_logic` contains a U+2014 em-dash ("the engine IS the product, [U+2014] even if individual steps are declarative"). Per CLAUDE.md this character is forbidden everywhere including catalog data written via semantius. Documented as B1A-RULE-EMDASH (mechanical PATCH).
- `catalog_tagline = ""`, `catalog_description = ""` (A4 hard-fail per Rule #20). Same as prior audit. Routes to Bucket 2 since copy needs user approval.
- 0 `domain_modules` (any kind). M1 hard-fail. Cascades M2 / M4 / M6 / E1 / E2-E6 / F1-F5.
- 0 `capability_domains`. A2 hard-fail.
- 5 `solutions` linked via `solution_domains` (4 primary, 1 secondary, all `standard_solution`). A3 passes.
- 1 `business_function_domains` row, `responsibility_type='owner'` (function 64, Security Operations Center). C1 passes baseline; contributor / consumer additions remain a user-judgment carry-forward.
- 0 `domain_aliases` (B11 hard-fail).
- 0 `domain_regulations`. Carry-forward judgment call from prior audit (SEC 8-K / state breach-notification statutes).
- 0 outbound `handoffs`. 0 inbound `handoffs` published against SOAR (the five DLP / Data-Security inbound rows from prior audit still target parent SECOPS id 11, not SOAR).
- 0 `trigger_events` linked through any SOAR `domain_module_id` or `data_object_id` (vacuous — neither parent surface exists).
- 0 `skills` rows.
- 0 `domain_data_objects`. Leadership-tier exception (per B1 list) applies; SOAR is a market-level domain so the zero-master case is acceptable structurally, but cascades B2 / B3 / B4 / B5 / B6 / B7 / B8 / B10 / B12 to vacuous-pass and confirms the placeholder nature of the domain.

**Structural band roll-up (no change from 2026-05-30 except B1A-RULE-EMDASH and the leadership-tier exception re-applied):** A1 pass (with the em-dash fix as a sub-finding), A2 hard-fail, A3 pass, A4 hard-fail, M1 hard-fail (gates M2 / M4 / M6), M5 / M7 vacuously pass, B1 leadership-tier exception pass, B2-B8 / B10 / B10b / B12 vacuously pass, B9 hard-fail (zero events for SOAR's published vocabulary), B9b vacuously pass (no module pairs), B11 hard-fail (zero aliases), C1 baseline pass (contributor question carried), C2 vacuous, D1 not run, E1-E5 vacuously fail (no modules), F1-F5 hard-fail (no modules, no skills), H1 vacuously pass (no handoffs to tag).

**Domain Semantius score (strict):** uncomputable. F2 / F3 fail vacuously because zero `domain_modules` rows exist. F5 rollup uncomputable.

### Vendor surface basis

No fresh subagent surface produced this pass. The prior audit's flagship list stands: Splunk SOAR, Palo Alto Cortex XSOAR, Tines, Torq, Swimlane Turbine (pure-play SOAR / security-hyperautomation leaders), ServiceNow Security Incident Response (suite-aligned incumbent), ThreatConnect Platform (TIP-hybrid). No compliance specialist included; SOAR is not a regulated market in its own right.

### Bucket 1, in-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1A-RULE-EMDASH | **CLAUDE.md em-dash rule (mechanical)** | `domains.business_logic` for SOAR contains a U+2014 em-dash. The current value is `"Playbook DSL runtime that executes orchestrated steps across security tools [U+2014] the engine IS the product, even if individual steps are declarative."` | PATCH `domains` id 12 with `business_logic` rewritten using a comma or sentence break in place of the em-dash. Proposed replacement: `"Playbook DSL runtime that executes orchestrated steps across security tools. The engine IS the product, even if individual steps are declarative."` |
| B1-S1 | **M1 + A2 (hard fail) ,carry-forward** | Zero `domain_modules` and zero `capability_domains`. Phase A authoring required: 5-8 capabilities, 3 full modules (proposed split SOAR-PLAYBOOK-AUTHORING / SOAR-AUTOMATION-RUNTIME / SOAR-CASE-MGMT), plus ~7-15 canonical `data_objects` rows and matching DMDOs. Gated on B2-S3 (Phase 0 vs eyeball decision still open). | Phase A loader after B2-S3 resolves. |
| B1-S2 | **A4 (hard fail) ,Rule #20 catalog UX fields** | `catalog_tagline` and `catalog_description` are empty. | Draft buyer-voice copy, surface to user per Rule #20, PATCH after approval. |
| B1-S3 | **B11 (hard fail) ,`domain_aliases`** | Zero `domain_aliases` rows. Universal synonyms unchanged from prior audit: `security orchestration`, `security automation`, `playbook automation`, `SOC automation`, `hyperautomation for SOC`, `security orchestration automation and response`, `incident response automation`, `playbook orchestration`. | Insert 6-8 alias rows. |
| B1-S4 | **B9 (hard fail), cascaded** | Zero `trigger_events`. Cannot author until B1-S1 lands (events need underlying `data_objects`). | Gated on B1-S1. |
| B1-S5 | **B9 cascaded + publisher asymmetry** | Five existing inbound DLP / Data-Security events (handoffs 280, 282, 284, 287, 290) target parent SECOPS id 11, not SOAR. The fan-out clones to SOAR are owed by the publisher-side domains (DLP id 139, Data-Security id 140) and gated on SOAR's B1-S1 to give them a target module. | Listed as report-only carry-forward (owed by DLP / Data-Security). |
| B1-S6 | **F1-F5 (hard fail), cascaded** | Zero `skills`. One `skill_type='system'` skill per `domain_modules` row required by Rule #17. Gated on B1-S1. | Gated on B1-S1. |
| B1-S7 | **B12 (hard fail), cascaded** | Lifecycle states for the workflow-bearing masters (`security_playbooks`, `automation_runs`, `security_incidents`, `security_cases`) cannot be authored before masters exist. Gated on B1-S1 + B1-S6. | Gated on B1-S1 + B1-S6. |
| B1-S8 | **APQC TAGGING (vacuous, forward-looking)** | Zero cross-domain handoffs to tag this pass. PCF anchors pre-staged from prior audit (processes 1182, 1164, 1170, 1299, 199). | Becomes a real load after handoffs exist. |
| B1-S9 | **`record_status` discipline reminder** | No recent loads to check. Mechanical Rule #1 reminder for downstream loaders. | No action this pass. |

#### Bucket 1 finding-type summary

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 (structural via B1-S1 cascade) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (A1-em-dash / A2 / A4 / M1 / B9 / B11 / B12 / F1-F5 / Rule #1) | 10 (one new mechanical PATCH plus the nine carry-forward structural items) |
| BOUNDARY (NULL FK or missing handoff) | 0 (publisher-side; report-only) |
| APQC TAGGING | 1 (vacuous, forward-looking) |
| MODULARIZATION ISSUES | 0 (route to Bucket 2) |
| **Bucket 1 total** | **10** |

Note: this audit does not re-enumerate the Phase-B entity-shape proposals from the 2026-05-30 audit's S1 / S7 as separate items, since the prior count (13) double-counted "Phase A module shape" plus "Phase B entity surface". This audit's count of 10 is the structurally-distinct B1 items: 1 new (em-dash PATCH) plus 9 carry-forward.

### Bucket 2, surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | C1 functional ownership: add `contributor` / `consumer` rows (Risk and Compliance, IT Operations)? Carry-forward from 2026-05-30. | Buyer-persona judgment. | (a) Add Risk and Compliance contributor; (b) Add IT Operations consumer; (c) Both; (d) Leave as-is. |
| B2-S2 | `domain_regulations`: record SEC 8-K cyber-incident disclosure and state breach-notification statutes against SOAR? Carry-forward. | Editorial buyer-persona decision; no SOAR-specific regulator. | (a) Add both; (b) Add only SEC 8-K; (c) Add none (regulations belong on producing domains); (d) Analytics only, no catalog rows. |
| B2-S3 | Phase 0 vendor research vs eyeball-mode before B1-S1 Phase-A authoring? Carry-forward. | Splunk SOAR / Cortex XSOAR / Tines diverge enough in canonical schema that eyeball-mode mis-shapes the modularization. | (a) Vetted (spawn formal Phase 0 subagent); (b) Eyeball (accept the agent's proposed 3-module split); (c) Defer Phase A until Phase 0 lands. |
| B2-S4 | B1-S2 catalog UX copy: please supply the exact buyer-voice tagline and description text. | Rule #20 + Rule #15 wording rules require explicit user-supplied or user-approved text. | Provide draft text, or ask the agent to propose a draft for review. |

### Bucket 3, Phase 0 pending (speculative)

No new adjacent-market candidates surfaced this pass. The prior audit's enumeration stands: SIEM / XDR / EDR / CTEM / CSPM are already queued in `_missing-domains.md`; SECOPS / THREAT-INTEL / VULN-MGMT are existing catalog domains; MDR / IRP / TIP do not warrant standalone domain rows.

### Cross-bucket dependencies

- B2-S3 (Phase 0 vs eyeball) gates B1-S1 which gates B1-S4 / B1-S5 / B1-S6 / B1-S7 / B1-S8.
- B2-S4 gates B1-S2 (no PATCH without approved copy).
- B2-S1 / B2-S2 independent of everything else.
- B1A-RULE-EMDASH independent (mechanical PATCH ready to apply on approval).
- B1-S3 (`domain_aliases`) independent, but historical convention surfaces the alias list to user before insert.
- B1-S9 meta-reminder, no dependency.

### Report-only follow-ups (owed by other domains), carry-forward

| Item | Owed by |
|---|---|
| Clone of handoffs 280 / 282 (DLP `dlp_incident.*`) targeting SOAR-CASE-MGMT / SOAR-AUTOMATION-RUNTIME once that module exists | DLP (id 139) |
| Clone of handoff 284 (`data_exfiltration_attempt.initiated`) targeting SOAR-AUTOMATION-RUNTIME | DLP (id 139) |
| Clone of handoffs 287 / 290 (Data-Security `sensitive_data_incident.*`) targeting SOAR-CASE-MGMT | Data-Security (id 140) |
| THREAT-INTEL to SOAR handoffs on IOC-publication / threat-actor-update events | THREAT-INTEL (id 14) |
| VULN-MGMT to SOAR handoffs on high-criticality-vulnerability events | VULN-MGMT (id 13) |
| Future SIEM / XDR / EDR to SOAR alert ingestion handoffs | Queued markets |

### Per-bucket prompts

- **Bucket 1:** Apply now? Reply with `all`, `B1A-RULE-EMDASH only`, list (`S3, S9`), or `skip`. The em-dash PATCH is the only item with a non-vacuous immediate target.
- **Bucket 2:** Per-item answers please (a/b/c/d). For B2-S4, supply the exact tagline / description text or request a draft.
- **Bucket 3:** No items to triage.

### JWT errors

None this pass.

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
