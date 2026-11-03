# TRUCKING-TMS audit history

## 2026-11-03: Phase 0 classification and market-shape scoping

### Summary

The user asked whether FTL (Full Truckload, Ladungsverkehr) is a domain to add. It is not: no vendor read sells an FTL-only product, and truckload is the default shape of a carrier TMS. The market that passes the point-solution test (Rule #2) is carrier-side trucking TMS, queued as TRUCKING-TMS.

The user greenlit Phase 0 and then the `state.yaml` and q-file. Per Rule #21, nothing was written to the catalog. A live `/domains` check for TMS, TRUCKING-TMS, and TRANSLATION-MGMT returned no rows.

### Phase 0

Saved to `audits/TRUCKING-TMS/TRUCKING-TMS-phase0-2026-11-02.md`. 7 flagship vendors (McLeod, Trimble, Alvys, Rose Rocket, Truckbase, Soloplan, LIS). Verdicts: passes as `established_market`; FTL is a capability; LTL is an install-optional module; drayage and tank are install-optional records, with drayage flagged for re-check; asset-based brokerage and road forwarding are in, and pure broker software and air and ocean forwarding are out; sibling of TMS, not a sub-domain.

Census arithmetic and the two FMCSA counts (656,579 and 1,386,976) were re-run independently and reproduced. The 900,000 figure in the original question could not be reproduced. The market-size estimate (about $500M, range $300M to $800M) is too weak to cite as sourced.

### Cross-report reconciliation with TMS

Both reports independently recommend sibling domains, and their sizes fit (about $1.2B plus about $500M against Berg Insight's roughly $1.7B for both sides, all weak).

The exact-name check found `bills_of_lading`, `freight_documents`, `freight_invoices`, and `freight_quotes` in both reports. A later comparison by meaning added `cmr_consignment_notes` and `consignment_notes` (one legal document) and `equipment_types` and `freight_equipment_types` (one reference list). `hazmat_load_declarations` and `hazmat_shipping_papers` may also overlap; neither report compared them. Shared decisions are asked once, in this domain's q-file.

### Where the q-file departs from Phase 0

- **Modules.** Phase 0 hypothesized seven modules including TRK-COMPLIANCE, while calling it the thinnest. The q-file recommends six, because no vendor read packages a compliance module. Seven remains an option.
- **Bills of lading.** Each report claimed the master. The q-file recommends TMS as master on vendor evidence (Oracle, Shipwell, Freightview model it as a record; Alvys and Truckbase hold it as a document or scan), with the carrier's legal duty to issue stated as the case for the other option.
- **Settlement evidence.** Phase 0 cites McLeod Logix as naming settlement separately from billing. Its label is Logix Billing & Settlements, so the q-file treats McLeod as a counterexample.

### Catalog findings surfaced, not changed

- `Trimble Transportation` (solution 717) still names PeopleNet and telematics, which went to Platform Science in February 2025. Coverage rows 1039 and 1040 are primary. Proposed fix in the q-file, destructive, its own question.
- The FLEET-MGMT description says "dispatch"; the FLEET-DISPATCH capability is already scoped to vehicle assignment. Proposed fix in the q-file, destructive, its own question.
- No trailer record exists, and `fleet_vehicles` reads as powered vehicles.
- No transport regulation rows exist.
- McLeod, Alvys, Rose Rocket, Truckbase, Soloplan, and Platform Science are not in the catalog.

### Open decisions

See `q-TRUCKING-TMS.md` and `state.yaml`. Nothing is approved until the user answers and renames the file to `a-TRUCKING-TMS.md`.

## 2026-11-03: Built (new domain, established_market, id 195)

**Decisions (a-TRUCKING-TMS.md).** q1 a, top-level sibling of TMS. q2 yes, FTL is a capability (loaded as TRK-FTL). q3 a, LTL module. q4 b, drayage module, against the recommendation of records for now. q5 yes, tank and bulk as records. q6 a, carriers that also broker; brokers with no fleet stay a separate market. q7 a, road forwarding in the brokerage module; air and ocean out. q8 a, seven modules with no Compliance module. q9 a, local copies of drivers and trucks. q10 a, new fleet_trailers in FLEET-MGMT. q11 yes, trip assignment separate from fleet_assignments. q12 a, IFTA in FLEET-MGMT. q13 a, posting declarations here. q14 a, carrier_freight_* prefix. q15 a, freight_loads and load_tenders. q16 a, TMS masters bills of lading and consignment notes. q17 yes, one freight_equipment_types. q18 yes, $500M estimate. q19 a, both regulation sets. q20 yes, Trimble row. q21 yes, FLEET-MGMT description. q22 yes, research lower-evidence records later. q23 yes, queue two candidates. q24 yes, protocol rows. The user asked for these questions in chat, asked "why not a domain module" on q6 and q7, answered the corrected versions, then chose "Apply everything".

**Why q6 and q7 changed.** The original options said "install-optional module" and "core". Neither exists in the catalog: every module deploys on its own, and is_install_optional applies to records. Road forwarding has no records of its own, and a full module must master at least one, so it sits in the brokerage module.

**Loaded (all record_status='new'):**
- Phase A: domain 195; 10 capabilities; 7 full modules (TRK-LOADS, TRK-DISPATCH, TRK-BILLING, TRK-SETTLEMENT, TRK-BROKERAGE, TRK-LTL, TRK-DRAYAGE); 12 solutions (8 primary, 2 secondary, 2 partial) including the corrected Trimble row; 9 new vendors; 6 domain aliases.
- Phase B: 46 masters, lifecycle on 11 workflow masters, 20 trigger events, relationships including relationships to `users`, 23 aliases, 14 intra-domain handoffs, and 11 cross-domain handoffs (10 outbound, 1 inbound from TELEMATICS), tagged to custom processes.
- Phase C: Logistics owner; Accounts Receivable and Accounting contributors; Customer Service consumer; 2 capability-level owners.
- Phase S: domain skill trucking-tms; tools and domain_module_tools.
- Phase E: 6 personas, 6 custom processes with RACI.
- Regulations: 17 tagged, from the seed of 20 shared with TMS. BOC-3 and the annulled EU vehicle-return duty were left out as approved.
- On FLEET-MGMT, per q10 and q12: masters fleet_trailers (FLEET-MGMT-VEHICLE-LIFECYCLE) and ifta_quarterly_returns (FLEET-MGMT-FUEL-COMPLIANCE), with one event, one handoff to FIN, and relationships.

**Overwrites made (approved in q20, q21; each checked against the approved "from" value first).** solutions 717 description; solution_domains 1040 TELEMATICS primary to partial; 1039 FLEET-MGMT primary to secondary; domains FLEET-MGMT description.

**Judgment calls in the load, not vendor findings.** crud_percentage 75 and the business_logic text are my estimates. cost_band $$$ is my estimate: about 300 to 400 trucks at a 500-user carrier, at $30 to $60 per truck per month, gives $108K to $288K a year. certification_required false: FMCSA ELD certification falls on TELEMATICS, not here.

**Corrections and departures during the load.**
- q12 said this domain contributes trip miles. A contributor role fails M9, because a module must deploy alone, so TRK-DISPATCH carries ifta_quarterly_returns as an install-optional embedded_master, plus a freight_trips relationship and a handoff of miles to FLEET-MGMT.
- pay_runs came off TRK-SETTLEMENT (a row from this same load) because it drew in an unrelated required relationship; the handoff of approved settlements to PAYROLL covers employee drivers.
- pickup_delivery_routes collided with live delivery_routes under Rule #9, so it loaded as ltl_pickup_routes.
- Proof of delivery is a document type on carrier_freight_documents rather than its own record, as Phase 0 allowed.
- Process tags and process_key: see the TMS history.

**Health (domain_health.ts, this pass).** Fails: A4 and M8 only (catalog copy, awaiting the q-file answer). Warns: S3, B7, B10, B11, and E6 R6, the last from neighbors' events with blank to_state on records embedded here. FLEET-MGMT still fails M9, B9, B9b, B10b, B12, E1, F3, F5, and F8. None of those findings names a record this load added, and the two this load caused (an extra IFTA state and an untagged handoff) were fixed. The rerun of the loader showed 0 inserts on every table except that one handoff tag. b3 items were approved for later and were not loaded. Blueprint emission was not run.
