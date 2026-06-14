# Product Management (PROD-MGMT): questions waiting for you

## What this domain is
Run the full life of a product, from raw customer signal to shipped release. Capture feedback and feature requests, triage and prioritize them in discovery, then carry the accepted ones onto the roadmap where they become features, releases, and product-line plans. Track adoption and quality metrics, run beta programs, and keep every neighbor (sales, support, customer data, delivery) in sync as products launch, ship, and get deprecated.

---

q1: (answer this first) The six product-marketing capabilities (launch planning, go-to-market launch coordination, messaging and positioning, sales-enablement content, competitive intelligence, win/loss interviews) are attached to Product Management but no module actually delivers them. How should they be handled?

- a) Promote Product Marketing Management (PMM) as a new domain candidate and move the six capabilities to it on promotion.
- b) Keep the six capabilities on Product Management and build a new PM-MARKETING module to host them.
- c) Split them per-capability between a PMM domain and the go-to-market planning capability.

Recommended: a. Product Marketing Management passes the point-solution market test (Klue, Crayon, Highspot, Showpad, Seismic), so it reads as its own market rather than a sub-area of Product Management. This is the build-shape call: it decides domain boundaries and gates the competitor-intelligence entity below it.

a1:

---

q2: The product_metrics entity carries a freeform "config-shaped, no workflow" note in its notes field, which the current rules no longer allow there (the classification now lives in the typed entity_type column, already set to "computed"). Was that note wording approved by you when it was first loaded, or should it be cleared?

- a) It was user-approved at load, so leave the wording in place.
- b) It was auto-populated, so clear the note and log a rule-incident entry.

Recommended: b. The wording looks auto-generated, and the config-shape signal now lives in the typed column regardless. Clearing it overwrites a non-empty value, so it needs your sign-off.

a2:

---

q3: Should feature_requests be flagged as containing personal content (submitter contact details and verbatim quotes carry PII)? (yes/no)

Recommended: yes. Submitter contact info and verbatim quotes are personal data and should be treated under privacy and retention rules.

a3:

---

q4: Should product_releases be flagged with a submit-lock, so a "shipped" release is terminal and cannot be silently mutated after the fact? (yes/no)

Recommended: yes. The shipped state is a permission-gated terminal state, and locking it preserves an accurate record of what shipped.

a4:

---

q5: Should product_roadmaps be flagged with a submit-lock, so a "published" roadmap is held as a stable external-facing commitment? (yes/no)

Recommended: yes. A published roadmap is an external commitment that downstream teams rely on, so it should not change quietly.

a5:

---

q6: Should product_lines be flagged with a submit-lock? (yes/no)

Recommended: no. A product line is a long-lived strategic asset that is expected to evolve, so a submit-lock does not fit.

a6:

---

q7: The roadmap_items entity is consumed by the roadmap-delivery module but has no owner anywhere in the catalog, while a strategic-portfolio domain (SPM) emits it as a handoff payload. How should this be resolved?

- a) Schedule the SPM audit and let SPM own a portfolio-level roadmap_items master that Product Management consumes.
- b) Treat roadmap_items as a redundant alias for product_roadmaps: delete the orphan consumer row and re-point the SPM handoff payload to product_roadmaps.

Recommended: a. SPM is the natural owner of a portfolio-level roadmap concept, and keeping the consumer link avoids destroying data. Option (b) deletes a row and re-attributes a handoff payload, so it needs your sign-off.

a7:

---

q8: Two notification tools sit on the roadmap-delivery skill with mismatched coverage tiers (notify_team is "external" while notify_person is "platform"), which looks like a load-time inconsistency. How should this be reconciled?

- a) Replace notify_team with notify_person so both reach the platform tier.
- b) Promote notify_team to the platform tier and keep the team/person naming distinction.
- c) Leave it as-is and accept the slightly lower coverage score.

