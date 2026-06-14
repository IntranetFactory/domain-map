# Environmental, Health and Safety Management (EHS): questions waiting for you

## What this domain is
Keep your people safe and your sites compliant: log incidents, control hazards, run inspections, and stay ahead of OSHA and environmental rules.

Capture every injury, near-miss, and hazard the moment it happens, then drive each one to a closed corrective action. Run job hazard analyses and risk assessments, schedule and complete inspections and audits, and track the training and contractor qualifications that keep your sites compliant. Manage chemicals and safety data sheets, monitor industrial-hygiene exposures and occupational-health records, and keep environmental permits, emissions, and OSHA logs audit-ready. One place to prove your safety and environmental programs are working, from the shop floor to the regulator.

> EHS was built and loaded live at `record_status='new'` (domain_id=174): 4 modules, 11 capabilities, 15 masters, 5 regulations, 4 personas, and the full data-object, lifecycle, handoff, skill, and RACI footprint. Every band passes. The questions below are market-shape confirmations and optional additions; none of them blocked the build. The recommendations are grounded in a fresh vendor-surface study of the EHS flagships (Cority, Intelex, Sphera, Enablon, VelocityEHS, Benchmark Gensuite) at `.tmp_deploy/EHS-MGMT-phase0-2026-06-14.md`.

---

q1: (answer this first) Is the four-module split for EHS the right shape?

- a) Keep the four modules as built: Safety and Incident, Industrial Hygiene and Occupational Health, Environmental Compliance, and Audit and Inspection.
- b) Collapse Audit and Inspection into Safety and Incident (three modules).
- c) Split a fifth Chemical and SDS module out of Industrial Hygiene.

Recommended: a. The flagship EHS vendors package their suites along exactly these four surfaces. Cority sells distinct Safety, Industrial Hygiene, Occupational Health, Environmental, and Audit modules; Enablon and Sphera package Safety/Incident, Industrial Hygiene and Occupational Health, Environmental Compliance, and Audit/Inspection as separate product areas; VelocityEHS and Benchmark Gensuite both sell Safety, Industrial Hygiene and Chemical, Environmental, and Audit/Inspection surfaces. Audit and Inspection is a separately marketed surface across all five flagships (it shares corrective actions with Safety but ships as its own product), which argues against folding it in (b). Chemical and SDS sits inside Industrial Hygiene at Cority and Enablon but is VelocityEHS's lead surface, which is the only real argument for splitting it out (c); the as-built choice keeps it inside Industrial Hygiene to match the majority packaging. This choice anchors the modules every other answer sits on.

a1:

---

q2: Which business function should own EHS?

- a) Facilities and Real Estate owns; Human Resources, Manufacturing Operations, and GRC contribute; ESG consumes.
- b) Manufacturing Operations owns; Facilities and Real Estate, Human Resources, and GRC contribute; ESG consumes.

Recommended: a. The catalog's function spine lists EH&S under Facilities and Real Estate, which is where the EHS manager typically reports in commercial and multi-site organizations. In heavy-industry and process manufacturers the EHS function reports into Operations or Plant Management instead, which is what option (b) captures. Both are real-world patterns; the build follows the spine default (Facilities and Real Estate as owner) and keeps Manufacturing Operations as a contributor so the process-industry case is still represented. Pick (b) if your install base is predominantly heavy manufacturing or process industries.

a2:

---

q3: Should EHS publish its incident and emissions data upstream to corporate sustainability disclosure (ESG) as built?

- a) Keep both EHS to ESG handoffs: a logged safety incident feeds health-and-safety disclosure metrics, and a recorded emission feeds environmental disclosure.
- b) Keep only the safety-incident to ESG edge; route emissions through Real Estate and Workplace Management instead.
- c) Drop both; ESG sources this data directly from establishments.

Recommended: a. Sphera and Enablon sell both EHS and ESG and explicitly feed operational EHS incident and environmental data into corporate sustainability disclosure, so the upstream edge is real. The nuance is emissions: Real Estate and Workplace Management already owns utility and Scope 1+2 emission source data in this catalog (the emissions records object is ESG-owned), so the emissions edge could be argued to belong to Real Estate rather than EHS, which is option (b). EHS was built as a consumer of the shared emissions records and publishes the establishment-level recorded event upstream, which keeps the operational capture in EHS and the disclosure aggregation in ESG. The safety-incident feed is unambiguous; the only genuine fork is the emissions boundary.

a3:

---

## Optional (will not hold up the build)

q4: Should permit-to-work be added as a first-class entity, distinct from regulatory environmental permits? (yes/no)

VelocityEHS, Cority, Enablon, and Benchmark Gensuite all model permit-to-work (hot work, confined space, lockout-tagout) as a first-class operational entity, separate from the regulatory air/water/waste permits EHS already masters. It ties directly to contractor safety records and site access. Today it lives only in the contractor-safety narrative, not as its own master.

Recommended: yes, but additive and after the modules exist. It is real and uniform across the named vendors; it is non-blocking because the four-module skeleton already absorbs it (attach to Audit and Inspection or a new permit-to-work module).

a4:

---

q5: Should management-of-change (MOC) and serious-injury-and-fatality (SIF) precursor records be added for process industries? (yes/no)

Sphera and Enablon lead on management-of-change for process-safety buyers; SIF-precursor and leading-indicator records are a growing surface across Cority and Benchmark Gensuite. Both are process-industry-conditional, so they fit the optional-master shape rather than universal masters.

Recommended: yes, but additive and conditional. Add them as master-plus-optional entities (MOC to Environmental Compliance or a new process-safety module, SIF precursors to Safety and Incident) when a process-industry buyer needs them. Non-blocking.

a5:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2 q3=B2-S3 q4=B3-S1 q5=B3-S2 | domain_id=174 | phase0=.tmp_deploy/EHS-MGMT-phase0-2026-06-14.md | reversed: none -->
