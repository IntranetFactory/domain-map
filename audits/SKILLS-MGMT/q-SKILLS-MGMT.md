# Skills Management (SKILLS-MGMT): questions waiting for you

## What this domain is
Build the worker-skill substrate every other talent system reads from. Curate the ontology, validate per-worker proficiency, and serve gap signals to learning, mobility, and planning.

Maintain the skills ontology and competency models in one place (parent/child/related/equivalent edges, proficiency scales, role profiles), then build a validated skill profile for each worker through self-assessment, peer endorsement, and automated inference. From there, surface skill gaps and feed clean signals out to your learning, talent-mobility, and workforce-planning systems.

---

q1: (answer this first) How should Skills Management be shaped: keep the two modules it has, or carve out a third sub-module for ontology versioning?

- a) Keep the two-module shape (Taxonomy and Profile) for now, and defer the split decision until the speculative entities have been vetted.
- b) Pre-commit now to a third module (SKILLS-MGMT-ONTOLOGY-VERSIONING) shaped around taxonomy versioning and ontology edges.
- c) Hold everything (including approving the two missing masters below) until the speculative entity list is vetted.

Recommended: a. The split only pays off once you know which speculative entities actually land, so committing to a third module now is premature; (c) needlessly stalls two already-confirmed masters. This choice drives the module shape everything else hangs off, so it unlocks the rest of the build.

a1:

---

q2: Should I add the two confirmed missing masters, skill_proficiency_levels (the proficiency-scale vocabulary) and skill_relationships (the ontology edge table), to the Taxonomy module now? (yes/no)

Recommended: yes. Both are confirmed across all five specialist vendors and the ontology cannot be navigated without the edge table; the proficiency scale has no anchor table today. Additive, so it does not wait on the split decision.

a2:

---

q3: Six permissions on the Profile module use the domain-code prefix skills-mgmt:* instead of the module-code prefix skills-mgmt-profile:* that the rule calls for. How should this be handled?

- a) Rename all five to skills-mgmt-profile:* and update the Administrator role bundle.
- b) Rename only the two workflow-gate permissions (validate and deactivate skill profile); leave the baseline read/manage/admin tier as-is.
- c) Accept the asymmetry and document the legacy prefix.

Recommended: a. The Taxonomy module already follows the module-code convention, and the later role-bundle authoring gets confused by the prefix divergence. This overwrites existing permission codes and the Administrator bundle, so it needs your sign-off.

a3:

---

q4: Handoff 1307 (LMS to Skills Management on a learner badge earned) duplicates handoff 1295: same source, payload, and trigger event, but 1307 has no target module set. How should it be handled?

- a) Delete 1307 as a duplicate of 1295.
- b) Keep it: load a consumer record on learner_badges for the Profile module, then point 1307 at that module and resolve the integration-pattern disagreement.

Recommended: a. The two rows differ only by an integration-pattern label and the missing target module, strong evidence 1307 is a leftover from before the modules existed. Deleting a row is destructive, so it needs your approval.

a4:

---

q5: Nine handoff process tags were authored as confident proposals but are all still sitting at "new", so the catalog-quality headline reads zero approved. Which should be promoted to approved?

- a) Approve all nine.
- b) Approve specific ones (name them).
- c) Decline all and return them to research.

Recommended: a. All nine were authored as confident process matches, and the headline stays at zero until they are signed off. Flipping new to approved is an explicit sign-off step, so the agent will not do it without your say-so.

a5:

---

q6: Four ontology masters (skills, skill_assessments, skill_endorsements, skill_inference_runs) have no alias synonyms. Should any be aliased?

- a) Leave the remaining four un-aliased and record the exemption.
- b) Add aliases for one or more (provide the list).

Recommended: a. These are bare-noun and assessment-shaped masters that read clearly on their own; the one master with real industry synonyms (skill_taxonomies) was already aliased. Low stakes, does not block the build.

a6:

---

## Optional (will not hold up the build)

q7: Eight further entity candidates surface across the specialist vendors (taxonomy versions, demand signals, supply metrics, extraction sources, gap recommendations, peer-validation requests, inference models, governance policies). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the module shape is settled. A couple have boundary checks first (demand signals against a possible Labor Market Intelligence domain; gap recommendations against the existing mobility recommendations master).

a7:

---

<!-- agent map, ignore: q1=B2-5.split q2=B2-5.entities q3=B2-2 q4=B2-3 q5=B2-4 q6=B2-6 q7=B3-1,B3-2,B3-3,B3-4,B3-5,B3-6,B3-7,B3-8 | domain_id=169 -->
