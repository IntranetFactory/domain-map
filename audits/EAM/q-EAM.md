# Enterprise Asset Management (EAM): questions waiting for you

## What this domain is
Keep plant and equipment running across their whole life. Plan preventive maintenance, dispatch and track work orders, and follow every asset from commissioning through in-service to retirement. It covers the asset register, preventive and condition-based maintenance scheduling, the work-order lifecycle and mobile technician execution, and the seams to fleet maintenance, real estate, and field service.

---

q1: (answer this first) How should Enterprise Asset Management be split into modules (the sub-areas of the product)?

- a) Two modules: EAM-ASSETS (the asset register and its hierarchy) and EAM-MAINTENANCE-OPS (work orders, PM schedules, and execution).
- b) Three modules: same as (a) but pull PM planning out into its own EAM-PM-PLANNING surface, separating the planning of maintenance from its execution.
- c) Other shape (you propose it).

Recommended: a. The flagship CMMS/EAM vendors co-locate PM planning with work-order execution rather than splitting it out: IBM Maximo files both PM schedules and work orders under Work Management, Hexagon EAM and IFS Cloud EAM bundle PM and work orders in one maintenance-management area, and SAP PM keeps maintenance plans and maintenance orders together inside Plant Maintenance, while all of them carry the asset register as a separate surface (AVEVA APM sits adjacent on the reliability side and feeds the CMMS). That packaging maps to two modules, EAM-ASSETS and EAM-MAINTENANCE-OPS, and gives no vendor support for pulling PM planning into a third module as option (b) proposes.

a1:

---

q2: The work-order to ITSM service-incident escalation link (EAM work orders escalate to ITSM service incidents) is currently wired in. Is that a real first-class escalation path, or modeling drift that should be removed?

- a) Keep as-is (the escalation is real in plant-OT, where a fault becomes a customer-visible IT outage).
- b) Downgrade it to a soft consumer pointer.
- c) Delete it as drift from earlier modeling.

Recommended: a. The escalation is intentional in plant-OT environments. Options (b) and (c) overwrite or remove a live relationship, so they need your sign-off before anything is applied.

a2:

---

q3: Several domains carry a work-order entity (EAM, fleet maintenance, real estate, field service), all currently name-prefixed. Should one domain claim the unprefixed name "work_orders" catalog-wide, or do they all stay prefixed?

- a) EAM owns the bare name.
- b) Fleet maintenance owns it.
- c) Real estate owns it.
- d) Field service owns it.
- e) All stay prefixed forever.

Recommended: e. Keeping every work-order entity prefixed avoids a future collision (for example a generic work_orders for helpdesk ticketing) and this is safe to defer.

a3:

---

q4: The same physical asset has an operational view here and a financial (capitalization) view in ERP finance. How should the financial side be modeled relative to EAM?

- a) Embed fixed_assets inside EAM-ASSETS, so a smaller deployment can capitalize without ERP finance.
- b) Keep EAM a consumer of the ERP finance fixed_assets master (a hard dependency, no embedded shell).
- c) Model two separate entities joined by a relationship.

Recommended: b. Treating fixed_assets as the ERP-finance master keeps a single source of truth for capitalization. This is a catalog-wide modeling call and is safe to defer.

a4:

---

q5: Should APM / Reliability (condition monitoring and predictive analytics) become its own sibling domain, or fold into EAM as capabilities?

- a) Promote it to a sibling domain.
- b) Fold it into EAM as capabilities.

Recommended: a. Flagship reliability vendors sell products distinct from CMMS/EAM, so it clears the point-solution bar on its own. This is a non-blocking idea and does not hold up the EAM build.

a5:

---

q6: Should an Industrial IoT Platform (telemetry ingestion) become its own horizontal domain, or fold into EAM as substrate?

- a) Promote it to a horizontal platform domain serving EAM, manufacturing, real estate, and fleet.
- b) Fold it into EAM as a telemetry-ingestion capability.

