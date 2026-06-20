# HOA-MGMT audit history

## 2026-06-19 — Promotion + Phase 0 (new domain, unbuilt)

**Origin.** Surfaced by the RE-PROP-MGMT audit (2026-05-30) into `audits/_missing-domains.md`; triaged 2026-06-19 as part of a 5-candidate research pass (EMP-JOURNEY-ORCH, HOA-MGMT, PMM, SOP-MGMT, WORKPLACE-EXP). User chose "Record + start loading a domain" and HOA-MGMT was selected as the first PROMOTE to build.

**Point-solution-market test: PASSES (high confidence).** At least five independent vendors whose flagship IS community-association management (CAM): Vantaca (JMI Equity-backed; ~6.5M doors), CINC Systems (~50k communities, ~6M doors), PayHOA (self-managed boards), FRONTSTEPS, Condo Control / Enumerate (TOPS). AppFolio and Buildium offer HOA only as an EDITION of a landlord-tenant suite (suite-encroaching-on-vertical), not their flagship.

**Decision: promote-as-domain, standalone** (sibling to RE-PROP-MGMT, which is itself `parent_domain_id=null`). Not a child of RE-PROP-MGMT (each masters entities the other lacks) and not under the corporate REAL-EST umbrella (that is corporate real estate / workplace). `domain_kind=established_market`.

**Boundary vs RE-PROP-MGMT (id 144).** RE-PROP-MGMT is the landlord->tenant view (leases, rent, tenant screening, vacancy marketing, per-property GL, `tenant_maintenance_requests` 361). HOA-MGMT is the owners->self-governance view: an association of owners governs itself (board, elections, CC&Rs, architectural review, assessments/dues, violation fines on member-owners, statutory reserve studies). No lease/tenant in HOA; no covenants/elections/reserves in landlord PM. RE-PROP-MGMT names "condo/HOA management" as a buyer but models none of this surface.

**Phase 0 vendor surface** (`.tmp_deploy/HOA-MGMT-phase0-2026-06-19.md`): 5 pure-play CAM vendors, 46 entities (35 Core / 8 Common / 13 statute-driven compliance). Compliance surface is US-state-driven (CA Davis-Stirling, FL Ch. 718/720, TX Ch. 209, Fair Housing Act on rules enforcement, reserve-study mandates, election/open-meeting requirements, lien/foreclosure procedure, estoppel/resale-disclosure documents). Modularization hypothesis: 3 modules (GOVERNANCE / ASSESSMENTS / COMMUNITY-OPERATIONS). Metadata estimate: crud_percentage 90, min_org_size "20 s <500", cost_band $$, certification_required false, usa_market_size_usd_m ~700 (flagged as an order-of-magnitude US slice of ~$1.5-1.6B global HOA/condo software 2024; needs a dedicated sizing pass before any value loads), market_size_source_year 2024.

**Status: feedback_needed.** Nothing loaded to the catalog (Rule #21/#22: a new domain is an expansive addition, gated on a q-file). Four market-shape `b2` decisions surfaced in `q-HOA-MGMT.md`: module split (gate), common-area maintenance mastering vs consume RE-PROP-MGMT, community-contractor mastering vs consume the shared `suppliers` master (206), and owning business function. Phase A-S build runs once `a-HOA-MGMT.md` answers the shape.
