# TRUCKING-TMS Phase 0 - Vendor Surface (2026-11-02)

Carrier-side trucking transportation management: the system a for-hire or private fleet uses to take a load from a customer, dispatch it on its own trucks or a partner's, bill the customer, and settle with drivers and owner-operators. This report is research only: it decides nothing and nothing was loaded. All catalog access was read-only through the `semantius` CLI. Shipper-side TMS is researched separately (sibling candidate `TMS`) and appears here only where the boundary needs it. That sibling report did not exist when this was written, so proposed names still need reconciling with it.

**Answer to the original question.** FTL is not a domain. No vendor was found selling an FTL-only product. Truckload is the default shape of the carrier TMS. The hypothesis holds with one correction: the seam vendors actually package separately is LTL, not FTL. See verdict 2.

## Verdicts at a glance

| # | Question | Answer | Evidence strength |
|---|---|---|---|
| 1 | Point-solution test | Passes. `established_market` | Strong |
| 2 | FTL | Capability, not domain and not module. LTL is the module | Strong for LTL packaging, medium for entity differences |
| 3 | Brokerage and forwarding | Asset-based brokerage in, as an optional module. Road forwarding in by the same route. Air and ocean forwarding out | Strong on brokerage, medium on forwarding |
| 4 | Fleet boundary | This domain masters loads, trips, invoices, settlements. It embeds trucks and drivers and consumes HOS, GPS, fuel, maintenance | Strong |
| 5 | Relation to TMS | Top-level sibling, not a sub-domain | Medium |
| 6 | Buyer | Paid floor about 5 trucks. Realistic core 11 to 500 trucks: about 35,000 US carriers | Census strong, adoption weak |
| 7 | US market size | About $500M, range $300M to $800M. Weak estimate | Weak |

## Flagship vendors

Evidence grade: A = public API reference or help center read directly. B = public docs for one product of several. C = marketing pages only.

| Vendor | URL | Product(s) | Specialist in | Ownership, verified 2026-11-02 | Grade | Why included |
|---|---|---|---|---|---|---|
| McLeod Software | mcleodsoftware.com | LoadMaster, LoadMaster LTL, PowerBroker | Truckload and LTL carriers, brokers, private fleets | Private. Trademarks held by Tom McLeod Software Corporation; a 2024 release quotes Tom McLeod as CEO and founder. Founded 1985 | C (site returned 403 to direct fetch; read only through search snippets and trade press) | Long-standing pure-play with the clearest "separate SKU" packaging. Queue evidence named it |
| Trimble | developer.trimble.com/docs/tmwsuite, transportation.trimble.com | TMW.Suite, Innovative, TruckMate | All carrier segments | Public parent. The T&L segment is under strategic review; Trimble says no predetermined outcome or timeline (Oct. 2026) | B (TMW.Suite developer docs read directly; TruckMate help is behind a learning portal) | Largest disclosed revenue in this set. Shows what a suite vendor treats as mainline |
| Alvys | docs.alvys.com | Alvys TMS | Carriers plus asset-based brokers | Private; $40M Series B led by RTP Global (Sept. 2025) | A (103-page API reference and 246 help guides indexed) | Best public surface of the vendors read. Most `X` cells for operations come from here |
| Rose Rocket | roserocket.readme.io/docs | Rose Rocket TMS | Carriers and brokers on the same objects | Private; $38M Series B June 2023 (reported by Sacra, citing FreightWaves) | A for objects, thin on API endpoints | Public object model. Its definitions directly address the broker question |
| Truckbase | truckbase.com | Truckbase | Small asset carriers, 5 to 50 trucks | Not verified. No acquisition found | C | The only vendor in the set that refuses brokers. Marks the small-end floor |
| Soloplan | soloplan.de, soloplan.com | CarLo plus add-ons | DACH road logistics, all carrier and forwarder types | Not stated on site; search found nothing | C | European and German-language market. 1,800 customers and 34,000 users per its own site |
| LIS | lis.eu | WinSped | DACH road logistics | Not stated on site | C (per-module pages, no API docs) | Second European vendor. The one vendor that lists a discrete FTL module |

Mode specialists used for verdict 2 only, not in the main matrix: **CLI (Carrier Logistics)** at carrierlogistics.com, LTL, acquired by STG (not related to STG Logistics) per its own site. **PortPro** drayOS at portpro.io, drayage. **CargoWise Landside**, ex Envase, bought by WiseTech for $230M (announced Jan. 2023), drayage. **TrueLiquid** by TrueTMS and **BulkOffice** by TwoSommers, tank and bulk. **PCS TMS** at pcssoft.com, used for buyer-size evidence.

**Consolidation note (one suite is not counted twice).** TMW.Suite, Innovative and TruckMate are three separately sold Trimble products but one column below. In that column, `X` means confirmed in TMW.Suite developer docs; `m` means seen only in Innovative, TruckMate or TMW.Suite marketing. PowerBroker and LoadMaster LTL are in the McLeod column. Trimble's telematics units (including PeopleNet) went to Platform Science, closed Feb. 2025, with Trimble keeping 32.5%, so the Trimble column here is TMS only.

**Dropped from the starting list:** none. All five names hold up, with these changes to how they were described: McLeod's LTL is its own product, TruckMate is positioned for LTL first rather than for "LTL and intermodal" equally, and TMW.Suite is not only truckload (it is sold to carriers, private fleets, brokers and 3PLs). Soloplan CarLo and LIS WinSped both hold up as European carrier-side vendors, with the caveat in verdict 3 that they sell to forwarders too.

## Module-packaging comparison

"Not found" means not found in what could be read, not absent.

| Vendor | Truckload | LTL | Intermodal, drayage | Tank, bulk | Brokerage | Settlements | Truck and driver records | Maintenance | ELD, telematics | Air, ocean forwarding |
|---|---|---|---|---|---|---|---|---|---|---|
| McLeod | LoadMaster, base product. Page titled "FTL & Truckload Carrier TMS" | **LoadMaster LTL, separately named** | Not found | Not found | **PowerBroker, separate product** for non-asset brokerage | Inside LoadMaster (Logix Billing & Settlements) | Inside (driver profile, tractor IDs) | Not found | Integrates (Motive, Samsara, ORBCOMM) | Not found |
| Trimble | TMW.Suite, Innovative | **TruckMate**, "Transportation management for LTL Carriers" | TruckMate Intermodal module | TMW.Suite "fuel hauler", Innovative "bulk liquid" | Same product (TMW.Suite, Innovative); TruckMate lists a Brokerage module | Inside; Freight Sourcing & Settlement add-on | Master Data API | **TMT Fleet Maintenance, separate product** | **Telematics sold.** Fleet Hub connects in-cab tech | Not found |
| Alvys | Default, no mode selector found | **Not found in help guides** | Not found | Not found | **Same product**: "Dispatch as a broker" beside "Dispatch as a carrier" | Inside: driver and carrier statements | API: Drivers, Trucks, Trailers | Maintenance records in API; Fleetrock sync | Integrates; API records telemetry | Demo form option only |
| Rose Rocket | Same objects | No class or NMFC field found on Order or Tariff | Not found | Not found | **Same objects**: Order is defined as between a customer and a broker or carrier | Pay Stubs, Bills | Assets (VIN, plate). Drivers are users | Not found | Integrates (Samsara, Geotab) | Not found |
| Truckbase | Long Haul, Regional | Listed use case "LTL & Partial Loads", no detail | Listed use case | Heavy Haul and Specialized, tank not named | **Refused**: "solely focuses on asset-based carriers" | Inside: driver settlements | Not documented | Not found | 30+ ELD integrations | No |
| Soloplan | **Use case on base CarLo**: "Full loads (FTL)" | Same page: "Partial loads". inHUB cross-dock add-on | Container page, base CarLo | Bulk page, base CarLo, ADR | Subcontractors and freight exchange | Not verified for drivers | inMOTION add-on | inMOTION add-on | inTOUCH add-on, third parties | **inAIR&SEA add-on** |
| LIS | **"FTL Cargo Transportation" module**, built "for the special requirements of bulk transportation" | Disposition plans groupage, partial and complete loads; System Transportation connects KEP and cooperation networks | Swap bodies and containers module | Chamber contents, in the FTL module | Freight Check; credit notes to carriers | Not found for drivers | Fleet Management, Personnel Scheduling | Fleet module (2016 press) | Telematics Integration | ATLIS customs only |

## Surface matrix

Mc=McLeod, Tr=Trimble, Al=Alvys, RR=Rose Rocket, TB=Truckbase, So=Soloplan, Li=LIS.

`X` = confirmed in product docs, API reference or help center. `m` = marketing page only (for McLeod, its own site as returned in search snippets, or trade press). Blank = not found. **Blank never means absent.** The count shows total cells with the `X` count in parentheses, so a Core row resting only on marketing is visible as such. Roles in the last column are hypotheses.

