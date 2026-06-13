# Inventory Management (INV-MGMT): questions waiting for you

## What this domain is
Track what stock you hold, where it sits, and when to reorder, across every location. Manage stock items and balances, post movements and transfers, run cycle counts, handle lot and serial tracking with expiry and recall, set reorder rules, and assemble kits from components. Built for the SMB and lower-mid-market band that wants real inventory control without a full warehouse-execution or supply-chain-planning suite.

---

q1: (answer this first) The four sibling stock and balance links that let the Replenishment and Kitting modules share Core Stock's item and balance data currently break the deployable-unit rules. How should they be handled?

- a) Delete all four links, so Replenishment and Kitting always read items and balances from Core Stock by reference (they cannot deploy without Core Stock).
- b) Promote all four to embedded copies, so Replenishment and Kitting carry their own item and balance shells and can deploy standalone.
- c) Mixed: specify which to delete and which to promote.

Recommended: b. Reorder rules and kit definitions plausibly need a local item and balance shell, so promoting keeps Replenishment and Kitting independently deployable and matches how this market packages its modules. This is destructive (it deletes or rewrites existing links) and it shapes whether the modules can stand alone, so it gates the rest of the build.

a1:

---

q2: Seven stock objects carry leftover explanatory notes (config-shape exemptions and pattern-flag context) that a later rule no longer permits. Were these notes approved by you at load time, or auto-populated by an earlier loader? If auto-populated, the agent will clear all seven and log the incident.

- a) I approved them at load time: leave the notes in place.
- b) They were auto-populated: clear all seven notes and log the incident.

Recommended: b. The rule that allowed these annotations was rescinded, so if they were not deliberately approved they should be cleared. This overwrites existing note values, so it needs your confirmation before anything is deleted.

a2:

---

q3: Should stock transfers be frozen once received, so the transfer lines cannot be edited after receipt? (yes/no)

Recommended: yes. Movements posted on receipt are an immutable record, so locking them keeps the ledger trustworthy. This overwrites a current flag value, so it needs your call.

a3:

---

q4: Should inventory lots be frozen (append-only) once a recall is initiated, so recall history cannot be quietly rewritten? (yes/no)

Recommended: yes. A live recall is an evidence chain, so the lot record should only be added to, never edited. This overwrites a current flag value, so it needs your call.

a4:

---

q5: Should serialized units be frozen once scrapped, so a scrapped unit cannot be returned to in-stock by editing it? (yes/no)

Recommended: yes. A scrapped unit is a terminal state and should not flip back without a new record. This overwrites a current flag value, so it needs your call.

a5:

---

q6: Should serialized units be treated as holding personal data when warranty-customer registration captures buyer details on the unit? (yes/no)

Recommended: yes, but only if the warranty-customer tie actually lives on the unit here rather than in the customer-service domain. If buyer registration is captured on the unit, it is personal data and falls under privacy and retention rules. This overwrites a current flag value, so it needs your call.

a6:

---

q7: The seven permission-gated workflow states (post, reverse, approve, reconcile, variance review, recall, scrap) currently leave their owning module unset, relying on the master's module to supply the prefix. Keep that, or pin each gate to a specific module?

- a) Leave them unset and trust the materialization to prefix each gate with its master's owning module.
- b) Pin each gate explicitly to its realizing module.

Recommended: a. The gates are always reachable when their master is installed, so leaving them to auto-prefix is the simpler intent and matches how the masters are owned today.

a7:

---

q8: The seven workflow-gate permissions implied by the lifecycle states are not listed on any role; the roles rely on the permission hierarchy to expand the manage and admin tiers to cover them. Is that implicit-grant pattern intended, or should specific gates be named on specific roles?

- a) Confirm the hierarchy expands the gates and leave the three role bundles as-is.
- b) Add explicit gate grants (for example, approve cycle-count variance on the Finance Inventory Accountant, reorder gates on the Supply-Chain Inventory Planner).
- c) Accept the drift; expect the deployer to fully materialize the hierarchy.

