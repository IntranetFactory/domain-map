---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 27
---

# ECM (Enterprise Content Management) Audit History

## 2026-05-30 — Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 5 master `data_objects` (`content_documents`, `document_versions`, `document_folders`, `document_classifications`, `records_retention_policies`); **0 `domain_modules` rows**; 7 capabilities (`ECM-REPO`, `ECM-RECORDS`, `ECM-WORKFLOW`, `ECM-INFOGOV`, `ECM-CAPTURE`, `ECM-AUDIT`, `ECM-CLASSIFY`); 2 solutions (both Microsoft, both `secondary`); 0 `domain_regulations`; 7 `trigger_events`; 8 outbound + 10 inbound cross-domain handoffs (0 intra-domain handoffs); 0 lifecycle states; 11 `data_object_aliases`; 1 legacy domain-level `system` skill (`ecm-system`, id 54) with 5 platform-covered `query_*` tools.
- **Vendor-surface basis (flagship vendors):** Microsoft SharePoint / Syntex (suite leader), OpenText Documentum + Extended ECM (enterprise leader), Hyland OnBase (vertical-strong enterprise), M-Files (metadata-driven), Box (cloud-native + governance), Laserfiche (mid-market + workflow), IBM FileNet (regulated industries). Compliance specialists: OpenText (US-DoD 5015.2 records mgmt), Hyland (HIPAA / FDA Part 11 verticals).
- **Bucket 1 (in-scope, agent fixable):** 17 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 5 items.
- **Candidates queued to `audits/_missing-domains.md`:** 2 (`EFSS`, `ENTERPRISE-INFO-ARCHIVING`).

> **Headline blocker.** ECM is a pre-modular domain. `/domain_modules?domain_id=eq.91` returns zero rows; legacy `domain_data_objects` rows carry the 5 masters but no `domain_module_data_objects` junction exists. This trips the M1 structural gate, which per the audit recipe blocks every downstream M / B / E / F band that derives from modules. Most Bucket 1 items below are downstream consequences (M2, M4, M5, M6, F2, F3, B10b, B9b, E1) that resolve once a module set is chosen and loaded. The fix path: author the ECM module set (4 candidate split below) first, then re-run the per-module bands.

### Vendor surface basis

Pure-play ECM specialists chosen over the diversified Microsoft suite for surface enumeration: OpenText Documentum + Extended ECM anchors the high-end document repository and records-management leg; Hyland OnBase anchors workflow-heavy regulated verticals (HIPAA, FDA Part 11); M-Files anchors the metadata-driven model; Box anchors cloud-native governance; Laserfiche anchors mid-market document workflow + capture; IBM FileNet anchors government and banking compliance. Microsoft SharePoint and Syntex are the suite alternatives. Across these seven vendors the universal surface is: documents, versions, folders / libraries / spaces, metadata templates / property bags, classifications / sensitivity labels, retention rules / records schedules, legal-holds, permissions / ACLs, audit-trail entries, check-in / check-out locks, OCR / capture jobs, workflow definitions and instances, e-signature requests (often via integration), saved searches, taxonomies / term stores, and renditions (PDF / preview).

### Pass 1 — Structural findings (per-domain completeness checklist)

S1 / S2 / S3 sweep results:

#### S1. Direct FK coverage on `domains` (id 91)

| Table | FK column | ECM rows | Expected non-zero | Status |
| --- | --- | --- | --- | --- |
| `domain_modules` | `domain_id` | 0 | yes | FAIL (M1) |
| `capability_domains` | `domain_id` | 7 | yes | pass |
| `solution_domains` | `domain_id` | 2 | yes | pass (low) |
| `domain_regulations` | `domain_id` | 0 | yes | FAIL (B-band routing) |
| `business_function_domains` | `domain_id` | 2 | yes | pass |
| `domain_data_objects` | `domain_id` | 5 (all `master+required`) | yes | pass at legacy layer |
| `handoffs.source_domain_id` | source | 8 | yes (non-leaf) | pass |
| `handoffs.target_domain_id` | target | 10 | optional | pass |
| `skills` | `domain_id` | 1 (legacy domain-level) | yes | F1 partial; needs module-level skill |
| `domain_module_host_domains` | `domain_id` | 0 | optional | pass |

#### S2. Indirect-table per-module coverage