| Entity | Category | Mc | Tr | Al | RR | TB | So | Li | Classification | Proposed module or owner |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|---|
| freight_loads | Master | m | X | X | X | m | m | m | Core 7 (3X) | TRK-LOADS, master |
| load_stops | Junction | m | X | X | X |  |  |  | Core 4 (3X) | TRK-LOADS |
| freight_facilities | Master |  | X | X | X |  |  |  | Core 3 (3X) | TRK-LOADS |
| load_tenders | Junction | m | m | X |  |  |  |  | Core 3 (1X) | TRK-LOADS |
| rate_confirmations | Audit |  |  | X |  |  |  |  | Specialist 1 (1X), see note a | TRK-LOADS |
| freight_commodities | Config |  | X |  | X |  |  |  | Common 2 (2X) | TRK-LOADS |
| equipment_types | Config |  |  | X | X |  |  |  | Common 2 (2X) | TRK-LOADS |
| freight_quotes | Master |  |  |  | X |  |  | m | Common 2 (1X) | TRK-LOADS |
| load_templates | Config |  |  | X |  |  |  | m | Common 2 (1X) | TRK-LOADS |
| load_notes | Engagement |  |  | X |  |  |  | m | Common 2 (1X) | TRK-LOADS |
| load_requirements | Config |  | X |  |  |  |  |  | Specialist 1 (1X) | TRK-LOADS, or fold into equipment_types |
| customers | Master | m | X | X | X | m | m | m | Core 7 (3X) | Existing master. Embedded here |
| freight_trips | Master | m | X | X | X |  | m | m | Core 6 (3X) | TRK-DISPATCH, master |
| trip_asset_assignments | Junction |  | X | X | X |  | m |  | Core 4 (3X) | TRK-DISPATCH |
| driver_availability_records | Junction |  | X | X |  |  |  | m | Core 3 (2X) | TRK-DISPATCH |
| stop_events | Junction |  | X | X |  |  |  |  | Common 2 (2X) | TRK-DISPATCH |
| trip_legs | Junction |  | X |  |  |  |  |  | Specialist 1 (1X) | TRK-DISPATCH, optional |
| trip_check_calls | Engagement |  |  | X |  |  |  |  | Specialist 1 (1X) | TRK-DISPATCH, optional |
| fleet_drivers | Master | m | X | X | X | m | m | m | Core 7 (3X) | Existing FLEET-MGMT master. Embedded here |
| fleet_vehicles | Master | m | X | X | X | m | m | m | Core 7 (3X) | Existing FLEET-MGMT master. Embedded here |
| fleet_trailers | Master | m | X | X | X |  |  | m | Core 5 (3X) | Gap, see verdict 4 |
| eld_logs, gps_waypoints | Audit | m | m | X | m | m | m | m | Core 7 (1X) | Existing TELEMATICS masters. Consumed |
| freight_invoices | Master | m | X | X | X | m | m | m | Core 7 (3X) | TRK-BILLING, master |
| freight_tariffs | Config | m | m | X | X |  | m | m | Core 6 (2X) | TRK-BILLING |
| freight_documents | Audit | m |  | X | X | m | m | m | Core 6 (2X) | TRK-BILLING |
| accessorial_charges | Junction | m |  | X | X |  |  |  | Core 3 (2X) | TRK-BILLING |
| fuel_surcharge_tables | Config |  | m | X | X |  |  |  | Core 3 (2X) | TRK-BILLING |
| invoice_financing_records | Junction | m |  | X |  | m |  |  | Core 3 (1X) | TRK-BILLING |
| contract_lane_rates | Config |  |  | X | X |  |  |  | Common 2 (2X) | TRK-BILLING |
| freight_master_bills | Junction |  | X | X |  |  |  |  | Common 2 (2X) | TRK-BILLING |
| proof_of_delivery_records | Audit |  |  |  |  | m | m |  | Common 2 (0X) | TRK-BILLING, or a type of freight_documents |
| freight_tax_rules | Config |  |  |  | X |  |  |  | Specialist 1 (1X) | Skip, consume from FIN |
| driver_settlements | Master | m | X | X | X | m |  |  | Core 5 (3X) | TRK-SETTLEMENT, master |
| settlement_deductions | Junction |  | m | X | X | m |  |  | Core 4 (2X), note b | TRK-SETTLEMENT |
| driver_pay_plans | Config |  | m | X |  | m |  |  | Core 3 (1X) | TRK-SETTLEMENT |
| settlement_escrow_accounts | Audit |  | m | X |  |  |  |  | Common 2 (1X), also Compliance | TRK-SETTLEMENT |
| settlement_payees | Master |  | X |  |  |  |  |  | Specialist 1 (1X) | TRK-SETTLEMENT, optional |
| revenue_expense_allocations | Junction |  | X |  |  |  |  |  | Specialist 1 (1X) | Skip for now |
| partner_carriers | Master | m | X | X | X |  | m | m | Core 6 (3X) | TRK-BROKERAGE, master |
| load_board_postings | Engagement | m | m | X | m |  | m |  | Core 5 (1X) | TRK-BROKERAGE |
| carrier_settlements | Master |  | m | X | X |  |  | m | Core 4 (2X) | TRK-BROKERAGE |
| driver_qualification_records | Audit | m | X | X |  |  | m |  | Core 4 (2X) | FLEET-MGMT candidate master. Consumed |
| fuel_transactions | Junction |  | m | X | X |  | m |  | Core 4 (2X) | Existing FLEET-MGMT master. Consumed |
| vehicle_work_orders | Master |  | m | X |  |  | m | m | Core 4 (1X), note c | Existing FLEET-MAINT master. Consumed |
| edi_trading_partners | Config |  | m | X | m | m |  |  | Core 4 (1X) | TRK-LOADS |
| toll_transactions | Junction |  |  | X |  |  | m |  | Common 2 (1X) | FLEET-MGMT candidate master. Consumed |
| ifta_quarterly_returns | Audit |  | m | X |  |  |  |  | Common 2 (1X), also Compliance | See compliance table |
| cargo_claims | Audit |  | m |  |  |  |  | m | Common 2 (0X), also Compliance | TRK-COMPLIANCE |
| vehicle_permits | Audit |  | m |  |  |  |  |  | Specialist 1 (0X) | FLEET-MGMT candidate |

Notes:

- **a. rate_confirmations.** One `X` is a poor measure here. Alvys documents both directions: outbound to a carrier ("How to Send the Rate Confirmation to a Carrier") and inbound from a customer ("Tender Documents - Customer Rate Confirmation V1"). Truckbase has a PDF load importer and mentions "rate cons" in a blog, but does not name the object on the product page, so its cell stays blank. Treat this row as an evidence gap, not as a rare object.
- **b. Rose Rocket deductions.** Confirmed as a derived field (`otherPayAndDeductions`) on Pay Stubs, not as its own object.
- **c. vehicle_work_orders.** Alvys exposes "Maintenance records"; that is the closest match, not proof that it masters work orders. Trimble's cell is TMT Fleet Maintenance, a separate product.
- **Rose Rocket tenders.** Left blank on purpose. `tendered` is an Order status and `loadTenderNum` a Quote field, which suggests the concept but does not show an entity.
- **Rose Rocket drivers.** Drivers appear as a list of users on a Manifest, and trucks and trailers as one `Asset` object with an `assetType`. The `X` cells mean "the record exists", not "the same shape".
- **Vendor coverage, of 49 rows.** Alvys 39, Trimble 36, Rose Rocket 27, McLeod 18, LIS 18, Soloplan 17, Truckbase 13. Alvys, Trimble and Rose Rocket run above the 10 to 20 target because the count includes objects consumed from other domains, not UI widgets. McLeod, LIS, Soloplan and Truckbase are in range but marketing-grade, so their real surface is likely larger.

### Mode-specific entities (basis for verdict 2)

All cells are `m`: vendor marketing, press or customer case studies. No public LTL, drayage or tank schema was found. Mc=McLeod LoadMaster LTL, TM=Trimble TruckMate, CLI=Carrier Logistics.

