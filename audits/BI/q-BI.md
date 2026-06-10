# Business Intelligence and Analytics (BI): questions waiting for you

## What this domain is
Turn governed data into reports and dashboards your whole organization can explore, then deliver the answers to the people who need them on a schedule.

Business intelligence and analytics gives teams a self-service way to ask questions of their data without waiting on engineering. Analysts build saved queries against a governed semantic layer, assemble the results into reports and interactive dashboards, and publish them for the wider business to explore on their own. Shared metric definitions keep everyone working from the same numbers, so a figure on a sales dashboard means the same thing as the one in a finance report. Content moves through a clear lifecycle from draft to published to certified, access controls decide who can view, edit, or share each artifact, and once content is live, subscriptions push reports and dashboard snapshots to inboxes on a recurring cadence while failures and runaway queries raise signals that operations and cost teams can act on.

> Grounding: these recommendations are backed by a fresh vendor-surface study (5 flagship BI vendors plus the embedded-analytics and headless-semantic-layer markets, 2025-2026 product docs) saved at `.tmp_deploy/BI-phase0-2026-06-08.md`. One boundary frames the whole domain: the "semantic model / governed metric" concept is split two different ways in the market. Every flagship BI tool ships its OWN embedded semantic layer (Power BI's DAX/tabular semantic model, Looker's LookML model, Qlik's master items, ThoughtSpot's Model), while standalone "headless" layers (dbt Semantic Layer, Cube) are a separate category that BI tools consume by API. So BI masters its own native metrics AND consumes the headless layer, which is exactly the dual-master shape the catalog already encodes (BI and the headless Metrics Layer both appear, BI consumes the Metrics Layer's metric definitions). No reversal there: the fresh evidence confirms it.

---

q1: (answer this first) How should Business Intelligence be split into modules (the sub-areas of the product)?

- a) Two modules: Content Authoring (data sources, native semantic metrics, saved queries, dashboards, and reports as the authoring substrate) and Consumption and Delivery (subscriptions, alerts, and the published-and-shared lifecycle).

- b) Three modules: Semantic Modeling (data sources, native semantic metrics, and queries), Visualization (dashboards and reports), and Distribution (subscriptions, alerts, and delivery).

- c) Four modules: the three above plus a separate Embedded Analytics module (only if you want embedded analytics carved out, see q7).

- d) Other: you name the split.

Recommended: b, with c as a live option if embedded analytics matters to you. The two cuts map onto two real ways flagship vendors package the product. The persona cut (option a) is how Tableau and Power BI sell: Tableau licenses Creator ($75), Explorer ($42), and Viewer ($15), an author-versus-consume split, and Power BI's Pro / Premium-Per-User / Fabric editions keep the same author-versus-viewer divide (viewers go free at Fabric F64). The layer cut (option b) is how Looker and ThoughtSpot are built: Looker separates the LookML modeling surface (model and Explore) from the visualization surface (Look and Dashboard), and ThoughtSpot separates its Model (the ex-Worksheet semantic surface) from its Liveboards and Answers, each operated by a different role. The three-module layer cut maps more cleanly to how the modeling work is actually governed and is the better default. Option c becomes right if you treat embedded analytics as a first-class line: Power BI Embedded, Sisense (developer-led SDK/APIs), and Tableau Next's External Embedding SDK (2025) are a distinct developer buying motion, and the market view is that neither Tableau nor Power BI is architecturally built for embedding, so it reads as its own surface. This choice gates the whole build (capabilities, lifecycle states, per-module links, cross-domain wiring all hang off it).

a1:

---

q2: Should a subscription be treated as carrying personal data, since it holds recipient lists and delivery addresses? (yes/no)

Recommended: yes. Across Power BI, Tableau, Looker, Qlik, and ThoughtSpot a subscription (or scheduled delivery) is defined by its recipient list and delivery destination, which are personal data, and subscriptions push report and dashboard snapshots to those inboxes. Treating the subscription as personal-data-bearing puts recipient lists and delivery addresses under privacy and retention handling, which is the correct shape for an entity whose whole purpose is to fan content out to named people. This flag applies cleanly because the subscription master is now typed as an operational workflow.

