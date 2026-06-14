# UTIL-OPS audit history

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- Current footprint: 8 master `data_objects` (`utility_customer_accounts` id 660, `utility_meters` 661, `meter_reads` 662, `service_connections` 663, `utility_assets` 664, `outage_events` 665, `utility_service_orders` 666, `utility_bills` 667); 0 `capabilities`; 3 `solutions` (all `primary`: Oracle Utilities Opower, Itron Enterprise Edition, SAP S/4HANA Utilities); 1 `business_function_domains` row (`Business Operations` owner only); 0 `domain_modules` rows (M1 hard fail); 0 `domain_module_data_objects` rows (legacy `domain_data_objects` rollup only); 7 `domain_regulations` (NERC CIP, GDPR, ISO 27001, NIS2, CSRD, EU CRA, EU VAT Directive); 10 `trigger_events` across the 8 masters; 7 outbound + 0 inbound cross-domain `handoffs`; 1 intra-domain `data_object_relationships` row (`outage_events opens customer_cases`, id 470, cross-domain target = CSM master); 0 `users` edges; 0 `data_object_aliases`; 0 `data_object_lifecycle_states`; 1 legacy `domain_id`-scoped system skill (`util-ops-system`, id 115) with 9 `skill_tools` (8 platform `query_*` + 1 platform `send_email`); 0 `handoff_processes` rows on any of the 7 cross-domain handoffs.
- Vendor-surface basis: Oracle Utilities (Customer Care and Billing, Network Management System, Work and Asset Management, Opower analytics), SAP S/4HANA Utilities (IS-U lineage: device management, meter reading, billing, EDM), Itron Enterprise Edition (AMI head-end, MDM, distribution analytics), Schneider Electric ArcFM / EcoStruxure ADMS (network model, DMS / OMS), Landis+Gyr Gridstream Connect (AMI specialist with grid-edge analytics), Hansen CC&B and Gentrack Velocity (mid-market CIS specialists). Compliance specialists: NERC CIP audit tooling vendors (Network Perception, FoxGuard).
- **Bucket 1 (in-scope, agent fixable):** 19 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 7 items.
- Candidates queued via `append_missing_domain.ts`: CIS-UTIL (new), UTIL-AMI-MDMS (new), UTIL-OMS (new), UTIL-WAM (new), UTIL-DERMS (new), UTIL-GIS (new).

