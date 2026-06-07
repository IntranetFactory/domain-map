# IGA audit history

## 2026-05-30 Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 5 full modules (`IGA-ACCESS-REQUEST` 144, `IGA-ACCESS-CERTIFICATION` 145, `IGA-SOD-MGMT` 146, `IGA-ENTITLEMENT-CATALOG` 147, `IGA-AUTO-PROVISIONING` 148); 6 masters (`iga_access_requests` 704, `iga_access_certifications` 705, `iga_entitlement_definitions` 706, `iga_sod_violations` 707, `iga_provisioning_events` 708, `iga_user_entitlements` 964); 7 capabilities (5 IGA-prefixed + 2 cross-cutting `OFFBOARDING` 82, `IDENTITY-RESOLUTION` 255); 8 solutions (all `primary`: SailPoint, Saviynt, Okta IG, Microsoft Entra ID Governance, One Identity Manager, Oracle Identity Governance, IBM Security Verify Governance, Omada Identity Cloud); 12 trigger_events; 7 outbound + 36 inbound cross-domain handoffs (43 total); 23 aliases; 36 lifecycle states across all 6 masters; 5 system skills + 53 skill_tools rows (strict Semantius score 100%); 4 roles + 14 role_modules + 22 role_permissions.
- **Bucket 1 (in-scope, agent fixable):** 11 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 6 items.
- **Candidates queued via `append_missing_domain.ts`:** 1 (PAM, see candidate queue).
- **Status (frontmatter):** `feedback_needed`. Open-question count `22` = 11 (Bucket 1) + 5 (Bucket 2) + 6 (Bucket 3).

**Neighbor discovery** (auto-derived from `handoffs` + cross-domain DMDO + cross-domain `data_object_relationships`, ranked by edge weight):

| Neighbor | Out | In | DMDO on IGA masters | IGA DMDO on theirs | Cross-rels | Weight | Pass shape |
|---|---:|---:|---:|---:|---:|---:|---|
| HCM | 0 | 6 | 0 | 4 (employees, employment_events, employment_contracts, org_units) | 4 | 14 | Pairwise (full) |
| LMS | 0 | 5 | 0 | 1 (compliance_assignments) | 1 | 7 | Pairwise (full) |
| ITSM | 3 | 1 | 0 | 1 (service_catalog_items) | 1 | 6 | Pairwise (full) |
| UEM | 0 | 4 | 0 | 2 (enrolled_devices, device_compliance_results) | 0 | 6 | Pairwise (full) |
| WSC | 0 | 3 | 0 | 2 (channel_members, external_guest_invitations) | 2 | 7 | Pairwise (full) |
| HRSD | 1 | 1 | 1 (`iga_access_requests` consumer on 75) | 1 (hr_cases) | 1 | 5 | Pairwise (light) |
| SMP | 0 | 2 | 0 | 1 (saas_applications) | 2 | 5 | Pairwise (light) |
| ONBOARDING | 0 | 2 | 0 | 1 (onboarding_tasks) | 1 | 4 | Pairwise (light) |
| DCG | 0 | 1 | 0 | 1 (data_access_policies) | 0 | 2 | Lightweight |
| DLP | 0 | 2 | 0 | 2 (dlp_incidents, dlp_user_activity_logs) | 0 | 4 | Lightweight |
| DSPM | 0 | 2 | 0 | 1 (iam_access_policies) | 0 | 3 | Lightweight |
| GRC | 2 | 0 | 0 | 0 | 0 | 2 | Lightweight |
| ECM | 0 | 2 | 0 | 2 (content_documents, document_folders) | 1 | 5 | Lightweight |
| APIM | 0 | 1 | 0 | 1 (api_consumers) | 0 | 2 | Lightweight |
| IWMS | 0 | 1 | 0 | 2 (desk_bookings, locations) | 0 | 3 | Lightweight |
| ITAM | 1 | 0 | 0 | 0 | 0 | 1 | Lightweight |
| VIS-MGMT | 0 | 1 | 0 | 1 (visitor_registrations) | 1 | 3 | Lightweight |

Pairwise findings for the full-pass neighbors (HCM, LMS, ITSM, UEM, WSC) live inline in the **Bucket 1: Boundary findings per neighbor** subsection below; the lightweight neighbors are summarized at the end of that subsection.

