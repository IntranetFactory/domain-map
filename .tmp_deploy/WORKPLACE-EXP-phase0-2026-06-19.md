# WORKPLACE-EXP Phase 0 — Vendor Surface

Domain: **WORKPLACE-EXP** ("Workplace Experience and Workspace Booking").
Decision already made (not re-litigated here): promoted as a **third sub-domain of REAL-EST** (`parent_domain_id=141`), alongside **IWMS** (id 23) and **CAFM** (id 142). `domain_kind=established_market`. This document produces the vendor surface and resolves the entity-ownership boundary so the build can proceed. **Research only — no inserts proposed, no rows written.**

The crux of this phase: WORKPLACE-EXP's headline capabilities (desk booking, room reservation, floor plans, occupancy) overlap what IWMS / REAL-EST already master. Rule M7 enforces a single master per data_object. So for every contested entity we must decide whether WORKPLACE-EXP masters it (and IWMS embeds) or IWMS / REAL-EST keep mastering it (and WORKPLACE-EXP embeds/consumes).

---

## What IWMS / CAFM already master (from live query)

Queried `domain_modules` for `domain_id in (23,142)` and pulled `role=master` rows, then resolved the masters of the contested space/visitor entities.

**IWMS (domain 23) modules and their masters:**

| Module id | Module code | Masters (data_object) |
|---|---|---|
| 98 | IWMS-LOCATION-MASTER | `locations` (795) |
| 99 | IWMS-DESK-RESERVATION | `desk_bookings` (590), `workplace_experience_feedback` (594) |
| 100 | IWMS-ROOM-RESERVATION | `room_reservations` (591) |
| 101 | IWMS-WORKPLACE-SERVICE-DESK | `workplace_service_requests` (592) |
| 102 | IWMS-SPACE-ANALYTICS | `space_utilization_reports` (593) |

**REAL-EST (domain 141, the parent) masters the spatial substrate:**

| Module id | Module code | Masters (data_object) |
|---|---|---|
| 288 | REAL-EST-PORTFOLIO | `floor_plans` (346) |
| 289 | REAL-EST-SPACE-OPS | `property_spaces` (347), `occupancy_records` (348) |

**CAFM (domain 142):** has **no modules wired yet** (empty result). Not a source of contention today.

**Visitor entities** (`visitor_registrations` 668, `visitor_check_ins` 669, `visitor_badges` 670, `visitor_evacuation_lists` 672, `visitor_nda_acknowledgements` 673, `visitor_watchlist_screenings` 674, `visitor_audit_logs` 675): these exist as data_objects but **no module currently holds a `master` role over them**. `visitor_registrations` appears only as a `consumer` under IGA-AUTO-PROVISIONING (module 148, domain 35). **VIS-MGMT (domain 24) also has no modules wired yet.** So visitor mastering is pending the VIS-MGMT build; WORKPLACE-EXP must **consume**, never re-master, visitor flow.

**Net finding — the booking/space entities IWMS/REAL-EST already master, which WORKPLACE-EXP must NOT re-master:**
`desk_bookings`, `room_reservations`, `space_utilization_reports` (IWMS); `floor_plans`, `property_spaces`, `occupancy_records` (REAL-EST); `locations` (IWMS). Also note `workplace_experience_feedback` is already mastered by IWMS-DESK-RESERVATION.

**Greenfield confirmation:** no `WORKPLACE-EXP` domain exists yet, and none of the WEX-specific employee-coordination entities (wayfinding, amenity, neighborhood, coworking, RTO/attendance-policy, in-office schedule, parking, locker) exist in the catalog. `work_schedules` (160) is an HCM working-pattern entity, not hybrid in-office scheduling. This means WORKPLACE-EXP's genuine net-new mastering surface is the **employee-coordination layer**, not the spatial/booking substrate.

---

## Flagship vendors (table)

Pure-plays preferred (Robin, Kadence, Tactic). Two suite-context columns (Envoy Workplace, Eptura) included to show how facilities suites position the same employee-facing modules. Skedda / Gable / OfficeSpace noted in-class but not given columns.

