# CAFM audit history

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- Current footprint: **0 modules, 0 DMDOs, 0 mastered data_objects, 0 trigger_events, 0 handoffs (inbound or outbound), 0 regulations, 0 business_function_domains, 0 skills, 0 roles**. Only 3 capabilities (`REAL-SPACE-OPTIM`, `REAL-MAINTENANCE`, `REAL-OCCUPANCY-ANALYTICS`, all shared with sibling IWMS and parent REAL-EST) and 5 solutions (Archibus, Nuvolo CMMS, Tango Workplace, Officespace, Accruent Resolute, all also linked to REAL-EST and most also to IWMS).
- Domain row metadata IS populated (`crud_percentage=90`, `cost_band=$$`, `min_org_size=20 s <500`, `usa_market_size_usd_m=400`, `market_size_source_year=2025`, `business_logic='Reservation engines and basic workflow.'`), but `catalog_tagline` and `catalog_description` are empty (A4 fail).
- Vendor-surface basis (subagent-free, derived from the user's own market knowledge plus the existing CAFM `solutions` rows): Archibus, Nuvolo, Tango Workplace, Officespace, Accruent Resolute, FMX, Eptura (Eptura already linked via REAL-EST/IWMS), iOFFICE+SpaceIQ. SMB-focused CAFM specialists. None are FCRA / HIPAA / SOX-regulated; light statutory anchor (OSHA + ADA for accessibility; sector-specific EHS overlay when deployed in regulated industries).
- **Bucket 1 (in-scope, agent fixable):** 9 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 2 items.
- Candidates queued: 1 (`ENERGY-MGMT`).
- Catalog Semantius score: uncomputable (F5 rollup): no modules, no skills, no skill_tools.

Structural verdict: CAFM is a near-empty shell. Pass 1 (structural) fails the M-band at M1 (zero modules) and cascades into every downstream band (B / C / E / F / H). The S-band coverage sweep returns all-zero rows on every "expected non-zero" FK. The market-audit pass (Pass 2) surfaces the dominant question: **CAFM and IWMS share three capabilities (374/376/377), 5+ overlapping vendors (Archibus, Nuvolo CMMS, Eptura via the REAL-EST link, Accruent, Officespace), and an overlapping market scope** (`Computer-Aided Facility Management` self-describes as light-tier facilities management vs `Workplace and Space Management` for workplace booking, space optimisation, real-estate management, visitor handling). This is a Bucket 2 modularization-judgment item, not a Bucket 1 fix. Passes 3 and 4 (neighbor discovery and pairwise reconciliation) return empty: with zero handoffs and zero DMDOs, CAFM has no auto-discoverable neighbors.

### Vendor surface basis

CAFM and IWMS draw from a heavily overlapping vendor pool. The CAFM specialist tilt is toward mid-market and SMB facilities tools (Archibus desktop / web, Nuvolo CMMS, FMX, Officespace, Tango Workplace, Accruent Resolute) while IWMS draws on enterprise IWMS platforms (IBM TRIRIGA, Planon, MRI OnCore, Eptura, Spacewell, Honeywell Forge). The "light vs heavy" line the CAFM description draws (`lighter on utility tracking and lease accounting than IWMS`) maps roughly to the SMB vs enterprise split, but every flagship vendor on either side serves both tiers with packaging differences, not capability differences. Pure-play CAFM specialists with a credible product separation from IWMS are rare; the cleanest is FMX (k12 / mid-market facilities, no lease accounting at all), but FMX competes against Eptura's SMB packaging more than against TRIRIGA.

### Pass 3 - Neighbor discovery

No neighbors auto-discoverable from CAFM directly (zero outbound or inbound handoffs in the catalog). Indirect neighbor signal via shared capabilities and solutions points at:

| Domain | Edge weight | Signal source |
| --- | --- | --- |
| IWMS (23) | very high (overlap-not-edge) | Shared capabilities 374 / 376 / 377; overlapping vendors (Archibus, Eptura, Accruent, Officespace); market-scope overlap. Not handoff edges (CAFM owns nothing to publish); structural overlap. |
| REAL-EST (141, parent) | indirect | Parent domain; all CAFM solutions are also REAL-EST solutions. REAL-EST itself has zero modules. |
| VIS-MGMT (24) | implied | CAFM market routinely embeds visitor management; VIS-MGMT canonically masters visitor_registrations / check_ins / badges / NDA / watchlist / audit. |
| EAM (53) | implied | CAFM "maintenance ticketing" overlaps with EAM `equipment_maintenance` patterns; canonical industrial EAM masters live in EAM domain. |
| FSM (31) | implied | Field-service dispatch on facility work orders; FSM masters the dispatched-tech workflow. |

No pairwise reconciliation possible until CAFM has at least one module + at least one master with lifecycle states. **Pass 4 is therefore non-applicable for this audit cycle.** Re-run after the M-band fix lands.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 | Zero `domain_modules` rows for CAFM. Domain row exists but is not deployable. M-band gate blocks every downstream concern (B / C / E / F / H). | Author at least one `module_kind='full'` row. With 3 capabilities (M2 says <3 capabilities = exactly 1 module; CAFM is on the boundary), the recommendation is a single full module `CAFM-FACILITY-OPS` covering desk-bookings + room-reservations + facility-maintenance + occupancy-tracking, OR two modules (`CAFM-SPACE-OPS` and `CAFM-MAINTENANCE-OPS`) if the user judges the three capabilities have enough distinct workflow to warrant splitting. Cross-references Bucket 2 #1 (the fold-into-IWMS judgment): if user chooses to fold CAFM into IWMS, this fix is moot (CAFM is dissolved). |
| B1-S2 | A4 | `catalog_tagline` and `catalog_description` are both empty. Rule #20 requires both populated in buyer voice (workflow + value, not analyst voice). | Draft both per Rule #20, surface to user for review BEFORE writing. Conditional on Bucket 2 #1 resolution (no point drafting buyer-facing copy for a domain that may be dissolved). |
| B1-S3 | C1 | Zero `business_function_domains` rows. CAFM has no recorded owner function. | Add owner row: `FACILITIES` (`responsibility_type=owner`). Contributors: `IT` (workplace tech), `HR` (employee experience). Single PATCH-equivalent insert via the standard pattern. |
| B1-S4 | B-band (no masters) | Zero `domain_data_objects` rows. CAFM masters nothing despite the description claiming "desk booking, simple space allocation, maintenance ticketing, visitor management". Either (a) CAFM legitimately embedded-masters everything from IWMS / EAM / VIS-MGMT (which makes it indistinguishable from a deployment configuration of those domains, the Bucket 2 #1 question), or (b) CAFM has its own light-tier masters that simply aren't loaded yet. | After Bucket 2 #1 resolves and Bucket 1 B1-S1 lands a module, follow the data-object research workflow (SKILL.md § Phase 1) to enumerate CAFM-specific masters or `embedded_master` shells. Candidates: `desk_bookings` (IWMS canonical, embedded_master in CAFM), `room_reservations` (IWMS canonical, embedded_master in CAFM), `facility_work_orders` (REAL-EST canonical, embedded_master or `contributor` in CAFM), `visitor_registrations` and siblings 668-675 (VIS-MGMT canonical, embedded_master in CAFM), `locations` (IWMS canonical, embedded_master in CAFM), plus one CAFM-mastered light-tier candidate `facility_service_requests` (the SMB version of `workplace_service_requests` if CAFM stays distinct). |
| B1-S5 | F-band (no system skills) | Zero `skills` rows. F2 requires exactly one `skill_type='system'` per `domain_modules` row; with zero modules the floor is also zero, but the audit gap is real: the catalog cannot compute a Semantius score for CAFM at all. | Conditional on B1-S1: when modules ship, author one system skill per module (per Rule #17) with skill_name = `<module_code_lower>_agent` and at least one `skill_tools` row each. |
| B1-S6 | E-band (no roles) | Zero `roles` rows touching any CAFM module. E1 vacuously passes for a single-module domain (<3 capabilities); however CAFM sits at the 3-capability boundary, so if the user chooses the 2-module split in B1-S1 the E-band activates and needs at least 3 distinct roles. | Conditional on B1-S1 resolution. Candidate roles in the multi-module scenario: `FACILITY-COORDINATOR`, `FACILITIES-MANAGER`, `WORKPLACE-USER`. |
| B1-S7 | A2 (capability ↔ module mapping) | The three existing CAFM capabilities (374/376/377) are not linked to any module because no module exists (M4 fail by virtue of M1 fail). The catalog therefore cannot answer "which CAFM module realizes Space Optimization?". | Conditional on B1-S1: once modules ship, populate `domain_module_capabilities` for each capability ↔ realizing module. The shared-with-IWMS shape suggests the cross-cutting capability convention (SKILL.md § Cross-cutting capability convention) may already apply: `REAL-SPACE-OPTIM`, `REAL-MAINTENANCE`, `REAL-OCCUPANCY-ANALYTICS` are domain-prefixed but already span ≥3 domains (REAL-EST, IWMS, CAFM), so the rename-to-domain-neutral option (e.g. `SPACE-OPTIMIZATION`, `FACILITY-MAINTENANCE`, `OCCUPANCY-ANALYTICS`) may be the correct cleanup. Routes through Bucket 2 #2. |
| B1-S8 | H1 (APQC tagging) | Zero cross-domain handoffs published or received. H1 volume expectation (0.5N to 0.8N tags for N handoffs) collapses to N/A for the current state. **H1 is not optional**: the finding is "H1 not applicable until CAFM publishes handoffs", logged so future audits revisit. | Conditional on B1-S1 + B1-S4: once CAFM has masters with lifecycle states, Phase B9 produces trigger_events and handoffs; APQC tagging then runs in the next audit cycle. |

#### MISSING entities (vendor-surface gap, agent-fixable once Bucket 2 #1 resolves)

| ID | Entity | Proposed module | Vendor evidence |
|---|---|---|---|
| B1-M1 | `facility_service_requests` (SMB-tier work request, lighter than `workplace_service_requests`) | `CAFM-MAINTENANCE-OPS` (or single full module) | Archibus (Service Request module), FMX (Maintenance Request), Officespace (Service Tickets). Distinct from IWMS `workplace_service_requests` only if CAFM stays separate; if folded into IWMS, this entity is the IWMS-mastered one. |

(Other masters CAFM should hold are `embedded_master` shells, not new entities; those are wiring, not catalog inserts; they go in B1-S4's fix.)

#### WRONG-OWNERSHIP

None observable: CAFM owns nothing, so nothing is mis-owned.

#### SCOPE-CREEP

None observable: same reason.

#### BOUNDARY

None observable: zero handoffs.

#### APQC TAGGING

Not applicable to this audit cycle: CAFM publishes zero cross-domain handoffs to tag. Re-runs after B1-S1 lands.

### Bucket 2 - Surface-for-user (judgment calls)

1. **Fold CAFM into IWMS, or keep distinct?** This is the dominant question of the audit. Evidence for fold: shared capabilities 374/376/377; vendor overlap (Archibus, Nuvolo, Eptura via REAL-EST link, Officespace, Accruent); overlapping market scope per the two `description` columns; zero distinct masters loaded for CAFM; the SMB-vs-enterprise distinction is a packaging axis, not a capability axis. Evidence for keep-distinct: the SMB market is real (FMX, Officespace, Tango target it specifically); the market-size column (CAFM 400 USDM vs IWMS 1500 USDM) suggests Gartner / IDC treat them as separate quadrants; `min_org_size` differs (`20 s <500` for CAFM vs whatever IWMS reads); the "light on utility tracking and lease accounting" anchor is a real product-level distinction. Options:
   - (a) **Keep CAFM, modularize it.** Author 1 or 2 modules per B1-S1, populate B1-S3 / S4 / S5 / S6 / S7, surface the buyer-facing tagline + description (B1-S2), revisit in 3 months.
   - (b) **Fold CAFM into IWMS as a deployment tier.** Promote IWMS's smallest-org-size to encompass the SMB tier; transfer CAFM's vendor links (Archibus etc.) to IWMS where they aren't already; queue CAFM `domain_code` for retirement (the row stays for backreference history per Rule #1, marked `record_status='rejected'` only with user approval).
   - (c) **Keep both, but split capabilities.** Rename the shared cross-cutting capabilities to domain-neutral (`SPACE-OPTIMIZATION` etc., the cross-cutting capability convention), then load each domain's tier-specific masters separately. This is the heaviest path; pursues only if (a) leaves capability ambiguity unresolved.
   This question is **independent of Bucket 3** (Phase 0 vendor research would not change the answer); it is a structural / classification call.
2. **Promote shared capabilities to domain-neutral?** Capabilities 374 (`REAL-SPACE-OPTIM`), 376 (`REAL-MAINTENANCE`), 377 (`REAL-OCCUPANCY-ANALYTICS`) currently span REAL-EST + IWMS + CAFM. Per the Cross-cutting capability convention (SKILL.md § ), a capability spanning ≥3 domains warrants a domain-neutral code (no `REAL-` prefix). Proposed renames: `SPACE-OPTIMIZATION`, `FACILITY-MAINTENANCE`, `OCCUPANCY-ANALYTICS`. Decision required only if Bucket 2 #1 resolves to (a) or (c); if (b) the renames are unnecessary (REAL-EST + IWMS only is two domains, below the cross-cutting threshold). Independent of Bucket 3.
3. **`certification_required` accuracy.** `certification_required=false` is correct for the SMB CAFM market but the same is true for IWMS as well. The OSHA / ADA / EHS overlay is jurisdictional, not vendor-certification. Confirm: keep `false`.
4. **`min_org_size` cross-check vs IWMS.** CAFM's `20 s <500` reads as a serious size constraint; IWMS row would need to be checked to confirm the asymmetry (`10 xs <50` for IWMS would justify CAFM at the next tier; if both are at `20 s <500`, the SMB-vs-enterprise distinction collapses to packaging). Inspection task; answer informs Bucket 2 #1.
5. **`cost_band` cross-check.** CAFM `$$` (25k-100k for 500-user org) vs IWMS's actual cost_band (not pulled in this audit). If both at `$$$` the market separation is product-line, not buyer-tier; if IWMS is `$$$$$` and CAFM is `$$`, the distinction is real. Answer informs Bucket 2 #1.
6. **Lease accounting and utility tracking ownership.** CAFM description explicitly excludes these ("lighter on utility tracking and lease accounting than IWMS"). If kept distinct, route lease accounting candidates to the queued `LEASE-ACCT` candidate and utility tracking to a CAFM Phase 0 follow-up (or to the newly-queued `ENERGY-MGMT` candidate, per the candidates section). Bucket 3 dependency: a Phase 0 pass might surface whether `utility_meter_readings` (already mastered in UTIL-OPS as `utility_meters` id 661 + a separate `utility_meter_readings` entity per handoff 293's payload) should be `embedded_master + optional` in CAFM if kept distinct.

### Bucket 3 - Phase 0 pending (speculative; vendor-research vetting needed)

| # | Candidate | Vendor knowledge basis | Recommended verification |
|---|---|---|---|
| B3-1 | `desk_check_ins` (occupancy verification at booked desks, distinct from `desk_bookings`) | Robin, OfficeSpace, Eptura (badge-tap or QR-scan based check-in). Pulls IoT / sensor signal into the booking record. Universal-or-near-universal in modern hot-desking products. | Phase 0: confirm whether each flagship treats desk_check_in as a separate entity or as a status field on desk_booking. If separate, master in IWMS (canonical) with embedded_master in CAFM. |
| B3-2 | `space_categories` / `space_types` config table | Archibus, Spacewell, Tango: config-shape master defining space classifications (office, meeting, collaboration, storage, common, restricted). | Phase 0: vendor-surface check; if confirmed, master in IWMS as config-shape (Rule #12 exemption) with embedded_master in CAFM. |

### Cross-bucket dependencies

- Bucket 1 fixes B1-S2 / S3 / S4 / S5 / S6 / S7 / S8 are **all conditional on Bucket 2 #1**. If user picks (b) fold into IWMS, those fixes are moot (CAFM dissolves into IWMS) and the only action is the retirement path for the CAFM row.
- Bucket 2 #2 (capability rename) depends on Bucket 2 #1 outcome: only meaningful in (a) or (c).
- Bucket 2 #4 / #5 are inspection tasks that inform Bucket 2 #1; resolve them first.
- Bucket 2 #6 (lease + utility tracking ownership) has a Bucket 3 dependency: a Phase 0 utility-tracking pass could surface whether CAFM should consume from UTIL-OPS or a new ENERGY-MGMT domain.
- Bucket 3 candidates are independent of Bucket 2 #1: even if CAFM dissolves into IWMS, IWMS still needs them.

### Per-bucket prompts

- **After Bucket 1:** *"Almost every Bucket 1 fix is conditional on Bucket 2 #1. The two unconditional items are B1-S1 (author at least one module: blocks every downstream) and B1-S3 (link to FACILITIES business function: independent of the IWMS fold question). Want me to draft both unconditionally, or hold everything until Bucket 2 #1 resolves?"*
- **After Bucket 2:** *"Bucket 2 #1 (fold CAFM into IWMS or keep distinct?) gates the rest. Reply with (a), (b), or (c). Bucket 2 #4 and #5 are quick inspection tasks I can run inline if helpful before you decide. Bucket 2 #2 / #3 / #6 follow from your #1 answer."*
- **After Bucket 3:** *"Two speculative candidates (desk_check_ins, space_categories). Vet via Phase 0 vendor research, or eyeball (which ones ring true)?"*

### Report-only follow-ups (owed by other domains)

None directly: CAFM has zero handoffs to mirror. However, the **REAL-EST parent domain (141) has zero modules** (same M1 failure as CAFM), and that is REAL-EST's own audit pass, not CAFM's. If the user resolves Bucket 2 #1 by keeping CAFM distinct, the REAL-EST modularization gap is likely to surface as a sibling concern (REAL-EST holds masters `floor_plans` and `facility_work_orders` but no modules to deploy them in). Recommend scheduling a REAL-EST Validate as a follow-up.

### Candidates queued to `audits/_missing-domains.md`

- **ENERGY-MGMT (Energy and Utility Cost Management).** Surfaced via Bucket 2 #6: CAFM description explicitly excludes utility tracking, but no separate energy-mgmt domain exists in the catalog. Vendors: ENGIE Impact, Schneider Resource Advisor, Accruent Lucernex Utility, Eptura Sustainability, Watershed (overlapping with carbon accounting). Adjacency: CAFM, REAL-EST, IWMS, EAM, EHS-MGMT (already queued), UTIL-OPS (utility provider operations, distinct buyer-side).

## 2026-05-31, Continuation: B1 technical fixes

### Scope

Truly-technical B1 pass over the 9 Bucket 1 findings (B1-S1..S8 + B1-M1). Whitelist applied: PATCH enum backfills, B10b FK PATCHes derivable from existing modules, INSERT `domain_regulations` to existing rows, DELETE stale rows audit names with IDs, PATCH naming renames, INSERT `data_object_relationships` user-edges (Rule #10) audit pre-specifies, PATCH `permission_verb_override`, INSERT `handoff_processes` APQC rows ONLY when audit pre-specifies `handoff_id` + resolvable PCF.

Live state re-verified before classification: CAFM (id 142) has 0 `domain_modules`, 0 `domain_data_objects`, 0 `business_function_domains`, 0 `domain_regulations`, 0 handoffs, 0 skills. The audit footprint is accurate; no drift since 2026-05-30.

### Fixes applied

| ID | Action | Result |
|---|---|---|
| (none) | (no technical B1 fixes are in scope for this domain) | n/a |

CAFM has zero load-bearing structure (zero modules, zero masters, zero handoffs, zero skills, zero BFDs). Every whitelisted technical operation either requires existing rows to target (B10b FK PATCH, user-edge inserts, permission_verb_override, APQC handoff_process inserts) or requires the audit to pre-specify concrete identifiers (enum backfills, deletes, renames, regulation FKs). Neither precondition holds for any B1 item.

### Deferred

All 9 Bucket 1 items deferred. Counts: structural-band 8 (S1..S8), missing-entity 1 (M1). Reasons:

| ID | Audit fix shape | Defer reason |
|---|---|---|
| B1-S1 | Author at least one `domain_modules` row (full module) | New module insert: forbidden by "DEFER: new entities/DMDOs/modules". Also user-judgment branch (1 module vs 2; folds into Bucket 2 #1). |
| B1-S2 | Draft `catalog_tagline` + `catalog_description` | Explicit Rule #20 / catalog_tagline+description deferral. Also conditional on Bucket 2 #1. |
| B1-S3 | Insert `business_function_domains` rows: FACILITIES owner, IT/HR contributors | Contributors explicitly forbidden ("DEFER: new business_function_domains contributors/consumers"); the owner insert is not on the technical whitelist either (the whitelist names `domain_regulations` inserts, not `business_function_domains`). |
| B1-S4 | Research and load `domain_data_objects` rows | "DEFER: new entities/DMDOs/modules" (DMDOs explicitly). Also conditional on Bucket 2 #1 and B1-S1. |
| B1-S5 | Author system skills per module | "DEFER: full Phase A/M/B/E/F/S loads"; conditional on B1-S1. |
| B1-S6 | Author roles | "DEFER: full Phase A/M/B/E/F/S loads" (Phase E); conditional on B1-S1. |
| B1-S7 | Populate `domain_module_capabilities` | Requires modules to exist (gated on B1-S1); capability renames are Bucket 2 #2 (user judgment). |
| B1-S8 | APQC tagging on handoffs | Audit explicitly states "Not applicable" (zero handoffs to tag); whitelist requires audit-pre-specified `handoff_id`. |
| B1-M1 | Insert new `facility_service_requests` entity | "DEFER: new entities/DMDOs/modules" (new entity); conditional on Bucket 2 #1. |

### JWT errors

None encountered during the verification reads.

### UI links

- Domain row: [`https://tests.semantius.app/domain_map/domains`](https://tests.semantius.app/domain_map/domains) (CAFM is id 142)
- Modules (empty): [`https://tests.semantius.app/domain_map/domain_modules`](https://tests.semantius.app/domain_map/domain_modules)
- Business function ownership (empty): [`https://tests.semantius.app/domain_map/business_function_domains`](https://tests.semantius.app/domain_map/business_function_domains)

### Loader path

No loader created. No writes were applied; only read-only verification calls ran against PostgREST.

## 2026-05-31, Audit

### Summary

Validate b1 structural re-audit against the live catalog. **No drift since 2026-05-30 / 2026-05-31 continuation**: CAFM (id 142) still has 0 `domain_modules`, 0 `domain_data_objects`, 0 `business_function_domains`, 0 `domain_regulations`, 0 handoffs (inbound or outbound), 0 host-domain junctions, 0 skills, 0 roles. The 3 shared capabilities (`REAL-SPACE-OPTIM` 374, `REAL-MAINTENANCE` 376, `REAL-OCCUPANCY-ANALYTICS` 377) and 5 primary solutions (Archibus, Nuvolo CMMS, Tango Workplace, Officespace, Accruent Resolute) carry over unchanged. Domain row metadata is populated (`crud_percentage=90`, `min_org_size=20 s <500`, `cost_band=$$`, `usa_market_size_usd_m=400`, `market_size_source_year=2025`, `business_logic`, `certification_required=false`, `parent_domain_id=141`) but `catalog_tagline` / `catalog_description` remain empty.

Bucket 1 unchanged at 9 items; Bucket 2 unchanged at 6 items; Bucket 3 unchanged at 2 items.

### Structural pass (A, M, B, C, D, E, F, H bands)

| Band | Check | Result |
|---|---|---|
| A1 | `domains` row exists, metadata populated | PASS (Rule #8 fields populated) |
| A2 | `capability_domains` non-zero | PASS (3 rows) |
| A3 | `solution_domains` non-zero | PASS (5 rows) |
| A4 | `catalog_tagline` + `catalog_description` populated | FAIL (both empty) |
| M1 | >=1 `domain_modules` row | FAIL (zero) |
| M2 | Capability-count-to-module-count floor | FAIL (3 capabilities at the boundary; needs 1 or 2 modules per user judgment) |
| M3 | Cross-cutting capability convention | FAIL by association (capabilities span >=3 domains; rename pending Bucket 2 #2) |
| M4 | `domain_module_capabilities` populated | FAIL (vacuous, no modules) |
| B1 | `domain_data_objects` non-zero | FAIL (zero masters / embeds) |
| B5 | `embedded_master` integrity | N/A (zero rows) |
| B7 | `users` edges (Rule #10) | N/A (zero data_objects) |
| B9 | Outbound `trigger_events` + `handoffs` | FAIL (zero handoffs; condition: zero masters) |
| B9b | Intra-domain cross-module handoffs | N/A (< 2 modules) |
| B10b | Per-module FK attribution on handoffs | N/A (zero handoffs) |
| B11 | `data_object_aliases` for non-self-explanatory masters | N/A (zero masters) |
| B12 | Lifecycle states + pattern flags (Rule #12) | FAIL (vacuous, no masters) |
| C1 | `business_function_domains` non-zero | FAIL (zero) |
| D1 | Process-skill discovery coverage | N/A (no modules, no skills) |
| E1 | Module count vs role count floor | N/A (zero modules) |
| E2-E5 | Role-permission, role-module, baseline coverage | N/A (zero roles) |
| F1 | One `system` skill per module | N/A (zero modules) |
| F2 | `skill_tools` floor per `system` skill | N/A |
| F3-F5 | Tool operation_kind invariants, Semantius score | N/A (uncomputable) |
| H1 | APQC tagging on cross-domain handoffs | N/A (zero handoffs to tag) |

Verdict: same as 2026-05-30. M1 gate blocks every downstream band; the only PASS items are A1/A2/A3 plus the absence of integrity-rule violations on zero-row tables. The structural conclusion is unchanged: CAFM is a near-empty shell pending the Bucket 2 #1 modularization-judgment decision.

### Bucket sub-counts (carried into state.yaml)

| Bucket | Type | Count |
|---|---|---|
| b1a | agent-solvable now (no preconditions) | 0 |
| b1b | blocked on Bucket 2 #1 or prior B1 fixes | 9 |
| b2 | user-judgment | 6 |
| b3 | Phase 0 vendor research pending | 2 |

All 9 Bucket 1 findings (B1-S1..S8, B1-M1) are routed to b1b: B1-S1 and B1-S3 are gated by user-decision on Bucket 2 #1 (fold-into-IWMS vs keep distinct) per the audit's stated cross-bucket dependencies; B1-S2 / S4..S8 / M1 are gated transitively by B1-S1 (modules must exist) and Bucket 2 #1. No item meets the b1a precondition of "no user decisions pending" under the current state.

### JWT errors

None.

### UI links

- Domain row: https://tests.semantius.app/domain_map/domains (id 142)
- Modules (empty): https://tests.semantius.app/domain_map/domain_modules
- Business function ownership (empty): https://tests.semantius.app/domain_map/business_function_domains

### Continuation

Same blocking shape as the 2026-05-31 continuation: no fix surface that the agent can act on without first resolving Bucket 2 #1. The user picks (a) keep + modularize, (b) fold into IWMS, or (c) keep + split capabilities; from there B1-S1 / S3 unblock immediately, and the rest unblock via B1-S1.

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.
