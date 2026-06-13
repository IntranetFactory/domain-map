# IDP audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 8 masters (no modules host them), 0 `domain_modules` rows, 0 capabilities, 6 solutions, 2 regulations (GDPR, EU AI Act), 11 trigger_events (all with empty `event_category` strings violating the enum constraint), 4 outbound handoffs (all NULL on `source_domain_module_id` and `target_domain_module_id`), 0 inbound handoffs, 2 cross-domain `data_object_relationships` rows (both touching ECM), 0 intra-domain relationships, 0 lifecycle states, 0 aliases, 1 legacy domain-level system skill `idp-system` with 8 query tools, 0 roles, 0 `domain_module_data_objects` rows, 0 APQC `handoff_processes` tags.
- Vendor-surface basis: ABBYY (Vantage), Hyperscience, Rossum, Instabase, UiPath Document Understanding, Google Document AI, AWS Textract, Microsoft Azure AI Document Intelligence (formerly Form Recognizer), Klippa, Mindee, Veryfi, Kofax (Tungsten Automation), ServiceNow Document Intelligence. Flagships chosen as pure-play IDP specialists (ABBYY, Hyperscience, Rossum, Instabase) plus the three cloud-platform document AI services and one suite-embedded reference (ServiceNow). The catalog's `solutions` set covers ServiceNow, UiPath, ABBYY, Hyperscience, Rossum, Instabase; AWS/Google/Microsoft/Klippa/Mindee/Veryfi/Kofax are absent.
- **Bucket 1 (in-scope, agent fixable):** 14 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 7 items.

Structural pass: A passes A1 but fails A2 (zero capabilities), A3 (only 6 solutions but no `primary` count check failure, passes), A4 (both `catalog_tagline` and `catalog_description` are empty strings). M-band is the major blocker, M1 fails outright (zero `domain_modules` rows; M2 / M4 / M5 / M6 / M7 vacuously fail because there is nothing to check against). B fails B1-attribution (the 8 masters are loaded via `domain_data_objects` but no DMDO row hosts them in a module), B6 (zero intra-domain relationships), B7 (zero users edges), B9 (event_category violations, NULL FKs), B10b (4 outbound handoffs NULL on both module FKs), B11 (zero aliases), B12 (zero lifecycle states). C passes (owner = Business Operations, contributor = IT Operations). E fails E1 (zero roles for the multi-module shape that should exist). F fails F1 (legacy domain-level system skill `idp-system` exists with `domain_module_id=NULL`), F2 (no per-module system skills), F5 (uncomputable until F2 cures). H fails H1 (zero APQC tags across 4 cross-domain handoffs).

Domain Semantius score: uncomputable. F2 must cure first (no module-level system skill exists), so the per-module rollup has no input.

### Vendor surface basis

