# Employee Experience (EMP-EXP): questions waiting for you

## What this domain is
Listen to your workforce continuously and turn what you hear into action. Run engagement and pulse surveys, 360 feedback, and lifecycle check-ins, score the drivers of engagement, then hand managers structured action plans to close the loop. The domain spans two areas today: Continuous Listening (campaigns, responses, drivers, question banks) and Action Planning (manager action plans that follow from the results).

---

q1: (answer this first) The domain has two modules and capabilities but zero roles, which is a hard structural fail. Which personas should I author as the role layer (this drives role-to-module wiring, permissions, and the RACI/persona work that is currently deferred)?

- a) The three recommended personas: Employee Experience Program Manager (owns listening cycles and action planning), HR Business Partner (cross-functional, consumes engagement drivers and runs action planning per org unit), People Manager (cross-functional, owns action plans for their team).
- b) A leaner two-persona set: Employee Experience Program Manager plus People Manager only.
- c) A different set you specify.

Recommended: a. These three are the standard split for this market and satisfy the three-role floor for a two-module domain; once chosen, the role_modules, role_permissions, and persona/RACI layer can all be authored.

a1:

---

q2: A trigger event ("survey.cycle_closed", id 134) is wrongly keyed to the engagement-drivers master instead of the survey campaign, and two outbound handoffs (442 to HCM, 115 to PA) ride it. Should I re-point both handoffs to the correct new "survey_campaign.closed" event and then delete the stale event 134? (yes/no)

Recommended: yes. The correct event already exists (id 1551); re-pointing fixes the attribution and deleting the orphan keeps the event set clean. This overwrites a trigger_event_id on existing rows and deletes a row, so it needs your sign-off.

a2:

---

q3: One module-self-containment violation: Continuous Listening requires the onboarding-journeys entity (mastered by Onboarding) but does not embed it. How should I resolve it?

- a) Embed it: carry a local shell of onboarding-journeys on the module so the required dependency stays satisfied in-module.
- b) Relax it: set the dependency to optional (presence-conditional) instead of required.

Recommended: a. Embedding preserves the real required dependency while making the module self-contained. Either choice rewrites the role or necessity on an existing row, so it needs your sign-off.

a3:

---

q4: Handoff 116 publishes an "attrition_risk.high" signal keyed to the employees entity, which HCM masters, so EMP-EXP cannot legitimately publish a state-change on it. How should it be made well-formed?

- a) Introduce a new EMP-EXP-mastered derived entity (engagement_signals) and re-key the event onto it.
- b) Keep the employees payload, add a derived relationship, and treat it as a downstream flag signal.
- c) Reclassify it as a compute-workflow output, not a handoff at all.

Recommended: a. A derived EMP-EXP entity lets the domain own the signal it actually produces, and it lines up with the optional engagement-signals research below.

a4:

---

q5: Two relationship rows both connect users to survey campaigns: one says "owns", the other says "creates". How should the duplicate be resolved?

- a) Delete the "creates" row; owner subsumes creator.
- b) Rename the "creates" verb to "authors" so it is a distinct actor role.
- c) Leave both; the duplication is intentional.

Recommended: a. Catalog convention elsewhere keeps a single actor-role row per pair. Deleting or renaming a row is destructive, so it needs your call.

a5:

---

q6: Two config-shaped masters (engagement-drivers id 183, pulse-questions id 185) still carry "config-shape exemption" prose in their notes field, which the notes-hygiene rule forbids. The same intent is now captured structurally by their entity_type. Were these notes approved by you at load time, or auto-written by the loader (in which case I clear them)?

- a) I approved this wording at load time; leave the notes in place.
- b) Auto-written; clear both notes to empty and log the incident.

Recommended: b. The config-shape intent is already captured structurally via entity_type, so the prose is redundant. Clearing a non-empty value is destructive, so it stays surfaced for your confirmation.

a6:

---

q7: Two handoffs (116 and 1231) carry similar auto-pattern prose in their notes field. Were these approved by you at load time, or auto-written (in which case I clear them and keep the context here or in chat instead)?

- a) I approved this wording at load time; leave the notes in place.
- b) Auto-written; clear both notes to empty.

