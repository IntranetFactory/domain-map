# VIS-MGMT audit history

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 8 master data_objects in the legacy `domain_data_objects` table (`visitor_registrations`, `visitor_check_ins`, `visitor_badges`, `host_assignments`, `visitor_evacuation_lists`, `visitor_nda_acknowledgements`, `visitor_watchlist_screenings`, `visitor_audit_logs`). **0 `domain_modules` rows** (M1 hard fail). **0 capabilities** (A2 fail). **0 regulations** (B-band gap). 10 trigger_events on the masters, 3 outbound handoffs (to IGA, GRC, HCM), 0 inbound handoffs. 1 legacy domain-level system skill (`vis-mgmt-system`, skill id 117, `domain_module_id=null`) with 10 `skill_tools` rows (8 master query tools + `send_email` + `send_sms`). 4 solutions linked (Envoy Workplace, Proxyclick, SwipedOn primary; ServiceNow Workplace Service Delivery secondary). 2 `business_function_domains` rows (Facilities and Real Estate as owner, Security as contributor).
- **Vendor-surface basis:** Envoy Workplace, Proxyclick (Eptura), SwipedOn, iLobby, Sign In Solutions / Traction Guest, Greetly. Specialist focus: Envoy and Proxyclick anchor the enterprise tier; SwipedOn and iLobby cover SMB and regulated single-site; Sign In Solutions covers government / high-security; Greetly handles SMB visitor self-service.
- **Bucket 1 (in-scope, agent fixable):** 13 items.
- **Bucket 2 (surface-for-user, judgment):** 7 items.
- **Bucket 3 (Phase 0 pending, speculative):** 7 items.

Structural pass: **M1 fails catastrophically** (no modules exist). Because the Phase M precursor is unsatisfied, every downstream band that requires `domain_modules` rows (M2-M7, B12 lifecycle states, E1-E6 roles, F2-F5 module skills, S2 per-module sweep) cannot be evaluated. The 8 masters exist only in the legacy `domain_data_objects` rollup; no `domain_module_data_objects` rows on this domain's own modules. F1 fails (the legacy domain-level system skill has not been retired). A2 fails (no capabilities linked). A4 fails (`catalog_tagline` and `catalog_description` empty). B-band has multiple gaps. B10b fails on all 3 outbound handoffs (every row has `source_domain_module_id=null` because no modules exist).

This domain is functionally an unmodularized stub. The Bucket 1 list is dominated by the structural rebuild required to bring it into the modular shape Rule #14 mandates. The market audit (Pass 2) overlays MISSING entities on top of that rebuild.

### Vendor surface basis

Pure-play visitor-management specialists chosen over the broader IWMS / Workplace suites: Envoy Workplace (the de-facto enterprise reference for visitor flow + workplace experience), Proxyclick (Eptura, enterprise + EU compliance focus), SwipedOn (SMB iPad-first, ANZ origin), iLobby (regulated / FDA / ITAR sites), Sign In Solutions / Traction Guest (Canadian-origin, government / high-security), Greetly (SMB self-service). All six are pure-plays. Envoy and Proxyclick anchor the GDPR-aware enterprise schema; iLobby and Sign In Solutions anchor regulated / ITAR / NDA-heavy workflows; SwipedOn and Greetly cover the SMB iPad-only deployments. ServiceNow Workplace Service Delivery is listed in the current `solution_domains` rollup as secondary coverage; it is not used as a primary reference here because its visitor surface is a thin wrapper over Workplace Service Delivery's broader employee-services scope.

### Pass 3 - Neighbor discovery

Auto-discovered neighbors (handoffs + DMDO cross-references):

| Neighbor | Outbound | Inbound | DMDO consumers | Edge weight | Deep dive? |
|---|---|---|---|---|---|
| IGA | 1 (`visitor_registration.submitted`) | 0 | 1 (IGA-AUTO-PROVISIONING consumes `visitor_registrations`) | 2 | No (light) |
| GRC | 1 (`visitor_audit_log.sealed`) | 0 | 0 | 1 | No (light) |
| HCM | 1 (`host_notification.sent`) | 0 | 0 (but `host_assignments` references `employees` id 31 via `data_object_relationships`) | 1 | No (light) |

