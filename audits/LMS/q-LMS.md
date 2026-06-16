# Learning Management (LMS): questions waiting for you

## What this domain is

Train your whole workforce and prove it, from first enrollment to audit-ready completion records.

Run corporate learning end to end. Author and publish courses, deliver them online or in the classroom, and track every enrollment through to completion. Issue the certifications and badges that show who is qualified, and keep the evidence auditors and regulators ask for. Assign mandatory training automatically, chase overdue learners without manual follow-up, and feed completion signals to the HR, compliance, and identity systems that depend on them.

> Done since last round (2026-06-16): I actioned your answers. **Refactor C is built** as you chose (option a): one shared `training_evidence_records` table, a new tenant-scoped `compliance_regulations` reference table it points at, FDA Part 11 kept on its own, and the five per-statute completion tables deleted. **The 18 missing vendor-surface entities are loaded** by module group, with the 19th (`data_retention_policies`) reconciled onto the existing records-retention entity instead of duplicating it. **GDPR, HIPAA, OSHA and SOX are now tagged** on the domain. On your privacy answer (build a shared privacy domain first, then demote LMS): the direction is recorded, but it now waits on that privacy domain being built before LMS can hand its records over, so it is parked as blocked rather than done, and the two privacy process-tags stay held with it. Everything written is at `record_status='new'` for your review in the catalog UI. The two questions below are the ones you turned into questions last round; I have answered both and they are waiting on your pick.

---

q1: A "Skills Management" capability is linked to LMS but no LMS module realizes it. You asked the general rule: isn't an entity in one domain linking to an optional entity in another usually just the optional embedded-master pattern, and is anything different here? Short answer: your instinct is right for shared DATA entities, but this orphan is not a data entity. For a data entity one domain needs but another owns, the catalog does NOT use a shared module; it puts a per-domain row on the module-to-entity junction with a role that says the relationship: `master` in the owner, `embedded_master` where a standalone deployment needs a local shell that defers to the canonical master, `consumer` where the domain only reads it. That is exactly the "optional embedded master" you mean, and LMS already uses it (for example `employees` is an embedded master in the privacy module, and the records-retention entity I just wired in is a consumer). What is different here: this orphan is on the capability-to-domain junction, which has no master/embedded-master/consumer qualifier at all, only a "semantic home" flag. A capability is either realized by a module or it is an orphan; there is no embedded-master middle option for a capability link. "Skills Management" is semantically owned and realized by the skills-management domain; it shows up on LMS only because one LMS module consumes course tags for skill tagging (downstream consumption, not realization). So this reduces to two choices, not three.

- a) Delete the LMS link to the capability. The skills-management domain owns and realizes it; the LMS appearance is downstream course-tag consumption, not realization. Removes the orphan, no new rows. (Removing the link needs your sign-off.)
- b) Keep the link and make the learning-paths module genuinely realize the capability, now that the new `skill_targets` entity (a path step tied to a skill plus a proficiency threshold) has shipped. This adds a realizing link and asserts that LMS co-owns Skills Management.

Recommended: a. The skills-management market is mastered by skills-intelligence and talent-marketplace vendors (Cornerstone Skills Graph, Workday Skills Cloud, SAP SuccessFactors Talent Intelligence Hub, Eightfold, Gloat), which own the skills taxonomy and proficiency model. Flagship LMS products (Docebo, 360Learning, Absorb, Cornerstone Learning) consume a skills taxonomy to tag courses and align paths; they do not master the skills graph. So the realizing owner is the skills-management domain and LMS is a consumer, which is why the link reads as an orphan. Deleting it is the cleaner fix and matches the market. It needs your sign-off because it removes an existing link.

a1:

---

q2: An inbound handoff from the HR service domain (an HR case-category change) has no LMS landing spot, and no LMS module currently claims the underlying data. You asked how other vendors handle it. How they handle it: in ServiceNow HR Service Delivery the case lifecycle (the Case Lifecycle Configurator) attaches downstream workflows to a case category, and the ServiceNow-to-Workday-Learning integration pushes learning tasks onto the case, so HR and learning teams drive training off the case. The dominant pattern is compliance-driven: a sensitive case category (a harassment complaint, a safety incident) auto-assigns the mandatory remediation or compliance training for that category and tracks completion as case evidence. The developmental-path variant (a case type maps to a growth path) exists but is the minority shape and usually lives in the talent or learning-path layer, not the case channel. Which way should the handoff land?

- a) Route it to the compliance-training module: the case category drives compliance-tag inheritance (for example, a harassment-complaint case type auto-tags the mandatory harassment training).
- b) Route it to the learning-paths module: the case category drives learning-path assignment (a case type maps to a development path), for remedial or developmental learning rather than compliance proof.
- c) Mis-modeled: retire the handoff if the HR case taxonomy should not reach LMS at all. (Removing the handoff needs your sign-off.)

Recommended: a. The cross-vendor norm (ServiceNow HR Service Delivery plus Workday Learning, and the same shape in SAP SuccessFactors) is case-category to mandatory compliance training: the harassment-complaint to harassment-training pattern, assigned and tracked from the HR case. That favors the compliance-training module. Option b covers the minority developmental-path case; option c is the destructive retire option if the HR case taxonomy genuinely should not reach LMS.

a2:

---

## Optional (will not hold up the build)

q3: You already approved researching four extra learning entities (learning evaluations and training surveys for satisfaction and effectiveness scoring; self-service training requests with approvals; external or off-platform training records; gamification points and leaderboards). The module-shape decision they were waiting on (Refactor C) is now settled, so they are eligible to load. They are net-new entities, so they load only after you approve them here. Nothing is required of you unless you want to change the list.

- a) Proceed with all four (load them as new entities at `record_status='new'` for your review).
- b) Drop or change one or more (tell me which).

Recommended: a. All four are anchored to flagship vendors (SAP SuccessFactors Learning, Workday Learning, Cornerstone, Docebo, 360Learning, Litmos) and fit the existing module shape; loading them additively after the module shape settled keeps them low-risk.

a3:

---

<!-- agent map, ignore: q1=B2-SKILLS-MGMT-ATTRIBUTION q2=B2-1121-ROUTING q3=B3-LEARNING-EVALUATIONS+B3-TRAINING-REQUESTS+B3-EXTERNAL-TRAINING-RECORDS+B3-GAMIFICATION | domain_id=57 -->
