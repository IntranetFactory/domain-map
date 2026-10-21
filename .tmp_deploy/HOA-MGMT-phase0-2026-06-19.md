# HOA-MGMT Phase 0 — Vendor Surface

Research only. No DB rows proposed. Domain coexists with the already-loaded sibling RE-PROP-MGMT (id 144, landlord->tenant view); HOA-MGMT is the owners->self-governance view.

## Flagship vendors

| Vendor | URL | Pure-play vs suite | Specialist in | Why included |
|--------|-----|--------------------|---------------|--------------|
| Vantaca | vantaca.com | Pure-play CAM | Mid/large management companies; accounting + workflow automation tied to action items | Leading modern pure-play for professional CAM firms; broad governance + financial surface |
| CINC Systems | cincsystems.com | Pure-play CAM | All-in-one banking + accounting + ops + resident engagement; reservations module | Major incumbent; integrated banking/AP/AR plus violations, reserves, amenity reservations |
| PayHOA | payhoa.com | Pure-play CAM (SMB) | Self-managed boards; dues, violations, ARC, documents | Defines the SMB self-managed entry tier; shows minimal viable governance+finance set |
| FRONTSTEPS | frontsteps.com | Pure-play CAM | Resident engagement + mobile inspections (violations, ARC, amenities, work orders, payments) | Strong on community-operations and outreach surface |
| Condo Control | condocontrol.com | Pure-play CAM/condo | Governance ops: e-voting, meetings, amenity booking, packages, visitors | Best coverage of board-governance and front-desk/community-ops entities |

Suite context (not matrix columns): AppFolio and Buildium both ship "association/community" editions, but they treat HOA as a mode of property management and reuse leases/tenants plumbing; they confirm the mainline of accounting + violations + ARC + amenity + portal but add little governance depth, so they are excluded from the 5-column matrix in favor of the pure-plays. Enumerate/TOPS [ONE] (goenumerate.com) corroborates the accounting + collections + violations + engagement core.

## Surface matrix

V1=Vantaca, V2=CINC, V3=PayHOA, V4=FRONTSTEPS, V5=Condo Control. Classification: Core (>=3), Common (2), Specialist (1), Compliance (statute-driven).

| Entity | Category | V1 | V2 | V3 | V4 | V5 | Classification | Proposed module |
|--------|----------|----|----|----|----|----|----------------|-----------------|
| associations | Master | x | x | x | x | x | Core | governance |
| units_lots | Master | x | x | x | x | x | Core | governance |
| owner_memberships | Master | x | x | x | x | x | Core | governance |
| board_members | Master | x | x | x | x | x | Core | governance |
| board_meetings | Master | x | x |  | x | x | Core | governance |
| meeting_minutes | Audit-compliance | x | x | x | x | x | Core | governance |
| meeting_notices | Audit-compliance | x | x |  | x | x | Core | governance |
| board_packets | Configuration-templates | x | x |  |  | x | Common | governance |
| board_elections | Master |  | x |  | x | x | Core | governance |
| election_ballots | Junctions-transitions |  | x |  | x | x | Core | governance |
| voting_proxies | Junctions-transitions |  | x |  |  | x | Common | governance |
| governing_documents | Master | x | x | x | x | x | Core | governance |
| architectural_review_requests | Master | x | x | x | x | x | Core | governance |
| architectural_review_decisions | Junctions-transitions | x | x | x | x | x | Core | governance |
| covenant_violations | Master | x | x | x | x | x | Core | governance |
| violation_notices | Junctions-transitions | x | x | x | x | x | Core | governance |
| violation_hearings | Audit-compliance | x | x |  |  | x | Common | governance |
| violation_fines | Junctions-transitions | x | x | x | x | x | Core | assessments |
| assessments | Master | x | x | x | x | x | Core | assessments |
| special_assessments | Master | x | x | x |  | x | Core | assessments |
| assessment_schedules | Configuration-templates | x | x | x |  | x | Core | assessments |
| owner_account_ledgers | Master | x | x | x | x | x | Core | assessments |
| dues_invoices | Junctions-transitions | x | x | x | x | x | Core | assessments |
| owner_payments | Junctions-transitions | x | x | x | x | x | Core | assessments |
| delinquencies | Audit-compliance | x | x | x | x | x | Core | assessments |
| collection_actions | Junctions-transitions | x | x | x | x | x | Core | assessments |
| liens | Audit-compliance | x | x | x |  | x | Core | assessments |
| reserve_studies | Audit-compliance | x | x |  |  | x | Common | assessments |
| reserve_components | Master |  | x |  |  | x | Common | assessments |
| reserve_funding_plans | Configuration-templates |  | x |  |  | x | Common | assessments |
| estoppel_certificates | Audit-compliance | x | x | x |  | x | Core | assessments |
| resale_disclosure_packages | Audit-compliance | x | x | x |  | x | Core | assessments |
| amenities | Master | x | x |  | x | x | Core | community_operations |
| amenity_bookings | Junctions-transitions | x | x |  | x | x | Core | community_operations |
| common_area_work_orders | Master | x | x | x | x | x | Core | community_operations |
| service_requests | Junctions-transitions | x | x | x | x | x | Core | community_operations |
| community_vendors | Master | x | x | x | x | x | Core | community_operations |
| vendor_contracts | Master | x | x |  | x | x | Core | community_operations |
| community_announcements | Engagement-outreach | x | x | x | x | x | Core | community_operations |
| owner_communications | Engagement-outreach | x | x | x | x | x | Core | community_operations |
| owner_surveys | Engagement-outreach |  | x | x |  | x | Core | community_operations |
| resident_directory_entries | Master | x | x | x | x | x | Core | community_operations |
| visitor_logs | Junctions-transitions |  | x |  | x | x | Common | community_operations |
| package_logs | Junctions-transitions |  | x |  |  | x | Common | community_operations |
| inspection_records | Audit-compliance | x | x |  | x | x | Core | community_operations |
| communication_templates | Configuration-templates | x | x | x | x | x | Core | community_operations |

