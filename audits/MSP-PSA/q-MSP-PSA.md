# MSP Professional Services Automation (MSP-PSA): questions waiting for you

## What this domain is
Run the whole business of a managed service provider from one place: take in tickets, track the time techs spend, bill it, and manage the client contracts behind it all.

This is the multi-tenant operations backbone for an MSP, distinct from in-house IT service management. It covers the service desk, client and contract management, time capture and billing, and technician dispatch, and it hands off to neighboring systems for remote sessions, monitoring alerts, asset records, customer success, and finance.

---

q1: (answer this first) The same client record is mastered in the Contracts module but also carried as a read-only copy in three other modules (service desk, time and billing, dispatch). How should those three copies be handled?

- a) Delete all three copies, so every module reads the one canonical client record (the standard fix; assumes Contracts always ships alongside the other modules).
- b) Promote all three to embedded masters, so each module can carry its own client shell and be deployed standalone (for an MSP that runs, say, ticketing without contracts).
- c) Mixed: keep some as embedded masters and delete others (specify which).

Recommended: a. Every realistic MSP deployment runs Contracts alongside service desk, time/billing, and dispatch, and Contracts holds the client roster. This is a destructive change (deleting existing rows), so it needs your sign-off, and it sets the deployability shape the rest of the build keys off.

a1:

---

q2: One module (service desk) requires a hardware-asset record that is actually mastered by another domain (Hardware Asset Management), which breaks the rule that each module must be able to stand on its own. How should this be fixed?

- a) Carry a local hardware-asset shell inside service desk (an embedded master), so the module is self-contained for standalone deployment.
- b) Mark the hardware-asset dependency as optional rather than required, so the module no longer hard-depends on the other domain.

Recommended: a. An embedded shell keeps service desk deployable on its own. This rewrites an existing dependency row, which is destructive, so it needs your sign-off.

a2:

---

q3: The dispatch module currently owns no data of its own (it only writes into tickets and time entries), which breaks the rule that every full module must master at least one thing. How should it be cured?

- a) Give dispatch its own master, a dispatch schedule or assignment record (flagship vendors model this as a first-class entity).
- b) Downgrade dispatch to a lightweight "starter" module with embedded shells of tickets and time entries, which removes the requirement.
- c) Accept dispatch as a contributor-only module and waive the rule here.

Recommended: a. ConnectWise Dispatch, Autotask, and Halo all model a first-class dispatch-schedule entity, so promoting one cures the no-master rule, but the call is yours.

a3:

---

q4: Which set of user roles should this domain ship with?

- a) The proposed five: Technician, Dispatcher, Account Manager, Billing Admin, CSAT Analyst.
- b) Substitute or add to that list (for example, an Operations Manager with admin across all modules, or a per-client Client Lead).
- c) Defer role authoring to a later pass.

Recommended: a. The five-role set matches a typical SMB MSP (techs, a dispatcher, an ops/account lead, a back-office billing admin, plus a CSAT analyst). This also unblocks the permissions and persona work that depend on it.

a4:

---

q5: Today there are no handoffs between this domain and internal IT service management, which fits its "distinct buyer, distinct market" framing. Should an MSP that also runs its own in-house IT trip a handoff from here into IT service management? (yes/no)

Recommended: no. Keeping the boundary clean matches how the market treats these as separate products; add the in-house escalation handoff only if you have a concrete need.

a5:

---

q6: A chat-message record (mastered by the Workspace Collaboration domain, but consumed here) carries an auto-written note about retention and edit behavior that the rules say should not be machine-populated. How should it be handled?

- a) Approve the note in place (treat it as intentional).
- b) Revert it (clear the auto-written note).
- c) Defer to the Workspace Collaboration domain's own audit, since that domain owns the record.

Recommended: c. The record belongs to Workspace Collaboration, not here, so its audit owner should make the call; this domain only surfaces it.

a6:

---

