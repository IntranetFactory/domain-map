# Cloud Financial Operations (FINOPS): questions waiting for you

## What this domain is
Cloud Financial Operations (FinOps) gives engineering, finance, and product teams the visibility, allocation, and accountability to keep cloud spend under control. It ingests raw cost data from every cloud provider, attributes that spend to the teams, products, and units that caused it, flags anomalies, and surfaces rightsizing and commitment signals before the next billing cycle closes. Today it is a deploy-target stub: it has linked vendor solutions and cross-domain handoffs, but no modules, capabilities, or mastered cost data yet, so it cannot be built without your decisions below.

---

q1: (answer this first) FINOPS is not built yet (no modules, no capabilities, no mastered cost data). How should it be built?

- a) Build as two modules: Cost Analytics (visibility, allocation, anomaly detection, budgets, unit economics) and Cost Optimization (rightsizing, commitment management, Kubernetes cost).
- b) Build as one module, Cost Management, that holds everything.
- c) Defer the build and keep FINOPS as an unbuilt stub for now.

Recommended: a. The flagship FinOps platforms all separate the cost visibility and allocation surface from the optimization and commitment surface, and the capability count lands above the threshold where a split is the right shape. This choice gates the entire build, so it unlocks everything else.

a1:

---

q2: The FinOps practice is currently owned by a Cloud Financial Operations team that sits under Finance, which is already spine-aligned. How should ownership be recorded?

- a) Accept it as-is and close the question. The owner already sits on a sub-function of Finance.
- b) Add a second owner directly on Finance for explicit spine alignment.
- c) Add a second owner on IT Operations, for the pattern where FinOps reports up through the CIO.

Recommended: a. The owner already has spine-aligned ancestry through Finance, so the current arrangement is sufficient.

a2:

---

q3: A cloud-spend threshold-breach event is currently attached to supplier invoices (owned by the procurement domain), which is the wrong source for a FinOps-native event. The clean fix is to give FINOPS its own normalized cloud-cost record and point the event at that. How should this be handled?

- a) Author a FINOPS-owned cloud-cost record (normalized to the FinOps Foundation FOCUS shape) and re-point the event at it. Makes FINOPS the owner of cloud-cost data.
- b) Leave the event mis-attributed and accept the inconsistency.
- c) Deprecate the event and its outbound handoff as mis-modeled, replacing them with a supplier-invoice event published from procurement with FINOPS as the receiver. This deprecation is destructive and needs your sign-off.

Recommended: a. No upstream domain canonically owns normalized cloud-cost rows (cloud-provider billing exports are external feeds), so FINOPS owning this record is empirically correct and the FOCUS spec formalizes the shape.

a3:

---

q4: Should the FinOps cost-data interchange spec (the FOCUS billing-data normalization standard) be added as an industry-standard regulation linked to FINOPS? (yes/no)

Recommended: yes. The catalog already records industry standards alongside statutory ones (for example PCI-DSS and FedRAMP), so this is consistent.

a4:

---

q5: An inbound handoff sends a property-valuation refresh (from the real-estate-investment domain) into FINOPS, which has no plausible tie to cloud cost management. How should it be handled?

- a) Delete the handoff and its attached process mapping. It is most likely scope-creep from a bulk load. Deleting is destructive and needs your sign-off.
- b) Keep it and add a FINOPS consumer for property valuations once the modules exist.
- c) Re-route it to a real-estate or facilities domain if it was meant for a building-asset-cost surface.

Recommended: a. The inbound contradicts the FINOPS scope and looks like a stray load artifact. Because deletion is destructive, it is never done without your approval.

a5:

---

## Optional (will not hold up the build)

q6: FINOPS already meets the solutions floor at five linked vendors. Should the surface be widened with additional FinOps tools (Vantage, CloudZero, Kubecost, AWS Cost Explorer, Azure Cost Management, GCP Billing)? (yes/no)

Recommended: yes, but additive and non-blocking. Verify Kubecost vendor ownership first (IBM acquired Apptio and Kubecost in late 2024).

a6:

---

q7: The flagship FinOps vendors all build around a handful of additional master objects (commitment recommendations, cost anomalies, cloud cost budgets, unit cost definitions, Kubernetes cost allocations). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Most are common across the vendor set, though they still want a verification pass first.

a7:

---

<!-- agent map, ignore: q1=B2-BUILD q2=B2-C1-OWNER q3=B2-CLOUD-COST-MASTER q4=B2-FOCUS-REG q5=B2-HANDOFF-305 q6=B2-A3-WIDEN q7=B3-COMMITMENT-RECS+B3-COST-ANOMALIES+B3-CLOUD-COST-BUDGETS+B3-UNIT-COST-DEFS+B3-KUBE-COST-ALLOC | domain_id=41 -->
