# Embedded-master + necessity backfill — cluster industry-b + orphans

**Scope:** 11 domains — ACCT-PRACT-MGMT (152), LEGAL-PRACT-MGMT (150), VET-PRACT-MGMT (151), AGENCY-MGMT (153), MSP-PSA (131), PSA (68), LSD (25), OMS (32), WORK-MGMT (135), BPA (136), PROC-MIN (40).

**Heterogeneity:** Practice-management verticals (ACCT/LEGAL/VET) are mini-ERPs that bundle CRM + HCM + AR locally; their existing rows under-state embedded-master breadth because contributors were authored before the `embedded_master` role existed. Service-firm management (AGENCY, MSP-PSA, PSA) is structurally similar but with cleaner separation from a hosting ERP. OMS, WORK-MGMT, BPA, PROC-MIN are horizontal orphans with very different shapes: OMS is a multi-master flagship for `orders`; WORK-MGMT is a thin "tasks/projects" silo; BPA is design-time-only consumer of the catalog; PROC-MIN is a derived-only leadership-tier domain.

---

## Section 1 — Existing rows snapshot

| domain | id | role | necessity | data_object_id | data_object_name |
|---|---:|---|---|---:|---|
| ACCT-PRACT-MGMT (152) | 645 | master | required | 400 | tax_returns |
| ACCT-PRACT-MGMT (152) | 646 | master | required | 401 | client_engagements |
| ACCT-PRACT-MGMT (152) | 647 | contributor | required | 394 | engagement_letters |
| ACCT-PRACT-MGMT (152) | 648 | contributor | required | 162 | time_entries |
| ACCT-PRACT-MGMT (152) | 649 | contributor | required | 75 | invoices |
| ACCT-PRACT-MGMT (152) | 650 | contributor | required | 98 | contacts |
| LEGAL-PRACT-MGMT (150) | 632 | master | required | 391 | legal_matters |
| LEGAL-PRACT-MGMT (150) | 633 | master | required | 392 | trust_accounts |
| LEGAL-PRACT-MGMT (150) | 634 | master | required | 393 | conflict_checks |
| LEGAL-PRACT-MGMT (150) | 635 | master | required | 394 | engagement_letters |
| LEGAL-PRACT-MGMT (150) | 636 | contributor | required | 162 | time_entries |
| LEGAL-PRACT-MGMT (150) | 637 | contributor | required | 75 | invoices |
| LEGAL-PRACT-MGMT (150) | 638 | contributor | required | 98 | contacts |
| VET-PRACT-MGMT (151) | 639 | master | required | 395 | animal_patients |
| VET-PRACT-MGMT (151) | 640 | master | required | 396 | pet_owners |
| VET-PRACT-MGMT (151) | 641 | master | required | 397 | veterinary_vaccinations |
| VET-PRACT-MGMT (151) | 642 | master | required | 398 | veterinary_lab_results |
| VET-PRACT-MGMT (151) | 643 | master | required | 399 | controlled_substance_ledger_entries |
| VET-PRACT-MGMT (151) | 644 | contributor | required | 75 | invoices |
| AGENCY-MGMT (153) | 727 | master | required | 478 | agency_jobs |
| AGENCY-MGMT (153) | 728 | master | required | 479 | agency_time_entries |
| AGENCY-MGMT (153) | 729 | master | required | 480 | retainers |
| AGENCY-MGMT (153) | 730 | master | required | 481 | media_plans |
| AGENCY-MGMT (153) | 731 | master | required | 482 | insertion_orders |
| AGENCY-MGMT (153) | 732 | master | required | 483 | creative_briefs |
| AGENCY-MGMT (153) | 733 | master | required | 484 | creative_deliverables |
| AGENCY-MGMT (153) | 734 | master | required | 485 | agency_estimates |
| AGENCY-MGMT (153) | 735 | consumer | required | 97 | customers |
| AGENCY-MGMT (153) | 736 | consumer | required | 31 | employees |
| AGENCY-MGMT (153) | 737 | consumer | required | 66 | contracts |
| AGENCY-MGMT (153) | 738 | consumer | required | 100 | opportunities |
| AGENCY-MGMT (153) | 739 | consumer | required | 206 | suppliers |
| MSP-PSA (131) | 401 | master | required | 233 | msp_tickets |
| MSP-PSA (131) | 402 | master | required | 234 | msp_contracts |
| MSP-PSA (131) | 403 | master | required | 235 | msp_time_entries |
| MSP-PSA (131) | 404 | master | required | 236 | msp_invoices |
| MSP-PSA (131) | 405 | master | required | 237 | msp_clients |
| MSP-PSA (131) | 406 | consumer | required | 85 | (rmm_alerts) |
| MSP-PSA (131) | 407 | consumer | required | 223 | (rmm_agents) |
| MSP-PSA (131) | 408 | contributor | required | 47 | (incidents) |
| MSP-PSA (131) | 409 | consumer | required | 56 | (customer_assets) |
| PSA (68) | 280 | consumer | required | 162 | time_entries |
| PSA (68) | 353 | master | required | 216 | projects |
| PSA (68) | 354 | master | required | 217 | project_tasks |
| PSA (68) | 355 | master | required | 218 | project_assignments |
| PSA (68) | 356 | master | required | 219 | project_billing_milestones |
| PSA (68) | 357 | contributor | required | 109 | (revenue_recognition_records) |
| PSA (68) | 366 | consumer | required | 31 | employees |
| PSA (68) | 367 | consumer | required | 33 | job_profiles |
| PSA (68) | 368 | consumer | required | 100 | opportunities |
| PSA (68) | 369 | consumer | required | 66 | contracts |
| PSA (68) | 370 | consumer | required | 210 | expense_reports |
| PSA (68) | 431 | consumer | required | 244 | work_projects |
| LSD (25) | 110 | consumer | required | 66 | contracts |
| OMS (32) | 673 | master | required | 424 | order_allocations |
| OMS (32) | 674 | master | required | 425 | inventory_locations |
| OMS (32) | 675 | master | required | 426 | sourcing_decisions |
| OMS (32) | 676 | master | required | 427 | return_authorizations |
| OMS (32) | 677 | master | required | 428 | store_pickup_orders |
| WORK-MGMT (135) | 424 | master | required | 243 | work_items |
| WORK-MGMT (135) | 425 | master | required | 244 | work_projects |
| WORK-MGMT (135) | 426 | master | required | 246 | work_automations |
| WORK-MGMT (135) | 427 | master | required | 245 | okr_objectives |
| BPA (136) | 432 | master | required | 247 | business_process_models |
| BPA (136) | 434 | master | required | 248 | business_capability_maps |
| BPA (136) | 436 | master | required | 249 | value_streams |
| BPA (136) | 438 | master | required | 250 | process_simulation_runs |
| PROC-MIN (40) | 433 | contributor | required | 247 | business_process_models |

