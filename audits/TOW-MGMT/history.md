# TOW-MGMT — audit history

## 2026-06-15 — Phase 0 classification + market-shape scoping

### Summary

User asked whether "Auto Towing and Impound Lot Trackers" is a domain. Applied the point-solution-market test (Rule #2): the towing / vehicle-recovery / impound-lot management software market passes cleanly. Independent vendors whose flagship product is this: Towbook, TRAXERO/Autura (Dispatch Anywhere, TOPS, Omadi, InTow, Tracker), VTS Systems, ProTow, and Auto Data Direct / ADD123 (the pure-play lien/title/notice compliance specialist).

Classified as ONE domain `TOW-MGMT` "Towing & Recovery Management" with impound-lot management as a module, not two domains. Confirmed nothing tow/impound exists in the catalog; nearest neighbors are FLEET-MGMT (147) / TELEMATICS (148) / FLEET-MAINT (149), FSM (31), EAM (53), all distinct markets (manage your own fleet / dispatch techs to customers / fixed plant) with different buyers than tow operators, repo companies, and municipal / police impound lots.

User greenlit building the market shape up to a q-file. Per the Rule #21 research carve-out, NO net-new structure was written to the live platform; this pass produced the Phase 0 vendor surface and the market-shape q-file only.

### Phase 0 — vendor surface

Saved to `.tmp_deploy/TOW-MGMT-phase0-2026-06-15.md`. 5 flagship vendors; 4-module hypothesis (TOW-DISPATCH, TOW-IMPOUND, TOW-LIEN, TOW-BILLING). Core 15 / Common 5 / Compliance 12 entities; ~8 regulation families needed, none currently in the catalog. Verdicts: impound = module (not a separate domain); repossession = out of scope (separate future REPO domain); lien / title compliance = module (TOW-LIEN), despite ADD123 and TRAXERO's TowLien selling it standalone.

### Open decisions

6 market-shape `b2` decisions gate the build (impound module-vs-domain [gate], lien module count, repossession scope, customer master-vs-consume CRM boundary, tow-truck master-vs-consume FLEET boundary, regulation scope), 1 upstream blocker (regulations seed), 1 optional new-domain research candidate (REPO). See `q-TOW-MGMT.md` / `state.yaml`.
