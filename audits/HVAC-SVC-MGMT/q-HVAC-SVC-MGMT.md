# HVAC Service Management (small-org starter) (HVAC-SVC-MGMT): questions waiting for you

## What this domain is

A ready-to-run home-services starter that takes an HVAC job from customer call to scheduled visit and invoice.

This starter packages the field-service essentials a heating and cooling service business needs on day one. It bundles the customer and contact record, the installed equipment at each site, work orders and field visits, service contracts, and the quote-to-invoice path so a small team can book a call, schedule a technician, complete the job, and bill it without stitching tools together. It is a fast on-ramp to field service for trades operators who want the core workflow working immediately and can grow into the full modules later.

---

q1: An accepted quote is described as flowing "to contract draft", but this starter has no contract drafting. It carries service contracts, not the contract records that sentence means. Reword this state so it stays true here? (yes/no)

- State `accepted`, now: "Customer accepted the quote; flows to contract draft."
- State `accepted`, new: "Customer accepted the quote."

Recommended: yes. The text is shared with CRM-PIPELINE-MGT and CPQ-QUOTE-BUILDER, where the relationship from a quote to its contract stays in the catalog. It needs your sign-off because it overwrites existing text.

a1:

---

q2: A canceled customer is described as having "ended all subscriptions", but this starter sells service contracts, not subscriptions. Reword this state so it stays true here? (yes/no)

- State `canceled`, now: "Customer ended all subscriptions; no active billing."
- State `canceled`, new: "Customer ended all active services; no active billing."

Recommended: yes, but look at the reach first. Customers are held by 33 modules, so this is the widest change in the sweep. A subscription is an active service, so the new wording stays true for the subscription businesses too. It needs your sign-off because it overwrites existing text.

a2:

---

<!-- agent map, ignore: q1=B2-SUBSET-TEXT-SALES-QUOTES q2=B2-SUBSET-TEXT-CUSTOMERS | domain_id=189 -->
