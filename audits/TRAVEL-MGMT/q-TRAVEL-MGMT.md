# Corporate Travel Management (TRAVEL-MGMT): questions waiting for you

## What this domain is
Book travel within policy, keep every traveler safe, and stay on top of the whole trip from one place.

Shop and book flights, hotels, rail, and cars within your travel policy, route out-of-policy trips for approval, and give travelers self-service booking with their own profiles, loyalty numbers, and saved preferences. Every trip lives in one itinerary you can change, track, and reconcile, and unused tickets are tracked so credits never go to waste. When something goes wrong on the road, see where your travelers are, send alerts, and meet your duty-of-care obligations. Trip charges and records flow straight to expense and spend so finance never has to chase them.

> Grounding: these recommendations are backed by the Phase 0 vendor-surface study (5 flagship vendors: Navan, SAP Concur Travel, Spotnana, Amex GBT, BCD Travel) saved at `.tmp_deploy/TRAVEL-MGMT-phase0-2026-06-14.md`. The build is loaded at `record_status='new'` (Phases A, B, C, S, E complete); the questions below are the genuine forks that need your call before the records are reviewed.

---

q1: (answer this first) Should "Duty of Care and Traveler Risk" stay its own module, or fold into "Trip and Itinerary Management"?

- a) Keep it as its own module (the current build): a dedicated surface for traveler-location tracking, risk alerts, destination intelligence, and assistance.
- b) Fold duty-of-care into Trip and Itinerary Management, so traveler safety is a feature of trip tracking rather than a separate module.

Recommended: a. Four of the five flagships model duty-of-care as a first-class surface: Navan, SAP Concur, Amex GBT, and BCD Travel all ship traveler-tracking and risk-alerting as a named capability, and the obligation is sold standalone by specialists such as International SOS, which is strong evidence the entity surface (traveler tracking, risk alerts, destination intelligence, assistance cases) stands on its own rather than being a feature of itinerary management. Spotnana exposes it only partially because it is API-first infrastructure. The fold-in option (b) exists because a smaller program experiences traveler safety as an attribute of the trip, but the standalone-vendor evidence favors keeping it separate. This choice is the one module-shape fork, so it is asked first.

a1:

---

q2: Should PCI-DSS be attached to this domain as a compliance framework? (yes/no)

Recommended: no. GDPR is loaded as mandatory (traveler profiles hold passport, visa, loyalty, dietary, and location data, including special-category and cross-border personal data) and SOX as recommended (travel-spend controls and approval evidence are financial-controls evidence for public companies). PCI-DSS is genuinely conditional: it applies only where the booking platform actually stores cardholder data. Spotnana, an API-first flagship, never stores card data and defers payment to the embedding platform (Brex, Expensify, Center); the large TMCs (Amex GBT, BCD) route payment through a card partner; Navan and SAP Concur bundle a card/payment layer only where they hold card data. Because at least one flagship never touches cardholder data, PCI-DSS is inherited rather than owned for most deployments. Say yes if your travel estate stores card data directly for booking.

a2:

---

q3: Is the ~$3,500M US TAM placeholder for the market size acceptable for now, or should it be re-sourced before review?

- a) Accept the ~$3,500M (2025) placeholder and flag it for a later sizing pass.
- b) Block on a sourced Gartner / IDC / Forrester figure (or a vendor-revenue triangulation) before the domain is reviewed.

Recommended: a. The figure is populated so the domain row is not sitting at zero (Rule #8), but Phase 0 explicitly flagged it as an order-of-magnitude placeholder, not a sourced figure. It was anchored to Navan's October 2025 IPO disclosures (~$613M trailing-twelve-month revenue on ~$7.6B gross bookings) as a vendor-revenue sense of scale for US corporate travel management software and TMC tech spend (booking plus program tooling, excluding the underlying travel spend itself). No published Gartner / IDC / Forrester TAM was located in Phase 0, so accepting the placeholder now and scheduling a dedicated sizing pass is the honest call; pick (b) only if a sourced number is needed before you review the domain.

a3:

---

q4: There is no APQC process that fits corporate travel, so persona RACI gates are unwired. Author a custom travel process so RACI resolves to gates, or leave it open?

- a) Author custom travel processes (e.g. CUSTOM-TRAVEL-BOOK, CUSTOM-TRAVEL-APPROVE, CUSTOM-TRAVEL-DUTY-OF-CARE), wire them to the gated lifecycle transitions, and author Responsible / Accountable rows for the three personas.
- b) Leave it open for now: the three personas and their module reach are loaded; only the process-to-gate RACI wiring is deferred.

Recommended: a. The personas are loaded (Travel Manager, Travel Arranger, cross-functional Traveler) with their module reach, but the cross-industry APQC PCF has no corporate-travel process node: the closest rows are expense-reimbursement processes (9.6 "Process accounts payable and expense reimbursements", 9.6.2 "Process expense reimbursements"), none of which gate pre-trip booking, pre-trip approval, or duty-of-care, which are the travel-specific gated transitions in this build. Every flagship (Navan, SAP Concur, Amex GBT, BCD) runs corporate travel as its own value stream distinct from expense, so a custom process node is the only faithful anchor. Authoring net-new processes is structural, so it is surfaced here rather than auto-loaded; choose (b) if you would rather defer the RACI layer.

a4:

---

## Optional (will not hold up the build)

q5: Should I research and add the discretionary travel substrate Phase 0 flagged? (yes/no)

The three non-blocking ideas: (1) a distinct duty-of-care / travel-risk capability node that could span travel and broader employee-safety tooling (International SOS sells this standalone); (2) an embedded-travel / travel-API channel capability tracking Spotnana's "travel-as-a-service" pattern that Brex, Expensify, and Center all embed; (3) reconciling the existing EXPENSE domain description's "travel-booking integration" phrase now that TRAVEL-MGMT exists, so the two domains reference each other cleanly at the spend seam.

Recommended: yes, but additive and after the four questions above. The four built modules already cover the market surface; these are enrichments that fit the existing shape and never gate "finished".

a5:

---

<!-- agent map, ignore: q1=B2-DOC-MODULE q2=B2-PCIDSS q3=B2-MARKET-SIZE q4=B2-RACI-PROCESS q5=B3-EXPANDED-SUBSTRATE | domain_id=172 | phase0=.tmp_deploy/TRAVEL-MGMT-phase0-2026-06-14.md | reversed: none -->
