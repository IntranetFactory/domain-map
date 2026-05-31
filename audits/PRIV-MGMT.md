---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 21
---

# PRIV-MGMT - Audit History

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- **Current footprint:** **0 modules** (M1 hard fail, blocks everything downstream); **0 masters** mastered by PRIV-MGMT (B1 hard fail; the canonical privacy data_objects exist but are mastered in the wrong domains, see Bucket 2); **0 capabilities** linked (A2 hard fail); **4 solutions** (3 primary: OneTrust Privacy, TrustArc, Securiti Data Command Center; 1 secondary: ServiceNow Integrated Risk Management); **0 capability_domains**, **0 domain_module_capabilities**, **0 domain_module_data_objects**, **0 trigger_events** keyed against any PRIV-MGMT master, **0 outbound handoffs**, **2 inbound handoffs** (both with NULL target_domain_module_id, blocked on M1); **1 regulation** linked (GDPR only; CPRA exists in the catalog but is unlinked); **3 business_function_domains** rows (Privacy Office owner; Legal, Security contributors); **0 lifecycle states** on anything keyed to this domain; **0 data_object_aliases** keyed to PRIV-MGMT; **0 domain_aliases**; **0 catalog_tagline / catalog_description** (A4 hard fail per Rule #20); **0 roles**; **0 role_modules**; **0 role_permissions**; **0 skills** keyed against PRIV-MGMT; **0 APQC tags** on either inbound handoff (H1 hard fail).
- **Vendor-surface basis (Pass 2 inline):** OneTrust Privacy (flagship; PIA/DPIA, DSR portal, consent, data inventory), TrustArc (consent + assessments + transfer-impact), Securiti Data Command Center (data-inventory automation + DSR + consent + breach), DataGrail (DSR automation + data inventory), Transcend (DSR + consent + data inventory), Wirewheel / Osano (mid-market consent + DSR). Compliance specialists: OneTrust (GDPR + CCPA/CPRA + LGPD + PIPL), TrustArc (GDPR + CCPA + APEC CBPR), Securiti (LGPD + PIPL). All five touch the same union surface: a master data inventory of personal-data processing, a DSR/DSAR pipeline with operator handoffs, a consent ledger keyed to data-subject identifiers, a PIA/DPIA assessment workflow, a vendor / processor inventory keyed to DPAs, a breach-notification record. PRIV-MGMT currently masters none of these.
- **Bucket 1 (in-scope, agent fixable):** 13 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 3 items.
- **Candidates queued (missing-domains):** 1 (CMP, Consent Management Platform).
- **Status set:** `feedback_needed`.

### Pass 3 - Neighbor discovery (auto-derived from handoffs + DMDO + relationships; ranked by edge weight)

| Neighbor | Out | In | DMDO cross | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| DLP | 0 | 1 | 0 | 0 | 1 | Lightweight |
| DSPM | 0 | 1 | 0 | 0 | 1 | Lightweight |
| ATS (parks `data_subject_requests` master in ATS-CANDIDATE-CRM) | 0 | 0 | 0 | 1 (`candidates submits_via data_subject_requests`) | 1 | Lightweight (also a wrong-ownership target, see Bucket 2) |
| LMS (parks `gdpr_consent_records` + `subject_access_requests` + `data_deletion_requests` masters in LMS-CT-GDPR) | 0 | 0 | 0 | 3 (`users grants_consent_in gdpr_consent_records`, `subject_access_requests discloses gdpr_consent_records`, `data_deletion_requests voids gdpr_consent_records`) | 3 | Lightweight (wrong-ownership cluster, see Bucket 2) |
| GRC (parent domain) | 0 | 0 | 0 | 0 | 0 | None (parent only) |
| DCG | 0 | 0 | 0 | 0 | 0 | None (implicit consumer, no rows yet) |

**Pass 4 - Pairwise reconciliation (weight >= 3).** Only LMS clears the >=3 threshold and the finding is unanimously wrong-ownership rather than handoff drift: every cross-domain relationship into the LMS-CT-GDPR master cluster mirrors a row that should sit in a PRIV-MGMT module once M1 is cured. The pairwise diff against LMS therefore collapses to the Bucket 2 re-homing decision below (B2-1). No section 3 / section 4 / section 5 surface findings beyond that re-homing decision.

The dominant structural observation across every neighbor pass is that **PRIV-MGMT has no modules and no masters of its own**; pairwise diffing reduces to the same single root cause until M1 is resolved.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures (M / A / B / C / F / H)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 (hard fail) - BLOCKING** | `domain_modules?domain_id=eq.20` returns zero rows; the `domain_module_host_domains` query is also empty. PRIV-MGMT has no deployable unit. Every downstream concern (DMDO attribution, lifecycle-state realization, workflow-gate permissions, system-skill scope, role bundles, handoff source/target_domain_module_id, intra-domain handoffs, APQC tagging) is gated on the M-band. Once Bucket 2 resolves which masters re-home to PRIV-MGMT (see B2-1), proposed module split: (a) `PRIV-DATA-INVENTORY` masters the data-inventory + processing-record + processor-register surface (`processing_activities`, `personal_data_assets`, `processor_agreements`, `data_transfers`); (b) `PRIV-DSR-MGMT` masters the data-subject-request pipeline (`data_subject_requests`, plus the existing `subject_access_requests` and `data_deletion_requests` re-homed from LMS-CT-GDPR); (c) `PRIV-CONSENT` masters the consent ledger (`gdpr_consent_records` re-homed, plus `consent_purposes`); (d) `PRIV-ASSESSMENTS` masters PIA/DPIA workflows (`privacy_impact_assessments`, `data_breach_records`). Modularization quantity depends on whether Bucket 2 re-homing lands; the four-module shape assumes B2-1 is approved. | Phase A load: create modules per the split (after Bucket 2 decisions); for each module load `domain_module_capabilities` for the capabilities surfaced via Phase B + the Phase 0 Bucket 3 candidates. Lifecycle states, workflow-gate permissions, and system-skill split (Rule #17: one system skill per module) follow in the same load. |
| B1-S2 | **A2 (hard fail)** | `capability_domains?domain_id=eq.20` returns zero rows. The market has no enumerated capabilities. Vendor practice covers at least: `PRIV-DATA-INVENTORY` (personal-data discovery + processing-activity register), `PRIV-DSR-INTAKE` (request portals + identity verification), `PRIV-DSR-FULFILLMENT` (fan-out to source systems + redaction), `PRIV-CONSENT-LEDGER` (consent capture + purpose binding + withdrawal), `PRIV-CONSENT-PROOF` (audit-grade consent receipts), `PRIV-DPIA-WORKFLOW` (assessment authoring + sign-off), `PRIV-BREACH-NOTIF` (breach-record + regulator notification timing), `PRIV-XBORDER-XFER` (transfer-impact assessments, SCC / IDTA bookkeeping). A typical load is 6 to 9 capabilities. | Author the capability set per Phase A on the same load as B1-S1; link via `capability_domains`. Apply the cross-cutting capability test for `PRIV-CONSENT-LEDGER` and `PRIV-CONSENT-PROOF` (these can plausibly span PRIV-MGMT, CMP, B2C-COMM, EMP-EXP; if vendor evidence supports 3+ domains use the domain-neutral form, otherwise PRIV-prefixed). |
| B1-S3 | **A4 (hard fail per Rule #20)** | `catalog_tagline` and `catalog_description` are both empty strings. The buyer surface has nothing to render in the catalog list card or detail page. | Draft both fields per the Rule #20 voice rule (workflow + value, not market position). Surface to the user for review BEFORE writing per Rule #20's draft / review / write loop; the agent does NOT auto-write either field. Suggested draft for review: tagline along the lines of "Handle data-subject requests, capture consent, and keep your processing inventory audit-ready"; description in 1-3 paragraphs covering DSR pipeline, consent ledger, processing-activity register, and PIA/DPIA workflows. The exact text is for the user to approve. |
| B1-S4 | **A3 (soft fail; threshold met but lopsided)** | 4 solutions linked (3 primary + 1 secondary). Solution row count meets the >=3 floor and the >=1 primary floor. However the surface is missing two named-leader specialists routinely cited by Gartner / Forrester in the privacy management market: DataGrail and Transcend. Adding them would harden the vendor-evidence basis for the modularization split in B1-S1. | Insert two `solutions` rows (DataGrail, Transcend) plus matching `vendors` rows where missing, plus two `solution_domains` rows with `coverage_level='primary'`. Load via the standard solutions extension. |
| B1-S5 | **C1 (passes today, called out for completeness)** | `business_function_domains?domain_id=eq.20` returns 3 rows (owner: Privacy Office; contributors: Legal, Security). The C1 hard floor is satisfied. No fix required; included so the Bucket 1 count and the structural pass coverage are explicit. | No action. |
| B1-S6 | **B-band - regulations (soft fail)** | Only GDPR is linked (`domain_regulations?domain_id=eq.20` returns 1 row). The catalog already contains CPRA (id 3) which is the second universally-cited privacy regulation for this market. HIPAA, LGPD, PIPL, PIPEDA all appear in vendor product docs as in-scope; CPRA is the lowest-friction addition because the row already exists. | Insert `domain_regulations` row for `(domain_id=20, regulation_id=3, applicability='mandatory')` (CPRA). Surface PIPEDA / LGPD / PIPL / HIPAA additions as Bucket 3 (no regulation row exists in the catalog yet for these). |
| B1-S7 | **B10b (this domain's own side, partial pre-cure)** | 2 inbound handoffs (283 from DLP on `dlp_incidents`; 288 from DSPM on `data_assets`) both carry `target_domain_module_id=NULL`. The NULL is gated on B1-S1 (no PRIV-MGMT modules exist to attribute to). Inbound row 288 also has a B9 attribution drift: `handoffs.data_object_id=300 (data_assets)` but `trigger_events.id=273` (`data_classification.sensitivity_elevated`) carries `data_object_id=303 (data_classifications)`. The event publishes a classification change; the payload row points at the data_asset. Either the payload should be 303 to match the event, or a new event keyed against `data_assets` should be authored on the DSPM side. | After B1-S1 lands the PRIV-MGMT modules, run the deterministic B10b backfill for handoffs 283 and 288: `target_domain_module_id` = the module that holds the handoff payload with the strongest role on the receiving side. Likely target on both: `PRIV-DATA-INVENTORY` as a `consumer` of `data_assets` (after the module lands a `consumer` DMDO row). The event-payload mismatch on handoff 288 is reported in the Report-only follow-ups (DSPM's B9 / trigger-event hygiene). |
| B1-S8 | **B7 (hard fail, gated on Bucket 2)** | Once PRIV-MGMT actually masters its expected entities (Bucket 2 B2-1 outcome), every master needs at least one `users`-edge (Rule #10). Expected edges: `data_subject_requests` (submitter, fulfilment_owner, reviewer), `gdpr_consent_records` (subject, data_steward), `privacy_impact_assessments` (author, approver, dpo_signoff), `data_breach_records` (reporter, dpo, regulator_liaison), `processing_activities` (process_owner, data_steward), `processor_agreements` (vendor_owner, legal_reviewer). | Draft `users -> master` rows per the verbs above; load via the standard relationship-loader pattern after Bucket 2 decisions on which masters land. |
| B1-S9 | **B6 (hard fail, gated on Bucket 2)** | Once PRIV-MGMT masters its workflow entities, intra-domain relationships are required between them. Expected: `data_subject_requests references gdpr_consent_records`, `data_subject_requests targets personal_data_assets`, `processing_activities uses personal_data_assets`, `processing_activities references processor_agreements`, `privacy_impact_assessments evaluates processing_activities`, `data_breach_records affects personal_data_assets`. | Draft the edges (verb + inverse_verb + cardinality + necessity + owner_side) and load via the cluster-drafts pattern after Bucket 2 lands. |
| B1-S10 | **B11 (soft fail, gated on Bucket 2)** | Zero `data_object_aliases` rows on any privacy-mastered entity (other than 1 alias on `gdpr_consent_records`). Vendor terminology is fragmented: `data_subject_requests <-> DSAR <-> DSR <-> rights request <-> privacy request`; `processing_activities <-> ROPA <-> record of processing <-> processing register`; `privacy_impact_assessments <-> DPIA <-> PIA <-> privacy assessment`; `gdpr_consent_records <-> consent receipt <-> consent string`; `data_breach_records <-> security incident report <-> notifiable breach`. The IAB TCF, GPP, and W3C-DNT industry terms also belong on consent. | Draft 8 to 15 alias rows total once Bucket 2 lands the masters and Bucket 1 lands the modules. |
| B1-S11 | **B12 (hard fail, gated on Bucket 2)** | Zero `data_object_lifecycle_states` rows for entities PRIV-MGMT would master. Expected machines: `data_subject_requests (received -> identity_verified -> in_progress -> fulfilled / rejected / partially_fulfilled)` with regulatory clocks (typically 30 days for GDPR, 45 days for CCPA), `gdpr_consent_records (granted -> active -> withdrawn / expired)` (states 1 of 3 already exist on data_object 950 in the LMS-CT-GDPR module; they re-home if Bucket 2 lands), `privacy_impact_assessments (draft -> in_review -> approved -> archived)`, `data_breach_records (detected -> assessed -> notifiable -> notified -> closed)` with 72-hour clocks under GDPR Art. 33. `processing_activities` and `personal_data_assets` are config-shaped masters (no workflow; record_status is the only state worth tracking, exempt per Rule #12). | Draft state machines per the workflow-bearing master list once Bucket 2 decisions land and B1-S1 creates the modules (lifecycle states reference `domain_module_id` for permission realization). The config-shape exemption on `processing_activities` and `personal_data_assets` needs surfacing to the user per Rule #15 (do NOT populate `data_objects.notes` automatically). |
| B1-S12 | **F2 / F3 / F4 / F7 (hard fail, gated on B1-S1)** | Zero `skills` rows for PRIV-MGMT, no system skills at any module level (because there are no modules yet). Once 3 to 4 modules exist after B1-S1, each needs exactly one `skill_type='system'` skill with >=1 `skill_tools` row (Rule #17). Phase-S floor per module: at least one `query` per master, at least one `mutate` per workflow-bearing master, at least one `side_effect` for regulatory notifications (DPO email, regulator portal). For PRIV-DSR-MGMT specifically, an `inbound` tool for DSR-portal-webhook is the dominant entry vector. F7: prefer `notify_person` / `notify_team` over channel primitives for generic DPO and data-steward notifications. | Phase-S load alongside the module set per Rule #17. |
| B1-S13 | **H1 (hard fail)** | 2 cross-domain handoffs (both inbound: 283, 288) and zero `handoff_processes` rows. Per the H-band volume expectation 0.5N to 0.8N, the agent_curated target is 1 to 2 rows. Both are tractable from the PRIV-MGMT side of the audit. | Author the proposals in the APQC TAGGING sub-table below; load via `handoff_processes` insert with `proposal_source='agent_curated'`, `record_status='new'`. |

#### APQC TAGGING (B1-S13 sub-table)

The 2 cross-domain handoffs into PRIV-MGMT both express the same upstream-security-event-feeds-privacy-response pattern. Both fit cleanly under the privacy + data-protection PCF L3 entry; surface as agent_curated proposals.

| handoff_id | direction | source -> target | trigger_event | payload | Proposed PCF (name / external_id / level) | confidence |
|---|---|---|---|---|---|---|
| 283 | in | DLP -> PRIV-MGMT | dlp_incident.blocked | dlp_incidents | Develop and manage IT security, privacy, and data protection / 20735 / L3 | confident L3 (the privacy side of the DLP-block event is the publishable-privacy-incident pathway) |
| 288 | in | DSPM -> PRIV-MGMT | data_classification.sensitivity_elevated | data_assets (note B9 drift, see B1-S7) | Develop and manage IT security, privacy, and data protection / 20735 / L3 | confident L3 |

Both tags are proposed at the privacy + data-protection PCF L3 entry rather than at a deeper PCF L4 (which would lean security-incident-response and lose the privacy framing). No deferrals; both classifiable from the structural-pass mental model.

### Bucket 2 - Surface-for-user (judgment calls)

1. **B2-1: Re-home four canonical privacy masters from their current non-privacy homes into a PRIV-MGMT module.** This is the keystone judgment call; B1-S1 (module split) cannot be authored until the user picks a direction here.
   - `data_subject_requests` (id 901) currently mastered in `ATS-CANDIDATE-CRM` (id 1). Rationale at original load was that the ATS module modelled candidate-side privacy requests; the entity name is generic and applies to every data subject.
   - `gdpr_consent_records` (id 950) currently mastered in `LMS-CT-GDPR` (id 180).
   - `subject_access_requests` (id 951) currently mastered in `LMS-CT-GDPR` (id 180).
   - `data_deletion_requests` (id 952) currently mastered in `LMS-CT-GDPR` (id 180).
   - **Options:** (a) re-home all four into the proposed PRIV-MGMT modules (PRIV-DSR-MGMT for 901 / 951 / 952; PRIV-CONSENT for 950); the originating modules add `embedded_master` or `consumer` rows back per Rule #11 so they remain standalone-deployable; (b) keep the current ownership and have PRIV-MGMT consume via cross-domain handoffs only (preserves the current shape but leaves PRIV-MGMT with zero masters and violates B1 unless PRIV-MGMT is treated as a leadership-tier domain, which Gartner / Forrester clearly do not, all five flagship vendors ship these masters); (c) re-home only the LMS triplet and leave ATS-CANDIDATE-CRM's row in place if there is a defensible candidate-specific shape (the agent does not see one but the user might). The decision drives the rest of the audit's fix shape.
   - Dependency: B1-S1, B1-S8, B1-S9, B1-S10, B1-S11, B1-S12 are all gated on this decision.

2. **B2-2: Approve the proposed module-split shape from B1-S1.** Four modules is the maximum useful split per the Phase 0 vendor surface (data-inventory, DSR, consent, assessments). User can collapse to 3 (merge assessments into data-inventory) or 2 (collapse to DSR + everything-else) if the buyer-persona overlap argues for it. Independent of B2-1's direction.

3. **B2-3: Rule #20 buyer-voice draft.** The agent will NOT write `catalog_tagline` or `catalog_description` without explicit per-text approval. A draft tagline + description will be surfaced for the user's review once Bucket 2 lands; user supplies the final wording (or asks the agent to draft and then approves the exact string).

4. **B2-4: Lifecycle-state exemption on `processing_activities` and `personal_data_assets`.** Both are config-shaped masters (no workflow; record_status is the only state). Per Rule #15, the agent CANNOT populate `data_objects.notes` with the config-shape exemption text. User decides: (a) record the exemption outside the catalog (gap report / commit message); (b) approve specific notes wording and let the agent write it (user supplies exact text per Rule #15).

5. **B2-5: APQC tag for inbound handoff 288 once the B9 attribution drift on the DSPM side is fixed.** The current handoff payload (`data_assets`, id 300) does not match the trigger event's `data_object_id` (`data_classifications`, id 303). User decides whether to load the agent_curated PCF 20735 row against the current shape (works in either direction) or wait for DSPM's B9 to fix the upstream payload first.

### Bucket 3 - Phase 0 pending (speculative)

1. **CMP (Consent Management Platform) as a sibling domain.** Vendor evidence: OneTrust Consent (separate SKU from OneTrust Privacy), Cookiebot, TrustArc Cookie Consent Manager, Sourcepoint, Didomi, Usercentrics. CMP vendors compete on web / mobile consent-banner orchestration, IAB TCF / GPP compliance, geo-targeted consent flows, and per-vendor disclosure registries; this is a distinct point-solution market (Rule #2 satisfied with 6+ flagship vendors), not a sub-feature of PRIV-MGMT. CMP would be a sibling under GRC with handoffs from CMP into PRIV-MGMT on `consent.granted` / `consent.withdrawn`. **Action:** queued via `append_missing_domain.ts` (separate from this audit). Re-evaluate during the next Phase-0 vendor research pass.

2. **Additional regulations beyond CPRA.** PIPEDA (Canada), LGPD (Brazil), PIPL (China), POPIA (South Africa), HIPAA (US healthcare; not a privacy framework in the strict GDPR sense but routinely cited in the privacy-management buyer surface). None of these have rows in `regulations` yet; B1-S6 already covers the CPRA addition (catalog row exists). Bucket 3 items here are NEW regulation rows, vendor-research vetting needed to confirm scope. Vendor evidence per row varies (Securiti emphasizes PIPL + LGPD; OneTrust emphasizes the full set; TrustArc emphasizes GDPR + CCPA + APEC CBPR).

3. **Missing entity candidates surfaced from vendor union surface, not yet vetted.** Beyond the Bucket 2 re-homing list, the flagship vendors also ship:
   - `processing_activities` (ROPA / record-of-processing): canonical master in every flagship privacy product; nothing in PRIV-MGMT today.
   - `personal_data_assets` (master of personal-data fields in source systems): OneTrust and Securiti's discovery engine produces this; closely related to (but not the same as) DCG's `data_assets`. Risk of collision; vetting needed.
   - `processor_agreements` (DPA / sub-processor registry): every flagship; nothing in catalog.
   - `data_transfers` (cross-border transfer record, SCC / IDTA): OneTrust + TrustArc + Securiti.
   - `privacy_impact_assessments` (PIA / DPIA): every flagship.
   - `data_breach_records` (breach register with regulatory notification timing): every flagship.
   - `consent_purposes` (consent purpose definitions linked to processing_activities): consent products separate purpose definitions from consent records.
   - These are Bucket 3 because they need a vetted Phase 0 vendor-surface run to confirm the right master / contributor / consumer split and whether any collide with existing catalog data_objects (especially `personal_data_assets` vs. `data_assets`).

### Cross-bucket dependencies

- **B2-1 (re-homing decision) gates almost everything else in Bucket 1.** B1-S1 module split, B1-S8 (B7 user edges), B1-S9 (B6 intra-domain rels), B1-S10 (aliases), B1-S11 (lifecycle), B1-S12 (skills) all wait on which masters PRIV-MGMT actually owns after Bucket 2.
- **Bucket 3 entity candidates and Bucket 2 re-homing are coupled.** The agent's proposed module split in B1-S1 names entity buckets (data-inventory module masters `processing_activities` + `personal_data_assets`; assessments module masters `privacy_impact_assessments` + `data_breach_records`). If the user defers Bucket 3 to a formal Phase 0 vet, the module split should drop the assessments and data-inventory modules and only ship PRIV-DSR-MGMT + PRIV-CONSENT (the modules covered by Bucket 2 re-homed masters); the data-inventory and assessments modules can be added once Phase 0 vets the entity list.
- **B2-2 (module-split shape) collapses into B1-S1 once B2-1 lands.** Independent only in the sense that the user could pre-approve a smaller split before Bucket 2 closes.
- **B1-S6 (CPRA link) is independent.** Can be loaded immediately on user approval; no Bucket 2 dependency.
- **B1-S13 (APQC tags on handoffs 283, 288) is independent of Bucket 2.** The handoffs exist now; the tags can be loaded today. B2-5 only affects whether to wait on the DSPM side fix for handoff 288.

### Per-bucket prompts

**Bucket 1.** Fix these now? Specifically:
- B1-S3 needs the user to draft (or approve a draft of) `catalog_tagline` + `catalog_description` first (Rule #20).
- B1-S6, B1-S13 can be loaded immediately on approval.
- B1-S1, B1-S2, B1-S4, B1-S7, B1-S8 to B1-S12 are all blocked on Bucket 2.
Reply "approve B1-S6, B1-S13", "approve all unblocked", "skip", or per-item.

**Bucket 2.** Your call on each:
- B2-1: which option (a / b / c) for re-homing the four masters?
- B2-2: approve the 4-module split, or collapse to 2 or 3?
- B2-3: shall the agent draft the tagline + description for your review, or do you supply directly?
- B2-4: how do you want to record the config-shape exemption (outside the catalog, or supply exact notes wording per Rule #15)?
- B2-5: load the APQC tag for handoff 288 now against the current shape, or wait on DSPM's B9 attribution fix?

**Bucket 3.** Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates ring true (most likely all of `processing_activities`, `processor_agreements`, `privacy_impact_assessments`, `data_breach_records`; `personal_data_assets` is the only one with a real collision risk against DCG's `data_assets`).

### Report-only follow-ups (owed by other domains)

These items are routed to other domains' audits; not loaded from PRIV-MGMT's pass.

- **ATS-CANDIDATE-CRM B7 / B6 / B11 / B12 owed once `data_subject_requests` re-homes.** If Bucket 2 B2-1 option (a) or (c) lands, ATS's existing master row demotes to `embedded_master` (Rule #11). The lifecycle states, user-edges, and aliases that ATS currently maintains on this master need re-evaluation in ATS's next audit. Routes to ATS.
- **LMS-CT-GDPR B6 / B7 / B11 / B12 owed once the three LMS-mastered privacy entities re-home.** Same shape, three masters: `gdpr_consent_records`, `subject_access_requests`, `data_deletion_requests`. Routes to LMS.
- **DSPM B9 + B10b: trigger_event 273 / handoff 288 payload mismatch.** `trigger_events.data_object_id=303 (data_classifications)` but `handoffs.data_object_id=300 (data_assets)`. The publisher (DSPM) owes the fix: either author a separate trigger event keyed against `data_assets`, or PATCH the handoff's `data_object_id` to 303 and update its semantic-pass downstream. Routes to DSPM.
- **DLP B10b on handoff 283.** The source side's `source_domain_module_id` is also NULL, but that's a DLP-side B10b finding (DLP also has zero modules, per DLP's audit). Routes to DLP.
- **CPRA / additional privacy regulations are catalog-wide, not PRIV-MGMT-specific.** The CPRA row exists; the unlinked-to-PRIV-MGMT case is fixable here (B1-S6). PIPEDA / LGPD / PIPL / HIPAA require new `regulations` rows; routes to a catalog-wide regulation-load conversation.
- **CMP (Consent Management Platform) candidate.** Queued via `append_missing_domain.ts`; routes to the missing-domain triage queue, not this audit.
