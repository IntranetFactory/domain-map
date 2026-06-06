# UEM audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 8 masters in legacy `domain_data_objects` (enrolled_devices, device_configuration_profiles, device_compliance_policies, mobile_app_packages, device_app_assignments, enrollment_tokens, device_deployment_results, device_compliance_results); 5 capabilities (UEM-MDM, UEM-CONFIG, UEM-APP-DIST, UEM-ZTP, UEM-COMPLIANCE); 5 solutions all at `partial` / `secondary` coverage_level (NinjaOne, Kaseya VSA, N-able N-central, ManageEngine Endpoint Central, GoTo Resolve); 12 trigger events; 9 outbound handoffs (all with NULL source module FK); 0 inbound handoffs; 0 lifecycle states; 0 data_object_aliases; 0 intra- and cross-domain `data_object_relationships`; 0 regulations; 1 legacy `domain_id`-only `system` skill (`uem-system`) with 8 platform-covered `query_*` `skill_tools`; 0 roles attached to the End-User Computing business function (UEM owner).
- **Vendor-surface basis:** Pure-play UEM specialists chosen over diversified RMM / ITSM suites: **Microsoft Intune** (Windows / Mobile, enterprise reference schema and conditional access tie-in), **Jamf Pro** (Apple specialist, MDM + zero-touch + app management), **VMware Workspace ONE / Omnissa** (cross-OS UEM, DEX bundled), **Kandji** (modern Apple UEM, automation-first), **Hexnode UEM** (mid-market multi-OS), **IBM MaaS360** (regulated-industries, compliance-heavy). Compliance specialist coverage = Intune + MaaS360 (HIPAA / FedRAMP / GDPR-shaped controls). All current `solutions` rows are RMM / PSA platforms with UEM-as-feature, not UEM pure-plays, which biases the catalog's coverage_level toward `partial`.
- **Domain Semantius score (strict, single legacy skill):** 8 / 8 = **100%**, but only because the legacy skill has no `mutate` / `inbound` / `fetch` / `side_effect` / `compute` tools loaded. Score is structurally meaningless until F2 is cured (modules + per-module system skills).
- **Bucket 1 (in-scope, agent fixable):** 22 items.
- **Bucket 2 (surface-for-user, judgment):** 13 items.
- **Bucket 3 (Phase 0 pending, speculative):** 5 items.
- **Candidates queued to `_missing-domains.md`:** 5 (MAM, MTD, DEX, PATCH-MGMT, BROWSER-MGMT).
- **Top headline:** UEM is **non-modularized** (M1 fails). Every downstream concern (M2, M4-M7, B-band module attribution, E-band roles, F2-F5 system skills, H1 APQC tagging) is blocked behind authoring the module set first.

### Vendor surface basis (Pass 2 detail)

Pure-play UEM specialists, all selling UEM as the flagship product (not as a bundle):

| Vendor | Specialist scope | Why included |
|---|---|---|
| Microsoft Intune | Windows + Mobile + macOS; reference enterprise UEM | Largest installed base; conditional-access integration with Entra ID is reference market shape. |
| Jamf Pro | Apple-only specialist | Sets the bar for macOS / iOS / iPadOS UEM; zero-touch via ADE flagship. |
| VMware Workspace ONE / Omnissa | Cross-OS UEM, DEX bundle | Historic AirWatch pedigree; full lifecycle + experience monitoring. |
| Kandji | Modern Apple-only UEM | Liftoff blueprints, automation as first-class; product-led. |
| Hexnode UEM | Mid-market multi-OS | Linux + IoT coverage rare among pure-plays. |
| IBM MaaS360 | Regulated-industries UEM | HIPAA / FedRAMP-shaped controls; threat-defense bundled (compliance specialist). |

Solutions actually loaded in catalog today are RMM platforms (NinjaOne, Kaseya VSA, N-able N-central, GoTo Resolve) plus ManageEngine Endpoint Central (closer to UEM but ITSM-aligned). Zero overlap with the pure-play surface above. This is a SCOPE-CREEP-into-UEM symptom from RMM (audit reference: A3 mark).

### Pass 3, Neighbor discovery

Auto-discovered from the catalog: 4 neighbors via outbound handoffs (no inbound rows exist), zero via cross-domain DMDO (UEM has no modules so the DMDO side is empty).

| Neighbor | Outbound handoffs (UEM to N) | Inbound (N to UEM) | DMDO dependency (UEM masters consumed by N) | Edge weight |
|---|---|---|---|---|
| IGA | 4 (events 665, 667, 671, 672) | 0 | 2 (IGA-AUTO-PROVISIONING consumes `enrolled_devices`, `device_compliance_results` as `consumer + optional`) | 6 |
| ITSM | 3 (events 665, 671, 669 to `service_incidents`) | 0 | 0 (no UEM master appears in any ITSM module DMDO) | 3 |
| HAM | 1 (event 666 `enrolled_device.retired` to `enrolled_devices`) | 0 | 0 | 1 |
| SAM | 1 (event 674 `device_app_assignment.deployed` to `device_app_assignments`) | 0 | 0 | 1 |

Deep-dive pairs (weight >= 3): **IGA**, **ITSM**. Light pairs (weight 1-2): **HAM**, **SAM** (one-line summaries).

Other expected neighbors with zero rows today (Pass 2 / Phase 0 hypothesis, not auto-discovered): **RMM** (overlap candidate, should fan out config drift / patch policies), **SECOPS** (mobile threat events to SIEM), **GRC** (compliance evidence), **EDR** (compliance posture exchange), **VULN-MGT** (patch backlog handoff). All currently zero edges; surfaced in Bucket 2 / 3.

### Pass 4, Pairwise reconciliation (per neighbor)

#### UEM and IGA (deep dive)

| Leg | Status | Detail |
|---|---|---|
| 1. Producer master + lifecycle state | FAIL | UEM masters carry zero lifecycle states (B12). The events `enrolled_device.enrolled` (665), `.lost_or_stolen` (667), `device_compliance_result.non_compliant` (671), `.compliant` (672) imply states `enrolled` / `lost_or_stolen` / `non_compliant` / `compliant` on the respective masters; none authored. |
| 2. Trigger event row | PASS | All 4 events exist (665, 667, 671, 672) with correct `data_object_id`. |
| 3. Handoff with both module FKs | PARTIAL FAIL | All 4 handoff rows (656, 658, 659, 661) carry `source_domain_module_id=NULL` because UEM has no modules. `target_domain_module_id=148` (`IGA-AUTO-PROVISIONING`) is populated on every row. |
| 4. Consumer DMDO on target | PASS (partial) | `IGA-AUTO-PROVISIONING` has DMDO rows on `enrolled_devices` and `device_compliance_results` as `consumer + optional`. Missing DMDO coverage on the other UEM masters IGA might depend on (`device_compliance_policies` for policy-aware access, `enrollment_tokens` for self-service joining). |

Section diff: section 2 (NULL FK) is fully resolvable once UEM modules exist; section 3 (missing handoffs) candidate `device_compliance_policy.published` (event 670) to IGA-AUTO-PROVISIONING (so IGA picks up new policies to evaluate); section 4 (boundary integrity) clean; section 5 (cross-domain relationships mirror) FAIL on every event, zero `data_object_relationships` mirror UEM to IGA today.

#### UEM and ITSM (deep dive)

| Leg | Status | Detail |
|---|---|---|
| 1. Producer master + lifecycle state | FAIL | Same root cause as UEM and IGA. |
| 2. Trigger event row | PASS | Events 665, 669, 671 exist. |
| 3. Handoff with both module FKs | PARTIAL FAIL | All 3 rows (655, 660, 663) carry `source_domain_module_id=NULL`; `target_domain_module_id=38` (`ITSM-INCIDENT-MGMT`) populated. **Note:** payload on these rows is `service_incidents` (id 47), NOT a UEM-mastered data_object. This is correct (the side effect lands as an ITSM incident), but the structural relationship is `(UEM master) triggers (ITSM service_incident)` and the data_object_relationship row is missing on both ends. |
| 4. Consumer DMDO on target | PASS by construction | `service_incidents` is mastered by ITSM-INCIDENT-MGMT, no consumer wiring needed; the inbound is to the master. |

Section diff: section 2 (NULL FK) resolvable once UEM modules exist; section 3 (missing handoffs) candidate `device_deployment_result.failed` (event 676) to ITSM-INCIDENT-MGMT (parallel to drift_detected); section 5 cross-domain relationship rows missing for all 3 ITSM-bound events.

#### UEM and HAM (one-line)

