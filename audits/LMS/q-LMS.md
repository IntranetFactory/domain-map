# Learning Management System (LMS): questions waiting for you

## What this domain is

Train your whole workforce and prove it, from first enrollment to audit-ready completion records.

Run corporate learning end to end. Author and publish courses, deliver them online or in the classroom, and track every enrollment through to completion. Issue the certifications and badges that show who is qualified, and keep the evidence auditors and regulators ask for. Assign mandatory training automatically, chase overdue learners without manual follow-up, and feed completion signals to the HR, compliance, and identity systems that depend on them.

> Note on your last round: I already actioned three of your answers. **q3 (cross-domain items to optional): done** (all four are now optional). **The catalog copy you expected: done** (you were right, I should not have asked; under the current rules I just write empty catalog text, so I authored and wrote the tagline + description for the domain and all 8 modules). **Personas: already authored** in a prior pass (Learning Administrator, Instructional Designer, Instructor, Compliance Training Manager, People Manager, plus a reused Compliance Specialist), so there was no decision left to make there. The six questions below are the ones genuinely still waiting on you. All written rows are at `record_status='new'` for your review in the catalog UI.

---

q1: (answer this first) The compliance side currently has six separate per-regulation evidence tables (HIPAA, OSHA, SOX, FERPA, FDA Part 11, BSA/AML). You asked: would one table be sufficient and not bloated, and wouldn't optional entities make sense? Short answer: five of the six (HIPAA, OSHA, SOX, FERPA, BSA/AML) are near-identical "learner completed statute-X training" rows that differ only by which statute, so folding them into one `training_evidence_records` table keyed by a regulation-type field removes duplication rather than adding bloat. The one that is genuinely different is FDA Part 11 (a tamper-evident, retention-locked audit trail, not a completion record), so it is the one worth keeping on its own. How should I handle it?

- a) Collapse all six into one evidence table keyed by regulation type; recover per-statute install gating with a tenant "active regulations" setting.
- b) Collapse the five completion tables into the one evidence table, but keep the FDA Part 11 audit trail as its own separate table.
- c) Keep all six tables; just mark the sector-bound ones (FDA Part 11, BSA/AML) optional. This is your "optional entities" idea: no deletes, keeps native per-statute install gating, but leaves five near-duplicate tables.

Recommended: b. It is the direct answer to both your questions: one table is sufficient and not bloated for the five identical tables, and the only structurally different entity (FDA Part 11) stays separate. Option c is the safe no-delete fallback. This is high blast radius (options a and b delete tables) and the missing-entity compliance group (q5) depends on its shape, so settle it first. It needs your sign-off because it deletes existing tables.

a1:

---

q2: Should learner-data privacy (data-subject requests and consent) stay mastered in LMS, or move to a shared privacy domain? You asked how other vendors handle it and whether an embedded master makes sense. How other vendors handle it: flagship LMS products rarely master privacy themselves; data-subject requests and consent are handled at the HR/identity-suite or tenant level, or deferred to a central privacy tool, with the LMS just exposing "delete my data" / "export my records" hooks. Your embedded-master instinct is the right target shape: LMS keeps a local privacy shell so a standalone LMS can still honor training-data erasure, but defers to a canonical privacy domain when one is present. The catch: the proper owner (a PRIV-MGMT domain) holds none of this data yet, so it has to be built first.

- a) Defer to a focused cross-domain privacy initiative; keep learner privacy in LMS as interim scope for now.
- b) Build the PRIV-MGMT canonical owner now, then demote LMS (and the recruiting domain) privacy records to embedded masters that defer to it.
- c) Decline: keep learner-data privacy permanently mastered in LMS.

Recommended: a. The embedded-master end state (option b) is correct, but it requires PRIV-MGMT to exist as the canonical owner first, and that is a separate cross-domain build (LMS plus recruiting both hand over). Dissolving the LMS privacy module before that owner exists would strand training-data erasure. This interacts with q6.

a2:

---

q3: A learning-skills capability is linked to LMS but no LMS module actually delivers it. You asked me to explain both options.

- a) Delete the LMS link to that capability. The capability only shows up on LMS because one module uses course tags for skill tagging, which is downstream consumption; the skills-management domain is the real owner and already realizes it there. Clean, no new entities, removes an orphan. (Removing the link needs your sign-off.)
- b) Keep the link and make the learning-paths module realize it. This only becomes viable after the missing "skill targets" entity ships (a path step tied to a skill plus a proficiency threshold), then a realizing link is added. More work, and it couples to the missing-entity load in q5.

