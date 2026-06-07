# MSP-PSA audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 4 full modules (`MSP-PSA-SVC-DESK` 137, `MSP-PSA-CONTRACTS` 138, `MSP-PSA-TIME-BILLING` 139, `MSP-PSA-DISPATCH` 140), 0 starters, no `domain_module_host_domains` cross-cutting hosts. 5 masters (`msp_tickets`, `msp_contracts`, `msp_time_entries`, `msp_invoices`, `msp_clients`). 6 capabilities (`MSP-TICKET`, `MSP-CONTRACT`, `MSP-BILLING`, `MSP-TIME`, `MSP-DISPATCH`, `MSP-CSAT`), all bound to a module via `domain_module_capabilities`. 10 solutions across coverage levels (5 primary, 2 secondary, 1 partial in CW RMM, plus 2 supporting). 20 DMDO rows (5 master, 15 non-master). 16 trigger_events on the 5 masters. 22 lifecycle states. 10 cross-domain handoffs (3 outbound to CSM/ERP-FIN, 2 outbound to REMOTE-ACCESS/HAM, plus the SVC-DESK consumers) and 4 intra-domain cross-module handoffs. 12 aliases. 17 data_object_relationships (incl. 7 platform_builtin `users` 748 edges, per Rule #10). 1 system skill (id 85) with 6 skill_tools. 0 MSP-PSA permissions. 0 MSP-PSA `role_modules`. 0 MSP-PSA roles. 0 APQC tags on any of the 10 cross-domain handoffs.
- **Vendor-surface basis (Pass 2 flagship enumeration):** ConnectWise PSA, Datto Autotask PSA (Kaseya), Kaseya BMS, HaloPSA, SuperOps, SyncroMSP, Atera (with PSA), Naverisk (with PSA), Pulseway (with PSA), Promys PSA, Tigerpaw One. Compliance anchors are light for MSP-PSA itself (SOC 2 of the MSP, plus PCI for client estates handled by techs); the regulated workload sits in adjacent RMM / DSPM / VULN-MGMT rather than in MSP-PSA proper.
- **Bucket 1 (in-scope, agent fixable):** 11 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 6 items.

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO + cross-domain relationships, ranked by edge weight):

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| REMOTE-ACCESS (132) | 1 | 2 | 1 (`remote_sessions` consumer on SVC-DESK 137) | 0 | 5 | Pairwise (full) |
| RMM (130) | 0 | 1 | 2 (`rmm_agents` consumer on SVC-DESK 137 + DISPATCH 140, `monitoring_alerts` consumer on SVC-DESK 137) | 0 | 4 | Pairwise (full) |
| CSM (30) | 2 | 0 | 0 | 0 | 3 | Pairwise (full) |
| ERP-FIN (65) | 2 | 0 | 0 | 0 | 3 | Pairwise (full) |
| HAM (51) | 1 | 0 | 1 (`hardware_assets` consumer on SVC-DESK 137 + DISPATCH 140) | 0 | 3 | Pairwise (full) |
| WSC (75) | 0 | 1 | 1 (`chat_messages` consumer on SVC-DESK 137) | 1 (`chat_messages materializes_as msp_tickets`) | 4 | Pairwise (full) |
| ITSM (1) | 0 | 0 | 0 | 0 | 0 | Lightweight (boundary check, sibling market) |
| PSA (68) | 0 | 0 | 0 | 0 | 0 | Lightweight (boundary check, sibling market) |
| FSM (31) | 0 | 0 | 0 | 0 | 0 | Lightweight (boundary check, sibling market) |
| CRM (69) | 0 | 0 | 0 | 0 | 0 | Lightweight (Bucket 3 candidate) |
| SUB-MGMT (97) | 0 | 0 | 0 | 0 | 0 | Lightweight (Bucket 3 candidate) |
| CPQ (73) | 0 | 0 | 0 | 0 | 0 | Lightweight (Bucket 3 candidate) |