Total existing: 67 rows. Empty/island shapes: LSD (1 row only), PROC-MIN (1 row only).

---

## Section 2 — NEW rows to add (with reasoning per row)

Format per row: `domain → data_object | role | necessity | proposed notes`.

### ACCT-PRACT-MGMT (152)

1. **152 → customers (97) | embedded_master | optional | "ACCT-PRACT-MGMT local-masters tax/accounting clients as a contact roster (firm-of-one CPAs rarely run a separate CRM). When a holistic deployment has CRM/CDP present (Karbon-with-HubSpot in mid-size firms), this demotes to consumer of the canonical customer master. Many small-firm deployments skip — optional."**
   Reason: Most CPA-practice deployments are firm-of-one with no CRM. The "client list" is just the AR + engagement roster. Existing row #650 (contacts/98 contributor) captures the broader contact-role play; this row captures the canonical "customer" demotion when CRM ships.

2. **152 → employees (31) | embedded_master | required | "ACCT-PRACT-MGMT local-masters staff timekeepers — partners, managers, seniors with charge-rates and tax-prep certifications. Demotes to HCM-canonical when a holistic deployment integrates payroll/HRIS (uncommon below 50-employee firms). At the practice tool, every time_entry row joins to a staff record the tool owns."**
   Reason: Even mid-size CPA firms below 50 FTE generally run Karbon/TaxDome standalone with no HCM; staff records are local-mastered. Direct point-solution embedded_master pattern.

3. **152 → tax_authorities (142) | consumer | required | "Reads jurisdictional tax-authority master (federal IRS, state DORs) for tax-return preparation: filing addresses, e-file gateway endpoints, form versioning. Canonical master is TAX cluster / authoritative-data."**
   Reason: Required reference data; ACCT-PRACT-MGMT cannot prepare a return without it.

### LEGAL-PRACT-MGMT (150)

4. **150 → customers (97) | embedded_master | optional | "LEGAL-PRACT-MGMT local-masters clients as the firm's payer/contact roster. Demotes to consumer when CRM-cluster master is present (rare for small firms — Clio/MyCase typical deployments skip CRM entirely; BigLaw on Aderant integrates Salesforce). Optional in most deployments below 30 lawyers."**
   Reason: Mirrors ACCT pattern. Clio standalone holds the entire client roster.

5. **150 → employees (31) | embedded_master | required | "LEGAL-PRACT-MGMT local-masters timekeepers — partners, associates, paralegals with hourly rates, bar admissions, and billable-rate tables per matter. Standalone firms run no HCM; even mid-size firms on Clio rarely integrate to HRIS. Demotes to HCM-canonical only at BigLaw scale."**
   Reason: The timekeeper master IS the practice tool's identity backbone. Required for every time_entry, every conflict_check, every matter staffing.

6. **150 → documents (429) | embedded_master | required | "LEGAL-PRACT-MGMT local-masters matter-scoped documents (pleadings, contracts, correspondence) inside its own DMS or via tight integration to a co-deployed ECM. Demotes to ECM-canonical (NetDocuments, iManage Work) when present — common in mid-to-large firms. Always required: every matter has documents."**
   Reason: NetDocuments/iManage are the canonical ECMs in legal; Clio Drive / MyCase Documents are the embedded local masters below that scale.

### VET-PRACT-MGMT (151)

7. **151 → employees (31) | embedded_master | required | "VET-PRACT-MGMT local-masters clinic staff — veterinarians (DVMs with DEA #s), vet techs, receptionists, kennel staff — with credentials, schedule availability, and DEA-prescriber authority. Standalone clinics run no HCM; multi-site practice groups (Mars Veterinary, VCA, NVA) integrate to HRIS at the corporate layer. Demotes to HCM-canonical only at corporate-group scale."**
   Reason: Vet clinics are overwhelmingly solo or sub-10-FTE — the PIMS IS the staff record.

8. **151 → products (384) | embedded_master | optional | "VET-PRACT-MGMT local-masters in-clinic SKU catalog — vaccines, pharma, surgical supplies, retail food/treats. Most PIMS deployments local-master this catalog (no PIM upstream). Optional because some larger groups feed product catalog from a corporate PIM/ERP-procurement integration. Demotes to PIM-canonical when present."**
   Reason: Optional because corporate-group deployments increasingly run a central catalog (NVA, VCA).

### AGENCY-MGMT (153)

Promotions: change `consumer` → `embedded_master` for employees + customers (see Section 3). Net-new rows below.

