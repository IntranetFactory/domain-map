# Phase 0 Vendor-Surface Research: ACTIVITY-BOOKING

**Market:** Tours, Activities & Experiences Booking (reservation technology / "restech")
**Domain code:** `ACTIVITY-BOOKING`
**Subject vendor:** Origin (exploreorigin.com), adventure/outfitter/guided-trip specialist
**Date:** 2026-06-22
**Purpose:** Ground which data entities this market's software masters, so the loader ships a real model (not headline nouns).

---

## 1. Flagship vendors

| Vendor | Positioning | Parent | Target sub-segment | Pricing model |
|---|---|---|---|---|
| **FareHarbor** | Booking + business management for tours/activities/rentals/attractions | Booking Holdings | SMB day-tours, water/walking tours, attractions | Free software; ~6% booking fee at checkout (passed to guest); +~2% on OTA-sourced |
| **Peek Pro** | Premium "AI operating system for experiences"; strong marketing/upsell suite | Peek | Tours, activities, rentals, attractions | No subscription; ~6% + ~2.3% + $0.30/ticket; waivers/channel as paid modules |
| **Rezdy** | Distribution-first booking + 12,000-agent B2B marketplace | Expedition Software Holding (Vertica Capital) | Operators prioritizing OTA/reseller reach | SaaS $49/$99/$249/mo + flat 3% per online booking |
| **Checkfront** | Flexible reservations for mixed inventory (tours + rentals + lodging) | Expedition Software Holding | Multi-activity / complex inventory operators | Subscription ~$125-$295/mo; 0% commission on direct |
| **Regiondo** | All-in-one with 200+ sales-channel distribution + gift-voucher commerce | Expedition Software Holding | European leisure/attraction operators | Subscription tiers + transaction fees |
| **Bokun** | Booking engine + channel manager; distribution is the headline | Tripadvisor (Viator sibling) | Operators selling through Viator + max OTA reach | Free distribution; 0% on Viator/offline; 1-1.5% on direct (passable) |
| **Xola** | All-in-one booking/ops/marketing for tours, attractions, experiences | Independent | General T&A + attractions | No subscription; 2.39% + $0.30 per transaction |
| **The Flybook** *(adventure specialist)* | Purpose-built outdoor-rec restech: Reservations + SmartTickets + Rentals | Fullsteam | Adventure parks, ziplines, rafting, lodges, rentals | Transaction-based (4% online / 2% all) or negotiated flat |
| **Resmark Systems** *(adventure specialist)* | Tour-booking suite; pioneered multi-day rafting as a product | Independent | Adventure / rafting / single + multi-day operators | $15/mo + $500 setup + 3.5%, or $95/mo + 2.5% |
| **Origin** *(subject, adventure specialist)* | "All-in-one operating system for outdoor businesses"; guide-centric | Independent (Denver, 2020) | Guiding companies, outfitters, fly shops, AMGA partner | Pay-when-you-book; Stripe + 5% service fee (passed); free waivers |

---

## 2. Entity surface matrix

Legend: X = first-class record; - = not evidenced / nested-only. Classification: **Core** (all), **Common** (most), **Specialist** (adventure/multi-day), **Compliance**.

| Entity (snake_case_plural) | Class | FareHarbor | Peek | Rezdy | Checkfront | Regiondo | Bokun | Xola | Flybook | Resmark | Origin |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `activity_bookings` | Core | X | X | X | X | X | X | X | X | X | X |
| `activity_products` | Core | X | X | X | X | X | X | X | X | X | X |
| `activity_departures` (slots/sessions/availability) | Core | X | X | X | X | X | X | X | X | X | X |
| `rate_options` (price/rate rules) | Core | X | X | X | X | X | X | X | X | X | X |
| `customers` | Core | X | X | X | X | X | X | X | X | X | X |
| `booking_participants` | Common | X | X | X | X | X | X | X | X | X | X |
| `payment_transactions` | Common | X | X | X | X | X | X | X | X | X | X |
| `booking_refunds` (cancellations) | Common | X | X | X | X | X | X | X | X | X | X |
| `booking_extras` (add-ons/upsells) | Common | X | X | X | X | X | X | X | X | X | X |
| `discount_codes` (promo/coupon) | Common | X | X | X | X | X | X | X | X | - | X |
| `gift_cards` (vouchers) | Common | X | X | X | X | X | X | X | X | - | X |
| `booking_manifests` (rosters) | Common | X | X | X | - | X | X | X | X | X | X |
| `customer_notifications` (messages) | Common | X | X | X | - | - | - | X | X | X | X |
| `activity_reviews` | Common | - | X | - | - | - | - | X | X | X | X |
| `analytics_reports` | Common | X | X | X | X | X | - | X | X | X | X |
| `bookable_resources` (equipment/vehicles) | Specialist | X | X | X | X | - | X | X | X | X | X |
| `guide_assignments` (staff scheduling) | Specialist | X | X | X | X | - | - | X | X | partial | X (strongest) |
| `equipment_rentals` (gear rental) | Specialist | X | X | - | X | - | - | - | X | X | X |
| `trip_itineraries` (multi-day) | Specialist | - | - | - | X | - | - | - | - | X (pioneer) | X |
| `lodging_units` (rooms) | Specialist | - | - | - | X | - | - | - | X | - | X |
| `liability_waivers` | Compliance | X | X | - | X | - | - | X | X | X | X |
| **Distribution entities** | | | | | | | | | | | |
| `channel_listings` (OTA listings) | Common | X | X | X | X | X | X | X | - | X | - |
| `reseller_partners` (agents/marketplace) | Specialist | - | - | X (Marketplace) | - | X | X (2,700+) | - | - | X | - |
| `partner_contracts` (negotiated rates/commission) | Specialist | - | - | X | - | - | X | - | - | X | - |

