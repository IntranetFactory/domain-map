# MFG-OPS audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 7 `data_objects` (all `master + required`), **0 `domain_modules`**, 1 capability (`WORKFORCE-SCHEDULING`), 8 solutions, 4 regulations, 8 trigger events, 6 outbound + 6 inbound handoffs, 1 `business_function_domains` row (owner: Manufacturing Operations), 1 `skills` row (domain-scoped, not module-scoped), 7 `skill_tools` rows on that skill, 0 `roles` / 0 `role_modules` / 0 `role_permissions` for this domain.
- Vendor-surface basis: Tulip, Plex, PTC ThingWorx loaded as `primary` solutions; ServiceNow Manufacturing Connected Operations also `primary`; Salesforce Manufacturing Cloud `secondary`; Siemens Teamcenter, PTC Windchill, Dassault 3DEXPERIENCE ENOVIA `secondary` (PLM-adjacent, arguably scope-creep on a shop-floor execution market). Pure-play MES leaders MISSING from the catalog: Siemens Opcenter, GE Proficy, Aveva (formerly Wonderware), Rockwell FactoryTalk, Dassault Apriso / DELMIA Apriso, iBase-t Solumina. Honeywell Forge is loaded but the `Building Operations` variant, not the `Industrial` (Connected Plant) variant.
- **Bucket 1 (in-scope, agent fixable):** 11 items.
- **Bucket 2 (surface-for-user, judgment):** 9 items.
- **Bucket 3 (Phase 0 pending, speculative):** 7 items.

Structural pass: A partial (A1 pass, A2 hard fail, A3 borderline, A4 hard fail, A5 skipped). **M-band hard fail across the board** (M1 has zero `domain_modules` rows — this blocks M2, M4, S1, S2, and every B / E / F band that joins through modules). B-band: B1 nominally passes via legacy `domain_data_objects` rollup, but B6 (modular DMDO), B9 (trigger-event coverage), B10 (NULL module FKs), B11 (aliases), B12 (lifecycle states) all fail. C1 passes with one owner row. E-band fully empty (no roles, no role_modules, no role_permissions for this domain). F2 fails (system skill exists but `domain_module_id` is NULL because no modules exist), F3 passes for the existing skill, F4 passes for the existing skill, F5 yields a per-skill `strict_score = 100%` on the lone domain-scoped skill (all 7 tools `coverage_tier=platform`) but the per-module rollup is uncomputable (no modules). H-band: 2 of 6 outbound handoffs carry an APQC tag (both `proposal_source=discovery_substring`, `record_status=new`); 0 of 6 inbound; 0 approved (catalog-quality headline: **0%**).

Domain Semantius score on the only skill present: `mfg-ops-system` (id 84), 7 required tools, all `platform`, strict_score 100%. The score has no per-module meaning until M1 is cured.

### Vendor surface basis

The market is **Manufacturing Execution Systems** (MES) plus operator case-handling, OEE / downtime tracking, work-instruction delivery, and SPC. Pure-play leaders are Tulip (modern frontline-operations app builder), Plex / Rockwell Automation (cloud MES), PTC ThingWorx (industrial IoT + MES), Siemens Opcenter (Camstar / Simatic IT lineage), GE Proficy (formerly Plant Applications), Aveva MES (formerly Wonderware), Rockwell FactoryTalk Production Centre, Dassault Apriso, iBase-t Solumina (aerospace/defense), Honeywell Forge Connected Plant. ServiceNow Manufacturing Connected Operations is the workflow-on-top entrant; Salesforce Manufacturing Cloud is the customer-facing demand-collaboration view (arguably MISSING from MFG-OPS scope, see SCOPE-CREEP B1-W2).

Compliance specialists for regulated-manufacturing sectors anchor the audit-trail leg: Sparta Systems TrackWise (life sciences QMS), MasterControl, Veeva Vault QMS, ETQ Reliance. These belong in a dedicated EQMS (Enterprise Quality Management) domain, queued via the missing-domains helper this run.

### Bucket 1, In-scope confirmed gaps

Finding-type counts (per audit-procedure subcategorization):

