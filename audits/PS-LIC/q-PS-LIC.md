# Public-Sector Permitting and Licensing (PS-LIC): questions waiting for you

## What this domain is
Take permit and license applications, issue and renew them, schedule inspections, enforce code, and bill regulatory fees in one civic-services workflow.

Run the full licensing and permitting lifecycle for a government agency from a single workflow. Applicants submit permits and license applications, staff review and route them, and approved records are issued, tracked, and renewed on schedule. Field inspectors work scheduled inspections against each permit, and failed inspections open code-enforcement cases that carry through contest and resolution. Regulatory fees are assessed at each gated step and handed to finance for collection, while constituents follow their case from submission to approval. The result is faster turnaround, a defensible audit trail on every decision, and one connected record of every license, permit, inspection, and fee an agency manages.

---

q1: (answer this first) How should Public-Sector Permitting and Licensing be split into modules (the sub-areas of the product)?

- a) Four modules aligned to the lifecycle: Application Intake (permit applications), Issuance and Renewal (license records and renewals), Inspection and Enforcement (inspections and code violations), and Fees (regulatory fees).
- b) Two modules: Applications and Licensing (applications, licenses, renewals) versus Field Ops (inspections, violations, fees).
- c) Three modules: Intake, Compliance, and Billing.
- d) A single full module (PS-LIC-CORE) plus a lighter starter variant for small county or SMB deployments.

Recommended: a. It maps cleanly to the four lifecycle phases, gives each area a small ownable scope, and satisfies the rule that a domain with this many capabilities needs at least two modules. This choice drives every downstream fix (lifecycle gates, handoff wiring, the capability-to-module mapping), so it unlocks the rest of the build.

a1:

---

q2: Which capability set should Public-Sector Permitting and Licensing ship?

- a) Eight capabilities (recommended): application intake, license issuance, inspection scheduling and dispatch, code-enforcement workflow, license renewal lifecycle, regulatory fee assessment, constituent-facing portal access, and accessibility / OFCCP compliance reporting.
- b) Five capabilities (narrow): intake, issuance, inspection, renewal, fees.
- c) Ten capabilities (broad): the recommended eight plus hearings / appeals, public-records access, and GIS-parcel integration.

Recommended: a. The eight-capability set covers the current six data objects with one capability per real workflow and pairs naturally with the four-module split in q1. Pick (b) only for a deliberately stripped-down deployment.

a2:

---

q3: Several records hold constituent personal data (applicant, licensee, cited party). Should I flag permit applications, license records, license renewals, and code violations as carrying personal data, and lock a permit application from further edits once it is submitted? (yes/no)

Recommended: yes. These records carry applicant and licensee personal data that falls under privacy and retention rules, and a submitted application should be immutable for a clean intake audit trail. Flipping these flags is a judgment write, so it needs your confirmation.

a3:

---

q4: For a code violation, who approves the enforcement decision?

- a) A single hearing officer (treat it as a single-approver workflow).
- b) A panel or board (no single approver).

Recommended: depends on your jurisdiction. Many agencies use one hearing officer (pick a), but board-driven jurisdictions should pick (b). This is the one pattern flag that is genuinely jurisdiction-dependent, so it is yours to call.

a4:

---

q5: Today every Public-Sector Permitting and Licensing deployment inherits four mandatory regulations (FedRAMP, CMMC, StateRAMP, Section 508). Is that scoping right, or should it change?

- a) Keep all four mandatory (cloud-hosted public-sector tenants are the realistic deployment shape).
- b) Demote FedRAMP and CMMC to optional (they apply only to federal-contractor jurisdictions).
- c) Add ADA Title II as a missing mandatory regulation.
- d) Also consider NIST SP 800-53, IRS Pub 1075 (revenue-touching license types), and HIPAA (regulated occupations).

Recommended: a. Most tenants are hosted public-sector cloud, so the four-regulation baseline is realistic; choose (b) if you are scoping for small counties with no federal-contractor obligations. Note that (c) and (d) may also surface new entities to add later.

a5:

---

q6: The cost band is set to $$$ (annual TCO of $100k to $500k for a 500-user org) and the US market size to $1B TAM, anchored to 2025. How should this be confirmed?

- a) Confirm the current values (scoped to pure-play permitting platforms).
- b) Widen the scope to all civic permitting and licensing software and refresh the TAM upward.
- c) Cite a specific Gartner, IDC, or Forrester source year.

Recommended: a, unless you want the broader civic-tech comparator. The $1B figure reads low against the whole civic-tech market but is reasonable scoped to pure-play permitting. Low stakes, does not block the build.

a6:

---

## Optional (will not hold up the build)

q7: Flagship permitting vendors (Accela, OpenGov, Tyler, ServiceNow) model several deeper objects that are not in the catalog yet: permit types, license types, inspection checklists, regulatory codes, payment records, appeals, permit extensions, and attached documents. One more (a parcel or business-address master) has no home today and may need either an extended locations master or a new GIS domain. Should I research these against the vendor schemas and add the ones that hold up? (yes/no)

Recommended: yes, but additive and best done after the modules exist; the parcel / address master is the one that may surface a separate domain decision rather than a simple add.

a7:

---

<!-- agent map, ignore: q1=B2-1 q2=B2-2 q3=B2-3.pii q4=B2-3.approver q5=B2-4 q6=B2-6 q7=B3-1+B3-2+B3-3+B3-4+B3-5+B3-6+B3-7+B3-8+B3-9+B3-10 | domain_id=46 -->
