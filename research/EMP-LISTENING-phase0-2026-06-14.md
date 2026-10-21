# EMP-LISTENING Phase 0 — Vendor Surface & Triage

Date: 2026-06-14
Candidate: EMP-LISTENING (Employee Listening Platform)
Module: domain_map (id 1001), tenant adenin
Triage mentions: 3 (PA audit, EMP-EXP audit, INTRANET audit)

## VERDICT: fold-into-existing:EMP-EXP

Employee listening (engagement / pulse surveys, eNPS, engagement-driver analytics,
manager action planning) is the **same market** the existing EMP-EXP domain already
owns. It is not a distinct domain. No build was performed; no rows were loaded.

## Live catalog overlap (CLI, never MCP)

EMP-EXP (id 62) "Employee Experience and Engagement" description reads, verbatim:
"Engagement and pulse surveys, 360 feedback, lifecycle (onboarding, exit) listening,
and action planning. Distinct from HRSD case management."

That description IS the employee-listening kernel. EMP-EXP is not a stub; it is fully
built against this market:

EMP-EXP capabilities already loaded (capability_domains -> capabilities):
- 45 Engagement Surveys — "Annual and ad-hoc engagement surveys with benchmarking."
- 46 Pulse Surveys — "High-frequency short-form surveys and topic-specific check-ins."
- 47 360-Degree Feedback — "Multi-rater feedback collection from peers, managers, reports."
- 48 Lifecycle Listening — "Onboarding, stay, and exit interviews tied to tenure milestones."
- 49 Survey Action Planning — "Manager action plans, follow-up tracking, impact measurement."

The candidate's claimed capabilities map 1:1 onto these:
- pulse-survey design          -> cap 46 Pulse Surveys
- engagement-driver modeling   -> cap 45 Engagement Surveys (driver analytics is a sub-feature)
- manager-action planning      -> cap 49 Survey Action Planning
- employee-NPS (eNPS)          -> cap 45 Engagement Surveys (eNPS is a standard survey metric)

EMP-EXP solutions already loaded (solution_domains -> solutions) include the EXACT
vendors cited as EMP-LISTENING evidence:
- Culture Amp (vendor 155)
- Qualtrics EmployeeXM (vendor 156)
- Workday Peakon Employee Voice (vendor 58)
- Glint (vendor 157)  [now Microsoft Viva Glint]
- Lattice (vendor 152), 15Five (vendor 153), Leapsome (vendor 463)

Adjacent domains checked and ruled out as fold targets:
- PA (id, "People Analytics") — HR metrics/dashboards/attrition/DEI ON TOP of the HR
  data stack. PA consumes listening output (sentiment, eNPS, drivers) as one analytics
  input; it does not design or run surveys. crud_percentage 60 (analytics-leaning).
  Listening is an upstream collection+action market, not an analytics market. Not PA.
- HCM — system of record; not survey/listening. Not HCM.
- TALENT-MGMT — performance reviews, goals/OKRs, succession; continuous feedback there
  is performance feedback, not engagement listening. 360 overlaps but already lives in
  EMP-EXP. Not TALENT-MGMT.
- INTRANET — comms/news broadcasting; its own description explicitly disclaims
  "engagement listening / surveys" as belonging to Employee Experience. Confirms EMP-EXP
  as the home, not INTRANET.

## Analyst category test (the fold-vs-promote crux)

Gartner names this market "Voice of the Employee Solutions." Forrester names it
"The Employee Listening Solutions Landscape" (Q4 2023, 25 vendors). Both explicitly
frame listening as "a component within the broader employee experience domain" and
address the research to "employee experience (EX) leaders." Same buyer, same vendors,
same entity surface. "Employee listening" is the current analyst synonym for what our
catalog already carries as "Employee Experience and Engagement." Renaming a synonym is
not a new domain.

## Point-solution-market test

>=3 INDEPENDENT vendors whose flagship is employee listening? YES — Culture Amp,
Qualtrics EmployeeXM, Perceptyx, Medallia EX, WorkTango, Quantum Workplace all qualify.
BUT the point-solution test only decides "is this a real, standalone market?" It does
NOT decide "is this a NEW market not already in the catalog." The market IS real and
standalone — and it is ALREADY loaded as EMP-EXP. A passing point-solution test on an
already-claimed kernel is a fold signal, not a promote signal.

## Flagship vendor M&A / rebrand notes (2026)

- Qualtrics EmployeeXM — taken private by Silver Lake + CPP Investments for $12.5B,
  completed March 2023 (carved out of SAP). Independent (PE-owned). Flagship listening.
- Glint — LinkedIn acquisition (2018); folded into Microsoft Viva as Viva Glint.
  Suite-absorbed (Microsoft). NOT independent.
- Peakon — acquired by Workday (2021); Workday Peakon Employee Voice.
  Suite-absorbed (Workday). NOT independent.