Recommended: c. The tool-grain layer is being retired in a separate migration, so confirm whether this even survives before spending a destructive overwrite on it. Options (a) and (b) overwrite or replace existing rows, so they need your sign-off.

a8:

---

q9: All eight Product Management masters reference the built-in users table for ownership, submission, and assignment, but the relationship edges were never wired. The default proposal is product_lines owned-by, product_features assigned-to, product_releases owned-by, product_roadmaps owned-by, feature_requests submitted-by, customer_feedback_items submitted-by, product_metrics recorded-by, beta_programs owned-by. How should the edges be created?

- a) Approve the eight default edges with the proposed verbs.
- b) Specify per-row verb overrides (list which ones to change).

Recommended: a. The proposed verbs match the natural ownership and submission semantics of each entity. Adding the edges is additive once the verbs are agreed.

a9:

---

q10: Nine legacy notes on the deprecated domain-rollup rows carry old load prose (and forbidden em-dashes). Should those notes be cleared and a rule-incident entry logged?

- a) Clear the nine notes and append a rule-incident entry to the changelog.
- b) Approve the current wording (would require a per-row justification).

Recommended: a. The prose is leftover load history that violates the project rules, and these rollup rows are slated for deletion anyway. Clearing them overwrites non-empty values, so it needs your sign-off.

a10:

---

q11: Eleven agent-curated process tags on the cross-domain handoffs are sitting at "new" and need a reviewer to approve the correct ones before they count as final. Should I treat your go-ahead as approval to flip them to "approved"? (yes/no)

Recommended: yes, after you spot-check that the process mappings look right. Flipping records to "approved" is a sign-off step the agent never performs on its own.

a11:

---

q13: Customer Service Management hands work to Product Management, but Product Management has no one assigned to provide customer feedback to product management on customer service experience, so that step currently has nobody responsible for it. Who should own it?
- a) The a named owner runs it and approves it.
- b) The a named owner runs it and the Head of Product approves.
- c) Leave it unassigned for now.

Recommended: a. Product Management already assigns the a named owner to work of this kind, so (a) fills this gap the same way and gives the work a named owner.

a13:

---

q14: Six cross-domain handoffs were tagged by Product Management with a process category that does not match the work (for example a customer-service or cost-accounting process attached to a product-feature handoff). In each case the real work is already a product-development process. How should these mismatched tags be fixed?

- a) Re-point each tag to the correct product-development process.
- b) Delete the mismatched tags and re-tag them later in a dedicated research pass.
- c) Decide per handoff (tell me which to re-point and which to delete).

Recommended: a. The correct process already exists in each case, so re-pointing keeps the link and fixes the category in one step. Re-pointing changes an existing tag, so it needs your sign-off.

a14:

---

## Optional (will not hold up the build)

q12: Eight first-class entity candidates show up across the flagship Product Management vendors (product_opportunities, product_themes, prioritization_scores, release_notes, feature_flag_records, user_research_sessions, release_milestones, competitor_intelligence_records). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and after the modules settle. Most are well-attested across the vendor set; feature_flag_records likely belongs in a separate feature-flagging domain, and competitor_intelligence_records depends on the PMM decision in q1.

a12:

---

<!-- agent map, ignore: q1=B2-31-1 q2=B2-31-2 q3=B2-31-3.featreqpii q4=B2-31-3.releaselock q5=B2-31-3.roadmaplock q6=B2-31-3.linelock q7=B2-31-4 q8=B2-31-5 q9=B2-31-6 q10=B2-31-7 q11=B1A-APQC-APPROVAL-PASS q12=B3-PROD-OPPORTUNITIES+B3-PROD-THEMES+B3-PRIORITIZATION-SCORES+B3-RELEASE-NOTES+B3-FEATURE-FLAG-RECORDS+B3-USER-RESEARCH-SESSIONS+B3-RELEASE-MILESTONES+B3-COMPETITOR-INTELLIGENCE q13=B2-B9D-OWN-956 q14=B2-B9D-MISTAG-REPOINT | domain_id=101 -->