| Entity | Mode | Mc | TM | CLI | Other evidence | Classification |
|---|---|:-:|:-:|:-:|---|---|
| ltl_freight_bills | LTL | m |m | m | McLeod automated PRO assignment (SMC3 release). CLI customer: about 2,500 freight bills a day | Core within LTL |
| freight_terminals | LTL | m | m | m | CLI "multi-terminal". TruckMate terminal operations | Core within LTL |
| dock_door_assignments | LTL | m | m | m | McLeod door and lot planning. TruckMate ConnectedDock. CLI Dock Management | Core within LTL |
| pickup_delivery_routes | LTL | m | m | m | TruckMate "local P&D". McLeod P&D routing | Core within LTL |
| linehaul_schedules | LTL | m |  | m | McLeod capacity planning. CLI dispatch, dock, linehaul | Common within LTL |
| freight_class_rates | LTL | m | m | m | McLeod built-in SMC3 and D83. TruckMate "complex rating". CLI Rate Engine | Core within LTL |
| interline_partner_splits | LTL | m |  |  | McLeod partner assignment and D83 splits | Specialist |
| intermodal_containers | Drayage |  | m |  | PortPro container tracking. Soloplan ISO number validation | Core within drayage |
| container_per_diem_charges | Drayage |  | m |  | PortPro per diem monitoring. TMSEZ per diem tracking. Not found at Soloplan | Common within drayage |
| chassis_usages | Drayage |  | m |  | TruckMate chassis. TMSEZ chassis auditing. Not found at Soloplan | Common within drayage |
| terminal_appointments | Drayage |  |  |  | PortPro appointment scheduling | Specialist |
| tank_compartment_loads | Tank |  |  |  | LIS chamber contents. TrueLiquid and Magnus multi-compartment loading (Transport Topics) | Common within tank |
| tank_wash_records | Tank |  |  |  | Magnus (Transport Topics) names tank washing and heel management | Specialist |
| hazmat_load_declarations | Tank | |  |  | LIS dangerous goods. Soloplan ADR. TrueTMS hazmat certifications | Common, not tank-only |

## Compliance entities (non-optional)

Regulation text below was read at Cornell LII or EUR-Lex summaries because eCFR and FMCSA block automated fetches. Rule #16 applies: US-only and EU-only entities are `master` with `is_install_optional=true`.

| Entity | Regulation (verified text) | Proposed owner | Vendor evidence | Why there |
|---|---|---|---|---|
| bills_of_lading | 49 USC 14706(a)(1) must issue receipt or bill; failure does not excuse liability. 49 CFR 373.101: names, origin and destination, packages, description, weight or volume | **Here**, TRK-BILLING | Truckbase BOL scanning (m). Alvys load documents (X, as a document type) | The load creates it |
| Rated freight bill (attribute of freight_invoices, not an entity) | 49 CFR 376.12(g): a lessor paid on percentage gets a copy of the rated freight bill | **Here** | TruckMate "freight bill" (m) | Same record as the invoice |
| cargo_claims | 49 USC 14706(e)(1): 9-month filing floor, 2-year suit floor. 49 CFR 370.5: acknowledge in 30 days, sequential claim file. 370.9: pay, decline or offer in 120 days, status every 60 days | **Here**, TRK-COMPLIANCE | Innovative claims monitoring (m). WinSped damage module (trade press, 2013) | Carmack liability attaches to the load; statutory clock runs from the record |
| owner_operator_leases | 49 CFR 376.12: written lease, compensation stated before any trip, charge-back list | **Here**, TRK-SETTLEMENT | Not found as an entity. Alvys tracks lease dates on trucks and generates truck statements for owner-operators | **Not on the original list. This is the most TMS-specific federal rule found** |
| settlement_escrow_accounts | 49 CFR 376.12(k): accounting on each settlement or monthly, interest at least quarterly, return within 45 days of termination | **Here**, TRK-SETTLEMENT | Alvys Escrow Accounts (X). Innovative escrow (m) | Drives settlement behavior |
| 15-day pay timer (attribute of driver_settlements, not an entity) | 49 CFR 376.12(f): pay within 15 days of required delivery documents | **Here** | Not found | Field, not entity |
| motor_carrier_authorities | 49 USC 13902 registers a "motor carrier", which 13102(14) defines as transportation for compensation. Private carriers are defined separately in 13102(15) | **Here**, TRK-COMPLIANCE | Rose Rocket `dotId`, `mcId` on partners only. Alvys verifies counterparties; its Subsidiaries API may hold own-authority data, not confirmed | FLEET-MGMT covers private fleets, which this registration is not written for. **Own-authority record not confirmed at any vendor; only counterparty checks are** |
| carrier_insurance_filings | 49 CFR 387.3 for-hire property carriers and hazmat. 387.7(d) proof (MCS-90) kept at principal place of business | **Here**, TRK-COMPLIANCE | Counterparty vetting only: Rose Rocket `compliances` on partners, Alvys blocks unvetted carriers. Insurance not named | Same reasoning |
| process_agent_designations (BOC-3) | 49 CFR 366.4. **LII shows this section as suspended effective Jan. 14, 2017 under 82 FR 5303.** Confirm before relying on it | **Here**, could be an attribute of motor_carrier_authorities | Not found | Weak spot |
| brokered_transaction_records | 49 CFR 371.3: per-transaction record, kept 3 years, reviewable by each party | **Here**, TRK-BROKERAGE, broker authority only | Derivable at Alvys, Rose Rocket | Applies only when the buyer brokers |
| ucr_registrations | 49 USC 14504a(f)(4): carriers, **private carriers**, leasing companies, brokers, forwarders; fee by fleet size | **FLEET-MGMT**, because private fleets also owe it. Low confidence | Not found | Applies beyond for-hire |
| eld_logs | 49 CFR 395.8: duty status via ELD, 6-month retention | **TELEMATICS** (live). Moves only if ELD-COMPLIANCE is promoted. Here: consumer | Alvys, Truckbase, Rose Rocket integrate. Motive shows HOS inside LoadMaster | No TMS vendor read masters it |
| vehicle_inspections | 49 CFR 396.11: daily DVIR, 3-month retention; single-vehicle carriers excluded | **FLEET-MGMT** (live). Here: not needed | Not found at any vendor here | Keep where it is |
| driver_qualification_records | 49 CFR 391.51: application, MVR, medical certificate; retained for employment plus 3 years | **FLEET-MGMT**, not yet an object. Here: consumer | TMW driver qualifications and expirations (X). Alvys Asset Safety Report (X). McLeod driver profile (m) | TMS vendors surface it to block dispatch, so the read is required |
| clearinghouse_queries | 49 CFR 382.701: pre-employment and annual queries | **FLEET-MGMT** or the ELD-COMPLIANCE candidate. Here: consumer | Alvys tracks Clearinghouse dates (X) | Same pattern |
| ifta_quarterly_returns | IFTA Articles and Procedures Manual: quarterly return, distance by jurisdiction, 4-year records | **Open conflict.** Three claimants, see verdict 4. Here: contributor of trip miles | Alvys (X), TruckMate, Innovative (m) | FLEET-MGMT description, ELD-COMPLIANCE candidate and TMS vendors all touch it |
| cmr_consignment_notes | CMR Art. 4 to 6: three originals, 11 mandatory particulars. Absence does not void the contract. EU and CMR states | **Here**, TRK-BILLING | Soloplan "waybills" (m). LIS shipping documents (m) | International sibling of bills_of_lading |
| e-CMR form (attribute of cmr_consignment_notes, not an entity) | 2008 Additional Protocol, in force 5 June 2011: same particulars. Germany: one secondary source gives accession in January 2022, not verified at UN | **Here** | Not verified at any vendor | Form, not new entity |
| Frachtbrief form (type on the same record, not an entity) | § 408 HGB: carrier may demand it, 12 listed items, three originals, electronic equivalent allowed | **Here** | Soloplan, LIS (m), as generic waybills and shipping documents | Domestic Germany |
| efti_data_sets | Regulation (EU) 2020/1056: authorities must accept via certified platforms from 9 July 2027. **Operators are not obliged**; paper remains valid | **Not a separate entity.** Delivery channel for cmr_consignment_notes | Not verified | Voluntary for operators |
| cabotage_operation_records | Reg. 1072/2009 Art. 8(2a) four-day cooling-off, 8(3) evidence of each operation, as amended by 2020/1055 | **Here**, TRK-COMPLIANCE, EU install-optional | Not found at Soloplan or LIS | Evidence comes from orders and trips |
| driver_posting_declarations | Directive 2020/1057: declaration via IMI portal before posting; stays 24 months in IMI | **Unassigned.** Here or FLEET-MGMT. Decide with user | Not found at any TMS | Depends on trips and on driver data equally |
| tachograph_records, driving_rest_records | Reg. 561/2006, 165/2014, as amended by 2020/1054. Vans 2.5 to 3.5 t in paid international carriage from 1 July 2026 | **TELEMATICS** or ELD-COMPLIANCE. Here: consumer | LIS and Soloplan: integrate telematics; tachograph not stated | EU equivalent of eld_logs |
| vehicle_return_records | **Do not load.** CJEU joined cases C-541/20 to C-555/20 (4 Oct. 2024) annulled the eight-week vehicle-return duty | None | n/a | Removed by the court |

### Compliance table additions for the protocol (not edited here)

The protocol's table in `references/vendor-research-protocol.md` has no row for this market. Proposed:

