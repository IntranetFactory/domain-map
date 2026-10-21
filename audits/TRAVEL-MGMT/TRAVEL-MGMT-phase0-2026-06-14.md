# Phase 0 Vendor-Surface Research: TRAVEL-MGMT (Corporate Travel Management)

Date: 2026-06-14
Status: RESEARCH ONLY (no catalog writes, no commit, no load)
Analyst pass: Phase 0 triage for the `domain_map` catalog

## 0. Live catalog overlap check (executed)

Query run against the live catalog (read-only):

```
semantius call crud postgrestRequest '{"method":"GET","path":"/domains?or=(domain_code.eq.SPEND-MGMT,domain_code.eq.EXPENSE,domain_code.eq.HCM,domain_name.ilike.*travel*,domain_name.ilike.*expense*)&select=domain_code,domain_name,description,crud_percentage,min_org_size,cost_band"}'
```

Result: three existing domains returned, no standalone travel domain present.

| domain_code | domain_name | crud_% | min_org_size | cost_band | Relevant note |
|---|---|---|---|---|---|
| EXPENSE | Expense Management | 90 | 20 s <500 | $$$ | Description explicitly includes "travel-booking integration" but travel is treated as an integration point, not a first-class surface. |
| SPEND-MGMT | Corporate Spend Management | 70 | 20 s <500 | $ | Card-authorization / pre-spend-approval anchored. Explicitly scoped as distinct from EXPENSE, S2P, AP-AUTO. No travel mention. |
| HCM | Human Capital Management | 92 | 20 s <500 | $$$ | Worker system of record. Adjacent only as the source of traveler-identity data. Not a travel surface. |

Key finding: corporate travel booking/sourcing/duty-of-care is NOT currently modeled anywhere in the catalog. EXPENSE references travel only as an upstream feed (the trip generates receipts/charges that land in EXPENSE). The booking, sourcing, itinerary, and traveler-safety surface has no home.

## 1. Flagship vendors

Vendors whose flagship product is corporate travel management (booking + program management), not expense-first or card-first tools.

| Vendor | One-line positioning | Ownership (2026) |
|---|---|---|
| Navan (formerly TripActions) | All-in-one corporate travel + expense "super app"; modern self-booking with embedded T&E and AI assistant (Ava). | Public. IPO on Nasdaq (ticker NAVN) Oct 30, 2025 at ~$6.2B valuation; rebranded from TripActions Feb 2023. |
| SAP Concur (Concur Travel) | Most widely deployed enterprise T&E suite; deep ERP/SAP alignment, global compliance, 150+ countries. | Subsidiary of SAP SE (acquired 2014). |
| Spotnana | "Travel-as-a-Service" API-first infrastructure platform; aggregates GDS + NDC + direct supplier content; powers embedded travel for other platforms (Brex, Expensify, Center). | Independent, venture-backed (Series B+). Center later acquired by American Express. |
| American Express Global Business Travel (Amex GBT) | Largest managed-travel TMC; proprietary tooling Egencia (online), Neo, and Select integration layer. | Public (NYSE: GBTG). Acquired Egencia (from Expedia, 2021) and completed CWT acquisition Sep 2, 2025 (~$540M). |
| BCD Travel | Global TMC; managed travel programs, duty-of-care, and program optimization for large multinationals. | Privately held (BCD Group, Netherlands). |

M&A / rebrand notes:
- TripActions rebranded to Navan in Feb 2023; Navan went public Oct 2025. "TripActions" and "Navan" are the same company; do not list both as independent vendors.
- Egencia is no longer independent: acquired by Amex GBT in 2021. It is now a product line inside Amex GBT, not a separate vendor.
- CWT was acquired by Amex GBT, completed Sep 2, 2025 (~$540M). CWT is no longer an independent vendor as of that date.
- Net effect: of the candidate's eight named vendors, the independent count has shrunk through consolidation (Navan = TripActions; Egencia and CWT both absorbed into Amex GBT). AmTrav, Spotnana, BCD, SAP Concur, and Amex GBT remain distinct.

## 2. Entity x vendor surface matrix