## Compliance entities (non-optional)

| Entity | Regulation/statute | Proposed module |
|--------|--------------------|-----------------|
| reserve_studies | CA Davis-Stirling (Civ. Code 5550, full study >= every 3 yrs); FL 718 SIRS for condos 3+ stories | assessments |
| reserve_funding_plans | CA Civ. Code 5570 assessment & reserve funding disclosure summary | assessments |
| meeting_notices | Open-meeting / notice statutes (CA Open Meeting Act; FL 718/720; TX 209) | governance |
| meeting_minutes | Statutory minutes/record retention (CA 5200; FL 718.111/720.303) | governance |
| board_elections | Election integrity statutes (CA 5100-5135 secret-ballot; FL election rules) | governance |
| election_ballots | Secret-ballot / inspector-of-elections rules (CA 5125) | governance |
| violation_hearings | Due-process pre-fine hearing requirement (CA 5855; TX 209.006-.007) | governance |
| violation_notices | Notice/cure-period before enforcement (TX 209.006); Fair Housing Act limits on enforcement | governance |
| architectural_review_decisions | Fair Housing Act (reasonable accommodation/modification); FL 720.3035 ARC rules | governance |
| liens | Assessment-lien & foreclosure procedure statutes (CA 5650-5740; FL 718.116/720.3085) | assessments |
| estoppel_certificates | FL 720.30851 / 718.116(8); delivery <=10 business days, fee-capped | assessments |
| resale_disclosure_packages | State resale-disclosure statutes (CA 4525 document delivery; FL 720.401) | assessments |
| inspection_records | Documented-process enforcement evidence supporting due-process defensibility | community_operations |

## Modularization hypothesis

**governance** (master cluster: associations, units_lots, owner_memberships, board_members, board_elections, board_meetings, governing_documents, architectural_review_requests, covenant_violations). The fiduciary self-government core: who the association is, who owns/governs, how the board is elected and meets, the rules it publishes, the architectural decisions it makes, and the violations it enforces, with statutory notice/minutes/hearing trails. This is the distinctive HOA-MGMT spine RE-PROP-MGMT does not have.