q7: Should tickets be flagged as containing personal data (the reporter or affected user's name)? (yes/no)

Recommended: yes. Tickets carry reporter and affected-user names, so they hold personal data. The current value is the conservative default and is likely wrong.

a7:

---

q8: Should client records be flagged as containing personal data (the primary contact's name and email)? (yes/no)

Recommended: yes. Client records carry primary-contact name and email. The current value is likely wrong.

a8:

---

q9: Should contracts be flagged as containing personal data (the signatory's details)? (yes/no)

Recommended: yes. Contracts carry signatory data. The current value is likely wrong.

a9:

---

q10: Should invoices be flagged as containing personal data (the remit-to contact)? (yes/no)

Recommended: yes. Invoices carry remit-to contact details. The current value is likely wrong.

a10:

---

q11: Should a time entry lock once it is approved, so an approved timesheet cannot be quietly edited? (yes/no)

Recommended: yes. The submitted-then-approved-then-billed flow already implies the lock, and locking preserves an accurate billing record.

a11:

---

q12: Should a ticket lock once it is closed, so a closed ticket cannot be silently reopened-and-edited? (yes/no)

Recommended: yes. Locking a closed ticket keeps the record stable for audit and billing.

a12:

---

q13: Should a time entry require a single named approver (the technician's lead) rather than any reviewer? (yes/no)

Recommended: yes. Timesheets are normally approved by one accountable lead, so a single-approver gate fits.

a13:

---

q17: Customer Service Management forwards msp service contract to MSP Professional Services Automation to manage Customer Service, but MSP Professional Services Automation does not yet have anyone assigned to manage Customer Service, so this step has no owner. How should it be handled?
- a) Record it now as work MSP Professional Services Automation owns, and assign a named owner once MSP Professional Services Automation sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment MSP Professional Services Automation decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a17:

---

q18: Core Financial Management forwards msp service contract to MSP Professional Services Automation to perform revenue accounting, but MSP Professional Services Automation does not yet have anyone assigned to perform revenue accounting, so this step has no owner. How should it be handled?
- a) Record it now as work MSP Professional Services Automation owns, and assign a named owner once MSP Professional Services Automation sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment MSP Professional Services Automation decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a18:

---

q19: Remote Monitoring and Management forwards msp ticket to MSP Professional Services Automation to resolve customer problems, requests, and inquiries, but MSP Professional Services Automation does not yet have anyone assigned to resolve customer problems, requests, and inquiries, so this step has no owner. How should it be handled?
- a) Record it now as work MSP Professional Services Automation owns, and assign a named owner once MSP Professional Services Automation sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment MSP Professional Services Automation decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a19:

---

q20: One service-desk handoff to Customer Success is filed under a broad "manage customer service problems" process, but a more precise "resolve customer problems" step already exists and is the one your tickets actually run through. Should I re-file that handoff under the more precise step? (yes/no)

Recommended: yes. It is a tidy-up that points the handoff at the step your ticket workflow already realizes. It rewrites an existing tag, so it needs your sign-off; the corrected tag lands as new (unreviewed) for you to confirm.

a20:

---

## Optional (will not hold up the build)

q14: Flagship MSP platforms model six extra first-class objects that this domain currently leaves implicit (block-hour pools, SLA templates, recurring billing schedules, a per-client managed-estate inventory, quotes for new work, and MSP-scoped change requests). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the open decisions above are settled. Each still wants a verification pass against the vendor set first.

a14:

---

q15: The Contracts module currently carries both the client roster and the contracts themselves. Should I research whether flagship vendors split these into a separate Clients module and a Contracts module, and propose the split if they do? (yes/no)

Recommended: yes to the research; the split is a build-shape change that needs vendor evidence first, so it stays optional for now.

a15:

---

q16: Should I research adding per-client compliance overlays that show up for MSPs (PCI DSS when techs handle card data, SOC 2 for the MSP itself, HIPAA business-associate scope for healthcare clients, and US state data-breach notification statutes)? (yes/no)

Recommended: yes, but these are adjacency rather than core, so they want Phase 0 confirmation of how vendors model per-client compliance before anything loads.

a16:

---

<!-- agent map, ignore: q1=B2-S1 q2=B1A-SELF-CONTAIN q3=B2-S7 q4=B2-S5 q5=B2-S6 q6=B2-S3 q7=B2-S2.tickets_pii q8=B2-S2.clients_pii q9=B2-S2.contracts_pii q10=B2-S2.invoices_pii q11=B2-S2.timeentry_submitlock q12=B2-S2.ticket_submitlock q13=B2-S2.timeentry_singleapprover q14=B3-BLOCK-HOURS+B3-SLA-DEFS+B3-RECURRING-BILLING+B3-ESTATE-INVENTORY+B3-QUOTES+B3-CHANGE-REQUESTS q15=B3-MODULARIZATION-CONTRACTS-SPLIT q16=B3-PCI-DSS+B3-SOC2-MSP+B3-HIPAA-BAA+B3-DATA-BREACH-STATUTES q17=B2-B9D-OWN-6 q18=B2-B9D-OWN-55 q19=B2-B9D-OWN-927 q20=B2-B9D-RETAG-523 | domain_id=131 -->