| Finding type | Count |
| --- | --- |
| MISSING (entity gap) | 0 (every MISSING entity falls under MODULARIZATION ISSUES because M1 must be cured first; entities are listed in Bucket 2 #1 and Bucket 3) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 1 (B1-W1) |
| STRUCTURAL (S / A / M / B / C / E / F band failures) | 9 |
| BOUNDARY (NULL FK or missing handoff) | 0 (every B10b row is owned by the other side, surfaced in Report-only follow-ups) |
| APQC TAGGING (per-handoff PCF classification) | 1 (B1-H1; sub-table proposes 10 NEW `agent_curated` rows across 10 untagged handoffs) |
| MODULARIZATION ISSUES | 0 in Bucket 1 (these route to Bucket 2 per the audit-procedure convention; see Bucket 2 #1) |

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 | Zero `domain_modules` rows for MFG-OPS. The domain has 7 masters, 1 capability, 8 solutions, 12 handoffs, and a system skill, but the deployable unit (Rule #14) does not exist. Every downstream band (M2, M4, B6, B10, E1-E6, F2) is blocked by this. | Author the module set in Bucket 2 #1 first (architectural decision), then load `domain_modules` rows + `domain_module_data_objects` rows + `domain_module_capabilities` row. Cure of B1-S1 unlocks B1-S2 through B1-S5. |
| B1-S2 | A2 | Only 1 `capability_domains` row (`WORKFORCE-SCHEDULING`), which is shared with WFM and is not a defining capability of MFG-OPS at all. Pass criterion is ≥3 (typical 5-8). | Author 5-7 capabilities covering: work-instruction delivery, production-order release / dispatch, OEE and downtime tracking, in-line quality inspection, shop-floor case handling / andon, lot traceability and genealogy, statistical process control. Remove or re-scope the WORKFORCE-SCHEDULING link (WFM owns labor scheduling; MFG-OPS owns production scheduling, which is the existing `production_schedules` master). |
| B1-S3 | A4 | Both `catalog_tagline` and `catalog_description` are empty. Rule #20 buyer-voice backfill (draft, surface, then write). | Draft both fields per Rule #20 in a follow-up surface-to-user step; do not write without user approval of the exact wording. |
| B1-S4 | B11 | Zero `data_object_aliases` across all 7 masters. Industry synonyms exist for every one: `production_orders` (work order, manufacturing order, MO, WO), `work_instructions` (SOP, build instruction, routing step), `produced_units` (build record, as-built, serial record), `production_downtime_events` (downtime log, line stoppage, OEE downtime), `production_quality_inspections` (in-process inspection, IPI, source inspection), `shop_floor_cases` (andon event, escalation ticket, floor escalation), `production_schedules` (line schedule, dispatch list, sequence). | Author ≥1 alias per master (7 rows minimum). |
| B1-S5 | B12 | Zero `data_object_lifecycle_states` across all 7 masters. Every master has a real workflow that drives workflow-gate permission materialization (Rule #12). | Author the state machines (sketch in the table below). Each state with `requires_permission=true` derives a workflow gate prefixed with the realizing module's `domain_module_code`. Blocked by B1-S1 because `data_object_lifecycle_states.domain_module_id` references the module. |
| B1-S6 | B9 (catalog enum) | All 8 trigger_events for MFG-OPS masters have `event_category=''` (empty string). Rule #13 enum vocabulary: `lifecycle`, `state_change`, `threshold`, `signal`. Empty is a silent gap. | PATCH the 8 rows. Suggested assignments: `production_order.released` -> `lifecycle`, `production_order.completed` -> `lifecycle`, `work_instruction.revised` -> `state_change`, `production_schedule.published` -> `lifecycle`, `produced_unit.completed` -> `lifecycle`, `production_downtime_event.recorded` -> `signal`, `production_quality_inspection.failed` -> `state_change`, `shop_floor_case.opened` -> `lifecycle`. |
| B1-S7 | E1-E3 | Zero `roles` rows for MFG-OPS (no Plant Manager, Shift Supervisor, Production Operator, Quality Inspector, Maintenance Lead). Zero `role_modules`, zero `role_permissions`. The only nearby role in the catalog is `RESEARCH-DEV-MFG-ENGINEER` (Manufacturing Engineer) under business function 35, but that is an engineering-organization role and does not bundle shop-floor execution access. | Author 4-5 manufacturing-operations roles after modules are loaded. Blocked by B1-S1 and the module decision in Bucket 2 #1. |
| B1-S8 | F2 | The existing system skill `mfg-ops-system` (id 84) has `domain_module_id=NULL` (it points at `domain_id=47` only, the pre-modular pattern). Rule #14 + Rule #17 require one `system` skill per `domain_modules` row. | After modules ship, re-author the system skill set (one per module) and reassign / split the 7 existing `skill_tools` rows. Mirror the ATS skill-rename pattern. Blocked by B1-S1. |
| B1-S9 | F (skill naming convention) | The existing skill uses kebab `mfg-ops-system`. The Phase-S convention is snake `<module_code_lower>_agent` (ATS landed this; ATS audit B1-S4 ran the same fix). | Rename will happen as part of B1-S8 (the module split forces the name change anyway). |

#### SCOPE-CREEP

| ID | Finding | Fix |
|---|---|---|
| B1-W1 | `solution_domains` rows linking Siemens Teamcenter (842), PTC Windchill (843), Dassault 3DEXPERIENCE ENOVIA (845) to MFG-OPS at `coverage_level=secondary`. These three are PLM solutions; their MFG-OPS coverage is real but only via the `manufacturing_boms` and `manufacturing_routings` handoff downstream (already modeled as inbound from PLM). The `solution_domains` rows duplicate that signal at the marketing layer. | DELETE the 3 `solution_domains` rows. The PLM -> MFG-OPS dependency is correctly captured in `handoffs` 1087, 1091, 1092 already. |

#### APQC TAGGING

**Headline (catalog quality):** 0 of 12 cross-domain handoffs carry `record_status=approved` APQC tags. **Side-bar (process health):** 2 of 12 carry `proposal_source=discovery_substring` rows at `record_status=new` (handoff 950 -> process 822 "Schedule production orders and create lots"; handoff 953 -> process 158 "Create and manage master production schedule"). 10 handoffs are untagged.

| ID | handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | Confidence |
|---|---|---|---|---|---|---|---|
| B1-H1.a | 949 | MFG-OPS -> EAM | production_downtime_event.recorded | production_downtime_events | Monitor and optimize production process | 830 (L4, ext 19566) | confident L4 |
| B1-H1.b | 951 | MFG-OPS -> GRC | production_quality_inspection.failed | production_quality_inspections | Implement and maintain the enterprise quality management system (EQMS) | 415 (L3, ext 17498) | confident L3 |
| B1-H1.c | 952 | MFG-OPS -> ITSM | shop_floor_case.opened | service_incidents | Triage IT service delivery incidents | 1299 (L4, ext 20903) | medium L4 (semantic stretch: shop-floor case is operational, not IT service) |
| B1-H1.d | 954 | MFG-OPS -> FOOD-TRACE | produced_unit.completed | produced_units | Maintain production records and manage lot traceability | 171 (L3, ext 10370) | confident L3 |
| B1-H1.e | 1087 | PLM -> MFG-OPS | engineering_change_order.released | manufacturing_boms | Identify requirements for changes to manufacturing/delivery processes | 588 (L4, ext 10097) | confident L4 |
| B1-H1.f | 1091 | PLM -> MFG-OPS | manufacturing_bom.released | manufacturing_boms | Install and validate production/service delivery process | 590 (L4, ext 10100) | medium L4 |
| B1-H1.g | 1092 | PLM -> MFG-OPS | manufacturing_routing.released | manufacturing_routings | Develop and test prototype production and/or service delivery process | 578 (L4, ext 10098) | medium L4 |
| B1-H1.h | 867 | EAM -> MFG-OPS | eam_work_order.completed | eam_work_orders | Schedule production orders and create lots | 822 (L4, ext 10308) | medium L4 (semantic: completed maintenance unblocks production scheduling) |
| B1-H1.i | 975 | FSQM -> MFG-OPS | critical_control_point.deviation | critical_control_points | Implement and maintain the enterprise quality management system (EQMS) | 415 (L3, ext 17498) | confident L3 |
| B1-H1.j | 979 | FSQM -> MFG-OPS | sanitation_record.completed | sanitation_records | Support inventory and production processes | 817 (L4, ext 10301) | medium L4 |

All 10 ship as `proposal_source=agent_curated`, `record_status=new`. The 2 existing `discovery_substring` rows on handoffs 950 / 953 are already high-confidence PCF matches; no replacement proposed.

Deferred to Discover Pass 3 (no clean PCF match): none in this batch. The volume target (0.5N to 0.8N where N=12 -> 6 to 10) is met at 10 NEW rows.

### Bucket 2, Surface-for-user (judgment calls)

1. **Module split, the load-bearing architectural decision.** MFG-OPS has 7 masters, multiple distinct workflow shapes, and ServiceNow / Tulip / Plex split their products along these lines. Proposed split (5 modules):
   - `MFG-OPS-SHOPFLOOR-EXECUTION`, masters `production_orders`, `work_instructions`, `production_schedules`. Realizes capabilities work-instruction-delivery, production-order-dispatch.
   - `MFG-OPS-OEE-DOWNTIME`, masters `produced_units` (or shared with execution), `production_downtime_events`. Realizes capability OEE-and-downtime-tracking.
   - `MFG-OPS-IN-LINE-QUALITY`, masters `production_quality_inspections`. Realizes capability in-line-quality-inspection.
   - `MFG-OPS-FLOOR-CASE-MGMT`, masters `shop_floor_cases`. Realizes capability shop-floor-case-handling.
   - `MFG-OPS-LOT-TRACEABILITY`, masters `produced_units` (genealogy view). Realizes capability lot-traceability-and-genealogy.
   - Options: (a) accept the 5-module split (lots-traceability embeds `produced_units` from OEE module), (b) collapse to a 3-module split (execution + OEE-and-quality + floor-case), (c) start with a single `MFG-OPS-CORE` full module and split later, (d) propose an alternative shape. The choice cascades into B1-S5 (lifecycle states reference the module), B1-S7 (role bundles), B1-S8 (system-skill split).
2. **WORKFORCE-SCHEDULING capability on MFG-OPS, scope-correct?** The only existing `capability_domains` row links `WORKFORCE-SCHEDULING` (id 312) to MFG-OPS. WFM owns workforce-scheduling as a domain; MFG-OPS owns `production_schedules` (line / cell sequencing), which is a different concept entirely. Options: (a) keep, the capability spans both domains by intent, (b) remove, replace with `PRODUCTION-SCHEDULING` (new capability) and apply Cross-cutting-capability convention.
3. **Salesforce Manufacturing Cloud, MFG-OPS or CRM?** Currently linked at `coverage_level=secondary` on MFG-OPS. Salesforce Manufacturing Cloud is account-based demand forecasting / sales-agreement management, not shop-floor execution. Options: (a) keep secondary (some run-rate-vs-commit context overlaps MFG-OPS reporting), (b) move to CRM only (the primary semantic home), (c) move to a new MFG-DEMAND-COLLAB candidate domain.
4. **Honeywell Forge variant.** The catalog has `Honeywell Forge Building Operations` (id 687) but not `Honeywell Forge Industrial / Connected Plant`. The Building variant is the smart-buildings product; the Connected Plant variant is the MES product and is the one that should link to MFG-OPS. Options: (a) add the Industrial variant as a new `solutions` row, (b) leave as a noted gap.
5. **Adjacent MES vendors entirely missing from `solutions`.** Siemens Opcenter, GE Proficy, Aveva MES, Rockwell FactoryTalk Production Centre, Dassault Apriso, iBase-t Solumina. These are core MES leaders. Options: (a) load all 6, (b) load Siemens Opcenter and GE Proficy (the two largest by revenue), (c) defer to a vendor-refresh pass.
6. **Module-shape question, embedded vs master on `produced_units`.** If the 5-module split lands, `produced_units` could either master in `MFG-OPS-OEE-DOWNTIME` and embedded_master in `MFG-OPS-LOT-TRACEABILITY`, or master in lot-traceability and embedded in OEE. Vendor evidence is split: Plex masters in produce/release; Apriso masters in genealogy. Options: (a) master in OEE, embed in traceability, (b) master in traceability, embed in OEE, (c) keep `produced_units` in a single module (collapses one of the proposed module rows).
7. **`shop_floor_cases` -> ITSM handoff target (handoff 952).** The current target is ITSM module 38 (`service_incidents` master). Shop-floor cases are operational, not IT incidents; ITSM is the wrong consumer for the operational escalation. Vendor reality: ServiceNow models shop-floor cases inside `service_incidents` because everything in ServiceNow is a `Case` or `Incident` table, but other MES vendors treat the two as distinct. Options: (a) keep the ITSM target (consistent with ServiceNow product taxonomy), (b) reroute the handoff to a new MFG-OPS module (intra-domain), (c) drop the handoff entirely (shop-floor cases stay in MFG-OPS, do not fan out). Independent of Bucket 3.
8. **MFG-OPS does not host any `regulations` for product-safety / quality certifications.** The 4 mandatory regulations are EU Cyber Resilience Act, EU Data Act, Eco-design for Sustainable Products Regulation, EU Battery Regulation, all of which are product-marketing / connected-product-data regulations and are PLM-shaped, not MFG-OPS-shaped. Missing: ISO 9001 (quality management system), ISO 14001 (environmental), IATF 16949 (automotive), AS9100 (aerospace), ISO 13485 (medical devices), FDA 21 CFR Part 11 (electronic records, regulated industries), OSHA process safety. Options: (a) load 3-5 of these as new `regulations` rows with `domain_regulations` links, (b) move the 4 existing rows to PLM (they describe the regulated-product layer, not shop-floor execution), (c) keep as-is, MFG-OPS audit-trail uses these regulations because the shop floor produces the regulated artifact.
9. **Audit's own Rule #15 trigger.** The drafted `catalog_tagline` and `catalog_description` (B1-S3) need exact user wording before write. Defer the wording draft to a follow-up surface step; do not auto-write.

### Bucket 3, Phase 0 pending (speculative; vendor-research vetting needed)

Universal-or-near-universal manufacturing entities surfaced by analyst knowledge of MES vendor schemas. Phase 0 vetting (formal vendor-research protocol against Tulip, Plex, Opcenter, Proficy, Apriso) would confirm or filter:

| Candidate | Proposed module | Vendor evidence |
|---|---|---|
| `work_centers` (or `production_work_centers`) | MFG-OPS-SHOPFLOOR-EXECUTION | Universal (Plex, Opcenter, Apriso, Tulip station model, Proficy). Plant floor topology spine. |
| `production_material_consumption` | MFG-OPS-SHOPFLOOR-EXECUTION | Universal; backflushed against `production_orders` against BOM. |
| `production_oee_records` | MFG-OPS-OEE-DOWNTIME | Universal (Plex, Proficy, Aveva). Rolled-up shift / line / workcenter OEE summary. May fold into existing `production_downtime_events` rollup. |
| `production_genealogy` (lot/serial linkage) | MFG-OPS-LOT-TRACEABILITY | Universal in regulated manufacturing (life sciences, automotive, aerospace). Parent-child unit relationships. Distinct from `produced_units` (the unit) vs the chain. |
| `production_scrap_records` (or `production_rework_records`) | MFG-OPS-IN-LINE-QUALITY | Common (4 of 5 vendors). Materials lost / reworked, distinct from `production_quality_inspections` (the inspection) and `produced_units` (the unit). |
| `production_holds` (or `quality_holds`) | MFG-OPS-IN-LINE-QUALITY | Common; lot / order quarantine state on quality finding. May be a lifecycle state on `produced_units` rather than its own master, decide via Phase 0. |
| `production_andon_signals` | MFG-OPS-FLOOR-CASE-MGMT | Common (Tulip, Plex). Andon-pull events that may or may not produce a `shop_floor_case`. May fold into `shop_floor_cases` as a state. |

### Cross-bucket dependencies

- **Bucket 1 is gated by Bucket 2 #1 (module split).** Eight of the eleven Bucket 1 items reference the module split: B1-S1 (M1 cure), B1-S5 (lifecycle states reference modules), B1-S7 (roles bundle modules), B1-S8 (system skills mirror modules), B1-S9 (skill renaming is a side effect of S8), B1-S2 (capabilities map to modules via `domain_module_capabilities`), and the APQC TAGGING B1-H1 sub-table cites module FKs on the handoffs. Bucket 1 cannot ship until Bucket 2 #1 has a decision.
- **Bucket 2 #1 (module split) and Bucket 3 are coupled.** The proposed 5-module split assumes the Bucket 3 candidates land in specific modules. If Bucket 3 vetting lands fewer entities (e.g. `production_oee_records` folds into the existing `production_downtime_events` rollup), the OEE module thins out and the 5-module shape may collapse to 3.
- **Bucket 2 #8 (regulations) and Bucket 3 are independent.** The regulation list above is vendor-knowledge-based, not Phase-0-derived.
- **Bucket 2 #2 (WORKFORCE-SCHEDULING capability re-scope) feeds back into Bucket 1 B1-S2 (capability count).** If kept, A2 still fails because of the count floor (3 minimum); the capability authoring in B1-S2 stays required either way.

### Per-bucket prompts

- **After Bucket 1:** "Fix the 11 in-scope items now? Each is blocked by either the Bucket 2 #1 module-split decision (B1-S1, B1-S5, B1-S7, B1-S8, B1-S9, partially B1-S2, B1-H1) or a small surgical PATCH (B1-S4, B1-S6, B1-W1, alias B1-S4). Reply 'all after Bucket 2 #1 lands', 'just the surgical fixes (B1-S4, B1-S6, B1-W1)', or 'skip'."
- **After Bucket 2:** "Decisions per item? Item #1 is the load-bearing one (module split); items #2-#8 are independent and can be answered piecewise; item #9 (catalog UX wording) waits for your exact draft per Rule #20."
- **After Bucket 3:** "Vet via Phase 0 vendor research (run a focused subagent against Tulip / Plex / Opcenter / Proficy / Apriso surfaces) or eyeball-mode? If eyeball, name which of the 7 candidates ring true."

### Pass 3, Neighbor discovery

Neighbors via `handoffs` (cross-domain only) and `solution_domains` adjacency:

| Neighbor | Edge weight | Edge basis |
|---|---|---|
| PLM (165) | 3 | Inbound: 1087 (ECO released), 1091 (manufacturing_bom released), 1092 (manufacturing_routing released). All 3 source from PLM modules 66 and 68. |
| EAM (53) | 3 | Outbound: 949 (downtime), 953 (schedule published). Inbound: 867 (eam_work_order.completed). |
| FSQM (157) | 2 | Inbound: 975 (critical_control_point.deviation), 979 (sanitation_record.completed). |
| ERP-FIN (65) | 1 | Outbound: 950 (production_order.completed). |
| GRC (15) | 1 | Outbound: 951 (production_quality_inspection.failed). |
| FOOD-TRACE (155) | 1 | Outbound: 954 (produced_unit.completed). |
| ITSM (1) | 1 | Outbound: 952 (shop_floor_case.opened -> service_incidents). |

Deep pairwise reconciliation (Pass 4) runs only against edge weight >= 3. That is PLM and EAM. Lighter neighbors get one-line summaries.

### Pass 4, Pairwise reconciliation per neighbor (edge weight >= 3)

**MFG-OPS x PLM (3 inbound handoffs).**

1. Existing handoffs, fully wired: 0. All 3 inbound rows have `target_domain_module_id=NULL` because MFG-OPS has no modules. PLM-side `source_domain_module_id` is set (66 on 1087, 68 on 1091 and 1092), so the gap is one-sided on MFG-OPS.
2. NULL module FK PATCH candidates: handoffs 1087, 1091, 1092 — all 3 await B1-S1 cure (module ship), at which point the target module is determined by where `manufacturing_boms` and `manufacturing_routings` land as `consumer + required` DMDOs. Likely target: `MFG-OPS-SHOPFLOOR-EXECUTION`.
3. Missing handoffs the catalog implies: none new from PLM. The 3 existing rows cover the BOM / routing / ECO axis cleanly.
4. Boundary integrity: PLM masters `manufacturing_boms` and `manufacturing_routings` (correct). MFG-OPS should consume both. No existing `domain_data_objects` or DMDO row reflects this consumer link on the MFG-OPS side because no module exists yet. Routes to B1-S1.
5. Cross-domain `data_object_relationships` mirror: none exist between MFG-OPS masters and PLM masters. `production_orders` -> `manufacturing_boms` and `production_orders` -> `manufacturing_routings` consumer relationships should exist (the order references the BOM and routing it builds against). 2 missing rows on the MFG-OPS side (B1 follow-up after modules ship).

**MFG-OPS x EAM (3 handoffs, 2 outbound + 1 inbound).**

1. Existing handoffs fully wired: 0. All 3 rows have NULL module FKs on the MFG-OPS side; the EAM side is also NULL on these rows.
2. NULL module FK PATCH candidates: handoffs 867 (eam_work_order.completed -> MFG-OPS), 949 (downtime -> EAM), 953 (schedule -> EAM). PATCH after B1-S1 lands.
3. Missing handoffs: none new. The downtime / completion / schedule axis is correctly represented.
4. Boundary integrity: `data_object_relationships` rows 634, 635, 638 already model `production_downtime_events <-> eam_work_orders` and `production_schedules <-> equipment_pm_schedules`. Reasonable coverage.
5. Cross-domain `data_object_relationships` mirror: EAM's `eam_work_orders` -> MFG-OPS's `production_downtime_events` is wired (row 638). MFG-OPS's `production_downtime_events` -> EAM's `eam_work_orders` is wired (row 634). `production_schedules` -> EAM's `equipment_pm_schedules` is wired (row 635). Clean.

### Report-only follow-ups (owed by other domains)

- **EAM B10b owes:** `handoffs` rows 867, 949, 953 all carry NULL `source_domain_module_id` or `target_domain_module_id` on the EAM side. EAM is modularized; the PATCH (set the EAM module FK) is owed by the next EAM Validate run.
- **GRC B10b owes:** handoff 951 (`production_quality_inspection.failed` -> GRC) has `target_domain_module_id=NULL`. GRC's next Validate run should set this to the GRC nonconformance / incident-tracking module.
- **ERP-FIN B10b owes:** handoff 950 (`production_order.completed` -> ERP-FIN) has `target_domain_module_id=NULL`. ERP-FIN's next Validate sets it to the cost-accounting module that consumes WIP-completion.
- **ITSM B10b owes:** handoff 952 already targets ITSM module 38 (correctly wired on the ITSM side), but Bucket 2 #7 raises the architectural question whether ITSM is the right consumer. Surfaces to ITSM only if Bucket 2 #7 lands "reroute".
- **FOOD-TRACE B10b owes:** handoff 954 (`produced_unit.completed` -> FOOD-TRACE) has `target_domain_module_id=NULL`. FOOD-TRACE's next Validate sets the target module.
- **FSQM B10b owes:** handoffs 975, 979 both have `source_domain_module_id=NULL` on the FSQM side. FSQM's next Validate sets the source modules.
- **PLM B10b owes:** handoff 1087 has `source_domain_module_id=66`, handoffs 1091 / 1092 have `source_domain_module_id=68`. PLM-side wiring is clean; no follow-up owed.

### Candidates queued (`audits/_missing-domains.md`)

- **EQMS (Enterprise Quality Management)** — surfaced from the regulated-manufacturing vendor scan (Sparta TrackWise, MasterControl, Veeva Vault QMS, ETQ Reliance, IQS, Intelex). Adjacency: MFG-OPS, PLM, GRC, FSQM. Capabilities: nonconformance management, CAPA, document control, supplier quality, audit management, change control, complaint management. Helper run, `mention_count` bumped from 1 to 2.

## 2026-05-31, Continuation: B1 technical fixes

Applied the technically-deterministic subset of Bucket 1 via
[.tmp_deploy/fix_mfg_ops_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_mfg_ops_b1_technical_2026_05_31.ts).
Loader is idempotent; safe to re-run.

### Fixes applied

- **B1-S6 (B9 enum gap).** PATCHed `event_category` on 8 MFG-OPS `trigger_events`
  per the audit's exact event -> category mapping. trigger_event ids 1091, 1092,
  1094, 1095, 1098 -> `lifecycle`; ids 1093, 1097 -> `state_change`; id 1096 ->
  `signal`. 0 already correct, 8 patched.
- **B1-W1 (SCOPE-CREEP).** DELETEd 3 `solution_domains` rows linking PLM products
  (Siemens Teamcenter 842, PTC Windchill 843, Dassault 3DEXPERIENCE ENOVIA 845)
  to domain 47 at `coverage_level=secondary`. The PLM -> MFG-OPS dependency
  remains correctly modeled in handoffs 1087 / 1091 / 1092. Row ids deleted:
  1197, 1200, 1203.
- **B1-H1 (APQC tagging).** INSERTed 9 new `handoff_processes` rows
  (`proposal_source=agent_curated`, `record_status=new` per Rule #1).
  Handoff 954 -> PCF 171 already existed (id 652), skipped by natural-key
  dedup. The new tags coexist with PLM-side prior tags on handoffs 1087 / 1091
  / 1092 (additive on `(handoff_id, process_id)`). APQC catalog-quality
  headline remains 0%; flipping to `approved` requires user review per Rule #1.

### Deferred (gated on judgment)

- **B1-S1** (zero `domain_modules`). Blocked by Bucket 2 #1 module-split
  architectural decision. Until resolved, every downstream band stays open.
- **B1-S2** (3+ `capabilities`). New entity authoring; user must approve scope
  and pick the 5-7 capabilities. Also coupled to Bucket 2 #2 (WORKFORCE-
  SCHEDULING re-scope question).
- **B1-S3** (`catalog_tagline` / `catalog_description`). Rule #20 buyer-voice
  draft, needs user-approved wording.
- **B1-S4** (`data_object_aliases`). Audit suggests synonyms but does not
  pre-specify exact `(data_object_id, alias_name)` tuples; bulk insert blocked
  on tuple-level approval.
- **B1-S5** (`data_object_lifecycle_states`). Blocked by B1-S1 (states FK to
  `domain_module_id`).
- **B1-S7** (`roles` / `role_modules` / `role_permissions`). Blocked by B1-S1.
- **B1-S8** (system skill `domain_module_id`). Blocked by B1-S1; skill-split
  shape follows the module-split shape.
- **B1-S9** (skill kebab -> snake rename). Falls out of B1-S8 once modules
  exist.
- **Bucket 2 #1 - #9** and **Bucket 3** are unchanged from the 2026-05-30 pass.

### Verification

```
GET /trigger_events?event_name=in.("production_order.released",..)
  -> all 8 carry the expected event_category
GET /solution_domains?solution_id=in.(842,843,845)&domain_id=eq.47
  -> [] (confirmed delete)
GET /handoff_processes?handoff_id=in.(949,951,952,954,1087,1091,1092,867,975,979)
  -> 17 rows total: 9 new MFG-OPS-curated tags + 8 prior (PLM / FSQM / FOOD-
     TRACE / a concurrent EAM-side tag on handoff 867)
```

No JWT-audience errors. Loader run from project root, single execution.

## 2026-05-31, Audit

### Summary

- Current footprint: 7 `data_objects` (all `master + required` via legacy `domain_data_objects`), **0 `domain_modules`** (M1 still failing), 1 capability (`WORKFORCE-SCHEDULING`, id 312), 5 solutions (PLM scope-creep cleared), 4 regulations, 8 trigger events (event_category now populated), 6 outbound + 6 inbound cross-domain handoffs, 1 `business_function_domains` row (Manufacturing Operations owner), 1 domain-scoped `skills` row (id 84, kebab-named, still `domain_module_id=NULL`), 7 `skill_tools` rows on that skill, 0 `roles` / 0 `role_modules` / 0 `role_permissions` anchored on MFG-OPS, 0 `data_object_aliases`, 0 `data_object_lifecycle_states`, 0 `domain_module_data_objects` mastering MFG-OPS entities, 0 `domain_aliases`.
- Vendor surface basis carries from 2026-05-30 (Tulip, Plex, PTC ThingWorx, ServiceNow Manufacturing Connected Operations, Salesforce Manufacturing Cloud; pure-play MES leaders Siemens Opcenter / GE Proficy / Aveva / Rockwell FactoryTalk / Dassault Apriso / iBase-t Solumina still MISSING from `solutions`). 5 flagships in current catalog (Salesforce Manufacturing Cloud, ServiceNow Manufacturing Connected Operations, PTC ThingWorx, Tulip Frontline Operations, Plex Smart Manufacturing Platform).
- **Bucket 1 (in-scope, agent fixable):** 4 items.
- **Bucket 2 (surface-for-user, judgment):** 9 items (unchanged from 2026-05-30, all gated on module-split architectural decision and adjacent solution scope calls).
- **Bucket 3 (Phase 0 pending, speculative):** 7 items (unchanged from 2026-05-30; vendor research still pending).

Delta vs 2026-05-30: B1-S6 (trigger event enum), B1-W1 (PLM solutions DELETE), B1-H1 (APQC tagging) are all closed via the 2026-05-31 Continuation loader. Verification queries below confirm landed state. Remaining open structural items still block on the Bucket 2 #1 module-split decision (the architectural gate the 2026-05-30 audit identified). All seven Bucket-2 items #2-#8 and all of Bucket 3 are unchanged.

Structural pass: A1 passes (7 fields populated, `crud_percentage=75`, `business_logic` set, cost band `$$$$`, market size 3500 USD-m, source year 2025). A2 hard fail (1 capability of 3 minimum). A3 passes (5 solutions, 3 `primary`). A4 hard fail (`catalog_tagline` and `catalog_description` both empty). M1 hard fail (zero `domain_modules`, no host-junction modules either). M2 / M4 / M5 / M6 / M7 / M8 vacuously fail or are uncomputable until M1 cures. B1 nominally passes via legacy rollup (7 masters). B2 passes (all 7 masters have `singular_label` / `plural_label`). B3 passes (all 7 names are prefixed; none are bare-word claims). B4 considered (all 7 masters have all three pattern flags `false`; no `data_objects.notes` audit trail, but Rule #15 forbids the auto-write — record the consideration here). B5 vacuously passes (no embedded_master rows because no DMDOs exist). B6 fails (3 intra-domain edges total: 599↔476, 597→477, 476→599; missing many master↔master verbs — production_orders→work_instructions, production_orders→produced_units, production_orders→production_schedules, production_quality_inspections→produced_units, shop_floor_cases→production_orders). B7 fails (zero `users` edges across all 7 masters; users id 748 confirmed). B8 outbound: 6 cross-domain handoffs from MFG-OPS, only `production_downtime_events ↔ eam_work_orders` has the relationship edges; B8 partially fails. B9 / B9b: 8 trigger events exist and carry `event_category` (post B1-S6), but 0 intra-domain handoffs exist because zero modules and zero DMDOs make module-pair derivation impossible. B10 (inbound) report-only: 6 inbound handoffs (PLM x3, EAM x1, FSQM x2) — all carry `target_domain_module_id=NULL` because MFG-OPS has no modules. B10b: zero rows pass — every MFG-OPS-side handoff FK is null. B11 fails (zero aliases). B12 fails (zero lifecycle states). C1 passes (Manufacturing Operations as owner). C2 vacuously passes (only 1 capability and no override needed). D1 deferrable until next emit. E1-E5 all fail (zero roles anchored on MFG-OPS; the lone `RESEARCH-DEV-MFG-ENGINEER` is anchored on PLM modules 66/68, not on MFG-OPS). F1 vacuous fail (legacy `domain_id=47` system skill 84 still present, but acceptable transitional state because no module-level system skill yet exists). F2 fails (no `domain_module_id` skills). F3 passes for skill 84 (7 `skill_tools` rows). F4 passes (all 7 are `query` with `data_object_id` set). F5 yields strict_score 100% on skill 84 (all 7 tools `coverage_tier=platform`); per-module rollup uncomputable. F7 vacuously passes (no channel primitives linked). H1 PASSES (catalog quality): 12 of 12 cross-domain handoffs carry ≥1 `handoff_processes` row, with provenance `(agent_curated count = 17, discovery_substring count = 2)`. None at `record_status=approved`, so the headline catalog-quality measure is still 0% — user review required to flip.

The lone MFG-OPS Semantius score remains strict_score 100% on skill 84 (per-skill); per-module rollup still uncomputable (no modules).

### Vendor surface basis

Carries over verbatim from the 2026-05-30 narrative (no change in vendor footprint this pass beyond the B1-W1 PLM-solutions DELETE that was applied 2026-05-31). 5 flagships now linked to MFG-OPS in `solution_domains` (Salesforce Manufacturing Cloud, ServiceNow Manufacturing Connected Operations, PTC ThingWorx, Tulip Frontline Operations, Plex Smart Manufacturing Platform). The 6 pure-play MES leaders called out 2026-05-30 (Siemens Opcenter, GE Proficy, Aveva MES, Rockwell FactoryTalk Production Centre, Dassault Apriso, iBase-t Solumina) remain absent from `solutions` and stay queued under Bucket 2 #5.

### Bucket 1, In-scope confirmed gaps

Finding-type counts:

| Finding type | Count |
| --- | --- |
| MISSING (entity gap) | 0 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 (B1-W1 cleared 2026-05-31) |
| STRUCTURAL (S / A / M / B / C / E / F band failures) | 4 (B6 intra-domain edges, B7 users edges, partial B8 outbound mirror, F1 legacy skill cleanup once modules ship) |
| BOUNDARY (NULL FK or missing handoff) | 0 (everything blocked on M1) |
| APQC TAGGING | 0 (H1 coverage now 12 of 12; flipping `record_status=approved` is a user-review action, not an agent fix) |
| MODULARIZATION ISSUES | 0 in Bucket 1 (Bucket 2 #1 still owns the architectural decision) |

#### STRUCTURAL band failures (agent-fixable now, no module dependency)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S10 | B6 | Only 3 intra-domain `data_object_relationships` rows across 7 masters (599↔476 / 597→477 / 476→599 are EAM-touching). Pure intra-MFG-OPS master↔master edges are missing: `production_orders→work_instructions` (executes), `production_orders→produced_units` (produces), `production_orders→production_schedules` (scheduled_in), `production_quality_inspections→produced_units` (inspects), `shop_floor_cases→production_orders` (raised_against). | Author ≥5 intra-domain `data_object_relationships` edges with `relationship_verb` + `inverse_verb` + cardinality + `relationship_kind` + `is_required` + `owner_side`. Loader pattern from prior cluster-drafts loads. Independent of module split. |
| B1-S11 | B7 | Zero `users` edges across all 7 MFG-OPS masters (users id 748). Per Rule #10, every master with a user-typed actor must edge to `users`. MFG-OPS masters all have actors: `production_orders` (released_by), `work_instructions` (author / approver), `production_schedules` (planner / publisher), `produced_units` (operator), `production_downtime_events` (recorder / acknowledger), `production_quality_inspections` (inspector), `shop_floor_cases` (opener / assignee / supervisor). | Author 7-10 `users` edges per Rule #10. Independent of module split. |
| B1-S12 | B8 outbound | 6 outbound cross-domain handoffs, only the EAM-axis (rows on `production_downtime_events` and `production_schedules`) has corresponding cross-domain `data_object_relationships` rows. Missing on the MFG-OPS source side: `production_orders→` ERP-FIN payload (handoff 950), `production_quality_inspections→` GRC payload (951), `shop_floor_cases→` ITSM `service_incidents` (952), `produced_units→` FOOD-TRACE payload (954). | Author ≥4 outbound cross-domain `data_object_relationships` edges. Independent of module split (the source-side row uses MFG-OPS master ids on the left). Skip the row on handoff 952 if Bucket 2 #7 lands "reroute" or "drop". |
| B1-S13 | B4 | All 7 masters carry the three pattern flags `false` and were considered this pass. `production_orders` plausibly carries `has_single_approver=true` (production-order release is supervisor-gated in regulated industries). `work_instructions` plausibly carries `has_submit_lock=true` (instruction is locked once released to the floor; revisions require re-approval). The other 5 stay `false`. | Surface to user: do they want PATCH on `production_orders.has_single_approver=true` and `work_instructions.has_submit_lock=true`? Per Rule #12 the consideration is recorded here in the audit, not via `notes`. Independent of module split. |

#### MODULARIZATION ISSUES

None routed to Bucket 1. Bucket 2 #1 still owns the architectural decision.

#### APQC TAGGING

**Headline (catalog quality):** 0 of 12 cross-domain handoffs carry `record_status=approved` rows. The reviewer signal is unchanged from 2026-05-30. **Side-bar (process health):** 17 `agent_curated` rows + 2 `discovery_substring` rows now cover 12 of 12 handoffs (no untagged remainder). Coverage moved from 2 of 12 -> 12 of 12 via the 2026-05-31 Continuation loader. No new APQC tags proposed this audit pass; the tagging surface is closed pending `record_status` flip on user review.

### Bucket 2, Surface-for-user (judgment calls)

The 9 Bucket-2 items from 2026-05-30 carry forward unchanged. Restated for self-containment:

1. **Module split, load-bearing architectural decision.** Proposed 5-module split (`MFG-OPS-SHOPFLOOR-EXECUTION` / `MFG-OPS-OEE-DOWNTIME` / `MFG-OPS-IN-LINE-QUALITY` / `MFG-OPS-FLOOR-CASE-MGMT` / `MFG-OPS-LOT-TRACEABILITY`) vs alternatives: (a) 5-module split, (b) 3-module split (execution + OEE-and-quality + floor-case), (c) single `MFG-OPS-CORE` full module with later split, (d) alternative shape. Gates B1-S5, B1-S7, B1-S8, B1-S9 from prior audit and is the M1 cure.
2. **WORKFORCE-SCHEDULING capability re-scope.** Only existing `capability_domains` row links 312 (WORKFORCE-SCHEDULING) to MFG-OPS. The capability is realized by `FSM-DISPATCH-OPS` module (id 161) in FSM domain (id 31), not by any MFG-OPS module (because none exist). Options: (a) keep, capability spans MFG-OPS and FSM/WFM by intent, (b) remove and author `PRODUCTION-SCHEDULING` capability for MFG-OPS (cross-cutting if vendors share the shape).
3. **Salesforce Manufacturing Cloud, MFG-OPS or CRM?** Currently `coverage_level=secondary` on MFG-OPS. Options: (a) keep secondary, (b) move to CRM only, (c) move to a new MFG-DEMAND-COLLAB candidate domain.
4. **Honeywell Forge variant.** Building Operations variant exists (id 687); Industrial Connected Plant variant missing. Options: (a) add the Industrial variant, (b) leave as a noted gap.
5. **Adjacent MES vendors absent from `solutions`.** Siemens Opcenter, GE Proficy, Aveva MES, Rockwell FactoryTalk Production Centre, Dassault Apriso, iBase-t Solumina. Options: (a) load all 6, (b) load top-2-by-revenue (Opcenter + Proficy), (c) defer to vendor-refresh pass.
6. **`produced_units` master vs embedded.** Under the 5-module split, `produced_units` could either master in `MFG-OPS-OEE-DOWNTIME` and embed in `MFG-OPS-LOT-TRACEABILITY`, or master in lot-traceability and embed in OEE, or collapse to a single module owning both. Vendor evidence is split.
7. **`shop_floor_cases` -> ITSM handoff target (952).** Current target ITSM module 38 (`service_incidents`). Options: (a) keep ITSM target (ServiceNow taxonomy), (b) reroute intra-domain after module split, (c) drop entirely.
8. **`regulations` set is product-marketing-shaped, not shop-floor-shaped.** Current 4 regulations all PLM-adjacent. Missing for MFG-OPS audit-trail: ISO 9001, ISO 14001, IATF 16949, AS9100, ISO 13485, FDA 21 CFR Part 11, OSHA process safety. Options: (a) load 3-5, (b) move existing 4 to PLM, (c) keep as-is.
9. **Catalog UX wording (A4 / M8).** `catalog_tagline` and `catalog_description` empty per A4. Rule #20 buyer-voice draft, needs user-approved wording. Defer the draft to a focused follow-up surface step; do not auto-write.

### Bucket 3, Phase 0 pending (speculative; vendor-research vetting needed)

The 7 Phase-0-pending candidates from 2026-05-30 carry forward unchanged: `work_centers` / `production_material_consumption` / `production_oee_records` / `production_genealogy` / `production_scrap_records` / `production_holds` / `production_andon_signals`. Vendor evidence summaries unchanged. Vetting choice still open: (a) formal Phase 0 vendor research against Tulip / Plex / Opcenter / Proficy / Apriso, or (b) eyeball-mode with user naming which candidates ring true.

### Cross-bucket dependencies

- **Bucket 1 items B1-S10, B1-S11, B1-S12, B1-S13 are all independent of Bucket 2 #1 module split.** This is the unblocked subset that distinguishes this audit pass from 2026-05-30: relationship edges and pattern flags do not reference `domain_module_id`, so they can land before modules ship. The remaining deferred work from 2026-05-30 (B1-S1, B1-S2, B1-S5, B1-S7, B1-S8, B1-S9) still gates on Bucket 2 #1.
- **Bucket 2 #1 (module split) and Bucket 3 are coupled** (same reasoning as 2026-05-30).
- **Bucket 2 #8 (regulations) and Bucket 3 are independent.**
- **Bucket 2 #2 (WORKFORCE-SCHEDULING capability) is now reinforced by live state:** the only realizing module for capability 312 is FSM-DISPATCH-OPS in FSM, not a MFG-OPS module, so keeping the `capability_domains` row on MFG-OPS without a MFG-OPS realizing module fails M4 once any MFG-OPS module ships.

### Per-bucket prompts

- **After Bucket 1:** "Fix the 4 in-scope items now (B1-S10 intra-domain edges, B1-S11 users edges, B1-S12 outbound mirror, B1-S13 pattern flags)? All four are independent of the module-split decision. Reply 'all', 'just B1-S10 + B1-S11 + B1-S12', 'just B1-S13 pattern flag PATCH', or 'skip'."
- **After Bucket 2:** "Decisions per item? Item #1 (module split) is the load-bearing one. Items #2-#8 are independent and can be answered piecewise. Item #9 (catalog UX wording) waits for your exact draft per Rule #20."
- **After Bucket 3:** "Vet via Phase 0 vendor research (focused subagent against Tulip / Plex / Opcenter / Proficy / Apriso surfaces) or eyeball-mode? If eyeball, name which of the 7 candidates ring true."

### Pass 3, Neighbor discovery

Neighbors via `handoffs` (cross-domain only) and `solution_domains` adjacency (PLM solutions DELETE 2026-05-31 removed the spurious PLM adjacency at the solution layer; handoffs adjacency unchanged):

| Neighbor | Domain id | Edge weight | Edge basis |
|---|---|---|---|
| PLM | 165 | 3 | Inbound: 1087 (ECO released), 1091 (manufacturing_bom released), 1092 (manufacturing_routing released). Source modules 66 / 68 set on PLM side. |
| EAM | 53 | 3 | Outbound: 949 (downtime), 953 (schedule published). Inbound: 867 (eam_work_order.completed). |
| FSQM | 157 | 2 | Inbound: 975 (critical_control_point.deviation), 979 (sanitation_record.completed). |
| ERP-FIN | 65 | 1 | Outbound: 950 (production_order.completed). |
| GRC | 15 | 1 | Outbound: 951 (production_quality_inspection.failed). |
| FOOD-TRACE | 155 | 1 | Outbound: 954 (produced_unit.completed). |
| ITSM | 1 | 1 | Outbound: 952 (shop_floor_case.opened -> service_incidents). |
| INV-MGMT | 164 | DMDO-only | INV-KITTING module 63 consumes `production_orders` (`role=consumer`, `necessity=optional`); no handoff row yet covers this dependency. **B10 owed-by-INV-MGMT entry** below. |

Deep pairwise (Pass 4) on edge weight >= 3: PLM and EAM.

### Pass 4, Pairwise reconciliation per neighbor (edge weight >= 3)

**MFG-OPS x PLM (3 inbound handoffs).**

1. Existing handoffs, fully wired: 0. All 3 inbound rows still have `target_domain_module_id=NULL` (MFG-OPS module shape unresolved).
2. NULL module FK PATCH candidates: handoffs 1087, 1091, 1092 — still pending B1-S1 (module ship).
3. Missing handoffs: none new.
4. Boundary integrity: PLM masters `manufacturing_boms` and `manufacturing_routings` (correct). MFG-OPS still has no consumer DMDO link because no MFG-OPS modules exist. Routes to B1-S1.
5. Cross-domain `data_object_relationships` mirror: still missing the 2 rows `production_orders→manufacturing_boms` and `production_orders→manufacturing_routings`. Captured in the B1-S12 outbound bundle (these are inbound for PLM but outbound for MFG-OPS via the `production_orders` master verb). Adding now as part of B1-S12 is safe and module-independent.

**MFG-OPS x EAM (3 handoffs, 2 outbound + 1 inbound).**

1. Existing handoffs fully wired: 0. All 3 rows still have NULL module FK on MFG-OPS side; EAM side unchanged (also NULL on MFG-OPS-adjacent rows but EAM was flagged owed in 2026-05-30).
2. NULL module FK PATCH candidates: 867 (EAM->MFG-OPS), 949 (MFG-OPS->EAM), 953 (MFG-OPS->EAM). PATCH after B1-S1 lands.
3. Missing handoffs: none new.
4. Boundary integrity: relationship rows 634, 635, 638 still in place. Clean.
5. Cross-domain `data_object_relationships` mirror: clean on this axis.

### Report-only follow-ups (owed by other domains)

- **EAM B10b owes:** handoffs 867, 949, 953 still carry NULL module FKs on the EAM side.
- **GRC B10b owes:** handoff 951 (`production_quality_inspection.failed` -> GRC) still NULL `target_domain_module_id`.
- **ERP-FIN B10b owes:** handoff 950 (`production_order.completed` -> ERP-FIN) still NULL `target_domain_module_id`.
- **ITSM B10b owes:** handoff 952 still targets ITSM module 38; depends on Bucket 2 #7.
- **FOOD-TRACE B10b owes:** handoff 954 still NULL `target_domain_module_id`.
- **FSQM B10b owes:** handoffs 975, 979 still NULL `source_domain_module_id` on the FSQM side.
- **PLM B10b owes:** nothing further (PLM source modules clean).
- **INV-MGMT B10b owes:** INV-KITTING (module 63) consumer-DMDO on `production_orders` has no `handoffs` row publishing into INV-KITTING from MFG-OPS. The consumer DMDO implies a candidate handoff (e.g. `production_order.released` or `production_order.completed` -> INV-KITTING). Surfaces as inbound-discovery on the INV-MGMT side; whether it also gets surfaced as missing outbound on MFG-OPS is a Bucket 2 follow-up if INV-KITTING genuinely consumes MFG-OPS events at runtime.

### Verification snippets (this audit's queries)

```
GET /domains?domain_code=eq.MFG-OPS  -> id 47, A1 fields populated, catalog_tagline/description empty (A4 fail)
GET /domain_modules?domain_id=eq.47  -> []                      (M1 fail)
GET /domain_module_host_domains?domain_id=eq.47 -> []           (no cross-cutting hosts)
GET /capability_domains?domain_id=eq.47 -> 1 row (WORKFORCE-SCHEDULING)  (A2 fail)
GET /solution_domains?domain_id=eq.47 -> 5 rows (3 primary, 2 secondary) (A3 pass)
GET /trigger_events?data_object_id=in.(595..601) -> 8 rows, all event_category set (B1-S6 closed)
GET /solution_domains?solution_id=in.(842,843,845)&domain_id=eq.47 -> [] (B1-W1 closed)
GET /handoff_processes?handoff_id=in.(949,950,951,952,953,954,867,975,979,1087,1091,1092) -> 19 rows (B1-H1 closed; coverage 12 of 12)
GET /data_object_aliases?data_object_id=in.(595..601) -> [] (B11 fail)
GET /data_object_lifecycle_states?data_object_id=in.(595..601) -> [] (B12 fail)
GET /data_object_relationships?data_object_id=in.(595..601),related_data_object_id=eq.748 -> [] (B7 fail)
GET /skills?domain_id=eq.47 -> 1 row (id 84, domain_module_id NULL) (F2 fail; F1 transitional)
GET /skill_tools?skill_id=eq.84 -> 7 rows, all coverage_tier=platform (strict_score 100% per-skill)
GET /domain_module_data_objects?data_object_id=in.(595..601) -> 1 row (INV-KITTING consumer on 595)
```

No JWT-audience errors. All reads from project root.

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