9. **153 → cost_centers (196) | embedded_master | optional | "Larger agencies model practice areas / office locations as cost_centers for job-profitability rollups; smaller agencies skip. Demotes to ERP-FIN-canonical when present; many holacratic / single-office agencies omit cost-center modelling entirely."**
   Reason: Same `cost_centers + optional` pattern as ATS in HR cluster — convenience modelling.

10. **153 → invoices (75) | embedded_master | required | "AGENCY-MGMT generates client invoices (retainer cycles, milestone bills, T&M with rate-card application) and local-masters them when no ERP-FIN integration is wired. Demotes to ERP-FIN-canonical AR ledger when integrated — mid-to-large agencies (>50 FTE) typically integrate to NetSuite / Sage Intacct. Required regardless: the agency cannot bill without local invoice records."**
   Reason: Agency tools (Workamajig, Function Point, Productive, Scoro) all run a local AR module standalone; ERP integration is a deployment choice.

### MSP-PSA (131)

11. **131 → employees (31) | embedded_master | required | "MSP-PSA local-masters technicians — bench staff with skills, certifications (Microsoft, Cisco), billable-rate tables, and SLA assignment rules. Standalone MSP-PSA deployments (ConnectWise Manage, Autotask, Halo PSA) run no HRIS; large MSPs on enterprise PSA integrate to BambooHR / Paylocity. Required for every msp_time_entry and ticket assignment."**
   Reason: Identical pattern to PSA/AGENCY; MSP-PSA tools all locally master tech staff.

12. **131 → cost_centers (196) | embedded_master | optional | "Larger MSPs model practice lines (Cloud, Security, Help Desk) as cost_centers for service-line profitability; most sub-50-tech shops skip. Demotes to ERP-FIN-canonical when present."**
   Reason: Same as AGENCY-MGMT.

### PSA (68)

Promotions: time_entries(162) consumer → embedded_master, employees(31) consumer → embedded_master, contracts(66) consumer → embedded_master (see Section 3).

13. **68 → customers (97) | embedded_master | required | "PSA local-masters customer-as-buyer records — service-org clients with billing-address, rate-card per customer, AR aging. Demotes to CRM/CDP-canonical when integrated (common at mid-size consultancies on Salesforce + Kantata). Required: every project has a customer, every invoice has a customer."**
   Reason: Gap. PSA had no customers row at all; the existing opportunities(100) consumer captures handoff but not the customer-master demotion.

14. **68 → invoices (75) | embedded_master | required | "PSA generates project invoices (T&M billing, milestone billing, percentage-of-completion under ASC 606) and local-masters them when no ERP-FIN integration is wired. Demotes to ERP-FIN-canonical AR ledger when present — almost always integrated above mid-market. Required regardless of integration shape."**
   Reason: Gap. Same pattern as AGENCY-MGMT invoices.

### LSD (25)

LSD had only 1 row — major gap to fill. LSD (corporate in-house legal-ops, e.g. SimpleLegal, LawVu, Brightflag, Onit) masters its own matter records and outside-counsel records.

15. **25 → legal_matters (391) | master | required | "LSD masters corporate legal matters — in-house matter intake, scoping, outside-counsel assignment, accruals, and reporting. Co-master with LEGAL-PRACT-MGMT (391): law-firm tools own the law-firm side of the same matter (firm intake, conflicts, time entries); LSD owns the corporate-client side (in-house intake, AFA budget, outside-counsel selection, e-billing match). Slice: corporate-side matter lifecycle."**
   Reason: Critical multi-master row — same logical "matter" lives on both sides of the corporate ↔ law-firm boundary; integration friction is well-documented (LEDES e-billing format exists because of this).

16. **25 → engagement_letters (394) | consumer | required | "LSD consumes engagement letters / outside-counsel engagement-acceptance documents authored by the law firm. Read-only signal of fee structure, scope, conflict-clearance status."**
   Reason: Cross-boundary consumer of LEGAL-PRACT-MGMT-mastered engagement letters.

17. **25 → suppliers (206) | embedded_master | required | "LSD local-masters outside-counsel firms as suppliers with rate-card structures, AFA agreements, diversity/D&I attributes, performance scorecards. Demotes to S2P-canonical when integrated (Onit-with-Coupa pattern); below F500 in-house departments typically run LSD standalone with no S2P integration."**
   Reason: Outside counsel = supplier. LawVu/SimpleLegal local-master vendor records.

18. **25 → employees (31) | embedded_master | required | "LSD local-masters the in-house legal team — corporate counsel, paralegals, contract managers — with practice-area specialization and matter-assignment rules. Demotes to HCM-canonical at F500 scale; mid-market in-house teams (<10 lawyers) typically run standalone."**
   Reason: Standard point-solution embedded_master pattern.

19. **25 → invoices (75) | embedded_master | required | "LSD local-masters inbound outside-counsel invoices (LEDES 1998B / 2000 format) with line-item validation against approved AFAs, timekeeper-rate enforcement, and block-billing audit. Demotes to AP-AUTO-canonical when integrated for payment execution (universal at F500). Always required for e-billing workflow."**
   Reason: This is THE core LSD value-prop alongside matter management — outside-counsel invoice review.

20. **25 → contracts (66) | embedded_master | optional | "Some LSD deployments include corporate-contract review queueing (in-flight contracts assigned to corporate counsel for redlining) — local-masters draft state on top of canonical CLM. Demotes to CLM-canonical (Ironclad, ContractPodAi) when present. Optional because many LSD deployments scope to litigation/regulatory matters and leave contracts to CLM/Procurement."**
   Reason: Existing row 110 is `consumer/required` — leave as the holistic case; this new embedded_master/optional row captures the point-solution case where LSD owns a corporate-side contract-review queue. Acceptable shape per SKILL.md: domain reads from canonical when present, holds local copy when not.
   **Decision point:** alternatively, delete row 110 and replace with this single embedded_master row (avoids the "two rows on same edge" pattern SKILL.md warns about). Default recommendation: REPLACE row 110 (see Section 3).

