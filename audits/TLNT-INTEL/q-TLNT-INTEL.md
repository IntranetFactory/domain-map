# Talent Intelligence (TLNT-INTEL): questions waiting for you

## What this domain is
Match people to internal opportunities and growth moves with AI across your whole workforce.

Talent Intelligence runs an internal talent marketplace (post opportunities, take applications), turns skills and aspirations into AI-driven mobility recommendations, fit scores, and projected career paths, and rolls everything up into workforce-wide skills insights. It keeps an audit trail of every match-inference run, and it leans on HCM for the worker record and on Skills Management for the skill graph rather than mastering those itself.

---

q1: (answer this first) How should the AI-matching outputs (fit scores, mobility recommendations, career paths) be handed off to the systems that consume them?

- a) All inference-output handoffs as event_stream (publish the firing signal, fire-and-forget).
- b) Mix: event_stream for the broadcast signals (fit score, mobility recommendation) and api_call for the synchronous reads (an accepted application that moves a worker).
- c) Other (specify).

Recommended: b. Flagship vendors run a hybrid: the inference signal goes out on an event stream while the consuming system reads the full payload via API. This choice unblocks the entire outbound publishing layer (the missing outbound handoffs, the matching cross-domain relationship rows, and their APQC tags all wait on it).

a1:

---

q2: Should mobility recommendations carry a real user-facing lifecycle (proposed, then dismissed, pursued, or expired), instead of being treated as a pure computed output?

- a) Keep all four inference outputs as typed computed/operational-record, no lifecycle (note: the analyst leaned toward a lifecycle on mobility recommendations only).
- b) Author the lifecycle on mobility recommendations only, re-typing it to an operational workflow.
- c) Author a lifecycle on more than one of them (specify which).
- d) Other per-master mix (specify).

Recommended: b. Eightfold and Gloat both ship a proposed to dismissed/pursued/expired flow for mobility recommendations, while fit scores, career-path suggestions, and match-inference runs read as pure inference outputs with no user state. They already pass structurally as typed columns, so this is an editorial call, not a blocker.

a2:

---

q3: Should the inference-output masters be frozen once finalized (set a submit-lock so a match-inference run is immutable after completion, a mobility recommendation locks once dismissed or pursued, and a career-path suggestion locks once published)? (yes/no)

Recommended: yes. A model run's output is immutable by construction, and acted-on or published suggestions should not be quietly edited. This re-evaluates pattern flags on existing rows, so it needs your confirmation. (The mobility-recommendation part depends on your answer to q2.)

a3:

---

q4: Should a new dedicated Marketplace Ops role be added for the day-to-day marketplace administrator (curates opportunities, audits applications, decommissions stale postings), distinct from the Talent Manager?

- a) Extend existing roles only; the Talent Manager absorbs the marketplace-ops scope.
- b) Add a new Talent Development Marketplace Ops role.
- c) Defer the marketplace-ops role until a customer asks.

Recommended: b. Eightfold and Gloat both ship a dedicated marketplace-admin persona in their RBAC, though the catalog has historically folded admin-ops into the broader function-manager role. This shapes how the role layer and personas get wired, so it is your call.

a4:

---

q5: Eleven required contributor/consumer links on this domain's modules point at entities mastered by other domains (career aspirations, competency models, job postings, job profiles, requisitions, skill profiles, skill taxonomies, skills-gap analyses) and break module self-containment. May I fix each one, either by carrying a local embedded shell or by relaxing it to optional? (yes/no)

Recommended: yes. Per-row, convert to an embedded master where the module truly needs the data locally, or relax to optional where the dependency is presence-conditional. This rewrites the role/necessity on existing rows, which is destructive, so it needs your sign-off.

a5:

---

## Optional (will not hold up the build)

q6: Should I research and add a talent_pools master (a curated grouping of employees scored against a role family or future bench, distinct from per-position succession plans)? (yes/no)

Recommended: yes, but additive and can happen after the build. Every loaded flagship vendor in this market (Eightfold, Workday, Reejig, Gloat) ships a Talent Pool master separately, and it is absent today.

a6:

---

q7: Should I research and add a model_fairness_audits master for EEOC bias-audit logging (NYC Local Law 144 and similar AI-employment rules require periodic bias audits of the matching model)? It could land as a new AI-Governance module here or route to a dedicated AI-Governance domain. (yes/no)

Recommended: yes in principle, but it needs a boundary check first on whether this belongs to Talent Intelligence or to a separate AI-Governance domain. Additive and non-blocking.

a7:

---

q8: Should I research and add a skill_inferences master (the audit trail of inferred skills per employee, distinct from the declared skill profiles that Skills Management owns)? (yes/no)

Recommended: yes, pending a quick cross-domain ownership check, since it may belong in Skills Management as an inferred-skills master. Additive and non-blocking.

a8:

---

<!-- agent map, ignore: q1=B2-T3 q2=B2-T1.lifecycle q3=B2-T1.submitlock q4=B2-T2 q5=B1A-SELF-CONTAIN q6=B3-T1 q7=B3-T2 q8=B3-T3 | domain_id=170 -->
