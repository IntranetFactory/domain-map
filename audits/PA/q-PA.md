# People Analytics (PA): questions waiting for you

## What this domain is
See your whole workforce in numbers: headcount, attrition risk, engagement, and pay equity in one analytics workspace.

People Analytics turns your HR, payroll, and talent data into decisions. Build headcount and attrition scorecards, slice the workforce by org unit, tenure, and performance, and watch the metrics that signal where the organization is headed. Run engagement and pulse surveys, score flight risk with predictive models, and surface pay-equity and representation gaps before they become problems. Publish dashboards your HR business partners and leaders actually use, and push the insights that matter into talent, planning, and compensation work. Start with workforce metrics, then layer in engagement listening, predictive modeling, and diversity analytics as your team grows into a data-driven people function.

---

q1: (answer this first) Should People Analytics stay one unified domain, or be split into two markets?

- a) Keep People Analytics unified (current state): KPIs, attrition, engagement, predictive models, and DEI all in one domain.
- b) Promote People Listening to its own domain (surveys, drivers, action plans), leaving People Analytics as pure analytics.

Recommended: a. The two areas converge in product, and the listening surface still wants a vendor-research pass before it earns its own domain. This choice drives the engagement-scope and DEI-master decisions below it, so it unlocks the rest of the build.

a1:

---

q2: How should the overlap between the Engagement Surveys module and the separate Employee Experience domain be handled?

- a) Keep both and clarify the boundary: Employee Experience runs the surveys, People Analytics scores and aggregates them.
- b) Move engagement surveys to Employee Experience and demote the Engagement Surveys module to a consumer-only view.
- c) Merge the Engagement Surveys module into the Employee Experience equivalent.

Recommended: a. Clarifying the split is the least disruptive fix and matches how pure-play analytics and listening vendors actually divide the work. This couples with q1.

a2:

---

q3: The DEI Analytics module currently masters no entities of its own (it only consumes and derives). Should it get a first-class entity, or stay derived-only?

- a) Add a pay-equity-analyses master to the DEI Analytics module.
- b) Add a DEI-cohorts master to the DEI Analytics module.
- c) Confirm the derived-only design is intentional and leave it as is.

Recommended: a. Pay-equity analysis shows up as a first-class entity with its own lifecycle across the flagship vendors (Trusaic, Syndio, Visier Pay Equity), and the EU Pay Transparency Directive mandates pay-gap reporting, so a dedicated master pays off. Picking (c) makes the related optional research moot.

a3:

---

q4: Two trigger events (attrition_risk.high and attrition.forecast_updated) fire on data People Analytics does not master (employees, owned by HCM; workforce plans, owned by SWP) yet drive People-Analytics-published handoffs. How should this be resolved?

- a) Repoint those handoffs to the People-Analytics-mastered events (attrition_risk.elevated and attrition_forecast.published) and retire the two foreign-mastered events if nothing else publishes them.
- b) Patch the two events to point at the People-Analytics-mastered attrition_forecasts entity.
- c) Accept the cross-domain attribution as legitimate (events fire on the affected data, not the publisher's master).

Recommended: a. It is the cleanest semantic fix and keeps each event tied to a publisher that actually masters its data; option (b) breaks the publisher-master link. This is destructive (repoint and retire), so it needs your sign-off.

a4:

---

q5: Two People Analytics modules consume cross-domain data without any inbound handoff (the Workforce Metrics module pulls CRM customers into people KPIs; the DEI Analytics module pulls HCM positions and compensation data). Is that acceptable?

- a) Keep them as analytics compute-time joins (no handoff needed).
- b) Require an inbound handoff for each consumed entity.
- c) Drop the specific consumer rows as scope creep.

Recommended: a. Treating these as compute-time joins for KPI calculation is normal for an analytics surface; requiring handoffs for every read would be heavy-handed.

a5:

---

q6: One specific relationship feeds CRM customers into people KPIs (for metrics like revenue-per-employee). Keep it or drop it?

- a) Keep it, it is an intentional revenue-per-employee KPI feed.
- b) Drop the relationship.

Recommended: a. The feed is defensible for revenue-per-employee and customer-per-headcount metrics; dropping it is destructive, so it stays unless you say otherwise.

a6:

---

q7: Should the proposed compliance and lifecycle flags be set on engagement surveys (treat survey content as personal data, and lock the response window once a cycle closes)? (yes/no)

Recommended: yes. Survey content can carry special-category personal data and a closed cycle should freeze its response window. This overwrites current boolean values, so it needs your confirmation.

a7:

---

q8: Should the proposed compliance flags be set on predictive models (require one accountable human approver, and treat per-employee scoring as personal data)? (yes/no)

Recommended: yes. Per-employee scoring is personal data and the EU AI Act expects a single accountable human in the loop. This overwrites current boolean values, so it needs your confirmation.

