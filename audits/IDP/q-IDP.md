# Intelligent Document Processing (IDP): questions waiting for you

## What this domain is
Turn unstructured documents into clean structured data your apps can act on.

Intelligent Document Processing captures inbound documents from any channel, classifies them by type, extracts key fields and tables, and validates the results against your business rules before pushing structured records into downstream systems. The platform combines OCR, layout-aware ML models, and human-in-the-loop review queues so that confidence-rated extractions either auto-progress or land in front of a validator. Teams train models on labeled datasets, monitor accuracy in production, and retrain when drift is detected.

---

q1: (answer this first) How should Intelligent Document Processing be split into modules (the sub-areas of the product)?

- a) Two modules: Capture and Classify (intake batches, classification results, extraction templates) plus Extract and Validate (extracted records and fields, validation results, the models, training datasets).
- b) Three modules: same as (a) but pull the data-science workflow (extraction models, training datasets) out into its own Model Management module.
- c) One module: the whole pipeline as a single module (this breaks the rule that a domain with 3 or more capabilities needs at least 2 modules, once the 7 capabilities land).

Recommended: b. It cleanly separates the model lifecycle (the data-scientist persona) from the runtime pipeline (validator and ops personas), matching how the specialist vendors split a model studio from the operator workspace. IDP is currently unbuilt, so this choice gates every module, capability, role, lifecycle state, and handoff link below it: it unlocks the rest of the build.

a1:

---

q2: Approve the proposed wording for the 7 internal relationships between IDP objects (for example, a capture batch yields classification results, a capture batch yields extracted records, an extracted record has many extracted fields, an extracted record has a validation result, a template is applied to extracted records, a model is used on extracted records, a training dataset trains a model)?

- a) Approve the proposed verb wording as drafted.
- b) Rewrite specific edges (tell me which).
- c) Defer.

Recommended: a. The proposed wording reads naturally and is the minimum needed to wire up the object graph once modules land.

a2:

---

q3: Should any IDP objects be flagged as containing personal data (GDPR / PHI), and if so which ones?

- a) Flag capture batches, extracted records, and extracted fields as containing personal data.
- b) Flag a different subset (tell me which).
- c) Flag none.

Recommended: a. These three hold the raw documents and the extracted personal values, so they are the natural personal-data carriers.

a3:

---

q4: Should validation results be locked once a validator submits the disposition, so the record cannot be quietly edited afterward? (yes/no)

Recommended: yes. A submitted validation outcome is an audit record, so changes should go through a fresh action rather than an in-place edit.

a4:

---

q5: Is there any IDP object that should require a single named approver before it can progress? (yes/no)

Recommended: no. Nothing in the IDP workflow has an obvious single-approver gate; the validator queue already handles sign-off per record.

a5:

---

q6: Are the extraction models and training datasets correctly mastered inside IDP for now, on the understanding they will draw from a future MLOps domain once it ships?

- a) Confirm IDP-local mastery now, revisit when MLOps lands.
- b) Defer the mastership decision to the MLOps landing.
- c) Split them off into MLOps now.

Recommended: a. They are template-bound and document-shaped today, so keeping them in IDP avoids a premature move to a domain that does not exist yet; MLOps can consume them when it arrives.

a6:

---

q7: Which compliance frameworks should be added to IDP beyond the current GDPR and EU AI Act?

- a) Add HIPAA as mandatory; leave FERPA out.
- b) Add both HIPAA and FERPA as mandatory.
- c) Add HIPAA as applicable-when-relevant only.
- d) Leave both out.

Recommended: a. IDP that processes health claims and EOBs hits HIPAA often enough to warrant baseline coverage; FERPA only matters for higher-education document scope, so leave it out unless you have that scope.

a7:

---

q8: Two cross-domain relationships to the content-management domain carry forced verbs. Should I rewrite them as "extracted records derive from content documents" (row 585) and "document classification results apply document classifications" (row 586)?

- a) Approve both rewrites.
- b) Approve the extracted-records rewrite only (row 585).
- c) Approve the classification-results rewrite only (row 586).
- d) Rewrite differently (tell me how).
- e) Decline and leave both as they are.

Recommended: a. Both current verbs read backward or forced; the proposed wording matches the actual data flow. These overwrite existing non-empty rows, so they need your sign-off.

a8:

---

q9: The legacy domain-level system skill (idp-system) now happens to match the single-skill shape the current model wants, so it is kept rather than split. Do you still want it deleted? (yes/no)

Recommended: no. Keep it. Under the current model each domain carries exactly one domain-grain system skill, which is what this skill already is; deleting it would remove the correct artifact. Any delete is destructive, so it is surfaced rather than applied.

a9:

---

## Optional (will not hold up the build)

q10: Across the flagship IDP vendors, seven extra objects show up (human review tasks, per-field extraction corrections, detected document layouts, confidence thresholds, raw OCR results, redaction results, configurable validation rules). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Several are near-universal across the vendor set, though they still want a verification pass before they become load-bearing.

a10:

---

<!-- agent map, ignore: q1=B2-IDP-MODULE-SPLIT q2=B2-IDP-INTRA-VERBS q3=B2-IDP-PATTERN-FLAGS.personalcontent q4=B2-IDP-PATTERN-FLAGS.submitlock q5=B2-IDP-PATTERN-FLAGS.singleapprover q6=B2-IDP-MLOPS-BOUNDARY q7=B2-IDP-HIPAA-FERPA q8=B2-IDP-CROSS-DOMAIN-VERBS q9=B1B-S10-LEGACY-SKILL-RETIRE q10=B3-IDP-HUMAN-REVIEW-TASKS+B3-IDP-EXTRACTION-CORRECTIONS+B3-IDP-DOCUMENT-LAYOUTS+B3-IDP-CONFIDENCE-THRESHOLDS+B3-IDP-OCR-RESULTS+B3-IDP-REDACTION-RESULTS+B3-IDP-VALIDATION-RULES | domain_id=39 -->