a2:

---

q3: Should a published report be frozen so it keeps pointing at the exact query it was published against until it is republished? (yes/no)

Recommended: yes. The vendors model a published report as a stable, reproducible artifact: Power BI separates the report from its semantic model so a published report renders against a fixed model version, and Tableau and Looker treat a published view or Look as a snapshot of what was authored, not a live-rewiring surface. Freezing the query reference on publish keeps a published report from silently changing underneath the people reading it, which is the behavior every flagship tool exhibits. Because reports are typed as an operational workflow, the submit-lock flag fits the publish gate.

a3:

---

q4: Should a published dashboard be frozen the same way, so it keeps pointing at the exact queries it was published against? (yes/no)

Recommended: yes. Same vendor behavior as the report case: a Power BI dashboard binds to its published semantic model, a Tableau dashboard publishes as a fixed composition of views, and a ThoughtSpot Liveboard groups saved Answers rather than re-deriving them live. A published dashboard that re-rewires its queries underneath its viewers would break the reproducibility the vendors all preserve, so the freeze-on-publish flag is right here too.

a4:

---

q5: Should a semantic metric require a single named approver to certify it? (yes/no)

Recommended: yes. In the governed-metric model the vendors ship, a metric is certified by a single data steward: the certified-metric pattern (a steward signs off that this is the canonical definition) is how Power BI, Looker, and the headless layers (dbt, Cube) all establish trust in a shared number, and the whole point of the certification is that one accountable person owns the definition. A single accountable approver matches that single-steward sign-off. Note this flag governs BI's OWN native semantic metric; the separately-mastered headless metric definitions (consumed from the Metrics Layer) carry their own certification on that side.

a5:

---

q6: The existing Business Intelligence system skill has a description that contains a forbidden em-dash character. Should I overwrite that description with a clean, em-dash-free version? (yes/no)

Recommended: yes. The replacement text is ready and only removes the forbidden character (the proposed wording: "System skill for Business Intelligence and Analytics: runtime workflows over the domain's master data, derived from masters and cross-domain handoffs."). Because it overwrites a non-empty value it needs your sign-off, but it changes nothing of substance.

a6:

---

## Optional (will not hold up the build)

q7: The five objects modeled today (metrics, queries, dashboards, reports, subscriptions) are the headline set. Should I research and add the deeper substrate that flagship BI vendors commonly carry, then load the ones that hold up? Candidates: data sources (governed connections, first-classed by all five vendors), workspaces (the RBAC and content container: Power BI workspace, Tableau project, Looker folder, Qlik space), alerts (threshold-based push, which every vendor models as distinct from a scheduled subscription), calculated fields (local-to-report computation), content-scoped row-level security policies (Power BI RLS, Tableau data policies, Looker access_filter, Qlik section access), search or natural-language query artifacts (ThoughtSpot Answers, Power BI Copilot/Q&A, Tableau Pulse), and embedded-analytics artifacts. (yes/no)

Recommended: yes, additive and best done after the modules exist. Five of these are Core in the vendor matrix (data sources, workspaces, alerts, and RLS appear first-class in all five flagship tools; alerts in particular are modeled separately from subscriptions by Tableau, Looker, and Qlik, so bi_alerts is a real master, not a subscription variant). The embedded-analytics artifact is the one with a module implication: if it lands as confirmed it argues for a dedicated Embedded Analytics module, which turns the three-module cut in q1 into four (option c). Search/NLQ artifacts are the weakest candidate and may just be a provenance flavor of saved queries rather than a separate master.

a7:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S3.subscriptionpii q3=B2-S3.reportlock q4=B2-S3.dashboardlock q5=B2-S3.metricapprover q6=B2-S4 q7=B3-1,B3-2,B3-3,B3-4,B3-5,B3-6,B3-7 | domain_id=74 | phase0=.tmp_deploy/BI-phase0-2026-06-08.md | reversed: none (fresh evidence CONFIRMS the existing recommendations: 3-module cut grounded in Looker/ThoughtSpot layer split, dual-master semantic_metrics confirmed by BI-native-vs-headless boundary) -->
