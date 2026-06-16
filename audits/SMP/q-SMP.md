# SaaS Management Platform (SMP): questions waiting for you

## What this domain is
See every SaaS app your company pays for, cut wasted licenses, and never miss a renewal.

Discover every SaaS application in use, sanctioned or not, see who owns each one, and track real usage against what you pay for. Reclaim idle licenses automatically, run renewals on a schedule instead of in a panic, and give employees a self-service catalog to request the apps they need. One place to manage your whole SaaS portfolio, from first sign-up to final offboarding.

---

q1: (answer this first) On 13 relationship rows the "owning side" and the parent-to-child wording disagree. Should I run the cleanup pass on them? Each change overwrites an existing value, so it needs your go-ahead. (yes/no)

The 13 rows and what each change would be:

- 1475 saas_applications integrates_with smp_app_integrations: flip owning side to the app (the app is the parent that has many integrations).
- 1487 smp_renewal_engagements negotiated_under smp_vendor_negotiations: flip owning side to the engagement (it is the parent of its negotiations).
- 1488 saas_subscriptions allocates smp_spend_allocations: flip owning side to the subscription.
- 1490 saas_applications automates_app smp_automation_workflows: flip owning side to the app.
- 1480 saas_applications recommends_for_app smp_optimization_recommendations: keep the owning side (the app is already the parent), just swap the wording so it reads parent-to-child.
- 1481 saas_subscriptions recommends_for_sub smp_optimization_recommendations: keep owning side, swap wording.
- 1483 saas_applications benchmarks_for smp_app_benchmarks: keep owning side, swap wording.
- 1484 saas_subscriptions tasks_for smp_renewal_tasks: keep owning side, swap wording.
- 1486 saas_subscriptions engagement_for smp_renewal_engagements: keep owning side, swap wording.
- 1489 saas_applications assesses_app smp_vendor_risk_assessments: keep owning side, swap wording.
- 1492 smp_app_catalog_listings requests_listing smp_app_requests: keep owning side, swap wording.
- 1477 saas_applications raised_for smp_alerts: keep owning side, swap wording.
- 1478 shadow_it_apps raised_for_shadow smp_alerts: keep owning side, swap wording.

Recommended: yes. This is a soft issue that never blocks the build, but the owning side drives delete behavior and how the relationship diagrams render, so aligning it is worth it. Four rows flip the owning side; nine only swap the wording so it reads parent-to-child (the owning side is already correct).

a1:

---

q2: SMP tagged one of its outbound handoffs with the wrong process. Handoff 44 (SaaS Management Platforms hands a contract to Contract Lifecycle Management) is tagged "Manage demand for products", but the contract belongs to "Negotiate and document agreements/contracts" in CLM. How should I fix the tag?

- a) Re-point the tag to "Negotiate and document agreements/contracts" (the process that actually owns contracts).
- b) Delete the tag (leave that handoff untagged).
- c) Leave the tag as it is.

Recommended: a. The contract is already owned by "Negotiate and document agreements/contracts" on the CLM side, so re-pointing the tag there makes the handoff point at the right process instead of an unrelated one. This re-points an existing tag, so it needs your sign-off.

a2:

---

## Optional (will not hold up the build)

q3: A fresh market scan (2026-06-16) found the SMP automation module thin: it has the workflow plumbing but not the access-governance and compliance-evidence layer that flagship vendors treat as core (user-access reviews, entitlement grants, data-deprovisioning logs, per-leaver offboarding runs, a discovery-source registry, app-account records). Should I draft the load proposal for the ones that hold up, for you to approve before anything is written? (yes/no)

Recommended: yes. Access reviews and deprovisioning evidence are SOX/SOC2 staples that Zluri, Torii, Josys, Setyl, and BetterCloud all ship as first-class surfaces (access review campaigns, entitlement grants, and per-leaver offboarding runs), while Productiv and Zylo lean more on usage analytics; the gap is real depth inside the automation module rather than a structural problem. Because these are net-new entities, a "yes" only produces the per-entity proposal for your approval; nothing loads until you sign off on the specific list.

a3:

---

<!-- agent map, ignore: q1=B2-B6B-OWNERSIDE q2=B2-B9D-MISTAG-44 q3=B3-ACCESS-GOV-ENTITIES | domain_id=85 -->