1 outbound (event 666 `enrolled_device.retired` to HAM). `source_domain_module_id=NULL`; HAM `target_domain_module_id` ALSO NULL, both sides need module attribution. Possible inbound expectation from HAM: `hardware_asset.received` should fan out into UEM (zero-touch enrollment trigger), `target_domain_module_id` on the UEM side would be a `UEM-DEVICE-LIFECYCLE` (TBD). Report-only follow-up: HAM B9 owes outbound on `hardware_assets.deployed` to UEM (asset moves into enrolled state).

#### UEM and SAM (one-line)

1 outbound (event 674 `device_app_assignment.deployed` to SAM). SAM has zero modules per the catalog (id 52 returns no `domain_modules` rows). Both `source_domain_module_id` and `target_domain_module_id` are NULL by upstream gap. Report-only: SAM is itself non-modularized (its own M1 fails), so this NULL FK pair is blocked behind SAM's M-band fix.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 (Rule #14) | UEM has zero `domain_modules` rows. Without modules, B-band module attribution, E-band roles, F-band system skills, and H-band APQC tagging are all blocked. With >= 3 capabilities (5 today), UEM also fails M2 (>= 2 modules required). | Author module set. Proposed shape (sub-section below) based on capability mapping: `UEM-DEVICE-LIFECYCLE`, `UEM-POLICY-CONFIG`, `UEM-APP-DELIVERY`, `UEM-COMPLIANCE-POSTURE`. Decide split before any downstream load. |
| B1-S2 | M4 | All 5 capabilities (UEM-MDM, UEM-CONFIG, UEM-APP-DIST, UEM-ZTP, UEM-COMPLIANCE) are orphaned, no realizing module. | Bundled with B1-S1; once modules exist, link via `domain_module_capabilities`. |
| B1-S3 | M5 | Lifecycle states with `requires_permission=true` cannot have `domain_module_id` set when no modules exist. | Bundled with B1-S1 + B1-S7. |
| B1-S4 | A4 (Rule #20) | `catalog_tagline` and `catalog_description` are both empty strings. | Draft per Rule #20 in buyer voice and surface for user approval BEFORE PATCH. Sample tagline: *"Enroll, configure, and secure laptops, phones, and tablets across Windows, Apple, Android, and ChromeOS from a single console."* Sample description: 1-3 paragraphs covering the buyer's workflow (zero-touch onboarding, ongoing policy enforcement, compliance posture). |
| B1-S5 | A3 / coverage_level | All 5 loaded solutions have `coverage_level` in {`partial`, `secondary`}. Zero `primary`. Per A3 pass criterion, >= 1 `primary` is required. Today's solutions (NinjaOne, Kaseya VSA, N-able N-central, GoTo Resolve, ManageEngine Endpoint Central) are RMM / PSA platforms that bundle limited UEM, not UEM pure-plays. | INSERT pure-play vendors + solutions: Microsoft Intune (Microsoft Corporation), Jamf Pro (Jamf Holding Corp.), VMware Workspace ONE / Omnissa Workspace ONE (Omnissa LLC after VMware spin-off), Kandji (Kandji Inc.), Hexnode UEM (Mitsogo Inc.), IBM MaaS360 (IBM). Link via `solution_domains` at `coverage_level='primary'`. Re-evaluate the 5 existing RMM rows: demote to `partial` (already there) or move primary attribution to a future RMM domain row if RMM is canonicalized as its own market entry (RMM exists at id 130). |
| B1-S6 | B2 / B11 | Eight masters with no `data_object_aliases`. Universal vendor synonyms apply: `enrolled_devices` and Intune `managedDevices`, Jamf `computers` / `mobile_devices`, Workspace ONE `Devices`; `device_configuration_profiles` and Intune `deviceConfigurations`, Jamf `configuration_profiles`, Workspace ONE `Profiles`; `device_compliance_policies` and Intune `compliancePolicies`, Jamf `smart_groups` (looser fit); `mobile_app_packages` and Intune `mobileApps`, Jamf `mobile_device_applications` / `mac_applications`; `device_app_assignments` and Intune `mobileAppAssignments`, Jamf `mac_application_configurations`; `enrollment_tokens` and Intune `enrollmentProfiles`, Jamf `pre_stage_enrollments`, Apple `automated_device_enrollment_profiles`. | Author 8 alias rows (1-3 each) bundled into a focused loader. |
| B1-S7 | B12 (Rule #12) | Zero lifecycle states on any of the 8 masters. Every master has a real workflow: `enrolled_devices` (pending to enrolled to compliant / non_compliant to lost_or_stolen / retired), `device_configuration_profiles` (draft to published to assigned to drift_detected), `device_compliance_policies` (draft to published to revoked), `mobile_app_packages` (uploaded to published to deprecated), `device_app_assignments` (assigned to deployed to failed / removed), `enrollment_tokens` (issued to consumed / revoked / expired), `device_deployment_results` (queued to succeeded / failed), `device_compliance_results` (evaluating to compliant / non_compliant). The 12 already-authored trigger events imply the state vocabulary; the states themselves are missing. | Author state rows per master, marking workflow gates (`requires_permission=true`) on `published` / `revoked` / `lost_or_stolen` / `retired`. Anchor `domain_module_id` to the realizing module from B1-S1. |
| B1-S8 | B4 / Rule #12 | Pattern flags considered but not positively reviewed. Candidates: `enrolled_devices.has_personal_content=true` (BYOD scope, device carries personal data; downstream privacy guardrails apply), `enrollment_tokens.has_submit_lock=true` (one-time-use token semantics), `device_compliance_policies.has_submit_lock=true` (published policy versions are immutable; new version = new row). | PATCH the flag where the pattern applies after the user confirms each. |
| B1-S9 | B7 (Rule #10) | Zero `users` edges on the 8 masters. `enrolled_devices` should edge to `users` (assigned_user, last_seen_user), `enrollment_tokens` to `users` (issued_to_user), `device_configuration_profiles` to `users` (created_by), `device_compliance_policies` to `users` (policy_owner), `mobile_app_packages` to `users` (uploaded_by). | Load 5 `data_object_relationships` rows per Rule #10 (kind=`platform_builtin`, target id 748). |
| B1-S10 | B6 | Zero intra-domain `data_object_relationships` between UEM masters. Required edges: `enrolled_devices` and `device_app_assignments` (assigned to device), `enrolled_devices` and `device_compliance_results` (result per device), `enrolled_devices` and `device_deployment_results` (deployment per device), `device_configuration_profiles` and `enrolled_devices` (profile assigned to device, M:N), `device_compliance_policies` and `device_compliance_results` (result evaluated against policy), `mobile_app_packages` and `device_app_assignments` (assignment of which package), `enrollment_tokens` and `enrolled_devices` (token consumed by device). | Author 7 relationship rows with verbs + cardinality + necessity + owner_side. Bundle into the same loader as B1-S9. |
| B1-S11 | B8 (outbound) | Zero cross-domain `data_object_relationships` mirroring the 9 outbound handoffs. Required outbound mirrors (UEM master to neighbor master): `enrolled_devices` to `users` already covered; `enrolled_devices` to `hardware_assets` (HAM), `enrolled_devices` to `access_grants` or `accounts` (IGA), `device_compliance_results` to `access_decisions` (IGA), `device_app_assignments` to `software_entitlements` (SAM). | Author 5 outbound `data_object_relationships` rows. |

#### BOUNDARY findings

| ID | Finding | Fix |
|---|---|---|
| B1-B1 | All 9 outbound handoffs (655, 656, 657, 658, 659, 660, 661, 662, 663) have `source_domain_module_id=NULL`. Per B10b, this is in-scope for UEM (source side). | Once B1-S1 lands modules, run a focused backfill: deterministic derivation per B10b (strongest-role module mastering the trigger_event's `data_object_id`). With a 4-module split: events on `enrolled_devices` (665, 666, 667) to `UEM-DEVICE-LIFECYCLE`; on `device_configuration_profiles` (669) to `UEM-POLICY-CONFIG`; on `device_compliance_results` (671, 672) to `UEM-COMPLIANCE-POSTURE`; on `device_app_assignments` (674) to `UEM-APP-DELIVERY`. |
| B1-B2 | trigger_events.event_category is empty string `""` on every UEM event (665-676), where the valid enum is `lifecycle` / `state_change` / `threshold` / `signal` (Rule #13). | PATCH each row: `enrolled_device.enrolled` / `.retired` / `.lost_or_stolen` to `state_change`; `device_configuration_profile.assigned` / `.drift_detected` to `state_change`; `device_compliance_policy.published` to `lifecycle`; `device_compliance_result.compliant` / `.non_compliant` to `state_change`; `mobile_app_package.published` to `lifecycle`; `device_app_assignment.deployed` to `state_change`; `enrollment_token.issued` to `lifecycle`; `device_deployment_result.failed` to `state_change`. |
| B1-B3 | F1, legacy `domain_id`-only system skill `uem-system` (id 114, kebab-with-`-system` convention) holds the 8 `query_*` `skill_tools` rows. | After B1-S1 lands modules + per-module system skills (one per module under Rule #17), DELETE row 114. The 8 query tools redistribute to the 4 per-module skills (each module's masters get their `query_*` rows). The reference loader pattern from ATS audit's `skills 127-134` rename applies. |

#### MISSING, Phase B substrate gaps (vendor-confirmed)

These are entities every flagship UEM vendor masters but UEM does not. Each is in the proposed-module column from the Phase 0 hypothesis.

| ID | Entity | Proposed module | Vendor evidence |
|---|---|---|---|
| B1-M1 | `device_groups` | UEM-POLICY-CONFIG | Universal (Intune `deviceGroups` via Entra ID groups, Jamf `smart_groups` / `static_groups`, Workspace ONE `Smart Groups`, Kandji `Blueprints`, Hexnode `Device Groups`). Targeting axis for every assignment. |
| B1-M2 | `device_scripts` | UEM-POLICY-CONFIG | Universal (Intune `deviceManagementScripts`, Jamf `scripts`, Workspace ONE `Scripts`, Kandji `Custom Scripts`, Hexnode `Custom Scripts`). Distinct from configuration profiles. |
| B1-M3 | `device_actions` | UEM-DEVICE-LIFECYCLE | Universal command / action log (Intune `deviceActionResults`, Jamf `mdm_commands`, Workspace ONE `Device Actions`, Kandji `commands`). Restart / wipe / lock / sync issued + result. |
| B1-M4 | `enrollment_profiles` | UEM-DEVICE-LIFECYCLE | Distinct from `enrollment_tokens`: profile = the reusable template (zero-touch / ADE / Autopilot); token = the issued instance. Intune `enrollmentProfiles`, Jamf `pre_stage_enrollments`, Kandji `Blueprints`. Universal. |
| B1-M5 | `device_certificates` | UEM-POLICY-CONFIG | Universal (Intune `windowsCertificateProfiles` / SCEP rows, Jamf `certificates`, Workspace ONE Certificate Authority profiles). Required for Wi-Fi / VPN / mTLS. |
| B1-M6 | `device_users` (junction) | UEM-DEVICE-LIFECYCLE | Per-device assigned user(s) for shared-iPad, kiosk, multi-user-Mac shapes. Intune `userDeviceCheckin`, Jamf `user-to-device assignment`, Workspace ONE `Device Users`. |
| B1-M7 | `policy_assignment_results` | UEM-COMPLIANCE-POSTURE | Per-device per-policy assignment outcome (`deployed`, `failed`, `pending`). Distinct from `device_deployment_results` (whole-deployment) and `device_compliance_results` (state evaluation). Intune `deviceConfigurationDeviceStatuses`, Jamf `policy_logs`, Workspace ONE `Profile Status`. |

#### APQC TAGGING, handoff_processes proposals

For UEM's 9 cross-domain outbound handoffs, the agent-curated APQC PCF mappings. Bucket-1 count for APQC TAGGING = 1 (the H-band is a single line per coverage policy in the count convention, see constraint #10).

The per-handoff proposals (8 confident agent_curated tags + 1 deferred):

| handoff_id | source to target | trigger_event | payload | Proposed PCF | PCF id | hierarchy_level | confidence |
|---|---|---|---|---|---|---|---|
| 655 | UEM to ITSM | enrolled_device.enrolled | service_incidents | Triage IT service delivery incidents | 1299 | L4 (20903) | agent_curated, confident L4 (paired with L3 `Manage IT service support resources` 1297 if a single tag is required for clustering, use 1299 as the implementing activity). |
| 656 | UEM to IGA | enrolled_device.enrolled | enrolled_devices | Manage IT user identity and authorization | 273 | L3 (20756) | agent_curated, confident L3. Device-identity binding at enrolment. |
| 657 | UEM to HAM | enrolled_device.retired | enrolled_devices | Decommission productive assets | 355 | L3 (19258) | agent_curated, confident L3. Asset retirement on retire. |
| 658 | UEM to IGA | enrolled_device.lost_or_stolen | enrolled_devices | Manage IT user authorization | 1196 | L4 (20759) | agent_curated, confident L4. IGA revokes device-context authorization. |
| 659 | UEM to IGA | device_compliance_result.non_compliant | device_compliance_results | Conduct and analyze IT compliance assessments | 271 | L3 (20743) | agent_curated, confident L3. Posture evaluation feeds access decisions. |
| 660 | UEM to ITSM | device_compliance_result.non_compliant | service_incidents | Triage IT service delivery incidents | 1299 | L4 (20903) | agent_curated, confident L4. Non-compliance auto-ticket. |
| 661 | UEM to IGA | device_compliance_result.compliant | device_compliance_results | Manage IT user authentication mechanisms | 1197 | L4 (20760) | agent_curated, confident L4. Compliance restores conditional-access auth path. |
| 663 | UEM to ITSM | device_configuration_profile.drift_detected | service_incidents | Triage IT service delivery incidents | 1299 | L4 (20903) | agent_curated, confident L4. Drift creates remediation ticket. |
| 662 | UEM to SAM | device_app_assignment.deployed | device_app_assignments | _(deferred)_ | n/a | n/a | **Deferred to Discover Pass 3.** APQC cross-industry PCF does not cleanly cover software-asset license consumption flow. Closest candidates `Maintain IT asset records` (1312 / 20918) and `Manage asset resource deployment and utilization` (1335 / 10781) both lean asset-side, not assignment-side. SAM is itself non-modularized (its own M1 fails); resolution belongs to the SAM audit. |

Volume target: 9 cross-domain handoffs imply 0.5N to 0.8N tagged = 4.5 to 7.2; actual 8 agent_curated + 1 deferred is within band.

### Bucket 2, Surface-for-user (judgment calls)

1. **Module split shape.** The Phase 0 hypothesis proposes a 4-module split: `UEM-DEVICE-LIFECYCLE` (enrollment, retirement, lost-stolen, device actions, enrollment profiles), `UEM-POLICY-CONFIG` (configuration profiles, scripts, certificates, device groups), `UEM-APP-DELIVERY` (mobile_app_packages, device_app_assignments), `UEM-COMPLIANCE-POSTURE` (compliance policies, compliance results, policy assignment results). Each module would host 2-4 masters and realize 1-2 capabilities. Alternative shapes: (a) 3-module collapse, fold `POLICY-CONFIG` and `COMPLIANCE-POSTURE` into a single `UEM-CONFIG-COMPLIANCE` module; (b) 5-module split, separate `UEM-ZERO-TOUCH-ONBOARDING` from `UEM-DEVICE-LIFECYCLE`. **Decide before any downstream B-band load.**
2. **`record_status` on existing trigger events.** The 12 trigger events (665-676) were authored before the modularization era. Should the agent re-author them per the corrected `event_category` taxonomy (B1-B2) as a PATCH only, or also re-evaluate the event names for consistency with the future module prefix (e.g. `device_configuration_profile.drift_detected` is fine as-is; could become `uem_device_configuration_profile.drift_detected` for catalog-wide disambiguation, but every other domain uses bare-entity prefixes per Rule #9 naming arbitration)? Recommend status-quo (bare-entity prefix); confirm.
3. **A1 metadata.** `crud_percentage=50` reads as a fair anchor (UEM admin console is CRUD over policies + groups + assignments; the policy compiler and OS-specific MDM protocol implementations are the non-CRUD slice). Confirm or revise. Also: `business_logic` mentions OS-specific MDM protocol implementations, accurate. `min_org_size=20 s <500` reads low (UEM purchases typically start at the s tier but mid-market is the sweet spot). Confirm or bump to `30 m <2500`. `cost_band=$$$` reads plausible. `certification_required=false` is correct (no statutory certification required to sell UEM). `usa_market_size_usd_m=4000` is plausible against IDC's 2024 UEM-segment TAM (~$4B excl. RMM bundles). Confirm.
4. **`catalog_tagline` and `catalog_description` drafts.** Surface-for-user before write (Rule #20). Proposed tagline: *"Enroll, configure, and secure laptops, phones, and tablets across Windows, Apple, Android, and ChromeOS from one console."* Proposed description (3 paragraphs): Para 1 covers workflow (zero-touch enrolment, ongoing configuration, app delivery, compliance posture). Para 2 covers outcomes (consistent device security, reduced IT touch on day-1, conditional access integration). Para 3 covers when buyers reach for UEM vs the alternatives (RMM for MSPs / monitoring-led, EDR for threat hunting, IGA for the identity side). User approves exact wording before PATCH.
5. **Regulation coverage.** UEM is sector-neutral but four regulations have plausible scoping: **GDPR** (BYOD + personal data on enrolled devices, Article 6 lawful basis for processing device-level telemetry), **HIPAA** (healthcare deployments, mobile devices accessing PHI), **CCPA / CPRA** (US personal-info disclosure on devices), **FedRAMP** (US public-sector UEM deployment baseline). None loaded today. Decide: load all 4 (each as `applicability` differentiator) or only the universal one (GDPR). Could be deferred to Phase 0 vendor research.
6. **`coverage_level` rebalancing after S5.** When pure-play UEM vendors land (Intune, Jamf, Workspace ONE / Omnissa, Kandji, Hexnode, MaaS360), the 5 existing RMM / PSA solutions should likely move from `partial` to... what? Options: (a) leave at `partial` (they really are partial UEM), (b) demote further to a future `coverage_level='light'` enum value (not currently in the catalog), (c) move them OFF UEM entirely and onto a new `RMM` domain-link (RMM exists at id 130 but its own solutions list state should be confirmed). Recommend (a), status quo, but flag (c) if the user wants RMM to canonicalize as a separate market entry with these vendors as `primary` over there.
7. **`enrollment_tokens.has_submit_lock=true` semantics.** A one-time-use enrollment token is semantically `submit_lock` (cannot be reused once consumed). But UEM also issues bulk-enroll tokens (e.g. Intune's bulk enrolment profile) which are intentionally reusable. Decide: split into `enrollment_tokens` (one-shot, submit_lock=true) vs the proposed B1-M4 `enrollment_profiles` (template, submit_lock=false), or keep `enrollment_tokens` as the umbrella concept and tag the per-token semantics via a `single_use` boolean column. Recommend the split; confirm.
8. **`enrolled_devices.has_personal_content=true` scope.** Default true is correct for BYOD; false for corporate-owned-fully-managed (COFM) modes. Pattern flags on the master are catalog-wide truths; if some deployments are COFM-only, the flag should be... default-true (BYOD is the conservative posture) or per-deployment override (not a catalog flag at all). Recommend default-true; confirm.
9. **End-User Computing function roles (E1).** Two End-User Computing roles loaded today are `IT-COLLAB-PLATFORM-ADMIN` and `IT-EXTERNAL-COLLAB-STEWARD`, both COLLAB-shaped, neither UEM-shaped. Once UEM modules land, the natural roles are `EUC-DEVICE-ADMIN` (full UEM admin), `EUC-HELP-DESK-DEVICE-OPERATOR` (read + lifecycle action issuance), `EUC-COMPLIANCE-AUDITOR` (read on compliance results, no write), and possibly `EUC-APP-CATALOG-MANAGER`. Should the agent author these after B1-S1 lands modules, or defer until the cross-functional service-desk role bundle (`IT-SERVICE-DESK-AGENT`) is reviewed in its own Validate run for cross-module coverage of UEM? Recommend: author the 3 EUC-prefixed roles, schedule the cross-functional pickup separately.
10. **Capability rename: `UEM-COMPLIANCE` ambiguity.** `UEM-COMPLIANCE` (Endpoint Compliance Policy, id 243) reads as both "compliance policy authoring" and "compliance result evaluation". Splitting into `UEM-COMPLIANCE-POLICY` and `UEM-COMPLIANCE-POSTURE` makes the M4 / M6 mapping cleaner. Decide: rename + add, or fold both responsibilities under the existing single capability.
11. **Inbound expectation from HAM (`hardware_asset.received` to UEM zero-touch).** Pairwise reconciliation surfaced a candidate inbound from HAM (a hardware asset receipt should trigger zero-touch enrolment if the asset is mobile-eligible). HAM does not publish this event today. Report-only on HAM B9, but the user could choose to **schedule HAM B9 follow-up** explicitly (the candidate would land on HAM's next audit pass).
12. **MAM (Mobile Application Management) overlap.** Vendor research surfaced MAM as a candidate market (queued to `_missing-domains.md`). MAM tools (Intune App Protection, Lookout MAM, Hexnode MAM) overlap with UEM-APP-DELIVERY when the device is unmanaged (BYOD-with-MAM-only). If MAM lands as its own domain, UEM-APP-DELIVERY would shrink to managed-device app delivery, with `device_app_assignments` partitioned. Decide: hold MAM as a Bucket-3 / queue candidate (current state, no UEM change needed today), or proactively scope `UEM-APP-DELIVERY` to "managed-device-only" in its description before authoring it.
13. **`notify_person` / `notify_team` abstraction tools on UEM system skills.** Per Rule #17 + Channel-vs-capability rule, the per-module system skills (B1-B3 follow-on) will need notification tools for events like `device_compliance_result.non_compliant` (notify device user) and `enrolled_device.lost_or_stolen` (notify security team). Default to the abstraction (`notify_person` / `notify_team`) unless a specific channel is contractually required. Confirm the default, or name a specific channel UEM workflows actually require.

### Bucket 3, Phase 0 pending (speculative)

Candidate entities surfaced by the market subagent's union surface that are common but not universal across the 6 flagship vendors; need formal Phase 0 vetting (or eyeball-mode) before promotion to Bucket 1.

| Candidate | Proposed module | Vendor knowledge basis |
|---|---|---|
| `device_telemetry_streams` | UEM-COMPLIANCE-POSTURE | Workspace ONE Intelligence, Kandji Pulse, Jamf Protect telemetry. DEX-adjacent. |
| `device_remote_sessions` | UEM-DEVICE-LIFECYCLE | Remote assist / remote control. Intune Remote Help, Jamf Remote, Workspace ONE Assist. Channel ambiguity with RMM. |
| `enrolled_device_blockages` | UEM-COMPLIANCE-POSTURE | Conditional-access block records when policy gates a device. Could be derived from `device_compliance_results` rather than mastered. |
| `device_inventory_snapshots` | UEM-DEVICE-LIFECYCLE | Periodic hardware / software inventory snapshot rows. Distinct from real-time telemetry. Hexnode + Workspace ONE master this; Intune / Jamf treat it as derived. |
| `device_purchase_orders` | _(out of scope; HAM-side)_ | A handful of vendors absorb PO data for procurement-to-enrol flow (Jamf School, Mosyle). Likely belongs in HAM, not UEM. Flag for HAM Phase 0 instead of UEM. |

### Cross-bucket dependencies

- **B1-S1 (modules) gates B1-S2, B1-S3, B1-B1, B1-B3, every other B-band attribution, E1-E6, F2-F5, H1.** Resolve Bucket-1 modules first.
- **Bucket 2 #1 (module split shape) feeds B1-S1 directly.** Cannot author modules without choosing the shape.
- **Bucket 2 #4 (catalog_tagline / catalog_description) is independent** of #1, buyer voice is workflow-level, not module-level.
- **Bucket 2 #5 (regulations) might be informed by Bucket 3** if formal Phase 0 surfaces compliance-mandated entities (FedRAMP control mappings, HIPAA-specific device-tracking). If the user picks the vetted-Phase-0 route, hold #5 until research lands.
- **Bucket 3 #5 (`device_purchase_orders`) is HAM-scoped**, not UEM. Re-routes to HAM Phase 0 if HAM is next.
- **Bucket 2 #11 (HAM inbound expectation) and #12 (MAM overlap) are independent** of UEM's in-scope work; they shape future cross-domain handoffs and module boundaries respectively.

### Per-bucket prompts

**After Bucket 1:** Fix these now? Reply `all`, `just <ids>`, or `skip`. Note: B1-S1 (module set) blocks most items downstream, so the recommended order is: author modules first (B1-S1, B1-S2, B1-S3), then run a second loader for B-band content (B1-S6 through B1-S11 + B1-M1 through B1-M7), then a third loader for B1-B1 (handoff backfill) + B1-B3 (legacy skill retire) + APQC TAGGING. B1-S4 (catalog UX) and B1-S5 (pure-play solutions) can run in parallel as they're independent.

**After Bucket 2:** What's your call on each of the 13? Module split shape (#1) and regulation scope (#5) are the load-bearing ones; the rest are confirmations of defaults. For #4 (catalog_tagline + catalog_description) I'll wait for your exact text per Rule #20, the drafts above are starting points, not what I'll write without sign-off.

**After Bucket 3:** Vet via formal Phase 0 research, or eyeball-mode? If eyeball, name which of the 4 UEM-scoped candidates ring true (`device_telemetry_streams`, `device_remote_sessions`, `enrolled_device_blockages`, `device_inventory_snapshots`); they then move to Bucket 1 in a follow-up pass. The 5th candidate (`device_purchase_orders`) defers to HAM regardless.

### Report-only follow-ups (owed by other domains)

These are NOT in-scope for the UEM fix-load. The user can schedule audits on the source domains to address them.

| Item | Owing domain | Detail |
|---|---|---|
| HAM B9 owes outbound | HAM | `hardware_asset.received` (or equivalent) to UEM should fan out for zero-touch enrolment trigger. Surfaces when HAM is next validated. Candidate trigger event does not exist in `trigger_events` today. |
| HAM B10b | HAM | Handoff 657 (`enrolled_device.retired` to HAM) has `target_domain_module_id=NULL` on HAM's side. HAM has 2 modules (HAM-ASSET-REGISTRY 169, HAM-WARRANTY-PARTS 170); HAM-ASSET-REGISTRY is the natural target. |
| SAM M1 blocker | SAM | SAM has zero `domain_modules` rows. Handoff 662 (`device_app_assignment.deployed` to SAM) has both module FKs NULL. Blocked behind SAM's own M-band fix. |
| SAM APQC TAGGING follow-on | SAM | Handoff 662's APQC mapping was deferred (no clean PCF activity in cross-industry for software-asset license consumption). Belongs to Discover Pass 3 or SAM-specific PCF mapping. |
| IGA B10b | IGA | Inbound to UEM via `IGA-AUTO-PROVISIONING` already has `target_domain_module_id=148` populated on the UEM-side rows, no IGA-side gap today. Recorded as PASS for completeness. |
| ITSM B10b | ITSM | Inbound from UEM to `ITSM-INCIDENT-MGMT` rows (655, 660, 663) carry `target_domain_module_id=38` already. PASS. |
| IGA B8 mirror | IGA | The 4 cross-domain relationship rows mirroring UEM to IGA handoffs (e.g. `enrolled_devices triggers access_decisions`) are inbound from IGA's perspective. UEM should author the outbound side (B1-S11); IGA authors the inverse pairing on its own B8 pass. |

## 2026-05-31, Continuation: B1 technical fixes

Strict technical-only pass per the parent prompt's license. New entities, module set, pattern flag flips, lifecycle states, catalog UX, vendor inserts, and gated-on-B1-S1 items all deferred.

### Applied

- **B1-B2 (PATCH enum backfill).** All 12 UEM `trigger_events` (665-676) had `event_category=""`. Patched per audit's pre-specification: 665, 666, 667, 668, 669, 671, 672, 674, 676 to `state_change`; 670, 673, 675 to `lifecycle`. Verified post-write. Cures Rule #13 enum violation across the entire UEM event set.
- **B1-S9 (Rule #10 user-edges).** Inserted 6 `data_object_relationships` rows from UEM masters to platform built-in `users` (id 748, kind=`platform_builtin`, verified). Label convention `<plural_master> has <role> users`, all `many_to_many` / `owner_side=source` / `relationship_kind=reference`. Roles per audit pre-spec: `enrolled_devices has assigned users`, `enrolled_devices has last seen users`, `enrollment_tokens has issued to users`, `device_configuration_profiles has created by users`, `device_compliance_policies has owned by users`, `mobile_app_packages has uploaded by users`. (Audit's count of "5 rows" was a miscount; 5 distinct masters but 6 distinct role-tuples were listed. All 6 loaded.)
- **APQC TAGGING (handoff_processes).** Inserted 8 `handoff_processes` rows for the 8 audit-pre-specified (handoff_id, process_id) pairs. All 8 handoffs and all 6 PCF processes (1299, 273, 355, 1196, 271, 1197) pre-flight verified. Pairs loaded: 655 to 1299, 656 to 273, 657 to 355, 658 to 1196, 659 to 271, 660 to 1299, 661 to 1197, 663 to 1299. `role='implements'`, `proposal_source='agent_curated'`. Handoff 662 (UEM to SAM, deferred per audit) NOT loaded.

### Deferred (carried forward for the user)

| ID | Reason |
|---|---|
| B1-S1 (modules) | New entity / module authoring; also Bucket 2 #1 requires user to pick module-split shape (4-module proposed vs 3-/5-module alternatives). |
| B1-S2 (capability to module link) | Gated on B1-S1. |
| B1-S3 (lifecycle state `domain_module_id`) | Gated on B1-S1. |
| B1-S4 (catalog_tagline / catalog_description) | Rule #20 forbids agent-authored buyer-voice prose without user approval. |
| B1-S5 (pure-play UEM vendors and solutions) | New entities; also requires user judgment on coverage_level rebalancing for the existing 5 RMM rows (Bucket 2 #6). |
| B1-S6 (data_object_aliases) | Beyond exact-tuple license; audit lists "1-3 each" loose ranges, not pre-specified exact alias_name + vendor + master triples. |
| B1-S7 (lifecycle states) | New entity authoring (Rule #12 / B12); audit's listed states are draft proposals. |
| B1-S8 (pattern flags) | Audit explicitly says "after the user confirms each". |
| B1-S10 (intra-domain data_object_relationships) | Not Rule #10 user-edges; audit lists shapes but not the precise verb / cardinality / necessity / owner_side tuples required for non-user edges. |
| B1-S11 (cross-domain mirror relationships) | New INSERTs to other-domain masters; targets like `access_grants`, `access_decisions`, `software_entitlements` not verified to exist; cross-domain authoring better surfaced as a Bucket-2 decision. |
| B1-B1 (handoff source_domain_module_id backfill) | Gated on B1-S1. |
| B1-B3 (delete legacy skill 114) | Gated on B1-S1 (the 4 per-module system skills must exist before the 8 query tools redistribute off skill 114). |
| B1-M1 through B1-M7 (7 new masters) | New `data_objects` and DMDOs. |

### Notes

- No JWT errors during the run.
- All operations idempotent: re-running the loader is safe (will skip the now-present rows).
- Loader path: [c:/dev/domain-map/.tmp_deploy/fix_uem_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_uem_b1_technical_2026_05_31.ts).
- UI: https://tests.semantius.app/domain_map/trigger_events , https://tests.semantius.app/domain_map/data_object_relationships , https://tests.semantius.app/domain_map/handoff_processes .

## 2026-05-31, Audit

Structural Validate b1 pass. Scope: A, M, B (B5/B7/B9/B9b/B10b/B11/B12), C, D, E (E1-E5), F (F1-F5), H. Live queries via `semantius` CLI (no MCP).

### Summary

- Resolved `domains.id=86` (UEM).
- 0 `domain_modules` rows (primary host or via `domain_module_host_domains`), so M1 fails and cascades into M2/M4/M5/M6/M7/M8, B9b, B10b source-side, E1-E5 path-A, F2/F3/F5.
- 8 masters in legacy `domain_data_objects` (ids 556-563): `enrolled_devices`, `device_configuration_profiles`, `device_compliance_policies`, `mobile_app_packages`, `device_app_assignments`, `enrollment_tokens`, `device_deployment_results`, `device_compliance_results`. No `domain_module_data_objects` rows anchoring any of them locally; the only DMDO references are 2 IGA-AUTO-PROVISIONING `consumer + optional` rows on `enrolled_devices` and `device_compliance_results`.
- 5 capabilities (UEM-MDM 239, UEM-CONFIG 240, UEM-APP-DIST 241, UEM-ZTP 242, UEM-COMPLIANCE 243). Capability count >= 3 triggers M2 floor of >= 2 modules.
- 5 `solution_domains` rows; zero `primary` coverage_level (4 `partial`, 1 `secondary`): NinjaOne, Kaseya VSA, N-able N-central, ManageEngine Endpoint Central, GoTo Resolve. All RMM / PSA platforms, no pure-play UEM vendor.
- `domains.catalog_tagline` and `domains.catalog_description` both empty string.
- 12 `trigger_events` (665-676), all with non-empty `event_category` after the prior continuation patch (state_change x 9, lifecycle x 3).
- 9 outbound `handoffs` (655-663), all with `source_domain_module_id=NULL`. Targets: ITSM (1) x 3, IGA (35) x 4, HAM (51) x 1, SAM (52) x 1. Zero inbound handoffs.
- 0 lifecycle states, 0 aliases, 0 intra-domain or outbound cross-domain `data_object_relationships`, 0 `domain_regulations`.
- 6 `data_object_relationships` to `users` (id 748) exist post-continuation BUT every row has `relationship_verb=""`. Structurally present, verb-empty.
- 1 legacy `domain_id`-only system skill `uem-system` (id 114) with 8 `query_*` `skill_tools` rows, all platform tier, all `data_object_id` set. F4 passes for the legacy skill; F1 fires only after F2 cures.
- 8 of 9 cross-domain handoffs tagged in `handoff_processes` (proposal_source=agent_curated, record_status=new). Handoff 662 (UEM to SAM) deferred to Discover Pass 3 (no clean PCF activity, SAM also non-modularized).
- Business function ownership: End-User Computing (id 59) is owner, Security (id 28) is contributor. C1 passes; C2 vacuously passes (no capability divergences).
- Bucket 1: 12 items. Bucket 2: 6 items. Bucket 3: 4 items.
- `next_action_by`: agent (b1a non-empty).

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 (Rule #14) | Zero `domain_modules` rows for `domain_id=86`. Blocks M2, M4, M5, M6, M7, M8, B9b, B10b source-side backfill, E1-E5 path-A, F2/F3/F5. | Author module set (decision in Bucket 2 #1). Prior Phase-0 proposal: 4-module split UEM-DEVICE-LIFECYCLE, UEM-POLICY-CONFIG, UEM-APP-DELIVERY, UEM-COMPLIANCE-POSTURE. Awaits user choice on split shape. |
| B1-S2 | M4 | All 5 capabilities orphaned (no realizing module). | Gated on B1-S1. Bundle `domain_module_capabilities` links into the module-authoring loader. |
| B1-S3 | M8 | Module-level `catalog_tagline` / `catalog_description` unverifiable while M1 fails. | Gated on B1-S1; once modules exist, populate per Rule #20 with user-approved buyer-voice wording. |
| B1-S4 | A4 (Rule #20) | `domains.catalog_tagline` and `domains.catalog_description` both empty string. | Surface drafts to user (Rule #20). Loader must NOT write without explicit per-row approval. |
| B1-S5 | A3 | 0 `primary` coverage_level rows across 5 solutions. Pure-play UEM vendors absent: Microsoft Intune, Jamf Pro, Workspace ONE / Omnissa, Kandji, Hexnode UEM, IBM MaaS360. | INSERT pure-play vendors + solutions + `solution_domains` rows at `coverage_level=primary`. Coverage rebalancing for the 5 existing RMM rows is Bucket 2 #5. |
| B1-S6 | B7 verb backfill | 6 `users`-edge `data_object_relationships` rows (1847-1852) have `relationship_verb=""`. The Rule #10 user-edge presence is structurally satisfied but the label is unreadable. | PATCH `relationship_verb` per the prior continuation's role labels: 1847 `has assigned`, 1848 `has last seen`, 1849 `has issued to`, 1850 `has created by`, 1851 `has owned by`, 1852 `has uploaded by`. User confirms each verb before PATCH. |
| B1-S7 | B11 | 0 `data_object_aliases` rows across all 8 masters. Vendor synonyms are universal in this market: Intune `managedDevices` and Jamf `computers` / `mobile_devices` map to `enrolled_devices`; Intune `deviceConfigurations` and Jamf `configuration_profiles` to `device_configuration_profiles`; Intune `mobileApps` to `mobile_app_packages`; Intune `enrollmentProfiles` and Apple `automated_device_enrollment_profiles` to `enrollment_tokens`. | Author 8 alias rows (1-3 each) once exact `alias_name` + `alias_type` tuples are confirmed. |
| B1-S8 | B12 (Rule #12) | 0 lifecycle states on any UEM master. Every master has a workflow implied by the 12 trigger events. | Author state rows per master after Bucket 2 #1 fixes the module shape (states need `domain_module_id`). |
| B1-S9 | B4 (Rule #12) | All 3 pattern flags `false` on every master with no positive review recorded. Candidates: `enrolled_devices.has_personal_content=true` (BYOD), `enrollment_tokens.has_submit_lock=true` (one-shot), `device_compliance_policies.has_submit_lock=true` (published-then-immutable). | PATCH each candidate flag after user confirms the semantics (Bucket 2 #4). |
| B1-S10 | B6 | 0 intra-domain `data_object_relationships`. Required edges: `device_app_assignments` against `enrolled_devices` and `mobile_app_packages`; `device_compliance_results` against `enrolled_devices` and `device_compliance_policies`; `device_deployment_results` against `enrolled_devices`; `enrollment_tokens` against `enrolled_devices`; `device_configuration_profiles` against `enrolled_devices` (M:N). | Author 7 relationship rows (verb, type, kind, owner_side, is_required); bundle with B1-S6. |
| B1-S11 | B8 outbound | 0 outbound cross-domain `data_object_relationships` mirroring 9 outbound handoffs. Targets include ITSM (`service_incidents` id 47), IGA, HAM, SAM payloads. | Author outbound relationship rows; cross-domain targets like IGA `access_grants` / `access_decisions` and SAM `software_entitlements` need existence verification before the write. |

#### BOUNDARY findings

| ID | Finding | Fix |
|---|---|---|
| B1-B1 | All 9 outbound handoffs (655-663) carry `source_domain_module_id=NULL`. Per B10b deterministic derivation, source resolves to the strongest-role module mastering `trigger_events.data_object_id`. | Gated on B1-S1. Once modules exist, run backfill per the 4-module proposal: events on `enrolled_devices` (665-667) to UEM-DEVICE-LIFECYCLE; on `device_configuration_profiles` (669) to UEM-POLICY-CONFIG; on `device_compliance_results` (671-672) to UEM-COMPLIANCE-POSTURE; on `device_app_assignments` (674) to UEM-APP-DELIVERY. |
| B1-B2 | Handoffs 657 (UEM to HAM) and 662 (UEM to SAM) carry `target_domain_module_id=NULL`. Source-side is UEM's gap (B1-B1); target-side belongs to HAM's and SAM's B10b. | Report-only for UEM. HAM has 2 modules (169 HAM-ASSET-REGISTRY natural target for retired-device); SAM has zero modules (its own M1 must cure first). |
| B1-B3 | Legacy `uem-system` skill (id 114) with `domain_id=86`, `domain_module_id=NULL` carries 8 `query_*` tools. F1 requires deletion once per-module system skills exist. | Gated on B1-S1 + F2 authoring. DELETE row 114 after the 4 per-module system skills + their `skill_tools` ship; redistribute the 8 tools to the per-module skills by master ownership. |

#### MISSING substrate gaps (vendor-confirmed, carried forward from 2026-05-30 audit)

| ID | Entity | Proposed module | Vendor evidence |
|---|---|---|---|
| B1-M1 | `device_groups` | UEM-POLICY-CONFIG | Universal targeting axis (Intune `deviceGroups`, Jamf smart/static groups, Workspace ONE smart groups, Kandji Blueprints, Hexnode device groups). |
| B1-M2 | `device_scripts` | UEM-POLICY-CONFIG | Universal (Intune device-management scripts, Jamf scripts, Workspace ONE scripts, Kandji custom scripts, Hexnode custom scripts). |
| B1-M3 | `device_actions` | UEM-DEVICE-LIFECYCLE | Universal command/action log (restart, wipe, lock, sync). |
| B1-M4 | `enrollment_profiles` | UEM-DEVICE-LIFECYCLE | Reusable zero-touch template distinct from `enrollment_tokens` (issued instance). |
| B1-M5 | `device_certificates` | UEM-POLICY-CONFIG | Wi-Fi / VPN / mTLS issuance per device. |
| B1-M6 | `device_users` (junction) | UEM-DEVICE-LIFECYCLE | Shared-iPad / kiosk / multi-user-Mac. |
| B1-M7 | `policy_assignment_results` | UEM-COMPLIANCE-POSTURE | Per-device per-policy outcome distinct from deployment-level and compliance-state results. |

#### APQC TAGGING

8 of 9 cross-domain handoffs already tagged in `handoff_processes` from the prior continuation (record_status=new, proposal_source=agent_curated). Coverage 8/9 = 89%. Headline `record_status='approved'` count = 0 (no reviewer sign-off yet); process-health `agent_curated` count = 8. Volume bands (0.5N to 0.8N tagged = 4.5 to 7.2) exceeded; the over-band figure is from prior pass already loading the agent_curated tags. Handoff 662 remains deferred (no clean PCF activity for software-asset license consumption, SAM also non-modularized).

### Bucket 2 - Surface-for-user (judgment calls)

1. **Module split shape (gates B1-S1, B1-S2, B1-S3, B1-S8, B1-B1, B1-B3, F2, E1).** Prior Phase-0 hypothesis: 4-module split UEM-DEVICE-LIFECYCLE, UEM-POLICY-CONFIG, UEM-APP-DELIVERY, UEM-COMPLIANCE-POSTURE. Alternatives: (a) 3-module collapse of POLICY-CONFIG + COMPLIANCE-POSTURE; (b) 5-module split that separates UEM-ZERO-TOUCH-ONBOARDING. Decide.
2. **A4 catalog UX wording (Rule #20).** Per-row user-approved wording required for `domains.catalog_tagline` and `domains.catalog_description` before any PATCH. Prior audit drafts were starting points only.
3. **B1-S6 user-edge verbs.** Six rows 1847-1852 currently carry `relationship_verb=""`. Prior audit pre-specified `has assigned users`, `has last seen users`, `has issued to users`, `has created by users`, `has owned by users`, `has uploaded by users` as labels but loader did not populate the verb column. Confirm exact verb strings before PATCH.
4. **B1-S9 pattern flags.** Confirm per-master: `enrolled_devices.has_personal_content=true` (BYOD default), `enrollment_tokens.has_submit_lock=true` (one-shot vs reusable bulk tokens), `device_compliance_policies.has_submit_lock=true` (published-immutable). Rule #15 forbids notes-based explanation.
5. **A3 coverage_level rebalancing.** When pure-play UEM vendors (Intune, Jamf, Workspace ONE / Omnissa, Kandji, Hexnode, MaaS360) land at `coverage_level=primary`, the 5 existing RMM rows could (a) stay `partial`, (b) move OFF UEM if RMM (domain id 130) canonicalizes those vendors. Recommend (a) status quo. Decide.
6. **Regulation scope.** No `domain_regulations` rows today. Candidates: GDPR (BYOD personal data), HIPAA (healthcare device PHI access), CCPA / CPRA, FedRAMP (US public-sector UEM). Decide which apply or defer to Phase 0.

### Bucket 3 - Phase 0 pending (speculative)

Carried forward from 2026-05-30 audit (no fresh subagent surface this pass; the structural bands did not surface new candidates beyond the prior list).

| Candidate | Proposed module | Vendor knowledge basis |
|---|---|---|
| `device_telemetry_streams` | UEM-COMPLIANCE-POSTURE | Workspace ONE Intelligence, Kandji Pulse, Jamf Protect telemetry. |
| `device_remote_sessions` | UEM-DEVICE-LIFECYCLE | Remote assist / control (Intune Remote Help, Jamf Remote, Workspace ONE Assist). Channel ambiguity with RMM. |
| `enrolled_device_blockages` | UEM-COMPLIANCE-POSTURE | Conditional-access block records. Could be derived from `device_compliance_results`. |
| `device_inventory_snapshots` | UEM-DEVICE-LIFECYCLE | Periodic hardware / software inventory snapshot rows. Hexnode + Workspace ONE master; Intune / Jamf treat as derived. |

### Cross-bucket dependencies

- **B1-S1 (modules) is the universal gate.** Blocks B1-S2, B1-S3, B1-S8, B1-B1, B1-B3, F2/F3/F5, E1-E5, M2/M4/M5/M6/M7/M8.
- **Bucket 2 #1 feeds B1-S1 directly.** Cannot proceed without user choice on split shape.
- **Bucket 2 #2, #3, #4 are independent of #1** and can resolve in any order.
- **Bucket 2 #5 (coverage_level rebalancing)** depends on B1-S5 lands first.
- **Bucket 2 #6 (regulations)** may be informed by Bucket 3 if user chooses vetted-Phase-0 route.
- **Bucket 3 entities** all depend on Bucket 2 #1 (module split) for their `proposed_module` placement.

### Report-only follow-ups (owed by other domains)

| Item | Owing domain | Detail |
|---|---|---|
| HAM B10b | HAM | Handoff 657 (`enrolled_device.retired` to HAM) has `target_domain_module_id=NULL`. HAM-ASSET-REGISTRY (169) is the natural target. |
| SAM M1 blocker | SAM | Handoff 662 (`device_app_assignment.deployed` to SAM) has both module FKs NULL. SAM is non-modularized; SAM's M-band must cure first. |
| SAM APQC TAGGING | SAM | Handoff 662 tag deferred (no clean PCF activity for software-asset license consumption). Belongs to SAM's audit or Discover Pass 3. |
| IGA B10b | IGA | Inbound from UEM to `IGA-AUTO-PROVISIONING` already carries `target_domain_module_id=148` on 4 rows (656, 658, 659, 661). PASS. |
| ITSM B10b | ITSM | Inbound from UEM to `ITSM-INCIDENT-MGMT` already carries `target_domain_module_id=38` on 3 rows (655, 660, 663). PASS. |
| IGA B8 mirror | IGA | UEM-side outbound mirrors (B1-S11) will appear; IGA authors the inverse pairing on its own B8 pass. |

### Notes

- No JWT-audience errors during this audit run.
- All queries executed via `semantius` CLI from project root cwd. Zero MCP calls.
- Skipped B9b (pre-check: `domain_modules` count < 2).

## 2026-06-02 Audit (modularization)

Scope: modules + entity assignment ONLY. Created the domain's `domain_modules`, linked existing capabilities, and assigned existing master data_objects at their existing role and necessity. No new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships authored. This cures the long-standing M1 / M2 / M4 / M6 failures (UEM was the canonical non-modularized domain blocking its entire B / E / F cascade).

### Decision: 3-module split (not the prior 4-module proposal)

The prior audit's 4-module hypothesis (UEM-DEVICE-LIFECYCLE, UEM-POLICY-CONFIG, UEM-APP-DELIVERY, UEM-COMPLIANCE-POSTURE) leaned on 7 net-new masters (device_groups, device_scripts, device_actions, enrollment_profiles, device_certificates, device_users, policy_assignment_results) to give POLICY-CONFIG and APP-DELIVERY enough substance to stand alone. This pass is reuse-only (no new masters permitted), so a 4-way split would leave APP-DELIVERY thin and POLICY-CONFIG without its config-substrate masters. The coherent reuse-only shape is 3 modules. POLICY-CONFIG and APP-DELIVERY fold into a single Configuration and Application Delivery module, which both the UEM-CONFIG and UEM-APP-DIST capabilities realize. If and when the 7 candidate masters land (carried as b3), UEM-CONFIG-APPS can split into the prior two modules without disturbing the other two.

### Modules created

| Module code | id | Capabilities | Master data_objects (role / necessity) |
|---|---|---|---|
| UEM-DEVICE-LIFECYCLE | 308 | UEM-MDM (239), UEM-ZTP (242) | enrolled_devices (556), enrollment_tokens (561), device_deployment_results (562) - all master / required |
| UEM-CONFIG-APPS | 309 | UEM-CONFIG (240), UEM-APP-DIST (241) | device_configuration_profiles (557), mobile_app_packages (559), device_app_assignments (560) - all master / required |
| UEM-COMPLIANCE-POSTURE | 310 | UEM-COMPLIANCE (243) | device_compliance_policies (558), device_compliance_results (563) - all master / required |

All 3 modules `module_kind=full`. `record_status` omitted on every insert (Rule #1). `catalog_tagline` / `catalog_description` omitted (Rule #20, deferred to the user via b1a CATALOG-UX). `notes` empty on all 8 DMDO and all 5 DMC rows (Rule #15).

### Master pre-check (M7, catalog-wide)

Ran the mandatory catalog-wide pre-check on all 8 masters (556-563) before writing any `role=master`. Query: `/domain_module_data_objects?data_object_id=in.(...)&role=eq.master`. Result: zero pre-existing master rows for every one of the 8. No demotions to embedded_master were required. Each master now appears in EXACTLY ONE UEM module and is the ONLY master row catalog-wide. The pre-existing 2 IGA-AUTO-PROVISIONING `consumer + optional` rows on enrolled_devices (556) and device_compliance_results (563) are untouched (consumer role, not master, no conflict).

### Verification (live, post-load)

- 3 `domain_modules` rows under domain 86 (M1 / M2 pass: >= 2 full modules for a 5-capability domain).
- 5/5 capabilities placed (M4): no orphans.
- Every module has >= 1 capability (M6) and >= 1 data_object (no empty module).
- Each of the 8 masters: exactly 1 catalog-wide master row (M7 in-domain and catalog-wide pass).
- Loader is idempotent: a second run inserted zero rows.

### Deferred (out of this pass's scope, carried in state.yaml)

- Per-module system skills (Rule #17 -> F2 / F3): one `skill_type=system` skill per module (3 needed) plus tools + skill_tools; retire legacy uem-system skill 114 (F1) afterward.
- Catalog UX (M8 / A4, Rule #20): domain-level and per-module `catalog_tagline` / `catalog_description` need user-approved buyer-voice strings.
- B-band substrate gaps unchanged from prior audits: 7 missing-master candidates (b3), lifecycle states (B12), aliases (B11), pattern flags (B4), intra/cross-domain relationships (B6 / B8), handoff source_domain_module_id backfill (B10b, now unblocked by modules), pure-play vendor solutions (A3).
- Handoff `source_domain_module_id` backfill (handoffs 655-663) is now unblocked since modules exist; deterministic mapping by trigger-event master: events on enrolled_devices -> 308, on device_configuration_profiles -> 309, on device_compliance_results -> 310, on device_app_assignments -> 309. Carried as b1a HANDOFF-MODULE-BACKFILL.

### Notes

- All writes via `semantius call crud postgrestRequest` (Rule #0). Zero MCP calls. TypeScript on Bun loader by absolute path (Rule #4b / #6).
- No JWT-audience errors during this run.
- Loader: [.tmp_deploy/modularize_uem_2026-06-02.ts](../../.tmp_deploy/modularize_uem_2026-06-02.ts).
- UI: https://tests.semantius.app/domain_map/domain_modules?domain_id=eq.86 , https://tests.semantius.app/domain_map/domain_module_data_objects .


## 2026-06-06 - b1a execution

Executed all three `b1a` items against the live `domain_map` module (id 1001, adenin org). All writes via `semantius call crud postgrestRequest` (Rule #0); zero MCP calls. TypeScript-on-Bun loaders by absolute path from project root (Rule #4b / #6). No JWT-audience errors. `record_status` omitted on every insert (Rule #1). No `notes` column written anywhere (Rule #15).

### B1A-HANDOFF-MODULE-BACKFILL - DONE

PATCHed `source_domain_module_id` on all 9 outbound UEM handoffs (655-663). Prior value on every one of the 9: `source_domain_module_id = NULL` (snapshot for reversibility). Deterministic strongest-role derivation (B10b) on the trigger-event's `data_object_id`:

| handoff | trigger_event | event data_object | new source_domain_module_id |
|---|---|---|---|
| 655 | enrolled_device.enrolled | enrolled_devices (556) | 308 UEM-DEVICE-LIFECYCLE |
| 656 | enrolled_device.enrolled | enrolled_devices (556) | 308 |
| 657 | enrolled_device.retired | enrolled_devices (556) | 308 |
| 658 | enrolled_device.lost_or_stolen | enrolled_devices (556) | 308 |
| 659 | device_compliance_result.non_compliant | device_compliance_results (563) | 310 UEM-COMPLIANCE-POSTURE |
| 660 | device_compliance_result.non_compliant | device_compliance_results (563) | 310 |
| 661 | device_compliance_result.compliant | device_compliance_results (563) | 310 |
| 662 | device_app_assignment.deployed | device_app_assignments (560) | 309 UEM-CONFIG-APPS |
| 663 | device_configuration_profile.drift_detected | device_configuration_profiles (557) | 309 |

0 ambiguous, 0 UEM-side null remaining. Rows 657 (target HAM) and 662 (target SAM) still carry `target_domain_module_id = NULL`; that is the TARGET domain's B10b, left untouched (asymmetry rule). Loader: [.tmp_deploy/backfill_uem_handoff_modules_2026_06_06.ts](../../.tmp_deploy/backfill_uem_handoff_modules_2026_06_06.ts).

### B1A-LIFECYCLE-STATES - DONE

Two-part load. Loader: [.tmp_deploy/load_uem_lifecycle_states_2026_06_06.ts](../../.tmp_deploy/load_uem_lifecycle_states_2026_06_06.ts).

Part 1 (Rule #12 / B13 prerequisite): PATCHed `entity_type` on all 8 masters from `unclassified` -> `operational_workflow` (556-563). Each has a real device-management workflow per the b1a action text and the 12 live trigger events; classification is deterministic, not a guess. Prior value on all 8: `entity_type = 'unclassified'`.

Part 2 (B12): INSERTed 29 `data_object_lifecycle_states` rows, anchored to the realizing module via `domain_module_id`. M4 shape validated per master (exactly one is_initial, >=1 is_terminal, monotonic state_order in steps of 10). Workflow gates (`requires_permission=true`) in brackets:

| master | module | states (in order) | gates |
|---|---|---|---|
| enrolled_devices (556) | 308 | enrolled*, compliant, non_compliant, lost_or_stolen!, retired! | lost_or_stolen, retired (verb override retire_device) |
| enrollment_tokens (561) | 308 | issued*, consumed!, revoked!, expired! | revoked |
| device_deployment_results (562) | 308 | queued*, succeeded!, failed! | none |
| device_configuration_profiles (557) | 309 | draft*, published, assigned, drift_detected! | published |
| mobile_app_packages (559) | 309 | uploaded*, published, deprecated! | published, deprecated |
| device_app_assignments (560) | 309 | assigned*, deployed, failed!, removed! | deployed |
| device_compliance_policies (558) | 310 | draft*, published, revoked! | published, revoked |
| device_compliance_results (563) | 310 | evaluating*, compliant!, non_compliant! | none |

(* = is_initial, ! = is_terminal.) All `notes` empty (Rule #15); `record_status` omitted.

### B1A-SYSTEM-SKILLS - DONE

Loader: [.tmp_deploy/load_uem_system_skills_2026_06_06.ts](../../.tmp_deploy/load_uem_system_skills_2026_06_06.ts). Phase-S three-source derivation (Rule #17).

INSERTed 3 `skill_type='system'` skills, one per module (F2):

| skill_id | skill_name | domain_id | domain_module_id | tools (required) |
|---|---|---|---|---|
| 334 | uem_device_lifecycle_agent | 86 | 308 | 11 (10) |
| 335 | uem_config_apps_agent | 86 | 309 | 11 (10) |
| 336 | uem_compliance_posture_agent | 86 | 310 | 7 (6) |

(System skills require `domain_id` AND `domain_module_id` per a DB check constraint - matches the ATS per-module skill shape; not an em-dash issue.)

INSERTed 15 new `mutate` tools (ids 1686-1700), all `coverage_tier='platform'`, F4 invariant verified (query/mutate carry data_object_id; fetch/side_effect/compute would be NULL): enroll_device, retire_device, mark_device_lost_or_stolen, issue_enrollment_token, revoke_enrollment_token, record_device_deployment_result (556/561/562); publish_configuration_profile, assign_configuration_profile, publish_mobile_app_package, deprecate_mobile_app_package, assign_mobile_app, deploy_mobile_app (557/559/560); publish_compliance_policy, revoke_compliance_policy, evaluate_device_compliance (558/563). No duplicate tool_name existed catalog-wide (pre-checked).

Reused shared catalog-wide tools (no new rows, re-read by name immediately before linking per Rule #9): the 8 existing query_* tools (728-735), create_incident (30, -> service_incidents 47), notify_person (913), notify_team (914).

INSERTed 29 `skill_tools` links (11 + 11 + 7), each skill >=1 (F3). Source-3 handoff coverage: create_incident linked required on device-lifecycle (handoff 655 enrolled), config-apps (663 config drift), and compliance (660 non-compliant) - the three UEM events that create ITSM service_incidents. notify_person/notify_team linked optional (channel-vs-capability abstraction default). The IGA/HAM/SAM handoffs are consuming-side query/sync (no UEM-owned mutate), so they add no required tool (anti-pattern: do not add a tool per consumer relationship).

The 8 query_* tools (728-735) were redistributed from legacy skill 114 onto the per-module skills by their master's owning module (728/733/734 -> 334; 729/731/732 -> 335; 730/735 -> 336).

DELETEd legacy skill 114 (`uem-system`, was: skill_type=system, domain_id=86, domain_module_id=NULL, record_status=new, description "System skill for Unified Endpoint Management ... derived from masters + cross-domain handoffs.", 8 skill_tools 876-883 -> tools 728-735, all required). Its 8 skill_tools cascaded on delete (skill_id is a parent FK); the 8 query tools themselves survive in the catalog-wide `tools` table and are now linked to the per-module skills. Pre-delete guard confirmed all 3 per-module skills have >=1 skill_tools and all 8 query tools are redistributed. This also resolves the dependent b1b item B1B-RETIRE-LEGACY-SKILL (F1).

### Skipped

None of the 3 b1a items were skipped. (b1b CATALOG-UX for the 3 module rows and the domain row is a b1b item blocked by `user_decision` B2-CATALOG-UX, not a b1a item, so it was not written this pass per the skip-on-user_decision rule.)

### Verification (live, post-load)

- handoffs 655-663: source_domain_module_id = {308 x4, 310 x3, 309 x2}; 0 UEM-side NULL remaining.
- data_object_lifecycle_states on 556-563: 29 rows (5/4/3/3/4/4/3/3).
- data_objects 556-563: 0 rows with entity_type != operational_workflow.
- skills on modules 308/309/310: exactly 3 system skills (334/335/336); skill 114 gone.
- skill_tools: 29 across the 3 skills; all 8 query tools (728-735) re-linked.

### next_action_by

`b1a` now empty -> `next_action_by: user` (b2 non-empty: catalog UX, verbs, pattern flags, coverage, regulations, config-apps split).

### UI

- https://tests.semantius.app/domain_map/skills
- https://tests.semantius.app/domain_map/data_object_lifecycle_states
- https://tests.semantius.app/domain_map/handoffs

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