### OMS (32)

OMS is a flagship multi-master case for `orders`. Manhattan Active Omni, IBM Sterling Order Management, fluent commerce, Kibo OMS — all standalone-deployable OMS products own the order record in retailers running OMS detached from the e-commerce front-end. Co-master pattern with B2C-COMM (currently sole master).

21. **32 → orders (381) | master | required | "OMS masters the order record across channels in distributed-OMS deployments (Manhattan Active Omni, IBM Sterling, fluent commerce, Kibo). Co-master with B2C-COMM (381): B2C-COMM owns the checkout slice (cart-to-order conversion, payment authorization); OMS owns the orchestration slice (sourcing, allocation, split, hold/release, modification, cancellation). Required: distributed OMS cannot function without the order master."**
   Reason: Flagship Signal-1 candidate per SKILL.md guidance. Cluster flagship is `orders` — multi-master across B2C-COMM + OMS + (downstream) ERP-FIN journal entries.

22. **32 → order_lines (382) | master | required | "OMS masters order-line orchestration state — allocation status, fulfillment intent, ship-from selection. Co-master with B2C-COMM: e-commerce owns capture, OMS owns orchestration. Required."**
   Reason: Same logic at line granularity.

23. **32 → fulfillments (388) | master | required | "OMS masters fulfillment records — the orchestrated commitment to ship/pick/dropship a set of lines. Co-master with B2C-COMM (post-checkout) and WMS (warehouse execution). OMS owns the orchestration decision; WMS owns the physical pick/pack execution. Required."**
   Reason: OMS-distinct slice.

24. **32 → shipments (389) | master | required | "OMS masters shipment records as the orchestration view of carrier consignment — label generation, tracking-number assignment, carrier selection. Co-master with WMS (pack-out execution) and B2C-COMM (customer-facing tracking display). Required."**
   Reason: Same.

25. **32 → customers (97) | embedded_master | required | "OMS local-masters customer records (ship-to addresses, customer-group pricing, return history). Demotes to CRM/CDP-canonical in holistic deployments (universal pattern). Required: every order needs a customer."**
   Reason: Canonical embedded_master example from SKILL.md prose ("OMS embedded-masters customers").

26. **32 → products (384) | embedded_master | required | "OMS local-masters product records sufficient for orchestration — SKU, dimensions, weight, hazmat flags, ship-from-eligibility per warehouse. Demotes to PIM-canonical for marketing/merchandising attributes. Required: cannot orchestrate fulfillment without product master."**
   Reason: Canonical PIM ↔ OMS pattern.

27. **32 → suppliers (206) | embedded_master | optional | "OMS local-masters dropship-supplier records (3PL warehouses, dropship vendors) when dropship orchestration is in scope. Demotes to S2P-canonical when integrated. Optional because many OMS deployments handle only owned-inventory fulfillment."**
   Reason: Dropship is a deployment-shape variant.

### WORK-MGMT (135)

WORK-MGMT is a workspace-substrate domain. Its data masters are tasks/projects/objectives — but every WORK-MGMT product local-masters its own user roster.

28. **135 → employees (31) | embedded_master | required | "WORK-MGMT local-masters its user/assignee roster — Asana/Monday/ClickUp users with team membership, role, capacity. Workspace users are a superset of employees in many deployments (contractors, agency-side collaborators), but the core required set IS the employee population. Demotes to HCM-canonical when SCIM-provisioned (mid-to-large enterprise pattern). Required: every work_item has an assignee."**
   Reason: Pattern matches LMS/EMP-EXP/ATS embedded-master of employees.

29. **135 → customers (97) | embedded_master | optional | "Some WORK-MGMT deployments invite client-side guests as collaborators on shared projects (Asana guests, Monday client view). Local-mastered as light contact records in those deployments. Demotes to CRM-canonical when present. Optional because most internal-only WORK-MGMT deployments don't model customers at all."**
   Reason: Edge case but real (agency-facing WORK-MGMT use).

30. **135 → time_entries (162) | embedded_master | optional | "Time tracking modules in WORK-MGMT tools (ClickUp Time, Asana Time, Monday Time Tracking) local-master time entries when activated. Demotes to PSA-canonical for billable-services orgs; HCM-canonical for payroll-feeder use. Optional because most WORK-MGMT deployments don't enable time tracking."**
   Reason: Optional add-on across this product category.

### BPA (136)

BPA is design-time-only; it consumes the operational catalog rather than mastering operational records. Add the consumer footprint.

31. **136 → applications (4) | consumer | required | "BPA tools (Signavio, ARIS, Mavim) reference application inventory — every process step links to executing applications for impact-analysis and capability-to-application mapping. Read from APM/ITAM-canonical application master. Required: process-to-application mapping is core BPA function."**
   Reason: BPA / Application-Architecture convergence is a documented vendor strategy (Signavio + LeanIX merger).

32. **136 → process_simulation_runs (250) — already exists as master, leave.** (Skip — existing.)

(Other consumer rows that BPA "should" reference — organizational_units, business_functions, business_capabilities — are missing from the catalog; flagged in Section 6.)

### PROC-MIN (40)

Per SKILL.md, PROC-MIN is a leadership-tier / derived-heavy domain. Republishes signals against upstream operational records and against BPA process_models. The single existing contributor row should be reclassified to `derived` (see Section 3), and consumer rows added for the upstream event sources.