Recommended: b. The wording matches the forbidden auto-written pattern. Clearing a non-empty value is destructive, so it stays surfaced for your confirmation.

a7:

---

q8: Should engagement-drivers be frozen once published (submit-lock on the driver definitions)? (yes/no)

Recommended: no. This master is now classified as computed; record_status is the only state worth tracking, so a submit-lock adds little.

a8:

---

q9: Should published pulse questions be frozen (submit-lock on the question library)? (yes/no)

Recommended: no. This master is now classified as a catalog; published-versus-draft is already captured by record_status, so a submit-lock is largely redundant.

a9:

---

q10: Should a submitted survey response be frozen once submitted, so it stays immutable for the audit trail? (yes/no)

Recommended: yes. A submitted response is an operational record that should not change after the fact.

a10:

---

q11: Should action plans be flagged as containing personal content (they often capture specific manager-employee conversation context)? (yes/no)

Recommended: yes. The context they hold is sensitive and should be treated accordingly.

a11:

---

q12: Should action plans require a single named approver (manager approval gating)? (yes/no)

Recommended: yes. Manager sign-off is the normal gate before an action plan goes live.

a12:

---

q13: Twelve cross-domain handoff process tags on the EMP-EXP surface are sitting at record_status "new", which holds the catalog-quality headline at 0%. Should they be promoted to approved? (yes/no)

Recommended: yes, if you agree the process mappings are correct. Promotion to approved is a sign-off step, so it is not applied automatically.

a13:

---

q15: People Analytics forwards engagement action plan to Employee Experience and Engagement to review engagement and retention indicators, but Employee Experience and Engagement does not yet have anyone assigned to review engagement and retention indicators, so this step has no owner. How should it be handled?
- a) Record it now as work Employee Experience and Engagement owns, and assign a named owner once Employee Experience and Engagement sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Employee Experience and Engagement decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a15:

---

q16: I re-checked every cross-domain handoff payload against the work that is actually realized (both directions). Three process tags EMP-EXP authored point at a broader or wrong category than the realized work: handoff 443 to Talent Management and handoffs 442/445/1078/1248 to HCM/Work Management are tagged with a parent process when a more specific one ("Review engagement and retention indicators") already exists; and handoff 116 to HCM is tagged with a retention process when its payload (employees) actually realizes under "Manage separation". Should I re-point all three groups to the more specific process (the 116 one can be re-pointed or deleted)? (yes/no)

Recommended: yes, re-point all three to the recommended targets (re-point handoff 116 rather than delete it). This makes each handoff point at the work that is really done. It overwrites an existing process tag (and possibly deletes one), so it needs your sign-off.

a16:

---

q17: Work Management forwards engagement action plan to Employee Experience and Engagement to manage employee assistance and retention, but Employee Experience and Engagement does not yet have anyone assigned to manage employee assistance and retention, so this step has no owner. How should it be handled?
- a) Record it now as work Employee Experience and Engagement owns, and assign a named owner once Employee Experience and Engagement sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Employee Experience and Engagement decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a17:

---

## Optional (will not hold up the build)

q14: Nine extra entities show up across the flagship employee-experience vendors (survey templates, engagement themes, survey invitations, sentiment topics, manager action recommendations, 360 review cycles, recognition events, pulse cohorts, engagement score snapshots). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the role layer exists. The strongest gaps are survey invitations and engagement score snapshots (both flagship-mastered, both fix a real gap); recognition events depends on a separate decision about whether peer recognition becomes its own domain.

a14:

---

<!-- agent map, ignore: q1=B1B-S1 q2=B1A-S7 q3=B1A-SELF-CONTAIN q4=B2-S4 q5=B2-S5 q6=B2-S2 q7=B2-S3 q8=B2-S1.engdrivers q9=B2-S1.pulsequestions q10=B2-S1.surveyresponses q11=B2-S1.actionplanpii q12=B2-S1.actionplanapprover q13=B1A-S13-RES q14=B3-S1+B3-S2+B3-S3+B3-S4+B3-S5+B3-S6+B3-S7+B3-S8+B3-S9 q15=B2-B9D-OWN-1048 q16=B2-B9D-RETAG q17=B2-B9D-OWN-235 | domain_id=62 -->