No neighbor crosses the edge-weight >=3 threshold. All three get one-line summaries in Pass 4 below.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures (M-band + A-band + F-band)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 | Zero `domain_modules` rows for VIS-MGMT. Domain has 8 master data_objects but no modules to host them. Rule #14 mandates >=1 full module. | Author the module set. Recommended split (see Bucket 2 #1 for confirmation): `VIS-MGMT-REGISTRATION` (pre-registration + check-in + badge + host notification), `VIS-MGMT-COMPLIANCE` (NDA + watchlist + audit log + evacuation list). 8 masters split roughly 4-4 across the two modules. |
| B1-S2 | A2 | Zero `capability_domains` rows. Domain has no capabilities linked. | Author >=3 capabilities. Recommended: `VISITOR-PREREG` (pre-registration and host notification), `VISITOR-CHECKIN` (arrival, badge issuance, ID verification), `VISITOR-COMPLIANCE` (NDA, watchlist screening, audit logs), `EMERGENCY-ROSTER` (evacuation list, mustering), `HOST-MANAGEMENT` (host assignment, host responsibility). |
| B1-S3 | A4 | `catalog_tagline` and `catalog_description` both empty. Rule #20 requires both populated in buyer voice. | Draft both fields per Rule #20 and surface to the user for review before writing. Buyer voice (workflow + value), not analyst voice. |
| B1-S4 | A1 | `business_logic` empty. Allowed under Rule #8 only when `crud_percentage >= 95`. Currently `crud_percentage=95`, so the empty string is technically allowed but borderline. Watchlist screening + NDA acknowledgement + audit-log sealing have rule-driven branches that suggest the band could push above pure CRUD. | Either keep `business_logic=''` (95 stays) or draft non-empty text describing the watchlist / NDA / audit-log compliance branches and consider lowering `crud_percentage` to 90. Surface to user. |
| B1-S5 | F1 | Legacy domain-level system skill `vis-mgmt-system` (skill id 117, `domain_id=24`, `domain_module_id=null`). No module-level skills exist yet (because no modules exist). Once B1-S1 lands modules, this skill must be retired and one `<module>_agent` skill authored per module (Rule #17). | DELETE skill 117 after the module set lands and per-module skills are authored. Until then, the legacy row is the transitional state but the F1 audit flag remains until cured. The 10 `skill_tools` rows (8 query tools + `send_email` + `send_sms`) must be migrated: the per-master `query_*` tools split between the two modules along their master assignments; `send_email` and `send_sms` are channel-primitive rows that fail F7 (see B1-S6). |
| B1-S6 | F7 | `vis-mgmt-system` links `send_email` (`coverage_tier=platform`) and `send_sms` (`coverage_tier=external`) as required tools, both with empty `notes`. Per Rule (F7), generic notification motions should use `notify_person` / `notify_team`; `send_email` / `send_sms` are only justified when the channel IS the workflow contract. Host notification on visitor arrival is exactly the substitutable / notify-person shape. | DELETE the `send_email` and `send_sms` `skill_tools` rows; replace with `notify_person` (for host notification) and `notify_team` (for evacuation-list broadcast). Apply during the per-module-skill authoring of B1-S5. |

#### STRUCTURAL band failures (B-band)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S7 | B10b | All 3 outbound handoffs (rows 871, 872, 873) have `source_domain_module_id=NULL`. Per the authoring rule, the column was permitted to be NULL only when the source domain was unmodularized at insert time, which IS the case here, but the audit MUST flag it for backfill once modules exist. Inbound side: row 871 has `target_domain_module_id=148` (IGA-AUTO-PROVISIONING) - covered. Rows 872 (target=GRC) and 873 (target=HCM) have `target_domain_module_id=NULL` - those are the target domain's B10b (report-only, listed below). | Backfill all 3 outbound `source_domain_module_id` after B1-S1 lands modules. Row 871 (`visitor_registration.submitted`, master is `visitor_registrations`) -> `VIS-MGMT-REGISTRATION`. Row 872 (`visitor_audit_log.sealed`, master is `visitor_audit_logs`) -> `VIS-MGMT-COMPLIANCE`. Row 873 (`host_notification.sent`, master is `host_assignments`) -> `VIS-MGMT-REGISTRATION`. Use the per-master resolution rule from B10b. |
| B1-S8 | B6 | Two `data_object_relationships` rows use a verb `logged_in` (row joining `visitor_check_ins` -> `visitor_audit_logs` and `visitor_registrations` -> `visitor_audit_logs`). The verb is sentence-incomplete and not the audit-log idiom (the catalog elsewhere uses verbs like `audits`, `logs`, `records`, `appears_in`). | PATCH the `relationship_verb` on both rows to a clearer verb (recommended: `audited_in` / `records_event_in`). Surface to user for the exact wording. |
| B1-S9 | B12 | Zero `data_object_lifecycle_states` rows on any of the 8 masters. Most VIS-MGMT masters have non-trivial state machines: `visitor_registrations` (draft -> submitted -> approved -> arrived -> checked_out / no_show / cancelled), `visitor_check_ins` (pending -> verified -> badged / denied / escalated), `visitor_badges` (issued -> active -> returned / lost), `host_assignments` (assigned -> confirmed -> closed), `visitor_nda_acknowledgements` (sent -> signed / declined), `visitor_watchlist_screenings` (queued -> cleared / flagged / blocked), `visitor_evacuation_lists` (open -> closed_drill / closed_event), `visitor_audit_logs` (open -> sealed). | Author lifecycle states per master, with `requires_permission=true` flags on every gated transition (approve, escalate, seal, block) and `domain_module_id` set to the realizing module from B1-S1. Lifecycle states are the source from which workflow-gate permissions are materialized; loading the masters without them silently hollows the entire role-bundling layer. |
| B1-S10 | B4 | Six masters carry visitor PII (name, ID, photo, signature). Pattern flag `has_personal_content` is `false` on every master. Likely candidates: `visitor_registrations`, `visitor_check_ins`, `visitor_badges`, `visitor_nda_acknowledgements`, `visitor_watchlist_screenings`, `visitor_audit_logs`. | PATCH `has_personal_content=true` on the six PII-bearing masters. `host_assignments` and `visitor_evacuation_lists` reference visitor identifiers indirectly; user decides whether to flip those too (see Bucket 2 #2). `has_submit_lock` likely belongs on `visitor_audit_logs` (sealing the log is a one-way submit lock) - surface for confirmation. |

#### MISSING entities (market audit - vendor-confirmed gaps)

| ID | Entity | Proposed module | Vendor evidence | Notes |
|---|---|---|---|---|
| B1-M1 | `visitor_invitation_links` | VIS-MGMT-REGISTRATION | Envoy, Proxyclick, iLobby, Sign In Solutions | Magic-link or QR pre-registration token sent to the visitor before arrival. Distinct from `visitor_registrations` (the registration record) - this is the credential the visitor uses to identify themselves to the kiosk. Used by every enterprise vendor as a separate entity from the registration row itself. |
| B1-M2 | `visitor_health_screenings` | VIS-MGMT-REGISTRATION | Envoy, Proxyclick, SwipedOn, iLobby | Health attestation / vaccination / symptom screening recorded at registration or arrival. Post-COVID hygiene entity; still in active use for healthcare, food production, regulated sites. Distinct from `visitor_watchlist_screenings` (security screening). |
| B1-M3 | `visitor_id_verifications` | VIS-MGMT-REGISTRATION | Envoy, iLobby, Sign In Solutions, Proxyclick | Government-ID scan / photo capture / passport scan at check-in. Required for ITAR / FDA / regulated sites and increasingly common in enterprise deployments. Currently no entity captures the ID-verification artifact (photo, document number, expiration). |
| B1-M4 | `visitor_pre_arrival_documents` | VIS-MGMT-COMPLIANCE | iLobby, Proxyclick, Sign In Solutions | Documents the visitor must read or sign before arrival (safety briefing, site policies, ITAR forms) distinct from the NDA itself. Currently the NDA is the only pre-arrival document modeled. |
| B1-M5 | `visitor_groups` | VIS-MGMT-REGISTRATION | Envoy, Proxyclick, iLobby, SwipedOn | Multi-visitor delegation / contractor crew / tour group bundled under one registration. Universal across enterprise vendors; supports event-driven and contractor-heavy sites. |
| B1-M6 | `visitor_types` | VIS-MGMT-REGISTRATION | All 6 vendors | Configuration master that defines per-type visitor flow (contractor, interview candidate, delivery, tour, VIP, child) with per-type NDA / screening / badge-template requirements. Today the catalog has no place to encode this configurable taxonomy. |
| B1-M7 | `delivery_check_ins` | VIS-MGMT-REGISTRATION (or its own module) | Envoy Deliveries, Proxyclick, SwipedOn | Couriers and deliveries are a distinct visitor sub-flow handled by every enterprise vendor (no NDA, no badge issuance, no host assignment - usually just a host-notification and mailroom routing). Surfacing as a sibling entity to `visitor_check_ins` rather than overloading it. |

#### BOUNDARY findings (intra-domain handoffs B9b skipped because no modules exist yet)

| ID | Finding | Fix |
|---|---|---|
| B1-B1 | B9 trigger-event subscriber coverage: 10 trigger_events exist on VIS-MGMT masters; only 3 have outbound `handoffs` rows. The 7 unsubscribed events: `visitor_check_in.completed` (976), `visitor_badge.issued` (977), `visitor_badge.returned` (978), `host_assignment.created` (979), `evacuation_list.updated` (981), `visitor_nda.acknowledged` (982), `visitor_watchlist.screened` (983). Several of these likely have legitimate subscribers (IGA on badge issuance / return; GRC on watchlist flag; EHS-MGMT or REAL-EST on evacuation list updates). | Per-event subscriber draft - listed below in B1-T table. Some events may be leaves (e.g. `host_assignment.created` is plausibly an internal event). |

| B1-T sub-id | Trigger event | Proposed subscriber direction |
|---|---|---|
| B1-T1 | `visitor_check_in.completed` (976) | IGA (badge-issuance trigger), HCM (host notification fan-out parallel to 873). |
| B1-T2 | `visitor_badge.issued` (977) | IGA (PACS provisioning on badge id, when PACS lands). |
| B1-T3 | `visitor_badge.returned` (978) | IGA (de-provision PACS access on return). |
| B1-T4 | `evacuation_list.updated` (981) | EHS-MGMT (emergency-response when EHS-MGMT lands), REAL-EST / IWMS (occupancy reporting). |
| B1-T5 | `visitor_nda.acknowledged` (982) | GRC (compliance evidence), CLM (NDA attach when CLM is the canonical NDA store - judgment call). |
| B1-T6 | `visitor_watchlist.screened` (983) | GRC (block-event compliance evidence) on `flagged` or `blocked` outcome only. |

`host_assignment.created` (979) is plausibly an internal event; flag as leaf-candidate for user confirmation.

#### APQC TAGGING (H1)

For the 3 currently-loaded outbound cross-domain handoffs, proposed PCF activity classification. All three are L4 confident matches against the cross-industry framework (no industry-specific or modern-digital deferrals).

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | external_id | confidence |
|---|---|---|---|---|---|---|---|
| 871 | VIS-MGMT -> IGA | visitor_registration.submitted | visitor_registrations | Provide facility access and security | 1523 | 21690 | confident L4 |
| 872 | VIS-MGMT -> GRC | visitor_audit_log.sealed | visitor_audit_logs | Manage compliance audits | 1570 | 12183 | confident L4 |
| 873 | VIS-MGMT -> HCM | host_notification.sent | host_assignments | Manage safety, security, and access to sites | 1540 | 19228 | confident L4 |

Deferred: none. All three handoffs have clean L4 matches in the cross-industry PCF. Existing `handoff_processes` rows for these handoffs: zero (queried `/handoff_processes?handoff_id=in.(871,872,873)` returned empty). So 3 NEW `agent_curated` proposals at `record_status=new`. This satisfies the H1 volume expectation (N=3 cross-domain handoffs, 0.5N-0.8N expected = 1.5-2.4 proposals; produced 3, all confident).

Once B1-B1 adds new outbound handoffs (T1-T6 above), each new row will need its own APQC tag in the same pass that loads the handoff. The expected PCF for T1-T3 (badge / check-in events to IGA) is the same `Provide facility access and security` (1523); T4 (evacuation list to EHS-MGMT or IWMS) is `Implement emergency response program` (1791, ext 11196); T5 (NDA to GRC) and T6 (watchlist flag to GRC) are `Manage compliance audits` (1570) or `Conduct IT compliance control auditing` (1184).

### Bucket 2 - Surface-for-user (judgment calls)

1. **Module split for VIS-MGMT.** Recommended: 2 modules - `VIS-MGMT-REGISTRATION` (registration + check-in + badge + host) and `VIS-MGMT-COMPLIANCE` (NDA + watchlist + audit log + evacuation list). Alternative: 3 modules adding `VIS-MGMT-EMERGENCY` (evacuation list + mustering only). The 3-way split better matches Envoy's product structure (separate Workplace Safety surface) and lines up with EHS-MGMT if/when it lands. **Decide:** 2-module or 3-module split? Affects every downstream M-band, B-band, E-band fix. Independent of Bucket 3.

2. **Pattern flag `has_personal_content` scope.** B1-S10 confidently flips 6 masters to `has_personal_content=true`. `host_assignments` and `visitor_evacuation_lists` reference visitor identifiers indirectly. Decide: flip those too (treats them as PII-containing for data-retention / DSAR purposes) or leave at `false` (they reference visitor records but don't carry the personal data directly). Also: should any master carry `has_submit_lock=true`? Strong candidate is `visitor_audit_logs` (sealing is a one-way lock); user confirms.

3. **GDPR / CCPA regulation linkage.** VIS-MGMT carries visitor PII (name, ID, photo, signature). `regulations` does not currently include GDPR or CCPA (queried). Should the audit propose adding both regulations + linking via `domain_regulations`? GDPR applicability: EU sites or any visitor processing of EU residents. CCPA: California-resident visitors. **Options:** (a) load both GDPR + CCPA into `regulations` and link to VIS-MGMT (and broadly to other domains touching personal data); (b) defer to a catalog-wide regulation backfill pass (none currently scheduled); (c) load only GDPR (the broader scope) and defer CCPA. Independent of Bucket 1.

4. **OSHA / emergency-response regulation.** `visitor_evacuation_lists` is mandated by OSHA 29 CFR 1910.38 (emergency action plans). Should `OSHA` be added as a regulation and linked to VIS-MGMT? Same options as #3.

5. **NDA storage canonical owner.** `visitor_nda_acknowledgements` is currently mastered in VIS-MGMT. CLM (Contract Lifecycle Management) could plausibly own the NDA artifact (it owns corporate-NDA storage). The catalog's split is non-obvious: per-visit NDA acknowledgements are distinct from negotiated corporate NDAs, so the VIS-MGMT mastery is defensible. **Decide:** keep VIS-MGMT mastery (recommended; per-visit ack is operationally distinct) or promote a slimmer entity to CLM. Affects B1-T5 routing.

6. **B1-T6 watchlist subscriber routing.** `visitor_watchlist.screened` fires on every screening. Subscribing GRC on every event is noisy. Should the handoff fire only on `flagged` or `blocked` outcomes (filter at trigger event vs handoff)? **Options:** (a) one handoff with filter applied semantically (preferred); (b) split into `visitor_watchlist.flagged` and `visitor_watchlist.blocked` distinct trigger events.

7. **`is_canonical_bare_word` arbitration.** None of the 8 masters use bare-word names; all are `visitor_*` / `host_*` prefixed - Rule #9 passes for VIS-MGMT. But `host_assignments` is a borderline bare word (the `host_` prefix is not the domain slug `vis_mgmt_`). Decide: rename to `visitor_host_assignments` for the cluster, or keep `host_assignments` with `is_canonical_bare_word=true` rationale (current row has `is_canonical_bare_word=false`). Surface for user wording.

### Bucket 3 - Phase 0 pending (speculative)

Universal-or-near-universal vendor entities surfaced by the market analyst that warrant formal Phase 0 vendor-research verification before loading:

| Candidate | Proposed module | Vendor evidence basis | Recommended verification |
|---|---|---|---|
| `visitor_kiosk_devices` | VIS-MGMT-REGISTRATION | Envoy, SwipedOn, Proxyclick - kiosk fleet is first-class on every vendor's admin surface | Phase 0 read of vendor admin / device-management docs to confirm whether kiosk fleet management belongs in VIS-MGMT or in a separate UEM / device-management layer. |
| `visitor_camera_captures` | VIS-MGMT-REGISTRATION | Envoy, iLobby, Sign In Solutions | Photo capture at check-in. May overlap with `visitor_id_verifications` (B1-M3) - Phase 0 confirms whether these are one entity or two. |
| `visitor_packages` | VIS-MGMT-REGISTRATION | Envoy Deliveries, Greetly | Mailroom / package-arrival sub-flow. May fold into `delivery_check_ins` (B1-M7) or be a sibling. |
| `visitor_blocklist_entries` | VIS-MGMT-COMPLIANCE | iLobby, Proxyclick, Sign In Solutions | Internal banned-visitor list, distinct from external watchlist screening. Vendor terminology varies (blocklist / banned list / persona-non-grata list). |
| `visitor_emergency_contacts` | VIS-MGMT-COMPLIANCE | Sign In Solutions, iLobby | Visitor-supplied emergency-contact for the visit. Required at regulated sites; optional elsewhere. Phase 0 confirms universality across vendors. |
| `visitor_meeting_rooms` | VIS-MGMT-REGISTRATION | Envoy + Robin/Eptura integration surface | Room-booking attached to the visit (overlaps with WORKPLACE-EXP candidate). Phase 0 confirms whether VIS-MGMT should master the visit-room link or just consume from a workspace-booking domain. |
| `visitor_qr_check_in_methods` | VIS-MGMT-REGISTRATION | Envoy, SwipedOn, Proxyclick | QR / NFC / mobile-app check-in method as a configurable per-type flag. May fold into `visitor_types` (B1-M6) configuration rather than its own entity. |

### Candidates queued to `audits/_missing-domains.md`

The Pass 2 market audit surfaced two distinct VIS-MGMT-adjacent markets that have no row in `domains`:

- **PACS** (Physical Access Control Systems) - HID Global, Genetec, Lenel S2, Brivo, Honeywell Pro-Watch, Johnson Controls C-CURE 9000. Distinct from VIS-MGMT (which handles the visitor lifecycle) and from IGA (logical identity). Queued for triage.
- **WORKPLACE-EXP** (Workplace Experience and Workspace Booking) - Envoy Workplace (already a VIS-MGMT solution), Robin, Eptura, OfficeSpace, Condeco, Kadence, Tactic. Desk / room / hybrid-attendance booking. Adjacent to VIS-MGMT (Envoy bundles both); plausibly a distinct domain or a fold-into IWMS / REAL-EST depending on the point-solution-market test. Queued for triage.

### Cross-bucket dependencies

- **Bucket 2 #1 (module split) gates every Bucket 1 M-band / B-band / F-band fix.** Until the module shape is decided, B1-S1, B1-S5, B1-S6, B1-S7, B1-S9, and every B1-M entity proposal cannot be wired to a specific module. Resolve Bucket 2 #1 first.
- **Bucket 2 #3 / #4 (GDPR / CCPA / OSHA regulation linkage) is independent of the rest** but unlocks a B-band regulations check that otherwise stays empty.
- **Bucket 3 entities are independent of Bucket 1 structural items** but a few overlap (Bucket 3 `visitor_camera_captures` may collapse into B1-M3 `visitor_id_verifications`; Bucket 3 `visitor_packages` may collapse into B1-M7 `delivery_check_ins`). If Bucket 3 vetting changes the entity count, Bucket 1 module assignments may need rebalancing.
- **PACS candidate (queued) interacts with B1-T2 / B1-T3** (badge issued / returned handoffs). If PACS is promoted, those handoffs route to PACS modules rather than IGA-AUTO-PROVISIONING. If PACS folds into IGA, the current IGA target stands. Independent of Bucket 1's other items but affects T2 / T3 destination.

### Per-bucket prompts

- **Bucket 1:** *Fix these now? This is a structural rebuild; Bucket 2 #1 (module split) MUST be decided first because every B1-S* and B1-M* item carries a module assignment. Reply with the chosen split (2 modules or 3 modules) and "fix all" / "fix items 1, 3, 5" / "skip".*
- **Bucket 2:** *What's your call on each? Items 3, 4, 5, 6, 7 are independent of each other. Item 1 gates all Bucket 1 fixes. Item 2 is a per-row PATCH that can run alongside the rest of Bucket 1.*
- **Bucket 3:** *Vet via Phase 0 vendor research (formal pass against the 6 flagship vendors) or eyeball-mode? If eyeball, name which of the 7 candidates ring true.*

### Report-only follow-ups (owed by other domains)

These items are owed by other domains' next audits; the fix does NOT live in VIS-MGMT's queue.

- **IGA B10b (inbound) owes `target_domain_module_id` backfill on handoff rows where VIS-MGMT is the source.** Row 871 already has `target_domain_module_id=148` (IGA-AUTO-PROVISIONING) so this is covered for the currently-loaded row, but the B1-T1 / B1-T2 / B1-T3 candidates (when loaded) will land NULL on the IGA side until IGA's B10b passes them. Surface in IGA's next audit.
- **GRC B10b (inbound) owes `target_domain_module_id` backfill on row 872** (`visitor_audit_log.sealed`). Currently NULL because no module-level resolution decided; the audit notes the gap for GRC's next pass.
- **HCM B10b (inbound) owes `target_domain_module_id` backfill on row 873** (`host_notification.sent`). Same shape as above.
- **GRC B8 owes inbound `data_object_relationships` row** mirroring handoff 872 (e.g. `visitor_audit_logs` -> `compliance_evidence` (id 288) via verb `feeds` or `evidences`). One such relationship is already loaded (`visitor_audit_logs feeds compliance_evidence (288)`), so this report-only follow-up is satisfied from VIS-MGMT's side; GRC's audit confirms.
- **HCM B8 owes inbound `data_object_relationships` row** mirroring handoff 873. Row `host_assignments` -> `employees` (id 31) already exists with verb `is host for`, so this is also satisfied from VIS-MGMT's side.
- **IGA B8 owes inbound `data_object_relationships` row** mirroring handoff 871. Row `visitor_registrations provisions iga_provisioning_events (708)` already exists; satisfied from VIS-MGMT's side.
- **Light pairwise summary (Pass 4):**
  - **VIS-MGMT <-> IGA:** 1 outbound handoff + 1 inbound DMDO consumer. Clean structurally (handoff has target module FK; DMDO is loaded). No B-band gaps from VIS-MGMT's side. PACS candidate (queued) may change the IGA target for badge-handoff rows when loaded.
  - **VIS-MGMT <-> GRC:** 1 outbound handoff with `target_domain_module_id=NULL` - GRC owes the backfill. Compliance-evidence relationship is loaded.
  - **VIS-MGMT <-> HCM:** 1 outbound handoff with `target_domain_module_id=NULL` - HCM owes the backfill. `host_assignments` -> `employees` relationship is loaded.

## 2026-05-31, Continuation: B1 technical fixes

Applied the truly-technical subset of the B1 backlog via [.tmp_deploy/fix_vis_mgmt_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_vis_mgmt_b1_technical_2026_05_31.ts). Total B1 items in the prior audit: 17 (S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, M1, M2, M3, M4, M5, M6, M7) plus B1 (trigger-event subscriber sweep, with sub-items T1-T6) plus APQC TAGGING (3 cross-domain handoffs).

### Applied

- **APQC TAGGING (H1):** inserted 3 `handoff_processes` rows for the currently-loaded outbound handoffs. Audit pre-specified `handoff_id` + PCF `process_id` for each; all three PCFs verified live before insert (`processes` 1523 / 1540 / 1570 are confirmed `apqc_pcf_cross_industry` rows at hierarchy_level 4); `handoff_processes` rows for these `handoff_id`s confirmed absent before insert.
  - handoff 871 (VIS-MGMT -> IGA, `visitor_registration.submitted`) -> process 1523 'Provide facility access and security' (PCF external_id 21690).
  - handoff 872 (VIS-MGMT -> GRC, `visitor_audit_log.sealed`) -> process 1570 'Manage compliance audits' (PCF external_id 12183).
  - handoff 873 (VIS-MGMT -> HCM, `host_notification.sent`) -> process 1540 'Manage safety, security, and access to sites' (PCF external_id 19228).
  - All loaded with `proposal_source='agent_curated'`; `record_status` omitted so the `new` default applies (Rule #1).

### Deferred (16 items + sub-items)

- **B1-S1 (modules), B1-S2 (capabilities), B1-M1..M7 (new entities), B1-T1..T6 (new outbound handoffs):** all create new entities; outside the truly-technical screen.
- **B1-S3 (`catalog_tagline` + `catalog_description`):** Rule #20 requires buyer-voice draft + user review BEFORE writing.
- **B1-S4 (`business_logic`):** audit explicitly says 'surface to user'.
- **B1-S5 (DELETE legacy skill 117) + B1-S6 (channel-primitive replacement):** gated on B1-S1 modules existing; cannot retire the domain-level skill before per-module skills are authored.
- **B1-S7 (B10b `source_domain_module_id` backfill on handoffs 871/872/873):** the source modules do not yet exist (VIS-MGMT has zero `domain_modules` rows), so the per-master resolution rule has nothing to resolve to. Becomes derivable once B1-S1 lands.
- **B1-S8 (`relationship_verb` rename of `logged_in`):** audit explicitly says 'surface to user for the exact wording'.
- **B1-S9 (lifecycle states across 8 masters):** gated on B1-S1 modules (states need `domain_module_id` set per Rule M5).
- **B1-S10 (pattern flag flips `has_personal_content` / `has_submit_lock`):** per the orchestrator's truly-technical screen, pattern flag flips are deferred; live state confirmed all 8 masters at `false` for all three flags.
- **Bucket 2 #3 / #4 (GDPR / CCPA / OSHA regulation linkage):** audit surfaces as 'options:' multi-choice; user picks. Also the regulations themselves are not currently in the catalog (separate research load).
- **Bucket 3 (Phase 0 candidates):** speculative, requires vendor-research pass.

### Audit blockers still open

The structural rebuild is unchanged: M1 fails (0 modules), A2 fails (0 capabilities), A4 fails (empty catalog UX fields), B-band gaps on lifecycle states + pattern flags + intra-domain handoffs + (after B1-S1) B10b backfill. The single technical pass closes H1 for the three currently-loaded handoffs; everything else needs the user decisions in Bucket 2 #1 (2-module vs 3-module split) before fixes can proceed.

### UI spot-check

- https://tests.semantius.app/domain_map/handoff_processes

## 2026-05-31, Audit

### Summary

Fresh Validate b1 structural pass. Same shape as the 2026-05-30 audit (the 2026-05-31 Continuation only resolved H1 via the 3 `handoff_processes` inserts). The structural rebuild remains the blocking story: 0 `domain_modules` (M1 hard fail), 0 capabilities (A2 fail), 0 lifecycle states (B12 fail), 0 module-level system skills (F2 fail), legacy domain-level system skill 117 still live (F1 fail), empty `catalog_tagline` / `catalog_description` (A4 fail). All downstream M/E/F bands cascade off M1.

Counts: 8 master `data_objects` in legacy `domain_data_objects` (visitor_registrations 668, visitor_check_ins 669, visitor_badges 670, host_assignments 671, visitor_evacuation_lists 672, visitor_nda_acknowledgements 673, visitor_watchlist_screenings 674, visitor_audit_logs 675). 10 trigger_events on those masters. 3 outbound cross-domain handoffs (871 to IGA, 872 to GRC, 873 to HCM). 0 inbound. 19 `data_object_relationships` involving VIS-MGMT masters (12 intra-domain + 4 to users 748 + 1 to employees 31 + 1 to compliance_evidence 288 + 1 to iga_provisioning_events 708). 16 aliases. 4 solutions (Envoy Workplace, Proxyclick, SwipedOn primary; ServiceNow Workplace Service Delivery secondary). 2 `business_function_domains` (Facilities and Real Estate owner, Security contributor). 1 legacy system skill (id 117) with 10 `skill_tools`. 3 `handoff_processes` rows (all 3 outbound handoffs tagged `agent_curated`, `record_status='new'`).

- Bucket 1 (in-scope, agent fixable): 9 items.
- Bucket 2 (surface-for-user, judgment): 7 items.
- Bucket 3 (Phase 0 pending, speculative): 7 items.

### Bucket 1, In-scope confirmed gaps

#### Structural band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1A-S1 | M1 / M2 | Zero `domain_modules` rows. Domain has 8 masters but no host module. Rule #14 mandates >=1 full module; with 0 capabilities, M2 is vacuous, but once capabilities exist a 2-module floor likely applies. | Author the module set. Recommended (see Bucket 2 #1): `VIS-MGMT-REGISTRATION` (registration + check-in + badge + host) and `VIS-MGMT-COMPLIANCE` (NDA + watchlist + audit log + evacuation list). Optional 3-way split adds `VIS-MGMT-EMERGENCY`. |
| B1A-S2 | A2 / M4 / M6 | Zero `capability_domains` rows. Domain has no capabilities linked. Once modules exist, M6 requires every module realize >=1 capability. | Author >=3 capabilities. Recommended: `VISITOR-PREREG`, `VISITOR-CHECKIN`, `VISITOR-COMPLIANCE`, `EMERGENCY-ROSTER`, `HOST-MANAGEMENT`. Link each via `capability_domains` + `domain_module_capabilities`. |
| B1A-S3 | A4 | `catalog_tagline` and `catalog_description` both empty on the `domains` row. Rule #20 requires both populated in buyer voice. | Draft both fields per Rule #20 and surface to user for review BEFORE writing (Rule #20 + Rule #1). |
| B1A-S4 | B4 | Pattern flags `has_personal_content`, `has_submit_lock`, `has_single_approver` all `false` on all 8 masters. Six masters carry visitor PII (name, ID, photo, signature). `visitor_audit_logs` likely has a one-way submit lock (sealing). | PATCH `has_personal_content=true` on the six PII-bearing masters (`visitor_registrations`, `visitor_check_ins`, `visitor_badges`, `visitor_nda_acknowledgements`, `visitor_watchlist_screenings`, `visitor_audit_logs`). PATCH `has_submit_lock=true` on `visitor_audit_logs`. The remaining 2 masters routed to Bucket 2 #2 for judgment. |
| B1A-S5 | B9 | All 10 `trigger_events` rows have `event_category=''`. Per Rule #13 allowed values: `lifecycle`, `state_change`, `threshold`, `signal`. | PATCH `event_category` on all 10 rows. Most are `lifecycle` (`visitor_registration.submitted`, `visitor_check_in.completed`, `visitor_badge.issued`, `visitor_badge.returned`, `host_assignment.created`, `visitor_nda.acknowledged`, `visitor_audit_log.sealed`); `host_notification.sent` is a `signal`; `evacuation_list.updated` is `state_change`; `visitor_watchlist.screened` is `state_change`. |
| B1A-S6 | M5 / B12 | Zero `data_object_lifecycle_states` rows on any of the 8 masters. Most masters have workflow shapes (registration submitted->approved->arrived->checked_out; badge issued->active->returned/lost; check-in pending->verified->badged/denied; nda sent->signed/declined; watchlist queued->cleared/flagged/blocked; audit_log open->sealed). | Author lifecycle states per master once modules exist (B1A-S1 prereq). `requires_permission=true` on gated transitions (`approve`, `escalate`, `seal`, `block`). `domain_module_id` set per realizing module. |
| B1A-S7 | F1 | Legacy domain-level system skill `vis-mgmt-system` (id 117, `domain_id=24`, `domain_module_id=null`). | DELETE skill 117 after module-level skills land (B1A-S1 prereq), per Rule #17 + F1. The 10 `skill_tools` rows migrate: 8 per-master `query_*` tools split across the 2 modules; `send_email` / `send_sms` routed to B1A-S8. |
| B1A-S8 | F7 | `skill_tools` rows linking `send_email` (tool 37) and `send_sms` (tool 38) to skill 117 with empty `notes`. Host notification + evacuation broadcast are exactly the substitutable-channel shape. | DELETE both rows; replace with `notify_person` (single-recipient host notification) and `notify_team` (evacuation broadcast). Apply during per-module skill authoring after B1A-S1. |

#### Boundary findings

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1A-B1 | B10b | All 3 outbound handoffs (871, 872, 873) have `source_domain_module_id=NULL`. Legit at insert time (no modules existed), but blocked on B1A-S1. After modules land, deterministic per-master backfill: row 871 (payload `visitor_registrations`) to VIS-MGMT-REGISTRATION; row 872 (payload `visitor_audit_logs`) to VIS-MGMT-COMPLIANCE; row 873 (payload `host_assignments`) to VIS-MGMT-REGISTRATION. | Backfill after B1A-S1. |

#### APQC TAGGING (H1)

All 3 outbound cross-domain handoffs (871/872/873) already carry `handoff_processes` rows (`agent_curated`, `record_status='new'`); no new tagging this audit. Coverage (approved) = 0; Provenance (agent_curated) = 3. 0 deferred. Volume target satisfied by the 2026-05-31 Continuation pass.

| handoff_id | source -> target | trigger_event | payload | PCF | external_id | state |
|---|---|---|---|---|---|---|
| 871 | VIS-MGMT -> IGA | visitor_registration.submitted | visitor_registrations | Provide facility access and security (1523) | 21690 | agent_curated, new |
| 872 | VIS-MGMT -> GRC | visitor_audit_log.sealed | visitor_audit_logs | Manage compliance audits (1570) | 12183 | agent_curated, new |
| 873 | VIS-MGMT -> HCM | host_notification.sent | host_assignments | Manage safety, security, and access to sites (1540) | 19228 | agent_curated, new |

### Bucket 2, Surface-for-user (judgment calls)

1. **Module split for VIS-MGMT** (carried from 2026-05-30). 2-module (`VIS-MGMT-REGISTRATION` + `VIS-MGMT-COMPLIANCE`) vs 3-module (add `VIS-MGMT-EMERGENCY`). Gates B1A-S1 + B1A-S2 + B1A-S6 + B1A-S7 + B1A-S8 + B1A-B1.
2. **Pattern flag scope on `host_assignments` and `visitor_evacuation_lists`** (B4). They reference visitor identifiers indirectly. Decide: flip `has_personal_content=true` (DSAR / retention treatment) or leave `false`.
3. **GDPR / CCPA regulation linkage** (carried). 0 `domain_regulations` rows. VIS-MGMT carries visitor PII. Decide: load GDPR + CCPA into `regulations` and link, defer to catalog-wide backfill, or load only GDPR.
4. **OSHA emergency-response linkage** (carried). `visitor_evacuation_lists` is mandated by OSHA 29 CFR 1910.38. Decide load + link or defer.
5. **NDA storage canonical owner** (carried). `visitor_nda_acknowledgements` vs CLM ownership.
6. **B9 watchlist subscriber routing** (carried). `visitor_watchlist.screened` (event 983): fire on every screening (noisy) or filter on `flagged` / `blocked` (split event vs single handoff).
7. **`relationship_verb` rewording on rows 416 + 417** (B6). Both use verb `logged_in` (sentence-incomplete, not audit-log idiom). Recommended `audited_in` or `records_event_in`. User picks exact wording per Rule #15-adjacent care for relationship phrasing.

### Bucket 3, Phase 0 pending (speculative)

Carried unchanged from 2026-05-30 (no Phase 0 vendor research has been run for VIS-MGMT since):

1. `visitor_invitation_links` (REGISTRATION). Magic-link / QR pre-registration token. Universal across enterprise vendors.
2. `visitor_health_screenings` (REGISTRATION). Health attestation / vaccination / symptom screening. Distinct from watchlist.
3. `visitor_id_verifications` (REGISTRATION). Government-ID scan / photo / passport. Required for ITAR / FDA.
4. `visitor_pre_arrival_documents` (COMPLIANCE). Safety briefings / site policies distinct from NDA.
5. `visitor_groups` (REGISTRATION). Multi-visitor delegation / contractor crew / tour group.
6. `visitor_types` (REGISTRATION). Configuration master defining per-type flow.
7. `delivery_check_ins` (REGISTRATION or own module). Couriers / deliveries sub-flow.

### Cross-bucket dependencies

- Bucket 2 #1 (module split) gates every Bucket 1 fix carrying module attribution (B1A-S1, S2, S6, S7, S8, B1A-B1).
- Bucket 2 #3 / #4 (regulation linkage) independent of Bucket 1 module set.
- Bucket 3 entities #2 (`visitor_health_screenings`) overlaps Bucket 2 #6 (watchlist event routing logic); independent decision shapes though.
- Bucket 3 #3 (`visitor_id_verifications`) and a separately-queued PACS candidate change Bucket 1 B1A-S1 module load count if promoted.

### Report-only follow-ups (owed by other domains)

- **IGA B10b inbound:** handoff 871 already has `target_domain_module_id=148`; covered.
- **GRC B10b inbound:** handoff 872 has `target_domain_module_id=NULL`; GRC owes backfill.
- **HCM B10b inbound:** handoff 873 has `target_domain_module_id=NULL`; HCM owes backfill.
- **GRC B8 inbound:** `data_object_relationships` row 426 (`visitor_audit_logs feeds compliance_evidence 288`) already loaded; satisfied.
- **HCM B8 inbound:** row 428 (`employees 31 is host for host_assignments 671`) already loaded; satisfied.
- **IGA B8 inbound:** row 427 (`visitor_registrations provisions iga_provisioning_events 708`) already loaded; satisfied.

### UI spot-check

- https://tests.semantius.app/domain_map/domains
- https://tests.semantius.app/domain_map/domain_modules
- https://tests.semantius.app/domain_map/data_objects
- https://tests.semantius.app/domain_map/handoffs
- https://tests.semantius.app/domain_map/skills

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

State-driven Validate pass (Rule #21). Worked only the open items in state.yaml; no fresh from-scratch audit. Live re-verification confirmed VIS-MGMT (domain id 24) is still UNBUILT: 0 `domain_modules` (M1 fail), 0 `capability_domains` (A2 fail), empty `business_logic`. Per Rule #21's UNBUILT clause the agent did NOT scaffold the build and LEFT the entire module-attribution cascade; it executed only the cascade-independent, mechanical, additive/corrective items that touch rows already in the catalog.

### Executed (record_status untouched, all additive/corrective)

- **entity_type classification (B13 / Rule #12): 8 masters** patched from `unclassified` to typed enum. 6 -> `operational_workflow` (visitor_registrations 668, visitor_check_ins 669, visitor_badges 670, host_assignments 671, visitor_evacuation_lists 672, visitor_watchlist_screenings 674); 2 -> `operational_record` (visitor_nda_acknowledgements 673 per-visit ack artifact, visitor_audit_logs 675 append-only trail). Consequence: B12 lifecycle states are now a confirmed requirement on the 6 workflow masters once modules land (B1A-S6).
- **Catalog UX (B1A-S3 / Rule #20): domain row 24** catalog_tagline + catalog_description authored in buyer voice (workflow + value, no vendor names, no em-dash, American English) and written. The stale "surface-before-write" gate was ignored per Rule #21. No modules exist, so no module-level catalog copy applies.
- **event_category backfill (B1A-S5 / Rule #13): 10 trigger_events** (975..984) patched from `''` to enum: 7 `lifecycle` (975, 976, 977, 978, 979, 982, 984), 1 `signal` (980 host_notification.sent), 2 `state_change` (981 evacuation_list.updated, 983 visitor_watchlist.screened).

Loader: [.tmp_deploy/vis_mgmt_state_execute_2026_06_07.ts](../../.tmp_deploy/vis_mgmt_state_execute_2026_06_07.ts). Idempotent; re-running writes nothing.

### Surfaced (user decisions / destructive, not written)

- **B2-MODULE-SPLIT** (gates the whole build): 2-module vs 3-module partition of the 8 masters.
- **B2-PII-INDIRECT** + the B1A-S4 flag set: agent-recommended has_personal_content=true on the 6 directly-PII-bearing masters and has_submit_lock=true on visitor_audit_logs 675, plus the host_assignments 671 / visitor_evacuation_lists 672 judgment call. Whole set gated on this user decision (pattern flags are judgment, not deterministic backfill per Rule #12 note).
- **B2-GDPR-CCPA**, **B2-OSHA**: regulation load + linkage scope (domain_regulations empty).
- **B2-NDA-OWNERSHIP**: keep visitor_nda_acknowledgements in VIS-MGMT vs promote to CLM.
- **B2-WATCHLIST-ROUTING**: filter visitor_watchlist.screened on flagged/blocked vs split events.
- **B2-LOGGED-IN-VERB** (DESTRUCTIVE): rows 416 + 417 use relationship_verb `logged_in` / inverse `logs`. Recommend `audited_in`/`audits` or `records_event_in`/`records`. Overwrites a non-empty value, so not applied; user picks wording.

### Left (untouched)

- **B1A-BUILD** + build cascade **B1A-S1, S2, S4, S6, B1A-B1**: all carry module attribution and wait on B2-MODULE-SPLIT; LEFT per Rule #21 UNBUILT (do not scaffold, leave the cascade).
- **B1A-S7, B1A-S8**: RETIRED per the 2026-06-06 supersession header (per-module skill grain / `skill_tools` dropped). Reframed as notes in state.yaml with status: retired; skill 117 is now the correct one-per-domain shape. Per-module tool authoring tracked in audits/_modularization-backlog.md.
- **b3 backlog (7 candidates)**: visitor_invitation_links, visitor_health_screenings, visitor_id_verifications, visitor_pre_arrival_documents, visitor_groups, visitor_types, delivery_check_ins. Non-blocking ideas.
- **business_function_domains (C1)**: already satisfied (Facilities and Real Estate owner id 235, Security contributor id 236); not an open item.

### Post-fix status

next_action_by = user (the build is gated on B2-MODULE-SPLIT, the single decision that unblocks B1A-BUILD).

### UI spot-check

- https://tests.semantius.app/domain_map/data_objects
- https://tests.semantius.app/domain_map/domains
- https://tests.semantius.app/domain_map/trigger_events
