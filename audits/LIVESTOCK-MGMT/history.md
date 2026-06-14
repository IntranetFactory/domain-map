# LIVESTOCK-MGMT audit history

## 2026-06-14 - Build

### Summary
Triage candidate LIVESTOCK-MGMT (Livestock Management) arrived with mention count 1 (surfaced by
the FMIS audit), a weak cross-domain signal, so the fold-vs-promote call was the gate. Ran Phase 0
vendor research (report at `.tmp_deploy/LIVESTOCK-MGMT-phase0-2026-06-14.md`) and a live overlap
check against FMIS, FOOD-TRACE, FSQM, DAIRY-MGMT, FARMER-DIRECT-SALES.

Verdict: **promote-as-domain**. The general livestock / grazing management market (beef, sheep,
cattle, mixed grazing) is a distinct SMB-farm software market. Point-solution test PASSES: >=3
independent flagship pure-plays whose whole product is livestock / grazing management, not a crop
FMIS feature: AgriWebb, Herdwatch, MaiaGrazing (Atlas Ag), CattleMax, Performance Beef
(Performance Livestock Analytics). It does not fold into FMIS (crop / whole-farm field operations,
telemetry, agronomy) nor DAIRY-MGMT (dairy vertical: parlor, lactation, milk quality).

M&A notes captured: AgriWebb being acquired by URUS Group (bovine genetics; close expected Q3
2026); Performance Beef owned by Zoetis (2020); MaiaGrazing now part of Atlas Ag (next-gen Atlas
Grazing on the same lineage); Herdwatch independent and itself acquisitive (Kingswood, VetDrive
Jan 2026); Datamars/Tru-Test and Gallagher supply the EID / weigh data layer.

### Build (all rows record_status='new')
- Domain 176 LIVESTOCK-MGMT. 7 metadata fields populated (crud 70, min_org_size `10 xs <50`,
  cost_band `$`, usa_market_size_usd_m 900, source_year 2025, certification_required false,
  business_logic populated). Catalog tagline + description authored (buyer voice, Rule #20).
- 8 capabilities + 8 capability_domains.
- 2 full modules: LIVESTOCK-MGMT-HERD (358, "Herd and Animal Records") and LIVESTOCK-MGMT-GRAZING
  (359, "Pasture and Grazing Planning"), each with catalog UX fields; 8 domain_module_capabilities.
- 6 vendors (all net-new; none existed) + 5 solutions (AgriWebb, Herdwatch, MaiaGrazing,
  Performance Beef, CattleMax) + 5 solution_domains.
- 11 masters: livestock_animals, livestock_mobs, mob_movements, animal_weight_records,
  breeding_records, animal_treatment_records, animal_sale_records, livestock_identifiers (master +
  optional, jurisdiction-gated per Rule #16), grazing_paddocks, pasture_allocations, grazing_plans.
  entity_type classified on every master; pattern-flag booleans set explicitly (all false this pass;
  none of the masters clearly matched personal-content / submit-lock / single-approver). 12 DMDO
  rows (11 master + GRAZING consumer of livestock_mobs). singular/plural labels only (no
  display_label column live).
- 17 data_object_relationships: 13 intra-domain + 4 users edges (Rule #10). Mermaid-equivalent edge
  set: mob groups animal; animal has weights / treatments / identifiers; mob undergoes movements;
  plan schedules allocations and covers paddocks; allocation occupies paddock and allocates mob;
  movement moves to paddock; users record/administer/log/author.
- 8 data_object_aliases (Group, Lot, Field, Pasture, EID Tag, Ear Tag, Medicine Record, Calving
  Record).
- 24 data_object_lifecycle_states across the 8 operational_workflow masters; grazing_paddocks
  (catalog) and animal_weight_records / livestock_identifiers (operational_record) carry none, per
  Rule #12. Workflow gates on animal.sold, animal.culled, movement complete, withholding clear, sale
  confirm, plan activate.
- 4 trigger_events (animal.sold, treatment.recorded, mob_movement.completed,
  pasture_allocation.started) + 4 handoffs: 2 outbound to FOOD-TRACE (animal.sold -> carcass lot
  genealogy; treatment.recorded -> food-chain withholding gate, both high-friction api_call) and 2
  intra-domain lifecycle_progression (treatment -> sale-eligibility gate; allocation start -> mob
  movement).
- Phase C: business_function_domains owner = Business Operations (mirroring FMIS and DAIRY-MGMT),
  contributor Supply Chain, consumer Finance.
- Phase S: 18 domain_module_tools across the 2 modules (platform query/mutate per master + external
  fetch tools for EID reads, market prices, and weather forecast + notify_person/notify_team
  side-effects). 16 tools net-new; notify_person and notify_team reused existing shared catalog rows.
  1 domain-grain system skill `livestock-mgmt-system` (463; domain_id=176, domain_module_id=NULL,
  Rule #17).
- Phase E: 3 personas (Station Manager, Stock Manager, Grazier), each with 2 role_modules (>=2
  floor). process_raci DEFERRED: no real cross-industry APQC PCF node fits a farm / livestock-
  specific gated process, so per the research carve-out no process was invented; deferred to b2/idea
  rather than fabricated. Personas + role_modules authored regardless.

### Decisions / open items
- B2-S1 (gate): confirm distinct-domain vs fold-into-FMIS. Recommended distinct; research grounds it.
- B2-S2: confirm FOOD-TRACE (vs FSQM) ownership of the treatment/withholding food-chain gate.
- B3-S1 (non-blocking): deferred Phase 0 entities (pasture_measurements, rainfall_records,
  feedlot_rations, closeout_summaries); rainfall_records likely FMIS-owned.
- process_raci deferral noted above; revisit if a farm-operations PCF node is later added.

### Verification
record_status='new' confirmed on domain, skill, masters. Single-master invariant holds (11 distinct
masters, one role=master each). notes empty on all junctions (the only authored notes are the
permitted vendor predecessor/acquisition strings on MaiaGrazing and Performance Livestock Analytics,
Rule #18 exception). tools operation_kind <-> data_object_id invariant holds. No em-dash, American
English, no Python, no MCP, no git commit.
