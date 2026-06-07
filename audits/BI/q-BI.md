# Business Intelligence (BI): questions waiting for you

## What this domain is
Turn governed data into reports, dashboards, and certified metrics that the whole business can self-serve.

Author analytical queries against trusted sources, build them into reports and dashboards, certify the shared metrics behind them, and deliver the results on a schedule through subscriptions. It is the consumption layer where Sales, Marketing, Finance, HR, Supply Chain, and Operations actually read the numbers.

---

q1: (answer this first) How should Business Intelligence be split into modules (the sub-areas of the product)?

- a) Two modules: Content Authoring (semantic metrics, queries, dashboards, and reports as the authoring substrate) and Consumption and Delivery (subscriptions plus the published-and-shared lifecycle for dashboards and reports).
- b) Three modules: Semantic Modeling (semantic metrics and queries), Visualization (dashboards and reports), and Distribution (subscriptions, alerts, and delivery).
- c) Other: you name the split.

Recommended: b. The three-module cut maps better to the modeling-versus-visualization separation that ThoughtSpot and Looker (LookML) use; the two-module cut maps better to a Creator-versus-Viewer persona split like Tableau and Power BI. Both clear the minimum module floor, so either is valid. This choice drives the whole build (capabilities, lifecycle states, per-module links, and cross-domain wiring all hang off it), so it unlocks everything else.

a1:

---

q2: Should a subscription be treated as carrying personal data, since it holds recipient lists and delivery addresses? (yes/no)

Recommended: yes. Recipient lists and delivery addresses are personal data and should fall under privacy and retention handling.

a2:

---

q3: Should a published report be frozen so it keeps pointing at the exact query it was published against until it is republished? (yes/no)

Recommended: yes. Freezing the query reference keeps a published report stable and reproducible.

a3:

---

q4: Should a published dashboard be frozen the same way, so it keeps pointing at the exact queries it was published against? (yes/no)

Recommended: yes. Same reasoning as the report freeze: a published dashboard should not silently change underneath its viewers.

a4:

---

q5: Should a semantic metric require a single named approver to certify it? (yes/no)

Recommended: yes. Metric certification is normally a single-data-steward sign-off, so a single accountable approver fits.

a5:

---

q6: The existing Business Intelligence system skill has a description that contains a forbidden em-dash character. Should I overwrite that description with a clean, em-dash-free version? (yes/no)

Recommended: yes. The replacement text is ready and only removes the forbidden character. Because it overwrites a non-empty value, it needs your sign-off.

a6:

---

## Optional (will not hold up the build)

q7: The five objects modeled today (metrics, queries, dashboards, reports, subscriptions) are the headline set. Should I research and add the deeper substrate that flagship BI vendors commonly carry, then load the ones that hold up? Candidates: workspaces (the RBAC and content container), data sources (governed connections to a warehouse or source), alerts (threshold-based push, distinct from scheduled subscriptions), calculated fields (local-to-report computation), embedded-analytics artifacts (which could justify their own module), search or natural-language query artifacts, and content-scoped row-level security policies. (yes/no)

Recommended: yes, but additive and best done after the modules exist. Several of these are universal across the vendor set; note that embedded-analytics artifacts, if confirmed, could grow the three-module cut to four.

a7:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S3.subscriptionpii q3=B2-S3.reportlock q4=B2-S3.dashboardlock q5=B2-S3.metricapprover q6=B2-S4 q7=B3-1,B3-2,B3-3,B3-4,B3-5,B3-6,B3-7 | domain_id=74 -->
