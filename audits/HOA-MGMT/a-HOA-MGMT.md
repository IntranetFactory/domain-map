# Homeowner Association Management (HOA-MGMT): questions waiting for you

## What this domain is

Run a homeowner or condo association the way the board and the management company actually work: keep the owner roster and unit records, run board elections and meetings, publish and enforce the governing documents (CC&Rs), handle architectural-review requests and covenant violations, levy and collect regular and special assessments, chase delinquencies through to liens, and fund the future with statutory reserve studies, plus the day-to-day of amenity bookings, common-area upkeep, and community communications.

This is a NEW domain, just promoted from the candidate queue (it is a different business from landlord property management, which the catalog already has as RE-PROP-MGMT: that one is about renting units to tenants; this one is about owners governing themselves). Nothing is loaded yet. These four questions decide its shape; once you answer (rename this file to `a-HOA-MGMT.md`), I run the build (Phase 0 vendor research is already done at `.tmp_deploy/HOA-MGMT-phase0-2026-06-19.md`).

---

q1: How many modules should HOA-MGMT ship as? (answer this first)

- a) Three modules: governance (board, elections, meetings, governing documents, architectural review, violations), assessments (dues, special assessments, owner ledgers, collections, liens, reserve studies, resale disclosures), and community operations (amenity bookings, common-area work orders, contractors, communications, front desk).
- b) Two modules: fold community operations into governance.

Recommended: a. The flagship pure-plays package CAM as three separable surfaces. Governance (board, elections, meetings, CC&Rs, architectural review, violations, fines) is first-class in Vantaca, CINC Systems, FRONTSTEPS, and Condo Control. Assessments/financials (assessments, special assessments, owner sub-ledgers, dues, delinquency/collections, liens, reserve studies, estoppel/resale disclosures) is the strongest surface in CINC Systems (accounting + integrated banking) and PayHOA (dues/collections-first) and present in Vantaca and FRONTSTEPS. Community operations (amenity bookings, common-area work orders, contractor records, communications/surveys/directory, visitor/package) is productized by Vantaca, FRONTSTEPS, and Condo Control. Vantaca, CINC, and FRONTSTEPS each productize all three as distinct surfaces, supporting the 3-module split; PayHOA is governance-light and dues/communication-centric, which is the case for folding community operations into governance (option b). Both options satisfy the minimum of 2 modules.

a1: a

---

q2: Should HOA master its own common-area maintenance, or read the landlord property-management maintenance entity?

- a) HOA masters its own `common_area_work_orders` and common-area service requests (the association maintains shared common areas itself).
- b) Consume RE-PROP-MGMT's `tenant_maintenance_requests` (no separate HOA maintenance record).

Recommended: a. Vantaca, CINC Systems, FRONTSTEPS, and Condo Control all carry common-area work orders / service requests as first-class records: the association maintains shared common areas (pool, clubhouse, landscaping, gates) directly, which is a different record from a landlord's per-unit repair. RE-PROP-MGMT's `tenant_maintenance_requests` (361) is the landlord-to-tenant per-unit maintenance portal and does not represent association common-area work; there is no tenant in the HOA model. Option a masters the common-area work the vendors actually sell; option b would force it through a landlord-tenant entity that does not fit owner-governance.

a2: a

---

q3: Should HOA master its own community contractors, or reuse the shared supplier list?

- a) HOA masters `community_vendors` + `vendor_contracts` (local contractors with certificate-of-insurance and contract tracking).
- b) Embed / consume the shared `suppliers` master (the enterprise procurement supplier record), keeping one supplier master across the catalog.

Recommended: a. Vantaca, CINC Systems, FRONTSTEPS, and Condo Control all carry contractor/vendor records with certificate-of-insurance (COI) and contract tracking as first-class CAM features: associations engage local trades (landscapers, pool service, security) that are not enterprise procurement suppliers and live in no shared supplier system. The catalog does hold a shared `suppliers` master (the S2P/procurement supplier), so option b (a local shell that defers to `suppliers` when present) is available and keeps a single supplier master catalog-wide; but option a better fits the SMB CAM reality where these contractors never enter an enterprise supplier system. The tradeoff is a second contractor-shaped master adjacent to `suppliers`.

a3:

---

q4: Which business function owns HOA-MGMT?

- a) Facilities and Real Estate (owner), with Finance and Legal as contributors.
- b) Finance (owner), with Facilities and Legal as contributors.
- c) Business Operations (owner), with Finance and Legal as contributors.

Recommended: a. HOA/CAM software is bought by community-association management companies and self-managing boards, so the owner maps to the buyer's closest function. The product spine is property/community stewardship (governance + common-area operations), which sits under Facilities and Real Estate, with Finance contributing the assessment/dues/reserve/collections surface (CINC Systems, PayHOA financial cores) and Legal contributing covenants, violation hearings, and liens (FRONTSTEPS, Vantaca governance surfaces). Option a matches the real-estate-stewardship buyer; option b fits management companies where the assessment/collections ledger is the center of gravity; option c fits a management-company-as-operations framing but understates the real-estate nature.

a4:

---

<!-- agent map, ignore: q1=B2-HOA-MODULES q2=B2-HOA-MAINTENANCE q3=B2-HOA-VENDORS q4=B2-HOA-OWNER-FN | domain_id=new (unbuilt) | phase0=.tmp_deploy/HOA-MGMT-phase0-2026-06-19.md -->