Not applicable: zero modules exist. Routes to M1.

#### S3. Per-master indirect-table coverage

| data_object | states | events | aliases |
| --- | --- | --- | --- |
| `content_documents` (429) | 0 | 3 (`uploaded`, `checked_out`, `version_published` indirectly) | 3 |
| `document_versions` (430) | 0 | 1 (`version_published`) | 2 |
| `document_folders` (431) | 0 | 1 (`permissions_changed`) | 2 |
| `document_classifications` (432) | 0 | 1 (`classified`) | 2 |
| `records_retention_policies` (433) | 0 | 1 (`retention_expired`) | 2 |

Zero lifecycle states across every master routes to B12. Trigger event `legal_hold.placed` (900) is attributed to `content_documents` although it would more naturally sit with the LSD-owned `legal_holds` (id 635), surfaced as B1-S5 below.

### Bucket 1 — In-scope confirmed gaps

#### STRUCTURAL

| ID | Band | Finding | Fix |
| --- | --- | --- | --- |
| B1-S1 | M1 | ECM has 0 `domain_modules` rows. Per Rule #14 every domain must have >=1 module; per Rule #14 a 7-capability domain must have >=2 full modules. The 5 masters sit at the legacy `domain_data_objects` layer only. | Author a 4-module split: `ECM-REPO` (masters `content_documents`, `document_versions`, `document_folders`), `ECM-RECORDS` (masters `records_retention_policies`), `ECM-CLASSIFY` (masters `document_classifications`), `ECM-WORKFLOW` (no master; consumes masters from `ECM-REPO`, hosts workflow + approval-chain entities once Bucket 3 lands). Realize the 7 capabilities across them. Module codes are proposals (see Bucket 2 #2 for alternate splits). |
| B1-S2 | M4 | Every capability is realized in zero modules (because zero modules exist). Once the split lands, link `ECM-REPO` to `ECM-REPO` capability + `ECM-CAPTURE`; `ECM-RECORDS` to `ECM-RECORDS` + `ECM-INFOGOV`; `ECM-CLASSIFY` to `ECM-CLASSIFY`; `ECM-WORKFLOW` to `ECM-WORKFLOW`; `ECM-AUDIT` to whichever module hosts the audit-trail entity (likely `ECM-RECORDS`, see Bucket 3). | Load `domain_module_capabilities` rows after B1-S1 lands. |
| B1-S3 | M6 | Every module realizes zero capabilities (trivial consequence of M1). | Resolves automatically when B1-S2 fix lands. |
| B1-S4 | A3 / solution_domains | Only 2 solutions linked, both Microsoft, both `coverage_level=secondary`. Per A3 the minimum is >=3 solutions and >=1 `primary`. Flagship ECM vendors (OpenText Documentum, Hyland OnBase, M-Files, Box, Laserfiche, IBM FileNet, Microsoft SharePoint) are not modeled as `solutions` rows or not linked to ECM. | Add `solutions` rows + `solution_domains` links: OpenText Documentum (`primary`), Hyland OnBase (`primary`), M-Files (`primary`), Box Content Cloud (`primary`), Laserfiche (`secondary`), IBM FileNet (`secondary`), Microsoft SharePoint Online (`primary` — separate from Syntex). Add Microsoft SharePoint Online as `primary` (Syntex stays `secondary` since it is the AI add-on). Apply Rule #18 in solution descriptions. |
| B1-S5 | A2 / domain_regulations | 0 `domain_regulations` rows. ECM is the regulated-records substrate for SOX, GDPR, HIPAA, GLBA, FDA 21 CFR Part 11, eIDAS. None are linked. | Insert `domain_regulations` rows: SOX (`mandatory`, US-listed financial-controls retention), GDPR (`mandatory`, EU personal-data retention + erasure), HIPAA (`industry`, US healthcare), GLBA (`industry`, US financial), FDA 21 CFR Part 11 (`industry`, FDA-regulated life sciences), eIDAS (`industry`, EU electronic-signature interop). 6 rows. |
| B1-S6 | A1 / catalog UX | `catalog_tagline` and `catalog_description` are empty per Rule #20's A4. | Draft per Rule #20 voice rule (buyer voice: workflow + value, not analyst voice); surface to user BEFORE write. Sample tagline draft: "Store, classify, and retain every document with built-in workflow and compliance audit trails." Sample description: 2-3 paragraphs covering capture, repository + versioning, classification + retention policy, workflow + approvals, eDiscovery + legal-hold posture. User approves wording before any write. |
| B1-S7 | B1 / data_objects naming | `content_documents` (id 429) is the only non-bare master in the set; the four other masters (`document_versions`, `document_folders`, `document_classifications`, `records_retention_policies`) follow the prefixed pattern (`document_*`, `records_*`). `content_documents` mixes two prefixes. Consistency option: rename to `ecm_documents` to share the `ecm_*` prefix once that becomes the canonical authority claim, OR claim canonical bare-word for `documents` if ECM owns the catalog-wide noun. | Decision belongs in Bucket 2 (rename has cross-domain blast radius: 27 `data_object_relationships` rows + 5 handoffs reference id 429). Surface, do not patch. (Moves to Bucket 2 #3.) |
| B1-S8 | trigger_events attribution | Trigger event `legal_hold.placed` (id 900) has `data_object_id=429` (`content_documents`) but the event clearly belongs to LSD-mastered `legal_holds` (id 635). This is a duplicate of LSD's `legal_hold.issued` (id 1042) seen from ECM's side. Mis-attribution at source per B10b's "trigger-event data quality" diagnostic. | Decide: either DELETE event 900 + retarget handoff 824 to use LSD's event 1042, OR rename event 900 to `content_document.legal_hold_applied` to keep ECM ownership of the state transition on `content_documents`. Recommend the rename (ECM's `content_documents` does transition into a legal-hold state). Surface as a single PATCH. |

#### BOUNDARY (per Rule #15 NULL FK on handoffs is a B10b / B9b finding, not a notes job)

| ID | Finding | Fix |
| --- | --- | --- |
| B1-B1 | B10b: 8/8 outbound handoffs have `source_domain_module_id=NULL`. Resolves once B1-S1 (module split) lands and the source module is the one that masters the trigger event's `data_object_id`. | After module split: PATCH the 8 outbound rows per the master-resolution rule. Backfill script pattern from `scripts/loaders/backfill_ats_handoff_modules_2026_05_23.ts`. |
| B1-B2 | B10b: 6/8 outbound handoffs have `target_domain_module_id=NULL`. Two are already populated (823 -> IGA-ENTITLEMENT-CATALOG; 839 -> IGA-ACCESS-REQUEST). The 6 NULLs are owed by the target domain's B10b (DLP x2, LSD x1, AUDIT x1, KMS x1, GRC x1). | REPORT-ONLY: route to each target domain's audit. Do NOT patch from ECM's side. |
| B1-B3 | B10b: 10/10 inbound handoffs have `target_domain_module_id=NULL`. Resolves once B1-S1 lands and the target module is the one that holds the payload data_object. | After module split: PATCH the 10 inbound rows. |
| B1-B4 | B10b: 8/10 inbound handoffs have `source_domain_module_id=NULL`. Two are populated (919 -> LEGAL-PRACT-MGMT module 136; 828/829 -> WSC module 115). The 8 NULLs are owed by the source domain's B10b (IDP x2, LSD x6). | REPORT-ONLY: route to each source domain's audit. |
| B1-B5 | B9b: ECM currently has 0 intra-domain handoffs. After the 4-module split lands, the intra-domain handoff candidates derive from cross-module `data_object_relationships`: `document_classifications classifies content_documents` (CLASSIFY -> REPO), `records_retention_policies retains content_documents` (RECORDS -> REPO), `records_retention_policies retains document_folders` (RECORDS -> REPO), `records_retention_policies applies_to_classification document_classifications` (RECORDS -> CLASSIFY), `document_folders contains content_documents` (intra-REPO, skip). Plus the WORKFLOW module's consumer access to all three masters once it lands. | After B1-S1 lands: draft 4 intra-domain handoff rows with `integration_pattern=lifecycle_progression`, `friction_level=low`. |
| B1-B6 | Stale-or-misclassified `data_object_relationships`: row 300 (`chat_message_attachments captured_in content_documents`, owner_side=target) and row 301 (`chat_channels archives_to content_documents`, owner_side=target) appear to reverse the natural direction (a chat attachment is not "captured in" a document; an attachment IS a document or becomes one). Rows 587 (`content_documents captures chat_message_attachments`, owner_side=target) and 588 (`document_folders archives chat_channels`, owner_side=target) duplicate the same edges with the verbs flipped. | Surface: are 300/301 and 587/588 four separate edges or are 587/588 the corrected mirror that should replace 300/301? Likely the cluster-drafts era authored 300/301 first then re-authored from ECM's side with 587/588. Recommend DELETE 300/301 (keep ECM's source-side rows 587/588). Bucket 2 #4 (calls for owner review). |

#### B12 lifecycle states (zero loaded across all 5 masters)

| ID | Master | Recommended state machine | Rationale |
| --- | --- | --- | --- |
| B1-L1 | `content_documents` (429) | `draft` (initial) -> `in_review` (requires_permission, verb override `review_content_document`) -> `published` (requires_permission, `publish_content_document`) -> `superseded` (terminal, when a new version replaces) -> `under_legal_hold` (override branch, set by event 900). Plus `archived` (terminal). | Universal across all 7 flagship vendors. |
| B1-L2 | `document_versions` (430) | `draft` (initial) -> `published` (terminal). Optional `withdrawn` (terminal). | Simple two-state. |
| B1-L3 | `document_folders` (431) | Likely config-shape: no workflow, only `record_status`. Exemption surfacing required (Rule #12) so a notes entry is NOT auto-added. | Surface exemption to user. |
| B1-L4 | `document_classifications` (432) | Likely config-shape: classification taxonomy entries, no per-row workflow. Exemption surfacing required. | Surface exemption to user. |
| B1-L5 | `records_retention_policies` (433) | `draft` (initial) -> `active` (requires_permission, `activate_retention_policy`) -> `superseded` (terminal) -> `retired` (terminal). Plus `under_review` (optional). | Universal. |

`requires_permission=true` states + `domain_module_id` set per M5 once the module split lands.

#### APQC TAGGING

ECM has 18 cross-domain handoffs (8 outbound + 10 inbound). The 5 existing `handoff_processes` rows all point at PCF process id 339 ("Document trade", external_id 14095, hierarchy_level 3), which is in the supply-chain "Process import/export of cross-border product" cluster. **This is wrong**: the substring matcher matched on "Document" but PCF 339 refers to international trade documents (commercial invoice, certificate of origin), not enterprise content management. APQC has a dedicated content-management cluster under category 8.4 that is the correct home for ECM workflows.

Proposed `agent_curated` tags (replacement set, all `record_status='new'`):

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
| --- | --- | --- | --- | --- | --- | --- |
| 821 | ECM -> DLP | `content_document.uploaded` | `content_documents` | Manage Content (L2) | 83 | confident L2 (no clean L3) |
| 822 | ECM -> DLP | `document.classified` | `document_classifications` | Develop and manage content (L3) | 428 | confident L3 |
| 823 | ECM -> IGA | `document_folder.permissions_changed` | `document_folders` | Control delivered content (L3) | 430 | confident L3 |
| 839 | ECM -> IGA | `document.classified` | `content_documents` | Develop and manage content (L3) | 428 | confident L3 |
| 824 | ECM -> LSD | `legal_hold.placed` | `content_documents` | Control delivered content (L3) | 430 | confident L3 |
| 825 | ECM -> AUDIT | `document.retention_expired` | `records_retention_policies` | Retain records (L4) | 1440 | confident L4 (L3 parent `Manage content` 83 is the clustering fallback) |
| 826 | ECM -> KMS | `document.version_published` | `document_versions` | Deliver approved content (L3) | 429 | confident L3 |
| 827 | ECM -> GRC | `document.classified` | `document_classifications` | Control delivered content (L3) | 430 | confident L3 |
| 732 | IDP -> ECM | `extracted_record.completed` | `extracted_records` | Develop and manage content (L3) | 428 | confident L3 |
| 735 | IDP -> ECM | `document_classification_result.uncertain` | `document_classification_results` | Develop and manage content (L3) | 428 | confident L3 |
| 911 | LSD -> ECM | `legal_hold.issued` | `legal_holds` | Control delivered content (L3) | 430 | confident L3 |
| 912 | LSD -> ECM | `ediscovery_request.created` | `ediscovery_requests` | Control delivered content (L3) | 430 | confident L3 |
| 915 | LSD -> ECM | `legal_matter.opened` | `in_house_legal_matters` | Control delivered content (L3) | 430 | confident L3 |
| 919 | LEGAL-PRACT-MGMT -> ECM | `court_filing.submitted` | `external_court_filings` | Deliver approved content (L3) | 429 | confident L3 |
| 828 | WSC -> ECM | `chat_attachment.shared` | `chat_message_attachments` | Develop and manage content (L3) | 428 | confident L3 |
| 829 | WSC -> ECM | `chat_channel.archived` | `chat_channels` | Retain records (L4) | 1440 | confident L4 |
| 1028 | LSD -> ECM | `in_house_legal_matter.opened` | `in_house_legal_matters` | Control delivered content (L3) | 430 | confident L3 |
| 1031 | LSD -> ECM | `legal_advice_record.issued` | `legal_advice_records` | Deliver approved content (L3) | 429 | confident L3 |

Total proposed: 18 `agent_curated` rows. 0 deferred (every handoff has a clean PCF L2/L3 home in category 8.4 or category 11 "Retain records"). Cleanup: the 5 existing `discovery_substring -> Document trade` rows (handoffs 822, 825, 826, 827, 839) need to be either DELETEd (recommended) or marked `record_status=rejected` before the new tags land, so the composed key `(handoff_id, process_id)` does not collide. Recommend DELETE since they are demonstrably wrong attributions, not "approved" rows.

H-band measures:
- **Catalog quality (headline):** 0/18 cross-domain handoffs carry an `approved` tag. Existing 5 substring tags are all wrong and unapproved.
- **Process health (side-bar):** 0/18 `agent_curated` rows pre-audit. This audit proposes 18.

### Bucket 2 - Surface-for-user (judgment calls)

1. **`catalog_tagline` and `catalog_description` wording.** A4 / B1-S6. Drafts above are a starting point; user approves the exact wording before write per Rule #20. Independent of Bucket 3.

2. **Module split shape.** B1-S1 proposes a 4-module split (`ECM-REPO`, `ECM-RECORDS`, `ECM-CLASSIFY`, `ECM-WORKFLOW`). Alternates:
   - **3-module split**: collapse `ECM-CLASSIFY` into `ECM-REPO` since `document_classifications` is metadata on `content_documents` rather than a workflow-bearing master; keep RECORDS and WORKFLOW separate.
   - **5-module split**: add `ECM-CAPTURE` (OCR + ingest, mostly consumes IDP outputs) and `ECM-AUDIT` (audit-trail entity, embedded_master from AUDIT). Recommended when Bucket 3 capture entities land.
   - **2-module split**: only `ECM-REPO` + `ECM-RECORDS`; everything else folds into REPO. Borderline against M2 since the domain has 7 capabilities.
   Pick one before B1-S2 / B1-S3 fixes can apply.

3. **`content_documents` rename.** B1-S7. Bare canonical `documents` is owned by no other domain (no naming collision found). Options: (a) keep `content_documents` as-is, (b) rename to `documents` and claim `is_canonical_bare_word=true` with rationale ("ECM is the canonical owner of internal-document mastery; other domains [DXP, KMS, LSD] consume documents from ECM"), (c) rename to `ecm_documents` for prefix consistency. Cross-domain blast radius: 27 `data_object_relationships` + 5 handoffs reference id 429, all surgically PATCHable (FK is id, not name). Independent of Bucket 3.

4. **Duplicate WSC `data_object_relationships`.** B1-B6. Rows 300/301 (`chat_message_attachments captured_in content_documents` + `chat_channels archives_to content_documents`) and rows 587/588 (`content_documents captures chat_message_attachments` + `document_folders archives chat_channels`) describe the same two edges. Recommend DELETE 300/301 (keep ECM's source-side authoring 587/588 — the source side carries the canonical verb per the B6/B8 ownership rule).

5. **Pairwise reconciliation scope.** Only one neighbor is weight >=3: LSD (5 inbound + 1 outbound = 6 total). Run inline below as Pass 4 (deep dive). Lighter neighbors get one-line summaries. Decide whether to also kick off pairwise on DLP (2 outbound) and IGA (2 outbound) since both have NULL `source_domain_module_id` on every row owed to ECM.

### Bucket 3 - Phase 0 pending (speculative)

Universal-or-near-universal vendor entities surfaced by the market enumeration but not formally vetted via Phase 0:

| Candidate entity | Proposed module | Vendor evidence |
| --- | --- | --- |
| `document_workflow_definitions` + `document_workflow_instances` | ECM-WORKFLOW | Universal (OpenText, Hyland, M-Files, Laserfiche, Box, FileNet). Required for ECM-WORKFLOW capability to have a real master. |
| `document_approvals` | ECM-WORKFLOW | Universal; 5/7 vendors model approvals as a distinct entity. |
| `document_audit_trail_entries` | ECM-RECORDS (or ECM-AUDIT) | Universal compliance-driven entity; needed for B1-S5's regulatory load. Currently AUDIT-mastered or could be embedded_master here. |
| `metadata_property_definitions` | ECM-REPO (or new ECM-CLASSIFY) | M-Files-anchored (metadata-driven model), but universal at OpenText / Hyland / SharePoint. |
| `document_renditions` | ECM-REPO | Universal (PDF, preview, thumbnail rendering). Vendor-shape varies. |

### Cross-bucket dependencies

- **Bucket 2 #2 (module split) gates every Bucket 1 M / B / E / F fix.** Decide the split shape before any structural fix loads. Bucket 1 STRUCTURAL items B1-S1 / S2 / S3 and BOUNDARY items B1-B1 / B3 / B5 cannot be loaded until the user approves a module set.
- **Bucket 3 is independent of Buckets 1 and 2** for the existing 5-master shape; once vetted, new entities land in modules from the chosen split shape. Bucket 3 candidates `document_workflow_*` would land in ECM-WORKFLOW (giving it a real master), which is a strong argument for keeping ECM-WORKFLOW as a distinct module in Bucket 2 #2.
- **Bucket 2 #3 (`content_documents` rename) is independent** of Bucket 1 and Bucket 2 #2 — the rename is a name change on id 429, FK references survive.
- **B1-S8 (trigger_event 900 attribution)** is independent.

### Per-bucket prompts

- **Bucket 1:** "Approve all 17 fixes? Reply 'all', 'just S1, S5, AP' (etc.), or 'skip'. Note: STRUCTURAL B1-S1 / S2 / S3 are blocked behind Bucket 2 #2's module-split decision; if you approve them, also pick a split shape in Bucket 2 #2."
- **Bucket 2:** "Five judgment calls. (1) Catalog UX wording: please supply exact tagline + description text or approve my drafts. (2) Module split: which shape (3 / 4 / 5)? (3) `content_documents` rename: keep / rename to bare `documents` with canonical claim / rename to `ecm_documents`? (4) DELETE rows 300/301 in favor of 587/588 — confirm? (5) Pairwise: just LSD, or also DLP and IGA?"
- **Bucket 3:** "Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates ring true. Note: `document_workflow_*` and `document_approvals` are strong recommendations for the ECM-WORKFLOW module to have a real master rather than being workflow-only."

### Pass 3 — Neighbor discovery

Cross-domain edges discovered from `handoffs` (source = ECM or target = ECM):

| Neighbor | Outbound rows | Inbound rows | DMDO cross-refs | Edge weight | Tier |
| --- | --- | --- | --- | --- | --- |
| LSD | 1 (id 824) | 5 (ids 911, 912, 915, 1028, 1031) | implicit via 4 LSD-mastered `data_object_relationships` rows | 6 | heavy (deep dive) |
| IGA | 2 (ids 823, 839) | 0 | 2 IGA modules consume ECM's `document_folders` (id 431) + `content_documents` (id 429) — note IGA already has populated `target_domain_module_id` on the 2 outbound rows | 4 | medium |
| DLP | 2 (ids 821, 822) | 0 | implicit (DLP scans content) | 2 | light |
| WSC | 0 | 2 (ids 828, 829) | 4 `data_object_relationships` rows | 2 | light |
| IDP | 0 | 2 (ids 732, 735) | 2 `data_object_relationships` rows | 2 | light |
| AUDIT | 1 (id 825) | 0 | 1 relationship row | 1 | light |
| KMS | 1 (id 826) | 0 | 1 relationship row | 1 | light |
| GRC | 1 (id 827) | 0 | 1 relationship row | 1 | light |
| LEGAL-PRACT-MGMT | 0 | 1 (id 919) | 1 relationship row | 1 | light |

Only LSD crosses the edge-weight 3 threshold for the deep-dive pass. IGA is borderline at weight 4 but its 2 outbound rows already have populated target module FKs (the only ECM-related neighbor in that shape), so the diff section would mostly be empty. Surface the heavy LSD diff inline; lighter neighbors get one-line summaries.

### Pass 4 — Pairwise reconciliation per neighbor

#### ECM <-> LSD (edge weight 6)

**Direction 1: ECM -> LSD (1 row).**

Existing handoff:

| handoff_id | trigger_event | payload | source_module | target_module | Verdict |
| --- | --- | --- | --- | --- | --- |
| 824 | `legal_hold.placed` (event 900, attributed to `content_documents`) | `content_documents` | NULL (M1) | NULL | Section 2: NULL FK both sides; resolvable once ECM modularizes + LSD's legal-hold module owns hold-placement event. Also B1-S8: event 900 attribution is suspect (LSD masters `legal_holds` and publishes its own `legal_hold.issued` event 1042 / `legal_hold.placed` should arguably be LSD-published, not ECM-published). |

Section 3 (missing handoffs): trigger event 899 `document.retention_expired` currently fires only to AUDIT (handoff 825), but LSD's `legal_holds` workflow needs to be a subscriber (a legal hold suspends retention disposition; the LSD-side master must be notified when retention would otherwise dispose a held document). MISSING outbound handoff candidate: `ECM -> LSD on document.retention_expired payload=content_documents`. Surface as B1-S9 if the user agrees.

Section 5 (cross-domain relationships): row 591 (`content_documents triggers legal_holds`, owner_side=source) exists. Row 381 (`legal_holds freezes content_documents`, owner_side=source) exists from LSD's side. The pair is structurally complete for the legal-hold leg. No MISSING-RELATIONSHIP findings.

**Direction 2: LSD -> ECM (5 rows).**

| handoff_id | trigger_event | payload | source_module | target_module | Verdict |
| --- | --- | --- | --- | --- | --- |
| 911 | `legal_hold.issued` | `legal_holds` | NULL | NULL | Section 2: source_module NULL is LSD's B10b; target_module NULL is ECM's B10b (M1). |
| 912 | `ediscovery_request.created` | `ediscovery_requests` | NULL | NULL | Same. |
| 915 | `legal_matter.opened` (event 324 — note: this is the canonical `legal_matter.opened` shared by LSD; payload differs from event's data_object) | `in_house_legal_matters` (633) | NULL | NULL | Section 2 + diagnostic: trigger_event.data_object_id (391) does not match handoff.data_object_id (633). This is the B10b "trigger-event data quality" diagnostic; LSD has both `legal_matters` (391) and `in_house_legal_matters` (633) and the handoff is ambiguous about which one the event publishes from. |
| 1028 | `in_house_legal_matter.opened` (event 1175) | `in_house_legal_matters` (633) | NULL | NULL | Section 2 (resolves on both sides). |
| 1031 | `legal_advice_record.issued` (event 1178) | `legal_advice_records` (638) | NULL | NULL | Section 2 (resolves on both sides). |

Sections 3-4 (missing handoffs / boundary integrity):
- LSD masters `legal_matters` (391), `in_house_legal_matters` (633), `legal_holds` (635), `ediscovery_requests` (636), `legal_advice_records` (638), `external_court_filings` (738). ECM consumes all six as referenced via `data_object_relationships`. ECM has no formal DMDO `consumer` rows because of M1; once modularized, the WORKFLOW or REPO module should declare `consumer + optional` on each LSD master (or `embedded_master` for entities that ECM needs to render in its UI). 
- Boundary integrity gap: handoffs 911, 912, 915, 1028, 1031 carry payloads that ECM has zero `domain_data_objects` rows for. Routes to B5 (ECM's pass) once modularized.

Section 5 (cross-domain relationships): rows 381 (`legal_holds freezes content_documents`), 382 (`ediscovery_requests collects_from content_documents`), 383 (`in_house_legal_matters provisions document_folders`), 384 (`legal_advice_records files_to content_documents`), 584 (`legal_advice_records is_filed_in content_documents`), 597 (`content_documents archives external_court_filings`) all exist. No MISSING-RELATIONSHIP findings.

**LSD pairwise verdict.** 6 rows, 12 NULL module FKs total — all resolve once both sides finish M1 modularization and run B10b. One MISSING outbound candidate (`document.retention_expired -> LSD`). No relationship gaps. The pair is structurally clean; the work is mechanical backfill on each side.

#### Lighter neighbors (one-line summaries)

- **ECM <-> IGA (weight 4):** 2 outbound rows fully wired on target side. ECM's source module is NULL pending M1. No MISSING-RELATIONSHIP findings (rows 593, 594 exist). Clean.
- **ECM <-> DLP (weight 2):** 2 outbound rows; both target module FKs NULL (owed by DLP's B10b). DLP has 2 `data_object_relationships` on ECM masters (595, 596). Clean once DLP modularizes.
- **ECM <-> WSC (weight 2):** 2 inbound rows; both source modules populated (WSC module 115). Target module NULL pending M1. 4 relationship rows (300, 301, 587, 588 — see B1-B6 dedupe finding).
- **ECM <-> IDP (weight 2):** 2 inbound rows; both source module FKs NULL (owed by IDP's B10b). 2 relationship rows (585, 586). Clean once IDP modularizes.
- **ECM <-> AUDIT (weight 1):** 1 outbound row; target module NULL (AUDIT's B10b). 1 relationship row (590). Clean.
- **ECM <-> KMS (weight 1):** 1 outbound row; target module NULL (KMS's B10b). 1 relationship row (592). Clean.
- **ECM <-> GRC (weight 1):** 1 outbound row; target module NULL (GRC's B10b). 1 relationship row (589). Clean.
- **ECM <-> LEGAL-PRACT-MGMT (weight 1):** 1 inbound row; source module populated (136). 1 relationship row (597). Clean.

### Report-only follow-ups (owed by other domains)

Per Rule #11: these route to other domains' audits. ECM does not author fixes for them; the orchestrator can choose to schedule audits on the named domains.

- **DLP B10b** owes `target_domain_module_id` on handoffs 821, 822 (ECM -> DLP).
- **LSD B10b** owes `target_domain_module_id` on handoff 824 (ECM -> LSD), and owes `source_domain_module_id` on handoffs 911, 912, 915, 1028, 1031 (LSD -> ECM).
- **AUDIT B10b** owes `target_domain_module_id` on handoff 825 (ECM -> AUDIT).
- **KMS B10b** owes `target_domain_module_id` on handoff 826 (ECM -> KMS).
- **GRC B10b** owes `target_domain_module_id` on handoff 827 (ECM -> GRC).
- **IDP B10b** owes `source_domain_module_id` on handoffs 732, 735 (IDP -> ECM).
- **LEGAL-PRACT-MGMT B10b** owes `target_domain_module_id` on handoff 919 (already populated source side from LSD module 136 reference is via LEGAL-PRACT-MGMT module 136; verify the target NULL is owed by ECM or by LEGAL-PRACT-MGMT's outbound-target convention).
- **LSD B9 candidate:** consider adding outbound handoff `legal_matter.opened -> ECM` to formalize the matter-to-folder provisioning leg (currently handoff 915 attributes the event differently from its trigger_event.data_object_id; LSD's audit could either fix event 324's attribution or split the event into matter-specific variants).
- **WSC B10b** owes the duplicate-edge cleanup (rows 300, 301) on its side, although the actual DELETE belongs in whichever side authored the row first; that history is not visible here.

### Decisions

_pending user review per Bucket 1 / Bucket 2 / Bucket 3 prompts above_

### Fixes applied

_none — Validate b1 is read-only_

### Candidates queued

- `EFSS` (Enterprise File Sync and Share) — queued via `append_missing_domain.ts`. Vendor evidence: Box, Dropbox Business, Citrix ShareFile, Egnyte, Microsoft OneDrive for Business. Adjacent to ECM, WSC, DXP, DLP.
- `ENTERPRISE-INFO-ARCHIVING` (Enterprise Information Archiving) — queued via `append_missing_domain.ts`. Vendor evidence: Smarsh, Proofpoint Archive, Mimecast Archive, Global Relay, Veritas Enterprise Vault, Iron Mountain InSight. Adjacent to ECM, DLP, LSD, AUDIT, GRC.

### `domains.notes` pointer (if updated)

_not yet written; requires user-approved wording per Rule #15_
