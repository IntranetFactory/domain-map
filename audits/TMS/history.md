# TMS audit history

## 2026-11-03: Phase 0 classification and market-shape scoping

### Summary

The code TMS was attached to Translation Management System in the queue, and the FLEET-MGMT audit's Transportation Management System mention had bumped that row instead of creating its own. The user asked which market should hold the code, whichever is larger for mid-sized organizations, and approved assigning it to transportation. Translation is now TRANSLATION-MGMT, and the helper `append_missing_domain.ts` refuses a matching code with a different name.

The user greenlit Phase 0 and then the `state.yaml` and q-file. Per Rule #21, nothing was written to the catalog. A live `/domains` check for TMS, TRUCKING-TMS, and TRANSLATION-MGMT returned no rows.

### Phase 0

Saved to `audits/TMS/TMS-phase0-2026-11-02.md`. Matrix vendors: Oracle, Manhattan, Infios, Shipwell, Transporeon, Freightview. Verdicts: passes as `established_market`; sibling of TRUCKING-TMS, not an umbrella; freight procurement and dock appointments are modules; freight audit is both a module and its own market; parcel, visibility, yard, customs, and brokerage stay out; `transportation_orders` is mastered here because the catalog has no general sales order.

### Market-size correction

The market table given to the user during the code decision used publisher figures ($13.9B to $18.7B global, implied SME $4.4B to $6B). Those include services, 3PLs, and forwarders. Berg Insight, read through secondary coverage, gives about EUR 1.8B for North America in 2024, which is about $1.7B for the US on all sides and about $1.2B shipper side, with the 30% carrier split a judgment. The user was told this plainly. Publisher against publisher, transport is still about six times translation ($15B against $2.4B) and has a named mid-market tier, so TMS stays with transport, but no specialist figure exists for translation, so the true gap is unknown. The code can still change until a domain row is loaded.

### Cross-report reconciliation with TRUCKING-TMS

See `audits/TRUCKING-TMS/history.md`. Shared names and masters are asked once, in `q-TRUCKING-TMS.md`, and tracked here as a `b1b`.

### Open decisions

See `q-TMS.md` and `state.yaml`. Nothing is approved until the user answers and renames the file to `a-TMS.md`.

## 2026-11-03: Built (new domain, established_market, id 194)

**Decisions (a-TMS.md, all as recommended).** q1 yes, add as established market. q2 a, five modules. q3 a, new freight_bid_events master. q4 a, TMS masters invoices through approval and FREIGHT-AUDIT stays a candidate. q5 yes, parcel out. q6 yes, visibility separate. q7 a, split at the dock door. q8 yes, brokerage out. q9 yes, customs out. q10 yes, master transportation_orders. q11 yes, freight_carriers separate from suppliers. q12 a, hazmat papers their own record. q13 a, sanitary records here. q14 a, $1,200M. q15 b, required set plus CountEmissions. q16 yes, research lower-evidence records later. q17 yes, queue three candidates. The user asked for these questions to be put one by one in chat, then chose "Apply everything".

**Loaded (all record_status='new'):**
- Phase A: domain 194; 10 capabilities; 5 full modules (TMS-SHIPMENTS, TMS-CARRIER-RATES, TMS-PROCUREMENT, TMS-SETTLEMENT, TMS-DOCK); 13 primary solutions; 9 new vendors; 5 domain aliases.
- Phase B: 38 masters, lifecycle on 12 workflow masters, 23 trigger events, relationships including 9 relationships to `users`, 29 aliases, 19 intra-domain handoffs, and 13 cross-domain handoffs (10 outbound, 3 inbound from S2P, OMS, and AP-AUTO), tagged to custom processes where a module masters the payload.
- Phase C: Logistics owner; Procurement and Accounts Payable contributors; Warehouse Operations consumer; 3 capability-level owners.
- Phase S: domain skill tms; tools and domain_module_tools.
- Phase E: 5 personas, 6 custom processes with RACI.
- Regulations: 6 tagged, from the seed of 20 shared with TRUCKING-TMS.

**Judgment calls in the load, not vendor findings.** crud_percentage 70 and the business_logic text are my estimates. min_org_size is 20 s <500, the smallest buyer of any tier, per the Rule #8 definition; a buyer of the full surface would be 30 m <2500. cost_band $$$ follows Phase 0.

**Corrections made during the load.** The q-file said "optional module" for Dock. No such catalog concept exists: every module deploys on its own, and is_install_optional applies to records. Process tags first written as APQC codes were re-pointed to the custom processes that realize each payload, as B9d requires; purchase_orders and order_allocations stay on 4.4.4 and payment_runs on 4.4.4.4 because no module masters those payloads yet. Custom processes first loaded without process_key, which collapsed RACI grouping (R4), now carry one.

**Health (domain_health.ts, this pass).** Fails: A4 and M8 (catalog copy, awaiting the q-file answer), B5 (neighbors have no modules, B1B-NEIGHBOR-MODULES). Warns: S3, B7, B10, B11, and E6 R6 on neighbors' events with blank to_state, which are other domains' rows. B7 and B11: acted-on masters got relationships to `users` and non-obvious masters got aliases; the rest are self-explanatory or record-grain. b3 items were approved for later and were not loaded. Blueprint emission was not run.

**Not done here.** Queue and protocol changes are recorded in audits/_missing-domains.md and the skill changelog.
