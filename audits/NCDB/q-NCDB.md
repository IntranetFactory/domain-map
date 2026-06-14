# No-Code Database (NCDB): questions waiting for you

## What this domain is
Build a database without code. Model your data, capture it through forms, view it your way, and automate the rest.

Spreadsheet-database hybrids that let non-developers model structured data, link records across tables, build forms, views, and dashboards, and automate work without writing code. Citizen developers in marketing, ops, HR, and PMO buy it self-serve and grow into Business and Enterprise tiers. It is deliberately distinct from a low-code app platform (no managed app runtime), from BI (no warehouse or analytical semantic layer), and from work management (the data model itself is the reason to buy).

---

q1: (answer this first) Who should master the forms object? The form-builder market (Typeform, Jotform, Tally, and similar) is a distinct point solution with its own buyers and pricing, and a candidate FORM-BUILDER domain is queued.

- a) No-Code Database keeps mastery; FORM-BUILDER embeds the forms object when it is promoted.
- b) FORM-BUILDER masters the forms object and No-Code Database demotes to an embedded master.
- c) Defer until FORM-BUILDER is triaged.

Recommended: a. No-Code Database already masters the forms object today and it sits naturally beside the record definitions it writes into; FORM-BUILDER can embed it later. This decision also settles whether the form-side aliases stay on this domain, so it unlocks the alias work below it.

a1:

---

q2: Should the forms object be flagged as holding personal content? Forms are a standard personal-data intake surface across every flagship in this market. (yes/no)

Recommended: yes. Forms routinely capture personal data, so the flag should reflect that for downstream privacy handling.

a2:

---

q3: Should the record definitions object be flagged with a submit lock, so a live-data schema change goes through a controlled migration path rather than a free edit? (yes/no)

Recommended: yes. Once a base holds live data, schema changes need a controlled migration path, which several flagships enforce with explicit schema-deploy gates.

a3:

---

q4: Which compliance frameworks should be linked to No-Code Database as mandatory?

- a) GDPR plus CCPA
- b) GDPR plus CCPA plus HIPAA
- c) none, leave compliance as a cross-cutting concern handled through master pattern flags

Recommended: a. Personal data captured via forms, processed via automations, and sometimes shared externally puts the domain squarely under GDPR and CCPA; add HIPAA only if you expect health intake use, since the market is not itself a regulated category.

a4:

---

q5: Two cross-cutting capabilities are currently attached to No-Code Database: operational data apps and semantic modeling. How should their scope be set?

- a) Keep both on No-Code Database unchanged.
- b) Keep operational data apps, drop semantic modeling (it belongs to data integration / governance / master data).
- c) Keep both and expand each to its full domain set.

Recommended: b. Airtable (Interfaces, Omni), Notion, Coda, and SmartSuite (Solutions) all package an app-building layer over their data, so operational data apps sits squarely on this domain; none of them market a semantic-modeling product, so that capability belongs to data integration / governance / master data, not here.

a5:

---

q6: No-Code Database ships zero inbound handoffs even though it is a natural target of iPaaS pushes, CRM and sales-ops writes, data-catalog scans, data-loss-prevention scans, and BI reads. How should this gap be handled?

- a) Author inbound handoffs from iPaaS, data catalog, data-loss-prevention, and BI as an extension to this domain.
- b) Treat it as report-only; each source domain owes the outbound on its own next audit.
- c) Mixed: confirm the obvious iPaaS and data-catalog owners now, defer the rest.

Recommended: b. The cleanest convention is for each source domain to author its own outbound handoff, so this domain does not absorb edges it does not own; pick (c) if you want the obvious integrations modeled sooner.

a6:

---

q7: For the automation-triggered handoff into work management, which target object does the automation create?

- a) Work items.
- b) Tasks.

Recommended: a. Work items is the most likely target master, but the work-management audit owes the canonical pick; choosing here lets the cross-domain relationship row be authored.

a7:

---

q8: The form-submitted trigger event still has no category. Should it be set to "state change"?

- a) State change (the submission materializes a new row in the linked record definition).
- b) Signal (treat it as a notification for downstream observers).

Recommended: a. It mirrors the record-definition-changed event on the same substrate and reflects that a form submission advances the target record's state.

a8:

---

## Optional (will not hold up the build)

q9: Seven additional market-surface objects show up across the flagship vendors (reusable sync connections, public share links, record comments, base templates, AI-generated field outputs, record revision history, and per-base workspace members). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the open decisions land. Note that public share links are the likely payload for the external-share handoff to data-loss-prevention.

a9:

---

<!-- agent map, ignore: q1=B2-S5 q2=B2-S2.forms-pii q3=B2-S2.recdef-lock q4=B2-S3 q5=B2-S4 q6=B2-S6 q7=B1B-S11.handoff700target q8=B1B-S12-RES q9=B3-NCDB-SYNC-CONNECTIONS,B3-NCDB-SHARE-LINKS,B3-NCDB-RECORD-COMMENTS,B3-NCDB-TEMPLATES,B3-NCDB-AI-FIELD-OUTPUTS,B3-NCDB-REVISION-HISTORY,B3-NCDB-WORKSPACE-MEMBERS | domain_id=134 -->
