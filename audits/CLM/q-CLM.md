# Contract Lifecycle Management (CLM): questions waiting for you

## What this domain is
Draft, negotiate, sign, and track every contract from first draft through renewal in one place.

Manage the entire life of a contract without losing the thread. Author new agreements from a library of pre-approved clauses and templates, route them through legal and business review, and capture redlines as counterparties negotiate. When terms are settled, send for electronic signature and store the executed document in a searchable repository.

After signing, the work continues: track the obligations each contract creates, get ahead of due dates and renewals, and know the moment a commitment is satisfied, breached, or waived. Every contract stays current, every deadline stays visible, and the organization always knows what it has agreed to.

---

q1: You asked whether most installations use compliance, whether out-of-the-box compliance would just be ballast, and whether an optional CLM-COMPLIANCE module would be better. Answer first: a dedicated compliance surface is NOT the norm. Most CLM deployments (Ironclad, DocuSign CLM, Agiloft, LinkSquares, and the CLM modules inside Salesforce Revenue Cloud and ServiceNow) keep data-protection addenda and contract-risk records inside the repository / negotiation surface and do not ship a separate compliance module. A standalone compliance product surface is the heavy-regulated pattern: Icertis Contract Intelligence (risk and compliance scoring), Sirion (compliance score), and OneTrust (DPA management) build it out as its own product. So you are right that forcing compliance on every tenant would be ballast for the majority. Given that, how do you want to shape it?

- a) Add CLM-COMPLIANCE as an OPTIONAL add-on module. Tenants that run a heavy regulated-contract population opt in; we re-home data_protection_addenda (1055), contract_risk_assessments (1052), and the compliance obligations there. Everyone else never sees it.
- b) Do not create the module. Leave data_protection_addenda and contract_risk_assessments where they sit today (CLM-REPOSITORY / CLM-NEGOTIATION). This is the current shape.
- c) Create it as a standard full module that ships for every CLM tenant.

Recommended: a. A dedicated compliance/DPA/risk surface is a real enterprise pattern but a heavy-regulated one: Icertis Contract Intelligence, Sirion, and OneTrust package it as its own product, while Ironclad, DocuSign CLM, Agiloft, LinkSquares, and the embedded CLM modules in Salesforce Revenue Cloud and ServiceNow keep DPAs and risk records inside the repository/negotiation surface and ship no separate compliance module. An optional add-on captures both realities: it is there for the regulated tenants who need it (option c forces ballast on the majority) without dropping the capability entirely (option b). If you pick a, a Phase 0 vendor-surface report is run before the module is stood up, and the move is additive (record_status='new').

a1:

---

<!-- agent map, ignore: q1=B2-MOD-CLM-COMPLIANCE | domain_id=26 -->