**assessments** (masters: assessments, special_assessments, owner_account_ledgers; plus reserve_components). The money the association levies on itself: regular and special assessments and schedules, per-owner ledgers and dues invoices, delinquency aging, collections, liens and foreclosure records, reserve studies/components/funding plans, and resale/estoppel financial disclosures. Distinct from RE-PROP-MGMT rent collection: this is owner self-funding of common obligations, not landlord rent.

**community_operations** (masters: amenities, common_area_work_orders, community_vendors, vendor_contracts, resident_directory_entries). Day-to-day shared-life operations: amenity reservations, common-area maintenance work orders and inspections, vendor/contractor records and contracts, plus the engagement-outreach surface (announcements, owner communications, surveys, directory, visitor/package front-desk).

Three modules, each with >=1 master (Rule #14). No vendor names used (Rule #18).

## Boundary notes

HOA-MGMT must NOT re-master what RE-PROP-MGMT (id 144) or FIN already own:

- **leases, tenants, rent_collection, tenant_screening, vacancy_marketing** — RE-PROP-MGMT masters. HOA does not lease units; owners are members, not tenants. No overlap to consume.
- **maintenance-request portal / per-unit work** — RE-PROP-MGMT masters per-rental-unit maintenance. HOA's `common_area_work_orders` are scoped to association-owned common areas only; the owner-portal `service_requests` here are common-area/grievance requests, not landlord repairs. Keep distinct; do not consume RE-PROP-MGMT's tenant maintenance.
- **per-property general ledger / AP / bank reconciliation** — Treat the underlying GL, chart_of_accounts, journal_entries, bank_accounts as **consume / embedded_master from FIN** (or a shared accounting master). HOA masters `owner_account_ledgers` (the association-to-owner sub-ledger) and `assessments`, but reads the general ledger rather than re-mastering double-entry accounting.
- **users / contacts** — `board_members`, `owner_memberships`, and `resident_directory_entries` reference platform `users`/contacts as embedded_master; HOA masters the role/membership rows, not the identity.
- **community_vendors / vendor_contracts** — likely overlaps a procurement/VMS or RE-PROP-MGMT vendor concept. Flagged as an open boundary question: may become a consumed shared master rather than a fresh HOA master.

## Domains metadata estimate (Rule #8 seven fields)

| Field | Estimate | Basis |
|-------|----------|-------|
| crud_percentage | 90 | Forms/records/workflow market: members, dues, violations, ARC, meetings, documents are near-pure CRUD + state machines; only a thin slice is non-declarable calculation. |
| business_logic | "Reserve-funding projections and percent-funded calculations (component aging vs contributions); assessment proration on mid-period ownership transfer; special-assessment installment amortization; lien/delinquency aging and statutory late-fee/interest accrual; quorum and weighted/secret-ballot vote tabulation; statutory notice-period and cure-period timers." | These exceed JsonLogic-declarable CRUD (multi-period projections, date-driven timers, vote weighting). |
| min_org_size | "20 s <500" | Buyers are small self-managed boards and small/mid CAM firms; a 5-unit HOA rarely buys software, but a single mid-size association or a small management company managing several books is the realistic floor. Slightly above RE-PROP-MGMT's "10 xs <50" because the practical buyer is an association/management firm, not a hobbyist landlord. |
| cost_band | "$$" | Per-door/per-unit SaaS; a 500-unit org TCO is mid-range (comparable to RE-PROP-MGMT $$), well below enterprise IWMS/ERP $$$. SMB self-managed tiers (PayHOA) keep entry low. |
| certification_required | false | Serving the market OOTB needs no vendor certification. State statutory compliance (reserve studies, elections, estoppels) is configuration/content, handled per-state in templates, not a product certification gate. |
| usa_market_size_usd_m | 700 | US-specific CAM software TAM. Order-of-magnitude estimate: global HOA/condo association-management software ~USD 1.5-1.6B (2024-25); US is the dominant share of community-association software (~27% of the broader category, and the bulk of the HOA/condo niche given ~355k US associations / 74M residents). USD ~700M is a defensible US slice; flagged as an estimate derived from global figures, not a direct US-only report. |
| market_size_source_year | 2024 | Underlying global market figures (Business Research Insights / DataHorizon) are 2024 valuations. |
