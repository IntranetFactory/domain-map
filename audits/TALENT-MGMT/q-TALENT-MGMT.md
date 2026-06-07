# Talent Management (TALENT-MGMT): questions waiting for you

## What this domain is

Grow, assess, and retain your people across the full talent lifecycle. Run performance reviews and goals, calibrate ratings fairly, place people on a 9-box grid, plan succession for key roles, develop careers, and keep continuous feedback flowing between managers and their teams. The domain spans three modules: Performance Management, Succession and Career, and Continuous Feedback.

---

q1: (answer this first) The same review and calibration records are currently both "owned" by Performance Management and "borrowed" by the Succession and Continuous Feedback modules, which the rules reject. How should that overlap be resolved for performance reviews and talent calibrations?

- a) Have Succession and Continuous Feedback read the canonical record from Performance Management (delete the 3 borrowed copies). The modules then depend on Performance Management at deploy time.
- b) Give each module its own embedded copy so every module can deploy standalone (promote all 3 to embedded master).
- c) Mixed: decide per record.

Recommended: a. Deleting the borrowed copies is the cleaner architectural fit, since a standalone Succession or Continuous Feedback module has no calibrated review to work from anyway. This is a destructive change and it unlocks the rest of the build, so it needs your sign-off.

a1:

---

q2: Should a 9-box placement be frozen once it is confirmed, so the confirmed grid position cannot be quietly edited? (yes/no)

Recommended: yes. Confirmed placements feed succession decisions and should stay stable. This overwrites a current setting, so it needs your confirmation.

a2:

---

q3: Should a career aspiration be frozen once it reaches a terminal state (fulfilled or withdrawn), so closed aspirations are not reopened in place? (yes/no)

Recommended: yes. A closed aspiration is a settled record. This overwrites a current setting, so it needs your confirmation.

a3:

---

q4: Should a feedback record be frozen once it is acknowledged, so acknowledged feedback cannot be edited afterward? (yes/no)

Recommended: yes. Acknowledged feedback is a shared record between giver and receiver and should not change after the fact. This overwrites a current setting, so it needs your confirmation.

a4:

---

q5: Should a succession plan require sign-off from a single named approver (such as the CHRO or business-unit head)? (yes/no)

Recommended: yes. Succession plans are high-stakes and normally carry one accountable approver. This overwrites a current setting, so it needs your confirmation.

a5:

---

q6: Should talent calibrations stay on the multi-approver pattern (no single named approver)? (yes/no)

Recommended: yes. Calibration is a committee activity by design, so keeping it multi-approver is correct. This confirms a current setting, so it needs your call.

a6:

---

q7: An inbound signal from the People Analytics domain (high attrition risk, carrying employee data) has no target module, because the employee record sits in all three Talent modules equally. Which module should receive it?

- a) Succession and Career (attrition risk drives a fresh look at successor readiness).
- b) Performance Management.
- c) Continuous Feedback.
- d) Leave it unrouted until People Analytics is re-modeled.

Recommended: a. Attrition risk most directly triggers succession and successor-readiness reassessment. Once you choose, the signal is routed accordingly.

a7:

---

q8: How should the HR Business Partner role's access to the Continuous Feedback module be handled, and is the implicit workflow-gate grant pattern (relying on the permission hierarchy to expand manage/admin rather than listing each gate) the shape you want?

- a) Keep it as-is: HR Business Partner stays read-only on Continuous Feedback and the hierarchy expands the workflow gates.
- b) Add explicit gate grants only where a real gap exists (for example, letting HR Business Partner calibrate reviews).
- c) Upgrade HR Business Partner from read-only to manage on Continuous Feedback.

Recommended: a. The hierarchy is designed to expand the gates, and read-only on Continuous Feedback may well be intentional, but this is a workflow-intent call only you can make.

a8:

---

## Optional (will not hold up the build)

q9: Eight extra entities show up as first-class records across the flagship talent vendors (competencies, peer-review invitations, development plans, succession candidates, performance improvement plans, goal check-ins, 1-on-1 meetings, calibration committees). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Each is common across the vendor set, though they still want a verification pass first.

a9:

---

q10: Five regulations are candidates for tagging onto Talent Management (US EEOC adverse-impact testing, NYC Local Law 144 on automated employment decisions, Illinois HB 3773 AI disclosure, GDPR, and a situational HIPAA business-associate agreement). Today only the EU AI Act is recorded. Should I research and add the ones that apply? (yes/no)

Recommended: yes, but additive and non-blocking. The AI-overlay tier of talent calibration and succession scoring makes the AI-decision regulations especially relevant.

a10:

---

q11: Two adjacent point-solution markets are not yet their own domains: peer recognition (Bonusly, Kudos, Workhuman, Achievers, with recognition badges, points, and a reward catalog) and mentorship (MentorcliQ, Chronus, Together, with mentorship pairings). Should I research and stand up these as new candidate domains? (yes/no)

Recommended: yes in principle, but each needs the standalone-market check before it becomes a domain. Additive and non-blocking.

a11:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S4.a q3=B2-S4.b q4=B2-S4.c q5=B2-S4.d q6=B2-S4.e q7=B2-S5 q8=B2-S6 q9=B3-COMPETENCIES+B3-PEER-REVIEW-INVITATIONS+B3-DEVELOPMENT-PLANS+B3-SUCCESSION-CANDIDATES+B3-PIPS+B3-GOAL-CHECK-INS+B3-1ON1-MEETINGS+B3-CALIBRATION-COMMITTEES q10=B3-REG-EEOC+B3-REG-NYC-LL144+B3-REG-IL-HB3773+B3-REG-GDPR+B3-REG-HIPAA-BAA q11=B3-MOD-PEER-RECOGNITION+B3-RECOGNITION-BADGES+B3-MOD-MENTORSHIP+B3-MENTORSHIP-PAIRINGS | domain_id=58 -->