Notes: Rezdy and Bokun confirm distribution objects from public API specs (strongest evidence): Rezdy `marketplaceRate`/`negotiatedRate`/`agentPaymentType`; Bokun `Reseller`/`Agent`/`Partner Contract`. FareHarbor's public API is a narrow distribution chain (companies -> items -> availabilities -> bookings); its richer entities (waivers, gift cards, resources, crew, promo codes) live in the supplier dashboard. Origin is direct-booking-centric and shows no OTA/reseller distribution layer.

---

## 3. Compliance / regulated entities

| Concern | Legal basis | Typed master entity, or attribute? |
|---|---|---|
| Card payments | PCI-DSS (contractual, not statute) | **Attribute / tokenized.** Operators use Stripe/processor tokenization; PCI is satisfied by not storing PANs. `payment_transactions` holds processor token + status, not card data. No separate "PCI" entity. |
| Liability releases | E-SIGN Act / UETA enforceability; state assumption-of-risk law | **Typed master: `liability_waivers`.** Every adventure vendor (Origin, Flybook, Resmark/WaiverSign, Xola, Checkfront, FareHarbor) stores signed waivers as first-class records tied to a booking and participant, with template, signature timestamp, IP. Enforceability needs the signed artifact retained, so it must be a record, not a flag. |
| Minors / parental consent | State law: a minor cannot sign; guardian must | **Attribute on `liability_waivers`** (signer-relationship, guardian-name, minor flag), not a separate entity. |
| ADA / accessibility | ADA Title III (public accommodations) | **Attribute** on `activity_products` (accessibility notes) or a custom field; not a master entity. |
| Insurance / liability coverage | Operator's commercial GL policy; permits | **Out of scope as a master here.** At most a `permit`/coverage attribute. Permits (e.g., USFS/BLM for outfitters) surface as line items in Origin, so model as `booking_extras` / product attribute, not a typed entity. |

Conclusion: only `liability_waivers` warrants a typed master. PCI, minors, ADA, insurance are attributes.

---

## 4. Modularization hypothesis

This market has >=3 capabilities (reservation, resource/guide scheduling, liability, distribution, payments). Recommended split: **3 modules**, with payments and channel handled as adjacencies rather than full in-domain modules (most vendors delegate payments to Stripe/processor and distribution is optional).

### Recommended split (3 modules)

**Module A: Reservation & Booking Core** (capability: take and manage bookings)
- **Masters:** `activity_products`, `activity_departures`, `rate_options`, `activity_bookings`, `booking_participants`, `booking_extras`, `discount_codes`, `gift_cards`, `payment_transactions`, `booking_refunds`, `customers`, `activity_reviews`, `customer_notifications`, `analytics_reports`, `booking_manifests`.
- **Embeds/consumes:** guide and resource assignments (from B); signed waiver status (from C); channel listing (adjacency).
- Rationale: universal across all 10 vendors; the irreducible core.

**Module B: Resource & Guide Scheduling** (capability: assign people, gear, vehicles, lodging)
- **Masters:** `bookable_resources`, `guide_assignments`, `equipment_rentals`, `lodging_units`, `trip_itineraries`.
- **Embeds/consumes:** `activity_departures` and `activity_bookings` (from A); staff/guide identities (workforce adjacency).
- Rationale: this is the adventure/outfitter differentiator (Origin, Flybook, Resmark, Checkfront). Separable; general T&A operators (Xola attractions) can deploy A without B.

**Module C: Waivers & Liability** (capability: enforce signed liability releases)
- **Masters:** `liability_waivers` (+ waiver templates as child rows).
- **Embeds/consumes:** `activity_bookings`, `booking_participants` (from A).
- Rationale: regulated, separately licensed by multiple vendors (Peek paid add-on, Resmark WaiverSign, Smartwaiver integrations). Clean compliance boundary; often a buy-vs-build / integration decision.

**Distribution (Module D candidate, optional):** `channel_listings`, `reseller_partners`, `partner_contracts`. Recommend NOT mastering in-domain initially: Bokun/Rezdy treat this as the whole business, but most operators consume OTA distribution as an external adjacency. Promote to a 4th module only if the catalog wants to model the two-sided marketplace (Rezdy/Bokun) explicitly.

---

## 5. Adjacencies / handoffs

| Adjacent domain | Direction | Event / data |
|---|---|---|
| Payments processors (Stripe, etc.) | ACTIVITY-BOOKING -> processor | `booking.confirmed` triggers charge; processor returns `payment.captured` / `payment.refunded`. Tokens stored, not cards. |
| E-signature (Smartwaiver, WaiverSign, DocuSign) | bidirectional | ACTIVITY-BOOKING requests signature; receives `waiver.signed` back, attaches to participant. |
| CRM / customer-data | ACTIVITY-BOOKING -> CRM | `customer.created`, `booking.completed` feed contact + history (Origin/Resmark embed lightweight CRM but sync out). |
| Workforce / scheduling | ACTIVITY-BOOKING <- workforce | Consumes staff/guide identities, availability, certifications (AMGA for Origin); emits `guide.assigned`, `departure.completed`. |
| Digital commerce storefront | storefront -> ACTIVITY-BOOKING | Booking widget / embed creates `activity_bookings`; gift-card widget. |
| Accounting / revenue | ACTIVITY-BOOKING -> accounting | `payment.captured`, `booking.refunded`, payout/commission rows export to QuickBooks (Resmark GL IDs). |
| OTA distribution (Viator, GYG, Expedia) | bidirectional | Availability push; inbound `booking.created` from channel; `booking.cancelled`/`amended` sync. |

Key lifecycle events to emit: `booking.confirmed`, `waiver.signed`, `guide.assigned`, `departure.completed`, `booking.refunded`.
