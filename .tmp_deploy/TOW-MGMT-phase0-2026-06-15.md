# TOW-MGMT Phase 0 — Vendor Surface

Market: towing, vehicle recovery, and impound/storage-lot management software (US-centric). Research date 2026-06-15. Sources: vendor sites (towbook.com, vts-systems.com, traxero.com/autura.com, omadi.com, add123.com), state statutes (TX TDLR VSF rules, FL 713.78, GA AMVA, MN 168B, ID T49C18, MO 304.156), DPPA (18 USC 2721), UCC Art. 9, FDCPA.

Note on consolidation: TRAXERO and Autura merged (Oct 2024); Dispatch Anywhere (ex-Beacon), TOPS, Omadi, InTow, and Tracker are all now Autura/TRAXERO brands. TowLien / lien-mail is TRAXERO's in-suite compliance engine. Treated below as one flagship suite (column V2) to avoid double-counting; ADD123 is the independent pure-play lien/title compliance specialist (column V5).

## Flagship vendors
| Vendor | URL | Specialist in | Why included |
|---|---|---|---|
| V1 Towbook | towbook.com | Cloud dispatch + impound + PPI for small/mid tow operators; deepest motor-club integration | Market-share leader among independents; pure-play towing |
| V2 TRAXERO / Autura (Dispatch Anywhere, TOPS, Omadi, InTow, Tracker, TowLien) | traxero.com / autura.com | Full-suite towing + impound-yard monetization + in-suite lien/auction (TowLien) | Largest consolidator; covers dispatch, impound, lien, auction in one stack |
| V3 VTS Systems (Omadi-adjacent) | vts-systems.com | Storage-lot / impound-yard management, multi-state MVR authentication, condition reports | Impound-lot-first design; strongest yard/storage surface |
| V4 ProTow (PTOM) | protow.com | Cloud towing + recovery + impound for independents | Independent pure-play; confirms core surface beyond the consolidator |
| V5 Auto Data Direct (ADD123 / DirectPost-Office) | add123.com | Lien/title/impound NOTICE compliance: DMV123 owner lookup, certified lien letters, NMVTIS, ELT | The required impound/lien-notification compliance specialist; not a dispatch tool |

## Surface matrix
V1=Towbook, V2=TRAXERO/Autura, V3=VTS, V4=ProTow, V5=ADD123. X = mastered/first-class.

| Entity | Category | V1 | V2 | V3 | V4 | V5 | Classification | Proposed module |
|---|---|---|---|---|---|---|---|---|
| tow_calls | Master | X | X | X | X |  | Core | TOW-DISPATCH |
| tow_jobs | Master | X | X | X | X |  | Core | TOW-DISPATCH |
| tow_trucks | Master | X | X | X | X |  | Core | TOW-DISPATCH |
| drivers | Master | X | X | X | X |  | Core | TOW-DISPATCH |
| job_status_transitions | Junction | X | X | X | X |  | Core | TOW-DISPATCH |
| rotation_list_assignments | Master/Config |  | X | X | X |  | Common | TOW-DISPATCH |
| dispatch_messages | Engagement | X | X | X | X |  | Core | TOW-DISPATCH |
| gps_location_pings | Engagement/Audit | X | X | X | X |  | Core | TOW-DISPATCH |
| motor_club_accounts | Master | X | X |  | X |  | Common | TOW-BILLING |
| customer_accounts | Master | X | X | X | X |  | Core | TOW-BILLING |
| impound_lot_vehicles | Master | X | X | X | X | X | Core | TOW-IMPOUND |
| storage_records | Master | X | X | X | X |  | Core | TOW-IMPOUND |
| storage_day_logs | Junction | X | X | X | X |  | Core | TOW-IMPOUND |
| vehicle_condition_reports | Engagement/Audit | X | X | X | X |  | Core | TOW-IMPOUND |
| digital_photos | Engagement | X | X | X | X |  | Core | TOW-IMPOUND |
| vehicle_releases | Master | X | X | X | X | X | Core | TOW-IMPOUND |
| auction_disposals | Master |  | X | X | X | X | Core | TOW-IMPOUND |
| ppi_consent_records | Engagement/Compliance | X | X |  | X |  | Common | TOW-IMPOUND |
| lien_notices | Master/Compliance | X | X | X | X | X | Core / Compliance | TOW-LIEN |
| owner_lienholder_lookups | Audit/Compliance |  | X | X |  | X | Compliance | TOW-LIEN |
| statutory_notice_timelines | Compliance/Config |  | X | X |  | X | Compliance | TOW-LIEN |
| notice_templates | Config | X | X | X | X | X | Core | TOW-LIEN |
| certified_mail_records | Audit/Compliance |  | X | X |  | X | Compliance | TOW-LIEN |
| title_transfer_records | Master/Compliance |  | X | X |  | X | Compliance | TOW-LIEN |
| police_tow_reports | Audit/Compliance |  | X |  | X |  | Common | TOW-DISPATCH |
| invoices | Master | X | X | X | X |  | Core | TOW-BILLING |
| payments | Master | X | X | X | X |  | Core | TOW-BILLING |
| rate_plans | Config | X | X | X | X |  | Core | TOW-BILLING |
| storage_rate_schedules | Config/Compliance | X | X | X | X | X | Core / Compliance | TOW-BILLING |
| driver_commissions | Master | X | X |  | X |  | Common | TOW-BILLING |