Recommended: a. The skills-management domain owns this capability; deleting the link is the cleaner fix. It needs your sign-off because it removes an existing link.

a3:

---

q4: An inbound handoff from the HR service domain (an HR case-category change) has no LMS landing spot, and no LMS module currently claims the underlying data. You asked me to explain the options.

- a) Route it to the compliance-training module: the case category drives compliance-tag inheritance (for example, a "harassment complaint" case type auto-tags the mandatory harassment training). Pick this if the link is about which compliance training a case type triggers.
- b) Route it to the learning-paths module: the case category drives learning-path assignment (a case type maps to a development path). Pick this if it is about remedial or developmental learning rather than compliance proof.
- c) Mis-modeled: retire the handoff if the HR case taxonomy should not reach LMS at all. (Removing the handoff needs your sign-off.)

Recommended: no preset. The endpoint is genuinely ambiguous (compliance-tag inheritance versus learning-path assignment) and no LMS module currently claims the underlying data, so this needs your read on what the handoff is really for.

a4:

---

q5: The vendor-surface "missing" entities (a prior set of 19) are not yet loaded. You asked what the 19 are and whether "grouped by area" is just "grouped by module". You are right, they are the same thing: each loader group maps one-to-one to a target module. The 19, grouped by their module:

- Course delivery: question banks, cmi5 assignable units, LRS statement endpoints, observation checklists, observation checklist results.
- Classroom (ILT) delivery: training-room bookings, session rosters, session cancellations.
- Learning paths: skill targets, learning recommendations.
- Credentials: credential verifications, certification renewals.
- Compliance training: GxP training sign-offs, phishing simulations, phishing simulation results.
- Training-records starter: DPO training acknowledgements, PCI DSS awareness records.
- GDPR privacy: data-retention policies (reconcile against the existing records-retention-policies entity).
- Automation: reminder schedules.

How much should I ship?

- a) Ship them by module group (course delivery, ILT, paths, credentials, compliance, starter, GDPR, automation).
- b) Ship a subset only (tell me which module groups).
- c) Defer the whole load.

Recommended: a. These are anchored to flagship-vendor surfaces or specific regulations, so shipping them by module group is the clean path. Sequence the compliance group after q1 and the GDPR group after q2. (The four extra ideas you already said yes to in the optional section are additive on top of these 19.)

a5:

---

q6: The domain currently lists only FERPA as an in-scope regulation, but LMS has a privacy module and HIPAA, OSHA, and SOX evidence tables. You asked why this is separate from q2. It is separate because q2 is a structural ownership decision (who masters the privacy records, which is expensive and deferred), while this is cheap, additive scope metadata (which statutes the LMS market touches, used for discoverability and filtering). The tags are true regardless of where the records live, so this can be answered yes today without waiting on q2. Which regulations should be tagged onto LMS?

- a) Add GDPR plus HIPAA, OSHA, and SOX.
- b) Add GDPR only.
- c) Leave it as FERPA only.

Recommended: a. The compliance and privacy modules already bring these statutes into scope, so the regulation list should reflect them. Purely additive metadata, independent of the q2 structural move.

a6:

---

## Optional (will not hold up the build)

q7: You already said yes to researching four extra learning entities (learning evaluations and training surveys for satisfaction and effectiveness scoring; self-service training requests with approvals; external/off-platform training records; gamification points and leaderboards). These are recorded as approved. They are additive and best done after the module shape (q1) settles, with a verification pass first. Nothing for you to do here unless you want to change the list.

- a) Proceed with all four after q1 settles (current plan).
- b) Drop or change one or more (tell me which).

Recommended: a. All four are anchored to flagship vendors; doing them additively after the module shape is settled keeps them low-risk.

a7:

---

<!-- agent map, ignore: q1=B2-REFACTOR-C q2=B2-REFACTOR-A q3=B2-SKILLS-MGMT-ATTRIBUTION q4=B2-1121-ROUTING q5=B2-MISSING-ROUTING q6=B2-DOMAIN-REGULATIONS q7=B3-LEARNING-EVALUATIONS+B3-TRAINING-REQUESTS+B3-EXTERNAL-TRAINING-RECORDS+B3-GAMIFICATION | domain_id=57 -->