33. **40 → orders (381) | derived | required | "PROC-MIN tools (Celonis, Apromore, Disco, Software AG ARIS Process Mining) consume order/fulfillment event logs and republish derived process-performance signals: variant analysis, conformance-to-model checks, cycle-time outliers, bottleneck identification. Required: order-to-cash is the canonical PROC-MIN use case (Celonis flagship)."**
   Reason: O2C is the textbook PROC-MIN scope.

34. **40 → invoices (75) | derived | required | "PROC-MIN derives signals on the procure-to-pay / invoice-to-cash flows — duplicate-payment detection, payment-block analysis, days-payable-outstanding by vendor segment. Required: P2P is alongside O2C the universal PROC-MIN use case."**
   Reason: P2P is universal Celonis territory.

35. **40 → customer_cases (103) | derived | optional | "Some PROC-MIN deployments analyze ITSM/CSM case-resolution flows. Optional because most PROC-MIN deployments scope to ERP-anchored processes (O2C, P2P, lead-to-cash); case-resolution mining is an extension shape."**
   Reason: Less universal than O2C/P2P.

36. **40 → incidents (47) | derived | optional | "PROC-MIN deployments in IT-ops scope (Celonis ITSM Mining, IBM Process Mining for ServiceNow) derive incident-resolution conformance and major-incident bypass patterns against the canonical ITSM incident log. Optional: deployment-shape-specific."**
   Reason: Niche but real.

37. **40 → work_orders (187) | derived | optional | "Manufacturing-OMS deployments run PROC-MIN against work-order flows for shop-floor process discovery. Optional because manufacturing PROC-MIN is a fraction of overall deployments."**
   Reason: Industry-specific.

---

## Section 3 — CHANGES to existing rows (role demotions / necessity flips)

| existing id | domain | data_object | from role/nec | to role/nec | reason |
|---:|---|---|---|---|---|
| 649 | ACCT-PRACT-MGMT | invoices (75) | contributor/required | embedded_master/required | Karbon/TaxDome/CCH Axcess all locally master client invoices in standalone deployments. The "contributor" label understates point-solution authority — these tools ARE the AR system for solo-CPA practices. Demotes to ERP-FIN-canonical only when integrated (mid-size firms with NetSuite/Sage Intacct). Slice notes should be updated to: "ACCT-PRACT-MGMT local-masters client invoices for time-and-billing workflows. Demotes to ERP-FIN-canonical AR when integrated; mid-to-large firms (>30 staff) typically integrate. Always required regardless." |
| 650 | ACCT-PRACT-MGMT | contacts (98) | contributor/required | embedded_master/optional | Same logic — Karbon contacts ARE the client master in firm-of-one CPAs. Optional because some integrate to CRM. Notes update: "ACCT-PRACT-MGMT local-masters client contacts (clients, controller-side stakeholders, third-party preparers). Demotes to CRM-canonical when present. Optional — many small-firm deployments skip CRM entirely." |
| 648 | ACCT-PRACT-MGMT | time_entries (162) | contributor/required | embedded_master/required | Karbon Time, TaxDome timers, CCH Axcess Practice all local-master staff time entries. Notes update: "ACCT-PRACT-MGMT local-masters timekeeper time entries used for client billing and capacity planning. Demotes to HCM/payroll-canonical when integrated; PSA-canonical irrelevant (not services-firm shape). Required: drives billing." |
| 647 | ACCT-PRACT-MGMT | engagement_letters (394) | contributor/required | embedded_master/required | Karbon Proposals / TaxDome Engagement Letters local-master these documents. Co-master shape with LEGAL-PRACT-MGMT (635 — same data_object, master). Per SKILL.md, two domains can co-master when each owns a genuinely distinct slice — but here BOTH practice domains are point-solution masters of their own engagement-letter copies; neither defers to the other in any deployment. Stronger fit: change 647 to embedded_master with notes "ACCT-PRACT-MGMT local-masters CPA engagement letters per IRS Pub 4557 disclosure requirements; canonical = the practice domain itself (no upstream master across deployments — this stays embedded_master because the catalog shape conventionally treats domain-specific engagement letters as deferring to a true CLM if present)." Alternative: promote to master + accept multi-master with LEGAL-PRACT-MGMT — **decision deferred to Section 7**. |
| 637 | LEGAL-PRACT-MGMT | invoices (75) | contributor/required | embedded_master/required | Clio/MyCase/PracticePanther all local-master client invoices (LEDES output for corporate clients; standard invoice for individuals). Demotes to ERP-FIN AR when integrated (BigLaw on Aderant Elite). Notes: "LEGAL-PRACT-MGMT local-masters law-firm client invoices including LEDES-formatted output for corporate clients. Demotes to ERP-FIN-canonical AR when integrated; mid-to-large firms typically integrate. Required regardless." |
| 638 | LEGAL-PRACT-MGMT | contacts (98) | contributor/required | embedded_master/optional | Clio/MyCase local-master the contact roster (clients, opposing parties, co-counsel, courts). Most small-firm deployments have no CRM. Notes: "LEGAL-PRACT-MGMT local-masters law-firm contacts (clients, opposing parties, co-counsel, courts, judges). Demotes to CRM-canonical when present; uncommon below BigLaw. Optional — many small-firm deployments have no CRM." |
| 636 | LEGAL-PRACT-MGMT | time_entries (162) | contributor/required | embedded_master/required | Legal timekeeper time entries are the practice tool's beating heart — hourly rates, matter-tags, UTBMS task codes. Notes: "LEGAL-PRACT-MGMT local-masters timekeeper time entries with ABA UTBMS task/activity coding. Demotes to HCM/payroll-canonical for payroll feed; never demotes for the billing-source role. Required." |
| 644 | VET-PRACT-MGMT | invoices (75) | contributor/required | embedded_master/required | PIMS (IDEXX Cornerstone, Covetrus AVImark, ezyVet) all local-master clinic invoices with in-clinic POS. Notes: "VET-PRACT-MGMT local-masters clinic invoices including in-clinic POS and pet-insurance claim invoicing. Demotes to ERP-FIN AR for multi-site corporate veterinary groups (NVA, VCA, Mars). Required for every appointment." |
| 735 | AGENCY-MGMT | customers (97) | consumer/required | embedded_master/required | Workamajig, Function Point, Productive, Scoro all local-master agency clients in standalone deployments. Notes: "AGENCY-MGMT local-masters agency clients — buyer-side organizations of every agency_job, retainer, and insertion_order. Demotes to CRM/CDP-canonical when integrated. Required: every job has a client." |
| 736 | AGENCY-MGMT | employees (31) | consumer/required | embedded_master/required | Workamajig/Productive local-master agency staff with discipline tags, billable rates, capacity. Notes: "AGENCY-MGMT local-masters agency staff (account, strategy, creative, production, media) with rate cards, discipline tags, capacity. Demotes to HCM-canonical when integrated; mid-to-large agencies typically integrate. Required." |
| 737 | AGENCY-MGMT | contracts (66) | consumer/required | embedded_master/optional | Some agency tools local-master MSAs / SOWs as light contract records; demote to CLM when integrated. Optional because many deployments only reference contracts by URL/attachment without modelling structurally. Notes: "AGENCY-MGMT local-masters lightweight client MSAs and signed SOWs when no CLM integration is wired — fields, dates, expiry alerts. Demotes to CLM-canonical (Ironclad, DocuSign CLM) when present. Optional — many agency deployments scope contracts to attachment-only." |
| 366 | PSA | employees (31) | consumer/required | embedded_master/required | Kantata/Mavenlink/OpenAir all local-master consultant roster in standalone deployments. Notes: "PSA local-masters consultant pool — staffable resources with skills, certifications, charge-rates, utilization targets. Demotes to HCM-canonical when integrated; pattern is ubiquitous at mid-market services firms (Salesforce + Kantata + Workday). Required: every project assignment joins to a consultant." |
| 280 | PSA | time_entries (162) | consumer/required | embedded_master/required | PSA tools all local-master project-tagged time entries — they ARE the time-tracking system in standalone deployments. Notes: "PSA local-masters project-tagged time entries for billable-hours calculation, utilisation reporting, and rev-rec. Demotes to HCM-canonical for payroll-feed integration; even there PSA retains authoritative-source role for project-time. Required." |
| 369 | PSA | contracts (66) | consumer/required | embedded_master/optional | PSA tools local-master signed SOWs in deployments without CLM (small consultancies); CLM-canonical above mid-market. Notes: "PSA local-masters signed SOWs and master services agreements for billing-rule extraction and milestone definition when no CLM is integrated. Demotes to CLM-canonical (Ironclad, ContractWorks) when present. Optional." |
| 110 | LSD | contracts (66) | consumer/required | embedded_master/optional | **REPLACE** — current row models the holistic case; replace with embedded_master/optional to capture both the point-solution and holistic shape via SKILL.md's runtime demotion. Notes: "LSD local-masters draft contracts under corporate-counsel review (corporate-side queue, redline state, approval routing) when scope includes contract review. Demotes to CLM-canonical (Ironclad, ContractPodAi) when integrated. Optional because many LSD deployments scope to litigation/regulatory and leave contracts to Procurement/CLM." (Alternative: keep consumer + add embedded_master alongside — but that's the exact "don't double-count" anti-pattern from SKILL.md §451. Single embedded_master row is correct.) |
| 433 | PROC-MIN | business_process_models (247) | contributor/required | derived/required | PROC-MIN tools (Celonis, Signavio Process Intelligence, Apromore) consume event logs and **republish** discovered process models / conformance results — this is the derived-signal pattern, not a contributor. Notes update: "PROC-MIN tools auto-discover process models from event logs and republish them as derived projections against the canonical BPA-mastered model — conformance-to-design, variant frequency, performance metrics. Distinct from BPA (master, design-time): PROC-MIN derives runtime variants against the upstream design-time master." |