Recommended: a. The hierarchy is designed to expand the manage and admin tiers into these gates, so the bundles can stay lean unless you want a specific gate called out on a named role.

a8:

---

q9: The stock-location master has no alias rows, while the other nine inventory masters each carry two to four. Should it carry vendor synonyms (Warehouse, Branch, Site, DC, Hub, Bin, Zone)?

- a) Load four to six alias rows.
- b) Accept it as self-explanatory and record the exemption in the audit.

Recommended: a. These synonyms are used distinctly across the vendor set, so loading them aids search and matching. Low stakes, does not block the build.

a9:

---

q10: One cross-domain handoff (an inventory lot expiry warning sent to customer service) has two equally plausible process mappings and the audit could not pick one alone. Which fits?

- a) Manage recall related communications.
- b) Manage product recalls and regulatory audits.

Recommended: a. An expiry warning is a customer-facing heads-up rather than a full recall or regulatory audit, so the communications mapping fits more precisely.

a10:

---

q15: Core Financial Management forwards cycle count to Inventory Management to perform inventory accounting, but Inventory Management does not yet have anyone assigned to perform inventory accounting, so this step has no owner. How should it be handled?
- a) Record it now as work Inventory Management owns, and assign a named owner once Inventory Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Inventory Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a15:

---

q16: Governance, Risk and Compliance forwards inventory lot to Inventory Management to monitor and audit recall effectiveness, but Inventory Management does not yet have anyone assigned to monitor and audit recall effectiveness, so this step has no owner. How should it be handled?
- a) Record it now as work Inventory Management owns, and assign a named owner once Inventory Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Inventory Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a16:

---

## Optional (will not hold up the build)

q11: Three extra stock objects show up across the flagship inventory vendors: lightweight demand forecasts (rolling item-level demand from sales history), landed costs (freight, duty, insurance, handling rolled into valuation), and consignment stock (supplier-owned or customer-held ownership distinctions). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. All three are first-class in multiple flagship vendors, though each still wants a verification pass.

a11:

---

q12: The domain has no compliance tags today. Should I research and add the inventory-relevant regulations (FDA 21 CFR Part 211, FSMA-204 food traceability, DEA Schedule II-V, ASC 330 / IFRS IAS 2 inventory valuation, Hazmat / DOT Title 49)? (yes/no)

Recommended: yes, but additive and non-blocking. ASC 330 / IAS 2 applies to every accounting-integrated solution, and the others apply to the pharma, food, controlled-substance, and hazmat sub-segments this domain serves.

a12:

---

q13: Should I add a fourth full module for forecasting (if the demand-forecast object in q11 lands) and a starter kit for small single-location retail (one location, no kitting, simple reorder, no lot or serial complexity)? (yes/no)

Recommended: yes in principle, but the forecasting module only pays off once the demand-forecast object exists, and the starter kit wants a quick check against entry-tier vendor positioning first. Additive and non-blocking.

a13:

---

q14: Two adjacent markets are missing from the catalog entirely: Warehouse Management (picking, packing, slotting, wave planning, scanner workflows) and Supply Chain Planning (demand forecasting, S&OP, MRP-light). Should I add them as new candidate domains for later research? (yes/no)

Recommended: yes, log them as candidate domains. Several inventory handoffs would naturally route into both, but they are separate domains and follow the standard missing-domain flow rather than blocking this build.

a14:

---

<!-- agent map, ignore: q1=B2-S6 q2=B2-S1 q3=B2-S2.transferlock q4=B2-S2.lotlock q5=B2-S2.serialscraplock q6=B2-S2.serialpii q7=B2-S3 q8=B2-S4 q9=B2-S5 q10=B1B-H1 q11=B3-MISSING-DEMAND-FORECASTS+B3-MISSING-LANDED-COSTS+B3-MISSING-CONSIGNMENT-STOCK q12=B3-COMPLIANCE-CANDIDATES q13=B3-MODULARIZATION-CANDIDATES q14=B3-CANDIDATE-DOMAINS q15=B2-B9D-OWN-1326 q16=B2-B9D-OWN-208 | domain_id=164 -->