Recommended: a. The platform plausibly serves several domains, not just EAM, which argues for a horizontal domain. Non-blocking idea, does not gate the build.

a6:

---

q7: Should Permit-to-Work / Lockout-Tagout become its own specialist domain, or fold into EAM maintenance ops?

- a) Promote it to a specialist, compliance-adjacent domain (this would move the safety permit master out of EAM into the new domain, leaving a shell here).
- b) Fold it into EAM-MAINTENANCE-OPS as a single safety-permit entity.

Recommended: b. Even though specialists exist, the bulk of permit-to-work runs against the EAM work order, so folding it in is the lighter call. Non-blocking idea, does not gate the build.

a7:

---

q8: Which industry scope should EAM's regulations be authored against (this decides which compliance rows land)?

- a) Pharma / biotech in scope (adds FDA 21 CFR Part 11).
- b) Chemical plant in scope (adds OSHA Process Safety Management).
- c) General manufacturing only (ISO 55000 plus OSHA Lockout-Tagout).
- d) All of the above.

Recommended: d. ISO 55000 and OSHA Lockout-Tagout are universal; the pharma and chemical-plant rules only land if those industries are in scope. Pick (c) if you want it lean and have no regulated-industry exposure.

a8:

---

q9: Which actor relationships should be authored from users to the EAM masters (so the build knows who owns and acts on each record)?

- a) Use the proposed verb set: asset owner / commissioner / decommissioner; work-order assignee / created-by / completed-by; PM-schedule maintainer.
- b) You specify the verbs instead.

Recommended: a. The proposed verbs match standard EAM roles and satisfy the explicit-user-edge rule; override only if your org names these roles differently.

a9:

---

q11: This domain is filed as a sub-domain of IT Asset Management, but its market is industrial plant and equipment maintenance (IBM Maximo, Hexagon, IFS), a different buyer from IT asset management (Flexera, Ivanti). Should it be re-parented out of IT Asset Management?

- a) Re-parent to a new physical-asset umbrella over Enterprise Asset Management, facility management, and workplace management.
- b) Re-parent under the existing Real Estate and Workplace umbrella.
- c) Make it top-level (no parent).
- d) Keep it under IT Asset Management.

Recommended: a, otherwise c. EAM vendors (Maximo, Hexagon, IFS, Fiix) sell equipment-uptime and MRO to maintenance and reliability buyers; IT asset management vendors (Flexera, Ivanti, ServiceNow SAM) sell software-license compliance to IT and finance. The vendors and buyers are disjoint, so the current parentage is a naming coincidence on the word "asset." Separately: EAM is an enterprise industrial market, out of scope for the 50-250-user IT-suite question that started this, so this re-parent is the one edit worth doing whether or not EAM is ever built.

a11:

---

## Optional (will not hold up the build)

q10: Beyond the masters modeled today, cross-vendor recall surfaces 16 deeper entity candidates (condition monitoring readings, failure codes, FMEA, asset warranties, vendor service contracts, technician certifications, crews, inspection checklists, oil samples, regulatory compliance logs, as-built drawings, asset meter groups, PM task libraries, failure root causes, MRO parts, tool-crib inventory). Should I run a vetted vendor-surface pass and add the ones that hold up? (yes/no)

Recommended: yes, but additive and after the modules exist, and via a vetted Phase 0 pass rather than loading the raw list (MRO parts is the boundary with inventory management).

a10:

---

<!-- agent map, ignore: q1=B2-MODSPLIT q2=B2-M7-ESCALATES q3=B2-WORK-ORDERS-BARE q4=B2-FIXED-ASSETS q5=B2-DOMAIN-CANDIDATES.apm q6=B2-DOMAIN-CANDIDATES.iiot q7=B2-DOMAIN-CANDIDATES.ptw q8=B2-REG-SCOPE q9=B2-USERS-EDGES q10=B3-MARKET-ENTITIES q11=B2-REPARENT | domain_id=53 -->