| Market segment | Required compliance entities |
|---|---|
| US for-hire motor carriers | `bills_of_lading`, `cargo_claims`, `owner_operator_leases`, `settlement_escrow_accounts`, `motor_carrier_authorities`, `carrier_insurance_filings` |
| US freight brokers | `brokered_transaction_records` |
| US commercial fleets, any operator | `eld_logs`, `vehicle_inspections`, `driver_qualification_records`, `clearinghouse_queries`, `ifta_quarterly_returns`, `ucr_registrations` |
| EU road haulage | `cmr_consignment_notes`, `cabotage_operation_records`, `driver_posting_declarations`, `tachograph_records` |

### Regulation rows the catalog needs

Catalog check today: a `regulations` search for FMCSA, motor carrier, hours of service, ELD, IFTA, Carmack, CMR, tachograph, mobility, eFTI, freight, transport and clearinghouse returned zero rows, so none of these exist.

| Regulation | Scope | Governs |
|---|---|---|
| Carmack Amendment (49 USC 14706) | US interstate | bills_of_lading, cargo_claims |
| 49 CFR 370 and 373 | US | cargo_claims, bills_of_lading |
| Truth-in-Leasing (49 CFR 376) | US | owner_operator_leases, escrow, settlements |
| 49 CFR 371 | US brokers | brokered_transaction_records |
| FMCSA registration and financial responsibility (49 USC 13902, 49 CFR 387, 366) | US | motor_carrier_authorities, carrier_insurance_filings |
| UCR (49 USC 14504a) | US | ucr_registrations |
| HOS and ELD (49 CFR 395) | US | eld_logs |
| DVIR (49 CFR 396) | US | vehicle_inspections |
| Driver qualification (49 CFR 391), Clearinghouse (49 CFR 382) | US | driver_qualification_records, clearinghouse_queries |
| IFTA | US and Canada | ifta_quarterly_returns |
| CMR Convention and e-CMR Protocol | International | cmr_consignment_notes |
| HGB §§ 407 to 466 | Germany | Frachtbrief, carrier and forwarder liability |
| Reg. (EU) 2020/1056 (eFTI) | EU | Channel for consignment data |
| Mobility Package I (2020/1054, 2020/1055, Directive 2020/1057), Reg. 1072/2009, 561/2006, 165/2014 | EU | cabotage, posting, tachograph |

## Modularization hypothesis