## Compliance entities (non-optional)
These load regardless of vendor presence because vendors bury compliance internals.

| Entity | Regulation | Proposed module |
|---|---|---|
| lien_notices | State abandoned/lien-vehicle statutes (e.g. FL 713.78, GA AMVA, TX VSF) | TOW-LIEN |
| statutory_notice_timelines | State notice-to-owner/lienholder deadlines (7/14/15-day rules) | TOW-LIEN |
| certified_mail_records | State certified-mail / return-receipt service-of-notice rules | TOW-LIEN |
| owner_lienholder_lookups | DPPA (18 USC 2721) permissible-use logging | TOW-LIEN |
| dppa_access_logs | DPPA permissible-use audit trail | TOW-LIEN |
| title_transfer_records | State title/abandoned-vehicle disposal + NMVTIS | TOW-LIEN |
| auction_disposals | State public-sale / disposal statutes | TOW-IMPOUND |
| ppi_consent_records | State PPI signage + authorization rules | TOW-IMPOUND |
| ppi_signage_records | State private-property-impound signage statutes | TOW-IMPOUND |
| police_tow_reports | State law-enforcement / rotation-tow reporting rules | TOW-DISPATCH |
| storage_rate_schedules | State-regulated max tow/storage rate caps (e.g. TX TDLR) | TOW-BILLING |
| repossession_assignments | UCC Art. 9 (§9-609 no-breach-of-peace) + FDCPA + state repo licensing | (out-of-scope; separate REPO domain) |

## Regulation rows the catalog likely needs
Catalog check (2026-06-15): none of these exist yet (`regulations` holds GDPR/DORA/COPPA-style rows only).

| Regulation | Scope | Notes |
|---|---|---|
| State Abandoned/Unauthorized Vehicle & Tow-Lien Statutes | Per-state; notice timelines, sale/disposal | Many distinct statutes; model as a family or per-state rows. FL 713.78, GA AMVA, TX Ch.2303/VSF, MN 168B, MO 304.156, ID T49C18. |
| Driver's Privacy Protection Act (DPPA) | Federal; DMV owner-lookup permissible uses | Towed-vehicle-notice is an enumerated permissible use; logging required. |
| State PPI / Private-Property-Impound Rules | Per-state signage + authorization | Governs ppi_consent_records, ppi_signage_records. |
| State Max Tow/Storage Rate Regulations | Per-state rate caps (e.g. TX TDLR) | Governs storage_rate_schedules; constrains billing, not just config. |
| Law-Enforcement Rotation-Tow Reporting Rules | Per-state/locality police-tow programs | Governs police_tow_reports, rotation_list_assignments. |
| NMVTIS Reporting | Federal vehicle-history/junk-salvage reporting | Touched on disposal/auction. |
| UCC Article 9 | All 50 states; secured-party self-help repossession | Repo-adjacent; only if REPO domain is in scope. |
| FDCPA | Federal; debt-collection conduct | Repo-adjacent; repo agents often qualify as debt collectors. |