Core data objects of a corporate travel management platform, classified by how universally vendors expose them:
- Core: present in essentially every flagship product; defines the market.
- Common: present in most, but a vendor can omit it and still be a travel platform.
- Specialist: present in mature/enterprise products or as a differentiator.

| Entity / data object | Navan | SAP Concur | Spotnana | Amex GBT | BCD | Classification |
|---|---|---|---|---|---|---|
| Trips (the journey container) | yes | yes | yes | yes | yes | Core |
| Itineraries (segments: air/hotel/rail/car) | yes | yes | yes | yes | yes | Core |
| Bookings / reservations (PNR-level) | yes | yes | yes | yes | yes | Core |
| Travelers / traveler profiles (prefs, loyalty, docs) | yes | yes | yes | yes | yes | Core |
| Travel policies (policy-aware shopping rules) | yes | yes | yes | yes | yes | Core |
| Trip approvals (pre-trip authorization workflow) | yes | yes | yes | yes | yes | Common |
| Fare / hotel inventory (air, hotel, rail sourcing; GDS/NDC) | yes | yes | yes | yes | yes | Core |
| Duty-of-care / traveler-safety alerts (traveler tracking, risk) | yes | yes | partial (infra) | yes | yes | Common |
| Unused-ticket / credit management | yes | yes | yes | yes | yes | Common |
| Negotiated-rate / supplier-contract management | partial | yes | yes | yes | yes | Specialist |
| Travel spend / program analytics & reporting | yes | yes | yes | yes | yes | Common |
| Expense / card integration (T&E bundle) | yes (native) | yes (native) | via partner | via Select | via partner | Common (boundary object, see section 6) |

Core spine (the entities that define the market and have no home elsewhere in the catalog): trips, itineraries, bookings, traveler profiles, travel policies, fare/hotel inventory.

## 3. Required compliance entities

| Regime | Applies? | Why / surface impact |
|---|---|---|
| Duty of care / travel risk management | Yes | Legal and contractual obligation to locate, alert, and assist travelers. Drives traveler-tracking, risk-alert, and emergency-contact entities. A defining, market-specific compliance surface not present in EXPENSE or SPEND-MGMT. |
| GDPR / traveler personal data | Yes | Traveler profiles hold passport, visa, loyalty, dietary, and location data (special-category and cross-border). Consent, retention, and processing controls are a hard requirement, especially for EU travelers and off-channel "leakage" bookings. |
| IATA NDC | Yes (industry standard, not a legal regime) | NDC is the IATA XML standard governing how airline content reaches booking tools. It shapes the fare/inventory and ancillary entities and affects duty-of-care data completeness (NDC feeds can create traveler-tracking blind spots vs legacy GDS). |
| PCI DSS | Conditional | Applies where the platform stores card data for booking; many platforms tokenize or defer to a card/payment partner, so this is often inherited rather than owned. |

Net: duty-of-care and GDPR traveler-data are genuine, market-defining compliance entities. IATA NDC is a standards/interoperability constraint. None of these is satisfied by the existing EXPENSE or SPEND-MGMT domains.

## 4. Modularization hypothesis (if promoted)

If TRAVEL-MGMT is promoted, the natural module decomposition:

- Module A: Booking & Sourcing
  - Entities: trips, itineraries, bookings/reservations, fare/hotel/rail inventory, search/shop sessions, ancillaries (NDC), unused-ticket credits.
- Module B: Traveler & Profile
  - Entities: travelers, traveler profiles, loyalty programs, travel documents (passport/visa), preferences, emergency contacts.
- Module C: Policy & Approvals
  - Entities: travel policies, policy rules, trip approvals/authorizations, approval workflows, exceptions.
- Module D: Duty of Care & Risk
  - Entities: traveler-location tracking, risk alerts, destination intelligence, incident/assistance cases.
- Module E (boundary, optional): Program Analytics & Spend
  - Entities: travel spend records, savings/leakage reports, supplier negotiated rates. This module is the seam where TRAVEL-MGMT hands off to EXPENSE/SPEND-MGMT rather than duplicating them.