**Total CHANGES: 15 rows** (14 demotions + 1 derived reclassification).

---

## Section 4 — Signal 1 / 1b impact preview (per data_object)

Aggregate effect of NEW + CHANGES on objects with multi-domain ownership across cluster B:

| data_object | new master count | new embedded_master count | notes |
|---|---:|---:|---|
| employees (31) | unchanged | +6 (ACCT, LEGAL, VET, AGENCY (promote), MSP-PSA, PSA (promote), LSD, WORK-MGMT) | cluster B alone adds 6-8 embedded_master rows on top of existing HCM-canonical + ATS/LMS/EMP-EXP from HR cluster — confirms `employees` as the universal point-solution embedded master |
| customers (97) | unchanged | +6 (ACCT optional, LEGAL optional, AGENCY (promote), PSA, OMS, WORK-MGMT optional) | reinforces customers as Signal-1b flagship across customer-facing + services + commerce point solutions |
| invoices (75) | unchanged | +5 (ACCT (demote), LEGAL (demote), VET (demote), AGENCY, PSA, LSD) | invoices joins customers as a Signal-1b flagship — every services/practice domain local-masters AR until ERP-FIN integration |
| time_entries (162) | unchanged | +3 (ACCT (demote), LEGAL (demote), PSA (promote), WORK-MGMT optional) | + existing MSP-PSA-specific msp_time_entries(235), AGENCY-specific agency_time_entries(479) — fragmentation visible |
| orders (381) | +1 (OMS) | unchanged | new multi-master pair (OMS + B2C-COMM) — flagship Signal-1 row |
| order_lines (382) | +1 (OMS) | unchanged | same pair |
| fulfillments (388) | +1 (OMS) | unchanged | same pair |
| shipments (389) | +1 (OMS) | unchanged | same pair |
| legal_matters (391) | +1 (LSD) | unchanged | corporate-side ↔ law-firm-side multi-master |
| contracts (66) | unchanged | +2 (AGENCY, PSA), 1 demoted (LSD consumer→embedded) | reinforces contracts as a cluster-cross Signal-1b flagship (already seen in S2P, CLM, IT-cluster) |
| products (384) | unchanged | +2 (OMS, VET optional) | small bump |
| suppliers (206) | unchanged | +2 (OMS optional, LSD) | small bump |