**Structural pass bands:** A passes. M1 passes (each module has at least one master, and the 4-module domain has more than the 2-module floor for 6 capabilities). M3 passes (every capability is realized in a module via `domain_module_capabilities`). **M7 partial-fail** (3 sibling-module consumer DMDOs on masters: `msp_tickets` consumer on TIME-BILLING 139 / DISPATCH 140; `msp_contracts` consumer on TIME-BILLING 139; `msp_clients` consumer on SVC-DESK 137 / TIME-BILLING 139 / DISPATCH 140; `msp_time_entries` contributor on DISPATCH 140, contributor is allowed sibling, but the consumers warrant review). **B4 partial-fail** (4 of 5 masters carry `has_personal_content=false`, but msp_tickets / msp_contracts / msp_invoices / msp_clients all carry counterparty contact info; pattern flag should likely be re-evaluated). **B9 passes** on `event_category` (all 16 trigger_events populated with `state_change` or `threshold`). **B10b partial-fail** (handoffs 159, 163, 835, 161, 523, 524, 525, 526 carry NULL FK on the non-MSP-PSA side, reported as report-only). **B11 advisory** (handoff 835 carries a Rule #15 violation in `notes`: "target NULL until MSP-PSA is modularized"; MSP-PSA IS modularized now, the note is stale). **E1 hard-fail** (zero `role_modules` rows on any of the 4 MSP-PSA modules). **E3 hard-fail** (zero permissions named `msp-psa-*-:*` exist; the 4 modules have no `permissions` rows). **F2 hard-fail** (Rule #17: each `domain_modules` row needs exactly one `skill_type='system'` skill with `domain_module_id` set; MSP-PSA has 1 skill bound to `domain_id=131` and `domain_module_id=NULL`, 4 module skills are missing). **F3 advisory** (the single skill carries 6 `skill_tools`; floor satisfied for one module's worth of tooling, but with no module-level skill the per-module tool coverage is unverifiable). **F5 rollup-fail** (Semantius score uncomputable per-module due to F2). **H1 hard-fail** (0 of 10 cross-domain handoffs carry an APQC tag; volume target 5 to 8 agent_curated rows).

MSP-PSA Semantius score: NOT COMPUTABLE today. The single skill 85 spans the whole domain rather than any module. Once the 4 module-level system skills land (B1-S8 below), each module's score becomes computable; today's read is "uncomputable" by F5 rollup.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M7, sibling consumer DMDOs on masters** | `msp_tickets` (233, master in SVC-DESK 137) is `consumer + contributor` in TIME-BILLING 139 (id 692, contributor) and `contributor` in DISPATCH 140 (id 695, contributor). Contributors are allowed sibling roles, but the `consumer + required` on `msp_clients` (237) replicated across SVC-DESK 137 (id 683) and TIME-BILLING 139 (id 694) and DISPATCH 140 (id 697) is the standard sibling-consumer pattern. The CLM-style M7 default would DELETE. However, contributor on time-entries (writing time entries against a ticket from DISPATCH) IS a write back to a sibling master, that is the intended Phase E pattern, not M7 incoherence. Re-classify: `msp_clients` consumer triples on every other module is the only M7 trip, and it is genuine. Surface architectural choice as B2-S1; on user approval of DELETE, proceed to DELETE the consumer rows in SVC-DESK, TIME-BILLING, DISPATCH for `msp_clients`. | DELETE 3 `domain_module_data_objects` rows: (137, 237, consumer) id=683, (139, 237, consumer) id=694, (140, 237, consumer) id=697. CONTRACTS 138 keeps the master row. |
| B1-S2 | **B11 advisory, Rule #15 stale `notes` on handoff** | Handoff 835 (`chat_messages` from WSC -> MSP-PSA SVC-DESK) carries `notes='target NULL until MSP-PSA is modularized'`. The target IS populated (`target_domain_module_id=137`); the note is stale provenance commentary that Rule #15 forbids. | PATCH handoff 835 set `notes=''`. |
| B1-S3 | **B10b report-only (outbound NULLs owed by other domains)** | 4 outbound handoffs carry NULL `target_domain_module_id`: 161 (HAM), 523 (CSM), 524 (ERP-FIN), 525 (CSM), 526 (ERP-FIN). The 5 NULLs span HAM (1), CSM (2), ERP-FIN (2). Per B10b's asymmetry, target module is the target-domain's audit work. MSP-PSA's source side is populated on every outbound row. | Schedule b1 audits for HAM, CSM, ERP-FIN to populate `target_domain_module_id` on those rows. |
| B1-S4 | **B10b report-only (inbound NULLs owed by source domains)** | 3 inbound handoffs carry NULL `source_domain_module_id`: 159 (RMM), 163 (REMOTE-ACCESS), 647 (REMOTE-ACCESS). Handoff 835 (WSC) has `source_domain_module_id=115` populated. | Schedule b1 audits for RMM and REMOTE-ACCESS to populate `source_domain_module_id`. |
| B1-S5 | **Pairwise, missing consumer DMDOs on downstream domains** | Several MSP-PSA-targeted outbound handoffs imply consumer DMDOs on the target side that do not exist: CSM consumes `msp_tickets` (523) and `msp_contracts` (525) but no CSM module declares; ERP-FIN consumes `msp_contracts` (526) and `msp_invoices` (524) but no ERP-FIN module declares; HAM is consumer-side for `hardware_assets` (already mastered there, so the outbound is HAM-mastering, not MSP-PSA's owe). | Each target domain's b1 audit adds a `consumer` DMDO row on the relevant MSP-PSA master in the receiving module. Not MSP-PSA's fix; surface here so target audits can pick it up. |
| B1-S6 | **E1 hard fail, no role_modules on any module** | The 4 MSP-PSA modules carry zero `role_modules` rows. Phase E for the domain has not run. The catalog therefore does not specify which roles use SVC-DESK, CONTRACTS, TIME-BILLING, DISPATCH. Expected roles based on capability shape: MSP-TECHNICIAN (uses SVC-DESK + TIME-BILLING + DISPATCH, primary), MSP-DISPATCHER (DISPATCH primary, SVC-DESK secondary), MSP-ACCOUNT-MANAGER (CONTRACTS primary, SVC-DESK + TIME-BILLING secondary), MSP-BILLING-ADMIN (TIME-BILLING + CONTRACTS, primary), MSP-CSAT-ANALYST (SVC-DESK, secondary). | Insert 5 `roles` rows + `role_modules` junctions per the role->module map above. Author Phase E for MSP-PSA. |
| B1-S7 | **E3 hard fail, no permissions on any module** | The 4 modules have no `permissions` rows. Rule #14's scaffold expects baseline read/manage/admin per module (12 minimum) plus workflow-gate permissions from lifecycle states with `requires_permission=true` (16 of 22 lifecycle states qualify). | Insert 12 baseline permissions (3 per module x 4 modules) + 16 workflow-gate permissions derived from lifecycle states. Wire `role_permissions` after B1-S6 lands. |
| B1-S8 | **F2 hard fail, system skills missing on 4 modules** | Rule #17 invariant: each `domain_modules` row gets exactly one `skill_type='system'` skill with `domain_module_id` set. Catalog state: 1 skill (`msp-psa-system`, id 85) bound to `domain_id=131` only, `domain_module_id=NULL`. Each of SVC-DESK 137, CONTRACTS 138, TIME-BILLING 139, DISPATCH 140 needs its own module-bound system skill. | Author 4 new `skills` rows (e.g. `msp-psa-svc-desk-system`, `msp-psa-contracts-system`, `msp-psa-time-billing-system`, `msp-psa-dispatch-system`), each with `skill_type='system'`, `domain_id=131`, `domain_module_id=<id>`. The legacy single domain-wide skill 85 either gets RETIRED (preferred, since Rule #17 is "one per module" not "one per domain") or REPURPOSED to `skill_type='role'`/`process`. Surface as B2-S6. Author `skill_tools` rows for each new module skill, with 5 to 12 tools per module (queries + mutates on the module's masters + side_effects). |
| B1-S9 | **F3, single domain-wide skill carries 1 side_effect tool, notify_person** | Skill 85 currently has tool 913 `notify_person` (`side_effect`, `data_object_id=NULL`, channel primitive). When skill 85 retires (B1-S8), the `notify_person` link survives only on whichever new module skill genuinely needs it (SVC-DESK for SLA breach alerts; DISPATCH for routing notifications). The 5 `query_*` tools (590, 591, 592, 593, 594) repoint to the correct module skill per master: query_msp_tickets to SVC-DESK, query_msp_contracts to CONTRACTS, query_msp_time_entries + query_msp_invoices to TIME-BILLING, query_msp_clients to CONTRACTS. | Reassign existing tools to new module skills as part of B1-S8 loader. |

#### APQC TAGGING (matches the anti-pattern: prior MSP-PSA load shipped zero APQC coverage; volume target 5 to 8 `agent_curated` rows for N=10)

Zero of 10 cross-domain handoffs carry `handoff_processes` rows. The audit proposes the following candidates from the analyst's structural-pass model:

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id (lookup at fix time) | Confidence |
|---|---|---|---|---|---|---|
| 159 | RMM -> MSP-PSA SVC-DESK | `monitoring_alert.threshold_breached` | `msp_tickets` | Manage IT service incidents / Resolve customer service requests | needs PCF lookup | confident L3 |
| 160 | MSP-PSA SVC-DESK -> REMOTE-ACCESS | `msp_ticket.escalated` | `msp_tickets` | Manage IT service requests / Resolve customer issues | needs PCF lookup | confident L3 |
| 161 | MSP-PSA SVC-DESK -> HAM | `ticket.created` | `hardware_assets` | Manage asset data / Maintain asset master | needs PCF lookup | confident L3 |
| 163 | REMOTE-ACCESS -> MSP-PSA TIME-BILLING | `msp_session.completed` | `msp_time_entries` | Manage employee time / Capture labor time | needs PCF lookup | confident L3 |
| 523 | MSP-PSA SVC-DESK -> CSM | `msp_ticket.escalated` | `msp_tickets` | Manage customer service problems, requests, and inquiries (10388) | 10388 | confident L3 |
| 524 | MSP-PSA TIME-BILLING -> ERP-FIN | `msp_invoice.issued` | `msp_invoices` | Process accounts receivable / Invoice customer | needs PCF lookup | confident L3 |
| 525 | MSP-PSA CONTRACTS -> CSM | `msp_contract.renewal_due` | `msp_contracts` | Manage sales partners / Manage customer accounts (renewal) | needs PCF lookup | confident L3 |
| 526 | MSP-PSA CONTRACTS -> ERP-FIN | `msp_contract.activated` | `msp_contracts` | Process revenue accounting / Manage customer contracts | needs PCF lookup | confident L3 |
| 647 | REMOTE-ACCESS -> MSP-PSA SVC-DESK | `remote_session.ended` | `remote_sessions` | Manage IT service requests / Resolve customer service requests | needs PCF lookup | medium |
| 835 | WSC -> MSP-PSA SVC-DESK | `msp_ticket.from_chat` | `chat_messages` | Manage customer service requests | needs PCF lookup | medium |

10 candidate APQC tags total. No prior `discovery_substring` rows to REPLACE; all 10 are pure INSERT. Defer-to-Discover: zero (every handoff has a plausible PCF L2/L3 parent). The PCF id column requires `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry` lookups at fix time.

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (M7 + B11 + E1/E3/F2 + F3 re-allocation) | 6 (B1-S1, B1-S2, B1-S6, B1-S7, B1-S8, B1-S9) |
| BOUNDARY (NULL FKs + pairwise consumer DMDOs report-only) | 3 (B1-S3, B1-S4, B1-S5) |
| APQC TAGGING (per-handoff PCF activity classification) | 1 item (B1-H1, 10 candidate tags inside) |
| MODULARIZATION ISSUES | 0 (routed to Bucket 2) |
| **Bucket 1 total** | 11 in-scope items (the APQC item rolls up 10 tag candidates) |

#### Boundary findings per neighbor (Pass 4 pairwise reconciliation)

**REMOTE-ACCESS (132) <-> MSP-PSA (weight 5).** Wired pairs: 3 (160 SVC-DESK -> REMOTE-ACCESS; 163 REMOTE-ACCESS -> TIME-BILLING; 647 REMOTE-ACCESS -> SVC-DESK). Section 2: 163 + 647 have NULL `source_domain_module_id` (REMOTE-ACCESS's B10b); 160 has NULL `target_domain_module_id` (REMOTE-ACCESS's B10b). Section 3: clean (the remote-session billable-time handoff 163 mirrors the inverse session-ended handoff 647 already; nothing missing). Section 4: clean. Section 5: no cross-relationship rows currently exist between MSP-PSA masters and `remote_sessions` (238); the `remote_sessions` -> `msp_tickets` link (session opened from a ticket) is a candidate relationship Section 5 could surface.

**RMM (130) <-> MSP-PSA (weight 4).** Wired pairs: 1 (159 RMM -> SVC-DESK). Section 2: 159 has NULL `source_domain_module_id` (RMM's B10b). Section 3: likely missing handoff `rmm_agent.uninstalled` from RMM -> MSP-PSA-CONTRACTS to mark a client estate as needing reconciliation; flag for Phase 0. Section 4: clean. Section 5: no relationships between MSP-PSA masters and `monitoring_alerts` (85) or `rmm_agents` (223) currently; B1-S5 boundary candidates.

**CSM (30) <-> MSP-PSA (weight 3).** Wired pairs: 2 (523 SVC-DESK -> CSM `msp_ticket.escalated`; 525 CONTRACTS -> CSM `msp_contract.renewal_due`). Section 2: both have NULL `target_domain_module_id` (CSM's B10b). Section 3: missing reverse handoff `customer_complaint.filed` CSM -> MSP-PSA SVC-DESK (a CSM customer-side complaint should open or escalate a ticket). Surface as Phase 0 candidate. Section 4: clean. Section 5: no cross-relationship rows between `msp_tickets`/`msp_contracts` and `customer_cases`/`customer_complaints` (CSM masters).

**ERP-FIN (65) <-> MSP-PSA (weight 3).** Wired pairs: 2 (524 TIME-BILLING -> ERP-FIN `msp_invoice.issued`; 526 CONTRACTS -> ERP-FIN `msp_contract.activated`). Section 2: both have NULL `target_domain_module_id` (ERP-FIN's B10b). Section 3: missing reverse handoff `customer_payment.received` ERP-FIN -> MSP-PSA TIME-BILLING to transition `msp_invoices` from `issued` -> `paid`. Section 4: clean. Section 5: no cross-rel between `msp_invoices` and `customer_payments` / `general_ledger_entries` (ERP-FIN masters).

**HAM (51) <-> MSP-PSA (weight 3).** Wired pairs: 1 (161 SVC-DESK -> HAM `ticket.created`). Section 2: 161 has NULL `target_domain_module_id` (HAM's B10b). Section 3: missing reverse handoff `hardware_asset.warranty_expired` HAM -> MSP-PSA CONTRACTS for renewal opportunity surfacing. Section 4: clean. Section 5: no cross-rel between `msp_tickets` and `hardware_assets`; the consumer DMDO is the only structural link.

**WSC (75) <-> MSP-PSA (weight 4).** Wired pairs: 1 (835 WSC chat -> SVC-DESK). Section 2: 835 source side populated (WSC module 115), MSP-PSA target populated (137); fully wired on FKs. Note: handoff 835 carries stale Rule #15 notes (see B1-S2). Section 3: clean. Section 4: clean. Section 5: relationship 303 (`chat_messages materializes_as msp_tickets`) exists; healthy.

**Lighter neighbors (lightweight one-line summary):**

- **ITSM (1) <-> MSP-PSA.** Zero handoffs, zero DMDO. Sibling market: ITSM handles the *internal* IT-Ops ticket world for the buying enterprise; MSP-PSA handles the *multi-tenant managed-services* world. Verify in Pass 2 (vendor surface) that no canonical handoffs are expected (a single MSP serving an in-house IT team is unusual). Boundary check: clean by design.
- **PSA (68) <-> MSP-PSA.** Zero handoffs, zero DMDO. Sibling market (services-org PSA vs MSP-PSA); distinct buyer / distinct competitive set per the domain description. Clean by design.
- **FSM (31) <-> MSP-PSA.** Zero handoffs, zero DMDO. Adjacent but not overlapping (FSM is geo-scheduled break/fix, MSP-PSA is multi-tenant managed services; partial overlap on technician-dispatch shape). Boundary check: clean.
- **CRM, SUB-MGMT, CPQ.** Zero handoffs, zero DMDO. Bucket 3 candidates if MSPs adopt CPQ for service-contract sizing or CRM for upsell; today the catalog does not link them. Surface in Bucket 3.

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **M7 architectural choice for sibling consumer DMDOs on `msp_clients`.** B1-S1 surfaces 3 sibling consumer DMDO rows on `msp_clients` (master in CONTRACTS 138; consumer in SVC-DESK 137, TIME-BILLING 139, DISPATCH 140). Default per M7 is DELETE (sibling modules read via the canonical FK). Alternative is PROMOTE-to-`embedded_master` for the standalone-deployable use case (e.g., SVC-DESK without CONTRACTS for an MSP that only runs ticketing). Recommendation: DELETE (every realistic MSP deployment runs CONTRACTS alongside SVC-DESK / TIME-BILLING / DISPATCH; CONTRACTS holds the client roster). | Architectural intent + deployability strategy. | (a) DELETE all 3 sibling consumer rows. (b) PROMOTE all 3 to embedded_master. (c) Mixed (specify per row). |
| B2-S2 | **B4 pattern-flag positive re-evaluation per Rule #12.** Current flags: `msp_tickets.has_personal_content=false`, `msp_contracts.has_personal_content=false`, `msp_time_entries.has_personal_content=false`, `msp_invoices.has_personal_content=false`, `msp_clients.has_personal_content=false`. All four customer-facing masters likely carry counterparty contact info (client primary contact name + email on `msp_clients`; signatory data on `msp_contracts`; remit-to address on `msp_invoices`; reporter/affected-user names on `msp_tickets`). The submit-lock flag is `true` only on `msp_contracts` + `msp_invoices`; consider whether `msp_time_entries.has_submit_lock=true` is correct once a timesheet is approved (the existing `submitted` -> `approved` -> `billed` state machine already implies it), and whether `msp_tickets.has_submit_lock=true` after `closed`. The single-approver flag is `false` on all 5; `msp_time_entries` likely has `has_single_approver=true` since one technician's lead approves their timesheets. | Pattern flags are workflow-shape judgments the user owns. | Per-flag yes/no from user. |
| B2-S3 | **Rule #15 chat_messages note (data_objects 565).** `chat_messages` carries `notes='Config-shaped conversational record. Edit/delete are direct mutations, not workflow gates; retention is a domain-wide policy, not a per-message state machine.'`. This row belongs to WSC, not MSP-PSA, but it is the payload on MSP-PSA inbound handoff 835. Per Rule #15 the note is auto-populated pattern-flag reasoning that the rescinded Rule #12 license used to permit. Surface to the WSC audit owner; MSP-PSA does not write to this row, but should report it as cross-domain pollution. | Cross-domain ownership; the WSC audit decides. | (a) Confirm user-approved at WSC load time, leave in place. (b) Confirm auto-populated; WSC audit reverts. (c) Defer to WSC b1 audit. |
| B2-S4 | **F2/F3 system-skill consolidation strategy.** B1-S8 splits the single domain-wide skill 85 into 4 module-bound system skills per Rule #17. Two strategies: (a) RETIRE skill 85 (delete) once the 4 module skills are authored, repoint its existing 6 `skill_tools` rows; (b) REPURPOSE skill 85 to `skill_type='role'` or `'process'` (e.g., a cross-module MSP-TECHNICIAN role skill) and author 4 fresh module skills with new tooling. Recommendation: (a) RETIRE skill 85; the role/process skill is a separate authoring task and should not be conflated with the F2 fix. | Editorial + future-of-skill-85 decision. | (a) RETIRE skill 85, port tools onto module skills. (b) REPURPOSE skill 85, author 4 module skills with fresh tools. |
| B2-S5 | **Phase E role authoring scope.** B1-S6 proposes 5 roles (MSP-TECHNICIAN, MSP-DISPATCHER, MSP-ACCOUNT-MANAGER, MSP-BILLING-ADMIN, MSP-CSAT-ANALYST). Confirm the role list before authoring. Alternative role frames: MSP-OPERATIONS-MANAGER as an aggregating role with `:admin` on all 4 modules; MSP-CLIENT-LEAD as a per-client lead role for the SVC-DESK + CONTRACTS slice. The buyer-shape for a typical SMB MSP would carry technician + dispatcher + ops-lead, plus a billing-admin for the back office. | Org-shape authoring intent. | (a) Approve the 5-role list. (b) Substitute / add per user input. (c) Defer role authoring to a separate Phase E pass. |
| B2-S6 | **MSP-PSA in-house IT boundary.** ITSM, PSA, FSM all return zero handoffs to / from MSP-PSA today. That is consistent with the domain's "distinct buyer, distinct competitive set" description. Confirm before any future tightening: should an MSP serving its own in-house IT team trip an MSP-PSA -> ITSM handoff (e.g., upstream of escalated incident reports)? Today's catalog says no. | Editorial scope question. | (a) Keep the boundary clean (no MSP-PSA -> ITSM handoffs). (b) Add the in-house IT escalation handoff. |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 reasoned against ConnectWise PSA, Datto Autotask PSA, Kaseya BMS, HaloPSA, SuperOps, SyncroMSP, Atera, Naverisk, Pulseway, Promys PSA, Tigerpaw One. The candidates below come from the analyst's flagship-vendor knowledge; each is a candidate market gap for Phase 0 verification, not a vetted finding.

#### MISSING (6) entity candidates surfaced by flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `block_hour_pools` | ConnectWise PSA, Halo PSA, Autotask PSA all model the block-hour pool as a first-class master (per-client, per-contract, with consumption ledger). Currently the block-hour decrement is implicit in `msp_contracts` business_logic; no explicit master records remaining balance. | CONTRACTS or TIME-BILLING (master) |
| `sla_definitions` | ConnectWise PSA, Halo PSA, Autotask PSA, SuperOps all carry per-tier SLA-template entities distinct from per-contract SLA terms. Currently SLA shape lives implicitly inside `msp_contracts`; the pause/resume mechanic on `msp_tickets.on_hold` reads from no master. | CONTRACTS (master) |
| `recurring_billing_schedules` | Autotask PSA, ConnectWise PSA, Halo PSA all model the recurring invoice schedule as a first-class entity distinct from `msp_invoices` (the rendered invoice). Currently implicit in `msp_contracts`. | TIME-BILLING (master) |
| `customer_estate_inventory` (or `msp_managed_assets`) | A central canonical of every endpoint, server, switch, and router under management per client. RMM has its own `rmm_agents`, but the PSA's view of "what we manage for this client" is broader than RMM agents (printers, network gear, lapsed agents). Currently no MSP-PSA-side master; `hardware_assets` (HAM) is the closest, but HAM is enterprise-IT-owned, not MSP-multi-tenant. | new module candidate (`MSP-PSA-ESTATE`) or extension of CONTRACTS |
| `quote_for_new_work` | Halo PSA, SuperOps, ConnectWise PSA all model project-quote records distinct from contract amendments (project-shaped work for an existing client). Adjacency to CPQ; specifically MSP-flavored CPQ (low-touch, project-sized). | new module candidate or fold into a sister MSP-CPQ domain |
| `change_requests` (MSP-scoped) | ConnectWise PSA, Halo PSA carry MSP-scoped change-management records distinct from ITIL change-management. Currently no MSP-PSA-side master; ITSM's `change_requests` is enterprise-scoped, not multi-tenant. | new module candidate or extension of SVC-DESK |

#### MODULARIZATION (1) candidate

- **CONTRACTS module is overloaded** (carries `msp_clients` master and `msp_contracts` master). A natural split is `MSP-PSA-CLIENTS` (client roster + onboarding lifecycle on `msp_clients`) vs `MSP-PSA-CONTRACTS` (contracts + SLAs + billing pool + amendments). Today the buyer has these as one module; split is a Phase 0 vendor-evidence question (do flagship vendors split them too?). The split also lowers the cognitive load on TIME-BILLING which currently has to navigate both masters.

#### Compliance / regulation candidates (no regulation rows currently exist for MSP-PSA)

- **PCI DSS (per-client)** if the MSP handles PAN data for client estates (cardholder-data scope). Adjacency, not core.
- **SOC 2 (MSP-side)** for the MSP organization itself; less an MSP-PSA-bound regulation than a MSP-organization compliance posture.
- **HIPAA BAA** when the MSP serves healthcare clients (per-client overlay).
- **State data-breach notification statutes (US)** when a tech accesses customer PHI/PII during a session (this connects to REMOTE-ACCESS as much as MSP-PSA).

#### Candidate-domain queue

This audit surfaced 0 domain-tier candidates for `audits/_missing-domains.md` today. Every MISSING candidate above is an entity / capability extension of MSP-PSA rather than a new domain. The flagship vendors all serve the MSP-PSA category as a single market.

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (which produces a Phase 0 markdown at `c:/tmp/MSP-PSA-phase0-<date>.md` confirming per-entity vendor coverage) or eyeball-mode (user names which of the 6 entity candidates + 1 modularization candidate + 4 regulation candidates to treat as confirmed).

### Cross-bucket dependencies

- B1-S1 is **gated on B2-S1** (the DELETE vs PROMOTE choice for the 3 sibling `msp_clients` consumer rows must come from the user before the M7 fix loads).
- B1-S8 / B1-S9 are **gated on B2-S4** (retire-vs-repurpose decision on skill 85 determines whether 4 new skills are authored fresh or 4 new skills are authored alongside a repurposed skill 85).
- B1-S6 / B1-S7 / B1-S8 are **sequenced**: skills (B1-S8) depend on modules existing (already done); permissions (B1-S7) feed `role_permissions`; roles (B1-S6) feed `role_modules` and `role_permissions`. Recommended order: B1-S6 -> B1-S7 -> B1-S8 -> wire `role_permissions`.
- Bucket 3's `block_hour_pools` and `sla_definitions` candidates could change the answer to B2-S2 (`msp_contracts.has_personal_content` pattern flag), but only indirectly. Calling out per the surface-time discipline.
- B2-S3 (chat_messages note pollution) is a **WSC audit responsibility**; calling out in routing.
- Buckets 2 and 3 are otherwise independent of each other; you can resolve them in any order.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S2, S3, S4, H1`), or `skip`.

- **S1 (M7 DELETE or PROMOTE 3 msp_clients sibling consumer DMDOs)** is gated on B2-S1; resolve that first.
- **S2 (PATCH handoff 835 notes='')** is trivial; one PATCH.
- **S3 / S4 (B10b report-only NULL FKs)** schedules 5 distinct other-domain audits; not MSP-PSA's fix.
- **S5 (Pairwise missing consumer DMDOs on 4 target domains)** schedules 4 other-domain audits; not MSP-PSA's fix.
- **S6 (Phase E roles, 5 new roles)** depends on B2-S5; resolve role list first.
- **S7 (Phase E permissions, 12 baseline + 16 workflow-gate)** depends on B1-S6 / B2-S5.
- **S8 (4 module-bound system skills)** depends on B2-S4; resolve retire-vs-repurpose first.
- **S9 (Reassign skill 85 tools)** depends on B1-S8 / B2-S4.
- **H1 (10 APQC tags via 1 loader)** ready to load; would close H1 hard-fail subject to UI review.

**Bucket 2, what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (M7 architectural choice):** (a) DELETE all 3 sibling consumer rows, (b) PROMOTE all 3 to embedded_master, (c) mixed (specify per row).
- **B2-S2 (pattern flag re-evaluation):** per-flag yes/no on `has_personal_content` for the 4 customer-facing masters; `has_submit_lock` on msp_time_entries; `has_single_approver` on msp_time_entries.
- **B2-S3 (chat_messages note, WSC's call):** (a) approved, (b) revert, (c) defer to WSC audit.
- **B2-S4 (skill 85 retire vs repurpose):** (a) RETIRE, port tools to new module skills, (b) REPURPOSE as cross-module role/process skill + author 4 fresh module skills.
- **B2-S5 (role list confirmation):** (a) approve the 5 roles, (b) substitute / add, (c) defer Phase E to a follow-up pass.
- **B2-S6 (in-house IT boundary):** (a) keep clean, no MSP-PSA -> ITSM handoff, (b) add the in-house-IT escalation handoff.

**Bucket 3, Phase 0 pending,** vet via formal Phase 0 vendor research or eyeball-mode? If eyeball-mode, name which of the 6 entity candidates + 1 modularization candidate + 4 regulation candidates to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain for routing.

| Owing domain | Owed work |
|---|---|
| RMM | B10b: populate `source_domain_module_id` on handoff 159. Add APQC tag candidate `monitoring_alert.threshold_breached` -> appropriate L3 process. |
| REMOTE-ACCESS | B10b: populate `source_domain_module_id` on handoffs 163, 647; populate `target_domain_module_id` on handoff 160. |
| CSM | B10b: populate `target_domain_module_id` on handoffs 523, 525. Add `consumer` DMDO on `msp_tickets` (233) and `msp_contracts` (234) on the receiving CSM module. Consider authoring reverse `customer_complaint.filed` handoff. |
| ERP-FIN | B10b: populate `target_domain_module_id` on handoffs 524, 526. Add `consumer` DMDO on `msp_invoices` (236) and `msp_contracts` (234). Consider authoring reverse `customer_payment.received` handoff. |
| HAM | B10b: populate `target_domain_module_id` on handoff 161. Consider authoring reverse `hardware_asset.warranty_expired` handoff. |
| WSC | B11 / Rule #15: review `chat_messages` (565) `data_objects.notes` for auto-populated pattern-flag prose; revert if not user-approved (per B2-S3). |

## 2026-05-31, Continuation: B1 technical fixes

Applied truly-technical Bucket 1 fixes only; everything requiring user judgment or unverifiable inputs was deferred unchanged for the original Bucket 2 / Bucket 3 prompts.

### Applied (1 of 9 Bucket 1 items)

- **B1-S2** — PATCHed `handoffs.id=835` set `notes=""` (was `target NULL until MSP-PSA is modularized`). Pre-flight confirmed `target_domain_module_id=137`, so the provenance prose was stale per Rule #15. PATCH returned the row with `notes=""` populated; all other columns unchanged.

### Deferred (8 of 9 Bucket 1 items)

| ID | Reason for deferral |
|---|---|
| B1-S1 | Gated on B2-S1 (user picks DELETE vs PROMOTE for the 3 `msp_clients` sibling consumer DMDOs). |
| B1-S3 | Report-only; B10b NULL target FKs are owed by HAM (1), CSM (2), ERP-FIN (2) audits. Not MSP-PSA's fix. |
| B1-S4 | Report-only; B10b NULL source FKs are owed by RMM (1) and REMOTE-ACCESS (2) audits. Not MSP-PSA's fix. |
| B1-S5 | Report-only; pairwise consumer DMDOs belong to CSM / ERP-FIN / HAM audits. Not MSP-PSA's fix. |
| B1-S6 | Gated on B2-S5 (5-role list confirmation). New roles authoring is not derivable from audit alone. |
| B1-S7 | Depends on B1-S6 (role list) and on B2-S5; 12 baseline + 16 workflow-gate permissions cannot be wired without the role layer. |
| B1-S8 | Gated on B2-S4 (retire vs repurpose skill 85). New module-bound system skills are net-new entities. |
| B1-S9 | Gated on B1-S8 / B2-S4. |
| B1-H1 | **All 10 APQC tag candidates deferred.** Per the technical-fixes mandate, `handoff_processes` rows can only be inserted when the audit pre-specifies a resolvable `handoff_id` + PCF id. Of the 10 candidates, 9 say `needs PCF lookup at fix time` (judgment work). The 10th (handoff 523) pre-specifies PCF id `10388`, but `GET /processes?id=eq.10388` returned an empty result, the id is unresolvable. The closest live PCF match (`Manage customer service problems, requests, and inquiries`) is id `196`, not `10388`; reclassifying is judgment work, not a technical fix. |

### Verification

- `GET /handoffs?id=eq.835` post-PATCH returned `notes=""` and all other columns unchanged (`target_domain_module_id=137`, `source_domain_module_id=115`, `trigger_event_id=920`, `data_object_id=565`, `record_status="new"`).
- `GET /processes?id=eq.10388` returned `[]` (PCF id from audit is unresolvable).
- No JWT-audience errors encountered.

### Loader

`c:/dev/domain-map/.tmp_deploy/fix_msp_psa_b1_technical_2026_05_31.ts`

### UI link

https://tests.semantius.app/domain_map/handoffs

### Outstanding

All Bucket 2 prompts (B2-S1 through B2-S6) and Bucket 3 Phase-0 vetting remain unanswered; the original `### Per-bucket prompts` section above is still the action surface for the user.

## 2026-05-31, Audit

Fresh structural Validate b1 audit. Confirms prior continuation fix (B1-S2) landed and surfaces partial progress on the H1 APQC band. All non-trivial Bucket items remain gated on the original Bucket 2 prompts.

### Summary

- **Current footprint:** 4 full modules (`MSP-PSA-SVC-DESK` 137, `MSP-PSA-CONTRACTS` 138, `MSP-PSA-TIME-BILLING` 139, `MSP-PSA-DISPATCH` 140), 0 starters, 0 cross-cutting host junctions. 5 masters (`msp_tickets`, `msp_contracts`, `msp_clients`, `msp_time_entries`, `msp_invoices`). 6 capabilities all bound to modules. 10 solutions (5 primary, 2 secondary, 1 partial). 20 DMDO rows (5 master, 15 non-master). 16 trigger_events on masters. 22 lifecycle states. 14 handoffs total (10 cross-domain + 4 intra-domain). 12 aliases. 17 data_object_relationships including 7 platform_builtin `users` 748 edges (Rule #10 compliant). 1 domain-wide system skill (id 85) with 6 skill_tools. 0 MSP-PSA roles. 0 MSP-PSA permissions. 0 MSP-PSA role_modules. 4 of 14 handoffs now carry APQC `handoff_processes` tags (160, 163, 647 -> Operate IT user support (20921); 835 -> Manage customer service problems, requests, and inquiries (10388)); 10 remain untagged.
- **Bucket 1 (agent-solvable / blocked):** 8 items, all blocked except H1 which is partial-progress.
- **Bucket 2 (user judgment):** 6 items, all carried over from prior audit unanswered.
- **Bucket 3 (Phase 0 pending):** 6 items carried over from prior audit.

### Band-by-band results

- **A (domains row):** PASS. All seven business-meaningful columns populated (crud_percentage 85, business_logic populated, min_org_size `10 xs <50`, cost_band `$$`, certification_required false, usa_market_size_usd_m 800, market_size_source_year 2024).
- **M1 (every module has >= 1 master):** PASS. SVC-DESK masters `msp_tickets`; CONTRACTS masters `msp_contracts` + `msp_clients`; TIME-BILLING masters `msp_time_entries` + `msp_invoices`; DISPATCH masters none of its own (DISPATCH contributes to `msp_tickets` 695 + `msp_time_entries` 696, consumes the rest). DISPATCH having no own master is a band issue: every full module needs at least one master per Rule #14. Re-classify as **M1 SOFT-FAIL on DISPATCH 140** (no `role=master` DMDO). Carried to Bucket 1 as new item.
- **M3 (capability realized in a module):** PASS. All 6 capabilities present in `domain_module_capabilities`.
- **M7 (sibling consumer DMDOs):** PARTIAL-FAIL unchanged from prior audit. 3 sibling `msp_clients` consumer rows on SVC-DESK / TIME-BILLING / DISPATCH; recommendation DELETE pending B2-S1.
- **B4 (pattern flags):** PARTIAL-FAIL unchanged. All 5 masters carry `has_personal_content=false`; 4 customer-facing masters likely carry counterparty PII (msp_tickets reporter, msp_clients primary contact, msp_contracts signatory, msp_invoices remit-to). Pending B2-S2 (judgment).
- **B5 (trigger events on masters):** PASS. All 5 masters carry trigger_events (msp_tickets 4, msp_contracts 4, msp_time_entries 3, msp_invoices 3, msp_clients 2).
- **B7 (lifecycle states):** PASS. 22 states across 5 masters with proper `domain_module_id` binding and `requires_permission` flags. 16 states gate-flagged for workflow-gate permission materialization (per Rule #12 / Rule #14).
- **B9 (event_category enum):** PASS. All 16 events `state_change` or `threshold`.
- **B9b (handoff integration_pattern enum):** PASS. All 14 use catalog values (`api_call`, `manual_handoff`, `event_stream`, `batch_sync`, `lifecycle_progression`).
- **B10b (handoff FK populated):** PARTIAL-FAIL unchanged. 4 outbound NULL `target_domain_module_id` (160, 161, 523, 525, 526) owed by REMOTE-ACCESS, HAM, CSM x2, ERP-FIN x2; 3 inbound NULL `source_domain_module_id` (159, 163, 647) owed by RMM, REMOTE-ACCESS x2.
- **B11 (Rule #15 notes pollution):** PASS on handoff 835 (cleared 2026-05-31 continuation). chat_messages (565) data_object `notes` STILL carries auto-populated Rule #12 reasoning prose; that note belongs to WSC, not MSP-PSA (B2-S3 routes).
- **B12 (data_object_aliases):** PASS. 12 aliases across all 5 masters, all carry `notes=""`.
- **C (intra-domain relationships):** PASS. 17 relationships including 6 inter-master FKs (msp_clients holds_contracts msp_contracts; msp_contracts covers_tickets msp_tickets; msp_clients raises_tickets msp_tickets; msp_tickets accrues_time msp_time_entries; msp_clients receives_invoices msp_invoices; msp_invoices consolidates_time msp_time_entries; msp_contracts generates_invoices msp_invoices) + 7 platform_builtin `users` 748 edges + 3 cross-domain edges to chat_messages, customer_complaints, customer_subscriptions.
- **D (solution coverage):** PASS. 10 solutions joined via `solution_domains` (5 primary including ConnectWise PSA, Autotask PSA, Halo PSA, Tigerpaw One, Syncro, Atera, SuperOps; 2 secondary; 1 partial).
- **E1 (role_modules):** HARD-FAIL unchanged. 0 role_modules rows on any of the 4 modules. Gated on B2-S5.
- **E2 (roles):** HARD-FAIL unchanged. 0 MSP-prefixed roles exist. Gated on B2-S5.
- **E3 (permissions):** HARD-FAIL unchanged. 0 permissions filed against the 4 modules. Expected scaffold: 12 baseline (3 per module x 4) + 16 workflow-gate (one per lifecycle state with `requires_permission=true`).
- **E4 (role_permissions):** N/A. Cannot wire until E1-E3 populated.
- **E5 (admin/manage/read tier coverage):** N/A. Cannot evaluate until E3 populated.
- **F1 (skills exist):** PASS. Skill 85 `msp-psa-system` exists.
- **F2 (one system skill per module):** HARD-FAIL unchanged. Skill 85 binds to `domain_id=131` and `domain_module_id=NULL`. SVC-DESK 137, CONTRACTS 138, TIME-BILLING 139, DISPATCH 140 each need their own module-bound system skill.
- **F3 (skill_tools floor):** ADVISORY unchanged. Skill 85 carries 6 skill_tools (5 query + 1 side_effect), but module-level coverage unverifiable until F2 cured.
- **F4 (operation_kind <-> data_object_id invariants):** PASS. The 5 query_* tools all carry their data_object_id; notify_person (side_effect) carries NULL as required.
- **F5 (Semantius score):** NOT COMPUTABLE per-module. Rolls up from F2 hard-fail.
- **H1 (APQC tagging):** PARTIAL-PROGRESS. 4 of 14 handoffs now carry `handoff_processes` rows (all `proposal_source=agent_curated`, `record_status=new`). 10 untagged remain (159 RMM->SVC-DESK monitoring_alert.threshold_breached; 161 SVC-DESK->HAM ticket.created hardware_assets; 523 SVC-DESK->CSM msp_ticket.escalated; 524 TIME-BILLING->ERP-FIN msp_invoice.issued; 525 CONTRACTS->CSM msp_contract.renewal_due; 526 CONTRACTS->ERP-FIN msp_contract.activated; 1244 SVC-DESK->DISPATCH msp_ticket.created; 1245 SVC-DESK->TIME-BILLING msp_time_entry.approved; 1246 CONTRACTS->TIME-BILLING msp_contract.activated; 1247 CONTRACTS->SVC-DESK msp_contract.suspended). PCF lookup table below.

### Bucket 1 (count summary)

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (M1 DISPATCH-no-master + M7 + E1/E2/E3 + F2 + F3 re-allocation) | 7 |
| BOUNDARY (NULL FKs + pairwise consumer DMDOs report-only) | 3 |
| APQC TAGGING (10 untagged handoffs across the domain) | 1 |
| MODULARIZATION ISSUES | 0 (routed to Bucket 2) |
| **Bucket 1 total** | 11 in-scope items (the APQC item rolls up 10 tag candidates) |

### Bucket 1 details

Carryover items from 2026-05-30:

- **B1-S1** (M7, 3 sibling consumer rows on msp_clients) - blocked on B2-S1.
- **B1-S3** (B10b outbound NULL target_domain_module_id on 161 HAM, 523 CSM, 524 ERP-FIN, 525 CSM, 526 ERP-FIN) - report-only; owed by HAM/CSM/ERP-FIN audits.
- **B1-S4** (B10b inbound NULL source_domain_module_id on 159 RMM, 163 REMOTE-ACCESS, 647 REMOTE-ACCESS) - report-only; owed by RMM/REMOTE-ACCESS audits. Handoff 160 also has NULL target (REMOTE-ACCESS owes).
- **B1-S5** (pairwise consumer DMDOs missing on CSM, ERP-FIN, HAM target modules) - report-only.
- **B1-S6** (E1/E2: 5 roles missing) - blocked on B2-S5.
- **B1-S7** (E3: 12 baseline + 16 workflow-gate permissions missing) - depends on B1-S6.
- **B1-S8** (F2: 4 module-bound system skills missing) - blocked on B2-S4.
- **B1-S9** (F3: skill 85 tool reassignment) - depends on B1-S8.
- **B1-H1** (APQC tagging) - 4 of 14 done. 10 untagged remain; PCF candidates below for the 10.

New items surfaced this audit:

- **B1-S10** (M1 SOFT-FAIL on DISPATCH 140) - DISPATCH 140 hosts 0 `role=master` DMDOs. It contributes to msp_tickets (695) and msp_time_entries (696) but masters nothing of its own. Two routes: (a) PROMOTE the dispatch-board / schedule entity to a `msp_dispatch_schedules` (or `msp_dispatch_assignments`) master, which is a Phase 0 vendor-evidence question (do flagship vendors model a first-class dispatch-schedule entity? ConnectWise Dispatch, Autotask LiveLinks, Halo Dispatch all do); or (b) DEMOTE DISPATCH 140 to a starter-style module (`module_kind='starter'`) with embedded shells, which removes the M1 obligation. Recommendation: (a). Surface as Bucket 2 (architectural).

APQC PCF candidates for the 10 untagged handoffs (Bucket 1 actionable):

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | Confidence |
|---|---|---|---|---|---|---|
| 159 | RMM -> SVC-DESK | monitoring_alert.threshold_breached | msp_tickets | Operate IT user support | 20921 (id 295) | confident L3 (mirrors 160/163/647) |
| 161 | SVC-DESK -> HAM | ticket.created | hardware_assets | Maintain IT asset records | 20918 (id 1312) | confident L4 |
| 523 | SVC-DESK -> CSM | msp_ticket.escalated | msp_tickets | Manage customer service problems, requests, and inquiries | 10388 (id 196) | confident L3 (mirrors 835) |
| 524 | TIME-BILLING -> ERP-FIN | msp_invoice.issued | msp_invoices | Invoice customer | 10743 (id 302) | confident L3 |
| 525 | CONTRACTS -> CSM | msp_contract.renewal_due | msp_contracts | Manage customer service problems, requests, and inquiries | 10388 (id 196) | medium L3 (renewal-outreach is closest cross-industry parent) |
| 526 | CONTRACTS -> ERP-FIN | msp_contract.activated | msp_contracts | Maintain IT customer contracts | 20637 (id 1094) | confident L4 |
| 1244 | SVC-DESK -> DISPATCH | msp_ticket.created | msp_tickets | Operate IT user support | 20921 (id 295) | confident L3 (intra-domain) |
| 1245 | SVC-DESK -> TIME-BILLING | msp_time_entry.approved | msp_time_entries | Report time | 10753 (id 312) | confident L3 |
| 1246 | CONTRACTS -> TIME-BILLING | msp_contract.activated | msp_contracts | Maintain IT customer contracts | 20637 (id 1094) | confident L4 |
| 1247 | CONTRACTS -> SVC-DESK | msp_contract.suspended | msp_contracts | Maintain IT customer contracts | 20637 (id 1094) | confident L4 |

Volume target for the 14-handoff domain: 7-11 agent_curated tags. 4 currently in place plus 10 candidates = 14 total at full coverage; recommend approving all 10.

### Bucket 2 (user judgment, carryover unchanged + 1 new)

Carryover from 2026-05-30: B2-S1 (M7 architectural), B2-S2 (pattern flags), B2-S3 (chat_messages 565 note), B2-S4 (skill 85 retire/repurpose), B2-S5 (role list), B2-S6 (in-house IT boundary). All six still unanswered; consult the 2026-05-30 section for option lists.

New: **B2-S7** (DISPATCH 140 master strategy). Question: should DISPATCH 140 promote a new master (`msp_dispatch_schedules` or `msp_dispatch_assignments`) to cure M1, or demote to `module_kind='starter'` and embed the scheduling shell? Options: (a) PROMOTE msp_dispatch_schedules master (Phase 0 verification light); (b) DEMOTE DISPATCH 140 to starter; (c) ACCEPT DISPATCH 140 as a contributor-only module and waive M1 here (rule-violating but defensible if vendors agree). Why agent cannot answer: Phase 0 verification choice and architectural intent both belong to the user.

### Bucket 3 (Phase 0 pending, carryover unchanged)

Carryover from 2026-05-30: 6 entity candidates (`block_hour_pools`, `sla_definitions`, `recurring_billing_schedules`, `customer_estate_inventory` / `msp_managed_assets`, `quote_for_new_work`, `change_requests` MSP-scoped), 1 modularization candidate (CONTRACTS split into clients vs. contracts), 4 compliance candidates (PCI DSS per-client, SOC 2 MSP-side, HIPAA BAA per-healthcare-client, US state data-breach notification statutes). Verification path unchanged: formal Phase 0 vendor research OR eyeball-mode.

If B2-S7 picks (a) PROMOTE msp_dispatch_schedules, that decision dovetails with Bucket 3's `recurring_billing_schedules` candidate (different module, similar Phase 0 verification shape: ConnectWise PSA, Halo PSA, Autotask PSA, SuperOps schedule entities).

### Cross-bucket dependencies

- B1-S1, B1-S6, B1-S7, B1-S8, B1-S9 carry the same dependencies as 2026-05-30; nothing changed.
- **B1-S10 is gated on B2-S7.**
- **B1-H1's 10 candidate tags are independent of every B2 prompt.** The audit pre-specifies the PCF id for all 10; the loader can run as soon as the user approves the table.
- Buckets 2 and 3 still independent of each other.

### Report-only follow-ups (owed by other domains, unchanged)

| Owing domain | Owed work |
|---|---|
| RMM | B10b: populate `source_domain_module_id` on handoff 159. |
| REMOTE-ACCESS | B10b: populate `source_domain_module_id` on 163, 647; populate `target_domain_module_id` on 160. |
| CSM | B10b: populate `target_domain_module_id` on 523, 525. Add `consumer` DMDOs on `msp_tickets` (233) and `msp_contracts` (234) on the receiving CSM module. |
| ERP-FIN | B10b: populate `target_domain_module_id` on 524, 526. Add `consumer` DMDOs on `msp_invoices` (236) and `msp_contracts` (234). |
| HAM | B10b: populate `target_domain_module_id` on 161. |
| WSC | Rule #15: revert `chat_messages` (565) `data_objects.notes` if not user-approved (per B2-S3). |

### Verification

- `GET /handoffs?id=eq.835` post-2026-05-31-continuation confirms `notes=""`.
- `GET /handoff_processes?handoff_id=in.(...)` returns 4 rows for handoffs 160, 163, 647, 835.
- `GET /processes?id=eq.196` returns `Manage customer service problems, requests, and inquiries` external_id `10388`; the 2026-05-31 continuation's note that PCF id 10388 was unresolvable was an error (the value 10388 is the `external_id`, internal id is 196; handoff 835 correctly carries `process_id=196`).
- No JWT-audience errors encountered during this audit.

### UI link

https://tests.semantius.app/domain_map/handoffs

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

State-driven Validate execute pass (no fresh from-scratch audit). Worked the open
agent-executable items in state.yaml and verified each against live before writing.
Three execute item-types ran clean and idempotent; the destructive M9 remediation and the
deferred persona layer were surfaced; everything blocked on other domains or the retired
per-module-skill model was left. Domain id 131; modules SVC-DESK 137, CONTRACTS 138,
TIME-BILLING 139, DISPATCH 140; masters msp_tickets 233, msp_contracts 234,
msp_time_entries 235, msp_invoices 236, msp_clients 237. Owning function confirmed already
wired: business_function_domains carries owner=IT Operations (27), contributor=Finance (4),
contributor=Business Operations (34); no C1 work needed. Aliases already populated (12 rows
across the 5 masters); no B11 work needed. next_action_by flips to user.

Notable live-vs-snapshot drift: the prior B1A-H1-TAGS snapshot proposed 10 handoff tags,
but 5 of those handoffs (159, 523, 524, 525, 526) were already tagged live, so only 5 were
actually missing. Two H1 PCF ids drifted from the snapshot (525 is live process_id 6, 526 is
live process_id 55, not the 196/1094 the snapshot proposed), but those rows already existed so
they were left untouched, not re-attributed (re-attribution is destructive). The B1A-SELF-CONTAIN
M9 snapshot listed 2 violations; live shows only 1 remains (service_incidents on SVC-DESK is
already necessity=optional).

### Executed (record_status='new', idempotent, verified)

- **B1A-ENTITY-TYPE (5 PATCHes):** classified all 5 masters off `entity_type='unclassified'`
  per Rule #12. msp_tickets, msp_contracts, msp_time_entries, msp_invoices -> `operational_workflow`
  (each carries a multi-state, permission-gated lifecycle). msp_clients -> `operational_record`
  (customer/account roster other entities reference; light status lifecycle).
- **Catalog UX, Rule #20 (5 PATCHes):** authored buyer-voice catalog_tagline + catalog_description
  on the domain row (131, both were empty) and on all 4 modules (137/138/139/140, all empty).
  Workflow+value framing, no vendor/product names, no em-dashes, American English. No non-empty
  value was overwritten.
- **B1A-H1-TAGS, H1 (5 INSERTs into handoff_processes):** tagged the 5 remaining untagged handoffs:
  161 (MSP-PSA->HAM, hardware_assets) -> 1312 Maintain IT asset records; 1244 (intra, msp_ticket.created)
  -> 295 Operate IT user support; 1245 (intra, msp_time_entry.approved) -> 312 Report time;
  1246 (intra, msp_contract.activated) -> 1094 Maintain IT customer contracts; 1247 (intra,
  msp_contract.suspended) -> 1094 Maintain IT customer contracts. All `proposal_source=agent_curated`,
  `role=implements`, record_status defaulted to 'new'. All 4 PCF ids pre-verified live this run.
  H1 hard-fail is now fully closed: all 14 MSP-PSA handoffs carry an APQC tag.

### Surfaced (not written; require user decision or destructive sign-off)

- **B1A-SELF-CONTAIN (M9, DESTRUCTIVE):** DMDO id 686 on SVC-DESK 137 is role=consumer,
  necessity=required on hardware_assets (56, HAM-mastered). Recommended fix: convert to
  embedded_master (local shell for standalone deployment) OR set necessity=optional. Rewriting an
  existing DMDO row is destructive, so surfaced not executed. The second snapshot shape
  (service_incidents 47) is already optional and no longer trips M9.
- **B1A-PHASE-P (personas/RACI):** DEFERRED per Rule #21. Candidate personas: MSP-TECHNICIAN,
  MSP-DISPATCHER, MSP-ACCOUNT-MANAGER, MSP-BILLING-ADMIN, MSP-CSAT-ANALYST. Overlaps the role-list
  decision in B2-S5; confirm that list before any authoring.
- **b2 decisions (6 open):** B2-S1 (M7 delete vs promote 3 msp_clients sibling consumers),
  B2-S2 (B4 pattern flags on the 5 masters), B2-S3 (chat_messages 565 notes, WSC's call),
  B2-S5 (Phase E role list), B2-S6 (MSP-PSA->ITSM in-house IT boundary), B2-S7 (DISPATCH 140 M1
  cure). B2-S4 (skill 85 retire vs repurpose) is now RETIRED/moot under the per-domain-skill model.

### Left (untouched)

- **b1b blocked on other domains' audits:** B1B-S3 (HAM/CSM/ERP-FIN B10b target FK), B1B-S4
  (RMM/REMOTE-ACCESS B10b source/target FK), B1B-S5 (CSM/ERP-FIN consumer DMDOs on MSP-PSA masters).
- **b1b blocked on user decision:** B1B-S1 (M7, ref B2-S1), B1B-S6 (roles, ref B2-S5),
  B1B-S7 (permissions, depends B1B-S6/B2-S5), B1B-S10 (DISPATCH M1, ref B2-S7).
- **b1b RETIRED (superseded 2026-06-06):** B1B-S8 (per-module system skills), B1B-S9 (skill_tools
  reassignment). Reframed as notes; no per-module skills authored.
- **b3 backlog (11 candidates):** unchanged speculative Phase-0 items.

### Loader

`c:/dev/domain-map/.tmp_deploy/fix_msp_psa_state_2026_06_07.ts` (idempotent; second run wrote 0).

### UI links

- https://tests.semantius.app/domain_map/data_objects
- https://tests.semantius.app/domain_map/domains
- https://tests.semantius.app/domain_map/domain_modules
- https://tests.semantius.app/domain_map/handoff_processes