- Culture Amp — independent. Flagship employee experience / engagement / listening.
- Medallia EX — Thoma Bravo-owned (take-private 2021); independent of an HCM suite.
  Flagship VoC/VoE listening; bridges employee + customer experience.
- Perceptyx — independent, VC/PE-backed; enterprise multi-channel listening + people
  analytics + leadership coaching (acquired Cultivate, Humu). Flagship listening.
- WorkTango — independent; combines listening surveys with recognition/rewards
  (Kazoo + WorkTango merger). Flagship listening + recognition.
- Lattice, 15Five, Leapsome — independent people-enablement suites where engagement
  listening is one module alongside performance; already in EMP-EXP.

Independent flagship-listening pure-plays (>=3): Culture Amp, Qualtrics EmployeeXM,
Perceptyx, Medallia EX, WorkTango, Quantum Workplace. Test PASSES — but resolves to
fold, per the analyst-category reasoning above.

## Surface matrix (entity union — for the controller's record; NOT loaded)

Columns: CA=Culture Amp, QX=Qualtrics EmployeeXM, PX=Perceptyx, ME=Medallia EX, WT=WorkTango

| Entity | Category | CA | QX | PX | ME | WT | Class | Already in EMP-EXP? |
| --- | --- | :-: | :-: | :-: | :-: | :-: | --- | --- |
| engagement_surveys | Master | x | x | x | x | x | Core | yes (cap 45/46) |
| survey_campaigns | Master | x | x | x | x | x | Core | yes (implied) |
| survey_responses | Master | x | x | x | x | x | Core | yes (implied) |
| engagement_drivers | Master | x | x | x | x | x | Core | yes (sub of cap 45) |
| action_plans | Master | x | x | x | x | x | Core | yes (cap 49) |
| employee_sentiment_scores | Master | x | x | x | x | x | Core | yes (sub of cap 45) |
| survey_question_templates | Config | x | x | x | x | x | Core | yes (config of surveys) |
| benchmark_datasets | Config | x | x | x | x | . | Common | yes (cap 45 benchmarking) |
| lifecycle_listening_events | Master | x | x | x | x | . | Common | yes (cap 48) |
| three_sixty_reviews | Master | x | . | x | . | x | Common | yes (cap 47) |
| open_text_themes | Analytics | x | x | x | x | x | Core | yes (driver/sentiment) |
| eNPS_scores | Metric | x | x | x | x | x | Core | yes (sub of cap 45) |

Every Core/Common entity in the listening surface is already claimed by EMP-EXP's
capability set. There is no orphaned surface that would justify a separate domain.

## Compliance entities

Employee listening is not a separately regulated market beyond general HR data privacy
(GDPR consent / anonymity thresholds for survey confidentiality). Those belong to the
HR data stack (HCM / PA), not a listening-specific compliance carve-out. None drive a
promote decision.

## Resolved triage-queue entry (for the controller to record)

- Candidate: EMP-LISTENING (Employee Listening Platform)
- Mention count: 3 (PA audit, EMP-EXP audit, INTRANET audit)
- Vendor evidence: Culture Amp, Lattice Engagement, Glint (Viva), Peakon (Workday),
  Qualtrics EmployeeXM (+ Perceptyx, Medallia EX, WorkTango)
- Adjacency: EMP-EXP (home), PA (consumer), HCM (source), TALENT-MGMT (sibling)
- Point-solution test: PASS (>=3 independent flagships) — but already-claimed kernel
- Decision: fold-into-existing:EMP-EXP (already-exists kernel; synonym of an existing
  domain)
- Rationale: "Employee listening" / "Voice of the Employee" is the current analyst name
  for the engagement + pulse + eNPS + driver + action-planning market that EMP-EXP
  ("Employee Experience and Engagement") already owns, capability-for-capability and
  vendor-for-vendor. Both Gartner and Forrester scope listening as a component of EX,
  addressed to the same EX buyer. No distinct entity surface, buyer, or vendor set
  exists that EMP-EXP does not already cover.

## B3 follow-ups (non-blocking ideas; do NOT gate anything)

- EMP-EXP could optionally add Perceptyx, Medallia EX, WorkTango, and Quantum Workplace
  as solution rows to round out the independent-flagship roster (Glint/Peakon/Culture
  Amp/Qualtrics/Lattice/15Five/Leapsome already present). Additive solution-row work,
  not a domain.
- EMP-EXP could optionally surface eNPS and engagement-driver analytics as named
  sub-capabilities if the catalog wants finer capability granularity. Discretionary.
- Consider a one-line note in EMP-EXP's description that "employee listening" / "Voice
  of the Employee" is a recognized synonym, to pre-empt future duplicate candidates.
  (Description edit = a destructive overwrite of a non-empty field -> needs user sign-off;
  not done here.)