| Vendor | Class | Positioning | Core surface | Booking system-of-record? |
|---|---|---|---|---|
| **Robin** | Pure-play WEX | Desk + room + people scheduling, interactive maps, occupancy analytics, scheduling agent (AI) | Desks, rooms, maps, occupancy, visitor (light), analytics | Yes — Robin is SoR for bookings in a WEX-led deployment |
| **Kadence** | Pure-play WEX | Hybrid coordination first: neighborhoods, "who's in", smart in-office-day suggestions, AI copilot | Desks, rooms, neighborhoods, team coordination, visitor invites, insights | Yes — SoR for bookings + coordination |
| **Tactic** | Pure-play WEX | Resource breadth: desks, parking, lockers, equipment; neighborhoods/zones, check-in auto-release | Desks, rooms, parking, lockers, equipment, neighborhoods, maps | Yes — SoR for all resource bookings |
| **Envoy Workplace** | Suite (employee-facing module of a facilities/visitor suite) | Onsite attendance + desk/room + visitor + deliveries, unified analytics | Desks, rooms, attendance, visitor, deliveries, analytics | Yes — but inside a broader workplace platform |
| **Eptura** | Suite (IWMS/CAFM + Engage WEX app) | Engage app: neighborhoods (auto-assign), wayfinding, sensor-driven occupancy, service requests | Desks, rooms, wayfinding, occupancy sensors, service requests, neighborhoods | Booking lives in the IWMS suite; Engage is the employee front-end |

Pricing for the TCO band: Envoy workplace module ~$3 / user / mo; Kadence historically ~$4 / active user / mo (now quote-based, billed per active booker); Robin per-user; Tactic per-resource; Skedda from ~$99 / mo flat (resource-based).

---

## Surface matrix (with ownership bucket A/B/C per entity)

