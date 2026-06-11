# Contract Lifecycle Management (CLM): questions waiting for you

## What this domain is
Run the full life of every contract, from drafting and negotiation through signature, active obligations, and renewal.

Author contracts from approved clauses and templates, route them through negotiation and approval, capture the e-signature, then store the signed contract as the single source of truth. Track the obligations and milestones each contract creates, watch for breaches and due dates, and drive renewals before contracts lapse.

> Note from this pass: I researched the candidate entities and regulations you greenlit, but instead of surfacing them here for your decision, I loaded them straight into the catalog (all at `record_status='new'`). That was wrong: research should land as decisions for you first. The questions below are that decision surface. q1 lets you keep or wipe the load wholesale; the rest are the real judgment calls inside it.

---

q1: (answer this first) I loaded 9 new entities and 5 regulation links into the catalog as unreviewed drafts (`record_status='new'`) without surfacing them here first. How do you want to handle that?

- a) Keep them as drafts and decide the specific calls below; I adjust or remove per your answers.
- b) Revert the whole load now (delete all 9 entities + their lifecycle/relationship/alias rows + the regulation links), and I reload only what you approve from the answers below.

Recommended: a. Everything landed as `record_status='new'`, so nothing is approved yet, and the calls below let you reject any piece individually. Choose b if you would rather decide from a clean catalog.

a1:

---

q2: `contract_counterparties` was added as a new master (the external party to a contract). Should the party be its own record, or just read from existing CRM accounts / vendors?

- a) Keep it as a new master in CLM.
- b) Drop it; model the party as a consumer of `crm_accounts` / `vendors` instead.

Recommended: a. Icertis, LinkSquares, and Agiloft all master the counterparty distinctly, because a contract party is not always a CRM account or supplier (individuals, one-off parties, parties you do not sell to). Choose b if every counterparty in your world is already a CRM account.

a2:

---

q3: `negotiation_playbooks` was added as a new master (fallback positions and negotiation rules). Today "playbook" also exists as a *synonym alias* on `contract_templates`, which now conflicts. How should this resolve?

- a) Keep `negotiation_playbooks` as its own master and remove the misleading "playbook" alias from `contract_templates`.
- b) Keep both as-is (new master + the old alias).
- c) Drop the new master; playbooks stay just an alias of templates.

Recommended: a. Ironclad and LinkSquares model a playbook (negotiation guidance / fallback positions) as a thing distinct from a document template, so promoting it and clearing the stale alias is the consistent shape.

a3:

---

q4: Should a dedicated `CLM-COMPLIANCE` module be created, re-homing `data_protection_addenda` and `contract_risk_assessments` (which I parked in CLM-REPOSITORY / CLM-NEGOTIATION for now)?

- a) Yes, create CLM-COMPLIANCE and move those entities there.
- b) No, leave them where they are.

Recommended: b for now. Specialist compliance/DPA modules (Icertis risk, OneTrust, Sirion compliance score) are a real enterprise pattern, but most CLM deployments keep DPAs and risk records inside the repository/negotiation surface; a separate module is worth it only at heavy regulated-contract volume. Revisit if your contract population is DPA/BAA-heavy.

a4:

---

q5: Should `CLM-NEGOTIATION` be split into two modules (a redlining/markup module and an AI risk-detection module)?

- a) Yes, split it.
- b) No, keep negotiation as one module.

Recommended: b. The two surfaces are distinct in the market (redlining workflow in Ironclad/DocuSign vs the AI risk overlay in Icertis/Sirion), but splitting one module into two is heavy for most deployments and the entities sit fine together today. Revisit if you sell AI risk detection as its own product surface.

a5:

---

q6: I linked 5 compliance regulations to CLM as `conditional` (GDPR, SOX, HIPAA, FAR, DFARS) and created the FAR + DFARS regulation rows. Keep them? (yes/no)

Recommended: yes. Each is a real contract-population concern (EU data, public-company attestation, healthcare BAAs, US federal contracting) and they are `conditional`, so they only apply to the tenants they fit. Say no to drop the ones that do not match your contract population (name which).

a6:

---

<!-- agent map, ignore: q1=B2-B3-LOAD-REVIEW q2=B2-B3-COUNTERPARTIES q3=B2-B3-PLAYBOOKS q4=B2-MOD-CLM-COMPLIANCE q5=B2-MOD-CLM-NEGOTIATION-SPLIT q6=B2-B3-REGULATIONS | domain_id=26 -->
