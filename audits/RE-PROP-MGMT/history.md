# RE-PROP-MGMT audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 6 master data_objects (`rental_units`, `property_tenants`, `rental_applications`, `rent_payments`, `tenant_maintenance_requests`, `rental_leases`) plus 1 contributor (`supplier_invoices`, mastered by S2P); 6 capabilities; 7 solutions; **0 `domain_modules`**; **0 `domain_regulations`**; 10 trigger events; 7 outbound handoffs (all with NULL `source_domain_module_id` and `target_domain_module_id`); 1 inbound handoff from RE-BROKERAGE; 1 legacy domain-level system skill (`re-prop-mgmt-system`, id 98) with 8 `skill_tools` rows.
- Market surface basis: pure-play residential property management vendors AppFolio Property Manager, Buildium, Yardi Breeze, Entrata, RealPage, Rent Manager, Yardi Voyager (all 7 already linked at `coverage_level=primary`). Compliance specialists for FCRA (TransUnion SmartMove, Experian RentBureau, RentPrep) and Fair Housing (NAA, NMHC training programs) cited for regulatory entity coverage.
- Structural pass: A pass except A4 (`catalog_tagline` / `catalog_description` empty); **M fails outright** (zero modules; 6 capabilities mandate two or more full modules per Rule #14); B fails broadly (B3 naming arbitration unverified, B6 intra-domain relationships absent, B7 users edges absent, B11 aliases absent, B12 lifecycle states absent, B9 trigger events missing `event_category` on rows 957-961, B10b every handoff carries NULL module FKs); C passes; D not yet run; E vacuous (no roles can attach to a zero-module domain); F fails (legacy domain-level skill, no per-module system skills); H1 fails (1/8 cross-domain handoffs carries any APQC tag).
- Semantius score (legacy skill 98 only): strict = 7/8 = 87.5% (`sign_document`, id 42, is `external`). Score will need recomputation once modules and their system skills land.
- **Bucket 1 (in-scope, agent fixable):** 17 items.
- **Bucket 2 (surface-for-user, judgment):** 7 items.
- **Bucket 3 (Phase 0 pending, speculative):** 6 items.

This domain has **never been modularized**: the entire structural substrate beyond `domains`, `capabilities`, `solutions`, and `domain_data_objects` is missing. The M-band failure blocks downstream concerns (E, F2-F5, B9b, B10b on the source-module side, fact-sheet emission). The fix is a Phase A re-extension plus a full Phase B + Phase S load, not a series of small patches.

### Vendor surface basis

- **AppFolio Property Manager**, **Buildium**, **Yardi Breeze**, **Rent Manager**: SMB / mid-market residential pure-plays, shared canonical surface (units, leases, applications, payments, work orders, owner statements).
- **Entrata**, **RealPage**, **Yardi Voyager**: enterprise multifamily, add resident-portal personalization, channel-marketing, revenue management, and centralized owner-distribution waterfalls.
- **Compliance specialists cited (not in `solutions` yet)**: TransUnion SmartMove and Experian RentBureau (FCRA-regulated tenant screening reports), RentPrep (eviction-record retrieval), NAA fair-housing training (Fair Housing Act regulatory anchor).

### Pass 3, Neighbor discovery

Auto-derived from existing `handoffs` rows (NULL module FKs aside, the domain edges resolve).

| Neighbor | Edge weight | Direction(s) | Notes |
|---|---|---|---|
| RE-INVEST | 2 | outbound (handoffs 301, 864) | Rent payments and lease executions feed investor reporting (owner distributions). |
| RE-BROKERAGE | 1 | inbound (handoff 296 on `real_estate_transaction.closed`) | Closed sale starts a property under management. |
| AP-AUTO | 1 | outbound (handoff 298 on `rent_payment.received`) | Owner-distribution leg via AP. |
| FSM | 1 | outbound (handoff 299 on `tenant_maintenance_request.created`) | Maintenance dispatch. |
| LSD | 1 | outbound (handoff 300 on `property_tenant.evicted`) | Eviction legal matter. |
| GRC | 1 | outbound (handoff 310 on `rental_application.approved`) | Compliance audit trail (Fair Housing fair-treatment evidence). |
| ERP-FIN | 1 | outbound (handoff 864 on `rent_payment.received`) | GL posting. |
| CSM | 1 | outbound (handoff 865 on `rental_unit.vacant`) | Resident off-boarding ticket / case. |

Every neighbor is at edge weight under 3 individually, so Pass 4 collapses to a one-line per-neighbor note (no full 5-section diff). The aggregate finding is that **every cross-domain edge above is structurally incomplete** (NULL module FKs on the source side, because there are no source modules to attribute to). The B10b backfill cannot run until the M-band ships.

### Pass 4, Pairwise reconciliation (light)

For every neighbor above the only fix that can land from this audit is "wait for M-band" plus the per-neighbor B10b PATCH that follows the new modules. Per-neighbor one-line summaries:

- **RE-INVEST**: target_domain_module_id NULL on both rows; once RE-INVEST modularizes its lease-rollup module, both handoffs need the target side filled.
- **RE-BROKERAGE**: inbound handoff 296 already has `source_domain_module_id=151` (RE-BROK-AGENT-OPS); `target_domain_module_id` will resolve once RE-PROP-MGMT modularizes (target module = the `RE-PM-LEASING-PIPELINE` module that consumes the closing).
- **AP-AUTO, FSM, LSD, GRC, ERP-FIN, CSM**: each is a one-row consumer dependency; the consumer DMDO row on the target side (other domain's audit) is the symmetric leg.

No in-scope fixes from this domain land in Pass 4; everything routes through Bucket 1's M-band fix.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 | Zero `domain_modules` rows for `domain_id=144`. Domain has 6 capabilities and 6 master data_objects but no deployable units. Every downstream check (F2-F5, B9b, E1-E6) is blocked. | Author a module set (proposal in Bucket 2 #1) and POST `domain_modules`. |
| B1-S2 | M2 | 6 capabilities and 0 modules; Rule #14 requires two or more full modules when capability count is at or above 3. | Resolved by B1-S1's module set if the user approves a multi-module shape. |
| B1-S3 | M4 | All 6 capabilities (RE-PM-TENANT-SCREENING, RE-PM-RENT-COLLECTION, RE-PM-MAINT-REQUEST, RE-PM-LEASING-PIPELINE, RE-PM-PROP-ACCOUNTING, RE-PM-VACANCY-MARKETING) are capability-orphaned (no realizing module). | Author `domain_module_capabilities` rows once the module set lands. |
| B1-S4 | A4 | `catalog_tagline` and `catalog_description` are empty strings (Rule #20 backfill). | Draft both fields in Bucket 2 #2 for user review before writing (Rule #20 forbids overwrite without per-row approval, but empty-to-content backfill is allowed with surface). |
| B1-S5 | B3 | Naming arbitration not recorded for 6 masters (`is_canonical_bare_word=false`, `naming_authority_rationale=''`). The names are all already prefixed (`rental_units`, `property_tenants`, `rental_leases`, `rental_applications`, `rent_payments`, `tenant_maintenance_requests`), so they pass automatically; PATCH the `is_canonical_bare_word=true` flag on bare-word candidates only if a future rename targets the unprefixed form. **Pass automatically (prefixed names).** | No action; recorded for traceability. |
| B1-S6 | B6 | Zero intra-domain `data_object_relationships` among the 6 masters. Expected edges: `rental_units` opens-from `real_estate_transactions` exists (row 473), but every in-domain edge is absent: `rental_units` has-many `rental_leases`, `rental_leases` covers `rental_units`, `rental_applications` results-in `rental_leases`, `property_tenants` signs `rental_leases`, `rental_leases` generates `rent_payments`, `rental_units` receives `tenant_maintenance_requests`, `property_tenants` submits `tenant_maintenance_requests`. | Draft 7 in-domain edges (verb + inverse_verb + cardinality + necessity + owner_side), load via the cluster-drafts loader pattern. |
| B1-S7 | B7 | Zero `users` edges on any of the 6 masters. Expected: `users` manages `rental_units` (property_manager), `users` assigned-to `tenant_maintenance_requests` (coordinator), `users` reviews `rental_applications` (leasing_agent), `users` approves `rental_applications` (manager), `users` records `rent_payments` (bookkeeper). | Author 5 `data_object_relationships` rows with `related_data_object_id=748` (users built-in) per Rule #10. |
| B1-S8 | B9 | Five trigger events (rows 957, 958, 959, 960, 961) have `event_category=''`. Allowed values are `lifecycle`, `state_change`, `threshold`, `signal`. Proposed: 957 `rental_unit.listed` -> `lifecycle`; 958 `rental_unit.occupied` -> `state_change`; 959 `rental_unit.vacant` -> `state_change`; 960 `rental_lease.executed` -> `lifecycle`; 961 `rental_lease.renewed` -> `lifecycle`. | PATCH `event_category` on rows 957-961. |
| B1-S9 | B9 | Four trigger events have no subscriber (`handoffs` rows): 287 (`rental_application.approved`) only fires to GRC; 289 (`rent_payment.delinquent`), 957 (`rental_unit.listed`), 958 (`rental_unit.occupied`), 960 (`rental_lease.executed`), 961 (`rental_lease.renewed`) have ZERO handoffs. | Author handoffs for the missing fan-out (delinquent -> CSM/collections, listed -> CSM/CDP/vacancy syndication, executed -> RE-INVEST, renewed -> RE-INVEST). |
| B1-S10 | B10b | All 7 outbound handoffs (298, 299, 300, 301, 310, 864, 865) and the 1 inbound (296) have NULL on at least one module FK. Outbound: every `source_domain_module_id` is NULL (root cause is the M-band failure); some `target_domain_module_id` rows are also NULL pending the partner-domain audit (AP-AUTO, RE-INVEST, LSD, GRC, FSM, ERP-FIN, CSM). | After the M-band lands, run the per-handoff backfill: `source_domain_module_id` resolves from the new RE-PROP-MGMT module that masters the event's data_object. |
| B1-S11 | B11 | Zero `data_object_aliases` on any of the 6 masters. Non-self-explanatory candidates: `rental_units` -> "Apartment, Unit, Door" (vendor terminology); `property_tenants` -> "Resident, Renter, Lessee"; `rental_applications` -> "Application, Lease App"; `rental_leases` -> "Lease, Rental Agreement". | Author 4 to 8 alias rows. |
| B1-S12 | B12 | Zero `data_object_lifecycle_states` rows for any of the 6 masters. Expected workflows: `rental_units` (vacant -> listed -> applied -> approved -> occupied -> vacating -> vacant), `rental_applications` (draft -> submitted -> screening -> approved/declined -> withdrawn), `rental_leases` (drafted -> sent -> signed -> active -> ending -> terminated -> renewed), `rent_payments` (due -> received -> late -> delinquent -> in_collections), `property_tenants` (prospective -> current -> notice_given -> moved_out -> evicted), `tenant_maintenance_requests` (submitted -> triaged -> assigned -> in_progress -> resolved -> closed). | Draft state machines (initial / terminal flags, `requires_permission=true` on workflow gates, `domain_module_id` per module), load via focused loader. |
| B1-S13 | F1 | Legacy domain-level `re-prop-mgmt-system` skill (id 98, `skill_type=system`, `domain_id=144`, `domain_module_id=null`). Acceptable transitional state per F1, but once per-module system skills land it must retire. | Plan to DELETE skill 98 after Phase S authors per-module replacements. The 8 existing `skill_tools` rows redistribute by module. |

#### MISSING (compliance-mandated entities, non-optional regardless of vendor coverage)

| ID | Entity | Proposed module | Regulation | Notes |
|---|---|---|---|---|
| B1-M1 | `tenant_screening_reports` | RE-PM-TENANT-SCREENING | FCRA | Credit + criminal + eviction history report consumed at application screening. FCRA section 604 governs consumer reports for tenancy. AppFolio, Buildium, TransUnion SmartMove all model this distinctly from the rental_application row. |
| B1-M2 | `fcra_adverse_action_notices` | RE-PM-TENANT-SCREENING | FCRA | Required notice to declined applicant naming the consumer-reporting agency. Distinct from a generic decline reason. |
| B1-M3 | `fair_housing_inquiries` | RE-PM-LEASING-PIPELINE | Fair Housing Act, state fair-housing statutes | Pre-application inquiry log (who asked about a unit, what they were told). Federal contractor + HUD-funded housing requires this. |
| B1-M4 | `security_deposits` | RE-PM-RENT-COLLECTION | State landlord-tenant statutes | Holding-period rules vary by state (15 to 60 days after move-out for itemized accounting). Distinct from `rent_payments`. |
| B1-M5 | `eviction_cases` | RE-PM-RENT-COLLECTION | State eviction statutes | Court-process tracking (notice served, complaint filed, hearing date, judgment, lockout). Handoff target for `property_tenant.evicted` (handoff 300 -> LSD). |

Two regulations themselves are also missing from `regulations`:

| ID | Regulation | Notes |
|---|---|---|
| B1-M6 | Fair Housing Act (and a `domain_regulations` link) | Federal anti-discrimination statute (Title VIII Civil Rights Act); protected classes; applies to every residential landlord with rare exemptions. Not present anywhere in `regulations`. |
| B1-M7 | `domain_regulations` link to FCRA (id 84, already in `regulations` as "Fair Credit Reporting Act") | FCRA is the catalog regulation that governs `tenant_screening_reports` and `fcra_adverse_action_notices`. Currently no `domain_regulations` row connects FCRA to RE-PROP-MGMT. |

#### MISSING (universal-vendor entities, non-regulatory)

| ID | Entity | Proposed module | Notes |
|---|---|---|---|
| B1-U1 | `owner_distributions` | RE-PM-PROP-ACCOUNTING | Periodic disbursement to the property owner (net rent minus expenses). Every flagship vendor masters this; it is the parent of the AP-AUTO handoff payload. |
| B1-U2 | `lease_charges` | RE-PM-RENT-COLLECTION | The per-month recurring charge schedule (rent, utilities, pet rent, parking) that produces `rent_payments`. Distinct from the payment itself. |
| B1-U3 | `late_fee_assessments` | RE-PM-RENT-COLLECTION | The audit trail for late-fee posting; tied to the `rent_payment.delinquent` event. |
| B1-U4 | `move_in_inspections` | RE-PM-LEASING-PIPELINE | Initial condition report; cross-references for `security_deposits` itemization. Universal across vendors. |
| B1-U5 | `move_out_inspections` | RE-PM-LEASING-PIPELINE | Closing condition report; required for security-deposit itemized accounting. |
| B1-U6 | `property_owners` | RE-PM-PROP-ACCOUNTING | The owner of record for each rental unit (single-family-rental landlords or multifamily ownership entity). Distinct from `property_tenants`; embedded_master in CRM if a CRM module owns contacts. |
| B1-U7 | `rental_listings` | RE-PM-VACANCY-MARKETING | The marketing artifact published to listing channels (Zillow, Apartments.com). Distinct from `rental_units` (the inventory record). |

#### WRONG-OWNERSHIP

| ID | Entity | Current | Proposed | Notes |
|---|---|---|---|---|
| B1-WO1 | `supplier_invoices` (id 75) | `contributor + required` on RE-PROP-MGMT | Keep contributor, but verify scope | `supplier_invoices` is canonically mastered by S2P (id 27). Contributor is technically allowed (RE-PROP-MGMT contributes to the supplier-invoice graph when paying vendor work orders), but RE-PROP-MGMT does not in fact write or hold supplier_invoices directly; it produces vendor work orders that AP-AUTO ingests. Likely scope-creep from an earlier draft; the right shape is `consumer + optional` (RE-PROP-MGMT reads the AP-paid-status to update its `vendor_work_orders` ledger). |

#### BOUNDARY

| ID | Finding | Fix |
|---|---|---|
| B1-B1 | Outbound handoffs 298, 299, 300, 301, 310, 864, 865 all carry `source_domain_module_id=null` (M-band root cause) and most carry `target_domain_module_id=null` (target side owes the consumer DMDO). Net of the M-band fix, the in-scope cure on this domain is the source-side backfill once modules land. The target-side rows are report-only follow-ups on the partner domains. | Run B10b derivation after M-band lands. |
| B1-B2 | Inbound handoff 296 (RE-BROKERAGE `real_estate_transaction.closed` -> RE-PROP-MGMT) carries `target_domain_module_id=null` (this domain's side). The fix lives here once the leasing-pipeline module exists. | Resolves after M-band. |

#### APQC TAGGING

7 of the 8 cross-domain handoffs touching RE-PROP-MGMT have no `handoff_processes` tag (only the inbound 296 carries `process_id=1860` "Close the sale", `agent_curated`, `new`). Volume expectation: 4 to 6 NEW `agent_curated` tags from this audit plus ~2 deferrals.

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | Confidence |
|---|---|---|---|---|---|---|
| 298 | RE-PROP-MGMT -> AP-AUTO | `rent_payment.received` | rent_payments | Process accounts receivable (AR) | 303 | confident L3 |
| 864 | RE-PROP-MGMT -> ERP-FIN | `rent_payment.received` | rental_leases | Post receivable entries | 1353 | confident L4 |
| 299 | RE-PROP-MGMT -> FSM | `tenant_maintenance_request.created` | tenant_maintenance_requests | Request unplanned maintenance | 824 | confident L4 |
| 300 | RE-PROP-MGMT -> LSD | `property_tenant.evicted` | property_tenants | Receive work product and manage/monitor case and work performed | 1627 | medium L4 (LSD-side activity; PCF cross-industry has no eviction-specific row) |
| 301 | RE-PROP-MGMT -> RE-INVEST | `rent_payment.received` | rental_leases | Generate customer billing data | 1351 | medium L4 (RE-INVEST receives the rent-roll for owner statements) |
| 310 | RE-PROP-MGMT -> GRC | `rental_application.approved` | property_tenants | Confirm change/release compliance | 1252 | low L4 (no PCF row for fair-housing fair-treatment audit; defer to Discover Pass 3) |
| 865 | RE-PROP-MGMT -> CSM | `rental_unit.vacant` | rental_units | Receive work product and manage/monitor case and work performed | 1627 | low L4 (resident off-boarding; defer to Discover Pass 3) |

Deferred to Discover Pass 3 (no clean PCF cross-industry match):

| handoff_id | Defer reason |
|---|---|
| 310 | Fair-housing fair-treatment audit is not in PCF cross-industry; needs custom-process authoring. |
| 865 | Resident-side service ticket from a vacancy event is industry-specific (multifamily resident services); no clean L2/L3 PCF parent. |

### Bucket 2, Surface-for-user (judgment calls)

1. **Module split design.** Proposal for the M1 fix is a 5-module split, one per capability cluster: `RE-PM-TENANT-SCREENING` (masters `rental_applications`, `tenant_screening_reports`, `fcra_adverse_action_notices`); `RE-PM-LEASING-PIPELINE` (masters `rental_leases`, `move_in_inspections`, `move_out_inspections`, `fair_housing_inquiries`); `RE-PM-RENT-COLLECTION` (masters `rent_payments`, `lease_charges`, `late_fee_assessments`, `security_deposits`, `eviction_cases`); `RE-PM-MAINTENANCE` (masters `tenant_maintenance_requests`, embeds `vendor_work_orders` or consumes from FSM); `RE-PM-PROP-ACCOUNTING` (masters `owner_distributions`, `property_owners`, contributes to `supplier_invoices`). `rental_units` and `property_tenants` master in `RE-PM-LEASING-PIPELINE` (the lifecycle home). A `RE-PM-VACANCY-MARKETING` module masters `rental_listings`. **Confirm split or propose alternative.** Options: (a) accept this 6-full-module shape, (b) collapse `RE-PM-VACANCY-MARKETING` into `RE-PM-LEASING-PIPELINE` for a 5-module shape, (c) split differently. Independent of Bucket 3 (vendor research won't shift the boundary materially).

2. **Catalog UX backfill (A4).** Draft for `catalog_tagline`: *"Collect rent, screen tenants, dispatch maintenance, and account for each property, all in one residential-management platform."* Draft for `catalog_description`: *"Run a residential portfolio (single-family rentals, multifamily buildings, condo associations) end to end. Market vacant units to listing sites, screen applicants against credit, criminal, and eviction history, draft and sign leases, collect rent (with prorations, late fees, and security-deposit accounting), and handle maintenance requests with vendor or in-house teams. Per-property general ledger feeds owner distributions and investor reporting, with built-in compliance for the Fair Housing Act, FCRA-regulated screening, and state-by-state landlord-tenant statutes."* Approve, edit, or rewrite per Rule #20.

3. **Fair Housing Act scope decision.** Federal Title VIII applies to nearly every residential landlord, with rare exemptions (owner-occupied small properties, religious housing). Should `domain_regulations.applicability` be `mandatory` catalog-wide, or `mandatory_with_exemptions`? Independent of Bucket 3.

4. **State landlord-tenant regulations (model strategy).** Each state has its own landlord-tenant act (CA Civil Code 1940 series, NY RPL Article 7, TX Property Code Chapter 92, FL Statutes Chapter 83) with distinct security-deposit holding periods, eviction notice timing, and required disclosures. Two options: (a) add one umbrella `state_landlord_tenant_statutes` regulation and link it to RE-PROP-MGMT; (b) defer to per-jurisdiction modeling once a `jurisdictions` rollup is loaded. Independent of Bucket 3.

5. **Pattern-flag re-evaluation.** Reading the master shapes against Rule #12: `rental_applications` plausibly has `has_personal_content=true` (SSN, credit data); `rental_leases` plausibly has `has_submit_lock=true` (post-signing); `tenant_screening_reports` (B1-M1) plausibly has `has_personal_content=true`. None of the current 6 masters carries any flag set. Surface per row: confirm flags before they go live.

6. **`vendor_work_orders` placement.** The maintenance fan-out leg currently dispatches to FSM (handoff 299). But many residential operators carry their own work-order ledger inside the property-management platform rather than dispatching to a separate FSM. Two options: (a) load `vendor_work_orders` as a `master` in a new `RE-PM-MAINTENANCE` module (the FSM handoff stays for dispatch but the work-order record stays here); (b) keep FSM as the canonical master and add `vendor_work_orders` as `embedded_master + optional` on RE-PM-MAINTENANCE (single-platform residential operators install both, the embedded shell deploys when FSM is absent).

7. **Pairwise reconciliation rerun.** With the M-band still failing, the per-neighbor 5-section diff (Pass 4 deep dive) is meaningless for every neighbor. After M-band ships, re-running Pass 4 against RE-INVEST (the highest-weight neighbor at 2) and against RE-BROKERAGE (the only inbound source) is the right next step. Independent of Buckets 1 and 3.

### Bucket 3, Phase 0 pending (speculative)

Candidates surfaced from vendor knowledge but not yet anchored to a formal Phase 0 vendor-surface document. Vetting path: (a) formal Phase 0 protocol (focused research on AppFolio + Buildium + Yardi Breeze schemas), or (b) eyeball-mode user selection.

| # | Candidate entity | Proposed module | Vendor evidence | Notes |
|---|---|---|---|---|
| B3-1 | `pet_profiles` | RE-PM-LEASING-PIPELINE | AppFolio, Buildium, Entrata | Pet weight, breed, vaccination records; ties to pet rent and pet deposits. Universal in modern flagships. |
| B3-2 | `renters_insurance_certificates` | RE-PM-LEASING-PIPELINE | AppFolio, Buildium, RealPage | Required by most leases; certificate of insurance with policy holder + coverage limits. |
| B3-3 | `owner_statements` | RE-PM-PROP-ACCOUNTING | All 7 vendors | Periodic statement to the property owner (separate from the cash distribution; the statement is the rendered artifact). |
| B3-4 | `resident_portal_messages` | RE-PM-MAINTENANCE | AppFolio, Buildium, Entrata, RealPage | Inbox / message thread in the resident-facing portal. Possible scope-creep from CSM; defer to vendor-research vetting. |
| B3-5 | `lease_renewal_offers` | RE-PM-LEASING-PIPELINE | AppFolio, RealPage, Entrata | Pre-expiration outreach offering renewal terms; distinct from `rental_leases.renewed` lifecycle state. |
| B3-6 | `payment_methods` (stored tenant ACH / credit card) | RE-PM-RENT-COLLECTION | All 7 vendors | Stored payment-method registry, PCI-scoped. May map to a cross-cutting payment-tokenization platform or stay local. |

### Cross-bucket dependencies

- Bucket 1 STRUCTURAL B1-S1 through B1-S4 (M-band failures) block every B and F band fix. Bucket 2 #1 (module split) is the prerequisite, the rest of Bucket 1 lands afterwards.
- Bucket 1 MISSING entities B1-M1 and B1-M2 (`tenant_screening_reports`, `fcra_adverse_action_notices`) depend on Bucket 1 B1-M7 (FCRA `domain_regulations` link). Load regulations link before the entities.
- Bucket 2 #1 (module split) determines the `proposed_module` for every Bucket 1 MISSING entity. If the user picks option (b) or (c), the column needs re-mapping.
- Bucket 2 #6 (`vendor_work_orders` placement) determines whether the `RE-PM-MAINTENANCE` module masters or embeds. Independent of Bucket 3.
- Bucket 3 candidates B3-1, B3-2, B3-5 will likely land as Bucket 1 once vetted; B3-4 may be rejected as CSM scope-creep. Independent of Bucket 2 decisions.

### Per-bucket prompts

After surfacing Bucket 1: *"Fix these now? Reply 'all', 'just <ids>', or 'skip'. Note that 13 of the 17 Bucket 1 items depend on Bucket 2 #1 (module split), so I will need that decision first."*

After surfacing Bucket 2: *"What's your call on each of items 1 to 7? I will wait for your decision per item before acting. For item 2 (catalog UX drafts) please approve, edit, or rewrite the exact wording per Rule #20."*

After surfacing Bucket 3: *"Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates to treat as confirmed and I will roll them into Bucket 1 on the next pass."*

### Report-only follow-ups (owed by other domains)

Inbound dependencies and partner-side fixes that route to other domains' audits.

| Owing domain | Owed | Notes |
|---|---|---|
| RE-INVEST | B10b `target_domain_module_id` PATCH on handoffs 301 and 864 | Once RE-INVEST modularizes its rent-roll / owner-distribution module. |
| AP-AUTO | Consumer DMDO row on `rent_payments` (or on `owner_distributions` once B1-U1 lands) | AP receives the payable side of the owner distribution. |
| FSM | Consumer DMDO row on `tenant_maintenance_requests` plus the `target_domain_module_id` PATCH on handoff 299 | FSM owns the work-order dispatch. |
| LSD | Consumer DMDO row on `property_tenants` plus `target_domain_module_id` PATCH on handoff 300 | LSD owns the eviction-case legal matter. |
| GRC | Consumer DMDO row on `property_tenants` plus `target_domain_module_id` PATCH on handoff 310 | GRC owns the fair-housing fair-treatment audit trail. |
| ERP-FIN | Consumer DMDO row on `rental_leases` (or on `lease_charges` if B1-U2 lands) plus `target_domain_module_id` PATCH on handoff 864 | ERP-FIN owns the GL posting. |
| CSM | Consumer DMDO row on `rental_units` plus `target_domain_module_id` PATCH on handoff 865 | CSM owns the resident-services ticket. |
| RE-BROKERAGE | B6 mirror, `real_estate_transactions` spawns `rental_units` (relationship row needs the in-domain leg on RE-BROKERAGE's audit) | Symmetric to the existing `rental_units` opens-from `customer_cases` row (id 473), which itself looks mis-pointed (related_data_object_id=103 is `customer_cases` not `real_estate_transactions`); flag for RE-BROKERAGE audit. |

Two missing-domain candidates surfaced and queued via `scripts/analytics/append_missing_domain.ts`:

- **HOA-MGMT** (Homeowner Association Management): FrontSteps, AppFolio Condo, CINC Systems, Buildium Association, PayHOA, Vantaca. Adjacency RE-PROP-MGMT, ERP-FIN, LSD. Surface includes owner-roster management, board governance, architectural review, dues collection, reserve studies, violation tracking, community communications.
- **STR-MGMT** (Short-Term Rental Management): Guesty, Hostaway, Lodgify, Hospitable, Hostfully, OwnerRez. Adjacency RE-PROP-MGMT, HOSP-PMS, RE-INVEST. Surface includes channel-manager syndication, dynamic pricing, guest messaging, cleaning-team scheduling, occupancy-tax remittance, OTA payout reconciliation.

Both queued; triage at the next missing-domains review.

## 2026-05-31, Continuation: B1 technical fixes

Loader: [.tmp_deploy/fix_re_prop_mgmt_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_re_prop_mgmt_b1_technical_2026_05_31.ts) (run from project root).

### Applied (technically deterministic, audit pre-specified)

| Fix | Detail | Rows |
|---|---|---|
| B1-S8 (B9 enum backfill) | PATCH `trigger_events.event_category` on ids 957/958/959/960/961 per audit-pre-specified mapping (lifecycle/state_change). | 5 |
| B1-S7 (B7 users edges, Rule #10) | INSERT `data_object_relationships` from `users` (id 748) to RE-PROP-MGMT masters: manages rental_units (357), assigned maintenance requests (361), reviewed applications (359), approved applications (359), recorded rent payments (360). `owner_side=target`, `one_to_many`, `reference`. | 5 |
| B1-M7 (FCRA link) | INSERT `domain_regulations` row (`domain_id=144`, `regulation_id=84`, `applicability=mandatory`). | 1 |
| B1-S11 (B11 aliases) | INSERT `data_object_aliases`: rental_units (Apartment, Unit, Door), property_tenants (Resident, Renter, Lessee), rental_applications (Application, Lease App), rental_leases (Lease, Rental Agreement). | 10 |
| APQC TAGGING | INSERT `handoff_processes` for confident/medium L3/L4 pairs the audit pre-specifies and that lacked the exact (handoff_id, process_id) pair: 298→303, 864→1353, 300→1627, 301→1351. All `proposal_source=agent_curated`, `record_status=new`. Handoff 296→1860 and 299→824 were already tagged; 310 and 865 deferred per audit. | 4 |

Total: 25 rows touched (5 PATCH + 20 INSERT). All inserts ship `record_status='new'` per Rule #1; all `notes` columns left empty per Rule #15.

### Deferred (per run-prompt deferral list)

- **M-band (B1-S1, B1-S2, B1-S3, B1-S4)**: new `domain_modules` + Rule #20 catalog UX backfill. Gated on Bucket 2 #1 (module split decision) and #2 (catalog UX wording).
- **B1-S5**: no action (prefixed names pass automatically).
- **B1-S6 (intra-domain relationships)**: audit lists 7 edges in prose, but does not pre-specify the per-edge `owner_side`, `relationship_kind`, `is_required` tuples; judgment per edge needed.
- **B1-S9 (missing handoffs for delinquent/listed/executed/renewed/occupied)**: new handoffs without pre-specified handoff_id, also gated on missing target modules.
- **B1-S10 (B10b FK PATCHes)**: `source_domain_module_id` blocked by zero RE-PROP-MGMT modules; `target_domain_module_id` not derivable. Confirmed live: target domains AP-AUTO (29), LSD (25), RE-INVEST (146), GRC (15), ERP-FIN (65) have zero `domain_modules`; CSM modules (112-114) and FSM modules (161-163) do not hold any RE-PROP-MGMT payload data_object via `domain_module_data_objects` (handoff 299's `target_domain_module_id=161` was already set pre-audit and is left as-is).
- **B1-S12 (lifecycle states)**: per-state `domain_module_id` required by Rule #14 and M5; blocked by M-band.
- **B1-S13 (F1 legacy skill 98)**: gated on Phase S authoring per-module replacements first.
- **B1-M1, B1-M2, B1-M3, B1-M4, B1-M5**: new entities, deferred (new modules also needed).
- **B1-M6 (Fair Housing Act regulation)**: new `regulations` entity, plus applicability decision is Bucket 2 #3 (mandatory vs mandatory-with-exemptions).
- **B1-U1 ... B1-U7**: new entities.
- **B1-WO1 (supplier_invoices contributor → consumer reclassification)**: audit says "Likely scope-creep"; judgment.
- **B1-B1, B1-B2 (boundary)**: gated on M-band.
- **APQC 310, 865**: audit explicitly defers to Discover Pass 3 (no clean PCF cross-industry match).
- **`notes` reverts**: audit does not pre-specify row IDs to revert; Rule #15 carve-out requires named rows.

### Verification

Spot queries confirm: 5 trigger_events now carry valid `event_category` enum values; 5 new `data_object_relationships` rows on `users` to RE-PROP-MGMT masters (ids 1907-1911); 1 new `domain_regulations` row (id 272) linking FCRA at `mandatory`; 10 new `data_object_aliases`; 4 new `handoff_processes` (totaling 7 tags across 5 distinct handoffs including the pre-existing 296, 299, 301 rows).

UI:
- https://tests.semantius.app/domain_map/trigger_events
- https://tests.semantius.app/domain_map/data_object_relationships
- https://tests.semantius.app/domain_map/domain_regulations
- https://tests.semantius.app/domain_map/data_object_aliases
- https://tests.semantius.app/domain_map/handoff_processes

## 2026-05-31, Audit

### Summary

Validate b1 structural audit (passes A, M, B, C, D, E, F, H) against live state via `semantius` CLI. Re-run after the 2026-05-31 Continuation loader landed 25 rows. **The M-band still fails outright** (zero `domain_modules` for `domain_id=144`); every downstream band inherits that gate.

- Current footprint: 6 master data_objects (`rental_units` 357, `property_tenants` 358, `rental_applications` 359, `rent_payments` 360, `tenant_maintenance_requests` 361, `rental_leases` 362) plus 1 contributor (`supplier_invoices` 75, mastered by S2P); 6 capabilities (RE-PM-TENANT-SCREENING, RE-PM-RENT-COLLECTION, RE-PM-MAINT-REQUEST, RE-PM-LEASING-PIPELINE, RE-PM-PROP-ACCOUNTING, RE-PM-VACANCY-MARKETING); 7 solutions (AppFolio Property Manager, Buildium, Yardi Breeze, Entrata Platform, RealPage Property Management, Rent Manager, Yardi Voyager); **0 `domain_modules` rows**; 1 `domain_regulations` (FCRA, applicability=mandatory, loaded 2026-05-31 Continuation); 4 `business_function_domains` (Business Operations owner, AR contributor, Customer Service contributor, Finance consumer); 10 trigger events (rows 287, 288, 289, 290, 291, 957, 958, 959, 960, 961, all with valid `event_category`); 7 outbound handoffs (298 to AP-AUTO, 299 to FSM, 300 to LSD, 301 to RE-INVEST, 310 to GRC, 864 to ERP-FIN, 865 to CSM); 1 inbound handoff (296 from RE-BROKERAGE); 10 `data_object_aliases` across 4 masters; 1 legacy domain-level system skill `re-prop-mgmt-system` (id 98) with 8 `skill_tools` rows; 0 module-level system skills (gated on M-band).
- Bucket 1 (in-scope, agent fixable): **18 items**. Carry-forward majority plus one new finding (B1-S14: existing `data_object_relationships` row 473 looks mis-pointed). Items B1-S5 (B3 pre-prefixed) and the initial B1-S7 / B1-S8 / B1-S11 / B1-M7 / 4 APQC rows are dropped, having been applied 2026-05-31 Continuation.
- Bucket 2 (surface-for-user, judgment): 7 items (carry forward from 2026-05-30).
- Bucket 3 (Phase 0 pending, speculative): 6 items (carry forward).

### Pass-by-pass results

| Band | Pass / Fail | Notes |
|---|---|---|
| S1 | partial | `domain_modules` zero rows = expected-non-zero anomaly. Routes to M1. |
| S2 | n/a | Vacuously passes; no modules to sweep. |
| S3 | fail | Per-master sweep: every master is at 0 lifecycle states + ~1 trigger event + 0 to 3 aliases. Routes to B12 / B9 / B11. |
| A1 | pass | All seven business-metadata fields populated (`crud_percentage=85`, `min_org_size=10 xs <50`, `cost_band=$$`, `usa_market_size_usd_m=2500`, `market_size_source_year=2024`, `business_logic` non-empty, `certification_required=false`). |
| A2 | pass | 6 capabilities (≥3). |
| A3 | pass | 7 solutions all at `coverage_level=primary` (≥3 with ≥1 primary). |
| A4 | fail | `catalog_tagline` and `catalog_description` still empty. Carry-forward; Bucket 2 #2 has draft wording awaiting approval per Rule #20. |
| M1 | fail | Zero `domain_modules` rows. Root cause for every downstream gap; blocks M2/M4/M5/M6/M8, B8 / B9b / B10b source-side / B12 attribution, E1-E6, F2-F5. |
| M2 | fail | Capability count 6 mandates ≥2 full modules. |
| M4 | fail | All 6 capabilities are capability-orphaned (no realizing module). |
| M5 | n/a | No lifecycle states authored to test attribution. |
| M6 | n/a | No modules to test reverse coverage. |
| M7 | pass | 6 masters each have 0 module-level master rows so the catalog-wide single-master query returns empty (no duplicates). Will need re-verification once Phase A modules land. |
| M8 | n/a | No modules. |
| B1 | pass | 6 masters loaded. |
| B2 | pass | Every master has `singular_label` + `plural_label`. |
| B3 | pass | Every master is prefixed (`rental_units`, `property_tenants`, `rental_applications`, `rent_payments`, `tenant_maintenance_requests`, `rental_leases`); no bare-word canonical claim required. |
| B5 | n/a | 0 `embedded_master` rows in the domain footprint to integrity-check. |
| B7 | pass | 5 `users` edges loaded 2026-05-31 (ids 1907 to 1911: manages `rental_units`, assigned `tenant_maintenance_requests`, reviewed `rental_applications`, approved `rental_applications`, recorded `rent_payments`). |
| B9 | partial | 10 trigger events loaded; all 5 originally-empty `event_category` values backfilled. **B9 sub-gap**: events 289 (`rent_payment.delinquent`), 957 (`rental_unit.listed`), 958 (`rental_unit.occupied`), 960 (`rental_lease.executed`), 961 (`rental_lease.renewed`) have zero handoff rows. Carry-forward as B1-S9. |
| B9b | n/a | Zero modules so no intra-domain cross-module surface to verify. |
| B10b | fail | Every outbound handoff (298, 299, 300, 301, 310, 864, 865) carries `source_domain_module_id=null`. Inbound handoff 296 carries `target_domain_module_id=null`. Root cause is M1. |
| B11 | partial | 4 masters (`rental_units`, `property_tenants`, `rental_applications`, `rental_leases`) carry aliases (10 rows total). 2 masters (`rent_payments`, `tenant_maintenance_requests`) carry zero aliases. New sub-gap B1-S11b. |
| B12 | fail | Zero `data_object_lifecycle_states` rows on any of the 6 masters. Blocked by M-band (per-state `domain_module_id` requires modules). |
| C1 | pass | 4 `business_function_domains` rows (1 owner, 2 contributors, 1 consumer). |
| C2 | n/a | No capability whose owning function diverges from the domain owner identified. |
| D1 | report-only | UI spot-check is for user follow-up. |
| E1 to E6 | n/a | No modules so no domain-side roles; the 2-module floor is unreachable. |
| F1 | fail | Legacy domain-level system skill `re-prop-mgmt-system` (id 98) still present. Acceptable transitional state ONLY while no module-level system skills exist; retires after Phase S authors per-module replacements. |
| F2 to F5 | n/a | No `domain_modules` rows so module-grain F-band checks are vacuous. |
| H1 | partial-pass | 7 `handoff_processes` rows cover 6 of the 8 cross-domain handoffs (inbound 296 to 1860; outbound 298 to 303, 299 to 824, 300 to 1627, 301 to 1351 and 1356, 864 to 1353). Outbound 310 (to GRC) and 865 (to CSM) explicitly deferred to Discover Pass 3 (no clean PCF cross-industry match). All `record_status='new'` so headline approved count is 0; provenance count is 7 `agent_curated`. Pass-with-deferrals per H1 criteria. |

### Bucket 1, In-scope confirmed gaps (carry-forward + new)

#### STRUCTURAL

| ID | Band | Finding | Fix surface |
|---|---|---|---|
| B1-S1 | M1 | Zero `domain_modules` rows on `domain_id=144`. | Author module set on Bucket 2 #1 approval; POST `domain_modules`. |
| B1-S2 | M2 | 6 capabilities, 0 modules; Rule #14 needs at least two full modules. | Resolves with B1-S1. |
| B1-S3 | M4 | All 6 capabilities orphaned. | Author `domain_module_capabilities` after B1-S1. |
| B1-S4 | A4 | `catalog_tagline` + `catalog_description` empty. | Apply Bucket 2 #2 wording per Rule #20. |
| B1-S6 | B6 | Zero intra-domain `data_object_relationships` among 6 masters. Expected 7 edges (see 2026-05-30 narrative). | Draft 7 edges + load via cluster-drafts pattern. |
| B1-S9 | B9 | 5 trigger events (289, 957, 958, 960, 961) have no subscriber handoff. | Author missing handoffs (delinquent to CSM/collections, listed to CSM/CDP/vacancy syndication, executed to RE-INVEST, renewed to RE-INVEST). Gated on target modules existing. |
| B1-S10 | B10b | All 7 outbound handoffs carry `source_domain_module_id=null`; inbound 296 carries `target_domain_module_id=null`. | Derives after M-band lands. |
| B1-S11b | B11 | Two masters still have no aliases (`rent_payments`, `tenant_maintenance_requests`). Candidates: `rent_payments` (Rent Charge, Payment, Receipt); `tenant_maintenance_requests` (Work Order, Maintenance Ticket, Service Request). | Author 4 to 6 more alias rows. |
| B1-S12 | B12 | Zero `data_object_lifecycle_states` rows on the 6 masters. | Draft state machines per master; blocked on M-band for per-module attribution. |
| B1-S13 | F1 | Legacy domain-level skill 98 still present. | DELETE after Phase S authors per-module replacements. |
| B1-S14 | B6 | Existing `data_object_relationships` row 473 (`rental_units` opens `customer_cases` 103, inverse `opened_from`) appears mis-pointed: payload should be `real_estate_transactions` (353), not `customer_cases` (103). Promoted from 2026-05-30 "report-only" to in-scope (source row sits on a RE-PROP-MGMT master). | Either PATCH `related_data_object_id` to 353 (if intended edge is property handover from a closed sale) OR DELETE the row. User judgment. |

#### MISSING

Carry-forward, unchanged:

| ID | Entity | Proposed module (per 2026-05-30 split) | Regulation / driver |
|---|---|---|---|
| B1-M1 | `tenant_screening_reports` | RE-PM-TENANT-SCREENING | FCRA |
| B1-M2 | `fcra_adverse_action_notices` | RE-PM-TENANT-SCREENING | FCRA |
| B1-M3 | `fair_housing_inquiries` | RE-PM-LEASING-PIPELINE | Fair Housing Act |
| B1-M4 | `security_deposits` | RE-PM-RENT-COLLECTION | State landlord-tenant statutes |
| B1-M5 | `eviction_cases` | RE-PM-RENT-COLLECTION | State eviction statutes |
| B1-M6 | Fair Housing Act regulation row + `domain_regulations` link | regulations + junction | Bucket 2 #3 (applicability) |
| B1-U1 | `owner_distributions` | RE-PM-PROP-ACCOUNTING | Universal-vendor |
| B1-U2 | `lease_charges` | RE-PM-RENT-COLLECTION | Universal-vendor |
| B1-U3 | `late_fee_assessments` | RE-PM-RENT-COLLECTION | Universal-vendor |
| B1-U4 | `move_in_inspections` | RE-PM-LEASING-PIPELINE | Universal-vendor |
| B1-U5 | `move_out_inspections` | RE-PM-LEASING-PIPELINE | Universal-vendor |
| B1-U6 | `property_owners` | RE-PM-PROP-ACCOUNTING | Universal-vendor |
| B1-U7 | `rental_listings` | RE-PM-VACANCY-MARKETING | Universal-vendor |

#### WRONG-OWNERSHIP

| ID | Entity | Current | Proposed | Notes |
|---|---|---|---|---|
| B1-WO1 | `supplier_invoices` (id 75) | `contributor + required` on RE-PROP-MGMT | `consumer + optional` | RE-PROP-MGMT reads AP-paid status; doesn't write supplier_invoices. Carry-forward from 2026-05-30. |

#### BOUNDARY

| ID | Finding | Fix |
|---|---|---|
| B1-B1 | 7 outbound handoffs carry `source_domain_module_id=null`. | M-band gated. |
| B1-B2 | Inbound handoff 296 carries `target_domain_module_id=null`. | M-band gated. |

#### APQC TAGGING

H1 pass-with-deferrals. 7 rows already loaded (`agent_curated` / `new`) covering 6 of 8 cross-domain handoffs. Deferred handoffs:

| handoff_id | Source to target | Trigger event | Defer reason |
|---|---|---|---|
| 310 | RE-PROP-MGMT to GRC | `rental_application.approved` | Fair-housing fair-treatment audit not in PCF cross-industry; custom-process authoring in Discover Pass 3. |
| 865 | RE-PROP-MGMT to CSM | `rental_unit.vacant` | Resident-side service ticket from vacancy event is industry-specific; no clean L2/L3 PCF parent. |

### Bucket 2, Surface-for-user (judgment calls)

Carry-forward from 2026-05-30, restated tersely. Per-item options unchanged; no item resolved.

1. **Module split design** for the M1 fix. 6-module shape (RE-PM-TENANT-SCREENING / RE-PM-LEASING-PIPELINE / RE-PM-RENT-COLLECTION / RE-PM-MAINTENANCE / RE-PM-PROP-ACCOUNTING / RE-PM-VACANCY-MARKETING) vs collapse vacancy-marketing into leasing-pipeline for a 5-module shape vs alternative. Gates B1-S1/S2/S3 and re-maps every MISSING entity's `proposed_module`.
2. **Catalog UX wording** (A4, Rule #20). Draft tagline + 1-3 paragraph description awaiting approve / edit / rewrite.
3. **Fair Housing Act applicability** on the `domain_regulations` row: `mandatory` catalog-wide vs `mandatory_with_exemptions` (owner-occupied small, religious). Gates B1-M6.
4. **State landlord-tenant strategy.** Single umbrella `state_landlord_tenant_statutes` regulation vs deferred per-jurisdiction modeling.
5. **Pattern-flag re-evaluation** per Rule #12: `rental_applications.has_personal_content=true`, `rental_leases.has_submit_lock=true`, `tenant_screening_reports.has_personal_content=true` (after B1-M1 lands). All 6 current masters carry every flag false-by-default; positive confirmation owed before flipping.
6. **`vendor_work_orders` placement.** Master in RE-PM-MAINTENANCE vs `embedded_master + optional` (FSM canonical).
7. **Pairwise reconciliation rerun.** Re-run Pass 4 against RE-INVEST (edge weight 2) and RE-BROKERAGE (only inbound source) once M-band lands. Independent.

### Bucket 3, Phase 0 pending (speculative)

Carry-forward, unchanged.

| # | Candidate entity | Proposed module | Vendor evidence |
|---|---|---|---|
| B3-1 | `pet_profiles` | RE-PM-LEASING-PIPELINE | AppFolio, Buildium, Entrata |
| B3-2 | `renters_insurance_certificates` | RE-PM-LEASING-PIPELINE | AppFolio, Buildium, RealPage |
| B3-3 | `owner_statements` | RE-PM-PROP-ACCOUNTING | All 7 flagships |
| B3-4 | `resident_portal_messages` | RE-PM-MAINTENANCE | AppFolio, Buildium, Entrata, RealPage |
| B3-5 | `lease_renewal_offers` | RE-PM-LEASING-PIPELINE | AppFolio, RealPage, Entrata |
| B3-6 | `payment_methods` | RE-PM-RENT-COLLECTION | All 7 flagships |

### Cross-bucket dependencies

- Bucket 2 #1 (module split) is the prerequisite for B1-S1 / B1-S2 / B1-S3 / B1-S9 / B1-S10 / B1-S12 / B1-S13 / every MISSING entity's `proposed_module` mapping / E and F bands. Almost the entire Bucket 1 fix tree gates on it.
- Bucket 2 #2 (catalog UX wording) is the prerequisite for B1-S4.
- Bucket 2 #3 (FHA applicability) is the prerequisite for B1-M6.
- Bucket 1 MISSING B1-M1, B1-M2 depend on FCRA-linked tenant-screening module landing (FCRA itself is now linked; FHA is the unresolved part).
- Bucket 3 candidates B3-1, B3-2, B3-5 plausibly migrate to Bucket 1 once eyeball-mode or Phase 0 vets them.

### Report-only follow-ups (owed by other domains)

Unchanged from 2026-05-30. Inbound module-FK gaps and partner-side consumer DMDO rows owed by AP-AUTO, FSM, LSD, RE-INVEST, GRC, ERP-FIN, CSM, RE-BROKERAGE. Each routes to those domains' own audits.

### Per-bucket prompts

After surfacing Bucket 1: *"Fix these now? Reply 'all', 'just <ids>', or 'skip'. Note that 9 of 18 Bucket 1 items still gate on Bucket 2 #1 (module split); I will need that decision before authoring B1-S1/S2/S3/S9/S10/S12/S13 plus every MISSING entity in its proposed module."*

After surfacing Bucket 2: *"What's your call on items 1 to 7? I will wait per item before acting. For item 2 (catalog UX) please approve / edit / rewrite the exact wording per Rule #20."*

After surfacing Bucket 3: *"Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates to treat as confirmed and I will roll them into Bucket 1 on the next pass."*