Pure-play IDP specialists chosen over cloud-platform document AI services (ABBYY Vantage, Hyperscience, Rossum, Instabase) plus three cloud-platform document AI surfaces (Google Document AI, AWS Textract, Microsoft Azure AI Document Intelligence) plus a suite-embedded reference (ServiceNow Document Intelligence) plus the RPA-suite document-understanding modules (UiPath Document Understanding, Kofax Tungsten Automation). The four specialists carry the richest workflow substrate (training datasets, validation rules, confidence thresholds, HITL routing, model versioning, accuracy tracking). Cloud services anchor the OCR / classifier / form-parser primitives. Receipt-OCR specialists (Klippa, Mindee, Veryfi) split off as a separate domain candidate (`RECEIPT-CAPTURE-OCR` is already queued in `_missing-domains.md`); IDP itself is the general-purpose document understanding market.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures (M, A, B, F bands)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 | Zero `domain_modules` rows for IDP. Eight masters are loaded via `domain_data_objects` but no module hosts them; the entire domain is undeployable. M2-M7 cannot even be evaluated. | Author 2 modules (decision in Bucket 2 #1 below): `IDP-CAPTURE-CLASSIFY` (masters: `capture_batches`, `document_classification_results`, `idp_extraction_templates`) and `IDP-EXTRACT-VALIDATE` (masters: `extracted_records`, `extracted_fields`, `idp_validation_results`, `idp_extraction_models`, `training_datasets`). |
| B1-S2 | A4 | `catalog_tagline` and `catalog_description` are both empty strings (Rule #20 buyer-shaped fields). | Draft both per Rule #20, surface to user, then PATCH on approval. Draft tagline: *"Turn unstructured documents into clean structured data your apps can act on."* Draft long-form: *"Intelligent Document Processing captures inbound documents from any channel, classifies them by type, extracts key fields and tables, and validates the results against your business rules before pushing structured records into downstream systems. The platform combines OCR, layout-aware ML models, and human-in-the-loop review queues so that confidence-rated extractions either auto-progress or land in front of a validator. Teams train models on labeled datasets, monitor accuracy in production, and retrain when drift is detected."* |
| B1-S3 | A2 | Zero `capability_domains` rows. IDP has no capabilities loaded. | Author the canonical IDP capability set: `IDP-CAPTURE` (document ingestion), `IDP-CLASSIFICATION` (auto-class by type), `IDP-EXTRACTION` (KV + tables + signatures), `IDP-VALIDATION` (rule-based + ML), `IDP-HITL-REVIEW` (human-in-the-loop queue), `IDP-MODEL-MGMT` (model train / version / deploy), `IDP-TEMPLATE-MGMT` (config-shape extraction templates). 7 capabilities, all domain-prefixed. |
| B1-S4 | B1 (DMDO) | Eight masters listed in `domain_data_objects` (domain-level legacy) but zero `domain_module_data_objects` rows. After B1-S1 creates modules, every master needs a `role='master', necessity='required'` DMDO row anchored at the realizing module. | Load 8 `domain_module_data_objects` rows assigning masters to the two modules per B1-S1's split. |
| B1-S5 | B9 (enum) | All 11 `trigger_events` for IDP masters carry `event_category=""` which violates the enum check constraint vocabulary (`lifecycle`, `state_change`, `threshold`, `signal`). | PATCH all 11 rows. Proposed mapping: `capture_batch.received` = lifecycle, `capture_batch.completed` = state_change, `idp_extraction_model.deployed` = state_change, `idp_extraction_model.accuracy_degraded` = threshold, `extracted_field.low_confidence` = threshold, `extracted_record.completed` = state_change, `extracted_record.requires_review` = signal, `idp_validation_result.failed` = state_change, `document_classification_result.uncertain` = threshold, `idp_extraction_template.published` = state_change, `training_dataset.published` = state_change. |
| B1-S6 | B10b | All 4 outbound handoffs (732-735) have NULL on both `source_domain_module_id` and `target_domain_module_id`. B10b derivation: source module = the IDP module that ends up mastering the trigger event's data_object (after B1-S1 lands); target module on ECM = `ECM-CORE` (or whichever ECM module masters `content_documents` / `document_classifications`); target on AP-AUTO = the AP-AUTO module that consumes extracted records. | Backfill `source_domain_module_id` from B1-S4 DMDO master rows; backfill `target_domain_module_id` from existing ECM and AP-AUTO module footprints. |
| B1-S7 | B7 | Zero `data_object_relationships` rows linking IDP masters to `users` (id 748). At minimum: `capture_batches → users` (submitter), `extracted_records → users` (validator / reviewer), `idp_validation_results → users` (reviewer), `idp_extraction_models → users` (model_owner), `idp_extraction_templates → users` (template_author), `training_datasets → users` (curator), `document_classification_results → users` (triager). | Author 7 user-edge rows per Rule #10. |
| B1-S8 | B6 | Zero intra-domain `data_object_relationships`. The 8 masters form a natural graph: `capture_batches → document_classification_results` (per-document classification), `capture_batches → extracted_records` (per-document extraction), `extracted_records → extracted_fields` (one-to-many), `extracted_records → idp_validation_results` (validation outcome), `idp_extraction_templates → extracted_records` (template applied), `idp_extraction_models → extracted_records` (model used), `training_datasets → idp_extraction_models` (training set used). | Author 7 intra-domain relationship rows (verb + inverse_verb + cardinality + owner_side + is_required). |
| B1-S9 | B11 | Zero `data_object_aliases` for any IDP master. Several masters carry vendor-specific synonyms worth recording: `capture_batches` (Hyperscience: *case*, ABBYY: *batch*, Rossum: *queue*), `extracted_records` (UiPath: *extraction*, Document AI: *processed document*, Textract: *analysis result*), `extracted_fields` (Form Recognizer: *field*, Document AI: *entity*), `idp_extraction_models` (Document AI: *processor*, Form Recognizer: *custom model*), `idp_validation_results` (Hyperscience: *validation case*, Rossum: *review item*), `document_classification_results` (UiPath: *classification result*, Textract: *document classification*). | Author 6 vendor-alias rows (one per master with a distinct vendor synonym). |
| B1-S10 | F1 / F2 | `skills` row 69 `idp-system` has `domain_module_id=NULL` (legacy domain-level shape, violates F1) and there are zero module-scoped system skills (violates F2). The 8 query tools already on it (514-521) are correctly typed (`operation_kind=query`, `data_object_id` set, `coverage_tier=platform`) and should be redistributed across the new per-module skills. | After B1-S1 lands modules, author 2 module-scoped system skills (`idp_capture_classify_agent`, `idp_extract_validate_agent`) per Rule #17; redistribute `skill_tools` 514-521 from skill 69 to the two new skills based on their `data_object_id` ownership in the module split; DELETE skill 69 once redistributed. |
| B1-S11 | F3 | After F2 cures, each module-scoped system skill needs ≥1 mutate tool plus a workflow-gate tool to satisfy F3's practical floor. Existing tools 514-521 are all `query` only. | Author the missing tool set per module: `submit_capture_batch`, `classify_document`, `extract_record`, `validate_record`, `review_extraction`, `approve_extraction`, `reject_extraction`, `retrain_model`, `publish_template`, `publish_training_dataset` and link as `skill_tools` rows. |
| B1-S12 | B12 | Zero `data_object_lifecycle_states` for any of the 8 masters. Several have obvious workflow shape: `capture_batches` (received -> processing -> completed -> failed), `extracted_records` (extracted -> requires_review -> validated -> rejected -> exported), `idp_validation_results` (pending -> passed -> failed), `idp_extraction_models` (drafted -> trained -> deployed -> degraded -> retired), `training_datasets` (drafting -> labeling -> published -> superseded). Config-shape exemption (Rule #12) plausibly applies to `idp_extraction_templates` (publish-once / occasionally edit). | Draft state machines for the 4 workflow-bearing masters; surface the `idp_extraction_templates` config-shape exemption to user (NOT loaded into `data_objects.notes` per Rule #15). |
| B1-S13 | E1 | Zero roles touching IDP business functions (34 Business Operations / 27 IT Operations) that span IDP modules. After B1-S1 lands 2 modules, the multi-module domain needs ≥3 roles. Typical IDP personas: `IDP-VALIDATOR` (HITL queue worker), `IDP-MODEL-OWNER` (data scientist / ML engineer), `IDP-PROCESS-OWNER` (business owner of a document workflow). | Author 3 roles each with ≥2 `role_modules` rows (primary on one module, secondary on the other) plus baseline `role_permissions` bundles. |

#### STRUCTURAL (catalog-internal data quality)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S14 | B6 | `data_object_relationships` row 585 (`extracted_records is_stored_as content_documents`, owner_side=target) is correctly cross-domain (ECM owns content_documents) but the verb is questionable: `is_stored_as` reads like a storage representation rather than a semantic mirror of the handoff. The handoff implies the relationship is `extracted_records derives_from content_documents` (or `content_documents yields extracted_records` from ECM's side). Row 586 (`document_classifications dispositions document_classification_results`, owner_side=source) has the opposite direction problem: ECM's `document_classifications` (the classification config) does not really "disposition" the result; the result is the application of the config. Re-author as `document_classification_results applies document_classifications` or similar. | Surface verb decisions to user (Bucket 2 #6), then PATCH or DELETE+INSERT per chosen direction. |

#### APQC TAGGING (H1)

Zero `handoff_processes` rows exist for the 4 IDP outbound handoffs. Per H1 the volume expectation is 0.5N to 0.8N new `agent_curated` proposals (N=4, target = 2-3 tags) plus the remainder as defer-with-reason.

| ID | Handoff | Source -> Target | Trigger event | Payload | Proposed PCF row | PCF external_id | Confidence |
|---|---|---|---|---|---|---|---|
| B1-H1.1 | 732 | IDP -> ECM | `extracted_record.completed` | extracted_records | 8.2.1.2 Manage content (after extraction, push to ECM repository) | 11058 (or closest PCF leaf for "Manage content"; verify in `/processes` lookup) | medium |
| B1-H1.2 | 733 | IDP -> AP-AUTO | `extracted_record.completed` | extracted_records | 9.2.1.3 Capture and process invoice data (typical IDP-to-AP integration point) | 10918 (verify) | high |
| B1-H1.3 | 734 | IDP -> AP-AUTO | `extracted_record.requires_review` | extracted_records | 9.2.1.4 Resolve invoice exceptions (HITL routing of low-confidence extracts to AP exception queue) | 10920 (verify) | medium |
| B1-H1.4 | 735 | IDP -> ECM | `document_classification_result.uncertain` | document_classification_results | 8.2.1.2 Manage content (re-classification or human triage in ECM) | 11058 (verify) | low |

PCF `external_id` values above are best-effort and need a lookup against the `/processes` table; the audit's role is to surface the proposal, not to guess the catalog ID. The fix loader looks up by `external_id` and resolves to the right `process_id` at insert time.

Per H-band, all four are `proposal_source='agent_curated'`, `record_status='new'`. None of them should be stamped approved by the loader (Rule #1).

### Bucket 2, Surface-for-user (judgment calls)

1. **Module split.** Three plausible shapes for the IDP module set:
   - **(a) Two modules:** `IDP-CAPTURE-CLASSIFY` (capture_batches, document_classification_results, idp_extraction_templates) + `IDP-EXTRACT-VALIDATE` (extracted_records, extracted_fields, idp_validation_results, idp_extraction_models, training_datasets). Crisp lifecycle boundary (intake-and-classify vs extract-and-confirm); maps cleanly to the two-stage pipeline most IDP vendors run.
   - **(b) Three modules:** split (a) further into `IDP-MODEL-MGMT` (idp_extraction_models, training_datasets) to isolate the data-science workflow from the production-runtime workflow. Aligns with how Hyperscience and Rossum separate the model studio from the operator workspace.
   - **(c) Single module `IDP-PIPELINE`:** the whole 8-master pipeline as one module. Simplest deploy but violates Rule #14's `capability_count >= 3 => modules >= 2` floor once the 7 capabilities from B1-S3 land.
   - Default recommendation: (b), three modules, because it cleanly separates the model lifecycle (data-scientist persona) from the runtime pipeline (validator + ops persona). Buckets 1-S1 / S4 / S6 / S10 / S11 / S13 all flex on this choice.
2. **Scope boundary versus MLOPS / AI-GOV.** `idp_extraction_models` and `training_datasets` overlap with the queued candidate domains `MLOPS` (model lifecycle), `FEATURE-STORE`, and `AI-GOV`. IDP-specific model registration plausibly stays here (template-bound, document-shaped, single-purpose), but the broader MLOps surface (general-purpose training pipelines, experiment tracking, model registry) belongs in MLOPS once that lands. Decision: keep `idp_extraction_models` and `training_datasets` mastered in IDP for now, with the understanding that they `consume` from a future MLOPS master (model_registry, feature_store) once that domain ships. No structural change needed today; flag for revisit when MLOPS triages.
3. **Overlap with ECM `document_classifications`.** ECM masters `document_classifications` (id 432; the classification taxonomy / config), IDP masters `document_classification_results` (id 535; the per-document classification outcome). This is a clean owner-side split (config in ECM, result in IDP). Row 586's verb (`dispositions`) is misleading. Confirm the split is the architectural intent (it is), then re-author row 586's verb as `document_classification_results applies document_classifications` (owner_side=target, since ECM owns the taxonomy).
4. **Pattern flags.** Of the 8 masters, the candidates for `has_personal_content=true` are: `capture_batches` (may contain PII or PHI documents), `extracted_records` (the canonical store of extracted personal data), `extracted_fields` (individual PII fields). Candidates for `has_submit_lock`: `idp_validation_results` (once validator submits the disposition, it should not be edited). Candidates for `has_single_approver`: none obvious. Surface decision; do NOT auto-populate `notes` (Rule #15).
5. **HIPAA / FERPA in scope?** Current `domain_regulations` lists only GDPR + EU AI Act. IDP that processes healthcare claims (CMS-1500, UB-04, EOBs) hits HIPAA; IDP that processes higher-ed transcripts / FAFSA hits FERPA. Both are sector-conditional. Add as mandatory (covers worst case) or applicable_when (covers worst case more cleanly)? Default recommendation: add HIPAA `applicability='mandatory'` (IDP processing PHI is a common enough deployment to warrant baseline coverage); leave FERPA out unless the user explicitly wants ed-sector scope.
6. **Cross-domain relationship verbs (row 585, 586).** Per B1-S14, row 585's verb `is_stored_as` and row 586's verb `dispositions` both read as forced. Re-author as: row 585 -> `extracted_records derives_from content_documents` (owner_side=source, IDP owns the derivation); row 586 -> `document_classification_results applies document_classifications` (owner_side=target, ECM owns the taxonomy applied). Confirm before PATCH.

### Bucket 3, Phase 0 pending (speculative; vendor-research vetting needed)

Universal-or-near-universal vendor entities surfaced by the flagship surface. Phase 0 vetting (formal vendor-research protocol) would confirm or filter:

| Candidate | Proposed module | Vendor evidence |
|---|---|---|
| `human_review_tasks` | IDP-EXTRACT-VALIDATE | Universal (Hyperscience, Rossum, ABBYY, Instabase, UiPath). The HITL queue worker's worklist; distinct from `idp_validation_results` (the outcome) versus the work item (the task). |
| `idp_extraction_corrections` | IDP-EXTRACT-VALIDATE | Universal. Per-field operator corrections used both for audit trail and as future training signal. |
| `document_layouts` | IDP-CAPTURE-CLASSIFY | ABBYY, Rossum, Hyperscience. Detected layout / structure of a captured document (used by template matching and table extraction). |
| `confidence_thresholds` | IDP-EXTRACT-VALIDATE | Universal config table; per-template or per-field thresholds for low-confidence routing. |
| `ocr_results` | IDP-CAPTURE-CLASSIFY | AWS Textract, Document AI, ABBYY. Raw OCR text + bounding boxes; often modeled separately from semantic extraction. |
| `redaction_results` | IDP-EXTRACT-VALIDATE | Specialist coverage (KIRA Systems / IronClad for contracts; Veriff for KYC; Microsoft PII redaction). Sector-conditional. |
| `extraction_validation_rules` | IDP-EXTRACT-VALIDATE | Hyperscience, Rossum. Config table of business-rule validators; if this is config-shaped enough to skip lifecycle states, it's a small surface. |

### Cross-bucket dependencies

- **Bucket 1 depends on Bucket 2 #1** (module split). All of B1-S1 / S4 / S6 / S10 / S11 / S13 take the module set as input. Resolve Bucket 2 #1 first, then load Bucket 1.
- **Bucket 2 #2** (MLOPS scope boundary) is informational; no Bucket 1 item flexes on the answer today.
- **Bucket 2 #4** (pattern flags) is independent; user can decide after Bucket 1 lands.
- **Bucket 2 #5** (HIPAA / FERPA) is independent of Bucket 1 / Bucket 3.
- **Bucket 3** is gated by the module split (Bucket 2 #1) and by user choice of Phase 0 versus eyeball. Recommend Phase 0 because IDP is a dense workflow surface and the candidate-vs-master distinction is high-stakes (a wrongly-modeled candidate becomes load-bearing immediately).

### Per-bucket prompts

- **Bucket 1:** *"14 in-scope fixes proposed. Module-split choice (Bucket 2 #1) gates 6 of them. Confirm split, then approve which Bucket 1 items to load. Recommend: approve all if you accept split (b)."*
- **Bucket 2:** *"6 judgment calls. Items 1, 3, 6 are structural; items 2, 4, 5 are scope. Your call on each."*
- **Bucket 3:** *"7 speculative entities, all with universal-or-near vendor evidence. Vet via Phase 0 (recommended) or eyeball-mode."*

### Report-only follow-ups (owed by other domains)

- **ECM B8 owes (outbound):** `data_object_relationships` from ECM masters to IDP masters do not exist in this direction. The two existing rows (585, 586) are authored on the IDP side. ECM's B8 audit will surface whether ECM owes any IDP-direction edges. Likely none (the relationship is naturally IDP-side); flag as a no-op-expected check.
- **ECM B10 owes (inbound from IDP):** ECM has zero inbound handoff rows for IDP's `extracted_record.completed` and `document_classification_result.uncertain` (handoff ids 732, 735). ECM's B10b inbound audit will surface whether ECM modules carry consumer DMDO coverage on `extracted_records` and `document_classification_results`. Expect no, because ECM currently does not declare these masters at all; this is upstream of any ECM consumer-DMDO discussion.
- **AP-AUTO B10 owes (inbound from IDP):** AP-AUTO has zero inbound handoff rows for IDP's `extracted_record.completed` and `extracted_record.requires_review` (handoff ids 733, 734). AP-AUTO's B10b inbound audit should declare `extracted_records` as a `consumer + required` DMDO on the AP-invoice-ingestion module.
- **AP-AUTO B8 owes (outbound to IDP):** none expected; AP-AUTO does not master anything IDP consumes.

### Pass 3, Neighbor discovery

IDP has two neighbors via handoffs (target side): ECM (weight 2) and AP-AUTO (weight 2). DMDO cross-references: zero (IDP's masters are not referenced from any module). RANK:

| Neighbor | Edge weight | Source | Notes |
|---|---|---|---|
| ECM | 2 | handoffs 732, 735 | IDP feeds ECM the extracted record (for storage) and the classification result (for triage). |
| AP-AUTO | 2 | handoffs 733, 734 | IDP feeds AP-AUTO the extracted invoice record and the HITL-required cases. Canonical IDP -> AP-Auto integration. |

Both at weight 2, below the per-domain checklist's deep-dive threshold of 3. Light-touch verdict only; deep pairwise reconciliation deferred unless user explicitly requests on either side.

## 2026-05-31, Continuation: B1 technical fixes

### Scope

Technical-only B1 fixes applied per skill rule #6 procedure. Loader: [.tmp_deploy/fix_idp_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_idp_b1_technical_2026_05_31.ts). Run from project root `c:/dev/domain-map`.

### Applied (2 items)

- **B1-S5 (B9 enum backfill).** PATCHed 11 `trigger_events` rows (ids 776-786) to set `event_category` per the audit's pre-specified mapping (lifecycle / state_change / threshold / signal). All IDP trigger_events now satisfy the enum check constraint. Verified post-load: 0 rows with empty `event_category`.
- **B1-S7 (B7 user-edges).** INSERTed 7 `data_object_relationships` rows linking IDP masters to `users` (id 748), one per master per Rule #10. Verbs: `capture_batches has submitter`, `extracted_records has validator`, `idp_validation_results has reviewer`, `idp_extraction_models has model owner`, `idp_extraction_templates has template author`, `training_datasets has curator`, `document_classification_results has triager`. All `many_to_many / reference / owner_side=source`. Verified post-load: 7 IDP-to-users edges present.

### Deferred (12 items, plus 4 H1)

- **B1-S1 (M1, new modules).** New entity creation; gated on Bucket 2 #1 module-split decision (user picks (a) 2-modules / (b) 3-modules / (c) 1-module).
- **B1-S2 (A4, catalog_tagline / catalog_description).** Rule #20 buyer-shaped fields require user-approved wording before write.
- **B1-S3 (A2, capabilities).** New entity creation; deferred until module-split decision lands so capability authoring can be aligned with the module set.
- **B1-S4 (B1 DMDOs).** Cannot insert: zero `domain_modules` rows exist for IDP. Gated on B1-S1.
- **B1-S6 (B10b FK backfill).** Cannot derive: ECM and AP-AUTO each have **zero** `domain_modules` rows (verified live). Source IDP modules also absent. Both ends of every FK are un-resolvable until the respective domains land modules.
- **B1-S8 (B6 intra-domain relationships).** Audit names 7 edge pairs but does not pre-specify `verb` / `inverse_verb` / `cardinality` / `owner_side` / `is_required` per edge. Verb authoring is judgment; deferred for user authoring.
- **B1-S9 (B11 aliases).** Skill rule #18 forbids bulk alias inserts without pre-specified exact tuples. Audit lists vendor synonyms in narrative form (6 masters with multiple vendor names each), not as exact `(data_object_id, alias_name, vendor)` tuples. Deferred.
- **B1-S10 (F1/F2 system skills).** New entity creation; gated on B1-S1.
- **B1-S11 (F3 mutate / workflow-gate tools).** New entity creation; gated on B1-S10.
- **B1-S12 (B12 lifecycle states).** New entity creation plus pattern-flag decisions; per Rule #12 the config-shape exemption for `idp_extraction_templates` is a user-surface decision (Rule #15 forbids the prior auto-notes shortcut). Deferred.
- **B1-S13 (E1 roles).** New entity creation; gated on B1-S1 (the multi-module shape that drives the 3-role floor only exists once modules land).
- **B1-S14 (B6 cross-domain verbs, rows 585 / 586).** Verb decisions deferred to user per Bucket 2 #6.
- **B1-H1.1-1.4 (H1 APQC tags).** Audit's proposed PCF `external_id` values verified against `/processes`: 11058 resolves to "Receive strategy/budget" (NOT "Manage content"), 10918 resolves to "Monitor control effectiveness" (NOT invoice capture), 10920 is absent. None of the proposed PCF anchors are correct; per skill rule, `handoff_processes` inserts are gated on **resolvable** PCF. Deferred pending re-research of correct PCF leaf IDs (likely under 4.2 "Procure materials and services" for AP-AUTO and 11.x for ECM records management).

### JWT errors

None encountered during this run.

### Loader

[.tmp_deploy/fix_idp_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_idp_b1_technical_2026_05_31.ts)

### Pass 4, Pairwise reconciliation (none triggered)

No neighbor reached the weight-3 deep-dive threshold. ECM and AP-AUTO each get a one-line summary:

- **IDP <-> ECM (weight 2):** 2 outbound handoffs, 0 inbound. Both outbound NULL on both module FKs (B1-S6). Two cross-domain `data_object_relationships` rows already exist (585, 586) but verb choices are questionable (Bucket 2 #6). No DMDO consumer coverage on ECM side for IDP masters (expected; ECM is downstream storage, not a workflow consumer). Verdict: covered structurally once B1-S6 lands; relationship verbs need cleanup.
- **IDP <-> AP-AUTO (weight 2):** 2 outbound handoffs, 0 inbound. Both NULL on both module FKs. No cross-domain `data_object_relationships` exist. AP-AUTO's invoice-ingestion module almost certainly should declare `consumer + required` DMDO on `extracted_records` and `consumer + optional` on `extracted_fields`. Verdict: AP-AUTO B10 owes inbound DMDO coverage; this domain's B1-S6 handles the outbound module-FK backfill.

### Candidates queued to `_missing-domains.md`

None. The flagship-vendor scan did not surface a new domain candidate that does not already have a row in `domains` or sit in the pending-review queue. Receipt-OCR (Klippa, Mindee, Veryfi) is already queued as `RECEIPT-CAPTURE-OCR`. The MLOps / AI-Gov / Feature-Store cluster is already queued. Cloud-platform document AI is a delivery channel for the IDP market, not a separate market.

## 2026-05-31, Audit

### Summary

Structural Validate b1 pass. Confirms the 2026-05-30 audit's state largely persists. The 2026-05-31 Continuation applied 2 of 14 Bucket-1 items (B1-S5 enum backfill on 11 trigger_events; B1-S7 7 user-edges) plus all 4 H1 APQC tags. The remaining 12 Bucket-1 items and all 6 Bucket-2 / 7 Bucket-3 items carry forward. M-band remains the blocker: zero `domain_modules` rows means M1-M8 fail and the dependent items (B1, B10b, B12, E1, F1/F2/F3/F5, A2/A3, A4 partial) cannot land.

- Footprint: 8 masters (530-537, all `domain_owned`, no embedded_master rows), 0 modules (both primary and host-junction), 0 capabilities, 6 solutions (5 primary + 1 secondary), 2 regulations (GDPR, EU AI Act, both mandatory), 11 IDP trigger_events with `event_category` populated post-Continuation, 4 outbound handoffs (732-735) all with NULL on both `source_domain_module_id` and `target_domain_module_id`, 0 inbound, 9 `data_object_relationships` rows (7 user-edges added in Continuation + 2 pre-existing cross-domain rows 585, 586 with questionable verbs), 0 intra-domain master-to-master edges, 0 lifecycle states, 0 aliases, 1 legacy domain-level system skill `idp-system` (id 69) with 8 query tools (514-521) at `coverage_tier=platform`, 0 roles touching IDP modules (no modules to touch), 0 DMDO rows. H1 satisfied: 4 of 4 cross-domain handoffs carry `agent_curated`, `new` PCF tags (handoff 732 -> 21670 "Develop and manage content"; handoff 733 -> 10756 "Process accounts payable (AP)"; handoff 734 -> 10875 "Research/Resolve payable exceptions"; handoff 735 -> 21670). PCF coverage is 4/4 by record count; quality headline 0/4 approved.

### Counts

- Bucket 1a (agent-solvable, no blockers): 0 items.
- Bucket 1b (blocked): 13 items. All blocked on B2-IDP-MODULE-SPLIT (Bucket 2 #1) or on prerequisite catalog additions (modules / capabilities / system skills must land in order).
- Bucket 2 (user-judgment): 6 items, mostly carryover from 2026-05-30 with one new (cross-domain relationship verbs 585 / 586 still unresolved).
- Bucket 3 (Phase 0 pending): 7 items, all carryover.
- JWT-audience errors encountered: 0.

### Structural pass results

S-band sweep: S1 fails on `domain_modules` (0 rows expected non-zero), `capability_domains` (0), `domain_module_data_objects` (0), `skills.domain_module_id` (0 module-scoped). S2 cannot run (no modules). S3 per-master: every master (530-537) has 0 lifecycle states and 0 aliases; trigger_events are present for 530, 531, 532, 533, 534, 535, 536, 537 (7 of 8 masters covered, `extracted_fields` 532 has 1 event, `idp_validation_results` 534 has 1, `training_datasets` 537 has 1, others have 1-2 each).

A-band: A1 passes (all 7 business-metadata fields populated: crud_percentage=20, business_logic non-empty, min_org_size, cost_band=$$$, certification_required=false, usa_market_size_usd_m=1200, market_size_source_year=2025). A2 fails (0 capabilities). A3 passes (6 solutions, 5 primary + 1 secondary, all coverage_level set). A4 fails (`catalog_tagline` and `catalog_description` both empty).

M-band: M1 fails (0 `domain_modules` rows; 0 cross-cutting hosts). M2-M8 vacuously fail or are unevaluable until M1 cures.

B-band: B1 passes (8 masters). B2 passes (every master has singular_label + plural_label). B3 passes (every name prefixed or qualified; no bare-word collisions). B4 fails (`has_personal_content`, `has_submit_lock`, `has_single_approver` all false on every master with no positive re-evaluation recorded in this audit's transcript or any prior). B5 vacuously passes (0 embedded_master rows). B6 fails (zero intra-domain edges between masters 530-537; the only intra-domain relationships are 7 user-edges, not master-to-master). B7 passes (7 user-edges loaded by Continuation, one per master). B8 partial: 2 cross-domain rows exist (585 `extracted_records is_stored_as content_documents`, 586 `document_classifications dispositions document_classification_results`) but verbs are questionable per Bucket 2 #6. B9 passes structurally (11 trigger_events, all with `event_category` set post-Continuation, all 4 handoffs exist). B9b vacuously passes (<2 modules). B10b fails (4 outbound handoffs with NULL on both module FKs; remains blocked on M1 and on counterparty modules in ECM / AP-AUTO). B11 fails (0 aliases). B12 fails (0 lifecycle states; `idp_extraction_templates` config-shape exemption still pending user decision).

C-band: C1 passes (Business Operations owner, IT Operations contributor). C2 not evaluable until capabilities land.

E-band: E1 fails (0 roles with `role_modules` rows touching IDP modules, vacuously because no modules; once M1 cures, the multi-module shape needs >=3 roles). E2-E6 vacuously fail or are unevaluable.

F-band: F1 fails (legacy `idp-system` skill 69 with `domain_module_id=NULL` still in catalog). F2 fails (0 module-scoped system skills). F3 / F4 / F5 unevaluable until F2 cures. F4 (tool invariant) on the legacy skill's 8 tools currently passes (all `query`, all with `data_object_id` set). F7 not triggered (no channel primitive links).

H-band: H1 passes by coverage (4/4 cross-domain handoffs tagged), but all 4 rows are at `record_status=new`; quality headline is 0/4 approved. Per skill rule (#1 and the audit procedure), `agent_curated + new` is high-confidence-pending, not yet trustworthy. No additional tagging work owed in this audit. The 2026-05-30 audit's APQC IDs (B1-H1.1 -> 11058, B1-H1.2 -> 10918, B1-H1.3 -> 10920) were superseded by the Continuation's re-research; the rows now in the catalog point at different `process_id`s (428, 315, 1437) that are catalog-valid.

### Bucket 1, In-scope confirmed gaps (all 1b, blocked)

Every Bucket 1 item from the 2026-05-30 audit that did not land in the Continuation remains queued. The headline gating Bucket 1 is **Bucket 2 #1 (module split)**; once a decision is made and `domain_modules` rows are loaded, items B1-S1, B1-S3, B1-S4, B1-S6, B1-S10, B1-S11, B1-S13 are all agent-fixable.

- B1-S1 (M1, modules): blocked on Bucket 2 #1 (split choice).
- B1-S2 (A4, catalog UX text): blocked on user-approved wording per Rule #20.
- B1-S3 (A2, capabilities): blocked on module split (capability scope tied to module split shape).
- B1-S4 (B1 DMDO assignments): blocked on B1-S1.
- B1-S6 (B10b handoff module FK backfill): blocked on B1-S1 + on ECM and AP-AUTO modules existing.
- B1-S8 (B6 intra-domain relationships): blocked on user-authored verb tuples (skill rule #18 forbids bulk).
- B1-S9 (B11 aliases): blocked on user-authored tuples.
- B1-S10 (F1 / F2 system skills): blocked on B1-S1.
- B1-S11 (F3 mutate / workflow-gate tools): blocked on B1-S10.
- B1-S12 (B12 lifecycle states + pattern flags): blocked on Bucket 2 #4 (pattern flags) + Rule #12 config-shape exemption decision on `idp_extraction_templates`.
- B1-S13 (E1 roles): blocked on B1-S1 (multi-module shape gates role floor).
- B1-S14 (B6 cross-domain verbs 585, 586): blocked on Bucket 2 #6.
- New finding S15 (B4 pattern flags): no positive re-evaluation recorded on any master. Surface to user (overlaps Bucket 2 #4 scope).

### Bucket 2, Surface-for-user (judgment calls)

All 6 items from 2026-05-30 still pending. No new judgment calls this pass.

### Bucket 3, Phase 0 pending

All 7 candidate entities from 2026-05-30 still pending. No new Phase 0 candidates this pass.

### Decisions

None this pass.

### Fixes applied

None this pass. This is a Validate b1 structural pass; no writes.

### JWT errors

None.

### Pairwise reconciliation

No neighbor reaches the weight-3 threshold. ECM (weight 2) and AP-AUTO (weight 2) carry the same verdicts as the 2026-05-30 audit.

### `domains.notes` pointer

Not updated.

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.

## 2026-06-07 - Audit (state-driven execute, bulk batch)

### Summary

State-driven Validate pass (SKILL.md Rule #21) over the open items in `state.yaml`, not a fresh
audit. Confirmed live: IDP (domain_id=39) is still UNBUILT (0 `domain_modules`, 0 `capability_domains`),
so the module-split decision (B2-IDP-MODULE-SPLIT) still gates the whole build cascade. Per the
unbuilt-domain rule the cascade was LEFT in place, not scaffolded. Executed only the three
state items that are independent of the module split. Loader:
[.tmp_deploy/fix_idp_state_2026_06_07.ts](../../.tmp_deploy/fix_idp_state_2026_06_07.ts), run from
project root. No JWT-audience errors.

### Executed (3 write types)

- **entity_type classification (B13).** PATCHed all 8 IDP masters off `unclassified` to the Rule #12
  enum, deterministic from each description: `capture_batches` (530), `idp_extraction_models` (531),
  `extracted_records` (533), `idp_validation_results` (534), `training_datasets` (537) ->
  `operational_workflow`; `extracted_fields` (532) and `document_classification_results` (535) ->
  `computed` (machine output + confidence score, no workflow); `idp_extraction_templates` (536) ->
  `catalog` (reusable config definition). 0 masters remain unclassified post-load. Side effect: this
  RESOLVES the long-standing idp_extraction_templates config-shape lifecycle-exemption question
  (B2 item retired) and scopes B12 to exactly the 5 operational_workflow masters.
- **Catalog UX (A4 / Rule #20).** PATCHed `domains` row 39, authoring buyer-voice `catalog_tagline` and
  `catalog_description` (workflow + value, no vendor/product names, American English, no em-dash) into
  the two previously-empty fields. Did not touch any module (none exist). Verified no em-dash in the
  written copy.
- **Aliases (B11).** INSERTed 14 generic vendor-neutral `data_object_aliases` rows (`alias_type=synonym`,
  `record_status=new`), across 6 masters: capture_batches (Document Batch / Processing Case / Document
  Queue), extracted_records (Extraction / Processed Document / Analysis Result), extracted_fields
  (Extracted Value / Detected Entity), idp_extraction_models (Document Processor / Custom Extraction
  Model), idp_validation_results (Validation Case / Review Item), document_classification_results
  (Classification Result / Document Classification). No vendor names used (Rule #18).

All writes at `record_status='new'` (Rule #1 honored; nothing stamped approved).

### Surfaced (user decisions + destructive, not executed)

- **b2 (user decisions):** B2-IDP-MODULE-SPLIT (the build gate; 2 / 3 / 1 modules, audit recommends 3),
  B2-IDP-INTRA-VERBS (7 intra-domain edge verbs for B1B-S8), B2-IDP-PATTERN-FLAGS (has_personal_content
  / has_submit_lock / has_single_approver on the workflow masters), B2-IDP-MLOPS-BOUNDARY (informational),
  B2-IDP-HIPAA-FERPA (regulation scope), B2-IDP-CROSS-DOMAIN-VERBS (rows 585/586 verb rewrite).
  B2-IDP-CATALOG-UX-TEXT is RETIRED (executed under the new Rule #20 EXECUTE policy).
- **Destructive (recommended fix only, not applied):** B1B-S14 cross-domain verb rewrite on existing
  non-empty rows 585 (`is_stored_as` -> `derives_from`) and 586 (`dispositions` -> `applies`); any
  DELETE of legacy skill 69 (which now actually matches the required single domain-grain shape, so
  retirement is reframed, not actioned).
- **Personas / RACI (Phase P):** DEFERRED, not authored. Candidate personas carried forward in
  B1B-S13: IDP-VALIDATOR (HITL queue worker), IDP-MODEL-OWNER (data scientist / ML engineer),
  IDP-PROCESS-OWNER (business owner). They only apply once modules land.

### Left (untouched)

- **Unbuilt-cascade b1b (blocked on the build):** B1B-S1-MODULES (M1), B1B-S3-CAPABILITIES (A2),
  B1B-S4-DMDO (B1), B1B-S6-HANDOFF-MODULE-FKS (B10b, also blocked on ECM + AP-AUTO modules),
  B1B-S12-LIFECYCLE-STATES (B12, now scoped to 5 workflow masters), B1B-S13-ROLES (E1). Not
  scaffolded per the unbuilt-domain rule.
- **B1B-S10-LEGACY-SKILL-RETIRE:** reframed as a note under the 2026-06-06 per-domain-skill
  supersession (per-module skills RETIRED; skill 69 kept as the single domain-grain skill).
- **b3 backlog (7):** human_review_tasks, idp_extraction_corrections, document_layouts,
  confidence_thresholds, ocr_results, redaction_results, extraction_validation_rules. Phase 0 pending.
- **H1 APQC tags:** already satisfied (handoff_processes 644/645/825/826, all agent_curated + new);
  no work owed.

### UI links (tables written)

- https://tests.semantius.app/domain_map/data_objects
- https://tests.semantius.app/domain_map/domains
- https://tests.semantius.app/domain_map/data_object_aliases

## 2026-06-13 - Audit (state-driven; B9d verify)

### Summary

State-driven Validate pass over the single open agent item B1A-B9D-VERIFY. Ran the committed
B9d resolver in BOTH directions via `bun run scripts/analytics/b9d_resolver.ts IDP --dry-run`
then `--write`. IDP (domain_id=39) remains UNBUILT (0 `domain_modules`, 0 DMDO rows), so the
module-split decision (B2-IDP-MODULE-SPLIT) still gates the whole build cascade.

### B9d result (B1A-B9D-VERIFY resolved)

- Boundary: 4 outbound `handoff_processes` tags (644/645/825/826), all `agent_curated` + `new`:
  732 -> pid 428 (Develop and manage content, IDP->ECM), 733 -> pid 315 (Process accounts
  payable, IDP->AP-AUTO), 734 -> pid 1437 (Research/Resolve payable exceptions, IDP->AP-AUTO),
  735 -> pid 428 (IDP->ECM). Inbound direction is vacuous: IDP has 0 inbound handoffs.
- Verdicts: 3 distinct (process, owner) findings, all **UNOWNED**. Reason: the carried payloads
  `extracted_records` (533) and `document_classification_results` (535) have NO `domain_module_data_objects`
  master row anywhere (the resolver reads the module grain). IDP genuinely masters both, but only at
  the legacy `domain_data_objects` grain (domain_id=39), because IDP is unbuilt and has no modules.
- Resolver wrote ZERO owner-file edits and ZERO catalog writes. The 3 UNOWNED findings are an
  unbuilt-domain artifact, not an agent-resolvable ORPHAN/MIS-TAG/ROLL-UP: there is no neighbor
  domain to route a `q` into (IDP is itself the legacy master of both payloads). They clear
  automatically once B2-IDP-MODULE-SPLIT lands and B1B-S4-DMDO authors the module-grain master
  rows. No `record_status` touched (Rule #1).

B1A-B9D-VERIFY is therefore EXECUTED and removed from `state.yaml`. No agent-executable work
remains; every other open item is `b1b` (blocked on the build cascade / module split) or `b2`
(user decision) or `b3` (Phase-0 ideas).

### State change

- `next_action_by`: agent -> user. The existing `q-IDP.md` (q1-q10) already surfaces every open
  `b2` decision and the `b3` backlog; it is current and unchanged. The headline gate remains
  B2-IDP-MODULE-SPLIT (q1).

### JWT errors

None.
