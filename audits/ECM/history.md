# ECM audit history

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

## 2026-05-31, Continuation: B1 technical fixes (residual)

Loader: `c:/dev/domain-map/.tmp_deploy/fix_ecm_b1_technical_2026_05_31.ts`.

Applied only the technical, no-judgment subset of Bucket 1 (audit's "Fixes applied" was empty; all of Bucket 1 was residual). Idempotent loader, re-reads each target before writing.

### Applied

| Item | Type | Outcome |
| --- | --- | --- |
| B1-S5 | INSERT 6 `domain_regulations` | linked ECM (91) to SOX (mandatory), GDPR (mandatory), HIPAA (conditional), GLBA (conditional), FDA 21 CFR Part 11 (id 22, conditional), eIDAS (id 34, conditional). Mapped audit's "industry" applicability to enum `conditional` per Rule #13 (`industry` is not a valid value; the description on `conditional` ("applies under specific circumstances") matches the audit's intent). |
| B1-S8a | PATCH enum backfill | `trigger_events.event_category` on event 900 set from `''` to `state_change`. |
| B1-S8b | PATCH naming rename | `trigger_events.event_name` on event 900 renamed `legal_hold.placed` -> `content_document.legal_hold_applied`. `data_object_id` stays 429 (`content_documents`); handoff 824 keeps its trigger_event_id FK. Disambiguates from LSD-published `legal_hold.issued` (event 1042). |
| B1-APQC DELETE | DELETE 5 stale rows | `handoff_processes` ids 161, 162, 163, 164, 165 deleted (all `discovery_substring` -> PCF 339 `Document trade`, which the audit identified as wrong attributions to international-trade documents rather than ECM content). |
| B1-APQC INSERT | INSERT 13 `handoff_processes` (`agent_curated`) | handoffs 821 (->PCF 83), 822 (->428), 823 (->430), 824 (->430), 825 (->1440), 826 (->429), 827 (->430), 839 (->428), 732 (->428), 735 (->428), 919 (->429), 828 (->428), 829 (->1440). All process_ids verified live in APQC PCF cross-industry (8.4 content cluster + L4 retain-records 1440). |

### Skipped (within Bucket 1, deliberately)

- **handoff_processes for handoffs 911, 912, 915, 1028, 1031.** Audit pre-specifies process_id 430/430/430/430/429 for these LSD->ECM rows; live state already carries `agent_curated` rows from the LSD loader pointing at different PCFs (373, 396, 373, 373, 397). Per Rule #1 prior agent-curated decisions are not silently overwritten; left intact pending user reconciliation.

### Deferred (out of scope for this pass, count 13)

Each entry is gated on user judgment, a separate audit pass, or rules excluded by the residual-fix scope:

1. **B1-S1** module split (4 candidate ECM modules) — gated on Bucket 2 #2 "user picks shape" (new entities, new modules).
2. **B1-S2** `domain_module_capabilities` links — gated on B1-S1.
3. **B1-S3** trivial consequence of M1 — gated on B1-S1.
4. **B1-S4** add 5+ solutions (OpenText, Hyland, M-Files, Box, Laserfiche, FileNet, SharePoint Online) — new entities, deferred.
5. **B1-S6** `catalog_tagline` + `catalog_description` — Rule #20 forbids without per-row user approval of exact wording.
6. **B1-S7** `content_documents` rename — Bucket 2 #3 "user picks" (3 options surfaced).
7. **B1-B1** PATCH `source_domain_module_id` on 8 outbound handoffs — gated on B1-S1 (no ECM modules to FK to).
8. **B1-B2** REPORT-ONLY (target-side PATCHes owed by DLP/LSD/AUDIT/KMS/GRC audits) — not ECM's pass.
9. **B1-B3** PATCH `target_domain_module_id` on 10 inbound handoffs — gated on B1-S1.
10. **B1-B4** REPORT-ONLY (source-side PATCHes owed by IDP/LSD audits) — not ECM's pass.
11. **B1-B5** 4 intra-domain handoff INSERTs — gated on B1-S1.
12. **B1-B6** DELETE `data_object_relationships` 300/301 — Bucket 2 #4 owner review.
13. **B1-L1..L5** lifecycle states for 5 masters — need `domain_module_id` per M5, gated on B1-S1.