a8:

---

q9: Should attrition forecasts be flagged as carrying personal content (individual-level scores are personal data)? (yes/no)

Recommended: yes. Individual-level scores are personal data, though the effect is weaker now that attrition forecasts are classified as computed. This overwrites a current boolean value, so it needs your confirmation.

a9:

---

q10: Five module rows break self-containment: they require an entity that another domain masters without embedding a local copy. Should I resolve each by either embedding a local shell or relaxing the requirement to optional? (yes/no)

Recommended: yes. Both fixes keep each module self-contained; the choice per row follows the standard rule. This rewrites an existing role or necessity value, so it needs your sign-off.

a10:

---

q11: Several existing APQC process tags on People Analytics handoffs sit in the wrong process family (for example, two attrition-forecast handoffs are tagged under a customer-attrition / CRM process). Should I replace the wrongly-filed tags with the recommended workforce-planning and workforce-analytics matches? (yes/no)

Recommended: yes for the clearly mis-filed CRM-family tags (handoffs 13 and 451). The remaining engagement and requisition handoffs are defensible as-is, so confirm those rather than repoint. Overwriting an existing tag is destructive, so it needs your sign-off.

a11:

---

q14: Compensation Management sends People Analytics an automatically calculated workforce segment that feeds develop diversity, equity, and inclusion plan, but People Analytics does not yet have anyone assigned to that work, so this step has no owner. How should it be handled?
- a) Record it now as work People Analytics owns, and assign a named owner once People Analytics sets up who does this work.
- b) Treat it as an automatically calculated figure with no one to own, and leave it off the list.

Recommended: a. Recording it now means that the moment People Analytics decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a14:

---

q15: Employee Experience and Engagement forwards engagement survey to People Analytics to conduct employee engagement surveys, but People Analytics does not yet have anyone assigned to conduct employee engagement surveys, so this step has no owner. How should it be handled?
- a) Record it now as work People Analytics owns, and assign a named owner once People Analytics sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment People Analytics decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a15:

---

q16: Enterprise Performance Management sends People Analytics an automatically calculated people kpi that feeds develop workforce analytics, but People Analytics does not yet have anyone assigned to that work, so this step has no owner. How should it be handled?
- a) Record it now as work People Analytics owns, and assign a named owner once People Analytics sets up who does this work.
- b) Treat it as an automatically calculated figure with no one to own, and leave it off the list.

Recommended: a. Recording it now means that the moment People Analytics decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a16:

---

## Optional (will not hold up the build)

q12: Several additional first-class entities show up across the flagship People Analytics vendors (dashboards, data-quality audits, benchmark datasets, per-employee attrition-risk assessments, and employee-listening cycles). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. The attrition-risk-assessment master would also give the foreign-mastered attrition event in q4 a proper People-Analytics publisher.

a12:

---

q13: Talent Intelligence (Eightfold, Phenom, Beamery, SeekOut) is a distinct buyer profile (talent acquisition plus internal mobility plus a skills graph). Should I research whether it warrants its own domain rather than folding into ATS, Skills Management, or Talent Management? (yes/no)

Recommended: yes, but additive and non-blocking. Eightfold AI, Phenom, Beamery, SeekOut, and Plum run a distinct buyer profile (talent acquisition plus internal mobility plus a skills graph) from the people-analytics vendors (Visier, Crunchr, Workday People Analytics), and the audit has already queued TALENT-INTEL-PLATFORM in _missing-domains.md; a scoping pass against Eightfold, Phenom, and Beamery decides promote-as-domain versus fold into ATS / Skills Management / Talent Management.

a13:

---

<!-- agent map, ignore: q1=B2-PA-NAMING+B3-EMP-LISTENING-DOMAIN q2=B2-ENGAGEMENT-SCOPE-SPLIT q3=B2-MODULE-84-MASTER+B3-PAY-EQUITY-ANALYSES+B3-DEI-COHORTS q4=B2-EVENT-ATTRIBUTION-DEFECT q5=B2-CROSS-DOMAIN-CONSUMERS q6=B2-CUSTOMERS-FEEDS-KPI q7=B2-PATTERN-FLAGS.engagement q8=B2-PATTERN-FLAGS.predictive q9=B2-PATTERN-FLAGS.attrition q10=B1A-SELF-CONTAIN q11=B1A-APQC-REPLACE q12=B3-DASHBOARDS+B3-DATA-QUALITY-AUDITS+B3-BENCHMARK-DATASETS+B3-ATTRITION-RISK-ASSESSMENTS+B3-EMPLOYEE-LISTENING-CYCLES q13=B3-TALENT-INTEL-DOMAIN q14=B2-B9D-OWN-984 q15=B2-B9D-OWN-250 q16=B2-B9D-OWN-247 | domain_id=63 -->