## 5. Point-solution-market test

Question: are there at least 3 INDEPENDENT vendors whose FLAGSHIP product is corporate travel management?

Answer: YES.

Reasoning: after accounting for consolidation, at least four independent companies still field a flagship corporate-travel product:
1. Navan (public, NAVN) - flagship is travel + T&E; travel is the original and core surface.
2. SAP Concur (Concur Travel) - flagship enterprise T&E with travel booking as a first-class pillar.
3. Spotnana - flagship is travel-as-a-service infrastructure; 100% of the product is travel.
4. Amex GBT - flagship is managed corporate travel (largest TMC), with proprietary Egencia/Neo tooling.
(BCD Travel and AmTrav add further independents.)

Even discounting the consolidated names (Egencia and CWT folded into Amex GBT; TripActions = Navan), the independent-vendor count clears the threshold of 3 comfortably. The presence of a pure-play infrastructure vendor (Spotnana) whose entire business is this market is especially strong evidence that the entity surface is real and standalone, not a feature of a broader suite.

## 6. Overlap analysis: distinct market vs fold into EXPENSE / SPEND-MGMT

The hard question is the T&E bundle. Navan and SAP Concur sell travel + expense together, which blurs the line, and EXPENSE's catalog description already says "travel-booking integration."

Arguments that it is a DISTINCT market:
- The core entities (trips, itineraries, bookings, fare/hotel inventory, traveler profiles, travel policies) do not exist in EXPENSE or SPEND-MGMT and are not reducible to a receipt or a card charge. EXPENSE consumes the OUTPUT of a trip (the charges); it does not model the booking, the inventory, or the journey.
- Duty-of-care and traveler-safety is a legal obligation with its own entity surface (traveler tracking, risk alerts) that has no analog in EXPENSE or SPEND-MGMT.
- IATA NDC / GDS sourcing and fare inventory is a domain-specific supply-side concern; expense and spend tools have no inventory surface at all.
- A pure-play infrastructure vendor exists (Spotnana) whose entire product is travel and contains zero expense functionality. You cannot fold a market into EXPENSE when a flagship vendor in that market has no expense product.
- The largest providers (Amex GBT, BCD, CWT-now-GBT) are travel-management companies with no expense-first identity at all.

Arguments for folding (and why they fail):
- "Navan and Concur bundle T&E, so it is one market." This is suite bundling, not market identity. The same companies bundle a card too; that does not make travel part of SPEND-MGMT. Bundling is a go-to-market choice; the entity surfaces remain distinct, and the catalog already separates EXPENSE from SPEND-MGMT for exactly this reason (post-hoc reimbursement vs real-time card authorization). Travel is a third distinct surface (pre-trip sourcing + booking + duty-of-care).

Conclusion: T&E is a bundle of two-to-three adjacent-but-distinct domains (Travel, Expense, and increasingly Spend/Card), not a single market. The correct catalog shape is a separate TRAVEL-MGMT domain that is adjacent to EXPENSE and SPEND-MGMT, with the analytics/spend seam (Module E) explicitly handed off rather than duplicated. The catalog already models EXPENSE and SPEND-MGMT as distinct despite heavy vendor overlap; TRAVEL-MGMT is the same pattern.

## 7. Triage recommendation

VERDICT: `promote-as-domain`

Rationale: Corporate travel management is a distinct enterprise-software market with a core entity surface (trips, itineraries, bookings, fare/hotel inventory, traveler profiles, travel policies, duty-of-care alerts) that exists in no current catalog domain and is not reducible to EXPENSE (which only consumes the resulting charges) or SPEND-MGMT (card authorization). The point-solution test passes decisively: at least four independent vendors field a flagship travel product, including a pure-play infrastructure vendor (Spotnana) with no expense functionality at all, plus the largest managed-travel TMCs (Amex GBT, BCD). The T&E bundling seen at Navan and SAP Concur is suite packaging, not market identity, exactly as the catalog already distinguishes EXPENSE from SPEND-MGMT despite the same vendors bundling both. The duty-of-care / GDPR traveler-data / IATA NDC compliance surface is market-defining and has no home elsewhere.