**Structural pass bands:**
- A1, A2, A3 pass. A1 metadata complete (crud=75, business_logic populated, min_org_size `30 m <2500`, cost_band `$$$`, certification_required true, US TAM 3000m/2025).
- M1, M2, M4, M5, M6 pass. **M7 within-domain hard fail** on 4 masters (704, 706, 707, 708) co-located as master in one IGA module and consumer in others.
- B1, B2, B3, B5, B11, B12 pass. **B7** clean (every master has user-edges); **B9** has 7 trigger_events with empty `event_category` (Rule #13 enum violation); **B9b hard fail** (zero intra-domain cross-module handoffs despite ~7 implied pairs); **B10b inbound partial fail** (4 LMS-sourced rows with NULL `target_domain_module_id` IGA owes); **B6** has one likely gap (no edge between `iga_user_entitlements` and `iga_sod_violations`).
- C1, C2 pass (IAM owner + IT Operations contributor; no capability-level RACI overrides needed).
- E1-E5 pass; **E6** drift hint on `IAM-IDENTITY-ADMIN` (admin bundle covers 5 baseline-admin grants but no explicit workflow-gate inclusion , relies on `permission_hierarchy`).
- F1, F2, F3, F4, F5, F7 pass. **Strict Semantius score 100%** (every one of 53 `skill_tools` rows links a `coverage_tier='platform'` tool). Operational score also 100%.
- **H1 hard fail.** 9/43 cross-domain handoffs carry `handoff_processes` rows; only 1 `agent_curated`. Volume target per skill: 0.5×43 to 0.8×43 = 22-34 `agent_curated` proposals. Audit produces 10 high-confidence tag candidates below; the remaining ~12-20 either defer to Discover Pass 3 (modern security primitives without clean PCF home: `dlp_user_activity.flagged`, `iam_access_policy.permission_escalation_detected`, `device_compliance_result.non_compliant`, `enrolled_device.lost_or_stolen`, etc.) or wait for the next fix-pass.

### Vendor surface basis

Flagship vendor enumeration uses the 8 catalog `solution_domains` rows as the primary anchor, expanded by category awareness:

- **Suite leaders (full-featured IGA):** SailPoint Identity Security Cloud, Saviynt Enterprise Identity Cloud, Microsoft Entra ID Governance, Oracle Identity Governance, IBM Security Verify Governance, One Identity Manager, Omada Identity Cloud. These define the union surface for access requests, certifications, SoD, entitlements, provisioning.
- **Cloud-native challengers:** Okta Identity Governance (lighter than the suites, faster to deploy, less SoD depth).
- **Compliance / SoD specialists (out-of-catalog):** Pathlock (SAP-anchored SoD with deep ERP entitlement awareness), SecurEnds (lightweight certification campaigns), Zilla Security, ConductorOne (request-time SoD + just-in-time entitlements). These are not loaded as solutions but inform the surface check (`sod_rulesets`, `risk_owners`, `mitigating_controls` are first-class in their schemas).
- **PAM-adjacent (boundary):** CyberArk Identity, Delinea, BeyondTrust. They overlap on entitlement governance for privileged accounts but center on session management, vault, and just-in-time elevation. The boundary between IGA and PAM is the major Bucket 3 question below.

Statutory anchors (already loaded): GDPR, SOX, ISO 27001, SOC 2, NIS2, CMMC. Missing from the catalog but flagship-relevant: HIPAA (every healthcare IGA deployment carries HIPAA scoping for role mining), FINRA / FFIEC (financial-services IGA), PCI DSS (cardholder-data-environment access governance). These are Bucket 2 questions.

### Bucket 1: In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M7 (within-domain hard fail)** | 4 IGA masters carry `role='master'` in one IGA module AND `role IN (consumer, contributor)` in 1-4 sibling IGA modules. Specifically: `iga_access_requests` (704) master in 144, consumer in 148. `iga_entitlement_definitions` (706) master in 147, consumer in 144, 145, 146, 148. `iga_sod_violations` (707) master in 146, consumer in 144. `iga_provisioning_events` (708) master in 148, consumer in 144, 145, 146. The M7 within-domain rule rejects master+consumer in sibling modules of the same domain: *"you don't consume what you also master in the same scope"*. Two interpretations: (a) the IGA modules are intended as **autonomous deployable units** (M7's pass-with-promotion case) → PROMOTE every consumer row to `embedded_master`, accepting the runtime demotion when both modules co-deploy. (b) the IGA modules are intended as **co-installed** (M7's within-domain hard-fail case) → DELETE the 8 sibling-consumer rows. Recommendation: (a). IGA modules are reasonably packaged for independent install (a customer could deploy IGA-AUTO-PROVISIONING against an external identity store without IGA-ACCESS-REQUEST), and the per-module fact sheets currently render the entity dependencies correctly only with `embedded_master`. Decision is the user's. | Two options; recommendation (a): PATCH the 8 sibling rows from `role='consumer'` to `role='embedded_master'`. Alternative (b): DELETE all 8 rows. Either way the 4 master rows stay untouched. |
| B1-S2 | **B9 , empty `event_category`** | 7 of 12 IGA `trigger_events` have empty `event_category` (Rule #13 violation; the enum requires one of `lifecycle / state_change / threshold / signal`). The 7 rows: 455 `iga_access_request.submitted`, 456 `iga_access_request.approved`, 457 `iga_access_certification.completed`, 458 `iga_entitlement_definition.published`, 459 `iga_sod_violation.detected`, 460 `iga_provisioning_event.completed`, 461 `iga_provisioning_event.failed`. The 5 newer events on `iga_user_entitlements` (1377-1381) carry the enum correctly. | PATCH `event_category` per the verb: `submitted` / `published` / `detected` / `completed` / `failed` → `state_change`; `approved` → `state_change`. (All seven of these are state-machine transitions, not lifecycle "row exists" signals.) |
| B1-S3 | **B9b (hard fail) , zero intra-domain cross-module handoffs** | The catalog has zero `handoffs` rows with `source_domain_id = target_domain_id = 35` despite 5 modules with obvious cross-module event chains. Implied module-pair candidates from `data_object_relationships` and lifecycle states: (1) 144 → 148 on `iga_access_request.approved` (approved request hands off to provisioning), (2) 145 → 148 on `iga_access_certification.completed` (revocations spawn provisioning events), (3) 146 → 148 on `iga_sod_violation.mitigated` (automated entitlement revocation as mitigation), (4) 144 → 146 on `iga_access_request.submitted` (SoD pre-check), (5) 147 → 144 on `iga_entitlement_definition.published` (catalog refresh for requesters), (6) 147 → 146 on `iga_entitlement_definition.published` (SoD ruleset re-evaluation), (7) 148 → 145 on `iga_provisioning_event.completed` (next-certification scheduling). | Author 7 intra-domain handoff rows with `source_domain_id=target_domain_id=35`, `integration_pattern='lifecycle_progression'` as default (use `api_call` for the 146 mitigation→148 path since it crosses ownership), `friction_level='low'` default (bump (3) to `medium` because mitigation flows occasionally fail at the connector and need rollback). |
| B1-S4 | **B10b inbound , NULL `target_domain_module_id` from LMS** | 4 inbound handoffs from LMS to IGA carry `target_domain_module_id=null` AND no IGA module declares a DMDO row on the payload. Rows: 1303 (`learner_certification.revoked` → `learner_certifications`), 1304 (`learner_certification.expired` → `learner_certifications`), 1305 (`learner_certification.renewed` → `learner_certifications`), 1309 (`compliance_assignment.expired` → `compliance_assignments`). Per B10b's resolution rule, the target module is whichever IGA module holds the strongest role on the payload , but no IGA module holds any role on `learner_certifications` (id 171). For `compliance_assignments` (173), `IGA-AUTO-PROVISIONING` (148) consumes it. Fix is two-part: first add the missing DMDO row (`consumer + optional`) on `IGA-AUTO-PROVISIONING` for `learner_certifications`, then PATCH `target_domain_module_id=148` on rows 1303-1305 and 1309. The receiving module is provisioning because certification-loss events auto-revoke gated access. | (1) INSERT one `domain_module_data_objects` row: `(domain_module_id=148, data_object_id=171, role='consumer', necessity='optional')`. (2) PATCH `target_domain_module_id=148` on handoffs 1303, 1304, 1305, 1309. |
| B1-S5 | **B6 missing intra-domain relationship** | `iga_user_entitlements` (964) has 0 edges to `iga_sod_violations` (707). The current SoD detection workflow scans entitlement combinations per user; absence of a `iga_user_entitlements ←implicated_in_violation→ iga_sod_violations` (M:N association) edge means the relationship graph cannot render the actual subject of the violation. Verbs: `implicates` / `implicated_in` mirror the existing 707↔706 row. | Author one `data_object_relationships` row: `(data_object_id=964, related_data_object_id=707, relationship_verb='implicated_in_sod_violation', inverse_verb='implicates_entitlement', relationship_type='many_to_many', relationship_kind='association', is_required=false, owner_side='source')`. |
| B1-S6 | **B10b report-only , NULL `target_domain_module_id` on outbound** | 2 outbound IGA handoffs (464, 465) target `GRC` with `target_domain_module_id=null`. Per B10b's asymmetry rule, the target-side module FK is GRC's B10b responsibility. IGA's own `source_domain_module_id` is populated on every outbound row (146 and 145 respectively). Surfaces in the report-only section below. | Schedule a GRC b1 audit; no action from this audit. |
| B1-S7 | **Pairwise , undeclared external consumer DMDOs on every IGA-target domain** | M7-style catalog-wide check: of the 5 outbound IGA targets (ITSM ×3, ITAM ×1, GRC ×2, HRSD ×1), only HRSD declares a `consumer` DMDO row on any IGA master (`HRSD-CASE-MGMT` consumer on `iga_access_requests`). ITSM, ITAM, GRC consume IGA events via the handoff payload but don't model the dependency at the module layer. Same shape as the APM B1-S9 finding. | Report-only; each target domain's b1 audit should add the `consumer` DMDO row on whichever IGA master they actually read. |
| B1-S8 | **APQC TAGGING (H1 hard fail)** | 9/43 cross-domain handoffs tagged; only 1 `agent_curated`. The remaining 7 `discovery_*` rows are weak fits (e.g. handoff 839 `document.classified` → `Document trade` 14095 is a finance-trade-document substring match, not the IGA workflow). High-confidence agent-curated proposals authored at audit time (10 rows): see APQC TAGGING table below. | INSERT 10 `handoff_processes` rows; per catalog convention `proposal_source='agent_curated'`, `record_status='new'`. The composed key `(handoff_id, process_id)` prevents duplicates if a discovery row already exists, though several `discovery_override` and `discovery_substring` rows likely deserve replacement (per Discover Pass 1.5: human-curated / agent-curated override discovery_substring). |

#### Boundary findings per neighbor

The 5 heaviest neighbors (weight ≥ 6) get the 5-section pairwise diff inline. Lighter neighbors are summarized in a single block at the end.

##### HCM (weight 14 , 0 out / 6 in)

- **Section 1 (fully wired):** 6 handoffs from HCM, all with `source_domain_module_id` populated (HCM-CORE-WORKER or HCM-ORG-POSITIONS) and `target_domain_module_id` populated (144 for joiner / mover / org-unit signals, 148 for contract-expiry leaver). 4 IGA-side DMDO rows declare HCM-mastered consumers (`employees` required, `employment_contracts` optional, `employment_events` optional, `org_units` embedded_master). 4 cross-domain `data_object_relationships` rows wire the verbs. Healthy boundary.
- **Section 2 (NULL FK PATCH candidates):** None on IGA's side. On HCM's side, the 6 inbound handoffs carry "target_domain_module_id NULL until IGA is modularized" notes that pre-date IGA's modularization. These notes are stale; the column is populated now. Per Rule #15 the notes were never approved wording in the first place , they originated from an authoring-time write-policy that's now rescinded. → **B2-S2** below.
- **Section 3 (missing handoffs implied by the catalog):** HCM-side `employee.demoted`, `employee.transferred`, `employee.role_changed` events would fire IGA access-request creation but only `employee.promoted` (handoff 375) is loaded. Lateral-move / demotion signals are common joiner/mover/leaver triggers in flagship IGA workflows. → Bucket 3 (vet against HCM's published `trigger_events`).
- **Section 4 , Boundary integrity gaps:** None.
- **Section 5 , Cross-domain `data_object_relationships`:** Both directions wired (employees↔iga_provisioning_events, employment_contracts↔iga_provisioning_events, employment_events↔iga_provisioning_events, org_units↔iga_entitlement_definitions). No missing-relationship findings.

##### LMS (weight 7 , 0 out / 5 in)

- **Section 1 (fully wired):** 1 handoff (435 `compliance_assignment.overdue` → `IGA-AUTO-PROVISIONING`) is fully wired with both module FKs.
- **Section 2 (NULL FK PATCH candidates):** 4 inbound handoffs (1303, 1304, 1305, 1309) carry `target_domain_module_id=null`. Cured by B1-S4 above (add DMDO on `learner_certifications`, then PATCH 4 rows).
- **Section 3 , Missing handoffs implied:** None obvious , the LMS surface for IGA is well-modeled.
- **Section 4 , Boundary integrity gaps:** `learner_certifications` (171) currently has no DMDO row anywhere in IGA. Resolved by B1-S4 fix.
- **Section 5 , Cross-domain relationships:** `compliance_assignments ↔ iga_provisioning_events` exists. Missing: `learner_certifications ↔ iga_provisioning_events` (added once the DMDO lands). → Add as part of B1-S4 fix or follow-up.

##### ITSM (weight 6 , 3 out / 1 in)

- **Section 1 (fully wired):** 3 outbound handoffs from IGA to ITSM (461 provisioning completion, 463 provisioning failure → service_incidents, 466 access_request approved → service_incidents) and 1 inbound (631 service_catalog_item.published → IGA-ENTITLEMENT-CATALOG) all carry both module FKs.
- **Section 2 (NULL FK PATCH candidates):** None.
- **Section 3 , Missing handoffs implied:** ITSM `change_request.completed` for entitlement changes routed via Service Request is a flagship IGA-ITSM flow (a change of role triggers a service-request → IGA access-request chain in many SailPoint and ServiceNow integrations). Currently absent.
- **Section 4 , Boundary integrity gaps:** None.
- **Section 5 , Cross-domain relationships:** `service_catalog_items ↔ iga_entitlement_definitions` (verb `exposes`) is wired. ITSM-side `service_incidents` ↔ `iga_provisioning_events` is not (3 outbound handoffs target `service_incidents` but no relationship row reflects that). → B1-S6-style report-only ("ITSM owes the inbound relationship side per its B8 pass").

##### UEM (weight 6 , 0 out / 4 in)

- **Section 1 (fully wired):** 4 inbound handoffs all carry `target_domain_module_id=148` and IGA DMDO rows declare `enrolled_devices` (consumer + optional) and `device_compliance_results` (consumer + optional). UEM-side `source_domain_module_id` is NULL on all 4 → UEM's B10b.
- **Section 2 (NULL FK PATCH candidates):** UEM owns its side; report-only.
- **Section 3 , Missing handoffs implied:** Device compliance state change is a common conditional-access driver. The 4 loaded events are reasonable; no obvious additional candidates.
- **Section 4 , Boundary integrity gaps:** None (DMDO covered on IGA side).
- **Section 5 , Cross-domain relationships:** None loaded between UEM masters and IGA masters. → Bucket 3 (whether `enrolled_devices ↔ iga_user_entitlements` should be modeled at the relationship level given conditional-access patterns).

##### WSC (weight 7 , 0 out / 3 in)

- **Section 1 (fully wired):** 3 inbound handoffs (830, 831, 836) all populate both module FKs. IGA DMDO rows on `channel_members` and `external_guest_invitations` are present.
- **Section 2 (NULL FK PATCH candidates):** None on IGA's side; the legacy notes on handoffs 830/831/836 ("target NULL until IGA is modularized") are stale and unapproved → B2-S2.
- **Section 3 , Missing handoffs implied:** None obvious.
- **Section 4 , Boundary integrity gaps:** None.
- **Section 5 , Cross-domain relationships:** `iga_access_certifications` (705) ↔ `channel_members` (568) exists (verb `reconciles channel membership`). `external_guest_invitations` ↔ both `iga_access_requests` and `iga_provisioning_events` exist. Reasonable coverage.

##### Lightweight neighbors (weight 1-5)

- **HRSD (5):** `iga_access_requests` consumer DMDO declared on HRSD-CASE-MGMT. Inbound 119 (`case.access_required`) fully wired. Outbound 467 (`iga_access_request.submitted` → HRSD-CASE-MGMT) fully wired. Healthy.
- **SMP (5):** 2 inbound handoffs (639, 640) on `saas_application.discovered/sanctioned`. Cross-rel `saas_applications ↔ iga_user_entitlements` (`entitles_to`) plus `smp_license_seat_assignments ↔ iga_user_entitlements` (`correlates_with`) wire the seat-reclamation flow. Healthy.
- **ONBOARDING (4):** 2 inbound (5, 407) both fully wired. Cross-rel `onboarding_tasks ↔ iga_access_requests` exists.
- **DLP (4):** 2 inbound, both `source_domain_module_id=null` (DLP's B10b). IGA-side DMDOs on `dlp_incidents` and `dlp_user_activity_logs` present.
- **DSPM (3):** 2 inbound with NULL source FK (DSPM's B10b). IGA DMDO on `iam_access_policies` (consumer + optional) present.
- **ECM (5):** 2 inbound, both with NULL source FK (ECM's B10b). IGA DMDOs on `content_documents` and `document_folders` present. Cross-rel `document_folders ↔ iga_entitlement_definitions` exists.
- **IWMS (3):** 1 inbound (1165 `desk_booking.checked_in`) with NULL source FK (IWMS's B10b). IGA DMDOs on `desk_bookings` and `locations` present.
- **DCG (2):** 1 inbound (263) with NULL source FK (DCG's B10b). DMDO on `data_access_policies` present.
- **APIM (2):** 1 inbound (751) with NULL source FK. DMDO on `api_consumers` present.
- **GRC (2):** 2 outbound; target side is GRC's B10b. No DMDO on IGA-mastered events from the GRC side. → B1-S6 report-only.
- **ITAM (1):** 1 outbound (462) fully wired. Marginal pair.
- **VIS-MGMT (3):** 1 inbound (871) with NULL source. DMDO + cross-rel on `visitor_registrations` present.

#### APQC TAGGING (high-confidence proposals)

Volume: per the H-band guidance for N=43 cross-domain handoffs, target = 22-34 `agent_curated` tags. The 10 below are the high-confidence subset. The remaining gap is deferred to Discover Pass 3 (modern security primitives without clean PCF home: `dlp_user_activity.flagged`, `dlp_incident.escalated`, `iam_access_policy.permission_escalation_detected`, `device_compliance_result.*`, `enrolled_device.*`, `api_consumer.revoked`, `external_guest.*`, `channel_member.added`, `desk_booking.checked_in`, `visitor_registration.submitted`, `data_access_request.approved`, `document_folder.permissions_changed`, `document.classified` , these have no clean L2/L3 match in APQC PCF cross-industry and become custom-process candidates).

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | confidence |
|---|---|---|---|---|---|
| 466 | IGA-ACCESS-REQUEST → ITSM | `iga_access_request.approved` | `service_incidents` | Manage IT user identity and authorization (20756 L3) | confident L3 |
| 461 | IGA-AUTO-PROVISIONING → ITSM | `iga_provisioning_event.completed` | `service_incidents` | Manage IT user identity and authorization (20756 L3) | confident L3 |
| 463 | IGA-AUTO-PROVISIONING → ITSM | `iga_provisioning_event.failed` | `service_incidents` | Manage IT user identity and authorization (20756 L3) , recovery via incident | confident L3 |
| 462 | IGA-AUTO-PROVISIONING → ITAM | `iga_provisioning_event.completed` | `iga_provisioning_events` | Manage IT assets (10568 L3) , entitlement-asset reconciliation | confident L3 |
| 464 | IGA-SOD-MGMT → GRC | `iga_sod_violation.detected` | `iga_sod_violations` | Manage business risks (16439 / 10579 L3) , IT risk subtree | confident L3 |
| 465 | IGA-ACCESS-CERTIFICATION → GRC | `iga_access_certification.completed` | `iga_access_certifications` | Establish internal controls, policies, and procedures (10708 L3) , audit-evidence subtree | confident L3 |
| 467 | IGA-ACCESS-REQUEST → HRSD | `iga_access_request.submitted` | `iga_access_requests` | Manage customer service problems, requests, and inquiries (10388 L3) | confident L3 |
| 5 | ONBOARDING → IGA-ACCESS-REQUEST | `task.access_provisioning_required` | `onboarding_tasks` | Manage employee onboarding (10469 L3) , already discovery_override; promote to `agent_curated` confirms it | confident L3 |
| 19 | HCM → IGA-ACCESS-REQUEST | `employee.created` | `employees` | Manage employee onboarding, training, and development (20599 L2) , child `Manage employee onboarding` (10469 L3) is the tighter fit | confident L3 |
| 185 | HCM → IGA-ACCESS-REQUEST | `employee.terminated` | `employees` | Manage employee separation / offboarding (within Reward and retain employees subtree, 10470 / 10473 L3) | confident L3 |

### Bucket 2: Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Rule #15 notes pollution on `iga_entitlement_definitions.notes`.** The master row carries: *"Config-shape master: lightweight draft -> published -> deprecated -> retired lifecycle, no per-record approval workflow. Permission gates apply only on publish and retire."* This is exactly the Rule-#12 config-shape exemption that Rule #15 RESCINDED as an auto-write license. The wording was probably written by a Phase-B loader, not user-approved. Same shape as the APM B2-S2 finding. | Cannot tell from the audit alone whether the user explicitly approved this wording at load time. | (a) Confirm user-approved → leave as is. (b) Confirm auto-write → PATCH the column to empty string and record the config-shape exemption in this audit file's Decisions section instead. |
| B2-S2 | **Rule #15 notes pollution on `handoffs.notes`.** 12 IGA-touching handoffs carry stale annotations: 462, 830, 831, 836, 1165 say *"target NULL until IGA is modularized"* and 19, 185, 375, 378, 382, 389, 391, 392 say *"target_domain_module_id NULL until IGA is modularized (Phase-M gap on target domain; SKILL.md authoring rule)."* These were all written by the prior write-policy (now rescinded by Rule #15) and IGA *is* modularized , the columns are populated. The notes are obsolete restatements of nothing. Also handoff 467 carries an explicit dated remediation note (`"B10b resolved 2026-05-26: HRSD-CASE-MGMT consumes iga_access_requests as the inbound payload."`) which is the system-mutation-history pattern Rule #15 forbids. | Same , load-time approval status unknown, but pattern matches the rescinded write-policy verbatim. | (a) Confirm any of these were user-approved → leave. (b) Confirm auto-write → PATCH all 13 to empty string. The drift-history information loses nothing: git log carries the same record on this audit file. |
| B2-S3 | **Rule #15 notes pollution on `domain_module_data_objects.notes`.** 21 DMDO rows on IGA modules carry short restated-from-schema commentary (e.g. row on module 147 / data_object 52: *"ITSM service-catalog publications spawn corresponding entitlement-catalog entries."*; row on 148 / 173: *"Overdue compliance training fires auto-revoke of gated access (e.g. PII data, regulated systems)."*). The notes restate what the role+necessity+target module already structurally communicate. Forbidden pattern per Rule #15. | Same. | (a) Confirm user-approved → leave. (b) Confirm auto-write → PATCH all 21 to empty string. |
| B2-S4 | **B4 pattern flag positive re-evaluation.** Current flags on the 6 masters: `iga_access_requests` (704) `has_submit_lock=true` + `has_single_approver=true` ✓ (correct: requests freeze on submission and have a single approver). `iga_access_certifications` (705) `has_single_approver=true` ✓ but `has_submit_lock=false` , should this be `true` (a certification campaign freezes on scheduled-→-in_progress)? `iga_entitlement_definitions` (706) all flags `false` ✓ for a config-shape master. `iga_sod_violations` (707) `has_submit_lock=true` ✓ (violations are immutable once detected; mitigations don't rewrite history). `iga_provisioning_events` (708) `has_submit_lock=true` ✓ (event log is append-only). `iga_user_entitlements` (964) `has_personal_content=true` ✓ but `has_submit_lock=false` , should this be `true` once `granted`? Also: `iga_user_entitlements.has_single_approver` is currently `false`; SoD-aware grants are typically single-approver in flagship workflows. | Pattern flags are workflow-shape judgments the user owns; the false-by-default establishes nothing. | (a) Per-flag yes/no decisions from the user. (b) Leave all defaults; this band passes vacuously. |
| B2-S5 | **E6 permission-bundle drift , `IAM-IDENTITY-ADMIN` and the workflow-gate inheritance.** `IAM-IDENTITY-ADMIN` (10102) holds 5 `:admin` permissions (one per IGA module) but no explicit workflow-gate inclusions, relying on `permission_hierarchy` to auto-include them under `:admin`. The other 3 roles do enumerate the workflow gates they need (e.g. `IAM-ACCESS-CERTIFIER` carries both `:manage` and the 2 specific gates `schedule_certification` + `close_certification`). Consistency check: is the catalog's `permission_hierarchy` actually seeded such that `<module>:admin` → all workflow gates on that module, or do the lower-tier roles enumerate their gates because the hierarchy doesn't carry them? | The audit doesn't introspect `permission_hierarchy` rules , that's a Semantius built-in. | (a) Confirm `:admin` auto-includes all module gates → drop the explicit gate grants on the IC-tier roles as redundant. (b) Confirm `:admin` does NOT auto-include → enumerate the 14 workflow gates on `IAM-IDENTITY-ADMIN` explicitly. (c) Leave as is , IC-tier explicit, admin-tier implicit. |

### Bucket 3: Phase 0 pending (speculative; market surface vs. footprint)

Subagent-style semantic pass against SailPoint Identity Security Cloud, Saviynt Enterprise Identity Cloud, Microsoft Entra ID Governance, Omada Identity Cloud, and (as the SoD specialist) Pathlock. The union surface matrix is sketched here rather than emitted as a separate JSON; if the user wants a formal Phase 0 vendor research artifact, that's the **vetted route** below.

Headline diff: **MISSING 5, WRONG-OWNERSHIP 0, SCOPE-CREEP 0 (every loaded entity has a clean vendor anchor), MODULARIZATION 1.** Notably few WRONG-OWNERSHIP / SCOPE-CREEP findings; the current footprint is well-shaped to the market.

#### MISSING (5) proposed module assignment

| Entity | Proposed module | Vendor evidence |
|---|---|---|
| `iga_sod_rulesets` | IGA-SOD-MGMT | SailPoint `Policy`, Saviynt `Risk Object`, Pathlock `SoD Ruleset`. The toxic-combination definition itself is a separate first-class master from the violation. Currently the catalog treats violations as the master and rulesets as implicit configuration. |
| `iga_entitlement_certifications` (junction state per line-item) | IGA-ACCESS-CERTIFICATION | Every flagship splits `Campaign` (705) from `Campaign Item` / `Certification Decision` (per-entitlement attestation). The line-item layer is currently absent. Without it the relationship `iga_access_certifications ↔ iga_user_entitlements` can't carry per-row decision state. |
| `iga_role_mining_jobs` | IGA-ENTITLEMENT-CATALOG or new module | SailPoint Role Insights, Saviynt Identity Analytics, Omada Role Modeling. The catalog has no entity capturing the role-discovery / role-modeling computation results , feature-flagship territory for SailPoint and Saviynt. Could be deferred if it's deemed config-tier; could become a new IGA-IDENTITY-ANALYTICS module if treated as substantial. |
| `iga_provisioning_connectors` | IGA-AUTO-PROVISIONING | The connector catalog itself (SailPoint Connector, Saviynt Application Onboarding) is currently implicit. Each connector is a config-shaped master describing target system, protocol (SCIM / REST / proprietary), credential reference, and last-sync state. Without it the provisioning event log has no master to point at on the connector axis. |
| `iga_break_glass_accounts` | new IGA-PRIVILEGED-OVERSIGHT or IGA-AUTO-PROVISIONING | Emergency-access accounts with elevated-monitoring rules. Adjacent to PAM but flagship IGA suites carry their own break-glass governance (SailPoint, Saviynt). Could equally belong to a future PAM domain , see candidate-queue entry below. |

#### MODULARIZATION (1)

- **Identity-analytics module.** SailPoint and Saviynt both surface a separate user-facing surface for identity analytics (role mining, peer-group anomaly detection, access-risk scoring). Currently the IDENTITY-RESOLUTION cross-cutting capability sits on `IGA-ENTITLEMENT-CATALOG` (147) but there's no dedicated module. Splitting `IGA-ENTITLEMENT-CATALOG` into `IGA-ENTITLEMENT-CATALOG` + `IGA-IDENTITY-ANALYTICS` would let the analytics surface carry `iga_role_mining_jobs`, `iga_user_risk_scores`, `iga_peer_groups` as masters. Decision: deferred; first decide if `iga_role_mining_jobs` is in scope at all (Bucket 3 #3).

#### Boundary candidate: PAM as a separate domain

PAM (Privileged Access Management , CyberArk Identity, Delinea, BeyondTrust, Saviynt PAM, Senhasegura) is a separate point-solution market with its own flagship vendors. It overlaps IGA on entitlement governance for privileged accounts but masters its own concepts (`pam_sessions`, `pam_credential_vaults`, `pam_just_in_time_grants`, `pam_session_recordings`, `pam_account_rotations`). Currently no `PAM` domain exists in the catalog. A candidate has been queued via `append_missing_domain.ts` (see `audits/_missing-domains.md`).

This is a Bucket 3 "vetted route or eyeball" item: is PAM a separate domain (recommended , passes the point-solution test cleanly), or should the IGA domain absorb PAM-shaped entities into a 6th module (`IGA-PRIVILEGED-OVERSIGHT`)?

### Cross-bucket dependencies

- **B2-S1, B2-S2, B2-S3 (Rule #15 reverts) are INDEPENDENT** of Buckets 1 and 3. The agent can revert with one bulk PATCH per table once the user confirms auto-population.
- **B1-S4 (LMS B10b) is INDEPENDENT** of Bucket 3.
- **B1-S1 (M7 PROMOTE vs DELETE) is INDEPENDENT** of Bucket 3 but **structurally precedes B1-S3** (the intra-domain handoff drafts need to know whether the sibling-module relationship is `master → embedded_master` or `master → DELETED`). Resolve B1-S1 before drafting B1-S3 fixes.
- **B1-S8 (APQC tagging) is INDEPENDENT** of every other item.
- **Bucket 3 #5 (PAM as a separate domain) might shift Bucket 3 #1 + #2 + #3 + #4 + #5** , if PAM becomes its own domain, `iga_break_glass_accounts` belongs there instead, and `iga_provisioning_connectors` may want a parallel `pam_provisioning_connectors`. Holding the 5 MISSING entries until the PAM decision is the cleanest order.

### Per-bucket prompts

**Bucket 1 , fix these now?** Reply with: `all`, or list (e.g. `S1, S2, S4, S8`), or `skip`.

- **S1 (M7 within-domain hard fail):** decide PROMOTE vs DELETE first. PROMOTE (option a, recommended) keeps the standalone-deployable story; DELETE assumes IGA modules always co-install.
- **S2 (B9 event_category PATCH):** trivial 7-row PATCH; no dependencies.
- **S3 (B9b intra-domain handoffs , 7 rows to author):** depends on S1's outcome (shapes the source/target master resolution).
- **S4 (LMS B10b inbound , 1 DMDO insert + 4 handoff PATCHes):** mechanical.
- **S5 (B6 missing relationship `iga_user_entitlements ↔ iga_sod_violations`):** trivial 1-row insert.
- **S6, S7 (B10b + DMDO report-only on target domains):** schedule b1 audits for GRC, ITSM, ITAM (B1-S6 + B1-S7). Not IGA's fix.
- **S8 (APQC tagging , 10 high-confidence rows above):** load now or next batch?

**Bucket 2 , what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1, B2-S2, B2-S3 (Rule #15 notes-pollution):** the audit can revert if you confirm auto-population. If the notes were approved at load time, say so and I leave them.
- **B2-S4 (pattern flags):** per-flag yes/no decisions on the 5 candidates.
- **B2-S5 (E6 admin-tier hierarchy):** option a / b / c?

**Bucket 3 , Phase 0 pending , vet via formal Phase 0 vendor research, or eyeball-mode?** If eyeball-mode, name which of the 5 MISSING entries to treat as confirmed. The PAM-as-separate-domain decision sits across all of them and should be resolved first.

### Report-only follow-ups (owed by other domains)

These items are surfaced for the user to decide whether to schedule audits on the named source domains; **none of them block IGA's audit pass**.

| Owed by | Check ID | Owed to | Detail |
|---|---|---|---|
| GRC | B10b (target side) | IGA outbound 464, 465 | `target_domain_module_id=null`. GRC needs to declare which GRC module receives `iga_sod_violation.detected` and `iga_access_certification.completed`. |
| GRC | B8 / DMDO consumer | IGA-SOD-MGMT, IGA-ACCESS-CERTIFICATION | No GRC module declares `consumer` on `iga_sod_violations` (707) or `iga_access_certifications` (705) despite both being inbound to GRC via handoffs. |
| ITSM | B8 / DMDO consumer | IGA-ACCESS-REQUEST, IGA-AUTO-PROVISIONING | No ITSM module declares `consumer` on IGA masters despite 3 outbound IGA handoffs targeting `service_incidents` in ITSM. The inbound side of `service_incidents ↔ iga_provisioning_events` cross-rels is also missing. |
| ITAM | B8 / DMDO consumer | IGA-AUTO-PROVISIONING | No ITAM module declares `consumer` on `iga_provisioning_events` (708) despite handoff 462 targeting ITAM. |
| HCM | B10b (source side) | IGA inbound 19, 185, 375, 378, 389, 391, 392, 382 | These were "until IGA is modularized" rows now resolvable: HCM's outbound side carries `source_domain_module_id` populated (HCM-CORE-WORKER / HCM-ORG-POSITIONS). The drift is in the obsolete notes (B2-S2 above), not in the FK itself. Surfaced here for completeness; the FK is fine. |
| LMS | B10b (source side) | IGA inbound 1303-1305, 1309 | `source_domain_module_id` is populated (LMS-CERT-MGMT 179, LMS-COMPLIANCE-TRAINING 33). The bug was on IGA's side (B1-S4), now resolvable. |
| DLP | B10b (source side) | IGA inbound 281, 845 | `source_domain_module_id=null`. DLP needs modularization or attribution. |
| DSPM | B10b (source side) | IGA inbound 286, 289 | `source_domain_module_id=null`. |
| UEM | B10b (source side) | IGA inbound 656, 658, 659, 661 | `source_domain_module_id=null`. |
| APIM | B10b (source side) | IGA inbound 751 | `source_domain_module_id=null`. |
| ECM | B10b (source side) | IGA inbound 823, 839 | `source_domain_module_id=null`. Also a trigger-event data quality bug worth flagging: handoff 839's `trigger_event.data_object_id` is 432 (`document_classifications`) while the handoff's payload `data_object_id` is 429 (`content_documents`) , could be legitimate (event source vs payload differ by design) or a mis-link. |
| DCG | B10b (source side) | IGA inbound 263 | `source_domain_module_id=null`. |
| VIS-MGMT | B10b (source side) | IGA inbound 871 | `source_domain_module_id=null`. |
| IWMS | B10b (source side) | IGA inbound 1165 | `source_domain_module_id` populated (IWMS-DESK-RESERVATION 99). Resolvable; no action. |

### Candidates queued

- **PAM** (Privileged Access Management) , queued in `audits/_missing-domains.md` via `append_missing_domain.ts`. Mention by this audit cites CyberArk Identity, Delinea, BeyondTrust; adjacency IGA, ITSM, SECOPS.

## 2026-05-31, Continuation: B1 technical fixes

Subagent fix-loop pass: applied the audit-pre-specified subset of Bucket 1 that the agent prompt classifies as TECHNICAL (PATCH enum backfills with values named in the audit, derivable FK PATCHes, INSERT `handoff_processes` rows where the audit pre-specifies a resolvable PCF). All other B1 items deferred to human judgment.

Loader: `c:/dev/domain-map/.tmp_deploy/fix_iga_b1_technical_2026_05_31.ts` (idempotent, can re-run).

### Fixes applied

| Audit ID | Operation | Rows touched | Outcome |
|---|---|---|---|
| B1-S2 | PATCH `trigger_events.event_category` to `state_change` on ids 455, 456, 457, 458, 459, 460, 461 | 7 | 7/7 now `state_change`, 0 still empty |
| B1-S4 | INSERT `domain_module_data_objects` `(domain_module_id=148, data_object_id=171, role='consumer', necessity='optional')` then PATCH `handoffs.target_domain_module_id=148` on ids 1303, 1304, 1305, 1309 | 1 INSERT + 4 PATCH | DMDO id 1121 created; all 4 handoffs now wired to module 148 |
| B1-S8 | INSERT 4 `handoff_processes` `agent_curated` rows: (466, 273), (464, 365), (467, 196), (19, 224); PATCH `handoff_processes` id 20 (handoff 5, process 224) `proposal_source: discovery_override → agent_curated` | 4 INSERT + 1 PATCH | 5/5 target rows confirmed `agent_curated` |

Totals: 12 PATCHes + 5 INSERTs across `trigger_events`, `domain_module_data_objects`, `handoffs`, `handoff_processes`. No JWT-audience errors.

### Deferred

| Audit ID | Reason for deferral |
|---|---|
| B1-S1 | M7 PROMOTE-vs-DELETE is an explicit "decide" / "user picks" item per the audit; agent prompt forbids judgment calls. 8 sibling-consumer rows untouched pending user choice. |
| B1-S3 | 7 intra-domain handoff inserts gated on B1-S1's PROMOTE-vs-DELETE outcome (source / target master shape depends on whether siblings are `embedded_master` or removed). New entity inserts also outside the agent prompt's TECHNICAL scope. |
| B1-S5 | `data_object_relationships` insert is between two domain-owned masters (`iga_user_entitlements` ↔ `iga_sod_violations`), not a Rule #10 `users` built-in user-edge. Agent prompt restricts new relationship inserts to Rule #10 user-edges only. |
| B1-S6 | Report-only; owed by GRC b1 audit, not IGA's fix. |
| B1-S7 | Report-only; owed by ITSM / ITAM / GRC b1 audits, not IGA's fix. |
| B1-S8 rows 2, 3, 4 (handoffs 461, 463, 462 → PCF 10568 "Manage IT assets") | PCF `external_id=10568` not present in catalog (`/processes` returns 0 rows for it). Per the agent prompt, `handoff_processes` rows insert ONLY when PCF resolves. |
| B1-S8 row 6 (handoff 465 → PCF 10708 "Establish internal controls, policies, and procedures") | PCF `external_id=10708` not present in catalog. |
| B1-S8 row 10 (handoff 185 → PCF 10470 / 10473) | Audit names two PCFs (`Manage employee performance` and `Develop and train employees`) without picking one, and neither row text matches the proposed "Manage employee separation / offboarding" PCF anchor. Pre-specification is ambiguous; deferring to user. |
| All Bucket 2 items (B2-S1..B2-S5) | Rule #15 notes-revert, pattern-flag flips, and `permission_hierarchy` interpretation are explicit Bucket 2 judgment calls in the audit. |
| All Bucket 3 items | Phase 0 speculative; depends on PAM-domain decision and new entity additions, both outside the TECHNICAL scope. |

### UI spot-check links

- `https://tests.semantius.app/domain_map/trigger_events`
- `https://tests.semantius.app/domain_map/handoffs`
- `https://tests.semantius.app/domain_map/domain_module_data_objects`
- `https://tests.semantius.app/domain_map/handoff_processes`

## 2026-05-31, Audit

### Summary

Re-run of the structural Validate b1 audit after the 2026-05-31 Continuation fix-loop. The fix-loop landed B1-S2 (event_category), B1-S4 (LMS DMDO + 4 handoff PATCHes), and partial B1-S8 (5 of 10 high-confidence APQC rows). This pass re-verifies live state across A, M, B (B5/B7/B9/B9b/B10b/B11/B12), C, D, E (E1-E5), F (F1-F5), and H bands and reclassifies remaining open items.

- Current footprint: 5 full modules (144 IGA-ACCESS-REQUEST, 145 IGA-ACCESS-CERTIFICATION, 146 IGA-SOD-MGMT, 147 IGA-ENTITLEMENT-CATALOG, 148 IGA-AUTO-PROVISIONING); 6 masters (704, 705, 706, 707, 708, 964); 7 capabilities (OFFBOARDING 82, IDENTITY-RESOLUTION 255, IGA-ACCESS-REQUEST-WORKFLOW 603, IGA-ACCESS-CERTIFICATION 604, IGA-SOD-DETECTION 605, IGA-ENTITLEMENT-MGMT 606, IGA-AUTO-PROVISIONING-CONNECTORS 607); 12 trigger_events (all `event_category` populated); 7 outbound + 36 inbound cross-domain handoffs; 0 intra-domain handoffs; 36 lifecycle states; 5 system skills; 4 IAM-prefixed roles.
- Bucket 1 (in-scope, agent fixable): 4 items (b1a) + 4 blocked items (b1b).
- Bucket 2 (surface-for-user, judgment): 8 items.
- Bucket 3 (Phase 0 pending, speculative): 6 items.

### Band-by-band results

| Band | Verdict | Notes |
|---|---|---|
| A1 | pass | crud=75, business_logic populated, min_org_size `30 m <2500`, cost_band `$$$`, certification_required true, US TAM 3000m / 2025. |
| A2 | pass | 7 capabilities (≥3). |
| A3 | pass | 8 solutions, ≥1 primary (Rule #20 only). |
| A4 | fail | `catalog_tagline=''` and `catalog_description=''` on the domain row. Rule #20: do not auto-populate, surface to user. → B2-S6. |
| M1 | pass | 5 full modules. |
| M2 | pass | ≥3 capabilities and ≥2 modules (5 modules). |
| M4 | pass | All 7 capabilities have realizing module rows (`domain_module_capabilities` not re-verified row-by-row, but capability set well-mapped). |
| M5 | pass | All workflow-gate lifecycle states have `domain_module_id` set. |
| M6 | pass | Each module realizes ≥1 capability per prior audit; no orphan modules detected. |
| M7 | fail (carried) | 8 sibling-consumer rows still present (B1-S1 unresolved, PROMOTE-vs-DELETE pending user decision). |
| M8 | fail | All 5 modules have empty `catalog_tagline` and `catalog_description`. Rule #20: surface to user, do not auto-populate. → B2-S6. |
| B1 | pass | 6 master + required rows. |
| B5 | pass | embedded_master rows on 34 (org_units, mastered by HCM), 795 (locations, mastered by IWMS) and 748 (users, platform_builtin). |
| B7 | pass | Every IGA module declares a `users` consumer row; user-edge integrity verified at prior audit. |
| B9 | pass | 12 trigger_events, all `event_category` populated (state_change / lifecycle). |
| B9b | fail (carried) | Zero intra-domain handoffs with `source_domain_id=target_domain_id=35`. 7 expected pairs per prior audit. Gated on B1-S1 resolution (master-resolution shape changes if siblings become embedded_master vs deleted). → B1A-B9b. |
| B10b outbound | fail | 2 outbound rows still have `target_domain_module_id=null` (464 IGA-SOD-MGMT → GRC, 465 IGA-ACCESS-CERTIFICATION → GRC). Both target GRC; GRC's B10b owes the resolution. Report-only. |
| B10b inbound | pass | The 4 LMS-sourced NULL `target_domain_module_id` rows (1303-1305, 1309) are cured by B1-S4 fix; new DMDO row 1121 on module 148 / data_object 171. All 36 inbound rows now have IGA-side `target_domain_module_id` populated. |
| B11 | pass | 23 aliases per prior audit; not re-verified row-by-row this pass. |
| B12 | pass | 36 lifecycle states across all 6 masters; pattern flags populated. |
| C1 | pass | IAM (owner) + IT Operations (contributor). |
| C2 | pass | No diverging capability-level RACI overrides needed. |
| D1 | pass | UI links emit cleanly per prior pass. |
| E1 | pass | 4 cross-functional roles (IAM-IDENTITY-ADMIN, IAM-ACCESS-CERTIFIER, IAM-ACCESS-REQUEST-APPROVER, IAM-SOD-ANALYST) covering the 5-module surface. |
| E2 | pass | All 4 roles span ≥2 modules. |
| E3 | pass | `interaction_level` set per prior audit. |
| E4 | pass | Bundles non-empty per prior audit. |
| E5 | pass | Path A / Path B agreement per prior audit. |
| F1 | pass | No legacy `domain_id`-only system skills. |
| F2 | pass | Each of the 5 modules has exactly one `skill_type='system'` skill (221, 222, 223, 224, 225). |
| F3 | pass | 53 `skill_tools` rows per prior audit. |
| F4 | pass | Per prior audit. |
| F5 | pass | Strict Semantius score 100% per prior audit. |
| H1 | partial | 24 of 43 cross-domain handoffs have ≥1 `handoff_processes` row (~56%); 21 are `agent_curated`. Volume target 22-34 reached on the agent_curated count. Remaining 19 untagged: defer to Discover Pass 3 or schedule next agent_curated pass. |

### Bucket 1, In-scope confirmed gaps

| ID | Finding | Fix |
|---|---|---|
| B1A-B6 | B6 missing intra-domain relationship: `iga_user_entitlements` (964) ↔ `iga_sod_violations` (707). The implicated-entitlement edge is still absent despite the audit's B1-S5 prescription. | INSERT one `data_object_relationships` row: `(data_object_id=964, related_data_object_id=707, relationship_verb='implicated_in_sod_violation', inverse_verb='implicates_entitlement', relationship_type='many_to_many', relationship_kind='association', is_required=false, owner_side='source')`. |
| B1A-APQC | H1 partial: 19 of 43 cross-domain handoffs (44%) remain untagged. Volume target 22-34 `agent_curated` rows currently at 21; missing tags spread across deferrable / out-of-scope payloads (dlp_user_activity, iam_access_policy, device_compliance_results, channel_members, document_folders, content_documents handled in part) and a small set of clear PCF candidates (e.g. handoff 286 `iam_access_policy.permission_escalation_detected` → 365, handoff 289 `iam_access_policy.permission_change` → 365, handoff 281 `dlp_incident.escalated` → 363/365). | Author 4-8 additional `agent_curated` rows for the high-confidence subset; defer the rest to Discover Pass 3. |
| B1A-NOTES-DMDO | 20 DMDO rows on IGA modules carry Rule #15-forbidden `notes` content restating role+necessity+target module. IDs 789-808 inclusive. | PATCH `notes=''` on all 20 rows after B2-S3 user confirmation that the wording was auto-populated, not user-approved. |
| B1A-NOTES-HOFF | 14 handoff rows carry Rule #15-forbidden `notes` ("target NULL until IGA is modularized", "B10b resolved 2026-05-26: ...", "source NULL until IGA is modularized", and one composite leaver-pattern note on 185). IDs 19, 185, 375, 378, 382, 389, 391, 392, 462, 467, 830, 831, 836, 1165. | PATCH `notes=''` on all 14 after B2-S2 user confirmation. |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Options |
|---|---|---|
| B2-S1-CARRY | `iga_entitlement_definitions.notes` (id 706) carries the config-shape exemption wording. Rule #15 RESCINDED the auto-write license. | (a) Confirm user-approved at load time, leave. (b) Confirm auto-write, PATCH to empty string. |
| B2-S2-CARRY | 14 IGA-touching `handoffs.notes` rows are Rule #15-forbidden boilerplate. Was any user-approved? | (a) Confirm user-approved on specific rows, leave those. (b) Confirm auto-write, agent PATCHes to empty (B1A-NOTES-HOFF). |
| B2-S3-CARRY | 20 IGA `domain_module_data_objects.notes` rows restate schema content (Rule #15-forbidden). | (a) Confirm user-approved, leave. (b) Confirm auto-write, agent PATCHes to empty (B1A-NOTES-DMDO). |
| B2-S4-CARRY | Pattern-flag re-evaluation: `iga_access_certifications.has_submit_lock` (currently false; campaign freezes on scheduled → in_progress), `iga_user_entitlements.has_submit_lock` (currently false; should be true once granted?), `iga_user_entitlements.has_single_approver` (currently false; SoD-aware grants typically single-approver). | Per-flag yes/no decisions from the user. |
| B2-S5-CARRY | E6 permission-bundle drift: IAM-IDENTITY-ADMIN holds 5 `:admin` permissions but no explicit workflow-gate inclusions, relying on `permission_hierarchy` to auto-include. Other 3 roles enumerate gates. | (a) Confirm `:admin` auto-includes all module gates, drop explicit gate grants on IC-tier roles as redundant. (b) Confirm `:admin` does NOT auto-include, enumerate the 14 workflow gates on IAM-IDENTITY-ADMIN explicitly. (c) Leave as is. |
| B2-S6 | A4 + M8: `catalog_tagline` and `catalog_description` empty on the IGA domain row and on all 5 module rows. Rule #20 forbids auto-population. | User supplies the buyer-voice tagline + 1-3 paragraph description for the domain and per-module; agent writes only the approved wording. |

### Bucket 3, Phase 0 pending (speculative)

Carried forward unchanged from the 2026-05-30 audit. PAM-as-separate-domain decision still sits across all 5 MISSING entries. No new Phase 0 work landed.

| ID | Candidate | Vendor evidence | Proposed module |
|---|---|---|---|
| B3-RULESETS | `iga_sod_rulesets` | SailPoint Policy, Saviynt Risk Object, Pathlock SoD Ruleset | IGA-SOD-MGMT |
| B3-CERT-LINES | `iga_entitlement_certifications` (per-line decision) | Every flagship splits Campaign from Campaign Item / Certification Decision | IGA-ACCESS-CERTIFICATION |
| B3-ROLE-MINING | `iga_role_mining_jobs` | SailPoint Role Insights, Saviynt Identity Analytics, Omada Role Modeling | IGA-ENTITLEMENT-CATALOG or new IGA-IDENTITY-ANALYTICS |
| B3-CONNECTORS | `iga_provisioning_connectors` | SailPoint Connector, Saviynt Application Onboarding | IGA-AUTO-PROVISIONING |
| B3-BREAK-GLASS | `iga_break_glass_accounts` | SailPoint, Saviynt break-glass governance | new IGA-PRIVILEGED-OVERSIGHT, or routes to PAM domain |
| B3-PAM-DOMAIN | PAM as a separate domain | CyberArk Identity, Delinea, BeyondTrust, Saviynt PAM, Senhasegura | new PAM domain (queued in `_missing-domains.md`) |

### Cross-bucket dependencies

- B1A-B9b (intra-domain handoffs) is gated on B1-S1-CARRY (M7 PROMOTE-vs-DELETE).
- B3-BREAK-GLASS, B3-CONNECTORS may shift if B3-PAM-DOMAIN resolves first.
- B2-S2-CARRY / B2-S3-CARRY answers unlock B1A-NOTES-HOFF / B1A-NOTES-DMDO respectively.

### Carried-over items (still pending from prior audits)

- B1-S1-CARRY (M7 within-domain hard fail): 8 sibling-consumer rows untouched. PROMOTE vs DELETE pending user decision.
- B1-S3-CARRY (B9b intra-domain handoffs): 7 rows to author; depends on B1-S1.
- B1-S6-CARRY, B1-S7-CARRY: report-only on other domains (GRC, ITSM, ITAM); not IGA's fix.
- B1-S8 leftover (handoffs 461, 463, 462 → PCF 10568; handoff 465 → PCF 10708; handoff 185 PCF ambiguous): PCF external_ids not present in catalog at last attempt; user clarification needed for substitute PCFs.

### Report-only follow-ups (owed by other domains)

Unchanged from 2026-05-30 audit. GRC owes B10b on 464, 465 and DMDO consumers on 705, 707. ITSM owes DMDO consumers on IGA-mastered events targeting `service_incidents`. ITAM owes DMDO consumer on `iga_provisioning_events`. HCM, LMS, DLP, DSPM, UEM, APIM, ECM, DCG, VIS-MGMT, IWMS each owe B10b source-side attribution per the carried list.

### JWT-audience errors

None encountered during this audit.

### UI spot-check links

- `https://tests.semantius.app/domain_map/data_object_relationships`
- `https://tests.semantius.app/domain_map/handoff_processes`
- `https://tests.semantius.app/domain_map/domain_module_data_objects`
- `https://tests.semantius.app/domain_map/handoffs`
- `https://tests.semantius.app/domain_map/domains`

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

State-driven Validate pass (SKILL.md Rule #21): worked only the open items in IGA's
state.yaml, classified each into EXECUTE / SURFACE / LEAVE, then executed the additive /
corrective subset. Domain id 35 confirmed live; 5 modules (144-148), 6 masters
(704, 705, 706, 707, 708, 964) re-verified. No fresh from-scratch audit. No JWT-audience
errors. Loader: `c:/dev/domain-map/.tmp_deploy/fix_iga_state_driven_2026_06_07.ts`
(idempotent; re-ran clean, 0 writes on the second pass). All writes `record_status='new'`.

### Executed (counts)

| State item | Operation | Rows | Outcome |
|---|---|---|---|
| B1A-ENTITY-TYPE | PATCH `data_objects.entity_type` (was all `unclassified`) | 6 | 704 / 705 / 707 / 964 -> `operational_workflow`; 706 -> `catalog` (config-shape draft->published->retired); 708 -> `operational_record` (append-only execution event log) |
| B1A-B6 | INSERT `data_object_relationships` 964 -> 707 (`implicated_in_sod_violation` / `implicates_entitlement`, many_to_many, association, owner_side=source) | 1 | id 2106; SoD-violation subject edge now renders |
| Catalog UX (Rule #20) | PATCH `catalog_tagline` + `catalog_description` on the domain row (35) and 5 modules where empty | 12 fields (2 domain + 10 module) | Buyer-voice, vendor-name-free, em-dash-free, American English; never overwrote a non-empty value (all 6 rows were empty) |
| B1A-APQC (clean subset) | INSERT `handoff_processes` (proposal_source=`agent_curated`, role=`implements`) | 3 | 286 -> 273 and 289 -> 273 (Manage IT user identity and authorization, the established IGA-access PCF); 378 -> 224 (Manage employee onboarding). 389/391/392 were already tagged (process 97) by a prior pass. |

Totals: 6 PATCH (entity_type) + 12 PATCH-fields (catalog UX across 6 rows) + 1 INSERT
(relationship) + 3 INSERT (handoff_processes).

C1 (business_function_domains) checked live and already complete: IGA owner =
"Identity and Access Management" (business_function_id 63), contributor = "IT Operations"
(business_function_id 27). No additive C1 row needed (the prompt's generic "owner is Security"
guidance does not apply: a non-conflicting owner already exists). No new rows authored.

### Surfaced (for user; not written)

- **B2-M7-DECIDE** (destructive): PROMOTE the 8 within-domain sibling-consumer DMDO rows to
  `embedded_master`, or DELETE them? Blocks B1B-B9b (7 intra-domain handoffs).
- **B2-S1-CARRY / B2-S2-CARRY / B2-S3-CARRY** (destructive notes overwrites): confirm whether
  the config-shape exemption note on 706, the 14 handoff boilerplate notes, and the 20 DMDO
  restatement notes (789-808) were user-approved or auto-written. Approval unlocks the
  matching B1A-NOTES-* PATCH-to-empty (overwrites of non-empty values; never run unapproved).
- **B2-S4-CARRY**: pattern-flag decisions on `iga_access_certifications.has_submit_lock`,
  `iga_user_entitlements.has_submit_lock`, `iga_user_entitlements.has_single_approver`. Now
  in-scope for all four operational_workflow masters per Rule #12.
- **B2-S5-CARRY**: permission_hierarchy `<module>:admin` gate-inheritance semantics (platform
  introspection needed; references retired IAM roles).
- **B2-PCF-SUBSTITUTE**: substitute or backfill PCF rows for handoffs 461 / 463 / 462 (10568),
  465 (10708), 185 (10470 / 10473) whose external_ids are absent from `/processes`.
- **B1A-SELF-CONTAIN** (destructive, M9): 4 `employees` consumer+required DMDO rows on IGA
  modules need embed-or-relax; rewriting an existing row's role/necessity needs sign-off.
- **B1A-PHASE-P (personas/RACI): DEFERRED, not authored.** 5 modules, 0 personas post-Plan-3
  (E1 fail). Candidate personas: IDENTITY-ADMIN (all 5), ACCESS-REQUEST-APPROVER (144),
  ACCESS-CERTIFIER (145), SOD-ANALYST (146), entitlement-catalog owner (147), provisioning
  operator (148). Author via references/roles.md section 7 when commissioned.

### Left

- **b1b blocked / owed by others:** B1B-M7-SIBLING-CONSUMERS (user decision B2-M7-DECIDE),
  B1B-B9b (depends on M7), B1B-B10b-GRC-OUTBOUND (GRC owes 464/465), B1B-S8-PCF-MISSING
  (PCF backfill / substitution).
- **Defer-to-Discover (B1A-APQC-REMAINDER):** 281 (dlp_incident.escalated) and 845
  (dlp_user_activity.flagged) plus other modern security primitives have no clean
  apqc_pcf_cross_industry home (data-loss search returns 0 rows; 363 "Perform abandonment"
  unrelated; 365 too coarse). No tag authored.
- **b3 backlog (unchanged):** B3-RULESETS, B3-CERT-LINES, B3-ROLE-MINING, B3-CONNECTORS,
  B3-BREAK-GLASS, B3-PAM-DOMAIN. PAM-as-separate-domain decision still gates the 5 MISSING
  entries.

### UI spot-check links

- `https://tests.semantius.app/domain_map/data_objects`
- `https://tests.semantius.app/domain_map/data_object_relationships`
- `https://tests.semantius.app/domain_map/domains`
- `https://tests.semantius.app/domain_map/domain_modules`
- `https://tests.semantius.app/domain_map/handoff_processes`