Entities are `snake_case_plural`, **no vendor names** (Rule #18). Grouped: Master records / Junctions-transitions / Audit-compliance / Engagement-outreach / Configuration-templates. Vendor columns: Ro=Robin, Ka=Kadence, Ta=Tactic, En=Envoy, Ep=Eptura. Classification: Core (>=3), Common (2), Specialist (1), Compliance. Ownership bucket: **A** = WORKPLACE-EXP masters (net-new); **B** = shared, WEX embeds/consumes IWMS/REAL-EST master; **C** = consume from another domain (VIS-MGMT / HCM / EMP-EXP).

### Master records

| Entity | Ro | Ka | Ta | En | Ep | Class | Proposed module / ownership |
|---|---|---|---|---|---|---|---|
| `desk_bookings` | x | x | x | x | x | Core | **B** — IWMS masters (590); WEX embeds |
| `room_reservations` | x | x | x | x | x | Core | **B** — IWMS masters (591); WEX embeds |
| `amenity_bookings` (parking/locker/equipment) | . | . | x | x | x | Common | **A** — WEX masters (net-new resource type; not in IWMS) |
| `floor_maps` (interactive employee map view) | x | x | x | . | x | Core | **B** — REAL-EST masters `floor_plans` (346); WEX consumes |
| `office_neighborhoods` (team zones) | . | x | x | . | x | Core | **A** — WEX masters (net-new team-to-zone allocation) |
| `in_office_schedules` (personal hybrid plan) | x | x | . | x | . | Common | **A** — WEX masters (net-new) |
| `office_attendance_days` (actual presence) | x | x | . | x | x | Core | **A** — WEX masters (net-new) |
| `coworking_intents` (team coordination signals) | . | x | x | . | . | Common | **A** — WEX masters (net-new) |
| `wayfinding_routes` | . | . | . | . | x | Specialist | **A** — WEX masters (net-new) |
| `workspace_resources` (bookable resource catalog) | x | x | x | x | x | Core | **A** — WEX masters its bookable-resource catalog (desks/parking/lockers/equipment as WEX-facing assets); links to IWMS/REAL-EST spaces |

### Junctions / transitions

| Entity | Ro | Ka | Ta | En | Ep | Class | Proposed module / ownership |
|---|---|---|---|---|---|---|---|
| `desk_check_ins` (presence-confirm / auto-release) | x | x | x | x | x | Core | **A** — WEX masters (presence event; distinct from IWMS reservation) |
| `booking_invitee_links` (book near teammates / invite) | . | x | x | x | . | Common | **A** — WEX masters |
| `neighborhood_team_assignments` | . | x | x | . | x | Common | **A** — WEX masters (junction office_neighborhoods <-> teams) |
| `resource_to_space_mappings` | x | . | x | . | x | Common | **A** — WEX masters (junction workspace_resources <-> property_spaces) |
| `attendance_policy_assignments` (policy -> team/person) | . | x | . | x | . | Common | **A** — WEX masters |

### Audit / compliance

| Entity | Ro | Ka | Ta | En | Ep | Class | Proposed module / ownership |
|---|---|---|---|---|---|---|---|
| `attendance_policies` (RTO rules: anchor days, min days) | . | x | . | x | . | Compliance | **A** — WEX masters (net-new RTO ruleset) |
| `attendance_compliance_records` (per-person adherence) | . | x | . | x | x | Compliance | **A** — WEX masters |
| `occupancy_records` / capacity limits | x | . | . | x | x | Compliance | **B** — REAL-EST masters `occupancy_records` (348); WEX consumes for capacity caps |
| `booking_audit_logs` | x | x | x | x | x | Compliance | **A** — WEX masters (its own booking-event trail) |
| `attendance_privacy_consents` (GDPR on presence tracking) | . | . | . | . | . | Compliance | **A** — WEX masters (privacy substrate; not in any vendor surface but required) |

### Engagement / outreach

| Entity | Ro | Ka | Ta | En | Ep | Class | Proposed module / ownership |
|---|---|---|---|---|---|---|---|
| `booking_notifications` (reminders, release prompts) | x | x | x | x | x | Core | **A** — WEX masters |
| `office_announcements` (workplace comms) | . | . | . | x | x | Common | **C** — consume from EMP-EXP if it masters comms; else WEX-light |
| `coworker_presence_feeds` ("who's in today") | x | x | x | x | x | Core | **A** — WEX masters (derived coordination view) |

### Configuration / templates

| Entity | Ro | Ka | Ta | En | Ep | Class | Proposed module / ownership |
|---|---|---|---|---|---|---|---|
| `booking_rules` (lead time, max duration, eligibility) | x | x | x | x | x | Core | **A** — WEX masters (its booking policy config) |
| `resource_types` (desk / room / parking / locker / equipment) | x | x | x | x | x | Core | **A** — WEX masters |
| `workplace_settings` (per-location WEX config) | x | x | x | x | x | Core | **A** — WEX masters |

**Counts:** ~26 entities. By classification: Core 11, Common 8, Specialist 1, Compliance 5 (overlapping with the groups above). By ownership bucket: **A (WEX masters) ~19**, **B (shared, WEX embeds IWMS/REAL-EST) ~4** (`desk_bookings`, `room_reservations`, `floor_maps`/`floor_plans`, `occupancy_records`), **C (consume from other domain) ~1+** (`office_announcements` from EMP-EXP; plus visitor entities from VIS-MGMT and people from HCM consumed at the field level rather than as owned data_objects).

---

## Booking-entity ownership decision (the crux)

**Question:** does WORKPLACE-EXP master `desk_bookings` / `room_reservations`, or embed IWMS's masters?

**Recommendation: WORKPLACE-EXP EMBEDS / CONSUMES the IWMS masters for `desk_bookings` (590) and `room_reservations` (591). It does NOT re-master them.**

**Reasoning:**

1. **Rule M7 (single master) is dispositive given catalog state.** IWMS already exists with `IWMS-DESK-RESERVATION` mastering `desk_bookings` and `IWMS-ROOM-RESERVATION` mastering `room_reservations`. The catalog cannot have two masters. In a greenfield catalog you could put bookings under either; here IWMS got there first and the decision is "re-master vs embed," not "who should ideally own it." Re-mastering would mean demoting IWMS's masters to consumer — a destructive restructure of an existing established domain, which is exactly the kind of overwrite Rule #1 forbids without explicit sign-off, and there is no functional justification for it.

2. **Named-vendor reality cuts both ways, but does not force re-mastering.** In a WEX-led deployment, Robin / Kadence / Tactic genuinely ARE the system of record for bookings — the booking row is born in the WEX app. But IWMS *suites* (Eptura, and the IWMS half of Envoy) equally master bookings; Eptura's Engage app is explicitly an employee front-end over an IWMS booking core. So "the pure-play is SoR" describes a deployment topology, not a catalog truth. Our catalog already chose IWMS as the booking master; WORKPLACE-EXP is the employee-experience front-end over that master, mirroring the Eptura Workplace + Engage split. The vendor evidence therefore *supports* the embed model, not contradicts it.

3. **WEX keeps its own genuine masters around the booking core.** WORKPLACE-EXP is NOT reduced to a thin viewer: it masters `desk_check_ins` (the presence event, distinct from the reservation), `booking_rules`, `booking_notifications`, `resource_types`, `workspace_resources`, `amenity_bookings` (parking/locker/equipment — resource types IWMS does NOT master), `office_neighborhoods`, and the entire attendance-coordination layer. So embedding `desk_bookings`/`room_reservations` does not starve WEX of masters.

4. **`amenity_bookings` is the boundary line.** Parking, lockers, and equipment bookings (Tactic, Envoy, Eptura) are NOT mastered by IWMS today. WEX masters those as net-new. This keeps the SPACE-BOOKING module from being master-empty (see below).

**Consume vs embed nuance:** WEX `consumes` `floor_plans` (REAL-EST 346, rendered as the employee `floor_maps` view), `property_spaces` (347), `occupancy_records` (348), and `locations` (795); it `embeds` IWMS `desk_bookings` / `room_reservations` (reads + writes through IWMS's master with WEX as the front-end). Visitor entities are `consumed` from VIS-MGMT once that domain is wired.

---

## Modularization hypothesis

Two modules (candidate has ~7 capabilities; Rule #14: each module needs >=1 genuine master).

**Module 1 — SPACE-BOOKING** (employee booking surface over the spatial substrate)
- Masters (net-new, satisfies Rule #14): `workspace_resources`, `amenity_bookings`, `resource_types`, `booking_rules`, `desk_check_ins`, `booking_notifications`, `resource_to_space_mappings`, `booking_audit_logs`, `office_neighborhoods`, `neighborhood_team_assignments`.
- Embeds: `desk_bookings` (IWMS 590), `room_reservations` (IWMS 591).
- Consumes: `floor_plans`/`floor_maps` (REAL-EST 346), `property_spaces` (347), `locations` (795), visitor invites (VIS-MGMT).
- **Master-count check: PASS.** Even after stripping the embedded IWMS bookings, SPACE-BOOKING has many genuine masters (resources, amenities, rules, check-ins, neighborhoods). The earlier concern (a zero-master SPACE-BOOKING that would force a single-module design) does NOT materialize, because `amenity_bookings` + `workspace_resources` + `desk_check_ins` + `office_neighborhoods` are net-new masters IWMS does not hold.

**Module 2 — ATTENDANCE-COORDINATION** (hybrid attendance, RTO policy, team coordination, wayfinding, occupancy analytics)
- Masters: `office_attendance_days`, `in_office_schedules`, `coworking_intents`, `coworker_presence_feeds`, `attendance_policies`, `attendance_policy_assignments`, `attendance_compliance_records`, `attendance_privacy_consents`, `wayfinding_routes`, `booking_invitee_links`.
- Consumes: `occupancy_records` (REAL-EST 348) for capacity/utilization context; `space_utilization_reports` (IWMS 593) for analytics; people from HCM; engagement from EMP-EXP.
- **Master-count check: PASS** (entirely net-new masters).

Both modules clear Rule #14 comfortably. The two-module split is recommended over a single module.

---

## Boundary notes (what WEX consumes from IWMS / REAL-EST / VIS-MGMT / HCM / EMP-EXP)

- **From IWMS (23):** embed `desk_bookings` (590) and `room_reservations` (591) — WEX is the employee front-end, IWMS remains master. Consume `space_utilization_reports` (593) and `locations` (795).
- **From REAL-EST (141, parent):** consume `floor_plans` (346) — rendered as the WEX `floor_maps` view — plus `property_spaces` (347) and `occupancy_records` (348). WEX must NOT re-master any of these.
- **From VIS-MGMT (24):** consume visitor flow (`visitor_registrations` 668, `visitor_check_ins` 669, etc.). **Open dependency:** VIS-MGMT has no modules wired and the visitor entities currently lack a master. WEX should declare `consumer` intent but cannot embed until VIS-MGMT masters them. Flag for sequencing.
- **From HCM / users:** consume people, teams, departments, working patterns (`work_schedules` 160 is HCM, not WEX) at the field level.
- **From EMP-EXP:** consume engagement/comms; `office_announcements` should defer to EMP-EXP if it masters workplace communications (resolve in Phase 1).
- **CAFM (142):** no current overlap (no modules). No boundary action needed now.

**Unresolved boundary questions (for Phase 1):**
1. Does EMP-EXP master workplace comms? If yes, `office_announcements` is bucket C; if no, WEX masters a light version.
2. VIS-MGMT sequencing — WEX's visitor-invite link (`booking_invitee_links`) needs VIS-MGMT's master to exist; until then it's a dangling consumer.
3. Confirm `desk_check_ins` is genuinely WEX-mastered and not a future IWMS addition (IWMS reservation auto-release logic could claim it).

---

## Domains metadata estimate (7-field, Rule #8)

| Field | Estimate | Justification |
|---|---|---|
| `crud_percentage` | **92** | Overwhelmingly forms, booking records, schedules, and workflow (book/check-in/release, policy assignment). Standard CRUD-heavy front-end. |
| `business_logic` | "Occupancy optimization and capacity-cap enforcement; neighborhood/zone allocation and team-clustering; RTO-policy compliance scoring (anchor days, min-days adherence); smart in-office-day suggestions; auto-release of un-checked-in bookings; coworker-presence coordination." | The ~8% beyond CRUD: optimization, allocation heuristics, and policy-scoring are the genuine logic; everything else is forms. |
| `min_org_size` | **~150 employees** | Below this, hybrid desk-sharing and RTO coordination rarely justify dedicated tooling; calendar + spreadsheet suffices. Hot-desking value appears once desks < headcount. |
| `cost_band` | **~$15k–$45k / yr for a 500-user org** | At ~$3–$6 / user / mo (Envoy ~$3, Kadence historically ~$4 active-booker) => 500 users * $4 * 12 ≈ $24k midpoint; range covers per-resource (Tactic) and flat (Skedda) models plus onboarding. TCO excludes optional occupancy-sensor hardware. |
| `certification_required` | **false** | No regulatory certification to operate a desk-booking / attendance app. (GDPR/privacy obligations exist on attendance data but are compliance, not a product certification.) |
| `usa_market_size_usd_m` | **~$650M US TAM (order-of-magnitude estimate; flag)** | Global desk-booking software ~$1.2–1.5B in 2024 across sources; the broader hybrid-workplace/WEX software category is larger but blends into IWMS. Taking the WEX-specific slice (desk + room + attendance coordination, excluding full IWMS) at ~$2B global and the US at ~30–35% => ~$650M. **Order-of-magnitude placeholder — sources disagree by an order of magnitude (one report cites $164M global for desk-booking narrowly, another $1.5B), so treat as a soft estimate to refine in Phase 1.** |
| `market_size_source_year` | **2024** | Underlying market figures (Growth Market Reports, Research Intelo, 360iResearch) are 2024 base-year valuations. |

---

### Sources
- Robin: https://robinpowered.com/platform/desk-booking , https://support.robinpowered.com/hc/en-us/articles/40160691370765-What-s-New-in-Robin-October-2025
- Kadence: https://kadence.co/hybrid-working-coordination/ , https://kadence.co/desk-booking-software/
- Tactic: https://www.gettactic.com/desk-booking , https://www.gettactic.com/space-management
- Envoy: https://envoy.com/products/workplace/ , https://envoy.com/products/hot-desk-booking-software
- Eptura: https://eptura.com/our-platform/workplace-experience-software/ , https://eptura.com/our-platform/eptura-engage/
- RTO compliance: https://www.skedda.com/insights/return-to-office-policies-2026-company-tracker , https://www.currentware.com/solutions/office-attendance-tracking/
- Market size: https://growthmarketreports.com/report/desk-booking-software-market , https://researchintelo.com/report/desk-booking-software-market , https://www.360iresearch.com/library/intelligence/desk-booking-software
- Pricing: https://www.skedda.com/insights/best-desk-booking-software , https://archieapp.co/blog/skedda-alternatives-pricing-reviews/