The cluster delivers strong Signal-1b enrichment for `employees`, `customers`, `invoices`, `time_entries`, `contracts` and produces a new Signal-1 multi-master case on `orders`/`fulfillments`/`shipments` + `legal_matters`.

---

## Section 5 — Boundary observations (cross-cluster authority sharing)

1. **legal_matters (391) ↔ LSD/LEGAL-PRACT-MGMT boundary.** Same logical matter has two canonical sides — corporate in-house owns intake/budget/accruals; law firm owns conflicts/staffing/billing. The LEDES e-billing standard exists precisely because of this multi-master boundary. Friction-rich integration target.

2. **engagement_letters (394) ↔ LEGAL/ACCT-PRACT-MGMT.** Currently LEGAL masters (635), ACCT contributes (647). In practice both are independent point-solution masters of profession-specific engagement letters (CPA = Pub 4557 attestation language; LEGAL = ABA Model Rules 1.5 fee-disclosure language). Neither defers to the other. Decision deferred (see Section 7).

3. **orders (381) ↔ B2C-COMM/OMS/ERP-FIN-O2C.** Three-way boundary. Currently sole B2C-COMM master. NEW OMS master (row 21) makes it two-way. ERP-FIN-canonical journal entries on order events would make it three-way — out of scope here. Flagship Signal-1 candidate after this backfill.

4. **business_process_models (247) ↔ BPA/PROC-MIN.** Already exists as BPA-master + PROC-MIN-contributor. After Section-3 reclassification, becomes BPA-master + PROC-MIN-derived — the precise shape SKILL.md prescribes for design-time-vs-runtime authority.

5. **time_entries (162) fragmentation.** The catalog has multiple time-entry shapes: generic time_entries (162), msp_time_entries (235), agency_time_entries (479). Each captures domain-specific billing/rate semantics. After this backfill, generic time_entries has embedded_masters in PSA, ACCT, LEGAL, WORK-MGMT — plus existing HCM/Payroll consumers. The fragmentation suggests Signal-2 handoff burden when consolidating to payroll.

6. **contacts (98) vs customers (97).** Two-level boundary across the cluster: practice-management verticals embedded-master CONTACTS (clients-as-individuals); service-firm-management (PSA/AGENCY/OMS) embedded-master CUSTOMERS (clients-as-organizations). The split is intentional — small-firm clients are often natural persons, agency clients are always orgs. Don't conflate.

7. **PROC-MIN is upstream-derived everywhere.** Its event-log dependencies (orders, invoices, incidents, cases, work_orders) span every cluster. A loaded `event_logs` data_object (currently missing — Section 6) would let PROC-MIN consume that single upstream instead of fanning out per source. Architectural smell pointing to a missing core entity.

---

## Section 6 — Missing data_objects flagged for follow-up (not loaded this pass)

These objects are referenced in the reasoning above but do not exist in the catalog. Each is a gap that would meaningfully improve Signal 1/1b accuracy for cluster B and adjacent clusters.

| proposed name | display_label | rationale | should be mastered by |
|---|---|---|---|
| `event_logs` | Event Log | PROC-MIN's primary derived-from source. Today PROC-MIN has no single upstream master and is forced to fan derived rows out per data_object. Without this, PROC-MIN's authority claim is structurally unclear. | DATA-AI-PLAT or DCG (data substrate) — TBD |
| `process_steps` | Business Process Step | BPMN-task-level decomposition of `business_process_models`. Today the parent process_models is mastered but the step-level granularity isn't. Needed for BPA→PROC-MIN conformance comparison. | BPA (136) |
| `organizational_units` | Organizational Unit | Cross-cluster — BPA references it for capability owners; HCM references it for reporting-line; ITAM/APM reference it for application owners. Needed for BPA's consumer footprint (and for the broader catalog). | HCM (canonical) or a master-data domain |
| `business_capabilities` | Business Capability | Distinct from `business_capability_maps` (the artifact) — the underlying capability nodes themselves. APQC, TOGAF reference. | BPA (136) — co-master with EA/APM |
| `outside_counsel` | Outside Counsel Firm | LSD's domain-specific supplier flavor (specialization, AFA terms, diversity attributes). Currently subsumed under generic `suppliers` (206) which is acceptable but loses fidelity. | LSD (25) — domain-specific extension of suppliers |
| `legal_holds` | Legal Hold | LSD-mastered; also referenced by GRC and ECM. Missing entirely from catalog. | LSD (25) |
| `legal_matter_budgets` | Legal Matter Budget | LSD-specific; AFA / fixed-fee / capped-fee matter budgets with burn-down. | LSD (25) |
| `client_portal_messages` | Client Portal Message | Practice-management vertical staple (TaxDome, Karbon Client Portal, Clio Portal). Today this traffic has no data_object representation; cross-cluster handoffs to/from clients are unmodellable. | each practice-mgmt domain or a shared CLIENT-PORTAL data_object |
| `vet_appointments` | Veterinary Appointment | VET-PRACT-MGMT canonical scheduling object — currently absent. Vaccination/lab-result events are loaded but the schedule slot itself isn't. | VET-PRACT-MGMT (151) |
| `vet_treatments` | Veterinary Treatment Record | VET-PRACT-MGMT exam/treatment record — distinct from vaccinations and lab results. Soap notes, diagnoses, procedures. | VET-PRACT-MGMT (151) |
| `agency_projects` vs `agency_jobs` clarification | — | Currently AGENCY-MGMT masters `agency_jobs`(478) as engagement record. Some agency tools (Workamajig, Function Point) model JOBS under PROJECTS (Workamajig hierarchy). Not adding a new object — flagging that aliases on agency_jobs may be warranted: "Project" (Workamajig), "Job" (Function Point), "Campaign" (Scoro). | aliases on 478 |
| `accounting_workflow_templates` | Accounting Workflow Template | Karbon/Jetpack Workflow's signature object — recurring-task templates per service line (1040, 1120, audit). Currently absent. | ACCT-PRACT-MGMT (152) |
| `legal_matter_calendars` | Legal Matter Calendar / Docketing | Court dockets, statute-of-limitations dates, hearing schedules. Currently absent; relevant for legal-specific scheduling friction. | LEGAL-PRACT-MGMT (150) |
| `service_contracts` (MSP) vs `msp_contracts` clarification | — | MSP-PSA already masters `msp_contracts`(234). Subscription-management cluster has its own `customer_subscriptions`(106). The MSP recurring-revenue contract is its own shape (consumption tracking, SLA tiers). Not adding — clarification only. | — |