### JWT errors

None encountered during this pass.

### `domains.notes` pointer

Not written (Rule #15 unchanged; the audit already says "requires user-approved wording").


### Candidates queued

- `EFSS` (Enterprise File Sync and Share) — queued via `append_missing_domain.ts`. Vendor evidence: Box, Dropbox Business, Citrix ShareFile, Egnyte, Microsoft OneDrive for Business. Adjacent to ECM, WSC, DXP, DLP.
- `ENTERPRISE-INFO-ARCHIVING` (Enterprise Information Archiving) — queued via `append_missing_domain.ts`. Vendor evidence: Smarsh, Proofpoint Archive, Mimecast Archive, Global Relay, Veritas Enterprise Vault, Iron Mountain InSight. Adjacent to ECM, DLP, LSD, AUDIT, GRC.

### `domains.notes` pointer (if updated)

_not yet written; requires user-approved wording per Rule #15_

## 2026-05-31, Audit

### Summary

- Structural Validate b1 pass. ECM remains pre-modular: `domain_modules?domain_id=eq.91` returns zero rows, which still trips M1 / M2 and cascades into M4 / M5 / M6 / M7 / M8 / B9b / B10b / E1-E5 / F2-F5. Most STRUCTURAL findings repeat from 2026-05-30; deltas this pass are A4 (catalog UX surfaces are still empty), F1 (legacy domain-level system skill still in place), B12 (lifecycle states still at zero), event_category enum drift on six trigger_events, and an H1 reclassification (5 LSD->ECM handoffs are tagged to legal-investigation PCFs that belong in content cluster 8.4).
- Current footprint (re-verified live): 1 `domains` row id 91 with all 7 metadata fields populated (A1 pass); 7 capabilities (A2 pass); 2 solutions both Microsoft both `secondary` (A3 fail); 6 regulations (A2 / S1 pass after 2026-05-31 continuation load); 2 business_function_domains rows (C1 pass: Business Operations owner, IT Operations contributor); 5 master `data_objects` (ids 429, 430, 431, 432, 433); 11 aliases (B11 pass); 7 trigger_events; 8 outbound + 10 inbound cross-domain handoffs (all module-FK NULLs gated on M1); 0 lifecycle states (B12 fail); 0 modules (M1 fail); 1 legacy system skill `ecm-system` id 54 with 5 platform-covered query tools (F1 transitional fail).
- Bucket 1 (in-scope, agent fixable, residual + delta): 5 items.
- Bucket 1 (blocked behind M1 module split): 7 items.
- Bucket 2 (surface-for-user, judgment): 5 items (4 carried forward + 1 H1 reclassification).
- Bucket 3 (Phase 0 pending, speculative): 5 items (all carried forward).

### Vendor surface basis

Carried forward from 2026-05-30 audit. Pure-play ECM specialists: OpenText Documentum + Extended ECM (enterprise leader, US-DoD 5015.2 records mgmt), Hyland OnBase (regulated verticals, HIPAA / FDA Part 11), M-Files (metadata-driven), Box Content Cloud (cloud-native + governance), Laserfiche (mid-market workflow + capture), IBM FileNet (government and banking), plus suite alternatives Microsoft SharePoint Online and Syntex. Compliance specialists: OpenText (DoD 5015.2), Hyland (HIPAA, FDA Part 11).

### Pass 1 - Structural findings (per-domain completeness checklist)

#### S1. Direct FK coverage on `domains` (id 91)

| Table | FK column | ECM rows | Expected non-zero | Status |
| --- | --- | --- | --- | --- |
| `domain_modules` | `domain_id` | 0 | yes | FAIL (M1) |
| `capability_domains` | `domain_id` | 7 | yes | pass |
| `solution_domains` | `domain_id` | 2 | yes | low (A3 fail: <3, no `primary`) |
| `domain_regulations` | `domain_id` | 6 | yes | pass |
| `business_function_domains` | `domain_id` | 2 | yes | pass |
| `domain_data_objects` | `domain_id` | 5 (all `master+required`) | yes | pass at legacy layer |
| `handoffs.source_domain_id` | source | 8 | yes (non-leaf) | pass |
| `handoffs.target_domain_id` | target | 10 | optional | pass |
| `skills` | `domain_id` | 1 (legacy domain-level) | yes | F1 transitional fail; needs module-level skill |
| `domain_module_host_domains` | `domain_id` | 0 | optional | pass |

#### S2. Indirect-table per-module coverage

Not applicable: zero modules. Routes to M1.

#### S3. Per-master indirect-table coverage

| data_object | states | events | aliases |
| --- | --- | --- | --- |
| `content_documents` (429) | 0 | 3 (895, 898, 900) | 3 |
| `document_versions` (430) | 0 | 1 (896) | 2 |
| `document_folders` (431) | 0 | 1 (901) | 2 |
| `document_classifications` (432) | 0 | 1 (897) | 2 |
| `records_retention_policies` (433) | 0 | 1 (899) | 2 |

All five masters at zero lifecycle states routes to B12 (carried forward as B1-L1..L5). Aliases meet B11 floor.

### Pass 2 - Per-band verdicts

| Band | Verdict | Notes |
| --- | --- | --- |
| A1 | pass | `crud_percentage=92`, `business_logic` non-empty, `min_org_size`, `cost_band=$$$`, `certification_required=false`, `usa_market_size_usd_m=8000`, `market_size_source_year=2025`. |
| A2 | pass | 7 capabilities. |
| A3 | FAIL | 2 solutions, both Microsoft, both `secondary`; need >=3 solutions and >=1 `primary`. Carried as B1-S4. |
| A4 | FAIL | `catalog_tagline=''`, `catalog_description=''`. Carried as B1-S6 (Rule #20: surface drafts only). |
| A5 | skip | Opt-in only. |
| M1 | FAIL | 0 `domain_modules`. Headline blocker, gates M2 / M4 / M5 / M6 / M7 / M8 / B9b / B10b / E1-E5 / F2-F5. |
| M2 | FAIL (consequential) | 7 capabilities require >=2 full modules. |
| M4 | FAIL (consequential) | Every capability realised in zero modules. |
| M5 | n/a | No lifecycle states exist. |
| M6 | FAIL (consequential) | No modules realise any capability. |
| M7 | n/a | No `domain_module_data_objects` rows to evaluate single-master integrity. Domain-level `domain_data_objects` shows each of the 5 masters present exactly once with `role='master'`. |
| M8 | n/a | No modules. |
| B1 | pass | 5 master rows. |
| B2 | pass | All 5 masters carry `singular_label` and `plural_label`. |
| B3 | pass | All 5 masters are prefixed names. Naming arbitration not required. |
| B4 | needs positive re-evaluation | All three pattern flags default `false` on every master. Per Rule #12 + B4 review, surface to user whether any are true (e.g. `content_documents.has_personal_content` likely true for HR-stored content). New Bucket 2 candidate: see #6. |
| B5 | pass | Zero `embedded_master` rows. |
| B6 | pass with carry-forward | Intra-domain edges 572-577 cover folder/version/classification/retention relationships. Duplicate rows 300/301 vs 587/588 still pending DELETE owner review (Bucket 2 #4). |
| B7 | pass | Users edges loaded: rows 578-583 (`users authored content_documents`, `owns`, `revised`, `stewards`, `maintains`). |
| B8 | pass | Outbound cross-domain relationships cover DLP, IGA, AUDIT, KMS, GRC, LSD, LEGAL-PRACT-MGMT, IDP, WSC payloads on this side. |
| B9 | pass | 7 events cover the master state-transitions ECM publishes; each event has >=1 handoff. |
| B9b | n/a | Skipped: <2 modules. Re-evaluate after M1 fix. |
| B10b | FAIL (consequential) | 8/8 outbound NULL `source_domain_module_id`; 6/8 outbound NULL `target_domain_module_id`; 10/10 inbound NULL `target_domain_module_id`; 8/10 inbound NULL `source_domain_module_id`. Carried forward as B1-B1 through B1-B4; cured after M1. |
| B11 | pass | 11 aliases across 5 masters. |
| B12 | FAIL | Zero `data_object_lifecycle_states` on all 5 masters. Carried as B1-L1..L5; cured after M1 sets `domain_module_id`. |
| C1 | pass | Business Operations owner, IT Operations contributor. |
| C2 | n/a | No capability-level divergence enumerated. |
| D1 | pass | UI spot-check: regulations and trigger_events updated by 2026-05-31 continuation render correctly at `record_status='new'`. |
| E1-E5 | vacuous | Pre-module domain; role authoring blocked behind the 2-module floor. Resolves after M1. |
| F1 | FAIL (transitional) | Legacy domain-level `ecm-system` skill (id 54, `domain_module_id=null`) remains. Acceptable transitional state until module-level skills exist; converts after M1. |
| F2-F5 | n/a | No `domain_modules` rows; module-level system skills not yet authorable. |
| F7 | n/a | No skill_tools link channel primitives. |
| H1 | partial | Coverage: 18/18 cross-domain handoffs carry an `agent_curated` row (full coverage achieved by 2026-05-31 continuation). Quality headline: 0/18 `record_status='approved'`. Reclassification finding (new this audit): handoffs 911, 912, 915, 1028, 1031 (LSD -> ECM) carry PCF ids 373, 396, 373, 373, 397 (legal-investigation cluster) which describe LSD-side activity, not ECM's receive-side content control. The proper PCF for receive-side content workflows is in 8.4 (`Control delivered content` 430, `Develop and manage content` 428, `Retain records` 1440). Bucket 2 #5. |

#### New B-band data quality finding

`trigger_events.event_category` is empty string on 6 of 7 ECM-attributed events (895, 896, 897, 898, 899, 901). Per Rule #13, the only allowed values are `lifecycle`, `state_change`, `threshold`, `signal`. Event 900 carries `state_change` from the prior continuation. Recommended assignment: all six belong to `state_change` (each models a master row transitioning state). Surface as B1-S9.

### Bucket 1 - In-scope confirmed gaps

#### Residual + delta items the agent can apply now

| ID | Band | Finding | Fix |
| --- | --- | --- | --- |
| B1-S5 (regulations) | A2 / domain_regulations | Already cured (6 rows loaded 2026-05-31). No action. |
| B1-S9 | trigger_events data quality | 6 trigger_events (895, 896, 897, 898, 899, 901) have `event_category=''`; enum requires one of `lifecycle`, `state_change`, `threshold`, `signal`. | PATCH each to `state_change` (each event models a master transitioning state on `content_documents` / `document_versions` / `document_folders` / `document_classifications` / `records_retention_policies`). |
| B1-H1a | H1 retag | 5 inbound LSD->ECM handoffs (911, 912, 915, 1028, 1031) carry PCFs in the legal-investigation cluster (373 / 396 / 373 / 373 / 397). From ECM's receive-side these should land in content cluster 8.4. | DELETE the 5 existing `agent_curated` rows and INSERT replacements: 911 -> 430 (Control delivered content), 912 -> 430, 915 -> 430, 1028 -> 430, 1031 -> 429 (Deliver approved content). Bucket 2 #5 gates whether to overwrite prior agent_curated rows. |
| B1-B6 | data_object_relationships dedupe | Rows 300 (`chat_message_attachments captured_in content_documents`, owner_side=target) and 301 (`chat_channels archives_to content_documents`, owner_side=target) duplicate rows 587 / 588 from ECM's source-side authoring. | DELETE 300, 301 (keep 587, 588 as the source-side canonical rows). Bucket 2 #4 owner review still pending. |
| B1-F1 | F1 legacy system skill | `ecm-system` id 54 has `domain_module_id=null`. Transitional state until module-level skills exist (cured by M1 + F2). No surgical PATCH; resolves when B1-S1 lands. | Defer. |

#### Items blocked behind B1-S1 (module split)

| ID | Band | Blocked until | Notes |
| --- | --- | --- | --- |
| B1-S1 | M1 / M2 / M4 / M6 / M7 / M8 | Bucket 2 #2 (module split shape) | Author 3 / 4 / 5 modules per user's pick. |
| B1-S2 | M4 | B1-S1 | Link 7 capabilities to module(s). |
| B1-S3 | M6 | B1-S1 | Reverse-orphan cure. |
| B1-B1 | B10b outbound source | B1-S1 | PATCH 8 outbound `source_domain_module_id` to the master-resolution result. |
| B1-B3 | B10b inbound target | B1-S1 | PATCH 10 inbound `target_domain_module_id` to the consumer-DMDO result. |
| B1-B5 | B9b intra-domain | B1-S1 | Draft 4 intra-domain handoffs (`document_classifications classifies content_documents`, `records_retention_policies retains content_documents`, `records_retention_policies retains document_folders`, `records_retention_policies applies_to_classification document_classifications`). |
| B1-L1..L5 | B12 + M5 | B1-S1 | 5 lifecycle state machines with `requires_permission` plus `domain_module_id` per realising module. |

#### APQC TAGGING delta

The H-band's coverage measure is at 18/18 after the 2026-05-31 continuation. The quality headline remains 0 because every row sits at `record_status='new'`. The only catalog change recommended now is B1-H1a (5 LSD->ECM retags); the rest of the substrate is in the right home.

### Bucket 2 - Surface-for-user (judgment calls)

1. **`catalog_tagline` and `catalog_description` wording (carried).** A4 / B1-S6. Per Rule #20 the agent does not write either field without user-approved exact text. Independent of every other bucket item.
2. **Module split shape (carried).** B1-S1 still proposes 4 modules (`ECM-REPO`, `ECM-RECORDS`, `ECM-CLASSIFY`, `ECM-WORKFLOW`). Alternates 3-module (collapse CLASSIFY into REPO) and 5-module (add `ECM-CAPTURE` + `ECM-AUDIT`) remain on the table; 5-module is preferred if Bucket 3's `document_workflow_*` lands. Pick a shape before any STRUCTURAL fix.
3. **`content_documents` rename (carried).** B1-S7. Bare `documents` is uncontested catalog-wide. Options unchanged: (a) keep, (b) rename to `documents` with canonical claim, (c) rename to `ecm_documents` for prefix consistency.
4. **DELETE `data_object_relationships` 300/301 (carried).** B1-B6. Confirm intent to keep rows 587/588 as canonical source-side authoring.
5. **LSD->ECM H1 retag (new this audit).** Handoffs 911 / 912 / 915 / 1028 / 1031 currently point at LSD-side legal-investigation PCFs (373 / 396 / 373 / 373 / 397). The agent recommends replacement rows in content cluster 8.4 (430 / 430 / 430 / 430 / 429). Per Rule #1 prior `agent_curated` rows are not silently overwritten. Decide: (a) DELETE + replace with content-cluster PCFs, (b) keep LSD-side classification (treat them as the workflow's authoritative implementing process for the inbound), (c) record both via separate (handoff_id, process_id) rows (the composed key permits it).
6. **Pattern flag re-evaluation (new this audit).** B4. All three pattern flags default `false` on every master. Likely candidates: `content_documents.has_personal_content=true` (HR / health / contract content), `records_retention_policies.has_single_approver=true` (typical records officer sign-off), `document_classifications.has_submit_lock=true` (label assignment locks the row from arbitrary edits). Confirm or decline each.

### Bucket 3 - Phase 0 pending (speculative, carried forward)

| Candidate | Proposed module | Vendor evidence |
| --- | --- | --- |
| `document_workflow_definitions` + `document_workflow_instances` | ECM-WORKFLOW | Universal (OpenText, Hyland, M-Files, Laserfiche, Box, FileNet). Anchors ECM-WORKFLOW as a real master-holding module. |
| `document_approvals` | ECM-WORKFLOW | Universal; 5 of 7 vendors model approvals as a distinct entity. |
| `document_audit_trail_entries` | ECM-RECORDS or ECM-AUDIT | Universal compliance entity; supports the regulatory load already linked. |
| `metadata_property_definitions` | ECM-REPO or ECM-CLASSIFY | M-Files-anchored, universal at OpenText / Hyland / SharePoint. |
| `document_renditions` | ECM-REPO | Universal (PDF / preview / thumbnail). |

### Cross-bucket dependencies

- **Bucket 2 #2 (module split) gates Bucket 1 STRUCTURAL items B1-S1 / S2 / S3, B1-B1 / B3 / B5, B1-L1..L5, and B1-F1.** Decide module shape first.
- **Bucket 2 #5 (LSD retag) gates B1-H1a.** Without a user decision, the agent does not overwrite prior agent_curated rows.
- **Bucket 2 #6 (pattern flag review) is independent.** Each `true` answer is a single PATCH.
- **Bucket 3 entities, if vetted, all land in ECM-WORKFLOW / ECM-RECORDS / ECM-REPO once the module split lands.** They strengthen the 5-module split (`document_workflow_*` gives WORKFLOW a real master; `document_audit_trail_entries` gives AUDIT a real master).
- **B1-S9 (event_category enum backfill), B1-H1a (subject to #5), and B1-B6 (subject to #4) are independent** of Bucket 2 #2.

### Per-bucket prompts

- **Bucket 1:** "Approve B1-S9 and B1-B6 now? Reply 'all', 'just S9', 'just B6', or 'skip'. B1-H1a waits on Bucket 2 #5; remaining B1 items wait on Bucket 2 #2."
- **Bucket 2:** "Six judgment calls. (1) Catalog UX wording: supply exact tagline + description text or approve a fresh draft. (2) Module split: which shape (3 / 4 / 5)? (3) `content_documents` rename: keep / rename to bare `documents` / rename to `ecm_documents`? (4) DELETE rows 300 / 301 in favor of 587 / 588? (5) LSD->ECM H1 retag: replace / keep / record both? (6) Pattern flags: which masters get `has_personal_content`, `has_submit_lock`, `has_single_approver` flipped to true?"
- **Bucket 3:** "Vet via Phase 0 research or eyeball-mode? If eyeball, name candidates that ring true (`document_workflow_*` and `document_approvals` are strong recommendations to give ECM-WORKFLOW a real master)."

### JWT errors

None encountered during this pass.

### Decisions

_pending user review per Bucket 1 / 2 / 3 prompts above_

### Fixes applied

_none, Validate b1 is read-only_

### `domains.notes` pointer (if updated)

_not yet written; requires user-approved wording per Rule #15_

## 2026-06-02 Audit (modularization)

### Summary

Built the ECM module set, the headline structural blocker (B1B-S1) from the 2026-05-31 pass.
Scope was strictly modules + entity assignment: reuse existing capabilities and data_objects,
create no new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or
relationships. Pre-build live triage confirmed 0 `domain_modules`, 7 `capability_domains` rows
(169-175), 5 master `domain_data_objects` (429-433), and 2 `solution_domains` rows
(Microsoft Syntex, Microsoft Purview Information Protection, both secondary).

The prior pass surfaced a 3 / 4 / 5 split question (B2-MODULE-SPLIT). Under the reuse-only scope
the 4-split and 5-split both collapse, because the WORKFLOW, CAPTURE, and AUDIT capabilities have
no loaded master entity of their own (their candidate masters `document_workflow_*`,
`document_approvals`, `document_audit_trail_entries` are still B3 vendor-research items, not in the
catalog). A module with only those capabilities and no data_object would violate the no-empty-module
rule. The agent therefore selected the structurally valid **3-module** shape and folded CAPTURE and
CLASSIFY into the repository module and AUDIT into the records/governance module.

### Module set authored (3 full modules)

- **ECM-REPOSITORY** (id 242) "Content Repository and Capture" -- caps ECM-REPO (169),
  ECM-CAPTURE (173), ECM-CLASSIFY (175). Masters: `content_documents` (429),
  `document_versions` (430), `document_folders` (431), `document_classifications` (432).
- **ECM-RECORDS-GOV** (id 243) "Records Management and Information Governance" -- caps
  ECM-RECORDS (170), ECM-INFOGOV (172), ECM-AUDIT (174). Master:
  `records_retention_policies` (433). Consumer: `content_documents` (429, required) -- holds and
  disposition act on documents.
- **ECM-WORKFLOW** (id 244) "Document Workflow Automation" -- cap ECM-WORKFLOW (171). No own
  master (workflow master entities are B3-deferred). Consumers: `content_documents` (429, required),
  `document_versions` (430, optional) -- the documents and versions that workflow routes and approves.

### Catalog-wide master pre-check

Ran the mandatory pre-check on all five intended masters (429, 430, 431, 432, 433) BEFORE writing
any `role='master'` row: `/domain_module_data_objects?data_object_id=in.(...)&role=eq.master`
returned zero rows. No foreign module masters any of the five, so every ECM master could be authored
as a true `master` (none demoted to `embedded_master`). The loader also re-runs this guard on every
invocation and aborts if a foreign master ever appears.

### Verification (live, post-load)

- M1: 3 `domain_modules` rows on domain 91 (was 0).
- M4: all 7 capabilities placed (169-175), each in exactly one module.
- M6: every module carries >=1 capability (3 / 3 / 1).
- No empty module: every module carries >=1 data_object (4 / 2 / 2 DMDO rows; 8 total).
- M7 in-domain AND catalog-wide: each of the 5 masters is mastered by exactly one module
  (429/430/431/432 -> ECM-REPOSITORY; 433 -> ECM-RECORDS-GOV).
- R15: `notes` omitted on every DMDO and DMC row. R1: `record_status` omitted on every insert.
  R18: no vendor / product names in any module name or description.

### Decisions

- 3-module shape selected over the prior 4 / 5 candidates, forced by the reuse-only scope plus the
  no-empty-module rule. If the B3 workflow / audit / capture masters are later loaded, ECM-WORKFLOW
  gains a real master and CAPTURE / AUDIT can split out, reopening the 4 / 5 / 6 shape question.
- `content_documents` consumed (not co-mastered) in ECM-RECORDS-GOV and ECM-WORKFLOW: its single
  catalog-wide master stays in ECM-REPOSITORY per M7.

### Fixes applied

- INSERT 3 `domain_modules` (242, 243, 244), 7 `domain_module_capabilities`,
  8 `domain_module_data_objects`. Loader:
  `.tmp_deploy/modularize_ecm_2026-06-02.ts` (idempotent; re-run prints zero inserts).

### Deferred / out of scope (not touched this pass)

- B1B-S1's downstream cascade (lifecycle states L1 / L2 / L5, handoff module-FK backfills
  B1 / B3 / B5, legacy skill retirement F1, the 4 intra-domain handoffs) was NOT executed: those
  create lifecycle / handoff / skill rows, which are outside this modules-only scope. They are now
  unblocked (the `domain_modules` rows they FK against exist) and move to b1a / b1b for the next pass.
- B1B-S4 (6 missing flagship solutions), B2 catalog-UX (A4 / M8) text, the `content_documents`
  rename, pattern-flag review, and the LSD retag remain user / research decisions, unchanged.

### JWT errors

None encountered during this pass.

## 2026-06-06 - b1a execution

Executed the three agent-solvable b1a items from `state.yaml` against the live `domain_map`
module (domain 91, ECM). Loader: `.tmp_deploy/ecm_b1a_2026_06_06.ts` (idempotent; re-run prints
zero new writes). All inserts omit `record_status` (DB default `new`); no `notes` column written
on any row; no em-dashes; American English.

### B1A-S9 - trigger_events.event_category backfill (DONE)

PATCHed 6 `trigger_events` rows from `event_category=""` to `"state_change"`. Prior value on all
6 was the empty string `""` (reversible). Event 900 was already `state_change` from a prior pass
and was not touched.

| id | event_name | prior event_category | new event_category |
| --- | --- | --- | --- |
| 895 | content_document.uploaded | "" | state_change |
| 896 | document.version_published | "" | state_change |
| 897 | document.classified | "" | state_change |
| 898 | content_document.checked_out | "" | state_change |
| 899 | document.retention_expired | "" | state_change |
| 901 | document_folder.permissions_changed | "" | state_change |

Verification: `/trigger_events?id=in.(895,896,897,898,899,901)&event_category=neq.state_change`
returns 0 rows.

### B1A-F2-SYSTEM-SKILLS - Phase S system skills + tools + skill_tools (DONE)

Authored one `skill_type='system'` skill per ECM module (Rule #17), each with `domain_id=91` and
`domain_module_id` set, plus the supporting mutate tools and skill_tools. No prior values (all
inserts; nothing PATCHed/DELETEd).

INSERTED `tools` (7 new, `operation_kind='mutate'`, `coverage_tier='platform'`, dedup by
`tool_name`; no collision found pre-insert):

| tool id | tool_name | data_object_id |
| --- | --- | --- |
| 1788 | update_content_document | 429 |
| 1789 | classify_content_document | 432 |
| 1790 | publish_document_version | 430 |
| 1791 | update_records_retention_policy | 433 |
| 1792 | dispose_content_document | 429 |
| 1793 | route_content_document | 429 |
| 1794 | approve_content_document | 429 |

INSERTED `skills` (3 new system skills):

| skill id | skill_name | domain_module_id | masters / consumes |
| --- | --- | --- | --- |
| 389 | ecm_repository_agent | 242 ECM-REPOSITORY | masters 429,430,431,432 |
| 390 | ecm_records_gov_agent | 243 ECM-RECORDS-GOV | masters 433; consumes 429 |
| 391 | ecm_workflow_agent | 244 ECM-WORKFLOW | consumes 429 (req), 430 (opt) |

INSERTED `skill_tools` (16 new rows; reused the 5 existing platform query tools 436-440 and the
existing `notify_person` abstraction tool 913 rather than minting duplicates):

- ecm_repository_agent (389): query_documents (req), query_document_versions (req),
  query_document_folders (req), query_document_classifications (req), update_content_document (req),
  classify_content_document (req), publish_document_version (req). [7 tools]
- ecm_records_gov_agent (390): query_records_retention_policies (req), query_documents (req),
  update_records_retention_policy (req), dispose_content_document (req). [4 tools]
- ecm_workflow_agent (391): query_documents (req), query_document_versions (opt),
  route_content_document (req), approve_content_document (req), notify_person (req). [5 tools]

Channel-vs-capability: ECM-WORKFLOW links the `notify_person` abstraction (channel rule default),
not a channel primitive. F4 invariant (operation_kind <-> data_object_id) verified clean across all
16 linked tools (0 violations). Each module skill clears the F3 >=3-required floor with >=1 query
and >=1 mutate.

Legacy skill `ecm-system` (id 54) was left in place (its retirement is B1B-F1, blocked behind this
item and now unblocked for a future pass; not in this b1a scope).

### B1A-M8-MODULE-UX - module catalog UX backfill (DONE)

PATCHed `catalog_tagline` + `catalog_description` on the 3 modules per revised Rule #20. Empty-guard
applied per field: all 6 fields were empty (`""`) before the write, so all 6 were written; no
non-empty value was overwritten. Buyer-voice (workflow + value), no vendor/product names, no
em-dashes. Prior value on every field: `""` (reversible). The rows' `record_status` carries the
review signal; the drafts are NOT parked here.

- 242 ECM-REPOSITORY tagline: "Capture every document, find it instantly, and keep one trusted
  version under control."
- 243 ECM-RECORDS-GOV tagline: "Keep what you must, dispose of what you can, and prove it whenever
  you are asked."
- 244 ECM-WORKFLOW tagline: "Route documents to the right people and capture every approval on the
  record."

(Full `catalog_description` text lives on the live rows; see
`/domain_modules?id=in.(242,243,244)`.)

Note: the domain-level catalog UX (A4 / B2-CATALOG-UX) remains a user decision and is NOT covered
by this b1a item; only the 3 modules were in M8 scope.

### Skipped / not executed

- No b1a item was skipped or blocked. All three resolved fully.
- b1b and b2 items remain untouched (out of scope for this pass).

### JWT errors (b1a pass)

None encountered during this pass.

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