Structural pass: A passes A1 / A3 but fails A2 (zero capabilities, hard fail) and A4 (`catalog_tagline` + `catalog_description` both empty); M is a **hard fail** (zero `domain_modules`); B has wide gaps (1 lone relationship row, zero aliases, zero lifecycle states, zero pattern-flag re-eval, NULL on both module FKs across every outbound handoff except #943 which has partial target attribution, zero `users` edges); C fails C1 sufficiency (only 1 RACI row, expected 2 to 4 covering Field Operations contributor and Customer Service consumer); E vacuously skipped (no modules to wire roles against); F1 + F2 + F3 + F7 fail (legacy domain-scoped system skill, no module-scoped skills, `send_email` channel-primitive linked without workflow justification); H1 fails (0 of 7 cross-domain handoffs tagged). The domain Semantius score is uncomputable per-module (F5 rollup) because no module exists; the legacy skill reports 9 of 9 = 1.00 strict (every linked tool is `platform`).

The whole audit downstream of the M / A2 gates depends on resolving the modularization gap plus authoring the capability set first. Bucket 1 enumerates the fix items assuming a 4-module split per B2-1; if the user adopts a different split, every B / F band fix needs the module assignment revisited. The 7 candidates queued in `_missing-domains.md` (CIS-UTIL, UTIL-AMI-MDMS, UTIL-OMS, UTIL-WAM, UTIL-DERMS, UTIL-GIS) are the adjacent utility-specific markets a flagship-vendor sweep surfaces; review of those candidates may pull scope OUT of UTIL-OPS into separate domains, so the user should triage the candidates before authoring the UTIL-OPS module split.

### Vendor surface basis

- **Oracle Utilities** (oracle.com/industries/utilities) - the broadest utility-specific suite: Customer Care and Billing (CC&B), Network Management System (NMS, the reference OMS / DMS / SCADA front office), Work and Asset Management (WAM), Opower analytics. Each of these is its own distinct point-solution market; UTIL-OPS as a single domain straddles all four, hence the modularization tension.
- **SAP S/4HANA Utilities** (sap.com/industries/utilities) - the IS-U lineage: device management, meter reading and order, billing, energy data management (EDM), customer service. Strong on rate engines and large-IOU billing determinants.
- **Itron Enterprise Edition** (itron.com) - AMI head-end specialist (OpenWay Riva), MDM, distribution analytics; pairs with CC&B + OMS systems rather than replacing them.
- **Schneider Electric ArcFM / EcoStruxure ADMS** (se.com) - network model authoring (ArcFM on Esri Utility Network), advanced distribution management combining OMS + DMS + SCADA; the reference modular split where outage, distribution control, and asset network are distinct modules.
- **Landis+Gyr Gridstream Connect** (landisgyr.com) - AMI with grid-edge analytics, increasingly DER-aware.
- **Hansen CC&B** (hansencx.com) and **Gentrack Velocity** (gentrack.com) - mid-market CIS specialists; useful counter-anchors when measuring whether CIS belongs inside UTIL-OPS or as a separate domain (CIS-UTIL is queued).

Compliance basis: NERC CIP versions 2 through 14 (cybersecurity for the bulk power system), FERC market rules (RTO settlement, ISO-NE / PJM / MISO / CAISO / SPP / ERCOT tariffs), state PUC tariffs and reporting, IEEE 1547 (DER interconnection), Smart Grid Interoperability NIST framework, Clean Power Plan / CPP successor rules, EPA emissions reporting, ICS/SCADA security (NIST SP 800-82). GDPR + NIS2 + CSRD + EU CRA apply on the EU side (already in `domain_regulations`); SOX applies to publicly-traded IOUs (not currently in `domain_regulations`).

### Pass 3 - Neighbor discovery

Edges discovered from `handoffs` + the lone `data_object_relationships` row (id 470):

| Neighbor | Handoffs out | Handoffs in | DMDO / DDO deps | Weight | Boundary depth |
|---|---|---|---|---|---|
| FSM (31) | 3 (`utility_service_order.dispatched`, `utility_asset.failed`, `meter_read.anomalous`) | 0 | 0 | 3 | full (>=3) |
| FIN (65) | 2 (`utility_bill.issued`, `meter_read.captured`) | 0 | 0 | 2 | summary only |
| CSM (30) | 1 (`outage_event.declared`) + 1 cross-domain relationship row (`outage_events opens customer_cases`) | 0 | 0 | 2 | summary only |
| ITSM (1) | 1 (`utility_asset.failed` -> `service_incidents` on ITSM-INCIDENT-MGMT, id 38, the one handoff with a non-NULL `target_domain_module_id`) | 0 | 0 | 1 | summary only |

FSM (weight 3) gets the full pairwise pass below. FIN, CSM, ITSM get one-line summaries. No inbound handoffs into UTIL-OPS exist anywhere in the catalog, which is itself a finding (the domain plausibly should receive `customer_account.opened` from a CIS or CRM domain, `service_request.created` from CSM, `field_work.completed` from FSM crews); these are gaps owed elsewhere.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 / M2 / M6 (hard) | Zero `domain_modules` rows for UTIL-OPS. The domain has 8 mastered data_objects spanning 4 distinct workflow clusters (CIS / billing, AMI / metering, asset and work mgmt, outage mgmt) but ships no deployable units. Every downstream B / E / F band is blocked. The legacy `domain_data_objects` rollup carries the 8 master rows with no modular attribution. | Default proposal (assuming the user accepts UTIL-OPS as the umbrella and does NOT promote the candidates in `_missing-domains.md` to separate domains): author 4 full modules. (1) `UTIL-METER-TO-CASH` covering `utility_customer_accounts`, `utility_meters`, `meter_reads`, `service_connections`, `utility_bills`. (2) `UTIL-OUTAGE-MGMT` covering `outage_events`. (3) `UTIL-WORK-ASSET-MGMT` covering `utility_assets`, `utility_service_orders`. (4) `UTIL-AMI-OPS` (optional, only if AMI head-end ingestion warrants a separate deployable around `meter_reads` event flow). Alternative: if the user promotes CIS-UTIL / UTIL-OMS / UTIL-WAM / UTIL-AMI-MDMS to first-class domains, UTIL-OPS becomes a leadership-tier landing domain with one derived-signals module; every master migrates to the new domain that owns it. |
| B1-S2 | A2 (hard) | Zero `capabilities` linked. Per Phase A the floor is >=3 (typical 5 to 8). | Author the capability set with `capability_code` snake-case nouns. Proposed: METER-TO-CASH, METER-DATA-MGMT, OUTAGE-MGMT, NETWORK-ASSET-MGMT, FIELD-WORK-EXECUTION, REGULATORY-REPORTING, GRID-RELIABILITY-MONITORING. Apply the Cross-cutting capability convention if any capability is shared with ITSM / FSM / FIN. Link via `capability_domains`. The capability set then drives `domain_module_capabilities` linkage during B1-S1. |
| B1-S3 | A4 | `domains.catalog_tagline` and `domains.catalog_description` both empty. | Draft buyer-voice copy per Rule #20 (workflow + value, NOT analyst voice). Surface to user for review BEFORE writing. Recommended tagline shape: "Run meter-to-cash, outage response, and field work for electric, gas, and water utilities from one operational backbone." |
| B1-S4 | B4 (pattern flags) | All 8 masters have `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false` at schema default; no positive re-evaluation. `utility_customer_accounts` carries name, service address, contact info, sometimes SSN-last-4 for credit / collections (clearly personal). `meter_reads` is identified-by-meter-by-service-address (personal-by-association for residential customers, per GDPR jurisprudence and the EU smart-meter recital). `utility_bills` carries identifying info plus consumption. `service_connections` ties physical premises to customers. | PATCH `has_personal_content=true` on rows 660 (`utility_customer_accounts`), 662 (`meter_reads`), 663 (`service_connections`), 667 (`utility_bills`) after user confirmation. The other four (`utility_meters`, `utility_assets`, `outage_events`, `utility_service_orders`) are device / equipment / event-shaped; personal-by-association argument is weaker. Surface as Bucket 2 #1. |
| B1-S5 | B6 (intra-domain rels) | Only 1 `data_object_relationships` row touches UTIL-OPS masters (id 470, `outage_events opens customer_cases`, cross-domain into CSM). Zero intra-domain edges across the 8 masters. The domain has a clear chain: `utility_customer_accounts -> service_connections -> utility_meters -> meter_reads -> utility_bills`; `utility_assets -> outage_events`; `outage_events -> utility_service_orders`; `utility_meters -> utility_service_orders` (install / replace / remove). | Author the 8-edge baseline below (B1-R1 .. R8) via a focused loader after B1-S1 lands. |
| B1-S6 | B7 (users edges) | Zero edges from any UTIL-OPS master to the `users` platform built-in (id 748). At minimum `utility_service_orders` (dispatcher who created, field-crew leader assigned), `outage_events` (operator who declared, crew chief restoring), `meter_reads` (collector for manual reads), `utility_bills` (billing analyst who released), `utility_customer_accounts` (CSR who opened the account) need user-typed actor edges per Rule #10. | Author 5 `data_object_relationships` rows per Rule #10. See B1-U1 .. U5 below. |
| B1-S7 | B8 (outbound cross-domain rels) | Only 1 outbound cross-domain `data_object_relationships` row exists (id 470 into CSM). The 7 outbound `handoffs` (to FSM, FIN, CSM, ITSM) each imply a payload->target relationship on the receiving domain's master where one exists. | Author the 4 outbound cross-domain edges in B1-X1 .. X4 below. Inbound edges (CIS / CRM publishing customer events, FSM publishing field-completion events into UTIL-OPS) are report-only per the B8 asymmetry rule and are owed by those source domains. |
| B1-S8 | B9 / B9b | Trigger events on the 8 masters: 10 rows (covering open / installed / captured / anomalous / activated / failed / declared / restored / dispatched / issued). All 10 events have at least one `handoffs` row OR are intra-domain transitions (B9 ticks: `utility_customer_account.opened`, `utility_meter.installed`, `service_connection.activated` are intra-domain only). B9b is non-skippable on multi-module domains, so once B1-S1 lands, at minimum `utility_customer_account.opened` -> meter install (METER-TO-CASH -> METER-TO-CASH intra-module so vacuous), `utility_meter.installed` -> first read flow, `outage_event.declared` -> service-order creation in WORK-ASSET, `outage_event.restored` -> work-order closure need intra-domain handoffs with `integration_pattern: lifecycle_progression`. | After B1-S1, author intra-domain handoffs per the module-pair derivation. Estimated 4 to 6 rows. Also add missing trigger events for terminal / approval states discovered during B1-S10 (`utility_bill.posted`, `utility_bill.paid`, `utility_service_order.completed`, `outage_event.cause_classified`). |
| B1-S9 | B10b (hard, audit-blocker) | All 7 outbound handoffs touching UTIL-OPS carry NULL on `source_domain_module_id`. 6 of 7 also carry NULL on `target_domain_module_id`; only handoff 943 (`utility_asset.failed` -> ITSM `service_incidents`) has `target_domain_module_id=38` (ITSM-INCIDENT-MGMT). Source side cannot resolve until B1-S1 lands. Target side: FSM has 3 modules (161 FSM-DISPATCH-OPS, 162 FSM-INSTALLED-BASE, 163 FSM-SERVICE-CONTRACTS); CSM has 3 modules (112 CSM-CASE-MGMT, 113 CSM-ENTITLEMENTS, 114 CSM-KNOWLEDGE); FIN has zero modules (so target-NULL stays until FIN modularizes). | After modules land, run the standard B10b derivation. Recommended target-side resolution: handoff 940 + 941 + 945 -> FSM-DISPATCH-OPS (161); handoff 942 -> CSM-CASE-MGMT (112) once that module receives the outage-declared payload; handoff 939 + 944 to FIN stay NULL until FIN modularizes (report-only on FIN side). |
| B1-S10 | B11 | Zero `data_object_aliases` rows. Vendor lexicon usage: `utility_customer_accounts` -> "Service Agreement / Premises Account / Customer Account / Service Point Customer", `utility_meters` -> "Smart Meter / Endpoint / AMI Endpoint / Device", `meter_reads` -> "Interval Read / Register Read / VEE Reading / Consumption Record", `service_connections` -> "Service Point / Premises / Service Location / Point of Delivery / POD", `utility_assets` -> "Network Asset / Plant / Equipment / Device / Compatible Unit", `outage_events` -> "Incident / Trouble Ticket / Outage Case / Power Out", `utility_service_orders` -> "Field Order / Work Request / Field Activity / FA / Service Investigation", `utility_bills` -> "Statement / Invoice / Charge / Bill Determinant Result". | Author 16 to 24 alias rows; bundle with the cluster-drafts loader. |
| B1-S11 | B12 (hard) | Zero `data_object_lifecycle_states` rows. Workflow-bearing masters: `utility_customer_accounts` (`prospective -> active -> moved_out -> closed`), `service_connections` (`pending_connect -> active -> disconnected -> retired`), `utility_meters` (`in_stock -> installed -> active -> removed -> retired`), `meter_reads` (`raw -> validated -> estimated -> billed` per VEE), `utility_bills` (`draft -> posted -> issued -> paid -> overdue -> cancelled`), `outage_events` (`reported -> declared -> dispatched -> restored -> cause_classified -> closed`), `utility_service_orders` (`created -> scheduled -> dispatched -> in_progress -> completed -> cancelled`), `utility_assets` (`acquired -> in_service -> derated -> failed -> retired`). All 8 are workflow-bearing; none qualify for the config-shape exemption. | Draft state machines for all 8 masters; load via a focused loader after B1-S1 (so `data_object_lifecycle_states.domain_module_id` can attribute each state to the realizing module per M5). The billing posted / paid states + outage declared / restored states + service-order completed / cancelled states need `requires_permission=true` with `permission_verb_override` where the auto-derivation produces an awkward verb (e.g. `restored -> restore_outage`, `posted -> post_bill`). |
| B1-S12 | C1 (sufficiency) | Only 1 `business_function_domains` row (Business Operations owner). For an operational utility domain the canonical RACI is: Business Operations / Utility Operations owner, Field Service Operations contributor (crew dispatch + field execution), Customer Service contributor (account opening + outage callbacks), Engineering / Asset Mgmt contributor (network model + asset health), Compliance / Risk consumer (NERC CIP + state PUC reporting), Finance consumer (revenue from billing). | Author 4 to 5 more `business_function_domains` rows: Field Service Operations contributor, Customer Service contributor, Engineering contributor, Finance consumer, Compliance consumer (subject to function-spine existence; verify before authoring). |
| B1-S13 | F1 / F2 / F3 (legacy + missing modular skills) | Legacy domain-level system skill `util-ops-system` (id 115, `domain_id=49`, `domain_module_id=NULL`) exists with 9 `skill_tools` (8 `query_*` + 1 `send_email`, all `coverage_tier=platform`). Per F1, this must be retired once module-scoped skills exist. Per F2, each new module needs exactly one `<module_code_lower>_agent` system skill. Per F3, each needs >=1 `skill_tools` row. | After B1-S1, author 4 module-scoped system skills (`util_meter_to_cash_agent`, `util_outage_mgmt_agent`, `util_work_asset_mgmt_agent`, optionally `util_ami_ops_agent`). Redistribute the 8 existing `query_*` tools by mastered entity: `utility_customer_accounts` + `utility_meters` + `meter_reads` + `service_connections` + `utility_bills` -> METER-TO-CASH; `outage_events` -> OUTAGE-MGMT; `utility_assets` + `utility_service_orders` -> WORK-ASSET-MGMT. Author new tools per module (create / update for masters, workflow gates like `post_bill`, `restore_outage`, `dispatch_service_order`, `complete_service_order`, `validate_meter_read`, `issue_bill`). DELETE legacy skill 115 last. |
| B1-S14 | F (skill naming) | Legacy `util-ops-system` uses kebab + `-system` suffix; the catalog convention per Phase-S is snake + `_agent`. Folds into B1-S13. | Combined with S13. |
| B1-S15 | F7 (channel primitives) | Skill 115 links `send_email` (a channel primitive, tool id 37, `coverage_tier=platform`) with no `skill_tools.notes` workflow justification. Per the Channel-vs-Capability rule the workflow default is `notify_person` / `notify_team` so the deployment can substitute the channel without a per-skill rewrite. Utility communications are largely generic notifications (bill-ready alerts, planned-outage notices, restoration ETAs, service-order appointment reminders) and are NOT channel-bound. Pure exceptions: regulatory mass-notification (CPNI / IVR / SMS Mass Notification for emergencies) which IS channel-specific and may want `send_sms` / `make_phone_call` rows with workflow justification. | PATCH the `skill_tools` row pointing at `send_email` to point at `notify_person` instead, OR DELETE the row if the new module-scoped skills already link `notify_person`. Idempotency-safe per F7 fix recipe. Add `send_sms` + `make_phone_call` to outage-mgmt skill ONLY when authoring the emergency-mass-notification workflow with explicit `skill_tools.notes` (requires user-approved wording per Rule #15). |
| B1-S16 | H1 (hard) | Zero `handoff_processes` rows on any of the 7 cross-domain UTIL-OPS handoffs. Per H1 volume expectation, expect 0.5N to 0.8N agent_curated rows: with N=7, that is 4 to 6 NEW tags this audit. See APQC TAGGING section below. | Author the 5 agent-curated rows below; defer 2 with reasons. |
| B1-S17 | Cross-domain rel mirror | The lone cross-domain relationship row (id 470, `outage_events opens customer_cases`) exists but has no matching `handoffs` row payload-side. Handoff 942 (`outage_event.declared` -> CSM) carries `data_object_id=665` (outage_events), not `customer_cases`. The relationship implies the inbound side: when an outage opens, CSM creates customer cases. | Either repoint handoff 942's payload to `customer_cases` (id 103) so payload + relationship align, OR add a second handoff row `outage_event.declared` -> CSM with payload `customer_cases`. Recommended: keep handoff 942 with payload=`outage_events` (CSM consumes the outage record), and add a new derived intra-CSM handoff in CSM's audit (where CSM authors the customer-case-creation event). Surface to user as Bucket 2 #2. |
| B1-S18 | Trigger event categorization | All 10 trigger_events on UTIL-OPS masters have `event_category=""` (empty string). The allowed enum is `lifecycle` / `state_change` / `threshold` / `signal`. | PATCH each event with the right category: `utility_customer_account.opened` / `utility_meter.installed` / `service_connection.activated` -> `lifecycle`; `meter_read.captured` -> `signal`; `meter_read.anomalous` -> `threshold`; `utility_asset.failed` / `outage_event.declared` / `outage_event.restored` -> `state_change`; `utility_service_order.dispatched` -> `state_change`; `utility_bill.issued` -> `lifecycle`. |
| B1-S19 | S3 sweep | Per-master indirect-table sweep: every master has 0 lifecycle states, 0 aliases, and 1 to 2 trigger events. All 8 masters route to B12 (B1-S11) for lifecycle states and B11 (B1-S10) for aliases. No additional findings beyond what S10 + S11 already capture. | Folds into S10 + S11. |

#### Baseline intra-domain `data_object_relationships` (rule-of-thumb edges to draft once modules exist)

| ID | edge | cardinality | notes |
|---|---|---|---|
| B1-R1 | `utility_customer_accounts` `holds` `service_connections` | one_to_many | account anchors the service points |
| B1-R2 | `service_connections` `metered_by` `utility_meters` | one_to_many | meter assigned to premises (history of meter changes lives in `service_connections`) |
| B1-R3 | `utility_meters` `produces` `meter_reads` | one_to_many | every meter emits reads on its schedule |
| B1-R4 | `service_connections` `billed_via` `utility_bills` | one_to_many | bills computed per service connection per billing cycle |
| B1-R5 | `meter_reads` `feeds` `utility_bills` | many_to_many | bill rolls up reads in the billing window |
| B1-R6 | `utility_assets` `triggers` `outage_events` | one_to_many | asset failure causes outage |
| B1-R7 | `outage_events` `spawns` `utility_service_orders` | one_to_many | restoration work order created against outage |
| B1-R8 | `utility_meters` `serviced_by` `utility_service_orders` | one_to_many | install / replace / remove field work targets meters |

#### Baseline `users` edges (Rule #10)

| ID | edge | cardinality | notes |
|---|---|---|---|
| B1-U1 | `users` `created` `utility_customer_accounts` | one_to_many | CSR or agent who opened the account |
| B1-U2 | `users` `dispatched` `utility_service_orders` | one_to_many | dispatcher who created and routed the SO |
| B1-U3 | `users` `declared` `outage_events` | one_to_many | operator who declared the outage in the OMS console |
| B1-U4 | `users` `issued` `utility_bills` | one_to_many | billing analyst who approved bill release |
| B1-U5 | `users` `collected` `meter_reads` | one_to_many | meter reader for manual reads (AMI reads are system-collected and may need a different edge or be NULL) |

#### Baseline outbound cross-domain `data_object_relationships` (B8)

| ID | source | edge | target | target_domain |
|---|---|---|---|---|
| B1-X1 | `utility_bills` (UTIL-OPS) | `posts_as` | revenue (or AR receivable; needs FIN entity confirmation) | FIN |
| B1-X2 | `utility_service_orders` (UTIL-OPS) | `triggers` | field-work-orders or technician-jobs (needs FSM master confirmation) | FSM |
| B1-X3 | `utility_assets` (UTIL-OPS) | `escalates_to` | service_incidents (id 103-shaped: ITSM has `service_incidents`) | ITSM |
| B1-X4 | `outage_events` (UTIL-OPS) | `opens` | `customer_cases` (id 103, ALREADY LOADED as row 470) | CSM |

#### BOUNDARY findings per neighbor

| ID | Neighbor | Finding | Fix |
|---|---|---|---|
| B1-B1 | FSM (id 31, weight 3) | 3 outbound handoffs (940 `utility_service_order.dispatched`, 941 `utility_asset.failed`, 945 `meter_read.anomalous`); all carry NULL on both `source_domain_module_id` and `target_domain_module_id`. FSM has 3 modules but no `domain_module_data_objects` rows on any UTIL-OPS master. The B10b derivation cannot resolve target-side until FSM declares consumer DMDOs against `utility_service_orders`, `utility_assets`, and `meter_reads`. | Once B1-S1 lands, source-side patch on all 3 rows. Target-side: report-only on FSM side, FSM should add `consumer` DMDOs to FSM-DISPATCH-OPS (161) for these three masters during FSM's next audit. |
| B1-B2 | FIN (id 65, weight 2) | 2 outbound (939 `utility_bill.issued`, 944 `meter_read.captured`); both NULL on both module FKs. FIN has zero modules. | Source-side patch on both rows once B1-S1 lands; target-side stays NULL until FIN modularizes. Surface as report-only on FIN side. The `meter_read.captured` -> FIN handoff (944) reads suspicious (it is `batch_sync` not `event_stream`); the user may want to verify whether the catalog should publish raw reads to FIN at all (Bucket 2 #3) or only the rolled-up `utility_bills`. |
| B1-B3 | CSM (id 30, weight 2) | 1 outbound (942 `outage_event.declared`) with NULL on both module FKs. CSM has 3 modules. The cross-domain relationship row 470 already exists for this pair but uses payload `customer_cases` rather than `outage_events`. Both module FKs can resolve cleanly once UTIL-OPS modularizes (source = UTIL-OUTAGE-MGMT; target = CSM-CASE-MGMT id 112). | Once B1-S1 lands, derivation produces a clean patch on both columns. Also reconcile the payload mismatch (B1-S17). |
| B1-B4 | ITSM (id 1, weight 1) | 1 outbound (943 `utility_asset.failed` -> ITSM `service_incidents`) with `source_domain_module_id=NULL`, `target_domain_module_id=38` (ITSM-INCIDENT-MGMT). Target side already partially attributed (the only handoff in the audit with a non-NULL FK). | Once B1-S1 lands, source-side patch (UTIL-WORK-ASSET-MGMT). The audit-blocker shape is the asymmetric semantics: handoff 941 ALSO uses trigger event `utility_asset.failed` but routes to FSM with payload `utility_assets`. Same source event, two targets, two payloads. Is the catalog modeling this as a fan-out (asset failure simultaneously creates an ITSM incident AND a FSM service order)? Surface as Bucket 2 #4. |

#### APQC TAGGING

7 cross-domain handoffs touch UTIL-OPS (all outbound; zero inbound). 0 currently tagged in `handoff_processes`.

Proposed `agent_curated` tags (record_status defaults to `new`, proposal_source `agent_curated`):

| ID | handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
|---|---|---|---|---|---|---|---|
| B1-A1 | 939 | UTIL-OPS -> FIN | `utility_bill.issued` | `utility_bills` | Generate customer billing data | 1351 | confident L4 |
| B1-A2 | 940 | UTIL-OPS -> FSM | `utility_service_order.dispatched` | `utility_service_orders` | Schedule field service | 1898 | confident L5 |
| B1-A3 | 941 | UTIL-OPS -> FSM | `utility_asset.failed` | `utility_assets` | Manage asset maintenance | 352 | confident L3 |
| B1-A4 | 942 | UTIL-OPS -> CSM | `outage_event.declared` | `outage_events` | Manage customer service problems, requests, and inquiries | 196 | confident L3 |
| B1-A5 | 943 | UTIL-OPS -> ITSM | `utility_asset.failed` | `service_incidents` | Triage IT service delivery incidents | 1299 | confident L4 (but: asset failure here is OT not IT, see Bucket 2 #4) |

Deferred to Discover Pass 3 (no clean APQC PCF cross-industry match):

| ID | handoff_id | source -> target | trigger_event | payload | Defer reason |
|---|---|---|---|---|---|
| B1-A6 | 944 | UTIL-OPS -> FIN | `meter_read.captured` | `meter_reads` | Raw AMI meter ingestion to GL/AR feed is utility-industry-specific (revenue recognition by consumption, unmetered estimation). No cross-industry PCF activity covers it; routes to a custom utility-process node in Discover Pass 3. Suspect this handoff itself may be mis-modeled (Bucket 2 #3). |
| B1-A7 | 945 | UTIL-OPS -> FSM | `meter_read.anomalous` | `meter_reads` | VEE-flagged anomalous-read triage routing to a field meter investigation is utility-AMI-specific; the closest cross-industry process (`Manage asset maintenance` id 352) over-generalizes. Defer to custom process. |

H-band numbers: 0 of 7 handoffs `record_status='approved'` (catalog quality headline = 0%). 5 of 7 proposed `agent_curated` in this audit; 2 of 7 deferred. Process-health number after this audit's proposals = 5 `agent_curated` (71% of N). Within the 0.5N-0.8N target (3.5 to 5.6); the 2 deferrals also within the expected ~20%.

### Bucket 2 - Surface-for-user (judgment calls)

1. **Pattern flags - which of the 8 masters carry personal data?** The B1-S4 proposal is to flip `has_personal_content=true` on 4 of 8 (`utility_customer_accounts`, `meter_reads`, `service_connections`, `utility_bills`). Arguments for flipping the other 4: `utility_meters` is identifiable by serial + premises (personal-by-association under EU smart-meter case law). `utility_assets` carries crew names in maintenance history. `outage_events` carries affected-customer lists when an outage scope is computed. `utility_service_orders` carries customer-side identifiers. The conservative answer is `true` on all 8; the literalist answer is `true` on 4. **Independent of Bucket 3.**
2. **Outage relationship payload mismatch (B1-S17).** Handoff 942 carries payload `outage_events` but relationship row 470 has the verb mapping `outage_events opens customer_cases`. Options: (a) keep handoff payload = `outage_events` (CSM consumes outage record), CSM authors its own intra-domain handoff that creates the customer_case from the outage; (b) repoint handoff 942's payload to `customer_cases`; (c) author a second handoff with payload `customer_cases` so both shapes coexist. Recommended: (a). **Independent of Bucket 3.**
3. **Does UTIL-OPS publish raw meter reads to FIN, or only billed amounts?** Handoff 944 (`meter_read.captured` -> FIN, `batch_sync`, friction `low`) implies AMI data goes directly to the finance system. In flagship vendor architectures, raw reads flow into the meter data management (MDM) layer + the billing engine (within CIS or CC&B); FIN receives only the posted bill (handoff 939). Handoff 944 may be a modeling error from a pre-modular load. Options: (a) DELETE handoff 944; (b) repoint target to a future UTIL-AMI-MDMS domain when promoted from the queue; (c) keep with notes (requires user-approved wording per Rule #15). **Depends on Bucket 3 #1** (whether UTIL-AMI-MDMS gets promoted).
4. **Asset-failure fan-out: ITSM service_incident OR FSM service_order?** Trigger event `utility_asset.failed` fires two handoffs: 941 (-> FSM with payload `utility_assets`) and 943 (-> ITSM with payload `service_incidents`). For utility OT assets (substations, feeders, transformers, gas regulators), the canonical path is OMS / DMS / SCADA -> dispatch crew via WAM. ITSM incidents are for IT assets (billing system down, SCADA HMI crashed). Mixing the two on the same trigger reads like cross-wiring. Options: (a) keep both, declare it a real fan-out (asset failure that has IT-side and OT-side responses); (b) remove handoff 943, route asset failure only to FSM (OT path); (c) split into two distinct trigger events `utility_asset.failed_ot` and `it_asset.failed`. Recommended: (c) split. **Independent of Bucket 3.**
5. **Is UTIL-OPS the right umbrella, or should the queued candidates absorb the masters?** The 8 masters split cleanly across 4 candidate domains: `utility_customer_accounts` + `utility_bills` -> CIS-UTIL; `utility_meters` + `meter_reads` -> UTIL-AMI-MDMS; `outage_events` -> UTIL-OMS; `utility_assets` + `utility_service_orders` -> UTIL-WAM. `service_connections` is a shared register (CIS-UTIL and UTIL-OMS both consume it; CIS-UTIL masters it). UTIL-OPS as an umbrella may not pass the point-solution-market test (Rule #2): can the user name 3 independent vendors whose flagship is sold AS "utility operations" rather than as CIS, AMI, OMS, WAM individually? Itineris UMAX and Open Smartflex are closest. Options: (a) keep UTIL-OPS as umbrella, modularize into the 4 modules in B1-S1; (b) demote UTIL-OPS to leadership-tier landing domain and promote the 4 candidates from the queue, migrating each master to its new home; (c) hybrid (keep UTIL-OPS but pull only CIS-UTIL out as a separate domain). **This decision drives all of Bucket 3.**

### Bucket 3 - Phase 0 pending (speculative)

Candidates the market-audit pass surfaced from flagship-vendor knowledge but which need Phase 0 vendor-surface confirmation before any catalog action. All 7 are queued in `audits/_missing-domains.md` via the helper:

1. **CIS-UTIL (Customer Information System for Utilities).** Mention 1. Vendor evidence: Oracle CC&B, SAP IS-U, Itineris UMAX, Gentrack Velocity, Hansen CC&B. The CIS market is large and distinct (Gartner publishes a separate Magic Quadrant for utility CIS). If promoted, `utility_customer_accounts`, `utility_bills`, and possibly `service_connections` move out of UTIL-OPS.
2. **UTIL-AMI-MDMS (Advanced Metering Infrastructure + Meter Data Management).** Mention 1. Vendor evidence: Itron OpenWay, Landis+Gyr Gridstream, Sensus FlexNet, Aclara, Siemens EnergyIP MDM. AMI head-end and MDM are routinely separate from CIS in IOU deployments. If promoted, `utility_meters` and `meter_reads` move out of UTIL-OPS.
3. **UTIL-OMS (Outage Management System).** Mention 1. Vendor evidence: Oracle NMS, GE Digital PowerOn Restore, Schneider Electric ADMS, Survalent SCADA OMS, OATI webSmartEnergy. OMS is a distinct procurement (often coupled with DMS in ADMS suites). If promoted, `outage_events` moves out.
4. **UTIL-WAM (Utility Work and Asset Management).** Mention 1. Vendor evidence: Oracle WAM, IBM Maximo for Utilities, Cityworks, ABB Ellipse, Hexagon EAM Utilities. Strong overlap with horizontal EAM domain if one exists (none currently in catalog). If promoted, `utility_assets` and `utility_service_orders` move out.
5. **UTIL-DERMS (Distributed Energy Resource Management).** Mention 1. Vendor evidence: Generac Concerto, AutoGrid Flex, Smarter Grid Solutions ANM, Itron IntelliFLEX, Bidgely UtilityAI. New market driven by grid-edge solar + storage + EV adoption. Not currently in UTIL-OPS scope; promotion creates a green-field domain.
6. **UTIL-GIS (Utility Geographic Information System).** Mention 1. Vendor evidence: Esri ArcGIS Utility Network, Schneider ArcFM, Hexagon G/Technology, Bentley OpenUtilities, GE Digital Smallworld. The network connectivity model that OMS and DMS consume. Possibly a sub-domain of a future GIS leadership tier.
7. **Existing UTIL-OPS scope after promotions: leadership-tier landing domain?** If Bucket 2 #5 lands on option (b), UTIL-OPS becomes a leadership-tier domain (no masters, derived-signals module only) for cross-domain utility KPIs (System Average Interruption Duration Index SAIDI, System Average Interruption Frequency Index SAIFI, Customer Average Interruption Duration Index CAIDI, Bad Debt %, Unaccounted-for Energy %, Meter Read Success Rate). Distinct from option (a) where UTIL-OPS stays operational. Verification: which IOU procurement category does "utility operations" describe today? Phase 0 research with Gartner Utility CIS / CRMS / OMS / DERMS / WAM market guides.

### Cross-bucket dependencies

- **Bucket 2 #3** (raw-meter-reads-to-FIN handoff) **depends on Bucket 3 #2** (UTIL-AMI-MDMS promotion). If UTIL-AMI-MDMS lands as a separate domain, handoff 944 plausibly repoints there rather than getting deleted; if it does not land, deleting the handoff is cleaner.
- **Bucket 2 #5** (umbrella vs. promotion) **drives all of Bucket 3**. If the user picks option (b) on Bucket 2 #5, every Bucket 1 fix that names a module (B1-S1, B1-S5, B1-S7, B1-S8, B1-S9, B1-S10, B1-S11, B1-S12, B1-S13) needs the module assignment revisited under the post-promotion catalog layout.
- **Bucket 2 #1, #2, #4** are independent of Bucket 3.
- **APQC TAGGING (B1-A1 to A7)** is independent of every other bucket; tag rows can land before the modularization decisions.

### Per-bucket prompts

- **After Bucket 1:** *"Bucket 1 has 19 items. Fix-loop sequencing depends on B1-S1 (modularization) landing first since 12 of the 19 items reference modules. Reply 'modularize first', 'apply non-module-dependent fixes (S3, S4, S15, S16, S17, S18, S19)', or 'skip pending Bucket 2 #5 decision'."*
- **After Bucket 2:** *"What is your call on each of items 1 through 5? For #1 (pattern flags), give me the list of master ids to flip. For #2 (relationship payload), pick (a), (b), or (c). For #3 (raw reads to FIN), pick (a), (b), or (c) - note dependency on Bucket 3 #2. For #4 (asset-failure fan-out), pick (a), (b), or (c). For #5 (umbrella vs. promotion) - this is the structural decision; pick (a), (b), or (c). I will wait for your decisions per item before acting; do NOT assume defaults."*
- **After Bucket 3:** *"Vet via Phase 0 research, or eyeball-mode? If Phase 0, candidates to research first (highest impact): CIS-UTIL, UTIL-OMS, UTIL-WAM. If eyeball-mode, name which of the 6 candidates ring true and which do not."*

### Report-only follow-ups (owed by other domains)

These items the audit identified but other domains own; they route to those domains' audits, not into UTIL-OPS's fix queue.

| ID | Owing domain | Owed action | Detail |
|---|---|---|---|
| R1 | FSM | B-band (DMDO + B10b target-side) | FSM should declare `consumer` DMDOs on `utility_service_orders`, `utility_assets`, `meter_reads` against module FSM-DISPATCH-OPS (161). After that, handoffs 940 / 941 / 945 can patch `target_domain_module_id` cleanly. Currently target-NULL. |
| R2 | FIN | M-band (modularize) | FIN has zero `domain_modules` rows. Until FIN modularizes, handoffs 939 + 944 keep NULL on `target_domain_module_id`. The whole FIN audit needs to run. |
| R3 | CSM | B-band (target-side payload reconciliation) | Handoff 942 lands at CSM with payload `outage_events`. CSM's audit should decide whether CSM-CASE-MGMT consumes outage records directly (and triggers `customer_case.created` from outage) or whether the catalog should add a UTIL-OPS-side intra-domain transformation step first. Relates to Bucket 2 #2. |
| R4 | ITSM | B-band (declare `service_incidents` consumer scope) | Handoff 943 (`utility_asset.failed` -> ITSM service_incidents) carries `target_domain_module_id=38` (ITSM-INCIDENT-MGMT). ITSM-INCIDENT-MGMT has no declared scope around utility-OT assets vs. IT assets; ITSM's audit should declare whether OT asset failure is in scope or should route elsewhere. See Bucket 2 #4. |
| R5 | CRM (TBD: which CRM domain) | B9 inbound to UTIL-OPS | UTIL-OPS receives zero inbound `handoffs` despite a `consumer + contributor` relationship plausibly existing on customer onboarding (`customer.qualified -> utility_customer_account.created`). If a customer-master domain (CRM or CIS-UTIL after promotion) lives upstream, that domain owes B9 outbound to UTIL-OPS. |
| R6 | (multiple) | Missing-domain queue triage | The 6 candidates added to `audits/_missing-domains.md` (CIS-UTIL, UTIL-AMI-MDMS, UTIL-OMS, UTIL-WAM, UTIL-DERMS, UTIL-GIS) need point-solution-market-test review per the queue rules. Resolution drives Bucket 2 #5 and Bucket 3. |

## 2026-05-31, Continuation: B1 technical fixes

Loader: `.tmp_deploy/fix_util_ops_b1_technical_2026_05_31.ts` (run from project root).

Applied two truly-technical B1 items that needed no user judgment and are not gated on the deferred modularization decision (Bucket 2 #5 / B1-S1).

### Items applied

| Audit ID | Band | Action | Rows touched |
|---|---|---|---|
| B1-S18 | Trigger event categorization | PATCH `trigger_events.event_category` from `''` to the audit-specified enum value | 10 rows: ids 1077 (`utility_customer_account.opened` -> `lifecycle`), 1078 (`utility_meter.installed` -> `lifecycle`), 1079 (`meter_read.captured` -> `signal`), 1080 (`meter_read.anomalous` -> `threshold`), 1081 (`service_connection.activated` -> `lifecycle`), 1082 (`utility_asset.failed` -> `state_change`), 1083 (`outage_event.declared` -> `state_change`), 1084 (`outage_event.restored` -> `state_change`), 1085 (`utility_service_order.dispatched` -> `state_change`), 1086 (`utility_bill.issued` -> `lifecycle`) |
| B1-S16 (partial) | H1 APQC tagging | INSERT `handoff_processes` rows tying cross-domain handoffs to existing APQC PCF activities; `proposal_source='agent_curated'`, `record_status` defaulted to `'new'` per Rule #1 | 4 rows: B1-A1 (handoff 939 -> process 1351 `Generate customer billing data`, new id 769), B1-A2 (handoff 940 -> process 1898 `Schedule field service`, new id 770), B1-A4 (handoff 942 -> process 196 `Manage customer service problems, requests, and inquiries`, new id 783), B1-A5 (handoff 943 -> process 1299 `Triage IT service delivery incidents`, new id 784). |

### Live-state notes discovered during apply

- B1-A3 (handoff 941 -> proposed process 352 `Manage asset maintenance`) was **skipped**, NOT applied. A `handoff_processes` row already exists for handoff 941 (id 370, process 828 `Report maintenance issues`, `proposal_source=agent_curated`, `record_status=new`). The original audit narrative described this handoff's tag slot as empty; it is not. Per Rule #1 idempotency on natural keys we did not duplicate-tag. The user can decide whether to: (a) keep the existing tag at 828, (b) repoint id 370 to process 352, or (c) add 352 alongside 828 (both rows would coexist; natural key is `(handoff_id, process_id)`). Surface as a follow-up decision.
- Pre-existing handoff target-FK state: the original audit said only handoff 943 carried a non-NULL `target_domain_module_id`; live state shows handoffs **940** and **941** also carry `target_domain_module_id=161` (FSM-DISPATCH-OPS). Only 939 + 942 are NULL on target side today. Does not change any B1 fix in this loop (all source-side B10b PATCHes remain deferred until UTIL-OPS modularizes per B1-S1), but worth noting for the next audit pass.

### Items deferred this loop (17 of 19 B1)

All require either the modularization decision (B1-S1) or per-row user judgment beyond the technical-fix license:

- **Gated on B1-S1 (modules do not yet exist):** B1-S1 itself (new modules), B1-S5 (intra-domain `data_object_relationships` baseline rows; audit pre-specified B1-R1..R8 are not module-gated but were grouped under "after B1-S1 lands" by the audit text and the user has not yet okayed the rel author), B1-S6 + B1-U1..U5 (users edges; audit pre-specifies tuples, but Rule #10 author is grouped with the post-modularization load by the audit's sequencing prompt), B1-S7 + B1-X1..X4 (outbound cross-domain rels; audit lists targets as "needs FSM master confirmation" / "needs FIN entity confirmation" so not pre-resolved), B1-S8 (intra-domain handoffs derivable only from module pairs), B1-S9 (B10b source-side FK PATCHes), B1-S11 (lifecycle states; need `domain_module_id` attribution), B1-S13 / B1-S14 (module-scoped skills), B1-S15 (F7 channel-primitive PATCH; depends on new module skills existing), B1-S19 (folds into S10 + S11).
- **New entities / DMDOs / capabilities (out of license):** B1-S2 (capabilities), B1-S10 (data_object_aliases; audit lists vendor terms but defers exact tuples to a cluster-drafts loader).
- **User judgment required (Rule #20 / Rule #15 / surface-to-user):** B1-S3 (catalog_tagline + catalog_description; Rule #20 buyer-voice copy needs user review), B1-S4 (pattern flag flips; audit explicitly says "after user confirmation", Bucket 2 #1), B1-S12 (new `business_function_domains` contributors / consumers; out of license per the technical-fix prompt and "subject to function-spine existence; verify before authoring"), B1-S17 (outage relationship payload mismatch; Bucket 2 #2 surface).
- **APQC tags deferred by audit:** B1-A6 (handoff 944 raw meter reads to FIN; "no clean APQC PCF cross-industry match"), B1-A7 (handoff 945 anomalous-read triage to FSM; "closest cross-industry process over-generalizes").

### Counts

- B1 total: 19.
- Applied this loop: 2 items (B1-S18 fully, B1-S16 partially: 4 of 5 proposed APQC tags inserted, 1 skipped due to live-state collision, 2 audit-deferred).
- Rows written this loop: 14 (10 PATCH on `trigger_events`, 4 INSERT on `handoff_processes`).
- Deferred this loop: 17 items (gated on modularization, new-entity scope, or user-judgment surfaces).
- JWT errors encountered: 0.

## 2026-05-31, Audit

### Summary

- Current footprint (live): 8 master `data_objects` (660 `utility_customer_accounts`, 661 `utility_meters`, 662 `meter_reads`, 663 `service_connections`, 664 `utility_assets`, 665 `outage_events`, 666 `utility_service_orders`, 667 `utility_bills`); 0 `capabilities`; 3 `solutions` (all `primary`: 168 Oracle Utilities Opower, 169 Itron Enterprise Edition, 170 SAP S/4HANA Utilities); 1 `business_function_domains` row (Business Operations owner only); 0 `domain_modules` rows (M1 hard fail unchanged); 0 `domain_module_data_objects` rows; 7 `domain_regulations` (NERC CIP, GDPR, ISO 27001, NIS2, CSRD, EU CRA, EU VAT Directive); 10 `trigger_events` across the 8 masters, every row categorized correctly per the 2026-05-31 continuation patch; 7 outbound + 0 inbound cross-domain `handoffs`; 1 intra-domain `data_object_relationships` row (470, `outage_events opens customer_cases`, cross-domain into CSM); 0 `users` edges; 0 `data_object_aliases`; 0 `data_object_lifecycle_states`; 1 legacy `domain_id`-scoped system skill (115 `util-ops-system`, `domain_module_id=null`) with 9 `skill_tools` (8 platform `query_*` + 1 platform `send_email`); 5 of 7 cross-domain handoffs tagged in `handoff_processes` (handoffs 939, 940, 941, 942, 943), 2 untagged (944, 945).
- Bucket 1 (agent-fixable now, in scope, ungated): 1 item (H1 deferral entries for 944 + 945).
- Bucket 1 blocked (b1b): 14 items, every one of them gated on B1-S1 modularization or a Bucket-2 user decision.
- Bucket 2 (user judgment): 6 items, every one of them carried forward from the 2026-05-30 audit plus a fresh re-confirmation question on B1-S15 / `send_email`.
- Bucket 3 (Phase 0 pending, speculative): 7 items, every one a missing-domain candidate already queued in `_missing-domains.md`.
- JWT errors this audit: 0.

### Structural pass results

- **S1** (FK sweep against `domains`): `business_function_domains` 1 (under-floor, routes to C1), `capability_domains` 0 (hard fail, A2), `domain_data_objects` 8 (passes B1), `domain_modules` 0 (hard fail, M1), `solution_domains` 3 (passes A3), `handoffs.source_domain_id` 7 (passes B9), `domain_regulations` 7 (passes), `handoffs.target_domain_id` 0 (B10 report-only, see follow-ups).
- **S2** (per-module DMDO + capabilities): vacuous, no modules.
- **S3** (per-master indirect coverage): every master has 0 lifecycle states + 0 aliases + 1 or 2 trigger events. Routes to B12 (all 8) and B11 (all 8).
- **A**: A1 passes (all 7 business-metadata fields populated per the 2026-05-30 backfill); A2 fails (0 capabilities); A3 passes (3 solutions, 1 primary); A4 fails (`catalog_tagline` + `catalog_description` both empty).
- **M**: M1 fails hard (0 modules); M2 / M4 / M5 / M6 / M7 / M8 vacuous on no-module state.
- **B**: B5 vacuous (0 embedded_master rows); B7 fails (0 `users` edges across all 8 masters; Rule #10 floor not met); B9 passes structurally (10 events present, each has either a cross-domain handoff or maps to an intra-domain state on a single-module shape that B9b would catch); B9b vacuous (multi-module floor not met since modules = 0); B10b: source side fails (every one of the 7 outbound handoffs carries NULL on `source_domain_module_id`, gated on M1), target side passes for handoffs 940 + 941 + 945 (`target_domain_module_id` set to 161) and 943 (38), report-only for 939 + 944 (FIN has 0 modules) and 942 (CSM has 3 modules but no DMDO consumer of `outage_events`); B11 fails (0 aliases on all 8 masters); B12 fails (0 lifecycle states on all 8 workflow-bearing masters, no config-shape exemptions).
- **C**: C1 fails sufficiency (only Business Operations owner; expected 2 to 4 RACI rows covering Field Service Operations contributor, Customer Service contributor, Engineering or Asset Management contributor, Finance or Compliance consumer).
- **D**: UI spot-check deferred; not blocking.
- **E1 to E5**: vacuous, no modules to wire roles against. E-band reactivates once M1 lands.
- **F1 to F5**: F1 fails (legacy `domain_id`-scoped system skill 115 still present, no module-scoped skills exist yet); F2 vacuous (no modules); F3 / F4 / F5 vacuous on the modular surface (legacy skill 115 has 9 skill_tools, every one platform-covered, but it is the wrong scope per Rule #14 and Rule #17). F7 fails (skill 115 links `send_email`, a channel primitive, with no workflow justification; the catalog default is `notify_person`).
- **H1**: 5 of 7 cross-domain handoffs carry an `agent_curated` `handoff_processes` row at `record_status='new'` (handoffs 939, 940, 941, 942, 943); 2 of 7 remain untagged (944 `meter_read.captured` to FIN, 945 `meter_read.anomalous` to FSM). Both untagged handoffs were deferred by the 2026-05-30 audit as "no clean cross-industry PCF match" and are pending Discover Pass 3 routing to custom processes. The H-band coverage headline is 0 of 7 `record_status='approved'` (no reviewer signoff yet); the process-health number is 5 of 7 `agent_curated`. The only Bucket 1 fix this audit can apply is recording the deferral entry for 944 + 945 in the audit narrative; no new tag rows are warranted without vetted vendor research on the receiving side.

### Bucket 1, agent fixable now (b1a)

| ID | Band | Finding | Action |
|---|---|---|---|
| B1A-H1DEF | H1 | Handoffs 944 (`meter_read.captured` to FIN, payload `meter_reads`) and 945 (`meter_read.anomalous` to FSM, payload `meter_reads`) carry zero `handoff_processes` rows. The 2026-05-30 audit deferred both with the reason "no clean APQC cross-industry PCF match"; live state still has zero rows for them. Per the audit recipe an explicit deferral entry is the H1 exit path when no clean PCF match exists. | Record the deferral in this audit's history.md entry (this row) and route 944 + 945 to Discover Pass 3's custom-process authoring path. No `handoff_processes` row is authored. The deferral itself satisfies H1's coverage gate. |

### Bucket 1, blocked (b1b)

Every item carried over from the 2026-05-30 audit that the agent could fix in principle, but which is gated on B1-S1 (modules) or a Bucket-2 user decision. All 14 use stable IDs from the 2026-05-30 narrative.

| ID | Band | Blocker |
|---|---|---|
| B1B-S1 | M1 / M2 / M6 | Authoring 4 modules requires user decision on Bucket 2 #5 (umbrella vs. promotion). Gates 12 of the remaining items. |
| B1B-S2 | A2 | Capabilities (7 proposed: METER-TO-CASH, METER-DATA-MGMT, OUTAGE-MGMT, NETWORK-ASSET-MGMT, FIELD-WORK-EXECUTION, REGULATORY-REPORTING, GRID-RELIABILITY-MONITORING). Per the audit recipe these load alongside modules; gated on B1B-S1. |
| B1B-S3 | A4 | `catalog_tagline` + `catalog_description` draft. Rule #20 buyer-voice copy needs user review of exact wording before write; surface to user. |
| B1B-S4 | B4 | Pattern flag flips on 660 / 662 / 663 / 667 (or all 8 per the conservative reading). Bucket 2 #1. |
| B1B-S5 | B6 | 8 intra-domain `data_object_relationships` baseline rows (B1-R1 to R8). Audit sequencing groups these under post-modularization. |
| B1B-S6 | B7 | 5 `users` edges (B1-U1 to U5). Audit sequencing groups under post-modularization. |
| B1B-S7 | B8 | 4 outbound cross-domain `data_object_relationships` (B1-X1 to X4). Two of the four (FIN target, FSM target) need target-side entity confirmation before write. |
| B1B-S8 | B9 / B9b | Intra-domain handoffs derivable only from module pairs; gated on B1B-S1. |
| B1B-S9 | B10b | Source-side `source_domain_module_id` PATCHes on all 7 outbound handoffs; needs modules. |
| B1B-S10 | B11 | 16 to 24 alias rows (vendor lexicon already enumerated in 2026-05-30 audit). Audit groups with cluster-drafts loader. |
| B1B-S11 | B12 | Lifecycle states on all 8 masters; needs `domain_module_id` attribution per M5, so gated on B1B-S1. |
| B1B-S12 | C1 | 4 to 5 new `business_function_domains` rows; out of license per the technical-fix discipline ("subject to function-spine existence; verify before authoring"). User can authorize. |
| B1B-S13 | F1 / F2 / F3 | Module-scoped system skills + redistributed tools, then DELETE legacy skill 115. Gated on B1B-S1. |
| B1B-S15 | F7 | PATCH `send_email` to `notify_person` (or DELETE the row). Gated on B1B-S13 since the new module-scoped skills inherit the link decision. |

### Bucket 2, user judgment required (b2)

All carried forward from 2026-05-30, unchanged. Numbering preserved.

1. **Pattern flags on the 8 masters.** Audit proposal flips 660 + 662 + 663 + 667 to `has_personal_content=true`. Conservative reading flips all 8 (utility_meters identified by serial-by-premises is personal-by-association under EU smart-meter case law). Options: (a) audit-proposed 4 of 8, (b) all 8, (c) different subset. Independent of Bucket 3.
2. **Outage relationship payload mismatch.** Handoff 942 carries payload `outage_events`, but relationship row 470 maps `outage_events opens customer_cases`. Options: (a) keep handoff 942 payload as `outage_events`, CSM authors its own intra-domain customer_case creation; (b) repoint handoff 942 payload to `customer_cases`; (c) author a second handoff so both shapes coexist. Independent of Bucket 3.
3. **Does UTIL-OPS publish raw meter reads to FIN, or only billed amounts?** Handoff 944 implies raw AMI data to finance. Flagship architectures route raw reads to the meter data management layer then the billing engine, with only the posted bill reaching FIN (handoff 939). Options: (a) DELETE handoff 944, (b) repoint to a future UTIL-AMI-MDMS domain once promoted, (c) keep with notes (requires user-approved wording per Rule #15). Depends on Bucket 3 #2.
4. **Asset-failure fan-out: ITSM service_incident OR FSM service_order?** Trigger event `utility_asset.failed` fires both handoff 941 (FSM, payload `utility_assets`) and handoff 943 (ITSM, payload `service_incidents`). For utility OT assets the canonical path is OMS/DMS to dispatch crew via WAM; ITSM incidents are for IT assets. Options: (a) keep both, declare it real fan-out; (b) remove 943, route only to FSM; (c) split the trigger into `utility_asset.failed_ot` and `it_asset.failed`. Independent of Bucket 3.
5. **Is UTIL-OPS the right umbrella, or should the queued candidates absorb the masters?** Drives all of Bucket 3 and gates Bucket 1 (blocked) item B1B-S1. Options: (a) keep UTIL-OPS umbrella + 4 modules per the audit proposal, (b) demote UTIL-OPS to leadership-tier landing domain and promote CIS-UTIL + UTIL-AMI-MDMS + UTIL-OMS + UTIL-WAM, (c) hybrid (keep UTIL-OPS but pull only CIS-UTIL).
6. **Channel primitive on UTIL-OPS notifications: substitute `notify_person`, or keep `send_email` with workflow justification?** F7 flagged the existing skill 115 `send_email` link as missing a workflow justification. Utility customer notifications (bill-ready alerts, planned-outage notices, restoration ETAs, service-order appointment reminders) are generic; the catalog default is `notify_person`. Exception: regulatory mass-notification (emergency CPNI / IVR / SMS mass dispatch) IS channel-specific and would justify `send_sms` + `make_phone_call`. Options: (a) PATCH the channel primitive to `notify_person` on the new module-scoped skills once they exist (folds into B1B-S13 / S15), (b) keep `send_email` and author the workflow justification per F7 (requires user-approved `skill_tools.notes` wording per Rule #15), (c) author both `notify_person` for generic + `send_sms`/`make_phone_call` on a future outage-mgmt skill specifically for emergency mass notification. Independent of Bucket 3.

### Bucket 3, Phase 0 pending speculative (b3)

All carried forward from 2026-05-30. Every candidate is already queued in `audits/_missing-domains.md`.

1. **CIS-UTIL** (Customer Information System for Utilities). Flagship evidence: Oracle CC&B, SAP IS-U, Itineris UMAX, Gentrack Velocity, Hansen CC&B. Promotion moves `utility_customer_accounts` + `utility_bills` and possibly `service_connections`.
2. **UTIL-AMI-MDMS** (Advanced Metering Infrastructure + Meter Data Management). Flagship evidence: Itron OpenWay, Landis+Gyr Gridstream, Sensus FlexNet, Aclara, Siemens EnergyIP MDM. Promotion moves `utility_meters` + `meter_reads`.
3. **UTIL-OMS** (Outage Management System). Flagship evidence: Oracle NMS, GE Digital PowerOn Restore, Schneider ADMS, Survalent SCADA OMS, OATI webSmartEnergy. Promotion moves `outage_events`.
4. **UTIL-WAM** (Utility Work and Asset Management). Flagship evidence: Oracle WAM, IBM Maximo for Utilities, Cityworks, ABB Ellipse, Hexagon EAM Utilities. Promotion moves `utility_assets` + `utility_service_orders`.
5. **UTIL-DERMS** (Distributed Energy Resource Management). Flagship evidence: Generac Concerto, AutoGrid Flex, Smarter Grid Solutions ANM, Itron IntelliFLEX, Bidgely UtilityAI. Green-field domain.
6. **UTIL-GIS** (Utility Geographic Information System). Flagship evidence: Esri ArcGIS Utility Network, Schneider ArcFM, Hexagon G/Technology, Bentley OpenUtilities, GE Digital Smallworld.
7. **Existing UTIL-OPS scope after promotions: leadership-tier landing domain?** If Bucket 2 #5 lands on (b), UTIL-OPS becomes a leadership-tier landing domain holding cross-domain utility KPIs (SAIDI, SAIFI, CAIDI, Bad Debt percentage, Unaccounted-for Energy percentage, Meter Read Success Rate). Verification path: which IOU procurement category does "utility operations" actually describe today? Phase 0 against Gartner Utility CIS / OMS / DERMS / WAM market guides.

### Cross-bucket dependencies

- Bucket 2 #3 depends on Bucket 3 #2 (UTIL-AMI-MDMS promotion decides whether handoff 944 repoints or gets deleted).
- Bucket 2 #5 drives all of Bucket 3 and gates B1B-S1 plus every b1b item referencing modules.
- Bucket 2 #1, #2, #4, #6 are independent of Bucket 3.
- B1A-H1DEF (the only b1a item) is independent of every other bucket.

### Report-only follow-ups (owed by other domains, unchanged from 2026-05-30)

| ID | Owing domain | Owed action |
|---|---|---|
| R1 | FSM | Declare `consumer` DMDOs on `utility_service_orders`, `utility_assets`, `meter_reads` against FSM-DISPATCH-OPS (161). Live state already attributes `target_domain_module_id=161` on handoffs 940 + 941 + 945; the consumer DMDOs would close the catalog-side loop. |
| R2 | FIN | Modularize. Until FIN has modules, handoffs 939 + 944 keep NULL on `target_domain_module_id`. |
| R3 | CSM | Decide whether CSM-CASE-MGMT consumes `outage_events` directly or whether the catalog needs an intra-UTIL-OPS transformation step. Relates to Bucket 2 #2. |
| R4 | ITSM | Declare whether OT asset failure is in scope for ITSM-INCIDENT-MGMT or should route elsewhere. Relates to Bucket 2 #4. |
| R5 | CRM or future CIS-UTIL | UTIL-OPS receives zero inbound `handoffs` despite plausibly being a downstream consumer of customer-onboarding events. |
| R6 | (multiple) | Triage of the 6 missing-domain candidates in `_missing-domains.md`. Resolution drives Bucket 2 #5 and Bucket 3. |

### Counts

- Bucket 1 sub-totals: MISSING 0, WRONG-OWNERSHIP 0, SCOPE-CREEP 0, STRUCTURAL 0 (every structural finding routes to b1b because of M1 blocker), BOUNDARY 0 (every boundary fix routes to b1b for the same reason), APQC TAGGING 1 (B1A-H1DEF deferral entry), MODULARIZATION ISSUES 0.
- Bucket 1 blocked: 14.
- Bucket 2: 6.
- Bucket 3: 7.
- JWT errors: 0.

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

---

## 2026-06-07 - Audit (state-driven execute, bulk batch)

### Summary

State-driven Validate pass (SKILL.md Rule #21) against the open items in state.yaml. UTIL-OPS
is an UNBUILT domain (0 domain_modules, 0 capability_domains), so per the unbuilt rule the agent
does NOT scaffold: the build (B1B-S1) is surfaced and stays gated on the structural Bucket-2
decision B2-5, and the whole module-grain cascade is LEFT. The pass executed every additive /
corrective item that is NOT module-gated. Loader: `.tmp_deploy/util_ops_state_execute_2026_06_07.ts`
(idempotent; re-run wrote 0 rows). JWT errors: 0.

Live-state correction: the snapshot's B1A-H1DEF item is now MOOT. All 7 outbound cross-domain
handoffs (939-945) already carry agent_curated `handoff_processes` rows at record_status='new'
(944 -> process 302, 945 -> process 828). The prior snapshot recorded zero rows for 944 + 945;
that was stale. No H1 work owed; no deferral entry needed.

### Executed (all record_status='new'; no approved stamping)

| Item | Band | Action | Rows |
|---|---|---|---|
| B13 / Rule #12 | entity_type | PATCH all 8 masters `unclassified` -> `operational_workflow` (deterministic from descriptions + the B1B-S11 state machines: every master is workflow-bearing). | 8 PATCH on data_objects (660-667) |
| A4 / Rule #20 | Catalog UX | Wrote buyer-voice `catalog_tagline` + `catalog_description` on domain 49 (both were empty). The stale "surface-before-write" gate (old B1B-S3 / B2-3-COPY) was ignored per the bulk-batch contract; never overwrites a non-empty value. No modules exist, so domain row only. | 2 fields on domains (49) |
| C1 | business_function_domains | INSERT 4 RACI rows on clean 20-function-spine matches: Field Service Operations (51) contributor, Customer Service (24) contributor, Finance (4) consumer, Governance Risk and Compliance (31) consumer. Owner (Business Operations 34) pre-existed. | 4 INSERT on business_function_domains |
| B11 | data_object_aliases | INSERT 32 `industry_term` generic synonyms across the 8 masters with `industry_id=7` (Utilities). No vendor/product names (Rule #18): Service Agreement / Premises Account; Smart Meter / Endpoint; Interval Read / VEE Reading; Service Point / Point of Delivery; Network Asset / Compatible Unit; Trouble Ticket / Outage Case; Field Order / Field Activity; Statement / Bill Determinant Result; and similar. | 32 INSERT on data_object_aliases |

Total rows written: 46 (8 PATCH data_objects, 1 PATCH domains touching 2 fields, 4 INSERT business_function_domains, 32 INSERT data_object_aliases).

### Surfaced (user decision or destructive; not executed)

- **B2-1** Pattern flags: which of the 8 masters flip `has_personal_content=true` (literalist 4 of 8 vs conservative all 8 vs user subset). Flipping a populated default is a destructive overwrite; surfaced.
- **B2-2** Outage handoff 942 payload (`outage_events`) vs relationship row 470 (`outage_events opens customer_cases`): keep / repoint / dual-shape.
- **B2-3** Raw meter reads to FIN (handoff 944): DELETE (destructive) / repoint to a future UTIL-AMI-MDMS / keep. Depends on Bucket 3 #2.
- **B2-4** Asset-failure fan-out (`utility_asset.failed` -> both FSM 941 and ITSM 943): keep both / remove 943 (destructive) / split the trigger (recommended).
- **B2-5** Umbrella vs promote (the structural decision): build 4 modules under UTIL-OPS / demote and promote CIS-UTIL + UTIL-AMI-MDMS + UTIL-OMS + UTIL-WAM / hybrid. Gates the build and all of Bucket 3.
- **B2-RACI-ENG** Engineering / Asset Management RACI contributor: no clean 20-function-spine match (Software Engineering id 26 is the wrong OT context; there is no Asset Management function). Map to a user-named function or skip. The 4 clean RACI rows were authored; this 5th proposed row was not.
- **Personas / RACI (Phase P):** DEFERRED. Not authored. The domain is unbuilt; persona / role_modules / process_raci work applies only after the multi-module build. Candidate personas once built: Meter-to-Cash Billing Analyst, AMI / Meter Data Operator, Outage Operator / Dispatcher, Field Work Coordinator, Network Asset Engineer.

### Left (not touched)

- **B1B-S1 (the build) + the module-grain cascade:** B1B-S2 (capabilities), B1B-S5 (intra-domain relationships), B1B-S6 (users edges), B1B-S7 (outbound cross-domain relationships), B1B-S8 (intra-domain handoffs + terminal trigger events), B1B-S9 (source-side handoff FK patches), B1B-S11 (lifecycle states). All blocked on the build, which is gated on B2-5. The agent does not scaffold an unbuilt domain.
- **B1A-H1DEF:** moot (all 7 handoffs already tagged live, see Summary).
- **RETIRED (superseded 2026-06-06 / per-domain-skill restoration):** B1B-S13 (module-scoped skills + skill_tools + DELETE legacy skill 115), B1B-S15 / B2-6 (F7 send_email channel-primitive PATCH). The per-module skill grain and skill_tools are dropped; tool requirements move to domain_module_tools during/after the build. Reframed as a note in state.yaml; supersession header retained.
- **b3 backlog:** 7 missing-domain candidates (CIS-UTIL, UTIL-AMI-MDMS, UTIL-OMS, UTIL-WAM, UTIL-DERMS, UTIL-GIS, UTIL-OPS-leadership). Non-blocking; resolution flows from B2-5.

### Counts

- Executed: 4 write types, 46 rows.
- Surfaced: 5 open b2 + 1 new RACI-mapping decision + personas deferral.
- Left (blocked b1b): 8 (build + 7 module-grain dependents) + 1 partial RACI.
- Retired: B1B-S13, B1B-S15, B2-6.
- b3: 7 candidates.
- JWT errors: 0.

### UI links (tables written)

- https://tests.semantius.app/domain_map/data_objects?id=in.(660,661,662,663,664,665,666,667)
- https://tests.semantius.app/domain_map/domains?id=eq.49
- https://tests.semantius.app/domain_map/business_function_domains?domain_id=eq.49
- https://tests.semantius.app/domain_map/data_object_aliases?data_object_id=in.(660,661,662,663,664,665,666,667)

---

## 2026-06-13 - Audit (B9d handoff-payload realization)

State-driven Validate pass. The one fresh agent-executable item, B1A-B9D-VERIFY (run B9d
bidirectionally on every boundary), was executed via `scripts/analytics/b9d_resolver.ts UTIL-OPS
--write`. The domain is still UNBUILT (0 domain_modules, 0 capability_domains); every other open
item is either a b2 user decision or a b1b item gated on the build B1B-S1 (itself gated on B2-5).
The agent does not scaffold an unbuilt domain. No catalog rows were written this pass (B9d touches
audit files only). JWT errors: 0.

### B9d classification (7 boundary tags, both directions)

The resolver walked every cross-domain handoff UTIL-OPS touches (all 7 are outbound; UTIL-OPS has
zero inbound) and classified each payload against the realized work set:

| Verdict | Handoff(s) | Process | Payload | Disposition |
|---|---|---|---|---|
| ORPHAN | 943 UTIL-OPS->ITSM | 1299 Triage IT service delivery incidents | service_incidents | Owner = ITSM (masters service_incidents). Routed to ITSM. |
| RESOLVED | 944 UTIL-OPS->FIN | 302 Invoice customer | meter_reads | Realized; no action. |
| UNOWNED | 942 UTIL-OPS->CSM | 196 Manage customer service problems | outage_events | Carried entity has no module-grain master (UTIL-OPS unbuilt). Subsumed by B1B-S1. |
| UNOWNED | 941 + 945 UTIL-OPS->FSM | 828 Report maintenance issues | utility_assets, meter_reads | Same; subsumed by B1B-S1. |
| UNOWNED | 939 UTIL-OPS->FIN | 1351 Generate customer billing data | utility_bills | Same; subsumed by B1B-S1. |
| UNOWNED | 940 UTIL-OPS->FSM | 1898 Schedule field service | utility_service_orders | Same; subsumed by B1B-S1. |

### Routed (cross-domain carve-out)

- **ORPHAN pid 1299 -> ITSM.** Authored an additive `b2` item `B2-B9D-OWN-1299` into
  `audits/ITSM/state.yaml` plus a plain-language question (q8) into `audits/ITSM/q-ITSM.md`
  (ITSM masters `service_incidents`, so ITSM owns assigning a persona to triage the forwarded
  incident). Additive only; record_status untouched (Rule #1). ITSM already carried a stack of
  B9d owner items from prior runs; this slotted in as q8.

### Not net-new work

- **4 UNOWNED findings (handoffs 939, 940, 941+945, 942).** These are an artifact of UTIL-OPS
  being unbuilt: the carried entities (utility_bills, utility_service_orders, utility_assets,
  meter_reads, outage_events) ARE mastered by UTIL-OPS in the legacy `domain_data_objects` rollup
  (domain 49), but the resolver reads ownership from `domain_module_data_objects` and UTIL-OPS has
  zero modules. They resolve to UTIL-OPS itself the moment B1B-S1 (the build) lands, so they are
  already subsumed by the existing build gate, not net-new orphans owed elsewhere. No new b1b item
  created; the resolver left them as sender-side review items (not applied).

### B1A-B9D-VERIFY resolved

All 7 handoff payloads are now classified in both directions. The verify item is complete and
removed from state.yaml.

### Remaining (all blocked on the user or the build)

- **b2 (user decisions, in q-UTIL-OPS.md):** B2-5 (umbrella vs promote, the gate), B2-1 (pattern
  flags), B2-2 (outage payload), B2-3 (raw reads to FIN), B2-4 (asset-failure fan-out),
  B2-RACI-ENG (Engineering RACI mapping).
- **b1b (gated on B1B-S1, itself gated on B2-5):** B1B-S1 build + the module-grain cascade
  (S2/S5/S6/S7/S8/S9/S11), B1B-S12-PARTIAL.
- **b3:** 7 missing-domain candidates (non-blocking).

### Counts

- Executed this pass: B9d resolver (1 ORPHAN routed to ITSM, 1 RESOLVED, 4 UNOWNED subsumed by
  build).
- Catalog rows written: 0.
- Audit-file edits: ITSM state.yaml + q-ITSM.md (B2-B9D-OWN-1299); UTIL-OPS history.md + state.yaml.
- JWT errors: 0.

### Final status

`feedback_needed` / `next_action_by: user`. No agent-executable work remains; the domain waits on
B2-5 (and the other b2 decisions) before the build can proceed.