## Modularization hypothesis
Four modules inside TOW-MGMT, each with >=1 master (satisfies Rule #14; >=3 capabilities → >=2 modules). **TOW-DISPATCH** scopes inbound calls, jobs, trucks, drivers, rotation, GPS, and police-tow reporting (recovery operations). **TOW-IMPOUND** scopes impounded-vehicle inventory, storage records/day-logs, condition reports/photos, releases, auction/disposal, and PPI consent/signage (yard operations). **TOW-LIEN** scopes statutory owner/lienholder notice: lien notices, owner lookups, DPPA logs, notice timelines, certified-mail and title-transfer records (the regulatory core ADD123/TowLien sell standalone). **TOW-BILLING** scopes invoices, payments, rate plans, state-regulated storage-rate schedules, motor-club billing, and commissions.

## Market-shape questions for the analyst
- **Impound-lot: module inside TOW-MGMT vs separate DOMAIN?** Evidence favors **module**. Towbook, TRAXERO/Autura (TOPS, Dispatch Anywhere), and ProTow all bundle dispatch + impound + PPI in one product; impound is "powered by the same tow_job" (a towed vehicle becomes an impound_lot_vehicle). VTS leans impound-first but still ships dispatch. No mainstream **pure-play impound-only** vendor exists with no towing surface, so impound is not a standalone market. Recommendation: TOW-IMPOUND as a module. (Decision is a `b2`.)
- **Lien/compliance: module vs its own domain?** ADD123 and TowLien sell lien/notice/title compliance **standalone** (ADD123 has no dispatch product at all), which argues a lien/title-compliance slice could stand alone. But it is always consumed by tow operators and shares impound_lot_vehicles. Recommendation: keep as **TOW-LIEN module**, not a separate domain.
- **Repossession: in or out of scope?** **Out — separate REPO domain.** Repo runs on distinct platforms (Recovery Database Network / Clearplan / Cleardata, MVTRAC, MVConnect) sold to lenders/forwarders/repo agents, under UCC Art. 9 + FDCPA + state repo licensing, not abandoned-vehicle statutes. No flagship towing vendor masters repossession_assignments. Skid-tow overlap is operational, not schema overlap.
- **How many modules?** Four (DISPATCH, IMPOUND, LIEN, BILLING). Could collapse to three by folding LIEN into IMPOUND, but the standalone ADD123/TowLien market and the regulatory weight justify a dedicated compliance module.
- **What does TOW-MGMT master vs consume?** Masters: tow_calls, tow_jobs, tow_trucks, drivers, impound_lot_vehicles, storage_records, lien_notices, vehicle_releases, auction_disposals, invoices, rate_plans. Likely **consumes**: customer/company accounts from **CRM**; motor_club_accounts as a CRM/partner reference; GL/AR postings from **FIN**; vehicle fleet maintenance/telematics from **FLEET** (Omadi/Tracker overlap fleet but tow_trucks are operationally distinct — master locally, reference FLEET asset). Owner/lienholder identity comes from external DMV (DPPA-gated), not a CRM master.
- **storage_rate_schedules: config or compliance?** Both — they are tenant config but capped by state max-rate regulation, so treat as `master/config` with a regulation link (some states make the cap binding).

Counts: Core entities 15; Common 5; Compliance entities (non-optional list) 12 (several overlap Core, e.g. lien_notices, storage_rate_schedules, auction_disposals). Specialist (1-vendor) 0 in the trimmed surface. Regulation rows needed: ~8 families, none currently in catalog.