Proposed promotion metadata:

- domain_code: `TRAVEL-MGMT`
- domains.description (one line): "Corporate travel program management: policy-aware air/hotel/rail booking, traveler profiles, trip approvals, GDS/NDC sourcing, itinerary management, and traveler duty-of-care, distinct from EXPENSE (post-trip reimbursement of the resulting charges) and SPEND-MGMT (card authorization)."

Business-metadata estimates:

| Field | Estimate | Basis |
|---|---|---|
| crud_percentage | 65 | Heavy transactional CRUD on trips/bookings/profiles, but a meaningful share is sourcing/search, policy evaluation, and duty-of-care monitoring that is not pure CRUD. Lower than EXPENSE (90). |
| business_logic | high | Policy-aware shopping, fare rules, approval routing, NDC/GDS arbitration, and risk alerting are substantial non-CRUD logic. |
| min_org_size | 20 s <500 | Self-booking tools (Navan, Concur) sell down-market; managed-travel TMCs skew larger, but the addressable floor is small/mid (sub-500) companies with regular business travel. |
| cost_band | $$$ | Per-trip/per-active-traveler pricing plus TMC service fees; comparable to EXPENSE ($$$), above SPEND-MGMT ($). |
| certification_required | no | No mandatory product certification to operate; GDPR/duty-of-care are obligations on the operator, and IATA NDC is a standard, not a certification gate. (PCI applies only where card data is stored, often inherited.) |
| usa_market_size_usd_m | ~3500 | Order-of-magnitude estimate for US corporate travel management software/TMC tech spend (booking + program tooling, excluding the underlying travel spend itself). Treat as a rough planning figure pending a sourced market-sizing pass. |
| market_size_source_year | 2025 | Anchored to 2025 (Navan IPO disclosures: ~$613M TTM revenue on ~$7.6B gross bookings give a vendor-revenue sense of scale; full TAM sizing to be sourced in a later phase). |

Note: usa_market_size_usd_m is a Phase-0 order-of-magnitude placeholder, not a sourced figure. Flag for a dedicated market-sizing pass before any value is loaded.

## B3 follow-ups (non-blocking discretionary ideas)

- Consider whether a distinct DUTY-OF-CARE / travel-risk-management capability deserves its own capability node, since it spans travel and broader employee-safety tooling (some vendors, e.g. International SOS, sell it standalone).
- Spotnana's "travel-as-a-service" infrastructure model suggests a possible embedded-travel / travel-API capability worth tracking as the channel pattern (Brex, Expensify, Center all embed it). Non-blocking.
- Reconcile the EXPENSE description's "travel-booking integration" phrase once TRAVEL-MGMT exists, so the two domains reference each other cleanly at the spend seam.

## Sources

- Navan IPO (Oct 30, 2025, ~$6.2B, NAVN): https://www.cnbc.com/2025/10/30/travel-tech-navan-ipo-nasdaq-stock-price.html
- TripActions to Navan rebrand (Feb 2023): https://investors.navan.com/news-releases/news-release-details/tripactions-rebrands-navan
- Amex GBT completes CWT acquisition (Sep 2, 2025, ~$540M; Egencia/Neo tooling): https://www.businesswire.com/news/home/20250902624882/en/Amex-GBT-Completes-Acquisition-of-CWT
- Egencia acquired by Amex GBT (2021): https://www.cbinsights.com/compare/egencia-vs-tripactions
- Spotnana Travel-as-a-Service, Brex/Expensify/Center partners: https://www.spotnana.com/llm-info/
- SAP Concur positioning / Navan comparison: https://navan.com/blog/sap-concur-alternatives
- Duty of care for business travelers (BCD): https://www.bcdtravel.com/travel-management/duty-of-care-for-business-travelers/
- NDC / IATA standard and duty-of-care data impact: https://blog.traxo.com/what-travel-management-teams-need-to-know-about-ndc
- GDPR and processing employee travel information: https://resources.traxo.com/gdpr-and-processing-employee-travel-information