A hypothesis for Phase A, not a decision. Each module has at least one master (Rule #14).

**TRK-LOADS** (master: freight_loads). Order capture: load_stops, freight_facilities, load_tenders, rate_confirmations, freight_commodities, equipment_types, freight_quotes, load_templates, edi_trading_partners. All seven vendors have the load.

**TRK-DISPATCH** (master: freight_trips). Execution: trip_asset_assignments, stop_events, driver_availability_records, trip_legs, trip_check_calls. Embeds fleet_drivers, fleet_vehicles and a trailer record; consumes eld_logs, gps_waypoints.

**TRK-BILLING** (master: freight_invoices). Rating and invoicing together: freight_tariffs, contract_lane_rates, fuel_surcharge_tables, accessorial_charges, freight_master_bills, invoice_financing_records, freight_documents, bills_of_lading, cmr_consignment_notes. No vendor sells rating alone except CLI's FACTS Rate Engine, so rating folds here rather than standing alone.

**TRK-SETTLEMENT** (master: driver_settlements). driver_pay_plans, settlement_deductions, settlement_escrow_accounts, owner_operator_leases. Kept apart from billing because vendors name it separately (Truckbase, McLeod Logix, Alvys) and because 49 CFR 376 gives it its own legal shape.

**TRK-BROKERAGE** (master: partner_carriers). carrier_settlements, load_board_postings, brokered_transaction_records. Install-optional. Truckbase proves a real carrier TMS can run without it.

**TRK-COMPLIANCE** (master: motor_carrier_authorities). carrier_insurance_filings, cargo_claims, cabotage_operation_records. This is the thinnest module on vendor evidence: nearly every row is Compliance by regulation, not by vendor presence. It could fold into TRK-LOADS (claims) and TRK-BROKERAGE (authority checks) if Phase A finds no natural workflow.

**TRK-LTL** (master: ltl_freight_bills). freight_terminals, dock_door_assignments, pickup_delivery_routes, linehaul_schedules, freight_class_rates. Install-optional. Justified by McLeod, Trimble and CLI packaging, on marketing evidence only.

Drayage and tank entities stay install-optional rows in TRK-LOADS and TRK-DISPATCH for now, not modules (see verdict 2).

Rule #16 reading: the load, trip, invoice and settlement masters are `is_install_optional=false` (class D). US-only and EU-only statutory masters are `true` (class B). Brokerage, LTL, drayage and tank masters are `true` (class C), because Phase 0 shows flagship vendors without them: Truckbase has no brokerage, and no LTL object was found at Alvys.

## Per-seam verdicts (for the q-file)

### 1. Point-solution test

**What vendors do.** Three strictly independent vendors have a carrier TMS as their flagship:

- **McLeod LoadMaster.** Private since 1985. "dedicated solely to the transportation industry" (boilerplate from about 2015, repeated on Built In).
- **Truckbase.** "Truckbase solely focuses on asset-based carriers"; it declines brokers and 3PLs on purpose (own blog, 2023).
- **PCS TMS.** "built for asset-based carriers running 50 to 1,000 trucks" (own FAQ). It also offers a separate Shipper TMS, so this flagship claim is slightly softer.

Alvys ("the only TMS built for your Carrier + Broker operations") and Rose Rocket also fit on a broader reading. In Europe, Soloplan and LIS have TMS as the whole company, but they sell to forwarders as well. Trimble is a diversified parent, so its presence adds scale, not independence: T&L revenue was $549M in 2025, and it is for sale.

**Recommendation.** Passes. `established_market`: it owns masters no catalog domain holds and has several primary-coverage vendors. Nothing about this is immature: LoadMaster has been in market for decades.

**Trade-off.** "Flagship" is self-declared in every case. No analyst Magic Quadrant or Wave for carrier TMS surfaced in these searches, though Gartner and Forrester were not searched individually. The test rests on vendor statements, which are consistent but not independent. No sponsored comparison was counted.

### 2. FTL: domain, module or capability?

**Direct answer: capability.** FTL is the default shape of the carrier TMS, not a product or a market.

**What vendors do.**

- **Nobody sells FTL alone.** Across 9 vendors and specialists read, no FTL-only product appeared.
- **Truckload is the base, LTL is the add.** McLeod's base LoadMaster has a page titled "FTL & Truckload Carrier TMS" (an older URL) and a **separate** "LoadMaster LTL". Trimble positions **TruckMate** as "Transportation management for LTL Carriers" and TMW.Suite and Innovative for truckload. The index of Alvys's 246 help guides has no LTL title.
- **LTL has its own specialist.** CLI: "Enterprise Software for LTL Carriers". One customer said the challenge was finding a TMS that was not built for truckload and then modified for LTL (single customer's view, via a CLI case study).
- **Europe is mixed.** Soloplan treats "Partial loads" and "Full loads (FTL)" as two use cases on one page of one product.
- **Evidence against a pure capability reading.** LIS lists "FTL Cargo Transportation" as a named module among 23. Its page, though, says it was "developed for the special requirements of bulk transportation" (chamber contents, loading sequence), so it behaves more like a bulk module than a truckload one. TruckMate's brochure also has an FTL section beside LTL, Intermodal and Brokerage, on a product already positioned LTL-first. So FTL does appear as a labeled section at two vendors, and "never a module" would be wrong. Neither shows FTL sold apart from the TMS.

**What differs in the entities** (all marketing-grade evidence):

| Concern | Truckload | LTL |
|---|---|---|
| Revenue record | Load, one customer | Freight bill or PRO, many per trailer |
| Physical network | None required | Terminals, docks, doors |
| Movement | Trip with few stops | P&D, then linehaul, then P&D; a shipment "might be on any of a number of cross-docks on any of a number of trucks" (CLI, Transport Topics) |
| Rating | Lane, mile, flat, fuel surcharge | Class, NMFC, tariff bases, D83 partner splits (McLeod) |
| Partners | Sub-haul | Interline |

**Other modes, same test.**

- **Drayage.** Close to failing the "just a capability" reading. Flagship specialists exist: PortPro drayOS and CargoWise Landside (ex Envase), with TMSEZ and DrayMate less verified. General vendors treat it as a mode: TruckMate has an Intermodal module, Soloplan has features in base CarLo. Entities are distinct: containers, chassis, per diem, terminal appointments.
- **Tank and bulk.** Specialists exist (TrueLiquid, BulkOffice), but Soloplan, LIS, Innovative and TMW.Suite all cover it inside a general product. A Transport Topics piece puts bulk liquid at about 10% of the market.
- **Flatbed, reefer.** Not a packaging seam anywhere read. Innovative lists flatbed; Truckbase lists Heavy Haul and Specialized.

**Recommendation.** FTL: capability under TRUCKING-TMS. LTL: module (TRK-LTL), install-optional. Drayage and tank: install-optional entities, with drayage flagged for re-check as a possible module or its own domain.

**Trade-off.** Under the letter of Rule #2, drayage may pass on its own (PortPro, CargoWise Landside, one more), and LTL is marginal (CLI and TruckMate LTL-first, McLeod separately packaged, but TruckMate belongs to a suite that also covers other modes). Folding them means a drayage-only buyer is underserved by the domain description. Splitting them means three domains share loads, invoices and settlements. Evidence for both is marketing-grade, so this is a real decision for the user and should be a `b2`.

### 3. Brokerage and forwarding scope

**Brokerage: what vendors do.** Both patterns are real.

- **Same product:** Alvys ("Dispatch as a broker" and "Dispatch as a carrier" as sibling guides; the API exposes carrier settlement statements beside driver statements; that both use one load object is suggested, not stated). Rose Rocket: its docs define an Order as an agreement between a customer and a broker or carrier, a Manifest has a `partner` field marked broker-specific, and a Quote has Sell and Buy types. TMW.Suite: "hundreds of carriers, private fleets, brokers and 3PLs". Innovative: load board maintenance, carrier rating and carrier settlements run alongside the asset operation on the same orders and books, per its FAQ.
- **Separate product:** McLeod: LoadMaster for private and for-hire fleets, PowerBroker for non-asset-based brokerage. The two share a release train, and one 2012 note mentions tightly integrated transactions, but whether one database serves both could not be confirmed.
- **Refused:** Truckbase.
- **Pure broker market exists separately:** DAT Broker TMS, Tai TMS and PowerBroker sell to brokers without a fleet. US law separates them too: 49 USC 13102(2) defines a broker as "other than a motor carrier", and 49 CFR 371.3 record duties fall on brokers.

**Recommendation.** Asset-based brokerage is in, as install-optional TRK-BROKERAGE. A pure non-asset broker TMS is out: track it as a separate candidate if the user wants it (not added to the queue here).

**Trade-off.** Alvys, Rose Rocket and TMW.Suite would get a solution row whether the buyer has trucks or not, so the catalog will show them for a market a non-asset broker also buys in. The boundary is drawn by the buyer holding trucks, which is how Truckbase and McLeod draw it, but Alvys and Rose Rocket do not draw it at all.

**Forwarding: the Spedition question.** In common German use, "Spedition" covers both roles, and that is why the source figure said so. Legally they differ:

- **Frachtführer**, § 407 HGB: contracts to carry the goods.
- **Spediteur**, § 453 HGB: contracts to arrange the shipment, selecting carriers.
- **Selbsteintritt**, § 458 HGB: a Spediteur may haul itself and then has carrier rights and duties. With own trucks over 3.5 t, carrier rules apply (IHK Nord Westfalen).
- IHK: the terms are often used interchangeably, and "Spedition" is not a protected title.

So the figure's "Speditionen" for for-hire carriers is colloquial. The correct German term for a for-hire carrier is Frachtführer or Transportunternehmen.

**What vendors do.** Soloplan sells CarLo to Speditionen. A search summary of one of its German pages says it suits forwarders, Frachtführer and haulers of all kinds; the `/speditionssoftware/` page read directly does not use those words, and treats drivers and subcontractors in one FAQ. LIS names forwarding agencies and shipping firms. Air and ocean sit elsewhere: CarLo inAIR&SEA is an add-on (B/L, MBL, HAWB, MAWB, customs). WinSped's ATLIS module covers customs. CargoWise and CargoSoft are forwarding-first. Alvys lists "Freight Forwarder" on a demo form, with no content behind it.

**Recommendation.** Split by what moves:

- **Road forwarding (Landverkehrsspedition), including Selbsteintritt: in.** It uses the same objects as asset-based brokerage: load, partner carrier, carrier settlement. Soloplan and LIS sell one product for it.
- **Air, ocean, and multimodal forwarding (house and master bills, consolidations, customs): out.** Separate candidate if wanted.

**Trade-off.** The DACH market does not separate carrier and road forwarder in software, so the word "carrier" in the domain name undersells what Soloplan and LIS do. A US forwarder is a distinct legal category (49 USC 13102(8)), and US evidence here is thin: only the Alvys demo form. Neither CargoWise nor its road module was read in depth.

### 4. Boundary with FLEET-MGMT, TELEMATICS, FLEET-MAINT, ELD-COMPLIANCE

**What vendors do.** They do hold trucks and drivers themselves, and integrate for everything telemetry.

- **TMS holds operational records.** TMW.Suite Master Data API: "drivers, tractors, trailers, companies, commodities". Alvys API: Drivers, Trucks, Trailers, each with documents and events. Rose Rocket Asset: VIN, plate, compliances. LIS: Fleet Management module, Personnel Scheduling with driver master data. Soloplan: inMOTION add-on with driver license checks. Truckbase does not document its asset record.
- **TMS consumes telemetry.** Samsara's KB describes Trimble Innovative integration syncing vehicles, drivers and HOS. Motive shows remaining drive time inside LoadMaster. Truckbase integrates 30+ ELDs. Alvys has "Record asset telemetry". **Trimble selling its telematics units in 2025 while keeping TMS** is the strongest single fact that these are different businesses.
- **Maintenance varies.** Trimble: TMT Fleet Maintenance is a separate product. Soloplan: inMOTION add-on with workshop. Alvys: records plus Fleetrock sync. Truckbase, Rose Rocket and McLeod: not found.
- **Telematics vendors stop short of billing.** Samsara's marketplace has a TMS category to integrate with. No Samsara or Motive invoice or settlement object was found, based on one search only.

**Recommendation.**

| Entity | Owner | Role here | Install-optional here? |
|---|---|---|---|
| freight_loads, freight_trips, freight_invoices, driver_settlements, partner_carriers | This domain | master | No (brokerage entities yes) |
| fleet_drivers, fleet_vehicles | FLEET-MGMT | embedded_master | No. A carrier cannot dispatch without them, even with no FLEET-MGMT deployed |
| Trailer record | **Gap.** `fleet_vehicles` description reads as powered vehicles (fuel type, ICE/EV) | Propose `fleet_trailers` in FLEET-MGMT, embedded here | Decide |
| customers | CRM | embedded_master | No |
| eld_logs, gps_waypoints, vehicle_trips | TELEMATICS | consumer | Yes |
| fuel_transactions | FLEET-MGMT | consumer | Yes |
| vehicle_work_orders | FLEET-MAINT | consumer | Yes |
| vehicle_inspections | FLEET-MGMT | none needed | n/a |
| driver_qualification_records | FLEET-MGMT (new) | consumer | Yes |
| fleet_assignments | FLEET-MGMT | Consumer of tractor-to-driver pairing. Load-level assignment lives in trip_asset_assignments | Yes |

**Trade-off.** Embedding means a carrier that also deploys FLEET-MGMT keeps a driver in two places until sync, which is what the embedded_master role is for. Treating the TMS as co-master instead would match how vendors act (TMW.Suite calls drivers master data), but the catalog already gave these to FLEET-MGMT and the fleet vendors have the deeper record. FLEET-MGMT is cross-industry; this domain is freight only, so ownership stays with the broader one.

**ELD-COMPLIANCE conflict, flagged not resolved.** That candidate claims HOS, DVIR and IFTA. Live catalog already gives HOS (`eld_logs`) to TELEMATICS and DVIR (`vehicle_inspections`) to FLEET-MGMT. IFTA has three claimants: FLEET-MGMT's description, the ELD-COMPLIANCE candidate, and TMS vendors (Alvys, TruckMate, Innovative) that calculate it. Trip miles come from TMS or telematics, fuel from FLEET-MGMT. A TMS needs the output only for carriers filing from it. Recommend the `ifta_quarterly_returns` master go to FLEET-MGMT unless ELD-COMPLIANCE passes its own test, with this domain as contributor. That is the weakest call in this section.

Also, FLEET-MGMT's description lists "dispatch" as a capability. That will read as overlap once this domain exists. It would need sharpening to vehicle assignment, leaving freight dispatch here. Surfaced only.

### 5. Standalone or related to TMS?

**What vendors do.**

- **Separate shipper and carrier products:** PCS (Carrier TMS and Shipper TMS as separate offerings). Trimble (TMW.Suite for carriers; Transporeon, which per FreightWaves led to a TMS aimed directly at shippers). Tai (broker TMS, separate shipper product).
- **One product for both, claimed:** Turvo says "freight brokers, 3PLs, shippers, and carriers" on one Collaboration Cloud, but its carrier page offers visibility and does not mention driver settlements or asset-based carriers. Soloplan names Speditionen and "verladende Industrie" on one site. SAP TM has forwarding orders (customer side, LSP) and freight orders (carrier side) on one object model, but no driver pay or owner-operator concept was found. AscendTMS could not be verified because its site did not render.
- **Real overlap at private fleets.** McLeod and Trimble (TMW.Suite, Innovative) sell carrier-style TMS to private fleets, who are shippers with trucks.

**Recommendation.** Top-level sibling with handoffs to TMS. Do not nest it. Vendors that credibly do both are either enterprise object models without settlement (SAP) or do not show carrier back office (Turvo). The vendors showing carrier settlement do not sell the shipper's procurement in the same product. This follows the catalog's buyer-side and seller-side rule: a shipper's tender and a carrier's accepted load have different owners, lifecycles and paper, so they are separate data objects with a handoff. Sibling pairs to reconcile with the TMS report: shipper tender and `load_tenders`, shipper's freight audit and `freight_invoices`.

**Trade-off.** No "Transportation" roll-up exists in the catalog, so a user looking under one name will not find both. Soloplan and Turvo will appear under both domains. An umbrella in this catalog keeps cross-cutting masters of its own, and no shared object was identified here because the shipper and carrier records are distinct, so a roll-up would be a label rather than a domain. This judgment should be re-tested against the sibling report.

### 6. Who buys it

**Smallest realistic buyer: about 5 trucks.** Truckbase: "turnkey at 5 trucks and powerful enough for 50 trucks", minimum $290 a month. It does not target 500+ fleets. Rose Rocket starts at $2,080 a month, Alvys at $3.95 to $4.45 per load. Trimble's Jay Delaney placed the jump from spreadsheets at roughly 30 to 50 vehicles, with smaller fleets starting to move sooner (Transport Topics paraphrase, 2019).

**Named mid-market evidence.** Innovative: "built specifically for mid-market North American carriers and private fleets", with no size range given. PCS: 50 to 1,000 trucks in its FAQ, "from 25 trucks to 1000+" on a banner on the same page. Truckbase: 5 to 50. No analyst definition of the mid-market was found.

**Census.** Active, authorized for-hire, with an active MC docket. Source: FMCSA Company Census on data.transportation.gov, pulled 2026-11-02, newest add_date 2026-10-31.

| Trucks | Carriers | % of carriers | Trucks in band | Reading |
|---|---:|---:|---:|---|
| 0 reported | 126,793 | 19.3% | 0 | Not buyers. Includes authority-only and stale filings |
| 1 | 324,630 | 49.4% | 324,630 | Owner-operators. Would not buy this |
| 2 to 6 | 150,125 | 22.9% | 448,964 | Spreadsheets or a lite tool. Some at the top may buy |
| 7 to 10 | 19,431 | 3.0% | 162,242 | Entry zone |
| 11 to 20 | 16,780 | 2.6% | 247,455 | Mid-market start |
| 21 to 50 | 11,453 | 1.7% | 365,113 | Mid-market core |
| 51 to 100 | 4,257 | 0.65% | 301,528 | Mid-market core |
| 101 to 250 | 1,999 | 0.30% | 307,116 | Mid-market top |
| 251 to 500 | 612 | 0.09% | 210,881 | Mid-market top |
| 501 to 1,000 | 258 | 0.04% | 181,723 | Enterprise |
| 1,001+ | 241 | 0.04% | Not usable | Contaminated by placeholder values |
| **Total** | **656,579** | | | |

- **Owner-operators.** 68.8% of active MC dockets report 0 or 1 truck, and 91.6% report 6 or fewer. That matches ATA's roughly 91% at six or fewer (a 2017 figure, read through a search summary). InMotion, which makes AscendTMS, said "Owner-operators are the only ones not interested in TMS" (2018).
- **Mid-market.** 35,101 carriers at 11 to 500 trucks, 5.3% of carriers. Two other cuts agree closely: 35,338 interstate with no docket filter; 37,299 with MCS-150 filed in the last 24 months.
- **Why it matters.** Those 5.3% hold about 1.43M trucks, 56% of all trucks in fleets of up to 1,000. By carrier count the market looks like owner-operators; by trucks, it is the mid-market.

**Adoption.** Two sources, far apart. Use neither as fact.

| Band | AlphaLoops 2026, self-reported, stated floor | InMotion 2018, vendor-run, no sample size |
|---|---:|---:|
| Under 5 | n/a | 17% |
| Under 10 | n/a | 33% |
| 6 to 20 | 5.5% | n/a |
| 20+ | n/a | 91% |
| 21 to 50 | 26.4% | n/a |
| 51 to 100 | 50.8% | n/a |
| 101 to 250 | 61.3% | n/a |
| 250+ | 67.0% | n/a |

**Recommendation.** `min_org_size` value `10 xs <50`, matching the fleet domains, on the reasoning that 5 trucks plus office staff lands in that band. Mid-market focus: 11 to 500 trucks.

**Trade-off.** "Truck count" is a proxy for buying power. Asset-light brokers and carriers leaning on owner-operators may be larger than their truck count suggests. Census fields are self-declared.

### 7. US market size and carrier counts

#### Official for-hire count

**The user's ~900,000 could not be verified and should not be used.** No cut reproduces it. A plausible but unproven explanation is an older vintage of the broad cut.

| Cut, from FMCSA Company Census unless noted | Count | Reading |
|---|---:|---|
| All active registrants | 2,243,632 | FMCSA A&I dashboard shows 2,132,868 (snapshot 09/25/2026). Dates and definitions differ |
| Active, class includes Authorized For Hire | 1,386,976 | Broadest. Any self-declared for-hire |
| ...with at least 1 truck | 1,137,258 | Close to FleetOwner's "1.1 million" (Dec. 2025) |
| ...class is exactly Authorized For Hire | 1,094,136 | Excludes mixed for-hire and private |
| ...with active MC docket | **656,579** | **Preferred buyer proxy: held authority** |
| ...with MCS-150 filed in the last 24 months | 611,473 | Recency filter |
| ...interstate only | 532,010 | Close to Pocket Guide basis |
| Pocket Guide, Dec. 2023 | 519,420 of 787,189 | **From a dispatch-service blog citing the guide. PDF returned 403, so unconfirmed** |
| Pocket Guide, Dec. 2021 | 484,970 of 757,652 | From search excerpts of the 2022 edition |
| Pocket Guide, Dec. 2017 | 292,184 of 543,061 | ROSA P copy excerpt |

Use **"about 520,000 to 660,000 operating for-hire carriers"** and, if a broader number is needed, **"1.1M to 1.4M registered as for-hire"**. Exact-match private property only: 809,929, close to FleetOwner's 790,847.

Caveats: `classdef` is self-declared and includes non-freight firms; a boat yard and towing firms appear in the sample rows. `truck_units` has placeholder values such as 599994, which is why the 1,001+ band is unusable. The MC docket filter uses only the first docket field. Reproduce with SoQL on `https://data.transportation.gov/resource/az4n-8mr2.json`, for example `SELECT count(*) WHERE status_code='A' AND classdef LIKE '%AUTHORIZED FOR HIRE%' AND docket1prefix='MC' AND docket1_status_code='A'`.

#### Market size: estimate, weak

No carrier-specific figure exists in any source found. Published TMS market reports (GM Insights, Mordor and similar) are shipper-weighted and were not used.

**Bottom-up:** census trucks times adoption times price, for fleets of 1 to 1,000 trucks.

| Band | Trucks | Low adoption | Trucks on TMS | High adoption | Trucks on TMS |
|---|---:|---:|---:|---:|---:|
| 1 | 324,630 | 0.1% | 325 | 7% | 22,724 |
| 2 to 6 | 448,964 | 0.1% | 449 | 17% | 76,324 |
| 7 to 10 | 162,242 | 5.5% | 8,923 | 33% | 53,540 |
| 11 to 20 | 247,455 | 5.5% | 13,610 | 62%, midpoint assumed | 153,422 |
| 21 to 50 | 365,113 | 26.4% | 96,390 | 91% | 332,253 |
| 51 to 100 | 301,528 | 50.8% | 153,176 | 91% | 274,390 |
| 101 to 250 | 307,116 | 61.3% | 188,262 | 91% | 279,476 |
| 251 to 500 | 210,881 | 67% | 141,290 | 91% | 191,902 |
| 501 to 1,000 | 181,723 | 67% | 121,754 | 91% | 165,368 |
| **Total** | | | **724,180** | | **1,549,398** |

Adoption mapping. Low: AlphaLoops bands, reading its misprinted "1-35" band as 1 to 5, and using its 6 to 20 rate for 7 to 10 and 11 to 20. High: InMotion, using single-truck 7% for 1 truck, under-5 17% for 2 to 6, under-10 33% for 7 to 10, and 20+ 91% for 21 and up. Neither source covers 11 to 20 cleanly, so the high case uses the midpoint of 33% and 91%.

Price assumed at $30 to $60 per truck per month. Basis: Truckbase $290 a month floor at 5 trucks is $58. Alvys $3.95 to $4.45 per load at 2 to 3 loads per truck per week (my assumption) is $34 to $58. Tracx $22 per truck is a competitor's self-report. Enterprise prices are not public, so high fleets may run differently.

| | $30 per truck | $60 per truck |
|---|---:|---:|
| Low adoption | $261M | $521M |
| High adoption | $558M | $1,116M |

Excluded: the 241 carriers over 1,000 trucks (data unusable; some run proprietary systems such as IMC Logistics), private fleets, and implementation services. These understate. Non-freight firms in the census overstate.

**Top-down:** vendor revenue, North America, includes broker customers.

| Component | Range | Basis |
|---|---:|---|
| Trimble TMS | $130M to $170M | T&L ARR $533M (Q2 2026). Less Transporeon: €190M projected for 2023, rolled at 15% for 3 years (my assumption from "mid-teens" in Q2 2026) gives €289M, about $318M at $1.10 (assumed). Leaves about $215M for TMS, Maps and Freight Marketplace, of which 60% to 80% to TMS (assumed) |
| McLeod | $50M to $118M | Third-party estimates (Selling.com, Growjo). **Not from filings**. 900+ customers from boilerplate around 2015 |
| All others | $100M to $250M | **Placeholder, no revenue data.** Alvys, Rose Rocket, PCS, CLI, Truckbase, Ascend and others |
| **Total** | **$280M to $538M** | |

**Reading.** The two ranges overlap at about $280M to $540M. The bottom-up midpoint (1.14M trucks at $45) is about $614M. Best single guess: **about $500M a year, range $300M to $800M**. For scale, the catalog holds FLEET-MAINT at $1,100M, TELEMATICS at $3,200M and FLEET-MGMT at $4,500M (2024); those were not re-checked.

**Usability: too weak to cite as sourced.** Fine as an order of magnitude ("hundreds of millions, under $1B"). Most of the width comes from adoption and from placeholder inputs. If `usa_market_size_usd_m` must be filled for a domain row, use 500 and record that it is a triangulated estimate, not an analyst figure.

## Naming check (Rule #9, against live data_objects)

Exact-name check today: none of 19 key proposed names (freight_loads, freight_trips, load_stops, fleet_trailers, partner_carriers, driver_settlements, carrier_settlements, freight_invoices, freight_tariffs, bills_of_lading, cargo_claims, motor_carrier_authorities, owner_operator_leases, rate_confirmations, load_tenders, freight_documents, freight_quotes, freight_terminals, intermodal_containers) exists. No object for loads, tenders, rate confirmations or bills of lading exists. Near-collisions to arbitrate:

| Proposed | Live name | Issue | Handling |
|---|---|---|---|
| freight_trips | vehicle_trips (TELEMATICS) | Same noun. Live row is GPS-segmented, ours is a planned revenue movement | Keep the prefix. Do not merge |
| trip_asset_assignments | fleet_assignments (FLEET-MGMT) | Live row covers vehicle to "a driver, a route, or a job" | Overlap. Need a decision on whether load-level lives in the live row |
| fleet_trailers | fleet_vehicles | Is a trailer a vehicle? | Decide; description suggests no |
| freight_invoices | customer_invoices, supplier_invoices | Seller-side freight bill. Buyer-side mirror belongs to FREIGHT-AUDIT or TMS | Keep prefix. Record the pair |
| freight_quotes | sales_quotes, quote_lines | Different lifecycle | Keep prefix |
| freight_tariffs | rate_cards (contingent labor), rate_options | Live rate_cards is labor. Do not reuse | Keep name |
| driver_settlements | pay_runs, pay_slips | Owner-operators are not employees; rule set is 49 CFR 376, not payroll | Keep. Employee drivers may also pass to payroll |
| settlement_deductions | deduction_codes (payroll) | Different context | Keep prefix |
| owner_operator_leases | lease_agreements, commercial_leases, rental_leases | Real estate and accounting leases | Scope-qualified name required |
| partner_carriers | benefit_carriers, carrier_feeds | Insurance sense of "carrier" | Do not use bare `carriers`. CARRIER-MGMT candidate is parcel, also different |
| freight_facilities | customer_sites, locations | Live customer_sites is a service location for FSM | Check for reuse in Phase A |
| intermodal_containers | container_registries, container_workloads | IT containers | Prefix required |
| ifta_quarterly_returns | tax_returns, tax_filings | Generic tax rows exist | Statute prefix, Rule #16 B |
| load_stops, freight_trips | delivery_routes (DTC), dispatch_records (FSM technician) | Different markets | Keep separate |

Vendor nouns for `data_object_aliases`: load (Order, Auftrag, Freight Order); trip (Movement, Manifest, Tour, Dispatch); settlement (Pay Stub, Statement, Pay Header); partner carrier (Partner, Subunternehmer, Third Party).

## Observations on existing catalog rows (surfaced, not changed)

- **`Trimble Transportation` solution is stale.** Its description reads "Heavy-duty trucking platform (PeopleNet, TMW, Transics): TMS, ELD/telematics, driver workflow, fleet maintenance", and it is primary on TELEMATICS and FLEET-MGMT. PeopleNet went to Platform Science in the deal that closed Feb. 2025; Transics could not be confirmed either way. Its current flagship is TMS. This candidate's solution row and that one need reconciling.
- **Platform Science is not in the catalog** as a vendor, and neither are McLeod, Alvys, Rose Rocket, Truckbase or Soloplan.
- **Trimble T&L may change owner.** A row keyed to `Trimble Inc` could become wrong within months.

## Weak spots

**Vendors that hide their docs.** McLeod returned 403 to every direct fetch, so all McLeod cells rest on search-engine snippets of its site and trade press, some of it 10 or more years old. TruckMate help is behind Trimble's learning portal. Innovative and TruckMate evidence is marketing only. Truckbase has no public help center (the hostname did not resolve) and no public API. Soloplan and LIS publish no API or schema.

**Verdicts on thin evidence.**

- **LTL and drayage entity lists** are marketing-grade only; not one schema was read.
- **FLEET-MGMT vs TMS on driver data**: all vendors hold it, but what fields they master could not be compared.
- **IFTA ownership** is a judgment call across three claimants.
- **Forwarding in the US**: one demo-form line. CargoWise was read through third-party summaries only.
- **"One product for both"**: AscendTMS's site would not render; SAP TM evidence is from learning pages and third parties; Turvo's is its home page. The sibling report should cover these.
- **Telematics vendors not selling TMS** rests on one search.
- **Soloplan and LIS for this market**: both clearly serve DACH mid-market road logistics, but the share that is own-fleet carriers vs forwarders is unknown.
- **Whether LoadMaster and PowerBroker share a database** is unresolved; ask McLeod.

**Regulatory gaps.**

- FMCSA itself blocked automated fetches, including the Pocket Guide PDFs, the CMV facts page and regulatory guidance. US regulation text comes from Cornell LII.
- BOC-3: the rule text LII shows is marked suspended, and it does not name the form.
- Not researched: GüKG (German road haulage act), ADSp 2017, Germany's own posting and tachograph enforcement, Canadian rules. `Germany acceded to e-CMR` rests on secondary sources.
- The cooling-off period surviving at the CJEU is inferred from the court's general dismissal, not from a passage read on that point.

**Numbers.**

- Dec. 2023 for-hire count comes from a dispatch-service marketing blog citing FMCSA; the PDF could not be opened.
- **All vendor self-counts are unaudited.** Alvys "3,000+ MCs" counts authorities, not customers. Soloplan 1,800 vs 1,700 customers across sources.
- AlphaLoops: self-reported survey field, a misprinted "1-35" band, and the vendor-share directory contains construction and concrete software (Command Alkon, HCSS) and duplicates. Reported shares (TMW 20.7%, McLeod 15.3%, Ascend 5.6%, TruckMate 4.4%) were not used.
- McLeod revenue is third-party guesswork. Trimble's TMS share of T&L is my allocation, not a disclosure.

**Discounted sources, not counted as independent evidence.**

| Source | Why |
|---|---|
| BeyondTrucks on Trimble sale | Competitor of Trimble TMS. Used only as pointer to Axios; bidder names (Apax, Bain) stay unverified |
| Bulk Transporter "C-SaaS" article | Sources are BulkOffice vendor owners |
| InMotion adoption survey via FleetOwner | Vendor of AscendTMS; no sample size |
| AlphaLoops | Sells carrier data; methodology partly stated |
| Numeo, Tracx, Datatruck, Truckpedia, AuthenCIO, US Tech Automations, costbench | Competitor or SEO comparisons. Only Tracx's own price is cited, flagged |
| The Wolf Pack Co on the Rose Rocket API | Sells Rose Rocket integrations |
| Max Dispatch Service | Sells dispatching and factoring. Sole source for the Dec. 2023 figure, flagged |
| eFTI.eu | Unnamed publisher tied to one e-CMR platform. Commission pages used instead |

Transport Topics' 2024 TMS piece showed "iTECH" series tagging and no sponsored label; treated as trade press, with the note that most quoted voices are vendors.

## Sources

**Primary government and legal**

- FMCSA Company Census: https://data.transportation.gov/resource/az4n-8mr2.json (metadata at https://data.transportation.gov/api/views/az4n-8mr2.json)
- FMCSA A&I registration statistics: https://ai.fmcsa.dot.gov/registrationstatistics
- Pocket Guide 2024, blocked: https://www.fmcsa.dot.gov/sites/fmcsa.dot.gov/files/2025-09/FMCSA%20Pocket%20Guide%202024-v6%20508%20.pdf ; ROSA P 2018 edition: https://rosap.ntl.bts.gov/view/dot/36537
- 49 USC: https://www.law.cornell.edu/uscode/text/49/13102 , /13902 , /14504a , /14706
- 49 CFR: https://www.law.cornell.edu/cfr/text/49/366.4 , /370.5 , /370.9 , /371.3 , /373.101 , /376.12 , /382.701 , /387.3 , /387.7 , /391.51 , /395.8 , /396.11
- IFTA: https://www.iftach.org/manuals/2024/PM/Procedures%20Manual%20-%202-27-24.pdf (excerpts through search)
- HGB: https://dejure.org/gesetze/HGB/407.html , /408.html , /453.html , /458.html ; IHK: https://www.ihk.de/nordwestfalen/branchen/verkehr-und-logistik/gueterverkehr/berufszugang-fachkundepruefung/berufszeichnungen-3564010
- CMR: https://unece.org/DAM/trans/conventn/cmr_e.pdf ; e-CMR overview: https://unece.org/sites/default/files/2023-11/Rebecca%20Huang_SPECA_Digital_Workshop_16Nov2023.pdf
- eFTI: https://transport.ec.europa.eu/transport-themes/logistics-and-multimodal-transport/efti-regulation_en , https://eur-lex.europa.eu/eli/reg/2020/1056/oj/eng
- Mobility Package: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32020R1055 , https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32020L1057 , https://transport.ec.europa.eu/transport-modes/road/mobility-package-i/posting-rules/questions-and-answers-posting-drivers-under-directive-eu-20201057_en , https://transport.ec.europa.eu/transport-modes/road/social-provisions/driving-time-and-rest-periods_en
- CJEU press release: https://curia.europa.eu/jcms/upload/docs/application/pdf/2024-10/cp240173en.pdf

**Vendor docs (X cells)**

- Alvys: https://docs.alvys.com/_llms/en/api-documentation/v1-0/api-reference.txt , https://docs.alvys.com/_llms/en/help-center/guides.txt , https://docs.alvys.com/en/help/loads-trips/dispatching-as-a-broker , https://docs.alvys.com/en/help/assets-fleet/safety-and-maintenance-overview
- Trimble TMW.Suite: https://developer.trimble.com/docs/tmwsuite/ , /tools/api/odata/v1/ , /tools/api/cloudhub/v1/ , /tools/api/ordercreate/v1/
- Rose Rocket: https://roserocket.readme.io/docs , /docs/order.md , /docs/manifest-1.md , /docs/assets.md , /docs/pay-stubs.md , /docs/bills.md , /docs/quotes.md , /docs/partners.md , /docs/fuel-zones-and-tariffs.md

**Vendor marketing (m cells, all vendor-authored)**

- McLeod, via search snippets: https://www.mcleodsoftware.com/who-we-serve/truckload-carriers/ , /who-we-serve/ltl-carriers/ , /who-we-serve/private-fleets/ , /solutions/safety-truckload-carriers/ , /billing-and-settlements-automation-truckload-carriers/ , /solutions/driver-management-software/ , /why-mcleod/resources/press-releases/mcleod-software-expands-smc3-partnership-for-optimized-ltl-management/ ; 2024 release: https://www.supplychaindive.com/press-release/20240805-mcleod-software-enhances-broker-and-carrier-relationships-and-communication/
- Trimble: https://transportation.trimble.com/products/truckmate , https://transportation.trimble.com/products/tmw-suite , https://transportation.trimble.com/en/solutions/transportation-management/innovative-tms , https://transportationinfo.trimble.com/brochure/tmw-suite-tms/core-solution , https://transportationinfo.trimble.com/brochure/truckmate-tms/core-solution
- Alvys: https://alvys.com/hybrid-tms , https://alvys.com/free-trial , https://alvys.com/blog/alvys-raises-40m-series-b-to-drive-ai-powered-efficiency-and-roi-for-carriers-and-brokers
- Rose Rocket: https://www.roserocket.com/ , /tms , /pricing
- Truckbase: https://www.truckbase.com/ , /trucking-dispatch-software , /trucking-software-pricing , /eld-truck-tracking-software , /trucking-software-reviews
- Soloplan: https://www.soloplan.de/ , /transportsoftware/ , /fuhrparkmanagement-software/ , /speditionssoftware/ ; https://www.soloplan.com/industry/partial-and-full-loads/ , /industry/bulk-cargo/ , /industry/container-transports/ , /sea-freight-software/
- LIS: https://www.lis.eu/en/ , /en/software/winsped/winsped-all-modules/ , /en/software/winsped/full-truck-load/ , /en/software/winsped/service-provider/ , /en/software/winsped/order-entry/ , /en/software/winsped/freight-calculation/
- CLI: https://carrierlogistics.com/ ; PCS: https://pcssoft.com/ ; Turvo: https://turvo.com/ ; DAT: https://www.dat.com/resources/what-is-a-broker-tms ; SAP: https://learning.sap.com/learning-journeys/exploring-sap-s-4hana-supply-chain-for-transportation-management/understanding-capabilities-of-sap-transportation-management_cf48b4af-36de-411f-b5f2-9e3073fb8a3a
- Integrations: https://kb.samsara.com/hc/en-us/articles/360054407991-Integrate-with-Trimble-Innovative-TMS , https://gomotive.com/blog/motive-mcleod-integration/

**Trade press**

- Trimble sale: https://www.freightwaves.com/news/trimble-shares-get-upward-bump-on-report-it-may-sell-transportation-unit , https://www.ttnews.com/articles/trimble-evaluating-sale-tech , https://www.freightwaves.com/news/trimble-sees-freight-green-shoots-as-transportation-revenue-rises-5 ; CCJ, 403 to fetch: https://www.ccjdigital.com/business/mergers-acquisitions/article/15832326/trimble-weighs-sale-of-transportation-unit-following-buyer-interest
- Transporeon: https://www.sec.gov/Archives/edgar/data/864749/000119312522302877/d375668dex991.htm
- Platform Science: https://www.fleetequipmentmag.com/platform-science-acquires-trimble-global-telematics/
- WiseTech and Envase: https://www.dcvelocity.com/articles/56427-wisetech-buys-new-hampshire-drayage-and-trucking-visibility-software-firm-for-230-million ; PortPro: https://www.freightwaves.com/news/portpro-introduces-new-drayage-tms
- McLeod product history: https://www.fleetowner.com/operations/article/21660426/mcleod-broadens-carrier-and-brokerage-software , https://www.freightwaves.com/news/technology-mcleod-announces-new-powerbroker-capabilities
- TMS by segment: https://ttnews.com/articles/tms-software-trucking ; spreadsheets to TMS: https://ttnews.com/articles/small-growing-carriers-make-leap-spreadsheets-tms-software
- Carrier composition: https://www.fleetowner.com/research/truck-by-numbers/media-gallery/55338098/trucking-by-the-numbers-2025-overview-carrier-composition-costs-and-impact
- McLeod boilerplate: https://builtin.com/company/mcleod-software ; WinSped fleet and damage modules: https://www.verkehrsrundschau.de/nachrichten/nfz-fuhrpark/neues-flottenmanagement-system-fuer-winsped-2991662 , https://www.verkehrsrundschau.de/nachrichten/nfz-fuhrpark/schadensverwaltung-fuer-winsped-3002063

**Discounted (see table above)**

- https://www.beyondtrucks.com/is-trimble-selling-its-tms-business , https://www.bulktransporter.com/technology/article/55390667/potential-trimble-sale-signals-c-saas-revolution , https://www.fleetowner.com/technology/article/21701771/survey-tms-becoming-must-have-technology-in-the-freight-market , https://runalphaloops.com/research/tms-landscape , https://runalphaloops.com/technology/tms , https://maxdispatchservice.com/how-many-trucking-companies-in-the-us/ , https://www.thewolfpackco.com/blog/rose-rocket-api-what-you-can-build/ , https://sacra.com/chat/h/083534b3-e125-4797-ad10-58107aedb812/ , https://www.tracxtms.com/tracx-vs-rose-rocket , https://growjo.com/company/McLeod_Software , https://selling.com/company/mcleod-software/2603735