**Total missing items: 13** — none blocking this backfill, but `event_logs`, `process_steps`, `business_capabilities`, and `organizational_units` are repeatedly referenced enough across clusters that they belong in a near-term backfill pass.

---

## Section 7 — Open questions for human review

1. **engagement_letters (394) ownership — multi-master across LEGAL + ACCT?** Currently LEGAL masters, ACCT contributes. Section-3 row #647 proposes demoting ACCT to embedded_master, but the stronger argument is **promote ACCT to master** with multi-master + slice notes ("LEGAL owns ABA Model Rule 1.5 letter shape; ACCT owns IRS Pub 4557 letter shape — same data_object_name, different professional-rule disclosure language"). SKILL.md explicitly allows multi-master when each domain owns a distinct slice — this case fits. **Recommendation: master + master (multi-master), update notes on both.** Default in this draft: embedded_master (conservative). Flip on review request.

2. **AGENCY-MGMT.suppliers (206) row #739 — consumer or embedded_master?** Existing row is consumer/required. Workamajig and Productive do local-master media outlets and freelancer vendors with rate cards and IRS 1099 attributes — sounds like embedded_master. But this draft leaves it as consumer to limit churn. **Recommendation: review separately, likely promote to embedded_master/required.**

3. **MSP-PSA.customer_assets (56) row #409.** Currently consumer. MSP-PSA tools (Autotask, ConnectWise) actively local-master a per-customer asset inventory (RMM-discovered + manual entries) used for ticket context. This may be embedded_master rather than consumer. **Recommendation: review; likely promote.**

4. **LSD row 110 replace vs preserve.** Section 3 proposes REPLACING row 110 (consumer of contracts) with a single embedded_master/optional row. Alternative: leave row 110 and add a new embedded_master/optional alongside. SKILL.md §451 anti-pattern explicitly warns against the "two rows on same edge" pattern. **Recommendation: REPLACE.** Confirm before loading.

5. **OMS multi-master scope — order_allocations, store_pickup_orders, return_authorizations (424, 425, 426, 427, 428).** Currently OMS-mastered only. These are OMS-domain-specific subtypes (not shared with B2C-COMM) — leave as sole-master. **No action proposed.** Documenting to confirm.

6. **PROC-MIN consumer rows on event-log sources.** Section-2 rows 33–37 model PROC-MIN as `derived` on the operational masters (orders, invoices, etc.). An alternative shape is `consumer` on a synthetic `event_logs` data_object once that's created (Section 6). The current shape works without `event_logs` but proliferates derived-rows. **Recommendation: keep the proposed `derived`-per-source rows now; revisit when `event_logs` lands.**

7. **WORK-MGMT.time_entries (row 30) and customers (row 29) — necessity=optional appropriate?** Both are deployment-shape-specific add-ons (time tracking modules, guest-collaborator features) in Asana/Monday/ClickUp. Marked optional. Reviewer may prefer to omit them entirely from cluster B — defensible. **Default: include, marked optional.**

8. **BPA missing-consumer rows (organizational_units, business_capabilities, business_functions).** Section 6 flags these as missing data_objects. Once they exist, BPA gets ~4–6 additional consumer rows. Not loaded here. **Action: separate follow-up pass after the missing data_objects ship.**

---

## Summary counts

- **Existing rows reviewed:** 67 across 11 domains.
- **NEW rows to add:** 37 (across all 11 domains; concentrated in LSD, OMS, PSA, AGENCY-MGMT).
- **CHANGES to existing rows:** 15 (14 demotions to embedded_master + 1 contributor→derived for PROC-MIN).
- **Missing data_objects flagged:** 13 — none blocking; deferred to follow-up.
- **Open questions for human review:** 8.

**Burden-score directional preview (cluster B contribution):**
- New canonical multi-master rows (Signal 1): +5 (orders, order_lines, fulfillments, shipments, legal_matters).
- New required embedded_master rows (Signal 1b): ~25 (concentrated on employees, customers, invoices, time_entries, contracts).
- Reclassifications shifting weight from contributor/consumer counts → Signal 1b: 14.

Cluster B confirms `employees`, `customers`, `invoices` as universal point-solution embedded-master flagships, and surfaces a new strong Signal-1 multi-master pair on the `orders` / `fulfillments` / `shipments` ↔ B2C-COMM + OMS axis.
